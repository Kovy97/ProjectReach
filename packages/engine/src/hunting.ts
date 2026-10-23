import type { ContentDB, GameState, HuntCatch, HuntTrap, HuntZoneDef, ItemId, MonsterDef, MonsterId } from "@hearthforge/shared";
import { rollEstateEvent } from "./events"; // claude:2026-10-24T23:40:00+02:00 — 1.4.0 EV
import { FRESH_TRAIL_EXTRA_ROLLS } from "@hearthforge/shared";
import {
  BAIT_ITEM_ID,
  huntBaitForZoneLevel,
  DEFAULT_DROP_SUFFIX_CHANCE,
  DUNGEON_VARIANT_PREFIX,
  HUNTING_SKILL_ID,
  HUNT_CATCH_BASE,
  HUNT_CATCH_CAP,
  HUNT_CATCH_PER_LEVEL,
  HUNT_LOOT_ROLLS,
  HUNT_LOOT_ROLLS_DOUBLED,
  HUNT_TRAP_SLOTS,
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
import { petHuntDoubleRollsChance, tryPetDrop } from "./pets";
import { masterDoubleYieldBonus } from "./capes";
import { goldFindMult, prestigeSkillXpMult } from "./prestige-effects"; // claude:2026-10-18T12:00:00+02:00 — Narbenbuch

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
// WARTEN AUF KÖDER (review-1.2.0 P2, 29.08.2026): fehlt beim Auto-Erneuern der Köder der Zone, vergisst
// die Falle ihr Gebiet NICHT mehr — sie bleibt gestellt mit `remainingMs = 0` („wartet auf Köder",
// Selektor `huntTrapWaiting`). Kein neues State-Feld: eine LAUFENDE Falle hat immer remainingMs ≥ 1
// (`setHuntTrap` setzt max(1, trapMs); `tickHuntTraps` behält nur due > dtMs), also ist
// `zoneId !== null && remainingMs === 0` eindeutig — kein SAVE-Bump, Sanitize lässt den Zustand durch
// (ein per Save-Edit auf 0 geklemmter Wert wartet damit ebenfalls, statt gratis sofort zu werfen).
// Zu jedem FENSTERBEGINN prüft der Tick den Köder-Vorrat der Zone (`huntBaitCount`): ist welcher da,
// zieht die Falle EINEN Köder und startet mit voller Fallenzeit ab Fensterbeginn (Muster Beet mit
// geplanter Folgesorte, #p12 — der Fensterbeginn ist der einzige Zeitpunkt, den Live-Loop und
// Offline-Catch-up gleich sehen; bei knappem Köder gewinnt der kleinere Platz-Index). Beim Warten fällt
// KEIN Wurf und KEIN RNG-Zug — die RNG-Reihenfolge bleibt unverändert. Auto-Erneuern AUS leert den
// Platz nach dem Wurf wie bisher; Auto-Erneuern auf einer WARTENDEN Falle abschalten leert sie ebenfalls
// (die ausstehende Erneuerung ist abgesagt — kein toter Zustand „wartet, startet aber nie").
//
// Kein Ruhm (J2): ein Fang ist KEIN Kill — kein `monsterKills`, kein Slayer-Credit, keine Kampf-XP;
// der Kill-Zähler bleibt unberührt, gezählt wird nur `stats.huntCatches` (+ `seenDrops` fürs Jagdbuch,
// Chef 28.08.2026). Ein Fang ist aber eine SKILL-Aktion des Jagens: wie jeder Aktions-Abschluss
// (tick.ts `completeAction`) zieht er den Begleiter-Wurf des Herkunfts-Skills (`tryPetDrop`,
// Quelle `{ kind: "skill", skill: "hunting" }`, Chef 28.08.2026: Jagen-Begleiter booted_tomcat).
//
// RNG-REIHENFOLGE je Wurf (fest, alles über `state.rng`):
//   1. nextFloat  — Fangchance (`huntCatchChance`), NUR wenn das Gebiet ≥ 1 fangbares Monster hat
//                   (leerer Pool ⇒ Fehlschlag OHNE Zug — kann nur durch Content-Änderung entstehen).
//   bei Erfolg:
//   2. nextInt    — Monster gleichverteilt aus `huntableMonsters` (Content-Reihenfolge).
//   3. nextInt    — Gold-Streuung wie im Kill-Pfad (`gold + nextInt(0, ceil(gold·0,4))`), danach ×5
//                   (IMMER ×HUNT_LOOT_ROLLS, auch bei verdoppelten Beute-Durchläufen in Schritt 4/5).
//   4. nextFloat  — Begleiter-Passiv `huntDoubleRolls` (Leon/booted_tomcat, Chef 28.08.2026): NUR,
//                   wenn ein Pet mit diesem Kind für `hunting` aktiv ist (`petHuntDoubleRollsChance` > 0);
//                   Treffer ⇒ Schritt 5 läuft HUNT_LOOT_ROLLS_DOUBLED (10) statt HUNT_LOOT_ROLLS (5) mal.
//                   Ohne solches Pet KEIN Zug — Content/Saves ohne Leon bleiben bit-identisch.
//   5. HUNT_LOOT_ROLLS (bzw. ×2) komplette Durchläufe der Monster-Beutetabelle, je Eintrag: nextFloat
//                   (Chance) → bei Erfolg nextInt (Menge) → Meisterring Jagen (`ring_master_hunting`,
//                   masterPerk doubleYield/hunting, capes.ts — Revision 29.08.2026): bei Menge > 0 EIN
//                   nextFloat NUR mit ausgerüstetem Perk (`masterDoubleYieldBonus` > 0), Treffer ⇒ Menge ×2
//                   (ohne Ring KEIN Zug — Saves ohne Ring bleiben bit-identisch) → ggf. Suffix-Rolls über
//                   `tryCraftSuffix` (zieht NUR bei Equipment mit Pool, wie im Kill-Pfad; die Instanz
//                   zweigt ein Exemplar der bereits verdoppelten Menge ab).
//   6. Begleiter-Wurf (`tryPetDrop`, NACH Beute und XP — Muster tick.ts): je nextFloat NUR, wenn
//                   es für `hunting` ein noch nicht besessenes Pet gibt; ohne passendes Pet (oder
//                   schon im Besitz) KEIN Zug — Content ohne Jagen-Pet bleibt bit-identisch.
// Die FANGCHANCE (`huntCatchChance`) kennt KEIN Begleiter-Passiv mehr (das frühere Kind
// `huntCatchChance` +3 pp ist gestrichen, Chef 28.08.2026). Kein Segen-/Runen-/Pet-Multiplikator auf
// die BEUTE-CHANCEN (der Fallen-Tick kennt keine Wanduhr, und Kampf-Effekte gehören dem Kampf) — die
// Tabelle fällt exakt mit ihren Content-Chancen; Leon verdoppelt nur die Zahl der Durchläufe, der
// Meisterring nur die MENGE eines getroffenen Eintrags (Schritt 5), nie die Chance.
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
 * Fangbare Monster eines Gebiets in Content-Reihenfolge: jede Familie (Chef 28.08.2026), nicht
 * dungeonOnly, kein Boss/Champion, `zone === zoneId` und mindestens einmal im Kampf besiegt
 * (`monsterKills[id] ≥ 1`). Rein, kein RNG.
 */
export function huntableMonsters(state: GameState, content: ContentDB, zoneId: string): MonsterId[] {
  const out: MonsterId[] = [];
  const bosses = bossMonsterIds(content);
  for (const m of Object.values(content.monsters)) {
    if (!m || m.zone !== zoneId) continue;
    // Chef 28.08.2026: dungeonOnly-Kreaturen (Götzenhalle, Krypta-Pyroclasp) sind fangbar, sobald sie einmal besiegt wurden;
    // nur die dg_-Varianten (Duplikate der Freilandmonster) und Bosse bleiben draußen.
    if (m.id.startsWith(DUNGEON_VARIANT_PREFIX)) continue;
    if (bosses.has(m.id)) continue;
    if (monsterKills(state, m.id) < 1) continue;
    out.push(m.id);
  }
  return out;
}

/** Köder, den ein Gebiet verlangt (Köder-Stufen, Chef 28.08.2026): eigenes Feld, sonst Tabelle nach Gebietsstufe. */
export function huntZoneBaitId(zone: Pick<HuntZoneDef, "levelRequired" | "baitItemId">): ItemId {
  return zone.baitItemId ?? huntBaitForZoneLevel(zone.levelRequired).itemId;
}

/** Köder einer Sorte gesamt in Inventar UND Lager (Köder darf aus beidem gezogen werden — Muster Saat). */
export function huntBaitCount(state: GameState, baitId: ItemId = BAIT_ITEM_ID): number {
  return itemCount(state.inventory, baitId) + bankCount(state, baitId);
}

/** Verbraucht GENAU einen Köder der Sorte (zuerst Inventar, dann Lager). true bei Erfolg. */
function consumeBait(state: GameState, baitId: ItemId): boolean {
  if (removeItem(state.inventory, baitId, 1) === 1) return true;
  const inBank = state.bank[baitId] ?? 0;
  if (inBank > 0) {
    state.bank[baitId] = inBank - 1;
    if (state.bank[baitId]! <= 0) delete state.bank[baitId];
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
 * Wartet die Falle auf Köder? Gestellt (Gebiet gesetzt), aber Restzeit 0: das Auto-Erneuern fand keinen
 * Köder der Zone (s. Kopf). Sie startet von selbst, sobald wieder Köder in Inventar/Lager liegt
 * (`tickHuntTraps`, Fensterbeginn). Für die UI: Badge „Wartet auf Köder: <Sorte>" (`huntZoneBaitId`).
 */
export function huntTrapWaiting(trap: Pick<HuntTrap, "zoneId" | "remainingMs">): boolean {
  return trap.zoneId !== null && !(trap.remainingMs > 0);
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
 * Platz existiert und ist freigeschaltet (no_slot) → Platz leer (busy; eine WARTENDE Falle zählt als
 * belegt, erst `clearHuntTrap`) → Gebiet im Jagd-Katalog UND
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
  if (huntBaitCount(state, huntZoneBaitId(zone)) <= 0) return "no_bait";
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
  if (!consumeBait(state, huntZoneBaitId(zone))) return "no_bait";
  trap.zoneId = zoneId;
  trap.remainingMs = Math.max(1, zone.trapMs);
  trap.autoRebait = !!autoRebait;
  return "ok";
}

/**
 * Leert einen Platz — der Köder verfällt (wie Beet roden); eine wartende Falle wird ebenfalls geleert.
 * Auto-Erneuern und letzter Fang bleiben.
 */
export function clearHuntTrap(state: GameState, slot: number): void {
  const trap = trapAt(state, slot);
  if (!trap) return;
  trap.zoneId = null;
  trap.remainingMs = 0;
}

/**
 * Schaltet Auto-Erneuern eines Platzes um (Muster setAutoReplant). AUS auf einer WARTENDEN Falle leert
 * den Platz: die ausstehende Erneuerung ist abgesagt, sonst bliebe die Falle ewig „wartend" ohne je zu
 * starten (s. Kopf). Eine laufende Falle bleibt bei AUS gestellt und leert sich erst nach ihrem Wurf.
 */
export function setHuntAutoRebait(state: GameState, slot: number, on: boolean): void {
  const trap = trapAt(state, slot);
  if (!trap) return;
  trap.autoRebait = !!on;
  if (!trap.autoRebait && huntTrapWaiting(trap)) clearHuntTrap(state, slot);
}

/**
 * EIN erfolgreicher Fang: Gold (Kill-Streuung ×5), HUNT_LOOT_ROLLS Durchläufe der Beutetabelle über den
 * normalen Drop-Pfad (Suffix-Instanz möglich, grantLoot: Inventar → Lager → Postfach, itemsGathered),
 * Jagen-XP (Sammel-Tonika multiplizieren wie beim Beet), Breadcrumb mit laufender Fang-Nummer.
 * RNG-Züge s. Kopfkommentar (Schritte 3–6; Schritt 4 = Leon-Glückswurf, Schritt 5 = Beute inkl.
 * Meisterring-Zug je getroffenem Eintrag, Schritt 6 = Begleiter-Wurf).
 */
function grantCatch(state: GameState, content: ContentDB, zone: HuntZoneDef, monster: MonsterDef, live = false): HuntCatch {
  // 3. Gold: derselbe Streuungs-Wurf wie im Kill-Pfad (combat.ts rollKillGold), dann ×HUNT_LOOT_ROLLS
  //    (bewusst NICHT verdoppelt — Leons Glück gilt der Beutetabelle, nicht der Börse).
  const goldRoll = monster.gold + nextInt(state.rng, 0, Math.ceil(monster.gold * 0.4));
  // claude:2026-10-18T12:00:00+02:00 — Narbenbuch „Elsternauge" (goldFindPct): letzter Faktor, ohne Rang 1.
  const gold = Math.max(0, Math.round(goldRoll * HUNT_LOOT_ROLLS * goldFindMult(state, content)));
  state.character.gold += gold;

  // 4. Leon (Chef 28.08.2026, Kind huntDoubleRolls): EIN nextFloat NUR mit aktivem Pet dieses Kinds auf
  //    `hunting` — sonst kein Zug (RNG-Sequenz ohne Leon bleibt bit-identisch, offline == online).
  const doubleChance = petHuntDoubleRollsChance(state, content, HUNTING_SKILL_ID);
  const doubled = doubleChance > 0 && nextFloat(state.rng) < doubleChance;
  // claude:2026-10-24T23:40:00+02:00 — Frische Fährte (1.4.0 EV): der vorgemerkte nächste Fang bekommt FRESH_TRAIL_EXTRA_ROLLS Würfe mehr (auch offline).
  const trail = state.skillEvents?.trailReady === true;
  if (trail) state.skillEvents!.trailReady = false;
  const passes = (doubled ? HUNT_LOOT_ROLLS_DOUBLED : HUNT_LOOT_ROLLS) + (trail ? FRESH_TRAIL_EXTRA_ROLLS : 0);

  // 5. Beute: HUNT_LOOT_ROLLS komplette Tabellen-Durchläufe (J: „5 Beute-Würfe seiner Tabelle"), mit Leon-Glück zehn.
  //    Meisterring Jagen (Revision 29.08.2026, review-1.2.0 P1-4: der 99er-Ring tat beim Jagen nichts, weil der
  //    doubleYield-Perk nur im Aktions-Pfad tick.ts gelesen wurde): `masterDoubleYieldBonus` ist rein (kein RNG),
  //    0 ohne ausgerüsteten Träger — dann fällt der Perk-Zug unten komplett weg (bit-identisch zu vorher).
  const perkDouble = masterDoubleYieldBonus(state, content, HUNTING_SKILL_ID);
  const items: { id: ItemId; qty: number }[] = [];
  for (let pass = 0; pass < passes; pass++) {
    for (const roll of monster.loot) {
      if (nextFloat(state.rng) > Math.min(1, roll.chance)) continue;
      let qty = nextInt(state.rng, roll.min, roll.max);
      // Meisterring: je getroffenem Eintrag mit Menge > 0 EIN nextFloat, Treffer ⇒ Menge ×2 — VOR dem
      // Suffix-Schritt, damit die Instanz aus der verdoppelten Menge abzweigt (Muster tick.ts Mastery-Doppelertrag).
      if (qty > 0 && perkDouble > 0 && nextFloat(state.rng) < perkDouble) qty *= 2;
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

  // claude:2026-10-24T23:40:00+02:00 — nur online: 8 % je Fang, den nächsten Fang vorzumerken (eigener Strom eventRng).
  if (live) rollEstateEvent(state, "fresh_trail");

  // Jagen-XP über den normalen Skill-Pfad (state.skills; Level-Ups liest die UI aus der XP-Differenz).
  const skill = (state.skills[HUNTING_SKILL_ID] ??= { xp: 0 });
  // Chef 28.08.2026: Kampf-XP des gefangenen Monsters ×HUNT_XP_PER_CATCH (huntCatchXp), Erstfang jeder Art ×HUNT_FIRST_CATCH_MULT.
  const byId = (state.stats.huntCatchesById ??= {});
  const first = (byId[monster.id] ?? 0) === 0;
  // claude:2026-10-18T12:00:00+02:00 — Narbenbuch (Lehrjahre/Handgedächtnis): letzter Faktor, ohne Ränge 1.
  skill.xp +=
    huntCatchXp(monster.xp)
    * (first ? HUNT_FIRST_CATCH_MULT : 1)
    * buffGatherXpMult(state, content)
    * prestigeSkillXpMult(state, content, HUNTING_SKILL_ID, skill.xp);
  byId[monster.id] = (byId[monster.id] ?? 0) + 1;

  state.huntCatchSeq += 1;
  state.stats.huntCatches += 1;

  // 6. Begleiter-Wurf (Chef 28.08.2026, Jagen-Begleiter): ein Fang ist der Aktions-Abschluss des
  // Jagens — derselbe Wurf wie in tick.ts `completeAction`, NACH Beute/XP/Zählern. `tryPetDrop` zieht
  // NUR dann einen nextFloat, wenn für `hunting` ein noch nicht besessenes Pet existiert (Breadcrumb
  // `lastPetDrop`/`petDropSeq` setzt es selbst) — Determinismus offline == online bleibt, weil der
  // Wurf Teil des Fang-Pfads ist und nicht vom Fenster abhängt.
  tryPetDrop(state, content, { kind: "skill", skill: HUNTING_SKILL_ID });
  return { seq: state.huntCatchSeq, monsterId: monster.id, items, gold };
}

/**
 * EIN Wurf einer gestellten Falle (RNG-Schritte 1–2, dann `grantCatch`): Fangchance nur bei nicht-leerem
 * Pool würfeln, Monster gleichverteilt; Breadcrumbs `lastCatch`/`lastMissed`, Tally je Monster.
 */
function throwTrap(state: GameState, content: ContentDB, trap: HuntTrap, zone: HuntZoneDef, tally?: HuntCatchTally, live = false): void {
  const pool = huntableMonsters(state, content, zone.zoneId);
  let caught: MonsterDef | null = null;
  if (pool.length > 0 && nextFloat(state.rng) < huntCatchChance(state, content, zone.zoneId)) {
    const id = pool[nextInt(state.rng, 0, pool.length - 1)]!;
    caught = content.monsters[id] ?? null;
  }
  if (caught) {
    trap.lastCatch = grantCatch(state, content, zone, caught, live);
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
 * (verlustfreier Rest-Übertrag); Auto AN ohne Köder ⇒ die Falle WARTET (Gebiet bleibt, remainingMs 0,
 * kein weiterer Wurf in diesem Fenster — Köder kann im Fenster nur weniger werden); Auto AUS ⇒ Platz
 * leer. Zum FENSTERBEGINN startet jede wartende Falle, deren Zone wieder Köder hat (EIN Köder, volle
 * Fallenzeit ab Fensterbeginn, Platz-Reihenfolge bei knappem Köder — kein RNG-Zug). Gesperrte Plätze
 * (Index ≥ huntTrapSlots zum Fensterbeginn) ticken NICHT (Muster Beete). Gebiet aus dem Katalog
 * verschwunden ⇒ Platz leeren (kein RNG-Zug). Ohne `content.huntingZones` sofortiger No-op.
 *
 * @param tally Optionaler Sammler „Fänge je Monster" für dieses Fenster (OfflineSummary.huntCatches).
 */
export function tickHuntTraps(state: GameState, content: ContentDB, dtMs: number, tally?: HuntCatchTally, live = false): void { // claude:2026-10-24T23:40:00+02:00 — live: Ereignis-Wurf
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
    const trapMs = Math.max(1, zone.trapMs);
    if (huntTrapWaiting(trap)) {
      // Wartet auf Köder: zum Fensterbeginn EINEN Köder der Zone ziehen und mit voller Fallenzeit starten;
      // ohne Köder weiter warten (kein Eintrag, kein Wurf, kein RNG-Zug, remainingMs bleibt 0).
      if (!consumeBait(state, huntZoneBaitId(zone))) continue;
      pending.push({ trap, zone, trapMs, due: trapMs });
      continue;
    }
    pending.push({ trap, zone, trapMs, due: Math.max(0, trap.remainingMs) });
  }

  for (;;) {
    let next: Pending | null = null;
    for (const p of pending) if (p.due <= dtMs && (next === null || p.due < next.due)) next = p;
    if (!next) break;
    throwTrap(state, content, next.trap, next.zone, tally, live);
    if (next.trap.autoRebait && consumeBait(state, huntZoneBaitId(next.zone))) {
      next.due += next.trapMs;
      continue;
    }
    // Auto AN ohne Köder ⇒ WARTEN (Gebiet bleibt, review-1.2.0 P2); Auto AUS ⇒ Platz leer. In beiden
    // Fällen kein weiterer Wurf in diesem Fenster.
    if (!next.trap.autoRebait) next.trap.zoneId = null;
    next.trap.remainingMs = 0;
    pending.splice(pending.indexOf(next), 1);
  }
  for (const p of pending) p.trap.remainingMs = p.due - dtMs;
}
