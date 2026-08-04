import {
  MASTERY_POOL_CHECKPOINT_BONUS,
  masteryDoubleChance,
  masteryPreserveChance,
  masterySpeedMult,
} from "@hearthforge/shared";

/**
 * Welle EE (Moment-Paket A, Mona M1+M2+M3): kosmetische Rang-Stufen für die Aktions-Mastery.
 * BEWUSST reine Optik — keine neuen Zahlen-Boni (die per-Level-Kurve in shared/index.ts bleibt
 * unangetastet, s. Chef-Auftrag "Balance gehört in P3-Block"). Dieselben fünf Stufen tragen
 * sowohl den Rang-Stern an der Aktionskarte (M3) als auch den "größer gefeiert"-Schwellwert für
 * Mastery-Level-Up-Toasts (M1) und das "nächster Rang"-Ziel auf der Mastery-Seite (M2) — EINE
 * Quelle für alle drei Momente.
 */
export const MASTERY_RANK_LEVELS = [10, 25, 50, 75, 99] as const;

export type MasteryRankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

const RANK_TIER_BY_LEVEL: Record<(typeof MASTERY_RANK_LEVELS)[number], MasteryRankTier> = {
  10: "bronze",
  25: "silver",
  50: "gold",
  75: "platinum",
  99: "diamond",
};

/** Höchster erreichter Rang (oder `null` unter Stufe 10). Reine Funktion von `level`. */
export function masteryRankTier(level: number): MasteryRankTier | null {
  let tier: MasteryRankTier | null = null;
  for (const l of MASTERY_RANK_LEVELS) {
    if (level >= l) tier = RANK_TIER_BY_LEVEL[l];
  }
  return tier;
}

/** Der i18n-Key-Suffix für den Rang-Namen ("mastery.rank." + dies), s. translations.ts. */
export function masteryRankKey(tier: MasteryRankTier): string {
  return `mastery.rank.${tier}`;
}

/** Nächste Rang-Schwelle über `level` hinaus, oder `null` (bereits auf/über der letzten Stufe). */
export function nextMasteryRank(level: number): (typeof MASTERY_RANK_LEVELS)[number] | null {
  for (const l of MASTERY_RANK_LEVELS) {
    if (l > level) return l;
  }
  return null;
}

/** Höchste Rang-Schwelle, die zwischen `from` (exklusiv) und `to` (inklusiv) überschritten wurde. */
export function highestRankCrossed(from: number, to: number): (typeof MASTERY_RANK_LEVELS)[number] | null {
  let hit: (typeof MASTERY_RANK_LEVELS)[number] | null = null;
  for (const l of MASTERY_RANK_LEVELS) {
    if (l > from && l <= to) hit = l;
  }
  return hit;
}

/**
 * Kompakte, lesbare Bonus-Zeile bei gegebenem Mastery-Level (dieselben drei Formeln wie die
 * bestehenden Aktions-/Skillkarten-Chips: Doppelertrag/Tempo/Preservation), z.B. "+12% double
 * yield · -7% speed". Für die "nächster Rang"-Vorschau (M2) — zeigt, was der NÄCHSTE Rang bringt,
 * ohne die Formel zu duplizieren (liest dieselben shared-Exporte wie mastery.ts).
 */
export function masteryBonusLineAt(
  level: number,
  hasInputs: boolean,
  t: (key: string) => string,
): string {
  const parts: string[] = [];
  const double = Math.round(masteryDoubleChance(level) * 100);
  const speed = Math.round((1 - masterySpeedMult(level)) * 100);
  const preserve = hasInputs ? Math.round(masteryPreserveChance(level) * 100) : 0;
  if (double > 0) parts.push(t("mastery.bonus.line").replace("{pct}", String(double)).replace("{name}", t("mastery.bonus.double")));
  if (speed > 0) parts.push(t("mastery.bonus.line").replace("{pct}", String(speed)).replace("{name}", t("mastery.bonus.speed")));
  if (preserve > 0) parts.push(t("mastery.bonus.line").replace("{pct}", String(preserve)).replace("{name}", t("mastery.bonus.preserve")));
  return parts.join(" · ");
}

/** Skillweite Pool-Checkpoint-Bonuszeile (5/25/50/95 %), z.B. "+4% speed". Für Toast + Hover-Hint. */
export function poolCheckpointBonusLine(threshold: number, t: (key: string) => string): string {
  const bonus = MASTERY_POOL_CHECKPOINT_BONUS[threshold];
  if (!bonus) return "";
  const parts: string[] = [];
  if (bonus.double > 0) parts.push(t("mastery.bonus.line").replace("{pct}", String(Math.round(bonus.double * 100))).replace("{name}", t("mastery.bonus.double")));
  if (bonus.speed > 0) parts.push(t("mastery.bonus.line").replace("{pct}", String(Math.round(bonus.speed * 100))).replace("{name}", t("mastery.bonus.speed")));
  if (bonus.preserve > 0) parts.push(t("mastery.bonus.line").replace("{pct}", String(Math.round(bonus.preserve * 100))).replace("{name}", t("mastery.bonus.preserve")));
  return parts.join(" · ");
}
