import type { Metadata } from "next";
import Link from "next/link";
import {
  auditReviewedAt,
  auditScenarios,
  auditSignals,
  centralScenarioBreakdown,
  procurementComparison,
  type AuditSignal,
} from "@/lib/audit-data";
import { longDate } from "@/lib/format";
import styles from "./controlli.module.css";

export const metadata: Metadata = {
  title: "Cosa controllare",
  description:
    "Numeri e aree della spesa pubblica che meritano verifiche più approfondite, senza trasformare segnali in accuse.",
};

const number = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 1,
  useGrouping: "always",
});

/* Reference dates arrive as the source states them: "2025", "2026-02" or a
   full "2025-01-31". Render each at the precision it actually carries. */
function referencePeriod(value: string): string {
  const parts = value.split("-");
  if (parts.length === 1) return value;

  const date = new Date(`${parts.length === 2 ? `${value}-01` : value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("it-IT", {
    ...(parts.length === 3 ? { day: "numeric" as const } : {}),
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSignal(signal: AuditSignal) {
  if (signal.unit === "percent") return `${number.format(signal.value)}%`;
  if (signal.unit === "billion-euro") return `${number.format(signal.value)} mld €`;
  if (signal.unit === "million-euro") return `${number.format(signal.value)} mln €`;
  return number.format(signal.value);
}

export default function ControlsPage() {
  const maxScenario = Math.max(...auditScenarios.map((scenario) => scenario.annualBillion));
  const centralTotal = centralScenarioBreakdown.reduce((sum, item) => sum + item.value, 0);
  const maxBreakdown = Math.max(...centralScenarioBreakdown.map((item) => item.value));

  return (
    <main className="shell page">
      <div className="page-intro">
        <h1>Cosa vale la pena controllare</h1>
        <p>
          Numeri presi da relazioni ufficiali, rivisti il {longDate(`${auditReviewedAt}T00:00:00Z`)}.
          Ognuno dice una cosa precisa, e sotto trovi anche cosa non dice.
        </p>
      </div>

      <div className="notice">
        <strong>La regola più importante</strong>
        <p>
          Pagamenti, debiti, costi e ipotesi sono numeri diversi e non vanno sommati. Un segnale
          serve ad aprire una verifica, non a chiuderla.
        </p>
      </div>

      <div className={styles.signals}>
        {auditSignals.map((signal) => (
          <article className="panel" key={signal.id} data-tone={signal.tone}>
            <h2 className="panel-title">
              {signal.area} · {referencePeriod(signal.referenceDate)}
            </h2>
            <strong className={styles.signalValue}>{formatSignal(signal)}</strong>
            <h3>{signal.label}</h3>
            <p>{signal.plainMeaning}</p>
            <footer>
              <span>{signal.caveat}</span>
              <a href={signal.source.url} target="_blank" rel="noreferrer">
                {signal.source.institution} ↗
              </a>
            </footer>
          </article>
        ))}
      </div>

      <section className="panel">
        <h2 className="panel-title">
          Appalti: tanti affidamenti, una quota di valore più piccola
        </h2>
        <div className={styles.comparison}>
          <div>
            <span>
              <strong>{number.format(procurementComparison.byNumber)}%</strong> delle procedure
            </span>
            <div className={styles.track} aria-hidden="true">
              <i style={{ width: `${procurementComparison.byNumber}%` }} />
            </div>
            <p>Misura quante procedure usano affidamento diretto o negoziata senza bando.</p>
          </div>
          <div>
            <span>
              <strong>{number.format(procurementComparison.byValue)}%</strong> del valore
            </span>
            <div className={styles.track} aria-hidden="true">
              <i style={{ width: `${procurementComparison.byValue}%` }} />
            </div>
            <p>
              Circa {number.format(procurementComparison.exposedValueBillion)} miliardi su{" "}
              {number.format(procurementComparison.totalValueBillion)}.
            </p>
          </div>
        </div>
        <p className={styles.note}>
          Minore confronto competitivo significa più bisogno di confrontare prezzi, motivazioni e
          rotazione. Non significa automaticamente corruzione.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          Quanto si potrebbe recuperare ogni anno · tre ipotesi
        </h2>
        <div className={styles.scenarios}>
          {auditScenarios.map((scenario) => (
            <div key={scenario.id}>
              <strong>{number.format(scenario.annualBillion)} mld €</strong>
              <span>Ipotesi {scenario.label.toLocaleLowerCase("it-IT")}</span>
              <div className={styles.track} aria-hidden="true">
                <i style={{ width: `${(scenario.annualBillion / maxScenario) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          Da dove arriva l&apos;ipotesi centrale ({number.format(centralTotal)} mld €)
        </h2>
        <ul className={styles.breakdown}>
          {centralScenarioBreakdown.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <i aria-hidden="true">
                <b style={{ width: `${(item.value / maxBreakdown) * 100}%` }} />
              </i>
              <b>{number.format(item.value)} mld €</b>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Sono stime costruite su ipotesi dichiarate, non soldi già disponibili. Servono a capire
          l&apos;ordine di grandezza, non a promettere risparmi.
        </p>
      </section>

      <div className="notice warning-notice">
        <strong>Un segnale non è una colpa</strong>
        <p>
          Prima di giudicare un ente bisogna conoscere quantità, servizio, periodo, regole
          applicabili e fonte originale.{" "}
          <Link href="/fonti">Vai alle fonti ufficiali →</Link> ·{" "}
          <Link href="/metodologia">Come leggiamo i dati →</Link>
        </p>
      </div>
    </main>
  );
}
