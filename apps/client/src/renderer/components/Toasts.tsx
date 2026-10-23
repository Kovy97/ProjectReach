import { EVENT_ICON, getEventImage } from "../eventArt"; // claude:2026-10-25T01:30:00+02:00
import { eventCardValues, fillEventText, orderCustomer } from "../ordersApi";
import { requestQuestsTab } from "../navigation";
import { jumpToPage } from "../util/monsterJump";
import type { GameState } from "@hearthforge/shared";
import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import { computeStats, isEliteZoneHuntable, levelFromXp, masteryPoolCapacity, queueBlockReason, slayerTaskPointsPayout } from "@hearthforge/engine";
import type { AchievementDef, SkillId } from "@hearthforge/shared";
import { achievementPoints, MASTERY_POOL_CHECKPOINTS, ELITE_UNIQUE_DROP_CHANCE_DEFAULT, RELIC_DUST_ITEM_ID, TAVERN_ENABLED } from "@hearthforge/shared";
import { useGameControl, useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { playSfx } from "../util/audio";
import {
  hasSeenRangedHint,
  hasSeenMagicHint,
  setSeenRangedHint,
  setSeenMagicHint,
} from "../util/onboarding";
import { type CombatFxLevel, getCombatFxLevel } from "../util/uiPrefs";
import { getUiIcon } from "../uiIcons";
import { getCampImage } from "../campArt";
import { getItemImage } from "../items";
// claude:2026-10-19T05:10:00+02:00 — Droprate über den gemeinsamen, sprachabhängigen Formatierer (EN zeigte "0,00 %").
import { formatDropPct, formatNum, romanLevel } from "../util/format";
import { msUntilMidnight, todayStamp } from "../util/dayStamp";
import { tavernGuestDef, tavernRefresh } from "../tavernApi";
import { getEliteMonsterSrc } from "../monsters";
import { getSkillIcon } from "../skillIcons";
import { getSidebarIcon } from "../sidebarIcons";
import { jumpToMonster } from "../util/monsterJump";
import { countFenceItems } from "../util/fence";
import { registerUiToastSink } from "../util/toastBus";
import {
  highestRankCrossed,
  masteryRankKey,
  masteryRankTier,
  poolCheckpointBonusLine,
} from "../util/masteryRank";

/**
 * Mastery-Pool-Kapazität je Skill (Welle EE, M1): rein content-abgeleitet (s. engine/mastery.ts
 * `masteryPoolCapacity`), ändert sich nie zur Laufzeit — EINMAL beim Modul-Laden berechnet statt
 * bei jedem Tick-Diff neu über alle Aktionen zu summieren (Toasts.tsx diffed ohnehin schon 760+
 * Aktionen/Tick für die Level-Up-Erkennung unten, s. dort).
 */
const MASTERY_POOL_CAPACITY_BY_SKILL = new Map<string, number>(
  Object.keys(content.skills).map((id) => [id, masteryPoolCapacity(content, id as SkillId)]),
);

// In-memory flag: fence discovery toast fires at most once per session.
let hasFiredFenceToast = false;
// In-memory flag: farming first-plant hint fires at most once per session.
let hasFiredFarmHint = false;

const ACHIEVEMENT_ICON_URL = getUiIcon("icon_achievement_unlocked");
// Welle QQ (2026-07-17): echte Icons statt Emoji-Platzhalter auf Paragonturm-/Mastery-/
// Dungeon-Unlock-Toasts.
const TOWER_ICON_URL = getUiIcon("icon_tower");
const MASTERY_STAR_ICON_URL = getUiIcon("icon_mastery_star");
const KEY_ICON_URL = getUiIcon("icon_key");

/**
 * Wählt das passende Icon für Achievement-Toasts:
 * skill_level → Skill-Icon des Ziel-Skills; total_level → Overall-Icon;
 * alles andere → generisches Achievement-Icon.
 */
function resolveAchievementIconUrl(ach: AchievementDef | undefined): string | null {
  if (!ach) return ACHIEVEMENT_ICON_URL;
  const { type, target } = ach.condition;
  if (type === "skill_level" && target) {
    return getSkillIcon(target) ?? getSidebarIcon(target) ?? ACHIEVEMENT_ICON_URL;
  }
  if (type === "total_level") {
    return getSidebarIcon("skills-overview") ?? ACHIEVEMENT_ICON_URL;
  }
  return ACHIEVEMENT_ICON_URL;
}

interface Toast {
  id: number;
  icon: string;
  /** PNG-URL, hat Vorrang vor dem emoji `icon`. */
  iconUrl?: string | null;
  title: string;
  detail: string;
  kind: "level" | "total" | "drop" | "achievement" | "pet" | "rare" | "mastery" | "elite" | "event"; // claude:2026-10-25T01:30:00+02:00 — + Ereigniskarte (1.4.0 EV)
  /** Chef 27.08.2026: kleine Zeile unten rechts im Popup, z. B. die Dropchance eines seltenen Funds. */
  note?: string;
  /** Nur bei kind "rare": Item-Rarity, damit legendary den Jackpot-Look eine Spur kräftiger bekommt. */
  rarity?: string;
  /** Nur bei kind "rare": Belohnungs-FX-Stufe zum PUSH-Zeitpunkt (s. effectiveFxLevel) — steuert
   *  den Jackpot-Look (Rahmen-Puls/Licht-Sweep), NICHT den Toast-Text selbst (bleibt Kernfeedback,
   *  in jeder Stufe unverändert lesbar). */
  fx?: CombatFxLevel;
  /**
   * Nur bei kind "mastery" (Welle EE, Mona M1): "level" = dezenter Stapel-Toast normaler
   * Mastery-Level-Ups; "milestone" = ein Rang-Stern wurde überschritten (10/25/50/75/99, s.
   * util/masteryRank.ts) — eigener Stern-Stil, Größe/Glanz skaliert mit `rankTier`; "pool" = ein
   * skillweiter Mastery-Pool-Checkpoint (5/25/50/95 %) wurde überschritten — der seltenste,
   * größte Mastery-Moment (Mona-Fund #2: "das ist ein DAUERHAFTER skillweiter Bonus").
   */
  masteryVariant?: "level" | "milestone" | "pool";
  /** Nur bei masteryVariant "milestone": Rang-Tier für die Akzentfarbe (bronze…diamond). */
  rankTier?: string;
  /**
   * Welle MM (Vesna+Pip, "Toast-Verdrängungs-Priorität"): bei Überlauf des MAX_TOASTS-FIFO fliegt
   * IMMER zuerst der älteste "low"-Toast, nie ein "high"-Toast zugunsten eines "low"-Toasts.
   * Default "low" (s. `isHighPriorityToast` — kind "rare"/"pet" gelten dort automatisch als
   * "high", auch ohne dieses Feld zu setzen; nur die zwei Achievement-artigen Sonderfälle unten
   * (AP-Meilenstein, Slayer-Streak-Bonus) brauchen den expliziten Marker, weil ihr `kind`
   * ("achievement") sich mit dem niedrigpriorisierten generischen Achievement-/Task-Complete-
   * Toast überschneidet.
   */
  priority?: "high" | "low";
  /**
   * Elite-/World-Spawns (design/elite-spawns-concept.md §2.1): optionaler Klick-Sprung — bisher
   * war kein Toast klickbar, dieser ist der erste. Springt über das bestehende Wiki→Kampfgebiet-
   * Sprung-Muster (util/monsterJump.ts) zur Zone des Basis-Mobs.
   */
  onClick?: () => void;
}

const TOAST_MS = 4000;
const MAX_TOASTS = 4;
// superRare/godly gehören dazu — sonst ist der größte Jackpot des Spiels stumm (Fun-Retest Grete).
// claude:2026-10-25T09:10:00+02:00 — Raid-Raritäten heroic/mythic (1.4.0 A4) lösen ebenfalls den Fund-Toast aus.
const RARE = new Set(["rare", "epic", "legendary", "superRare", "godly", "heroic", "mythic"]);
// Welle KK (Grete-Retest, Fund #1): superRare/godly bekommen eine eigene, GRÖSSERE Jackpot-Stufe
// (Stil-Variante des bestehenden Rare-Toasts) — bisher war der seltenste Fund des Spiels leiser
// als ein 0,8-%-Cape, weil beide dieselbe 4s-Dauer und denselben Legendary-Puls teilten.
const GODLY_TIER = new Set(["superRare", "godly"]);
// claude:2026-10-25T09:10:00+02:00 — Raid-Funde (heroic türkis, mythic pink) mit eigener Inszenierung; Dauer wie die Jackpot-Stufe.
const RAID_TIER = new Set(["heroic", "mythic"]);
/** Titel des Fund-Toasts je Seltenheit (A4: godly heißt jetzt „Göttlicher Fund!“, Mythisch ist die neue Raid-Stufe). */
function rareFindTitleKey(rarity: string | undefined): string {
  switch (rarity) {
    case "mythic": return "toast.rareFind.mythic";
    case "heroic": return "toast.rareFind.heroic";
    case "godly": return "toast.rareFind.godly";
    case "superRare": return "toast.rareFind.superRare";
    default: return "toast.rareFind";
  }
}
/** Jackpot-Toast-Dauer: superRare/godly bekommen deutlich mehr Bühnenzeit als der Standard-Rare-
 *  Toast (bzw. mehr als die jeweilige Basis-Dauer des Aufrufers, z.B. der 7s-Suffix-Reveal). */
function jackpotDurationMs(rarity: string | undefined, base = TOAST_MS): number {
  if (rarity === "mythic") return Math.max(base, 16_000);
  return GODLY_TIER.has(rarity ?? "") || RAID_TIER.has(rarity ?? "") ? Math.max(base, 12_000) : base;
}

/**
 * Welle MM (Vesna+Pip, "Toast-Verdrängungs-Priorität"): rare/godly-Jackpot- und Pet-Toasts sind
 * automatisch "high" (an ihrem `kind` erkennbar); alles andere ist "low", außer der Push-Aufruf
 * markiert `priority: "high"` explizit — s. JSDoc am `Toast.priority`-Feld oben.
 */
function isHighPriorityToast(toast: { kind: Toast["kind"]; priority?: "high" | "low" }): boolean {
  if (toast.priority) return toast.priority === "high";
  return toast.kind === "rare" || toast.kind === "pet";
}

/**
 * Welle MM (Vesna+Pip, "Toast-Verdrängungs-Priorität"): ersetzt das alte blinde `.slice(-MAX_TOASTS)`
 * (verdrängt IMMER den ältesten Toast, egal wie wertvoll — traf reproduzierbar den Streak-Bonus-
 * Toast, wenn er mit Achievement+Level-Up+Total-Level zusammenfiel). Bei Überlauf fliegt zuerst der
 * älteste NIEDRIG-priorisierte Toast; erst wenn davon keiner mehr übrig ist (der Stack besteht nur
 * noch aus "high"-Toasts), greift als Notbremse gegen unbegrenztes Wachstum der harte FIFO-Fallback.
 */
function evictOverflow(list: Toast[]): Toast[] {
  let overflow = list.length - MAX_TOASTS;
  if (overflow <= 0) return list;
  const result = [...list];
  for (let i = 0; i < result.length && overflow > 0; i++) {
    if (!isHighPriorityToast(result[i]!)) {
      result.splice(i, 1);
      i--;
      overflow--;
    }
  }
  while (overflow > 0) {
    result.shift();
    overflow--;
  }
  return result;
}

let nextId = 1;

/**
 * Belohnungs-Juice-Welle (Chef-GO): effektive FX-Stufe für den Rare-Drop-Jackpot-Look —
 * derselbe Options-Toggle wie die Kampf-Effekte (CombatPage.tsx `fxLevel`, Task #296 P0 §1.6).
 * OS `prefers-reduced-motion` übersteuert IMMER zusätzlich auf "off". Hier dupliziert statt
 * geteilt (wie im CombatPage-Vorbild), da Toasts.tsx unabhängig vom Battle-Mount lebt.
 */
function effectiveFxLevel(): CombatFxLevel {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }
  return getCombatFxLevel();
}

