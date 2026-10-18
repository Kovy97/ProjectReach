import { useEffect } from "react";
import { useGameControl } from "../game/GameContext";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";
import { formatNum } from "../util/format";
import { AshNotch } from "./AshNotch";
import { NpcSpeechBubble } from "./NpcGreeting";
import "../styles/prestige.css";

/**
 * claude:2026-10-18T14:00:00+02:00 — Erwachens-Text nach dem Aufstieg (lore/prestige-namen-1.3.md § 4.4, Sprecher: der
 * Wächter). Der Zustand lebt in GameContext (`ascendAwakening`) und überlebt den Remount des Spielbaums, den
 * `ascendRun` auslöst; die Asche-Überblendung (ScreenFade) liegt darüber und blendet auf diesen Text auf.
 * Schließen: Knopf oder Escape. Mountet nur, solange ein Erwachen offen ist.
 */
export function AscendAwakening(): JSX.Element | null {
  const { ascendAwakening, dismissAscendAwakening } = useGameControl();
  const { t } = useI18n();
  const open = ascendAwakening !== null;
  useEffect(() => {
    if (!open) return;
    return registerEscCloser("modal", dismissAscendAwakening);
  }, [open, dismissAscendAwakening]);
  if (!ascendAwakening) return null;
  return (
    <div className="modal-overlay prestige-awakening-overlay" role="dialog" aria-modal="true" aria-labelledby="prestige-awakening-title">
      <div className="modal prestige-awakening">
        <AshNotch count={ascendAwakening.count} className="ash-notch--large" />
        <h2 id="prestige-awakening-title" className="prestige-awakening-title">{t("prestige.awakening.title")}</h2>
        <NpcSpeechBubble name={t("npc.guide.name")} tail="none">{t("prestige.awakening.text")}</NpcSpeechBubble>
        <p className="prestige-awakening-gain">{t("prestige.awakening.gain").replace("{n}", formatNum(ascendAwakening.points))}</p>
        <button type="button" className="btn-iron" onClick={dismissAscendAwakening}>
          {t("prestige.awakening.button")}
        </button>
      </div>
    </div>
  );
}
