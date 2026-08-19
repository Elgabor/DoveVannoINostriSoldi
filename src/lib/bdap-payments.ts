const BDAP_BASE = "https://bdap-opendata.rgs.mef.gov.it";
const BDAP_ACTION = `${BDAP_BASE}/SpodCkanApi/api/3/action`;
const BDAP_DUMP = `${BDAP_BASE}/SpodCkanApi/api/3/datastore/dump`;

const USER_AGENT =
  "TrasparenzaItalia/0.3 (+https://github.com/metaforismo/trasparenzaitalia)";

const DISCOVERY_REVALIDATE_SECONDS = 6 * 60 * 60;
const DATA_REVALIDATE_SECONDS = 6 * 60 * 60;

export type StatePaymentDimension = "mission" | "missionAdministration" | "administrationEconomic";

type CkanResource = {
  id?: unknown;
  name?: unknown;
  format?: unknown;
  url?: unknown;
};

type CkanPackage = {
  id?: unknown;
  name?: unknown;
  title?: unknown;
  notes?: unknown;
  metadata_modified?: unknown;
  resources?: unknown;
};

type PackageSearchResponse = {
  success?: boolean;
  result?: {
    count?: number;
    results?: CkanPackage[];
  };
};

export type BdapDataset = {
  dimension: StatePaymentDimension;
  productCode: string;
  packageId: string;
  name: string;
  title: string;
  notes: string | null;
  referenceYear: number;
  referenceMonth: number;
  metadataModified: string | null;
  csvUrl: string;
  apiUrl: string;
};

type PaymentComponents = {
  opErario: number;
  opTesoreria: number;
  opEsterno: number;
  oaTesoreria: number;
  oaSpesaFunzDeleg: number;
  rsfStipendi: number;
  rsfAltro: number;
  noteImputazione: number;
  totalPaid: number;
};

export type StateMissionPayment = PaymentComponents & {
  year: number;
  month: string;
  missionCode: string;
  mission: string;
};

export type StateAdministrationMissionPayment = StateMissionPayment & {
  administrationCode: string;
  administration: string;
};

export type StateAdministrationEconomicPayment = PaymentComponents & {
  year: number;
  month: string;
  administrationCode: string;
  administration: string;
  categoryCode: string;
  category: string;
  economicLevel2Code: string;
  economicLevel2: string;
};

export type SpendingAggregate = {
  code: string | null;
  label: string;
  value: number;
};

export type StateSpendingSnapshot = {
  period: {
    year: number;
    month: number;
    monthName: string;
    label: string;
  };
  totalPaid: number;
  counts: {
    missions: number;
    administrations: number;
    economicCategories: number;
  };
  missions: SpendingAggregate[];
  administrations: SpendingAggregate[];
  economicCategories: SpendingAggregate[];
  paymentMethods: SpendingAggregate[];
  consistency: {
    missionTotal: number;
    administrationTotal: number | null;
    economicTotal: number | null;
    administrationDifferencePct: number | null;
    economicDifferencePct: number | null;
  };
  sources: {
    mission: BdapDataset;
    missionAdministration: BdapDataset | null;
    administrationEconomic: BdapDataset | null;
  };
  observedAt: string;
};

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

const DIMENSION_SUFFIX: Record<StatePaymentDimension, string> = {
  mission: "MISS",
  missionAdministration: "MISAM",
  administrationEconomic: "AMCE2",
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function uuid(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)) {
    return null;
  }
  return candidate;
}

function productCode(month: number, dimension: StatePaymentDimension): string {
  return `PBS_SPE_M${String(month).padStart(2, "0")}_${DIMENSION_SUFFIX[dimension]}_001`;
}

function parsePeriod(title: string): { year: number; month: number } | null {
  const match = title.match(/\b(20\d{2})\/(0[1-9]|1[0-2])\b/);
  if (!match) return null;

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
  };
}

