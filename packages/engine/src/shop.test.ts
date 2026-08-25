import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  AUTO_EAT_MAX_TIER,
  AUTO_EAT_TIERS,
  BASE_INVENTORY_SLOTS,
  BUYBACK_MAX_ENTRIES,
  SELL_BONUS_TOTAL_CAP,
  SLOT_UPGRADE_AMOUNT,
  autoEatHealMult,
  autoEatThreshold, BUYBACK_BANNED_ITEM_IDS } from "@hearthforge/shared";
import type { ItemInstance } from "@hearthforge/shared";
import { createGame } from "./state";
import {
  autoEatUpgradeCost,
  buyAutoEatUpgrade,
  buyBack,
  buyItem,
  buySlotUpgrade,
  effectiveSellPrice,
  sellBaseWithVariants,
  sellInstance,
  sellItem,
  sellPrice,
  sellStack,
  slotUpgradeCost,
} from "./shop";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { addInstance, addItem, itemCount } from "./inventory";

function newGame() {
  return createGame({ name: "Händler" }, content, 1);
}

describe("shop", () => {
  it("kauft ein Item und zieht Gold ab", () => {
    const s = newGame();
    s.character.gold = 100;
    expect(buyItem(s, content, "cooked_shrimp", 6)).toBe(1);
    expect(s.character.gold).toBe(94);
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(1);
  });

  it("kauft mehrere Stück auf einmal (Mengenkauf)", () => {
    const s = newGame();
    s.character.gold = 100;
    expect(buyItem(s, content, "cooked_shrimp", 6, 5)).toBe(5);
    expect(s.character.gold).toBe(70);
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(5);
  });

  it("Mengenkauf partiell: kauft nur so viel wie Gold reicht", () => {
    const s = newGame();
    s.character.gold = 20;
    expect(buyItem(s, content, "cooked_shrimp", 6, 10)).toBe(3); // 20/6 = 3
    expect(s.character.gold).toBe(2);
  });

  it("verweigert Kauf bei zu wenig Gold", () => {
    const s = newGame();
    s.character.gold = 5;
    expect(buyItem(s, content, "bronze_sword", 80)).toBe(0);
    expect(s.character.gold).toBe(5);
  });

  it("verkauft Items für Gold", () => {
    const s = newGame();
    s.character.gold = 0;
    addItem(s.inventory, content, "bronze_bar", 4);
    const earned = sellItem(s, content, "bronze_bar", 4);
    expect(earned).toBeGreaterThan(0);
    expect(s.character.gold).toBe(earned);
    expect(itemCount(s.inventory, "bronze_bar")).toBe(0);
  });

  it("kauft Inventar-Slot-Upgrades mit steigenden Kosten", () => {
    const s = newGame();
    s.character.gold = 1000;
    const firstCost = slotUpgradeCost(s);
    expect(buySlotUpgrade(s, content)).toBe(true);
    expect(s.inventory.baseCapacity).toBe(BASE_INVENTORY_SLOTS + SLOT_UPGRADE_AMOUNT);
    expect(slotUpgradeCost(s)).toBeGreaterThan(firstCost);
  });

  it("Auto-Eat-Upgrade: kauft eskalierende Stufen, zieht Gold ab, kappt bei Max", () => {
    const s = newGame();
    expect(s.character.autoEatTier).toBe(0);
    // Balance-Kette Schritt 4: Schwellen-Leiter [0.45, 0.55, 0.62, 0.70] (vorher [0.5..0.8]).
    expect(autoEatThreshold(0)).toBe(0.45);
    expect(autoEatHealMult(0)).toBe(1);

    s.character.gold = 100; // zu wenig für Stufe 1
    expect(buyAutoEatUpgrade(s)).toBe(false);
    expect(s.character.autoEatTier).toBe(0);

    s.character.gold = 100_000;
    // Alle Stufen bis zum Maximum kaufen.
    for (let tier = 1; tier <= AUTO_EAT_MAX_TIER; tier++) {
      const cost = autoEatUpgradeCost(s);
      expect(cost).toBe(AUTO_EAT_TIERS[tier]!.cost);
      const before = s.character.gold;
      expect(buyAutoEatUpgrade(s)).toBe(true);
      expect(s.character.autoEatTier).toBe(tier);
      expect(s.character.gold).toBe(before - cost!);
    }
    // Maximum erreicht → kein weiteres Upgrade.
    expect(autoEatUpgradeCost(s)).toBeNull();
    expect(buyAutoEatUpgrade(s)).toBe(false);
    expect(autoEatThreshold(AUTO_EAT_MAX_TIER)).toBeGreaterThan(0.5);
  });

  it("Auto-Eat-Tiers: NUR die Schwelle staffelt, die Heal-Menge bleibt unverändert (Chef-Entscheid)", () => {
    // Chef-Vorgabe: AutoEat-Upgrades ändern ausschließlich die Schwelle (ab wann gegessen wird),
    // NIE die Heilmenge. Daher healMult auf ALLEN Stufen 1.0 — die Heilung ist immer der Food-Basiswert.
    for (let tier = 1; tier <= AUTO_EAT_MAX_TIER; tier++) {
      expect(autoEatThreshold(tier)).toBeGreaterThan(autoEatThreshold(tier - 1));
    }
    for (let tier = 0; tier <= AUTO_EAT_MAX_TIER; tier++) {
      expect(autoEatHealMult(tier)).toBe(1);
    }
  });

  it("Kämpfe geben KEIN Rohgold mehr — Gold kommt nur vom Verkaufen (Task #272)", () => {
    const s = newGame();
    s.character.gold = 0;
    // Schwacher Mob → ein Frisch-Char killt zuverlässig (nach dem Low/Mid-HP-Buff war "goblin" zu tanky).
    startCombat(s, content, "chicken");
    advance(s, content, 120_000);
    // Content-dev hat ALLE MonsterDef.gold-Werte auf 0 gesetzt (Chef-Vorgabe: Kreaturen droppen
    // kein Rohgold mehr; die Ökonomie läuft über verkaufbare Item-Drops, s. "verkauft Items für
    // Gold" oben). combat.ts liest weiterhin `monster.gold` — bei 0 bleibt der Goldstand bei 0.
    expect(s.character.gold).toBe(0);
  });

  it("NaN-Guard: nicht-endliche Menge vergiftet weder Gold noch Bestand", () => {
    const s = newGame();
    s.character.gold = 100;
    // buyItem: NaN/Infinity → kein Kauf, Gold bleibt endlich & unverändert.
    expect(buyItem(s, content, "cooked_shrimp", 6, Number.NaN)).toBe(0);
    expect(buyItem(s, content, "cooked_shrimp", 6, Number.POSITIVE_INFINITY)).toBe(0);
    expect(s.character.gold).toBe(100);
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(0);

    // sellItem: NaN → kein Verkauf, Gold bleibt endlich (ohne Guard schlägt NaN bis addGold durch).
    addItem(s.inventory, content, "bronze_bar", 4);
    expect(sellItem(s, content, "bronze_bar", Number.NaN)).toBe(0);
    expect(Number.isFinite(s.character.gold)).toBe(true);
    expect(s.character.gold).toBe(100);
    expect(itemCount(s.inventory, "bronze_bar")).toBe(4);
  });
});

