import type {
  ActionDef,
  ContentDB,
  GameState,
  ItemId,
  LootRoll,
  MonsterDef,
  SkillId,
  TavernGuestDef,
  TavernSeat,
  TavernState,
  TavernTask,
  TavernTaskKind,
  TavernTaskSelect,
  TavernTaskTemplateDef,
} from "@hearthforge/shared";
import {
  BLACK_MARKET_CRATE_PREFIX,
  CAMP_TAVERN_ID,
  COMBAT_SKILL_IDS,
  DUNGEON_VARIANT_PREFIX,
  PARAGON_DUNGEON_ID,
  TAVERN_BANDS,
  TAVERN_COMBAT_XP_BY_BAND,
  TAVERN_CRATE_BONUS_CHANCE,
  TAVERN_GOLD_BY_BAND,
  TAVERN_KILL_COUNT_BY_BAND,
  TAVERN_LEVEL3_GOLD_FACTOR,
  TAVERN_SEATS,
  TAVERN_SWAP_GOLD_PER_BAND,
  defaultTavernState,
  tavernBandForLevel,
} from "@hearthforge/shared";
import { campBuildingLevel } from "./camp";
import { levelFromXp } from "./leveling";
import { itemCount, removeItem } from "./inventory";
import { bankCount } from "./bank";
import { grantLoot } from "./mail";
import { isZoneUnlocked } from "./zones";
import { combatLevel, isDungeonUnlocked } from "./dungeon";
import { slayerRequirementMet } from "./slayer";
import { syncProgression, totalLevel } from "./character";
import { isEliteVariantHuntable } from "./elites";

/**
 * Die Taverne (1.2.0 „Alive", SAVE_VERSION 84 — design/1.2.0-alive/taverne-spec-technik.md, bindend).
 *
 * Vier Plätze, jeden Tag vier Gäste, je EINE Aufgabe ihres Berufs (Vorlage × Band). Annehmen,
 * abgeben, ablehnen. Alles Feste einer Aufgabe (Ziel, Menge, Belohnung) wird bei der VERGABE
 * bestimmt und in `TavernTask` gespeichert — die UI zeigt die Belohnung vorab, die Abgabe zahlt
 * exakt das Gespeicherte (auch wenn sich Content/Level inzwischen geändert haben).
 *
 * DETERMINISMUS-GESETZ: Dieses Modul zieht NIE `state.rng`/`state.eliteRng` und liest NIE
 * Date.now. Jeder „Zufall" ist ein reiner Hash aus (Charakter-Seed, Tagesstempel, Platz,
 * Wechsel-Zähler, Salz) — `tavernHash`. Der Tagesstempel (YYYYMMDD, lokal) kommt wie bei den
 * Dailies vom Client (`refreshDailyQuests`-Muster). Damit bleiben alle Sequenz-Stabilitäts-
 * Fixtures der bestehenden Würfe bit-identisch, und gleicher Save + gleicher Tag ⇒ gleiche Gäste.
 *
 * ROBUSTHEIT: ohne `content.tavernGuests`/`content.tavernTasks` ist alles inert (kein Throw,
 * keine Besetzung). Ein Gast, dessen Vorlagen heute kein gültiges Ziel liefern, fällt heute aus.
 * Bleiben weniger Gäste als Plätze, bleiben Plätze `task: null` (kein Throw, keine Endlosschleife).
 */

// ── Feste Zahlen dieser Phase (Spec §3/§4/§5; die Band-Tabellen liegen in shared) ────────────

/** Kandidaten-Fenster: Aktionen bis `levelRequired ≤ Level + 5` (bevorzugt ≤ Level). */
const TAVERN_LEVEL_HEADROOM = 5;
/** Tier-Boden: nie eine Aktion, deren Stufe mehr als 25 unter dem Level liegt (Spec §3). */
const TAVERN_TIER_FLOOR_BELOW = 25;
/** Gewicht für „erreichbar" (≤ Level) und nochmals für das höchste erreichbare Tier (×3, Spec §3). */
const TAVERN_REACHABLE_WEIGHT = 3;
const TAVERN_TOP_TIER_WEIGHT = 3;
/** Gold-Art-Faktor je Aufgabenart (Spec §4, bindend). */
const TAVERN_KIND_GOLD_FACTOR: Readonly<Record<TavernTaskKind, number>> = {
  deliver: 1.0,
  produce: 1.2,
  run: 1.2,
  kill: 1.3,
  assortment: 1.5,
  dungeon: 2.0,
  champion: 3.0,
};
/** Skill-XP = Arbeitsminuten × 1,5 × bestXpPerMinute (Spec §4). */
const TAVERN_XP_MINUTE_FACTOR = 1.5;
/** Rohstoff-Belohnung: Ziel-Item × ceil(count × 0,4) (Spec §4). */
const TAVERN_REWARD_ITEM_SHARE = 0.4;
/** Handwerks-Aufgaben: zusätzlich die Inputs für ceil(count / 2) weitere Durchläufe (Spec §4). */
const TAVERN_REWARD_INPUT_RUNS_DIVISOR = 2;
/** kill-Belohnung: häufigster Material-Drop × band × 3 (Spec §4). */
const TAVERN_KILL_REWARD_PER_BAND = 3;
/** Dungeon/Champion zahlen die doppelte Slayer-XP des Bands (Spec §4). */
const TAVERN_COMBAT_XP_HEAVY_MULT = 2;
/** Champion-Aufgaben nur ab Band 4 (Spec §3). */
const TAVERN_CHAMPION_MIN_BAND = 4;
/** Gesamtlevel-Bänder für Gäste ohne Skill (Fremder/Karawane): 1–199 / 200–499 / 500–899 / 900–1299 / 1300+. */
const TAVERN_TOTAL_LEVEL_BAND_STEPS: readonly number[] = [200, 500, 900, 1300];
/** Rare-Gäste: alle N Tage (Spec §5: stranger 1/12, ashka 1/4); unbekannte Rare-Gäste alle 6 Tage. */
const TAVERN_RARE_GUEST_PERIOD: Readonly<Record<string, number>> = { stranger: 12, ashka: 4 };
const TAVERN_RARE_GUEST_DEFAULT_PERIOD = 6;
/** Besetzungs-Regeln (Spec §5): höchstens 1 Kampf-Gast (Viktor), höchstens 2 Sammler. */
const TAVERN_MAX_COMBAT_GUESTS = 1;
const TAVERN_MAX_GATHER_GUESTS = 2;
const TAVERN_GATHER_SKILLS: ReadonlySet<SkillId> = new Set(["mining", "woodcutting", "fishing", "foraging"]);
/** Behälter-Inhalt (Spec §7). */
const CRATE_MATERIAL_KINDS = 2;
const CRATE_MATERIAL_QTY_MIN = 3;
const CRATE_MATERIAL_QTY_MAX = 8;
const CRATE_NEXT_BAND_CHANCE = 0.05;
const CRATE_CHAMPION_CHANCE = 0.1;
const CRATE_RUNE_CHANCE = 0.05;
const CRATE_SECOND_GEAR_CHANCE = 0.02;
/** Runen-Tier je Band: I–II Band 1–2, III Band 3–4, IV Band 5 (Spec §7). */
const CRATE_RUNE_TIER_BY_BAND: readonly number[] = [0, 1, 2, 3, 3, 4];
/** Band-Grenzen in Leveln (Aktions-Stufe bzw. Monster-Level): Band b deckt (b−1)·20+1 … b·20, Band 5 offen. */
const TAVERN_BAND_WIDTH = 20;

/** Hash-Salze (feste Zutaten, damit verschiedene Würfe desselben Tags nie denselben Wert teilen). */
const SALT_RARE = 7; // Spec §5: `hash(seed, day, 7)`
const SALT_GUEST = 11;
const SALT_TEMPLATE = 13;
const SALT_TARGET = 17;
const SALT_ASSORTMENT = 19;
const SALT_CRATE_BONUS = 23;
const SALT_CRATE_OPEN = 29;

