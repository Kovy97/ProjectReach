// Task #343: Stats-Tab-Umordnung — Screenshot-Vergleichs-Skript (Variante B: 1-spaltig,
// dann Variante A: gepaartes 2-Spalten-Grid — Dateiname trägt "$SUFFIX" env var, damit beide
// Läufe nicht dieselben PNGs überschreiben). Muster aus char-tabs-340-shot.mjs übernommen.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5253;
const BASE = `http://localhost:${PORT}`;
const SUFFIX = process.env.SUFFIX || "variant";

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
// endgame-Fixture: mehr Zeilen (Block+Ward gleichzeitig? nein, s. Rüstungs-Trinität) — trotzdem
// eher "voll ausgestattet" als midgame, gut fürs Stresstest-Auge.
const FIXTURES = ["midgame", "endgame"];

try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  for (const fixture of FIXTURES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`${BASE}/?fixture=${fixture}`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.locator('[data-guide-id="topbar.character"]').first().click();
      await page.waitForTimeout(500);
      await page.locator("#cs-tab-stats").click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(__dirname, `stats-tab-343-${SUFFIX}-${fixture}-${vp.name}.png`) });
      await page.close();
    }
  }
  await browser.close();
  console.log("done");
} finally {
  child.kill();
}
