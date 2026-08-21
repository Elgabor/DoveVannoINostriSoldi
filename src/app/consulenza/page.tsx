import type { Metadata } from "next";
import { CONSULTING_TOPICS } from "@/lib/leads";
import styles from "./consulenza.module.css";
import { LeadForm } from "./lead-form";

export const metadata: Metadata = {
  title: "Consulenza",
  description:
    "Progetti di intelligenza artificiale su dati pubblici per aziende e amministrazioni. Il sito resta gratuito e indipendente.",
};

const offers = [
  [
    "Lettura con AI",
    "Partiamo da un ente, un territorio o un progetto. I modelli leggono le fonti ufficiali e ricostruiscono che cosa dicono i numeri, che cosa manca e che cosa si può confrontare. Ogni cifra resta agganciata alla fonte.",
  ],
  [
    "Report o cruscotto interno",
    "Costruiamo una vista per un ufficio, un consiglio o un team: si chiede in italiano e si ottiene una risposta sui dati pubblici, con fonte, data, perimetro e limiti di ogni cifra.",
  ],
  [
    "Formazione",
    "Addestriamo chi deve usare l'intelligenza artificiale sui dati pubblici senza inventare numeri: gare, controllo di gestione, comunicazione, uffici che lavorano con la PA.",
  ],
  [
    "Strumento AI per l'impresa o per la PA",
    "Progettiamo e mettiamo in opera un assistente o un flusso interno sul lavoro vero: cercare bandi, seguire affidamenti e pagamenti, interrogare anagrafi e progetti. Serve a chi vende alla pubblica amministrazione e a chi la pubblica amministrazione la gestisce.",
  ],
] as const;

export default function ConsultingPage() {
  return (
    <main className="shell page">
      <div className="page-intro">
        <h1>Intelligenza artificiale su dati pubblici</h1>
        <p>
          Il sito resta gratuito. Qui si parla di incarichi: progetti di intelligenza
          artificiale per un&apos;azienda o un&apos;amministrazione, costruiti sulle stesse fonti
          pubbliche del sito.
        </p>
      </div>

      <div className="notice">
        <strong>Due cose distinte</strong>
        <p>
          I dati pubblici restano pubblici. Un incarico di consulenza non compra accesso
          privilegiato, non cambia i numeri sul sito e non è un parere legale, contabile o
          un accertamento. Per le amministrazioni questa è una richiesta di contatto: un
          eventuale incarico segue le regole di affidamento previste.
        </p>
      </div>

      <div className={styles.layout}>
        <section className={styles.offers} aria-labelledby="offers-title">
          <h2 id="offers-title" className="panel-title">
            Che cosa costruiamo
          </h2>
          {offers.map(([title, text]) => (
            <article className="panel" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
          <p className={styles.topicsHint}>
            Nel form trovi le stesse voci: {Object.values(CONSULTING_TOPICS).join("; ")}.
          </p>
        </section>

        <section className="panel" aria-labelledby="form-title">
          <h2 id="form-title" className="panel-title">
            Richiedi un contatto
          </h2>
          <p className={styles.formIntro}>
            Indica il tipo di progetto e che lavoro dovrebbe fare l&apos;intelligenza
            artificiale. Rispondiamo di solito entro due giorni lavorativi, sullo stesso
            indirizzo che indichi nel form.
          </p>
          <LeadForm />
        </section>
      </div>
    </main>
  );
}
