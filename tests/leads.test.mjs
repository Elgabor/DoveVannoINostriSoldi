import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const TEST_INBOX = "inbox@example.com";

const {
  formatLeadEmail,
  leadEmailSubject,
  leadFromAddress,
  leadInbox,
  parseLead,
  sendLeadEmail,
} = await import("../src/lib/leads.ts");
const { POST } = await import("../src/app/api/consulenza/route.ts");

const validLead = {
  name: "Anna Rossi",
  email: "anna.rossi@example.com",
  organization: "Comune di Esempio",
  organizationType: "pa",
  role: "Dirigente finanziario",
  topic: "lettura",
  budget: "da_5k_a_15k",
  message: "Vorremmo una lettura dei pagamenti comunali 2025 e un confronto con i capoluoghi vicini.",
  consent: true,
  submissionId: "b5b05a55-22df-4dc1-a6a4-175cd1b8490f",
};

function request(body, headers = {}) {
  return new Request("https://example.test/api/consulenza", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.test",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test("parseLead accepts a complete consulting request", () => {
  const parsed = parseLead(validLead);
  assert.equal(parsed.status, "valid");
  if (parsed.status !== "valid") return;
  assert.equal(parsed.lead.organizationType, "pa");
  assert.equal(parsed.lead.topic, "lettura");
  assert.equal(parsed.lead.budget, "da_5k_a_15k");
  assert.equal(parsed.lead.organizationWebsite, undefined);
  assert.match(formatLeadEmail(parsed.lead, new Date("2026-08-21T12:00:00Z")), /Comune di Esempio/);
  assert.match(formatLeadEmail(parsed.lead, new Date("2026-08-21T12:00:00Z")), /Da 5\.000 a 15\.000 euro/);
  assert.match(formatLeadEmail(parsed.lead, new Date("2026-08-21T12:00:00Z")), /Sito web: non indicato/);
  assert.equal(leadEmailSubject(parsed.lead), "Richiesta consulenza: Comune di Esempio");
});

test("parseLead rejects a missing consent and a short message", () => {
  const withoutConsent = parseLead({ ...validLead, consent: false });
  assert.equal(withoutConsent.status, "invalid");
  if (withoutConsent.status === "invalid") {
    assert.match(withoutConsent.error, /consenso/i);
  }

  const short = parseLead({ ...validLead, message: "Ciao" });
  assert.equal(short.status, "invalid");
  if (short.status === "invalid") {
    assert.match(short.error, /30 caratteri/);
  }

  const almost = parseLead({ ...validLead, message: "a".repeat(29) });
  assert.equal(almost.status, "invalid");
  const enough = parseLead({ ...validLead, message: "a".repeat(30) });
  assert.equal(enough.status, "valid");

  const withoutBudget = parseLead({ ...validLead, budget: undefined });
  assert.equal(withoutBudget.status, "invalid");
  if (withoutBudget.status === "invalid") {
    assert.match(withoutBudget.error, /budget/i);
  }

  const unknownBudget = parseLead({ ...validLead, budget: "non_so" });
  assert.equal(unknownBudget.status, "valid");
  if (unknownBudget.status === "valid") {
    assert.equal(unknownBudget.lead.budget, "non_so");
  }

  const withSite = parseLead(
    { ...validLead, organizationWebsite: "comune.esempio.it" },
  );
  assert.equal(withSite.status, "valid");
  if (withSite.status === "valid") {
    assert.equal(withSite.lead.organizationWebsite, "https://comune.esempio.it");
    assert.match(formatLeadEmail(withSite.lead, new Date("2026-08-21T12:00:00Z")), /https:\/\/comune\.esempio\.it/);
  }

  const badSite = parseLead({ ...validLead, organizationWebsite: "not a site" });
  assert.equal(badSite.status, "invalid");
  if (badSite.status === "invalid") {
    assert.match(badSite.error, /sito/i);
  }
});

test("parseLead discards honeypots without rejecting fast human submissions", () => {
  assert.equal(parseLead({ ...validLead, company_fax: "https://spam.test" }).status, "discarded");
  assert.equal(parseLead({ ...validLead, website: "https://spam.test" }).status, "discarded");
  assert.equal(parseLead({ ...validLead, startedAt: Date.now() }).status, "valid");
});

test("consulting API rejects invalid JSON and incomplete leads", async () => {
  const invalidJson = await POST(
    new Request("https://example.test/api/consulenza", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://example.test" },
      body: "{",
    }),
  );
  assert.equal(invalidJson.status, 400);

  const incomplete = await POST(request({ ...validLead, email: "not-an-email" }));
  assert.equal(incomplete.status, 400);
  assert.match((await incomplete.json()).error, /email/i);
});

test("consulting API pretends success on spam and needs Resend for real leads", async () => {
  const spam = await POST(request({ ...validLead, company_fax: "http://bot.test" }));
  assert.equal(spam.status, 200);
  assert.deepEqual(await spam.json(), { ok: true });

  const previous = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const unconfigured = await POST(request(validLead));
    assert.equal(unconfigured.status, 503);
    assert.match((await unconfigured.json()).error, /non configurato/i);
  } finally {
    if (previous === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous;
  }
});