// ── Reiner Hash ───────────────────────────────────────────────────────────────────────────────

/** Ein mulberry32-Mischschritt auf einem uint32. */
function mix32(a: number): number {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

/**
 * Reiner, zustandsloser Hash (mulberry32-artig) über beliebig viele Zahlen → uint32. Gleiche
 * Zutaten ⇒ gleicher Wert, unabhängig vom Spielstand. Nicht-endliche Zutaten zählen als 0;
 * große Zahlen (Epoch-ms) gehen mit beiden 32-Bit-Hälften ein, damit nichts verloren geht.
 */
export function tavernHash(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    const n = Number.isFinite(p) ? Math.floor(p) : 0;
    const lo = n >>> 0;
    const hi = Math.floor(Math.abs(n) / 4294967296) >>> 0;
    h = mix32(h ^ lo);
    h = mix32(h ^ hi);
  }
  return mix32(h);
}

/** `tavernHash` als Float in [0, 1) — für Chancen-Vergleiche (`< 0,10`) und gewichtete Auswahl. */
export function tavernHashFloat(...parts: number[]): number {
  return tavernHash(...parts) / 4294967296;
}

/** Der Charakter-Seed der Taverne (Spec §5): `character.createdAt` ganzzahlig — nie `state.rng`. */
function tavernSeed(state: GameState): number {
  const raw = state.character?.createdAt;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
}

/** Gewichtete Auswahl über einen Float in [0, 1). Leere Liste ⇒ −1. */
function pickWeighted(weights: readonly number[], r: number): number {
  let total = 0;
  for (const w of weights) total += w > 0 ? w : 0;
  if (total <= 0) return -1;
  let acc = r * total;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i]! > 0 ? weights[i]! : 0;
    if (w <= 0) continue;
    acc -= w;
    if (acc < 0) return i;
  }
  return weights.length - 1;
}

// ── Zustand & Selektoren ──────────────────────────────────────────────────────────────────────

/** Defensiver Zugriff auf den Tavernen-Zustand (handgebaute Test-/Alt-States ohne Feld). */
function tavernOf(state: GameState): TavernState {
  if (!state.tavern || typeof state.tavern !== "object" || !Array.isArray(state.tavern.seats)) {
    state.tavern = defaultTavernState();
  }
  return state.tavern;
}

/** Trägt der Content Gäste UND Vorlagen? Sonst ist die Taverne komplett inert. */
function tavernContentReady(content: ContentDB): boolean {
  return (content.tavernGuests?.length ?? 0) > 0 && (content.tavernTasks?.length ?? 0) > 0;
}

/** Ist die Taverne gebaut (`camp_tavern` ≥ 1)? */
export function tavernBuilt(state: GameState, content: ContentDB): boolean {
  void content; // Signatur-Vertrag (Spec §5); die Stufe lebt im Save, nicht im Katalog
  return campBuildingLevel(state, CAMP_TAVERN_ID) >= 1;
}

/** Ausbaustufe der Taverne (0 = ungebaut). */
export function tavernLevel(state: GameState): number {
  return campBuildingLevel(state, CAMP_TAVERN_ID);
}

/** Die vier Plätze (leer vor der ersten Besetzung). Rein lesend. */
export function tavernSeats(state: GameState): readonly TavernSeat[] {
  return Array.isArray(state.tavern?.seats) ? state.tavern.seats : [];
}

export function tavernGuestDef(content: ContentDB, guestId: string): TavernGuestDef | null {
  return content.tavernGuests?.find((g) => g.id === guestId) ?? null;
}

export function tavernTemplateDef(content: ContentDB, templateId: string): TavernTaskTemplateDef | null {
  return content.tavernTasks?.find((t) => t.id === templateId) ?? null;
}

function skillLevel(state: GameState, skill: SkillId): number {
  return levelFromXp(state.skills[skill]?.xp ?? 0);
}

function isCombatSkill(skill: SkillId): boolean {
  return skill === "slayer" || COMBAT_SKILL_IDS.includes(skill);
}

/**
 * Band eines Gastes (Spec §3): über den Skill des Gastes (`tavernBandForLevel`, 1–20 → 1 …
 * 81–99 → 5); Gäste ohne Skill (Fremder, Karawane) über das Gesamtlevel
 * (1–199 / 200–499 / 500–899 / 900–1299 / 1300+).
 */
export function tavernBandFor(state: GameState, content: ContentDB, guest: TavernGuestDef): number {
  if (guest.skill) return tavernBandForLevel(skillLevel(state, guest.skill));
  const total = totalLevel(state, content);
  let band = 1;
  for (const step of TAVERN_TOTAL_LEVEL_BAND_STEPS) if (total >= step) band++;
  return Math.max(1, Math.min(TAVERN_BANDS, band));
}

/** Item-ID des Schwarzmarktbehälters eines Bands (`black_market_crate_i` … `_v`). */
export function tavernCrateItemId(band: number): ItemId {
  const roman = ["i", "ii", "iii", "iv", "v"];
  const b = Math.max(1, Math.min(TAVERN_BANDS, Math.floor(band)));
  return `${BLACK_MARKET_CRATE_PREFIX}${roman[b - 1]}`;
}

/** Behälter-Stufe eines Items (1..5) oder null, wenn es kein Schwarzmarktbehälter ist. */
export function tavernCrateTier(content: ContentDB, itemId: ItemId): number | null {
  const item = content.items[itemId];
  const effect = item?.consumable;
  if (!item || item.type !== "consumable" || effect?.kind !== "blackMarketCrate") return null;
  if (typeof effect.tier === "number" && Number.isFinite(effect.tier)) {
    return Math.max(1, Math.min(TAVERN_BANDS, Math.floor(effect.tier)));
  }
  // Fallback: Stufe aus dem ID-Suffix (black_market_crate_iii → 3).
  const suffix = itemId.startsWith(BLACK_MARKET_CRATE_PREFIX) ? itemId.slice(BLACK_MARKET_CRATE_PREFIX.length) : "";
  const idx = ["i", "ii", "iii", "iv", "v"].indexOf(suffix);
  return idx >= 0 ? idx + 1 : 1;
}

// ── Content-Rechnungen (rein, ohne Spielstand-Mutation) ──────────────────────────────────────

/** Haupt-Output einer Aktion: der Loot-Eintrag mit der höchsten Chance (Gleichstand: der erste), sofern das Item existiert. */
function mainOutput(content: ContentDB, action: ActionDef): LootRoll | null {
  let best: LootRoll | null = null;
  for (const roll of action.loot) {
    if (!content.items[roll.itemId]) continue;
    if (!best || roll.chance > best.chance) best = roll;
  }
  return best;
}

/** Erwartete Stückzahl eines Loot-Eintrags je Durchlauf (Chance × Mittelwert der Spanne), min. > 0. */
function expectedQty(roll: LootRoll): number {
  const mean = (Math.max(0, roll.min) + Math.max(0, roll.max)) / 2;
  const chance = Math.max(0, Math.min(1, roll.chance));
  const q = mean * chance;
  return q > 0 ? q : 1;
}

/**
 * Beste Skill-XP je Minute eines Skills auf `level` (Spec §4): Maximum über alle Aktionen des
 * Skills mit `levelRequired ≤ level` von `xp / (durationMs / 60 000)` — reine Content-Rechnung,
 * Boni ignoriert. Hat der Skill keine erreichbare Aktion, zählt die niedrigste Aktion (Level-1-
 * Charakter mit Level-3-Erstaktion); ganz ohne Aktionen 0.
 */
export function bestXpPerMinute(content: ContentDB, skill: SkillId, level: number): number {
  let best = 0;
  let fallbackLr = Infinity;
  let fallbackRate = 0;
  const consider = (lr: number, rate: number): void => {
    if (!(rate > 0)) return;
    if (lr <= level) {
      if (rate > best) best = rate;
    } else if (lr < fallbackLr) {
      fallbackLr = lr;
      fallbackRate = rate;
    }
  };
  for (const a of Object.values(content.actions)) {
    if (a.skill !== skill || !(a.durationMs > 0)) continue;
    consider(a.levelRequired ?? 1, a.xp / (a.durationMs / 60_000));
  }
  // Anbau hat keine Aktionen — seine „Aktionen" sind die Sorten (Reifezeit = Dauer).
  if (skill === FARMING_SKILL) {
    for (const a of cropPseudoActions(content)) consider(a.levelRequired ?? 1, a.xp / (a.durationMs / 60_000));
  }
  return best > 0 ? best : fallbackRate;
}

