import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { addItem, itemCount } from "./inventory";
import { bankCount, depositItem, depositStackable } from "./bank";

/** „Stack all" (Steam-Forum L1GR 27.08.2026): nur Sorten einlagern, die im Lager schon liegen. */
describe("depositStackable", () => {
  it("bewegt nur Items mit Lagerbestand, lässt den Rest im Inventar", () => {
    const s = createGame({ name: "Bank" }, content, 5);
    addItem(s.inventory, content, "oak_log", 30);
    addItem(s.inventory, content, "copper_ore", 12);
    addItem(s.inventory, content, "raw_shrimp", 7);
    depositItem(s, content, "oak_log", 5); // oak_log liegt jetzt im Lager
    s.bank["copper_ore"] = 3; // Lagerbestand ohne Inventar-Vorlauf
    const moved = depositStackable(s, content);
    expect(moved).toBe(25 + 12);
    expect(bankCount(s, "oak_log")).toBe(30);
    expect(bankCount(s, "copper_ore")).toBe(15);
    expect(itemCount(s.inventory, "oak_log")).toBe(0);
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);
    expect(itemCount(s.inventory, "raw_shrimp")).toBe(7);
    expect(bankCount(s, "raw_shrimp")).toBe(0);
  });

  it("ohne passende Sorten passiert nichts", () => {
    const s = createGame({ name: "Bank" }, content, 5);
    addItem(s.inventory, content, "raw_shrimp", 7);
    expect(depositStackable(s, content)).toBe(0);
    expect(itemCount(s.inventory, "raw_shrimp")).toBe(7);
  });
});
