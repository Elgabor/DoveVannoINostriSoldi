import { discoverLatestStatePaymentDataset, type BdapDataset } from "@/lib/bdap-payments";

const BDAP_BASE = "https://bdap-opendata.rgs.mef.gov.it";
const BDAP_ACTION = `${BDAP_BASE}/SpodCkanApi/api/3/action`;
const BDAP_DUMP = `${BDAP_BASE}/SpodCkanApi/api/3/datastore/dump`;
const REVALIDATE_SECONDS = 6 * 60 * 60;
const USER_AGENT =
  "TrasparenzaItalia/0.4 (+https://github.com/metaforismo/trasparenzaitalia)";

const MONTH_NAMES = [
  "GENNAIO",
  "FEBBRAIO",
  "MARZO",
  "APRILE",
  "MAGGIO",
  "GIUGNO",
  "LUGLIO",
  "AGOSTO",
  "SETTEMBRE",
  "OTTOBRE",
  "NOVEMBRE",
  "DICEMBRE",
] as const;

type PackageSearchResponse = {
  success?: boolean;
  result?: {
    results?: Array<{
      id?: unknown;
      name?: unknown;
      title?: unknown;
      notes?: unknown;
      metadata_modified?: unknown;
    }>;
  };
};

export type StateSpendingHistoryPoint = {
  year: number;
  month: number;
  monthName: string;
  label: string;
  cumulativePaid: number;
  monthlyPaid: number;
  source: {
    productCode: string;
    packageId: string;
    csvUrl: string;
    metadataModified: string | null;
  };
};

export type StateSpendingHistory = {
  year: number;
  latestMonth: number;
  latestMonthName: string;
  points: StateSpendingHistoryPoint[];
  observedAt: string;
  methodology: {
    cumulative: true;
    monthlyDerivation: "difference-between-consecutive-cumulative-snapshots";
    officialSemanticsUrl: string;
  };
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function missionProductCode(month: number): string {
  return `PBS_SPE_M${String(month).padStart(2, "0")}_MISS_001`;
}

function parseTitlePeriod(title: string): { year: number; month: number } | null {
  const match = title.match(/\b(20\d{2})\/(0[1-9]|1[0-2])\b/);
  if (!match) return null;
  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
  };
}

async function findMissionDataset(year: number, month: number): Promise<BdapDataset> {
  const code = missionProductCode(month);
  const url = `${BDAP_ACTION}/package_search?${new URLSearchParams({ q: code, rows: "50" }).toString()}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`OpenBDAP package_search storico HTTP ${response.status}`);
  }

  const payload = (await response.json()) as PackageSearchResponse;
  if (!payload.success || !Array.isArray(payload.result?.results)) {
    throw new Error("Risposta package_search storico OpenBDAP non valida");
  }

  for (const pkg of payload.result.results) {
    const packageId = text(pkg.id);
    const name = text(pkg.name);
    const title = text(pkg.title);
    const notes = text(pkg.notes);
    if (!packageId || !isUuid(packageId) || !name || !title || !notes?.includes(`[${code}]`)) continue;

    const period = parseTitlePeriod(title);
    if (!period || period.year !== year || period.month !== month) continue;

    return {
      dimension: "mission",
      productCode: code,
      packageId,
      name,
      title,
      notes,
      referenceYear: year,
      referenceMonth: month,
      metadataModified: text(pkg.metadata_modified),
      csvUrl: `${BDAP_DUMP}/${packageId}.csv`,
      apiUrl: `${BDAP_ACTION}/package_show?id=${encodeURIComponent(packageId)}`,
    };
  }

  throw new Error(`Dataset Missione ${year}/${String(month).padStart(2, "0")} non trovato`);
}

function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer).replace(/^\uFEFF/, "");
  }
}

function parseSemicolonCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ";") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n") {
      row.push(field.trim().replace(/\r$/, ""));
      field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim().replace(/\r$/, ""));
    if (row.some(Boolean)) rows.push(row);
  }

  return rows;
}

function numericValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function totalFromMissionDataset(dataset: BdapDataset): Promise<number> {
  const response = await fetch(dataset.csvUrl, {
    headers: {
      Accept: "text/csv",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`OpenBDAP CSV storico HTTP ${response.status}`);

  const rows = parseSemicolonCsv(decodeCsv(await response.arrayBuffer()));
  const headers = rows[0] ?? [];
  const totalIndex = headers.findIndex((header) => header === "Totale Pagato");
  if (totalIndex < 0) throw new Error("Campo Totale Pagato assente nel CSV storico OpenBDAP");

  return rows
    .slice(1)
    .reduce((total, row) => total + numericValue(row[totalIndex]), 0);
}

export async function getStateSpendingHistory(): Promise<StateSpendingHistory> {
  const latest = await discoverLatestStatePaymentDataset("mission");
  const year = latest.referenceYear;
  const latestMonth = latest.referenceMonth;

  const datasets = await Promise.all(
    Array.from({ length: latestMonth }, async (_, index) => {
      const month = index + 1;
      return month === latestMonth ? latest : findMissionDataset(year, month);
    }),
  );

  const cumulativeTotals = await Promise.all(
    datasets.map((dataset) => totalFromMissionDataset(dataset)),
  );

  const points = datasets.map((dataset, index): StateSpendingHistoryPoint => {
    const cumulativePaid = cumulativeTotals[index] ?? 0;
    const previous = index === 0 ? 0 : cumulativeTotals[index - 1] ?? 0;
    const monthlyPaid = cumulativePaid - previous;
    const monthName = MONTH_NAMES[dataset.referenceMonth - 1] ?? `MESE ${dataset.referenceMonth}`;

    return {
      year,
      month: dataset.referenceMonth,
      monthName,
      label: monthName.slice(0, 3),
      cumulativePaid,
      monthlyPaid,
      source: {
        productCode: dataset.productCode,
        packageId: dataset.packageId,
        csvUrl: dataset.csvUrl,
        metadataModified: dataset.metadataModified,
      },
    };
  });

  return {
    year,
    latestMonth,
    latestMonthName: MONTH_NAMES[latestMonth - 1] ?? `MESE ${latestMonth}`,
    points,
    observedAt: new Date().toISOString(),
    methodology: {
      cumulative: true,
      monthlyDerivation: "difference-between-consecutive-cumulative-snapshots",
      officialSemanticsUrl: "https://openbdap.rgs.mef.gov.it/it/News/Index/638",
    },
  };
}
