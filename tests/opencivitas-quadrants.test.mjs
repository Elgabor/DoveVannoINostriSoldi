import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertOpenCivitasSnapshot } from "../src/lib/data/opencivitas-contract.ts";
import {
  OPEN_CIVITAS_QUADRANT_THRESHOLD,
  summarizeOpenCivitasQuadrants,
} from "../src/lib/opencivitas-quadrants.ts";

const snapshotPath = new URL("../src/data/generated/opencivitas-2022.json", import.meta.url);

function snapshot() {
  return assertOpenCivitasSnapshot(JSON.parse(readFileSync(snapshotPath, "utf8")));
}

test("OpenCivitas quadrants use the published levels and reconcile the complete universe", () => {
  const data = snapshot();
  const result = summarizeOpenCivitasQuadrants(data.municipalities);

  assert.equal(OPEN_CIVITAS_QUADRANT_THRESHOLD, 6);
  assert.equal(result.coveredMunicipalities, 6_557);
  assert.equal(result.completeMunicipalities, 6_547);
  assert.equal(result.excludedMunicipalities, 10);
  assert.deepEqual(
    result.quadrants.map(({ key, municipalities }) => [key, municipalities]),
    [
      ["low-low", 2_778],
      ["low-high", 1_994],
      ["high-low", 779],
      ["high-high", 996],
    ],
  );

  for (const aggregate of [...result.quadrants, result.completeTotals]) {
    assert.equal(
      aggregate.differenceCents,
      aggregate.historicalSpendingCents - aggregate.standardSpendingCents,
    );
  }
  assert.equal(
    result.quadrants.reduce((sum, quadrant) => sum + quadrant.historicalSpendingCents, 0),
    result.completeTotals.historicalSpendingCents,
  );
  assert.equal(
    result.quadrants.reduce((sum, quadrant) => sum + quadrant.standardSpendingCents, 0),
    result.completeTotals.standardSpendingCents,
  );
  assert.equal(
    result.quadrants.reduce((sum, quadrant) => sum + quadrant.differenceCents, 0),
    result.completeTotals.differenceCents,
  );
});

test("OpenCivitas quadrant view exposes direct labels, exact table semantics and caveat", () => {
  const page = readFileSync(new URL("../src/app/territori/confronto/page.tsx", import.meta.url), "utf8");
  const component = readFileSync(
    new URL("../src/app/territori/confronto/opencivitas-quadrants.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/app/territori/confronto/opencivitas-quadrants.module.css", import.meta.url),
    "utf8",
  );

  assert.match(page, /<OpenCivitasQuadrants/);
  assert.match(component, /<figure/);
  assert.match(component, /Spesa 0–5 · servizi 0–5/);
  assert.match(component, /Spesa 0–5 · servizi 6–10/);
  assert.match(component, /Spesa 6–10 · servizi 0–5/);
  assert.match(component, /Spesa 6–10 · servizi 6–10/);
  assert.match(component, /<caption>/);
  assert.match(component, /scope="col"/);
  assert.match(component, /scope="row"/);
  assert.match(component, /role="region"/);
  assert.match(component, /Scorri orizzontalmente/);
  assert.match(component, /periodo \{referenceYear\}/);
  assert.match(component, /non dimostra efficienza, spreco, risparmio/);
  assert.match(style, /overflow-x: auto/);
  assert.match(style, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(style, /@media \(max-width: 520px\)/);
  assert.doesNotMatch(component, /efficienza[^\n]*(?:misura|indice)/i);
  assert.doesNotMatch(component, /risparmio[^\n]*(?:stimato|ottenuto|generato)/i);
});

test("quadrant aggregation fails closed when an amount no longer reconciles", () => {
  const data = snapshot();
  const broken = structuredClone(data.municipalities);
  broken[0].differenceCents += 1;
  assert.throws(() => summarizeOpenCivitasQuadrants(broken), /differenza non riconciliata/);
});
