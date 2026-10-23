import { afterAll, describe, expect, it } from "vitest";
import { content as liveContent } from "@hearthforge/content";
import type {
  BossPhase,
  ContentDB,
  DungeonDef,
  EquipSlot,
  GameState,
  ItemDef,
  ItemInstance,
  RaidDifficulty,
  WeaponStyle,
} from "@hearthforge/shared";
import { affixAppliesToItem, defaultRaidState, enchantSlotsFor, getItemRarity, quiverAcceptsAffix } from "@hearthforge/shared";
import { buildBisCharacter } from "./balance-envelope-helpers";
import { computeStats } from "./character";
import { beginDungeonRun } from "./dungeon";
import { affixHasActiveEffect, trinityGatePasses } from "./enchant";
import { itemCount } from "./inventory";
import { equipPet, equipSecondPet } from "./pets";
import { startRaid } from "./raid";
import { advance } from "./tick";

/**
 * claude:2026-10-25T13:30:00+02:00 — Nachmessung des Raids „Die Hallen von Gobkha'raz“ mit der echten Engine
 * (design/1.4.0-balance-raid.md §11 Apply #12, Ergebnis dort §13). Kein Guard, keine Pins: reine Messung, die nur mit
 * `RAID_MEASURE=1` läuft, damit die normale Suite schnell bleibt.
 *
 *   RAID_MEASURE=1 NO_COLOR=1 npx vitest run src/raid-measure.test.ts        (in packages/engine)
 *   RAID_MEASURE_N=10,10,20      Läufe je Stil für Normal, Heroisch, Mythisch (Default)
 *   RAID_MEASURE_ONLY=mythic     nur eine Stufe der Hauptmatrix
 *   RAID_MEASURE_R3=0            Set-Wert am Endboss (R3) auslassen
 *   RAID_MEASURE_VARIANTS=1      Stellschrauben-Varianten (Content-Ableger im Test, nichts im Katalog geändert)
 *
 * Kits (Spec §2.1): BiS-2H = Waffe/Schmuck aus „damage“, Rüstung aus „tank“ (Platte, 4× Ägis III), ohne Raid-Teile.
 * Raid-N/Raid-H = BiS-2H, darin 5/5 Raid-Set des Stils (Normal bzw. Heroisch), Raid-Zweihandwaffe, Amulett, Umhang,
 * beide Ringe. Runen auf dem Raid-Set: 4× Ägis III wie Spec §2.1 (seit claude:2026-10-25T16:50:00+02:00 legal: das Trinity-Gate lässt Ägis
 * auf Raid-Rüstung Stufe XIII jeder Klasse zu; Variante `runes: "class"` misst die Klassen-Rune); Waffe/Schmuck übernehmen die Runen und den Suffix
 * des ersetzten BiS-Teils, soweit legal. Begleiter Panzerhaut + (Nahkampf) Eisenkiefer. Essen `cooked_idolscale`
 * (Auto-Essen 3), Auto-Trank `godbloom_infusion` bei 40 %. Wochen-Modifikator „Stille Hallen“ (kein nowMs).
 */

const ON = !!process.env.RAID_MEASURE;
const content = liveContent;

