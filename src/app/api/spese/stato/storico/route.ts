import { NextResponse } from "next/server";
import { getStateSpendingHistory } from "@/lib/bdap-history";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const history = await getStateSpendingHistory();

    return NextResponse.json(
      {
        ok: true,
        source: {
          owner: "Ragioneria Generale dello Stato",
          platform: "OpenBDAP",
          semantics: "cumulative-from-january",
        },
        ...history,
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
      { status: 503 },
    );
  }
}
