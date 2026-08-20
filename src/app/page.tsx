import Link from "next/link";
import { HomeMonthlyChart } from "@/components/charts/home-monthly-chart";
import { InfoTooltip } from "@/components/info-tooltip";
import { ItalyRegionsMap } from "@/components/italy-regions-map";
import { classifyFreshness } from "@/lib/data/freshness";
import { SOURCE_POLICIES } from "@/lib/data/source-policy";
import {
  openCoesionePaymentCostRatio,
  openCoesioneSnapshot as cohesion,
} from "@/lib/opencoesione-snapshot";
import { siopeMunicipalSnapshot as siope } from "@/lib/siope-snapshot";
import { publicSources, sourceCounts } from "@/lib/sources";
import styles from "./home.module.css";

const integer = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const exactEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function compactEuro(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("it-IT", { maximumFractionDigits: 2 })} mld €`;
  }
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mln €`;
  }
  return exactEuro.format(value);
}

function date(value: string | null): string {
  if (!value) return "non disponibile";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "non disponibile";
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(parsed);
}

const period = `gennaio–${siope.latestMonthLabel.toLocaleLowerCase("it-IT")} ${siope.year}`;
const coverageRatio =
  siope.coverage.activeSiopeMunicipalities > 0
    ? (siope.coverage.withMovements / siope.coverage.activeSiopeMunicipalities) * 100
    : 0;
const cohesionRatioPercent = openCoesionePaymentCostRatio * 100;
const cohesionFreshness = classifyFreshness(
  SOURCE_POLICIES.opencoesione.staleAfterSeconds,
  cohesion.referenceDate,
  new Date(cohesion.generatedAt),
);
const cohesionFreshnessLabel =
  cohesionFreshness.state === "stale"
    ? "Aggiornamento atteso"
    : cohesionFreshness.state === "fresh"
      ? "Dato nei tempi attesi"
      : "Freschezza non determinabile";
const cohesionFreshnessClass =
  cohesionFreshness.state === "stale"
    ? styles.expected
    : cohesionFreshness.state === "fresh"
      ? styles.current
      : styles.unknown;

const sourceBySlug = new Map(publicSources.map((source) => [source.slug, source]));
const sourceRows = ["siope", "openbdap", "ipa", "opencoesione", "partecipazioni-pubbliche"]
  .map((slug) => sourceBySlug.get(slug))
  .filter((source): source is NonNullable<typeof source> => Boolean(source));

const analysisPaths = [
  { href: "/spese", area: "Spesa dello Stato", detail: "Pagamenti, missioni e serie mensile", source: "RGS · OpenBDAP", status: "Dashboard attiva" },
  { href: "/territori", area: "Territori", detail: "Pagamenti di cassa di Comuni e regioni", source: "SIOPE · IPA", status: "Dashboard attiva" },
  { href: "/coesione", area: "Politiche di coesione", detail: "Costo, pagamenti e progetti monitorati", source: "OpenCoesione", status: "Dashboard attiva" },
  { href: "/enti", area: "Enti pubblici", detail: "Ricerca nel registro nazionale", source: "IPA · AgID", status: "Ricerca attiva" },
  { href: "/partecipazioni", area: "Partecipazioni pubbliche", detail: "Relazioni amministrazioni–partecipate", source: "MEF · rilevazione 2023", status: "Snapshot attivo" },
  { href: "/fonti", area: "Contratti pubblici", detail: "CIG, procedure e aggiudicazioni", source: "ANAC · BDNCP", status: "In integrazione" },
];

