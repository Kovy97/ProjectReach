import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5239;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";
const fixturePath = join(__dirname, "fixtures", "midgame.json");
const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "ignore", "ignore"] });
try {
  const s = Date.now();
  while (Date.now() - s < 40000) { try { const r = await fetch(`http://localhost:${PORT}`); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 3 });
  // Fixture-Patch: aktiver Kampf mit Debuffs auf beiden Seiten
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  await page.route("**/ui-audit-fixtures/midgame.json", (route) => {
    const f = JSON.parse(JSON.stringify(fixture));
    // Bestehenden Kampf des Fixtures nur ergänzen (komplettes Ersetzen macht ihn ungültig)
    f.state.combat.monsterId = "goblin_warchief";
    f.state.combat.enemyHp = 187;
    f.state.combat.playerEffects = [{ type: "poison", remainingMs: 90000, magnitude: 1 }];
    f.state.combat.enemyEffects = [
      { type: "bleed", remainingMs: 90000, magnitude: 2 },
      { type: "burn", remainingMs: 90000, magnitude: 2 },
    ];
    route.fulfill({ json: f });
  });
  await page.goto(`http://localhost:${PORT}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(3500);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForTimeout(1500);
  const found = await page.waitForSelector(".fighter-effects-overlay", { timeout: 8000 }).catch(() => null);
  if (!found) { console.log("KEINE effect-overlays sichtbar"); }
  else {
    const dump = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".fighter-effects-overlay .effect-badge")).map((b) => ({
        html: b.innerHTML.slice(0, 220),
      })),
    );
    console.log(JSON.stringify(dump, null, 1));
    await page.locator(".fighter-effects-overlay").first().screenshot({ path: join(OUT_DIR, "effectchip-zoom.png") });
    console.log("SHOT SAVED: effectchip-zoom.png");
  }
  await browser.close();
} finally { child.kill(); }
