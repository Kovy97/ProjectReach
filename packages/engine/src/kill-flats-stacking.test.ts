import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { EquipSlot, ItemDef, WeaponEffect } from "@hearthforge/shared";
import { createGame } from "./state";
import { collectSpecialEffects } from "./combat";

/**
 * Spieler-Report 28.08.2026 (RU): „Kill-Heilung aus verschiedenen Gegenständen ist nicht kumulativ."
 * Stimmte: collectSpecialEffects ließ je Kind nur die stärkste Magnitude gelten. Für die flachen
 * Kill-Rückflüsse (healOnKill/manaOnKill/cooldownOnKill) summieren sich die Quellen jetzt; alle
 * anderen Kinds (bane, execute, …) bleiben bei „stärkste gewinnt" (bane.test.ts).
 */
function effectsOf(item: ItemDef): WeaponEffect[] {
  return [...(item.weaponEffects ?? []), ...(item.weaponEffect ? [item.weaponEffect] : [])];
}

describe("Kill-Flats aus mehreren Quellen summieren", () => {
  it("healOnKill von Waffe + Rüstungsteil addiert sich", () => {
    const carriers = Object.values(content.items).filter((i) => effectsOf(i).some((e) => e.type === "healOnKill" && e.magnitude > 0));
    // Zwei Träger in verschiedenen Ausrüstungsplätzen (Katalog: Klinge +2, Armschützer +4, …).
    const bySlot = new Map<EquipSlot, ItemDef>();
    for (const it of carriers) if (it.slot && !bySlot.has(it.slot)) bySlot.set(it.slot, it);
    expect(bySlot.size, "mindestens zwei Ausrüstungsplätze tragen healOnKill im Katalog").toBeGreaterThanOrEqual(2);
    const [a, b] = [...bySlot.values()];
    const state = createGame({ name: "Flats" }, content, 7);
    state.character.equipment[a!.slot!] = a!.id;
    state.character.equipment[b!.slot!] = b!.id;
    const magA = effectsOf(a!).find((e) => e.type === "healOnKill")!.magnitude;
    const magB = effectsOf(b!).find((e) => e.type === "healOnKill")!.magnitude;
    const fx = collectSpecialEffects(state, content);
    expect(fx.healOnKill?.magnitude).toBe(magA + magB);
  });

  it("ein einzelner Träger bleibt unverändert", () => {
    const carrier = Object.values(content.items).find((i) => i.slot && effectsOf(i).some((e) => e.type === "healOnKill"));
    expect(carrier).toBeDefined();
    const state = createGame({ name: "Flats" }, content, 7);
    state.character.equipment[carrier!.slot!] = carrier!.id;
    const fx = collectSpecialEffects(state, content);
    expect(fx.healOnKill?.magnitude).toBe(effectsOf(carrier!).find((e) => e.type === "healOnKill")!.magnitude);
  });
});
