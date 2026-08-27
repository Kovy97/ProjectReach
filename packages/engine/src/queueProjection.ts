import type { ActionDef, ActionId, ContentDB, GameState, ItemId } from "@hearthforge/shared";
import { bankCount } from "./bank";
import { itemCount } from "./inventory";

/**
 * WARTESCHLANGEN-PROJEKTION (Chef-Auftrag 27.08.2026, „Queue Copper Vein ×650, Inventar 0 →
 * Smelt Copper trotzdem 650× einreihen dürfen; Chip gelb = werde haben").
 *
 * REINE ABLEITUNG: liest nur `state` + `content`, mutiert nichts, zieht KEIN RNG, kennt keine
 * Zeitquelle. Nichts hiervon wird gespeichert (kein neues GameState-Feld, kein SAVE-Bump) — die
 * Engine-Regel „was zählt als deterministische Ausgabe" steht hier an EINER Stelle:
 *
 *  • KETTEN-GLIEDER in Ablauf-Reihenfolge: zuerst die LAUFENDE Aktion mit ihrem Rest-Ziel
 *    (`activeActionId`/`actionTarget`; `null` = ∞), dann die Queue-Einträge `kind: "action"` vor
 *    `upToIndex` (exklusiv; Default = alle). Kampf-/Dungeon-Einträge liefern Beute nur per RNG und
 *    zählen NICHT (sie werden übersprungen, verbrauchen auch nichts).
 *  • AUSGABE eines Glieds: nur `loot`-Zeilen mit `chance >= 1`, Menge `min` je Lauf. Mastery-
 *    Doppelertrag, Pool-/Pet-Boni und Material-Sparer sind Würfe → bewusst ignoriert (die Projektion
 *    ist eine UNTERGRENZE dessen, was sicher kommt). Aktionen mit Erfolgswurf (`successBase`,
 *    Thieving) haben KEINE sichere Ausgabe. Ein Glied ohne Mengen-Ziel (∞) ohne Inputs liefert
 *    seine Ausgaben als "infinite".
 *  • VERBRAUCH eines Glieds: seine `inputs` × mögliche Läufe — ein Glied kann nur verbrauchen, was
 *    bis dahin projiziert da ist (Reihenfolge!). Mögliche Läufe = min(Ziel, floor(verfügbar/qty)
 *    über alle Inputs); ist das 0, läuft das Glied als „wird übersprungen" (Status `missing`) und
 *    gibt nichts aus. Fehlbestand klemmt bei 0. Ein ∞-Glied MIT Inputs läuft, bis das (endliche)
 *    Material leer ist — genau die Tick-Semantik (`action_until_materials`).
 *  • Ein Item-Eintrag wird "infinite", sobald ein ∞-Produzent ihn liefert; ein späterer Verbraucher
 *    mit lauter "infinite"-Inputs läuft selbst "infinite".
 *
 * Spiegelt die Tick-Semantik (tick.ts `skillingStep` + actions.ts `advanceActionQueue`) nur als
 * Prognose — sie ändert weder Reihenfolge noch Rest-Ziele der Queue.
 */
export type ProjectedQty = number | "infinite";

/** Material-Status eines Inputs bzw. eines Ketten-Glieds (s. `materialStatus`/`ProjectedLink`). */
export type MaterialStatus = "have" | "will_have" | "missing";

/** Bestand JETZT: Inventar (nur fungible Stacks) + Lager — dieselbe Quelle wie der Tick (`hasInputs`). */
export function materialsOnHand(state: GameState, itemId: ItemId): number {
  return itemCount(state.inventory, itemId) + bankCount(state, itemId);
}

/**
 * Reicht der ECHTE Bestand (Inventar + Lager) für einen Lauf der Aktion? Deckungsgleich mit dem
 * privaten `hasInputs` des Ticks — exportiert für den Start-Check der Queue (`advanceActionQueue`)
 * und die Persistenz („gilt der Skip-Grund heute noch?"). Aktionen ohne Inputs: immer true.
 */
export function actionInputsOnHand(state: GameState, action: ActionDef): boolean {
  if (!action.inputs) return true;
  for (const input of action.inputs) {
    if (materialsOnHand(state, input.itemId) < input.qty) return false;
  }
  return true;
}

/** Ein Ketten-Glied der Projektion (laufende Aktion oder Queue-Eintrag `kind: "action"`). */
export interface ProjectedLink {
  actionId: ActionId;
  /** "active" = die laufende Aktion, sonst der Index im ROHEN `state.actionQueue`. */
  source: "active" | number;
  /** Gewünschte Läufe (Rest-Ziel bzw. Queue-Ziel; `null` → "infinite"). */
  requested: ProjectedQty;
  /** Aus den projizierten Materialien tatsächlich mögliche Läufe (≤ requested; 0 = wird übersprungen). */
  runs: ProjectedQty;
  /**
   * `none` = keine Inputs; `have` = der echte Bestand (abzüglich dessen, was frühere Glieder
   * verbrauchen) reicht für ≥ 1 Lauf; `will_have` = erst Ausgaben früherer Glieder machen ≥ 1 Lauf
   * möglich; `missing` = auch dann kein Lauf (→ der Queue-Start überspringt das Glied mit
   * `no_materials`, s. `advanceActionQueue`).
   */
  status: MaterialStatus | "none";
  /** Deterministische Ausgaben dieses Glieds (chance ≥ 1, `min` × runs). */
  outputs: Array<{ itemId: ItemId; qty: ProjectedQty }>;
}

