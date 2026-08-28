import { z } from "zod";

export const educationSchoolTypeSchema = z.enum(["state", "paritaria"]);
export type EducationSchoolType = z.infer<typeof educationSchoolTypeSchema>;

const periodSchema = z.object({
  id: z.string().regex(/^\d{6}$/),
  label: z.string().min(1),
}).strict();

const regionSchema = z.object({
  code: z.string().regex(/^\d{2}$/),
  name: z.string().min(1),
}).strict();

const pathwaySchema = z.object({
  code: z.string().min(1).max(40),
  label: z.string().min(1),
}).strict();

const sourceSchema = z.object({
  id: z.enum(["students", "registry"]),
  label: z.string().min(1),
  url: z.string().url(),
  landingUrl: z.string().url(),
  publisher: z.literal("Ministero dell'Istruzione e del Merito"),
  license: z.literal("IODL 2.0"),
  updatedAt: z.string().min(1),
  observedAt: z.string().min(1),
  verifiedAt: z.string().min(1),
  cadence: z.literal("annuale"),
  coverage: z.string().min(1),
  caveat: z.string().min(1),
}).strict();

const countSchema = z.number().int().nonnegative();

const regionalObservationSchema = z.object({
  period: z.string().regex(/^\d{6}$/),
  schoolType: educationSchoolTypeSchema,
  regionCode: z.string().regex(/^\d{2}$/),
  regionName: z.string().min(1),
  studentCount: countSchema,
  maleCount: countSchema,
  femaleCount: countSchema,
  schoolCount: countSchema,
}).strict();

const pathwayObservationSchema = z.object({
  period: z.string().regex(/^\d{6}$/),
  schoolType: educationSchoolTypeSchema,
  regionCode: z.string().regex(/^\d{2}$/),
  regionName: z.string().min(1),
  pathwayCode: z.string().min(1).max(40),
  pathwayLabel: z.string().min(1),
  studentCount: countSchema,
  maleCount: countSchema,
  femaleCount: countSchema,
}).strict();

const addressObservationSchema = z.object({
  period: z.string().regex(/^\d{6}$/),
  schoolType: educationSchoolTypeSchema,
  regionCode: z.string().regex(/^\d{2}$/),
  regionName: z.string().min(1),
  pathwayCode: z.string().min(1).max(40),
  pathwayLabel: z.string().min(1),
  addressLabel: z.string().min(1).max(200),
  studentCount: countSchema,
  maleCount: countSchema,
  femaleCount: countSchema,
}).strict();

const sourceFileSchema = z.object({
  period: z.string().regex(/^\d{6}$/),
  schoolType: educationSchoolTypeSchema,
  role: z.enum(["students", "registry"]),
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: countSchema,
  rows: countSchema,
}).strict();

const sourceFileManifestSchema = z.object({
  schemaVersion: z.literal(1),
  snapshotPath: z.literal("src/data/generated/education-atlas-snapshot.json"),
  verifiedAt: z.string().min(1),
  files: z.array(sourceFileSchema).length(12),
}).strict();

const coverageEntrySchema = z.object({
  sourceRows: countSchema,
  matchedRows: countSchema,
  unmatchedRows: countSchema,
  schoolCount: countSchema,
  regionCount: countSchema,
  studentCount: countSchema,
  maleCount: countSchema,
  femaleCount: countSchema,
  addressCount: countSchema,
}).strict();

const coverageSchema = z.object({
  expectedRegionCount: z.number().int().positive(),
  observedRegionCount: z.number().int().positive(),
  missingRegionCodes: z.array(z.string().regex(/^\d{2}$/)),
  byPeriodSchoolType: z.record(
    z.string().regex(/^\d{6}$/),
    z.object({
      state: coverageEntrySchema,
      paritaria: coverageEntrySchema,
    }).strict(),
  ),
  joinKey: z.literal("CODICESCUOLA"),
  sourceGrain: z.literal("CODICESCUOLA × ANNOCORSO × TIPOPERCORSO × PERCORSO × INDIRIZZO"),
}).strict();

const educationAtlasSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  verifiedAt: z.string().min(1),
  observationType: z.literal("aggregate"),
  geographyLevel: z.literal("region"),
  periods: z.array(periodSchema).length(3),
  regions: z.array(regionSchema).length(20),
  schoolTypes: z.array(z.object({
    code: educationSchoolTypeSchema,
    label: z.string().min(1),
  }).strict()).length(2),
  pathways: z.array(pathwaySchema).min(1),
  sources: z.array(sourceSchema).length(2),
  sourceFiles: z.array(sourceFileSchema).length(12),
  regionalObservations: z.array(regionalObservationSchema).min(1),
  pathwayObservations: z.array(pathwayObservationSchema).min(1),
  addressObservations: z.array(addressObservationSchema).min(1),
  coverage: coverageSchema,
}).strict();

