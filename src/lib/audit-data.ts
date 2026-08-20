export type AuditSignal = {
  id: string;
  area: string;
  value: number;
  unit: "percent" | "billion-euro" | "million-euro" | "count";
  label: string;
  plainMeaning: string;
  caveat: string;
  referenceDate: string;
  tone: "observed" | "attention" | "policy" | "stock";
  valueClass: "observed-value" | "estimated-effect" | "risk-exposure" | "nominal-stock";
  additive: false;
  verificationUse: "screening-only";
  source: {
    institution: string;
    title: string;
    url: string;
    documentType: "official-report";
  };
};

export const auditReviewedAt = "2026-08-20";

const auditSignalsWithoutComparableProcurement: AuditSignal[] = [
  {
    id: "procurement-low-competition-value",
    area: "Appalti",
    value: 59.7721,
    unit: "billion-euro",
    label: "Contratti con confronto competitivo ridotto",
    plainMeaning: "Nel 2025 affidamenti diretti e negoziate senza bando valgono il 19,3% dei contratti sopra 40.000 euro.",
    caveat: "È spesa da controllare meglio, non una perdita già accertata.",
    referenceDate: "2025",
    tone: "attention",
    valueClass: "risk-exposure",
    additive: false,
    verificationUse: "screening-only",
    source: {
      institution: "ANAC",
      title: "Relazione annuale 2026 sull'attività svolta nel 2025",
      url: "https://www.anticorruzione.it/documents/91439/393633199/Anac%2B-%2BRelazione%2Bannuale%2B2026%2Bsu%2Battivit%C3%A0%2B2025.pdf/165c4f77-a913-1fde-ff23-887cbcee3095?t=1776845818213",
      documentType: "official-report",
    },
  },
  {
    id: "pnrr-spending",
    area: "PNRR",
    value: 113.5,
    unit: "billion-euro",
    label: "Spesa PNRR registrata",
    plainMeaning: "A febbraio 2026 risultava speso oltre il 58% delle risorse del Piano.",
    caveat: "Spendere non significa automaticamente avere completato opere e servizi.",
    referenceDate: "2026-02",
    tone: "observed",
    valueClass: "observed-value",
    additive: false,
    verificationUse: "screening-only",
    source: {
      institution: "Corte dei conti",
      title: "Relazione sullo stato di attuazione del PNRR - maggio 2026",
      url: "https://www.corteconti.it/HOME/StampaMedia/ComunicatiStampa/DettaglioComunicati?Id=0a3d0038-093b-4197-918f-d98b87cd9158",
      documentType: "official-report",
    },
  },
  {
    id: "pnrr-beyond-2026",
    area: "PNRR",
    value: 24.2,
    unit: "billion-euro",
    label: "Risorse previste oltre il 2026",
    plainMeaning: "Una parte del Piano ha una coda di spesa successiva alla scadenza originaria.",
    caveat: "È un rischio di ritardo, non denaro perso.",
    referenceDate: "2026-02",
    tone: "attention",
    valueClass: "risk-exposure",
    additive: false,
    verificationUse: "screening-only",
    source: {
      institution: "Corte dei conti",
      title: "Relazione sullo stato di attuazione del PNRR - maggio 2026",
      url: "https://www.corteconti.it/HOME/StampaMedia/ComunicatiStampa/DettaglioComunicati?Id=0a3d0038-093b-4197-918f-d98b87cd9158",
      documentType: "official-report",
    },
  },
  {
    id: "tax-expenditures",
    area: "Agevolazioni fiscali",
    value: 108.5827,
    unit: "billion-euro",
    label: "Effetto stimato delle agevolazioni fiscali",
    plainMeaning: "Il MEF censisce 575 misure. Nel 2025 ne risultano vigenti 515 e 297 hanno una stima puntuale di 108,6 miliardi.",
    caveat: "Sono scelte di politica fiscale: non sono tutte sprechi e non sono tutte eliminabili.",
    referenceDate: "2025",
    tone: "policy",
    valueClass: "estimated-effect",
    additive: false,
    verificationUse: "screening-only",
    source: {
      institution: "Ministero dell'Economia e delle Finanze",
      title: "Rapporto annuale sulle spese fiscali 2024",
      url: "https://www.mef.gov.it/export/sites/MEF/documenti-allegati/2024/RSF-2024.pdf",
      documentType: "official-report",
    },
  },
  {
    id: "off-budget-debt",
    area: "Comuni",
    value: 945.749,
    unit: "million-euro",
    label: "Debiti fuori bilancio rilevati",
    plainMeaning: "L'indagine riguarda 7.106 Comuni e fotografa posizioni contabili diverse nel 2023.",
    caveat: "Circa 250,5 milioni derivano da acquisti senza un impegno contabile preventivo.",
    referenceDate: "2023",
    tone: "attention",
    valueClass: "observed-value",
    additive: false,
    verificationUse: "screening-only",
    source: {
      institution: "Corte dei conti, archivio del Senato",
      title: "Gestione finanziaria degli enti locali - Del. 14/SEZAUT/2025/FRG",
      url: "https://www.senato.it/service/PDF/PDFServer/DF/444237.pdf",
      documentType: "official-report",
    },
  },
  {
    id: "collection-stock",
    area: "Riscossione",
    value: 1272.9,
    unit: "billion-euro",
    label: "Carichi affidati alla riscossione",
    plainMeaning: "È il valore nominale accumulato dei carichi ancora presenti al 31 gennaio 2025.",
    caveat: "Gran parte non è realisticamente recuperabile: non è un tesoretto disponibile.",
    referenceDate: "2025-01-31",
    tone: "stock",
    valueClass: "nominal-stock",
    additive: false,
    verificationUse: "screening-only",
    source: {
      institution: "Agenzia delle entrate-Riscossione",
      title: "Audizione del Direttore - 27 marzo 2025",
      url: "https://www.agenziaentrateriscossione.gov.it/export/.files/it/Audizione-VI-COMM.-SENATO_27-marzo-2025.pdf",
      documentType: "official-report",
    },
  },
];

