import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { hasMail, mailItemCount } from "./mail";

const GATHER = "cut_normal_tree"; // ohne Eingaben, Output normal_log (+ birds_nest)

/** Belegt jeden Inventar-Slot mit einem Fremd-Item → kein freier Slot, kein passender Stack. */
function fillInventory(s: ReturnType<typeof createGame>): void {
  for (let i = 0; i < s.inventory.slots.length; i++) {
    s.inventory.slots[i] = { itemId: "oak_log", qty: 1 };
  }
}

describe("inventory-full handling", () => {
  it("läuft bei vollem Inventar weiter und puffert den Ertrag ins Postfach (Auto-Bank AUS, SAVE 71)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.settings.autoBank = false;
    fillInventory(s);

    setActiveAction(s, content, GATHER);
    advance(s, content, content.actions[GATHER]!.durationMs * 4);

    // Kein inventory_full-Stopp mehr: die Aktion läuft weiter, der Überlauf wandert ins Postfach —
    // nichts geht verloren.
    expect(s.activeActionId).toBe(GATHER);
    expect(s.lastStop).toBeNull();
    expect(hasMail(s)).toBe(true);
    expect(mailItemCount(s)).toBeGreaterThan(0);
    // Genau EINE stehende overflow-Mail, in der der Loot gestapelt gesammelt wird.
    expect(s.mailbox.length).toBe(1);
    expect(s.mailbox[0]!.kind).toBe("overflow");
    const log = content.actions[GATHER]!.loot[0]!.itemId;
    expect(s.mailbox[0]!.items.some((a) => a.itemId === log)).toBe(true);
    expect(s.stats.itemsGathered).toBeGreaterThan(0);
  });

  it("läuft bei vollem Inventar weiter und bankt den Ertrag (Auto-Bank AN = Default)", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.settings.autoBank).toBe(true); // Default: Idle-Komfort an
    fillInventory(s);

    setActiveAction(s, content, GATHER);
    advance(s, content, content.actions[GATHER]!.durationMs * 4);

    // Aktion läuft weiter, kein Stopp — der Ertrag wanderte ins Lager.
    expect(s.activeActionId).toBe(GATHER);
    expect(s.lastStop).toBeNull();
    const log = content.actions[GATHER]!.loot[0]!.itemId;
    expect(s.bank[log] ?? 0).toBeGreaterThan(0);
    // Nichts ging verloren: gesammelte Items = Lager-Zugang.
    expect(s.stats.itemsGathered).toBeGreaterThan(0);
  });

  it("läuft normal weiter, solange Platz ist", () => {
    const s = createGame({ name: "X" }, content, 1);
    setActiveAction(s, content, GATHER);
    advance(s, content, content.actions[GATHER]!.durationMs * 2);

    // Mit freien Slots bleibt die Aktion aktiv und es wurde gesammelt.
    expect(s.activeActionId).toBe(GATHER);
    expect(s.lastStop).toBeNull();
    expect(s.stats.itemsGathered).toBeGreaterThan(0);
  });
});
