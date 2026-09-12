#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..", "..");

// Documenti posseduti dal sistema di contesto: il checker non segue ricorsivamente
// gli altri documenti del repository, ne verifica soltanto l'esistenza quando sono
// referenziati.
const OWNED_DOCUMENTS = [
  "AGENTS.md",
  "CLAUDE.md",
  "docs/AGENT_CONTEXT.md",
];

const MAP_DOCUMENT = "docs/AGENT_CONTEXT.md";
const CLAUDE_DOCUMENT = "CLAUDE.md";
const AGENTS_DOCUMENT = "AGENTS.md";

// Sezioni obbligatorie nella mappa; il ticket 02 estende questo elenco.
const REQUIRED_MAP_SECTIONS = ["## Ingresso", "## MCP e API"];

// Collegamento AGENTS -> mappa e percorso di fallback verso ARCHITECTURE.
const AGENTS_REQUIRED_REFERENCES = ["docs/AGENT_CONTEXT.md", "docs/ARCHITECTURE.md"];
// Percorso ad ARCHITECTURE dentro la mappa.
const MAP_ARCHITECTURE_REFERENCE = "ARCHITECTURE.md";
const CLAUDE_BRIDGE = "@AGENTS.md";

const INLINE_LINK_RE = /\[([^\]]*)\]\(([^()\s]+)\)/g;
const EXTERNAL_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const FENCE_RE = /^(`{3,}|~{3,})/;
const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/;

class UsageError extends Error {}

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function safeRealpath(target) {
  try {
    return fs.realpathSync(target);
  } catch {
    return null;
  }
}

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function linesOutsideFences(lines) {
  const outside = new Set();
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const match = FENCE_RE.exec(lines[index].trimStart());
    if (match) {
      const marker = match[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence === null) outside.add(index);
  }
  return outside;
}

function extractHeadings(content) {
  const lines = content.split("\n");
  const outside = linesOutsideFences(lines);
  const headings = new Set();
  lines.forEach((line, index) => {
    if (!outside.has(index)) return;
    const match = HEADING_RE.exec(line);
    if (match) headings.add(slugify(match[2]));
  });
  return headings;
}

function readOwnedDocuments(root, violations) {
  const documents = new Map();
  const realRoot = safeRealpath(root) ?? path.resolve(root);
  for (const relative of OWNED_DOCUMENTS) {
    const absolute = path.join(root, relative);
    const real = safeRealpath(absolute) ?? absolute;
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      violations.push({ file: relative, line: 1, message: `documento posseduto mancante: ${relative}` });
      continue;
    }
    if (!isWithin(realRoot, real)) {
      violations.push({ file: relative, line: 1, message: `documento posseduto fuori dalla root: ${relative}` });
      continue;
    }
    const content = fs.readFileSync(absolute, "utf8");
    documents.set(relative, {
      absolute,
      content,
      lines: content.split("\n"),
      headings: extractHeadings(content),
    });
  }
  return { documents, realRoot };
}

function checkMandatoryReferences(documents, violations) {
  const agents = documents.get(AGENTS_DOCUMENT);
  if (agents) {
    for (const reference of AGENTS_REQUIRED_REFERENCES) {
      if (!agents.content.includes(reference)) {
        violations.push({
          file: AGENTS_DOCUMENT,
          line: 1,
          message: `manca il riferimento obbligatorio '${reference}' in ${AGENTS_DOCUMENT}`,
        });
      }
    }
  }

  const map = documents.get(MAP_DOCUMENT);
  if (map) {
    for (const section of REQUIRED_MAP_SECTIONS) {
      const present = map.lines.some((line) => line.trim() === section);
      if (!present) {
        violations.push({
          file: MAP_DOCUMENT,
          line: 1,
          message: `manca la sezione obbligatoria '${section}' in ${MAP_DOCUMENT}`,
        });
      }
    }
    if (!map.content.includes(MAP_ARCHITECTURE_REFERENCE)) {
      violations.push({
        file: MAP_DOCUMENT,
        line: 1,
        message: `manca il percorso ad ARCHITECTURE in ${MAP_DOCUMENT}`,
      });
    }
  }

  const claude = documents.get(CLAUDE_DOCUMENT);
  if (claude && !claude.content.includes(CLAUDE_BRIDGE)) {
    violations.push({
      file: CLAUDE_DOCUMENT,
      line: 1,
      message: `manca il ponte ${CLAUDE_BRIDGE} in ${CLAUDE_DOCUMENT}`,
    });
  }
}

function checkLinkTarget(documentName, document, root, realRoot, documents, violations, target, line) {
  if (EXTERNAL_SCHEME_RE.test(target) || target.startsWith("//")) return;

  const hashIndex = target.indexOf("#");
  const pathPart = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? "" : target.slice(hashIndex + 1);

  if (pathPart === "") {
    if (anchor && !document.headings.has(anchor)) {
      violations.push({ file: documentName, line, message: `ancora locale assente: #${anchor}` });
    }
    return;
  }

  const resolved = path.resolve(path.dirname(document.absolute), pathPart);
  if (!isWithin(root, resolved)) {
    violations.push({ file: documentName, line, message: `riferimento fuori dalla root: ${target}` });
    return;
  }
  if (!fs.existsSync(resolved)) {
    violations.push({ file: documentName, line, message: `target assente: ${target}` });
    return;
  }

  const real = safeRealpath(resolved);
  if (real && !isWithin(realRoot, real)) {
    violations.push({ file: documentName, line, message: `riferimento fuori dalla root (symlink): ${target}` });
    return;
  }

  if (!anchor) return;
  const relativeTarget = path.relative(root, resolved);
  if (!OWNED_DOCUMENTS.includes(relativeTarget)) return;
  const targetDocument = documents.get(relativeTarget);
  if (targetDocument && !targetDocument.headings.has(anchor)) {
    violations.push({ file: documentName, line, message: `ancora assente in ${relativeTarget}: #${anchor}` });
  }
}

