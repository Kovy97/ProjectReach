import type { ActionId, ContentDB, GameState, MonsterId, QueuedAction, ThievingRisk } from "@hearthforge/shared";
import {
  FIGHT_QUEUE_ACTION_ID,
  isDungeonQueueEntry,
  isFightQueueEntry,
  makeDungeonQueueEntry,
  makeFightQueueEntry,
} from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { startCombat } from "./combat";
import { canEnterDungeon, startDungeon } from "./dungeon";
import { actionInputsOnHand } from "./queueProjection";
import { canFightMonster } from "./slayer";

// claude:2026-10-17T20:00:00+02:00 — K4: nicht-persistierter Skip-Zähler je State (WeakMap), nur während eines
// Offline-Catch-ups registriert; ersetzt kein Save-Feld. Reiner Beobachter, kein Einfluss auf Zustand/RNG.
const queueSkipTallies = new WeakMap<GameState, { count: number }>();
/** Startet die Zählung übersprungener Queue-Einträge für `state` (Offline-Catch-up). */
export function beginQueueSkipTally(state: GameState): { count: number } {
  const t = { count: 0 };
  queueSkipTallies.set(state, t);
  return t;
}
/** Beendet die Zählung. */
export function endQueueSkipTally(state: GameState): void {
  queueSkipTallies.delete(state);
}
/** Setzt `lastQueueSkip` und zählt den Skip mit, falls eine Zählung läuft. */
export function setQueueSkip(state: GameState, skip: NonNullable<GameState["lastQueueSkip"]>): void {
  state.lastQueueSkip = skip;
  const t = queueSkipTallies.get(state);
  if (t) t.count += 1;
}

/** Prüft, ob das Skill-Level für eine Aktion ausreicht. */
export function actionLevelMet(state: GameState, content: ContentDB, actionId: ActionId): boolean {
  const action = content.actions[actionId];
  if (!action) return false;
  const required = action.levelRequired ?? 1;
  return levelFromXp(state.skills[action.skill]?.xp ?? 0) >= required;
}

/**
 * Setzt die aktive Aktion (oder `null` zum Stoppen) und resettet den Fortschritt.
 *
 * `target` ist der optionale Ziel-Zähler des Mengen-Crafts (1/5/10): nach so vielen Abschlüssen
 * stoppt die Aktion automatisch. `null`/undefined oder ein Wert ≤ 0 = unbegrenzt („Alle"/Standard,
 * heutiges Endlos-Verhalten) — abwärtskompatibel, bestehende Aufrufer ohne `target` bleiben endlos.
 * Beim Stoppen (actionId === null) wird das Ziel ebenfalls auf null zurückgesetzt (Invariante).
 */
export function setActiveAction(
  state: GameState,
  content: ContentDB,
  actionId: ActionId | null,
  target: number | null = null,
): void {
  if (actionId !== null) {
    if (!content.actions[actionId]) return;
    if (!actionLevelMet(state, content, actionId)) return; // Level zu niedrig → nicht starten
    // Kampf-Queue (Task #312): unterbricht der manuelle Start einen LAUFENDEN Queue-Kampf, wandert
    // dessen Eintrag mit Rest-Ziel zurück an die Queue-Front (nichts wird still übersprungen) —
    // er läuft nach der manuellen Aktivität regulär weiter (Muster „Queue setzt später fort").
    requeueFightFront(state);
    // Dungeon-Queue (SAVE 83): dito für einen LAUFENDEN Queue-Dungeon-Lauf — der aktuelle Lauf
    // bricht ab (kein Clear, zählt nicht), der Rest wandert an die Queue-Front.
    requeueDungeonFront(state);
    // Manueller Start = Wiederaufnahme: eine Tod-/Patt-Pause der Queue endet hier (Chef-GO #312
    // „Wiederaufnahme manuell"). Ohne Pause ein No-op.
    state.queuePaused = false;
    // Sammeln und Kampf schließen sich aus.
    state.combat.monsterId = null;
    // Neuer Start → alten Stopp-Hinweis verwerfen.
    state.lastStop = null;
  }
  if (actionId === null && state.activeActionId !== null && state.actionTarget === null && Array.isArray(state.actionQueue)) {
    // Manueller Stopp einer ENDLOSEN Aktion: wartende ∞-Einträge DERSELBEN Aktion fallen mit weg. Sie
    // stammen aus Wiederholungsklicks (Alt-Saves vor dem Guard in enqueueAction) und würden die eben
    // gestoppte Aktion im nächsten Leerlauf-Tick still neu starten (Bug-Report 27.08.2026). Endliche
    // Einträge und andere Aktionen bleiben unberührt — Stopp heißt „diese endlose Sache beenden“.
    const stopped = state.activeActionId;
    state.actionQueue = state.actionQueue.filter(
      (e) => !(e.kind === "action" && e.actionId === stopped && e.target === null),
    );
  }
  state.activeActionId = actionId;
  state.actionProgressMs = 0;
  // Ziel nur bei laufender Aktion und positivem, endlichem Wert; sonst unbegrenzt (null).
  state.actionTarget =
    actionId !== null && typeof target === "number" && Number.isFinite(target) && target > 0
      ? Math.floor(target)
      : null;
}

/**
 * Obergrenze für ein (gestapeltes) Queue-Ziel — deckungsgleich mit `QTY_HARD_CAP` in der Persistenz
 * (sanitizeState klemmt Queue-Ziele beim Laden auf denselben Wert). Verhindert, dass wiederholtes
 * Stapeln (5× 50 → 250, … n× 50) ins Unendliche läuft oder eine Zahl erzeugt, die beim nächsten
 * Save/Load wieder abgeschnitten würde. Engine darf nicht aus @hearthforge/persistence importieren
 * (Abhängigkeit läuft andersrum), daher hier lokal gespiegelt.
 */
