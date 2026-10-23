import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, ItemId } from "@hearthforge/shared";
import { consumableHeal } from "@hearthforge/shared";
import { createGame, isHealPotion, itemCount } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Welle 1 „Klarheit“ ZH/BF (Kontrolleur, claude:2026-10-25T23:30:00+02:00).
 * Alt-Save mit Zweihandwaffe und belegter Nebenhand; Köcher-Regel beim Laden; Migrations-Prädikat der Heilnahrung.
 */
const AT = 1_761_000_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function roundTrip(s: GameState, version = 88): GameState {
  const save = JSON.parse(serialize(s, AT)) as SaveShape;
  save.version = version;
  save.state.version = version;
  const res = deserialize(JSON.stringify(save), content, AT);
  expect(res).not.toBeNull();
  return res!.state;
}

describe("QA ZH: Zweihand + belegte Nebenhand aus Alt-Save", () => {
  it("Großschwert + Schild: Schild wandert verlustfrei ins Inventar, Brief vom Wächter", () => {
    const s = createGame({ name: "Alt" }, content, 3);
    s.character.equipment.mainhand = "copper_greatsword";
    s.character.equipment.offhand = "wooden_shield";
    const out = roundTrip(s);
    expect(out.character.equipment.mainhand).toBe("copper_greatsword");
    expect(out.character.equipment.offhand).toBeNull();
    expect(itemCount(out.inventory, "wooden_shield")).toBe(1);
    expect(out.mailbox.some((m) => m.kind === "letter" && m.textKey === "mail.letter.warden.twoHandedRanged")).toBe(true);
  });

  it("Bogen + Köcher mit Ladung bleibt zusammen; Köcher neben Schwert fliegt, Pfeile gehen ins Lager, kein Brief", () => {
    const bow = createGame({ name: "Bogen" }, content, 3);
    bow.character.equipment.mainhand = "copper_longbow";
    bow.character.equipment.offhand = "bronze_quiver";
    bow.character.quiver = { itemId: "copper_arrow", qty: 40 };
    const b = roundTrip(bow, 93);
    expect(b.character.equipment.offhand).toBe("bronze_quiver");
    expect(b.character.quiver).toEqual({ itemId: "copper_arrow", qty: 40 });

    const sword = createGame({ name: "Schwert" }, content, 3);
    sword.character.equipment.mainhand = "copper_greatsword";
    sword.character.equipment.offhand = "bronze_quiver";
    sword.character.quiver = { itemId: "copper_arrow", qty: 40 };
    const w = roundTrip(sword, 93);
    expect(w.character.equipment.offhand).toBeNull();
    expect(w.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 }); // claude:2026-10-26T04:05:00+02:00 — ohne Köcher bleibt die Art als leere Ladung gemerkt (Nachfüllen nach Kit-Wechsel, QA-Fernkampf P3)
    expect(itemCount(w.inventory, "bronze_quiver")).toBe(1);
    expect(w.bank.copper_arrow).toBe(40);
    expect(w.mailbox.some((m) => m.kind === "letter" && m.textKey === "mail.letter.warden.twoHandedRanged")).toBe(false);
  });
});

describe("QA BF: Migrations-Prädikat „reine Heilnahrung“ deckt sich mit der Engine-Trank-Erkennung", () => {
  // claude:2026-10-26T04:05:00+02:00 — Befund behoben: bestPlainHealFood nutzt jetzt isHealPotion. Der Test prüft, dass die Engine-Regel jedes
  // Kräuterkunde-Heilprodukt als Trank erkennt (damit fällt es aus der Migrations-Wahl).
  it("kein Heiltrank ohne „potion“ im Namen, den die Migration als Heilnahrung in den Heilplatz legen könnte", () => {
    const herblore = new Set<ItemId>();
    for (const a of Object.values(content.actions)) if (a.skill === "herblore") for (const l of a.loot) herblore.add(l.itemId);
    const mismatch: ItemId[] = [];
    for (const it of Object.values(content.items)) {
      if (it.type !== "consumable" || it.buff) continue;
      if ((it.healAmount ?? 0) <= 0 && (it.healPct ?? 0) <= 0) continue;
      if (it.id.includes("potion")) continue;
      if (herblore.has(it.id) && consumableHeal(it, 100) > 0 && !isHealPotion(content, it.id)) mismatch.push(it.id);
    }
    expect(mismatch).toEqual([]);
  });
});
