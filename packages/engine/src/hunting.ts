import type { ContentDB, GameState, HuntCatch, HuntTrap, HuntZoneDef, ItemId, MonsterDef, MonsterId } from "@hearthforge/shared";
import {
  BAIT_ITEM_ID,
  DEFAULT_DROP_SUFFIX_CHANCE,
  DUNGEON_VARIANT_PREFIX,
  HUNTING_SKILL_ID,
  HUNT_CATCH_BASE,
  HUNT_CATCH_CAP,
  HUNT_CATCH_PER_LEVEL,
  HUNT_LOOT_ROLLS,
  HUNT_TRAP_SLOTS,
  HUNT_TRAPPABLE_FAMILIES,
  huntTrapSlotsForLevel, huntCatchXp, HUNT_FIRST_CATCH_MULT,} from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { nextFloat, nextInt } from "./rng";
import { itemCount, removeItem } from "./inventory";
import { bankCount } from "./bank";
import { buffGatherXpMult } from "./consumable";
import { grantLoot } from "./mail";
import { monsterKills } from "./drops";
import { isZoneUnlocked } from "./zones";
import { tryCraftSuffix } from "./suffix";

// ───────────────────────────────────────────────────────────────────────────
// Jagen (1.2.0 „Fasern und Fallen", SAVE_VERSION 85 — design/handwerk-fasern-jagen/spec-technik.md §3,
// Chef-Entscheide J1–J7 vom 27.08.2026).
//
// Passive Monsterbeute über Fallen mit Köder (`bait_worm` aus dem Angeln). Sechs Fallenplätze
// (HUNT_SLOT_LEVELS), je Platz ein Gebiet aus `content.huntingZones`. Die Falle zählt ihre Restzeit
// gegen das Tick-Fenster herunter (`tickHuntTraps`, in tick.ts direkt nach `tickFarmPlots` — EINMAL
// pro `advance`, offline == online). Bei ≤ 0 wird geworfen; der Rest überträgt sich wie bei den
// Beeten (Schleife „solange remainingMs ≤ 0", Auto-Erneuern nur mit Köder).
//
// Kein Ruhm (J2): ein Fang ist KEIN Kill — kein `monsterKills`, kein Slayer-Credit, kein
// Bestiarium-/Collection-Log (`seenDrops` bleibt unberührt), kein Begleiter-Wurf, keine Kampf-XP; der
// einzige Zähler ist `stats.huntCatches`.
//
// RNG-REIHENFOLGE je Wurf (fest, alles über `state.rng`):
//   1. nextFloat  — Fangchance (`huntCatchChance`), NUR wenn das Gebiet ≥ 1 fangbares Monster hat
//                   (leerer Pool ⇒ Fehlschlag OHNE Zug — kann nur durch Content-Änderung entstehen).
//   bei Erfolg:
//   2. nextInt    — Monster gleichverteilt aus `huntableMonsters` (Content-Reihenfolge).
//   3. nextInt    — Gold-Streuung wie im Kill-Pfad (`gold + nextInt(0, ceil(gold·0,4))`), danach ×5.
//   4. HUNT_LOOT_ROLLS komplette Durchläufe der Monster-Beutetabelle, je Eintrag: nextFloat
//                   (Chance) → bei Erfolg nextInt (Menge) → ggf. Suffix-Rolls über `tryCraftSuffix`
//                   (zieht NUR bei Equipment mit Pool, wie im Kill-Pfad).
// Kein Segen-/Runen-/Pet-Multiplikator auf Chance oder Beute (der Fallen-Tick kennt keine Wanduhr,
// und Kampf-Effekte gehören dem Kampf) — die Tabelle fällt exakt mit ihren Content-Chancen.
// Ohne `content.huntingZones` ist alles inert (kein RNG-Zug, kein State-Schreibzugriff).
// ───────────────────────────────────────────────────────────────────────────

export type HuntSetReason = "ok" | "no_slot" | "zone_locked" | "level" | "nothing_huntable" | "no_bait" | "busy";

/** Fänge je Monster im gerade verrechneten Fenster (Sammler des Aufrufers, z. B. OfflineSummary). */
export type HuntCatchTally = Record<MonsterId, number>;

