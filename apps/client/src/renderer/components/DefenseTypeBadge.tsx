import type { MonsterDefenseType } from "@hearthforge/shared";
import { useI18n } from "../i18n";
import { HoverTip } from "./CitadelTip";

/**
 * Rüstungs-Trinität-Badge (armor/evasion/ward) — welchen Verteidigungstyp dieser Gegner nutzt
 * (Welle KK, Fun-Retest Grete #4: "Ward-Kapazität/Defense-Typ der Wellen-Monster wird nirgends vor
 * dem Kampf ausgewiesen"; die `combat.defenseType.*`-Übersetzungen inkl. Konter-Beschreibung lagen
 * seit Welle CC unbenutzt in translations.ts — das Badge war geplant, aber nie verdrahtet). Jedes
 * Monster trägt laut Content-Integritätstest immer einen `defenseType` (armor-Boden als Fallback,
 * falls ein künftiger Content-Eintrag das Feld doch mal ausließe). Tooltip nennt den Konter
 * (Rüstungsdurchdringung/Präzision/Ward-Durchbruch) — die eigentliche Vorwarnung vor der Ward-Wand.
 *
 * Welle MM (Grete R3-Fund #7, "Badge fehlt genau dort, wo die Ward-Wand wohnt"): war bisher lokal
 * in CombatPage.tsx (nur auf der Zonen-/Turm-Auswahlkarte, `MonsterCard`) — extrahiert in eine
 * eigene Datei, damit BestiaryPage (Monsterkarten) und die Dungeon-Wellen-Vorschau (CombatPage
 * `Battle`, Encounter-Leiste) dasselbe Badge/dieselben Übersetzungen nutzen statt einer zweiten
 * Kopie.
 *
 * Tooltip-Vereinheitlichung (Chef-Auftrag 2026-07-23): war ein natives `title` (brach an `\n` um)
 * — jetzt das glowlose `.ct-tip` (components/CitadelTip.tsx), zwei echte Zeilen statt eines
 * manuellen Zeilenumbruchs.
 */
export function DefenseTypeBadge({ type }: { type: MonsterDefenseType | undefined }): JSX.Element {
  const { t } = useI18n();
  const kind = type ?? "armor";
  return (
    <HoverTip
      className={`monster-card-defense-badge mc-defense-${kind}`}
      content={
        <>
          <span className="ct-tip-desc">{t(`combat.defenseType.${kind}.desc`)}</span>
          {/* Chef-Entscheid (Spieler-Report "Hollow Choir: I miss 9/10"): Ward-Gegner nehmen +20%
              Schaden von Status-Effekten (Gift/Blutung/Feuer) — ein zweiter Konter-Hinweis NEBEN
              der Ward-Break-Zeile oben (andere Stat-Achse), daher als eigene Zeile angehängt. */}
          {kind === "ward" && <span className="ct-tip-desc">{t("combat.defenseType.ward.statusHint")}</span>}
        </>
      }
    >
      {t(`combat.defenseType.${kind}`)}
    </HoverTip>
  );
}
