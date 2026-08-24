export type SiteSupporter = Readonly<{
  name: string;
  href: string;
  contribution: string;
}>;

export const SITE_SUPPORTERS: readonly SiteSupporter[] = [
  {
    name: "Regolo.ai",
    href: "https://regolo.ai/",
    contribution:
      "Accesso illimitato al modello GLM per due mesi, per sperimentare assistenti e analisi sul portale senza spostare i dati fuori dall’UE.",
  },
  {
    name: "Manto Venture",
    href: "https://mantoventure.com",
    contribution: "Supporto al progetto e alla sua messa in produzione.",
  },
  {
    name: "Italian Builders",
    href: "https://italianbuilders.co",
    contribution: "Community di riferimento per chi costruisce prodotti digitali in Italia.",
  },
];
