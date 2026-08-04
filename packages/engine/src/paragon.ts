import type {
  CombatEvent,
  CombatState,
  ContentDB,
  GameState,
  ItemId,
  MonsterDef,
  MonsterId,
} from "@hearthforge/shared";
import {
  COMBAT_LOG_MAX,
  PARAGON_ACC_BASE,
  PARAGON_ACC_PER_FLOOR,
  PARAGON_BOSS_DMG_MULT,
  PARAGON_BOSS_HP_MULT,
  PARAGON_BOSS_INTERVAL,
  PARAGON_DMG_BASE,
  PARAGON_DMG_GROWTH,
  PARAGON_DUNGEON_ID,
  PARAGON_GOLD_BASE,
  PARAGON_HP_BASE,
  PARAGON_HP_GROWTH,
  PARAGON_MAX_FLOOR,
  PARAGON_XP_BASE,
  PARAGON_YIELD_GROWTH,
  createPetAbilityRuntime,
  defaultParagonState,
} from "@hearthforge/shared";
import { computeStats } from "./character";
import { isDungeonUnlocked } from "./dungeon";
import { addItemOrBank } from "./inventory";
import { nextFloat, nextInt } from "./rng";
import { tryCraftSuffix } from "./suffix";

/**
 * Paragonturm — „Paragon Dungeon" (dungeon-rework-spec §7, Welle P1; Engine-Fundament).
 *
 * Endloser, dynamisch skalierender Prestige-Turm: 1 Etage = 1 Encounter aus `content.paragon`
 * (deterministische Rotation), dessen Stats zur LAUFZEIT per §7-Formel überschrieben werden —
 * KEIN Content-Duplikat je Etage. combat.ts kennt nur drei minimale, kommentierte Andockstellen
 * (Monster-Auflösung in combatStep, Etagen-Abschluss in onEnemyDefeated, Tod-Reset in
 * onPlayerDefeated) — die gesamte Turm-Logik lebt hier (logic-dev-Revier).
 *
 * Kern-Regeln (Chef-Leitplanken 4+5):
 *  - Pause nach JEDER Etage: der Etagen-Kill beendet den Kampf (kein Auto-Weiter); der
 *    Checkpoint (`state.paragon.checkpoint`) ist sofort persistierbar. „Weiter ab Etage N" =
 *    erneutes startParagonFloor. Verlassen/Offline = einfach kein aktiver Kampf — kein Verlust.
 *    OPT-IN-AUSNAHME (SAVE 67, Welle JJ — Aldric A2): `settings.autoParagonAscend` startet nach
 *    einem siegreichen Etagen-Abschluss sofort die nächste Etage (derselbe startParagonFloor-
 *    Pfad; s. onParagonFloorCleared). Default AUS ⇒ Alt-Verhalten bit-identisch.
 *  - Tod im Turm = kompletter Reset auf Etage 1 (checkpoint → 0); der Rekord `best` bleibt.
 *    Safespots/Zwischen-Checkpoints (z.B. alle 25 Etagen) sind als SPÄTERE Ausbaustufe vermerkt
 *    (Chef: „vllt mit Safespots dann später") — bewusst nicht Teil des Launch-Schnitts.
 *  - Ertrag wächst LANGSAMER als die Schwierigkeit (Gold/XP auf der flachen 1,035-Kurve gegen
 *    1,12-HP-Wachstum) — Guard in paragon.test.ts.
 *  - Kein Loot der Basis-Monster (Chase-Leck!): die synthetische Instanz trägt `loot: []`;
 *    Beute gibt es nur als Etagen-Gold/XP (normaler Kill-Pfad) + Meilenstein-Truhe je 5. Etage.
 *
 * Offline-Neutralität: der Offline-Catch-up (tick.ts step → combatStep) kämpft höchstens die
 * LAUFENDE Etage zu Ende (Clear ODER Tod) — danach ist monsterId null und nichts startet die
 * nächste Etage (identisches Muster wie Dungeon-Runs, Spec §5.8; kein Auto-Chaining).
 * Mit `autoParagonAscend` AN gilt offline BEWUSST dieselbe Semantik wie live (identischer
 * Kill-Pfad): der Turm chained Etage um Etage weiter, bis Tod/Patt/Zeitende die Kette bricht.
 *
 * RNG-Disziplin: die Etagen-Monster-Wahl ist eine PURE Funktion der Etagen-Nummer (Rotation,
 * kein Draw); der Kampf selbst zieht exakt die RNG-Sequenz eines normalen Kampfes (leere
 * Loot-Tabelle ⇒ null Loot-Draws). Der gesamte Pfad ist opt-in (nur via startParagonFloor) —
 * Sim/Alt-Saves bleiben bit-identisch.
 */

