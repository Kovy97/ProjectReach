// claude:2026-10-26T14:55:00+02:00 — QA-Runde 2 1.4.0 „Werkstatt“ (Kontrolleur): Arbeitsaufträge und Handwerks-Ereignisse.
// Nachweis-Tests; `it.fails` = offener Befund (grün = Fehler reproduziert). Nach dem Fix auf `it` umstellen.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, WorkOrder } from "@hearthforge/shared";
import { MASTERPIECE_ROLL_FLOOR } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { setActiveAction } from "./actions";
import { advance, effectiveActionDurationMs } from "./tick";
import { itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { createRng } from "./rng";
import { toggleSalvageLock } from "./salvage";
import { deliverWorkOrder, workOrderKindFor, workOrderProgress, workOrdersOf } from "./orders";

const NOW = 1_761_400_000_000;

function game(level: number, seed = 5): GameState {
  const s = createTestGame({ name: "Q" }, content, seed);
  s.settings.materialsToStorage = false;
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(level) };
  return s;
}
function handOrder(s: GameState, o: Partial<WorkOrder> & Pick<WorkOrder, "actionId" | "itemId" | "count">): WorkOrder {
  const w = workOrdersOf(s);
  w.seq += 1;
  const action = content.actions[o.actionId]!;
  const order: WorkOrder = {
    id: w.seq, kind: workOrderKindFor(action.skill)!, skill: action.skill, minutes: 20, band: 1, gold: 100, xp: 1_000,
    customerId: "guild", baseline: s.stats.producedBySkill?.[action.skill]?.[o.itemId] ?? 0, ...o, // claude:2026-10-24T16:03:31+02:00 — Zähler je Skill (SAVE 95)
  };
  w.open.push(order);
  return order;
}

