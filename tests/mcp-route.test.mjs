import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const { POST } = await import("../src/app/api/mcp/route.ts");

const requestBody = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" });

function request(headers = {}, body = requestBody) {
  return new Request("https://example.test/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body,
  });
}

test("MCP endpoint rejects an untrusted browser origin", async () => {
  const response = await POST(request({ Origin: "https://attacker.test" }));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("MCP endpoint rejects an oversized declared body", async () => {
  const response = await POST(request({ "Content-Length": "1000001" }));
  assert.equal(response.status, 413);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("MCP endpoint enforces the body limit when Content-Length is absent", async () => {
  const response = await POST(request({}, "x".repeat(1_000_001)));
  assert.equal(response.status, 413);
});

test("MCP endpoint exposes the read-only tools over Streamable HTTP", async () => {
  const response = await POST(request({ Origin: "https://example.test" }));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /list_datasets/);
  assert.match(body, /query_dataset/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("MCP endpoint exposes the machine-readable dataset catalog resource", async () => {
  const response = await POST(request({}, JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "resources/list",
  })));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /dvns:\/\/datasets/);
  assert.match(body, /dataset-catalog/);
});

test("MCP endpoint supports the modern 2026 protocol envelope", async () => {
  const meta = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {},
  };
  const response = await POST(request(
    { "MCP-Protocol-Version": "2026-07-28", "MCP-Method": "tools/list" },
    JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
      params: { _meta: meta },
    }),
  ));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /"resultType":"complete"/);
  assert.match(body, /list_datasets/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("MCP endpoint executes a modern tool call with mirrored request headers", async () => {
  const meta = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {},
  };
  const response = await POST(request(
    {
      "MCP-Protocol-Version": "2026-07-28",
      "MCP-Method": "tools/call",
      "MCP-Name": "query_dataset",
    },
    JSON.stringify({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        _meta: meta,
        name: "query_dataset",
        arguments: { dataset: "registro_fonti", query: "SIOPE" },
      },
    }),
  ));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /"resultType":"complete"/);
  assert.match(body, /SIOPE \/ SIOPE\+/);
});

test("MCP endpoint reads the catalog resource with the modern protocol", async () => {
  const meta = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {},
  };
  const response = await POST(request(
    {
      "MCP-Protocol-Version": "2026-07-28",
      "MCP-Method": "resources/read",
      "MCP-Name": "dvns://datasets",
    },
    JSON.stringify({
      jsonrpc: "2.0",
      id: 6,
      method: "resources/read",
      params: { _meta: meta, uri: "dvns://datasets" },
    }),
  ));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /"resultType":"complete"/);
  assert.match(body, /siope_comuni/);
});

test("MCP endpoint rejects a malformed modern envelope", async () => {
  const response = await POST(request(
    { "MCP-Protocol-Version": "2026-07-28", "MCP-Method": "tools/list" },
    JSON.stringify({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/list",
      params: {
        _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" },
      },
    }),
  ));
  assert.equal(response.status, 400);
  assert.match(await response.text(), /clientCapabilities/);
});

test("MCP endpoint keeps stateless requests isolated under concurrency", async () => {
  const responses = await Promise.all(
    Array.from({ length: 20 }, () => POST(request())),
  );
  assert.ok(responses.every((response) => response.status === 200));
  const bodies = await Promise.all(responses.map((response) => response.text()));
  assert.ok(bodies.every((body) => body.includes("query_dataset")));
});

test("MCP tool input schema rejects out-of-range pagination", async () => {
  const response = await POST(request({}, JSON.stringify({
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: {
      name: "query_dataset",
      arguments: { dataset: "opencivitas_fabbisogni", limit: 101 },
    },
  })));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /Invalid arguments/);
  assert.match(body, /Too big/);
});
