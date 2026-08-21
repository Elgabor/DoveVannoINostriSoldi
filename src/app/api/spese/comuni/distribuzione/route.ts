import type { NextRequest } from "next/server";
import {
  availableSiopeYears,
  getSiopeMunicipalSnapshot,
} from "@/lib/siope-snapshot";

export const dynamic = "force-dynamic";

const cacheHeaders = {
  "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
};

const noStoreHeaders = { "Cache-Control": "no-store" };
const allowedParameters = new Set(["anno"]);

export function GET(request: NextRequest) {
  for (const name of request.nextUrl.searchParams.keys()) {
    if (!allowedParameters.has(name)) {
      return Response.json(
        { ok: false, error: `${name}: parametro non supportato` },
        { status: 400, headers: noStoreHeaders },
      );
    }
  }
  const yearValues = request.nextUrl.searchParams.getAll("anno");
  if (yearValues.length > 1) {
    return Response.json(
      { ok: false, error: "anno: parametro duplicato" },
      { status: 400, headers: noStoreHeaders },
    );
  }
  const rawYear = yearValues[0]?.trim();
  if (rawYear !== undefined && !/^\d{4}$/.test(rawYear)) {
    return Response.json(
      {
        ok: false,
        error: "Il parametro anno deve essere un intero a quattro cifre.",
        availableYears: availableSiopeYears,
      },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const year = rawYear === undefined ? availableSiopeYears[0] : Number(rawYear);
  if (!availableSiopeYears.includes(year)) {
    return Response.json(
      {
        ok: false,
        error: `Anno SIOPE non disponibile. Anni validi: ${availableSiopeYears.join(", ")}.`,
        availableYears: availableSiopeYears,
      },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const snapshot = getSiopeMunicipalSnapshot(year);
  const distribution = snapshot.distribution;

  return Response.json(
    {
      ok: true,
      dataset: "siope_comuni",
      year: snapshot.year,
      available: true,
      availability: "verified_full_raw_refresh",
      period: distribution.period,
      distribution,
      snapshotCoverage: snapshot.coverage,
      source: snapshot.source,
      limitations: [
        "La distribuzione è pubblicata soltanto quando l'ETL ha elaborato tutti i movimenti raw verificati degli enti riconosciuti come Comuni dall'anagrafica SIOPE nel periodo.",
        "Il totale nazionale include i Comuni senza Regione IPA; le fasce includono soltanto quelli con popolazione valida. Gli aggregati regionali li escludono e la copertura ne dichiara conteggi e importi.",
        "Le liste dei primi 100 Comuni non sono un sostituto della distribuzione completa.",
        "Le quote di cassa non misurano efficienza, qualità, spreco o causalità.",
      ],
    },
    { headers: cacheHeaders },
  );
}
