import type {
  ContentDB,
  GameState,
  ItemId,
  MonsterDef,
  MonsterId,
  SlayerMasterDef,
  SlayerMasterId,
  SlayerTask,
  SlayerTowerFloor,
} from "@hearthforge/shared";
import {
  DUNGEON_VARIANT_PREFIX,
  SLAYER_MIN_TASK_POOL,
  SLAYER_POINTS_TOTAL_BONUS_CAP,
  SLAYER_SKIP_FREE_BELOW_LEVEL,
  SLAYER_STREAK_POINT_INTERVAL,
  SLAYER_STREAK_TOKEN_BONUS,
  SLAYER_STREAK_TOKEN_INTERVAL,
  SLAYER_TOWER_FLOOR_THRESHOLDS,
  SLAYER_XP_KILL_FACTOR,
  earlyXpMult,
} from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { combatLevel } from "./dungeon";
import { addItemOrBank, itemCount } from "./inventory";
import { masterSlayerPointsBonus } from "./capes";
import { campBoost, campKindAtMaxLevel } from "./camp";
import { bankCount } from "./bank";
import { nextFloat, nextInt } from "./rng";
import { isZoneUnlocked } from "./zones";

// ───────────────────────────────────────────────────────────────────────────
// Slayer (Monsterjäger) — reine, deterministische Engine-Logik.
// RNG ausschließlich über state.rng und nur in assignTask (spieler-getriggert, wie Thieving/Loot).
// computeStats/Combat bleiben unberührt; Slayer ist additiv.
// ───────────────────────────────────────────────────────────────────────────

/** Aktuelles Slayer-Skill-Level (aus state.skills["slayer"], 0-XP-fest). */
export function getSlayerLevel(state: GameState): number {
  return levelFromXp(state.skills["slayer"]?.xp ?? 0);
}

/** Der aktive Slayer-Task (null = keiner). */
export function getActiveTask(state: GameState): SlayerTask | null {
  return state.slayerTask ?? null;
}

/**
 * Alle FÜR DEN SPIELER freigeschalteten Slayer-Master: combatLevel UND slayerLevel ≥ Unlock.
 * Fehlt `content.slayerMasters`, ist die Liste leer (kein Slayer verfügbar).
 */
export function getAvailableMasters(state: GameState, content: ContentDB): SlayerMasterDef[] {
  const masters = content.slayerMasters ?? [];
  const cl = combatLevel(state);
  const sl = getSlayerLevel(state);
  return masters.filter((m) => cl >= m.unlock.combatLevel && sl >= m.unlock.slayerLevel);
}

/** Die per Slayer-Level freigeschalteten Tower-Etagen (aufsteigend nach Etage). */
export function unlockedTowerFloors(state: GameState, content: ContentDB): SlayerTowerFloor[] {
  const sl = getSlayerLevel(state);
  return (content.slayerTower ?? [])
    .filter((f) => sl >= f.slayerLevelRequired)
    .sort((a, b) => a.floor - b.floor);
}

/**
 * Erfüllt der Spieler die Slayer-Item-Anforderung des Monsters?
 * true, wenn (a) das Monster keine Anforderung hat, ODER (b) ein Item mit `slayerHelm: true`
 * ausgerüstet ist (kombinierter Helm ersetzt ALLE Einzel-Anforderungen), ODER (c) das geforderte
 * Item ausgerüstet ist, im Inventar liegt ODER in der Bank liegt (Besitz genügt — idle-fair).
 */
export function slayerRequirementMet(
  state: GameState,
  content: ContentDB,
  monsterId: MonsterId,
): boolean {
  const monster: MonsterDef | undefined = content.monsters[monsterId];
  if (!monster) return false;
  const req = monster.slayerRequirement;
  if (!req) return true;

  // (b) Ausgerüsteter kombinierter Slayer-Helm erfüllt alles.
  for (const slotItem of Object.values(state.character.equipment)) {
    if (slotItem && content.items[slotItem]?.slayerHelm) return true;
  }

  // (c) Besitz des geforderten Items: Ausrüstung ODER Inventar ODER Bank.
  for (const slotItem of Object.values(state.character.equipment)) {
    if (slotItem === req) return true;
  }
  if (itemCount(state.inventory, req) > 0) return true;
  if (bankCount(state, req) > 0) return true;
  return false;
}

/**
 * [Sweep6 W2-T2-F6] Ist die Tower-Etage dieses Monsters freigeschaltet? Monster ohne
 * `slayerFloor` (Welt-Monster) sind immer „frei". Die Schwelle kommt aus der Etagen-Definition
 * (`SlayerTowerFloor.slayerLevelRequired`); fehlt die Etage im Content (Tagging-Drift), greift
 * defensiv die Referenz-Schwelle `SLAYER_TOWER_FLOOR_THRESHOLDS` — lieber zu streng als ein
 * offenes Gate.
 */
export function towerFloorUnlocked(state: GameState, content: ContentDB, monster: MonsterDef): boolean {
  const floor = monster.slayerFloor;
  if (floor == null) return true;
  const def = (content.slayerTower ?? []).find((f) => f.floor === floor);
  const required = def?.slayerLevelRequired ?? SLAYER_TOWER_FLOOR_THRESHOLDS[floor - 1] ?? 1;
  return getSlayerLevel(state) >= required;
}

