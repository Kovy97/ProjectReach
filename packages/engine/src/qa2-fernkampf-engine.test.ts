import { describe, expect, it } from "vitest";
import { content as base } from "@hearthforge/content";
import type { ContentDB, DungeonDef, GameState, RaidDef, WeaponStyle, WorkOrder } from "@hearthforge/shared";
import {
  DEFENSE_MITIGATION_K,
  DEFENSE_MITIGATION_MAX,
  DMG_MAX_HIT_MULT,
  DMG_ROLL_FLOOR,
  LEATHER_HIT_FLOOR,
  PRESTIGE_UNLOCK_QUEST_ID,
  QUIVER_CAPACITY,
  defaultPrestigeState,
} from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { advance, effectiveActionDurationMs } from "./tick";
import { combinedFloorDodge, enemyEffectiveAccuracy, startCombat } from "./combat";
import { computeStats } from "./character";
import { startDungeon } from "./dungeon";
import { startRaid } from "./raid";
import { equipItem, unequipItem } from "./equipment";
import { addItem, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { activeArrow, loadQuiver, refillQuiver, unloadQuiver } from "./quiver";
import { ascend, prestigeAscendCheck, prestigeAscendPreview, prestigeUnlock } from "./prestige";
import { deliverWorkOrder, workOrderKindFor, workOrderProgress, workOrdersOf } from "./orders";
import { setActiveAction } from "./actions";
import { buildBisCharacter } from "./balance-envelope-helpers";

/**
 * QA 1.4.0 Runde 2, Fernkampf (kontrolleur, 2026-10-24): Dungeon/Raid ohne Pfeile, Aschegang mit geladenen
 * Pfeilen (echter Aufstieg, nicht nur Vorschau), Aufträge gegen den Köcher, Köcher ablegen/anlegen,
 * Balance-Stichprobe Fernkampf/Nahkampf (analytisch wie balance-envelope + echter Kampf). Nur Nachweise.
 */
const content: ContentDB = base;
/** Spiegel von combat.ts (nicht exportiert), wie balance-envelope.test.ts. */
const MIN_HIT_CHANCE = 0.1;

function archer(level = 99, bow = "godiron_shortbow", quiver = "godiron_quiver", c: ContentDB = content, seed = 11): GameState {
  const s = createTestGame({ name: "QA2", baseAttributes: { dex: 8, con: 10 } }, c, seed);
  s.settings.materialsToStorage = true;
  for (const id of Object.keys(c.skills)) s.skills[id] = { xp: xpForLevel(level) };
  addItem(s.inventory, c, bow, 1);
  addItem(s.inventory, c, quiver, 1);
  expect(equipItem(s, c, bow).ok).toBe(true);
  expect(equipItem(s, c, quiver).ok).toBe(true);
  s.character.hp = computeStats(s, c).maxHp;
  return s;
}

/** Synthetischer Dungeon (120 Goblins) ohne Quest-/Zonen-Gate. */
function dungeonContent(): ContentDB {
  const d: DungeonDef = {
    id: "qa2_dg",
    name: { en: "QA2 Dungeon", de: "QA2-Dungeon" },
    requiredLevel: 1,
    encounters: Array.from({ length: 120 }, () => "goblin"),
    loot: [],
    xp: 0,
    gold: 0,
  };
  return { ...base, dungeons: [...base.dungeons, d] };
}

/** Synthetischer Raid (Muster qa-raid-run.test.ts): zwei Räume Goblins + Kriegshäuptling. */
function raidContent(): ContentDB {
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
    name: { en: "QA2 Raid", de: "QA2-Raid" },
    unlockDungeonId: base.dungeons[0]!.id,
    rooms: rooms.map((d, i) => ({
      id: `r${i}`,
      name: d.name,
      dungeonId: d.id,
      bossId: "goblin_warchief",
      table: { draws: 1, extraChance: 0, entries: [{ itemId: "copper_sword", weight: 3 }, { itemId: "copper_dagger", weight: 2 }] },
    })),
    fees: { normal: 1000, heroic: 3000, mythic: 8000 },
    heroicRestartCost: 500,
    mythicRefundPct: 0.25,
    scaling: {
      normal: { hpMult: 1, damageMult: 1, levelAdd: 0, defenseMult: 1 },
      heroic: { hpMult: 2, damageMult: 1.6, levelAdd: 10, defenseMult: 1.1 },
      mythic: { hpMult: 2.4, damageMult: 1.7, levelAdd: 20, defenseMult: 1.2 },
    },
    reinforcedWave: { index: 3, hpMult: 1.5, damageMult: 1.15 },
    trashLoot: [{ itemId: "relic_dust", chance: 1, qty: { normal: [1, 1], heroic: [1, 2], mythic: [2, 3] } }],
    trashPieceChance: { normal: 0, heroic: 0, mythic: 0 },
    bossSideLoot: [{ itemId: "godiron_bar", chance: 1, qty: { normal: [2, 4], heroic: [2, 4], mythic: [2, 4] } }],
    suffixChance: { normal: 0, heroic: 0, mythic: 0 },
    weeklyChest: { extraItems: [{ itemId: "godiron_bar", qty: 5 }], dust: { normal: 15, heroic: 25, mythic: 40 } },
    maxAutoRestarts: 3,
  };
  return { ...base, dungeons: [...base.dungeons, ...rooms], raids: [def] };
}

