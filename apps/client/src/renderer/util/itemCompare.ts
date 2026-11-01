import { content } from "@hearthforge/content";
import type { EquipBonus, ItemDef, ItemInstance } from "@hearthforge/shared";
import { instanceBonusDelta } from "@hearthforge/shared";

// claude:2026-10-31T16:34:28+01:00 — aus components/ItemTooltip.tsx ausgelagert (Wortlaut unverändert), damit Tooltip-Deltas und der
// Aufwertungs-Marker ▲ (util/upgradeMarker.ts) dieselbe Vergleichsrechnung nutzen.

/** EquipBonus-Felder, die im Vergleich berücksichtigt werden (Waffen-/Rüstungs-Stats). */
const BONUS_COMPARE_KEYS: (keyof EquipBonus)[] = [
  "meleeDamage",
  "rangedDamage",
  "magicDamage",
  "defense",
  "accuracy",
  "evasion",
  "maxHp",
  "hpRegenPerSec",
  "maxMana",
  "critChance",
  "critDamage",
  "attackIntervalMs",
  // Spieler-Report 30.08.2026 (L1GR): fehlte hier, darum trug die Lebensraub-Zeile kein Vergleichs-Delta.
  "lifesteal",
];

/** Attribut-Modifier-Keys werden als `mod:<attr>` geführt, Skill-Boosts als `boost:<skillId>`. */
export function modKey(attr: string): string {
  return `mod:${attr}`;
}
export function boostKey(skillId: string): string {
  return `boost:${skillId}`;
}

/** `attackIntervalMs`: NIEDRIGER ist besser (schnellerer Angriff) — alle anderen Keys: höher = besser. */

/**
 * Aggregierte Vergleichswerte eines Items + seiner Instanz (Affixe + Suffix via
 * `instanceBonusDelta`) für den Shift-Compare: Basis-`bonus`/`modifiers`/`skillBoost` plus
 * Instanz-Deltas, summiert je Key. Reine Funktion, kein Rendering.
 */
export function buildCompareMap(item: ItemDef, inst: ItemInstance | undefined): Record<string, number> {
  const map: Record<string, number> = {};
  const addBonus = (b: EquipBonus | undefined): void => {
    if (!b) return;
    for (const k of BONUS_COMPARE_KEYS) if (b[k]) map[k] = (map[k] ?? 0) + (b[k] ?? 0);
  };
  addBonus(item.bonus);
  // Rüstungs-Trinität (Itemization 2.5): armorRating/evasionRating/wardCapacity/blockChance leben
  // direkt auf ItemDef (NICHT in EquipBonus, nie auf Affixen/Suffixen — s. shared/index.ts JSDoc),
  // also separat aus dem Item selbst statt über addBonus/instanceBonusDelta aggregiert.
  if (item.armorRating) map.armorRating = (map.armorRating ?? 0) + item.armorRating;
  if (item.evasionRating) map.evasionRating = (map.evasionRating ?? 0) + item.evasionRating;
  if (item.wardCapacity) map.wardCapacity = (map.wardCapacity ?? 0) + item.wardCapacity;
  if (item.blockChance) map.blockChance = (map.blockChance ?? 0) + item.blockChance;
  // Combat-Depth Konter-Play-Signaturen (§3.3): dieselbe Behandlung wie die Trinity-Felder oben —
  // leben direkt auf ItemDef, nicht in `bonus`.
  if (item.armorPen) map.armorPen = (map.armorPen ?? 0) + item.armorPen;
  if (item.precision) map.precision = (map.precision ?? 0) + item.precision;
  if (item.wardBreak) map.wardBreak = (map.wardBreak ?? 0) + item.wardBreak;
  if (item.modifiers) {
    for (const [attr, v] of Object.entries(item.modifiers)) {
      if (v) map[modKey(attr)] = (map[modKey(attr)] ?? 0) + v;
    }
  }
  if (item.skillBoost) {
    for (const [id, v] of Object.entries(item.skillBoost)) {
      if (v) map[boostKey(id)] = (map[boostKey(id)] ?? 0) + v;
    }
  }
  if (inst) {
    const delta = instanceBonusDelta(inst, content);
    addBonus(delta.bonus);
    for (const [attr, v] of Object.entries(delta.modifiers)) {
      if (v) map[modKey(attr)] = (map[modKey(attr)] ?? 0) + v;
    }
    for (const [id, v] of Object.entries(delta.skillBoost)) {
      if (v) map[boostKey(id)] = (map[boostKey(id)] ?? 0) + v;
    }
  }
  return map;
}

/**
 * Effektive Schadensspanne + Tempo + DPS einer Range-Form-Waffe (Basis-Item + Instanz-Affix/Suffix-
 * Delta) — dieselbe Formel wie OffenseGroups Kopfblock (unten), hier als reine Funktion ausgelagert,
 * damit die ▲/▼-Deltas dieselbe Rechnung für das VERGLICHENE Item (Baseline) nutzen können, ohne sie
 * zu duplizieren. `null` für Nicht-Range-Form-Waffen (kein damageMin/damageMax) — dann bleibt die
 * Schaden-/DPS-Zeile ohne Delta (kein sinnvoller Vergleich, z.B. Legacy-Flat-Waffe gegen Range-Form).
 */
export function weaponRangeStats(
  item: ItemDef,
  inst: ItemInstance | undefined,
): { min: number; max: number; dps: number } | null {
  if (item.damageMin === undefined || item.damageMax === undefined) return null;
  const delta = inst ? instanceBonusDelta(inst, content).bonus : undefined;
  const styleKey: keyof EquipBonus =
    item.weaponStyle === "ranged" ? "rangedDamage" : item.weaponStyle === "magic" ? "magicDamage" : "meleeDamage";
  const dmgDelta = delta?.[styleKey] ?? 0;
  const spdDelta = delta?.attackIntervalMs ?? 0;
  const min = Math.max(0, item.damageMin + dmgDelta);
  const max = Math.max(min, item.damageMax + dmgDelta);
  const baseTempoMs = item.attackIntervalMs ?? 3000;
  const tempoMs = Math.max(100, baseTempoMs + spdDelta);
  const dps = (min + max) / 2 / (tempoMs / 1000);
  return { min, max, dps };
}

