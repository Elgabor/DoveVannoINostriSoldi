import { jsonResponse, readBoundedBody, rejectPublicPost } from "@/lib/http/public-post-guard";
import { getMunicipalOfficesForEntity } from "@/lib/municipal-offices";
import { privateIntakeConfiguration } from "@/lib/participation/intake-gate";
import { submitPrivateDraft } from "@/lib/participation/private-store";
import { parseParticipationDraft, PARTICIPATION_LIMITS } from "@/lib/participation/submission-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const GUARD = { maxRequestBytes: PARTICIPATION_LIMITS.requestBytesMax } as const;
const unavailable = () => jsonResponse({ ok: false, code: "unavailable", message: "Invio privato non disponibile" }, 503);

/** No form or storage is live until the owner explicitly enables this gate. */
export async function POST(request: Request) {
  if (!privateIntakeConfiguration()) return unavailable();
  const rejected = rejectPublicPost(request, GUARD);
  if (rejected) return rejected;

  let rawBody: string | Response;
  try { rawBody = await readBoundedBody(request, GUARD); }
  catch { return jsonResponse({ ok: false, code: "invalid_request" }, 400); }
  if (rawBody instanceof Response) return rawBody;

  let payload: unknown;
  try { payload = JSON.parse(rawBody); }
  catch { return jsonResponse({ ok: false, code: "invalid_request" }, 400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ ok: false, code: "invalid_request" }, 400);
  }
  const entity = (payload as Record<string, unknown>).entity;
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) {
    return jsonResponse({ ok: false, code: "invalid_request" }, 400);
  }
  const candidate = entity as Record<string, unknown>;
  if (typeof candidate.ipaCode !== "string" || typeof candidate.taxCode !== "string") {
    return jsonResponse({ ok: false, code: "invalid_request" }, 400);
  }
  const target = getMunicipalOfficesForEntity(candidate.ipaCode, candidate.taxCode);
  if (target.status !== "available") return jsonResponse({ ok: false, code: "out_of_scope" }, 400);
  const parsed = parseParticipationDraft(payload, target.snapshot.municipality);
  if (!parsed.ok) return jsonResponse({ ok: false, code: "invalid_request", message: parsed.message }, 400);

  try {
    const stored = await submitPrivateDraft(parsed.value, request);
    return jsonResponse({ ok: true, receipt: stored.receipt, duplicate: stored.duplicate }, stored.duplicate ? 200 : 201);
  } catch {
    return unavailable();
  }
}
