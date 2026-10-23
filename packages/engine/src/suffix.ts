import type {
  ContentDB,
  GameState,
  ItemDef,
  ItemId,
  ItemInstance,
  RngState,
  SuffixDef,
  SuffixRoll,
} from "@hearthforge/shared";
import { affixAppliesToItem } from "@hearthforge/shared";
import { nextFloat } from "./rng";
import { computeStats } from "./character";
import { getInstance } from "./inventory";
import { mintInstanceId, intakeInstance, type IntakeResult } from "./enchant";

// ───────────────────────────────────────────────────────────────────────────
// Suffix-System (Phase 2, WoW-Stil Random Rolls) — Roll-Mechanik + Apply-Hook.
//
// Determinismus-Disziplin (wie tryPetDrop / Skilling-Buffs): RNG (`state.rng`) wird NUR am
// tatsächlichen Roll-Trigger gezogen — und ZUERST gilt: ohne `content.suffixes`, ohne Chance > 0
// oder ohne passenden Pool gibt `rollSuffix` `undefined` zurück, BEVOR ein `nextFloat` fällt. So
// bleibt die RNG-Sequenz für alle bestehenden Saves/Fixtures bit-identisch, solange content-dev den
// Pool noch nicht befüllt hat. Sobald `content.suffixes` + `suffixChance` existieren, greift es sofort.
// ───────────────────────────────────────────────────────────────────────────

/**
 * lck-Modifikator auf die Suffix-Chance, gedeckelt bei +0.15 (suffix-pool-spec §5: +0.0015 pro
 * ALTEM lck-Punkt). Attribut-Input-Squish (§6.2, a=1/2): lck liest ×0.5 → Koeffizient ×2
 * (0.0015 → 0.003), Chance bit-identisch (Zweierpotenz ⇒ IEEE-754-exakt).
 */
const LCK_PER_POINT = 0.003;
const LCK_CHANCE_CAP = 0.15;
/** Harte Obergrenze der Gesamt-Suffix-Chance (analog Erfolgs-Caps anderer Systeme). */
const SUFFIX_CHANCE_CAP = 0.95;

/**
 * Effektive Suffix-Chance inkl. lck-Modifikator (gedeckelt) und hartem Gesamt-Cap — exakt die
 * Formel aus Roll 1 in `rollSuffix`, als Pure-Funktion für die UI (Live-%-Chip). Zieht KEINEN RNG.
 */
export function effectiveSuffixChance(
  state: GameState,
  content: ContentDB,
  baseChance: number,
): number {
  const lck = computeStats(state, content).attributes.lck ?? 0;
  return Math.min(
    SUFFIX_CHANCE_CAP,
    baseChance + Math.min(LCK_CHANCE_CAP, LCK_PER_POINT * Math.max(0, lck)),
  );
}

/**
 * Typ- und ilvl-gefilterter, deterministisch sortierter Suffix-Pool für ein Basis-Item.
 * Filter: `appliesTo ∩ itemTypeTags(item) ≠ ∅` (ein Schwert zieht nie einen Magier-Suffix) UND
 * `ilvl ≥ minIlvl` (Gating starker Suffixe). Sortierung nach `id` macht den gewichteten Roll
 * unabhängig von der Content-Einfügereihenfolge → stabil reproduzierbar.
 */
