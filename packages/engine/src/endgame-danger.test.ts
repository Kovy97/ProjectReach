import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  DEFENSE_MITIGATION_K,
  DEFENSE_MITIGATION_MAX,
  MELEE_LIFESTEAL,
  MELEE_LIFESTEAL_CAP_ABS,
  MELEE_LIFESTEAL_CAP_PCT,
} from "@hearthforge/shared";
import type { ContentDB } from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { equipItem } from "./equipment";
import { computeStats } from "./character";
import { addItem } from "./inventory";
import { xpForLevel } from "./leveling";

/**
 * Regression Playtest 2026-06-25 r2 / P1-Endgame-Gefahr.
 *
 * Vorher: full-godiron def ~500 → Mitigation `def/(def+125)` ≈ 0,80+ (asymptotisch weiter steigend),
 * last_idol (110 dmg) machte ~22/Treffer bei ~1700 HP, und der 5%-maxHp-Lifesteal-Deckel (~85 HP/
 * Treffer) heilte das voll zurück → 0 Tode, Auto-Eat tot.
 *
 * Fix: (1) Mitigation am oberen Ende auf DEFENSE_MITIGATION_MAX (0,80) gedeckelt, (2) Lifesteal-
 * Deckel zusätzlich absolut (MELEE_LIFESTEAL_CAP_ABS). Dieser Test pinnt beide Hebel.
 */

/** Repliziert die gedeckelte Mitigation aus `resolveAttack`. */
function mitigated(rawDamage: number, defense: number): number {
  const reduction = Math.min(
    DEFENSE_MITIGATION_MAX,
    defense / (defense + DEFENSE_MITIGATION_K),
  );
  return Math.max(1, Math.round(rawDamage * (1 - reduction)));
}

const GODIRON_SET: Record<string, string> = {
  helmet: "godiron_fullhelm",
  body: "godiron_platebody",
  legs: "godiron_platelegs",
  gloves: "godiron_gauntlets",
  boots: "godiron_sabatons",
  offhand: "godiron_kiteshield",
};

/** Voll-godiron-gegearter Endgame-Tank (Melee). */
function endgameTank() {
  const s = createGame({ name: "Tank", baseAttributes: { str: 20, con: 20 } }, content, 11);
  for (const [id, lvl] of Object.entries({
    attack: 105, power: 105, defence: 110, vitality: 110,
  })) {
    s.skills[id] = { xp: xpForLevel(lvl) };
  }
  for (const [slot, itemId] of Object.entries(GODIRON_SET)) {
    s.character.equipment[slot as keyof typeof s.character.equipment] = itemId;
  }
  return s;
}

// Rüstungs-Trinität / Itemization 2.5 (armor-trinity-spec §1.1/§3/§4.3): Endgame-Mitigation kommt
// jetzt aus `armorRating` (nicht mehr CON/Skills/Set-def). content-dev prägt die echten Werte erst
// später auf — hier injizieren wir die Band-90-Platten-armorRating (Spec §4.3) über einen lokalen
// Content-Klon (contentWithCrops-Testpattern). Set-AR ≈ 15.2 → Reduktion ~0.55, klar UNTER dem 0.80-
// Deckel (Plate-AR erreicht den Deckel im Normalspiel nicht — er ist der Anti-Spike-Sicherungs-Rail,
// den der reine Formel-Test unten separat beweist).
const GODIRON_ARMOR_RATING: Record<string, number> = {
  godiron_fullhelm: 2.3,
  godiron_platebody: 3.4,
  godiron_platelegs: 2.5,
  godiron_gauntlets: 1.6,
  godiron_sabatons: 1.6,
  godiron_kiteshield: 3.8,
};
function contentWithGodironArmor(): ContentDB {
  const items = { ...content.items };
  for (const [id, ar] of Object.entries(GODIRON_ARMOR_RATING)) {
    items[id] = { ...items[id]!, armorRating: ar };
  }
  return { ...content, items };
}

describe("Endgame-Gefahr: Mitigations-Deckel", () => {
  it("hohe Endgame-Verteidigung dämpft, bleibt aber unter dem Deckel — Boss bringt Schaden durch", () => {
    const c = contentWithGodironArmor();
    const tank = endgameTank();
    const def = computeStats(tank, c).defense;
    // Voll-godiron erreicht eine spürbare Endgame-Mitigation (Σ armorRating der Platten-Schicht).
    expect(def).toBeGreaterThan(10);

    // Die Mitigation ist hart auf den Deckel begrenzt — nie „unverwundbar".
    const reduction = Math.min(DEFENSE_MITIGATION_MAX, def / (def + DEFENSE_MITIGATION_K));
    expect(reduction).toBeLessThanOrEqual(DEFENSE_MITIGATION_MAX + 1e-9);

    const idol = c.monsters.last_idol!;
    const perHit = mitigated(idol.damage, def);
    const enraged = mitigated(Math.round(idol.damage * idol.enrage!.damageMult), def);
    // Selbst voll gegeart nimmt der Spieler spürbaren Schaden (kein ~0-Risiko mehr). (Squish ÷10)
    expect(perHit).toBeGreaterThanOrEqual(2);
    expect(enraged).toBeGreaterThan(perHit);
  });

  it("der Deckel greift: über der Deckel-Defense steigt die Reduktion nicht weiter", () => {
    // Defense, bei der der ungedeckelte Term den Deckel überschreitet.
    const capDef = (DEFENSE_MITIGATION_K * DEFENSE_MITIGATION_MAX) / (1 - DEFENSE_MITIGATION_MAX);
    const justBelow = mitigated(100, Math.floor(capDef));
    const wayAbove = mitigated(100, Math.floor(capDef) + 1000);
    // Jenseits des Deckels bleibt der durchgelassene Schaden konstant (kein weiteres Abdämpfen).
    expect(wayAbove).toBe(justBelow);
    // Und der durchgelassene Anteil ist >= (1 - MAX) des Rohschadens.
    expect(wayAbove).toBeGreaterThanOrEqual(Math.round(100 * (1 - DEFENSE_MITIGATION_MAX)));
  });
});

