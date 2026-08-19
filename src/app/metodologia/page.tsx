import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodologia",
  description: "Principi di provenienza, confronto e indicatori di Trasparenza Italia.",
};

const rules = [
  ["01", "Nessun numero senza provenienza", "Ogni record conserva fonte ufficiale, URL, identificativo originario, timestamp di pubblicazione e di ingestione."],
  ["02", "Contabilità comparabile", "Competenza, cassa, impegni, pagamenti e stanziamenti non vengono sommati o confrontati come se fossero la stessa grandezza."],
  ["03", "Freschezza esplicita", "Il dato è “live” solo quanto lo è la fonte. La dashboard mostra ritardo e frequenza di aggiornamento."],
  ["04", "Alert non significa colpa", "Gli indicatori di anomalia servono a prioritizzare verifiche. Non sono giudizi su persone, enti o fornitori."],
  ["05", "Confronti tra pari", "Prezzi e spese vengono confrontati tra enti, territori e servizi realmente omogenei, con normalizzazioni dichiarate."],
  ["06", "Correzioni tracciabili", "Una rettifica non cancella la storia: la pipeline conserva versione, hash e trasformazioni applicate al dato."],
];

export default function MethodPage() {
  return (
    <main className="subpage">
      <header className="page-intro">
        <span className="eyebrow"><span /> METODOLOGIA</span>
        <h1>Trasparenza senza<br /><em>scorciatoie.</em></h1>
        <p>
          Rendere pubblici più dati è utile solo se si evita di produrre classifiche fuorvianti.
          La piattaforma separa fatti, trasformazioni, indicatori e interpretazioni.
        </p>
      </header>

      <section className="method-grid">
        {rules.map(([index, title, text]) => (
          <article key={index}>
            <span>{index}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="notice warning-notice">
        <strong>Persone e responsabilità.</strong>
        <p>
          Trasparenza Italia può mostrare dati già pubblici e indicatori documentabili, ma
          non sostituisce autorità giudiziarie, ANAC, Corte dei conti o procedimenti disciplinari.
          Nessun algoritmo attribuirà automaticamente illeciti o responsabilità personali.
        </p>
      </section>
    </main>
  );
}