/**
 * Ist der Paragonturm permanent entsperrt? (Einmal-Unlock-System, Schlüssel vom Letzten Götzen.)
 * Bewusst der ROHE `dungeonsUnlocked`-Check (deprecated 2-Arg-Signatur): der Turm bleibt auch
 * nach dem quest-basierten Dungeon-Unlock (Welle J, 2026-07-13) sein eigenes System — die
 * Quest-/Trägerzonen-/Übergangsregeln von isDungeonUnlocked(state, content, id) gelten hier
 * NICHT (dort per PARAGON_DUNGEON_ID-Sonderfall ebenfalls ausgenommen).
 */
export function paragonUnlocked(state: GameState): boolean {
  return isDungeonUnlocked(state, PARAGON_DUNGEON_ID);
}

/** Jede 5. Etage ist eine Boss-Etage (×Boss-Mults + Meilenstein-Truhe). */
export function isParagonBossFloor(floor: number): boolean {
  return floor > 0 && floor % PARAGON_BOSS_INTERVAL === 0;
}

/**
 * Basis-Monster-Id der Etage — PURE, deterministische Rotation (kein RNG-Draw; hält Preview
 * und Save/Load-Wiedereinstieg exakt vorhersagbar, s. ParagonContent-Doku in shared):
 * Boss-Etage f: bossPool[(f/5 − 1) mod n] (Fallback pool, falls bossPool fehlt/leer);
 * normale Etage: pool[n(f) mod len] mit n(f) = Anzahl der NORMALEN Etagen vor f
 * (= (f−1) − ⌊(f−1)/5⌋). Bewusst über den Normal-Etagen-ZÄHLER statt roh (f−1): bei einer
 * Pool-Länge, die ein Vielfaches des Boss-Intervalls ist (z.B. 5), fiele sonst immer derselbe
 * Pool-Index auf die Boss-Etagen und ein Pool-Mitglied würde NIE als normale Etage gespawnt.
 * null = kein Content / ungültige Etage → Turm inert.
 */
export function paragonFloorMonsterId(content: ContentDB, floor: number): MonsterId | null {
  if (!Number.isInteger(floor) || floor < 1 || floor > PARAGON_MAX_FLOOR) return null;
  const cfg = content.paragon;
  if (!cfg) return null;
  const pool = cfg.pool ?? [];
  if (isParagonBossFloor(floor)) {
    const bosses = cfg.bossPool && cfg.bossPool.length > 0 ? cfg.bossPool : pool;
    if (bosses.length === 0) return null;
    return bosses[(floor / PARAGON_BOSS_INTERVAL - 1) % bosses.length]!;
  }
  if (pool.length === 0) return null;
  const normalIndex = floor - 1 - Math.floor((floor - 1) / PARAGON_BOSS_INTERVAL);
  return pool[normalIndex % pool.length]!;
}

/**
 * Sekundärwert-Rampe (BLOCKER-Fix Welle BB, fun-review/paragon-aldric.md Befund 1):
 * Die Pool-Monster sind threat-getunte L175–242-Endgame-Gegner — ihre SEKUNDÄRWERTE roh zu
 * erben (Rüstung 90–170, Enrage ×1,7–1,8, Ausweichen 86, Regen, Inflicts, Ward-Quote) stellte
 * die Wand des Turms auf Etage 3 und machte Chronik-Kapitel 21 („Erreiche Etage 5") mit dem
 * kanonischen Kapitel-20-Loadout (Drazhan-Audit §3 „craft") unabschließbar. Fix: die
 * Sekundärwerte werden etagen-basiert EINGEBLENDET — Faktor `PARAGON_SECONDARY_RAMP_BASE` auf
 * Etage 1, linear auf ×1,0 bis Etage `PARAGON_SECONDARY_RAMP_FULL_FLOOR`; ab dort gilt wieder
 * exakt das Basis-Monster (die bisherige E20+-Härte = BiS-/Suffix-Territorium bleibt stehen).
 * HP/Schaden/Genauigkeit behalten ihre §7-Formel unverändert — die 1,12er-HP-Kurve trägt die
 * Spannung der unteren Etagen. Kalibrierung + Korridor-Messwerte:
 * design/balance-paragon-calibration.md; Korridor-Guard: paragon-corridor.test.ts.
 * Konstanten leben bewusst HIER (engine/paragon.ts, nicht shared): reine Turm-Formel-Interna,
 * kein Content-/Save-Belang.
 */
