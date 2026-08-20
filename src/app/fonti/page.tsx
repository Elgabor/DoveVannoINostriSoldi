import type { Metadata } from "next";
import Link from "next/link";
import { publicSources, sourceCounts } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Fonti",
  description: "Registro delle fonti ufficiali mappate da Trasparenza Italia.",
};

const statusLabel = {
  attiva: "Connettore attivo",
  integrazione: "In integrazione",
  mappata: "Mappata",
};

export default function SourcesPage() {
  return (
    <main className="subpage">
      <header className="page-intro">
        <h1>Registro delle fonti</h1>
        <p>
          Questa pagina è il contratto di Trasparenza Italia con chi consulta i dati:
          per ogni sorgente dichiariamo proprietario, copertura, formato, frequenza e stato
          dell&apos;integrazione.
        </p>
        <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
          <Link href="/fonti/stato" className="button button-primary">
            Stato live delle fonti
          </Link>
          <Link href="/metodologia" className="button button-secondary">
            Metodologia
          </Link>
        </div>
        <dl className="source-counts" aria-label="Copertura del registro">
          <div><dt>Totale</dt><dd>{sourceCounts.total}</dd></div>
          <div><dt>Connettori attivi</dt><dd>{sourceCounts.active}</dd></div>
          <div><dt>In integrazione</dt><dd>{sourceCounts.integrating}</dd></div>
          <div><dt>Censite</dt><dd>{sourceCounts.mapped}</dd></div>
        </dl>
      </header>

      <section className="source-table-wrap">
        <div className="source-table-header">
          <span>Fonte</span><span>Copertura</span><span>Aggiornamento</span><span>Stato</span>
        </div>
        {publicSources.map((source) => (
          <article className="source-table-row" id={source.slug} key={source.slug}>
            <div>
              <a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>
              <small>{source.owner} · {source.area}</small>
              <p>{source.note}</p>
            </div>
            <div>
              <strong>{source.coverage}</strong><small>{source.format}</small>
              {source.joinKeys && <small>Chiavi: {source.joinKeys.join(" · ")}</small>}
            </div>
            <div><strong>{source.cadence}</strong></div>
            <div><span className={`status status-${source.status}`}>{statusLabel[source.status]}</span></div>
          </article>
        ))}
      </section>

      <section className="notice">
        <strong>“Live” significa aggiornato alla fonte.</strong>
        <p>
          Se una fonte ufficiale pubblica dati mensilmente, la dashboard non li presenterà
          come dati del minuto. Mostrerà invece l&apos;ultima osservazione disponibile, quando è
          stata acquisita e quando ci si aspetta il prossimo aggiornamento.
        </p>
      </section>
    </main>
  );
}