const FARMING_SKILL: SkillId = "farming";
/** Präfix der Anbau-Pseudo-Aktions-IDs (nie in `content.actions`, nie als `actionId` gespeichert). */
const CROP_ACTION_PREFIX = "crop:";

/**
 * Anbau als Pseudo-Aktionen (Billys Aufgaben): je Sorte EINE Aktion mit Reifezeit als Dauer, Saat als
 * Input und Ertrag als Haupt-Output — damit Mengen-/Belohnungs-Formeln und Filter (`itemType`,
 * `hasInputs`) unverändert greifen. `producedById` zählt die Ernte (farming.ts), also passt
 * "produce"; "run" gibt es für Beete nicht (kein Aktions-Durchlauf). Nach Sorten-ID sortiert.
 */
function cropPseudoActions(content: ContentDB): ActionDef[] {
  const crops = content.crops;
  if (!crops) return [];
  const out: ActionDef[] = [];
  for (const id of Object.keys(crops).sort()) {
    const c = crops[id]!;
    if (!c || !(c.growMs > 0) || !content.items[c.yieldItem]) continue;
    out.push({
      id: `${CROP_ACTION_PREFIX}${c.id}`,
      name: c.name,
      skill: FARMING_SKILL,
      durationMs: c.growMs,
      xp: c.xp,
      levelRequired: c.levelRequired,
      inputs: content.items[c.seedItem] ? [{ itemId: c.seedItem, qty: 1 }] : undefined,
      loot: [{ itemId: c.yieldItem, chance: 1, min: c.yieldMin, max: c.yieldMax }],
    });
  }
  return out;
}

/** Häufigster Material-Drop eines Monsters (höchste Tabellen-Chance, Typ material) oder null. */
function commonMaterialDrop(content: ContentDB, monster: MonsterDef): ItemId | null {
  let best: LootRoll | null = null;
  for (const roll of monster.loot) {
    if (content.items[roll.itemId]?.type !== "material") continue;
    if (!best || roll.chance > best.chance) best = roll;
  }
  return best?.itemId ?? null;
}

interface ActionCandidate {
  action: ActionDef;
  roll: LootRoll;
  levelRequired: number;
  weight: number;
  /** Anbau-Pseudo-Aktion (Sorte) — bekommt KEINE `actionId` (nichts einzureihen). */
  isCrop: boolean;
}

/**
 * Kandidaten-Aktionen einer Vorlage (Spec §3): Aktionen des Skills mit `levelRequired ≤ Level + 5`,
 * gefiltert nach `select` (Kategorien, inputs ja/nein, Item-Typ/Slot des Haupt-Outputs). Gewicht:
 * erreichbar (≤ Level) ×3, das höchste erreichbare Tier nochmals ×3. Tier-Boden: nie eine Aktion
 * unter `Level − 25` — außer sie IST das höchste erreichbare Tier (ein Level-99-Held mit einem
 * Skill, dessen Spitze bei 60 liegt, bekommt sonst nie eine Aufgabe). Ohne `select.skill` (Gäste
 * ohne Beruf) alle Nicht-Kampf-Skills, je Aktion mit dem Level IHRES Skills gerechnet.
 * Deterministische Reihenfolge (nach Aktions-ID), unabhängig von der Einfügereihenfolge im Content.
 */
function actionCandidates(
  state: GameState,
  content: ContentDB,
  select: TavernTaskSelect,
  guestSkill: SkillId | null,
  allowCrops: boolean,
): ActionCandidate[] {
  const skill = select.skill ?? guestSkill ?? null;
  const raw: { action: ActionDef; roll: LootRoll; lr: number; level: number; isCrop: boolean }[] = [];
  const ids = Object.keys(content.actions).sort();
  const pool: { action: ActionDef; isCrop: boolean }[] = ids.map((id) => ({ action: content.actions[id]!, isCrop: false }));
  if (allowCrops && (skill === null || skill === FARMING_SKILL)) {
    for (const a of cropPseudoActions(content)) pool.push({ action: a, isCrop: true });
  }
  for (const { action: a, isCrop } of pool) {
    if (skill ? a.skill !== skill : isCombatSkill(a.skill)) continue;
    if (!(a.durationMs > 0)) continue;
    const level = skillLevel(state, a.skill);
    const lr = a.levelRequired ?? 1;
    if (lr > level + TAVERN_LEVEL_HEADROOM) continue;
    const hasInputs = !!a.inputs && a.inputs.length > 0;
    if (select.hasInputs !== undefined && select.hasInputs !== hasInputs) continue;
    if (select.categories && select.categories.length > 0) {
      if (!a.category || !select.categories.includes(a.category)) continue;
    }
    const roll = mainOutput(content, a);
    if (!roll) continue;
    const item = content.items[roll.itemId]!;
    if (select.itemType && item.type !== select.itemType) continue;
    if (select.equipSlots && select.equipSlots.length > 0) {
      if (!item.slot || !select.equipSlots.includes(item.slot)) continue;
    }
    raw.push({ action: a, roll, lr, level, isCrop });
  }
  // Höchstes erreichbares Tier je Skill (Gäste ohne Beruf mischen mehrere Skills).
  const top = new Map<SkillId, number>();
  for (const c of raw) {
    if (c.lr <= c.level) top.set(c.action.skill, Math.max(top.get(c.action.skill) ?? 0, c.lr));
  }
  const out: ActionCandidate[] = [];
  for (const c of raw) {
    const t = top.get(c.action.skill);
    const floor = t === undefined ? c.level - TAVERN_TIER_FLOOR_BELOW : Math.min(c.level - TAVERN_TIER_FLOOR_BELOW, t);
    if (c.lr < floor) continue;
    const weight = (c.lr <= c.level ? TAVERN_REACHABLE_WEIGHT : 1) * (t !== undefined && c.lr === t ? TAVERN_TOP_TIER_WEIGHT : 1);
    out.push({ action: c.action, roll: c.roll, levelRequired: c.lr, weight, isCrop: c.isCrop });
  }
  return out;
}

/**
 * kill-Kandidaten (Spec §3): Welt-Monster freigeschalteter Zonen (kein Turm, kein dungeonOnly,
 * kein dg_-Zwilling, Slayer-Anforderung erfüllt — dasselbe Sieb wie der Slayer-Welt-Pool) mit
 * Level ≤ Kampflevel + 5; Gewichtung wie bei Aktionen (Level statt Tier).
 */
function killCandidates(state: GameState, content: ContentDB): { monster: MonsterDef; weight: number }[] {
  const cl = combatLevel(state);
  const raw: MonsterDef[] = [];
  for (const id of Object.keys(content.monsters).sort()) {
    const m = content.monsters[id]!;
    if (m.slayerFloor != null || m.zone === "slayer_tower" || m.dungeonOnly) continue;
    if (m.id.startsWith(DUNGEON_VARIANT_PREFIX)) continue;
    if (m.zone != null && !isZoneUnlocked(state, content, m.zone)) continue;
    if (!slayerRequirementMet(state, content, m.id)) continue;
    if (m.level > cl + TAVERN_LEVEL_HEADROOM) continue;
    raw.push(m);
  }
  let top: number | undefined;
  for (const m of raw) if (m.level <= cl) top = Math.max(top ?? 0, m.level);
  const floor = top === undefined ? cl - TAVERN_TIER_FLOOR_BELOW : Math.min(cl - TAVERN_TIER_FLOOR_BELOW, top);
  const out: { monster: MonsterDef; weight: number }[] = [];
  for (const m of raw) {
    if (m.level < floor) continue;
    const weight = (m.level <= cl ? TAVERN_REACHABLE_WEIGHT : 1) * (top !== undefined && m.level === top ? TAVERN_TOP_TIER_WEIGHT : 1);
    out.push({ monster: m, weight });
  }
  return out;
}