describe("QA2 Aufträge: Bestand und Fortschritt", () => {
  // BEFUND (niedrig): orders.ts behandelt das Bergungs-Schloss uneinheitlich. deliverableInstances (orders.ts:81-89) lässt
  // gesperrte EINZELSTÜCKE aus Bestand und Abgabe heraus („Gesperrte Instanzen zählen nicht“), stockOf/takeFromStock
  // (orders.ts:91-93, 319-330) nehmen einen gesperrten STAPEL aber ohne Rückfrage mit. Wer einen Stapel sperrt, verliert ihn
  // bei „Abgeben“, wer ein Einzelstück sperrt, behält es.
  // claude:2026-10-24T16:03:31+02:00 — Befund B1 per Chef-Entscheid behoben („das Schloss schützt immer“): it.fails → it.
  it("gesperrter Stapel und gesperrtes Einzelstück zählen nie als Bestand und werden nie abgegeben", () => {
    const s = game(20);
    (s.stats.producedBySkill ??= {}).smithing = { copper_sword: 2 }; // Arbeit erledigt (Zähler je Skill, SAVE 95)
    const order = handOrder(s, { actionId: "forge_copper_sword", itemId: "copper_sword", count: 2, baseline: 0 });
    s.bank.copper_sword = 2;
    s.bankInstances.push({ instanceId: "v1", baseItemId: "copper_sword", affixes: [] });
    toggleSalvageLock(s, "copper_sword");
    toggleSalvageLock(s, "v1");
    expect(workOrderProgress(s, order).stock).toBe(0); // beide gesperrt → nichts abgebbar (wie beim Einzelstück)
    expect(deliverWorkOrder(s, content, order.id, createRng(1)).reason).toBe("no_stock");
    expect(s.bank.copper_sword).toBe(2);
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["v1"]);
    // Basis-Schloss allein sperrt auch das Einzelstück (wie bei der Bergung); erst offen wird abgegeben.
    toggleSalvageLock(s, "v1");
    expect(workOrderProgress(s, order).stock).toBe(0);
    toggleSalvageLock(s, "copper_sword");
    expect(workOrderProgress(s, order).stock).toBe(3);
    expect(deliverWorkOrder(s, content, order.id, createRng(1)).reason).toBe("ok");
    expect(s.bank.copper_sword ?? 0).toBe(0);
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["v1"]); // Stapel zuerst, das Einzelstück bleibt
  });

  // BEFUND (niedrig, Design): Fortschritt = producedById[item] − Startanker, und producedById zählt JEDE Quelle des Items
  // (tick.ts:343, farming.ts:133). Vier Sammel-Lieferziele sind zugleich Feldfrüchte (herb_godsbreath, pigment_radiant,
  // fiber_starflax, pigment_violet), zwei Bergbau-Ziele (rough_diamond, rough_onyx) fallen auch bei Diebstahl/Sammeln. Ein
  // Sammel-Lieferauftrag „Götteratem“ wird so durch die Felder erfüllt, offline und ohne eine Sammel-Aktion; der XP-Batzen
  // geht trotzdem an Sammeln. Goal AU: „Gezählt wird nur, was du nach der Annahme herstellst oder sammelst.“
  // claude:2026-10-24T16:03:31+02:00 — Befund B2 per Chef-Entscheid behoben („nur die passende Quelle zählt“, Zähler stats.producedBySkill, SAVE 95): it.fails → it.
  it("Sammel-Lieferauftrag Götteratem wird von der Farm-Ernte NICHT erfüllt (nur Sammeln zählt)", () => {
    const s = game(99);
    const order = handOrder(s, { actionId: "forage_godsbreath", itemId: "herb_godsbreath", count: 10 });
    s.bank.godsbreath_seed = 100;
    s.farmPlots![0] = { ...s.farmPlots![0]!, cropId: "herb_godsbreath", plantedAtMs: s.elapsedMs, autoReplant: true };
    s.activeActionId = null;
    advance(s, content, 12 * 3_600_000, { offline: true, nowMs: NOW + 12 * 3_600_000 });
    expect(itemCount(s.inventory, "herb_godsbreath") + (s.bank.herb_godsbreath ?? 0)).toBeGreaterThan(0); // geerntet
    expect(s.stats.actionRunsById.forage_godsbreath ?? 0).toBe(0); // nie gesammelt
    expect(workOrderProgress(s, order).done).toBe(0);
    // Gegenprobe: Sammeln selbst zählt (claude:2026-10-24T16:03:31+02:00).
    setActiveAction(s, content, "forage_godsbreath");
    advance(s, content, 30 * 60_000, { offline: true });
    expect(s.stats.actionRunsById.forage_godsbreath ?? 0).toBeGreaterThan(0);
    expect(workOrderProgress(s, order).done).toBeGreaterThan(0);
  });
});

describe("QA2 Ereignisse: Meisterstück", () => {
  it("Meisterstück: das nächste Ausrüstungsteil bekommt sicher ein Suffix mit Wurf ≥ 0,75; das Ereignis ist danach verbraucht", () => {
    const s = game(30);
    s.firstSuffixGranted = true; // sonst wäre das erste Suffix ohnehin sicher
    s.bank.copper_bar = 500;
    s.skillEvents!.cooldownMs = 1e12;
    s.skillEvents!.active = { id: "masterpiece", skill: "smithing", actionsLeft: 1, msLeft: 600_000 };
    setActiveAction(s, content, "forge_copper_sword");
    const dur = effectiveActionDurationMs(s, content, content.actions.forge_copper_sword!);
    for (let t = 0; t <= dur + 1_000; t += 1_000) advance(s, content, 1_000, { nowMs: NOW + t });
    const inst = s.inventory.instances.find((i) => i.baseItemId === "copper_sword");
    expect(inst?.suffix).toBeDefined();
    expect(inst!.suffix!.roll).toBeGreaterThanOrEqual(MASTERPIECE_ROLL_FLOOR);
    expect(s.skillEvents!.active).toBeNull();
    expect(s.skillEvents!.log).toEqual([]); // kein zweiter Wurf (Abklingzeit gesperrt)
  });
});
