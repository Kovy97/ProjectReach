import type {
  ContentDB,
  GameState,
  ItemId,
  MonsterDef,
  RaidDef,
  RaidDifficulty,
  RaidRoomDef,
  RaidRun,
  RaidState,
  RaidWeeklyModifierId,
} from "@hearthforge/shared";
import { RAID_REST_AUTO_MS, RAID_VARIANT_SUFFIX, RAID_WEEKLY_MODIFIERS, RELIC_DUST_ITEM_ID, SLAYER_POINTS_PER_RAID_BOSS, defaultRaidState } from "@hearthforge/shared"; // claude:2026-10-25T10:32:00+01:00 — 1.4.1 S4
import { computeStats } from "./character";
import { stopCombat } from "./combat-stop"; // claude:2026-10-26T00:50:00+02:00 — Aufgeben räumt den Kampf vollständig (QA-Raid #6)
import { beginDungeonRun } from "./dungeon";
import { grantLoot } from "./mail";
import { nextFloat, nextInt } from "./rng";
import { tryCraftSuffix } from "./suffix";

/**
 * claude:2026-10-25T03:05:00+02:00 — Raid „Die Hallen von Gobkha'raz“ (1.4.0 „Feder und Stahl“ Welle 4, Chef 23.10.2026;
 * Zahlen design/1.4.0-balance-raid.md, Lore design/lore/raid-gobkharaz.md).
 *
 * Aufbau: Jeder Raum ist eine `DungeonDef` mit `raidOnly` (Wellen 1–4 + Boss). Der Raid-Lauf (`state.raid.run`)
 * steuert, was die Dungeon-Engine nicht kennt:
 * - Gebühr beim Start jeder Runde, Freischaltung Normal → Heroisch → Mythisch.
 * - Stufen-Skalierung der Gegner (Spec §2.3) und die verstärkte Welle 4 (§2.4) über `raidCombatMonster`.
 * - Nach jedem Boss: Beute (Tabelle §4.1, Nebenbeute §4.3, Wochentruhe §4.4), dann Rast; der nächste Raum
 *   beginnt per Knopf oder automatisch nach RAID_REST_AUTO_MS (Auto-Weiter, Warteschlange, offline).
 * - Tod je Stufe (R3): Normal Neustart des Raums gratis, Heroisch Neustart für 100.000 Gold, Mythisch Ende mit
 *   25 % Rückgabe. Patt zählt wie Tod.
 * - Wochen-Modifikator aus `nowMs` (Kalenderwoche, ohne Zufall), fest für den Lauf.
 *
 * Schnittstelle für combat.ts (combat-dev ruft, dieses Modul entscheidet):
 *   activeRaidFight, raidCombatMonster, raidModifierInFight, onRaidMonsterKilled, onRaidRoomCleared, onRaidDefeat.
 */

export function raidDefs(content: ContentDB): readonly RaidDef[] {
  return content.raids ?? [];
}

export function raidDef(content: ContentDB, raidId: string): RaidDef | undefined {
  return raidDefs(content).find((r) => r.id === raidId);
}

export function raidStateOf(state: GameState): RaidState {
  return (state.raid ??= defaultRaidState());
}

/** Item-ID der Variante einer Schwierigkeit (gk_x → gk_x_heroic). */
export function raidVariantItemId(baseId: ItemId, difficulty: RaidDifficulty): ItemId {
  return `${baseId}${RAID_VARIANT_SUFFIX[difficulty]}`;
}

/** Volle Kalenderwochen seit Mo 05.01.2026 00:00 lokaler Zeit (Spec §7). Ohne Zufall, nur aus `nowMs`. */
export function raidWeekIndex(nowMs: number): number {
  const d = new Date(nowMs);
  const days = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 5)) / 86_400_000);
  return Math.floor(days / 7);
}

/** Wochen-Modifikator der Kalenderwoche von `nowMs`. */
export function raidWeeklyModifier(nowMs: number): RaidWeeklyModifierId {
  const n = RAID_WEEKLY_MODIFIERS.length;
  return RAID_WEEKLY_MODIFIERS[((raidWeekIndex(nowMs) % n) + n) % n]!;
}

/** Gebühr einer Runde (Zahltag ×0,80). */
export function raidFee(content: ContentDB, raidId: string, difficulty: RaidDifficulty, modifier?: RaidWeeklyModifierId): number {
  const def = raidDef(content, raidId);
  if (!def) return 0;
  const base = def.fees[difficulty];
  return modifier === "payday" ? Math.round(base * 0.8) : base;
}

