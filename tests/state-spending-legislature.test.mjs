import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const { LEGISLATURES, getLegislatureSpendingCycles } = await import(
  "../src/lib/state-spending-legislature.ts"
);
const { queryPublicDataset } = await import("../src/lib/mcp/datasets.ts");

test("legislature dates are chronological and complete legislatures have a known end", () => {
  for (let index = 1; index < LEGISLATURES.length; index += 1) {
    const previous = LEGISLATURES[index - 1];
    const current = LEGISLATURES[index];
    assert.ok(
      new Date(previous.electionDate).getTime() < new Date(current.electionDate).getTime(),
      `${previous.number} -> ${current.number} deve essere in ordine cronologico`,
    );
  }
  const ongoing = LEGISLATURES.filter((legislature) => legislature.endDate === null);
  assert.equal(ongoing.length, 1, "una sola legislatura può essere in corso");
  assert.equal(ongoing[0].number, LEGISLATURES.at(-1).number);
});

test(
  "state spending legislature cycles reconcile with live OpenBDAP consuntivo and flag COVID years without asserting causality",
  // Seven sequential live OpenBDAP discovery+fetch calls (2014-2017, 2019-2021); each can take
  // up to ~30s under retry per the openbdap source policy (15s timeout, 1 retry), so this needs
  // real headroom rather than the 120s default.
  { timeout: 300_000 },
  async () => {
    const cycles = await getLegislatureSpendingCycles();
    assert.equal(cycles.length, LEGISLATURES.length);

    const seventeenth = cycles.find((cycle) => cycle.legislature.number === "XVII");
    assert.ok(seventeenth);
    assert.deepEqual(
      seventeenth.years.map((entry) => entry.year),
      [2014, 2015, 2016, 2017],
    );
    assert.equal(seventeenth.preElectionYear.year, 2017);
    assert.ok(seventeenth.years.every((entry) => entry.totalPaid > 0));
    assert.ok(
      seventeenth.years.every((entry) => entry.extraordinaryContext === null),
      "il 2014-2017 non deve avere un contesto straordinario dichiarato",
    );

    const eighteenth = cycles.find((cycle) => cycle.legislature.number === "XVIII");
    assert.ok(eighteenth);
    assert.deepEqual(
      eighteenth.years.map((entry) => entry.year),
      [2019, 2020, 2021],
    );
    assert.equal(eighteenth.preElectionYear.year, 2021);
    // The pre-election year for XVIII is a COVID year: the module must say so explicitly
    // instead of silently folding it into "otherYearsAverage" as if it were ordinary.
    assert.match(eighteenth.preElectionYear.extraordinaryContext ?? "", /COVID/);
    assert.match(eighteenth.preElectionYear.extraordinaryContext ?? "", /non (è|e) isolat/i);

    const nineteenth = cycles.find((cycle) => cycle.legislature.number === "XIX");
    assert.ok(nineteenth);
    assert.deepEqual(nineteenth.years, []);
    assert.equal(nineteenth.preElectionYear, null);
    assert.equal(nineteenth.otherYearsAverage, null);
    assert.equal(nineteenth.differenceFromAverage, null);
  },
);

test("openbdap_spesa_legislature MCP dataset rejects any filter and exposes the same cycles", async () => {
  await assert.rejects(
    queryPublicDataset({ dataset: "openbdap_spesa_legislature", year: 2024 }),
    /Filtri non supportati/,
  );
  const result = await queryPublicDataset({ dataset: "openbdap_spesa_legislature" });
  assert.equal(result.cycles.length, LEGISLATURES.length);
  assert.ok(JSON.stringify(result).length < 750 * 1024);
});
