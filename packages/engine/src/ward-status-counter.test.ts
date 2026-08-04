import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import { STATUS_VS_WARD_MULT, TICK_MS } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat, combatStep } from "./combat";

/**
 * Chef-Entscheid nach Spieler-Report "Hollow Choir: I miss 9/10" (voll absorbierte Treffer sahen
 * wie Misses aus):
 *   1. Der Spieler-Hit-Log-Eintrag (kind "hit"/"crit") bekommt ein optionales `absorbed`-Feld — der
 *      in DIESEM Schlag vom Gegner-Ward geschluckte Betrag (nur gesetzt wenn > 0).
 *   2. Status-vs-Ward-Konter: Monster mit Ward-Pool (wardCapacity > 0) nehmen +20 % Schaden von
 *      schadensverursachenden Status-DoTs (STATUS_VS_WARD_MULT). Trait-basiert (gilt den GANZEN
 *      Kampf, auch nach Ward-Bruch) — NICHT an den aktuellen Pool-Stand gekoppelt.
 *   3. Befund-Verifikation: DoT-Ticks umgehen den Ward-Pool bereits (treffen direkt enemyHp) — dieser
 *      Fix fügt NUR den ×1.2-Schadens-Mult hinzu, keinen zusätzlichen Pool-Bypass.
 */

// ── Test-Content-Fabriken (self-contained, analog enemy-ward-counter.test.ts) ──
function withItems(items: ItemDef[]): ContentDB {
  const map = { ...content.items };
  for (const it of items) map[it.id] = it;
  return { ...content, items: map };
}
function withMonster(c: ContentDB, m: MonsterDef): ContentDB {
  return { ...c, monsters: { ...c.monsters, [m.id]: m } };
}
function weapon(id: string, fields: Partial<ItemDef>): ItemDef {
  return {
    id,
    name: { en: id, de: id },
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "melee",
    weaponType: "sword",
    damageMin: 8,
    damageMax: 12,
    attackIntervalMs: 800,
    ...fields,
  } as ItemDef;
}
/** Gegner: greift standardmäßig NIE an und stirbt im Testfenster nicht (isoliert die Auflösung). */
function mob(id: string, fields: Partial<MonsterDef>): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 10,
    maxHp: 50_000_000,
    damage: 0,
    accuracy: 100_000,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 10_000_000,
    xp: 0,
    gold: 0,
    loot: [],
    ...fields,
  } as MonsterDef;
}
function hero(c: ContentDB, weaponId: string, seed: number) {
  const s = createGame({ name: "K", baseAttributes: { str: 20, con: 200, dex: 10 } }, c, seed);
  s.character.equipment.mainhand = weaponId;
  s.character.food = null;
  s.character.hp = computeStats(s, c).maxHp;
  return s;
}

