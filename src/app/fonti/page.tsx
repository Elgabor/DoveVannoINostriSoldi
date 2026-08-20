import type { Metadata } from "next";
import Link from "next/link";
import { shortDate } from "@/lib/format";
import { mefParticipationsSnapshot } from "@/lib/mef-participations-snapshot";
import { openCoesioneSnapshot } from "@/lib/opencoesione-snapshot";
import { siopeMunicipalSnapshot } from "@/lib/siope-snapshot";
import { publicSources, sourceCounts } from "@/lib/sources";
import styles from "./fonti.module.css";

export const metadata: Metadata = {
  title: "Fonti",
  description: "Da dove arrivano i dati, quanto spesso cambiano e quali fonti sono già collegate.",
};

const statusLabel = {
  attiva: "Attiva",
  integrazione: "In arrivo",
  mappata: "Individuata",
};

/* Only the sources with a working adapter can report a real "last data" date;
   the others show an em dash rather than a guess. */
const latestDataBySlug: Record<string, string | null> = {
  siope: siopeMunicipalSnapshot.source.siopeMovementsLastModified,
  ipa: siopeMunicipalSnapshot.source.ipaLastModified,
  opencoesione: openCoesioneSnapshot.referenceDate,
  "partecipazioni-pubbliche": mefParticipationsSnapshot.publishedAt,
};

export default function SourcesPage() {
  return (
    <main className="shell page">
      <div className="page-intro">
        <h1>Da dove arrivano i dati</h1>
        <p>
          Ogni numero su questo sito viene da una fonte pubblica ufficiale. Qui trovi quali sono,
          cosa contengono e quando le controlliamo.
        </p>
      </div>

      <div className="stat-strip">
        <div>
          <span className="stat-label">Fonti nel registro</span>
          <span className="stat-value">{sourceCounts.total}</span>
        </div>
        <div>
          <span className="stat-label">Già collegate</span>
          <span className="stat-value">{sourceCounts.active}</span>
        </div>
        <div>
          <span className="stat-label">In lavorazione</span>
          <span className="stat-value">{sourceCounts.integrating}</span>
        </div>
        <div>
          <span className="stat-label">Da collegare</span>
          <span className="stat-value">{sourceCounts.mapped}</span>
        </div>
      </div>

      <section className="panel">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Fonte</th>
                <th scope="col">Cosa contiene</th>
                <th scope="col">Chi la pubblica</th>
                <th scope="col">Ogni quanto esce</th>
                <th scope="col">Ultimo dato</th>
                <th scope="col">Stato</th>
              </tr>
            </thead>
            <tbody>
              {publicSources.map((source) => {
                const latest = latestDataBySlug[source.slug];
                return (
                  <tr id={source.slug} key={source.slug}>
                    <th scope="row">
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.name} ↗
                      </a>
                      <small>{source.area}</small>
                    </th>
                    <td>{source.coverage}</td>
                    <td>{source.owner}</td>
                    <td>{source.cadence}</td>
                    <td className={styles.latest}>{latest ? shortDate(latest) : "non ancora collegata"}</td>
                    <td>
                      <span className={`status status-${source.status}`}>
                        {statusLabel[source.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.principles}>
        <section className="panel">
          <h2 className="panel-title">Come lavoriamo</h2>
          <p>
            Scarichiamo i file ufficiali, li ricontiamo e mostriamo sempre la data della fonte e la
            data in cui l&apos;abbiamo controllata. Non cambiamo mai il significato di un dato e non
            inventiamo numeri che la fonte non pubblica.
          </p>
        </section>
        <section className="panel">
          <h2 className="panel-title">Se un dato manca</h2>
          <p>
            Lo scriviamo. Se una fonte è in ritardo o non copre un anno, lo trovi scritto accanto al
            numero, invece di uno spazio vuoto o una stima nascosta.
          </p>
        </section>
        <section className="panel">
          <h2 className="panel-title">Licenze e riuso</h2>
          <p>
            I dati sono pubblicati dalle fonti con licenza CC BY 4.0 o equivalente: liberi da
            riusare citando la fonte. Il codice di questa piattaforma è open source su{" "}
            <a
              href="https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">Collegamenti diretti alle fonti</h2>
        <ul className={styles.linkList}>
          <li>
            <a href={siopeMunicipalSnapshot.source.siopeMovementsUrl} target="_blank" rel="noreferrer">
              SIOPE · movimenti uscite {siopeMunicipalSnapshot.year} <i aria-hidden="true">↗</i>
            </a>
          </li>
          <li>
            <a href={siopeMunicipalSnapshot.source.siopeRegistryUrl} target="_blank" rel="noreferrer">
              SIOPE · anagrafiche enti <i aria-hidden="true">↗</i>
            </a>
          </li>
          <li>
            <a href={siopeMunicipalSnapshot.source.ipaUrl} target="_blank" rel="noreferrer">
              IPA · elenco amministrazioni <i aria-hidden="true">↗</i>
            </a>
          </li>
          <li>
            <a href={openCoesioneSnapshot.source.endpoint} target="_blank" rel="noreferrer">
              OpenCoesione · aggregati nazionali <i aria-hidden="true">↗</i>
            </a>
          </li>
          <li>
            <a href={mefParticipationsSnapshot.source.landingUrl} target="_blank" rel="noreferrer">
              MEF · open data partecipazioni {mefParticipationsSnapshot.referenceYear}{" "}
              <i aria-hidden="true">↗</i>
            </a>
          </li>
        </ul>
      </section>

      <div className="notice">
        <strong>“Aggiornato” significa: aggiornato quanto la fonte</strong>
        <p>
          Se una fonte pubblica nuovi dati una volta al mese, non li chiamiamo dati in tempo reale.
          Mostriamo l&apos;ultimo periodo disponibile, quando lo abbiamo controllato e quando è
          atteso il prossimo aggiornamento.{" "}
          <Link href="/fonti/stato">Stato operativo delle fonti →</Link> ·{" "}
          <Link href="/metodologia">Come leggiamo i dati →</Link>
        </p>
      </div>
    </main>
  );
}
