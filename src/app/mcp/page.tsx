import type { Metadata } from "next";
import { McpEndpoint } from "@/components/mcp-endpoint";
import { datasetCatalog } from "@/lib/mcp/catalog";
import styles from "./mcp.module.css";

export const metadata: Metadata = {
  title: "MCP per i dati pubblici",
  description: "Collega un assistente AI ai dataset verificati di DoveVannoINostriSoldi.",
};

export default function McpPage() {
  return (
    <main className="shell page">
      <header className="page-intro">
        <span className="eyebrow">Dati per assistenti AI</span>
        <h1>Interroga il portale con MCP</h1>
        <p>
          Il server MCP pubblico espone gli stessi dati e le stesse cautele del sito. È in sola
          lettura: non modifica fonti, record o configurazioni e non richiede credenziali.
        </p>
      </header>

      <section className={`panel ${styles.endpointPanel}`} aria-labelledby="endpoint-title">
        <span className={styles.index}>01</span>
        <h2 id="endpoint-title">Endpoint Streamable HTTP</h2>
        <McpEndpoint />
        <p>
          Aggiungi questo indirizzo come server MCP remoto nel client compatibile. Il catalogo è
          disponibile anche come risorsa <code>dvns://datasets</code>.
        </p>
      </section>

      <section className={styles.columns} aria-label="Come funziona">
        <article className="panel">
          <span className={styles.index}>02</span>
          <h2>Strumenti</h2>
          <dl className={styles.toolList}>
            <div><dt><code>list_datasets</code></dt><dd>Scopre fonti, filtri e limiti.</dd></div>
            <div><dt><code>query_dataset</code></dt><dd>Interroga snapshot locali o fonti ufficiali live.</dd></div>
          </dl>
        </article>
        <article className="panel">
          <span className={styles.index}>03</span>
          <h2>Uso responsabile</h2>
          <p>
            Pagamenti, costi, scostamenti e segnali non diventano automaticamente completamento,
            qualità, spreco o responsabilità. Ogni risposta conserva provenienza e metodologia.
          </p>
        </article>
      </section>

      <section className="panel" aria-labelledby="datasets-title">
        <span className={styles.index}>04</span>
        <h2 id="datasets-title">{datasetCatalog.length} dataset interrogabili</h2>
        <div className="table-scroll" role="region" aria-label="Catalogo dei dataset MCP" tabIndex={0}>
          <table className={styles.datasetTable}>
            <thead><tr><th>Dataset</th><th>Aggiornamento</th><th>Filtri</th></tr></thead>
            <tbody>
              {datasetCatalog.map((dataset) => (
                <tr key={dataset.id}>
                  <td><strong>{dataset.title}</strong><small>{dataset.summary}</small></td>
                  <td>{dataset.freshness === "live" ? "Fonte live" : "Snapshot verificato"}</td>
                  <td>{dataset.filters.length > 0 ? dataset.filters.join(", ") : "nessuno"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