/**
 * Leichte Benachrichtigungen (Level-ups, seltene Funde). Bewusst client-only: vergleicht
 * pro Tick den aktuellen Stand mit einem Snapshot (useRef) — kein Engine-/Save-Eingriff.
 *
 * `activePageId` (UI-Brainstorm A4, 2026-07-24): welche Seite der Spieler GERADE sieht — nötig,
 * damit der Auto-Stopp-Toast (s. u.) nur feuert, während der Spieler NICHT auf der betroffenen
 * Skill-Seite steht (dort sieht er den Stopp-Grund ohnehin schon inline, s. SkillPage.tsx
 * `stopKey`/`.skill-stopped`).
 */
export function Toasts({ activePageId }: { activePageId: string }): JSX.Element {
  const state = useGameState();
  const { saveRecovery, dismissSaveRecovery, importSuccess, dismissImportSuccess } = useGameControl();
  const { t, tr, locale } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);
  // codex:2026-07-31T00:32:37+02:00 — Der umfassende Besitz-/Achievement-Diff ist für
  // UI-Feedback gedacht, nicht für die 10-Hz-Anzeige. Eine 1-Hz-Abtastung erhält alle
  // dauerhaften Zustandsänderungen, vermeidet aber wiederholte Vollscans und GC-Spitzen.
  const lastFullAuditAtRef = useRef(Number.NEGATIVE_INFINITY);
  const snap = useRef<{
    levels: Record<string, number>;
    total: number;
    rares: Record<string, number>;
    /** Chef-Entscheid 31.08.2026: Handwerks-Zaehler der raren Items im VORHERIGEN Diff-Tick —
     *  daran erkennt der Rare-Toast, dass ein Zuwachs aus der Werkbank kam und nicht aus Beute. */
    craftedRares: Record<string, number>;
    achievements: Set<string>;
    weaponStyle: string;
    fenceCount: number;
    enchantedIds: Set<string>;
    hasAnyPlot: boolean;
    slayerTasksCompleted: number;
    prevSlayerTaskReward: { xpReward: number; pointReward: number } | null;
    paragonCheckpoint: number;
    paragonBest: number;
    /** Welle EE (Mona M1): Mastery-Level je Aktion + Pool-Füllstand (0..1) je Skill. */
    masteryLevels: Record<string, number>;
    poolPct: Record<string, number>;
    /** Welle MM (Riko R3-1, "Batch-Ende-Toast-Leak"): die im VORHERIGEN Diff-Tick aktive Aktion —
     *  s. `activeCraftOutputs` oben für die volle Herleitung. */
    activeActionId: string | null;
    /** UI-Brainstorm A4: `state.lastStop?.actionId` im vorherigen Diff-Tick — erkennt die
     *  null→gesetzt-Flanke eines frischen Auto-Stopps (voll/Material leer), s. u. */
    lastStopActionId: string | null;
  } | null>(null);
  /**
   * Kosmetik-Sweep T3: `checkAchievements` (engine/tick.ts) läuft nur, wenn `advance()` mindestens
   * einen vollen TICK_MS-Schritt ausführt (`if (steps > 0)`) — beim Laden mit sehr kleinem/keinem
   * Offline-Fenster (z.B. Fixture-Loads mit `savedAt` ≈ jetzt, oder ein Reload Sekunden nach dem
   * letzten Speichern) bleibt dieser Schritt aus, und ein evtl. bereits erfüllter, aber noch nicht
   * verliehener Meilenstein wird erst beim ERSTEN echten Live-Tick NACH dem Mount nachgereicht —
   * das wäre die zweite Diff-Runde hier (Runde 0 = Mount-Baseline, Runde 1 = dieser Nachzügler-Tick)
   * und sähe wie ein Stapel „rückwirkender" Toasts aus. Daher wird NICHT nur Runde 0, sondern auch
   * die erste Runde MIT vorhandenem `prev` (Runde 1) still als Baseline übernommen (kein Toast,
   * `snap.current` aktualisiert sich trotzdem) — erst ab Runde 2 wird normal gediffed/getoastet.
   * TICK_MS = 100ms, das Zeitfenster ist also winzig; ein im selben Tick GENUIN neu erreichter
   * Meilenstein bliebe in der Praxis nicht unbemerkt (nächster Tick zeigt ihn ohnehin nicht erneut).
   */
  const settledRef = useRef(false);

  const push = (toast: Omit<Toast, "id">, durationMs: number = TOAST_MS): void => {
    const id = nextId++;
    setToasts((cur) => evictOverflow([...cur, { ...toast, id }]));
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), durationMs);
  };

  // Fix #368-7 (Bot-Sweep #367): Senke für UI-initiierte Toasts ohne Engine-Breadcrumb (s.
  // util/toastBus.ts JSDoc) — z.B. New Havens "Bau abgebrochen, Material erstattet." direkt aus
  // dem Bestätigungs-Dialog. `kind: "drop"` = dieselbe neutrale, niedrigpriorisierte Stufe wie
  // der bestehende Auto-Stopp-Hinweis oben (kein Jackpot-Look, aber trotzdem sichtbar bestätigt).
  useEffect(() => registerUiToastSink((toast) => {
    push(
      { kind: "drop", icon: toast.icon, iconUrl: toast.iconUrl, title: toast.title, detail: toast.detail },
      toast.durationMs,
    );
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Welle KK (Aldric-Retest, Fund #3 "Rekord-Toast-Inflation"): beim Erstaufstieg feuerte JEDE
   * bezwungene Etage einen eigenen legendären "Neuer Rekord!"-Toast — ~13 Stück in einer Session,
   * die sich gegenseitig aus dem MAX_TOASTS-FIFO drängten. Ein schnelles Auto-Aufstieg-Fenster
   * AKTUALISIERT jetzt denselben Toast (neue Etagenzahl, Anzeigedauer läuft neu an) statt einen
   * weiteren zu stapeln — solange der vorige Rekord-Toast noch sichtbar ist. Läuft er ab (oder
   * wurde durch andere Toasts aus dem FIFO verdrängt), startet der nächste Rekord wieder frisch.
   */
  const recordToastRef = useRef<{ id: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const pushOrRefreshRecordToast = (detail: string, durationMs: number): void => {
    // Wichtig: die "noch sichtbar?"-Prüfung liest das `toasts`-State DIREKT (Render-Closure), NICHT
    // den Rückgabewert eines `setToasts(cur => …)`-Updaters — React garantiert dessen synchrone
    // Ausführung nicht (v.a. außerhalb von Event-Handlern), ein Read-after-Write auf lokale
    // Variablen aus dem Updater direkt danach lieferte hier real STALE/undefined Werte (beobachtet:
    // zwei separate Toasts statt einem aktualisierten). `toasts` ist als Render-Closure exakt der
    // zuletzt committete Stand — für den EINEN Aufruf pro Tick hier ausreichend aktuell.
    const existing = recordToastRef.current;
    const stillVisible = !!existing && toasts.some((x) => x.id === existing.id);
    if (existing && stillVisible) {
      clearTimeout(existing.timer);
      setToasts((cur) => cur.map((x) => (x.id === existing.id ? { ...x, detail } : x)));
      const timer = setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== existing.id));
        if (recordToastRef.current?.id === existing.id) recordToastRef.current = null;
      }, durationMs);
      recordToastRef.current = { id: existing.id, timer };
      return;
    }
    const id = nextId++;
    setToasts((cur) => evictOverflow([
      ...cur,
      {
        id,
        kind: "rare" as const,
        rarity: "legendary",
        fx: effectiveFxLevel(),
        icon: "🗼",
        iconUrl: TOWER_ICON_URL,
        title: t("paragon.toast.record.title"),
        detail,
      },
    ]));
    const timer = setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== id));
      if (recordToastRef.current?.id === id) recordToastRef.current = null;
    }, durationMs);
    recordToastRef.current = { id, timer };
    playSfx("achievement");
  };

  // Dungeon-Rework-Spec §5.6.4 — Unlock-Moment: `state.lastDungeonUnlock` ist der UI-Breadcrumb
  // für einen Schlüsselfund (Einmal-Unlock, unlockDungeonsForKey in engine/dungeon.ts) — monoton
  // steigende `seq` (Muster `lastPetDrop`), quittiert mit `null`. Reiner Jackpot-Toast (kind "rare"
  // → dasselbe Gold-Puls-CSS wie ein seltener Item-Fund), da ein neu entsperrter Dungeon fortan die
  // Quelle des besten Loots seines Bandes ist (Leitplanke 2) — verdient denselben "bedeutsamer
  // Fund"-Look. Mehrere Dungeons können sich EIN Schlüssel-Item teilen (highland_key → aerie +
  // wyvern_lair) — alle neu entsperrten Namen werden zusammen gezeigt.
  // Welle MM (Pip P2 „Lade-Nachholung darf nicht stumm sein"): ein beim Mount bereits
  // UNQUITTIERTER Breadcrumb (lastDungeonUnlock != null, z.B. nach Laden eines Alt-/Offline-
  // Saves mit nachgeholtem Unlock) darf NICHT sofort in der Baseline verschwinden — der alte Init
  // las `?.seq ?? 0` direkt aus dem Breadcrumb selbst, was die Hochwassermarke exakt AUF dessen
  // eigene seq setzte und den Diff unten (`unlock.seq <= seenUnlockSeq.current`) sofort auf
  // "schon gesehen" kippen ließ, ohne dass je ein Toast lief. Ist ein Breadcrumb pending, startet
  // die Baseline EINEN Schritt darunter, damit der erste Effect-Lauf ihn als neu erkennt und
  // einmalig nachfeiert. Die settledRef-Baseline-Logik (s. deren JSDoc weiter unten) betrifft nur
  // die DIFF-basierten Toasts im großen Snapshot-Effect — dieser Breadcrumb ist ein explizites,
  // quittierbares Event und bewusst unabhängig davon.
  const seenUnlockSeq = useRef(
    state.lastDungeonUnlock ? state.lastDungeonUnlock.seq - 1 : 0,
  );
  useEffect(() => {
    const unlock = state.lastDungeonUnlock;
    if (!unlock || unlock.seq <= seenUnlockSeq.current) return;
    seenUnlockSeq.current = unlock.seq;
    const names = unlock.dungeonIds
      .map((id) => {
        const d = content.dungeons.find((dd) => dd.id === id);
        return d ? tr(d.name) : id;
      })
      .join(", ");
    push(
      {
        kind: "rare",
        rarity: "legendary",
        fx: effectiveFxLevel(),
        icon: "🗝",
        iconUrl: KEY_ICON_URL,
        title: t("dungeon.unlockToast.title"),
        detail: t("dungeon.unlockToast.detail").replace("{names}", names),
      },
      8000,
    );
    playSfx("achievement");
    state.lastDungeonUnlock = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // AP-Meilenstein-Momente (Welle GG → UI, SAVE 66): `state.lastApMilestone` ist der UI-Breadcrumb
  // ({steps; tokens; seq}), quittiert mit `null`. seenSeq-PFLICHT-Muster (Lehre aus Welle DD):
  // initialisiert aus dem monotonen `apMilestoneSeq`, NIE aus dem nullbaren Breadcrumb selbst —
  // sonst würde ein Reload nach Quittung wieder bei "0 gesehen" starten und den NÄCHSTEN Schritt
  // fälschlich verschlucken. Ein Nachhol-Stapel (Alt-Save, mehrere Schritte auf einmal) wird zu
  // GENAU EINEM Toast zusammengefasst — der Text nennt den zuletzt erreichten Schritt + die
  // Summe der gutgeschriebenen Tokens (steps/tokens stehen bereits fertig im Event).
  // Welle MM (Pip P2, s. ausführliche JSDoc bei seenUnlockSeq oben für die volle Herleitung):
  // dieselbe Mount-Swallow-Falle — `state.apMilestoneSeq` reflektiert bereits JEDEN vergebenen
  // Meilenstein, auch einen beim Laden nachgeholten, aber noch unquittierten
  // (`lastApMilestone != null`). Baseline startet in diesem Fall einen Schritt unter dessen `seq`.
  const seenApMilestoneSeq = useRef(
    state.lastApMilestone ? state.lastApMilestone.seq - 1 : state.apMilestoneSeq,
  );
  useEffect(() => {
    const m = state.lastApMilestone;
    if (!m || m.seq <= seenApMilestoneSeq.current) return;
    seenApMilestoneSeq.current = m.seq;
    const lastStep = m.steps[m.steps.length - 1] ?? 0;
    push(
      {
        kind: "achievement",
        // Welle MM (Vesna+Pip, "Toast-Verdrängungs-Priorität"): explizit "high" markiert — sonst
        // teilt sich dieser Toast sein `kind` ("achievement") mit dem niedrigpriorisierten
        // generischen Achievement-/Task-Complete-Toast und wäre gegen den blinden FIFO nicht
        // besser geschützt als die.
        priority: "high",
        icon: "🏆",
        iconUrl: ACHIEVEMENT_ICON_URL,
        title: t("toast.apMilestone.title"),
        detail: t("toast.apMilestone.detail")
          .replace("{pct}", String(lastStep))
          .replace("{tokens}", String(m.tokens)),
      },
      7000,
    );
    playSfx("achievement");
    state.lastApMilestone = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Slayer-Task-Streak-Bonus (Welle GG → UI, SAVE 66): `state.lastSlayerStreakBonus`
  // ({streak; tokens; points; seq}), quittiert mit `null`. Dasselbe seenSeq-PFLICHT-Muster wie
  // oben, initialisiert aus `slayerStreakSeq`. Tokens und/oder Punkte können je nach erreichtem
  // Intervall (jeder 5./10. Task) einzeln oder zusammen anfallen — nur die tatsächlich vergebenen
  // Teile werden gezeigt.
  // Welle MM (Pip P2, s. JSDoc bei seenUnlockSeq oben): dieselbe Mount-Swallow-Falle.
  const seenSlayerStreakSeq = useRef(
    state.lastSlayerStreakBonus ? state.lastSlayerStreakBonus.seq - 1 : state.slayerStreakSeq,
  );
  useEffect(() => {
    const b = state.lastSlayerStreakBonus;
    if (!b || b.seq <= seenSlayerStreakSeq.current) return;
    seenSlayerStreakSeq.current = b.seq;
    const parts: string[] = [];
    if (b.tokens > 0) parts.push(t("toast.slayerStreak.tokens").replace("{n}", String(b.tokens)));
    if (b.points > 0) parts.push(t("toast.slayerStreak.points").replace("{n}", String(b.points)));
    push({
      kind: "achievement",
      // Welle MM (Vesna+Pip, "Toast-Verdrängungs-Priorität"): s. Kommentar bei der AP-Meilenstein-
      // Push oben — Vesnas Repro (Task+Streak+LevelUp+Achievement gleichzeitig) verdrängte genau
      // diesen Toast, obwohl er der wertvollste Moment der vier war.
      priority: "high",
      icon: "⚔",
      iconUrl: getSkillIcon("slayer") ?? getSidebarIcon("slayer"),
      title: t("toast.slayerStreak.title").replace("{n}", String(b.streak)),
      detail: parts.join(" · "),
    });
    playSfx("achievement");
    state.lastSlayerStreakBonus = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Paragon-Meilenstein-Truhe (Welle LL → UI, SAVE 68, Fun-Retest paragon-aldric P1 "die stumme
  // Meilenstein-Truhe"): `state.lastParagonChest` ({floor; chestTier; items; seq}), quittiert mit
  // `null`. Dasselbe seenSeq-PFLICHT-Muster wie oben, initialisiert aus `paragonChestSeq` (NIE aus
  // dem nullbaren Breadcrumb). `items` darf leer sein (alle Chance-Rows verfehlt) — die Truhe wird
  // trotzdem gefeiert, nur ohne Beute-Aufzählung. Jackpot-Stil (kind "rare"), das erste Item liefert
  // (wenn vorhanden) das Toast-Icon — billige Variante von "Icons wenn vorhanden" ohne neues
  // Mehr-Icon-Layout im Toast selbst.
  // Welle MM (Pip P2, s. JSDoc bei seenUnlockSeq oben): dieselbe Mount-Swallow-Falle.
  const seenParagonChestSeq = useRef(
    state.lastParagonChest ? state.lastParagonChest.seq - 1 : state.paragonChestSeq,
  );
  useEffect(() => {
    const chest = state.lastParagonChest;
    if (!chest || chest.seq <= seenParagonChestSeq.current) return;
    seenParagonChestSeq.current = chest.seq;
    const itemsText = chest.items
      .map((it) => {
        const item = content.items[it.id];
        return `${it.qty}× ${item ? tr(item.name) : it.id}`;
      })
      .join(", ");
    const detail = itemsText
      ? t("paragon.toast.chest.detail")
          .replace("{floor}", String(chest.floor))
          .replace("{items}", itemsText)
      : t("paragon.toast.chest.detailEmpty").replace("{floor}", String(chest.floor));
    const firstItemId = chest.items[0]?.id ?? null;
    push(
      {
        kind: "rare",
        rarity: "legendary",
        fx: effectiveFxLevel(),
        icon: "🎁",
        iconUrl: firstItemId ? getItemImage(firstItemId) : null,
        title: t("paragon.toast.chest.title"),
        detail,
      },
      8000,
    );
    playSfx("achievement");
    state.lastParagonChest = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Elite-/World-Spawns („Champions des Reach", design/elite-spawns-concept.md §2.1, Phase 3 UI):
  // `state.lastEliteSpawn` ({zoneId; variantId; seq}), quittiert mit `null`. Dasselbe seenSeq-
  // PFLICHT-Muster wie oben, initialisiert aus dem monotonen `eliteSpawnSeq` — NIE aus dem
  // nullbaren Breadcrumb selbst (Welle MM Pip-P2-Lehre, s. JSDoc bei seenUnlockSeq oben).
  // `content.elites` ist parallel von content-dev befüllt (Phase 2) — ohne passenden Content-
  // Eintrag feuert KEIN Toast (Content-Drift-Schutz: ein Save kann zwischen Spawn und
  // Content-Update geladen werden). Episch/dunkelrot statt Gold (kind "elite", eigenes CSS in
  // pages.css) — ein GEGNER-Ereignis, kein Belohnungs-Jackpot. Klick springt über das bestehende
  // Wiki→Kampfgebiet-Sprung-Muster (util/monsterJump.ts) zur Zone des Basis-Mobs — CombatPage
  // öffnet dort automatisch die hervorgehobene Elite-Karte mit.
  // Jagd-Paket Task 5 (Chef-GO, "Spawn-Fanfare"): der ursprüngliche „bewusst OHNE Sound"-Entscheid
  // (design/elite-spawns-concept.md §6) ist mit diesem Auftrag überholt — ein kurzes Horn
  // (`playSfx("eliteHorn")`, util/audio.ts) begleitet den Toast jetzt. Graceful: solange die Datei
  // `assets/audio/elite_horn.mp3` fehlt, bleibt der Aufruf ein stiller No-op.
  const seenEliteSpawnSeq = useRef(
    state.lastEliteSpawn ? state.lastEliteSpawn.seq - 1 : state.eliteSpawnSeq,
  );
  useEffect(() => {
    const spawn = state.lastEliteSpawn;
    if (!spawn || spawn.seq <= seenEliteSpawnSeq.current) return;
    seenEliteSpawnSeq.current = spawn.seq;
    const variant = content.elites?.[spawn.variantId];
    if (!variant) return; // Content-Drift — kein Toast, s. JSDoc oben
    const zone = content.zones.find((z) => z.id === spawn.zoneId);
    const zoneName = zone ? tr(zone.name) : spawn.zoneId;
    // Zweite Verteidigungslinie (Spieler-Report 1.0.0 „The Ninth Warden … i do not see how to gain
    // access", Fix 1.0.1): der Zyklus kündigt seit 1.0.1 nur noch erreichbare Champions an
    // (engine/elites.ts `isEliteZoneHuntable`) und die Persistenz räumt Alt-Breadcrumbs beim Laden
    // ab — falls doch je einer durchrutscht (hand-editierter Save, künftige Content-Drift), sagt
    // die Meldung es EHRLICH, statt in eine Zone zu schicken, die es für den Spieler nicht gibt.
    // Der Sprung-Klick entfällt dann ebenfalls (er liefe ins Leere: `jumpToMonster` findet für ein
    // dungeonOnly-/gesperrtes Ziel keine Zonen-Karte).
    const reachable = isEliteZoneHuntable(state, content, spawn.zoneId);
    const detail = t("toast.elite.detail").replace("{zone}", zoneName);
    push(
      {
        kind: "elite",
        priority: "high",
        icon: "⚔",
        iconUrl: getEliteMonsterSrc(spawn.variantId, variant.baseMonsterId),
        title: t("toast.elite.title"),
        detail: reachable ? detail : `${detail} ${t("toast.elite.sealed")}`,
        onClick: reachable ? () => jumpToMonster(variant.baseMonsterId) : undefined,
      },
      9000,
    );
    playSfx("eliteHorn");
    state.lastEliteSpawn = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Lager-Bau fertiggestellt (Task #364 Fix 1, Audit #363 „ein online fertiggestellter Bau meldet
  // sich beim Spieler nicht"): `state.camp.lastCompletedBuild` ({buildingId; level; seq}) ist der
  // Breadcrumb, den `tickCampBuild` (engine/camp.ts) beim Abschluss setzt — geschrieben und
  // persistiert war er seit SAVE 76, gelesen hat ihn bis hierher NIEMAND. Stufe-I-Bauten dauern
  // 10–30 Minuten und wurden im laufenden Spiel komplett stumm fertig.
  //
  // Dasselbe seenSeq-PFLICHT-Muster wie die Breadcrumbs oben, initialisiert aus dem monotonen
  // `camp.buildSeq` — plus die Pip-P2-Ausnahme (s. JSDoc bei seenUnlockSeq): liegt beim Mount
  // bereits ein UNQUITTIERTER Breadcrumb, startet die Baseline einen Schritt darunter, damit er
  // einmalig nachgefeiert wird statt in der Baseline zu verschwinden.
  //
  // ENTKOPPLUNG ONLINE/OFFLINE (kein Doppel-Toast): der Breadcrumb wird hier mit `null` quittiert
  // (so verspricht es der shared-Vertrag an `CampState.lastCompletedBuild`) — und die „Während du
  // weg warst"-Bühne quittiert ihn GENAUSO, wenn sie ihn selbst zeigt (GameContext.loadGame,
  // `offline.campBuilds` + geöffnetes Popup). Wer meldet, quittiert. Damit gilt:
  //   • online fertig            → Toast (Popup läuft gar nicht),
  //   • offline fertig + Popup   → nur das Popup (Breadcrumb ist beim Mount schon null),
  //   • offline fertig OHNE Popup (kurze Abwesenheit ohne Ertrag — das Popup-Gate verlangt
  //     >60 s UND Ertrag) → Toast holt es nach. Kein Fall bleibt stumm, keiner meldet doppelt.
  const seenCampBuildSeq = useRef(
    state.camp?.lastCompletedBuild
      ? state.camp.lastCompletedBuild.seq - 1
      : state.camp?.buildSeq ?? 0,
  );
  useEffect(() => {
    const done = state.camp?.lastCompletedBuild;
    if (!done || done.seq <= seenCampBuildSeq.current) return;
    seenCampBuildSeq.current = done.seq;
    const def = (content.campBuildings ?? []).find((b) => b.id === done.buildingId);
    // Content-Drift (Gebäude umbenannt/entfernt, Save älter als der Katalog): lieber kein Toast
    // als ein Toast mit roher ID — Muster Elite-Spawn oben.
    if (!def) return;
    push(
      {
        kind: "achievement",
        // Ein fertiges Gebäude ist ein seltener, teuer erkaufter Moment (Stunden Bauzeit,
        // Material + Gold): darf NICHT vom Level-up-/Achievement-Rauschen aus dem FIFO gedrängt
        // werden, s. `isHighPriorityToast`.
        priority: "high",
        icon: "⛺",
        iconUrl: getCampImage(done.buildingId, done.level) ?? getSidebarIcon("newhaven"),
        title: t("newhaven.toast.built.title"),
        detail: t("newhaven.toast.built.detail")
          .replace("{name}", tr(def.name))
          .replace("{level}", romanLevel(done.level)),
      },
      8000,
    );
    playSfx("achievement");
    // Quittung (shared-Vertrag `CampState.lastCompletedBuild`: „Die UI quittiert mit null").
    if (state.camp) state.camp.lastCompletedBuild = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // ── Taverne (1.2.0 „Alive", taverne-spec-technik.md §6): App-weiter Tageswechsel-Hook ─────────
  // beim Mount + um Mitternacht `tavernRefresh` — TavernPage selbst ruft es beim eigenen Mount
  // ZUSÄTZLICH auf (idempotent, s. dortiger Kommentar); dieser Hook hier deckt den Fall ab, dass
  // der Spieler NICHT auf der Taverne-Seite steht (z.B. beim App-Start). Kein seenSeq-Muster
  // nötig: `tavernRefresh` selbst ist idempotent (gleicher Tag ⇒ false, kein Toast) und prüft
  // intern bereits, ob die Taverne überhaupt gebaut ist.
  useEffect(() => {
    const runTavernRefresh = (): void => {
      if (!TAVERN_ENABLED) return; // Release-Schalter (1.1.2 ohne Taverne)
      if (tavernRefresh(state, content, todayStamp())) {
        push({
          kind: "drop",
          icon: "🍺",
          iconUrl: getSidebarIcon("tavern"),
          title: t("tavern.toast.newGuests.title"),
          detail: t("tavern.toast.newGuests.detail"),
        });
      }
    };
    runTavernRefresh();
    const timer = window.setTimeout(runTavernRefresh, msUntilMidnight() + 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Taverne — Abgabe-Zeremonie (Spec §6): `state.tavern.lastDelivery` ({seq; guestId; gold; xp;
  // skill; items; crates}), quittiert mit `null` (Muster `lastParagonChest`). seenSeq-PFLICHT-
  // Muster (Pip-P2-Lehre, s. JSDoc bei `seenUnlockSeq` weiter oben): initialisiert aus dem
  // monotonen `tavern.deliverSeq`, mit der Ausnahme für einen beim Mount bereits unquittierten
  // Breadcrumb. Rare-Toast-Regeln für den Behälter-Inhalt gelten automatisch mit — der reguläre
  // Rare-Diff weiter unten in dieser Datei scannt Inventar/Bank/Instanzen ohnehin bei jedem Tick,
  // ein per Behälter gewonnenes Rare-Item feuert also seinen eigenen Jackpot-Toast ganz von selbst.
  const seenTavernDeliverySeq = useRef(
    state.tavern.lastDelivery ? state.tavern.lastDelivery.seq - 1 : state.tavern.deliverSeq,
  );
  useEffect(() => {
    const delivery = state.tavern.lastDelivery;
    if (!delivery || delivery.seq <= seenTavernDeliverySeq.current) return;
    seenTavernDeliverySeq.current = delivery.seq;
    const guest = tavernGuestDef(content, delivery.guestId);
    const parts: string[] = [];
    if (delivery.gold > 0) parts.push(`+${formatNum(delivery.gold)} ${t("tavern.reward.gold")}`);
    if (delivery.xp > 0) {
      const skillDef = content.skills[delivery.skill];
      parts.push(`+${formatNum(delivery.xp)} ${t("tavern.reward.xp")} (${skillDef ? tr(skillDef.name) : delivery.skill})`);
    }
    for (const it of delivery.items) {
      const def = content.items[it.id];
      parts.push(`${it.qty}× ${def ? tr(def.name) : it.id}`);
    }
    for (const crateId of delivery.crates) {
      const def = content.items[crateId];
      parts.push(def ? tr(def.name) : crateId);
    }
    push(
      {
        kind: "achievement",
        icon: "🍺",
        iconUrl: getSidebarIcon("tavern"),
        title: t("tavern.toast.delivered.title").replace("{name}", guest ? tr(guest.name) : delivery.guestId),
        detail: parts.join(" · "),
      },
      6000,
    );
    playSfx("achievement");
    state.tavern.lastDelivery = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // ── Endlos-Sperre der Warteschlange (Task #369, Bot-Sweep 0.3.0) ─────────────────────────────
  // Läuft eine Aktivität mit dem ∞-Preset, rückt die Queue nie vor (das IST die ∞-Semantik) — der
  // Befund war, dass es dafür null Rückmeldung gab. Der Moment, in dem der Spieler die falsche
  // Erwartung bildet, ist das EINREIHEN; genau dort setzt dieser Toast an. Bewusst hier statt in
  // den Skill-/Kampf-Karten: eine Stelle deckt ALLE Einreih-Pfade ab (Skill-Grid, Monster-Karten,
  // Hotkeys, künftige) und das Queue-Panel kann eingeklappt sein.
  //
  // `queueBlockReason` ist eine reine Ableitung aus dem Engine-State (packages/engine/actions.ts)
  // — kein Breadcrumb-Feld, also auch kein seq-/Quittungs-Muster wie die Events oben, sondern
  // reine Flanken-Erkennung über einen Ref. "paused" bleibt außen vor: dafür gibt es den eigenen,
  // deutlicheren Block im Queue-Panel. `undefined` = noch keine Baseline: ein Save, das BEREITS
  // gesperrt geladen wird, feuert nicht nach (das Panel zeigt den Zustand dauerhaft an, und der
  // Lade-Moment ist ohnehin die lauteste Toast-Phase). Neutrale, niedrige Priorität — dieser
  // Hinweis darf keinen Jackpot-Toast aus dem FIFO drängen.
  const seenQueueBlockRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const reason = queueBlockReason(state, content);
    const key = reason === null || reason === "paused" ? null : reason;
    const isBaseline = seenQueueBlockRef.current === undefined;
    if (key === null) {
      seenQueueBlockRef.current = null; // entsperrt → die nächste Sperre darf wieder melden
      return;
    }
    if (isBaseline || seenQueueBlockRef.current === key) {
      seenQueueBlockRef.current = key;
      return;
    }
    seenQueueBlockRef.current = key;
    push(
      {
        kind: "drop",
        icon: "⏳",
        title: t("toast.queueBlocked.title"),
        detail: t(`queue.blocked.${key}`),
      },
      6000,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // Selbstheilungs-Hinweis (Task #288 D): GameContext hat einen beschädigten Slot aus einem
  // lokalen Backup wiederhergestellt → einmaliger Hinweis-Toast (bewusst länger sichtbar).
  // Ref-Wächter aus demselben Grund wie beim Import-Hinweis unten (identisches Mount/StrictMode-
  // Doppel-Effekt-Muster) — vorsorglich mitgehärtet, s. dessen ausführlichen Kommentar.
  const recoveryHandledRef = useRef(false);
  useEffect(() => {
    if (!saveRecovery) {
      recoveryHandledRef.current = false;
      return;
    }
    if (recoveryHandledRef.current) return;
    recoveryHandledRef.current = true;
    const dateStr = new Date(saveRecovery.restoredFromMs).toLocaleString(locale);
    push(
      {
        kind: "achievement",
        icon: "💾",
        title: t("toast.saveRecovered.title"),
        detail: t("toast.saveRecovered.body").replace("{date}", dateStr),
      },
      10_000,
    );
    dismissSaveRecovery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRecovery]);

  // Import-Erfolgs-Hinweis (Tester-Sweep 2, T9): s. GameControl.importSuccess-Doc — der eigentliche
  // Import passierte VOR diesem Mount (der `sessionEpoch`-Remount tauscht MainLayout inkl. dieser
  // Toasts-Instanz komplett aus), dieser Toast ist die einzige Rückmeldung, die der Spieler je zu
  // sehen bekommt (die alte OptionsPage stirbt vor ihrem eigenen Inline-Status-Render).
  //
  // Welle Y (Jorin-Fund): dieser frisch gemountete Toasts.tsx-Baum trifft in React.StrictMode
  // (main.tsx) auf den bekannten Dev-Doppel-Effekt — React ruft Mount-Effekte einmal aus, simuliert
  // sofort ein Cleanup und ruft sie dann ERNEUT auf, alles VOR einem Zwischen-Render. `importSuccess`
  // ist in beiden Aufrufen noch `true` (der `dismissImportSuccess()`-State-Update aus Aufruf 1 hat
  // zu diesem Zeitpunkt noch nicht committed), also feuerte `push()` zweimal — zwei identische
  // Toasts. Ein Ref überlebt diesen simulierten Unmount/Remount-Zyklus (nur die Effekt-Funktion wird
  // erneut ausgeführt, nicht die Komponente selbst neu erzeugt) und quittiert daher zuverlässig
  // genau einmal pro echtem `importSuccess`-Impuls.
  const importHandledRef = useRef(false);
  useEffect(() => {
    if (!importSuccess) {
      importHandledRef.current = false;
      return;
    }
    if (importHandledRef.current) return;
    importHandledRef.current = true;
    push({
      kind: "achievement",
      icon: "💾",
      title: t("toast.saveImported.title"),
      detail: t("toast.saveImported.body"),
    }, 6000);
    dismissImportSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importSuccess]);

  // Dev-only screenshot hook (analog PetCelebration.tsx `getPetTestParam`): `?toastTest=rare` /
  // `epic` / `legendary` pusht einen echten Rare-Toast (samt Jackpot-Look über die reale
  // CombatFxLevel-Gating-Logik, effectiveFxLevel) mit einem echten Item dieser Rarity aus dem
  // Katalog — lässt die ui-audit-Skripte den Jackpot-Look deterministisch abgreifen, ohne einen
  // echten Drop abzuwarten. Verzögert (statt sofort bei Mount), weil frisch geladene Fixtures beim
  // ersten Tick-Batch mehrere Achievement-Toasts nachziehen können (Sync-über-Snapshot-Kante) —
  // dieselbe "Ladezeit-Toasts abwarten"-Regel wie combat-fx-shot-296.mjs, sonst würde der Test-
  // Toast vom FIFO-Cap (MAX_TOASTS) sofort wieder verdrängt. Gated auf import.meta.env.DEV, von
  // Vite in Prod-Builds tree-geshaked.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let test: string | null = null;
    try {
      test = new URLSearchParams(window.location.search).get("toastTest");
    } catch {
      return;
    }
    if (test !== "rare" && test !== "epic" && test !== "legendary") return;
    const item = Object.values(content.items).find((it) => it.rarity === test);
    if (!item) return;
    const timer = window.setTimeout(() => {
      push(
        {
          kind: "rare",
          rarity: test,
          fx: effectiveFxLevel(),
          icon: item.icon ?? "✨",
          iconUrl: getItemImage(item.id),
          title: t("toast.rareFind"),
          detail: tr(item.name),
        },
        10_000,
      );
    }, 4500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // codex:2026-07-31T00:32:37+02:00 — Maximal einmal pro Sekunde; Toasts können dadurch
    // höchstens eine Sekunde später erscheinen, Zustandsänderungen gehen nicht verloren.
    const auditNow = performance.now();
    if (auditNow - lastFullAuditAtRef.current < 1000) return;
    lastFullAuditAtRef.current = auditNow;

    // Aktuellen Stand erfassen.
    const levels: Record<string, number> = {};
    for (const id of Object.keys(content.skills)) levels[id] = levelFromXp(state.skills[id]?.xp ?? 0);
    const total = state.character.totalLevel;
    // Rare-Zählung über den GESAMTBESITZ (Inventar + Instanz-Tasche + Ausrüstung + Bank) statt nur
    // Inventar-Slots (Chef 2026-07-08): reines Umräumen (Ablegen einer Waffe, Bank-Ein-/Auslagern)
    // verschiebt nur zwischen den Töpfen → Netto-Null → kein irreführender „Rare Find!"-Toast mehr.
    // Nur ECHTER Neuerwerb (Drop, Crafting, Quest/Token-Shop) erhöht die Summe.
    const rares: Record<string, number> = {};
    /**
     * Wie oft der Spieler jedes rare+ Item BISHER SELBST HERGESTELLT hat (`stats.craftedById`,
     * gepflegt von der Engine bei jedem Craft). Nur fuer die raren Ids erhoben, nicht fuer den
     * ganzen Katalog — der Vergleich lebt genau einen Diff-Tick.
     */
    const craftedRares: Record<string, number> = {};
    const addRare = (itemId: string | null | undefined, qty: number): void => {
      if (!itemId || qty <= 0) return;
      if (!RARE.has(content.items[itemId]?.rarity ?? "")) return;
      if (itemId === RELIC_DUST_ITEM_ID) return; // claude:2026-10-24T17:20:00+02:00 — Reliktstaub (1.4.0 BG) kommt bei jedem Zerlegen: kein „Seltener Fund!“
      rares[itemId] = (rares[itemId] ?? 0) + qty;
    };
    // claude:2026-10-17T21:00:00+02:00 Herstellungszaehler fuer ALLE seltenen Items, nicht nur fuer
    // gerade besessene: sonst fehlte der Vorher-Wert eines neu hinzukommenden Items (undefined -> 0)
    // und echte Beute eines schon einmal gecrafteten Items wurde als „Crafting" unterdrueckt.
    for (const [id, n] of Object.entries(state.stats.craftedById)) {
      if (RARE.has(content.items[id]?.rarity ?? "")) craftedRares[id] = n;
    }
    for (const slot of state.inventory.slots) if (slot) addRare(slot.itemId, slot.qty);
    for (const inst of state.inventory.instances) addRare(inst.baseItemId, 1);
    // Fix-Welle CC (Riko, Befund 1): NUR `equipment` durchzählen, NICHT zusätzlich
    // `equippedInstances` — laut shared/index.ts-Invariante hält `equipment[slot]` IMMER die
    // Basis-ID, auch wenn der Slot verzaubert ist (`equippedInstances[slot]` existiert nur
    // GENAU DANN, wenn `equipment[slot] === equippedInstances[slot].baseItemId`). Ein
    // ausgerüstetes rare+ Item wurde vorher doppelt gezählt (einmal roh, einmal als Instanz) —
    // das Verzaubern eines bereits getragenen Items ließ den Slot von "nur equipment" auf
    // "equipment + equippedInstances" springen (1 → 2 im selben Item), was hier wie ein echter
    // Neuzugang aussah und fälschlich den „Rare find!"-Toast auslöste, obwohl kein neues Item
    // dazukam. `equipment` allein zählt jeden ausgerüsteten Slot exakt einmal, ob Instanz oder
    // nicht — kein separater Instanz-Durchlauf nötig.
    for (const id of Object.values(state.character.equipment)) addRare(id, 1);
    // Ausruestungs-Kits (Chef-Report 28.08.2026, "Rare Find beim Kit-Wechsel"): die Items der INAKTIVEN Kits gehoeren
    // genauso zum Gesamtbesitz; ein Kit-Wechsel schiebt sie nur zwischen Kit und Charakter (Netto-Null). Das aktive Kit
    // ist der Spiegel von `character.equipment` und zaehlt deshalb NICHT noch einmal.
    (state.equipKits ?? []).forEach((kit, i) => {
      if (i === state.activeKit) return;
      // Chef-Report 29.08.2026: verzauberte Items erschienen beim Wechsel aus einem leeren Kit als Neufund. Ein Kit
      // kann eine Instanz auch OHNE gespiegelte Basis-ID im Slot tragen (aeltere Kit-Migration) — dann zaehlt die
      // Instanz ueber ihre baseItemId; je Slot genau einmal.
      for (const slot of Object.keys(kit.equipment ?? {})) {
        const id = kit.equipment[slot as keyof typeof kit.equipment] ?? kit.equippedInstances?.[slot as keyof typeof kit.equippedInstances]?.baseItemId ?? null;
        addRare(id, 1);
      }
      for (const [slot, inst] of Object.entries(kit.equippedInstances ?? {})) {
        if (inst && !(slot in (kit.equipment ?? {}))) addRare(inst.baseItemId, 1);
      }
    });
    for (const [id, q] of Object.entries(state.bank)) addRare(id, q);
    for (const inst of state.bankInstances ?? []) addRare(inst.baseItemId, 1);

    // Welle KK (Riko N1): Item-IDs, die die AKTUELL laufende Aktion GARANTIERT (chance 1) erzeugt —
    // deterministischer Craft-Output ist kein "Fund". Vorher feuerte "Rare find!" bei JEDEM
    // Abschluss eines rare-rarity-Rezepts (4 Crafts = 4 Toasts), was den echten Jackpot entwertete.
    // Nur GARANTIERTE Loot-Zeilen zählen — ein seltener Bonus-Loot derselben Aktion (chance < 1)
    // bleibt ein echter Fund und toastet weiter. Der Suffix-Reveal (echter Jackpot am Craft) hängt
    // an einer komplett anderen Quelle (enchantedIds/suffixSigById unten) und bleibt unberührt.
    // Welle MM (Riko R3-1, "Batch-Ende-Toast-Leak"): der Ausschluss betrachtete bisher NUR die
    // AKTUELL laufende Aktion — beim letzten Craft eines endlichen Batches endet die Aktion im
    // SELBEN Tick, in dem ihr letzter deterministischer Loot noch ins Inventar wandert
    // (`state.activeActionId` ist zu diesem Zeitpunkt schon wieder null). Die im VORHERIGEN
    // Diff-Tick aktive Aktion (aus `snap.current`, falls sie inzwischen beendet wurde) zählt
    // deshalb zusätzlich mit — ihr garantierter Output bleibt für genau diesen einen
    // Nachzügler-Tick von der "das ist kein Fund"-Ausnahme erfasst. Läuft die Aktion einfach
    // weiter (beide Ticks dieselbe Id), ist das Ergebnis identisch zu vorher; startet im selben
    // Tick ein GENUIN neuer Batch, zählt der korrekt seine eigenen (neuen) deterministischen
    // Outputs zusätzlich mit rein — kein falscher Ausschluss für den neuen Batch.
    const activeCraftOutputs = new Set<string>();
    for (const actionId of [state.activeActionId, snap.current?.activeActionId ?? null]) {
      const action = actionId ? content.actions[actionId] : undefined;
      for (const l of action?.loot ?? []) if (l.chance >= 1) activeCraftOutputs.add(l.itemId);
    }

    const achievements = new Set(state.achievements);

    // Waffen-Stil für Onboarding-Toasts.
    const stats = computeStats(state, content);
    const weaponStyle = stats.style;

    // Fence-discovery count: total stolen goods eligible for fence actions.
    const fenceCount = countFenceItems(state.inventory);

    // Enchanted instance IDs currently in inventory (affix or suffix) — Varianten-Tasche (v53).
    // Welle SS (Chef-Entscheid 2026-07-18, "Suffixe sollen nicht rerollbar sein"): das UI-seitige
    // Reroll-Feature ist komplett entfernt — ein Suffix ist ab dem Erst-Roll für die Lebensdauer der
    // Instanz fix, eine instanceId kann ihre Signatur also nie mehr ändern. Der Diff unten braucht
    // deshalb keine Reroll-Erkennung mehr und reduziert sich auf reine NEU-Instanz-Erkennung
    // (`prev.enchantedIds` s.u.) — der Suffix-Erstfund-Reveal-Toast bleibt unverändert. Equipped
    // Instanzen laufen weiterhin mit (Welle KK): equipment/inventory sind laut Invariante disjunkt.
    const enchantedIds = new Set<string>();
    const allInstances = [
      ...state.inventory.instances,
      ...Object.values(state.character.equippedInstances).filter((i): i is NonNullable<typeof i> => !!i),
      // Chef-Report 29.08.2026 ("Discovery-Bug bei Kits ist zurueck"): Instanzen in INAKTIVEN Kits gehoeren dazu, sonst
      // gelten sie beim Zurueckwechseln (leeres Kit 2 -> Kit 1) als neu und der Verzaubert-Toast feuert erneut.
      ...(state.equipKits ?? []).flatMap((kit, i) =>
        i === state.activeKit ? [] : Object.values(kit.equippedInstances ?? {}).filter((inst): inst is NonNullable<typeof inst> => !!inst),
      ),
      ...(state.bankInstances ?? []),
    ];
    for (const inst of allInstances) {
      if (inst.affixes.length > 0 || !!inst.suffix) {
        enchantedIds.add(inst.instanceId);
      }
    }

    // Whether any farm plot has a crop planted.
    const hasAnyPlot = state.farmPlots.some((p) => p.cropId !== null);

    // Slayer task completion counter and current task reward snapshot.
    const slayerTasksCompleted = (state.slayerTasksCompleted as number) ?? 0;
    const prevSlayerTaskReward = state.slayerTask
      // claude:2026-10-17T20:30:00+02:00 — Toast meldet die echte Gutschrift inkl. Boni (wie die Engine).
      ? { xpReward: state.slayerTask.xpReward, pointReward: slayerTaskPointsPayout(state, content, state.slayerTask.pointReward) }
      : null;

    // Paragonturm (§7, Welle P2): Checkpoint/Rekord — `?? 0` rein defensiv (state.paragon ist seit
    // SAVE_VERSION 61 nicht-optional, s. shared/index.ts), spiegelt aber den Lese-Stil der übrigen
    // Snapshot-Felder hier (nie roh gegen ein evtl. fehlendes Feld crashen).
    const paragonCheckpoint = state.paragon?.checkpoint ?? 0;
    const paragonBest = state.paragon?.best ?? 0;

    // UI-Brainstorm A4 (2026-07-24, -gamefeel.md #17): Auto-Stopp-Grund für den Diff unten.
    const lastStopActionId = state.lastStop?.actionId ?? null;
    const lastStopReason = state.lastStop?.reason ?? null;

    // Welle EE (Mona M1): Mastery-Level je Aktion + Pool-Füllstand je Skill, EIN Durchlauf über
    // content.actions (dieselbe Größenordnung wie der Achievement-/Skill-Level-Diff oben — kein
    // Sonderfall, nur ein weiteres Snapshot-Feld). poolPct nutzt die modul-weit vorberechnete
    // Kapazität (s. MASTERY_POOL_CAPACITY_BY_SKILL oben) statt sie pro Tick neu zu summieren.
    const masteryLevels: Record<string, number> = {};
    const poolXpBySkill: Record<string, number> = {};
    for (const action of Object.values(content.actions)) {
      const xp = state.mastery[action.id]?.xp ?? 0;
      masteryLevels[action.id] = levelFromXp(xp);
      poolXpBySkill[action.skill] = (poolXpBySkill[action.skill] ?? 0) + xp;
    }
    const poolPct: Record<string, number> = {};
    for (const [skillId, xp] of Object.entries(poolXpBySkill)) {
      const cap = MASTERY_POOL_CAPACITY_BY_SKILL.get(skillId) ?? 0;
      poolPct[skillId] = cap > 0 ? Math.min(1, xp / cap) : 0;
    }

    const prev = snap.current;
    if (!prev) {
      // Erster Snapshot (App-Start / Save geladen): bereits verdiente Achievements einmalig zu
      // Steam nachziehen (No-Op ohne Steam; idempotent). Steam-Brücke steht bereit, wirkt aber
      // erst, sobald die AppID gesetzt ist — siehe main/steam.ts.
      void window.hearthforge?.steam?.syncAchievements([...achievements]);

      // ── Same-Style-Start: Stil-Hinweis auch OHNE Stil-Wechsel ────────────────
      // Die Startwaffe wird bereits vor dem ersten Snapshot ausgerüstet (state.ts), daher gibt es
      // für Fernkampf-/Magie-Starter nie den melee→ranged/magic-Übergang, an den der Hinweis unten
      // gekoppelt ist. Hier einmalig nachholen, sonst sehen genau diese Spieler den Hinweis NIE.
      if (weaponStyle === "ranged" && !hasSeenRangedHint()) {
        setSeenRangedHint();
        push({
          kind: "level",
          icon: "🏹",
          title: t("toast.onboarding.rangedTitle"),
          detail: t("toast.onboarding.rangedBody"),
        });
      } else if (weaponStyle === "magic" && !hasSeenMagicHint()) {
        setSeenMagicHint();
        push({
          kind: "level",
          icon: "✦",
          title: t("toast.onboarding.magicTitle"),
          detail: t("toast.onboarding.magicBody"),
        });
      }
    }
    if (prev && !settledRef.current) {
      // Prüfbericht 29.08.2026: In der Runde zwischen erstem Snapshot und `settledRef` (Diff-Takt
      // 1 Hz) unterdrückt der Block unten bewusst die Toasts — dadurch fiel aber auch der
      // Steam-Unlock aus. Genau dort landet der Nachzügler-Batch eines Updates (checkAchievements
      // läuft ohne Offline-Fenster erst im ersten Live-Tick): der Erfolg stand im Spiel, aber nicht
      // auf Steam, bis der Spieler den Save neu lud. Unlock ist ein reiner Seiteneffekt und
      // idempotent (main/steam.ts prüft isActivated) — hier ohne Toasts nachziehen.
      for (const id of achievements) {
        if (!prev.achievements.has(id)) void window.hearthforge?.steam?.unlockAchievement(id);
      }
    }
    if (prev && settledRef.current) {
      // Neu freigeschaltete Achievements. Welle EE (Pip P2, "verschluckter Jackpot"): bei ≥3
      // gleichzeitigen Unlocks im selben Diff (typischerweise ein Offline-/Nachhol-Batch) EINEN
      // Sammel-Toast statt N Einzel-Toasts, die sich sofort gegenseitig aus dem MAX_TOASTS-FIFO
      // drängen würden — Steam-Sync bleibt PRO Achievement (Side-Effect, unabhängig vom Toast).
      const newlyUnlocked: string[] = [];
      for (const id of achievements) {
        if (!prev.achievements.has(id)) newlyUnlocked.push(id);
      }
      for (const id of newlyUnlocked) {
        void window.hearthforge?.steam?.unlockAchievement(id);
      }
      if (newlyUnlocked.length >= 3) {
        const totalPts = newlyUnlocked.reduce((sum, id) => {
          const ach = content.achievements.find((a) => a.id === id);
          return sum + (ach ? achievementPoints(ach) : 0);
        }, 0);
        push(
          {
            kind: "achievement",
            icon: "🏆",
            iconUrl: ACHIEVEMENT_ICON_URL,
            title: t("toast.achievementBatch.title"),
            detail: t("toast.achievementBatch.detail")
              .replace("{n}", String(newlyUnlocked.length))
              .replace("{ap}", String(totalPts)),
          },
          6000,
        );
        playSfx("achievement");
      } else {
        for (const id of newlyUnlocked) {
          const ach = content.achievements.find((a) => a.id === id);
          const pts = ach ? achievementPoints(ach) : 0;
          push({
            kind: "achievement",
            icon: ach?.icon ?? "🏆",
            iconUrl: resolveAchievementIconUrl(ach),
            title: t("toast.achievement"),
            detail: `${ach ? tr(ach.name) : id} ${t("toast.achievementAp").replace("{n}", String(pts))}`,
          });
          playSfx("achievement");
        }
      }
      // Fertigkeits-Level-ups.
      for (const id of Object.keys(levels)) {
        const before = prev.levels[id];
        if (before !== undefined && levels[id]! > before) {
          const skill = content.skills[id];
          push({
            kind: "level",
            icon: "⭐",
            iconUrl: getSkillIcon(id) ?? getSidebarIcon(id),
            title: t("toast.levelUp"),
            detail: `${skill ? tr(skill.name) : id} ${t("skill.level").replace("{n}", String(levels[id]))}`,
          });
          playSfx("levelup");
        }
      }
      // Gesamtlevel.
      if (total > prev.total) {
        push({
          kind: "total",
          icon: "🏅",
          iconUrl: getSidebarIcon("skills-overview"),
          title: t("toast.totalLevel"),
          detail: String(total),
        });
      }
      // Seltene Funde (rare/epic/legendary) — NUR bei echtem Zuwachs des Gesamtbesitzes (s. Zählung
      // oben). Chef-Entscheid 2026-07-08 (ersetzt das alte „nur im Kampf"-Gate): Drop UND Crafting
      // melden; Umräumen (Unequip/Bank) ist Netto-Null und feuert nie — vorher löste das Ablegen
      // einer raren Waffe MITTEN im Kampf den Toast aus (Inventar-Diff sah einen „Zuwachs").
      for (const [itemId, qty] of Object.entries(rares)) {
        const before = prev.rares[itemId] ?? 0;
        // Welle KK (Riko N1): deterministischer Output der GERADE laufenden Craft-Aktion ist keine
        // Überraschung — der Spieler weiß vorher, was er bekommt (s. activeCraftOutputs oben).
        // Chef-Entscheid 31.08.2026: „keine Rarity-Popups mehr von gecrafteten Items, nur wenn sie
        // enchanted werden / also mit Suffix, oder wenn es richtiger Loot ist."
        //
        // Die alte Schranke (`activeCraftOutputs`) sperrte nur die deterministischen Ausgaben der
        // GERADE laufenden Aktion. Alles andere rutschte durch: ein Rezept mit Zufallsausgabe, ein
        // Stapel, dessen Aktion im selben Tick endete, ein Nachzuegler-Tick nach dem Batch. Der
        // Handwerks-Zaehler der Engine ist die ehrliche Quelle — steigt er fuer dieses Item, kam der
        // Zuwachs aus der Werkbank, egal ueber welchen Weg.
        //
        // Wichtig: Das sperrt NUR dieses Stueck, nicht das Item. Wer dasselbe Schwert spaeter als
        // Beute findet, bekommt seinen Moment. Und ein gerollter Suffix feiert weiterhin ueber den
        // eigenen Enchant-Pfad weiter unten — genau die Ausnahme, die der Chef genannt hat.
        const geradeGecraftet = (state.stats.craftedById[itemId] ?? 0) > (prev.craftedRares[itemId] ?? 0);
        if (qty > before && !activeCraftOutputs.has(itemId) && !geradeGecraftet) {
          const item = content.items[itemId];
          // Chef 27.08.2026: „unten rechts im Popup bei rare und mythical drops soll die Droprate
          // dranstehen" — Tabellenchance des gerade bekämpften Monsters, sonst die beste Quelle
          // (Monster-Beute, Elite-Unique). Kein Fund aus einer Drop-Tabelle (Handwerk, Truhe) → keine Zeile.
          const dropChance = dropChanceFor(itemId);
          push(
            {
              kind: "rare",
              rarity: item?.rarity,
              fx: effectiveFxLevel(),
              note: dropChance !== null ? t("toast.dropRate").replace("{pct}", formatDropPct(dropChance)) : undefined,
              icon: item?.icon ?? "✨",
              iconUrl: getItemImage(itemId), // echtes Item-Bild statt Emoji, wenn vorhanden
              // Welle MM (Grete R3-Fund #9, "Godly-Wortstufe"): der seltenste Fund des Spiels trug
              // wortgleich denselben Titel wie ein 0,8-%-Cape — eigene, größere Wortstufe für
              // superRare/godly statt des generischen "Seltener Fund!".
              title: t(rareFindTitleKey(item?.rarity)),
              detail: item ? tr(item.name) : itemId,
            },
            jackpotDurationMs(item?.rarity),
          );
          // Belohnungs-Juice-Welle (Chef-GO): kein eigener Sfx nötig — der bestehende
          // Achievement-Fanfare-Ton passt thematisch ("bedeutsame Belohnung") und hat bereits eine
          // 3s-Drossel (audio.ts), verhindert also Spam bei mehreren Rare-Drops in Serie.
          playSfx("achievement");
        }
      }

      // ── Auto-Stopp online sichtbar machen (UI-Brainstorm A4, -gamefeel.md #17) ────────────────
      // Stoppt eine laufende Aktion online (Inventar voll/Material leer), während der Spieler NICHT
      // auf der betroffenen Skill-Seite steht, bemerkte er das bisher erst beim zufälligen
      // Zurückwechseln — potenziell viele verlorene Idle-Minuten. Reine null→gesetzt-Flanken-
      // Erkennung (kein seq-Breadcrumb wie die übrigen Events oben — `state.lastStop` bleibt
      // gesetzt, bis eine neue Aktion startet, s. engine/tick.ts). Neutrale, niedrige Priorität
      // (kein `priority: "high"`) — soll echte Jackpot-Momente nicht aus dem FIFO verdrängen.
      // Detail nutzt DIESELBEN skill.stoppedInventoryFull/skill.stoppedNoMaterials-Sätze wie
      // OfflinePopup.tsx/SkillPage.tsx (eine Quelle, kein neuer Wortlaut).
      if (lastStopActionId && prev.lastStopActionId === null) {
        const stoppedAction = content.actions[lastStopActionId];
        const stoppedSkillId = stoppedAction?.skill;
        if (stoppedSkillId && activePageId !== stoppedSkillId) {
          push({
            kind: "drop",
            icon: "⚠",
            title: t("toast.actionStopped.title"),
            detail: `${tr(stoppedAction.name)}: ${t(
              lastStopReason === "inventory_full" ? "skill.stoppedInventoryFull" : "skill.stoppedNoMaterials",
            )}`,
          });
        }
      }

      // ── Waffen-Stil-Onboarding (einmalig) ────────────────────────────────────
      if (prev.weaponStyle !== "ranged" && weaponStyle === "ranged" && !hasSeenRangedHint()) {
        setSeenRangedHint();
        push({
          kind: "level",
          icon: "🏹",
          title: t("toast.onboarding.rangedTitle"),
          detail: t("toast.onboarding.rangedBody"),
        });
      }
      if (prev.weaponStyle !== "magic" && weaponStyle === "magic" && !hasSeenMagicHint()) {
        setSeenMagicHint();
        push({
          kind: "level",
          icon: "✦",
          title: t("toast.onboarding.magicTitle"),
          detail: t("toast.onboarding.magicBody"),
        });
      }

      // ── Fence-Discovery: einmaliger Hinweis, wenn Hehlgut erstmals ins Inventar kommt ──
      if (prev.fenceCount === 0 && fenceCount > 0 && !hasFiredFenceToast) {
        hasFiredFenceToast = true;
        push({
          kind: "drop",
          icon: "🪙",
          title: t("toast.fence.title"),
          detail: t("toast.fence.body"),
        });
      }

      // ── Verzauberter Drop: neues Instanz-Item (Affix oder Suffix) im Inventar ──
      // Welle EE (Riko R3-UI, "kein Reveal-Moment"): ein gerollter SUFFIX ist die einzige echte
      // Slot-Machine des Systems (Altar-Affixe sind deterministisch, brauchen keinen Reveal, s.
      // Riko-Bericht "Was schon richtig gut ist"). Suffix-Treffer bekommen deshalb denselben
      // Jackpot-Stil wie ein seltener Item-Fund (kind "rare", Rarity des Basis-Items, FX-Puls) statt
      // im Eck-Toast zu verschwinden — reiner Affix-Erwerb (Altar-Anwendung) bleibt der leise
      // "drop"-Hinweis von vorher.
      for (const id of enchantedIds) {
        const isNew = !prev.enchantedIds.has(id);
        if (!isNew) continue;
        // Welle KK (Riko N3): auch angelegte Instanzen durchsuchen (s. allInstances oben) — sonst
        // bleibt der Reveal-Toast für ein direkt angelegtes verzaubertes Item stumm.
        const inst = allInstances.find((i) => i.instanceId === id);
        if (!inst) continue;
        const base = content.items[inst.baseItemId];
        const itemName = base ? tr(base.name) : inst.baseItemId;
        const sdef = inst.suffix ? content.suffixes?.[inst.suffix.suffixId] : undefined;
        if (sdef) {
          // Welle KK (Riko N4): Erst-Fund-Toast trägt die Roll-%-Angabe — man will sofort wissen,
          // ob sich das Behalten lohnt.
          const suffixLabel = tr(sdef.suffix).toUpperCase();
          push(
            {
              kind: "rare",
              rarity: base?.rarity,
              fx: effectiveFxLevel(),
              icon: "✦",
              iconUrl: getItemImage(inst.baseItemId),
              title: t("toast.enchanted.title"),
              detail: `${itemName} · ${suffixLabel} (${Math.round(inst.suffix!.roll * 100)}%)`,
            },
            jackpotDurationMs(base?.rarity, 7000),
          );
          playSfx("achievement");
        } else {
          push({
            kind: "drop",
            icon: "✦",
            title: t("toast.enchanted.title"),
            detail: itemName,
          });
        }
      }

      // ── Farming-Erstkontakt: einmaliger Hinweis beim ersten gepflanzten Crop ──
      if (!hasFiredFarmHint && !prev.hasAnyPlot && hasAnyPlot) {
        hasFiredFarmHint = true;
        push({
          kind: "level",
          icon: "🌱",
          title: t("farm.hint.plots"),
          detail: t("farm.offlineHint"),
        });
      }

      // ── Slayer-Auftragsabschluss: Toast beim Inkrement des Zählers ────────────
      if (slayerTasksCompleted > prev.slayerTasksCompleted) {
        const xp = prev.prevSlayerTaskReward?.xpReward ?? 0;
        const pts = prev.prevSlayerTaskReward?.pointReward ?? 0;
        push({
          kind: "achievement",
          icon: "⚔",
          iconUrl: getSkillIcon("slayer") ?? getSidebarIcon("slayer"),
          title: t("toast.slayerTaskDone"),
          detail: t("toast.slayerTaskDoneDetail")
            .replace("{xp}", String(xp))
            .replace("{points}", String(pts)),
        });
        playSfx("achievement");
      }

      // ── Paragonturm-Etagen-Abschluss (§7, Welle P2) ────────────────────────────
      // Neuer Rekord (`best` gestiegen) IMMER zuerst geprüft — ein Rekord-Clear lässt `checkpoint`
      // im selben Tick mitziehen (onParagonFloorCleared, paragon.ts), der `else if` verhindert also
      // einen doppelten Toast (Rekord- UND Clear-Moment) für ein und dieselbe Etage. Ein reiner
      // Wiederaufstieg NACH einem Tod (checkpoint steigt, `best` bleibt unter dem alten Rekord)
      // feuert nur den kompakten Clear-Toast.
      if (paragonBest > prev.paragonBest) {
        // Welle KK (Aldric-Fund #3): schnelle Auto-Aufstieg-Ketten aktualisieren denselben Toast
        // statt zu stapeln — s. pushOrRefreshRecordToast-JSDoc oben.
        pushOrRefreshRecordToast(t("paragon.floor").replace("{n}", String(paragonBest)), 8000);
      } else if (paragonCheckpoint > prev.paragonCheckpoint) {
        push({
          kind: "achievement",
          icon: "🗼",
          iconUrl: TOWER_ICON_URL,
          title: t("paragon.toast.cleared.title"),
          detail: t("paragon.toast.cleared.detail").replace("{n}", String(paragonCheckpoint)),
        });
      }

      // ── Mastery-Momente (Welle EE, Mona M1) ────────────────────────────────────
      // "Jeder Stern und jeder Checkpoint fällt lautlos" (Mona-Urteil) — drei Diffs auf demselben
      // Snapshot-Paar: (a) normale Aktions-Level-Ups werden pro Tick/Batch zu EINEM dezenten Toast
      // gestapelt (Anti-Spam-Auftrag), (b) das Überschreiten eines Rang-Sterns (10/25/50/75/99,
      // util/masteryRank.ts — dieselben Stufen wie M3s Karten-Ränge) feiert EIGENSTÄNDIG größer,
      // (c) ein skillweiter Pool-Checkpoint (5/25/50/95 %) ist der seltenste, wertvollste Moment
      // des Systems (Mona-Fund #2: "DAUERHAFTER skillweiter Bonus... das Spiel sagt es mir nicht
      // einmal") und bekommt den größten Look.
      const leveledNormal: Array<{ id: string; from: number; to: number }> = [];
      const leveledMilestone: Array<{ id: string; to: number; rank: number }> = [];
      for (const [id, lvl] of Object.entries(masteryLevels)) {
        const before = prev.masteryLevels[id];
        if (before === undefined || lvl <= before) continue;
        const rank = highestRankCrossed(before, lvl);
        if (rank !== null) leveledMilestone.push({ id, to: lvl, rank });
        else leveledNormal.push({ id, from: before, to: lvl });
      }
      if (leveledNormal.length === 1) {
        const a = leveledNormal[0]!;
        const action = content.actions[a.id];
        push({
          kind: "mastery",
          masteryVariant: "level",
          icon: "★",
          iconUrl: MASTERY_STAR_ICON_URL,
          title: t("mastery.toast.levelUp"),
          detail: t("mastery.toast.levelUpDetail")
            .replace("{action}", action ? tr(action.name) : a.id)
            .replace("{delta}", String(a.to - a.from))
            .replace("{lvl}", String(a.to)),
        });
      } else if (leveledNormal.length > 1) {
        push({
          kind: "mastery",
          masteryVariant: "level",
          icon: "★",
          iconUrl: MASTERY_STAR_ICON_URL,
          title: t("mastery.toast.levelUp"),
          detail: t("mastery.toast.levelUpBatch").replace("{n}", String(leveledNormal.length)),
        });
      }
      // Milestones einzeln feiern (max. 3 sichtbare Karten pro Tick — Anti-Flut bei Nachhol-Batches
      // wie Offline-Catchup), Rest gesammelt.
      const shownMilestones = leveledMilestone.slice(0, 3);
      for (const m of shownMilestones) {
        const action = content.actions[m.id];
        const tier = masteryRankTier(m.rank);
        push(
          {
            kind: "mastery",
            masteryVariant: "milestone",
            rankTier: tier ?? undefined,
            icon: "★",
            iconUrl: MASTERY_STAR_ICON_URL,
            title: t("mastery.toast.milestone"),
            detail: t("mastery.toast.milestoneDetail")
              .replace("{action}", action ? tr(action.name) : m.id)
              .replace("{tier}", tier ? t(masteryRankKey(tier)) : "")
              .replace("{lvl}", String(m.rank)),
          },
          6000,
        );
        playSfx("achievement");
      }
      if (leveledMilestone.length > shownMilestones.length) {
        push({
          kind: "mastery",
          masteryVariant: "level",
          icon: "★",
          iconUrl: MASTERY_STAR_ICON_URL,
          title: t("mastery.toast.milestone"),
          detail: t("mastery.toast.milestoneMore").replace("{n}", String(leveledMilestone.length - shownMilestones.length)),
        });
      }

      // Pool-Checkpoints: je Skill nur der jeweils höchste in diesem Diff überschrittene Schwellwert.
      for (const [skillId, pct] of Object.entries(poolPct)) {
        const before = prev.poolPct[skillId];
        if (before === undefined) continue;
        let crossed: number | null = null;
        for (const cp of MASTERY_POOL_CHECKPOINTS) {
          if (cp > before && cp <= pct) crossed = cp;
        }
        if (crossed === null) continue;
        const skill = content.skills[skillId];
        const bonusLine = poolCheckpointBonusLine(crossed, t);
        push(
          {
            kind: "mastery",
            masteryVariant: "pool",
            icon: "★",
            iconUrl: MASTERY_STAR_ICON_URL,
            title: t("mastery.toast.poolCheckpoint"),
            detail: t("mastery.toast.poolCheckpointDetail")
              .replace("{skill}", skill ? tr(skill.name) : skillId)
              .replace("{pct}", String(Math.round(crossed * 100)))
              .replace("{bonus}", bonusLine),
          },
          9000,
        );
        playSfx("achievement");
      }
    }
    // Erste Runde MIT `prev` verstreicht ohne Toasts (s. settledRef-JSDoc oben) — ab hier gediffed.
    if (prev) settledRef.current = true;
    snap.current = {
      levels,
      total,
      rares,
      craftedRares,
      achievements,
      weaponStyle,
      fenceCount,
      enchantedIds,
      hasAnyPlot,
      slayerTasksCompleted,
      prevSlayerTaskReward,
      paragonCheckpoint,
      paragonBest,
      masteryLevels,
      poolPct,
      activeActionId: state.activeActionId,
      lastStopActionId,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // claude:2026-10-23T20:10:00+02:00 — Ländereien-Meldung (1.4.0 LA, Chef 23.10.: „Gebündelt, höchstens alle 15 Minuten,
  // aber aktivier- und deaktivierbar in den Optionen“). Zählt Fänge (`stats.huntCatches`) und Ernte-Stücke (`producedById`
  // der Feldfrüchte) seit der letzten Meldung und meldet frühestens 15 Minuten danach gesammelt. Nur der Renderer (keine
  // Engine-Zeit), Prüfung höchstens einmal pro Sekunde. Offline-Fänge zeigt der Offline-Bericht, nicht diese Meldung.
  const estateRef = useRef<{ catches: number; harvest: number; pendC: number; pendH: number; lastAt: number; checkedAt: number } | null>(null);
  useEffect(() => {
    const now = performance.now();
    const cur = estateRef.current;
    if (cur && now - cur.checkedAt < 1000) return;
    const catches = state.stats.huntCatches ?? 0;
    let harvest = 0;
    for (const c of Object.values(content.crops ?? {})) harvest += state.stats.producedById?.[c.yieldItem] ?? 0;
    if (!cur) {
      estateRef.current = { catches, harvest, pendC: 0, pendH: 0, lastAt: now, checkedAt: now };
      return;
    }
    cur.checkedAt = now;
    if (catches > cur.catches) cur.pendC += catches - cur.catches;
    if (harvest > cur.harvest) cur.pendH += harvest - cur.harvest;
    cur.catches = catches;
    cur.harvest = harvest;
    if ((cur.pendC > 0 || cur.pendH > 0) && now - cur.lastAt >= 15 * 60_000) {
      if (state.settings.estateNotifications !== false) {
        const parts: string[] = [];
        if (cur.pendC > 0) parts.push(t("estates.toast.catches").replace("{n}", String(cur.pendC)));
        if (cur.pendH > 0) parts.push(t("estates.toast.harvest").replace("{n}", String(cur.pendH)));
        push({ kind: "drop", icon: "🌾", title: t("estates.toast.title"), detail: parts.join(" · "), priority: "low" });
      }
      cur.pendC = 0;
      cur.pendH = 0;
      cur.lastAt = now;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalTicks]);

  // claude:2026-10-25T01:30:00+02:00 — Zufallsereignisse (1.4.0 EV/AU): jede neue Logbuch-Nummer meldet sich als Ereigniskarte. Kundschaft
  // führt per Klick zum Reiter „Arbeitsaufträge“. Erster Render merkt sich nur den Stand (kein Alt-Toast nach dem Laden).
  const eventSeqRef = useRef<number | null>(null);
  useEffect(() => {
    const ev = state.skillEvents;
    if (!ev) return;
    if (eventSeqRef.current === null) {
      eventSeqRef.current = ev.seq;
      return;
    }
    if (ev.seq <= eventSeqRef.current) return;
    const fresh = ev.log.filter((e) => e.seq > eventSeqRef.current!).reverse();
    eventSeqRef.current = ev.seq;
    for (const e of fresh) {
      const vals = eventCardValues(e.id);
      const item = e.itemId ? content.items[e.itemId] : undefined;
      const offer = state.workOrders?.offer;
      const who = e.id === "customer" && offer ? orderCustomer(content, offer).name : null;
      const detail = fillEventText(t(`events.${e.id}.card`), {
        n: e.id === "storm_fell" ? formatNum(e.qty ?? 0) : vals.n,
        min: vals.min,
        pct: vals.pct,
        qty: e.qty ?? 0,
        item: item ? tr(item.name) : "",
        name: who ? tr(who) : t("orders.guild.name"),
        skill: content.skills[e.skill] ? tr(content.skills[e.skill]!.name) : "",
      });
      const isOffer = e.id === "customer";
      push(
        {
          kind: "event",
          priority: "high",
          icon: EVENT_ICON[e.id],
          iconUrl: getEventImage(e.id),
          title: t(`events.${e.id}.name`),
          detail: isOffer ? `${detail} ${t("orders.toast.click")}` : detail,
          onClick: isOffer
            ? () => {
                requestQuestsTab("orders");
                jumpToPage("quests");
              }
            : undefined,
        },
        8000,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.skillEvents?.seq]);

  if (toasts.length === 0) return <></>;
  return (
    <div className="toast-stack">
      {toasts.map((toast) => {
        // Belohnungs-Juice-Welle (Chef-GO) — Rare-Drop-Jackpot: "off" bleibt der normale Toast
        // (Kernfeedback, s. effectiveFxLevel-Kommentar), "reduced" nur der Rahmen-Puls (Farbe/
        // Opacity, CSS `.toast-rare.fx-reduced`), "full" zusätzlich der Licht-Sweep (`::after`,
        // nur `.fx-full`); legendary bekommt via `.toast-rare-legendary` einen kräftigeren Puls.
        const rareCls = toast.kind === "rare"
          ? ` fx-${toast.fx ?? "off"}${
              toast.rarity === "legendary" ? " toast-rare-legendary"
              : toast.rarity === "mythic" ? " toast-rare-mythic"
              : toast.rarity === "heroic" ? " toast-rare-heroic"
              : GODLY_TIER.has(toast.rarity ?? "") ? " toast-rare-godly"
              : ""
            }`
          : "";
        // Welle EE (Mona M1): eigener Stern-Stil je Mastery-Moment-Größe — "level" (dezent) trägt
        // keinen Modifier, "milestone" bekommt die Rang-Akzentfarbe, "pool" den größten Puls.
        const masteryCls = toast.kind === "mastery"
          ? ` toast-mastery--${toast.masteryVariant ?? "level"}${toast.rankTier ? ` toast-mastery-rank--${toast.rankTier}` : ""}`
          : "";
        return (
          <div
            key={toast.id}
            className={`toast toast-${toast.kind}${rareCls}${masteryCls}${toast.onClick ? " toast-clickable" : ""}`}
            onClick={toast.onClick}
            role={toast.onClick ? "button" : undefined}
            tabIndex={toast.onClick ? 0 : undefined}
          >
            <span className="toast-icon">
              {toast.iconUrl
                ? <img loading="lazy" decoding="async" src={toast.iconUrl} alt="" className="ui-icon" />
                : toast.icon}
            </span>
            {toast.note && <span className="toast-note">{toast.note}</span>}
            <span className="toast-body">
              <span className="toast-title">{toast.title}</span>
              <span className="toast-detail">{toast.detail}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Dropchance eines Items für die Rare-Fund-Notiz (Chef 27.08.2026): Tabellenwert des gerade
 * bekämpften Monsters, sonst die beste Quelle über alle Monster und Elite-Uniques. Bewusst der
 * Tabellenwert ohne Segen/Glücks-Modifikatoren, damit die Zahl der im Wiki entspricht.
 */
function dropChanceFor(itemId: string): number | null {
  const st = (window as unknown as { __hfDebug?: { state?: GameState } }).__hfDebug?.state;
  const curId = st?.combat?.monsterId ?? null;
  const cur = curId ? content.monsters[curId] : undefined;
  const fromCur = cur?.loot?.find((l) => l.itemId === itemId)?.chance;
  if (typeof fromCur === "number" && fromCur > 0) return fromCur;
  let best: number | null = null;
  for (const m of Object.values(content.monsters)) {
    for (const l of m.loot ?? []) if (l.itemId === itemId && l.chance > 0) best = best === null ? l.chance : Math.max(best, l.chance);
  }
  for (const v of Object.values(content.elites ?? {})) {
    if (v.uniqueItemId === itemId) {
      const ch = v.uniqueDropChance ?? ELITE_UNIQUE_DROP_CHANCE_DEFAULT;
      if (ch > 0) best = best === null ? ch : Math.max(best, ch);
    }
  }
  return best;
}

