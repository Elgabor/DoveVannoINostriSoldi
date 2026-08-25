import type { Metadata } from "next";
import IntegratedDomainHub from "@/components/integrated-domain-hub";

export const metadata: Metadata = {
  title: "Appalti e fornitori · dati di dettaglio",
  description: "Affidamenti, CIG, fornitori, rinnovi, Consip e concentrazione contrattuale.",
};

export default function ProcurementDetailPage() {
  return (
    <IntegratedDomainHub
      title="Appalti, fornitori e rinnovi"
      introduction="Affidamenti diretti, CIG di ministeri e autorità, fornitori aggregati, gruppi societari, rinnovi, proroghe e materiale Consip sono raccolti senza confondere inventari incompleti con classifiche definitive."
      domains={["procurement"]}
      editorialSection="appalti"
      interpretation="Un affidamento, una ripetizione o una differenza di prezzo è un fatto da contestualizzare. I record fuori Consip restano documentati, ma non sono presentati come sovrapprezzi quando mancano modello o SKU comparabili."
      related={[
        {
          href: "/appalti",
          title: "Quadro nazionale ANAC 2025",
          summary: "Procedure, soglie e distribuzione mensile nell’aggregato ufficiale già pubblicato.",
          metric: "1.453.918 CIG",
        },
      ]}
    />
  );
}
