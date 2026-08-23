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
  assert.match(layoutSource, /SiteFooter/);
  assert.match(globalsCss, /\.subnav-row \{/);
  assert.match(globalsCss, /\.footer-sitemap \{/);
});

test("activeNavSection resolves nested routes to the parent menu", () => {
  const coesione = activeNavSection("/coesione/asili");
  assert.equal(coesione?.href, "/coesione");
  assert.ok(coesione?.children?.some((child) => child.href === "/coesione/asili"));

  const enti = activeNavSection("/enti/c_a783");
  assert.equal(enti?.href, "/enti");

  assert.equal(
    isNavChildActive("/coesione/asili", "/coesione/asili", coesione.children),
    true,
  );
  assert.equal(
    isNavChildActive("/coesione/asili", "/coesione", coesione.children),
    false,
  );
});
