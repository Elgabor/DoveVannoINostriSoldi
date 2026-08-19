import { IPA_ENTI_RESOURCE_ID } from "@/lib/ipa";

const IPA_DATASTORE_SQL =
  "https://indicepa.gov.it/ipa-dati/api/3/action/datastore_search_sql";

const USER_AGENT =
  "TrasparenzaItalia/0.2 (+https://github.com/metaforismo/trasparenzaitalia)";

export type IpaTypeStat = {
  label: string;
  value: number;
};

type SqlRecord = {
  Tipologia?: unknown;
  totale?: unknown;
};

type SqlResponse = {
  success?: boolean;
  result?: {
    records?: SqlRecord[];
  };
};

function count(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function getIpaTypeDistribution(limit = 8): Promise<{
  records: IpaTypeStat[];
  observedAt: string;
  sourceUrl: string;
}> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 15);
  const sql = [
    `SELECT "Tipologia", COUNT(*) AS totale`,
    `FROM "${IPA_ENTI_RESOURCE_ID}"`,
    `WHERE "Tipologia" IS NOT NULL AND "Tipologia" <> ''`,
    `GROUP BY "Tipologia"`,
    `ORDER BY totale DESC`,
    `LIMIT ${safeLimit}`,
  ].join(" ");

  const sourceUrl = `${IPA_DATASTORE_SQL}?${new URLSearchParams({ sql }).toString()}`;
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    throw new Error(`IPA SQL upstream HTTP ${response.status}`);
  }

  const payload = (await response.json()) as SqlResponse;
  if (!payload.success || !Array.isArray(payload.result?.records)) {
    throw new Error("Risposta aggregata IPA non valida");
  }

  return {
    records: payload.result.records
      .map((record) => ({
        label:
          typeof record.Tipologia === "string" && record.Tipologia.trim()
            ? record.Tipologia.trim()
            : "Non classificato",
        value: count(record.totale),
      }))
      .filter((record) => record.value > 0),
    observedAt: new Date().toISOString(),
    sourceUrl,
  };
}
