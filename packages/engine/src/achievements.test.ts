import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  AP_MILESTONE_STEP_PCT,
  apMilestoneTokens,
  earnedAP,
  totalAP,
  achievementPoints,
  type AchievementConditionType,
  type ContentDB,
} from "@hearthforge/shared";
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
