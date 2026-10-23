import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, CropDef, GameState, HuntZoneDef, ItemDef, ItemInstance, MonsterDef } from "@hearthforge/shared";
import {
  BAIT_ITEM_ID,
  HUNTING_SKILL_ID,
  PARAGON_DUNGEON_ID,
  PRESTIGE_HEIRLOOM_MIN_REQUIREMENT,
  PRESTIGE_RECALL_MAX_CHAPTER,
  PRESTIGE_STASH_STACK_CAP,
  PRESTIGE_TALENT_TREE_ID,
  PRESTIGE_UNLOCK_QUEST_ID,
  TALENT_EFFECT_AGGREGATION,
  TALENT_EFFECT_FORMAT,
  chronicleChapterNumber,
  prestigeMasteredAchievementId,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { levelFromXp, xpForLevel } from "./leveling";
import { computeStats } from "./character";
import { mintInstanceId } from "./enchant";
import { addItem, itemCount } from "./inventory";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { combatStep, startCombat } from "./combat";
import { recordKillForSlayer } from "./slayer";
import { claimQuest, questStatus } from "./quests";
import { sellStack } from "./shop";
import { isDungeonUnlocked } from "./dungeon";
import { collectMail, grantLoot, mailCollectBlocked } from "./mail";
import { plantCrop } from "./farming";
import { setHuntTrap } from "./hunting";
import { secondPetSlotOwned, secondPetSlotUnlocked } from "./pets";
import { canBuyTalent, findTalentTree, talentEffect, talentEffectOwned, talentTreeUnlocked } from "./talents";
import { goldFindMult, prestigeSkillXpMult, talentDamageMult, talentMaxHpMult } from "./prestige-effects";
import {
  PRESTIGE_STATE_FIELDS,
  ascend,
  itemMaxRequirement,
  prestigeAscendCheck,
  prestigeAscendPreview,
  prestigeHeirloomEligible,
  prestigePointsPreview,
  prestigeRecallChapter,
  prestigeRecallCheck,
  prestigeRecallChronicle,
  prestigeRecallableChapters,
  prestigeStashEligible,
} from "./prestige";

// claude:2026-10-18T12:00:00+02:00 — Prestige Welle B2 („Der Aschesturz", Chef-Entscheide 18.10.2026):
// Siegel-Formel (Balance § 4), Narbenbuch-Baum + Freischaltung, jeder Knoten-Leser, Erinnerungs-Grenzen,
// Erbstück-Anforderung, Truhen-Deckel, Instanz-Mitnahme, Jägerkodex-Gate, Post-Sperre.

const SKILLS = Object.keys(content.skills);
const PETS = Object.keys(content.pets);

function fresh(seed = 7): GameState {
  return createGame({ name: "Asche", portrait: "char_3" }, content, seed);
}

function setLevel(s: GameState, skillId: string, level: number): void {
  s.skills[skillId] = { xp: xpForLevel(level) };
}

function claim(s: GameState, ...ids: string[]): void {
  for (const id of ids) if (!s.quests.claimed.includes(id)) s.quests.claimed.push(id);
}

/** Aufstiegsbereit (4×99 + Kapitel 21), sonst schlank. */
function ready(seed = 7): GameState {
  const s = fresh(seed);
  for (const id of SKILLS.slice(0, 4)) setLevel(s, id, 99);
  claim(s, PRESTIGE_UNLOCK_QUEST_ID);
  return s;
}

/** Narbenbuch-Ränge direkt setzen (Kauf-Logik prüft talents.test.ts); ein Aufstieg schaltet den Baum frei. */
function scars(s: GameState, ranks: Record<string, number>, count = Math.max(1, s.prestige.count)): void {
  s.prestige.count = count;
  s.talents = { ...s.talents, [PRESTIGE_TALENT_TREE_ID]: { ...ranks } };
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

/** Ausrüstung mit höchster Anforderung ≥ / < 80 aus dem echten Katalog (kein Id-Hardcoding). */
const HEIRLOOM_OK = Object.values(content.items).find((i) => prestigeHeirloomEligible(i) && i.slot !== "mainhand")!;
const HEIRLOOM_OK2 = Object.values(content.items).find((i) => prestigeHeirloomEligible(i) && i.id !== HEIRLOOM_OK.id && i.slot !== "mainhand")!;
const HEIRLOOM_LOW = Object.values(content.items).find(
  (i) => i.type === "equipment" && i.slot && itemMaxRequirement(i) >= 60 && itemMaxRequirement(i) < PRESTIGE_HEIRLOOM_MIN_REQUIREMENT,
)!;

// ───────────────────────────────────────────────────────────────────────────

describe("Siegel-Formel (Balance § 4)", () => {
  /** Spielstand mit genau `n99` × 99, Gesamtstufe `tl`, `late` Band-2-Kapiteln und Paragon-Bestetage `best`. */
  function profile(n99: number, tl: number, late: number, best: number): GameState {
    const s = fresh();
    SKILLS.forEach((id, i) => setLevel(s, id, i < n99 ? 99 : 1));
    const rest = SKILLS.slice(n99);
    let remaining = tl - 99 * n99;
    if (rest.length === 0) expect(remaining).toBe(0);
    rest.forEach((id, i) => {
      const left = rest.length - i;
      const lvl = Math.ceil(remaining / left);
      expect(lvl).toBeGreaterThanOrEqual(1);
      expect(lvl).toBeLessThanOrEqual(98);
      setLevel(s, id, lvl);
      remaining -= lvl;
    });
    claim(s, ...Array.from({ length: late }, (_, i) => `chronicle_${22 + i}`));
    s.paragon = { checkpoint: 0, best };
    return s;
  }

  it("Beispieltabelle: Minimum 47, typisch 51, neun 99er 65, Band 2 komplett 64, alles 99 139 (23 Fertigkeiten)", () => {
    const rows: Array<[number, number, number, number, number]> = [
      [4, 1250, 0, 0, 47],
      [5, 1320, 0, 0, 51],
      [9, 1400, 0, 0, 65],
      [5, 1350, 6, 0, 64],
      // claude:2026-10-24T21:15:00+02:00 — 1.4.0 FK: Bognerei ist die 23. Fertigkeit; „alles 99“ = 23 × 99 (war 22 × 99 → 134).
      [23, 2277, 6, 30, 139],
    ];
    for (const [n99, tl, late, best, want] of rows) {
      const p = prestigePointsPreview(profile(n99, tl, late, best), content);
      expect(p.totalLevel, `TL ${tl}`).toBe(tl);
      expect(p.total, `${n99}×99 / TL ${tl} / ${late} Kap. / Paragon ${best}`).toBe(want);
      expect(p.fromBase).toBe(10);
    }
  });

  it("Paragon-Anteil gedeckelt auf 10; „Der tiefere Schnitt“ ×1,25 abgerundet, Zuschlag ausgewiesen", () => {
    const s = profile(5, 1320, 0, 999);
    expect(prestigePointsPreview(s, content).fromParagon).toBe(10);
    s.paragon.best = 0;
    scars(s, { pointsBoost: 1 });
    const p = prestigePointsPreview(s, content);
    expect(p.subtotal).toBe(51);
    expect(p.pointsMult).toBe(0.25);
    expect(p.total).toBe(63); // floor(51 × 1,25)
    expect(p.fromMult).toBe(12);
  });
});

describe("Narbenbuch: Content-Baum und Freischaltung", () => {
  const tree = findTalentTree(content, PRESTIGE_TALENT_TREE_ID)!;

  it("Baum `prestige` mit Währung prestigePoints, vier Äste, zwölf Knoten laut Balance § 5 (ohne Rabenvorrat)", () => {
    expect(tree).toBeDefined();
    expect(tree.currency).toBe("prestigePoints");
    expect(tree.unlock).toEqual({ prestigeCount: 1 });
    expect(tree.branches.map((b) => b.id)).toEqual(["legacy", "haste", "might", "crown"]);
    expect(tree.nodes.map((n) => n.id)).toEqual([
      "startingGold", "keepTools", "keepBankStacks", "keepEquipment",
      "earlyXp", "chronicleRecall", "masteredXp", "dungeonRecall",
      "maxHp", "damage", "goldFind", "pointsBoost",
    ]);
    expect(tree.nodes.some((n) => n.id === "queueSlot")).toBe(false);
    const total = tree.nodes.reduce((sum, n) => sum + n.costPerRank.reduce((a, b) => a + b, 0), 0);
    expect(total).toBe(489); // Balance 504 − Rabenvorrat 15
    for (const n of tree.nodes) {
      expect(n.costPerRank).toHaveLength(n.maxRank);
      expect(n.effect.perRank).toHaveLength(n.maxRank);
      for (const r of n.requires ?? []) expect(tree.nodes.some((x) => x.id === r.node), `${n.id} → ${r.node}`).toBe(true);
      expect(TALENT_EFFECT_AGGREGATION[n.effect.kind]).toBe("sum");
    }
    expect(TALENT_EFFECT_FORMAT.prestigeStartingGold).toBe("int");
    expect(TALENT_EFFECT_FORMAT.prestigeKeepBankStacks).toBe("int");
    expect(TALENT_EFFECT_FORMAT.prestigeKeepEquipment).toBe("int");
  });

  it("alle sieben Sprachen tragen Namen und Beschreibungen (Overlay eingemischt), {value} bleibt erhalten", () => {
    const langs = ["en", "de", "ru", "zh", "es", "fr", "pt-BR"] as const;
    const rec = (t: unknown): Record<string, string> => t as Record<string, string>;
    const texts = [tree.name, tree.description!, ...tree.branches.map((b) => b.name), ...tree.nodes.flatMap((n) => [n.name, n.description])].map(rec);
    for (const t of texts) for (const l of langs) expect(t[l], `${t.en} [${l}]`).toBeTruthy();
    for (const n of tree.nodes) {
      const needsValue = rec(n.description).en!.includes("{value}");
      for (const l of langs) expect(rec(n.description)[l]!.includes("{value}"), `${n.id} [${l}]`).toBe(needsValue);
    }
    // Natürliche Spieltexte: höchstens ein Gedankenstrich je Text.
    for (const t of texts) for (const l of langs) expect((t[l]!.match(/[–—]/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("vor dem ersten Aufstieg gesperrt, danach kaufbar", () => {
    const s = fresh();
    s.prestige.points = 100;
    expect(talentTreeUnlocked(s, tree)).toBe(false);
    expect(canBuyTalent(s, content, PRESTIGE_TALENT_TREE_ID, "earlyXp")).toEqual({ ok: false, reason: "locked" });
    s.prestige.count = 1;
    expect(canBuyTalent(s, content, PRESTIGE_TALENT_TREE_ID, "earlyXp")).toEqual({ ok: true, cost: 4 });
  });
});

describe("Jägerkodex-Gate (Chef 18.10.: wirkt nach dem Aufstieg erst wieder ab Slayer 85)", () => {
  function hunter(): GameState {
    const s = ready();
    setLevel(s, "slayer", 90);
    s.talents = { slayer: { tracking: 5, collar: 1, lore: 2 } };
    s.character.ownedPets = { [PETS[0]!]: true, [PETS[1]!]: true };
    s.character.companionPetId = PETS[0]!;
    s.character.companionPetId2 = PETS[1]!;
    return s;
  }

  it("ohne Aufstieg bit-identisch: gesperrt-wirksam == gekauft (Ränge gibt es nur ab 85)", () => {
    const s = hunter();
    for (const kind of ["petChanceMult", "familyDamage", "secondPetSlot", "petPity"] as const) {
      expect(talentEffect(s, content, kind)).toBe(talentEffectOwned(s, content, kind));
    }
    expect(talentEffect(s, content, "petChanceMult")).toBe(1.0);
    expect(secondPetSlotUnlocked(s, content)).toBe(true);
  });

  it("nach dem Aufstieg ruht der Kodex (Ränge und Platz-2-Wahl bleiben), ab Slayer 85 wirkt er wieder", () => {
    const s = hunter();
    expect(ascend(s, content)).toBe(true);
    expect(s.talents.slayer).toEqual({ tracking: 5, collar: 1, lore: 2 });
    expect(talentEffect(s, content, "petChanceMult")).toBe(0);
    expect(talentEffect(s, content, "familyDamage")).toBe(0);
    expect(secondPetSlotUnlocked(s, content)).toBe(false);
    expect(secondPetSlotOwned(s, content)).toBe(true);
    expect(s.character.companionPetId2).toBe(PETS[1]);
    setLevel(s, "slayer", 84);
    expect(talentEffect(s, content, "petChanceMult")).toBe(0);
    setLevel(s, "slayer", 85);
    expect(talentEffect(s, content, "petChanceMult")).toBe(1.0);
    expect(secondPetSlotUnlocked(s, content)).toBe(true);
  });
});

describe("Aufstieg mit Narbenbuch-Knoten", () => {
  it("Grabmünzen: Startgold 2.500 / 7.500 / 20.000; ohne Rang 0", () => {
    for (const [rank, gold] of [[0, 0], [1, 2500], [2, 7500], [3, 20000]] as const) {
      const s = ready();
      s.character.gold = 999_999;
      if (rank > 0) scars(s, { startingGold: rank }); // zweiter Durchgang (Ränge gibt es erst nach einem Aufstieg)
      expect(ascend(s, content)).toBe(true);
      expect(s.character.gold).toBe(gold);
    }
  });

  function toolOwner(): GameState {
    const s = ready();
    s.character.equipment.tool1 = "runite_pickaxe";
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    s.bank = { iron_pickaxe: 2, onyx: 5 };
    s.bankOrder = ["iron_pickaxe", "onyx"];
    return s;
  }

  it("Schwielen: alle Werkzeuge (getragen, Inventar, Lager) landen im neuen Lager; ohne Rang keines", () => {
    const without = toolOwner();
    expect(ascend(without, content)).toBe(true);
    expect(without.bank).toEqual({});

    const s = toolOwner();
    scars(s, { startingGold: 1, keepTools: 1 });
    expect(prestigeAscendPreview(s, content).tools).toEqual([
      { itemId: "runite_pickaxe", qty: 1 },
      { itemId: "bronze_pickaxe", qty: 1 },
      { itemId: "iron_pickaxe", qty: 2 },
    ]);
    expect(ascend(s, content)).toBe(true);
    expect(s.bank).toEqual({ runite_pickaxe: 1, bronze_pickaxe: 1, iron_pickaxe: 2 });
    expect(s.bankOrder.filter(Boolean).sort()).toEqual(["bronze_pickaxe", "iron_pickaxe", "runite_pickaxe"]);
    expect(s.character.equipment.tool1).toBeNull();
  });

  function hoarder(): GameState {
    const s = ready();
    addItem(s.inventory, content, "cooked_shrimp", 50);
    s.bank = {
      cooked_shrimp: 999, // + 50 im Inventar ⇒ 1.049, Deckel 50
      onyx: 30,
      copper_ore: 4000,
      iron_pickaxe: 1, // Werkzeug: nie Truhe
      paragon_key: 1, // Schlüssel: nie Truhe
      [HEIRLOOM_OK.id]: 1, // Ausrüstung: nie Truhe
    };
    s.bankOrder = Object.keys(s.bank);
    return s;
  }

  it("Vergrabene Truhe: Kandidaten nur Material/Verbrauchsgut (ohne Werkzeug/Schlüssel/Ausrüstung), je ≤ 50 Stück", () => {
    const s = hoarder();
    scars(s, { startingGold: 1, keepTools: 1, keepBankStacks: 1 });
    const pv = prestigeAscendPreview(s, content);
    expect(pv.stashSlots).toBe(5);
    expect(pv.stashStackCap).toBe(PRESTIGE_STASH_STACK_CAP);
    const ids = pv.stashCandidates.map((c) => c.itemId);
    expect(ids).toEqual(expect.arrayContaining(["cooked_shrimp", "onyx", "copper_ore"]));
    expect(ids).not.toContain("iron_pickaxe");
    expect(ids).not.toContain("paragon_key");
    expect(ids).not.toContain(HEIRLOOM_OK.id);
    expect(pv.stashCandidates.find((c) => c.itemId === "cooked_shrimp")).toEqual({ itemId: "cooked_shrimp", owned: 1049, keep: 50 });
    expect(pv.stashCandidates.find((c) => c.itemId === "onyx")).toEqual({ itemId: "onyx", owned: 30, keep: 30 });
    expect(prestigeStashEligible(content.items.paragon_key)).toBe(false);

    expect(ascend(s, content, { stash: ["cooked_shrimp", "onyx"] })).toBe(true);
    expect(s.bank).toEqual({ iron_pickaxe: 1, cooked_shrimp: 50, onyx: 30 }); // + Werkzeug (Schwielen)
  });

  it("Vergrabene Truhe: Vorgabe = wertvollste Stapel; zu viele oder ungültige Wahl ⇒ Aufstieg abgelehnt, State unverändert", () => {
    const s = hoarder();
    scars(s, { startingGold: 1, keepTools: 1, keepBankStacks: 1 });
    const pv = prestigeAscendPreview(s, content);
    expect(pv.stashDefault).toEqual(pv.stashCandidates.slice(0, 5).map((c) => c.itemId));

    const before = JSON.stringify(s);
    expect(prestigeAscendCheck(s, content, { stash: ["onyx", "onyx"] })).toEqual({ ok: false, reason: "stash_invalid" });
    expect(prestigeAscendCheck(s, content, { stash: ["iron_pickaxe"] })).toEqual({ ok: false, reason: "stash_invalid" });
    expect(prestigeAscendCheck(s, content, { stash: ["a", "b", "c", "d", "e", "f"] })).toEqual({ ok: false, reason: "stash_too_many" });
    expect(ascend(s, content, { stash: ["iron_pickaxe"] })).toBe(false);
    expect(JSON.stringify(s)).toBe(before);

    const t = clone(s);
    expect(ascend(t, content)).toBe(true);
    for (const id of pv.stashDefault) {
      expect(t.bank[id]).toBe(pv.stashCandidates.find((c) => c.itemId === id)!.keep);
    }
  });

  function heirInstance(id: string): ItemInstance {
    return {
      instanceId: id,
      baseItemId: HEIRLOOM_OK.id,
      affixes: [{ affixId: "test_affix", tier: 3 }],
      suffix: { suffixId: "test_suffix", ilvl: 90, roll: 0.75 },
    };
  }

  it("Erbstück: nur Anforderung ≥ 80; Instanz reist mit Affixen, Suffix und ID ins Lager; danach keine ID-Kollision", () => {
    expect(itemMaxRequirement(HEIRLOOM_OK)).toBeGreaterThanOrEqual(80);
    expect(HEIRLOOM_LOW).toBeDefined();
    const s = ready();
    s.nextInstanceSeq = 50;
    const inst = heirInstance("inst_40");
    s.inventory.instances.push(inst);
    s.bank = { [HEIRLOOM_LOW.id]: 1, [HEIRLOOM_OK2.id]: 2 };
    s.bankOrder = Object.keys(s.bank);
    scars(s, { startingGold: 1, keepTools: 1, keepBankStacks: 1, keepEquipment: 3 });

    const pv = prestigeAscendPreview(s, content);
    expect(pv.heirloomSlots).toBe(3);
    expect(pv.heirloomCandidates.some((c) => c.itemId === HEIRLOOM_LOW.id)).toBe(false);
    expect(pv.heirloomCandidates.find((c) => c.instanceId === "inst_40")).toMatchObject({ itemId: HEIRLOOM_OK.id, location: "inventory", count: 1 });
    expect(pv.heirloomCandidates.find((c) => c.itemId === HEIRLOOM_OK2.id && !c.instanceId)).toMatchObject({ count: 2, location: "bank" });

    expect(prestigeAscendCheck(s, content, { heirlooms: [{ itemId: HEIRLOOM_LOW.id }] })).toEqual({ ok: false, reason: "heirloom_invalid" });
    expect(prestigeAscendCheck(s, content, { heirlooms: [{ itemId: HEIRLOOM_OK2.id }, { itemId: HEIRLOOM_OK2.id }, { itemId: HEIRLOOM_OK2.id }] }))
      .toEqual({ ok: false, reason: "heirloom_invalid" }); // nur zwei besessen
    expect(prestigeAscendCheck(s, content, { heirlooms: [{ itemId: HEIRLOOM_OK.id, instanceId: "inst_40" }, { itemId: HEIRLOOM_OK.id, instanceId: "inst_40" }] }))
      .toEqual({ ok: false, reason: "heirloom_invalid" });
    expect(prestigeAscendCheck(s, content, { heirlooms: [1, 2, 3, 4].map(() => ({ itemId: HEIRLOOM_OK2.id })) }))
      .toEqual({ ok: false, reason: "heirloom_too_many" });

    const choice = { heirlooms: [{ itemId: HEIRLOOM_OK.id, instanceId: "inst_40" }, { itemId: HEIRLOOM_OK2.id }, { itemId: HEIRLOOM_OK2.id }], stash: [] };
    expect(ascend(s, content, choice)).toBe(true);
    expect(s.bankInstances).toEqual([inst]);
    expect(s.bank[HEIRLOOM_OK2.id]).toBe(2);
    expect(s.bank[HEIRLOOM_LOW.id]).toBeUndefined();
    expect(s.inventory.instances).toEqual([]);
    expect(s.nextInstanceSeq).toBe(50);
    expect(mintInstanceId(s)).not.toBe("inst_40");
  });

  it("Erbstück: Kollision mit einer gehaltenen Mail-Instanz ⇒ frisch geprägte ID, Inhalt unverändert; deterministisch", () => {
    const s = ready();
    s.nextInstanceSeq = 50;
    s.inventory.instances.push(heirInstance("inst_49"));
    s.mailbox = [{ id: "mail_0", kind: "overflow", createdSeq: 0, items: [], instances: [heirInstance("inst_49")] }];
    s.mailSeq = 1;
    scars(s, { startingGold: 1, keepTools: 1, keepBankStacks: 1, keepEquipment: 1 });
    const twin = clone(s);
    expect(ascend(s, content)).toBe(true);
    expect(ascend(twin, content)).toBe(true);
    expect(JSON.stringify(s)).toBe(JSON.stringify(twin));
    expect(s.bankInstances).toHaveLength(1);
    expect(s.bankInstances[0]).toEqual({ ...heirInstance("inst_49"), instanceId: "inst_1e" }); // seq 50 = "1e"
    expect(s.mailbox[0]!.instances[0]!.instanceId).toBe("inst_49");
  });

  it("Erbstück-Vorgabe: höchste Anforderung, getragen zuerst; Vorschau listet Geht/Bleibt", () => {
    const s = ready();
    s.character.equipment[HEIRLOOM_OK2.slot!] = HEIRLOOM_OK2.id;
    s.bank = { [HEIRLOOM_OK.id]: 1 };
    s.character.ownedPets = { [PETS[0]!]: true };
    s.mailbox = [{ id: "mail_0", kind: "overflow", createdSeq: 0, items: [{ itemId: "onyx", qty: 1 }], instances: [] }];
    scars(s, { startingGold: 1, keepTools: 1, keepBankStacks: 1, keepEquipment: 1 });
    const pv = prestigeAscendPreview(s, content);
    const sorted = [...pv.heirloomCandidates].sort((a, b) => b.requirement - a.requirement);
    expect(pv.heirloomCandidates.map((c) => c.requirement)).toEqual(sorted.map((c) => c.requirement));
    expect(pv.heirloomDefault).toHaveLength(1);
    expect(pv.unlock.ok).toBe(true);
    expect(pv.startingGold).toBe(2500);
    expect(pv.summary.stays.pets).toBe(1);
    expect(pv.summary.stays.heldMail).toBe(1);
    expect(pv.summary.goes.totalLevel).toBe(prestigePointsPreview(s, content).totalLevel);
  });

  it("Wächterliste aus B1 bleibt vollständig (jedes Feld eines frischen Stands eingestuft)", () => {
    expect(new Set(Object.keys(PRESTIGE_STATE_FIELDS))).toEqual(new Set(Object.keys(fresh())));
  });
});

describe("Lehrjahre + Handgedächtnis: XP-Faktor an allen Vergabestellen", () => {
  it("Faktor: ohne Ränge exakt 1; Lehrjahre nur unter 80; Handgedächtnis nur mit Erfolg und unter 99; additiv", () => {
    const s = fresh();
    expect(prestigeSkillXpMult(s, content, "mining", 0)).toBe(1);
    s.talents = { slayer: { tracking: 5 } };
    expect(prestigeSkillXpMult(s, content, "mining", 0)).toBe(1);
    scars(s, { earlyXp: 3, masteredXp: 1 });
    expect(prestigeSkillXpMult(s, content, "mining", xpForLevel(50))).toBeCloseTo(1.3, 12);
    expect(prestigeSkillXpMult(s, content, "mining", xpForLevel(80))).toBe(1);
    s.achievements = [...s.achievements, prestigeMasteredAchievementId("mining")];
    expect(prestigeSkillXpMult(s, content, "mining", xpForLevel(50))).toBeCloseTo(1.8, 12);
    expect(prestigeSkillXpMult(s, content, "mining", xpForLevel(85))).toBeCloseTo(1.5, 12);
    expect(prestigeSkillXpMult(s, content, "mining", xpForLevel(99))).toBe(1);
    expect(prestigeSkillXpMult(s, content, "fishing", xpForLevel(85))).toBe(1); // kein Erfolg für Angeln
    // Gate: ohne Aufstieg (Baum gesperrt) kein Faktor, auch mit Rängen.
    s.prestige.count = 0;
    expect(prestigeSkillXpMult(s, content, "mining", xpForLevel(50))).toBe(1);
  });

  it("jede Fertigkeit hat ihren 99er-Erfolg (Quelle des Handgedächtnisses)", () => {
    const ids = new Set(content.achievements.map((a) => a.id));
    for (const id of SKILLS) expect(ids.has(prestigeMasteredAchievementId(id)), id).toBe(true);
  });

  it("Skilling (tick.ts): gleiche Abschlüsse, XP × 1,3", () => {
    const run = (ranks: boolean): number => {
      const s = fresh(1);
      setLevel(s, "woodcutting", 45);
      if (ranks) scars(s, { earlyXp: 3 });
      const before = s.skills.woodcutting!.xp;
      setActiveAction(s, content, "cut_normal_tree");
      advance(s, content, 30_000);
      expect(itemCount(s.inventory, "normal_log")).toBe(10);
      return s.skills.woodcutting!.xp - before;
    };
    const base = run(false);
    expect(base).toBe(10 * content.actions.cut_normal_tree!.xp);
    expect(run(true)).toBeCloseTo(base * 1.3, 9);
  });

  it("Kampf (combat.ts addXp) und Slayer: derselbe Kill, XP × 1,6 (Lehrjahre 1 + Handgedächtnis 1)", () => {
    const kill = (ranks: boolean): Record<string, number> => {
      const s = fresh(3);
      // Stufe 10: volle Kampf-XP gegen das Huhn (keine Überlevel-Dämpfung) und kein Level-Up in einem Kill
      // (sonst liefe der Kampf mit anderen Werten auseinander); Slayer 50.
      for (const id of ["attack", "power", "defence", "vitality"]) setLevel(s, id, 10);
      setLevel(s, "slayer", 50);
      if (ranks) {
        scars(s, { earlyXp: 1, masteredXp: 1 }); // beide wirken (Stufen < 80, Erfolge vorhanden)
        s.achievements = SKILLS.map((id) => prestigeMasteredAchievementId(id));
      }
      const before = Object.fromEntries(Object.entries(s.skills).map(([k, v]) => [k, v.xp]));
      expect(startCombat(s, content, "chicken")).toBe(true);
      for (let i = 0; i < 3000 && s.combat.kills === 0; i++) {
        s.character.hp = 9_999;
        combatStep(s, content, 0);
      }
      expect(s.combat.kills).toBe(1);
      s.slayerTask = { masterId: "m", monsterId: "chicken", isTower: false, required: 5, progress: 0, xpReward: 0, pointReward: 1 };
      expect(recordKillForSlayer(s, content, "chicken")).toBe(false);
      return Object.fromEntries(Object.entries(s.skills).map(([k, v]) => [k, v.xp - (before[k] ?? 0)]));
    };
    const a = kill(false);
    const b = kill(true);
    const gained = Object.keys(a).filter((k) => a[k]! > 0);
    expect(gained).toContain("slayer");
    expect(gained.length).toBeGreaterThanOrEqual(2);
    for (const k of gained) {
      expect(levelFromXp(xpForLevel(k === "slayer" ? 50 : 10) + b[k]!), `${k} ohne Level-Up`).toBe(k === "slayer" ? 50 : 10);
      expect(b[k]! / a[k]!, k).toBeCloseTo(1.6, 9); // 1 + 0,1 + 0,5
    }
  });

  it("Farming und Jagen: XP × 1,1 (Lehrjahre 1)", () => {
    const seed: ItemDef = { id: "b2_seed", name: "S", type: "material", stackable: true };
    const herb: ItemDef = { id: "b2_herb", name: "H", type: "material", stackable: true };
    const crop: CropDef = { id: "b2_crop", name: "C", seedItem: "b2_seed", yieldItem: "b2_herb", yieldMin: 1, yieldMax: 1, levelRequired: 1, growMs: 60_000, xp: 24, tier: 1 };
    const hare: MonsterDef = {
      id: "b2_hare", name: { en: "Hare", de: "Hase" }, level: 3, maxHp: 10, damage: 1, accuracy: 1, evasion: 1, defense: 0,
      attackIntervalMs: 3000, xp: 5, gold: 0, loot: [], family: "beast", zone: "pastures",
    };
    const zones: HuntZoneDef[] = [{ zoneId: "pastures", levelRequired: 1, trapMs: 60_000, xp: 10 }];
    const items: Record<string, ItemDef> = { ...content.items, b2_seed: seed, b2_herb: herb };
    if (!items[BAIT_ITEM_ID]) items[BAIT_ITEM_ID] = { id: BAIT_ITEM_ID, name: "Bait", type: "material", stackable: true };
    const c: ContentDB = { ...content, items, crops: { b2_crop: crop }, monsters: { ...content.monsters, b2_hare: hare }, huntingZones: zones };

    const farm = (ranks: boolean): number => {
      const s = createGame({ name: "F" }, c, 1);
      if (ranks) scars(s, { earlyXp: 1 });
      addItem(s.inventory, c, "b2_seed", 1);
      expect(plantCrop(s, c, 0, "b2_crop")).toBe(true);
      s.farmPlots[0]!.autoReplant = false;
      advance(s, c, 60_000);
      return s.skills.farming?.xp ?? 0;
    };
    expect(farm(false)).toBe(24);
    expect(farm(true)).toBeCloseTo(26.4, 9);

    const hunt = (ranks: boolean, seedNo: number): number => {
      const s = createGame({ name: "J" }, c, seedNo);
      s.monsterKills.b2_hare = 1;
      if (ranks) scars(s, { earlyXp: 1 });
      addItem(s.inventory, c, BAIT_ITEM_ID, 2);
      expect(setHuntTrap(s, c, 0, "pastures", false)).toBe("ok");
      advance(s, c, 60_000);
      return s.skills[HUNTING_SKILL_ID]?.xp ?? 0;
    };
    let seedNo = 1;
    while (hunt(false, seedNo) === 0 && seedNo < 80) seedNo++;
    const base = hunt(false, seedNo);
    expect(base).toBeGreaterThan(0);
    expect(hunt(true, seedNo)).toBeCloseTo(base * 1.1, 9);
  });
});

describe("Erinnerung („Bekannte Seiten“): Kapitel 1–18, halbes Gold, keine Marken/Gegenstände", () => {
  function recaller(): GameState {
    const s = ready();
    scars(s, { earlyXp: 1, chronicleRecall: 1 });
    expect(ascend(s, content)).toBe(true);
    return s;
  }

  it("ohne Knoten oder ohne Aufstieg nicht verfügbar", () => {
    const s = fresh();
    expect(prestigeRecallCheck(s, content, "chronicle_01")).toEqual({ ok: false, reason: "no_talent" });
    scars(s, { earlyXp: 1, chronicleRecall: 1 }, 0);
    expect(prestigeRecallCheck(s, content, "chronicle_01")).toEqual({ ok: false, reason: "no_talent" });
    expect(prestigeRecallableChapters(s, content)).toEqual([]);
  });

  it("Reihenfolge, Grenze 18, halbes Gold abgerundet, keine Marken, keine Gegenstände, Zustand claimed", () => {
    const s = recaller();
    const ch = (n: number): string => `chronicle_${String(n).padStart(2, "0")}`;
    expect(prestigeRecallableChapters(s, content)).toEqual(Array.from({ length: PRESTIGE_RECALL_MAX_CHAPTER }, (_, i) => ch(i + 1)));
    expect(prestigeRecallCheck(s, content, ch(2))).toEqual({ ok: false, reason: "locked" });
    for (const n of [19, 20, 21, 22, 27]) expect(prestigeRecallCheck(s, content, ch(n)).reason, ch(n)).toBe("not_recallable");
    expect(prestigeRecallCheck(s, content, "nope").reason).toBe("not_recallable");

    const before = { gold: s.character.gold, tokens: s.character.questTokens, inv: JSON.stringify(s.inventory), bank: JSON.stringify(s.bank) };
    const q1 = content.quests.find((q) => q.id === ch(1))!;
    const r1 = prestigeRecallChapter(s, content, ch(1));
    expect(r1).toEqual({ ok: true, gold: Math.floor((q1.rewards.gold ?? 0) / 2) });
    expect(prestigeRecallChapter(s, content, ch(1))).toEqual({ ok: false, reason: "claimed" });

    const all = prestigeRecallChronicle(s, content);
    expect(all.chapters).toEqual(Array.from({ length: PRESTIGE_RECALL_MAX_CHAPTER - 1 }, (_, i) => ch(i + 2)));
    let expectGold = r1.gold!;
    for (let n = 2; n <= PRESTIGE_RECALL_MAX_CHAPTER; n++) expectGold += Math.floor((content.quests.find((q) => q.id === ch(n))!.rewards.gold ?? 0) / 2);
    expect(s.character.gold - before.gold).toBe(expectGold);
    expect(all.gold).toBe(expectGold - r1.gold!);
    expect(s.character.questTokens).toBe(before.tokens);
    expect(JSON.stringify(s.inventory)).toBe(before.inv);
    expect(JSON.stringify(s.bank)).toBe(before.bank);
    for (let n = 1; n <= PRESTIGE_RECALL_MAX_CHAPTER; n++) {
      expect(questStatus(s, content, content.quests.find((q) => q.id === ch(n))!)).toBe("claimed");
    }
    // Kapitel 19 ist jetzt offen, muss aber selbst erkämpft werden.
    expect(questStatus(s, content, content.quests.find((q) => q.id === ch(19))!)).not.toBe("claimed");
    expect(prestigeRecallableChapters(s, content)).toEqual([]);
    expect(s.quests.claimed.filter((id) => (chronicleChapterNumber(id) ?? 0) > PRESTIGE_RECALL_MAX_CHAPTER)).toEqual([]);
  });
});

describe("Alte Pfade, Narbengewebe, Narbenfaust, Elsternauge", () => {
  it("Alte Pfade: Dungeon mit Lebenszeit-Clear sofort offen (überstimmt Quest-Gate); Paragonturm nie", () => {
    const gated = content.dungeons.find((d) => d.requiresQuest && d.id !== PARAGON_DUNGEON_ID)!;
    const s = fresh();
    s.dungeonsCleared = { [gated.id]: 2, [PARAGON_DUNGEON_ID]: 5 };
    expect(isDungeonUnlocked(s, content, gated.id)).toBe(false);
    scars(s, { earlyXp: 1, chronicleRecall: 1, dungeonRecall: 1 });
    expect(isDungeonUnlocked(s, content, gated.id)).toBe(true);
    expect(isDungeonUnlocked(s, content, PARAGON_DUNGEON_ID)).toBe(false);
    s.dungeonsCleared = {};
    expect(isDungeonUnlocked(s, content, gated.id)).toBe(false);
  });

  it("Narbengewebe/Narbenfaust: computeStats maxHp und Schadensspanne × 1,05; ohne Aufstieg wirkungslos", () => {
    const s = fresh();
    setLevel(s, "vitality", 40);
    const base = computeStats(s, content);
    scars(s, { maxHp: 5, damage: 5 });
    const st = computeStats(s, content);
    expect(talentMaxHpMult(s, content)).toBe(1.05);
    expect(talentDamageMult(s, content)).toBe(1.05);
    expect(st.maxHp).toBeCloseTo(base.maxHp * 1.05, 9);
    expect(st.attackDamageMin).toBeCloseTo(base.attackDamageMin * 1.05, 9);
    expect(st.attackDamageMax).toBeCloseTo(base.attackDamageMax * 1.05, 9);
    expect(st.maxHit).toBe(st.attackDamageMax);
    s.prestige.count = 0;
    expect(computeStats(s, content)).toEqual(base);
  });

  it("Elsternauge: Quest-Gold × 1,05, Verkaufspreise unverändert", () => {
    const run = (ranks: boolean): { quest: number; sold: number } => {
      const s = fresh();
      if (ranks) scars(s, { damage: 2, goldFind: 1 });
      s.stats.itemsGathered = 1000;
      const before = s.character.gold;
      expect(claimQuest(s, content, "chronicle_01")).toBe(true);
      const quest = s.character.gold - before;
      addItem(s.inventory, content, "onyx", 10);
      const sold = sellStack(s, content, "onyx");
      return { quest, sold };
    };
    const a = run(false);
    const b = run(true);
    expect(a.quest).toBe(content.quests.find((q) => q.id === "chronicle_01")!.rewards.gold);
    expect(b.quest).toBe(Math.round(a.quest * 1.05));
    expect(b.sold).toBe(a.sold);
    expect(goldFindMult(fresh(), content)).toBe(1);
  });
});

describe("Post-Sperre (Chef 18.10.): beim Aufstieg gehaltene Post bleibt gesperrt bis 4×99", () => {
  function fillInventory(s: GameState): void {
    for (const item of Object.values(content.items)) {
      if (!item.stackable || item.type !== "material" || item.id === "onyx") continue;
      if (s.inventory.slots.every((x) => x !== null)) break;
      if (itemCount(s.inventory, item.id) === 0) addItem(s.inventory, content, item.id, 1);
    }
  }

  it("Überlauf-Mail wird gehalten; neuer Überlauf landet in einer NEUEN, offenen Mail", () => {
    const s = ready();
    s.settings.autoBank = false;
    fillInventory(s);
    grantLoot(s, content, "onyx", 3);
    expect(s.mailbox).toHaveLength(1);
    expect(ascend(s, content)).toBe(true);
    const held = s.mailbox[0]!;
    expect(held.prestigeHeld).toBe(true);
    expect(mailCollectBlocked(s, content, held)).toBe("prestige_locked");

    s.settings.autoBank = false;
    fillInventory(s);
    grantLoot(s, content, "onyx", 2);
    expect(s.mailbox).toHaveLength(2);
    const fresh2 = s.mailbox[1]!;
    expect(fresh2.kind).toBe("overflow");
    expect(fresh2.prestigeHeld).toBeUndefined();
    expect(mailCollectBlocked(s, content, fresh2)).toBeNull();
    expect(held.items).toEqual([{ itemId: "onyx", qty: 3 }]);

    for (const id of SKILLS.slice(0, 4)) setLevel(s, id, 99);
    expect(mailCollectBlocked(s, content, held)).toBeNull();
    s.inventory.slots = s.inventory.slots.map(() => null);
    expect(collectMail(s, content, held.id).collected).toBe(3);
  });

  it("ohne Aufstieg wirkt ein gesetztes Flag nicht (Bestandsverhalten)", () => {
    const s = fresh();
    s.mailbox = [{ id: "mail_0", kind: "overflow", createdSeq: 0, items: [{ itemId: "onyx", qty: 1 }], instances: [], prestigeHeld: true }];
    s.mailSeq = 1;
    expect(mailCollectBlocked(s, content, s.mailbox[0]!)).toBeNull();
  });
});
