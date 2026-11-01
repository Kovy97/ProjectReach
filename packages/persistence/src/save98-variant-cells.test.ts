import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, InventoryState, ItemInstance } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { createGame, legacyVariantCellLayout, pureVariantBases, syncVariantCells, usedCapacityUnits } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * claude:2026-10-25T18:07:00+01:00 — Save-Vertrag SAVE 98 (1.4.1, Chef-Report 25.10.2026 „Items verschieben sich nach Restart von
 * selbst“): `inventory.variantCells` (Basis-Item → Fachindex) für reine Variantengruppen. Alt-Saves < 98 werden so vorbelegt, wie der
 * alte Client die Zellen zeichnete (`legacyVariantCellLayout`); Sanitizing bei jedem Laden; der Lade-Trim auf Kapazität führt
 * Reservierungen mit; Round-Trip ist ein Fixpunkt; kaputte Einträge kosten nie Bestand.
 */
const AT = 1_762_100_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function asVersion(s: GameState, v: number, strip: (st: Record<string, unknown>) => void = () => {}): string {
  const parsed = JSON.parse(serialize(s, AT)) as SaveShape;
  parsed.version = v;
  parsed.state.version = v;
  strip(parsed.state as unknown as Record<string, unknown>);
  return JSON.stringify(parsed);
}
const ohneZellen = (st: Record<string, unknown>): void => {
  delete (st.inventory as Partial<InventoryState>).variantCells;
};
function load(json: string): GameState {
  const r = deserialize(json, content, AT);
  expect(r).not.toBeNull();
  return r!.state;
}
function fixpoint(s: GameState): void {
  const once = serialize(load(serialize(s, AT)), AT);
  expect(serialize(load(once), AT)).toBe(once);
}

const NICHT_AUSRUESTUNG = Object.values(content.items)
  .filter((it) => it.type !== "equipment" && it.id !== "paragon_key" && it.type !== "tool")
  .map((it) => it.id);
const AUSRUESTUNG = Object.values(content.items)
  .filter((it) => it.type === "equipment" && it.slot === "mainhand")
  .map((it) => it.id);

let seq = 0;
const variante = (baseItemId: string): ItemInstance => ({
  instanceId: `s98-${++seq}`,
  baseItemId,
  affixes: [],
  suffix: { suffixId: "of_the_bear", ilvl: 20, roll: 0.5 },
});

/** Spielstand mit Inventar nach Belegungsmuster (Fachindizes) und `gruppen` reinen Variantengruppen. Spiel ruht. */
function stand(belegt: number[], gruppen: number, opts: { cap?: number } = {}): { s: GameState; basen: string[] } {
  const s = createGame({ name: "V" }, content, 98);
  s.settings.materialsToStorage = false;
  const cap = opts.cap ?? s.inventory.slots.length;
  s.inventory.baseCapacity = cap;
  s.inventory.slots = new Array(cap).fill(null);
  belegt.forEach((fach, k) => {
    s.inventory.slots[fach] = { itemId: NICHT_AUSRUESTUNG[k]!, qty: 2 };
  });
  const basen = AUSRUESTUNG.filter((id) => !Object.values(s.character.equipment).includes(id)).slice(0, gruppen);
  s.inventory.instances = basen.map(variante);
  s.inventory.variantCells = {};
  return { s, basen };
}