/** dungeon-Kandidaten: freigeschaltete Dungeons (ohne Paragonturm) mit Empfehlung ≤ Kampflevel + 5. */
function dungeonCandidates(state: GameState, content: ContentDB): { id: string; weight: number }[] {
  const cl = combatLevel(state);
  const out: { id: string; weight: number; level: number }[] = [];
  for (const d of content.dungeons) {
    if (d.id === PARAGON_DUNGEON_ID || d.encounters.length === 0) continue;
    if (!isDungeonUnlocked(state, content, d.id)) continue;
    if (d.requiredLevel > cl + TAVERN_LEVEL_HEADROOM) continue;
    out.push({ id: d.id, level: d.requiredLevel, weight: 1 });
  }
  let top: number | undefined;
  for (const d of out) if (d.level <= cl) top = Math.max(top ?? 0, d.level);
  for (const d of out) {
    d.weight = (d.level <= cl ? TAVERN_REACHABLE_WEIGHT : 1) * (top !== undefined && d.level === top ? TAVERN_TOP_TIER_WEIGHT : 1);
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** champion-Kandidaten: im Codex bekannte, jagdbare Varianten freigeschalteter Zonen. */
function championCandidates(state: GameState, content: ContentDB): string[] {
  const codex = state.eliteCodex ?? {};
  const elites = content.elites ?? {};
  const out: string[] = [];
  for (const id of Object.keys(codex).sort()) {
    const v = elites[id];
    if (!v || !isEliteVariantHuntable(content, v)) continue;
    if (!isZoneUnlocked(state, content, v.zone)) continue;
    out.push(id);
  }
  return out;
}

// ── Aufgaben-Vergabe ──────────────────────────────────────────────────────────────────────────

/** Hash-Zutaten einer Vergabe: ein Platz an einem Tag nach n Wechseln. */
interface RollContext {
  seed: number;
  day: number;
  seat: number;
  swaps: number;
}

/** Gold einer Aufgabe (Spec §4): Band-Tabelle × Art-Faktor × (Taverne III ? 1,15 : 1), gerundet. */
function taskGold(state: GameState, band: number, kind: TavernTaskKind): number {
  const base = TAVERN_GOLD_BY_BAND[band] ?? 0;
  const level3 = tavernLevel(state) >= 3 ? TAVERN_LEVEL3_GOLD_FACTOR : 1;
  return Math.round(base * TAVERN_KIND_GOLD_FACTOR[kind] * level3);
}

/** Arbeitsminuten einer Vorlage für ein Band (Index band−1; fehlende Werte fallen auf den letzten/0). */
function templateMinutes(tpl: TavernTaskTemplateDef, band: number): number {
  const list = tpl.minutes ?? [];
  const v = list[band - 1] ?? list[list.length - 1] ?? 0;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/** Fügt `qty` von `id` in eine Belohnungsliste ein (gleiche IDs werden zusammengeführt). */
function addReward(list: { id: ItemId; qty: number }[], id: ItemId, qty: number): void {
  if (!(qty > 0)) return;
  const q = Math.ceil(qty);
  const existing = list.find((e) => e.id === id);
  if (existing) existing.qty += q;
  else list.push({ id, qty: q });
}

/** Skill-XP einer Aktions-Aufgabe (Spec §4): Minuten × 1,5 × bestXpPerMinute, gerundet. */
function actionTaskXp(content: ContentDB, tpl: TavernTaskTemplateDef, band: number, skill: SkillId, level: number): number {
  return Math.round(templateMinutes(tpl, band) * TAVERN_XP_MINUTE_FACTOR * bestXpPerMinute(content, skill, level));
}

/**
 * Würfelt EINE Aufgabe aus Vorlage × Band (Spec §3/§4). null = kein gültiges Ziel (Vorlage fällt
 * heute aus). Alles Feste (Ziel, Menge, Belohnung, Behälter-Bezahlung) wird hier fixiert.
 */
function buildTask(
  state: GameState,
  content: ContentDB,
  guest: TavernGuestDef,
  tpl: TavernTaskTemplateDef,
  band: number,
  ctx: RollContext,
  templateIndex: number,
): TavernTask | null {
  const kind = tpl.kind;
  const r = tavernHashFloat(ctx.seed, ctx.day, ctx.seat, ctx.swaps, SALT_TARGET, templateIndex);
  // Fremder/Karawane (Gäste ohne Beruf) zahlen Behälter statt Gold + Rohstoffe — nur wenn der
  // Content den Behälter des Bands überhaupt kennt (sonst Gold + Rohstoffe wie alle anderen).
  const paysCrate = guest.skill === null && !!content.items[tavernCrateItemId(band)];
  const base = { templateId: tpl.id, kind, band, accepted: false, baseline: 0, paysCrate };

  switch (kind) {
    case "deliver":
    case "produce":
    case "run": {
      const cands = actionCandidates(state, content, tpl.select ?? {}, guest.skill, kind !== "run");
      if (cands.length === 0) return null;
      const idx = pickWeighted(cands.map((c) => c.weight), r);
      if (idx < 0) return null;
      const c = cands[idx]!;
      const minutes = templateMinutes(tpl, band);
      const runs = Math.max(1, Math.round((minutes * 60_000) / c.action.durationMs));
      const count = kind === "run" ? runs : Math.max(1, Math.round((minutes * 60_000) / c.action.durationMs * expectedQty(c.roll)));
      const rewardItems: { id: ItemId; qty: number }[] = [];
      if (!paysCrate) {
        addReward(rewardItems, c.roll.itemId, count * TAVERN_REWARD_ITEM_SHARE);
        if (c.action.inputs && c.action.inputs.length > 0) {
          const extraRuns = Math.ceil(count / TAVERN_REWARD_INPUT_RUNS_DIVISOR);
          for (const input of c.action.inputs) {
            if (content.items[input.itemId]) addReward(rewardItems, input.itemId, input.qty * extraRuns);
          }
        }
      }
      const skill = c.action.skill;
      return {
        ...base,
        targetId: kind === "run" ? c.action.id : c.roll.itemId,
        ...(c.isCrop ? {} : { actionId: c.action.id }),
        count,
        requiredLevel: c.levelRequired,
        rewardGold: paysCrate ? 0 : taskGold(state, band, kind),
        rewardXp: actionTaskXp(content, tpl, band, skill, skillLevel(state, skill)),
        rewardSkill: skill,
        rewardItems,
      };
    }
    case "assortment": {
      const cands = actionCandidates(state, content, tpl.select ?? {}, guest.skill, true);
      // Je Item nur der beste Kandidat (dedupliziert nach Haupt-Output).
      const byItem = new Map<ItemId, ActionCandidate>();
      for (const c of cands) {
        const prev = byItem.get(c.roll.itemId);
        if (!prev || c.weight > prev.weight) byItem.set(c.roll.itemId, c);
      }
      const pool = [...byItem.values()];
      if (pool.length < 3) return null;
      const picked: ActionCandidate[] = [];
      for (let k = 0; k < 3; k++) {
        const rk = tavernHashFloat(ctx.seed, ctx.day, ctx.seat, ctx.swaps, SALT_ASSORTMENT, templateIndex, k);
        const idx = pickWeighted(pool.map((c) => c.weight), rk);
        if (idx < 0) return null;
        picked.push(pool[idx]!);
        pool.splice(idx, 1);
      }
      const first = picked[0]!;
      const minutes = templateMinutes(tpl, band);
      const single = Math.max(1, Math.round((minutes * 60_000) / first.action.durationMs * expectedQty(first.roll)));
      const per = Math.max(1, Math.ceil(single / 3));
      const rewardItems: { id: ItemId; qty: number }[] = [];
      if (!paysCrate) for (const c of picked) addReward(rewardItems, c.roll.itemId, per * TAVERN_REWARD_ITEM_SHARE);
      const skill = tpl.select?.skill ?? first.action.skill;
      return {
        ...base,
        targetId: first.roll.itemId,
        targetIds: picked.map((c) => c.roll.itemId),
        count: per * 3,
        requiredLevel: Math.max(...picked.map((c) => c.levelRequired)),
        rewardGold: paysCrate ? 0 : taskGold(state, band, kind),
        rewardXp: actionTaskXp(content, tpl, band, skill, skillLevel(state, skill)),
        rewardSkill: skill,
        rewardItems,
      };
    }
    case "kill": {
      const cands = killCandidates(state, content);
      if (cands.length === 0) return null;
      const idx = pickWeighted(cands.map((c) => c.weight), r);
      if (idx < 0) return null;
      const m = cands[idx]!.monster;
      const rewardItems: { id: ItemId; qty: number }[] = [];
      const drop = commonMaterialDrop(content, m);
      if (!paysCrate && drop) addReward(rewardItems, drop, band * TAVERN_KILL_REWARD_PER_BAND);
      return {
        ...base,
        targetId: m.id,
        count: TAVERN_KILL_COUNT_BY_BAND[band] ?? 8,
        requiredLevel: 0,
        rewardGold: paysCrate ? 0 : taskGold(state, band, kind),
        rewardXp: TAVERN_COMBAT_XP_BY_BAND[band] ?? 0,
        rewardSkill: "slayer",
        rewardItems,
      };
    }
    case "dungeon": {
      const cands = dungeonCandidates(state, content);
      if (cands.length === 0) return null;
      const idx = pickWeighted(cands.map((c) => c.weight), r);
      if (idx < 0) return null;
      return {
        ...base,
        targetId: cands[idx]!.id,
        count: 1,
        requiredLevel: 0,
        rewardGold: paysCrate ? 0 : taskGold(state, band, kind),
        rewardXp: (TAVERN_COMBAT_XP_BY_BAND[band] ?? 0) * TAVERN_COMBAT_XP_HEAVY_MULT,
        rewardSkill: "slayer",
        rewardItems: [],
      };
    }
    case "champion": {
      if (band < TAVERN_CHAMPION_MIN_BAND) return null;
      const cands = championCandidates(state, content);
      if (cands.length === 0) return null;
      const idx = Math.min(cands.length - 1, Math.floor(r * cands.length));
      return {
        ...base,
        targetId: cands[idx]!,
        count: 1,
        requiredLevel: 0,
        rewardGold: paysCrate ? 0 : taskGold(state, band, kind),
        rewardXp: (TAVERN_COMBAT_XP_BY_BAND[band] ?? 0) * TAVERN_COMBAT_XP_HEAVY_MULT,
        rewardSkill: "slayer",
        rewardItems: [],
      };
    }
    default:
      return null;
  }
}

/**
 * Würfelt die Tagesaufgabe EINES Gastes: seine Vorlagen im Band-Fenster in Hash-Reihenfolge,
 * die erste mit gültigem Ziel gewinnt. null = der Gast fällt heute aus.
 */
function rollTaskForGuest(state: GameState, content: ContentDB, guest: TavernGuestDef, ctx: RollContext): TavernTask | null {
  const band = tavernBandFor(state, content, guest);
  const templates = (content.tavernTasks ?? [])
    .map((tpl, index) => ({ tpl, index }))
    .filter(({ tpl }) => tpl.guestId === guest.id)
    .filter(({ tpl }) => (tpl.minBand === undefined || band >= tpl.minBand) && (tpl.maxBand === undefined || band <= tpl.maxBand))
    .map((e) => ({ ...e, h: tavernHash(ctx.seed, ctx.day, ctx.seat, ctx.swaps, SALT_TEMPLATE, e.index) }))
    .sort((a, b) => a.h - b.h || a.index - b.index);
  for (const { tpl, index } of templates) {
    const task = buildTask(state, content, guest, tpl, band, ctx, index);
    if (task) return task;
  }
  return null;
}

/** Ist ein Rare-Gast heute überhaupt im Pool? (`hash(seed, day, 7) % Periode === 0`, Spec §5) */
function rareGuestToday(guest: TavernGuestDef, seed: number, day: number): boolean {
  if (guest.rarity !== "rare") return true;
  const period = TAVERN_RARE_GUEST_PERIOD[guest.id] ?? TAVERN_RARE_GUEST_DEFAULT_PERIOD;
  return tavernHash(seed, day, SALT_RARE) % period === 0;
}

function isGatherGuest(g: TavernGuestDef): boolean {
  return g.skill !== null && TAVERN_GATHER_SKILLS.has(g.skill);
}

function isCombatGuest(g: TavernGuestDef): boolean {
  return g.skill !== null && isCombatSkill(g.skill);
}

/**
 * Besetzt EINEN Platz neu (Spec §5): Kandidaten = Gäste mit `givesTasks`, die nicht schon sitzen,
 * heute im Pool sind (Rare-Tage) und die Besetzungs-Regeln wahren (≤ 1 Kampf-Gast, ≤ 2 Sammler).
 * Rare-Gäste zuerst (wenn sie kommen, kommen sie), dann Hash-Reihenfolge; der erste Gast mit
 * gültiger Aufgabe gewinnt. null = niemand verfügbar (Platz bleibt frei).
 */
function fillSeat(
  state: GameState,
  content: ContentDB,
  day: number,
  seatIndex: number,
  swaps: number,
  exclude: ReadonlySet<string>,
  seated: readonly TavernGuestDef[],
): { guestId: string; task: TavernTask } | null {
  const guests = content.tavernGuests ?? [];
  const seed = tavernSeed(state);
  const combatSeated = seated.filter(isCombatGuest).length;
  const gatherSeated = seated.filter(isGatherGuest).length;
  const cands = guests
    .map((g, index) => ({ g, index }))
    .filter(({ g }) => g.givesTasks && !exclude.has(g.id))
    .filter(({ g }) => rareGuestToday(g, seed, day))
    .filter(({ g }) => !(isCombatGuest(g) && combatSeated >= TAVERN_MAX_COMBAT_GUESTS))
    .filter(({ g }) => !(isGatherGuest(g) && gatherSeated >= TAVERN_MAX_GATHER_GUESTS))
    .map((e) => ({ ...e, rare: e.g.rarity === "rare" ? 0 : 1, h: tavernHash(seed, day, seatIndex, swaps, SALT_GUEST, e.index) }))
    .sort((a, b) => a.rare - b.rare || a.h - b.h || a.index - b.index);
  const ctx: RollContext = { seed, day, seat: seatIndex, swaps };
  for (const { g } of cands) {
    const task = rollTaskForGuest(state, content, g, ctx);
    if (task) return { guestId: g.id, task };
  }
  return null;
}

/** Gast-Definitionen aller BESETZTEN Plätze außer `skipIndex` (für Besetzungs-Regeln + Ausschluss). */
function seatedGuests(content: ContentDB, seats: readonly TavernSeat[], skipIndex: number): { defs: TavernGuestDef[]; ids: Set<string> } {
  const defs: TavernGuestDef[] = [];
  const ids = new Set<string>();
  seats.forEach((s, i) => {
    if (i === skipIndex || !s || !s.guestId) return;
    ids.add(s.guestId);
    const def = tavernGuestDef(content, s.guestId);
    if (def) defs.push(def);
  });
  return { defs, ids };
}

/**
 * Bringt die Taverne auf den Kalendertag `day` (YYYYMMDD, vom Client — die Engine erzeugt keine
 * Zeit). Idempotent: gleicher Tag und alle Plätze besetzt ⇒ false. Neuer Tag ⇒ `swapsUsed = 0`,
 * `deliveredToday = 0`, Wechsel-Zähler der Plätze auf 0, alle NICHT angenommenen Plätze neu
 * besetzt (angenommene Aufgaben überleben den Tageswechsel samt Gast). Auch am selben Tag werden
 * freie Plätze (`task: null`, z. B. nach sanitize) nachbesetzt. true, wenn mindestens ein Platz
 * neu besetzt wurde. Ungebaut oder ohne Tavernen-Content: false (inert).
 *
 * Uhr-Rücksprung (Muster refreshDailyQuests): ein Tag HINTER dem zuletzt gesehenen löst nichts aus.
 */
export function tavernRefresh(state: GameState, content: ContentDB, day: number): boolean {
  if (!Number.isFinite(day)) return false;
  if (!tavernContentReady(content) || !tavernBuilt(state, content)) return false;
  const t = tavernOf(state);
  if (t.day > 0 && day < t.day) return false;
  const newDay = day !== t.day;
  if (newDay) {
    t.day = day;
    t.swapsUsed = 0;
    t.deliveredToday = 0;
    for (const s of t.seats) if (s) s.swaps = 0;
  }
  // Länge auf TAVERN_SEATS bringen (Erstbesetzung / verkürzte Alt-Form); neue Plätze starten leer.
  const seats: TavernSeat[] = [];
  for (let i = 0; i < TAVERN_SEATS; i++) {
    const s = t.seats[i];
    seats.push(s && typeof s === "object" ? s : { guestId: "", task: null, swaps: 0 });
  }
  t.seats = seats;

  let changed = false;
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i]!;
    const keep = seat.task !== null && (!newDay || seat.task.accepted);
    if (keep) continue;
    const { defs, ids } = seatedGuests(content, seats, i);
    // Am selben Tag darf der bisherige Gast (Platz leer, z. B. nach sanitize) wiederkommen; beim
    // Tageswechsel gilt die normale Hash-Auswahl über alle nicht sitzenden Gäste.
    const filled = fillSeat(state, content, day, i, seat.swaps, ids, defs);
    if (!filled) {
      if (seat.task !== null) {
        seat.task = null;
        changed = true;
      }
      continue;
    }
    seat.guestId = filled.guestId;
    seat.task = filled.task;
    changed = true;
  }
  return changed;
}

// ── Wechsel ───────────────────────────────────────────────────────────────────────────────────

/** Gratis-Wechsel pro Tag: 1 + (Taverne ≥ II ? 1 : 0); ungebaut 0. */
export function tavernFreeSwaps(state: GameState, content: ContentDB): number {
  if (!tavernBuilt(state, content)) return 0;
  return 1 + (tavernLevel(state) >= 2 ? 1 : 0);
}

/** Platz-Eintrag oder null (ungültiger Index / leere Taverne). Rein lesend. */
function seatAt(state: GameState, seatIndex: number): TavernSeat | null {
  const seats = tavernSeats(state);
  if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex >= seats.length) return null;
  return seats[seatIndex] ?? null;
}

