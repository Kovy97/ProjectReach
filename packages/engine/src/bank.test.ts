import { describe, expect, it } from "vitest";
import {
  BANK_SLOT_BASE_COST,
  BANK_SLOT_PACKAGE,
  BASE_BANK_CAPACITY,
  MAX_BANK_SLOTS_PURCHASED,
  effectiveBankCapacity,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { addInstance, addItem, itemCount } from "./inventory";
import {
  bankCount,
  bankList,
  bankSlotsUsed,
  buyBankSlots,
  canDeposit,
  depositAll,
  depositBaseWithVariants,
  depositItem,
  depositItemGroup,
  isBankFull,
  nextBankSlotCost,
  withdrawItem,
  withdrawItemGroup,
} from "./bank";
import { usedCapacityUnits } from "./inventory";

describe("Bank/Lager", () => {
  it("frischer Spielstand hat ein leeres Lager", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.bank).toEqual({});
  });

  it("Einlagern verschiebt Items aus dem Inventar ins Lager", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "copper_ore", 50);
    const moved = depositItem(s, content, "copper_ore", 30);
    expect(moved).toBe(30);
    expect(bankCount(s, "copper_ore")).toBe(30);
    expect(itemCount(s.inventory, "copper_ore")).toBe(20);
  });

  it("Einlagern ist durch den Inventarbestand begrenzt", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "coal", 5);
    expect(depositItem(s, content, "coal", 999)).toBe(5);
    expect(itemCount(s.inventory, "coal")).toBe(0);
    expect(bankCount(s, "coal")).toBe(5);
  });

  it("Abheben holt Items zurück und leert den Eintrag bei 0", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "iron_ore", 10);
    depositItem(s, content, "iron_ore", 10);
    const back = withdrawItem(s, content, "iron_ore", 4);
    expect(back).toBe(4);
    expect(itemCount(s.inventory, "iron_ore")).toBe(4);
    expect(bankCount(s, "iron_ore")).toBe(6);
    withdrawItem(s, content, "iron_ore", 6);
    expect(bankCount(s, "iron_ore")).toBe(0);
    expect(s.bank.iron_ore).toBeUndefined(); // Eintrag entfernt
  });

  it("Abheben ist durch freien Inventarplatz begrenzt (kein Verlust)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Inventar mit lauter verschiedenen, nicht-stapelbaren Items vollstopfen.
    const cap = s.inventory.slots.length;
    for (let i = 0; i < cap; i++) s.inventory.slots[i] = { itemId: "rusty_sword", qty: 1 };
    s.bank.copper_ore = 20;
    const back = withdrawItem(s, content, "copper_ore", 5);
    expect(back).toBe(0); // kein Platz → nichts abgehoben, nichts verloren
    expect(bankCount(s, "copper_ore")).toBe(20);
  });

  it("depositAll lagert das gesamte Inventar ein", () => {
    const s = createGame({ name: "X" }, content, 1);
    const before = s.inventory.slots.reduce((n, slot) => n + (slot?.qty ?? 0), 0); // inkl. Start-Schwert
    addItem(s.inventory, content, "copper_ore", 7);
    addItem(s.inventory, content, "coal", 3);
    const total = depositAll(s, content);
    expect(total).toBe(before + 10);
    // Inventar leer (alles eingelagert).
    expect(s.inventory.slots.every((slot) => slot === null)).toBe(true);
    expect(bankCount(s, "copper_ore")).toBe(7);
    expect(bankCount(s, "coal")).toBe(3);
    expect(bankList(s, content).length).toBeGreaterThanOrEqual(2);
  });

  it("Bank hat eine Basis-Slot-Kapazität von BASE_BANK_CAPACITY distinkten Arten", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(BASE_BANK_CAPACITY).toBe(60);
    expect(effectiveBankCapacity(s, content)).toBe(BASE_BANK_CAPACITY); // frisch: keine gekauften Slots
    expect(bankSlotsUsed(s)).toBe(0);
    expect(isBankFull(s, content)).toBe(false);
  });

  it("volle Bank lehnt eine NEUE Item-Art verlustfrei ab, bestehende Stacks gehen weiter", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Bank künstlich bis zur (effektiven) Basis-Kapazität mit distinkten Arten füllen.
    const cap = effectiveBankCapacity(s, content);
    const ids = Object.keys(content.items).slice(0, cap);
    expect(ids.length).toBe(cap);
    for (const id of ids) s.bank[id] = 1;
    expect(isBankFull(s, content)).toBe(true);
    expect(bankSlotsUsed(s)).toBe(cap);

    // Eine NEUE Art (nicht in der Bank) im Inventar → Einlagern wird abgelehnt, kein Verlust.
    const newId = Object.keys(content.items).find((id) => s.bank[id] === undefined)!;
    addItem(s.inventory, content, newId, 5);
    expect(canDeposit(s, content, newId)).toBe(false);
    expect(depositItem(s, content, newId, 5)).toBe(0);
    expect(itemCount(s.inventory, newId)).toBe(5); // Inventar unverändert
    expect(bankSlotsUsed(s)).toBe(cap);

    // Eine BESTEHENDE Art darf weiter aufgestockt werden, auch bei voller Bank.
    const existing = ids[0]!;
    addItem(s.inventory, content, existing, 3);
    expect(canDeposit(s, content, existing)).toBe(true);
    expect(depositItem(s, content, existing, 3)).toBe(3);
    expect(bankCount(s, existing)).toBe(4);
  });

  it("buyBankSlots erweitert die effektive Kapazität gegen Gold (Gold-Sink)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.gold = 1_000_000;
    const goldBefore = s.character.gold;
    const cap0 = effectiveBankCapacity(s, content);
    const cost0 = nextBankSlotCost(s);
    expect(cost0).toBe(BANK_SLOT_BASE_COST);

    expect(buyBankSlots(s)).toBe(true);
    expect(s.bankSlotsPurchased).toBe(BANK_SLOT_PACKAGE);
    expect(effectiveBankCapacity(s, content)).toBe(cap0 + BANK_SLOT_PACKAGE);
    expect(s.character.gold).toBe(goldBefore - cost0!);
    expect(s.stats.goldSpent).toBe(cost0!); // Gold-Ausgabe mitgezählt
  });

  it("nextBankSlotCost eskaliert mit jedem gekauften Paket", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.gold = 1_000_000_000;
    const first = nextBankSlotCost(s)!;
    buyBankSlots(s);
    const second = nextBankSlotCost(s)!;
    expect(second).toBeGreaterThan(first); // teurer als das erste Paket
  });

  it("buyBankSlots scheitert defensiv bei zu wenig Gold (State unverändert)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.gold = 0;
    expect(buyBankSlots(s)).toBe(false);
    expect(s.bankSlotsPurchased).toBe(0);
    expect(s.character.gold).toBe(0);
  });

  it("Bank-Ausbau hat ein Cap (MAX_BANK_SLOTS_PURCHASED); danach kein Kauf mehr", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.gold = Number.MAX_SAFE_INTEGER;
    // Bis zum Cap kaufen (deterministisch endlich, da jeder Kauf +PACKAGE bringt).
    let guard = 0;
    while (nextBankSlotCost(s) !== null && guard++ < 1000) buyBankSlots(s);
    expect(s.bankSlotsPurchased).toBe(MAX_BANK_SLOTS_PURCHASED);
    expect(nextBankSlotCost(s)).toBeNull();
    expect(buyBankSlots(s)).toBe(false); // am Cap kein weiterer Ausbau
    expect(effectiveBankCapacity(s, content)).toBe(BASE_BANK_CAPACITY + MAX_BANK_SLOTS_PURCHASED);
  });

  it("depositItem: nicht-endliche Menge (NaN/Infinity) ist ein No-op (kein Bank-Vergiften)", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "copper_ore", 20);
    expect(depositItem(s, content, "copper_ore", Number.NaN)).toBe(0);
    expect(depositItem(s, content, "copper_ore", Number.POSITIVE_INFINITY)).toBe(0);
    // Bank-Bestand endlich & unverändert (ohne Guard würde NaN in `state.bank` einsickern).
    expect(s.bank.copper_ore).toBeUndefined();
    expect(itemCount(s.inventory, "copper_ore")).toBe(20);
  });

  it("depositBaseWithVariants lagert Stack + alle Instanzen mit gleichem baseItemId ein; inv.instances danach frei von diesen", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Fungibler Basis-Stapel + zwei verzauberte Varianten derselben Basis + eine fremde Variante.
    addItem(s.inventory, content, "copper_ore", 30);
    addInstance(s.inventory, { instanceId: "inst_ore_a", baseItemId: "copper_ore", affixes: [{ affixId: "affix_x", tier: 1 }] });
    addInstance(s.inventory, { instanceId: "inst_ore_b", baseItemId: "copper_ore", affixes: [] });
    addInstance(s.inventory, { instanceId: "inst_other", baseItemId: "iron_ore", affixes: [] });

    const res = depositBaseWithVariants(s, content, "copper_ore");
    expect(res.deposited).toBe(30); // gesamter fungibler Stapel
    expect(res.instancesMoved).toBe(2); // beide copper_ore-Varianten

    // Fungibler Stack im Lager, Inventar-Grundmenge leer.
    expect(bankCount(s, "copper_ore")).toBe(30);
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);

    // Beide Varianten liegen jetzt im Gear-Vault; die Inventar-Tasche ist frei von copper_ore-Instanzen.
    expect(s.bankInstances.map((i) => i.instanceId).sort()).toEqual(["inst_ore_a", "inst_ore_b"]);
    expect(s.inventory.instances.some((i) => i.baseItemId === "copper_ore")).toBe(false);
    // Fremde Variante bleibt unangetastet in der Tasche.
    expect(s.inventory.instances.map((i) => i.instanceId)).toEqual(["inst_other"]);
  });

  it("depositBaseWithVariants: Varianten wandern MIT, auch wenn die fungible Bank voll ist (unbegrenzter Vault)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Bank bis zur Kapazität mit distinkten Arten füllen (copper_ore NICHT dabei).
    const cap = effectiveBankCapacity(s, content);
    const ids = Object.keys(content.items).filter((id) => id !== "copper_ore").slice(0, cap);
    for (const id of ids) s.bank[id] = 1;
    expect(isBankFull(s, content)).toBe(true);

    addItem(s.inventory, content, "copper_ore", 5); // NEUE Art → fungibel abgelehnt
    addInstance(s.inventory, { instanceId: "inst_v", baseItemId: "copper_ore", affixes: [] });

    const res = depositBaseWithVariants(s, content, "copper_ore");
    expect(res.deposited).toBe(0); // volle Bank lehnt neue fungible Art ab (kein Verlust)
    expect(res.instancesMoved).toBe(1); // Variante wandert trotzdem in den Vault
    expect(itemCount(s.inventory, "copper_ore")).toBe(5); // Grundmenge bleibt im Inventar
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["inst_v"]);
  });
});

