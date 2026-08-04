#!/usr/bin/env node
/**
 * Tester-Sweep 2, T7 "Der Kämpfer" — Punkte 3-7 (Port 5256).
 * Regen außerhalb/innerhalb des Kampfes, Auto-Trank+Dauer-Tonikum (HEUTE gefixt), Auto-Eat+Tod+
 * Dungeon-Abbruch, Loadout/Mana/Buffs/Debuffs/Pet, Kill-Rewards. State-Patch-Muster wie juice-check.mjs.
 *
 * Fixture-Hygiene: `state.onboarding.toursSeen` wird für alle Szenarien vorbelegt (combat/shop/bank),
 * sonst blockt der Bereichs-Erst-Tour-Spotlight jede Navigation nach dem ersten Kampf-Seitenbesuch
 * (pointer-events:none auf allem außer dem aktuellen Tour-Ziel) — realistisch für einen etablierten
 * Midgame-Charakter, kein Produktbug.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5256;
const BASE_URL = `http://localhost:${PORT}`;

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
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
async function routeFixture(page, fixtureName, mutator) {
  await page.route(`**/ui-audit-fixtures/${fixtureName}.json`, async (route) => {
    const res = await route.fetch();
    const json = JSON.parse(await res.text());
    json.state.onboarding = { ...(json.state.onboarding ?? {}), active: false, toursSeen: { combat: true, shop: true, bank: true } };
    mutator(json.state);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(json) });
  });
}

const errors = [];
const problems = [];
function wirePage(page, tag) {
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] console: ${m.text()}`); });
}

async function openCombat(browser, tag, { fixture = "midgame", patch, seedVolume = 0.6 } = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  wirePage(page, tag);
  await page.addInitScript((seed) => localStorage.setItem("hf.audio.volume", String(seed)), seedVolume);
  await routeFixture(page, fixture, (state) => { patch?.(state); });
  await page.goto(`${BASE_URL}/?fixture=${fixture}`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 8000 });
  await page.waitForSelector(".battle-arena", { timeout: 10000 });
  return page;
}

async function hpText(page, side) {
  return page.evaluate((s) => document.querySelector(`.arena-side-${s} .cbar-hp .cbar-label`)?.textContent ?? null, side);
}
function parseHp(text) {
  if (!text) return null;
  const m = text.replace(/ /g, " ").match(/([\d.,]+)\s*\/\s*([\d.,]+)/);
  return m ? { cur: Number(m[1].replace(/[,.]/g, "")), max: Number(m[2].replace(/[,.]/g, "")) } : null;
}
async function foodQty(page, sectionClass) {
  return page.evaluate((sel) => {
    const el = document.querySelector(`${sel} .cl-food-current .cl-food-qty`);
    return el ? Number(el.textContent) : null;
  }, sectionClass);
}
/** Entfernt ALLE Stacks von `itemId` (Slots + bagSlots) und legt GENAU EINEN sauberen Stack mit
 *  `qty` in Slot 0 an — sonst verfälscht ein bereits im Fixture vorhandener Stack (z.B. das
 *  Default-Food) die itemCount-Summe, die CombatFoodAutoEat/CombatAutoPotion anzeigen. */
