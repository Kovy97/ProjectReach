import { describe, expect, it } from "vitest";
import { content } from "./index";
import type { AttributeId, ItemDef } from "@hearthforge/shared";
import { itemTypeTags } from "@hearthforge/shared";

/**
 * Wächter für die Rüstungsklassen-Trennung im Suffix-System (Chef-GO 25.08.2026, 1.1.0,
 * design/rezension-patch-2026-08-25.html #p14). Vorher teilten sich alle Nicht-Waffen-Items
 * (Platte/Leder/Stoff/Schild) dasselbe Pool-Tag `armor` — Platte rollte deshalb zu 55 % Suffixe
 * mit Geschick/Weisheit ("Plattenhelm des Weisen"). Jetzt trägt jedes Rüstungsteil zusätzlich ein
 * Klassen-Tag (`armor_plate`/`armor_leather`/`armor_cloth`, abgeleitet aus dem Trinity-Stat), und
 * die Suffix-Pools filtern klassenrein. `armor` selbst bleibt auf allen Rüstungsteilen erhalten
 * (Runen-Affixe/`requiresTrinity`-Gate lesen weiterhin darüber, s. packages/engine/src/rune-tier-iv.test.ts).
 *
 * Diese Suite prüft NUR die Daten-Seite (Content-Katalog); das Tag-System selbst (itemTypeTags/
 * affixAppliesToItem) ist Logic-Devs shared/index.ts und wird dort nicht erneut getestet.
 */

// Rüstungs-Trinität-Klassenregel (design §p14 "Die Zuordnungsregel"): welche Attribute pro Klasse
// verboten sind. con/lck sind überall klassenfrei (Leben/Beutechance braucht jede Klasse).
const FORBIDDEN_BY_CLASS: Record<"armor_plate" | "armor_leather" | "armor_cloth", AttributeId[]> = {
  armor_plate: ["int", "wis"], // Mitigations-Schiene (str/con); dex wird hier NICHT mehr geführt,
  // weil die vier "wendigen" dex-Plattenteile per Vorschlag B zu Leder umgetypt wurden (kein
  // verbleibendes Platte-Item trägt heute noch dex).
  armor_leather: ["str", "int"], // Evasions-Schiene (dex/con)
  armor_cloth: ["str"], // Ward-Schiene (int/wis/con); dex bleibt hier zusätzlich fern (Test unten).
};

/**
 * Chef-Entscheid 26.08.2026 („Slayer-Helm sollte Stats für alle 3 Kampfrichtungen haben, ist ja ein
 * omnifunktionaler Gegenstand, genau so wie die restlichen Slayer-Items"): Die Slayer-Ausrüstung aus
 * dem Laden des Slayer-Meisters ist das EINZIGE Set mit str = dex = int auf Platte/Leder, weil der
 * Turm jeden Kampfstil sieht. Nur die festen modifiers sind ausgenommen; Suffix-Rollen (Test oben)
 * folgen weiter der Klassenregel, damit ein verzauberter Slayer-Helm keine Stoff-Suffixe rollt.
 */
const SLAYER_OMNI_SET = new Set(["slayer_helm", "slayer_greaves", "slayer_vambraces"]);

const CLASS_TAGS = ["armor_plate", "armor_leather", "armor_cloth"] as const;

/** Schmuck-Slots sind klassenfrei (design §p14: "Schmuck (Ringe, Amulett, Umhang) — alle"). */
const JEWELRY_SLOTS = new Set(["ring1", "ring2", "amulet", "cape"]);

function equipmentItems(): ItemDef[] {
  return Object.values(content.items).filter(
    (it): it is ItemDef => it.type === "equipment",
  );
}

/** Welche Rüstungsklasse (falls vorhanden) trägt dieses Item laut Trinity-Stat? */
function trinityClass(item: ItemDef): "armor_plate" | "armor_leather" | "armor_cloth" | null {
  if (item.armorRating) return "armor_plate";
  if (item.evasionRating) return "armor_leather";
  if (item.wardCapacity) return "armor_cloth";
  return null;
}