/** Band eines Platzes für die Wechselkosten: Band der Aufgabe, sonst Band des Gastes, sonst 1. */
function seatBand(state: GameState, content: ContentDB, seat: TavernSeat): number {
  if (seat.task) return Math.max(1, Math.min(TAVERN_BANDS, seat.task.band));
  const guest = tavernGuestDef(content, seat.guestId);
  return guest ? tavernBandFor(state, content, guest) : 1;
}

/** Kosten des nächsten Wechsels an `seat`: 0 solange Gratis-Kontingent, sonst 100 × Band. */
export function tavernSwapCost(state: GameState, content: ContentDB, seat: number): number {
  const s = seatAt(state, seat);
  if (!s) return 0;
  if ((state.tavern?.swapsUsed ?? 0) < tavernFreeSwaps(state, content)) return 0;
  return TAVERN_SWAP_GOLD_PER_BAND * seatBand(state, content, s);
}

/** Maschinenlesbare Gründe von `swapTavernGuest` (Vertrag für die UI). */
export type TavernSwapReason =
  | "ok"
  | "not_built" // Taverne steht nicht (oder kein Tavernen-Content)
  | "no_seat" // ungültiger Platz-Index / Taverne noch nie besetzt
  | "accepted" // angenommene Aufgabe kann nicht weggeschickt werden
  | "no_gold" // Wechsel kostet Gold, Gold reicht nicht
  | "no_guest"; // niemand kann nachrücken (zu wenige Gäste mit gültigem Ziel)

