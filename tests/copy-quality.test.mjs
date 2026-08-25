import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url);
const uiRoots = ["src/app", "src/components"];

async function filesBelow(relativePath) {
  const absolutePath = new URL(`${relativePath}/`, root);
  const entries = await readdir(absolutePath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(child));
    if (entry.isFile() && extname(entry.name) === ".tsx") files.push(child);
  }
  return files;
}

test("readme shows live UI screenshots of home, territories and controls", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /https:\/\/www\.dovevannoinostrisoldi\.com/);
  for (const file of ["home.jpg", "territori.jpg", "controlli.jpg"]) {
    assert.match(readme, new RegExp(`docs/readme/${file}`));
    await readFile(new URL(`../docs/readme/${file}`, import.meta.url));
  }
});

test("public copy avoids old branding, dash separators and known filler phrases", async () => {
  const files = ["README.md", ...(await Promise.all(uiRoots.map(filesBelow))).flat()];
  const forbidden = [
    /Trasparenza ?Italia/i,
    /trasparenzaitalia/i,
    /—|–/,
    /Sei numeri, sei significati diversi/i,
    /La dashboard principale resta valida/i,
    /\b85,4%\b/,
    /\b(?:129|142|155|165|195|200)x differenza\b/i,
    /muro (?:dei|del) 39[.\s]?900/i,
    /potenzialmente frazionati/i,
    /cimitero dei progetti/i,
    /Spesa vera/i,
    /Quanto pagano i Comuni/i,
    /Quanto paga il tuo territorio/i,
  ];

  for (const file of files) {
    const content = await readFile(new URL(file, root), "utf8");
    for (const pattern of forbidden) {
      assert.doesNotMatch(content, pattern, `${file} contiene ${pattern}`);
    }
  }
});
