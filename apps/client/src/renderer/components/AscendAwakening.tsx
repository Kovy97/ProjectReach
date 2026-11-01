import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import { prestigeRunSummary } from "@hearthforge/engine";
import type { PrestigeRunSummary } from "@hearthforge/engine";
import { useGameControl, useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";
import { formatNum } from "../util/format";
import { AscendLedger } from "./AscendLedger";
import { AshNotch } from "./AshNotch";
import { NpcSpeechBubble } from "./NpcGreeting";
import "../styles/prestige.css";

/**
 * claude:2026-10-18T14:00:00+02:00 — Erwachens-Text nach dem Aufstieg (lore/prestige-namen-1.3.md § 4.4, Sprecher: der
 * Wächter). Der Zustand lebt in GameContext (`ascendAwakening`) und überlebt den Remount des Spielbaums, den
 * `ascendRun` auslöst; die Asche-Überblendung (ScreenFade) liegt darüber und blendet auf diesen Text auf.
 * Schließen: Knopf oder Escape. Mountet nur, solange ein Erwachen offen ist.
 */
// claude:2026-11-01T11:14:09+01:00 — NUR Dev-Server: Strg+Umschalt+Alt+C zeigt die Chronik des laufenden Durchgangs als
// Vorschau (prestigeRunSummary ist rein lesend, kein Aufstieg, kein Speichern). Im Steam-Build fällt der Zweig weg.
function DevLedgerPreview(): JSX.Element | null {
  const state = useGameState();
  const [summary, setSummary] = useState<PrestigeRunSummary | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.code === "KeyC") {
        e.preventDefault();
        setSummary((cur) => (cur ? null : prestigeRunSummary(state, content)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);
  if (!summary) return null;
  return (
    <div className="modal-overlay prestige-awakening-overlay prestige-bilanz-overlay" role="dialog" aria-modal="true" aria-labelledby="prestige-awakening-title">
      <div className="modal prestige-bilanz">
        <AscendLedger key={summary.run + ":" + summary.totalLevel} summary={summary} onContinue={() => setSummary(null)} />
      </div>
    </div>
  );
}

export function AscendAwakening(): JSX.Element | null {
  const { ascendAwakening, dismissAscendAwakening } = useGameControl();
  const { t } = useI18n();
  const open = ascendAwakening !== null;
  // claude:2026-10-18T20:30:00+02:00 — Zwei Phasen in EINEM Fenster (Welle E2): erst die Bilanz des Durchgangs
  // (AscendLedger, animiert), dann der Erwachens-Text des Wächters. Ein Fenster, weil beides derselbe Moment ist
  // (eine Überblendung, ein Escape-Eintrag, kein zweiter Overlay-Wechsel); ohne Bilanz beginnt es beim Erwachen.
  const [awake, setAwake] = useState(false);
  const showLedger = !!ascendAwakening?.summary && !awake;
  useEffect(() => {
    if (!open) {
      setAwake(false);
      return;
    }
    // Escape in der Bilanz-Phase: nur weiter, wenn die Animation durch ist (sonst fängt AscendLedger die Taste ab).
    return registerEscCloser("modal", () => (showLedger ? setAwake(true) : dismissAscendAwakening()));
  }, [open, showLedger, dismissAscendAwakening]);
  if (!ascendAwakening) return import.meta.env.DEV ? <DevLedgerPreview /> : null;
  if (showLedger && ascendAwakening.summary) {
    return (
      <div className="modal-overlay prestige-awakening-overlay prestige-bilanz-overlay" role="dialog" aria-modal="true" aria-labelledby="prestige-awakening-title">
        <div className="modal prestige-bilanz">
          <AscendLedger summary={ascendAwakening.summary} onContinue={() => setAwake(true)} />
        </div>
      </div>
    );
  }
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
