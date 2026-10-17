import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { content } from "@hearthforge/content";
import { combatLevel, computeStats, dungeonRunProgress, effectiveActionDurationMs, effectiveCapacity, levelFromXp, stopCombat, usedCapacityUnits, xpForLevel } from "@hearthforge/engine";
import type { GameState, SkillId } from "@hearthforge/shared";
import { activeStanceMods, TAVERN_ENABLED } from "@hearthforge/shared";
import { computeActionRate, formatEta } from "./util/actionRate";
import {
  type CombatFxLevel,
  getCombatFxLevel,
  getTopBarHeight,
  setTopBarHeight,
  TOPBAR_HEIGHT_DEFAULT,
  TOPBAR_HEIGHT_MAX,
  TOPBAR_HEIGHT_MIN,
  TOPBAR_HEIGHT_REFERENCE,
} from "./util/uiPrefs";
import { useAnimatedNumber } from "./util/useAnimatedNumber";
import { AmbientEffects } from "./components/AmbientEffects";
import { ScreenFade } from "./components/ScreenFade";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { closeItemTooltip, ItemTooltipOverlay } from "./components/ItemTooltip";
import { ItemWikiModalOverlay } from "./components/ItemWikiModal";
import { EncyclopediaModalOverlay } from "./components/EncyclopediaModal";
import { GameAlerts } from "./components/GameAlert";
import { QueueAmountModalHost } from "./components/QueueAmountModal";
import { UpdateNotice } from "./components/UpdateNotice";
import { Toasts } from "./components/Toasts";
import { DevSpeedPanel } from "./components/DevSpeedPanel";
import { ActionQueuePanel } from "./components/ActionQueuePanel";
import { EliteMiniWindow } from "./components/EliteMiniWindow";
import { PetCelebration } from "./components/PetCelebration";
import { MasteryCeremony } from "./components/MasteryCeremony";
import { DungeonClearCeremony } from "./components/DungeonClearCeremony";
import { ChampionDefeatCeremony } from "./components/ChampionDefeatCeremony";
import { ApMilestoneCeremony } from "./components/ApMilestoneCeremony";
import { DeathPopup } from "./components/DeathPopup";
import { StalematePopup } from "./components/StalematePopup";
import { OnboardingGuide } from "./components/OnboardingGuide";
import { FeatureTourGuide } from "./components/FeatureTourGuide";
import { FEATURE_TOUR_STEPS, FEATURE_TOUR_STEPS_V2 } from "./areaTourSteps";
import { BugReportDialog } from "./components/BugReportDialog";
import { startMusic, stopMusic } from "./util/music";
import { playSfx } from "./util/audio";
import { I18nProvider, useI18n } from "./i18n";
import { GameProvider, useGameControl, useGameSelector, useGetGameState, tupleEquals } from "./game/GameContext";
// UI-Scale entfernt (Polish-Sprint 2026-07): immer 100 % — evtl. Alt-Zoom aus früheren Versionen zurücksetzen.
document.documentElement.style.removeProperty("zoom");
localStorage.removeItem("hf.uiScale");
import { persistFullscreen } from "./util/display";
import { closeTopEscTarget, hasOpenModal } from "./util/escStack";
import { findPage, getSidebarPages } from "./navigation";
import { getSkillJumpNav, subscribeSkillJump } from "./util/skillJump";
import { getMonsterJumpNav, subscribeMonsterJump } from "./util/monsterJump";
import { getSidebarIcon } from "./sidebarIcons";
import { getUiIcon } from "./uiIcons";
import { formatNum } from "./util/format";
import { getPortrait, listPortraits } from "./portraits";
import { CharacterCreation } from "./pages/CharacterCreation";
import { CharacterPage } from "./pages/CharacterPage";
import { CombatPage } from "./pages/CombatPage";
import { IntroSequence } from "./pages/IntroSequence";
import { OfflinePopup } from "./pages/OfflinePopup";
import { OptionsPage } from "./pages/OptionsPage";
import { ShopPage } from "./pages/ShopPage";
import { BankPage } from "./pages/BankPage";
import { StatsPage } from "./pages/StatsPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { SkillPage } from "./pages/SkillPage";
import { SkillsOverviewPage } from "./pages/SkillsOverviewPage";
import { MasteryPage } from "./pages/MasteryPage";
import { BestiaryPage } from "./pages/BestiaryPage";
import { QuestsPage } from "./pages/QuestsPage";
import { AchievementsPage } from "./pages/AchievementsPage";
import { PetGalleryPage } from "./pages/PetGalleryPage";
import { FarmPage } from "./pages/FarmPage";
import { HuntingPage } from "./pages/HuntingPage";
import { SlayerPage } from "./pages/SlayerPage";
import { EnchantingPage } from "./pages/EnchantingPage";
import { MailPage } from "./pages/MailPage";
import { NewHavenPage } from "./pages/NewHavenPage";
import { TavernPage } from "./pages/TavernPage";

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");
const INVENTORY_ICON_URL = getUiIcon("icon_inventory");
const SHIELD_ICON_URL = getUiIcon("icon_attribute_defense");
const COMBAT_VS_ICON_URL = getUiIcon("icon_combat");
// Kopfzeile links (Chef #215): Charakter-Name + Kampf-/Gesamtlevel — dieselben
// Sidebar-Icons, die vorher in der jetzt entfernten Sidebar-Charakterkarte saßen.
const CHARINFO_COMBAT_ICON_URL = getSidebarIcon("combat");
const CHARINFO_TOTAL_ICON_URL = getSidebarIcon("skills-overview");