/**
 * HARD-BLOCK (Chef-Entscheidung): Darf der Spieler dieses Monster überhaupt bekämpfen?
 * false, wenn (a) das Monster eine Slayer-Anforderung hat, die der Spieler nicht erfüllt, ODER
 * (b) [Sweep6 W2-T2-F6] das Monster auf einer noch GESPERRTEN Tower-Etage steht — das Etagen-Gate
 * lebte vorher nur in der UI (CombatPage) und war headless/per Save-Edit/Sim umgehbar (latentes
 * API-Loch; die Sim-Läufe farmten Etage 2/3 mit Slayer 1). Monster ohne Anforderung und ohne
 * Etage sind immer kämpfbar. combat-dev nutzt das in startCombat (Hard-Block, combat.ts).
 */
export function canFightMonster(state: GameState, content: ContentDB, monsterId: MonsterId): boolean {
  const monster = content.monsters[monsterId];
  if (!monster) return false;
  if (!towerFloorUnlocked(state, content, monster)) return false;
  // Story-Zonen-Gate (Aschechronik, ceo-run-2026-07-13 Welle C): Monster einer quest-gesperrten
  // Zone (`ZoneDef.requiresQuest`, engine/zones.ts isZoneUnlocked) sind NICHT direkt bekämpfbar —
  // derselbe Hard-Block-Pfad wie Slayer-Anforderung/Tower-Etage (startCombat lehnt ab, kein
  // Throw). Dungeon-Wellen (startDungeon/onEnemyDefeated) und der Paragonturm (startParagonFloor)
  // laufen NICHT über diesen Pfad und bleiben wie beschlossen rein key-/unlock-gated. Monster
  // ohne Zone bzw. Zonen ohne requiresQuest ⇒ No-op (heutiges Verhalten).
  if (monster.zone && !isZoneUnlocked(state, content, monster.zone)) return false;
  return slayerRequirementMet(state, content, monsterId);
}

// ───────────────────────────────────────────────────────────────────────────
// Welt-Task-Monster-Pool — DYNAMISCH nach Kampf-Niveau (Chef-Vorgabe 2026-06-29).
// Statt eines fixen, handgepflegten `master.taskPool` ziehen Welt-Tasks ihre Monster aus
// content.monsters: Mobs, deren `level` ein paar Stufen ÜBER dem Spieler-Combat-Level liegt
// (forderndes Slayer-Erlebnis — keine Low-Level-Goblins für High-Level-Spieler).
// ───────────────────────────────────────────────────────────────────────────

/** Untere Fenster-Kante: mindestens combatLevel + 1 (immer ÜBER dem Spieler). */
export const WORLD_TASK_LEVEL_MIN_OVER = 1;
/** Obere Fenster-Kante: bis combatLevel + 8 (forderndes, aber machbares Fenster). */
export const WORLD_TASK_LEVEL_MAX_OVER = 8;
/**
 * Untere TURM-Fenster-Kante (Welle LL, Fun-RETEST slayer-vesna): Turm-Tasks nur für Monster ab
 * `combatLevel − TOWER_TASK_LEVEL_MAX_UNDER`. Vorher war die Unterkante hart 0 — ein Kampf-Level-96-
 * Charakter zog zu ~25 % Trivial-Etagen (Etage 1/2, Monster L3–38: 160 XP vs. 11.900 XP Welt-Task,
 * Faktor ~74). Mit 20 Leveln Spielraum bleiben leicht unterlevelige Etagen legitime Tasks
 * (freigeschaltete Etagen unter dem eigenen Niveau sind gewollt), aber keine Trivial-Böden mehr:
 * CL 96 ⇒ Fenster [76..104] = die reale Etage-4/5-Spitze. Charaktere mit CL ≤ 20 haben weiterhin
 * Unterkante 0 (bit-identisches Alt-Verhalten). Fällt der Pool unter SLAYER_MIN_TASK_POOL, streckt
 * `stretchLevelWindow` die Unterkante notfalls wieder runter (Pool-Mindestgröße geht vor Härte).
 */
export const TOWER_TASK_LEVEL_MAX_UNDER = 20;

/**
 * Endgame-Pool-Streckung (Welle GG/slayer-vesna V3): streckt ein Level-Fenster [lo..hi], bis
 * mindestens `minPool` der gegebenen Kandidaten-Level hineinfallen oder das Fenster den gesamten
 * Kandidaten-Bereich abdeckt (Pool erschöpft). Streck-Reihenfolge: ERST die untere Kante runter
 * (leichtere Monster zuerst — kein Schwierigkeits-Sprung), DANN die obere hoch. Rein &
 * deterministisch (kein RNG, kein State) → exakt testbar. Leere Kandidatenliste = No-op.
 */
