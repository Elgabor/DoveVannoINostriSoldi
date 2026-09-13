import { mefIrpefSourceMeta } from "@/lib/data/mef-irpef-source";
import {
  datasetCatalog,
  type DatasetDescriptor,
  type DatasetId,
} from "@/lib/mcp/catalog";
import { datasetQuerySchema } from "@/lib/mcp/query-schema";

/**
 * Temporary availability list for the first public slice (ticket 04). It holds
 * only the dataset whose card is actually served; ticket 05 removes this gate
 * and derives the served set from the whole active catalog.
 */
export const AGENT_PUBLIC_DOC_DATASET_IDS = ["mef_irpef_comunale"] as const;
export type AgentPublicDocDatasetId = (typeof AGENT_PUBLIC_DOC_DATASET_IDS)[number];

export const AGENTS_INDEX_PATH = "/for-agents";

const AGENT_PUBLIC_DOC_DATASET_ID_SET = new Set<string>(AGENT_PUBLIC_DOC_DATASET_IDS);

const ALLOWED_LOCAL_PATHS = new Set<string>([
  AGENTS_INDEX_PATH,
  "/dati",
  "/api/mcp",
  "/api/territori/irpef",
  "/mcp",
  "/metodologia",
  "/fonti",
  "/territori/irpef",
  "/privacy",
  "/supporto",
]);

const ALLOWED_PUBLIC_HOSTS = new Set<string>([
  "www.dovevannoinostrisoldi.com",
  "dovevannoinostrisoldi.com",
  "www1.finanze.gov.it",
  "creativecommons.org",
]);

