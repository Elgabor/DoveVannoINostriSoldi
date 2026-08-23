import Link from "next/link";
import type { CSSProperties } from "react";
import { compactEuro, exactEuro, integer, percent } from "@/lib/format";
import type { MunicipalityProfile } from "@/lib/municipality-profile";
import { buildMunicipalitySpendingRows } from "@/lib/municipality-spending-view";
import type { ReportedMeasure } from "@/lib/mef-irpef-snapshot";
import styles from "./scheda.module.css";

function amount(measure: ReportedMeasure): number {
  return measure.coverage === "complete" ? measure.amountCents : measure.knownAmountCents;
}

function coverageLabel(measure: ReportedMeasure): string | null {
  return measure.coverage === "partial" ? "subtotale noto; alcune celle sono soppresse" : null;
}

function monthName(month: number): string {
  return new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2024, month - 1, 1)),
  );
}

function signedEuro(cents: number): string {
  return `${cents > 0 ? "+" : ""}${exactEuro(cents / 100)}`;
}

const titleExplanations: Readonly<Record<string, string>> = {
  "0": "Pagamenti ancora da classificare nella voce contabile definitiva.",
  "1": "Servizi, personale, acquisti e altre spese di funzionamento.",
  "2": "Opere pubbliche, investimenti e acquisto di beni durevoli.",
  "3": "Acquisizioni di partecipazioni, crediti e altre attività finanziarie.",
  "4": "Restituzione della quota capitale di prestiti e mutui.",
  "5": "Restituzione di anticipazioni ricevute dal tesoriere.",
  "7": "Somme incassate o pagate per conto di terzi e partite di giro.",
};

function coverageText(year: MunicipalityProfile["siope"]["data"]["years"][number]): string {
  return year.completeness === "partial"
    ? `Da gennaio a ${monthName(year.latestMonth)} · dati parziali`
    : "Anno completo";
}

