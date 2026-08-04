import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ItemDef, ItemInstance } from "@hearthforge/shared";
import { createGame } from "./state";
import { equipInstance, equipItem, equipTool, meetsRequirements, unequipItem } from "./equipment";
import { computeStats } from "./character";
import { bestToolSpeed } from "./tools";
import { addInstance, addItem, freeSlots, itemCount } from "./inventory";

function newGame() {
  return createGame({ name: "Held" }, content, 1);
}

describe("equipment", () => {
  it("rüstet neuen Charakteren das Start-Schwert direkt aus (Default melee)", () => {
    const s = newGame();
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
  });

  it("rüstet eine Waffe aus und erhöht den Schaden", () => {
    const s = newGame();
    // Start-Waffe erst ablegen, damit rusty_sword wieder im Inventar liegt.
    unequipItem(s, content, "mainhand");
    // Waffen 2.0 (itemization-parity-fix §1.2): die Waffen-Spanne (damageMin/Max) fließt NICHT mehr
    // in meleeDamage (reiner Charakter-Anteil ohne Waffe) — die einzige Budget-/Anzeige-Quelle ist
    // jetzt attackDamage = (attackDamageMin+attackDamageMax)/2 (Charakter-Anteil + Waffen-Spanne).
    const before = computeStats(s, content).attackDamage;
    expect(equipItem(s, content, "rusty_sword").ok).toBe(true);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(itemCount(s.inventory, "rusty_sword")).toBe(0);
    expect(computeStats(s, content).attackDamage).toBeGreaterThan(before);
  });

  it("setzt den Kampfstil über die Waffe", () => {
    const s = newGame();
    addItem(s.inventory, content, "gnarled_staff", 1);
    equipItem(s, content, "gnarled_staff");
    expect(computeStats(s, content).style).toBe("magic");
  });

  it("blockiert Ausrüsten ohne erfüllte Anforderung", () => {
    const s = newGame();
    unequipItem(s, content, "mainhand"); // Start-Waffe ablegen → Slot frei
    addItem(s.inventory, content, "bronze_sword", 1); // braucht attack 3
    const result = equipItem(s, content, "bronze_sword");
    expect(result.ok).toBe(false);
    expect(s.character.equipment.mainhand).toBeNull();
  });

  /**
   * Bestandsschutz-Regel (Chef-GO Task #341, item-drop-audit P1 Req-Erhöhungen): Requirements
   * dürfen NUR beim ANLEGEN geprüft werden. Ein Item, das VOR einer Req-Erhöhung angelegt wurde
   * (oder aus einem Alt-Save geladen wird), bleibt getragen und wirksam, auch wenn die neue Req
   * nicht mehr erfüllt ist — erst beim erneuten ANLEGEN (nach einem Unequip) greift die Prüfung.
   * Dieser Test pinnt fest, dass der Engine-Code das bereits so verhält: `meetsRequirements`
   * wird ausschließlich in `equipItem`/`equipTool`/`equipInstance` aufgerufen (equipment.ts) —
   * NICHT in `computeStats` (character.ts), `tick.ts` oder dem Persistenz-Load-Pfad. Bricht dieser
   * Test künftig, hat jemand einen Auto-Unequip/Re-Check außerhalb des equip-Pfads eingebaut —
   * das wäre ein Logic-Dev-Eingriff, kein Content-Fix.
   */
  it("Bestandsschutz: bereits ausgerüstetes Item mit (inzwischen) unerfüllter Req bleibt getragen + wirksam; nach Unequip nicht mehr anlegbar", () => {
    const reqHikeHelm: ItemDef = {
      id: "test_req_hike_helm",
      name: { en: "Req-Hike Test Helm", de: "Anforderungs-Erhöhungs-Testhelm" },
      type: "equipment",
      slot: "helmet",
      stackable: false,
      requirements: { defence: 90 }, // frischer Held ist Level 1 → würde equipItem() heute blocken
      modifiers: { con: 7 }, // sichtbarer Stat-Effekt, um "wirksam" nachzuweisen
    };
    const c = { ...content, items: { ...content.items, test_req_hike_helm: reqHikeHelm } };
    const s = createGame({ name: "X" }, c, 1);
    const baseline = computeStats(s, c).maxHp;

    // State-Konstruktion statt equipItem()-Aufruf: simuliert "schon getragen, Req inzwischen
    // unerfüllt" (Bestandsfall), ohne den (bewusst blockenden) equip-Pfad zu benutzen.
    s.character.equipment.helmet = "test_req_hike_helm";
    expect(meetsRequirements(s, reqHikeHelm)).toBe(false); // Req ist unerfüllt...

    // ...trotzdem wirksam: computeStats() prüft nirgends Requirements.
    expect(computeStats(s, c).maxHp).toBeGreaterThan(baseline);

    // Ablegen funktioniert immer (unequip prüft keine Requirements).
    expect(unequipItem(s, c, "helmet")).toBe(true);
    expect(s.character.equipment.helmet).toBeNull();
    expect(computeStats(s, c).maxHp).toBe(baseline); // Effekt verschwindet mit dem Item

    // Erneutes Anlegen greift jetzt die Prüfung: verweigert.
    addItem(s.inventory, c, "test_req_hike_helm", 1);
    const result = equipItem(s, c, "test_req_hike_helm");
    expect(result.ok).toBe(false);
    expect(s.character.equipment.helmet).toBeNull();
  });

  it("tauscht beim Ausrüsten das alte Item zurück ins Inventar", () => {
    const s = newGame(); // Start-Schwert ist bereits ausgerüstet
    addItem(s.inventory, content, "copper_shortbow", 1);
    equipItem(s, content, "copper_shortbow"); // ersetzt das Start-Schwert
    expect(s.character.equipment.mainhand).toBe("copper_shortbow");
    expect(itemCount(s.inventory, "rusty_sword")).toBe(1);
  });

  it("legt Ausrüstung wieder ab", () => {
    const s = newGame(); // Start-Schwert ist bereits ausgerüstet
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    expect(s.character.equipment.mainhand).toBeNull();
    expect(itemCount(s.inventory, "rusty_sword")).toBe(1);
  });

  it("rüstet ein Werkzeug in einen Werkzeug-Slot aus (wirkt aus Inventar UND Slot)", () => {
    const s = newGame();
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    expect(bestToolSpeed(s, content, "mining")).toBeLessThan(1); // wirkt schon aus dem Inventar
    expect(equipItem(s, content, "bronze_pickaxe").ok).toBe(true);
    expect(s.character.equipment.tool1).toBe("bronze_pickaxe");
    expect(itemCount(s.inventory, "bronze_pickaxe")).toBe(0); // aus dem Inventar in den Slot gewandert
    expect(bestToolSpeed(s, content, "mining")).toBeLessThan(1); // wirkt weiterhin (jetzt aus dem Slot)
    // Ablegen → zurück ins Inventar
    expect(unequipItem(s, content, "tool1")).toBe(true);
    expect(s.character.equipment.tool1).toBeNull();
    expect(itemCount(s.inventory, "bronze_pickaxe")).toBe(1);
  });

  it("erlaubt ein dual-use-Item (Axt) im Werkzeug-Slot — equipTool nimmt Items mit tool-Feld (Chef 2026-07-21)", () => {
    const s = newGame(); // Start-Schwert (rusty_sword) in der Mainhand
    addItem(s.inventory, content, "copper_axe", 1); // type "equipment" (Waffe, slot mainhand) MIT tool: woodcutting
    expect(bestToolSpeed(s, content, "woodcutting")).toBeLessThan(1); // wirkt schon aus dem Inventar
    // equipTool legt die Axt in den Werkzeug-Slot (nicht in die Mainhand) — die Kampfwaffe bleibt.
    expect(equipTool(s, content, "copper_axe").ok).toBe(true);
    expect(s.character.equipment.tool1).toBe("copper_axe");
    expect(s.character.equipment.mainhand).toBe("rusty_sword"); // Start-Waffe unberührt (Axt ging NICHT in die Mainhand)
    expect(itemCount(s.inventory, "copper_axe")).toBe(0);
    expect(bestToolSpeed(s, content, "woodcutting")).toBeLessThan(1); // Holzfäll-Bonus jetzt aus dem Slot
    // Ablegen → zurück ins Inventar
    expect(unequipItem(s, content, "tool1")).toBe(true);
    expect(s.character.equipment.tool1).toBeNull();
    expect(itemCount(s.inventory, "copper_axe")).toBe(1);
  });

  it("legt ein zweites Werkzeug in den zweiten Werkzeug-Slot", () => {
    const s = newGame();
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    addItem(s.inventory, content, "crude_fishing_rod", 1);
    equipItem(s, content, "bronze_pickaxe");
    equipItem(s, content, "crude_fishing_rod");
    expect(s.character.equipment.tool1).toBe("bronze_pickaxe");
    expect(s.character.equipment.tool2).toBe("crude_fishing_rod");
  });

  // ── Dritter Werkzeug-Slot (tool3, Spieler-Feedback „komisch, 2 ausgerüstet + 1 im Inventar",
  //    SAVE_VERSION 72 NACHTRAG, Chef-GO) ──────────────────────────────────────────────────────

  it("legt ein drittes Werkzeug in den dritten Werkzeug-Slot (tool1+tool2 bereits belegt)", () => {
    const s = newGame();
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    addItem(s.inventory, content, "crude_fishing_rod", 1);
    addItem(s.inventory, content, "crude_sickle", 1);
    equipItem(s, content, "bronze_pickaxe");
    equipItem(s, content, "crude_fishing_rod");
    expect(equipItem(s, content, "crude_sickle").ok).toBe(true);
    expect(s.character.equipment.tool1).toBe("bronze_pickaxe");
    expect(s.character.equipment.tool2).toBe("crude_fishing_rod");
    expect(s.character.equipment.tool3).toBe("crude_sickle");
    expect(itemCount(s.inventory, "crude_sickle")).toBe(0);
    // Ablegen → zurück ins Inventar, wie tool1/tool2.
    expect(unequipItem(s, content, "tool3")).toBe(true);
    expect(s.character.equipment.tool3).toBeNull();
    expect(itemCount(s.inventory, "crude_sickle")).toBe(1);
  });

  it("erlaubt das Dual-Use-Item (Axt) auch im dritten Werkzeug-Slot", () => {
    const s = newGame();
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    addItem(s.inventory, content, "crude_fishing_rod", 1);
    addItem(s.inventory, content, "copper_axe", 1);
    equipItem(s, content, "bronze_pickaxe");
    equipItem(s, content, "crude_fishing_rod");
    expect(equipTool(s, content, "copper_axe").ok).toBe(true);
    expect(s.character.equipment.tool3).toBe("copper_axe");
    expect(s.character.equipment.mainhand).toBe("rusty_sword"); // Start-Waffe unberührt
  });

  it("tool3 ist reines Ordnungs-Feature — Tempo ändert sich NICHT gegenüber Inventar-Besitz (kein Mechanik-Buff)", () => {
    const s = newGame();
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    addItem(s.inventory, content, "crude_fishing_rod", 1);
    equipItem(s, content, "bronze_pickaxe"); // → tool1
    equipItem(s, content, "crude_fishing_rod"); // → tool2
    addItem(s.inventory, content, "crude_sickle", 1);
    const speedWhileInInventory = bestToolSpeed(s, content, "foraging");
    expect(equipItem(s, content, "crude_sickle").ok).toBe(true); // → tool3
    expect(s.character.equipment.tool3).toBe("crude_sickle");
    expect(bestToolSpeed(s, content, "foraging")).toBe(speedWhileInInventory); // unverändert
    // bestToolSpeed zählt Inventar UND Ausrüstung, tool1/tool2 bleiben von tool3 unberührt.
    expect(bestToolSpeed(s, content, "mining")).toBeLessThan(1);
    expect(bestToolSpeed(s, content, "fishing")).toBeLessThan(1);
  });

  // ── Atomarer Ausrüstungs-Tausch bei vollem/übervollem Inventar (Chef-Bugfix „22/20", 2026-07-23) ──
  // Ein 1:1-Tausch braucht netto keinen Platz — er darf bei vollem Inventar NICHT scheitern, solange
  // das verdrängte Item entweder (a) genau den Slot freimacht, den das neue Item hinterlässt, oder
  // (b) eine Instanz ist (wandert immer in die unbegrenzte Instanz-Tasche, braucht 0 Slots). Ein
  // Tausch, der wirklich NETTO mehr Platz bräuchte, darf weiter scheitern — aber sauber mit `false`.
  describe("atomarer Tausch bei vollem/übervollem Inventar", () => {
    it("equipItem: verdrängt eine ausgerüstete INSTANZ bei komplett vollem Inventar — muss gelingen (Instanz braucht 0 Slots)", () => {
      const s = newGame();
      // Ring1 trägt eine (manuell gesetzte) verzauberte Instanz; Ring2 ist belegt, damit equipItem
      // NICHT automatisch nach ring2 ausweicht, sondern ring1 tatsächlich ersetzt.
      const inst: ItemInstance = { instanceId: "inst_ring", baseItemId: "garnet_ring", affixes: [] };
      s.character.equipment.ring1 = inst.baseItemId;
      s.character.equippedInstances.ring1 = inst;
      s.character.equipment.ring2 = "gemstone_ring";
      // Inventar KOMPLETT voll — jeder Slot ein Stack mit qty>1 (Entnahme EINES Exemplars gibt seinen
      // eigenen Slot NICHT frei) AUSSER dem neuen Ring selbst (ebenfalls qty>1, gleicher Grund).
      for (let i = 0; i < s.inventory.slots.length; i++) {
        s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
      }
      s.inventory.slots[0] = { itemId: "garnet_ring", qty: 2 };
      expect(freeSlots(s.inventory)).toBe(0);

      const res = equipItem(s, content, "garnet_ring");
      expect(res.ok).toBe(true);
      expect(s.character.equipment.ring1).toBe("garnet_ring");
      expect(s.character.equippedInstances.ring1).toBeUndefined();
      // Die verdrängte Instanz liegt jetzt in der unbegrenzten Tasche — kein Slot verbraucht.
      expect(s.inventory.instances.some((i) => i.instanceId === "inst_ring")).toBe(true);
      expect(itemCount(s.inventory, "garnet_ring")).toBe(1); // 2 → 1 (ein Exemplar ausgerüstet)
    });

    it("equipTool: verdrängt ein ausgerüstetes INSTANZ-Werkzeug bei komplett vollem Inventar — muss gelingen", () => {
      const s = newGame();
      const inst: ItemInstance = { instanceId: "inst_pick", baseItemId: "bronze_pickaxe", affixes: [] };
      s.character.equipment.tool1 = inst.baseItemId;
      s.character.equippedInstances.tool1 = inst;
      s.character.equipment.tool2 = "crude_fishing_rod";
      s.character.equipment.tool3 = "crude_sickle";
      for (let i = 0; i < s.inventory.slots.length; i++) {
        s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
      }
      s.inventory.slots[0] = { itemId: "bronze_pickaxe", qty: 2 };
      expect(freeSlots(s.inventory)).toBe(0);

      const res = equipTool(s, content, "bronze_pickaxe");
      expect(res.ok).toBe(true);
      expect(s.character.equipment.tool1).toBe("bronze_pickaxe");
      expect(s.character.equippedInstances.tool1).toBeUndefined();
      expect(s.inventory.instances.some((i) => i.instanceId === "inst_pick")).toBe(true);
    });

    it("equipInstance: Instanz-für-Instanz-Tausch gelingt bei komplett vollem Inventar (beide brauchen 0 Slots)", () => {
      const s = newGame();
      const worn: ItemInstance = { instanceId: "inst_worn", baseItemId: "garnet_ring", affixes: [] };
      const fresh: ItemInstance = { instanceId: "inst_fresh", baseItemId: "garnet_ring", affixes: [] };
      s.character.equipment.ring1 = worn.baseItemId;
      s.character.equippedInstances.ring1 = worn;
      s.character.equipment.ring2 = "gemstone_ring"; // erzwingt target=ring1 statt Auto-Fill ring2
      addInstance(s.inventory, fresh); // liegt in der Tasche (kein Slot verbraucht)
      for (let i = 0; i < s.inventory.slots.length; i++) {
        s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
      }
      expect(freeSlots(s.inventory)).toBe(0);

      const res = equipInstance(s, content, "inst_fresh");
      expect(res.ok).toBe(true);
      expect(s.character.equipment.ring1).toBe("garnet_ring");
      expect(s.character.equippedInstances.ring1?.instanceId).toBe("inst_fresh");
      expect(s.inventory.instances.some((i) => i.instanceId === "inst_worn")).toBe(true);
    });

    it("equipInstance: verdrängt ein PLAIN Item bei 0 freien Slots (sourceFrees=0) — scheitert weiter sauber (echter Platzbedarf)", () => {
      // Die Quell-Instanz kommt aus der (slot-freien) Tasche → ihre Entnahme gibt NIE einen Slot frei.
      // Das verdrängte PLAIN Item braucht trotzdem einen — ist keiner frei, ist das ein GENUINER
      // Platzbedarf (kein Regressions-Bug, s. Chef-Vorgabe „darf weiter scheitern, aber sauber false").
      const s = newGame(); // mainhand = rusty_sword (plain)
      const fresh: ItemInstance = { instanceId: "inst_fresh_sword", baseItemId: "rusty_sword", affixes: [] };
      addInstance(s.inventory, fresh);
      for (let i = 0; i < s.inventory.slots.length; i++) {
        s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 }; // qty>1 → kein Slot wird je frei
      }
      expect(freeSlots(s.inventory)).toBe(0);

      const res = equipInstance(s, content, "inst_fresh_sword");
      expect(res.ok).toBe(false);
      expect(res.reason).toBe("Inventar voll");
      // Nichts verändert: die Instanz liegt weiter in der Tasche, das alte Schwert bleibt ausgerüstet.
      expect(s.character.equipment.mainhand).toBe("rusty_sword");
      expect(s.inventory.instances.some((i) => i.instanceId === "inst_fresh_sword")).toBe(true);
    });

    it("equipItem: 2H-Waffe verdrängt Waffe+Schild bei komplett vollem Inventar → sauberes false, nichts geht verloren", () => {
      const s = newGame(); // mainhand = rusty_sword (plain, 1H)
      addItem(s.inventory, content, "wooden_shield", 1);
      expect(equipItem(s, content, "wooden_shield").ok).toBe(true); // offhand belegt
      for (let i = 0; i < s.inventory.slots.length; i++) {
        s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
      }
      // copper_spear (2H, requirements attack:1) als EINZELNES Exemplar — gibt seinen eigenen Slot bei
      // Entnahme frei (sourceFrees=1), das reicht aber nur für EINEN der zwei nötigen Stows.
      s.inventory.slots[0] = { itemId: "copper_spear", qty: 1 };
      expect(freeSlots(s.inventory)).toBe(0);

      const res = equipItem(s, content, "copper_spear");
      expect(res.ok).toBe(false);
      expect(res.reason).toBe("Inventar voll");
      // Nichts mutiert: mainhand/offhand unverändert, die Speer bleibt im Inventar.
      expect(s.character.equipment.mainhand).toBe("rusty_sword");
      expect(s.character.equipment.offhand).toBe("wooden_shield");
      expect(itemCount(s.inventory, "copper_spear")).toBe(1);
      expect(s.inventory.slots.every((sl) => sl !== null)).toBe(true);
    });

    it("equipItem: Ring-Tausch gelingt auch bei einem historisch übervollen Inventar (mehr belegte Slots als Kapazität, z.B. Alt-Save)", () => {
      // Alt-Save-Fall (InventoryState-Doku, Pouch-Entfall SAVE_VERSION 56): `slots.length` kann die
      // effektive Kapazität bereits allein überschreiten — bleibt bewusst gültig/ladbar. Ein reiner
      // plain-für-plain-Tausch ist array-relativ (freeSlots = slots.length − usedSlots) und funktioniert
      // unabhängig vom Kapazitäts/Array-Längen-Mismatch.
      const s = newGame();
      expect(s.inventory.baseCapacity).toBe(20);
      s.inventory.slots = Array.from({ length: 22 }, () => ({ itemId: "oak_log", qty: 9999 }));
      s.inventory.slots[0] = { itemId: "garnet_ring", qty: 1 };
      s.character.equipment.ring1 = "sapphire_ring";
      s.character.equipment.ring2 = "gemstone_ring"; // erzwingt target=ring1
      expect(freeSlots(s.inventory)).toBe(0);

      const res = equipItem(s, content, "garnet_ring");
      expect(res.ok).toBe(true);
      expect(s.character.equipment.ring1).toBe("garnet_ring");
      expect(itemCount(s.inventory, "sapphire_ring")).toBe(1); // alter Ring zurück im Inventar
      expect(s.inventory.slots.length).toBe(22); // Array-Länge unverändert (kein Sanitize hier)
    });
  });
});
