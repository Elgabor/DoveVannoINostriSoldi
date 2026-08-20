const OFFICIAL_HOSTS = new Set([
  "trasparenza.camera.it",
  "documenti.camera.it",
  "www.camera.it",
  "camera.it",
  "www.senato.it",
  "senato.it",
]);

type StatementKind = "account" | "budget";
type ChamberId = "camera" | "senato";

export type ParliamentCategory = {
  id: string;
  label: string;
  paid: number;
};

export type ParliamentHighlight = {
  id: string;
  label: string;
  value: number;
};

export type ParliamentStatement = {
  kind: StatementKind;
  year: number;
  title: string;
  documentUrl: string;
  values?: Record<string, number>;
  categories?: ParliamentCategory[];
  highlights?: ParliamentHighlight[];
  categoryReconciliationTolerance?: number;
  meaning: string;
};

export type ParliamentChamber = {
  id: ChamberId;
  name: string;
  structuredStatus: "structured-summary" | "source-documents-only";
  landingUrl: string;
  procedureUrl?: string;
  statements: ParliamentStatement[];
};

export type ParliamentSnapshot = {
  schemaVersion: 1;
  transformVersion: 1;
  observedAt: string;
  unit: "million-euro";
  rounding: string;
  chambers: ParliamentChamber[];
  methodology: {
    comparability: string;
    missingData: string;
    publicationCheck: string;
  };
};

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field}: oggetto atteso`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field}: testo non vuoto atteso`);
  }
  return value.trim();
}

function officialUrl(value: unknown, field: string): string {
  const raw = text(value, field);
  const url = new URL(raw);
  if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(`${field}: URL parlamentare ufficiale atteso`);
  }
  return raw;
}

function amount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field}: importo non negativo atteso`);
  }
  return value;
}

function listOfAmounts<T extends "paid" | "value">(
  value: unknown,
  field: string,
  amountField: T,
): Array<{ id: string; label: string } & Record<T, number>> {
  if (!Array.isArray(value)) throw new Error(`${field}: lista attesa`);
  const seen = new Set<string>();
  return value.map((item, index) => {
    const itemField = `${field}[${index}]`;
    const record = object(item, itemField);
    const id = text(record.id, `${itemField}.id`);
    if (seen.has(id)) throw new Error(`${field}: id duplicato ${id}`);
    seen.add(id);
    return {
      id,
      label: text(record.label, `${itemField}.label`),
      [amountField]: amount(record[amountField], `${itemField}.${amountField}`),
    } as { id: string; label: string } & Record<T, number>;
  });
}

function statement(value: unknown, field: string): ParliamentStatement {
  const record = object(value, field);
  const kind = record.kind;
  if (kind !== "account" && kind !== "budget") {
    throw new Error(`${field}.kind: account o budget atteso`);
  }
  const year = record.year;
  if (!Number.isInteger(year) || (year as number) < 1948 || (year as number) > 2200) {
    throw new Error(`${field}.year: anno non valido`);
  }

  const valuesRecord = record.values === undefined ? undefined : object(record.values, `${field}.values`);
  const values = valuesRecord
    ? Object.fromEntries(
        Object.entries(valuesRecord).map(([key, item]) => [key, amount(item, `${field}.values.${key}`)]),
      )
    : undefined;
  const categories = record.categories === undefined
    ? undefined
    : listOfAmounts(record.categories, `${field}.categories`, "paid");
  const highlights = record.highlights === undefined
    ? undefined
    : listOfAmounts(record.highlights, `${field}.highlights`, "value");
  const tolerance = record.categoryReconciliationTolerance === undefined
    ? undefined
    : amount(record.categoryReconciliationTolerance, `${field}.categoryReconciliationTolerance`);

  if (categories && values?.effectivePayments !== undefined) {
    const categoryTotal = categories.reduce((total, item) => total + item.paid, 0);
    if (Math.abs(categoryTotal - values.effectivePayments) > (tolerance ?? 0)) {
      throw new Error(`${field}: categorie non riconciliate con i pagamenti`);
    }
  }

  return {
    kind,
    year: year as number,
    title: text(record.title, `${field}.title`),
    documentUrl: officialUrl(record.documentUrl, `${field}.documentUrl`),
    ...(values ? { values } : {}),
    ...(categories ? { categories } : {}),
    ...(highlights ? { highlights } : {}),
    ...(tolerance !== undefined ? { categoryReconciliationTolerance: tolerance } : {}),
    meaning: text(record.meaning, `${field}.meaning`),
  };
}

export function assertParliamentSnapshot(value: unknown): ParliamentSnapshot {
  const record = object(value, "snapshot");
  if (record.schemaVersion !== 1 || record.transformVersion !== 1) {
    throw new Error("snapshot: versione 1 attesa");
  }
  const observedAt = text(record.observedAt, "snapshot.observedAt");
  if (Number.isNaN(new Date(observedAt).getTime())) {
    throw new Error("snapshot.observedAt: timestamp non valido");
  }
  if (record.unit !== "million-euro") throw new Error("snapshot.unit non valida");
  if (!Array.isArray(record.chambers) || record.chambers.length !== 2) {
    throw new Error("snapshot.chambers: Camera e Senato attesi");
  }

  const chamberIds = new Set<string>();
  const chambers = record.chambers.map((item, index): ParliamentChamber => {
    const field = `snapshot.chambers[${index}]`;
    const chamber = object(item, field);
    if (chamber.id !== "camera" && chamber.id !== "senato") {
      throw new Error(`${field}.id non valido`);
    }
    if (chamberIds.has(chamber.id)) throw new Error(`${field}.id duplicato`);
    chamberIds.add(chamber.id);
    if (
      chamber.structuredStatus !== "structured-summary" &&
      chamber.structuredStatus !== "source-documents-only"
    ) {
      throw new Error(`${field}.structuredStatus non valido`);
    }
    if (!Array.isArray(chamber.statements) || chamber.statements.length === 0) {
      throw new Error(`${field}.statements: lista non vuota attesa`);
    }
    const statements = chamber.statements.map((entry, statementIndex) =>
      statement(entry, `${field}.statements[${statementIndex}]`),
    );
    if (
      chamber.structuredStatus === "source-documents-only" &&
      statements.some((entry) => entry.values || entry.categories || entry.highlights)
    ) {
      throw new Error(`${field}: una fonte documentale non può esporre valori strutturati`);
    }
    return {
      id: chamber.id,
      name: text(chamber.name, `${field}.name`),
      structuredStatus: chamber.structuredStatus,
      landingUrl: officialUrl(chamber.landingUrl, `${field}.landingUrl`),
      ...(chamber.procedureUrl
        ? { procedureUrl: officialUrl(chamber.procedureUrl, `${field}.procedureUrl`) }
        : {}),
      statements,
    };
  });

  const methodology = object(record.methodology, "snapshot.methodology");
  return {
    schemaVersion: 1,
    transformVersion: 1,
    observedAt,
    unit: "million-euro",
    rounding: text(record.rounding, "snapshot.rounding"),
    chambers,
    methodology: {
      comparability: text(methodology.comparability, "snapshot.methodology.comparability"),
      missingData: text(methodology.missingData, "snapshot.methodology.missingData"),
      publicationCheck: text(
        methodology.publicationCheck,
        "snapshot.methodology.publicationCheck",
      ),
    },
  };
}