function setSingleStack(state, itemId, qty) {
  for (const arr of [state.inventory.slots, state.inventory.bagSlots]) {
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i]?.itemId === itemId) arr[i] = null;
    }
  }
  state.inventory.slots[0] = { itemId, qty };
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();

  // ══ Punkt 3: Out-of-Combat-Regen (1%/s), NICHT im Kampf ═══════════════════════════════════
  // 3a) Außerhalb des Kampfes: HP steigt sichtbar.
  {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    wirePage(page, "3a");
    await routeFixture(page, "midgame", (state) => {
      state.combat.monsterId = null;
      state.character.food = null;
      state.character.autoPotion = { healPotionId: null, healThreshold: 0.4, autoRebuffTonics: false };
      state.character.buffs = [];
      state.character.hp = 40; // sicher unter dem midgame-maxHp (~106 lt. Fixture), keine Klemmung auf voll
    });
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.locator('[data-guide-id="topbar.character"]').first().click({ timeout: 8000 });
    await page.waitForSelector(".vital.hp .vital-values", { timeout: 8000 });
    // maxHp jetzt aus der UI lesen und HP exakt auf 50% davon setzen (Fixture kannte maxHp nicht vorab).
    const read = async () => {
      const t = await page.locator(".vital.hp .vital-values").textContent();
      const m = t.replace(/ /g, " ").match(/([\d.,]+)\s*\/\s*([\d.,]+)/);
      return { cur: Number(m[1].replace(/[,.]/g, "")), max: Number(m[2].replace(/[,.]/g, "")) };
    };
    const hp0 = await read();
    await page.waitForTimeout(3000);
    const hp1 = await read();
    const expectedDelta = hp0.max * 0.01 * 3;
    console.log(`3a: hp0=${hp0.cur}/${hp0.max}, hp1=${hp1.cur}/${hp1.max} nach 3s (erwartet +~${expectedDelta.toFixed(1)})`);
    if (hp1.cur <= hp0.cur) problems.push(`(3a) HP stieg NICHT außerhalb des Kampfes (${hp0.cur} → ${hp1.cur} in 3s) — Out-of-Combat-Regen fehlt`);
    else if (hp1.cur > hp1.max) problems.push(`(3a) HP überschritt maxHp (${hp1.cur} > ${hp1.max})`);
    await page.close();
  }

  // 3b) Im Kampf: KEIN passiver Regen (nur ggf. Schaden, niemals ein stetiges Ansteigen ohne Quelle).
  {
    const page = await openCombat(browser, "3b", {
      patch: (s) => {
        s.combat.monsterId = "bull_boss";
        s.combat.enemyHp = 500;
        s.character.food = null;
        s.character.autoPotion = { healPotionId: null, healThreshold: 0.4, autoRebuffTonics: false };
        s.character.buffs = [];
      },
    });
    await page.waitForTimeout(600);
    const hp0 = parseHp(await hpText(page, "player"));
    await page.waitForTimeout(2500);
    const hp1 = parseHp(await hpText(page, "player"));
    console.log(`3b: (im Kampf) hp0=${hp0?.cur}, hp1=${hp1?.cur} nach 2.5s (erwartet: KEIN Anstieg ohne Heilquelle)`);
    if (hp0 && hp1 && hp1.cur > hp0.cur) problems.push(`(3b) HP stieg IM KAMPF ohne Heilquelle (${hp0.cur} → ${hp1.cur}) — Out-of-Combat-Regen leakt in den Kampf`);
    await page.close();
  }

  // ══ Punkt 4: Auto-Trank + Dauer-Tonikum (HEUTE gefixt, Drazhan-Fix Welle G) ═══════════════
  // Bekannte Startwerte statt racy Vorher/Nachher-Lesungen: der erste Auto-Trank-Tick feuert
  // potenziell schon binnen 100ms (Cooldown startet bei 0) — noch VOR dem ersten evaluate()-
  // Roundtrip. Ein Einzel-Read gegen die FIXTURE-bekannten Startwerte (qty=5, hp=30) ist robust.
  // 4a) Aktives Dauer-Tonikum (panacea_elixir, category "regeneration") darf den Not-Trank NICHT sperren.
  {
    const page = await openCombat(browser, "4a", {
      patch: (s) => {
        s.combat.monsterId = "bull_boss";
        s.combat.enemyHp = 500;
        s.character.hp = 30; // klar unter der Schwelle (maxHp im Fixture deutlich >100)
        s.character.food = null;
        s.character.autoPotion = { healPotionId: "potion_greater_heal", healThreshold: 0.5, autoRebuffTonics: false };
        s.character.buffs = [{ itemId: "panacea_elixir", remainingMs: 90_000 }];
        setSingleStack(s, "potion_greater_heal", 5);
      },
    });
    await page.waitForTimeout(900); // sicher über 1 Tick (100ms), sicher unter dem 8s-Cooldown
    const qty1 = await foodQty(page, ".cl-section-potion");
    const hp1 = parseHp(await hpText(page, "player"));
    console.log(`4a: potion qty 5(Start) → ${qty1}, hp 30(Start) → ${hp1?.cur} (Dauer-Tonikum aktiv, Trank MUSS trotzdem feuern)`);
    if (qty1 === null) problems.push("(4a) Trank-Bestand nicht ablesbar (Selektor .cl-section-potion .cl-food-qty geändert?)");
    else if (qty1 >= 5) problems.push(`(4a) KRITISCH-VERDACHT: Auto-Trank feuerte NICHT trotz aktivem Dauer-Tonikum + HP unter Schwelle (Bestand blieb bei ${qty1}) — Drazhan-Fix Welle G nicht wirksam im echten Kampf-Loop`);
    else if (!hp1 || hp1.cur <= 32) problems.push(`(4a) Trank-Bestand sank (${qty1}), aber HP stieg nicht sichtbar über den Ausgangswert 30 hinaus (jetzt ${hp1?.cur})`);
    await page.close();
  }

  // 4b) Frischer Heiltrank-HoT (greater_healing_potion, OHNE category) läuft → Auto-Trank NICHT doppelt.
  {
    const page = await openCombat(browser, "4b", {
      patch: (s) => {
        s.combat.monsterId = "bull_boss";
        s.combat.enemyHp = 500;
        s.combat.autoPotionCooldownMs = 0;
        s.character.hp = 30;
        s.character.food = null;
        s.character.autoPotion = { healPotionId: "greater_healing_potion", healThreshold: 0.5, autoRebuffTonics: false };
        // Bewusst großzügige Restlaufzeit (10s statt der echten 3s Draught-Dauer): der erste
        // rAF-Tick-Batch nach Seitenlast kann mehrere 100ms-Engine-Ticks in einem Schub nachholen
        // (accumulatorMs) — ein knapper Timing-Puffer (z.B. 2.5s) macht den Test selbst flaky.
        s.character.buffs = [{ itemId: "greater_healing_potion", remainingMs: 10_000 }]; // "gerade getrunken"
        setSingleStack(s, "greater_healing_potion", 5);
      },
    });
    await page.waitForTimeout(1500); // deutlich < 10s HoT-Restlaufzeit, Cooldown ist bereits 0
    const qty1 = await foodQty(page, ".cl-section-potion");
    console.log(`4b: potion qty 5(Start) → ${qty1} (frischer HoT aktiv, Cooldown frei — Bestand MUSS gleich bleiben)`);
    if (qty1 !== 5) problems.push(`(4b) Chugging-Regression: Auto-Trank trank NACH obwohl der eigene HoT-Buff noch lief (Bestand 5→${qty1})`);
    await page.close();
  }

  // ══ Punkt 5: Auto-Eat (Schwelle/Verbrauch) + Tod bei leerem Food → Death-Flow + Dungeon-Abbruch ══
  // 5a) Auto-Eat verbraucht Food + heilt sichtbar unter der Tier-0-Schwelle (50%).
  {
    const page = await openCombat(browser, "5a", {
      patch: (s) => {
        s.combat.monsterId = "bull_boss";
        s.combat.enemyHp = 500;
        s.character.hp = 30;
        s.character.food = "cake_honey";
        s.character.autoEatTier = 0;
        s.character.autoPotion = { healPotionId: null, healThreshold: 0.4, autoRebuffTonics: false };
        setSingleStack(s, "cake_honey", 5);
      },
    });
    await page.waitForTimeout(900); // sicher über 1 Tick, sicher unter AUTO_EAT_COOLDOWN_MS (4.5s)
    const qty1 = await foodQty(page, ".cl-section-food");
    const hp1 = parseHp(await hpText(page, "player"));
    console.log(`5a: food qty 5(Start) → ${qty1}, hp 30(Start) → ${hp1?.cur}`);
    if (qty1 === null) problems.push("(5a) Food-Bestand nicht ablesbar (Selektor geändert?)");
    else if (qty1 >= 5) problems.push(`(5a) Auto-Eat feuerte NICHT trotz HP unter der 50%-Schwelle (Food-Bestand blieb bei ${qty1})`);
    else if (!hp1 || hp1.cur <= 32) problems.push(`(5a) Food-Bestand sank (${qty1}), aber HP stieg nicht sichtbar über den Ausgangswert 30 hinaus (jetzt ${hp1?.cur})`);
    await page.close();
  }

  // 5b) Leeres Food + niedrige HP im DUNGEON → Tod: Death-Popup, Voll-Heilung, Dungeon-Abbruch, kein Softlock.
  {
    const page = await openCombat(browser, "5b", {
      patch: (s) => {
        s.combat.dungeonId = "crypt_depths";
        s.combat.monsterId = "dg_skeleton_warrior";
        s.combat.encounterIndex = 0;
        s.combat.enemyHp = 9999; // Boss lebt, aber der SPIELER soll sterben (niedrige HP unten)
        s.character.hp = 1;
        s.character.food = null;
        s.character.autoPotion = { healPotionId: null, healThreshold: 0.4, autoRebuffTonics: false };
      },
    });
    const deathModal = page.locator(".death-modal");
    let died = false;
    for (let i = 0; i < 60 && !died; i++) { // bis zu ~9s Echtzeit
      await page.waitForTimeout(150);
      died = (await deathModal.count()) > 0;
    }
    if (!died) {
      problems.push("(5b) kein Todes-Popup binnen ~9s trotz HP=1 + kein Food/Trank im Dungeon (Szenario evtl. wiederholen — Gegner traf nicht rechtzeitig)");
    } else {
      const bodyText = await page.locator(".death-modal-body").textContent();
      const dungeonHint = await page.locator(".death-modal-paragon-hint").count();
      console.log(`5b: Todes-Popup erschien. Body="${bodyText?.trim()}", Dungeon-Hinweis vorhanden=${dungeonHint > 0}`);
      if (dungeonHint === 0) problems.push("(5b) Todes-Popup zeigt KEINEN Dungeon-Abbruch-Hinweis (.death-modal-paragon-hint fehlt) trotz Tod im Dungeon-Lauf");
      await page.locator(".combat-btn", { hasText: /close|schließen/i }).first().click({ timeout: 5000 }).catch(async () => {
        await page.locator(".death-modal .combat-btn").first().click({ timeout: 5000 });
      });
      await page.waitForTimeout(300);
      // Kein Softlock: Seite bleibt bedienbar — Navigation zur Character-Seite muss funktionieren.
      await page.locator('[data-guide-id="topbar.character"]').first().click({ timeout: 5000 });
      const vitalHp = await page.locator(".vital.hp .vital-values").textContent({ timeout: 5000 }).catch(() => null);
      console.log(`5b: nach Tod+Dismiss navigierbar, Vitals="${vitalHp}"`);
      if (vitalHp) {
        const m = vitalHp.replace(/ /g, " ").match(/([\d.,]+)\s*\/\s*([\d.,]+)/);
        if (m && Number(m[1].replace(/[,.]/g, "")) < Number(m[2].replace(/[,.]/g, ""))) {
          problems.push(`(5b) HP nach Tod NICHT voll geheilt (${vitalHp}) — erwartet volle Heilung laut onPlayerDefeated`);
        }
      } else {
        problems.push("(5b) Character-Seite nach Tod+Dismiss nicht erreichbar (Softlock-Verdacht)");
      }
      // Dungeon muss abgebrochen sein: zurück zu Combat darf keine .battle-arena mit laufendem Dungeon-Kampf mehr zeigen.
      await page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 5000 });
      await page.waitForTimeout(500);
      const stillInBattle = await page.locator(".battle-arena").count();
      console.log(`5b: Combat-Seite nach Tod zeigt battle-arena=${stillInBattle > 0} (erwartet: false, da monsterId genullt → Gegner-Auswahl)`);
      if (stillInBattle > 0) problems.push("(5b) Combat-Seite zeigt nach dem Tod weiterhin eine aktive .battle-arena (Dungeon/Kampf nicht sauber beendet)");
    }
    await page.close();
  }

  // ══ Punkt 6: Loadout-Stile (Melee/Ranged/Magie) + Mana-Anzeige, Buff-Chips, Debuff-Ecke, Pet-Ecke ══
  // Hinweis: Munition/Quiver existiert laut Task #286 nicht mehr im Spiel (Fletching/Ammo entfernt) —
  // "Munition-Anzeige" aus dem Testauftrag ist daher kein prüfbares Feature mehr, bewusst ausgelassen.
  {
    const page = await openCombat(browser, "6-melee", {
      patch: (s) => {
        s.combat.monsterId = "bull_boss";
        s.combat.enemyHp = 500;
        s.character.buffs = [{ itemId: "marshroot_chowder", remainingMs: 54_000 }, { itemId: "duskfin_rangers_stew", remainingMs: 72_000 }];
        s.combat.enemyEffects = [{ type: "bleed", remainingMs: 8000, magnitude: 2 }];
        s.character.companionPetId = "rotbark";
        s.character.ownedPets = { rotbark: true };
      },
    });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => ({
      stances: Array.from(document.querySelectorAll(".cl-stances .cl-stance")).map((el) => el.textContent?.trim()),
      manaBar: !!document.querySelector(".arena-side-player .cbar-mana"),
      buffChips: document.querySelectorAll(".arena-side-player .fighter-buff-chips .fighter-buff-chip").length,
      debuffBadges: document.querySelectorAll(".arena-side-enemy .fighter-effects-overlay .effect-badge").length,
      petSprite: !!document.querySelector(".battle-pet-sprite"),
    }));
    console.log(`6-melee: stances=${JSON.stringify(info.stances)}, manaBar=${info.manaBar}, buffChips=${info.buffChips}, debuffBadges=${info.debuffBadges}, petSprite=${info.petSprite}`);
    if (info.stances.length !== 3) problems.push(`(6-melee) erwartet 3 Melee-Stances (Angriff/Wucht/Defensiv), gefunden ${info.stances.length}: ${JSON.stringify(info.stances)}`);
    if (info.buffChips !== 2) problems.push(`(6-melee) erwartet 2 Spieler-Buff-Chips (Fixture-Default-Buffs), gefunden ${info.buffChips}`);
    if (info.debuffBadges !== 1) problems.push(`(6-melee) erwartet 1 Debuff-Badge am Gegner (Bleed), gefunden ${info.debuffBadges}`);
    if (!info.petSprite) problems.push("(6-melee) Pet-Ecke (.battle-pet-sprite) fehlt trotz gesetztem companionPetId");
    await page.close();
  }
  {
    const page = await openCombat(browser, "6-ranged", {
      patch: (s) => {
        s.combat.monsterId = "bull_boss";
        s.combat.enemyHp = 500;
        s.character.equipment.mainhand = "blacksteel_longbow";
        delete s.character.equipment.offhand;
      },
    });
    await page.waitForTimeout(1200);
    const stances = await page.evaluate(() => Array.from(document.querySelectorAll(".cl-stances .cl-stance")).map((el) => el.textContent?.trim()));
    console.log(`6-ranged: stances=${JSON.stringify(stances)}`);
    if (stances.length !== 3) problems.push(`(6-ranged) erwartet 3 Ranged-Stances (Präzise/Schnell/Defensiv), gefunden ${stances.length}: ${JSON.stringify(stances)}`);
    await page.close();
  }
  {
    const page = await openCombat(browser, "6-magic", {
      fixture: "endgame",
      patch: (s) => { s.combat.monsterId = "bull_boss"; s.combat.enemyHp = 700; },
    });
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => ({
      stances: Array.from(document.querySelectorAll(".cl-stances .cl-stance")).map((el) => el.textContent?.trim()),
      manaBar: !!document.querySelector(".arena-side-player .cbar-mana"),
      manaLabel: document.querySelector(".arena-side-player .cbar-mana .cbar-label")?.textContent ?? null,
    }));
    console.log(`6-magic: stances=${JSON.stringify(info.stances)}, manaBar=${info.manaBar}, manaLabel="${info.manaLabel}"`);
    if (info.stances.length !== 2) problems.push(`(6-magic) erwartet 2 Magie-Stances (Offensiv/Defensiv), gefunden ${info.stances.length}: ${JSON.stringify(info.stances)}`);
    if (!info.manaBar) problems.push("(6-magic) Mana-Anzeige (.cbar-mana) fehlt bei Magie-Stil");
    await page.close();
  }

  // ══ Punkt 7: Kill-Rewards — XP/Loot/Slayer/Chronik-Zähler gleichzeitig ═════════════════════
  // bull_boss (xp=76, level 15) statt chicken (xp=2): bei chicken rundet selbst die level-gap-
  // unabhängige Slayer-Pro-Kill-XP (round(monster.xp*0.5)=round(1)=1, aber die reguläre Stil-XP
  // wird beim riesigen Level-Gap eines Midgame-Charakters gegen ein Lv1-Huhn auf 0 gedämpft —
  // beide Zeilen fallen dann durch den `xp>0`-Filter der Kill-Karte und sehen wie ein Bug aus,
  // sind aber nur ein zu trivialer Testgegner. bull_boss (Lv 15) liegt näher am Midgame-Stil-Level
  // (Fixture zeigt Lv ~31) und garantiert Slayer-XP round(76*0.5)=38 > 0.
  {
    const page = await openCombat(browser, "7", {
      patch: (s) => {
        s.combat.monsterId = "bull_boss";
        s.combat.enemyHp = 5;
        s.combat.kills = 0;
        s.slayerTask = { masterId: "brenna_ashwick", monsterId: "bull_boss", isTower: false, required: 5, progress: 0, xpReward: 100, pointReward: 10 };
      },
    });
    let killed = false;
    for (let i = 0; i < 60 && !killed; i++) {
      await page.waitForTimeout(150);
      killed = (await page.locator(".kill-summary-card").count()) > 0;
    }
    if (!killed) {
      problems.push("(7) kein Kill/.kill-summary-card binnen ~9s gegen einen 5-HP-Bullen — Szenario nicht verifizierbar");
    } else {
      await page.waitForTimeout(200); // Karte einmal vollständig rendern lassen
      const info = await page.evaluate(() => ({
        xpRows: Array.from(document.querySelectorAll(".kill-summary-xp-row")).map((el) => el.textContent?.trim()),
        lootItems: document.querySelectorAll(".kill-summary-loot-item").length,
        gold: document.querySelector(".kill-summary-gold")?.textContent ?? null,
        sessionStats: Array.from(document.querySelectorAll(".cl-session-row .cl-session-stat")).map((el) => el.textContent?.trim()),
      }));
      console.log(`7: xpRows=${JSON.stringify(info.xpRows)}, lootItems=${info.lootItems}, gold="${info.gold}", session=${JSON.stringify(info.sessionStats)}`);
      if (info.xpRows.length === 0) problems.push("(7) Kill-Summary zeigt GAR KEINE XP-Zeile (weder Stil- noch Slayer-XP) trotz bull_boss (xp=76) + aktivem Slayer-Task — xpBySkill/Slayer-Vergabe prüfen");
      // UI-Sprache ist DE-lokalisiert ("Monsterjäger" statt "Slayer") — beide Textformen zulassen.
      const hasSlayerXp = info.xpRows.some((r) => /slay|monsterj[äa]ger/i.test(r ?? ""));
      if (!hasSlayerXp) problems.push(`(7) Kill-Summary zeigt keine Slayer-XP-Zeile trotz aktivem, passendem Slayer-Task (xpRows=${JSON.stringify(info.xpRows)}) — Slayer-Fortschritt nicht sichtbar gleichzeitig mit Kill-XP`);
      if (info.lootItems === 0) console.log("7: Hinweis — kein Loot gedroppt (bull_boss-Loot ist alles chance:1, wäre ungewöhnlich, aber nicht sweep-kritisch)");
      // bull_boss.gold=0 im Content (kein Bug) — Gold-Zeile daher bewusst nur protokolliert, nicht geprüft.
      const killsStat = info.sessionStats.find((t) => /\d/.test(t ?? "") && !t.includes("+") && !t.includes("✦"));
      console.log(`7: Session-Kills-Anzeige="${killsStat}"`);
      if (!killsStat || !/1/.test(killsStat)) problems.push(`(7) Session-Tally-Zeile zeigt keinen Kill-Zähler=1 nach dem ersten Kill (gefunden: ${JSON.stringify(info.sessionStats)})`);
    }
    await page.close();
  }

  console.log(problems.length ? "PROBLEME:\n- " + problems.join("\n- ") : "ALLE CHECKS GRÜN");
  console.log(errors.length ? `${errors.length} page errors:\n` + errors.slice(0, 10).join("\n") : "no page errors");
  await browser.close();
  process.exitCode = problems.length || errors.length ? 1 : 0;
} finally {
  child.kill();
}
