import assert from "node:assert/strict";
import test from "node:test";
import data from "../src/data/generated/rgs-ministries-2025.data.json" with { type: "json" };
import metadata from "../src/data/generated/rgs-ministries-2025.meta.json" with { type: "json" };
import { validateRgsMinistriesSnapshot } from "../src/lib/data/rgs-ministries-contract.ts";

test("RGS Ministries account preserves frames, coverage and public provenance", () => {
  const snapshot = validateRgsMinistriesSnapshot(data, metadata);
  assert.equal(snapshot.data.referenceYear, 2025);
  assert.equal(snapshot.data.ministries.length, 15);
  assert.equal(snapshot.data.coverage.rowsReconciled, 5_395);
  assert.equal(snapshot.data.totals.commitmentsCpCents, 117_092_823_506_300);
  assert.equal(snapshot.data.totals.paymentsCashCsCents, 115_416_545_988_384);
  assert.equal(snapshot.data.totals.residualsEndCents, 19_719_858_419_419);
  assert.equal(snapshot.metadata.source.licenseName, "CC BY 3.0");
});

test("RGS Ministries account fails closed on frame and mission drift", () => {
  assert.throws(
    () => validateRgsMinistriesSnapshot({
      ...data,
      totals: { ...data.totals, paymentsCashCsCents: data.totals.paymentsCashCsCents + 1 },
    }, metadata),
    /totali Ministeri non riconciliati|pagamenti CS non riconciliati/,
  );
  const first = data.ministries[0];
  assert.throws(
    () => validateRgsMinistriesSnapshot({
      ...data,
      ministries: [{
        ...first,
        missions: [{ ...first.missions[0], commitmentsCpCents: first.missions[0].commitmentsCpCents + 1 }, ...first.missions.slice(1)],
      }, ...data.ministries.slice(1)],
    }, metadata),
    /missioni non riconciliate/,
  );
});