/** Aktuelle Jagen-Stufe aus der gesammelten XP. */
function huntingLevel(state: GameState): number {
  return levelFromXp(state.skills[HUNTING_SKILL_ID]?.xp ?? 0);
}

/** Freigeschaltete Fallenplätze nach Jagen-Stufe (HUNT_SLOT_LEVELS). */
export function huntTrapSlots(state: GameState): number {
  return huntTrapSlotsForLevel(huntingLevel(state));
}

/** Gebiets-Eintrag der Jagd oder null (fehlender Katalog ⇒ Jagd inert). */
export function huntZoneDef(content: ContentDB, zoneId: string): HuntZoneDef | null {
  const zones = content.huntingZones;
  if (!Array.isArray(zones)) return null;
  return zones.find((z) => z.zoneId === zoneId) ?? null;
}

/** Content-Konvention der benannten Bosse: Erfolg `ach_boss_<monsterId>` mit Bedingung monster_kills. */
const BOSS_ACHIEVEMENT_PREFIX = "ach_boss_";

/**
 * Boss-Erkennung (J1 „nie Bosse"): MonsterDef trägt KEIN eigenes Boss-Flag. Drei Content-Marker, vereinigt:
 *  (a) `enrage` — De-facto-Marker im Content (Welle T gab den benannten Bossen genau dieses Verhalten;
 *      dieselbe Konvention nutzt der Sim-Harness, engine/sim.ts);
 *  (b) Endgegner eines Dungeons (letzter Eintrag von `encounters`);
 *  (c) Ziel eines `ach_boss_*`-Erfolgs (monster_kills) — deckt die Zonen-Bosse ohne enrage ab
 *      (goblin_warlock, frost_hexer, roc_elder).
 * Champions (Elite-Varianten) stehen nicht in `content.monsters` und fallen von selbst heraus. Wird
 * einmal pro Aufruf als Set gebaut (rein, kein RNG).
 */
function bossMonsterIds(content: ContentDB): Set<MonsterId> {
  const out = new Set<MonsterId>();
  for (const m of Object.values(content.monsters)) if (m?.enrage) out.add(m.id);
  for (const d of content.dungeons ?? []) {
    const last = d.encounters[d.encounters.length - 1];
    if (last) out.add(last);
  }
  for (const a of content.achievements ?? []) {
    if (!a.id.startsWith(BOSS_ACHIEVEMENT_PREFIX)) continue;
    const cond = a.condition as { type?: string; target?: string };
    if (cond.type === "monster_kills" && typeof cond.target === "string") out.add(cond.target);
  }
  return out;
}

/**
 * Fangbare Monster eines Gebiets in Content-Reihenfolge: Familie in HUNT_TRAPPABLE_FAMILIES, nicht
 * dungeonOnly, kein Boss/Champion, `zone === zoneId` und mindestens einmal im Kampf besiegt
 * (`monsterKills[id] ≥ 1`). Rein, kein RNG.
 */
export function huntableMonsters(state: GameState, content: ContentDB, zoneId: string): MonsterId[] {
  const out: MonsterId[] = [];
  const bosses = bossMonsterIds(content);
  for (const m of Object.values(content.monsters)) {
    if (!m || m.zone !== zoneId) continue;
    if (!m.family || !HUNT_TRAPPABLE_FAMILIES.includes(m.family)) continue;
    if (m.dungeonOnly) continue;
    if (m.id.startsWith(DUNGEON_VARIANT_PREFIX)) continue;
    if (bosses.has(m.id)) continue;
    if (monsterKills(state, m.id) < 1) continue;
    out.push(m.id);
  }
  return out;
}

/** Köder gesamt in Inventar UND Lager (Köder darf aus beidem gezogen werden — Muster Saat). */
export function huntBaitCount(state: GameState): number {
  return itemCount(state.inventory, BAIT_ITEM_ID) + bankCount(state, BAIT_ITEM_ID);
}