export type ProcurementComparison = {
  year: 2023 | 2024 | 2025;
  subject: string;
  byNumber: number;
  byValue: number;
  procedureCount: number;
  totalValueBillion: number;
  plainMeaning: string;
  caveat: string;
  sourcePublishedAt: string;
  sourceTitle: string;
  sourceUrl: string;
};

export const procurementComparisons: Record<ProcurementComparison["year"], ProcurementComparison> = {
  2023: {
    year: 2023,
    subject: "Affidamenti diretti",
    byNumber: 49.6,
    byValue: 6.5,
    procedureCount: 267_403,
    totalValueBillion: 283.37835211,
    plainMeaning: "La quota è calcolata sulle procedure da 40.000 euro in su.",
    caveat: "Il numero delle procedure e il loro valore raccontano due aspetti diversi.",
    sourcePublishedAt: "2024-05-14",
    sourceTitle: "Relazione annuale 2024 sull'attività svolta nel 2023",
    sourceUrl: "https://www.anticorruzione.it/documents/91439/226947274/Anac+-+Relazione+annuale+2024+su+attivit%C3%A0+2023.pdf/59fa6b9e-670d-9910-54e7-88071d5274cc?t=1715693924497",
  },
  2024: {
    year: 2024,
    subject: "Affidamenti diretti",
    byNumber: 54.1,
    byValue: 6,
    procedureCount: 267_157,
    totalValueBillion: 271.849043161,
    plainMeaning: "La quota è calcolata sulle procedure da 40.000 euro in su.",
    caveat: "Il numero delle procedure e il loro valore raccontano due aspetti diversi.",
    sourcePublishedAt: "2025-05-20",
    sourceTitle: "Relazione annuale 2025 sull'attività svolta nel 2024",
    sourceUrl: "https://www.anticorruzione.it/documents/91439/307867242/Anac%2B-%2BRelazione%2Bannuale%2B2025%2Bsu%2Battivit%C3%A0%2B2024.pdf/f5053514-6745-8516-c8df-5bb0e4b2dfbd?t=1747731265787",
  },
  2025: {
    year: 2025,
    subject: "Affidamenti diretti",
    byNumber: 55.3,
    byValue: 5.1,
    procedureCount: 287_421,
    totalValueBillion: 309.732573064,
    plainMeaning: "La quota è calcolata sulle procedure da 40.000 euro in su.",
    caveat: "Il numero delle procedure e il loro valore raccontano due aspetti diversi.",
    sourcePublishedAt: "2026-04-21",
    sourceTitle: "Relazione annuale 2026 sull'attività svolta nel 2025",
    sourceUrl: "https://www.anticorruzione.it/documents/91439/393633199/Anac%2B-%2BRelazione%2Bannuale%2B2026%2Bsu%2Battivit%C3%A0%2B2025.pdf/165c4f77-a913-1fde-ff23-887cbcee3095?t=1776845818213",
  },
};

