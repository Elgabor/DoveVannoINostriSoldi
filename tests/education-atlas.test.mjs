import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const {
  EDUCATION_ATLAS_ALL,
  educationAtlasPathwayOptions,
  educationAtlasPeriodOptions,
  getEducationAtlasView,
  normalizeEducationAtlasFilters,
  queryEducationAtlasDataset,
} = await import("../src/lib/education-atlas.ts");
const { educationDatasetCatalog } = await import("../src/lib/mcp/catalog.ts");
const { PRIMARY_NAV, SITE_MAP_GROUPS } = await import("../src/lib/site-navigation.ts");

const snapshot = (await import("../src/data/generated/education-atlas-snapshot.json", { with: { type: "json" } })).default;

function coverage(period, schoolType) {
  return snapshot.coverage.byPeriodSchoolType[period][schoolType];
}

test("the education snapshot is aggregate-only and reconciles the MIM files", () => {
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.observationType, "aggregate");
  assert.equal(snapshot.geographyLevel, "region");
  assert.deepEqual(snapshot.periods.map((period) => period.id), ["202223", "202324", "202425"]);
  assert.equal(snapshot.regions.length, 20);
  assert.equal(snapshot.coverage.observedRegionCount, 18);
  assert.deepEqual(snapshot.coverage.missingRegionCodes, ["02", "04"]);
  assert.equal(snapshot.regionalObservations.length, 108);
  assert.equal(snapshot.pathwayObservations.length, 1086);
  assert.equal(snapshot.addressObservations.length, 6677);
  assert.equal(snapshot.sourceFiles.length, 12);
  assert.ok(snapshot.sourceFiles.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)));
  assert.ok(snapshot.sources.every((source) => source.license === "IODL 2.0"));

  for (const schoolType of ["state", "paritaria"]) {
    assert.equal(coverage("202425", schoolType).matchedRows, coverage("202425", schoolType).sourceRows);
    assert.equal(coverage("202425", schoolType).unmatchedRows, 0);
    assert.equal(
      coverage("202425", schoolType).studentCount,
      snapshot.regionalObservations
        .filter((row) => row.period === "202425" && row.schoolType === schoolType)
        .reduce((sum, row) => sum + row.studentCount, 0),
    );
  }

  const forbiddenKeys = [
    "schoolName", "denominazioneScuola", "email", "physicalAddress", "indirizzoFisico",
    "codiceScuola", "cf", "studentName", "studentId",
  ];
  for (const row of [...snapshot.regionalObservations, ...snapshot.pathwayObservations, ...snapshot.addressObservations]) {
    for (const key of forbiddenKeys) assert.ok(!Object.hasOwn(row, key), `Forbidden key ${key}`);
  }
});

test("education trend and regional view keep missing territories explicit", () => {
  const national = getEducationAtlasView();
  assert.equal(national.period, "202425");
  assert.equal(national.region, EDUCATION_ATLAS_ALL);
  assert.equal(national.schoolType, EDUCATION_ATLAS_ALL);
  assert.equal(national.pathway, EDUCATION_ATLAS_ALL);
  assert.equal(national.regionPoints.length, 20);
  assert.equal(national.nationalValue, 2_632_660);
  assert.equal(national.regionPoints.find((region) => region.code === "02")?.value, null);
  assert.equal(national.regionPoints.find((region) => region.code === "04")?.value, null);
  assert.equal(national.regionPoints.filter((region) => region.value !== null).length, 18);
  assert.equal(national.trend.length, 3);
  assert.equal(national.addressRanking.length, 14);
  assert.ok(national.pathwayBreakdown[0].value > 0);

  const campania = getEducationAtlasView({ region: "Campania", schoolType: "state", pathway: "SCIENTIFICO" });
  assert.equal(campania.selectedRegion?.code, "15");
  assert.equal(campania.selectedPathwayLabel, "Scientifico");
  assert.equal(campania.trend.length, 3);
  assert.ok((campania.perimeterValue ?? 0) > 0);
  assert.ok(campania.addressRanking.every((row) => row.pathwayCode === "SCIENTIFICO"));

  const normalized = normalizeEducationAtlasFilters({ schoolType: "statali", pathway: "scientifico", region: "lombardia" });
  assert.deepEqual(normalized, { period: "202425", region: "03", schoolType: "state", pathway: "SCIENTIFICO" });
});

test("education MCP dataset has bounded pagination, provenance and closed filters", () => {
  const result = queryEducationAtlasDataset({
    period: "202425",
    schoolType: "state",
    pathway: "SCIENTIFICO",
    limit: 7,
  });
  assert.equal(result.dataset, "education_students_by_pathway");
  assert.equal(result.pagination.limit, 7);
  assert.equal(result.pagination.returned, 7);
  assert.equal(result.data.length, 7);
  assert.ok(result.data.every((row) => row.period === "202425" && row.pathwayCode === "SCIENTIFICO"));
  assert.equal(result.provenance.length, 2);
  assert.match(result.caveat, /non misurano qualità/i);
  assert.throws(() => queryEducationAtlasDataset({ region: "Atlantide" }), /Regione non trovata/);
  assert.throws(() => queryEducationAtlasDataset({ pathway: "inesistente" }), /Percorso non trovato/);
  assert.throws(() => queryEducationAtlasDataset({ schoolType: "privata" }), /Tipo di scuola non valido/);
  assert.ok(educationAtlasPeriodOptions().some((period) => period.id === "202425"));
  assert.ok(educationAtlasPathwayOptions().some((pathway) => pathway.code === "SCIENTIFICO"));
});

test("education is an existing Atlante module in the navigation and MCP catalog", () => {
  assert.equal(educationDatasetCatalog.length, 1);
  assert.equal(educationDatasetCatalog[0].id, "education_students_by_pathway");
  assert.equal(educationDatasetCatalog[0].freshness, "snapshot");
  assert.equal(educationDatasetCatalog[0].sources.length, 2);
  const businessSection = PRIMARY_NAV.find((item) => item.href === "/imprese");
  assert.ok(businessSection?.aliases?.includes("/istruzione"));
  assert.ok(businessSection?.children?.some((child) => child.href === "/istruzione"));
  const businessMapGroup = SITE_MAP_GROUPS.find((group) => group.title === "Imprese");
  assert.ok(businessMapGroup?.links.some((link) => link.href === "/istruzione"));
});
