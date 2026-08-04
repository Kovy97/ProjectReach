import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { DEFENSE_MITIGATION_K, DEFENSE_MITIGATION_MAX } from "@hearthforge/shared";
import type { ContentDB } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { xpForLevel } from "./leveling";

/**
 * Balance-Regression (s. design/balance-combat-2.md, Frage des Chefs):
 * „Wenn nackt schon passt, ist es mit Rüstung dann ultra-easy?"
 *
 * Das Prozent-Mitigations-Modell `damage = raw · (1 − def/(def+K))` ist genau so gebaut, dass
 * Rüstung den Schaden SPÜRBAR dämpft, ihn aber NIE auf den 1er-Boden drückt (kein „unverwundbar").
 * Dieser Test schreibt beide Eigenschaften fest: nackt nimmt man echten Schaden (kein 1-Boden mehr),
 * gerüstet weniger — aber immer noch nennenswert.
 */

/** Repliziert die Mitigation aus `resolveAttack` (an dieselbe Konstante gebunden). */
function mitigated(rawDamage: number, defense: number): number {
  return Math.max(1, Math.round(mitigatedRaw(rawDamage, defense)));
}

/** Ungerundete Mitigation — für strikte Vergleiche unterhalb der Integer-Granularität. */
function mitigatedRaw(rawDamage: number, defense: number): number {
  const reduction = Math.min(
    DEFENSE_MITIGATION_MAX,
    defense / (defense + DEFENSE_MITIGATION_K),
  );
  return rawDamage * (1 - reduction);
}

/** Ein plausibler Mid-Game-Charakter (Grenzlande, ~Warlock-Level). */
function midGameHero() {
  const s = createGame({ name: "Held" }, content, 7);
  // Kampf- + con-speisende Skills auf ein zum Warlock (Lv14) passendes Niveau.
  for (const [id, lvl] of Object.entries({
    attack: 18, power: 15, defence: 18, vitality: 18,
    mining: 22, woodcutting: 18, fishing: 18, farming: 12, thieving: 12,
  })) {
    s.skills[id] = { xp: xpForLevel(lvl) };
  }
  return s;
}

// Kanonische Iron-IDs (breastplate/legguards/gloves/boots existierten nie im Content — der Test
// maß vorher nur Helm+Schild als „Set"; mit den echten IDs greift wirklich das volle Iron-Set).
const IRON_SET: Record<string, string> = {
  helmet: "iron_fullhelm",
  body: "iron_platebody",
  legs: "iron_platelegs",
  gloves: "iron_gauntlets",
  boots: "iron_sabatons",
  offhand: "iron_kiteshield",
};

// Rüstungs-Trinität / Itemization 2.5 (armor-trinity-spec §1.1/§3): Mitigation kommt jetzt AUS-
// SCHLIESSLICH aus `armorRating` der Platten-Klassen-Schicht (nicht mehr aus CON). content-dev prägt
// die echten Werte erst später auf (§4). Für diesen Formel-/Mechanik-Test injizieren wir Band-20-
// Iron-armorRating (Spec §4.3-Slot-Verteilung) über einen lokalen Content-Klon — content-neutral,
// exakt der `contentWithCrops`-Testpattern der Persistenz.
const IRON_ARMOR_RATING: Record<string, number> = {
  iron_fullhelm: 1.3,
  iron_platebody: 1.9,
  iron_platelegs: 1.4,
  iron_gauntlets: 0.9,
  iron_sabatons: 0.9,
  iron_kiteshield: 2.1,
};
function contentWithIronArmor(): ContentDB {
  const items = { ...content.items };
  for (const [id, ar] of Object.entries(IRON_ARMOR_RATING)) {
    items[id] = { ...items[id]!, armorRating: ar };
  }
  return { ...content, items };
}

describe("Mitigation: nackt vs. gerüstet", () => {
  it("Rüstung dämpft Schaden spürbar, trivialisiert ihn aber nicht (kein 1er-Boden)", () => {
    const c = contentWithIronArmor();
    const warlockDmg = c.monsters.goblin_warlock!.damage; // 5 (Squish-Skala)

    const naked = midGameHero();
    const defNaked = computeStats(naked, c).defense; // ungepanzert ⇒ armorRating 0 ⇒ defense 0
    const dmgNaked = mitigated(warlockDmg, defNaked);

    const armored = midGameHero();
    for (const [slot, itemId] of Object.entries(IRON_SET)) {
      armored.character.equipment[slot as keyof typeof armored.character.equipment] = itemId;
    }
    const defArmored = computeStats(armored, c).defense; // Σ armorRating ≈ 8.5
    const dmgArmored = mitigated(warlockDmg, defArmored);

    // 1) Rüstung erhöht die Verteidigung (jetzt via armorRating) und senkt den eingehenden Schaden.
    // Beim kleinen Warlock-Roh-Schaden (5) kann der gerundete Delta klein sein, darum strikt auf dem
    // UNGERUNDETEN Wert, gerundet nur nicht-steigend.
    expect(defArmored).toBeGreaterThan(defNaked);
    expect(mitigatedRaw(warlockDmg, defArmored)).toBeLessThan(mitigatedRaw(warlockDmg, defNaked));
    expect(dmgArmored).toBeLessThanOrEqual(dmgNaked);

    // 2) Nackt nimmt man ECHTEN Schaden — der alte „1 Schaden"-Bug ist behoben. (Squish ÷10: ≥2)
    expect(dmgNaked).toBeGreaterThanOrEqual(2);

    // 3) Auch voll gerüstet bleibt spürbar Schaden übrig (Kampf behält Einsatz) — kein 1er-Boden.
    expect(dmgArmored).toBeGreaterThanOrEqual(2);

    // 4) Selbst mit vollem Iron-Set bleibt die Reduktion klar unter „unverwundbar".
    const reductionArmored = defArmored / (defArmored + DEFENSE_MITIGATION_K);
    expect(reductionArmored).toBeLessThan(0.7);
  });

  it("die Mitigation skaliert monoton: mehr Verteidigung = weniger Schaden, nie negativ/null", () => {
    // Defense-Stützstellen auf der Squish-Skala (÷10; 40 liegt über dem 0.8-Deckel-Punkt def=50…).
    for (const def of [0, 1, 5, 10, 20, 40]) {
      const d = mitigated(100, def);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(100);
    }
    // Höhere Verteidigung gibt nie mehr Schaden als niedrigere (unterhalb des Deckels strikt).
    expect(mitigated(100, 20)).toBeLessThan(mitigated(100, 5));
  });
});
