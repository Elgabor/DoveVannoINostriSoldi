import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const { DATASET_IDS } = await import("../src/lib/mcp/catalog.ts");
const { relatedMcpServices } = await import("../src/lib/mcp/related-services.ts");

test("related MCP services are official, external and never implicit proxies", () => {
  assert.equal(new Set(relatedMcpServices.map((service) => service.id)).size, relatedMcpServices.length);
  assert.ok(relatedMcpServices.every((service) => !DATASET_IDS.includes(service.id)));

  const cruscotto = relatedMcpServices.find((service) => service.id === "cruscotto-italia-agid");
  assert.ok(cruscotto);
  assert.equal(cruscotto.status, "external");
  assert.equal(cruscotto.proxiedByDvns, false);
  assert.equal(cruscotto.endpoint, "https://cruscotto-italia-mcp.agid.workers.dev/mcp");
  assert.match(cruscotto.aboutUrl, /^https:\/\/cruscotto-italia\.dati\.gov\.it\//);
  assert.match(cruscotto.repositoryUrl, /^https:\/\/github\.com\/AgID\/cruscotto-italia/);
  assert.ok(cruscotto.preferredWorkflow.some((step) => step.includes("comune_kpi")));
  assert.ok(!Number.isNaN(Date.parse(cruscotto.lastVerifiedAt)));
});
