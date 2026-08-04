import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";

// Verarbeitungs-Aktion mit Eingaben: smelt_bronze (Schmieden 5, 1 Kupfer + 1 Zinn → 1 Barren, 3 s).
function smith() {
  const s = createGame({ name: "Schmied" }, content, 1);
  s.skills.smithing = { xp: xpForLevel(5) };
  return s;
}

describe("Mengen-Craft Ziel-Zähler (actionTarget)", () => {
  it("stoppt eine Crafting-Aktion sauber nach dem gesetzten Ziel (5)", () => {
    const s = smith();
    addItem(s.inventory, content, "copper_ore", 20);
    addItem(s.inventory, content, "tin_ore", 20);

    setActiveAction(s, content, "smelt_bronze", 5);
    expect(s.actionTarget).toBe(5);

    advance(s, content, 60_000); // genug Zeit für >5 Abschlüsse

    expect(itemCount(s.inventory, "bronze_bar")).toBe(5); // exakt das Ziel
    expect(itemCount(s.inventory, "copper_ore")).toBe(15); // nur 5 Sets verbraucht
    expect(s.activeActionId).toBeNull(); // sauber gestoppt
    expect(s.actionTarget).toBeNull(); // Ziel zurückgesetzt
    expect(s.lastStop).toBeNull(); // KEIN Abbruch-Hinweis (planmäßig fertig)
  });

  it("Ziel 1 erzeugt genau ein Stück und stoppt", () => {
    const s = smith();
    addItem(s.inventory, content, "copper_ore", 20);
    addItem(s.inventory, content, "tin_ore", 20);

    setActiveAction(s, content, "smelt_bronze", 1);
    advance(s, content, 60_000);

    expect(itemCount(s.inventory, "bronze_bar")).toBe(1);
    expect(s.activeActionId).toBeNull();
  });

  it("Alle (Ziel null) laeuft wie bisher bis das Material leer ist", () => {
    const s = smith();
    addItem(s.inventory, content, "copper_ore", 3);
    addItem(s.inventory, content, "tin_ore", 3);

    setActiveAction(s, content, "smelt_bronze"); // ohne target → unbegrenzt
    expect(s.actionTarget).toBeNull();
    advance(s, content, 60_000);

    expect(itemCount(s.inventory, "bronze_bar")).toBe(3);
    expect(s.activeActionId).toBeNull();
    expect(s.lastStop).toEqual({ actionId: "smelt_bronze", reason: "no_materials" });
  });

  it("respektiert das Ziel auch im Offline-Nachholen (ein großer advance)", () => {
    const s = smith();
    addItem(s.inventory, content, "copper_ore", 50);
    addItem(s.inventory, content, "tin_ore", 50);

    setActiveAction(s, content, "smelt_bronze", 7);
    advance(s, content, 3_600_000); // 1 h am Stück (Offline-Schnelllauf)

    expect(itemCount(s.inventory, "bronze_bar")).toBe(7);
    expect(s.activeActionId).toBeNull();
    expect(s.actionTarget).toBeNull();
  });

  it("funktioniert ebenso für Gather-Aktionen (cut_normal_tree, Ziel 3)", () => {
    const s = createGame({ name: "Holzfäller" }, content, 1);
    setActiveAction(s, content, "cut_normal_tree", 3);
    advance(s, content, 60_000);

    expect(itemCount(s.inventory, "normal_log")).toBe(3);
    expect(s.activeActionId).toBeNull();
  });

  it("setzt das Ziel beim manuellen Stoppen zurück", () => {
    const s = smith();
    addItem(s.inventory, content, "copper_ore", 20);
    addItem(s.inventory, content, "tin_ore", 20);

    setActiveAction(s, content, "smelt_bronze", 10);
    expect(s.actionTarget).toBe(10);
    setActiveAction(s, content, null); // Stop
    expect(s.actionTarget).toBeNull();
  });

  it("behandelt ein nicht-positives/ungültiges Ziel als unbegrenzt", () => {
    const s = smith();
    setActiveAction(s, content, "smelt_bronze", 0);
    expect(s.actionTarget).toBeNull();
    setActiveAction(s, content, "smelt_bronze", -4);
    expect(s.actionTarget).toBeNull();
    setActiveAction(s, content, "smelt_bronze", 4.8); // Float → floor
    expect(s.actionTarget).toBe(4);
  });
});