describe("SAVE 98: Migration < 98", () => {
  it("SAVE_VERSION ist mindestens 98", () => { // claude:2026-10-30T19:01:00+01:00 — SAVE 99 (1.4.2) liegt darüber, die Migration < 98 bleibt gültig
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(98);
  });

  it("Alt-Save v97: Zellen stehen genau dort, wo der alte Client sie zeichnete (hinter dem letzten belegten Fach)", () => {
    const { s, basen } = stand([0, 1, 2, 3, 4, 5, 8, 9], 2);
    const geladen = load(asVersion(s, 97, ohneZellen));
    expect(geladen.version).toBe(SAVE_VERSION);
    expect(geladen.inventory.variantCells).toEqual({ [basen[0]!]: 10, [basen[1]!]: 11 });
    fixpoint(geladen);
  });

  it("Alt-Save v97, hinten kein Platz: die LETZTEN freien Fächer davor (alte Regel, nicht die neue)", () => {
    const belegt = [0, 1, 2, 3, 4, ...Array.from({ length: 12 }, (_, k) => 8 + k)];
    const { s, basen } = stand(belegt, 2);
    expect(s.inventory.slots.length).toBe(20);
    const json = asVersion(s, 97, ohneZellen);
    const roh = (JSON.parse(json) as SaveShape).state.inventory;
    expect(legacyVariantCellLayout(roh)).toEqual({ [basen[0]!]: 6, [basen[1]!]: 7 });
    const geladen = load(json);
    expect(geladen.inventory.variantCells).toEqual({ [basen[0]!]: 6, [basen[1]!]: 7 });
    fixpoint(geladen);
  });

  it("Alt-Save v97 übervoll: Gruppen ohne Fach bleiben fachlos, kein Bestand geht verloren", () => {
    const { s, basen } = stand(Array.from({ length: 20 }, (_, k) => k), 2);
    const geladen = load(asVersion(s, 97, ohneZellen));
    expect(geladen.inventory.variantCells).toEqual({});
    expect(pureVariantBases(geladen.inventory)).toEqual(basen);
    expect(geladen.inventory.instances).toHaveLength(2);
    expect(geladen.inventory.slots.filter(Boolean)).toHaveLength(20);
    expect(usedCapacityUnits(geladen.inventory)).toBe(22);
  });

  it("ein v97-Stand mit (unmöglichem) Feld wird trotzdem nach alter Regel vorbelegt", () => {
    const { s, basen } = stand([0, 1, 2], 1);
    const json = asVersion(s, 97, (st) => {
      (st.inventory as InventoryState).variantCells = { [basen[0]!]: 15 };
    });
    expect(load(json).inventory.variantCells).toEqual({ [basen[0]!]: 3 });
  });

  it("Vault-Fixtures: jedes lädt, jede Reservierung ist gültig, Fixpunkt", () => {
    const dir = join(__dirname, "..", "fixtures", "save-compat");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const raw = readFileSync(join(dir, f), "utf8");
      const parsed = JSON.parse(raw) as SaveShape;
      const s = deserialize(raw, content, parsed.savedAt)!.state;
      const inv = s.inventory;
      expect(inv.variantCells, f).toBeTypeOf("object");
      const pure = new Set(pureVariantBases(inv));
      const faecher = Object.entries(inv.variantCells);
      for (const [id, idx] of faecher) {
        expect(pure.has(id), `${f} ${id}`).toBe(true);
        expect(inv.slots[idx], `${f} ${id}`).toBeNull();
      }
      expect(new Set(faecher.map(([, i]) => i)).size).toBe(faecher.length);
      const once = serialize(s, parsed.savedAt);
      const again = serialize(deserialize(once, content, parsed.savedAt)!.state, parsed.savedAt);
      expect(again, f).toBe(once);
    }
  });
});

