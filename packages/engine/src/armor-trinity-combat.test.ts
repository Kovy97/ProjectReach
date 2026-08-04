import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import {
  BLOCK_DAMAGE_REDUCTION,
  ONE_SHOT_CAP,
  WARD_KILL_REFILL_PCT,
  WARD_PER_MANA,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { castManaCost, startCombat, combatStep } from "./combat";

/**
 * Rüstungs-Trinität / Itemization 2.5 (design/armor-trinity-spec.md), Phase A2 — die vier
 * Defensiv-Mechaniken IM FIGHT (combat.ts). Die Spec-Werte werden hier LOKAL auf Test-Items
 * injiziert (content-dev prägt die echten Werte erst später auf) → Dodge/Block/One-Shot-Cap/Ward
 * sind hier content-unabhängig abgesichert. Reihenfolge (Armor-Iteration 2 §5.2): Dodge →
 * Accuracy-Contest → Mitigation → Leder-Floor → Block → One-Shot-Cap → Ward-Absorb → HP.
 */

// ── Test-Content-Fabriken ────────────────────────────────────────────────────
function withItems(items: ItemDef[]): ContentDB {
  const map = { ...content.items };
  for (const it of items) map[it.id] = it;
  return { ...content, items: map };
}
function withMonster(c: ContentDB, m: MonsterDef): ContentDB {
  return { ...c, monsters: { ...c.monsters, [m.id]: m } };
}

/** 1H-Magiewaffe (Block nicht durch 2H genullt; kein Munitions-Handling nötig). */
const WAND: ItemDef = {
  id: "tt_wand",
  name: "Test-Zepter",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "magic",
  twoHanded: false,
  bonus: { magicDamage: 5, accuracy: 40 },
  manaCost: 10,
};

/** Rüstungsteil-Fabrik: injiziert eine Klassen-Schicht auf einen echten Slot. */
function armor(id: string, slot: ItemDef["slot"], fields: Partial<ItemDef>): ItemDef {
  return { id, name: id, type: "equipment", stackable: false, slot, ...fields } as ItemDef;
}

/** Gegner, der zuverlässig JEDEN Tick trifft (riesige HP → stirbt nie, Test-Fenster stabil). */
function hitter(id: string, damage: number, attackIntervalMs = 1000): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 10,
    maxHp: 5_000_000,
    damage,
    accuracy: 100_000, // trifft praktisch immer (isoliert die Klassen-Mechanik vom Contest)
    evasion: 0,
    defense: 0,
    attackIntervalMs,
    xp: 0,
    gold: 0,
    loot: [],
  };
}

/** Setzt die Timer so, dass in EINEM combatStep NUR der Gegner (nicht der Spieler) angreift. */
function enemyOnlyTick(s: ReturnType<typeof createTestGame>, monster: MonsterDef): void {
  s.combat.playerTimerMs = 0; // Spieler-Intervall (>100 ms) wird in diesem Tick nicht voll
  s.combat.enemyTimerMs = monster.attackIntervalMs; // += TICK_MS ⇒ Gegner schlägt zu
}

describe("Rüstungs-Trinität A2: Leder-Dodge (Voll-Vermeidung, §1.3)", () => {
  it("hoher dodgeChance vermeidet spürbar mehr Treffer → deutlich weniger HP-Verlust", () => {
    // Vergleich hoher Dodge vs. quasi-0 (beide ziehen den Dodge-Roll → RNG grob vergleichbar).
    // Hoher con ⇒ der Held ÜBERLEBT das Fenster → `hp0 - hp` ist ein sauberes kumulatives
    // Schadensmaß (kein Tod-Voll-Heal, der die Messung auf 0 zurücksetzt).
    function hpLost(evasionRating: number, seed: number): number {
      const c = withMonster(
        withItems([WAND, armor("tt_leather", "body", { evasionRating })]),
        hitter("tt_dodge_mob", 30),
      );
      const s = createTestGame({ name: "D", baseAttributes: { int: 6, con: 400 } }, c, seed);
      s.character.equipment.mainhand = "tt_wand";
      s.character.equipment.body = "tt_leather";
      s.character.food = null;
      const st = computeStats(s, c);
      s.character.hp = st.maxHp;
      startCombat(s, c, "tt_dodge_mob");
      const hp0 = s.character.hp;
      for (let i = 0; i < 120; i++) {
        combatStep(s, c);
        if (s.combat.monsterId === null) break; // Sicherheitsnetz (sollte bei con 400 nicht sterben)
      }
      expect(s.stats.deaths).toBe(0); // Messung ohne Tod-Reset
      return hp0 - s.character.hp;
    }
    let high = 0;
    let low = 0;
    for (let seed = 1; seed <= 30; seed++) {
      high += hpLost(10_000, seed); // dodgeChance = DODGE_CAP (0.40 seit #301; Kurve läge bei ~0.5)
      low += hpLost(0.01, seed); // ~0 % — praktisch nie ausgewichen
    }
    expect(low).toBeGreaterThan(0);
    // Evasion-Tempo-Zähmung #301: 40 % Voll-Vermeidung ⇒ erwartetes Schadens-Verhältnis ~0.6
    // (vorher 0.75-Cap ⇒ ~0.25). Beide Läufe tragen Leder (LEATHER_HIT_FLOOR wirkt identisch).
    expect(high).toBeLessThan(low * 0.75); // Dodge wirkt klar messbar …
    expect(high).toBeGreaterThan(low * 0.45); // … ist aber keine Quasi-Unsichtbarkeit mehr (#301-Kern)
  });
});

