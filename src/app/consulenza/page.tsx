import type { Metadata } from "next";
import { CONSULTING_TOPICS } from "@/lib/consulting-contract";
import styles from "./consulenza.module.css";
import { LeadForm } from "./lead-form";

export const metadata: Metadata = {
  title: "Consulenza",
  description:
    "Progetti di intelligenza artificiale per aziende e amministrazioni. Il sito resta gratuito e indipendente.",
};

const offers = [
  [
    "Lettura con AI",
    "Partiamo da un problema concreto. I modelli leggono i dati che ci date: fonti pubbliche, archivi interni, fogli, o un mix. Ricostruiamo che cosa dicono i numeri, che cosa manca e che cosa si può confrontare. Ogni cifra resta agganciata alla sua origine.",
  ],
  [
    "Report o cruscotto interno",
    "Costruiamo una vista per un ufficio, un consiglio o un team: si chiede in italiano e si ottiene una risposta sui dati del progetto, con fonte, data, perimetro e limiti di ogni cifra.",
  ],
  [
    "Formazione",
    "Addestriamo chi deve usare l'intelligenza artificiale sul lavoro vero, senza inventare numeri: dati pubblici, dati aziendali, gare, controllo di gestione, comunicazione.",
  ],
  [
    "Strumento AI per l'impresa o per la PA",
    "Progettiamo e mettiamo in opera un assistente o un flusso interno: cercare documenti, seguire pratiche, interrogare archivi. Può stare sulle fonti pubbliche, sui dati dell'organizzazione, o su tutti e due.",
  ],
] as const;

export default function ConsultingPage() {
  return (
    <main className="shell page">
      <div className="page-intro">
        <h1>Intelligenza artificiale per aziende e PA</h1>
        <p>
          Il sito resta gratuito. Qui si parla di incarichi: progetti di intelligenza
          artificiale per un&apos;azienda o un&apos;amministrazione. Si può lavorare sui dati
          pubblici, sui dati interni, o su entrambi. Puoi anche lavorare senza le fonti
          del sito.
        </p>
      </div>

      <div className="notice">
        <strong>Due cose distinte</strong>
        <p>
          I dati pubblici restano pubblici. Un incarico di consulenza lascia invariati i numeri
          sul sito e riguarda un progetto operativo. I dati dell&apos;organizzazione restano
          dell&apos;organizzazione: non finiscono sul sito. Per le amministrazioni questa è una
          richiesta di contatto: un eventuale incarico segue le regole di affidamento previste.
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