export interface QueueProjection {
  /** Bestand + Ausgaben − Verbrauch aller Glieder in `links`. Fehlender Key = 0. */
  materials: Map<ItemId, ProjectedQty>;
  links: ProjectedLink[];
}

function addQty(a: ProjectedQty, b: ProjectedQty): ProjectedQty {
  if (a === "infinite" || b === "infinite") return "infinite";
  return a + b;
}

function minQty(a: ProjectedQty, b: ProjectedQty): ProjectedQty {
  if (a === "infinite") return b;
  if (b === "infinite") return a;
  return Math.min(a, b);
}

function mulQty(a: ProjectedQty, n: number): ProjectedQty {
  return a === "infinite" ? "infinite" : a * n;
}

/** Bestand JETZT als Map (Inventar-Stacks + Lager) — Startpunkt beider Projektions-Maps. */
function stockMap(state: GameState): Map<ItemId, number> {
  const m = new Map<ItemId, number>();
  for (const slot of state.inventory.slots) {
    if (!slot || slot.instance) continue; // Instanz-Slots sind nicht fungibel (s. itemCount)
    m.set(slot.itemId, (m.get(slot.itemId) ?? 0) + slot.qty);
  }
  for (const [itemId, qty] of Object.entries(state.bank)) {
    if (typeof qty === "number" && qty > 0) m.set(itemId, (m.get(itemId) ?? 0) + qty);
  }
  return m;
}

/** Ein Glied auf beide Maps anwenden (s. Modul-JSDoc). `stock` = echter Bestand minus Verbrauch. */
function applyLink(
  action: ActionDef,
  source: "active" | number,
  requested: ProjectedQty,
  materials: Map<ItemId, ProjectedQty>,
  stock: Map<ItemId, number>,
): ProjectedLink {
  const inputs = action.inputs ?? [];
  let possible: ProjectedQty = requested;
  let stockRuns: ProjectedQty = "infinite";
  for (const input of inputs) {
    const avail = materials.get(input.itemId) ?? 0;
    possible = minQty(possible, avail === "infinite" ? "infinite" : Math.floor(avail / input.qty));
    stockRuns = minQty(stockRuns, Math.floor((stock.get(input.itemId) ?? 0) / input.qty));
  }
  const runs: ProjectedQty = possible;
  const runsPositive = runs === "infinite" || runs > 0;
  let status: MaterialStatus | "none";
  if (inputs.length === 0) status = "none";
  else if (!runsPositive) status = "missing";
  else if (stockRuns === "infinite" || stockRuns > 0) status = "have";
  else status = "will_have";

  // Verbrauch (nur wenn das Glied läuft). Ein "infinite"-Lauf hat per Konstruktion nur
  // "infinite"-Inputs → dort bleibt der Eintrag "infinite"; endliche Läufe ziehen endlich ab.
  if (runsPositive && runs !== "infinite") {
    for (const input of inputs) {
      const avail = materials.get(input.itemId) ?? 0;
      if (avail !== "infinite") materials.set(input.itemId, Math.max(0, avail - runs * input.qty));
      const have = stock.get(input.itemId) ?? 0;
      stock.set(input.itemId, Math.max(0, have - runs * input.qty));
    }
  }

  // Ausgaben: nur sichere Beute (chance ≥ 1), `min` je Lauf; kein Erfolgswurf (Thieving).
  const outputs: ProjectedLink["outputs"] = [];
  if (runsPositive && action.successBase === undefined) {
    for (const roll of action.loot) {
      if (roll.chance < 1 || roll.min <= 0) continue;
      const qty = mulQty(runs, roll.min);
      outputs.push({ itemId: roll.itemId, qty });
      materials.set(roll.itemId, addQty(materials.get(roll.itemId) ?? 0, qty));
    }
  }
  return { actionId: action.id, source, requested, runs, status, outputs };
}

/**
 * Walkt die Kette (laufende Aktion → Queue-Einträge vor `upToIndex`) und liefert projizierte
 * Materialien + die Glieder mit Status. `upToIndex` (Default: ganze Queue) ist der Index des
 * Eintrags, für den man wissen will, was VOR ihm da sein wird — ein neu anzuhängender Eintrag
 * sieht also die gesamte Kette.
 */
