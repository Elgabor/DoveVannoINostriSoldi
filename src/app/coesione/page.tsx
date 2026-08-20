import type { Metadata } from "next";
import Link from "next/link";
import { CohesionExplorerChart } from "@/components/charts/cohesion-explorer-chart";
import { CohesionHistoryChart } from "@/components/charts/cohesion-history-chart";
import {
  openCoesionePaymentCostRatio,
  openCoesioneSnapshot as snapshot,
} from "@/lib/opencoesione-snapshot";
import styles from "./coesione.module.css";

export const metadata: Metadata = {
  title: "Politiche di coesione",
  description:
    "Costo pubblico, pagamenti e progetti delle politiche di coesione in Italia, con temi, nature, stati, serie storica e provenienza OpenCoesione.",
};

const integer = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const exactEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function compactEuro(cents: number): string {
  const value = cents / 100;
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("it-IT", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} mld €`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mln €`;
  }
  return exactEuro.format(value);
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function reconciliationLabel(value: number): string {
  if (value === 0) return "0 €";
  return `${value > 0 ? "+" : "−"}${exactEuro.format(Math.abs(value) / 100)}`;
}

export default function CohesionPage() {
  const ratio = openCoesionePaymentCostRatio * 100;
  const latestAnnual = snapshot.annualSeries.at(-1);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Percorso">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Politiche di coesione</span>
      </nav>

      <header className={styles.header}>
        <div>
          <h1>Dove si concentrano gli investimenti per la coesione.</h1>
          <p>
            Un quadro nazionale dei progetti monitorati da OpenCoesione: costo pubblico, pagamenti,
            temi, natura e stato. I valori arrivano dall’API ufficiale e restano disponibili come
            ultimo snapshot verificato anche durante un disservizio della fonte.
          </p>
        </div>
        <aside className={styles.freshness} aria-label="Freschezza e provenienza del dato">
          <div><span>Fonte</span><strong>OpenCoesione</strong></div>
          <div><span>Dato aggiornato dalla fonte</span><strong>{formatDate(snapshot.referenceDate)}</strong></div>
          <div><span>Acquisito dalla piattaforma</span><strong>{formatDateTime(snapshot.generatedAt)}</strong></div>
          <div><span>Cadenza dichiarata</span><strong>{snapshot.source.declaredCadence}</strong></div>
          <div><span>Controllo automatico</span><strong>{snapshot.source.platformCheckCadence}</strong></div>
          <div><span>Consegna</span><strong>API ufficiale · snapshot verificato</strong></div>
          <div><span>Licenza</span><strong>{snapshot.source.license}</strong></div>
          <a href={snapshot.source.endpoint} target="_blank" rel="noreferrer">Apri l’aggregato originale ↗</a>
        </aside>
      </header>

      <section className={styles.overview} aria-label="Quadro nazionale OpenCoesione">
        <div className={styles.primaryMetric}>
          <span>Costo pubblico dei progetti monitorati</span>
          <strong>{compactEuro(snapshot.totals.publicCostCents)}</strong>
          <p>
            Totale nazionale pubblicato dalla fonte. Include la componente di coesione e le altre
            risorse pubbliche associate ai progetti monitorati.
          </p>
        </div>
        <div className={styles.facts}>
          <div><span>Pagamenti monitorati</span><strong>{compactEuro(snapshot.totals.paymentsCents)}</strong></div>
          <div><span>Progetti</span><strong>{integer.format(snapshot.totals.projects)}</strong></div>
          <div><span>Quota pagamenti / costo</span><strong>{ratio.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%</strong></div>
        </div>
      </section>

      <section className={styles.ratioSection} aria-labelledby="ratio-title">
        <div>
          <h2 id="ratio-title">Quanto è stato pagato rispetto al costo monitorato</h2>
          <p>
            Il rapporto è finanziario: confronta i pagamenti pubblicati con il costo pubblico
            aggregato. Non misura l’avanzamento fisico, la qualità o il completamento dei progetti.
          </p>
        </div>
        <div className={styles.ratioVisual}>
          <div className={styles.ratioTrack} aria-hidden="true">
            <span style={{ width: `${Math.min(100, ratio)}%` }} />
          </div>
          <div><strong>{ratio.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%</strong><span>rapporto aggregato</span></div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="explorer-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="explorer-title">Esplora la composizione dei progetti</h2>
            <p>Ordina per costo pubblico e passa fra tema, natura dell’intervento e stato del progetto.</p>
          </div>
          <span>Costo pubblico · euro correnti</span>
        </div>
        <CohesionExplorerChart
          themes={snapshot.themes}
          natures={snapshot.natures}
          statuses={snapshot.statuses}
        />
      </section>

      <section className={styles.section} aria-labelledby="history-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="history-title">Come si è formato il cumulato</h2>
            <p>Impegni e pagamenti attribuiti dalla fonte all’anno di riferimento, mostrati come serie cumulativa.</p>
          </div>
          {latestAnnual && <span>Serie fino al {latestAnnual.year}</span>}
        </div>
        <CohesionHistoryChart data={snapshot.annualSeries} />
      </section>

      <section className={styles.method} aria-labelledby="method-title">
        <div>
          <h2 id="method-title">Come leggere e verificare questi numeri</h2>
          <p>
            Lo snapshot conserva i centesimi come interi, valida schema e dominio della fonte e
            riconcilia ogni classificazione con il totale nazionale. La fonte arrotonda alcuni
            aggregati all’euro: accettiamo al massimo due euro di scarto e nessuno scarto nei progetti.
          </p>
        </div>
        <dl>
          <div><dt>Stati</dt><dd>{reconciliationLabel(snapshot.reconciliation.statuses.publicCostDeltaCents)}</dd></div>
          <div><dt>Temi</dt><dd>{reconciliationLabel(snapshot.reconciliation.themes.publicCostDeltaCents)}</dd></div>
          <div><dt>Nature</dt><dd>{reconciliationLabel(snapshot.reconciliation.natures.publicCostDeltaCents)}</dd></div>
        </dl>
        <div className={styles.warning}>
          <strong>Perché non sommiamo ancora i territori</strong>
          <p>{snapshot.methodology.territorialWarning}</p>
        </div>
        <div className={styles.actions}>
          <a href={snapshot.source.endpoint} target="_blank" rel="noreferrer">API OpenCoesione ↗</a>
          <Link href="/api/coesione">API normalizzata</Link>
          <Link href="/fonti">Registro delle fonti</Link>
          <Link href="/metodologia">Metodologia</Link>
        </div>
      </section>
    </main>
  );
}
