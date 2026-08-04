import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5193;
const BASE_URL = `http://localhost:${PORT}`;

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
  let out = ""; child.stdout.on("data", (d) => (out += d)); child.stderr.on("data", (d) => (out += d));
  return { child, getOutput: () => out };
}
async function waitForServer(url, t = 40000) { const s = Date.now(); while (Date.now() - s < t) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; }

const { child, getOutput } = startDevServer();
try {
  if (!(await waitForServer(BASE_URL))) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(BASE_URL + "/?fixture=midgame", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // Kampf-Seite → Zone „Pastures" öffnen (wie combat-cards-shot-273)
  await page.locator('[data-guide-id="sidebar.combat"], .sb-item', { hasText: /kampf|combat/i }).first().click();
  await page.waitForTimeout(600);
  const zone = page.locator(".zone-card, .zone-row, button, div", { hasText: /weiden|pastures/i }).first();
  await zone.click();
  await page.waitForTimeout(800);

  const report = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".monster-card")];
    return cards.map((c) => {
      const name = c.querySelector(".monster-card-name, h3, .mc-name")?.textContent?.trim() ?? "?";
      const tl = c.querySelector(".monster-card-tl-stack");
      const badges = c.querySelectorAll(".mc-trait-badge").length;
      const lvl = c.querySelector(".monster-card-level-badge");
      const xp = c.querySelector(".monster-card-xp-badge");
      const r = tl?.getBoundingClientRect();
      return { name, hasTlStack: !!tl, traitBadges: badges, tlRect: r ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}` : null, hasLevelBadge: !!lvl, hasXpBadge: !!xp };
    });
  });
  console.log(JSON.stringify(report, null, 1));
  // Visueller Beweis: die Karte mit den meisten Trait-Badges sauber ins Bild scrollen + croppen.
  const best = report.reduce((a, b, i) => (report[a].traitBadges >= b.traitBadges ? a : i), 0);
  const card = page.locator(".monster-card").nth(best);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900); // lazy images
  await card.screenshot({ path: join(__dirname, "..", "..", "..", "badge-proof.png").replace(/\\/g, "/"), timeout: 8000 }).catch(async () => {});
  await card.screenshot({ path: "C:/Users/MSchu/AppData/Local/Temp/claude/G--GameDev/553d2095-3a73-4795-9782-0fe746a25f13/scratchpad/badge-proof.png" });
  console.log("badge-proof.png gespeichert (Karte: " + report[best].name + ")");
  await browser.close();
} finally { child.kill(); }
