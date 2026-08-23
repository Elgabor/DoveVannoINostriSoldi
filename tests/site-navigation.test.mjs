import assert from "node:assert/strict";
import fs from "node:fs";
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
