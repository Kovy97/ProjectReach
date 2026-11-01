// claude:2026-10-30T19:05:00+01:00 — Tagesaufgaben in die Warteschlange (Spieler-Wunsch 30.10.2026, Chef-GO „Bitte
// implementieren“). Jede offene Tagesaufgabe wird auf genau EINEN vorhandenen Warteschlangen-Eintrag abgebildet
// (Aktion, Kampf oder Dungeon-Läufe) mit der Restmenge als Ziel. Rein lesend bis auf das Einreihen selbst, kein RNG,
// keine neuen State-Felder (kein SAVE-Belang). Gates prüft die Warteschlange wie immer beim Anlauf; hier wird nur
// vorab ausgeschlossen, was heute sicher nicht startet (gesperrte Zone, fehlendes Level), damit der Knopf nichts
// Totes einreiht.
import type { ActionDef, ContentDB, GameState, ItemId, MonsterId, QuestDef, QuestObjective, QueuedAction } from "@hearthforge/shared";
import { isDungeonQueueEntry, isFightQueueEntry, makeDungeonQueueEntry, makeFightQueueEntry } from "@hearthforge/shared";
import { actionLevelMet, enqueueAction, enqueueDungeonRuns, enqueueFight } from "./actions";
import { killCreditMonsterId } from "./combat";
import { canEnterDungeon } from "./dungeon";
import { canClaimQuest, isDailyClaimed, questObjectiveProgress } from "./quests";
import { materialsOnHand } from "./queueProjection";
import { canFightMonster } from "./slayer";

/** Warum eine Tagesaufgabe nicht eingereiht wird. */
export type DailyQueueReason =
  | "claimed" // heute schon eingelöst
  | "done" // Ziel erreicht, wartet aufs Einlösen
  | "already_queued" // derselbe Eintrag läuft schon oder steht in der Warteschlange und deckt den Bedarf ganz (claude:2026-10-31T13:58:31+01:00, D1)
  | "locked" // Zone, Dungeon oder Level noch gesperrt
  | "no_recipe" // kein Rezept, das (mit Material) passt
  | "no_materials" // claude:2026-10-30T19:11:00+01:00 — Material fehlt und lässt sich nicht über Aktionen beschaffen (`missingItemId`)
  | "unsupported"; // Zielart lässt sich nicht einreihen (z. B. Level erreichen)

export interface DailyQueuePlan {
  questId: string;
  /** Eingereiht bzw. einreihbar. */
  ok: boolean;
  reason?: DailyQueueReason;
  /** Der geplante Eintrag (Ziel = `runs`). */
  entry?: QueuedAction;
  /**
   * claude:2026-10-30T19:11:00+01:00 — die ganze Kette in Einreih-Reihenfolge: erst die Zulieferung (Sammeln/Vorverarbeiten
   * für fehlendes Material), zuletzt `entry`. Ohne Zulieferung genau `[entry]`.
   */
  entries?: QueuedAction[];
  /** Nur bei `no_materials`: das erste Material, das sich nicht beschaffen lässt (z. B. Feldfrüchte). */
  missingItemId?: ItemId;
  /** Fehlende Menge der Aufgabe (Kills, Gegenstände, Dungeon-Abschlüsse). */
  remaining: number;
  /** Ziel des Eintrags (Abschlüsse, Kills oder Läufe). Steht schon ein Teil an, nur die nachzureihende Differenz. */
  runs: number;
  /**
   * claude:2026-10-31T13:58:31+01:00 — Befund D1: so viel dieses Eintrags stand vorher schon an (Warteschlange + laufender Rest),
   * nur gesetzt, wenn > 0. Bei `already_queued` deckt es den Bedarf (`Infinity` = ∞-Eintrag).
   */
  queuedBefore?: number;
  /** Nur Herstellen: für wie viele Abschlüsse das Material gerade reicht (Inventar + Bank). */
  materialRuns?: number;
}

const isGatherAction = (a: ActionDef): boolean =>
  (!a.inputs || a.inputs.length === 0) && a.successBase === undefined && a.loot.length > 0;
const isCraftAction = (a: ActionDef): boolean => !!a.inputs && a.inputs.length > 0 && a.loot.length > 0;

/** Ertrag je Abschluss für die Laufzahl: nur sichere Mengen (Chance 1), sonst 1. */
function sureYield(a: ActionDef, itemId?: string): number {
  const row = itemId ? a.loot.find((l) => l.itemId === itemId) : a.loot[0];
  return row && row.chance >= 1 ? Math.max(1, row.min) : 1;
}

