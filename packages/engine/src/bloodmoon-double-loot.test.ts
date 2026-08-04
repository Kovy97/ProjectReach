import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, ItemDef, PetSkillEffect, SuffixDef } from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { itemCount } from "./inventory";

/**
 * Blutmond-Umbau (Task #337, Chef-Design): der Samstags-Segen ist keine "+15 % Beute-Menge" mehr,
 * sondern „15 % Chance auf doppelten GESAMT-Loot pro Kill" — EIN Wurf pro Kill, bei Erfolg wird
 * ALLES verdoppelt, was der Kill an Beute produziert hat (jeder Stack in gleicher Menge, jede
 * Drop-Instanz als wertgleiches Duplikat). Diese Suite beweist die vier kritischen Eigenschaften:
 *  (a) EIN Wurf für ALLES: alle Stacks eines Kills verdoppeln GEMEINSAM oder gar nicht.
 *  (b) Kein Proc ⇒ Beute/Gold bit-identisch zum Lauf ohne Segen (nur der eine Extra-Float fällt).
 *  (c) Nicht-Samstag ⇒ KEIN Extra-Wurf: RNG-Strom bit-identisch (Determinismus-Regression);
 *      ebenso ein Samstags-Kill OHNE Beute (leere Loot-Tabelle ⇒ kein Draw).
 *  (d) Zusammenspiel mit dem carrionwing-Pet-Proc (#276): erst der Zweitroll, dann verdoppelt der
 *      Blutmond BEIDES — Gold koppelt an carrionwing, aber NIE an den Blutmond.
 *  (e) Instanz-Drops (Suffix/Legendary): der Proc prägt ein DUPLIKAT mit identischem Suffix-Roll
 *      (kein Re-Roll), nur die instanceId ist frisch.
 */

/** Nächster Tag (inkl. `from`) mit lokalem Wochentag `targetDay`, 12:00 lokal (Muster blessing.test.ts). */
function nextLocalWeekday(from: Date, targetDay: number): Date {
  let d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0);
  while (d.getDay() !== targetDay) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0, 0);
  }
  return d;
}

const REF = new Date(2026, 0, 1);
const SATURDAY_MS = nextLocalWeekday(REF, 6).getTime(); // bloodmoon (§doubleLootChance)
const SUNDAY_MS = nextLocalWeekday(REF, 0).getTime(); // rotmist (§rareDrop) — Kontrolltag ohne Extra-Draw

/** Lokales Content mit gepatchtem Chicken (Muster pet-effects-applied.test.ts). */
function chickenContent(patch: Record<string, unknown>): ContentDB {
  return {
    ...content,
    monsters: { ...content.monsters, chicken: { ...content.monsters.chicken!, ...patch } },
  };
}

