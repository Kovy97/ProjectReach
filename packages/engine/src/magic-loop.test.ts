import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import { MANA_PER_CAST } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { castManaCost, startCombat, combatStep } from "./combat";

/** Klont den Content und schiebt ein Test-Item in die Items-Map (read-only Original bleibt). */
function withItem(item: ItemDef): ContentDB {
  return { ...content, items: { ...content.items, [item.id]: item } };
}
/** Klont den Content und schiebt einen Test-Gegner in die Monster-Map. */
function withMonster(c: ContentDB, monster: MonsterDef): ContentDB {
  return { ...c, monsters: { ...c.monsters, [monster.id]: monster } };
}

/** Harmloser, praktisch unsterblicher Trainings-Gegner: riesige HP, trifft fast nie, kein Tod/Respawn. */
const DUMMY: MonsterDef = {
  id: "loop_dummy",
  name: { en: "Loop Dummy", de: "Loop-Puppe" },
  level: 5,
  maxHp: 5_000_000,
  damage: 1,
  accuracy: 1,
  evasion: 0,
  defense: 0,
  attackIntervalMs: 1000,
  xp: 0,
  gold: 0,
  loot: [],
};

describe("magic — per-Waffe manaCost (Cast-Resolution liest item.manaCost)", () => {
  it("liest die Manakosten der ausgerüsteten Waffe (Staff teurer als Wand, Spec §5)", () => {
    expect(castManaCost(content, "copper_staff")).toBe(5); // Spec §5: Früh-Stäbe billiger (5/5/6) um Mana-Hürde zu senken
    expect(castManaCost(content, "godiron_staff")).toBe(8); // balance-pass3 #3c: manaCost 10→8 (Weak-Cast-Downtime raus)
    expect(castManaCost(content, "copper_wand")).toBe(4);   // R4: Wand-Leiter 5/5/6… → 4/4/5…
    expect(castManaCost(content, "godiron_wand")).toBe(7);  // balance-pass3 #3c: manaCost 8→7
    // Staff > Wand im selben Tier (teurer Cast bei höherem Roh + DoT).
    expect(castManaCost(content, "godiron_staff")).toBeGreaterThan(
      castManaCost(content, "godiron_wand"),
    );
  });

  it("fällt auf den globalen MANA_PER_CAST zurück, wenn die Waffe kein manaCost-Feld trägt", () => {
    const noCost: ItemDef = {
      id: "nocost_staff",
      name: "Kostenlos",
      type: "equipment",
      stackable: false,
      slot: "mainhand",
      weaponStyle: "magic",
    };
    const c = withItem(noCost);
    expect(castManaCost(c, "nocost_staff")).toBe(MANA_PER_CAST);
    expect(castManaCost(content, null)).toBe(MANA_PER_CAST);
    expect(castManaCost(content, undefined)).toBe(MANA_PER_CAST);
  });

  it("ungültige (negative/NaN) Manakosten degradieren auf den globalen Default", () => {
    const bad: ItemDef = {
      id: "bad_staff",
      name: "Defekt",
      type: "equipment",
      stackable: false,
      slot: "mainhand",
      weaponStyle: "magic",
      manaCost: -5,
    };
    expect(castManaCost(withItem(bad), "bad_staff")).toBe(MANA_PER_CAST);
  });

  it("gating: unbezahlbare Manakosten ⇒ niemals Cast ⇒ kein Spell-Status (beweist per-Waffe-Lesen)", () => {
    // chance 1.0: würde der Code die globalen 6 statt der Waffen-99999 nehmen, käme der Burn durch.
    const expensive: ItemDef = {
      id: "expensive_staff",
      name: "Teuer",
      type: "equipment",
      stackable: false,
      slot: "mainhand",
      weaponStyle: "magic",
      twoHanded: true,
      bonus: { magicDamage: 30, accuracy: 80 },
      manaCost: 99999,
      weaponEffect: { type: "burn", chance: 1, magnitude: 6, durationMs: 4000 },
    };
    const c = withMonster(withItem(expensive), DUMMY);
    const s = createGame({ name: "Magier", baseAttributes: { int: 6, wis: 4, con: 30 } }, c, 7);
    s.character.equipment.mainhand = "expensive_staff";
    s.character.mana = computeStats(s, c).maxMana;
    startCombat(s, c, "loop_dummy");

    let burnSeen = false;
    for (let i = 0; i < 800; i++) {
      combatStep(s, c);
      if (s.combat.enemyEffects.some((e) => e.type === "burn")) burnSeen = true;
    }
    expect(burnSeen).toBe(false); // nie gecastet → kein Burn
    expect(s.skills.magic?.xp ?? 0).toBeGreaterThan(0); // aber Weak-Melee kämpft weiter
  });
});

