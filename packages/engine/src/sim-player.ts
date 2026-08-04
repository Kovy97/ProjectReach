/**
 * SIM-Agent-Toolkit — Headless Spieler-Treiber.
 *
 * `SimPlayer` kapselt einen echten `GameState` (via `createGame`) und bietet HIGH-LEVEL-Aktionen +
 * Reader, so dass „Fake-Spieler" (sim-personas.ts) das Spiel spielen wie ein Mensch — ohne die
 * Engine-Logik nachzubauen. JEDE Aktion ruft ausschliesslich die echten Engine-Funktionen auf
 * (setActiveAction, advance, equipItem, buyItem, startCombat …). Vollständig deterministisch &
 * headless: seeded RNG, kein Date.now, kein I/O, kein Electron.
 */
import type {
  ActionId,
  ContentDB,
  EquipSlot,
  GameState,
  ItemDef,
  ItemId,
  MonsterId,
  SkillId,
} from "@hearthforge/shared";
import { effectiveBankCapacity } from "@hearthforge/shared";
import type { CharacterCreation } from "./character";
import { computeStats, totalLevel } from "./character";
import { createGame } from "./state";
import {
  canEnterDungeon as engineCanEnterDungeon,
  combatLevel,
  startDungeon as engineStartDungeon,
} from "./dungeon";
import { levelFromXp, xpForLevel } from "./leveling";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { startCombat as engineStartCombat } from "./combat";
import { equipInstance, equipItem, meetsRequirements, unequipItem } from "./equipment";
import type { EquipResult } from "./equipment";
import { addItem, effectiveCapacity, itemCount, usedSlots } from "./inventory";
import { bankCount, bankSlotsUsed, depositItem, withdrawItem } from "./bank";
import { buyItem, sellInstance, sellItem } from "./shop";

/** Kompakter, serialisierbarer State-Dump für Findings-Evidence & Debugging. */
export interface SimSnapshot {
  name: string;
  elapsedMs: number;
  gold: number;
  combatLevel: number;
  totalLevel: number;
  hp: number;
  maxHp: number;
  activeActionId: ActionId | null;
  inCombatWith: MonsterId | null;
  /** Nur Skills mit Level > 1 (Kompaktheit). */
  skills: Record<string, number>;
  equipment: Partial<Record<EquipSlot, ItemId>>;
  inventory: { used: number; capacity: number; top: Array<{ itemId: ItemId; qty: number }> };
  bank: { used: number; capacity: number };
  /**
   * Lebenszeit-Kills/-Tode aus der Engine-Statistik (`state.stats`) — die einzige verlässliche
   * Quelle, egal ob über `fightFor` ODER `pursue`/`advanceTime` gekämpft wurde. [Sweep5 T4] Vorher
   * zählten hier nur fightFor-Fenster → jeder Multi-Goal-Snapshot meldete 0/0 bei zigtausend Kills.
   */
  kills: number;
  deaths: number;
}

/** Ergebnis eines Kampf-Fensters (`fightFor`). */
export interface FightResult {
  kills: number;
  deaths: number;
  elapsedMs: number;
}

/** Ergebnis eines Dungeon-Runs (`runDungeon`). */
export interface DungeonRunResult {
  /** Run wurde betreten (Kampf-Niveau-Gate + Schlüssel erfüllt; Schlüssel sind verbraucht). */
  entered: boolean;
  /** Alle Wellen besiegt (Abschluss-Belohnung wurde von der Engine vergeben). */
  cleared: boolean;
  kills: number;
  deaths: number;
  elapsedMs: number;
}

/** Eignungs-Prüfung mit Begründung (warum lässt sich ein Item (nicht) ausrüsten). */
export interface CanEquipResult {
  ok: boolean;
  reason?: string;
}

export interface SimPlayerOptions {
  /** Seed für die deterministische RNG. Default 1. */
  seed?: number;
  /** Charakter-Erstellungs-Parameter (Name/Stil/Attribute …). Default: Melee-Held ohne Starter-Kit. */
  creation?: CharacterCreation;
}

