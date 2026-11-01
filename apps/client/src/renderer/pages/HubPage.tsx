// claude:2026-10-30T20:31:00+01:00 — Hauptmenü-Hub (Chef-Entscheid 30.10.2026, Mockup 3 „Seitenspalten“): die Startseite nach dem Laden.
// Links Tagesaufgaben, Warteschlange, Arbeitsaufträge; rechts Slayer-Auftrag, New Haven, Scherbenaltar; die Mitte bleibt für das
// Hauptmenü-Bild frei: oben der Charakter (Porträt, Stufen, Begrüßung) mit Weltleiste (Segen, Begleiter, Ereignis), unten die
// laufende Chronik-Story, darunter „Weitermachen“ und „Letzter Kampf“. Nur lesend aus Zustand und Engine, die einzigen Schreibzugriffe
// sind die Verben, die die Zielseiten selbst benutzen (setActiveAction, startCombat, enqueueAllDailyQuests). Jede Karte führt zu ihrer Seite.
// claude:2026-10-30T21:10:00+01:00 — Überarbeitung „mehr Liebe“ (Chef): einheitliches Kartensystem (Kopf, Bildband, Fuß mit Aktion),
// Chronik-Karte mit Wächter, Charakterkopf, Weltleiste, sinnvolle Leerzustände (Kampf-Vorschlag statt leerem Kasten).
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { content } from "@hearthforge/content";
import {
  blessingForTime,
  campBuildDurationMs,
  actionLevelMet,
  canFightMonster,
  combatLevel,
  enqueueAllDailyQuests,
  enqueueFightAtFront,
  levelFromXp,
  prestigePointsPreview,
  prestigeRespecPending, // claude:2026-10-31T14:58:54+01:00 — 1.4.2 Narben-Rückgabe
  prestigeUnlock,
  questObjectiveProgress,
  refreshDailyQuests,
  setActiveAction,
  workOrderProgress,
  xpForLevel,
  isDailyClaimed,
  canClaimQuest,
} from "@hearthforge/engine";
import { isDungeonQueueEntry, isFightQueueEntry, isRaidQueueEntry } from "@hearthforge/shared";
import type { ActionDef, GameState, MonsterDef, QuestDef } from "@hearthforge/shared";
import "../styles/hub.css";
import { useGameControl, useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getActionSrc } from "../actionIcons";
import { getBlessingImage } from "../blessings";
import { getCampImage } from "../campArt";
import { EVENT_ICON } from "../eventArt";
import { getPetSrc } from "../pets";
import { getPortrait } from "../portraits";
import { getZoneBackgroundCard } from "../zoneBackgrounds";
import { getItemImage } from "../items";
import { getMonsterSrc } from "../monsters";
import { getAltarScene, getAshNotchArt } from "../prestigeArt";
import { getSidebarIcon } from "../sidebarIcons";
import { getSkillIcon, SKILL_EMOJI_FALLBACK } from "../skillIcons";
import { getUiIcon } from "../uiIcons";
import { findPage, requestQuestsTab } from "../navigation";
import { computeActionRate, formatEta } from "../util/actionRate";
import { activeChronicleChapter, chronicleChapters } from "../util/chronicle";
import { todayStamp } from "../util/dayStamp";
import { formatNum, romanLevel } from "../util/format";
import { getLastActivity } from "../util/lastActivity";
import { prestigeNavVisible } from "../util/prestigeNav";
import { effectiveFxLevel } from "../util/fxLevel"; // claude:2026-10-31T14:58:54+01:00 — Glut-Puls der Altar-Karte nur mit Effekten
import { stopReasonKey } from "../util/stopReason";
import { computeQueueTiming } from "../util/queueTiming";
import { OrderTierMark } from "../components/WorkOrdersTab";
import { objectiveLabel } from "./QuestsPage";
import campIdleIcon from "../assets/ui/icon_newhaven.webp";

const CALENDAR_ICON = getUiIcon("icon_quest_calendar");
const QUEUE_ICON = getUiIcon("icon_queue_list");
const QUEUE_ROWS_MAX = 4;
const ORDER_ROWS_MAX = 2; // claude:2026-11-01T11:49:52+01:00 — DAILY_ROWS_MAX entfällt, Tagesaufgaben scrollen
const STORY_GOALS_MAX = 2;

/** Seiten-ID eines Skills (Sidebar-Einträge heißen wie die Skill-ID); ohne eigene Seite die Skill-Übersicht. */
function skillPageId(skillId: string): string {
  return findPage(skillId) ? skillId : "skills-overview";
}

function skillIconSrc(skillId: string): string | null {
  return getSidebarIcon(skillId) ?? getSkillIcon(skillId);
}

/** Hauptbild einer Aktion: eigenes Aktionsbild, sonst das erste erzeugte Item. */
function actionImage(action: ActionDef): string | null {
  const out = action.loot[0]?.itemId;
  return getActionSrc(action.id) ?? (out ? getItemImage(out) : null);
}

/** Welt-Gegner: kein Dungeon-/Turm-/Elite-Ableger, kein reiner Instanz-Gegner. */
function isWorldMonster(id: string): boolean {
  const m = content.monsters[id];
  return !!m && !m.dungeonOnly && !/^(dg_|tower_|elite_)/.test(id);
}

