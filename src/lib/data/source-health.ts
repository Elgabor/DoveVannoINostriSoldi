import { discoverLatestStatePaymentDataset } from "@/lib/bdap-payments";
import { classifyFreshness, type Freshness } from "@/lib/data/freshness";
import { fetchOfficialSource } from "@/lib/data/source-fetch";
import {
  SOURCE_IDS,
  SOURCE_POLICIES,
  type SourceId,
  type SourcePolicy,
} from "@/lib/data/source-policy";
import { IPA_ENTI_RESOURCE_ID } from "@/lib/ipa";
import { openCoesioneSnapshot } from "@/lib/opencoesione-snapshot";

export type SourceIntegrationState = "active" | "mapped";
export type SourceReachability = "up" | "down" | "not-probed";

export type SourceHealth = {
  sourceId: SourceId;
  label: string;
  owner: string;
  integration: SourceIntegrationState;
  reachability: SourceReachability;
  freshness: Freshness;
  checkedAt: string;
  latencyMs: number | null;
  detail: string | null;
  recordCount: number | null;
  policy: Pick<
    SourcePolicy,
    | "cadence"
    | "cadenceNote"
    | "discoveryRevalidateSeconds"
    | "dataRevalidateSeconds"
    | "staleAfterSeconds"
    | "sourceUrl"
  >;
};

type CkanDatastoreHealthResponse = {
  success?: boolean;
  result?: {
    total?: number;
  };
};

type CkanResourceResponse = {
  success?: boolean;
  result?: {
    last_modified?: unknown;
    metadata_modified?: unknown;
  };
};

const ACTIVE_SOURCES = new Set<SourceId>(["ipa", "openbdap", "siope", "opencoesione"]);

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function freshnessFor(sourceId: SourceId, sourceTimestamp: string | null): Freshness {
  return classifyFreshness(
    SOURCE_POLICIES[sourceId].staleAfterSeconds,
    sourceTimestamp,
  );
}

function baseHealth(
  sourceId: SourceId,
): Omit<
  SourceHealth,
  "reachability" | "freshness" | "latencyMs" | "detail" | "recordCount"
> {
  const policy = SOURCE_POLICIES[sourceId];
  return {
    sourceId,
    label: policy.label,
    owner: policy.owner,
    integration: ACTIVE_SOURCES.has(sourceId) ? "active" : "mapped",
    checkedAt: new Date().toISOString(),
    policy: {
      cadence: policy.cadence,
      cadenceNote: policy.cadenceNote,
      discoveryRevalidateSeconds: policy.discoveryRevalidateSeconds,
      dataRevalidateSeconds: policy.dataRevalidateSeconds,
      staleAfterSeconds: policy.staleAfterSeconds,
      sourceUrl: policy.sourceUrl,
    },
  };
}

async function getIpaRecordCount(): Promise<number | null> {
  const url = `https://indicepa.gov.it/ipa-dati/api/3/action/datastore_search?${new URLSearchParams({
    resource_id: IPA_ENTI_RESOURCE_ID,
    limit: "0",
  }).toString()}`;
  const response = await fetchOfficialSource("ipa", url, {
    kind: "discovery",
    headers: { Accept: "application/json" },
    tags: ["health:ipa", "dataset:ipa-enti"],
  });

  if (!response.ok) throw new Error(`IPA datastore HTTP ${response.status}`);
  const payload = (await response.json()) as CkanDatastoreHealthResponse;
  if (!payload.success) throw new Error("Risposta datastore IPA non valida");
  return typeof payload.result?.total === "number" ? payload.result.total : null;
}

async function getIpaResourceTimestamp(): Promise<string | null> {
  const url = `https://indicepa.gov.it/ipa-dati/api/3/action/resource_show?${new URLSearchParams({
    id: IPA_ENTI_RESOURCE_ID,
  }).toString()}`;
  const response = await fetchOfficialSource("ipa", url, {
    kind: "discovery",
    headers: { Accept: "application/json" },
    tags: ["health:ipa", "metadata:ipa-enti"],
  });

  if (!response.ok) throw new Error(`IPA resource_show HTTP ${response.status}`);
  const payload = (await response.json()) as CkanResourceResponse;
  if (!payload.success || !payload.result) {
    throw new Error("Risposta resource_show IPA non valida");
  }

  return text(payload.result.last_modified) ?? text(payload.result.metadata_modified);
}

