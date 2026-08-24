import type { Metadata } from "next";
import Link from "next/link";
import { integer } from "@/lib/format";
import {
  formatRgsEuroCents,
  queryRgsConsulting,
  rgsConsultingAdministrations,
  RgsConsultingQueryError,
  rgsConsultingSnapshot,
} from "@/lib/rgs-consulting-snapshot";
import styles from "./consulenze.module.css";

type SearchValue = string | string[] | undefined;
type ConsultingPageProps = {
  searchParams: Promise<{
    anno?: SearchValue;
    amministrazione?: SearchValue;
    limit?: SearchValue;
    offset?: SearchValue;
  }>;
};

export const metadata: Metadata = {
  title: "Consulenze e lavoro parasubordinato nei Rendiconti RGS",
  description:
    "Capitoli e piani di gestione RGS 2024-2025 per consulenze, analisi, studi e lavoro parasubordinato, con importi Pagato CS e fonti ufficiali.",
};

function paginationHref(
  result: ReturnType<typeof queryRgsConsulting>,
  offset: number,
): string {
  const query = new URLSearchParams();
  if (result.query.year) query.set("anno", String(result.query.year));
  if (result.query.administration) query.set("amministrazione", result.query.administration);
  query.set("limit", String(result.pagination.limit));
  if (offset > 0) query.set("offset", String(offset));
  return `/spese/consulenze?${query.toString()}`;
}

function safeQuery(params: Awaited<ConsultingPageProps["searchParams"]>) {
  try {
    return {
      result: queryRgsConsulting({
        year: params.anno,
        administration: params.amministrazione,
        limit: params.limit,
        offset: params.offset,
      }),
      error: null,
    };
  } catch (error) {
    if (!(error instanceof RgsConsultingQueryError)) throw error;
    return { result: queryRgsConsulting(), error: error.message };
  }
}

