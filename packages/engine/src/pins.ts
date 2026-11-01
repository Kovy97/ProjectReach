// claude:2026-10-31T11:46:28+01:00 — Rezepte anpinnen (1.4.2, SAVE 101; Chef-Auftrag 25.10. „ins nächste Update“, präzisiert 31.10.:
// schwebendes Fenster wie der Champion-Zähler). Einzige Schreib-Stelle von `GameState.pinnedRecipes` plus die Zeilen-Ableitung für das
// Fenster „Angepinnte Rezepte“. Deterministisch: kein RNG, keine Zeitquelle, kein I/O. Reine Spieler-Vorliebe ohne Spielwirkung.
import type { ActionDef, ActionId, ContentDB, GameState, ItemId, SkillId } from "@hearthforge/shared";
import { actionLevelMet } from "./actions";
import { materialStatusFrom, projectQueue, projectedRunsFrom } from "./queueProjection";
import type { MaterialStatus } from "./queueProjection";

/** Höchstens so viele Rezepte lassen sich gleichzeitig anpinnen (Chef-Auftrag 31.10.2026). */
export const MAX_PINNED_RECIPES = 10;

/** Pinbar ist jede bekannte Aktion mit mindestens einer Zutat (Rezept), sonst nichts. */
export function isPinnableRecipe(content: ContentDB, actionId: ActionId): boolean {
  const action = content.actions[actionId];
  return !!action && Array.isArray(action.inputs) && action.inputs.length > 0;
}

/** Die angepinnten Aktions-Ids in Pin-Reihenfolge (defensiv: fehlt das Feld, leer). */
export function pinnedRecipeIds(state: GameState): readonly ActionId[] {
  return Array.isArray(state.pinnedRecipes) ? state.pinnedRecipes : [];
}

/** Ist das Rezept angepinnt? */
export function isRecipePinned(state: GameState, actionId: ActionId): boolean {
  return pinnedRecipeIds(state).includes(actionId);
}

/** Ergebnis eines Umschalt-Klicks: `pinned` ist der neue Zustand; `limit` = schon `MAX_PINNED_RECIPES` Pins. */
export type PinRecipeResult =
  | { ok: true; pinned: boolean }
  | { ok: false; reason: "not_recipe" | "limit" };

/**
 * Stern an der Rezeptkarte: angepinnt → lösen, sonst anpinnen (hinten anhängen). Lösen geht immer, auch für eine Id, die der
 * Content nicht mehr kennt. Anpinnen nur für Rezepte (`isPinnableRecipe`) und nur unter der Obergrenze; beides lehnt sauber ab,
 * ohne den Zustand anzufassen, damit die Oberfläche einen Hinweis zeigen kann statt still zu scheitern.
 */
export function togglePinnedRecipe(state: GameState, content: ContentDB, actionId: ActionId): PinRecipeResult {
  if (!Array.isArray(state.pinnedRecipes)) state.pinnedRecipes = [];
  const list = state.pinnedRecipes;
  const idx = list.indexOf(actionId);
  if (idx >= 0) {
    list.splice(idx, 1);
    return { ok: true, pinned: false };
  }
  if (!isPinnableRecipe(content, actionId)) return { ok: false, reason: "not_recipe" };
  if (list.length >= MAX_PINNED_RECIPES) return { ok: false, reason: "limit" };
  list.push(actionId);
  return { ok: true, pinned: true };
}

/** Löst ein Rezept (× im Fenster). true, wenn es angepinnt war. */
export function unpinRecipe(state: GameState, actionId: ActionId): boolean {
  if (!Array.isArray(state.pinnedRecipes)) {
    state.pinnedRecipes = [];
    return false;
  }
  const idx = state.pinnedRecipes.indexOf(actionId);
  if (idx < 0) return false;
  state.pinnedRecipes.splice(idx, 1);
  return true;
}

/**
 * Lade-Härtung (persistence `sanitizeState`): nur Strings, nur pinbare Rezepte, ohne Doppel (der erste gewinnt), auf
 * `MAX_PINNED_RECIPES` gekürzt; alles andere ⇒ leere Liste. Idempotent.
 */
