"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HeaderSearch } from "@/components/header-search";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import {
  PRIMARY_NAV,
  activeNavSection,
  isNavChildActive,
  isNavSectionActive,
} from "@/lib/site-navigation";
import { REPO_URL } from "@/lib/site";

export function Navigation() {
  const pathname = usePathname();
  const navigationRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const section = activeNavSection(pathname);

  useEffect(() => {
    const navigation = navigationRef.current;
    const activeLink = activeLinkRef.current;
    if (!navigation || !activeLink) return;
    const navigationBox = navigation.getBoundingClientRect();
    const activeBox = activeLink.getBoundingClientRect();
    if (activeBox.left < navigationBox.left || activeBox.right > navigationBox.right) {
      activeLink.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [pathname]);

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
          </span>
        </Link>

        <span className="header-spacer" />

        <HeaderSearch />

        <div className="header-actions">
          <Link className="header-action" href="/consulenza">
            Consulenza
          </Link>
          <Link className="header-action header-action-accent" href="/mcp">
            MCP
          </Link>
          <a
            className="header-action header-action-icon"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Codice su GitHub, si apre in una nuova scheda"
            title="Codice su GitHub"
          >
            <HugeiconsIcon icon={GithubIcon} size={19} strokeWidth={1.7} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="shell nav-row">
        <nav className="primary-nav" aria-label="Navigazione principale" ref={navigationRef}>
          <ul className="primary-nav-list">
            {PRIMARY_NAV.map((item) => {
              const active = isNavSectionActive(pathname, item);
              const hasChildren = Boolean(item.children?.length);
              return (
                <li
                  key={item.href}
                  className={hasChildren ? "nav-item nav-item-has-menu" : "nav-item"}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-haspopup={hasChildren ? "true" : undefined}
                    aria-expanded={hasChildren && active ? "true" : undefined}
                    ref={active ? activeLinkRef : undefined}
                  >
                    {item.label}
                    {hasChildren ? (
                      <span className="nav-item-caret" aria-hidden="true">
                        ▾
                      </span>
                    ) : null}
                  </Link>
                  {hasChildren && item.children ? (
                    <div
                      className="nav-submenu"
                      role="region"
                      aria-label={`Pagine in ${item.label}`}
                    >
                      <ul>
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={
                                isNavChildActive(pathname, child.href, item.children!)
                                  ? "page"
                                  : undefined
                              }
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
        <span className="nav-scroll-hint" aria-hidden="true">
          Scorri →
        </span>
        <span className="nav-note">Fonte e data sempre visibili</span>
      </div>

      {section?.children ? (
        <div className="shell subnav-row">
          <nav className="subnav" aria-label={`Sezioni di ${section.label}`}>
            <ul className="subnav-list">
              {section.children.map((child) => (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    aria-current={
                      isNavChildActive(pathname, child.href, section.children!)
                        ? "page"
                        : undefined
                    }
                  >
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
