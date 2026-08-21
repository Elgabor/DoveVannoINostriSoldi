import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const notices = await readFile(new URL("../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");

test("embedded official inputs have third-party notices", () => {
  for (const publisher of [
    "Autorità Nazionale Anticorruzione",
    "Istituto Nazionale della Previdenza Sociale",
    "Sistema Conti Pubblici Territoriali",
    "Istituto Nazionale di Statistica",
    "Italia Domani",
  ]) {
    assert.match(notices, new RegExp(publisher));
  }
  assert.match(notices, /resource-specific terms/);
  assert.match(notices, /document-specific reuse terms/);
});
