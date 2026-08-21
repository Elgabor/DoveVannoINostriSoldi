import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const { latestDataBySlug } = await import("../src/lib/source-latest-data.ts");

test("annual CPT coverage remains a period instead of an invented date", () => {
  assert.deepEqual(latestDataBySlug.cpt, { kind: "period", label: "2023" });
  assert.notEqual(latestDataBySlug.cpt, null);
  assert.deepEqual(latestDataBySlug.anac, { kind: "period", label: "2025" });
  assert.deepEqual(latestDataBySlug.consulenti, { kind: "period", label: "2026 · parziale" });
  assert.deepEqual(latestDataBySlug.camera, { kind: "period", label: "2026" });
  assert.deepEqual(latestDataBySlug.inps, {
    kind: "period",
    label: "spesa 2025 · territori 2024",
  });
});
