/**
 * Plain-language names for the SIOPE expenditure titles.
 *
 * SIOPE labels its titles in accounting Italian ("Uscite per conto terzi e
 * partite di giro"). The site's job is to say the same thing in words people
 * actually use, without changing what the number means — so every entry keeps
 * the official label alongside the plain one.
 */

export type SiopeTitleCopy = {
  /** Plain-language name shown as the heading. */
  name: string;
  /** The accounting term, kept visible next to the plain name. */
  official: string;
  /** One sentence on what actually sits inside this title. */
  explanation: string;
};

const fallback: SiopeTitleCopy = {
  name: "Altra uscita",
  official: "titolo non mappato",
  explanation: "Voce presente nella fonte ma non ancora descritta in parole semplici.",
};

const byCode: Record<string, SiopeTitleCopy> = {
  "1": {
    name: "Servizi di ogni giorno",
    official: "spese correnti",
    explanation:
      "Stipendi, scuole, rifiuti, luce, manutenzione: quello che tiene aperto un Comune.",
  },
  "2": {
    name: "Opere e lavori",
    official: "conto capitale",
    explanation: "Strade, edifici, impianti: soldi che restano nel tempo.",
  },
  "7": {
    name: "Partite di giro",
    official: "uscite per conto terzi",
    explanation:
      "Soldi che il Comune incassa e riversa per conto di altri, come alcune ritenute. Non rappresentano acquisti o servizi del Comune.",
  },
  "0": {
    name: "Ancora da classificare",
    official: "da regolarizzare",
    explanation: "Pagamenti registrati ma non ancora assegnati a una voce.",
  },
  "5": {
    name: "Anticipi di cassa restituiti",
    official: "chiusura anticipazioni",
    explanation: "Denaro chiesto in prestito al tesoriere del Comune e poi restituito.",
  },
  "4": {
    name: "Rimborso di prestiti",
    official: "rimborso prestiti",
    explanation: "Rate di mutui accesi negli anni passati.",
  },
  "3": {
    name: "Investimenti finanziari",
    official: "attività finanziarie",
    explanation: "Quote in società e altri strumenti finanziari.",
  },
};

/** SIOPE title 7 is money passing through, not spending the Comune decided on. */
export const PASS_THROUGH_TITLE_CODE = "7";

export function siopeTitleCopy(code: string): SiopeTitleCopy {
  return byCode[code] ?? fallback;
}

/**
 * Seven slices is more than a thumbnail chart can carry, so the home page
 * groups the tail into five buckets. The two smallest titles share a bucket
 * named for what they have in common — neither is day-to-day spending nor a
 * public work — rather than being folded into an unrelated label.
 */
export const HOME_SPENDING_BUCKETS: { name: string; explanation: string; codes: string[] }[] = [
  {
    name: "Servizi quotidiani",
    explanation: "Spese correnti: stipendi, scuole, rifiuti, luce.",
    codes: ["1"],
  },
  {
    name: "Opere e lavori",
    explanation: "Conto capitale: strade, edifici, impianti.",
    codes: ["2"],
  },
  {
    name: "Partite di giro",
    explanation:
      "Soldi che il Comune incassa e riversa per conto dello Stato o di altri soggetti. Non rappresentano acquisti o servizi del Comune.",
    codes: ["7"],
  },
  {
    name: "Prestiti e anticipi",
    explanation: "Rate di mutui e anticipi di cassa restituiti.",
    codes: ["5", "4"],
  },
  {
    name: "Altre uscite",
    explanation:
      "Pagamenti non ancora assegnati a una voce e investimenti finanziari come le quote in società.",
    codes: ["0", "3"],
  },
];