/** Wie oft reicht das Material (Inventar + Bank, Muster Warteschlangen-Projektion) für diese Aktion? */
function materialRunsFor(state: GameState, a: ActionDef): number {
  let runs = Number.MAX_SAFE_INTEGER;
  for (const input of a.inputs ?? []) runs = Math.min(runs, Math.floor(materialsOnHand(state, input.itemId) / Math.max(1, input.qty)));
  return runs === Number.MAX_SAFE_INTEGER ? 0 : runs;
}

/**
 * claude:2026-10-31T13:58:31+01:00 — Befund D1: WIE VIEL von diesem Eintrag steht schon an (Abschlüsse, Kills oder Läufe)? Summe der
 * endlichen Ziele derselben Aktion bzw. desselben Gegners/Dungeons in der Warteschlange plus der Rest der laufenden Tätigkeit; ein
 * ∞-Eintrag, ein laufendes ∞ oder ein manueller Kampf (läuft bis zum Stopp) ergeben `Infinity`. Ein manuell betretener Dungeon zählt
 * als ein Lauf. Vorher prüfte `alreadyQueued` nur „steht schon da“, sodass Karte B (25× Stahl) hinter Karte A (6× Stahl als
 * Zulieferung) fälschlich `already_queued` meldete. Die Zähler der Tagesaufgaben (Kills, Herstellen, Sammeln, Abschlüsse) zählen jeden
 * Abschluss unabhängig davon, für welche Karte er eingereiht wurde, deshalb deckt eine eingereihte Menge jede Karte mit derselben
 * Aktion ab. Rein lesend.
 */
function queuedCoverage(state: GameState, entry: QueuedAction): number {
  const same = (q: QueuedAction): boolean => {
    if (entry.kind === "fight") return isFightQueueEntry(q) && q.monsterId === entry.monsterId;
    if (entry.kind === "dungeon") return isDungeonQueueEntry(q) && q.dungeonId === entry.dungeonId;
    return q.kind === "action" && q.actionId === entry.actionId;
  };
  let total = 0;
  for (const q of state.actionQueue ?? []) {
    if (!same(q)) continue;
    if (q.target === null) return Infinity;
    total += Math.max(0, q.target);
  }
  if (entry.kind === "fight") {
    if (state.combat.monsterId === entry.monsterId && !state.combat.dungeonId) {
      const qf = state.queueFight;
      if (!qf || qf.monsterId !== entry.monsterId || qf.remaining === null) return Infinity;
      total += Math.max(0, qf.remaining);
    }
  } else if (entry.kind === "dungeon") {
    if (state.combat.dungeonId === entry.dungeonId) {
      const qd = state.queueDungeon;
      if (qd && qd.dungeonId === entry.dungeonId) {
        if (qd.remaining === null) return Infinity;
        total += Math.max(0, qd.remaining);
      } else total += 1;
    }
  } else if (state.activeActionId === entry.actionId) {
    if (state.actionTarget === null) return Infinity;
    total += Math.max(0, state.actionTarget);
  }
  return total;
}

/** Schwächster direkt bekämpfbarer Gegner (schnellste Kills für „beliebige Kills“). */
function weakestFightable(state: GameState, content: ContentDB): MonsterId | null {
  let best: { id: MonsterId; level: number; hp: number } | null = null;
  for (const m of Object.values(content.monsters)) {
    if (m.dungeonOnly || !canFightMonster(state, content, m.id)) continue;
    if (!best || m.level < best.level || (m.level === best.level && m.maxHp < best.hp)) best = { id: m.id, level: m.level, hp: m.maxHp };
  }
  return best?.id ?? null;
}

type Planned = Omit<DailyQueuePlan, "questId">;

/** claude:2026-10-30T19:11:00+01:00 — Zulieferkette: so tief wird über Vorprodukte geplant (Barren ← Erz, Pfeile ← Spitzen ← Barren ← Erz). */
const SUPPLY_DEPTH = 3;

/**
 * claude:2026-10-30T19:11:00+01:00 — Wer liefert `itemId` sicher (Chance 1)? Zuerst die schnellste freigeschaltete
 * Sammelaktion, sonst das niedrigste freigeschaltete Rezept. Diebeskunst und Zufallsbeute zählen nicht.
 */
