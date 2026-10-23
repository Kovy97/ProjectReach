import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { addItem, createGame, findNextFood, isHealPotion } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Spielstände (Kontrolleur, 2026-10-23): Migration v88 → v89, Heilplatz-Nachbesetzung.
 * `it.fails` = dokumentierter Befund (SOLL-Formulierung, reißt heute).
 */
const AT = 1_761_800_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function asV88(s: GameState): string {
  const save = JSON.parse(serialize(s, AT)) as SaveShape;
  delete (save.state.character as Partial<GameState["character"]>).meal;
  delete (save.state.character as Partial<GameState["character"]>).mealKeep;
  save.version = 88;
  save.state.version = 88;
  return JSON.stringify(save);
}

describe("v88 → v89: Heilplatz bekommt „die beste reine Heilnahrung“", () => {
  it("[BEFUND P3] Herblore-Heiltrank ohne „potion“ im Namen (salve_of_mending) verdrängt echtes Essen aus dem Heilplatz", () => {
    const s = createGame({ name: "QA-Mahl" }, content, 41);
    addItem(s.inventory, content, "marshroot_chowder", 3);
    addItem(s.inventory, content, "salve_of_mending", 5);
    addItem(s.inventory, content, "cooked_shrimp", 5);
    s.character.food = "marshroot_chowder";
    const out = deserialize(asV88(s), content, AT)!.state;
    expect(out.character.meal).toBe("marshroot_chowder");
    // Engine-Wahrheit: die Salbe ist ein Heiltrank (consume-gate.isHealPotion), Auto-Ess-Nachwahl würde sie nie nehmen.
    expect(isHealPotion(content, "salve_of_mending")).toBe(true);
    expect(findNextFood(out, content, 100)).toBe("cooked_shrimp");
    // SOLL: der Heilplatz folgt derselben Regel. IST: bestPlainHealFood prüft nur `id.includes("potion")`.
    expect(out.character.food).toBe("cooked_shrimp");
  });

  it("ohne Trank im Besitz: echtes Essen landet im Heilplatz, Mahlzeit im Mahlzeit-Platz, Fixpunkt", () => {
    const s = createGame({ name: "QA-Mahl" }, content, 42);
    addItem(s.inventory, content, "marshroot_chowder", 3);
    addItem(s.inventory, content, "cooked_shrimp", 5);
    s.character.food = "marshroot_chowder";
    const once = serialize(deserialize(asV88(s), content, AT)!.state, AT);
    const st = (JSON.parse(once) as SaveShape).state;
    expect(st.character.meal).toBe("marshroot_chowder");
    expect(st.character.food).toBe("cooked_shrimp");
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });
});
