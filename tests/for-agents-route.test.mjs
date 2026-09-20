import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const { GET: getIndex } = await import("../src/app/for-agents/route.ts");
const { GET: getDataset } = await import("../src/app/for-agents/datasets/[dataset]/route.ts");

const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
const PLAIN_CONTENT_TYPE = "text/plain; charset=utf-8";

function datasetContext(dataset) {
  return { params: Promise.resolve({ dataset }) };
}

test("for-agents index returns Markdown 200 with public cache and nosniff", async () => {
  const response = getIndex();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), MARKDOWN_CONTENT_TYPE);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("cache-control"), /public/);
  const body = await response.text();
  assert.match(body, /# DVNS · indice per agenti/);
});

test("for-agents IRPEF dataset returns Markdown 200 with public cache and nosniff", async () => {
  const response = await getDataset(new Request("https://example.test/for-agents/datasets/mef_irpef_comunale"), datasetContext("mef_irpef_comunale"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), MARKDOWN_CONTENT_TYPE);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("cache-control"), /public/);
  const body = await response.text();
  assert.match(body, /Redditi e IRPEF comunale MEF/);
  assert.match(body, /API HTTP esistente/);
  assert.match(body, /Esempio HTTP/);
});

test("for-agents unknown dataset returns 404 text/plain with no-store and nosniff", async () => {
  const response = await getDataset(new Request("https://example.test/for-agents/datasets/unknown"), datasetContext("unknown"));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), PLAIN_CONTENT_TYPE);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.text();
  assert.match(body, /Scheda non disponibile/);
});

test("for-agents configured but inactive dataset returns 404 text/plain", async () => {
  const response = await getDataset(
    new Request("https://example.test/for-agents/datasets/opencup_progetto"),
    datasetContext("opencup_progetto"),
  );
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), PLAIN_CONTENT_TYPE);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