/** Freischaltung (R2/A7): Normal nach dem ersten Clear des Unlock-Dungeons, dann nacheinander. */
export function raidDifficultyUnlocked(state: GameState, content: ContentDB, raidId: string, difficulty: RaidDifficulty): boolean {
  const def = raidDef(content, raidId);
  if (!def) return false;
  if ((state.dungeonsCleared?.[def.unlockDungeonId] ?? 0) < 1) return false;
  const clears = state.raid?.clears ?? { normal: 0, heroic: 0, mythic: 0 };
  if (difficulty === "normal") return true;
  if (difficulty === "heroic") return (clears.normal ?? 0) > 0;
  return (clears.heroic ?? 0) > 0;
}

/** Laufender Raid-Kampf: Lauf in Phase „fight“ und der Kampf steht im Raum des Laufs. */
export function activeRaidFight(state: GameState, content: ContentDB): { run: RaidRun; def: RaidDef; room: RaidRoomDef } | null {
  const run = state.raid?.run;
  if (!run || run.phase !== "fight") return null;
  const def = raidDef(content, run.raidId);
  const room = def?.rooms[run.room];
  if (!def || !room || state.combat.dungeonId !== room.dungeonId) return null;
  return { run, def, room };
}

/** Wochen-Modifikator des laufenden Raid-Kampfs (null außerhalb des Raids). combat.ts liest ihn für §7-Effekte. */
export function raidModifierInFight(state: GameState, content: ContentDB): RaidWeeklyModifierId | null {
  return activeRaidFight(state, content)?.run.modifier ?? null;
}

/**
 * Skalierte Gegner-Instanz eines laufenden Raid-Kampfs (Spec §2.3/§2.4/§7), Muster paragonScaledMonster: Identität
 * (id/Name/Familie/Takt-Basis/Phasen-Schwellen) bleibt, Werte werden skaliert. undefined außerhalb des Raids.
 * claude:2026-10-25T04:00:00+02:00 — Stufe (HP/Ward/Regen/XP, Schaden/inflict, Level, Rüstung), verstärkte Welle 4 (HP/Ward ×1,5, Schaden/
 * inflict ×1,15) und die Gegnerseite der Wochen-Modifikatoren: Zahltag HP/Ward ×1,10, Kriegstrommeln Takt ×0,91,
 * Offenes Zeughaus Rüstung ×1,25, Blutfest Blutungs-Dauer ×1,5, Geliehenes Feuer/Giftküche geben Gegnern ohne
 * eigenen inflict Brand bzw. Gift. Phasenwerte skaliert combat.ts mit raidDefenseFactor/raidDamageFactor.
 */
export function raidCombatMonster(state: GameState, content: ContentDB): MonsterDef | undefined {
  const f = activeRaidFight(state, content);
  if (!f) return undefined;
  const base = state.combat.monsterId ? content.monsters[state.combat.monsterId] : undefined;
  if (!base) return undefined;
  const sc = f.def.scaling[f.run.difficulty];
  const mod = f.run.modifier;
  const wave = f.def.reinforcedWave;
  const reinforced = state.combat.encounterIndex === wave.index;
  const hpMult = sc.hpMult * (reinforced ? wave.hpMult : 1) * (mod === "payday" ? 1.1 : 1);
  const dmgMult = sc.damageMult * (reinforced ? wave.damageMult : 1);
  const scaled: MonsterDef = {
    ...base,
    level: base.level + sc.levelAdd,
    maxHp: Math.max(1, Math.round(base.maxHp * hpMult)),
    wardCapacity: base.wardCapacity ? Math.round(base.wardCapacity * hpMult) : undefined,
    damage: base.damage * dmgMult,
    defense: Math.round(base.defense * sc.defenseMult * (mod === "open_armory" ? 1.25 : 1)),
    attackIntervalMs: mod === "war_drums" ? Math.round(base.attackIntervalMs * 0.91) : base.attackIntervalMs,
    xp: Math.round(base.xp * sc.hpMult),
    gold: 0,
    loot: [], // Raid-Beute läuft über onRaidMonsterKilled/onRaidRoomCleared
  };
  if (base.regen !== undefined) scaled.regen = base.regen * sc.hpMult;
  if (base.inflict) {
    scaled.inflict = {
      ...base.inflict,
      magnitude: base.inflict.magnitude * dmgMult,
      durationMs: base.inflict.type === "bleed" && mod === "blood_feast" ? Math.round(base.inflict.durationMs * 1.5) : base.inflict.durationMs,
    };
  } else if (mod === "borrowed_fire") {
    scaled.inflict = { type: "burn", chance: 0.25, magnitude: 1.5 * sc.damageMult, durationMs: 5000 };
  } else if (mod === "poison_kitchen") {
    scaled.inflict = { type: "poison", chance: 0.25, magnitude: 1.0 * sc.damageMult, durationMs: 6000 };
  }
  return scaled;
}

