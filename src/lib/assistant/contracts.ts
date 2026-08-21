import type { DatasetId, DatasetQuery } from "@/lib/mcp/catalog";

export const ASSISTANT_MAX_PROMPT_CHARS = 500;
export const ASSISTANT_DEFAULT_TIMEOUT_MS = 10_000;
export const ASSISTANT_EXAMPLES = Object.freeze([
  "Quanto hanno speso i Comuni nel 2025?",
  "Quanto hanno speso i Comuni in Calabria nel 2025?",
  "Quanto ha speso lo Stato nel 2025?",
  "Qual è l’imposta netta dichiarata in Calabria nel 2024?",
]);

export type AssistantRequest = Readonly<{
  prompt: string;
}>;

export type AssistantIntent = Readonly<{
  kind: "dataset_query";
  query: DatasetQuery;
  description: string;
}>;

export type AssistantFact = Readonly<{
  label: string;
  value: number;
  unit: "euro" | "percent" | "count";
}>;

export type AssistantAnswer = Readonly<{
  dataset: DatasetId;
  period: Readonly<{
    year: number;
    month: number | null;
    label: string;
  }>;
  observation: Readonly<{
    label: string;
    value: number;
    unit: "euro";
    scope: string;
  }>;
  source: Readonly<{
    owner: string;
    url: string;
    observedAt: string;
  }>;
  caveats: readonly string[];
  facts: readonly AssistantFact[];
}>;

export type AssistantHelpResponse = Readonly<{
  ok: true;
  kind: "help";
  message: string;
  examples: readonly string[];
}>;

export type AssistantFailureResponse = Readonly<{
  ok: false;
  kind: "refusal" | "invalid_request" | "unavailable";
  code: "unsafe_request" | "unsupported" | "invalid_request" | "timeout" | "data_unavailable";
  message: string;
  examples?: readonly string[];
}>;

export type AssistantResponse =
  | Readonly<{ ok: true; kind: "answer"; answer: AssistantAnswer }>
  | AssistantHelpResponse
  | AssistantFailureResponse;

const REQUEST_KEYS = ["prompt"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates the public request boundary. The exact-key check is intentional:
 * future fields must be designed and documented before they can affect the
 * deterministic executor.
 */
export function parseAssistantRequest(value: unknown): AssistantRequest {
  if (!isRecord(value)) {
    throw new Error("La richiesta dell’assistente deve essere un oggetto JSON.");
  }

  const keys = Object.keys(value).sort();
  const expected = [...REQUEST_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("La richiesta dell’assistente contiene campi non supportati.");
  }

  const prompt = value.prompt;
  if (typeof prompt !== "string") {
    throw new Error("Il campo prompt deve essere testuale.");
  }
  const normalized = prompt.trim();
  if (normalized.length === 0) {
    throw new Error("Scrivi una domanda.");
  }
  if (normalized.length > ASSISTANT_MAX_PROMPT_CHARS) {
    throw new Error(`La domanda può contenere al massimo ${ASSISTANT_MAX_PROMPT_CHARS} caratteri.`);
  }

  return { prompt: normalized };
}

export function assistantHelpResponse(message = "Posso rispondere soltanto a domande sui dati già verificati."): AssistantHelpResponse {
  return {
    ok: true,
    kind: "help",
    message,
    examples: ASSISTANT_EXAMPLES,
  };
}

export function assistantFailure(
  kind: AssistantFailureResponse["kind"],
  code: AssistantFailureResponse["code"],
  message: string,
  examples?: readonly string[],
): AssistantFailureResponse {
  return examples ? { ok: false, kind, code, message, examples } : { ok: false, kind, code, message };
}
