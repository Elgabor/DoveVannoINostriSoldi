# Freshness, refresh e observability delle fonti

Trasparenza Italia non usa la parola **live** come sinonimo di polling continuo. Il dato può essere aggiornato soltanto quando la fonte ufficiale pubblica nuova informazione.

L'obiettivo operativo è diverso: **rilevare ogni nuovo rilascio ufficiale il prima possibile, conservarne la provenienza e non servire dati inventati quando l'upstream ha problemi**.

## Principi

1. La cadenza ufficiale della fonte e la frequenza con cui la controlliamo sono due concetti distinti.
2. Il discovery può essere più frequente della pubblicazione, ma non rende il dataset più recente della fonte.
3. Gli outage delle fonti non devono rendere non deterministica la CI del codice.
4. I retry sono limitati ai problemi transitori; gli errori permanenti e gli errori di schema restano visibili.
5. Ogni fetch server verso una fonte integrata deve passare progressivamente dal layer `src/lib/data/source-fetch.ts`.
6. Nessun endpoint interno di refresh accetta URL arbitrari.
7. La cache è segmentata per source tag, in modo da invalidare una fonte senza svuotare tutto il sito.

## Componenti

### `source-policy.ts`

È il registro operativo delle sorgenti. Per ogni fonte dichiara:

- proprietario;
- URL ufficiale;
- cadenza pubblicata o natura periodica;
- frequenza di discovery;
- durata cache dei dati;
- soglia di stale soltanto quando ha senso assegnarla;
- timeout;
- numero massimo di retry;
- cache tag.

Questa è configurazione di dominio, non configurazione della UI.

### `source-fetch.ts`

È l'unico fetch layer generico per gli upstream ufficiali.

Garantisce:

- allowlist per host e HTTPS;
- richieste read-only (`GET` / `HEAD`);
- User-Agent identificabile;
- timeout per sorgente;
- retry limitato su `408`, `425`, `429` e `5xx` transitori;
- cache/revalidation Next.js;
- tag per sorgente;
- nessun parsing o recupero silenzioso degli errori di schema.

La validazione semantica resta responsabilità dell'adapter specifico.

### `/api/fonti/stato`

Espone observability separata dal dato economico. Per ora esegue probe reali soltanto sugli adapter attivi e maturi. Una fonte mappata ma non ancora integrata viene indicata come **non ancora sondata**, non come online/offline per supposizione.

### `/api/internal/refresh-sources`

Endpoint interno autenticato tramite `SOURCE_REFRESH_SECRET`.

Può:

- invalidare i tag di una o più fonti;
- invalidare le route che oggi usano ancora adapter precedenti al tag-based fetch layer;
- preparare il sistema al successivo accesso con semantica stale-while-revalidate.

Se il secret non è configurato l'endpoint risponde `503`: non esiste una modalità aperta di fallback.

### `.github/workflows/source-refresh.yml`

Una volta impostati i repository secrets:

- `REFRESH_URL`: origin pubblico del deployment, ad esempio `https://example.org`;
- `SOURCE_REFRESH_SECRET`: lo stesso valore configurato nel deployment;

GitHub Actions invalida ogni ora, al minuto 17, le sorgenti integrate. Il minuto non è `00` per evitare la finestra più congestionata dei cron GitHub.

Se i secret non esistono il workflow termina con successo e un notice, perché il repository deve rimanere utilizzabile prima del primo deployment.

## Policy iniziali

| Fonte | Cadenza sorgente | Discovery Trasparenza Italia | Dati |
| --- | --- | ---: | ---: |
| IPA Enti | giornaliera | 1 h | 1 h |
| OpenBDAP · Pagamenti Stato | mensile per mese contabile | 2 h | 6 h |
| ANAC open dataset | mensile | 3 h | 12 h |
| OpenCoesione | bimestrale prevista | 6 h | 24 h |
| ReGiS | periodica | 6 h | 12 h |
| Art. 4-bis | dipende dall'ente | 3 h | 6 h |
| Consulenti Pubblici | dipende dall'ente | 6 h | 6 h |

SIOPE, Camera e Senato hanno policy conservative fino a quando il singolo adapter non avrà una semantica di pubblicazione sufficientemente precisa.

## CI vs source health

La CI ordinaria verifica esclusivamente proprietà del repository:

```text
install → lint → typecheck → Impeccable → build
```

Non deve fallire perché RGS, AgID o ANAC sono momentaneamente offline.

Le verifiche live appartengono invece a:

```text
source refresh → source probe → alert/observability
```

Questo rende distinguibili un bug introdotto nel codice e un problema di disponibilità esterno.

## Strategia di migrazione

Gli adapter vengono migrati uno alla volta al source fetch layer.

Stato attuale:

- IPA Data API: migrata;
- IPA aggregazioni SQL: migrate;
- OpenBDAP: time-based revalidation già attiva; migrazione ai source tag in corso;
- altre fonti: useranno direttamente il nuovo contratto quando verranno implementate.

Non riscriviamo tutti gli adapter contemporaneamente soltanto per uniformità estetica: ogni migrazione deve mantenere gli stessi risultati e passare lint, typecheck, design gate e build.