export function cleanPinnedRecipes(raw: unknown, content: ContentDB): ActionId[] {
  if (!Array.isArray(raw)) return [];
  const out: ActionId[] = [];
  for (const id of raw) {
    if (out.length >= MAX_PINNED_RECIPES) break;
    if (typeof id !== "string" || out.includes(id) || !isPinnableRecipe(content, id)) continue;
    out.push(id);
  }
  return out;
}

/** Eine Zutat einer Fensterzeile: Bestand jetzt (Inventar + Lager, dieselbe Quelle wie der Tick) gegen Bedarf je Lauf. */
export interface PinnedRecipeInput {
  itemId: ItemId;
  need: number;
  have: number;
  /** `have` = reicht jetzt, `will_have` = erst mit den sicheren Ausgaben der Warteschlange, `missing` = auch dann nicht. */
  status: MaterialStatus;
}

/** Eine Zeile des Fensters „Angepinnte Rezepte“. */
export interface PinnedRecipeRow {
  actionId: ActionId;
  skillId: SkillId;
  levelRequired: number;
  levelOk: boolean;
  /** Primäres Produkt (`loot[0]`, dieselbe Wahl wie die Rezeptkarte), `null` ohne Beute. */
  outputItemId: ItemId | null;
  inputs: PinnedRecipeInput[];
  /** Läufe aus dem echten Bestand (min über die Zutaten, abgerundet). */
  craftable: number;
  /** Läuft das Rezept gerade? */
  active: boolean;
  /** Sofort starten möglich (Stufe reicht, echter Bestand für mindestens einen Lauf) — Bedingung von `enqueueActionAtFront`. */
  startable: boolean;
  /** Einreihen möglich wie auf der Karte: Stufe reicht und Bestand oder Warteschlange liefert mindestens einen Lauf. */
  queueable: boolean;
}

function rowFor(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
  materials: ReturnType<typeof projectQueue>["materials"],
): PinnedRecipeRow {
  const inputs: PinnedRecipeInput[] = materialStatusFrom(state, materials, action).map((m) => ({
    itemId: m.itemId,
    need: m.qty,
    have: m.have,
    status: m.status,
  }));
  let craftable = Number.POSITIVE_INFINITY;
  for (const inp of inputs) craftable = Math.min(craftable, inp.need > 0 ? Math.floor(inp.have / inp.need) : Number.POSITIVE_INFINITY);
  if (!Number.isFinite(craftable)) craftable = 0; // pinbar heißt mindestens eine Zutat; reine Absicherung
  const levelOk = actionLevelMet(state, content, action.id);
  const projected = projectedRunsFrom(materials, action);
  const projectedPositive = projected === "infinite" || projected > 0;
  return {
    actionId: action.id,
    skillId: action.skill,
    levelRequired: action.levelRequired ?? 1,
    levelOk,
    outputItemId: action.loot[0]?.itemId ?? null,
    inputs,
    craftable,
    active: state.activeActionId === action.id && state.combat.monsterId === null,
    startable: levelOk && craftable > 0,
    queueable: levelOk && (craftable > 0 || projectedPositive),
  };
}

/**
 * Alle Fensterzeilen in Pin-Reihenfolge. Ids, die der Content (nach einem Update) nicht mehr als Rezept kennt, fallen still weg;
 * die Liste selbst bleibt unangetastet (die Lade-Härtung räumt sie beim nächsten Laden). Die Warteschlangen-Projektion läuft
 * einmal für alle Zeilen, nur lesend.
 */
export function pinnedRecipeRows(state: GameState, content: ContentDB): PinnedRecipeRow[] {
  const ids = pinnedRecipeIds(state);
  if (ids.length === 0) return [];
  const materials = projectQueue(state, content).materials;
  const rows: PinnedRecipeRow[] = [];
  for (const id of ids) {
    if (!isPinnableRecipe(content, id)) continue;
    rows.push(rowFor(state, content, content.actions[id]!, materials));
  }
  return rows;
}
