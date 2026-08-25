/**
 * Beleg-Aufnahmen + Nachrechnung fuer die Warteschlangen-Level-Projektion (Chef-Auftrag
 * 25.08.2026, "×256 → welches Level am Ende dieser Action"): jede Warteschlangen-Zeile mit
 * endlichem Ziel zeigt "[Skill-Icon] Von → Bis" unter Menge/Dauer, ebenso die aktive Zeile.
 *
 * Prueft je Aufloesung (1920x1080 UND 1366x768):
 *   - genau die erwartete Anzahl `.queue-row-level`-Zeilen ist sichtbar (aktive Zeile + 3
 *     Warteschlangen-Zeilen, alle mit endlichem Ziel und tatsaechlicher Level-Aenderung)
 *   - die angezeigten Von/Bis-Zahlen stimmen mit einer UNABHAENGIGEN Nachrechnung ueberein:
 *     `levelFromXp(startXp)` / `levelFromXp(startXp + n * effectiveActionXpGain(...))`, wobei
 *     `effectiveActionXpGain` NUR die vier bereits exportierten Engine-Faktoren komponiert
 *     (s. util/queueLevels.ts-Kopfkommentar) — die Kumulierung selbst (welcher Eintrag mit
 *     welchem Start-XP rechnet) wird HIER, unabhaengig von `computeQueueLevels`, von Hand
 *     nachvollzogen, damit dieser Check nicht nur gegen sich selbst prueft.
 *   - Skill-Icons sind echte <img>, kein Emoji-Fallback (die Test-Skills mining/woodcutting
 *     haben beide ein Sidebar-Icon).
 *
 * Fuellung: die bereits aktive Aktion der Fixture (`mine_gravesteel`, Mining) bekommt ein
 * endliches Rest-Ziel; die Warteschlange bekommt EINEN Mining-Eintrag (anderer Skill als... nein,
 * DERSELBE Skill wie die aktive Aktion — testet die Verkettung ueber die Aktiv/Queue-Grenze
 * hinweg) und ZWEI Woodcutting-Eintraege (testet sowohl eine einzelne Level-Grenze als auch die
 * Verkettung zweier Eintraege DESSELBEN Skills, s. Aufgaben-Vorgabe Punkt 9). Alle vier Ziele sind
 * bewusst groß gewaehlt, damit Level-Grenzen sicher fallen, unabhaengig vom exakten
 * Fixture-Startlevel.
 */
