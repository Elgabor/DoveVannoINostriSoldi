# Ticket correnti — versione 3

Documento di stato mantenuto sul fork. Ticket 01–08 completati; ticket 08 ha superato review indipendente (correzioni discoverability `65c43490`+`5b22692`, W1/W2/W3 PASS, A/B NOT_RUN). La PR unica #8 riunisce i due filoni. `8062b7e5` resta il commit storico di composizione; la riconciliazione con `origin/main` è registrata dai merge `de39e185` (public-access) e `5fbd44ad` (readiness). Il tip corrente si ricava da Git e dalla PR, senza duplicarlo in questo documento. Esecuzione sequenziale; un ticket per sessione, seguito da review indipendente. Specifica: [SPEC.md](SPEC.md).

| ID | Risultato | Dipende da | Branch | Stato |
|---|---|---|---|---|
| 01 | Ingresso compatto, percorso MCP e primo controllo CI | — | codex/agent-readiness-v2-upstream | DONE |
| 02 | Mappa completa dei domini e vincoli di copertura | 01 | codex/agent-readiness-v2-upstream | DONE |
| 03 | Verifica repository prima/dopo e consegna del primo branch | 02 | codex/agent-readiness-v2-upstream | DONE |
| 04 | Percorso pubblico completo per una scheda IRPEF | 03 | codex/agent-public-access-v2 | DONE |
| 05 | Schede per tutto il catalogo attivo | 04 | codex/agent-public-access-v2 | DONE |
| 06 | Discovery e informazioni essenziali nel contenuto server | 05 | codex/agent-public-access-v2 | DONE |
| 07 | Copertura pubblica bloccante in CI e regressioni HTTP | 06 | codex/agent-public-access-v2 | DONE |
| 08 | Verifica pubblica prima/dopo e consegna finale | 07 | codex/agent-public-access-v2 | DONE |

## Regole comuni di completamento

- Applicare S6 della specifica e AGENTS vigente. Le autorizzazioni non si estendono a PR, upstream, merge o deploy.
- Ogni ticket registra localmente base/head, file cambiati, comandi con esito, limiti, review e SHA remoto verificato. Stati: READY, IN_PROGRESS, REVIEW_REQUIRED, CHANGES_REQUESTED, DONE; BLOCKED soltanto con impedimento concreto. Un documento scritto non completa un ticket di codice.
- Commit e push selettivi al fork al termine di ogni ticket con prodotto, dopo review. Se non c'è diff prodotto: NO_PRODUCT_DIFF, report locale, nessun commit vuoto. I documenti di pianificazione e le evidenze restano sotto `.scratch/agent-readiness-v2/`; questa copia curata è l'eccezione fork-only e deve essere esclusa dall'export upstream.
- I refactoring scoperti fuori ambito si descrivono in un appunto locale con problema, percorso e conseguenza; chiedere prima di aprire un'issue upstream. Nessuna apertura preventiva di issue per il piano.
- Salvare i report in `reports/NN-implementation.md` e `reports/NN-review.md` sotto `.scratch/agent-readiness-v2/`. Creare tali file durante l'esecuzione, senza dichiarare test futuri come eseguiti.
