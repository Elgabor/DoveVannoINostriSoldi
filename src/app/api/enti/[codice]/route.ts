import { NextResponse } from "next/server";
import {
  getIpaEntityByCode,
  IPA_ENTI_DATASET_URL,
  IPA_ENTI_RESOURCE_ID,
  IPA_LICENSE,
} from "@/lib/ipa";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ codice: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { codice } = await context.params;
  const normalized = decodeURIComponent(codice).trim();

  if (!normalized) {
    return NextResponse.json({ ok: false, error: "Codice IPA mancante" }, { status: 400 });
  }

  try {
    const entity = await getIpaEntityByCode(normalized);

    if (!entity) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ente non trovato nel dataset IPA",
          codiceIpa: normalized,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        source: {
          name: "Indice PA (IPA) · dataset Enti",
          owner: "Agenzia per l'Italia Digitale",
          datasetUrl: IPA_ENTI_DATASET_URL,
          resourceId: IPA_ENTI_RESOURCE_ID,
          license: IPA_LICENSE,
          cadence: "giornaliera",
        },
        observedAt: new Date().toISOString(),
        record: entity,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "Indice PA (IPA)",
        observedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Errore sconosciuto",
      },
      { status: 503 },
    );
  }
}
