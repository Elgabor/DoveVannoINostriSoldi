import type { Metadata } from "next";
import Link from "next/link";
import { integer } from "@/lib/format";
import { INTEGRATED_DOMAIN_ORDER, integratedDomainLabel } from "@/lib/integrated-domains";
import { getIntegratedDataOverview } from "@/lib/integrated-public-view";
import styles from "./dati.module.css";

export const metadata: Metadata = {
  title: "Catalogo dei dati integrati",
  description: "Tutti i dataset integrati, con righe, stato di pubblicazione, limiti e fonti.",
};

function publicationLabel(publication: string): string {
  if (publication === "rows") return "Righe interrogabili";
  if (publication === "source-index") return "Indice interrogabile";
  if (publication === "catalog-only") return "Solo catalogo";
  return "Materiale derivato";
}

export default async function IntegratedDataPage() {
  const overview = await getIntegratedDataOverview();
  const grouped = new Map<string, typeof overview.datasets>();
  for (const domain of INTEGRATED_DOMAIN_ORDER) grouped.set(domain, []);
  for (const dataset of overview.datasets) {
    grouped.set(dataset.domain, [...(grouped.get(dataset.domain) ?? []), dataset]);
  }
  // Within a domain the largest set is the one most readers are looking for,
  // so the order is by size and the heading says so; nothing is hidden.
  const domains = [...grouped.entries()]
    .filter(([, datasets]) => datasets.length > 0)
    .map(([domain, datasets]) => ({
      domain,
      label: integratedDomainLabel(domain),
      datasets: [...datasets].sort(
        (left, right) => right.publicRows - left.publicRows || right.sourceRows - left.sourceRows,
      ),
      queryable: datasets.filter((dataset) => dataset.queryable).length,
    }));

  return (
    <main className={`shell page ${styles.page}`}>
      <div className="page-intro">
        <p className={styles.eyebrow}>Registro completo</p>
        <h1>Tutti i dataset integrati</h1>
        <p>
          Ogni dataset integrato compare qui. Lo stato distingue le righe interrogabili dai
          materiali contabilizzati solo nel catalogo o come derivati, senza riempire i dati mancanti
          e senza trasformare un segnale in un accertamento.
        </p>
      </div>

      <section className="stat-strip" aria-label="Copertura del catalogo integrato">
        <div>
          <span className="stat-label">Dataset</span>
          <span className="stat-value">{integer(overview.totals.datasets)}</span>
          <span className="stat-note">tutti presenti nel catalogo</span>
        </div>
        <div>
          <span className="stat-label">Righe sorgente</span>
          <span className="stat-value">{integer(overview.totals.sourceRows)}</span>
          <span className="stat-note">conteggiate senza sommare perimetri incompatibili</span>
        </div>
        <div>
          <span className="stat-label">Righe interrogabili</span>
          <span className="stat-value">{integer(overview.totals.publicRows)}</span>
          <span className="stat-note">valori pubblici preservati come stringhe esatte</span>
        </div>
        <div>
          <span className="stat-label">Solo catalogo o derivati</span>
          <span className="stat-value">
            {integer(overview.totals.catalogOnlyRows + overview.totals.derivedOnlyRows)}
          </span>
          <span className="stat-note">contati, mai convertiti in righe inventate</span>
        </div>
      </section>

      <div className="notice">
        <strong>Pubblicato non significa giudicato</strong>
        <p>
          Le schede riportano fatti documentati, dati mancanti e domande di verifica. Una differenza,
          una ripetizione o un documento non reperito non dimostrano da soli spreco o illecito. Le
          condizioni di riuso non dichiarate nel materiale restano indicate su ogni dataset.
        </p>
      </div>

      <nav className={styles.domainIndex} aria-labelledby="domain-index-title">
        <h2 id="domain-index-title">Vai a un ambito</h2>
        <ul>
          {domains.map((entry) => (
            <li key={entry.domain}>
              <a href={`#domain-${entry.domain}`}>
                {entry.label}
                <span>{integer(entry.datasets.length)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {domains.map((entry) => (
        <section
          className={styles.domainSection}
          key={entry.domain}
          aria-labelledby={`domain-${entry.domain}`}
        >
          <div className={styles.sectionHeading}>
            <h2 id={`domain-${entry.domain}`}>{entry.label}</h2>
            <span>
              {integer(entry.datasets.length)} dataset · {integer(entry.queryable)} con righe
              interrogabili · in ordine di righe
            </span>
          </div>
          <ul className={styles.datasetGrid}>
            {entry.datasets.map((dataset) => (
              <li className={styles.datasetCard} key={dataset.id}>
                <div className={styles.cardTopline}>
                  <span className={`tag ${dataset.queryable ? "tag-accent" : "tag-neutral"}`}>
                    {publicationLabel(dataset.publication)}
                  </span>
                </div>
                <h3>
                  <Link href={`/dati/${dataset.id}`}>{dataset.title}</Link>
                </h3>
                <p className={styles.cardCount}>
                  <strong>{integer(dataset.sourceRows)}</strong>
                  <span>righe sorgente</span>
                </p>
                <p>{dataset.publicationNote}</p>
                <dl className={styles.cardMetadata}>
                  <div>
                    <dt>Autorità</dt>
                    <dd>{dataset.authority}</dd>
                  </div>
                  <div>
                    <dt>Fonti puntuali</dt>
                    <dd>{integer(dataset.rowsWithPublicSource)} righe</dd>
                  </div>
                </dl>
                <Link className={styles.cardLink} href={`/dati/${dataset.id}`}>
                  {dataset.queryable ? "Apri le righe e i limiti →" : "Apri scheda e limiti →"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className={`panel ${styles.finalLinks}`}>
        <h2 className="panel-title">Verifica la copertura</h2>
        <p>
          Il catalogo si riconcilia con l’inventario completo del corpus e con il registro delle
          identità di fonte.
        </p>
        <div>
          <Link href="/fonti/copertura">Copertura elemento per elemento →</Link>
          <Link href="/fonti/catalogo">Catalogo delle fonti →</Link>
        </div>
      </section>
    </main>
  );
}
