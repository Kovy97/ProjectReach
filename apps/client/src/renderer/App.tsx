import { SkillEventChip } from "./components/SkillEventChip"; // claude:2026-10-25T01:30:00+02:00
import { EstatesNote, IdleOrEstates } from "./components/EstatesNote"; // claude:2026-10-23T19:10:00+02:00 — Ländereien (1.4.0)
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
import { RaidOverlays } from "./components/RaidScreens"; // claude:2026-10-25T11:15:00+02:00 — Raid (1.4.0 Welle 4)
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
import { StoragePage } from "./pages/StoragePage"; // claude:2026-10-23T22:20:00+02:00 — Materiallager (1.4.0)
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
import { PrestigePage } from "./pages/PrestigePage"; // claude:2026-10-18T14:00:00+02:00 — Scherbenaltar
import { AscendAwakening } from "./components/AscendAwakening";
import { EnchantingPage } from "./pages/EnchantingPage";
import { MailPage } from "./pages/MailPage";
import { NewHavenPage } from "./pages/NewHavenPage";
import { TavernPage } from "./pages/TavernPage";
// claude:2026-10-19T10:05:00+02:00 — Oberflächen-Stil Reforged/Classic (Chef 19.10.).
import { useUiStyle } from "./uiStyle";
import { SidebarClassic } from "./components/SidebarClassic";
import { TopBarClassic } from "./components/TopBarClassic";
import { ClassicContentHeader } from "./components/ClassicHeader";

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
    case "storage":
      return <StoragePage />;
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
    case "prestige":
      return <PrestigePage />; // claude:2026-10-18T14:00:00+02:00
    case "tavern":
      // Release-Schalter: ohne Taverne landet die (unerreichbare) Route auf New Haven.
      return TAVERN_ENABLED ? <TavernPage onNavigate={onNavigate} /> : <NewHavenPage onNavigate={onNavigate} />;
    default:
      return <PlaceholderPage label={page.label} />;
  }
}

const HOUR_MS = 3_600_000;

/**
 * claude:2026-10-17T11:30:00+02:00 — UI-Fundament: schmale Statusleiste der Kopfzeile. Text steht
 * DANEBEN/DARÜBER (s. Aufrufer), die Leiste trägt nur noch den Fortschritt. Material bleibt: der
 * Track ist die Gravewood-Textur mit Bronzekante, die 10 Fächer kommen als Strichraster aus CSS
 * (`.hs-bar::after`), Füllung und Glanz wie bisher. Vorher stand Beschriftung IN der Leiste und
 * wurde bei schmalem Kopf abgeschnitten bzw. als eigene Zeile verdoppelt („Untätig / Untätig").
 */
function StatusBar({ variant, progressPct, title }: { variant: "action" | "level"; progressPct: number; title: string }): JSX.Element {
  const pct = Math.min(100, Math.max(0, progressPct));
  return (
    <div className={`hs-bar hs-bar--${variant}`} title={title}
      role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      {/* codex:2026-07-31T00:32:37+02:00 — scaleX bleibt auf der Compositor-Spur;
          clip-path musste bei jedem 10-Hz-Update eine fast bildschirmbreite Fläche neu painten. */}
      <div className="hs-bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
      <div className="hs-bar-gloss" />
    </div>
  );
}

/** Aktions-Fortschritt der laufenden Aktion: Prozent + XP/h · Einheiten/h als Nebenzeile und die
 *  goldene Leiste. Ohne laufende Aktion (Leerlauf/Kampf/Gestoppt) rendert sie NICHTS — die
 *  Aktivitätszeile darüber sagt den Zustand bereits einmal (claude:2026-10-17T11:30:00+02:00,
 *  vorher stand „Untätig"/„Im Kampf" ein zweites Mal in einer leeren Leiste).
 *  Perf-Welle Block A (2026-07-22): `useGameSelector` gated den Re-Render auf die drei Primitives,
 *  die den kompletten sichtbaren Zustand bestimmen (Aktion, Fortschritt, Kampf-Flag) — der volle
 *  State für die abgeleiteten Raten (`computeActionRate`/`effectiveActionDurationMs`, brauchen
 *  Mastery/Werkzeuge/Buffs aus dem gesamten State) kommt danach über `useGetGameState()`, läuft
 *  also nur noch so oft wie dieser jetzt gedrosselte Render selbst — auf Seiten ohne laufende
 *  Aktion/Kampf (der Audit-Fall "Mail-Seite idle") rendert diese Leiste gar nicht mehr pro Tick. */
