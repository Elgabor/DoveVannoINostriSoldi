import { SpendingHistoryChart } from "@/components/charts/spending-history-chart";
import {
  getStateSpendingHistory,
  type StateSpendingHistory,
} from "@/lib/bdap-history";
import styles from "./state-spending-history-section.module.css";

const observedAtFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Rome",
});

function compactEuro(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mld €`;
  }
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} mln €`;
  }
  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 0 })} €`;
}

async function loadHistory(): Promise<StateSpendingHistory | null> {
  try {
    return await getStateSpendingHistory();
  } catch {
    return null;
  }
}

function HistoryUnavailable() {
  return (
    <section className={styles.section}>
      <div className={styles.error}>
        <strong>Serie temporale momentaneamente non disponibile.</strong>
        <p>
          La dashboard principale resta valida. Lo storico richiede più rilasci OpenBDAP e viene omesso se uno degli snapshot necessari non è raggiungibile.
        </p>
      </div>
    </section>
  );
}

export function StateSpendingHistoryFallback() {
  return (
    <section className={styles.section} aria-busy="true">
      <div className={styles.header}>
        <div>
          <span>SERIE 2026</span>
          <h2>Caricamento degli snapshot mensili RGS…</h2>
        </div>
      </div>
      <div className={styles.loadingGrid} aria-hidden="true">
        <div />
        <div />
      </div>
    </section>
  );
}

export async function StateSpendingHistorySection() {
  const history = await loadHistory();
  if (!history || history.points.length === 0) return <HistoryUnavailable />;

  const latest = history.points.at(-1);
  const maxMonth = history.points.reduce((maximum, point) =>
    point.monthlyPaid > maximum.monthlyPaid ? point : maximum,
  );
  const averageMonthly = latest ? latest.cumulativePaid / history.points.length : 0;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <span>SERIE TEMPORALE · RGS / OPENBDAP</span>
          <h2>Dal cumulato al flusso mensile.</h2>
        </div>
        <p>
          RGS pubblica i pagamenti “a tutto” il mese indicato, quindi cumulati dal 1° gennaio.
          Il secondo grafico sottrae due snapshot consecutivi per isolare il pagamento attribuito al mese.
        </p>
      </div>

      <div className={styles.metrics}>
        <div>
          <span>Ultimo mese disponibile</span>
          <strong>{latest ? compactEuro(latest.monthlyPaid) : "—"}</strong>
          <small>{latest ? `${latest.monthName} ${latest.year}` : "dato non disponibile"}</small>
        </div>
        <div>
          <span>Media mensile YTD</span>
          <strong>{compactEuro(averageMonthly)}</strong>
          <small>cumulato diviso {history.points.length} mesi disponibili</small>
        </div>
        <div>
          <span>Mese con flusso maggiore</span>
          <strong>{compactEuro(maxMonth.monthlyPaid)}</strong>
          <small>{maxMonth.monthName}</small>
        </div>
      </div>

      <SpendingHistoryChart data={history.points} />

      <div className={styles.methodology}>
        <div>
          <span>Metodo</span>
          <strong>Δ cumulato mese t − cumulato mese t−1</strong>
        </div>
        <div>
          <span>Semantica ufficiale</span>
          <a href={history.methodology.officialSemanticsUrl} target="_blank" rel="noreferrer">
            RGS · pagamenti dal 1° gennaio al mese di riferimento ↗
          </a>
        </div>
        <div>
          <span>Acquisito</span>
          <strong>{observedAtFormatter.format(new Date(history.observedAt))}</strong>
        </div>
      </div>
    </section>
  );
}
