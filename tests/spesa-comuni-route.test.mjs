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
  assert.equal(payload.metricVersion, 1);
  assert.equal(payload.quantileConvention, "linear-interpolation-r7");
  assert.ok(payload.evaluatedMunicipalities > 0);
  assert.ok(Array.isArray(payload.outliers));
  assert.ok(payload.outliers.length > 0);
  assert.ok(payload.outliers.length <= payload.filters.limit);
  assert.match(payload.methodologyWarning, /non ha automaticamente sprechi/);
  assert.ok(typeof payload.source.owner === "string" && payload.source.owner.length > 0);
  assert.match(response.headers.get("cache-control"), /stale-while-revalidate/);
});

test("spesa-comuni route scopes every result field to the selected region", async () => {
  const filtered = GET(new NextRequest("https://example.test/api/controlli/spesa-comuni?regione=calabria&limit=3"));
  const payload = await filtered.json();

  assert.equal(payload.filters.region, "CALABRIA");
  assert.equal(payload.byRegion.length, 1);
  assert.equal(payload.byRegion[0].region, "CALABRIA");
  assert.equal(payload.evaluatedMunicipalities, payload.byRegion[0].evaluated);
  assert.equal(payload.excludedForDataQuality, payload.byRegion[0].excludedForDataQuality);
  assert.equal(payload.totalOutliers, payload.byRegion[0].above + payload.byRegion[0].below);
  assert.ok(payload.outliers.length <= 3);
  assert.ok(payload.outliers.every((item) => item.region === "CALABRIA"));
});

test("spesa-comuni route rejects unknown, malformed and duplicated filters", async () => {
  const urls = [
    "https://example.test/api/controlli/spesa-comuni?regione=Atlantide",
    "https://example.test/api/controlli/spesa-comuni?limit=3abc",
    "https://example.test/api/controlli/spesa-comuni?limit=501",
    "https://example.test/api/controlli/spesa-comuni?limit=2&limit=3",
    "https://example.test/api/controlli/spesa-comuni?ignora=1",
  ];

  for (const url of urls) {
    const response = GET(new NextRequest(url));
    const payload = await response.json();
    assert.equal(response.status, 400, url);
    assert.equal(payload.ok, false, url);
    assert.equal(payload.error, "invalid_query", url);
  }
});