export function stretchLevelWindow(
  levels: readonly number[],
  lo: number,
  hi: number,
  minPool: number,
): { lo: number; hi: number } {
  if (levels.length === 0) return { lo, hi };
  let min = Infinity;
  let max = -Infinity;
  for (const l of levels) {
    if (l < min) min = l;
    if (l > max) max = l;
  }
  const countIn = (a: number, b: number): number => {
    let n = 0;
    for (const l of levels) if (l >= a && l <= b) n++;
    return n;
  };
  while (countIn(lo, hi) < minPool && (lo > min || hi < max)) {
    if (lo > min) lo--;
    else hi++;
  }
  return { lo, hi };
}

/**
 * Baut den Welt-Task-Pool DYNAMISCH aus content.monsters:
 *  - Welt-Monster = alles, was NICHT zum Slayer-Tower gehört (Tower-Mobs haben einen eigenen
 *    Pfad/Gating und werden über die Etagen gezogen).
 *  - Primärfenster: level in [combatLevel+MIN .. combatLevel+MAX] — ein paar Stufen über dem Spieler.
 *  - Endgame-Pool-Streckung (Welle GG/slayer-vesna V3): fallen weniger als SLAYER_MIN_TASK_POOL
 *    Kandidaten ins Fenster (hohe Kampflevel — kaum noch Mobs ÜBER dem Spieler), wird das Fenster
 *    per `stretchLevelWindow` gestreckt (untere Kante zuerst runter, dann obere hoch), bis ≥ 4
 *    Kandidaten hineinfallen oder ALLE Welt-Monster erfasst sind. Ersetzt den früheren
 *    „nächstgelegenes Monster"-Fallback (der lieferte am Level-Cap immer denselben 1er-Pool) —
 *    der Pool ist weiterhin nie leer, solange überhaupt Welt-Monster existieren.
 * Reine, deterministische Auswahl-Vorbereitung (kein RNG hier; der Würfel fällt in assignTask).
 */
export function worldTaskMonsters(state: GameState, content: ContentDB): MonsterId[] {
  const cl = combatLevel(state);
  const lo = cl + WORLD_TASK_LEVEL_MIN_OVER;
  const hi = cl + WORLD_TASK_LEVEL_MAX_OVER;

  const world = Object.values(content.monsters).filter(
    // ...und nur bekämpfbare Mobs (Slayer-Anforderung erfüllt) — symmetrisch zum Tower-Pfad, verhindert einen
    // blockierten Welt-Task, falls je ein Welt-Monster eine slayerRequirement bekommt (Tester-Sweep3 T9, Vorsorge).
    // dungeonOnly-Monster (Dungeon-Rework §5.1.2/§5.3, z.B. die Idol-Wellen) sind KEINE Welt-Monster:
    // ein Welt-Task auf sie wäre nur via Dungeon-Runs erfüllbar (Soft-Lock auf Zeit). Der Kill-Credit
    // von Dungeon-Wellen läuft ohnehin über die Basis-Id (killCreditMonsterId, combat.ts).
    // [Task #347, P0] dg_-Dungeon-Zwillinge sind GEISTER-Ziele: JEDER Kill (Zone wie Dungeon-
    // Welle) kreditiert über killCreditMonsterId (combat.ts) auf die BASIS-ID — ein Task auf die
    // dg_-ID selbst sieht also NIE einen Treffer (Spieler-Report: „0/43, Kills zählen nicht").
    // Die Krypta-Zwillinge (dg_skeleton_*) tragen zone "crypt" OHNE dungeonOnly-Flag und rutschten
    // so am dungeonOnly-Filter vorbei in den Welt-Pool. Der Präfix-Filter greift UNABHÄNGIG vom
    // Content-Tagging (defensiv gegen künftige dg_-Zwillinge ohne Flag); die Basis-Monster stehen
    // selbst im Pool (kein Doppel-Gewicht durch Normalisieren statt Filtern). Die KREDIT-Richtung
    // bleibt unberührt: Dungeon-Kills zählen weiter auf Basis-ID-Tasks.
    (m) =>
      m.slayerFloor == null &&
      m.zone !== "slayer_tower" &&
      !m.dungeonOnly &&
      !m.id.startsWith(DUNGEON_VARIANT_PREFIX) &&
      // Story-Zonen-Gate (Welle C): Monster gesperrter Zonen fliegen aus dem Welt-Task-Pool —
      // sonst vergäbe assignTask einen Task, den canFightMonster hart blockiert (Soft-Lock,
      // Skip kostet Punkte). Symmetrisch zum Kampf-Start-Gate; ohne Content-Gates ein No-op.
      (m.zone == null || isZoneUnlocked(state, content, m.zone)) &&
      slayerRequirementMet(state, content, m.id),
  );
  if (world.length === 0) return [];

  // Fenster ggf. strecken (No-op, wenn schon ≥ SLAYER_MIN_TASK_POOL Kandidaten drinliegen).
  const win = stretchLevelWindow(world.map((m) => m.level), lo, hi, SLAYER_MIN_TASK_POOL);
  return world.filter((m) => m.level >= win.lo && m.level <= win.hi).map((m) => m.id);
}