/**
 * Leerzustand „Letzter Kampf“: der stärkste Welt-Gegner, der zur Kampfstufe passt (nicht darüber) und wirklich bekämpfbar ist
 * (Zonen-/Slayer-Sperren zählt die Engine). So bietet die Karte immer einen sinnvollen nächsten Schritt statt eines leeren Kastens.
 */
function suggestMonster(state: GameState, cl: number): MonsterDef | undefined {
  let best: MonsterDef | undefined;
  for (const m of Object.values(content.monsters)) {
    if (!isWorldMonster(m.id) || m.level > cl || !canFightMonster(state, content, m.id)) continue;
    if (!best || m.level > best.level) best = m;
  }
  return best;
}

// Rückkehr-Hinweis: die Offline-Bühne wird weggeklickt, bevor man das Hauptmenü ruhig ansieht. Deshalb merkt sich die Seite die
// letzte Zusammenfassung dieser Sitzung (nur Anzeige, nie im Spielstand).
let awayMemo: { who: string; ms: number; xp: number; gold: number } | null = null;

function Icon({ src, fallback }: { src: string | null; fallback?: string }): JSX.Element {
  return src ? (
    <img className="hub-ico" src={src} alt="" loading="lazy" decoding="async" />
  ) : (
    <span className="hub-ico hub-ico--emoji" aria-hidden="true">{fallback ?? "•"}</span>
  );
}

/**
 * Klickbare Karte: ganze Fläche führt zur Zielseite (Enter/Leertaste per Tastatur), eingebettete Knöpfe fangen ihren Klick selbst ab
 * (verschachtelte Interaktive gibt es in HTML sonst nicht, deshalb div + role statt a/button).
 * Einheitlicher Aufbau: Kopf (Symbol, Titel, Marke), Inhalt (Bildband, Text), Fuß (optionale Zeile links, Aktion rechts).
 */
function Card({
  title,
  badge,
  icon,
  iconFallback,
  onOpen,
  cta,
  footLeft,
  className = "",
  index = 0,
  children,
}: {
  title: string;
  badge?: string | null;
  icon: string | null;
  iconFallback?: string;
  onOpen: () => void;
  cta: string;
  footLeft?: ReactNode;
  className?: string;
  index?: number;
  children: ReactNode;
}): JSX.Element {
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      className={`hub-card ${className}`}
      style={{ "--i": index } as CSSProperties}
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      aria-label={title}
    >
      <div className="hub-card-hd">
        <Icon src={icon} fallback={iconFallback} />
        <h3>{title}</h3>
        {badge ? <em>{badge}</em> : null}
      </div>
      <div className="hub-card-body">{children}</div>
      <div className="hub-foot">
        <span className="hub-foot-left">{footLeft}</span>
        <span className="hub-cta">{cta}<i aria-hidden="true">›</i></span>
      </div>
    </div>
  );
}

/**
 * Bildband einer Karte. `item` = Freisteller mittig mit Lichtkegel (Aktions-/Item-Bild), `creature` = Freisteller unten auf einer Szene
 * (Zonen-Kulisse gedimmt), `scene` = Szene füllt das Band (Altar), `camp` = Gebäude aus dem großen Leerraum der Camp-Bilder herangeholt.
 * Der Verlauf unten lässt das Band in die Karte auslaufen.
 */
function Band({ kind, srcs, scene = null }: { kind: "item" | "creature" | "scene" | "camp"; srcs: (string | null)[]; scene?: string | null }): JSX.Element {
  const list = srcs.filter((s): s is string => !!s);
  return (
    <div className={`hub-band hub-band--${kind}`}>
      {scene && <img className="hub-band-scene" src={scene} alt="" loading="lazy" decoding="async" />}
      {list.map((s) => (
        <img key={s} className="hub-band-img" src={s} alt="" loading="lazy" decoding="async" />
      ))}
      <span className="hub-band-fade" aria-hidden="true" />
    </div>
  );
}

/** Leerzustand: das Symbol der Karte groß und gedämpft, darunter ein Satz, der sagt, wie es weitergeht. */
function Empty({ src, fallback, children }: { src: string | null; fallback?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="hub-empty">
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{fallback ?? "•"}</span>}
      <p>{children}</p>
    </div>
  );
}

