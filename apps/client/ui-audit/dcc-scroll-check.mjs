#!/usr/bin/env node
/**
 * C8 verify (Wegwerf — nach dem Lauf löschen): nach der Dungeon-Weihe-Zeremonie muss der primäre
 * Aktions-Button (Weiter/Betreten) bei 1920×1080 OHNE Scrollen vollständig sichtbar sein.
 *
 * Befund (Tester Grete, 2×, REAL-Loot): Button-Oberkante ~1081 px (Warband) bzw. ~1431 px (Thron) —
 * knapp/deutlich unter der 1080er-Falz, Spieler musste nach jeder Zeremonie scrollen.
 * Fix (ui-dev): der Aktions-Button ist jetzt ein `position: sticky` Footer im Zeremonie-Panel
 * (dungeon-clear-ceremony.css `.dcc-footer`) → verankert am sichtbaren unteren Rand, egal wie viel
 * Beute die Karte intern überlaufen lässt.
 *
 * Ansatz: ECHTE Engine-Transition (realer Klick auf „Betreten" → startDungeon → letzte Welle HP=1 →
 * echter onEnemyDefeated → grantDungeonRewards → endDungeon → DungeonClearCeremony), damit AUCH der
 * CombatPage-Scroll-Restore (Welle MM: savedScrollRef → Rücksprung auf die Dungeon-Karte) mitläuft
 * und nicht gebrochen wird. Die Beutetabelle wird VOR dem Kill auf einen WORST-CASE (viele
 * garantierte Rows) gepatcht, damit die Karte garantiert intern überläuft — nur so beweist die
 * Messung, dass der sticky Footer echte Arbeit leistet. Gemessen wird die Button-Bounding-Box per
 * getBoundingClientRect bei scrollTop 0 (= was der Spieler ohne Scrollen sieht).
 *
 * Port 5324 (SIM-AGENT-GUIDE.md registry). Run: node dcc-scroll-check.mjs
 */
import { withHarness } from "./sim-harness.mjs";

const PORT = 5324;
// Heavy-aber-realistisch: 30 Beute-Rows. Genug, dass die Karte bei 1280×800 über 82vh überläuft
// (interner Scroll aktiv → beweist den sticky Footer), aber ≤ 36, damit die Kill-Marker/Gold/XP-
// Einträge NICHT aus dem auf COMBAT_LOG_MAX=40 gedeckelten Log fallen (sonst rekonstruiert die
// Zeremonie Gold/XP als 0 und die Reward-Chips verschwinden — reines Test-Artefakt).
const LOOT_COUNT = 30;
const results = [];

async function ensureInDungeon(h, dungeonId, cardName, shotPrefix) {
  // Unlock (Bestandsschutz-Grant, honoriert von isDungeonUnlocked) → „Betreten" ist aktiv.
  await h.page.evaluate((dgId) => {
    const { state } = window.__hfDebug;
    state.dungeonsUnlocked = state.dungeonsUnlocked || {};
    state.dungeonsUnlocked[dgId] = true;
  }, dungeonId);
  await h.page.waitForTimeout(250);

  const card = h.page.locator(".dungeon-card").filter({ hasText: cardName }).first();
  await card.scrollIntoViewIfNeeded();
  await h.page.waitForTimeout(150);
  const enterBtn = card.locator(".dungeon-enter").first();
  const disabled = await enterBtn.isDisabled().catch(() => true);
  // force:true — der sticky Content-Header kann die frisch gescrollte Karte im Klick-Moment kurz
  // überlappen; uns interessiert der Post-Zeremonie-Zustand, nicht die Klick-Ergonomie dieser Seite.
  await enterBtn.click({ force: true }).catch(() => {});
  await h.page.waitForTimeout(300);
  let inCombat = await h.page.evaluate(() => !!window.__hfDebug?.state?.combat?.dungeonId);
  if (!inCombat) {
    // Fallback (sollte bei aktivem Button nicht nötig sein): Welle 0 direkt seeden.
    await h.page.evaluate((dgId) => {
      const { state, content } = window.__hfDebug;
      const d = content.dungeons.find((x) => x.id === dgId);
      const first = content.monsters[d.encounters[0]];
      state.combat.dungeonId = dgId;
      state.combat.encounterIndex = 0;
      state.combat.monsterId = first.id;
      state.combat.enemyHp = first.maxHp;
      state.combat.enemyWard = first.wardCapacity ?? 0;
      state.combat.kills = 0;
      state.combat.log = [];
      state.combat.stopReason = undefined;
      state.combat.playerTimerMs = 0;
      state.combat.enemyTimerMs = 0;
    }, dungeonId);
    inCombat = true;
  }
  await h.shot(`${shotPrefix}-debug-postenter`);
  await h.page.waitForSelector(".battle", { timeout: 10000 });
  return { disabled };
}