describe("Keine Pfeile mehr: Dungeon und Raid laufen mit einfachen Pfeilen weiter, kein Auto-Stopp", () => {
  it("Dungeon: 3 Pfeile ohne Nachfüllen; Lauf geht weiter, Lager unberührt, kein stopReason", () => {
    const c = dungeonContent();
    const s = archer(99, "godiron_shortbow", "godiron_quiver", c);
    s.settings.quiverAutoRefill = false;
    s.bank.godiron_arrow = 100;
    expect(loadQuiver(s, c, "godiron_arrow", 3)).toEqual({ ok: true, qty: 3 });
    expect(startDungeon(s, c, "qa2_dg")).toBe(true);
    advance(s, c, 180_000, { offline: true });
    expect(s.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 0 });
    expect(s.bank.godiron_arrow).toBe(97);
    expect(activeArrow(s, c)).toBeUndefined();
    expect(s.combat.stopReason ?? null).toBeNull();
    expect(s.combat.kills).toBeGreaterThan(10);
    // Entweder noch im Dungeon oder regulär durch (Clear gezählt); nie „ohne Pfeile stehen geblieben“.
    const stillIn = s.combat.dungeonId === "qa2_dg" && s.combat.monsterId !== null;
    expect(stillIn || (s.dungeonsCleared["qa2_dg"] ?? 0) > 0).toBe(true);
  });

  it("Raid (Normal, Auto-Weiter): 3 Pfeile ohne Nachfüllen; Räume werden mit einfachen Pfeilen geräumt", () => {
    const c = raidContent();
    const s = archer(99, "godiron_shortbow", "godiron_quiver", c);
    s.settings.quiverAutoRefill = false;
    s.settings.raidAutoContinue = true;
    s.stats.kills = 0;
    s.dungeonsCleared[c.raids![0]!.unlockDungeonId] = 1;
    s.character.gold = 50_000;
    s.bank.godiron_arrow = 100;
    expect(loadQuiver(s, c, "godiron_arrow", 3)).toEqual({ ok: true, qty: 3 });
    expect(startRaid(s, c, "qa2_raid", "normal")).toBe("ok");
    advance(s, c, 600_000, { offline: true });
    expect(s.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 0 });
    expect(s.bank.godiron_arrow).toBe(97);
    expect(s.combat.stopReason ?? null).toBeNull();
    expect(s.stats.kills ?? 0).toBeGreaterThan(5); // combat.kills zählt je Raum neu
    const run = s.raid?.run;
    // Lauf abgeschlossen (Phase complete / kein Lauf mehr) oder noch im Kampf mit einfachen Pfeilen.
    expect(!run || run.phase === "complete" || s.combat.monsterId !== null).toBe(true);
  });

  it("Raid (Normal) mit Nachfüllen: Pfeile werden im Raid verbraucht und aus dem Lager nachgezogen", () => {
    const c = raidContent();
    const s = archer(99, "godiron_shortbow", "godiron_quiver", c);
    s.settings.raidAutoContinue = true;
    s.dungeonsCleared[c.raids![0]!.unlockDungeonId] = 1;
    s.character.gold = 50_000;
    s.bank.godiron_arrow = 1000;
    expect(loadQuiver(s, c, "godiron_arrow", 2)).toEqual({ ok: true, qty: 2 });
    expect(startRaid(s, c, "qa2_raid", "normal")).toBe("ok");
    advance(s, c, 600_000, { offline: true });
    const left = (s.bank.godiron_arrow ?? 0) + (s.character.quiver?.qty ?? 0);
    expect(left).toBeLessThan(1002);
    expect(left).toBeGreaterThan(900);
    expect(s.bank.godiron_arrow ?? 0).toBeLessThan(1000); // mindestens einmal nachgefüllt
  });
});

