import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { italyRegionGeometry } from "../src/data/generated/italy-regions.ts";
import { REGION_NAME_BY_ISTAT_CODE } from "../src/lib/italy-regions.ts";

const snapshotUrl = new URL("../src/data/generated/siope-municipal.json", import.meta.url);

test("ISTAT geometry and SIOPE data cover the same 20 regions", async () => {
  const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8"));
  const geometryCodes = italyRegionGeometry.map((region) => region.code);
  const mappedNames = Object.values(REGION_NAME_BY_ISTAT_CODE);
  const snapshotNames = snapshot.regions.map((region) => region.region);

  assert.equal(italyRegionGeometry.length, 20);
  assert.equal(new Set(geometryCodes).size, 20);
  assert.deepEqual([...geometryCodes].sort(), Object.keys(REGION_NAME_BY_ISTAT_CODE).sort());
  assert.deepEqual([...snapshotNames].sort(), [...mappedNames].sort());
  assert.ok(
    italyRegionGeometry.every(
      (region) => region.name === REGION_NAME_BY_ISTAT_CODE[region.code],
    ),
  );
  assert.ok(italyRegionGeometry.every((region) => region.path.startsWith("M") && region.path.endsWith("Z")));
});