describe("Bank/Lager — atomare Gruppen-Ops (Task #314, depositItemGroup/withdrawItemGroup)", () => {
  it("depositItemGroup lagert Stack + ALLE Instanzen verlustfrei ein, dann zurück mit withdrawItemGroup", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "copper_ore", 30);
    addInstance(s.inventory, { instanceId: "inst_a", baseItemId: "copper_ore", affixes: [{ affixId: "affix_x", tier: 1 }] });
    addInstance(s.inventory, { instanceId: "inst_b", baseItemId: "copper_ore", affixes: [] });
    addInstance(s.inventory, { instanceId: "inst_c", baseItemId: "copper_ore", affixes: [] });
    addInstance(s.inventory, { instanceId: "inst_other", baseItemId: "iron_ore", affixes: [] }); // fremde Basis bleibt unangetastet

    const unitsBefore = usedCapacityUnits(s.inventory);
    const down = depositItemGroup(s, content, "copper_ore");
    expect(down).toEqual({ deposited: 30, instancesMoved: 3 });
    expect(bankCount(s, "copper_ore")).toBe(30);
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);
    expect(s.bankInstances.map((i) => i.instanceId).sort()).toEqual(["inst_a", "inst_b", "inst_c"]);
    expect(s.inventory.instances.map((i) => i.instanceId)).toEqual(["inst_other"]); // fremde Instanz unberührt
    // Die Basis-Item-Zelle ist frei geworden (Stack + alle Instanzen weg) — Kapazitätseinheiten sinken.
    expect(usedCapacityUnits(s.inventory)).toBeLessThan(unitsBefore);

    const up = withdrawItemGroup(s, content, "copper_ore");
    expect(up).toEqual({ withdrawn: 30, instancesMoved: 3 });
    expect(bankCount(s, "copper_ore")).toBe(0);
    expect(s.bank.copper_ore).toBeUndefined();
    expect(s.bankInstances.length).toBe(0);
    expect(itemCount(s.inventory, "copper_ore")).toBe(30);
    expect(s.inventory.instances.map((i) => i.instanceId).sort()).toEqual(["inst_a", "inst_b", "inst_c", "inst_other"]);
    expect(usedCapacityUnits(s.inventory)).toBe(unitsBefore); // rundtrip: exakt wieder der Ausgangswert
  });

  it("depositItemGroup: volle Bank OHNE bestehende Zelle lehnt die GESAMTE Gruppe ab (kein Teiltransfer)", () => {
    const s = createGame({ name: "X" }, content, 1);
    const cap = effectiveBankCapacity(s, content);
    const ids = Object.keys(content.items).filter((id) => id !== "copper_ore").slice(0, cap);
    for (const id of ids) s.bank[id] = 1;
    expect(isBankFull(s, content)).toBe(true);

    addItem(s.inventory, content, "copper_ore", 5);
    addInstance(s.inventory, { instanceId: "inst_v1", baseItemId: "copper_ore", affixes: [] });
    addInstance(s.inventory, { instanceId: "inst_v2", baseItemId: "copper_ore", affixes: [] });

    const res = depositItemGroup(s, content, "copper_ore");
    expect(res).toEqual({ deposited: 0, instancesMoved: 0 }); // GANZ oder GAR NICHT — anders als depositBaseWithVariants
    expect(itemCount(s.inventory, "copper_ore")).toBe(5); // nichts verloren
    expect(s.inventory.instances.map((i) => i.instanceId).sort()).toEqual(["inst_v1", "inst_v2"]);
    expect(s.bankInstances.length).toBe(0);
    expect(bankCount(s, "copper_ore")).toBe(0);
  });

  it("depositItemGroup: volle Bank MIT bestehender Zelle (Basis-Item schon eingelagert) nimmt die Gruppe trotzdem an", () => {
    const s = createGame({ name: "X" }, content, 1);
    const cap = effectiveBankCapacity(s, content);
    const ids = Object.keys(content.items).filter((id) => id !== "copper_ore").slice(0, cap - 1);
    for (const id of ids) s.bank[id] = 1;
    s.bank.copper_ore = 2; // bestehende Zelle für copper_ore
    expect(isBankFull(s, content)).toBe(true);

    addItem(s.inventory, content, "copper_ore", 5);
    addInstance(s.inventory, { instanceId: "inst_v", baseItemId: "copper_ore", affixes: [] });

    const res = depositItemGroup(s, content, "copper_ore");
    expect(res).toEqual({ deposited: 5, instancesMoved: 1 }); // bestehende Zelle → passt immer
    expect(bankCount(s, "copper_ore")).toBe(7);
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["inst_v"]);
  });

  it("withdrawItemGroup: volle Taschen OHNE bestehende Zelle lehnt die GESAMTE Gruppe ab (kein Verlust)", () => {
    const s = createGame({ name: "X" }, content, 1);
    // Inventar mit lauter verschiedenen, nicht-stapelbaren Items bis zur Kapazität vollstopfen.
    const cap = s.inventory.slots.length;
    for (let i = 0; i < cap; i++) s.inventory.slots[i] = { itemId: "rusty_sword", qty: 1 };
    s.bank.copper_ore = 20;
    s.bankInstances.push({ instanceId: "inst_x", baseItemId: "copper_ore", affixes: [] });

    const res = withdrawItemGroup(s, content, "copper_ore");
    expect(res).toEqual({ withdrawn: 0, instancesMoved: 0 });
    expect(bankCount(s, "copper_ore")).toBe(20); // Zelle bleibt in der Bank
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["inst_x"]);
  });

  it("depositItemGroup/withdrawItemGroup: leere Gruppe ist ein No-op", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(depositItemGroup(s, content, "copper_ore")).toEqual({ deposited: 0, instancesMoved: 0 });
    expect(withdrawItemGroup(s, content, "copper_ore")).toEqual({ withdrawn: 0, instancesMoved: 0 });
  });
});