describe("shop buy-back (Task #245)", () => {
  it("sellStack verkauft den GANZEN Stapel und legt EINEN Buy-Back-Eintrag an", () => {
    const s = newGame();
    s.character.gold = 0;
    addItem(s.inventory, content, "bronze_bar", 7);
    const unit = sellPrice(content, "bronze_bar");
    const earned = sellStack(s, content, "bronze_bar");
    expect(earned).toBe(7 * unit);
    expect(itemCount(s.inventory, "bronze_bar")).toBe(0);
    expect(s.buyBack).toHaveLength(1);
    expect(s.buyBack[0]).toMatchObject({ itemId: "bronze_bar", qty: 7, price: unit });
  });

  it("Dungeon-Schlüssel landen NIE im Rückkauf-Regal (Tester-Sweep 2 T6, geteilte Sperr-Menge)", () => {
    // Live-Injection-Härtung: pushBuyBack filtert mit derselben shared-Konstante
    // (BUYBACK_BANNED_ITEM_IDS) wie der persistence-Load-Strip — paragon_key („nie im
    // Besitz"-Invariante) und die deprecated Story-Schlüssel. Der Verkauf selbst bleibt
    // gültig (Gold fließt), nur der Regal-Eintrag entfällt still.
    const s = newGame();
    s.character.gold = 0;
    addItem(s.inventory, content, "paragon_key", 1); // roh injiziert (am Intercept vorbei)
    addItem(s.inventory, content, "warband_key", 2); // deprecated Story-Schlüssel
    const g1 = sellItem(s, content, "paragon_key", 1);
    const g2 = sellStack(s, content, "warband_key");
    expect(g1).toBeGreaterThan(0); // Gold ist geflossen …
    expect(g2).toBeGreaterThan(0);
    expect(s.character.gold).toBe(g1 + g2);
    expect(s.buyBack).toHaveLength(0); // … aber KEIN Regal-Eintrag
    // Kontrolle: ein normales Item landet weiterhin im Regal.
    addItem(s.inventory, content, "bronze_bar", 1);
    sellItem(s, content, "bronze_bar", 1);
    expect(s.buyBack).toHaveLength(1);
    expect(s.buyBack[0]!.itemId).toBe("bronze_bar");
  });

  it("sellItem (Einzelverkauf) puffert ebenfalls in die Buy-Back-Liste", () => {
    const s = newGame();
    s.character.gold = 0;
    addItem(s.inventory, content, "bronze_bar", 3);
    sellItem(s, content, "bronze_bar", 2);
    expect(s.buyBack).toHaveLength(1);
    expect(s.buyBack[0]).toMatchObject({ itemId: "bronze_bar", qty: 2 });
    expect(itemCount(s.inventory, "bronze_bar")).toBe(1);
  });

  it("buyBack kauft den Stapel zum Verkaufspreis zurück (Gold + Inventar wiederhergestellt)", () => {
    const s = newGame();
    addItem(s.inventory, content, "bronze_bar", 5);
    const unit = sellPrice(content, "bronze_bar");
    s.character.gold = 0;
    sellStack(s, content, "bronze_bar");
    expect(s.character.gold).toBe(5 * unit);
    expect(buyBack(s, content, 0)).toBe(true);
    expect(s.character.gold).toBe(0); // Verkaufspreis wieder abgezogen
    expect(itemCount(s.inventory, "bronze_bar")).toBe(5);
    expect(s.buyBack).toHaveLength(0);
  });

  it("buyBack verweigert bei zu wenig Gold — nichts ändert sich", () => {
    const s = newGame();
    addItem(s.inventory, content, "bronze_bar", 5);
    const unit = sellPrice(content, "bronze_bar");
    s.character.gold = 0;
    sellStack(s, content, "bronze_bar"); // gold = 5*unit
    s.character.gold = unit; // weniger als der volle Rückkaufpreis (5*unit)
    expect(buyBack(s, content, 0)).toBe(false);
    expect(s.character.gold).toBe(unit);
    expect(itemCount(s.inventory, "bronze_bar")).toBe(0);
    expect(s.buyBack).toHaveLength(1);
  });

  it("sellInstance puffert die Instanz; buyBack gibt sie identisch (mit Suffix) zurück", () => {
    const s = newGame();
    const inst: ItemInstance = {
      instanceId: "inst_x",
      baseItemId: "bronze_sword",
      affixes: [],
      suffix: { suffixId: "of_test", ilvl: 3, roll: 0.5 },
    };
    addInstance(s.inventory, inst);
    s.character.gold = 0;
    const price = sellPrice(content, "bronze_sword");
    expect(sellInstance(s, content, "inst_x")).toBe(price);
    expect(s.inventory.instances).toHaveLength(0);
    expect(s.buyBack[0]).toMatchObject({ itemId: "bronze_sword", qty: 1, price });
    expect(s.buyBack[0]!.instance?.instanceId).toBe("inst_x");
    // Zurückkaufen: Instanz kehrt identisch in die (unbegrenzte) Tasche zurück.
    s.character.gold = price;
    expect(buyBack(s, content, 0)).toBe(true);
    expect(s.character.gold).toBe(0);
    expect(s.inventory.instances).toHaveLength(1);
    expect(s.inventory.instances[0]!.instanceId).toBe("inst_x");
    expect(s.inventory.instances[0]!.suffix?.suffixId).toBe("of_test");
    expect(s.buyBack).toHaveLength(0);
  });

  it("sellBaseWithVariants verkauft Stack + alle gleich-baseItemId-Instanzen; inv.instances frei, Gold summiert, buyBack befüllt", () => {
    const s = newGame();
    s.character.gold = 0;
    const unit = sellPrice(content, "bronze_sword");
    // Fungibler Basis-Stapel + zwei bronze_sword-Varianten (verzaubert/gesuffixt) + eine fremde Variante.
    addItem(s.inventory, content, "bronze_sword", 3);
    addInstance(s.inventory, {
      instanceId: "inst_a",
      baseItemId: "bronze_sword",
      affixes: [{ affixId: "affix_x", tier: 1 }],
    });
    addInstance(s.inventory, {
      instanceId: "inst_b",
      baseItemId: "bronze_sword",
      affixes: [],
      suffix: { suffixId: "of_test", ilvl: 2, roll: 0.5 },
    });
    addInstance(s.inventory, { instanceId: "inst_other", baseItemId: "bronze_bar", affixes: [] });

    const res = sellBaseWithVariants(s, content, "bronze_sword");
    expect(res.soldStack).toBe(3); // gesamter fungibler Stapel
    expect(res.soldInstances).toBe(2); // beide bronze_sword-Varianten
    // Gold = (3 Stack + 2 Instanzen) je Basis-Verkaufspreis, sauber summiert.
    expect(res.gold).toBe(5 * unit);
    expect(s.character.gold).toBe(5 * unit);

    // Fungibler Stack weg, keine verwaisten bronze_sword-Instanzen mehr in der Tasche.
    expect(itemCount(s.inventory, "bronze_sword")).toBe(0);
    expect(s.inventory.instances.some((i) => i.baseItemId === "bronze_sword")).toBe(false);
    // Fremde Variante bleibt unangetastet.
    expect(s.inventory.instances.map((i) => i.instanceId)).toEqual(["inst_other"]);

    // buyBack enthält den Stack-Eintrag UND beide Instanz-Einträge (mit voller Instanz).
    const stackEntry = s.buyBack.find((e) => !e.instance && e.itemId === "bronze_sword");
    expect(stackEntry).toMatchObject({ itemId: "bronze_sword", qty: 3, price: unit });
    const instEntries = s.buyBack.filter((e) => e.instance);
    expect(instEntries.map((e) => e.instance!.instanceId).sort()).toEqual(["inst_a", "inst_b"]);

    // End-to-end: eine verkaufte Variante lässt sich identisch (mit Suffix) zurückkaufen.
    s.character.gold = unit;
    const idxB = s.buyBack.findIndex((e) => e.instance?.instanceId === "inst_b");
    expect(buyBack(s, content, idxB)).toBe(true);
    const back = s.inventory.instances.find((i) => i.instanceId === "inst_b");
    expect(back?.suffix?.suffixId).toBe("of_test");
    expect(s.character.gold).toBe(0);
  });

  it("Buy-Back-Liste ist FIFO (jüngster vorne) und auf BUYBACK_MAX_ENTRIES gekappt", () => {
    const s = newGame();
    s.character.gold = 0;
    addItem(s.inventory, content, "bronze_bar", 1);
    sellStack(s, content, "bronze_bar");
    addItem(s.inventory, content, "cooked_shrimp", 1);
    sellStack(s, content, "cooked_shrimp");
    // Jüngster Verkauf steht vorne.
    expect(s.buyBack[0]!.itemId).toBe("cooked_shrimp");
    expect(s.buyBack[1]!.itemId).toBe("bronze_bar");

    // Über das Limit hinaus verkaufen → Länge bleibt gekappt.
    for (let i = 0; i < BUYBACK_MAX_ENTRIES + 5; i++) {
      addItem(s.inventory, content, "bronze_bar", 1);
      sellStack(s, content, "bronze_bar");
    }
    expect(s.buyBack).toHaveLength(BUYBACK_MAX_ENTRIES);
  });

  // ── 1.0.1-Spielerfeedback (Aldric, 54h54m Spielzeit): „Selling enchanted items is a real pain
  // right now. needs to be a way to select all or something." — der neue "Alle auswählen"-Schalter
  // im Shop (ShopPage.tsx SellTab) führt eine große Auswahl über GENAU diese Schleife bestehender
  // Verben aus (sellItem/sellInstance/sellBaseWithVariants), keine neue Engine-API. Dieser Test
  // sichert die Eigenschaft ab, auf die sich die UI verlässt: viele Instanzen über MEHRERE
  // verschiedene Basis-Items in einem synchronen Rutsch verkaufen bucht exakt dieselbe Gold-Summe
  // wie dieselben Verkäufe einzeln nacheinander (Atomarität aus Spielersicht — kein Zwischenzustand
  // sichtbar, keine Rundungs-Drift durch die Bündelung).
  it("1.0.1: Massenverkauf vieler Instanzen über mehrere Basis-Items — Gold-Summe = Summe der Einzelverkäufe, Instanzen restlos entfernt", () => {
    const s = newGame();
    s.character.gold = 0;
    // Zwei verschiedene Basis-Items (wie im Spielerfall: verzauberte Ausrüstung unterschiedlicher
    // Sorten, nicht nur EIN Item-Typ) — je mehr Instanzen als eine einzelne Buy-Back-Ladung fasst,
    // damit der Cap-Effekt (s.u.) mitgeprüft wird.
    const idsA = Array.from({ length: 4 }, (_, i) => `ms101_sword_${i}`);
    const idsB = Array.from({ length: 4 }, (_, i) => `ms101_bar_${i}`);
    for (const id of idsA) {
      addInstance(s.inventory, { instanceId: id, baseItemId: "bronze_sword", affixes: [{ affixId: "affix_x", tier: 1 }] });
    }
    for (const id of idsB) {
      addInstance(s.inventory, { instanceId: id, baseItemId: "bronze_bar", suffix: { suffixId: "of_test", ilvl: 5, roll: 0.5 }, affixes: [] });
    }
    const allIds = [...idsA, ...idsB];
    expect(s.inventory.instances).toHaveLength(8);

    // Referenz: dieselben 8 Instanzen einzeln verkaufen (Kontrollgruppe auf einem Zweit-State).
    const control = newGame();
    control.character.gold = 0;
    for (const id of idsA) addInstance(control.inventory, { instanceId: id, baseItemId: "bronze_sword", affixes: [{ affixId: "affix_x", tier: 1 }] });
    for (const id of idsB) addInstance(control.inventory, { instanceId: id, baseItemId: "bronze_bar", suffix: { suffixId: "of_test", ilvl: 5, roll: 0.5 }, affixes: [] });
    let controlGold = 0;
    for (const id of allIds) controlGold += sellInstance(control, content, id);

    // Test: exakt die Schleife, die executeMassSell (ShopPage.tsx) für einen "Einzeln wählen"-
    // Container mit lauter angehakten Instanzen fährt — EIN Funktionsaufruf je Instanz, synchron
    // in einem Rutsch, Ergebnis aufsummiert.
    let massGold = 0;
    for (const id of allIds) massGold += sellInstance(s, content, id);

    expect(massGold).toBe(controlGold); // identische Gold-Summe wie Einzelverkauf — keine Drift durch Bündelung
    expect(massGold).toBe(4 * sellPrice(content, "bronze_sword") + 4 * sellPrice(content, "bronze_bar"));
    expect(s.character.gold).toBe(massGold);
    expect(s.inventory.instances).toHaveLength(0); // restlos entfernt, keine Karteileichen

    // Buy-Back bleibt bewusst der bestehende FIFO-Cap (BUYBACK_MAX_ENTRIES=12): 8 Verkäufe passen
    // hier noch vollständig rein — kein Regressions-Risiko durch die neue Mass-Sell-UI, dieselbe
    // Kappung wie beim bereits bestehenden `sellBaseWithVariants` (Shift-Klick-Schnellverkauf).
    expect(s.buyBack).toHaveLength(8);
    expect(new Set(s.buyBack.map((e) => e.instance?.instanceId))).toEqual(new Set(allIds));
  });
});

