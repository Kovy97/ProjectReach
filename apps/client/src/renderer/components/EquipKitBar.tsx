import { useState } from "react";
import { content } from "@hearthforge/content";
import { EQUIP_KIT_COUNT, kitSummary, switchEquipKit } from "../kitsApi";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { playSfx } from "../util/audio";
import { hasSeenKitHint, setSeenKitHint } from "../util/onboarding";
import { HoverTip } from "./CitadelTip";
import { gameAlert } from "./GameAlert";

/**
 * Ausrüstungs-Kits 1/2/3 (Chef-Entscheid 28.08.2026: löst die alten Speichern/Anlegen-Loadouts
 * ab — jedes Kit TRÄGT von nun an eigene Items direkt, Umschalten tauscht das GANZE Set).
 * Kompakte Knopf-Reihe oben im Equipment-Tab des Character-Screens, über der Ausrüstungspuppe.
 *
 * BEDIENKONZEPT: drei Standard-Stahlrahmen-Knöpfe (`.btn-iron--sm`, „Kit 1/2/3"), das aktive
 * trägt `.is-active`. KEIN Speichern/Anlegen mehr — Anlegen/Ablegen auf der Puppe wirkt direkt
 * auf das gerade aktive Kit. Umschalten ist NUR außerhalb des Kampfes erlaubt: im Kampf sind
 * alle drei Knöpfe deaktiviert, das HoverTip erklärt warum. Außerhalb des Kampfes zeigt das
 * HoverTip eines INAKTIVEN Kits Stückzahl + die wichtigsten Teile (Waffe/Rüstung), s.
 * `kitSummary` in kitsApi.ts.
 *
 * Die Logik lebt in packages/engine/src/loadouts.ts (switchEquipKit/kitSummary), hier nur über
 * das Re-Export-Modul kitsApi.ts eingebunden. Re-Render nach dem Wechsel kommt wie bei jedem
 * Equip-Klick über den nächsten Game-Tick (GameContext), keine eigene State-Bindung nötig.
 */
export function EquipKitBar(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const inCombat = state.combat.monsterId !== null;
  const active = state.activeKit;
  // Lazy-State: NUR beim allerersten Mount (dieser Öffnung) prüfen, ob der Hinweis noch nie
  // gezeigt wurde — direkt danach als „gesehen" vermerken, damit er beim nächsten Öffnen der
  // Seite verschwindet (kein Onboarding-Flow, kein Schließen-Knopf nötig).
  const [showHint] = useState(() => {
    const unseen = !hasSeenKitHint();
    if (unseen) setSeenKitHint();
    return unseen;
  });

  const onSwitch = (i: number): void => {
    const res = switchEquipKit(state, content, i);
    if (res === "ok") {
      playSfx("equip");
    } else if (res === "in_combat") {
      // Defensive: die Knöpfe sind im Kampf disabled, dieser Zweig greift praktisch nie.
      gameAlert("kit.tip.locked");
    }
  };

  return (
    <div className="eq-kit-bar">
      <div className="eq-kit-row" role="group" aria-label={t("kit.aria")}>
        {Array.from({ length: EQUIP_KIT_COUNT }, (_, i) => {
          const isActive = i === active;
          const label = t("kit.label").replace("{n}", String(i + 1));

          let tipContent: JSX.Element;
          if (inCombat) {
            tipContent = <span className="ct-tip-desc">{t("kit.tip.locked")}</span>;
          } else if (isActive) {
            tipContent = (
              <>
                <span className="ct-tip-title">{label}</span>
                <span className="ct-tip-desc">{t("kit.tip.activeNote")}</span>
              </>
            );
          } else {
            const summary = kitSummary(state, i);
            const weaponId = summary.equipment.mainhand;
            const armorId = summary.equipment.body;
            const weaponItem = weaponId ? content.items[weaponId] : undefined;
            const armorItem = armorId ? content.items[armorId] : undefined;
            tipContent = (
              <>
                <span className="ct-tip-title">{label}</span>
                {summary.pieces > 0 ? (
                  <>
                    <span className="ct-tip-desc">
                      {t("kit.pieces").replace("{n}", String(summary.pieces))}
                    </span>
                    {weaponItem && (
                      <span className="ct-tip-desc">
                        {t("kit.tip.weapon").replace("{name}", tr(weaponItem.name))}
                      </span>
                    )}
                    {armorItem && (
                      <span className="ct-tip-desc">
                        {t("kit.tip.armor").replace("{name}", tr(armorItem.name))}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="ct-tip-desc">{t("kit.tip.empty")}</span>
                )}
                <span className="ct-tip-desc">{t("kit.tip.switch")}</span>
              </>
            );
          }

          return (
            <HoverTip key={i} as="div" focusable={false} className="eq-kit-tipwrap" content={tipContent}>
              <button
                type="button"
                className={`btn-iron btn-iron--sm eq-kit-btn${isActive ? " is-active" : ""}`}
                disabled={inCombat}
                aria-label={label}
                aria-pressed={isActive}
                onClick={() => onSwitch(i)}
              >
                {label}
              </button>
            </HoverTip>
          );
        })}
      </div>
      {showHint && <p className="eq-kit-hint muted">{t("kit.hint")}</p>}
    </div>
  );
}
