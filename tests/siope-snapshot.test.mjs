import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const snapshotUrl = new URL("../src/data/generated/siope-municipal.json", import.meta.url);

async function loadSnapshot() {
  return JSON.parse(await readFile(snapshotUrl, "utf8"));
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function assertMoneyClose(actual, expected, tolerance = 0.25) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("SIOPE snapshot exposes a complete national municipal aggregation", async () => {
  const data = await loadSnapshot();

  assert.equal(data.schemaVersion, 1);
  assert.equal(data.scope, "municipalities");
  assert.equal(data.regions.length, 20);
  assert.ok(data.coverage.activeSiopeMunicipalities > 7_000);
  assert.ok(data.coverage.withMovements > 7_000);
  assert.ok(data.coverage.withMovements <= data.coverage.activeSiopeMunicipalities);
  assert.equal(data.coverage.malformedRows, 0);
  assert.ok(data.source.siopeMovementsLastModified);
  assert.ok(data.source.siopeRegistryLastModified);
  assert.ok(data.source.ipaLastModified);
});

test("monthly flows, regional totals and headline total reconcile", async () => {
  const data = await loadSnapshot();
  const monthlyTotal = sum(data.monthly.map((point) => point.flow));
  const regionalTotal = sum(data.regions.map((region) => region.value));
  const lastCumulative = data.monthly.at(-1)?.cumulative;

  assertMoneyClose(monthlyTotal, data.totalPaid);
  assertMoneyClose(regionalTotal, data.totalPaid);
  assertMoneyClose(lastCumulative, data.totalPaid);
  assert.equal(data.latestMonth, Math.max(...data.monthly.map((point) => point.month)));
});

test("regional and municipal rankings are sorted and numerically sane", async () => {
  const data = await loadSnapshot();

  for (let index = 1; index < data.regions.length; index += 1) {
    assert.ok(data.regions[index - 1].value >= data.regions[index].value);
  }

  for (let index = 1; index < data.topMunicipalities.length; index += 1) {
    assert.ok(
      data.topMunicipalities[index - 1].value >= data.topMunicipalities[index].value,
    );
  }

  for (const region of data.regions) {
    assert.ok(region.value >= 0);
    assert.ok(region.municipalities > 0);
    if (region.perCapita !== null) assert.ok(region.perCapita >= 0);
  }
});
