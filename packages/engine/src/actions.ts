import type { ActionId, ContentDB, GameState, MonsterId, QueuedAction, ThievingRisk } from "@hearthforge/shared";
import { isFightQueueEntry, makeFightQueueEntry } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { startCombat } from "./combat";
import { canFightMonster } from "./slayer";

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
    // Manueller Start = Wiederaufnahme: eine Tod-/Patt-Pause der Queue endet hier (Chef-GO #312
    // „Wiederaufnahme manuell"). Ohne Pause ein No-op.
    state.queuePaused = false;
    // Sammeln und Kampf schließen sich aus.
    state.combat.monsterId = null;
    // Neuer Start → alten Stopp-Hinweis verwerfen.
    state.lastStop = null;
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
 * Material überspringt der Tick (endActionOrAdvanceQueue mit `no_materials`). `target` wird wie bei
 * `setActiveAction` normalisiert.
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
  // (1) laufender Queue-Kampf → mit Rest-Kill-Ziel zurück an die Front (∞ bleibt ∞).
  requeueFightFront(state);
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
 * noch) wird NICHT konsumiert — Sofort-Start braucht Startbarkeit (Muster setActiveAction), der
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
  } else {
    if (state.activeActionId === entry.actionId) return false;
    if (!content.actions[entry.actionId] || !actionLevelMet(state, content, entry.actionId)) {
      return false;
    }
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
  if (!content.actions[actionId]) return false;
  if (!actionLevelMet(state, content, actionId)) return false;
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
 *    (bisheriges Verhalten); Start via `setActiveAction`.
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
        state.lastQueueSkip = { monsterId, reason: "unknown_monster" };
        continue;
      }
      if (monster.dungeonOnly) {
        // Enqueue lehnt dungeonOnly bereits ab — fängt Content-Drift (Monster wurde NACH dem
        // Einreihen zum Dungeon-only-Monster) und Alt-Saves ab.
        state.lastQueueSkip = { monsterId, reason: "not_queueable" };
        continue;
      }
      if (!canFightMonster(state, content, monsterId)) {
        state.lastQueueSkip = { monsterId, reason: "gate_locked" };
        continue;
      }
      if (!startCombat(state, content, monsterId)) {
        // Belt-and-suspenders: startCombat prüft dieselben Gates — sollte er trotzdem ablehnen,
        // den Eintrag als gesperrt ausweisen statt still zu verschlucken.
        state.lastQueueSkip = { monsterId, reason: "gate_locked" };
        continue;
      }
      // Invariante `activeActionId === null ⇒ actionTarget === null`: startCombat räumt
      // actionId/progress, das evtl. offene Mengen-Ziel der VORHERIGEN Aktion hier mit.
      state.actionTarget = null;
      state.queueFight = { monsterId, remaining: next.target ?? null };
      return true;
    }
    if (!content.actions[next.actionId]) continue; // unbekannte Aktion → überspringen
    if (!actionLevelMet(state, content, next.actionId)) continue; // Level/gesperrt → überspringen
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
    if (state.combat.dungeonId !== null) return null; // endliche Exkursion, s. JSDoc
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
