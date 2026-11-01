import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { GameState, OfflineSummary, SaveSlot } from "@hearthforge/shared";
import { MAX_OFFLINE_MS, effectiveMaxOfflineMs } from "@hearthforge/shared";
import { advance, ascend, createGame, prestigeAscendCheck, prestigeRunSummary, transferInventoryItemsToSave } from "@hearthforge/engine";
import type { PrestigeRunSummary } from "@hearthforge/engine";
import type {
  CrossSaveTransferResult,
  CrossSaveTransferSelection,
  PrestigeAscendChoice,
  PrestigeAscendReason,
} from "@hearthforge/engine";
import { getDevSpeed } from "../devSpeed";
import type { CharacterCreation } from "@hearthforge/engine";
import { deserialize, parseSummary, serialize } from "@hearthforge/persistence";
import { content } from "@hearthforge/content";
import { baueDemoOfflineSummary } from "../devOfflineDemo";
import { CATCHUP_THRESHOLD_MS, buildCatchUpSummary, catchUpSavedAt, extendCatchUp, startCatchUp, stepCatchUp } from "../util/catchUp"; // claude:2026-10-31T16:34:28+01:00
import type { CatchUpJob } from "../util/catchUp"; // claude:2026-10-31T16:34:28+01:00
import { CatchUpOverlay } from "../components/CatchUpOverlay"; // claude:2026-10-31T16:34:28+01:00
import { DesktopNotifier } from "../components/DesktopNotifier"; // claude:2026-10-31T16:34:28+01:00
import { backupPreAscend, readAllSlots, readSlot, readSlotBackups, removeSlot, writeSlot, writeSlotPair } from "../saves";
import { buildOfflineTestSummary, fetchFixtureJson, getFixtureParam, getOfflineTestParam } from "./fixtureLoader";

export type Screen = "menu" | "creating" | "playing";

/**
 * claude:2026-10-18T14:00:00+02:00 — Ergebnis von `ascendRun` (Prestige „Der Aschesturz", Welle D). Die Gründe der
 * Engine-Prüfung kommen unverändert durch (UI: `t("prestige.reason." + code)`); dazu die Ablauf-Fehler
 * `no_active_save`, `busy`, `backup_failed` (Sicherung nicht angelegt, nichts verändert) und `write_failed`.
 */
export type AscendRunResult =
  | { ok: true }
  | { ok: false; reason: PrestigeAscendReason | "no_active_save" | "busy" | "backup_failed" | "write_failed" };

/** Stand für den Erwachens-Text nach einem Aufstieg (überlebt den Baum-Remount, Muster `importSuccess`). */
export interface AscendAwakening {
  count: number;
  points: number;
  /**
   * claude:2026-10-18T20:30:00+02:00 — Bilanz des beendeten Durchgangs (Welle E2), VOR `ascend` berechnet; das
   * Aufstiegs-Fenster zeigt sie in Phase 1 (AscendLedger), danach den Erwachens-Text. `null` = nur Erwachen.
   */
  summary: PrestigeRunSummary | null;
}

/**
 * Renderer-lokale Erweiterung von `OfflineSummary` (Welle AA, Welcome-Back-Polish): trägt zwei
 * UI-only Zusatzfelder, die NICHT aus der Engine kommen (kein `packages/**`-Eingriff nötig, s.
 * Chef-Auftrag) — beide werden hier in `loadGame` selbst berechnet.
 */
export interface OfflineSummaryUI extends OfflineSummary {
  /**
   * Echte, UNGEKAPPTE Abwesenheit (ms) — aus dem geladenen Save-Zeitstempel (`savedAt`) gegen
   * denselben `loadNow` berechnet, den `deserialize` auch für den 8h-Cap verwendet (s. `loadGame`).
   * `undefined` = kein valider `savedAt` verfügbar (z.B. ein Save ohne lesbare Summary) — die Bühne
   * zeigt dann einfach nur die gekappte Zeit wie bisher, ohne Cap-Hinweis.
   */
  realMs?: number;
  /**
   * True, wenn das Popup NUR wegen der "leeren Rückkehr" geöffnet wurde (> 1h weg, 0 Ertrag, kein
   * Tod, kein laufender Kampf/Aktion) — das alte Öffnungs-Gate verlangte IMMER etwas Ertrag, eine
   * leere lange Abwesenheit blieb bisher stumm. Steuert OfflinePopup.tsx's Mini-Karte.
   */
  emptyReturn?: boolean;
}

/**
 * UI-Audit-Debug-Hook (dev-only, "petTest-Präzedenz" — s. fixtureLoader.ts JSDoc): exponiert den
 * live GameState + Content-Katalog auf `window.__hfDebug`, damit Playwright-Screenshot-Skripte
 * gezielte State-Patches fahren können (z.B. Dungeon-Unlocks/Mid-Run-Wellen/die Clear-Zeremonie-
 * Transition), OHNE eigene bespoke URL-Param-Hooks pro Szenario zu brauchen.
 *
 * Tester-Sweep 2 (T1, 2026-07-13): existierte bisher NUR im `?fixture=`-Pfad — ein frischer
 * Charakter (`createCharacter`) oder ein normal geladener Spielstand (`loadGame`) kamen an
 * `window.__hfDebug` nie heran, Tests gegen den "echten" Spielstart/-Load-Pfad hatten also keinen
 * State-Zugriff. Jetzt in ALLEN DREI State-Entstehungspfaden (Fixture/Neu/Laden) gesetzt — rein
 * additiv, dieselbe Referenz-Semantik (der State-Objekt-Zeiger wird nur mutiert, nie ersetzt).
 * Gestrippt aus Prod-Builds (`import.meta.env.DEV`, Vite tree-shaked den toten Zweig weg).
 */
function setDebugHook(state: GameState): void {
  if (!import.meta.env.DEV) return;
  (window as unknown as { __hfDebug?: { state: GameState; content: typeof content } }).__hfDebug = {
    state,
    content,
  };
}

/**
 * Liest NUR den Top-Level `savedAt` aus einem rohen Save-String (Task AA-1) — bewusst NICHT über
 * `parseSummary` (liest `save.summary.savedAt`, ein separates Spiegel-Feld, das `serialize()` zwar
 * IMMER mit demselben Wert füllt, aber `deserialize` selbst für den Offline-Cap ausschließlich das
 * Top-Level-Feld `save.savedAt` liest, s. persistence/index.ts). Direkt an DIESEM Feld zu hängen
 * hält unsere renderer-seitige "echte Abwesenheit" bit-genau synchron mit dem, was die Engine
 * selbst zur Cap-Berechnung heranzieht.
 */
function parseSavedAt(json: string): number | null {
  try {
    const parsed = JSON.parse(json) as { savedAt?: unknown };
    return typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt) ? parsed.savedAt : null;
  } catch {
    return null;
  }
}

