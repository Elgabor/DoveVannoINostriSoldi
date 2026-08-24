"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HeaderSearch } from "@/components/header-search";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import {
  PRIMARY_NAV,
  isNavChildActive,
  isNavSectionActive,
} from "@/lib/site-navigation";
import { REPO_URL } from "@/lib/site";

export function Navigation() {
  const pathname = usePathname();
  const navigationRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  /**
   * Which submenu a tap has opened. Hover alone cannot reach these on a touch
   * screen, so the caret is a real control and this is the state it drives.
   *
   * The path it was opened on travels with it: a completed navigation has
   * already answered the menu, so the open state simply stops applying rather
   * than being cleared from an effect after the new page has painted.
   */
  const [openMenu, setOpenMenu] = useState<{ href: string; pathname: string } | null>(null);
  const openHref = openMenu?.pathname === pathname ? openMenu.href : null;

  const closeMenu = useCallback(() => setOpenMenu(null), []);

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

  useEffect(() => {
    if (openHref === null) return;
    function dismissOutside(event: PointerEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) closeMenu();
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [openHref, closeMenu]);

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
              const menuId = `nav-menu-${item.href.replace(/\W+/g, "-")}`;
              const open = openHref === item.href;
              return (
                <li
                  key={item.href}
                  className={hasChildren ? "nav-item nav-item-has-menu" : "nav-item"}
                  data-section-active={active ? "true" : undefined}
                  data-open={open ? "true" : undefined}
                >
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    data-section-active={active ? "true" : undefined}
                    ref={active ? activeLinkRef : undefined}
                  >
                    {item.label}
                  </Link>
                  {hasChildren && item.children ? (
                    <>
                      <button
                        type="button"
                        className="nav-item-toggle"
                        aria-expanded={open}
                        aria-controls={menuId}
                        aria-label={`${open ? "Chiudi" : "Apri"} le pagine in ${item.label}`}
                        onClick={() =>
                          setOpenMenu(open ? null : { href: item.href, pathname })
                        }
                      >
                        <span aria-hidden="true">▾</span>
                      </button>
                      <div
                        className="nav-submenu"
                        id={menuId}
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
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
        <span className="nav-scroll-hint" aria-hidden="true">
          Scorri →
        </span>
        <span className="nav-note">Fonti e dati sempre visibili</span>
      </div>
    </header>
  );
}
