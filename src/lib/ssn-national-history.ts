import { parseDelimitedRecords, decodePublicDataText, type DelimitedRecord } from "@/lib/data/delimited";
import { fetchOfficialSource } from "@/lib/data/source-fetch";
import { SSN_CCE_METRICS, type SsnCceMetricId, type SsnCceValues } from "@/lib/data/ssn-cce-contract";

const BDAP_BASE = "https://bdap-opendata.rgs.mef.gov.it";
const BDAP_ACTION = `${BDAP_BASE}/SpodCkanApi/api/3/action`;
const BDAP_DUMP = `${BDAP_BASE}/SpodCkanApi/api/3/datastore/dump`;
const PACKAGE_TITLE_QUERY = "Modello di rilevazione del Conto Economico degli enti del SSN a livello Nazionale";
const PACKAGE_NAME_PATTERN = /^spd_ssn_cce_naz_voccn_01_(\d{4})$/;

/**
 * Official voice code for each already-defined SSN_CCE metric, reused as-is from the
 * single-year snapshot (src/lib/data/ssn-cce-contract.ts) so this trend cannot drift
 * from the meaning already documented and shown on /spese/sanita.
 */
const METRIC_CODE: Readonly<Record<SsnCceMetricId, string>> = {
  productionCosts: "BZ9999",
  personnelCost: "BA2080",
  healthcareWorkServices: "BA1350",
  nonHealthcareWorkServices: "BA1750",
  purchasedServices: "BA0390",
};

/**
 * Calendar years verified live (package_search against OpenBDAP RGS, 23/08/2026) to have
 * a national-level consuntivo release with a stable schema: same 5 voice codes, same
 * descriptions, on 2012, 2018 and 2024. Extending this range requires re-verifying that a
 * new year's package exists and still uses the same voice codes before trusting it here.
 */
export const SSN_NATIONAL_HISTORY_YEARS = Object.freeze(
  Array.from({ length: 2024 - 2012 + 1 }, (_, index) => 2012 + index),
);

type PackageSearchResult = {
  id: string;
  name: string;
};

type PackageSearchResponse = {
  success: boolean;
  result?: { results: PackageSearchResult[] };
};

/**
 * Discovers each year's package id and builds its CSV dump URL ourselves from the known
 * BDAP_DUMP pattern, instead of trusting a resource's declared `url`/`mimetype`: some
 * packages in this catalog list a resource with format "CSV" whose mimetype is actually
 * "application/pdf" (seen on the 2018 release), so the resource list itself isn't a safe
 * source of truth for which file is really the CSV.
 */
async function discoverNationalCsvUrlByYear(signal?: AbortSignal): Promise<Map<number, string>> {
  const url = `${BDAP_ACTION}/package_search?${new URLSearchParams({
    q: PACKAGE_TITLE_QUERY,
    rows: "100",
  }).toString()}`;
  const response = await fetchOfficialSource("openbdap", url, {
    kind: "discovery",
    signal,
    headers: { Accept: "application/json" },
    tags: ["dataset:ssn-cce-national-history"],
  });
  if (!response.ok) throw new Error(`OpenBDAP package_search HTTP ${response.status}`);

  const payload = (await response.json()) as PackageSearchResponse;
  if (!payload.success || !Array.isArray(payload.result?.results)) {
    throw new Error("Risposta package_search OpenBDAP non valida");
  }

  const byYear = new Map<number, string>();
  for (const pkg of payload.result.results) {
    const match = PACKAGE_NAME_PATTERN.exec(pkg.name);
    if (!match || !pkg.id) continue;
    const year = Number(match[1]);
    const csvUrl = `${BDAP_DUMP}/${pkg.id}.csv`;
    const existing = byYear.get(year);
    if (existing && existing !== csvUrl) {
      throw new Error(`OpenBDAP pubblica più pacchetti per il Conto Economico SSN nazionale ${year}`);
    }
    byYear.set(year, csvUrl);
  }
  return byYear;
}

