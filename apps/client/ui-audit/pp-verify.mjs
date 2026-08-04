#!/usr/bin/env node
/**
 * Welle PP verification: Kurz-davor-Schimmer (Mastery + Achievements), Truhen-Enthüllung
 * (DungeonClearCeremony), "NEU"-Funkel (Inventar), Erstfund-Flip (Bestiary). Port 5318.
 */
import { withHarness } from "./sim-harness.mjs";

const PORT = 5318;

function log(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}${extra ? " " + extra : ""}`);
}

await withHarness({ port: PORT, fixture: "midgame", viewport: { width: 1920, height: 1080 } }, async (h) => {
  // ── 1a. Mastery shimmer ──────────────────────────────────────────────────
  // xpAt9=969, xpAt10=1154 (engine leveling curve, computed offline via tsx against
  // packages/engine/src/leveling.ts xpForLevel) — 1148 XP = level 9, ~97% progress towards the
  // level-10 bronze star (nextRank === lvl+1 && prog >= 0.95, s. MasteryPage.tsx `almostRank`).
  // Literal inlined (not a Node closure) — patchContent's `fn` is serialized via `.toString()` and
  // re-eval'd in the PAGE, so it must not reference outer Node variables (s. sim-harness.mjs doc).
  await h.page.locator('[data-guide-id="topbar.mastery"]').first().click();
  await h.page.waitForSelector(".ms2-page", { timeout: 10000 });
  const masteryTarget = await h.patchContent((dbg) => {
    const actionId = Object.keys(dbg.content.actions)[0];
    dbg.state.mastery[actionId] = { xp: 1148 };
    return actionId;
  });
  console.log("mastery almost-shimmer action:", masteryTarget);
  const skillNameText = await h.page.evaluate((id) => {
    const skillId = window.__hfDebug.content.actions[id].skill;
    const s = window.__hfDebug.content.skills[skillId];
    return typeof s.name === "string" ? s.name : s.name.en;
  }, masteryTarget);
  // All skill blocks start collapsed — expand the one holding our patched action so its row mounts
  // (the sweep is tied to the ROW's own mount, s. MasteryActionRow.tsx `almostRank`-JSDoc). Check
  // the sweep IMMEDIATELY after the click — it's a 900ms one-shot, and the screenshot call alone
  // can burn 200-400ms, so the DOM assertion must come BEFORE any screenshot to stay inside the
  // window (confirmed via a throwaway timeline probe: sweep is present through ~700ms post-mount).
  await h.page.locator(".ms2-skill-hdr").filter({ hasText: skillNameText }).first().click();
  const masteryAlmost = await h.page.evaluate(() => {
    const el = document.querySelector(".ms2-action-row--almost");
    return { found: !!el, hasSweep: !!document.querySelector(".ms2-almost-sweep") };
  });
  log("mastery: --almost row rendered with sweep on mount", masteryAlmost.found && masteryAlmost.hasSweep, JSON.stringify(masteryAlmost));
  await h.shot("pp-01-mastery-almost-shimmer");
  await h.page.waitForTimeout(1100);
  // Filter by MY OWN keyframe name — the raw getAnimations() count is confounded by unrelated,
  // legitimately-ongoing ambient UI animations elsewhere in the app (confirmed via a throwaway
  // baseline probe: e.g. `topbar-claim-dot-pulse`/tick-bar transitions from OTHER waves) that have
  // nothing to do with this sweep and would never reach zero.
  const masteryAnimAfter = await h.page.evaluate(() =>
    document.getAnimations().filter((a) => a.playState === "running" && a.animationName === "ms2-almost-sweep").length,
  );
  log("mastery: sweep animation is NOT still running after it settles", masteryAnimAfter === 0, `(running=${masteryAnimAfter})`);
  await h.shot("pp-01b-mastery-almost-settled");

  // ── 1b. Achievements shimmer ─────────────────────────────────────────────
  // Patch gold BEFORE navigating (mirrors the mastery test above) — the sweep is tied to the
  // CARD's own mount, so the condition must already be true at the moment AchievementsPage first
  // mounts the card, exactly like arriving fresh at the page with an already-almost achievement.
  // Pick the first locked "gold_reached" achievement and force progress to 96%. NOTE:
  // `character.totalLevel` is a per-tick DERIVED/cached field (recomputed from real skill XP each
  // tick, confirmed via a throwaway probe — a direct write reverts within ~1 tick), so "gold_reached"
  // (reads `character.gold` directly, a real mutable field) is the reliable condition type to patch.
  const achId = await h.patchContent((dbg) => {
    const unlocked = new Set(dbg.state.achievements);
    const def = dbg.content.achievements.find((a) => !unlocked.has(a.id) && a.condition.count > 0 && a.condition.type === "gold_reached");
    if (!def) return null;
    dbg.state.character.gold = Math.floor(def.condition.count * 0.96);
    return def.id;
  });
  console.log("achievement chosen for almost-shimmer:", achId);
  await h.page.locator('[data-guide-id="topbar.achievements"]').first().click();
  await h.page.waitForSelector(".achv-page", { timeout: 10000 });
  const achAnimCount = await h.page.evaluate(() => {
    const el = document.querySelector(".achv-card--almost");
    return { found: !!el, hasSweep: el ? !!el.querySelector(".achv-card-almost-sweep") : null };
  });
  log("achievements: --almost card rendered with sweep on mount", achAnimCount.found && achAnimCount.hasSweep, JSON.stringify(achAnimCount));
  await h.shot("pp-02-achievements-almost");
  // Wait past the 900ms sweep window, then confirm the sweep animation specifically is gone
  // (raw getAnimations() is confounded by unrelated ambient UI animations, s. mastery check above).
  await h.page.waitForTimeout(1200);
  const runningAfterAchv = await h.page.evaluate(() =>
    document.getAnimations().filter((a) => a.playState === "running" && a.animationName === "achv-almost-sweep").length,
  );
  log("achievements: sweep animation is NOT still running after it settles", runningAfterAchv === 0, `(running=${runningAfterAchv})`);
  await h.shot("pp-03-achievements-almost-settled");

  // ── 2. Dungeon clear ceremony: chest reveal + stagger + skip ─────────────
  await h.patchContent((dbg) => {
    const s = dbg.state;
    const dungeonId = dbg.content.dungeons[0].id;
    s.dungeonsCleared = s.dungeonsCleared ?? {};
    s.combat.dungeonId = dungeonId;
    s.combat.log = [];
  });
  await h.page.waitForTimeout(150); // let one tick pass so DungeonClearCeremony's snapshot sees dungeonId set
  const lootPick = await h.patchContent((dbg) => {
    const s = dbg.state;
    const dungeonId = s.combat.dungeonId;
    const items = Object.values(dbg.content.items);
    const common = items.find((i) => (i.rarity ?? "common") === "common");
    const rare = items.find((i) => i.rarity === "rare") ?? items.find((i) => i.rarity === "epic" || i.rarity === "superRare");
    const legendary = items.find((i) => i.rarity === "legendary") ?? items.find((i) => i.rarity === "godly");
    const picks = [common, rare, legendary].filter(Boolean);
    s.dungeonsCleared = s.dungeonsCleared ?? {};
    s.dungeonsCleared[dungeonId] = (s.dungeonsCleared[dungeonId] ?? 0) + 1;
    let seq = 1;
    s.combat.log = [
      { seq: seq++, kind: "kill" },
      { seq: seq++, kind: "gold", amount: 500 },
      { seq: seq++, kind: "xp", amount: 200 },
      ...picks.map((p) => ({ seq: seq++, kind: "loot", itemId: p.id, amount: 1 })),
    ];
    s.combat.dungeonId = null;
    return picks.map((p) => ({ id: p.id, rarity: p.rarity ?? "common" }));
  });
  console.log("dungeon loot picks (pre-sort order in log):", JSON.stringify(lootPick));
  await h.page.waitForTimeout(150);
  await h.shot("pp-04-dungeon-chest-opening");
  // Check DOM order of .dcc-loot-item matches ascending rarity (common..legendary/godly).
  const domOrder = await h.page.evaluate(() => {
    const cells = [...document.querySelectorAll(".dcc-loot-item .item-cell")];
    return cells.map((c) => [...c.classList].find((cl) => cl.startsWith("rarity-")) ?? "rarity-common");
  });
  console.log("DOM loot order (rarity classes, should be ascending):", JSON.stringify(domOrder));
  await h.page.waitForTimeout(1800); // let the full staggered reveal finish
  await h.shot("pp-05-dungeon-loot-revealed");
  // Filter to MY OWN keyframe names — the pre-existing `.dcc-first-badge` pulse (2s × 2 iterations
  // + 0.6s delay = 4.6s total) and `.dcc-shine` sweep are unrelated legacy ceremony animations that
  // legitimately outlive this 1800ms window; they are not part of Welle PP and not this check's concern.
  const dungeonAnimAfterReveal = await h.page.evaluate(() =>
    document.getAnimations().filter(
      (a) => a.playState === "running" && ["dcc-chest-pop", "dcc-chest-burst", "dcc-loot-reveal"].includes(a.animationName),
    ).length,
  );
  log("dungeon ceremony: chest/loot-reveal animations are NOT still running once settled", dungeonAnimAfterReveal === 0, `(running=${dungeonAnimAfterReveal})`);

  // Dismiss, then re-trigger and test the SKIP-on-click path.
  await h.page.locator(".dcc-next-btn").first().click().catch(() => {});
  await h.page.waitForTimeout(700);
  await h.patchContent((dbg) => {
    const s = dbg.state;
    const dungeonId = s.combat.dungeonId ?? dbg.content.dungeons[0].id;
    s.dungeonsCleared = s.dungeonsCleared ?? {};
    s.combat.dungeonId = dungeonId;
    s.combat.log = [];
  });
  await h.page.waitForTimeout(150);
  const lootPick2 = await h.patchContent((dbg) => {
    const s = dbg.state;
    const dungeonId = s.combat.dungeonId;
    const items = Object.values(dbg.content.items);
    const common = items.find((i) => (i.rarity ?? "common") === "common");
    s.dungeonsCleared[dungeonId] = (s.dungeonsCleared[dungeonId] ?? 0) + 1;
    s.combat.log = [
      { seq: 1, kind: "kill" },
      { seq: 2, kind: "loot", itemId: common.id, amount: 1 },
    ];
    s.combat.dungeonId = null;
    return common.id;
  });
  await h.page.waitForTimeout(150);
  await h.page.locator(".dcc-loot-grid").first().click().catch(() => {});
  await h.page.waitForTimeout(150);
  const skipped = await h.page.evaluate(() => !!document.querySelector(".dcc-loot-grid--skip"));
  log("dungeon ceremony: click-to-skip shows everything instantly", skipped, `(pick=${lootPick2})`);
  await h.shot("pp-06-dungeon-skip-clicked");
  await h.page.locator(".dcc-next-btn").first().click().catch(() => {});
  await h.page.waitForTimeout(600);

  // ── 3. "NEU"-Funkel im Inventar (localStorage seen-state, survives reload) ──
  // The midgame fixture already has MANY discovered-but-never-hovered items (fresh localStorage
  // in this browser context), so a raw "how many badges total" count is noisy. Pre-seed the
  // seen-set with EVERY currently-discovered item first — that establishes a clean 0-badge
  // baseline, so the ONE freshly-granted item below is the unambiguous `.first()` match.
  //
  // IMPORTANT: `?fixture=midgame` lands DIRECTLY on CharacterPage (confirmed via probe) — its
  // in-memory seen-set cache (util/discoveryBadge.ts `ensureCache`, module-scoped, keyed by
  // character.createdAt) is populated from the (still-empty) localStorage at THAT initial mount,
  // BEFORE this script ever gets a chance to write the seed. A later `localStorage.setItem` alone
  // does NOT invalidate that in-memory cache (same scope key ⇒ no re-read) — this is correct real-
  // world behavior (the module's own writes, via `markNewItemBadgeSeen`, always keep cache+storage
  // in sync; only an EXTERNAL write behind its back, exactly what a test script does, can diverge
  // them). A `page.reload()` after seeding forces a fresh module instance that reads the seeded
  // value from scratch — the same thing a real page reload does.
  const seedInfo = await h.patchContent((dbg) => {
    const s = dbg.state;
    return { createdAt: s.character.createdAt, discoveredIds: Object.keys(s.discoveredItems) };
  });
  await h.page.evaluate((info) => {
    localStorage.setItem(`gr.newItemSeen.${info.createdAt}`, JSON.stringify(info.discoveredIds));
  }, seedInfo);
  await h.page.reload({ waitUntil: "load" });
  await h.waitForDebugHook();
  await h.page.waitForTimeout(2500);
  await h.page.locator('[data-guide-id="topbar.character"]').first().click();
  await h.page.waitForSelector(".cs-inv-grid", { timeout: 10000 });
  await h.page.waitForTimeout(300);
  const badgeBaseline = await h.page.evaluate(() => document.querySelectorAll(".item-cell-new-badge").length);
  log("inventory: seeded baseline shows ZERO badges", badgeBaseline === 0, `(count=${badgeBaseline})`);

  const newItemId = await h.patchContent((dbg) => {
    const s = dbg.state;
    const items = Object.values(dbg.content.items).filter((i) => i.stackable !== false);
    const pick = items.find((i) => !s.discoveredItems[i.id] && !s.inventory.slots.some((sl) => sl && sl.itemId === i.id));
    if (!pick) return null;
    const emptyIdx = s.inventory.slots.findIndex((sl) => sl === null);
    if (emptyIdx < 0) return null;
    s.inventory.slots[emptyIdx] = { itemId: pick.id, qty: 1 };
    s.discoveredItems[pick.id] = true;
    return pick.id;
  });
  console.log("new item granted for NEU-badge test:", newItemId);
  await h.page.waitForTimeout(300);
  await h.shot("pp-07-inventory-new-badge");
  const badgeBefore = await h.page.evaluate(() => document.querySelectorAll(".item-cell-new-badge").length);
  log("inventory: exactly ONE NEU badge visible (the freshly granted item)", badgeBefore === 1, `(count=${badgeBefore})`);
  // Hover the (now unambiguous) badge cell to dismiss it.
  const badgeCellHandle = await h.page.locator(".item-cell-new-badge").first().locator("..").elementHandle();
  if (badgeCellHandle) {
    await badgeCellHandle.hover();
  }
  await h.page.waitForTimeout(200);
  const badgeAfterHover = await h.page.evaluate(() => document.querySelectorAll(".item-cell-new-badge").length);
  log("inventory: NEU badge gone after hover", badgeAfterHover === 0, `(after=${badgeAfterHover})`);
  await h.shot("pp-08-inventory-new-badge-dismissed");

  // Reload the SAME fixture and confirm the badge stays dismissed (localStorage persisted) — the
  // seeded baseline write above ALSO persists across reload, so this doubles as proof that a
  // reload alone (fixture state reset) does NOT resurrect any already-dismissed badge.
  await h.page.reload({ waitUntil: "load" });
  await h.waitForDebugHook();
  await h.page.waitForTimeout(2500);
  // Re-apply the exact same state (fixture reload resets `state` — the localStorage seen-flags,
  // keyed by itemId + character.createdAt, are UNAFFECTED by reload and must still apply).
  await h.page.evaluate((info) => {
    const dbg = window.__hfDebug;
    const s = dbg.state;
    for (const id of info.discoveredIds) s.discoveredItems[id] = true;
    const emptyIdx = s.inventory.slots.findIndex((sl) => sl === null);
    if (emptyIdx >= 0) s.inventory.slots[emptyIdx] = { itemId: info.newItemId, qty: 1 };
    s.discoveredItems[info.newItemId] = true;
  }, { ...seedInfo, newItemId });
  await h.page.locator('[data-guide-id="topbar.character"]').first().click();
  await h.page.waitForSelector(".cs-inv-grid", { timeout: 10000 });
  await h.page.waitForTimeout(300);
  const badgeAfterReload = await h.page.evaluate(() => document.querySelectorAll(".item-cell-new-badge").length);
  log("inventory: NEU badge STAYS dismissed after reload (localStorage)", badgeAfterReload === 0, `(count=${badgeAfterReload})`);
  await h.shot("pp-09-inventory-new-badge-after-reload");

  // ── 4. Bestiary flip (monster first-kill + item first-discovery, live while page open) ──
  await h.page.locator('[data-guide-id="topbar.bestiary"]').first().click();
  await h.page.waitForSelector(".bestiary-page", { timeout: 10000 });
  const flipTargets = await h.patchContent((dbg) => {
    const s = dbg.state;
    const monsters = Object.values(dbg.content.monsters).filter((m) => !m.id.startsWith("dg_") && m.loot.length > 0);
    const target = monsters.find((m) => (s.monsterKills[m.id] ?? 0) === 0);
    if (!target) return null;
    // Also un-discover its first loot item to test the item-chip flip in the same run.
    const lootItemId = target.loot[0].itemId;
    delete s.discoveredItems[lootItemId];
    s.monsterKills[target.id] = 0;
    return { monsterId: target.id, lootItemId };
  });
  console.log("bestiary flip targets:", JSON.stringify(flipTargets));
  await h.page.waitForTimeout(300);
  await h.shot("pp-10-bestiary-before-flip");
  // Now flip both live, while the page stays open.
  await h.page.evaluate((t) => {
    const dbg = window.__hfDebug;
    dbg.state.monsterKills[t.monsterId] = 1;
    dbg.state.discoveredItems[t.lootItemId] = true;
  }, flipTargets);
  await h.page.waitForTimeout(150); // mid-flip
  const midFlip = await h.page.evaluate(() => ({
    monsterFlipping: !!document.querySelector(".bestiary-card-art-flip"),
    itemFlipping: !!document.querySelector(".bestiary-drop-flip"),
  }));
  log("bestiary: monster card is mid-flip shortly after kill", midFlip.monsterFlipping, JSON.stringify(midFlip));
  await h.shot("pp-11-bestiary-mid-flip");
  await h.page.waitForTimeout(700); // past the 650ms flip window
  const postFlip = await h.page.evaluate(() => ({
    monsterFlipping: !!document.querySelector(".bestiary-card-art-flip"),
    itemFlipping: !!document.querySelector(".bestiary-drop-flip"),
  }));
  // The flip uses a CSS TRANSITION (not a keyframe animation) on `.flip-reveal-inner` — once the
  // wrapper unmounts (checked above), its transition's target element is gone, so it necessarily
  // stops existing too; the DOM-absence check above IS the complete "cleanly ends" proof here (a
  // raw getAnimations() count would only pick up unrelated ambient UI animations elsewhere, s. the
  // mastery/achievements/dungeon checks above for that confound).
  log("bestiary: flip wrapper cleanly unmounts after ~650ms (transition ends with it)", !postFlip.monsterFlipping && !postFlip.itemFlipping, JSON.stringify(postFlip));
  await h.shot("pp-12-bestiary-after-flip");

  // Sanity: navigating AWAY and back must NOT replay the flip (no "abspulen beim Seitenwechsel").
  await h.page.locator('[data-guide-id="topbar.mastery"]').first().click();
  await h.page.waitForTimeout(300);
  await h.page.locator('[data-guide-id="topbar.bestiary"]').first().click();
  await h.page.waitForTimeout(300);
  const noReplay = await h.page.evaluate(() => ({
    monsterFlipping: !!document.querySelector(".bestiary-card-art-flip"),
    itemFlipping: !!document.querySelector(".bestiary-drop-flip"),
  }));
  log("bestiary: no replay on page revisit", !noReplay.monsterFlipping && !noReplay.itemFlipping, JSON.stringify(noReplay));
  await h.shot("pp-13-bestiary-revisit-no-replay");

  // ── 5. fxLevel "off" = fully static everywhere ───────────────────────────
  await h.page.evaluate(() => localStorage.setItem("gr.combatFxLevel", "off"));
  await h.page.reload({ waitUntil: "load" });
  await h.waitForDebugHook();
  await h.page.waitForTimeout(2500);

  // 5a. Mastery/Achievements: shimmer sweep should never fire (only static glanz, if applicable).
  // Patch BEFORE navigating (s. section 1b comment) so the card mounts already "almost" — gives
  // the sweep pipeline a genuine chance to fire, correctly declining only because of fxLevel="off".
  await h.patchContent((dbg) => {
    const unlocked = new Set(dbg.state.achievements);
    const def = dbg.content.achievements.find((a) => !unlocked.has(a.id) && a.condition.count > 0 && a.condition.type === "gold_reached");
    if (def) dbg.state.character.gold = Math.floor(def.condition.count * 0.96);
  });
  await h.page.locator('[data-guide-id="topbar.achievements"]').first().click();
  await h.page.waitForSelector(".achv-page", { timeout: 10000 });
  const offAlmostFound = await h.page.evaluate(() => !!document.querySelector(".achv-card--almost"));
  const offSweepCount = await h.page.evaluate(() => document.querySelectorAll(".achv-card-almost-sweep").length);
  log(
    "fxLevel off: static --almost glanz still shows, but sweep NEVER renders",
    offAlmostFound && offSweepCount === 0,
    `(almostFound=${offAlmostFound}, sweepCount=${offSweepCount})`,
  );
  await h.shot("pp-14-fxoff-achievements");

  // 5b. Dungeon ceremony: should start already fully revealed (skip=true default), no chest.
  await h.patchContent((dbg) => {
    const s = dbg.state;
    const dungeonId = dbg.content.dungeons[0].id;
    s.dungeonsCleared = s.dungeonsCleared ?? {};
    s.combat.dungeonId = dungeonId;
    s.combat.log = [];
  });
  await h.page.waitForTimeout(150);
  await h.patchContent((dbg) => {
    const s = dbg.state;
    const dungeonId = s.combat.dungeonId;
    const common = Object.values(dbg.content.items).find((i) => (i.rarity ?? "common") === "common");
    s.dungeonsCleared[dungeonId] = (s.dungeonsCleared[dungeonId] ?? 0) + 1;
    s.combat.log = [
      { seq: 1, kind: "kill" },
      { seq: 2, kind: "loot", itemId: common.id, amount: 1 },
    ];
    s.combat.dungeonId = null;
  });
  await h.page.waitForTimeout(200);
  const fxOffDungeon = await h.page.evaluate(() => ({
    hasChest: !!document.querySelector(".dcc-chest"),
    hasSkipClass: !!document.querySelector(".dcc-loot-grid--skip"),
  }));
  log("fxLevel off: dungeon ceremony starts already fully revealed, no chest", !fxOffDungeon.hasChest && fxOffDungeon.hasSkipClass, JSON.stringify(fxOffDungeon));
  await h.shot("pp-15-fxoff-dungeon");
  await h.page.locator(".dcc-next-btn").first().click().catch(() => {});

  // 5c. Bestiary flip: state-change should apply WITHOUT the FlipReveal wrapper mounting.
  await h.page.locator('[data-guide-id="topbar.bestiary"]').first().click();
  await h.page.waitForSelector(".bestiary-page", { timeout: 10000 });
  const fxOffTarget = await h.patchContent((dbg) => {
    const s = dbg.state;
    const monsters = Object.values(dbg.content.monsters).filter((m) => !m.id.startsWith("dg_"));
    const target = monsters.find((m) => (s.monsterKills[m.id] ?? 0) === 0);
    if (!target) return null;
    s.monsterKills[target.id] = 0;
    return target.id;
  });
  await h.page.waitForTimeout(200);
  await h.page.evaluate((id) => { window.__hfDebug.state.monsterKills[id] = 1; }, fxOffTarget);
  await h.page.waitForTimeout(150);
  const fxOffFlip = await h.page.evaluate(() => !!document.querySelector(".bestiary-card-art-flip"));
  log("fxLevel off: bestiary flip wrapper never mounts", !fxOffFlip, `(mounted=${fxOffFlip})`);
  await h.shot("pp-16-fxoff-bestiary");

  console.log(h.errors.length ? `PAGE ERRORS:\n${h.errors.join("\n")}` : "no page errors captured");
});