describe("Rüstungs-Trinität A2: Schild-Block (−75 %, §1.2)", () => {
  it("blockChance senkt den durchschnittlichen erlittenen Schaden (Block reduziert, nullt nicht)", () => {
    // Beide Läufe ziehen den Block-Roll (blockChance>0) → RNG-Sequenz bleibt ausgerichtet; nur die
    // Block-WIRKUNG unterscheidet sich. Ward/Cast sind in beiden Läufen identisch → heben sich auf.
    function hpLost(blockChance: number, seed: number): number {
      const c = withMonster(
        withItems([WAND, armor("tt_shield", "offhand", { blockChance })]),
        hitter("tt_block_mob", 24),
      );
      const s = createTestGame({ name: "B", baseAttributes: { int: 6, con: 400 } }, c, seed);
      s.character.equipment.mainhand = "tt_wand";
      s.character.equipment.offhand = "tt_shield";
      s.character.food = null;
      const st = computeStats(s, c);
      expect(st.blockChance).toBeCloseTo(blockChance, 6); // Block aktiv (1H-Mainhand)
      s.character.hp = st.maxHp;
      startCombat(s, c, "tt_block_mob");
      const hp0 = s.character.hp;
      for (let i = 0; i < 150; i++) {
        combatStep(s, c);
        if (s.combat.monsterId === null) break; // Sicherheitsnetz (con 400 ⇒ kein Tod erwartet)
      }
      expect(s.stats.deaths).toBe(0);
      return hp0 - s.character.hp;
    }
    let blocked = 0;
    let unblocked = 0;
    for (let seed = 1; seed <= 30; seed++) {
      blocked += hpLost(0.5, seed); // BLOCK_CAP
      unblocked += hpLost(0.0001, seed); // ~0 % (zieht denselben Roll → RNG-aligned)
    }
    expect(unblocked).toBeGreaterThan(0);
    expect(blocked).toBeLessThan(unblocked); // Block reduziert den erlittenen Schaden
    // aber nullt ihn NICHT (−75 % auf ~50 % der Treffer ⇒ deutlich mehr als 0).
    expect(blocked).toBeGreaterThan(unblocked * 0.4);
    expect(BLOCK_DAMAGE_REDUCTION).toBeLessThan(1);
  });
});

describe("Rüstungs-Trinität A2: One-Shot-Cap (§1.6)", () => {
  it("kein Einzeltreffer entfernt mehr als ONE_SHOT_CAP · maxHp", () => {
    // Winzige maxHp (con niedrig) + brutaler Gegner ⇒ der Roh-Treffer übersteigt den Cap IMMER →
    // jeder gelandete Treffer wird exakt auf round(ONE_SHOT_CAP · maxHp) gedeckelt. Ward=0 isoliert.
    let landed = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const c = withMonster(withItems([WAND]), hitter("tt_burst_mob", 200));
      const s = createTestGame({ name: "O", baseAttributes: { int: 3, con: 3 } }, c, seed);
      s.character.equipment.mainhand = "tt_wand";
      s.character.food = null;
      const st = computeStats(s, c);
      s.character.hp = st.maxHp;
      startCombat(s, c, "tt_burst_mob");
      s.character.ward = 0; // Ward ausklammern → reiner Cap-Test
      enemyOnlyTick(s, c.monsters.tt_burst_mob!);
      combatStep(s, c);
      const hit = [...s.combat.log].reverse().find((e) => e.by === "enemy" && e.kind === "hit");
      if (hit && hit.amount > 0) {
        landed++;
        const cap = Math.round(ONE_SHOT_CAP * st.maxHp);
        expect(hit.amount).toBe(cap); // Roh-Treffer (~150–296) IMMER auf den Cap gedrückt
        expect(hit.amount).toBeLessThan(st.maxHp); // garantiert ≥ 2 Treffer aus vollem Leben
      }
    }
    expect(landed).toBeGreaterThan(0); // der Gegner traf tatsächlich (Test aussagekräftig)
  });
});

