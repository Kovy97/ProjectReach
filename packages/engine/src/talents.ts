import type {
  ContentDB,
  GameState,
  TalentCurrency,
  TalentEffectKind,
  TalentNodeDef,
  TalentTreeDef,
} from "@hearthforge/shared";
import { TALENT_EFFECT_AGGREGATION, defaultPrestigeState } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";

// ───────────────────────────────────────────────────────────────────────────
// claude:2026-10-18T00:30:00+02:00 — Generisches Talentbaum-System (1.3.0 Säule 0, Chef 17.10.:
// „Slayer-Buch als richtiges Talentbaum-System, das wir später erweitern“). Bäume/Knoten sind
// Content (`content.talentTrees`), der Kauf ist generisch, und JEDES System liest seinen Bonus nur
// über `talentEffect(state, content, kind)` — nie über Knoten-Ids. Rein & deterministisch, kein RNG.
// ───────────────────────────────────────────────────────────────────────────

/** Alle Bäume des Contents (leer, wenn der Content keine hat). */
export function talentTrees(content: ContentDB): readonly TalentTreeDef[] {
  return content.talentTrees ?? [];
}

export function findTalentTree(content: ContentDB, treeId: string): TalentTreeDef | undefined {
  return talentTrees(content).find((t) => t.id === treeId);
}

/** Gekaufter Rang eines Knotens (0 = nicht gekauft). Defensiv gegen Alt-States ohne `talents`. */
export function talentRank(state: GameState, treeId: string, nodeId: string): number {
  const r = state.talents?.[treeId]?.[nodeId] ?? 0;
  return Number.isFinite(r) && r > 0 ? Math.floor(r) : 0;
}

/**
 * Ist der Baum freigeschaltet? ALLE gesetzten Bedingungen von `tree.unlock` müssen gelten: Skill-Stufe
 * (`skill` + `level`) und — claude:2026-10-18T12:00:00+02:00, Narbenbuch — Zahl der Aufstiege
 * (`prestigeCount`, aus `state.prestige.count`, defensiv 0 für handgebaute Alt-States).
 */
export function talentTreeUnlocked(state: GameState, tree: TalentTreeDef): boolean {
  const u = tree.unlock;
  if (u.skill !== undefined && levelFromXp(state.skills[u.skill]?.xp ?? 0) < (u.level ?? 0)) return false;
  if (u.prestigeCount !== undefined && (state.prestige?.count ?? 0) < u.prestigeCount) return false;
  return true;
}

/** Guthaben der Baum-Währung. */
export function talentCurrencyBalance(state: GameState, currency: TalentCurrency): number {
  switch (currency) {
    case "slayerPoints":
      return state.slayerPoints;
    // claude:2026-10-17T23:30:00+02:00 — Prestige-Punkte (SAVE 88): Saldo = prestige.points; defensiv 0
    // für handgebaute Alt-/Test-States ohne das Feld (Load-Pfad defaultet es über sanitizeState).
    case "prestigePoints":
      return state.prestige?.points ?? 0;
  }
}

function spendTalentCurrency(state: GameState, currency: TalentCurrency, amount: number): void {
  switch (currency) {
    case "slayerPoints":
      state.slayerPoints -= amount;
      return;
    // claude:2026-10-17T23:30:00+02:00 — Ausgeben senkt das Guthaben und zählt die Lebenszeit-Ausgaben hoch
    // (verdient insgesamt = points + pointsSpent). Nur über buyTalent erreichbar (Guthaben vorab geprüft).
    case "prestigePoints": {
      const p = (state.prestige ??= defaultPrestigeState());
      p.points -= amount;
      p.pointsSpent += amount;
      return;
    }
  }
}

/** Kosten des NÄCHSTEN Rangs, oder null, wenn der Knoten voll ist (bzw. Kosten fehlen/defekt). */
export function talentNextCost(state: GameState, tree: TalentTreeDef, node: TalentNodeDef): number | null {
  const rank = talentRank(state, tree.id, node.id);
  if (rank >= node.maxRank) return null;
  const cost = node.costPerRank[rank];
  return typeof cost === "number" && Number.isFinite(cost) && cost >= 0 ? cost : null;
}

