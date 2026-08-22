import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIpaEntityByCode,
  IPA_ENTI_DATASET_URL,
  IPA_ENTI_RESOURCE_ID,
  IPA_LICENSE,
} from "@/lib/ipa";
import {
  getIpaOrganizationStructure,
  IPA_AOO_DATASET_URL,
  IPA_UO_DATASET_URL,
  type IpaOrganizationStructure,
} from "@/lib/ipa-structure";
import styles from "./scheda.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ codice: string }>;
};

function show(value: string | null): string {
  return value ?? "Non indicato";
}

function responsibleLabel(
  titolo: string | null,
  nome: string | null,
  cognome: string | null,
): string {
  const identity = [nome, cognome].filter(Boolean).join(" ");
  return [titolo, identity].filter(Boolean).join(", ") || "Non indicato da IPA";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { codice } = await params;

  try {
    const entity = await getIpaEntityByCode(decodeURIComponent(codice));
    if (!entity) return { title: "Ente non trovato" };

    return {
      title: entity.denominazione,
      description: `Scheda pubblica dell'ente ${entity.denominazione}, Codice IPA ${entity.codiceIpa}.`,
    };
  } catch {
    return { title: "Ente" };
  }
}

export default async function EntityPage({ params }: PageProps) {
  const { codice } = await params;
  const normalizedCode = decodeURIComponent(codice);

  let entity;
  let structure: IpaOrganizationStructure | null = null;
  try {
    const [entityResult, structureResult] = await Promise.allSettled([
      getIpaEntityByCode(normalizedCode),
      getIpaOrganizationStructure(normalizedCode),
    ]);
    if (entityResult.status === "rejected") throw entityResult.reason;
    entity = entityResult.value;
    if (structureResult.status === "fulfilled") structure = structureResult.value;
  } catch {
    throw new Error("Impossibile interrogare la fonte IPA in questo momento.");
  }

  if (!entity) notFound();

  const responsible = responsibleLabel(
    entity.responsabile.titolo,
    entity.responsabile.nome,
    entity.responsabile.cognome,
  );

  return (
    <main className="shell page">
      <nav className={styles.breadcrumb} aria-label="Percorso">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/enti">Enti e società</Link>
        <span aria-hidden="true">/</span>
        <span>{entity.codiceIpa}</span>
      </nav>

      <div className={styles.head}>
        <div className="page-intro">
          <h1>{entity.denominazione}</h1>
          <p>
            Codice IPA <strong>{entity.codiceIpa}</strong>
            {entity.acronimo ? `, ${entity.acronimo}` : ""}
            {entity.dataAggiornamento ? `, aggiornato ${entity.dataAggiornamento}` : ""}
          </p>
          <div className={styles.badges}>
            {entity.tipologia && <span className="tag tag-neutral">{entity.tipologia}</span>}
            {entity.inLiquidazione && (
              <span className="tag tag-accent">ente in liquidazione</span>
            )}
          </div>
        </div>

        {entity.sitoIstituzionale && (
          <a
            className="btn btn-secondary"
            href={entity.sitoIstituzionale}
            target="_blank"
            rel="noreferrer"
          >
            Sito istituzionale ↗
          </a>
        )}
      </div>

      <div className={styles.split}>
        <div className={styles.main}>
          <section className="panel">
            <h2 className="panel-title">Identità amministrativa</h2>
            <dl className={styles.definitions}>
              <div>
                <dt>Codice IPA</dt>
                <dd>{entity.codiceIpa}</dd>
              </div>
              <div>
                <dt>Codice fiscale</dt>
                <dd>{show(entity.codiceFiscale)}</dd>
              </div>
              <div>
                <dt>Tipologia</dt>
                <dd>{show(entity.tipologia)}</dd>
              </div>
              <div>
                <dt>Codice ISTAT ente</dt>
                <dd>{show(entity.codiceIstat)}</dd>
              </div>
              <div>
                <dt>Categoria</dt>
                <dd>{show(entity.codiceCategoria)}</dd>
              </div>
              <div>
                <dt>Natura giuridica</dt>
                <dd>{show(entity.codiceNatura)}</dd>
              </div>
              <div>
                <dt>Codice ATECO</dt>
                <dd>{show(entity.codiceAteco)}</dd>
              </div>
              <div>
                <dt>Responsabile</dt>
                <dd>{responsible}</dd>
              </div>
            </dl>
          </section>

          <section className="panel" id="struttura-ipa">
            <h2 className="panel-title">Struttura dichiarata in IPA · UO e AOO</h2>

            {structure ? (
              <>
                <dl className={styles.structureSummary}>
                  <div>
                    <dt>Unità organizzative</dt>
                    <dd>{structure.unitaOrganizzative.total}</dd>
                  </div>
                  <div>
                    <dt>Aree di protocollo</dt>
                    <dd>{structure.areeOrganizzativeOmogenee.total}</dd>
                  </div>
                  <div>
                    <dt>Cadenza dichiarata</dt>
                    <dd>giornaliera</dd>
                  </div>
                </dl>

                {structure.unitaOrganizzative.records.length > 0 ? (
                  <div className="table-scroll" role="region" aria-label="Unità organizzative dell’ente" tabIndex={0}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th scope="col">Unità organizzativa</th>
                          <th scope="col">Codice UO</th>
                          <th scope="col">AOO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {structure.unitaOrganizzative.records.slice(0, 24).map((unit) => (
                          <tr key={unit.codice}>
                            <th scope="row">
                              {unit.denominazione}
                              <small>
                                {unit.codicePadre
                                  ? `dipende dalla UO ${unit.codicePadre}`
                                  : "livello padre non indicato"}
                              </small>
                            </th>
                            <td>
                              <code>{unit.codice}</code>
                            </td>
                            <td>{unit.codiceAoo ? <code>{unit.codiceAoo}</code> : "non indicata"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.note}>
                    IPA non pubblica Unità Organizzative per questo ente.
                  </p>
                )}

                {structure.unitaOrganizzative.total > 24 && (
                  <p className={styles.note}>
                    Mostriamo le prime 24 unità in ordine alfabetico. L&apos;API espone pagine fino a
                    500 record tramite <code>limit</code> e <code>offset</code>.
                  </p>
                )}

                <div className={styles.actions}>
                  <a className="btn btn-secondary" href={IPA_UO_DATASET_URL} target="_blank" rel="noreferrer">
                    Dataset UO ↗
                  </a>
                  <a className="btn btn-secondary" href={IPA_AOO_DATASET_URL} target="_blank" rel="noreferrer">
                    Dataset AOO ↗
                  </a>
                  <Link
                    className="btn btn-secondary"
                    href={`/api/enti/${encodeURIComponent(entity.codiceIpa)}/struttura`}
                  >
                    API struttura →
                  </Link>
                </div>
              </>
            ) : (
              <div className="notice warning-notice">
                <strong>La struttura IPA non risponde in questo momento</strong>
                <p>
                  La scheda anagrafica resta valida; non sostituiamo UO e AOO con una gerarchia
                  inferita dai nomi.
                </p>
              </div>
            )}

            <p className={styles.note}>
              IPA descrive unità organizzative, uffici e relazioni dichiarate dall&apos;ente. Per
              direzioni generali e strutture giuridiche fanno fede anche regolamenti e pagine di
              Amministrazione trasparente.
            </p>
          </section>

          <section className="panel">
            <h2 className="panel-title">Sede e contatti pubblicati</h2>
            <dl className={styles.definitions}>
              <div>
                <dt>Indirizzo</dt>
                <dd>{show(entity.sede.indirizzo)}</dd>
              </div>
              <div>
                <dt>CAP</dt>
                <dd>{show(entity.sede.cap)}</dd>
              </div>
              <div>
                <dt>Comune ISTAT</dt>
                <dd>{show(entity.sede.codiceComuneIstat)}</dd>
              </div>
              {entity.email.map((mail) => (
                <div key={`${mail.indirizzo}-${mail.tipo ?? "mail"}`}>
                  <dt>{mail.tipo ?? "email"}</dt>
                  <dd>
                    <a href={`mailto:${mail.indirizzo}`}>{mail.indirizzo}</a>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel">
            <h2 className="panel-title">Dati economici · collegamenti in corso</h2>
            <dl className={styles.definitions}>
              <div>
                <dt>Pagamenti e serie storiche</dt>
                <dd>SIOPE / OpenBDAP</dd>
              </div>
              <div>
                <dt>Contratti e fornitori</dt>
                <dd>ANAC / BDNCP</dd>
              </div>
              <div>
                <dt>Progetti, opere e PNRR</dt>
                <dd>CUP / ReGiS / OpenCoesione</dd>
              </div>
              <div>
                <dt>Consulenze e incarichi</dt>
                <dd>Funzione Pubblica</dd>
              </div>
            </dl>
            <p className={styles.note}>
              Mostreremo un grafico economico solo quando riusciremo a collegare questo ente a una
              fonte ufficiale. Non usiamo valori stimati o abbinamenti basati solo sul nome.
            </p>
          </section>
        </div>

        <aside className={styles.side}>
          <section className="panel">
            <h2 className="panel-title">Da dove arrivano i dati</h2>
            <dl className={styles.sideList}>
              <div>
                <dt>Fonte</dt>
                <dd>
                  <a href={IPA_ENTI_DATASET_URL} target="_blank" rel="noreferrer">
                    Indice PA · Enti ↗
                  </a>
                </dd>
              </div>
              <div>
                <dt>Titolare</dt>
                <dd>Agenzia per l&apos;Italia Digitale</dd>
              </div>
              <div>
                <dt>Identificativo del file</dt>
                <dd>
                  <code>{IPA_ENTI_RESOURCE_ID}</code>
                </dd>
              </div>
              <div>
                <dt>Licenza</dt>
                <dd>{IPA_LICENSE}</dd>
              </div>
              <div>
                <dt>Frequenza</dt>
                <dd>giornaliera</dd>
              </div>
              <div>
                <dt>Data del dato</dt>
                <dd>{show(entity.dataAggiornamento)}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <h2 className="panel-title">Usa questi dati · formato JSON</h2>
            <dl className={styles.sideList}>
              <div>
                <dt>Indirizzo per altre applicazioni</dt>
                <dd>
                  <Link href={`/api/enti/${encodeURIComponent(entity.codiceIpa)}`}>
                    /api/enti/{entity.codiceIpa} →
                  </Link>
                </dd>
              </div>
            </dl>
            <p className={styles.note}>
              Il servizio rende i campi più facili da usare, ma non cambia ciò che IPA ha
              pubblicato.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
