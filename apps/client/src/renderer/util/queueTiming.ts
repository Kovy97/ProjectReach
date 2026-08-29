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

/** Kontext des virtuellen Material-Pools über die GESAMTE Warteschlange hinweg (Reihenfolge:
 *  `active` zuerst, dann `state.actionQueue` von vorn nach hinten) — s. `computeQueueTiming`. */
interface QueuePoolCtx {
  qty: (itemId: ItemId) => number;
  deduct: (itemId: ItemId, qty: number) => void;
  /** Trägt die erwartete Ausbeute EINES Sammel-Eintrags (chance × Ø-Menge × Zyklen, s.
   *  `actionEntryTiming`) in den Pool ein und merkt sich `itemId` als „(teilweise) geschätzt" —
   *  jeder Verarbeitungs-Eintrag, der davon zehrt, wird dadurch selbst `isEstimate: true`. */
  addExpectedYield: (itemId: ItemId, qty: number) => void;
  isEstimatedSource: (itemId: ItemId) => boolean;
  /** true = `itemId` hat einen ∞-Sammel-Vorgänger (Ziel "Alle") in DERSELBEN Warteschlange —
   *  dessen künftige Ausbeute ist der Definition nach unbeziffbar (s. `markUnbounded`). */
  isUnbounded: (itemId: ItemId) => boolean;
  markUnbounded: (itemId: ItemId) => void;
}

