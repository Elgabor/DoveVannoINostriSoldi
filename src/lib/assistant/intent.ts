import type { DatasetQuery } from "@/lib/mcp/catalog";
import {
  ASSISTANT_EXAMPLES,
  assistantFailure,
  assistantHelpResponse,
  type AssistantIntent,
  type AssistantResponse,
} from "@/lib/assistant/contracts";

const REGIONS = new Map<string, string>([
  ["abruzzo", "Abruzzo"],
  ["basilicata", "Basilicata"],
  ["calabria", "Calabria"],
  ["campania", "Campania"],
  ["emilia romagna", "Emilia-Romagna"],
  ["friuli venezia giulia", "Friuli-Venezia Giulia"],
  ["lazio", "Lazio"],
  ["liguria", "Liguria"],
  ["lombardia", "Lombardia"],
  ["marche", "Marche"],
  ["molise", "Molise"],
  ["piemonte", "Piemonte"],
  ["puglia", "Puglia"],
  ["sardegna", "Sardegna"],
  ["sicilia", "Sicilia"],
  ["toscana", "Toscana"],
  ["trentino alto adige", "Trentino-Alto Adige/Südtirol"],
  ["umbria", "Umbria"],
  ["valle d aosta", "Valle d'Aosta/Vallée d'Aoste"],
  ["veneto", "Veneto"],
]);

const UNSAFE_PATTERNS = [
  /\b(frode|frodi|corruzion\p{Letter}*|evasione|truffa|colpevol\p{Letter}*|responsabilit\p{Letter}*|inculpat\p{Letter}*|reato\p{Letter}*|criminal\p{Letter}*|illegal\p{Letter}*|colpa)\b/u,
  /\b(ignore|ignora|bypass|jailbreak|system prompt|developer message|istruzioni precedenti)\b/u,
  /<\s*script\b|javascript:|data:text\/html|file:\/\//u,
  /\b(select|insert|update|delete|drop)\s+.+\s+from\b/u,
  /https?:\/\//u,
];

const UNSUPPORTED_PATTERNS = [
  /\b(classifica|classifiche|miglior[ei]?|peggior[ei]?|best|worst|efficienza|spreco)\b/u,
  /\b(voce|vocale|audio|parlami|telefon|chatgpt|claude|mcp)\b/u,
  /\bcomune\s+(di|del|della)\b/u,
  /\b(provincia|province)\b/u,
  /\b(come|perch[eé]|dimostra|prova)\b/u,
];

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("it-IT")
    .replace(/[’']/gu, " ")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function yearFrom(prompt: string): number | null {
  const match = prompt.match(/\b(20\d{2}|21\d{2})\b/u);
  return match ? Number(match[1]) : null;
}

function regionFrom(prompt: string): string | undefined {
  const found = [...REGIONS.entries()]
    .sort(([left], [right]) => right.length - left.length)
    .find(([alias]) => new RegExp(`\\b${alias.replace(/ /gu, "\\s+")}\\b`, "u").test(prompt));
  return found?.[1];
}

function hasNationalMunicipalQuestion(prompt: string): boolean {
  return /\bquanto(?: hanno| ha)? speso\b[\s\S]*\bcomuni\b/u.test(prompt) ||
    /\bpagamenti\b[\s\S]*\bcomuni\b/u.test(prompt);
}

function hasStateQuestion(prompt: string): boolean {
  return /\bquanto(?: ha| hanno)? speso\b[\s\S]*\bstato\b/u.test(prompt) ||
    /\bpagamenti\b[\s\S]*\bstato\b/u.test(prompt);
}

function hasIrpefQuestion(prompt: string): boolean {
  return /\bimposta\s+netta\s+dichiarata\b/u.test(prompt);
}

function queryIntent(query: DatasetQuery, description: string): AssistantIntent {
  return { kind: "dataset_query", query, description };
}

/**
 * Parses only a small, explicit Italian vocabulary. No user-provided text is
 * used as a dataset identifier, URL, code path, SQL fragment or function name.
 */
export function parseAssistantIntent(prompt: string): AssistantIntent | AssistantResponse {
  const text = normalized(prompt);

  if (UNSAFE_PATTERNS.some((pattern) => pattern.test(text))) {
    return assistantFailure(
      "refusal",
      "unsafe_request",
      "Non posso attribuire frodi, corruzione o responsabilità individuali. Posso mostrare soltanto dati pubblici aggregati e le loro fonti.",
    );
  }

  if (text === "aiuto" || text === "help" || /\b(cosa puoi fare|esempi|come funziona)\b/u.test(text)) {
    return assistantHelpResponse();
  }

  if (UNSUPPORTED_PATTERNS.some((pattern) => pattern.test(text))) {
    return assistantHelpResponse(
      "Questa versione risponde a pochi confronti aggregati e verificabili; non produce classifiche, spiegazioni causali o dati per singolo Comune.",
    );
  }

  const year = yearFrom(text);
  if (year === null) {
    return assistantHelpResponse("Indica anche l’anno di riferimento, per esempio 2025.");
  }

  const region = regionFrom(text);
  if (hasIrpefQuestion(text) && region && year === 2024) {
    return queryIntent(
      {
        dataset: "mef_irpef_comunale",
        year,
        level: "region",
        region,
      },
      "Imposta netta dichiarata MEF per Regione",
    );
  }

  if (hasNationalMunicipalQuestion(text)) {
    return queryIntent(
      region
        ? { dataset: "siope_comuni", year, region }
        : { dataset: "siope_comuni", year },
      region
        ? "Pagamenti SIOPE dei Comuni nella Regione indicata"
        : "Pagamenti SIOPE dei Comuni in Italia",
    );
  }

  if (hasStateQuestion(text)) {
    if (region) {
      return assistantHelpResponse("La spesa dello Stato non è regionalizzata in questa interfaccia; posso mostrarti il rilascio nazionale OpenBDAP.");
    }
    return queryIntent(
      { dataset: "openbdap_spesa_stato", year },
      "Pagamenti dello Stato nel periodo ufficiale disponibile",
    );
  }

  return assistantHelpResponse(
    `Non ho trovato una domanda supportata. Prova, per esempio: ${ASSISTANT_EXAMPLES[0]} Non posso inventare filtri o stimare dati mancanti.`,
  );
}

export function isAssistantIntent(value: AssistantIntent | AssistantResponse): value is AssistantIntent {
  return value.kind === "dataset_query";
}
