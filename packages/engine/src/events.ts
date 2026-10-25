import type {
  ActionDef,
  ActiveSkillEvent,
  ContentDB,
  GameState,
  ItemId,
  RngState,
  SkillEventId,
  SkillEventPool,
  SkillEventState,
  SkillId,
  WorkOrderTier,
} from "@hearthforge/shared";
import {
  defaultSkillEventState,
  ESTATE_EVENT_CHANCE,
  EVENT_COOLDOWN_MS,
  EVENT_CRAFT_SKILLS,
  EVENT_EXPIRE_MS,
  EVENT_HAZARD_MS,
  EVENT_LOG_MAX,
  EVENT_MAX_CHANCE,
  EVENT_WEIGHTS,
  FISH_SHOAL_MS,
  GUARD_CHANGE_MS,
  INSPIRATION_CRAFTS,
  MASTERPIECE_ROLL_FLOOR,
  RICH_VEIN_ACTIONS,
  STORM_FELL_MIN_QTY,
  STORM_FELL_SECONDS,
  THRIFTY_HAND_CRAFTS,
  THRIFTY_HAND_MAX_MS,
  WILD_GARDEN_ACTIONS,
} from "@hearthforge/shared";
import { createRng, nextFloat } from "./rng";
import { levelFromXp } from "./leveling";
import { grantLoot } from "./mail";
import { onWorkOrderActionCompleted } from "./orders"; // claude:2026-10-25T17:05:00+01:00 — gestufte Aufträge mit eigenen Uhren (1.4.1)

/**
 * claude:2026-10-24T22:50:00+02:00 — Zufallsereignisse (1.4.0 „Feder und Stahl“ Welle 3 EV, Chef 23.10.2026;
 * Zahlen design/1.4.0-balance-werkstatt.md §3).
 *
 * - Nur online (Chef). tick.ts ruft `onSkillActionCompleted` nur im Live-Loop; die Uhr (`tickSkillEvents`) läuft nur
 *   online. Wirkungen gelten nur online (`liveEvent`), damit ein Offline-Fenster ein Ereignis weder verbraucht
 *   noch ausnutzt.
 * - Eigener Zufallsstrom `state.eventRng`: Auslöse- und Auswahlwürfe ziehen nie `state.rng`. Ohne aktives
 *   Ereignis bleibt jede `state.rng`-Folge bitgleich.
 * - Höchstens ein Wirk-Ereignis gleichzeitig. Kundschaft (Auftragsangebot) ist kein Wirk-Ereignis.
 * - claude:2026-10-25T17:05:00+01:00 — seit 1.4.1 ist Kundschaft kein Ereignis-Wurf mehr: die Auftragsstufen haben eigene Uhren
 *   (orders.ts `onWorkOrderActionCompleted`), unabhängig von Abklingzeit und laufendem Wirk-Ereignis. Ein neues Angebot schreibt
 *   weiter einen „customer“-Eintrag ins Logbuch (Ereigniskarte und Logbuch bleiben gleich), jetzt mit Stufe.
 */

const EVENT_RNG_SEED_MIX = 0x3c6ef372;

/** Seed des Ereignis-Stroms aus dem Haupt-Seed (Muster deriveEliteRngSeed). */
export function deriveEventRngSeed(mainSeed: number): number {
  return (mainSeed ^ EVENT_RNG_SEED_MIX) >>> 0;
}

export function skillEventsOf(state: GameState): SkillEventState {
  return (state.skillEvents ??= defaultSkillEventState());
}

export function eventRngOf(state: GameState): RngState {
  return (state.eventRng ??= createRng(deriveEventRngSeed(Math.floor(state.character?.createdAt ?? 0))));
}

/** Ereignis-Topf einer Aktion (null = Skill ohne Ereignisse, z. B. Kampf oder Ländereien). */
export function eventPoolFor(content: ContentDB, action: ActionDef): SkillEventPool | null {
  switch (action.skill) {
    case "mining":
    case "woodcutting":
    case "fishing":
    case "foraging":
    case "thieving":
      return action.skill;
  }
  if (!EVENT_CRAFT_SKILLS.has(action.skill)) return null;
  const main = action.loot[0]?.itemId;
  return main && content.items[main]?.type === "equipment" ? "craftGear" : "craftOther";
}

