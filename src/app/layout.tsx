import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import "./globals.css";
import "./design-system.css";

export const metadata: Metadata = {
  title: {
    default: "Trasparenza Italia",
    template: "%s · Trasparenza Italia",
  },
  description:
    "Dashboard civica open source che aggrega fonti ufficiali sulla spesa e sulla gestione delle risorse pubbliche italiane.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>
        <Navigation />
        {children}
        <footer className="site-footer">
          <div>
            <strong>Trasparenza Italia</strong>
            <p>Progetto civico indipendente e open source. Non è un sito della Pubblica Amministrazione.</p>
          </div>
          <div className="footer-rule">
            Ogni numero deve avere una fonte, una data e un percorso di verifica.
          </div>
        </footer>
      </body>
    </html>
  );
}
