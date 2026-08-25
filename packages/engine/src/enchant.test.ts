import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { AffixDef, ContentDB, ItemDef } from "@hearthforge/shared";
import { effectiveInstanceWeaponEffects, instanceBonusDelta } from "@hearthforge/shared";
import { createGame } from "./state";
import { achievementProgress } from "./achievements";
import { computeStats } from "./character";
import { equipInstance, equipItem } from "./equipment";
import { addItem, itemCount, usedCapacityUnits } from "./inventory";
import { depositInstance, withdrawInstance } from "./bank";
import {
  applyEnchant,
  disenchant,
  enchantPreview,
  intakeInstance,
  mintInstanceId,
} from "./enchant";

/**
 * Test-Content mit einem Affix-Katalog + Runen-Items + Schrott-Item. Der echte Katalog kommt von
 * content-dev in Welle 2; hier injizieren wir ihn, um das Engine-Fundament headless zu prüfen.
 */
function affixContent(): ContentDB {
  const flame: AffixDef = {
    id: "affix_flame",
    prefix: { en: "Flaming", de: "Feuriges" },
    bonusByTier: [{ meleeDamage: 5 }, { meleeDamage: 10 }, { meleeDamage: 15 }],
    // Attribut-Mods auf der Input-Squish-Skala (§6.2, a=1/2): halbierte Werte, 0.5er-Raster.
    modifiersByTier: [{ str: 0.5 }, { str: 1 }, { str: 1.5 }],
    weaponEffectByTier: [
      { type: "burn", chance: 0.2, magnitude: 2, durationMs: 3000 },
      { type: "burn", chance: 0.25, magnitude: 3, durationMs: 3000 },
      { type: "burn", chance: 0.3, magnitude: 4, durationMs: 3000 },
    ],
    appliesTo: ["weapon_melee"],
  };
  const force: AffixDef = {
    id: "affix_force",
    prefix: { en: "Forceful", de: "Wuchtiges" },
    bonusByTier: [{ meleeDamage: 3 }, { meleeDamage: 6 }, { meleeDamage: 9 }],
    appliesTo: ["weapon_melee"],
  };
  const runeFlame: ItemDef = {
    id: "rune_flame_i",
    name: { en: "Flame Rune I", de: "Feuerrune I" },
    type: "material",
    stackable: true,
    rune: { affixId: "affix_flame", tier: 1 },
  };
  const runeForce: ItemDef = {
    id: "rune_force_i",
    name: { en: "Force Rune I", de: "Wuchtrune I" },
    type: "material",
    stackable: true,
    rune: { affixId: "affix_force", tier: 1 },
  };
  const scrap: ItemDef = {
    id: "item_scrap",
    name: { en: "Scrap", de: "Schrott" },
    type: "material",
    stackable: true,
    value: 1,
  };
  // Rare-Klinge (2 Affix-Slots): Fixture für die Duplikat-Sperre (#303 L4) — auf einem
  // common-Item (1 Slot) würde immer erst das Slot-Limit greifen, nie der Duplikat-Check.
  const rareBlade: ItemDef = {
    id: "test_rare_blade",
    name: { en: "Rare Blade", de: "Rare Klinge" },
    type: "equipment",
    slot: "mainhand",
    weaponStyle: "melee",
    stackable: false,
    rarity: "rare",
    bonus: { meleeDamage: 4 },
  };
  return {
    ...content,
    affixes: { affix_flame: flame, affix_force: force },
    items: {
      ...content.items,
      rune_flame_i: runeFlame,
      rune_force_i: runeForce,
      item_scrap: scrap,
      test_rare_blade: rareBlade,
    },
  };
}

function richGame(c: ContentDB) {
  const s = createGame({ name: "Ench", baseAttributes: { str: 5 } }, c, 7);
  s.character.gold = 1_000_000;
  return s;
}

