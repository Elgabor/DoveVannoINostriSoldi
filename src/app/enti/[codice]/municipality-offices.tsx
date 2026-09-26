import { longDate } from "@/lib/format";
import type { MunicipalOfficeMember, MunicipalOrgan } from "@/lib/data/municipal-offices-contract";
import type { MunicipalOfficesState } from "@/lib/municipal-offices";
import styles from "./scheda.module.css";

const organLabels: Record<MunicipalOrgan, string> = {
  giunta: "Giunta comunale",
  consiglio: "Consiglio comunale",
};

function MemberList({ members }: { members: readonly MunicipalOfficeMember[] }) {
  return (
    <ul className={styles.officeMembers}>
      {members.map((member) => (
        <li key={`${member.organ}:${member.personUrl}`}>
          <a href={member.personUrl} target="_blank" rel="noreferrer">{member.name}</a>
          <span>{member.role}</span>
          <small>
            Ingresso nell&apos;organo: {longDate(member.membershipStartDate)}. Fine del mandato non attestata nella fonte acquisita.
          </small>
        </li>
      ))}
    </ul>
  );
}

export function MunicipalityOffices({ state }: { state: MunicipalOfficesState }) {
  if (state.status === "out_of_scope") {
    return (
      <section className={`panel ${styles.economicSection}`} id="dati-amministratori" aria-labelledby="offices-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionKicker}>Organi e mandati</span>
            <h2 className={styles.sectionTitle} id="offices-title">Chi amministra il Comune</h2>
          </div>
        </div>
        <p>Questa sezione copre per ora solo Mantova. Per questo Comune non abbiamo ancora un elenco verificato di organi e membri.</p>
      </section>
    );
  }

  const { snapshot } = state;
  return (
    <section className={`panel ${styles.economicSection}`} id="dati-amministratori" aria-labelledby="offices-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionKicker}>Comune di Mantova · organi e mandati</span>
          <h2 className={styles.sectionTitle} id="offices-title">Chi amministra il Comune</h2>
        </div>
      </div>
      <p className={styles.readingGuide}>
        Persone riportate dalle pagine istituzionali e verificate il {longDate(snapshot.coverage.verifiedAt)}.
        Sono coperti Giunta e Consiglio alla data della verifica; lo storico non coperto non permette di dedurre
        precedenti incarichi o cessazioni. Una fine mandato non indicata resta sconosciuta.
      </p>
      <div className={styles.officeOrgans}>
        {snapshot.coverage.organs.map((organ) => {
          const members = snapshot.members.filter((member) => member.organ === organ);
          return (
            <details key={organ} open={organ === "giunta"}>
              <summary>{organLabels[organ]} <span>{members.length} persone</span></summary>
              <MemberList members={members} />
            </details>
          );
        })}
      </div>
      <div className={styles.officeSources}>
        <h3>Fonti e riuso</h3>
        <p>Comune di Mantova, contenuti CC BY 4.0. Acquisiti e verificati il {longDate(snapshot.coverage.verifiedAt)}.</p>
        <ul>
          {snapshot.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.id === "giunta" ? "Giunta comunale" : source.id === "nomina" ? "Nomina della Giunta" : source.id === "consiglio" ? "Consiglio comunale" : source.id === "licenza" ? "Note legali" : "Insediamento del Consiglio"}
              </a>
              {source.lastModifiedAt ? ` · aggiornata il ${longDate(source.lastModifiedAt)}` : ""}
              <small>SHA-256 {source.sha256}</small>
            </li>
          ))}
        </ul>
        <a href={snapshot.sources[0].licenseUrl} target="_blank" rel="noreferrer">Note legali del Comune</a>
      </div>
    </section>
  );
}