/** Wert der Wirkung beim gegebenen Rang (0 bei Rang 0). */
export function talentValueAtRank(node: TalentNodeDef, rank: number): number {
  if (rank <= 0) return 0;
  const v = node.effect.perRank[Math.min(rank, node.effect.perRank.length) - 1];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Stabile Fehlschlag-Codes (Muster SlayerShopReason): die UI rendert `t("talent.reason." + code)`.
 *  - `not_found`             Baum/Knoten unbekannt oder Kosten defekt.
 *  - `locked`                Baum noch nicht freigeschaltet (Skill-Stufe).
 *  - `maxed`                 Knoten hat maxRank.
 *  - `requires`              Voraussetzung (anderer Knoten mit Mindestrang) fehlt.
 *  - `not_enough_currency`   Guthaben reicht nicht.
 */
export type TalentBuyReason = "not_found" | "locked" | "maxed" | "requires" | "not_enough_currency";

export interface TalentBuyCheck {
  ok: boolean;
  reason?: TalentBuyReason;
  /** Kosten des nächsten Rangs (wenn bestimmbar). */
  cost?: number;
}

/** Prüft einen Kauf ohne State-Änderung. Reihenfolge der Gründe: not_found → locked → maxed → requires → Guthaben. */
export function canBuyTalent(state: GameState, content: ContentDB, treeId: string, nodeId: string): TalentBuyCheck {
  const tree = findTalentTree(content, treeId);
  const node = tree?.nodes.find((n) => n.id === nodeId);
  if (!tree || !node) return { ok: false, reason: "not_found" };
  if (!talentTreeUnlocked(state, tree)) return { ok: false, reason: "locked" };
  if (talentRank(state, tree.id, node.id) >= node.maxRank) return { ok: false, reason: "maxed" };
  const cost = talentNextCost(state, tree, node);
  if (cost === null) return { ok: false, reason: "not_found" };
  for (const req of node.requires ?? []) {
    if (talentRank(state, tree.id, req.node) < req.rank) return { ok: false, reason: "requires", cost };
  }
  if (talentCurrencyBalance(state, tree.currency) < cost) return { ok: false, reason: "not_enough_currency", cost };
  return { ok: true, cost };
}

/** Kauft den nächsten Rang eines Knotens (zieht die Währung ab). State bleibt bei Fehlschlag unverändert. */
export function buyTalent(state: GameState, content: ContentDB, treeId: string, nodeId: string): TalentBuyCheck {
  const check = canBuyTalent(state, content, treeId, nodeId);
  if (!check.ok || check.cost === undefined) return check;
  const tree = findTalentTree(content, treeId)!;
  spendTalentCurrency(state, tree.currency, check.cost);
  const ranks = ((state.talents ??= {})[treeId] ??= {});
  ranks[nodeId] = talentRank(state, treeId, nodeId) + 1;
  return check;
}

/**
 * EINZIGE Lese-API für Talent-Boni: Wert der Wirkungsart über alle gekauften Knoten aller Bäume,
 * aggregiert laut `TALENT_EFFECT_AGGREGATION` (Summe bzw. kleinster positiver Wert). 0 ohne Talente
 * (früher Ausstieg — der Kampf-/Tick-Pfad ruft das häufig).
 *
 * claude:2026-10-18T12:00:00+02:00 — Nur FREIGESCHALTETE Bäume wirken (Chef 18.10.: der Jägerkodex wirkt
 * nach einem Aufstieg erst wieder ab Slayer 85). Ohne Aufstieg bit-identisch: Ränge lassen sich nur in
 * freigeschalteten Bäumen kaufen, und Skill-XP sinkt nie. Gekaufte Ränge bleiben gespeichert (`talentRank`).
 */
export function talentEffect(state: GameState, content: ContentDB, kind: TalentEffectKind): number {
  return aggregateTalentEffect(state, content, kind, true);
}

/**
 * Wie `talentEffect`, aber OHNE Freischalt-Gate: der Wert aller gekauften Ränge. Nur für Besitz-Fragen
 * (z. B. darf der Spielstand die Wahl im zweiten Begleiter-Platz behalten, während der Jägerkodex nach einem
 * Aufstieg ruht), nie für Wirkungen. claude:2026-10-18T12:00:00+02:00
 */
export function talentEffectOwned(state: GameState, content: ContentDB, kind: TalentEffectKind): number {
  return aggregateTalentEffect(state, content, kind, false);
}

/**
 * claude:2026-10-30T19:16:00+01:00 — 1.4.2: Index „Wirkungsart → (Baum, Knoten)“ je Baum-Liste des Contents. Mit 24
 * Narbenbuch-Knoten lesen jetzt viele Pro-Tick-Pfade (Aktionsdauer, Echo, Beete, Fallen) `talentEffect`; der Index spart
 * das Durchlaufen aller Knoten. Reihenfolge = Baum- und Knotenreihenfolge wie zuvor ⇒ Summen bit-identisch. Schlüssel
 * ist das `talentTrees`-Array (Content ist unveränderlich; Tests bauen für eigene Bäume ein neues Array).
 */
const nodesByKindCache = new WeakMap<readonly TalentTreeDef[], Map<TalentEffectKind, Array<{ tree: TalentTreeDef; node: TalentNodeDef }>>>();
const NO_TREES: readonly TalentTreeDef[] = [];

function nodesOfKind(content: ContentDB, kind: TalentEffectKind): ReadonlyArray<{ tree: TalentTreeDef; node: TalentNodeDef }> {
  const trees = content.talentTrees ?? NO_TREES;
  let byKind = nodesByKindCache.get(trees);
  if (!byKind) {
    byKind = new Map();
    for (const tree of trees) {
      for (const node of tree.nodes) {
        const list = byKind.get(node.effect.kind) ?? [];
        list.push({ tree, node });
        byKind.set(node.effect.kind, list);
      }
    }
    nodesByKindCache.set(trees, byKind);
  }
  return byKind.get(kind) ?? [];
}

function aggregateTalentEffect(state: GameState, content: ContentDB, kind: TalentEffectKind, gated: boolean): number {
  const owned = state.talents;
  if (!owned) return 0;
  const mode = TALENT_EFFECT_AGGREGATION[kind];
  let sum = 0;
  let min = Infinity;
  for (const { tree, node } of nodesOfKind(content, kind)) {
    if (!owned[tree.id]) continue;
    const v = talentValueAtRank(node, talentRank(state, tree.id, node.id));
    if (v <= 0) continue;
    if (gated && !talentTreeUnlocked(state, tree)) continue; // erst nach dem Rang-Check: gesperrte Bäume ohne Rang kosten nichts
    sum += v;
    if (v < min) min = v;
  }
  return mode === "sum" ? sum : Number.isFinite(min) ? min : 0;
}