describe("Köcher ablegen / wieder anlegen", () => {
  it("Bogen gegen Bogen tauschen lässt Köcher und Ladung unberührt; Schild verdrängt Bogen UND Köcher (Pfeile ins Lager)", () => {
    const s = archer();
    s.bank.godiron_arrow = 25;
    loadQuiver(s, content, "godiron_arrow");
    addItem(s.inventory, content, "godiron_longbow", 1);
    expect(equipItem(s, content, "godiron_longbow").ok).toBe(true);
    expect(s.character.equipment.mainhand).toBe("godiron_longbow");
    expect(s.character.equipment.offhand).toBe("godiron_quiver");
    expect(s.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 25 });
    expect(activeArrow(s, content)?.itemId).toBe("godiron_arrow");
    addItem(s.inventory, content, "wooden_shield", 1);
    expect(equipItem(s, content, "wooden_shield").ok).toBe(true);
    expect(s.character.equipment.offhand).toBe("wooden_shield");
    expect(s.character.equipment.mainhand).toBeNull();
    expect(s.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 0 });
    expect(s.bank.godiron_arrow).toBe(25);
    expect(itemCount(s.inventory, "godiron_quiver")).toBe(1);
    expect(itemCount(s.inventory, "godiron_longbow")).toBe(1);
  });

  it("Köcher ablegen legt die Pfeile ins Lager und merkt die Art; erneut anlegen füllt automatisch nach", () => {
    const s = archer();
    s.bank.godiron_arrow = 40;
    loadQuiver(s, content, "godiron_arrow");
    expect(s.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 40 });
    expect(unequipItem(s, content, "offhand")).toBe(true);
    expect(s.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 0 });
    expect(s.bank.godiron_arrow).toBe(40);
    expect(itemCount(s.inventory, "godiron_quiver")).toBe(1);
    expect(equipItem(s, content, "godiron_quiver").ok).toBe(true);
    expect(s.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 40 });
    expect(s.bank.godiron_arrow).toBeUndefined();
  });
});

describe("Aschegang: geladene Pfeile als Truhenstapel (echter Aufstieg)", () => {
  it("100 geladene Pfeile, Truhe gewählt ⇒ nach dem Aufstieg 50 im Lager (Stapeldeckel), Köcher leer", () => {
    const s = archer();
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: 0 };
    for (const id of ["attack", "power", "defence", "ranged"]) s.skills[id] = { xp: xpForLevel(99) };
    s.quests.claimed.push(PRESTIGE_UNLOCK_QUEST_ID);
    expect(prestigeUnlock(s, content).ok).toBe(true);
    s.prestige = { ...defaultPrestigeState(), count: 1 }; // Prestige-Baum erst ab dem ersten Aufstieg
    s.talents = { prestige: { keepTools: 1, keepBankStacks: 1 } };
    s.bank.godiron_arrow = 100;
    expect(loadQuiver(s, content, "godiron_arrow")).toEqual({ ok: true, qty: 100 });
    expect(s.bank.godiron_arrow).toBeUndefined();
    const pv = prestigeAscendPreview(s, content);
    expect(pv.stashSlots).toBeGreaterThanOrEqual(1);
    const cand = pv.stashCandidates.find((x) => x.itemId === "godiron_arrow");
    expect(cand?.keep).toBe(Math.min(100, pv.stashStackCap));
    expect(prestigeAscendCheck(s, content, { stash: ["godiron_arrow"] })).toEqual({ ok: true });
    expect(ascend(s, content, { stash: ["godiron_arrow"] })).toBe(true);
    expect(s.prestige?.count).toBe(2);
    expect(s.character.quiver).toBeNull();
    expect(s.bank.godiron_arrow).toBe(Math.min(100, pv.stashStackCap));
  });
});

