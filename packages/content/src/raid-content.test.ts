import { describe, expect, it } from "vitest";
import { content } from "./index";
import { RAID_BASE_IDS, RAID_DAMAGE_SCALE, RAID_HP_SCALE } from "./raid";
import type { ItemDef, LocalizedString, RaidDifficulty } from "@hearthforge/shared";
import { RAID_DIFFICULTIES, RAID_VARIANT_SUFFIX } from "@hearthforge/shared";

// claude:2026-10-25T10:00:00+02:00 — WÄCHTER Raid „Die Hallen von Gobkha'raz“ (1.4.0 Welle 4, Spec 1.4.0-balance-raid.md §11 Punkt 11).
//  1. Mengen: 31 Basisteile × 3 = 93 Items, 15 Monster, 5 Raum-Dungeons, 3 Sets, eine RaidDef.
//  2. Raid schlägt den Bestand (Kernwert und Attributsumme je Klasse), Bögen ≥ bester Bogen des Typs × 1,09, Köcher ≥ bester Köcher × 1,10.
//  3. Mythisch ≥ Heroisch ≥ Normal in JEDEM Wert, strikt im Kernwert und in der Attributsumme (Rundungsregel Spec §5.1.3).
//  4. Jede Raid-Anforderung ist 99, `spellFocus` bleibt unter dem Deckel und über die Stufen gleich.
//  5. Keine Raid-Teile in Shops oder normalen Beutetabellen; `variantOf` zeigt auf eine existierende Basis.
//  6. Verdrahtung der RaidDef (Räume, Boss-Tabellen, Beute), Bossphasen, Sets, Erfolge und Texte (7 Sprachen).

const LOCALES = ["en", "de", "es", "fr", "pt-BR", "ru", "zh"] as const;
const SUFFIX = RAID_VARIANT_SUFFIX;
const raid = content.raids![0]!;
const items = content.items;
const isRaidId = (id: string): boolean => id.startsWith("gk_");
const raidItems = Object.values(items).filter((i) => isRaidId(i.id));
const stock = Object.values(items).filter((i) => !isRaidId(i.id) && i.type === "equipment");

const sumMods = (i: ItemDef): number => Object.values(i.modifiers ?? {}).reduce((a, b) => a + (b ?? 0), 0) + (i.primaryAttribute ?? 0);
const dps = (i: ItemDef): number => ((i.damageMin! + i.damageMax!) / 2) / (i.attackIntervalMs! / 1000);

/** Klasse eines Ausrüstungsteils für den Bestandsvergleich. */
function classOf(i: ItemDef): string {
  if (i.slot === "mainhand" && i.weaponType && i.damageMin !== undefined) return `weapon|${i.weaponType}`;
  if (i.slot === "offhand" && i.weaponType === "focus") return "focus";
  if (i.slot === "offhand" && i.weaponType === "quiver") return "quiver";
  if (i.slot === "offhand" && (i.armorRating ?? 0) > 0) return "shield";
  if (i.slot === "ring1" || i.slot === "amulet" || i.slot === "cape") return `jewel|${i.slot}`;
  if (i.armorRating !== undefined) return `${i.slot}|plate`;
  if (i.evasionRating !== undefined) return `${i.slot}|leather`;
  if (i.wardCapacity !== undefined) return `${i.slot}|cloth`;
  return `other|${i.slot}`;
}
/** Kernwert der Klasse (null = die Klasse hat keinen, dann zählt nur die Attributsumme). */
function coreOf(i: ItemDef): number | null {
  const c = classOf(i);
  if (c.startsWith("weapon|")) return dps(i);
  if (c === "shield" || c.endsWith("|plate")) return i.armorRating ?? null;
  if (c.endsWith("|leather")) return i.evasionRating ?? null;
  if (c.endsWith("|cloth")) return i.wardCapacity ?? null;
  return null;
}

const baseItems = RAID_BASE_IDS.map((id) => items[id]!);
const variants = (id: string): [ItemDef, ItemDef, ItemDef] => [items[id]!, items[`${id}_heroic`]!, items[`${id}_mythic`]!];