/**
 * Parses a euro amount string into integer cents using string/integer arithmetic only
 * (never a float multiply-and-round), matching the exact-cents guarantee the Python ETL
 * enforces for the single-year SSN snapshot (scripts/etl/ssn_cce_snapshot.py) via
 * Decimal(value * 100).to_integral_exact(). Keeping the same unit lets this trend reuse
 * the existing SsnCceValues type and the page's cents-to-euro formatter unmodified.
 */
function amountCents(record: DelimitedRecord): number {
  const raw = record["Importo Totale"]?.trim();
  if (!raw) throw new Error("Importo SSN mancante");
  const match = /^(-?\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) throw new Error(`Importo SSN non numerico o con precisione inattesa: "${raw}"`);
  const [, integerPart, decimalPart = ""] = match;
  const cents = Number(`${integerPart}${decimalPart.padEnd(2, "0")}`);
  if (!Number.isSafeInteger(cents)) throw new Error(`Importo SSN fuori range: "${raw}"`);
  return cents;
}

/**
 * Pure parsing step, kept separate from the network fetch so the duplicate-detection and
 * amount-parsing guardrails are unit-testable with synthetic rows, not only exercised
 * incidentally by however the live 2012-2024 data happens to be shaped today.
 */
export function nationalValuesFromRows(rows: DelimitedRecord[], year: number): SsnCceValues {
  const byCode = new Map<string | undefined, DelimitedRecord>();
  for (const row of rows) {
    const code = row["Codice Voce Contabile"]?.trim();
    if (code && byCode.has(code)) {
      throw new Error(`Voce ${code} duplicata nel Conto Economico SSN nazionale ${year}`);
    }
    byCode.set(code, row);
  }

  const values = {} as SsnCceValues;
  for (const metricId of SSN_CCE_METRICS) {
    const code = METRIC_CODE[metricId];
    const row = byCode.get(code);
    if (!row) throw new Error(`Voce ${code} assente nel Conto Economico SSN nazionale ${year}`);
    values[metricId] = amountCents(row);
  }
  return values;
}

async function fetchNationalYear(
  year: number,
  csvUrl: string,
  signal?: AbortSignal,
): Promise<SsnCceValues> {
  const response = await fetchOfficialSource("openbdap", csvUrl, {
    kind: "data",
    signal,
    headers: { Accept: "text/csv" },
    tags: [`dataset:ssn-cce-national-history`, `year:${year}`],
  });
  if (!response.ok) throw new Error(`OpenBDAP CSV HTTP ${response.status} per l'anno ${year}`);

  const rows = parseDelimitedRecords(decodePublicDataText(await response.arrayBuffer()));
  return nationalValuesFromRows(rows, year);
}

export type SsnNationalHistoryYear = {
  year: number;
  values: SsnCceValues;
};

export type SsnNationalHistory = {
  years: SsnNationalHistoryYear[];
  source: {
    owner: string;
    landingUrl: string;
  };
};

/**
 * National-only SSN Conto Economico trend across SSN_NATIONAL_HISTORY_YEARS, fetched live
 * from OpenBDAP (not a locked snapshot like the single-year entity/regional detail). Reuses
 * the same 5 metrics already shown on /spese/sanita; does not touch that page's regional or
 * per-entity data, which remain limited to 2024.
 */
export async function getSsnNationalHistory(
  options: { signal?: AbortSignal } = {},
): Promise<SsnNationalHistory> {
  const csvUrlByYear = await discoverNationalCsvUrlByYear(options.signal);

  const years: SsnNationalHistoryYear[] = [];
  for (const year of SSN_NATIONAL_HISTORY_YEARS) {
    const csvUrl = csvUrlByYear.get(year);
    if (!csvUrl) throw new Error(`OpenBDAP non pubblica il Conto Economico SSN nazionale per il ${year}`);
    const values = await fetchNationalYear(year, csvUrl, options.signal);
    years.push({ year, values });
  }

  return {
    years,
    source: {
      owner: "Ragioneria Generale dello Stato",
      landingUrl: "https://bdap-opendata.rgs.mef.gov.it",
    },
  };
}
