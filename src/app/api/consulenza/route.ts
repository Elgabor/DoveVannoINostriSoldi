import { parseLead, sendLeadEmail } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Richiesta non valida" }, 400);
  }

  const parsed = parseLead(payload);
  if (parsed.status === "discarded") {
    return json({ ok: true });
  }
  if (parsed.status === "invalid") {
    return json({ ok: false, error: parsed.error }, 400);
  }

  try {
    const sent = await sendLeadEmail(parsed.lead, new Date());
    if (sent.ok) return json({ ok: true });
    if (sent.status === 503) {
      return json({ ok: false, error: "Invio non configurato sul deployment" }, 503);
    }

    console.error("Resend ha rifiutato la lead", sent.status, sent.detail);
    return json({ ok: false, error: "Non siamo riusciti a inviare la richiesta" }, 502);
  } catch (error) {
    console.error("Invio lead non riuscito", error);
    return json({ ok: false, error: "Non siamo riusciti a inviare la richiesta" }, 502);
  }
}
