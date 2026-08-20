import assert from "node:assert/strict";
import test from "node:test";
import {
  auditMethodology,
  auditScenarios,
  auditSignals,
  centralScenarioBreakdown,
  procurementComparison,
} from "../src/lib/audit-data.ts";

test("audit signals preserve source, date and interpretation limits", () => {
  assert.ok(auditSignals.length >= 6);
  for (const signal of auditSignals) {
    assert.match(signal.source.url, /^https:\/\//);
    assert.ok(signal.referenceDate.length >= 4);
    assert.ok(signal.caveat.length > 20);
    assert.equal(signal.additive, false);
    assert.equal(signal.verificationUse, "screening-only");
    assert.equal(signal.source.documentType, "official-report");
  }
  assert.ok(auditMethodology.aiUse.prohibited.some((item) => /sommare/.test(item)));
  assert.ok(auditMethodology.aiUse.prohibited.some((item) => /responsabilit/.test(item)));
  assert.ok(auditSignals.every((signal) => !signal.source.url.includes("mirapa.it")));
});

test("procurement comparison reconciles exposed value", () => {
  const expected = procurementComparison.totalValueBillion * procurementComparison.byValue / 100;
  assert.ok(Math.abs(expected - procurementComparison.exposedValueBillion) < 0.001);
  assert.ok(procurementComparison.byNumber > procurementComparison.byValue);
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