const QUEUE_TARGET_CAP = 1_000_000_000;

/**
 * Normalisiert einen Queue-Ziel-Wert exakt wie `setActiveAction`: endliche positive Ganzzahl
 * (so viele Abschlüsse, gegen `QUEUE_TARGET_CAP` geklemmt) bzw. `null` (= „bis die Aktion von selbst stoppt").
 */
function normalizeTarget(target: number | null): number | null {
  return typeof target === "number" && Number.isFinite(target) && target > 0
    ? Math.min(Math.floor(target), QUEUE_TARGET_CAP)
    : null;
}

/**
 * Hängt eine Aktivität an die Action-Queue (SAVE_VERSION 70) — mit STAPELN gleicher Aktionen.
 * Unbekannte Aktions-IDs werden NICHT eingereiht (Content-Guard). Das Skill-Level wird hier BEWUSST
 * nicht geprüft — man darf eine Aktion vorplanen, deren Level (oder Material) erst später da ist;
 * `advanceActionQueue` überspringt gesperrte Einträge erst beim tatsächlichen Anlauf, fehlendes
 * Material ebenfalls dort (seit 27.08.2026 mit `lastQueueSkip`-Grund `no_materials`; die
 * Warteschlangen-Projektion in queueProjection.ts sagt der UI vorher, was ein früheres Ketten-
 * Glied liefern wird). `target` wird wie bei `setActiveAction` normalisiert.
 *
 * STAPEL-REGEL (nur der LETZTE, also benachbarte, Eintrag): hat der letzte Queue-Eintrag DIESELBE
 * `actionId` UND sind sein Ziel und das neue Ziel BEIDE endlich (nicht null/∞), wird das neue Ziel
 * AUF den letzten Eintrag ADDIERT (5× enqueue(tin, 50) → EIN Eintrag mit Ziel 250), gegen
 * `QUEUE_TARGET_CAP` geklemmt. Ist eines der beiden Ziele `null` (∞) oder die Aktion eine andere
 * (nicht benachbart, weil ein fremder Eintrag dazwischenliegt) → normaler neuer Eintrag am Ende.
 * Gibt in beiden Fällen true zurück, wenn (ein-)gereiht wurde.
 */
export function enqueueAction(
  state: GameState,
  content: ContentDB,
  actionId: ActionId,
  target: number | null = null,
): boolean {
  if (!content.actions[actionId]) return false;
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  // Manuelles Einreihen = Wiederaufnahme-Signal (Task #312): eine Tod-/Patt-Pause endet — sonst
  // säße der Spieler nach einem Tod vor toten Aktions-Karten (die UI startet NUR noch über
  // enqueue). ACHTUNG-Semantik: die Queue läuft dann ab der FRONT weiter (dort kann der
  // zurückgestellte Kampf-Eintrag liegen), der neue Eintrag reiht sich regulär hinten ein.
  state.queuePaused = false;
  const normalized = normalizeTarget(target);
  const last = state.actionQueue[state.actionQueue.length - 1];
  // Endlos-Doppel (Bug-Report 27.08.2026, „Endlosschleife beim Stehlen (Stadtwache) lässt sich nicht
  // beenden“): seit die Karten nur noch einreihen, legte JEDER weitere ∞-Klick auf die bereits endlos
  // laufende Aktion still einen zweiten ∞-Eintrag derselben Aktion hinter sie — nach dem Stopp
  // startete der nächste Tick sie sofort neu, für den Spieler unbeendbar. Ein ∞-Klick auf die
  // laufende ∞-Aktion oder auf einen ∞-Eintrag derselben Aktion am Queue-Ende ist deshalb ein
  // No-op (angenommen, nichts eingereiht): ∞ deckt jeden weiteren Wunsch bereits ab. Kein RNG.
  if (normalized === null) {
    if (state.activeActionId === actionId && state.actionTarget === null && state.combat.monsterId === null) return true;
    if (last !== undefined && last.kind === "action" && last.actionId === actionId && last.target === null) return true;
  }
  // Stapeln nur, wenn der unmittelbar letzte Eintrag dieselbe AKTION (kind "action" — ein
  // Kampf-Eintrag stapelt hier nie, sein actionId-Platzhalter matcht ohnehin keine echte Aktion)
  // mit endlichem Ziel ist UND das neue Ziel ebenfalls endlich ist ⇒ addieren (geklemmt).
  if (
    last !== undefined &&
    last.kind === "action" &&
    last.actionId === actionId &&
    last.target !== null &&
    normalized !== null
  ) {
    last.target = Math.min(last.target + normalized, QUEUE_TARGET_CAP);
    return true;
  }
  state.actionQueue.push({ kind: "action", actionId, target: normalized });
  return true;
}

/**
 * Hängt einen KAMPF-Eintrag an die Action-Queue (SAVE_VERSION 73, Task #312): `monsterId` +
 * Kill-Ziel `target` (1/25/50/… bzw. `null` = ∞ — läuft bis zum manuellen Stopp). Kettenfähig mit
 * normalen Aktionen; offline wie online identisch abgearbeitet (derselbe Tick-Pfad).
 *
 * ABGELEHNT (return false, „sauber ablehnen" v1): unbekannte Monster und Dungeon-only-Monster
 * (Dungeons sind v1 ausgeschlossen; Elites sind strukturell nicht adressierbar — sie sind
 * Varianten über `startEliteCombat`, keine MonsterIds). Das ZONEN-/Slayer-GATE wird hier BEWUSST
 * NICHT geprüft (Vorplanen erlaubt, Muster enqueueAction ohne Level-Check) — der Gate-Check läuft
 * beim START des Eintrags (advanceActionQueue: canFightMonster; scheitert er, wird der Eintrag mit
 * maschinenlesbarem Grund übersprungen, s. `lastQueueSkip`).
 *
 * STAPEL-REGEL (Spiegel von enqueueAction): ist der unmittelbar letzte Eintrag ein Kampf gegen
 * DASSELBE Monster und sind beide Ziele endlich → addieren (gegen QUEUE_TARGET_CAP geklemmt).
 */
