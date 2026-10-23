import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { EVENT_COOLDOWN_MS, FISH_SHOAL_SPEED, RICH_VEIN_ACTIONS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { setActiveAction } from "./actions";
import { advance, effectiveActionDurationMs } from "./tick";
import { itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { stormFellBundle } from "./events";

/**
 * Zufallsereignisse (1.4.0 „Feder und Stahl“ Welle 3 EV; claude:2026-10-25T00:10:00+02:00). Chef 23.10.: nur online,
 * etwa alle 20–30 min, wirken sofort. Zahlen design/1.4.0-balance-werkstatt.md §3.
 */
const NOW = 1_761_300_000_000;

function game(skillLevel = 60): GameState {
  const s = createTestGame({ name: "E" }, content, 11);
  s.settings.materialsToStorage = false;
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(skillLevel) };
  return s;
}

/** Live-Loop: kleine Fenster mit echter Uhrzeit (wie der Client), damit Ereignisse würfeln dürfen. */
function live(s: GameState, ms: number, step = 1_000): void {
  for (let t = 0; t < ms; t += step) advance(s, content, step, { nowMs: NOW + t });
}

function have(s: GameState, id: string): number {
  return itemCount(s.inventory, id) + (s.bank[id] ?? 0);
}

describe("Takt und Strom", () => {
  it("ohne Uhrzeit (Sim, Tests) und offline: kein Ereignis, Abklingzeit unberührt", () => {
    const a = game();
    setActiveAction(a, content, "mine_copper");
    advance(a, content, 3_600_000);
    expect(a.skillEvents).toEqual({ cooldownMs: EVENT_COOLDOWN_MS, active: null, harvestReady: false, trailReady: false, log: [], seq: 0 });
    const b = game();
    setActiveAction(b, content, "mine_copper");
    advance(b, content, 3_600_000, { offline: true, nowMs: NOW });
    expect(b.skillEvents?.seq).toBe(0);
    expect(b.skillEvents?.cooldownMs).toBe(EVENT_COOLDOWN_MS);
  });

  it("ohne Ereignis bleibt state.rng bitgleich: Live-Loop mit gesperrter Abklingzeit == Sim-Lauf", () => {
    const a = game();
    const b = game();
    a.skillEvents!.cooldownMs = 1e12;
    b.skillEvents!.cooldownMs = 1e12;
    setActiveAction(a, content, "mine_copper");
    setActiveAction(b, content, "mine_copper");
    live(a, 600_000);
    advance(b, content, 600_000);
    expect(a.rng).toEqual(b.rng);
    expect(a.inventory).toEqual(b.inventory);
    expect(a.eventRng).toEqual(b.eventRng); // ohne Wurf auch der Ereignis-Strom unberührt
  });

  it("im Mittel ein Ereignis je 20–30 min aktiven Skillens (10 h Bergbau)", () => {
    const s = game();
    setActiveAction(s, content, "mine_copper");
    live(s, 10 * 3_600_000, 5_000);
    const n = s.skillEvents!.seq;
    expect(n).toBeGreaterThanOrEqual(12);
    expect(n).toBeLessThanOrEqual(40);
    expect(s.skillEvents!.log.length).toBeLessThanOrEqual(10);
  });
});

describe("Wirkungen", () => {
  it("Reiche Ader verdoppelt den Haupt-Ertrag und zählt herunter", () => {
    const a = game(1);
    const b = game(1);
    for (const s of [a, b]) {
      s.skillEvents!.cooldownMs = 1e12;
      setActiveAction(s, content, "mine_copper");
    }
    a.skillEvents!.active = { id: "rich_vein", skill: "mining", actionsLeft: RICH_VEIN_ACTIONS, msLeft: 600_000 };
    live(a, 30_000, 100);
    live(b, 30_000, 100);
    expect(have(a, "copper_ore")).toBe(2 * have(b, "copper_ore"));
    expect(a.skillEvents!.active?.actionsLeft).toBe(RICH_VEIN_ACTIONS - have(b, "copper_ore"));
  });

  it("Fischschwarm: +50 % Tempo nur online", () => {
    const s = game();
    const act = content.actions.catch_shrimp!;
    const base = effectiveActionDurationMs(s, content, act);
    s.skillEvents!.active = { id: "fish_shoal", skill: "fishing", actionsLeft: 0, msLeft: 180_000 };
    expect(effectiveActionDurationMs(s, content, act)).toBe(Math.max(1, Math.round(base / FISH_SHOAL_SPEED)));
    expect(effectiveActionDurationMs(s, content, act, undefined, true)).toBe(base);
  });

  it("Wachwechsel: Fehlschläge betäuben nicht", () => {
    const s = game(1);
    s.skillEvents!.cooldownMs = 1e12;
    s.skillEvents!.active = { id: "guard_change", skill: "thieving", actionsLeft: 0, msLeft: 300_000 };
    setActiveAction(s, content, "pickpocket_beggar");
    for (let t = 0; t < 120_000; t += 100) {
      advance(s, content, 100, { nowMs: NOW + t });
      expect(s.stunMs).toBe(0);
    }
  });

  it("Sparsame Hand spart Material bei Herstellungen", () => {
    const a = game();
    const b = game();
    for (const s of [a, b]) {
      s.skillEvents!.cooldownMs = 1e12;
      s.bank.copper_ore = 500;
      setActiveAction(s, content, "smelt_copper");
    }
    a.skillEvents!.active = { id: "thrifty_hand", skill: "smithing", actionsLeft: 25, msLeft: 360_000 };
    live(a, 26_000 * 2.6, 100);
    live(b, 26_000 * 2.6, 100);
    expect(have(a, "copper_bar")).toBe(have(b, "copper_bar"));
    expect(have(a, "copper_ore")).toBeGreaterThan(have(b, "copper_ore"));
  });

  it("Meisterstück: das nächste Ausrüstungsteil trägt sicher einen Suffix im oberen Viertel", () => {
    const s = game();
    s.skillEvents!.cooldownMs = 1e12;
    s.firstSuffixGranted = true;
    s.bank.copper_bar = 5;
    s.skillEvents!.active = { id: "masterpiece", skill: "smithing", actionsLeft: 1, msLeft: 600_000 };
    setActiveAction(s, content, "forge_copper_sword");
    live(s, 3_000, 100);
    const inst = s.inventory.instances.find((i) => i.baseItemId === "copper_sword");
    expect(inst?.suffix?.roll).toBeGreaterThanOrEqual(0.75);
    expect(s.skillEvents!.active).toBeNull();
  });

  it("Wilder Garten: Nebenfunde ≤ 25 % fallen sicher, Rohsteine und häufigere Funde nicht", () => {
    const s = game();
    s.skillEvents!.cooldownMs = 1e12;
    s.skillEvents!.active = { id: "wild_garden", skill: "foraging", actionsLeft: 5, msLeft: 600_000 };
    setActiveAction(s, content, "forage_ashfields");
    const dur = effectiveActionDurationMs(s, content, content.actions.forage_ashfields!);
    live(s, dur + 50, 50);
    for (const id of ["graywort_seed", "grimwheat_seed", "ashroot_seed"]) expect(have(s, id), id).toBeGreaterThan(0);
    expect(s.skillEvents!.active?.actionsLeft).toBe(4);
  });

  it("Sturmbruch: Bündel der nächsthöheren Holzart (Spec-Beispiel Schattenkiefer → 15 Gespensterholz)", () => {
    const s = game(70);
    expect(stormFellBundle(s, content, content.actions.cut_shadowpine_tree!, 4_340)).toEqual({ itemId: "wraithwood_log", qty: 15 });
    const top = Object.values(content.actions)
      .filter((a) => a.skill === "woodcutting" && !a.inputs?.length)
      .sort((x, y) => (y.levelRequired ?? 1) - (x.levelRequired ?? 1))[0]!;
    expect(stormFellBundle(s, content, top, 10_000)?.itemId).toBe(top.loot[0]!.itemId);
  });

  it("Prächtige Ernte: die vorgemerkte nächste Ernte zählt doppelt (auch offline)", () => {
    const crop = content.crops!.graywort!;
    const mk = (): GameState => {
      const s = game();
      s.bank[crop.seedItem] = 5;
      s.farmPlots![0] = { ...s.farmPlots![0]!, cropId: "graywort", plantedAtMs: s.elapsedMs, autoReplant: false } as never;
      return s;
    };
    const a = mk();
    const b = mk();
    a.skillEvents!.harvestReady = true;
    advance(a, content, crop.growMs + 1_000, { offline: true });
    advance(b, content, crop.growMs + 1_000, { offline: true });
    expect(have(a, crop.yieldItem)).toBe(2 * have(b, crop.yieldItem));
    expect(a.skillEvents!.harvestReady).toBe(false);
  });
});
