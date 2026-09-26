import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const { POST } = await import("../src/app/api/partecipazione/proposte/route.ts");

const ENDPOINT = "http://localhost:3105/api/partecipazione/proposte";
const PROJECT = "https://abcdefghijklmnopqrst.supabase.co/";
const RECEIPT = "c39e0ed9-4f1e-4a8d-befc-33b93ca43780";

function payload(overrides = {}) {
  return {
    clientKey: randomUUID(),
    entity: { ipaCode: "c_e897", taxCode: "00189800204" },
    category: "office",
    description: "La data di nomina indicata nella scheda richiede una correzione.",
    period: "giugno 2026",
    sourceUrl: "https://www.comune.mantova.it/it/news/atto",
    sourcePassage: "Nomina con decorrenza 8 giugno 2026.",
    contactEmail: "cittadina@example.org",
    ...overrides,
  };
}

function request(body, headers = {}) {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3105", Host: "localhost:3105", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function configure() {
  process.env.PARTICIPATION_INTAKE_ENABLED = "1";
  process.env.PARTICIPATION_SUPABASE_URL = PROJECT;
  process.env.PARTICIPATION_SUPABASE_SECRET_KEY = `sb_secret_${"a".repeat(24)}`;
  process.env.PARTICIPATION_NETWORK_SECRET = "test-network-secret-with-at-least-32-chars";
}

function unconfigure() {
  delete process.env.PARTICIPATION_INTAKE_ENABLED;
  delete process.env.PARTICIPATION_SUPABASE_URL;
  delete process.env.PARTICIPATION_SUPABASE_SECRET_KEY;
  delete process.env.PARTICIPATION_NETWORK_SECRET;
}

function interceptStore(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    assert.equal(url.href, `${PROJECT}rest/v1/rpc/participation_submit`);
    calls.push({ url: url.href, init, body: JSON.parse(init.body) });
    return handler(calls.at(-1));
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("gate spento: nessun invio, nessun contenuto nella risposta e nessun fetch", async () => {
  unconfigure();
  const store = interceptStore(() => { throw new Error("fetch inatteso"); });
  try {
    const response = await POST(request(payload({ description: "TESTO_PRIVATO" })));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.text();
    assert.ok(!body.includes("TESTO_PRIVATO"));
    assert.ok(!body.includes("receipt"));
    assert.equal(store.calls.length, 0);
  } finally { store.restore(); unconfigure(); }
});

test("senza configurazione privata risponde 503 senza fallback pubblico", async () => {
  unconfigure();
  process.env.PARTICIPATION_INTAKE_ENABLED = "1";
  const store = interceptStore(() => { throw new Error("fetch inatteso"); });
  try {
    const response = await POST(request(payload()));
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.ok(!body.includes("github.com"));
    assert.ok(!body.includes("receipt"));
    assert.equal(store.calls.length, 0);
  } finally { store.restore(); unconfigure(); }
});

test("non usa il progetto Supabase già dedicato alla quota dell'assistente", async () => {
  configure();
  process.env.ASSISTANT_SUPABASE_URL = PROJECT.slice(0, -1);
  const store = interceptStore(() => { throw new Error("fetch inatteso"); });
  try {
    const response = await POST(request(payload()));
    assert.equal(response.status, 503);
    assert.equal(store.calls.length, 0);
  } finally {
    store.restore();
    delete process.env.ASSISTANT_SUPABASE_URL;
    unconfigure();
  }
});

test("rifiuta origine, tipo, dimensione, ente e categoria prima del provider", async () => {
  configure();
  const store = interceptStore(() => { throw new Error("fetch inatteso"); });
  try {
    assert.equal((await POST(request(payload(), { Origin: "https://other.test" }))).status, 403);
    assert.equal((await POST(request(payload(), { "Content-Type": "text/plain" }))).status, 415);
    assert.equal((await POST(request(payload(), { "Content-Length": "999999" }))).status, 413);
    assert.equal((await POST(request(payload({ entity: { ipaCode: "c_f205", taxCode: "00189800204" } })))).status, 400);
    assert.equal((await POST(request(payload({ category: "judicial" })))).status, 400);
    assert.equal(store.calls.length, 0);
  } finally { store.restore(); unconfigure(); }
});

test("mappa ricevuta e stato duplicato restituiti dalla RPC senza esporre testo", async () => {
  configure();
  let count = 0;
  const store = interceptStore(() => {
    count += 1;
    return Response.json({ receipt: RECEIPT, duplicate: count > 1 });
  });
  try {
    const draft = payload();
    const first = await POST(request(draft));
    const second = await POST(request(draft));
    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.deepEqual(await first.json(), { ok: true, receipt: RECEIPT, duplicate: false });
    assert.deepEqual(await second.json(), { ok: true, receipt: RECEIPT, duplicate: true });
    assert.equal(store.calls.length, 2);
    for (const call of store.calls) {
      assert.equal(call.init.method, "POST");
      assert.equal(call.body.p_client_key, draft.clientKey);
      assert.equal(call.body.p_description, draft.description);
      assert.match(call.body.p_network_hash, /^[a-f0-9]{64}$/u);
      assert.match(call.body.p_payload_hash, /^[a-f0-9]{64}$/u);
      assert.ok(!JSON.stringify(call.init.headers).includes(draft.description));
    }
    assert.equal(store.calls[0].body.p_payload_hash, store.calls[1].body.p_payload_hash);
  } finally { store.restore(); unconfigure(); }
});

test("errore o risposta malformata del provider non inventano ricevute né espongono il testo", async () => {
  configure();
  const priorVercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  let call = 0;
  const store = interceptStore(() => {
    call += 1;
    return call === 1
      ? Response.json({ receipt: "invalid", duplicate: false })
      : Response.json({ message: "TESTO_PRIVATO" }, { status: 500 });
  });
  try {
    for (let index = 0; index < 2; index += 1) {
      const response = await POST(request(payload({ description: "TESTO_PRIVATO" }), {
        "x-vercel-forwarded-for": `203.0.113.${index + 1}`,
      }));
      assert.equal(response.status, 503);
      const body = await response.text();
      assert.ok(!body.includes("TESTO_PRIVATO"));
      assert.ok(!body.includes("receipt"));
    }
    assert.equal(store.calls.length, 2);
  } finally {
    store.restore();
    if (priorVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = priorVercel;
    unconfigure();
  }
});
