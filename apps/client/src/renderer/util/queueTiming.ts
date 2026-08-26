// Warteschlangen-Dauer-Berechnung (1.0.1, Steam-Forum-Wunsch: Rose Noel Thorne fragte nach einem
// Timer für die Gesamt-Warteschlange (Übernacht-Planung), Lobster Jason beschrieb, wie Spieler die
// Dauer bisher von Hand ausrechnen — "napkin math it out"). Reine, NICHT mutierende Berechnung:
// liest nur `state`/`content`, verändert nichts. Zieht ausschließlich bereits exportierte
// Engine-/Shared-Formeln (effectiveActionDurationMs, itemCount/bankCount, computeStats/
// contestHitChance, KILL_COOLDOWN_MS) — KEINE Formel-Kopie. Lebt bewusst im Client statt in
// packages/engine: ui-dev fasst packages/** nicht an (Rollen-Grenze), und alles Nötige ist bereits
// öffentlich exportiert — kein neuer Engine-Selektor nötig.
import type { ActionDef, ContentDB, GameState, ItemId, MonsterId } from "@hearthforge/shared";
import { isFightQueueEntry, KILL_COOLDOWN_MS, isDungeonQueueEntry, PRE_BOSS_BREATHER_MS } from "@hearthforge/shared";
import { bankCount, computeStats, contestHitChance, effectiveActionDurationMs, itemCount } from "@hearthforge/engine";

/** Eine Zeile der Warteschlangen-Zeitschätzung. */
export interface QueueTimingEntry {
  /**
   * true = läuft unbegrenzt weiter, bis der Spieler manuell stoppt (∞-Kampf, oder eine
   * Sammel-Aktion — KEINE Verarbeitung, s. JSDoc `computeQueueTiming` — mit Ziel "Alle"). In
   * diesem Fall ist `remainingMs` NICHT gesetzt (keine Zahl, die es ehrlich nicht gibt).
   */
  infinite: boolean;
  /**
   * true = keine ehrliche Schätzung möglich (z.B. Kampf-Eintrag mit 0 Schaden, oder ein Monster/
   * eine Aktion, die es im Content nicht mehr gibt — Content-Drift). `remainingMs` NICHT gesetzt.
   */
  unknown: boolean;
  /** Restdauer in ms. NUR gesetzt, wenn weder `infinite` noch `unknown`. */
  remainingMs?: number;
  /** true = Kampf-Eintrag: grobe DPS-Schätzung (kein Simulationslauf), s. `estimateFightKillMs`. */
  isEstimate: boolean;
  /**
   * true = ein Verarbeitungsschritt hat NICHT genug Material (Inventar+Lager, abzüglich dessen,
   * was frühere Warteschlangen-Einträge bereits beanspruchen) für sein volles Ziel. `remainingMs`
   * deckt dann nur `reachableCount` von `requestedTarget` ab statt des vollen Ziels.
   */
  materialLimited: boolean;
  /** NUR wenn `materialLimited`: wie viele Abschlüsse das aktuell verfügbare Material zulässt. */
  reachableCount: number | null;
  /** Rohes Ziel des Eintrags (`null` = "Alle"/∞). Nur zur Anzeige, z.B. "reicht für 120 von 500". */
  requestedTarget: number | null;
}

export interface QueueTiming {
  /** Timing der AKTUELL laufenden Aktivität — `null` im Leerlauf, ODER wenn `activeActionId`
   *  einen Content-Drift hat (unbekannte Aktion läuft real keine weitere Zeit, s. skillingStep). */
  active: QueueTimingEntry | null;
  /** 1:1 zu `state.actionQueue` — GLEICHER Index, GLEICHE Länge (auch Content-Drift-Einträge
   *  bekommen eine Zeile, `unknown: true`, statt zu fehlen — hält die Indizes stabil für die UI). */
  queue: QueueTimingEntry[];
  /**
   * Summe der endlichen Einträge VOR dem ersten `infinite`-Eintrag (bzw. aller, wenn keiner
   * unendlich läuft — `active` zuerst, dann `queue` in Reihenfolge). `unknown`-Einträge tragen 0
   * bei (die einzelne Zeile bleibt unklar, die übrige Summe bleibt trotzdem brauchbar).
   */
  finiteMs: number;
  /** true = mindestens ein Eintrag läuft unbegrenzt (blockiert danach jeden weiteren Eintrag). */
  hasInfinite: boolean;
  /** Gesamtdauer der GESAMTEN Warteschlange — `null` wenn `hasInfinite` (dann gilt `finiteMs` als Vorlauf). */
  totalMs: number | null;
}