async function probeIpa(): Promise<SourceHealth> {
  const base = baseHealth("ipa");
  const startedAt = performance.now();
  const [countResult, timestampResult] = await Promise.allSettled([
    getIpaRecordCount(),
    getIpaResourceTimestamp(),
  ]);
  const latencyMs = Math.round(performance.now() - startedAt);

  if (countResult.status === "rejected") {
    return {
      ...base,
      reachability: "down",
      freshness: freshnessFor("ipa", null),
      latencyMs,
      detail:
        countResult.reason instanceof Error
          ? countResult.reason.message
          : "Errore sconosciuto durante il probe IPA",
      recordCount: null,
    };
  }

  const sourceTimestamp =
    timestampResult.status === "fulfilled" ? timestampResult.value : null;
  const metadataDetail =
    timestampResult.status === "rejected"
      ? " · timestamp ufficiale non disponibile"
      : "";

  return {
    ...base,
    reachability: "up",
    freshness: freshnessFor("ipa", sourceTimestamp),
    latencyMs,
    detail: `Data API Enti raggiungibile${metadataDetail}`,
    recordCount: countResult.value,
  };
}

async function probeOpenBdap(): Promise<SourceHealth> {
  const base = baseHealth("openbdap");
  const startedAt = performance.now();

  try {
    const latest = await discoverLatestStatePaymentDataset("mission", {
      maxMonthsBack: 6,
    });

    return {
      ...base,
      reachability: "up",
      freshness: freshnessFor("openbdap", latest.metadataModified),
      latencyMs: Math.round(performance.now() - startedAt),
      detail: `Ultimo rilascio pagamenti trovato: ${latest.title}`,
      recordCount: null,
    };
  } catch (error) {
    return {
      ...base,
      reachability: "down",
      freshness: freshnessFor("openbdap", null),
      latencyMs: Math.round(performance.now() - startedAt),
      detail: error instanceof Error ? error.message : "Errore sconosciuto",
      recordCount: null,
    };
  }
}

async function probeSiope(): Promise<SourceHealth> {
  const base = baseHealth("siope");
  const startedAt = performance.now();
  const year = new Date().getUTCFullYear();
  const url = `https://www.siope.it/documenti/siope2/open/last/SIOPE_USCITE.${year}.zip`;

  try {
    const response = await fetchOfficialSource("siope", url, {
      kind: "discovery",
      headers: {
        Accept: "application/zip, application/octet-stream;q=0.9, */*;q=0.5",
        Range: "bytes=0-0",
      },
      tags: ["health:siope", `dataset:siope-uscite-${year}`],
    });

    if (!response.ok) throw new Error(`SIOPE open data HTTP ${response.status}`);
    const sourceTimestamp = response.headers.get("last-modified");
    const range = response.headers.get("content-range");
    await response.body?.cancel();

    return {
      ...base,
      reachability: "up",
      freshness: freshnessFor("siope", sourceTimestamp),
      latencyMs: Math.round(performance.now() - startedAt),
      detail: range
        ? `File nazionale uscite ${year} raggiungibile · ${range}`
        : `File nazionale uscite ${year} raggiungibile`,
      recordCount: null,
    };
  } catch (error) {
    return {
      ...base,
      reachability: "down",
      freshness: freshnessFor("siope", null),
      latencyMs: Math.round(performance.now() - startedAt),
      detail: error instanceof Error ? error.message : "Errore sconosciuto",
      recordCount: null,
    };
  }
}

function mappedSource(sourceId: SourceId): SourceHealth {
  return {
    ...baseHealth(sourceId),
    reachability: "not-probed",
    freshness: freshnessFor(sourceId, null),
    latencyMs: null,
    detail: "Adapter dati non ancora attivo: non attribuiamo uno stato di rete artificiale.",
    recordCount: null,
  };
}

function snapshotManagedOpenCoesione(): SourceHealth {
  return {
    ...baseHealth("opencoesione"),
    reachability: "not-probed",
    freshness: freshnessFor("opencoesione", openCoesioneSnapshot.referenceDate),
    latencyMs: null,
    detail:
      "Snapshot ETL attivo; reachability controllata dal workflow dedicato, non da questo endpoint.",
    recordCount: openCoesioneSnapshot.totals.projects,
  };
}

export async function getSourceHealthOverview(): Promise<SourceHealth[]> {
  const [ipa, openbdap, siope] = await Promise.all([
    probeIpa(),
    probeOpenBdap(),
    probeSiope(),
  ]);
  const live = new Map<SourceId, SourceHealth>([
    ["ipa", ipa],
    ["openbdap", openbdap],
    ["siope", siope],
    ["opencoesione", snapshotManagedOpenCoesione()],
  ]);

  return SOURCE_IDS.map((sourceId) => live.get(sourceId) ?? mappedSource(sourceId));
}
