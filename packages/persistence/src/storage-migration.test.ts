import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/** Materiallager (SAVE 89 → 90, 1.4.0 ML; claude:2026-10-23T23:45:00+02:00). */
const AT = 1_761_100_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

describe("Migration v89 → v90 (Materiallager)", () => {
  it("Materialien verlieren ihr Bankfach, Lücken schließen sich, Bestand bleibt, Option an", () => {
    const s = createGame({ name: "Lager" }, content, 5);
    s.bank = { copper_ore: 50, rusty_sword: 1, oak_log: 20, cooked_trout: 9 };
    s.bankOrder = ["copper_ore", null, "rusty_sword", "oak_log", "cooked_trout"];
    const save = JSON.parse(serialize(s, AT)) as SaveShape;
    save.version = 89;
    save.state.version = 89;
    delete (save.state.settings as Partial<GameState["settings"]>).materialsToStorage;
    const out = deserialize(JSON.stringify(save), content, AT)!.state;
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.bankOrder).toEqual(["rusty_sword", "cooked_trout"]);
    expect(out.bank).toEqual({ copper_ore: 50, rusty_sword: 1, oak_log: 20, cooked_trout: 9 });
    expect(out.settings.materialsToStorage).toBe(true);
    expect(out.lockedItems).toEqual({});
  });

  it("Round-Trip ist Fixpunkt", () => {
    const s = createGame({ name: "Lager" }, content, 5);
    s.bank = { copper_ore: 5, cooked_trout: 2 };
    s.lockedItems = { sickle_shiv: true };
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
    expect((JSON.parse(once) as SaveShape).state.lockedItems).toEqual({ sickle_shiv: true });
  });
});
