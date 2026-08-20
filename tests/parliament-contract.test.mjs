import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../src/data/generated/parliament-overview.json" with { type: "json" };
import { assertParliamentSnapshot } from "../src/lib/data/parliament-contract.ts";

test("Parliament snapshot keeps accounts, budgets and official provenance separate", () => {
  const parsed = assertParliamentSnapshot(snapshot);
  const camera = parsed.chambers.find((chamber) => chamber.id === "camera");
  const senato = parsed.chambers.find((chamber) => chamber.id === "senato");

  assert.equal(camera.structuredStatus, "structured-summary");
  assert.equal(senato.structuredStatus, "source-documents-only");
  assert.ok(camera.statements.some((statement) => statement.kind === "account"));
  assert.ok(camera.statements.some((statement) => statement.kind === "budget"));
  assert.ok(senato.statements.every((statement) => statement.values === undefined));
  assert.match(parsed.methodology.comparability, /non vengono sommati/i);
});

test("Parliament snapshot rejects unofficial documents and false structured Senate values", () => {
  const unofficial = structuredClone(snapshot);
  unofficial.chambers[0].statements[0].documentUrl = "https://example.com/bilancio.pdf";
  assert.throws(() => assertParliamentSnapshot(unofficial), /ufficiale/);

  const invented = structuredClone(snapshot);
  invented.chambers[1].statements[0].values = { total: 1 };
  assert.throws(() => assertParliamentSnapshot(invented), /fonte documentale/);
});