async function testDungeon(h, { dungeonId, cardName, shotPrefix }) {
  const vp = h.page.viewportSize();
  const { disabled } = await ensureInDungeon(h, dungeonId, cardName, shotPrefix);

  // Letzte Welle, HP=1 + WORST-CASE-Beutetabelle → echter Kill vergibt viele Beute-Rows.
  await h.page.evaluate(
    ({ dgId, lootCount }) => {
      const { state, content } = window.__hfDebug;
      const dungeon = content.dungeons.find((d) => d.id === dgId);
      const idx = dungeon.encounters.length - 1;
      const monsterId = dungeon.encounters[idx];
      const itemIds = Object.keys(content.items).slice(0, lootCount);
      dungeon.loot = itemIds.map((itemId) => ({ itemId, chance: 1, min: 1, max: 1 }));
      dungeon.gold = Math.max(dungeon.gold ?? 0, 5000);
      dungeon.xp = Math.max(dungeon.xp ?? 0, 5000);
      state.combat.encounterIndex = idx;
      state.combat.monsterId = monsterId;
      state.combat.enemyHp = 1;
      state.combat.enemyWard = 0;
      state.combat.kills = idx;
      state.combat.enemyEffects = [];
      state.combat.cooldownRemainingMs = undefined;
    },
    { dgId: dungeonId, lootCount: LOOT_COUNT },
  );

  await h.page.waitForSelector(".dcc-card", { timeout: 20000 });
  await h.page.waitForTimeout(950); // dcc-card-in (0.5s, scale-transform) MUSS durch sein, sonst verfälscht die Skalierung getBoundingClientRect

  const m = await h.page.evaluate(() => {
    const btn = document.querySelector(".dcc-next-btn");
    const cardEl = document.querySelector(".dcc-card");
    const footer = document.querySelector(".dcc-footer");
    // Authoritative "wirklich sichtbar ohne Scrollen": Button-Rect im Viewport UND der Button-
    // Mittelpunkt ist tatsächlich der oberste bemalte Knoten dort (fängt ab, wenn der Button in
    // den intern weggescrollten/geklippten Bereich der Karte rutscht — sein Rect kann numerisch im
    // Viewport liegen, aber unter der Overflow-Klippe der Karte hängen = unsichtbar).
    const probe = () => {
      const b = btn.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      const inViewport = b.top >= 0 && b.bottom <= window.innerHeight;
      const clickable = !!hit && (hit === btn || btn.contains(hit));
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), inViewport, visible: inViewport && clickable };
    };
    cardEl.scrollTop = 0; // = was der Spieler direkt nach der Zeremonie sieht (unscrolled)
    const after = probe(); // FIX aktiv (sticky Footer)
    // VORHER-Simulation unter IDENTISCHEN Bedingungen: Footer in den normalen Fluss zurückzwingen
    // (position:static) → Button liegt wieder am Ende des internen Scrolls, wie vor dem Fix.
    const prevPos = footer.style.position;
    footer.style.position = "static";
    cardEl.scrollTop = 0;
    const before = probe();
    footer.style.position = prevPos; // Fix wiederherstellen
    cardEl.scrollTop = 0;
    const c = cardEl.getBoundingClientRect();
    const f = footer.getBoundingClientRect();
    return {
      buttonTop: after.top,
      buttonBottom: after.bottom,
      afterVisible: after.visible,
      beforeTop: before.top,
      beforeBottom: before.bottom,
      beforeVisible: before.visible,
      viewportH: window.innerHeight,
      cardScrollTop: Math.round(cardEl.scrollTop),
      cardOverflows: cardEl.scrollHeight > cardEl.clientHeight + 1,
      cardScrollH: Math.round(cardEl.scrollHeight),
      cardClientH: Math.round(cardEl.clientHeight),
      lootTiles: document.querySelectorAll(".dcc-loot-item").length,
      firstClearBadge: !!document.querySelector(".dcc-first-badge"),
      footerWithinCard: f.left >= c.left - 1 && f.right <= c.right + 1,
    };
  });

  // Sauberer Shot: Reveal-Stagger abkürzen (Klick auf Beute-Fläche → setSkip), dann schießen.
  await h.page.locator(".dcc-loot-grid").click({ position: { x: 20, y: 8 } }).catch(() => {});
  await h.page.waitForTimeout(250);
  await h.shot(`${shotPrefix}-01-ceremony-${vp.width}x${vp.height}`);

  const buttonInViewport = m.buttonTop >= 0 && m.buttonBottom <= m.viewportH;
  const pass = m.afterVisible && buttonInViewport && m.footerWithinCard;

  // Dismiss → Scroll-Restore (Welle MM) prüfen: Enter-Button danach wieder sichtbar?
  await h.page.locator(".dcc-next-btn").first().click();
  await h.page.waitForSelector(".dcc-backdrop", { state: "detached", timeout: 3000 }).catch(() => {});
  await h.page.waitForTimeout(350); // Scroll-Restore rAF-Kette
  const enterBox = await h.page
    .locator(".dungeon-card").filter({ hasText: cardName }).first().locator(".dungeon-enter").first()
    .boundingBox().catch(() => null);
  const enterVisible = enterBox ? enterBox.y >= 0 && enterBox.y + enterBox.height <= vp.height : null;
  await h.shot(`${shotPrefix}-02-after-dismiss-${vp.width}x${vp.height}`);

  results.push({ label: `${cardName} @ ${vp.width}x${vp.height}`, disabled, m, pass, enterVisible });

  console.log(
    `\n[${cardName} @ ${vp.width}x${vp.height}]  ${pass ? "PASS ✅" : "FAIL ❌"}  (enterDisabled=${disabled})\n` +
      `  BEFORE (footer static, pre-fix): button top=${m.beforeTop} bottom=${m.beforeBottom}  ` +
      `→ ${m.beforeVisible ? "visible" : "HIDDEN (buried in card scroll) ❌"}\n` +
      `  AFTER  (sticky footer):          button top=${m.buttonTop} bottom=${m.buttonBottom}  ` +
      `→ ${m.afterVisible ? "visible without scrolling ✅" : "hidden ❌"}   (viewportH=${m.viewportH})\n` +
      `  card overflows (internal scroll active): ${m.cardOverflows}  scrollTop=${m.cardScrollTop}  ` +
      `scrollH=${m.cardScrollH} clientH=${m.cardClientH}  lootTiles=${m.lootTiles}  firstClear=${m.firstClearBadge}\n` +
      `  footer within card horiz. (no h-overflow from footer): ${m.footerWithinCard}\n` +
      `  post-dismiss Enter button visible (scroll-restore intact): ${enterVisible}`,
  );
}

