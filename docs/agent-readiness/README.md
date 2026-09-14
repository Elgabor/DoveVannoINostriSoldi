# Agent readiness — registro fork-only

Questa cartella conserva sul fork la specifica, il tracker e il protocollo di verifica del lavoro sul context engineering. È documentazione di progetto per la revisione interna del fork, non materiale destinato alla PR finale verso upstream.

## Cosa contiene

- SPEC.md: specifica approvata v3 e criteri di accettazione.
- TICKETS.md: stato corrente dei ticket 01–08 e associazione ai due branch implementativi.
- CHECKS.md: controlli deterministici e confronto A/B leggero.
- I report dettagliati, transcript, fixture, risultati grezzi e STATE.json restano sotto .scratch/agent-readiness-v2/ e non vengono versionati.

## Stato attuale

La PR unica #8 sul fork riunisce il lavoro dei branch repository-context e public-access. Il prodotto è nel branch codex/agent-public-access-v2; il suo HEAD corrente è 8062b7e5. I check specifici dell'iniziativa risultano validi: il contesto agenti passa e la copertura pubblica è 61/61/61.

Il confronto repository A/B ha verificato la correttezza degli orientamenti, ma non ha dimostrato un risparmio misurato di token. Il confronto pubblico A/B è NOT_RUN. Non va quindi dichiarata una percentuale di token risparmiati.

## Confine fork/upstream

Il fork può conservare questa cartella per rendere verificabile il percorso. Quando si preparerà la PR dal fork verso upstream, si dovrà creare un branch di delivery pulito e includere solo i percorsi prodotto:

- AGENTS.md
- docs/AGENT_CONTEXT.md
- package.json
- public/llms.txt
- scripts/ci/check-agent-context.mjs
- scripts/ci/check-agent-public-docs.mjs
- src/app/for-agents/datasets/[dataset]/route.ts
- src/app/for-agents/route.ts
- src/app/mcp/page.tsx
- src/lib/agent-public-docs.ts
- src/lib/mcp/catalog.ts
- src/lib/mcp/query-schema.ts
- tests/mcp-route.test.mjs

Da escludere sempre dall'export upstream: docs/agent-readiness/, .scratch/, report, transcript, fixture, artifact e STATE.json. La PR #8 interna al fork può contenere la cartella fork-only; la futura PR upstream non deve essere aperta direttamente usando quel diff senza prima applicare questo filtro.

## Regola di aggiornamento

Se cambiano i contratti, i percorsi, i gate o il comportamento pubblico, aggiornare nello stesso lavoro AGENTS.md o docs/AGENT_CONTEXT.md, il codice/checker pertinente e questa documentazione fork-only. TICKETS.md deve riflettere gli SHA e gli esiti realmente verificati; nessun documento può sostituire un test eseguito.
