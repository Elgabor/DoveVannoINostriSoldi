import { NextResponse } from "next/server";
import { getPublicWorksByCup } from "@/lib/bdap-public-works";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cup = new URL(request.url).searchParams.get("cup");
  if (!cup) {
    return NextResponse.json(
      { ok: false, error: "Specificare il parametro CUP" },
      { status: 400 },
    );
  }

  try {
    const result = await getPublicWorksByCup(cup);
    return NextResponse.json(
      { ok: true, ...result },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    const invalidInput = message.startsWith("CUP non valido");
    return NextResponse.json(
      { ok: false, error: message },
      { status: invalidInput ? 400 : 502 },
    );
  }
}
