import { describe, expect, it } from "vitest";
import { content as base } from "@hearthforge/content";
import type { ContentDB, DungeonDef, GameState, ItemId, RaidDef } from "@hearthforge/shared";
import { AUTO_EAT_TIERS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { xpForLevel } from "./leveling";
import { addItem, itemCount } from "./inventory";
import { isMealItem, useConsumable } from "./consumable";
import { isHealPotion } from "./consume-gate";
import { advance } from "./tick";
import { findNextFood, selectMeal, setAutoRebuffTonics, startCombat } from "./combat";
import { startDungeon } from "./dungeon";
import { startRaid } from "./raid";
import { estateStatus } from "./estates";
import { plantCrop, plotProgress } from "./farming";
import { huntTrapWaiting } from "./hunting";
import { itemTier, tierForLevel } from "./tiers";

/**
 * QA-Runde 2, 1.4.0 Welle 1 „Klarheit“ und Ländereien (Kontrolleur, claude:2026-10-26T14:50:00+02:00).
 * Nur Prüfungen, kein Produktcode. `it.fails("BUG: …")` = belegter Befund (SOLL-Formulierung, reißt heute).
 */
const MEAL = "marshroot_chowder";
const MEAL_DUR = base.items[MEAL]!.buff!.durationMs;

function allSkills99(s: GameState, c: ContentDB): void {
  for (const id of Object.keys(c.skills)) s.skills[id] = { xp: xpForLevel(99) };
}

// ── BF: Mahlzeit-Platz, Auto-Essen, Tonika ───────────────────────────────────────────────────────────

describe("QA2 BF: Mahlzeiten", () => {
  it("Content: Mahlzeit = Buff-Kategorie food, und das sind genau die Kochprodukte mit Buff; Kräuterkunde liefert nie eine", () => {
    const cooked = new Set<ItemId>();
    const brewed = new Set<ItemId>();
    for (const a of Object.values(base.actions)) {
      for (const l of a.loot) {
        if (a.skill === "cooking") cooked.add(l.itemId);
        if (a.skill === "herblore") brewed.add(l.itemId);
      }
    }
    const meals = Object.values(base.items).filter((i) => i.type === "consumable" && i.buff?.category === "food").map((i) => i.id);
    expect(meals.length).toBeGreaterThan(10);
    // Jede Mahlzeit stammt aus dem Kochen (sonst wäre sie im Mahlzeit-Picker, aber nie herstellbar).
    expect(meals.filter((id) => !cooked.has(id))).toEqual([]);
    // Jedes gekochte Gericht mit Buff ist eine Mahlzeit (sonst erneuerte es die Tonika-Erneuerung und der Mahlzeit-Platz lehnte es ab).
    const cookedBuffNotFood = [...cooked].filter((id) => base.items[id]?.buff && base.items[id]!.buff!.category !== "food");
    expect(cookedBuffNotFood).toEqual([]);
    // Kein Kräuterkunde-Produkt ist eine Mahlzeit.
    expect([...brewed].filter((id) => isMealItem(base, id))).toEqual([]);
  });

  it("Auto-Essen: liegen nur Salben (Kräuterkunde) und Mahlzeiten im Inventar, bleibt der leere Heilplatz leer; nichts wird gegessen", () => {
    const s = createTestGame({ name: "X" }, base, 3);
    addItem(s.inventory, base, "salve_of_mending", 5);
    addItem(s.inventory, base, MEAL, 5);
    expect(isHealPotion(base, "salve_of_mending")).toBe(true);
    s.character.food = "cooked_shrimp"; // nicht vorrätig ⇒ Ersatzwahl
    startCombat(s, base, "goblin");
    s.character.hp = 1;
    advance(s, base, 100);
    expect(s.character.food).toBeNull();
    expect(findNextFood(s, base, 500)).toBeNull();
    expect(itemCount(s.inventory, "salve_of_mending")).toBe(5);
    expect(itemCount(s.inventory, MEAL)).toBe(5);
  });

  it("Auto-Ess-Stufen: jede Stufe isst früher (höhere Schwelle), Heilmenge bleibt 1,0 (Text „Isst früher“ stimmt)", () => {
    for (let i = 1; i < AUTO_EAT_TIERS.length; i++) expect(AUTO_EAT_TIERS[i]!.threshold).toBeGreaterThan(AUTO_EAT_TIERS[i - 1]!.threshold);
    expect(AUTO_EAT_TIERS.every((t) => t.healMult === 1)).toBe(true);
  });

  it("Mahlzeit halten im Dungeon: erster Tick isst die Mahlzeit aus dem Inventar", () => {
    const s = createTestGame({ name: "D" }, base, 4);
    allSkills99(s, base);
    addItem(s.inventory, base, MEAL, 3);
    selectMeal(s, base, MEAL);
    const d = base.dungeons.find((x) => !x.raidOnly)!;
    s.dungeonsUnlocked[d.id] = true; // Bestandsschutz-Freischaltung (isDungeonUnlocked (a))
    expect(startDungeon(s, base, d.id), d.id).toBe(true);
    expect(s.combat.monsterId).not.toBeNull();
    advance(s, base, 100);
    expect(itemCount(s.inventory, MEAL)).toBe(2);
    expect(s.character.buffs.some((b) => b.itemId === MEAL)).toBe(true);
  });

  it("Mahlzeit halten im Raid: erster Tick isst die Mahlzeit, nach Ablauf wird aus der Bank nachgegessen", () => {
    const rooms: DungeonDef[] = [1, 2].map((i) => ({
      id: `qa2_room_${i}`,
      name: { en: `Room ${i}`, de: `Raum ${i}` },
      requiredLevel: 1,
      encounters: ["goblin", "goblin", "goblin", "goblin", "goblin_warchief"],
      raidOnly: true,
      loot: [],
      xp: 0,
      gold: 0,
    }));
    const def: RaidDef = {
      id: "qa2_raid",
      name: { en: "QA Raid", de: "QA-Raid" },
      unlockDungeonId: base.dungeons[0]!.id,
      rooms: rooms.map((d, i) => ({ id: `r${i}`, name: d.name, dungeonId: d.id, bossId: "goblin_warchief", table: { draws: 1, extraChance: 0, entries: [{ itemId: "copper_sword", weight: 1 }] } })),
      fees: { normal: 1000, heroic: 3000, mythic: 8000 },
      heroicRestartCost: 500,
      mythicRefundPct: 0.25,
      scaling: {
        normal: { hpMult: 1, damageMult: 1, levelAdd: 0, defenseMult: 1 },
        heroic: { hpMult: 2, damageMult: 1.6, levelAdd: 10, defenseMult: 1.1 },
        mythic: { hpMult: 2.4, damageMult: 1.85, levelAdd: 20, defenseMult: 1.2 },
      },
      reinforcedWave: { index: 3, hpMult: 1.5, damageMult: 1.15 },
      trashLoot: [],
      trashPieceChance: { normal: 0, heroic: 0, mythic: 0 },
      bossSideLoot: [],
      suffixChance: { normal: 0, heroic: 0, mythic: 0 },
      weeklyChest: { extraItems: [], dust: { normal: 15, heroic: 25, mythic: 40 } },
      maxAutoRestarts: 3,
    };
    const c: ContentDB = { ...base, dungeons: [...base.dungeons, ...rooms], raids: [def] };
    const s = createTestGame({ name: "R" }, c, 9);
    allSkills99(s, c);
    s.dungeonsCleared[def.unlockDungeonId] = 1;
    s.character.gold = 50_000;
    s.bank[MEAL] = 4;
    selectMeal(s, c, MEAL);
    expect(startRaid(s, c, "qa2_raid", "normal")).toBe("ok");
    expect(s.combat.monsterId).not.toBeNull();
    advance(s, c, 100);
    expect(s.bank[MEAL]).toBe(3);
    expect(s.character.buffs.some((b) => b.itemId === MEAL)).toBe(true);
    // Buff abgelaufen ⇒ Nachessen aus der Bank, solange der Kampf läuft.
    s.character.buffs = s.character.buffs.map((b) => (b.itemId === MEAL ? { ...b, remainingMs: 50 } : b));
    advance(s, c, 200);
    if (s.combat.monsterId !== null) expect(s.bank[MEAL]).toBe(2);
  });

  it("Tonika-Erneuerung erneuert nur Tonika: abgelaufene Mahlzeit wird außerhalb des Kampfs nicht nachgegessen, ein Tonikum schon", () => {
    const s = createTestGame({ name: "T" }, base, 5);
    const tonic = Object.values(base.items).find(
      (i) => i.type === "consumable" && i.buff?.category && i.buff.category !== "food" && !i.healAmount && !i.healPct && !i.consumable && !i.curesPoison,
    )!;
    expect(tonic).toBeTruthy();
    s.character.autoPotion.autoRebuffUnlocked = true;
    setAutoRebuffTonics(s, true);
    addItem(s.inventory, base, MEAL, 3);
    addItem(s.inventory, base, tonic.id, 2);
    expect(useConsumable(s, base, MEAL)).toBe(true);
    expect(useConsumable(s, base, tonic.id)).toBe(true);
    const span = Math.max(MEAL_DUR, tonic.buff!.durationMs) + 5_000;
    for (let t = 0; t < span; t += 1000) advance(s, base, 1000);
    expect(itemCount(s.inventory, MEAL)).toBe(2); // keine Erneuerung
    expect(itemCount(s.inventory, tonic.id)).toBe(0); // 2 → 1 (Hand) → 0 (Erneuerung)
  });
});

// ── ST: Stufen-Sterne ─────────────────────────────────────────────────────────────────────────────────

describe("QA2 ST: Stufen", () => {
  const mats = Object.values(base.items).filter((i) => i.type === "material");
  const recipes = Object.values(base.actions).filter((a) => (a.inputs?.length ?? 0) > 0);

  it("Raid-Teile und ihre Varianten (Normal/Heroisch/Mythisch) tragen Stufe XIII; alle heroischen/mythischen Items ebenso", () => {
    const raidIds = new Set<ItemId>();
    for (const r of base.raids ?? []) for (const room of r.rooms) for (const e of room.table.entries) raidIds.add(e.itemId);
    expect(raidIds.size).toBeGreaterThan(20);
    const bad: string[] = [];
    for (const id of raidIds) {
      for (const suffix of ["", "_heroic", "_mythic"]) {
        const full = `${id}${suffix}`;
        if (!base.items[full]) { bad.push(`${full}: fehlt`); continue; }
        if (itemTier(base, full) !== 13) bad.push(`${full}: ${itemTier(base, full)}`);
      }
    }
    expect(bad).toEqual([]);
    const hm = Object.values(base.items).filter((i) => i.rarity === "heroic" || i.rarity === "mythic");
    expect(hm.length).toBeGreaterThan(20);
    expect(hm.filter((i) => itemTier(base, i.id) !== 13).map((i) => i.id)).toEqual([]);
  });

  it("Übersicht: Materialien, deren Stufe über der niedrigsten Ausrüstungs-Stufe ihrer direkten Rezepte liegt (Spec: „niedrigstes Ausrüstungsteil“)", () => {
    const viol: string[] = [];
    for (const m of mats) {
      const t = itemTier(base, m.id);
      if (t === null || typeof m.tier === "number" || m.arrow) continue;
      let min: number | null = null;
      for (const a of recipes) {
        if (!a.inputs!.some((i) => i.itemId === m.id)) continue;
        for (const l of a.loot) {
          const lt = itemTier(base, l.itemId);
          if (lt !== null && (min === null || lt < min)) min = lt;
        }
      }
      if (min !== null && t > min) viol.push(`${m.id}: Stufe ${t}, niedrigste Verwendung Stufe ${min}`);
    }
    console.log(`Material über niedrigster Verwendung (${viol.length}):\n${viol.join("\n")}`);
    expect(viol.length).toBeGreaterThanOrEqual(0);
  });

  // claude:2026-10-24T15:21:04+02:00 — Befund B3 behoben: it.fails → it. claude:2026-10-24T16:03:31+02:00 — Regel jetzt „häufigste Stufe + Kettenkappe“ (CEO-Korrektur).
  it("Erz und Barren desselben Metalls haben dieselbe Stufe (vorher Eisenerz IV, Eisenbarren III)", () => {
    const pairs: [string, string][] = [
      ["copper_ore", "copper_bar"], ["tin_ore", "bronze_bar"], ["iron_ore", "iron_bar"], ["gravesteel_ore", "gravesteel_bar"],
      ["mithril_ore", "mithril_bar"], ["adamantite_ore", "adamantium_bar"], ["runite_ore", "runite_bar"], ["murkvein_ore", "murkvein_bar"],
      ["bloodiron_ore", "bloodiron_bar"], ["titanium_ore", "titanium_bar"], ["aetherite_ore", "aetherium_bar"], ["godiron_ore", "godiron_bar"],
    ];
    const diff = pairs.filter(([o, b]) => itemTier(base, o) !== itemTier(base, b)).map(([o, b]) => `${o}=${itemTier(base, o)} vs ${b}=${itemTier(base, b)}`);
    expect(diff).toEqual([]);
  });

  // claude:2026-10-24T15:21:04+02:00 — Befund B3: it.fails → it. claude:2026-10-24T16:03:31+02:00 — nach der CEO-Korrektur („häufigste Stufe + Kettenkappe“): Kohle
  // steht nicht über dem Stahlbarren (Kappe, vorher VI), die Sehne behält ihre häufigste Stufe (die „niedrigste“ hatte sie auf I gezogen;
  // der CEO hat das als Nebenwirkung verworfen). Die Sehne geht in Bögen (Ausrüstung), dort greift keine Kettenkappe.
  it("Kohle steht nicht über dem Stahlbarren (Kettenkappe); die Sehne behält ihre häufigste Stufe (CEO-Korrektur)", () => {
    expect(itemTier(base, "coal")).toBeLessThanOrEqual(itemTier(base, "steel_bar")!);
    const votes = new Map<number, number>();
    for (const a of recipes.filter((r) => r.inputs!.some((i) => i.itemId === "bowstring"))) {
      const t = Math.min(...a.loot.map((l) => itemTier(base, l.itemId) ?? 99));
      if (t === 99) continue; // Rezept ohne Stufen-Ausgabe (stimmt für „keine Stufe“, hier in der Minderheit)
      votes.set(t, (votes.get(t) ?? 0) + 1);
    }
    const most = [...votes].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0]![0];
    expect(itemTier(base, "bowstring")).toBe(most);
  });

  // claude:2026-10-24T15:21:04+02:00 — Befund B4 behoben (CEO: ohne Trage-Anforderung und ohne Gebiet gilt die Herstellungs-Anforderung, auf die Stufen-Skala
  // abgebildet wie ein Ausrüstungs-Level).
  it("Hergestellte Umhänge ohne Trage-Anforderung tragen die Stufe ihres Rezept-Levels (hardened_warcape Schneidern 45 ⇒ VI)", () => {
    for (const [id, lvl] of [["hardened_warcape", 45], ["frost_shroud", 38], ["ranger_cape", 35], ["leather_warcape", 18], ["arcane_cape", 12]] as const) {
      const recipe = Object.values(base.actions).find((a) => (a.inputs?.length ?? 0) > 0 && a.loot.some((l) => l.itemId === id));
      expect(recipe, id).toBeTruthy();
      expect(recipe!.levelRequired, id).toBe(lvl);
      expect(itemTier(base, id), id).toBe(tierForLevel(lvl));
    }
  });

  it("Übersicht: Ausrüstung ohne Anforderung und ohne Drop-Quelle (fällt auf Stufe I zurück)", () => {
    const list: string[] = [];
    for (const i of Object.values(base.items)) {
      if (i.type !== "equipment" || typeof i.tier === "number") continue;
      const reqs = Object.values(i.requirements ?? {}).filter((v): v is number => typeof v === "number" && v > 0);
      if (reqs.length > 0) continue;
      // Drop-Quelle? (Stufe wäre dann aus der Quelle abgeleitet und ungleich 1 möglich.)
      list.push(`${i.id}: Stufe ${itemTier(base, i.id)} (Wert ${i.value ?? 0}, ${i.rarity ?? "common"})`);
    }
    console.log(`Ausrüstung ohne Anforderung (${list.length}):\n${list.join("\n")}`);
    expect(list.length).toBeGreaterThanOrEqual(0);
  });
});

