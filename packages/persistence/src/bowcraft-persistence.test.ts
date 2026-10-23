import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/** Bognerei, Köcher, Pfeile (SAVE 90 → 91, 1.4.0 FK; claude:2026-10-24T20:20:00+02:00). */
const AT = 1_761_200_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function asV90(s: GameState): string {
  const save = JSON.parse(serialize(s, AT)) as SaveShape;
  save.version = 90;
  save.state.version = 90;
  delete (save.state.settings as Partial<GameState["settings"]>).quiverAutoRefill;
  delete (save.state.character as Partial<GameState["character"]>).quiver;
  return JSON.stringify(save);
}

describe("Migration v90 → v91 (Bognerei)", () => {
  it("Alt-Save: Köcher leer, Nachfüllen an, Bognerei ohne Konto (0 XP), Handwerk unverändert", () => {
    const s = createGame({ name: "Bogner" }, content, 3);
    s.skills.leatherworking = { xp: 123_456 };
    s.character.equipment.mainhand = "copper_longbow";
    const out = deserialize(asV90(s), content, AT)!.state;
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.character.quiver).toBeNull();
    expect(out.settings.quiverAutoRefill).toBe(true);
    expect(out.skills.bowcraft).toBeUndefined();
    expect(out.skills.leatherworking).toEqual({ xp: 123_456 });
    expect(out.character.equipment.mainhand).toBe("copper_longbow"); // angelegter Bogen bleibt
  });

  it("Altlast `fletching` faltet weiter in Handwerk und berührt die Bognerei nicht", () => {
    const s = createGame({ name: "Bogner" }, content, 3);
    s.skills.leatherworking = { xp: 1000 };
    (s.skills as Record<string, { xp: number }>).fletching = { xp: 500 };
    const out = deserialize(asV90(s), content, AT)!.state;
    expect(out.skills.leatherworking).toEqual({ xp: 1500 });
    expect(out.skills.bowcraft).toBeUndefined();
    expect((out.skills as Record<string, unknown>).fletching).toBeUndefined();
  });
});

describe("Köcher über Save/Load", () => {
  it("Bogen + Köcher + Ladung überstehen den Round-Trip als Fixpunkt (kein Entwaffnen, kein Brief)", () => {
    const s = createGame({ name: "Bogner" }, content, 3);
    s.character.equipment.mainhand = "copper_shortbow";
    s.character.equipment.offhand = "copper_quiver";
    s.character.quiver = { itemId: "copper_arrow", qty: 77 };
    const mails = s.mailbox?.length ?? 0;
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    const st = (JSON.parse(once) as SaveShape).state;
    expect(st.character.equipment.offhand).toBe("copper_quiver");
    expect(st.character.quiver).toEqual({ itemId: "copper_arrow", qty: 77 });
    expect(st.mailbox?.length ?? 0).toBe(mails);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });

  it("Köcher neben einer Nicht-Bogen-Haupthand fliegt verlustfrei, Ladung geht ins Lager", () => {
    const s = createGame({ name: "Bogner" }, content, 3);
    s.character.equipment.mainhand = "bronze_sword";
    s.character.equipment.offhand = "copper_quiver";
    s.character.quiver = { itemId: "copper_arrow", qty: 12 };
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.character.equipment.offhand).toBeNull();
    expect(out.character.quiver).toBeNull();
    expect(out.bank.copper_arrow).toBe(12);
    const quivers =
      out.inventory.slots.filter((x) => x?.itemId === "copper_quiver").reduce((a, x) => a + (x?.qty ?? 0), 0) +
      (out.bank.copper_quiver ?? 0);
    expect(quivers).toBe(1);
  });

  it("Ladung ohne Köcher, unbekannte oder kaputte Ladung werden bereinigt", () => {
    const s = createGame({ name: "Bogner" }, content, 3);
    s.character.quiver = { itemId: "copper_arrow", qty: 5.7 };
    const a = deserialize(serialize(s, AT), content, AT)!.state;
    expect(a.character.quiver).toBeNull();
    expect(a.bank.copper_arrow).toBe(5);
    s.character.equipment.mainhand = "copper_shortbow";
    s.character.equipment.offhand = "copper_quiver";
    s.character.quiver = { itemId: "copper_bar", qty: 5 }; // kein Pfeil
    expect(deserialize(serialize(s, AT), content, AT)!.state.character.quiver).toBeNull();
    (s.character as { quiver: unknown }).quiver = { itemId: "copper_arrow", qty: -3 };
    expect(deserialize(serialize(s, AT), content, AT)!.state.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 });
  });
});
