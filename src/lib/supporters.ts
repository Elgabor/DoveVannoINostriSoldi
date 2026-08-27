export type SiteSupporter = Readonly<{
  name: string;
  /** Public profile when known; omit for anonymous or name-only acknowledgements. */
  href?: string;
  contribution: string;
}>;

/**
 * Individual donors acknowledged publicly from Buy Me a Coffee.
 * Aggregated by display name; anonymous gifts stay under “Someone”.
 * Ordered by first public support (oldest first).
 */
export const INDIVIDUAL_SUPPORTERS: readonly SiteSupporter[] = [
  {
    name: "Clodo76",
    href: "https://github.com/Clodo76",
    contribution:
      "Primo sostegno su Buy Me a Coffee: 500 ai compute. «Progetto meritevole».",
  },
  {
    name: "giuseppe russo",
    contribution: "Sostegno su Buy Me a Coffee (10 ai compute).",
  },
  {
    name: "chochoichoy",
    contribution:
      "Sostegno su Buy Me a Coffee (10 ai compute). «grazie per portare avanti questo progetto!»",
  },
  {
    name: "Francesco Cecchetti",
    contribution: "Sostegno su Buy Me a Coffee (10 ai compute). «avanti così»",
  },
  {
    name: "Crisnulli",
    contribution: "Sostegno su Buy Me a Coffee (10 ai compute).",
  },
  {
    name: "scacciavillani",
    contribution: "Sostegno su Buy Me a Coffee (5 ai compute).",
  },
  {
    name: "HyDrogu",
    contribution:
      "Sostegno su Buy Me a Coffee (10 ai compute). «Complimenti ragazzi, continuate così»",
  },
  {
    name: "Marco rossi",
    contribution: "Sostegno su Buy Me a Coffee (10 ai compute). «Bel lavoro! Complimenti»",
  },
  {
    name: "Nicole",
    contribution: "Sostegno su Buy Me a Coffee (10 ai compute). «Ottimo lavoro! Continuate così»",
  },
  {
    name: "Luca Celati",
    contribution: "Sostegno su Buy Me a Coffee (5 ai compute).",
  },
  {
    name: "Aldo Colamartino",
    contribution:
      "Sostegno su Buy Me a Coffee (5 ai compute). «Accountability, accountability e trasparenza ci vogliono.»",
  },
  {
    name: "MrPolitano",
    contribution:
      "Sostegno su Buy Me a Coffee (5 ai compute). «È l'inizio del cambiamento. Forza ragazzi e grazie»",
  },
  {
    name: "herr_man",
    contribution:
      "Sostegno su Buy Me a Coffee (5 ai compute). «bravi coder mi fate un po' invidia :)»",
  },
  {
    name: "Someone",
    contribution:
      "Sostegni anonimi su Buy Me a Coffee (3 ai compute in totale).",
  },
];

/** Organisations and communities that provide infrastructure, time or community. */
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
