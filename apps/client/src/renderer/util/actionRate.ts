import type { ActionDef, ContentDB, GameState } from "@hearthforge/shared";
import { DEFAULT_STUN_MS, THIEVING_SUCCESS_CAP, actionSuccessChance, thievingRiskMods } from "@hearthforge/shared";
import {
  buffGatherXpMult,
  buffGatherYieldBonus,
  effectiveActionDurationMs,
  levelFromXp,
  masterAlwaysSucceeds,
  masterSuccessBonus,
  masteryBonusChance,
  masteryPoolBonus,
  petDoubleYieldBonus,
  petInstantActionChance,
  petThievingBonus,
} from "@hearthforge/engine";

const HOUR_MS = 3_600_000;

export interface ActionRate {
  /** Ø ms je Versuch — bei Thieving inkl. der (erwarteten) Betäubungs-Downtime bei Fehlschlägen. */
  avgDurationMs: number;
  /** Erwartete XP/h dieser Aktion — Werkzeug-Tempo, Mastery, Mastery-Pool, Pet, Buffs UND (bei
   *  Thieving) Erfolgschance/Risiko-Modus sind eingerechnet. */
  xpPerHour: number;
  /** Doppelertrag-Gesamtchance (Mastery-Aktion + Mastery-Pool + Pet + Buff), 0..~1. */
  bonusChance: number;
  /** Erfolgschance (1 für Nicht-Thieving-Aktionen; sonst inkl. Pet-/Risiko-Bonus). */
  successChance: number;
  /** Belohnungs-Multiplikator des Thieving-Risiko-Modus (1 außerhalb Thieving). */
  rewardMult: number;
  /** Ertrag/h des primären Loot-Slots (`action.loot[0]`), oder `null` ohne Loot. */
  primaryItemPerHour: { itemId: string; perHour: number } | null;
  /** Nur bei Thieving-Aktionen (`action.successBase !== undefined`) gesetzt: Zerlegung der
   *  `successChance` in ihre Bestandteile — für den Karten-Tooltip (Task #331, Chef-/Spieler-
   *  Verwirrung "Beggar zeigt 50 % Loot, aber Erfolg ist eine SEPARATE vorgelagerte Chance").
   *  `null` für alle anderen Aktionen (successChance ist dort konstant 1, nichts zu erklären). */
  successBreakdown: ThievingSuccessBreakdown | null;
}

export interface ThievingSuccessBreakdown {
  /** `action.successBase`, 0..1. */
  base: number;
  /** Bonus durch Skill-Level über dem Level-Requirement (`successPerLevel × Level-Diff`), 0..1. */
  levelBonus: number;
  /** Additiver Pet-Passiv-Bonus (`petThievingBonus`), 0..1. */
  petBonus: number;
  /** Additiver Bonus/Malus des Risiko-Modus careful/bold (`thievingRiskMods`), -1..1. */
  riskBonus: number;
  /** Additiver Meisterring-Bonus (`masterSuccessBonus`, Shadowgrasp-Erbe), 0..1. */
  capeBonus: number;
  /** Obergrenze der Erfolgschance (`THIEVING_SUCCESS_CAP`) — irrelevant, wenn `alwaysSucceed`. */
  cap: number;
  /** Meisterring-Perk `alwaysSucceed` (Soulchef-Hommage): Erfolg ist exakt 1, der Cap greift
   *  bewusst NICHT (s. tick.ts `masterAlwaysSucceeds`). */
  alwaysSucceed: boolean;
}

/**
 * Erwartungswert-Rate einer Aktion — EINE Formel für die Titelleiste (ActionProgressBar), die
 * Skill-XP-Leisten-ETA (LevelXpBar) UND die Skillkarten (SkillPage): komponiert ausschließlich aus
 * bereits exportierten Engine-Bausteinen (`effectiveActionDurationMs`, `buffGatherXpMult`/
 * `buffGatherYieldBonus`, `masteryBonusChance`, `masteryPoolBonus`, `pet*Bonus`,
 * `actionSuccessChance`/`thievingRiskMods`/`masterSuccessBonus`/`masterAlwaysSucceeds`) — denselben,
 * die `tick.ts` beim tatsächlichen Abschluss verwendet (s. `completeAction`). Der Renderer baut hier
 * KEINE eigene Duration-/Erfolgs-/Bonus-Logik nach, sondern rechnet nur den Erwartungswert
 * (Zufallsprozess → Mittelwert) aus den exportierten Bausteinen zusammen — reine
 * Präsentations-Arithmetik, keine Spiellogik.
 */
