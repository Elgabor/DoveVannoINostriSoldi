# Roadmap

## Fase 0 — Foundation
- [x] identità e dashboard responsive
- [x] source registry
- [x] metodologia e principi legali
- [x] primo endpoint OpenBDAP
- [x] CI

## Fase 1 — Dati reali
- [ ] ingestore IPA e tabella canonica degli enti
- [ ] discovery dei dataset OpenBDAP
- [ ] ingestore SIOPE/OpenBDAP per pagamenti aggregati
- [ ] ingestore ANAC BDNCP
- [ ] snapshot e provenance persistenti
- [ ] pagina ente con URL sorgente e freshness
- [ ] ricerca per ente, CIG, CUP e fornitore

## Fase 2 — Pagamenti distribuiti
- [ ] crawler Amministrazione Trasparente a partire da IPA
- [ ] validatore schema ANAC art. 4-bis
- [ ] coverage report per ente
- [ ] deduplicazione e versioning
- [ ] pagina pagamenti con filtri temporali e categorie

## Fase 3 — Investimenti e territorio
- [ ] ReGiS / PNRR
- [x] overview nazionale OpenCoesione con snapshot riconciliato, retry ETL, grafici, API e refresh automatico
- [ ] drill-down OpenCoesione per progetto, soggetto e territorio con regole anti-doppio conteggio
- [ ] opere pubbliche OpenBDAP / MOP
- [ ] geometrie ISTAT
- [ ] confronti regionali, provinciali e comunali
- [ ] normalizzazione pro capite con popolazione ufficiale

## Fase 4 — Parlamento e incarichi
- [ ] Consulenti Pubblici
- [ ] bilanci Camera e Senato
- [ ] gare delle istituzioni
- [ ] trattamento economico con granularità rigorosamente aderente alle fonti

## Fase 5 — Osservatorio anomalie
- [ ] concentrazione fornitori
- [ ] affidamenti ripetuti
- [ ] prossimità alle soglie
- [ ] proroghe e rinnovi
- [ ] benchmark di prezzo su categorie realmente comparabili
- [ ] spiegazione pubblica di ogni indicatore
- [ ] test contro falsi positivi

## Definition of done per connettore

Un connettore non è “fatto” finché non ha:

- fonte e condizioni documentate;
- fixture reale e test;
- idempotenza;
- retry e timeout;
- schema validation;
- metriche di qualità;
- provenance completa;
- gestione dei cambi di schema;
- stato/freshness visibile in UI.
