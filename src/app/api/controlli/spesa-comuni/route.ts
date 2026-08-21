import type { NextRequest } from "next/server";
import { openCivitasSnapshot } from "@/lib/opencivitas-snapshot";
import { getOpenCivitasSpendingOutliers } from "@/lib/opencivitas-outliers";

export const dynamic = "force-dynamic";

const ALLOWED_PARAMETERS = new Set(["limit", "regione"]);

class InvalidQueryError extends Error {}

function singleParameter(request: NextRequest, name: string): string | null {
  const values = request.nextUrl.searchParams.getAll(name);
  if (values.length > 1) throw new InvalidQueryError(`${name}: parametro duplicato`);
  return values[0] ?? null;
}

function limitParameter(value: string | null): number {
  if (value === null) return 50;
  if (!/^[1-9]\d*$/.test(value)) throw new InvalidQueryError("limit: intero positivo atteso");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 500) {
    throw new InvalidQueryError("limit: valore ammesso da 1 a 500");
  }
  return parsed;
}

function invalidRequest(message: string) {
  return Response.json(
    { ok: false, error: "invalid_query", message },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export function GET(request: NextRequest) {
  try {
    for (const name of request.nextUrl.searchParams.keys()) {
      if (!ALLOWED_PARAMETERS.has(name)) {
        throw new InvalidQueryError(`${name}: parametro non supportato`);
      }
    }

    const limit = limitParameter(singleParameter(request, "limit"));
    const rawRegion = singleParameter(request, "regione");
    const region = rawRegion?.trim().toLocaleUpperCase("it-IT") ?? null;
    if (rawRegion !== null && !region) {
      throw new InvalidQueryError("regione: testo non vuoto atteso");
    }

    const summary = getOpenCivitasSpendingOutliers(region);
    if (!summary) throw new InvalidQueryError(`regione: territorio non disponibile (${region})`);

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
        metricVersion: summary.metricVersion,
        measure: summary.measure,
        method: summary.method,
        quantileConvention: summary.quantileConvention,
        fenceMultiplier: summary.fenceMultiplier,
        minimumRegionSize: summary.minimumRegionSize,
        filters: { region, limit },
        evaluatedMunicipalities: summary.evaluatedMunicipalities,
        excludedForDataQuality: summary.excludedForDataQuality,
        totalOutliers: summary.outliers.length,
        outliers: summary.outliers.slice(0, limit),
        byRegion: summary.byRegion,
        methodologyWarning: summary.methodologyWarning,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
      },
    );
  } catch (error) {
    if (error instanceof InvalidQueryError) return invalidRequest(error.message);
    throw error;
  }
}