const MARKDOWN_METACHARACTERS = /([\\`*_[\]<>|#])/g;
const LOCAL_DATASET_PATH_PREFIX = `${AGENTS_INDEX_PATH}/datasets/`;
const SAFE_DATASET_SLUG = /^[a-z0-9_]+$/;

const ITALIAN_MONTHS = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
] as const;

export type AgentPublicFilter = Readonly<{ name: string; description: string }>;
export type AgentPublicSource = Readonly<{
  name: string;
  owner: string;
  url: string;
  cadence: string;
  license?: string;
}>;
export type AgentPublicReference = Readonly<{ label: string; url: string }>;

export type AgentPublicDoc = Readonly<{
  id: DatasetId;
  title: string;
  summary: string;
  availability: string;
  period: readonly string[];
  units: readonly string[];
  coverage: string;
  caveat: string;
  filters: readonly AgentPublicFilter[];
  queryNotes: readonly string[];
  exampleQuery: Record<string, unknown>;
  sources: readonly AgentPublicSource[];
  references: readonly AgentPublicReference[];
  mcpEndpoint: string;
  httpEndpoint: string | null;
}>;

type AgentDatasetFacts = Readonly<{
  period: readonly string[];
  units: readonly string[];
  coverage: string;
  queryNotes: readonly string[];
  references: readonly AgentPublicReference[];
}>;

export function escapeMarkdownText(value: string): string {
  return value.replace(/\r\n|\r|\n/g, " ").replace(MARKDOWN_METACHARACTERS, "\\$1");
}

const PRIVATE_HOSTNAMES = /^(?:localhost|.*\.localhost|.*\.local)$/;
const IPV4_HOSTNAME = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const IPV6_HOSTNAME = /^\[[0-9a-f:]+\]$/i;

function normalizedHostname(hostname: string): string {
  return hostname.toLocaleLowerCase("en-US").replace(/\.$/, "");
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizedHostname(hostname);
  return (
    normalized.length === 0 ||
    PRIVATE_HOSTNAMES.test(normalized) ||
    IPV4_HOSTNAME.test(normalized) ||
    IPV6_HOSTNAME.test(normalized)
  );
}

export function agentDatasetPath(datasetId: string): string {
  return `${LOCAL_DATASET_PATH_PREFIX}${datasetId}`;
}

export function sanitizePublicUrl(value: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/")) {
    const path = trimmed.split(/[?#]/, 1)[0];
    if (ALLOWED_LOCAL_PATHS.has(path)) return trimmed;
    if (path.startsWith(LOCAL_DATASET_PATH_PREFIX)) {
      const slug = path.slice(LOCAL_DATASET_PATH_PREFIX.length);
      return SAFE_DATASET_SLUG.test(slug) && AGENT_PUBLIC_DOC_DATASET_ID_SET.has(slug)
        ? trimmed
        : null;
    }
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (parsed.username || parsed.password || parsed.port) return null;
  if (isBlockedHostname(parsed.hostname)) return null;
  if (!ALLOWED_PUBLIC_HOSTS.has(normalizedHostname(parsed.hostname))) return null;
  return parsed.href;
}

function formatIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = ITALIAN_MONTHS[Number(match[2]) - 1];
  if (!month) return value;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function verifiedFacts(datasetId: string): AgentDatasetFacts | null {
  if (datasetId !== "mef_irpef_comunale") return null;
  const { period, coverage, source } = mefIrpefSourceMeta;
  return {
    period: [
      `Anno d'imposta: ${period.taxYear} — periodo economico delle variabili.`,
      `Dichiarazioni: ${period.declarationYear} — il MEF assegna il contribuente al Comune del domicilio fiscale al 31 dicembre dell'anno di presentazione della dichiarazione.`,
      `Pubblicazione della fonte MEF: ${formatIsoDate(period.publishedAt)}.`,
      `Osservazione dello snapshot: ${period.observedAt}.`,
    ],
    units: [
      "Contribuenti e frequenze: conteggi in unità di persone fisiche; il numero contribuenti non coincide con la frequenza del reddito complessivo.",
      "Ammontari monetari: interi in centesimi di euro; la fonte pubblica importi in euro e la conversione è esatta, senza aggiungere precisione.",
      "Variabili dichiarative MEF, non incassi di cassa.",
      "Le celle oscurate per tutela statistica restano parziali: null non è zero e non viene stimato.",
    ],
    coverage: `${coverage.municipalities} Comuni, ${coverage.provinces} Province e ${coverage.regions} Regioni; ${coverage.sourceRows} righe fonte con ${coverage.unassignedRows} riga Mancante/errata (${coverage.taxpayers.unassigned} contribuenti) tenuta separata e non distribuita sui territori.`,
    queryNotes: [
      "Il filtro year accetta solo l'anno d'imposta di riferimento (2024), non l'anno di dichiarazione.",
      "Il filtro level accetta region, province oppure municipality.",
      "Per i Comuni indica almeno uno fra code, query, region oppure province; code e query non insieme.",
    ],
    references: [
      { label: "Nota metodologica MEF 2024", url: source.methodologyUrl },
      { label: "Definizioni delle variabili MEF 2024", url: source.definitionsUrl },
      { label: `Licenza ${source.license}`, url: source.licenseUrl },
    ],
  };
}

function schemaDescription(schema: unknown): string | undefined {
  let current = schema as { description?: unknown; unwrap?: () => unknown } | undefined;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current.description === "string" && current.description.length > 0) {
      return current.description;
    }
    if (typeof current.unwrap !== "function") return undefined;
    current = current.unwrap() as typeof current;
  }
  return undefined;
}

function filterDescription(name: string): string {
  const shape = datasetQuerySchema.shape as Record<string, unknown>;
  return schemaDescription(shape[name]) ?? "Filtro dichiarato dal dataset.";
}

function isExampleQuerySupported(dataset: DatasetDescriptor): boolean {
  const keys = Object.keys(dataset.exampleQuery).filter((key) => key !== "dataset");
  if (keys.some((key) => !dataset.filters.includes(key))) return false;
  return datasetQuerySchema.safeParse(dataset.exampleQuery).success;
}