function newFighter(c: ContentDB, seed: number) {
  return createGame({ name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, seed);
}

describe("Blutmond §doubleLootChance (Task #337) — ein Wurf, alles doppelt", () => {
  it("(a) ZWEI garantierte Loot-Zeilen verdoppeln GEMEINSAM oder gar nicht — nie gemischt; Summary + Flag stimmen", () => {
    const c = chickenContent({
      gold: 5,
      loot: [
        { itemId: "copper_ore", chance: 1, min: 3, max: 3 },
        { itemId: "oak_log", chance: 1, min: 2, max: 2 },
      ],
    });
    const s = newFighter(c, 7);
    startCombat(s, c, "chicken");
    let kills = 0;
    let singles = 0;
    let doubles = 0;
    for (let i = 0; i < 12_000 && !(singles >= 3 && doubles >= 3); i++) {
      s.character.hp = 9_999; // Tod ausschließen (rein deterministisch, Muster pet-effects-Test)
      combatStep(s, c, SATURDAY_MS);
      if (s.combat.kills > kills) {
        kills = s.combat.kills;
        const lk = s.combat.lastKill!;
        const copper = lk.loot.find((l) => l.itemId === "copper_ore")!.qty;
        const oak = lk.loot.find((l) => l.itemId === "oak_log")!.qty;
        // EIN Wurf pro Kill: (3,2) ohne Proc, (6,4) mit Proc — (6,2)/(3,4) wäre ein Per-Stack-Wurf.
        expect([3, 6]).toContain(copper);
        expect(oak).toBe(copper === 6 ? 4 : 2);
        expect(lk.bloodMoonProc === true).toBe(copper === 6); // Jackpot-Flag exakt bei Verdopplung
        if (copper === 6) doubles++;
        else singles++;
      }
    }
    expect(singles).toBeGreaterThanOrEqual(3); // kein Dauer-Proc …
    expect(doubles).toBeGreaterThanOrEqual(3); // … und der 15 %-Proc kommt vor (applied!)
    // Inventar-Gegenprobe: die Summary-Mengen sind exakt die vergebenen Mengen (kein Anzeige-Drift).
    expect(itemCount(s.inventory, "copper_ore")).toBe(3 * singles + 6 * doubles);
    expect(itemCount(s.inventory, "oak_log")).toBe(2 * singles + 4 * doubles);
  });

  it("(b) Kill ohne Proc: Beute, Gold und itemsGathered bit-identisch zum Lauf ganz ohne Segen", () => {
    const c = chickenContent({
      gold: 5,
      loot: [
        { itemId: "copper_ore", chance: 1, min: 3, max: 3 },
        { itemId: "oak_log", chance: 1, min: 2, max: 2 },
      ],
    });
    const runOneKill = (seed: number, nowMs?: number) => {
      const s = newFighter(c, seed);
      startCombat(s, c, "chicken");
      let guard = 0;
      while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 600) {
        s.character.hp = 9_999;
        combatStep(s, c, nowMs);
      }
      expect(s.combat.kills).toBe(1);
      return s;
    };
    let plainSeen = false;
    let procSeen = false;
    for (let seed = 1; seed <= 40 && !(plainSeen && procSeen); seed++) {
      const base = runOneKill(seed);
      const sat = runOneKill(seed, SATURDAY_MS);
      if (sat.combat.lastKill?.bloodMoonProc) {
        procSeen = true;
        expect(itemCount(sat.inventory, "copper_ore")).toBe(2 * itemCount(base.inventory, "copper_ore"));
        expect(itemCount(sat.inventory, "oak_log")).toBe(2 * itemCount(base.inventory, "oak_log"));
      } else {
        plainSeen = true;
        // Bit-identische Beute: gleicher Seed, gleiche Sequenz bis zum (verlorenen) Extra-Wurf.
        expect(sat.inventory).toEqual(base.inventory);
        expect(sat.stats.itemsGathered).toBe(base.stats.itemsGathered);
      }
      // Kill-Gold ist KEIN Loot-Tabellen-Eintrag → in BEIDEN Fällen unverdoppelt.
      expect(sat.character.gold).toBe(base.character.gold);
    }
    expect(plainSeen).toBe(true);
    expect(procSeen).toBe(true);
  });

  it("(c) Nicht-Samstag (rotmist-Sonntag, chance-1-Loot) UND Samstag ohne Beute: RNG-Strom bit-identisch — kein Extra-Wurf", () => {
    // Sonntag/rotmist skaliert nur den VERGLEICHSWERT der Drop-Chance (kein eigener Draw); bei
    // chance-1-Zeilen ändert sich nichts ⇒ der komplette Lauf MUSS bit-identisch zur Segen-freien
    // Referenz sein. Das ist der Regressionsschutz: nur der Samstag darf einen Extra-Float ziehen.
    const looted = chickenContent({ gold: 5, loot: [{ itemId: "copper_ore", chance: 1, min: 3, max: 3 }] });
    const runTicks = (c: ContentDB, ticks: number, nowMs?: number) => {
      const s = newFighter(c, 11);
      startCombat(s, c, "chicken");
      for (let i = 0; i < ticks; i++) {
        s.character.hp = 9_999;
        combatStep(s, c, nowMs);
      }
      return s;
    };
    const base = runTicks(looted, 3_000);
    const sunday = runTicks(looted, 3_000, SUNDAY_MS);
    expect(sunday.rng).toEqual(base.rng); // KEIN zusätzlicher Draw an einem Nicht-Samstag
    expect(sunday.inventory).toEqual(base.inventory);
    expect(sunday.character.gold).toBe(base.character.gold);
    expect(sunday.combat.kills).toBe(base.combat.kills);

    // Samstag, aber der Kill produziert NIE Beute (leere Loot-Tabelle) ⇒ ebenfalls kein Draw
    // (dokumentierte Gate-Regel: der Erfolgs-Float fällt nur bei produzierter Beute).
    const lootless = chickenContent({ gold: 5, loot: [] });
    const baseEmpty = runTicks(lootless, 2_000);
    const satEmpty = runTicks(lootless, 2_000, SATURDAY_MS);
    expect(satEmpty.rng).toEqual(baseEmpty.rng);
    expect(satEmpty.character.gold).toBe(baseEmpty.character.gold);
    expect(satEmpty.combat.kills).toBe(baseEmpty.combat.kills);
  });

  it("(d) carrionwing-Zweitroll (#276) zuerst, DANN verdoppelt der Blutmond beides — Gold koppelt nur an carrionwing", () => {
    // Lokales doubleLoot-Pet (Cap 0.05) auf gepatchtem Chicken (Muster pet-effects-applied.test.ts).
    const skillEffect: PetSkillEffect = { kind: "doubleLoot", value: 0.05 };
    const c: ContentDB = {
      ...content,
      pets: {
        test_pet: {
          id: "test_pet",
          name: { en: "T", de: "T" },
          skillEffect,
          combatAbility: { name: { en: "A", de: "A" }, kind: "stun", intervalMs: 100_000_000, value: 600 },
          source: { kind: "combat", style: "melee" },
          dropChance: 1,
          icon: "x",
        },
      },
      monsters: {
        ...content.monsters,
        chicken: { ...content.monsters.chicken!, gold: 5, loot: [{ itemId: "copper_ore", chance: 1, min: 3, max: 3 }] },
      },
    };
    const s = newFighter(c, 42);
    s.character.ownedPets.test_pet = true;
    s.character.companionPetId = "test_pet";
    startCombat(s, c, "chicken");
    let kills = 0;
    let goldBefore = s.character.gold;
    let bloodOnly = 0; // Blutmond ohne carrionwing: Loot ×2, Gold EINFACH
    let both = 0; // beide Procs: (3+3)×2 = 12, Gold doppelt (nur durch carrionwing)
    for (let i = 0; i < 200_000 && !(bloodOnly >= 1 && both >= 1); i++) {
      s.character.hp = 9_999;
      combatStep(s, c, SATURDAY_MS);
      if (s.combat.kills > kills) {
        kills = s.combat.kills;
        const lk = s.combat.lastKill!;
        const qty = lk.loot.find((l) => l.itemId === "copper_ore")!.qty;
        const goldThisKill = s.character.gold - goldBefore;
        goldBefore = s.character.gold;
        // Mögliche Mengen: 3 (nichts), 6 (genau EIN Proc), 12 (carrionwing → Blutmond ×2).
        // 9/18/24 … wären Rekursion oder Mehrfach-Würfe.
        expect([3, 6, 12]).toContain(qty);
        if (lk.bloodMoonProc) {
          if (qty === 6) {
            bloodOnly++;
            expect(goldThisKill).toBeGreaterThanOrEqual(5); // EIN Gold-Wurf: 5 + [0..2] —
            expect(goldThisKill).toBeLessThanOrEqual(7); // der Blutmond verdoppelt Gold NICHT
          } else {
            expect(qty).toBe(12); // Blutmond verdoppelt den KOMPLETTEN Stand inkl. Zweitroll
            both++;
            expect(goldThisKill).toBeGreaterThanOrEqual(10); // ZWEI Gold-Würfe (carrionwing) …
            expect(goldThisKill).toBeLessThanOrEqual(14); // … aber KEINE Blutmond-Verdopplung
          }
        } else {
          expect([3, 6]).toContain(qty); // ohne Blutmond nie 12
          if (qty === 6) {
            expect(goldThisKill).toBeGreaterThanOrEqual(10); // carrionwing koppelt Gold mit
            expect(goldThisKill).toBeLessThanOrEqual(14);
          }
        }
      }
    }
    expect(bloodOnly).toBeGreaterThanOrEqual(1);
    expect(both).toBeGreaterThanOrEqual(1);
  });

  it("(e) Instanz-Drop (Suffix): der Proc prägt ein wertgleiches DUPLIKAT — gleicher Suffix-Roll, frische instanceId", () => {
    // Test-Equipment + injizierter Suffix-Pool (Muster first-suffix-guarantee.test.ts): jeder Kill
    // droppt genau EIN Schwert (chance 1), Suffix-Chance 1 (effektiv am 0.95-Cap) ⇒ fast jeder Kill
    // erzeugt eine Instanz statt eines Stacks.
    const sword: ItemDef = {
      id: "test_bm_sword",
      name: { en: "Bloodmoon Test Sword", de: "Blutmond-Testschwert" },
      type: "equipment",
      slot: "mainhand",
      weaponStyle: "melee",
      stackable: false,
    };
    const bull: SuffixDef = {
      id: "suffix_bm_bull",
      suffix: { en: "of the Bull", de: "des Stiers" },
      appliesTo: ["weapon_melee"],
      statsPerIlvl: { meleeDamage: 0.7 },
      attrPerIlvl: { str: 0.45 },
      weight: 100,
    };
    const c: ContentDB = {
      ...content,
      suffixes: { suffix_bm_bull: bull },
      items: { ...content.items, test_bm_sword: sword },
      monsters: {
        ...content.monsters,
        chicken: {
          ...content.monsters.chicken!,
          gold: 5,
          loot: [{ itemId: "test_bm_sword", chance: 1, min: 1, max: 1, suffixChance: 1 }],
        },
      },
    };
    const s = newFighter(c, 3);
    startCombat(s, c, "chicken");
    let kills = 0;
    let instancesBefore = s.inventory.instances.length;
    let duplicateSeen = false;
    for (let i = 0; i < 40_000 && !duplicateSeen; i++) {
      s.character.hp = 9_999;
      combatStep(s, c, SATURDAY_MS);
      if (s.combat.kills > kills) {
        kills = s.combat.kills;
        const lk = s.combat.lastKill!;
        const added = s.inventory.instances.length - instancesBefore;
        instancesBefore = s.inventory.instances.length;
        // Pro Kill: 0 Instanzen (kein Suffix), 1 (Suffix ohne Proc) oder 2 (Suffix + Blutmond).
        expect([0, 1, 2]).toContain(added);
        if (added === 2) {
          duplicateSeen = true;
          expect(lk.bloodMoonProc).toBe(true);
          const [orig, copy] = s.inventory.instances.slice(-2);
          expect(orig!.baseItemId).toBe("test_bm_sword");
          expect(copy!.baseItemId).toBe("test_bm_sword");
          // DUPLIKAT, KEIN Re-Roll: exakt derselbe Suffix (Id, ilvl UND Stärke-Roll) …
          expect(orig!.suffix).toBeDefined();
          expect(copy!.suffix).toEqual(orig!.suffix);
          expect(copy!.affixes).toEqual(orig!.affixes);
          // … aber eine eigene Identität (frisch geprägte instanceId).
          expect(copy!.instanceId).not.toBe(orig!.instanceId);
          // Summary zählt beide Exemplare (Kill-Karte zeigt die verdoppelte Menge).
          expect(lk.loot.find((l) => l.itemId === "test_bm_sword")!.qty).toBe(2);
        } else if (added === 1) {
          // Suffix ohne Proc: Summary 1 Exemplar.
          expect(lk.loot.find((l) => l.itemId === "test_bm_sword")!.qty).toBe(1);
        }
      }
    }
    expect(duplicateSeen).toBe(true); // ~14 % pro Kill (0.95 × 0.15) — deterministisch mit Seed 3
  });
});