/** Das laufende Ereignis, wenn es zu dieser Aktion passt (gleicher Skill, ggf. gleiche ID). */
export function activeEventFor(state: GameState, action: ActionDef, id?: SkillEventId): ActiveSkillEvent | null {
  const a = state.skillEvents?.active;
  if (!a || a.skill !== action.skill) return null;
  if (id && a.id !== id) return null;
  return a;
}

/** Zähl-Ereignis um eins verbrauchen; bei 0 endet es. */
export function spendEventAction(state: GameState): void {
  const ev = state.skillEvents;
  if (!ev?.active) return;
  ev.active.actionsLeft -= 1;
  if (ev.active.actionsLeft <= 0) ev.active = null;
}

function pushLog(state: GameState, id: SkillEventId, skill: SkillId, extra?: { itemId?: ItemId; qty?: number; orderTier?: WorkOrderTier }): void {
  const ev = skillEventsOf(state);
  ev.seq += 1;
  ev.log.unshift({ seq: ev.seq, id, skill, atMs: state.elapsedMs, ...(extra ?? {}) });
  if (ev.log.length > EVENT_LOG_MAX) ev.log.length = EVENT_LOG_MAX;
}

/** Online-Uhr je Tick: Restzeit des laufenden Ereignisses (Zeit- und Verfallsuhr). */
export function tickSkillEvents(state: GameState, dtMs: number): void {
  const ev = state.skillEvents;
  if (!ev?.active) return;
  ev.active.msLeft -= dtMs;
  if (ev.active.msLeft <= 0) ev.active = null;
}

/**
 * Sturmbruch: Bündel der nächsthöheren Holzart (Fäll-Aktionen nach `levelRequired`). An der Spitze dieselbe Art.
 * Bei Aktionen mit Zutaten gilt das beste fällbare Holz als „aktuell“.
 */
export function stormFellBundle(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  effDurMs: number,
): { itemId: ItemId; qty: number } | null {
  const fells = Object.values(content.actions)
    .filter((a) => a.skill === "woodcutting" && !(a.inputs && a.inputs.length > 0) && a.loot[0] && content.items[a.loot[0].itemId])
    .sort((x, y) => (x.levelRequired ?? 1) - (y.levelRequired ?? 1) || x.id.localeCompare(y.id));
  if (fells.length === 0) return null;
  let cur: ActionDef | undefined = action.inputs && action.inputs.length > 0 ? undefined : fells.find((a) => a.id === action.id);
  if (!cur) {
    const lvl = levelFromXp(state.skills.woodcutting?.xp ?? 0);
    cur = [...fells].reverse().find((a) => (a.levelRequired ?? 1) <= lvl) ?? fells[0]!;
  }
  const idx = fells.indexOf(cur);
  const next = fells.slice(idx + 1).find((a) => (a.levelRequired ?? 1) > (cur!.levelRequired ?? 1)) ?? cur;
  const curItem = content.items[cur.loot[0]!.itemId]!;
  const nextItem = content.items[next.loot[0]!.itemId]!;
  const dur = effDurMs > 0 ? effDurMs : cur.durationMs;
  const ratio = (curItem.value ?? 1) / Math.max(1, nextItem.value ?? 1);
  const qty = Math.max(STORM_FELL_MIN_QTY, Math.round(((STORM_FELL_SECONDS * 1000) / dur) * ratio));
  return { itemId: nextItem.id, qty };
}

function pickEvent(weights: Partial<Record<SkillEventId, number>>, r: number): SkillEventId | null {
  const entries = (Object.entries(weights) as [SkillEventId, number][]).filter(([, w]) => w > 0);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  if (total <= 0) return null;
  let acc = 0;
  const x = r * total;
  for (const [id, w] of entries) {
    acc += w;
    if (x < acc) return id;
  }
  return entries[entries.length - 1]![0];
}

/**
 * Nach einer ONLINE abgeschlossenen Skilling-Aktion (Diebeskunst auch nach Fehlschlag): Auftrags-Uhren und Abklingzeit zählen,
 * dann ggf. würfeln und auslösen. `effDurMs` = effektive Dauer dieser Aktion. Gibt das ausgelöste Wirk-Ereignis zurück,
 * sonst „customer“, wenn nur ein Auftragsangebot entstand (claude:2026-10-25T17:05:00+01:00).
 */
