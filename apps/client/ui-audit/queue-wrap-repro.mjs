/**
 * Spieler-Report 1.0.2 (Aldric, 67 h): "Could you please look at the text wrapping and font in
 * the queue? In some resolutions it is unreadable." Der Screenshot zeigt Namen, die
 * BUCHSTABENWEISE umbrechen, ein Zeichen je Zeile.
 *
 * Mit der Standard-Fixture reproduziert es sich nicht: dort steht nur die aktive Aktion in der
 * Leiste, und ihr Name hat 164 px Platz. Der Spieler hat dagegen eine gefuellte WARTESCHLANGE,
 * und deren Zeilen tragen zusaetzlich Mengen-Label und Sortierknoepfe. Genau das wird hier
 * nachgebaut, mit den laengsten Aktionsnamen des Spiels.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5387;
const BASE_URL = `http://localhost:${PORT}`;
const OUT = join(CLIENT_DIR, "ui-audit", "shots-queue");
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

// Die laengsten Aktionsnamen des Katalogs, plus ein unendliches Ziel ("ALL" im Label),
// weil der Spieler-Screenshot genau das zeigt.
const WARTESCHLANGE = [
  { kind: "action", actionId: "cook_witherleek_sharpshooters_pie", target: null },
  { kind: "action", actionId: "tan_dragonhide_scales", target: null },
  { kind: "action", actionId: "forge_blacksteel_towershield", target: 25 },
  { kind: "action", actionId: "cook_witherleek_bouillabaisse", target: null },
  { kind: "action", actionId: "forge_adamantium_towershield", target: 50 },
];

const { child, getOutput } = startDevServer();
try {
  if (!(await waitForServer(BASE_URL))) {
    console.error("Server kam nicht hoch:\n" + getOutput());
    process.exit(1);
  }
  const browser = await chromium.launch();
  for (const [b, h] of [[1920, 1080], [1600, 900], [1366, 768]]) {
    const page = await browser.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      localStorage.setItem("gr.updateNotice.suppress", "1");
      localStorage.setItem("gr.queuePanelCollapsed", "0");
    });
    await page.route("**/ui-audit-fixtures/midgame.json", async (route) => {
      const res = await route.fetch();
      const json = JSON.parse(await res.text());
      const s = json.state;
      s.onboarding = s.onboarding ?? {};
      s.onboarding.done = true;
      s.onboarding.active = false;
      s.actionQueue = WARTESCHLANGE;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
    });
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="topbar."]', { timeout: 20000 });
    await page.waitForTimeout(3200);
    await page.keyboard.press("Escape");

    const mess = await page.evaluate(() => {
      const raus = [];
      for (const n of document.querySelectorAll(".queue-row-name")) {
        const r = n.getBoundingClientRect();
        const bereich = document.createRange();
        bereich.selectNodeContents(n);
        raus.push({
          text: (n.textContent || "").trim().slice(0, 26),
          breite: Math.round(r.width),
          zeilen: bereich.getClientRects().length,
          px: Math.round(parseFloat(getComputedStyle(n).fontSize)),
        });
      }
      const zeile = document.querySelector(".queue-row:not(.queue-row--active)");
      if (zeile) {
        const knoepfe = zeile.querySelectorAll(".queue-row-btn");
        const sichtbar = [...knoepfe].filter(b => b.getBoundingClientRect().width > 2).length;
        const zr = zeile.getBoundingClientRect();
        const b0 = knoepfe[0] ? knoepfe[0].getBoundingClientRect() : null;
        const t = zeile.querySelector(".queue-row-target");
        raus.push({ text: "ZEILE " + Math.round(zr.top) + "-" + Math.round(zr.bottom) + " | Knopf1 " + (b0 ? Math.round(b0.top)+","+Math.round(b0.left)+" "+Math.round(b0.width)+"x"+Math.round(b0.height) : "-") + " | Menge " + (t ? Math.round(t.getBoundingClientRect().top) : "-"), breite: knoepfe.length, zeilen: sichtbar, px: Math.round(zr.height) });
      }
      return raus;
    });
    console.log(`\n${b}x${h}:`);
    for (const m of mess) {
      const warn = m.zeilen >= 3 ? "  <-- bricht stark" : "";
      console.log(`   ${String(m.breite).padStart(4)}px  ${m.zeilen} Zeilen  ${m.px}px  ${m.text}${warn}`);
    }
    const panel = await page.$(".queue-panel");
    if (panel) await panel.screenshot({ path: join(OUT, `queue-${b}x${h}.png`) });
    await page.close();
  }
  await browser.close();
} finally {
  child.kill();
}
console.log("\nBilder:", OUT);