function ActionProgressBar(): JSX.Element | null {
  const getState = useGetGameState();
  const [activeActionId, actionProgressMs] = useGameSelector(
    (s) => [s.activeActionId, s.actionProgressMs, s.combat.monsterId != null] as const,
    tupleEquals,
  );
  const state = getState()!;
  const { t, tr } = useI18n();
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

  if (!action) return null;
  // claude:2026-10-17T11:30:00+02:00 — Der Aktionsname steht in der Aktivitätszeile; hier nur
  // Prozent und Raten (rechtsbündig in derselben Zeile) plus die Leiste darunter.
  const pctLabel = `${Math.floor(progressPct)}%`;
  const rateLabel = primaryLoot
    ? `${t("skill.xpRate").replace("{n}", formatNum(xpPerHour))} · ${t("skill.itemRate").replace("{n}", formatNum(primaryLoot.perHour))}`
    : t("skill.xpRate").replace("{n}", formatNum(xpPerHour));

  return (
    <>
      <span className="hs-meta hs-act-meta">
        <span className="hs-act-pct">{pctLabel}</span>
        <span className="hs-act-rate"> · {rateLabel}</span>
      </span>
      <StatusBar variant="action" progressPct={progressPct} title={`${tr(action.name)} — ${pctLabel} — ${rateLabel}`} />
    </>
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
function LevelXpBar({ viewedSkillId }: { viewedSkillId?: SkillId | null }): JSX.Element | null {
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
  // claude:2026-10-17T11:30:00+02:00 — Teile getrennt, damit ein schmaler Kopf die XP-Zahlen
  // ausblenden kann (bleiben im Tooltip), statt den Satz mitten im Wort umzubrechen.
  const skillName = skillId ? tr(content.skills[skillId]?.name ?? { en: skillId }) : "";
  const levelPart = `${t("skill.level").replace("{n}", String(level))} · ${Math.floor(progressPct)}%`;
  const xpPart = `${formatNum(skillXp - xpStart)} / ${formatNum(xpEnd - xpStart)}`;
  const centerLabel = `${skillName} · ${levelPart} · ${xpPart}`;

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

  // claude:2026-10-17T11:30:00+02:00 — Ohne verfolgten Skill keine Zelle mehr: „Keine aktive
  // Fertigkeit" war im Leerlauf die dritte Zeile, die nur wiederholte, dass nichts läuft.
  if (!skillId) return null;
  const fullTitle = etaLabel ? `${centerLabel} — ${etaLabel}` : centerLabel;

  return (
    <div className="hs-cell hs-xp" title={fullTitle}>
      <span className="hs-line hs-xp-text">
        <span className="hs-xp-skill">{skillName}</span>
        <span className="hs-xp-level"> · {levelPart}</span>
        <span className="hs-xp-nums"> · {xpPart}</span>
      </span>
      {etaLabel && <span className="hs-meta hs-xp-eta">{etaLabel}</span>}
      <div className="hs-bar-wrap">
        <StatusBar variant="level" progressPct={progressPct} title={fullTitle} />
        {burst.nonce > 0 && <LevelUpBurst nonce={burst.nonce} motion={burst.motion} />}
      </div>
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
    // claude:2026-10-17T11:30:00+02:00 — Zelle der kompakten Statusleiste (hs-*); breit zweizeilig,
    // schmal einzeilig (Name · Kampf-Lv · Ges.-Lv), gesteuert per Container-Query in chrome.css.
    <div className="hs-cell hs-id">
      <span className="hs-name">{name}</span>
      <span className="hs-levels">
        {/* Beschriftung als eigener Span: wird es eng (schmaler Kopf + Slayer-Auftrag), bleiben
            Symbol + Zahl stehen und der Text wandert in den Tooltip. */}
        <span className="hs-level hs-level--combat" title={`${t("sidebar.combatLevel")} ${combatLvl}`}>
          {CHARINFO_COMBAT_ICON_URL
            ? <img loading="lazy" decoding="async" src={CHARINFO_COMBAT_ICON_URL} alt="" className="ui-icon" />
            : "⚔"}{" "}
          <span className="hs-level-label">{t("sidebar.combatLevel")}</span> <b>{combatLvl}</b>
        </span>
        <span className="hs-level hs-level--total" title={`${t("sidebar.totalLevel")} ${totalLvl}`}>
          {CHARINFO_TOTAL_ICON_URL
            ? <img loading="lazy" decoding="async" src={CHARINFO_TOTAL_ICON_URL} alt="" className="ui-icon" />
            : "★"}{" "}
          <span className="hs-level-label">{t("sidebar.totalLevel")}</span> <b>{totalLvl}</b>
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
 * Chef-Auftrag 25.08.2026 / claude:2026-10-17T11:30:00+02:00: die Aktivitätszelle nimmt die
 * EIGENSTÄNDIG perf-gegatete `<ActionProgressBar/>` als `actionBar` auf, statt sie hier neu zu
 * bauen; die XP-Zelle (`<LevelXpBar/>`) ist ein eigenes Kind der Statusleiste. `actionProgressMs`
 * steht deshalb nicht in DIESEM Selector-Tupel.
 */
function GameStats({
  onNavigate,
  actionBar,
  hideStop = false,
}: {
  onNavigate?: (id: string) => void;
  /** claude:2026-10-17T11:30:00+02:00 — Prozent/Raten + Leiste der laufenden Aktion
   *  (<ActionProgressBar/>, eigenes Perf-Gate), landet in der Aktivitätszelle. */
  actionBar?: React.ReactNode;
  /** claude:2026-10-17T15:10:00+02:00 — Chef 17.10. („überlasse ich dir"): Auf der Kampfseite
   *  steht bereits „Kampf beenden" (Chef-Platzierung 25.08.); dort entfällt der zweite Knopf. */
  hideStop?: boolean;
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
    // claude:2026-10-17T11:30:00+02:00 — Kampf: Zeile 1 nennt Gegner/Dungeon, Zeile 2 trägt die
    // beiden HP-Leisten an der Stelle, wo sonst der Aktionsfortschritt steht (gleiche Zellhöhe).
    activity = (
      <>
        <span
          className="hs-line hs-act-text hs-act-text--fight"
          onClick={goToFight}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToFight(); } }}
          role="button"
          tabIndex={0}
          title={t("header.jumpToFight")}
        >
          {queueDungeon ? (
            <>
              <span className="hs-muted">{t("header.dungeon")}</span>{" "}
              <span className="hs-act-name">{dungeonHeaderName}</span>
              <span className="hs-muted"> · {dungeonRunShort}</span>
            </>
          ) : (
            <>
              <span className="hs-muted">{t("header.fighting")}</span>{" "}
              <span className="hs-act-name">{monsterName}</span>
            </>
          )}
        </span>
        <span className="hs-hp" aria-hidden="true">
          <span className="hs-hp-icon">
            {SHIELD_ICON_URL
              ? <img loading="lazy" decoding="async" src={SHIELD_ICON_URL} alt="" className="ui-icon" />
              : "🛡"}
          </span>
          <span className="hs-hp-bar" title={playerHpTitle}>
            {/* Belohnungs-Juice-Welle #3 — HP-Nachlauf (s. combat.css .cbar-hp-trail für die
                ausführliche Erklärung des reinen CSS-Timing-Tricks; hier dieselbe Technik für
                die Mini-Leiste in der Kampf-Titelzeile). */}
            <span className="hs-hp-trail" style={{ transform: `scaleX(${playerPct / 100})` }} />
            <span className="hs-hp-fill hs-hp-fill--player" style={{ transform: `scaleX(${playerPct / 100})` }} />
          </span>
          <span className="hs-hp-icon hs-hp-vs">
            {COMBAT_VS_ICON_URL
              ? <img loading="lazy" decoding="async" src={COMBAT_VS_ICON_URL} alt="" className="ui-icon" />
              : "⚔"}
          </span>
          <span className="hs-hp-bar" title={enemyHpTitle}>
            <span className="hs-hp-trail" style={{ transform: `scaleX(${enemyPct / 100})` }} />
            <span className="hs-hp-fill hs-hp-fill--enemy" style={{ transform: `scaleX(${enemyPct / 100})` }} />
          </span>
        </span>
      </>
    );
  } else if (activeActionId) {
    const a = content.actions[activeActionId];
    // Chef-Auftrag 25.08.2026: der Mini-Fortschrittsbalken hier ist weg — die echte
    // Aktions-Fortschrittsleiste (ActionProgressBar) sitzt direkt darunter in derselben Zelle.
    activity = (
      <span className="hs-line hs-act-text">
        <span className="hs-muted">{t("header.doing")}</span>{" "}
        <span className="hs-act-name">{a ? tr(a.name) : ""}</span>
        {/* claude:2026-10-23T19:10:00+02:00 — 1.4.0 LA: Ländereien als Zusatz („ · Nebenbei: 6 Felder“). */}
        <EstatesNote className="hs-muted" />
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
      <span className="hs-line hs-act-text hs-act-text--stopped" title={hint}>
        ⚠ <span className="hs-muted">{t("header.stopped")}</span>{" "}
        <span className="hs-act-name">{a ? tr(a.name) : ""}</span>
      </span>
    );
  } else {
    // claude:2026-10-23T19:10:00+02:00 — 1.4.0 LA: nie „Untätig“, solange Felder oder Fallen arbeiten.
    // claude:2026-10-25T02:30:00+02:00 — Ereignis-Chip auch im Leerlauf (1.4.0 EV/AU)
    activity = <span className="hs-line hs-act-text"><IdleOrEstates idleText={t("header.idle")} className="hs-muted" /><SkillEventChip /></span>;
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

  // claude:2026-10-17T11:30:00+02:00 — UI-Fundament: keine eigene Hülle mehr. Die Zellen (hs-act,
  // hs-slayer, hs-eco, hs-stop) sind direkte Kinder der Statusleiste und werden dort per Grid-
  // Bereichen angeordnet: breit eine Zeile, schmal zwei (chrome.css, @container game-content).
  return (
    <>
      <div className="hs-cell hs-act">
        {activity}
        {!inCombat && actionBar}
      </div>
      {/* codex:2026-08-01T18:06:00+02:00 — Slayer-Vertrag als eigener Cluster zwischen Aktivitaet
          und Oekonomie, damit der lange Zieltext nicht mit Slots/Gold um eine Zeile konkurriert. */}
      {slayerMonsterId != null && (
        <div className="hs-cell hs-slayer">
          <span className="hs-slayer-chip">
          {slayerIconUrl
            ? <img loading="lazy" decoding="async" src={slayerIconUrl} alt="" className="ui-icon" />
            : "⚔"}{" "}
          {(() => {
            // claude:2026-10-17T12:40:00+02:00 — Der Gegnername bricht nie in sich um
            // („Goblin-/Armbruster"); umbrechen darf nur der Satz an Wortgrenzen davor.
            const [pre, post = ""] = t("header.slayerTask")
              .replace("{done}", String(slayerProgress))
              .replace("{total}", String(slayerRequired))
              .split("{monster}");
            return <span>{pre}<span className="hs-nowrap">{slayerTaskMonName}</span>{post}</span>;
          })()}
          </span>
        </div>
      )}
      <div className="hs-cell hs-eco">
        <span
          className={`hs-slots${invOverCapacity ? " over" : invFull ? " full" : ""}`}
          title={invOverCapacity ? t("inv.overCapacity.hint") : invFull ? t("header.bagsFull") : t("header.bags")}
        >
          {INVENTORY_ICON_URL
            ? <img loading="lazy" decoding="async" src={INVENTORY_ICON_URL} alt="" className="ui-icon" />
            : "🎒"}{" "}
          {used}/{cap}
        </span>
        <span className="hs-gold">
          {GOLD_ICON_URL
            ? <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="ui-icon" />
            : "🪙"}{" "}
          {formatNum(Math.round(animatedGold))}
        </span>
      </div>
      {inCombat && !hideStop && (
        // claude:2026-10-17T11:30:00+02:00 — Standard-Eisenknopf (Chef 26.08.: kein eigener Stil mehr).
        // claude:2026-10-17T15:10:00+02:00 — Derselbe Text wie der Knopf auf der Kampfseite
        // (DE stand hier „Kampf abbrechen", dort „Kampf beenden" für dieselbe Aktion).
        <button
          type="button"
          className="hs-stop btn-iron btn-iron--sm btn-iron--danger"
          onClick={() => stopCombat(state)}
        >
          {t("combat.flee")}
        </button>
      )}
    </>
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
  const uiStyle = useUiStyle();
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
    // claude:2026-10-19T10:05:00+02:00 — Chef 19.10.: Stil umschaltbar (Reforged/Classic), s. uiStyle.ts.
    <div className={`layout layout--${uiStyle}`}>
      {/* claude:2026-10-19T11:00:00+02:00 — Classic (Look von 1.2.3): eigene Seitenleiste, Reiterleiste und
          Kopfzeile „Quiet Citadel“; Reforged: die 1.3-Chrome. Höhenregler, Inhalt und Fenster sind gemeinsam. */}
      {uiStyle === "classic" ? (
        <SidebarClassic activePageId={activePageId} onNavigate={setActivePageId} />
      ) : (
        <Sidebar activePageId={activePageId} onNavigate={setActivePageId} />
      )}
      <main className="content">
        <div className="topbar-area" ref={topBarAreaRef}>
          {uiStyle === "classic" ? (
            <TopBarClassic activePageId={activePageId} onNavigate={setActivePageId} />
          ) : (
            <TopBar activePageId={activePageId} onNavigate={setActivePageId} />
          )}
          {uiStyle === "classic" && (
            <ClassicContentHeader page={page} viewedSkillId={viewedSkillId} onNavigate={setActivePageId} />
          )}
          {/* codex:2026-08-01T16:06:12+02:00 — Chef-GO: Info-Bar-Konzept 05 "Quiet Citadel".
              claude:2026-10-17T11:30:00+02:00 — UI-Fundament: EINE kompakte Statusleiste (hs-*)
              statt Name-Block + Aktivitätszeile + zwei beschrifteter Leisten untereinander:
              Name · Kampf-Lv · Ges.-Lv | Aktivität mit Fortschritt | XP des verfolgten Skills |
              Slayer | Inventar/Gold | Stop. Jede Information genau einmal; ActionProgressBar und
              LevelXpBar behalten ihre eigenen Perf-Gates, nur ihr Ort ändert sich. */}
          {uiStyle !== "classic" && (
          <header className="hs-strip">
            {/* Seitenname nur für Assistenztechnik — sichtbar steht er bereits im aktiven Reiter
                bzw. Sidebar-Eintrag. */}
            <h1 className="hs-page-title">{page ? t(page.label) : t("app.title")}</h1>
            <HeaderCharacterInfo />
            <GameStats
              onNavigate={setActivePageId}
              actionBar={<ActionProgressBar />}
              hideStop={activePageId === "combat"}
            />
            <LevelXpBar viewedSkillId={viewedSkillId} />
          </header>
          )}
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
      <RaidOverlays />
      <ChampionDefeatCeremony />
      <ApMilestoneCeremony />
      <DeathPopup />
      {/* claude:2026-10-18T14:00:00+02:00 — Erwachens-Text nach dem Aschesturz (Zustand in GameContext, überlebt den Remount). */}
      <AscendAwakening />
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
