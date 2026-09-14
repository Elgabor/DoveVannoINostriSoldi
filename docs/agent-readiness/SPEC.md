# DVNS — lettura per agenti e contesto essenziale

Versione 3, 12 settembre 2026. Direzione semplificata approvata da Lorenzo. La specifica nasceva come tracker locale; questa copia curata è versionata soltanto sul fork per la revisione interna e resta esclusa dalla futura PR verso upstream. Questa specifica e i ticket 01–08 sostituiscono il precedente piano R01–R12/P01–P06; il laboratorio precedente è storico, non un prerequisito. Nessuna implementazione di prodotto era presente al momento della stesura.

## S1. Obiettivo e risultato atteso

Due risultati: (a) un agent che lavora nel repository trova i contratti pertinenti senza leggere indiscriminatamente tutti i documenti; (b) un agent che visita DVNS trova dataset, fonte, periodo, unità, metodologia e accesso ai dati senza dipendere dai widget interattivi.

L'ottimizzazione riguarda il contesto effettivamente necessario e la facilità di reperimento. Non promette una percentuale universale di risparmio o prestazioni superiori per ogni modello. Il miglioramento è valido se mantiene correttezza e informazioni obbligatorie. La completezza di copertura del sito e dei domini resta un requisito; si riduce il laboratorio, non l'ambito del prodotto.

## S2. Stato reale e fonti da riusare

Base aggiornata dopo fetch e fast-forward del 12 settembre 2026: `355038467f4c5251f5bfb5c44bdc3c15bd9bde24`; branch `codex/agent-readiness-v2`. La prima fase rimane su questo branch. La seconda usa `codex/agent-public-access-v2` dalla stessa base verificata o da un nuovo upstream esplicitamente riconciliato; non porta con sé la storia della prima fase. Nessun reset del lavoro altrui.

- `AGENTS.md` contiene indicazioni Next, confini dei dati e comandi; `CLAUDE.md` importa AGENTS. Nel checkout principale la sezione personale «Continuità del lavoro» è presente: preservarla e includerla nell'ingresso finale tramite `AGENTS.approved.patch`, senza modificare il checkout principale.
- `CONTRIBUTING.md` e `docs/ARCHITECTURE.md` sono già le fonti per setup e flusso del dato. `.agents/skills/import-dvns-dataset/SKILL.md` e `.agents/skills/verify-dvns-integrated-sources/SKILL.md` contengono procedure da collegare, non ricopiare.
- `public/llms.txt`, `src/lib/public-discovery.ts`, `/mcp`, `/api/mcp`, `/fonti`, `/metodologia` e API dati sono presenti. `src/lib/mcp/catalog.ts` espone `datasetCatalog` con le sole voci active; `registeredDatasetCatalog` include anche configured.
- `src/lib/mcp/query-schema.ts` e `queryPublicDataset` in `datasets.ts` sono il contratto e il dispatcher esistenti. L'API `/api/dati/[dataset]` riguarda il corpus integrato, non qualsiasi ID del catalogo MCP: non inventare equivalenze fra namespace.
- La baseline include ora il PIL Eurostat e i nuovi filtri SIOPE non comunali. La mappa repository deve coprire anche questi domini e rimandare a docs/ASSISTENTE.md per task sull’assistente; il suo nuovo servizio quota non cambia il fatto che l’avvio base del sito e la lettura snapshot non richiedano database. Non implementare o configurare quota/provider in questo lavoro.
- I nuovi artifact di prodotto devono riusare queste fonti. Non implementare una seconda pipeline dati, un altro MCP, un router semantico o una piattaforma di valutazione.

## S3. Contesto repository

### S3.1 Ingresso e lettura progressiva

AGENTS mantiene regole essenziali universali e puntatori con condizioni esplicite: «Se modifichi X, leggi Y prima della modifica». La root non deve obbligare a leggere tutte le fonti ad ogni task. Preservare integralmente il blocco delimitato BEGIN/END nextjs-agent-rules; preservare continuità, autorità, privacy e invarianti del dato. Le istruzioni operative spostate devono avere una destinazione e un puntatore attivo.

`docs/AGENT_CONTEXT.md` è una mappa Markdown per le attività, non una specifica progettuale. Ogni sezione riporta quando serve, 2–5 fonti iniziali realmente pertinenti, invarianti particolari e dove trovare i controlli. Una task trasversale legge l'unione delle sezioni pertinenti. Per una task sconosciuta: cercare percorsi e contratti effettivi, dichiarare l'incertezza; nessuna classificazione automatica fittizia.

Gruppi da coprire: MCP/API; UI/browser; runtime/CI; acquisizione/snapshot; finanza/territori; progetti/enti e altri dataset attivi. Si parte da MCP nel ticket 01, poi il ticket 02 completa tutte le sezioni e la matrice delle famiglie. I documenti specialistici restano nei percorsi esistenti; nuovi AGENTS annidati solo se una regola si applica realmente a tutta quella directory e riduce duplicazione. Nessuna configurazione globale OpenCode o caricamento wildcard di tutte le istruzioni.

