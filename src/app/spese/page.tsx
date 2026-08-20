import Link from "next/link";
import type { Metadata } from "next";
import { PeriodSelector } from "@/components/period-selector";
import { billions, compactEuro, exactEuro, integer, percent, longDate } from "@/lib/format";
import { PASS_THROUGH_TITLE_CODE, siopeTitleCopy } from "@/lib/siope-titles";
import {
  availableSiopeYears,
  completedMonths,
  getSiopeMunicipalSnapshot,
  partialMonth,
} from "@/lib/siope-snapshot";
import styles from "./spese.module.css";

export const metadata: Metadata = {
  title: "Soldi",
  description:
    "Per cosa vengono spesi i soldi dei Comuni: le voci di uscita dei pagamenti di cassa SIOPE, mese per mese.",
};

function selectedYear(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] ?? "" : value ?? "", 10);
  return availableSiopeYears.includes(parsed) ? parsed : availableSiopeYears[0];
}

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string | string[] }>;
}) {
  const year = selectedYear((await searchParams).anno);
  const data = getSiopeMunicipalSnapshot(year);

  const monthLabel = data.latestMonthLabel.toLocaleLowerCase("it-IT");
  const passThrough =
    data.titles.find((title) => title.code === PASS_THROUGH_TITLE_CODE)?.value ?? 0;
  const realSpending = data.totalPaid - passThrough;

  /* The running month is still filling up, so it would drag the average down.
     A closed year has no running month and counts all twelve. */
  const runningMonth = partialMonth(data);
  const settledMonths = completedMonths(data);
  const completedAverage =
    settledMonths.length > 0
      ? settledMonths.reduce((sum, point) => sum + point.flow, 0) / settledMonths.length
      : 0;
  const completedRange =
    settledMonths.length > 0
      ? `da ${settledMonths[0].label.toLocaleLowerCase("it-IT")} a ${settledMonths[settledMonths.length - 1].label.toLocaleLowerCase("it-IT")} ${data.year}`
      : "nessun mese completo";

  const maxFlow = Math.max(...data.monthly.map((point) => point.flow), 0);
  const titles = data.titles.map((title) => ({
    ...title,
    copy: siopeTitleCopy(title.code),
    share: data.totalPaid > 0 ? (title.value / data.totalPaid) * 100 : 0,
  }));

  return (
    <main className="shell page">
      <div className={styles.intro}>
        <div className="page-intro">
          <h1>Per cosa vengono spesi i soldi</h1>
          <p>
            Pagamenti dei Comuni da gennaio a {monthLabel} {data.year}, divisi per tipo di uscita.
            Fonte SIOPE, file del {longDate(data.source.siopeMovementsLastModified)}.
          </p>
        </div>
        <PeriodSelector activeYear={year} years={availableSiopeYears} pathname="/spese" />
      </div>

      <div className="stat-strip">
        <div>
          <span className="stat-label">Totale pagato</span>
          <span className="stat-value">{compactEuro(data.totalPaid)}</span>
          <span className="stat-note">{exactEuro(data.totalPaid)} esatti</span>
        </div>
        <div>
          <span className="stat-label">Spesa vera, senza giroconti</span>
          <span className="stat-value">{compactEuro(realSpending)}</span>
          <span className="stat-note">tolte le partite di giro</span>
        </div>
        <div>
          <span className="stat-label">Media dei mesi completi</span>
          <span className="stat-value">{compactEuro(completedAverage)}</span>
          <span className="stat-note">{completedRange}</span>
        </div>
        <div>
          <span className="stat-label">Per abitante</span>
          <span className="stat-value">
            {data.nationalPerCapita === null ? "Non disponibile" : exactEuro(data.nationalPerCapita)}
          </span>
          <span className="stat-note">su {integer(data.populationCovered)} abitanti</span>
        </div>
      </div>

      <div className={styles.split}>
        <section className="panel">
          <h2 className="panel-title">Le {data.titles.length} voci di uscita</h2>
          <ol className={styles.titleList}>
            {titles.map((title) => (
              <li key={title.code}>
                <div className={styles.titleHead}>
                  <h3>
                    {title.copy.name}
                    <small> · {title.copy.official}</small>
                  </h3>
                  <b>
                    {compactEuro(title.value)} · {percent(title.share)}
                  </b>
                </div>
                <div className={styles.titleTrack} aria-hidden="true">
                  <i style={{ width: `${title.share}%` }} />
                </div>
                <p>{title.copy.explanation}</p>
                <small>Valore esatto: {exactEuro(title.value)}.</small>
              </li>
            ))}
          </ol>
        </section>

        <div className={styles.aside}>
          <section className="panel">
            <h2 className="panel-title">Mese per mese · mld €</h2>
            <ul className={styles.monthList}>
              {data.monthly.map((point) => {
                const running = point.month === runningMonth;
                return (
                  <li key={point.month}>
                    <span>
                      {point.label}
                      {running ? "*" : ""}
                    </span>
                    <i aria-hidden="true">
                      <b
                        className={running ? styles.running : undefined}
                        style={{ width: maxFlow > 0 ? `${(point.flow / maxFlow) * 100}%` : "0%" }}
                      />
                    </i>
                    <b className="num-tabular">{billions(point.flow)}</b>
                  </li>
                );
              })}
            </ul>
            {runningMonth === null ? (
              <p className={styles.note}>Anno chiuso: tutti i mesi sono definitivi.</p>
            ) : (
              <p className={styles.note}>
                *{data.latestMonthLabel} è ancora in corso: il numero salirà.
              </p>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title">Flusso e cumulato · mld €</h2>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Mese</th>
                    <th scope="col" className="num">Pagato</th>
                    <th scope="col" className="num">Cumulato</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map((point) => (
                    <tr key={point.month}>
                      <th scope="row">
                        {point.label}
                        {point.month === runningMonth ? "*" : ""}
                      </th>
                      <td className="num">{billions(point.flow)}</td>
                      <td className="num">{billions(point.cumulative)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <div className="notice warning-notice">
        <strong>Attenzione</strong>
        <p>
          Queste voci arrivano dalla contabilità dei Comuni. Non dicono se una spesa è utile o
          sprecata: dicono soltanto in quale categoria è stata registrata.
        </p>
      </div>

      <details className={styles.method}>
        <summary>Come sono raccolti questi dati</summary>
        <p>
          Misura: {data.methodology.measure}. {data.methodology.periodicity}. Righe lette:{" "}
          {integer(data.coverage.movementRows)} · incluse:{" "}
          {integer(data.coverage.includedMovementRows)} · malformate:{" "}
          {integer(data.coverage.malformedRows)}. Il collegamento territoriale usa il{" "}
          {data.methodology.territorialJoin}.
        </p>
        <p>
          Fonte:{" "}
          <a href={data.source.siopeMovementsUrl} target="_blank" rel="noreferrer">
            SIOPE
          </a>{" "}
          · {data.source.siopeOwner} · scaricato il {longDate(data.source.observedAt)}.{" "}
          <Link href="/metodologia">Come leggiamo i dati →</Link>
        </p>
      </details>
    </main>
  );
}