import { content } from "@hearthforge/content";
import { levelFromXp } from "@hearthforge/engine";
import { effectiveActionXpGain } from "../src/renderer/util/queueLevels.ts";
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5395, fixture: "midgame", locale: "de" });
const { page } = h;
const problems = [];

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // ── Warteschlange fuellen ────────────────────────────────────────────────────────────────────
  const fillResult = await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.activeActionId = "mine_gravesteel"; // Mining, bereits in der Fixture aktiv
    s.actionProgressMs = 0;
    s.actionTarget = 700; // endliches Rest-Ziel statt der Fixture-∞-Vorgabe
    s.actionQueue = [
      { kind: "action", actionId: "mine_copper", target: 600 }, // Mining — verkettet mit der aktiven Aktion
      { kind: "action", actionId: "cut_normal_tree", target: 800 }, // Woodcutting — eine Level-Grenze
      { kind: "action", actionId: "cut_normal_tree", target: 6000 }, // Woodcutting — verkettet mit dem vorigen
    ];
    return {
      startXp: { mining: s.skills.mining?.xp ?? 0, woodcutting: s.skills.woodcutting?.xp ?? 0 },
    };
  });
  await page.waitForTimeout(600);

  // Panel ggf. aufklappen (Default-Zustand kann kollabiert sein).
  const panel = page.locator(".queue-panel");
  if (await panel.evaluate((el) => el.classList.contains("queue-panel--collapsed"))) {
    await page.locator(".queue-panel-toggle").click();
    await page.waitForTimeout(400);
  }

  // ── Unabhaengige Nachrechnung (Node-Seite, GENAU EINMAL ausgefuehrt — beide Aufloesungen lesen
  //    dasselbe `state.actionQueue`, die Zahlen aendern sich zwischen den Viewport-Wechseln nicht,
  //    da keine echte Spielzeit vergeht). `effectiveActionXpGain` ist die einzige wiederverwendete
  //    Engine-Komposition (bereits unit-getestet, queueLevels.test.ts) — die KETTE (wer startet bei
  //    welchem XP-Stand) wird hier eigenstaendig nachgebaut, nicht von `computeQueueLevels` uebernommen.
  // Nur der State kommt aus der Seite — `content` importiert dieses Skript direkt (dieselbe
  // statische Katalog-Instanz, die auch die App laedt), damit `effectiveActionXpGain` ALLE Felder
  // sieht, die es braucht (u.a. `content.items` fuer buffGatherXpMult) statt eines unvollstaendigen
  // Stubs.
  const state = await page.evaluate(() => window.__hfDebug.state);
  const nowMs = Date.now();
  const gainGravesteel = effectiveActionXpGain(state, content, content.actions.mine_gravesteel, nowMs);
  const gainCopper = effectiveActionXpGain(state, content, content.actions.mine_copper, nowMs);
  const gainTree = effectiveActionXpGain(state, content, content.actions.cut_normal_tree, nowMs);

  const miningXp0 = fillResult.startXp.mining;
  const miningXp1 = miningXp0 + gainGravesteel * 700; // nach der aktiven Aktion
  const miningXp2 = miningXp1 + gainCopper * 600; // nach dem Mining-Warteschlangen-Eintrag
  const woodXp0 = fillResult.startXp.woodcutting;
  const woodXp1 = woodXp0 + gainTree * 800; // nach dem 1. Woodcutting-Eintrag
  const woodXp2 = woodXp1 + gainTree * 6000; // nach dem 2. Woodcutting-Eintrag

  const expected = [
    { label: "aktive Zeile (mine_gravesteel)", from: levelFromXp(miningXp0), to: levelFromXp(miningXp1) },
    { label: "Warteschlange #1 (mine_copper)", from: levelFromXp(miningXp1), to: levelFromXp(miningXp2) },
    { label: "Warteschlange #2 (cut_normal_tree)", from: levelFromXp(woodXp0), to: levelFromXp(woodXp1) },
    { label: "Warteschlange #3 (cut_normal_tree)", from: levelFromXp(woodXp1), to: levelFromXp(woodXp2) },
  ];
  for (const e of expected) {
    console.log(`BEFUND erwartet ${e.label}: ${e.from} -> ${e.to}${e.from === e.to ? " (KEINE Zeile erwartet)" : ""}`);
  }

  const runs = [
    { vw: 1920, vh: 1080 },
    { vw: 1366, vh: 768 },
  ];

  for (const { vw, vh } of runs) {
    await page.setViewportSize({ width: vw, height: vh });
    await page.waitForTimeout(300);
    if (await panel.evaluate((el) => el.classList.contains("queue-panel--collapsed"))) {
      await page.locator(".queue-panel-toggle").click();
      await page.waitForTimeout(400);
    }

    const levelRowTexts = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".queue-row-level"));
      return rows.map((row) => ({
        hasImg: !!row.querySelector(".queue-row-level-icon"),
        hasEmoji: !!row.querySelector(".queue-row-level-icon-emoji"),
        from: row.querySelector(".queue-row-level-from")?.textContent ?? null,
        to: row.querySelector(".queue-row-level-to")?.textContent ?? null,
        text: row.textContent,
      }));
    });
    console.log(`BEFUND [${vw}x${vh}] .queue-row-level-Zeilen:`, JSON.stringify(levelRowTexts));

    const expectedVisible = expected.filter((e) => e.from !== e.to);
    if (levelRowTexts.length !== expectedVisible.length) {
      problems.push(
        `[${vw}x${vh}] erwartete ${expectedVisible.length} sichtbare Level-Zeilen, gefunden ${levelRowTexts.length}`,
      );
    } else {
      for (let i = 0; i < expectedVisible.length; i++) {
        const exp = expectedVisible[i];
        const got = levelRowTexts[i];
        if (!got) continue;
        if (got.from !== String(exp.from) || got.to !== String(exp.to)) {
          problems.push(`[${vw}x${vh}] ${exp.label}: erwartet ${exp.from} -> ${exp.to}, angezeigt ${got.from} -> ${got.to}`);
        }
        if (!got.hasImg && !got.hasEmoji) {
          problems.push(`[${vw}x${vh}] ${exp.label}: weder Icon noch Emoji-Fallback gerendert`);
        }
        if (got.hasEmoji) {
          problems.push(`[${vw}x${vh}] ${exp.label}: Emoji-Fallback statt echtem Skill-Icon (mining/woodcutting sollten eins haben)`);
        }
      }
    }

    await page.screenshot({ path: `ui-audit/shots-queue-levels/panel-${vw}x${vh}.png` });
    // Nahaufnahme der Liste fuer die visuelle Pruefung (Umbruch/Typo).
    const list = page.locator(".queue-panel-body");
    if (await list.count()) {
      await list.screenshot({ path: `ui-audit/shots-queue-levels/panel-body-${vw}x${vh}.png` });
    }
  }

  console.log("PAGE ERRORS:", h.errors.length);
  if (h.errors.length) console.log(h.errors.join("\n"));

  if (problems.length) {
    console.log("PROBLEME:\n" + problems.map((p) => "- " + p).join("\n"));
  } else {
    console.log("ALLE MESSUNGEN OK.");
  }
} finally {
  await h.stop();
}
