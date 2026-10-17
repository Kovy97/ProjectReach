import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  masteryDoubleChance,
  masteryPreserveChance,
  masterySpeedMult,
  masteryXpPerCompletion,
  poolCheckpointBonus,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { masteryLevel, masteryPoolBonus, masteryPoolCapacity, masteryPoolPct } from "./mastery";
import { addItem, expandBaseCapacity, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";

describe("mastery system", () => {
  it("frischer Spielstand hat eine leere Mastery-Map", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.mastery).toEqual({});
  });

  it("Ausführen einer Aktion sammelt Mastery-XP für genau diese Aktion", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Über L40 → kein Frühgame-XP-Lift; dann entspricht der Skill-XP-Zuwachs exakt der Mastery-XP.
    s.skills.woodcutting = { xp: xpForLevel(45) };
    const before = s.skills.woodcutting.xp;
    setActiveAction(s, content, "cut_normal_tree");
    advance(s, content, 60_000);
    const m = s.mastery.cut_normal_tree;
    expect(m, "keine Mastery-XP angesammelt").toBeDefined();
    expect(m!.xp).toBeGreaterThan(0);
    // Mastery-XP = Abschlüsse × action.xp = Skill-XP-Zuwachs (oberhalb L40, ohne Lift; Mastery < 50).
    expect(m!.xp).toBe((s.skills.woodcutting?.xp ?? 0) - before);
    // Andere Aktionen bleiben unberührt.
    expect(s.mastery.mine_copper).toBeUndefined();
  });

  it("Mastery-XP je Abschluss: Dauer-Untergrenze ab Mastery 50, teure Aktionen unverändert", () => {
    // claude:2026-10-17T19:50:00+02:00 — Chef-GO 17.10. (Review „945 h Holz-Meisterschaft 78→99").
    const tree = content.actions.cut_normal_tree!;
    expect(masteryXpPerCompletion(tree, 49)).toBe(tree.xp); // Frühspiel/Pool wie bisher
    expect(masteryXpPerCompletion(tree, 50)).toBe(168); // 60 XP × 2,8 s
    const god = content.actions.cut_godwood_tree!;
    expect(masteryXpPerCompletion(god, 80)).toBe(god.xp);
    // Keine Aktion braucht für Mastery 50→99 bei Basisdauer mehr als ~60 h (vorher bis ~3.900 h).
    for (const a of Object.values(content.actions)) {
      const hours = ((xpForLevel(99) - xpForLevel(50)) / masteryXpPerCompletion(a, 50)) * a.durationMs / 3_600_000;
      expect(hours, a.id).toBeLessThan(61);
    }
  });

  it("Engine vergibt ab Mastery 50 die Untergrenze je Abschluss", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.skills.woodcutting = { xp: xpForLevel(45) };
    s.mastery.cut_normal_tree = { xp: xpForLevel(78) };
    const before = s.skills.woodcutting.xp;
    setActiveAction(s, content, "cut_normal_tree");
    advance(s, content, 60_000);
    const completions = (s.skills.woodcutting.xp - before) / content.actions.cut_normal_tree!.xp;
    expect(completions).toBeGreaterThan(0);
    expect(s.mastery.cut_normal_tree!.xp - xpForLevel(78)).toBe(completions * 168);
  });

  it("Doppel-Ertrag-Chance: Level 1 = 0, steigt linear, gekappt bei 50%", () => {
    expect(masteryDoubleChance(1)).toBe(0);
    expect(masteryDoubleChance(11)).toBeCloseTo(0.05, 5);
    expect(masteryDoubleChance(99)).toBeCloseTo(0.49, 5);
    expect(masteryDoubleChance(500)).toBe(0.5); // Kappe
  });

  it("Tempo-Bonus: Level 1 = keine Reduktion, steigt linear, gekappt bei 15%", () => {
    expect(masterySpeedMult(1)).toBe(1);
    expect(masterySpeedMult(51)).toBeCloseTo(1 - 0.075, 5);
    expect(masterySpeedMult(99)).toBeCloseTo(1 - 0.147, 4);
    expect(masterySpeedMult(500)).toBe(1 - 0.15); // Kappe
  });

  it("Preservation-Chance: Level 1 = 0, steigt linear, gekappt bei 40%", () => {
    expect(masteryPreserveChance(1)).toBe(0);
    expect(masteryPreserveChance(11)).toBeCloseTo(0.04, 5);
    expect(masteryPreserveChance(99)).toBeCloseTo(0.392, 5);
    expect(masteryPreserveChance(500)).toBe(0.4); // Kappe
  });

  it("Preservation: hohes Mastery spart bei Verarbeitung Materialien (Verbrauch < Erträge)", () => {
    const s = createGame({ name: "X" }, content, 13);
    // Stacks sind auf MAX_STACK (9999 seit SAVE 69) gedeckelt → genug Slots für 100k raw_shrimp + Koch-Output.
    expandBaseCapacity(s.inventory, content, 300);
    addItem(s.inventory, content, "raw_shrimp", 100_000);
    s.mastery.cook_shrimp = { xp: xpForLevel(99) }; // Aktions-Preserve ≈ 39 %
    const rawBefore = itemCount(s.inventory, "raw_shrimp");
    setActiveAction(s, content, "cook_shrimp");
    advance(s, content, 600_000);
    const produced = itemCount(s.inventory, "cooked_shrimp");
    const consumed = rawBefore - itemCount(s.inventory, "raw_shrimp");
    expect(produced).toBeGreaterThan(0);
    // Jeder Abschluss erzeugt 1 Essen, aber ein Teil der Erträge spart das Roh-Material.
    // Pool-Cap referenziert jetzt L20 (s. MASTERY_POOL_REFERENCE_LEVEL): cook_shrimp auf L99
    // sättigt den Cooking-Pool auf 100 % → zusätzlich +0.05 Pool-Preserve über die ~39 %
    // Aktions-Preserve hinaus. Verbrauch bleibt deutlich > 0, aber klar unter den Erträgen.
    expect(consumed).toBeLessThan(produced);
    expect(consumed).toBeGreaterThan(produced * 0.25); // sanity: nicht alles gespart
  });

  it("frischer State (Mastery Lv1) verbraucht Inputs normal — keine Gratis-Verarbeitung", () => {
    const s = createGame({ name: "X" }, content, 5);
    addItem(s.inventory, content, "raw_shrimp", 1000);
    const rawBefore = itemCount(s.inventory, "raw_shrimp");
    setActiveAction(s, content, "cook_shrimp");
    advance(s, content, 60_000);
    const produced = itemCount(s.inventory, "cooked_shrimp");
    const consumed = rawBefore - itemCount(s.inventory, "raw_shrimp");
    expect(produced).toBeGreaterThan(0);
    expect(consumed).toBe(produced); // bei Mastery Lv1: 1 Input je Ertrag, keine Ersparnis
  });

  it("hohes Mastery-Level lässt dieselbe Aktion öfter abschließen (schneller)", () => {
    function completions(masteryXp: number): number {
      const s = createGame({ name: "X" }, content, 7);
      if (masteryXp > 0) s.mastery.cut_normal_tree = { xp: masteryXp };
      setActiveAction(s, content, "cut_normal_tree");
      advance(s, content, 300_000);
      // Abschlüsse = Skill-XP / xp pro Abschluss.
      return (s.skills.woodcutting?.xp ?? 0) / content.actions.cut_normal_tree!.xp;
    }
    expect(completions(xpForLevel(99))).toBeGreaterThan(completions(0));
  });

  it("hohes Mastery-Level erhöht den durchschnittlichen Ertrag spürbar", () => {
    // Zwei identische Läufe; einer mit vorgesetztem hohem Mastery-Level.
    function run(masteryXp: number): number {
      const s = createGame({ name: "X" }, content, 42);
      if (masteryXp > 0) s.mastery.cut_normal_tree = { xp: masteryXp };
      setActiveAction(s, content, "cut_normal_tree");
      advance(s, content, 600_000);
      let logs = 0;
      for (const slot of s.inventory.slots) if (slot?.itemId === "normal_log") logs += slot.qty;
      return logs;
    }
    const low = run(0);
    const high = run(xpForLevel(99));
    expect(masteryLevel({ mastery: { cut_normal_tree: { xp: xpForLevel(99) } } } as never, "cut_normal_tree")).toBe(99);
    expect(high).toBeGreaterThan(low); // ~+49% Ertrag durch Doppelschläge
  });
});