export const PARAGON_SECONDARY_RAMP_BASE = 0.3;
export const PARAGON_SECONDARY_RAMP_FULL_FLOOR = 20;

/** Einblend-Faktor 0..1 der Sekundärwerte einer Etage (PURE; f ≥ RAMP_FULL_FLOOR ⇒ exakt 1). */
export function paragonSecondaryFactor(floor: number): number {
  if (floor >= PARAGON_SECONDARY_RAMP_FULL_FLOOR) return 1;
  const t = (floor - 1) / (PARAGON_SECONDARY_RAMP_FULL_FLOOR - 1);
  return PARAGON_SECONDARY_RAMP_BASE + (1 - PARAGON_SECONDARY_RAMP_BASE) * Math.max(0, t);
}

/**
 * HP-Budget-Onramp der ERSTEN Etagen (Kalibrier-Nachjustierung, s. balance-paragon-calibration.md
 * §Onramp): Die Sekundärwert-Rampe allein ließ Ranged/Magie mit dem Kapitel-20-Referenz-Loadout
 * auf Etage 1 noch bei ~44–50 s TTK (Korridor-Ziel ≤ ~30 s — „unten Tempo, oben Widerstand").
 * Deshalb blendet auch das HP-Budget kurz ein: ×0,65 auf Etage 1, linear auf ×1,0 bis Etage 5 —
 * ab der ersten Boss-Etage (Kapitel-21-Ziel) gilt die §7-Kurve wieder EXAKT (Meilenstein-Boss
 * unangetastet). Schaden/Genauigkeit bleiben komplett auf der §7-Formel.
 */
export const PARAGON_HP_ONRAMP_BASE = 0.65;
export const PARAGON_HP_ONRAMP_FULL_FLOOR = 5;

/** HP-Budget-Onramp-Faktor 0..1 (PURE; f ≥ ONRAMP_FULL_FLOOR ⇒ exakt 1). */
export function paragonHpOnrampFactor(floor: number): number {
  if (floor >= PARAGON_HP_ONRAMP_FULL_FLOOR) return 1;
  const t = (floor - 1) / (PARAGON_HP_ONRAMP_FULL_FLOOR - 1);
  return PARAGON_HP_ONRAMP_BASE + (1 - PARAGON_HP_ONRAMP_BASE) * Math.max(0, t);
}

/**
 * Synthetische Monster-Instanz einer Etage (Spec-§7-Formel + Sekundärwert-Rampe, am „Spawn"
 * berechnet):
 *   hp(f)  = 900 · 1,12^(f−1)   · (Boss ×2) · r(f) — Gesamt-BUDGET (r = paragonHpOnrampFactor,
 *                                                   ×0,65 auf E1 → ×1,0 ab E5); bei Ward-Gegnern
 *                                                   anteilig auf hp+ward verteilt (Threat-Spec-
 *                                                   Regel §3.2), Ward-QUOTE selbst gerampt (s.u.)
 *   dmg(f) = 70  · 1,055^(f−1)  · (Boss ×1,15)
 *   acc(f) = 20  + 0,6·(f−1);   interval = Basis-Monster
 *   Sekundärwerte × k(f) (k = paragonSecondaryFactor, ×0,3 auf E1 → ×1,0 ab E20):
 *     defense·k, evasion·k, regen·k, Ward-Quote·k, inflict.chance/magnitude·k,
 *     enrage.damageMult → 1 + (mult−1)·k (Richtung ×1,0; belowHpPct bleibt Identität).
 *   gold/xp auf der FLACHEN Ertragskurve: 300 · 1,035^(f−1) (Boss ohne Extra-Mult — sein Bonus
 *   ist die Meilenstein-Truhe). `loot: []` — KEIN Basis-Monster-Loot (Chase-Leck).
 * Identität (id/Name/level/resist/family/interval/Art + enrage-Schwelle) bleibt das Basis-
 * Monster — `id` unverändert hält Kill-Credit (monsterKills/Slayer/Bestiarium) und UI-Art
 * automatisch konsistent. Rein lesend, KEIN RNG. null bei fehlendem Content/Pool/Basis-Monster.
 */