function normalizePackage(
  pkg: CkanPackage,
  dimension: StatePaymentDimension,
  expectedCode: string,
): BdapDataset | null {
  const packageId = uuid(pkg.id);
  const name = text(pkg.name);
  const title = text(pkg.title);
  if (!packageId || !name || !title) return null;

  const period = parsePeriod(title);
  if (!period) return null;

  const notes = text(pkg.notes);
  const matchesCode = notes?.includes(`[${expectedCode}]`) ?? false;
  if (!matchesCode) return null;

  return {
    dimension,
    productCode: expectedCode,
    packageId,
    name,
    title,
    notes,
    referenceYear: period.year,
    referenceMonth: period.month,
    metadataModified: text(pkg.metadata_modified),
    csvUrl: `${BDAP_DUMP}/${packageId}.csv`,
    apiUrl: `${BDAP_ACTION}/package_show?id=${encodeURIComponent(packageId)}`,
  };
}

async function searchProduct(
  code: string,
  dimension: StatePaymentDimension,
): Promise<BdapDataset[]> {
  const url = `${BDAP_ACTION}/package_search?${new URLSearchParams({ q: code, rows: "50" }).toString()}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: DISCOVERY_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`OpenBDAP package_search HTTP ${response.status}`);
  }

  const payload = (await response.json()) as PackageSearchResponse;
  if (!payload.success || !Array.isArray(payload.result?.results)) {
    throw new Error("Risposta package_search OpenBDAP non valida");
  }

  return payload.result.results
    .map((pkg) => normalizePackage(pkg, dimension, code))
    .filter((dataset): dataset is BdapDataset => dataset !== null);
}

function periodAtOffset(now: Date, offset: number): { year: number; month: number } {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export async function discoverLatestStatePaymentDataset(
  dimension: StatePaymentDimension,
  options: { now?: Date; maxMonthsBack?: number } = {},
): Promise<BdapDataset> {
  const now = options.now ?? new Date();
  const maxMonthsBack = Math.min(Math.max(options.maxMonthsBack ?? 16, 1), 36);

  for (let offset = 0; offset < maxMonthsBack; offset += 1) {
    const target = periodAtOffset(now, offset);
    const code = productCode(target.month, dimension);
    const datasets = await searchProduct(code, dimension);
    const exact = datasets.find(
      (dataset) =>
        dataset.referenceYear === target.year && dataset.referenceMonth === target.month,
    );

    if (exact) return exact;
  }

  throw new Error(`Nessun dataset OpenBDAP recente trovato per ${dimension}`);
}

async function findDatasetForPeriod(
  dimension: StatePaymentDimension,
  year: number,
  month: number,
): Promise<BdapDataset | null> {
  const code = productCode(month, dimension);
  const datasets = await searchProduct(code, dimension);
  return (
    datasets.find(
      (dataset) => dataset.referenceYear === year && dataset.referenceMonth === month,
    ) ?? null
  );
}

function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer).replace(/^\uFEFF/, "");
  }
}

function parseDelimitedRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ";") {
      row.push(field.trim());
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field.trim().replace(/\r$/, ""));
      field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim().replace(/\r$/, ""));
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  return rows;
}

function parseCsv(input: string): Array<Record<string, string>> {
  const rows = parseDelimitedRows(input);
  const headers = rows[0]?.map((header) => header.trim()).filter(Boolean) ?? [];
  if (headers.length === 0) return [];

  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
}

async function fetchDatasetRows(dataset: BdapDataset): Promise<Array<Record<string, string>>> {
  const response = await fetch(dataset.csvUrl, {
    headers: {
      Accept: "text/csv",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: DATA_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`OpenBDAP CSV HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("csv")) {
    throw new Error("OpenBDAP non ha restituito un CSV per il dataset richiesto");
  }

  const rows = parseCsv(decodeCsv(await response.arrayBuffer()));
  if (rows.length === 0) throw new Error("Dataset OpenBDAP vuoto");
  return rows;
}

