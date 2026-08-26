import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB } from "@hearthforge/shared";
import { AUTO_EAT_COOLDOWN_MS, AUTO_POTION_COOLDOWN_MS, SLAYER_SKIP_FREE_BELOW_LEVEL } from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { consumeFailReason, tickBuffs, useConsumable } from "./consumable";
import { consumeCooldownKind } from "./consume-gate";
import { assignTask, effectiveSkipCost, getSlayerLevel, skipTask } from "./slayer";
import { addItem, itemCount } from "./inventory";

/**
 * Auftragsmarke (Chef-GO 26.08.2026, Belohnungsladen `chronicle_task_token`): Verbrauchsgut mit der
 * Sonder-Wirkung `consumable: { kind: "slayerReroll" }` — würfelt den aktiven Slayer-Auftrag GRATIS
 * neu (kein Punkteabzug, kein Streak-Bruch, Tages-Gratis-Skip unberührt). Das Content-Item legt ein
 * anderer Agent parallel an; hier wird das Kind über ein synthetisches Item auf dem ECHTEN Katalog
 * (echter Meister, echte Monster) durch den einzigen Verzehr-Einstieg `useConsumable` geprüft.
 */
const TOKEN = "test_task_token";
/** Hypothetisches Combo-Item (Dauer-Buff + Sonder-Wirkung) für den Auto-Rebuff-Guard. */
const COMBO = "test_task_combo";

const c: ContentDB = {
  ...content,
  items: {
    ...content.items,
    [TOKEN]: {
      id: TOKEN,
      name: "Task Token",
      type: "consumable",
      stackable: true,
      consumable: { kind: "slayerReroll" },
    },
    [COMBO]: {
      id: COMBO,
      name: "Task Combo",
      type: "consumable",
      stackable: true,
      consumable: { kind: "slayerReroll" },
      buff: { durationMs: 1_000, category: "utility", bonus: {} },
    },
  },
};

const MASTER = content.slayerMasters![0]!.id;

/** Spieler ÜBER der Gnaden-Schwelle mit 0 Punkten: ein Skip würde kosten und scheitern. */
function game(seed: number) {
  const s = createGame({ name: "X" }, c, seed);
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(5) };
  }
  s.skills["slayer"] = { xp: xpForLevel(15) };
  expect(getSlayerLevel(s)).toBeGreaterThanOrEqual(SLAYER_SKIP_FREE_BELOW_LEVEL);
  s.slayerPoints = 0;
  s.slayerStreak = 3;
  s.slayerFreeSkipDay = 20260801;
  addItem(s.inventory, c, TOKEN, 2);
  expect(itemCount(s.inventory, TOKEN)).toBe(2);
  return s;
}

