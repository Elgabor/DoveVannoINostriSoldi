"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BankIcon,
  ChartLineIcon,
  Database02Icon,
  Globe02Icon,
  Home04Icon,
  LegalDocument01Icon,
  MapsIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

const primary = [
  { href: "/", label: "Quadro", icon: Home04Icon },
  { href: "/spese", label: "Spese", icon: ChartLineIcon },
  { href: "/coesione", label: "Coesione", icon: Globe02Icon },
  { href: "/enti", label: "Organizzazioni", icon: BankIcon, aliases: ["/partecipazioni"] },
  { href: "/territori", label: "Territori", icon: MapsIcon },
  { href: "/fonti", label: "Fonti", icon: Database02Icon },
  { href: "/metodologia", label: "Metodo", icon: LegalDocument01Icon },
];

export function Navigation() {
  const pathname = usePathname();

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
            <HugeiconsIcon icon={Search01Icon} size={19} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </form>
      </div>

      <div className="nav-row">
        <nav className="primary-nav" aria-label="Navigazione principale">
          {primary.map((item) => {
            const active = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href) || item.aliases?.some((alias) => pathname.startsWith(alias));
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                <HugeiconsIcon icon={item.icon} size={17} strokeWidth={1.5} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span>Solo fonti ufficiali · ogni dato verificabile</span>
      </div>
    </header>
  );
}
