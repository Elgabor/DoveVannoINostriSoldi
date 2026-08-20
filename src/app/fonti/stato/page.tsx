import type { Metadata } from "next";
import Link from "next/link";
import { getSourceHealthOverview, type SourceHealth } from "@/lib/data/source-health";
import styles from "./stato.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stato delle fonti",
  description:
    "Stato operativo, freschezza e policy di aggiornamento delle fonti ufficiali integrate in Trasparenza Italia.",
};

const numberFormatter = new Intl.NumberFormat("it-IT");
const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Rome",
});

function duration(seconds: number): string {
  if (seconds % 86_400 === 0) return `${seconds / 86_400} g`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600} h`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

function sourceAge(seconds: number | null): string {
  if (seconds === null) return "età non disponibile";
  if (seconds < 3_600) return `${Math.max(0, Math.floor(seconds / 60))} min fa`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} h fa`;
  return `${Math.floor(seconds / 86_400)} g fa`;
}

function sourceDate(value: string | null): string {
  if (!value) return "timestamp non disponibile";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function reachabilityLabel(source: SourceHealth): string {
  if (source.reachability === "up") return "Raggiungibile";
  if (source.reachability === "down") return "Non raggiungibile";
  return "Non ancora sondato";
}

function reachabilityClass(source: SourceHealth): string {
  if (source.reachability === "up") return styles.up;
  if (source.reachability === "down") return styles.down;
  return styles.notProbed;
}

function freshnessLabel(source: SourceHealth): string {
  if (source.freshness.state === "fresh") return "Dato fresco";
  if (source.freshness.state === "stale") return "Dato oltre soglia";
  return "Freschezza non classificata";
}

function freshnessClass(source: SourceHealth): string {
  if (source.freshness.state === "fresh") return styles.fresh;
  if (source.freshness.state === "stale") return styles.stale;
  return styles.unknown;
}

export default async function SourceStatusPage() {
  const sources = await getSourceHealthOverview();
  const active = sources.filter((source) => source.integration === "active");
  const reachable = sources.filter((source) => source.reachability === "up");
  const unreachable = sources.filter((source) => source.reachability === "down");

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Percorso">
        <Link href="/">Home</Link>
        <span>→</span>
        <Link href="/fonti">Fonti</Link>
        <span>→</span>
        <span>Stato</span>
      </nav>

      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>OSSERVABILITÀ DELLE SORGENTI</span>
          <h1 className={styles.title}>Quanto sono vivi i dati che stai guardando.</h1>
          <p className={styles.lead}>
            Separiamo lo stato del nostro adapter dalla disponibilità dell&apos;upstream e dalla
            freschezza del dato pubblicato. Una fonte raggiungibile non è necessariamente fresca;
            una fonte temporaneamente offline non rende falso l&apos;ultimo dato già acquisito.
          </p>
        </div>

        <div className={styles.summary} aria-label="Riepilogo stato fonti">
          <div>
            <strong>{sources.length}</strong>
            <span>fonti con policy</span>
          </div>
          <div>
            <strong>{active.length}</strong>
            <span>adapter attivi</span>
          </div>
          <div>
            <strong>{reachable.length}</strong>
            <span>upstream raggiungibili ora</span>
          </div>
          <div>
            <strong>{unreachable.length}</strong>
            <span>probe falliti</span>
          </div>
        </div>
      </header>

      <section className={styles.explainer}>
        <div>
          <h2>Controlliamo più spesso di quanto la fonte pubblichi.</h2>
          <p>
            Se IPA aggiorna ogni giorno, possiamo ricontrollarlo ogni ora. Se un dataset è mensile,
            ricontrollarlo più volte al giorno ci permette di rilevare rapidamente il nuovo rilascio,
            senza chiamare “tempo reale” un dato che resta mensile.
          </p>
        </div>
        <div>
          <h2>Reachability e freshness sono due misure diverse.</h2>
          <p>
            Il primo stato misura se l&apos;adapter riesce a interrogare la fonte. Il secondo usa,
            quando disponibile, un timestamp pubblicato dalla fonte e lo confronta con una soglia
            coerente con la sua cadenza. Se non abbiamo abbastanza informazioni, mostriamo “unknown”.
          </p>
        </div>
      </section>

      <section className={styles.table} aria-label="Stato delle fonti ufficiali">
        <div className={styles.tableHeader}>
          <span>Fonte</span>
          <span>Integrazione</span>
          <span>Stato upstream</span>
          <span>Freschezza</span>
        </div>

        {sources.map((source) => (
          <article className={styles.row} key={source.sourceId}>
            <div className={styles.source}>
              <strong>{source.label}</strong>
              <span>{source.owner}</span>
              <a href={source.policy.sourceUrl} target="_blank" rel="noreferrer">
                apri fonte ufficiale ↗
              </a>
            </div>

            <div className={styles.meta}>
              <strong>{source.integration === "active" ? "Adapter attivo" : "Mappata"}</strong>
              <span>Cadenza: {source.policy.cadence}</span>
              <span>Discovery: {duration(source.policy.discoveryRevalidateSeconds)}</span>
            </div>

            <div className={styles.health}>
              <span className={`${styles.status} ${reachabilityClass(source)}`}>
                {reachabilityLabel(source)}
              </span>
              <strong>
                {source.latencyMs !== null ? `${numberFormatter.format(source.latencyMs)} ms` : "—"}
              </strong>
              <span>{source.detail ?? "Nessun dettaglio disponibile"}</span>
              {source.recordCount !== null && (
                <span>{numberFormatter.format(source.recordCount)} elementi rilevati dal probe</span>
              )}
            </div>

            <div className={styles.policy}>
              <span className={`${styles.status} ${freshnessClass(source)}`}>
                {freshnessLabel(source)}
              </span>
              <strong>{sourceDate(source.freshness.sourceTimestamp)}</strong>
              <span>{sourceAge(source.freshness.ageSeconds)}</span>
              <span>dati ricontrollati ogni {duration(source.policy.dataRevalidateSeconds)}</span>
              <span>{source.policy.cadenceNote}</span>
            </div>
          </article>
        ))}
      </section>

      <p className={styles.footerNote}>
        “Non ancora sondato” non significa che il sito ufficiale sia offline. “Freschezza non classificata”
        non significa che il dato sia vecchio. In entrambi i casi significa che Trasparenza Italia non ha
        ancora evidenza sufficiente per attribuire automaticamente quello stato. Preferiamo un&apos;assenza di
        misura a un semaforo inventato.
      </p>
    </main>
  );
}
