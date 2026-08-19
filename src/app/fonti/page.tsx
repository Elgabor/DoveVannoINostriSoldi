import type { Metadata } from "next";
import { publicSources } from "@/lib/sources";

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
        <span className="eyebrow"><span /> REGISTRO DELLE FONTI</span>
        <h1>Prima la fonte.<br /><em>Poi il grafico.</em></h1>
        <p>
          Questa pagina è il contratto di Trasparenza Italia con chi consulta i dati:
          per ogni sorgente dichiariamo proprietario, copertura, formato, frequenza e stato
          dell&apos;integrazione.
        </p>
      </header>

      <section className="source-table-wrap">
        <div className="source-table-header">
          <span>Fonte</span><span>Copertura</span><span>Aggiornamento</span><span>Stato</span>
        </div>
        {publicSources.map((source) => (
          <article className="source-table-row" key={source.slug}>
            <div>
              <a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>
              <small>{source.owner} · {source.area}</small>
              <p>{source.note}</p>
            </div>
            <div><strong>{source.coverage}</strong><small>{source.format}</small></div>
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
