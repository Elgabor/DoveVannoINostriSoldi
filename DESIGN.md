# DoveVannoINostriSoldi — Design System

## 01 Overview

**Direzione: “Il registro pubblico.”**

DoveVannoINostriSoldi è un prodotto operativo di consultazione e verifica. Deve sembrare un documento pubblico contemporaneo: carta chiara, inchiostro nero, un solo accento rosso che indica dove guardare. Niente pannelli traslucidi, niente bagliori, niente angoli arrotondati.

La direzione è **dati subito, fonte vicina, superfici piatte**.

La schermata deve far capire rapidamente:

1. che cosa si sta guardando;
2. qual è il dato o confronto principale;
3. da quale fonte arriva e quanto è fresco;
4. come approfondirlo fino al record originale.

Una sola metrica può dominare una superficie. Le altre diventano confronti, serie, metadata o dettagli. Grafici e mappe devono ridurre il tempo necessario per capire un pattern, mai decorare uno spazio vuoto.

Il tricolore nell'header è una firma di identità. Non è la palette delle visualizzazioni.

I token vivono in `src/app/design-system.css`; la base e la chrome dell'applicazione in `src/app/globals.css`. Nessun colore va scritto a mano in un componente: se manca un token, si aggiunge lì.

## 02 Colors

La palette è grigio-carta caldo con un unico rosso di segnalazione. Evitare nero puro, bianco puro come fondo pagina, neon, glow e seconde tinte in competizione con l'accento.

### Core tokens

- `--color-bg: #f3f2f2` — fondo applicazione;
- `--color-surface: #eae9e9` — fondo secondario;
- `--color-raised: #ffffff` — superficie dei pannelli;
- `--color-text: #201e1d` — testo principale e fondo dei tooltip;
- `--color-accent: #ec3013` — azione, evidenza, serie primaria;
- `--color-accent-2: #e15b47` — accento secondario, usato di rado;
- `--color-divider` — separatore calcolato dal testo.

### Rampe tonali

`--color-neutral-100…900` e `--color-accent-100…900` sono generate in OKLCH su un'unica scala di luminosità: lo stesso passo di due rampe diverse ha lo stesso valore visivo. Le regole d'uso:

- `neutral-200` separatori interni di tabelle ed elenchi;
- `neutral-300` bordo dei pannelli e delle bande;
- `neutral-400` bordo dei controlli (input, bottoni secondari);
- `neutral-600` testo secondario e didascalie;
- `neutral-700` etichette dei pannelli;
- `neutral-800` testo di paragrafo dentro un pannello.

### Status

`--color-positive`, `--color-warning` e `--color-critical` (con i rispettivi `-bg` e `-border`) servono solo agli stati delle fonti e alla freschezza dei dati. Restano dentro il valore tonale del testo: un badge di stato non deve mai gridare più forte di un numero.

### Token per le visualizzazioni

`--chart-primary` è l'accento; `--chart-secondary…quinary` scendono lungo la rampa neutra. Una serie accentata su contesto neutro, mai un arcobaleno. La coropleta regionale usa `accent-100 → accent-800` come rampa sequenziale: è intensità, non categoria.

## 03 Typography

Un'unica famiglia: **Archivo**, caricata con `next/font/google` e self-hosted. `--font-heading-weight: 800` per titoli ed etichette, 400–600 per il testo.

### Ramp

- `h1` di pagina: 30px, `letter-spacing: -.02em`;
- numero principale di un pannello: 38px, 800;
- numero di una banda statistica: 24px, 800;
- corpo: 14px (13,5px sotto i 620px), `line-height: 1.55`;
- etichetta di pannello (`.panel-title`): 11px, 800, maiuscolo, `letter-spacing: .09em`;
- didascalia e nota: 12px, `neutral-600`.

Ogni cifra confrontabile usa `font-variant-numeric: tabular-nums`. Le celle numeriche non vanno a capo: è il contenitore a scorrere.

I numeri si scrivono con il separatore delle migliaia forzato (`useGrouping: "always"` in `src/lib/format.ts`): il CLDR italiano non raggrupperebbe le cifre a quattro posizioni e “7893” non è come si scrive un conto pubblico.

## 04 Elevation

