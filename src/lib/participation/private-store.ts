import "server-only";

import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { isLoopbackHost } from "@/lib/http/public-post-guard";
import { SlidingWindowLimiter } from "@/lib/report/rate-limit";
import type { ParticipationDraft } from "./submission-contract";

const RPC = "rest/v1/rpc/participation_submit";
const perNetwork = new SlidingWindowLimiter({ windowMs: 10 * 60_000, max: 3 });
const perInstance = new SlidingWindowLimiter({ windowMs: 10 * 60_000, max: 30 });

export class ParticipationStoreUnavailable extends Error {
  constructor() { super("participation_store_unavailable"); }
}

function configuration() {
  const endpoint = process.env.PARTICIPATION_SUPABASE_URL ?? "";
  const token = process.env.PARTICIPATION_SUPABASE_SECRET_KEY ?? "";
  const networkSecret = process.env.PARTICIPATION_NETWORK_SECRET ?? "";
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new ParticipationStoreUnavailable(); }
  let assistantHost: string | null = null;
  try { assistantHost = new URL(process.env.ASSISTANT_SUPABASE_URL ?? "").hostname; }
  catch { /* The assistant project may be unconfigured in this environment. */ }
  if (url.protocol !== "https:" || !/^[a-z0-9]{20}\.supabase\.co$/u.test(url.hostname) ||
      url.port || url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      url.hostname === assistantHost ||
      !/^sb_secret_[A-Za-z0-9_-]{20,}$/u.test(token) || networkSecret.length < 32) {
    throw new ParticipationStoreUnavailable();
  }
  return { endpoint: url.href, token, networkSecret };
}

function networkHash(request: Request, secret: string): string {
  const local = !process.env.VERCEL && isLoopbackHost(new URL(request.url).host);
  // On Vercel this header is supplied by the trusted ingress. Never use an
  // arbitrary X-Forwarded-For header for a private-submission quota.
  const address = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.split(",", 1)[0]?.trim()
    : local ? "127.0.0.1" : null;
  if (!address || !isIP(address)) throw new ParticipationStoreUnavailable();
  const day = new Date().toISOString().slice(0, 10);
  return createHmac("sha256", secret).update(`${day}:${address}`).digest("hex");
}

function payloadHash(draft: ParticipationDraft): string {
  return createHash("sha256").update(JSON.stringify(draft)).digest("hex");
}

async function readResponse(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.ok || !response.body) throw new ParticipationStoreUnavailable();
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  let body = "";
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      signal.throwIfAborted();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 1_024) throw new ParticipationStoreUnavailable();
      body += decoder.decode(next.value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally {
    signal.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => undefined);
  }
}

/** The database RPC must commit the draft and idempotency key atomically. */
export async function submitPrivateDraft(draft: ParticipationDraft, request: Request) {
  const config = configuration();
  const network = networkHash(request, config.networkSecret);
  const now = Date.now();
  if (!perNetwork.consume(network, now) || !perInstance.consume("instance", now)) {
    throw new ParticipationStoreUnavailable();
  }
  const scope = process.env.VERCEL_ENV === "production" ? "production" : process.env.VERCEL ? "preview" : "local";
  const body = {
    p_scope: scope,
    p_client_key: draft.clientKey,
    p_entity_ipa: draft.entity.ipaCode,
    p_entity_tax: draft.entity.taxCode,
    p_category: draft.category,
    p_description: draft.description,
    p_period: draft.period,
    p_source_url: draft.sourceUrl,
    p_source_passage: draft.sourcePassage,
    p_contact_email: draft.contactEmail ?? null,
    p_payload_hash: payloadHash(draft),
    p_network_hash: network,
  };
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(3_000)]);
  try {
    signal.throwIfAborted();
    const response = await fetch(new URL(RPC, config.endpoint).href, {
      method: "POST",
      headers: { apikey: config.token, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
      redirect: "error",
      credentials: "omit",
    });
    const result = await readResponse(response, signal);
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new ParticipationStoreUnavailable();
    const value = result as Record<string, unknown>;
    if (typeof value.receipt !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value.receipt) ||
        typeof value.duplicate !== "boolean") throw new ParticipationStoreUnavailable();
    return { receipt: value.receipt, duplicate: value.duplicate } as const;
  } catch {
    throw new ParticipationStoreUnavailable();
  }
}