const FIGHT_CHUNK_MS = 5_000;

export class SimPlayer {
  readonly content: ContentDB;
  readonly state: GameState;

  constructor(content: ContentDB, opts: SimPlayerOptions = {}) {
    this.content = content;
    const creation: CharacterCreation = opts.creation ?? { name: "SimPlayer" };
    this.state = createGame(creation, content, opts.seed ?? 1);
  }

  // ── Setup-Helfer (nutzen echte Engine-Primitive; für Persona-Vorbereitung) ────────────────

  /** Legt Items direkt ins Inventar (echte `addItem`). Gibt die tatsächlich eingelagerte Menge zurück. */
  give(itemId: ItemId, qty: number): number {
    return addItem(this.state.inventory, this.content, itemId, qty);
  }

  /** Setzt das Auto-Eat-Food (muss im Inventar liegen, damit der Kampf es nutzt). */
  setFood(itemId: ItemId | null): void {
    this.state.character.food = itemId;
  }

  /** Setzt einen Kampf-Skill direkt auf ein Level (Test-/Persona-Seed, nutzt die echte XP-Tabelle). */
  setSkillLevel(skillId: SkillId, level: number): void {
    this.state.skills[skillId] = { xp: xpForLevel(level) };
  }

  // ── High-Level-Aktionen ───────────────────────────────────────────────────────────────────

  /** Startet eine Sammel-/Verarbeitungs-Aktion. Gibt zurück, ob sie wirklich aktiv wurde. */
  startAction(actionId: ActionId): boolean {
    setActiveAction(this.state, this.content, actionId);
    return this.state.activeActionId === actionId;
  }

  /** Stoppt die aktive Aktion. */
  stopAction(): void {
    setActiveAction(this.state, this.content, null);
  }

  /** Rüstet ein Item aus dem Inventar aus (echte `equipItem`, inkl. Instanz-/Tool-Pfade). */
  equip(itemId: ItemId): EquipResult {
    return equipItem(this.state, this.content, itemId);
  }

  /** Rüstet eine modifizierte Instanz (verzaubert/gesuffixt) aus der Instanz-Tasche aus (#246). */
  equipInstance(instanceId: string): EquipResult {
    return equipInstance(this.state, this.content, instanceId);
  }

  /** Verkauft eine EINZELNE Instanz aus der Instanz-Tasche (#246). Gibt das erlöste Gold zurück. */
  sellInstance(instanceId: string): number {
    return sellInstance(this.state, this.content, instanceId);
  }

  /** Legt den Inhalt eines Ausrüstungs-Slots zurück ins Inventar. */
  unequip(slot: EquipSlot): boolean {
    return unequipItem(this.state, this.content, slot);
  }

  /** Kauft bis zu `qty` eines Shop-Items (Preis aus `content.shop`). Gibt die gekaufte Anzahl zurück. */
  buy(itemId: ItemId, qty = 1): number {
    const entry = this.content.shop.find((e) => e.itemId === itemId);
    if (!entry) return 0;
    return buyItem(this.state, this.content, itemId, entry.cost, qty);
  }

  /** Verkauft `qty` eines Items. Gibt das erhaltene Gold zurück. */
  sell(itemId: ItemId, qty = 1): number {
    return sellItem(this.state, this.content, itemId, qty);
  }

  /** Lagert `qty` eines Items ins Lager (Bank) ein. Gibt die eingelagerte Menge zurück. */
  deposit(itemId: ItemId, qty: number): number {
    return depositItem(this.state, this.content, itemId, qty);
  }

  /** Holt `qty` eines Items aus dem Lager zurück ins Inventar. Gibt die entnommene Menge zurück. */
  withdraw(itemId: ItemId, qty: number): number {
    return withdrawItem(this.state, this.content, itemId, qty);
  }