describe("Auftragsmarke — useConsumable mit Kind slayerReroll", () => {
  it("Klassifikation: reine Marke ist benutzbar, heilt nicht, taktet nicht (consume-gate kind none)", () => {
    expect(consumeCooldownKind(c, TOKEN)).toBe("none");
  });

  it("OHNE aktiven Auftrag: nicht benutzbar, keine Marke verbraucht, RNG unberührt, Grund no_slayer_task", () => {
    const s = game(4);
    expect(s.slayerTask).toBeNull();
    const rngBefore = s.rng.state;
    expect(consumeFailReason(s, c, TOKEN)).toBe("no_slayer_task");
    expect(useConsumable(s, c, TOKEN)).toBe(false);
    expect(itemCount(s.inventory, TOKEN)).toBe(2);
    expect(s.rng.state).toBe(rngBefore);
    expect(s.slayerTask).toBeNull();
    expect(s.slayerPoints).toBe(0);
    expect(s.slayerStreak).toBe(3);
  });

  it("MIT Auftrag: 1 Marke verbraucht, neuer Auftrag beim selben Meister; Punkte/Serie/Tages-Skip unverändert", () => {
    const s = game(4);
    const old = assignTask(s, c, MASTER);
    expect(old).not.toBeNull();
    const master = c.slayerMasters!.find((m) => m.id === MASTER)!;
    expect(effectiveSkipCost(s, c, master)).toBeGreaterThan(0); // Skip wäre kostenpflichtig …
    expect(skipTask(s, c)).toBe(false); // … und mit 0 Punkten unmöglich

    expect(consumeFailReason(s, c, TOKEN)).toBeNull();
    expect(useConsumable(s, c, TOKEN)).toBe(true);
    expect(itemCount(s.inventory, TOKEN)).toBe(1);
    const next = s.slayerTask;
    expect(next).not.toBeNull();
    expect(next).not.toBe(old); // frisch gewürfeltes Task-Objekt
    expect(next!.masterId).toBe(MASTER);
    expect(next!.progress).toBe(0);
    expect(next!.required).toBeGreaterThan(0);
    expect(s.slayerPoints).toBe(0);
    expect(s.slayerStreak).toBe(3);
    expect(s.slayerFreeSkipDay).toBe(20260801);

    // Zweite Marke: erneut gratis, erneut Serie/Punkte unberührt.
    expect(useConsumable(s, c, TOKEN)).toBe(true);
    expect(itemCount(s.inventory, TOKEN)).toBe(0);
    expect(s.slayerTask!.masterId).toBe(MASTER);
    expect(s.slayerPoints).toBe(0);
    expect(s.slayerStreak).toBe(3);

    // Ohne Marke: kein Verbrauch, kein Reroll (Bestandsprüfung greift vor der Wirkung).
    const rngBefore = s.rng.state;
    const stay = s.slayerTask;
    expect(useConsumable(s, c, TOKEN)).toBe(false);
    expect(s.slayerTask).toBe(stay);
    expect(s.rng.state).toBe(rngBefore);
  });

  it("DETERMINISMUS: gleiche Seed ⇒ identischer neuer Auftrag und identischer RNG-Stand", () => {
    const a = game(21);
    const b = game(21);
    assignTask(a, c, MASTER);
    assignTask(b, c, MASTER);
    expect(useConsumable(a, c, TOKEN)).toBe(true);
    expect(useConsumable(b, c, TOKEN)).toBe(true);
    expect(a.slayerTask).toEqual(b.slayerTask);
    expect(a.rng.state).toBe(b.rng.state);
  });

  it("im Kampf bei laufendem Ess-/Trank-Takt benutzbar: die Marke heilt nicht und unterliegt keinem Takt", () => {
    const s = game(4);
    const old = assignTask(s, c, MASTER)!;
    s.combat.monsterId = old.monsterId;
    s.combat.autoEatCooldownMs = AUTO_EAT_COOLDOWN_MS;
    s.combat.autoPotionCooldownMs = AUTO_POTION_COOLDOWN_MS;
    expect(consumeFailReason(s, c, TOKEN)).toBeNull();
    expect(useConsumable(s, c, TOKEN)).toBe(true);
    expect(itemCount(s.inventory, TOKEN)).toBe(1);
    // Kein Takt gesetzt/verändert durch die Marke.
    expect(s.combat.autoEatCooldownMs).toBe(AUTO_EAT_COOLDOWN_MS);
    expect(s.combat.autoPotionCooldownMs).toBe(AUTO_POTION_COOLDOWN_MS);
  });

  it("GUARD: der Auto-Rebuff fasst Items mit Sonder-Wirkung nie an (kein Reroll, kein Verbrauch)", () => {
    const s = game(4);
    addItem(s.inventory, c, COMBO, 2);
    s.character.autoPotion.autoRebuffUnlocked = true;
    s.character.autoPotion.autoRebuffTonics = true;
    const task = assignTask(s, c, MASTER)!;
    s.character.buffs.push({ itemId: COMBO, remainingMs: 100 });
    const rngBefore = s.rng.state;
    tickBuffs(s, c, 100); // Buff läuft ab → Rebuff-Versuch
    expect(s.character.buffs.some((b) => b.itemId === COMBO)).toBe(false); // nicht nachgetrunken
    expect(itemCount(s.inventory, COMBO)).toBe(2);
    expect(s.slayerTask).toBe(task);
    expect(s.rng.state).toBe(rngBefore);
    // Von Hand bleibt das Combo-Item voll nutzbar: Buff UND Reroll in einem Verzehr.
    expect(useConsumable(s, c, COMBO)).toBe(true);
    expect(itemCount(s.inventory, COMBO)).toBe(1);
    expect(s.slayerTask).not.toBe(task);
    expect(s.character.buffs.some((b) => b.itemId === COMBO)).toBe(true);
  });

  it("consumeFailReason: cooldown für heilende Items im Kampf (Reihenfolge wie useConsumable), sonst null", () => {
    const s = game(4);
    expect(consumeFailReason(s, c, "cooked_shrimp")).toBeNull(); // außerhalb des Kampfes kein Takt
    expect(consumeFailReason(s, c, "iron_ore")).toBeNull(); // kein Consumable → kein Grund
    const old = assignTask(s, c, MASTER)!;
    s.combat.monsterId = old.monsterId;
    s.combat.autoEatCooldownMs = AUTO_EAT_COOLDOWN_MS;
    expect(consumeFailReason(s, c, "cooked_shrimp")).toBe("cooldown");
    expect(consumeFailReason(s, c, TOKEN)).toBeNull();
  });
});
