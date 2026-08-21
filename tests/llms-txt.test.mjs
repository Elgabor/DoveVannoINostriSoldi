import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { test } from "node:test";

const llmsPath = new URL("../public/llms.txt", import.meta.url);
const siteOrigin = "https://www.dovevannoinostrisoldi.com";

const requiredLinks = [
  "/",
  "/spese",
  "/territori",
  "/territori/irpef",
  "/stato",
  "/coesione",
  "/enti",
  "/parlamento",
  "/controlli",
  "/fonti",
  "/mcp",
  "/api/mcp",
  "/api/spese/comuni",
  "/api/spese/comuni/distribuzione",
  "/api/spese/invalidita",
  "/api/territori/fisco",
  "/api/territori/irpef",
  "/privacy",
  "/consulenza",
];

const routeFiles = {
  "/": "../src/app/page.tsx",
  "/spese": "../src/app/spese/page.tsx",
  "/territori": "../src/app/territori/page.tsx",
  "/territori/irpef": "../src/app/territori/irpef/page.tsx",
  "/stato": "../src/app/stato/page.tsx",
  "/coesione": "../src/app/coesione/page.tsx",
  "/enti": "../src/app/enti/page.tsx",
  "/parlamento": "../src/app/parlamento/page.tsx",
  "/controlli": "../src/app/controlli/page.tsx",
  "/fonti": "../src/app/fonti/page.tsx",
  "/mcp": "../src/app/mcp/page.tsx",
  "/api/mcp": "../src/app/api/mcp/route.ts",
  "/api/spese/comuni": "../src/app/api/spese/comuni/route.ts",
  "/api/spese/comuni/distribuzione": "../src/app/api/spese/comuni/distribuzione/route.ts",
  "/api/spese/invalidita": "../src/app/api/spese/invalidita/route.ts",
  "/api/territori/fisco": "../src/app/api/territori/fisco/route.ts",
  "/api/territori/irpef": "../src/app/api/territori/irpef/route.ts",
  "/privacy": "../src/app/privacy/page.tsx",
  "/consulenza": "../src/app/consulenza/page.tsx",
};

test("llms.txt is a complete, canonical static discovery surface", async () => {
  await access(llmsPath, constants.R_OK);
  assert.equal(llmsPath.pathname.endsWith("/public/llms.txt"), true);

  const text = await readFile(llmsPath, "utf8");
  assert.match(text, /^# DoveVannoINostriSoldi\n/);
  assert.match(text, /MCP Streamable HTTP/);
  assert.match(text, /list_datasets/);
  assert.match(text, /query_dataset/);
  assert.doesNotMatch(text, /localhost|127\.0\.0\.1|<dominio|\b(?:TODO|TBD)\b/i);

  const links = [...text.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((match) => new URL(match[1]));
  assert.ok(links.length >= requiredLinks.length, "discovery file should expose the main public surfaces");
  assert.ok(links.every((link) => link.protocol === "https:"), "all links must be HTTPS");

  for (const path of requiredLinks) {
    assert.equal(
      links.some((link) => link.origin === siteOrigin && link.pathname === path),
      true,
      `missing canonical link: ${siteOrigin}${path}`,
    );
    await access(new URL(routeFiles[path], import.meta.url), constants.R_OK);
  }
});