  /** Betritt einen Kampf gegen `monsterId` (echte `startCombat`, inkl. Slayer-Gate). */
  startCombat(monsterId: MonsterId): boolean {
    return engineStartCombat(this.state, this.content, monsterId);
  }

  /**
   * Kämpft `ms` Spielzeit lang. Zählt Kills (Fenster-Delta) und ECHTE Spielertode.
   *
   * Engine-Semantik (Stand Sweep5, Chef-Änderung in combat.ts/onPlayerDefeated): ein Tod ist ein
   * HARTER STOPP — voll heilen, `stopReason:"defeated"`, `monsterId = null`, KEIN Engine-Auto-Restart.
   * `monsterId === null` heißt hier also nur „der Kampf endete" (Tod, Stalemate, Munition leer oder
   * Dungeon-Ende) — WELCHER Grund, steht in `combat.stopReason`. Tode werden über das
   * `state.stats.deaths`-Delta gezählt (die einzige verlässliche Quelle, unabhängig vom Stopp-Pfad).
   * Bei einem `monsterId===null`-Stopp startet fightFor — idle-fair — denselben Gegner neu, damit
   * das Zeitfenster weiterläuft (das deckt auch den Tod-Stopp ab); `restartOnDeath:false` bricht
   * beim ersten ECHTEN Tod ab (Prüfung VOR dem Neustart). Es muss vorher `startCombat` gelaufen sein.
   */
  fightFor(ms: number, opts: { restartOnDeath?: boolean } = {}): FightResult {
    const restart = opts.restartOnDeath ?? true;
    const monsterId = this.state.combat.monsterId;
    if (!monsterId || ms <= 0) return { kills: 0, deaths: 0, elapsedMs: 0 };
    const deathsBefore = this.state.stats.deaths;
    // `combat.kills` ist KUMULATIV über die gesamte Kampf-Session — nur `startCombat` resettet es, ein
    // weiterlaufender Kampf NICHT. Wird `fightFor` mehrfach auf DENSELBEN laufenden Kampf angewendet
    // (Schleife ohne neues startCombat), zählte das frühere `kills += combat.kills` bei jedem Aufruf den
    // vollen kumulierten Stand → dreieckig aufgeblähte Kills (Toolkit-Messfehler, kein Spiel-Bug). Analog
    // zum deaths-Delta merken wir den Startwert und geben pro Aufruf nur das DELTA dieses Fensters zurück.
    const killsBefore = this.state.combat.kills;
    let kills = 0;
    let elapsed = 0;
    while (elapsed < ms) {
      const step = Math.min(FIGHT_CHUNK_MS, ms - elapsed);
      this.advanceTime(step);
      elapsed += step;
      // Echter Tod (stats.deaths-Delta): bei restartOnDeath:false hier abbrechen — BEVOR der
      // Stopp-Zweig darunter den Gegner neu starten würde (die Engine heilt beim Tod voll, stoppt
      // den Kampf aber hart: monsterId ist genullt).
      if (!restart && this.state.stats.deaths > deathsBefore) break;
      // monsterId===null = der Kampf endete (Tod/Stalemate/outOfAmmo/Dungeon-Ende): Kills banken,
      // dann idle-fair denselben Gegner neu starten, damit das Fenster weiterläuft.
      if (this.state.combat.monsterId === null) {
        kills += this.state.combat.kills; // vor dem Respawn banken (startCombat resettet kills)
        engineStartCombat(this.state, this.content, monsterId);
      }
    }
    kills += this.state.combat.kills; // laufender (lebender) Rest seit dem letzten Bank/Respawn
    kills -= killsBefore; // nur das DELTA dieses Fensters (combat.kills ist kumulativ, s.o.)
    const deaths = this.state.stats.deaths - deathsBefore;
    return { kills, deaths, elapsedMs: elapsed };
  }

  /** Kann der Dungeon gerade betreten werden (nur Quest-/Zonen-Gate bzw. Einmal-Unlock — kein Kampfstufen-Gate mehr, Task #345)? */
  canEnterDungeon(dungeonId: string): boolean {
    return engineCanEnterDungeon(this.state, this.content, dungeonId);
  }

