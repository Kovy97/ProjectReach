import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ItemInstance } from "@hearthforge/shared";
import { createGame } from "./state";
import { advance } from "./tick";
import { setActiveAction } from "./actions";
import { itemCount } from "./inventory";
import {
  collectAllMail,
  collectMail,
  grantLoot,
  grantLootInstance,
  hasMail,
  mailItemCount,
  transferInventoryItemsToSave,
} from "./mail";

/** Frischer Spielstand mit VOLLEM Inventar und Auto-Bank AUS → jeder Fremd-Loot muss ins Postfach. */
function fullInv(name = "M"): ReturnType<typeof createGame> {
  const s = createGame({ name }, content, 1);
  s.settings.autoBank = false;
  for (let i = 0; i < s.inventory.slots.length; i++) {
    s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
  }
  return s;
}

describe("Postfach/Mailbox (SAVE_VERSION 71)", () => {
  it("frischer Save: Postfach ist leer, Sequenzzähler 0", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    expect(s.mailbox).toEqual([]);
    expect(s.mailSeq).toBe(0);
    expect(hasMail(s)).toBe(false);
    expect(mailItemCount(s)).toBe(0);
  });

  it("grantLoot: Überlauf bei vollem Inventar landet im Postfach (nichts verloren)", () => {
    const s = fullInv();
    grantLoot(s, content, "copper_ore", 5);
    // Nichts ins Inventar (voll, Auto-Bank aus) → alles ins Postfach.
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);
    expect(s.mailbox.length).toBe(1);
    expect(s.mailbox[0]!.kind).toBe("overflow");
    expect(s.mailbox[0]!.items).toEqual([{ itemId: "copper_ore", qty: 5 }]);
    expect(mailItemCount(s)).toBe(5);
    expect(hasMail(s)).toBe(true);
    // Deterministische ID/Sequenz (kein Date.now/Math.random).
    expect(s.mailbox[0]!.id).toBe("mail_0");
    expect(s.mailbox[0]!.createdSeq).toBe(0);
    expect(s.mailSeq).toBe(1);
  });

  it("Teil-Überlauf: was ins Inventar passt bleibt dort, nur der Rest wandert ins Postfach", () => {
    const s = createGame({ name: "Teil" }, content, 1);
    s.settings.autoBank = false;
    // Genau EINEN freien Slot lassen (Rest voll).
    for (let i = 1; i < s.inventory.slots.length; i++) {
      s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
    }
    // copper_ore: 1 Stapel passt in den freien Slot (bis MAX_STACK), der Rest ist Überlauf.
    grantLoot(s, content, "copper_ore", 12_000);
    expect(itemCount(s.inventory, "copper_ore")).toBe(9999);
    expect(s.mailbox[0]!.items).toEqual([{ itemId: "copper_ore", qty: 12_000 - 9999 }]);
  });

  it("Staffelung: mehrere Überlauf-Items ergeben EINE overflow-Mail, korrekt gestapelt", () => {
    const s = fullInv();
    grantLoot(s, content, "copper_ore", 3);
    grantLoot(s, content, "tin_ore", 2);
    grantLoot(s, content, "copper_ore", 4); // stapelt auf denselben Eintrag
    // Nur EINE stehende Mail (nicht pro Item/Aufruf eine neue).
    expect(s.mailbox.length).toBe(1);
    const mail = s.mailbox[0]!;
    expect(mail.items.find((a) => a.itemId === "copper_ore")?.qty).toBe(7);
    expect(mail.items.find((a) => a.itemId === "tin_ore")?.qty).toBe(2);
    expect(mail.items.length).toBe(2);
    expect(mailItemCount(s)).toBe(9);
  });

  it("collectAllMail holt den Inhalt zurück ins Inventar und leert das Postfach", () => {
    const s = fullInv("C");
    grantLoot(s, content, "copper_ore", 5);
    grantLoot(s, content, "tin_ore", 2);
    // Platz schaffen (Inventar leeren), dann alles abholen.
    s.inventory.slots.fill(null);
    const res = collectAllMail(s, content);
    expect(res.collected).toBe(7);
    expect(res.partial).toBe(false);
    expect(itemCount(s.inventory, "copper_ore")).toBe(5);
    expect(itemCount(s.inventory, "tin_ore")).toBe(2);
    expect(hasMail(s)).toBe(false);
    expect(s.mailbox.length).toBe(0); // geleerte Mail entfernt
  });

  it("partieller Collect: passt nicht alles, bleibt der Rest im Postfach", () => {
    const s = fullInv("P");
    grantLoot(s, content, "copper_ore", 5);
    grantLoot(s, content, "tin_ore", 2);
    const mailId = s.mailbox[0]!.id;
    // Nur EINEN Slot frei machen → nur der erste Item-Stapel passt zurück, der Rest bleibt liegen.
    s.inventory.slots[0] = null;
    const res = collectMail(s, content, mailId);
    expect(res.partial).toBe(true);
    expect(res.collected).toBe(5); // copper_ore (Erst-Sicht-Reihenfolge) kam zurück
    expect(itemCount(s.inventory, "copper_ore")).toBe(5);
    // tin_ore blieb im Postfach.
    expect(s.mailbox.length).toBe(1);
    expect(s.mailbox[0]!.items).toEqual([{ itemId: "tin_ore", qty: 2 }]);
  });

  it("grantLootInstance: mit freier Tasche landet die Instanz in der Inventar-Tasche (nie im Postfach)", () => {
    const s = createGame({ name: "I" }, content, 1); // frisch, jede Menge Kapazität übrig
    const inst: ItemInstance = {
      instanceId: "inst_test_a",
      baseItemId: "steel_sword",
      affixes: [{ affixId: "affix_keen", tier: 1 }],
    };
    grantLootInstance(s, content, inst);
    expect(s.inventory.instances.map((i) => i.instanceId)).toContain("inst_test_a");
    expect(s.bankInstances).toHaveLength(0);
    expect(hasMail(s)).toBe(false);
  });

  it("grantLootInstance: bei vollem Slot-Gitter geht die Instanz in den Gear-Vault, NICHT ins Postfach (Chef-Bugfix 22/20)", () => {
    // Kapazitäts-Gate (2026-07-23): ein volles Slot-Gitter lässt keinen frischen Instanz-Zugang mehr in
    // `inventory.instances` — der (unbegrenzte) Gear-Vault `bankInstances` fängt den Überlauf auf, GENAU
    // wie `grantLoot`/`addItemOrBank` es für stapelbare Items via Bank machen. Das Postfach bleibt der
    // Vollständigkeit halber ein letzter Puffer, ist hier aber unerreichbar (Vault ist unbegrenzt).
    const s = fullInv("I");
    const inst: ItemInstance = {
      instanceId: "inst_test_a",
      baseItemId: "steel_sword",
      affixes: [{ affixId: "affix_keen", tier: 1 }],
    };
    grantLootInstance(s, content, inst);
    expect(s.inventory.instances).toHaveLength(0); // nicht in der (kapazitätsgesperrten) Tasche
    expect(s.bankInstances.map((i) => i.instanceId)).toContain("inst_test_a"); // im Gear-Vault
    expect(hasMail(s)).toBe(false); // Vault ist unbegrenzt → kein Postfach-Overflow nötig
  });

  it("Auto-Bank fängt den Überlauf VOR dem Postfach ab (Postfach ist letzter Puffer)", () => {
    const s = createGame({ name: "AB" }, content, 1);
    s.settings.autoBank = true; // Default: Überlauf → Lager
    for (let i = 0; i < s.inventory.slots.length; i++) {
      s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
    }
    grantLoot(s, content, "copper_ore", 5);
    // Bank hat Platz → alles ins Lager, Postfach bleibt leer.
    expect(s.bank.copper_ore).toBe(5);
    expect(hasMail(s)).toBe(false);
  });

  it("Determinismus: Offline-Catch-up erzeugt dieselbe Mailbox wie der Live-Loop (IDs/seq deterministisch)", () => {
    function run(offline: boolean) {
      const s = createGame({ name: "D" }, content, 42);
      s.settings.autoBank = false;
      for (let i = 0; i < s.inventory.slots.length; i++) {
        s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
      }
      setActiveAction(s, content, "cut_normal_tree"); // Output überläuft ins Postfach
      advance(s, content, 30_000, { offline });
      return s.mailbox;
    }
    const live = run(false);
    const off = run(true);
    expect(off).toEqual(live);
    expect(live.length).toBe(1);
    expect(live[0]!.id).toBe("mail_0");
    expect(live[0]!.createdSeq).toBe(0);
    expect(mailItemCount({ mailbox: live } as never)).toBeGreaterThan(0);
  });
});

