import type { Metadata } from "next";
import Link from "next/link";
import { compactEuro, percent } from "@/lib/format";
import { getSsnNationalHistory, type SsnNationalHistory } from "@/lib/ssn-national-history";
import type { SsnCceMetricId } from "@/lib/data/ssn-cce-contract";
import styles from "./storico.module.css";

export const dynamic = "force-dynamic";

const PAGE_DATA_BUDGET_MS = 30_000;

export const metadata: Metadata = {
  title: "Serie storica della spesa sanitaria",
  description:
    "Conto Economico nazionale del Servizio Sanitario Nazionale dal 2012 al 2024, per costi del personale, servizi e prestazioni di lavoro.",
};

const metricOrder: SsnCceMetricId[] = [
  "productionCosts",
  "personnelCost",
  "healthcareWorkServices",
  "nonHealthcareWorkServices",
  "purchasedServices",
];

const metricTitle: Record<SsnCceMetricId, string> = {
  productionCosts: "Totale costi della produzione",
  personnelCost: "Costo del personale",
  healthcareWorkServices: "Prestazioni di lavoro sanitarie",
  nonHealthcareWorkServices: "Prestazioni di lavoro non sanitarie",
  purchasedServices: "Acquisti di servizi",
};

function euro(cents: number): number {
  return cents / 100;
}

function HistoryTable({ history }: { history: SsnNationalHistory }) {
  const first = history.years[0];
  const last = history.years.at(-1)!;

  return (
    <>
      <div className="table-scroll" role="region" aria-label="Conto Economico SSN nazionale, serie storica" tabIndex={0}>
        <table className="table">
          <caption>Conto Economico consuntivo nazionale degli enti del SSN, OpenBDAP RGS</caption>
          <thead>
            <tr>
              <th scope="col">Anno</th>
              {metricOrder.map((metric) => (
                <th scope="col" className="num" key={metric}>{metricTitle[metric]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.years.map((entry) => (
              <tr key={entry.year}>
                <th scope="row">{entry.year}</th>
                {metricOrder.map((metric) => (
                  <td className="num" key={metric}>{compactEuro(euro(entry.values[metric]))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.summary}>
        Dal {first.year} al {last.year}, il totale dei costi della produzione (voce{" "}
        <code>BZ9999</code>) è passato da {compactEuro(euro(first.values.productionCosts))} a{" "}
        {compactEuro(euro(last.values.productionCosts))} ({percent(
          ((last.values.productionCosts - first.values.productionCosts) / first.values.productionCosts) * 100,
        )}). È una variazione osservata su {history.years.length} anni, non un giudizio su efficienza,
        qualità o organico: comprende inflazione, nuove missioni di spesa ed eventi straordinari che
        questa serie non isola.
      </p>
    </>
  );
}

export default async function HealthSpendingHistoryPage() {
  let history: SsnNationalHistory | null = null;
  let errorMessage: string | null = null;

  try {
    history = await getSsnNationalHistory({ signal: AbortSignal.timeout(PAGE_DATA_BUDGET_MS) });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
  }

  return (
    <main className="shell page">
      <nav className={styles.breadcrumb} aria-label="Percorso">
        <Link href="/">Home</Link>
        <span>→</span>
        <Link href="/spese/sanita">Conto Economico della sanità</Link>
        <span>→</span>
        <span>Serie storica</span>
      </nav>

      <header className="page-intro">
        <h1>Serie storica della spesa sanitaria</h1>
        <p>
          Conto Economico nazionale degli enti del SSN, dal 2012 al 2024. Solo livello nazionale:
          il dettaglio per Regione e per singolo ente resta disponibile soltanto per il 2024 nella{" "}
          <Link href="/spese/sanita">pagina principale</Link>.
        </p>
      </header>

      {errorMessage ? (
        <p className={styles.note} role="alert">
          Dati OpenBDAP non raggiungibili in questo momento: {errorMessage}
        </p>
      ) : (
        <section className="panel">
          <h2 className="panel-title">2012-2024, valori di competenza economica</h2>
          <HistoryTable history={history!} />
        </section>
      )}

      <div className="notice">
        <strong>Cosa questa serie non dimostra</strong>
        <p>
          Sono voci di competenza economica del Conto Economico, non pagamenti di cassa: non
          identificano gettonisti, cooperative o organico, e non misurano qualità o efficienza
          sanitaria. Un aumento non è di per sé uno spreco né un miglioramento; una diminuzione non
          è di per sé un taglio di servizi. Confronti tra anni o tra Regioni richiedono lo stesso
          perimetro contabile e denominatori compatibili, che questa pagina non fornisce.
        </p>
        <p>
          Fonte: <a href="https://bdap-opendata.rgs.mef.gov.it" target="_blank" rel="noreferrer">OpenBDAP RGS</a>,
          Modello di rilevazione del Conto Economico degli enti del SSN a livello nazionale.
        </p>
      </div>
    </main>
  );
}
