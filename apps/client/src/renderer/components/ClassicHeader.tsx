/**
 * claude:2026-10-19T10:50:00+02:00 — Chef 19.10.: Oberflächen-Stil „Classic“ = Look von 1.2.3. Die Kopfzeile
 * „Quiet Citadel“ (Charakterblock · Seitentitel mit Symbol · Aktivitäts-/XP-Kasten) samt ihren Bausteinen aus
 * App.tsx von 1.2.3 (Commit ec86af5), unverändert übernommen. Die Reforged-Oberfläche nutzt stattdessen die
 * kompakte Statusleiste (hs-strip) in App.tsx. Styles: styles/classic-chrome.css (.layout--classic).
 */
import { SkillEventChip } from "./SkillEventChip"; // claude:2026-10-25T01:30:00+02:00
import { EstatesNote, IdleOrEstates, useEstatesNote } from "./EstatesNote"; // claude:2026-10-23T19:10:00+02:00 — Ländereien (1.4.0)
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { content } from "@hearthforge/content";
import { combatLevel, computeStats, dungeonRunProgress, effectiveActionDurationMs, effectiveCapacity, levelFromXp, stopCombat, usedCapacityUnits, xpForLevel } from "@hearthforge/engine";
import type { GameState, SkillId } from "@hearthforge/shared";
import { activeStanceMods } from "@hearthforge/shared";
import { computeActionRate, formatEta } from "../util/actionRate";
import { type CombatFxLevel, getCombatFxLevel } from "../util/uiPrefs";
import { useAnimatedNumber } from "../util/useAnimatedNumber";
import { playSfx } from "../util/audio";
import { useI18n } from "../i18n";
import { useGameControl, useGameSelector, useGetGameState, tupleEquals } from "../game/GameContext";
import type { NavPage } from "../navigation";
import { getSidebarIcon } from "../sidebarIcons";
import { getUiIcon } from "../uiIcons";
import { formatNum } from "../util/format";
import { getPortrait, listPortraits } from "../portraits";

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
const INVENTORY_ICON_URL = getUiIcon("icon_inventory");
const SHIELD_ICON_URL = getUiIcon("icon_attribute_defense");
const COMBAT_VS_ICON_URL = getUiIcon("icon_combat");
// Kopfzeile links (Chef #215): Charakter-Name + Kampf-/Gesamtlevel — dieselben
// Sidebar-Icons, die vorher in der jetzt entfernten Sidebar-Charakterkarte saßen.
const CHARINFO_COMBAT_ICON_URL = getSidebarIcon("combat");
const CHARINFO_TOTAL_ICON_URL = getSidebarIcon("skills-overview");

const HOUR_MS = 3_600_000;
/** Anzahl der WoW-Stil-Segmente je Leiste (Chef-Vorgabe: 10, NICHT die 20 aus echtem WoW). */
const SEGMENT_COUNT = 10;

function SegmentedBar({
  variant,
  progressPct,
  centerLabel,
  rightLabel,
  empty,
  title,
}: {
  variant: "action" | "level";
  progressPct: number;
  centerLabel: string;
  rightLabel?: string;
  empty?: boolean;
  title?: string;
}): JSX.Element {
  const pct = Math.min(100, Math.max(0, progressPct));
  return (
    <div className={`tb-bar tb-bar--${variant}${empty ? " tb-bar--empty" : ""}`} title={title}>
      <div className="tb-bar-track-bg" />
      {/* codex:2026-07-31T00:32:37+02:00 — scaleX bleibt auf der Compositor-Spur;
          clip-path musste bei jedem 10-Hz-Update eine fast bildschirmbreite Fläche neu painten. */}
      <div className="tb-bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
      <div className="tb-bar-gloss" />
      <div className="tb-bar-frame-row" aria-hidden="true">
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
          <div key={i} className="tb-bar-frame-seg" />
        ))}
      </div>
      <div className="tb-bar-labels">
        <span className="tb-bar-label-center">{centerLabel}</span>
        {rightLabel && <span className="tb-bar-label-right">{rightLabel}</span>}
      </div>
    </div>
  );
}

/** Aktions-Fortschritts-Leiste (gelb/gold) — Fortschritt der gerade laufenden Aktion, zentriertes
 *  „IN PROGRESS · <Aktion>"-Label + rechtsbündiges XP/h · Einheiten/h. Idle/Kampf → dezent leer.
 *  Perf-Welle Block A (2026-07-22): `useGameSelector` gated den Re-Render auf die drei Primitives,
 *  die den kompletten sichtbaren Zustand bestimmen (Aktion, Fortschritt, Kampf-Flag) — der volle
 *  State für die abgeleiteten Raten (`computeActionRate`/`effectiveActionDurationMs`, brauchen
 *  Mastery/Werkzeuge/Buffs aus dem gesamten State) kommt danach über `useGetGameState()`, läuft
 *  also nur noch so oft wie dieser jetzt gedrosselte Render selbst — auf Seiten ohne laufende
 *  Aktion/Kampf (der Audit-Fall "Mail-Seite idle") rendert diese Leiste gar nicht mehr pro Tick. */