export function enqueueFight(
  state: GameState,
  content: ContentDB,
  monsterId: MonsterId,
  target: number | null = null,
): boolean {
  const monster = content.monsters[monsterId];
  if (!monster) return false;
  if (monster.dungeonOnly) return false; // Dungeons v1 ausgeschlossen (Chef-GO #312)
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  // Manuelles Einreihen = Wiederaufnahme-Signal (s. enqueueAction).
  state.queuePaused = false;
  const normalized = normalizeTarget(target);
  const last = state.actionQueue[state.actionQueue.length - 1];
  if (
    last !== undefined &&
    isFightQueueEntry(last) &&
    last.monsterId === monsterId &&
    last.target !== null &&
    normalized !== null
  ) {
    last.target = Math.min(last.target + normalized, QUEUE_TARGET_CAP);
    return true;
  }
  state.actionQueue.push(makeFightQueueEntry(monsterId, normalized));
  return true;
}

/**
 * Hängt einen DUNGEON-LAUF-Eintrag an die Action-Queue (SAVE_VERSION 83, Chef-Auftrag 26.08.2026
 * „Dungeons queuebar — wie Kämpfe mit 1×/25×/50×/∞"): `dungeonId` + Lauf-Ziel `target` (Anzahl
 * kompletter Läufe bis einschließlich Endboss; `null` = ∞ — läuft bis Tod/manuellem Stopp).
 * Kettenfähig mit Aktionen und Kampf-Einträgen; offline wie online identisch (derselbe Tick-Pfad).
 *
 * ABGELEHNT (return false): unbekannte Dungeons und Dungeons ohne Wellen (`encounters` leer — der
 * Paragonturm, der über startParagonFloor läuft und kein Dungeon-Lauf im Sinne dieser Queue ist).
 * Das GATE (`canEnterDungeon`: Quest + Trägerzone) wird hier BEWUSST NICHT geprüft (Vorplanen
 * erlaubt, Muster enqueueFight) — der Gate-Check läuft beim START des Eintrags (advanceActionQueue;
 * scheitert er, wird der Eintrag mit Grund `dungeon_locked` übersprungen, s. `lastQueueSkip`).
 *
 * STAPEL-REGEL (Spiegel von enqueueFight): ist der unmittelbar letzte Eintrag ein Lauf DESSELBEN
 * Dungeons und sind beide Ziele endlich → addieren (gegen QUEUE_TARGET_CAP geklemmt).
 * Manuelles Einreihen = Wiederaufnahme-Signal (löscht eine Tod-/Patt-Pause, s. enqueueAction).
 */
export function enqueueDungeonRuns(
  state: GameState,
  content: ContentDB,
  dungeonId: string,
  target: number | null = null,
): boolean {
  const dungeon = content.dungeons.find((d) => d.id === dungeonId);
  if (!dungeon || dungeon.encounters.length === 0) return false;
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  state.queuePaused = false;
  const normalized = normalizeTarget(target);
  const last = state.actionQueue[state.actionQueue.length - 1];
  if (
    last !== undefined &&
    isDungeonQueueEntry(last) &&
    last.dungeonId === dungeonId &&
    last.target !== null &&
    normalized !== null
  ) {
    last.target = Math.min(last.target + normalized, QUEUE_TARGET_CAP);
    return true;
  }
  state.actionQueue.push(makeDungeonQueueEntry(dungeonId, normalized));
  return true;
}

/**
 * Stellt den LAUFENDEN Queue-Kampf (`state.queueFight`) mit seinem Rest-Ziel als regulären
 * "fight"-Eintrag zurück an die QUEUE-FRONT und leert die Laufzeit — die eine gemeinsame
 * „nichts wird still übersprungen"-Stelle für alle Unterbrechungen (Tod/Patt in tick.ts,
 * manueller Aktivitäts-Start in setActiveAction, Fremd-Kampf-Erkennung im Tick, sanitizeState-
 * Invariante beim Laden). No-op ohne laufenden Queue-Kampf; ein bereits ERFÜLLTES Rest-Ziel
 * (remaining ≤ 0, defensiv) wird nicht erneut eingereiht. Zieht KEIN RNG.
 */
export function requeueFightFront(state: GameState): void {
  const qf = state.queueFight;
  if (!qf) return;
  state.queueFight = null;
  if (qf.remaining !== null && qf.remaining <= 0) return; // Ziel bereits erfüllt → Eintrag ist fertig
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  state.actionQueue.unshift(makeFightQueueEntry(qf.monsterId, qf.remaining));
}

/**
 * Dungeon-Pendant zu `requeueFightFront` (SAVE 83): stellt den LAUFENDEN Queue-Dungeon-Lauf
 * (`state.queueDungeon`) mit seinen verbleibenden Läufen als "dungeon"-Eintrag zurück an die
 * QUEUE-FRONT und leert die Laufzeit — der gerade laufende (unvollendete) Lauf zählt nicht, er ist
 * im Rest enthalten (`remaining` zählt ihn mit). Aufrufer: Tod/Patt/Fremd-Kampf im Tick, manueller
 * Aktivitäts-Start (setActiveAction/insertQueueEntryAtFront), sanitizeState-Invariante beim Laden.
 * No-op ohne laufenden Lauf; ein erfülltes Rest-Ziel (≤ 0, defensiv) wird nicht erneut eingereiht.
 * Zieht KEIN RNG.
 */
export function requeueDungeonFront(state: GameState): void {
  const run = state.queueDungeon;
  if (!run) return;
  state.queueDungeon = null;
  if (run.remaining !== null && run.remaining <= 0) return;
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  state.actionQueue.unshift(makeDungeonQueueEntry(run.dungeonId, run.remaining));
}