describe("Raid Gobkha'raz — Mengen und Aufbau", () => {
  it("31 Basisteile (15 Set-Teile + 16 Unikate), 93 Items, 15 Monster, 5 Raum-Dungeons, 3 Sets, 1 Raid", () => {
    expect(RAID_BASE_IDS.length).toBe(31);
    expect(new Set(RAID_BASE_IDS).size).toBe(31);
    expect(raidItems.length).toBe(93);
    const monsters = Object.values(content.monsters).filter((m) => isRaidId(m.id));
    expect(monsters.length).toBe(15);
    expect(content.dungeons.filter((d) => d.raidOnly).map((d) => d.id)).toEqual(["gk_room_1", "gk_room_2", "gk_room_3", "gk_room_4", "gk_room_5"]);
    expect(content.sets.filter((s) => isRaidId(s.id)).map((s) => s.id)).toEqual(["gk_fire", "gk_poison", "gk_bleed"]);
    expect(content.raids?.length).toBe(1);
    expect(raid.id).toBe("gobkharaz");
  });

  it("Rarität, Stufe XIII, Wert und variantOf je Stufe", () => {
    const rarity = { normal: "godly", heroic: "heroic", mythic: "mythic" } as const;
    const value = { normal: 30_000, heroic: 50_000, mythic: 90_000 } as const;
    for (const id of RAID_BASE_IDS) {
      for (const d of RAID_DIFFICULTIES) {
        const it = items[`${id}${SUFFIX[d]}`];
        expect(it, `${id}${SUFFIX[d]}`).toBeDefined();
        expect(it!.rarity, it!.id).toBe(rarity[d]);
        expect(it!.tier, it!.id).toBe(13);
        expect(it!.value, it!.id).toBe(value[d]);
        expect(it!.type, it!.id).toBe("equipment");
        if (d === "normal") expect(it!.variantOf, it!.id).toBeUndefined();
        else expect(it!.variantOf, it!.id).toBe(id);
      }
    }
  });

  it("variantOf zeigt immer auf eine existierende Normal-Basis (kein Verweis auf Varianten, keine Waise)", () => {
    for (const it of Object.values(items)) {
      if (!it.variantOf) continue;
      const base = items[it.variantOf];
      expect(base, `${it.id} → ${it.variantOf}`).toBeDefined();
      expect(base!.variantOf, `${it.variantOf} ist selbst eine Variante`).toBeUndefined();
      expect(RAID_BASE_IDS).toContain(it.variantOf);
    }
    // Jedes gk_-Item ist Basis oder trägt einen der beiden Suffixe.
    for (const it of raidItems) {
      const isBase = RAID_BASE_IDS.includes(it.id);
      expect(isBase || it.id.endsWith("_heroic") || it.id.endsWith("_mythic"), it.id).toBe(true);
    }
  });

  it("Runenplätze: alle drei Raritäten haben 4 (wie godly)", () => {
    // `enchantSlotsFor` lebt in der Engine; hier nur die Raritäts-Zusicherung, die der Slot-Wert voraussetzt.
    for (const it of raidItems) expect(["godly", "heroic", "mythic"]).toContain(it.rarity);
  });
});