export function computeActionRate(state: GameState, content: ContentDB, action: ActionDef): ActionRate {
  const effDurationMs = effectiveActionDurationMs(state, content, action);
  const buffXpMult = buffGatherXpMult(state, content);
  const pool = masteryPoolBonus(state, content, action.skill);
  const isThief = action.successBase !== undefined;
  const risk = action.skill === "thieving" ? thievingRiskMods(state.thievingRisk) : null;
  const rewardMult = risk?.rewardMult ?? 1;

  let successChance = 1;
  let avgDurationMs = effDurationMs;
  let successBreakdown: ThievingSuccessBreakdown | null = null;
  if (isThief) {
    const level = levelFromXp(state.skills[action.skill]?.xp ?? 0);
    // Task #331: petBonus/riskBonus/capeBonus einzeln behalten (statt sofort zu summieren) — der
    // Karten-Tooltip zerlegt sie wieder. Reihenfolge/Quellen exakt wie tick.ts `completeAction`.
    const petBonus = petThievingBonus(state, content, action.skill);
    const riskBonus = risk?.successBonus ?? 0;
    const capeBonus = masterSuccessBonus(state, content, action.skill);
    const successBonus = petBonus + riskBonus + capeBonus;
    const alwaysSucceed = masterAlwaysSucceeds(state, content, action.skill);
    successChance = alwaysSucceed ? 1 : actionSuccessChance(action, level, successBonus);
    const req = action.levelRequired ?? 1;
    successBreakdown = {
      base: action.successBase ?? 0,
      levelBonus: (action.successPerLevel ?? 0) * Math.max(0, level - req),
      petBonus,
      riskBonus,
      capeBonus,
      cap: THIEVING_SUCCESS_CAP,
      alwaysSucceed,
    };
    // Ein Fehlschlag verbraucht dieselbe Aktionszeit (die Engine würfelt den Erfolg erst NACH dem
    // Zeitablauf, s. tick.ts completeAction), zusätzlich betäubt er — im Mittel also effDurationMs
    // plus (Fehlschlagchance × erwartete Betäubungsdauer).
    const stunMs = (action.stunMs ?? DEFAULT_STUN_MS) * (risk?.stunMult ?? 1);
    avgDurationMs = effDurationMs + (1 - successChance) * stunMs;
  }

  const xpPerAttempt = action.xp * buffXpMult * rewardMult * successChance;
  const xpPerHour = avgDurationMs > 0 ? xpPerAttempt * (HOUR_MS / avgDurationMs) : 0;

  // Doppelertrag-Gesamtchance — exakt wie tick.ts `completeAction` (`bonusChance`): Mastery-Aktion
  // + Mastery-Pool + Pet (Doppel/Instant) + Buff. Pool-Preserve wird bei inputlosen Sammel-Aktionen
  // zusätzlich zu Doppelertrag umgewidmet (dieselbe Engine-Regel wie `gatherPoolPreserveAsDouble`).
  const gatherPoolPreserveAsDouble = action.inputs ? 0 : pool.preserve;
  const bonusChance =
    masteryBonusChance(state, action.id)
    + pool.double
    + petDoubleYieldBonus(state, content, action.skill)
    + petInstantActionChance(state, content, action.skill)
    + buffGatherYieldBonus(state, content)
    + gatherPoolPreserveAsDouble;

  const roll = action.loot[0];
  let primaryItemPerHour: ActionRate["primaryItemPerHour"] = null;
  if (roll) {
    const avgQty = ((roll.min + roll.max) / 2) * roll.chance * (1 + bonusChance);
    const scaled = rewardMult !== 1 ? avgQty * rewardMult : avgQty; // Thieving-Risiko skaliert die Menge
    const ev = successChance * scaled; // Thieving: Beute nur bei Erfolg
    primaryItemPerHour = {
      itemId: roll.itemId,
      perHour: avgDurationMs > 0 ? Math.round(ev * (HOUR_MS / avgDurationMs)) : 0,
    };
  }

  return { avgDurationMs, xpPerHour, bonusChance, successChance, rewardMult, primaryItemPerHour, successBreakdown };
}

/**
 * Kompakte ETA-Formatierung, z.B. "2 h 14 min" / "48 min" / "< 1 min" (Chef-Vorgabe, exaktes
 * Format). Reine Darstellungs-Funktion (kein Spielwert) — `t` liefert die (7-sprachigen)
 * Bausteine `skill.eta.hoursMin` / `skill.eta.min` / `skill.eta.lessThanMin`.
 */
export function formatEta(ms: number, t: (key: string) => string): string {
  if (ms < 60_000) return t("skill.eta.lessThanMin");
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) {
    return t("skill.eta.hoursMin").replace("{h}", String(h)).replace("{m}", String(m));
  }
  return t("skill.eta.min").replace("{m}", String(m));
}
