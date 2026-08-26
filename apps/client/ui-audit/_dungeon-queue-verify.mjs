import { startHarness } from "./sim-harness.mjs";

const LOCALE = process.env.HF_LOCALE || "de";
const VW = Number(process.env.HF_VW || 1600);
const VH = Number(process.env.HF_VH || 900);
const OUT = "ui-audit/shots-dungeon-queue";

const h = await startHarness({ port: 5427, fixture: "midgame", locale: LOCALE, viewport: { width: VW, height: VH } });
const { page } = h;
try {
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // Billigsten (niedrigstes requiredLevel, geringste Gegner-HP-Summe) echten Dungeon waehlen +
  // per dungeonsUnlocked-Bestandsschutz zwangsoeffnen (bypasst Quest-/Zonen-Gate fuers Testen,
  // s. engine/dungeon.ts isDungeonUnlocked (a)).
  const pick = await page.evaluate(() => {
    const dbg = window.__hfDebug;
    const s = dbg.state;
    const c = dbg.content;
    const real = c.dungeons.filter((d) => d.encounters.length > 0);
    const scored = real.map((d) => {
      const hp = d.encounters.reduce((sum, id) => sum + (c.monsters[id]?.maxHp ?? 0), 0);
      return { id: d.id, name: d.name, lvl: d.requiredLevel, waves: d.encounters.length, hp };
    });
    scored.sort((a, b) => a.hp - b.hp);
    const best = scored[0];
    s.dungeonsUnlocked[best.id] = true;
    return best;
  });
  console.log("BEFUND dungeon gewaehlt:", JSON.stringify(pick));

  // Navigation: Kampf -> ggf. Zonen-Uebersicht. Locale-unabhaengiges data-guide-id statt
  // Textmatch (Sidebar.tsx: `data-guide-id={"sidebar."+page.id}"`) — Textmatch scheiterte bei ru
  // (Nav-Label ist dort nicht "Kampf"/"Combat").
  await page.locator('[data-guide-id="sidebar.combat"]').first().click();
  await page.waitForTimeout(800);
  if (await page.locator(".combat-zones-btn").count()) {
    await page.locator(".combat-zones-btn").first().click();
    await page.waitForTimeout(500);
  }

  const localeKey = LOCALE === "ru" ? "ru" : LOCALE === "ptBR" ? "pt-BR" : LOCALE;
  const localizedName =
    typeof pick.name === "string" ? pick.name : (pick.name[localeKey] ?? pick.name.en ?? Object.values(pick.name)[0]);
  console.log("BEFUND lokalisierter Name:", localizedName);
  const card = page.locator(".zone-card.dungeon-card").filter({ hasText: localizedName }).first();
  let cardCount = await card.count();
  console.log("BEFUND karte gefunden:", cardCount);
  let targetCard = card;
  if (cardCount === 0) {
    // Fallback: irgendeine entsperrte Dungeon-Karte mit sichtbarem Picker nehmen.
    targetCard = page.locator(".zone-card.dungeon-card:not(.zone-card-story-locked)").first();
    cardCount = await targetCard.count();
    console.log("BEFUND fallback-karte count:", cardCount);
  }
  await targetCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  await import("node:fs").then((fs) => fs.mkdirSync(OUT, { recursive: true }));
  await targetCard.screenshot({ path: `${OUT}/${LOCALE}-${VW}x${VH}-card.png` });

  const pickerCount = await targetCard.locator(".dungeon-queue-picker").count();
  const qtyBtns = await targetCard.locator(".dungeon-queue-picker .qty-btn").allTextContents();
  console.log("BEFUND picker vorhanden:", pickerCount, "knoepfe:", JSON.stringify(qtyBtns));

  // 25x normal klicken (hinten anstellen) -> state.actionQueue muss dungeon-Eintrag tragen.
  const btn25 = targetCard.locator(".dungeon-queue-picker .qty-btn", { hasText: "25" }).first();
  if (await btn25.count()) {
    await btn25.click();
    await page.waitForTimeout(300);
  } else {
    console.log("BEFUND kein 25x-Knopf gefunden, ueberspringe Klick");
  }

  const afterEnqueue = await page.evaluate(() => {
    const s = window.__hfDebug.state;
    return { queue: s.actionQueue, queueDungeon: s.queueDungeon, combatDungeonId: s.combat.dungeonId };
  });
  console.log("BEFUND nach 25x-Klick:", JSON.stringify(afterEnqueue));

  // Warteschlangen-Panel aufklappen und screenshotten.
  const toggle = page.locator(".queue-panel-toggle").first();
  if (await toggle.count()) {
    const collapsed = await page.locator(".queue-panel--collapsed").count();
    if (collapsed > 0) { await toggle.click(); await page.waitForTimeout(300); }
  }
  const queuePanel = page.locator(".queue-panel").first();
  await queuePanel.screenshot({ path: `${OUT}/${LOCALE}-${VW}x${VH}-queue-panel.png` });

  // Betreten (= enqueueDungeonRunsAtFront, Ziel 1) klicken -> sofort-Start.
  const enterBtn = targetCard.locator(".dungeon-enter").first();
  if (await enterBtn.count()) {
    await enterBtn.click();
    await page.waitForTimeout(600);
  }
  const afterEnter = await page.evaluate(() => {
    const s = window.__hfDebug.state;
    return {
      combatDungeonId: s.combat.dungeonId,
      combatMonsterId: s.combat.monsterId,
      queueDungeon: s.queueDungeon,
      actionQueue: s.actionQueue,
    };
  });
  console.log("BEFUND nach Betreten:", JSON.stringify(afterEnter));

  // Kopfleiste screenshotten (sollte "Dungeon: Name · Lauf n/m" zeigen).
  const activity = page.locator(".activity.activity-fighting").first();
  if (await activity.count()) {
    console.log("BEFUND kopfleiste text:", (await activity.textContent())?.trim());
    await activity.screenshot({ path: `${OUT}/${LOCALE}-${VW}x${VH}-header.png` });
  } else {
    console.log("BEFUND keine .activity-fighting gefunden");
  }

  // Ein wenig Realzeit vergehen lassen, um zu sehen ob queueDungeon.completed steigt (best effort,
  // haengt vom Fixture-Charakter/Gegner ab).
  await page.waitForTimeout(8000);
  const afterWait = await page.evaluate(() => {
    const s = window.__hfDebug.state;
    return {
      combatDungeonId: s.combat.dungeonId,
      queueDungeon: s.queueDungeon,
      dungeonsCleared: s.dungeonsCleared,
      deaths: s.stats.deaths,
      queuePaused: s.queuePaused,
    };
  });
  console.log("BEFUND nach 8s Realzeit:", JSON.stringify(afterWait));

  // combat-return-bar: waehrend des Kampfs die Zonen-Liste erneut oeffnen -> Rueckweg-Leiste
  // erscheint zentriert oben (Auftrag 2).
  if (await page.locator(".combat-zones-btn").count()) {
    await page.locator(".combat-zones-btn").first().click();
    await page.waitForTimeout(500);
    const returnBar = page.locator(".combat-return-bar").first();
    if (await returnBar.count()) {
      await returnBar.screenshot({ path: `${OUT}/${LOCALE}-${VW}x${VH}-return-bar.png` });
      console.log("BEFUND return-bar text:", (await returnBar.textContent())?.trim());
    } else {
      console.log("BEFUND keine .combat-return-bar sichtbar");
    }
  }
} finally {
  await h.stop();
}