function ActionProgressBar(): JSX.Element {
  const getState = useGetGameState();
  const [activeActionId, actionProgressMs, inCombatGate] = useGameSelector(
    (s) => [s.activeActionId, s.actionProgressMs, s.combat.monsterId != null] as const,
    tupleEquals,
  );
  const state = getState()!;
  const { t, tr } = useI18n();
  const estatesNote = useEstatesNote(); // claude:2026-10-23T19:10:00+02:00 — Ländereien statt „Untätig“ (1.4.0)
  const inCombat = inCombatGate;
  const action = activeActionId ? content.actions[activeActionId] : undefined;
  // Effektive (nicht Basis-)Dauer: Mastery/Werkzeuge machen Aktionen schneller, die Engine schließt
  // exakt hierbei ab (tick.ts effectiveActionDurationMs) — Progress-Fill UND die Raten müssen
  // durch DIESEN Nenner teilen, sonst füllt die Leiste auf Basis-Zeit und resettet abrupt vor 100%.
  const effDurationMs = action ? effectiveActionDurationMs(state, content, action) : 0;

  const progressPct = action
    ? Math.min(100, Math.max(0, (actionProgressMs / effDurationMs) * 100))
    : 0;
  // Erwartungswert-Rate — dieselbe Formelquelle wie SkillPage-Kacheln und die Skill-XP-Leisten-ETA
  // (util/actionRate.ts): Werkzeug-Tempo, Mastery, Mastery-Pool, Pet-Effekte, Buffs UND (bei
  // Thieving) Erfolgschance/Risiko sind eingerechnet — vorher rechnete diese Leiste ihre eigene,
  // Buff-/Pet-blinde Kopie.
  const rate = action ? computeActionRate(state, content, action) : null;
  const xpPerHour = rate ? Math.round(rate.xpPerHour) : 0;
  const primaryLoot = rate?.primaryItemPerHour;

  const centerLabel = action
    ? `${t("skill.doing")} · ${tr(action.name)}`
    : inCombat
      ? t("topbar.bar.inCombat")
      : estatesNote
        ? "" // claude:2026-10-26T04:40:00+02:00 — die Ländereien-Zeile steht schon in der Aktivitätszeile, nicht doppelt (QA-UI P3)
        : t("header.idle"); // claude:2026-10-23T19:10:00+02:00 — 1.4.0 LA
  const rightLabel = action
    ? primaryLoot
      ? `${t("skill.xpRate").replace("{n}", formatNum(xpPerHour))} · ${t("skill.itemRate").replace("{n}", formatNum(primaryLoot.perHour))}`
      : t("skill.xpRate").replace("{n}", formatNum(xpPerHour))
    : undefined;

  return (
    <SegmentedBar
      variant="action"
      progressPct={progressPct}
      centerLabel={centerLabel}
      rightLabel={rightLabel}
      empty={!action}
      title={rightLabel ? `${centerLabel} — ${rightLabel}` : centerLabel}
    />
  );
}

/**
 * Belohnungs-Juice-Welle (Chef-GO): effektive FX-Stufe für die NEUEN Belohnungs-Effekte
 * (Level-Up-Burst hier, Rare-Drop-Jackpot in Toasts.tsx) — derselbe Options-Toggle wie die
 * Kampf-Effekte (CombatPage.tsx `fxLevel`, Task #296 P0 §1.6). OS `prefers-reduced-motion`
 * übersteuert IMMER zusätzlich auf "off". Hier dupliziert statt geteilt (wie im CombatPage-
 * Vorbild), da beide Aufrufer außerhalb eines gemeinsamen Battle-Mounts leben.
 */
function effectiveRewardFxLevel(): CombatFxLevel {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }
  return getCombatFxLevel();
}

/**
 * Level-Up-Moment (Chef-GO Juice-Welle #1): Gold-Aufblitzen + Mini-Partikel-Burst über der
 * Level-XP-Leiste, ~600ms. Nonce+WAAPI-Muster (analog CombatPage Task #296 P0 Hit-Flash/Lunge):
 * `nonce` (hochgezählt vom Aufrufer bei jedem erkannten Level-Sprung) triggert per useEffect
 * imperativ `el.animate()`. `motion=false` (CombatFxLevel "reduced") rendert NUR den Flash, ohne
 * die Partikel-Spans überhaupt zu mounten — "off" ruft die Komponente laut Aufrufer nie auf.
 */
