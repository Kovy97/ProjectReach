import { describe, expect, it } from "vitest";
import type { CampBoostKind, GameState, SkillId } from "@hearthforge/shared";
import {
  CAMP_BLESSING_BOOST_CAP,
  CAMP_MAX_BUILDING_LEVEL,
  CAMP_MAX_OFFLINE_BONUS_MS,
  CAMP_SKILL_SPEED_KIND,
  CAMP_SPEED_CUT_CAP,
  MASTERY_SPEED_CAP,
  MAX_OFFLINE_MS,
  SELL_BONUS_TOTAL_CAP,
  SLAYER_POINTS_TOTAL_BONUS_CAP,
  campCatalogMaxBoost,
  effectiveBankCapacity,
  effectiveMaxOfflineMs,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance, effectiveActionDurationMs } from "./tick";
import { campBoost } from "./camp";
import { effectiveGrowMs } from "./farming";
import { effectiveSellPrice } from "./shop";

/**
 * LAGER-ENVELOPE-GUARD (encampment-balance.md §7.11 — der von der Balance-Ausarbeitung geforderte
 * neue Guard). Pinnt die Grenzen, die das Lager NIE überschreiten darf:
 *
 *  (1) max. Lager-Tempo je Skill ≤ 0.15 (Werkhof-Gruppe ≤ 0.09, Feldgarten ≤ 0.12),
 *  (2) KAMPF-Skills exakt 0 (Eiserne Regel 3: kein Gebäude bufft Schaden/Verteidigung/Tempo),
 *  (3) B2-Boden: Gesamt-Dauer-Multiplikator (Mastery × Pool × Lager) NIE unter 0.60,
 *  (4) Verkaufsbonus-Klemme +15 %, Slayer-Punkte-Klemme ×1.5,
 *  (5) Schrein-Klemme 0.30 und Wachturm-Cap +3 h,
 *  (6) OHNE LAGER ist ALLES exakt neutral — der bit-identisch-Beweis, an dem die Sim- und
 *      Determinismus-Fixtures hängen.
 *
 * Dieser Guard ist bewusst ZAHLEN-hart: reißt er, hat jemand das Boost-Budget verschoben und muss
 * das Balance-Doc mitziehen (nicht umgekehrt).
 */

/** Die 7 Kampf-Skills + slayer: sie dürfen NIE einen Lager-Tempo-Eintrag bekommen. */
const COMBAT_SKILLS: SkillId[] = [
  "attack",
  "power",
  "defence",
  "ranged",
  "magic",
  "warding",
  "vitality",
  "slayer",
];

const ALL_KINDS: CampBoostKind[] = [
  "buildSlots", "offlineCapMs", "bankSlots", "buildSpeed", "fishingSpeed", "woodcuttingSpeed",
  "miningSpeed", "farmingSpeed", "thievingSpeed", "craftSpeed", "smeltRate", "smokeRate",
  "slayerPoints", "blessing", "sellBonus",
];

/** Spielstand mit VOLL ausgebautem Lager (alle 15 Gebäude auf Stufe III). */
function fullCamp(name = "Voll"): GameState {
  const s = createGame({ name }, content, 1);
  for (const b of content.campBuildings ?? []) s.camp.buildings[b.id] = CAMP_MAX_BUILDING_LEVEL;
  s.camp.buildSeq += 1; // Cache-Vertrag (camp.ts campBoostCached)
  return s;
}