Il sistema è piatto. `--radius-sm/md/lg` valgono `0px` e non vanno sovrascritti.

La gerarchia si costruisce con il fondo e una linea da 1px, non con l'ombra:

- pannello: `--color-raised` + `1px solid --color-neutral-300`;
- pannello di avvertenza: `--color-neutral-100` + bordo `--color-accent-300`;
- riquadro dentro un pannello: `--color-neutral-100` + bordo `--color-neutral-200`.

`--shadow-sm/md/lg` esistono per gli elementi che stanno davvero sopra la pagina — tooltip e overlay — e nient'altro.

## 05 Components

### Shell

`.shell` dà a header, nav, main e footer la stessa misura: larghezza piena, `max-width: --max`, `padding-inline: --gutter`. È **fluida**: nessuna superficie ha una larghezza fissa, così la pagina non lascia mai spazio morto su un lato. Il gutter scende da 28px a 20px e poi a 14px sui breakpoint.

### Navigation

Header su una riga: marchio, tricolore, ricerca, azione. Sotto, la barra delle sezioni con sottolineatura accentata sulla voce corrente. Sotto i 900px l'header va a capo e la ricerca prende tutta la riga; la barra delle sezioni scorre orizzontalmente senza scrollbar visibile.

### Dashboard

La home è una griglia a tre colonne (`288px | 1fr | 300px`). A 1320px la colonna destra diventa una banda di card a piena larghezza; a 900px tutto è in colonna singola.

### Panels

`.panel` più `.panel-title` sono l'unità di base di ogni pagina. Il titolo è un'etichetta, non un titolo tipografico: piccolo, maiuscolo, `neutral-700`.

### Tables

`.table` dentro `.table-scroll`. Le intestazioni di colonna sono maiuscole e piccole; l'intestazione di riga è il nome della riga, in caso normale, con un'eventuale seconda riga di contesto in `small`. Le colonne numeriche usano `.num`.

### Bar rows

Il pattern ricorrente `etichetta | traccia | valore`: traccia `neutral-200`, riempimento accento, valore tabulare a destra. Il mese in corso usa `neutral-500` invece dell'accento, perché è un numero ancora incompleto.

### Charts

Recharts legge i token: assi e griglia in `--color-neutral-300/600`, serie dai `--chart-*`. I tooltip sono l'unica superficie scura del sistema: fondo `--color-text`, testo `--color-neutral-100`, valore in bianco.

Dove basta, il grafico è HTML e CSS (barre, donut in `conic-gradient`) invece di una libreria: meno JavaScript e stessa leggibilità.

### Source provenance

Ogni pagina dichiara fonte, data del dato e data del nostro controllo. Se un dato manca si scrive “—” o “non disponibile”: mai una stima al posto di un buco.

### Status

`.status-attiva`, `.status-integrazione`, `.status-mappata`: rettangoli con bordo, nessun raggio, testo in colore di stato.

### Motion

Transizioni brevi (140ms, `--ease-out`) su colore e sfondo. Nessuna animazione d'ingresso. `prefers-reduced-motion` azzera tutto.

## 06 Do's and Don'ts

### Do

- Usare i token: se serve un colore nuovo, si aggiunge a `design-system.css`.
- Comporre le pagine con `.panel`, `.table`, `.stat-strip`, `.notice`, `.btn`; il modulo CSS della pagina copre solo ciò che è davvero specifico.
- Mostrare il valore compatto e quello esatto: “70,94 mld €” con sotto “70.936.770.818,54 € esatti”.
- Far scorrere il contenuto largo dentro il suo contenitore, mai la pagina.
- Spiegare in italiano semplice che cosa misura un numero e che cosa non dimostra.
- Verificare ogni pagina a 375px oltre che su desktop.

### Don't

- Nessuna larghezza fissa sui contenitori di pagina.
- Nessun `border-radius`, gradiente decorativo o ombra su una superficie che non sta sopra la pagina.
- Nessun secondo colore d'accento per “dare varietà”: il rosso indica, il resto è neutro.
- Nessun colore scritto a mano in un componente o in un modulo CSS.
- Nessun numero senza fonte e senza data.
- Nessuna parola che trasformi un segnale in un'accusa.