/**
 * Zählt `clears` geschaffte Clears auf den LAUFENDEN Queue-Dungeon-Lauf und entscheidet, wie es
 * weitergeht (SAVE 83; Aufrufer: engine/tick.ts nach combatStep, sobald `dungeonsCleared[id]`
 * gestiegen ist — der Endboss ist gefallen, `endDungeon` hat den Kampf bereits geräumt):
 *  • Ziel erreicht (`remaining` ≤ 0) → Laufzeit leeren; der Eintrag ist fertig, die Queue schaltet
 *    im Tick regulär weiter (Kampf/Aktion/Dungeon — nahtlos wie beim Kill-Ziel eines Kampf-Eintrags).
 *  • sonst (Rest > 0 oder ∞) → SOFORT von vorn (Welle 1) über `startDungeon` — im selben Tick,
 *    der Lauf-Zähler `completed` bleibt erhalten („Lauf n von Ziel"). Beute/XP je Lauf wie bisher
 *    (jeder Lauf ist ein regulärer startDungeon-Lauf: Truhe vor dem Boss, Clear-Belohnung, Erst-
 *    Clear-Bonus nur beim ersten Clear). Scheitert der Neustart (Content-Drift/Gate — im laufenden
 *    Spiel praktisch unmöglich), wandert der Rest an die Queue-Front; der nächste Queue-Start
 *    meldet dann den Grund (`lastQueueSkip`).
 * Deterministisch, kein RNG (startDungeon zieht keinen) → offline == online bit-identisch.
 */
export function onQueuedDungeonCleared(state: GameState, content: ContentDB, clears: number): void {
  const run = state.queueDungeon;
  if (!run || clears <= 0) return;
  run.completed += clears;
  if (run.remaining !== null) {
    run.remaining -= clears;
    if (run.remaining <= 0) {
      state.queueDungeon = null; // Ziel erreicht → Eintrag fertig (Kampf ist bereits beendet)
      return;
    }
  }
  if (!startDungeon(state, content, run.dungeonId)) requeueDungeonFront(state);
}

/** Lesbarer Fortschritt des laufenden Queue-Dungeon-Laufs (s. `dungeonRunProgress`). */
export interface DungeonRunProgress {
  dungeonId: string;
  /** Nummer des AKTUELLEN Laufs (1-basiert: `completed + 1`). */
  run: number;
  /** Gesamt-Ziel dieses Eintrags (`completed + remaining`); `null` = ∞. */
  target: number | null;
  /** In diesem Eintrag bereits geschaffte Clears. */
  completed: number;
  /** Verbleibende Läufe inklusive des aktuellen; `null` = ∞. */
  remaining: number | null;
}

/**
 * Fortschritt des laufenden Queue-Dungeon-Laufs für Kopfleiste und Warteschlange (SAVE 83) —
 * „Lauf {run} von {target}" bzw. „Lauf {run} von ∞". REINE ABLEITUNG aus `state.queueDungeon`
 * (liest nur, kein RNG); `null` = kein Queue-Dungeon-Lauf (auch bei manuell betretenen Dungeons).
 */
export function dungeonRunProgress(state: GameState): DungeonRunProgress | null {
  const run = state.queueDungeon;
  if (!run) return null;
  return {
    dungeonId: run.dungeonId,
    run: run.completed + 1,
    target: run.remaining === null ? null : run.completed + run.remaining,
    completed: run.completed,
    remaining: run.remaining,
  };
}

/**
 * PRIORITY-INSERT-KERN (Task #326, Spieler-Feedback mit Chef-GO): startet den übergebenen
 * Queue-Eintrag SOFORT, ohne die Queue oder die laufende Aktivität zu verlieren. Die EINE
 * gemeinsame Primitive hinter `prioritizeQueueEntry`/`enqueueActionAtFront`/`enqueueFightAtFront`
 * (keine Doppel-Logik) — Spieler-Beispiel: „Shrimp kochen" läuft mit Queue [Eisen, Kupfer],
 * „Waffe schmieden" wird priorisiert ⇒ aktiv: Waffe, Queue: [Shrimp(Rest), Eisen, Kupfer];
 * nach der Waffe läuft die alte Kette automatisch weiter.
 *
 * Ablauf (deterministisch, zieht KEIN RNG — reines Feld-Shuffling + reguläre Start-Pfade):
 *  1. Ein LAUFENDER Queue-Kampf wandert mit Rest-Kill-Ziel zurück an die Queue-Front
 *     (`requeueFightFront`, die #312-Primitive; ∞ bleibt ∞). Ein MANUELLER Kampf
 *     (`queueFight === null`) hat kein Queue-Ziel und wird — wie bei `setActiveAction` —
 *     schlicht ersetzt, sobald der neue Eintrag startet.
 *  2. Eine LAUFENDE Aktion wandert mit Rest-Mengen-Ziel als "action"-Eintrag zurück an die Front:
 *     `actionTarget` zählt pro Abschluss herunter, er IST die Restmenge; `null` = Endlos-Aktion →
 *     Endlos-Eintrag. Teil-Fortschritt (`actionProgressMs`) verfällt bewusst — dieselbe Semantik
 *     wie die Queue-Weiterschaltung („kein Rest-Progress wird übertragen", endActionOrAdvanceQueue
 *     in tick.ts): Offline-Catch-up == Live-Loop bleibt bit-identisch.
 *  3. Der neue Eintrag kommt an die ABSOLUTE Front (Index 0, VOR den zurückgestellten Rest) und
 *     läuft sofort über den regulären Queue-Start an (`advanceActionQueue`) — inklusive
 *     Gate-Check beim Start: ein gesperrter Kampf-Eintrag wird mit `lastQueueSkip`-Grund
 *     übersprungen und der zurückgestellte Rest läuft direkt weiter („nächster läuft").
 *
 * Priorisieren ist eine manuelle Nutzeraktion ⇒ Wiederaufnahme-Signal wie die enqueue*-Familie
 * und setActiveAction (Task #312): eine Tod-/Patt-Pause endet hier. Rückgabe: true, sobald nach der Priorisierung
 * etwas läuft (nicht zwingend der neue Eintrag — s. Gate-Skip oben; `lastQueueSkip` ist dann das
 * UI-Signal). Die Wrapper validieren die Eintrags-Form VOR dem Aufruf (unbekannte Aktion/Monster,
 * dungeonOnly, Level) — Garbage erreicht diese Funktion nicht und unterbricht damit auch nichts.
 */
