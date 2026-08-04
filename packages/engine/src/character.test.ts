import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { BASE_ATTRIBUTE_VALUE } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { setActiveAction } from "./actions";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { itemCount } from "./inventory";
import { xpForLevel } from "./leveling";

function newGame() {
  return createGame({ name: "Held" }, content, 1);
}

describe("character", () => {
  it("startet mit reinen Basiswerten (keine manuelle Punktevergabe mehr)", () => {
    const s = newGame();
    expect(s.character.baseAttributes.con).toBe(BASE_ATTRIBUTE_VALUE);
    // Reine Hybrid-Progression: kein unspentPoints/allocatedAttributes-Feld mehr.
    const char = s.character as unknown as Record<string, unknown>;
    expect(char.unspentPoints).toBeUndefined();
    expect(char.allocatedAttributes).toBeUndefined();
  });

  it("leitet HP aus Konstitution ab (maxHp = 5 + CON*2, ganzzahlige Attributskala)", () => {
    const s = newGame();
    const stats = computeStats(s, content);
    // Itemization 2.0 §1: con ist ganzzahlig (Basis 3); Koeffizient con·2 unverändert.
    expect(stats.maxHp).toBe(5 + stats.attributes.con * 2);
    expect(s.character.hp).toBe(stats.maxHp);
  });

  it("Attribute wachsen ausschließlich passiv durch Skill-Level (Hybrid)", () => {
    const s = newGame();
    // Itemization 2.0 §1: +1 Attributpunkt je 8 TRAINER-SUMMEN-Level (Rungs alle 8). Die
    // str-Trainer-Summe startet bei woodcutting L14 + power L1 = 15 — direkt vor der 16er-Rung,
    // damit das 10-min-Fenster sie sicher überquert.
    s.skills.woodcutting = { xp: xpForLevel(14) };
    const startTotal = s.character.totalLevel;
    const startStr = computeStats(s, content).attributes.str; // Holzfällen trainiert STR

    setActiveAction(s, content, "cut_normal_tree");
    advance(s, content, 600_000); // 10 min → mehrere Level

    expect(s.character.totalLevel).toBeGreaterThan(startTotal);
    // Das Attribut der trainierten Fertigkeit wächst passiv (kein Punkte-System mehr).
    expect(computeStats(s, content).attributes.str).toBeGreaterThan(startStr);
  });
});

describe("Starter-Stil-Wahl", () => {
  it("melee → rüstet rusty_sword sofort aus", () => {
    const s = createGame({ name: "Held", startingStyle: "melee" }, content, 1);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(computeStats(s, content).style).toBe("melee");
  });

  it("ranged → rüstet cracked_bow aus; KEINE Munition mehr (#286, Bogen feuert direkt)", () => {
    const s = createGame({ name: "Held", startingStyle: "ranged" }, content, 1);
    expect(s.character.equipment.mainhand).toBe("cracked_bow");
    // Ammo-Removal: kein Köcher, keine Start-Pfeile — der Alt-Key existiert gar nicht mehr.
    expect("ammoCount" in s).toBe(false);
    expect(itemCount(s.inventory, "crude_arrow")).toBe(0);
    expect(computeStats(s, content).style).toBe("ranged");
  });

  it("magic → rüstet cracked_staff sofort aus", () => {
    const s = createGame({ name: "Held", startingStyle: "magic" }, content, 1);
    expect(s.character.equipment.mainhand).toBe("cracked_staff");
    expect(computeStats(s, content).style).toBe("magic");
  });

  it("fehlendes startingStyle → melee-Default (rusty_sword)", () => {
    const s = createGame({ name: "Held" }, content, 1);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(computeStats(s, content).style).toBe("melee");
  });
});

describe("Starter-Kit (Start-Nahrung + Auto-Eat-Vorbelegung)", () => {
  it("starterKit → gibt Start-Nahrung ins Inventar UND belegt Auto-Eat vor", () => {
    const s = createGame({ name: "Held", starterKit: true }, content, 1);
    expect(s.character.food).toBe("cooked_shrimp");
    expect(itemCount(s.inventory, "cooked_shrimp")).toBeGreaterThan(0);
  });

  it("ohne starterKit → leere Baseline (kein Food, keine Vorbelegung) — Sim/Test-Determinismus", () => {
    const s = createGame({ name: "Held" }, content, 1);
    expect(s.character.food).toBeNull();
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(0);
    // Auch KEIN Starter-Rüstungs-Set auf der leeren Baseline (Fixtures/Sim-Messungen stabil).
    expect(s.character.equipment.body).toBeNull();
  });
});