// ── Lauf ───────────────────────────────────────────────────────────────────────────────────────────

export type RaidStartReason = "ok" | "unknown" | "locked" | "gold" | "busy";

function ensureRaidWeek(state: GameState, nowMs: number): void {
  const rs = raidStateOf(state);
  const wk = raidWeekIndex(nowMs);
  if (rs.weekly.week !== wk) rs.weekly = { week: wk, chests: {} };
}

/** Schlüssel der Erstkill-Truhe je Boss und Stufe. */
export function raidChestKey(bossId: string, difficulty: RaidDifficulty): string {
  return `${bossId}:${difficulty}`;
}

/** Ist die Wochentruhe dieses Bosses auf dieser Stufe in der Woche von `nowMs` noch offen? */
export function raidChestAvailable(state: GameState, bossId: string, difficulty: RaidDifficulty, nowMs: number): boolean {
  const w = state.raid?.weekly;
  if (!w || w.week !== raidWeekIndex(nowMs)) return true;
  return !w.chests[raidChestKey(bossId, difficulty)];
}

/** Läuft ein Raid (Kampf, Rast oder Tod-Entscheidung)? Dann bleibt die Warteschlange stehen. */
export function raidOccupied(state: GameState): boolean {
  const ph = state.raid?.run?.phase;
  // claude:2026-10-26T00:50:00+02:00 — auch „complete“: sonst rückt die Warteschlange im Abschluss-Countdown weiter und überschreibt den Lauf (QA-Raid #3).
  return ph === "fight" || ph === "rest" || ph === "defeated" || ph === "complete";
}

/** Betritt den aktuellen Raum: Rast heilt voll (HP und Ward, §10.4), dann Welle 1 mit skalierten Werten. */
function enterRaidRoom(state: GameState, content: ContentDB, run: RaidRun): boolean {
  const def = raidDef(content, run.raidId);
  const room = def?.rooms[run.room];
  const d = room ? content.dungeons.find((x) => x.id === room.dungeonId) : undefined;
  if (!d) return false;
  const stats = computeStats(state, content);
  state.character.hp = stats.maxHp;
  state.character.ward = stats.maxWard;
  if (!beginDungeonRun(state, content, d)) return false;
  run.phase = "fight";
  run.restMs = 0;
  const m = raidCombatMonster(state, content);
  if (m) {
    state.combat.enemyHp = m.maxHp;
    state.combat.enemyWard = m.wardCapacity ?? 0;
  }
  return true;
}

/**
 * Startet einen Raid-Lauf (R2/R3): Stufe freigeschaltet, Gebühr bezahlbar (Zahltag ×0,80), kein anderer Lauf aktiv.
 * Zieht die Gebühr ab, legt den Wochen-Modifikator fest und betritt Raum 1. Ohne `nowMs` (Sim, Tests) gilt
 * „Stille Hallen“ und keine Wochentruhe.
 */
export function startRaid(state: GameState, content: ContentDB, raidId: string, difficulty: RaidDifficulty, nowMs?: number): RaidStartReason {
  const def = raidDef(content, raidId);
  if (!def || def.rooms.length === 0) return "unknown";
  if (!raidDifficultyUnlocked(state, content, raidId, difficulty)) return "locked";
  if (raidOccupied(state)) return "busy";
  const modifier: RaidWeeklyModifierId = nowMs !== undefined ? raidWeeklyModifier(nowMs) : "quiet_halls";
  const fee = raidFee(content, raidId, difficulty, modifier);
  if (state.character.gold < fee) return "gold";
  const rs = raidStateOf(state);
  if (nowMs !== undefined) ensureRaidWeek(state, nowMs);
  state.character.gold -= fee;
  rs.feesPaid += fee;
  rs.run = {
    raidId,
    difficulty,
    room: 0,
    phase: "fight",
    feePaid: fee,
    restarts: 0,
    loot: [],
    lastLoot: [],
    bossSeq: 0,
    startedAtMs: state.elapsedMs,
    modifier,
    restMs: 0,
  };
  if (!enterRaidRoom(state, content, rs.run)) {
    state.character.gold += fee;
    rs.feesPaid -= fee;
    rs.run = null;
    return "unknown";
  }
  return "ok";
}

