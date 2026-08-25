import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import sharp from "sharp";

const root = process.cwd();
const outputDir = path.join(root, "docs/readme");
const baseUrl = process.env.DVNS_BASE_URL ?? "https://www.dovevannoinostrisoldi.com";

const shots = [
  { pathname: "/", file: "home.jpg", wait: "main h1" },
  { pathname: "/territori", file: "territori.jpg", wait: "main h1" },
  { pathname: "/controlli", file: "controlli.jpg", wait: "main h1" },
];

function chromeExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

await mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromeExecutable(),
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 2 });

  for (const shot of shots) {
    const url = new URL(shot.pathname, baseUrl).toString();
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (!response?.ok()) {
      throw new Error(`${url}: HTTP ${response?.status() ?? "nessuna risposta"}`);
    }
    await page.waitForSelector(shot.wait, { visible: true, timeout: 45_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 20_000 }).catch(() => {});
    const png = await page.screenshot({ type: "png", captureBeyondViewport: false });
    const jpg = await sharp(png)
      .jpeg({ quality: 78, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer();
    const outputPath = path.join(outputDir, shot.file);
    await sharp(jpg).toFile(outputPath);
    console.log(`wrote ${path.relative(root, outputPath)} (${Math.round(jpg.length / 1024)} KB)`);
  }
} finally {
  await browser.close();
}