function checkDocumentLinks(documentName, document, root, realRoot, documents, violations) {
  const outside = linesOutsideFences(document.lines);
  document.lines.forEach((line, index) => {
    if (!outside.has(index)) return;
    INLINE_LINK_RE.lastIndex = 0;
    let match;
    while ((match = INLINE_LINK_RE.exec(line)) !== null) {
      checkLinkTarget(documentName, document, root, realRoot, documents, violations, match[2], index + 1);
    }
  });
}

export function checkAgentContext(options = {}) {
  const root = path.resolve(options.root ?? DEFAULT_ROOT);
  const violations = [];
  const { documents, realRoot } = readOwnedDocuments(root, violations);
  checkMandatoryReferences(documents, violations);
  for (const [name, document] of documents) {
    checkDocumentLinks(name, document, root, realRoot, documents, violations);
  }
  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.message.localeCompare(b.message));
  return violations;
}

export function parseArgs(argv) {
  const options = { root: undefined, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--root") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("-")) throw new UsageError("--root richiede un valore");
      options.root = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--root=")) {
      const value = arg.slice("--root=".length);
      if (!value) throw new UsageError("--root richiede un valore");
      options.root = value;
      continue;
    }
    throw new UsageError(`opzione o argomento non supportato: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Uso: node scripts/ci/check-agent-context.mjs [--root DIR]",
    "",
    "Verifica i riferimenti di AGENTS.md, del ponte CLAUDE.md e di docs/AGENT_CONTEXT.md.",
    "  --root DIR  radice del repository da controllare (default: radice dello script)",
    "  --help      mostra questo messaggio",
    "",
    "Exit code: 0 valido, 1 violazioni, 2 uso errato.",
  ].join("\n");
}

export function main(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.stderr.write(`ERRORE: ${error.message}\n${usage()}\n`);
    return 2;
  }
  if (options.help) {
    io.stdout.write(`${usage()}\n`);
    return 0;
  }
  const violations = checkAgentContext({ root: options.root });
  if (violations.length > 0) {
    for (const violation of violations) {
      io.stderr.write(`${violation.file}:${violation.line}: ${violation.message}\n`);
    }
    io.stderr.write(`${violations.length} problema/i nel contesto agenti.\n`);
    return 1;
  }
  io.stdout.write("Contesto agenti valido: AGENTS.md, ponte CLAUDE.md e docs/AGENT_CONTEXT.md.\n");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  process.exitCode = main();
}
