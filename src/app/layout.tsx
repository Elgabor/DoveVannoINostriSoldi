import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Navigation } from "@/components/navigation";
import { siopeMunicipalSnapshot } from "@/lib/siope-snapshot";
import "./design-system.css";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-archivo",
});

/** The freshest "we looked at it" timestamp the app has, shown in the footer. */
const lastCheckedLabel = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
}).format(new Date(siopeMunicipalSnapshot.source.observedAt));

export const metadata: Metadata = {
  title: {
    default: "DoveVannoINostriSoldi",
    template: "%s · DoveVannoINostriSoldi",
  },
  description:
    "Dati pubblici italiani spiegati in modo semplice, con la fonte sempre a portata di mano.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f3f2f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={archivo.variable}>
      <body>
        <Navigation />
        {children}
        <footer className="shell site-footer">
          <div className="footer-row">
            <span>Ultimo controllo dei dati: {lastCheckedLabel}</span>
            <span>Dati pubblici, liberi da riusare</span>
            <span className="footer-spacer" />
            <a
              className="footer-link"
              href="https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi"
              target="_blank"
              rel="noreferrer"
            >
              Codice su GitHub ↗
            </a>
            <a className="footer-link" href="/mcp">MCP</a>
          </div>
          <div className="footer-row">
            <span className="footer-credit">Fatto da</span>
            <a href="https://x.com/fragiannicola" target="_blank" rel="noreferrer">@fragiannicola</a>
            <span aria-hidden="true">·</span>
            <a href="https://x.com/dom_gag_96" target="_blank" rel="noreferrer">@dom_gag_96</a>
            <span className="footer-spacer" />
            <span>Progetto civico indipendente, open source</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
