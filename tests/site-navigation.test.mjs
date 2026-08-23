import assert from "node:assert/strict";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import "./helpers/register-ts-alias.mjs";

const navigationSource = fs.readFileSync(
  new URL("../src/lib/site-navigation.ts", import.meta.url),
  "utf8",
);
const layoutSource = fs.readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const globalsCss = fs.readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

const { activeNavSection, isNavChildActive } = await import("../src/lib/site-navigation.ts");

test("site navigation exposes coesione asili in primary and footer maps", () => {
  assert.match(navigationSource, /href: "\/coesione\/asili", label: "Asili e prima infanzia"/);
  assert.match(navigationSource, /title: "Fondi e progetti"/);
  assert.match(navigationSource, /FOOTER_SITEMAP_GROUPS/);
  assert.match(navigationSource, /FOOTER_SITEMAP_COLUMNS = 4/);
  assert.match(layoutSource, /SiteFooter/);
  assert.match(globalsCss, /\.subnav-row \{/);
  assert.match(globalsCss, /\.footer-sitemap-rows \{/);
  assert.match(globalsCss, /row-gap: var\(--space-6\)/);
  assert.doesNotMatch(globalsCss, /var\(--space-5\)/);
});

test("public legal pages do not expose a personal mailbox", async () => {
  const files = await Promise.all([
    readFile(new URL("../src/app/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/supporto/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/site.ts", import.meta.url), "utf8"),
  ]);
  for (const source of files) {
    assert.doesNotMatch(source, /mailto:/i);
    assert.doesNotMatch(source, /@gmail\.com/i);
  }
  assert.doesNotMatch(files[0], /panel-title">Titolare/i);
  assert.doesNotMatch(files.join("\n"), /\/consulenza/);
});

test("activeNavSection resolves nested routes to the parent menu", () => {
  const coesione = activeNavSection("/coesione/asili");
  assert.equal(coesione?.href, "/coesione");
  assert.ok(coesione?.children?.some((child) => child.href === "/coesione/asili"));

  const enti = activeNavSection("/enti/c_a783");
  assert.equal(enti?.href, "/enti");

  const appalti = activeNavSection("/appalti");
  assert.equal(appalti?.href, "/controlli");
  assert.equal(isNavChildActive("/appalti", "/appalti", appalti.children), true);

  const incarichi = activeNavSection("/incarichi");
  assert.equal(incarichi?.href, "/controlli");

  const stato = activeNavSection("/stato");
  assert.equal(stato?.href, "/spese");

  assert.equal(
    isNavChildActive("/coesione/asili", "/coesione/asili", coesione.children),
    true,
  );
  assert.equal(
    isNavChildActive("/coesione/asili", "/coesione", coesione.children),
    false,
  );
});
