/**
 * Aufnahme der Varianten-Uebersicht (Chef 24.08.: "schlecht lesbar und verstaendlich").
 *
 * Baut absichtlich eine REICHE Auswahl: verschiedene Affixe, verschiedene Stufen, mit und ohne
 * Suffix, verschiedene Item-Level. Mit zwei schlichten Varianten sieht jedes Modal gut aus —
 * das Problem zeigt sich erst, wenn die Liste das leistet, wofuer sie da ist.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5356;
const BASE_URL = `http://localhost:${PORT}`;
const OUT = join(CLIENT_DIR, "ui-audit", "shots-pouch");
mkdirSync(OUT, { recursive: true });

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch { /* noch nicht da */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const VARIANTEN = [
  { instanceId: "v1", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_keen", tier: 1 }] },
  { instanceId: "v2", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_flame", tier: 3 }] },
  { instanceId: "v3", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_frost", tier: 2 }, { affixId: "affix_swift", tier: 1 }] },
  { instanceId: "v4", baseItemId: "rusty_sword", affixes: [], suffix: { suffixId: "suffix_bear", ilvl: 30, roll: 0.82 } },
  { instanceId: "v5", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_shock", tier: 2 }], suffix: { suffixId: "suffix_wolf", ilvl: 45, roll: 0.41 } },
  { instanceId: "v6", baseItemId: "rusty_sword", affixes: [{ affixId: "affix_precise", tier: 1 }], suffix: { suffixId: "suffix_tiger", ilvl: 60, roll: 0.95 } },
];

const { child, getOutput } = startDevServer();
try {
  if (!(await waitForServer(BASE_URL))) {
    console.error("Server kam nicht hoch:\n" + getOutput());
    process.exit(1);
  }
  const browser = await chromium.launch();
  for (const [b, h] of [[1920, 1080], [1600, 900]]) {
    const page = await browser.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: 1 });
    await page.addInitScript(() => localStorage.setItem("gr.updateNotice.suppress", "1"));
    await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
      const res = await route.fetch();
      const json = JSON.parse(await res.text());
      const s = json.state;
      s.onboarding = s.onboarding ?? {};
      s.onboarding.done = true;
      s.onboarding.active = false;
      s.inventory.instances = VARIANTEN;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
    });
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 20000 });
    await page.waitForTimeout(3500);
    await page.keyboard.press("Escape");

    // Zellen tragen keine item-id im DOM; identifiziert wird ueber die Bildquelle
    // (Muster aus sweep2-t6-pouch-equip-withdraw.mjs).
    const zelle = page
      .locator(".cs-inv-grid .item-cell")
      .filter({ has: page.locator('img[src*="rusty_sword"]') })
      .first();
    if ((await zelle.count()) === 0) {
      console.log(`${b}x${h}: Container-Zelle nicht gefunden`);
      await page.screenshot({ path: join(OUT, `fehlschlag-${b}.png`) });
      continue;
    }
    await zelle.click();
    await page.waitForTimeout(700);
    const modal = await page.$(".pouch-modal");
    if (!modal) {
      console.log(`${b}x${h}: Modal nicht offen`);
      await page.screenshot({ path: join(OUT, `fehlschlag2-${b}.png`) });
      continue;
    }
    await page.screenshot({ path: join(OUT, `voll-${b}x${h}.png`) });
    await modal.screenshot({ path: join(OUT, `modal-${b}x${h}.png`) });
    console.log(`${b}x${h}: aufgenommen`);
    await page.close();
  }
  await browser.close();
} finally {
  child.kill();
}
console.log("Bilder:", OUT);
