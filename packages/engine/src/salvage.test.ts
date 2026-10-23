import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { RELIC_DUST_ITEM_ID } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { addItem, itemCount } from "./inventory";
import { dropSourcesOf } from "./drop-sources";
import { sellPrice } from "./shop";
import {
  isCraftedItem,
  isSalvageable,
  salvageBatch,
  salvageItem,
  salvagePlan,
  salvageYield,
  toggleSalvageLock,
} from "./salvage";

/**
 * Bergung (1.4.0 „Feder und Stahl“ BG; claude:2026-10-23T23:00:00+02:00). Chef 23.10.: nur gedroppte Items,
 * kein Kreislauf aus Herstellen und Zerlegen. Zahlen: design/1.4.0-balance-werkstatt.md §1.
 */
const items = Object.values(content.items);

describe("Herkunftsregel", () => {
  it("Guard: kein herstellbares Teil steht in irgendeiner Drop-Quelle (sonst wäre die Regel gebrochen)", () => {
    const leaks = items.filter((i) => i.type === "equipment" && isCraftedItem(content, i.id) && dropSourcesOf(content, i.id).length > 0);
    expect(leaks.map((i) => i.id)).toEqual([]);
  });

  it("Hergestelltes, Shop-Ware und Meisterringe sind nie zerlegbar", () => {
    expect(isSalvageable(content, "godiron_sword")).toBe(false); // Schmiede-Rezept
    expect(isSalvageable(content, "wooden_shield")).toBe(false); // Drop, aber auch im Gold-Shop
    const ring = items.find((i) => i.id.startsWith("ring_master_"));
    expect(ring && isSalvageable(content, ring.id)).toBe(false);
  });

  it("es gibt zerlegbare Beute (Größenordnung der Spec, ohne die Zahl zu pinnen)", () => {
    const n = items.filter((i) => isSalvageable(content, i.id)).length;
    expect(n).toBeGreaterThan(200);
  });
});

describe("Ertrag", () => {
  it("alle zerlegbaren Teile liegen im Band 70–90 % des Verkaufspreises", () => {
    const off: string[] = [];
    for (const it of items) {
      if (!isSalvageable(content, it.id)) continue;
      const y = salvageYield(content, it.id)!;
      const S = sellPrice(content, it.id);
      const G = y.dust * sellPrice(content, RELIC_DUST_ITEM_ID) + y.items.reduce((a, b) => a + b.qty * sellPrice(content, b.itemId), 0);
      if (10 * G < 7 * S || 10 * G > 9 * S) off.push(`${it.id}: ${G}/${S}`);
    }
    expect(off).toEqual([]);
  });

  it("Gold-Referenzen der Spec §1.6", () => {
    const y = (id: string) => {
      const r = salvageYield(content, id)!;
      return Object.fromEntries([...r.items.map((i) => [i.itemId, i.qty]), ["dust", r.dust]]);
    };
    expect(y("sickle_shiv")).toEqual({ copper_bar: 5, dust: 0 });
    expect(y("goblin_warkilt")).toEqual({ steel_bar: 3, dust: 1 });
    expect(y("marrow_shortbow")).toEqual({ cured_leather: 9, oak_log: 9, dust: 1 });
    expect(y("eye_of_the_idol")).toEqual({ godgem: 29, dust: 25 });
  });
});

describe("Zerlegen", () => {
  it("Stapel aus dem Inventar: Teil weg, Material und Staub da", () => {
    const s = createTestGame({ name: "B" }, content, 1);
    s.settings.materialsToStorage = false;
    addItem(s.inventory, content, "goblin_warkilt", 2);
    expect(salvageItem(s, content, "goblin_warkilt", 2)).toBe(2);
    expect(itemCount(s.inventory, "goblin_warkilt")).toBe(0);
    expect(itemCount(s.inventory, "steel_bar") + (s.bank.steel_bar ?? 0)).toBe(6);
    expect(itemCount(s.inventory, RELIC_DUST_ITEM_ID) + (s.bank[RELIC_DUST_ITEM_ID] ?? 0)).toBe(2);
  });

  it("Hergestelltes wird abgelehnt, das Schloss schützt, der Sammel-Knopf respektiert die Rarität", () => {
    const s = createTestGame({ name: "B" }, content, 1);
    addItem(s.inventory, content, "godiron_sword", 1);
    expect(salvageItem(s, content, "godiron_sword", 1)).toBe(0);
    addItem(s.inventory, content, "sickle_shiv", 1);
    addItem(s.inventory, content, "goblin_warkilt", 1);
    toggleSalvageLock(s, "sickle_shiv");
    expect(salvageItem(s, content, "sickle_shiv", 1)).toBe(0);
    expect(salvagePlan(s, content, "common").map((e) => e.itemId)).not.toContain("goblin_warkilt"); // rare > common
    expect(salvageBatch(s, content, "rare")).toBe(1); // nur der Kilt, die Klinge ist gesperrt
    expect(itemCount(s.inventory, "sickle_shiv")).toBe(1);
  });
});