/** Stabiler Steuer-Context: Menü-Navigation & Speichern. Ändert sich selten. */
interface GameControl {
  screen: Screen;
  slots: SaveSlot[];
  /** Aktiver lokaler Slot; nötig, um ihn aus der Cross-Save-Empfängerliste auszuschließen. */
  activeSlotId: number | null;
  refreshSlots: () => Promise<void>;
  startNewGame: (slotId: number) => void;
  cancelCreation: () => void;
  createCharacter: (input: CharacterCreation) => Promise<void>;
  loadGame: (slotId: number) => Promise<void>;
  saveGame: () => Promise<void>;
  /** Reiner Itemtransfer in das Postfach eines anderen lokalen Spielstands. */
  sendItemsToSlot: (
    targetSlotId: number,
    selection: CrossSaveTransferSelection,
  ) => Promise<CrossSaveTransferResult | { ok: false; reason: "no_active_save" | "target_missing" | "target_invalid" | "write_failed" }>;
  /** Serialisiert den aktuellen Spielstand als JSON-String (für Backup/Export). */
  exportSave: () => string | null;
  /** Lädt einen exportierten JSON-String in den aktiven Slot (überschreibt). */
  importSave: (json: string) => Promise<boolean>;
  deleteSlot: (slotId: number) => Promise<void>;
  returnToMenu: () => Promise<void>;
  offlineSummary: OfflineSummaryUI | null;
  dismissOffline: () => void;
  /**
   * claude:2026-10-31T16:34:28+01:00 — 1.4.2: Fortschritt der Rückkehr aus dem Hintergrund. Solange ein großer Zeitsprung
   * (> 5 min, z. B. nach Minimieren) in Häppchen nachgeholt wird, steht hier der Stand; sonst `null`. Danach öffnet sich die
   * Rückkehr-Karte über `offlineSummary` wie nach dem Laden.
   */
  catchUp: { doneMs: number; totalMs: number } | null;
  /**
   * Dev-Werkzeug (Chef-Auftrag 31.08.2026): oeffnet die "Waehrend du weg warst"-Buehne mit
   * Demo-Daten in JEDEM Abschnitt, damit man das Layout beurteilen kann, ohne acht Stunden
   * offline zu gehen. Aufrufer ist ausschliesslich das Zeitraffer-Panel, das selbst hinter
   * `devToolsAllowed` haengt — im ausgelieferten Spiel ruft das niemand.
   */
  zeigeDemoOffline: () => void;
  /**
   * Selbstheilungs-Hinweis (Task #288 D): gesetzt, wenn `loadGame` einen beschädigten Slot
   * aus einem lokalen Backup wiederhergestellt hat. `restoredFromMs` = Speicherzeitpunkt des
   * Backups (Epoch-ms) für den Hinweis-Toast (Toasts.tsx zeigt ihn und dismisst danach).
   */
  saveRecovery: { restoredFromMs: number } | null;
  dismissSaveRecovery: () => void;
  /**
   * Import-Erfolgs-Hinweis (Tester-Sweep 2, T9, 2026-07-13): `importSave` remountet den kompletten
   * Spiel-Baum SOFORT über `sessionEpoch` (s. dort) — die alte OptionsPage-Instanz stirbt, BEVOR
   * ihr lokaler Status-Span je rendert, der Spieler sah also gar kein Feedback. Dieser Flag lebt
   * hier in GameContext, ÜBER dem Remount-Key, und überlebt den Wechsel — die frisch gemountete
   * Toasts.tsx zeigt daraufhin einmalig einen Import-Erfolgs-Toast und quittiert per
   * `dismissImportSuccess` (identisches Muster zu `saveRecovery`/`dismissSaveRecovery` oben). Der
   * Fehlerfall braucht das NICHT: ein abgelehnter Import löst gar keine State-Mutation aus (s.
   * `importSave`), also auch keinen Remount — die bestehende Inline-Fehleranzeige in OptionsPage
   * bleibt dabei durchgehend sichtbar.
   */
  importSuccess: boolean;
  dismissImportSuccess: () => void;
  /**
   * Perf-Welle (2026-07-22): nicht-abonnierender Zugriff auf den aktuellen GameState — anders als
   * `useGameState()`/`useGameStateMaybe()` (LiveContext, re-rendert bei JEDEM 10-Hz-Tick) hängt
   * `getState` nicht am Tick-Zähler; nutzen für einmalige Mount-Zeit-Reads, die keinen laufenden
   * Re-Render brauchen (s. App.tsx `usePortraitFallback`). `null` wenn kein Spiel aktiv ist.
   */
  getState: () => GameState | null;
  /**
   * Autosave-Vertrauens-Häkchen (Chef-GO): monoton hochgezählt bei JEDEM Durchlauf von `saveGame`
   * (periodisches Autosave-Intervall UND manueller "Speichern"-Klick teilen sich denselben
   * Callback) — die Sidebar diffed gegen den letzten Wert und blendet kurz "Gespeichert ✓" ein.
   * Zählt auch ohne aktiven Save-Slot hoch (Fixture/Menü-Fensterchen), damit der manuelle Klick
   * beim Screenshot-Test dieselbe Bestätigung zeigt wie im echten Spiel (bestehendes Verhalten:
   * die Sidebar zeigte "gespeichert" schon vorher unabhängig vom tatsächlichen Schreib-Erfolg).
   */
  saveTick: number;
  /**
   * Sitzungs-Epoche (Tester-Sweep-Fund T8, 2026-07-11): monoton hochgezählt bei jedem
   * erfolgreichen `importSave`. `Root` remountet den kompletten Spiel-Layout-Baum per
   * `key={sessionEpoch}` — sonst hielten Snapshot-Refs (DeathPopup/Toasts diffen
   * stats.deaths/Items gegen den VORHERIGEN Tick) noch den alten Charakter und feuerten nach
   * dem Import falsche Todes-Popups/Rare-Toasts. Normales Laden remountet ohnehin
   * (screen-Wechsel menu→playing) — nur der Import tauschte den State im laufenden Screen.
   */
  sessionEpoch: number;
  /**
   * claude:2026-10-18T14:00:00+02:00 — Prestige-Aufstieg (Welle D). Ablauf: speichern und abwarten → Sicherung
   * (IPC `saves:backupPreAscend`, nur "pre-ascend" erlaubt weiter) → `ascend` → sofort speichern → Baum remounten
   * (`sessionEpoch`, setzt alle Zähler-Refs von Toasts/Popups wie beim Laden zurück) → `ascendAwakening` setzen.
   * Scheitert ein Schritt vor `ascend`, bleibt der Spielstand unverändert.
   */
  ascendRun: (choice: PrestigeAscendChoice) => Promise<AscendRunResult>;
  /** Erwachens-Text-Stand nach einem Aufstieg; null, wenn keiner offen ist. */
  ascendAwakening: AscendAwakening | null;
  dismissAscendAwakening: () => void;
}

/** Live-Context: ändert sich pro Frame. Nur Verbraucher hiervon re-rendern laufend. */
interface GameLive {
  state: GameState | null;
  tick: number;
}

/**
 * Perf-Welle Block A (2026-07-22, "Chrome-Welle"): Fundament für `useGameSelector` (s. dort,
 * weiter unten). Bewusst ein EIGENER, dritter Context statt die Selektor-Verkabelung an
 * `GameControl` zu hängen — `control`s `useMemo` bekommt bei JEDEM Autosave/Slot-Wechsel/Import
 * eine neue Objekt-Referenz (s. `control`-useMemo-Deps unten), was JEDEN Konsumenten von
 * `ControlContext` re-rendern würde, selbst wenn dessen Selektor-Ergebnis unverändert blieb —
 * genau der 10-Hz-Re-Render-Sockel, den diese Welle abbauen soll. `getState`/`subscribeTick` sind
 * beide für die Lebensdauer des Providers referenzstabil (leere `useCallback`-Deps), also ist
 * DIESES `useMemo` (Deps: `[getState, subscribeTick]`) garantiert nur EINMAL neu — der
 * `SelectorStoreContext`-Wert ändert sich danach nie wieder, Konsumenten werden also NIE durch
 * einen Context-Change re-gerendert (nur `useSyncExternalStore` selbst entscheidet noch).
 */
interface SelectorStore {
  /** Nicht-abonnierender Zugriff auf den aktuellen State — identisch zu `GameControl.getState`. */
  getState: () => GameState | null;
  /** Registriert einen Listener, der bei jedem Tick-Signal (denselben Stellen wie `setTick`
   *  unten) synchron aufgerufen wird. Gibt eine Unsubscribe-Funktion zurück (useSyncExternalStore-
   *  Konvention). */
  subscribeTick: (listener: () => void) => () => void;
}