export default async function RgsConsultingPage({ searchParams }: ConsultingPageProps) {
  const params = await searchParams;
  const { result, error } = safeQuery(params);
  const firstVisible = result.rows.length === 0 ? 0 : result.pagination.offset + 1;
  const lastVisible = result.pagination.offset + result.pagination.returned;
  const previousOffset = Math.max(0, result.pagination.offset - result.pagination.limit);
  const nextOffset = result.pagination.offset + result.pagination.limit;

  return (
    <main className={`shell page ${styles.page}`}>
      <header className="page-intro">
        <p className={styles.eyebrow}>Rendiconto dello Stato · 2024-2025</p>
        <h1>Consulenze e lavoro parasubordinato nei conti RGS</h1>
        <p>
          Tutte le 268 righe selezionate dai piani di gestione ufficiali: importi di cassa,
          amministrazione, capitolo e classificazione economica, senza trasformarli in incarichi
          individuali.
        </p>
      </header>

      <section className={`stat-strip ${styles.stats}`} aria-label="Copertura RGS consulenze">
        <div>
          <span className="stat-label">Pagato CS 2024-2025</span>
          <span className="stat-value">{formatRgsEuroCents(rgsConsultingSnapshot.coverage.paidCashCents)}</span>
          <span className="stat-note">somma delle sole 268 righe selezionate</span>
        </div>
        <div>
          <span className="stat-label">Piani di gestione</span>
          <span className="stat-value">{integer(rgsConsultingSnapshot.coverage.selectedRows)}</span>
          <span className="stat-note">su {integer(rgsConsultingSnapshot.coverage.sourceRows)} righe sorgente</span>
        </div>
        <div>
          <span className="stat-label">Zeri osservati</span>
          <span className="stat-value">{integer(rgsConsultingSnapshot.coverage.zeroPaidRows)}</span>
          <span className="stat-note">zero è distinto da dato assente</span>
        </div>
        <div>
          <span className="stat-label">Esercizi disponibili</span>
          <span className="stat-value">2024 · 2025</span>
          <span className="stat-note">il 2026 non è stimato</span>
        </div>
      </section>

      <section className="notice scope-notice" aria-labelledby="consulting-boundary-title">
        <h2 id="consulting-boundary-title">Che cosa misura, e che cosa non misura</h2>
        <p>
          Sono aggregati contabili per capitolo e piano di gestione. La fonte non identifica
          consulenti, beneficiari, contratti o singole prestazioni. Il confronto tra
          amministrazioni non prova efficienza, irregolarità o spreco.
        </p>
        <p>
          Pagato CS è verificato come Pagato CP più Pagato RS. Un importo pari a zero è un valore
          pubblicato nel Rendiconto, non un importo mancante ricostruito.
        </p>
      </section>

      <section className={`panel ${styles.filterPanel}`} aria-labelledby="consulting-filter-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 className="panel-title" id="consulting-filter-title">Filtra le righe contabili</h2>
            <p>La selezione usa solo anno e denominazione ufficiale dell’amministrazione.</p>
          </div>
          <span className="tag tag-neutral">
            {integer(result.pagination.total)} righe · {formatRgsEuroCents(result.totals.paidCashCents)}
          </span>
        </div>
        <form action="/spese/consulenze" method="get" className={styles.filterForm}>
          <label>
            <span>Anno</span>
            <select name="anno" defaultValue={result.query.year ?? ""}>
              <option value="">2024 e 2025</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </label>
          <label className={styles.administrationField}>
            <span>Amministrazione</span>
            <select name="amministrazione" defaultValue={result.query.administration ?? ""}>
              <option value="">Tutte le amministrazioni</option>
              {rgsConsultingAdministrations.map((administration) => (
                <option value={administration} key={administration}>{administration}</option>
              ))}
            </select>
          </label>
          <input type="hidden" name="limit" value={result.pagination.limit} />
          <button className="btn btn-primary" type="submit">Applica filtri</button>
        </form>
        {error ? <p className={styles.error} role="alert">{error} Sono mostrati i dati senza filtri.</p> : null}
      </section>

      <section className={`panel ${styles.tablePanel}`} aria-labelledby="consulting-rows-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 className="panel-title" id="consulting-rows-title">Capitoli e piani di gestione</h2>
            <p>
              {result.rows.length === 0
                ? "Nessuna riga nel perimetro selezionato."
                : `Righe ${integer(firstVisible)}-${integer(lastVisible)} di ${integer(result.pagination.total)}.`}
            </p>
          </div>
          <span className="tag tag-neutral">{integer(result.totals.zeroPaidRows)} zeri osservati nel filtro</span>
        </div>
        {result.rows.length > 0 ? (
          <div className={`table-scroll ${styles.dataTable}`} role="region" aria-label="Righe contabili RGS per consulenze e lavoro parasubordinato" tabIndex={0}>
            <table className="table">
              <caption>Pagato CS per esercizio, amministrazione, capitolo e piano di gestione</caption>
              <thead>
                <tr>
                  <th scope="col">Anno</th>
                  <th scope="col">Amministrazione</th>
                  <th scope="col">Classificazione CE3</th>
                  <th scope="col">Capitolo e piano di gestione</th>
                  <th scope="col" className="num">Pagato CS</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.year}</th>
                    <td>
                      {row.administration}
                      <small>{row.responsibilityCenter}</small>
                    </td>
                    <td>
                      {row.ce3Label}
                      <small>CE3 {row.ce3Code}</small>
                    </td>
                    <td>
                      <strong>Cap. {row.chapterNumber} · PG {row.managementPlanNumber}</strong>
                      <small>{row.managementPlan}</small>
                    </td>
                    <td className={`num ${styles.amount}`}>
                      {row.paidCashCents === 0 ? (
                        <span className={styles.observedZero}>0,00 € <small>zero osservato</small></span>
                      ) : (
                        <strong>{formatRgsEuroCents(row.paidCashCents)}</strong>
                      )}
                      <small>
                        CP {formatRgsEuroCents(row.paidCurrentCents)} · RS {formatRgsEuroCents(row.paidResidualCents)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {result.pagination.total > result.pagination.limit ? (
          <nav className={styles.pagination} aria-label="Pagine delle righe RGS consulenze">
            {result.pagination.offset > 0 ? (
              <Link href={paginationHref(result, previousOffset)}>← Pagina precedente</Link>
            ) : <span />}
            <span>Pagina {integer(Math.floor(result.pagination.offset / result.pagination.limit) + 1)}</span>
            {nextOffset < result.pagination.total ? (
              <Link href={paginationHref(result, nextOffset)}>Pagina successiva →</Link>
            ) : <span />}
          </nav>
        ) : null}
      </section>

      <section className={`panel ${styles.sourcePanel}`} aria-labelledby="consulting-sources-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 className="panel-title" id="consulting-sources-title">Fonti ufficiali e perimetro</h2>
            <p>Rendiconti pubblicati elaborabili RGS, dettaglio per piano di gestione.</p>
          </div>
          <a href={rgsConsultingSnapshot.source.catalogUrl} target="_blank" rel="noreferrer">Catalogo RGS ↗</a>
        </div>
        <div className={styles.sourceGrid}>
          {rgsConsultingSnapshot.source.resources.map((resource) => (
            <article key={resource.datasetId}>
              <h3>Rendiconto {resource.year}</h3>
              <p>{integer(rgsConsultingSnapshot.coverage.annual.find((annual) => annual.year === resource.year)?.selectedRows ?? 0)} righe selezionate</p>
              <a href={resource.landingUrl} target="_blank" rel="noreferrer">Scheda ufficiale ↗</a>
              <a href={resource.schemaUrl} target="_blank" rel="noreferrer">Schema RGS ↗</a>
              <code className={styles.hash}>SHA-256 sorgente: {resource.sourceSha256}</code>
            </article>
          ))}
        </div>
        <p className={styles.licenseNote}>
          Licenza osservata nelle schede: <a href={rgsConsultingSnapshot.source.licenseUrl} target="_blank" rel="noreferrer">CC BY 3.0 ↗</a>.
        </p>
      </section>

      <section className={`panel ${styles.caveatPanel}`} aria-labelledby="consulting-caveats-title">
        <h2 className="panel-title" id="consulting-caveats-title">Limiti dichiarati nello snapshot</h2>
        <ul>
          {rgsConsultingSnapshot.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
        </ul>
      </section>
    </main>
  );
}
