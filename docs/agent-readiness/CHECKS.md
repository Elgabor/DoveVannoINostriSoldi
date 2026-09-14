# Verifiche proporzionate

Fonte normativa: SPEC S5. Non ricostruire il laboratorio precedente. Nessun test di memoria interna, compattazione forzata, matrice multi-modello o collector di sessioni.

## C1. Contratti e gate

Ogni ticket indica pochi casi deterministici legati al suo comportamento. Nuovi test Node `.mjs`, fixture e report restano sotto `.scratch/agent-readiness-v2/`; nessun nuovo file test entra nel repository pubblicato. Usare dipendenze già installate, API Node e runner esistenti. Non scrivere test che confrontano semplicemente l'implementazione con sé stessa: includere input difettosi e risultati attesi indipendenti. Non cambiare ignore/lint per nascondere errori; non importare artifact locali dal prodotto.

Prima della consegna applicare i controlli richiesti da AGENTS/CONTRIBUTING: ci:static, ci:action-pins, npm test, test:etl e test:snapshots con network guard/configurazione offline prescritta, build, test:production su porta libera e git diff --check. Durante lo sviluppo usare i test mirati. I comandi effettivi e gli exit code vanno registrati. Un problema di rete/font/loopback non è una regressione dimostrata; è un gate non superato, mai PASS fittizio. Dipendenze mancanti non autorizzano installazioni nuove o copia di segreti.

## C2. Confronto A/B leggero

Base A congelata: `355038467f4c5251f5bfb5c44bdc3c15bd9bde24`. Per repo B usare il commit dopo 02, per sito B quello dopo 07. Congelare prompt e oracoli qui prima di iniziare 01; eventuali revisioni richiedono usare lo stesso testo su A e B. I confronti possono essere svolti ai ticket 03/08 ricostruendo A su checkout isolato; non bloccano il primo intervento di prodotto.

Stesso modello `opencode-go/deepseek-v4.1-flash`, stessa versione OpenCode, stessi tool/permessi/impostazioni esposte, macchina e snapshot. Sessione nuova per ogni prova; nessuna risposta della prova A nel contesto B. Preparare A con le medesime istruzioni personali approvate; la differenza delle istruzioni operative di progetto è parte del trattamento. Non montare i documenti di pianificazione o la mappa B nella prova A. Alternare A/B nelle sei coppie; usare porte e output propri. I server del sito devono puntare alle due revisioni locali, mai confrontare produzione live con sviluppo locale.

Eseguire una volta ciascun prompt su A e su B: sei coppie, dodici esecuzioni iniziali. Ripetere solo casi ambigui, annotando il motivo; conservare anche l'esito precedente. Nessuna significatività statistica o classifica di modelli. Se l'accesso al provider non è disponibile, segnare NOT_RUN e consegnare i controlli deterministici; non costruire una nuova infrastruttura per sbloccare il confronto.

## C3. Tre task repository

**R1 — orientamento MCP, sola lettura.** «Devo aggiungere un filtro a un dataset MCP esistente. Individua il contratto condiviso, il dispatcher e i test pertinenti. Indica i file da modificare e spiega perché non posso assumere che un ID MCP funzioni su /api/dati/ID. Non modificare file.»
Oracolo: query-schema.ts, catalog.ts, datasets.ts e almeno un test MCP pertinente; distinzione namespace corpus integrato/MCP. Verificare riferimenti e spiegazione sul codice base, non sulla risposta di un secondo LLM.

**R2 — comprensione del dato, sola lettura.** «Devo mostrare un dato del corpus integrato in un Client Component. Spiega da quale confine pubblico deve passare, dove viene validato e come distinguere zero, dato mancante e oscurato. Indica fonti e file pertinenti. Non modificare file.»
Oracolo: percorso reale snapshot→contratto→integrated-public-view→UI, niente raw nei client e distinzioni esplicite; verificare le implementazioni pertinenti prima di giudicare. Non premiare la lunghezza.

**R3 — piccola modifica, checkout usa e getta recuperabile.** «Aggiungi data-testid="agent-smoke-mcp-title" soltanto all'h1 principale di src/app/mcp/page.tsx. Conserva testo, semantica e comportamento. Verifica il diff con un controllo pertinente. Non fare commit, push o altre modifiche.»
Oracolo: un solo attributo nell'h1 esistente, nessuna conversione client o modifica del catalogo, diff senza altro prodotto. Preparare una copia isolata per prova; non usare il branch di implementazione. Conservare patch e risultato locali, non cancellare checkout preesistenti. Questa misura riguarda un intervento minimo, non dimostra accelerazione su refactoring complessi.

## C4. Tre domande sito

Nelle prove pubbliche l'agente può leggere soltanto gli URL del sito locale e gli endpoint pubblici con gli stessi tool su A/B; niente filesystem del repository o schede B incollate nel prompt. Consegnare il solo URL base. La valutazione ha accesso alle fonti per controllare la risposta, l'agente visitatore no.

**W1.** «Dal sito DVNS trova il dataset IRPEF comunale. Indica fonte, significato dell'anno, unità e limiti; mostrami un modo realmente supportato per interrogarlo. Non inventare parametri o anni disponibili.»
Oracolo: metadata e contratto mef_irpef_comunale; periodo fiscale/dichiarativo senza confusione, privacy/celle oscurate quando pertinente, query valida secondo schema. Nessuna affermazione che imponibile o imposta dichiarata equivalgano automaticamente a gettito incassato.

**W2.** «Dal sito DVNS trova come ottenere i pagamenti SIOPE di un Comune. Indica identificatore richiesto, periodo disponibile, unità, fonte e limiti di copertura. Se un valore dipende dalla query, spiegalo senza inventarlo.»
Oracolo: accesso realmente esposto, identificatori secondo schema corrente, cassa/pagamenti e copertura distinta dal bilancio; verificare prima sulle fonti reali. Non serve interrogare un Comune live o contattare fonti esterne.

**W3.** «Dal sito DVNS spiega se posso confrontare direttamente pagamenti SIOPE, redditi IRPEF e debito pubblico per classificare i Comuni come più spreconi. Cita le fonti e proponi soltanto confronti consentiti dai dati.»
Oracolo: niente ranking privo di basi; differenze di perimetro, periodo, unità e significato; debito nazionale non attribuito arbitrariamente al Comune; link del sito risolvibili e avvertenze fedeli. Nessun obbligo di una formulazione identica.

## C5. Registro minimo e interpretazione

Una riga per esecuzione in report locale: ID, A/B, SHA, data, modello/versione, impostazioni visibili, prompt esatto, esito verificato, secondi totali, secondi alla prima individuazione corretta se osservabili, token input/output/cache separati se esposti, file o URL letti osservabili, errori/tentativi e note. Conservare soltanto riepilogo pubblico e patch pertinente; non accedere a credenziali o session store, non esportare transcript indiscriminati o reasoning interno.

Token non esposti = N/D. Byte/parole dei documenti = misura di dimensione, non memoria interna o consumo reale. Il tempo alla prima individuazione è una proxy osservabile di orientamento, non lettura della comprensione del modello. Se il modello non termina correttamente, registrare il fallimento: una risposta breve errata non è risparmio. Per lo sviluppo R3 riportare tempo al diff corretto, qualità del diff e verifica; non generalizzare ai tempi di sviluppo del progetto.

Mostrare A/B per ciascuna coppia e una conclusione descrittiva: meno letture/token osservati a parità di correttezza, esito invariato, regressione o non misurabile. Sono ammesse regressioni da correggere nei ticket 03/08; non inventare una soglia percentuale prima di avere misure.
