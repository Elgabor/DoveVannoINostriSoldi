"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import {
  parseParticipationDraft,
  PARTICIPATION_CATEGORIES,
  PARTICIPATION_CATEGORY_IDS,
  PARTICIPATION_ENDPOINT,
  PARTICIPATION_LIMITS,
  type ParticipationEntity,
} from "@/lib/participation/submission-contract";
import styles from "./municipality-correction-form.module.css";

type Props = Readonly<{
  entity: ParticipationEntity & Readonly<{ name: string }>;
  noticePath: string;
}>;

type Submission =
  | Readonly<{ state: "idle" | "sending" | "failed" }>
  | Readonly<{ state: "sent"; receipt: string; duplicate: boolean }>;

function validReceipt(value: unknown): value is { ok: true; receipt: string; duplicate: boolean } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return data.ok === true && typeof data.receipt === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(data.receipt) &&
    typeof data.duplicate === "boolean";
}

export function MunicipalityCorrectionForm({ entity, noticePath }: Props) {
  const baseId = useId();
  const id = (field: string) => `${baseId}-${field}`;
  const lastAttempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });
  const [error, setError] = useState<string | null>(null);

  function fail(message: string) {
    setError(message);
    setSubmission({ state: "failed" });
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submission.state === "sending" || submission.state === "sent") return;
    const fields = new FormData(event.currentTarget);
    const values = {
      entity: { ipaCode: entity.ipaCode, taxCode: entity.taxCode },
      category: String(fields.get("category") ?? ""),
      description: String(fields.get("description") ?? ""),
      period: String(fields.get("period") ?? ""),
      sourceUrl: String(fields.get("sourceUrl") ?? ""),
      sourcePassage: String(fields.get("sourcePassage") ?? ""),
      ...(String(fields.get("contactEmail") ?? "").trim()
        ? { contactEmail: String(fields.get("contactEmail")).trim() }
        : {}),
    };
    const fingerprint = JSON.stringify(values);
    const key = lastAttempt.current?.fingerprint === fingerprint
      ? lastAttempt.current.key : crypto.randomUUID();
    const parsed = parseParticipationDraft({ clientKey: key, ...values }, entity);
    if (!parsed.ok) {
      fail(parsed.message);
      const field = parsed.message.match(/^Campo «(category|description|period|sourceUrl|sourcePassage|contactEmail)»/u)?.[1];
      if (field) requestAnimationFrame(() => document.getElementById(id(field))?.focus());
      return;
    }
    lastAttempt.current = { fingerprint, key };
    setError(null);
    setSubmission({ state: "sending" });

    try {
      const response = await fetch(PARTICIPATION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !validReceipt(body)) throw new Error("unconfirmed");
      setSubmission({ state: "sent", receipt: body.receipt, duplicate: body.duplicate });
    } catch {
      // A timed-out request may already have committed. Retrying unchanged
      // fields uses the same key so the database can return the same receipt.
      fail("Esito non confermato. I campi sono ancora qui: riprova senza modificarli oppure correggili e invia una nuova proposta.");
    }
  }

  const sending = submission.state === "sending";
  return (
    <details className={styles.wrapper}>
      <summary>Proponi una correzione privata</summary>
      <div className={styles.content}>
        <p>
          La proposta sarà visibile soltanto ai revisori autorizzati. Testo e contatto non saranno pubblicati
          automaticamente; dopo verifica umana potrà apparire una sintesi. Non inviare accuse, dati giudiziari,
          credenziali o dati personali di terzi. Leggi l&apos;{" "}
          <a href={noticePath}>informativa per le proposte private</a> prima di inviare.
        </p>
        <p className={styles.target}>Oggetto: <strong>{entity.name}</strong> · Codice IPA <code>{entity.ipaCode}</code></p>
        {submission.state === "sent" ? (
          <div className={styles.success} role="status" aria-live="polite">
            <strong>{submission.duplicate ? "Proposta già ricevuta" : "Proposta ricevuta"}</strong>
            <p>Conserva la ricevuta <code>{submission.receipt}</code>. Il testo non è pubblico e la ricevuta non permette di leggerlo.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
            {error ? <div ref={errorRef} tabIndex={-1} className={styles.error} role="alert">{error}</div> : null}
            <fieldset disabled={sending} className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor={id("category")}>Tipo di correzione</label>
                <select id={id("category")} name="category" required defaultValue="office">
                  {PARTICIPATION_CATEGORY_IDS.map((category) => (
                    <option key={category} value={category}>{PARTICIPATION_CATEGORIES[category]}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor={id("description")}>Che cosa va corretto?</label>
                <textarea id={id("description")} name="description" required maxLength={PARTICIPATION_LIMITS.descriptionMax} rows={4} />
              </div>
              <div className={styles.field}>
                <label htmlFor={id("period")}>Periodo a cui si riferisce</label>
                <input id={id("period")} name="period" required maxLength={PARTICIPATION_LIMITS.periodMax} placeholder="es. giugno 2026" />
              </div>
              <div className={styles.field}>
                <label htmlFor={id("sourceUrl")}>URL della fonte</label>
                <input id={id("sourceUrl")} name="sourceUrl" type="url" inputMode="url" required pattern="https://.*" maxLength={PARTICIPATION_LIMITS.sourceUrlMax} placeholder="https://…" />
              </div>
              <div className={styles.field}>
                <label htmlFor={id("sourcePassage")}>Passaggio pertinente della fonte</label>
                <textarea id={id("sourcePassage")} name="sourcePassage" required maxLength={PARTICIPATION_LIMITS.sourcePassageMax} rows={3} />
              </div>
              <div className={styles.field}>
                <label htmlFor={id("contactEmail")}>Email per eventuali chiarimenti <span>(facoltativa, non pubblica)</span></label>
                <input id={id("contactEmail")} name="contactEmail" type="email" maxLength={PARTICIPATION_LIMITS.contactEmailMax} autoComplete="off" />
              </div>
              <button type="submit" className={styles.submit}>{sending ? "Invio in corso…" : "Invia proposta privata"}</button>
            </fieldset>
          </form>
        )}
      </div>
    </details>
  );
}
