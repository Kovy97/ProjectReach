import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { addItem, itemCount } from "./inventory";
import { equipItem } from "./equipment";
import { hasMail, mailItemCount } from "./mail";

/**
 * Regression (Postfach/Mailbox SAVE 71): Kampf-Loot ging bei vollem Inventar + Lager früher STILL
 * VERLOREN — die drei Loot-Aufrufstellen in combat.ts riefen `addItemOrBank` direkt und verwarfen
 * den Überlauf. Jetzt laufen sie über `grantLoot` (Inventar → Auto-Bank → Postfach), damit NICHTS
 * verloren geht (Muster wie der bereits umgestellte Skilling-/Crafting-Loot in tick.ts).
 *
 * Aufbau: starker Held (killt Hühner zuverlässig), Inventar RANDVOLL (ein Nahrungs-Slot fürs
 * Überleben, Rest oak_log) und Auto-Bank AUS → jeder gedroppte Fremd-Loot kann NUR ins Postfach.
 * Kein RNG-Seed-Glück nötig: chicken droppt `feather` mit 0.85 → über viele Kills quasi sicher.
 */
describe("Kampf-Loot → Postfach bei vollem Inventar+Lager (SAVE 71)", () => {
  it("Kill-Loot geht bei vollem Inventar + Auto-Bank aus ins Postfach statt verloren", () => {
    const s = createTestGame({ name: "L", baseAttributes: { str: 80, dex: 80, con: 80 } }, content, 5);
    addItem(s.inventory, content, "bronze_sword", 1);
    equipItem(s, content, "bronze_sword");

    // Auto-Bank AUS → das Postfach ist der letzte (und einzige verbleibende) Puffer für Überlauf.
    s.settings.autoBank = false;
    // EIN Nahrungs-Slot (großer Stapel → nie leergegessen, Held überlebt den Kill-Loop); alle
    // übrigen Slots randvoll mit oak_log → für JEDEN anderen Drop bleibt KEIN freier Slot.
    addItem(s.inventory, content, "cooked_chicken", 9999);
    s.character.food = "cooked_chicken";
    for (let i = 0; i < s.inventory.slots.length; i++) {
      if (s.inventory.slots[i] === null) s.inventory.slots[i] = { itemId: "oak_log", qty: 9999 };
    }
    expect(s.inventory.slots.every((sl) => sl !== null)).toBe(true); // wirklich randvoll

    const gatheredBefore = s.stats.itemsGathered;
    const instancesBefore = s.inventory.instances.length;
    const bankInstancesBefore = s.bankInstances.length;

    expect(startCombat(s, content, "chicken")).toBe(true);
    let guard = 0;
    while (s.combat.monsterId && s.combat.kills < 20 && guard++ < 10_000) combatStep(s, content);
    expect(s.combat.kills).toBeGreaterThanOrEqual(5);

    // Kernaussage: Loot ging NICHT verloren — das Postfach hat den Kill-Loot aufgefangen.
    expect(hasMail(s)).toBe(true);
    expect(mailItemCount(s)).toBeGreaterThan(0);

    // `feather` ist der häufige Chicken-Drop (0.85) → liegt im Postfach, NICHT im vollen Inventar.
    const mail = s.mailbox.find((m) => m.kind === "overflow")!;
    expect(mail).toBeDefined();
    expect((mail.items.find((a) => a.itemId === "feather")?.qty ?? 0)).toBeGreaterThan(0);
    expect(itemCount(s.inventory, "feather")).toBe(0); // nichts ins volle Inventar geleakt

    // „gained"-Verbuchung bleibt korrekt: der ins Postfach umgeleitete Loot zählt weiter als gesammelt.
    const gatheredDelta = s.stats.itemsGathered - gatheredBefore;
    expect(gatheredDelta).toBeGreaterThan(0);

    // KONSERVIERUNG (log-cap-unabhängig): jeder gedroppte Stack landete im Postfach, jede seltene
    // Suffix-Instanz irgendwo im Bestand — Summe == verbuchter Zugewinn (kein Verlust, keine Dopplung).
    // gatheredDelta = Σqty (+ ΣinstanceMade); mailItemCount = Σqty (Inv voll → alles Überlauf).
    // Instanz-Ziel: das Slot-Gitter ist von Anfang an randvoll (0 freie Slots) → das Kapazitäts-Gate
    // (Chef-Bugfix „22/20", 2026-07-23) lässt frischen Instanz-Zugang NICHT mehr in `inventory.instances`
    // — jede Suffix-Instanz geht stattdessen in den (unbegrenzten) Gear-Vault `bankInstances`.
    const instanceBagDelta = s.inventory.instances.length - instancesBefore;
    const bankInstanceDelta = s.bankInstances.length - bankInstancesBefore;
    expect(instanceBagDelta).toBe(0); // Tasche bleibt leer — kein freier Slot fürs Kapazitäts-Gate
    expect(gatheredDelta).toBe(mailItemCount(s) + instanceBagDelta + bankInstanceDelta);
  });
});
