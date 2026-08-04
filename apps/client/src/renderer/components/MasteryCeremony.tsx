import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import {
  markCapeCeremonySeen,
  masteryPoolPct,
  pendingCapeCeremonies,
} from "@hearthforge/engine";
import { COMBAT_SKILL_IDS, COMPLETION_CAPE_KEY, MASTER_CAPE_LEVEL, masterRingItemId } from "@hearthforge/shared";
import type { SkillId } from "@hearthforge/shared";
import { useGameControl, useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import { getSidebarIcon } from "../sidebarIcons";
import { getSkillIcon } from "../skillIcons";
import { playSfx } from "../util/audio";
import { formatNum } from "../util/format";
import { masterPerkText } from "../util/masterPerkProse";
import { type CombatFxLevel, getCombatFxLevel } from "../util/uiPrefs";
import { hasOpenModal, registerEscCloser } from "../util/escStack";
import "../styles/mastery-ceremony.css";

const COMBAT_SKILL_SET = new Set<string>(COMBAT_SKILL_IDS);
const PARTICLE_COUNT = 5;
/** Pause zwischen zwei gestaffelten Zeremonien (Konzept §4: "kein Popup-Stapel"), in ms. */
const QUEUE_PAUSE_MS = 800;
/** Muss zur `mwc-card-out`-Keyframe-Dauer (mastery-ceremony.css) passen. */
const EXIT_MS = 420;

/** Dieselbe Gating-Logik wie App.tsx `effectiveRewardFxLevel` (privat dort, hier dupliziert —
 *  kein gemeinsamer Mount-Kontext zwischen App.tsx und dieser Komponente). OS
 *  `prefers-reduced-motion` übersteuert IMMER zusätzlich auf "off". */
function effectiveFxLevel(): CombatFxLevel {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }
  return getCombatFxLevel();
}

interface JourneyStat {
  label: string;
  value: string;
}

/**
 * "Die Reise in Zahlen" — 2-3 EHRLICHE Kennzahlen aus vorhandenem State (Konzept §-Auftrag: nichts
 * erfinden). Gesamt-XP ist für JEDEN Skill dabei. Die Mastery-Pool-Füllstand-Kennzahl ist NUR für
 * Skills mit echten `content.actions` sinnvoll (Sammel-/Handwerks-/Diebeskunst-Skills) —
 * `masteryPoolCapacity` (engine/mastery.ts) summiert über `content.actions`, und Kampf-Skills
 * (attack/power/.../vitality) UND Slayer haben strukturell KEINE Aktionen im Content (man
 * trainiert sie durchs Kämpfen, nicht durch eine Aktionsliste) — der Pool wäre für sie IMMER 0 %,
 * also eine dauerhaft tote Zahl, kein ehrlicher Fortschrittswert. Für diese beiden Gruppen tritt
 * stattdessen eine wirklich passende, tatsächlich existierende zweite Kennzahl an ihre Stelle
 * (Kampf: Lebenszeit-Kills; Slayer: abgeschlossene Aufträge). Alle anderen Skills bleiben bei 2 —
 * es gibt schlicht keine ehrliche dritte Zahl (z.B. kein per-Skill-itemsGathered im State).
 */
function journeyStats(
  state: ReturnType<typeof useGameState>,
  skillId: SkillId,
  t: (key: string) => string,
): JourneyStat[] {
  // VOLLENDUNGS-Weihe (COMPLETION_CAPE_KEY, capes.ts): kein einzelner Skill — die Reise ist die
  // Gesamt-XP über ALLE Disziplinen plus der 20/20-Zähler. (state.skills["completion"] existiert
  // nicht; der normale Pfad würde „0 XP" zeigen.)
  if (skillId === COMPLETION_CAPE_KEY) {
    const totalXp = Object.values(state.skills).reduce((a, s) => a + (s?.xp ?? 0), 0);
    const n = Object.keys(content.skills).length;
    return [
      { label: t("mastery.ceremony.stat.totalXp"), value: formatNum(Math.floor(totalXp)) },
      { label: t("mastery.ceremony.stat.disciplines"), value: `${n}/${n}` },
    ];
  }
  const xp = state.skills[skillId]?.xp ?? 0;
  const stats: JourneyStat[] = [
    { label: t("mastery.ceremony.stat.totalXp"), value: formatNum(Math.floor(xp)) },
  ];
  if (COMBAT_SKILL_SET.has(skillId)) {
    stats.push({ label: t("mastery.ceremony.stat.kills"), value: formatNum(state.stats.kills) });
  } else if (skillId === "slayer") {
    stats.push({ label: t("mastery.ceremony.stat.slayerTasks"), value: formatNum(state.slayerTasksCompleted) });
  } else {
    const poolPct = Math.round(masteryPoolPct(state, content, skillId) * 100);
    stats.push({ label: t("mastery.ceremony.stat.masteryPool"), value: `${poolPct}%` });
  }
  return stats;
}

