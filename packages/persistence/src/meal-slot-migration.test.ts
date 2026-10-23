import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { addItem, createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Mahlzeit-Platz (SAVE_VERSION 88 → 89, 1.4.0 „Feder und Stahl“, Chef 23.10.2026 BF-4).
 * claude:2026-10-23T16:50:00+02:00
 */
const AT = 1_761_000_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function asV88(s: GameState): SaveShape {
  const save = JSON.parse(serialize(s, AT)) as SaveShape;
  delete (save.state.character as Partial<GameState["character"]>).meal;
  delete (save.state.character as Partial<GameState["character"]>).mealKeep;
  save.version = 88;
  save.state.version = 88;
  return save;
}
function load(save: SaveShape): GameState {
  const res = deserialize(JSON.stringify(save), content, AT);
  expect(res).not.toBeNull();
  return res!.state;
}

describe("Migration v88 → v89 (Mahlzeit-Platz)", () => {
  it("Mahlzeit im Essensplatz wandert in den Mahlzeit-Platz, Heilplatz bekommt die beste reine Heilnahrung", () => {
    const s = createGame({ name: "Koch" }, content, 3);
    addItem(s.inventory, content, "marshroot_chowder", 4);
    addItem(s.inventory, content, "cooked_shrimp", 4);
    addItem(s.inventory, content, "cooked_trout", 4);
    s.character.food = "marshroot_chowder";
    const out = load(asV88(s));
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.character.meal).toBe("marshroot_chowder");
    expect(out.character.food).toBe("cooked_trout");
    expect(out.character.mealKeep).toBe(true);
  });

  it("ohne Heilnahrung im Inventar greift die Bank, ohne beides bleibt der Heilplatz leer", () => {
    const s = createGame({ name: "Koch" }, content, 3);
    s.character.food = "marshroot_chowder";
    s.bank.cooked_shrimp = 10;
    expect(load(asV88(s)).character.food).toBe("cooked_shrimp");
    const t = createGame({ name: "Koch" }, content, 4);
    t.character.food = "marshroot_chowder";
    const out = load(asV88(t));
    expect(out.character.meal).toBe("marshroot_chowder");
    expect(out.character.food).toBeNull();
  });

  it("reine Heilnahrung im Essensplatz bleibt unberührt", () => {
    const s = createGame({ name: "Koch" }, content, 3);
    s.character.food = "cooked_trout";
    const out = load(asV88(s));
    expect(out.character.food).toBe("cooked_trout");
    expect(out.character.meal).toBeNull();
  });

  it("Sanitize: keine Mahlzeit im Mahlzeit-Platz → null; mealKeep strikt boolean; Round-Trip Fixpunkt", () => {
    const s = createGame({ name: "Koch" }, content, 3);
    (s.character as { meal: unknown }).meal = "cooked_trout";
    (s.character as { mealKeep: unknown }).mealKeep = "ja";
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    const back = (JSON.parse(once) as SaveShape).state;
    expect(back.character.meal).toBeNull();
    expect(back.character.mealKeep).toBe(true);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });
});
