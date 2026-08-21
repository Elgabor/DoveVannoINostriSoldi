import { z } from "zod";
import {
  CONSULTING_TOPICS,
  ORGANIZATION_TYPES,
  PROJECT_BUDGETS,
  type ConsultingTopic,
  type OrganizationType,
  type ProjectBudget,
} from "@/lib/consulting-contract";

const RESEND_TIMEOUT_MS = 8_000;

const leadFields = z.object({
  name: z.string().trim().min(2, "Indica nome e cognome.").max(120),
  email: z.email("Indica un indirizzo email valido.").max(180),
  organization: z.string().trim().min(2, "Indica l'organizzazione o l'ente.").max(180),
  organizationType: z.enum(
    Object.keys(ORGANIZATION_TYPES) as [OrganizationType, ...OrganizationType[]],
    { error: "Scegli il tipo di organizzazione." },
  ),
  role: z.string().trim().max(120).optional(),
  organizationWebsite: z.url({ error: "Indica un sito web valido, o lascia il campo vuoto." }).max(300).optional(),
  topic: z.enum(
    Object.keys(CONSULTING_TOPICS) as [ConsultingTopic, ...ConsultingTopic[]],
    { error: "Scegli il tipo di progetto." },
  ),
  budget: z.enum(
    Object.keys(PROJECT_BUDGETS) as [ProjectBudget, ...ProjectBudget[]],
    { error: "Indica il budget da dedicare al progetto, o scegli non so ancora." },
  ),
  message: z
    .string()
    .trim()
    .min(30, "Scrivi almeno 30 caratteri su che cosa ti serve.")
    .max(4000),
  consent: z.literal(true, { error: "Serve il consenso al trattamento dei dati." }),
  submissionId: z.uuid("Identificativo richiesta non valido."),
});

export type Lead = z.infer<typeof leadFields>;

export type LeadParseResult =
  | { status: "valid"; lead: Lead }
  | { status: "invalid"; error: string }
  | { status: "discarded" };

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function isFilledHoneypot(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Empty is allowed. Bare domains become https URLs. Invalid values stay invalid for Zod. */
function normalizeOptionalWebsite(value: unknown): unknown {
  const trimmed = emptyToUndefined(value);
  if (typeof trimmed !== "string") return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseLead(payload: unknown): LeadParseResult {
  const record = asRecord(payload);

  if (isFilledHoneypot(record.company_fax) || isFilledHoneypot(record.website)) {
    return { status: "discarded" };
  }

  const parsed = leadFields.safeParse({
    name: record.name,
    email: record.email,
    organization: record.organization,
    organizationType: record.organizationType,
    role: emptyToUndefined(record.role),
    organizationWebsite: normalizeOptionalWebsite(record.organizationWebsite),
    topic: record.topic,
    budget: record.budget,
    message: record.message,
    consent: record.consent === true || record.consent === "true" || record.consent === "on",
    submissionId: record.submissionId,
  });

  if (!parsed.success) {
    return { status: "invalid", error: parsed.error.issues[0]?.message ?? "Richiesta non valida" };
  }

  return { status: "valid", lead: parsed.data };
}

export function formatLeadEmail(lead: Lead, receivedAt: Date): string {
  const received = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(receivedAt);

  const role = lead.role?.trim() ? lead.role : "non indicato";
  const website = lead.organizationWebsite?.trim() ? lead.organizationWebsite : "non indicato";

  return [
    "Nuova richiesta di consulenza da DoveVannoINostriSoldi.",
    "",
    `Ricevuta: ${received}`,
    `Nome: ${lead.name}`,
    `Email (rispondi a questo indirizzo): ${lead.email}`,
    `Organizzazione: ${lead.organization}`,
    `Sito web: ${website}`,
    `Tipo: ${ORGANIZATION_TYPES[lead.organizationType]}`,
    `Ruolo: ${role}`,
    `Argomento: ${CONSULTING_TOPICS[lead.topic]}`,
    `Budget progetto AI: ${PROJECT_BUDGETS[lead.budget]}`,
    "",
    "Messaggio:",
    lead.message,
  ].join("\n");
}

export function leadEmailSubject(lead: Lead): string {
  const organization = lead.organization
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `Richiesta consulenza: ${organization}`;
}

const mailbox = z.email();
const namedMailbox = /^[^<>\r\n]+<([^<>\r\n]+)>$/;

export function leadInbox(): string | null {
  const configured = process.env.LEAD_INBOX_EMAIL?.trim();
  return configured && mailbox.safeParse(configured).success ? configured : null;
}

export function leadFromAddress(): string | null {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (!configured) return null;
  const address = namedMailbox.exec(configured)?.[1]?.trim() ?? configured;
  return mailbox.safeParse(address).success ? configured : null;
}

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export async function sendLeadEmail(
  lead: Lead,
  receivedAt: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = leadFromAddress();
  const inbox = leadInbox();
  if (!apiKey || !from || !inbox) {
    return { ok: false, status: 503, detail: "missing-or-invalid-email-config" };
  }

  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `consulting/${lead.submissionId}`,
    },
    body: JSON.stringify({
      from,
      to: [inbox],
      reply_to: lead.email,
      subject: leadEmailSubject(lead),
      text: formatLeadEmail(lead, receivedAt),
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });

  if (response.ok) return { ok: true };

  await response.body?.cancel().catch(() => undefined);
  return { ok: false, status: response.status, detail: "provider-rejected" };
}
