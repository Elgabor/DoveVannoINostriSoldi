import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant-chat";

export const metadata: Metadata = {
  title: "Assistente sui dati pubblici",
  description: "Domande testuali deterministiche sui dati pubblici già verificati dal portale.",
};

export default function AssistantPage() {
  return (
    <main className="shell page">
      <header className="page-intro">
        <h1>Assistente sui dati pubblici</h1>
        <p>
          Una prima interfaccia testuale, deterministica e in sola lettura. Non genera analisi con
          un modello AI: riconosce solo poche domande esplicite e riusa gli stessi adapter verificati
          del sito e dell’MCP.
        </p>
      </header>

      <AssistantChat />

      <section className="panel" aria-labelledby="assistant-boundary-title">
        <h2 id="assistant-boundary-title">Cosa non fa ancora</h2>
        <p>
          Non supporta voce, chat con memoria, domande sul singolo Comune, classifiche, spiegazioni
          causali o accuse di frode e corruzione. La voce e un eventuale provider AI potranno essere
          valutati in una fase separata, con consenso, retention e controlli privacy documentati.
        </p>
        <p>
          Le richieste non vengono salvate dall’applicazione e il testo non viene scritto nei log
          applicativi. Il provider di hosting può conservare i normali log tecnici: consulta la
          <a href="/privacy"> privacy</a> prima di usare il servizio.
        </p>
      </section>
    </main>
  );
}