/** Rast vorbei: nächster Raum (Knopf „Nächster Raum“ oder automatisch). */
export function continueRaid(state: GameState, content: ContentDB): boolean {
  const run = state.raid?.run;
  const def = run ? raidDef(content, run.raidId) : undefined;
  if (!run || !def || run.phase !== "rest" || run.room + 1 >= def.rooms.length) return false;
  run.room += 1;
  if (enterRaidRoom(state, content, run)) return true;
  run.room -= 1; // claude:2026-10-26T00:50:00+02:00 — Fehlschlag: in der Rast bleiben
  return false;
}

export type RaidRestartReason = "ok" | "no_run" | "gold" | "not_allowed";

/** Nach dem Tod: Raum neu starten (Normal gratis, Heroisch 100.000 Gold; Mythisch ist schon vorbei). */
export function restartRaidRoom(state: GameState, content: ContentDB): RaidRestartReason {
  const run = state.raid?.run;
  const def = run ? raidDef(content, run.raidId) : undefined;
  if (!run || !def || run.phase !== "defeated") return "no_run";
  if (run.difficulty === "mythic") return "not_allowed";
  const cost = run.difficulty === "heroic" ? def.heroicRestartCost : 0;
  if (state.character.gold < cost) return "gold";
  state.character.gold -= cost;
  run.restarts += 1;
  if (enterRaidRoom(state, content, run)) return "ok";
  state.character.gold += cost; // claude:2026-10-26T00:50:00+02:00 — Fehlschlag: Gold zurück
  run.restarts -= 1;
  return "no_run";
}

function mergeLoot(list: { itemId: ItemId; qty: number }[], itemId: ItemId, qty: number): void {
  const e = list.find((x) => x.itemId === itemId);
  if (e) e.qty += qty;
  else list.push({ itemId, qty });
}

/** Ergebnis festhalten; ein laufender Warteschlangen-Eintrag zählt oder verfällt. */
function finishRun(state: GameState, content: ContentDB, outcome: "complete" | "defeated" | "abandoned", refund: number, nowMs?: number): void {
  const rs = raidStateOf(state);
  const run = rs.run;
  if (!run) return;
  rs.resultSeq += 1;
  rs.lastResult = { seq: rs.resultSeq, difficulty: run.difficulty, outcome, durationMs: state.elapsedMs - run.startedAtMs, refund };
  rs.run = null;
  const q = rs.queue;
  if (!q) return;
  if (outcome !== "complete") {
    state.lastQueueSkip = { monsterId: "", reason: outcome === "abandoned" ? "defeated" : "dungeon_defeated", raidId: q.raidId };
    rs.queue = null;
    return;
  }
  q.completed += 1;
  if (q.remaining !== null) q.remaining -= 1;
  if (q.remaining !== null && q.remaining <= 0) {
    rs.queue = null;
    return;
  }
  const r = startRaid(state, content, q.raidId, q.difficulty, nowMs);
  if (r !== "ok") {
    state.lastQueueSkip = { monsterId: "", reason: r === "gold" ? "raid_gold" : r === "locked" ? "raid_locked" : "unknown_raid", raidId: q.raidId };
    rs.queue = null;
  }
}

/**
 * Lauf aufgeben (aus Rast, Tod-Dialog oder laufendem Kampf). Keine Rückgabe, außer auf Mythisch: im laufenden Kampf zählt es
 * nach A15 wie Fliehen (Tod der Stufe), in der Rast gilt dieselbe Rückgabe (je 25 % der Gebühr).
 */
