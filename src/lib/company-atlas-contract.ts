import { z } from "zod";

export const companyAtlasMetricSchema = z.enum([
  "active_enterprises",
  "employees",
  "active_local_units",
  "production_value_band_count",
]);

export const companyAtlasObservationSchema = z.object({
  observationType: z.literal("aggregate"),
  geographyLevel: z.literal("region"),
  geographyCode: z.string().regex(/^\d{2}$/),
  geographyName: z.string().min(1),
  atecoVersion: z.literal("ATECO 2025"),
  sectorCode: z.string().min(1).max(2),
  sectorLabel: z.string().min(1),
  metric: companyAtlasMetricSchema,
  period: z.string().min(1).max(20),
  value: z.number().int().nonnegative().nullable(),
  bandCode: z.string().min(1).max(30).optional(),
  bandLabel: z.string().min(1).optional(),
  sourceId: z.enum(["active-stock", "workforce", "production-value"]),
}).strict();

const sourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(1),
  license: z.literal("CC BY 4.0"),
  updatedAt: z.string().min(1),
  observedAt: z.string().min(1),
  cadence: z.string().min(1),
  coverage: z.string().min(1),
  caveat: z.string().min(1),
}).strict();

const periodSchema = z.object({
  id: z.string().min(1).max(20),
  label: z.string().min(1),
}).strict();

export const companyAtlasSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  observationType: z.literal("aggregate"),
  geographyVersion: z.string().min(1),
  atecoVersion: z.literal("ATECO 2025"),
  sources: z.record(z.string(), sourceSchema),
  periods: z.object({
    activeStock: z.array(periodSchema).min(1),
    workforce: z.array(periodSchema).min(1),
    productionValue: z.array(periodSchema).min(1),
  }).strict(),
  regions: z.array(z.object({
    code: z.string().regex(/^\d{2}$/),
    name: z.string().min(1),
  }).strict()).length(20),
  sectors: z.array(z.object({
    code: z.string().min(1).max(2),
    label: z.string().min(1),
  }).strict()).min(1),
  productionBands: z.array(z.object({
    code: z.string().min(1).max(30),
    label: z.string().min(1),
  }).strict()).min(1),
  observations: z.array(companyAtlasObservationSchema).min(10_000),
  coverage: z.object({
    activeStockObservations: z.number().int().nonnegative(),
    workforceRowsRead: z.number().int().nonnegative(),
    workforceObservations: z.number().int().nonnegative(),
    productionValueObservations: z.number().int().nonnegative(),
  }).strict(),
}).strict();

export type CompanyAtlasMetric = z.infer<typeof companyAtlasMetricSchema>;
export type CompanyAtlasObservation = z.infer<typeof companyAtlasObservationSchema>;
export type CompanyAtlasSource = z.infer<typeof sourceSchema>;
export type CompanyAtlasSnapshot = z.infer<typeof companyAtlasSnapshotSchema>;

export function validateCompanyAtlasSnapshot(input: unknown): CompanyAtlasSnapshot {
  return companyAtlasSnapshotSchema.parse(input);
}