type Kit = "bis" | "raidN" | "raidH";
/** Varianten der Kit-Konstruktion (nur für die Stellschrauben-Messung). */
interface KitOptions {
  /** `plate`: Platte des BiS-Tank-Builds statt des Raid-Sets (Raid-Waffe/-Schmuck bleiben). */
  armor?: "set" | "plate";
  /** Default `aegis` (4× Ägis III, Spec §2.1, legal seit claude:2026-10-25T16:50:00+02:00); `class`: Klassen-Rune III (Leder Ausweich, Stoff Ward). */
  runes?: "class" | "aegis";
  /** Haupthand erzwingen (Runen/Suffix der Builder-Waffe übernommen, soweit legal); z. B. `crownless_blade` statt der Builder-Wahl. */
  weapon?: string;
}
const STYLES: WeaponStyle[] = ["melee", "ranged", "magic"];
const ARMOR_SLOTS: EquipSlot[] = ["helmet", "body", "legs", "gloves", "boots"];
const SET_PART: Partial<Record<EquipSlot, string>> = { helmet: "head", body: "chest", legs: "legs", gloves: "hands", boots: "feet" };
const RAID_SET: Record<WeaponStyle, string> = { melee: "gk_bleed", ranged: "gk_poison", magic: "gk_fire" };
const RAID_WEAPON: Record<WeaponStyle, string> = { melee: "gk_king_greatsword", ranged: "gk_king_shortbow", magic: "gk_fel_staff" };
const CLASS_RUNE: Record<WeaponStyle, string> = { melee: "affix_aegis", ranged: "affix_evasion", magic: "affix_warding" };
const RAID_JEWELRY: Array<[EquipSlot, string]> = [
  ["amulet", "gk_pit_amulet"],
  ["cape", "gk_king_cape"],
  ["ring1", "gk_tally_ring"],
  ["ring2", "gk_fel_ring"],
];
const KIT_SUFFIX: Record<Kit, string> = { bis: "", raidN: "", raidH: "_heroic" };
const FOOD = "cooked_idolscale";
const POTION = "godbloom_infusion";
const RAID_ID = "gobkharaz";

function envN(): Record<RaidDifficulty, number> {
  const parts = (process.env.RAID_MEASURE_N ?? "10,10,20").split(",").map((x) => Number(x));
  return { normal: parts[0] || 10, heroic: parts[1] ?? parts[0] ?? 10, mythic: parts[2] ?? 20 };
}

function legalAffix(c: ContentDB, affixId: string, tier: number, base: ItemDef, ignoreGate = false): boolean {
  const def = c.affixes?.[affixId];
  return !!def && affixAppliesToItem(def.appliesTo, base) && quiverAcceptsAffix(affixId, base) && (ignoreGate || trinityGatePasses(def, tier, base));
}

function legalSuffix(c: ContentDB, suffix: ItemInstance["suffix"], base: ItemDef): boolean {
  if (!suffix) return false;
  const def = c.suffixes?.[suffix.suffixId];
  return !!def && affixAppliesToItem(def.appliesTo, base) && (def.minIlvl === undefined || suffix.ilvl >= def.minIlvl);
}

/**
 * Instanz eines Raid-Teils: legale Runen aus `wanted` (Reihenfolge = Rang; Stat-Runen wiederholen sich bis zum Slot-Limit,
 * Proc-Runen nicht). Suffix: der des ersetzten BiS-Teils, sonst der erste legale aus den übrigen BiS-Teilen (`fallback`;
 * z. B. trägt der Fernkampf-Schmuck „Luchs“ nur auf Fernkampfwaffen/Leder, der Raid-Schmuck bekommt dann „Tiger“).
 */
function raidInstance(
  c: ContentDB,
  slot: EquipSlot,
  itemId: string,
  wanted: ItemInstance["affixes"],
  from: ItemInstance | undefined,
  fallback: ItemInstance[] = [],
  ignoreGate = false,
): ItemInstance {
  const base = c.items[itemId];
  if (!base) throw new Error(`Raid-Item fehlt: ${itemId}`);
  const legal = wanted.filter((a) => legalAffix(c, a.affixId, a.tier, base, ignoreGate));
  const max = enchantSlotsFor(getItemRarity(base));
  const affixes: ItemInstance["affixes"] = [];
  const stat = legal.filter((a) => !affixHasActiveEffect(c.affixes![a.affixId]!));
  for (const a of legal) {
    if (affixes.length >= max) break;
    if (affixHasActiveEffect(c.affixes![a.affixId]!) && affixes.some((x) => x.affixId === a.affixId)) continue;
    affixes.push({ ...a });
  }
  for (let i = 0; affixes.length < max && stat.length > 0; i++) affixes.push({ ...stat[i % stat.length]! });
  const inst: ItemInstance = { instanceId: `raid-${slot}`, baseItemId: itemId, affixes };
  const sfx = [from, ...fallback].find((x) => x?.suffix && legalSuffix(c, x.suffix, base))?.suffix;
  if (sfx) inst.suffix = { ...sfx };
  return inst;
}