La porzione scritta manualmente di AGENTS non deve crescere rispetto alla base più la patch personale: misurare byte e parole, separatamente dal blocco Next. Non sacrificare regole necessarie per ottenere un numero; spiegare e correggere la struttura se il vincolo non è rispettabile. La mappa caricata su richiesta non si somma al contesto iniziale finché non viene letta.

### S3.2 Controllo CI minimo

Un solo script Node senza nuove dipendenze, `scripts/ci/check-agent-context.mjs`, controlla AGENTS, il ponte CLAUDE e i riferimenti della mappa. Entry point: `node scripts/ci/check-agent-context.mjs`, più `--root DIR` per prove in fixture locali. Exit 0 quando valido, 1 per violazioni con file/linea/motivo su stderr, 2 per uso CLI errato. Nessuna write o rete; l'importazione del modulo non avvia la CLI.

Il checker legge solo i documenti posseduti dal sistema di contesto; niente scansione generale del codice o parser Markdown universale. Supportare link Markdown inline locali semplici, normalizzati rispetto al file, e ancore locali verso heading dei documenti posseduti; per fonti esterne alla mappa verificare il file, non tutte le ancore dei documenti esistenti. Rifiutare link locali fuori repository, target assente e sezioni obbligatorie mancanti. Ignorare URL HTTP per questa verifica offline e i blocchi di codice. Preservazione dei byte Next e bilancio di tutte le istruzioni restano anche criteri della review locale, non un hash hardcoded che blocchi futuri upgrade Next.

Nel ticket 01 sono obbligatori ingresso, sezione MCP e collegamento al resto dell'architettura; nel ticket 02 si estende l'insieme delle sezioni obbligatorie. La verifica meccanica non prova da sola copertura semantica: una matrice locale di famiglie→sezione→fonte ne rende revisionabile la completezza.

Aggiungere `agent-context:check` agli script npm e richiamarlo da `ci:static`, preservando i controlli esistenti. Il job required già dipende dalla fase statica: non modificare ruleset o permessi. Nessun file sotto .scratch deve essere necessario in CI. Il checker è prodotto; i suoi nuovi test rimangono locali.

## S4. Lettura pubblica del sito

### S4.1 Percorso HTTP leggibile

Estendere la discovery esistente con `/for-agents` e `/for-agents/datasets/[dataset]`, serviti come Markdown UTF-8 tramite Route Handler. Prima di creare, verificare che i percorsi non esistano già. `/for-agents` contiene una breve procedura d'uso e l'indice ID/titolo/link delle voci attive, non tutte le righe di dati. Collegare anche Dati, Fonti e Metodologia per i contenuti pubblici non rappresentati da un ID MCP: non presentare il catalogo MCP come identico all’intero corpus integrato. La scheda contiene descrizione, fonti, disponibilità, periodo/unità/limiti quando definiti, filtri, esempio supportato, metodologia e accesso ai dati.

Un solo modulo di proiezione/render in `src/lib/agent-public-docs.ts` deriva il contenuto dal catalogo attivo. Le stringhe non presenti nel catalogo vanno ricavate da una fonte verificata o indicate come dipendenti dalla risposta del dataset; nessuna invenzione di periodo, copertura o metodo. Aggiungere metadati condivisi al catalogo solo se ne manca un'informazione necessaria e stabile. Il renderer deve essere puro, non chiamare query live o caricare snapshot per produrre la scheda.

Riutilizzare `DatasetDescriptor.exampleQuery`, già presente, e validarlo con `datasetQuerySchema`; verificare anche che le chiavi corrispondano ai filtri del descriptor. Non generare una seconda tabella di esempi.

Il link alla query usa l'API HTTP già esistente dove verificata, altrimenti spiega come usare `list_datasets` e `query_dataset` su `/api/mcp`, con un input conforme allo schema condiviso. Non creare un endpoint universale di query e non assumere che `/api/dati/ID` accetti un ID MCP. Gli agent che leggono solo HTTP ottengono sempre la scheda; il requisito di un client MCP per quella query deve essere dichiarato chiaramente.

Risposte: Markdown 200 per indice/scheda attiva; 404 per ID sconosciuto o soltanto configured. Content-Type `text/markdown; charset=utf-8`, `X-Content-Type-Options: nosniff`; cache esplicita pubblica breve per metadati, `no-store` sugli errori. Sanitizzare titoli e URL nel renderer per non rompere il Markdown o introdurre link arbitrari. Non incorporare documentazione interna del repository nelle risposte pubbliche.

### S4.2 Collegamenti, copertura e compatibilità

Collegare il nuovo ingresso da llms.txt e dalla pagina MCP o Dati già esistente. Conservare link/API funzionanti e regole di crawl ad alta cardinalità; nessuna generazione massiva di URL ente/Comune nella sitemap. Un solo dataset rappresentativo, `mef_irpef_comunale`, dimostra il percorso completo nel ticket 04; il ticket 05 estende la copertura all'intero catalogo attivo senza pubblicare un indice incompleto nel frattempo: nella prima slice l'indice identifica chiaramente l'unica scheda disponibile.