function producerOf(state: GameState, content: ContentDB, itemId: ItemId): ActionDef | null {
  let gather: ActionDef | null = null;
  let craft: ActionDef | null = null;
  for (const a of Object.values(content.actions)) {
    if (!a.loot.some((l) => l.itemId === itemId && l.chance >= 1) || !actionLevelMet(state, content, a.id)) continue;
    if (isGatherAction(a)) {
      if (!gather || a.durationMs < gather.durationMs) gather = a;
    } else if (isCraftAction(a)) {
      if (!craft || (a.levelRequired ?? 1) < (craft.levelRequired ?? 1)) craft = a;
    }
  }
  return gather ?? craft;
}

/**
 * claude:2026-10-30T19:11:00+01:00 — Zulieferung für `runs` Abschlüsse von `action`: was fehlt (Inventar + Bank minus schon
 * in diesem Klick verplant), wird über `producerOf` beschafft, Rezepte rekursiv. `reserved` merkt sich verplantes Material,
 * damit zwei Aufgaben nicht dasselbe Erz doppelt zählen. Ergebnis: Schritte in Einreih-Reihenfolge, oder das fehlende Material.
 */
function planSupply(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  runs: number,
  reserved: Map<ItemId, number>,
  depth = 0,
): { steps: QueuedAction[]; missing: ItemId | null } {
  const steps: QueuedAction[] = [];
  for (const input of action.inputs ?? []) {
    const need = input.qty * runs;
    const free = Math.max(0, materialsOnHand(state, input.itemId) - (reserved.get(input.itemId) ?? 0));
    const use = Math.min(need, free);
    reserved.set(input.itemId, (reserved.get(input.itemId) ?? 0) + use);
    const short = need - use;
    if (short <= 0) continue;
    const producer = depth < SUPPLY_DEPTH ? producerOf(state, content, input.itemId) : null;
    if (!producer) return { steps, missing: input.itemId };
    const pruns = Math.ceil(short / sureYield(producer, input.itemId));
    if (isCraftAction(producer)) {
      const sub = planSupply(state, content, producer, pruns, reserved, depth + 1);
      steps.push(...sub.steps);
      if (sub.missing) return { steps, missing: sub.missing };
    }
    steps.push({ kind: "action", actionId: producer.id, target: pruns });
  }
  return { steps, missing: null };
}

/** claude:2026-10-30T19:11:00+01:00 — Herstell-Plan inkl. Zulieferung; ohne beschaffbares Material `no_materials`. */
function craftWithSupply(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  runs: number,
  remaining: number,
  reserved: Map<ItemId, number>,
): Planned {
  const supply = planSupply(state, content, action, runs, reserved);
  const entry: QueuedAction = { kind: "action", actionId: action.id, target: runs };
  const materialRuns = materialRunsFor(state, action);
  if (supply.missing) return { ok: false, reason: "no_materials", missingItemId: supply.missing, entry, remaining, runs, materialRuns };
  return { ok: true, entry, entries: [...supply.steps, entry], remaining, runs, materialRuns };
}

function planKill(state: GameState, content: ContentDB, obj: QuestObjective, remaining: number): Planned {
  const ids = [...new Set([obj.target, ...(obj.targets ?? [])].filter((x): x is string => !!x && !!content.monsters[x]))];
  // Direkt bekämpfbar (Welt/Turm): der erste freigeschaltete Gegner der Liste.
  const open = ids.find((id) => !content.monsters[id]!.dungeonOnly && canFightMonster(state, content, id));
  if (open) return { ok: true, entry: makeFightQueueEntry(open, remaining), remaining, runs: remaining };
  // Nur im Dungeon: Läufe = Restkills ÷ Vorkommen je Lauf (Varianten zählen auf die Basis-Id).
  const credit = new Set(ids);
  for (const d of content.dungeons) {
    const perRun = d.encounters.filter((e) => credit.has(killCreditMonsterId(content, e))).length;
    if (perRun === 0 || !canEnterDungeon(state, content, d.id)) continue;
    const runs = Math.ceil(remaining / perRun);
    return { ok: true, entry: makeDungeonQueueEntry(d.id, runs), remaining, runs };
  }
  return { ok: false, reason: "locked", remaining, runs: 0 };
}

function planGather(state: GameState, content: ContentDB, remaining: number): Planned {
  // Jede Sammelaktion zählt („beliebige Gegenstände sammeln“): die kürzeste freigeschaltete, bei Gleichstand die höhere.
  let best: ActionDef | null = null;
  for (const a of Object.values(content.actions)) {
    if (!isGatherAction(a) || !actionLevelMet(state, content, a.id)) continue;
    if (!best || a.durationMs < best.durationMs || (a.durationMs === best.durationMs && (a.levelRequired ?? 1) > (best.levelRequired ?? 1))) best = a;
  }
  if (!best) return { ok: false, reason: "locked", remaining, runs: 0 };
  const runs = Math.ceil(remaining / sureYield(best));
  return { ok: true, entry: { kind: "action", actionId: best.id, target: runs }, remaining, runs };
}

