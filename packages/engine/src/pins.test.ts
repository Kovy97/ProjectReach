// claude:2026-10-31T11:48:15+01:00 — Rezepte anpinnen (1.4.2, SAVE 101): Umschalten, Obergrenze, Lade-Härtung, Fensterzeilen
// (Bestand Inventar + Lager wie der Tick, Stufen-Sperre, Warteschlangen-Projektion), Aschesturz behält die Pins.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { enqueueAction, enqueueActionAtFront, setActiveAction } from "./actions";
import { addItem } from "./inventory";
import { xpForLevel } from "./leveling";
import {
  MAX_PINNED_RECIPES,
  cleanPinnedRecipes,
  isPinnableRecipe,
  isRecipePinned,
  pinnedRecipeIds,
  pinnedRecipeRows,
  togglePinnedRecipe,
  unpinRecipe,
} from "./pins";
import { PRESTIGE_UNLOCK_QUEST_ID } from "@hearthforge/shared";
import { PRESTIGE_STATE_FIELDS, ascend } from "./prestige";

/** Content-Fakten: smelt_copper (Schmieden 1) 1 copper_ore → copper_bar; smelt_bronze (Schmieden 5) 1 copper_ore + 1 tin_ore;
 *  forge_copper_axe (Schmieden 2) 2 copper_bar; mine_copper ohne Zutaten (kein Rezept); cook_voidray (Kochen 85). */
function fresh() {
  return createGame({ name: "Pinnwand" }, content, 7);
}

const RECIPES = Object.values(content.actions)
  .filter((a) => (a.inputs?.length ?? 0) > 0)
  .map((a) => a.id);

describe("pins: Umschalten und Obergrenze", () => {
  it("frischer Stand hat keine Pins", () => {
    const s = fresh();
    expect(s.pinnedRecipes).toEqual([]);
    expect(pinnedRecipeRows(s, content)).toEqual([]);
  });

  it("nur Aktionen mit Zutaten sind pinbar", () => {
    expect(isPinnableRecipe(content, "smelt_copper")).toBe(true);
    expect(isPinnableRecipe(content, "mine_copper")).toBe(false);
    expect(isPinnableRecipe(content, "gibt_es_nicht")).toBe(false);
    const s = fresh();
    expect(togglePinnedRecipe(s, content, "mine_copper")).toEqual({ ok: false, reason: "not_recipe" });
    expect(togglePinnedRecipe(s, content, "gibt_es_nicht")).toEqual({ ok: false, reason: "not_recipe" });
    expect(s.pinnedRecipes).toEqual([]);
  });

  it("anpinnen hängt hinten an, ein zweiter Klick löst, die Reihenfolge der übrigen bleibt", () => {
    const s = fresh();
    expect(togglePinnedRecipe(s, content, "smelt_copper")).toEqual({ ok: true, pinned: true });
    expect(togglePinnedRecipe(s, content, "smelt_bronze")).toEqual({ ok: true, pinned: true });
    expect(togglePinnedRecipe(s, content, "forge_copper_axe")).toEqual({ ok: true, pinned: true });
    expect(pinnedRecipeIds(s)).toEqual(["smelt_copper", "smelt_bronze", "forge_copper_axe"]);
    expect(isRecipePinned(s, "smelt_bronze")).toBe(true);
    expect(togglePinnedRecipe(s, content, "smelt_bronze")).toEqual({ ok: true, pinned: false });
    expect(pinnedRecipeIds(s)).toEqual(["smelt_copper", "forge_copper_axe"]);
    expect(unpinRecipe(s, "smelt_copper")).toBe(true);
    expect(unpinRecipe(s, "smelt_copper")).toBe(false);
    expect(pinnedRecipeIds(s)).toEqual(["forge_copper_axe"]);
  });

  it(`höchstens ${MAX_PINNED_RECIPES} Pins: der elfte wird abgelehnt, nichts ändert sich; Lösen geht weiter`, () => {
    expect(MAX_PINNED_RECIPES).toBe(10);
    const s = fresh();
    for (const id of RECIPES.slice(0, MAX_PINNED_RECIPES)) expect(togglePinnedRecipe(s, content, id).ok).toBe(true);
    const before = [...s.pinnedRecipes];
    expect(togglePinnedRecipe(s, content, RECIPES[MAX_PINNED_RECIPES]!)).toEqual({ ok: false, reason: "limit" });
    expect(s.pinnedRecipes).toEqual(before);
    expect(togglePinnedRecipe(s, content, before[3]!)).toEqual({ ok: true, pinned: false });
    expect(togglePinnedRecipe(s, content, RECIPES[MAX_PINNED_RECIPES]!)).toEqual({ ok: true, pinned: true });
    expect(s.pinnedRecipes).toHaveLength(MAX_PINNED_RECIPES);
  });

  it("Lösen klappt auch für eine Id, die der Content nicht mehr kennt", () => {
    const s = fresh();
    s.pinnedRecipes = ["smelt_copper", "alt_rezept_weg"];
    expect(togglePinnedRecipe(s, content, "alt_rezept_weg")).toEqual({ ok: true, pinned: false });
    expect(s.pinnedRecipes).toEqual(["smelt_copper"]);
  });

  it("fehlendes Feld (defensiv): Umschalten legt die Liste an", () => {
    const s = fresh();
    delete (s as unknown as Record<string, unknown>).pinnedRecipes;
    expect(pinnedRecipeIds(s)).toEqual([]);
    expect(togglePinnedRecipe(s, content, "smelt_copper")).toEqual({ ok: true, pinned: true });
    expect(s.pinnedRecipes).toEqual(["smelt_copper"]);
  });

  it("deterministisch: dieselbe Klickfolge liefert auf zwei Ständen dieselbe Liste, RNG unberührt", () => {
    const a = fresh();
    const b = fresh();
    const rngBefore = JSON.stringify(a.rng);
    for (const s of [a, b]) {
      togglePinnedRecipe(s, content, "smelt_bronze");
      togglePinnedRecipe(s, content, "smelt_copper");
      togglePinnedRecipe(s, content, "smelt_bronze");
    }
    expect(a.pinnedRecipes).toEqual(b.pinnedRecipes);
    expect(JSON.stringify(a.rng)).toBe(rngBefore);
  });
});