// ── 1) Absorbed-Feld im Hit-Log ──────────────────────────────────────────────
describe('Hit-Log: "absorbed" weist den vom Gegner-Ward geschluckten Betrag aus', () => {
  it("voll absorbierter Treffer → amount:0 UND absorbed>0 (Ward nie erschöpft, wardBreak 0)", () => {
    const w = weapon("abs_full_sword", { wardBreak: 0 });
    // Riesiger Pool ⇒ absorbiert im Testfenster jeden Treffer voll (overflow immer 0).
    const c = withMonster(withItems([w]), mob("abs_full_mob", { wardCapacity: 50_000_000, evasion: 0 }));
    const s = hero(c, "abs_full_sword", 5);
    startCombat(s, c, "abs_full_mob");

    let sawFullAbsorb = false;
    for (let i = 0; i < 500; i++) {
      combatStep(s, c);
    }
    for (const e of s.combat.log) {
      if (e.by === "player" && (e.kind === "hit" || e.kind === "crit")) {
        expect(e.amount).toBe(0);
        expect(e.absorbed).toBeGreaterThan(0);
        sawFullAbsorb = true;
      }
    }
    expect(sawFullAbsorb).toBe(true); // mindestens ein Treffer ist gelandet
  });

  it("teilweise absorbierter Treffer (Pool kleiner als der Schlag) → amount>0 UND absorbed>0", () => {
    const w = weapon("abs_part_sword", { wardBreak: 0, damageMin: 10, damageMax: 10 });
    // Pool (3) < Schlag (10) ⇒ absorbed=3 (Pool-Drain), overflow=7 ⇒ amount=7>0, absorbed=3>0.
    const c = withMonster(withItems([w]), mob("abs_part_mob", { wardCapacity: 3, evasion: 0 }));
    const s = hero(c, "abs_part_sword", 5);
    startCombat(s, c, "abs_part_mob");

    let sawPartialAbsorb = false;
    for (let i = 0; i < 30 && !sawPartialAbsorb; i++) {
      combatStep(s, c);
      for (const e of s.combat.log) {
        if (e.by === "player" && (e.kind === "hit" || e.kind === "crit") && e.absorbed !== undefined) {
          expect(e.amount).toBeGreaterThan(0);
          expect(e.absorbed).toBeGreaterThan(0);
          expect(e.absorbed).toBe(3); // exakt der (jetzt erschöpfte) Pool
          sawPartialAbsorb = true;
        }
      }
    }
    expect(sawPartialAbsorb).toBe(true);
  });

  it("Gegner ohne Ward (wardCapacity 0) → das Feld fehlt komplett", () => {
    const w = weapon("abs_none_sword", {});
    const c = withMonster(withItems([w]), mob("abs_none_mob", { wardCapacity: 0, evasion: 0 }));
    const s = hero(c, "abs_none_sword", 5);
    startCombat(s, c, "abs_none_mob");

    let sawHit = false;
    for (let i = 0; i < 200; i++) combatStep(s, c);
    for (const e of s.combat.log) {
      if (e.by === "player" && (e.kind === "hit" || e.kind === "crit")) {
        sawHit = true;
        expect(e.absorbed).toBeUndefined();
      }
    }
    expect(sawHit).toBe(true);
  });
});