export function insertQueueEntryAtFront(
  state: GameState,
  content: ContentDB,
  entry: QueuedAction,
): boolean {
  if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
  state.queuePaused = false;
  // (1) laufender Queue-Kampf → mit Rest-Kill-Ziel zurück an die Front (∞ bleibt ∞). Dito ein
  //     laufender Queue-Dungeon-Lauf (SAVE 83): der angefangene Lauf bricht ab, der Rest kehrt zurück.
  requeueFightFront(state);
  requeueDungeonFront(state);
  // (2) laufende Aktion → mit Rest-Mengen-Ziel zurück an die Front. Defensiv-Guards gespiegelt
  // von requeueFightFront: eine unbekannt gewordene Aktion oder ein bereits erfülltes Ziel
  // (target ≤ 0) wird nicht erneut eingereiht — die Laufzeit wird trotzdem geräumt.
  const runningActionId = state.activeActionId;
  if (runningActionId !== null) {
    if (
      content.actions[runningActionId] &&
      (state.actionTarget === null || state.actionTarget > 0)
    ) {
      state.actionQueue.unshift({
        kind: "action",
        actionId: runningActionId,
        target: state.actionTarget,
      });
    }
    state.activeActionId = null;
    state.actionTarget = null;
    state.actionProgressMs = 0;
  }
  // (3) neuen Eintrag ganz nach vorn und sofort regulär anlaufen lassen.
  state.actionQueue.unshift(entry);
  return advanceActionQueue(state, content);
}

/**
 * Startet einen BESTEHENDEN Warteschlangen-Eintrag sofort (Task #326, „Jetzt starten"-Button der
 * UI-Welle #327): der gewählte Eintrag verlässt die Liste und läuft an, die laufende Aktivität
 * wandert mit Rest-Ziel an die Queue-Front, alles andere rückt nach hinten
 * (`insertQueueEntryAtFront`, s. dort). `index` wird an die Queue-Grenzen GEKLEMMT
 * (UI-Robustheit); Nicht-Ganzzahlen und eine leere Queue sind ein No-op (false).
 *
 * No-op „bereits aktiv" (false, nichts wird angefasst): läuft dieselbe Aktivität schon — gleiche
 * `actionId` wie die aktive Aktion bzw. gleiches Monster wie der laufende Queue-Kampf — ist jede
 * Reihenfolge der beiden Ziele spielerisch identisch; ein Neustart würde nur Teil-Fortschritt
 * bzw. Gegner-HP nullen.
 *
 * Start-Checks: ein NICHT startbarer Aktions-Eintrag (Aktion unbekannt geworden / Level fehlt
 * noch / Material fehlt — ein nur über die Projektion gedeckter „werde haben"-Eintrag, 27.08.2026)
 * wird NICHT konsumiert — Sofort-Start braucht Startbarkeit (Muster setActiveAction), der
 * vorgeplante Eintrag bleibt unangetastet stehen (false). Kampf-Einträge laufen dagegen BEWUSST
 * in den Start-Gate-Check (Chef-GO #326): ein gesperrter Kampf wird mit `lastQueueSkip`-Grund
 * konsumiert, der nächste läuft (s. insertQueueEntryAtFront Punkt 3).
 */
export function prioritizeQueueEntry(state: GameState, content: ContentDB, index: number): boolean {
  if (!Array.isArray(state.actionQueue)) {
    state.actionQueue = [];
    return false;
  }
  const q = state.actionQueue;
  if (q.length === 0 || !Number.isInteger(index)) return false;
  const i = Math.min(Math.max(index, 0), q.length - 1); // Grenzen geklemmt
  const entry = q[i];
  if (entry === undefined) return false; // durch die Klemmung unerreichbar (noUncheckedIndexedAccess)
  if (isFightQueueEntry(entry)) {
    if (state.queueFight !== null && state.queueFight.monsterId === entry.monsterId) return false;
  } else if (isDungeonQueueEntry(entry)) {
    // Dungeon-Eintrag (SAVE 83): läuft derselbe Dungeon bereits als Queue-Lauf → No-op (Neustart
    // würde nur den angefangenen Lauf verwerfen); sonst wie Kampf-Einträge bewusst in den
    // Start-Gate-Check (gesperrt ⇒ `lastQueueSkip`, der Rest läuft weiter).
    if (state.queueDungeon !== null && state.queueDungeon.dungeonId === entry.dungeonId) return false;
  } else {
    if (state.activeActionId === entry.actionId) return false;
    const entryAction = content.actions[entry.actionId];
    if (!entryAction || !actionLevelMet(state, content, entry.actionId)) {
      return false;
    }
    // Sofort-Start braucht ECHTEN Bestand (27.08.2026): ein nur über die Warteschlangen-
    // Projektion gedeckter Eintrag („werde haben") bleibt unangetastet stehen — sonst würde er
    // beim Start mit no_materials konsumiert und die laufende Aktion nur Fortschritt verlieren.
    if (!actionInputsOnHand(state, entryAction)) return false;
  }
  q.splice(i, 1);
  return insertQueueEntryAtFront(state, content, entry);
}