describe("magic — Mana-Depletion-Loop (Cast → Weak-Melee → Regen → Resume)", () => {
  it("leert den Pool, kämpft schwach weiter und nimmt das Casten nach Regen wieder auf", () => {
    const staff: ItemDef = {
      id: "loop_staff",
      name: "Loop-Stab",
      type: "equipment",
      stackable: false,
      slot: "mainhand",
      weaponStyle: "magic",
      twoHanded: true,
      bonus: { magicDamage: 30, accuracy: 80 },
      // Rüstungs-Trinität / Itemization 2.5 (Phase A2): der frühere Mana-Schild zog pro Gegner-Treffer
      // Extra-Mana (~11/Treffer) — DAS war hier der dominante Mana-Sink, der den Pool leerlaufen ließ.
      // Er ist jetzt durch den Ward ersetzt (zieht KEIN Mana mehr). Mit dem heutigen Regen (3.5/s ·
      // 2.88 s Cast-Takt ≈ 10 Mana/Cast) deckte manaCost 10 den Cast fast exakt → der Pool leerte nie
      // mehr allein durchs Casten. manaCost 10→20: Casten übersteigt den Regen wieder klar, sodass der
      // Depletion-→-Weak-Melee-→-Resume-Loop (die eigentliche Test-Absicht) wie gehabt greift.
      manaCost: 20,
      weaponEffect: { type: "burn", chance: 1, magnitude: 6, durationMs: 4000 },
    };
    const c = withMonster(withItem(staff), DUMMY);
    // int/wis (nach Hybrid-Ableitung ~7/5) → Pool ~120, Regen 3.5/s → Casten (20/Cast) leert den Pool.
    const s = createGame({ name: "Magier", baseAttributes: { int: 4, wis: 2, con: 30 } }, c, 42);
    s.character.equipment.mainhand = "loop_staff";
    const maxMana = computeStats(s, c).maxMana;
    s.character.mana = maxMana;
    startCombat(s, c, "loop_dummy");

    const cost = 20;
    let sawDepleted = false;
    let resumedAfterDepletion = false;
    for (let i = 0; i < 6000; i++) {
      combatStep(s, c);
      // ST1: der unsterbliche 5-Mio-HP-Dummy ist (gewollt) ein Patt → der Kampf stoppt nach 60s mit
      // stopReason="stalemate". Dieser Test beobachtet NUR den Mana-Loop, nicht die Termination →
      // bei Stopp einfach neu engagen (Mana bleibt erhalten), damit der Loop weiterläuft.
      if (s.combat.monsterId === null) startCombat(s, c, "loop_dummy");
      const m = s.character.mana;
      // Determinismus/Sicherheit: nie NaN, immer im Pool.
      expect(Number.isFinite(m)).toBe(true);
      expect(m).toBeGreaterThanOrEqual(0);
      // Gegen den LIVE-Pool prüfen (nicht das einmal gecachte maxMana): der Held levelt magic →
      // int/wis steigen leicht → maxMana wächst im Fenster. Seit dem Ward-Umbau (Mana-Schild zog früher
      // Mana ab) castet der Magier lückenloser und levelt einen Tick schneller, sodass die Live-Obergrenze
      // die Startaufnahme knapp übersteigt. Der Clamp gilt weiterhin — nur gegen den aktuellen Pool.
      expect(m).toBeLessThanOrEqual(computeStats(s, c).maxMana + 1e-9);
      if (m < cost) sawDepleted = true;
      if (sawDepleted && m >= cost) resumedAfterDepletion = true;
    }
    expect(sawDepleted).toBe(true); // Pool lief unter die Kosten → Weak-Melee-Phase
    expect(resumedAfterDepletion).toBe(true); // regenerierte über die Kosten → Casten resumed
    expect(s.skills.magic?.xp ?? 0).toBeGreaterThan(0); // kämpfte durchgehend
  });

  it("bei manaRegen-Boden (wis 0) hängt der Loop nicht — degradiert sauber zum Dauer-Weak-Melee", () => {
    const staff: ItemDef = {
      id: "drain_staff",
      name: "Zehr-Stab",
      type: "equipment",
      stackable: false,
      slot: "mainhand",
      weaponStyle: "magic",
      twoHanded: true,
      bonus: { magicDamage: 25, accuracy: 80 },
      // Höher als JEDER erreichbare Pool (maxMana ≈ 30 + int·10 + wis·4 < 200) ⇒ dauerhaft
      // Weak-Melee. Vorher 50: das lag nur durch die Mana-Schild-Drain-Balance unter dem Pool —
      // seit der Itemization-2.0-§2-Eichung (weniger Durchschlag → weniger Drain) regenerierte
      // das Mana über 50 und der Stab castete doch. 200 pinnt die dokumentierte Intention hart.
      manaCost: 200,
      weaponEffect: { type: "burn", chance: 1, magnitude: 6, durationMs: 4000 },
    };
    const c = withMonster(withItem(staff), DUMMY);
    const s = createGame({ name: "Magier", baseAttributes: { int: 1, wis: 0, con: 30 } }, c, 11);
    s.character.equipment.mainhand = "drain_staff";
    s.character.mana = 0;
    startCombat(s, c, "loop_dummy");

    for (let i = 0; i < 1500; i++) {
      combatStep(s, c);
      expect(Number.isFinite(s.character.mana)).toBe(true);
      expect(s.character.mana).toBeGreaterThanOrEqual(0);
    }
    // kein Hänger/Absturz: Kampf läuft, Weak-Melee teilt aus (magic-XP wächst), kein Burn (nie gecastet).
    expect(s.skills.magic?.xp ?? 0).toBeGreaterThan(0);
    expect(s.combat.enemyEffects.some((e) => e.type === "burn")).toBe(false);
  });
});