function buildAgentPublicDoc(dataset: DatasetDescriptor): AgentPublicDoc {
  const facts = verifiedFacts(dataset.id);
  const sources = dataset.sources.flatMap((source) => {
    const url = sanitizePublicUrl(source.url);
    if (!url) return [];
    return [{
      name: source.name,
      owner: source.owner,
      url,
      cadence: source.cadence,
      ...(source.license ? { license: source.license } : {}),
    }];
  });
  return {
    id: dataset.id,
    title: dataset.title,
    summary: dataset.summary,
    availability: `Integrazione ${dataset.integration === "active" ? "attiva" : "configurata"}; ${
      dataset.freshness === "snapshot" ? "snapshot verificato, senza query live nel rendering" : "fonte ufficiale live"
    }.`,
    period: facts?.period ?? [],
    units: facts?.units ?? [],
    coverage: facts?.coverage ?? "Copertura non rappresentata da un metadato stabile; dipende dalla risposta del dataset.",
    caveat: dataset.caveat ?? "Nessun caveat specifico dichiarato: conserva fonte, periodo e perimetro.",
    filters: dataset.filters.map((name) => ({ name, description: filterDescription(name) })),
    queryNotes: facts?.queryNotes ?? [],
    exampleQuery: JSON.parse(JSON.stringify(dataset.exampleQuery)) as Record<string, unknown>,
    sources,
    references: (facts?.references ?? []).flatMap((reference) => {
      const url = sanitizePublicUrl(reference.url);
      return url ? [{ label: reference.label, url }] : [];
    }),
    mcpEndpoint: "/api/mcp",
    httpEndpoint: dataset.id === "mef_irpef_comunale" ? "/api/territori/irpef" : null,
  };
}

function servedDescriptors(): DatasetDescriptor[] {
  return datasetCatalog.filter(
    (dataset) =>
      AGENT_PUBLIC_DOC_DATASET_ID_SET.has(dataset.id) && isExampleQuerySupported(dataset),
  );
}

const servedDocs = servedDescriptors().map(buildAgentPublicDoc);
const servedDocById = new Map<string, AgentPublicDoc>(servedDocs.map((doc) => [doc.id, doc]));

export function listAgentPublicDocs(): readonly AgentPublicDoc[] {
  return servedDocs;
}

export function getAgentPublicDoc(datasetId: string): AgentPublicDoc | null {
  return servedDocById.get(datasetId) ?? null;
}

function renderReferences(references: readonly AgentPublicReference[]): string[] {
  return references.flatMap((reference) => {
    const url = sanitizePublicUrl(reference.url);
    return url ? [`- [${escapeMarkdownText(reference.label)}](${url})`] : [];
  });
}

