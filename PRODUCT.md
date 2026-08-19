# Trasparenza Italia — Product Context

## Platform

web

## Users

Il pubblico primario sono cittadini italiani che vogliono capire dove finiscono i soldi pubblici senza conoscere i portali della Pubblica Amministrazione, le classificazioni contabili o i sistemi di procurement.

Utenti importanti secondari:

- giornalisti e fact-checker che devono risalire rapidamente dal dato alla fonte originale;
- ricercatori, analisti e associazioni civiche che confrontano amministrazioni, territori e fornitori;
- amministratori e dipendenti pubblici che vogliono confrontare il proprio ente con enti omogenei;
- sviluppatori che vogliono riusare dati pubblici normalizzati tramite API.

La situazione d'uso tipica è esplorativa e investigativa: una persona parte da un ente, una spesa, un contratto, un territorio, un progetto o un nome e deve poter seguire collegamenti verificabili senza sapere in anticipo quale portale ufficiale contiene il dato.

## Product purpose

Trasparenza Italia aggrega e normalizza fonti pubbliche ufficiali italiane per rendere la gestione delle risorse pubbliche leggibile, ricercabile, confrontabile e verificabile da un unico punto di accesso.

Il prodotto non sostituisce le fonti ufficiali. Le collega, conserva la provenienza e riduce il costo cognitivo necessario per capire dati oggi dispersi tra portali, API, dataset e documenti.

## Positioning

**Un unico grafo verificabile della spesa pubblica italiana, dal bilancio nazionale al singolo ente, contratto, progetto e pagamento quando la fonte lo consente.**

Un normale portale open data può pubblicare dataset. Trasparenza Italia deve poter mostrare come record provenienti da sistemi diversi sono collegati tra loro e permettere all'utente di tornare sempre all'originale.

## Operating context

Il prodotto opera su dati pubblici con frequenze molto diverse. “Live” non significa inventare un tempo reale che la fonte non offre.

Per ogni record o aggregato rilevante, quando tecnicamente disponibile, conserviamo almeno:

- fonte e titolare del dato;
- URL o identificativo sorgente;
- data di riferimento/pubblicazione;
- data e ora di acquisizione;
- frequenza attesa della fonte;
- trasformazioni applicate;
- unità e perimetro contabile;
- livello di completezza o qualità noto.

La UI deve rendere visibile la freschezza effettiva del dato.

## Capabilities and constraints

### Capacità da costruire

- registro nazionale degli enti basato su IPA;
- pagamenti e serie storiche da SIOPE / SIOPE+ / OpenBDAP;
- bilancio dello Stato e dati RGS;
- contratti pubblici, CIG, stazioni appaltanti e aggiudicatari da ANAC / BDNCP;
- pagamenti pubblicati ai sensi dell'art. 4-bis del D.Lgs. 33/2013;
- CUP, opere pubbliche, PNRR e politiche di coesione;
- consulenze e incarichi pubblici;
- Camera, Senato e altre istituzioni;
- viste per territorio, settore, ente, fornitore e progetto;
- API pubblica con provenance;
- indicatori di anomalia e confronti tra enti omogenei.

### Vincoli permanenti

- nessun valore economico simulato presentato come reale;
- nessuna granularità individuale inventata quando la fonte pubblica solo aggregati;
- nessun indicatore statistico viene trasformato automaticamente in un'accusa di illecito, corruzione o spreco;
- distinguere sempre stock, flussi, impegni, pagamenti, competenza, cassa e valori cumulati quando il dominio lo richiede;
- rispettare i limiti di diffusione dei dati personali e le condizioni delle fonti;
- non modificare il significato di un record durante la normalizzazione;
- ogni dato derivato deve essere ricostruibile.

## Brand commitments

- indipendente e civico, non istituzionale;
- rigoroso prima che sensazionalistico;
- comprensibile senza banalizzare;
- trasparente anche sui limiti e sui buchi dei dati;
- open source;
- fonti ufficiali prima di fonti secondarie;
- linguaggio italiano semplice e preciso;
- nessun design che faccia sembrare un'anomalia una colpevolezza.

## Evidence on hand

Il progetto dispone già di fonti ufficiali identificate e documentate, tra cui IPA, OpenBDAP/RGS, SIOPE, ANAC/BDNCP, OpenCoesione, ReGiS/PNRR, Consulenti Pubblici, Camera e Senato.

La prima integrazione strutturata usa il datastore ufficiale IPA come anagrafe canonica degli enti e conserva Codice IPA, dati identificativi, provenienza e data di osservazione.

OpenBDAP espone un catalogo CKAN interrogabile via API. ANAC e altri sistemi pubblicano dati strutturati con cadenze proprie. La piattaforma deve dichiarare la frequenza reale di ciascuna sorgente invece di uniformarla artificialmente.

## Design principles

- Operate first: la dashboard è uno strumento di lavoro e consultazione, non una landing page promozionale.
- Overview → drill-down → source: ogni percorso deve partire da un quadro leggibile, permettere l'approfondimento e terminare su un'origine verificabile.
- Comparison over spectacle: grafici e mappe esistono per rendere confronti più rapidi, non per decorare.
- Progressive disclosure: la prima vista mostra ciò che serve a orientarsi; metodologia, metadati e dettagli tecnici restano sempre raggiungibili.
- Honest empty states: se una fonte manca o è in ritardo, la UI lo dice esplicitamente.

## Accessibility

La piattaforma deve essere utilizzabile con tastiera, screen reader, zoom e riduzione del movimento. I grafici devono avere un equivalente testuale o semantico sufficiente per comprenderne il significato. Il colore non può essere l'unico segnale di stato. I controlli principali devono avere target adeguati anche su mobile.
