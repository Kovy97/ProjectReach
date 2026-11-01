import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, MailMessage, TalentTreeDef } from "@hearthforge/shared";
import {
  PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER,
  PRESTIGE_PARAGON_POINTS_CAP,
  PRESTIGE_POINTS_BASE,
  PRESTIGE_POINTS_CORE_99,
  PRESTIGE_POINTS_PER_99,
  PRESTIGE_POINTS_PER_EXTRA_99,
  PRESTIGE_POINTS_PER_LATE_CHAPTER,
  PRESTIGE_POINTS_PER_PARAGON_STEP,
  PRESTIGE_PARAGON_FLOOR_STEP,
  PRESTIGE_POINTS_PER_TOTAL_LEVEL_STEP,
  PRESTIGE_REQUIRED_99,
  PRESTIGE_TOTAL_LEVEL_STEP,
  PRESTIGE_TOTAL_LEVEL_THRESHOLD,
  PRESTIGE_UNLOCK_QUEST_ID,
  defaultQuestState,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { computeStats, totalLevel } from "./character";
import { mintInstanceId } from "./enchant";
import { buyTalent, talentCurrencyBalance } from "./talents";
import { evaluateQuests, questObjectiveProgress, questObjectivesMet, questStatus } from "./quests";
import { collectAllMail, collectMail, sendLetter, transferInventoryItemsToSave } from "./mail";
import { addItem } from "./inventory";
import { advance } from "./tick";
import {
  PRESTIGE_CHARACTER_FIELDS,
  PRESTIGE_CHARACTER_KEEP_FIELDS,
  PRESTIGE_CHARACTER_RESET_FIELDS,
  PRESTIGE_KEEP_FIELDS,
  PRESTIGE_RESET_FIELDS,
  PRESTIGE_STATE_FIELDS,
  ascend,
  prestigeFreightLocked,
  prestigeNextSeed,
  prestigePointsPreview,
  prestigeUnlock,
} from "./prestige";

// claude:2026-10-17T23:30:00+02:00 — Prestige-Fundament (1.3 Welle B1, SAVE 88): Wächterliste, Freischaltung,
// Punkte-Vorschau, Aufstieg (Bleibe/Reset, IDs, Determinismus), Quest-Laufanker, Talent-Währung, Rabenfracht-Sperre.

const SKILLS = Object.keys(content.skills);
const PETS = Object.keys(content.pets);
const ACH = content.achievements.map((a) => a.id);

function fresh(seed = 7): GameState {
  return createGame({ name: "Asche", portrait: "char_3", baseAttributes: { str: 4 } }, content, seed);
}

function setLevel(s: GameState, skillId: string, level: number): void {
  s.skills[skillId] = { xp: xpForLevel(level) };
}

function claim(s: GameState, ...ids: string[]): void {
  for (const id of ids) if (!s.quests.claimed.includes(id)) s.quests.claimed.push(id);
}

/** Ein reichlich befüllter, aufstiegsbereiter Spielstand (4×99 + Kapitel 21 + Spuren in fast jedem Feld). */
function ready(seed = 7): GameState {
  const s = fresh(seed);
  for (const id of SKILLS.slice(0, 4)) setLevel(s, id, 99);
  for (const id of SKILLS.slice(4, 10)) setLevel(s, id, 70);
  claim(s, PRESTIGE_UNLOCK_QUEST_ID, "chronicle_22", "chronicle_23", "chronicle_05");
  s.quests.completed.push("chronicle_24");
  s.character.gold = 1_234_567;
  s.character.questTokens = 321;
  s.character.equipment.mainhand = "cracked_bow";
  s.character.autoEatTier = 3;
  s.character.autoEatThreshold = 0.6;
  s.character.combatStyle = "power";
  s.character.ownedPets = { [PETS[0]!]: true, [PETS[1]!]: true };
  s.character.companionPetId = PETS[0]!;
  s.character.companionPetId2 = PETS[1]!;
  s.talents = { slayer: { tracking: 5, collar: 1 } };
  s.petPity = { [PETS[2]!]: 4321 };
  addItem(s.inventory, content, "cooked_shrimp", 50);
  s.bank = { cooked_shrimp: 999 };
  s.bankOrder = ["cooked_shrimp"];
  s.bankSlotsPurchased = 4;
  s.mastery = { [Object.keys(content.actions)[0]!]: { xp: 5_000_000 } };
  s.monsterKills = { goblin: 4614, chicken: 12 };
  s.dungeonsCleared = { [content.dungeons[0]!.id]: 3 };
  s.dungeonsUnlocked = { [content.dungeons[0]!.id]: true };
  s.legacyZoneGrants = { [content.zones[1]!.id]: true };
  s.paragon = { checkpoint: 12, best: 37 };
  s.paragonChestSeq = 9;
  s.achievements = ACH.slice(0, 5);
  s.claimedApMilestones = [10, 20];
  s.apMilestoneSeq = 2;
  s.stats.kills = 9_000;
  s.stats.itemsGathered = 50_000;
  s.stats.itemsCrafted = 7_000;
  s.seenDrops = { goblin: ["bronze_bar"] };
  s.discoveredItems = { ...s.discoveredItems, onyx: true };
  s.masteryCapes = { [SKILLS[0]!]: true };
  s.capeGranted = { [SKILLS[0]!]: true };
  s.capeCeremonySeen = { [SKILLS[0]!]: true };
  s.settings = { autoBank: false, autoParagonAscend: true, estateNotifications: false, materialsToStorage: false, quiverAutoRefill: false, raidAutoContinue: true, raidAutoBuyRestart: true, raidUseFeeWrit: true }; // claude:2026-10-30T22:28:00+01:00 — SAVE 100: Gebührenschein-Schalter
  s.thievingRisk = "bold";
  s.slayerPoints = 800;
  s.slayerTasksCompleted = 41;
  s.slayerStreak = 6;
  s.slayerStreakSeq = 6;
  s.petDropSeq = 3;
  s.lastPetDrop = { petId: PETS[1]!, seq: 3 };
  s.eliteCodex = { some_variant: { sightings: 2, kills: 1, uniques: 0, fastestKillMs: 9000 } };
  s.eliteKillSeq = 1;
  s.firstSuffixGranted = true;
  s.nextInstanceSeq = 50;
  s.huntCatchSeq = 17;
  s.totalTicks = 99_000;
  s.elapsedMs = 9_900_000;
  s.activePlayMs = 8_000_000;
  // Postfach: eine Rabenfracht MIT Instanz (ID aus der alten Domäne) + ein Brief mit Geschenk.
  const transfer: MailMessage = {
    id: "mail_0",
    kind: "transfer",
    createdSeq: 0,
    items: [{ itemId: "onyx", qty: 2 }],
    instances: [{ instanceId: "inst_49", baseItemId: "rusty_sword", affixes: [] }],
    fromSaveName: "Zweitstand",
  };
  s.mailbox = [transfer];
  s.mailSeq = 1;
  sendLetter(s, "warden", "mail.letter.test", [{ itemId: "cooked_shrimp", qty: 3 }]);
  return s;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

describe("Wächterliste: jedes State-Feld ist genau einmal eingestuft", () => {
  it("Top-Level: Schlüssel des Records == Schlüssel eines frischen Spielstands; KEEP ∩ RESET = ∅", () => {
    const s = fresh();
    expect(new Set(Object.keys(PRESTIGE_STATE_FIELDS))).toEqual(new Set(Object.keys(s)));
    expect(PRESTIGE_KEEP_FIELDS.filter((k) => PRESTIGE_RESET_FIELDS.includes(k))).toEqual([]);
    expect(PRESTIGE_KEEP_FIELDS.length + PRESTIGE_RESET_FIELDS.length).toBe(Object.keys(s).length);
  });

  it("Charakter: jeder Schlüssel eines frischen Charakters ist eingestuft (optionale nur zusätzlich)", () => {
    const s = ready();
    const classified = new Set(Object.keys(PRESTIGE_CHARACTER_FIELDS));
    for (const k of Object.keys(s.character)) expect(classified.has(k), `character.${k} unklassifiziert`).toBe(true);
    const freshKeys = new Set(Object.keys(fresh().character));
    const onlyOptional = [...classified].filter((k) => !freshKeys.has(k));
    expect(onlyOptional).toEqual(["autoEatThreshold"]);
    expect(PRESTIGE_CHARACTER_KEEP_FIELDS.filter((k) => PRESTIGE_CHARACTER_RESET_FIELDS.includes(k))).toEqual([]);
  });

  it("ein State-Feld ohne Einstufung ließe die Prüfung scheitern (Gegenprobe)", () => {
    const s = fresh() as unknown as Record<string, unknown>;
    s.brandNewFeature = 1;
    const missing = Object.keys(s).filter((k) => !(k in PRESTIGE_STATE_FIELDS));
    expect(missing).toEqual(["brandNewFeature"]);
  });
});

describe("Freischaltung", () => {
  it("braucht 4×99 UND eingelöstes Kapitel 21", () => {
    const s = fresh();
    expect(prestigeUnlock(s, content)).toEqual({ ok: false, skills99: 0, required: PRESTIGE_REQUIRED_99, chronicleDone: false });
    for (const id of SKILLS.slice(0, 4)) setLevel(s, id, 99);
    expect(prestigeUnlock(s, content).ok).toBe(false);
    s.quests.completed.push(PRESTIGE_UNLOCK_QUEST_ID); // erfüllt, aber nicht eingelöst
    expect(prestigeUnlock(s, content).chronicleDone).toBe(false);
    claim(s, PRESTIGE_UNLOCK_QUEST_ID);
    expect(prestigeUnlock(s, content)).toEqual({ ok: true, skills99: 4, required: 4, chronicleDone: true });
    setLevel(s, SKILLS[0]!, 98);
    expect(prestigeUnlock(s, content).ok).toBe(false);
  });

  it("Aufstieg ohne Freischaltung: false und State byte-gleich", () => {
    const s = ready();
    setLevel(s, SKILLS[3]!, 98);
    const before = JSON.stringify(s);
    expect(ascend(s, content)).toBe(false);
    expect(JSON.stringify(s)).toBe(before);

    const t = ready();
    t.quests.claimed = t.quests.claimed.filter((id) => id !== PRESTIGE_UNLOCK_QUEST_ID);
    const beforeT = JSON.stringify(t);
    expect(ascend(t, content)).toBe(false);
    expect(JSON.stringify(t)).toBe(beforeT);
  });
});

describe("Punkte-Vorschau", () => {
  it("rechnet 99er, Gesamtstufe über der Schwelle, Band-2-Kapitel und Paragon-Schritte über die Konstanten", () => {
    const s = ready();
    for (const id of SKILLS.slice(4, 6)) setLevel(s, id, 99); // 6×99
    const tl = totalLevel(s, content);
    const p = prestigePointsPreview(s, content);
    const late = ["chronicle_22", "chronicle_23"].length; // chronicle_05 zählt nicht, chronicle_24 nur erfüllt
    expect(PRESTIGE_CHRONICLE_BONUS_FROM_CHAPTER).toBe(22);
    expect(p.skills99).toBe(6);
    // claude:2026-10-18T12:00:00+02:00 — Welle B2: kalibrierte Formel (Grundbetrag, abgestufte 99er, Paragon-Deckel).
    expect(p.fromBase).toBe(PRESTIGE_POINTS_BASE);
    expect(p.fromSkills).toBe(PRESTIGE_POINTS_CORE_99 * PRESTIGE_POINTS_PER_99 + (6 - PRESTIGE_POINTS_CORE_99) * PRESTIGE_POINTS_PER_EXTRA_99);
    expect(p.totalLevel).toBe(tl);
    expect(p.fromTotalLevel).toBe(
      Math.floor(Math.max(0, tl - PRESTIGE_TOTAL_LEVEL_THRESHOLD) / PRESTIGE_TOTAL_LEVEL_STEP) * PRESTIGE_POINTS_PER_TOTAL_LEVEL_STEP,
    );
    expect(p.lateChapters).toBe(late);
    expect(p.fromChronicle).toBe(late * PRESTIGE_POINTS_PER_LATE_CHAPTER);
    expect(p.paragonBest).toBe(37);
    expect(p.fromParagon).toBe(
      Math.min(PRESTIGE_PARAGON_POINTS_CAP, Math.floor(37 / PRESTIGE_PARAGON_FLOOR_STEP) * PRESTIGE_POINTS_PER_PARAGON_STEP),
    );
    // claude:2026-10-30T18:44:00+01:00 — 1.4.2: „je Sturz“ um Gold/Dungeons/Slayer/Raid erweitert, einmalige Quellen (Hauptbuch) kommen dazu.
    expect(p.runSubtotal).toBe(
      p.fromBase + p.fromSkills + p.fromTotalLevel + p.fromChronicle + p.fromParagon + p.fromGold + p.fromDungeons + p.fromSlayer + p.fromRaid,
    );
    expect(p.fromGold).toBe(4); // 1.234.567 Gold ⇒ 4 × 250.000
    expect(p.onceTotal).toBe(p.fromPets + p.fromBestiary + p.fromAchievements + p.fromRaidFirst);
    expect(p.fromPets).toBe(8); // zwei Begleiter, Hauptbuch leer (E2)
    expect(p.subtotal).toBe(p.runSubtotal + p.onceTotal);
    expect(p.pointsMult).toBe(0);
    expect(p.total).toBe(p.subtotal);
  });

  it("Gesamtstufen-Bonus greift erst über der Schwelle", () => {
    const s = fresh();
    for (const id of SKILLS) setLevel(s, id, 99);
    const p = prestigePointsPreview(s, content);
    expect(p.totalLevel).toBe(SKILLS.length * 99);
    expect(p.fromTotalLevel).toBe(Math.floor((SKILLS.length * 99 - 1000) / PRESTIGE_TOTAL_LEVEL_STEP));
    expect(prestigePointsPreview(fresh(), content).fromTotalLevel).toBe(0);
  });
});

describe("Aufstieg", () => {
  it("Bleibe-Felder unverändert, Reset-Felder == createGame-Neuzustand, Prestige fortgeschrieben", () => {
    const s = ready();
    const old = clone(s);
    const preview = prestigePointsPreview(s, content);
    const seed = prestigeNextSeed(s);
    expect(ascend(s, content)).toBe(true);

    // Referenz-Neuzustand: dieselbe Erstellung mit demselben abgeleiteten Seed.
    const ref = createGame(
      { name: old.character.name, portrait: old.character.portrait, createdAt: old.character.createdAt, startingStyle: "ranged", starterKit: true },
      content,
      seed,
    );

    for (const key of PRESTIGE_KEEP_FIELDS) {
      if (key === "prestige" || key === "discoveredItems" || key === "mailbox") continue;
      expect(s[key], `KEEP ${key}`).toEqual(old[key]);
    }
    // claude:2026-10-18T12:00:00+02:00 — Post-Sperre (Welle B2): dieselben Mails, jede mit Inhalt trägt `prestigeHeld`.
    expect(s.mailbox).toEqual(old.mailbox.map((m) => ({ ...m, prestigeHeld: true })));
    for (const key of PRESTIGE_RESET_FIELDS) {
      if (key === "character" || key === "quests") continue;
      expect(s[key], `RESET ${key}`).toEqual(ref[key]);
    }
    // Charakter: Bleibe-Felder wie vorher, Reset-Felder wie der Neuzustand, abgeleitete Werte neu gerechnet.
    for (const key of PRESTIGE_CHARACTER_KEEP_FIELDS) expect(s.character[key], `character KEEP ${key}`).toEqual(old.character[key]);
    const stats = computeStats(s, content);
    for (const key of PRESTIGE_CHARACTER_RESET_FIELDS) {
      if (key === "hp") expect(s.character.hp).toBe(stats.maxHp);
      else if (key === "mana") expect(s.character.mana).toBe(stats.maxMana);
      else if (key === "ward") expect(s.character.ward).toBe(stats.maxWard);
      else expect(s.character[key], `character RESET ${key}`).toEqual(ref.character[key]);
    }
    // Startausrüstung folgt dem Stil der zuvor getragenen Haupthand (Bogen ⇒ Fernkampf-Start).
    expect(s.character.equipment.mainhand).toBe("cracked_bow");
    expect(s.character.gold).toBe(0);
    expect(s.skills).toEqual({});
    expect(s.bank).toEqual({});

    // Wiki: Vereinigung aus altem Bestand und Starterbesitz.
    expect(s.discoveredItems).toEqual({ ...old.discoveredItems, ...ref.discoveredItems });

    // Quests: Neuzustand + Laufanker.
    const { repeatBaseline, ...questRest } = s.quests;
    const { repeatBaseline: _ignored, ...freshRest } = defaultQuestState();
    expect(questRest).toEqual(freshRest);
    expect(Object.keys(repeatBaseline).length).toBeGreaterThan(0);

    // claude:2026-10-18T19:40:00+02:00 — Welle E1: Baselines = Zählerstände beim Aufstieg, Bilanz im Historien-Eintrag.
    expect(s.prestige).toEqual({
      count: 1,
      points: preview.total,
      pointsSpent: 0,
      runStart: { kills: 4626, dungeons: 3, achievements: 5, pets: 2, slayerTasks: 41, activePlayMs: 8_000_000, raidClears: { normal: 0, heroic: 0, mythic: 0 } },
      // claude:2026-10-30T18:44:00+01:00 — SAVE 99: das Hauptbuch hält genau fest, was diese Gutschrift an einmaligen Quellen bezahlt hat.
      paid: { pets: [PETS[0], PETS[1]], bestiary: preview.newBestiary, ap: Math.floor(preview.apOverPaid / 100) * 100, raids: [] },
      respec142: null, // claude:2026-10-31T14:58:54+01:00 — SAVE 102: kein Rückgabe-Beleg, der Sturz reicht ihn nur durch
      history: [
        {
          count: 1,
          points: preview.total,
          totalLevel: preview.totalLevel,
          skills99: 4,
          activePlayMs: 8_000_000,
          tally: {
            playMs: 8_000_000,
            chronicleChapter: 23,
            questsClaimed: 4,
            kills: 4626,
            dungeons: 3,
            achievements: 5,
            petsFound: 2,
            slayerTasks: 41,
            paragonBest: 37,
            gold: 1_234_567,
          },
        },
      ],
    });
  });

  it("ist deterministisch: gleicher Eingang ⇒ byte-gleicher Neustand", () => {
    const a = ready(11);
    const b = clone(a);
    expect(ascend(a, content)).toBe(true);
    expect(ascend(b, content)).toBe(true);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("zweimal hintereinander ohne neue 99er unmöglich (auch mit wieder eingelöstem Kapitel 21)", () => {
    const s = ready();
    expect(ascend(s, content)).toBe(true);
    claim(s, PRESTIGE_UNLOCK_QUEST_ID);
    const before = JSON.stringify(s);
    expect(ascend(s, content)).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
    // Neue 4×99 im zweiten Durchgang ⇒ zweiter Aufstieg, Punkte addieren sich, Historie wächst.
    for (const id of SKILLS.slice(5, 9)) setLevel(s, id, 99);
    const first = s.prestige.points;
    const gain = prestigePointsPreview(s, content).total;
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.count).toBe(2);
    expect(s.prestige.points).toBe(first + gain);
    expect(s.prestige.history.map((h) => h.count)).toEqual([1, 2]);
  });

  it("keine ID-Kollisionen: Instanz- und Mail-Zähler laufen monoton weiter", () => {
    const s = ready();
    expect(ascend(s, content)).toBe(true);
    expect(s.nextInstanceSeq).toBe(50);
    const minted = mintInstanceId(s);
    const heldIds = s.mailbox.flatMap((m) => m.instances.map((i) => i.instanceId));
    expect(heldIds).toContain("inst_49");
    expect(heldIds).not.toContain(minted);
    const mailSeqBefore = s.mailSeq;
    sendLetter(s, "warden", "mail.letter.test");
    const ids = s.mailbox.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.mailSeq).toBe(mailSeqBefore + 1);
  });

  it("der Neustand läuft: advance über eine Minute, Quests erfüllt wie bei einem echten Neustart", () => {
    const s = ready();
    expect(ascend(s, content)).toBe(true);
    advance(s, content, 60_000);
    const f = fresh();
    advance(f, content, 60_000);
    expect(s.quests.completed).toEqual(f.quests.completed);
  });
});

describe("Quest-Laufanker", () => {
  const chapter1 = content.quests.find((q) => q.id === "chronicle_01")!;

  it("Lebenszeit-Zähler erfüllen nach dem Aufstieg keine Quest; neuer Fortschritt zählt ab dem Anker", () => {
    const s = ready();
    expect(questObjectivesMet(s, content, chapter1)).toBe(true); // 50 000 gesammelte Items
    expect(ascend(s, content)).toBe(true);
    evaluateQuests(s, content);
    expect(questStatus(s, content, chapter1)).toBe("active");
    expect(questObjectiveProgress(s, content, chapter1, 0)).toBe(0);
    s.stats.itemsGathered += chapter1.objectives[0]!.count;
    expect(questObjectiveProgress(s, content, chapter1, 0)).toBe(chapter1.objectives[0]!.count);
    expect(questStatus(s, content, chapter1)).toBe("completed");
  });

  it("ohne Aufstieg bleibt der Pfad bit-identisch: ein fremder Baseline-Eintrag einer einmaligen Quest wirkt nicht", () => {
    const s = fresh();
    s.stats.itemsGathered = 30;
    s.quests.repeatBaseline[chapter1.id] = { 0: 30 };
    expect(questObjectivesMet(s, content, chapter1)).toBe(true);
    expect(questObjectiveProgress(s, content, chapter1, 0)).toBe(30);
  });
});

describe("Talent-Währung prestigePoints", () => {
  const TREE: TalentTreeDef = {
    id: "prestige",
    name: { en: "P", de: "P" },
    unlock: { skill: SKILLS[0]!, level: 1 },
    currency: "prestigePoints",
    branches: [{ id: "a", name: { en: "A", de: "A" } }],
    nodes: [
      {
        id: "n1",
        name: { en: "N", de: "N" },
        description: { en: "N", de: "N" },
        branch: "a",
        row: 0,
        maxRank: 2,
        costPerRank: [5, 7],
        effect: { kind: "petChanceMult", perRank: [0, 0] },
      },
    ],
  };
  // claude:2026-10-18T12:00:00+02:00 — der Content trägt seit Welle B2 selbst einen Baum `prestige` (Narbenbuch);
  // dieser Test ersetzt ihn durch einen Minimalbaum, um nur die Währungsmechanik zu prüfen.
  const withTree: ContentDB = { ...content, talentTrees: [...(content.talentTrees ?? []).filter((t) => t.id !== "prestige"), TREE] };

  it("Saldo = prestige.points; Kauf senkt das Guthaben und zählt pointsSpent hoch; Slayer-Punkte unberührt", () => {
    const s = fresh();
    s.slayerPoints = 123;
    s.prestige.points = 10;
    expect(talentCurrencyBalance(s, "prestigePoints")).toBe(10);
    expect(buyTalent(s, withTree, "prestige", "n1")).toEqual({ ok: true, cost: 5 });
    expect(s.prestige).toMatchObject({ points: 5, pointsSpent: 5 });
    expect(buyTalent(s, withTree, "prestige", "n1")).toEqual({ ok: false, reason: "not_enough_currency", cost: 7 });
    expect(s.prestige).toMatchObject({ points: 5, pointsSpent: 5 });
    expect(s.talents.prestige).toEqual({ n1: 1 });
    expect(s.slayerPoints).toBe(123);
  });

  it("Talent-Ränge überleben den Aufstieg", () => {
    const s = ready();
    s.prestige.points = 5;
    expect(buyTalent(s, withTree, "prestige", "n1").ok).toBe(true);
    expect(ascend(s, withTree)).toBe(true);
    expect(s.talents.prestige).toEqual({ n1: 1 });
    expect(s.talents.slayer).toEqual({ tracking: 5, collar: 1 });
    expect(s.prestige.pointsSpent).toBe(5);
  });
});

describe("Rabenfracht-Sperre nach dem Aufstieg", () => {
  function sender(): GameState {
    const s = fresh(3);
    addItem(s.inventory, content, "onyx", 4);
    return s;
  }
  function onyxSlot(s: GameState): number {
    return s.inventory.slots.findIndex((x) => x?.itemId === "onyx");
  }

  it("Empfang gesperrt bis wieder 4×99, Versand erlaubt; Fehlschlag ist ein No-op", () => {
    const target = ready();
    expect(ascend(target, content)).toBe(true);
    expect(prestigeFreightLocked(target, content)).toBe(true);

    const src = sender();
    const before = [JSON.stringify(src), JSON.stringify(target)];
    const res = transferInventoryItemsToSave(src, target, content, "Zweit", {
      slots: [{ slotIndex: onyxSlot(src), itemId: "onyx", qty: 2 }],
      instanceIds: [],
    });
    expect(res).toEqual({ ok: false, reason: "prestige_locked" });
    expect([JSON.stringify(src), JSON.stringify(target)]).toEqual(before);

    // Versand aus dem gesperrten Durchgang heraus bleibt erlaubt.
    addItem(target.inventory, content, "onyx", 2);
    const out = transferInventoryItemsToSave(target, fresh(5), content, "Asche", {
      slots: [{ slotIndex: onyxSlot(target), itemId: "onyx", qty: 1 }],
      instanceIds: [],
    });
    expect(out.ok).toBe(true);

    // Wieder 4×99 ⇒ Empfang offen.
    for (const id of SKILLS.slice(0, 4)) setLevel(target, id, 99);
    expect(prestigeFreightLocked(target, content)).toBe(false);
    const ok = transferInventoryItemsToSave(sender(), target, content, "Zweit", {
      slots: [{ slotIndex: onyxSlot(sender()), itemId: "onyx", qty: 1 }],
      instanceIds: [],
    });
    expect(ok.ok).toBe(true);
  });

  // claude:2026-10-18T12:00:00+02:00 — Welle B2 (Chef 18.10. Punkt 4): auch jede andere Post, die beim Aufstieg mit
  // Inhalt im Postfach lag (hier der Brief mit 3× Garnelen), ist gesperrt; Post NACH dem Aufstieg nicht.
  it("bereits liegende Fracht UND gehaltene Post bleiben liegen (nicht gelöscht); neue Post lässt sich abholen", () => {
    const s = ready();
    expect(ascend(s, content)).toBe(true);
    const freight = clone(s.mailbox.find((m) => m.kind === "transfer")!);
    const letter = clone(s.mailbox.find((m) => m.kind === "letter")!);
    expect(letter.prestigeHeld).toBe(true);

    expect(collectMail(s, content, freight.id)).toEqual({ collected: 0, partial: false, blocked: "prestige_locked" });
    expect(s.mailbox.find((m) => m.id === freight.id)).toEqual(freight);
    expect(collectMail(s, content, letter.id)).toEqual({ collected: 0, partial: false, blocked: "prestige_locked" });

    sendLetter(s, "warden", "mail.letter.test", [{ itemId: "cooked_shrimp", qty: 2 }]);
    const all = collectAllMail(s, content);
    expect(all.blocked).toBe("prestige_locked");
    expect(all.collected).toBe(2); // nur der neue Brief
    expect(s.mailbox.map((m) => m.id)).toEqual([freight.id, letter.id]);

    for (const id of SKILLS.slice(0, 4)) setLevel(s, id, 99);
    const r = collectMail(s, content, freight.id);
    expect(r.blocked).toBeUndefined();
    expect(r.collected).toBe(3); // 2× Onyx + 1 Instanz
    expect(collectMail(s, content, letter.id).collected).toBe(3);
    expect(s.mailbox).toEqual([]);
  });

  it("ohne Aufstieg nie gesperrt (Bestandsverhalten)", () => {
    const s = ready();
    expect(prestigeFreightLocked(s, content)).toBe(false);
    for (const id of SKILLS.slice(0, 4)) setLevel(s, id, 1);
    expect(prestigeFreightLocked(s, content)).toBe(false);
    expect(collectMail(s, content, "mail_0").blocked).toBeUndefined();
  });
});
