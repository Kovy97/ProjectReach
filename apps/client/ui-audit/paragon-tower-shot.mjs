#!/usr/bin/env node
/**
 * Paragonturm P2-UI self-check (dungeon-rework-spec §7, CEO-GO Paragon-Turm P2).
 *
 * Robustheit zuerst: `content.paragon` (Pool) und die `content.dungeons`-Def mit
 * `id: "paragon_tower"` fehlen im REALEN Content-Katalog aktuell noch (content-dev hat bereits
 * das Schlüssel-Item `paragon_key` + die 5 Turm-Monster (iron_revenant/frost_hexer/
 * charred_doomknight/roc_void/void_titan) angelegt, aber die Pool-/Dungeon-Def-Verdrahtung steht
 * noch aus — geprüft per grep vor diesem Lauf). Szenario 0 beweist deshalb zuerst die
 * Ausblend-Robustheit gegen den ECHTEN (unvollständigen) Content.
 *
 * Für die restigen Szenarien wird per `window.__hfDebug.content` (derselbe live Objekt-Zeiger wie
 * `@hearthforge/content`, s. GameContext.tsx) EINE Laufzeit-Fixture injiziert — kein
 * packages/content-Edit, nur ein In-Memory-Patch im Playwright-Prozess, gebaut ausschließlich aus
 * bereits real existierenden Content-Ids (paragon_key + die 5 Turm-Monster) exakt nach der
 * ParagonContent/DungeonDef-Shape aus shared/index.ts. Danach läuft alles über die ECHTEN
 * Engine-Verben (startParagonFloor per echtem Button-Klick, onParagonFloorCleared per echtem
 * Tick-Kill) — kein UI-Fake.
 *
 * Port 5230 (Task-Vorgabe).
 * Run: node paragon-tower-shot.mjs
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const AUDIT_DIR = __dirname;
const PORT = 5230;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad";

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(AUDIT_DIR, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function clickWithReloadRetry(page, locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await page.waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

async function newGamePage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(`${BASE_URL}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 5000 });
  return { page, errors };
}

async function goToCombat(page) {
  await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.combat"]').first());
  await page.waitForSelector(".combat-page", { timeout: 10000 });
}

/**
 * Injiziert eine minimale, aber SHAPE-KORREKTE ParagonContent+DungeonDef-Fixture in den live
 * Content-Katalog des Browser-Prozesses — nur für diesen Screenshot-Lauf, kein Datei-Edit.
 * Nutzt ausschließlich bereits real vorhandene Ids (paragon_key-Item, die 5 Turm-Monster).
 */
async function installSyntheticParagonContent(page) {
  await page.evaluate(() => {
    const { content } = window.__hfDebug;
    if (!content.paragon) {
      content.paragon = {
        pool: ["iron_revenant", "frost_hexer"],
        bossPool: ["charred_doomknight", "void_titan", "roc_void"],
        chest: [{ minFloor: 1, loot: [{ itemId: "paragon_key", chance: 0, min: 0, max: 0 }] }],
      };
    }
    if (!content.dungeons.some((d) => d.id === "paragon_tower")) {
      content.dungeons.push({
        id: "paragon_tower",
        name: { en: "The Paragon Tower", de: "Der Paragonturm" },
        zone: "highlands",
        requiredLevel: 99,
        keyItem: "paragon_key",
        keysPerRun: 1,
        encounters: [],
        loot: [],
        xp: 0,
        gold: 0,
      });
    }
  });
}

