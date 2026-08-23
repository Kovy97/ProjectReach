// Kontrolle des 1.0.1-Release-Kandidaten im GEPACKTEN Build — bewusst NUR im Hauptmenue:
// es wird KEIN Spielstand geladen (das wuerde Offline-Fortschritt buchen und den Speicherstand
// des Chefs anfassen). Geprueft werden Version, die reparierte "Zuletzt gespielt"-Zeile und
// der Ueberschreiben-Dialog (der Klick wird abgebrochen, nichts wird ueberschrieben).
import { _electron } from "@playwright/test";
import fs from "node:fs";

const EXE = "G:\\GameDev\\apps\\client\\release\\win-unpacked\\Grim Reach.exe";
const OUT = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\rc-101\\";
fs.mkdirSync(OUT, { recursive: true });

const app = await _electron.launch({ executablePath: EXE, args: ["--use-gl=angle", "--use-angle=d3d11"] });
const page = await app.firstWindow();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(9000);
await page.screenshot({ path: OUT + "01-mainmenu.png" });

const menuText = await page.evaluate(() => document.body.innerText);
const ergebnis = {
  version: /1\.0\.1/.test(menuText) ? "1.0.1" : (/1\.0\.0/.test(menuText) ? "1.0.0 — NICHT GEHOBEN" : "nicht gefunden"),
  earlyAccessReste: /Early Access|EA-0\.1/i.test(menuText),
};

// "Neues Spiel" oeffnen: dort stehen die Slots mit der reparierten Zweitzeile.
const neu = page.locator("button, [role=button]").filter({ hasText: /New Game|Neues Spiel/i }).first();
if (await neu.count()) { await neu.click(); await page.waitForTimeout(2000); }
await page.screenshot({ path: OUT + "02-slots.png" });

ergebnis.slotZeilen = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".menu-slot-sub")).map((el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return {
      text: (el.textContent || "").trim(),
      zeilen: r.getClientRects().length,
      abgeschnitten: el.scrollWidth - el.clientWidth > 1 || el.scrollHeight - el.clientHeight > 1,
    };
  }),
);

// Ueberschreiben-Dialog: erscheint er IM Fenster? Danach sofort abbrechen.
const belegt = page.locator(".menu-slot").filter({ hasText: /Lv|Level/i }).first();
if (await belegt.count()) {
  const btn = belegt.locator("button").first();
  if (await btn.count()) { await btn.click().catch(() => {}); await page.waitForTimeout(1200); }
}
ergebnis.ueberschreibDialog = await page.evaluate(() => {
  const m = document.querySelector(".quit-confirm-modal");
  return m ? { sichtbar: true, amBody: m.parentElement?.parentElement === document.body, text: m.textContent.trim().slice(0, 100) } : { sichtbar: false };
});
await page.screenshot({ path: OUT + "03-confirm.png" });
const abbrechen = page.locator(".quit-confirm-modal button").first();
if (await abbrechen.count()) { await abbrechen.click().catch(() => {}); await page.waitForTimeout(700); }
ergebnis.dialogGeschlossen = await page.evaluate(() => !document.querySelector(".quit-confirm-modal"));

ergebnis.fehler = errors.slice(0, 6);
ergebnis.fehlerzahl = errors.length;
console.log(JSON.stringify(ergebnis, null, 2));
await app.close();
