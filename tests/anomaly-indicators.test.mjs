import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { computeSpendingOutliers, METHODOLOGY_WARNING } from "../src/lib/anomaly-indicators.ts";
import { assertOpenCivitasSnapshot } from "../src/lib/data/opencivitas-contract.ts";

function municipality(overrides) {
  return {
    istatCode: "000000",
    name: "Comune",
    province: "PR",
    region: "Regione",
    historicalSpendingCents: 0,
    standardSpendingCents: 1,
    differenceCents: -1,
    historicalPerCapitaCents: 0,
    standardPerCapitaCents: 1,
    differencePerCapitaCents: 0,
    differenceBasisPoints: 0,
    serviceDifferenceBasisPoints: null,
    spendingLevel: null,
    serviceLevel: null,
    spendingAssessmentReason: null,
    servicesAssessmentReason: null,
    sourceWarnings: [],
    ...overrides,
  };
}

test("flags a Comune far above its Regione's range and leaves ordinary Comuni alone", () => {
  const tightlyClustered = [100, 105, 95, 110, 90, 102, 98].map((value, index) =>
    municipality({ istatCode: String(index).padStart(6, "0"), region: "Regione X", differencePerCapitaCents: value }),
  );
  const outlier = municipality({
    istatCode: "999999",
    name: "Comune Fuori Scala",
    region: "Regione X",
    differencePerCapitaCents: 100_000,
  });

  const summary = computeSpendingOutliers([...tightlyClustered, outlier]);

  assert.equal(summary.evaluatedMunicipalities, tightlyClustered.length + 1);
  assert.equal(summary.excludedForDataQuality, 0);
  assert.equal(summary.outliers.length, 1);
  assert.equal(summary.metricVersion, 1);
  assert.equal(summary.quantileConvention, "linear-interpolation-r7");
  assert.equal(summary.minimumRegionSize, 4);
  assert.equal(summary.outliers[0].istatCode, "999999");
  assert.equal(summary.outliers[0].direction, "sopra");
  assert.ok(summary.outliers[0].excessMultiple > 0);

  const region = summary.byRegion.find((entry) => entry.region === "Regione X");
  assert.ok(region);
  assert.equal(region.above, 1);
  assert.equal(region.below, 0);
});

test("flags outliers below the range too, and orders outliers by severity", () => {
  const cluster = [100, 105, 95, 110, 90, 102, 98].map((value, index) =>
    municipality({ istatCode: `A${index}`, region: "Regione Y", differencePerCapitaCents: value }),
  );
  const mildOutlier = municipality({
    istatCode: "MILD",
    region: "Regione Y",
    differencePerCapitaCents: -5_000,
  });
  const severeOutlier = municipality({
    istatCode: "SEVERE",
    region: "Regione Y",
    differencePerCapitaCents: -50_000,
  });

  const summary = computeSpendingOutliers([...cluster, mildOutlier, severeOutlier]);

  assert.equal(summary.outliers.length, 2);
  assert.equal(summary.outliers[0].istatCode, "SEVERE");
  assert.equal(summary.outliers[1].istatCode, "MILD");
  assert.ok(summary.outliers.every((item) => item.direction === "sotto"));
  assert.ok(summary.outliers[0].excessMultiple > summary.outliers[1].excessMultiple);
});

test("pins the R-7 quartile convention for even and odd region sizes", () => {
  const even = computeSpendingOutliers(
    [0, 10, 20, 30].map((value, index) =>
      municipality({ istatCode: `Q${index}`, region: "Regione Pari", differencePerCapitaCents: value }),
    ),
  );
  const odd = computeSpendingOutliers(
    [0, 10, 20, 30, 40].map((value, index) =>
      municipality({ istatCode: `R${index}`, region: "Regione Dispari", differencePerCapitaCents: value }),
    ),
  );

  assert.equal(even.byRegion[0].medianPerCapitaCents, 15);
  assert.equal(even.byRegion[0].iqrPerCapitaCents, 15);
  assert.equal(odd.byRegion[0].medianPerCapitaCents, 20);
  assert.equal(odd.byRegion[0].iqrPerCapitaCents, 20);
});

