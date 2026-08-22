import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../src/app/ministeri/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/app/ministeri/ministeri.module.css", import.meta.url), "utf8");

test("Ministries page uses the locked RGS rendiconto without mixing institutions", () => {
  assert.match(page, /rgsMinistriesSnapshot/);
  assert.match(page, /rendiconto dello Stato 2025/);
  assert.match(page, /Non\s*\n?\s*includiamo Palazzo Chigi, Camera, Senato o Regioni/);
  assert.doesNotMatch(page, /getStateSpendingSnapshot|pcmFinancial|CPT/);
});

test("Ministries page keeps CP, RS and CS separate with exact values", () => {
  assert.match(page, /Impegni di competenza/);
  assert.match(page, /Pagamenti di cassa/);
  assert.match(page, /Residui al 31 dicembre/);
  assert.match(page, /non formano un totale/);
  assert.match(page, /Quota impegni CP/);
  assert.match(page, /Scorri la tabella verso destra/);
  assert.match(page, /sourceRecordId/);
  assert.doesNotMatch(page, /spreco|corruzione|illecito/i);
});

test("Ministries exact table remains internally scrollable", () => {
  assert.match(css, /min-width: 1160px/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.doesNotMatch(css, /border-radius|box-shadow|linear-gradient|transition:\s*all/);
});
