import type { StatusType } from "@hearthforge/shared";

type TFn = (key: string) => string;

/**
 * Typspezifischer Vorbereitungs-Hinweis für Monster-Inflicts (Sweep6-T6):
 * `combat.inflictsHint` war gift-spezifisch („Antigift-Tonikum"), hing aber an
 * allen 5 Inflict-Typen. Jetzt `combat.inflictsHint.<type>` mit Fallback auf
 * den generischen Satz (i18n-Konvention: t() liefert den Key bei Fehltreffer).
 */
export function inflictHintFor(t: TFn, type: StatusType): string {
  const key = `combat.inflictsHint.${type}`;
  const v = t(key);
  return v === key ? t("combat.inflictsHint") : v;
}
