import type { CampBoostKind } from "@hearthforge/shared";
import { formatNum, formatPct1 } from "./format";

/**
 * New-Haven-Boost-Anzeigetext (Task #334, UI-Welle 2 „Boosts sichtbar"): reine
 * Präsentations-Formatierung für `CampBoostKind`-Werte, die die Engine (`campBoost`/
 * `campBoostCached`/`campShrineBonus`) bereits fertig ausgerechnet liefert — KEINE Spielrechnung
 * hier, nur Text. Ursprünglich lokal in NewHavenPage.tsx (`PERCENT_KINDS`/`formatBoostValue`/
 * `boostLine`); hierher extrahiert, weil ab Task #334 auch Bank/Skill-Karten/Slayer/Shop/Segen-
 * Panel/Offline-Bühne dieselbe Formatierung brauchen — EINE Quelle statt sechsfacher Kopie.
 */

/** Arten, deren `boost.value` ein ANTEIL (0..1) ist und als Prozent angezeigt wird. */
const CAMP_PERCENT_KINDS: readonly CampBoostKind[] = [
  "buildSpeed",
  "fishingSpeed",
  "woodcuttingSpeed",
  "miningSpeed",
  "farmingSpeed",
  "thievingSpeed",
  "craftSpeed",
  "slayerPoints",
  "blessing",
  "sellBonus",
];

/** Rohwert einer Wirkungs-Art menschenlesbar: Prozent, Stunden oder blanke Zahl. */
export function formatCampBoostValue(kind: CampBoostKind, value: number): string {
  if (CAMP_PERCENT_KINDS.includes(kind)) return `${formatPct1(value)} %`;
  if (kind === "offlineCapMs") return String(Math.round(value / 3_600_000));
  return formatNum(value);
}

/** Vollständige Wirkungs-Zeile („+4 Gebäudekapazität", „10 % schnelleres Handwerk", „40/h") —
 *  braucht `newhaven.boost.<kind>` (translations.ts + alle 5 Locale-Overlays). */
export function campBoostLine(kind: CampBoostKind, value: number, t: (key: string) => string): string {
  return t(`newhaven.boost.${kind}`).replace("{v}", formatCampBoostValue(kind, value));
}

/**
 * „Aus New Haven: {Wirkung}" — der EINE Aufschlüsselungs-Satz, den jede Wirkort-Seite außerhalb
 * von New Haven selbst an eine bereits sichtbare Zahl anhängt (Skill-Karten-Zeit, Bank-Kapazität,
 * Offline-Cap, Slayer-Punkte, Verkaufspreis, Segen-Verstärkung), damit der New-Haven-Anteil nicht
 * unsichtbar in der Gesamtzahl verschwindet. `value` ist IMMER ein roher Engine-Wert
 * (`campBoost`/`campBoostCached`/`campShrineBonus`), nie ein renderer-seitig nachgerechneter.
 */
export function campBoostNote(kind: CampBoostKind, value: number, t: (key: string) => string): string {
  return t("newhaven.boostNote").replace("{effect}", campBoostLine(kind, value, t));
}