/** Rest-ms für `cycles` volle Durchläufe à `durMs`, wobei der ERSTE Durchlauf schon `progressMs`
 *  Fortschritt hat (aktuell laufender Eintrag) — für wartende Einträge ist `progressMs` immer 0. */
function remainingMsForCycles(cycles: number, durMs: number, progressMs: number): number {
  if (cycles <= 0) return 0;
  const firstCycleRemaining = Math.max(0, durMs - progressMs);
  return firstCycleRemaining + (cycles - 1) * durMs;
}

/**
 * Grobe Kampfdauer-Schätzung EINES Kills (ms) — reine DPS-Prognose aus dem Charakter-Schadensschnitt
 * gegen die Gegner-HP (+ Ward-Kapazität, additiv als effektive Zusatz-HP), KEINE Simulation (spiegelt
 * bewusst dieselbe Ehrlichkeits-Stufe wie `combatPrognosis`, CombatPage.tsx: „grobe DPS-Prognose,
 * keine Simulation"). Ignoriert eingehenden Schaden/Tod komplett — das ist hier kein Fehler, sondern
 * der Punkt: die Warteschlange stoppt beim Tod ohnehin separat (queuePaused), diese Funktion schätzt
 * nur die REINE Kill-Zeit + den Kill-Cooldown-Nachlauf (`KILL_COOLDOWN_MS`) zwischen zwei Kills.
 * `null` = keine ehrliche Schätzung möglich (Content-Drift: unbekanntes Monster; oder 0 Schaden/
 * Tempo — Division-durch-0-Schutz statt einer erfundenen Zahl).
 */
export function estimateFightKillMs(state: GameState, content: ContentDB, monsterId: MonsterId): number | null {
  const monster = content.monsters[monsterId];
  if (!monster) return null;
  const stats = computeStats(state, content);
  if (!(stats.attackIntervalMs > 0)) return null;
  const playerHit = contestHitChance(stats.accuracy, monster.evasion * (1 - stats.precision));
  const playerDPS = ((stats.attackDamageMin + stats.attackDamageMax) / 2) * playerHit / (stats.attackIntervalMs / 1000);
  if (!(playerDPS > 0)) return null;
  const effectiveHp = monster.maxHp + (monster.wardCapacity ?? 0);
  return (effectiveHp / playerDPS) * 1000 + KILL_COOLDOWN_MS;
}

function fightEntryTiming(
  state: GameState,
  content: ContentDB,
  monsterId: MonsterId,
  target: number | null,
): QueueTimingEntry {
  const base = { isEstimate: true, materialLimited: false, reachableCount: null, requestedTarget: target };
  if (target === null) {
    return { ...base, infinite: true, unknown: false };
  }
  const perKillMs = estimateFightKillMs(state, content, monsterId);
  if (perKillMs === null) {
    return { ...base, infinite: false, unknown: true };
  }
  return { ...base, infinite: false, unknown: false, remainingMs: Math.round(target * perKillMs) };
}

/** Timing-Zeile für einen Warteschlangen-Eintrag, dessen Content (Aktion/Monster) nicht mehr
 *  existiert (Save-/Content-Drift) — läuft real keine Zeit (die Engine überspringt/beendet ihn
 *  beim Anlaufen), aber die Zeile bleibt für die Index-Parität zu `state.actionQueue` bestehen. */
/**
 * Dungeon-Laeufe (SAVE 83, Chef 26.08.2026): ein Lauf = Summe der Kill-Schaetzungen aller Begegnungen
 * (jede inkl. Kill-Cooldown wie beim Kampf) plus die Atempause vor dem Endboss. Ziel null = unendlich.
 * Unbekannter Dungeon oder eine Begegnung ohne Schaetzung → unknown (das fruehere "?").
 */
