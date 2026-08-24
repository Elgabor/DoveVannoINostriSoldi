import Link from "next/link";
import {
  FOOTER_SITEMAP_COLUMNS,
  FOOTER_SITEMAP_GROUPS,
} from "@/lib/site-navigation";
import { REPO_URL } from "@/lib/site";

type SiteFooterProps = Readonly<{
  latestTerritorialCheckLabel: string;
}>;

function footerSitemapRows() {
  const rows: (typeof FOOTER_SITEMAP_GROUPS)[number][][] = [];
  for (let index = 0; index < FOOTER_SITEMAP_GROUPS.length; index += FOOTER_SITEMAP_COLUMNS) {
    rows.push(FOOTER_SITEMAP_GROUPS.slice(index, index + FOOTER_SITEMAP_COLUMNS));
  }
  return rows;
}

export function SiteFooter({ latestTerritorialCheckLabel }: SiteFooterProps) {
  const sitemapRows = footerSitemapRows();

  return (
    <footer className="shell site-footer">
      <section className="footer-sitemap" aria-labelledby="footer-sitemap-title">
        <h2 id="footer-sitemap-title" className="footer-sitemap-title">
          Mappa del sito
        </h2>
        <div className="footer-sitemap-rows">
          {sitemapRows.map((row, rowIndex) => (
            <div key={`footer-sitemap-row-${rowIndex}`} className="footer-sitemap-grid">
              {row.map((group) => (
                <div key={group.title} className="footer-sitemap-group">
                  <h3>{group.title}</h3>
                  <ul>
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href}>{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className="footer-row">
        <span>Ultimo controllo SIOPE o IRPEF: {latestTerritorialCheckLabel}</span>
        <span>Dati pubblici, liberi da riusare</span>
        <span className="footer-spacer" />
        <Link className="footer-link" href="/privacy">
          Privacy
        </Link>
        <a className="footer-link" href={REPO_URL} target="_blank" rel="noreferrer">
          Codice su GitHub ↗
        </a>
        <Link className="footer-link" href="/mcp">
          MCP
        </Link>
      </div>
      <div className="footer-row">
        <span className="footer-credit">Fatto da</span>
        <a href="https://x.com/fragiannicola" target="_blank" rel="noreferrer">
          @fragiannicola
        </a>
        <span aria-hidden="true">·</span>
        <a href="https://x.com/dom_gag_96" target="_blank" rel="noreferrer">
          @dom_gag_96
        </a>
        <span className="footer-spacer" />
        <Link href="/supporter">Chi ci sostiene</Link>
        <Link href="/supporto">Supporto</Link>
        <Link href="/termini">Termini</Link>
      </div>
    </footer>
  );
}
