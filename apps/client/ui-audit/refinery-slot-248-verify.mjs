#!/usr/bin/env node
/**
 * Mikro-Smoke (Fix-Verifikation): `.nh-grid > .nh-card.is-refinery` in styles/newhaven.css wurde
 * gerade von einem 218px- auf einen 248px-Boden für Zeile 5 (Aktionszone, `minmax(248px, 1fr)`) +
 * analog erhöhter Kartenhöhe angehoben, weil die Sperr-Grund-Zeile ".nh-blocked" ("Capacity 4/4 —
 * expanding Town Hall makes room.") auf Veredelungskarten (Smelter/Smokehouse) bei 1920x1080/
 * 4-Spalten-Grid abgeschnitten/unsichtbar war (Vorgänger-Belege: scratchpad/nh-finalsmoke/
 * 06-smelter-blocked-en.png, 07-smokehouse-blocked-en.png).
 *
 * EIN Prüfpunkt: Fixture nh_empty (leeres Lager) → Zentralhaus I + 4 weitere Nicht-Veredelungs-
 * Gebäude per Dev-Debug (Gratis + Sofort-Fertig) bauen → Kapazität 4/4 voll → Listen-Ansicht →
 * Smelter-/Smokehouse-Karten (bleiben unbebaut, zeigen also die Sperr-Zeile) + Trading-Post als
 * normale Gegenprobe DOM-vermessen: liegt `.nh-blocked` vollständig innerhalb von
 * `.nh-card-action-slot`?
 *
 * Muster (Dev-Server + Playwright, KEIN Electron) 1:1 aus newhaven-audit-335.mjs übernommen.
 * Ändert nichts an Produktionscode. Run: node ui-audit/refinery-slot-248-verify.mjs (from apps/client/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5891;
const BASE_URL = `http://localhost:${PORT}`;
const FIXTURE = "nh_empty";
const VIEWPORT = { width: 1920, height: 1080 };

const findings = [];
function log(section, level, msg) {
  const line = `[${level}] ${section}: ${msg}`;
  console.log(line);
  findings.push({ section, level, msg });
}
const pass = (s, m) => log(s, "PASS", m);
const fail = (s, m) => log(s, "FAIL", m);
const info = (s, m) => log(s, "INFO", m);

async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function startDevServer(port) {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(port), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function openNewHaven(page) {
  const pageErrors = [];
  page.on("pageerror", (e) => { pageErrors.push(e.message); console.log("[page-error]", e.message); });
  page.on("console", (msg) => { if (msg.type() === "error") { pageErrors.push(msg.text()); console.log("[console-error]", msg.text()); } });
  // Ohne gespeicherte Wahl erkennt initialLocale() die OS-/Browsersprache (i18n/index.tsx) — auf
  // diesem Rechner de-DE. Der Auftrag verlangt explizit die ENGLISCHEN Kartentexte (wie die
  // Vorgänger-Belege 06/07-*-blocked-en.png), also hier hart auf "en" erzwingen, bevor die App lädt.
  await page.addInitScript(() => localStorage.setItem("hearthforge:locale", "en"));
  await page.goto(`${BASE_URL}/?fixture=${FIXTURE}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.locator('[data-guide-id="sidebar.newhaven"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".nh-grid, .nh-map", { timeout: 10000 });
  // Direkt in die Listenansicht (2. Tab) — dort lebt .nh-grid/.nh-card.
  await page.locator(".nh-view-tabbar .nh-view-tab").nth(1).click();
  await page.waitForSelector(".nh-grid", { timeout: 5000 });
  await page.waitForTimeout(200);
  return pageErrors;
}

/** Baut per Dev-Debug (Gratis + Sofort-Fertig) die nächste Stufe des per Namen gefundenen Gebäudes. */
async function debugBuildInstant(page, cardNameText) {
  const card = page.locator(".nh-card", { hasText: cardNameText }).first();
  const btn = card.locator(".nh-build-btn");
  await btn.waitFor({ state: "visible", timeout: 5000 });
  const disabled = await btn.evaluate((el) => el.disabled);
  if (disabled) {
    const reason = (await card.locator(".nh-blocked").textContent().catch(() => null))?.trim();
    fail("Setup", `Baubutton für "${cardNameText}" ist deaktiviert (Grund: "${reason}") — Bauversuch abgebrochen.`);
    return false;
  }
  await btn.click({ timeout: 5000 });
  await page.waitForTimeout(150);
  const completeBtn = page.locator(".nh-debug-complete");
  const stillDisabled = await completeBtn.evaluate((el) => el.disabled).catch(() => true);
  if (stillDisabled) {
    fail("Setup", `Nach Klick auf "${cardNameText}" ist kein Bautrupp-Job aktiv (.nh-debug-complete weiterhin deaktiviert).`);
    return false;
  }
  await completeBtn.click({ timeout: 5000 });
  await page.waitForTimeout(200);
  return true;
}

