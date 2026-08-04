import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ItemInstance } from "@hearthforge/shared";
import { addInstance, addItem, itemCount } from "./inventory";
import { equipInstance, equipItem, equipTool, unequipItem } from "./equipment";
import { xpForLevel } from "./leveling";
import { applyLoadout, saveLoadout } from "./loadouts";
import { createGame } from "./state";

/**
 * Ausrüstungs-Loadouts 1/2/3 (SAVE_VERSION 75, Task #349): Speichern/Anlegen-Roundtrip,
 * Skip-Regeln (fehlend/Requirements/Kapazität), Instanz-Treue (inkl. Gear-Vault-Abhebung),
 * Bank-Abhebung, Werkzeug-Ausschluss, Ring-Paar-Abgleich, Kampf-Regel und RNG-Freiheit.
 */

/** Frischer Melee-Spielstand (rusty_sword ausgerüstet) mit großzügigen Test-Skills. */
function makeState() {
  const s = createGame({ name: "Loadout" }, content, 1);
  // defence 1/attack 1 sind auf Level 1 erfüllt; für bronze_sword (attack 5) und Ringe
  // (jewelcrafting) geben die Tests gezielt XP.
  return s;
}

describe("saveLoadout: Snapshot der Kampf-Slots", () => {
  it("speichert getragene Teile (ohne Werkzeuge) und überschreibt kommentarlos", () => {
    const s = makeState();
    addItem(s.inventory, content, "copper_kiteshield", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    expect(equipTool(s, content, "bronze_pickaxe").ok).toBe(true);

    expect(saveLoadout(s, 0)).toBe(true);
    const lo = s.equipLoadouts[0]!;
    expect(lo.mainhand).toEqual({ itemId: "rusty_sword" });
    expect(lo.offhand).toEqual({ itemId: "copper_kiteshield" });
    // Werkzeuge sind KEIN Teil des Snapshots (Skill-Ausrüstung, s. LOADOUT_SLOTS-Doku).
    expect("tool1" in lo).toBe(false);
    // Leere Slots tragen keinen Key.
    expect("helmet" in lo).toBe(false);

    // Überschreiben: Slot 0 erneut speichern, nachdem der Schild abgelegt wurde.
    expect(unequipItem(s, content, "offhand")).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);
    expect("offhand" in s.equipLoadouts[0]!).toBe(false);
    // Ungültiger Index wird abgelehnt.
    expect(saveLoadout(s, 3)).toBe(false);
    expect(saveLoadout(s, -1)).toBe(false);
  });
});