export function paragonScaledMonster(content: ContentDB, floor: number): MonsterDef | null {
  const baseId = paragonFloorMonsterId(content, floor);
  const base = baseId ? content.monsters[baseId] : undefined;
  if (!base) return null;
  const boss = isParagonBossFloor(floor);
  const k = paragonSecondaryFactor(floor);
  const hpBudget =
    PARAGON_HP_BASE *
    Math.pow(PARAGON_HP_GROWTH, floor - 1) *
    (boss ? PARAGON_BOSS_HP_MULT : 1) *
    paragonHpOnrampFactor(floor);
  // Ward-Gegner: das HP-Budget wird anteilig auf hp+ward verteilt (Threat-Spec §3.2) — die
  // Ward-QUOTE des Basis-Monsters wird dabei wie die übrigen Sekundärwerte eingeblendet (×k);
  // die SUMME hp+ward folgt weiter exakt der Kurve (Budget-Invariante der Formel-Guards).
  const baseWard = base.wardCapacity ?? 0;
  const baseTotal = base.maxHp + baseWard;
  const ward = baseWard > 0 ? Math.round((hpBudget * baseWard * k) / baseTotal) : 0;
  const hp = Math.max(1, Math.round(hpBudget) - ward);
  const damage =
    PARAGON_DMG_BASE * Math.pow(PARAGON_DMG_GROWTH, floor - 1) * (boss ? PARAGON_BOSS_DMG_MULT : 1);
  const accuracy = PARAGON_ACC_BASE + PARAGON_ACC_PER_FLOOR * (floor - 1);
  const yieldMult = Math.pow(PARAGON_YIELD_GROWTH, floor - 1);
  const scaled: MonsterDef = {
    ...base,
    maxHp: hp,
    // wardCapacity 0 ⇒ Feld weglassen (Basis ohne Ward bleibt „kein Ward" — identische Pfade).
    wardCapacity: ward > 0 ? ward : undefined,
    damage,
    accuracy,
    defense: Math.round(base.defense * k),
    evasion: Math.round(base.evasion * k),
    xp: Math.round(PARAGON_XP_BASE * yieldMult),
    gold: Math.round(PARAGON_GOLD_BASE * yieldMult),
    loot: [], // kein Basis-Loot: leere Tabelle = null RNG-Draws im Kill-Pfad
  };
  // Optionale Sekundärfelder nur überschreiben, wo die Basis sie trägt (identische Kampf-Pfade:
  // ein Basis-Monster ohne regen/enrage/inflict behält exakt „Feld fehlt").
  if (base.regen !== undefined) scaled.regen = base.regen * k;
  if (base.enrage) {
    scaled.enrage = {
      belowHpPct: base.enrage.belowHpPct,
      damageMult: 1 + (base.enrage.damageMult - 1) * k,
    };
  }
  if (base.inflict) {
    scaled.inflict = {
      ...base.inflict,
      chance: base.inflict.chance * k,
      magnitude: base.inflict.magnitude * k,
    };
  }
  return scaled;
}

/**
 * Auflösung des Gegners eines LAUFENDEN Turm-Kampfs (Andockstelle für combatStep):
 * rekonstruiert die skalierte Instanz deterministisch aus (paragonFloor, monsterId).
 * Liefert undefined, wenn die Rotation nicht mehr zur persistierten monsterId passt
 * (Content-Änderung/Save-Edit) — combatStep beendet den Kampf dann sauber (Checkpoint bleibt).
 */
export function paragonCombatMonster(state: GameState, content: ContentDB): MonsterDef | undefined {
  const floor = state.combat.paragonFloor;
  if (!floor) return undefined;
  const scaled = paragonScaledMonster(content, floor);
  return scaled && scaled.id === state.combat.monsterId ? scaled : undefined;
}

/**
 * Startet (oder setzt fort:) die nächste Paragonturm-Etage = `checkpoint + 1`.
 * Gate: Turm entsperrt (Einmal-Unlock) UND kein anderer Kampf aktiv (monsterId === null —
 * anders als startCombat/startDungeon ersetzt der Turm bewusst keinen laufenden Kampf).
 * Kein Schlüssel-/Gold-Verbrauch: der Lauf selbst ist der Einsatz (Tod-Reset).
 * Spiegelt startDungeon: stoppt Skilling, übernimmt einen laufenden Kill-Cooldown; und
 * startCombat: frischer Ward-Voll-Pool (die Etagen-Pause ist explizit zum Aufstocken da).
 * Deterministisch — zieht KEIN RNG. false bei fehlendem Unlock/Content/anderem Kampf.
 */