describe("pins: Lade-Härtung cleanPinnedRecipes", () => {
  it("nur Strings und pinbare Rezepte, ohne Doppel (der erste gewinnt), höchstens 10, Reihenfolge bleibt", () => {
    const raw = ["smelt_bronze", 42, null, "mine_copper", "smelt_bronze", "weg", "smelt_copper", ...RECIPES.slice(0, 14)];
    const out = cleanPinnedRecipes(raw, content);
    expect(out[0]).toBe("smelt_bronze");
    expect(out[1]).toBe("smelt_copper");
    expect(out).toHaveLength(MAX_PINNED_RECIPES);
    expect(new Set(out).size).toBe(out.length);
    for (const id of out) expect(isPinnableRecipe(content, id)).toBe(true);
    expect(cleanPinnedRecipes(out, content)).toEqual(out); // Fixpunkt
  });

  it("kein Array ⇒ leer", () => {
    for (const bad of [undefined, null, 7, "smelt_copper", { 0: "smelt_copper" }]) {
      expect(cleanPinnedRecipes(bad, content)).toEqual([]);
    }
  });
});

describe("pins: Fensterzeilen", () => {
  it("Bestand zählt Inventar und Lager zusammen (dieselbe Quelle wie der Craft), herstellbar = min über die Zutaten", () => {
    const s = fresh();
    s.skills.smithing = { xp: xpForLevel(5) };
    togglePinnedRecipe(s, content, "smelt_bronze");
    addItem(s.inventory, content, "copper_ore", 3);
    s.bank.copper_ore = 4;
    s.bank.tin_ore = 2;
    const [row] = pinnedRecipeRows(s, content);
    expect(row).toMatchObject({
      actionId: "smelt_bronze",
      skillId: "smithing",
      levelRequired: content.actions.smelt_bronze!.levelRequired ?? 1,
      levelOk: true,
      outputItemId: content.actions.smelt_bronze!.loot[0]!.itemId,
      craftable: 2,
      active: false,
      startable: true,
      queueable: true,
    });
    expect(row!.inputs).toEqual([
      { itemId: "copper_ore", need: 1, have: 7, status: "have" },
      { itemId: "tin_ore", need: 1, have: 2, status: "have" },
    ]);
  });

  it("fehlende Zutat: herstellbar 0, nicht startbar, nicht einreihbar (ohne Warteschlange), Zutat als fehlend markiert", () => {
    const s = fresh();
    s.skills.smithing = { xp: xpForLevel(5) };
    togglePinnedRecipe(s, content, "smelt_bronze");
    addItem(s.inventory, content, "copper_ore", 5);
    const [row] = pinnedRecipeRows(s, content);
    expect(row!.craftable).toBe(0);
    expect(row!.startable).toBe(false);
    expect(row!.queueable).toBe(false);
    expect(row!.inputs.map((i) => i.status)).toEqual(["have", "missing"]);
  });

  it("Stufe zu niedrig: Anforderung bleibt sichtbar, weder startbar noch einreihbar, auch mit Material", () => {
    const s = fresh();
    togglePinnedRecipe(s, content, "cook_voidray");
    const input = content.actions.cook_voidray!.inputs![0]!;
    s.bank[input.itemId] = 50;
    const [row] = pinnedRecipeRows(s, content);
    expect(row!.levelOk).toBe(false);
    expect(row!.levelRequired).toBe(content.actions.cook_voidray!.levelRequired);
    expect(row!.craftable).toBe(50);
    expect(row!.startable).toBe(false);
    expect(row!.queueable).toBe(false);
    // Spiegel der Engine: der Sofort-Start lehnt hier ebenfalls ab
    expect(enqueueActionAtFront(s, content, "cook_voidray", null)).toBe(false);
  });

  it("„werde haben“: liefert die Warteschlange das Material, ist das Rezept einreihbar, aber nicht sofort startbar", () => {
    const s = fresh();
    togglePinnedRecipe(s, content, "smelt_copper");
    expect(enqueueAction(s, content, "mine_copper", 5)).toBe(true);
    const [row] = pinnedRecipeRows(s, content);
    expect(row!.craftable).toBe(0);
    expect(row!.inputs[0]!.status).toBe("will_have");
    expect(row!.startable).toBe(false);
    expect(row!.queueable).toBe(true);
  });

  it("laufendes Rezept ist als aktiv markiert; Starten aus dem Fenster nutzt den Sofort-Start der Karte", () => {
    const s = fresh();
    togglePinnedRecipe(s, content, "smelt_copper");
    addItem(s.inventory, content, "copper_ore", 3);
    expect(pinnedRecipeRows(s, content)[0]!.active).toBe(false);
    expect(enqueueActionAtFront(s, content, "smelt_copper", null)).toBe(true);
    expect(s.activeActionId).toBe("smelt_copper");
    expect(pinnedRecipeRows(s, content)[0]!.active).toBe(true);
    setActiveAction(s, content, null);
    expect(pinnedRecipeRows(s, content)[0]!.active).toBe(false);
  });

  it("Pin-Reihenfolge bleibt, unbekannte Ids fallen still aus den Zeilen (die Liste selbst bleibt)", () => {
    const s = fresh();
    s.pinnedRecipes = ["forge_copper_axe", "weg_damit", "smelt_copper"];
    expect(pinnedRecipeRows(s, content).map((r) => r.actionId)).toEqual(["forge_copper_axe", "smelt_copper"]);
    expect(s.pinnedRecipes).toEqual(["forge_copper_axe", "weg_damit", "smelt_copper"]);
  });

  it("die Zeilen lesen nur: Zustand bleibt byte-gleich", () => {
    const s = fresh();
    togglePinnedRecipe(s, content, "smelt_bronze");
    enqueueAction(s, content, "mine_copper", 3);
    const before = JSON.stringify(s);
    pinnedRecipeRows(s, content);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("pins: Aschesturz", () => {
  it("die Wächterliste stuft `pinnedRecipes` als bleibend ein", () => {
    expect(PRESTIGE_STATE_FIELDS.pinnedRecipes).toBe("keep");
  });

  it("die Pins überleben einen echten Aufstieg (Reihenfolge bleibt)", () => {
    const s = createGame({ name: "Asche", portrait: "char_3" }, content, 7); // Muster prestige-1-4-2.test.ts `ready()`
    for (const id of Object.keys(content.skills).slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
    if (!s.quests.claimed.includes(PRESTIGE_UNLOCK_QUEST_ID)) s.quests.claimed.push(PRESTIGE_UNLOCK_QUEST_ID);
    togglePinnedRecipe(s, content, "smelt_bronze");
    togglePinnedRecipe(s, content, "cook_voidray");
    expect(ascend(s, content)).toBe(true);
    expect(s.prestige.count).toBe(1);
    expect(s.pinnedRecipes).toEqual(["smelt_bronze", "cook_voidray"]);
  });
});
