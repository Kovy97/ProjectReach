import { useState } from "react";
import { content } from "@hearthforge/content";
import { prestigeRecallAvailable, prestigeRecallableChapters, prestigeRecallChronicle } from "@hearthforge/engine";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum } from "../util/format";
import "../styles/prestige.css";

/**
 * claude:2026-10-18T14:00:00+02:00 — „Bekannte Seiten" (Narbenbuch-Knoten Erinnerung, Prestige „Der Aschesturz"):
 * Leiste oben im Chronik-Reiter. Erscheint nur, wenn der Knoten gekauft ist; ein Klick schließt alle erlebten
 * Kapitel (1 bis 18) der Reihe nach ab und meldet Kapitelzahl und Gold (halbes Gold, keine Marken oder Gegenstände).
 * Alle Zahlen und Regeln kommen aus `engine/prestige.ts` (`prestigeRecall*`); hier wird nur angezeigt.
 */
export function PrestigeRecallBar(): JSX.Element | null {
  const state = useGameState();
  const { t } = useI18n();
  const [done, setDone] = useState<{ chapters: number; gold: number } | null>(null);
  if (!prestigeRecallAvailable(state, content)) return null;
  const open = prestigeRecallableChapters(state, content);

  return (
    <div className="prestige-recall" role="group" aria-label={t("prestige.recall.title")}>
      <div className="prestige-recall-text">
        <span className="prestige-recall-title">{t("prestige.recall.title")}</span>
        <span className="prestige-recall-hint muted">
          {open.length > 0
            ? t("prestige.recall.hint").replace("{n}", String(open.length))
            : t("prestige.recall.none")}
        </span>
        {done && done.chapters > 0 && (
          <span className="prestige-recall-done" role="status">
            {t("prestige.recall.done")
              .replace("{n}", String(done.chapters))
              .replace("{gold}", formatNum(done.gold))}
          </span>
        )}
      </div>
      <button
        type="button"
        className="btn-iron btn-iron--sm"
        disabled={open.length === 0}
        onClick={() => {
          const res = prestigeRecallChronicle(state, content);
          setDone({ chapters: res.chapters.length, gold: res.gold });
        }}
      >
        {t("prestige.recall.button")}
      </button>
    </div>
  );
}