describe("applyLoadout: Roundtrip über den normalen Equip-Pfad", () => {
  it("Speichern → Umbau → Anlegen stellt das Set exakt wieder her (inkl. 2H-Wechsel)", () => {
    const s = makeState();
    // Set A: rusty_sword + Schild + Ring.
    addItem(s.inventory, content, "copper_kiteshield", 1);
    addItem(s.inventory, content, "garnet_ring", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    expect(equipItem(s, content, "garnet_ring").ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);

    // Set B: Zweihand-Speer (verdrängt Schild), Ring bleibt.
    addItem(s.inventory, content, "copper_spear", 1);
    expect(equipItem(s, content, "copper_spear").ok).toBe(true);
    expect(s.character.equipment.offhand).toBeNull();
    expect(saveLoadout(s, 1)).toBe(true);

    // Zurück zu Set A.
    const resA = applyLoadout(s, content, 0);
    expect(resA.ok).toBe(true);
    expect(resA.total).toBe(3);
    expect(resA.applied).toBe(3);
    expect(resA.skipped).toEqual([]);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(s.character.equipment.offhand).toBe("copper_kiteshield");
    expect(s.character.equipment.ring1).toBe("garnet_ring");

    // Und wieder zu Set B: der 2H-Speer verdrängt den Schild über den normalen Equip-Pfad.
    const resB = applyLoadout(s, content, 1);
    expect(resB.ok).toBe(true);
    expect(resB.applied).toBe(resB.total);
    expect(s.character.equipment.mainhand).toBe("copper_spear");
    expect(s.character.equipment.offhand).toBeNull();
    // Der Schild liegt wieder im Inventar (nichts vernichtet).
    expect(itemCount(s.inventory, "copper_kiteshield")).toBe(1);
  });

  it("leerer Loadout-Slot/ungültiger Index → ok:false, State unangetastet", () => {
    const s = makeState();
    expect(applyLoadout(s, content, 2).ok).toBe(false);
    expect(applyLoadout(s, content, 7).ok).toBe(false);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
  });

  it("fehlendes Teil wird übersprungen, der Rest zieht an („X von Y angelegt\")", () => {
    const s = makeState();
    addItem(s.inventory, content, "copper_kiteshield", 1);
    addItem(s.inventory, content, "garnet_ring", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    expect(equipItem(s, content, "garnet_ring").ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);

    // Alles ablegen und den Schild KOMPLETT aus dem Besitz entfernen (weder Inventar noch Bank).
    expect(unequipItem(s, content, "offhand")).toBe(true);
    expect(unequipItem(s, content, "ring1")).toBe(true);
    for (let i = 0; i < s.inventory.slots.length; i++) {
      if (s.inventory.slots[i]?.itemId === "copper_kiteshield") s.inventory.slots[i] = null;
    }

    const res = applyLoadout(s, content, 0);
    expect(res.ok).toBe(true);
    expect(res.total).toBe(3);
    expect(res.applied).toBe(2); // Schwert (schon an) + Ring
    expect(res.skipped).toEqual([
      { slot: "offhand", itemId: "copper_kiteshield", reason: "missing" },
    ]);
    expect(s.character.equipment.ring1).toBe("garnet_ring");
    expect(s.character.equipment.offhand).toBeNull();
  });

  it("Requirements gelten BEIM ANLEGEN: verweigerte Slots überspringen, Rest zieht an", () => {
    const s = makeState();
    s.skills.attack = { xp: xpForLevel(10) }; // bronze_sword braucht attack 5
    addItem(s.inventory, content, "bronze_sword", 1);
    addItem(s.inventory, content, "garnet_ring", 1);
    expect(equipItem(s, content, "bronze_sword").ok).toBe(true);
    expect(equipItem(s, content, "garnet_ring").ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);

    // Anlege-Zeitpunkt zählt: Requirements künstlich entziehen (Test-Simulation — im echten
    // Spiel sinken Level nie, aber die Regel „nur equip prüft" muss trotzdem exakt hier greifen).
    s.skills.attack = { xp: 0 };
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    expect(unequipItem(s, content, "ring1")).toBe(true);

    const res = applyLoadout(s, content, 0);
    expect(res.ok).toBe(true);
    expect(res.total).toBe(2);
    expect(res.applied).toBe(1); // nur der Ring
    expect(res.skipped).toEqual([
      { slot: "mainhand", itemId: "bronze_sword", reason: "requirements" },
    ]);
    expect(s.character.equipment.mainhand).toBeNull();
    expect(s.character.equipment.ring1).toBe("garnet_ring");
    // Das verweigerte Schwert bleibt unangetastet im Inventar (kein Verlust).
    expect(itemCount(s.inventory, "bronze_sword")).toBe(1);
  });

  it("holt plain Teile aus der BANK (withdrawItem-Normalpfad)", () => {
    const s = makeState();
    addItem(s.inventory, content, "copper_kiteshield", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);

    // Schild ablegen und in die Bank verschieben (Inventar-los).
    expect(unequipItem(s, content, "offhand")).toBe(true);
    for (let i = 0; i < s.inventory.slots.length; i++) {
      if (s.inventory.slots[i]?.itemId === "copper_kiteshield") s.inventory.slots[i] = null;
    }
    s.bank.copper_kiteshield = 1;

    const res = applyLoadout(s, content, 0);
    expect(res.applied).toBe(res.total);
    expect(s.character.equipment.offhand).toBe("copper_kiteshield");
    expect(s.bank.copper_kiteshield ?? 0).toBe(0);
  });
});

describe("applyLoadout: Instanz-Treue (Verzauberung/Suffix reist exakt mit)", () => {
  const INST: ItemInstance = {
    instanceId: "tst-loadout-1",
    baseItemId: "rusty_sword",
    affixes: [{ affixId: "whetted", tier: 1 }],
  };

  it("legt EXAKT die gespeicherte Instanz wieder an (aus der Inventar-Tasche)", () => {
    const s = makeState();
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    addInstance(s.inventory, { ...INST, affixes: [...INST.affixes] });
    expect(equipInstance(s, content, INST.instanceId).ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);
    expect(s.equipLoadouts[0]!.mainhand).toEqual({ itemId: "rusty_sword", instanceId: INST.instanceId });

    expect(unequipItem(s, content, "mainhand")).toBe(true); // Instanz → Tasche
    const res = applyLoadout(s, content, 0);
    expect(res.applied).toBe(res.total);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(s.character.equippedInstances.mainhand?.instanceId).toBe(INST.instanceId);
  });

  it("holt die Instanz bei Bedarf aus dem Gear-Vault (bankInstances)", () => {
    const s = makeState();
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    addInstance(s.inventory, { ...INST, affixes: [...INST.affixes] });
    expect(equipInstance(s, content, INST.instanceId).ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);

    // Ablegen und die Instanz in den Gear-Vault verschieben.
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    const idx = s.inventory.instances.findIndex((i) => i.instanceId === INST.instanceId);
    s.bankInstances.push(s.inventory.instances[idx]!);
    s.inventory.instances.splice(idx, 1);

    const res = applyLoadout(s, content, 0);
    expect(res.applied).toBe(res.total);
    expect(s.character.equippedInstances.mainhand?.instanceId).toBe(INST.instanceId);
    expect(s.bankInstances.some((i) => i.instanceId === INST.instanceId)).toBe(false);
  });

  it("verkaufte/zersalvagte Instanz = fehlend — KEIN stiller Basis-Item-Ersatz", () => {
    const s = makeState();
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    addInstance(s.inventory, { ...INST, affixes: [...INST.affixes] });
    expect(equipInstance(s, content, INST.instanceId).ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);

    // Instanz „verkaufen" (aus Slot + Besitz entfernen); ein PLAIN rusty_sword liegt trotzdem da.
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    s.inventory.instances = s.inventory.instances.filter((i) => i.instanceId !== INST.instanceId);
    addItem(s.inventory, content, "rusty_sword", 1);

    const res = applyLoadout(s, content, 0);
    expect(res.applied).toBe(0);
    expect(res.skipped).toEqual([
      { slot: "mainhand", itemId: "rusty_sword", reason: "missing" },
    ]);
    expect(s.character.equipment.mainhand).toBeNull(); // ehrlich leer statt heimlich plain
  });
});

describe("applyLoadout: Ring-Paar, Werkzeuge, Kampf-Regel, Determinismus", () => {
  it("Ring-Paar: nur vertauschte Positionen = zufrieden, kein Ab-/Wieder-Anlegen-Churn", () => {
    const s = makeState();
    s.skills.jewelcrafting = { xp: xpForLevel(20) };
    addItem(s.inventory, content, "garnet_ring", 1);
    addItem(s.inventory, content, "sapphire_ring", 1);
    expect(equipItem(s, content, "garnet_ring").ok).toBe(true); // → ring1
    expect(equipItem(s, content, "sapphire_ring").ok).toBe(true); // → ring2
    expect(saveLoadout(s, 0)).toBe(true);

    // Positionen von Hand spiegeln (kosmetisch identischer Zustand).
    s.character.equipment.ring1 = "sapphire_ring";
    s.character.equipment.ring2 = "garnet_ring";

    const res = applyLoadout(s, content, 0);
    expect(res.applied).toBe(res.total);
    expect(res.skipped).toEqual([]);
    // Multiset stimmt — die konkrete Position bleibt gespiegelt (bewusst kein Churn).
    expect([s.character.equipment.ring1, s.character.equipment.ring2].sort()).toEqual(
      ["garnet_ring", "sapphire_ring"],
    );
  });

  it("Werkzeug-Slots bleiben beim Anlegen komplett unangetastet", () => {
    const s = makeState();
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    expect(equipTool(s, content, "bronze_pickaxe").ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);
    // Loadout anlegen — die Spitzhacke bleibt, wo sie ist.
    const res = applyLoadout(s, content, 0);
    expect(res.ok).toBe(true);
    expect(s.character.equipment.tool1).toBe("bronze_pickaxe");
  });

  it("Kampf-Regel: Wechsel IM Kampf erlaubt (Konsistenz mit manuellem Umziehen — nirgends gegated)", () => {
    const s = makeState();
    addItem(s.inventory, content, "copper_kiteshield", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    expect(saveLoadout(s, 0)).toBe(true);
    expect(unequipItem(s, content, "offhand")).toBe(true);

    // Laufenden Kampf simulieren (monsterId gesetzt) — applyLoadout kennt KEIN Kampf-Gate,
    // exakt wie equipItem/equipInstance/unequipItem (manuelles Umziehen ist im Kampf erlaubt).
    s.combat.monsterId = Object.keys(content.monsters)[0]!;
    s.combat.enemyHp = 5;
    const res = applyLoadout(s, content, 0);
    expect(res.ok).toBe(true);
    expect(res.applied).toBe(res.total);
    expect(s.character.equipment.offhand).toBe("copper_kiteshield");
  });

  it("RNG-frei: Speichern und Anlegen ziehen NIE am RNG-Strom (Determinismus-Gesetz)", () => {
    const s = makeState();
    addItem(s.inventory, content, "copper_kiteshield", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    const rngBefore = s.rng.state;
    const eliteRngBefore = s.eliteRng.state;
    expect(saveLoadout(s, 0)).toBe(true);
    expect(unequipItem(s, content, "offhand")).toBe(true);
    applyLoadout(s, content, 0);
    expect(s.rng.state).toBe(rngBefore);
    expect(s.eliteRng.state).toBe(eliteRngBefore);
  });
});