export function projectQueue(state: GameState, content: ContentDB, upToIndex?: number): QueueProjection {
  const stock = stockMap(state);
  const materials = new Map<ItemId, ProjectedQty>(stock);
  const links: ProjectedLink[] = [];

  // (1) laufende Aktion mit Rest-Ziel — nur im Skilling-Pfad (im Kampf ist activeActionId null).
  const activeId = state.activeActionId;
  if (activeId !== null) {
    const action = content.actions[activeId];
    if (action) {
      const remaining: ProjectedQty = state.actionTarget === null ? "infinite" : Math.max(0, state.actionTarget);
      links.push(applyLink(action, "active", remaining, materials, stock));
    }
  }

  // (2) Queue-Einträge kind "action" vor upToIndex — Kampf/Dungeon werden übersprungen.
  const queue = Array.isArray(state.actionQueue) ? state.actionQueue : [];
  const end = upToIndex === undefined ? queue.length : Math.min(Math.max(0, upToIndex), queue.length);
  for (let i = 0; i < end; i++) {
    const entry = queue[i];
    if (!entry || entry.kind !== "action") continue;
    const action = content.actions[entry.actionId];
    if (!action) continue; // unbekannt → der Queue-Start überspringt sie ohnehin
    const requested: ProjectedQty = entry.target === null ? "infinite" : Math.max(0, entry.target);
    links.push(applyLink(action, i, requested, materials, stock));
  }
  return { materials, links };
}

/** Bestand + deterministische Ausgaben − Verbrauch aller Glieder vor `upToIndex` (s. `projectQueue`). */
export function projectedMaterials(
  state: GameState,
  content: ContentDB,
  upToIndex?: number,
): Map<ItemId, ProjectedQty> {
  return projectQueue(state, content, upToIndex).materials;
}

/** Läufe der Aktion aus einer fertigen Material-Map: min über die Inputs; ohne Inputs "infinite". */
export function projectedRunsFrom(materials: Map<ItemId, ProjectedQty>, action: ActionDef): ProjectedQty {
  let runs: ProjectedQty = "infinite";
  for (const input of action.inputs ?? []) {
    const avail = materials.get(input.itemId) ?? 0;
    runs = minQty(runs, avail === "infinite" ? "infinite" : Math.floor(avail / input.qty));
  }
  return runs;
}

/**
 * Wie viele Läufe der Aktion sind aus den PROJIZIERTEN Materialien möglich (als neuer Eintrag
 * hinter der Kette bzw. an Position `upToIndex`)? "infinite", wenn alle Inputs unbegrenzt sind
 * (oder die Aktion keine hat); 0 bzw. unbekannte Aktion → 0.
 */
export function projectedRuns(
  state: GameState,
  content: ContentDB,
  actionId: ActionId,
  upToIndex?: number,
): ProjectedQty {
  const action = content.actions[actionId];
  if (!action) return 0;
  return projectedRunsFrom(projectQueue(state, content, upToIndex).materials, action);
}

/** Status EINES Inputs der Aktion (s. `materialStatus`). */
export interface MaterialStatusEntry {
  itemId: ItemId;
  qty: number;
  /** Echter Bestand jetzt (Inventar + Lager) — die ehrliche Zahl auf dem Chip. */
  have: number;
  /** Projizierter Bestand nach der Kette. */
  projected: ProjectedQty;
  status: MaterialStatus;
}

/**
 * Chip-Status je Input aus einer fertigen Projektion: `have` = der echte Bestand reicht JETZT
 * (grün, wie bisher `ready`), `will_have` = erst mit den Queue-Ausgaben (gelb), `missing` = auch
 * dann nicht (rot).
 */
export function materialStatusFrom(
  state: GameState,
  materials: Map<ItemId, ProjectedQty>,
  action: ActionDef,
): MaterialStatusEntry[] {
  return (action.inputs ?? []).map((input) => {
    const have = materialsOnHand(state, input.itemId);
    const projected = materials.get(input.itemId) ?? 0;
    const status: MaterialStatus =
      have >= input.qty ? "have" : projected === "infinite" || projected >= input.qty ? "will_have" : "missing";
    return { itemId: input.itemId, qty: input.qty, have, projected, status };
  });
}

/** Chip-Status je Input der Aktion (neuer Eintrag hinter der ganzen Kette); unbekannte Aktion → []. */
export function materialStatus(state: GameState, content: ContentDB, actionId: ActionId): MaterialStatusEntry[] {
  const action = content.actions[actionId];
  if (!action) return [];
  return materialStatusFrom(state, projectQueue(state, content).materials, action);
}

/**
 * Woher kommt ein Item in der Projektion? Alle Glieder, die es sicher ausgeben (für den Chip-
 * Tooltip „Kommt aus der Warteschlange: Kupferader ×650"). Reihenfolge = Ablauf-Reihenfolge.
 */
export function projectedProducers(
  projection: QueueProjection,
  itemId: ItemId,
): Array<{ actionId: ActionId; source: "active" | number; qty: ProjectedQty }> {
  const out: Array<{ actionId: ActionId; source: "active" | number; qty: ProjectedQty }> = [];
  for (const link of projection.links) {
    for (const o of link.outputs) {
      if (o.itemId === itemId) out.push({ actionId: link.actionId, source: link.source, qty: o.qty });
    }
  }
  return out;
}
