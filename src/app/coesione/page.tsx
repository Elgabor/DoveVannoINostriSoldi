import type { Metadata } from "next";
import Link from "next/link";
import { CohesionHistoryChart } from "@/components/charts/cohesion-history-chart";
import { compactEuro, exactEuro, integer, longDate, percent } from "@/lib/format";
import {
  openCoesionePaymentCostRatio,
  openCoesioneSnapshot as snapshot,
} from "@/lib/opencoesione-snapshot";
import styles from "./coesione.module.css";

export const metadata: Metadata = {
  title: "Fondi e progetti",
  description:
    "Costo previsto, pagamenti e progetti delle politiche di coesione in Italia, per tema, natura e stato, con la serie storica OpenCoesione.",
};

/** The snapshot keeps money in cents; every figure on the page starts here. */
function euros(cents: number): number {
  return cents / 100;
}

function share(paid: number, cost: number): number {
  return cost > 0 ? (paid / cost) * 100 : 0;
}

/** A signed euro delta, so "we reconciled and it matched" is visible as 0 €. */
function reconciliationLabel(cents: number): string {
  if (cents === 0) return "0 €";
  return `${cents > 0 ? "+" : "−"}${exactEuro(Math.abs(euros(cents)))}`;
}

export default function CohesionPage() {
  const ratio = openCoesionePaymentCostRatio * 100;

  const themes = [...snapshot.themes].sort(
    (left, right) => right.publicCostCents - left.publicCostCents,
  );
  const natures = [...snapshot.natures].sort(
    (left, right) => right.publicCostCents - left.publicCostCents,
  );
  const statuses = [...snapshot.statuses].sort((left, right) => right.projects - left.projects);
  const maxStatusProjects = Math.max(...statuses.map((status) => status.projects), 0);

  const themesByShare = [...themes]
    .map((theme) => ({
      ...theme,
      paidShare: share(theme.paymentsCents, theme.publicCostCents),
    }))
    .sort((left, right) => right.paidShare - left.paidShare);

  /* The full series starts in 1990; the table only shows the recent years,
     where the numbers actually move. */
  const recentYears = snapshot.annualSeries.slice(-5);

  return (
    <main className="shell page">
      <div className="page-intro">
        <h1>Fondi e progetti finanziati</h1>
        <p>
          {integer(snapshot.totals.projects)} progetti seguiti da OpenCoesione dal 1990 a oggi.
          Dati al {longDate(`${snapshot.referenceDate}T00:00:00Z`)}, controllati il{" "}
          {longDate(snapshot.source.observedAt)}.
        </p>
      </div>

      <div className="stat-strip">
        <div>
          <span className="stat-label">Soldi messi sul piatto</span>
          <span className="stat-value">{compactEuro(euros(snapshot.totals.publicCostCents))}</span>
          <span className="stat-note">
            di cui {compactEuro(euros(snapshot.totals.cohesionPublicCostCents))} da fondi di
            coesione
          </span>
        </div>
        <div>
          <span className="stat-label">Soldi già pagati</span>
          <span className="stat-value">{compactEuro(euros(snapshot.totals.paymentsCents))}</span>
          <span className="stat-note">
            di cui {compactEuro(euros(snapshot.totals.cohesionPaymentsCents))} da fondi di coesione
          </span>
        </div>
        <div>
          <span className="stat-label">Pagato sul costo previsto</span>
          <span className="stat-value">{percent(ratio)}</span>
          <span className="stat-note">rapporto finanziario, non fisico</span>
        </div>
        <div>
          <span className="stat-label">Progetti seguiti</span>
          <span className="stat-value">{integer(snapshot.totals.projects)}</span>
          <span className="stat-note">dal 1990 a oggi</span>
        </div>
      </div>

      <div className={styles.tables}>
        <section className="panel">
          <h2 className="panel-title">Dove vanno questi soldi · per tema</h2>
          <div className="table-scroll" role="region" aria-label="Spesa di coesione per tema" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Tema</th>
                  <th scope="col" className="num">Costo previsto</th>
                  <th scope="col" className="num">Già pagato</th>
                  <th scope="col" className="num">Progetti</th>
                </tr>
              </thead>
              <tbody>
                {themes.map((theme) => (
                  <tr key={theme.slug}>
                    <th scope="row">{theme.label}</th>
                    <td className="num">{compactEuro(euros(theme.publicCostCents))}</td>
                    <td className="num">{compactEuro(euros(theme.paymentsCents))}</td>
                    <td className="num">{integer(theme.projects)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">Come vengono spesi · per natura</h2>
          <div className="table-scroll" role="region" aria-label="Spesa di coesione per natura" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Natura della spesa</th>
                  <th scope="col" className="num">Costo previsto</th>
                  <th scope="col" className="num">Già pagato</th>
                  <th scope="col" className="num">Progetti</th>
                </tr>
              </thead>
              <tbody>
                {natures.map((nature) => (
                  <tr key={nature.slug}>
                    <th scope="row">{nature.label}</th>
                    <td className="num">{compactEuro(euros(nature.publicCostCents))}</td>
                    <td className="num">{compactEuro(euros(nature.paymentsCents))}</td>
                    <td className="num">{integer(nature.projects)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">A che punto sono i progetti</h2>
        <ul className={styles.statusList}>
          {statuses.map((status) => (
            <li key={status.slug}>
              <span>{status.label}</span>
              <i aria-hidden="true">
                <b
                  style={{
                    width:
                      maxStatusProjects > 0
                        ? `${(status.projects / maxStatusProjects) * 100}%`
                        : "0%",
                  }}
                />
              </i>
              <b>
                {integer(status.projects)} · {compactEuro(euros(status.publicCostCents))}
              </b>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Le barre confrontano il numero di progetti; gli importi sono il costo pubblico previsto.
        </p>
      </section>

      <div className={styles.tables}>
        <section className="panel">
          <h2 className="panel-title">La serie storica · cumulata</h2>
          <CohesionHistoryChart data={snapshot.annualSeries} />
          <div className="table-scroll" role="region" aria-label="Serie annuale OpenCoesione" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Anno</th>
                  <th scope="col" className="num">Impegni</th>
                  <th scope="col" className="num">Pagamenti</th>
                  <th scope="col" className="num">Pagato</th>
                </tr>
              </thead>
              <tbody>
                {recentYears.map((point) => (
                  <tr key={point.year}>
                    <th scope="row">{point.year}</th>
                    <td className="num">{compactEuro(euros(point.commitmentsCents))}</td>
                    <td className="num">{compactEuro(euros(point.paymentsCents))}</td>
                    <td className="num">
                      {percent(share(point.paymentsCents, point.commitmentsCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            La serie cresce nel tempo perché è cumulata dal 1990: non è la spesa del singolo anno.
          </p>
        </section>

        <section className="panel">
          <h2 className="panel-title">Quanto è già stato pagato · per tema</h2>
          <ul className={styles.shareList}>
            {themesByShare.map((theme) => (
              <li key={theme.slug}>
                <span>{theme.label}</span>
                <i aria-hidden="true">
                  <b style={{ width: `${Math.min(theme.paidShare, 100)}%` }} />
                </i>
                <b>{percent(theme.paidShare)}</b>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            I lavori pubblici (trasporti, ambiente) pagano più lentamente: durano anni. I contributi
            a persone e imprese escono più in fretta.
          </p>
        </section>
      </div>

      <div className="notice">
        <strong>Cosa non dice questo dato</strong>
        <p>
          “Pagato” vuol dire che i soldi sono usciti, non che l&apos;opera è finita.{" "}
          {snapshot.methodology.territorialWarning}
        </p>
      </div>

      <section className="panel">
        <h2 className="panel-title">Fonte e verifica</h2>
        <dl className={styles.sourceGrid}>
          <div>
            <dt>Fonte</dt>
            <dd>{snapshot.source.owner}</dd>
          </div>
          <div>
            <dt>Dataset</dt>
            <dd>{snapshot.source.dataset}</dd>
          </div>
          <div>
            <dt>Licenza</dt>
            <dd>{snapshot.source.license}</dd>
          </div>
          <div>
            <dt>Cadenza dichiarata</dt>
            <dd>{snapshot.source.declaredCadence}</dd>
          </div>
          <div>
            <dt>Controllo automatico</dt>
            <dd>{snapshot.source.platformCheckCadence}</dd>
          </div>
          <div>
            <dt>Ultimo controllo</dt>
            <dd>{longDate(snapshot.source.observedAt)}</dd>
          </div>
        </dl>
        <p className={styles.note}>
          Ricontiamo ogni raggruppamento contro il totale nazionale: differenza sugli stati{" "}
          {reconciliationLabel(snapshot.reconciliation.statuses.publicCostDeltaCents)}, sui temi{" "}
          {reconciliationLabel(snapshot.reconciliation.themes.publicCostDeltaCents)}, sulle nature{" "}
          {reconciliationLabel(snapshot.reconciliation.natures.publicCostDeltaCents)}. La fonte
          arrotonda all&apos;euro: accettiamo al massimo due euro di scarto e nessuna differenza nel
          numero dei progetti.
        </p>
        <div className={styles.actions}>
          <a
            className="btn btn-secondary"
            href={snapshot.source.endpoint}
            target="_blank"
            rel="noreferrer"
          >
            API OpenCoesione ↗
          </a>
          <Link className="btn btn-secondary" href="/api/coesione">
            Dati pronti per altre applicazioni
          </Link>
          <Link className="btn btn-secondary" href="/fonti">
            Registro delle fonti
          </Link>
          <Link className="btn btn-secondary" href="/metodologia">
            Metodologia
          </Link>
        </div>
      </section>
    </main>
  );
}