/**
 * Sofort-Start-Variante von `enqueueAction` (Task #326, gleiche Signatur): die neue Aktion läuft
 * SOFORT an, die laufende Aktivität wandert mit Rest-Ziel an die Queue-Front
 * (`insertQueueEntryAtFront`, s. dort — auch für Pause-/Rückgabe-Semantik). Zwei Abweichungen vom
 * hinten-Anhängen: (a) KEIN Stapeln (der neue Eintrag läuft ohnehin zuerst), (b) das Skill-LEVEL
 * wird geprüft — Sofort-Start braucht Startbarkeit (Muster setActiveAction). Level fehlt →
 * ablehnen (false), OHNE die laufende Aktivität zu unterbrechen (sonst würde der Klick still
 * verpuffen und nur Fortschritt kosten).
 */
export function enqueueActionAtFront(
  state: GameState,
  content: ContentDB,
  actionId: ActionId,
  target: number | null = null,
): boolean {
  const action = content.actions[actionId];
  if (!action) return false;
  if (!actionLevelMet(state, content, actionId)) return false;
  // Sofort-Start braucht ECHTEN Bestand (27.08.2026) — Vorplanen über die Projektion geht nur
  // hinten anhängen (`enqueueAction`); ohne Material hier ablehnen, nichts wird unterbrochen.
  if (!actionInputsOnHand(state, action)) return false;
  return insertQueueEntryAtFront(state, content, {
    kind: "action",
    actionId,
    target: normalizeTarget(target),
  });
}

/**
 * Sofort-Start-Variante von `enqueueFight` (Task #326, gleiche Signatur): der Kampf läuft SOFORT
 * an, die laufende Aktivität wandert mit Rest-Ziel an die Queue-Front (`insertQueueEntryAtFront`,
 * s. dort). Abgelehnt wie bei `enqueueFight`: unbekannte Monster und Dungeon-only-Monster (false,
 * nichts wird angefasst). Das Zonen-/Slayer-GATE wird hier wie dort NICHT vorab geprüft — beim
 * Sofort-Start greift der Gate-Check von `advanceActionQueue` (gesperrt ⇒ `lastQueueSkip`, der
 * zurückgestellte Rest läuft direkt weiter). KEIN Stapeln (der neue Eintrag läuft zuerst).
 */
export function enqueueFightAtFront(
  state: GameState,
  content: ContentDB,
  monsterId: MonsterId,
  target: number | null = null,
): boolean {
  const monster = content.monsters[monsterId];
  if (!monster) return false;
  if (monster.dungeonOnly) return false; // Dungeons v1 ausgeschlossen (Spiegel enqueueFight)
  return insertQueueEntryAtFront(
    state,
    content,
    makeFightQueueEntry(monsterId, normalizeTarget(target)),
  );
}

/**
 * Sofort-Start-Variante von `enqueueDungeonRuns` (SAVE 83, gleiche Signatur — das „Betreten" der
 * Dungeon-Karte mit 1×/25×/50×/∞): der Dungeon läuft SOFORT an (Welle 1), die laufende Aktivität
 * wandert mit Rest-Ziel an die Queue-Front (`insertQueueEntryAtFront`, s. dort — ein laufender
 * Queue-Kampf/-Dungeon kehrt mit Rest zurück). Abgelehnt wie bei `enqueueDungeonRuns`: unbekannte
 * Dungeons und Dungeons ohne Wellen (false, nichts wird angefasst). Das Gate wird beim Sofort-Start
 * von `advanceActionQueue` geprüft (gesperrt ⇒ `lastQueueSkip` mit `dungeon_locked`, der
 * zurückgestellte Rest läuft direkt weiter). KEIN Stapeln (der neue Eintrag läuft zuerst).
 */
export function enqueueDungeonRunsAtFront(
  state: GameState,
  content: ContentDB,
  dungeonId: string,
  target: number | null = null,
): boolean {
  const dungeon = content.dungeons.find((d) => d.id === dungeonId);
  if (!dungeon || dungeon.encounters.length === 0) return false;
  return insertQueueEntryAtFront(
    state,
    content,
    makeDungeonQueueEntry(dungeonId, normalizeTarget(target)),
  );
}

/**
 * Hebt die Tod-/Patt-Pause der Queue auf (Task #312 — der explizite „Weiter"-Pfad für die
 * UI-Welle) und lässt bei Leerlauf (keine Aktion, kein Kampf) sofort den nächsten Queue-Eintrag
 * anlaufen. true, wenn dabei etwas gestartet ist. Deterministisch, kein RNG.
 */
export function resumeActionQueue(state: GameState, content: ContentDB): boolean {
  state.queuePaused = false;
  if (
    state.activeActionId === null &&
    state.combat.monsterId === null &&
    Array.isArray(state.actionQueue) &&
    state.actionQueue.length > 0
  ) {
    return advanceActionQueue(state, content);
  }
  return false;
}

/** Entfernt den Queue-Eintrag am Index `index` (No-op bei ungültigem Index). */
export function dequeueAction(state: GameState, index: number): void {
  if (!Array.isArray(state.actionQueue)) {
    state.actionQueue = [];
    return;
  }
  if (!Number.isInteger(index) || index < 0 || index >= state.actionQueue.length) return;
  state.actionQueue.splice(index, 1);
}

/** Leert die gesamte Action-Queue (Spieler-Reset). */
export function clearActionQueue(state: GameState): void {
  state.actionQueue = [];
}

/**
 * Verschiebt einen Queue-Eintrag von `from` nach `to` (Reordering, z.B. Drag&Drop in der UI).
 * No-op bei ungültigen Indizes oder `from === to`.
 */