describe("mastery pool + checkpoint bonuses", () => {
  it("poolCheckpointBonus: unter dem 1. Checkpoint (5%) sind alle Boni 0", () => {
    expect(poolCheckpointBonus(0)).toEqual({ double: 0, speed: 0, preserve: 0 });
    expect(poolCheckpointBonus(0.049)).toEqual({ double: 0, speed: 0, preserve: 0 });
  });

  it("poolCheckpointBonus: 1. Checkpoint (5%) schaltet früh sichtbaren Doppelertrag frei", () => {
    const b = poolCheckpointBonus(0.05);
    expect(b.double).toBeCloseTo(0.03, 5);
    expect(b.speed).toBe(0);
    expect(b.preserve).toBe(0);
  });

  it("poolCheckpointBonus: bei 30% sind 5%- und 25%-Checkpoints aktiv", () => {
    const b = poolCheckpointBonus(0.3);
    expect(b.double).toBeCloseTo(0.03, 5);
    expect(b.speed).toBeCloseTo(0.04, 5);
    expect(b.preserve).toBe(0);
  });

  it("poolCheckpointBonus: bei 100% sind alle Checkpoints summiert aktiv", () => {
    const b = poolCheckpointBonus(1.0);
    expect(b.double).toBeCloseTo(0.08, 5); // 0.03 + 0.05 (Capstone)
    expect(b.speed).toBeCloseTo(0.08, 5); // 0.04 + 0.04 (Capstone)
    expect(b.preserve).toBeCloseTo(0.05, 5);
  });

  it("masteryPoolPct: 0 bei frischem State, steigt mit gesetzter Mastery-XP", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(masteryPoolPct(s, content, "woodcutting")).toBe(0);
    s.mastery.cut_normal_tree = { xp: xpForLevel(99) };
    expect(masteryPoolPct(s, content, "woodcutting")).toBeGreaterThan(0);
  });

  it("masteryPoolBonus: frischer State liefert keine Boni (Determinismus-Garantie)", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(masteryPoolBonus(s, content, "woodcutting")).toEqual({ double: 0, speed: 0, preserve: 0 });
  });

  it("gefüllter Pool wirkt: spürbar mehr Ertrag als ohne Pool-Bonus", () => {
    // Pool-Cap referenziert jetzt L20 (MASTERY_POOL_REFERENCE_LEVEL): eine einzelne Aktion
    // auf Mastery 99 sättigt den Skill-Pool bereits auf 100 % → alle Checkpoints (inkl.
    // Capstone) aktiv. Verglichen wird voller Pool gegen frischen State (Pool unter dem
    // 1. Checkpoint → kein Pool-Bonus). Wir isolieren den POOL-Effekt, indem beide Läufe
    // dieselbe Aktions-Mastery (Lv1) nutzen — der Unterschied kommt allein vom Pool.
    function run(fillPool: boolean): number {
      const s = createGame({ name: "X" }, content, 42);
      if (fillPool) {
        // Eine andere WC-Aktion auf 99 → füllt den Pool, ohne die getestete Aktion zu masten.
        s.mastery.cut_oak_tree = { xp: xpForLevel(99) };
        expect(masteryPoolPct(s, content, "woodcutting")).toBe(1);
      } else {
        expect(masteryPoolPct(s, content, "woodcutting")).toBe(0);
      }
      setActiveAction(s, content, "cut_normal_tree");
      advance(s, content, 600_000);
      let logs = 0;
      for (const slot of s.inventory.slots) if (slot?.itemId === "normal_log") logs += slot.qty;
      return logs;
    }
    const withPool = run(true);
    const noPool = run(false);
    // Voller Pool = mehr Tempo (geringere Dauer) + Pool-Double → mehr Logs als ohne Pool.
    expect(withPool).toBeGreaterThan(noPool);
  });

  it("Sammel-Skill: der 50%-Pool-Checkpoint (Preserve) wird zu messbarem Extra-Ertrag umgewidmet", () => {
    // Sammel-Aktionen (Woodcutting/Mining/Fishing/Foraging) haben KEINE `inputs` → die
    // Preservation-Achse hätte nichts zu sparen. Der Fix wertet den SKILLWEITEN Pool-Preserve-Anteil
    // dort als zusätzlichen Doppelertrag. Isoliert getestet über den 50%-Checkpoint:
    //   Pool 0.40 → Checkpoints 0.05 (+0.03 Double) & 0.25 (+0.04 Speed), Preserve 0.
    //   Pool 0.60 → zusätzlich 0.50 (+0.05 Preserve). Double UND Speed identisch (0.03 / 0.04) →
    //   der EINZIGE Unterschied ist der Preserve-Anteil, der beim Sammeln jetzt als +0.05 Double zählt.
    // Da Speed identisch ist, sind die Abschlusszahlen gleich und die Yield-Differenz kommt allein
    // aus der umgewidmeten Preserve. Ohne den Fix wäre 0.60 == 0.40 (Preserve tot).
    const cap = masteryPoolCapacity(content, "woodcutting");
    function logsAtPool(fraction: number): number {
      const s = createGame({ name: "X" }, content, 42);
      // Pool über eine ANDERE WC-Aktion füllen, damit die getestete Aktion Mastery Lv1 bleibt
      // (isoliert den Pool-Effekt; kein per-Aktions-Mastery-Double vermischt sich hinein).
      s.mastery.cut_oak_tree = { xp: Math.round(fraction * cap) };
      expect(masteryPoolPct(s, content, "woodcutting")).toBeCloseTo(fraction, 5);
      setActiveAction(s, content, "cut_normal_tree");
      advance(s, content, 600_000);
      let logs = 0;
      for (const slot of s.inventory.slots) if (slot?.itemId === "normal_log") logs += slot.qty;
      logs += s.bank["normal_log"] ?? 0; // falls Auto-Bank Überlauf ins Lager schiebt
      return logs;
    }
    const belowPreserveCp = logsAtPool(0.4); // unter dem 50%-Checkpoint
    const abovePreserveCp = logsAtPool(0.6); // 50%-Checkpoint aktiv → Preserve→Double
    // Gleicher Seed, identische Speed/Abschlüsse, höhere Doppelertrag-Schwelle ⇒ strikt mehr Ertrag.
    // (Verarbeitungs-Skills bleiben unberührt: dort ist `action.inputs` gesetzt ⇒ der Umwidmungs-Term
    //  ist 0, Preserve wirkt weiter als Material-Ersparnis — abgedeckt vom Preservation-Test oben.)
    expect(abovePreserveCp).toBeGreaterThan(belowPreserveCp);
  });
});