/**
 * Punkte-Skalierung nach Task-Größe (Welle GG/slayer-vesna V1): pointReward skaliert SANFT linear
 * um den Mittelwert der Master-Spanne statt flach `basePoints` —
 *   scale = 0.5 + 0.5 · (required / mid)   mit   mid = (taskAmount.min + taskAmount.max) / 2
 * Am Spannen-Mittel exakt ×1 (Punkte-Ökonomie im Schnitt unverändert — Shop-Kalibrierung hält);
 * der kleinste Brenna-Task (15/32.5) zahlt ~×0.73, der größte (50/32.5) ~×1.27. Kaufmännisch
 * gerundet, min 1. Fix-Spannen (min == max) bleiben EXAKT basePoints. Nur die Task-VERGABE nutzt
 * das — ein bereits laufender Task behält seine beim Assign gerollten Werte.
 */
export function scaledTaskPoints(master: SlayerMasterDef, required: number): number {
  const mid = (master.taskAmount.min + master.taskAmount.max) / 2;
  const scale = mid > 0 && Number.isFinite(mid) ? 0.5 + 0.5 * (required / mid) : 1;
  return Math.max(1, Math.round(master.basePoints * scale));
}

/**
 * Vergibt einen neuen Slayer-Task beim gegebenen Master. Nur wenn aktuell KEIN Task aktiv ist und
 * der Master freigeschaltet ist; sonst null. Deterministisch über state.rng (rückt RNG vor).
 *
 * Ablauf:
 *  1. Typ-Wurf: nextFloat < towerTaskChance → Tower-Task, sonst Welt-Task.
 *  2. Monster: Welt = gleichverteilt aus dem DYNAMISCHEN Level-Fenster-Pool (worldTaskMonsters,
 *     ein paar Stufen über dem Spieler); Tower = Etagen-Los GEWICHTET nach Kandidatenzahl der
 *     Etage (Welle NN), dann gleichverteilt aus der Etage — äquivalent zu einem flachen Los über
 *     den vereinigten Kandidaten-Pool. Leerer/unmöglicher Pool → Fallback auf den jeweils anderen
 *     Typ; geht beides nicht → null.
 *  3. N = nextInt(min, max).
 *  4. Belohnung beim Assign fix: xpReward = round(monster.xp * SLAYER_XP_KILL_FACTOR * N),
 *     pointReward = scaledTaskPoints(master, N) — skaliert sanft mit der Task-Größe (V1).
 *
 * `master.taskPool` wird vom dynamischen Algorithmus ERSETZT und nicht mehr gelesen (Feld bleibt
 * im Typ gültig, Content lässt es leer).
 */
