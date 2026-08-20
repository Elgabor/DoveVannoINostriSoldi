# Trasparenza Italia

> **Dove vanno i soldi pubblici, fonte per fonte.**

Trasparenza Italia è un progetto civico open source per aggregare, normalizzare e rendere comprensibili i dati pubblici sulla spesa e sulla gestione delle risorse della Pubblica Amministrazione italiana.

L'obiettivo non è creare una classifica dello scandalo. È costruire una **infrastruttura di verifica**: un cittadino dovrebbe poter partire da un grafico, un ente, un contratto o un progetto, arrivare al record originale, capire quando il dato è stato aggiornato e ricostruire come è stato trasformato.

## Principio fondamentale

**Nessun numero senza fonte, data e percorso di verifica.**

“Live” non significa inventare un tempo reale che non esiste. Trasparenza Italia controlla le sorgenti più spesso della loro cadenza di pubblicazione quando è utile, rileva rapidamente i nuovi rilasci ufficiali e mostra separatamente:

- timestamp del dato sorgente;
- momento di acquisizione;
- disponibilità dell'upstream;
- freshness rispetto alla cadenza dichiarata;
- trasformazioni applicate.

## Cosa vogliamo unire

- pagamenti e incassi della PA tramite SIOPE / SIOPE+ e OpenBDAP;
- bilancio e pagamenti dello Stato pubblicati dalla Ragioneria Generale dello Stato;
- contratti pubblici, CIG, stazioni appaltanti e aggiudicazioni ANAC / BDNCP;
- dati sui pagamenti pubblicati dalle singole amministrazioni ai sensi dell'art. 4-bis del D.Lgs. 33/2013;
- anagrafe degli enti tramite IPA;
- opere pubbliche, CUP, PNRR e politiche di coesione;
- consulenze e incarichi pubblici;
- bilanci, gare e dati economici pubblicati da Camera e Senato;
- in seguito: sovvenzioni, partecipate, patrimonio, personale e indicatori di pagamento.

Il registro pubblico è in [`src/lib/sources.ts`](src/lib/sources.ts); le policy operative di freshness sono in [`src/lib/data/source-policy.ts`](src/lib/data/source-policy.ts).

## Cosa c'è già

### Spese dello Stato

`/spese` usa esclusivamente dataset ufficiali RGS/OpenBDAP e scopre automaticamente il periodo più recente disponibile.

La dashboard contiene:

- Totale Pagato del Bilancio dello Stato;
- pagamenti per Missione;
- pagamenti per Amministrazione;
- classificazione economica;
- canali di pagamento;
- riconciliazione automatica dei totali tra dataset indipendenti;
- serie cumulativa 2026;
- flusso mensile derivato come differenza tra due snapshot cumulativi consecutivi;
- link diretti ai CSV e package ufficiali RGS.

API:

- `/api/spese/stato`
- `/api/spese/stato/storico`

### Registro nazionale degli enti

L'Indice PA è la prima anagrafe canonica del progetto.

- ricerca full-text in `/enti`;
- pagina canonica `/enti/[codice]` per Codice IPA;
- API normalizzata `/api/enti` e `/api/enti/[codice]`;
- aggregazioni reali via Data API SQL;
- grafico della distribuzione per tipologia;
- provenienza e licenza esposte insieme al record.

### Stato delle fonti

`/fonti/stato` separa tre concetti che spesso vengono confusi:

1. **integrazione**: esiste un adapter di Trasparenza Italia?
2. **reachability**: l'upstream risponde?
3. **freshness**: quanto è vecchio il dato secondo un timestamp ufficiale e una soglia coerente con la fonte?

L'API corrispondente è `/api/fonti/stato`.

Per una fonte ancora soltanto mappata non mostriamo un falso semaforo online/offline.

## Architettura delle sorgenti

Ogni nuovo adapter deve usare progressivamente il layer condiviso in `src/lib/data/`:

```text
source-policy.ts   cadenza, timeout, retry, cache tag, stale threshold
source-fetch.ts    HTTPS + host allowlist + GET/HEAD + timeout + retry transitori
freshness.ts       classificazione fresh / stale / unknown
source-health.ts   reachability e timestamp ufficiali
Delimited parser   parsing riutilizzabile per CSV pubblici
```

Il fetch layer non accetta host arbitrari, non consente write verso gli upstream e non permette agli adapter di sovrascrivere direttamente la cache policy.

Leggi [`docs/FRESHNESS_AND_REFRESH.md`](docs/FRESHNESS_AND_REFRESH.md).