/**
 * Schickt den Gast an `seat` weg und besetzt den Platz sofort neu (Hash mit `swaps + 1`). Gratis
 * innerhalb des Tageskontingents, sonst `100 × Band` Gold (über `stats.goldSpent`, Muster shop).
 * Angenommene Aufgaben sind nicht wechselbar. Findet sich kein Nachrücker, passiert NICHTS
 * (kein Gold weg, Platz unverändert).
 */
export function swapTavernGuest(state: GameState, content: ContentDB, seat: number, day: number): TavernSwapReason {
  if (!tavernContentReady(content) || !tavernBuilt(state, content)) return "not_built";
  const s = seatAt(state, seat);
  if (!s) return "no_seat";
  if (s.task?.accepted) return "accepted";
  const cost = tavernSwapCost(state, content, seat);
  if (state.character.gold < cost) return "no_gold";
  const t = tavernOf(state);
  const useDay = Number.isFinite(day) ? day : t.day;
  const { defs, ids } = seatedGuests(content, t.seats, seat);
  if (s.guestId) ids.add(s.guestId); // der Weggeschickte kommt nicht sofort zurück
  const filled = fillSeat(state, content, useDay, seat, s.swaps + 1, ids, defs);
  if (!filled) return "no_guest";
  if (cost > 0) {
    state.character.gold -= cost;
    state.stats.goldSpent += cost;
  }
  t.swapsUsed += 1;
  s.swaps += 1;
  s.guestId = filled.guestId;
  s.task = filled.task;
  return "ok";
}

// ── Annahme, Fortschritt, Abgabe ──────────────────────────────────────────────────────────────

/** Aktueller ROHER Zählerstand des Aufgaben-Ziels (Baseline-Quelle; deliver/assortment: 0). */
function taskCounter(state: GameState, task: TavernTask): number {
  switch (task.kind) {
    case "produce":
      return state.stats.producedById?.[task.targetId] ?? 0;
    case "run":
      return state.stats.actionRunsById?.[task.targetId] ?? 0;
    case "kill":
      return state.monsterKills?.[task.targetId] ?? 0;
    case "dungeon":
      return state.dungeonsCleared?.[task.targetId] ?? 0;
    case "champion":
      return state.eliteCodex?.[task.targetId]?.kills ?? 0;
    default:
      return 0;
  }
}

/**
 * Nimmt die Aufgabe an `seat` an: `accepted = true`, `baseline` = aktueller Zählerstand (Muster
 * `repeatBaseline` der Quests) — Fortschritt zählt ab jetzt. false, wenn nichts anzunehmen ist
 * (ungebaut, leerer Platz, schon angenommen).
 */
export function acceptTavernTask(state: GameState, content: ContentDB, seat: number): boolean {
  if (!tavernBuilt(state, content)) return false;
  const s = seatAt(state, seat);
  const task = s?.task ?? null;
  if (!task || task.accepted) return false;
  task.accepted = true;
  task.baseline = taskCounter(state, task);
  return true;
}

/** Bestand eines Items in Inventar (nur plain Stacks) + Lager. */
function stockOf(state: GameState, itemId: ItemId): number {
  return itemCount(state.inventory, itemId) + bankCount(state, itemId);
}

/** Verlangt die Aufgabe eine Skill-Stufe, die der Held (noch) nicht hat? Nur produce/run (Bestands-Abgaben nie). */
function levelBlocked(state: GameState, task: TavernTask): boolean {
  if (task.kind !== "produce" && task.kind !== "run") return false;
  if (!(task.requiredLevel > 0)) return false;
  return skillLevel(state, task.rewardSkill) < task.requiredLevel;
}

export interface TavernTaskProgress {
  /** Erreicht (auf `need` gedeckelt). Nicht angenommene Zähler-Aufgaben: 0. */
  have: number;
  need: number;
  /** Angenommen UND erfüllt UND Stufe erreicht — die EINE Wahrheit für den Abgeben-Knopf. */
  deliverable: boolean;
}