export function assignTask(
  state: GameState,
  content: ContentDB,
  masterId: SlayerMasterId,
): SlayerTask | null {
  if (state.slayerTask) return null;
  const master = getAvailableMasters(state, content).find((m) => m.id === masterId);
  if (!master) return null;

  const floors = unlockedTowerFloors(state, content);
  const towerPossible = floors.some((f) => f.monsters.length > 0);
  const worldPool = worldTaskMonsters(state, content);
  const worldPossible = worldPool.length > 0;
  if (!towerPossible && !worldPossible) return null;

  // 1. Typ-Wurf (RNG immer ziehen → determinismus-stabil), dann auf das Mögliche zwingen.
  let isTower = nextFloat(state.rng) < master.towerTaskChance;
  if (isTower && !towerPossible) isTower = false;
  if (!isTower && !worldPossible) isTower = true;

  let monsterId: MonsterId;
  if (isTower) {
    // Nur Etagen/Monster, deren Slayer-Anforderung der Spieler ERFÜLLT — sonst bekäme er einen
    // hart-blockierten Task ohne Fortschritt (Soft-Lock, Tester-Sweep SL1). Im Normalfall (alle
    // Anforderungen erfüllt) bleiben Filter no-op und die RNG-Ziehungen identisch → determinismus-stabil.
    // [Sweep6 W2-T4-P2-2] PLUS Kampf-Niveau-Plausibilität wie im Welt-Fenster: Tower-Kandidaten
    // nur bis level ≤ CL + WORLD_TASK_LEVEL_MAX_OVER. Vorher vergab der Turm-Pfad frisch bei CL 3
    // Tasks bis +16 Level (tower_goblin_rogue L19) — mit 5 Pkt/Task und Skip 20 eine Sackgasse auf
    // Zeit. Seit Welle LL gibt es auch eine UNTERE Kante (CL − TOWER_TASK_LEVEL_MAX_UNDER, s.u.).
    // Passt NICHTS ins Fenster, greift der bestehende Fallback auf den Welt-Task.
    // Endgame-Pool-Streckung (Welle GG V3): fallen weniger als SLAYER_MIN_TASK_POOL bekämpfbare
    // Turm-Kandidaten ins Fenster, wird es per stretchLevelWindow gestreckt (untere Kante zuerst
    // runter, dann die obere hoch), bis ≥ 4 Kandidaten oder alle Monster der freigeschalteten
    // Etagen erfasst sind. Die Früh-Sackgasse bleibt entschärft: unter Slayer-Level 10 ist der
    // Skip gratis (SLAYER_SKIP_FREE_BELOW_LEVEL) und bricht seit Welle GG auch die Streak nicht.
    // UNTERE Kante (Welle LL, slayer-vesna): max(0, CL − TOWER_TASK_LEVEL_MAX_UNDER) statt hart 0 —
    // hochstufige Charaktere ziehen keine Trivial-Etagen mehr (Doku an der Konstante); die
    // Streckung darf sie notfalls wieder senken (Pool-Mindestgröße 4 geht vor). CL ≤ 20 ⇒ lo 0
    // = bit-identisches Alt-Verhalten. Bestands-Tasks bleiben unangetastet (nur die VERGABE).
    const cl = combatLevel(state);
    const baseHi = cl + WORLD_TASK_LEVEL_MAX_OVER;
    const baseLo = Math.max(0, cl - TOWER_TASK_LEVEL_MAX_UNDER);
    const candidateLevels: number[] = [];
    for (const f of floors) {
      for (const m of f.monsters) {
        if (!slayerRequirementMet(state, content, m)) continue;
        const lvl = content.monsters[m]?.level;
        if (typeof lvl === "number" && Number.isFinite(lvl)) candidateLevels.push(lvl);
      }
    }
    const win = stretchLevelWindow(candidateLevels, baseLo, baseHi, SLAYER_MIN_TASK_POOL);
    const taskable = (m: MonsterId): boolean => {
      if (!slayerRequirementMet(state, content, m)) return false;
      const lvl = content.monsters[m]?.level;
      // Monster ohne endliches Level bleiben (wie bisher via `?? Infinity ≤ hi`) ausgeschlossen.
      return typeof lvl === "number" && Number.isFinite(lvl) && lvl >= win.lo && lvl <= win.hi;
    };
    const usable = floors
      .map((f) => f.monsters.filter(taskable))
      .filter((mons) => mons.length > 0);
    if (usable.length === 0) {
      // Kein bekämpfbares Tower-Monster → auf Welt-Task ausweichen (oder gar kein Task).
      if (!worldPossible) return null;
      isTower = false;
      monsterId = worldPool[nextInt(state.rng, 0, worldPool.length - 1)]!;
    } else {
      // Etagen-Los GEWICHTET nach Kandidatenzahl (Welle NN, Fun-Sweep R3 slayer-vesna): vorher
      // fiel das Los GLEICHVERTEILT über brauchbare Etagen — eine Etage mit nur 1 Fenster-
      // Kandidaten (Etage 4 bei CL 96: allein Bone Colossus) war so wahrscheinlich wie eine mit
      // 5, und EIN Monster stellte 26 % aller Endgame-Tasks (49,5 % der Turm-Tasks; Vesna R3,
      // 200 Ziehungen). Jetzt ist P(Etage) ∝ Zahl ihrer Kandidaten, danach gleichverteilt IN der
      // Etage — zusammen exakt ein FLACHES Los über den vereinigten Kandidaten-Pool (jedes
      // Monster 1/total). RNG-Disziplin: weiterhin GENAU 2 Ziehungen auf diesem Pfad (Etage,
      // dann Monster); nur die Spanne des Etagen-Wurfs ändert sich ([0..Etagen−1] → [0..total−1]).
      // Mit EINER brauchbaren Etage (Frühspiel, CL ≤ 20) ist das Ergebnis dadurch BIT-IDENTISCH
      // zum Altstand: der Etagen-Wurf trifft zwangsläufig dieselbe Etage und verbraucht wie
      // vorher einen Draw, der Monster-Wurf sieht denselben RNG-Zustand.
      const total = usable.reduce((n, mons) => n + mons.length, 0);
      let roll = nextInt(state.rng, 0, total - 1);
      let mons = usable[usable.length - 1]!;
      for (const candidates of usable) {
        if (roll < candidates.length) {
          mons = candidates;
          break;
        }
        roll -= candidates.length;
      }
      monsterId = mons[nextInt(state.rng, 0, mons.length - 1)]!;
    }
  } else {
    monsterId = worldPool[nextInt(state.rng, 0, worldPool.length - 1)]!;
  }

  const required = nextInt(state.rng, master.taskAmount.min, master.taskAmount.max);
  const monster = content.monsters[monsterId];
  const xpReward = Math.round((monster?.xp ?? 0) * SLAYER_XP_KILL_FACTOR * required);

  const task: SlayerTask = {
    masterId,
    monsterId,
    isTower,
    required,
    progress: 0,
    xpReward,
    // V1 (Welle GG): Punkte skalieren sanft mit der Task-Größe (am Spannen-Mittel = basePoints).
    pointReward: scaledTaskPoints(master, required),
  };
  state.slayerTask = task;
  return task;
}

/** Interner XP-Grant (repliziert combat.addXp: Frühgame-Verstärker, kein RNG). */
function grantSlayerXp(state: GameState, amount: number): void {
  if (amount <= 0) return;
  const skill = (state.skills["slayer"] ??= { xp: 0 });
  skill.xp += amount * earlyXpMult(levelFromXp(skill.xp));
}

/** Pro-Kill-Slayer-XP eines Task-Monsters = round(monster.xp * SLAYER_XP_KILL_FACTOR). */
function perKillSlayerXp(content: ContentDB, monsterId: MonsterId): number {
  return Math.round((content.monsters[monsterId]?.xp ?? 0) * SLAYER_XP_KILL_FACTOR);
}