describe("Raid Gobkha'raz — schlägt den Bestand", () => {
  it("Kernwert und Attributsumme jedes Normal-Teils liegen über dem besten Bestandsteil derselben Klasse", () => {
    const failures: string[] = [];
    for (const it of baseItems) {
      const cls = classOf(it);
      const peers = stock.filter((s) => classOf(s) === cls);
      if (peers.length === 0) continue; // Klasse ohne Bestand (z. B. Schmuck ohne Vergleich) trägt keinen Vergleich
      const core = coreOf(it);
      if (core !== null) {
        const best = Math.max(...peers.map((p) => coreOf(p) ?? 0));
        if (!(core > best)) failures.push(`${it.id}: Kernwert ${core.toFixed(2)} ≤ Bestand ${best.toFixed(2)} (${cls})`);
      }
      const bestSum = Math.max(...peers.map(sumMods));
      if (!(sumMods(it) > bestSum)) failures.push(`${it.id}: Attributsumme ${sumMods(it)} ≤ Bestand ${bestSum} (${cls})`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("Normal liegt im Spec-Band: Kernwert +5 % bis +25 % über dem Bestand (Spec §5.1: ≈ +9–12 %)", () => {
    const out: string[] = [];
    for (const it of baseItems) {
      const core = coreOf(it);
      if (core === null) continue;
      const best = Math.max(...stock.filter((s) => classOf(s) === classOf(it)).map((p) => coreOf(p) ?? 0));
      const ratio = core / best;
      if (ratio < 1.05 || ratio > 1.25) out.push(`${it.id}: ${ratio.toFixed(3)}`);
    }
    expect(out, out.join("\n")).toEqual([]);
  });

  it("Bögen: Schaden/s ≥ bester Bogen desselben Typs × 1,09 (Spec §5.1 Punkt 9, nach dem Fernkampf-Rework)", () => {
    for (const id of ["gk_pit_longbow", "gk_king_shortbow"]) {
      const bow = items[id]!;
      const best = Math.max(...stock.filter((s) => s.weaponType === bow.weaponType && s.slot === "mainhand").map(dps));
      expect(dps(bow), `${id} ${dps(bow).toFixed(3)} vs ${best.toFixed(3)} × 1,09`).toBeGreaterThanOrEqual(best * 1.09);
    }
  });

  it("Köcher: jeder Wert ≥ bester Köcher × 1,10 (Spec §5.3), Sparchance 0,25", () => {
    const quiver = items["gk_quarter_quiver"]!;
    const best = stock.filter((s) => s.weaponType === "quiver").sort((a, b) => sumMods(b) - sumMods(a))[0]!;
    expect(best.id).toBe("godiron_quiver"); // Stufe XII; zieht der Bestand nach, muss der Raid-Köcher mit nach
    for (const [k, v] of Object.entries(best.modifiers ?? {})) {
      expect(quiver.modifiers?.[k as "dex"] ?? 0, `Köcher ${k}`).toBeGreaterThanOrEqual(Math.round(v! * 1.1));
    }
    expect(quiver.bonus?.critChance ?? 0).toBeGreaterThanOrEqual(best.bonus!.critChance! * 1.1 - 1e-9);
    expect(quiver.precision ?? 0).toBeGreaterThanOrEqual(best.precision! * 1.1 - 1e-9);
    expect(quiver.weaponEffect?.type).toBe("ammoSaver");
    expect(quiver.weaponEffect!.magnitude).toBeGreaterThanOrEqual(best.weaponEffect!.magnitude * 1.1 - 1e-9);
    expect(quiver.requirements?.ranged).toBe(99);
  });
});

describe("Raid Gobkha'raz — Stufenleiter Normal ≤ Heroisch ≤ Mythisch", () => {
  const numeric = (it: ItemDef): Record<string, number> => {
    const o: Record<string, number> = {};
    const put = (k: string, v: number | undefined) => { if (v !== undefined) o[k] = v; };
    put("damageMin", it.damageMin); put("damageMax", it.damageMax);
    put("armorRating", it.armorRating); put("evasionRating", it.evasionRating); put("wardCapacity", it.wardCapacity);
    put("armorPen", it.armorPen); put("precision", it.precision); put("wardBreak", it.wardBreak);
    put("primaryAttribute", it.primaryAttribute); put("primarySkillBoost", it.primarySkillBoost);
    put("regen", it.bonus?.hpRegenPerSec); put("crit", it.bonus?.critChance);
    for (const [k, v] of Object.entries(it.modifiers ?? {})) put(`mod.${k}`, v);
    const fxs = [it.weaponEffect, ...(it.weaponEffects ?? [])].filter((e): e is NonNullable<typeof e> => !!e);
    fxs.forEach((e, i) => { put(`fx${i}.mag`, e.magnitude); if (e.type === "catalyst") put(`fx${i}.ms`, e.durationMs); });
    return o;
  };

  it("M ≥ H ≥ N in jedem Wert; Chancen, Takt, Dauern, Schwellen, Stapel, spellFocus und Block bleiben gleich", () => {
    const out: string[] = [];
    for (const id of RAID_BASE_IDS) {
      const [n, h, m] = variants(id);
      const nn = numeric(n), hh = numeric(h), mm = numeric(m);
      expect(Object.keys(hh).sort(), id).toEqual(Object.keys(nn).sort());
      expect(Object.keys(mm).sort(), id).toEqual(Object.keys(nn).sort());
      for (const k of Object.keys(nn)) {
        if (!(hh[k]! >= nn[k]! && mm[k]! >= hh[k]!)) out.push(`${id} ${k}: ${nn[k]} / ${hh[k]} / ${mm[k]}`);
      }
      for (const v of [h, m]) {
        expect(v.attackIntervalMs, `${v.id} Takt`).toBe(n.attackIntervalMs);
        expect(v.spellFocus, `${v.id} spellFocus`).toBe(n.spellFocus);
        expect(v.blockChance, `${v.id} blockChance`).toBe(n.blockChance);
        expect(v.twoHanded, `${v.id} twoHanded`).toBe(n.twoHanded);
        expect(v.slot, `${v.id} slot`).toBe(n.slot);
        expect(v.weaponType, `${v.id} weaponType`).toBe(n.weaponType);
        expect(v.requirements, `${v.id} requirements`).toEqual(n.requirements);
        const a = [n.weaponEffect, ...(n.weaponEffects ?? [])];
        const b = [v.weaponEffect, ...(v.weaponEffects ?? [])];
        expect(b.length, `${v.id} Effekte`).toBe(a.length);
        a.forEach((e, i) => {
          if (!e) return;
          const f = b[i]!;
          expect(f.type, v.id).toBe(e.type);
          expect(f.chance, `${v.id} Chance`).toBe(e.chance);
          expect(f.threshold, `${v.id} Schwelle`).toBe(e.threshold);
          expect(f.stacks, `${v.id} Stapel/n`).toBe(e.stacks);
          if (e.type !== "catalyst") expect(f.durationMs, `${v.id} Dauer`).toBe(e.durationMs);
        });
      }
    }
    expect(out, out.join("\n")).toEqual([]);
  });

  it("strikt im Kernwert (Schaden/s, Rüstung, Ausweichen, Ward) und in der Attributsumme", () => {
    const out: string[] = [];
    for (const id of RAID_BASE_IDS) {
      const [n, h, m] = variants(id);
      const cn = coreOf(n), ch = coreOf(h), cm = coreOf(m);
      if (cn !== null && !(ch! > cn && cm! > ch!)) out.push(`${id} Kernwert ${cn} / ${ch} / ${cm}`);
      const sn = sumMods(n), sh = sumMods(h), sm = sumMods(m);
      if (!(sh > sn && sm > sh)) out.push(`${id} Attributsumme ${sn} / ${sh} / ${sm}`);
      // Heroisch ≈ +6 %, Mythisch ≈ +12 % im Kernwert (Toleranz für Rundung bei kleinen Zahlen)
      if (cn !== null) {
        expect(ch! / cn, `${id} H`).toBeGreaterThan(1.0);
        expect(ch! / cn, `${id} H`).toBeLessThan(1.1);
        expect(cm! / cn, `${id} M`).toBeGreaterThan(1.07);
        expect(cm! / cn, `${id} M`).toBeLessThan(1.18);
      }
    }
    expect(out, out.join("\n")).toEqual([]);
  });

  it("Wert 30.000 / 50.000 / 90.000 und strikt wachsende Teile-Beute: Gewichte der Varianten sind gleich (gleiche Namen, gleiche Texte)", () => {
    for (const id of RAID_BASE_IDS) {
      const [n, h, m] = variants(id);
      expect(JSON.stringify(h.name)).toBe(JSON.stringify(n.name));
      expect(JSON.stringify(m.name)).toBe(JSON.stringify(n.name));
      expect(JSON.stringify(h.description)).toBe(JSON.stringify(n.description));
    }
  });
});

describe("Raid Gobkha'raz — Anforderungen und Deckel", () => {
  it("jede Raid-Anforderung ist 99 (sonst wählt der BiS-Builder das Teil schon auf CL 30/60/90)", () => {
    for (const it of raidItems) {
      const req = Object.entries(it.requirements ?? {});
      expect(req.length, `${it.id} ohne Anforderung`).toBeGreaterThan(0);
      for (const [skill, lvl] of req) expect(lvl, `${it.id} ${skill}`).toBe(99);
    }
  });

  it("Anforderung nach Klasse: Platte defence, Leder ranged, Stoff magic, Nahkampf attack, Bögen/Köcher ranged, Magie/Fokus magic, Schild defence, Schmuck vitality", () => {
    const want = (it: ItemDef): string => {
      if (it.armorRating !== undefined) return "defence";
      if (it.evasionRating !== undefined) return "ranged";
      if (it.wardCapacity !== undefined) return "magic";
      if (it.slot === "ring1" || it.slot === "amulet" || it.slot === "cape") return "vitality";
      if (it.weaponStyle === "melee") return "attack";
      if (it.weaponStyle === "ranged") return "ranged";
      if (it.weaponStyle === "magic") return "magic";
      return "?";
    };
    for (const it of raidItems) expect(Object.keys(it.requirements ?? {}), it.id).toEqual([want(it)]);
  });

  it("spellFocus unter dem Deckel (≤ 0,01) und nie über dem höchsten Bestands-Stab; nur Magie-Haupthände tragen es", () => {
    const staffMax = Math.max(...stock.filter((i) => i.weaponStyle === "magic" && i.slot === "mainhand").map((i) => i.spellFocus ?? 0));
    for (const it of raidItems) {
      if (it.weaponStyle === "magic" && it.slot === "mainhand") {
        expect(it.spellFocus, it.id).toBeGreaterThan(0);
        expect(it.spellFocus!, it.id).toBeLessThanOrEqual(0.01);
        expect(it.spellFocus!, it.id).toBeLessThanOrEqual(staffMax);
      } else {
        expect(it.spellFocus, it.id).toBeUndefined();
      }
    }
  });

  it("Block bleibt am Deckel 0,5; Waffen-Deckel (armorPen ≤ 0,6, Präzision ≤ 0,6, Ward-Bruch ≤ 0,6)", () => {
    for (const it of raidItems) {
      if (it.blockChance !== undefined) expect(it.blockChance, it.id).toBeLessThanOrEqual(0.5);
      for (const k of ["armorPen", "precision", "wardBreak"] as const) if (it[k] !== undefined) expect(it[k]!, `${it.id} ${k}`).toBeLessThanOrEqual(0.6);
    }
  });

  it("Hauptattribut/Stil-Skill nur an Ring, Amulett und Umhang", () => {
    for (const it of raidItems) {
      const jewel = it.slot === "ring1" || it.slot === "amulet" || it.slot === "cape";
      expect(it.primaryAttribute !== undefined, it.id).toBe(jewel);
      expect(it.primarySkillBoost !== undefined, it.id).toBe(jewel);
    }
  });

  it("Glut-/Glanz-Verbot auf Ausrüstung: keine Leucht-Wörter in Namen und Beschreibungen (en/de)", () => {
    const bad = /glow|glimmer|shimmer|gleam|shine|radian|luminous|glüh|leucht|schimmer|glimm|glanz|strahl/i;
    for (const it of raidItems) {
      for (const v of [it.name, it.description] as Array<LocalizedString | undefined>) {
        if (!v || typeof v === "string") continue;
        expect(v.en, it.id).not.toMatch(bad);
        expect(v.de ?? "", it.id).not.toMatch(bad);
      }
    }
  });
});

describe("Raid Gobkha'raz — keine Raid-Teile außerhalb des Raids", () => {
  it("kein gk_-Item in Shop, Slayer-/Marken-Shop, Aktionen, Monster-Beute, normalen Dungeons, Quests, Elites, Paragon", () => {
    const found = new Set<string>();
    const scan = (label: string, data: unknown) => {
      const s = JSON.stringify(data);
      for (const id of raidItems.map((i) => i.id)) if (s.includes(`"${id}"`)) found.add(`${label}: ${id}`);
    };
    scan("shop", content.shop);
    scan("slayerShop", content.slayerShop);
    scan("tokenShop", content.tokenShop);
    scan("actions", content.actions);
    scan("monsters", Object.values(content.monsters).filter((m) => !isRaidId(m.id)));
    scan("raid-monster-loot", Object.values(content.monsters).filter((m) => isRaidId(m.id)).map((m) => m.loot));
    scan("dungeons", content.dungeons.filter((d) => !d.raidOnly));
    scan("raid-dungeons", content.dungeons.filter((d) => d.raidOnly).map((d) => [d.loot, d.chest]));
    scan("quests", content.quests);
    scan("elites", content.elites);
    scan("paragon", content.paragon);
    scan("pets", content.pets);
    expect([...found], [...found].join("\n")).toEqual([]);
  });

  it("jedes der 31 Basisteile steht in genau einer Boss-Tabelle (Set-Teile Gewicht 3, Unikate Gewicht 2), Varianten nie", () => {
    const seen = new Map<string, number>();
    for (const room of raid.rooms) for (const e of room.table.entries) seen.set(e.itemId, (seen.get(e.itemId) ?? 0) + 1);
    expect([...seen.keys()].sort()).toEqual([...RAID_BASE_IDS].sort());
    for (const n of seen.values()) expect(n).toBe(1);
    for (const room of raid.rooms) {
      for (const e of room.table.entries) {
        const isSetPiece = /^gk_(fire|poison|bleed)_/.test(e.itemId);
        expect(e.weight, e.itemId).toBe(isSetPiece ? 3 : 2);
        expect(items[e.itemId], e.itemId).toBeDefined();
      }
    }
  });
});

describe("Raid Gobkha'raz — RaidDef, Räume, Monster, Phasen, Sets", () => {
  it("Gebühren, Neustart, Rückerstattung, Skalierung, verstärkte Welle, Beute-Parameter laut Spec", () => {
    expect(raid.unlockDungeonId).toBe("behind_the_throne");
    expect(content.dungeons.some((d) => d.id === raid.unlockDungeonId)).toBe(true);
    expect(raid.fees).toEqual({ normal: 300_000, heroic: 900_000, mythic: 2_500_000 });
    expect(raid.heroicRestartCost).toBe(100_000);
    expect(raid.mythicRefundPct).toBe(0.25);
    expect(raid.scaling.normal).toEqual({ hpMult: 1, damageMult: 1, levelAdd: 0, defenseMult: 1 });
    expect(raid.scaling.heroic).toEqual({ hpMult: 2.0, damageMult: 1.6, levelAdd: 10, defenseMult: 1.1 });
    expect(raid.scaling.mythic).toEqual({ hpMult: 2.4, damageMult: 1.7, levelAdd: 20, defenseMult: 1.2 }); // claude:2026-10-25T16:45:00+02:00 — Nachmessung §13 V2
    expect(raid.reinforcedWave).toEqual({ index: 3, hpMult: 1.5, damageMult: 1.15 });
    expect(raid.trashPieceChance).toEqual({ normal: 0.004, heroic: 0.005, mythic: 0.006 });
    expect(raid.suffixChance).toEqual({ normal: 0.3, heroic: 0.4, mythic: 0.5 });
    expect(raid.maxAutoRestarts).toBe(3);
    expect(raid.weeklyChest.dust).toEqual({ normal: 15, heroic: 25, mythic: 40 });
    expect(raid.weeklyChest.extraItems).toEqual([{ itemId: "godiron_bar", qty: 5 }]);
    const sideDust = raid.bossSideLoot.find((r) => r.itemId === "relic_dust")!;
    expect(sideDust.qty).toEqual({ normal: [6, 6], heroic: [10, 10], mythic: [15, 15] });
  });

  it("Beute-Zeilen verweisen auf existierende Items mit gültigen Chancen und Mengen", () => {
    const rows = [...raid.trashLoot, ...raid.bossSideLoot];
    for (const r of rows) {
      expect(items[r.itemId], r.itemId).toBeDefined();
      expect(r.chance).toBeGreaterThan(0);
      expect(r.chance).toBeLessThanOrEqual(1);
      for (const d of RAID_DIFFICULTIES) {
        const [lo, hi] = r.qty[d];
        expect(lo).toBeGreaterThanOrEqual(1);
        expect(hi).toBeGreaterThanOrEqual(lo);
      }
    }
    for (const x of raid.weeklyChest.extraItems) expect(items[x.itemId]).toBeDefined();
    // Kein Gold in der Raid-Beute (Goldsink bleibt Goldsink)
    for (const r of rows) expect(r.itemId).not.toBe("gold");
  });

  it("5 Räume: Dungeon raidOnly mit leerer Truhe (nur Atempause), Wellenfolge 1-2-1-2-Boss, Boss = letzte Begegnung, Tabellen 15/15/15/15/17", () => {
    const wave = [
      ["gk_toll_thug", "gk_gate_pikeman", "gk_tallymistress"],
      ["gk_armory_breaker", "gk_ballista_gunner", "gk_quartermaster"],
      ["gk_pit_hound", "gk_beastkeeper", "gk_pitmother"],
      ["gk_fel_acolyte", "gk_ember_warden", "gk_felmagus"],
      ["gk_crownguard", "gk_bannerman", "gk_warking"],
    ];
    const weights = [15, 15, 15, 15, 17];
    expect(raid.rooms.length).toBe(5);
    raid.rooms.forEach((room, i) => {
      const d = content.dungeons.find((x) => x.id === room.dungeonId)!;
      expect(d, room.id).toBeDefined();
      expect(d.raidOnly).toBe(true);
      expect(d.chest).toEqual({ loot: [] }); // claude:2026-10-25T05:25:00+02:00 — 8-s-Atempause vor dem Boss, keine Beute
      expect(d.encounters).toEqual([wave[i]![0], wave[i]![1], wave[i]![0], wave[i]![1], wave[i]![2]]);
      expect(room.bossId).toBe(wave[i]![2]);
      expect(d.encounters.at(-1)).toBe(room.bossId);
      expect(room.table.draws).toBe(i === 4 ? 2 : 1);
      expect(room.table.extraChance).toBe(0.15);
      expect(room.table.entries.reduce((a, e) => a + e.weight, 0)).toBe(weights[i]);
      for (const l of LOCALES) expect((room.name as Record<string, string>)[l], `${room.id} ${l}`).toBeTruthy();
      for (const l of LOCALES) expect((room.intro as Record<string, string>)[l], `${room.id} intro ${l}`).toBeTruthy();
    });
    // Raum-Set-Slot je Boss: Hände, Schuhe, Hose, Kopf, Brust, je für alle drei Stile
    const slots = ["hands", "feet", "legs", "head", "chest"];
    raid.rooms.forEach((room, i) => {
      const ids = room.table.entries.filter((e) => e.weight === 3).map((e) => e.itemId);
      expect(ids.sort()).toEqual([`gk_bleed_${slots[i]}`, `gk_fire_${slots[i]}`, `gk_poison_${slots[i]}`].sort());
    });
  });

  it("15 Monster: dungeonOnly, kein Gold, eine Zone, Bosse ohne enrage mit Phasen, Wellen-Gegner ohne Phasen", () => {
    const bosses = new Set(raid.rooms.map((r) => r.bossId));
    const monsters = Object.values(content.monsters).filter((m) => isRaidId(m.id));
    const zoneIds = new Set(content.zones.map((z) => z.id));
    for (const m of monsters) {
      expect(m.dungeonOnly, m.id).toBe(true);
      expect(m.gold, m.id).toBe(0);
      expect(zoneIds.has(m.zone!), `${m.id} Zone`).toBe(true);
      expect(m.xp, m.id).toBeGreaterThan(0);
      for (const l of LOCALES) expect((m.name as Record<string, string>)[l], `${m.id} ${l}`).toBeTruthy();
      if (bosses.has(m.id)) {
        expect(m.enrage, m.id).toBeUndefined();
        expect(m.phases?.length, m.id).toBeGreaterThanOrEqual(3);
      } else {
        expect(m.phases, m.id).toBeUndefined();
      }
    }
    // Jeder Gegner kommt in einem Raum vor.
    const used = new Set(content.dungeons.filter((d) => d.raidOnly).flatMap((d) => d.encounters));
    expect([...used].sort()).toEqual(monsters.map((m) => m.id).sort());
  });

  it("Spec-Pins §2.2: Stufe, HP, Schaden, Takt, Rüstung der 15 Monster", () => {
    const pins: Record<string, [number, number, number, number, number]> = {
      gk_toll_thug: [305, 2050, 205, 3400, 150],
      gk_gate_pikeman: [308, 1800, 160, 2800, 180],
      gk_tallymistress: [318, 10450, 270, 3400, 165],
      gk_armory_breaker: [310, 2300, 215, 3600, 210],
      gk_ballista_gunner: [312, 1700, 170, 3000, 130],
      gk_quartermaster: [322, 11600, 280, 3600, 185],
      gk_pit_hound: [314, 1600, 125, 2100, 115],
      gk_beastkeeper: [316, 2200, 180, 3200, 160],
      gk_pitmother: [326, 12200, 285, 3400, 170],
      gk_fel_acolyte: [318, 850, 175, 3000, 125],
      gk_ember_warden: [320, 2500, 190, 3400, 195],
      gk_felmagus: [330, 9300, 290, 3200, 150],
      gk_crownguard: [322, 3050, 215, 3400, 220],
      gk_bannerman: [320, 2300, 185, 3000, 170],
      gk_warking: [340, 18050, 310, 3400, 190],
    };
    for (const [id, [lvl, hp, dmg, iv, def]] of Object.entries(pins)) {
      const m = content.monsters[id]!;
      // claude:2026-10-25T23:35:00+02:00 — HP der Spec-Tabelle × RAID_HP_SCALE (Chef: Raid-Dauer halbiert).
      expect([m.level, m.maxHp, m.damage, m.attackIntervalMs, m.defense], id).toEqual([lvl, Math.round(hp * RAID_HP_SCALE), Math.round(dmg * RAID_DAMAGE_SCALE), iv, def]);
    }
    expect(RAID_HP_SCALE).toBe(0.5);
    expect(RAID_DAMAGE_SCALE).toBe(1.3); // claude:2026-10-26T00:30:00+02:00 — Ausgleich zur halben Dauer (Messreihe ×1,3/×1,5)
    expect(content.monsters.gk_fel_acolyte!.wardCapacity).toBe(Math.round(1300 * RAID_HP_SCALE));
    expect(content.monsters.gk_felmagus!.wardCapacity).toBe(Math.round(3050 * RAID_HP_SCALE));
    expect(content.monsters.gk_fel_acolyte!.defenseType).toBe("ward");
    expect(content.monsters.gk_felmagus!.defenseType).toBe("ward");
  });

  it("Bossphasen §3: Schwellen fallend, eigene logKeys, Texte in 7 Sprachen, Rakkzul hat vier (75/50/25/10)", () => {
    const keys = new Set<string>();
    for (const room of raid.rooms) {
      const phases = content.monsters[room.bossId]!.phases!;
      const th = phases.map((p) => p.atHpPct);
      expect([...th].sort((a, b) => b - a)).toEqual(th);
      for (const p of phases) {
        expect(p.atHpPct).toBeGreaterThan(0);
        expect(p.atHpPct).toBeLessThan(1);
        expect(keys.has(p.logKey), p.logKey).toBe(false);
        keys.add(p.logKey);
        for (const l of LOCALES) {
          expect((p.name as Record<string, string>)[l], `${p.logKey} name ${l}`).toBeTruthy();
          expect((p.announce as Record<string, string>)[l], `${p.logKey} announce ${l}`).toBeTruthy();
        }
      }
    }
    expect(content.monsters.gk_warking!.phases!.map((p) => p.atHpPct)).toEqual([0.75, 0.5, 0.25, 0.1]);
    for (const id of ["gk_tallymistress", "gk_quartermaster", "gk_pitmother", "gk_felmagus"]) {
      expect(content.monsters[id]!.phases!.map((p) => p.atHpPct), id).toEqual([0.75, 0.5, 0.25]);
    }
    // Eckwerte (Spec §3.1 bis §3.5)
    const vr = content.monsters.gk_tallymistress!.phases!;
    expect(vr[0]!.wardShieldPct).toBe(0.12);
    expect(vr[1]!.intervalRamp).toEqual({ everyMs: 10_000, mult: 0.94, maxStacks: 5 });
    expect(vr[2]).toMatchObject({ attackIntervalMult: 0.8, damageMult: 1.3 });
    const kr = content.monsters.gk_quartermaster!.phases!;
    expect([kr[0]!.defense, kr[1]!.defense, kr[2]!.defense]).toEqual([290, 290, 80]);
    expect(kr[1]!.everyNth).toEqual({ n: 4, mult: 3 });
    const us = content.monsters.gk_pitmother!.phases!;
    expect(us[2]!.healPerHitPct).toBe(0.0015);
    expect(us[1]).toMatchObject({ attackIntervalMult: 0.5, damageMult: 0.55 }); // claude:2026-10-25T16:45:00+02:00 — §13 V3
    const zg = content.monsters.gk_felmagus!.phases!;
    expect(zg[0]!.wardShieldPct).toBe(0.2);
    expect(zg[1]!.resist).toEqual(["burn"]);
    expect(zg[2]!.damageMult).toBe(1.25);
  });

  it("3 Sets: Teile = Normal-IDs, minPieces 2, Stufen 2/4/5 mit Attributen §6.2 und Effekten §6.1", () => {
    const byId = (id: string) => content.sets.find((s) => s.id === id)!;
    for (const [id, attr, boost, theme] of [
      ["gk_fire", "int", "magic", "fire"], ["gk_poison", "dex", "ranged", "poison"], ["gk_bleed", "str", "power", "bleed"],
    ] as const) {
      const s = byId(id);
      expect(s.pieces.length).toBe(5);
      for (const p of s.pieces) {
        expect(RAID_BASE_IDS).toContain(p);
        expect(items[p]!.rarity).toBe("godly");
      }
      expect(s.minPieces).toBe(2);
      expect(s.bonus).toEqual({});
      expect(s.tiers!.map((t) => t.pieces)).toEqual([2, 4, 5]);
      expect(s.tiers![0]!.modifiers).toEqual({ [attr]: 6, con: 6 });
      expect(s.tiers![1]!.modifiers).toEqual({ [attr]: 6, con: 6, lck: 4 });
      expect(s.tiers![2]!.modifiers).toEqual({ [attr]: 6, con: 6, lck: 4 });
      expect(s.tiers![2]!.skillBoost).toEqual({ [boost]: 6 });
      expect(s.tiers!.every((t) => (t.effects?.length ?? 0) > 0), theme).toBe(true);
      for (const l of LOCALES) expect((s.name as Record<string, string>)[l], `${id} ${l}`).toBeTruthy();
    }
    const k = (id: string, t: number) => byId(id).tiers![t]!.effects!;
    expect(k("gk_fire", 0)).toEqual([{ kind: "burnDamagePct", value: 0.2 }, { kind: "burnDurationMs", value: 2000 }]);
    expect(k("gk_fire", 1)).toEqual([{ kind: "fireInterest", perStack: 0.015, maxStacks: 8 }]);
    expect(k("gk_fire", 2)).toEqual([{ kind: "fireCollection", every: 5, value: 0.2, perStack: 0.02, wardPct: 1 }]);
    expect(k("gk_poison", 0)).toEqual([{ kind: "poisonDamagePct", value: 0.2 }]);
    expect(k("gk_poison", 1)).toEqual([{ kind: "creepingPlague", maxStacks: 7, perStack: 0.01 }]);
    expect(k("gk_poison", 2)).toEqual([{ kind: "outbreak", value: 1, cooldownMs: 8000 }]);
    expect(k("gk_bleed", 0)).toEqual([{ kind: "bleedDamagePct", value: 0.2 }]);
    expect(k("gk_bleed", 1)).toEqual([{ kind: "openWounds", maxStacks: 3, value: 0.15, perStack: 0.03 }]);
    expect(k("gk_bleed", 2)).toEqual([{ kind: "bloodToll", value: 1.25, healPct: 0.2, cooldownMs: 8000 }]);
  });

  it("Set-Teile gehören zu ihrem Stil: Bleed=Platte, Poison=Leder, Fire=Stoff, je fünf Slots", () => {
    const slots = ["helmet", "body", "legs", "gloves", "boots"];
    for (const [id, key] of [["gk_bleed", "armorRating"], ["gk_poison", "evasionRating"], ["gk_fire", "wardCapacity"]] as const) {
      const s = content.sets.find((x) => x.id === id)!;
      expect(s.pieces.map((p) => items[p]!.slot)).toEqual(slots);
      for (const p of s.pieces) for (const d of RAID_DIFFICULTIES) expect(items[`${p}${SUFFIX[d as RaidDifficulty]}`]![key], `${p} ${key}`).toBeGreaterThan(0);
    }
  });
});

describe("Raid Gobkha'raz — Erfolge und Texte", () => {
  it("22 interne Erfolge: je Boss und Stufe, Abschluss je Stufe, alle Mythisch-Unikate (16), je Set komplett; keine Steam-Auslöser", () => {
    const ach = content.achievements.filter((a) => a.id.startsWith("ach_raid_"));
    expect(ach.length).toBe(22); // claude:2026-10-25T05:25:00+02:00 — + 3 Set-komplett-Erfolge (R10)
    expect(new Set(ach.map((a) => a.id)).size).toBe(22);
    for (const st of ["gk_fire", "gk_poison", "gk_bleed"]) expect(ach.some((a) => a.condition.type === "sets_completed" && a.condition.target === st), st).toBe(true);
    const kills = ach.filter((a) => a.condition.type === "raid_boss_kills");
    expect(kills.length).toBe(15);
    for (const b of raid.rooms.map((r) => r.bossId)) for (const d of RAID_DIFFICULTIES) {
      expect(kills.some((a) => a.condition.target === `${b}:${d}` && a.condition.count === 1), `${b}:${d}`).toBe(true);
    }
    for (const d of RAID_DIFFICULTIES) expect(ach.some((a) => a.condition.type === "raid_clears" && a.condition.target === d)).toBe(true);
    expect(ach.find((a) => a.condition.type === "raid_mythic_uniques")!.condition.count).toBe(16);
    expect(ach.filter((a) => a.hidden).length).toBe(0);
  });

  it("Texte: Namen aller Raid-Items, -Monster, -Dungeons, -Sets und alle Beschreibungen in 7 Sprachen, höchstens ein Gedankenstrich je Text", () => {
    const dashes = (s: string) => (s.match(/[—–]/g) ?? []).length;
    const check = (label: string, v: LocalizedString | undefined) => {
      expect(v, label).toBeDefined();
      for (const l of LOCALES) {
        const t = typeof v === "string" ? (l === "en" ? v : undefined) : v![l];
        expect(typeof t === "string" && t.length > 0, `${label} → ${l}`).toBe(true);
        expect(dashes(t!), `${label} → ${l}: ${t}`).toBeLessThanOrEqual(1);
      }
    };
    for (const it of raidItems) { check(`${it.id}:name`, it.name); check(`${it.id}:description`, it.description); }
    for (const m of Object.values(content.monsters).filter((x) => isRaidId(x.id))) check(`${m.id}:name`, m.name);
    for (const d of content.dungeons.filter((x) => x.raidOnly)) check(`${d.id}:name`, d.name);
    for (const s of content.sets.filter((x) => isRaidId(x.id))) check(`${s.id}:name`, s.name);
    check("raid:name", raid.name);
    for (const a of content.achievements.filter((x) => x.id.startsWith("ach_raid_"))) { check(`${a.id}:name`, a.name); check(`${a.id}:description`, a.description); }
  });

  // claude:2026-10-25T12:20:00+02:00 — Spaltenverschiebung aus der Lore-Tabelle (EN trug den DE-Namen, DE die Raumnummer oder den Bossnamen).
  it("Namen: EN ist nicht deutsch, DE ist weder Zahl noch nackter Bossname, EN und DE unterscheiden sich", () => {
    const bossShort = new Set(["Vrikka", "Krogg", "Ushka", "Zil'gath", "Rakkzul"]);
    const named = [
      ...raidItems.map((i) => [i.id, i.name] as const),
      ...Object.values(content.monsters).filter((m) => isRaidId(m.id)).map((m) => [m.id, m.name] as const),
    ];
    for (const [id, n] of named) {
      const en = typeof n === "string" ? n : n.en;
      const de = typeof n === "string" ? "" : n.de ?? "";
      expect(/[äöüÄÖÜß]/.test(en), `${id} EN „${en}“`).toBe(false);
      expect(/^\d+$/.test(de) || bossShort.has(de), `${id} DE „${de}“`).toBe(false);
      expect(en === de, `${id}: EN == DE „${en}“`).toBe(false);
    }
  });
});

// claude:2026-10-25T23:35:00+02:00 — Chef-Entscheid: Bosse lassen nur mit Chance Raid-Teile fallen (35 %, Endboss 50 %).
describe("Raid Gobkha'raz — Boss-Beute als Chance", () => {
  it("Räume 1–4: 35 %, Endboss: 50 %", () => {
    expect(raid.rooms.map((r) => r.table.pieceChance)).toEqual([0.35, 0.35, 0.35, 0.35, 0.5]);
  });
});
