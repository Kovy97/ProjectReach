/**
 * Balance-Audit Magie 28.08.2026 (balance-designer) — Mess-Skript, NICHT Teil der Test-Suite, pinnt nichts.
 *
 * Lauf:  cd packages/engine && AUDIT_TREE=head pnpm exec vitest run --root G:/GameDev/design/audit-magie-2026-08-28 \
 *          --config G:/GameDev/design/audit-magie-2026-08-28/vitest.config.mts
 * Env:   AUDIT_TREE  = head | old-75a1806 | old-351f6f7 | old-3bb1361  (Quellbaum, s. vitest.config.mts)
 *        AUDIT_SCOPE = full | core   (core = nur BiS-/Craft-Kits je Stil, keine Varianten/Alternativen)
 *        AUDIT_HOURS = Sim-Stunden je Standardgegner (Default 1; Bosse ×2)
 *
 * Misst „Kit-Charaktere" (bestes legales Kit der Stufe OHNE Runen/Suffixe/Tränke — genau wie die
 * Zauberfokus-Kalibrierung: INT 46/70/95 auf CL 30/60/90) je Stil gegen Phasen-Gegner aller drei
 * Verteidigungsarten (Rüstung/Ausweichen/Ward) und Bosse, mit der ECHTEN Kampfschleife (Statuseffekte,
 * Glut, Schock-Überspringen, Gift-Stapel, Resonanz, Lichtsegen, Mana-Schleife) statt der Papierformel.
 *  - Modus „unsterblich": HP jeden Tick auf Max (nur Offensive messen, keine Tode/Resets).
 *  - Modus „sterblich": ohne Food bzw. mit Phasen-Food → Tode/h, Ø HP, Ø Ward, Schaden/h.
 * Ergebnis: TSV unter design/audit-magie-2026-08-28/rohdaten-<tree>.tsv + Kurztabellen auf stdout.
 */
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { content as baseContent } from "@hearthforge/content";
import { computeStats } from "@engine/character";
import { buildBisCharacter } from "@engine/balance-envelope-helpers";
import {
  startCombat,
  combatStep,
  contestHitChance,
  enemyEffectiveAccuracy,
  combinedFloorDodge,
} from "@engine/combat";
import { addItem } from "@engine/inventory";
import {
  TICK_MS,
  DEFENSE_MITIGATION_K,
  DEFENSE_MITIGATION_MAX,
  DMG_MAX_HIT_MULT,
  DMG_ROLL_FLOOR,
  LEATHER_HIT_FLOOR,
  MANA_PER_CAST,
} from "@hearthforge/shared";

type Style = "melee" | "ranged" | "magic";
type AnyContent = any;
type AnyState = any;

const TREE = process.env.AUDIT_TREE ?? "head";
const SCOPE = process.env.AUDIT_SCOPE ?? "full";
const HOURS = Number(process.env.AUDIT_HOURS ?? "1");
const OUT = `G:/GameDev/design/audit-magie-2026-08-28/rohdaten-${TREE}${process.env.AUDIT_ALT ? "-extra" : ""}.tsv`;

/** Phasen: Kit-Stufe, Standardgegner je Verteidigungsart, Bosse, Phasen-Food, Craft-Präfix der Stufe. */
const PHASES = [
  { cl: 30, tier: "blacksteel", std: ["goblin_butcher", "dust_vulture", "goblin_warlock"], boss: ["ash_tyrant"], food: "cooked_salmon" },
  { cl: 60, tier: "runite", std: ["skeleton_warrior", "spectral_stag", "bramble_witch"], boss: ["goblin_warchief", "forest_warden"], food: "cooked_lobster" },
  { cl: 90, tier: "aetherium", std: ["iron_sentinel", "gray_wolf", "skeleton_nekro"], boss: ["roc", "roc_elder", "idol_warden", "last_idol"], food: "cooked_crypteel" },
] as const;