/**
 * Verbucht einen Kill für den aktiven Slayer-Task. Pur & deterministisch (kein RNG).
 * combat.ts ruft das in onEnemyDefeated NACH dem Kill-Zähler auf. No-op, wenn kein Task,
 * falsches Monster oder die Item-Anforderung nicht erfüllt ist (zählt dann nicht).
 *
 * Pro-Kill-XP (Chef-Vorgabe 2026-06-29): JEDER zählende Kill des Task-Monsters gewährt sofort
 * Slayer-XP (`perKillSlayerXp`), nicht erst beim Abschluss. Der Abschluss-Bonus (`task.xpReward`,
 * beim Assign fixiert als perKill × required) kommt beim letzten Kill ZUSÄTZLICH obendrauf — beide
 * über `grantSlayerXp`, also konsistent mit dem Frühgame-Verstärker.
 *
 * Rückgabe: true, wenn der Task durch DIESEN Kill abgeschlossen wurde (für Combat-Log/UI).
 */
export function recordKillForSlayer(
  state: GameState,
  content: ContentDB,
  monsterId: MonsterId,
): boolean {
  const task = state.slayerTask;
  if (!task || task.monsterId !== monsterId) return false;
  if (!slayerRequirementMet(state, content, monsterId)) return false;

  grantSlayerXp(state, perKillSlayerXp(content, monsterId)); // Pro-Kill-XP für jeden Kill

  task.progress++;
  if (task.progress >= task.required) {
    grantSlayerXp(state, task.xpReward); // Abschluss-Bonus zusätzlich
    // Meisterweihe (masterPerk `slayerPoints`, capes.ts — Bountymaster-Cape, Konzept: +10 %
    // Slayer-Punkte): multiplikativ auf den beim Assign fixierten pointReward, kaufmännisch
    // gerundet. Ohne Träger EXAKT der alte Pfad (kein round auf dem ganzzahligen Reward) →
    // Punktestand bit-identisch zu vorher.
    //
    // Trophäenwand (Das Lager, `slayerPoints` ≤ 0.30 — encampment-balance.md §6): ADDITIV im
    // SELBEN Ausdruck (EINE Rundung, wie vom Balance-Doc gefordert), Gesamt-Multiplikator hart auf
    // `SLAYER_POINTS_TOTAL_BONUS_CAP` (×1.5) geklemmt — heute erreichbar sind ×1.40, die Klemme
    // schützt vor künftigen Quellen. Ohne Lager exakt der Alt-Pfad (campBoost 0).
    const pointsBonus = Math.min(
      SLAYER_POINTS_TOTAL_BONUS_CAP,
      masterSlayerPointsBonus(state, content) + Math.max(0, campBoost(state, content, "slayerPoints")),
    );
    state.slayerPoints +=
      pointsBonus > 0 ? Math.round(task.pointReward * (1 + pointsBonus)) : task.pointReward;
    state.slayerTasksCompleted++;
    state.slayerTask = null;
    // Task-Streak (Welle GG/slayer-vesna V2, SAVE 66): jeder Abschluss +1. Jeder
    // SLAYER_STREAK_TOKEN_INTERVAL-te Task zahlt SLAYER_STREAK_TOKEN_BONUS Quest-Tokens; jeder
    // SLAYER_STREAK_POINT_INTERVAL-te ZUSÄTZLICH Bonus-Slayer-Punkte in Höhe des pointReward des
    // eben abgeschlossenen Tasks (~1 Task-Äquivalent, beim Assign fixiert — bewusst OHNE den
    // Meisterweihe-Multiplikator, der gilt nur der regulären Gutschrift). Der Breadcrumb trägt
    // die seq aus dem monotonen `slayerStreakSeq` (NIE aus dem nullbaren Breadcrumb — Welle DD).
    state.slayerStreak++;
    const streakTokens =
      state.slayerStreak % SLAYER_STREAK_TOKEN_INTERVAL === 0 ? SLAYER_STREAK_TOKEN_BONUS : 0;
    const streakPoints =
      state.slayerStreak % SLAYER_STREAK_POINT_INTERVAL === 0 ? task.pointReward : 0;
    if (streakTokens > 0 || streakPoints > 0) {
      state.character.questTokens += streakTokens;
      state.slayerPoints += streakPoints;
      state.slayerStreakSeq += 1;
      state.lastSlayerStreakBonus = {
        streak: state.slayerStreak,
        tokens: streakTokens,
        points: streakPoints,
        seq: state.slayerStreakSeq,
      };
    }
    return true;
  }
  return false;
}

