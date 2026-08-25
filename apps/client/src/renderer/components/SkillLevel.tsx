import { BOOSTABLE_COMBAT_SKILL_IDS } from "@hearthforge/shared";
import type { BoostableCombatSkillId, SkillBoostMap, SkillId } from "@hearthforge/shared";

const BOOSTABLE_SET = new Set<string>(BOOSTABLE_COMBAT_SKILL_IDS);

/**
 * Σ Skill-Level-Boost für eine Skill-ID aus `DerivedStats.skillBoosts` (Itemization 2.0 §4.5).
 * Liefert 0 für alle nicht-boostbaren Skills (vitality + alle Sammel-/Handwerks-Fertigkeiten) —
 * sicher für JEDE SkillId aufrufbar, kein Cast/Guard beim Call-Site nötig.
 */
export function skillBoostFor(boosts: SkillBoostMap, id: SkillId): number {
  return BOOSTABLE_SET.has(id) ? (boosts[id as BoostableCombatSkillId] ?? 0) : 0;
}

/**
 * Geboostetes Kampf-Skill-Level im OSRS-Stil (Itemization 2.0 §4.5): „42" bzw. „42/99" plus ein
 * dezentes goldgrünes „(+2)", wenn Ausrüstung/Sets/Suffixe das EFFEKTIVE Level heben. `max` optional
 * — fehlt er, wird nur die nackte Zahl gerendert (Combat-Loadout-Leiste), mit `max` „lvl/max"
 * (Sidebar/Skills-Übersicht-Stil). Der XP-Balken/Fortschritt bleibt überall auf dem BASIS-Level
 * (`base`) — diese Komponente ändert NUR die angezeigte Zahl, nie eine XP-/Level-Berechnung
 * (Anti-Exploit-Grundsatz aus §4.2: Boost schaltet nichts frei und beschleunigt kein XP).
 */
export function SkillLevelText({
  base,
  boost,
  max,
}: {
  base: number;
  boost: number;
  max?: number;
}): JSX.Element {
  const baseText = max !== undefined ? `${base}/${max}` : `${base}`;
  if (boost <= 0) return <>{baseText}</>;
  // Chef-Test 25.08.2026: "in der Sidebar sowie bei Style sollte beim Level der Skills das Original-
  // Level stehen und dann in grünen Klammern das geboostete Level." Vorher stand das geboostete
  // Level vorn und "(+3)" dahinter; wer nur kurz hinsah, hielt den Trank-Bonus für sein echtes Level.
  // Jetzt: echtes Level zuerst, der geboostete Wert in Grün dahinter, z.B. "40/99 (43)".
  return (
    <span className="skill-boost-value">
      {baseText}
      <span className="skill-boost-tag">{` (${base + boost})`}</span>
    </span>
  );
}
