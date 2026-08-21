import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Come trattiamo i dati delle richieste di consulenza.",
};

export default function PrivacyPage() {
  return (
    <main className={`shell page ${styles.page}`}>
      <div className="page-intro">
        <h1>Informativa privacy</h1>
        <p>
          Questa pagina descrive il form di consulenza e i dati tecnici necessari a erogare
          il sito. Il sito legge fonti pubbliche e non chiede un account.
        </p>
      </div>

      <section className="panel">
        <h2 className="panel-title">Titolare</h2>
        <p>
          Domenico Gagliardi, contattabile all&apos;indirizzo{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">Quali dati e perché</h2>
        <p>
          Nome, email, organizzazione, sito web se indicato, tipo di ente, ruolo, oggetto
          della richiesta, budget del progetto e messaggio. Li usiamo solo per rispondere
          e, se ha senso, per un eventuale incarico. Base giuridica: consenso e, se
          avviamo una trattativa, misure precontrattuali. Ruolo e sito web sono facoltativi;
          senza gli altri dati non possiamo ricontattarti o inquadrare il progetto.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">Quanto restano e chi li vede</h2>
        <p>
          L&apos;applicazione non crea un database di contatti: la richiesta passa da Resend e
          arriva nella casella del progetto. La conserviamo fino a 24 mesi dalla ricezione,
          salvo cancellazione anticipata o obblighi collegati a un eventuale incarico. Resend
          agisce come fornitore del servizio email; i suoi metadati, log e record API sono
          conservati negli Stati Uniti anche quando l&apos;invio parte dalla regione europea. Il
          suo DPA include le clausole contrattuali standard per il trasferimento dei dati. Vedi
          le informazioni ufficiali su{" "}
          <a href="https://resend.com/docs/dashboard/domains/regions" target="_blank" rel="noreferrer">
            residenza dei dati
          </a>{" "}
          e{" "}
          <a href="https://resend.com/security/gdpr" target="_blank" rel="noreferrer">
            GDPR e DPA
          </a>. Non vendiamo i contatti e non facciamo profilazione pubblicitaria.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">Dati tecnici</h2>
        <p>
          Il provider di hosting può trattare log tecnici, come indirizzo IP, user agent,
          orario e percorso richiesto, per consegnare e proteggere il servizio. La home può
          ricavare dal provider una Regione approssimativa per proporre la mappa iniziale:
          l&apos;applicazione non mostra né salva l&apos;indirizzo IP e puoi cambiare Regione in ogni
          momento.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">I tuoi diritti</h2>
        <p>
          Puoi chiedere accesso, correzione, cancellazione, limitazione, portabilità quando
          applicabile o opposizione
          scrivendo alla stessa email. Puoi anche revocare il consenso e presentare
          reclamo al Garante per la protezione dei dati personali.
        </p>
      </section>
    </main>
  );
}