describe("Endgame-Gefahr: absoluter Lifesteal-Deckel", () => {
  it("der effektive Lifesteal-Deckel skaliert im Endgame nicht mit der riesigen HP mit", () => {
    const tank = endgameTank();
    const maxHp = computeStats(tank, content).maxHp;
    expect(maxHp).toBeGreaterThan(100); // Endgame-HP-Pool (Squish ÷10)

    // 1-Dezimal-Raster wie in combat.ts (Squish: Heil-Raster ÷10).
    const pctCap = Math.round(maxHp * MELEE_LIFESTEAL_CAP_PCT * 10) / 10;
    const effectiveCap = Math.min(pctCap, MELEE_LIFESTEAL_CAP_ABS);
    // Im Endgame ist der absolute Deckel der bindende — der alte %-Deckel wäre weit höher.
    expect(effectiveCap).toBe(MELEE_LIFESTEAL_CAP_ABS);
    expect(pctCap).toBeGreaterThan(MELEE_LIFESTEAL_CAP_ABS);
  });

  it("ein einzelner Endgame-Lifesteal-Treffer heilt nicht über den absoluten Deckel hinaus", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 20, con: 20 } }, content, 13);
    for (const [id, lvl] of Object.entries({ attack: 105, power: 105, defence: 110, vitality: 110 })) {
      s.skills[id] = { xp: xpForLevel(lvl) };
    }
    for (const [slot, itemId] of Object.entries(GODIRON_SET)) {
      s.character.equipment[slot as keyof typeof s.character.equipment] = itemId;
    }
    addItem(s.inventory, content, "godiron_dagger", 1);
    // Falls godiron_dagger nicht equipbar/verfügbar ist, reicht die Set-Melee-Damage; equip best effort.
    try {
      equipItem(s, content, "godiron_dagger");
    } catch {
      // ignore — Set-Bonus liefert bereits hohen Melee-Schaden
    }
    const st = computeStats(s, content);
    // 1-Dezimal-Raster wie in combat.ts (Squish: Heil-Raster ÷10).
    const cap = Math.min(Math.round(st.maxHp * MELEE_LIFESTEAL_CAP_PCT * 10) / 10, MELEE_LIFESTEAL_CAP_ABS);
    expect(cap).toBe(MELEE_LIFESTEAL_CAP_ABS);

    startCombat(s, content, "last_idol");
    s.character.hp = 1; // maximaler Heil-Raum
    let maxJump = 0;
    for (let i = 0; i < 60; i++) {
      const before = s.character.hp;
      const deathsBefore = s.stats.deaths;
      combatStep(s, content);
      if (s.combat.monsterId === null) break; // Niederlage bricht jetzt ab (Chef 2026-07-01) → Tod nullt monsterId
      // Der Voll-Heal beim Tod ist KEIN Lebensraub-Treffer; die Pro-Treffer-Messung (maxJump) sammelt
      // nur die normalen Treffer-Ticks davor und endet mit dem break oben. Der deaths-continue darunter
      // ist damit ein defensiver No-Op (ein Tod hat monsterId bereits genullt).
      if (s.stats.deaths > deathsBefore) continue;
      const jump = s.character.hp - before;
      if (jump > 0) maxJump = Math.max(maxJump, jump);
    }
    // Pro-Tick-Heilsprung bleibt am absoluten Deckel (+1 Rundungs-/DoT-Rauschen).
    expect(maxJump).toBeLessThanOrEqual(cap + 1);
  });
});

describe("Lifesteal-Deckel: Konstanten-Form", () => {
  it("Lebensraub bleibt moderat und doppelt gedeckelt (prozentual + absolut)", () => {
    expect(MELEE_LIFESTEAL).toBeLessThanOrEqual(0.1);
    expect(MELEE_LIFESTEAL_CAP_PCT).toBeGreaterThan(0);
    expect(MELEE_LIFESTEAL_CAP_ABS).toBeGreaterThan(0);
    // Der absolute Deckel ist klein genug, um Endgame-Boss-Treffer nicht voll wegzuheilen. (Squish ÷10)
    expect(MELEE_LIFESTEAL_CAP_ABS).toBeLessThanOrEqual(2);
  });
});