export function suffixPool(content: ContentDB, item: ItemDef, ilvl: number): SuffixDef[] {
  const all = content.suffixes;
  if (!all) return [];
  const out: SuffixDef[] = [];
  for (const def of Object.values(all)) {
    if (def.minIlvl !== undefined && ilvl < def.minIlvl) continue;
    if (!affixAppliesToItem(def.appliesTo, item)) continue;
    out.push(def);
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

/** Gewichtete Auswahl (Roll 2) aus dem bereits gefilterten Pool. Zieht genau EINEN nextFloat. */
function pickWeighted(rng: RngState, pool: SuffixDef[]): SuffixDef {
  let total = 0;
  for (const d of pool) total += Math.max(0, d.weight ?? 1);
  if (total <= 0) return pool[0]!; // alle Gewichte 0 → erster (deterministisch); zieht KEINEN RNG
  let r = nextFloat(rng) * total;
  for (const d of pool) {
    r -= Math.max(0, d.weight ?? 1);
    if (r < 0) return d;
  }
  return pool[pool.length - 1]!;
}

/**
 * Würfelt einen Suffix für ein eben gecraftetes/gedropptes Basis-Item. Drei seeded Rolls:
 *  1) hasSuffix — bekommt das Item überhaupt einen Suffix? (`baseChance` + lck-Modifikator)
 *  2) whichSuffix — gewichtete Auswahl aus dem typ-/ilvl-gefilterten Pool
 *  3) roll — Stärke (0..1) innerhalb des ilvl-Bandes (skaliert in `instanceBonusDelta`)
 *
 * `ilvl` = Craft-Skill-Level (bzw. Monster-Level beim Drop). Gibt `SuffixRoll | undefined` zurück.
 * Zieht KEINEN RNG, wenn kein Suffix möglich ist (kein Pool/keine Chance) → Determinismus-sicher.
 *
 * `rng` (Default `state.rng`, OPTIONAL, SAVE_VERSION 72 — Elite-/World-Spawns): erlaubt Aufrufern
 * mit einem EIGENEN, unabhängigen RNG-Strom (z. B. `state.eliteRng`, engine/elites.ts) exakt
 * dieselbe Roll-Mechanik zu nutzen, OHNE `state.rng` zu berühren — alle bestehenden Aufrufer (ohne
 * das Argument) bleiben bit-identisch zum Vorher-Zustand.
 */
export function rollSuffix(
  state: GameState,
  content: ContentDB,
  baseItem: ItemDef,
  ilvl: number,
  baseChance: number,
  rng: RngState = state.rng,
  rollFloor = 0,
): SuffixRoll | undefined {
  if (!content.suffixes) return undefined;
  if (!(baseChance > 0)) return undefined;
  const pool = suffixPool(content, baseItem, ilvl);
  if (pool.length === 0) return undefined;

  // lck-Modifikator (computeStats berührt state.rng NICHT → keine Sequenz-Störung).
  const chance = effectiveSuffixChance(state, content, baseChance);

  // Roll 1 — hasSuffix?
  if (nextFloat(rng) > chance) return undefined;
  // Roll 2 — welcher Suffix?
  const def = pickWeighted(rng, pool);
  // Roll 3 — Stärke. claude:2026-10-24T23:35:00+02:00 — `rollFloor` (Meisterstück, 1.4.0 EV): roll = floor + (1 − floor) × Wurf; 0 = unverändert.
  const raw = nextFloat(rng);
  const roll = rollFloor > 0 ? rollFloor + (1 - rollFloor) * raw : raw;
  return { suffixId: def.id, ilvl: Math.max(1, Math.floor(ilvl)), roll };
}

/**
 * Apply-Hook: erzeugt aus einem Basis-Item + bereits gerolltem Suffix eine frische Item-Instanz
 * (mintet eine deterministische `instanceId`). Analog zur Affix-Anwendung in enchant.ts — nur dass
 * der Suffix-Slot (0..1) belegt wird. Promotion = exakt diese Instanz-Erzeugung (das Basis-Item
 * existierte vorher nicht als Stack — es entsteht direkt als Instanz beim Craft/Drop).
 */
export function createSuffixInstance(
  state: GameState,
  suffix: SuffixRoll,
  baseItemId: ItemId,
): ItemInstance {
  return { instanceId: mintInstanceId(state), baseItemId, affixes: [], suffix };
}

export interface CraftSuffixResult {
  instance: ItemInstance;
  intake: IntakeResult;
}

/**
 * Vollständiger Craft-/Drop-Apply-Hook: würfelt einen Suffix für `baseItemId` (nur Equipment) und —
 * falls einer fällt — erzeugt die Instanz und schleust sie über `intakeInstance` ins Inventar
 * (Auto-Salvage-fähig, Overflow-sicher). Gibt `null` zurück, wenn kein Suffix entsteht (dann bleibt
 * der Output ein normaler Stack, wie bisher). Der Aufrufer (tick/Drop) verbucht bei `!== null` EIN
 * Exemplar als Instanz statt als Stack.
 *
 * `rng` (Default `state.rng`, OPTIONAL, SAVE_VERSION 72): s. `rollSuffix` — durchgereicht für
 * Aufrufer mit eigenem RNG-Strom (z. B. `state.eliteRng`, engine/elites.ts).
 *
 * FRÜH-GARANTIE-SUFFIX (SAVE_VERSION 72, selber Bump, Chef-GO 2026-07-22 „Identitäts-Paket"): DIES
 * ist der EINZIGE Choke-Point für Kill-Loot (combat.ts), Crafting-Output (tick.ts) UND Paragon-
 * Truhen-Loot (paragon.ts) — solange `state.firstSuffixGranted` noch `false` ist UND dieser
 * Kandidat strukturell überhaupt einen Suffix tragen KÖNNTE (`baseChance > 0` — 0/fehlend bedeutet
 * „content-dev hat diese Zeile bewusst suffixlos gehalten", das respektieren wir unverändert), wird
 * die effektive Chance auf 1 angehoben. RNG-Disziplin: KEIN zusätzlicher Zug ggü. dem Normalpfad —
 * `rollSuffix` zieht seine drei Rolls (hasSuffix/welcher/Stärke) exakt so, wie es ein NATÜRLICHER
 * Erfolg bei `baseChance` auch täte; die Garantie verändert nur den VERGLEICHSWERT in Roll 1, nicht
 * die Anzahl der Züge. Ein pool-loses Item (kein `content.suffixes`/kein passender Eintrag) bleibt
 * dabei weiterhin komplett RNG-frei — `rollSuffix` bricht vor jedem Draw ab (Muster unverändert),
 * die Garantie wartet dann einfach auf den nächsten eligiblen Kandidaten. Sobald IRGENDEINE
 * Suffix-Instanz entsteht (ob durch die Garantie erzwungen oder natürlich gewürfelt, bevor die
 * Garantie je zum Zug kam), schaltet sich die Garantie ENDGÜLTIG ab (monoton).
 */
export function tryCraftSuffix(
  state: GameState,
  content: ContentDB,
  baseItemId: ItemId,
  ilvl: number,
  baseChance: number,
  rng: RngState = state.rng,
  rollFloor = 0,
): CraftSuffixResult | null {
  const base = content.items[baseItemId];
  if (!base || base.type !== "equipment") return null;
  const effectiveChance = !state.firstSuffixGranted && baseChance > 0 ? 1 : baseChance;
  const suffix = rollSuffix(state, content, base, ilvl, effectiveChance, rng, rollFloor);
  if (!suffix) return null;
  const instance = createSuffixInstance(state, suffix, baseItemId);
  const intake = intakeInstance(state, content, instance);
  state.firstSuffixGranted = true;
  return { instance, intake };
}