function LevelUpBurst({ nonce, motion }: { nonce: number; motion: boolean }): JSX.Element {
  const flashRef = useRef<HTMLDivElement | null>(null);
  const particleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const PARTICLE_COUNT = 6;

  useEffect(() => {
    if (!nonce) return;
    const flashEl = flashRef.current;
    if (flashEl && typeof flashEl.animate === "function") {
      flashEl.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0 }],
        { duration: 600, easing: "ease-out" },
      );
    }
    if (motion) {
      particleRefs.current.forEach((el, i) => {
        if (!el || typeof el.animate !== "function") return;
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT - Math.PI / 2;
        const dist = 22 + (i % 3) * 8;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        el.animate(
          [
            { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.4)`, opacity: 0 },
          ],
          { duration: 560, easing: "ease-out", delay: (i % 4) * 15 },
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, motion]);

  return (
    <div className="levelup-burst" aria-hidden="true">
      <div className="levelup-burst-flash" ref={flashRef} />
      {motion && (
        <div className="levelup-burst-particles">
          {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
            <span key={i} ref={(el) => { particleRefs.current[i] = el; }} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Ermittelt den von der Level-XP-Leiste getrackten Skill — exakt dieselbe Vorrangkette wie zuvor
 * inline in `LevelXpBar` (`viewedSkillId ?? action?.skill ?? combatSkillId`), nur LAZY (bricht
 * bei der ersten Fundstelle ab, statt `combatSkillId` immer via `computeStats` zu berechnen) und
 * als eigene Funktion, damit `LevelXpBar`s Perf-Gate (s.u.) UND ihr Render-Body dieselbe Logik
 * teilen, statt sie zweimal zu pflegen.
 */
function resolveTrackedSkillId(state: GameState, viewedSkillId?: SkillId | null): SkillId | null {
  if (viewedSkillId) return viewedSkillId;
  const action = state.activeActionId ? content.actions[state.activeActionId] : undefined;
  if (action) return action.skill as SkillId;
  if (state.combat.monsterId != null) {
    // Chef (Bild #52): Im Kampf trackt die Leiste den aktuell trainierten Kampf-Skill — gleiches
    // Routing wie die Engine-XP-Vergabe (Stil aus computeStats + Stance via activeStanceMods.xpSkill).
    return activeStanceMods(computeStats(state, content).style, state.character).xpSkill as SkillId;
  }
  return null;
}

/** Level-XP-Leiste (Original-Citadel-Look): zeigt primär die Fertigkeit der GERADE BETRACHTETEN
 *  Skill-Seite (`viewedSkillId`, von MainLayout durchgereicht — damit ist die Title-Bar auf einer
 *  Skill-Seite die einzige, vollständige XP-Anzeige, auch im Idle, s. SkillPage/FarmPage/SlayerPage,
 *  deren eigene XP-Leiste als Dopplung entfernt wurde). Fallback ohne Skill-Seite: die Fertigkeit
 *  der gerade laufenden Aktion, sonst „No active skill". Zentriertes „Lv X · Y%"-Label.
 *  Perf-Welle Block A (2026-07-22): das Gate unten trackt [skillId, skillXp, activeActionId,
 *  inCombat] — der IDLE-Fall (keine Aktion, kein Kampf, keine betrachtete Skill-Seite) hält
 *  `skillId=null` konstant → kein Re-Render pro Tick mehr (vorher 10Hz via `useGameState`). Im
 *  Kampf bleibt sie weiterhin so lebendig wie zuvor (skillXp ändert sich dort laufend). */
function LevelXpBar({ viewedSkillId }: { viewedSkillId?: SkillId | null }): JSX.Element {
  const getState = useGetGameState();
  const [skillId, skillXp, gatedActiveActionId, gatedInCombat] = useGameSelector((s) => {
    const id = resolveTrackedSkillId(s, viewedSkillId);
    return [id, id ? s.skills[id]?.xp ?? 0 : 0, s.activeActionId, s.combat.monsterId != null] as const;
  }, tupleEquals);
  const state = getState()!;
  const { t, tr } = useI18n();
  const action = gatedActiveActionId ? content.actions[gatedActiveActionId] : undefined;
  const combatSkillId: SkillId | null = gatedInCombat
    ? (activeStanceMods(computeStats(state, content).style, state.character).xpSkill as SkillId)
    : null;
  const level = skillId ? levelFromXp(skillXp) : 0;
  const xpStart = skillId ? xpForLevel(level) : 0;
  const xpEnd = skillId ? xpForLevel(level + 1) : 1;
  const progressPct = skillId && xpEnd > xpStart
    ? Math.min(100, Math.max(0, ((skillXp - xpStart) / (xpEnd - xpStart)) * 100))
    : 0;
  // Chef: rechts neben Lv+% auch die numerischen XP-Werte im aktuellen Level (aktuelle-XP / XP-bis-Levelup).
  // Im Kampf-Fall den Skill-Namen voranstellen — auf Skill-Seiten liefert die Seite den Kontext,
  // im Kampf wüsste der Spieler sonst nicht, WELCHER Kampf-Skill gerade trackt.
  const combatPrefix = skillId && skillId === combatSkillId && !viewedSkillId && !action
    ? `${tr(content.skills[skillId]?.name ?? { en: skillId })} · `
    : "";
  const centerLabel = skillId
    ? `${combatPrefix}${t("skill.level").replace("{n}", String(level))} · ${Math.floor(progressPct)}% · ${formatNum(skillXp - xpStart)} / ${formatNum(xpEnd - xpStart)}`
    : t("topbar.bar.noActiveSkill");

  // ETA bis zum nächsten Level (Chef-Auftrag): NUR wenn eine Aktion GENAU dieses Skills läuft —
  // Kampf-XP (combatSkillId) hat keine „Aktion" (kein content.actions-Eintrag) und bleibt bewusst
  // ohne ETA (der Auftrag bezieht sich auf die Aktionslisten, nicht auf Kampf-Kills). Bei Level 99
  // ist xpEnd === xpStart (Cap in xpForLevel) → keine ETA statt Division durch 0.
  const trackedAction = action && action.skill === skillId ? action : undefined;
  const rate = trackedAction ? computeActionRate(state, content, trackedAction) : null;
  const etaMs =
    rate && rate.xpPerHour > 0 && xpEnd > xpStart
      ? ((xpEnd - skillXp) / rate.xpPerHour) * HOUR_MS
      : null;
  const etaLabel =
    etaMs !== null
      ? t("skill.eta.levelIn").replace("{n}", String(level + 1)).replace("{time}", formatEta(etaMs, t))
      : undefined;

  // Belohnungs-Juice-Welle #1 (Chef-GO): Level-Sprung DES GERADE ANGEZEIGTEN Skills erkennen —
  // an denselben skillId gebunden, damit ein bloßer Seiten-/Aktionswechsel auf einen anderen
  // (zufällig höherstufigen) Skill NICHT fälschlich feuert. Ton kommt bereits aus Toasts.tsx
  // (playSfx("levelup") bei JEDEM Skill-Level-up, unabhängig von der gerade sichtbaren Seite) —
  // hier nur die visuelle Ergänzung, kein doppelter Sound.
  const prevLevelRef = useRef<{ skillId: SkillId | null; level: number } | null>(null);
  const [burst, setBurst] = useState<{ nonce: number; motion: boolean }>({ nonce: 0, motion: false });
  useEffect(() => {
    const prev = prevLevelRef.current;
    if (prev && prev.skillId === skillId && skillId && level > prev.level) {
      const fx = effectiveRewardFxLevel();
      if (fx !== "off") {
        setBurst((b) => ({ nonce: b.nonce + 1, motion: fx === "full" }));
      }
    }
    prevLevelRef.current = { skillId: skillId ?? null, level };
  }, [skillId, level]);

  // Dev-only screenshot hook (analog PetCelebration.tsx `getPetTestParam`): `?levelTest=1`
  // simuliert EINMAL beim Mount einen Level-Sprung, ohne echte XP zu vergeben — lässt die
  // ui-audit-Skripte den Burst über die reale CombatFxLevel-Gating-Logik (effectiveRewardFxLevel,
  // liest denselben localStorage-Options-Wert wie das echte Optionsmenü) auslösen, exakt wie ein
  // echter Level-up. Gated auf import.meta.env.DEV, von Vite in Prod-Builds tree-geshaked.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let test: string | null = null;
    try {
      test = new URLSearchParams(window.location.search).get("levelTest");
    } catch {
      return;
    }
    if (test !== "1") return;
    const fx = effectiveRewardFxLevel();
    if (fx !== "off") {
      setBurst((b) => ({ nonce: b.nonce + 1, motion: fx === "full" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tb-bar-wrap">
      <SegmentedBar
        variant="level"
        progressPct={progressPct}
        centerLabel={centerLabel}
        rightLabel={etaLabel}
        empty={!skillId}
        title={etaLabel ? `${centerLabel} — ${etaLabel}` : centerLabel}
      />
      {burst.nonce > 0 && <LevelUpBurst nonce={burst.nonce} motion={burst.motion} />}
    </div>
  );
}

/** Kopfzeile links (Chef #215, zweizeilig seit #233): Charakter-Name + Kampf-/
 *  Gesamtlevel, kompakt. Eigener Verbraucher (wie GameStats) — re-rendert
 *  isoliert pro Tick, da combatLevel/totalLevel sich mit XP-Gewinn ändern
 *  können. Gold NICHT doppeln (steht bereits rechts in GameStats). combatLevel
 *  ist eine reine Zahl ohne Boost-Anzeige (kein SkillLevelText nötig).
 *  Chef #233: 2 Zeilen statt 1 lange Zeile — Zeile 1 Name, Zeile 2 Kampf-/
 *  Gesamtlevel — damit der Block schmaler bleibt und den zentrierten
 *  Skill-Titel in der Bar nicht mehr streift.
 *  Perf-Welle Block A (2026-07-22): alle drei Werte sind bereits Primitives — kein `getState()`
 *  nötig, reiner `useGameSelector`-Tupel-Read. Rendert jetzt nur noch bei echtem Namens-/Level-
 *  Wechsel, nicht mehr 10×/s auf jeder Seite. */
function HeaderCharacterInfo(): JSX.Element {
  const [combatLvl, totalLvl, name] = useGameSelector(
    (s) => [combatLevel(s), s.character.totalLevel, s.character.name] as const,
    tupleEquals,
  );
  const { t } = useI18n();

  return (
    <div className="header-charinfo">
      <span className="header-charinfo-name">{name}</span>
      <span className="header-charinfo-stats">
        <span className="header-charinfo-stat header-charinfo-stat--combat">
          {CHARINFO_COMBAT_ICON_URL
            ? <img loading="lazy" decoding="async" src={CHARINFO_COMBAT_ICON_URL} alt="" className="ui-icon" />
            : "⚔"}{" "}
          {t("sidebar.combatLevel")} <b>{combatLvl}</b>
        </span>
        <span className="header-charinfo-stat header-charinfo-stat--total">
          {CHARINFO_TOTAL_ICON_URL
            ? <img loading="lazy" decoding="async" src={CHARINFO_TOTAL_ICON_URL} alt="" className="ui-icon" />
            : "★"}{" "}
          {t("sidebar.totalLevel")} <b>{totalLvl}</b>
        </span>
      </span>
    </div>
  );
}

/**
 * Globale Kopfzeile — eigener Verbraucher, damit nur sie pro Tick re-rendert.
 * Perf-Welle Block A (2026-07-22): das Gate deckt alles ab, was den sichtbaren Zustand bestimmt
 * (Primitives, inkl. der bereits-primitiven Rückgabewerte von `usedCapacityUnits`/`effectiveCapacity`) —
 * im Kampf bleibt es weiterhin so lebendig wie zuvor (HP ist Teil des Tupels), aber auf Seiten ohne
 * laufende Aktivität (der Audit-Fall "Mail-Seite idle") rendert diese Kopfzeile nicht mehr blind bei
 * jedem 10-Hz-Tick.
 * Chef-Auftrag 25.08.2026: der Doing-Kasten nimmt jetzt zusätzlich die beiden Segment-Leisten
 * (Aktion + Skill-Level-XP) auf — `progressBars` reicht MainLayout die dort schon instanziierten,
 * EIGENSTÄNDIG perf-gegateten `<ActionProgressBar/>`/`<LevelXpBar/>` durch, statt sie hier neu zu
 * bauen. `actionProgressMs` fliegt daher aus DIESEM Selector-Tupel — der einzige bisherige
 * Verbraucher war der jetzt entfernte Mini-Balken neben "Doing: X" (die echte Leiste hat ihr
 * eigenes Gate, s. ActionProgressBar oben).
 */
function GameStats({
  onNavigate,
  progressBars,
}: {
  onNavigate?: (id: string) => void;
  progressBars?: React.ReactNode;
}): JSX.Element {
  const getState = useGetGameState();
  const [
    monsterId, playerHp, enemyHp, activeActionId,
    lastStopActionId, lastStopReason, gold, used, cap,
    slayerMonsterId, slayerProgress, slayerRequired,
  ] = useGameSelector(
    (s) => [
      s.combat.monsterId,
      s.combat.monsterId != null ? s.character.hp : 0,
      s.combat.monsterId != null ? s.combat.enemyHp : 0,
      s.activeActionId,
      s.lastStop?.actionId ?? null,
      s.lastStop?.reason ?? null,
      s.character.gold,
      // Chef-Follow-up (23.07.): "22/20" besteht aus 20 Slots + N Zellen der separaten Instanz-
      // Tasche (`inventory.instances`) — `usedSlots` allein zählt die Instanzen nicht mit.
      // `usedCapacityUnits` (= usedSlots + instances.length) ist das ehrliche Gesamtmaß.
      usedCapacityUnits(s.inventory),
      effectiveCapacity(s.inventory, content),
      s.slayerTask?.monsterId ?? null,
      s.slayerTask?.progress ?? 0,
      s.slayerTask?.required ?? 0,
    ] as const,
    tupleEquals,
  );
  const state = getState()!;
  const { t, tr } = useI18n();
  const inCombat = monsterId != null;

  // Slayer-Auftrags-Chip: aktiver Auftrag → Fortschritt anzeigen.
  const slayerTaskMonster = slayerMonsterId ? content.monsters[slayerMonsterId] : null;
  const slayerTaskMonName = slayerTaskMonster ? tr(slayerTaskMonster.name) : (slayerMonsterId ?? "");
  const slayerIconUrl = getSidebarIcon("slayer");
  // Klick auf die Kampf-Statusleiste → direkt zum animierten Kampf-Screen springen.
  const goToFight = (): void => onNavigate?.("combat");

  // Activity label
  let activity: JSX.Element;
  if (inCombat) {
    const m = content.monsters[monsterId!];
    // Chef-Fix (Kampf-Titelzeile): die HP-Übersicht saß vorher als eigene Zeile ÜBER dieser
    // Aktivitäts-Zeile — im Kampf brauchte .game-stats dadurch 3 Zeilen statt der sonst üblichen
    // 2 (Aktivität + Bags/Gold/Slayer/Stop), was die Title-Bar im Kampf höher hielt, als sie sein
    // müsste (Task #283 hat die Bar sonst kompakter gemacht). Jetzt inline hinter dem
    // Monsternamen in DIESER Zeile — .game-stats bleibt im Kampf genauso hoch wie außerhalb.
    // Der Spielername steht schon dauerhaft links in .header-charinfo-name, der Monstername
    // steht schon im Fighting-Label selbst — beide Namen + exakte HP-Zahlen bleiben als Tooltip
    // (title=""), s. .gamestats-hp-inline/.gamestats-hp-mini unten.
    const stats = computeStats(state, content);
    const playerMaxHp = stats.maxHp > 0 ? stats.maxHp : 1;
    const enemyMaxHp = m && m.maxHp > 0 ? m.maxHp : 1;
    const playerPct = Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100));
    const enemyPct = Math.max(0, Math.min(100, (enemyHp / enemyMaxHp) * 100));
    const monsterName = m ? tr(m.name) : "";
    const playerHpTitle = `${state.character.name}: ${Math.ceil(playerHp)}/${Math.round(playerMaxHp)}`;
    const enemyHpTitle = `${monsterName}: ${Math.ceil(enemyHp)}/${Math.round(enemyMaxHp)}`;
    // Chef-Auftrag 26.08.2026 ("Dungeons queuebar"): läuft der Kampf gerade als Queue-Dungeon-Lauf
    // (`state.queueDungeon`), ersetzt "Kampf: {Monster}" den Dungeon-Namen + Lauf-Fortschritt —
    // "Dungeon: {Name} · Lauf {n}/{m}" (kompakte Kurzform, s. ActionQueuePanel.tsx
    // `dungeonProgressLabel` für die ausgeschriebene "Lauf n von m"-Variante im Queue-Panel). Direkter
    // `state`-Zugriff statt eigenem Selector-Eintrag — dieselbe Zeile liest bereits `computeStats(state, …)`
    // ungegated, s. Kommentar dort; ein Wellenwechsel (neuer `monsterId`) löst über den bestehenden
    // Selector ohnehin einen Re-Render aus, GENAU wenn `queueDungeon.completed` gestiegen ist.
    const queueDungeon = state.queueDungeon;
    const runProgress = queueDungeon ? dungeonRunProgress(state) : null;
    const dungeonHeaderName = queueDungeon
      ? (() => {
          const dungeon = content.dungeons.find((d) => d.id === queueDungeon.dungeonId);
          return dungeon ? tr(dungeon.name) : queueDungeon.dungeonId;
        })()
      : "";
    const dungeonRunShort = runProgress
      ? runProgress.target === null
        ? t("queue.dungeon.runShortInfinite").replace("{n}", String(runProgress.run))
        : t("queue.dungeon.runShort").replace("{n}", String(runProgress.run)).replace("{m}", String(runProgress.target))
      : "";
    activity = (
      <span
        className="activity activity-fighting"
        onClick={goToFight}
        role="button"
        tabIndex={0}
        title={t("header.jumpToFight")}
      >
        {queueDungeon ? (
          <>
            <span className="muted">{t("header.dungeon")}</span>{" "}
            <span className="activity-name">{dungeonHeaderName}</span>
            <span className="muted"> · {dungeonRunShort}</span>
          </>
        ) : (
          <>
            <span className="muted">{t("header.fighting")}</span>{" "}
            <span className="activity-name">{monsterName}</span>
          </>
        )}
        <span className="gamestats-hp-inline">
          <span className="gamestats-hp-mini" title={playerHpTitle}>
            <span className="gamestats-hp-mini-icon" aria-hidden="true">
              {SHIELD_ICON_URL
                ? <img loading="lazy" decoding="async" src={SHIELD_ICON_URL} alt="" className="ui-icon" />
                : "🛡"}
            </span>
            <span className="gamestats-hpbar gamestats-hpbar--inline">
              {/* Belohnungs-Juice-Welle #3 — HP-Nachlauf (s. combat.css .cbar-hp-trail für die
                  ausführliche Erklärung des reinen CSS-Timing-Tricks; hier dieselbe Technik für
                  die Mini-Leiste in der Kampf-Titelzeile). */}
              <span className="gamestats-hpbar-trail" style={{ transform: `scaleX(${playerPct / 100})` }} />
              <span className="gamestats-hpbar-fill gamestats-hpbar-fill--player" style={{ transform: `scaleX(${playerPct / 100})` }} />
            </span>
          </span>
          <span className="gamestats-vs" aria-hidden="true">
            {COMBAT_VS_ICON_URL
              ? <img loading="lazy" decoding="async" src={COMBAT_VS_ICON_URL} alt="" className="ui-icon" />
              : "⚔"}
          </span>
          <span className="gamestats-hp-mini" title={enemyHpTitle}>
            <span className="gamestats-hpbar gamestats-hpbar--inline">
              <span className="gamestats-hpbar-trail" style={{ transform: `scaleX(${enemyPct / 100})` }} />
              <span className="gamestats-hpbar-fill gamestats-hpbar-fill--enemy" style={{ transform: `scaleX(${enemyPct / 100})` }} />
            </span>
          </span>
        </span>
      </span>
    );
  } else if (activeActionId) {
    const a = content.actions[activeActionId];
    // Chef-Auftrag 25.08.2026: der Mini-Fortschrittsbalken hier ist weg — die echte, große
    // Aktions-Fortschrittsleiste (ActionProgressBar) sitzt jetzt direkt unter diesem Text im
    // selben (jetzt breiteren) Doing-Kasten, s. `progressBars` in GameStats' Rückgabe unten.
    activity = (
      <span className="activity">
        <span className="muted">{t("header.doing")}</span>{" "}
        <span className="activity-name">{a ? tr(a.name) : ""}</span>
        {/* claude:2026-10-23T19:10:00+02:00 — 1.4.0 LA: Ländereien als Zusatz. */}
        <EstatesNote className="muted" />
        <SkillEventChip /> {/* claude:2026-10-25T01:30:00+02:00 — Ereignis/Angebot (1.4.0 EV/AU) */}
      </span>
    );
  } else if (lastStopActionId) {
    const a = content.actions[lastStopActionId];
    const hint =
      lastStopReason === "inventory_full"
        ? t("skill.stoppedInventoryFull")
        : t("skill.stoppedNoMaterials");
    activity = (
      <span className="activity activity-stopped" title={hint}>
        ⚠ <span className="muted">{t("header.stopped")}</span>{" "}
        <span className="activity-name">{a ? tr(a.name) : ""}</span>
      </span>
    );
  } else {
    // claude:2026-10-23T19:10:00+02:00 — 1.4.0 LA: nie „Untätig“, solange Felder oder Fallen arbeiten.
    // claude:2026-10-25T02:30:00+02:00 — Ereignis-Chip auch im Leerlauf (1.4.0 EV/AU)
    activity = <span className="activity"><IdleOrEstates idleText={t("header.idle")} className="muted" /><SkillEventChip /></span>;
  }

  const invFull = used >= cap;
  // Chef-Bugfix 22.07./23.07.-Follow-up ("20/20 trotz 22 belegten Einheiten"): `used`/`cap` sind
  // hier bereits die ECHTEN Werte (usedCapacityUnits = Slots + Instanz-Tasche / effectiveCapacity,
  // s. Selector oben) — nur die STYLING-Unterscheidung fehlte bisher: "genau voll" (amber,
  // bestehendes `.full`) sah identisch aus wie "übervoll" (Ist > Kapazität, z.B. durch einen
  // fehlgeschlagenen Equip-Tausch ODER überschüssige Instanz-Drops). `.over` färbt zusätzlich rot
  // + eigener Tooltip-Hinweis, wo die Beute jetzt hingeht.
  const invOverCapacity = used > cap;
  // Geschmeidigkeits-Bundle (Chef-GO): Gold zählt bei Änderungen sanft hoch/runter statt zu
  // springen (~400ms Ease-out-Tween, s. util/useAnimatedNumber.ts). Gerundet fürs Anzeigen —
  // formatNum() selbst rundet nicht, ein rohes Zwischen-Float wie "1.234,7" wäre unpassend für Gold.
  const animatedGold = useAnimatedNumber(gold, 400);

  return (
    <div className={`game-stats${inCombat ? " game-stats--combat" : ""}${slayerMonsterId != null ? " game-stats--has-slayer" : ""}`}>
      {/* Chef #233: Zeile 1 — die Aktivität (Kampf/Aktion/Gestoppt).
          Chef-Auftrag 25.08.2026: darunter jetzt zusätzlich die beiden Segment-Leisten
          (Aktion + Skill-Level-XP) — der Kasten wurde dafür breiter+zentriert (s. topbar.css
          .content-header-row-Grid) und nimmt sie als eigene Zeile auf, statt sie wie vorher als
          separaten, über die GANZE Kopfzeile absolut positionierten Block darunter zu zeigen. */}
      <div className="gamestats-row gamestats-row--activity">
        {activity}
        <div className="gamestats-activity-bars">{progressBars}</div>
      </div>
      {/* codex:2026-08-01T18:06:00+02:00 — Quiet Citadel fuehrt den aktiven Slayer-Vertrag als
          eigenen Cluster zwischen Aktivitaet und Oekonomie. So konkurriert der lange Zieltext
          nicht mehr mit Inventarslots und Gold um dieselbe schmale Flexzeile. */}
      {slayerMonsterId != null && (
        <div className="gamestats-row gamestats-row--slayer">
          <span className="gamestats-slayer-chip">
            {slayerIconUrl
              ? <img loading="lazy" decoding="async" src={slayerIconUrl} alt="" className="ui-icon" />
              : "⚔"}{" "}
            {t("header.slayerTask")
              .replace("{done}", String(slayerProgress))
              .replace("{total}", String(slayerRequired))
              .replace("{monster}", slayerTaskMonName)}
          </span>
        </div>
      )}
      {/* Zeile 2 — Inventar/Gold/Stop-Button als eigener Oekonomie-Cluster. */}
      <div className="gamestats-row gamestats-row--meta">
        <span
          className={`slots-display${invOverCapacity ? " over" : invFull ? " full" : ""}`}
          title={invOverCapacity ? t("inv.overCapacity.hint") : invFull ? t("header.bagsFull") : t("header.bags")}
        >
          {INVENTORY_ICON_URL
            ? <img loading="lazy" decoding="async" src={INVENTORY_ICON_URL} alt="" className="ui-icon" />
            : "🎒"}{" "}
          {used}/{cap}
        </span>
        <span className="gamestats-pipe" aria-hidden="true" />
        <span className="gold-display">
          {GOLD_ICON_URL
            ? <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />
            : "🪙"}{" "}
          {formatNum(Math.round(animatedGold))}
        </span>
        {inCombat && (
          <>
            <span className="gamestats-pipe" aria-hidden="true" />
            <button
              type="button"
              className="gamestats-stop-btn"
              onClick={() => stopCombat(state)}
            >
              {t("header.stopCombat")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Save-Fallback (#249): alte Spielstände können auf inzwischen gelöschte Portrait-IDs zeigen
 * (char_1, archer_m, … vor der 56-teiligen Ganzkörper-Portrait-Überarbeitung, s. portraits.ts).
 * Einmalig beim Mount (= jedes Laden/Neu-Erstellen, MainLayout mountet nur während `screen ===
 * "playing"`) geprüft: ist `character.portrait` kein gültiges Portrait mehr, wird ZUFÄLLIG ein
 * gültiges gewählt und SOFORT gespeichert — direkte Mutation auf dem lebenden State-Objekt, exakt
 * wie der Zahnrad-Flow selbst (CharacterPage `c.portrait = id`, kein neuer Persistenz-Pfad nötig).
 * Der Spieler kann die Zufallswahl danach jederzeit über den Zahnrad-Button/PortraitPickerModal
 * ändern.
 */

/** Kopfzeile „Quiet Citadel“ von 1.2.3 (nur im Classic-Stil gerendert). */
export function ClassicContentHeader({
  page,
  viewedSkillId,
  onNavigate,
}: {
  page: NavPage | undefined;
  viewedSkillId: SkillId | null;
  onNavigate: (id: string) => void;
}): JSX.Element {
  const { t } = useI18n();
  const sidebarIconUrl = page ? getSidebarIcon(page.id) : null;
  return (
    <header className="content-header content-header--quiet-citadel">
      {/* Chef #233: eigener Row-Wrapper — der Skill-Titel wird absolut auf DIESE Box
          zentriert (dead-center über die ganze Bar, unabhängig von links/rechts-Breite),
          statt nur innerhalb einer Grid-Spalte.
          Chef-Auftrag 25.08.2026: die zwei Segment-Leisten (Aktion + Skill-Level-XP) leben
          jetzt NICHT mehr als eigener, über die GANZE Kopfzeile absolut positionierter Block
          unter dieser Row (das war der vorherige Stand, „2. Korrektur"), sondern werden als
          `progressBars` in den (jetzt breiteren, zentrierten) Doing-Kasten von GameStats
          durchgereicht — beide Komponenten wandern dabei als GANZES samt ihrer eigenen
          Perf-Gates (s. ActionProgressBar/LevelXpBar-JSDoc oben), nur ihr Render-ORT ändert
          sich. */}
      <div className="content-header-row">
        <HeaderCharacterInfo />
        <h1>
          {page ? (
            <>
              {sidebarIconUrl ? (
                <img loading="lazy" decoding="async"
                  src={sidebarIconUrl}
                  alt=""
                  className="content-header-icon pixelart"
                />
              ) : (
                <span>{page.icon}</span>
              )}
              {/* 7-Sprachen-Fundament (Task #252): war ein Titelbild (title_<id>.png,
                  titleImages.ts) — nicht übersetzbar. Jetzt immer lokalisierbarer Text;
                  `.content-header h1` liefert bereits dieselbe Optik (Cinzel, uppercase, Gold). */}
              <span>{t(page.label)}</span>
              {/* Chef 2026-07-03: dasselbe Icon rechts, horizontal gespiegelt (füllt die Bar). */}
              {sidebarIconUrl && (
                <img loading="lazy" decoding="async"
                  src={sidebarIconUrl}
                  alt=""
                  aria-hidden="true"
                  className="content-header-icon content-header-icon-right pixelart"
                />
              )}
            </>
          ) : (
            t("app.title")
          )}
        </h1>
        <GameStats
          onNavigate={onNavigate}
          progressBars={
            <>
              <ActionProgressBar />
              <LevelXpBar viewedSkillId={viewedSkillId} />
            </>
          }
        />
      </div>
    </header>
  );
}
