import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { AUTO_EAT_MAX_TIER, WARDING_XP_PER_ABSORB } from "@hearthforge/shared";
import type { MagicStance } from "@hearthforge/shared";
import { createGame } from "./state";
import { advance } from "./tick";
import { startCombat } from "./combat";
import { equipItem } from "./equipment";
import { addItem } from "./inventory";
import { computeStats } from "./character";
import { xpForLevel } from "./leveling";

/**
 * Bannmagie-Retune D3 (Chef-Entscheid 27.08.2026, design/achievements-1.2.0/audit.md § 3.1 + Frage 3).
 *
 * Befund der Neu-Messung (2 Sim-h je Band, `advance`-Loop mit Auto-Essen, Seed 7):
 *  - Der PASSIVE Pfad (Ward-Absorb × WARDING_XP_PER_ABSORB) ist durch den Ward-ZUFLUSS gedeckelt
 *    (Mana-Cast × WARD_PER_MANA + Kill-Refill + Warding-Regen), nicht durch den eingehenden
 *    Schaden: ~14–30 k absorbierte Punkte/h über alle Bänder (L30 Ember/L70 Runewoven/L99 Voidweave).
 *    Bei 0,25 waren das 3,5–7,6 k XP/h ⇒ 1 700–3 700 h bis 99 — das Audit hatte mit 60 k XP/h
 *    (≈ 220 h) gerechnet. Mit 1,0 (Faktor 4, obere Kante der Chef-Spanne 3–4) liefert der passive
 *    Pfad 14–30 k XP/h ≈ 8–25 % der gleichzeitig verdienten Magie-XP.
 *  - Der EIGENTLICHE 99er-Pfad ist die Defensiv-Magie-Haltung (activeStanceMods → xpSkill
 *    "warding": 100 % Offensiv- + Kill-XP): gemessen 27 k / 119 k / 175 k XP/h (L30/L70/L99) ⇒
 *    ~74 h bis 99 im Endgame-Band — paritätisch zur Verteidigung (defence in der Defensiv-Haltung).
 *
 * Pins (Hüllen, keine Wunschwerte): (1) die Konstante selbst, (2) der passive Pfad bleibt ein
 * NEBENEINKOMMEN — er überholt den Offensiv-Skill nie (< 50 % der Magie-XP im selben Kampf, kein
 * Doppel-Einkommen; zugleich > 5 %, damit er spürbar ist), (3) Haltungs-Parität: Defensiv-Magie
 * trainiert Bannmagie mit ≥ 80 % der Rate, mit der Offensiv-Magie Magie trainiert. Die Sim-Bänder
 * sind bewusst kurz (30 Sim-min), deterministisch (Seed) und ohne Tod (Band B, L70 vs. Skelett-Speerträger).
 */

const RUNEWOVEN = ["runewoven_cowl", "runewoven_robe_body", "runewoven_robe_legs", "runewoven_handwraps", "runewoven_treads"];

function runBand(stance: MagicStance, minutes: number) {
  const s = createGame({ name: "W", baseAttributes: { int: 10, con: 6, wis: 6 } }, content, 7);
  for (const z of content.zones) s.legacyZoneGrants[z.id] = true;
  s.skills.magic = { xp: xpForLevel(70) };
  s.skills.warding = { xp: xpForLevel(50) };
  s.skills.defence = { xp: xpForLevel(70) };
  s.skills.vitality = { xp: xpForLevel(70) };
  s.character.autoEatTier = AUTO_EAT_MAX_TIER;
  s.character.magicStance = stance;
  for (const id of ["bloodiron_staff", ...RUNEWOVEN]) {
    addItem(s.inventory, content, id, 1);
    expect(equipItem(s, content, id).ok, `equip ${id}`).toBe(true);
  }
  addItem(s.inventory, content, "cooked_wraithscale", 2000);
  s.character.food = "cooked_wraithscale";
  const st = computeStats(s, content);
  expect(st.style).toBe("magic");
  s.character.hp = st.maxHp;
  s.character.mana = st.maxMana;
  s.character.ward = st.maxWard;
  const w0 = s.skills.warding.xp;
  const m0 = s.skills.magic.xp;
  const d0 = s.stats.deaths;
  expect(startCombat(s, content, "skeleton_spearman")).toBe(true);
  for (let i = 0; i < minutes * 60; i++) {
    advance(s, content, 1000);
    if (s.combat.monsterId === null) startCombat(s, content, "skeleton_spearman");
  }
  const hours = minutes / 60;
  return {
    wardingPerH: (s.skills.warding.xp - w0) / hours,
    magicPerH: (s.skills.magic.xp - m0) / hours,
    deaths: s.stats.deaths - d0,
  };
}

describe("Bannmagie-XP-Rate (Retune D3, 27.08.2026)", () => {
  it("WARDING_XP_PER_ABSORB ist 1,0 (Faktor 4 gegenüber 0,25 — obere Kante der Chef-Spanne 3–4)", () => {
    expect(WARDING_XP_PER_ABSORB).toBe(1.0);
  });

  it("passiver Pfad (Offensiv-Haltung): Bannmagie-XP ist ein Nebeneinkommen von 5–50 % der Magie-XP", () => {
    const r = runBand("offensive", 30);
    expect(r.deaths).toBe(0);
    expect(r.magicPerH).toBeGreaterThan(50_000); // Beleg: es wurde wirklich gekämpft (L70-Band ≈ 125 k/h)
    const share = r.wardingPerH / r.magicPerH;
    // Gemessen 27.08.2026: ~16 k absorbiert/h → 16 k Bannmagie-XP/h bei 125 k Magie-XP/h ≈ 13 %.
    expect(share).toBeGreaterThan(0.05);
    expect(share).toBeLessThan(0.5);
  });

  it("Haltungs-Parität: Defensiv-Magie trainiert Bannmagie mit ≥ 80 % der Offensiv-Magie-Rate", () => {
    const off = runBand("offensive", 30);
    const def = runBand("defensive", 30);
    expect(def.magicPerH).toBe(0); // Defensiv routet 100 % auf Bannmagie
    // Gemessen 27.08.2026: 119 k (def, Bannmagie) vs. 125 k (off, Magie) ≈ 0,95 — der −15 %-Cast-
    // Schaden der Defensiv-Haltung (dmgMult 0.85) wird durch Kill-XP und Absorb teilweise aufgefangen.
    expect(def.wardingPerH / off.magicPerH).toBeGreaterThan(0.8);
    expect(def.wardingPerH / off.magicPerH).toBeLessThan(1.25);
  });
});