export function moveQueueItem(state: GameState, from: number, to: number): void {
  if (!Array.isArray(state.actionQueue)) {
    state.actionQueue = [];
    return;
  }
  const q = state.actionQueue;
  if (!Number.isInteger(from) || !Number.isInteger(to)) return;
  if (from < 0 || from >= q.length || to < 0 || to >= q.length || from === to) return;
  const item = q.splice(from, 1)[0];
  if (item === undefined) return; // durch die Bounds-Prüfung unerreichbar (noUncheckedIndexedAccess)
  q.splice(to, 0, item);
}

/**
 * Startet den nächsten GÜLTIGEN Queue-Eintrag (SAVE_VERSION 70; Kampf-Einträge seit 73/#312).
 * Poppt vorne Einträge, überspringt ungültige/gesperrte und startet den ersten brauchbaren.
 * Gibt true zurück, sobald etwas angelaufen ist, sonst false (Queue leer/erschöpft — der Aufrufer
 * beendet dann die aktive Aktion regulär).
 *
 *  • kind "action": unbekannte actionId ODER Skill-Level nicht erreicht → still überspringen
 *    (bisheriges Verhalten); Material fehlt (Inventar + Lager, `actionInputsOnHand`) → MIT Grund
 *    `no_materials` + `actionId` überspringen (27.08.2026); Start via `setActiveAction`.
 *  • kind "fight": GATE-CHECK BEIM START (Chef-GO #312) — Monster unbekannt/nicht mehr queue-fähig/
 *    Gate gesperrt (canFightMonster: Story-Zone, Slayer-Anforderung, Turm-Etage) → Eintrag MIT
 *    maschinenlesbarem Grund überspringen (`state.lastQueueSkip`, für die spätere UI), Queue läuft
 *    weiter. Sonst Start via `startCombat` (bestehende Kampf-API; übernimmt u.a. einen laufenden
 *    Kill-Cooldown) und `state.queueFight` = Laufzeit mit Rest-Kill-Ziel.
 *
 * Endlosschutz: höchstens so viele Versuche wie die Queue beim Eintritt lang war (jeder Versuch
 * shiftet einen Eintrag ab, die Schleife terminiert also ohnehin — der Guard ist belt-and-suspenders).
 * Zieht KEIN RNG → determinismus-neutral (Offline-Catch-up == Live-Loop).
 */
export function advanceActionQueue(state: GameState, content: ContentDB): boolean {
  const queue = state.actionQueue;
  if (!Array.isArray(queue) || queue.length === 0) return false;
  const maxIter = queue.length;
  for (let i = 0; i < maxIter && queue.length > 0; i++) {
    const next = queue.shift();
    if (!next) break;
    if (isFightQueueEntry(next)) {
      const monsterId = next.monsterId;
      const monster = content.monsters[monsterId];
      if (!monster) {
        setQueueSkip(state, { monsterId, reason: "unknown_monster" });
        continue;
      }
      if (monster.dungeonOnly) {
        // Enqueue lehnt dungeonOnly bereits ab — fängt Content-Drift (Monster wurde NACH dem
        // Einreihen zum Dungeon-only-Monster) und Alt-Saves ab.
        setQueueSkip(state, { monsterId, reason: "not_queueable" });
        continue;
      }
      if (!canFightMonster(state, content, monsterId)) {
        setQueueSkip(state, { monsterId, reason: "gate_locked" });
        continue;
      }
      if (!startCombat(state, content, monsterId)) {
        // Belt-and-suspenders: startCombat prüft dieselben Gates — sollte er trotzdem ablehnen,
        // den Eintrag als gesperrt ausweisen statt still zu verschlucken.
        setQueueSkip(state, { monsterId, reason: "gate_locked" });
        continue;
      }
      // Invariante `activeActionId === null ⇒ actionTarget === null`: startCombat räumt
      // actionId/progress, das evtl. offene Mengen-Ziel der VORHERIGEN Aktion hier mit.
      state.actionTarget = null;
      state.queueFight = { monsterId, remaining: next.target ?? null };
      return true;
    }
    if (isDungeonQueueEntry(next)) {
      // kind "dungeon" (SAVE 83): GATE-CHECK BEIM START (Spiegel des Kampf-Eintrags) — Dungeon
      // unbekannt/ohne Wellen bzw. Gate (Quest/Trägerzone) gesperrt → mit Grund überspringen,
      // Queue läuft weiter. Sonst Start via `startDungeon` (bestehende Dungeon-API; übernimmt einen
      // laufenden Kill-Cooldown) und `state.queueDungeon` = Laufzeit mit Rest-Lauf-Ziel.
      const dungeonId = next.dungeonId;
      const dungeon = content.dungeons.find((d) => d.id === dungeonId);
      if (!dungeon || dungeon.encounters.length === 0) {
        setQueueSkip(state, { monsterId: FIGHT_QUEUE_ACTION_ID, dungeonId, reason: "unknown_dungeon" });
        continue;
      }
      if (!canEnterDungeon(state, content, dungeonId) || !startDungeon(state, content, dungeonId)) {
        setQueueSkip(state, { monsterId: FIGHT_QUEUE_ACTION_ID, dungeonId, reason: "dungeon_locked" });
        continue;
      }
      state.actionTarget = null; // Invariante wie beim Kampf-Eintrag (startDungeon räumt sie ebenfalls)
      state.queueDungeon = { dungeonId, remaining: next.target ?? null, completed: 0 };
      return true;
    }
    const nextAction = content.actions[next.actionId];
    if (!nextAction) continue; // unbekannte Aktion → überspringen
    if (!actionLevelMet(state, content, next.actionId)) continue; // Level/gesperrt → überspringen
    // MATERIAL-CHECK BEIM START (Chef-Auftrag 27.08.2026, Warteschlangen-Projektion): ein Eintrag
    // darf vorgeplant werden, obwohl sein Material erst ein früheres Ketten-Glied liefert
    // („Kupferader ×650, dann Kupfer schmelzen ×650"). Fehlt es beim tatsächlichen Anlauf trotzdem
    // (Produzent entfernt/umsortiert, Material verkauft) → NICHT still starten-und-sofort-enden
    // (so lief es vorher: der nächste Tick beendete die Aktion mit no_materials, und weil die
    // Queue weiterschaltete, blieb KEIN Hinweis zurück), sondern wie Kampf-/Dungeon-Gates mit
    // maschinenlesbarem Grund überspringen; die Kette läuft weiter. Zieht kein RNG.
    if (!actionInputsOnHand(state, nextAction)) {
      setQueueSkip(state, { monsterId: FIGHT_QUEUE_ACTION_ID, actionId: next.actionId, reason: "no_materials" });
      continue;
    }
    setActiveAction(state, content, next.actionId, next.target ?? null);
    return true; // vorvalidiert ⇒ setActiveAction ist garantiert angelaufen
  }
  return false;
}

