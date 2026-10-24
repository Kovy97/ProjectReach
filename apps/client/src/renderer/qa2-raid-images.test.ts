import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { getItemImage } from "./items";

/**
 * QA-Runde 2, 1.4.0 Raid: Bildauflösung der 93 Raid-Teile (Kontrolleur, claude:2026-10-26T15:40:00+02:00).
 * Alle Anzeige-Pfade (ItemCell, ItemTooltip, EquipmentOverview, Bank, Beute-Zeremonie, Rast) lösen das Bild über
 * `getItemImage` auf; `_heroic`/`_mythic` fallen per RAID_VARIANT_RE auf das Normal-Bild zurück, bis eigene Bilder da sind.
 */
describe("Raid-Bilder: 31 Normal-Teile und ihre 62 Varianten", () => {
  const raidIds = Object.keys(content.items).filter((id) => id.startsWith("gk_") && content.items[id]!.tier === 13);

  // claude:2026-10-24T17:30:00+02:00 — Codex-Lieferung V eingebaut: die 62 Varianten haben jetzt eigene Bilder; der Rückfall aufs Normal-Bild
  // (RAID_VARIANT_RE) greift nur noch, wenn ein Variantenbild fehlt.
  it("93 Raid-Teile, jedes mit eigenem Bild", () => {
    expect(raidIds.length).toBe(93);
    for (const id of raidIds) {
      const url = getItemImage(id);
      expect(url, id).not.toBeNull();
      expect(url!.includes(`/${id}.`), `${id} → ${url}`).toBe(true);
    }
  });

  it("die Varianten-Regel greift nur für _heroic/_mythic, nicht für fremde IDs", () => {
    expect(getItemImage("gk_nicht_vorhanden_mythic")).toBeNull();
    expect(getItemImage("gk_fire_head_heroic")).not.toBe(getItemImage("gk_fire_head"));
  });
});
