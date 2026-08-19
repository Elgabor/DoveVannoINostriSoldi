# Trasparenza Italia

> **Dove vanno i soldi pubblici, fonte per fonte.**

Trasparenza Italia è un progetto civico open source per aggregare, normalizzare e rendere comprensibili i dati pubblici sulla spesa e sulla gestione delle risorse della Pubblica Amministrazione italiana.

L'obiettivo non è creare una classifica dello scandalo. È costruire una **infrastruttura di verifica**: un cittadino dovrebbe poter partire da un grafico, un ente, un contratto o un progetto, arrivare al record originale, capire quando il dato è stato aggiornato e ricostruire come è stato trasformato.

## Principio fondamentale

**Nessun numero senza fonte, data e percorso di verifica.**

“Live” non significa inventare un tempo reale che non esiste. Trasparenza Italia aggiorna un dataset quando la fonte ufficiale rende disponibile nuova informazione e mostra la freschezza effettiva del dato.

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

Il registro operativo delle fonti è in [`src/lib/sources.ts`](src/lib/sources.ts) e la ricerca sulle sorgenti è documentata in [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Cosa c'è già

- dashboard responsive in italiano, senza valori economici simulati;
- registro delle fonti con proprietario, copertura, formato e frequenza;
- connettore server verso il catalogo CKAN di OpenBDAP (`/api/fonti/bdap`);
- **registro nazionale degli enti collegato alla Data API ufficiale IPA**;
- ricerca full-text degli enti in `/enti`;
- pagina canonica di ogni ente tramite Codice IPA;
- API normalizzata `/api/enti` e `/api/enti/[codice]`;
- primo grafico basato su dati reali: distribuzione delle tipologie presenti nel datastore IPA, calcolata via API SQL;
- provenienza, licenza e data di osservazione esposte insieme ai dati;
- pagine Fonti e Metodologia;
- documentazione su architettura, aspetti legali e roadmap;
- CI con lint, typecheck, build e detector di qualità visuale Impeccable.

## Stack

- Next.js 16.3
- React 19.2
- TypeScript strict
- Recharts per le visualizzazioni dashboard
- CSS nativo con design tokens
- Impeccable per design context e deterministic UI checks
- Node.js 22.12

La persistenza verrà introdotta insieme agli ingestori finanziari che la richiedono. Il progetto evita di costruire un database attorno a ipotesi di join non ancora validate.

## Avvio locale

```bash
npm install
npm run dev
```

Controlli:

```bash
npm run lint
npm run typecheck
npm run design:check
npm run build
```

Il detector Impeccable è inizialmente diagnostico nella CI: i finding vengono corretti o motivati prima di trasformarlo in un gate bloccante.

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

- nuovi connettori verso fonti ufficiali;
- test di qualità e riconciliazione dei dati;
- documentazione delle classificazioni contabili;
- miglioramenti di accessibilità e data visualization;
- metodologie robuste per benchmark e anomaly detection;
- segnalazioni di fonti pubbliche mancanti.

Per una nuova fonte, aprire una issue indicando almeno proprietario, URL ufficiale, licenza, formato, frequenza e chiavi utili al join.

## Licenza

Codice rilasciato con licenza MIT. I dataset incorporati o collegati mantengono le licenze e le condizioni delle rispettive fonti.
