// Echter Electron-Schreibtest fuer den Prompt-Extractor (CEO 28.08.2026): startet die gebaute App
// mit GR_EXPORT_DIR, laedt den letzten Spielstand, klickt "Charakter exportieren" und prueft die Dateien.
import { _electron as electron } from "@playwright/test";
import { readdirSync, statSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = "C:/Users/MSchu/AppData/Local/Temp/claude/G--GameDev/553d2095-3a73-4795-9782-0fe746a25f13/scratchpad/export-smoke";
mkdirSync(OUT, { recursive: true });
const shot = async (page, name) => page.screenshot({ path: join(OUT, name) }).catch(() => {});

const app = await electron.launch({ args: ["."], cwd: "G:/GameDev/apps/client", env: { ...process.env, GR_EXPORT_DIR: OUT } });
const page = await app.firstWindow();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
try {
  const cont = page.getByRole("button", { name: /fortsetzen|continue/i }).first();
  await cont.waitFor({ state: "visible", timeout: 40000 });
  await shot(page, "01-start.png");
  await cont.click(); console.log("click Continue");
  await page.getByRole("button", { name: /^charakter$|^character$/i }).first().waitFor({ state: "visible", timeout: 40000 });
  await page.waitForTimeout(1500);
  await shot(page, "03-ingame.png");
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  // Update-Hinweis / Modals wegklicken, falls vorhanden
  for (const sel of [".modal-overlay button.btn-iron", ".modal-overlay .modal-close", "button:has-text('Weiter')", "button:has-text('Verstanden')"]) {
    const b = page.locator(sel);
    if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(400); }
  }
  const nav = page.getByRole("button", { name: /^charakter$|^character$/i });
  if (await nav.count()) await nav.first().click(); else await page.locator("text=/^CHARAKTER$/i").first().click();
  await page.waitForTimeout(1500);
  await shot(page, "04-charsheet.png");
  const btn = page.getByRole("button", { name: /charakter exportieren|export character/i });
  console.log("export button count", await btn.count());
  await btn.first().click();
  await page.waitForTimeout(5000);
  await shot(page, "05-after-export.png");
  const walk = (d, depth = 0) => { for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); console.log("  ".repeat(depth) + f + (s.isDirectory() ? "/" : ` ${s.size} B`)); if (s.isDirectory()) walk(p, depth + 1); } };
  console.log("EXPORT DIR:"); walk(OUT);
} finally {
  await app.close().catch(() => {});
}