test("excludes Comuni the source flags with data-quality warnings, without dropping them silently", () => {
  const cluster = [100, 105, 95, 110, 90].map((value, index) =>
    municipality({ istatCode: `B${index}`, region: "Regione Z", differencePerCapitaCents: value }),
  );
  const flagged = municipality({
    istatCode: "FLAGGED",
    region: "Regione Z",
    differencePerCapitaCents: 500_000,
    sourceWarnings: ["dato segnalato dalla fonte"],
  });

  const summary = computeSpendingOutliers([...cluster, flagged]);

  assert.equal(summary.excludedForDataQuality, 1);
  assert.equal(summary.evaluatedMunicipalities, cluster.length);
  assert.ok(!summary.outliers.some((item) => item.istatCode === "FLAGGED"));
  assert.equal(summary.byRegion[0].excludedForDataQuality, 1);
});

test("keeps monetary differences when only a service indicator is warned", () => {
  const municipalities = [100, 105, 95, 110].map((value, index) =>
    municipality({
      istatCode: `S${index}`,
      region: "Regione Servizi",
      differencePerCapitaCents: value,
      sourceWarnings: index === 0 ? ["DIFF_OUT_PERC_TOT: cod_anomalo"] : [],
    }),
  );

  const summary = computeSpendingOutliers(municipalities);
  assert.equal(summary.evaluatedMunicipalities, municipalities.length);
  assert.equal(summary.excludedForDataQuality, 0);
  assert.equal(summary.byRegion[0].excludedForDataQuality, 0);
});

test("keeps a Regione visible when every monetary record is excluded", () => {
  const summary = computeSpendingOutliers([
    municipality({
      region: "Regione Solo Esclusi",
      sourceWarnings: ["SPESA_STORICA_PROAB: cod_anomalo"],
    }),
  ]);

  assert.equal(summary.evaluatedMunicipalities, 0);
  assert.equal(summary.excludedForDataQuality, 1);
  assert.equal(summary.byRegion.length, 1);
  assert.equal(summary.byRegion[0].excludedForDataQuality, 1);
  assert.equal(summary.byRegion[0].medianPerCapitaCents, null);
  assert.equal(summary.byRegion[0].iqrPerCapitaCents, null);
});

test("does not evaluate a Regione with fewer than 4 Comuni (unstable quartiles)", () => {
  const tiny = [1, 2, 3].map((value, index) =>
    municipality({ istatCode: `C${index}`, region: "Regione Piccola", differencePerCapitaCents: value * 1_000_000 }),
  );

  const summary = computeSpendingOutliers(tiny);

  assert.equal(summary.outliers.length, 0);
  const region = summary.byRegion.find((entry) => entry.region === "Regione Piccola");
  assert.ok(region);
  assert.equal(region.iqrPerCapitaCents, null);
});

test("rejects a non-positive fence multiplier", () => {
  assert.throws(() => computeSpendingOutliers([], 0), /fenceMultiplier/);
  assert.throws(() => computeSpendingOutliers([], -1), /fenceMultiplier/);
});

test("exposes the methodology warning so callers cannot omit it", () => {
  const summary = computeSpendingOutliers([]);
  assert.equal(summary.methodologyWarning, METHODOLOGY_WARNING);
  assert.match(summary.methodologyWarning, /non ha automaticamente sprechi/);
});

test("runs end to end on the committed OpenCivitas snapshot without throwing", () => {
  const raw = JSON.parse(readFileSync(new URL("../src/data/generated/opencivitas-2022.json", import.meta.url), "utf8"));
  const snapshot = assertOpenCivitasSnapshot(raw);

  const summary = computeSpendingOutliers(snapshot.municipalities);

  assert.equal(
    summary.evaluatedMunicipalities + summary.excludedForDataQuality,
    snapshot.municipalities.length,
  );
  assert.ok(summary.outliers.length > 0);
  assert.ok(summary.outliers.length < snapshot.municipalities.length / 4, "outliers should stay a minority");
  assert.equal(summary.byRegion.length, snapshot.coverage.regions);
  assert.equal(summary.excludedForDataQuality, 0);
  assert.equal(
    summary.byRegion.reduce((total, region) => total + region.excludedForDataQuality, 0),
    summary.excludedForDataQuality,
  );
  for (const outlier of summary.outliers) {
    assert.ok(Number.isFinite(outlier.excessMultiple));
    assert.ok(outlier.excessMultiple > 0);
  }
});