describe("Rüstungs-Trinität A2: Ward-Absorb VOR HP (§1.4/§1.5)", () => {
  it("ein Treffer wird zuerst vom Ward-Pool gedeckt (HP unberührt), als shield geloggt", () => {
    const c = withMonster(
      withItems([WAND, armor("tt_robe", "body", { wardCapacity: 1000 })]),
      hitter("tt_ward_mob", 20),
    );
    const s = createTestGame({ name: "W", baseAttributes: { int: 6, con: 40 } }, c, 7);
    s.character.equipment.mainhand = "tt_wand";
    s.character.equipment.body = "tt_robe";
    s.character.food = null;
    const st = computeStats(s, c);
    expect(st.maxWard).toBeGreaterThan(500); // großer Stoff-Pool
    s.character.hp = st.maxHp;
    startCombat(s, c, "tt_ward_mob");
    s.character.ward = st.maxWard; // voll (wie beim Kampfstart)
    const hpBefore = s.character.hp;
    const wardBefore = s.character.ward;
    enemyOnlyTick(s, c.monsters.tt_ward_mob!);
    combatStep(s, c);
    const shield = [...s.combat.log].reverse().find((e) => e.by === "player" && e.kind === "shield");
    expect(s.character.hp).toBe(hpBefore); // HP komplett verschont (Ward fing alles ab)
    expect(s.character.ward).toBeLessThan(wardBefore); // Ward hat absorbiert
    expect(shield).toBeTruthy(); // Absorption als shield-Event sichtbar
    expect(Math.round(wardBefore - s.character.ward)).toBe(shield!.amount);
  });
});

describe("Rüstungs-Trinität A2: Ward-Recharge beim Cast (§1.4)", () => {
  it("ein echter Cast lädt den Ward-Pool um cost · WARD_PER_MANA (an Mana-Verbrauch gekoppelt)", () => {
    // Riesiges Intervall → der Gegner schlägt in diesem Tick NICHT zu (Ward nur durch den Cast bewegt).
    const c = withMonster(
      withItems([WAND, armor("tt_robe2", "body", { wardCapacity: 1000 })]),
      hitter("tt_recharge_mob", 5, 10_000_000),
    );
    const s = createTestGame({ name: "R", baseAttributes: { int: 6, wis: 4, con: 40 } }, c, 3);
    s.character.equipment.mainhand = "tt_wand";
    s.character.equipment.body = "tt_robe2";
    const st = computeStats(s, c);
    s.character.hp = st.maxHp;
    s.character.mana = st.maxMana; // ≥ Cast-Kosten → castet garantiert
    startCombat(s, c, "tt_recharge_mob");
    s.character.ward = 0; // leer → der Recharge ist eindeutig messbar (Pool 1000 ⇒ kein Deckel)
    s.combat.playerTimerMs = st.attackIntervalMs; // += TICK_MS ⇒ Spieler castet in diesem Tick
    combatStep(s, c);
    const cost = castManaCost(c, "tt_wand");
    expect(cost).toBe(10);
    // Armor-Iteration 2 §9.2: der Ward wird pro Tick zusätzlich um den passiven Warding-Regen
    // (st.wardRegenPerSec·dt) gehoben — ADDITIV zum Cast-Recharge. Erwartung = Cast-Recharge
    // (cost·WARD_PER_MANA = 2 nach It2.1-F1a) + ein Warding-Regen-Tick.
    expect(s.character.ward).toBeCloseTo(cost * WARD_PER_MANA + st.wardRegenPerSec * (100 / 1000), 6);
  });

  it("ohne Mana (Weak-Melee) gibt es keinen Cast und damit KEINEN Ward-Recharge", () => {
    const c = withMonster(
      withItems([WAND, armor("tt_robe3", "body", { wardCapacity: 1000 })]),
      hitter("tt_norecharge_mob", 5, 10_000_000),
    );
    const s = createTestGame({ name: "N", baseAttributes: { int: 6, wis: 0, con: 40 } }, c, 3);
    s.character.equipment.mainhand = "tt_wand";
    s.character.equipment.body = "tt_robe3";
    const st = computeStats(s, c);
    s.character.hp = st.maxHp;
    s.character.mana = 0; // unter den Cast-Kosten → Weak-Melee, kein Cast
    startCombat(s, c, "tt_norecharge_mob");
    s.character.ward = 0;
    s.combat.playerTimerMs = st.attackIntervalMs;
    combatStep(s, c);
    // Armor-Iteration 2 §9.2: ohne Mana gibt es KEINEN Cast → KEINEN Cast-Recharge (+2). Die EINZIGE
    // Ward-Bewegung ist der passive Warding-Regen (st.wardRegenPerSec·dt ≪ 1/Tick) — der mana-leere
    // „Weak-Melee"-Magier ist damit nicht mehr komplett ward-los, aber der Recharge bleibt cast-gegatet.
    expect(s.character.ward).toBeCloseTo(st.wardRegenPerSec * (100 / 1000), 6); // NUR Regen, KEIN Recharge
    expect(s.character.ward).toBeLessThan(1); // weit unter dem Cast-Recharge (der läge bei 2)
  });
});

