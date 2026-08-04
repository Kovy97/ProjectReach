import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import { earnedAP, totalAP } from "@hearthforge/shared";
import { useGameControl, useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getSidebarIcon } from "../sidebarIcons";
import { playSfx } from "../util/audio";
import { formatNum } from "../util/format";
import { hasOpenModal, registerEscCloser } from "../util/escStack";
import "../styles/mastery-ceremony.css";

const ACHIEVEMENTS_ICON_URL = getSidebarIcon("achievements");

/** Muss zur `mwc-card-out`-Keyframe-Dauer (mastery-ceremony.css) passen — s. MasteryCeremony.tsx. */
const EXIT_MS = 420;

/**
 * AP-Meilenstein-Vollendungs-Zeremonie (Welle GG → UI, SAVE 66, Fun-Sweep Programm Welle II §1):
 * würdiger Vollbild-Moment, wenn die Gesamt-AP-Quote (earnedAP/totalAP) den letzten 5-%-Schritt
 * (100 %) erreicht — `state.apCeremonyPending` ist das persistente Zeremonie-Flag (übersteht
 * Reload bis zur Feier), die UI quittiert mit `false`. KEIN neues Framework: reine Wiederverwendung
 * der MasteryCeremony-CSS-Klassen (mwc-*, Chef-GO „PetCelebration/Meisterweihe-Muster sichten und
 * wiederverwenden"), nur ohne deren Queue (das Flag ist ein einzelner Boolean, keine Skill-Liste).
 * Respektiert dieselbe Vorrang-Regel wie MasteryCeremony: wartet, solange die Offline-Beute-Bühne
 * oder ein anderes "modal"-Overlay (Pet/Death/Portrait/…) den Bildschirm belegt.
 */
export function ApMilestoneCeremony(): JSX.Element {
  const state = useGameState();
  const { offlineSummary } = useGameControl();
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (show) return; // schon sichtbar (inkl. Exit-Animation)
    if (offlineSummary) return; // Offline-Beute-Bühne hat Vorrang
    if (hasOpenModal()) return; // Pet-/Death-/Portrait-Popup usw. hat Vorrang
    if (!state.apCeremonyPending) return;
    setShow(true);
    setExiting(false);
    playSfx("achievement");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks, show, offlineSummary]);

  function dismiss(): void {
    setExiting(true);
    window.setTimeout(() => {
      state.apCeremonyPending = false; // Quittung — Muster lastApMilestone/lastPetDrop
      setShow(false);
      setExiting(false);
    }, EXIT_MS);
  }

  useEffect(() => {
    if (!show) return;
    return registerEscCloser("modal", dismiss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return <></>;

  const earned = earnedAP(state, content);
  const total = totalAP(content);
  const unlockedCount = state.achievements.length;
  const totalCount = content.achievements.length;

  return (
    <div
      className={`mwc-backdrop${exiting ? " mwc-exit" : ""}`}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={t("apCeremony.ariaLabel")}
    >
      <div className="mwc-card" onClick={(e) => e.stopPropagation()}>
        <div className="mwc-shine" aria-hidden="true" />
        <div className="mwc-tag">{t("apCeremony.eyebrow")}</div>

        <div className="mwc-icon-wrap">
          <div className="mwc-icon-ring" aria-hidden="true" />
          {ACHIEVEMENTS_ICON_URL
            ? <img loading="lazy" decoding="async" src={ACHIEVEMENTS_ICON_URL} alt="" className="mwc-icon-img pixelart" />
            : <span className="mwc-icon-fallback" aria-hidden="true">🏆</span>}
        </div>

        <h2 className="mwc-title">{t("apCeremony.title")}</h2>
        <div className="mwc-subtitle">{t("apCeremony.subtitle")}</div>

        <div className="mwc-divider" aria-hidden="true" />

        <div className="mwc-journey">
          <div className="mwc-journey-title">{t("apCeremony.statsTitle")}</div>
          <div className="mwc-stats">
            <div className="mwc-stat">
              <span className="mwc-stat-value">{formatNum(earned)} / {formatNum(total)}</span>
              <span className="mwc-stat-label">{t("apCeremony.stat.ap")}</span>
            </div>
            <div className="mwc-stat">
              <span className="mwc-stat-value">{unlockedCount} / {totalCount}</span>
              <span className="mwc-stat-label">{t("apCeremony.stat.achievements")}</span>
            </div>
          </div>
        </div>

        <button className="mwc-next-btn ds-button" onClick={dismiss}>
          {t("apCeremony.close")}
        </button>
      </div>
    </div>
  );
}