/** Verbraucht GENAU einen Köder (zuerst Inventar, dann Lager). true bei Erfolg. */
function consumeBait(state: GameState): boolean {
  if (removeItem(state.inventory, BAIT_ITEM_ID, 1) === 1) return true;
  const inBank = state.bank[BAIT_ITEM_ID] ?? 0;
  if (inBank > 0) {
    state.bank[BAIT_ITEM_ID] = inBank - 1;
    if (state.bank[BAIT_ITEM_ID]! <= 0) delete state.bank[BAIT_ITEM_ID];
    return true;
  }
  return false;
}

/** Gültiger Fallenplatz oder null. */
function trapAt(state: GameState, slot: number): HuntTrap | null {
  const traps = state.huntTraps;
  if (!Array.isArray(traps) || !Number.isInteger(slot) || slot < 0 || slot >= traps.length) return null;
  return traps[slot] ?? null;
}

/**
 * Fangchance eines Gebiets: clamp(HUNT_CATCH_BASE + (Jagen-Stufe − Gebietsstufe) · HUNT_CATCH_PER_LEVEL,
 * 0, HUNT_CATCH_CAP) (J4). 0 für unbekannte Gebiete.
 */
export function huntCatchChance(state: GameState, content: ContentDB, zoneId: string): number {
  const zone = huntZoneDef(content, zoneId);
  if (!zone) return 0;
  const raw = HUNT_CATCH_BASE + (huntingLevel(state) - zone.levelRequired) * HUNT_CATCH_PER_LEVEL;
  return Math.min(HUNT_CATCH_CAP, Math.max(0, raw));
}

/**
 * Warum kann auf `slot` (noch) keine Falle für `zoneId` gestellt werden? Prüfreihenfolge:
 * Platz existiert und ist freigeschaltet (no_slot) → Platz leer (busy) → Gebiet im Jagd-Katalog UND
 * im Kampf freigeschaltet (zone_locked) → Jagen-Stufe (level) → ≥ 1 fangbares, besiegtes Monster
 * (nothing_huntable) → Köder in Inventar/Lager (no_bait) → ok.
 */
export function huntSetReason(state: GameState, content: ContentDB, slot: number, zoneId: string): HuntSetReason {
  const trap = trapAt(state, slot);
  if (!trap || slot >= huntTrapSlots(state)) return "no_slot";
  if (trap.zoneId !== null) return "busy";
  const zone = huntZoneDef(content, zoneId);
  if (!zone || !isZoneUnlocked(state, content, zoneId)) return "zone_locked";
  if (huntingLevel(state) < zone.levelRequired) return "level";
  if (huntableMonsters(state, content, zoneId).length === 0) return "nothing_huntable";
  if (huntBaitCount(state) <= 0) return "no_bait";
  return "ok";
}

/**
 * Stellt eine Falle: zieht SOFORT einen Köder (Inventar, sonst Lager — anti-abuse: kein „stellen ohne
 * Kosten"), `remainingMs = trapMs`, Auto-Erneuern wie übergeben. Gibt den Grund zurück ("ok" = gestellt).
 * `lastCatch`/`lastMissed` bleiben stehen (Breadcrumb des letzten Wurfs, bis der nächste fällt).
 */
export function setHuntTrap(
  state: GameState,
  content: ContentDB,
  slot: number,
  zoneId: string,
  autoRebait: boolean,
): HuntSetReason {
  const reason = huntSetReason(state, content, slot, zoneId);
  if (reason !== "ok") return reason;
  const trap = trapAt(state, slot)!;
  const zone = huntZoneDef(content, zoneId)!;
  if (!consumeBait(state)) return "no_bait";
  trap.zoneId = zoneId;
  trap.remainingMs = Math.max(1, zone.trapMs);
  trap.autoRebait = !!autoRebait;
  return "ok";
}

/** Leert einen Platz — der Köder verfällt (wie Beet roden). Auto-Erneuern und letzter Fang bleiben. */
export function clearHuntTrap(state: GameState, slot: number): void {
  const trap = trapAt(state, slot);
  if (!trap) return;
  trap.zoneId = null;
  trap.remainingMs = 0;
}

