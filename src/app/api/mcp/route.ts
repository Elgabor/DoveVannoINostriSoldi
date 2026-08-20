import { createMcpHandler } from "@modelcontextprotocol/server";
import { createDvnsMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_REQUEST_BYTES = 1_000_000;

function reportMcpError(error: Error) {
  if (error.message.startsWith("Rejected inbound request")) return;
  console.error("MCP request failed", error);
}

const handler = createMcpHandler(createDvnsMcpServer, {
  legacy: "stateless",
  onerror: reportMcpError,
});

function secureResponse(response: Response, request?: Request): Response {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (request) {
    const origin = request.headers.get("origin");
    const normalized = origin ? normalizedOrigin(origin) : null;
    if (normalized && allowedOrigins(request).has(normalized)) {
      response.headers.set("Access-Control-Allow-Origin", normalized);
      response.headers.append("Vary", "Origin");
    }
  }
  return response;
}

function normalizedOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function allowedOrigins(request: Request): Set<string> {
  const configured = (process.env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizedOrigin)
    .filter((value): value is string => value !== null);
  return new Set([new URL(request.url).origin, ...configured]);
}

function normalizedHost(value: string): string | null {
  const candidate = value.trim().toLocaleLowerCase("en-US").replace(/\.$/, "");
  if (!candidate || /[\s/@]/.test(candidate)) return null;
  return candidate;
}

function isLoopbackHost(value: string): boolean {
  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(value);
}

function allowedHosts(request: Request): Set<string> {
  const requestUrl = new URL(request.url);
  const configured = [
    ...(process.env.MCP_ALLOWED_HOSTS ?? "").split(","),
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.replace(/^https?:\/\//i, ""))
    .map(normalizedHost)
    .filter((value): value is string => value !== null);

  const allowed = new Set(configured);
  if (
    configured.length === 0 ||
    requestUrl.hostname === "localhost" ||
    requestUrl.hostname === "127.0.0.1" ||
    requestUrl.hostname === "[::1]"
  ) {
    allowed.add(requestUrl.host.toLocaleLowerCase("en-US"));
  }
  const requestHost = normalizedHost(request.headers.get("host") ?? "");
  if (
    requestHost &&
    isLoopbackHost(requestHost) &&
    isLoopbackHost(requestUrl.host.toLocaleLowerCase("en-US"))
  ) {
    allowed.add(requestHost);
  }
  return allowed;
}

function validateRequest(request: Request): Response | null {
  const host = normalizedHost(request.headers.get("host") ?? new URL(request.url).host);
  if (!host || !allowedHosts(request).has(host)) {
    return Response.json({ error: "Host non consentito" }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  const normalized = origin ? normalizedOrigin(origin) : null;
  if (origin && (!normalized || !allowedOrigins(request).has(normalized))) {
    return Response.json({ error: "Origin non consentita" }, { status: 403 });
  }
  const declaredLength = request.headers.get("content-length");
  const contentLength = declaredLength === null ? null : Number.parseInt(declaredLength, 10);
  if (contentLength !== null && Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "Richiesta troppo grande" }, { status: 413 });
  }
  return null;
}

async function requestWithBoundedBody(request: Request): Promise<Request | Response> {
  if (!request.body) return request;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel("MCP request body limit exceeded").catch(() => undefined);
      return Response.json({ error: "Richiesta troppo grande" }, { status: 413 });
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const headers = new Headers(request.headers);
  headers.set("Content-Length", String(body.byteLength));
  return new Request(request.url, {
    method: request.method,
    headers,
    body,
    signal: request.signal,
  });
}

export async function POST(request: Request) {
  const rejected = validateRequest(request);
  if (rejected) return secureResponse(rejected, request);
  let boundedRequest: Request | Response;
  try {
    boundedRequest = await requestWithBoundedBody(request);
  } catch {
    return secureResponse(Response.json(
      { error: "Richiesta interrotta o non leggibile" },
      { status: 400 },
    ), request);
  }
  if (boundedRequest instanceof Response) return secureResponse(boundedRequest, request);

  return secureResponse(await handler.fetch(boundedRequest), request);
}

export function OPTIONS(request: Request) {
  const rejected = validateRequest(request);
  if (rejected) return secureResponse(rejected, request);

  const response = new Response(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Accept, Content-Type, Last-Event-ID, MCP-Method, MCP-Name, MCP-Protocol-Version, MCP-Session-ID",
  );
  response.headers.set("Access-Control-Max-Age", "600");
  return secureResponse(response, request);
}
