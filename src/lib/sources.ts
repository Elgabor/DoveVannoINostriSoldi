export type SourceStatus = "attiva" | "integrazione" | "mappata";

export type PublicSource = {
  slug: string;
  name: string;
  owner: string;
  area: string;
  cadence: string;
  coverage: string;
  format: string;
  url: string;
  status: SourceStatus;
  note: string;
};

export const publicSources: PublicSource[] = [
  {
    slug: "siope",
    name: "SIOPE / SIOPE+",
    owner: "RGS · Banca d'Italia",
    area: "Incassi e pagamenti PA",
    cadence: "Flusso operativo continuo; pubblicazione secondo il dataset esposto",
    coverage: "Oltre 10.000 enti pubblici",
    format: "Open data / classificazioni contabili",
    url: "https://www.bancaditalia.it/compiti/tesoreria/siope/index.html",
    status: "integrazione",
    note: "Backbone previsto per i flussi di cassa di enti territoriali, sanità e altre amministrazioni.",
  },
  {
    slug: "openbdap",
    name: "OpenBDAP",
    owner: "Ragioneria Generale dello Stato",
    area: "Bilancio, spesa, SIOPE, opere, PNRR",
    cadence: "Variabile per dataset; pagamenti Stato per mese contabile",
    coverage: "Catalogo nazionale RGS",
    format: "CKAN API · CSV · open data",
    url: "https://bdap-opendata.rgs.mef.gov.it/content/api",
    status: "attiva",
    note: "Connettore attivo: catalogo, pagamenti dello Stato, missioni, amministrazioni, classificazione economica e serie 2026.",
  },
  {
    slug: "anac-bdncp",
    name: "BDNCP / ANAC Open Data",
    owner: "ANAC",
    area: "Contratti e appalti pubblici",
    cadence: "Dataset aperti mensili; Analytics con cadenza distinta",
    coverage: "Contratti pubblici nazionali",
    format: "Open data · CSV/JSON · ricerca CIG",
    url: "https://www.anticorruzione.it/-/portale-dei-dati-aperti-dell-autorita-nazionale-anticorruzione",
    status: "integrazione",
    note: "Per procedure, CIG, stazioni appaltanti, aggiudicazioni, fornitori e ciclo di vita dei contratti.",
  },
  {
    slug: "art-4-bis",
    name: "Pagamenti art. 4-bis",
    owner: "Singole amministrazioni · schema ANAC",
    area: "Pagamenti per tipologia e beneficiario",
    cadence: "Secondo pubblicazione dell'ente",
    coverage: "Amministrazioni soggette al D.Lgs. 33/2013",
    format: "JSON · CSV · XML · PDF",
    url: "https://guida-servizi.anticorruzione.it/it/help/trasparenza/schemi/art.4-bis/",
    status: "integrazione",
    note: "Schema 2026 che rende possibile un crawler nazionale normalizzato dei dati sui pagamenti.",
  },
  {
    slug: "ipa",
    name: "Indice PA (IPA)",
    owner: "AgID",
    area: "Anagrafe degli enti",
    cadence: "Giornaliera",
    coverage: "PA, gestori di servizi pubblici e altri soggetti censiti",
    format: "JSON · XLSX · Data API",
    url: "https://www.indicepa.gov.it/ipa-dati/dataset/enti",
    status: "attiva",
    note: "Connettore attivo: ricerca enti, pagina canonica per Codice IPA, API normalizzata e aggregazioni reali.",
  },
  {
    slug: "opencoesione",
    name: "OpenCoesione",
    owner: "Dipartimento per le Politiche di Coesione",
    area: "Progetti e pagamenti di coesione",
    cadence: "Bimestrale prevista per i principali dataset",
    coverage: "Politiche di coesione in Italia",
    format: "API · CSV · open data",
    url: "https://opencoesione.gov.it/it/opendata/",
    status: "mappata",
    note: "Progetti, localizzazioni, soggetti, pagamenti, impegni, fasi e indicatori.",
  },
  {
    slug: "regis",
    name: "ReGiS / PNRR Open Data",
    owner: "MEF · Italia Domani / catalogo nazionale",
    area: "PNRR",
    cadence: "Estratti periodici",
    coverage: "Progetti finanziati dal PNRR",
    format: "Open data",
    url: "https://open.gov.it/governo-aperto/piano-nazionale/6nap/azione-3/impegno-6",
    status: "mappata",
    note: "Dati finanziari, fisici e procedurali dei progetti PNRR pubblicati come estrazioni dal sistema ReGiS.",
  },
  {
    slug: "consulenti",
    name: "Consulenti Pubblici",
    owner: "Dipartimento della Funzione Pubblica",
    area: "Consulenze e incarichi",
    cadence: "Aggiornamento per singolo incarico/amministrazione",
    coverage: "Incarichi comunicati dalle amministrazioni",
    format: "Ricerca · export open data",
    url: "https://consulentipubblici.dfp.gov.it/",
    status: "mappata",
    note: "Compenso lordo, ammontare erogato e dati sugli incarichi esterni e ai dipendenti PA.",
  },
  {
    slug: "camera",
    name: "Camera Trasparente",
    owner: "Camera dei deputati",
    area: "Parlamento",
    cadence: "Secondo pubblicazione istituzionale",
    coverage: "Bilancio e amministrazione della Camera",
    format: "Web · documenti",
    url: "https://trasparenza.camera.it/",
    status: "mappata",
    note: "Bilanci, procedure di gara, organizzazione e trattamento economico secondo quanto pubblicato dalla Camera.",
  },
  {
    slug: "senato",
    name: "Spese e trasparenza",
    owner: "Senato della Repubblica",
    area: "Parlamento",
    cadence: "Secondo pubblicazione istituzionale",
    coverage: "Bilancio e amministrazione del Senato",
    format: "Web · documenti",
    url: "https://www.senato.it/relazioni-con-i-cittadini/spese-trasparenza/spese-e-trasparenza",
    status: "mappata",
    note: "Bilancio, consuntivo e informazioni ufficiali sul trattamento economico dei senatori.",
  },
];

export const sourceCounts = {
  total: publicSources.length,
  active: publicSources.filter((source) => source.status === "attiva").length,
  integrating: publicSources.filter((source) => source.status === "integrazione").length,
  mapped: publicSources.filter((source) => source.status === "mappata").length,
};