function planCraft(state: GameState, content: ContentDB, obj: QuestObjective, remaining: number, reserved: Map<ItemId, number>): Planned {
  const crafts = Object.values(content.actions).filter(isCraftAction);
  if (obj.target) {
    // Bestimmter Gegenstand: Rezepte mit diesem sicheren Ertrag, freigeschaltet, das niedrigste zuerst.
    const recipes = crafts
      .filter((a) => a.loot.some((l) => l.itemId === obj.target && l.chance >= 1))
      .sort((a, b) => (a.levelRequired ?? 1) - (b.levelRequired ?? 1));
    if (recipes.length === 0) return { ok: false, reason: "no_recipe", remaining, runs: 0 };
    const usable = recipes.find((a) => actionLevelMet(state, content, a.id));
    if (!usable) return { ok: false, reason: "locked", remaining, runs: 0 };
    const runs = Math.ceil(remaining / sureYield(usable, obj.target));
    // claude:2026-10-30T19:11:00+01:00 — fehlendes Material wird vorab beschafft (Zulieferkette), sonst `no_materials`.
    return craftWithSupply(state, content, usable, runs, remaining, reserved);
  }
  // Beliebiger Gegenstand: ein freigeschaltetes Rezept, dessen Material für den Rest reicht (das schnellste);
  // sonst das mit dem meisten Material. Ohne jedes Material: das schnellste Rezept, dessen Material sich beschaffen lässt.
  let best: { a: ActionDef; mat: number; runs: number } | null = null;
  for (const a of crafts) {
    if (!actionLevelMet(state, content, a.id)) continue;
    const mat = materialRunsFor(state, a);
    if (mat <= 0) continue;
    const runs = Math.ceil(remaining / sureYield(a));
    const enough = mat >= runs;
    const bestEnough = best ? best.mat >= best.runs : false;
    if (!best || (enough && !bestEnough) || (enough && bestEnough && a.durationMs < best.a.durationMs) || (!enough && !bestEnough && mat > best.mat)) {
      best = { a, mat, runs };
    }
  }
  if (best) return craftWithSupply(state, content, best.a, best.runs, remaining, reserved);
  // claude:2026-10-30T19:11:00+01:00 — kein Material da: das schnellste freigeschaltete Rezept mit beschaffbarer Zulieferung.
  const byTime = crafts.filter((a) => actionLevelMet(state, content, a.id)).sort((a, b) => a.durationMs - b.durationMs);
  for (const a of byTime) {
    const runs = Math.ceil(remaining / sureYield(a));
    if (planSupply(state, content, a, runs, new Map(reserved)).missing) continue;
    return craftWithSupply(state, content, a, runs, remaining, reserved);
  }
  return { ok: false, reason: "no_recipe", remaining, runs: 0 };
}

/**
 * Plan für eine heutige Tagesaufgabe, ohne etwas zu ändern. Unbekannt/nicht heute aktiv ⇒ null.
 * `reserved` (claude:2026-10-30T19:11:00+01:00): in diesem Klick schon verplantes Material, nur für „alle einreihen“.
 */
