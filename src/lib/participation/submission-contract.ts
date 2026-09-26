import { z } from "zod";

/** Only this payload may cross the public form boundary; it does not grant publication. */
export const PARTICIPATION_LIMITS = Object.freeze({
  descriptionMax: 2_000,
  periodMax: 100,
  sourceUrlMax: 500,
  sourcePassageMax: 1_000,
  contactEmailMax: 254,
  requestBytesMax: 8_192,
});

const invisibleCharacters =
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202E\u2060-\u2064\uFEFF]/gu;

function normalizeText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .replace(invisibleCharacters, "")
    .replace(/[ \t]+$/gmu, "")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function requiredText(max: number) {
  return z.string().max(max * 4).transform(normalizeText)
    .pipe(z.string().min(1, "campo obbligatorio").max(max, `massimo ${max} caratteri`));
}

const publicSourceUrl = z.string().max(PARTICIPATION_LIMITS.sourceUrlMax)
  .transform((value) => value.trim())
  .pipe(z.string().min(1).max(PARTICIPATION_LIMITS.sourceUrlMax))
  .refine((value) => {
    if (/[\s<>()"'`\\]/u.test(value)) return false;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/\.$/u, "");
      return url.protocol === "https:" && !url.username && !url.password && !url.port &&
        host.includes(".") && host !== "localhost" && !host.endsWith(".localhost") &&
        !host.endsWith(".local") && !/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(host) &&
        !host.startsWith("[");
    } catch {
      return false;
    }
  }, { message: "URL HTTPS pubblico non valido" });

const entitySchema = z.strictObject({
  ipaCode: z.string().regex(/^[a-z][a-z0-9_]{2,15}$/u),
  taxCode: z.string().regex(/^\d{11}$/u),
});

const draftSchema = z.strictObject({
  clientKey: z.uuid(),
  entity: entitySchema,
  category: z.enum(["data", "office", "compensation"]),
  description: requiredText(PARTICIPATION_LIMITS.descriptionMax),
  period: requiredText(PARTICIPATION_LIMITS.periodMax),
  sourceUrl: publicSourceUrl,
  sourcePassage: requiredText(PARTICIPATION_LIMITS.sourcePassageMax),
  contactEmail: z.string().max(PARTICIPATION_LIMITS.contactEmailMax).trim().pipe(z.email()).optional(),
});

export type ParticipationEntity = z.infer<typeof entitySchema>;
export type ParticipationDraft = z.infer<typeof draftSchema>;

export type ParticipationValidation =
  | Readonly<{ ok: true; value: ParticipationDraft }>
  | Readonly<{ ok: false; message: string }>;

/** `expectedEntity` must come from the server's resolved entity, never the payload. */
export function parseParticipationDraft(payload: unknown, expectedEntity: ParticipationEntity): ParticipationValidation {
  const parsed = draftSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.map(String).join(".");
    return { ok: false, message: path ? `Campo «${path}» non valido` : "Proposta non valida" };
  }
  if (parsed.data.entity.ipaCode !== expectedEntity.ipaCode || parsed.data.entity.taxCode !== expectedEntity.taxCode) {
    return { ok: false, message: "Ente della proposta non corrispondente alla scheda" };
  }
  return { ok: true, value: parsed.data };
}
