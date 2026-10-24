import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { addItem, createGame, plantCrop, setActiveAction } from "@hearthforge/engine";
import { xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA-Runde 2, 1.4.0 Welle 1 Ländereien: Offline-Bericht-Block „Ländereien: Ernte“ (Kontrolleur, claude:2026-10-26T14:50:00+02:00).
 * `it.fails("BUG: …")` = belegter Befund (SOLL-Formulierung, reißt heute).
 */
const AT = 1_761_800_000_000;
const H = 3_600_000;

function game(seed: number): GameState {
  const s = createGame({ name: "QA-Offline" }, content, seed);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
  return s;
}

describe("Offline-Bericht: Ländereien", () => {
  it("Ernte der Beete erscheint als farmHarvests (Menge = Ernte-Stücke des Fensters)", () => {
    const s = game(21);
    const crop = Object.values(content.crops ?? {}).sort((a, b) => a.growMs - b.growMs)[0]!;
    addItem(s.inventory, content, crop.seedItem, 50);
    expect(plantCrop(s, content, 0, crop.id)).toBe(true);
    const before = s.stats.producedById?.[crop.yieldItem] ?? 0;
    const out = deserialize(serialize(s, AT), content, AT + 2 * H)!;
    expect(out.offlineTicks).toBeGreaterThan(0);
    const row = out.offline.farmHarvests?.find((h) => h.itemId === crop.yieldItem);
    expect(row).toBeTruthy();
    expect(row!.qty).toBe((out.state.stats.producedById?.[crop.yieldItem] ?? 0) - before);
    // claude:2026-10-24T15:21:04+02:00 — dieselbe Menge steht im Beet-Zähler (SAVE 94), der nur Beet-Ernten zählt.
    expect(row!.qty).toBe(out.state.stats.harvestedById?.[crop.yieldItem] ?? 0);
  });

  // claude:2026-10-24T15:21:04+02:00 — Befund B1 behoben (Zähler stats.harvestedById, SAVE 94): it.fails → it.
  it("ohne ein einziges bepflanztes Beet listet „Ländereien: Ernte“ keine Funde einer Sammel-Aktion (gleiche Item-ID wie eine Feldfrucht)", () => {
    const s = game(22);
    const yields = new Set(Object.values(content.crops ?? {}).map((c) => c.yieldItem));
    const action = Object.values(content.actions).find(
      (a) => a.skill !== "farming" && (a.inputs?.length ?? 0) === 0 && a.loot.some((l) => yields.has(l.itemId) && l.chance >= 0.5),
    );
    expect(action, "keine Sammel-Aktion mit Feldfrucht-Item gefunden").toBeTruthy();
    setActiveAction(s, content, action!.id);
    expect(s.activeActionId).toBe(action!.id);
    expect(s.farmPlots.every((p) => p.cropId === null)).toBe(true);
    const out = deserialize(serialize(s, AT), content, AT + 2 * H)!;
    expect(out.offlineTicks).toBeGreaterThan(0);
    const gathered = [...yields].filter((id) => (out.offline.items[id] ?? 0) > 0);
    expect(gathered, `Aktion ${action!.id} hat im Fenster nichts geliefert`).not.toEqual([]);
    expect(out.state.stats.producedById?.[gathered[0]!] ?? 0).toBeGreaterThan(s.stats.producedById?.[gathered[0]!] ?? 0);
    // SOLL: kein Ernte-Block, es wurde nichts geerntet. IST: persistence/src/index.ts:4330 liest `producedById`, das auch tick.ts:343 füllt.
    expect(out.offline.farmHarvests).toBeUndefined();
    expect(out.state.stats.harvestedById).toEqual({});
  });
});