describe("enchant / item instances", () => {
  it("vergibt deterministische Instanz-IDs (seq, kein uuid/Date.now)", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(mintInstanceId(s)).toBe("inst_0");
    expect(mintInstanceId(s)).toBe("inst_1");
    expect(s.nextInstanceSeq).toBe(2);
  });

  it("promotet ein plain Inventar-Item zur Instanz, zieht Rune + Gold ab", () => {
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "rusty_sword", 1); // Slot 0
    addItem(s.inventory, c, "rune_flame_i", 3); // Slot 1
    const goldBefore = s.character.gold;

    const r = applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_flame_i");
    expect(r.ok).toBe(true);
    // Instanz landet in der unbegrenzten Tasche (nicht mehr im Slot).
    const inst = s.inventory.instances[0];
    expect(inst?.baseItemId).toBe("rusty_sword");
    expect(inst?.affixes).toEqual([{ affixId: "affix_flame", tier: 1 }]);
    expect(inst?.instanceId).toBe("inst_0");
    expect(itemCount(s.inventory, "rune_flame_i")).toBe(2); // 1 Rune verbraucht
    expect(s.character.gold).toBeLessThan(goldBefore); // Gold-Kosten gezogen
  });

  it("bucht Enchant-/Disenchant-Gold in stats.goldSpent (gold_spent-Achievements zählen mit)", () => {
    // Sweep6 T10 #3: enchant.ts zog Gold ab, ohne `stats.goldSpent` mitzuzählen (inkonsistent zu
    // shop.ts/bank.ts) — gold_spent-Achievements/Statistik unterzählten den Enchant-Sink.
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "rusty_sword", 1);
    addItem(s.inventory, c, "rune_flame_i", 1);
    const goldBefore = s.character.gold;
    expect(s.stats.goldSpent).toBe(0);

    expect(applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_flame_i").ok).toBe(true);
    const enchantCost = goldBefore - s.character.gold;
    expect(enchantCost).toBeGreaterThan(0);
    expect(s.stats.goldSpent).toBe(enchantCost); // Muster shop.ts:24-25

    // Die promotete Instanz liegt jetzt in der Tasche → per instanceId adressieren.
    const id = s.inventory.instances[0]!.instanceId;
    expect(disenchant(s, c, { kind: "inventory_instance", instanceId: id }, 0).ok).toBe(true);
    const totalSpent = goldBefore - s.character.gold;
    expect(totalSpent).toBeGreaterThan(enchantCost); // Disenchant kostet ebenfalls Gold
    expect(s.stats.goldSpent).toBe(totalSpent);

    // Die gold_spent-Achievement-Metrik liest exakt diesen Zähler → Enchant-Kosten zählen mit.
    expect(achievementProgress(s, { type: "gold_spent", count: 1 })).toBe(totalSpent);
  });

  it("deckelt Affixe nach Rarity (common rusty_sword = 1 Slot)", () => {
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "rusty_sword", 1);
    addItem(s.inventory, c, "rune_flame_i", 1);
    addItem(s.inventory, c, "rune_force_i", 1);

    expect(applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_flame_i").ok).toBe(true);
    // Zweite Rune auf DIESELBE (nun in der Tasche liegende) Instanz → über instanceId.
    const id = s.inventory.instances[0]!.instanceId;
    const second = applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_force_i");
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("no_affix_slots"); // stabiler Code statt Prosa (ui rendert t(enchant.reason.*))
    expect(itemCount(s.inventory, "rune_force_i")).toBe(1); // zweite Rune NICHT verbraucht
  });

  it("scheitert ohne genug Gold (Rune bleibt erhalten, keine Müll-Instanz)", () => {
    const c = affixContent();
    const s = richGame(c);
    s.character.gold = 0;
    addItem(s.inventory, c, "rusty_sword", 1);
    addItem(s.inventory, c, "rune_flame_i", 1);

    const r = applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_flame_i");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("not_enough_gold"); // stabiler Code, keine DE-Prosa
    // Promotion zurückgerollt: keine Instanz in der Tasche, das plain Schwert ist zurück.
    expect(s.inventory.instances).toHaveLength(0);
    expect(itemCount(s.inventory, "rusty_sword")).toBe(1);
    expect(itemCount(s.inventory, "rune_flame_i")).toBe(1);
  });

  it("computeStats-Overlay: Affix-Boni einer ausgerüsteten Instanz greifen", () => {
    const c = affixContent();
    // Referenz: plain rusty_sword ausgerüstet.
    const plain = richGame(c);
    addItem(plain.inventory, c, "rusty_sword", 1);
    equipItem(plain, c, "rusty_sword");
    const base = computeStats(plain, c);

    // Verzaubert: Instanz mit affix_flame T1 (+5 meleeDamage, +0.5 str) ausgerüstet.
    const ench = richGame(c);
    addItem(ench.inventory, c, "rusty_sword", 1);
    addItem(ench.inventory, c, "rune_flame_i", 1);
    applyEnchant(ench, c, { kind: "inventory", index: 0 }, "rune_flame_i");
    const enchId = ench.inventory.instances[0]!.instanceId;
    expect(equipInstance(ench, c, enchId).ok).toBe(true);
    expect(ench.character.equippedInstances.mainhand?.affixes.length).toBe(1);
    const buffed = computeStats(ench, c);

    // +5 flat meleeDamage UND +0.5 str (str·0.3 = +0.15) → spürbar höher als die Basis.
    expect(buffed.meleeDamage).toBeGreaterThan(base.meleeDamage + 5);
    expect(buffed.attributes.str).toBe(base.attributes.str + 0.5);
  });

  it("disenchant entfernt den Affix und degradiert zurück zum plain Item", () => {
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "rusty_sword", 1);
    addItem(s.inventory, c, "rune_flame_i", 1);
    applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_flame_i");
    expect(s.inventory.instances).toHaveLength(1);
    const id = s.inventory.instances[0]!.instanceId;

    const r = disenchant(s, c, { kind: "inventory_instance", instanceId: id }, 0);
    expect(r.ok).toBe(true);
    expect(s.inventory.instances).toHaveLength(0); // wieder plain
    expect(itemCount(s.inventory, "rusty_sword")).toBe(1);
  });

  // salvageInstance: GELÖSCHT (#278) — kein Salvage mehr, ungewollte Items werden verkauft.

  // Bank-Instanzverwaltung (bewusstes Spieler-Feature, ehemals „Gear-Vault"-Aliase):
  it("Bank-Instanzen: Deposit aus dem Inventar + Withdraw zurück", () => {
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "rusty_sword", 1);
    addItem(s.inventory, c, "rune_flame_i", 1);
    applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_flame_i");
    const invId = s.inventory.instances[0]!.instanceId;

    expect(depositInstance(s, invId)).toBe(true);
    expect(s.bankInstances).toHaveLength(1);
    expect(s.inventory.instances).toHaveLength(0);
    const id = s.bankInstances[0]!.instanceId;

    expect(withdrawInstance(s, id)).toBe(true);
    expect(s.bankInstances).toHaveLength(0);
    expect(s.inventory.instances.some((i) => i.instanceId === id)).toBe(true);
  });

  // ── intakeInstance nach Task #271 (Auto-Salvage ENTFERNT): behält IMMER ────
  it("intakeInstance: frische Instanz landet immer im Inventar (kein Auto-Salvage mehr)", () => {
    const c = affixContent();
    const s = richGame(c);
    const inst = { instanceId: mintInstanceId(s), baseItemId: "rusty_sword", affixes: [] };

    const r = intakeInstance(s, c, inst);
    expect(r.kept).toBe(true);
    expect(s.inventory.instances.some((i) => i.instanceId === inst.instanceId)).toBe(true);
  });

  it("intakeInstance ignoriert ein Legacy-autoSalvage-Flag im Save: schwache Instanz wird BEHALTEN", () => {
    // Guard gegen Wiedereinführung: selbst wenn ein Alt-Save das (deprecated) Flag noch trüge,
    // darf keine Instanz mehr zerlegt werden — sie landet unverändert in der Tasche.
    const c = affixContent();
    const s = richGame(c);
    (s.settings as { autoSalvage?: boolean }).autoSalvage = true;
    const goldBefore = s.character.gold;
    const junk = {
      instanceId: mintInstanceId(s),
      baseItemId: "rusty_sword",
      affixes: [{ affixId: "affix_flame", tier: 1 }],
    };

    const r = intakeInstance(s, c, junk);
    expect(r.kept).toBe(true);
    expect(s.inventory.instances.some((i) => i.instanceId === junk.instanceId)).toBe(true);
    // KEIN Salvage-Nebeneffekt: kein Basis-Item/Schrott/Gold gutgeschrieben.
    expect(itemCount(s.inventory, "rusty_sword")).toBe(0);
    expect(itemCount(s.inventory, "item_scrap")).toBe(0);
    expect(s.character.gold).toBe(goldBefore);
    expect(s.bankInstances).toHaveLength(0);
  });

  // ── Kapazitäts-Gate (Chef-Bugfix „22/20", 2026-07-23) ──────────────────────────────────────────
  // Ersetzt die frühere #246-Erwartung „die Tasche ist unbegrenzt, ein volles Slot-Gitter erzeugt
  // NIE Overflow": genau DAS bedingungslose Verhalten liess das Inventar-Grid optisch unbegrenzt über
  // die Kapazität hinaus „überlaufen" (die UI rendert je Basis-Item OHNE plain Stack-Sibling eine
  // zusätzliche Container-Zelle — bei vollem Slot-Gitter + N Instanz-Drops N zusätzliche Zellen ÜBER
  // der angezeigten Kapazität, live als „22/20" gemeldet). Jetzt: volles Slot-Gitter ⇒ kein
  // `hasInstanceRoom` mehr ⇒ Overflow in den (unbegrenzten) Gear-Vault `bankInstances`, GENAU wie
  // `addItemOrBank` es für stapelbare Items via Bank macht.
  it("intakeInstance: volles Slot-Gitter → Instanz geht in den Gear-Vault (bankInstances), NICHT in die Tasche", () => {
    const c = affixContent();
    const s = richGame(c);
    for (let i = 0; i < s.inventory.slots.length; i++) s.inventory.slots[i] = { itemId: "oak_log", qty: 1 };
    const inst = { instanceId: mintInstanceId(s), baseItemId: "rusty_sword", affixes: [] };

    const r = intakeInstance(s, c, inst);
    expect(r.kept).toBe(true); // nicht verloren
    expect(s.inventory.instances).toHaveLength(0); // NICHT in der (jetzt kapazitätsgesperrten) Tasche
    expect(s.bankInstances.map((i) => i.instanceId)).toContain(inst.instanceId); // im Gear-Vault
    // Erst-Besitz-Marker greift trotz Vault-Umleitung (Aufrufer prüft nicht, WOHIN es floss).
    expect(s.discoveredItems["rusty_sword"]).toBe(true);
  });

  it("intakeInstance: viele Drops bei vollem Slot-Gitter → ALLE im Gear-Vault, kein Phantom-Verlust", () => {
    const c = affixContent();
    const s = richGame(c);
    for (let i = 0; i < s.inventory.slots.length; i++) s.inventory.slots[i] = { itemId: "oak_log", qty: 1 };

    const N = 20;
    let kept = 0;
    for (let i = 0; i < N; i++) {
      const inst = { instanceId: mintInstanceId(s), baseItemId: "rusty_sword", affixes: [] };
      if (intakeInstance(s, c, inst).kept) kept++;
    }
    expect(kept).toBe(N); // 20/20 behalten — nichts verloren
    // Alle 20 Drops teilen dieselbe Basis-Art ("rusty_sword") — unter der Zellen-Semantik (Follow-up
    // 23.07.) würden sie sich normalerweise EINE Zelle teilen, sobald die erste drin ist. Hier bleibt
    // die Tasche aber die GANZE Zeit leer: das Slot-Gitter war schon zu Beginn 100% voll, also hat
    // "rusty_sword" NIE eine erste Zelle bekommen — jeder Drop sieht dieselbe „keine Zelle, keine
    // Kapazität" Lage und überläuft in den Vault. (Der Zellen-teilen-sich-Fall ist unten dediziert
    // getestet.)
    expect(s.inventory.instances).toHaveLength(0); // Tasche bleibt leer (Slot-Gitter war schon voll)
    expect(s.bankInstances).toHaveLength(N); // ALLE im unbegrenzten Gear-Vault
  });

  it("intakeInstance: Zellen-Semantik — eine weitere Instanz einer BEKANNTEN Basis-Art teilt sich die Zelle (immer erlaubt), eine BRANDNEUE Basis-Art überläuft erst bei voller Kapazität in den Vault", () => {
    const c = affixContent();
    const s = richGame(c);
    const cap = s.inventory.slots.length; // 20
    // 17 distinkte plain Stack-Slots + 2 distinkte Instanz-Basis-Arten (je bereits >1 Exemplar) = 19
    // Zellen — 1 Zelle bleibt frei. Erst komplett leeren (Starter-Kit-Slots raus), dann deterministisch
    // befüllen.
    s.inventory.slots.fill(null);
    for (let i = 0; i < cap - 3; i++) s.inventory.slots[i] = { itemId: `filler_${i}`, qty: 1 };
    intakeInstance(s, c, { instanceId: mintInstanceId(s), baseItemId: "rusty_sword", affixes: [] });
    intakeInstance(s, c, { instanceId: mintInstanceId(s), baseItemId: "rusty_sword", affixes: [] }); // teilt sich die Zelle
    intakeInstance(s, c, { instanceId: mintInstanceId(s), baseItemId: "test_rare_blade", affixes: [] });
    expect(s.inventory.instances).toHaveLength(3); // 3 Instanzen …
    expect(s.bankInstances).toHaveLength(0);
    expect(usedCapacityUnits(s.inventory)).toBe(cap - 3 + 2); // … aber nur 2 ZUSÄTZLICHE Zellen = 19
    expect(usedCapacityUnits(s.inventory)).toBeLessThan(cap); // noch 1 Zelle frei

    // Eine WEITERE Instanz einer BEKANNTEN Basis-Art (rusty_sword) teilt sich die Zelle — verbraucht
    // NICHT die letzte freie Zelle.
    const known = { instanceId: mintInstanceId(s), baseItemId: "rusty_sword", affixes: [] };
    intakeInstance(s, c, known);
    expect(s.inventory.instances.some((i) => i.instanceId === known.instanceId)).toBe(true);
    expect(usedCapacityUnits(s.inventory)).toBe(cap - 3 + 2); // unverändert — noch 1 Zelle frei

    // Eine BRANDNEUE Basis-Art verbraucht jetzt die letzte freie Zelle.
    const newBase = { instanceId: mintInstanceId(s), baseItemId: "gnarled_staff", affixes: [] };
    intakeInstance(s, c, newBase);
    expect(s.inventory.instances.some((i) => i.instanceId === newBase.instanceId)).toBe(true);
    expect(usedCapacityUnits(s.inventory)).toBe(cap); // jetzt exakt voll

    // Eine weitere BRANDNEUE Basis-Art hat keine Zelle mehr frei → Gear-Vault.
    const overflow = { instanceId: mintInstanceId(s), baseItemId: "copper_shortbow", affixes: [] };
    intakeInstance(s, c, overflow);
    expect(s.inventory.instances.some((i) => i.instanceId === overflow.instanceId)).toBe(false);
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual([overflow.instanceId]);

    // Trotzdem: eine weitere Instanz einer bereits etablierten Basis-Art (test_rare_blade) teilt sich
    // weiterhin ihre bestehende Zelle, OBWOHL die Tasche jetzt exakt voll ist.
    const stillShared = { instanceId: mintInstanceId(s), baseItemId: "test_rare_blade", affixes: [] };
    intakeInstance(s, c, stillShared);
    expect(s.inventory.instances.some((i) => i.instanceId === stillShared.instanceId)).toBe(true);
    expect(usedCapacityUnits(s.inventory)).toBe(cap); // weiterhin unverändert
  });

  // ── Runen stapeln (Chef-Entscheid 25.08.2026) ───────────────────────────────
  // Bis 25.08.2026 sperrte eine red-team-Vorsichtsmassnahme (L4, Task #303) dieselbe Affix-
  // Identitaet ein zweites Mal. Ein Spieler meldete das als Fehler: "armor have 3 slots, but you
  // can only put in 1 enchantment rune". Er hatte recht — wer drei gleiche Runen besass, konnte
  // nur eine anbringen. Die Sperre ist gefallen; diese Tests bewachen jetzt das Gegenteil.
  it("stapelt dieselbe STAT-Rune mehrfach — pro Anwendung eine Rune und einmal Gold", () => {
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "test_rare_blade", 1); // rare = 2 Slots
    addItem(s.inventory, c, "rune_force_i", 2); // reine Stat-Rune (+3 Nahkampfschaden)
    const goldStart = s.character.gold;

    expect(applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_force_i").ok).toBe(true);
    const id = s.inventory.instances[0]!.instanceId;
    const goldNachErster = s.character.gold;

    const zweite = applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_force_i");
    expect(zweite.ok).toBe(true);
    expect(s.inventory.instances[0]!.affixes).toEqual([
      { affixId: "affix_force", tier: 1 },
      { affixId: "affix_force", tier: 1 },
    ]);
    // Kein Gratis-Stapeln: beide Runen verbraucht, beide Male derselbe Goldpreis.
    expect(itemCount(s.inventory, "rune_force_i")).toBe(0);
    expect(goldStart - goldNachErster).toBe(goldNachErster - s.character.gold);

    // Die Boni summieren sich — das ist der Sinn der Sache: ein Build-Entscheid ("alles auf
    // Wucht") gegen zwei verschiedene kleinere Boni.
    expect(instanceBonusDelta(s.inventory.instances[0]!, c).bonus.meleeDamage).toBe(6); // 2 × +3

    // Das Slot-Limit der Rarity bleibt die Mengenschranke.
    addItem(s.inventory, c, "rune_force_i", 1);
    const dritte = applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_force_i");
    expect(dritte.ok).toBe(false);
    expect(dritte.reason).toBe("no_affix_slots");
    expect(itemCount(s.inventory, "rune_force_i")).toBe(1); // Fehlversuch kostet nichts
  });

  // ── Aktiv-Effekt-Runen bleiben einmalig (Chef-Nachentscheid 25.08.2026) ──────────
  // Beim Oeffnen der Duplikat-Sperre gingen ZU VIELE Runen durch: "jetzt gehen so Effekt Runen
  // wie Flaming zweimal, AKTIV Effekt Runen sollten trotzdem nur einmal applizierbar sein".
  // Im Katalog tragen genau drei Affixe einen Proc (flame/frost/shock) — und genau die tragen
  // KEINEN Stat-Bonus. Eine zweite gaebe also nichts, bei vollem Rune- und Goldpreis.
  it("verweigert eine zweite Aktiv-Effekt-Rune — OHNE Rune-/Gold-Kosten", () => {
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "test_rare_blade", 1); // rare = 2 Slots, das Limit greift NICHT zuerst
    addItem(s.inventory, c, "rune_flame_i", 2);

    expect(applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_flame_i").ok).toBe(true);
    const id = s.inventory.instances[0]!.instanceId;
    const goldNachErster = s.character.gold;
    const spentNachErster = s.stats.goldSpent;

    const zweite = applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_flame_i");
    expect(zweite.ok).toBe(false);
    expect(zweite.reason).toBe("duplicate_effect");
    // Kein Verlust: Rune bleibt im Inventar, kein Gold gebucht, Instanz unveraendert.
    expect(itemCount(s.inventory, "rune_flame_i")).toBe(1);
    expect(s.character.gold).toBe(goldNachErster);
    expect(s.stats.goldSpent).toBe(spentNachErster);
    expect(s.inventory.instances[0]!.affixes).toEqual([{ affixId: "affix_flame", tier: 1 }]);

    // Der zweite Slot nimmt eine STAT-Rune weiterhin normal auf.
    addItem(s.inventory, c, "rune_force_i", 1);
    expect(applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_force_i").ok).toBe(true);
    expect(s.inventory.instances[0]!.affixes.map((a) => a.affixId)).toEqual(["affix_flame", "affix_force"]);
  });

  // Der Schleichweg: verschiedene TIERS derselben Proc-Rune haetten unterschiedliche
  // Chance/Staerke, wuerden die Proc-Entdopplung also passieren und BEIDE feuern. Deshalb greift
  // die Regel ueber die Affix-Identitaet, nicht ueber das Tier.
  it("die Einmaligkeit gilt TIER-uebergreifend: Flamme III neben Flamme I wird verweigert", () => {
    const c = affixContent();
    (c.items as Record<string, ItemDef>).rune_flame_iii = {
      id: "rune_flame_iii",
      name: { en: "Flame Rune III", de: "Feuerrune III" },
      type: "material",
      stackable: true,
      rune: { affixId: "affix_flame", tier: 3 },
    };
    const s = richGame(c);
    addItem(s.inventory, c, "test_rare_blade", 1);
    addItem(s.inventory, c, "rune_flame_i", 1);
    addItem(s.inventory, c, "rune_flame_iii", 1);

    expect(applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_flame_i").ok).toBe(true);
    const id = s.inventory.instances[0]!.instanceId;
    const upgrade = applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_flame_iii");
    expect(upgrade.ok).toBe(false);
    expect(upgrade.reason).toBe("duplicate_effect");
    expect(itemCount(s.inventory, "rune_flame_iii")).toBe(1);

    // Der dokumentierte Upgrade-Pfad bleibt: disenchanten, dann Tier III frisch anbringen.
    expect(disenchant(s, c, { kind: "inventory_instance", instanceId: id }, 0).ok).toBe(true);
    const slotIdx = s.inventory.slots.findIndex((sl) => sl?.itemId === "test_rare_blade");
    expect(slotIdx).toBeGreaterThanOrEqual(0);
    expect(applyEnchant(s, c, { kind: "inventory", index: slotIdx }, "rune_flame_iii").ok).toBe(true);
    expect(s.inventory.instances[0]!.affixes).toEqual([{ affixId: "affix_flame", tier: 3 }]);
  });

  // Gegenprobe zur Regel: WAERE eine Proc-Rune doppelt drauf (Alt-Save von vor dem
  // Nachentscheid), wirkt sie trotzdem nur einmal — die Entdopplung in shared bleibt die zweite
  // Verteidigungslinie und wird hier festgenagelt.
  it("doppelte Proc-Affixe aus einem Alt-Save geben trotzdem nur EINEN Proc", () => {
    const c = affixContent();
    const inst = {
      instanceId: "t-altsave-proc",
      baseItemId: "test_rare_blade",
      affixes: [
        { affixId: "affix_flame", tier: 1 },
        { affixId: "affix_flame", tier: 1 },
      ],
    };
    const procs = effectiveInstanceWeaponEffects(inst, c.items[inst.baseItemId], c);
    expect(procs.filter((e) => e.type === "burn")).toHaveLength(1);
  });

  it("stapelt Stat-Runen auch über Tiers hinweg: Wucht III neben Wucht I, beide wirken", () => {
    const c = affixContent();
    (c.items as Record<string, ItemDef>).rune_force_iii = {
      id: "rune_force_iii",
      name: { en: "Force Rune III", de: "Wuchtrune III" },
      type: "material",
      stackable: true,
      rune: { affixId: "affix_force", tier: 3 },
    };
    const s = richGame(c);
    addItem(s.inventory, c, "test_rare_blade", 1);
    addItem(s.inventory, c, "rune_force_i", 1);
    addItem(s.inventory, c, "rune_force_iii", 1);

    expect(applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_force_i").ok).toBe(true);
    const id = s.inventory.instances[0]!.instanceId;
    expect(applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_force_iii").ok).toBe(true);
    expect(s.inventory.instances[0]!.affixes).toEqual([
      { affixId: "affix_force", tier: 1 },
      { affixId: "affix_force", tier: 3 },
    ]);
    // 3 + 9 — beide Tiers wirken nebeneinander.
    expect(instanceBonusDelta(s.inventory.instances[0]!, c).bonus.meleeDamage).toBe(12);
  });

  it("enchantPreview spiegelt beide Regeln: Stat-Rune stapelt, Proc-Rune nicht", () => {
    const c = affixContent();
    const mitProc = {
      instanceId: "t-prev-proc",
      baseItemId: "test_rare_blade", // rare = 2 Slots, einer belegt
      affixes: [{ affixId: "affix_flame", tier: 1 }],
    };
    // Dieselbe Proc-Rune ein zweites Mal: blockiert, mit dem sprechenden Grund.
    const blockiert = enchantPreview(c, mitProc, "rune_flame_i");
    expect(blockiert.canApply).toBe(false);
    expect(blockiert.blockedReason).toBe("duplicate_effect");
    // Slot-Override auf DENSELBEN Slot ist kein zweites Vorkommen (after == before).
    expect(enchantPreview(c, mitProc, "rune_flame_i", 0).canApply).toBe(true);
    // Eine Stat-Rune belegt den freien Slot normal.
    expect(enchantPreview(c, mitProc, "rune_force_i").canApply).toBe(true);

    // Stat-Rune auf Stat-Rune: erlaubt, bis das Slot-Limit greift.
    const mitStat = {
      instanceId: "t-prev-stat",
      baseItemId: "test_rare_blade",
      affixes: [{ affixId: "affix_force", tier: 1 }],
    };
    expect(enchantPreview(c, mitStat, "rune_force_i").canApply).toBe(true);
    const voll = { ...mitStat, affixes: [...mitStat.affixes, { affixId: "affix_force", tier: 1 }] };
    const zu = enchantPreview(c, voll, "rune_force_i");
    expect(zu.canApply).toBe(false);
    expect(zu.blockedReason).toBe("slot_full");
    expect(enchantPreview(c, voll, "rune_force_i", 0).canApply).toBe(true);
  });

  it("Alt-Save-Instanz mit doppelter Stat-Rune: laedt, wirkt doppelt, ist jetzt der Normalfall", () => {
    const c = affixContent();
    const s = richGame(c);
    // Solche Instanzen entstanden vor #303 und wurden waehrend der Sperre nur GEDULDET. Seit dem
    // Chef-Entscheid sind sie fuer Stat-Runen regulaer erzeugbar — der Ladepfad muss sie
    // unangetastet lassen (keine nachtraegliche Saeuberung, Save-Kompat in beide Richtungen).
    const dup = {
      instanceId: mintInstanceId(s),
      baseItemId: "test_rare_blade",
      affixes: [
        { affixId: "affix_force", tier: 1 },
        { affixId: "affix_force", tier: 1 },
      ],
    };
    s.inventory.instances.push(dup);
    expect(equipInstance(s, c, dup.instanceId).ok).toBe(true);
    expect(instanceBonusDelta(dup, c).bonus.meleeDamage).toBe(6);

    // Eine dritte scheitert am Slot-Limit der Rarity.
    addItem(s.inventory, c, "rune_force_i", 1);
    const r = applyEnchant(s, c, { kind: "equipment", slot: "mainhand" }, "rune_force_i");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no_affix_slots");
  });

  // Spieler-Report 1.0.2: "Allow Enchantment Runes to be applied from Storage and not limited to
  // only inventory." Runen sind Sammelware — wer 30 Sorten hat, lagert sie ein.
  it("nimmt die Rune auch aus dem Lager — und das Inventar zuerst, wenn beides da ist", () => {
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "rusty_sword", 1);
    s.bank.rune_force_i = 2; // nur im Lager, nichts im Inventar (Stat-Rune: darf stapeln)

    expect(applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_force_i").ok).toBe(true);
    expect(s.bank.rune_force_i).toBe(1);
    expect(s.inventory.instances[0]!.affixes).toEqual([{ affixId: "affix_force", tier: 1 }]);

    // Liegt eine Rune im Inventar, wird DIE verbraucht und das Lager bleibt unangetastet.
    addItem(s.inventory, c, "test_rare_blade", 1);
    addItem(s.inventory, c, "rune_force_i", 1);
    const idx = s.inventory.slots.findIndex((sl) => sl?.itemId === "test_rare_blade");
    expect(applyEnchant(s, c, { kind: "inventory", index: idx }, "rune_force_i").ok).toBe(true);
    expect(itemCount(s.inventory, "rune_force_i")).toBe(0);
    expect(s.bank.rune_force_i).toBe(1); // unangetastet

    // Die letzte Lager-Rune raeumt ihren Schluessel ab — ein 0-qty-Geist wuerde einen Lager-Slot
    // belegen (dieselbe Regel wie withdrawItem in bank.ts).
    const id = s.inventory.instances[1]!.instanceId;
    expect(applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_force_i").ok).toBe(true);
    expect(s.bank.rune_force_i).toBeUndefined();

    // Nichts mehr da: sauberer Fehlschlag, kein Gold weg.
    const gold = s.character.gold;
    const leer = applyEnchant(s, c, { kind: "inventory_instance", instanceId: id }, "rune_force_i");
    expect(leer.ok).toBe(false);
    expect(leer.reason).toBe("not_found");
    expect(s.character.gold).toBe(gold);
  });

  it("enchant am ausgerüsteten Item: equipment[slot] bleibt Basis-ID, Instanz wandert in equippedInstances", () => {
    const c = affixContent();
    const s = richGame(c); // createGame rüstet rusty_sword bereits im Mainhand aus
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    addItem(s.inventory, c, "rune_flame_i", 1);

    const r = applyEnchant(s, c, { kind: "equipment", slot: "mainhand" }, "rune_flame_i");
    expect(r.ok).toBe(true);
    expect(s.character.equippedInstances.mainhand?.affixes.length).toBe(1);
    // equipment[slot] hält weiter die Basis-ID (Equipment-lesender Code unverändert).
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
  });

  it("Stats-Memo-Guard: In-place-Enchant einer AUSGERÜSTETEN Instanz schlägt sofort auf computeStats durch", () => {
    // Regression-Guard für den transienten computeStats-Memo (PERF 2026-07-22): applyEnchant
    // mutiert die ausgerüstete Instanz IN PLACE (affixes.push) — der Fingerprint muss die Instanz
    // deshalb INHALTLICH (nicht per Referenz) erfassen, sonst käme hier der gecachte Alt-Wert.
    const c = affixContent();
    const s = richGame(c);
    addItem(s.inventory, c, "rune_flame_i", 2);

    // 1. Cache primen (plain rusty_sword ausgerüstet).
    const base = computeStats(s, c);

    // 2. Enchant direkt am AUSGERÜSTETEN Item (promotet zur Instanz + affixes.push in place).
    expect(applyEnchant(s, c, { kind: "equipment", slot: "mainhand" }, "rune_flame_i").ok).toBe(true);
    const buffed = computeStats(s, c);
    expect(buffed.attributes.str).toBe(base.attributes.str + 0.5); // +0.5 str aus affix_flame T1
    expect(buffed.meleeDamage).toBeGreaterThan(base.meleeDamage);

    // 3. ZWEITER In-place-Push auf DIESELBE (jetzt bestehende) Instanz-Referenz — der harte Fall:
    //    die Objekt-Identität bleibt gleich, nur der Inhalt wächst. Runen duerfen inzwischen
    //    gestapelt werden, hier greift aber das Slot-Limit: das ausgerüstete rusty_sword ist
    //    common und hat genau EINEN Affix-Slot. Also über disenchant + erneut anbringen —
    //    beides mutiert die Instanz-Struktur in place.
    const inst = s.character.equippedInstances.mainhand!;
    expect(applyEnchant(s, c, { kind: "equipment", slot: "mainhand" }, "rune_flame_i").reason).toBe(
      "no_affix_slots",
    );
    // disenchant OHNE verbleibende Affixe degradiert zurück zum plain Item → Stats auf Basis.
    disenchant(s, c, { kind: "equipment", slot: "mainhand" }, 0);
    const back = computeStats(s, c);
    expect(back.attributes.str).toBe(base.attributes.str);
    expect(inst.affixes.length).toBe(0); // die Mutation passierte wirklich in place
  });
});

/**
 * Trinity-Rüstungs-Runen (AffixDef.trinityByTier, §6.1/§6.2) + Enchant-Vorschau (§8.2). Test-Content
 * injiziert eine Schutz-Rune (armorRating) + eine Platte + einen Stoff-Helm, um Faltung, Klassen-Gate
 * und `enchantPreview` headless gegen den echten computeStats/applyEnchant-Pfad zu prüfen.
 */
function trinityContent(): ContentDB {
  const aegis: AffixDef = {
    id: "affix_aegis",
    prefix: { en: "Aegis", de: "Ägide" },
    bonusByTier: [{}, {}, {}],
    trinityByTier: [{ armorRating: 6 }, { armorRating: 12 }, { armorRating: 20 }],
    appliesTo: ["armor"],
  };
  const runeAegisIii: ItemDef = {
    id: "rune_aegis_iii",
    name: { en: "Rune of the Aegis III", de: "Rune der Ägide III" },
    type: "material",
    stackable: true,
    rune: { affixId: "affix_aegis", tier: 3 },
  };
  const plateHelm: ItemDef = {
    id: "test_plate_helm",
    name: { en: "Plate Helm", de: "Plattenhelm" },
    type: "equipment",
    slot: "helmet",
    stackable: false,
    armorRating: 50,
  };
  const clothHat: ItemDef = {
    id: "test_cloth_hat",
    name: { en: "Cloth Hat", de: "Stoffhut" },
    type: "equipment",
    slot: "helmet",
    stackable: false,
    wardCapacity: 30,
  };
  return {
    ...content,
    affixes: { affix_aegis: aegis },
    items: {
      ...content.items,
      rune_aegis_iii: runeAegisIii,
      test_plate_helm: plateHelm,
      test_cloth_hat: clothHat,
    },
  };
}

describe("enchant / Trinity-Runen + Vorschau", () => {
  it("faltet AffixDef.trinityByTier über computeStats in armorRating (Schutz-Rune auf Platte)", () => {
    const c = trinityContent();
    const s = richGame(c);
    addItem(s.inventory, c, "test_plate_helm", 1);
    addItem(s.inventory, c, "rune_aegis_iii", 1);
    equipItem(s, c, "test_plate_helm");
    const before = computeStats(s, c).armorRating;

    const r = applyEnchant(s, c, { kind: "equipment", slot: "helmet" }, "rune_aegis_iii");
    expect(r.ok).toBe(true);
    // Basis 50 + Rune T3 (+20) = 70.
    expect(computeStats(s, c).armorRating).toBe(before + 20);
  });

  it("Klassen-Gate: armorRating-Rune haftet NICHT auf Stoff (wardCapacity>0, armorRating=0)", () => {
    const c = trinityContent();
    const s = richGame(c);
    addItem(s.inventory, c, "test_cloth_hat", 1); // Slot 0
    addItem(s.inventory, c, "rune_aegis_iii", 1);

    const r = applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_aegis_iii");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("class_mismatch");
    // Fehlversuch degradiert die Instanz-Promotion wieder → plain Item bleibt, Tasche leer.
    expect(s.inventory.instances).toHaveLength(0);
    expect(itemCount(s.inventory, "test_cloth_hat")).toBe(1);
  });

  it("enchantPreview spiegelt applyAffix: before/after/changedKeys für die Schutz-Rune auf Platte", () => {
    const c = trinityContent();
    const plate = c.items["test_plate_helm"]!;
    const preview = enchantPreview(c, plate, "rune_aegis_iii");
    expect(preview.canApply).toBe(true);
    expect(preview.before.trinity.armorRating).toBe(50);
    expect(preview.after.trinity.armorRating).toBe(70);
    expect(preview.changedKeys).toContain("armorRating");
    expect(preview.addedProcs).toHaveLength(0);
    expect(preview.effectParts).toContain("+20 armorRating");
  });

  it("enchantPreview: Klassen-Gate blockt die Schutz-Rune auf Stoff (canApply=false, class_mismatch)", () => {
    const c = trinityContent();
    const cloth = c.items["test_cloth_hat"]!;
    const preview = enchantPreview(c, cloth, "rune_aegis_iii");
    expect(preview.canApply).toBe(false);
    expect(preview.blockedReason).toBe("class_mismatch");
    // Diff wird trotzdem berechnet (Panel zeigt das theoretische Delta grau), aber blockiert.
    expect(preview.after.trinity.armorRating).toBe(preview.before.trinity.armorRating + 20);
  });

  it("enchantPreview after == echter instanceBonusDelta-Beitrag nach applyEnchant (Spiegel-Garantie)", () => {
    const c = trinityContent();
    const s = richGame(c);
    addItem(s.inventory, c, "test_plate_helm", 1); // Slot 0
    addItem(s.inventory, c, "rune_aegis_iii", 1);
    const plate = c.items["test_plate_helm"]!;
    const previewAfter = enchantPreview(c, plate, "rune_aegis_iii").after.trinity.armorRating;

    const r = applyEnchant(s, c, { kind: "inventory", index: 0 }, "rune_aegis_iii");
    expect(r.ok).toBe(true);
    const inst = s.inventory.instances[0]!;
    const delta = instanceBonusDelta(inst, c);
    // Vorschau-„after" = Basis-armorRating (50) + echter Delta-Beitrag der angebrachten Rune.
    expect(previewAfter).toBe((plate.armorRating ?? 0) + delta.trinity.armorRating);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Welle TT (Chef-Entscheid 2026-07-18): „Enchanting geht in Runecrafting mit rein."
// Es gibt FINAL keinen eigenen Enchanting-Skill — die Verzauberungs-Progression gehört zu
// Runecrafting (enchantment-system-rework-spec §F, Frage „Welcher Skill craftet die Runen?").
// Der Level-Gate der Spec (EnchantDef.levelRequired / AffixDef.levelByTier, „Runecrafting-Level
// zum Anwenden") ist im implementierten System BEWUSST am einzigen Beschaffungspfad verankert:
// jede Affix-Rune entsteht ausschließlich über eine Runecrafting-Aktion mit levelRequired —
// wer die Rune besitzt, hat das Runecrafting-Level ihres Tiers bereits nachgewiesen. Ein
// ZWEITER Gate am Verzauberungstisch (applyEnchant) wäre redundant und ist bewusst nicht
// implementiert (minimal-invasive Lesart). Diese Suite pinnt genau diese Invariante: reißt
// sie, hat jemand eine Nicht-Runecrafting-Quelle für Enchant-Runen eingeführt — dann muss
// der Tisch-Gate-Entscheid neu bewertet werden (CEO).
// ───────────────────────────────────────────────────────────────────────────
describe("Runecrafting-Integration des Enchantings (Chef-Entscheid 2026-07-18, Live-Content)", () => {
  it("es gibt keinen eigenen Enchanting-Skill (Verzauberungs-Progression = Runecrafting)", () => {
    expect(content.skills["enchanting"]).toBeUndefined();
  });

  it("JEDE Affix-Rune hat ≥1 Runecrafting-Quelle und KEINE Quelle außerhalb Runecraftings", () => {
    const runeIds = new Set(
      Object.values(content.items)
        .filter((it) => it.rune)
        .map((it) => it.id),
    );
    expect(runeIds.size).toBeGreaterThan(0); // Detektor: Runen-Katalog existiert

    // (a) Aktionen: jede Loot-Quelle einer Rune ist eine Runecrafting-Aktion mit Level-Gate.
    const rcSources = new Map<string, number>(); // runeId → Anzahl RC-Quellen
    for (const a of Object.values(content.actions)) {
      for (const l of a.loot ?? []) {
        if (!runeIds.has(l.itemId)) continue;
        expect(a.skill, `Aktion ${a.id} loott Rune ${l.itemId} — muss runecrafting sein`).toBe("runecrafting");
        expect(a.levelRequired ?? 0, `Aktion ${a.id} braucht ein Runecrafting-Level-Gate`).toBeGreaterThan(0);
        rcSources.set(l.itemId, (rcSources.get(l.itemId) ?? 0) + 1);
      }
    }
    for (const id of runeIds) {
      expect(rcSources.get(id) ?? 0, `Rune ${id} braucht mindestens eine Runecrafting-Craft-Aktion`).toBeGreaterThan(0);
    }

    // (b) Alle übrigen Quell-Pfade sind runenfrei: Monster-Loot, Shop, Slayer-Shop,
    //     Dungeon-Clear-Loot + Dungeon-Truhen, Quest-Rewards, Crop-Erträge, Paragon-Truhen.
    const offenders: string[] = [];
    const check = (itemId: string, where: string): void => {
      if (runeIds.has(itemId)) offenders.push(`${itemId} @ ${where}`);
    };
    for (const m of Object.values(content.monsters)) {
      for (const l of m.loot ?? []) check(l.itemId, `monster ${m.id}`);
    }
    for (const s of content.shop ?? []) check(s.itemId, "shop");
    for (const s of content.slayerShop ?? []) check(s.itemId, "slayerShop");
    for (const d of content.dungeons ?? []) {
      for (const l of d.loot ?? []) check(l.itemId, `dungeon ${d.id} loot`);
      for (const l of d.chest?.loot ?? []) check(l.itemId, `dungeon ${d.id} chest`);
    }
    for (const q of content.quests ?? []) {
      for (const r of q.rewards.items ?? []) check(r.id, `quest ${q.id}`);
    }
    for (const c of Object.values(content.crops ?? {})) check(c.yieldItem, `crop ${c.id}`);
    for (const t of content.paragon?.chest ?? []) {
      for (const l of t.loot) check(l.itemId, "paragon chest");
    }
    expect(offenders, `Enchant-Runen außerhalb Runecraftings gefunden: ${offenders.join(", ")}`).toEqual([]);
  });
});
