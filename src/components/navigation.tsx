import Link from "next/link";

const primary = [
  { href: "/", label: "Dashboard" },
  { href: "/spese", label: "Spese" },
  { href: "/coesione", label: "Coesione" },
  { href: "/enti", label: "Enti" },
  { href: "/territori", label: "Territori" },
  { href: "/fonti", label: "Fonti" },
  { href: "/metodologia", label: "Metodologia" },
];

export function Navigation() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Trasparenza Italia, home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>TRASPARENZA ITALIA</strong>
            <small>I dati pubblici, finalmente insieme</small>
          </span>
        </Link>

        <form className="header-search" action="/enti" method="get" role="search">
          <label htmlFor="global-entity-search">Cerca nel registro IPA</label>
          <input
            id="global-entity-search"
            name="q"
            type="search"
            placeholder="Cerca ente, Comune, Ministero o Codice IPA…"
            autoComplete="off"
          />
          <button type="submit" aria-label="Cerca ente">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </button>
        </form>
      </div>

      <div className="nav-row">
        <nav className="primary-nav" aria-label="Navigazione principale">
          {primary.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>
        <span>Solo fonti ufficiali · ogni dato verificabile</span>
      </div>
    </header>
  );
}
