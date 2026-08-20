import assert from "node:assert/strict";
import test from "node:test";
import {
  auditMethodology,
  auditScenarios,
  auditSignals,
  availableAuditYears,
  centralScenarioBreakdown,
  getAuditSignalsForYear,
  getProcurementAvailability,
  procurementComparison,
  procurementComparisons,
} from "../src/lib/audit-data.ts";

test("audit signals preserve source, date and interpretation limits", () => {
  const officialHosts = new Set([
    "www.agenziaentrateriscossione.gov.it",
    "www.anticorruzione.it",
    "www.corteconti.it",
    "www.mef.gov.it",
    "www.senato.it",
  ]);
  assert.ok(auditSignals.length >= 6);
  for (const signal of auditSignals) {
    assert.match(signal.source.url, /^https:\/\//);
    assert.ok(officialHosts.has(new URL(signal.source.url).hostname), signal.source.url);
    assert.ok(signal.referenceDate.length >= 4);
    assert.ok(signal.caveat.length > 20);
    assert.equal(signal.additive, false);
    assert.equal(signal.verificationUse, "screening-only");
    assert.equal(signal.source.documentType, "official-report");
  }
  assert.ok(auditMethodology.aiUse.prohibited.some((item) => /sommare/.test(item)));
  assert.ok(auditMethodology.aiUse.prohibited.some((item) => /responsabilit/.test(item)));
  assert.ok(auditSignals.every((signal) => !signal.source.url.includes("mirapa.it")));
  assert.ok(auditSignals.every((signal) => !signal.source.url.includes("consregsardegna.it")));
  const taxExpenditures = auditSignals.find((signal) => signal.id === "tax-expenditures");
  assert.ok(taxExpenditures?.plainMeaning.includes("297"));
});

test("procurement series keeps the same scope across annual reports", () => {
  assert.deepEqual(Object.keys(procurementComparisons), ["2023", "2024", "2025"]);
  assert.equal(procurementComparison, procurementComparisons[2025]);
  for (const comparison of Object.values(procurementComparisons)) {
    assert.equal(comparison.subject, "Affidamenti diretti");
    assert.ok(comparison.byNumber > comparison.byValue);
    assert.ok(Number.isInteger(comparison.procedureCount));
    assert.ok(comparison.procedureCount > 250_000);
    assert.ok(comparison.totalValueBillion > 250);
    assert.match(comparison.sourceUrl, /^https:\/\/www\.anticorruzione\.it\//);
    assert.match(comparison.sourcePublishedAt, /^20\d{2}-\d{2}-\d{2}$/);
  }
  assert.equal(procurementComparisons[2023].byNumber, 49.6);
  assert.equal(procurementComparisons[2023].byValue, 6.5);
  assert.equal(procurementComparisons[2024].byNumber, 54.1);
  assert.equal(procurementComparisons[2024].byValue, 6);
  assert.equal(procurementComparisons[2025].byNumber, 55.3);
  assert.equal(procurementComparisons[2025].byValue, 5.1);
  for (const comparison of Object.values(procurementComparisons)) {
    const signal = auditSignals.find(
      (candidate) => candidate.id === `procurement-direct-awards-${comparison.year}`,
    );
    assert.equal(signal?.source.url, comparison.sourceUrl);
    assert.equal(signal?.value, comparison.byNumber);
    assert.ok(signal?.caveat.includes(comparison.byValue.toFixed(1).replace(".", ",")));
  }

  const reducedCompetition = auditSignals.find((signal) => signal.id === "procurement-low-competition-value");
  assert.equal(reducedCompetition?.source.url, procurementComparisons[2025].sourceUrl);
  assert.ok(reducedCompetition?.plainMeaning.includes("19,3%"));
  const reducedCompetitionShare =
    ((reducedCompetition?.value ?? 0) / procurementComparisons[2025].totalValueBillion) * 100;
  assert.equal(Number(reducedCompetitionShare.toFixed(1)), 19.3);
  assert.equal(getProcurementAvailability(2025).status, "available");
  assert.equal(getProcurementAvailability(2026).status, "not-yet-published");
});

test("every supported audit year has at least one dated signal", () => {
  assert.deepEqual(availableAuditYears, [2026, 2025, 2024, 2023]);
  for (const year of availableAuditYears) {
    const signals = getAuditSignalsForYear(year);
    assert.ok(signals.length > 0, `missing signals for ${year}`);
    assert.ok(signals.every((signal) => signal.referenceDate.startsWith(String(year))));
  }
});

test("central scenario equals its visible components and scenarios stay ordered", () => {
  const central = auditScenarios.find((scenario) => scenario.id === "central");
  assert.ok(central);
  const components = centralScenarioBreakdown.reduce((sum, item) => sum + item.value, 0);
  assert.ok(Math.abs(components - central.annualBillion) < 0.000001);
  assert.deepEqual(
    auditScenarios.map((scenario) => scenario.annualBillion),
    [...auditScenarios].map((scenario) => scenario.annualBillion).sort((a, b) => a - b),
  );
});