Nel ticket 06 verificare che pagine Dati/MCP/Fonti/Metodo rendano nel contenuto server i collegamenti e le informazioni essenziali senza click su widget. Aggiungere solo il markup/testo necessario alle lacune osservate, preservando accessibilità, layout e metadati. Le schede testuali affiancano le pagine, non riscrivono la UI.

Un controllo offline di copertura pubblica riusa catalogo e renderer e verifica schede/link/filtri, collegato alla CI nel ticket 07. Non eseguire chiamate provider, scraping esterno o LLM in CI. Verifiche HTTP locali confrontano risultati delle API esistenti e delle nuove rappresentazioni.

## S5. Verifiche proporzionate e confronto leggero

1. Controlli deterministici: link e sezioni obbligatorie, import senza effetti collaterali, CLI/errori, proiezione del catalogo attivo, campi e URL validi, risposte HTTP. Nuovi test in `.scratch/agent-readiness-v2/checks/`; quelli upstream continuano a girare.
2. Tre task repository e tre domande pubbliche, definite in CHECKS.md, una volta prima e una dopo con DeepSeek/OpenCode e sessioni nuove. Totale iniziale **12 esecuzioni**, senza matrice multi-modello o suite memoria. Ripetere soltanto esiti dubbi con motivazione registrata; confronto descrittivo, non benchmark statistico.
3. Registrare SHA A/B, prompt, modello/impostazioni, risultato verificato, tempo, token se esposti e letture osservate. Valori non esposti sono «non disponibile»; byte/parole non diventano token stimati senza etichetta. Niente collector custom, export indiscriminato di sessioni o chain of thought. Il risparmio non vale se manca un'informazione obbligatoria.
4. Le esecuzioni leggere sono un controllo di utilità; non sono prerequisito bloccante per iniziare il codice. Prima delle modifiche fissare SHA e domande: A si può ricostruire più tardi su copie pulite. Limiti/account mancanti comportano NOT_RUN, non una nuova infrastruttura o blocco dei ticket prodotto.
5. Test mirati durante ciascun ticket; gate richiesti da AGENTS e CONTRIBUTING prima della consegna del branch e dei confini applicabili. Rete/Geist/loopback/quota sono limiti distinti dalle regressioni. Nessuna disattivazione per ottenere un verde.

## S6. Esecuzione, Git e autorità

Harness di implementazione: OpenCode 1.18.30 o versione effettiva verificata, in terminale cmux, modello `opencode-go/deepseek-v4.1-flash`. Un implementatore per ticket; poi una review in sessione nuova e separata, senza ricopiare l'intera conversazione. I prompt puntano al ticket e alle sezioni della specifica; non serve attivare engineering-orchestrator o una squadra Sol/Terra/Luna.

Preparazione attuale autorizzata: documenti locali soltanto. Il prompt di implementazione autorizza le normali modifiche del ticket. Dopo le verifiche, commit locale di soli percorsi posseduti. La sessione indipendente di review confronta base/head e, se PASS, esegue il push al solo fork `https://github.com/Elgabor/DoveVannoINostriSoldi.git` sul branch dedicato; il push è già autorizzato. Se fallisce, restituisce correzioni precise senza pubblicare e l'implementatore prepara il commit di riparazione.

Vietati stage indiscriminato e commit anche temporanei di specifiche, ticket, nuovi test, fixture o risultati. Esaminare **ogni commit del lavoro dalla baseline a HEAD**, non solo il diff finale. I test e gli artifact già ereditati dalla baseline upstream non sono nuovi file di questo intervento e non vanno rimossi. Sono pubblicabili le istruzioni operative AGENTS/AGENT_CONTEXT, il codice e i validator CI: non sono specifiche progettuali. Ticket senza diff prodotto: evidenza locale/NO_PRODUCT_DIFF, nessun commit vuoto. PR, upstream, force-push, merge e deploy richiedono autorizzazione separata.

Non modificare il main personale, regole globali, segreti, session store o impostazioni provider. Nessuna installazione, cancellazione non approvata o refactoring applicativo. Registrare localmente eventuali refactoring verificati; chiedere prima di nuove issue upstream. Lo storico locale precedente non va ripubblicato, rielaborato o caricato automaticamente nel contesto dell'implementatore.

## S7. Accettazione complessiva

Tutti i gruppi repository e dataset pubblicabili hanno un percorso verificato; CI blocca riferimenti/copertura incoerenti; il sito espone metadati corretti e accessi ai dati senza nuova logica parallela. I risultati del confronto leggero distinguono miglioramento, regressione e non misurato. I due branch contengono solo prodotto verificato; pianificazione, nuovi test e report rimangono locali. Nessun ticket è dichiarato completo soltanto perché è stato scritto il relativo documento.
