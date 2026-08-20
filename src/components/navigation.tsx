import Link from "next/link";

const primary = [
  { href: "/spese", label: "Spese" },
  { href: "/coesione", label: "Coesione" },
  { href: "/enti", label: "Enti" },
  { href: "/#appalti", label: "Appalti" },
  { href: "/territori", label: "Territori" },
  { href: "/#parlamento", label: "Parlamento" },
  { href: "/fonti", label: "Fonti" },
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

        <nav className="primary-nav" aria-label="Navigazione principale">
          {primary.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/metodologia" className="source-button">
          Metodologia
        </Link>
      </div>
    </header>
  );
}