/**
 * Fortschritt einer Aufgabe: deliver/assortment zählen den BESTAND (Inventar + Lager, unabhängig
 * von der Annahme); produce/run/kill/dungeon/champion zählen `Zähler − baseline` ab der Annahme.
 * Rein lesend, kein RNG.
 */
export function tavernTaskProgress(state: GameState, content: ContentDB, task: TavernTask): TavernTaskProgress {
  void content;
  const need = Math.max(1, Math.floor(task.count));
  let have = 0;
  if (task.kind === "deliver") {
    have = Math.min(need, stockOf(state, task.targetId));
  } else if (task.kind === "assortment") {
    const ids = task.targetIds && task.targetIds.length > 0 ? task.targetIds : [task.targetId];
    const per = Math.max(1, Math.ceil(need / ids.length));
    for (const id of ids) have += Math.min(per, stockOf(state, id));
    have = Math.min(need, have);
  } else if (task.accepted) {
    have = Math.max(0, Math.min(need, taskCounter(state, task) - task.baseline));
  }
  const deliverable = task.accepted && have >= need && !levelBlocked(state, task);
  return { have, need, deliverable };
}

/** Verbraucht `qty` eines Items: ZUERST Inventar, dann Lager (Craft-Kosten-Semantik, tick.ts `consumeInput`). */
function takeFromStock(state: GameState, itemId: ItemId, qty: number): number {
  let taken = 0;
  const fromInv = Math.min(qty, itemCount(state.inventory, itemId));
  if (fromInv > 0) taken += removeItem(state.inventory, itemId, fromInv);
  const rest = qty - taken;
  if (rest > 0) {
    const inBank = state.bank[itemId] ?? 0;
    const take = Math.min(rest, inBank);
    if (take > 0) {
      state.bank[itemId] = inBank - take;
      if (state.bank[itemId]! <= 0) delete state.bank[itemId];
      taken += take;
    }
  }
  return taken;
}

/** Skill-XP über den normalen Pfad (Skill-Eintrag, Gesamtlevel sofort synchron; Achievements/Quests zählen im nächsten advance). */
function grantTavernXp(state: GameState, content: ContentDB, skill: SkillId, xp: number): void {
  if (!(xp > 0)) return;
  const entry = (state.skills[skill] ??= { xp: 0 });
  entry.xp += xp;
  syncProgression(state, content);
}

/** Maschinenlesbare Gründe von `deliverTavernTask` (Vertrag für die UI). */
export type TavernDeliverReason =
  | "ok"
  | "not_built" // Taverne steht nicht
  | "no_task" // ungültiger Platz oder Platz ohne Aufgabe
  | "not_accepted" // erst annehmen
  | "level" // produce/run: Skill-Stufe der Zielaktion (noch) nicht erreicht
  | "incomplete"; // Fortschritt/Bestand reicht nicht

/**
 * Gibt die Aufgabe an `seat` ab (Spec §4/§5): verbraucht die Items (deliver/assortment — Inventar,
 * dann Lager), zahlt die GESPEICHERTE Belohnung (Gold, Rohstoffe via `grantLoot` = addItemOrBank +
 * Postfach-Überlauf, Skill-XP), Behälter statt Gold + Rohstoffe bei `paysCrate`, 10-%-Bonus-Behälter
 * per Hash (Zutat `deliverSeq`), schreibt die Zähler + den Breadcrumb `lastDelivery` und besetzt den
 * Platz SOFORT neu (Hash mit `swaps + 1`, nicht erst morgen). Kein RNG.
 */
export function deliverTavernTask(state: GameState, content: ContentDB, seat: number, day: number): TavernDeliverReason {
  if (!tavernBuilt(state, content)) return "not_built";
  const s = seatAt(state, seat);
  const task = s?.task ?? null;
  if (!s || !task) return "no_task";
  if (!task.accepted) return "not_accepted";
  if (levelBlocked(state, task)) return "level";
  const progress = tavernTaskProgress(state, content, task);
  if (progress.have < progress.need) return "incomplete";

  // Abgabe-Items einziehen (Bestands-Aufgaben).
  if (task.kind === "deliver") {
    takeFromStock(state, task.targetId, progress.need);
  } else if (task.kind === "assortment") {
    const ids = task.targetIds && task.targetIds.length > 0 ? task.targetIds : [task.targetId];
    const per = Math.max(1, Math.ceil(progress.need / ids.length));
    for (const id of ids) takeFromStock(state, id, per);
  }

  const t = tavernOf(state);
  const useDay = Number.isFinite(day) ? day : t.day;
  const band = Math.max(1, Math.min(TAVERN_BANDS, task.band));
  const crateId = tavernCrateItemId(band);
  const crateKnown = !!content.items[crateId];
  const crates: ItemId[] = [];
  let gold = 0;
  const items: { id: ItemId; qty: number }[] = [];

  if (task.paysCrate && crateKnown) {
    grantLoot(state, content, crateId, 1);
    state.stats.itemsGathered += 1;
    crates.push(crateId);
  } else {
    gold = Math.max(0, Math.round(task.rewardGold));
    state.character.gold += gold;
    for (const { id, qty } of task.rewardItems) {
      if (!content.items[id] || !(qty > 0)) continue;
      grantLoot(state, content, id, qty);
      state.stats.itemsGathered += qty;
      items.push({ id, qty });
    }
  }
  grantTavernXp(state, content, task.rewardSkill, task.rewardXp);

  // 10-%-Zusatzbehälter des Bands (Hash-Wurf mit der NEUEN Abgabe-Nummer als Zutat).
  const seq = t.deliverSeq + 1;
  if (crateKnown && tavernHashFloat(tavernSeed(state), useDay, seq, SALT_CRATE_BONUS) < TAVERN_CRATE_BONUS_CHANCE) {
    grantLoot(state, content, crateId, 1);
    state.stats.itemsGathered += 1;
    crates.push(crateId);
  }

  t.deliverSeq = seq;
  t.deliveredToday += 1;
  t.totalDelivered += 1;
  t.deliveredByGuest[s.guestId] = (t.deliveredByGuest[s.guestId] ?? 0) + 1;
  t.lastDelivery = { seq, guestId: s.guestId, gold, xp: task.rewardXp, skill: task.rewardSkill, items, crates };

  // Platz sofort neu besetzen: der Gast geht, jemand anderes rückt nach (Hash mit swaps + 1).
  s.swaps += 1;
  const { defs, ids } = seatedGuests(content, t.seats, seat);
  if (s.guestId) ids.add(s.guestId);
  const filled = fillSeat(state, content, useDay, seat, s.swaps, ids, defs);
  if (filled) {
    s.guestId = filled.guestId;
    s.task = filled.task;
  } else {
    s.task = null; // niemand nachrückbar — der nächste tavernRefresh versucht es erneut
  }
  return "ok";
}

// ── Schwarzmarktbehälter (Spec §7) ────────────────────────────────────────────────────────────

export interface CrateResult {
  /** Der geöffnete Behälter. */
  itemId: ItemId;
  tier: number;
  /** Gewährter Inhalt in Wurf-Reihenfolge (Bündel, Ausrüstung, ggf. Champion-Unikat, Rune, Zweitstück). */
  items: { id: ItemId; qty: number }[];
}

/** Level-Fenster eines Bands (Aktions-Stufe/Monster-Level): Band 5 nach oben offen. */
function bandRange(band: number): { lo: number; hi: number } {
  const b = Math.max(1, Math.min(TAVERN_BANDS, band));
  return { lo: (b - 1) * TAVERN_BAND_WIDTH + 1, hi: b === TAVERN_BANDS ? Infinity : b * TAVERN_BAND_WIDTH };
}