function longestBacktickRun(value: string): number {
  let longest = 0;
  for (const match of value.matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  return longest;
}

export function renderAgentsIndexMarkdown(): string {
  const docs = listAgentPublicDocs();
  const lines: string[] = [
    "# DVNS · indice per agenti",
    "",
    "Questa superficie pubblica espone in Markdown UTF-8 le schede dei dataset attivi realmente servite. Serve a leggere metadati, filtri, periodo, unità e limiti senza dipendere dai widget interattivi.",
    "",
    "Copertura iniziale: una sola scheda pubblicata, `mef_irpef_comunale`. L'indice non elenca l'intero catalogo MCP attivo: per il catalogo completo chiama `list_datasets` su `/api/mcp`.",
    "",
    "## Procedura d'uso",
    "",
    `1. Leggi questa pagina su \`${AGENTS_INDEX_PATH}\`.`,
    "2. Apri la scheda del dataset che ti serve.",
    "3. Per i dati chiama `list_datasets` e poi `query_dataset` su `/api/mcp` (Streamable HTTP, sola lettura).",
    "",
    "## Schede disponibili",
    "",
  ];
  if (docs.length === 0) {
    lines.push("Nessuna scheda disponibile.");
  } else {
    for (const doc of docs) {
      lines.push(`- [${escapeMarkdownText(doc.title)}](${agentDatasetPath(doc.id)}) — \`${doc.id}\`.`);
    }
  }
  lines.push("", "## Accesso ai dati", "");
  lines.push("- Endpoint MCP: `/api/mcp` (Streamable HTTP, `POST`, sola lettura).");
  lines.push("- Strumenti: `list_datasets` per l'elenco, `query_dataset` per l'interrogazione.");
  lines.push("", "## Riferimenti", "");
  const indexReferences = renderReferences([
    { label: "Dati", url: "/dati" },
    { label: "Pagina MCP", url: "/mcp" },
    { label: "Metodologia", url: "/metodologia" },
    { label: "Registro delle fonti", url: "/fonti" },
    { label: "Endpoint MCP", url: "/api/mcp" },
  ]);
  lines.push(...indexReferences);
  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderAgentPublicDocMarkdown(doc: AgentPublicDoc): string {
  const lines: string[] = [
    `# ${escapeMarkdownText(doc.title)}`,
    "",
    `Identificativo dataset: \`${doc.id}\`.`,
    "",
    escapeMarkdownText(doc.summary),
    "",
    "## Disponibilità",
    "",
    escapeMarkdownText(doc.availability),
    "",
    `Copertura: ${escapeMarkdownText(doc.coverage)}`,
    "",
    "## Periodo",
    "",
    ...doc.period.map((entry) => `- ${escapeMarkdownText(entry)}`),
    "",
    "## Unità e significato",
    "",
    ...doc.units.map((entry) => `- ${escapeMarkdownText(entry)}`),
    "",
    "## Fonti",
    "",
  ];
  const safeSources = doc.sources.flatMap((source) => {
    const url = sanitizePublicUrl(source.url);
    return url ? [{ ...source, url }] : [];
  });
  if (safeSources.length === 0) {
    lines.push("Fonti indicate nella risposta del dataset.");
  } else {
    for (const source of safeSources) {
      const license = source.license ? ` Licenza: ${escapeMarkdownText(source.license)}.` : "";
      lines.push(
        `- [${escapeMarkdownText(source.name)}](${source.url}) — ${escapeMarkdownText(source.owner)}. Cadenza: ${escapeMarkdownText(source.cadence)}.${license}`,
      );
    }
  }
  lines.push("", "## Filtri accettati", "");
  if (doc.filters.length === 0) {
    lines.push("Nessun filtro: il dataset risponde senza parametri.");
  } else {
    for (const filter of doc.filters) {
      lines.push(`- ${escapeMarkdownText(filter.name)}: ${escapeMarkdownText(filter.description)}`);
    }
  }
  if (doc.queryNotes.length > 0) {
    lines.push("", "## Note sui filtri", "");
    lines.push(...doc.queryNotes.map((note) => `- ${escapeMarkdownText(note)}`));
  }
  lines.push("", "## Esempio supportato", "");
  lines.push("Input conforme allo schema condiviso, riutilizzato dal descrittore del dataset:");
  const exampleJson = JSON.stringify(doc.exampleQuery, null, 2);
  const fence = "`".repeat(Math.max(3, longestBacktickRun(exampleJson) + 1));
  lines.push("", `${fence}json`, exampleJson, fence, "");
  lines.push("## Accesso ai dati", "");
  const mcpEndpoint = sanitizePublicUrl(doc.mcpEndpoint) ?? "/api/mcp";
  lines.push(`- MCP: \`${mcpEndpoint}\` (Streamable HTTP, \`POST\`, sola lettura). Chiama \`list_datasets\`, poi \`query_dataset\`.`);
  if (doc.httpEndpoint) {
    const httpUrl = sanitizePublicUrl(doc.httpEndpoint);
    if (httpUrl) {
      lines.push(
        `- API HTTP esistente: \`${httpUrl}\` (\`GET\`, JSON paginato) restituisce lo stesso snapshot; i nomi dei parametri sono in italiano e distinti dallo schema MCP condiviso.`,
      );
    }
  }
  lines.push("", "La scheda è leggibile via HTTP; l'esecuzione della query richiede un client MCP compatibile.");
  lines.push("", "## Limiti", "", escapeMarkdownText(doc.caveat));  lines.push("", "## Riferimenti", "");
  lines.push(`- [Indice per agenti](${AGENTS_INDEX_PATH})`);
  lines.push(...renderReferences(doc.references));
  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderAgentDatasetMarkdown(datasetId: string): string | null {
  const doc = getAgentPublicDoc(datasetId);
  return doc ? renderAgentPublicDocMarkdown(doc) : null;
}