describe("Aufträge: Pfeile im Köcher zählen nicht als Bestand", () => {
  // Bognerei ist Auftrags-Skill (EVENT_CRAFT_SKILLS). Wer die bestellten Pfeile vor der Abgabe lädt oder im Kampf nachfüllen
  // lässt, hat für den Auftrag „keinen Bestand“, obwohl die Pfeile im Köcher liegen (Aschegang zählt sie als Lagerware).
  it("Bognerei ist Auftrags-Skill (produce)", () => {
    expect(workOrderKindFor("bowcraft")).toBe("produce");
  });

  // claude:2026-10-24T15:21:04+02:00 — Befund B2 per CEO-Entscheid gelöst: Der Köcher ist ausgerüstete Munition wie angelegte Ausrüstung und zählt NICHT als
  // Auftragsbestand; Einlegen und Nachfüllen ziehen nur bis zum Köcher-Deckel (QUIVER_CAPACITY), der Rest bleibt im Lager und ist
  // abgebbar. Der Test prüft jetzt diese Regel (vorher it.fails mit der Erwartung „Abgabe aus dem Köcher“).
  it("Köcher zählt nicht als Auftragsbestand; Nachfüllen nur bis zum Köcher-Deckel, der Rest im Lager ist abgebbar", () => {
    const s = archer(99, "copper_shortbow", "copper_quiver");
    s.settings.materialsToStorage = false;
    const w = workOrdersOf(s);
    w.seq += 1;
    const order: WorkOrder = {
      id: w.seq,
      kind: "produce",
      tier: 2, // claude:2026-10-25T17:05:00+01:00 — Pflichtfeld Stufe seit SAVE 97 (1.4.1 gestufte Aufträge)
      skill: "bowcraft",
      actionId: "fletch_copper_arrow",
      itemId: "copper_arrow",
      count: 30,
      minutes: 20,
      band: 1,
      gold: 100,
      xp: 1_000,
      customerId: "guild",
      baseline: s.stats.producedById?.["copper_arrow"] ?? 0,
    };
    w.open.push(order);
    addItem(s.inventory, content, "arrow_shaft", 60);
    addItem(s.inventory, content, "copper_arrowheads", 60);
    addItem(s.inventory, content, "feather", 20);
    setActiveAction(s, content, "fletch_copper_arrow");
    s.actionTarget = 2;
    const dur = effectiveActionDurationMs(s, content, content.actions.fletch_copper_arrow!);
    advance(s, content, 4 * dur, { offline: true });
    expect(workOrderProgress(s, order).ready).toBe(true);
    expect(itemCount(s.inventory, "copper_arrow")).toBeGreaterThanOrEqual(30);
    // (a) Vorrat unter dem Deckel: alles kommt in den Köcher, und der zählt nicht als Bestand (wie angelegte Ausrüstung).
    expect(loadQuiver(s, content, "copper_arrow").ok).toBe(true);
    const loaded = s.character.quiver!.qty;
    expect(loaded).toBeGreaterThanOrEqual(30);
    expect(loaded).toBeLessThanOrEqual(QUIVER_CAPACITY);
    expect(deliverWorkOrder(s, content, order.id, s.rng).reason).toBe("no_stock");
    expect(s.character.quiver!.qty).toBe(loaded);
    // (b) Nachfüllen bei großem Lagerstapel: höchstens der Deckel wandert in den Köcher, der Rest bleibt im Lager.
    unloadQuiver(s, true);
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 });
    s.bank.copper_arrow = (s.bank.copper_arrow ?? 0) + QUIVER_CAPACITY;
    expect(refillQuiver(s, content)).toBe(true);
    expect(s.character.quiver!.qty).toBe(QUIVER_CAPACITY);
    expect(s.bank.copper_arrow).toBe(loaded);
    const res = deliverWorkOrder(s, content, order.id, s.rng);
    expect(res.reason).toBe("ok");
    expect(s.character.quiver!.qty).toBe(QUIVER_CAPACITY); // der Köcher bleibt unangetastet
    expect(s.bank.copper_arrow ?? 0).toBe(loaded - 30);
  });
});

// ── Balance-Stichprobe ────────────────────────────────────────────────────────────────────────────────

