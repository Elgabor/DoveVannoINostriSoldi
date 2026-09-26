import assert from "node:assert/strict";
import test from "node:test";

const { parseParticipationDraft, PARTICIPATION_LIMITS } = await import("../src/lib/participation/submission-contract.ts");

const mantova = { ipaCode: "c_e897", taxCode: "00189800204" };

function draft(overrides = {}) {
  return {
    clientKey: "6f1c2b6e-4d7a-4d61-9a3c-2f1c0b3e9a11",
    entity: mantova,
    category: "office",
    description: "La data di nomina indicata nella scheda richiede una correzione.",
    period: "giugno 2026",
    sourceUrl: "https://www.comune.mantova.it/it/news/atto",
    sourcePassage: "Nomina con decorrenza 8 giugno 2026.",
    contactEmail: "cittadina@example.org",
    ...overrides,
  };
}

test("accetta e normalizza una proposta per l'identità ufficiale selezionata", () => {
  const result = parseParticipationDraft(draft({ description: "  Correzione\r\n\r\n\r\nnecessaria​  " }), mantova);
  assert.equal(result.ok, true);
  assert.equal(result.value.description, "Correzione\n\nnecessaria");
  assert.equal(result.value.entity.ipaCode, "c_e897");
  assert.equal(parseParticipationDraft(draft({ contactEmail: undefined }), mantova).ok, true);
});

test("rifiuta sostituzione dell'ente e campi inattesi", () => {
  assert.equal(parseParticipationDraft(draft({ entity: { ipaCode: "c_f205", taxCode: "00189800204" } }), mantova).ok, false);
  assert.equal(parseParticipationDraft(draft({ entity: { ...mantova, name: "Altro" } }), mantova).ok, false);
  assert.equal(parseParticipationDraft(draft({ destination: "github" }), mantova).ok, false);
});

test("ammette soltanto categorie di correzione senza categoria giudiziaria", () => {
  for (const category of ["data", "office", "compensation"]) {
    assert.equal(parseParticipationDraft(draft({ category }), mantova).ok, true, category);
  }
  for (const category of ["judicial", "accusa", "sentenza", "project"]) {
    assert.equal(parseParticipationDraft(draft({ category }), mantova).ok, false, category);
  }
});

test("richiede descrizione, periodo, URL e passaggio, con limiti di lunghezza", () => {
  for (const field of ["description", "period", "sourceUrl", "sourcePassage"]) {
    assert.equal(parseParticipationDraft(draft({ [field]: "  " }), mantova).ok, false, field);
  }
  assert.equal(parseParticipationDraft(draft({ description: "x".repeat(PARTICIPATION_LIMITS.descriptionMax + 1) }), mantova).ok, false);
  assert.equal(parseParticipationDraft(draft({ period: "x".repeat(PARTICIPATION_LIMITS.periodMax + 1) }), mantova).ok, false);
  assert.equal(parseParticipationDraft(draft({ sourcePassage: "x".repeat(PARTICIPATION_LIMITS.sourcePassageMax + 1) }), mantova).ok, false);
});

test("rifiuta URL non HTTPS, credenziali e host locali", () => {
  for (const sourceUrl of [
    "http://www.comune.mantova.it/atto",
    "https://user:password@www.comune.mantova.it/atto",
    "https://localhost/atto",
    "https://127.0.0.1/atto",
    "https://[::1]/atto",
    "https://intranet.local/atto",
    "https://example.org/<script>",
  ]) {
    assert.equal(parseParticipationDraft(draft({ sourceUrl }), mantova).ok, false, sourceUrl);
  }
  assert.equal(parseParticipationDraft(draft({ sourceUrl: "https://www.istat.it/it/dati" }), mantova).ok, true);
});

test("rifiuta email e chiave idempotente non valide senza riportare il contenuto nell'errore", () => {
  assert.equal(parseParticipationDraft(draft({ contactEmail: "non-email" }), mantova).ok, false);
  assert.equal(parseParticipationDraft(draft({ clientKey: "key" }), mantova).ok, false);
  const result = parseParticipationDraft(draft({ description: "TESTO_PRIVATO", category: "judicial" }), mantova);
  assert.equal(result.ok, false);
  assert.ok(!result.message.includes("TESTO_PRIVATO"));
});
