# Trasparenza Italia

> **Dove vanno i soldi pubblici, fonte per fonte.**

Trasparenza Italia è un progetto civico open source per aggregare, normalizzare e rendere comprensibili i dati pubblici sulla spesa e sulla gestione delle risorse della Pubblica Amministrazione italiana.

L'obiettivo non è creare una classifica dello scandalo. È costruire una **infrastruttura di verifica**: un cittadino dovrebbe poter passare da un grafico alla fonte ufficiale, capire quando il dato è stato aggiornato e ricostruire come è stato trasformato.

## Principio fondamentale

**Nessun numero senza fonte, data e percorso di verifica.**

“Live” non significa inventare un tempo reale che non esiste. Trasparenza Italia aggiorna un dataset non appena la fonte ufficiale rende disponibile una nuova versione e mostra sempre la freschezza del dato.

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

Il registro operativo è in [`src/lib/sources.ts`](src/lib/sources.ts) e la ricerca sulle fonti è documentata in [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Cosa c'è già

Questa prima foundation include:

- dashboard responsive in italiano ispirata a un centro di controllo pubblico, senza dati economici simulati;
- registro delle fonti con stato, copertura, formato e frequenza;
- pagina metodologia;
- primo connettore server verso il catalogo CKAN di OpenBDAP (`/api/fonti/bdap`);
- documentazione su architettura, provenienza, aspetti legali e roadmap;
- CI con lint, typecheck e build.

## Stack

- Next.js 16.3
- React 19.2
- TypeScript
- CSS nativo con design tokens
- Node.js 22

La foundation non richiede database. Il livello dati persistente verrà introdotto insieme ai primi ingestori, così da non mescolare UI e ipotesi non ancora validate sulle sorgenti.

## Avvio locale

```bash
npm install
npm run dev
```

Controlli:

```bash
npm run lint
npm run typecheck
npm run build
```

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

Gli identificativi di dominio (Codice IPA, codice fiscale dell'ente, CIG, CUP, codici territoriali) rimangono separati: nessun join “probabilistico” viene promosso a fatto senza una regola documentata.

Leggi [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

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

Il progetto è in una fase iniziale. Le contribution più utili sono:

- nuovi connettori verso fonti ufficiali;
- test di qualità e riconciliazione dei dati;
- documentazione di classificazioni contabili;
- miglioramenti di accessibilità;
- metodologie robuste per benchmark e anomaly detection;
- segnalazioni di fonti pubbliche mancanti.

Per una nuova fonte, aprire una issue indicando almeno proprietario, URL ufficiale, licenza, formato, frequenza e chiavi utili al join.

## Licenza

Codice rilasciato con licenza MIT. I dataset incorporati o collegati mantengono le licenze e le condizioni delle rispettive fonti.