## Aggiornamento automatico

La cache applicativa è segmentata per source tag. L'endpoint interno:

```text
POST /api/internal/refresh-sources
```

è disabilitato se `SOURCE_REFRESH_SECRET` non è configurato e accetta soltanto identificativi di fonti conosciute.

Dopo il deployment:

1. genera un secret lungo e casuale;
2. configura `SOURCE_REFRESH_SECRET` nell'ambiente del deployment;
3. configura lo stesso valore come repository secret GitHub `SOURCE_REFRESH_SECRET`;
4. configura il repository secret `REFRESH_URL` con l'origin del deployment, per esempio `https://example.org`.

I workflow separati fanno poi:

- **Source refresh**: invalidazione source-scoped ogni ora;
- **Source health**: probe degli adapter attivi ogni 6 ore.

Un outage RGS/AgID può rendere rosso il monitor delle fonti, ma **non** la CI del codice.

## Stack

- Next.js 16.3
- React 19.2
- TypeScript strict
- Recharts per le visualizzazioni dashboard
- CSS nativo con design tokens
- Impeccable come design quality gate
- Node.js 22.23.2 nel progetto/CI
- npm lockfile committato e installazioni CI riproducibili con `npm ci`

La persistenza verrà introdotta quando i volumi e le query cross-fonte la rendono necessaria. Il progetto evita di costruire un database attorno a ipotesi di join non ancora validate.

## Avvio locale

```bash
npm ci
npm run dev
```

Controlli completi:

```bash
npm run lint
npm test
npm run typecheck
npm run design:check
npm run build
```

La CI richiede **zero warning ESLint**, test verdi, TypeScript verde, detector Impeccable verde e production build verde.

Per lavorare sul design con un harness supportato da Impeccable:

```bash
npx impeccable install
```

Il contesto persistente del prodotto è in [`PRODUCT.md`](PRODUCT.md); il sistema visuale è in [`DESIGN.md`](DESIGN.md).

## Architettura dati

Ogni record normalizzato dovrà conservare almeno:

```text
source_id
source_record_id
source_url
source_published_at
observed_at
ingested_at
entity_identifiers
raw_hash
schema_version
transform_version
```

Gli identificativi di dominio, come Codice IPA, codice fiscale dell'ente, CIG, CUP e codici territoriali, rimangono separati. Nessun join probabilistico viene promosso a fatto senza una regola documentata.

Leggi [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Regole per grafici e mappe

Una visualizzazione entra in produzione soltanto quando esiste un dato verificabile.

- fonte e data devono essere visibili o immediatamente raggiungibili;
- assi e unità devono dichiarare che cosa viene misurato;
- valori cumulati non vengono presentati come valori periodali senza trasformazione documentata;
- mappe e marker devono rappresentare una misura reale o uno stato di copertura;
- se il dato manca, mostriamo uno stato vuoto, non una serie dimostrativa;
- le animazioni non devono alterare o spettacolarizzare la percezione di un dato finanziario.

## Alert e anomalie

Una procedura poco concorrenziale, un prezzo elevato o un fornitore ricorrente possono meritare un controllo, ma **non provano un illecito**.

Gli indicatori futuri dovranno essere:

1. riproducibili;
2. spiegabili;
3. confrontati tra casi omogenei;
4. collegati ai record originali;
5. presentati come segnali di verifica, non come sentenze.

Leggi [`docs/LEGAL_AND_ETHICS.md`](docs/LEGAL_AND_ETHICS.md).

## Indipendenza

Trasparenza Italia è un progetto civico indipendente. Non è un sito ufficiale dello Stato italiano, di ANAC, RGS, Banca d'Italia, AgID, Camera o Senato.

I dati restano attribuiti alle rispettive fonti e vengono riutilizzati nel rispetto delle licenze, delle condizioni applicabili e della normativa sulla protezione dei dati personali.

## Contribuire

Le contribution più utili sono:

- nuovi adapter verso fonti ufficiali;
- test di qualità e riconciliazione dei dati;
- documentazione delle classificazioni contabili;
- miglioramenti di accessibilità e data visualization;
- metodologie robuste per benchmark e anomaly detection;
- segnalazioni di fonti pubbliche mancanti.

Per una nuova fonte, aprire una issue indicando almeno proprietario, URL ufficiale, licenza, formato, frequenza, identificativi e chiavi utili al join.

## Licenza

Codice rilasciato con licenza MIT. I dataset incorporati o collegati mantengono le licenze e le condizioni delle rispettive fonti.
