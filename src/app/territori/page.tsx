import Link from "next/link";
import type { Metadata } from "next";
import { PeriodSelector } from "@/components/period-selector";
import { compactEuroLike, exactEuro, integer, longDate } from "@/lib/format";
import { municipalityName } from "@/lib/municipality-name";
import { availableSiopeYears, getSiopeMunicipalSnapshot } from "@/lib/siope-snapshot";
import styles from "./territori.module.css";

export const metadata: Metadata = {
  title: "Territori",
  description:
    "Quanto pagano i Comuni regione per regione: totali, euro per abitante e le amministrazioni con i volumi più alti.",
};

function selectedYear(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] ?? "" : value ?? "", 10);
  return availableSiopeYears.includes(parsed) ? parsed : availableSiopeYears[0];
}

export default async function TerritoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string | string[] }>;
}) {
  const year = selectedYear((await searchParams).anno);
  const data = getSiopeMunicipalSnapshot(year);
  const monthLabel = data.latestMonthLabel.toLocaleLowerCase("it-IT");

  const regions = [...data.regions].sort((left, right) => right.value - left.value);
  const topByVolume = data.topMunicipalities.slice(0, 20);
  const regionScale = regions[0]?.value ?? 0;
  const municipalityScale = topByVolume[0]?.value ?? 0;
  const topByPerCapita = [...data.topMunicipalities]
    .filter((municipality) => municipality.perCapita !== null)
    .sort((left, right) => (right.perCapita ?? 0) - (left.perCapita ?? 0))
    .slice(0, 10);

  return (
    <main className="shell page">
      <div className={styles.intro}>
        <div className="page-intro">
          <h1>Quanto paga il tuo territorio</h1>
          <p>
            Pagamenti dei Comuni con sede nella regione, da gennaio a {monthLabel} {data.year}. Media
            italiana:{" "}
            {data.nationalPerCapita === null
              ? "non disponibile"
              : `${exactEuro(data.nationalPerCapita)} per abitante`}
            .
          </p>
        </div>
        <PeriodSelector activeYear={year} years={availableSiopeYears} pathname="/territori" />
      </div>

      <div className={styles.split}>
        <section className="panel">
          <h2 className="panel-title">Tutte le {regions.length} regioni</h2>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Regione</th>
                  <th scope="col" className="num">Totale</th>
                  <th scope="col" className="num">Per abitante</th>
                  <th scope="col" className="num">Abitanti</th>
                  <th scope="col" className="num">Comuni</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr key={region.region}>
                    <th scope="row">{region.region}</th>
                    <td className="num">{compactEuroLike(region.value, regionScale)}</td>
                    <td className="num">
                      {region.perCapita === null ? "n.d." : exactEuro(region.perCapita)}
                    </td>
                    <td className="num">
                      {region.population === null ? "n.d." : integer(region.population)}
                    </td>
                    <td className="num">{integer(region.municipalities)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>Nota di metodo: {data.methodology.warning}</p>
        </section>

        <div className={styles.aside}>
          <section className="panel">
            <h2 className="panel-title">I {topByVolume.length} Comuni che pagano di più</h2>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Comune</th>
                    <th scope="col" className="num">Totale</th>
                    <th scope="col" className="num">Per abitante</th>
                  </tr>
                </thead>
                <tbody>
                  {topByVolume.map((municipality) => (
                    <tr key={municipality.codiceFiscale}>
                      <th scope="row">
                        {municipalityName(municipality.name)}
                        <small>
                          {municipality.population === null
                            ? "abitanti non disponibili"
                            : `${integer(municipality.population)} abitanti`}
                        </small>
                      </th>
                      <td className="num">
                        {compactEuroLike(municipality.value, municipalityScale)}
                      </td>
                      <td className="num">
                        {municipality.perCapita === null
                          ? "n.d."
                          : exactEuro(municipality.perCapita)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Top {topByPerCapita.length} per abitante</h2>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Comune</th>
                    <th scope="col">Regione</th>
                    <th scope="col" className="num">Per abitante</th>
                  </tr>
                </thead>
                <tbody>
                  {topByPerCapita.map((municipality) => (
                    <tr key={municipality.codiceFiscale}>
                      <th scope="row">{municipalityName(municipality.name)}</th>
                      <td>{municipality.region}</td>
                      <td className="num">
                        {municipality.perCapita === null
                          ? "n.d."
                          : exactEuro(municipality.perCapita)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>
              Valori alti spesso legati a turismo, ricostruzioni o servizi per non residenti.
            </p>
          </section>

          <div className="notice">
            <strong>Perché non è una classifica di merito</strong>
            <p>
              Un Comune turistico serve molte più persone dei suoi residenti, e un Comune che
              ricostruisce dopo un terremoto spende per opere che dureranno decenni. Il numero alto
              non è una colpa e quello basso non è un merito.
            </p>
          </div>
        </div>
      </div>

      <div className="notice">
        <strong>Confronta spesa e fabbisogno standard</strong>
        <p>
          Per i Comuni delle Regioni a statuto ordinario puoi confrontare la spesa storica con il
          fabbisogno calcolato da OpenCivitas. Il confronto include importo totale, valore per
          abitante, percentuale e livello dei servizi.{" "}
          <Link href="/territori/confronto">Apri il confronto tra Comuni →</Link>
        </p>
      </div>

      <section className="panel">
        <h2 className="panel-title">Quanto del registro stiamo leggendo</h2>
        <div className={styles.coverage}>
          <dl className={styles.coverageList}>
            <div>
              <dt>Comuni con movimenti</dt>
              <dd>{integer(data.coverage.withMovements)}</dd>
            </div>
            <div>
              <dt>Comuni attivi in SIOPE</dt>
              <dd>{integer(data.coverage.activeSiopeMunicipalities)}</dd>
            </div>
            <div>
              <dt>Non abbinati a una regione</dt>
              <dd>{integer(data.coverage.unmatchedToIpaRegion)}</dd>
            </div>
            <div>
              <dt>Righe malformate</dt>
              <dd>{integer(data.coverage.malformedRows)}</dd>
            </div>
          </dl>
          <p>
            Gli enti non abbinati restano fuori dai totali regionali: non assegniamo una regione
            senza una corrispondenza ufficiale. Fonte SIOPE · {data.source.siopeOwner}, scaricata il{" "}
            {longDate(data.source.observedAt)}.{" "}
            <Link href="/fonti/stato">Stato di tutte le fonti →</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
