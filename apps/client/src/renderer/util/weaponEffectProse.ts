import type { WeaponEffect } from "@hearthforge/shared";
import { formatSeconds1, formatStat } from "./format";

type TFn = (key: string) => string;

/** Rounds a 0..1 fraction to a whole-number percent string, e.g. 0.22 → "22". */
function pct(v: number): string {
  return String(Math.round(v * 100));
}

/**
 * Formats a duration in ms as seconds, exactly 1 decimal (Chef #239: Sekunden behalten die
 * Nachkommastelle, auch nachdem `formatStat` selbst auf Ganzzahl-Rundung für Flat-Stats umgestellt
 * wurde — daher hier bewusst `formatSeconds1` statt `formatStat`).
 */
function secs(ms: number): string {
  return formatSeconds1(ms / 1000);
}

/**
 * WoW-Stil-Fließtext für EINEN Waffeneffekt — Basis-Effekt (item.weaponEffect/weaponEffects) ODER
 * Enchant-Proc (AffixDef.weaponEffectByTier) — Waffen 2.0 UI-Vertrag
 * (design/itemization-parity-fix.md §7.2). Gemeinsamer Helper für ItemTooltip UND die
 * EnchantingPage-Vorschau, damit beide Stellen exakt denselben Satz zeigen.
 *
 * Jeder `WeaponEffectType` (5 klassische Status + 27 Waffen-2.0-Spezial-Kinds, Feld-Semantik siehe
 * JSDoc an `SpecialEffectType` in packages/shared) hat sein eigenes i18n-Template unter
 * `weaponEffect.<kind>` (en+de, translations.ts). Platzhalter im Template:
 *   {chance}    — effect.chance als gerundeter Prozentwert (0.22 → "22")
 *   {magnitude} — effect.magnitude als gerundeter Prozentwert (Anteils-Boni, DoT-%/s-Chancen …)
 *   {flat}      — effect.magnitude als Rohwert (formatStat, 1 Dezimale) — FLAT-Effekte (Mana/HP/Schaden)
 *   {threshold} — effect.threshold als gerundeter Prozentwert
 *   {stacks}    — effect.stacks als Ganzzahl
 *   {duration}  — effect.durationMs in Sekunden (formatStat, 1 Dezimale)
 *   {family}    — effect.targetFamily lokalisiert via `monsterFamily.<family>` (bane, Sweep6-T6)
 * Unbekannte/fehlende Kinds fallen auf `weaponEffect.fallback` zurück — NIE Rohdaten anzeigen.
 */
export function weaponEffectProse(effect: WeaponEffect, t: TFn): string {
  const key = `weaponEffect.${effect.type}`;
  const template = t(key);
  // t() liefert den Key selbst zurück, wenn er in translations.ts fehlt (i18n-Fallback-Konvention,
  // s. useI18n) — dann auf den generischen Fallback-Text ausweichen.
  const raw = template === key ? t("weaponEffect.fallback") : template;
  const familyKey = `monsterFamily.${effect.targetFamily ?? ""}`;
  const familyLabel = effect.targetFamily ? t(familyKey) : "";
  return raw
    .replace(/\{chance\}/g, pct(effect.chance))
    .replace(/\{magnitude\}/g, pct(effect.magnitude))
    .replace(/\{flat\}/g, formatStat(effect.magnitude))
    .replace(/\{threshold\}/g, pct(effect.threshold ?? 0))
    .replace(/\{stacks\}/g, String(effect.stacks ?? 0))
    .replace(/\{duration\}/g, secs(effect.durationMs))
    // Fallback: fehlt der Familien-Key, lieber die rohe Familien-Id als den Key anzeigen.
    .replace(/\{family\}/g, familyLabel === familyKey ? (effect.targetFamily ?? "") : familyLabel);
}