/** Formeln wie balance-envelope.test.ts (expectedTtkOf), hier nur Spieler-DPS gegen den Anker. */
function mitigation(defense: number): number {
  return Math.min(DEFENSE_MITIGATION_MAX, defense / (defense + DEFENSE_MITIGATION_K));
}
function hitChance(accuracy: number, evasion: number): number {
  const sum = accuracy + evasion;
  return Math.max(MIN_HIT_CHANCE, sum > 0 ? accuracy / sum : 0.5);
}
function analytic(state: GameState, monsterId: string): { dps: number; ttkPlayer: number; ttkEnemy: number } {
  const st = computeStats(state, content);
  const m = content.monsters[monsterId]!;
  const hcP = hitChance(st.accuracy, m.evasion * (1 - st.precision));
  const red = mitigation(m.defense * (1 - st.armorPen));
  const mean = ((st.attackDamageMin + st.attackDamageMax) / 2) * (1 - red);
  const eOut = hcP * mean * (1 + st.critChance * (st.critDamage - 1));
  const effHp = m.maxHp + (m.wardCapacity ?? 0) * (1 - st.wardBreak);
  const hc = hitChance(enemyEffectiveAccuracy(m), st.evasion);
  const land = (1 - combinedFloorDodge(st.dodgeChance, hc)) * hc;
  let hit = m.damage * DMG_MAX_HIT_MULT * ((1 + DMG_ROLL_FLOOR) / 2) * (1 - mitigation(st.defense));
  if (st.dodgeChance > 0) hit *= 1 - LEATHER_HIT_FLOOR;
  hit *= 1 - st.blockChance * 0.85;
  hit = Math.min(hit, 0.5 * st.maxHp);
  hit *= 1 - st.damageReduction;
  const dps = eOut / (st.attackIntervalMs / 1000);
  return { dps, ttkPlayer: effHp / dps, ttkEnemy: ((st.maxHp + st.maxWard) / (land * hit)) * (m.attackIntervalMs / 1000) };
}

const BANDS: Array<[number, string]> = [[20, "goblin_warlock"], [40, "ash_tyrant"], [60, "forest_warden"], [80, "skeleton_nekro"], [99, "idol_warden"], [99, "drazhan"]];
/** Spec §10.1 „nachher, alte Waffenwahl“ (der Bauer der Hülle, unverändert). */
const SPEC_OLD_CHOICE = [0.999, 1.164, 0.965, 1.06, 1.024, 1.022];

describe("Balance-Stichprobe Fernkampf gegen Nahkampf (BiS-Hülle, analytisch)", () => {
  it("Fünf Bänder + Drazhan: Fern-DPS / Nah-DPS; Zahlen im Log, Toleranz zur Spec-Spalte ±0,05", () => {
    const rows: string[] = ["| Band | Anker | Fern/Nah | Spec (alte Waffenwahl) | Fern/Magie | Bogen · Köcher · Pfeil | TTK Spieler F/N/M | TTK Boss F/N/M |"];
    BANDS.forEach(([lvl, anchor], i) => {
      const by = {} as Record<WeaponStyle, ReturnType<typeof analytic>>;
      let kit = "";
      for (const style of ["melee", "ranged", "magic"] as WeaponStyle[]) {
        const b = buildBisCharacter(content, style, lvl, "damage", { allBuffs: true, excludeRaid: true });
        by[style] = analytic(b.state, anchor);
        if (style === "ranged") kit = `${b.kit.mainhand} · ${b.kit.offhand ?? "–"} · ${b.state.character.quiver?.itemId ?? "–"}`;
      }
      const rn = by.ranged.dps / by.melee.dps;
      const rm = by.ranged.dps / by.magic.dps;
      rows.push(
        `| CL ${lvl} | ${anchor} | ${rn.toFixed(3)} | ${SPEC_OLD_CHOICE[i]} | ${rm.toFixed(3)} | ${kit} | ${by.ranged.ttkPlayer.toFixed(1)} / ${by.melee.ttkPlayer.toFixed(1)} / ${by.magic.ttkPlayer.toFixed(1)} | ${by.ranged.ttkEnemy.toFixed(1)} / ${by.melee.ttkEnemy.toFixed(1)} / ${by.magic.ttkEnemy.toFixed(1)} |`,
      );
      expect(rn, `CL ${lvl} ${anchor}`).toBeGreaterThan(SPEC_OLD_CHOICE[i]! - 0.05);
      expect(rn, `CL ${lvl} ${anchor}`).toBeLessThan(SPEC_OLD_CHOICE[i]! + 0.05);
    });
    console.log(rows.join("\n"));
  });
});

