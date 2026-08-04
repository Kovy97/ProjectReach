// Task #343: Attribut-Karten-Wortumbruch messen ("STRENGT H" etc). Reine Mess-/Diagnose-Hilfe,
// kein Screenshot — prüft je Sprache/Auflösung, ob .cs-attr-card-name auf einer Zeile bleibt
// (getClientRects().length auf dem Textknoten > 1 => umgebrochen).
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5251;
const BASE = `http://localhost:${PORT}`;

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(
  process.execPath,
  [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
  { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
);
const up = async () => {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
};

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "3440x1440", width: 3440, height: 1440 },
];
const LOCALES = ["de", "en", "ru", "pt-BR"];

async function measure(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".cs-attr-card")];
    return cards.map((card) => {
      const nameEl = card.querySelector(".cs-attr-card-name");
      const valEl = card.querySelector(".cs-attr-card-val");
      const cardRect = card.getBoundingClientRect();
      const nameRange = document.createRange();
      nameRange.selectNodeContents(nameEl);
      const lines = nameRange.getClientRects().length;
      return {
        text: nameEl.textContent,
        cardW: Math.round(cardRect.width),
        cardH: Math.round(cardRect.height),
        nameFontPx: Math.round(parseFloat(getComputedStyle(nameEl).fontSize) * 100) / 100,
        lines,
        nameScrollH: nameEl.scrollHeight,
        nameClientH: nameEl.clientHeight,
        cardScrollH: card.scrollHeight,
        cardClientH: card.clientHeight,
        valText: valEl.textContent,
      };
    });
  });
}

try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  for (const locale of LOCALES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.addInitScript((loc) => {
        localStorage.setItem("hearthforge:locale", loc);
      }, locale);
      await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(1500);
      await page.locator('[data-guide-id="topbar.character"]').first().click();
      await page.waitForTimeout(400);
      const rows = await measure(page);
      console.log(`\n=== ${locale} @ ${vp.name} ===`);
      for (const r of rows) {
        const flag = r.lines > 1 ? "WRAP" : "ok";
        console.log(
          `${flag.padEnd(4)} "${r.text}" font=${r.nameFontPx}px card=${r.cardW}x${r.cardH} lines=${r.lines}`,
        );
      }
      await page.close();
    }
  }
  await browser.close();
} finally {
  child.kill();
}