function actionEntryTiming(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  target: number | null,
  progressMs: number,
  nowMs: number | undefined,
  pool: QueuePoolCtx,
): QueueTimingEntry {
  const dur = effectiveActionDurationMs(state, content, action, nowMs);
  const inputs = action.inputs ?? [];
  const base = { requestedTarget: target };

  if (inputs.length === 0) {
    // Sammeln: nie material-limitiert. Ziel "Alle" (target null) läuft ECHT unbegrenzt weiter —
    // und macht seine Beute für JEDEN nachgelagerten Verarbeitungs-Eintrag in dieser Warteschlange
    // unbeziffbar (unbegrenzt viel kommt irgendwann nach, aber "irgendwann wie viel" ist keine
    // ehrliche Zahl) — `markUnbounded` merkt das für `isUnbounded` unten vor (Chef-Vorgabe Punkt 3).
    if (target === null) {
      for (const drop of action.loot) pool.markUnbounded(drop.itemId);
      return { ...base, infinite: true, unknown: false, isEstimate: false, materialLimited: false, reachableCount: null };
    }
    // Erwartete Ausbeute (chance × Ø-Menge × Zyklen) fließt in den virtuellen Pool ein, damit ein
    // NACHGELAGERTER Verarbeitungs-Eintrag derselben Warteschlange sie sieht — löst die frühere
    // "BEWUSSTE VEREINFACHUNG" auf (s. `computeQueueTiming`-JSDoc): "500× Kupfer sammeln, dann
    // Kupfer schmelzen" zeigt jetzt eine ehrliche (als Näherung markierte) Zeit statt 0. Bewusst
    // OHNE Meisterschaft-/Begleiter-/Tonika-Boni (echte Loot-Struktur aus dem Content, sonst nichts)
    // — lieber leicht unterschätzen als eine zu optimistische Zahl versprechen (Chef-Vorgabe).
    for (const drop of action.loot) {
      const expected = drop.chance * ((drop.min + drop.max) / 2) * target;
      pool.addExpectedYield(drop.itemId, expected);
    }
    return {
      ...base,
      infinite: false,
      unknown: false,
      isEstimate: false,
      materialLimited: false,
      reachableCount: null,
      remainingMs: remainingMsForCycles(target, dur, progressMs),
    };
  }

  // Verarbeitung: Material-Deckel über den GEMEINSAMEN Pool (Inventar+Lager+erwartete Ausbeute
  // früherer Sammel-Einträge, abzüglich dessen, was frühere Warteschlangen-Einträge mit denselben
  // Zutaten schon verplant haben — s. `computeQueueTiming`-JSDoc). Ziel "Alle" ist bei Verarbeitung
  // NIE echt unendlich (es gibt immer eine begrenzte Materialmenge) — anders als beim Sammeln oben.
  let maxFromPool = Infinity;
  let reliesOnEstimate = false;
  let reliesOnUnbounded = false;
  for (const input of inputs) {
    if (pool.isEstimatedSource(input.itemId)) reliesOnEstimate = true;
    const possible = input.qty > 0 ? Math.floor(pool.qty(input.itemId) / input.qty) : Infinity;
    if (target !== null && possible < target && pool.isUnbounded(input.itemId)) {
      // Diese Zutat hat einen ∞-Sammel-Vorgänger (Ziel "Alle") — dessen künftige Ausbeute ist nicht
      // bezifferbar. Als Kappung werten würde "reicht für 0 von 500 · 0:00" vorgaukeln, wo in
      // Wahrheit unbegrenzt viel nachkommen könnte — also NICHT in `maxFromPool` einrechnen,
      // sondern den ganzen Eintrag `unknown` machen (s.u.), ehrlicher als eine falsche Zahl.
      reliesOnUnbounded = true;
      continue;
    }
    maxFromPool = Math.min(maxFromPool, possible);
  }
  if (reliesOnUnbounded) {
    return { ...base, infinite: false, unknown: true, isEstimate: false, materialLimited: false, reachableCount: null };
  }
  const cycles = target === null ? maxFromPool : Math.min(target, maxFromPool);
  for (const input of inputs) pool.deduct(input.itemId, cycles * input.qty);
  const materialLimited = target !== null && maxFromPool < target;

  return {
    ...base,
    infinite: false,
    unknown: false,
    isEstimate: reliesOnEstimate,
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
 * SEIT 1.0.1 (Chef-Auftrag, Steam/Forum-Meldung "Copper vein zeigt an, Smelt copper hat keine
 * Zeit"): der Pool wird auch durch die ERWARTETE Ausbeute FRÜHERER Sammel-Einträge derselben
 * Warteschlange aufgefüllt (z.B. "500× Kupfer sammeln" gefolgt von "500× Kupfer schmelzen") — je
 * Beute-Eintrag chance × Ø-Menge × Zyklen, aus der echten Loot-Struktur der Aktion, OHNE
 * Meisterschaft-/Begleiter-/Tonika-Boni (lieber leicht unterschätzt als zu optimistisch). Ein
 * Verarbeitungs-Eintrag, der (auch nur teilweise) aus so einer Schätzung zehrt, wird selbst
 * `isEstimate: true` (ActionQueuePanel.tsx zeigt dafür ein vorangestelltes "~" + Tooltip-Hinweis,
 * gleiches Muster wie die Kampf-DPS-Schätzung). Zwei EINSCHRÄNKUNGEN bleiben bewusst bestehen:
 * (1) das gilt NUR für Sammel→Verarbeitung-Ketten (`inputs.length === 0` als Quelle) — die Ausbeute
 * EINES Verarbeitungs-Eintrags speist NICHT den Pool für einen SPÄTEREN Verarbeitungs-Eintrag
 * (Aufgaben-Vorgabe beschränkt sich explizit auf Sammel-Vorgänger); (2) ein Sammel-Eintrag mit Ziel
 * "Alle" (∞, `target === null`) liefert der Definition nach eine unbezifferbare Menge — er trägt
 * weiterhin NICHTS in den Pool ein, aber ein nachgelagerter Verarbeitungs-Eintrag, dessen Material
 * DADURCH knapp würde, zeigt statt einer falschen "reicht für 0 von 500 · 0:00" ehrlich `unknown`
 * ("?", s. `actionEntryTiming`) — ehrlicher als eine erfundene Zahl, s. Aufgaben-Vorgabe „nicht
 * ehrlich berechenbar → Dauer bis zum Materialende zeigen".
 *
 * `nowMs` (optional, wie `effectiveActionDurationMs`): reales Kalender-„jetzt" für die
 * Segens-Multiplikatoren (Blessings of the Reach) — ohne sie neutral (Faktor 1), was die
 * bestehenden Test-/Sim-Aufrufer matcht. Der Aufrufer (ActionQueuePanel.tsx) übergibt `Date.now()`,
 * damit die Anzeige denselben Tempo-Bonus sieht, den der laufende Game-Loop gerade anwendet — EIN
 * Segenswert für die GESAMTE Schätzung (keine Simulation eines Segenswechsels um Mitternacht mitten
 * in einer mehrstündigen Warteschlange, s. Aufgaben-Vorgabe „keine erfundene Präzision").
 */
export function computeQueueTiming(state: GameState, content: ContentDB, nowMs?: number): QueueTiming {
  const poolMap = new Map<ItemId, number>();
  const estimatedItems = new Set<ItemId>();
  const unboundedItems = new Set<ItemId>();
  const qty = (itemId: ItemId): number => {
    let v = poolMap.get(itemId);
    if (v === undefined) {
      v = itemCount(state.inventory, itemId) + bankCount(state, itemId);
      poolMap.set(itemId, v);
    }
    return v;
  };
  const pool: QueuePoolCtx = {
    qty,
    deduct: (itemId, amount) => poolMap.set(itemId, Math.max(0, qty(itemId) - amount)),
    addExpectedYield: (itemId, amount) => {
      if (amount <= 0) return;
      poolMap.set(itemId, qty(itemId) + amount);
      estimatedItems.add(itemId);
    },
    isEstimatedSource: (itemId) => estimatedItems.has(itemId),
    isUnbounded: (itemId) => unboundedItems.has(itemId),
    markUnbounded: (itemId) => unboundedItems.add(itemId),
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
      ? actionEntryTiming(state, content, action, state.actionTarget, state.actionProgressMs, nowMs, pool)
      : null; // Content-Drift: skillingStep beendet sie im nächsten Tick, sie läuft real keine Zeit mehr.
  }

  // 2) Warteschlange in roher Reihenfolge, 1:1 zu `state.actionQueue` — die 4er-Grid-Faltung in
  // ActionQueuePanel.tsx ist reine ANZEIGE-Zusammenfassung, hier bleibt jeder Rohe-Index erhalten.
  const queue: QueueTimingEntry[] = state.actionQueue.map((raw) => {
    if (isFightQueueEntry(raw)) return fightEntryTiming(state, content, raw.monsterId, raw.target);
    if (isDungeonQueueEntry(raw)) return dungeonEntryTiming(state, content, raw.dungeonId ?? "", raw.target);
    const action = content.actions[raw.actionId];
    if (!action) return unknownEntryTiming(raw.target);
    return actionEntryTiming(state, content, action, raw.target, 0, nowMs, pool);
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