// ── 2)+3) Status-vs-Ward-Konter + DoT-Ward-Bypass-Befund ─────────────────────
describe("Status-vs-Ward-Konter: +20% Status-DoT-Schaden gegen Ward-Monster, DoT umgeht den Pool", () => {
  it("DoT-Tick gegen ein Ward-Monster ist ×1.2 gegenüber einem identischen Nicht-Ward-Monster (fixe Magnitude, gleicher Seed)", () => {
    const SEED = 9;
    // WICHTIG: computeStats deckelt attackIntervalMs auf ATTACK_INTERVAL_CEIL_MS (5000 ms) — ein
    // "riesiges" Waffenintervall wird also NICHT unendlich, sondern auf 5000 ms gekappt. Das Test-
    // fenster muss klar darunter bleiben, sonst feuert bei genau der 50.-Tick-Grenze doch ein echter
    // Spielerangriff dazwischen (verfälscht die reine DoT-Messung).
    const TICKS = 30; // 30 × TICK_MS(100) = 3000 ms < 5000 ms Deckel
    const MAGNITUDE = 10; // Schaden/Sek
    const REMAINING_MS = TICKS * TICK_MS + 5_000; // überlebt das gesamte Testfenster

    function hpLostAfterBurn(wardCap: number): { hpLost: number; wardAfter: number } {
      const w = weapon(`dvw_sword_${wardCap}`, { attackIntervalMs: 10_000_000 });
      const c = withMonster(
        withItems([w]),
        mob(`dvw_mob_${wardCap}`, { wardCapacity: wardCap, maxHp: 1_000_000 }),
      );
      const s = hero(c, w.id, SEED);
      startCombat(s, c, `dvw_mob_${wardCap}`);
      const hpStart = s.combat.enemyHp;
      const wardStart = s.combat.enemyWard!;
      // Burn-DoT direkt applizieren (isoliert von Waffeneffekt-Proc-RNG) — Spielerangriff feuert
      // im (kurzen) Testfenster nicht (s.o., unter dem 5000-ms-Deckel).
      s.combat.enemyEffects.push({ type: "burn", remainingMs: REMAINING_MS, magnitude: MAGNITUDE });
      for (let i = 0; i < TICKS; i++) combatStep(s, c);
      return { hpLost: hpStart - s.combat.enemyHp, wardAfter: s.combat.enemyWard! };
    }

    const noWard = hpLostAfterBurn(0);
    const withWard = hpLostAfterBurn(500); // Pool groß genug, bricht im Fenster nicht (irrelevant für DoT ohnehin)

    expect(noWard.hpLost).toBeGreaterThan(0);
    expect(withWard.hpLost).toBeCloseTo(noWard.hpLost * STATUS_VS_WARD_MULT, 6);
  });

  it("DoT-Schaden umgeht den Ward-Pool: enemyWard bleibt unverändert, enemyHp sinkt (Befund: galt schon vor dem Fix)", () => {
    const w = weapon("bypass_sword", { attackIntervalMs: 10_000_000 });
    const WARD_CAP = 250;
    const c = withMonster(
      withItems([w]),
      mob("bypass_mob", { wardCapacity: WARD_CAP, maxHp: 1_000_000 }),
    );
    const s = hero(c, "bypass_sword", 3);
    startCombat(s, c, "bypass_mob");
    expect(s.combat.enemyWard).toBe(WARD_CAP);
    const hpStart = s.combat.enemyHp;

    s.combat.enemyEffects.push({ type: "burn", remainingMs: 10_000, magnitude: 15 });
    for (let i = 0; i < 40; i++) combatStep(s, c);

    expect(s.combat.enemyWard).toBe(WARD_CAP); // Ward-Pool komplett unangetastet vom DoT
    expect(s.combat.enemyHp).toBeLessThan(hpStart); // HP sank direkt (Pool umgangen)
  });

  it("Trait-basiert: der Bonus gilt auch nachdem der Ward-Pool schon vollständig gebrochen ist", () => {
    const w = weapon("broken_sword", { attackIntervalMs: 10_000_000 });
    const c = withMonster(withItems([w]), mob("broken_mob", { wardCapacity: 20, maxHp: 1_000_000 }));
    const s = hero(c, "broken_sword", 4);
    startCombat(s, c, "broken_mob");
    s.combat.enemyWard = 0; // Pool bereits vollständig gebrochen
    const hpStart = s.combat.enemyHp;
    const MAGNITUDE = 8;
    s.combat.enemyEffects.push({ type: "burn", remainingMs: 5_000, magnitude: MAGNITUDE });
    combatStep(s, c);
    const hpLost = hpStart - s.combat.enemyHp;
    expect(hpLost).toBeCloseTo(MAGNITUDE * STATUS_VS_WARD_MULT * (TICK_MS / 1000), 6);
  });

  it("Frost/Shock (schadenslose Status) bleiben von STATUS_VS_WARD_MULT unberührt", () => {
    const w = weapon("frost_sword", { attackIntervalMs: 10_000_000 });
    const c = withMonster(withItems([w]), mob("frost_mob", { wardCapacity: 100, maxHp: 1_000_000 }));
    const s = hero(c, "frost_sword", 6);
    startCombat(s, c, "frost_mob");
    const hpStart = s.combat.enemyHp;
    s.combat.enemyEffects.push({ type: "frost", remainingMs: 5_000, magnitude: 0 });
    for (let i = 0; i < 20; i++) combatStep(s, c);
    expect(s.combat.enemyHp).toBe(hpStart); // Frost trägt keinen Schaden, Mult greift nirgends
  });
});
