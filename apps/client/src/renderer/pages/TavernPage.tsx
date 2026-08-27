import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { content } from "@hearthforge/content";
import { bankCount, blessingForTime, itemCount } from "@hearthforge/engine";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { todayStamp } from "../util/dayStamp";
import { requestQuestsTab } from "../navigation";
import { registerEscCloser } from "../util/escStack";
import { HoverTip } from "../components/CitadelTip";
import { TavernGuestModal } from "../components/TavernGuestModal";
import { CrateOpenModal } from "../components/CrateOpenModal";
import {
  tavernBuilt,
  tavernGuestDef,
  tavernLevel,
  tavernRefresh,
  tavernSeats,
  tavernSeatSummary,
} from "../tavernApi";
import {
  getTavernInteriorImage,
  resolveTavernGuestSeatImage,
  TAVERN_OBJECT_POS,
  TAVERN_SCENE_ASPECT,
  TAVERN_SEAT_POS,
} from "../tavernArt";
import woodBg from "../assets/bg_tileable_wood.webp";
import "../styles/tavern.css";

/** Kein echter Szenen-Anker (Miras qa/scene-coordinates.json kennt nur die vier Objekte oben) —
 *  UI-gewählte Platzhalter-Ecke nahe der Tür, bis ein eigener Requisiten-Anker nachgeliefert wird. */
const STRANGER_SACK_POS = { xPct: 90, yPct: 84 };

const CRATE_ITEM_IDS = ["i", "ii", "iii", "iv", "v"].map((s) => `black_market_crate_${s}`);

/** Ein klickbarer Hotspot auf der Kulisse: absolut positioniert (Prozent), Hover-Label + Klick. */
function TavernHotspot({
  pos,
  label,
  icon,
  className,
  onClick,
}: {
  pos: { xPct: number; yPct: number };
  label: string;
  icon: ReactNode;
  className?: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <div
      className={`tvn-object${className ? ` ${className}` : ""}`}
      style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
    >
      <HoverTip
        as="div"
        className="tvn-object-hit"
        content={label}
        role="button"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          onClick();
        }}
      >
        {icon}
      </HoverTip>
    </div>
  );
}

/** Kleines Info-Popup (Tresen/Halvard, Kamin/Segen) — dasselbe Steel-9-Slice-Panel wie die
 *  Gäste-Karte, aber ohne Aufgaben-Inhalt. Eigenständig statt in TavernGuestModal, weil es keinen
 *  Sitzplatz-Index braucht. */
function TavernInfoPopup({
  title,
  portraitSrc,
  lines,
  onClose,
  footer,
}: {
  title: string;
  portraitSrc?: string | null;
  lines: string[];
  onClose: () => void;
  footer?: ReactNode;
}): JSX.Element {
  const { t } = useI18n();
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  return (
    <div className="modal-overlay tvn-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal tvn-info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("common.close")} />
        <div className="tvn-info-head">
          {portraitSrc && <img src={portraitSrc} alt="" className="tvn-info-portrait" />}
          <div className="tvn-info-title">{title}</div>
        </div>
        <div className="tvn-info-panel iwk-panel">
          {lines.map((line, i) => (
            <p key={i} className="tvn-info-line">{line}</p>
          ))}
        </div>
        {footer}
      </div>
    </div>
  );
}