interface Built {
  state: GameState;
  kit: Partial<Record<EquipSlot, string>>;
  runes: Partial<Record<EquipSlot, string>>;
}

/** Referenz-Kit (Spec §2.1) als echter Spielzustand. `c` erlaubt einen Content-Ableger (R3/Varianten). */
function buildKit(c: ContentDB, style: WeaponStyle, kit: Kit, seed: number, o: KitOptions = {}): Built {
  const b = buildBisCharacter(c, style, 99, "damage", { allBuffs: true, excludeRaid: true, seed });
  const tank = buildBisCharacter(c, style, 99, "tank", { allBuffs: true, excludeRaid: true, seed });
  const s = b.state;
  const eqi = (s.character.equippedInstances ??= {});
  for (const slot of ARMOR_SLOTS) {
    s.character.equipment[slot] = tank.state.character.equipment[slot];
    const inst = tank.state.character.equippedInstances?.[slot];
    if (inst) eqi[slot] = inst;
    else delete eqi[slot];
  }
  if (o.weapon) {
    const bisInstances = Object.values(eqi).filter((x): x is ItemInstance => !!x);
    eqi.mainhand = raidInstance(c, "mainhand", o.weapon, eqi.mainhand?.affixes ?? [], eqi.mainhand, bisInstances);
    s.character.equipment.mainhand = o.weapon;
  }
  if (kit !== "bis") {
    const sfx = KIT_SUFFIX[kit];
    const bisInstances = Object.values(eqi).filter((x): x is ItemInstance => !!x);
    if (o.armor !== "plate") {
      const runeId = o.runes === "class" ? CLASS_RUNE[style] : "affix_aegis";
      for (const slot of ARMOR_SLOTS) {
        const id = `${RAID_SET[style]}_${SET_PART[slot]}${sfx}`;
        const runes = Array.from({ length: 4 }, () => ({ affixId: runeId, tier: 3 }));
        eqi[slot] = raidInstance(c, slot, id, runes, eqi[slot], bisInstances);
        s.character.equipment[slot] = id;
      }
    }
    const weaponId = `${RAID_WEAPON[style]}${sfx}`;
    eqi.mainhand = raidInstance(c, "mainhand", weaponId, eqi.mainhand?.affixes ?? [], eqi.mainhand, bisInstances);
    s.character.equipment.mainhand = weaponId;
    for (const [slot, baseId] of RAID_JEWELRY) {
      const id = `${baseId}${sfx}`;
      eqi[slot] = raidInstance(c, slot, id, eqi[slot]?.affixes ?? [], eqi[slot], bisInstances);
      s.character.equipment[slot] = id;
    }
  }
  // Begleiter (Spec §2.1 „Schaden + Panzer“): Panzerhaut für alle, Eisenkiefer nur für Nahkampf (einziger Schadens-Begleiter).
  equipPet(s, "carapace");
  equipSecondPet(s, c, style === "melee" ? "ironmaw" : null);
  s.inventory.slots[0] = { itemId: FOOD, qty: 5000 };
  s.inventory.slots[1] = { itemId: POTION, qty: 1000 };
  s.character.food = FOOD;
  s.character.autoEatTier = 3;
  s.character.autoPotion = { ...s.character.autoPotion, healPotionId: POTION, healThreshold: 0.4 };
  s.dungeonsCleared.behind_the_throne = 1;
  s.character.gold = 5_000_000;
  s.settings.raidAutoBuyRestart = true;
  s.raid = { ...defaultRaidState(), clears: { normal: 1, heroic: 1, mythic: 0 } };
  const kitIds: Partial<Record<EquipSlot, string>> = {};
  const runes: Partial<Record<EquipSlot, string>> = {};
  for (const [slot, id] of Object.entries(s.character.equipment) as Array<[EquipSlot, string | null]>) {
    if (!id) continue;
    kitIds[slot] = id;
    const inst = eqi[slot];
    if (inst) runes[slot] = `${inst.affixes.map((a) => `${a.affixId.replace("affix_", "")}${a.tier}`).join("+")}${inst.suffix ? ` / ${inst.suffix.suffixId}` : ""}`;
  }
  return { state: s, kit: kitIds, runes };
}