/**
 * Steht HEUTE der Gratis-Skip der Trophäenwand III zur Verfügung? (Das Lager, Task #359 —
 * encampment-balance.md §6: „1 Gratis-Skip/Tag"; Gegenwert ~20 Punkte.)
 *
 * TAGESGRENZE — bewusste Entscheidung (Task-Vorgabe „dokumentieren"): der Kalendertag kommt als
 * `dayStamp` (YYYYMMDD) VON AUSSEN herein, exakt wie bei den Daily-Quests (`quests.daily.day`,
 * shared `nextDayStamp`) — die Engine erzeugt NIE selbst Zeit (Determinismus-Gesetz: kein
 * Date.now in Engine-Logik). Bewusst NICHT über die Spielzeit (`elapsedMs`) modelliert: ein
 * „Tag" wäre dann Spielzeit statt Kalendertag, und ein Gelegenheitsspieler (2 h/Tag) bekäme
 * seinen Gratis-Skip erst alle 12 Kalendertage — das widerspricht der Feature-Zusage. Die
 * Dailies lösen dasselbe Problem seit jeher genau so; der Skip erbt ihre Semantik 1:1.
 *
 * Ohne `dayStamp` (Alt-Aufrufer/Tests ohne Kalender-Kontext) IMMER false ⇒ neutral,
 * Alt-Verhalten bit-identisch. Erfordert eine gebaute Trophäenwand III: der Gratis-Skip hängt an
 * der Stufen-III-Wirkung, die im Katalog als `slayerPoints`-Delta der dritten Stufe steht — die
 * strukturelle Prüfung ist daher „Gebäude-Stufe ≥ CAMP_MAX_BUILDING_LEVEL".
 *
 * UHR-RÜCKSPRUNG (Task #364 Fix 3, Audit #363): Der Vergleich ist `<`, nicht `!==` — nur ein
 * NEUERER Kalendertag stellt die Tagesration wieder her. Mit `!==` genügte es, die Systemuhr auf
 * gestern zu stellen, um einen zweiten Gratis-Skip zu bekommen (der Stempel wäre „≠ heute").
 * BEWUSSTE ABWEICHUNG von den Daily-Quests: die behalten ihre `!==`-Semantik (shared
 * `nextDayStamp`/quests.daily.day), weil ein Uhr-Rücksprung dort ein KOMPLETTES Neu-Würfeln der
 * Tagesaufgaben auslöst — also die laufenden Aufgaben samt Fortschritt WEGNIMMT statt etwas zu
 * verschenken. Hier wäre der Rücksprung ein reiner Gewinn, dort ein Verlust; nur diese eine
 * Stelle braucht die strengere Regel. (Ein Stempel aus der ZUKUNFT — Uhr vorgestellt und wieder
 * zurück — sperrt den Gratis-Skip entsprechend bis zu diesem Tag; das kostet nur den Spieler
 * selbst, s. persistence-Kommentar bei `slayerFreeSkipDay`.)
 */
export function campFreeSkipAvailable(
  state: GameState,
  content: ContentDB,
  dayStamp?: number,
): boolean {
  if (dayStamp === undefined || !Number.isFinite(dayStamp) || dayStamp <= 0) return false;
  if (!campKindAtMaxLevel(state, content, "slayerPoints")) return false;
  return state.slayerFreeSkipDay < Math.floor(dayStamp);
}

/**
 * [Sweep6 W2-T4-P2-2] Effektive Skip-Kosten: unter Slayer-Level `SLAYER_SKIP_FREE_BELOW_LEVEL`
 * ist das Überspringen KOSTENLOS (Früh-Slayer-Gnade gegen die unbezahlbare Task-Wand), danach
 * der normale `master.skipCost`. Einzige Kosten-Quelle für skipTask — die UI (SlayerPage) zeigt
 * denselben Helfer statt `master.skipCost` roh.
 *
 * ZWEITE Gratis-Quelle seit Task #359: der Tages-Gratis-Skip der Trophäenwand III
 * (`campFreeSkipAvailable`) — ohne `dayStamp` neutral (s. dort).
 */
export function effectiveSkipCost(
  state: GameState,
  content: ContentDB,
  master: SlayerMasterDef,
  dayStamp?: number,
): number {
  if (getSlayerLevel(state) < SLAYER_SKIP_FREE_BELOW_LEVEL) return 0;
  if (campFreeSkipAvailable(state, content, dayStamp)) return 0;
  return master.skipCost;
}

/**
 * Überspringt den aktiven Task gegen Slayer-Punkte (`effectiveSkipCost`: unter Slayer-Level
 * `SLAYER_SKIP_FREE_BELOW_LEVEL` gratis, sonst `master.skipCost`). Reicht das Guthaben nicht
 * (oder kein Task/Master), → false ohne Effekt. Bei Erfolg: Punkte abziehen, Task = null. KEIN RNG.
 *
 * Streak (Welle GG V2): ein BEZAHLTER Skip (cost > 0) bricht die Task-Serie auf 0. Die
 * Gratis-Gnade (effectiveSkipCost == 0, unter SLAYER_SKIP_FREE_BELOW_LEVEL) bricht BEWUSST NICHT —
 * die Gnade ist als „kostenlos" markiert, indem genau diese eine Kostenquelle 0 liefert; daran
 * hängt auch der Streak-Erhalt (sonst bräche auch gratis).
 */
