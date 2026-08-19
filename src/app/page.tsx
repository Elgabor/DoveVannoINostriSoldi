import Link from "next/link";
import { ItalyVisual } from "@/components/italy-visual";
import { publicSources, sourceCounts } from "@/lib/sources";

const priorities = [
  { name: "IPA · anagrafe enti", cadence: "giornaliera", state: "Integrazione" },
  { name: "ANAC · contratti pubblici", cadence: "settimanale / periodica", state: "Integrazione" },
  { name: "OpenBDAP · catalogo RGS", cadence: "per dataset", state: "Connettore API" },
  { name: "Pagamenti art. 4-bis", cadence: "per amministrazione", state: "Crawler" },
];

const domains = [
  {
    id: "spese",
    kicker: "01 · Spesa pubblica",
    title: "Dai grandi aggregati al singolo ente",
    description:
      "Bilancio dello Stato, flussi SIOPE, pagamenti pubblicati dalle amministrazioni e serie storiche. Ogni vista separa competenza, cassa e perimetro contabile.",
    chips: ["ministeri", "comuni", "regioni", "sanità", "categorie di spesa"],
  },
  {
    id: "appalti",
    kicker: "02 · Contratti",
    title: "CIG, fornitori, affidamenti e aggiudicazioni",
    description:
      "Incrocio dei dati ANAC per leggere chi compra, da chi, con quale procedura e per quale importo. Gli indicatori di anomalia saranno segnali da verificare, mai accuse automatiche.",
    chips: ["CIG", "stazioni appaltanti", "fornitori", "procedure", "concentrazione"],
  },
  {
    id: "territori",
    kicker: "03 · Territori",
    title: "La spesa vista sulla mappa",
    description:
      "Regioni, province, città metropolitane e comuni con confronti pro capite e tra enti omogenei. Le mappe useranno confini e codici territoriali ufficiali.",
    chips: ["regioni", "comuni", "pro capite", "opere", "fondi UE"],
  },
  {
    id: "parlamento",
    kicker: "04 · Parlamento",
    title: "Bilanci, indennità e spese istituzionali",
    description:
      "Camera e Senato in una vista coerente: bilanci, procedure di gara e trattamento economico pubblicato dalle istituzioni, senza inventare granularità individuali che le fonti non rendono disponibili.",
    chips: ["Camera", "Senato", "bilanci", "gare", "trattamento economico"],
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="eyebrow"><span /> OSSERVATORIO CIVICO SULLA SPESA PUBBLICA</div>
        <h1>I soldi pubblici devono essere <em>leggibili.</em></h1>
        <p className="hero-copy">
          Trasparenza Italia unisce fonti ufficiali oggi disperse tra portali, dataset e documenti.
          Non promettiamo un falso tempo reale: aggiorniamo ogni dato appena la fonte pubblica
          nuova informazione e mostriamo sempre provenienza e freschezza.
        </p>

        <div className="hero-actions">
          <a href="#dashboard" className="button button-primary">Esplora la dashboard</a>
          <Link href="/fonti" className="button button-secondary">Vedi tutte le fonti</Link>
        </div>
      </section>

      <section className="dashboard-shell" id="dashboard" aria-label="Anteprima dashboard">
        <aside className="panel coverage-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">COPERTURA</span>
              <h2>Dati collegati</h2>
            </div>
            <span className="live-dot">IN COSTRUZIONE</span>
          </div>

          <div className="big-stat">
            <strong>10.000+</strong>
            <span>enti coperti da SIOPE</span>
          </div>

          <div className="mini-grid">
            <div><b>{sourceCounts.total}</b><span>fonti ufficiali mappate</span></div>
            <div><b>52</b><span>regole strutturali TrasparenzAI</span></div>
            <div><b>{sourceCounts.integrating}</b><span>integrazioni prioritarie</span></div>
            <div><b>0</b><span>numeri economici simulati</span></div>
          </div>

          <div className="panel-divider" />
          <p className="microcopy">
            I conteggi descrivono la copertura delle fonti, non il totale della spesa.
            I valori economici entreranno solo dopo validazione del relativo ingestore.
          </p>
        </aside>

        <section className="panel map-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">ITALIA · VISTA NAZIONALE</span>
              <h2>Un solo punto di accesso</h2>
            </div>
            <span className="verified-badge">solo fonti verificabili</span>
          </div>

          <ItalyVisual />

          <div className="map-bottom">
            <div><b>SIOPE</b><span>flussi di cassa</span></div>
            <div><b>BDNCP</b><span>contratti pubblici</span></div>
            <div><b>CUP / PNRR</b><span>progetti e opere</span></div>
          </div>
        </section>

        <aside className="panel flow-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">FRESCHEZZA</span>
              <h2>Quando cambia il dato</h2>
            </div>
          </div>

          <div className="flow-list">
            {priorities.map((item) => (
              <div className="flow-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.cadence}</span>
                </div>
                <b>{item.state}</b>
              </div>
            ))}
          </div>

          <Link href="/fonti" className="text-link">
            Registro completo delle fonti <span>→</span>
          </Link>
        </aside>
      </section>

      <section className="principles">
        <div>
          <span className="section-index">01</span>
          <h2>Non una classifica dello scandalo.<br />Una infrastruttura di verifica.</h2>
        </div>
        <div className="principle-copy">
          <p>
            Un affidamento diretto, una spesa elevata o un fornitore ricorrente non provano
            un illecito. La piattaforma renderà visibili pattern, confronti e documenti per
            permettere a cittadini, giornalisti, ricercatori e amministrazioni di verificare.
          </p>
          <Link href="/metodologia">Leggi i principi metodologici →</Link>
        </div>
      </section>

      <section className="domain-grid">
        {domains.map((domain) => (
          <article className="domain-card" id={domain.id} key={domain.id}>
            <span>{domain.kicker}</span>
            <h3>{domain.title}</h3>
            <p>{domain.description}</p>
            <div className="chips">
              {domain.chips.map((chip) => <i key={chip}>{chip}</i>)}
            </div>
          </article>
        ))}
      </section>

      <section className="source-strip">
        <div className="source-strip-copy">
          <span className="panel-kicker">PROVENIENZA PRIMA DI TUTTO</span>
          <h2>Ogni record conserva la strada fino all&apos;originale.</h2>
          <p>
            URL ufficiale, identificativo sorgente, data di pubblicazione, data di acquisizione,
            frequenza attesa e trasformazioni applicate. Nessun dato derivato senza poter
            ricostruire come è stato ottenuto.
          </p>
        </div>

        <div className="source-stack">
          {publicSources.slice(0, 5).map((source, index) => (
            <a href={source.url} target="_blank" rel="noreferrer" key={source.slug}>
              <span>0{index + 1}</span>
              <div><b>{source.name}</b><small>{source.owner}</small></div>
              <i>↗</i>
            </a>
          ))}
        </div>
      </section>

      <section className="cta">
        <span>OPEN SOURCE · OPEN DATA · ACCOUNTABILITY</span>
        <h2>La trasparenza funziona quando il dato è semplice da trovare e difficile da fraintendere.</h2>
        <div className="hero-actions">
          <Link href="/fonti" className="button button-primary">Esplora le fonti</Link>
          <Link href="/metodologia" className="button button-secondary">Come costruiamo gli indicatori</Link>
        </div>
      </section>
    </main>
  );
}
