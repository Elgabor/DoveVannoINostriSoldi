import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const {
  PnrrChildcareQueryError,
  awardeesForTender,
  pnrrChildcareData,
  pnrrChildcareMeta,
  queryPnrrChildcare,
} = await import("../src/lib/pnrr-childcare-snapshot.ts");

test("PNRR childcare snapshot reconciles the four official ItaliaDomani tables", () => {
  assert.equal(pnrrChildcareData.projects.length, 3_841);
  assert.equal(pnrrChildcareMeta.coverage.locationRows, 3_842);
  assert.equal(pnrrChildcareMeta.coverage.tenderRows, 18_851);
  assert.equal(pnrrChildcareMeta.coverage.awardeeRows, 18_250);
  assert.equal(pnrrChildcareMeta.coverage.unmatchedAwardeeRows, 2);
  assert.equal(pnrrChildcareMeta.integrity.dataArtifact.bytes, 18_591_740);
  assert.match(pnrrChildcareMeta.integrity.dataArtifact.sha256, /^[a-f0-9]{64}$/);
  assert.ok(pnrrChildcareMeta.totals.pnrrFundingCents > 400_000_000_000);
});

test("exact CUP lookup returns one trace and missing CUP fails distinctly", () => {
  const project = pnrrChildcareData.projects[0];
  const result = queryPnrrChildcare({ cup: project.cup });
  assert.equal(result.pagination.total, 1);
  assert.equal(result.data[0].cup, project.cup);
  assert.throws(
    () => queryPnrrChildcare({ cup: "A00000000000000" }),
    (error) => error instanceof PnrrChildcareQueryError && error.code === "not_found",
  );
  assert.throws(() => queryPnrrChildcare({ cup: "bad" }), /15 caratteri/);
});

test("territorial and text filters stay bounded and inspect every project location", () => {
  const result = queryPnrrChildcare({ region: "Lazio", limit: 7 });
  assert.equal(result.pagination.returned, 7);
  assert.ok(result.pagination.total > 7);
  assert.ok(result.data.every((project) => project.locations.some((location) => location.region.toLocaleLowerCase("it-IT") === "lazio")));
  const project = pnrrChildcareData.projects.find((item) => item.implementer.name);
  const searched = queryPnrrChildcare({ query: project.implementer.name, limit: 100 });
  assert.ok(searched.data.some((item) => item.cup === project.cup));
  assert.throws(() => queryPnrrChildcare({ limit: 101 }), /limit/);
  assert.throws(() => queryPnrrChildcare({ cup: project.cup, region: "Lazio" }), /Con cup/);
});

test("awardees are attributed only through the full exact tender key", () => {
  let linked = 0;
  for (const project of pnrrChildcareData.projects) {
    for (const tender of project.tenders) linked += awardeesForTender(project, tender).length;
  }
  assert.equal(linked, pnrrChildcareMeta.coverage.awardeeRows - pnrrChildcareMeta.coverage.unmatchedAwardeeRows);
});