export function startParagonFloor(state: GameState, content: ContentDB): boolean {
  if (!paragonUnlocked(state)) return false;
  if (state.combat.monsterId !== null) return false; // Gate: kein anderer Kampf
  const paragon = (state.paragon ??= defaultParagonState());
  const floor = paragon.checkpoint + 1;
  const monster = paragonScaledMonster(content, floor);
  if (!monster) return false; // Content fehlt (P2)/Pool leer/Etage jenseits des Numerik-Caps
  state.activeActionId = null;
  state.actionProgressMs = 0;
  state.actionTarget = null; // Invariante „keine aktive Aktion ⇒ kein Ziel" sofort halten
  state.lastStop = null;
  state.stunMs = 0;
  state.combat = {
    monsterId: monster.id,
    enemyHp: monster.maxHp,
    enemyWard: monster.wardCapacity ?? 0,
    playerTimerMs: 0,
    enemyTimerMs: 0,
    kills: 0,
    eventCount: 0,
    enemyEffects: [],
    playerEffects: [],
    log: [],
    dungeonId: null,
    encounterIndex: 0,
    petAbility: createPetAbilityRuntime(),
    paragonFloor: floor,
    // Kill-Cooldown-Übernahme (Muster startCombat/startDungeon): ein laufender Rest-Cooldown
    // wird NICHT abgebrochen — die Etage steht sofort im State, kämpft aber erst nach Ablauf.
    cooldownRemainingMs: state.combat.cooldownRemainingMs,
    lastKill: state.combat.lastKill,
  };
  // Ward-Voll-Init wie startCombat (jeder manuelle Kampfstart beginnt mit vollem Spieler-Ward).
  state.character.ward = computeStats(state, content).maxWard;
  return true;
}

/** Lokaler pushLog-Spiegel (combat.ts hält seins privat; Format/Seq/Deckel identisch). */
function pushParagonLog(cs: CombatState, event: Omit<CombatEvent, "seq">): void {
  cs.log.push({ ...event, seq: cs.eventCount++ });
  if (cs.log.length > COMBAT_LOG_MAX) cs.log.shift();
}

/**
 * Meilenstein-Truhe einer Boss-Etage: rollt alle Truhen-Stufen mit `minFloor ≤ floor`
 * (Spiegel von rollDungeonLootTable in combat.ts: Chance-Wurf → Menge → Suffix NUR bei
 * EXPLIZITER `suffixChance` → addItemOrBank + Loot-Log). ilvl der Suffix-Rolls = Level des
 * Basis-Monsters der Etage (der Truhen-Inhalt entstammt diesem Boss-Kill — analog
 * „ilvl = Monster-Level" im Kill-Drop-Pfad). RNG-Draws NUR für tatsächlich definierte Rows.
 *
 * BREADCRUMB (SAVE 68, Welle LL — Fun-Retest paragon-aldric P1 „Truhe ohne Feedback"): jede
 * Truhen-Vergabe stempelt `state.lastParagonChest` mit dem Inhalt + der monotonen seq aus
 * `paragonChestSeq` (Muster petDropSeq — NIE aus dem nullbaren Breadcrumb ableiten). Ist der
 * vorige Breadcrumb noch NICHT von der UI quittiert (≠ null, z.B. Auto-Aufstieg über mehrere
 * Boss-Etagen oder Offline-Chaining), werden die `items` je Item-ID AUFSUMMIERT (kumulierte
 * Nachholung im Geist der AP-Stapel — kein Truhen-Inhalt geht der Anzeige verloren); `floor`
 * und `seq` zeigen die LETZTE Truhe, `chestTier` das Maximum. `chestTier` = Anzahl der
 * mitrollenden Stufen (1-basiert; Live-Content: 1 ab E5, 2 ab E10, 3 ab E20). Kein Chest-Content
 * für diese Etage ⇒ kein Breadcrumb (Spiegel von `hasChest` in paragonFloorPreview).
 */