export default function HomePage() {
  return (
    <main className={styles.dashboard}>
      <header className={styles.overviewHeader}>
        <div>
          <h1>Quadro nazionale</h1>
          <p>Dati ufficiali disponibili oggi su spesa, enti e progetti pubblici.</p>
        </div>
        <Link href="/fonti/stato">Stato e frequenza delle fonti <span>→</span></Link>
      </header>

      <section className={styles.pulse} aria-label="Copertura attuale della piattaforma">
        <div><strong>{sourceCounts.active}</strong><span>fonti con adapter attivo</span></div>
        <div><strong>{integer.format(siope.coverage.includedMovementRows)}</strong><span>movimenti SIOPE inclusi</span></div>
        <div><strong>{integer.format(siope.coverage.withMovements)}</strong><span>Comuni con movimenti</span></div>
        <div><strong>{siope.regions.length}</strong><span>regioni aggregate</span></div>
        <div><strong>{integer.format(cohesion.totals.projects)}</strong><span>progetti OpenCoesione</span></div>
      </section>

      <section className={styles.siopeGrid} aria-labelledby="siope-title">
        <article className={styles.primaryMetric}>
          <div className={styles.sectionLabel}>
            <span>SIOPE · COMUNI</span>
            <InfoTooltip id="cash-payments-tip" label="Che cosa sono i pagamenti di cassa?">
              Uscite effettivamente registrate in SIOPE dai Comuni. Non rappresentano tutta la spesa pubblica italiana.
            </InfoTooltip>
          </div>
          <h2 id="siope-title">Pagamenti di cassa</h2>
          <strong>{compactEuro(siope.totalPaid)}</strong>
          <p>Cumulato {period}</p>
          <dl>
            <div><dt>Comuni inclusi</dt><dd>{integer.format(siope.coverage.withMovements)}</dd></div>
            <div>
              <dt className={styles.inlineTerm}>
                Copertura
                <InfoTooltip id="coverage-tip" label="Come calcoliamo la copertura?">
                  Comuni con almeno un movimento nel periodo divisi per gli enti comunali attivi nell&apos;anagrafica SIOPE.
                </InfoTooltip>
              </dt>
              <dd>{coverageRatio.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%</dd>
            </div>
            <div><dt>File SIOPE · ultima modifica</dt><dd>{date(siope.source.siopeMovementsLastModified)}</dd></div>
          </dl>
          <Link href="/territori">Apri il dettaglio territoriale <span>→</span></Link>
        </article>

        <figure className={styles.monthlyPanel}>
          <header>
            <div>
              <span className={styles.sectionLabelText}>FLUSSO MENSILE · EURO</span>
              <h2>Quando vengono registrati i pagamenti</h2>
            </div>
            <b>SIOPE diretto</b>
          </header>
          <HomeMonthlyChart data={siope.monthly} />
          <figcaption>Movimenti mensili, non differenze stimate. Fonte SIOPE · {period} · valore esatto nel tooltip.</figcaption>
        </figure>
      </section>

      <section className={styles.mapPanel} aria-labelledby="map-title">
        <header className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabelText}>CONFRONTO TERRITORIALE · SIOPE</span>
            <h2 id="map-title">Pagamenti comunali per regione</h2>
            <p>Euro per abitante della popolazione coperta; seleziona una regione per il dettaglio.</p>
          </div>
          <Link href="/territori">Tabelle e classificazioni <span>→</span></Link>
        </header>
        <ItalyRegionsMap regions={siope.regions} period={period} />
        <footer className={styles.mapAttribution}>
          Confini amministrativi a fini statistici: {" "}
          <a href="https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip" target="_blank" rel="noreferrer">ISTAT, 1 gennaio 2026</a>
          {" · "}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>
          {" · "}geometria semplificata.
        </footer>
      </section>

      <section className={styles.secondaryGrid}>
        <article className={styles.cohesionPanel}>
          <header className={styles.panelHeader}>
            <div>
              <span className={styles.sectionLabelText}>OPENCOESIONE · AGGREGATO NAZIONALE</span>
              <h2>Investimenti e politiche di coesione</h2>
            </div>
            <span className={cohesionFreshnessClass}>{cohesionFreshnessLabel}</span>
          </header>

          <div className={styles.cohesionStats}>
            <div><span>Costo pubblico</span><strong>{compactEuro(cohesion.totals.publicCostCents / 100)}</strong></div>
            <div><span>Pagamenti registrati</span><strong>{compactEuro(cohesion.totals.paymentsCents / 100)}</strong></div>
            <div><span>Progetti monitorati</span><strong>{integer.format(cohesion.totals.projects)}</strong></div>
          </div>

          <div className={styles.ratioBlock}>
            <div>
              <span className={styles.inlineTerm}>
                Pagamenti / costo pubblico
                <InfoTooltip id="cohesion-ratio-tip" label="Che cosa significa questo rapporto?">
                  Rapporto finanziario aggregato. Non indica avanzamento fisico, qualità o completamento dei progetti.
                </InfoTooltip>
              </span>
              <strong>{cohesionRatioPercent.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%</strong>
            </div>
            <div className={styles.ratioTrack} aria-hidden="true"><i style={{ width: `${Math.min(cohesionRatioPercent, 100)}%` }} /></div>
            <p>Indicatore finanziario aggregato, non avanzamento fisico dei progetti.</p>
          </div>

          <footer>
            <span>Dati riferiti al {date(cohesion.referenceDate)} · fonte controllata il {date(cohesion.source.observedAt)}</span>
            <Link href="/coesione">Apri OpenCoesione <span>→</span></Link>
          </footer>
        </article>

        <aside className={styles.freshnessPanel}>
          <header>
            <span className={styles.sectionLabelText}>FRESCHEZZA</span>
            <h2>Quando cambia il dato</h2>
            <p>Pubblicazione della fonte e controllo della piattaforma restano distinti.</p>
          </header>
          <div className={styles.freshnessRows}>
            <article>
              <div><strong>SIOPE</strong><span>Pagamenti dei Comuni</span></div>
              <dl>
                <div><dt>Dati fino a</dt><dd>{siope.latestMonthLabel} {siope.year}</dd></div>
                <div><dt>File · ultima modifica</dt><dd>{date(siope.source.siopeMovementsLastModified)}</dd></div>
                <div><dt>Acquisizione</dt><dd>{date(siope.generatedAt)}</dd></div>
                <div><dt>Controllo</dt><dd>ogni ora</dd></div>
              </dl>
            </article>
            <article>
              <div><strong>OpenCoesione</strong><span>Aggregati nazionali</span></div>
              <dl>
                <div><dt>Data del dato</dt><dd>{date(cohesion.referenceDate)}</dd></div>
                <div><dt>Ultimo controllo</dt><dd>{date(cohesion.source.observedAt)}</dd></div>
                <div><dt>Cadenza</dt><dd>bimestrale prevista</dd></div>
                <div><dt>Controllo</dt><dd>ogni 6 ore</dd></div>
              </dl>
            </article>
          </div>
          <Link href="/fonti/stato">Vedi stato operativo completo <span>→</span></Link>
        </aside>
      </section>

      <section className={styles.pathsPanel} aria-labelledby="paths-title">
        <header className={styles.panelHeader}>
          <div>
            <span className={styles.sectionLabelText}>PERCORSI DI ANALISI</span>
            <h2 id="paths-title">Dal quadro generale alla fonte</h2>
          </div>
          <Link href="/metodologia">Come normalizziamo i dati <span>→</span></Link>
        </header>
        <div className={styles.pathTable}>
          <div className={styles.pathHead} aria-hidden="true"><span>Area</span><span>Contenuto</span><span>Fonte</span><span>Stato</span><span /></div>
          {analysisPaths.map((item) => (
            <Link href={item.href} className={styles.pathRow} key={item.area}>
              <strong>{item.area}</strong><span>{item.detail}</span><span>{item.source}</span>
              <b className={item.status === "In integrazione" ? styles.integrating : ""}>{item.status}</b>
              <i aria-hidden="true">→</i>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.sourceRegister} aria-labelledby="sources-title">
        <div>
          <h2 id="sources-title">Fonti ufficiali, collegate all&apos;originale.</h2>
          <p>Ogni vista espone perimetro, data e collegamento all&apos;originale.</p>
        </div>
        <div className={styles.sourceLinks}>
          {sourceRows.map((source) => (
            <a href={source.url} target="_blank" rel="noreferrer" key={source.slug}>
              <span><strong>{source.name}</strong><small>{source.owner}</small></span><i aria-hidden="true">↗</i>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