export function TavernPage({ onNavigate }: { onNavigate: (id: string) => void }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [, setDirty] = useState(0);
  const onDirty = useCallback((): void => setDirty((n) => n + 1), []);

  const [openSeat, setOpenSeat] = useState<number | null>(null);
  const [crateOpen, setCrateOpen] = useState<{ initialItemId: string | null } | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [hearthOpen, setHearthOpen] = useState(false);

  // Exaktes Fit-Maß der Bühne (Bug-Fix): `width:100%` + `aspect-ratio` + `max-height:100%` allein
  // schrumpft NICHT beide Achsen gemeinsam (CSS löst zuerst die definite `width` auf, `max-height`
  // greift danach nicht mehr rückwirkend auf die Breite durch) — bei 1920×1080 lief die Bühne dadurch
  // ~28px unten aus dem sichtbaren Bereich (`.tavern-page` schneidet mit `overflow:hidden` einfach
  // ab, kein Balken, aber ein abgeschnittener unterer Rand). ResizeObserver misst den verfügbaren
  // Rahmen und setzt beide Maße explizit in Pixeln — seither treffen TAVERN_SEAT_POS/TAVERN_OBJECT_POS
  // (Prozent relativ zur Bühne) wieder exakt auf die reale Szene, ganz gleich wie das Fenster sitzt.
  const stageOuterRef = useRef<HTMLDivElement>(null);
  const [stagePx, setStagePx] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = stageOuterRef.current;
    if (!el) return;
    const fit = (): void => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      if (availW <= 0 || availH <= 0) return;
      let w = availW;
      let h = w / TAVERN_SCENE_ASPECT;
      if (h > availH) {
        h = availH;
        w = h * TAVERN_SCENE_ASPECT;
      }
      setStagePx({ w: Math.floor(w), h: Math.floor(h) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mount-Refresh (Spec §6, idempotent): der App-weite Hook (Toasts.tsx) deckt Start + Mitternacht
  // ab, dieser hier fängt einen direkten Sprung auf die Seite ab, bevor jener Hook lief.
  useEffect(() => {
    if (tavernRefresh(state, content, todayStamp())) onDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const built = tavernBuilt(state, content);

  if (!built) {
    return (
      <div className="tavern-page tavern-page--construction">
        <div className="tvn-construction iwk-panel">
          <p className="tvn-construction-body">{t("tavern.construction.body")}</p>
          <button type="button" className="btn-iron" onClick={() => onNavigate("newhaven")}>
            {t("tavern.construction.cta")}
          </button>
        </div>
      </div>
    );
  }

  const level = tavernLevel(state);
  const seats = tavernSeats(state);
  const interiorImg = getTavernInteriorImage();
  const crateVisible = CRATE_ITEM_IDS.some(
    (id) => itemCount(state.inventory, id) + bankCount(state, id) > 0,
  );

  const halvard = tavernGuestDef(content, "halvard");
  const blessing = blessingForTime(Date.now());

  const stageStyle: CSSProperties = {
    // Vor der ersten Messung (ResizeObserver feuert einen Frame nach dem Mount) fällt die Bühne auf
    // die CSS-`aspect-ratio` in tavern.css zurück — kein Layout-Sprung, nur die erste Anzeige ist
    // eine (unsichtbare) Breiten-Schätzung, bevor die exakten Pixelmaße greifen.
    ...(stagePx ? { width: `${stagePx.w}px`, height: `${stagePx.h}px` } : {}),
    backgroundImage: interiorImg
      ? `url("${interiorImg}")`
      : `linear-gradient(rgba(8,6,4,0.35), rgba(8,6,4,0.75)), url("${woodBg}")`,
    backgroundSize: interiorImg ? "cover" : "220px 220px",
    backgroundRepeat: interiorImg ? "no-repeat" : "repeat",
    backgroundPosition: "center",
  };

  return (
    <div className="tavern-page">
      <div className="tvn-stage-outer" ref={stageOuterRef}>
        <div className="tvn-stage" style={stageStyle}>
          <div className="tvn-stage-vignette" aria-hidden="true" />

          {seats.map((seat, i) => {
            const pos = TAVERN_SEAT_POS[i];
            if (!pos) return null;
            const task = seat.task;
            const guest = task ? tavernGuestDef(content, seat.guestId) : null;
            const summary = task ? tavernSeatSummary(state, content, i) : null;
            const img = guest ? resolveTavernGuestSeatImage(guest.id) : null;
            return (
              <button
                key={i}
                type="button"
                className={`tvn-seat${!task ? " tvn-seat--empty" : ""}`}
                style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
                onClick={() => task && setOpenSeat(i)}
                disabled={!task}
                aria-label={guest ? tr(guest.name) : t("tavern.seat.empty")}
              >
                {task && guest ? (
                  <>
                    <span className="tvn-seat-portrait-wrap">
                      {img ? (
                        <img src={img} alt="" className="tvn-seat-portrait" />
                      ) : (
                        <span className="tvn-seat-portrait tvn-seat-portrait--empty" aria-hidden="true" />
                      )}
                      {task.accepted && (
                        <span className={`tvn-seat-flag${summary?.progress?.deliverable ? " tvn-seat-flag--ready" : ""}`}>
                          {summary?.progress?.deliverable ? t("tavern.seat.deliverable") : t("tavern.seat.accepted")}
                        </span>
                      )}
                    </span>
                    <span className="tvn-seat-nameband">{tr(guest.name)}</span>
                  </>
                ) : (
                  <span className="tvn-seat-chair" aria-hidden="true" />
                )}
              </button>
            );
          })}

          <TavernHotspot
            pos={TAVERN_OBJECT_POS.noticeBoard}
            label={t("tavern.object.board")}
            icon={<span aria-hidden="true">📜️</span>}
            onClick={() => {
              requestQuestsTab("daily");
              onNavigate("quests");
            }}
          />
          <TavernHotspot
            pos={TAVERN_OBJECT_POS.counter}
            label={t("tavern.object.counter")}
            icon={<span aria-hidden="true">🍺</span>}
            onClick={() => setCounterOpen(true)}
          />
          <TavernHotspot
            pos={TAVERN_OBJECT_POS.fireplace}
            label={t("tavern.object.hearth")}
            icon={<span aria-hidden="true">🔥️</span>}
            onClick={() => setHearthOpen(true)}
          />
          <TavernHotspot
            pos={TAVERN_OBJECT_POS.door}
            label={t("tavern.object.door")}
            icon={<span aria-hidden="true">🚪️</span>}
            onClick={() => onNavigate("newhaven")}
          />
          {crateVisible && (
            <TavernHotspot
              pos={STRANGER_SACK_POS}
              label={t("tavern.object.strangerSack")}
              icon={<span aria-hidden="true">🎒️</span>}
              className="tvn-object--sack"
              onClick={() => setCrateOpen({ initialItemId: null })}
            />
          )}
        </div>
      </div>

      {level > 0 && <div className="tvn-level-note muted">{t("tavern.level.label").replace("{n}", String(level))}</div>}

      {openSeat !== null && (
        <TavernGuestModal seatIndex={openSeat} onClose={() => setOpenSeat(null)} onDirty={onDirty} />
      )}
      {crateOpen && (
        <CrateOpenModal
          initialItemId={crateOpen.initialItemId}
          onClose={() => setCrateOpen(null)}
          onDirty={onDirty}
        />
      )}
      {counterOpen && halvard && (
        <TavernInfoPopup
          title={tr(halvard.name)}
          portraitSrc={resolveTavernGuestSeatImage(halvard.id)}
          lines={
            state.tavern.introSeen
              ? [tr(halvard.greeting)]
              : [tr(halvard.greeting), t("tavern.halvard.intro1"), t("tavern.halvard.intro2"), t("tavern.halvard.intro3")]
          }
          onClose={() => {
            state.tavern.introSeen = true;
            onDirty();
            setCounterOpen(false);
          }}
        />
      )}
      {hearthOpen && (
        <TavernInfoPopup
          title={t("tavern.object.hearth")}
          lines={[t(`blessing.name.${blessing.id}`), t(`blessing.flavor.${blessing.id}`)]}
          onClose={() => setHearthOpen(false)}
        />
      )}
    </div>
  );
}
