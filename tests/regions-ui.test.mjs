import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../src/app/regioni/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/app/regioni/regioni.module.css", import.meta.url), "utf8");
const treemap = fs.readFileSync(new URL("../src/app/regioni/region-title-treemap.tsx", import.meta.url), "utf8");
const titles = fs.readFileSync(new URL("../src/lib/siope-titles.ts", import.meta.url), "utf8");

test("Regions page uses only the verified Istat regional account", () => {
  assert.match(page, /istatRegionsSnapshot/);
  assert.match(page, /22/);
  assert.match(page, /contabilità è quella\s*\n?\s*regionale/);
  assert.doesNotMatch(page, /getRegionalFiscal|OpenCivitas/);
});

test("Regions page explains spending destinations in plain language", () => {
  assert.match(page, /searchParams: Promise/);
  assert.match(page, /name="ente"/);
  assert.match(page, /Importi assoluti di/);
  assert.match(page, /Su che cosa vanno i soldi/);
  assert.match(page, /siopeTitleCopy\(title\.code, "regione"\)/);
  assert.match(page, /copy\.explanation/);
  assert.match(page, /A che cosa serve/);
  assert.match(treemap, /siopeTitleCopy\(title\.code, "regione"\)/);
  assert.match(treemap, /point\.explanation/);
  assert.match(treemap, /tooltipExplain/);
  assert.doesNotMatch(treemap, /title\.label\)|Titolo 7/);
  assert.match(titles, /Soldi di passaggio/);
  assert.match(titles, /la Regione riceve e passa ad altri enti o soggetti/);
  assert.doesNotMatch(page, /spreco|corruzione|illecito/i);
  assert.doesNotMatch(`${page}\n${treemap}`, /—|–/);
});

test("Regional treemap is additive and exact tables remain internally scrollable", () => {
  assert.match(treemap, /commitmentsCents \/ entity\.commitmentsCents/);
  assert.match(treemap, /aria-describedby="regioni-treemap-caption"/);
  assert.match(treemap, /institutionalCategoryColor/);
  assert.match(treemap, /Passaci sopra per leggere a che/);
  assert.match(css, /min-width: 680px/);
  assert.match(css, /min-width: 760px/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.doesNotMatch(`${css}\n${treemap}`, /border-radius|box-shadow|linear-gradient|transition:\s*all/);
});