/** Pre-Elementleiter-Spannen (Commit 351f6f7) der sieben angehobenen Leiter-Waffen. */
const OLD_SPAN: Record<string, [number, number]> = {
  bronze_staff: [0.9, 1.3],
  steel_staff: [1.7, 2.6],
  blacksteel_staff: [2.1, 3.2],
  adamantium_wand: [2.6, 3.3],
  titanium_staff: [6.5, 9.8],
  aetherium_staff: [8.1, 12.2],
  godiron_staff: [10.2, 15.2],
};
/** Pre-Elementleiter-Waffeneffekte derselben sieben Waffen (Commit 351f6f7). */
const OLD_EFFECT: Record<string, any> = {
  bronze_staff: { type: "burn", chance: 0.45, magnitude: 1, durationMs: 3800 },
  steel_staff: { type: "burn", chance: 0.45, magnitude: 2, durationMs: 4300 },
  blacksteel_staff: { type: "burn", chance: 0.45, magnitude: 3, durationMs: 4600 },
  adamantium_wand: { type: "shock", chance: 0.24, magnitude: 0.26, durationMs: 4000 },
  titanium_staff: { type: "burn", chance: 0.45, magnitude: 6, durationMs: 6100 },
  aetherium_staff: { type: "burn", chance: 0.45, magnitude: 7, durationMs: 6300 },
  godiron_staff: { type: "burn", chance: 0.45, magnitude: 7, durationMs: 6500 },
};

// ── Content-Klone ──────────────────────────────────────────────────────────
function withPatchedItems(c: AnyContent, patch: (items: Record<string, any>) => void): AnyContent {
  const items: Record<string, any> = { ...c.items };
  patch(items);
  const monsters: Record<string, any> = { ...c.monsters };
  for (const id of Object.keys(monsters)) {
    if (monsters[id].dungeonOnly) monsters[id] = { ...monsters[id], dungeonOnly: false }; // Direktstart der Idol-Bosse erlauben
  }
  return { ...c, items, monsters };
}
const isMainhand = (it: any, style: Style) => it.type === "equipment" && it.slot === "mainhand" && it.weaponStyle === style;
/** Nur `keep` bleibt als legale Waffe des Stils (alle anderen bekommen Requirement 999). */
function restrictWeapon(items: Record<string, any>, style: Style, keep: (it: any) => boolean): void {
  for (const id of Object.keys(items)) {
    const it = items[id];
    if (isMainhand(it, style) && !keep(it)) items[id] = { ...it, requirements: { ...(it.requirements ?? {}), attack: 999 } };
  }
}
type Variant = "full" | "noFocus" | "oldSpan" | "noStatus" | "oldItem";
function applyVariant(items: Record<string, any>, variant: Variant, mainhand: string): void {
  if (variant === "noFocus") {
    for (const id of Object.keys(items)) if (items[id].spellFocus) items[id] = { ...items[id], spellFocus: 0 };
  } else if (variant === "oldSpan") {
    for (const id of Object.keys(OLD_SPAN)) if (items[id]) items[id] = { ...items[id], damageMin: OLD_SPAN[id]![0], damageMax: OLD_SPAN[id]![1] };
  } else if (variant === "noStatus") {
    const it = items[mainhand];
    if (it) { const { weaponEffect: _a, weaponEffects: _b, ...rest } = it; items[mainhand] = rest; }
  } else if (variant === "oldItem") {
    for (const id of Object.keys(OLD_SPAN)) {
      if (!items[id]) continue;
      const { weaponEffects: _b, magicTheme: _m, ...rest } = items[id];
      items[id] = { ...rest, damageMin: OLD_SPAN[id]![0], damageMax: OLD_SPAN[id]![1], weaponEffect: OLD_EFFECT[id] };
    }
  }
}