describe("magic/melee — Multi-Effekt-Apply über effectiveWeaponEffects (≥2 Status)", () => {
  it("wendet beide Status einer Fusions-Waffe an (burn + bleed)", () => {
    const fusion: ItemDef = {
      id: "fusion_staff",
      name: "Fusions-Stab",
      type: "equipment",
      stackable: false,
      slot: "mainhand",
      weaponStyle: "magic",
      twoHanded: true,
      bonus: { magicDamage: 30, accuracy: 120 },
      manaCost: 0, // immer casten ⇒ Effekt-Apply garantiert
      weaponEffect: { type: "burn", chance: 1, magnitude: 8, durationMs: 4000 },
      weaponEffects: [{ type: "bleed", chance: 1, magnitude: 6, durationMs: 4000 }],
    };
    const c = withMonster(withItem(fusion), DUMMY);
    const s = createGame({ name: "Magier", baseAttributes: { int: 10, wis: 6, con: 30 } }, c, 3);
    s.character.equipment.mainhand = "fusion_staff";
    s.character.mana = computeStats(s, c).maxMana;
    startCombat(s, c, "loop_dummy");

    let sawBurn = false;
    let sawBleed = false;
    for (let i = 0; i < 400; i++) {
      combatStep(s, c);
      if (s.combat.enemyEffects.some((e) => e.type === "burn")) sawBurn = true;
      if (s.combat.enemyEffects.some((e) => e.type === "bleed")) sawBleed = true;
      if (sawBurn && sawBleed) break;
    }
    expect(sawBurn).toBe(true);
    expect(sawBleed).toBe(true);
  });

  it("Einzel-Effekt-Waffe bleibt identisch (genau ein Status)", () => {
    const c = withMonster(content, DUMMY);
    const s = createGame({ name: "Magier", baseAttributes: { int: 12, wis: 8, con: 30 } }, c, 5);
    s.character.equipment.mainhand = "copper_staff"; // nur weaponEffect: burn
    s.character.mana = computeStats(s, c).maxMana;
    startCombat(s, c, "loop_dummy");

    let sawBurn = false;
    for (let i = 0; i < 1500; i++) {
      combatStep(s, c);
      if (s.combat.enemyEffects.some((e) => e.type === "burn")) sawBurn = true;
      // ein Burn-Staff darf niemals einen zweiten Status (bleed/poison) erzeugen
      expect(s.combat.enemyEffects.some((e) => e.type === "bleed")).toBe(false);
      expect(s.combat.enemyEffects.some((e) => e.type === "poison")).toBe(false);
    }
    expect(sawBurn).toBe(true);
  });
});