describe("Rüstungs-Trinität A2: Ward-Init bei Kampfstart UND Respawn (§1.4)", () => {
  it("startCombat finalisiert ward = maxWard (voller Ward zu Kampfbeginn)", () => {
    const c = withItems([WAND, armor("tt_robe4", "body", { wardCapacity: 200 })]);
    const s = createTestGame({ name: "S", baseAttributes: { int: 6, con: 20 } }, c, 1);
    s.character.equipment.mainhand = "tt_wand";
    s.character.equipment.body = "tt_robe4";
    s.character.ward = 3; // veralteter Rest
    startCombat(s, c, "goblin");
    expect(s.character.ward).toBe(computeStats(s, c).maxWard);
    // Armor-Iteration 2 §2: WARD_CORE_PER_INT=0 ⇒ maxWard = Σ wardCapacity (kein INT-Kern) = 200 exakt.
    expect(computeStats(s, c).maxWard).toBe(200);
  });

  it("nach dem Kill refillt der Respawn den Ward-Pool NUR um WARD_KILL_REFILL_PCT (10 %) — kein Voll-Reset (§6.1)", () => {
    // Armor-Iteration 2 §6.1: Ward ist farm-session-scoped. Der Respawn setzt NICHT mehr auf maxWard
    // (Gratis-Voll-Reset), sondern refillt nur `min(maxWard, ward + WARD_KILL_REFILL_PCT·maxWard)` → der
    // Pool erodiert über eine Farm-Serie (Food-Druck Magier). Voller Start bleibt startCombat, voll wieder
    // nur der Death-Heal. Melee-Setup mit Stoff-Robe: reiner Ward-Pool OHNE Cast-Recharge, der die Messung
    // verrauschen würde. Schwacher 1-HP/evasion-0-Gegner ⇒ der erste Spieler-Schlag tötet ihn (Respawn-Pfad).
    const sword: ItemDef = {
      id: "tt_sword",
      name: "Test-Klinge",
      type: "equipment",
      stackable: false,
      slot: "mainhand",
      weaponStyle: "melee",
      twoHanded: false,
      bonus: { meleeDamage: 25, accuracy: 60 },
    };
    const c = withMonster(
      withItems([sword, armor("tt_robe5", "body", { wardCapacity: 200 })]),
      {
        id: "tt_frail_mob",
        name: { en: "frail", de: "frail" },
        level: 1,
        maxHp: 1,
        damage: 1,
        accuracy: 1,
        evasion: 0, // Spieler trifft garantiert → Kill im ersten Angriffs-Tick
        defense: 0,
        attackIntervalMs: 4000, // schlägt im 1-Tick-Kill-Fenster nicht zu (kein Absorb → saubere Messung)
        xp: 0,
        gold: 0,
        loot: [],
      },
    );
    const s = createTestGame({ name: "K", baseAttributes: { str: 20, con: 20 } }, c, 1);
    s.character.equipment.mainhand = "tt_sword";
    s.character.equipment.body = "tt_robe5";
    const st = computeStats(s, c);
    expect(st.style).toBe("melee"); // kein Cast → kein Recharge (isoliert den Teil-Refill)
    expect(st.maxWard).toBe(200); // Σ wardCapacity, WARD_CORE_PER_INT=0
    s.character.hp = st.maxHp;
    startCombat(s, c, "tt_frail_mob");
    s.character.ward = 5; // niedrig → der Teil-Refill ist eindeutig messbar
    for (let i = 0; i < 60; i++) {
      s.combat.playerTimerMs = st.attackIntervalMs; // jeden Tick angreifen → Kill im ersten Tick
      combatStep(s, c);
      if (s.combat.kills > 0) break;
    }
    expect(s.combat.kills).toBeGreaterThan(0); // es kam zum Kill (+ Respawn)
    // Teil-Refill: ward ≈ 5 (+ ein Warding-Regen-Tick) + 0.10·200 = ~25 — KLAR unter dem vollen Pool (200).
    expect(s.character.ward).toBeLessThan(st.maxWard); // KEIN Gratis-Voll-Reset (§6.1)
    expect(s.character.ward).toBeCloseTo(5 + WARD_KILL_REFILL_PCT * st.maxWard, 0); // Basis + 10 %
  });
});