describe("Starter-Rüstungs-Sets (#286, Chef-GO: sofort Hühner jagen ohne zu sterben)", () => {
  // Balance-Signal (Sim 2026-07-08): Frisch-Melee starb on-level an ALLEM (16 Tode/8h an Hühnern/
  // Ratten). Jede Startklasse bekommt darum mit dem starterKit das unterste passende Rüstungs-Set
  // DIREKT AUSGERÜSTET. Alle IDs sind auf Level 1 tragbar (kein Unequip-Trap).
  it("melee → Kupfer-Platte (Brust/Beine/Schuhe) direkt ausgerüstet, alle Level-1-tragbar", () => {
    const s = createGame({ name: "Held", startingStyle: "melee", starterKit: true }, content, 1);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(s.character.equipment.body).toBe("copper_platebody");
    expect(s.character.equipment.legs).toBe("copper_platelegs");
    expect(s.character.equipment.boots).toBe("copper_sabatons");
    // 4 Equip-Teile (Waffe + 3 Rüstung) + Requirements erlauben Level 1 (defence 1).
    for (const id of ["copper_platebody", "copper_platelegs", "copper_sabatons"]) {
      for (const lvl of Object.values(content.items[id]!.requirements ?? {})) {
        expect(lvl).toBeLessThanOrEqual(1);
      }
    }
  });

  it("magic → Lehrlings-Stoff (Robe/Beine/Pantoffeln) direkt ausgerüstet, alle Level-1-tragbar", () => {
    const s = createGame({ name: "Held", startingStyle: "magic", starterKit: true }, content, 1);
    expect(s.character.equipment.mainhand).toBe("cracked_staff");
    expect(s.character.equipment.body).toBe("apprentice_robe_body");
    expect(s.character.equipment.legs).toBe("apprentice_robe_legs");
    expect(s.character.equipment.boots).toBe("apprentice_slippers");
    for (const id of ["apprentice_robe_body", "apprentice_robe_legs", "apprentice_slippers"]) {
      for (const lvl of Object.values(content.items[id]!.requirements ?? {})) {
        expect(lvl).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ranged → req-freies Leder (Helm/Brust/Beine/Schuhe) direkt ausgerüstet, alle Level-1-tragbar", () => {
    // Task #286 Stage B: leather_legs/leather_boots (t0, requirements-frei) schließen die
    // frühere Content-Lücke — Ranged bekommt jetzt 4 Rüstungsteile (analog zu melee/magic mit 3).
    const s = createGame({ name: "Held", startingStyle: "ranged", starterKit: true }, content, 1);
    expect(s.character.equipment.mainhand).toBe("cracked_bow");
    expect(s.character.equipment.body).toBe("leather_body");
    expect(s.character.equipment.helmet).toBe("leather_helm");
    expect(s.character.equipment.legs).toBe("leather_legs");
    expect(s.character.equipment.boots).toBe("leather_boots");
    for (const id of ["leather_body", "leather_helm", "leather_legs", "leather_boots"]) {
      expect(content.items[id]!.requirements, `${id}: sollte requirements-frei sein`).toBeUndefined();
    }
  });

  it("Sustain-Check: jeder Starter überlebt on-level (Huhn), solange Starter-Food da ist — 0 Tode, Kills fließen", () => {
    // Sonden-Messung (2026-07-08, Seed 1, Dauerkampf am Huhn): mit Starter-Set + 20 Shrimp hält
    // JEDER Stil ein stabiles Gleichgewicht — melee hp~7-9/17 (Platte), ranged hp~5-9/15 (Dodge),
    // magic dauerhaft 23/23 (Ward-Recharge, verbraucht 0 Food). Tode entstehen erst durch
    // FOOD-ERSCHÖPFUNG (melee min 6, ranged min 4 — gewollte Attrition: Heilung nur über Items).
    // 3-Minuten-Fenster = sicher food-gedeckt für alle Stile; ohne Starter-Set starb Frisch-Melee
    // on-level an ALLEM (Sim-Signal 16 Tode/8h — der Grund für die Sets).
    for (const style of ["melee", "ranged", "magic"] as const) {
      const s = createGame({ name: "Held", startingStyle: style, starterKit: true }, content, 1);
      startCombat(s, content, "chicken");
      advance(s, content, 3 * 60_000);
      expect(s.stats.deaths, `${style} stirbt am Huhn`).toBe(0);
      expect(s.stats.kills, `${style} tötet keine Hühner`).toBeGreaterThan(0);
      expect(s.combat.monsterId, `${style}: Kampf endete unerwartet`).toBe("chicken");
    }
  });
});
