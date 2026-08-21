export type PnrrChildcareLocation = {
  regionCode: string | null;
  region: string;
  provinceCode: string | null;
  province: string | null;
  municipalityCode: string | null;
  municipality: string | null;
  address: string | null;
  postalCode: string | null;
  shareBasisPoints: number | null;
};

export type PnrrChildcareTender = {
  cig: string | null;
  frameworkCig: string | null;
  userProcedureCode: string | null;
  internalProcedureCode: string | null;
  procedure: string | null;
  deliveryMode: string | null;
  contractType: string | null;
  subject: string | null;
  publishedAt: string | null;
  absenceReason: string | null;
  amountCents: number | null;
  awardAmountCents: number | null;
  awardedAt: string | null;
};

export type PnrrChildcareAwardee = {
  cig: string | null;
  userProcedureCode: string | null;
  internalProcedureCode: string | null;
  taxId: string | null;
  name: string | null;
  role: string | null;
  legalForm: string | null;
  atecoCode: string | null;
};

export type PnrrChildcareProject = {
  cup: string;
  localProjectCode: string | null;
  title: string;
  summary: string | null;
  classification: {
    nature: string | null;
    type: string | null;
    sector: string | null;
    subsector: string | null;
    category: string | null;
  };
  status: {
    cup: string | null;
    progress: string | null;
    phaseCode: string | null;
    phase: string | null;
    phaseStatus: string | null;
    validationOutcome: string | null;
    validatedAt: string | null;
  };
  funding: {
    pnrrCents: number | null;
    totalCents: number | null;
    netPublicCents: number | null;
    stateCents: number | null;
    municipalityCents: number | null;
    regionCents: number | null;
    privateCents: number | null;
    toBeFoundCents: number | null;
  };
  implementer: { name: string | null; taxCode: string | null };
  timeline: {
    plannedStart: string | null;
    actualStart: string | null;
    plannedEnd: string | null;
    actualEnd: string | null;
  };
  existingProject: string | null;
  locations: PnrrChildcareLocation[];
  tenders: PnrrChildcareTender[];
  awardees: PnrrChildcareAwardee[];
};

export type PnrrChildcareData = {
  schemaVersion: 1;
  dataset: "pnrr_asili";
  submeasure: { code: "M4C1I1.01.00"; label: string };
  referenceDate: string;
  projects: PnrrChildcareProject[];
};

export type PnrrChildcareMeta = {
  schemaVersion: 1;
  dataset: "pnrr_asili";
  generatedAt: string;
  referenceDate: string;
  submeasure: { code: "M4C1I1.01.00"; label: string };
  coverage: {
    projectRows: number;
    uniqueProjects: number;
    locationRows: number;
    tenderRows: number;
    awardeeRows: number;
    projectsWithLocations: number;
    projectsWithTenders: number;
    projectsWithAwardees: number;
    municipalities: number;
    unmatchedAwardeeRows: number;
  };
  totals: {
    pnrrFundingCents: number;
    totalFundingCents: number;
    tenderAmountCents: number;
    awardAmountCents: number;
  };
  source: {
    owner: string;
    landingUrl: string;
    license: string;
    licenseUrl: string;
    attribution: string;
    assets: Record<string, { fileName: string; url: string; bytes: number; sha256: string }>;
  };
  methodology: {
    join: string;
    fundingWarning: string;
    territorialWarning: string;
    validationWarning: string;
  };
  integrity: {
    algorithm: "sha256";
    sourceLockSha256: string;
    dataArtifact: { bytes: number; sha256: string };
  };
};

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field}: oggetto atteso`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field}: testo atteso`);
  return value;
}

function safeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${field}: intero sicuro non negativo atteso`);
  }
  return value as number;
}

function officialUrl(value: unknown, field: string): string {
  const result = text(value, field);
  const url = new URL(result);
  if (url.protocol !== "https:" || !url.hostname.endsWith("italiadomani.gov.it")) {
    throw new Error(`${field}: URL ufficiale ItaliaDomani atteso`);
  }
  return result;
}

function nullableText(value: unknown, field: string): string | null {
  if (value === null) return null;
  return text(value, field);
}

function nullableMoney(value: unknown, field: string): number | null {
  if (value === null) return null;
  return safeInteger(value, field);
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field}: elenco atteso`);
  return value;
}

