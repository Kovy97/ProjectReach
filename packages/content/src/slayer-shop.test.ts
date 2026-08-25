import { describe, expect, it } from "vitest";
import { content } from "./index";

/**
 * Wächter-Test für die Slayer-Shop-Rüstungsüberarbeitung (Chef-Test 25.08.2026, Live-Test-Befund:
 * "kontrolliere auch noch mal die Belohnungen [des Slayer-Shops], vor allem die Rüstungen scheinen
 * mir zu schlecht" — design/slayer-shop-1.1.0.md §4.1/§4.2/§4.3/§4.6).
 *
 * Ausgangslage: Slayer-Helm, -Beinschienen und -Armschienen trugen KEINEN Trinity-Wert (weder
 * armorRating noch evasionRating noch wardCapacity) — seit der Rüstungs-Trinität (Itemization 2.5)
 * kommt Mitigation/Ausweichen/Ward AUSSCHLIESSLICH aus diesen drei Feldern, ein Titan-Vollhelm
 * schlug den Slayer-Helm in jedem Kampfwert außer Attributen. Fix: alle drei Teile bekommen den
 * Trinity-Wert der nächsten Craft-Stufe ihres Slots + einen Slayer-Effekt aus dem bestehenden
 * Baukasten (bounty/giantSlayer/healOnKill). Zwei tote Shop-Angebote (blighted_bone/forge_ember,
 * 25–40 % Drop je Kill auf Etage 1/3, ein Auftrag lieferte mehr gratis als der Shop verlangte)
 * sind gestrichen.
 */
describe("Slayer-Shop-Rüstung (§4.1/§4.3)", () => {
  const SLAYER_ARMOR_IDS = ["slayer_helm", "slayer_greaves", "slayer_vambraces"] as const;

  it("(a) jede Slayer-Rüstung trägt einen Trinity-Wert > 0 (armorRating/evasionRating/wardCapacity)", () => {
    for (const id of SLAYER_ARMOR_IDS) {
      const item = content.items[id];
      expect(item, `Item ${id} fehlt im Katalog`).toBeTruthy();
      const trinity = (item!.armorRating ?? 0) + (item!.evasionRating ?? 0) + (item!.wardCapacity ?? 0);
      expect(trinity, `${id}: kein Trinity-Wert (armorRating/evasionRating/wardCapacity)`).toBeGreaterThan(0);
    }
  });

  it("(b) kein Slayer-Shop-Angebot ist ein Item, das ein normaler Kill zu ≥ 25 % droppt", () => {
    // "normaler Kill" = content.monsters[*].loot (NICHT die gleichnamigen Crafting-Rezept-
    // Ausgaben in content.actions, die tragen chance:1 per Definition und sind kein Kill-Drop).
    const offenders: string[] = [];
    for (const offer of content.slayerShop ?? []) {
      let maxChance = 0;
      for (const monster of Object.values(content.monsters)) {
        for (const roll of monster.loot ?? []) {
          if (roll.itemId === offer.itemId) maxChance = Math.max(maxChance, roll.chance);
        }
      }
      if (maxChance >= 0.25) {
        offenders.push(`${offer.itemId}: ${(maxChance * 100).toFixed(0)}% Kill-Drop-Chance (>= 25%)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("(c) skillBoost.defence ist von den drei Slayer-Teilen + 4pc-Set entfernt (tot seit der Trinität)", () => {
    // NUR die drei Slayer-Rüstungsteile und das 4pc-Set — laut Chef-Auftrag/§7 tragen noch ~20
    // weitere Items im Katalog denselben toten Boost (offene Chef-Entscheidung, hier bewusst NICHT
    // angerührt); dieser Guard prüft ausschließlich den Slayer-Shop-Umfang dieses Tickets.
    for (const id of SLAYER_ARMOR_IDS) {
      const item = content.items[id];
      expect(item?.skillBoost?.defence, `${id} trägt noch skillBoost.defence`).toBeUndefined();
    }
    const set4pc = content.sets.find((s) => s.id === "slayer_set_4pc");
    expect(set4pc, "slayer_set_4pc fehlt im Katalog").toBeTruthy();
    expect(set4pc?.skillBoost?.defence, "slayer_set_4pc trägt noch skillBoost.defence").toBeUndefined();
  });
});
