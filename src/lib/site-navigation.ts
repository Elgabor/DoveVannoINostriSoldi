/**
 * Primary navigation and footer sitemap. One source so header submenus and the
 * footer map stay aligned.
 */

export type NavLink = Readonly<{
  href: string;
  label: string;
}>;

export type NavSection = Readonly<{
  href: string;
  label: string;
  aliases?: readonly string[];
  children?: readonly NavLink[];
}>;

export const PRIMARY_NAV: readonly NavSection[] = [
  { href: "/", label: "Home" },
  {
    href: "/spese",
    label: "Soldi",
    aliases: ["/stato"],
    children: [
      { href: "/spese", label: "Pagamenti comunali" },
      { href: "/spese/sanita", label: "Sanità" },
      { href: "/spese/sanita/storico", label: "Sanità · serie storica" },
      { href: "/spese/invalidita", label: "Invalidità INPS" },
      { href: "/spese/consulenze", label: "Consulenze ministeriali" },
      { href: "/spese/territoriale", label: "Spesa statale per territorio" },
      { href: "/spese/operative", label: "Spese operative" },
      { href: "/stato", label: "Amministrazioni centrali" },
    ],
  },
  {
    href: "/territori",
    label: "Territori",
    children: [
      { href: "/territori", label: "Panoramica" },
      { href: "/territori/irpef", label: "Redditi IRPEF" },
      { href: "/territori/fisco", label: "Entrate e spese" },
      { href: "/territori/confronto", label: "Confronto Comuni" },
    ],
  },
  {
    href: "/coesione",
    label: "Fondi e progetti",
    aliases: ["/confronti", "/pnrr", "/progetti"],
    children: [
      { href: "/coesione", label: "Coesione e PNRR" },
      { href: "/coesione/asili", label: "Asili e prima infanzia" },
      { href: "/confronti", label: "Confronti verificati" },
      { href: "/pnrr/incarichi", label: "Incarichi PNRR INDIRE" },
    ],
  },
  {
    href: "/istituzioni",
    label: "Istituzioni",
    aliases: ["/parlamento", "/palazzo-chigi", "/ministeri", "/regioni"],
    children: [
      { href: "/istituzioni", label: "Panoramica" },
      { href: "/parlamento", label: "Parlamento" },
      { href: "/palazzo-chigi", label: "Palazzo Chigi" },
      { href: "/ministeri", label: "Ministeri" },
      { href: "/regioni", label: "Regioni" },
    ],
  },
  {
    href: "/enti",
    label: "Enti e società",
    aliases: ["/partecipazioni"],
    children: [
      { href: "/enti", label: "Registro enti" },
      { href: "/partecipazioni", label: "Partecipazioni" },
    ],
  },
  {
    href: "/controlli",
    label: "Cosa controllare",
    aliases: ["/appalti", "/incarichi", "/dati", "/trasparenza"],
    children: [
      { href: "/appalti", label: "Appalti" },
      { href: "/incarichi", label: "Incarichi" },
      { href: "/dati", label: "Catalogo dati" },
      { href: "/controlli", label: "Segnali" },
    ],
  },
  { href: "/assistente", label: "Assistente" },
  {
    href: "/fonti",
    label: "Fonti",
    aliases: ["/metodologia"],
    children: [
      { href: "/fonti", label: "Elenco fonti" },
      { href: "/fonti/stato", label: "Stato delle fonti" },
      { href: "/fonti/copertura", label: "Copertura integrata" },
      { href: "/fonti/catalogo", label: "Catalogo delle fonti" },
      { href: "/metodologia", label: "Metodo" },
    ],
  },
] as const;