/**
 * Meisterweihe-Zeremonie (Level 99, design/master-capes-konzept.md §3, Chef-GO 2026-07-10):
 * eigenständig-würdevoller Vollbild-Moment — dunkler Vorhang, Skill-Icon, "MEISTERSCHAFT"-Titel,
 * "Die Reise in Zahlen" + (falls im Content vorhanden) die Cape-Präsentation.
 *
 * QUEUE: `pendingCapeCeremonies` kann mehrere Skills liefern (Alt-Saves mit vielen 99ern zugleich,
 * oder mehrere Skills, die im selben Tick die Weihe erreichen) — dieser Trigger-Effekt zeigt IMMER
 * nur den Kopf der Warteschlange (`pending[0]`) und quittiert erst beim "Weiter"-Klick
 * (`markCapeCeremonySeen`), danach eine kurze Pause (`QUEUE_PAUSE_MS`), bevor die nächste
 * erscheinen darf — kein Popup-Stapel. Läuft pro Tick erneut (wie PetCelebration/DeathPopup), ist
 * also selbstheilend: blockiert ein anderes Modal (Offline/Pet/Death/PortraitPicker) gerade den
 * Bildschirm, wird einfach der nächste Tick abgewartet, statt sich dazwischenzudrängen.
 */
export function MasteryCeremony(): JSX.Element {
  const state = useGameState();
  const { offlineSummary } = useGameControl();
  const { t, tr } = useI18n();

  const [ceremony, setCeremony] = useState<{ skill: SkillId } | null>(null);
  const [exiting, setExiting] = useState(false);
  const cooldownUntilRef = useRef(0);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const particleRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // ── Trigger: offene Zeremonie aus der Engine-Queue ziehen, wenn niemand sonst den Vorrang hat ──
  useEffect(() => {
    if (ceremony) return; // schon eine sichtbar (inkl. Exit-Animation) — nie zwei zugleich
    if (performance.now() < cooldownUntilRef.current) return; // Staffel-Pause zwischen Zeremonien
    if (offlineSummary) return; // Offline-Beute-Bühne hat Vorrang
    if (hasOpenModal()) return; // Pet-/Death-/Portrait-Popup usw. hat Vorrang — nicht dazwischendrängen
    const pending = pendingCapeCeremonies(state);
    const next = pending[0];
    if (!next) return;
    setCeremony({ skill: next });
    setExiting(false);
    playSfx("achievement");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks, ceremony, offlineSummary]);

  // ── Partikel-Burst (WAAPI, dezent) — feuert einmal pro neu gezeigter Zeremonie ──
  useEffect(() => {
    if (!ceremony) return;
    const fx = effectiveFxLevel();
    if (fx === "off") return;
    const flashEl = flashRef.current;
    if (flashEl && typeof flashEl.animate === "function") {
      flashEl.animate(
        [{ opacity: 0 }, { opacity: 0.9, offset: 0.25 }, { opacity: 0 }],
        { duration: 900, easing: "ease-out" },
      );
    }
    if (fx === "full") {
      particleRefs.current.forEach((el, i) => {
        if (!el || typeof el.animate !== "function") return;
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT - Math.PI / 2;
        const dist = 30 + (i % 3) * 10;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist * 0.6 - 18;
        el.animate(
          [
            { transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 },
            { transform: "translate(-50%, -50%) scale(1)", opacity: 0.9, offset: 0.3 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3)`, opacity: 0 },
          ],
          { duration: 1100, easing: "ease-out", delay: 150 + (i % 4) * 60 },
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony?.skill]);

  function handleNext(): void {
    if (!ceremony) return;
    setExiting(true);
    const skillId = ceremony.skill;
    window.setTimeout(() => {
      markCapeCeremonySeen(state, skillId);
      setCeremony(null);
      setExiting(false);
      cooldownUntilRef.current = performance.now() + QUEUE_PAUSE_MS;
    }, EXIT_MS);
  }

  // Chef-GO Hotkeys: solange die Zeremonie sichtbar ist, bei der zentralen Escape-Registry
  // anmelden (util/escStack.ts) — Priorität "modal", ESC = "Weiter" (wie ein Klick auf den Button).
  useEffect(() => {
    if (!ceremony) return;
    return registerEscCloser("modal", handleNext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony]);

  if (!ceremony) return <></>;

  const skillId = ceremony.skill;
  const isCompletion = skillId === COMPLETION_CAPE_KEY;
  const skill = content.skills[skillId];
  const skillName = skill ? tr(skill.name) : skillId;
  // Vollendung hat kein Skill-Icon — der Erfolgs-Pokal (Sidebar-Icon) trägt die Zeremonie.
  const icon = isCompletion
    ? getSidebarIcon("achievements")
    : (getSkillIcon(skillId) ?? getSidebarIcon(skillId));

  const capeItemId = masterRingItemId(skillId);
  const capeItem = content.items[capeItemId];
  const capeImg = capeItem ? getItemImage(capeItemId) : null;

  const stats = journeyStats(state, skillId, t);
  // Weitere offene Zeremonien NACH dieser (der Kopf der Queue ist immer die gerade gezeigte).
  const moreAwait = Math.max(0, pendingCapeCeremonies(state).length - 1);

  return (
    <div
      className={`mwc-backdrop${exiting ? " mwc-exit" : ""}`}
      onClick={handleNext}
      role="dialog"
      aria-modal="true"
      aria-label={t("mastery.ceremony.ariaLabel")}
    >
      <div className="mwc-card" onClick={(e) => e.stopPropagation()} key={skillId}>
        <div className="mwc-shine" aria-hidden="true" />
        <div className="mwc-tag">{t("mastery.ceremony.eyebrow")}</div>

        <div className="mwc-icon-wrap">
          <div className="mwc-icon-flash" ref={flashRef} aria-hidden="true" />
          <div className="mwc-icon-ring" aria-hidden="true" />
          <div className="mwc-icon-particles" aria-hidden="true">
            {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
              <span key={i} ref={(el) => { particleRefs.current[i] = el; }} />
            ))}
          </div>
          {icon
            ? <img loading="lazy" decoding="async" src={icon} alt="" className="mwc-icon-img pixelart" />
            : <span className="mwc-icon-fallback" aria-hidden="true">⚔</span>}
        </div>

        <h2 className="mwc-title">{t("mastery.ceremony.title")}</h2>
        <div className="mwc-subtitle">
          {isCompletion
            ? t("mastery.ceremony.completionSubtitle")
                .replace("{n}", String(Object.keys(content.skills).length))
                .replace("{level}", String(MASTER_CAPE_LEVEL))
            : t("mastery.ceremony.subtitle")
                .replace("{skill}", skillName)
                .replace("{level}", String(MASTER_CAPE_LEVEL))}
        </div>

        <div className="mwc-divider" aria-hidden="true" />

        <div className="mwc-journey">
          <div className="mwc-journey-title">{t("mastery.ceremony.journeyTitle")}</div>
          <div className="mwc-stats">
            {stats.map((s) => (
              <div className="mwc-stat" key={s.label}>
                <span className="mwc-stat-value">{s.value}</span>
                <span className="mwc-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {capeItem && (
          <>
            <div className="mwc-divider" aria-hidden="true" />
            <div className="mwc-cape">
              <div className="mwc-cape-tag">{t("mastery.ceremony.capeTag")}</div>
              <div className={`mwc-cape-art-frame ${rarityClass(capeItem.rarity)}`}>
                {capeImg
                  ? <img loading="lazy" decoding="async" src={capeImg} alt="" className="mwc-cape-art pixelart" />
                  : <span className="mwc-cape-art-emoji">{capeItem.icon ?? "🧣"}</span>}
              </div>
              <div className="mwc-cape-name">{tr(capeItem.name)}</div>
              {/* Perk-Zeile: dieselbe Textquelle wie die goldene Effekt-Zeile im ItemTooltip
                  (`masterPerkText`, s. dortiges JSDoc) für die 13 Ökonomie-Capes — vorher stand hier
                  die rohe Flavor-Description, jetzt EIN gemeinsamer Satz für beide Stellen. Die 7
                  Kampf-Capes tragen kein `masterPerk` (bestehende Bonus-/Signaturfelder statt
                  Perk-Hook) und behalten ihre Beschreibung als Perk-Zeile, wie zuvor. */}
              {capeItem.masterPerk ? (
                <div className="mwc-cape-perk">{masterPerkText(capeItem.masterPerk, t, tr)}</div>
              ) : capeItem.description ? (
                <div className="mwc-cape-perk">{tr(capeItem.description)}</div>
              ) : null}
            </div>
          </>
        )}

        {moreAwait > 0 && (
          <div className="mwc-queue-hint">
            {t("mastery.ceremony.moreAwait").replace("{n}", String(moreAwait))}
          </div>
        )}

        <button className="mwc-next-btn ds-button" onClick={handleNext}>
          {t("mastery.ceremony.next")}
        </button>
      </div>
    </div>
  );
}
