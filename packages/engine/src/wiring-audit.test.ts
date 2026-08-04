import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { masterRingItemId } from "@hearthforge/shared";

/**
 * Verdrahtungs-Audit: Jedes Item muss erhältlich sein (Aktions-/Monster-Loot, Shop,
 * Start-Item oder Munitions-Ziel). Fängt verwaiste Items nach Content-Änderungen.
 */
function obtainableSet(): Set<string> {
  const produced = new Set<string>();
  for (const a of Object.values(content.actions)) {
    for (const l of a.loot ?? []) produced.add(l.itemId);
  }
  for (const m of Object.values(content.monsters)) {
    for (const l of m.loot ?? []) produced.add(l.itemId);
  }
  for (const s of content.shop ?? []) produced.add(s.itemId);
  for (const s of content.slayerShop ?? []) produced.add(s.itemId); // Slayer-Punkte-Shop
  for (const d of content.dungeons ?? []) {
    for (const l of d.loot ?? []) produced.add(l.itemId); // Dungeon-Clear-Belohnungen
  }
  // Quest-Belohnungen (Welle D2, Aschechronik): manche Items (z.B. masters_mark) haben KEINE
  // Loot-/Shop-Quelle — ihr einziger Erhältlichkeits-Pfad ist eine Quest-Reward-Zeile.
  for (const q of content.quests ?? []) {
    for (const r of q.rewards.items ?? []) produced.add(r.id);
  }
  // Crop-Erträge: yield-Items aus dem Plot-System gelten als erhältlich (via Farming-Plots)
  for (const crop of Object.values(content.crops ?? {})) {
    produced.add(crop.yieldItem);
  }
  produced.add("rusty_sword"); // Start-Ausrüstung
  // Meisterringe (Meisterweihe, engine/capes.ts; seit SAVE 69 Ringe statt Capes): per Konvention
  // `masterRingItemId(skillId)` von der ENGINE beim Level-99-Hook verliehen (kein Loot-/Shop-
  // Eintrag nötig) → erhältlich.
  for (const skillId of Object.keys(content.skills)) produced.add(masterRingItemId(skillId));
  // Krönung (design/master-capes-konzept.md §"Die Krönung"): ring_master_completion ist NICHT an
  // einen einzelnen Skill gekoppelt (fällt daher nicht unter die masterRingItemId-Konvention
  // oben) und trägt bewusst KEINEN Loot-/Shop-Eintrag — seine Quelle ist der COMPLETION_CAPE_KEY-
  // Pfad in checkMasteryCapes (alle Content-Skills ≥ 99). Benannte Ausnahme.
  produced.add("ring_master_completion");
  // ring_master_enchanting-Ausnahme: ENTFERNT (Welle TT, Chef-Entscheid 2026-07-18 „Enchanting
  // geht in Runecrafting mit rein" — kein Enchanting-Skill, das geparkte Item ist aus dem
  // Katalog gelöscht; die Verzauberungs-Progression deckt ring_master_runecrafting ab).
  // Welle K (2026-07-13, Chef-Direktive „Gebiet für Gebiet, Dungeon um Dungeon", Key-Purge):
  // die 7 Story-Dungeons sind jetzt quest-gated (`DungeonDef.requiresQuest`) statt schlüssel-
  // gated — die 6 Story-Dungeon-Schlüssel (5 Zonen-Keys + `masters_mark`) haben deshalb bewusst
  // KEINE Loot-/Shop-/Quest-Quelle mehr (Key-Purge aus Monster-Loot, Dungeon-Loot/Chests und
  // Quest-Rewards). Die Item-DEFS bleiben nur für Alt-Save-Kompat stehen (Migration SAVE 64
  // räumt Bestände, erstattet Gold) — benannte Ausnahme nach demselben Muster wie
  // ring_master_completion oben. `paragon_key` ist NICHT betroffen (eigenes Einmal-Unlock-
  // System, bleibt aktiv über last_idol-Loot erreichbar).
  for (const deprecatedKey of ["warband_key", "crypt_key", "wildwood_key", "highland_key", "idolhall_key", "masters_mark"]) {
    produced.add(deprecatedKey);
  }
  // Elite-/World-Spawns Phase 2 (design/elite-balance-spec.md §4): der garantierte Chase-Drop
  // einer Elite-Variante ist NIE in Monster-/Aktions-Loot, Shop oder Dungeon-Loot verdrahtet —
  // sein einziger Erhältlichkeits-Pfad ist `EliteVariantDef.uniqueItemId` (engine/elites.ts
  // onEliteKilled). Analog zu den Meisterringen oben: eigener, benannter Erhältlichkeits-Pfad.
  for (const e of Object.values(content.elites ?? {})) produced.add(e.uniqueItemId);
  return produced;
}

describe("Item-Verdrahtung", () => {
  it("jedes Item ist erhältlich (Loot/Shop/Start)", () => {
    const produced = obtainableSet();
    const unobtainable = Object.keys(content.items).filter((id) => !produced.has(id));
    expect(unobtainable, `nicht erhältliche Items: ${unobtainable.join(", ")}`).toEqual([]);
  });

  it("jedes Material ist entweder Input einer Aktion, Endprodukt-Komponente oder hat einen Verkaufswert", () => {
    const consumed = new Set<string>();
    for (const a of Object.values(content.actions)) {
      for (const i of a.inputs ?? []) consumed.add(i.itemId);
    }
    // Crop-Saaten sind Inputs des Plot-Systems (beim Pflanzen verbraucht)
    for (const crop of Object.values(content.crops ?? {})) {
      consumed.add(crop.seedItem);
    }

    // Materialien ohne Sink (kein Aktions-Input) müssen wenigstens verkaufbar sein (value > 0),
    // sonst sind sie tote Drops.
    const deadMaterials = Object.values(content.items)
      .filter((it) => it.type === "material" && !consumed.has(it.id))
      .filter((it) => (it.value ?? 0) <= 0)
      .map((it) => it.id);
    expect(deadMaterials, `tote Material-Items (kein Sink, kein Verkaufswert): ${deadMaterials.join(", ")}`).toEqual([]);
  });
});
