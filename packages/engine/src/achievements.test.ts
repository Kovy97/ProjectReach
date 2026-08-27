import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  AP_MILESTONE_STEP_PCT,
  MASTERY_MAX_LEVEL,
  MAX_BANK_SLOTS_PURCHASED,
  MAX_FARM_PLOTS,
  apMilestoneTokens,
  earnedAP,
  totalAP,
  achievementPoints,
  type AchievementConditionType,
  type ContentDB,
} from "@hearthforge/shared";
import { xpForLevel } from "./leveling";
import { createGame } from "./state";
import {
  achievementMet,
  achievementProgress,
  checkAchievements,
  checkApMilestones,
} from "./achievements";

/** Alle condition.types, die `checkAchievements` (achievementProgress) tatsächlich behandelt. */
const HANDLED: ReadonlySet<AchievementConditionType> = new Set<AchievementConditionType>([
  "skill_level",
  "total_level",
  "monster_kills",
  "total_kills",
  "items_gathered",
  "items_crafted",
  "quests_completed",
  "gold_reached",
  "gold_spent",
  "items_discovered",
  "dungeons_cleared",
  "daily_streak",
  "pets_owned",
  "sets_completed",
  "paragon_floor",
  // Achievements 1.2.0 (Audit § 2.5, 27.08.2026)
  "monsters_discovered",
  "zone_bestiary",
  "dungeons_distinct",
  "slayer_tasks",
  "slayer_streak",
  "slayer_floor",
  "elite_kills",
  "elite_variants",
  "elite_uniques",
  "camp_levels",
  "camp_buildings",
  "mastery_maxed",
  "min_skill_level",
  "dailies_distinct",
  "bank_slots",
  "food_cooked",
  "runes_discovered",
  "farm_plots_planted",
  "deaths",
  "play_hours",
]);

const VALID_RARITIES = new Set(["common", "uncommon", "rare", "epic", "legendary"]);
const VALID_CATEGORIES = new Set([
  "skilling",
  "combat",
  "gathering",
  "crafting",
  "quests",
  "wealth",
  "collection",
  "exploration",
  "meta",
]);
/** condition.types, die ZWINGEND ein gültiges `target` brauchen, um sinnvoll zu prüfen. */
const TARGET_REQUIRED: ReadonlySet<AchievementConditionType> = new Set<AchievementConditionType>([
  "skill_level",
  "monster_kills",
  "zone_bestiary",
]);