test("consulting API sends a plain-text email to the configured inbox", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousInbox = process.env.LEAD_INBOX_EMAIL;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "re_test";
  process.env.LEAD_INBOX_EMAIL = TEST_INBOX;
  process.env.RESEND_FROM_EMAIL = "Consulenza <consulenza@dovevannoinostrisoldi.com>";

  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ id: "email_test" }), { status: 200 });
  };

  try {
    const response = await POST(request(validLead));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    assert.match(calls[0].init.headers.Authorization, /Bearer re_test/);
    assert.equal(calls[0].init.headers["Idempotency-Key"], `consulting/${validLead.submissionId}`);
    assert.ok(calls[0].init.signal instanceof AbortSignal);
    const sent = JSON.parse(calls[0].init.body);
    assert.deepEqual(sent.to, [TEST_INBOX]);
    assert.equal(sent.from, "Consulenza <consulenza@dovevannoinostrisoldi.com>");
    assert.equal(sent.reply_to, validLead.email);
    assert.match(sent.text, /anna\.rossi@example\.com/);
    assert.match(sent.subject, /Comune di Esempio/);
    assert.match(sent.text, /Dirigente finanziario/);
    assert.equal(sent.html, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousInbox === undefined) delete process.env.LEAD_INBOX_EMAIL;
    else process.env.LEAD_INBOX_EMAIL = previousInbox;
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousFrom;
  }
});

test("lead email configuration requires an explicit inbox and rejects an invalid one", () => {
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  const previousInbox = process.env.LEAD_INBOX_EMAIL;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.LEAD_INBOX_EMAIL;
  try {
    assert.equal(leadFromAddress(), "Consulenza <consulenza@dovevannoinostrisoldi.com>");
    assert.equal(leadInbox(), null);
  } finally {
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousFrom;
    if (previousInbox === undefined) delete process.env.LEAD_INBOX_EMAIL;
    else process.env.LEAD_INBOX_EMAIL = previousInbox;
  }

  process.env.RESEND_FROM_EMAIL = "Acme <hello@example.com>";
  process.env.LEAD_INBOX_EMAIL = "not-an-email";
  try {
    assert.equal(leadFromAddress(), "Acme <hello@example.com>");
    assert.equal(leadInbox(), null);
  } finally {
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousFrom;
    if (previousInbox === undefined) delete process.env.LEAD_INBOX_EMAIL;
    else process.env.LEAD_INBOX_EMAIL = previousInbox;
  }
});

test("public legal pages do not expose a personal mailbox", async () => {
  const files = await Promise.all([
    readFile(new URL("../src/app/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/supporto/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/site.ts", import.meta.url), "utf8"),
  ]);
  for (const source of files) {
    assert.doesNotMatch(source, /mailto:/i);
    assert.doesNotMatch(source, /@gmail\.com/i);
  }
  assert.doesNotMatch(files[0], /panel-title">Titolare/i);
});

test("consulting API rejects cross-origin, wrong content type and oversized bodies", async () => {
  const crossOrigin = await POST(request(validLead, { Origin: "https://attacker.test" }));
  assert.equal(crossOrigin.status, 403);

  const wrongType = await POST(request(validLead, { "Content-Type": "text/plain" }));
  assert.equal(wrongType.status, 415);

  const oversized = await POST(request({ ...validLead, message: "a".repeat(17_000) }));
  assert.equal(oversized.status, 413);
});

test("consulting API accepts a same-host origin when Next normalizes request.url", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const response = await POST(
      new Request("http://localhost:3107/api/consulenza", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: "127.0.0.1:3107",
          Origin: "http://127.0.0.1:3107",
        },
        body: JSON.stringify(validLead),
      }),
    );
    assert.equal(response.status, 503);
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test("email subjects cannot inject additional headers", () => {
  const parsed = parseLead({ ...validLead, organization: "Comune\r\nBcc: victim@example.com" });
  assert.equal(parsed.status, "valid");
  if (parsed.status !== "valid") return;
  assert.equal(leadEmailSubject(parsed.lead), "Richiesta consulenza: Comune Bcc: victim@example.com");
});

test("Resend rejection bodies are not retained or returned for logging", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousInbox = process.env.LEAD_INBOX_EMAIL;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "re_test";
  process.env.LEAD_INBOX_EMAIL = TEST_INBOX;
  process.env.RESEND_FROM_EMAIL = "Consulenza <consulenza@dovevannoinostrisoldi.com>";
  try {
    const parsed = parseLead(validLead);
    assert.equal(parsed.status, "valid");
    if (parsed.status !== "valid") return;
    const result = await sendLeadEmail(
      parsed.lead,
      new Date("2026-08-21T12:00:00Z"),
      async () => new Response("echoed PII and\nforged log line", { status: 422 }),
    );
    assert.deepEqual(result, { ok: false, status: 422, detail: "provider-rejected" });
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousInbox === undefined) delete process.env.LEAD_INBOX_EMAIL;
    else process.env.LEAD_INBOX_EMAIL = previousInbox;
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previousFrom;
  }
});
