import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("PNRR catalog is server-rendered, searchable, and semantically cautious", async () => {
  const page = await source("../src/app/coesione/asili/page.tsx");
  assert.doesNotMatch(page, /^["']use client["'];/m);
  assert.match(page, /queryPnrrChildcare/);
  assert.match(page, /finanziamento PNRR registrato/i);
  assert.match(page, /non un giudizio di merito/i);
  assert.match(page, /non contiene i pagamenti ReGiS/i);
  assert.equal(page.match(/<h1\b/g)?.length, 1);
  assert.match(page, /aria-label="Pagine dei risultati"/);
});

test("project trace labels observed, linked, derived and missing evidence", async () => {
  const page = await source("../src/app/progetti/[cup]/page.tsx");
  for (const evidence of ["osservato", "collegato", "derivato", "mancante"]) {
    assert.match(page, new RegExp(`kind=\\"${evidence}\\"`));
  }
  assert.match(page, /Pagamenti ReGiS/);
  assert.match(page, /non vengono attribuite a una procedura per approssimazione/i);
  assert.match(page, /Promise\.race/);
  assert.match(page, /3_500/);
  assert.equal(page.match(/<h1\b/g)?.length, 1);
});

test("PNRR layouts collapse every major grid on narrow screens", async () => {
  const [catalogCss, projectCss] = await Promise.all([
    source("../src/app/coesione/asili/pnrr-asili.module.css"),
    source("../src/app/progetti/[cup]/project.module.css"),
  ]);
  assert.match(catalogCss, /@media\(max-width:650px\)[\s\S]*?\.grid\{grid-template-columns:1fr\}/);
  assert.match(projectCss, /@media\(max-width:620px\)[\s\S]*?\.flowGrid\{grid-template-columns:1fr\}/);
  assert.match(projectCss, /overflow-wrap:anywhere/);
});
