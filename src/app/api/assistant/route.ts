import {
  ASSISTANT_MAX_PROMPT_CHARS,
  assistantFailure,
  parseAssistantRequest,
} from "@/lib/assistant/contracts";
import { executeAssistant } from "@/lib/assistant/executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MAX_REQUEST_BYTES = 16_384;
const NO_STORE = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function isLoopbackHost(host: string): boolean {
  const hostname = host.replace(/^\[|\](?::\d+)?$|:\d+$/gu, "").toLocaleLowerCase("en-US");
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function rejectRequest(request: Request): Response | null {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/json") {
    return json({ ok: false, error: "Content-Type non supportato" }, 415);
  }

  const requestUrl = new URL(request.url);
  const requestHost = (request.headers.get("host") ?? requestUrl.host).trim().toLocaleLowerCase("en-US");
  if (!requestHost || requestHost !== requestUrl.host.toLocaleLowerCase("en-US")) {
    return json({ ok: false, error: "Host non consentito" }, 403);
  }

  const origin = request.headers.get("origin");
  let originUrl: URL;
  try {
    originUrl = new URL(origin ?? "");
  } catch {
    return json({ ok: false, error: "Origin non consentita" }, 403);
  }
  const allowedProtocol = originUrl.protocol === "https:" ||
    (originUrl.protocol === "http:" && isLoopbackHost(requestHost));
  if (originUrl.host.toLocaleLowerCase("en-US") !== requestHost || !allowedProtocol) {
    return json({ ok: false, error: "Origin non consentita" }, 403);
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/u.test(declaredLength)) {
      return json({ ok: false, error: "Content-Length non valido" }, 400);
    }
    if (Number(declaredLength) > MAX_REQUEST_BYTES) {
      return json({ ok: false, error: "Richiesta troppo grande" }, 413);
    }
  }

  return null;
}

async function boundedBody(request: Request): Promise<string | Response> {
  if (!request.body) return json({ ok: false, error: "Corpo richiesta assente" }, 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel("Assistant request body limit exceeded").catch(() => undefined);
      return json({ ok: false, error: "Richiesta troppo grande" }, 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return json({ ok: false, error: "Corpo UTF-8 non valido" }, 400);
  }
}

export async function POST(request: Request) {
  const rejected = rejectRequest(request);
  if (rejected) return rejected;

  let rawBody: string | Response;
  try {
    rawBody = await boundedBody(request);
  } catch {
    return json({ ok: false, error: "Richiesta interrotta o non leggibile" }, 400);
  }
  if (rawBody instanceof Response) return rawBody;

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "Richiesta JSON non valida" }, 400);
  }

  try {
    const parsed = parseAssistantRequest(payload);
    const response = await executeAssistant(parsed, { signal: request.signal });
    return json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Richiesta non valida";
    return json(assistantFailure(
      "invalid_request",
      "invalid_request",
      message || `La domanda deve essere testuale e non superare ${ASSISTANT_MAX_PROMPT_CHARS} caratteri.`,
    ), 400);
  }
}
