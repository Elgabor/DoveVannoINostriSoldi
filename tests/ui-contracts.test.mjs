import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fiscalPage = await readFile(
  new URL("../src/app/territori/fisco/page.tsx", import.meta.url),
  "utf8",
);
const fiscalCss = await readFile(
  new URL("../src/app/territori/fisco/fisco.module.css", import.meta.url),
  "utf8",
);
const invalidityPage = await readFile(
  new URL("../src/app/spese/invalidita/page.tsx", import.meta.url),
  "utf8",
);
const invalidityCss = await readFile(
  new URL("../src/app/spese/invalidita/invalidita.module.css", import.meta.url),
  "utf8",
);
const controlsPage = await readFile(new URL("../src/app/controlli/page.tsx", import.meta.url), "utf8");
const controlsCss = await readFile(new URL("../src/app/controlli/controlli.module.css", import.meta.url), "utf8");

test("the fiscal formula has one explicit screen-reader relationship", () => {
  const accessibleFormula =
    "Il saldo contabile territoriale è uguale alle entrate territorializzate meno le spese territorializzate.";
  assert.equal(fiscalPage.split(accessibleFormula).length - 1, 1);
  assert.match(fiscalPage, /className=\{styles\.formulaVisual\} aria-hidden="true"/);
  assert.doesNotMatch(fiscalPage, /className=\{styles\.formula\} aria-label=/);
  assert.match(fiscalCss, /@media \(max-width: 420px\)[\s\S]*?\.formulaVisual \{ display: grid;/);
  assert.match(fiscalCss, /\.formulaVisual strong \{ grid-column: 1 \/ -1; \}/);
});

test("the three INPS headline statistics use a complete responsive grid", () => {
  assert.match(invalidityPage, /className=\{`stat-strip \$\{styles\.stats\}`\}/);
  assert.match(invalidityCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(invalidityCss, /> div:nth-child\(-n \+ 2\) \{\s*border-bottom: 0;/);
  assert.match(invalidityCss, /@media \(max-width: 620px\)[\s\S]*?\.stats:global\(\.stat-strip\) \{ grid-template-columns: 1fr; \}/);
  assert.match(invalidityCss, /@media \(max-width: 620px\)[\s\S]*?> div:nth-child\(-n \+ 2\) \{[\s\S]*?border-bottom: 1px solid/);
});

test("municipal screening is marked derived, bounded and dimension-aware", () => {
  assert.match(controlsPage, /Screening derivato sui Comuni/);
  assert.match(controlsPage, /non è una classifica di/);
  assert.match(controlsPage, /Popolazione implicita/);
  assert.match(controlsPage, /sensitivityByPopulationBand/);
  assert.match(controlsPage, /OpenCivitas/);
  assert.match(controlsCss, /\.outlierTable table \{[\s\S]*?min-width: 900px;/);
});