export function abandonRaid(state: GameState, content: ContentDB): void {
  const run = state.raid?.run;
  if (!run) return;
  if (run.phase === "fight") {
    stopCombat(state); // claude:2026-10-26T00:50:00+02:00 — Bossphase, XP-Sammler, Effekte mit räumen (QA-Raid #6)
    // claude:2026-10-24T15:18:33+02:00 — QA2-Raid B1 (A15): Aufgeben im Mythisch-Kampf verlässt denselben Kampf wie der Stopp-Knopf
    // und nimmt denselben Pfad (Warteschlange endet, Lauf vorbei, 25 % zurück, Ergebnis „defeated“ mit Rückgabe). Normal/Heroisch
    // enden wie bisher ohne Rückgabe; Tod plus „Aufgeben“ im Dialog ergäbe dort dasselbe Gold.
    if (run.difficulty === "mythic" && resolveLeftRaidFight(state, content)) return;
  }
  if (run.phase === "rest" && run.difficulty === "mythic") {
    // claude:2026-10-24T15:53:41+02:00 — CEO-Entscheid (QA2-Raid N2): Aufgeben in der Mythisch-Rast erstattet wie Tod und Fliehen 25 % der Gebühr.
    // Sonst wäre absichtliches Sterben im nächsten Raum der billigere Weg zum selben Gold.
    const def = raidDef(content, run.raidId);
    const refund = def ? Math.round(run.feePaid * def.mythicRefundPct) : 0;
    state.character.gold += refund;
    finishRun(state, content, "abandoned", refund);
    return;
  }
  if (run.phase === "complete") {
    // claude:2026-10-26T00:50:00+02:00 — Abschluss sauber verbuchen und eine laufende Warteschlange beenden (QA-Raid #5).
    raidStateOf(state).queue = null;
    finishRun(state, content, "complete", 0);
    return;
  }
  finishRun(state, content, "abandoned", 0);
}

/** Abschluss-Bildschirm schließen. */
export function closeRaidResult(state: GameState, content: ContentDB, nowMs?: number): void {
  const run = state.raid?.run;
  if (run?.phase === "complete") finishRun(state, content, "complete", 0, nowMs);
}

function pickTableEntry(rng: GameState["rng"], entries: readonly { itemId: ItemId; weight: number }[]): ItemId | null {
  const total = entries.reduce((a, e) => a + Math.max(0, e.weight), 0);
  if (total <= 0) return null;
  let x = nextFloat(rng) * total;
  for (const e of entries) {
    x -= Math.max(0, e.weight);
    if (x < 0) return e.itemId;
  }
  return entries[entries.length - 1]!.itemId;
}

/** Ein Raid-Teil der Stufe vergeben (Suffix-Chance je Stufe); Rückgabe für die Beute-Anzeige. */
function grantRaidPiece(state: GameState, content: ContentDB, baseId: ItemId, run: RaidRun, def: RaidDef, ilvl: number, got: { itemId: ItemId; qty: number }[]): void {
  const variant = raidVariantItemId(baseId, run.difficulty);
  const itemId = content.items[variant] ? variant : baseId;
  if (!content.items[itemId]) return;
  const res = tryCraftSuffix(state, content, itemId, ilvl, def.suffixChance[run.difficulty]);
  if (!res) grantLoot(state, content, itemId, 1);
  mergeLoot(got, itemId, 1);
}

function rollRow(state: GameState, content: ContentDB, row: RaidDef["trashLoot"][number], difficulty: RaidDifficulty, got: { itemId: ItemId; qty: number }[]): void {
  if (!content.items[row.itemId]) return;
  if (!(nextFloat(state.rng) < row.chance)) return;
  const [lo, hi] = row.qty[difficulty];
  const qty = nextInt(state.rng, lo, hi);
  if (qty <= 0) return;
  grantLoot(state, content, row.itemId, qty);
  mergeLoot(got, row.itemId, qty);
}

/** Trash-Beute eines Wellen-Kills im Raid (Spec §4.2): Reliktstaub, Material, selten ein Teil des Raum-Bosses. Kein Gold. */
export function onRaidMonsterKilled(state: GameState, content: ContentDB, monster: MonsterDef, nowMs?: number): void {
  void nowMs;
  const f = activeRaidFight(state, content);
  if (!f || monster.id === f.room.bossId) return;
  const got: { itemId: ItemId; qty: number }[] = [];
  for (const row of f.def.trashLoot) rollRow(state, content, row, f.run.difficulty, got);
  if (nextFloat(state.rng) < f.def.trashPieceChance[f.run.difficulty]) {
    const base = pickTableEntry(state.rng, f.room.table.entries);
    if (base) grantRaidPiece(state, content, base, f.run, f.def, monster.level, got);
  }
  for (const g of got) mergeLoot(f.run.loot, g.itemId, g.qty);
}

/**
 * Boss des Raums besiegt (Spec §4.1/§4.3/§4.4): Ziehungen ohne Doppel aus der Boss-Tabelle (Variante der Stufe,
 * Suffix-Chance je Stufe), Nebenbeute, einmal pro Kalenderwoche die Erstkill-Truhe. Danach Rast oder Abschluss.
 * combat.ts beendet danach den Dungeon-Kampf.
 */