interface RunResult {
  outcome: "complete" | "defeated" | "abandoned" | "timeout";
  minutes: number;
  restarts: number;
  deaths: number;
  /** Ort jeder Niederlage: Raum·Begegnung(·Bossphase), zuletzt gesehen vor der Niederlage (10-s-Raster). */
  defeatAt: string[];
  food: number;
  potions: number;
}

/** Ein kompletter Raid-Lauf offline (Auto-Weiter, Auto-Neustart Normal gratis / Heroisch gekauft, Mythisch Tod = Ende). */
function runRaid(c: ContentDB, s: GameState, difficulty: RaidDifficulty): RunResult {
  const food0 = itemCount(s.inventory, FOOD);
  const pot0 = itemCount(s.inventory, POTION);
  const deaths0 = s.stats.deaths;
  const r = startRaid(s, c, RAID_ID, difficulty);
  expect(r).toBe("ok");
  let restarts = 0;
  let lastSeen = "R1";
  const defeatAt: string[] = [];
  let outcome: RunResult["outcome"] = "timeout";
  const STEP = 10_000;
  for (let t = 0; t < 5 * 3_600_000; t += STEP) {
    advance(s, c, STEP, { offline: true });
    const run = s.raid!.run;
    if (run) {
      if (run.restarts > restarts) {
        for (let k = restarts; k < run.restarts; k++) defeatAt.push(lastSeen);
        restarts = run.restarts;
      }
      if (run.phase === "fight" && s.combat.monsterId) {
        const enc = s.combat.encounterIndex;
        const ph = enc === 4 ? `·P${s.combat.bossPhase ?? 0}` : "";
        lastSeen = `R${run.room + 1}·${enc === 4 ? "Boss" : `W${enc + 1}`}${ph}`;
      }
    }
    const res = s.raid!.lastResult;
    if (res) {
      outcome = res.outcome;
      if (res.outcome !== "complete") defeatAt.push(lastSeen);
      return {
        outcome,
        minutes: res.durationMs / 60_000,
        restarts,
        deaths: s.stats.deaths - deaths0,
        defeatAt,
        food: food0 - itemCount(s.inventory, FOOD),
        potions: pot0 - itemCount(s.inventory, POTION),
      };
    }
  }
  return { outcome, minutes: 300, restarts, deaths: s.stats.deaths - deaths0, defeatAt, food: food0 - itemCount(s.inventory, FOOD), potions: pot0 - itemCount(s.inventory, POTION) };
}

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
}
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "–");
const f0 = (x: number) => (Number.isFinite(x) ? Math.round(x).toString() : "–");

const STYLE_DE: Record<WeaponStyle, string> = { melee: "Nahkampf", ranged: "Fernkampf", magic: "Magie" };
const DIFF_DE: Record<RaidDifficulty, string> = { normal: "Normal", heroic: "Heroisch", mythic: "Mythisch" };
const KIT_DE: Record<Kit, string> = { bis: "BiS-2H", raidN: "Raid-N", raidH: "Raid-H" };

const rows: string[] = [];
const detail: string[] = [];