// ── Kit-Charakter ─────────────────────────────────────────────────────────
interface Kit { state: AnyState; content: AnyContent; mainhand: string; offhand: string | null; petId: string | null; st: any; desc: string }
function buildKit(style: Style, cl: number, variant: Variant, keep?: (it: any) => boolean): Kit | null {
  let mainhand = "";
  const c = withPatchedItems(baseContent, (items) => {
    if (keep) restrictWeapon(items, style, keep);
  });
  let b: any;
  try {
    b = buildBisCharacter(c, style as any, cl, "damage", { allBuffs: true });
  } catch {
    return null;
  }
  mainhand = b.kit.mainhand;
  // Variante NACH der Waffenwahl anwenden (sonst wählt der Builder anders), Kit bleibt identisch.
  const c2 = withPatchedItems(c, (items) => applyVariant(items, variant, mainhand));
  b.state.character.buffs = [];
  b.state.character.equippedInstances = {};
  const st = computeStats(b.state, c2);
  const w = c2.items[mainhand];
  const eff = [w.weaponEffect, ...(w.weaponEffects ?? [])].filter(Boolean).map((e: any) => `${e.type}@${e.chance}x${e.magnitude}/${e.durationMs}`).join("+");
  const a = st.attributes;
  const n = (x: any): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);
  const desc = `${mainhand}${b.kit.offhand ? "+" + b.kit.offhand : ""} span ${w.damageMin}-${w.damageMax}@${w.attackIntervalMs ?? 3000} focus ${w.spellFocus ?? 0} eff[${eff}] | str${a.str} dex${a.dex} int${a.int} con${a.con} wis${a.wis} lck${a.lck} | dmg ${n(st.attackDamageMin).toFixed(1)}-${n(st.attackDamageMax).toFixed(1)} iv${Math.round(n(st.attackIntervalMs))} acc${n(st.accuracy).toFixed(1)} crit${n(st.critChance).toFixed(3)}x${n(st.critDamage).toFixed(2)} hp${Math.round(n(st.maxHp))} ward${Math.round(n(st.maxWard))} def${n(st.defense).toFixed(0)} dodge${n(st.dodgeChance).toFixed(2)} mana${Math.round(n(st.maxMana))}+${n(st.manaRegen).toFixed(1)}/s apen${n(st.armorPen)} wb${n(st.wardBreak)} pet=${b.petId}`;
  return { state: b.state, content: c2, mainhand, offhand: b.kit.offhand ?? null, petId: b.petId, st, desc };
}

// ── Papierformel (Spiegel balance-envelope §5 expectedTtk, ohne Waffeneffekte) ───
function mitigation(d: number): number { return Math.min(DEFENSE_MITIGATION_MAX, d / (d + DEFENSE_MITIGATION_K)); }
function paper(st: any, m: any) {
  const hc = contestHitChance(st.accuracy, m.evasion * (1 - (st.precision ?? 0)));
  const red = mitigation(m.defense * (1 - (st.armorPen ?? 0)));
  const mean = ((st.attackDamageMin + st.attackDamageMax) / 2) * (1 - red);
  const eOut = hc * mean * (1 + st.critChance * (st.critDamage - 1));
  const effHp = m.maxHp + (m.wardCapacity ?? 0) * (1 - (st.wardBreak ?? 0));
  const dps = eOut / (st.attackIntervalMs / 1000);
  const hcE = contestHitChance(enemyEffectiveAccuracy(m), st.evasion);
  const land = (1 - combinedFloorDodge(st.dodgeChance ?? 0, hcE)) * hcE;
  let hit = m.damage * DMG_MAX_HIT_MULT * ((1 + DMG_ROLL_FLOOR) / 2) * (1 - mitigation(st.defense));
  if ((st.dodgeChance ?? 0) > 0) hit *= 1 - LEATHER_HIT_FLOOR;
  hit *= 1 - (st.blockChance ?? 0) * 0.85;
  hit = Math.min(hit, 0.5 * st.maxHp);
  hit *= 1 - (st.damageReduction ?? 0);
  return { hc, red, dps, ttk: effHp / dps, enemyTtk: ((st.maxHp + (st.maxWard ?? 0)) / (land * hit)) * (m.attackIntervalMs / 1000), land };
}