function Bar({ pct, green = false, thin = false }: { pct: number; green?: boolean; thin?: boolean }): JSX.Element {
  return (
    <div className={`hub-bar${green ? " hub-bar--green" : ""}${thin ? " hub-bar--thin" : ""}`} aria-hidden="true">
      <s style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function HubPage({ onNavigate }: { onNavigate: (id: string) => void }): JSX.Element {
  const state = useGameState();
  const { offlineSummary } = useGameControl();
  const { t, tr } = useI18n();
  const [queueMsg, setQueueMsg] = useState<string | null>(null);
  // claude:2026-10-31T14:40:00+01:00 — Ergebnis „Alle in die Warteschlange“ verschwindet nach einigen Sekunden.
  useEffect(() => {
    if (!queueMsg) return;
    const id = setTimeout(() => setQueueMsg(null), 6000);
    return () => clearTimeout(id);
  }, [queueMsg]);

  // Heutige Tagesaufgaben ziehen (idempotent, wie beim Öffnen der Questseite): sonst zeigt der Hub nach dem Laden den Vortag.
  const day = todayStamp();
  useEffect(() => {
    refreshDailyQuests(state, content, day);
  }, [state, day]);

  // Rückkehr-Hinweis merken (s. awayMemo).
  const who = `${state.character.name}.${state.character.createdAt}`;
  if (offlineSummary && offlineSummary.ms > 60_000) {
    awayMemo = { who, ms: offlineSummary.ms, xp: offlineSummary.xp, gold: offlineSummary.gold };
  }
  const away = awayMemo && awayMemo.who === who ? awayMemo : null;

  // ── Weitermachen ────────────────────────────────────────────────────────────────────────────
  const last = getLastActivity(state);
  const runningAction = state.activeActionId ? content.actions[state.activeActionId] : undefined;
  // claude:2026-10-31T14:40:00+01:00 — Fixwelle C3: „Weitermachen“ nur, wenn die gemerkte Aktion jetzt wirklich startbar ist (Stufe reicht), sonst Leerzustand.
  const resumeAction: ActionDef | undefined =
    runningAction ?? (last.actionId && actionLevelMet(state, content, last.actionId) ? content.actions[last.actionId] : undefined);
  const resumeRunning = !!runningAction;

  // ── Letzter Kampf (sonst Vorschlag) ─────────────────────────────────────────────────────────
  const cl = combatLevel(state);
  const fightingId = state.combat.monsterId;
  const fightingNow = fightingId !== null && !state.combat.dungeonId && state.combat.paragonFloor === undefined && !state.combat.eliteVariantId;
  const fightId = fightingNow ? fightingId : (last.monsterId ?? state.combat.lastKill?.monsterId ?? null);
  // claude:2026-10-31T14:40:00+01:00 — Fixwelle C3: der gemerkte Gegner zählt nur, solange er jetzt bekämpfbar ist (Zonen-/Slayer-Sperren), sonst Vorschlag.
  const knownMonster = fightId && (fightingNow || canFightMonster(state, content, fightId)) ? content.monsters[fightId] : undefined;
  const suggestKey = `${cl}|${state.quests.claimed.length}|${knownMonster ? 1 : 0}`;
  const suggested = useMemo(
    () => (knownMonster ? undefined : suggestMonster(state, cl)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suggestKey],
  );
  const fightMonster = knownMonster ?? suggested;
  const isSuggestion = !knownMonster && !!suggested;
  const canRefight = !!fightMonster && !fightMonster.dungeonOnly;

  // ── Chronik ─────────────────────────────────────────────────────────────────────────────────
  const chronicleKey = Math.floor(state.totalTicks / 10) + state.quests.claimed.length + state.quests.completed.length;
  const story = useMemo(
    () => ({ active: activeChronicleChapter(state, content), count: chronicleChapters(content).length }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chronicleKey],
  );

  // ── Tagesaufgaben ───────────────────────────────────────────────────────────────────────────
  const dailyQuests = state.quests.daily.quests
    .map((e) => content.quests.find((q) => q.id === e.questId))
    .filter((q): q is QuestDef => q !== undefined);
  const dailyClaimed = dailyQuests.filter((q) => isDailyClaimed(state, q.id));
  const dailyOpen = dailyQuests
    .filter((q) => !isDailyClaimed(state, q.id))
    .sort((a, b) => Number(canClaimQuest(state, content, b.id)) - Number(canClaimQuest(state, content, a.id)));

  // ── Warteschlange ───────────────────────────────────────────────────────────────────────────
  const queue = state.actionQueue ?? [];
  // Zeitschätzung ist vergleichsweise teuer: etwa alle 3 Sekunden Spielzeit und bei jeder Änderung der Länge neu.
  const timingKey = Math.floor(state.totalTicks / 30);
  const timing = useMemo(
    () => (queue.length > 0 ? computeQueueTiming(state, content) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timingKey, queue.length, state.activeActionId],
  );

  // ── New Haven ───────────────────────────────────────────────────────────────────────────────
  const job = state.camp?.buildJob ?? null;
  const jobDef = job ? (content.campBuildings ?? []).find((b) => b.id === job.buildingId) : undefined;
  const jobLevelDef = jobDef?.levels[(job?.targetLevel ?? 1) - 1];
  const jobTotal = jobLevelDef ? campBuildDurationMs(state, content, jobLevelDef.buildMs) : 0;
  const buildQueued = state.camp?.buildQueue?.length ?? 0;

  // ── Scherbenaltar ───────────────────────────────────────────────────────────────────────────
  const showAltar = prestigeNavVisible(state);
  const altarKey = Math.floor(state.totalTicks / 30);
  const altar = useMemo(
    () => (showAltar ? { preview: prestigePointsPreview(state, content).total, unlock: prestigeUnlock(state, content) } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showAltar, altarKey],
  );

  const altarFirst = showAltar && prestigeRespecPending(state); // claude:2026-10-31T14:58:54+01:00 — 1.4.2 Narben-Rückgabe

  // ── Aktionen ────────────────────────────────────────────────────────────────────────────────
  const stop = (e: MouseEvent): void => e.stopPropagation();

  const resume = (): void => {
    if (!resumeAction) {
      onNavigate("skills-overview");
      return;
    }
    if (state.activeActionId !== resumeAction.id) setActiveAction(state, content, resumeAction.id, null);
    onNavigate(skillPageId(resumeAction.skill));
  };

  const fightAgain = (): void => {
    if (!fightMonster) {
      onNavigate("combat");
      return;
    }
    // claude:2026-10-31T14:40:00+01:00 — wie der Slayer-Knopf: laufende Aktion wird geparkt (Queue-Front), nicht verworfen.
    if (!fightingNow || fightingId !== fightMonster.id) enqueueFightAtFront(state, content, fightMonster.id, null);
    onNavigate("combat");
  };

  const openChronicle = (): void => {
    requestQuestsTab("chronicle");
    onNavigate("quests");
  };

  const queueAllDailies = (e: MouseEvent): void => {
    stop(e);
    const plans = enqueueAllDailyQuests(state, content);
    const queued = plans.filter((p) => p.ok).length;
    const skipped = plans.filter((p) => !p.ok && p.reason !== "claimed" && p.reason !== "done").length;
    setQueueMsg(
      queued + skipped === 0
        ? t("quests.daily.queueAllNone")
        : t("quests.daily.queueAllResult").replace("{n}", String(queued)).replace("{m}", String(skipped)),
    );
  };

  const openLabel = t("hub.cta.open");

  // ── Charakterkopf ───────────────────────────────────────────────────────────────────────────
  const renderHero = (): JSX.Element => {
    const portrait = getPortrait(state.character.portrait);
    const busyName = runningAction ? tr(runningAction.name) : fightingNow && fightMonster ? tr(fightMonster.name) : null;
    const scars = state.prestige?.points ?? 0;
    return (
      <header className="hub-hero" style={{ "--i": 0 } as CSSProperties}>
        <button type="button" className="hub-portrait" onClick={() => onNavigate("character")} aria-label={state.character.name}>
          {portrait ? <img src={portrait} alt="" decoding="async" /> : <span aria-hidden="true">🧙</span>}
        </button>
        <div className="hub-hero-text">
          <span className="hub-kicker">{t("hub.welcome")}</span>
          <h2>{state.character.name}</h2>
          <div className="hub-levels">
            <span>{t("sidebar.combatLevel")} <b>{cl}</b></span>
            <span>{t("sidebar.totalLevel")} <b>{formatNum(state.character.totalLevel)}</b></span>
            {scars > 0 && <span>{t("prestige.scars")} <b>{formatNum(scars)}</b></span>}
          </div>
          <p className="hub-hero-line">
            {away
              ? t("hub.away").replace("{time}", formatEta(away.ms, t)).replace("{xp}", formatNum(away.xp)).replace("{gold}", formatNum(away.gold))
              : busyName
                ? t(runningAction ? "hub.welcome.busy" : "hub.welcome.fighting").replace("{what}", busyName)
                : t("hub.welcome.idle")}
          </p>
        </div>
      </header>
    );
  };

  // ── Weltleiste ──────────────────────────────────────────────────────────────────────────────
  const renderWorld = (): JSX.Element => {
    const blessing = blessingForTime(Date.now());
    const blessingImg = getBlessingImage(blessing.id);
    const pet = state.character.companionPetId ? content.pets?.[state.character.companionPetId] : undefined;
    const petImg = pet ? getPetSrc(pet.id) : null;
    const ev = state.skillEvents?.active ?? null;
    return (
      <div className="hub-world" style={{ "--i": 1 } as CSSProperties}>
        <span className="hub-chip" title={t(`blessing.flavor.${blessing.id}`)}>
          {blessingImg && <img src={blessingImg} alt="" loading="lazy" decoding="async" />}
          <b>{t(`blessing.name.${blessing.id}`)}</b>
        </span>
        {pet && (
          <button type="button" className="hub-chip hub-chip--link" onClick={() => onNavigate("companions")}>
            {petImg ? <img src={petImg} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">🐾</span>}
            {t("hub.world.companion").replace("{name}", tr(pet.name))}
          </button>
        )}
        {ev && (
          <span className="hub-chip hub-chip--event">
            <span aria-hidden="true">{EVENT_ICON[ev.id]}</span>
            <b>{t(`events.${ev.id}.name`)}</b>
          </span>
        )}
      </div>
    );
  };

  // ── Chronik-Karte ───────────────────────────────────────────────────────────────────────────
  const renderStory = (): JSX.Element | null => {
    if (story.count === 0) return null;
    const warden = getPortrait("npc_warden");
    const a = story.active;
    const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openChronicle();
      }
    };
    const portrait = (
      <div className="hub-story-warden" aria-hidden="true">
        {warden ? <img src={warden} alt="" loading="lazy" decoding="async" /> : <span>📖</span>}
        <em>{t("npc.guide.name")}</em>
      </div>
    );
    if (!a) {
      return (
        <div className="hub-story hub-story--done" style={{ "--i": 2 } as CSSProperties} role="link" tabIndex={0} onClick={openChronicle} onKeyDown={onKey} aria-label={t("chronicle.title")}>
          {portrait}
          <div className="hub-story-main">
            <span className="hub-kicker">{t("chronicle.title")}</span>
            <h3>{t("hub.story.doneTitle")}</h3>
            <p>{t("chronicle.allClaimed")}</p>
            <span className="hub-story-actions">
              <button type="button" className="btn-iron btn-iron--sm hub-story-btn" onClick={(e) => { stop(e); openChronicle(); }}>{t("hub.story.read")}</button>
            </span>
          </div>
        </div>
      );
    }
    const completed = a.status === "completed";
    const text = completed ? (a.quest.loreText ?? a.quest.description) : a.quest.description;
    const goals = a.quest.objectives.slice(0, STORY_GOALS_MAX).map((obj, i) => {
      const prog = Math.min(obj.count, questObjectiveProgress(state, content, a.quest, i));
      return { obj, prog, done: prog >= obj.count };
    });
    return (
      <div className={`hub-story${completed ? " hub-story--ready" : ""}`} style={{ "--i": 2 } as CSSProperties} role="link" tabIndex={0} onClick={openChronicle} onKeyDown={onKey} aria-label={tr(a.quest.name)}>
        {portrait}
        <div className="hub-story-main">
          <div className="hub-story-top">
            <span className="hub-kicker">
              {t("chronicle.title")} · {t("chronicle.chapterOf").replace("{n}", String(a.chapter)).replace("{total}", String(story.count))}
            </span>
            {completed && <em className="hub-story-ready">{t("quests.status.completed")}</em>}
          </div>
          <h3>{tr(a.quest.name)}</h3>
          {text && <p>{tr(text)}</p>}
          <div className="hub-goals">
            {goals.map(({ obj, prog, done }, i) => (
              <div key={i} className={`hub-goal${done ? " hub-goal--done" : ""}`}>
                <span className="hub-goal-label">{done ? "✓ " : ""}{objectiveLabel(obj, t, tr)}</span>
                <span className="hub-goal-count">{formatNum(prog)} / {formatNum(obj.count)}</span>
                <Bar pct={(prog / Math.max(1, obj.count)) * 100} green={done} />
              </div>
            ))}
          </div>
          <span className="hub-story-actions">
            <button type="button" className="btn-iron btn-iron--sm hub-story-btn" onClick={(e) => { stop(e); openChronicle(); }}>{t("hub.story.open")}</button>
          </span>
        </div>
      </div>
    );
  };

  // ── Karten ──────────────────────────────────────────────────────────────────────────────────
  const renderResume = (): JSX.Element => {
    if (!resumeAction) {
      return (
        <Card title={t("hub.resume.title")} icon={getSidebarIcon("skills-overview")} onOpen={() => onNavigate("skills-overview")} cta={openLabel} className="hub-card--dock" index={3}>
          <Empty src={getSidebarIcon("skills-overview")} fallback="📚">{t("hub.resume.none")}</Empty>
        </Card>
      );
    }
    const skillName = tr(content.skills[resumeAction.skill]?.name ?? { en: resumeAction.skill, de: resumeAction.skill });
    const xp = state.skills[resumeAction.skill]?.xp ?? 0;
    const level = levelFromXp(xp);
    const curFloor = xpForLevel(level);
    const nextFloor = xpForLevel(level + 1);
    const maxed = nextFloor <= curFloor;
    const rate = computeActionRate(state, content, resumeAction);
    const etaMs = rate.xpPerHour > 0 ? ((nextFloor - xp) / rate.xpPerHour) * 3_600_000 : 0;
    const stopped = !resumeRunning && state.lastStop?.actionId === resumeAction.id ? t(stopReasonKey(state.lastStop.reason)) : null;
    return (
      <Card
        title={t("hub.resume.title")}
        badge={t("hub.resume.level").replace("{n}", String(level))}
        icon={skillIconSrc(resumeAction.skill)}
        iconFallback={SKILL_EMOJI_FALLBACK[resumeAction.skill]}
        onOpen={resume}
        cta={t("hub.resume.title")}
        footLeft={
          <span className={`hub-state${resumeRunning ? " hub-state--on" : ""}`}>
            <u aria-hidden="true" />
            {t(resumeRunning ? "hub.resume.running" : "hub.resume.paused")}
          </span>
        }
        className="hub-card--dock"
        index={3}
      >
        <Band kind="item" srcs={[actionImage(resumeAction) ?? skillIconSrc(resumeAction.skill)]} />
        <div className="hub-card-text">
          <div className="hub-big">{tr(resumeAction.name)}</div>
          <div className="hub-sub">
            {skillName} · <b>{t("skill.xpRate").replace("{n}", formatNum(Math.round(rate.xpPerHour)))}</b>
          </div>
          {stopped && <div className="hub-sub hub-sub--warn">{stopped}</div>}
          {!maxed && (
            <>
              <Bar pct={((xp - curFloor) / (nextFloor - curFloor)) * 100} />
              <div className="hub-xp">
                <span>{t("hub.resume.toNext").replace("{n}", formatNum(nextFloor - xp)).replace("{lvl}", String(level + 1))}</span>
                {etaMs > 0 && <span>{t("hub.resume.eta").replace("{time}", formatEta(etaMs, t))}</span>}
              </div>
            </>
          )}
        </div>
      </Card>
    );
  };

  const renderFight = (): JSX.Element => {
    if (!fightMonster) {
      return (
        <Card title={t("hub.fight.title")} icon={getSidebarIcon("combat")} onOpen={() => onNavigate("combat")} cta={openLabel} className="hub-card--dock" index={4}>
          <Empty src={getSidebarIcon("combat")} fallback="⚔">{t("hub.fight.none")}</Empty>
        </Card>
      );
    }
    const kills = state.monsterKills?.[fightMonster.id] ?? 0;
    return (
      <Card
        title={t(isSuggestion ? "hub.fight.suggest" : "hub.fight.title")}
        badge={fightingNow ? t("hub.fight.now") : t("hub.resume.level").replace("{n}", String(fightMonster.level))}
        icon={getSidebarIcon("combat")}
        onOpen={fightAgain}
        cta={t(!canRefight || fightingNow ? "hub.fight.open" : isSuggestion ? "hub.fight.start" : "hub.fight.again")}
        className="hub-card--dock"
        index={4}
      >
        <Band kind="creature" srcs={[getMonsterSrc(fightMonster.id)]} scene={getZoneBackgroundCard(fightMonster.zone)} />
        <div className="hub-card-text">
          <div className="hub-big">{tr(fightMonster.name)}</div>
          <div className="hub-sub">
            {isSuggestion ? t("hub.fight.suggestHint").replace("{n}", String(cl)) : t("hub.fight.kills").replace("{n}", formatNum(kills))}
          </div>
        </div>
      </Card>
    );
  };

  const renderDaily = (): JSX.Element => (
    <Card
      title={t("hub.daily.title")}
      badge={dailyQuests.length > 0 ? `${dailyClaimed.length} / ${dailyQuests.length}` : null}
      icon={CALENDAR_ICON}
      iconFallback="📅"
      onOpen={() => {
        requestQuestsTab("daily");
        onNavigate("quests");
      }}
      cta={openLabel}
      index={3}
      className="hub-card--daily"
      footLeft={
        dailyOpen.length > 0 ? (
          <span className="hub-actions">
            <button type="button" className="shop-citadel-btn hub-btn" onClick={queueAllDailies} onKeyDown={(e) => e.stopPropagation()}>
              {t("quests.daily.queueAll")}
            </button>
            {queueMsg && <span className="hub-msg" role="status">{queueMsg}</span>}
          </span>
        ) : null
      }
    >
      {dailyQuests.length > 0 && (
        <div className="hub-pips" aria-hidden="true">
          {dailyQuests.map((q) => (
            <u key={q.id} className={isDailyClaimed(state, q.id) ? "f" : undefined} />
          ))}
        </div>
      )}
      {dailyQuests.length === 0 && <p className="hub-note">{t("hub.daily.empty")}</p>}
      {dailyQuests.length > 0 && dailyOpen.length === 0 && <p className="hub-note">{t("hub.daily.allDone")}</p>}
      {/* claude:2026-11-01T11:49:52+01:00 — Chef 01.11.: alle offenen Tagesaufgaben in einem Scrollbereich, der den Platz der Karte
          füllt (vorher nur 3 + „weitere“, obwohl Platz war). */}
      {dailyOpen.length > 0 && (
        <div className="hub-scroll">
          {dailyOpen.map((q) => {
            const claimable = canClaimQuest(state, content, q.id);
            const idx = q.objectives.findIndex((o, i) => questObjectiveProgress(state, content, q, i) < o.count);
            const obj = q.objectives[idx < 0 ? 0 : idx];
            const prog = obj ? Math.min(obj.count, questObjectiveProgress(state, content, q, idx < 0 ? 0 : idx)) : 0;
            return (
              <div key={q.id} className="hub-item">
                <div className="hub-row">
                  <span className="hub-row-name">{tr(q.name)}</span>
                  <span className={`hub-row-meta${claimable ? " hub-row-meta--ok" : ""}`}>
                    {claimable ? t("hub.daily.ready") : `${formatNum(prog)} / ${formatNum(obj?.count ?? 0)}`}
                  </span>
                </div>
                <Bar pct={claimable ? 100 : (prog / Math.max(1, obj?.count ?? 1)) * 100} thin green={claimable} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  const renderQueue = (): JSX.Element => {
    interface QRow {
      key: string;
      icon: string | null;
      emoji?: string;
      name: string;
      meta: string;
      running?: boolean;
    }
    const rows: QRow[] = [];
    if (runningAction) {
      rows.push({
        key: "active",
        icon: actionImage(runningAction),
        emoji: SKILL_EMOJI_FALLBACK[runningAction.skill],
        name: tr(runningAction.name),
        meta: state.actionTarget ? `×${formatNum(state.actionTarget)}` : "∞",
        running: true,
      });
    } else if (fightingNow && fightMonster) {
      rows.push({ key: "fight-now", icon: getMonsterSrc(fightMonster.id), emoji: "⚔", name: tr(fightMonster.name), meta: "∞", running: true });
    }
    queue.forEach((entry, i) => {
      const tm = timing?.queue[i];
      // claude:2026-10-30T20:41:00+01:00 — ohne Material zeigt der Eintrag „Material fehlt“ statt einer falschen 0-Minuten-Dauer.
      const meta = tm
        ? tm.infinite ? "∞"
          : tm.unknown ? ""
          : tm.materialLimited && (tm.reachableCount ?? 0) === 0 ? t("queue.row.materialMissing")
          : formatEta(tm.remainingMs ?? 0, t)
        : "";
      const times = entry.target ? ` ×${formatNum(entry.target)}` : "";
      if (isFightQueueEntry(entry)) {
        const m = content.monsters[entry.monsterId];
        rows.push({ key: `q${i}`, icon: getMonsterSrc(entry.monsterId), emoji: "⚔", name: `${m ? tr(m.name) : entry.monsterId}${times}`, meta });
      } else if (isDungeonQueueEntry(entry)) {
        const d = content.dungeons.find((x) => x.id === entry.dungeonId);
        rows.push({ key: `q${i}`, icon: getSidebarIcon("combat"), emoji: "⚔", name: `${d ? tr(d.name) : entry.dungeonId}${times}`, meta });
      } else if (isRaidQueueEntry(entry)) {
        const r = (content.raids ?? []).find((x) => x.id === entry.raidId);
        rows.push({ key: `q${i}`, icon: getSidebarIcon("combat"), emoji: "⚔", name: `${r ? tr(r.name) : entry.raidId}${times}`, meta });
      } else {
        const a = content.actions[entry.actionId];
        rows.push({
          key: `q${i}`,
          icon: a ? actionImage(a) : null,
          emoji: a ? SKILL_EMOJI_FALLBACK[a.skill] : undefined,
          name: `${a ? tr(a.name) : entry.actionId}${times}`,
          meta,
        });
      }
    });
    const shown = rows.slice(0, QUEUE_ROWS_MAX);
    return (
      <Card
        title={t("hub.queue.title")}
        badge={queue.length > 0 ? String(queue.length) : null}
        icon={QUEUE_ICON}
        iconFallback="📋"
        onOpen={() => onNavigate(runningAction ? skillPageId(runningAction.skill) : "skills-overview")}
        cta={openLabel}
        index={4}
        footLeft={state.queuePaused && queue.length > 0 ? <span className="hub-sub--warn">{t("hub.queue.paused")}</span> : null}
      >
        {shown.length === 0 && <Empty src={QUEUE_ICON} fallback="📋">{t("hub.queue.empty")}</Empty>}
        {shown.map((r) => (
          <div key={r.key} className={`hub-row hub-row--icon${r.running ? " hub-row--running" : ""}`}>
            <Icon src={r.icon} fallback={r.emoji} />
            <span className="hub-row-name" title={r.name}>{r.name}</span>
            <span className="hub-row-meta">{r.meta}</span>
          </div>
        ))}
        {rows.length > shown.length && <div className="hub-more">{t("hub.more").replace("{n}", String(rows.length - shown.length))}</div>}
      </Card>
    );
  };

  const renderOrders = (): JSX.Element => {
    const orders = state.workOrders;
    const open = orders?.open ?? [];
    return (
      <Card
        title={t("hub.orders.title")}
        badge={open.length > 0 ? String(open.length) : null}
        icon={getSidebarIcon("quests")}
        iconFallback="📜"
        onOpen={() => {
          // Reiter „Arbeitsaufträge“ direkt öffnen (derselbe einmalige Bus wie die Taverne, navigation.ts).
          requestQuestsTab("orders");
          onNavigate("quests");
        }}
        cta={openLabel}
        index={5}
        footLeft={orders?.offer ? <span className="hub-sub--gold">{t("hub.orders.offer")}</span> : null}
      >
        {open.length === 0 && !orders?.offer && <Empty src={getSidebarIcon("quests")} fallback="📜">{t("hub.orders.empty")}</Empty>}
        {open.slice(0, ORDER_ROWS_MAX).map((o) => {
          const p = workOrderProgress(state, o);
          const item = content.items[o.itemId];
          return (
            <div key={o.id} className="hub-item">
              <div className="hub-row hub-row--icon">
                <Icon src={item ? getItemImage(o.itemId) : null} fallback="📦" />
                <span className="hub-row-name">{item ? tr(item.name) : o.itemId}</span>
                <span className={`hub-row-meta${p.ready ? " hub-row-meta--ok" : ""}`}>{p.ready ? t("hub.orders.ready") : `${formatNum(p.done)} / ${formatNum(p.count)}`}</span>
              </div>
              <div className="hub-order-line">
                <OrderTierMark tier={o.tier ?? 2} compact />
                <Bar pct={(p.done / Math.max(1, p.count)) * 100} green thin />
              </div>
            </div>
          );
        })}
        {open.length > ORDER_ROWS_MAX && <div className="hub-more">{t("hub.more").replace("{n}", String(open.length - ORDER_ROWS_MAX))}</div>}
      </Card>
    );
  };

  const renderSlayer = (): JSX.Element => {
    const task = state.slayerTask;
    const monster = task ? content.monsters[task.monsterId] : undefined;
    return (
      <Card
        title={t("hub.slayer.title")}
        icon={getSidebarIcon("slayer")}
        iconFallback="💀"
        onOpen={() => onNavigate("slayer")}
        cta={openLabel}
        index={3}
      >
        {task ? (
          <>
            <Band kind="creature" srcs={[getMonsterSrc(task.monsterId)]} scene={getZoneBackgroundCard(monster?.zone)} />
            <div className="hub-big">{monster ? tr(monster.name) : task.monsterId}</div>
            <Bar pct={(task.progress / Math.max(1, task.required)) * 100} />
            <div className="hub-xp">
              <span>{formatNum(task.progress)} / {formatNum(task.required)}</span>
              <span>{t("hub.slayer.left").replace("{n}", formatNum(Math.max(0, task.required - task.progress)))}</span>
            </div>
          </>
        ) : (
          <Empty src={getSidebarIcon("slayer")} fallback="💀">{t("hub.slayer.none")}</Empty>
        )}
      </Card>
    );
  };

  const renderCamp = (): JSX.Element => {
    const art = job ? (getCampImage(job.buildingId, job.targetLevel - 1) ?? getCampImage(job.buildingId, job.targetLevel)) : null;
    return (
      <Card
        title={t("nav.newhaven")}
        icon={getSidebarIcon("newhaven")}
        onOpen={() => onNavigate("newhaven")}
        cta={openLabel}
        index={4}
        footLeft={buildQueued > 0 && job ? <span>{t("hub.camp.queued").replace("{n}", String(buildQueued))}</span> : null}
      >
        <Band kind={art ? "camp" : "item"} srcs={[art ?? campIdleIcon]} />
        {job ? (
          <>
            <div className="hub-big">
              {jobDef ? tr(jobDef.name) : job.buildingId} · {romanLevel(job.targetLevel)}
            </div>
            <Bar pct={jobTotal > 0 ? (1 - job.remainingMs / jobTotal) * 100 : 0} />
            <div className="hub-xp">
              <span>{t("hub.camp.remaining").replace("{time}", formatEta(job.remainingMs, t))}</span>
            </div>
          </>
        ) : (
          <p className="hub-note">{t(buildQueued > 0 ? "hub.camp.waiting" : "hub.camp.idle")}</p>
        )}
      </Card>
    );
  };

  const renderAltar = (): JSX.Element | null => {
    if (!showAltar || !altar) return null;
    const notch = getAshNotchArt();
    // claude:2026-10-31T14:58:54+01:00 — 1.4.2 Narben-Rückgabe: bis „Verstanden“ glüht die Karte und trägt das Band samt Narben-Guthaben.
    const respec = prestigeRespecPending(state);
    return (
      <Card
        title={t("nav.prestige")}
        icon={notch ?? getSidebarIcon("prestige")}
        iconFallback="🕯️"
        onOpen={() => onNavigate("prestige")}
        cta={openLabel}
        index={5}
        className={respec ? `hub-card--respec${effectiveFxLevel() === "off" ? " is-still" : ""}` : ""}
      >
        {respec && (
          <div className="hub-respec">
            <span className="hub-respec-band">{t("prestige.respec.band")}</span>
            <span className="hub-respec-line">{t("prestige.respec.hub").replace("{n}", formatNum(state.prestige?.points ?? 0))}</span>
          </div>
        )}
        <Band kind="scene" srcs={[getAltarScene()]} />
        {altar.unlock.ok ? (
          <div className="hub-sub">{t("hub.altar.ready").replace("{n}", formatNum(altar.preview))}</div>
        ) : (
          <div className="hub-sub">
            {t("hub.altar.preview").replace("{n}", formatNum(altar.preview))}
            <br />
            {t("hub.altar.locked").replace("{a}", String(altar.unlock.skills99)).replace("{b}", String(altar.unlock.required))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="hub-page">
      <div className="hub-shade" aria-hidden="true" />
      <div className="hub-layer">
        <div className="hub-col hub-col--left">
          {renderDaily()}
          {renderQueue()}
          {renderOrders()}
        </div>
        <div className="hub-mid">
          <div className="hub-top">
            {renderHero()}
            {renderWorld()}
          </div>
          <div className="hub-stage">
            {renderStory()}
            <div className="hub-dock">
              {renderResume()}
              {renderFight()}
            </div>
          </div>
        </div>
        <div className="hub-col hub-col--right">
          {/* claude:2026-10-31T14:58:54+01:00 — 1.4.2 Narben-Rückgabe: solange der Hinweis offen ist, steht die Altar-Karte oben in der Spalte. */}
          {altarFirst && renderAltar()}
          {renderSlayer()}
          {renderCamp()}
          {!altarFirst && renderAltar()}
        </div>
      </div>
    </div>
  );
}