/** Schaltet Auto-Erneuern eines Platzes um (Muster setAutoReplant). */
export function setHuntAutoRebait(state: GameState, slot: number, on: boolean): void {
  const trap = trapAt(state, slot);
  if (!trap) return;
  trap.autoRebait = !!on;
}

/**
 * EIN erfolgreicher Fang: Gold (Kill-Streuung ×5), HUNT_LOOT_ROLLS Durchläufe der Beutetabelle über den
 * normalen Drop-Pfad (Suffix-Instanz möglich, grantLoot: Inventar → Lager → Postfach, itemsGathered),
 * Jagen-XP (Sammel-Tonika multiplizieren wie beim Beet), Breadcrumb mit laufender Fang-Nummer.
 * RNG-Züge s. Kopfkommentar (Schritte 3–4).
 */
function grantCatch(state: GameState, content: ContentDB, zone: HuntZoneDef, monster: MonsterDef): HuntCatch {
  // 3. Gold: derselbe Streuungs-Wurf wie im Kill-Pfad (combat.ts rollKillGold), dann ×HUNT_LOOT_ROLLS.
  const goldRoll = monster.gold + nextInt(state.rng, 0, Math.ceil(monster.gold * 0.4));
  const gold = Math.max(0, Math.round(goldRoll * HUNT_LOOT_ROLLS));
  state.character.gold += gold;

  // 4. Beute: HUNT_LOOT_ROLLS komplette Tabellen-Durchläufe (J: „5 Beute-Würfe seiner Tabelle").
  const items: { id: ItemId; qty: number }[] = [];
  for (let pass = 0; pass < HUNT_LOOT_ROLLS; pass++) {
    for (const roll of monster.loot) {
      if (nextFloat(state.rng) > Math.min(1, roll.chance)) continue;
      let qty = nextInt(state.rng, roll.min, roll.max);
      let instanceMade = 0;
      const suffixChance = roll.suffixChance ?? DEFAULT_DROP_SUFFIX_CHANCE;
      if (qty > 0 && suffixChance > 0) {
        // Wie combat.ts: EIN Exemplar wird zur Instanz (tryCraftSuffix legt sie selbst ab), Rest bleibt Stack.
        const res = tryCraftSuffix(state, content, roll.itemId, monster.level, suffixChance);
        if (res) {
          qty -= 1;
          instanceMade = 1;
        }
      }
      grantLoot(state, content, roll.itemId, qty);
      // Chef 28.08.2026: das Jagdbuch zeigt Beute erst, wenn sie einmal gesammelt wurde — Fänge zählen dafür wie Kills
      // ins Collection-Log (seenDrops), ohne Kill-Zähler (J2 bleibt).
      const seen = (state.seenDrops[monster.id] ??= []);
      if (!seen.includes(roll.itemId)) seen.push(roll.itemId);
      const dropped = qty + instanceMade;
      if (dropped <= 0) continue;
      state.stats.itemsGathered += dropped;
      const existing = items.find((e) => e.id === roll.itemId);
      if (existing) existing.qty += dropped;
      else items.push({ id: roll.itemId, qty: dropped });
    }
  }

  // Jagen-XP über den normalen Skill-Pfad (state.skills; Level-Ups liest die UI aus der XP-Differenz).
  const skill = (state.skills[HUNTING_SKILL_ID] ??= { xp: 0 });
  // Chef 28.08.2026: Kampf-XP des gefangenen Monsters ×HUNT_XP_PER_CATCH (huntCatchXp), Erstfang jeder Art ×HUNT_FIRST_CATCH_MULT.
  const byId = (state.stats.huntCatchesById ??= {});
  const first = (byId[monster.id] ?? 0) === 0;
  skill.xp += huntCatchXp(monster.xp) * (first ? HUNT_FIRST_CATCH_MULT : 1) * buffGatherXpMult(state, content);
  byId[monster.id] = (byId[monster.id] ?? 0) + 1;

  state.huntCatchSeq += 1;
  state.stats.huntCatches += 1;
  return { seq: state.huntCatchSeq, monsterId: monster.id, items, gold };
}