function dungeonEntryTiming(
  state: GameState,
  content: ContentDB,
  dungeonId: string,
  target: number | null,
): QueueTimingEntry {
  const base = { isEstimate: true, materialLimited: false, reachableCount: null, requestedTarget: target };
  if (target === null) return { ...base, infinite: true, unknown: false };
  const dungeon = content.dungeons.find((d) => d.id === dungeonId);
  if (!dungeon || dungeon.encounters.length === 0) return { ...base, infinite: false, unknown: true };
  let perRunMs = PRE_BOSS_BREATHER_MS;
  for (const monsterId of dungeon.encounters) {
    const ms = estimateFightKillMs(state, content, monsterId);
    if (ms === null) return { ...base, infinite: false, unknown: true };
    perRunMs += ms;
  }
  return { ...base, infinite: false, unknown: false, remainingMs: Math.round(target * perRunMs) };
}

function unknownEntryTiming(target: number | null): QueueTimingEntry {
  return { infinite: false, unknown: true, isEstimate: false, materialLimited: false, reachableCount: null, requestedTarget: target };
}

function actionEntryTiming(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  target: number | null,
  progressMs: number,
  nowMs: number | undefined,
  poolQty: (itemId: ItemId) => number,
  deduct: (itemId: ItemId, qty: number) => void,
): QueueTimingEntry {
  const dur = effectiveActionDurationMs(state, content, action, nowMs);
  const inputs = action.inputs ?? [];
  const base = { isEstimate: false, requestedTarget: target };

  if (inputs.length === 0) {
    // Sammeln: nie material-limitiert. Ziel "Alle" (target null) läuft ECHT unbegrenzt weiter.
    if (target === null) {
      return { ...base, infinite: true, unknown: false, materialLimited: false, reachableCount: null };
    }
    return {
      ...base,
      infinite: false,
      unknown: false,
      materialLimited: false,
      reachableCount: null,
      remainingMs: remainingMsForCycles(target, dur, progressMs),
    };
  }

  // Verarbeitung: Material-Deckel über den GEMEINSAMEN Pool (Inventar+Lager, abzüglich dessen,
  // was frühere Warteschlangen-Einträge mit denselben Zutaten schon verplant haben — s.
  // `computeQueueTiming`-JSDoc). Ziel "Alle" ist bei Verarbeitung NIE echt unendlich (es gibt
  // immer eine begrenzte Materialmenge) — anders als beim Sammeln oben.
  let maxFromPool = Infinity;
  for (const input of inputs) {
    const possible = input.qty > 0 ? Math.floor(poolQty(input.itemId) / input.qty) : Infinity;
    maxFromPool = Math.min(maxFromPool, possible);
  }
  const cycles = target === null ? maxFromPool : Math.min(target, maxFromPool);
  for (const input of inputs) deduct(input.itemId, cycles * input.qty);
  const materialLimited = target !== null && maxFromPool < target;

  return {
    ...base,
    infinite: false,
    unknown: false,
    materialLimited,
    reachableCount: materialLimited ? cycles : null,
    remainingMs: remainingMsForCycles(cycles, dur, progressMs),
  };
}