async function run(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.log(`!! ${label} FAILED: ${e.message}\n${e.stack ?? ""}`);
  }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ── 0a) Ist-Stand: der ECHTE Content-Katalog (Kontrolle, kein Patch) ───────────────────────────
  await run("paragon-content-status", async () => {
    const { page, errors } = await newGamePage(browser);
    const domProof = await page.evaluate(() => ({
      contentHasParagonPool: !!window.__hfDebug.content.paragon,
      contentHasDungeonDef: window.__hfDebug.content.dungeons.some((d) => d.id === "paragon_tower"),
    }));
    console.log(`[content-status] ${JSON.stringify(domProof)} — real content-dev landing state at run time`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 0b) Robustheit: Pool/Dungeon-Def künstlich ENTFERNT (deterministischer Beweis, unabhängig
  //        vom content-dev-Landungsstand zum Laufzeitpunkt) → Sektion muss komplett ausblenden ────
  await run("paragon-section-hidden", async () => {
    const { page, errors } = await newGamePage(browser);
    await page.evaluate(() => {
      const { content } = window.__hfDebug;
      delete content.paragon;
      content.dungeons = content.dungeons.filter((d) => d.id !== "paragon_tower");
    });
    await goToCombat(page);
    await page.waitForTimeout(300);
    const domProof = await page.evaluate(() => ({
      contentHasParagonPool: !!window.__hfDebug.content.paragon,
      contentHasDungeonDef: window.__hfDebug.content.dungeons.some((d) => d.id === "paragon_tower"),
      sectionHeadingPresent: [...document.querySelectorAll(".block-heading")].some((h) => h.textContent.includes("🗼")),
      lockedCardPresent: !!document.querySelector(".paragon-card"),
      panelPresent: !!document.querySelector(".paragon-panel"),
    }));
    await page.locator(".dungeon-heading", { hasText: "Dungeons" }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(OUT_DIR, "paragon-00-section-hidden.png") });
    console.log("SHOT SAVED: paragon-00-section-hidden.png");
    console.log(`[section-hidden] ${JSON.stringify(domProof)} (expect all Present/HasX = false, contentHas* = false)`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 1) Gesperrte Turm-Karte (Muster Dungeon-Karten v2) ─────────────────────────────────────────
  await run("paragon-locked", async () => {
    const { page, errors } = await newGamePage(browser);
    await installSyntheticParagonContent(page);
    await goToCombat(page);
    await page.locator(".paragon-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "paragon-01-locked.png") });
    console.log("SHOT SAVED: paragon-01-locked.png");
    const domProof = await page.evaluate(() => ({
      lockedCard: !!document.querySelector(".paragon-card.dungeon-locked"),
      panelAbsent: !document.querySelector(".paragon-panel"),
      hintText: document.querySelector(".paragon-card .dungeon-locked-hint")?.textContent?.trim(),
      cardTitle: document.querySelector(".paragon-card .zone-card-name")?.textContent?.trim(),
    }));
    console.log(`[locked] ${JSON.stringify(domProof)}`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 2) Entsperrtes Panel: Etage 7 / Rekord 23 / Vorschau ───────────────────────────────────────
  await run("paragon-panel", async () => {
    const { page, errors } = await newGamePage(browser);
    await installSyntheticParagonContent(page);
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.dungeonsUnlocked = { ...(state.dungeonsUnlocked ?? {}), paragon_tower: true };
      state.paragon = { checkpoint: 6, best: 23 }; // currentFloor = 7
    });
    await goToCombat(page);
    // Toasts.tsx diffed den State-Sprung dieses direkten `state.paragon`-Patches (kein echter
    // Etagen-Clear) gegen den Erstladungs-Snapshot (best 0) als "neuer Rekord" — Test-Artefakt der
    // direkten State-Injektion, kein Produktivverhalten (im echten Spiel steigt `best` immer nur
    // +1 je echtem Clear). 9s Wartezeit lässt den 8s-Jackpot-Toast + evtl. Unlock-Achievements
    // vollständig abklingen, bevor der Panel-Screenshot sauber ist.
    await page.waitForTimeout(9000);
    await page.locator(".paragon-panel").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "paragon-02-panel.png") });
    console.log("SHOT SAVED: paragon-02-panel.png");
    const domProof = await page.evaluate(() => ({
      floorText: document.querySelector(".paragon-floor-display")?.textContent,
      bestText: document.querySelector(".paragon-best-display")?.textContent,
      previewName: document.querySelector(".paragon-preview-card .monster-card-name")?.textContent,
      previewIsBoss: !!document.querySelector(".paragon-preview-card.paragon-preview-boss"),
      startBtnLabel: document.querySelector(".paragon-start-btn")?.textContent,
      startBtnDisabled: document.querySelector(".paragon-start-btn")?.disabled,
    }));
    console.log(`[panel] ${JSON.stringify(domProof)} (expect floor=7 boss=false, since 7%5!=0)`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 3) Kampf mit Etagen-Badge — nicht-Boss-Etage 7 via echtem Button-Klick ─────────────────────
  await run("paragon-combat-badge-plain", async () => {
    const { page, errors } = await newGamePage(browser);
    await installSyntheticParagonContent(page);
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.dungeonsUnlocked = { ...(state.dungeonsUnlocked ?? {}), paragon_tower: true };
      state.paragon = { checkpoint: 6, best: 23 }; // currentFloor = 7 (kein Boss)
    });
    await goToCombat(page);
    await page.waitForTimeout(9000); // spurious record-toast des direkten State-Patches abklingen lassen (s.o.)
    await clickWithReloadRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForSelector(".paragon-battle-badge", { timeout: 10000 });
    // Der Wechsel MonsterSelect→Battle behält die alte Scroll-Position (die Panel-Ansicht war
    // gescrollt) — die Badge sitzt oben im neuen Battle-Layout, ohne Reset landet sie außerhalb
    // des Viewports (negative rect.y, per diag verifiziert). Vor jedem Kampf-Screenshot resetten.
    await page.locator(".paragon-battle-badge").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "paragon-03-combat-badge-floor7.png") });
    console.log("SHOT SAVED: paragon-03-combat-badge-floor7.png");
    const domProof = await page.evaluate(() => ({
      badgeText: document.querySelector(".paragon-battle-badge .dungeon-progress-name")?.textContent,
      hasBossTag: !!document.querySelector(".paragon-battle-badge .paragon-boss-tag"),
      combatParagonFloor: window.__hfDebug.state.combat.paragonFloor,
    }));
    console.log(`[combat-badge-floor7] ${JSON.stringify(domProof)} (expect hasBossTag=false)`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 3b) Kampf mit Etagen-Badge — Boss-Etage 5 ("Paragonetage 5 · Boss") ────────────────────────
  await run("paragon-combat-badge-boss", async () => {
    const { page, errors } = await newGamePage(browser);
    await installSyntheticParagonContent(page);
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.dungeonsUnlocked = { ...(state.dungeonsUnlocked ?? {}), paragon_tower: true };
      state.paragon = { checkpoint: 4, best: 23 }; // currentFloor = 5 (Boss-Etage, PARAGON_BOSS_INTERVAL=5)
    });
    await goToCombat(page);
    await page.waitForTimeout(9000);
    await clickWithReloadRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForSelector(".paragon-battle-badge .paragon-boss-tag", { timeout: 10000 });
    await page.locator(".paragon-battle-badge").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT_DIR, "paragon-03b-combat-badge-floor5-boss.png") });
    console.log("SHOT SAVED: paragon-03b-combat-badge-floor5-boss.png");
    const domProof = await page.evaluate(() => ({
      badgeText: document.querySelector(".paragon-battle-badge .dungeon-progress-name")?.textContent,
      bossTagText: document.querySelector(".paragon-battle-badge .paragon-boss-tag")?.textContent,
    }));
    console.log(`[combat-badge-floor5-boss] ${JSON.stringify(domProof)}`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 4) Clear-Moment (kompakter Toast, KEIN neuer Rekord: best 23 bleibt über checkpoint 7) ─────
  await run("paragon-clear-toast", async () => {
    const { page, errors } = await newGamePage(browser);
    await installSyntheticParagonContent(page);
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.dungeonsUnlocked = { ...(state.dungeonsUnlocked ?? {}), paragon_tower: true };
      state.paragon = { checkpoint: 6, best: 23 }; // currentFloor = 7
    });
    await goToCombat(page);
    await page.waitForTimeout(9000); // spurious record-toast des direkten State-Patches abklingen lassen
    await clickWithReloadRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForSelector(".paragon-battle-badge", { timeout: 10000 });
    await page.locator(".paragon-battle-badge").scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.__hfDebug.state.combat.enemyHp = 1; }); // stirbt am nächsten echten Treffer
    await page.waitForFunction(
      () => [...document.querySelectorAll(".toast-detail")].some((el) => el.textContent?.includes("bezwungen")),
      null,
      { timeout: 15000 },
    );
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(OUT_DIR, "paragon-04-clear-toast.png") });
    console.log("SHOT SAVED: paragon-04-clear-toast.png");
    const domProof = await page.evaluate(() => ({
      allToasts: [...document.querySelectorAll(".toast")].map((el) => ({
        cls: el.className,
        title: el.querySelector(".toast-title")?.textContent,
        detail: el.querySelector(".toast-detail")?.textContent,
      })),
      paragonCheckpoint: window.__hfDebug.state.paragon.checkpoint,
      paragonBest: window.__hfDebug.state.paragon.best,
    }));
    console.log(`[clear-toast] ${JSON.stringify(domProof)} (expect checkpoint=7 best=23, one toast detail = "Etage 7 bezwungen…")`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 5) Rekord-Moment (goldener Jackpot-Toast): checkpoint 22→23 schlägt den alten Rekord 22 ────
  await run("paragon-record-toast", async () => {
    const { page, errors } = await newGamePage(browser);
    await installSyntheticParagonContent(page);
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.dungeonsUnlocked = { ...(state.dungeonsUnlocked ?? {}), paragon_tower: true };
      state.paragon = { checkpoint: 22, best: 22 }; // currentFloor = 23, bereits am Rekord
    });
    await goToCombat(page);
    // Der direkte `state.paragon`-Patch (0→22) selbst sieht für Toasts.tsx wie ein Rekord aus
    // (Test-Artefakt, s. Kommentar oben) — 9s abklingen lassen, damit NUR der echte Etage-23-Clear
    // gleich den sauberen "23"-Rekord-Toast auslöst (sonst zeigt der Screenshot fälschlich "22").
    await page.waitForTimeout(9000);
    await clickWithReloadRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForSelector(".paragon-battle-badge", { timeout: 10000 });
    await page.locator(".paragon-battle-badge").scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.__hfDebug.state.combat.enemyHp = 1; });
    await page.waitForFunction(
      () => [...document.querySelectorAll(".toast-rare-legendary .toast-detail")].some((el) => el.textContent?.includes("23")),
      null,
      { timeout: 15000 },
    );
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(OUT_DIR, "paragon-05-record-toast.png") });
    console.log("SHOT SAVED: paragon-05-record-toast.png");
    const domProof = await page.evaluate(() => ({
      toastTitle: document.querySelector(".toast-rare-legendary .toast-title")?.textContent,
      toastDetail: document.querySelector(".toast-rare-legendary .toast-detail")?.textContent,
      paragonCheckpoint: window.__hfDebug.state.paragon.checkpoint,
      paragonBest: window.__hfDebug.state.paragon.best,
    }));
    console.log(`[record-toast] ${JSON.stringify(domProof)} (expect checkpoint=23 best=23, detail contains "23")`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 6) Statistik-Seite: „Höchste Paragonetage" nur wenn best > 0 ──────────────────────────────
  await run("paragon-stats-line", async () => {
    const { page, errors } = await newGamePage(browser);
    // Bewusst KEIN installSyntheticParagonContent hier — die Stats-Zeile hängt nur an
    // `state.paragon.best`, nicht am Content-Katalog (zusätzlicher Robustheits-Datenpunkt).
    await page.evaluate(() => { window.__hfDebug.state.paragon = { checkpoint: 5, best: 17 }; });
    await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.stats"]').first());
    await page.waitForSelector(".stx-page", { timeout: 10000 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "paragon-06-stats-line.png") });
    console.log("SHOT SAVED: paragon-06-stats-line.png");
    const domProof = await page.evaluate(() => {
      const labels = [...document.querySelectorAll(".stx-medallion-label")].map((el) => el.textContent);
      const values = [...document.querySelectorAll(".stx-medallion-value")].map((el) => el.textContent);
      return { labels, values };
    });
    console.log(`[stats-line] ${JSON.stringify(domProof)} (expect a label/value pair for 17)`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 6b) Statistik-Seite ohne Turm-Fortschritt: Zeile bleibt weg (best === 0) ───────────────────
  await run("paragon-stats-line-hidden", async () => {
    const { page, errors } = await newGamePage(browser);
    await clickWithReloadRetry(page, page.locator('[data-guide-id="sidebar.stats"]').first());
    await page.waitForSelector(".stx-page", { timeout: 10000 });
    await page.waitForTimeout(200);
    const domProof = await page.evaluate(() => {
      const labels = [...document.querySelectorAll(".stx-medallion-label")].map((el) => el.textContent);
      return { labels, paragonBest: window.__hfDebug.state.paragon?.best };
    });
    console.log(`[stats-line-hidden] ${JSON.stringify(domProof)} (expect no paragon label, paragonBest=0)`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  // ── 7) Bonus — Tod-Flow: bestehender Death-Popup + die neue Zusatz-Zeile "Zurück auf Etage 1"
  //        (nicht in der 6er-Pflichtliste, aber billig & prüft ein universelles Chrome-Bauteil) ────
  await run("paragon-death-popup", async () => {
    const { page, errors } = await newGamePage(browser);
    await installSyntheticParagonContent(page);
    await page.evaluate(() => {
      const { state } = window.__hfDebug;
      state.dungeonsUnlocked = { ...(state.dungeonsUnlocked ?? {}), paragon_tower: true };
      state.paragon = { checkpoint: 14, best: 20 }; // currentFloor = 15
    });
    await goToCombat(page);
    await page.waitForTimeout(9000);
    await clickWithReloadRetry(page, page.locator(".paragon-start-btn").first());
    await page.waitForSelector(".paragon-battle-badge", { timeout: 10000 });
    // Echter Tod-Pfad (kein Engine-Bypass): hp=1, dann auf den nächsten ECHTEN Gegner-Treffer warten
    // (der reguläre onPlayerDefeated-Check läuft nach der Schadens-Anwendung, nicht auf einem
    // beliebigen Tick — ein direktes hp=0 ohne nachfolgendes Schadens-Event feuert ihn u.U. nie).
    await page.evaluate(() => { window.__hfDebug.state.character.hp = 1; });
    await page.waitForSelector(".death-modal", { timeout: 20000 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, "paragon-07-death-popup.png") });
    console.log("SHOT SAVED: paragon-07-death-popup.png");
    const domProof = await page.evaluate(() => ({
      title: document.querySelector(".death-modal-title")?.textContent,
      paragonHint: document.querySelector(".death-modal-paragon-hint")?.textContent,
      paragonCheckpointAfter: window.__hfDebug.state.paragon.checkpoint,
      paragonBestAfter: window.__hfDebug.state.paragon.best,
    }));
    console.log(`[death-popup] ${JSON.stringify(domProof)} (expect checkpointAfter=0, bestAfter=20 unverändert, paragonHint present)`);
    console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 10).join("\n") : "no page errors");
    await page.close();
  });

  await browser.close();
} finally {
  child.kill();
}