async function main() {
  console.log(`[smoke] starting dev server on port ${PORT}...`);
  const server = startDevServer(PORT);
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const errs = await openNewHaven(page);

    // Debug: Gratis-Kosten aktivieren (Fixture nh_empty hat kein timber_beam/-brace/-anchor im
    // Inventar/Bank — echte Materialkosten wären ohne diesen Schalter nicht erfüllbar).
    await page.click(".nh-debug-toggle");
    await page.waitForTimeout(150);
    const freeActive = await page.locator(".nh-debug-toggle").evaluate((el) => el.classList.contains("active"));
    if (freeActive) pass("Setup", "Debug: Gratis aktiviert.");
    else fail("Setup", "Debug: Gratis-Umschalter griff nicht (Klasse 'active' fehlt).");

    // Zentralhaus ZUERST (Kapazität kommt erst mit ihm) + 4 Nicht-Veredelungs-Gebäude, exakt bis
    // zur Kapazitätsgrenze (Zentralhaus I = +4 Bauplätze). Smelter/Smokehouse/Trading Post bewusst
    // NICHT dabei — die bleiben unbebaut und zeigen dadurch die Sperr-Zeile, die wir prüfen.
    const buildOrder = ["Town Hall", "Watchtower", "Storehouse", "The Scrivener's Tent", "Fisher's Hut"];
    for (const name of buildOrder) {
      const ok = await debugBuildInstant(page, name);
      if (ok) pass("Setup", `"${name}" instant gebaut (Debug: Gratis + Debug: Fertig).`);
      else { console.error(`[smoke] Abbruch: Bau von "${name}" fehlgeschlagen.`); await browser.close(); server.child.kill(); process.exitCode = 1; return; }
    }

    // Jeder Bau-Abschluss löst einen 4s-Toast aus (Toasts.tsx TOAST_MS) — die 5 Bauten stapeln sich
    // sonst genau über der Kartenliste und verdecken (rein visuell, nicht layout-wirksam) die
    // Karten in den folgenden Screenshots. Vor den Prüfungen abklingen lassen.
    await page.waitForFunction(
      () => document.querySelectorAll(".toast-stack .toast").length === 0,
      { timeout: 6000 },
    ).catch(() => info("Setup", "Toasts nach 6s noch nicht abgeklungen — Screenshots evtl. weiterhin überlagert."));

    // Debug: Gratis wieder AUS, bevor die eigentliche Prüfung beginnt — sonst zeigt die gesperrte
    // Aktionszone zusätzlich die Dev-only-Zeile "Debug mode: resources are not consumed."
    // (`nh-debug-free-note`, NewHavenPage.tsx ~709), die ein echter Spieler NIE sieht und die
    // Aktionszone künstlich um eine Zeile verlängert — die Messung soll den echten Spielerzustand
    // treffen (Sperr-Grund "no_slot" bleibt unabhängig vom Schalter, s. campBuildStartReason).
    await page.click(".nh-debug-toggle");
    await page.waitForTimeout(150);
    const freeInactive = await page.locator(".nh-debug-toggle").evaluate((el) => !el.classList.contains("active"));
    if (freeInactive) pass("Setup", "Debug: Gratis vor der Prüfung wieder deaktiviert (echter Spielerzustand für die Sperr-Karten).");
    else fail("Setup", "Debug: Gratis ließ sich vor der Prüfung nicht deaktivieren.");

    const capText = (await page.locator(".nh-capacity").textContent().catch(() => null))?.trim() ?? "";
    info("Setup", `Kapazitätsanzeige nach Setup-Bauten: "${capText}"`);
    if (/4\s*\/\s*4/.test(capText) || (/4/.test(capText) && capText.match(/4/g).length >= 2)) {
      pass("Setup", `Kapazität liest sich als voll ("${capText}").`);
    } else {
      fail("Setup", `Kapazitätsanzeige "${capText}" sieht NICHT nach 4/4 aus — Rest der Prüfung evtl. auf falscher Grundlage.`);
    }

    await page.screenshot({ path: join(__dirname, "refinery-248-list-overview.png") });

    // Kernprüfung: .nh-blocked (Sperr-Grund) vollständig innerhalb von .nh-card-action-slot?
    async function checkCard(cardNameText, expectBlocked) {
      const S = `Karte "${cardNameText}"`;
      const card = page.locator(".nh-card", { hasText: cardNameText }).first();
      const count = await card.count();
      if (count === 0) { fail(S, "Karte nicht gefunden."); return; }
      const isRefinery = await card.evaluate((el) => el.classList.contains("is-refinery"));
      info(S, `is-refinery=${isRefinery}`);

      // WICHTIG: erst scrollen (einmalig), DANN beide Boxen im selben Scroll-Zustand messen —
      // `.screenshot()` scrollt sein Ziel automatisch ins Sichtfeld; würde man das zwischen den
      // beiden boundingBox()-Aufrufen tun, verschieben sich die Y-Koordinaten zwischen den beiden
      // Messungen künstlich (genau dieser Fehler zeigte sich im ersten Lauf dieses Skripts: riesige,
      // scheinbare Überstände, die tatsächlich nur ein Scroll-Versatz zwischen den Messungen waren).
      await card.scrollIntoViewIfNeeded();
      const slot = card.locator(".nh-card-action-slot").first();
      const blocked = card.locator(".nh-blocked").first();
      const blockedCount = await blocked.count();
      const slotBox = await slot.boundingBox();
      const blockedBox0 = blockedCount > 0 ? await blocked.boundingBox() : null;

      const shotName = cardNameText.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      await card.screenshot({ path: join(__dirname, `refinery-248-card-${shotName}.png`) }).catch(() => {});

      if (!expectBlocked) {
        info(S, `Erwartung: kein Sperr-Text nötig (gebaute Karte) — blockedCount=${blockedCount}.`);
        return;
      }
      if (blockedCount === 0) {
        fail(S, `Kein ".nh-blocked"-Element gefunden, obwohl die Karte unbebaut bei voller Kapazität sein sollte (Setup evtl. fehlgeschlagen).`);
        return;
      }
      const blockedText = (await blocked.textContent())?.trim() ?? "";
      const blockedBox = blockedBox0;
      if (!slotBox || !blockedBox) {
        fail(S, "Bounding-Box von .nh-card-action-slot oder .nh-blocked fehlt (nicht sichtbar/gerendert).");
        return;
      }
      const slotBottom = slotBox.y + slotBox.height;
      const blockedBottom = blockedBox.y + blockedBox.height;
      const margin = slotBottom - blockedBottom; // >=0 heißt: blocked-Unterkante liegt VOR (über) der Slot-Unterkante.
      const insideTop = blockedBox.y >= slotBox.y - 0.5;
      const insideLeftRight = blockedBox.x >= slotBox.x - 0.5 && (blockedBox.x + blockedBox.width) <= (slotBox.x + slotBox.width + 0.5);
      const fullyInside = insideTop && insideLeftRight && margin >= -0.5;

      info(S, `Sperr-Text: "${blockedText}"`);
      info(S, `slot y=${slotBox.y.toFixed(1)}..${slotBottom.toFixed(1)} (h=${slotBox.height.toFixed(1)}) | blocked y=${blockedBox.y.toFixed(1)}..${blockedBottom.toFixed(1)} (h=${blockedBox.height.toFixed(1)}) | Rand blocked-Unterkante zu slot-Unterkante = ${margin.toFixed(1)}px`);

      if (fullyInside) {
        pass(S, `.nh-blocked liegt vollständig innerhalb von .nh-card-action-slot (Marge ${margin.toFixed(1)}px zur Unterkante).`);
      } else {
        fail(S, `.nh-blocked ragt aus .nh-card-action-slot heraus (insideTop=${insideTop}, insideLeftRight=${insideLeftRight}, margin=${margin.toFixed(1)}px) — Sperr-Zeile vermutlich abgeschnitten/unsichtbar.`);
      }
      if (!/capacity 4\s*\/\s*4/i.test(blockedText)) {
        info(S, `Sperr-Text enthält nicht das erwartete Muster "Capacity 4/4" — evtl. anderer Sperr-Grund als geplant.`);
      }
    }

    await checkCard("The Smelter", true);
    await checkCard("The Smokehouse", true);
    await checkCard("The Trading Post", true); // Gegenprobe: normale (nicht is-refinery) Karte, sollte schon vorher korrekt gewesen sein.

    if (errs.length > 0) fail("Konsole", `Browser-Konsolenfehler während des Laufs: ${errs.slice(0, 5).join(" | ")}`);
    await page.close();
  } finally {
    await browser.close();
    server.child.kill();
  }

  const failCount = findings.filter((f) => f.level === "FAIL").length;
  const passCount = findings.filter((f) => f.level === "PASS").length;
  console.log(`\n[smoke] done. PASS=${passCount} FAIL=${failCount} INFO=${findings.filter((f) => f.level === "INFO").length}`);
  console.log(failCount > 0 ? "\n=== VERDICT: FAIL ===" : "\n=== VERDICT: PASS ===");
  if (failCount > 0) {
    for (const f of findings.filter((x) => x.level === "FAIL")) console.log(`  - [${f.section}] ${f.msg}`);
  }
  process.exitCode = failCount > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error("[smoke] fatal:", err);
  process.exitCode = 1;
});
