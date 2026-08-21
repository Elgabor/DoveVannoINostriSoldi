import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import "./helpers/register-ts-alias.mjs";

const { GET } = await import("../src/app/api/controlli/spesa-comuni/route.ts");

test("spesa-comuni route returns outliers with methodology and provenance", async () => {
  const response = GET(new NextRequest("https://example.test/api/controlli/spesa-comuni"));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.method, "tukey-iqr");
  assert.ok(payload.evaluatedMunicipalities > 0);
  assert.ok(Array.isArray(payload.outliers));
  assert.ok(payload.outliers.length > 0);
  assert.ok(payload.outliers.length <= payload.filters.limit);
  assert.match(payload.methodologyWarning, /non ha automaticamente sprechi/);
  assert.ok(typeof payload.source.owner === "string" && payload.source.owner.length > 0);
  assert.match(response.headers.get("cache-control"), /stale-while-revalidate/);
});

test("spesa-comuni route filters by region and respects a capped limit", async () => {
  const filtered = GET(new NextRequest("https://example.test/api/controlli/spesa-comuni?regione=calabria&limit=3"));
  const payload = await filtered.json();

  assert.equal(payload.filters.region, "CALABRIA");
  assert.ok(payload.outliers.length <= 3);
  assert.ok(payload.outliers.every((item) => item.region === "CALABRIA"));
});
