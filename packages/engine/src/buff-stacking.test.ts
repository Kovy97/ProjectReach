import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { addItem } from "./inventory";
import { BUFF_STACK_CAP_MS, buffChargeInfo, useConsumable, useConsumableMany } from "./consumable";

/**
 * Aufladen von Dauer-Tonika (Chef 27.08.2026, Spieler-Feedback): dasselbe Tonikum ADDIERT seine Dauer auf die
 * Restzeit statt sie zurückzusetzen; mehrere Stücke auf einmal trinken (qty) ergibt qty × Dauer, gedeckelt bei
 * BUFF_STACK_CAP_MS. Heiltränke bleiben Einzelschlucke. Ein anderes Item derselben Kategorie verdrängt weiterhin.
 */
const TONIC = "tonic_forager_i"; // utility, 300 000 ms, gatherXpMult 1.10
const TONIC2 = "tonic_forager_ii";
const DUR = content.items[TONIC]!.buff!.durationMs;

function fresh() {
  const s = createGame({ name: "Buff" }, content, 3);
  addItem(s.inventory, content, TONIC, 20);
  return s;
}
const remaining = (s: ReturnType<typeof fresh>, id = TONIC) => s.character.buffs.find((b) => b.itemId === id)?.remainingMs ?? 0;
const count = (s: ReturnType<typeof fresh>, id = TONIC) => s.inventory.slots.reduce((n, sl) => n + (sl?.itemId === id ? sl.qty : 0), 0);

describe("Dauer-Tonika laden sich auf", () => {
  it("zweites Trinken desselben Tonikums addiert die Dauer statt sie zu ersetzen", () => {
    const s = fresh();
    expect(useConsumable(s, content, TONIC)).toBe(true);
    s.character.buffs[0]!.remainingMs = DUR - 60_000; // eine Minute vergangen
    expect(useConsumable(s, content, TONIC)).toBe(true);
    expect(remaining(s)).toBe(2 * DUR - 60_000);
    expect(count(s)).toBe(18);
  });

  it("zehn auf einmal = 50 Minuten, verbraucht genau zehn", () => {
    const s = fresh();
    expect(useConsumableMany(s, content, TONIC, 10)).toBe(true);
    expect(remaining(s)).toBe(10 * DUR);
    expect(count(s)).toBe(10);
    expect(s.character.buffs).toHaveLength(1);
  });

  it("Deckel: nie über BUFF_STACK_CAP_MS, überzählige Stücke bleiben im Inventar", () => {
    const s = fresh();
    addItem(s.inventory, content, TONIC, 60); // 80 Stück
    const usesToCap = Math.ceil(BUFF_STACK_CAP_MS / DUR); // 36 bei 3 h / 5 min
    expect(useConsumableMany(s, content, TONIC, 80)).toBe(true);
    expect(remaining(s)).toBe(BUFF_STACK_CAP_MS);
    expect(count(s)).toBe(80 - usesToCap);
    // Voll geladen: buffChargeInfo meldet 0 sinnvolle Stücke, ein weiterer Einzelschluck bleibt am Deckel.
    expect(buffChargeInfo(s, content, TONIC)?.usesToCap).toBe(0);
    useConsumable(s, content, TONIC);
    expect(remaining(s)).toBe(BUFF_STACK_CAP_MS);
  });

  it("buffChargeInfo liefert Restzeit, Dauer je Stück, Deckel und Stücke bis zum Deckel", () => {
    const s = fresh();
    expect(buffChargeInfo(s, content, TONIC)).toEqual({ remainingMs: 0, perUseMs: DUR, capMs: BUFF_STACK_CAP_MS, usesToCap: Math.ceil(BUFF_STACK_CAP_MS / DUR) });
    useConsumableMany(s, content, TONIC, 4);
    expect(buffChargeInfo(s, content, TONIC)?.remainingMs).toBe(4 * DUR);
    expect(buffChargeInfo(s, content, "potion_heal")).toBeNull();
  });

  it("anderes Tonikum derselben Kategorie verdrängt und startet mit eigener Dauer", () => {
    const s = fresh();
    addItem(s.inventory, content, TONIC2, 3);
    useConsumableMany(s, content, TONIC, 10);
    expect(useConsumableMany(s, content, TONIC2, 2)).toBe(true);
    expect(remaining(s, TONIC)).toBe(0);
    expect(remaining(s, TONIC2)).toBe(2 * content.items[TONIC2]!.buff!.durationMs);
  });

  it("Heiltränke bleiben Einzelschlucke, auch mit qty > 1", () => {
    const s = fresh();
    addItem(s.inventory, content, "potion_heal", 5);
    s.character.hp = 1;
    expect(useConsumableMany(s, content, "potion_heal", 5)).toBe(true);
    expect(count(s, "potion_heal")).toBe(4);
  });
});