// ── Kampf-Läufer ──────────────────────────────────────────────────────────
interface RunOpts { immortal: boolean; food?: string; hours: number }
function runFight(kit: Kit, monsterId: string, opts: RunOpts) {
  const { state, content: c, st } = kit;
  const m = c.monsters[monsterId];
  if (!m) throw new Error("Monster fehlt: " + monsterId);
  if (opts.food) { addItem(state.inventory, c, opts.food, 20000); state.character.food = opts.food; }
  else state.character.food = null;
  state.character.hp = st.maxHp; state.character.ward = st.maxWard ?? 0; state.character.mana = st.maxMana;
  state.stats.kills = 0; state.stats.deaths = 0;
  if (!startCombat(state, c, monsterId)) throw new Error("startCombat verweigert: " + monsterId);
  const mhCost = c.items[state.character.equipment.mainhand]?.manaCost;
  const cost = st.style === "magic" ? (typeof mhCost === "number" && mhCost >= 0 ? mhCost : MANA_PER_CAST) : 0;
  const steps = Math.round((opts.hours * 3_600_000) / TICK_MS);
  const r = {
    ticks: 0, fightTicks: 0, kills: 0, deaths: 0, stalemates: 0,
    hits: 0, crits: 0, misses: 0, frozenMiss: 0, casts: 0, attacks: 0,
    mainDmg: 0, arcDmg: 0, petDmg: 0, dot: 0, dotBurn: 0, dotPoison: 0, dotBleed: 0,
    glutHit: 0, glutDot: 0, poisonStackBonus: 0, momentumBonus: 0, burnTicks: 0, poisonTicksStacks: 0, poisonTicks: 0,
    shockDelayMs: 0, enemyFrozen: 0, voidTicks: 0,
    hpSum: 0, wardSum: 0, manaSum: 0, dmgTaken: 0, dotTaken: 0, wardAbs: 0, lifesteal: 0, foodHeal: 0, foodEaten: 0, enemyHits: 0, enemyMiss: 0, dodges: 0, wardGain: 0,
  };
  let lastSeq = 0;
  for (let i = 0; i < steps; i++) {
    const cs = state.combat;
    if (cs.monsterId === null) {
      if (cs.stopReason === "stalemate") r.stalemates++;
      if (opts.immortal) state.character.hp = st.maxHp;
      startCombat(state, c, monsterId);
      lastSeq = 0;
    }
    if (opts.immortal) state.character.hp = st.maxHp;
    const alive = cs.enemyHp > 0 && !((cs.cooldownRemainingMs ?? 0) > 0);
    const burnOn = cs.enemyEffects.some((e: any) => e.type === "burn");
    const vuln = burnOn ? 1.1 : 1;
    const stacksRaw = cs.elemental?.enemy?.poisonStacks ?? 0;
    const svw = (m.wardCapacity ?? 0) > 0 ? 1.5 : 1; // STATUS_VS_WARD_MULT-Spiegel (nur Verhältnis, unten via dot-Schätzer)
    const momentum = cs.effectCounters?.momentumStacks ?? 0;
    if (alive) {
      for (const e of cs.enemyEffects) {
        if (e.type === "burn" || e.type === "bleed" || e.type === "poison") {
          const stacks = e.type === "poison" ? Math.max(1, stacksRaw) : 1;
          const perTick = e.magnitude * stacks * vuln * svw * (TICK_MS / 1000);
          r.dot += perTick;
          if (e.type === "burn") r.dotBurn += perTick; else if (e.type === "poison") r.dotPoison += perTick; else r.dotBleed += perTick;
          if (burnOn) r.glutDot += perTick * (0.1 / 1.1);
          if (e.type === "poison") { r.poisonStackBonus += e.magnitude * (stacks - 1) * vuln * svw * (TICK_MS / 1000); r.poisonTicks++; r.poisonTicksStacks += stacks; }
        }
      }
      if (burnOn) r.burnTicks++;
      if (cs.playerEffects.some((e: any) => e.type === "void")) r.voidTicks++;
    }
    const manaB = state.character.mana;
    const wardB = state.character.ward;
    const killsB = state.stats.kills;
    const deathsB = state.stats.deaths;
    combatStep(state, c);
    r.ticks++;
    if (alive) r.fightTicks++;
    r.kills += state.stats.kills - killsB;
    r.deaths += state.stats.deaths - deathsB;
    if (st.style === "magic" && manaB - state.character.mana >= cost * 0.5) r.casts++;
    if (state.character.ward > wardB) r.wardGain += state.character.ward - wardB;
    r.hpSum += Math.max(0, state.character.hp) / st.maxHp;
    r.wardSum += st.maxWard > 0 ? state.character.ward / st.maxWard : 0;
    r.manaSum += state.character.mana / st.maxMana;
    if (cs.eventCount < lastSeq) lastSeq = 0;
    for (const ev of cs.log) {
      if (ev.seq < lastSeq) continue;
      if (ev.by === "player") {
        if ((ev.kind === "hit" || ev.kind === "crit") && ev.rawDamage !== undefined) {
          r.hits++; r.attacks++; if (ev.kind === "crit") r.crits++;
          r.mainDmg += ev.amount;
          if (burnOn) r.glutHit += ev.amount * (0.1 / 1.1);
          if (momentum > 0) r.momentumBonus += ev.amount * (1 - 1 / (1 + momentum * 0.02));
        } else if (ev.kind === "hit") r.arcDmg += ev.amount;
        else if (ev.kind === "miss") { r.misses++; r.attacks++; if (ev.missReason === "frozen") r.frozenMiss++; }
        else if (ev.kind === "status" && ev.status === "shock" && ev.amount > 0) r.shockDelayMs += ev.amount;
        else if (ev.kind === "pet" || ev.kind === "petAbility") r.petDmg += ev.amount;
        else if (ev.kind === "shield" && ev.source === "ward") r.wardAbs += ev.amount;
        else if (ev.kind === "lifesteal") r.lifesteal += ev.amount;
        else if (ev.kind === "heal" && ev.source === "food") { r.foodHeal += ev.amount; r.foodEaten++; }
      } else {
        if (ev.kind === "hit") { r.enemyHits++; r.dmgTaken += ev.amount; }
        else if (ev.kind === "miss") { r.enemyMiss++; if (ev.missReason === "frozen") r.enemyFrozen++; if (ev.missReason === "dodge") r.dodges++; }
        else if (ev.kind === "dot") r.dotTaken += ev.amount;
      }
    }
    lastSeq = cs.eventCount;
  }
  const fightS = r.fightTicks * (TICK_MS / 1000);
  const hours = r.ticks * (TICK_MS / 1000) / 3600;
  const pool = m.maxHp + (m.wardCapacity ?? 0);
  return {
    ...r,
    fightS,
    ttk: r.kills > 0 ? fightS / r.kills : Infinity,
    dpsEff: fightS > 0 ? (r.kills * pool) / fightS : 0,
    killsPerH: r.kills / hours,
    deathsPerH: r.deaths / hours,
    avgHp: r.hpSum / r.ticks,
    avgWard: r.wardSum / r.ticks,
    avgMana: r.manaSum / r.ticks,
    dmgTakenPerH: (r.dmgTaken + r.dotTaken) / hours,
    wardAbsPerH: r.wardAbs / hours,
    wardGainPerH: r.wardGain / hours,
    lifestealPerH: r.lifesteal / hours,
    foodPerH: r.foodEaten / hours,
    hours,
  };
}

