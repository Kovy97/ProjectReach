import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { EVENT_CRAFT_SKILLS, FISH_SHOAL_MS, ORDER_GATHER_SKILLS, RICH_VEIN_ACTIONS, THRIFTY_HAND_CRAFTS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { eventPoolFor } from "./events";

/**
 * QA-Prüfrunde 1.4.0 Welle 3 (Zufallsereignisse): Grenzfälle, die die Bestandstests nicht abdecken
 * (claude:2026-10-25T18:30:00+02:00, Kontrolleur). Nur Lesezugriff auf Engine/Content; kein Electron, keine echten Spielstände.
 */
const NOW = 1_761_300_000_000;

function game(skillLevel = 60, seed = 11): GameState {
  const s = createTestGame({ name: "Q" }, content, seed);
  s.settings.materialsToStorage = false;
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(skillLevel) };
  return s;
}

function live(s: GameState, ms: number, step = 1_000, from = 0): void {
  for (let t = 0; t < ms; t += step) advance(s, content, step, { nowMs: NOW + from + t });
}

function have(s: GameState, id: string): number {
  return itemCount(s.inventory, id) + (s.bank[id] ?? 0);
}

describe("Determinismus", () => {
  it("Live-Loop MIT ausgelösten Ereignissen (Bergbau 10 h) lässt state.rng und die Abschlusszahl bitgleich zum Sim-Lauf", () => {
    const a = game();
    const b = game();
    setActiveAction(a, content, "mine_copper");
    setActiveAction(b, content, "mine_copper");
    live(a, 10 * 3_600_000, 5_000);
    advance(b, content, 10 * 3_600_000);
    expect(a.skillEvents!.seq).toBeGreaterThan(0); // es gab Ereignisse (Reiche Ader / Kundschaft)
    expect(a.rng).toEqual(b.rng); // Auslöse-/Auswahlwürfe kommen nur aus eventRng
    expect(a.stats.actionRunsById.mine_copper).toBe(b.stats.actionRunsById.mine_copper);
    expect(have(a, "copper_ore")).toBeGreaterThanOrEqual(have(b, "copper_ore")); // Reiche Ader nur additiv
    expect(a.eventRng).not.toEqual(b.eventRng); // der Ereignis-Strom wurde online verbraucht
  });

  it("Offline-Catch-up (offline:true + nowMs) == Live-Loop mit gesperrter Abklingzeit: bitgleich, kein Ereignis", () => {
    const a = game();
    const b = game();
    b.skillEvents!.cooldownMs = 1e12;
    setActiveAction(a, content, "catch_shrimp");
    setActiveAction(b, content, "catch_shrimp");
    advance(a, content, 3_600_000, { offline: true, nowMs: NOW + 3_600_000 });
    live(b, 3_600_000, 1_000);
    expect(a.rng).toEqual(b.rng);
    expect(a.inventory).toEqual(b.inventory);
    expect(a.bank).toEqual(b.bank);
    expect(a.skills.fishing!.xp).toBe(b.skills.fishing!.xp);
    expect(a.skillEvents!.seq).toBe(0);
    expect(a.workOrders!.offer).toBeNull();
    expect(a.eventRng).toEqual(game().eventRng); // offline kein einziger Wurf aus dem Ereignis-Strom
  });
});