  /**
   * [Sweep5 T7] Fährt EINEN Dungeon-Run über die echte Engine: prüft Gate + Einmal-Unlock
   * (SAVE 60: der Eintritt verbraucht KEINE Schlüssel mehr; der Schlüsselfund hat den Dungeon
   * permanent entsperrt), startet den Run und tickt, bis die Encounter-Kette endet — Clear, Tod
   * oder Munitions-Stopp brechen den Run engine-seitig ab (`combat.dungeonId` wird genullt).
   * `maxMs` (Default 2 Sim-h) deckelt gegen Patt-Wellen. Clear-Erkennung über das
   * `state.dungeonsCleared`-Delta (combat.ts erhöht den Zähler genau 1× pro geschafftem Run).
   */
  runDungeon(dungeonId: string, opts: { maxMs?: number } = {}): DungeonRunResult {
    const maxMs = opts.maxMs ?? 2 * 60 * 60 * 1000;
    const killsBefore = this.state.stats.kills;
    const deathsBefore = this.state.stats.deaths;
    const clearsBefore = this.state.dungeonsCleared[dungeonId] ?? 0;
    if (!engineStartDungeon(this.state, this.content, dungeonId)) {
      return { entered: false, cleared: false, kills: 0, deaths: 0, elapsedMs: 0 };
    }
    let elapsed = 0;
    while (elapsed < maxMs && this.state.combat.dungeonId === dungeonId) {
      const step = Math.min(FIGHT_CHUNK_MS, maxMs - elapsed);
      this.advanceTime(step);
      elapsed += step;
    }
    return {
      entered: true,
      cleared: (this.state.dungeonsCleared[dungeonId] ?? 0) > clearsBefore,
      kills: this.state.stats.kills - killsBefore,
      deaths: this.state.stats.deaths - deathsBefore,
      elapsedMs: elapsed,
    };
  }

  /** Treibt die Sim um `ms` (fixe TICK_MS-Schritte via engine `advance`). Gibt die Anzahl Ticks zurück. */
  advanceTime(ms: number): number {
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return advance(this.state, this.content, ms);
  }

  // ── Reader ────────────────────────────────────────────────────────────────────────────────

  /** Aktuelles Level einer Fertigkeit. */
  level(skillId: SkillId): number {
    return levelFromXp(this.state.skills[skillId]?.xp ?? 0);
  }

  /** Kampf-Niveau (fokus-belohnende Formel, identisch zum Dungeon-Gate). */
  combatLevel(): number {
    return combatLevel(this.state);
  }

  gold(): number {
    return this.state.character.gold;
  }

  /**
   * Wie viele Exemplare von `itemId` besitzt der simulierte Spieler INSGESAMT — plaine Stacks
   * (`itemCount`, fungibel) PLUS modifizierte Instanzen derselben Basis-Id in der Instanz-Tasche
   * (verzaubert/gesuffixt — je 1 Exemplar, nicht fungibel, s. `itemCount`-Doku). Für einen High-
   * Level-Sim-Treiber ist „besitzt der Spieler das Item" die richtige Frage, nicht „liegt es als
   * Stack vor" — SAVE_VERSION 72 (Früh-Garantie-Suffix, Chef-GO 2026-07-22) macht eine Instanz für
   * das ERSTE gecraftete/gedroppte Equipment-Stück eines frischen Spielstands nahezu sicher, das
   * `itemCount` (engine/inventory.ts) bewusst NIE mitzählt (Instanzen sind kein fungibler Stack).
   */
  inventoryCount(itemId: ItemId): number {
    const instances = this.state.inventory.instances.filter((i) => i.baseItemId === itemId).length;
    return itemCount(this.state.inventory, itemId) + instances;
  }

  bankCount(itemId: ItemId): number {
    return bankCount(this.state, itemId);
  }

  /** Belegte / freie Inventar-Slots. */
  inventoryUsed(): number {
    return usedSlots(this.state.inventory);
  }