/** Welt-Monster (kein Turm/dungeonOnly/dg_) mit Level im Band, nach ID sortiert. */
function bandMonsters(content: ContentDB, band: number): MonsterDef[] {
  const { lo, hi } = bandRange(band);
  const out: MonsterDef[] = [];
  for (const id of Object.keys(content.monsters).sort()) {
    const m = content.monsters[id]!;
    if (m.slayerFloor != null || m.zone === "slayer_tower" || m.dungeonOnly || m.id.startsWith(DUNGEON_VARIANT_PREFIX)) continue;
    if (m.level < lo || m.level > hi) continue;
    out.push(m);
  }
  return out;
}

/**
 * Materialien des Bands: Haupt-Outputs (Typ material, keine Runen — die haben ihren eigenen
 * 5-%-Wurf) der Band-Aktionen und -Sorten + häufigste Material-Drops der Band-Monster.
 */
function bandMaterials(content: ContentDB, band: number): ItemId[] {
  const { lo, hi } = bandRange(band);
  const set = new Set<ItemId>();
  for (const a of [...Object.values(content.actions), ...cropPseudoActions(content)]) {
    const lr = a.levelRequired ?? 1;
    if (lr < lo || lr > hi) continue;
    const roll = mainOutput(content, a);
    const item = roll ? content.items[roll.itemId] : undefined;
    if (roll && item?.type === "material" && !item.rune) set.add(roll.itemId);
  }
  for (const m of bandMonsters(content, band)) {
    const drop = commonMaterialDrop(content, m);
    if (drop && !content.items[drop]?.rune) set.add(drop);
  }
  return [...set].sort();
}

/** Ausrüstungsstücke aus den Loot-Tabellen der Band-Monster (dedupliziert, nach ID sortiert). */
function bandGear(content: ContentDB, band: number): ItemId[] {
  const set = new Set<ItemId>();
  for (const m of bandMonsters(content, band)) {
    for (const roll of m.loot) if (content.items[roll.itemId]?.type === "equipment") set.add(roll.itemId);
  }
  return [...set].sort();
}

/**
 * Würfelt den Inhalt eines Behälters (rein, mutiert nichts): Hash-Zutaten `tavern.deliverSeq` +
 * `stats.itemsGathered` + tier (Spec §7). Exportiert, damit Tests/UI die Vorschau prüfen können.
 */
export function rollCrateContents(state: GameState, content: ContentDB, tier: number): { id: ItemId; qty: number }[] {
  const band = Math.max(1, Math.min(TAVERN_BANDS, Math.floor(tier)));
  const seed = tavernSeed(state);
  const seq = state.tavern?.deliverSeq ?? 0;
  const gathered = Math.floor(state.stats?.itemsGathered ?? 0);
  const h = (k: number): number => tavernHashFloat(seed, seq, gathered, band, SALT_CRATE_OPEN, k);
  const out: { id: ItemId; qty: number }[] = [];

  // 1. sicheres Bündel: 2 Materialien des Bands × 3–8.
  const mats = bandMaterials(content, band);
  const chosen: ItemId[] = [];
  for (let k = 0; k < CRATE_MATERIAL_KINDS && mats.length > chosen.length; k++) {
    const rest = mats.filter((m) => !chosen.includes(m));
    const id = rest[Math.min(rest.length - 1, Math.floor(h(1 + k) * rest.length))]!;
    chosen.push(id);
    const span = CRATE_MATERIAL_QTY_MAX - CRATE_MATERIAL_QTY_MIN + 1;
    out.push({ id, qty: CRATE_MATERIAL_QTY_MIN + Math.min(span - 1, Math.floor(h(3 + k) * span)) });
  }

  // 2. ein Ausrüstungsstück der Band-Monster (5 %: nächstes Band, falls vorhanden).
  const gearThis = bandGear(content, band);
  const gearNext = band < TAVERN_BANDS ? bandGear(content, band + 1) : [];
  const gearPool = h(5) < CRATE_NEXT_BAND_CHANCE && gearNext.length > 0 ? gearNext : gearThis;
  if (gearPool.length > 0) out.push({ id: gearPool[Math.min(gearPool.length - 1, Math.floor(h(6) * gearPool.length))]!, qty: 1 });

  // 3. 10 %: Champion-Unikat aus dem Pool der bereits besiegten Varianten.
  if (h(7) < CRATE_CHAMPION_CHANCE) {
    const codex = state.eliteCodex ?? {};
    const uniques: ItemId[] = [];
    for (const id of Object.keys(codex).sort()) {
      const v = content.elites?.[id];
      if (!v || (codex[id]?.kills ?? 0) < 1 || !content.items[v.uniqueItemId]) continue;
      if (!uniques.includes(v.uniqueItemId)) uniques.push(v.uniqueItemId);
    }
    if (uniques.length > 0) out.push({ id: uniques[Math.min(uniques.length - 1, Math.floor(h(8) * uniques.length))]!, qty: 1 });
  }

  // 4. 5 %: eine Rune des Band-Tiers.
  if (h(9) < CRATE_RUNE_CHANCE) {
    const runeTier = CRATE_RUNE_TIER_BY_BAND[band] ?? 1;
    const runes = Object.keys(content.items)
      .filter((id) => content.items[id]?.rune?.tier === runeTier)
      .sort();
    if (runes.length > 0) out.push({ id: runes[Math.min(runes.length - 1, Math.floor(h(10) * runes.length))]!, qty: 1 });
  }

  // 5. 2 %: ein zweites Ausrüstungsstück.
  if (h(11) < CRATE_SECOND_GEAR_CHANCE && gearThis.length > 0) {
    out.push({ id: gearThis[Math.min(gearThis.length - 1, Math.floor(h(12) * gearThis.length))]!, qty: 1 });
  }
  return out;
}

/**
 * Öffnet EINEN Schwarzmarktbehälter (Spec §7): prüft Item-Art (`consumable.kind === "blackMarketCrate"`)
 * und Besitz (Inventar oder Lager), würfelt den Inhalt per Hash, VERBRAUCHT ein Stück (Inventar
 * zuerst, sonst Lager) und legt den Inhalt über `grantLoot` ab (Inventar → Lager → Postfach, nichts
 * geht verloren). null = kein Behälter / kein Bestand / leerer Inhalt (dann bleibt das Stück liegen).
 * Kein Gold, keine Marken, kein RNG. `useConsumable` (consumable.ts) delegiert hierher.
 */
export function openBlackMarketCrate(state: GameState, content: ContentDB, itemId: ItemId): CrateResult | null {
  const tier = tavernCrateTier(content, itemId);
  if (tier === null) return null;
  if (stockOf(state, itemId) < 1) return null;
  const items = rollCrateContents(state, content, tier);
  if (items.length === 0) return null;
  if (takeFromStock(state, itemId, 1) < 1) return null;
  for (const { id, qty } of items) {
    grantLoot(state, content, id, qty);
    state.stats.itemsGathered += qty;
  }
  return { itemId, tier, items };
}

// ── Lese-Sicht für die UI ─────────────────────────────────────────────────────────────────────

export interface TavernSeatSummary {
  index: number;
  seat: TavernSeat;
  guest: TavernGuestDef | null;
  template: TavernTaskTemplateDef | null;
  band: number;
  progress: TavernTaskProgress | null;
  /** Kosten des nächsten Wechsels an diesem Platz (0 = gratis). */
  swapCost: number;
  /** Behälter-Item, das diese Aufgabe zahlt (nur `paysCrate`), sonst null. */
  crateItemId: ItemId | null;
}

/** Alles, was die Gäste-Karte eines Platzes braucht, in einem Lese-Aufruf. null bei ungültigem Platz. */
export function tavernSeatSummary(state: GameState, content: ContentDB, seat: number): TavernSeatSummary | null {
  const s = seatAt(state, seat);
  if (!s) return null;
  const guest = tavernGuestDef(content, s.guestId);
  const task = s.task;
  return {
    index: seat,
    seat: s,
    guest,
    template: task ? tavernTemplateDef(content, task.templateId) : null,
    band: seatBand(state, content, s),
    progress: task ? tavernTaskProgress(state, content, task) : null,
    swapCost: tavernSwapCost(state, content, seat),
    crateItemId: task?.paysCrate ? tavernCrateItemId(task.band) : null,
  };
}
