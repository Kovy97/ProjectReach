// codex:2026-08-31T22:04:00+02:00
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame, transferInventoryItemsToSave } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

describe("Cross-Save-Rabenfracht Persistenz (SAVE 88)", () => {
  it("erhält Transfer-Absender, Stapel und Instanzen über einen Roundtrip", () => {
    const source = createGame({ name: "Mira Ashfall" }, content, 1);
    const target = createGame({ name: "Woksel" }, content, 2);
    source.inventory.slots[0] = { itemId: "iron_bar", qty: 12 };
    source.inventory.instances.push({
      instanceId: "inst_transfer_roundtrip",
      baseItemId: "steel_sword",
      affixes: [{ affixId: "affix_keen", tier: 1 }],
    });
    const moved = transferInventoryItemsToSave(source, target, content, "Nebelwacht", {
      slots: [{ slotIndex: 0, itemId: "iron_bar", qty: 5 }],
      instanceIds: ["inst_transfer_roundtrip"],
    });
    expect(moved.ok).toBe(true);

    const savedAt = 1_700_000_000_000;
    const loaded = deserialize(serialize(target, savedAt), content, savedAt);
    expect(loaded).not.toBeNull();
    expect(loaded!.state.mailbox).toEqual(target.mailbox);
    expect(loaded!.offlineMs).toBe(0);
  });

  it("verwirft leere oder namenlose Transfer-Mails beim Sanitize", () => {
    const target = createGame({ name: "Ziel" }, content, 2);
    (target as unknown as { mailbox: unknown[] }).mailbox = [
      { id: "mail_empty", kind: "transfer", createdSeq: 0, items: [], instances: [], fromSaveName: "Quelle" },
      { id: "mail_nameless", kind: "transfer", createdSeq: 1, items: [{ itemId: "iron_bar", qty: 2 }], instances: [], fromSaveName: " " },
      { id: "mail_ok", kind: "transfer", createdSeq: 2, items: [{ itemId: "iron_bar", qty: 2 }], instances: [], fromSaveName: "  Nebelwacht  " },
    ];
    const savedAt = 1_700_000_000_000;
    const loaded = deserialize(serialize(target, savedAt), content, savedAt);
    expect(loaded!.state.mailbox).toEqual([
      { id: "mail_ok", kind: "transfer", createdSeq: 2, items: [{ itemId: "iron_bar", qty: 2 }], instances: [], fromSaveName: "Nebelwacht" },
    ]);
    expect(loaded!.state.mailSeq).toBe(3);
  });
});
