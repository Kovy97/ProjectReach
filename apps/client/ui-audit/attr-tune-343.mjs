// Task #343: Attribut-Karten — Font-Size-Kandidaten für .cs-attr-card-name durchprobieren
// (injizierter Style-Override, keine Quelländerung), um den kleinsten sicheren Wert zu finden,
// der bei 1920x1080 (der engste Fall: card=108x48) JEDES 12-Zeichen-Wort (Constitution/
// Konstitution/Телосложение/Constituição/Intelligence) einzeilig hält.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5252;
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

const LOCALES = ["de", "en", "ru", "pt-BR", "es", "fr", "zh"];
const CANDIDATES = [
  `.cs-col-left .cs-attr-card-name { font-size: clamp(9px, 9cqi, 22px) !important; letter-spacing: 0.1px !important; }`,
  `.cs-col-left .cs-attr-card-name { font-size: clamp(9px, 8.5cqi, 22px) !important; letter-spacing: 0.1px !important; }`,
  `.cs-col-left .cs-attr-card-name { font-size: clamp(9px, 8cqi, 22px) !important; letter-spacing: 0.1px !important; }`,
];

async function measure(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".cs-attr-card")];
    return cards.map((card) => {
      const nameEl = card.querySelector(".cs-attr-card-name");
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
      };
    });
  });
}

try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  for (let ci = 0; ci < CANDIDATES.length; ci++) {
    console.log(`\n\n########## CANDIDATE ${ci}: ${CANDIDATES[ci]}`);
    let allOk = true;
    for (const vp of [{ w: 1920, h: 1080 }, { w: 3440, h: 1440 }]) {
      for (const locale of LOCALES) {
        const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
        await page.addInitScript((loc) => {
          localStorage.setItem("hearthforge:locale", loc);
        }, locale);
        await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
        await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
        await page.waitForTimeout(1000);
        await page.locator('[data-guide-id="topbar.character"]').first().click();
        await page.waitForTimeout(300);
        await page.addStyleTag({ content: CANDIDATES[ci] });
        await page.waitForTimeout(100);
        const rows = await measure(page);
        const wraps = rows.filter((r) => r.lines > 1);
        if (wraps.length) {
          allOk = false;
          console.log(`  ${locale}@${vp.w}x${vp.h}: WRAP ${wraps.map((w) => `"${w.text}"(${w.nameFontPx}px)`).join(", ")}`);
        } else {
          console.log(`  ${locale}@${vp.w}x${vp.h}: ok (font=${rows[0].nameFontPx}px)`);
        }
        await page.close();
      }
    }
    console.log(allOk ? "=> ALL OK" : "=> HAS WRAPS");
  }
  await browser.close();
} finally {
  child.kill();
}
