import type { Metadata } from "next";
import Link from "next/link";
import {
  auditClassifications,
  auditReviewedAt,
  auditScenarioAssumptions,
  auditScenarioBasis,
  auditScenarios,
  auditSignals,
  availableAuditYears,
  centralScenarioBreakdown,
  getAuditSignalsForYear,
  getProcurementAvailability,
  getProcurementComparisonForYear,
  procurementComparisons,
  procurementServicesAndSupplies2025,
  type AuditSignal,
} from "@/lib/audit-data";
import { computeSpendingOutliers } from "@/lib/anomaly-indicators";
import { integer, exactEuro, longDate, percent } from "@/lib/format";
import { municipalityName } from "@/lib/municipality-name";
import { openCivitasSnapshot } from "@/lib/opencivitas-snapshot";
import styles from "./controlli.module.css";

const OUTLIER_TABLE_SIZE = 15;

function signedEuroFromCents(cents: number): string {
  const value = exactEuro(Math.abs(cents) / 100);
  if (cents > 0) return `+${value}`;
  if (cents < 0) return `−${value}`;
  return value;
}

export const metadata: Metadata = {
  title: "Cosa controllare",
  description:
    "Numeri e aree della spesa pubblica che meritano verifiche più approfondite, senza trasformare segnali in accuse.",
};

type PageProps = {
  searchParams: Promise<{ anno?: string | string[] }>;
};

const number = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 1,
  useGrouping: "always",
});

const scenarioTotalNumber = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const scenarioComponentNumber = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

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
  let formatted: string;
  if (signal.unit === "percent") formatted = percent(signal.value);
  else if (signal.unit === "billion-euro") formatted = `${number.format(signal.value)} mld €`;
  else if (signal.unit === "million-euro") formatted = `${number.format(signal.value)} mln €`;
  else formatted = integer(signal.value);

  if (signal.valueQualifier === "over") return `oltre ${formatted}`;
  if (signal.valueQualifier === "about") return `circa ${formatted}`;
  return formatted;
}