const EXPECTED_PERIODS = ["202223", "202324", "202425"] as const;
const EXPECTED_REGION_CODES = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
] as const;
const EXPECTED_REGION_NAMES = new Map([
  ["01", "Piemonte"],
  ["02", "Valle d'Aosta"],
  ["03", "Lombardia"],
  ["04", "Trentino-Alto Adige"],
  ["05", "Veneto"],
  ["06", "Friuli-Venezia Giulia"],
  ["07", "Liguria"],
  ["08", "Emilia-Romagna"],
  ["09", "Toscana"],
  ["10", "Umbria"],
  ["11", "Marche"],
  ["12", "Lazio"],
  ["13", "Abruzzo"],
  ["14", "Molise"],
  ["15", "Campania"],
  ["16", "Puglia"],
  ["17", "Basilicata"],
  ["18", "Calabria"],
  ["19", "Sicilia"],
  ["20", "Sardegna"],
]);

const EXPECTED_SOURCE_FILE_KEYS = EXPECTED_PERIODS.flatMap((period) =>
  ["state", "paritaria"].flatMap((schoolType) =>
    ["students", "registry"].map((role) => `${period}|${schoolType}|${role}`),
  ),
);

export type EducationAtlasSource = z.infer<typeof sourceSchema>;
export type EducationAtlasSourceFile = z.infer<typeof sourceFileSchema>;
export type EducationAtlasSourceFileManifest = z.infer<typeof sourceFileManifestSchema>;
export type EducationAtlasRegionalObservation = z.infer<typeof regionalObservationSchema>;
export type EducationAtlasPathwayObservation = z.infer<typeof pathwayObservationSchema>;
export type EducationAtlasAddressObservation = z.infer<typeof addressObservationSchema>;
export type EducationAtlasSnapshot = z.infer<typeof educationAtlasSnapshotSchema>;

function validateSourceFileInventory(
  sourceFiles: readonly EducationAtlasSourceFile[],
  issue: (path: (string | number)[], message: string) => void,
  path: string,
) {
  const keys = sourceFiles.map((file) => [file.period, file.schoolType, file.role].join("|"));
  if (keys.join("|") !== EXPECTED_SOURCE_FILE_KEYS.join("|")) {
    issue([path], "L'inventario deve contenere un file studenti e uno anagrafe per ogni periodo e tipo scuola");
  }
  if (new Set(sourceFiles.map((file) => file.url)).size !== sourceFiles.length) {
    issue([path], "L'inventario non può contenere URL sorgente duplicati");
  }
}

