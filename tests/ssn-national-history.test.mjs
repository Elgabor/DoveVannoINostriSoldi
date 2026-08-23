import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const { SSN_NATIONAL_HISTORY_YEARS, getSsnNationalHistory } = await import(
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

test("openbdap_ssn_storico_nazionale MCP dataset rejects filters and stays within the response budget", async () => {
  await assert.rejects(
    queryPublicDataset({ dataset: "openbdap_ssn_storico_nazionale", year: 2024 }),
    /Filtri non supportati/,
  );
  const result = await queryPublicDataset({ dataset: "openbdap_ssn_storico_nazionale" });
  assert.equal(result.years.length, 13);
  assert.ok(JSON.stringify(result).length < 750 * 1024);
});
