import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, EquipSlot, ItemDef, WeaponEffect } from "@hearthforge/shared";
import { createGame } from "./state";
import { collectSpecialEffects } from "./combat";

/**
 * Spieler-Report 28.08.2026 (RU): „Kill-Heilung aus verschiedenen Gegenständen ist nicht kumulativ."
 * Stimmte: collectSpecialEffects ließ je Kind nur die stärkste Magnitude gelten. Für die flachen
 * Kill-Rückflüsse (healOnKill/wardOnKill/cooldownOnKill) summieren sich die Quellen jetzt; alle
 * anderen Kinds (bane, execute, …) bleiben bei „stärkste gewinnt" (bane.test.ts).
 * Revision 29.08.2026: cooldownOnKill trägt seinen Wert in `durationMs` (ms Abzug vom Kill-Cooldown,
 * magnitude bei allen Trägern 0) — die Summe muss daher AUCH durationMs addieren, sonst gewinnt still
 * der zuerst gelesene Slot.
 */
function effectsOf(item: ItemDef): WeaponEffect[] {
  return [...(item.weaponEffects ?? []), ...(item.weaponEffect ? [item.weaponEffect] : [])];
}

/** Content-Klon mit zusätzlichen synthetischen Items (für Kinds ohne zwei Katalog-Slots). */
function withItems(extra: ItemDef[]): ContentDB {
  const items = { ...content.items };
  for (const it of extra) items[it.id] = it;
  return { ...content, items };
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

  it("cooldownOnKill von Bogen + Handschuhen addiert die ms (der Kill-Pfad liest durationMs, nicht magnitude)", () => {
    const carriers = Object.values(content.items).filter((i) => effectsOf(i).some((e) => e.type === "cooldownOnKill" && e.durationMs > 0));
    const bySlot = new Map<EquipSlot, ItemDef>();
    for (const it of carriers) if (it.slot && !bySlot.has(it.slot)) bySlot.set(it.slot, it);
    expect(bySlot.size, "mindestens zwei Ausrüstungsplätze tragen cooldownOnKill im Katalog (Bogen, Handschuhe)").toBeGreaterThanOrEqual(2);
    const [a, b] = [...bySlot.values()];
    const state = createGame({ name: "Flats" }, content, 7);
    state.character.equipment[a!.slot!] = a!.id;
    state.character.equipment[b!.slot!] = b!.id;
    const msA = effectsOf(a!).find((e) => e.type === "cooldownOnKill")!.durationMs;
    const msB = effectsOf(b!).find((e) => e.type === "cooldownOnKill")!.durationMs;
    expect(msA).toBeGreaterThan(0);
    expect(msB).toBeGreaterThan(0);
    const fx = collectSpecialEffects(state, content);
    expect(fx.cooldownOnKill?.durationMs).toBe(msA + msB);
    // Die Summe liegt echt über dem stärksten Einzelträger — genau das war vor der Revision nicht der Fall.
    expect(fx.cooldownOnKill!.durationMs).toBeGreaterThan(Math.max(msA, msB));
    // Alle Katalog-Träger führen den Abzug in durationMs; magnitude ist dort 0 (Pin der Feld-Konvention).
    for (const it of carriers) expect(effectsOf(it).find((e) => e.type === "cooldownOnKill")!.magnitude).toBe(0);
  });

  it("wardOnKill steht in der additiven Menge: zwei Träger (Waffe + Handschuhe) addieren magnitude", () => {
    const wardA: ItemDef = {
      id: "t_ward_blade", name: "Ward Blade", type: "equipment", stackable: false, value: 1, slot: "mainhand",
      weaponEffect: { type: "wardOnKill", chance: 1, magnitude: 5, durationMs: 0 },
    };
    const wardB: ItemDef = {
      id: "t_ward_gloves", name: "Ward Gloves", type: "equipment", stackable: false, value: 1, slot: "gloves",
      weaponEffect: { type: "wardOnKill", chance: 1, magnitude: 7, durationMs: 0 },
    };
    const c = withItems([wardA, wardB]);
    const state = createGame({ name: "Flats" }, c, 7);
    state.character.equipment.mainhand = wardA.id;
    state.character.equipment.gloves = wardB.id;
    const fx = collectSpecialEffects(state, c);
    expect(fx.wardOnKill?.magnitude).toBe(12);
    expect(fx.wardOnKill?.durationMs).toBe(0);
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