describe("Ereignis-Ablauf bei Aktionswechsel", () => {
  it("Reiche Ader hängt am Bergbau: wirkt nicht auf Holz, läuft nach 10 min Online-Zeit ab, blockiert solange neue Würfe", () => {
    const a = game(1);
    const b = game(1);
    a.skillEvents!.cooldownMs = 0;
    a.skillEvents!.active = { id: "rich_vein", skill: "mining", actionsLeft: RICH_VEIN_ACTIONS, msLeft: 600_000 };
    b.skillEvents!.cooldownMs = 1e12; // Kontrolle: nie ein Ereignis
    setActiveAction(a, content, "cut_normal_tree");
    setActiveAction(b, content, "cut_normal_tree");
    live(a, 600_000, 1_000);
    live(b, 600_000, 1_000);
    expect(a.skillEvents!.active).toBeNull(); // Zeituhr abgelaufen
    expect(a.skillEvents!.seq).toBe(0); // während des hängenden Ereignisses kein neuer Wurf (Spec §3.1)
    expect(a.eventRng).toEqual(b.eventRng);
    expect(have(a, "normal_log")).toBe(have(b, "normal_log")); // keine Wirkung auf einen anderen Skill
    expect(a.rng).toEqual(b.rng);
  });

  it("Sparsame Hand zählt nur Herstellungen des eigenen Skills (Fremd-Skill verbraucht nichts, spart nichts)", () => {
    const a = game();
    const b = game();
    for (const s of [a, b]) {
      s.skillEvents!.cooldownMs = 1e12;
      s.bank.copper_ore = 500;
      setActiveAction(s, content, "smelt_copper");
    }
    a.skillEvents!.active = { id: "thrifty_hand", skill: "cooking", actionsLeft: THRIFTY_HAND_CRAFTS, msLeft: 360_000 };
    live(a, 60_000, 100);
    live(b, 60_000, 100);
    expect(a.skillEvents!.active?.actionsLeft).toBe(THRIFTY_HAND_CRAFTS);
    expect(have(a, "copper_ore")).toBe(have(b, "copper_ore"));
    expect(a.rng).toEqual(b.rng);
  });

  it("Fischschwarm: Uhr steht offline (auch über ein langes Fenster), läuft online auch im Leerlauf weiter", () => {
    const s = game();
    s.skillEvents!.active = { id: "fish_shoal", skill: "fishing", actionsLeft: 0, msLeft: FISH_SHOAL_MS };
    setActiveAction(s, content, "catch_shrimp");
    advance(s, content, 2 * 3_600_000, { offline: true, nowMs: NOW });
    expect(s.skillEvents!.active).toEqual({ id: "fish_shoal", skill: "fishing", actionsLeft: 0, msLeft: FISH_SHOAL_MS });
    s.activeActionId = null; // Leerlauf online
    live(s, 30_000, 1_000);
    expect(s.skillEvents!.active?.msLeft).toBe(FISH_SHOAL_MS - 30_000);
  });
});

describe("Ländereien", () => {
  it("Prächtige Ernte wird offline nie vorgemerkt (Strom unberührt), online innerhalb weniger Stunden schon", () => {
    const crop = content.crops!.graywort!;
    const mk = (): GameState => {
      const s = game();
      s.bank[crop.seedItem] = 10_000;
      s.farmPlots![0] = { ...s.farmPlots![0]!, cropId: "graywort", plantedAtMs: s.elapsedMs, autoReplant: true };
      return s;
    };
    const off = mk();
    const before = structuredClone(off.eventRng);
    advance(off, content, 10 * 3_600_000, { offline: true, nowMs: NOW + 10 * 3_600_000 });
    expect(have(off, crop.yieldItem)).toBeGreaterThan(0); // es wurde geerntet
    expect(off.skillEvents!.harvestReady).toBe(false);
    expect(off.skillEvents!.seq).toBe(0);
    expect(off.eventRng).toEqual(before);

    const on = mk();
    let t = 0;
    while (!on.skillEvents!.harvestReady && t < 12 * 3_600_000) {
      advance(on, content, 5_000, { nowMs: NOW + t });
      t += 5_000;
    }
    expect(on.skillEvents!.harvestReady).toBe(true);
    expect(on.skillEvents!.log[0]?.id).toBe("bountiful_harvest");
  });
});

describe("Abdeckung", () => {
  it("jeder Skill mit Aktionen hat einen Ereignis-Topf; Sammel-/Handwerks-Listen nennen nur echte Skill-IDs", () => {
    for (const id of [...EVENT_CRAFT_SKILLS, ...ORDER_GATHER_SKILLS]) expect(content.skills[id], id).toBeDefined();
    const uncovered = new Set<string>();
    for (const a of Object.values(content.actions)) if (!eventPoolFor(content, a)) uncovered.add(a.skill);
    expect([...uncovered]).toEqual([]);
  });
});