export function dailyQueuePlan(
  state: GameState,
  content: ContentDB,
  questId: string,
  reserved: Map<ItemId, number> = new Map(),
): DailyQueuePlan | null {
  if (!state.quests.daily.quests.some((d) => d.questId === questId)) return null;
  const quest: QuestDef | undefined = content.quests.find((q) => q.id === questId);
  if (!quest) return null;
  if (isDailyClaimed(state, questId)) return { questId, ok: false, reason: "claimed", remaining: 0, runs: 0 };
  if (canClaimQuest(state, content, questId)) return { questId, ok: false, reason: "done", remaining: 0, runs: 0 };
  const idx = quest.objectives.findIndex((o, i) => questObjectiveProgress(state, content, quest, i) < o.count);
  const obj = quest.objectives[idx];
  if (!obj) return { questId, ok: false, reason: "done", remaining: 0, runs: 0 };
  const remaining = obj.count - questObjectiveProgress(state, content, quest, idx);
  // claude:2026-10-30T20:15:00+01:00 — Review K3: Material erst auf einer Kopie verplanen und nur bei Erfolg übernehmen
  // (sonst hielt ein gescheiterter oder schon eingereihter Plan Material fest, und spätere Aufgaben sammelten zu viel nach).
  let scratch = new Map(reserved);
  let planned: Planned;
  switch (obj.type) {
    case "kill_monster":
      planned = planKill(state, content, obj, remaining);
      break;
    case "kill_total": {
      const id = weakestFightable(state, content);
      planned = id ? { ok: true, entry: makeFightQueueEntry(id, remaining), remaining, runs: remaining } : { ok: false, reason: "locked", remaining, runs: 0 };
      break;
    }
    case "gather_items":
      planned = planGather(state, content, remaining);
      break;
    case "craft_items":
      planned = planCraft(state, content, obj, remaining, scratch);
      break;
    case "dungeons_cleared":
      planned = obj.target && canEnterDungeon(state, content, obj.target)
        ? { ok: true, entry: makeDungeonQueueEntry(obj.target, remaining), remaining, runs: remaining }
        : { ok: false, reason: "locked", remaining, runs: 0 };
      break;
    default:
      planned = { ok: false, reason: "unsupported", remaining, runs: 0 };
  }
  // claude:2026-10-31T13:58:31+01:00 — Befund D1: mengengenau. Was schon ansteht, wird abgezogen; nur die Differenz wird nachgereiht
  // (beim Herstellen samt neu geplanter Zulieferung für genau diese Differenz). `already_queued` nur, wenn der Bedarf ganz gedeckt ist.
  if (planned.ok && planned.entry && planned.entry.target !== null) {
    const need = planned.entry.target;
    const covered = queuedCoverage(state, planned.entry);
    if (covered >= need) {
      planned = { ...planned, ok: false, reason: "already_queued", queuedBefore: covered };
    } else if (covered > 0) {
      const rest = need - covered;
      const action = planned.entry.kind === "action" ? content.actions[planned.entry.actionId] : undefined;
      if (obj.type === "craft_items" && action) {
        scratch = new Map(reserved);
        planned = { ...craftWithSupply(state, content, action, rest, remaining, scratch), queuedBefore: covered };
      } else {
        const entry: QueuedAction = { ...planned.entry, target: rest };
        planned = { ...planned, entry, entries: [entry], runs: rest, queuedBefore: covered };
      }
    }
  }
  if (planned.ok && planned.entry && !planned.entries) planned = { ...planned, entries: [planned.entry] };
  if (planned.ok) for (const [item, qty] of scratch) reserved.set(item, qty); // claude:2026-10-30T20:15:00+01:00 — nur erfolgreiche Pläne binden Material
  return { questId, ...planned };
}

/** Reiht eine Tagesaufgabe samt Zulieferkette ein (wenn möglich) und gibt den Plan zurück. */
export function enqueueDailyQuest(
  state: GameState,
  content: ContentDB,
  questId: string,
  reserved: Map<ItemId, number> = new Map(),
): DailyQueuePlan | null {
  const plan = dailyQueuePlan(state, content, questId, reserved);
  if (!plan?.ok || !plan.entries) return plan;
  // claude:2026-10-30T19:11:00+01:00 — Kette in Reihenfolge; benachbarte gleiche Aktionen stapelt enqueueAction selbst.
  for (const e of plan.entries) {
    const done =
      e.kind === "fight" && e.monsterId ? enqueueFight(state, content, e.monsterId, e.target)
      : e.kind === "dungeon" && e.dungeonId ? enqueueDungeonRuns(state, content, e.dungeonId, e.target)
      : enqueueAction(state, content, e.actionId, e.target);
    if (!done) return { ...plan, ok: false, reason: "locked" };
  }
  return plan;
}

/**
 * Reiht alle heutigen, noch offenen Tagesaufgaben in ihrer Reihenfolge ein (Material wird über alle hinweg verplant).
 * claude:2026-10-31T13:58:31+01:00 — Befund D1: jede Karte sieht, was die Karten davor schon eingereiht haben (queuedCoverage), und
 * reiht nur ihre Differenz nach. Am Ende steht je Aktion bzw. Gegner mindestens der größte Bedarf aller Karten an, die ihn teilen.
 */
export function enqueueAllDailyQuests(state: GameState, content: ContentDB): DailyQueuePlan[] {
  const out: DailyQueuePlan[] = [];
  const reserved = new Map<ItemId, number>(); // claude:2026-10-30T19:11:00+01:00
  for (const d of state.quests.daily.quests) {
    const plan = enqueueDailyQuest(state, content, d.questId, reserved);
    if (plan) out.push(plan);
  }
  return out;
}