function assertProject(value: unknown, index: number): PnrrChildcareProject {
  const field = `snapshot.projects[${index}]`;
  const record = object(value, field);
  const cup = text(record.cup, `${field}.cup`);
  if (!/^[A-Z0-9]{15}$/.test(cup)) throw new Error(`${field}.cup non valido`);
  const funding = object(record.funding, `${field}.funding`);
  for (const key of ["pnrrCents", "totalCents", "netPublicCents", "stateCents", "municipalityCents", "regionCents", "privateCents", "toBeFoundCents"]) {
    nullableMoney(funding[key], `${field}.funding.${key}`);
  }
  const locations = array(record.locations, `${field}.locations`);
  const tenders = array(record.tenders, `${field}.tenders`);
  const awardees = array(record.awardees, `${field}.awardees`);
  for (const [locationIndex, value] of locations.entries()) {
    const location = object(value, `${field}.locations[${locationIndex}]`);
    text(location.region, `${field}.locations[${locationIndex}].region`);
    if (location.shareBasisPoints !== null) safeInteger(location.shareBasisPoints, `${field}.locations[${locationIndex}].shareBasisPoints`);
  }
  for (const [tenderIndex, value] of tenders.entries()) {
    const tender = object(value, `${field}.tenders[${tenderIndex}]`);
    if (tender.cig !== null && !/^[A-Z0-9]{10}$/.test(text(tender.cig, `${field}.tenders[${tenderIndex}].cig`))) {
      throw new Error(`${field}.tenders[${tenderIndex}].cig non valido`);
    }
    nullableMoney(tender.amountCents, `${field}.tenders[${tenderIndex}].amountCents`);
    nullableMoney(tender.awardAmountCents, `${field}.tenders[${tenderIndex}].awardAmountCents`);
  }
  for (const [awardeeIndex, value] of awardees.entries()) {
    const awardee = object(value, `${field}.awardees[${awardeeIndex}]`);
    nullableText(awardee.cig, `${field}.awardees[${awardeeIndex}].cig`);
  }
  text(record.title, `${field}.title`);
  object(record.classification, `${field}.classification`);
  object(record.status, `${field}.status`);
  object(record.implementer, `${field}.implementer`);
  object(record.timeline, `${field}.timeline`);
  return value as PnrrChildcareProject;
}

export function assertPnrrChildcareData(value: unknown): PnrrChildcareData {
  const record = object(value, "snapshot");
  if (record.schemaVersion !== 1 || record.dataset !== "pnrr_asili") {
    throw new Error("snapshot PNRR asili: schema o dataset inatteso");
  }
  const submeasure = object(record.submeasure, "snapshot.submeasure");
  if (submeasure.code !== "M4C1I1.01.00") throw new Error("snapshot.submeasure.code inatteso");
  const projects = array(record.projects, "snapshot.projects").map(assertProject);
  const cups = new Set(projects.map((project) => project.cup));
  if (cups.size !== projects.length) throw new Error("snapshot.projects: CUP duplicati");
  return {
    schemaVersion: 1,
    dataset: "pnrr_asili",
    submeasure: { code: "M4C1I1.01.00", label: text(submeasure.label, "snapshot.submeasure.label") },
    referenceDate: text(record.referenceDate, "snapshot.referenceDate"),
    projects,
  };
}

export function assertPnrrChildcareMeta(value: unknown): PnrrChildcareMeta {
  const record = object(value, "meta");
  if (record.schemaVersion !== 1 || record.dataset !== "pnrr_asili") {
    throw new Error("meta PNRR asili: schema o dataset inatteso");
  }
  const coverage = object(record.coverage, "meta.coverage");
  const totals = object(record.totals, "meta.totals");
  for (const key of ["projectRows", "uniqueProjects", "locationRows", "tenderRows", "awardeeRows", "projectsWithLocations", "projectsWithTenders", "projectsWithAwardees", "municipalities", "unmatchedAwardeeRows"]) safeInteger(coverage[key], `meta.coverage.${key}`);
  for (const key of ["pnrrFundingCents", "totalFundingCents", "tenderAmountCents", "awardAmountCents"]) safeInteger(totals[key], `meta.totals.${key}`);
  const source = object(record.source, "meta.source");
  officialUrl(source.landingUrl, "meta.source.landingUrl");
  const assets = object(source.assets, "meta.source.assets");
  for (const [key, value] of Object.entries(assets)) {
    const asset = object(value, `meta.source.assets.${key}`);
    officialUrl(asset.url, `meta.source.assets.${key}.url`);
    safeInteger(asset.bytes, `meta.source.assets.${key}.bytes`);
    if (!/^[a-f0-9]{64}$/.test(text(asset.sha256, `meta.source.assets.${key}.sha256`))) throw new Error(`meta.source.assets.${key}.sha256 non valido`);
  }
  return value as PnrrChildcareMeta;
}