export function onRaidRoomCleared(state: GameState, content: ContentDB, nowMs?: number): void {
  const f = activeRaidFight(state, content);
  if (!f) return;
  const { run, def, room } = f;
  const rs = raidStateOf(state);
  const key = raidChestKey(room.bossId, run.difficulty);
  rs.bossKills[key] = (rs.bossKills[key] ?? 0) + 1;
  // claude:2026-10-25T10:32:00+01:00 — 1.4.1 S4: jeder Hallen-Boss zahlt flach Slayer-Punkte nach Stufe (10/25/50), ohne Multiplikatoren
  // und ohne RNG. Kein eigenes Breadcrumb: die UI leitet den Betrag aus `run.difficulty` × SLAYER_POINTS_PER_RAID_BOSS ab (`run.bossSeq` zählt die Bosse).
  state.slayerPoints += SLAYER_POINTS_PER_RAID_BOSS[run.difficulty] ?? 0;
  // claude:2026-10-26T00:50:00+02:00 — Boss-Teile mit der Stufe des skalierten Bosses wie die Trash-Teile (QA-Raid #7).
  const ilvl = (content.monsters[room.bossId]?.level ?? 100) + (def.scaling[run.difficulty]?.levelAdd ?? 0);
  const got: { itemId: ItemId; qty: number }[] = [];
  // claude:2026-10-25T23:30:00+02:00 — Teil-Chance je Boss (pieceChance); ohne Feld kein Zug, bisherige Sequenz bleibt gleich.
  const pc = room.table.pieceChance;
  const drops = pc === undefined || pc >= 1 || nextFloat(state.rng) < pc;
  const draws = drops ? room.table.draws + (nextFloat(state.rng) < room.table.extraChance ? 1 : 0) : 0;
  const picked = new Set<ItemId>();
  for (let i = 0; i < draws; i++) {
    const base = pickTableEntry(state.rng, room.table.entries.filter((e) => !picked.has(e.itemId)));
    if (!base) break;
    picked.add(base);
    grantRaidPiece(state, content, base, run, def, ilvl, got);
  }
  for (const row of def.bossSideLoot) rollRow(state, content, row, run.difficulty, got);
  if (nowMs !== undefined) {
    ensureRaidWeek(state, nowMs);
    if (!rs.weekly.chests[key]) {
      rs.weekly.chests[key] = true;
      const base = pickTableEntry(state.rng, room.table.entries);
      if (base) grantRaidPiece(state, content, base, run, def, ilvl, got);
      const dust = def.weeklyChest.dust[run.difficulty];
      if (dust > 0 && content.items[RELIC_DUST_ITEM_ID]) {
        grantLoot(state, content, RELIC_DUST_ITEM_ID, dust);
        mergeLoot(got, RELIC_DUST_ITEM_ID, dust);
      }
      for (const e of def.weeklyChest.extraItems) {
        if (!content.items[e.itemId]) continue;
        grantLoot(state, content, e.itemId, e.qty);
        mergeLoot(got, e.itemId, e.qty);
      }
    }
  }
  run.lastLoot = got;
  for (const g of got) mergeLoot(run.loot, g.itemId, g.qty);
  run.bossSeq += 1;
  run.restMs = RAID_REST_AUTO_MS;
  if (run.room >= def.rooms.length - 1) {
    const clears = rs.clears as Record<RaidDifficulty, number>;
    clears[run.difficulty] = (clears[run.difficulty] ?? 0) + 1;
    const dur = state.elapsedMs - run.startedAtMs;
    const best = rs.fastestMs[run.difficulty];
    if (best === undefined || dur < best) rs.fastestMs[run.difficulty] = dur;
    run.phase = "complete";
  } else {
    run.phase = "rest";
  }
}

/**
 * Tod oder Patt im Raid (R3, nach dem Kampf-Aufräumen in combat.ts; der Spieler ist voll geheilt). Mythisch: Lauf
 * vorbei, 25 % der Gebühr zurück. Normal/Heroisch: Phase „defeated“, die Entscheidung trifft der Spieler (Dialog)
 * oder tickRaid in Warteschlange/offline.
 */