// ── Konfigurationen ───────────────────────────────────────────────────────
interface Cfg { phase: (typeof PHASES)[number]; style: Style; label: string; variant: Variant; keep?: (it: any) => boolean }
function configs(): Cfg[] {
  const out: Cfg[] = [];
  // Zusatzlauf: AUDIT_ALT="id[:variant],..." misst nur diese Magie-Haupthaende auf der Stufe AUDIT_ALT_CL (Default 90).
  if (process.env.AUDIT_ALT) {
    const cl = Number(process.env.AUDIT_ALT_CL ?? "90");
    const phase = PHASES.find((p) => p.cl === cl)!;
    for (const spec of process.env.AUDIT_ALT.split(",")) {
      const [id, v] = spec.split(":");
      out.push({ phase, style: "magic", label: `alt:${id}`, variant: (v as Variant) ?? "full", keep: (x) => x.id === id });
    }
    return out;
  }
  for (const phase of PHASES) {
    const { cl, tier } = phase;
    for (const style of ["melee", "ranged", "magic"] as Style[]) {
      out.push({ phase, style, label: "BiS", variant: "full" });
      if (style === "magic") {
        if (SCOPE === "full") for (const v of ["noFocus", "oldSpan", "noStatus", "oldItem"] as Variant[]) out.push({ phase, style, label: "BiS", variant: v });
        out.push({ phase, style, label: `craft-staff`, variant: "full", keep: (it) => it.id.startsWith(tier + "_") && it.twoHanded });
        out.push({ phase, style, label: `craft-wand`, variant: "full", keep: (it) => it.id.startsWith(tier + "_") && !it.twoHanded });
        if (SCOPE === "full") {
          out.push({ phase, style, label: `craft-staff`, variant: "noStatus", keep: (it) => it.id.startsWith(tier + "_") && it.twoHanded });
          out.push({ phase, style, label: `craft-staff`, variant: "oldItem", keep: (it) => it.id.startsWith(tier + "_") && it.twoHanded });
          out.push({ phase, style, label: `craft-wand`, variant: "noStatus", keep: (it) => it.id.startsWith(tier + "_") && !it.twoHanded });
          // Alle weiteren legalen Magie-Haupthände der Phase (Req cl−12..cl), je einzeln.
          const alts = Object.values(baseContent.items as Record<string, any>).filter((it) => {
            if (!isMainhand(it, "magic")) return false;
            const req = Math.max(0, ...Object.values(it.requirements ?? {}).map((x: any) => (typeof x === "number" ? x : 0)));
            return req <= cl && req >= cl - 12 && !it.id.startsWith(tier + "_");
          });
          for (const it of alts) out.push({ phase, style, label: `alt:${it.id}`, variant: "full", keep: (x) => x.id === it.id });
        }
      } else {
        out.push({ phase, style, label: `craft`, variant: "full", keep: (it) => it.id.startsWith(tier + "_") });
      }
    }
  }
  return out;
}