export function validateEducationAtlasSnapshot(input: unknown): EducationAtlasSnapshot {
  return educationAtlasSnapshotSchema.superRefine((snapshot, ctx) => {
    const issue = (path: (string | number)[], message: string) => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    };
    const periods = snapshot.periods.map((period) => period.id);
    if (periods.join("|") !== EXPECTED_PERIODS.join("|")) {
      issue(["periods"], "I periodi scolastici devono essere 2022/23, 2023/24 e 2024/25");
    }
    const regionCodes = snapshot.regions.map((region) => region.code);
    if (regionCodes.join("|") !== EXPECTED_REGION_CODES.join("|")) {
      issue(["regions"], "Il catalogo deve contenere le 20 regioni attese in ordine ISTAT");
    }
    for (const region of snapshot.regions) {
      if (EXPECTED_REGION_NAMES.get(region.code) !== region.name) {
        issue(["regions", region.code], "Nome Regione incoerente con il codice");
      }
    }
    const sourceIds = snapshot.sources.map((source) => source.id);
    if (sourceIds.join("|") !== "students|registry") {
      issue(["sources"], "Le fonti devono essere studenti e anagrafe scuole");
    }
    const sourceObservedAt = new Set(snapshot.sources.map((source) => source.observedAt));
    if (sourceObservedAt.size !== 1 || !sourceObservedAt.has(snapshot.generatedAt)) {
      issue(["sources"], "La provenienza deve usare lo stesso observedAt dello snapshot");
    }
    const sourceVerifiedAt = new Set(snapshot.sources.map((source) => source.verifiedAt));
    if (sourceVerifiedAt.size !== 1 || !sourceVerifiedAt.has(snapshot.verifiedAt)) {
      issue(["sources"], "La provenienza deve usare lo stesso verifiedAt dello snapshot");
    }
    validateSourceFileInventory(snapshot.sourceFiles, issue, "sourceFiles");
    const regionKeySet = new Set<string>();
    for (const [index, row] of snapshot.regionalObservations.entries()) {
      const key = [row.period, row.schoolType, row.regionCode].join("|");
      if (regionKeySet.has(key)) issue(["regionalObservations", index], `Osservazione regionale duplicata: ${key}`);
      regionKeySet.add(key);
      if (row.regionName !== EXPECTED_REGION_NAMES.get(row.regionCode)) {
        issue(["regionalObservations", index], `Nome Regione incoerente: ${key}`);
      }
      if (row.studentCount !== row.maleCount + row.femaleCount) {
        issue(["regionalObservations", index], `Totale studenti non riconciliato: ${key}`);
      }
    }
    const pathwayKeySet = new Set<string>();
    for (const [index, row] of snapshot.pathwayObservations.entries()) {
      const key = [row.period, row.schoolType, row.regionCode, row.pathwayCode].join("|");
      if (pathwayKeySet.has(key)) issue(["pathwayObservations", index], `Osservazione percorso duplicata: ${key}`);
      pathwayKeySet.add(key);
      if (row.regionName !== EXPECTED_REGION_NAMES.get(row.regionCode)) {
        issue(["pathwayObservations", index], `Nome Regione incoerente: ${key}`);
      }
      if (row.studentCount !== row.maleCount + row.femaleCount) {
        issue(["pathwayObservations", index], `Totale percorso non riconciliato: ${key}`);
      }
    }
    const addressKeySet = new Set<string>();
    for (const [index, row] of snapshot.addressObservations.entries()) {
      const key = [row.period, row.schoolType, row.regionCode, row.pathwayCode, row.addressLabel].join("|");
      if (addressKeySet.has(key)) issue(["addressObservations", index], `Osservazione indirizzo duplicata: ${key}`);
      addressKeySet.add(key);
      if (row.regionName !== EXPECTED_REGION_NAMES.get(row.regionCode)) {
        issue(["addressObservations", index], `Nome Regione incoerente: ${key}`);
      }
      if (row.studentCount !== row.maleCount + row.femaleCount) {
        issue(["addressObservations", index], `Totale indirizzo non riconciliato: ${key}`);
      }
    }
    const observedRegionCodes = [...new Set(snapshot.regionalObservations.map((row) => row.regionCode))].sort();
    const missingRegionCodes = EXPECTED_REGION_CODES.filter((code) => !observedRegionCodes.includes(code));
    if (snapshot.coverage.observedRegionCount !== observedRegionCodes.length) {
      issue(["coverage", "observedRegionCount"], "Numero di Regioni osservate incoerente");
    }
    if (snapshot.coverage.missingRegionCodes.join("|") !== missingRegionCodes.join("|")) {
      issue(["coverage", "missingRegionCodes"], "Elenco delle Regioni mancanti incoerente");
    }
    for (const period of EXPECTED_PERIODS) {
      for (const schoolType of ["state", "paritaria"] as const) {
        const coverage = snapshot.coverage.byPeriodSchoolType[period];
        const entry = coverage?.[schoolType];
        if (!entry) {
          issue(["coverage", "byPeriodSchoolType", period, schoolType], "Copertura periodo/tipo scuola mancante");
          continue;
        }
        const regional = snapshot.regionalObservations.filter(
          (row) => row.period === period && row.schoolType === schoolType,
        );
        const pathways = snapshot.pathwayObservations.filter(
          (row) => row.period === period && row.schoolType === schoolType,
        );
        const addresses = snapshot.addressObservations.filter(
          (row) => row.period === period && row.schoolType === schoolType,
        );
        for (const [label, rows] of [["regionale", regional], ["percorso", pathways], ["indirizzo", addresses]] as const) {
          const total = rows.reduce((sum, row) => sum + row.studentCount, 0);
          if (total !== entry.studentCount) issue(["coverage", period, schoolType], `Totale ${label} non riconciliato`);
        }
        const male = regional.reduce((sum, row) => sum + row.maleCount, 0);
        const female = regional.reduce((sum, row) => sum + row.femaleCount, 0);
        if (male !== entry.maleCount || female !== entry.femaleCount) {
          issue(["coverage", period, schoolType], "Totale per genere non riconciliato");
        }
        if (entry.matchedRows !== entry.sourceRows || entry.unmatchedRows !== 0) {
          issue(["coverage", period, schoolType], "Join scuola-territorio incompleto");
        }
      }
    }
  }).parse(input);
}

export function validateEducationAtlasSourceFileManifest(input: unknown): EducationAtlasSourceFileManifest {
  return sourceFileManifestSchema.superRefine((manifest, ctx) => {
    const issue = (path: (string | number)[], message: string) => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    };
    validateSourceFileInventory(manifest.files, issue, "files");
  }).parse(input);
}