function amount(record: Record<string, string>, key: string): number {
  const raw = record[key]?.trim();
  if (!raw) return 0;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integer(record: Record<string, string>, key: string): number {
  const parsed = Number.parseInt(record[key] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function required(record: Record<string, string>, key: string): string {
  return record[key]?.trim() || "Non indicato";
}

function components(record: Record<string, string>): PaymentComponents {
  return {
    opErario: amount(record, "OP Erario"),
    opTesoreria: amount(record, "OP Tesoreria"),
    opEsterno: amount(record, "OP Esterno"),
    oaTesoreria: amount(record, "OA Tesoreria"),
    oaSpesaFunzDeleg: amount(record, "OA Spesa Funz Deleg"),
    rsfStipendi: amount(record, "RSF Stipendi"),
    rsfAltro: amount(record, "RSF Altro"),
    noteImputazione: amount(record, "Note Imputazione"),
    totalPaid: amount(record, "Totale Pagato"),
  };
}

function normalizeMissionRows(rows: Array<Record<string, string>>): StateMissionPayment[] {
  return rows.map((record) => ({
    year: integer(record, "Esercizio finanziario"),
    month: required(record, "Mese contabile"),
    missionCode: required(record, "Codice Missione"),
    mission: required(record, "Missione"),
    ...components(record),
  }));
}

function normalizeAdministrationRows(
  rows: Array<Record<string, string>>,
): StateAdministrationMissionPayment[] {
  return rows.map((record) => ({
    year: integer(record, "Esercizio finanziario"),
    month: required(record, "Mese contabile"),
    missionCode: required(record, "Codice Missione"),
    mission: required(record, "Missione"),
    administrationCode: required(record, "Codice STP"),
    administration: required(record, "Amministrazione"),
    ...components(record),
  }));
}

function normalizeEconomicRows(
  rows: Array<Record<string, string>>,
): StateAdministrationEconomicPayment[] {
  return rows.map((record) => ({
    year: integer(record, "Esercizio finanziario"),
    month: required(record, "Mese contabile"),
    administrationCode: required(record, "Codice STP"),
    administration: required(record, "Amministrazione"),
    categoryCode: required(record, "Codice Categoria"),
    category: required(record, "Categoria"),
    economicLevel2Code: required(record, "Codice CE2"),
    economicLevel2: required(record, "CE2"),
    ...components(record),
  }));
}

function sum<T>(rows: T[], selector: (row: T) => number): number {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function groupBy<T>(
  rows: T[],
  key: (row: T) => string,
  label: (row: T) => string,
  value: (row: T) => number,
  code?: (row: T) => string | null,
): SpendingAggregate[] {
  const grouped = new Map<string, SpendingAggregate>();

  for (const row of rows) {
    const groupKey = key(row);
    const current = grouped.get(groupKey);
    if (current) {
      current.value += value(row);
      continue;
    }

    grouped.set(groupKey, {
      code: code ? code(row) : null,
      label: label(row),
      value: value(row),
    });
  }

  return [...grouped.values()].sort((left, right) => right.value - left.value);
}

function differencePct(reference: number, comparison: number | null): number | null {
  if (comparison === null || reference === 0) return null;
  return ((comparison - reference) / reference) * 100;
}

function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? `MESE ${month}`;
}

export async function getStateSpendingSnapshot(): Promise<StateSpendingSnapshot> {
  const missionDataset = await discoverLatestStatePaymentDataset("mission");
  const { referenceYear: year, referenceMonth: month } = missionDataset;

  const [administrationDatasetResult, economicDatasetResult] = await Promise.allSettled([
    findDatasetForPeriod("missionAdministration", year, month),
    findDatasetForPeriod("administrationEconomic", year, month),
  ]);

  const administrationDataset =
    administrationDatasetResult.status === "fulfilled" ? administrationDatasetResult.value : null;
  const economicDataset =
    economicDatasetResult.status === "fulfilled" ? economicDatasetResult.value : null;

  const [missionRowsResult, administrationRowsResult, economicRowsResult] = await Promise.allSettled([
    fetchDatasetRows(missionDataset),
    administrationDataset ? fetchDatasetRows(administrationDataset) : Promise.resolve([]),
    economicDataset ? fetchDatasetRows(economicDataset) : Promise.resolve([]),
  ]);

  if (missionRowsResult.status !== "fulfilled") {
    throw missionRowsResult.reason instanceof Error
      ? missionRowsResult.reason
      : new Error("Impossibile leggere il dataset per missione");
  }

  const missionRows = normalizeMissionRows(missionRowsResult.value);
  const administrationRows =
    administrationRowsResult.status === "fulfilled"
      ? normalizeAdministrationRows(administrationRowsResult.value)
      : [];
  const economicRows =
    economicRowsResult.status === "fulfilled"
      ? normalizeEconomicRows(economicRowsResult.value)
      : [];

  const missionTotal = sum(missionRows, (row) => row.totalPaid);
  const administrationTotal =
    administrationRows.length > 0 ? sum(administrationRows, (row) => row.totalPaid) : null;
  const economicTotal = economicRows.length > 0 ? sum(economicRows, (row) => row.totalPaid) : null;

  const missions = groupBy(
    missionRows,
    (row) => row.missionCode,
    (row) => row.mission,
    (row) => row.totalPaid,
    (row) => row.missionCode,
  );

  const administrations = groupBy(
    administrationRows,
    (row) => row.administrationCode,
    (row) => row.administration,
    (row) => row.totalPaid,
    (row) => row.administrationCode,
  );

  const economicCategories = groupBy(
    economicRows,
    (row) => row.categoryCode,
    (row) => row.category,
    (row) => row.totalPaid,
    (row) => row.categoryCode,
  );

  const paymentMethods: SpendingAggregate[] = [
    { code: "op-erario", label: "Ordini di pagamento · Erario", value: sum(missionRows, (row) => row.opErario) },
    { code: "op-tesoreria", label: "Ordini di pagamento · Tesoreria", value: sum(missionRows, (row) => row.opTesoreria) },
    { code: "op-esterno", label: "Ordini di pagamento · Esterno", value: sum(missionRows, (row) => row.opEsterno) },
    { code: "oa-tesoreria", label: "Ordini di accreditamento · Tesoreria", value: sum(missionRows, (row) => row.oaTesoreria) },
    { code: "oa-delegata", label: "Ordini di accreditamento · Spesa delegata", value: sum(missionRows, (row) => row.oaSpesaFunzDeleg) },
    { code: "rsf-stipendi", label: "Ruoli di spesa fissa · Stipendi", value: sum(missionRows, (row) => row.rsfStipendi) },
    { code: "rsf-altro", label: "Ruoli di spesa fissa · Altro", value: sum(missionRows, (row) => row.rsfAltro) },
    { code: "note-imputazione", label: "Note di imputazione", value: sum(missionRows, (row) => row.noteImputazione) },
  ]
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);

  return {
    period: {
      year,
      month,
      monthName: monthName(month),
      label: `${monthName(month)} ${year}`,
    },
    totalPaid: missionTotal,
    counts: {
      missions: missions.length,
      administrations: administrations.length,
      economicCategories: economicCategories.length,
    },
    missions,
    administrations,
    economicCategories,
    paymentMethods,
    consistency: {
      missionTotal,
      administrationTotal,
      economicTotal,
      administrationDifferencePct: differencePct(missionTotal, administrationTotal),
      economicDifferencePct: differencePct(missionTotal, economicTotal),
    },
    sources: {
      mission: missionDataset,
      missionAdministration: administrationDataset,
      administrationEconomic: economicDataset,
    },
    observedAt: new Date().toISOString(),
  };
}