export function MunicipalityEconomics({ profile }: { profile: MunicipalityProfile }) {
  const latestSiope = profile.siope.data.years[0];
  const irpef = profile.irpef.status === "available" ? profile.irpef.data : null;
  const openCivitas = profile.openCivitas.status === "available" ? profile.openCivitas.data : null;
  const irpefUnavailable = profile.irpef.status === "available" ? null : profile.irpef.message;
  const openCivitasUnavailable = profile.openCivitas.status === "available" ? null : profile.openCivitas.message;
  const pnrr = profile.pnrrChildcare.data;
  const spendingRows = buildMunicipalitySpendingRows(latestSiope.titles, latestSiope.totalCents);

  return (
    <>
      <section className={`panel ${styles.economicSection}`} aria-labelledby="siope-title" id="dati-economici">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionKicker}>SIOPE · pagamenti di cassa</span>
            <h2 className={styles.sectionTitle} id="siope-title">Pagamenti del Comune</h2>
          </div>
        </div>

        <dl className={styles.paymentSummary} aria-label={`Sintesi dei pagamenti ${latestSiope.year}`}>
          <div className={styles.paymentTotal}>
            <dt>Totale pagato</dt>
            <dd>
              {latestSiope.totalCents === null
                ? "Nessun movimento osservato"
                : compactEuro(latestSiope.totalCents / 100)}
            </dd>
          </div>
          <div>
            <dt>Per abitante</dt>
            <dd>
              {latestSiope.perCapitaCents === null
                ? "Non disponibile"
                : exactEuro(latestSiope.perCapitaCents / 100)}
            </dd>
          </div>
          <div>
            <dt>Periodo osservato</dt>
            <dd>
              {latestSiope.completeness === "partial"
                ? `Da gennaio a ${monthName(latestSiope.latestMonth)} ${latestSiope.year}`
                : String(latestSiope.year)}
            </dd>
            <small>{latestSiope.completeness === "partial" ? "Dati parziali" : "Anno completo"}</small>
          </div>
        </dl>

        <div className={styles.paymentHistory}>
          <h3>Storico disponibile</h3>
          <div className="table-scroll" role="region" aria-label="Storico dei pagamenti comunali" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Anno</th>
                  <th scope="col">Copertura</th>
                  <th scope="col">Totale</th>
                  <th scope="col">Per abitante</th>
                </tr>
              </thead>
              <tbody>
                {profile.siope.data.years.map((year) => (
                  <tr key={year.year}>
                    <th scope="row">{year.year}</th>
                    <td>{coverageText(year)}</td>
                    <td>{year.totalCents === null ? "Nessun movimento" : compactEuro(year.totalCents / 100)}</td>
                    <td>{year.perCapitaCents === null ? "Non disponibile" : exactEuro(year.perCapitaCents / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {latestSiope.hasMovements ? (
          <div className={styles.spendingBreakdown}>
            <h3>Le principali categorie di pagamento</h3>
            <div aria-label={`Principali pagamenti ${latestSiope.year} per categoria SIOPE`}>
              {spendingRows.map((title) => {
                const share = latestSiope.totalCents
                  ? Math.max(0, Math.min(100, title.amountCents / latestSiope.totalCents * 100))
                  : 0;
                return (
                  <div className={styles.spendingRow} key={title.key}>
                    <div>
                      <strong>{title.label}</strong>
                      <span>{percent(share)}</span>
                    </div>
                    <div className={styles.spendingTrack} aria-hidden="true">
                      <span style={{ "--share": `${share}%` } as CSSProperties} />
                    </div>
                    <b>{compactEuro(title.amountCents / 100)}</b>
                  </div>
                );
              })}
            </div>
            <details className={styles.methodDetails} data-siope-titles>
              <summary>Cosa significano i Titoli SIOPE?</summary>
              <p>I numeri sono codici contabili, non una graduatoria. Il Titolo 6 non appartiene alle uscite.</p>
              <dl>
                {latestSiope.titles
                  .slice()
                  .sort((left, right) => Number(left.code) - Number(right.code))
                  .map((title) => (
                    <div key={title.code}>
                      <dt>Titolo {title.code} · {title.label}</dt>
                      <dd>{titleExplanations[title.code]}</dd>
                    </div>
                  ))}
              </dl>
            </details>
          </div>
        ) : (
          <div className="notice warning-notice">
            SIOPE riconosce il Comune, ma non pubblica movimenti nel periodo selezionato. Non trasformiamo l’assenza in zero.
          </div>
        )}
        <p className={styles.sourceNote}>
          Fonte: <a href={profile.siope.sources[0].url} target="_blank" rel="noreferrer">SIOPE · Ragioneria Generale dello Stato e Banca d’Italia ↗</a>.
          I pagamenti del Comune non indicano necessariamente dove la spesa produce effetti fisici.
        </p>
      </section>

      <section className={`panel ${styles.economicSection}`} aria-labelledby="opencivitas-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionKicker}>OpenCivitas · fabbisogni e servizi</span>
            <h2 className={styles.sectionTitle} id="opencivitas-title">Spesa storica e standard</h2>
          </div>
          {openCivitas ? <span className="tag tag-neutral">{openCivitas.referenceYear}</span> : null}
        </div>
        {openCivitas ? (
          <>
            <dl className={styles.metricGrid}>
              <div><dt>Spesa storica</dt><dd>{compactEuro(openCivitas.record.historicalSpendingCents / 100)}</dd></div>
              <div><dt>Spesa standard</dt><dd>{compactEuro(openCivitas.record.standardSpendingCents / 100)}</dd></div>
              <div>
                <dt>Differenza</dt>
                <dd>{signedEuro(openCivitas.record.differenceCents)}</dd>
                <small>{signedEuro(openCivitas.record.differencePerCapitaCents)} per abitante</small>
              </div>
              <div>
                <dt>Servizi rispetto a Comuni simili</dt>
                <dd>{openCivitas.record.serviceDifferenceBasisPoints === null ? "Non valutabile" : percent(openCivitas.record.serviceDifferenceBasisPoints / 100)}</dd>
                <small>{openCivitas.record.serviceLevel === null ? "Livello non disponibile" : `Livello servizi ${openCivitas.record.serviceLevel}/10`}</small>
              </div>
            </dl>
            <p className={styles.sourceNote}>
              Fonte: <a href={openCivitas.source.datasetUrl} target="_blank" rel="noreferrer">OpenCivitas ↗</a>.
              La differenza dalla spesa standard non dimostra uno spreco: va letta con servizi, costi e caratteristiche locali.
            </p>
          </>
        ) : (
          <div className="notice warning-notice">{openCivitasUnavailable}</div>
        )}
      </section>

      <section className={`panel ${styles.economicSection}`} aria-labelledby="pnrr-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionKicker}>PNRR · asili e prima infanzia</span>
            <h2 className={styles.sectionTitle} id="pnrr-title">Progetti con il Comune soggetto attuatore</h2>
          </div>
          <span className="tag tag-neutral">Dati al {pnrr.referenceDate}</span>
        </div>
        <dl className={styles.metricGrid}>
          <div><dt>Progetti trovati</dt><dd>{integer(pnrr.totalProjects)}</dd></div>
          <div>
            <dt>Finanziamento totale noto</dt>
            <dd>{pnrr.projectsWithKnownFunding === 0 ? "Non disponibile" : compactEuro(pnrr.knownTotalFundingCents / 100)}</dd>
            <small>{integer(pnrr.projectsWithKnownFunding)} progetti con importo pubblicato</small>
          </div>
        </dl>
        {pnrr.projects.length > 0 ? (
          <details className={styles.methodDetails} data-pnrr-projects>
            <summary>Vedi i {integer(pnrr.projects.length)} progetti collegati</summary>
            <ul className={styles.projectList}>
              {pnrr.projects.map((project) => (
                <li key={project.cup}>
                  <Link href={`/progetti/${encodeURIComponent(project.cup)}`}>{project.title}</Link>
                  <span>
                    CUP {project.cup}
                    {project.progress ? ` · ${project.progress}` : ""}
                    {project.totalFundingCents === null ? "" : ` · ${compactEuro(project.totalFundingCents / 100)}`}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className={styles.emptyState}>
            Nessun progetto trovato in questo specifico verticale. Il risultato non riguarda l’intero PNRR.
          </p>
        )}
        <p className={styles.sourceNote}>
          Fonte: <a href={pnrr.source.landingUrl} target="_blank" rel="noreferrer">Italia Domani ↗</a>.
          Il finanziamento non è un pagamento osservato; questa sezione copre soltanto asili e prima infanzia.
        </p>
      </section>

      <details className={`panel ${styles.secondarySection}`} data-irpef-details>
        <summary>
          <span>
            <small>MEF · dichiarazioni fiscali</small>
            <strong>Redditi e imposte dei residenti</strong>
            <em>Contesto fiscale: non sono entrate o spese del Comune.</em>
          </span>
          {irpef ? <span className="tag tag-neutral">Anno d’imposta {irpef.period.taxYear}</span> : null}
        </summary>
        <div className={styles.secondaryContent}>
          {irpef ? (
            <>
              <dl className={styles.metricGrid}>
                <div><dt>Contribuenti</dt><dd>{integer(irpef.record.taxpayers)}</dd></div>
                <div>
                  <dt>Reddito complessivo</dt>
                  <dd>{compactEuro(amount(irpef.record.measures.comprehensiveIncome) / 100)}</dd>
                  {coverageLabel(irpef.record.measures.comprehensiveIncome) ? <small>{coverageLabel(irpef.record.measures.comprehensiveIncome)}</small> : null}
                </div>
                <div>
                  <dt>Imposta netta dichiarata</dt>
                  <dd>{compactEuro(amount(irpef.record.measures.netTaxDeclared) / 100)}</dd>
                  {coverageLabel(irpef.record.measures.netTaxDeclared) ? <small>{coverageLabel(irpef.record.measures.netTaxDeclared)}</small> : null}
                </div>
                <div>
                  <dt>Addizionale comunale dovuta</dt>
                  <dd>{compactEuro(amount(irpef.record.measures.municipalSurtaxDue) / 100)}</dd>
                  {coverageLabel(irpef.record.measures.municipalSurtaxDue) ? <small>{coverageLabel(irpef.record.measures.municipalSurtaxDue)}</small> : null}
                </div>
              </dl>
              <p className={styles.sourceNote}>
                Fonte: <a href={irpef.source.landingUrl} target="_blank" rel="noreferrer">Dipartimento delle Finanze ↗</a>.
                Sono dichiarazioni fiscali dei residenti e non una stima dell’evasione.
              </p>
            </>
          ) : <div className="notice warning-notice">{irpefUnavailable}</div>}
        </div>
      </details>
    </>
  );
}
