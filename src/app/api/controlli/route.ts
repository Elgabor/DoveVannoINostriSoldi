import { NextRequest, NextResponse } from "next/server";
import {
  auditMethodology,
  auditReviewedAt,
  auditScenarios,
  auditSignals,
  centralScenarioBreakdown,
  getProcurementComparisonForYear,
  procurementComparison,
  procurementComparisons,
} from "@/lib/audit-data";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const area = request.nextUrl.searchParams.get("area")?.trim().toLocaleLowerCase("it-IT");
  const rawYear = request.nextUrl.searchParams.get("anno")?.trim();
  if (rawYear && !/^\d{4}$/.test(rawYear)) {
    return NextResponse.json(
      { ok: false, error: "L'anno richiesto non è valido." },
      { status: 400 },
    );
  }

  const signals = auditSignals.filter((signal) => {
    if (area && signal.area.toLocaleLowerCase("it-IT") !== area) return false;
    if (rawYear && !signal.referenceDate.startsWith(rawYear)) return false;
    return true;
  });

  return NextResponse.json(
    {
      ok: true,
      reviewedAt: auditReviewedAt,
      filters: { area: area ?? null, year: rawYear ?? null },
      signals,
      procurementComparison: rawYear
        ? getProcurementComparisonForYear(Number.parseInt(rawYear, 10))
        : procurementComparison,
      procurementComparisons,
      policyScenarios: {
        items: auditScenarios,
        centralBreakdown: centralScenarioBreakdown,
        meaning: auditMethodology.scenarioMeaning,
      },
      methodology: auditMethodology,
    },
    { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
  );
}