const procurementDirectAwardSignals: AuditSignal[] = Object.values(procurementComparisons).map(
  (comparison) => ({
    id: `procurement-direct-awards-${comparison.year}`,
    area: "Appalti",
    value: comparison.byNumber,
    unit: "percent",
    label: "Affidamenti diretti sul numero delle procedure",
    plainMeaning: `Nel ${comparison.year} erano affidamenti diretti il ${comparison.byNumber.toFixed(1).replace(".", ",")}% delle procedure da 40.000 euro in su.`,
    caveat: `Sul valore totale pesavano il ${comparison.byValue.toFixed(1).replace(".", ",")}%. È un dato da approfondire, non una prova di spreco.`,
    referenceDate: String(comparison.year),
    tone: "attention",
    valueClass: "risk-exposure",
    additive: false,
    verificationUse: "screening-only",
    source: {
      institution: "ANAC",
      title: comparison.sourceTitle,
      url: comparison.sourceUrl,
      documentType: "official-report",
    },
  }),
);

export const auditSignals: AuditSignal[] = [
  ...procurementDirectAwardSignals,
  ...auditSignalsWithoutComparableProcurement,
];

export const procurementComparison = procurementComparisons[2025];

export const availableAuditYears = [...new Set(
  auditSignals.map((signal) => Number.parseInt(signal.referenceDate.slice(0, 4), 10)),
)].sort((left, right) => right - left);

export function getAuditSignalsForYear(year: number): AuditSignal[] {
  return auditSignals.filter((signal) => signal.referenceDate.startsWith(String(year)));
}

export function getProcurementComparisonForYear(year: number): ProcurementComparison | null {
  return year === 2023 || year === 2024 || year === 2025 ? procurementComparisons[year] : null;
}

export function getProcurementAvailability(year: number) {
  const comparison = getProcurementComparisonForYear(year);
  if (comparison) {
    return {
      status: "available" as const,
      message: `La relazione ANAC per il ${year} è disponibile e usa lo stesso perimetro della serie.`,
    };
  }
  if (year >= 2026) {
    return {
      status: "not-yet-published" as const,
      message: `La relazione ANAC completa sul ${year} non è ancora pubblicata. Non usiamo dati parziali come se fossero annuali.`,
    };
  }
  return {
    status: "not-collected" as const,
    message: `Il dato annuale ANAC per il ${year} non è ancora stato raccolto nella serie verificata.`,
  };
}

export const auditScenarios = [
  { id: "prudent", label: "Prudente", annualBillion: 1.4383151 },
  { id: "central", label: "Centrale", annualBillion: 4.11206045 },
  { id: "ambitious", label: "Ambizioso", annualBillion: 7.0846663 },
] as const;

export const centralScenarioBreakdown = [
  { label: "Revisione mirata delle agevolazioni fiscali", value: 3.258, tone: "policy" },
  { label: "Più concorrenza e controlli negli appalti", value: 0.74715125, tone: "attention" },
  { label: "Minore ricorso strutturale ai gettonisti", value: 0.0568, tone: "observed" },
  { label: "Prevenzione di nuovi debiti fuori bilancio", value: 0.0501092, tone: "stock" },
] as const;

export const auditMethodology = {
  purpose:
    "Aiutare a scegliere quali dati controllare prima. Gli indicatori non stabiliscono da soli sprechi, illeciti o responsabilità.",
  aiUse: {
    allowed: [
      "confrontare valori omogenei nel tempo",
      "segnalare scostamenti e dati mancanti",
      "ordinare i casi da verificare",
      "spiegare il percorso fino alla fonte",
    ],
    prohibited: [
      "definire uno spreco senza una verifica documentale",
      "attribuire responsabilità a persone o enti",
      "sommare stock, flussi, stime e scenari",
      "nascondere anno, fonte o limiti del dato",
    ],
  },
  scenarioMeaning:
    "Gli scenari sono ipotesi di politica pubblica. Non sono risparmi già disponibili e non sono previsioni.",
  reviewedAt: auditReviewedAt,
} as const;
