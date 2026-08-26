# Atlante Imprese Italia — contratto del modulo

Questo documento descrive il perimetro del modulo `/imprese` proposto come
contributo additivo a DoveVannoINostriSoldi. Non è una clearance legale delle
fonti né una promessa sulla disponibilità futura degli URL.

## Snapshot verificato

- generato: `2026-08-26T00:00:00+02:00`;
- schema: `1`;
- osservazioni: `12.748`;
- geografie: `20` regioni;
- classificazione: `ATECO 2025`;
- tipologia ammessa: `aggregate`;
- licenza dichiarata dalle tre fonti: `CC BY 4.0`.

Il file generato è `src/data/generated/company-atlas-snapshot.json`. Il comando
`npm run company-atlas:refresh` scarica le fonti in parallelo, normalizza i dati,
controlla la cardinalità minima e valida lo snapshot con
`src/lib/company-atlas-contract.ts`. `--check` valida il file committato senza
rete.

## Fonti

### Stock imprese attive

- URL: <https://opendata.marche.camcom.it/data/Stock-Imprese-Attive-Italia.json>
- pubblicatore indicato: CCIAA Marche su dati InfoCamere;
- ultimo aggiornamento osservato: `2026-08-11`;
- periodo più recente acquisito: `2026-07-31`;
- dimensioni usate: regione, sezione ATECO 2025, mese;
- semantica: stock di sedi di impresa attive.

Non è un elenco nominativo e non contiene ricavi o valore della produzione per
singola impresa.

### Addetti e localizzazioni attive

- URL: <https://opendata.marche.camcom.it/data/2026-Q2-Addetti-Localizzazioni-Attive-Italia.csv>
- pubblicatore indicato: CCIAA Marche su dati InfoCamere;
- ultimo aggiornamento osservato: `2026-08-04`;
- periodo acquisito: `2026-Q2`;
- righe lette: `118.673`;
- colonne: `Regione`, `Provincia`, `Settore`, `Divisione`, `Classe`, `Sottocategoria`, `Addetti`, `Localizzazioni Attive`.

Il CSV contiene livelli gerarchici annidati. Per ogni combinazione regione,
provincia, settore e divisione la pipeline conserva una sola riga: quella con il
punteggio minimo `len(Classe) + len(Sottocategoria)`, cioè il livello più alto
disponibile per quella divisione. Le righe canoniche vengono poi sommate a
regione × sezione ATECO per evitare di sommare insieme divisione e
classi/sottocategorie.

Il risultato non è un elenco di lavoratori o di imprese: è un aggregato
regionale per sezione.

### Fasce di valore della produzione

- URL: <https://opendata.marche.camcom.it/data/Stock-Imprese-Attive-Italia-Valore-Produzione.json>
- pubblicatore indicato: CCIAA Marche su dati InfoCamere;
- ultimo aggiornamento osservato: `2026-01-23`;
- periodo acquisito: `2025-12-31`;
- fasce: da `NEG` a `50M_OVER`;
- dimensioni usate: regione, sezione ATECO 2025, fascia.

La fonte tratta il valore della produzione derivato dai bilanci depositati. Il
modulo mostra i conteggi per fascia. Non li chiama fatturato, non li chiama
ricavi esatti e non li usa per identificare o ordinare singole società.

## Contratto UI e MCP

Le quattro metriche disponibili sono:

- `active_enterprises`;
- `employees`;
- `active_local_units`;
- `production_value_band_count`.

La pagina principale usa gli stessi filtri per mappa, classifica e dettaglio.
Il catalogo MCP espone tre dataset business:

- `company_active_enterprises`;
- `company_workforce`;
- `company_production_value_bands`.

Le risposte MCP sono limitate a 100 righe per pagina e contengono dati, periodo,
query normalizzata, provenienza e caveat. Il server è read-only e non espone
dati personali.

## Evoluzione prevista

Questo modulo è deliberatamente più piccolo di un registro imprese: prima
stabilisce contratto, provenienza e lettura territoriale. Un eventuale dataset
entity-level richiederebbe una fonte e una licenza specifiche, policy per
correzioni e rettifiche, controlli di aggiornamento e una valutazione separata
di privacy e uso commerciale.