export function onRaidDefeat(state: GameState, content: ContentDB, reason: "defeated" | "stalemate"): void {
  void reason;
  const run = state.raid?.run;
  if (!run || run.phase !== "fight") return;
  const def = raidDef(content, run.raidId);
  if (!def) return;
  if (run.difficulty === "mythic") {
    const refund = Math.round(run.feePaid * def.mythicRefundPct);
    state.character.gold += refund;
    finishRun(state, content, "defeated", refund);
    return;
  }
  run.phase = "defeated";
  run.restMs = RAID_REST_AUTO_MS;
}

/**
 * Lauf steht in „fight“, aber der Held kämpft nicht (mehr) im Raum: zählt wie ein Tod (A15). In einer Warteschlangen-Runde endet
 * die Warteschlange (der Spieler hat bewusst gestoppt), danach Tod-Dialog bzw. Mythisch-Ende mit Rückgabe. Gemeinsame Regel für
 * tickRaid und das Laden (persistence). Gibt true zurück, wenn sie gegriffen hat.
 * claude:2026-10-26T04:00:00+02:00 — aus tickRaid gezogen (QA-Raid #4/#9, QA-Saves: Laden im Stopp-Fenster).
 */
export function resolveLeftRaidFight(state: GameState, content: ContentDB): boolean {
  const rs = state.raid;
  const run = rs?.run;
  if (!rs || !run || run.phase !== "fight" || activeRaidFight(state, content)) return false;
  if (rs.queue) {
    state.lastQueueSkip = { monsterId: "", reason: "defeated", raidId: rs.queue.raidId };
    rs.queue = null;
  }
  onRaidDefeat(state, content, "stalemate");
  return true;
}

/**
 * claude:2026-10-24T15:18:33+02:00 — QA2-Saves B2 (CEO: offline wie online): Hat der Spieler außerhalb des Raid-Kampfs selbst
 * etwas gestartet (Aktion über die Seitenleiste oder einen eigenen Kampf), ist der Held beschäftigt. Ein automatischer Raum-Eintritt
 * (Rast-Countdown, Neustart nach dem Tod, nächste Warteschlangen-Runde) liefe über beginDungeonRun und würfe eine endlose Aktion bzw.
 * den eigenen Kampf weg. Ein Kampf in einem Raid-Raum (`raidOnly`) gehört nie dem Spieler (startbar nur über den Raid), alles
 * andere schon.
 */
export function playerBusyOutsideRaid(state: GameState, content: ContentDB): boolean {
  if (state.activeActionId !== null) return true;
  if (state.combat.monsterId === null) return false;
  const dId = state.combat.dungeonId;
  const d = dId ? content.dungeons.find((x) => x.id === dId) : undefined;
  return d?.raidOnly !== true;
}

/**
 * Raid-Uhr je Tick: Rast-Countdown (nur Auto-Weiter, Warteschlange oder offline), Tod-Entscheidung in Warteschlange/
 * offline (A6: Normal bis maxAutoRestarts gratis, Heroisch nur mit „Neustart automatisch kaufen“), Abschluss-
 * Bildschirm schließt in Warteschlange/offline/Auto-Weiter selbst. Kein RNG.
 * Läuft eine eigene Aktion oder ein eigener Kampf des Spielers, betritt die Automatik keinen Raum: der Lauf wartet mit ruhendem
 * Countdown wie online im Dialog, bis der Spieler fertig ist oder selbst weitermacht.
 */
