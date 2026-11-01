import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "@hearthforge/engine";
import { coreValueOf, isUpgradeOverEquipped } from "./upgradeMarker";

// claude:2026-10-31T16:34:28+01:00 — Aufwertungs-Marker ▲ (1.4.2).

function pairFor(kind: "armorRating" | "evasionRating" | "wardCapacity") {
  const bySlot = new Map<string, { id: string; v: number }[]>();
  for (const i of Object.values(content.items)) {
    if (i.type !== "equipment" || !i.slot || i.slot === "ring1" || i.slot === "ring2") continue;
    const top = Math.max(i.armorRating ?? 0, i.evasionRating ?? 0, i.wardCapacity ?? 0);
    if (top <= 0 || (i[kind] ?? 0) !== top) continue;
    const list = bySlot.get(i.slot) ?? [];
    list.push({ id: i.id, v: top });
    bySlot.set(i.slot, list);
  }
  for (const list of bySlot.values()) {
    list.sort((x, y) => x.v - y.v);
    if (list.length >= 2 && list[0]!.v < list[list.length - 1]!.v) return { low: list[0]!, high: list[list.length - 1]! };
  }
  return null;
}

function maxed() {
  const s = createGame({ name: "T" }, content, 1);
  for (const id of Object.keys(content.skills)) s.skills[id] = { ...(s.skills[id] ?? {}), xp: 1e9 } as never;
  return s;
}

describe("Aufwertungs-Marker", () => {
  it("markiert nur Teile mit höherem Kernwert desselben Typs im selben Platz", () => {
    const pair = pairFor("armorRating");
    expect(pair).not.toBeNull();
    const item = content.items[pair!.low.id]!;
    const s = maxed();
    s.character.equipment[item.slot!] = pair!.low.id;
    expect(isUpgradeOverEquipped(s, pair!.high.id)).toBe(true);
    expect(isUpgradeOverEquipped(s, pair!.low.id)).toBe(false);
    s.character.equipment[item.slot!] = pair!.high.id;
    expect(isUpgradeOverEquipped(s, pair!.low.id)).toBe(false);
    // Anforderungen nicht erfüllt: kein Marker.
    const needy = createGame({ name: "T" }, content, 1);
    needy.character.equipment[item.slot!] = pair!.low.id;
    const hi = content.items[pair!.high.id]!;
    if (hi.requirements && Object.values(hi.requirements).some((n) => (n ?? 0) > 1)) {
      expect(isUpgradeOverEquipped(needy, pair!.high.id)).toBe(false);
    }
  });

  it("zeigt nichts bei leerem Platz und nichts für Schmuck", () => {
    const s = createGame({ name: "T" }, content, 1);
    const ring = Object.values(content.items).find((i) => i.type === "equipment" && i.slot === "ring1");
    if (ring) expect(isUpgradeOverEquipped(s, ring.id)).toBe(false);
    const any = Object.values(content.items).find((i) => i.type === "equipment" && i.armorRating && i.slot);
    s.character.equipment[any!.slot!] = undefined as never;
    expect(isUpgradeOverEquipped(s, any!.id)).toBe(false);
  });

  it("vergleicht Waffen nur im gleichen Kampfstil", () => {
    const weapons = Object.values(content.items).filter(
      (i) => i.type === "equipment" && i.slot === "mainhand" && i.damageMin !== undefined && !i.requirements,
    );
    const melee = weapons.find((w) => (w.weaponStyle ?? "melee") === "melee");
    const magic = weapons.find((w) => w.weaponStyle === "magic");
    if (!melee || !magic) return;
    const s = createGame({ name: "T" }, content, 1);
    s.character.equipment.mainhand = melee.id;
    expect(isUpgradeOverEquipped(s, magic.id)).toBe(false);
    expect(coreValueOf(melee.id)?.kind).toBe("dps");
  });
});