const ControlContext = createContext<GameControl | null>(null);
const LiveContext = createContext<GameLive | null>(null);
const SelectorStoreContext = createContext<SelectorStore | null>(null);

// Tester-Sweep 2 (T10, 2026-07-13): 30s → 15s. Die reine Zeit-/Idle-Progression ist ohnehin
// deterministisch aus `savedAt` rekonstruierbar (kein echtes Verlustrisiko dort) — aber MANUELLE
// Aktionen zwischen zwei Autosaves (Ausrüstungswechsel, Verkäufe, Quest-Claims, …) waren bei einem
// Hart-Kill bis zu 30s verlierbar. 15s halbiert dieses Fenster, ohne spürbaren Overhead (lokale
// Datei, kein Netzwerk-Roundtrip).
// Chef 28.08.2026: 15s -> 5s. Kosten je Save: serialize (<= ~130 KB JSON, ~1-3 ms im Renderer) + IPC + atomarer
// Schreibvorgang im Main-Prozess (tmp + rename, Write-Mutex in saves.ts); Rolling-Backups bleiben bei 15 min
// (ROLLING_MIN_INTERVAL_MS), Steam Cloud synchronisiert erst beim Beenden. Kein spuerbarer Overhead.
const AUTOSAVE_MS = 5_000;

// Welle AA (Welcome-Back-Polish, Task 4): Schwelle für die "leere Rückkehr" — > 1h weg, 0 Ertrag,
// kein Tod, nichts lief (weder Aktion noch Kampf). Kürzere leere Abwesenheiten bleiben bewusst
// stumm (kein Popup für "war 5 Minuten AFK, nichts los") — erst ab einer Stunde lohnt der Hinweis.
const EMPTY_RETURN_MS = 60 * 60 * 1000;

