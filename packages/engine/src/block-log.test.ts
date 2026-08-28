import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import { BLOCK_CAP, BLOCK_DAMAGE_REDUCTION } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat, combatStep } from "./combat";

/**
 * Regressionstest (Chef-BUG): Der Schild-Block (STEP 5 in strikeEnemy) reduzierte den Schaden
 * korrekt, schrieb aber KEIN Log-Event (anders als der Ward-Absorb darunter). Ergebnis: Der
 * Spieler sah nie „geblockt", obwohl ein 35-%-Schild aktiv war. Fix: pushLog(kind:"block") mit
 * dem GEBLOCKTEN Betrag. Diese Tests sichern ab, dass (1) ein tatsächlicher Block ein block-Event
 * mit positivem, geblocktem Betrag erzeugt und (2) ohne Block-Chance NIE ein block-Event entsteht.
 */

function withItems(items: ItemDef[]): ContentDB {
  const map = { ...content.items };
  for (const it of items) map[it.id] = it;
  return { ...content, items: map };
}
function withMonster(c: ContentDB, m: MonsterDef): ContentDB {
  return { ...c, monsters: { ...c.monsters, [m.id]: m } };
}

/** 1H-Magiewaffe → Block wird nicht durch 2H genullt, keine Munition nötig. */
const WAND: ItemDef = {
  id: "tt_wand",
  name: "Test-Zepter",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "magic",
  twoHanded: false,
  bonus: { magicDamage: 5, accuracy: 40 },
};

function armor(id: string, slot: ItemDef["slot"], fields: Partial<ItemDef>): ItemDef {
  return { id, name: id, type: "equipment", stackable: false, slot, ...fields } as ItemDef;
}

/** Gegner, der jeden Tick trifft (riesige HP → stirbt nie), defense 0 (Mitigation isoliert weg). */
function hitter(id: string, damage: number, attackIntervalMs = 1000): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 10,
    maxHp: 5_000_000,
    damage,
    accuracy: 100_000, // trifft praktisch immer
    evasion: 0,
    defense: 0,
    attackIntervalMs,
    xp: 0,
    gold: 0,
    loot: [],
  };
}

/** Ein combatStep, in dem NUR der Gegner zuschlägt (Spieler-Timer bleibt unter dem Intervall). */
function enemyOnlyTick(s: ReturnType<typeof createGame>, monster: MonsterDef): void {
  s.combat.playerTimerMs = 0;
  s.combat.enemyTimerMs = monster.attackIntervalMs;
}

/** Setup: 1H-Wand + Schild (blockChance), Melee-Stoff aus, Ward 0 → reiner Block-Pfad. */
function setupBlocker(blockChance: number, seed: number) {
  const c = withMonster(
    withItems([WAND, armor("tt_shield", "offhand", { blockChance })]),
    hitter("tt_blocklog_mob", 24),
  );
  const s = createGame({ name: "B", baseAttributes: { int: 6, con: 400 } }, c, seed);
  s.character.equipment.mainhand = "tt_wand";
  s.character.equipment.offhand = blockChance > 0 ? "tt_shield" : null;
  s.character.food = null;
  const st = computeStats(s, c);
  s.character.hp = st.maxHp;
  startCombat(s, c, "tt_blocklog_mob");
  s.character.ward = 0; // Ward-Schritt neutralisiert → der Restschaden ist reiner Block-Rest
  return { s, c, st, monster: c.monsters.tt_blocklog_mob! };
}

describe("Chef-BUG: Schild-Block schreibt ein block-Log-Event", () => {
  it("ein geblockter Treffer erzeugt ein block-Event mit positivem, geblocktem Betrag", () => {
    const { s, c, st, monster } = setupBlocker(BLOCK_CAP, 5);
    expect(st.blockChance).toBeCloseTo(BLOCK_CAP, 6); // Block aktiv (1H + Schild)

    let block: (typeof s.combat.log)[number] | undefined;
    let hitInSameTick: (typeof s.combat.log)[number] | undefined;
    // Über ein Fenster ticken, bis der erste Block fällt (BLOCK_CAP = 50 % ⇒ binnen weniger Ticks).
    for (let i = 0; i < 80 && s.combat.monsterId !== null; i++) {
      const before = s.combat.log.length;
      enemyOnlyTick(s, monster);
      combatStep(s, c);
      const thisTick = s.combat.log.slice(before);
      block = thisTick.find((e) => e.by === "player" && e.kind === "block");
      if (block) {
        // Der Rest-Treffer aus DEMSELBEN Tick (STEP 8, nach dem Block) → Block-Anteil vs. Rest.
        hitInSameTick = thisTick.find((e) => e.by === "enemy" && e.kind === "hit");
        break;
      }
    }

    expect(block).toBeTruthy(); // Kern des Regressionstests: der Block ist nicht mehr STUMM
    expect(block!.by).toBe("player");
    expect(block!.kind).toBe("block");
    expect(block!.amount).toBeGreaterThanOrEqual(1); // der GEBLOCKTE Betrag, nicht 0
    expect(s.stats.deaths).toBe(0); // con 400 → kein Tod-Reset verfälscht das Fenster

    // Der geloggte Betrag ist der geblockte Anteil (−85 %), NICHT der durchgekommene Rest (15 %):
    // damit ist block.amount > Rest-Treffer aus demselben Tick (kein Ward/Cap/Dodge dazwischen).
    if (hitInSameTick && hitInSameTick.amount > 0) {
      expect(block!.amount).toBeGreaterThan(hitInSameTick.amount);
    }
  });

  it("BLOCK_DAMAGE_REDUCTION < 1 → der Block nullt nicht, es bleibt ein Rest-Treffer zum Loggen", () => {
    expect(BLOCK_DAMAGE_REDUCTION).toBeGreaterThan(0);
    expect(BLOCK_DAMAGE_REDUCTION).toBeLessThan(1);
  });

  it("ohne Block-Chance (kein Schild) entsteht NIE ein block-Event", () => {
    const { s, c, st, monster } = setupBlocker(0, 5);
    expect(st.blockChance).toBe(0); // kein Schild → Block-Schritt ist ein No-op
    for (let i = 0; i < 80 && s.combat.monsterId !== null; i++) {
      enemyOnlyTick(s, monster);
      combatStep(s, c);
    }
    const anyBlock = s.combat.log.find((e) => e.kind === "block");
    expect(anyBlock).toBeUndefined(); // kein spurioses Block-Logging ohne aktiven Block
  });
});
