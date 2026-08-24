/**
 * Die New-Haven-Listenkarten am Bild pruefen — der urspruengliche Chef-Fund
 * ("Bilder nicht zentriert und viel zu klein").
 *
 * Warum ein eigenes Skript: Die Standard-Fixture hat KEIN Gebaeude gebaut, also gibt es dort
 * gar keine Listenkarten. Der Fix (CAMP_CARD_FIT) lag deshalb ungeprueft im Repo — die
 * Vergleichslaeufe zeigten nur die leere Lichtung. Hier werden Gebaeude in allen drei Stufen
 * gesetzt, damit die Spannweite sichtbar wird, gegen die eine pauschale Zahl nie stimmen konnte.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5374;
const BASE_URL = `http://localhost:${PORT}`;
const OUT = join(CLIENT_DIR, "ui-audit", "shots-newhaven");
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
    try { const r = await fetch(url); if (r.ok) return true; } catch { /* noch nicht */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

// Absichtlich gemischte Stufen: townhall ist das grosse Motiv (Massstab 1,6),
// fence_tent und trophy_wall die kleinsten (3,26 bzw. 3,15) — genau die Spannweite,
// an der eine pauschale Zahl scheitern muss.
const GEBAEUDE = {
  camp_townhall: 3,
  camp_fence_tent: 1,
  camp_trophy_wall: 1,
  camp_watchtower: 2,
  camp_storehouse: 1,
  camp_fishing_hut: 1,
  camp_sawpit: 2,
  camp_smelter: 3,
};

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
      s.camp = s.camp ?? {};
      s.camp.buildings = GEBAEUDE;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
    });
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 20000 });
    await page.waitForTimeout(3500);
    await page.keyboard.press("Escape");

    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForTimeout(1200);
    // In die Listenansicht wechseln (Standard ist die Karte)
    // Der Reiter heisst .nh-view-tab (Einzahl), nicht .nh-view-tabs — der zweite ist die Liste.
    const listBtn = page.locator(".nh-view-tab").nth(1);
    await listBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT, `voll-${b}x${h}.png`) });

    const mess = await page.evaluate(() => {
      const raus = [];
      for (const art of document.querySelectorAll(".nh-card .nh-art")) {
        const img = art.querySelector("img");
        if (!img) continue;
        const ar = art.getBoundingClientRect();
        const st = getComputedStyle(img);
        raus.push({
          rahmen: `${Math.round(ar.width)}x${Math.round(ar.height)}`,
          scale: st.transform === "none" ? "-" : st.transform.split("(")[1]?.split(",")[0],
          origin: st.transformOrigin,
        });
      }
      return raus;
    });
    console.log(`${b}x${h}: ${mess.length} Karten`);
    for (const m of mess.slice(0, 6)) console.log("   ", JSON.stringify(m));
    await page.close();
  }
  await browser.close();
} finally {
  child.kill();
}
console.log("Bilder:", OUT);
