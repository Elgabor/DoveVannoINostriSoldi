import { NextResponse } from "next/server";
import { getSourceHealthOverview } from "@/lib/data/source-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const observedAt = new Date().toISOString();
  const sources = await getSourceHealthOverview();

  return NextResponse.json({
    ok: true,
    observedAt,
    summary: {
      total: sources.length,
      active: sources.filter((source) => source.integration === "active").length,
      reachable: sources.filter((source) => source.reachability === "up").length,
      unreachable: sources.filter((source) => source.reachability === "down").length,
      notProbed: sources.filter((source) => source.reachability === "not-probed").length,
    },
    sources,
  });
}
