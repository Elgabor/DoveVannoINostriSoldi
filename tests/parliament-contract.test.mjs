import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../src/data/generated/parliament-overview.json" with { type: "json" };
import { assertParliamentSnapshot } from "../src/lib/data/parliament-contract.ts";

test("Parliament snapshot keeps accounts, budgets and official provenance separate", () => {
  const parsed = assertParliamentSnapshot(snapshot);
  const camera = parsed.chambers.find((chamber) => chamber.id === "camera");

  assert.equal(camera.structuredStatus, "structured-summary");
  assert.ok(camera.statements.some((statement) => statement.kind === "account"));
  assert.ok(camera.statements.some((statement) => statement.kind === "budget"));
  assert.ok(
    parsed.chambers.every((chamber) =>
      chamber.statements.every(
        (statement) => statement.values || statement.categories || statement.highlights,
      ),
    ),
  );
  assert.match(parsed.methodology.comparability, /non vengono sommati/i);
});

test("Parliament snapshot rejects unofficial and document-only entries", () => {
  const unofficial = structuredClone(snapshot);
  unofficial.chambers[0].statements[0].documentUrl = "https://example.com/bilancio.pdf";
  assert.throws(() => assertParliamentSnapshot(unofficial), /ufficiale/);

  const documentOnly = structuredClone(snapshot);
  delete documentOnly.chambers[0].statements[0].values;
  delete documentOnly.chambers[0].statements[0].categories;
  assert.throws(() => assertParliamentSnapshot(documentOnly), /valori strutturati/);

  const sourceOnly = structuredClone(snapshot);
  sourceOnly.chambers[0].structuredStatus = "source-documents-only";
  assert.throws(() => assertParliamentSnapshot(sourceOnly), /soltanto dati strutturati/);

  const emptyValues = structuredClone(snapshot);
  emptyValues.chambers[0].statements[0].values = {};
  emptyValues.chambers[0].statements[0].categories = [];
  assert.throws(() => assertParliamentSnapshot(emptyValues), /valori strutturati/);
});