describe("SAVE 98: Laden eines v98-Stands", () => {
  it("gespeicherte Lage bleibt exakt erhalten (auch wenn die Vergabe-Regel woanders hinsetzen würde)", () => {
    const { s, basen } = stand([0, 1, 2, 3, 4, 5, 6, 8], 2);
    s.inventory.variantCells = { [basen[0]!]: 15, [basen[1]!]: 10 };
    const geladen = load(serialize(s, AT));
    expect(geladen.inventory.variantCells).toEqual({ [basen[0]!]: 15, [basen[1]!]: 10 });
    expect(geladen.inventory.slots[9]).toBeNull(); // die Lücke hinter dem letzten Item bleibt leer
    fixpoint(geladen);
  });

  it("Neustart = Laden mit Offline-Zeit: Zellen bleiben, Beute legt sich daneben", () => {
    const { s, basen } = stand([0, 1, 2], 2);
    syncVariantCells(s.inventory);
    const vorher = { ...s.inventory.variantCells };
    const r = deserialize(serialize(s, AT), content, AT + 3_600_000)!;
    expect(r.state.inventory.variantCells).toEqual(vorher);
    expect(Object.keys(vorher)).toEqual(basen);
  });

  it("kaputte Einträge (fuzz-artig): nie Verlust, nur gültige Reservierungen, Fixpunkt", () => {
    let x = 98;
    const zufall = (n: number): number => {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x % n;
    };
    const muellWerte: unknown[] = [-1, 1.5, "3", null, true, 1e9, Number.NaN, {}, [2]];
    for (let runde = 0; runde < 60; runde++) {
      const belegt = Array.from({ length: 20 }, (_, k) => k).filter(() => zufall(2) === 0);
      const { s, basen } = stand(belegt, 1 + zufall(4));
      const instanzen = s.inventory.instances.length;
      const json = asVersion(s, 98, (st) => {
        const inv = st.inventory as InventoryState;
        const cells: Record<string, unknown> = {};
        for (const b of basen) {
          const art = zufall(4);
          cells[b] = art === 0 ? zufall(25) : art === 1 ? belegt[0] ?? 0 : art === 2 ? muellWerte[zufall(muellWerte.length)] : 5;
        }
        cells.unknown_item_xyz = 3; // unbekannte ID
        cells[NICHT_AUSRUESTUNG[0]!] = 7; // bekannt, aber keine reine Gruppe
        (inv as unknown as Record<string, unknown>).variantCells = zufall(10) === 0 ? [1, 2] : cells;
      });
      const g = load(json);
      const inv = g.inventory;
      expect(inv.instances).toHaveLength(instanzen);
      expect(inv.slots.filter(Boolean)).toHaveLength(belegt.length);
      const pure = new Set(pureVariantBases(inv));
      const faecher = Object.entries(inv.variantCells);
      for (const [id, idx] of faecher) {
        expect(pure.has(id)).toBe(true);
        expect(Number.isInteger(idx)).toBe(true);
        expect(inv.slots[idx]).toBeNull();
      }
      expect(new Set(faecher.map(([, i]) => i)).size).toBe(faecher.length);
      // Jede reine Gruppe hat ein Fach, solange Platz ist.
      const frei = inv.slots.filter((sl) => !sl).length;
      expect(faecher.length).toBe(Math.min(pure.size, frei));
      fixpoint(g);
    }
  });

  it("__proto__-Schlüssel wird ignoriert", () => {
    const { s, basen } = stand([0], 1);
    const json = serialize(s, AT).replace('"variantCells":{}', `"variantCells":{"__proto__":4,"${basen[0]}":6}`);
    const g = load(json);
    expect(Object.getPrototypeOf(g.inventory.variantCells)).toBe(Object.prototype);
    expect(g.inventory.variantCells).toEqual({ [basen[0]!]: 6 });
  });

  it("Instanz ohne Modifikation zerfällt beim Laden zum Lagerstapel: ihre Reservierung fällt weg", () => {
    const { s, basen } = stand([0, 1], 2);
    s.inventory.instances[0] = { instanceId: "nackt", baseItemId: basen[0]!, affixes: [] };
    s.inventory.variantCells = { [basen[0]!]: 2, [basen[1]!]: 3 };
    const g = load(serialize(s, AT));
    expect(g.inventory.variantCells).toEqual({ [basen[1]!]: 3 });
    expect(g.bank[basen[0]!]).toBeGreaterThanOrEqual(1);
  });

  it("Lade-Trim auf Kapazität (Array länger als Kapazität) führt Reservierungen mit", () => {
    const { s, basen } = stand([], 2, { cap: 30 });
    // 12 Stapel verstreut über 30 Fächer, zwei Zellen dazwischen; Kapazität danach 20 → Kompaktierung.
    const plaetze = [0, 3, 5, 7, 9, 12, 14, 18, 21, 24, 26, 29];
    s.inventory.slots = new Array(30).fill(null);
    plaetze.forEach((f, k) => (s.inventory.slots[f] = { itemId: NICHT_AUSRUESTUNG[k]!, qty: 1 }));
    s.inventory.variantCells = { [basen[0]!]: 10, [basen[1]!]: 25 };
    s.inventory.baseCapacity = 20;
    const g = load(serialize(s, AT));
    const inv = g.inventory;
    expect(inv.slots).toHaveLength(20);
    // Reihenfolge erhalten: 0,3,5,7,9 | Zelle(10) | 12,14,18,21,24 | Zelle(25) | 26,29
    const zellen = new Map(Object.entries(inv.variantCells).map(([id, i]) => [i, id] as const));
    const folge = inv.slots.map((sl, i) => (sl ? sl.itemId : zellen.get(i) ?? null));
    expect(folge.slice(0, 14)).toEqual([
      ...NICHT_AUSRUESTUNG.slice(0, 5),
      basen[0],
      ...NICHT_AUSRUESTUNG.slice(5, 10),
      basen[1],
      ...NICHT_AUSRUESTUNG.slice(10, 12),
    ]);
    expect(folge.slice(14).every((v) => v === null)).toBe(true);
    fixpoint(g);
  });

  it("Lade-Trim übervoll: Stapel haben Vorrang, überzählige Zellen werden fachlos (nichts geht verloren)", () => {
    const { s, basen } = stand([], 2, { cap: 24 });
    s.inventory.slots = new Array(24).fill(null);
    for (let k = 0; k < 21; k++) s.inventory.slots[k] = { itemId: NICHT_AUSRUESTUNG[k]!, qty: 1 };
    s.inventory.variantCells = { [basen[0]!]: 22, [basen[1]!]: 23 };
    s.inventory.baseCapacity = 20;
    const g = load(serialize(s, AT));
    expect(g.inventory.slots).toHaveLength(21);
    expect(g.inventory.slots.every(Boolean)).toBe(true);
    expect(g.inventory.variantCells).toEqual({});
    expect(g.inventory.instances).toHaveLength(2);
    fixpoint(g);
  });
});
