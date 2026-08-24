import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { EDITORIAL_TOPICS } from "../src/lib/integrated-editorial.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseUrl = new URL(process.env.DVNS_BASE_URL ?? "http://127.0.0.1:3000");
const reviewDirectory = path.join(root, ".impeccable", "review");
const BROWSER_CLOSE_TIMEOUT_MS = 5_000;

async function closeBrowser(browser) {
  let timeout;
  try {
    await Promise.race([
      browser.close(),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Timeout durante la chiusura di Chromium.")),
          BROWSER_CLOSE_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    const browserProcess = browser.process();
    if (browserProcess && !browserProcess.killed) browserProcess.kill("SIGKILL");
    console.warn(error instanceof Error ? error.message : String(error));
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function executable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    (() => {
      try { return puppeteer.executablePath(); } catch { return undefined; }
    })(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  return candidates
    .filter((candidate) => typeof candidate === "string" && candidate.length > 0)
    .find((candidate) => existsSync(candidate));
}

async function inspectRoute(browser, pathname, title, width) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  try {
    await page.setViewport({
      width,
      height: width <= 390 ? 844 : 900,
      deviceScaleFactor: 1,
      hasTouch: width <= 390,
      isMobile: width <= 390,
    });
    const response = await page.goto(new URL(pathname, baseUrl).toString(), {
      waitUntil: "networkidle0",
      timeout: 45_000,
    });
    assert.ok(
      response && [200, 304].includes(response.status()),
      `${pathname} ${width}px: HTTP inatteso ${response?.status() ?? "assente"}`,
    );
    const state = await page.evaluate(() => {
      const root = document.documentElement;
      const h1s = [...document.querySelectorAll("h1")];
      const dataLink = [...document.querySelectorAll("a")].some((link) =>
        /Vedi tutte le righe|Dati e fonti|registro completo/i.test(link.textContent ?? ""),
      );
      const limits = [...document.querySelectorAll("h2")].some((heading) =>
        /non dimostra|limiti/i.test(heading.textContent ?? ""),
      );
      return {
        bodyWidth: document.body.scrollWidth,
        clientWidth: root.clientWidth,
        h1: h1s[0]?.textContent?.trim(),
        h1Count: h1s.length,
        dataLink,
        limits,
      };
    });
    assert.equal(state.h1Count, 1, `${pathname} ${width}px: serve un solo h1`);
    assert.equal(state.h1, title, `${pathname} ${width}px: titolo inatteso`);
    assert.ok(state.bodyWidth <= state.clientWidth + 1, `${pathname} ${width}px: overflow globale`);
    assert.equal(state.dataLink, true, `${pathname} ${width}px: drill-down dati assente`);
    assert.equal(state.limits, true, `${pathname} ${width}px: confine probatorio assente`);
    assert.deepEqual(errors, [], `${pathname} ${width}px: errori browser`);
  } finally {
    await page.close();
  }
}

async function captureHub(browser, pathname, width, outputName) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height: width <= 390 ? 844 : 900, deviceScaleFactor: 1 });
    await page.goto(new URL(pathname, baseUrl).toString(), { waitUntil: "networkidle0", timeout: 45_000 });
    await page.screenshot({ path: path.join(reviewDirectory, outputName), fullPage: true });
  } finally {
    await page.close();
  }
}

assert.ok(["http:", "https:"].includes(baseUrl.protocol), "DVNS_BASE_URL non valido");
mkdirSync(reviewDirectory, { recursive: true });

const browser = await puppeteer.launch({
  args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-setuid-sandbox"],
  executablePath: executable(),
  headless: true,
  timeout: 60_000,
});

try {
  for (const width of [390, 1280]) {
    for (const topic of EDITORIAL_TOPICS) {
      await inspectRoute(browser, `/${topic.section}/${topic.slug}`, topic.title, width);
    }
  }
  await captureHub(browser, "/appalti/dettaglio", 1280, "desktop.png");
  await captureHub(browser, "/appalti/dettaglio", 390, "mobile.png");
  process.stdout.write(`${JSON.stringify({ ok: true, routes: EDITORIAL_TOPICS.length, viewports: [390, 1280] })}\n`);
} finally {
  await closeBrowser(browser);
}
