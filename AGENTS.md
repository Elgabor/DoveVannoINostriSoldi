## Continuità del lavoro

Prima di fermarti, chiediti: “C’è un prossimo passo che l’utente vorrebbe che io facessi?” Se sì, continua: il lavoro non è finito.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Lavorare in questo repository

- Per task leggi `docs/AGENT_CONTEXT.md`; se non copre, parti da
  `docs/ARCHITECTURE.md` (percorsi del dato) e `CONTRIBUTING.md` (setup e gate).
  Non servono database, Docker o credenziali per avviare il sito.
- MCP/API: leggi «MCP e API» in `docs/AGENT_CONTEXT.md` prima di toccare
  `src/lib/mcp/`. `/api/dati/[dataset]` è il corpus integrato, non un ID MCP.
- Percorsi: pagine/API `src/app/`; UI `src/components/`; adapter e aggregazioni
  `src/lib/`; contratti `src/lib/data/`; acquisizione `scripts/etl/`.
- Validazione e provenance restano al confine degli snapshot; il corpus integrato
  pubblico passa da `integrated-public-view.ts` e nessuna riga raw entra nei
  Client Component. Zero, dato mancante e cella oscurata restano distinti.
- Parti da `git status --short --branch`. Per lavoro isolato usa un worktree con
  `node_modules`, `.venv`, `.next` e porta propri. Non copiare `.env` o
  condividere `.next` tra checkout.
- Test mirati: `node --experimental-strip-types --test tests/NOME.test.mjs`
  (`--test-name-pattern='testo'` per un caso); ETL con virtualenv attivo:
  `DVNS_OFFLINE_GUARD=1 PYTHONPATH=scripts/etl:scripts/ci python -m unittest discover -s tests/etl -p 'test_NOME.py'`.
- `npm run typecheck` genera prima i tipi Next anche senza `next dev`; leggi le
  guide della versione installata nel blocco Next qui sopra.
- Prima della consegna: `npm run ci:static`, `npm run ci:action-pins`, `npm test`,
  `npm run test:etl`, `npm run test:snapshots`, `npm run build`,
  `NEXT_PORT=PORTA_LIBERA npm run test:production`, `git diff --check`.
  Per ETL e snapshot attiva il network guard come in CONTRIBUTING.
- Il runner di produzione possiede il server e lo termina anche in errore. Log:
  `artifacts/production/next.log`; browser e screenshot: `artifacts/browser/`;
  Lighthouse: `.lighthouseci/`.
- Socket e Chromium richiedono loopback. `listen EPERM` è un limite d'ambiente,
  non una regressione; il build scarica Geist da Google Fonts. Distingui rete da
  errori di contratto; non disattivare i gate per un verde.
- `npm run bench:runtime` misura gli hot path offline. Confronta revisioni sullo
  stesso runtime e a macchina libera, conservando anche i digest.