await withHarness({ port: PORT, fixture: "endgame", viewport: { width: 1920, height: 1080 } }, async (h) => {
  await h.clickRetry(h.page.locator('[data-guide-id="sidebar.combat"]').first());
  await h.page.waitForSelector(".combat-page", { timeout: 10000 });
  // Erst-Besuch Area-Tour (spotlight-only-clickable) frisst Klicks — wegklicken.
  const skipBtn = h.page.locator("button", { hasText: "Skip" }).first();
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click();
    await h.page.waitForTimeout(300);
  }

  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1280, height: 800 },
  ];
  for (const vp of viewports) {
    await h.page.setViewportSize(vp);
    await h.page.waitForTimeout(200);
    console.log(`\n=================== Viewport ${vp.width}x${vp.height} ===================`);
    await testDungeon(h, { dungeonId: "goblin_warband", cardName: "The Goblin Warband", shotPrefix: `dcc-warband-${vp.width}` });
    await h.page.waitForTimeout(200);
    await testDungeon(h, { dungeonId: "behind_the_throne", cardName: "Behind the Throne", shotPrefix: `dcc-throne-${vp.width}` });
  }

  console.log("\n──────────────── SUMMARY ────────────────");
  for (const r of results) {
    console.log(
      `${r.pass ? "PASS ✅" : "FAIL ❌"}  ${r.label}  ` +
        `button bottom=${r.m.buttonBottom}/${r.m.viewportH}  overflowed=${r.m.cardOverflows}  ` +
        `scrollRestore=${r.enterVisible}`,
    );
  }
  console.log(`\nOVERALL: ${results.every((r) => r.pass) ? "ALL PASS ✅" : "SOME FAIL ❌"}`);
  console.log(h.errors.length ? "\nPAGE ERRORS:\n" + h.errors.slice(0, 20).join("\n") : "\nno page errors");
});