/**
 * EIN Wurf einer gestellten Falle (RNG-Schritte 1–2, dann `grantCatch`): Fangchance nur bei nicht-leerem
 * Pool würfeln, Monster gleichverteilt; Breadcrumbs `lastCatch`/`lastMissed`, Tally je Monster.
 */
function throwTrap(state: GameState, content: ContentDB, trap: HuntTrap, zone: HuntZoneDef, tally?: HuntCatchTally): void {
  const pool = huntableMonsters(state, content, zone.zoneId);
  let caught: MonsterDef | null = null;
  if (pool.length > 0 && nextFloat(state.rng) < huntCatchChance(state, content, zone.zoneId)) {
    const id = pool[nextInt(state.rng, 0, pool.length - 1)]!;
    caught = content.monsters[id] ?? null;
  }
  if (caught) {
    trap.lastCatch = grantCatch(state, content, zone, caught);
    trap.lastMissed = false;
    if (tally) tally[caught.id] = (tally[caught.id] ?? 0) + 1;
  } else {
    trap.lastCatch = null;
    trap.lastMissed = true;
  }
}

/**
 * Ein Fallen-Tick pro `advance` (tick.ts, direkt nach tickFarmPlots) für das Fenster `dtMs`.
 *
 * Alle Würfe des Fensters laufen in ZEITREIHENFOLGE über ALLE freigeschalteten, gestellten Plätze
 * (fällig = Restzeit ≤ Fensterlänge; Gleichstand ⇒ kleinerer Platz-Index zuerst). Nur so hängt die
 * Zuteilung der RNG-Züge nicht von der Fensterlänge ab: ein 55-Minuten-Sprung und 55 × 1 Minute
 * würfeln jeder Falle dieselben Zahlen zu (offline == online auch mit mehreren Fallen; ein reines
 * „Platz für Platz alle Zyklen" wie bei den Beeten würde die Züge zwischen den Fallen vertauschen).
 * Je Wurf: `throwTrap`, dann Auto-Erneuern — Köder da ⇒ neuer Köder und nächste Fälligkeit +trapMs
 * (verlustfreier Rest-Übertrag), sonst Platz leer. Gesperrte Plätze (Index ≥ huntTrapSlots zum
 * Fensterbeginn) ticken NICHT (Muster Beete). Gebiet aus dem Katalog verschwunden ⇒ Platz leeren
 * (kein RNG-Zug). Ohne `content.huntingZones` sofortiger No-op.
 *
 * @param tally Optionaler Sammler „Fänge je Monster" für dieses Fenster (OfflineSummary.huntCatches).
 */
export function tickHuntTraps(state: GameState, content: ContentDB, dtMs: number, tally?: HuntCatchTally): void {
  const zones = content.huntingZones;
  if (!Array.isArray(zones) || zones.length === 0) return;
  const traps = state.huntTraps;
  if (!Array.isArray(traps) || traps.length === 0) return;
  if (!Number.isFinite(dtMs) || dtMs <= 0) return;

  interface Pending { trap: HuntTrap; zone: HuntZoneDef; trapMs: number; due: number }
  const pending: Pending[] = [];
  const n = Math.min(HUNT_TRAP_SLOTS, traps.length, huntTrapSlots(state));
  for (let i = 0; i < n; i++) {
    const trap = traps[i];
    if (!trap || trap.zoneId === null) continue;
    const zone = huntZoneDef(content, trap.zoneId);
    if (!zone) {
      trap.zoneId = null;
      trap.remainingMs = 0;
      continue;
    }
    pending.push({ trap, zone, trapMs: Math.max(1, zone.trapMs), due: Math.max(0, trap.remainingMs) });
  }

  for (;;) {
    let next: Pending | null = null;
    for (const p of pending) if (p.due <= dtMs && (next === null || p.due < next.due)) next = p;
    if (!next) break;
    throwTrap(state, content, next.trap, next.zone, tally);
    if (next.trap.autoRebait && consumeBait(state)) {
      next.due += next.trapMs;
    } else {
      next.trap.zoneId = null;
      next.trap.remainingMs = 0;
      pending.splice(pending.indexOf(next), 1);
    }
  }
  for (const p of pending) p.trap.remainingMs = p.due - dtMs;
}