/**
 * Zeitschätzung der GESAMTEN Warteschlange (die aktuell laufende Aktivität eingeschlossen) für die
 * Anzeige (ActionQueuePanel.tsx). Läuft die Einträge in der REALEN Abarbeitungs-Reihenfolge durch
 * (aktive Aktivität zuerst, danach `state.actionQueue` von vorn nach hinten — genau die Reihenfolge,
 * in der die Engine sie startet, s. `advanceActionQueue`) und führt dabei einen VIRTUELLEN
 * Material-Pool (Inventar+Lager-Bestand JETZT) mit, den jeder Verarbeitungs-Eintrag um seinen
 * tatsächlichen Verbrauch schmälert — zwei Schmiede-Einträge, die um denselben Erzstapel
 * konkurrieren, zeigen so NICHT beide fälschlich den vollen Bestand als "verfügbar".
 *
 * BEWUSSTE VEREINFACHUNG (bereits in der Aufgabenstellung als Grenze benannt): der Pool wird NIE
 * durch spätere Ausbeute FRÜHERER Sammel-Einträge in derselben Warteschlange aufgefüllt (z.B.
 * "500× Zinn sammeln" gefolgt von "500× Bronze schmelzen") — das würde die (zufällige) Loot-Tabelle
 * vorab simulieren müssen. So eine Kette zeigt den Schmelz-Eintrag also ggf. als material-limitiert,
 * obwohl er nach dem Sammel-Eintrag real genug Material hätte; das behebt sich von selbst, sobald
 * der Sammel-Eintrag läuft und das Inventar füllt (die Anzeige rechnet jeden Tick neu, s.
 * ActionQueuePanel.tsx). Ehrlicher als eine erfundene Zahl, s. Aufgaben-Vorgabe „nicht ehrlich
 * berechenbar → Dauer bis zum Materialende zeigen".
 *
 * `nowMs` (optional, wie `effectiveActionDurationMs`): reales Kalender-„jetzt" für die
 * Segens-Multiplikatoren (Blessings of the Reach) — ohne sie neutral (Faktor 1), was die
 * bestehenden Test-/Sim-Aufrufer matcht. Der Aufrufer (ActionQueuePanel.tsx) übergibt `Date.now()`,
 * damit die Anzeige denselben Tempo-Bonus sieht, den der laufende Game-Loop gerade anwendet — EIN
 * Segenswert für die GESAMTE Schätzung (keine Simulation eines Segenswechsels um Mitternacht mitten
 * in einer mehrstündigen Warteschlange, s. Aufgaben-Vorgabe „keine erfundene Präzision").
 */
export function computeQueueTiming(state: GameState, content: ContentDB, nowMs?: number): QueueTiming {
  const pool = new Map<ItemId, number>();
  const poolQty = (itemId: ItemId): number => {
    let v = pool.get(itemId);
    if (v === undefined) {
      v = itemCount(state.inventory, itemId) + bankCount(state, itemId);
      pool.set(itemId, v);
    }
    return v;
  };
  const deduct = (itemId: ItemId, qty: number): void => {
    pool.set(itemId, Math.max(0, poolQty(itemId) - qty));
  };

  // 1) Aktuell laufende Aktivität — Kampf und Aktion schließen sich gegenseitig aus (GameState-
  // Invariante, s. tick.ts), nie beide gleichzeitig.
  let active: QueueTimingEntry | null = null;
  if (state.queueDungeon) {
    active = dungeonEntryTiming(state, content, state.queueDungeon.dungeonId, state.queueDungeon.remaining);
  } else if (state.queueFight !== null) {
    active = fightEntryTiming(state, content, state.queueFight.monsterId, state.queueFight.remaining);
  } else if (state.activeActionId !== null) {
    const action = content.actions[state.activeActionId];
    active = action
      ? actionEntryTiming(state, content, action, state.actionTarget, state.actionProgressMs, nowMs, poolQty, deduct)
      : null; // Content-Drift: skillingStep beendet sie im nächsten Tick, sie läuft real keine Zeit mehr.
  }

  // 2) Warteschlange in roher Reihenfolge, 1:1 zu `state.actionQueue` — die 4er-Grid-Faltung in
  // ActionQueuePanel.tsx ist reine ANZEIGE-Zusammenfassung, hier bleibt jeder Rohe-Index erhalten.
  const queue: QueueTimingEntry[] = state.actionQueue.map((raw) => {
    if (isFightQueueEntry(raw)) return fightEntryTiming(state, content, raw.monsterId, raw.target);
    if (isDungeonQueueEntry(raw)) return dungeonEntryTiming(state, content, raw.dungeonId ?? "", raw.target);
    const action = content.actions[raw.actionId];
    if (!action) return unknownEntryTiming(raw.target);
    return actionEntryTiming(state, content, action, raw.target, 0, nowMs, poolQty, deduct);
  });

  let finiteMs = 0;
  let hasInfinite = false;
  for (const entry of active ? [active, ...queue] : queue) {
    if (entry.infinite) {
      hasInfinite = true;
      break; // nachfolgende Einträge laufen nie an (die Engine schaltet erst weiter, wenn dieser endet).
    }
    if (!entry.unknown) finiteMs += entry.remainingMs ?? 0;
  }

  return { active, queue, finiteMs, hasInfinite, totalMs: hasInfinite ? null : finiteMs };
}