export function skipTask(state: GameState, content: ContentDB, dayStamp?: number): boolean {
  const task = state.slayerTask;
  if (!task) return false;
  const master = (content.slayerMasters ?? []).find((m) => m.id === task.masterId);
  if (!master) return false;
  // Verbraucht der Skip den TAGES-Gratis-Skip der Trophäenwand III? Vor dem Kosten-Aufruf
  // festhalten, denn das Setzen des Stempels unten würde `campFreeSkipAvailable` sofort umdrehen.
  // Die Früh-Gnade (unter SLAYER_SKIP_FREE_BELOW_LEVEL) hat VORRANG und verbraucht den
  // Tages-Skip bewusst NICHT — sonst kostete die Gnade den Spieler still seine Tagesration.
  const usesCampFreeSkip =
    getSlayerLevel(state) >= SLAYER_SKIP_FREE_BELOW_LEVEL
    && campFreeSkipAvailable(state, content, dayStamp);
  const cost = effectiveSkipCost(state, content, master, dayStamp);
  if (state.slayerPoints < cost) return false;
  state.slayerPoints -= cost;
  state.slayerTask = null;
  if (usesCampFreeSkip) state.slayerFreeSkipDay = Math.floor(dayStamp!);
  if (cost > 0) state.slayerStreak = 0; // Gnaden-Skip (cost 0) erhält die Serie
  return true;
}

/**
 * Generische Slayer-Punkte-Senke (Punkte-Shop Phase 2). Zieht `amount` ab, wenn genug Guthaben da
 * ist; sonst false ohne Effekt. `amount` muss > 0 sein.
 */
export function spendSlayerPoints(state: GameState, amount: number): boolean {
  if (!(amount > 0)) return false;
  if (state.slayerPoints < amount) return false;
  state.slayerPoints -= amount;
  return true;
}

/**
 * Stabile Fehlschlag-Codes für den Slayer-Punkte-Shop (Muster EnchantReason, enchant.ts):
 * sprachneutral & deterministisch testbar; die UI rendert `t("slayer.shop.reason." + code)`.
 *  - `not_found`          Kein `slayerShop`-Eintrag für die Item-ID (oder Item/Kosten defekt).
 *  - `level_locked`       `slayerLevelRequired` des Eintrags nicht erfüllt.
 *  - `not_enough_points`  Slayer-Punkte reichen nicht.
 *  - `no_space`           Item passt weder ins Inventar noch (Auto-Bank) ins Lager — Punkte
 *                         wurden zurückerstattet (no-loss-Rollback, Muster buyTokenShopOffer).
 */
export type SlayerShopReason = "not_found" | "level_locked" | "not_enough_points" | "no_space";

export interface SlayerShopResult {
  ok: boolean;
  reason?: SlayerShopReason;
}

/**
 * Kauft EIN Exemplar aus dem Slayer-Punkte-Shop (`content.slayerShop`; Einträge sind über die
 * Item-ID adressiert — Signatur analog `buyTokenShopOffer`, quests.ts). Prüft Eintrag, Level-Gate
 * (`slayerLevelRequired` vs `getSlayerLevel`) und Guthaben; zieht die Punkte über
 * `spendSlayerPoints` ab und liefert das Item per `addItemOrBank` (Auto-Bank-Overflow wie
 * Combat-Loot; markiert den Erst-Besitz automatisch über den zentralen Entdeckungs-Pfad, SAVE 58).
 * KEIN Teil-Verlust: passt das Item nirgends hin, werden die Punkte erstattet (`no_space`).
 * Rein & deterministisch (kein RNG). `maxPurchases` (SlayerShopEntry) wird BEWUSST noch nicht
 * durchgesetzt — es gibt keinen persistierten Kauf-Zähler im GameState (bräuchte SAVE-Bump);
 * der aktuelle Content nutzt das Feld nicht. Falls Content es je setzt: Zähler-Feld + Migration
 * nachziehen (logic-dev).
 *
 * Ersetzt den UI-Direktpfad `spendSlayerPoints` + `addItem` (SlayerPage) — der markierte keine
 * Entdeckung und konnte bei vollem Inventar Punkte gegen NICHTS tauschen (Item-Verlust).
 */
export function buySlayerShopItem(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
): SlayerShopResult {
  const entry = (content.slayerShop ?? []).find((e) => e.itemId === itemId);
  // Defensiv gegen fehlerhafte Content-Daten (Muster buyTokenShopOffer): Item muss existieren,
  // Kosten eine positive endliche Zahl — sonst ist der Eintrag nicht kaufbar.
  if (!entry || !content.items[itemId]) return { ok: false, reason: "not_found" };
  if (!Number.isFinite(entry.cost) || entry.cost <= 0) return { ok: false, reason: "not_found" };
  if ((entry.slayerLevelRequired ?? 0) > getSlayerLevel(state)) {
    return { ok: false, reason: "level_locked" };
  }
  if (!spendSlayerPoints(state, entry.cost)) return { ok: false, reason: "not_enough_points" };
  const { toInventory, toBank } = addItemOrBank(state, content, itemId, 1);
  if (toInventory + toBank < 1) {
    // Rollback (kein Teil-Verlust): nichts kam an → Punkte zurück. addItemOrBank hat in diesem
    // Fall auch KEINE Entdeckung markiert (markiert nur bei echtem Zufluss).
    state.slayerPoints += entry.cost;
    return { ok: false, reason: "no_space" };
  }
  return { ok: true };
}