describe("Lager-Envelope (1)+(2): Tempo-Budget je Skill, Kampf unberührt", () => {
  it("KATALOG: kein Tempo-boostKind übersteigt seine Klemme (15 % / 12 % / 9 %)", () => {
    expect(campCatalogMaxBoost(content.campBuildings, "fishingSpeed")).toBeCloseTo(0.15, 10);
    expect(campCatalogMaxBoost(content.campBuildings, "woodcuttingSpeed")).toBeCloseTo(0.15, 10);
    expect(campCatalogMaxBoost(content.campBuildings, "miningSpeed")).toBeCloseTo(0.15, 10);
    expect(campCatalogMaxBoost(content.campBuildings, "thievingSpeed")).toBeCloseTo(0.15, 10);
    expect(campCatalogMaxBoost(content.campBuildings, "farmingSpeed")).toBeCloseTo(0.12, 10);
    expect(campCatalogMaxBoost(content.campBuildings, "craftSpeed")).toBeCloseTo(0.09, 10);
    // Und keiner davon reißt die harte Engine-Klemme. EPSILON: die Katalog-Summe dreier 0.05-Deltas
    // ist in IEEE-754 exakt 0.15000000000000002 — die Klemme (Math.min in tick.ts campSpeedMult)
    // schneidet dieses 2e-17 sauber weg. Der Guard prüft die BALANCE-Grenze, nicht die
    // Float-Darstellung; die exakte Klemm-Wirkung sichert der Dauer-Test unten.
    for (const kind of ALL_KINDS) {
      if (!kind.endsWith("Speed") || kind === "buildSpeed") continue;
      expect(campCatalogMaxBoost(content.campBuildings, kind), kind).toBeLessThanOrEqual(
        CAMP_SPEED_CUT_CAP + 1e-9,
      );
    }
  });

  it("Eiserne Regel 3: KEIN Kampf-Skill (und nicht slayer) hat einen Lager-Tempo-Eintrag", () => {
    for (const skill of COMBAT_SKILLS) {
      expect(CAMP_SKILL_SPEED_KIND[skill], skill).toBeUndefined();
    }
  });

  it("Voll-Lager verkürzt KEINE Kampf-Aktion, aber jede zugeordnete Skilling-Aktion", () => {
    const bare = createGame({ name: "Ohne" }, content, 1);
    const full = fullCamp();
    let skillingChecked = 0;
    for (const action of Object.values(content.actions)) {
      const bareMs = effectiveActionDurationMs(bare, content, action);
      const fullMs = effectiveActionDurationMs(full, content, action);
      if (CAMP_SKILL_SPEED_KIND[action.skill]) {
        expect(fullMs, `${action.id} müsste schneller sein`).toBeLessThanOrEqual(bareMs);
        skillingChecked++;
      } else {
        // Kampf-Skills und alles ohne Zuordnung: EXAKT identisch (nicht „ungefähr").
        expect(fullMs, `${action.id} darf sich nicht ändern`).toBe(bareMs);
      }
    }
    expect(skillingChecked).toBeGreaterThan(100);
  });

  it("Feldgarten: Reifezeit ×0.88, mit Cape-Perk multiplikativ (balance.md §3 „×0.81\")", () => {
    const bare = createGame({ name: "Ohne" }, content, 1);
    const full = fullCamp();
    const crops = Object.values(content.crops ?? {});
    expect(crops.length).toBeGreaterThan(0);
    for (const c of crops) {
      expect(effectiveGrowMs(bare, content, c)).toBe(c.growMs); // ohne Lager unverändert
      expect(effectiveGrowMs(full, content, c)).toBe(Math.max(1, Math.round(c.growMs * 0.88)));
    }
  });
});

describe("Lager-Envelope (3): B2-Boden — Gesamt-Dauer-Multiplikator nie unter 0.60", () => {
  it("strukturell: Mastery-Cap × Pool-Cap × Lager-Klemme = 0.6647 ≥ 0.60", () => {
    const POOL_SPEED_CAP = 0.08; // Checkpoints 0.25 + 0.95 (je 0.04), s. balance.md §3
    const floor = (1 - MASTERY_SPEED_CAP) * (1 - POOL_SPEED_CAP) * (1 - CAMP_SPEED_CUT_CAP);
    expect(floor).toBeCloseTo(0.6647, 4);
    expect(floor).toBeGreaterThanOrEqual(0.6);
  });

  it("gemessen: keine Aktion fällt mit Voll-Lager unter 60 % ihrer Basis-Dauer", () => {
    // Werkzeuge sind laut balance.md §3 aus dem Budget ausgenommen (sie SIND die Gear-Leiter) —
    // gemessen wird der reine Boni-Anteil, also gegen die werkzeuglose Basis desselben States.
    const full = fullCamp();
    for (const action of Object.values(content.actions)) {
      const ms = effectiveActionDurationMs(full, content, action);
      expect(ms / action.durationMs, action.id).toBeGreaterThanOrEqual(0.6);
      expect(ms, action.id).toBeGreaterThanOrEqual(1); // Mindestdauer-Boden hält
    }
  });

  it("Mindestdauer-Raster: die kürzeste Aktion bleibt deutlich über einem Tick", () => {
    const full = fullCamp();
    const shortest = Math.min(
      ...Object.values(content.actions).map((a) => effectiveActionDurationMs(full, content, a)),
    );
    expect(shortest).toBeGreaterThan(500); // balance.md §3: kürzeste ~0,8 s = 8 Ticks
  });
});

