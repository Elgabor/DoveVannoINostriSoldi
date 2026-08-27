import { NextResponse } from "next/server";
import { getLegislatureSpendingCycles } from "@/lib/state-spending-legislature";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const cycles = await getLegislatureSpendingCycles({ signal: request.signal });

    return NextResponse.json(
      {
        ok: true,
        source: {
          spending: {
            owner: "Ragioneria Generale dello Stato",
            platform: "OpenBDAP",
            cadence: "consuntivo annuale",
          },
          elections: {
            owner: "Camera dei Deputati / Ministero dell'Interno",
            cadence: "una tantum, per legislatura",
          },
        },
        methodology:
          "Confronto puramente descrittivo tra l'anno pre-elettorale e la media degli altri anni completi della stessa legislatura. Non è un test di significatività statistica, non implica causalità o intento elettorale e riguarda solo la spesa statale nazionale.",
        cycles,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
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
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