const deathsOf = (s: GameState): number => (s.stats as unknown as { deaths?: number }).deaths ?? 0;

describe("Balance-Stichprobe im echten Kampf (15 min offline, BiS-Schadensbuild, Auto-Essen aus)", () => {
  it("Kills je Stil und Band (Anker-Boss), mit Toden; nur Protokoll", () => {
    const rows: string[] = ["| Band | Anker | Nah Kills/Tode | Fern Kills/Tode | Magie Kills/Tode | Fern/Nah |"];
    for (const [lvl, anchor] of BANDS) {
      const out: Record<string, string> = {};
      const kills: Record<string, number> = {};
      let used = "";
      for (const style of ["melee", "ranged", "magic"] as WeaponStyle[]) {
        const s = buildBisCharacter(content, style, lvl, "damage", { allBuffs: true, excludeRaid: true, seed: 5 }).state;
        s.character.hp = computeStats(s, content).maxHp;
        if (style === "ranged") {
          const q = s.character.quiver;
          if (q) s.bank[q.itemId] = 100_000;
        }
        const deaths0 = deathsOf(s);
        // Anker-Bosse sind Dungeon-Monster (kein Direktstart): nächstes direkt kämpfbares Monster der offenen Welt.
        const target = content.monsters[anchor]!.level;
        const cands = Object.values(content.monsters)
          .filter((m) => !m.dungeonOnly && !/^(gk_|tower_|dg_)/.test(m.id))
          .sort((a, b) => Math.abs(a.level - target) - Math.abs(b.level - target));
        const pick = cands.find((m) => startCombat(s, content, m.id));
        expect(pick, `kämpfbarer Anker nahe L${target}`).toBeDefined();
        used = `${pick!.id} (L${pick!.level})`;
        advance(s, content, 15 * 60_000, { offline: true });
        kills[style] = s.combat.kills;
        out[style] = `${s.combat.kills}/${deathsOf(s) - deaths0}`;
      }
      rows.push(`| CL ${lvl} | ${used} | ${out.melee} | ${out.ranged} | ${out.magic} | ${kills.melee! > 0 ? (kills.ranged! / kills.melee!).toFixed(2) : "–"} |`);
    }
    console.log(rows.join("\n"));
  });
});

describe("Zweihand-Markierung im Content", () => {
  const TWO = new Set(["greatsword", "greataxe", "maul", "staff", "shortbow", "longbow"]);
  const ONE = new Set(["dagger", "sword", "scimitar", "axe", "battleaxe", "wand", "scepter"]);
  it("eindeutige Typen sind durchgehend markiert; Speer/Streitkolben-Mischung ist die dokumentierte Datenlage (4 Einhand-Speere, 3 Zweihand-Kolben)", () => {
    const weapons = Object.values(content.items).filter((i) => i.type === "equipment" && i.slot === "mainhand" && i.weaponType);
    for (const w of weapons) {
      if (TWO.has(w.weaponType!)) expect(w.twoHanded, w.id).toBe(true);
      if (ONE.has(w.weaponType!)) expect(!!w.twoHanded, w.id).toBe(false);
    }
    const oneHandSpears = weapons.filter((w) => w.weaponType === "spear" && !w.twoHanded).map((w) => w.id).sort();
    const twoHandMaces = weapons.filter((w) => w.weaponType === "mace" && w.twoHanded).map((w) => w.id).sort();
    expect(oneHandSpears).toEqual(["bonewrought_spear", "cinder_spike", "pitchfork_spear", "wolffang_spear"]);
    expect(twoHandMaces).toEqual(["cinderwretch_maul", "direfang_maul", "emberforge_hammer"]);
    const quivers = Object.values(content.items).filter((i) => i.weaponType === "quiver");
    expect(quivers).toHaveLength(15);
    for (const q of quivers) {
      expect(q.slot, q.id).toBe("offhand");
      expect(q.twoHanded, q.id).toBeFalsy();
    }
  });
});