function rollParagonChest(state: GameState, content: ContentDB, floor: number, ilvl: number): void {
  const cs = state.combat;
  const tiers = (content.paragon?.chest ?? []).filter((t) => (t.minFloor ?? 1) <= floor);
  if (tiers.length === 0) return; // keine Truhe definiert ⇒ weder Rolls noch Breadcrumb
  // Erbeutete Mengen je Item-ID (inkl. Suffix-Instanz als 1 Basis-Item — wie das Loot-Log).
  const awarded = new Map<ItemId, number>();
  for (const tier of tiers) {
    for (const roll of tier.loot) {
      if (nextFloat(state.rng) <= roll.chance) {
        let qty = nextInt(state.rng, roll.min, roll.max);
        let instanceMade = 0;
        const suffixChance = roll.suffixChance ?? 0; // explizit-only (Muster Dungeon-Clear-Loot)
        if (qty > 0 && suffixChance > 0) {
          const res = tryCraftSuffix(state, content, roll.itemId, ilvl, suffixChance);
          if (res) {
            qty -= 1;
            instanceMade = 1;
          }
        }
        const { toInventory, toBank } = addItemOrBank(state, content, roll.itemId, qty);
        state.stats.itemsGathered += toInventory + toBank + instanceMade;
        const dropped = qty + instanceMade;
        if (dropped > 0) {
          pushParagonLog(cs, { by: "player", kind: "loot", amount: dropped, itemId: roll.itemId });
          awarded.set(roll.itemId, (awarded.get(roll.itemId) ?? 0) + dropped);
        }
      }
    }
  }
  // Breadcrumb stempeln — IMMER bei vergebener Truhe (auch wenn alle Chance-Rows verfehlten:
  // der Meilenstein selbst darf nie stumm sein; items ist dann leer). RNG-frei.
  state.paragonChestSeq += 1;
  const prev = state.lastParagonChest;
  const items = new Map<ItemId, number>(prev?.items.map((i) => [i.id, i.qty]) ?? []);
  for (const [id, qty] of awarded) items.set(id, (items.get(id) ?? 0) + qty);
  state.lastParagonChest = {
    floor,
    chestTier: Math.max(tiers.length, prev?.chestTier ?? 0),
    items: [...items].map(([id, qty]) => ({ id, qty })),
    seq: state.paragonChestSeq,
  };
}

/**
 * Etagen-Abschluss (Andockstelle für onEnemyDefeated, NACH den normalen Kill-Belohnungen —
 * Etagen-Gold/XP sind die xp/gold-Werte der synthetischen Instanz und laufen über den
 * unveränderten Kill-Pfad):
 *  1. Checkpoint++ (persistiert den Fortschritt) + Rekord `best` monoton nachziehen.
 *  2. Boss-Etage (jede 5.): Meilenstein-Truhe rollen (VOR dem Kampf-Ende, damit die
 *     Loot-Events noch ins Kampf-Log gehen).
 *  3. Kampf ENDET (Leitplanke 4 — Pause zum Aufstocken; kein Auto-Weiter). Bewusst OHNE
 *     Kill-Cooldown/lastKill: ohne laufenden combatStep liefe die Summary nie ab
 *     (identische Begründung wie der Dungeon-Abschluss).
 *  4. OPT-IN Auto-Aufstieg (SAVE 67, Welle JJ — Aldric A2): ist `settings.autoParagonAscend`
 *     an, startet sofort die nächste Etage über den UNVERÄNDERTEN startParagonFloor-Pfad
 *     (voller Ward-Init wie beim manuellen Klick, kein RNG-Draw — Sim-/Alt-Save-neutral, weil
 *     der Default false ist). Der Aufrufer (combatStep) hält danach seine Stale-Guards ein:
 *     die lokale cs-Referenz zeigt auf das ALTE, hier genullte Kampf-Objekt → `monsterId !==
 *     monster.id` beendet den Tick; die neue Etage kämpft ab dem NÄCHSTEN Tick. Kettenende
 *     natürlich: Tod (resetParagonOnDeath läuft im Defeat-Pfad, nie hier), manuelles Verlassen
 *     (stopCombat räumt paragonFloor), fehlender Content oder PARAGON_MAX_FLOOR (startParagonFloor
 *     liefert dann false — Kampf bleibt einfach beendet, Checkpoint steht).
 */
