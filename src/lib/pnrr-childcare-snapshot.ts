import rawData from "@/data/generated/pnrr-childcare.data.json";
import rawMeta from "@/data/generated/pnrr-childcare.meta.json";
import {
  assertPnrrChildcareData,
  assertPnrrChildcareMeta,
  type PnrrChildcareProject,
} from "@/lib/data/pnrr-childcare-contract";

export const pnrrChildcareData = assertPnrrChildcareData(rawData);
export const pnrrChildcareMeta = assertPnrrChildcareMeta(rawMeta);

if (pnrrChildcareData.referenceDate !== pnrrChildcareMeta.referenceDate) {
  throw new Error("Snapshot PNRR asili: data e metadati hanno date di riferimento diverse");
}
if (pnrrChildcareData.projects.length !== pnrrChildcareMeta.coverage.uniqueProjects) {
  throw new Error("Snapshot PNRR asili: conteggio progetti non riconciliato");
}

const projectsByCup = new Map(pnrrChildcareData.projects.map((project) => [project.cup, project]));

export type PnrrChildcareQuery = {
  cup?: string;
  query?: string;
  region?: string;
  province?: string;
  limit?: number;
  offset?: number;
};

export class PnrrChildcareQueryError extends Error {
  readonly code: "invalid" | "not_found";

  constructor(
    message: string,
    code: "invalid" | "not_found" = "invalid",
  ) {
    super(message);
    this.name = "PnrrChildcareQueryError";
    this.code = code;
  }
}

function normalizedSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("it-IT").trim();
}

function normalizedCup(value: string): string {
  const cup = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{15}$/.test(cup)) throw new PnrrChildcareQueryError("CUP non valido: sono richiesti 15 caratteri alfanumerici.");
  return cup;
}

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number, field: string): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new PnrrChildcareQueryError(`${field} deve essere un intero tra ${minimum} e ${maximum}.`);
  }
  return value;
}

function searchable(project: PnrrChildcareProject): string {
  return normalizedSearch([
    project.cup,
    project.title,
    project.summary,
    project.implementer.name,
    ...project.locations.flatMap((location) => [location.region, location.province, location.municipality]),
  ].filter(Boolean).join(" "));
}

export function getPnrrChildcareProject(rawCup: string): PnrrChildcareProject | null {
  return projectsByCup.get(normalizedCup(rawCup)) ?? null;
}

export function awardeesForTender(project: PnrrChildcareProject, tender: PnrrChildcareProject["tenders"][number]) {
  return project.awardees.filter((awardee) =>
    awardee.cig === tender.cig &&
    awardee.internalProcedureCode === tender.internalProcedureCode &&
    awardee.userProcedureCode === tender.userProcedureCode);
}

export function queryPnrrChildcare(query: PnrrChildcareQuery = {}) {
  const limit = boundedInteger(query.limit, 24, 1, 100, "limit");
  const offset = boundedInteger(query.offset, 0, 0, 100_000, "offset");
  if (query.cup && (query.query || query.region || query.province)) {
    throw new PnrrChildcareQueryError("Con cup non usare anche q, region o province.");
  }
  let matches: PnrrChildcareProject[];
  if (query.cup) {
    const cup = normalizedCup(query.cup);
    const project = projectsByCup.get(cup);
    if (!project) throw new PnrrChildcareQueryError(`Nessun progetto trovato per il CUP ${cup}.`, "not_found");
    matches = [project];
  } else {
    const term = query.query ? normalizedSearch(query.query) : null;
    const region = query.region ? normalizedSearch(query.region) : null;
    const province = query.province ? normalizedSearch(query.province) : null;
    matches = pnrrChildcareData.projects.filter((project) =>
      (!term || searchable(project).includes(term)) &&
      (!region || project.locations.some((location) => normalizedSearch(location.region) === region)) &&
      (!province || project.locations.some((location) => location.province && normalizedSearch(location.province) === province)));
  }
  const page = matches.slice(offset, offset + limit);
  return {
    dataset: "pnrr_asili" as const,
    referenceDate: pnrrChildcareData.referenceDate,
    query: { ...query, limit, offset },
    pagination: { total: matches.length, limit, offset, returned: page.length },
    data: page,
    coverage: pnrrChildcareMeta.coverage,
    totals: pnrrChildcareMeta.totals,
    methodology: pnrrChildcareMeta.methodology,
    provenance: pnrrChildcareMeta.source,
  };
}