const COLS = [
  "tree", "cl", "style", "label", "variant", "mode", "monster", "mlevel", "mdef", "kills", "ttk", "dpsEff", "paperTtk", "paperDps", "paperHc", "paperEnemyTtk",
  "hits", "crits", "misses", "frozenMiss", "casts", "attacks", "mainDmg", "arcDmg", "petDmg", "dot", "dotBurn", "dotPoison", "dotBleed",
  "glutHit", "glutDot", "poisonStackBonus", "momentumBonus", "burnUptime", "avgPoisonStacks", "shockDelayS", "enemyFrozen", "voidUptime",
  "deaths", "deathsPerH", "stalemates", "avgHp", "avgWard", "avgMana", "dmgTakenPerH", "wardAbsPerH", "wardGainPerH", "lifestealPerH", "foodPerH", "enemyHits", "enemyMiss", "dodges", "hours", "mainhand", "offhand", "kit",
];

it(`Balance-Audit Magie — Kit-Charaktere je Stil (${TREE}, ${SCOPE})`, () => {
  const rows: string[] = [COLS.join("\t")];
  const summary: string[] = [];
  const kitCache = new Map<string, Kit | null>();
  const cfgs = configs();
  const t0 = Date.now();
  for (const cfg of cfgs) {
    const key = `${cfg.phase.cl}|${cfg.style}|${cfg.label}|${cfg.variant}`;
    let kit = kitCache.get(key);
    if (kit === undefined) { kit = buildKit(cfg.style, cfg.phase.cl, cfg.variant, cfg.keep); kitCache.set(key, kit); }
    if (!kit) { summary.push(`SKIP ${key} (keine legale Waffe)`); continue; }
    summary.push(`KIT ${key}: ${kit.desc}`);
    const targets = [...cfg.phase.std.map((id) => ({ id, boss: false })), ...cfg.phase.boss.map((id) => ({ id, boss: true }))];
    for (const t of targets) {
      const modes: Array<{ mode: string; immortal: boolean; food?: string }> = [{ mode: "immortal", immortal: true }];
      if (cfg.label === "BiS" && cfg.variant === "full") {
        modes.push({ mode: "mortal-nofood", immortal: false });
        modes.push({ mode: "mortal-food", immortal: false, food: cfg.phase.food });
      }
      for (const mo of modes) {
        // Frischer Kit-State je Lauf (Kampf-Zustand/RNG-Position identisch): Kit neu bauen ist billig.
        const fresh = buildKit(cfg.style, cfg.phase.cl, cfg.variant, cfg.keep)!;
        const m = fresh.content.monsters[t.id];
        const p = paper(fresh.st, m);
        const res = runFight(fresh, t.id, { immortal: mo.immortal, food: mo.food, hours: HOURS * (t.boss ? 2 : 1) });
        const row: Record<string, any> = {
          tree: TREE, cl: cfg.phase.cl, style: cfg.style, label: cfg.label, variant: cfg.variant, mode: mo.mode, monster: t.id, mlevel: m.level, mdef: `${m.defenseType ?? "armor"}${m.wardCapacity ? "+ward" : ""}`,
          kills: res.kills, ttk: res.ttk.toFixed(2), dpsEff: res.dpsEff.toFixed(3), paperTtk: p.ttk.toFixed(2), paperDps: p.dps.toFixed(3), paperHc: p.hc.toFixed(3), paperEnemyTtk: p.enemyTtk.toFixed(1),
          hits: res.hits, crits: res.crits, misses: res.misses, frozenMiss: res.frozenMiss, casts: res.casts, attacks: res.attacks,
          mainDmg: res.mainDmg.toFixed(0), arcDmg: res.arcDmg.toFixed(0), petDmg: res.petDmg.toFixed(0), dot: res.dot.toFixed(0), dotBurn: res.dotBurn.toFixed(0), dotPoison: res.dotPoison.toFixed(0), dotBleed: res.dotBleed.toFixed(0),
          glutHit: res.glutHit.toFixed(0), glutDot: res.glutDot.toFixed(0), poisonStackBonus: res.poisonStackBonus.toFixed(0), momentumBonus: res.momentumBonus.toFixed(0),
          burnUptime: (res.fightTicks ? res.burnTicks / res.fightTicks : 0).toFixed(3), avgPoisonStacks: (res.poisonTicks ? res.poisonTicksStacks / res.poisonTicks : 0).toFixed(2),
          shockDelayS: (res.shockDelayMs / 1000).toFixed(1), enemyFrozen: res.enemyFrozen, voidUptime: (res.fightTicks ? res.voidTicks / res.fightTicks : 0).toFixed(3),
          deaths: res.deaths, deathsPerH: res.deathsPerH.toFixed(2), stalemates: res.stalemates, avgHp: res.avgHp.toFixed(3), avgWard: res.avgWard.toFixed(3), avgMana: res.avgMana.toFixed(3),
          dmgTakenPerH: res.dmgTakenPerH.toFixed(0), wardAbsPerH: res.wardAbsPerH.toFixed(0), wardGainPerH: res.wardGainPerH.toFixed(0), lifestealPerH: res.lifestealPerH.toFixed(0), foodPerH: res.foodPerH.toFixed(0),
          enemyHits: res.enemyHits, enemyMiss: res.enemyMiss, dodges: res.dodges, hours: res.hours.toFixed(2), mainhand: fresh.mainhand, offhand: fresh.offhand ?? "", kit: fresh.desc,
        };
        rows.push(COLS.map((cn) => String(row[cn])).join("\t"));
      }
    }
  }
  writeFileSync(OUT, rows.join("\n") + "\n", "utf8");
  console.log(summary.join("\n"));
  console.log(`\n${rows.length - 1} Zeilen → ${OUT} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
});