/**
 * Grund, warum eine NICHT-leere Warteschlange gerade nicht vorrückt (Task #369). Rein abgeleitet,
 * nichts davon wird gespeichert — kein neues `GameState`-Feld, kein SAVE-Bump.
 *
 *  • `paused`                 — Tod/Patt hat die Queue pausiert (#312). Hat Vorrang; die UI hat
 *                               dafür bereits ihren eigenen Block mit „Fortsetzen"-Knopf.
 *  • `endless_action`         — es läuft eine Aktion OHNE Mengen-Ziel, die sich auch nicht selbst
 *                               beendet (Sammel-Aktion ohne `inputs`): sie läuft, bis der Spieler
 *                               sie stoppt — die Queue kommt von allein NIE dran.
 *  • `action_until_materials` — es läuft eine Aktion ohne Mengen-Ziel, die aber Material
 *                               VERBRAUCHT (`inputs`): sie endet, wenn der Vorrat leer ist, und
 *                               die Queue läuft dann weiter. Eigener Grund, damit die UI nicht
 *                               fälschlich „für immer" behauptet.
 *  • `endless_fight`          — es läuft ein Kampf ohne Kill-Ziel (∞-Queue-Kampf ODER ein manuell
 *                               gestarteter Kampf): läuft bis zum manuellen Stopp bzw. bis zur
 *                               Niederlage.
 */
export type QueueBlockReason =
  | "paused"
  | "endless_action"
  | "action_until_materials"
  | "endless_fight";

/**
 * TASK #369 („die stille Endlos-Sperre", Bot-Sweep 0.3.0): warum steht die Warteschlange?
 *
 * REINE ABLEITUNG aus dem aktuellen Zustand — liest nur, schreibt nichts, zieht KEIN RNG und
 * kennt keine Zeitquelle. Die ∞-Semantik selbst bleibt damit unangetastet (Chef-Variante A):
 * „unendlich" heißt weiterhin „mach das, bis ich dich stoppe". Was fehlte, war nicht das Warten,
 * sondern die STILLE — diese Funktion ist das maschinenlesbare Signal, mit dem die UI den
 * Zustand benennen kann (Queue-Panel-Hinweis + Toast), statt den Spieler ins Leere laufen zu
 * lassen. Auflösung mit einem Klick über den bestehenden Prioritäts-Pfad
 * (`prioritizeQueueEntry`, #326/#327).
 *
 * `null` = kein Grund zur Sorge: Queue leer, oder die laufende Aktivität endet von selbst
 * (endliches Mengen-/Kill-Ziel), oder gerade läuft nichts (der nächste Tick startet den Eintrag).
 *
 * NICHT gemeldet wird ein laufender DUNGEON-Lauf: eine bewusst betretene, endliche Exkursion, die
 * mit der letzten Welle endet — ein „deine Queue steht"-Alarm wäre dort ein Fehlalarm. Ein
 * Paragonturm-Lauf zählt dagegen mit: er klettert offen weiter, bis der Held fällt oder stoppt.
 */
export function queueBlockReason(state: GameState, content: ContentDB): QueueBlockReason | null {
  if (!Array.isArray(state.actionQueue) || state.actionQueue.length === 0) return null;
  if (state.queuePaused) return "paused";
  if (state.combat.monsterId !== null) {
    if (state.combat.dungeonId !== null) {
      // Manueller Dungeon-Lauf = endliche Exkursion (s. JSDoc). Ein QUEUE-Dungeon-Lauf mit ∞-Ziel
      // (SAVE 83) läuft dagegen bis Tod/Stopp — dieselbe stille Sperre wie ein ∞-Kampf.
      return state.queueDungeon !== null && state.queueDungeon.remaining === null ? "endless_fight" : null;
    }
    // Queue-Kampf mit Rest-Kill-Ziel endet von selbst; ∞ (remaining null) und ein manueller
    // Kampf (queueFight null) laufen bis zum Stopp.
    return state.queueFight?.remaining == null ? "endless_fight" : null;
  }
  const actionId = state.activeActionId;
  if (actionId === null) return null; // Leerlauf → der nächste Tick startet den nächsten Eintrag
  if (state.actionTarget !== null) return null; // endliches Mengen-Ziel → läuft aus
  const action = content.actions[actionId];
  if (!action) return null; // Content-Drift: der Tick beendet die unbekannt gewordene Aktion
  return (action.inputs?.length ?? 0) > 0 ? "action_until_materials" : "endless_action";
}

/**
 * Setzt den Thieving-Risiko-Modus (careful/bold). Reiner Setter analog zu setAutoReplant;
 * die UI ruft ihn auf, der nächste `advance` liest den Wert in der Thieving-Resolution.
 */
export function setThievingRisk(state: GameState, risk: ThievingRisk): void {
  state.thievingRisk = risk;
}
