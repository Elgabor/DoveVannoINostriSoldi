import { NextResponse } from "next/server";
import { siopeMunicipalSnapshot } from "@/lib/siope-snapshot";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(siopeMunicipalSnapshot, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "X-Data-Source": "SIOPE+IPA",
      "X-Data-Period": `${siopeMunicipalSnapshot.year}-${String(siopeMunicipalSnapshot.latestMonth).padStart(2, "0")}`,
    },
  });
}