/** Eine Zelle (Stufe × Stil × Kit × Content-Ableger) messen und als Tabellenzeile ablegen. */
function measureCell(label: string, c: ContentDB, style: WeaponStyle, kit: Kit, difficulty: RaidDifficulty, n: number, o: KitOptions = {}): RunResult[] {
  const results: RunResult[] = [];
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const b = buildKit(c, style, kit, 1000 + i, o);
    results.push(runRaid(c, b.state, difficulty));
  }
  const wall = (Date.now() - t0) / 1000;
  const done = results.filter((r) => r.outcome === "complete");
  const mins = done.map((r) => r.minutes);
  const restarts = results.reduce((a, r) => a + r.restarts, 0);
  const deaths = results.reduce((a, r) => a + r.deaths, 0);
  const defeats = restarts + results.filter((r) => r.outcome !== "complete").length;
  const where = new Map<string, number>();
  for (const w of results.flatMap((r) => r.defeatAt)) where.set(w, (where.get(w) ?? 0) + 1);
  const whereTxt = where.size ? ` (${[...where.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(", ")})` : "";
  const line =
    `| ${DIFF_DE[difficulty]} | ${label} | ${STYLE_DE[style]} | ${n} | ${done.length}/${n} | ` +
    `${f1(median(mins))} | ${mins.length ? `${f1(Math.min(...mins))}–${f1(Math.max(...mins))}` : "–"} | ${f1(mins.reduce((a, b) => a + b, 0) / Math.max(1, mins.length))} | ` +
    `${defeats}${whereTxt} | ${deaths} | ${defeats - deaths} | ${f0(median(results.map((r) => r.food)))} | ${f0(median(results.map((r) => r.potions)))} |`;
  rows.push(line);
  console.log(
    `${line}   [${wall.toFixed(0)} s Rechenzeit; Läufe: ${results.map((r) => `${f1(r.minutes)}${r.outcome === "complete" ? "" : "†"}${r.restarts ? `(+${r.restarts})` : ""}`).join(" ")}]`,
  );
  return results;
}

/** Content-Ableger mit geänderten Raid-Faktoren und/oder Bossphasen (nur im Test, der Katalog bleibt unverändert). */
function variantContent(mod: { mythicDamageMult?: number; pitmotherPhases?: (p: BossPhase[]) => BossPhase[]; warkingDamage?: number }): ContentDB {
  const c: ContentDB = { ...content };
  if (mod.mythicDamageMult !== undefined) {
    c.raids = (content.raids ?? []).map((r) =>
      r.id === RAID_ID ? { ...r, scaling: { ...r.scaling, mythic: { ...r.scaling.mythic, damageMult: mod.mythicDamageMult! } } } : r,
    );
  }
  if (mod.pitmotherPhases || mod.warkingDamage !== undefined) {
    c.monsters = { ...content.monsters };
    if (mod.pitmotherPhases) {
      const m = content.monsters.gk_pitmother!;
      c.monsters.gk_pitmother = { ...m, phases: mod.pitmotherPhases(m.phases ?? []) };
    }
    if (mod.warkingDamage !== undefined) c.monsters.gk_warking = { ...content.monsters.gk_warking!, damage: mod.warkingDamage };
  }
  return c;
}

/** Ushka (gk_pitmother) P2 Schaden ×0,60 → ×0,55, P3 ×0,75 → ×0,65 (Doppelangriffe: Schaden/s ×1,1 bzw. ×1,3 statt ×1,2 / ×1,5). */
const USHKA_SOFTER = (p: BossPhase[]): BossPhase[] => p.map((ph, i) => (i === 1 ? { ...ph, damageMult: 0.55 } : i === 2 ? { ...ph, damageMult: 0.65 } : ph));

const CELLS: Array<{ difficulty: RaidDifficulty; kit: Kit }> = [
  { difficulty: "normal", kit: "bis" },
  { difficulty: "heroic", kit: "raidN" },
  { difficulty: "mythic", kit: "raidH" },
];