function PageContent({
  pageId,
  onNavigate,
}: {
  pageId: string;
  onNavigate: (id: string) => void;
}): JSX.Element {
  const page = findPage(pageId);
  if (!page) return <PlaceholderPage label="app.unknown" />;

  switch (page.view) {
    case "character":
      return <CharacterPage />;
    case "combat":
      return <CombatPage />;
    case "shop":
      return <ShopPage />;
    case "bank":
      return <BankPage />;
    case "options":
      return <OptionsPage />;
    case "mail":
      return <MailPage />;
    case "stats":
      return <StatsPage />;
    case "skills-overview":
      return <SkillsOverviewPage onNavigate={onNavigate} />;
    case "mastery":
      return <MasteryPage />;
    case "bestiary":
      return <BestiaryPage onNavigate={onNavigate} />;
    case "achievements":
      return <AchievementsPage />;
    case "companions":
      return <PetGalleryPage />;
    case "quests":
      return <QuestsPage />;
    case "skill":
      if (page.skillId === "farming") return <FarmPage />;
      if (page.skillId === "slayer") return <SlayerPage onNavigate={onNavigate} />;
      if (page.skillId === "hunting") return <HuntingPage onNavigate={onNavigate} />;
      // key erzwingt einen Remount pro Skill — sonst recycelt React dieselbe Instanz bei
      // Skill→Skill-Navigation und der lokale Kategorie-Collapse-State (SkillPage.tsx) leckt
      // zwischen Skills (verschärft dadurch, dass Smithing/Leatherworking dieselben Kategorie-IDs teilen).
      return <SkillPage key={page.skillId ?? ""} skillId={page.skillId ?? ""} />;
    case "enchanting":
      return <EnchantingPage />;
    case "newhaven":
      return <NewHavenPage onNavigate={onNavigate} />;
    case "tavern":
      // Release-Schalter: ohne Taverne landet die (unerreichbare) Route auf New Haven.
      return TAVERN_ENABLED ? <TavernPage onNavigate={onNavigate} /> : <NewHavenPage onNavigate={onNavigate} />;
    default:
      return <PlaceholderPage label={page.label} />;
  }
}

const HOUR_MS = 3_600_000;
/** Anzahl der WoW-Stil-Segmente je Leiste (Chef-Vorgabe: 10, NICHT die 20 aus echtem WoW). */
const SEGMENT_COUNT = 10;

