import { SpendingBarChart } from "@/components/charts/spending-bar-chart";
import { exactEuro, integer } from "@/lib/format";
import type { DatasetInsights } from "@/lib/integrated-dataset-insight-core";
import styles from "./dataset-insight-panel.module.css";

export function DatasetInsightPanel({
  insights,
  title = "Principali destinatari per importo",
}: {
  insights: DatasetInsights;
  title?: string;
}) {
  if (!insights.capable || insights.topRecipients.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="dataset-insight-title">
      <div className={styles.intro}>
        <h2 id="dataset-insight-title">{title}</h2>
        {insights.headline ? <p className={styles.headline}>{insights.headline}</p> : null}
        <p className={styles.note}>{insights.coverageNote} Lettura di screening, non un giudizio automatico.</p>
      </div>

      <div className={styles.chartBlock}>
        <SpendingBarChart
          data={[...insights.chartPoints]}
          ariaLabel={`Importi per destinatario in ${insights.datasetId}`}
          maxItems={8}
          height={Math.min(420, 64 + insights.chartPoints.length * 42)}
        />
      </div>

      {insights.multiService.length > 0 ? (
        <div className={styles.recurrence}>
          <h3>Soggetti presenti su più servizi</h3>
          <ul>
            {insights.multiService.map((entry) => (
              <li key={entry.name}>
                <strong>{entry.name}</strong>
                <span>
                  {exactEuro(entry.totalEuro)} · {integer(entry.services.length)} servizi ·{" "}
                  {integer(entry.awards)} atti
                </span>
                <small>{entry.services.slice(0, 4).join(" · ")}{entry.services.length > 4 ? "…" : ""}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
