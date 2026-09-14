import { pathToFileURL } from "node:url";

const REQUIRED_INDEX_LINKS = ["/api/mcp", "/dati", "/mcp", "/metodologia", "/fonti"];
const REQUIRED_CARD_FIELDS = ["title", "summary", "availability", "coverage", "caveat", "mcpEndpoint"];

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes fenced code blocks, inline code spans and HTML comments in document
 * order, so a literal `<!--` inside a fence or code span never opens a comment,
 * and a fence marker inside a comment never opens a fence. Contracts kept:
 * - fences: backtick/tilde, opening at line start with optional info string
 *   (no backticks in a backtick info string), closing with the same marker,
 *   length at least the opening, and only spaces after; unclosed to EOF;
 * - code spans: any backtick run length, closed only by a run of equal length,
 *   not crossing a blank line;
 * - comments: closed or unclosed (to EOF).
 */
export function visibleMarkdown(markdown) {
  const text = String(markdown ?? "");
  let out = "";
  let i = 0;
  while (i < text.length) {
    const atLineStart = i === 0 || text[i - 1] === "\n";
    if (atLineStart) {
      const lineEnd = text.indexOf("\n", i);
      const line = lineEnd === -1 ? text.slice(i) : text.slice(i, lineEnd);
      const opening = line.match(/^[ \t]*(`{3,}|~{3,})([^\n]*)$/);
      const isFence = opening && (opening[1][0] === "~" || !opening[2].includes("`"));
      if (isFence) {
        const char = opening[1][0];
        const minLength = opening[1].length;
        let j = lineEnd === -1 ? text.length : lineEnd + 1;
        while (j < text.length) {
          const closeEnd = text.indexOf("\n", j);
          const closeLine = closeEnd === -1 ? text.slice(j) : text.slice(j, closeEnd);
          const closing = closeLine.match(/^[ \t]*(`{3,}|~{3,})[ \t]*\r?$/);
          j = closeEnd === -1 ? text.length : closeEnd + 1;
          if (closing && closing[1][0] === char && closing[1].length >= minLength) break;
        }
        i = lineEnd === -1 ? text.length : j;
        continue;
      }
    }
    const char = text[i];
    if (char === "`") {
      let run = 0;
      while (text[i + run] === "`") run += 1;
      let j = i + run;
      let close = -1;
      while (j < text.length) {
        if (text[j] === "`") {
          let k = 0;
          while (text[j + k] === "`") k += 1;
          if (k === run) {
            close = j;
            break;
          }
          j += k;
        } else if (text[j] === "\n") {
          if (/^\n[ \t]*\n/.test(text.slice(j))) break;
          j += 1;
        } else {
          j += 1;
        }
      }
      if (close !== -1) {
        i = close + run;
        continue;
      }
      // A maximal backtick run without a matching closer is literal text.
      out += "`".repeat(run);
      i += run;
      continue;
    }
    if (char === "<" && text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i + 4);
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    out += char;
    i += 1;
  }
  return out;
}

/** Targets of effective Markdown links, ignoring fences, comments and inline code. */
export function markdownLinkTargets(markdown) {
  const pattern = /\]\(([^)\s]+)\)/g;
  return [...visibleMarkdown(markdown).matchAll(pattern)].map((match) => match[1]);
}

/**
 * Pure coverage/contract check over a snapshot derived from the renderer.
 * `snapshot.cards` are the projected docs, so this never queries data.
 */
export function checkAgentPublicDocs(snapshot) {
  const {
    activeIds = [],
    configuredIds = [],
    indexIds = [],
    cards = [],
    indexMarkdown = "",
    requiredIndexLinks = REQUIRED_INDEX_LINKS,
    datasetPathPrefix = "/for-agents/datasets/",
    sanitizePublicUrl,
    schema,
  } = snapshot;
  const problems = [];
  const add = (id, field, reason) => problems.push({ id: id ?? "catalogo", field, reason });

  for (const id of duplicates(activeIds)) add(id, "active-id", "identificativo attivo duplicato");
  for (const id of duplicates(indexIds)) add(id, "index-id", "voce d'indice duplicata");
  const cardIds = cards.map((card) => card?.id);
  for (const id of duplicates(cardIds)) add(id, "card-id", "scheda duplicata per lo stesso id");

  const activeSet = new Set(activeIds);
  const indexSet = new Set(indexIds);
  const cardSet = new Set(cardIds);
  const configuredSet = new Set(configuredIds);

  for (const id of activeIds) {
    if (!indexSet.has(id)) add(id, "index", "dataset attivo assente dall'indice");
    if (!cardSet.has(id)) add(id, "card", "dataset attivo senza scheda servita");
  }
  for (const id of indexIds) {
    if (activeSet.has(id)) continue;
    add(
      id,
      configuredSet.has(id) ? "configured" : "index",
      configuredSet.has(id)
        ? "dataset configurato esposto nell'indice"
        : "voce d'indice non presente fra gli attivi",
    );
  }
  for (const id of cardIds) {
    if (activeSet.has(id)) continue;
    add(
      id,
      configuredSet.has(id) ? "configured" : "card",
      configuredSet.has(id)
        ? "dataset configurato con scheda servita"
        : "scheda non presente fra gli attivi",
    );
  }

  const indexLinkTargets = new Set(markdownLinkTargets(indexMarkdown));
  for (const path of requiredIndexLinks) {
    if (!indexLinkTargets.has(path)) {
      add(null, "index-link", `link richiesto assente dall'indice: ${path}`);
    }
  }

  for (const card of cards) {
    const id = card?.id ?? "sconosciuto";
    for (const field of REQUIRED_CARD_FIELDS) {
      if (!isNonEmptyString(card?.[field])) {
        add(id, field, `campo obbligatorio mancante o vuoto: ${field}`);
      }
    }
    if (!Array.isArray(card?.filters)) add(id, "filters", "elenco filtri mancante");
    if (!card?.exampleQuery || typeof card.exampleQuery !== "object") {
      add(id, "exampleQuery", "esempio mancante");
    }
    for (const field of ["period", "units"]) {
      const entries = card?.[field];
      if (
        !Array.isArray(entries) ||
        entries.length === 0 ||
        entries.some((entry) => !isNonEmptyString(entry))
      ) {
        add(id, field, `campo obbligatorio mancante o vuoto: ${field}`);
      }
    }
    const declaredSourceUrls = card?.declaredSourceUrls;
    const declaredReferenceUrls = card?.declaredReferenceUrls;
    if (!Array.isArray(declaredSourceUrls)) {
      add(id, "declaredSourceUrls", "campo obbligatorio mancante o non array: declaredSourceUrls");
    }
    if (!Array.isArray(declaredReferenceUrls)) {
      add(id, "declaredReferenceUrls", "campo obbligatorio mancante o non array: declaredReferenceUrls");
    }
    const sourceUrls = Array.isArray(declaredSourceUrls) ? declaredSourceUrls : [];
    const referenceUrls = Array.isArray(declaredReferenceUrls) ? declaredReferenceUrls : [];
    if (!Array.isArray(card?.sources)) {
      add(id, "sources", "elenco fonti mancante");
    } else if (sourceUrls.length > 0 && card.sources.length === 0) {
      add(id, "sources", "elenco fonti vuoto nonostante fonti dichiarate dal descriptor");
    }
    if (!Array.isArray(card?.references)) add(id, "references", "elenco riferimenti mancante");
    if (typeof sanitizePublicUrl === "function" && sanitizePublicUrl(card?.methodologyUrl) !== "/metodologia") {
      add(id, "methodology-link", "link di metodologia mancante o non ammesso: /metodologia");
    }

    const routePath = `${datasetPathPrefix}${id}`;
    if (typeof sanitizePublicUrl === "function" && sanitizePublicUrl(routePath) === null) {
      add(id, "route-link", `link di scheda non ammesso: ${routePath}`);
    }
    for (const url of sourceUrls) {
      if (typeof sanitizePublicUrl === "function" && sanitizePublicUrl(url) === null) {
        add(id, "source-url", `URL fonte non ammesso: ${String(url)}`);
      }
    }
    for (const url of referenceUrls) {
      if (typeof sanitizePublicUrl === "function" && sanitizePublicUrl(url) === null) {
        add(id, "reference-url", `URL riferimento non ammesso: ${String(url)}`);
      }
    }
    for (const source of Array.isArray(card?.sources) ? card.sources : []) {
      if (typeof sanitizePublicUrl === "function" && sanitizePublicUrl(source?.url) === null) {
        add(id, "source-url", `URL fonte non ammesso: ${String(source?.url)}`);
      }
    }
    for (const reference of Array.isArray(card?.references) ? card.references : []) {
      if (typeof sanitizePublicUrl === "function" && sanitizePublicUrl(reference?.url) === null) {
        add(id, "reference-url", `URL riferimento non ammesso: ${String(reference?.url)}`);
      }
    }

    if (!card?.exampleQuery || typeof card.exampleQuery !== "object") continue;
    if (card.exampleQuery.dataset !== id) {
      add(
        id,
        "example-dataset",
        `dataset dell'esempio non coincide con l'identificativo della scheda: ${String(card.exampleQuery.dataset)}`,
      );
    }
    const filterNames = new Set((card.filters ?? []).map((filter) => filter?.name));
    const keys = Object.keys(card.exampleQuery).filter((key) => key !== "dataset");
    const undeclared = keys.filter((key) => !filterNames.has(key));
    if (undeclared.length > 0) {
      add(id, "example-keys", `chiavi esempio non dichiarate fra i filtri: ${undeclared.join(", ")}`);
    }
    const parsed = schema.safeParse(card.exampleQuery);
    const published = card.exampleError === null || card.exampleError === undefined;
    if (published && !parsed.success) {
      add(id, "example", "esempio pubblicato non accettato da datasetQuerySchema");
    }
    if (!published && parsed.success && undeclared.length === 0) {
      add(id, "example-error", "esempio valido ma segnalato come errore dalla scheda");
    }
  }

  return problems;
}

export function runAgentPublicDocsCheck(snapshot, io = {}) {
  const write = io.stdout ?? ((line) => process.stdout.write(line));
  const writeError = io.stderr ?? ((line) => process.stderr.write(line));
  const problems = checkAgentPublicDocs(snapshot);
  const flagged = snapshot.cards.filter((card) => card.exampleError !== null && card.exampleError !== undefined).length;
  if (problems.length === 0) {
    write(
      `PASS agent-public-docs: ${snapshot.activeIds.length} active, ${snapshot.indexIds.length} indice, ${snapshot.cards.length} schede` +
        (flagged > 0 ? `; ${flagged} esempio/i non pubblicato/i e segnalato/i` : "") +
        "\n",
    );
    return 0;
  }
  for (const problem of problems) {
    writeError(`FAIL ${problem.id} [${problem.field}]: ${problem.reason}\n`);
  }
  writeError(`agent-public-docs: ${problems.length} problema/i\n`);
  return 1;
}

export function parseAgentIndexIds(indexMarkdown, datasetPathPrefix) {
  const pattern = new RegExp(`\\]\\(${escapeRegExp(datasetPathPrefix)}([a-z0-9_]+)\\)`, "g");
  return [...visibleMarkdown(indexMarkdown).matchAll(pattern)].map((match) => match[1]);
}

export async function buildAgentPublicDocsSnapshot() {
  await import("./register-source-alias.mjs");
  const docs = await import("../../src/lib/agent-public-docs.ts");
  const { datasetCatalog, registeredDatasetCatalog } = await import("../../src/lib/mcp/catalog.ts");
  const { datasetQuerySchema } = await import("../../src/lib/mcp/query-schema.ts");
  const datasetPathPrefix = `${docs.AGENTS_INDEX_PATH}/datasets/`;
  const indexMarkdown = docs.renderAgentsIndexMarkdown();
  return {
    activeIds: datasetCatalog.map((dataset) => dataset.id),
    configuredIds: registeredDatasetCatalog
      .filter((dataset) => dataset.integration === "configured")
      .map((dataset) => dataset.id),
    indexIds: parseAgentIndexIds(indexMarkdown, datasetPathPrefix),
    indexMarkdown,
    requiredIndexLinks: REQUIRED_INDEX_LINKS,
    cards: docs.listAgentPublicDocs(),
    datasetPathPrefix,
    sanitizePublicUrl: docs.sanitizePublicUrl,
    schema: datasetQuerySchema,
  };
}

const invokedDirectly =
  typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const snapshot = await buildAgentPublicDocsSnapshot();
  process.exitCode = runAgentPublicDocsCheck(snapshot);
}