export function GameProvider({ children }: { children: ReactNode }): JSX.Element {
  const stateRef = useRef<GameState | null>(null);
  const activeSlotRef = useRef<number | null>(null);
  const transferBusyRef = useRef(false);
  const pendingSlotRef = useRef<number | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummaryUI | null>(null);
  // claude:2026-10-31T16:34:28+01:00 — Rückkehr in Häppchen (util/catchUp.ts): laufender Auftrag + Anzeigestand.
  const catchUpRef = useRef<CatchUpJob | null>(null);
  const [catchUp, setCatchUp] = useState<{ doneMs: number; totalMs: number } | null>(null);
  const [saveRecovery, setSaveRecovery] = useState<{ restoredFromMs: number } | null>(null);
  // Autosave-Vertrauens-Häkchen: s. GameControl.saveTick-Doc.
  const [saveTick, setSaveTick] = useState(0);
  // Sitzungs-Epoche: s. GameControl.sessionEpoch-Doc (Import-Remount).
  const [sessionEpoch, setSessionEpoch] = useState(0);
  // Import-Erfolgs-Hinweis: s. GameControl.importSuccess-Doc.
  const [importSuccess, setImportSuccess] = useState(false);
  // claude:2026-10-18T14:00:00+02:00 — Erwachens-Text nach dem Aufstieg: s. GameControl.ascendAwakening-Doc.
  const [ascendAwakening, setAscendAwakening] = useState<AscendAwakening | null>(null);
  const dismissAscendAwakening = useCallback(() => setAscendAwakening(null), []);

  const dismissSaveRecovery = useCallback(() => setSaveRecovery(null), []);
  const dismissImportSuccess = useCallback(() => setImportSuccess(false), []);

  const refreshSlots = useCallback(async () => {
    const raw = await readAllSlots();
    setSlots(raw.map((json, id) => ({ id, summary: json ? parseSummary(json) : null })));
  }, []);

  // Perf-Welle (2026-07-22): NICHT-abonnierender State-Zugriff — für einmalige Mount-Zeit-Reads
  // (z.B. App.tsx usePortraitFallback), die den aktuellen State brauchen, aber keinen Grund haben,
  // die aufrufende Komponente an jeden 10-Hz-Tick zu binden (das würde `useGameState()`/LiveContext
  // tun, s. `live`-useMemo unten mit `tick`-Dep). `stateRef` ist dieselbe Referenz wie `state` in
  // LiveContext — nur der Lesezugriff selbst löst hier keinen Re-Render aus. `control`
  // (ControlContext) ist bewusst NICHT auf `tick` gemappt, bleibt also über alle Ticks hinweg
  // referenzstabil (s. useMemo-Deps von `control` unten).
  const getState = useCallback((): GameState | null => stateRef.current, []);

  // claude:2026-10-31T16:34:28+01:00 — Speicherstempel des LIVE-States. Solange die Rückkehr in Häppchen noch läuft, trägt der
  // Stand den Zeitpunkt, bis zu dem er wirklich nachgerechnet ist, NICHT "jetzt": stürzt das Spiel mittendrin ab, holt der
  // nächste Ladevorgang den Rest nach, statt Stunden zu verlieren.
  const serializeLive = useCallback((s: GameState): string => {
    const job = catchUpRef.current;
    return job && job.state === s ? serialize(s, catchUpSavedAt(job)) : serialize(s);
  }, []);

  // Perf-Welle Block A: Tick-Signal für `useGameSelector` (s. SelectorStore-JSDoc oben). Ein
  // Set statt eines einzelnen Callbacks, weil beliebig viele Selector-Hooks gleichzeitig live
  // sein können (jede migrierte Chrome-Komponente hat ihren eigenen `useSyncExternalStore`-Slot).
  // `notifyTick` wird IMMER unmittelbar NACH jedem `setTick(...)`-Aufruf unten aufgerufen (nie
  // davor) — der State ist zu diesem Zeitpunkt bereits final mutiert/ersetzt (s. jeweilige
  // Aufrufstelle), Selektoren lesen also nie einen halbfertigen Zwischenstand.
  const tickListenersRef = useRef<Set<() => void>>(new Set());
  const subscribeTick = useCallback((listener: () => void): (() => void) => {
    tickListenersRef.current.add(listener);
    return () => {
      tickListenersRef.current.delete(listener);
    };
  }, []);
  const notifyTick = useCallback(() => {
    tickListenersRef.current.forEach((listener) => listener());
  }, []);

  const saveGame = useCallback(async () => {
    // codex:2026-08-31T22:04:00+02:00 — kein altes Autosave über einen laufenden Paar-Commit legen.
    if (transferBusyRef.current) return;
    const s = stateRef.current;
    const slot = activeSlotRef.current;
    if (s && slot !== null) {
      await writeSlot(slot, serializeLive(s));
    }
    // Bump AFTER the write (or the no-op skip) — one shared signal for the periodic autosave
    // interval below and the Sidebar's manual "Speichern" button (Sidebar.tsx calls this same
    // callback), see GameControl.saveTick doc.
    setSaveTick((t) => t + 1);
  }, []);

  // claude:2026-10-18T14:00:00+02:00 — Prestige-Aufstieg (Welle D, Vertrag in engine/prestige.ts `ascend` und
  // main/saveBackups.ts `backupPreAscend`). `transferBusyRef` hält Autosaves während des Ablaufs an, damit nichts
  // zwischen Sicherung und Neustand in den Slot schreibt.
  const ascendRun = useCallback(async (choice: PrestigeAscendChoice): Promise<AscendRunResult> => {
    const s = stateRef.current;
    const slot = activeSlotRef.current;
    if (!s || slot === null) return { ok: false, reason: "no_active_save" };
    if (transferBusyRef.current || catchUpRef.current) return { ok: false, reason: "busy" }; // claude:2026-10-31T16:34:28+01:00 — nicht mitten in der Nachholung
    const check = prestigeAscendCheck(s, content, choice);
    if (!check.ok) return { ok: false, reason: check.reason ?? "locked" };
    transferBusyRef.current = true;
    try {
      // (1) aktuellen Stand speichern und abwarten.
      try {
        await writeSlot(slot, serializeLive(s));
      } catch (error) {
        console.error("Aufstieg: Speichern vor der Sicherung fehlgeschlagen:", error);
        return { ok: false, reason: "write_failed" };
      }
      // (2) Sicherung unter dem Slot-Lock; nur "pre-ascend" erlaubt den Aufstieg.
      if ((await backupPreAscend(slot)) !== "pre-ascend") return { ok: false, reason: "backup_failed" };
      // (3) Aufstieg (ersetzt den State IN PLACE), (4) sofort speichern.
      // claude:2026-10-18T20:30:00+02:00 — Bilanz zuerst: danach beschreibt der State den neuen, leeren Durchgang.
      const summary = prestigeRunSummary(s, content);
      if (!ascend(s, content, choice)) return { ok: false, reason: "locked" };
      const prestige = s.prestige;
      const gained = prestige.history[prestige.history.length - 1]?.points ?? 0;
      try {
        await writeSlot(slot, serializeLive(s));
      } catch (error) {
        // Der Neustand lebt im Speicher; das nächste Autosave holt das Schreiben nach, die Sicherung liegt vor.
        console.error("Aufstieg: Speichern des Neustands fehlgeschlagen (Autosave versucht es erneut):", error);
      }
      setDebugHook(s);
      setAscendAwakening({ count: prestige.count, points: gained, summary });
      // (5) Baum remounten: alle Snapshot-Refs (DeathPopup/Toasts/Level-Diffs) starten frisch wie beim Laden.
      setSessionEpoch((e) => e + 1);
      setTick((t) => t + 1);
      notifyTick();
      setSaveTick((t) => t + 1);
      return { ok: true };
    } finally {
      transferBusyRef.current = false;
    }
  }, [notifyTick]);

  // codex:2026-08-31T22:04:00+02:00 — Echtdaten-Transfer: Ziel ohne Offline-Tick laden, beide
  // Zustände klonen/mutieren und erst NACH journalgeschütztem Paar-Commit live übernehmen.
  const sendItemsToSlot = useCallback(async (
    targetSlotId: number,
    selection: CrossSaveTransferSelection,
  ): Promise<CrossSaveTransferResult | { ok: false; reason: "no_active_save" | "target_missing" | "target_invalid" | "write_failed" }> => {
    const source = stateRef.current;
    const sourceSlotId = activeSlotRef.current;
    if (!source || sourceSlotId === null) return { ok: false, reason: "no_active_save" };
    if (sourceSlotId === targetSlotId) return { ok: false, reason: "same_save" };
    if (transferBusyRef.current) return { ok: false, reason: "write_failed" };
    transferBusyRef.current = true;
    try {
      const targetJson = await readSlot(targetSlotId);
      if (!targetJson) return { ok: false, reason: "target_missing" };
      const targetSavedAt = parseSavedAt(targetJson) ?? parseSummary(targetJson)?.savedAt;
      if (targetSavedAt === null || targetSavedAt === undefined) return { ok: false, reason: "target_invalid" };
      // now === savedAt: Migration + Sanitize ja, aber KEIN heimlicher Offline-Catch-up im Zielsave.
      const loadedTarget = deserialize(targetJson, content, targetSavedAt);
      if (!loadedTarget) return { ok: false, reason: "target_invalid" };

      const nextSource = structuredClone(source);
      const nextTarget = structuredClone(loadedTarget.state);
      const moved = transferInventoryItemsToSave(
        nextSource,
        nextTarget,
        content,
        source.character.name,
        selection,
      );
      if (!moved.ok) return moved;

      const sourceJson = serializeLive(nextSource);
      // Ziel behält seinen alten savedAt: beim nächsten echten Laden wird die gesamte Abwesenheit
      // weiterhin einmalig nachgeholt; der Itemtransfer selbst erzeugt keine Spielzeit.
      const nextTargetJson = serialize(nextTarget, targetSavedAt);
      await writeSlotPair(sourceSlotId, sourceJson, targetSlotId, nextTargetJson);

      stateRef.current = nextSource;
      setDebugHook(nextSource);
      setTick((tickValue) => tickValue + 1);
      notifyTick();
      setSaveTick((tickValue) => tickValue + 1);
      await refreshSlots();
      return moved;
    } catch (error) {
      console.error("Cross-Save-Itemtransfer fehlgeschlagen:", error);
      return { ok: false, reason: "write_failed" };
    } finally {
      transferBusyRef.current = false;
    }
  }, [notifyTick, refreshSlots]);

  // dismissOffline schreibt seit Sweep 2 (T10) einen Save-Checkpoint (s. loadGame-Doc weiter
  // unten für den zweiten Checkpoint direkt nach dem Laden) — deshalb erst NACH saveGame
  // deklariert (referenziert es). Der Game-Loop tickt weiter, während die Offline-Karte offen ist
  // (s. Loop-Effekt unten), der Spieler kann also zusätzliche Echtzeit ansammeln, bevor er
  // "Collect" klickt — ohne diesen zweiten Checkpoint ginge genau dieses Fenster bei einem
  // Hart-Kill kurz nach dem Schließen der Karte verloren UND ein sehr schneller Reload vor dem
  // nächsten Autosave zeigte dieselbe Offline-Karte (identische Zahlen) ein zweites Mal.
  const dismissOffline = useCallback(() => {
    setOfflineSummary(null);
    void saveGame();
  }, [saveGame]);

  // Dev-Werkzeug, s. `zeigeDemoOffline` im Interface. Setzt nur den Anzeige-Zustand; der
  // Spielstand bleibt unberuehrt, und "Einsammeln" raeumt die Karte wie gewohnt weg.
  const zeigeDemoOffline = useCallback(() => {
    setOfflineSummary(baueDemoOfflineSummary());
  }, []);

  const exportSave = useCallback((): string | null => {
    const s = stateRef.current;
    return s ? serializeLive(s) : null;
  }, []);

  const importSave = useCallback(async (json: string): Promise<boolean> => {
    const slot = activeSlotRef.current;
    if (slot === null) return false;
    const summary = parseSummary(json);
    if (!summary) return false; // kein gültiger Hearthforge-Spielstand
    try {
      // savedAt als „now" → kein Offline-Sprung beim Import.
      const result = deserialize(json, content, summary.savedAt);
      if (!result) return false; // beschädigter/manipulierter Spielstand
      stateRef.current = result.state;
      setDebugHook(result.state);
      await writeSlot(slot, serialize(result.state));
      setTick((t) => t + 1);
      notifyTick(); // Perf-Welle Block A: Selector-Hooks sofort mit dem frisch importierten State neu prüfen.
      // Kompletten Spiel-Layout-Baum remounten (s. sessionEpoch-Doc): sonst diffen
      // DeathPopup/Toasts den frisch importierten State gegen Snapshot-Refs des ALTEN
      // Charakters → falsches Todes-Popup + falsche Rare-Toasts (Sweep-Fund T8).
      setSessionEpoch((e) => e + 1);
      // Import-Erfolgs-Hinweis (s. GameControl.importSuccess-Doc, Sweep-2-Fund T9): überlebt den
      // Remount oben — die frisch gemountete Toasts.tsx zeigt daraufhin den einzigen Hinweis, den
      // der Spieler je zu sehen bekommt (die alte OptionsPage stirbt VOR ihrem eigenen Status-Render).
      setImportSuccess(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const startNewGame = useCallback((slotId: number) => {
    pendingSlotRef.current = slotId;
    setScreen("creating");
  }, []);

  const cancelCreation = useCallback(() => {
    pendingSlotRef.current = null;
    setScreen("menu");
  }, []);

  const createCharacter = useCallback(async (input: CharacterCreation) => {
    const slot = pendingSlotRef.current;
    if (slot === null) return;
    // starterKit: neue Spieler bekommen etwas Start-Nahrung + vorbelegtes Auto-Eat (frühe Überlebbarkeit).
    const s = createGame({ ...input, starterKit: true }, content);
    stateRef.current = s;
    setDebugHook(s);
    activeSlotRef.current = slot;
    setActiveSlotId(slot);
    pendingSlotRef.current = null;
    await writeSlot(slot, serializeLive(s));
    // Neuer Charakter ⇒ Spotlight-Guide zeigt sich automatisch: `createGame` setzt
    // `state.onboarding = newGameOnboarding()` (active:true, step:0) bereits selbst — kein
    // localStorage-Flag/Event mehr nötig (das war nur fürs alte, jetzt unbenutzte Onboarding.tsx).
    setScreen("playing");
    setTick((t) => t + 1);
    notifyTick(); // Perf-Welle Block A: s. importSave-Kommentar.
  }, []);

  const loadGame = useCallback(async (slotId: number) => {
    const json = await readSlot(slotId);
    if (!json) return;
    // Ein EINZIGER "jetzt"-Zeitpunkt für den kompletten Ladevorgang (Task AA-1): sowohl der interne
    // 8h-Offline-Cap (`deserialize`s `now`-Parameter) als auch unsere renderer-seitige "echte
    // Abwesenheit" (savedAt → loadNow, s.u.) rechnen gegen denselben Wert — sonst könnte Drift
    // zwischen zwei knapp aufeinanderfolgenden `Date.now()`-Aufrufen die Cap-Erkennung
    // (`realMs > offline.ms`) unnötig verrauschen.
    const loadNow = Date.now();
    // Defensiv (Security-Härtung r1, V1.2): ein beschädigter/manipulierter Slot darf das Laden
    // NICHT crashen. deserialize liefert bei kaputtem Save null; zusätzlich try/catch als Gürtel
    // & Hosenträger.
    const tryDeserialize = (raw: string): ReturnType<typeof deserialize> => {
      try {
        return deserialize(raw, content, loadNow);
      } catch {
        return null;
      }
    };
    let result = tryDeserialize(json);
    // Echter (ungekappter) Speicherzeitpunkt fürs Offline-Popup (Task AA-1) — vom jeweils
    // ERFOLGREICH geladenen Save (Haupt-Slot ODER Backup, s.u.). `null` = unbekannt (kein lesbarer
    // Top-Level `savedAt`) → die Bühne zeigt dann einfach nur die gekappte Zeit wie bisher.
    let savedAtUsed: number | null = parseSavedAt(json);
    if (!result) {
      // Selbstheilung (Task #288 D, Plan §4.1): Slot kaputt → lokale Backups holen (Main,
      // neueste zuerst), nach Speicherzeitpunkt sortieren und der Reihe nach deserialize
      // probieren. Der erste Treffer wird geladen, sofort in den Slot zurückgeschrieben
      // (atomar; das kaputte Original wird Main-seitig bewusst NICHT in die Backup-Rotation
      // aufgenommen) und per Toast gemeldet. Erst wenn auch KEIN Backup ladbar ist, bleibt
      // der Spieler wie bisher im Menü.
      console.error(`Spielstand in Slot ${slotId} ist beschädigt — versuche Backup-Wiederherstellung.`);
      const backups = await readSlotBackups(slotId);
      const candidates = backups
        .map((b) => ({ ...b, savedAt: parseSummary(b.json)?.savedAt ?? 0 }))
        .sort((a, b) => b.savedAt - a.savedAt || b.mtimeMs - a.mtimeMs);
      for (const cand of candidates) {
        const recovered = tryDeserialize(cand.json);
        if (!recovered) continue;
        result = recovered;
        // Top-Level-Feld des Backup-JSONs (Task AA-1, s. `parseSavedAt`-Doc) — NICHT das
        // `cand.savedAt` von oben (das ist `summary.savedAt`, nur für Sortierung/Toast gedacht).
        savedAtUsed = parseSavedAt(cand.json);
        await writeSlot(slotId, serialize(recovered.state));
        setSaveRecovery({ restoredFromMs: cand.savedAt || cand.mtimeMs });
        console.error(`Slot ${slotId} aus Backup „${cand.name}" wiederhergestellt.`);
        break;
      }
      if (!result) {
        console.error(`Spielstand in Slot ${slotId}: kein ladbares Backup gefunden — bleibe im Menü.`);
        return;
      }
    }
    const { state, offline } = result;
    stateRef.current = state;
    setDebugHook(state);
    activeSlotRef.current = slotId;
    setActiveSlotId(slotId);
    // Popup-Öffnungs-Gate: bisher NUR "nennenswerte Abwesenheit (> 1 Min) UND tatsächlicher
    // Ertrag" — eine lange Abwesenheit OHNE jeden Ertrag (nichts lief) blieb dadurch komplett
    // stumm, obwohl das genau der Fall ist, den der Spieler am ehesten als Bug liest ("wo ist mein
    // Fortschritt hin?"). Task AA-4 öffnet die Bühne zusätzlich für diesen "leere Rückkehr"-Fall
    // (> 1h weg, 0 Ertrag, kein Tod, kein laufender Kampf, `!combatStopped` schließt den seltenen
    // Patt-mit-0-Ertrag-Fall aus — dort LIEF etwas, nur erfolglos, andere Formulierung nötig als
    // "es lief keine Tätigkeit") und zeigt dort statt der leeren Bühne eine Mini-Karte.
    const hasGains = offline.xp > 0 || offline.gold > 0 || Object.keys(offline.items).length > 0;
    const wasIdle = state.activeActionId === null && state.combat.monsterId === null;
    const emptyReturn =
      !hasGains &&
      (offline.deaths ?? 0) === 0 &&
      !offline.combatStopped &&
      wasIdle &&
      offline.ms > EMPTY_RETURN_MS;
    const showOffline = (offline.ms > 60_000 && hasGains) || emptyReturn;
    // Lager-Bau-Breadcrumb quittieren (Task #364 Fix 1, „wer meldet, quittiert"): die Bühne ZEIGT
    // den offline fertiggestellten Bau gleich selbst (Abschnitt „Dein Lager hat gebaut", Quelle
    // `offline.campBuilds`) — also wird `camp.lastCompletedBuild` hier auf null gesetzt, damit der
    // Bau-fertig-Toast (Toasts.tsx) ihn nicht ein zweites Mal meldet. Bewusst NUR wenn die Bühne
    // wirklich aufgeht: bleibt sie zu (kurze Abwesenheit ohne Ertrag), bleibt der Breadcrumb
    // stehen und der Toast holt die Meldung beim Mount nach — kein Fall bleibt stumm, keiner
    // meldet doppelt. Steht VOR dem Save-Checkpoint unten, damit die Quittung mit ins Save wandert
    // (sonst meldete ein Reload direkt nach dem Popup den Bau ein zweites Mal), und synchron vor
    // `setScreen("playing")`, also bevor MainLayout/Toasts mounten — kein Wettlauf um die Baseline.
    if (showOffline && (offline.campBuilds?.length ?? 0) > 0 && state.camp) {
      state.camp.lastCompletedBuild = null;
    }
    // Save-Checkpoint (Sweep 2, T10): sofort nach erfolgreichem Laden den (evtl. bereits
    // offline-aufgeholten) State zurückschreiben. Ohne das zeigte ein schneller Reload VOR dem
    // nächsten Autosave-Intervall dieselbe Offline-Karte (identische Zahlen) ein zweites Mal — es
    // wird nichts doppelt gutgeschrieben (reine Anzeige), aber es verwirrt. Der
    // Selbstheilungs-Zweig oben tut das für den Backup-Fall schon implizit (schreibt das
    // wiederhergestellte Backup direkt zurück); hier gilt es zusätzlich für den normalen
    // Lade-Erfolg. `saveGame` braucht `activeSlotRef` bereits gesetzt (s. oben), await VOR dem
    // Screen-Wechsel — analog zu `createCharacter`, das ebenfalls vor `setScreen` schreibt.
    await saveGame();
    if (showOffline) {
      // Echte Abwesenheit (Task AA-1): nur gesetzt, wenn ein valider savedAt vorlag.
      const realMs = savedAtUsed !== null ? Math.max(0, loadNow - savedAtUsed) : undefined;
      setOfflineSummary({ ...offline, realMs, emptyReturn });
    }
    setScreen("playing");
    setTick((t) => t + 1);
    notifyTick(); // Perf-Welle Block A: s. importSave-Kommentar.
  }, [saveGame]);

  const deleteSlot = useCallback(
    async (slotId: number) => {
      await removeSlot(slotId);
      await refreshSlots();
    },
    [refreshSlots],
  );

  const returnToMenu = useCallback(async () => {
    await saveGame();
    stateRef.current = null;
    activeSlotRef.current = null;
    setActiveSlotId(null);
    setScreen("menu");
    setTick((t) => t + 1);
    notifyTick(); // Perf-Welle Block A: s. importSave-Kommentar.
    await refreshSlots();
  }, [saveGame, refreshSlots]);

  // Slots beim Start laden.
  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  // UI-Audit-Fixture-Hook (dev-only, siehe ./fixtureLoader.ts + apps/client/ui-audit/README.md):
  // `?fixture=<name>` lädt einen präparierten GameState direkt ins Spiel, ohne Menü/Charaktererstellung.
  // Genau wie importSave: `now = summary.savedAt` (kein echtes now) → deterministischer Load OHNE
  // Offline-Aufholsimulation (sonst würde jeder Tour-Lauf abhängig von der Wanduhr-Lücke seit der
  // Fixture-Generierung unterschiedliche Skill-XP/Inventar/Achievements einsammeln). Aktiver Slot
  // bleibt `null` → Autosave/„Speichern"/„Hauptmenü" schreiben nie in einen echten Save-Slot.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const name = getFixtureParam();
    if (!name) return;
    let cancelled = false;
    void (async () => {
      const json = await fetchFixtureJson(name);
      if (!json || cancelled) return;
      const summary = parseSummary(json);
      if (!summary || cancelled) return;
      let result: ReturnType<typeof deserialize> = null;
      try {
        result = deserialize(json, content, summary.savedAt);
      } catch {
        result = null;
      }
      if (!result || cancelled) return;
      stateRef.current = result.state;
      activeSlotRef.current = null;
      setActiveSlotId(null);
      // UI-Audit-Debug-Hook: s. `setDebugHook`-JSDoc oben. Referenz bleibt über Tick-Mutationen
      // stabil (derselbe State-Objekt-Zeiger wird nur mutiert, nie ersetzt) — ein einmaliges
      // Setzen hier reicht.
      setDebugHook(result.state);
      setScreen("playing");
      setTick((t) => t + 1);
      notifyTick(); // Perf-Welle Block A: s. importSave-Kommentar.
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Offline-Popup-Preview-Hook (dev-only, "Beute-Bühne"-Redesign): `?offlineTest=<variant>` opens
  // OfflinePopup with a mocked OfflineSummary, independent of the real offline-catchup flow above —
  // fixtures always load with `now = savedAt` (see fetchFixtureJson usage above), i.e. 0 offline
  // time, so the popup is otherwise untriggerable from a screenshot script. Combine with
  // `?fixture=<name>` so a real GameState is active first (OfflinePopup only mounts inside
  // MainLayout). Fires once `screen === "playing"` (works for both the fixture hook above and a
  // freshly created game), guarded so it never re-fires on later ticks.
  const offlineTestFiredRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (offlineTestFiredRef.current) return;
    const variant = getOfflineTestParam();
    if (!variant) return;
    if (screen !== "playing" || !stateRef.current) return;
    offlineTestFiredRef.current = true;
    setOfflineSummary(buildOfflineTestSummary(variant));
  }, [screen, tick]);

  // Game-Loop: nur wenn ein Spielstand aktiv ist.
  // WICHTIG (Perf): Die Simulation (`advance`) läuft pro rAF-Frame mit echtem dt für genaue
  // Fortschritts-Akkumulation, ABER der React-Render (`setTick`) wird auf ~RENDER_HZ gedrosselt.
  // Ohne Drosselung renderte der komplette Komponentenbaum ~60×/s neu (Hauptursache für die
  // „sluggish" Performance). 10 Hz reichen für flüssige Anzeige; die Progress-Bars überbrücken
  // die 100-ms-Lücke per CSS-Transition (styles/skills.css .bar-fill, combat.css clip-path).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastRender = last;
    let simulationAccumulatorMs = 0;
    let catchUpRealMs = 0; // claude:2026-10-31T16:34:28+01:00 — ungekappter Rückstand des laufenden Auftrags (Cap-Hinweis der Karte)
    // codex:2026-07-31T00:32:37+02:00 — Simulation unabhängig von 60/120/165-Hz-Monitoren auf
    // maximal 30 Hz bündeln. Die gesamte verstrichene Zeit wird weiterhin an `advance` übergeben;
    // Spieltempo/Offline-Ertrag bleiben identisch, nur redundante Engine-Aufrufe entfallen.
    const SIMULATION_INTERVAL_MS = 1000 / 30;
    const RENDER_INTERVAL_MS = 100; // ~10 Hz UI-Updates statt ~60 Hz (−6× Render-Last)
    const loop = (now: number): void => {
      // dt auf den Offline-Cap deckeln: nach OS-Sleep/Suspend liefert performance.now() einen riesigen
      // Sprung → sonst läuft die Aufhol-Sim synchron durch (UI-Freeze) UND umginge den 8h-Offline-Cap
      // des Reload-Pfads (Tester-Sweep2 T27#2). Konsistent mit deserialize.
      // claude:2026-10-30T19:31:00+01:00 — 1.4.2: Cap = effectiveMaxOfflineMs (Wachturm + Narbenbuch „Lange Nacht“), identisch zum Lade-Pfad.
      const capMs = stateRef.current ? effectiveMaxOfflineMs(stateRef.current, content) : MAX_OFFLINE_MS;
      const rawDt = now - last;
      const dt = Math.min(rawDt, capMs);
      last = now;
      // claude:2026-10-31T16:34:28+01:00 — 1.4.2: Rückkehr aus dem Hintergrund in Häppchen. Ein Auftrag, dessen State nicht mehr
      // der aktive ist (Menü, Laden, Import), wird verworfen.
      if (catchUpRef.current && catchUpRef.current.state !== stateRef.current) {
        catchUpRef.current = null;
        setCatchUp(null);
      }
      if (stateRef.current && !catchUpRef.current && !transferBusyRef.current && dt > CATCHUP_THRESHOLD_MS) {
        // Der Rückstand ist ab jetzt Sache des Auftrags; der Live-Akkumulator bleibt leer.
        catchUpRef.current = startCatchUp(stateRef.current, content, dt, Date.now());
        catchUpRealMs = rawDt;
        simulationAccumulatorMs = 0;
        setCatchUp({ doneMs: 0, totalMs: dt });
      } else if (catchUpRef.current) {
        extendCatchUp(catchUpRef.current, dt);
      }
      const job = catchUpRef.current;
      if (job && stateRef.current) {
        // Ein Häppchen je Frame (~10 min Spielzeit), Eingaben und Anzeige bleiben dazwischen bedienbar.
        const finished = stepCatchUp(job, content);
        if (finished) {
          const summary = buildCatchUpSummary(job, content);
          const hasGains = summary.xp > 0 || summary.gold > 0 || Object.keys(summary.items).length > 0;
          const wasIdle = job.before.monsterId === null && job.before.dungeonId === null && !(job.before.activeActionId);
          const emptyReturn = !hasGains && (summary.deaths ?? 0) === 0 && !summary.combatStopped && wasIdle && summary.ms > EMPTY_RETURN_MS;
          if ((summary.ms > 60_000 && hasGains) || emptyReturn) {
            setOfflineSummary({ ...summary, realMs: Math.max(catchUpRealMs, summary.ms), emptyReturn });
          }
          catchUpRef.current = null;
          setCatchUp(null);
          void saveGame();
          lastRender = now;
          setTick((t) => (t + 1) % 1_000_000);
          notifyTick();
        } else if (now - lastRender >= RENDER_INTERVAL_MS) {
          lastRender = now;
          setCatchUp({ doneMs: job.doneMs, totalMs: job.totalMs });
          setTick((t) => (t + 1) % 1_000_000);
          notifyTick();
        }
      } else if (stateRef.current) {
        simulationAccumulatorMs = Math.min(simulationAccumulatorMs + dt, capMs);
        // codex:2026-08-31T23:03:00+02:00 — während des Zwei-Slot-Commits bleibt der Quellsave
        // unverändert. Die verstrichene Sim-Zeit wird nur aufgestaut und direkt danach auf den
        // erfolgreich übernommenen Zustand angewandt; so kann der Commit keine Live-Ticks verlieren.
        if (!transferBusyRef.current && simulationAccumulatorMs >= SIMULATION_INTERVAL_MS) {
          // Blessings of the Reach (engine/src/tick.ts `advance` JSDoc): der Live-Loop soll das reale
          // Kalender-„jetzt" (Epoch-ms) übergeben, NICHT den rAF-Parameter `now` — der ist ein
          // DOMHighResTimeStamp relativ zum Navigations-Zeitpunkt (performance.now()-Basis), kein
          // Epoch-Wert. `blessingForTime` läuft intern über `new Date(nowMs).getDay()`; mit dem
          // rAF-`now` durchgereicht läge das Datum nahe 1970-01-01 → falscher/fixer Wochentag statt
          // des tatsächlichen lokalen Kalendertags.
          // Dev-Zeitraffer (Chef 29.08.2026): `getDevSpeed()` ist im ausgelieferten Spiel IMMER 1
          // (zweite Sperre, s. devSpeed.ts) — dort ist die Zeile ein reiner No-op. Im Dev-Build
          // streckt der Faktor das Zeitfenster, das die Engine sieht; das ist exakt der
          // Offline-Aufhol-Pfad, also derselbe deterministische Code. Auf MAX_OFFLINE_MS geklemmt,
          // damit ein hoher Faktor nach einem Frame-Aussetzer nicht doch die Aufhol-Sim sprengt.
          const simulationDt = Math.min(simulationAccumulatorMs * getDevSpeed(), capMs);
          simulationAccumulatorMs = 0;
          advance(stateRef.current, content, simulationDt, { nowMs: Date.now() });
        }
        if (now - lastRender >= RENDER_INTERVAL_MS) {
          lastRender = now;
          // codex:2026-07-31T00:32:37+02:00 — Live-Anzeige ist Hintergrundarbeit; Eingabe,
          // Hover und Navigation dürfen einen 10-Hz-Status-Commit jederzeit überholen.
          startTransition(() => {
            setTick((t) => (t + 1) % 1_000_000);
          });
          // Perf-Welle Block A: DAS primäre Tick-Signal für `useGameSelector` — feuert exakt im
          // selben ~10-Hz-Takt wie der bestehende LiveContext-Re-Render, NACH `advance()` (der
          // State ist zu diesem Zeitpunkt bereits final für diesen Frame mutiert).
          notifyTick();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Periodisches Autosave.
  useEffect(() => {
    const id = window.setInterval(() => void saveGame(), AUTOSAVE_MS);
    return () => window.clearInterval(id);
  }, [saveGame]);

  // Save-on-Close (#281-Bugfund): Main fängt Fenster-X/Alt+F4 ab und wartet auf uns — erst
  // speichern, DANN wirklich beenden. Ohne aktiven Slot (Hauptmenü) ist saveGame ein No-op.
  // Wirft das Speichern, beenden wir trotzdem (Main hat ohnehin einen 2-s-Fallback).
  useEffect(() => {
    return window.hearthforge?.app?.onSaveThenQuit?.(() => {
      void (async () => {
        try { await saveGame(); } catch { /* Quit hat Vorrang */ }
        void window.hearthforge?.app?.quit();
      })();
    });
  }, [saveGame]);

  const control = useMemo<GameControl>(
    () => ({
      screen,
      slots,
      activeSlotId,
      refreshSlots,
      startNewGame,
      cancelCreation,
      createCharacter,
      loadGame,
      saveGame,
      sendItemsToSlot,
      exportSave,
      importSave,
      deleteSlot,
      returnToMenu,
      offlineSummary,
      dismissOffline,
      catchUp,
      zeigeDemoOffline,
      saveRecovery,
      dismissSaveRecovery,
      saveTick,
      sessionEpoch,
      importSuccess,
      dismissImportSuccess,
      getState,
      ascendRun,
      ascendAwakening,
      dismissAscendAwakening,
    }),
    [
      screen,
      slots,
      activeSlotId,
      refreshSlots,
      startNewGame,
      cancelCreation,
      createCharacter,
      loadGame,
      saveGame,
      sendItemsToSlot,
      exportSave,
      importSave,
      deleteSlot,
      returnToMenu,
      offlineSummary,
      dismissOffline,
      catchUp,
      zeigeDemoOffline,
      saveRecovery,
      dismissSaveRecovery,
      saveTick,
      sessionEpoch,
      importSuccess,
      dismissImportSuccess,
      getState,
      ascendRun,
      ascendAwakening,
      dismissAscendAwakening,
    ],
  );

  const live = useMemo<GameLive>(() => ({ state: stateRef.current, tick }), [tick]);

  // Perf-Welle Block A: s. SelectorStore-JSDoc oben — Deps sind beide dauerhaft stabile
  // Referenzen, dieses `useMemo` läuft also faktisch nur EIN einziges Mal pro Provider-Leben.
  const selectorStore = useMemo<SelectorStore>(
    () => ({ getState, subscribeTick }),
    [getState, subscribeTick],
  );

  return (
    <ControlContext.Provider value={control}>
      <SelectorStoreContext.Provider value={selectorStore}>
        <LiveContext.Provider value={live}>
          {children}
          {/* claude:2026-10-31T16:34:28+01:00 — 1.4.2: Rückkehr-Fortschritt und Desktop-Benachrichtigungen hängen direkt am Provider. */}
          <CatchUpOverlay />
          <DesktopNotifier />
        </LiveContext.Provider>
      </SelectorStoreContext.Provider>
    </ControlContext.Provider>
  );
}

export function useGameControl(): GameControl {
  const ctx = useContext(ControlContext);
  if (!ctx) throw new Error("useGameControl muss innerhalb von <GameProvider> verwendet werden");
  return ctx;
}

/** Für Seiten, die nur bei aktivem Charakter gerendert werden. */
export function useGameState(): GameState {
  const ctx = useContext(LiveContext);
  if (!ctx || !ctx.state) throw new Error("Kein aktiver Charakter");
  return ctx.state;
}

/**
 * Wie useGameState, aber null-tolerant — gibt null zurück wenn kein Spiel aktiv ist.
 * Verwenden wenn Komponenten auch außerhalb eines aktiven Spiels gerendert werden können
 * (z.B. ItemTooltipOverlay, das app-weit gemountet ist).
 */
export function useGameStateMaybe(): GameState | null {
  const ctx = useContext(LiveContext);
  return ctx?.state ?? null;
}

function useSelectorStore(): SelectorStore {
  const ctx = useContext(SelectorStoreContext);
  if (!ctx) throw new Error("useGameSelector muss innerhalb von <GameProvider> verwendet werden");
  return ctx;
}

/**
 * Nicht-abonnierender State-Getter für Render-Code (Perf-Welle Block A): gibt eine über die
 * gesamte Provider-Lebensdauer STABILE Funktion zurück (kein Context-Change löst je einen
 * Re-Render bei ihren Konsumenten aus, s. SelectorStore-JSDoc). Gedacht als Ergänzung zu
 * `useGameSelector` — dessen schmales Primitiv-Tupel entscheidet WANN neu gerendert wird, dieser
 * Getter liefert dann INNERHALB dieses (selteneren) Renders den vollen State für Berechnungen,
 * die mehr als ein paar Primitives brauchen (z.B. `computeStats`/`computeActionRate`). Wirft NICHT
 * bei fehlendem Spiel (anders als `useGameState`) — Aufrufer, die nur bei aktivem Charakter
 * rendern, dürfen `getState()!` non-null assertion nutzen (Konvention in den migrierten
 * Chrome-Komponenten, s. App.tsx/Sidebar.tsx).
 */
export function useGetGameState(): () => GameState | null {
  return useSelectorStore().getState;
}

function isPrimitiveSelectorValue(v: unknown): boolean {
  return v === null || (typeof v !== "object" && typeof v !== "function");
}

/** Elementweiser Vergleich für Tupel/Arrays aus Primitives — der einzige unbedenkliche Weg,
 *  einen `useGameSelector` NICHT-primitiven Rückgabewert zu vergleichen (s. `useGameSelector`-
 *  JSDoc, "DIE EINE FOOTGUN"). NICHT für Arrays aus Objekten/verschachtelten Arrays gedacht (nur
 *  eine flache `Object.is`-Ebene) — für alles Tiefere lieber mehrere primitive Slots im Tupel. */
export function tupleEquals(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/** Grobe strukturelle Gleichheit (eine Ebene tief) — NUR für den Dev-Guard unten, um die
 *  "frisches Objekt mit gleichem Inhalt"-Footgun von einer echten Wertänderung zu unterscheiden.
 *  Bewusst NICHT als `equals`-Parameter gedacht (dafür `tupleEquals` für Arrays verwenden). */
function shallowEqualForDevGuard(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => Object.is(v, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => Object.is(ao[k], bo[k]));
}

/**
 * Perf-Welle Block A ("Chrome-Welle", 2026-07-22): schmaler Selector-Hook auf
 * `useSyncExternalStore`-Basis — Konsumenten re-rendern NUR, wenn sich der SELEKTIERTE Wert
 * ändert, nicht bei jedem 10-Hz-Tick (anders als `useGameState()`/LiveContext). Gedacht für
 * globales Chrome, das auf JEDER Seite mitrendert (TopBar/Sidebar/Header & Co.) — der bestehende
 * `useGameState()`/LiveContext-Pfad bleibt für alles andere (Seiten, Listen, FX) unverändert
 * bestehen, das ist eine additive, inkrementelle Migration.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * DIE EINE FOOTGUN (bitte lesen, bevor hier ein neuer Selector geschrieben wird):
 * `state` wird von der Engine IN-PLACE mutiert (kein Immutable-Update, s. `advance()` in
 * tick.ts) — das hat zwei Konsequenzen, die beide zu STILLEN Bugs führen:
 *
 *  1) NIE eine Objekt-/Array-Referenz direkt aus dem State zurückgeben (z.B. `s.quests`,
 *     `s.combat`, `s.inventory.items`). Diese Referenz ändert sich NIE (nur ihr Inhalt wird
 *     mutiert) → `Object.is`-Vergleich sagt IMMER "gleich" → der Konsument rendert nie wieder,
 *     auch wenn sich der Inhalt längst geändert hat (stiller Stale-Bug).
 *  2) NIE ein frisches Objekt/Array IM Selector bauen (z.B. `(s) => ({ hp: s.character.hp })`
 *     oder `(s) => [a, b]` OHNE `equals`-Parameter). Jeder Aufruf liefert eine NEUE Referenz →
 *     `Object.is` sagt IMMER "ungleich" → der Konsument rendert wieder bei JEDEM Tick (genau der
 *     10-Hz-Sockel, den dieser Hook eigentlich abbauen soll).
 *
 * → Selektoren dürfen NUR Primitives (number/string/boolean/null) zurückgeben, ODER ein Tupel
 *   aus Primitives ZUSAMMEN MIT `tupleEquals` (oder einem eigenen elementweisen `equals`) als
 *   zweitem Parameter. Für alles, was mehr als ein paar Primitives braucht (z.B. `computeStats`-
 *   Ergebnisse), den Selector nur als GATE nutzen (welche Primitives lösen einen Re-Render aus?)
 *   und den vollen State bei Bedarf zusätzlich über `useGetGameState()` im Render-Body holen
 *   (läuft dann nur noch so oft wie der jetzt gedrosselte Re-Render selbst, s. App.tsx/
 *   Sidebar.tsx für das Muster).
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Dev-Guard: liefert der Selector zweimal hintereinander einen nicht-primitiven Wert, der laut
 * `equals` als "geändert" gilt, aber strukturell (eine Ebene tief) identisch zum vorherigen Wert
 * ist, loggt DEV genau EINMAL pro Hook-Instanz eine Warnung (Footgun #2 oben — Footgun #1, die
 * eingefrorene Referenz, ist zur Laufzeit generell nicht zuverlässig erkennbar).
 *
 * @param selector Liest NUR aus `state` (kein `getState()`/Closures auf anderen State-Schnappschüssen).
 * @param equals Default `Object.is` (korrekt für Primitives). Für Tupel `tupleEquals` übergeben.
 */
export function useGameSelector<T>(
  selector: (state: GameState) => T,
  equals: (a: T, b: T) => boolean = Object.is,
): T {
  const { getState, subscribeTick } = useSelectorStore();

  // Frischer Selector/equals JEDEN Render synchron in Refs gespiegelt (nicht per useEffect) —
  // sonst läse `getSnapshot` (von React ggf. mehrfach pro Commit aufgerufen) zwischenzeitlich
  // eine veraltete Closure. Reines Lokal-Ref-Update während des Renders, kein State-Read danach
  // — unproblematisch (Standardmuster für genau diesen Zweck, z.B. use-sync-external-store).
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const equalsRef = useRef(equals);
  equalsRef.current = equals;

  const cacheRef = useRef<{ value: T; has: boolean }>({ value: undefined as unknown as T, has: false });
  const warnedRef = useRef(false);

  const getSnapshot = useCallback((): T => {
    const state = getState();
    if (!state) throw new Error("useGameSelector: kein aktiver Charakter");
    const next = selectorRef.current(state);
    const cache = cacheRef.current;
    if (cache.has && equalsRef.current(cache.value, next)) {
      return cache.value; // unverändert (laut `equals`) → dieselbe Referenz zurückgeben (React bailt)
    }
    if (
      import.meta.env.DEV &&
      !warnedRef.current &&
      cache.has &&
      !isPrimitiveSelectorValue(next) &&
      shallowEqualForDevGuard(cache.value, next)
    ) {
      warnedRef.current = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[useGameSelector] Ein Selector liefert bei unverändertem Inhalt eine NEUE Objekt-/" +
          "Array-Referenz (equals() sagt \"geändert\", strukturell aber identisch) — das erzwingt " +
          "einen Re-Render bei JEDEM Tick. Selektoren dürfen nur Primitives oder ein Tupel MIT " +
          "passendem `equals` (z.B. tupleEquals) liefern, s. useGameSelector-JSDoc „DIE EINE FOOTGUN\".",
      );
    }
    cacheRef.current = { value: next, has: true };
    return next;
  }, [getState]);

  return useSyncExternalStore(subscribeTick, getSnapshot);
}