export function tickRaid(state: GameState, content: ContentDB, dtMs: number, offline: boolean, nowMs?: number): void {
  const rs = state.raid;
  const run = rs?.run;
  if (!rs || !run) return;
  // claude:2026-10-25T11:55:00+02:00 — Kampf verlassen (Stopp, andere Aktion, anderer Kampf) zählt wie ein Tod: Normal gratis neu,
  // Heroisch gegen Gold, Mythisch vorbei. Sonst hinge der Lauf in „fight“ fest und hielte die Warteschlange an; der Stopp-Knopf
  // ist so auch kein Ausweg aus der Mythisch-Todesregel.
  if (resolveLeftRaidFight(state, content) && !rs.run) return;
  const fromQueue = rs.queue !== null;
  const auto = offline || fromQueue || state.settings.raidAutoContinue === true;
  if (run.phase === "rest" || run.phase === "complete") {
    if (!auto) return;
    // claude:2026-10-26T00:50:00+02:00 — der Abschluss-Dialog (Laufzeit, Gebühr, Bestzeit) schließt nur in Warteschlange/offline selbst (QA-Raid #10).
    if (run.phase === "complete" && !(offline || fromQueue)) return;
    // claude:2026-10-24T15:18:33+02:00 — QA2-Saves B2: Rast → nächster Raum bzw. Abschluss → nächste Warteschlangen-Runde betreten einen
    // Raum. Ist der Held mit Eigenem beschäftigt, ruht der Countdown (online wie offline). Ein Abschluss ohne Folgerunde schließt weiter.
    const q = rs.queue;
    const entersRoom = run.phase === "rest" || (q !== null && (q.remaining === null || q.remaining > 1));
    if (entersRoom && playerBusyOutsideRaid(state, content)) return;
    run.restMs = Math.max(0, run.restMs - dtMs); // claude:2026-10-24T15:18:33+02:00 — nicht unbegrenzt ins Minus (Laden klemmt ohnehin auf 0)
    if (run.restMs > 0) return;
    if (run.phase === "rest") continueRaid(state, content);
    else finishRun(state, content, "complete", 0, nowMs);
    return;
  }
  if (run.phase === "defeated") {
    if (!(offline || fromQueue)) return;
    const def = raidDef(content, run.raidId);
    const underLimit = !!def && run.restarts < def.maxAutoRestarts;
    // claude:2026-10-24T15:18:33+02:00 — QA2-Saves B2: ein automatischer Neustart betritt den Raum; mit eigener Aktion/eigenem Kampf
    // wartet der Tod-Dialog wie online (Countdown ruht).
    const autoRestart = underLimit && (run.difficulty === "normal" || (run.difficulty === "heroic" && state.settings.raidAutoBuyRestart === true));
    if (autoRestart && playerBusyOutsideRaid(state, content)) return;
    run.restMs = Math.max(0, run.restMs - dtMs); // claude:2026-10-24T15:18:33+02:00 — nicht unbegrenzt ins Minus
    if (run.restMs > 0) return;
    if (autoRestart && restartRaidRoom(state, content) === "ok") return;
    // claude:2026-10-26T00:50:00+02:00 — Heroisch ohne Auto-Kauf und ohne Warteschlange: offline nicht selbst entscheiden, der Spieler wählt (QA-Raid #8).
    // claude:2026-10-24T15:18:33+02:00 — QA2-Raid B2 (CEO, analog R3): auch MIT Auto-Kauf, wenn der Kauf scheitert (Gold fehlt) oder
    // maxAutoRestarts erreicht ist. Ohne Warteschlange entscheidet im Heroisch nie die Engine; die Gebühr verfällt nicht ohne Wahl.
    if (!fromQueue && run.difficulty === "heroic") return;
    finishRun(state, content, "defeated", 0, nowMs);
  }
}

/** Aschegang (R10): laufender Lauf, Wochentruhen und Warteschlange zurück; Freischaltungen und Zähler bleiben. */
export function resetRaidForPrestige(state: GameState): void {
  const rs = state.raid;
  if (!rs) return;
  rs.run = null;
  rs.queue = null;
  rs.weekly = { week: -1, chests: {} };
}

/** Startet einen Raid aus der Warteschlange (actions.ts). */
export function startRaidFromQueue(state: GameState, content: ContentDB, raidId: string, difficulty: RaidDifficulty, target: number | null, nowMs?: number): RaidStartReason {
  const r = startRaid(state, content, raidId, difficulty, nowMs);
  if (r === "ok") raidStateOf(state).queue = { raidId, difficulty, remaining: target, completed: 0 };
  return r;
}

/**
 * claude:2026-10-25T03:20:00+02:00 — Faktoren des laufenden Raid-Kampfs für Phasenwerte (Spec §3 Regel 5): absolute
 * Phasen-Rüstung × Rüstungsfaktor (Stufe × Offenes Zeughaus 1,25), Phasen-inflict-Stärke × Schadensfaktor der Stufe.
 * Außerhalb des Raids 1.
 */
export function raidDefenseFactor(state: GameState, content: ContentDB): number {
  const f = activeRaidFight(state, content);
  if (!f) return 1;
  return f.def.scaling[f.run.difficulty].defenseMult * (f.run.modifier === "open_armory" ? 1.25 : 1);
}

export function raidDamageFactor(state: GameState, content: ContentDB): number {
  const f = activeRaidFight(state, content);
  if (!f) return 1;
  const wave = f.def.reinforcedWave;
  return f.def.scaling[f.run.difficulty].damageMult * (state.combat.encounterIndex === wave.index ? wave.damageMult : 1);
}
