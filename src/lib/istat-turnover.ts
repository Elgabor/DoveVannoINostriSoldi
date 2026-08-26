import "server-only";

import rawSnapshot from "@/data/generated/istat-enterprise-turnover-2024.json";
import {
  validateIstatTurnoverSnapshot,
  type IstatMacroSector,
  type IstatTurnoverObservation,
  type IstatTurnoverSnapshot,
} from "@/lib/istat-turnover-contract";

export const istatTurnoverSnapshot: IstatTurnoverSnapshot = validateIstatTurnoverSnapshot(rawSnapshot);

export const ISTAT_TURNOVER_ALL = "ALL" as const;

export type IstatTurnoverDatasetQuery = Readonly<{
  dataset?: string;
  period?: string;
  region?: string;
  sector?: string;
  limit?: number;
  offset?: number;
}>;

const regionByCode = new Map(istatTurnoverSnapshot.regions.map((region) => [region.code, region]));
const macroSectorByCode = new Map(istatTurnoverSnapshot.macroSectors.map((sector) => [sector.code, sector]));

// Build fast index: regionCode -> macroSector -> Observation
const observationMap = new Map<string, IstatTurnoverObservation>();
for (const observation of istatTurnoverSnapshot.observations) {
  observationMap.set(`${observation.geographyCode}|${observation.macroSector}`, observation);
}

function normalizeRegionCode(value: string | undefined): string {
  if (!value || value.trim().toLowerCase() === "all") return "ALL";
  const trimmed = value.trim();
  if (regionByCode.has(trimmed)) return trimmed;
  const match = istatTurnoverSnapshot.regions.find(
    (region) => region.name.localeCompare(trimmed, "it", { sensitivity: "base" }) === 0,
  );
  return match?.code ?? "ALL";
}

function normalizeSectorCode(value: string | undefined): IstatMacroSector {
  if (!value || value.trim().toLowerCase() === "all") return "ALL";
  const upper = value.trim().toUpperCase();
  if (upper === "INDUSTRIA" || upper === "SERVIZI" || upper === "ALL") return upper;
  if (upper === "INDUSTRY") return "INDUSTRIA";
  if (upper === "SERVICES") return "SERVIZI";
  return "ALL";
}

export function istatTurnoverRegionOptions() {
  return istatTurnoverSnapshot.regions;
}

export function istatTurnoverSectorOptions() {
  return istatTurnoverSnapshot.macroSectors;
}

export function istatTurnoverSource() {
  return istatTurnoverSnapshot.source;
}

export function queryIstatTurnoverDataset(query: IstatTurnoverDatasetQuery = {}) {
  const period = query.period?.trim();
  if (period && period !== "2024") {
    throw new Error(`Periodo non disponibile per il dataset ISTAT fatturato. Periodo valido: 2024.`);
  }

  const regionFilter = query.region?.trim();
  const normalizedRegion = normalizeRegionCode(regionFilter);
  if (regionFilter && regionFilter.toLowerCase() !== "all" && normalizedRegion === "ALL") {
    throw new Error(`Regione non trovata nel dataset ISTAT fatturato: ${regionFilter}.`);
  }

  const sectorFilter = query.sector?.trim();
  const normalizedSector = normalizeSectorCode(sectorFilter);
  if (sectorFilter && sectorFilter.toLowerCase() !== "all" && normalizedSector === "ALL" && sectorFilter.toUpperCase() !== "ALL") {
    const valid = istatTurnoverSnapshot.macroSectors.map((s) => s.code).join(", ");
    throw new Error(`Settore non valido nel dataset ISTAT fatturato: ${sectorFilter}. Codici ammessi: ${valid}.`);
  }

  let observations = istatTurnoverSnapshot.observations;

  if (normalizedRegion !== "ALL") {
    observations = observations.filter((obs) => obs.geographyCode === normalizedRegion);
  }

  if (normalizedSector !== "ALL") {
    observations = observations.filter((obs) => obs.macroSector === normalizedSector);
  } else if (sectorFilter === undefined || sectorFilter.toLowerCase() === "all" || sectorFilter.toUpperCase() === "ALL") {
    // If no specific sector filter is given, return all macro-sectors or total according to request
    // By default, observations contains ALL, INDUSTRIA, SERVIZI
  }

  const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 50)));
  const offset = Math.min(100_000, Math.max(0, Math.trunc(query.offset ?? 0)));
  const items = observations.slice(offset, offset + limit);

  return {
    schemaVersion: 1,
    dataset: "company_turnover_istat",
    observationType: "aggregate",
    geographyLevel: "region",
    atecoVersion: istatTurnoverSnapshot.atecoVersion,
    period: "2024",
    unit: "migliaia di euro",
    query: {
      period: "2024",
      region: normalizedRegion,
      sector: normalizedSector,
    },
    pagination: {
      total: observations.length,
      offset,
      limit,
      returned: items.length,
      hasMore: offset + items.length < observations.length,
      nextOffset: offset + items.length < observations.length ? offset + items.length : null,
    },
    data: items,
    national: istatTurnoverSnapshot.national,
    provenance: [istatTurnoverSnapshot.source],
    caveat: (
      "I dati sono aggregati a livello regionale per macro-settore (ATECO 2007 agg. 2022) dal Registro Frame "
      + "Territoriale Anticipato ISTAT 2024. Coprono le unità locali con almeno un dipendente (non l'universo delle "
      + "sedi attive). Non contengono nomi, identificativi, codici fiscali, partite IVA o fatturati di singole aziende."
    ),
  };
}