export const SITE_MAP_GROUPS: readonly { title: string; links: readonly NavLink[] }[] = [
  { title: "Home", links: [{ href: "/", label: "Home" }] },
  {
    title: "Soldi",
    links: [
      { href: "/spese", label: "Pagamenti comunali" },
      { href: "/spese/sanita", label: "Sanità" },
      { href: "/spese/sanita/storico", label: "Sanità · serie storica" },
      { href: "/spese/invalidita", label: "Invalidità INPS" },
      { href: "/spese/consulenze", label: "Consulenze ministeriali" },
      { href: "/spese/territoriale", label: "Spesa statale per territorio" },
      { href: "/spese/operative", label: "Spese operative" },
      { href: "/stato", label: "Amministrazioni centrali" },
    ],
  },
  {
    title: "Territori",
    links: [
      { href: "/territori", label: "Panoramica" },
      { href: "/territori/irpef", label: "Redditi IRPEF" },
      { href: "/territori/fisco", label: "Entrate e spese" },
      { href: "/territori/confronto", label: "Confronto Comuni" },
    ],
  },
  {
    title: "Fondi e progetti",
    links: [
      { href: "/coesione", label: "Coesione e PNRR" },
      { href: "/coesione/asili", label: "Asili e prima infanzia" },
      { href: "/confronti", label: "Confronti verificati" },
      { href: "/pnrr/incarichi", label: "Incarichi PNRR INDIRE" },
    ],
  },
  {
    title: "Istituzioni",
    links: [
      { href: "/istituzioni", label: "Panoramica" },
      { href: "/parlamento", label: "Parlamento" },
      { href: "/palazzo-chigi", label: "Palazzo Chigi" },
      { href: "/ministeri", label: "Ministeri" },
      { href: "/regioni", label: "Regioni" },
    ],
  },
  {
    title: "Enti e società",
    links: [
      { href: "/enti", label: "Registro enti" },
      { href: "/partecipazioni", label: "Partecipazioni" },
    ],
  },
  {
    title: "Cosa controllare",
    links: [
      { href: "/appalti", label: "Appalti" },
      { href: "/appalti/dettaglio", label: "Appalti di dettaglio" },
      { href: "/incarichi", label: "Incarichi" },
      { href: "/incarichi/dettaglio", label: "Incarichi di dettaglio" },
      { href: "/dati", label: "Catalogo dati" },
      { href: "/controlli", label: "Segnali" },
      { href: "/trasparenza", label: "Trasparenza e verifiche" },
    ],
  },
  {
    title: "Strumenti",
    links: [
      { href: "/assistente", label: "Assistente" },
      { href: "/mcp", label: "MCP" },
      { href: "/supporto", label: "Supporto" },
      { href: "/supporter", label: "Chi ci sostiene" },
    ],
  },
  {
    title: "Fonti e metodo",
    links: [
      { href: "/fonti", label: "Elenco fonti" },
      { href: "/fonti/stato", label: "Stato delle fonti" },
      { href: "/fonti/copertura", label: "Copertura integrata" },
      { href: "/fonti/catalogo", label: "Catalogo delle fonti" },
      { href: "/metodologia", label: "Metodo" },
    ],
  },
  {
    title: "Legale",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/termini", label: "Termini" },
    ],
  },
] as const;

/** Footer map: main sections only, in reading order, split into balanced rows. */
export const FOOTER_SITEMAP_GROUPS: readonly { title: string; links: readonly NavLink[] }[] =
  SITE_MAP_GROUPS.filter((group) => group.title !== "Home" && group.title !== "Legale");

export const FOOTER_SITEMAP_COLUMNS = 4;

export function isNavSectionActive(pathname: string, item: NavSection): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname.startsWith(item.href)) return true;
  if (item.aliases?.some((alias) => pathname.startsWith(alias))) return true;
  return (
    item.children?.some(
      (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
    ) ?? false
  );
}

export function activeNavSection(pathname: string): NavSection | null {
  if (pathname === "/") return null;
  return (
    PRIMARY_NAV.filter((item) => item.children && item.children.length > 0)
      .filter((item) => isNavSectionActive(pathname, item))
      .sort((left, right) => right.href.length - left.href.length)[0] ?? null
  );
}

export function isNavChildActive(
  pathname: string,
  childHref: string,
  siblings: readonly NavLink[],
): boolean {
  const matches = siblings.filter(
    (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
  );
  if (matches.length === 0) return false;
  const best = matches.reduce((current, candidate) =>
    candidate.href.length > current.href.length ? candidate : current,
  );
  return best.href === childHref;
}