  inventoryCapacity(): number {
    return effectiveCapacity(this.state.inventory, this.content);
  }

  /**
   * Prüft (read-only, mutiert nichts), ob sich `itemId` ausrüsten liesse — mit Begründung. Spiegelt
   * die Entscheidungslogik von `equipItem` (Tool/Equipment, Skill-Anforderung, Besitz; der frühere
   * Ammo-Pfad ist mit #286 gestorben — Munition ist nicht mehr ausrüstbar).
   */
  canEquip(itemId: ItemId): CanEquipResult {
    const item = this.content.items[itemId];
    if (!item) return { ok: false, reason: `Unbekanntes Item '${itemId}'` };
    if (item.type === "tool") {
      if (!meetsRequirements(this.state, item)) return { ok: false, reason: this.reqReason(item) };
      return this.inventoryCount(itemId) >= 1
        ? { ok: true }
        : { ok: false, reason: "Werkzeug nicht im Inventar" };
    }
    if (item.type !== "equipment" || !item.slot) {
      return { ok: false, reason: "Nicht ausrüstbar (kein Ausrüstungs-Slot)" };
    }
    if (!meetsRequirements(this.state, item)) return { ok: false, reason: this.reqReason(item) };
    if (this.inventoryCount(itemId) < 1) return { ok: false, reason: "Nicht im Inventar" };
    return { ok: true };
  }

  /** Baut die konkrete Skill-Anforderungs-Begründung für ein Item („attack Lvl 10, aktuell 3"). */
  private reqReason(item: ItemDef): string {
    const parts: string[] = [];
    for (const [skillId, need] of Object.entries(item.requirements ?? {})) {
      if (need === undefined) continue;
      const have = this.level(skillId as SkillId);
      if (have < need) parts.push(`${skillId} Lvl ${need} (aktuell ${have})`);
    }
    return parts.length > 0 ? `Skill-Anforderung nicht erfüllt: ${parts.join(", ")}` : "Skill-Anforderung nicht erfüllt";
  }

  /** Kompakter State-Dump (für Findings-Evidence & Debugging). */
  snapshot(): SimSnapshot {
    const s = this.state;
    const stats = computeStats(s, this.content);
    const skills: Record<string, number> = {};
    for (const id of Object.keys(this.content.skills)) {
      const lvl = this.level(id as SkillId);
      if (lvl > 1) skills[id] = lvl;
    }
    const equipment: Partial<Record<EquipSlot, ItemId>> = {};
    for (const [slot, id] of Object.entries(s.character.equipment)) {
      if (id) equipment[slot as EquipSlot] = id;
    }
    // Top-Inventar: Mengen je Item aggregieren, absteigend, die 8 grössten.
    const counts = new Map<ItemId, number>();
    for (const slot of s.inventory.slots) {
      if (slot) counts.set(slot.itemId, (counts.get(slot.itemId) ?? 0) + slot.qty);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([itemId, qty]) => ({ itemId, qty }));
    return {
      name: s.character.name,
      elapsedMs: s.elapsedMs,
      gold: s.character.gold,
      combatLevel: this.combatLevel(),
      totalLevel: totalLevel(s, this.content),
      hp: Math.round(s.character.hp),
      maxHp: Math.round(stats.maxHp),
      activeActionId: s.activeActionId,
      inCombatWith: s.combat.monsterId,
      skills,
      equipment,
      inventory: {
        used: this.inventoryUsed(),
        capacity: this.inventoryCapacity(),
        top,
      },
      bank: { used: bankSlotsUsed(s), capacity: effectiveBankCapacity(s, this.content) },
      // [Sweep5 T4] Lebenszeit-Statistik der Engine — NICHT die fightFor-Fenster-Summe (die
      // meldete bei pursue/advanceTime-Kämpfen 0/0, bei real zigtausend Kills).
      kills: s.stats.kills,
      deaths: s.stats.deaths,
    };
  }
}