describe.skipIf(!ON)("Raid-Nachmessung (Apply #12, echte Engine)", () => {
  const N = envN();
  const only = process.env.RAID_MEASURE_ONLY as RaidDifficulty | undefined;

  it("Kits je Stil (Dokumentation)", () => {
    for (const style of STYLES) {
      for (const kit of ["bis", "raidN", "raidH"] as Kit[]) {
        const b = buildKit(content, style, kit, 1);
        const pets = `${b.state.character.companionPetId ?? "-"} + ${b.state.character.companionPetId2 ?? "-"}`;
        const lines = (Object.keys(b.kit) as EquipSlot[]).map((slot) => `    ${slot}: ${b.kit[slot]} [${b.runes[slot] ?? "ohne Instanz"}]`);
        const st = computeStats(b.state, content);
        const stats =
          `    Stats: HP ${st.maxHp} · Ward ${st.maxWard.toFixed(0)} · AR ${st.armorRating.toFixed(1)} · Ausweichen ${(st.dodgeChance * 100).toFixed(1)} % · ` +
          `Block ${(st.blockChance * 100).toFixed(0)} % · Schadensminderung ${(st.damageReduction * 100).toFixed(1)} % · Regen ${st.hpRegenPerSec.toFixed(2)}/s · ` +
          `Schaden ${st.attackDamageMin.toFixed(1)}–${st.attackDamageMax.toFixed(1)} @${st.attackIntervalMs} ms · Krit ${(st.critChance * 100).toFixed(0)} %/${st.critDamage.toFixed(2)} · ` +
          `Genauigkeit ${st.accuracy.toFixed(0)} · Attribute ${Object.entries(st.attributes).map(([k, v]) => `${k} ${v}`).join(" ")}`;
        detail.push(`${STYLE_DE[style]} ${KIT_DE[kit]} (Begleiter ${pets}; Buffs ${b.state.character.buffs.length}):\n${lines.join("\n")}\n${stats}`);
        expect(b.state.character.equipment.mainhand).toBeTruthy();
      }
    }
    console.log(detail.join("\n"));
  });

  for (const cell of CELLS) {
    if (only && only !== cell.difficulty) continue;
    for (const style of STYLES) {
      it(`${DIFF_DE[cell.difficulty]} ${KIT_DE[cell.kit]} ${STYLE_DE[style]} (N=${N[cell.difficulty]})`, () => {
        const results = measureCell(KIT_DE[cell.kit], content, style, cell.kit, cell.difficulty, N[cell.difficulty]);
        expect(results.length).toBe(N[cell.difficulty]);
      }, 1_500_000);
    }
  }

  // ── Stellschrauben-Varianten (Content-Ableger, nichts im Katalog geändert) ────────────────────────
  const VARIANTS = process.env.RAID_MEASURE_VARIANTS === "1";
  it.skipIf(!VARIANTS)("Varianten Nahkampf Mythisch: Stufen-Schaden und Ushka-Phasen", () => {
    rows.push("", "Varianten (Nahkampf, Mythisch, Raid-H):");
    measureCell("Raid-H · Mythisch-Schaden ×1,75", variantContent({ mythicDamageMult: 1.75 }), "melee", "raidH", "mythic", N.mythic);
    measureCell("Raid-H · Mythisch-Schaden ×1,65", variantContent({ mythicDamageMult: 1.65 }), "melee", "raidH", "mythic", N.mythic);
    measureCell("Raid-H · Ushka P2 ×0,55 / P3 ×0,65", variantContent({ pitmotherPhases: USHKA_SOFTER }), "melee", "raidH", "mythic", N.mythic);
    const noHeal = (p: BossPhase[]) => p.map((ph, i) => (i === 2 ? { ...ph, healPerHitPct: 0.001 } : ph));
    measureCell("Raid-H · Ushka P3 Heilung 0,10 %", variantContent({ pitmotherPhases: noHeal }), "melee", "raidH", "mythic", N.mythic);
    expect(rows.length).toBeGreaterThan(0);
  }, 1_500_000);

  it.skipIf(process.env.RAID_MEASURE_VARIANT_NORMAL !== "1")("Variante Nahkampf Normal: crownless_blade statt Builder-Waffe (godiron_maul)", () => {
    rows.push("", "Variante (Nahkampf, Normal, BiS-2H mit Spec-Waffe):");
    measureCell("BiS-2H · crownless_blade", content, "melee", "bis", "normal", N.normal, { weapon: "crownless_blade" });
    measureCell("Raid-N · Heroisch, Vergleich", content, "melee", "raidN", "heroic", 3);
    expect(rows.length).toBeGreaterThan(0);
  }, 1_500_000);

  it.skipIf(process.env.RAID_MEASURE_VARIANT_COMBO !== "1")("Variante Kombination: Mythisch-Schaden ×1,75 + Ushka P2 ×0,55 / P3 ×0,65", () => {
    rows.push("", "Variante Kombination (Mythisch ×1,75 + Ushka P2 ×0,55 / P3 ×0,65; Fernkampf/Magie mit 4× Ägis III, Gate offen):");
    const c = variantContent({ mythicDamageMult: 1.75, pitmotherPhases: USHKA_SOFTER });
    measureCell("Raid-H · Kombi", c, "melee", "raidH", "mythic", N.mythic);
    measureCell("Raid-H · Kombi + Ägis", c, "ranged", "raidH", "mythic", N.mythic, { runes: "aegis" });
    measureCell("Raid-H · Kombi + Ägis", c, "magic", "raidH", "mythic", N.mythic, { runes: "aegis" });
    // Gegenprobe Heroisch (die Ushka-Phasen gelten auf allen Stufen): Laufzeit darf nicht aus dem Band 55–65 fallen.
    measureCell("Raid-N · Kombi", c, "melee", "raidN", "heroic", 5);
    measureCell("Raid-N · Kombi + Ägis", c, "ranged", "raidN", "heroic", 5, { runes: "aegis" });
    measureCell("Raid-N · Kombi + Ägis", c, "magic", "raidN", "heroic", 5, { runes: "aegis" });
    expect(rows.length).toBeGreaterThan(0);
  }, 1_500_000);

  it.skipIf(process.env.RAID_MEASURE_VARIANT_COMBO2 !== "1")("Variante Kombination 2: Mythisch-Schaden ×1,70 + Ushka P2 ×0,55 / P3 ×0,65", () => {
    rows.push("", "Variante Kombination 2 (Mythisch ×1,70 + Ushka P2 ×0,55 / P3 ×0,65; Magie mit 4× Ägis III, Gate offen):");
    const c = variantContent({ mythicDamageMult: 1.7, pitmotherPhases: USHKA_SOFTER });
    measureCell("Raid-H · Kombi 2", c, "melee", "raidH", "mythic", N.mythic);
    measureCell("Raid-H · Kombi 2 + Ägis", c, "magic", "raidH", "mythic", N.mythic, { runes: "aegis" });
    expect(rows.length).toBeGreaterThan(0);
  }, 1_500_000);

  it.skipIf(!VARIANTS)("Varianten Fernkampf/Magie: Platte statt Set, Set mit Ägis (Gate offen)", () => {
    rows.push("", "Varianten (Fernkampf/Magie, Rüstung):");
    for (const style of ["ranged", "magic"] as WeaponStyle[]) {
      measureCell("Raid-N · BiS-Platte statt Set", content, style, "raidN", "heroic", N.heroic, { armor: "plate" });
      measureCell("Raid-N · Set + 4× Ägis III (Gate offen)", content, style, "raidN", "heroic", N.heroic, { runes: "aegis" });
      measureCell("Raid-H · BiS-Platte statt Set", content, style, "raidH", "mythic", N.mythic, { armor: "plate" });
      measureCell("Raid-H · Set + 4× Ägis III (Gate offen)", content, style, "raidH", "mythic", N.mythic, { runes: "aegis" });
    }
    expect(rows.length).toBeGreaterThan(0);
  }, 1_500_000);

  // ── R3: Wert der Set-Effekte am Endboss (Rakkzul Normal, Raid-N-Kit), echte Engine ──────────────
  const R3 = process.env.RAID_MEASURE_R3 !== "0";
  it.skipIf(!R3 || (!!only && only !== "normal"))("R3 Set-Effekt-Wert am Endboss (mit vs. ohne Set-Effekte, Raid-N)", () => {
    const SYNTH: DungeonDef = {
      id: "measure_warking",
      name: { en: "Measure", de: "Messung" },
      zone: "idolhall",
      requiredLevel: 99,
      encounters: ["gk_warking"],
      waveMeta: [{ kind: "boss" }],
      loot: [],
      xp: 0,
      gold: 0,
    };
    // Boss-Schaden neutralisiert (0,01): reines Schadensprofil ohne Tode (Stoff/Leder sterben sonst am Normal-Rakkzul,
    // s. Hauptmatrix), ohne Verzerrung durch Verzweiflung/Vergeltung am Lebensende. Phasen (Ward-Schild 10 %) bleiben.
    const base = variantContent({ warkingDamage: 0.01 });
    const withSets: ContentDB = { ...base, dungeons: [...content.dungeons, SYNTH] };
    const noEffects: ContentDB = {
      ...withSets,
      sets: content.sets.map((set) => (set.id.startsWith("gk_") && set.tiers ? { ...set, tiers: set.tiers.map((t) => ({ ...t, effects: [] })) } : set)),
    };
    const maxHp = content.monsters.gk_warking!.maxHp;
    const ttk = (c: ContentDB, style: WeaponStyle, seed: number): number | null => {
      const b = buildKit(c, style, "raidN", seed);
      const s = b.state;
      expect(beginDungeonRun(s, c, SYNTH)).toBe(true);
      const deaths0 = s.stats.deaths;
      let started = -1;
      for (let t = 0; t < 40 * 60_000; t += 100) {
        advance(s, c, 100);
        if (started < 0 && s.combat.enemyHp < maxHp) started = s.elapsedMs;
        if (s.stats.deaths > deaths0) return null;
        if (s.combat.dungeonId === null && s.combat.monsterId === null) return (s.elapsedMs - started) / 1000;
      }
      return null;
    };
    const SEEDS = [11, 12, 13, 14, 15, 16];
    const out: string[] = [];
    for (const style of STYLES) {
      const a = SEEDS.map((sd) => ttk(withSets, style, sd)).filter((x): x is number => x !== null);
      const b = SEEDS.map((sd) => ttk(noEffects, style, sd)).filter((x): x is number => x !== null);
      const ma = median(a);
      const mb = median(b);
      out.push(
        `| ${STYLE_DE[style]} | ${f0(ma)} s (${f0(Math.min(...a))}–${f0(Math.max(...a))}) | ${f0(mb)} s (${f0(Math.min(...b))}–${f0(Math.max(...b))}) | ` +
          `${f1((maxHp * 1.1) / ma)} | ${f1((maxHp * 1.1) / mb)} | +${f0((mb / ma - 1) * 100)} % | ${a.length}/${SEEDS.length} · ${b.length}/${SEEDS.length} |`,
      );
    }
    rows.push("", "R3 (Rakkzul Normal ohne Gegenschaden, Raid-N-Kit, TTK ab erstem Treffer; Schaden/s = 1,1 × 18.050 / TTK, Regen 1,5/s nicht herausgerechnet):", ...out);
    console.log(out.join("\n"));
    expect(out.length).toBe(3);
  }, 1_500_000);

  afterAll(() => {
    if (rows.length === 0) return;
    console.log(
      [
        "",
        "| Stufe | Kit | Stil | N | Abschlüsse | Median min | Spanne | Mittel | Niederlagen (Ort) | Tode | Patt | Essen (Median) | Tränke (Median) |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
        ...rows,
      ].join("\n"),
    );
  });
});
