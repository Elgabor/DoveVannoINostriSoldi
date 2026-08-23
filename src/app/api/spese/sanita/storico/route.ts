import { NextResponse } from "next/server";
import { getSsnNationalHistory } from "@/lib/ssn-national-history";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const history = await getSsnNationalHistory();

    return NextResponse.json(
      {
        ok: true,
        source: {
          owner: history.source.owner,
          platform: "OpenBDAP",
          landingUrl: history.source.landingUrl,
          cadence: "consuntivo annuale",
        },
        caveat:
          "Solo livello nazionale: il dettaglio regionale e per ente resta disponibile soltanto per il 2024 in /api/spese/sanita. Voci di competenza economica, non pagamenti di cassa; non identificano gettonisti, cooperative o organico e non permettono classifiche di efficienza tra anni o Regioni.",
        years: history.years,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "RGS / OpenBDAP",
        observedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Errore sconosciuto",
      },
      { status: 503 },
    );
  }
}
