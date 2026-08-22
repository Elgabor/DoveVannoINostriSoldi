/**
 * Plain-language names for public expenditure titles.
 *
 * Official files use accounting Italian. The UI shows what the money is for,
 * in everyday words, without changing what the number means.
 */

export type SpendingScope = "comune" | "regione";

export type SiopeTitleCopy = {
  /** Plain-language name shown as the heading. */
  name: string;
  /** The accounting term, kept nearby when useful. */
  official: string;
  /** One sentence on where the money goes. */
  explanation: string;
};

type TitleEntry = {
  name: string;
  official: string;
  explanation: Record<SpendingScope, string>;
};

const fallback: SiopeTitleCopy = {
  name: "Altra uscita",
  official: "titolo non mappato",
  explanation: "Voce presente nella fonte ma non ancora descritta in parole semplici.",
};

const byCode: Record<string, TitleEntry> = {
  "1": {
    name: "Servizi di ogni giorno",
    official: "spese correnti",
    explanation: {
      comune:
        "Stipendi, scuole, rifiuti, luce, manutenzione: quello che tiene aperto il Comune.",
      regione:
        "Stipendi, servizi, scuole e tutto quello che la Regione tiene in piedi ogni giorno.",
    },
  },
  "2": {
    name: "Opere e lavori",
    official: "conto capitale",
    explanation: {
      comune: "Strade, edifici, impianti: cose che restano nel tempo.",
      regione: "Strade, edifici, impianti: opere che restano nel territorio.",
    },
  },
  "3": {
    name: "Soldi messi in società",
    official: "attività finanziarie",
    explanation: {
      comune: "Quote in società e altri investimenti finanziari.",
      regione: "Quote in società e altri investimenti finanziari.",
    },
  },
  "4": {
    name: "Rate dei prestiti",
    official: "rimborso prestiti",
    explanation: {
      comune: "Rate di mutui presi negli anni scorsi.",
      regione: "Rate di mutui e prestiti presi negli anni scorsi.",
    },
  },
  "5": {
    name: "Anticipi restituiti",
    official: "chiusura anticipazioni",
    explanation: {
      comune: "Soldi presi in anticipo dal cassiere e poi restituiti.",
      regione: "Soldi presi in anticipo dal cassiere e poi restituiti.",
    },
  },
  "7": {
    name: "Soldi di passaggio",
    official: "uscite per conto terzi",
    explanation: {
      comune: "Soldi che il Comune riceve e passa ad altri enti o soggetti.",
      regione: "Soldi che la Regione riceve e passa ad altri enti o soggetti.",
    },
  },
  "0": {
    name: "Ancora da classificare",
    official: "da regolarizzare",
    explanation: {
      comune: "Pagamenti registrati ma non ancora assegnati a una voce.",
      regione: "Importi registrati ma non ancora assegnati a una voce.",
    },
  },
};

/** Title 7 is money passing through, not spending decided for own services. */
export const PASS_THROUGH_TITLE_CODE = "7";

export function siopeTitleCopy(
  code: string,
  scope: SpendingScope = "comune",
): SiopeTitleCopy {
  const entry = byCode[code];
  if (!entry) return fallback;
  return {
    name: entry.name,
    official: entry.official,
    explanation: entry.explanation[scope],
  };
}

/**
 * Seven slices is more than a thumbnail chart can carry, so the home page
 * groups the tail into five buckets.
 */
export const HOME_SPENDING_BUCKETS: { name: string; explanation: string; codes: string[] }[] = [
  {
    name: "Servizi quotidiani",
    explanation: "Stipendi, scuole, rifiuti, luce.",
    codes: ["1"],
  },
  {
    name: "Opere e lavori",
    explanation: "Strade, edifici, impianti.",
    codes: ["2"],
  },
  {
    name: "Soldi di passaggio",
    explanation: "Soldi che il Comune riceve e passa ad altri.",
    codes: ["7"],
  },
  {
    name: "Prestiti e anticipi",
    explanation: "Rate di mutui e anticipi restituiti.",
    codes: ["5", "4"],
  },
  {
    name: "Altre uscite",
    explanation: "Voci ancora da classificare e soldi messi in società.",
    codes: ["0", "3"],
  },
];