/**
 * Fortschritts-Leiste mit WoW-Stil-Segmentierung (Chef 2026-07-04, 3. Korrektur — Feinschliff):
 * die 10-Fenster-Unterteilung ist eine rein OPTISCHE Rahmen-Auflage, der Füllstand selbst ist
 * EINE durchgehende Schicht (`.tb-bar-fill`, Breite = Gesamtfortschritt %), die glatt über die
 * volle Breite gleitet — KEIN per-Segment-Nachladen (das war die vorherige Iteration). Vier
 * deckungsgleiche Ebenen (siehe topbar.css .tb-bar*): 1) leerer Track, 2) die eine durchgehende
 * Füllung, 3) ein durchgehender Glanz-Overlay, 4) 10 Rahmen-„Fenster" (transparent, nur der
 * Holzrahmen ist opak) — teilt die Füllung optisch in 10 Fächer, ohne sie zu unterbrechen.
 * `centerLabel` liegt (wie die Level-Leiste) IMMER mittig über der ganzen Reihe; `rightLabel`
 * ist optional zusätzlich rechtsbündig (XP/h · Einheiten/h der Aktions-Leiste).
 */
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
    // codex:2026-09-10T10:35:00+02:00 — Fortschritt bleibt auch ohne die dekorativen Segmente zugänglich.
    <div className={`tb-bar tb-bar--${variant}${empty ? " tb-bar--empty" : ""}`} title={title}
      role="progressbar" aria-label={title ?? centerLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
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

  // codex:2026-09-10T10:35:00+02:00 — Der Aktionsname steht darüber; die Leiste ergänzt den Fortschritt.
  const centerLabel = action
    ? `${t("skill.doing")} · ${Math.floor(progressPct)}%`
    : inCombat
      ? t("topbar.bar.inCombat")
      : t("header.idle");
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
      title={action ? `${tr(action.name)} — ${centerLabel}${rightLabel ? ` — ${rightLabel}` : ""}` : centerLabel}
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
  // codex:2026-09-10T10:35:00+02:00 — Kampf bleibt Teil des Render-Gates; der aufgelöste Skill liefert seinen eigenen Namen.
  const [skillId, skillXp, gatedActiveActionId] = useGameSelector((s) => {
    const id = resolveTrackedSkillId(s, viewedSkillId);
    return [id, id ? s.skills[id]?.xp ?? 0 : 0, s.activeActionId, s.combat.monsterId != null] as const;
  }, tupleEquals);
  const state = getState()!;
  const { t, tr } = useI18n();
  const action = gatedActiveActionId ? content.actions[gatedActiveActionId] : undefined;
  const level = skillId ? levelFromXp(skillXp) : 0;
  const xpStart = skillId ? xpForLevel(level) : 0;
  const xpEnd = skillId ? xpForLevel(level + 1) : 1;
  const progressPct = skillId && xpEnd > xpStart
    ? Math.min(100, Math.max(0, ((skillXp - xpStart) / (xpEnd - xpStart)) * 100))
    : 0;
  // codex:2026-09-10T10:35:00+02:00 — Betrachteter Skill kann von der laufenden Aktion abweichen: immer benennen.
  const trackedSkillPrefix = skillId
    ? `${tr(content.skills[skillId]?.name ?? { en: skillId })} · `
    : "";
  const centerLabel = skillId
    ? `${trackedSkillPrefix}${t("skill.level").replace("{n}", String(level))} · ${Math.floor(progressPct)}% · ${formatNum(skillXp - xpStart)} / ${formatNum(xpEnd - xpStart)}`
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
    activity = <span className="activity muted">{t("header.idle")}</span>;
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
function usePortraitFallback(): void {
  // Perf-Welle (2026-07-22): `useGameState()` hätte MainLayout (die aufrufende Komponente, s.u.)
  // an jeden 10-Hz-Tick gebunden — nur um EINMAL beim Mount zu lesen. `getState()` (ControlContext,
  // s. GameContext.tsx-JSDoc) liest denselben State ohne Tick-Abo; ControlContext bleibt über
  // Ticks hinweg referenzstabil, MainLayout re-rendert also nicht mehr bloß wegen dieses Hooks.
  const { saveGame, getState } = useGameControl();
  useEffect(() => {
    const state = getState();
    if (!state) return; // defensiv: sollte hier immer aktiv sein (MainLayout nur bei screen==="playing").
    const c = state.character;
    if (getPortrait(c.portrait) !== null) return; // Portrait existiert noch — nichts zu tun.
    const valid = listPortraits();
    const pick = valid[Math.floor(Math.random() * valid.length)];
    if (!pick) return; // defensiv: keine Portrait-Assets vorhanden.
    c.portrait = pick.id;
    void saveGame();
    // Bewusst [] — einmalig pro Mount (pro geladener/neuer Session); getState/saveGame sind für die
    // Lebensdauer dieses Screens stabile Referenzen (ControlContext bleibt tick-unabhängig stabil).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function MainLayout(): JSX.Element {
  const { t } = useI18n();
  usePortraitFallback();
  // Kosmetik-Sweep T1: der Item-Tooltip-Store ist modul-global (ItemTooltip.tsx) und überlebt
  // Screen-Wechsel — nach dem Laden eines Spielstands (Menü → hier) blieb dadurch gelegentlich ein
  // gepinntes Tooltip aus der VORHERIGEN Ansicht sichtbar (Menü-Slot-Karten sind ebenfalls Item-
  // Zellen). MainLayout mountet frisch bei jedem Laden/Neu-Erstellen (key={sessionEpoch}, s.
  // usePortraitFallback-JSDoc) — ein Hard-Close hier räumt zuverlässig auf, auch gepinnt.
  useEffect(() => {
    closeItemTooltip();
  }, []);
  const [activePageId, setActivePageId] = useState("character");
  const page = findPage(activePageId);
  // Wiki→Rezept-Sprung (util/skillJump.ts): ItemWikiModalOverlay sitzt außerhalb dieses
  // Baums (s. App.tsx-Wurzel unten) und kann activePageId nicht direkt setzen — ein Klick auf
  // eine Quelle-/Verwendungs-Zeile im Item-Wiki meldet die Navigation hier über den
  // modul-globalen Store an. Die Ziel-Aktion selbst (welche Karte aufklappen/hervorheben) liest
  // die frisch gemountete SkillPage separat per consumeSkillJumpTarget.
  const skillJumpNav = useSyncExternalStore(subscribeSkillJump, getSkillJumpNav);
  useEffect(() => {
    if (skillJumpNav) setActivePageId(skillJumpNav.pageId);
  }, [skillJumpNav]);
  // Wiki→Kampfgebiet-Sprung (util/monsterJump.ts): spiegelt den Rezept-Sprung oben — ein Klick auf
  // eine Monster-Quelle-Zeile im Item-Wiki meldet die Navigation zur Kampf-Seite hier an. Die
  // Ziel-Monster-ID selbst (welche Zone öffnen, welche Karte hervorheben) liest CombatPage separat
  // per consumeMonsterJumpTarget.
  const monsterJumpNav = useSyncExternalStore(subscribeMonsterJump, getMonsterJumpNav);
  useEffect(() => {
    if (monsterJumpNav) setActivePageId(monsterJumpNav.pageId);
  }, [monsterJumpNav]);
  // Report-Bug-Feature (Chef-Auftrag 2026-07-18): lebt hier statt in OnboardingGuide, damit ein
  // Escape/Skip, das den Guide schließt, einen bereits offenen Dialog nicht mit unmountet (s.
  // OnboardingGuideProps-JSDoc). Nur der Guide-Abschluss-Schritt öffnet ihn (onOpenBugReport unten);
  // Options-Seite/Hauptmenü haben je ihre eigene, lokale Dialog-Instanz.
  const [showBugReport, setShowBugReport] = useState(false);
  // Chef-Sound 2026-07-11: page_open.wav bei JEDEM Seitenwechsel im Spiel — bewusst NICHT beim
  // ersten Mount (Spielstart soll nicht ploppen), daher der Skip-Ref auf den ersten Lauf.
  const firstPageRef = useRef(true);
  useEffect(() => {
    if (firstPageRef.current) {
      firstPageRef.current = false;
      return;
    }
    playSfx("pageOpen");
  }, [activePageId]);
  // Real sidebar PNG for this page (exists for all skill pages + any page with an icon PNG)
  const sidebarIconUrl = page ? getSidebarIcon(page.id) : null;
  // Auf einer Skill-Seite (Skill/Farming/Slayer) soll die Level-XP-Leiste unten in dieser Bar die
  // BETRACHTETE Fertigkeit zeigen statt nur die der aktiven Aktion (Chef-Wunsch: die Seiten-eigene
  // XP-Leiste wurde entfernt, die Title-Bar ist jetzt die einzige XP-Anzeige — auch im Idle).
  const viewedSkillId = page?.view === "skill" ? page.skillId ?? null : null;

  // Hintergrundmusik nur im Spiel (startet nur, wenn vom Spieler aktiviert) + Stop beim Verlassen.
  useEffect(() => {
    startMusic();
    return () => stopMusic();
  }, []);

  // Trailer-Autoscroll (Chef 2026-07-12, Video-Erstellung): F1 = sanftes, STETIGES Runterscrollen
  // des Seiteninhalts (.content-body) für Kamera-Fahrten über Skill-Listen & Co. — F1 erneut
  // stoppt, Shift+F1 startet das schnellere Tempo. Stoppt von selbst am Seitenende oder sobald
  // der Nutzer eingreift (Mausrad). rAF mit Delta-Zeit + Float-Akkumulator ⇒ butterweich und
  // framerate-unabhängig (auch bei 120-Hz-Aufnahmen gleichmäßig).
  // UI-Brainstorm A6 (2026-07-24, -ergonomie.md §4.1): F1 ist überall sonst die Standard-„Hilfe"-
  // Taste — ohne Dev-Gate begann die Seite bei einem neugierigen Spieler lautlos zu scrollen, ohne
  // jede Kennzeichnung. Jetzt hinter import.meta.env.DEV, identisches Muster wie der `?levelTest`-
  // Hook (LevelXpBar, s. oben) — Marketing/Trailer-Aufnahmen laufen ohnehin aus einer Dev-Umgebung.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const SLOW = 180; // px/s — Trailer-Fahrt (Chef 2026-07-12: von 40 hochgestellt)
    const FAST = 360; // px/s — doppeltes Tempo für lange Listen (Shift+F1)
    let raf = 0;
    let last = 0;
    let pos = 0;
    let speed = 0; // 0 = aus
    const stop = (): void => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      speed = 0;
      last = 0;
    };
    const frame = (t: number): void => {
      const scroller = document.querySelector<HTMLElement>(".content-body");
      if (!scroller || speed === 0) return stop();
      if (last) {
        const max = scroller.scrollHeight - scroller.clientHeight;
        pos = Math.min(pos + (speed * (t - last)) / 1000, max);
        scroller.scrollTop = pos;
        if (pos >= max - 0.5) return stop(); // unten angekommen
      }
      last = t;
      raf = requestAnimationFrame(frame);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "F1") return;
      e.preventDefault();
      if (speed > 0) return stop(); // Toggle: läuft schon → anhalten
      const scroller = document.querySelector<HTMLElement>(".content-body");
      if (!scroller) return;
      pos = scroller.scrollTop;
      speed = e.shiftKey ? FAST : SLOW;
      raf = requestAnimationFrame(frame);
    };
    const onWheel = (): void => {
      if (speed > 0) stop(); // manueller Eingriff gewinnt immer
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      stop();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Chef-GO Hotkeys (2026-07-09): Ziffern 1–9 springen direkt zu den ersten 9 Sidebar-Einträgen,
  // in genau der Reihenfolge, in der Sidebar.tsx sie rendert (getSidebarPages() ist dieselbe
  // Quelle, die Sidebar.tsx für sein `pages.map(...)` nutzt). Nur aktiv, wenn KEIN Eingabefeld
  // fokussiert ist — sonst würde z.B. eine Mengen-/Such-Eingabe (etwa das Bank-Suchfeld eines
  // parallelen Agenten) beim Tippen einer Ziffer ungewollt die Seite wechseln — und nur ohne
  // Ctrl/Alt/Meta (die bleiben für OS-/Electron-Kombos frei, s. F11-Fullscreen/Strg-Zoom-Hinweis).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length !== 1 || e.key < "1" || e.key > "9") return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      // Tester-Sweep-Fund (T9, 2026-07-11): NIE durch ein offenes Modal hindurchfeuern — der
      // Hotkey wechselte sonst unsichtbar die Seite hinter Porträt-Galerie/Death-Popup & Co.
      // (Registry existierte längst, war hier nur nicht angeschlossen.)
      if (hasOpenModal()) return;
      const page = getSidebarPages()[Number(e.key) - 1];
      if (page) setActivePageId(page.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Chef-Feature 2026-07-23: TopBar stufenlos per Rand-Handle an der Unterkante ziehbar —
  // exakt dasselbe Muster wie die Sidebar-Breite (Sidebar.tsx handleResizeStart/-Reset): kein
  // React-Re-Render pro mousemove, direkte Style-Mutation aufs DOM-Element (`--tb-scale` treibt
  // die proportionale Skalierung von Font-/Icon-Größen/Paddings/Balken in topbar.css), erst bei
  // mouseup wird in localStorage persistiert. Anders als bei der Sidebar-Breite wird hier KEINE
  // explizite Pixel-Höhe auf den Wrapper gesetzt — "TopBar" ist die SUMME zweier eigenständiger
  // Elemente (Nav + Titel-/Statuszeile), deren Höhen-Formeln in topbar.css beide mit demselben
  // `--tb-scale` skalieren (Referenz 142px = 64px Nav + 78px Titelzeile, s. uiPrefs.ts); die
  // resultierende Gesamthöhe folgt dadurch von selbst der gezogenen Position, ohne Leerraum/
  // Clipping bei ungewöhnlichem Content (lange Übersetzungen, Slayer-Chip, HP-Leisten im Kampf).
  const topBarAreaRef = useRef<HTMLDivElement>(null);
  const tbHandleRef = useRef<HTMLDivElement>(null);
  const tbHeightRef = useRef(getTopBarHeight());

  const applyTopBarHeight = (px: number): void => {
    const el = topBarAreaRef.current;
    if (!el) return;
    el.style.setProperty("--tb-scale", String(px / TOPBAR_HEIGHT_REFERENCE));
  };

  // Persistierte Höhe VOR dem ersten Paint anwenden (useLayoutEffect statt useEffect) — sonst
  // blitzt die TopBar kurz in der 1×-CSS-Default-Skalierung auf (analog Sidebar.tsx).
  useLayoutEffect(() => {
    applyTopBarHeight(tbHeightRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTopBarResizeStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = tbHeightRef.current;
    tbHandleRef.current?.classList.add("dragging");
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent): void => {
      const next = Math.min(
        TOPBAR_HEIGHT_MAX,
        Math.max(TOPBAR_HEIGHT_MIN, startHeight + (ev.clientY - startY)),
      );
      tbHeightRef.current = next;
      applyTopBarHeight(next);
    };
    const onUp = (): void => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      tbHandleRef.current?.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setTopBarHeight(tbHeightRef.current); // erst hier persistieren, nicht pro mousemove
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Doppelklick auf den Handle = Reset auf den Default (168px, ~+18% ggü. der 142px-Referenz).
  const handleTopBarResizeReset = (): void => {
    tbHeightRef.current = TOPBAR_HEIGHT_DEFAULT;
    applyTopBarHeight(TOPBAR_HEIGHT_DEFAULT);
    setTopBarHeight(TOPBAR_HEIGHT_DEFAULT);
  };

  return (
    // codex:2026-09-10T10:35:00+02:00 — Lokaler Shell-Scope; andere Panels/Modale behalten ihren Bestandsstil.
    <div className="layout layout--reforged">
      <Sidebar activePageId={activePageId} onNavigate={setActivePageId} />
      <main className="content">
        <div className="topbar-area" ref={topBarAreaRef}>
          <TopBar activePageId={activePageId} onNavigate={setActivePageId} />
          {/* codex:2026-08-01T16:06:12+02:00 — Chef-GO: Info-Bar-Konzept 05 "Quiet Citadel"
              produktiv auf die bestehenden, selektorgesteuerten Daten anwenden. */}
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
                onNavigate={setActivePageId}
                progressBars={
                  <>
                    <ActionProgressBar />
                    <LevelXpBar viewedSkillId={viewedSkillId} />
                  </>
                }
              />
            </div>
          </header>
          {/* Chef-Feature 2026-07-23: Drag-Handle an der Unterkante der TopBar — Ziehen ändert die
              Höhe stufenlos (114–256px), Doppelklick resettet auf den Default (168px). Liegt
              INNERHALB der TopBar-Bounds (bottom:0, s. topbar.css .tb-resize-handle) — analog zum
              Sidebar-Handle (sidebar.css .sb-resize-handle). */}
          <div
            ref={tbHandleRef}
            className="tb-resize-handle"
            onMouseDown={handleTopBarResizeStart}
            onDoubleClick={handleTopBarResizeReset}
            role="separator"
            aria-orientation="horizontal"
            data-guide-id="feature.topbarResize"
          />
        </div>
        {/* Chef-Feedback (Screenshot Monster-Grid, 2026-07-23): Karten/Kreaturen schnitten am
            Scroll-Rand hart "ins Nichts" ab — gewünscht war ein Holzrahmen ums Scroll-Fenster,
            hinter dem Inhalt beim Scrollen verschwindet, wie beim Sidebar-Vorbild (sidebar.css
            `.sidebar::before`: NICHT-scrollender äußerer Wrapper trägt den dekorativen Rahmen,
            der scrollende Inhalt lebt als eigenes Kind darunter). `.content-body-frame` ist
            genau dieser äußere, unscrollbare Wrapper — `.content-body` bleibt unverändert der
            scrollende Container, nur jetzt sein Kind statt direktes Flex-Kind von `.content`. */}
        <div className="content-body-frame">
          <div className="content-body">
            {/* Geschmeidigkeits-Bundle (Chef-GO): key={activePageId} erzwingt einen echten
                DOM-Remount dieses Wrappers bei JEDEM Seitenwechsel — die CSS-Mount-Animation
                (.page-transition, topbar.css) läuft dadurch zuverlässig bei jeder Navigation neu
                an. Die alte Seite verschwindet hart (kein Unmount-Delay/Transition-Library), nur
                die neue blendet sanft ein. */}
            <div key={activePageId} className="page-transition">
              <PageContent pageId={activePageId} onNavigate={setActivePageId} />
            </div>
          </div>
        </div>
      </main>
      {/* Action-Queue-Panel (ersetzt den früheren Rezept-Pin-Tracker): echte, angedockte Spalte
          ganz rechts (Chef-Wunsch), spiegelbildlich zur Sidebar — kein floatendes Overlay, daher
          als eigenes Flex-Kind von .layout statt neben Toasts/Popups einsortiert. */}
      <ActionQueuePanel />
      {/* Spieler-Feedback 0.2.2 Punkt 3: schwebendes Elite-/Kopfgeld-Mini-Fenster — app-weit
          gemountet (nicht nur auf der Slayer-Seite), rendert intern `null` solange kein Champion
          aktiv ist. Ersetzt das frühere Inline-Kopfgeld-Brett (BountyBoard.tsx, s. SlayerPage.tsx). */}
      <EliteMiniWindow />
      <OfflinePopup onNavigate={setActivePageId} />
      <Toasts activePageId={activePageId} />
      <GameAlerts />
      <QueueAmountModalHost />
      <DevSpeedPanel />
      <UpdateNotice />
      <PetCelebration />
      <MasteryCeremony />
      <DungeonClearCeremony />
      <ChampionDefeatCeremony />
      <ApMilestoneCeremony />
      <DeathPopup />
      <StalematePopup />
      <OnboardingGuide onOpenBugReport={() => setShowBugReport(true)} />
      {/* Versions-„Was ist neu"-Touren (Chef-Auftrag 2026-07-21, v2 Release-Fix-Welle Agent B
          Befund B4-2/B4-3, 2026-08-03): gleiche Priorität wie der Haupt-Guide oben (läuft nur,
          wenn der NICHT aktiv ist) UND nie über dem Offline-Report (s. FeatureTourGuide.tsx
          B4-2-Fix — beide Instanzen gaten zusätzlich auf `!offlineSummary`). Global hier statt
          seiten-lokal (wie die drei AreaTourGuide-Instanzen), da ihre Ziele (Action-Queue-Panel,
          Sidebar-Resize-Rand, Sidebar-Nav-Einträge) globales Chrome sind.
          v1 feuert einmalig für Alt-Saves, die toursSeen.featureTourV1 noch nicht kennen. v2
          (New Haven, das 0.3.0-Aushängeschild) ist per `requiresTourKey` an v1 verkettet — läuft
          erst NACHDEM v1 gesehen wurde (deckt sowohl "gerade eben v1 geschlossen" als auch
          "hatte v1 schon vor diesem Update gesehen" ab, s. areaTourSteps.ts
          FEATURE_TOUR_STEPS_V2-Doc für die Neu-Spieler-Abgrenzung). */}
      <FeatureTourGuide tourKey="featureTourV1" steps={FEATURE_TOUR_STEPS} />
      <FeatureTourGuide tourKey="featureTourV2" steps={FEATURE_TOUR_STEPS_V2} requiresTourKey="featureTourV1" />
      {showBugReport && (
        <BugReportDialog onClose={() => setShowBugReport(false)} screenLabel={page ? t(page.label) : null} />
      )}
    </div>
  );
}

function Root(): JSX.Element {
  const { screen, sessionEpoch } = useGameControl();
  switch (screen) {
    case "menu":
      return <IntroSequence />;
    case "creating":
      return <CharacterCreation />;
    default:
      // key={sessionEpoch}: nach einem Save-IMPORT den kompletten Spiel-Baum remounten, damit
      // alle Snapshot-Refs (DeathPopup/Toasts/Level-Diffs) frisch vom importierten State starten
      // (Sweep-Fund T8: falsches Todes-Popup nach Import). Normales Laden remountet ohnehin.
      return <MainLayout key={sessionEpoch} />;
  }
}

export function App(): JSX.Element {
  // Chef 2026-07-12: KEIN Vollbild-Autostart mehr — der Launch ist immer das exakte
  // 1920×1080-Fenster (main/index.ts). Externe Vollbild-Wechsel (F11/OS) werden weiterhin
  // persistiert (Optionen-Anzeige), aber beim Start nicht mehr angewandt.
  useEffect(() => {
    return window.hearthforge?.win?.onFullscreenChanged(persistFullscreen);
  }, []);

  // Globales UI-Klick-Geräusch: click.mp3 bei JEDEM Mausklick in der App (Chef-Wunsch:
  // „für alle Mausklicks"). Lautstärke/Mute steuern dieselben SFX-Regler in den Optionen.
  useEffect(() => {
    const onClick = (): void => playSfx("click");
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Chef-GO Hotkeys (2026-07-09): EIN zentraler Escape-Handler für die ganze App — schließt das
  // oberste offene Overlay in Prioritäts-Reihenfolge (gepinntes ItemTooltip → Modals: PortraitPicker/
  // Death/PetCelebration/MasteryCeremony/Offline/Quit-Dialog) über die Registry in util/escStack.ts. Diese
  // Komponenten melden sich dort selbst an/ab (registerEscCloser), solange sie offen sind — dieser
  // Handler ruft nur `closeTopEscTarget()` auf und weiß nichts über die einzelnen Overlays. Ersetzt
  // die vormals verstreuten lokalen Escape-`keydown`-Listener (s. escStack.ts-JSDoc); ist nichts
  // registriert, passiert nichts (kein Fehler, kein Seiteneffekt).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") closeTopEscTarget();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <I18nProvider>
      {/* Ambient-Layer (Task #311 → Wetter-Rückbau 2026-07-24 → Chef-Korrektur Task #317: Vignette
          + dezentes three.js-Bloom, s. AmbientEffects.tsx-JSDoc): app-weit, VOR <Root/> gemountet —
          läuft unabhängig vom Screen (Menü/Charaktererstellung/Hauptspiel) und vom GameState (reine
          Wanduhr-/localStorage-Vorlieben). Fixed+z-index-positioniert, die DOM-Reihenfolge ist hier
          ohne Belang. */}
      <AmbientEffects />
      <GameProvider>
        <Root />
        <ItemTooltipOverlay />
        <ItemWikiModalOverlay />
        {/* Enzyklopaedie: liegt UNTER dem Item-Wiki (Reihenfolge egal, beide sind eigene Overlays
            mit eigenem z-index) und bleibt offen, waehrend das Wiki darueber liegt — Escape
            schliesst zuerst das Wiki, die Suche darunter steht unveraendert wieder da. */}
        <EncyclopediaModalOverlay />
      </GameProvider>
      {/* Chef-Kurswechsel 26.08.2026: MUSS außerhalb von <Root/>s Screen-Switch liegen, damit die
          Überblendung einen Screen-Wechsel (Menü → Spiel) übersteht statt selbst mit zu
          remounten — s. components/ScreenFade.tsx-JSDoc. */}
      <ScreenFade />
    </I18nProvider>
  );
}
