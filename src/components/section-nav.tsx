"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavSection, isNavChildActive } from "@/lib/site-navigation";
import styles from "./section-nav.module.css";

/**
 * The other pages of the section the reader is in, at the end of the page.
 *
 * The header dropdowns are the way in from anywhere; this is the way onward
 * once a page has been read, and it is the only one that needs no hover, so a
 * phone reaches every page of a section without going back to the menu.
 */
export function SectionNav() {
  const pathname = usePathname();
  const section = activeNavSection(pathname);
  const pages = section?.children ?? [];
  if (pages.length < 2) return null;

  return (
    <nav
      className={`shell ${styles.sectionNav}`}
      aria-label={`Altre pagine in ${section!.label}`}
    >
      <p className={styles.title}>
        Continua in <strong>{section!.label}</strong>
      </p>
      <ul className={styles.links}>
        {pages.map((page) => {
          const current = isNavChildActive(pathname, page.href, pages);
          return (
            <li key={page.href}>
              {current ? (
                <span className={styles.current} aria-current="page">
                  {page.label}
                  <small>sei qui</small>
                </span>
              ) : (
                <Link className={styles.link} href={page.href}>
                  {page.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