export type IstatTurnoverView = Readonly<{
  metric: "turnover";
  metricLabel: string;
  metricUnit: string;
  metricDescription: string;
  period: "2024";
  periodLabel: string;
  region: string;
  sector: IstatMacroSector;
  selectedRegion: { code: string; name: string; value: number | null } | null;
  selectedSectorLabel: string;
  nationalValue: number;
  regionPoints: Array<{ code: string; name: string; value: number | null }>;
  ranking: Array<{ code: string; name: string; value: number | null }>;
  sectorBreakdown: Array<{ code: string; label: string; value: number | null }>;
  sources: [IstatTurnoverSnapshot["source"]];
  caveats: string[];
  matchedObservationCount: number;
}>;

export function getIstatTurnoverView(filters: { region?: string; sector?: string } = {}): IstatTurnoverView {
  const normalizedRegion = normalizeRegionCode(filters.region);
  const normalizedSector = normalizeSectorCode(filters.sector);

  const regionPoints = istatTurnoverSnapshot.regions.map((region) => {
    const obs = observationMap.get(`${region.code}|${normalizedSector}`);
    return {
      code: region.code,
      name: region.name,
      value: obs?.value ?? null,
    };
  });

  const ranking = [...regionPoints].sort((left, right) => (right.value ?? -1) - (left.value ?? -1));

  // Sector breakdown for the selected region or national
  const sectorBreakdown = (["INDUSTRIA", "SERVIZI"] as const).map((sectorCode) => {
    const label = macroSectorByCode.get(sectorCode)?.label ?? sectorCode;
    if (normalizedRegion === "ALL") {
      const nationalVal = sectorCode === "INDUSTRIA"
        ? istatTurnoverSnapshot.national.industryTurnoverThousandEuro
        : istatTurnoverSnapshot.national.servicesTurnoverThousandEuro;
      return { code: sectorCode, label, value: nationalVal };
    }
    const obs = observationMap.get(`${normalizedRegion}|${sectorCode}`);
    return { code: sectorCode, label, value: obs?.value ?? null };
  });

  const selectedRegion = normalizedRegion === "ALL"
    ? null
    : regionPoints.find((region) => region.code === normalizedRegion) ?? null;

  let nationalValue: number;
  if (normalizedRegion === "ALL") {
    if (normalizedSector === "INDUSTRIA") {
      nationalValue = istatTurnoverSnapshot.national.industryTurnoverThousandEuro;
    } else if (normalizedSector === "SERVIZI") {
      nationalValue = istatTurnoverSnapshot.national.servicesTurnoverThousandEuro;
    } else {
      nationalValue = istatTurnoverSnapshot.national.turnoverThousandEuro;
    }
  } else {
    nationalValue = selectedRegion?.value ?? 0;
  }

  const selectedSectorLabel = macroSectorByCode.get(normalizedSector)?.label ?? "Tutti i settori (Industria e Servizi)";

  return {
    metric: "turnover",
    metricLabel: "Fatturato aggregato",
    metricUnit: "migliaia di euro",
    metricDescription: (
      "Fatturato aggregato delle imprese per territorio e macro-settore economico (Stima anticipata ISTAT 2024, "
      + "Registro Frame Territoriale Anticipato, ATECO 2007 agg. 2022, unità locali con almeno un dipendente)."
    ),
    period: "2024",
    periodLabel: "Anno 2024",
    region: normalizedRegion,
    sector: normalizedSector,
    selectedRegion,
    selectedSectorLabel,
    nationalValue,
    regionPoints,
    ranking,
    sectorBreakdown,
    sources: [istatTurnoverSnapshot.source],
    caveats: [
      istatTurnoverSnapshot.source.caveat,
      "I dati sono aggregati per regione e macro-settore: non identificano aziende, persone fisiche o ricavi esatti di singole società.",
    ],
    matchedObservationCount: normalizedRegion === "ALL" ? 20 : 1,
  };
}