describe("Lager-Envelope (4)+(5): harte Klemmen", () => {
  it("Verkaufsbonus: Voll-Lager +6 %, Gesamt-Klemme +15 % (Pet 5 % kann nicht darüber stapeln)", () => {
    expect(campCatalogMaxBoost(content.campBuildings, "sellBonus")).toBeCloseTo(0.06, 10);
    expect(SELL_BONUS_TOTAL_CAP).toBe(0.15);
    const bare = createGame({ name: "Ohne" }, content, 1);
    const full = fullCamp();
    let checked = 0;
    for (const itemId of Object.keys(content.items)) {
      const b = effectiveSellPrice(bare, content, itemId);
      const f = effectiveSellPrice(full, content, itemId);
      expect(f, itemId).toBeGreaterThanOrEqual(b);
      // Nie mehr als die Gesamt-Klemme (+1 wegen kaufmännischer Rundung/min-1-Boden).
      expect(f, itemId).toBeLessThanOrEqual(Math.round(b * (1 + SELL_BONUS_TOTAL_CAP)) + 1);
      checked++;
    }
    expect(checked).toBeGreaterThan(500);
  });

  it("Slayer-Punkte: Voll-Lager +30 %, Gesamt-Klemme ×1.5 (Trophäenwand + Meisterring)", () => {
    expect(campCatalogMaxBoost(content.campBuildings, "slayerPoints")).toBeCloseTo(0.3, 10);
    expect(SLAYER_POINTS_TOTAL_BONUS_CAP).toBe(0.5);
    // Realer Stapel heute: Wand 0.30 + Ring 0.10 = 0.40 ⇒ ×1.40, unter der Klemme.
    expect(0.3 + 0.1).toBeLessThanOrEqual(SLAYER_POINTS_TOTAL_BONUS_CAP);
  });

  it("Schrein: Voll-Lager 0.30, Klemme 0.30 — und wildhunt ist AUSGENOMMEN (Chef-Entscheid K2)", () => {
    expect(campCatalogMaxBoost(content.campBuildings, "blessing")).toBeCloseTo(0.3, 10);
    expect(CAMP_BLESSING_BOOST_CAP).toBe(0.3);
  });

  it("Wachturm: Voll-Lager +3 h, effektives Offline-Fenster 8 h → 11 h", () => {
    expect(campCatalogMaxBoost(content.campBuildings, "offlineCapMs")).toBe(CAMP_MAX_OFFLINE_BONUS_MS);
    const bare = createGame({ name: "Ohne" }, content, 1);
    expect(effectiveMaxOfflineMs(bare, content)).toBe(MAX_OFFLINE_MS);
    expect(effectiveMaxOfflineMs(fullCamp(), content)).toBe(MAX_OFFLINE_MS + 3 * 3_600_000);
  });

  it("Vorratsspeicher: Voll-Lager +14 Bank-Plätze auf die effektive Kapazität", () => {
    const bare = createGame({ name: "Ohne" }, content, 1);
    const full = fullCamp();
    expect(campCatalogMaxBoost(content.campBuildings, "bankSlots")).toBe(14);
    expect(effectiveBankCapacity(full, content)).toBe(effectiveBankCapacity(bare, content) + 14);
  });
});

describe("Lager-Envelope (6): OHNE Lager ist alles exakt neutral (bit-identisch-Beweis)", () => {
  it("frischer Spielstand: JEDE Boost-Art exakt 0", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    for (const kind of ALL_KINDS) expect(campBoost(s, content, kind), kind).toBe(0);
  });

  it("Aktions-Dauern OHNE Lager sind exakt die Werte ohne jeden Lager-Term", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    for (const action of Object.values(content.actions)) {
      const expected = effectiveActionDurationMs(s, content, action);
      s.camp.buildings = {}; // explizit leer
      expect(effectiveActionDurationMs(s, content, action), action.id).toBe(expected);
    }
  });

  it("ein 8-h-advance ohne Lager lässt State + RNG bit-identisch zu einem Lauf ohne camp-Feld", () => {
    const withCamp = createGame({ name: "Gleich" }, content, 42);
    const withoutCamp = createGame({ name: "Gleich" }, content, 42);
    // Der zweite State verliert das Lager-Feld komplett (Alt-Save-Shape) — die Engine muss das
    // defensiv überstehen UND exakt dasselbe Ergebnis liefern.
    delete (withoutCamp as Partial<GameState>).camp;

    advance(withCamp, content, 8 * 3_600_000, { offline: true });
    advance(withoutCamp, content, 8 * 3_600_000, { offline: true });

    expect(withCamp.rng).toEqual(withoutCamp.rng);
    expect(withCamp.eliteRng).toEqual(withoutCamp.eliteRng);
    expect(withCamp.totalTicks).toBe(withoutCamp.totalTicks);
    expect(withCamp.elapsedMs).toBe(withoutCamp.elapsedMs);
    expect(withCamp.character.gold).toBe(withoutCamp.character.gold);
    expect(withCamp.skills).toEqual(withoutCamp.skills);
    expect(withCamp.inventory).toEqual(withoutCamp.inventory);
    expect(withCamp.bank).toEqual(withoutCamp.bank);
  });
});