describe("Suffix-Klassen-Trennung (#p14): Pool-Tags", () => {
  it("Anzahl-Pin der drei neuen Klassen-Tags (Regression-Detektor)", () => {
    const counts = { armor_plate: 0, armor_leather: 0, armor_cloth: 0 };
    for (const item of equipmentItems()) {
      const tags = new Set(itemTypeTags(item));
      for (const tag of CLASS_TAGS) {
        if (tags.has(tag)) counts[tag]++;
      }
    }
    // Chef-Test 25.08.2026 (design/slayer-shop-1.1.0.md §4.1): slayer_helm/slayer_greaves bekommen
    // erstmals armorRating (+2 armor_plate), slayer_vambraces evasionRating (+1 armor_leather) —
    // vorher trugen alle drei KEINEN Trinity-Wert (der Chef-Befund "die Rüstungen sind zu
    // schlecht" war exakt das: 0 Mitigation/Ausweichen). 176→178, 84→85.
    // Stil-Parität 4a (Chef-GO 26.08.2026, §4a A3/A4): 11 neue Leder- + 16 neue Stoff-Drops
    // (design/stil-paritaet-2026-08-26.md) — 85→96, 57→73.
    // 1.2.0 „Fasern und Fallen" (content-dev, 27.08.2026): neuer Meisterring ring_master_hunting
    // trägt evasionRating 4 (Flavor, Muster ring_master_fishing/-foraging, s. Kommentar unten) —
    // 96→97.
    // Chef 28./29.08.2026: Trübgewebe-Set auf fünf Teile (dimweave_leggings/dimweave_wraps, wardCapacity 12/7) — 73→75.
    // Schmuck-Rework Welle 2 (content-dev, 29.08.2026, design/schmuck-audit-2026-08-29.md §3.5):
    // 7 neue Fernkampf-Ringe + 7 neue Fernkampf-Amulette tragen `evasionRating` als Trinity-Flavor
    // (exakt dasselbe Muster wie die bestehenden Sammel-Meisterringe, s. Kommentar oben) — 97→111.
    // Bleiben klassenfrei bei den Suffix-/modifiers-Checks unten (JEWELRY_SLOTS-Ausnahme).
    // Schmuck-Rework Welle 3 (content-dev, 29.08.2026, §3.6): 5 neue Magie-Ringe + 5 neue
    // Magie-Amulette tragen `wardCapacity` als Trinity-Flavor (gleiches Muster) — 75→85. Ebenfalls
    // klassenfrei (JEWELRY_SLOTS-Ausnahme).
    expect(counts).toEqual({ armor_plate: 178, armor_leather: 111, armor_cloth: 85 });
  });

  it("jedes Rüstungsteil mit Klassen-Tag behält zusätzlich das allgemeine armor-Tag (Runen-Gate)", () => {
    for (const item of equipmentItems()) {
      if (!item.slot || item.weaponStyle) continue;
      const tags = new Set(itemTypeTags(item));
      const hasClassTag = CLASS_TAGS.some((t) => tags.has(t));
      if (hasClassTag) {
        expect(tags.has("armor"), `${item.id} sollte weiterhin "armor" tragen`).toBe(true);
      }
    }
  });

  it("kein Suffix seines Pools bringt ein klassenfremdes Attribut auf ein Trinity-Item", () => {
    const violations: string[] = [];
    for (const item of equipmentItems()) {
      if (item.slot && JEWELRY_SLOTS.has(item.slot)) continue; // Schmuck ist klassenfrei (§p14),
      // auch wenn ein Ring nebenbei einen kleinen Trinity-Wert trägt (z.B. die Meister-Ringe der
      // Sammelskills mit evasionRating als Flavor) — jeder betroffene Suffix listet "jewelry"
      // trotzdem explizit in appliesTo, Schmuck rollt also weiter alles.
      const cls = trinityClass(item);
      if (!cls) continue; // kein Trinity-Stat → keine Klassenregel (Waffen ohne 2H-Bonus, …)
      const forbidden = FORBIDDEN_BY_CLASS[cls];
      const tags = itemTypeTags(item);
      for (const suffix of Object.values(content.suffixes ?? {})) {
        const applies = !suffix.appliesTo || suffix.appliesTo.length === 0
          || suffix.appliesTo.some((t) => tags.includes(t));
        if (!applies) continue;
        for (const attr of Object.keys(suffix.attrPerIlvl ?? {}) as AttributeId[]) {
          if (forbidden.includes(attr)) {
            violations.push(`${item.id} (${cls}) rollt ${suffix.id} mit klassenfremdem ${attr}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("Suffix-Klassen-Trennung (#p14): feste Modifikatoren", () => {
  it("kein Item mit festem modifiers trägt klassenfremde Attribute (Schmuck ausgenommen)", () => {
    const violations: string[] = [];
    for (const item of equipmentItems()) {
      if (item.slot && JEWELRY_SLOTS.has(item.slot)) continue; // Schmuck ist klassenfrei (§p14)
      if (SLAYER_OMNI_SET.has(item.id)) continue; // Slayer-Set omnifunktional (Chef-Entscheid 26.08.2026, s.o.)
      const cls = trinityClass(item);
      if (!cls) continue;
      const forbidden = FORBIDDEN_BY_CLASS[cls];
      for (const attr of Object.keys(item.modifiers ?? {}) as AttributeId[]) {
        if (forbidden.includes(attr)) {
          violations.push(`${item.id} (${cls}) trägt klassenfremdes modifiers.${attr}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("Suffix-Klassen-Trennung (#p14): Alt-Saves ohne Migration", () => {
  it("instanceBonusDelta prüft appliesTo NICHT beim Lookup — ein alter klassenfremder Roll bleibt rechenbar", async () => {
    const { instanceBonusDelta } = await import("@hearthforge/shared");
    // suffix_owl trägt seit dem Patch appliesTo: [weapon_magic, armor_cloth, jewelry] — auf einem
    // Platte-Item (armor_plate) wäre er heute nicht mehr WÜRFELBAR, ein Alt-Save mit genau dieser
    // Kombination (vor dem Patch gerollt) muss aber weiter gültig rechnen (design §p14 "Alt-Saves":
    // dulden, keine Migration, kein SAVE_VERSION-Bump). instanceBonusDelta löst NUR über die
    // suffixId auf (content.suffixes[...]) und prüft appliesTo nicht — der Filter greift laut Design
    // ausschließlich beim Roll (rollSuffix), nicht beim Lookup.
    const delta = instanceBonusDelta(
      {
        instanceId: "test_instance",
        baseItemId: "reefscale_helm", // reales Platte-Item (armorRating), s. Zeile oben im Katalog
        affixes: [],
        suffix: { suffixId: "suffix_owl", ilvl: 50, roll: 1 },
      },
      content,
    );
    // wis ist der Attribut-Beitrag von suffix_owl (attrPerIlvl.wis) — er muss trotz Klassenfremdheit
    // weiter berechnet werden, kein Filtern/Nullen im Lookup-Pfad.
    expect(delta.modifiers.wis ?? 0).toBeGreaterThan(0);
  });
});