export function onSkillActionCompleted(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  effDurMs: number,
  durOf: (a: ActionDef) => number = (a) => a.durationMs,
): SkillEventId | null {
  const pool = eventPoolFor(content, action);
  if (!pool) return null;
  const ev = skillEventsOf(state);
  // claude:2026-10-25T17:05:00+01:00 — zuerst die Auftrags-Uhren (1.4.1, eigene Stufen-Uhren statt 10 % Kundschaft im Topf). Sie zählen auch,
  // wenn die Ereignis-Abklingzeit läuft oder ein Wirk-Ereignis aktiv ist. Würfe aus `eventRng`, nie `state.rng`.
  const offer = onWorkOrderActionCompleted(state, content, action, effDurMs, eventRngOf(state), durOf);
  if (offer) pushLog(state, "customer", action.skill, { itemId: offer.itemId, qty: offer.count, orderTier: offer.tier });
  const quiet: SkillEventId | null = offer ? "customer" : null;
  ev.cooldownMs = Math.max(0, ev.cooldownMs - Math.max(0, effDurMs));
  if (ev.cooldownMs > 0 || ev.active) return quiet;
  const rng = eventRngOf(state);
  const p = Math.min(EVENT_MAX_CHANCE, Math.max(0, effDurMs) / EVENT_HAZARD_MS);
  if (!(nextFloat(rng) < p)) return quiet;

  // claude:2026-10-25T17:05:00+01:00 — der Topf enthält keine Kundschaft mehr (EVENT_WEIGHTS, 1.4.1).
  const id = pickEvent(EVENT_WEIGHTS[pool], nextFloat(rng));
  if (!id) return quiet;
  ev.cooldownMs = EVENT_COOLDOWN_MS;
  triggerEvent(state, content, id, action, effDurMs);
  return id;
}

function triggerEvent(state: GameState, content: ContentDB, id: SkillEventId, action: ActionDef, effDurMs: number): void {
  const ev = skillEventsOf(state);
  const skill = action.skill;
  const set = (actionsLeft: number, msLeft: number): void => {
    ev.active = { id, skill, actionsLeft, msLeft };
  };
  switch (id) {
    case "rich_vein":
      set(RICH_VEIN_ACTIONS, EVENT_EXPIRE_MS);
      break;
    case "wild_garden":
      set(WILD_GARDEN_ACTIONS, EVENT_EXPIRE_MS);
      break;
    case "inspiration":
      set(INSPIRATION_CRAFTS, EVENT_EXPIRE_MS);
      break;
    case "masterpiece":
      set(1, EVENT_EXPIRE_MS);
      break;
    case "thrifty_hand":
      set(THRIFTY_HAND_CRAFTS, Math.min(EVENT_EXPIRE_MS, THRIFTY_HAND_MAX_MS));
      break;
    case "fish_shoal":
      set(0, FISH_SHOAL_MS);
      break;
    case "guard_change":
      set(0, GUARD_CHANGE_MS);
      break;
    case "storm_fell": {
      const bundle = stormFellBundle(state, content, action, effDurMs);
      if (bundle) {
        grantLoot(state, content, bundle.itemId, bundle.qty);
        state.stats.itemsGathered += bundle.qty;
        pushLog(state, id, skill, bundle);
        return;
      }
      break;
    }
    default:
      break;
  }
  pushLog(state, id, skill);
}

/** Meisterstück: Stärke-Wurf ins obere Viertel (roll = floor + (1 − floor) × Wurf). */
export function masterpieceRoll(raw: number): number {
  return MASTERPIECE_ROLL_FLOOR + (1 - MASTERPIECE_ROLL_FLOOR) * raw;
}

/**
 * Ländereien (Prächtige Ernte / Frische Fährte): nur online, 8 % je Ernte bzw. Fang, höchstens eine Vormerkung.
 * Gibt true zurück, wenn diesmal vorgemerkt wurde.
 */
export function rollEstateEvent(state: GameState, kind: "bountiful_harvest" | "fresh_trail"): boolean {
  const ev = skillEventsOf(state);
  const ready = kind === "bountiful_harvest" ? ev.harvestReady : ev.trailReady;
  if (ready) return false;
  if (!(nextFloat(eventRngOf(state)) < ESTATE_EVENT_CHANCE)) return false;
  if (kind === "bountiful_harvest") ev.harvestReady = true;
  else ev.trailReady = true;
  pushLog(state, kind, kind === "bountiful_harvest" ? "farming" : "hunting");
  return true;
}
