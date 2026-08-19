import Link from "next/link";
import { RegistryTypeChart } from "@/components/charts/registry-type-chart";
import {
  getIpaRegistryStats,
  IPA_ENTI_DATASET_URL,
  IPA_ENTI_RESOURCE_ID,
  IPA_LICENSE,
  searchIpaEntities,
  type IpaSearchResult,
} from "@/lib/ipa";
import { getIpaTypeDistribution, type IpaTypeStat } from "@/lib/ipa-stats";
import styles from "./enti.module.css";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("it-IT");

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function locationLabel(indirizzo: string | null, cap: string | null): string {
  if (indirizzo && cap) return `${indirizzo} · ${cap}`;
  return indirizzo ?? cap ?? "Sede non indicata nel record IPA";
}

function formatObservedAt(value: string | null): string {
  if (!value) return "Non disponibile";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponibile";

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

export default async function EntiPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = first(params.q).trim().slice(0, 180);
  const canSearch = query.length >= 2;

  let stats: Awaited<ReturnType<typeof getIpaRegistryStats>> | null = null;
  let distribution: IpaTypeStat[] = [];
  let distributionObservedAt: string | null = null;
  let result: IpaSearchResult | null = null;
  let upstreamError = false;

  const [statsResult, distributionResult] = await Promise.allSettled([
    getIpaRegistryStats(),
    getIpaTypeDistribution(8),
  ]);

  if (statsResult.status === "fulfilled") {
    stats = statsResult.value;
  }

  if (distributionResult.status === "fulfilled") {
    distribution = distributionResult.value.records;
    distributionObservedAt = distributionResult.value.observedAt;
  }

  if (statsResult.status === "rejected" && distributionResult.status === "rejected") {
    upstreamError = true;
  }

  if (canSearch) {
    try {
      result = await searchIpaEntities({ query, limit: 30 });
      upstreamError = false;
    } catch {
      upstreamError = true;
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <div>
          <span className={styles.kicker}>REGISTRO NAZIONALE · FONTE AGID</span>
          <h1 className={styles.title}>
            Ogni ente pubblico, <em>in un solo punto.</em>
          </h1>
          <p className={styles.lead}>
            L&apos;Indice PA è la chiave anagrafica di Trasparenza Italia. Ogni amministrazione viene
            identificata con il proprio Codice IPA e potrà essere collegata a pagamenti, appalti,
            progetti, consulenze e documenti mantenendo sempre la provenienza ufficiale.
          </p>
        </div>

        <aside className={styles.sourceCard} aria-label="Informazioni sulla fonte IPA">
          <div className={styles.sourceCardTop}>
            <strong>Indice PA · Enti</strong>
            <span className={styles.live}>FONTE ATTIVA</span>
          </div>
          <div className={styles.sourceMeta}>
            <div>
              <b>Frequenza</b>
              <span>giornaliera</span>
            </div>
            <div>
              <b>Licenza</b>
              <span>{IPA_LICENSE}</span>
            </div>
            <div>
              <b>Accesso</b>
              <span>CKAN Data API + SQL</span>
            </div>
            <div>
              <b>Resource ID</b>
              <span>{IPA_ENTI_RESOURCE_ID}</span>
            </div>
          </div>
          <a className={styles.sourceLink} href={IPA_ENTI_DATASET_URL} target="_blank" rel="noreferrer">
            Verifica sul dataset AgID <span>↗</span>
          </a>
        </aside>
      </section>

      <section className={styles.searchSection} aria-labelledby="ricerca-enti">
        <span className={styles.kicker}>CERCA NEL DATASTORE UFFICIALE</span>
        <form className={styles.searchForm} action="/enti" method="get">
          <label className={styles.visuallyHidden} htmlFor="q">Cerca un ente</label>
          <input
            className={styles.input}
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Comune di Milano, Ministero dell'Interno, Regione Calabria, codice IPA…"
            autoComplete="off"
          />
          <button className={styles.searchButton} type="submit">Cerca ente</button>
        </form>
        <p className={styles.searchHelp} id="ricerca-enti">
          Ricerca full-text direttamente sul datastore IPA. I risultati non sono una copia dimostrativa:
          vengono letti dalla Data API AgID e normalizzati dal server.
        </p>
      </section>

      <section className={styles.registrySnapshot} aria-labelledby="snapshot-registro">
        <div className={styles.snapshotSummary}>
          <span className={styles.kicker}>SNAPSHOT DEL REGISTRO</span>
          <div className={styles.snapshotNumber}>
            <strong>{stats ? numberFormatter.format(stats.total) : "—"}</strong>
            <span>record presenti nel dataset Enti</span>
          </div>
          <p>
            È il perimetro anagrafico da cui partiremo per collegare le fonti economiche. Il numero
            descrive i record IPA, non il numero di sole amministrazioni centrali né la spesa pubblica.
          </p>
          <dl className={styles.snapshotMeta}>
            <div>
              <dt>Interrogazione</dt>
              <dd>{formatObservedAt(stats?.observedAt ?? distributionObservedAt)}</dd>
            </div>
            <div>
              <dt>Dati economici simulati</dt>
              <dd>nessuno</dd>
            </div>
          </dl>
        </div>

        <div className={styles.chartPanel}>
          <div className={styles.chartHeading}>
            <div>
              <span className={styles.kicker}>COMPOSIZIONE</span>
              <h2 id="snapshot-registro">Tipologie più presenti</h2>
            </div>
            <span className={styles.chartSource}>query SQL · IPA</span>
          </div>
          <RegistryTypeChart data={distribution} />
        </div>
      </section>

      {!query && (
        <div className={styles.empty}>
          <strong>Cerca un ente per aprire la sua scheda unica.</strong>
          <p>
            La scheda contiene già identità, sede, contatti e provenienza IPA. I prossimi ingestori
            aggiungeranno pagamenti SIOPE, contratti ANAC, CUP, PNRR, OpenCoesione e consulenze.
          </p>
        </div>
      )}

      {query && !canSearch && (
        <div className={styles.empty}>
          <strong>Scrivi almeno due caratteri.</strong>
          <p>La ricerca parte dopo due caratteri per evitare interrogazioni troppo ampie sul datastore pubblico.</p>
        </div>
      )}

      {upstreamError && canSearch && !result && (
        <div className={styles.error}>
          <strong>La fonte IPA non risponde in questo momento.</strong>
          <p>
            Non sostituiamo il dato ufficiale con valori di fallback. Riprova più tardi oppure apri direttamente il dataset AgID.
          </p>
        </div>
      )}

      {result && (
        <>
          <div className={styles.resultsHeader}>
            <div>
              <span className={styles.kicker}>RISULTATI</span>
              <h2>{numberFormatter.format(result.total)} corrispondenze per “{query}”</h2>
            </div>
            <p>
              Fino a 30 risultati per richiesta. Ogni scheda conserva il Codice IPA e il collegamento alla fonte.
            </p>
          </div>

          {result.records.length > 0 ? (
            <div className={styles.entityList}>
              {result.records.map((entity) => (
                <Link
                  className={styles.entityCard}
                  href={`/enti/${encodeURIComponent(entity.codiceIpa)}`}
                  key={entity.codiceIpa}
                >
                  <div className={styles.entityName}>
                    <strong>{entity.denominazione}</strong>
                    <span>IPA · {entity.codiceIpa}</span>
                    <div className={styles.badges}>
                      {entity.acronimo && <i className={styles.badge}>{entity.acronimo}</i>}
                      {entity.inLiquidazione && (
                        <i className={`${styles.badge} ${styles.badgeWarning}`}>in liquidazione</i>
                      )}
                    </div>
                  </div>
                  <div className={styles.entityColumn}>
                    <b>Tipologia</b>
                    <span>{entity.tipologia ?? "Non indicata"}</span>
                  </div>
                  <div className={styles.entityColumn}>
                    <b>Sede</b>
                    <span>{locationLabel(entity.sede.indirizzo, entity.sede.cap)}</span>
                  </div>
                  <span className={styles.entityArrow} aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>Nessun ente trovato.</strong>
              <p>La query non ha prodotto corrispondenze nel dataset IPA corrente.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
