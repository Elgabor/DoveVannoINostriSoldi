import type { NextRequest } from "next/server";
import type { SsnCceMetricId } from "@/lib/data/ssn-cce-contract";
import { querySsnCce, querySsnCceMetric, SsnCceQueryError } from "@/lib/ssn-cce-snapshot";

const ALLOWED_PARAMS = new Set(["anno", "regione", "code", "metrica", "limit", "offset"]);

function integerParam(request: NextRequest, key: string, minimum: number, maximum: number): number | undefined {
  const value = request.nextUrl.searchParams.get(key);
  if (value === null) return undefined;
  if (!/^\d+$/.test(value)) throw new SsnCceQueryError("invalid_query", `Il parametro ${key} deve essere un intero.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new SsnCceQueryError("invalid_query", `Il parametro ${key} è fuori intervallo.`);
  }
  return parsed;
}

export function GET(request: NextRequest) {
  try {
    for (const key of request.nextUrl.searchParams.keys()) {
      if (!ALLOWED_PARAMS.has(key)) throw new SsnCceQueryError("invalid_query", `Parametro non supportato: ${key}.`);
    }
    const year = integerParam(request, "anno", 2000, 2100);
    const limit = integerParam(request, "limit", 1, 100);
    const offset = integerParam(request, "offset", 0, 100_000);
    const region = request.nextUrl.searchParams.get("regione") ?? undefined;
    const code = request.nextUrl.searchParams.get("code") ?? undefined;
    const metric = request.nextUrl.searchParams.get("metrica") as SsnCceMetricId | null;
    const payload = metric
      ? querySsnCceMetric({ year, region, code, limit, offset, metric })
      : querySsnCce({ year, region, code, limit, offset });
    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const status = error instanceof SsnCceQueryError && error.code === "not_found" ? 404 : 400;
    return Response.json(
      { error: error instanceof Error ? error.message : "Richiesta non valida." },
      { status },
    );
  }
}
