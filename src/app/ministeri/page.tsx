import type { Metadata } from "next";
import Link from "next/link";
import { getStateAdministrationIdentity } from "@/lib/data/state-administration-identities";
import { compactEuro, exactEuro, longDate } from "@/lib/format";
import { rgsMinistriesMetadata, rgsMinistriesSnapshot } from "@/lib/rgs-ministries-snapshot";
import styles from "./ministeri.module.css";

export const metadata: Metadata = {
  title: "Spese dei Ministeri, rendiconto 2025",
  description:
    "Impegni, pagamenti e residui dei 15 Ministeri nel rendiconto ufficiale RGS 2025, tenuti separati e mostrati con valori esatti.",
};

const percentage = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const euro = (cents: number) => cents / 100;

export default function MinistriesPage() {
  const { ministries, totals, coverage, referenceYear } = rgsMinistriesSnapshot;
  const source = rgsMinistriesMetadata.source;

  return (
    <main className="shell page">
      <div className="page-intro">
        <h1>Spese dei Ministeri</h1>
        <p>
          Il rendiconto dello Stato 2025 copre 15 Ministeri. Mostriamo tre fasi contabili
          separate: impegni di competenza, pagamenti di cassa e residui a fine anno. Non
          includiamo Palazzo Chigi, Camera, Senato o Regioni.
        </p>
      </div>

      <dl className="stat-strip">
        <div>
          <dt>Impegni di competenza</dt>
          <dd>{compactEuro(euro(totals.commitmentsCpCents))}</dd>
          <span className="stat-note">{exactEuro(euro(totals.commitmentsCpCents))} · CP</span>
        </div>
        <div>
          <dt>Pagamenti di cassa</dt>
          <dd>{compactEuro(euro(totals.paymentsCashCsCents))}</dd>
          <span className="stat-note">{exactEuro(euro(totals.paymentsCashCsCents))} · CS</span>
        </div>
        <div>
          <dt>Residui al 31 dicembre</dt>
          <dd>{compactEuro(euro(totals.residualsEndCents))}</dd>
          <span className="stat-note">{exactEuro(euro(totals.residualsEndCents))} · CP + RS</span>
        </div>
      </dl>

      <div className="notice">
        <strong>Questi tre numeri non formano un totale</strong>
        <p>
          CP indica la competenza dell&apos;anno, RS i residui degli anni precedenti e CS la cassa.
          Un pagamento di cassa può riguardare sia la competenza 2025 sia residui precedenti.
          Per questo non sommiamo impegni, pagamenti e residui e non li usiamo come giudizio di efficienza.
        </p>
      </div>

      <section className="panel" aria-labelledby="elenco-ministeri">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="elenco-ministeri">Valori esatti per Ministero</h2>
            <p>
              La quota usa come denominatore gli impegni CP dei 15 Ministeri nello stesso
              rendiconto. Le altre colonne restano fasi distinte.
            </p>
          </div>
          <span>5.395 righe riconciliate</span>
        </div>
        <p className={styles.scrollHint}>Scorri la tabella verso destra per vedere tutti gli importi.</p>

        <div
          className={`table-scroll ${styles.ministryTable}`}
          role="region"
          aria-label="Valori esatti dei Ministeri nel rendiconto RGS 2025"
          tabIndex={0}
        >
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Ministero</th>
                <th scope="col">Impegni CP</th>
                <th scope="col">Quota impegni CP</th>
                <th scope="col">Pagamenti CS</th>
                <th scope="col">Residui al 31/12</th>
                <th scope="col">Dettaglio</th>
              </tr>
            </thead>
            <tbody>
              {ministries.map((ministry) => {
                const identity = getStateAdministrationIdentity(String(Number(ministry.code)), ministry.label);
                return (
                  <tr key={ministry.code}>
                    <th scope="row">
                      {ministry.label}
                      <small>Codice RGS {ministry.code} · IPA {identity?.ipaCode ?? "non collegato"}</small>
                    </th>
                    <td>{exactEuro(euro(ministry.commitmentsCpCents))}</td>
                    <td>{percentage.format(ministry.commitmentsCpCents / totals.commitmentsCpCents)}</td>
                    <td>{exactEuro(euro(ministry.paymentsCashCsCents))}</td>
                    <td>{exactEuro(euro(ministry.residualsEndCents))}</td>
                    <td>
                      <Link href={`/stato/amministrazioni/${ministry.code}?anno=${referenceYear}`}>
                        Pagamenti per missione →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Totale dei 15 Ministeri</th>
                <td>{exactEuro(euro(totals.commitmentsCpCents))}</td>
                <td>{percentage.format(1)}</td>
                <td>{exactEuro(euro(totals.paymentsCashCsCents))}</td>
                <td>{exactEuro(euro(totals.residualsEndCents))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="fonte-ministeri">
        <h2 className="panel-title" id="fonte-ministeri">Fonte, perimetro e controlli</h2>
        <div className={styles.provenance}>
          <div><span>Titolare</span><strong>{source.owner}</strong></div>
          <div><span>Rilascio aggiornato</span><strong>{longDate(source.updatedAt)}</strong></div>
          <div><span>Controllato da noi</span><strong>{longDate(source.acquiredAt)}</strong></div>
          <div>
            <span>Copertura</span>
            <strong>{coverage.ministries} Ministeri · {coverage.rowsReconciled.toLocaleString("it-IT")} righe su {coverage.sourceRows.toLocaleString("it-IT")}</strong>
          </div>
        </div>
        <p className={styles.sourceNote}>
          Abbiamo verificato le 41 colonne e le identità contabili riga per riga. Pagato CS
          coincide con pagato CP più pagato RS; gli impegni CP coincidono con pagato CP più
          rimasto CP. Fonte {source.sourceRecordId}, licenza {source.licenseName} dichiarata
          sulla scheda di questo rilascio.
        </p>
        <div className={styles.sourceLinks}>
          <a href={source.landingUrl} target="_blank" rel="noreferrer">Apri la scheda RGS ↗</a>
          <a href={source.resourceUrl} target="_blank" rel="noreferrer">Scarica il CSV ufficiale ↗</a>
          <Link href={`/stato?anno=${referenceYear}`}>Apri i pagamenti per missione →</Link>
        </div>
      </section>
    </main>
  );
}
