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

function secureResponse(response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
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

function validateRequest(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins(request).has(origin)) {
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
  if (rejected) return secureResponse(rejected);
  const boundedRequest = await requestWithBoundedBody(request);
  if (boundedRequest instanceof Response) return secureResponse(boundedRequest);

  return secureResponse(await handler.fetch(boundedRequest));
}