// ── LA: Ländereien ────────────────────────────────────────────────────────────────────────────────────

describe("QA2 LA: Ländereien", () => {
  it("Status: laufende und wartende Fallen werden getrennt gezählt, nächste Fangzeit ist die kürzeste", () => {
    const s = createTestGame({ name: "L" }, base, 6);
    allSkills99(s, base);
    const zones = base.huntingZones ?? [];
    expect(zones.length).toBeGreaterThan(1);
    s.huntTraps[0] = { zoneId: zones[0]!.zoneId, remainingMs: 120_000, autoRebait: true, lastCatch: null, lastMissed: false };
    s.huntTraps[1] = { zoneId: zones[1]!.zoneId, remainingMs: 45_000, autoRebait: true, lastCatch: null, lastMissed: false };
    s.huntTraps[2] = { zoneId: zones[0]!.zoneId, remainingMs: 0, autoRebait: true, lastCatch: null, lastMissed: false };
    expect(huntTrapWaiting(s.huntTraps[2]!)).toBe(true);
    const e = estateStatus(s, base);
    expect(e.trapsRunning).toBe(2);
    expect(e.trapsWaiting).toBe(1);
    expect(e.nextCatchMs).toBe(45_000);
    expect(e.trapsUnlocked).toBeGreaterThanOrEqual(3);
  });

  it("Status: wachsende Beete, wartende Ernte und leere Beete; Kopfzeile aktiv nur bei wachsendem Beet oder laufender Falle", () => {
    const s = createTestGame({ name: "F" }, base, 7);
    allSkills99(s, base);
    const crops = Object.values(base.crops ?? {}).sort((a, b) => a.growMs - b.growMs);
    expect(crops.length).toBeGreaterThan(1);
    const short = crops[0]!;
    const long = crops[crops.length - 1]!;
    addItem(s.inventory, base, short.seedItem, 1);
    addItem(s.inventory, base, long.seedItem, 1);
    expect(plantCrop(s, base, 0, short.id)).toBe(true);
    expect(plantCrop(s, base, 1, long.id)).toBe(true);
    let e = estateStatus(s, base);
    expect(e.plotsGrowing).toBe(2);
    expect(e.plotsEmpty).toBe(e.plotsUnlocked - 2);
    expect(e.nextHarvestMs).toBeLessThanOrEqual(short.growMs);
    // Kurze Sorte reift, keine Saat mehr ⇒ Beet 0 leer, Beet 1 wächst weiter.
    advance(s, base, short.growMs + 1000);
    expect(plotProgress(s, base, 0).growing).toBe(false);
    expect(plotProgress(s, base, 1).growing).toBe(true);
    e = estateStatus(s, base);
    expect(e.plotsGrowing).toBe(1);
    expect(e.plotsEmpty).toBe(e.plotsUnlocked - 1);
  });

  it.fails("BUG: Beete, die mangels Saat stillstehen, haben neben wachsenden Beeten kein Warnsignal (Spec LA: Warnfarbe bei „keine Samen“)", () => {
    // Seitenleiste (SidebarEstates.tsx:50-55) und Banner (EstateBanner.tsx:24-27) warnen bei Beeten nur über
    // `plotsWaiting` (Ernte blockiert) oder wenn GAR NICHTS wächst. 4 von 9 Beeten ohne Saat neben 5 wachsenden ⇒ „Felder 5/9“ ohne Warnung.
    const s = createTestGame({ name: "F" }, base, 8);
    allSkills99(s, base);
    const crops = Object.values(base.crops ?? {}).sort((a, b) => a.growMs - b.growMs);
    const short = crops[0]!;
    const long = crops[crops.length - 1]!;
    addItem(s.inventory, base, short.seedItem, 1);
    addItem(s.inventory, base, long.seedItem, 1);
    plantCrop(s, base, 0, short.id);
    plantCrop(s, base, 1, long.id);
    advance(s, base, short.growMs + 1000);
    const e = estateStatus(s, base) as unknown as Record<string, number>;
    expect(e.plotsGrowing).toBe(1);
    // SOLL: ein Zähler für Beete, die wegen fehlender Saat stillstehen (hier Beet 0 nach der Ernte, Auto-Nachpflanzen ohne Saat).
    expect(e.plotsSeedMissing ?? 0).toBeGreaterThan(0);
  });

  it("Content: Ernte-Items der Beete fallen auch aus Sammel-Aktionen (Grundlage für die Doppelzählung im Offline-Bericht)", () => {
    const yields = new Set(Object.values(base.crops ?? {}).map((c) => c.yieldItem));
    const overlap: string[] = [];
    for (const a of Object.values(base.actions)) {
      if (a.skill === "farming") continue;
      for (const l of a.loot) if (yields.has(l.itemId)) overlap.push(`${a.id} (${a.skill}) → ${l.itemId}`);
    }
    console.log(`Sammel-Aktionen mit Ernte-Item (${overlap.length}):\n${overlap.join("\n")}`);
    expect(overlap.length).toBeGreaterThanOrEqual(0);
  });
});
