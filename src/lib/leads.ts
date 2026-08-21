import { z } from "zod";
import { CONTACT_EMAIL } from "@/lib/site";

export const ORGANIZATION_TYPES = {
  azienda: "Azienda",
  pa: "Ente pubblico o PA",
  altro: "Altro",
} as const;

export const CONSULTING_TOPICS = {
  lettura: "Lettura guidata di un ente, un territorio o un progetto",
  dashboard: "Report o cruscotto interno",
  formazione: "Formazione per uffici e team",
  imprese: "Supporto a imprese che lavorano con la PA",
  altro: "Altro",
} as const;

export type OrganizationType = keyof typeof ORGANIZATION_TYPES;
export type ConsultingTopic = keyof typeof CONSULTING_TOPICS;

const MIN_SUBMIT_MS = 4_000;

const leadFields = z.object({
  name: z.string().trim().min(2, "Indica nome e cognome.").max(120),
  email: z.email("Indica un indirizzo email valido.").max(180),
  organization: z.string().trim().min(2, "Indica l'organizzazione o l'ente.").max(180),
  organizationType: z.enum(
    Object.keys(ORGANIZATION_TYPES) as [OrganizationType, ...OrganizationType[]],
    { error: "Scegli il tipo di organizzazione." },
  ),
  role: z.string().trim().max(120).optional(),
  topic: z.enum(
    Object.keys(CONSULTING_TOPICS) as [ConsultingTopic, ...ConsultingTopic[]],
    { error: "Scegli l'argomento della richiesta." },
  ),
  message: z
    .string()
    .trim()
    .min(30, "Scrivi almeno 30 caratteri su che cosa ti serve.")
    .max(4000),
  consent: z.literal(true, { error: "Serve il consenso al trattamento dei dati." }),
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

function isTooFast(startedAt: unknown, now: number): boolean {
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return true;
  if (startedAt > now) return true;
  return now - startedAt < MIN_SUBMIT_MS;
}

export function parseLead(payload: unknown, now = Date.now()): LeadParseResult {
  const record = asRecord(payload);

  if (isFilledHoneypot(record.company_fax) || isFilledHoneypot(record.website) || isTooFast(record.startedAt, now)) {
    return { status: "discarded" };
  }

  const parsed = leadFields.safeParse({
    name: record.name,
    email: record.email,
    organization: record.organization,
    organizationType: record.organizationType,
    role: record.role === "" ? undefined : record.role,
    topic: record.topic,
    message: record.message,
    consent: record.consent === true || record.consent === "true" || record.consent === "on",
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

  return [
    "Nuova richiesta di consulenza da DoveVannoINostriSoldi.",
    "",
    `Ricevuta: ${received}`,
    `Nome: ${lead.name}`,
    `Email (rispondi a questo indirizzo): ${lead.email}`,
    `Organizzazione: ${lead.organization}`,
    `Tipo: ${ORGANIZATION_TYPES[lead.organizationType]}`,
    `Ruolo: ${role}`,
    `Argomento: ${CONSULTING_TOPICS[lead.topic]}`,
    "",
    "Messaggio:",
    lead.message,
  ].join("\n");
}

export function leadEmailSubject(lead: Lead): string {
  return `Richiesta consulenza: ${lead.organization}`;
}

const RESEND_DEFAULT_FROM = "Consulenza <consulenza@dovevannoinostrisoldi.com>";
const BLOCKED_FROM_DOMAINS = /@(gmail|googlemail|yahoo|outlook|hotmail|icloud|example)\./i;

export function leadInbox(): string {
  return process.env.LEAD_INBOX_EMAIL?.trim() || CONTACT_EMAIL;
}

export function leadFromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (!configured) return RESEND_DEFAULT_FROM;

  const address = configured.includes("<")
    ? configured.slice(configured.indexOf("<") + 1, configured.lastIndexOf(">")).trim()
    : configured;
  if (!address || BLOCKED_FROM_DOMAINS.test(address)) return RESEND_DEFAULT_FROM;
  return configured;
}

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export async function sendLeadEmail(
  lead: Lead,
  receivedAt: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, status: 503, detail: "missing-key" };

  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: leadFromAddress(),
      to: [leadInbox()],
      subject: leadEmailSubject(lead),
      text: formatLeadEmail(lead, receivedAt),
    }),
  });

  if (response.ok) return { ok: true };

  const detail = await response.text();
  return { ok: false, status: response.status, detail };
}
