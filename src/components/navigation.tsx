"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

const primary = [
  { href: "/", label: "Home" },
  { href: "/spese", label: "Soldi", aliases: ["/stato", "/parlamento"] },
  { href: "/territori", label: "Territori" },
  { href: "/coesione", label: "Fondi e progetti" },
  { href: "/enti", label: "Enti e società", aliases: ["/partecipazioni"] },
  { href: "/controlli", label: "Cosa controllare" },
  { href: "/fonti", label: "Fonti", aliases: ["/metodologia"] },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Dove vanno i nostri soldi, home">
          <Image
            className="brand-mark"
            src="/brand/dvns-mark-transparent.svg"
            width={44}
            height={44}
            alt=""
            aria-hidden="true"
            priority
          />
          <span className="brand-text">
            <strong>Dove vanno i nostri soldi?</strong>
            <small>I soldi pubblici, spiegati semplice</small>
          </span>
        </Link>

        <span className="header-spacer" />

        <form className="header-search" action="/enti" method="get" role="search">
          <label htmlFor="global-entity-search">Cerca nel registro degli enti</label>
          <input
            className="input"
            id="global-entity-search"
            name="q"
            type="search"
            placeholder="Cerca un Comune, un ente o un ministero"
            autoComplete="off"
          />
          <button type="submit" aria-label="Cerca">
            <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </form>

        <Link className="header-action" href="/fonti">
          Scarica i dati
        </Link>
      </div>

      <div className="shell nav-row">
        <nav className="primary-nav" aria-label="Navigazione principale">
          {primary.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) ||
                  item.aliases?.some((alias) => pathname.startsWith(alias));
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span className="nav-note">Fonte e data sempre visibili</span>
      </div>
    </header>
  );
}
