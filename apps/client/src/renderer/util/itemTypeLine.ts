import type { ItemDef, LocalizedString } from "@hearthforge/shared";
import { EQUIP_SLOT_LABELS } from "@hearthforge/shared";

/** Derives the localised type subtitle from item fields. */
export function buildItemTypeLine(
  item: ItemDef,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string {
  // Specific weapon type takes priority — each of the 16 types has its own i18n key.
  // claude:2026-10-23T17:30:00+02:00 — 1.4.0 ZH: Haupthand-Waffen tragen die Hand-Angabe aus `twoHanded`
  // („Zweihändig · Langbogen“). Vorher stand sie nur in einigen Spezialitätstexten und fehlte bei Bögen.
  if (item.weaponType) {
    const type = t(`item.weaponType.${item.weaponType}`);
    if (item.slot !== "mainhand") return type;
    const hand = item.twoHanded ? t("itip.twoHandedPrefix") : t("itip.oneHandedPrefix");
    return `${hand} · ${type}`;
  }
  // Weapons without a weaponType yet: fall back to the old style label.
  if (item.weaponStyle) {
    const hand = item.twoHanded ? t("itip.twoHandedPrefix") : t("itip.oneHandedPrefix");
    const style = t(`itip.weaponStyle.${item.weaponStyle}`);
    return `${hand} ${style}`;
  }
  if (item.slot) {
    return tr(EQUIP_SLOT_LABELS[item.slot]);
  }
  return t(`item.type.${item.type}`);
}