// codex:2026-08-31T22:04:00+02:00 — Cross-Save-Fracht ist reine Engine-Mutation ohne I/O/Uhr.
describe("Cross-Save-Itemtransfer (SAVE_VERSION 87)", () => {
  it("verschiebt einen Teilstapel und eine Instanz verlustfrei in eine eigene Transfer-Mail", () => {
    const source = createGame({ name: "Mira Ashfall" }, content, 1);
    const target = createGame({ name: "Woksel" }, content, 2);
    target.inventory.instances.push({
      instanceId: "inst_0",
      baseItemId: "steel_sword",
      affixes: [{ affixId: "affix_keen", tier: 1 }],
    });
    target.nextInstanceSeq = 1;
    source.inventory.slots[0] = { itemId: "iron_bar", qty: 15 };
    const inst: ItemInstance = {
      instanceId: "inst_cross_save",
      baseItemId: "steel_sword",
      affixes: [{ affixId: "affix_keen", tier: 1 }],
    };
    source.inventory.instances.push(inst);

    const result = transferInventoryItemsToSave(source, target, content, "Nebelwacht", {
      slots: [{ slotIndex: 0, itemId: "iron_bar", qty: 6 }],
      instanceIds: [inst.instanceId],
    });

    expect(result).toMatchObject({ ok: true, stacks: 2, units: 7 });
    expect(source.inventory.slots[0]).toEqual({ itemId: "iron_bar", qty: 9 });
    expect(source.inventory.instances).toHaveLength(0);
    expect(target.mailbox).toEqual([
      {
        id: "mail_0",
        kind: "transfer",
        createdSeq: 0,
        fromSaveName: "Nebelwacht",
        items: [{ itemId: "iron_bar", qty: 6 }],
        instances: [{ ...inst, instanceId: "inst_1" }],
      },
    ]);
    expect(target.mailSeq).toBe(1);
    expect(target.nextInstanceSeq).toBe(2);
  });

  it("sperrt Schluessel und Meisterringe: not_transferable und No-op", () => {
    // claude:2026-10-17T21:00:00+02:00
    for (const itemId of ["paragon_key", "crypt_key", "ring_master_mining"]) {
      const source = createGame({ name: "Mira Ashfall" }, content, 1);
      const target = createGame({ name: "Woksel" }, content, 2);
      source.inventory.slots[0] = { itemId, qty: 1 };
      source.inventory.slots[1] = { itemId: "iron_bar", qty: 3 };
      const before = JSON.stringify(source);
      const result = transferInventoryItemsToSave(source, target, content, "Nebelwacht", {
        slots: [{ slotIndex: 1, itemId: "iron_bar", qty: 1 }, { slotIndex: 0, itemId, qty: 1 }],
        instanceIds: [],
      });
      expect(result).toEqual({ ok: false, reason: "not_transferable" });
      expect(JSON.stringify(source)).toBe(before);
      expect(target.mailbox).toHaveLength(0);
    }
  });

  it("ist bei veralteter Slot-Auswahl vollständig ein No-op", () => {
    const source = createGame({ name: "Quelle" }, content, 1);
    const target = createGame({ name: "Ziel" }, content, 2);
    source.inventory.slots[0] = { itemId: "iron_bar", qty: 4 };

    const result = transferInventoryItemsToSave(source, target, content, "Quelle", {
      slots: [{ slotIndex: 0, itemId: "iron_bar", qty: 5 }],
      instanceIds: [],
    });

    expect(result).toEqual({ ok: false, reason: "invalid_source" });
    expect(source.inventory.slots[0]).toEqual({ itemId: "iron_bar", qty: 4 });
    expect(target.mailbox).toEqual([]);
    expect(target.mailSeq).toBe(0);
  });

  // codex:2026-08-31T23:58:00+02:00 — Physische Teilstapel derselben Item-ID sind ein logischer
  // Paketplatz; acht verschiedene IDs bleiben die harte Paketgrenze.
  it("fasst physische Teilstapel derselben Item-ID zu einem Paketplatz zusammen", () => {
    const source = createGame({ name: "Quelle" }, content, 1);
    const target = createGame({ name: "Ziel" }, content, 2);
    for (let index = 0; index < 9; index += 1) source.inventory.slots[index] = { itemId: "iron_bar", qty: 1 };
    const slots = Array.from({ length: 9 }, (_, slotIndex) => ({ slotIndex, itemId: "iron_bar", qty: 1 }));
    const result = transferInventoryItemsToSave(source, target, content, "Quelle", { slots, instanceIds: [] });
    expect(result).toMatchObject({ ok: true, stacks: 1, units: 9 });
    expect(source.inventory.slots.slice(0, 9).every((slot) => slot === null)).toBe(true);
    expect(target.mailbox[0]!.items).toEqual([{ itemId: "iron_bar", qty: 9 }]);
  });

  it("weist mehr als acht verschiedene Paketplätze ohne Mutation zurück", () => {
    const source = createGame({ name: "Quelle" }, content, 1);
    const target = createGame({ name: "Ziel" }, content, 2);
    const itemIds = [
      "iron_bar", "copper_ore", "tin_ore", "normal_log", "oak_log",
      "bronze_bar", "raw_shrimp", "raw_trout", "raw_cod",
    ];
    itemIds.forEach((itemId, index) => { source.inventory.slots[index] = { itemId, qty: 1 }; });
    const slots = itemIds.map((itemId, slotIndex) => ({ slotIndex, itemId, qty: 1 }));
    const result = transferInventoryItemsToSave(source, target, content, "Quelle", { slots, instanceIds: [] });
    expect(result).toEqual({ ok: false, reason: "too_many" });
    expect(source.inventory.slots.slice(0, 9).every((slot) => slot?.qty === 1)).toBe(true);
    expect(target.mailbox).toEqual([]);
  });
});