// ── Das Lager: Händlerposten (Task #359, encampment-balance.md §6) ──────────────────────────────

/**
 * Händlerposten: +2/4/6 % Verkaufserlös, ADDITIV zum Pet-Bonus in EINEM Ausdruck (eine Rundung),
 * Gesamt-Klemme SELL_BONUS_TOTAL_CAP (+15 %). Buy-Back bleibt symmetrisch (kein Gold-Pump).
 */
describe("Händlerposten — Verkaufsbonus", () => {
  const POST = "camp_trade_post";
  const ITEM = "copper_ore";

  function postGame(level: number): ReturnType<typeof createGame> {
    const s = createGame({ name: "Posten" }, content, 1);
    if (level > 0) s.camp.buildings[POST] = level;
    s.camp.buildSeq += 1;
    return s;
  }

  /** Ein Item mit hohem Wert, damit die Prozente die Rundung überleben. Bewusst OHNE die
   *  Buy-Back-Sperrliste: seit 1.1.0 (Content-Umbauten 25.08.) ist das erste Item ueber 2000 in
   *  Objekt-Reihenfolge der paragon_key, den pushBuyBack per Design nie ins Regal legt. Der
   *  Symmetrie-Test unten braucht ein Item, das im Regal landet. */
  const PRICEY = Object.entries(content.items)
    .filter(([id, i]) => (i.value ?? 0) >= 2000 && !BUYBACK_BANNED_ITEM_IDS.has(id))
    .map(([id]) => id)[0]!;

  it("ohne Lager exakt der Alt-Preis (sellPrice-Basis)", () => {
    const s = postGame(0);
    expect(effectiveSellPrice(s, content, ITEM)).toBe(sellPrice(content, ITEM));
  });

  it("Stufen I/II/III geben +2/+4/+6 % auf den Basis-Verkaufspreis", () => {
    const base = sellPrice(content, PRICEY);
    for (const [level, bonus] of [[1, 0.02], [2, 0.04], [3, 0.06]] as const) {
      const s = postGame(level);
      expect(effectiveSellPrice(s, content, PRICEY), `Stufe ${level}`).toBe(
        Math.round(base * (1 + bonus)),
      );
    }
  });

  it("Gesamt-Klemme +15 %: eine überhöhte Boost-Quelle kann nicht darüber stapeln", () => {
    const s = postGame(3);
    const fat = {
      ...content,
      campBuildings: content.campBuildings!.map((b) =>
        b.id !== POST ? b : { ...b, levels: b.levels.map((l) => ({ ...l, boost: { ...l.boost, value: 0.5 } })) },
      ),
    } as typeof content;
    const base = sellPrice(content, PRICEY);
    expect(effectiveSellPrice(s, fat, PRICEY)).toBe(Math.round(base * (1 + SELL_BONUS_TOTAL_CAP)));
  });

  it("Verkauf zahlt den erhöhten Preis, der Buy-Back-Eintrag bleibt symmetrisch (kein Gold-Pump)", () => {
    const s = postGame(3);
    addItem(s.inventory, content, PRICEY, 1);
    const unit = effectiveSellPrice(s, content, PRICEY);
    const goldBefore = s.character.gold;
    expect(sellItem(s, content, PRICEY, 1)).toBe(unit);
    expect(s.character.gold).toBe(goldBefore + unit);
    // Rückkauf kostet exakt denselben Preis → der Kreis ist geschlossen.
    expect(s.buyBack[0]!.price).toBe(unit);
    expect(buyBack(s, content, 0)).toBe(true);
    expect(s.character.gold).toBe(goldBefore);
  });
});
