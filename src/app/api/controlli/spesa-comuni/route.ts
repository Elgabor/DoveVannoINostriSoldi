import type { NextRequest } from "next/server";
import { computeSpendingOutliers } from "@/lib/anomaly-indicators";
import { openCivitasSnapshot } from "@/lib/opencivitas-snapshot";

export const dynamic = "force-dynamic";

function integerParam(value: string | null, fallback: number, minimum: number, maximum: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function GET(request: NextRequest) {
  const limit = integerParam(request.nextUrl.searchParams.get("limit"), 50, 1, 500);
  const region = request.nextUrl.searchParams.get("regione")?.trim().toLocaleUpperCase("it-IT");

  const summary = computeSpendingOutliers(openCivitasSnapshot.municipalities);
  const outliers = region
    ? summary.outliers.filter((item) => item.region === region)
    : summary.outliers;

  return Response.json(
    {
      ok: true,
      source: {
        name: "OpenCivitas · spesa storica e fabbisogno standard dei Comuni",
        owner: openCivitasSnapshot.source.owner,
        datasetUrl: openCivitasSnapshot.source.datasetUrl,
        license: openCivitasSnapshot.source.license,
        referenceYear: openCivitasSnapshot.referenceYear,
        territorialScope: openCivitasSnapshot.coverage.territorialScope,
      },
      method: summary.method,
      fenceMultiplier: summary.fenceMultiplier,
      filters: { region: region ?? null, limit },
      evaluatedMunicipalities: summary.evaluatedMunicipalities,
      excludedForDataQuality: summary.excludedForDataQuality,
      totalOutliers: outliers.length,
      outliers: outliers.slice(0, limit),
      byRegion: summary.byRegion,
      methodologyWarning: summary.methodologyWarning,
    },
    {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    },
  );
}
