import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const { SSN_NATIONAL_HISTORY_YEARS, getSsnNationalHistory, nationalValuesFromRows } = await import(
  "../src/lib/ssn-national-history.ts"
);
const { ssnCceSnapshot } = await import("../src/lib/ssn-cce-snapshot.ts");
const { queryPublicDataset } = await import("../src/lib/mcp/datasets.ts");

test("SSN national history years are a verified, chronological 2012-2024 range", () => {
  assert.deepEqual(
    [...SSN_NATIONAL_HISTORY_YEARS],
    Array.from({ length: 13 }, (_, index) => 2012 + index),
  );
});

test(
  "SSN national history reconciles with the locked 2024 snapshot and is expressed in cents",
  // 13 sequential live OpenBDAP CSV fetches (one discovery call plus one per year); can take
  // a couple of minutes under retry per the openbdap source policy.
  { timeout: 300_000 },
  async () => {
    const history = await getSsnNationalHistory();
    assert.equal(history.years.length, 13);
    assert.deepEqual(history.years.map((entry) => entry.year), [...SSN_NATIONAL_HISTORY_YEARS]);

    const year2024 = history.years.find((entry) => entry.year === 2024);
    assert.ok(year2024);
    // Must match the independently locked, hash-verified 2024 snapshot exactly: same source,
    // same metrics, same unit (cents) — not a second, potentially drifting computation.
    assert.deepEqual(year2024.values, ssnCceSnapshot.national.values);

    // Values must be integers (cents), not floats with rounding artifacts from a naive
    // euro * 100 conversion.
    for (const entry of history.years) {
      for (const value of Object.values(entry.values)) {
        assert.ok(Number.isSafeInteger(value), `${entry.year}: ${value} non è un intero sicuro`);
        assert.ok(value > 0, `${entry.year}: valore non positivo`);
      }
    }

    // The known 2020-2021 rise in externally contracted healthcare work services should be
    // visible in the raw series (it is not asserted as caused by anything, only that the
    // adapter surfaces the real published numbers instead of a flattened trend).
    const byYear = new Map(history.years.map((entry) => [entry.year, entry.values]));
    assert.ok(byYear.get(2020).healthcareWorkServices > byYear.get(2019).healthcareWorkServices);
  },
);

function row(code, importo) {
  return {
    "Anno di Riferimento": "2024",
    "Codice Voce Contabile": code,
    "Descrizione Voce Contabile": code,
    "Data Aggiornamento": "01/01/2026",
    "Importo Totale": importo,
  };
}

const VALID_ROWS = [
  row("BZ9999", "100.00"),
  row("BA2080", "40.50"),
  row("BA1350", "1.23"),
  row("BA1750", "0.10"),
  row("BA0390", "50.00"),
];

test("nationalValuesFromRows parses the 5 required voice codes into exact cents", () => {
  const values = nationalValuesFromRows(VALID_ROWS, 2024);
  assert.deepEqual(values, {
    productionCosts: 10000,
    personnelCost: 4050,
    healthcareWorkServices: 123,
    nonHealthcareWorkServices: 10,
    purchasedServices: 5000,
  });
});

test("nationalValuesFromRows ignores voice codes it does not need", () => {
  const values = nationalValuesFromRows([...VALID_ROWS, row("AA0010", "999.99")], 2024);
  assert.equal(Object.keys(values).length, 5);
});

test("nationalValuesFromRows fails closed when a row's declared year does not match the requested year", () => {
  // Simulates a mislabeled or swapped package: the CSV's own year field disagrees with the
  // year this package was discovered under.
  assert.throws(() => nationalValuesFromRows(VALID_ROWS, 2023), /incoerente con il rilascio 2023/);
});

test("nationalValuesFromRows fails closed on a duplicate voice code instead of silently keeping one", () => {
  assert.throws(
    () => nationalValuesFromRows([...VALID_ROWS, row("BZ9999", "1.00")], 2024),
    /BZ9999 duplicata/,
  );
});

test("nationalValuesFromRows fails closed when a required voice code is missing", () => {
  const missingPersonnel = VALID_ROWS.filter((entry) => entry["Codice Voce Contabile"] !== "BA2080");
  assert.throws(() => nationalValuesFromRows(missingPersonnel, 2024), /BA2080 assente/);
});

test("nationalValuesFromRows rejects an amount with more than 2 decimal digits instead of truncating it", () => {
  const rows = VALID_ROWS.map((entry) =>
    entry["Codice Voce Contabile"] === "BZ9999" ? row("BZ9999", "100.005") : entry,
  );
  assert.throws(() => nationalValuesFromRows(rows, 2024), /precisione inattesa/);
});

test("openbdap_ssn_storico_nazionale MCP dataset rejects filters and stays within the response budget", async () => {
  await assert.rejects(
    queryPublicDataset({ dataset: "openbdap_ssn_storico_nazionale", year: 2024 }),
    /Filtri non supportati/,
  );
  const result = await queryPublicDataset({ dataset: "openbdap_ssn_storico_nazionale" });
  assert.equal(result.years.length, 13);
  assert.ok(JSON.stringify(result).length < 750 * 1024);
});