export function onParagonFloorCleared(state: GameState, content: ContentDB): void {
  const cs = state.combat;
  const floor = cs.paragonFloor ?? 0;
  const paragon = (state.paragon ??= defaultParagonState());
  if (floor > paragon.checkpoint) paragon.checkpoint = Math.min(floor, PARAGON_MAX_FLOOR);
  if (paragon.checkpoint > paragon.best) paragon.best = paragon.checkpoint;
  if (isParagonBossFloor(floor)) {
    const baseId = paragonFloorMonsterId(content, floor);
    const ilvl = (baseId && content.monsters[baseId]?.level) || 1;
    rollParagonChest(state, content, floor, ilvl);
  }
  // Kampf sauber beenden (Spiegel von endDungeon in combat.ts).
  cs.paragonFloor = undefined;
  cs.monsterId = null;
  cs.playerTimerMs = 0;
  cs.enemyTimerMs = 0;
  cs.enemyEffects = [];
  cs.playerEffects = [];
  cs.petAbility = createPetAbilityRuntime();
  cs.encounterXp = undefined; // Begegnung vorbei → Kill-Summary-Akkumulator verfällt
  cs.effectCounters = undefined; // Spezial-Effekt-Zähler resetten bei Kampfende
  // Opt-in Auto-Aufstieg (Doku-Punkt 4 oben): NACH dem sauberen Kampfende die nächste Etage
  // starten. startParagonFloor ersetzt state.combat durch ein frisches Objekt (die soeben
  // genullte cs-Referenz bleibt als Stale-Guard-Anker des Aufrufers unangetastet) und prüft
  // selbst Unlock/Content/Etagen-Cap — schlägt es fehl, bleibt exakt das Pausen-Verhalten.
  if (state.settings.autoParagonAscend) startParagonFloor(state, content);
}

/**
 * Tod-Reset (Andockstelle für onPlayerDefeated): Tod im Turm = kompletter Reset auf Etage 1
 * (checkpoint → 0); der Prestige-Rekord `best` bleibt UNANGETASTET. Außerhalb des Turms
 * (paragonFloor undefined) ein reiner No-op — Normalkampf-/Dungeon-Tode berühren den
 * Checkpoint nie. Guard: paragon.test.ts („Tod-Reset").
 */
export function resetParagonOnDeath(state: GameState): void {
  const cs = state.combat;
  if (!cs.paragonFloor) return;
  cs.paragonFloor = undefined;
  if (state.paragon) state.paragon.checkpoint = 0;
}

/** Status-Selektor für die UI (Welle P2) — nie raw in state.paragon greifen. */
export interface ParagonStatus {
  /** Turm permanent entsperrt (Einmal-Unlock via paragon_key)? */
  unlocked: boolean;
  /** Nächste zu kämpfende Etage (= checkpoint + 1) — die „Weiter ab Etage N"-Zahl. */
  currentFloor: number;
  /** Prestige-Rekord „Höchste Etage" (Stats-Seite). */
  bestFloor: number;
  /** Gerade aktiv gekämpfte Etage (null = keine — Turm pausiert). */
  activeFloor: number | null;
}

export function paragonStatus(state: GameState): ParagonStatus {
  const p = state.paragon ?? defaultParagonState();
  return {
    unlocked: paragonUnlocked(state),
    currentFloor: p.checkpoint + 1,
    bestFloor: p.best,
    activeFloor: state.combat.paragonFloor ?? null,
  };
}

/** Etagen-Vorschau für die UI (Welle P2): Monster + skalierte Stats der Etage. */
export interface ParagonFloorPreview {
  floor: number;
  isBoss: boolean;
  /** Rollt auf dieser Etage eine Meilenstein-Truhe (Boss-Etage + Truhen-Content vorhanden)? */
  hasChest: boolean;
  /** Die synthetische, formel-skalierte Monster-Instanz (Name/Art = Basis; Stats/xp/gold = Etage). */
  monster: MonsterDef;
}

/** null = Turm-Content fehlt (P2) oder Etage ungültig — UI zeigt dann nichts an. */
export function paragonFloorPreview(content: ContentDB, floor: number): ParagonFloorPreview | null {
  const monster = paragonScaledMonster(content, floor);
  if (!monster) return null;
  const isBoss = isParagonBossFloor(floor);
  const hasChest =
    isBoss && (content.paragon?.chest ?? []).some((t) => (t.minFloor ?? 1) <= floor);
  return { floor, isBoss, hasChest, monster };
}