describe("achievements", () => {
  it("startet ohne freigeschaltete Meilensteine", () => {
    const state = createGame({ name: "Test" }, content, 1);
    expect(state.achievements).toEqual([]);
  });

  it("schaltet einen Kill-Meilenstein frei, sobald die Bedingung erfüllt ist", () => {
    const state = createGame({ name: "Test" }, content, 1);
    state.stats.kills = 10;
    const newly = checkAchievements(state, content);
    expect(newly).toContain("ach_kills_10");
    expect(state.achievements).toContain("ach_kills_10");
  });

  it("schaltet jeden Meilenstein nur einmal frei", () => {
    const state = createGame({ name: "Test" }, content, 1);
    state.stats.kills = 10;
    checkAchievements(state, content);
    const again = checkAchievements(state, content);
    expect(again).toEqual([]);
    expect(state.achievements.filter((a) => a === "ach_kills_10")).toHaveLength(1);
  });

  it("löst Gold- und Sammel-Meilensteine separat aus", () => {
    const state = createGame({ name: "Test" }, content, 1);
    state.character.gold = 1000;
    state.stats.itemsGathered = 100;
    const newly = checkAchievements(state, content);
    expect(newly).toContain("ach_gold_1000");
    expect(newly).toContain("ach_gather_100");
    expect(newly).not.toContain("ach_gold_10000");
  });

  it("wertet neue condition.types aus (skill_level, gold_spent, daily_streak)", () => {
    const state = createGame({ name: "Test" }, content, 1);
    state.skills.woodcutting = { xp: 1_000_000 }; // weit über Lv 50
    state.stats.goldSpent = 10_000;
    state.stats.dailyStreak = 7;
    const newly = checkAchievements(state, content);
    expect(newly).toContain("ach_skill_woodcutting_50");
    expect(newly).toContain("ach_gold_spent_10000");
    expect(newly).toContain("ach_daily_streak_7");
  });

  it("items_discovered liest die MONOTONE Wahrheit discoveredItems — Verkauf/Verlust senkt den Fortschritt NIE (Welle LL)", () => {
    const state = createGame({ name: "Test" }, content, 1);
    // Dieselbe Quelle wie Bestiarium/Wiki: der Erst-Besitz-Marker (SAVE 58).
    const baseline = Object.keys(state.discoveredItems).length;
    expect(achievementProgress(state, { type: "items_discovered", count: 10 })).toBe(baseline);

    // Neue Entdeckungen zählen sofort mit.
    state.discoveredItems["copper_ore"] = true;
    state.discoveredItems["oak_log"] = true;
    expect(achievementProgress(state, { type: "items_discovered", count: 10 })).toBe(baseline + 2);

    // „Alles verkauft/verloren": Inventar, Bank UND seenDrops leer — der Fortschritt bleibt,
    // weil discoveredItems monoton ist (der alte Zähler seenDrops ∪ Inventar ∪ Bank fiel hier).
    state.inventory.slots = state.inventory.slots.map(() => null);
    state.bank = {};
    state.seenDrops = {};
    expect(achievementProgress(state, { type: "items_discovered", count: 10 })).toBe(baseline + 2);
  });

  it("Alt-Save-Nachholung: ein State mit großem discoveredItems schaltet Collection-Achievements beim ersten Check frei", () => {
    const state = createGame({ name: "Test" }, content, 1);
    // Bestiarium-Stand eines Alt-Saves simulieren: 60 entdeckte Items, aber (durch Verkäufe)
    // fast kein Besitz mehr — der alte Union-Zähler hätte hier ~0 gemeldet.
    const itemIds = Object.keys(content.items).slice(0, 60);
    expect(itemIds.length).toBe(60);
    state.discoveredItems = Object.fromEntries(itemIds.map((id) => [id, true as const]));
    state.inventory.slots = state.inventory.slots.map(() => null);
    state.bank = {};
    state.seenDrops = {};
    const newly = checkAchievements(state, content);
    expect(newly).toContain("ach_discovered_10");
    expect(newly).toContain("ach_discovered_50");
    expect(newly).not.toContain("ach_discovered_100");
  });

  it("wertet pets_owned aus (erfüllt erst ab genug besessenen Pets)", () => {
    const state = createGame({ name: "Test" }, content, 1);
    // Frischer Spieler besitzt noch keine Pets → 3er-Schwelle nicht erfüllt.
    expect(achievementMet(state, { type: "pets_owned", count: 3 })).toBe(false);

    // Besitz wird als Record<PetId, true> gehalten; drei Einträge ⇒ Schwelle erreicht.
    state.character.ownedPets = { pet_a: true, pet_b: true, pet_c: true };
    expect(achievementMet(state, { type: "pets_owned", count: 3 })).toBe(true);
    expect(achievementMet(state, { type: "pets_owned", count: 4 })).toBe(false);
  });

  it("wertet paragon_floor aus: Fortschritt = paragon.best (Rekord), earned ab best ≥ count", () => {
    const state = createGame({ name: "Test" }, content, 1);
    const cond = { type: "paragon_floor", count: 5 } as const;
    // Frischer Spieler: Rekord 0 → 0/5.
    expect(achievementProgress(state, cond, content)).toBe(0);
    expect(achievementMet(state, cond, content)).toBe(false);
    // Rekord 3 → Fortschritt 3/5, noch nicht erfüllt.
    state.paragon = { checkpoint: 3, best: 3 };
    expect(achievementProgress(state, cond, content)).toBe(3);
    expect(achievementMet(state, cond, content)).toBe(false);
    // Rekord 5 → erfüllt; funktioniert auch OHNE content-Argument (rein state-basiert).
    state.paragon = { checkpoint: 5, best: 5 };
    expect(achievementMet(state, cond, content)).toBe(true);
    expect(achievementMet(state, cond)).toBe(true);
    // Tod-Reset (checkpoint → 0) senkt den Fortschritt NICHT — best ist strikt monoton.
    state.paragon.checkpoint = 0;
    expect(achievementProgress(state, cond)).toBe(5);
    expect(achievementMet(state, cond)).toBe(true);
    // Unlock über den echten Choke-Point (checkAchievements) mit synthetischer Def.
    const c: ContentDB = {
      ...content,
      achievements: [
        ...content.achievements,
        {
          id: "ach_test_paragon_5",
          name: "Fünf Etagen",
          description: "Erreiche Etage 5 des Paragonturms.",
          category: "combat",
          rarity: "rare",
          condition: { type: "paragon_floor", count: 5 },
        },
      ],
    };
    const newly = checkAchievements(state, c);
    expect(newly).toContain("ach_test_paragon_5");
  });

  it("wertet sets_completed aus (zählt vollständig BESESSENE Sets, nicht nur getragene)", () => {
    // Ein Set gilt als „vollständig", sobald ALLE Teile irgendwo im Besitz sind (Equipment,
    // Inventar, Bank, Vault …) — nicht erst, wenn sie GETRAGEN werden (max. ~3 Slots, sonst wären
    // 5/10 unerreichbar).
    const c = {
      ...content,
      sets: [
        {
          id: "test_set",
          name: { en: "Test Set", de: "Test-Set" },
          pieces: ["set_a", "set_b", "set_c"],
          minPieces: 2,
          bonus: {},
        },
      ],
    };
    const state = createGame({ name: "Test" }, content, 1);

    // Ohne Teile: nicht erfüllt — und ohne Content liefert der Progress defensiv 0.
    expect(achievementMet(state, { type: "sets_completed", count: 1 }, c)).toBe(false);
    expect(achievementMet(state, { type: "sets_completed", count: 1 })).toBe(false);

    // Teile über verschiedene Besitz-Quellen verstreut (NICHT alle getragen) → Set vollständig.
    state.character.equipment.helmet = "set_a"; // getragen
    state.inventory.slots[0] = { itemId: "set_b", qty: 1 }; // im Inventar
    state.bank["set_c"] = 1; // in der Bank
    expect(achievementMet(state, { type: "sets_completed", count: 1 }, c)).toBe(true);
    expect(achievementMet(state, { type: "sets_completed", count: 2 }, c)).toBe(false);
  });

  it("sets_completed: 5 vollständig besessene Sets erfüllen ach_sets_completed_5", () => {
    // 6 synthetische Sets; der Spieler besitzt alle Teile von genau 5 davon (das 6. fehlt ein Teil).
    const sets = Array.from({ length: 6 }, (_, i) => ({
      id: `set_${i}`,
      name: { en: `Set ${i}`, de: `Set ${i}` },
      pieces: [`s${i}_a`, `s${i}_b`, `s${i}_c`],
      minPieces: 2,
      bonus: {},
    }));
    const c = { ...content, sets };
    const state = createGame({ name: "Test" }, content, 1);

    // Vollständiger Besitz für Sets 0..4 (alle drei Teile), gemischte Quellen.
    for (let i = 0; i < 5; i++) {
      state.bank[`s${i}_a`] = 1;
      state.inventory.slots[i] = { itemId: `s${i}_b`, qty: 1 };
      state.bank[`s${i}_c`] = 1;
    }
    // Set 5 nur unvollständig (ein Teil fehlt) → zählt nicht.
    state.bank["s5_a"] = 1;
    state.bank["s5_b"] = 1;

    expect(achievementMet(state, { type: "sets_completed", count: 5 }, c)).toBe(true);
    expect(achievementMet(state, { type: "sets_completed", count: 6 }, c)).toBe(false);

    const newly = checkAchievements(state, c);
    expect(newly).toContain("ach_sets_completed_5");
    expect(newly).toContain("ach_sets_completed_1");
    expect(newly).not.toContain("ach_sets_completed_10");
  });

  it("sets_completed: Breakpoint-Sets mit identischen Teilen zählen als EINS (Slayer-Dedup)", () => {
    // Zwei Set-Defs teilen sich EXAKT dieselben Teile (Slayer-Breakpoint-Muster: slayer_set /
    // slayer_set_4pc). Voller Besitz darf nur EIN vollständiges Set zählen, nicht +2 — sonst würde
    // `ownedSetsCount` die Zahl distinkter Sets überschreiten und ach_sets_all (Vollsammlung) liesse
    // sich mit einem fehlenden Nicht-Slayer-Set holen.
    const c = {
      ...content,
      sets: [
        { id: "twin_a", name: { en: "Twin A", de: "Twin A" }, pieces: ["tw_x", "tw_y"], minPieces: 2, bonus: {} },
        { id: "twin_b", name: { en: "Twin B", de: "Twin B" }, pieces: ["tw_x", "tw_y"], minPieces: 2, bonus: {} },
        { id: "other", name: { en: "Other", de: "Anderes" }, pieces: ["ot_a", "ot_b"], minPieces: 2, bonus: {} },
      ],
    };
    const state = createGame({ name: "Test" }, content, 1);
    // Beide Zwillings-Defs vollständig besessen → zählt als 1 (dedup), nicht 2.
    state.bank["tw_x"] = 1;
    state.bank["tw_y"] = 1;
    expect(achievementMet(state, { type: "sets_completed", count: 1 }, c)).toBe(true);
    expect(achievementMet(state, { type: "sets_completed", count: 2 }, c)).toBe(false);
    // Plus das dritte, distinkte Set → jetzt 2 distinkte, nie 3.
    state.bank["ot_a"] = 1;
    state.bank["ot_b"] = 1;
    expect(achievementMet(state, { type: "sets_completed", count: 2 }, c)).toBe(true);
    expect(achievementMet(state, { type: "sets_completed", count: 3 }, c)).toBe(false);
  });

  it("Guard: ach_sets_all verlangt genau die Zahl DISTINKTER Sets (kein Breakpoint-Doppelzählen)", () => {
    // Distinkte Sets über die kanonische Teile-Signatur (identische-Teile-Breakpoints zählen einmal).
    const distinct = new Set(content.sets.map((s) => [...s.pieces].sort().join("|")));
    const all = content.achievements.find((a) => a.id === "ach_sets_all");
    expect(all, "ach_sets_all existiert").toBeTruthy();
    // Der Vollsammler-Meilenstein muss die Zahl DISTINKTER Sets verlangen — nicht die (grössere) Zahl
    // an Set-Defs. Sonst wäre „Master of All Sets" ohne echte Vollsammlung (ein Nicht-Slayer-Set fehlt) machbar.
    expect(all!.condition.count).toBe(distinct.size);
  });

  it("Guard: kein Achievement fordert mehr, als der Content hergibt (1.0-Blocker-Fix 21.08.)", () => {
    // Dauer-Guard gegen rechnerisch unerreichbare Erfolge (Fund: ach_total_level_2000/_2079
    // verlangten 2000/2079 bei nur 20×99=1980 möglichem Gesamtlevel — Erfolgs-IDs bleiben aus
    // Save-Kompatibilitätsgründen unverändert, nur count/Text wurden korrigiert). Deckt alle
    // condition.types ab, deren Obergrenze direkt aus einer endlichen Content-Menge folgt;
    // rein kumulative Zähler (Kills, gesammelte/craftete Items, Gold, Streaks, Dungeon-Clears)
    // haben KEIN inhärentes Content-Maximum (immer weiter grindbar) und bleiben hier absichtlich
    // aussen vor.
    const skillLevelCap = 99; // MASTER_CAPE_LEVEL — Level-Deckel, den jede Fertigkeit teilt.
    const maxTotalLevel = Object.keys(content.skills).length * skillLevelCap;
    const maxPets = Object.keys(content.pets).length;
    const maxDistinctSets = new Set(content.sets.map((s) => [...s.pieces].sort().join("|"))).size;
    const maxItems = Object.keys(content.items).length;
    const maxQuests = content.quests.length;
    // Achievements 1.2.0: Content-Obergrenzen der neuen Typen (Audit § 2.5).
    const maxMonsters = Object.keys(content.monsters).length;
    const maxDungeonsDistinct = content.dungeons.filter((d) => d.id !== "paragon_tower").length;
    const maxSlayerFloor = Math.max(...Object.values(content.monsters).map((m) => m.slayerFloor ?? 0));
    const maxElites = Object.keys(content.elites ?? {}).length;
    const maxBuildings = (content.campBuildings ?? []).length;
    const maxActions = Object.keys(content.actions).length;
    const maxDailies = content.quests.filter((q) => q.daily).length;
    const maxRunes = Object.values(content.items).filter((i) => i.rune).length;

    const ceilings: Partial<Record<AchievementConditionType, number>> = {
      total_level: maxTotalLevel,
      skill_level: skillLevelCap,
      pets_owned: maxPets,
      sets_completed: maxDistinctSets,
      items_discovered: maxItems,
      quests_completed: maxQuests,
      monsters_discovered: maxMonsters,
      dungeons_distinct: maxDungeonsDistinct,
      slayer_floor: maxSlayerFloor,
      elite_variants: maxElites,
      elite_uniques: maxElites,
      camp_levels: maxBuildings * 3,
      camp_buildings: maxBuildings,
      mastery_maxed: maxActions,
      min_skill_level: skillLevelCap,
      dailies_distinct: maxDailies,
      bank_slots: MAX_BANK_SLOTS_PURCHASED,
      runes_discovered: maxRunes,
      farm_plots_planted: MAX_FARM_PLOTS,
    };

    for (const a of content.achievements) {
      const max = ceilings[a.condition.type];
      if (max === undefined) continue;
      expect(
        a.condition.count,
        `${a.id}: verlangt ${a.condition.count} (${a.condition.type}), aber der Content bietet nur ${max}`,
      ).toBeLessThanOrEqual(max);
    }
  });

  it("Guard: jeder im Content genutzte Condition-Typ wird vom Checker behandelt", () => {
    // Verhindert das „definiert-aber-nie-geprüft"-Muster: ein neuer Condition-Typ ohne
    // Switch-Zweig würde Achievements stumm nie freischalten.
    const used = new Set(content.achievements.map((a) => a.condition.type));
    const unhandled = [...used].filter((t) => !HANDLED.has(t));
    expect(unhandled, `nicht behandelte Condition-Typen: ${unhandled.join(", ")}`).toEqual([]);
  });

  it("Integrität: jede Def ist valide (IDs eindeutig, rarity/category/type gültig, target wo nötig)", () => {
    const ids = new Set<string>();
    const skills = new Set(Object.keys(content.skills));
    const monsters = new Set(Object.keys(content.monsters));
    const items = new Set(Object.keys(content.items));
    const dungeons = new Set(content.dungeons.map((d) => d.id));
    const quests = new Set(content.quests.map((q) => q.id));
    const zones = new Set(content.zones.map((z) => z.id));
    const elites = new Set(Object.keys(content.elites ?? {}));
    const buildings = new Set((content.campBuildings ?? []).map((b) => b.id));

    for (const a of content.achievements) {
      expect(ids.has(a.id), `doppelte Achievement-ID: ${a.id}`).toBe(false);
      ids.add(a.id);

      expect(VALID_RARITIES.has(a.rarity), `${a.id}: ungültige rarity ${a.rarity}`).toBe(true);
      expect(VALID_CATEGORIES.has(a.category), `${a.id}: ungültige category ${a.category}`).toBe(true);
      expect(HANDLED.has(a.condition.type), `${a.id}: unbekannter condition.type ${a.condition.type}`).toBe(true);
      expect(a.condition.count, `${a.id}: count muss > 0 sein`).toBeGreaterThan(0);
      expect(achievementPoints(a), `${a.id}: AP muss > 0 sein`).toBeGreaterThan(0);

      const t = a.condition.target;
      if (TARGET_REQUIRED.has(a.condition.type)) {
        expect(t, `${a.id}: ${a.condition.type} braucht ein target`).toBeTruthy();
      }
      // Wenn ein target angegeben ist, muss es im Content existieren (passend zum Typ).
      if (t) {
        if (a.condition.type === "skill_level") {
          expect(skills.has(t), `${a.id}: Skill ${t} existiert nicht`).toBe(true);
        } else if (a.condition.type === "monster_kills") {
          expect(monsters.has(t), `${a.id}: Monster ${t} existiert nicht`).toBe(true);
        } else if (a.condition.type === "items_crafted") {
          expect(items.has(t), `${a.id}: Item ${t} existiert nicht`).toBe(true);
        } else if (a.condition.type === "dungeons_cleared") {
          expect(dungeons.has(t), `${a.id}: Dungeon ${t} existiert nicht`).toBe(true);
        } else if (a.condition.type === "quests_completed") {
          expect(quests.has(t), `${a.id}: Quest ${t} existiert nicht`).toBe(true);
        } else if (a.condition.type === "zone_bestiary") {
          expect(zones.has(t), `${a.id}: Zone ${t} existiert nicht`).toBe(true);
        } else if (a.condition.type === "elite_kills") {
          expect(elites.has(t), `${a.id}: Champion ${t} existiert nicht`).toBe(true);
        } else if (a.condition.type === "camp_levels") {
          expect(buildings.has(t), `${a.id}: Lager-Gebäude ${t} existiert nicht`).toBe(true);
        }
      }
    }
  });

  it("AP-Score-Helper: earnedAP ≤ totalAP und monoton bei Unlock", () => {
    const state = createGame({ name: "Test" }, content, 1);
    expect(earnedAP(state, content)).toBe(0);
    const total = totalAP(content);
    expect(total).toBeGreaterThan(0);

    state.stats.kills = 10;
    checkAchievements(state, content);
    const earned = earnedAP(state, content);
    expect(earned).toBe(achievementPoints(content.achievements.find((a) => a.id === "ach_kills_10")!));
    expect(earned).toBeLessThanOrEqual(total);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// AP-Meilenstein-Belohnungen (Welle GG/collection-pip P1, SAVE_VERSION 66)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Synthetischer Content mit exakt kontrollierbarer AP-Quote: n common-Achievements (je 5 AP);
 * ach i verlangt total_kills ≥ i ⇒ kills = K schaltet genau K Stück frei = K/n der Quote.
 * Mit n = 20 ist JEDES freigeschaltete Achievement exakt ein 5-%-Schritt.
 */
function apContent(n: number): ContentDB {
  const achievements = Array.from({ length: n }, (_, i) => ({
    id: `ap_${i + 1}`,
    name: { en: `AP ${i + 1}`, de: `AP ${i + 1}` },
    description: { en: "test", de: "Test" },
    category: "combat" as const,
    rarity: "common" as const,
    condition: { type: "total_kills" as const, count: i + 1 },
  }));
  return { ...content, achievements };
}

/** Summe der Token-Staffel über alle Schritte 5..hi (inkl.). */
function tokensUpTo(hi: number): number {
  let sum = 0;
  for (let step = AP_MILESTONE_STEP_PCT; step <= hi; step += AP_MILESTONE_STEP_PCT) {
    sum += apMilestoneTokens(step);
  }
  return sum;
}

describe("AP-Meilensteine (Welle GG P1)", () => {
  it("Token-Staffel: jeder Schritt 5..100 hat einen Wert > 0; Gesamtsumme = 165 (gepinnt)", () => {
    for (let step = 5; step <= 100; step += 5) {
      expect(apMilestoneTokens(step), `Schritt ${step} ohne Token-Wert`).toBeGreaterThan(0);
    }
    expect(tokensUpTo(100)).toBe(165); // dokumentierte Staffel-Summe (shared AP_MILESTONE_TOKENS)
    expect(apMilestoneTokens(7)).toBe(0); // kein Tabellen-Schritt → defensiv 0
  });

  it("vergibt beim Choke-Point (checkAchievements) alle erreichten Schritte als EINEN Stapel (nachholend)", () => {
    const c = apContent(20);
    const s = createGame({ name: "Test" }, content, 1);
    s.stats.kills = 12; // 12/20 = 60 % Quote in EINEM Check (Alt-Save-Nachhol-Szenario)
    checkAchievements(s, c);

    const steps = Array.from({ length: 12 }, (_, i) => (i + 1) * 5); // 5..60
    expect(s.claimedApMilestones).toEqual(steps);
    expect(s.character.questTokens).toBe(tokensUpTo(60));
    // EIN Breadcrumb-Stapel mit eigener seq (Muster lastPetDrop, Lehre Welle DD).
    expect(s.lastApMilestone).toEqual({ steps, tokens: tokensUpTo(60), seq: 1 });
    expect(s.apMilestoneSeq).toBe(1);
    expect(s.apCeremonyPending).toBe(false); // 100 % nicht erreicht
  });

  it("ist idempotent: erneuter Check vergibt nichts doppelt und stempelt keinen neuen Breadcrumb", () => {
    const c = apContent(20);
    const s = createGame({ name: "Test" }, content, 1);
    s.stats.kills = 12;
    checkAchievements(s, c);
    const tokens = s.character.questTokens;
    const crumb = s.lastApMilestone;

    checkAchievements(s, c); // nichts Neues erreicht
    expect(s.character.questTokens).toBe(tokens);
    expect(s.claimedApMilestones).toHaveLength(12);
    expect(s.apMilestoneSeq).toBe(1);
    expect(s.lastApMilestone).toBe(crumb); // unangetastet (kein Re-Stempeln)
  });

  it("nächster Schritt nach UI-Quittung: neuer Stapel mit ECHT höherer seq", () => {
    const c = apContent(20);
    const s = createGame({ name: "Test" }, content, 1);
    s.stats.kills = 12;
    checkAchievements(s, c);
    s.lastApMilestone = null; // UI quittiert

    s.stats.kills = 13; // 65 %
    checkAchievements(s, c);
    expect(s.lastApMilestone).toEqual({ steps: [65], tokens: apMilestoneTokens(65), seq: 2 });
    expect(s.character.questTokens).toBe(tokensUpTo(65));
  });

  it("100 % setzt das Zeremonie-Flag und zahlt die volle Staffel", () => {
    const c = apContent(20);
    const s = createGame({ name: "Test" }, content, 1);
    s.stats.kills = 20; // alle 20 → 100 %
    checkAchievements(s, c);
    expect(s.claimedApMilestones).toHaveLength(20);
    expect(s.character.questTokens).toBe(165);
    expect(s.apCeremonyPending).toBe(true);
  });

  it("Content-Wachstum senkt die Quote: vergebene Schritte bleiben, nichts wird neu vergeben/zurückgefordert", () => {
    const s = createGame({ name: "Test" }, content, 1);
    s.stats.kills = 12;
    checkAchievements(s, apContent(20)); // 60 % → Schritte 5..60 vergeben
    const tokens = s.character.questTokens;

    // Content wächst auf 40 Achievements (200 AP) → dieselben 60 AP sind nur noch 30 % Quote.
    checkAchievements(s, apContent(40));
    expect(s.claimedApMilestones).toHaveLength(12); // claimed bleibt claimed (bis 60)
    expect(s.character.questTokens).toBe(tokens); // kein Doppel-Grant, kein Rückzug
    expect(s.apMilestoneSeq).toBe(1); // kein neuer Stapel
  });

  it("exakte Quoten-Grenze in Ganzzahl-Arithmetik: 7/20 = exakt 35 % vergibt den 35er-Schritt", () => {
    // 7/20 ist als Float 0.34999… — die Vergabe rechnet earned·100 ≥ step·total (exakt).
    const c = apContent(20);
    const s = createGame({ name: "Test" }, content, 1);
    s.stats.kills = 7;
    checkAchievements(s, c);
    expect(s.claimedApMilestones).toContain(35);
    expect(s.claimedApMilestones).toHaveLength(7);
  });

  it("ohne Achievement-Content (totalAP 0) ist die Vergabe ein No-op", () => {
    const s = createGame({ name: "Test" }, content, 1);
    expect(checkApMilestones(s, { ...content, achievements: [] })).toEqual([]);
    expect(s.character.questTokens).toBe(0);
    expect(s.lastApMilestone).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Achievements 1.2.0 (Chef-Entscheid 27.08.2026, design/achievements-1.2.0/audit.md § 2.5):
// neue Bedingungstypen — je Typ ein Test gegen den echten Content, rein lesend aus bestehendem State.
// ───────────────────────────────────────────────────────────────────────────

describe("Achievements 1.2.0 — neue Bedingungstypen", () => {
  const fresh = () => createGame({ name: "Test" }, content, 1);

  it("quests_completed mit target: 1/0 aus quests.claimed (Chronik-Kapitel), ohne target weiterhin Anzahl", () => {
    const s = fresh();
    const cond = { type: "quests_completed", target: "chronicle_01", count: 1 } as const;
    expect(achievementProgress(s, cond)).toBe(0);
    s.quests.completed.push("chronicle_01"); // nur erfüllt, noch nicht abgeholt → zählt NICHT
    expect(achievementProgress(s, cond)).toBe(0);
    s.quests.claimed.push("chronicle_01");
    expect(achievementProgress(s, cond)).toBe(1);
    expect(achievementProgress(s, { type: "quests_completed", count: 1 })).toBe(1);
    const newly = checkAchievements(s, content);
    expect(newly).toContain("ach_chapter_01");
    expect(newly).not.toContain("ach_chapter_02");
  });

  it("monsters_discovered zählt nur Content-Monster mit ≥ 1 Kill; zone_bestiary = MIN der Zone", () => {
    const s = fresh();
    expect(achievementProgress(s, { type: "monsters_discovered", count: 1 }, content)).toBe(0);
    s.monsterKills["chicken"] = 3;
    s.monsterKills["cow"] = 1;
    s.monsterKills["nicht_existent"] = 99;
    expect(achievementProgress(s, { type: "monsters_discovered", count: 1 }, content)).toBe(2);
    expect(achievementProgress(s, { type: "monsters_discovered", count: 1 })).toBe(0); // ohne Content defensiv 0

    const pastures = Object.values(content.monsters).filter((m) => m.zone === "pastures");
    expect(pastures.length).toBeGreaterThan(2);
    const zone = { type: "zone_bestiary", target: "pastures", count: 1 } as const;
    expect(achievementProgress(s, zone, content)).toBe(0); // boar & Co. noch 0 → MIN 0
    for (const m of pastures) s.monsterKills[m.id] = 5;
    s.monsterKills["chicken"] = 100;
    expect(achievementProgress(s, zone, content)).toBe(5); // der Balken zeigt das schwächste Glied
    expect(achievementMet(s, zone, content)).toBe(true);
    expect(achievementMet(s, { type: "zone_bestiary", target: "pastures", count: 100 }, content)).toBe(false);
    expect(achievementProgress(s, { type: "zone_bestiary", target: "gibt_es_nicht", count: 1 }, content)).toBe(0);
    expect(checkAchievements(s, content)).toContain("ach_zone_pastures_1");
  });

  it("dungeons_distinct zählt Dungeons mit ≥ 1 Clear — ohne Paragonturm, ohne Unbekannte", () => {
    const s = fresh();
    s.dungeonsCleared["goblin_warband"] = 3;
    s.dungeonsCleared["crypt_depths"] = 1;
    s.dungeonsCleared["paragon_tower"] = 10; // eigene Leiter, zählt nicht
    s.dungeonsCleared["fremd"] = 5;
    expect(achievementProgress(s, { type: "dungeons_distinct", count: 1 }, content)).toBe(2);
    expect(achievementProgress(s, { type: "dungeons_distinct", count: 1 })).toBe(3); // ohne Content: nur Paragon-Filter
    const newly = checkAchievements(s, content);
    expect(newly).toContain("ach_dungeons_distinct_1");
    expect(newly).not.toContain("ach_dungeons_distinct_all");
  });

  it("slayer_tasks / slayer_streak lesen die Slayer-Zähler; slayer_floor = höchste Etage mit Kill", () => {
    const s = fresh();
    s.slayerTasksCompleted = 100;
    s.slayerStreak = 10;
    expect(achievementProgress(s, { type: "slayer_tasks", count: 1 })).toBe(100);
    expect(achievementProgress(s, { type: "slayer_streak", count: 1 })).toBe(10);
    expect(achievementProgress(s, { type: "slayer_floor", count: 1 }, content)).toBe(0);
    s.monsterKills["rot_rat"] = 1; // Etage 1
    expect(achievementProgress(s, { type: "slayer_floor", count: 1 }, content)).toBe(1);
    s.monsterKills["dread_knight"] = 1; // Etage 5
    expect(achievementProgress(s, { type: "slayer_floor", count: 1 }, content)).toBe(5);
    const newly = checkAchievements(s, content);
    expect(newly).toEqual(expect.arrayContaining(["ach_slayer_tasks_100", "ach_slayer_streak_10", "ach_slayer_floor_5", "ach_slayer_floor_1"]));
  });

  it("elite_kills (Σ / Variante), elite_variants, elite_uniques aus dem Champion-Kodex", () => {
    const s = fresh();
    s.eliteCodex = {
      elite_pastures_boar: { sightings: 3, kills: 2, uniques: 1, fastestKillMs: null },
      elite_idol_warden: { sightings: 1, kills: 1, uniques: 0, fastestKillMs: null },
      verwaist: { sightings: 1, kills: 5, uniques: 5, fastestKillMs: null },
    };
    expect(achievementProgress(s, { type: "elite_kills", count: 1 })).toBe(8);
    expect(achievementProgress(s, { type: "elite_kills", target: "elite_idol_warden", count: 1 })).toBe(1);
    expect(achievementProgress(s, { type: "elite_kills", target: "elite_black_witch", count: 1 })).toBe(0);
    expect(achievementProgress(s, { type: "elite_variants", count: 1 }, content)).toBe(2); // verwaist gefiltert
    expect(achievementProgress(s, { type: "elite_uniques", count: 1 }, content)).toBe(1);
    const newly = checkAchievements(s, content);
    expect(newly).toEqual(expect.arrayContaining(["ach_elite_first", "ach_elite_idol_warden", "ach_elite_uniques_1"]));
    expect(newly).not.toContain("ach_elite_kills_10");
  });

  it("camp_levels (Σ / Gebäude) und camp_buildings aus dem Lager-Zustand", () => {
    const s = fresh();
    expect(achievementProgress(s, { type: "camp_levels", count: 1 })).toBe(0);
    s.camp.buildings = { camp_townhall: 3, camp_sawpit: 1, camp_watchtower: 2 };
    expect(achievementProgress(s, { type: "camp_levels", count: 1 })).toBe(6);
    expect(achievementProgress(s, { type: "camp_levels", target: "camp_townhall", count: 3 })).toBe(3);
    expect(achievementProgress(s, { type: "camp_levels", target: "camp_smelter", count: 1 })).toBe(0);
    expect(achievementProgress(s, { type: "camp_buildings", count: 1 })).toBe(3);
    const newly = checkAchievements(s, content);
    expect(newly).toEqual(expect.arrayContaining(["ach_camp_first", "ach_camp_townhall_3"]));
    expect(newly).not.toContain("ach_camp_levels_30");
  });

  it("mastery_maxed zählt Aktionen auf MASTERY_MAX_LEVEL; min_skill_level ist das schwächste Skill-Level", () => {
    const s = fresh();
    const actionIds = Object.keys(content.actions).slice(0, 3);
    for (const id of actionIds) s.mastery[id] = { xp: xpForLevel(MASTERY_MAX_LEVEL) };
    s.mastery["fremde_aktion"] = { xp: xpForLevel(MASTERY_MAX_LEVEL) };
    s.mastery[Object.keys(content.actions)[5]!] = { xp: xpForLevel(98) };
    expect(achievementProgress(s, { type: "mastery_maxed", count: 1 }, content)).toBe(3);
    expect(checkAchievements(s, content)).toContain("ach_mastery_1");

    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(60) };
    expect(achievementProgress(s, { type: "min_skill_level", count: 50 }, content)).toBe(60);
    s.skills["slayer"] = { xp: xpForLevel(12) };
    expect(achievementProgress(s, { type: "min_skill_level", count: 50 }, content)).toBe(12);
  });

  it("dailies_distinct zählt nur Daily-IDs in claimed (je einmal); bank_slots liest bankSlotsPurchased", () => {
    const s = fresh();
    const dailies = content.quests.filter((q) => q.daily).map((q) => q.id);
    expect(dailies.length).toBeGreaterThanOrEqual(10);
    s.quests.claimed.push("chronicle_01", ...dailies.slice(0, 10));
    expect(achievementProgress(s, { type: "dailies_distinct", count: 1 }, content)).toBe(10);
    expect(achievementProgress(s, { type: "dailies_distinct", count: 1 })).toBe(0);
    s.bankSlotsPurchased = 10;
    expect(achievementProgress(s, { type: "bank_slots", count: 10 })).toBe(10);
    const newly = checkAchievements(s, content);
    expect(newly).toEqual(expect.arrayContaining(["ach_dailies_10", "ach_bank_slots_10"]));
  });

  it("food_cooked summiert craftedById über Kochen-Outputs; runes_discovered zählt entdeckte Runen", () => {
    const s = fresh();
    const cooking = Object.values(content.actions).filter((a) => a.skill === "cooking");
    expect(cooking.length).toBeGreaterThan(0);
    const dish = cooking[0]!.loot[0]!.itemId;
    s.stats.craftedById[dish] = 60;
    s.stats.craftedById["bronze_bar"] = 500; // kein Gericht
    expect(achievementProgress(s, { type: "food_cooked", count: 1 }, content)).toBe(60);

    const runes = Object.values(content.items).filter((i) => i.rune).map((i) => i.id);
    expect(runes.length).toBeGreaterThanOrEqual(10);
    for (const id of runes.slice(0, 10)) s.discoveredItems[id] = true;
    s.discoveredItems["copper_ore"] = true;
    expect(achievementProgress(s, { type: "runes_discovered", count: 1 }, content)).toBe(10);
    expect(checkAchievements(s, content)).toContain("ach_runes_10");
  });

  it("farm_plots_planted, deaths und play_hours (volle aktive Stunden, nie Offline-Zeit)", () => {
    const s = fresh();
    expect(achievementProgress(s, { type: "farm_plots_planted", count: 9 })).toBe(0);
    for (const p of s.farmPlots) p.cropId = "graywort_seed";
    expect(achievementProgress(s, { type: "farm_plots_planted", count: 9 })).toBe(s.farmPlots.length);

    s.stats.deaths = 1;
    expect(achievementProgress(s, { type: "deaths", count: 1 })).toBe(1);
    s.elapsedMs = 200 * 3_600_000;
    s.activePlayMs = 100 * 3_600_000 - 1; // knapp unter 100 h
    expect(achievementProgress(s, { type: "play_hours", count: 100 })).toBe(99);
    s.activePlayMs = 100 * 3_600_000;
    expect(achievementProgress(s, { type: "play_hours", count: 100 })).toBe(100);
    const newly = checkAchievements(s, content);
    expect(newly).toEqual(expect.arrayContaining(["ach_deaths_1", "ach_play_hours_10", "ach_play_hours_100", "ach_farm_ninefold"]));
  });

  it("Alt-Save-Nachholung: Chronik-Kapitel, Bestiarium und Champions werden beim ersten Check rückwirkend freigeschaltet", () => {
    const s = fresh();
    // Bestandsspieler mit Kapitel 1–5, 30 entdeckten Monstern, einem Champion-Kill — ohne je ein
    // Achievement gesehen zu haben (die Defs sind neu). Ein Check reicht.
    for (let n = 1; n <= 5; n++) s.quests.claimed.push(`chronicle_0${n}`);
    for (const id of Object.keys(content.monsters).slice(0, 30)) s.monsterKills[id] = 1;
    s.eliteCodex = { elite_pastures_boar: { sightings: 1, kills: 1, uniques: 0, fastestKillMs: null } };
    const newly = checkAchievements(s, content);
    for (let n = 1; n <= 5; n++) expect(newly).toContain(`ach_chapter_0${n}`);
    expect(newly).toContain("ach_bestiary_25");
    expect(newly).toContain("ach_elite_first");
    // Entfernte IDs aus einem Alt-Save bleiben harmlos stehen und zählen 0 AP.
    s.achievements.push("ach_kills_chicken_10", "ach_skill_mining_20", "ach_total_level_2079");
    const before = earnedAP(s, content);
    expect(checkAchievements(s, content)).toEqual([]);
    expect(earnedAP(s, content)).toBe(before);
  });

  it("hidden ist reines Anzeige-Metadatum: versteckte Erfolge schalten identisch frei", () => {
    const hidden = content.achievements.filter((a) => a.hidden);
    expect(hidden.length).toBe(12);
    const s = fresh();
    s.stats.deaths = 1;
    expect(checkAchievements(s, content)).toContain("ach_deaths_1");
  });
});