function formatScenarioComponent(valueBillion: number): string {
  if (valueBillion >= 1) {
    return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 3 }).format(valueBillion)} mld €`;
  }
  return `${scenarioComponentNumber.format(valueBillion * 1_000)} mln €`;
}

function requestedYear(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string" || !/^20\d{2}$/.test(raw)) return null;
  const year = Number.parseInt(raw, 10);
  return availableAuditYears.includes(year) ? year : null;
}

export default async function ControlsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedYear = requestedYear(params.anno);
  const signals = selectedYear ? getAuditSignalsForYear(selectedYear) : auditSignals;
  const comparison = selectedYear
    ? getProcurementComparisonForYear(selectedYear)
    : procurementComparisons[2025];
  const procurementAvailability = selectedYear
    ? getProcurementAvailability(selectedYear)
    : null;
  const procurementRows = Object.values(procurementComparisons).sort(
    (left, right) => right.year - left.year,
  );
  const maxScenario = Math.max(...auditScenarios.map((scenario) => scenario.annualBillion));
  const centralTotal = centralScenarioBreakdown.reduce((sum, item) => sum + item.value, 0);
  const maxBreakdown = Math.max(...centralScenarioBreakdown.map((item) => item.value));
  const comparisonValue = comparison
    ? (comparison.totalValueBillion * comparison.byValue) / 100
    : null;
  const classificationEntries = Object.entries(auditClassifications);
  const spendingOutliers = computeSpendingOutliers(openCivitasSnapshot.municipalities);
  const topSpendingOutliers = spendingOutliers.outliers.slice(0, OUTLIER_TABLE_SIZE);

  return (
    <main className="shell page">
      <div className="page-intro">
        <h1>Cosa vale la pena controllare</h1>
        <p>
          Numeri presi da relazioni ufficiali, rivisti il {longDate(`${auditReviewedAt}T00:00:00Z`)}.
          Ogni numero dice una cosa precisa e mostra anche i suoi limiti.
        </p>
      </div>

      <nav className={styles.yearFilter} aria-label="Filtra i controlli per anno">
        <span>Periodo</span>
        <div>
          <Link href="/controlli" aria-current={selectedYear === null ? "page" : undefined}>
            Tutti
          </Link>
          {availableAuditYears.map((year) => (
            <Link
              href={`/controlli?anno=${year}`}
              key={year}
              aria-current={selectedYear === year ? "page" : undefined}
            >
              {year}
            </Link>
          ))}
        </div>
      </nav>

      <div className="notice">
        <strong>Come leggere questi dati</strong>
        <p>
          Pagamenti, debiti, costi e ipotesi misurano cose diverse e non vanno sommati. Un segnale
          indica cosa approfondire, non dimostra una colpa. Consulta le <Link href="/fonti">fonti
          ufficiali</Link> e il <Link href="/metodologia">metodo usato per leggere i dati</Link>.
        </p>
      </div>

      <div className="notice">
        <strong>Dove l&apos;automazione aiuta davvero</strong>
        <p>
          Il portale può confrontare casi omogenei, trovare dati mancanti e ordinare le verifiche.
          Non conduce indagini e non sostituisce Guardia di finanza, ANAC, Corte dei conti o il
          controllo umano. Gli aggregati CIG 2025 verificati sono disponibili nel{" "}
          <Link href="/mcp">dataset MCP ANAC</Link>; il{" "}
          <a
            href="https://dati.anticorruzione.it/opendata/dataset"
            target="_blank"
            rel="noreferrer"
            aria-label="Apri il catalogo open data ANAC in una nuova scheda"
          >
            catalogo ufficiale ANAC ↗
          </a>{" "}
          resta la fonte primaria.
        </p>
      </div>

      <details className={`panel ${styles.readingGuide}`}>
        <summary>Come distinguere questi numeri</summary>
        <p>
          Le parole qui sotto non sono intercambiabili. Servono a capire quanto è forte il dato e
          che cosa possiamo concludere.
        </p>
        <dl>
          {classificationEntries.map(([id, classification]) => (
            <div key={id}>
              <dt>{classification.label}</dt>
              <dd>{classification.plainMeaning}</dd>
            </div>
          ))}
        </dl>
      </details>

      <div className={styles.signals}>
        {signals.map((signal) => (
          <article className="panel" key={signal.id} data-tone={signal.tone}>
            <h2 className="panel-title">
              {signal.area} · {referencePeriod(signal.referenceDate)}
            </h2>
            <span className={styles.signalKind}>
              {auditClassifications[signal.classification].label}
            </span>
            <strong className={styles.signalValue}>{formatSignal(signal)}</strong>
            <h3>{signal.label}</h3>
            <p>{signal.plainMeaning}</p>
            <details className={styles.signalDetails}>
              <summary>Perimetro e stato del dato</summary>
              <dl>
                <div>
                  <dt>Comprende</dt>
                  <dd>{signal.coverage}</dd>
                </div>
                <div>
                  <dt>Stato</dt>
                  <dd>{signal.evidenceStatus}</dd>
                </div>
              </dl>
            </details>
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
        <h2 className="panel-title">Appalti pubblici · confronto annuale omogeneo</h2>
        {comparison && comparisonValue !== null ? (
          <div className={styles.comparison}>
            <div>
              <span>
                <strong>{percent(comparison.byNumber)}</strong> delle procedure
              </span>
              <div className={styles.track} aria-hidden="true">
                <i style={{ width: `${comparison.byNumber}%` }} />
              </div>
              <p>{comparison.subject}, procedure da 40.000 euro in su, anno {comparison.year}.</p>
            </div>
            <div>
              <span>
                <strong>{percent(comparison.byValue)}</strong> del valore
              </span>
              <div className={styles.track} aria-hidden="true">
                <i style={{ width: `${comparison.byValue}%` }} />
              </div>
              <p>
                Circa {number.format(comparisonValue)} miliardi su {number.format(comparison.totalValueBillion)}.
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.unavailable}>
            <strong>Dati annuali ANAC non disponibili per questo periodo.</strong>
            <p>{procurementAvailability?.message}</p>
          </div>
        )}

        <div
          className={`table-scroll ${styles.procurementTable}`}
          role="region"
          aria-label="Serie annuale degli affidamenti diretti ANAC"
          tabIndex={0}
        >
          <table className="table">
            <caption>Affidamenti diretti nelle relazioni annuali ANAC, stesso perimetro</caption>
            <thead>
              <tr>
                <th scope="col">Anno</th>
                <th scope="col">Procedure</th>
                <th scope="col" className="num">Quota sul numero</th>
                <th scope="col" className="num">Quota sul valore</th>
                <th scope="col">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {procurementRows.map((row) => (
                <tr key={row.year}>
                  <th scope="row">{row.year}</th>
                  <td>{integer(row.procedureCount)}</td>
                  <td className="num">{percent(row.byNumber)}</td>
                  <td className="num">{percent(row.byValue)}</td>
                  <td>
                    <a href={row.sourceUrl} target="_blank" rel="noreferrer">
                      Pubblicata il {longDate(row.sourcePublishedAt)} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.note}>
          Una quota alta sul numero delle procedure non equivale alla stessa quota sul valore. Il
          dato indica dove approfondire concorrenza e motivazioni, non dimostra uno spreco.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          Comuni fuori dal range della loro Regione · spesa storica vs fabbisogno standard
        </h2>
        <p>
          Partiamo dal confronto ufficiale OpenCivitas tra spesa storica e fabbisogno standard per
          abitante, già corretto per popolazione e caratteristiche del territorio, e segnaliamo i
          Comuni che restano fuori dall&apos;intervallo tipico della propria Regione (metodo
          statistico Tukey, 1,5 volte lo scarto interquartile).
        </p>

        <div className="stat-strip">
          <div>
            <span className="stat-label">Comuni valutati</span>
            <span className="stat-value">{integer(spendingOutliers.evaluatedMunicipalities)}</span>
            <span className="stat-note">
              {spendingOutliers.excludedForDataQuality > 0
                ? `${integer(spendingOutliers.excludedForDataQuality)} esclusi: dato segnalato dalla fonte`
                : "Nessuna esclusione per qualità del dato"}
            </span>
          </div>
          <div>
            <span className="stat-label">Fuori dal range</span>
            <span className="stat-value">{integer(spendingOutliers.outliers.length)}</span>
            <span className="stat-note">su {integer(spendingOutliers.evaluatedMunicipalities)} valutati</span>
          </div>
        </div>

        {topSpendingOutliers.length > 0 ? (
          <div
            className="table-scroll"
            role="region"
            aria-label="Comuni con la differenza per abitante più estrema rispetto alla propria Regione; scorri orizzontalmente per vedere tutte le colonne"
            tabIndex={0}
          >
            <table className="table">
              <caption>
                I {topSpendingOutliers.length} Comuni più fuori scala rispetto ai Comuni della
                stessa Regione, OpenCivitas {openCivitasSnapshot.referenceYear}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Comune</th>
                  <th scope="col" className="num">Differenza per abitante</th>
                  <th scope="col">Direzione</th>
                  <th scope="col" className="num">Distanza dal range</th>
                </tr>
              </thead>
              <tbody>
                {topSpendingOutliers.map((outlier) => (
                  <tr key={outlier.istatCode}>
                    <th scope="row">
                      {municipalityName(outlier.name)}
                      <small>
                        {municipalityName(outlier.province)} · {municipalityName(outlier.region)}
                      </small>
                    </th>
                    <td className="num">{signedEuroFromCents(outlier.differencePerCapitaCents)}</td>
                    <td>
                      {outlier.direction === "sopra" ? "spesa oltre il range" : "spesa sotto il range"}
                    </td>
                    <td className="num">×{outlier.excessMultiple.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.note}>Nessun Comune risulta fuori dal range con i dati attuali.</p>
        )}

        <div className="notice">
          <strong>Un fuori scala non è una condanna</strong>
          <p>{spendingOutliers.methodologyWarning}</p>
        </div>

        <p className={styles.note}>
          Guarda il Comune nel dettaglio storico e servizi nel{" "}
          <Link href="/territori/confronto">confronto spesa e fabbisogno standard →</Link>. Dato{" "}
          {openCivitasSnapshot.referenceYear}, {openCivitasSnapshot.coverage.territorialScope}.
        </p>
      </section>

      {(selectedYear === null || selectedYear === 2025) && (
        <section className="panel">
          <h2 className="panel-title">Appalti 2025: 55,3% e quasi 95% usano calcoli diversi</h2>
          <div className="stat-strip">
            <div>
              <span className="stat-label">Tutte le procedure da 40.000 euro in su</span>
              <span className="stat-value">{percent(procurementComparisons[2025].byNumber)}</span>
              <span className="stat-note">sono affidamenti diretti</span>
            </div>
            <div>
              <span className="stat-label">Studio ANAC su servizi e forniture</span>
              <span className="stat-value">
                {procurementServicesAndSupplies2025.directAwardShareQualifier}{" "}
                {percent(procurementServicesAndSupplies2025.directAwardShare)}
              </span>
              <span className="stat-note">dato ufficiale sugli affidamenti diretti</span>
            </div>
            <div>
              <span className="stat-label">Tra 135.000 e 140.000 euro nel 2025</span>
              <span className="stat-value">
                {integer(procurementServicesAndSupplies2025.thresholdBandCount2025)}
              </span>
              <span className="stat-note">acquisizioni indicate da ANAC</span>
            </div>
            <div>
              <span className="stat-label">Stessa fascia nel 2021</span>
              <span className="stat-value">
                {integer(procurementServicesAndSupplies2025.thresholdBandCount2021)}
              </span>
              <span className="stat-note">acquisizioni indicate da ANAC</span>
            </div>
          </div>
          <p className={styles.note}>
            Il {percent(procurementComparisons[2025].byNumber)} considera tutte le procedure da
            40.000 euro in su. Il quasi {percent(procurementServicesAndSupplies2025.directAwardShare)}
            viene da uno studio diverso di ANAC su servizi e forniture. Non è il 95% di tutti gli
            appalti. La concentrazione vicino alla soglia indica casi da approfondire, ma non prova
            da sola un&apos;irregolarità.{" "}
            <a href={procurementServicesAndSupplies2025.sourceUrl} target="_blank" rel="noreferrer">
              Leggi la fonte ANAC ↗
            </a>
          </p>
          <details className={styles.signalDetails}>
            <summary>Come abbiamo controllato il quasi 95%</summary>
            <dl>
              <div>
                <dt>Che cosa scrive ANAC</dt>
                <dd>
                  Quasi il 95% nel gruppo specifico di contratti usato nel suo studio su servizi e
                  forniture.
                </dd>
              </div>
              <div>
                <dt>Che cosa otteniamo dai file aperti</dt>
                <dd>
                  {percent(procurementServicesAndSupplies2025.replicatedDirectAwardShare)} usando i
                  dodici file mensili 2025 disponibili il{" "}
                  {longDate(procurementServicesAndSupplies2025.replicationObservedAt)}. La differenza
                  può dipendere da rettifiche successive o da ulteriori dettagli del perimetro.
                </dd>
              </div>
              <div>
                <dt>Come lo presentiamo</dt>
                <dd>
                  Manteniamo il dato ufficiale e mostriamo separatamente il nostro controllo. Non
                  correggiamo i dati per farli coincidere.{" "}
                  <a
                    href={procurementServicesAndSupplies2025.replicationUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Vedi metodo e risultati ↗
                  </a>
                </dd>
              </div>
            </dl>
          </details>
        </section>
      )}

      {selectedYear === null && (
        <>
          <section className="panel">
            <h2 className="panel-title">Tre ipotesi di miglioramento annuale</h2>
            <div className={styles.scenarios}>
              {auditScenarios.map((scenario) => (
                <div key={scenario.id}>
                  <strong>{scenarioTotalNumber.format(scenario.annualBillion)} mld €</strong>
                  <span>Ipotesi {scenario.label.toLocaleLowerCase("it-IT")}</span>
                  <div className={styles.track} aria-hidden="true">
                    <i style={{ width: `${(scenario.annualBillion / maxScenario) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className={styles.note}>
              Sono scenari di politica pubblica, non dati osservati in un singolo anno.
            </p>
            <details className={styles.scenarioMethod}>
              <summary>Vedi formula e ipotesi</summary>
              <div
                className="table-scroll"
                role="region"
                aria-label="Ipotesi percentuali dei tre scenari"
                tabIndex={0}
              >
                <table className="table">
                  <caption>Percentuali applicate alle quattro basi del modello</caption>
                  <thead>
                    <tr>
                      <th scope="col">Scenario</th>
                      <th scope="col">Appalti</th>
                      <th scope="col">Agevolazioni fiscali</th>
                      <th scope="col">Personale sanitario esterno</th>
                      <th scope="col">Acquisti senza impegno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(auditScenarioAssumptions).map(([id, assumptions]) => (
                      <tr key={id}>
                        <th scope="row">{assumptions.label}</th>
                        <td>
                          {percent(assumptions.procurementAuditedShare * 100)} analizzato,
                          {" "}{percent(assumptions.procurementEfficiencyRate * 100)} di miglioramento
                        </td>
                        <td>{percent(assumptions.taxReviewRate * 100)}</td>
                        <td>{percent(assumptions.healthcareReductionRate * 100)}</td>
                        <td>{percent(assumptions.debtPreventionRate * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section className="panel">
            <h2 className="panel-title">
              Composizione dell&apos;ipotesi centrale · {scenarioTotalNumber.format(centralTotal)} mld €
            </h2>
            <ul className={styles.breakdown}>
              {centralScenarioBreakdown.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <i aria-hidden="true">
                    <b style={{ width: `${(item.value / maxBreakdown) * 100}%` }} />
                  </i>
                  <b>{formatScenarioComponent(item.value)}</b>
                </li>
              ))}
            </ul>
            <p className={styles.note}>
              Sono stime costruite su ipotesi dichiarate, non soldi già disponibili e non previsioni.
              Le basi del modello sono quelle del dossier rivisto il {longDate(auditScenarioBasis.reviewedAt)}:
              {" "}{number.format(auditScenarioBasis.taxExpendituresBillion)} miliardi di agevolazioni fiscali,
              {" "}{number.format(auditScenarioBasis.reducedCompetitionBillion)} miliardi di appalti con confronto ridotto,
              {" "}{number.format(auditScenarioBasis.externalHealthcareStaffBillion * 1_000)} milioni di personale sanitario esterno
              e {number.format(auditScenarioBasis.purchasesWithoutPriorCommitmentBillion * 1_000)} milioni di acquisti senza impegno preventivo.
            </p>
          </section>
        </>
      )}

    </main>
  );
}
