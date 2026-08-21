# Assistente deterministico

## Perimetro della prima tranche

`/assistente` e `/api/assistant` espongono una piccola interfaccia testuale, read-only e
deterministica. Il parser riconosce soltanto intenti allowlisted in italiano e il server richiama
direttamente `queryPublicDataset`: non effettua HTTP ricorsivo verso il sito e non accetta URL,
SQL, nomi di funzione, provider o dataset scelti dal testo.

Gli intenti disponibili sono:

- pagamenti SIOPE nazionali dei Comuni per anno;
- pagamenti SIOPE regionali dei Comuni per anno, soltanto per le Regioni esplicite nel catalogo;
- pagamenti dello Stato nazionali nel rilascio OpenBDAP disponibile per anno;
- imposta netta dichiarata MEF per Regione nell’anno d’imposta 2024.

Ogni risposta contiene dataset, periodo, osservazione numerica, fonte, data di osservazione,
fatti numerici già calcolati dall’adapter e caveat. La risposta non restituisce il prompt né il
payload completo dell’adapter.

## Sicurezza e limiti

- JSON soltanto, `Content-Type: application/json`, origine same-host e Host coerente;
- body massimo 16 KiB e prompt massimo 500 caratteri;
- una sola query per richiesta, timeout applicativo bounded e `AbortSignal` passato agli adapter
  che supportano cancellazione;
- nessuna persistenza, cronologia, analytics applicativa o logging del testo;
- richieste su frode, corruzione, evasione o responsabilità individuale vengono rifiutate con una
  spiegazione non accusatoria;
- richieste ambigue, classifiche, singoli Comuni, voce e provider AI producono esempi, non stime.

Il route handler non implementa un rate limit distribuito: il limite di durata, di body e di una
query è una barriera applicativa; in produzione va aggiunta e verificata una regola edge/WAF per
rate limiting e abuse prevention. Non viene introdotto uno store runtime per simulare tale
protezione.

## Evoluzione futura

Voce, provider LLM, memoria conversazionale e analisi aggregate delle domande richiederebbero una
nuova valutazione di consenso, minimizzazione, retention, opt-out, audit e parità delle risposte.
Non fanno parte di questa tranche.
