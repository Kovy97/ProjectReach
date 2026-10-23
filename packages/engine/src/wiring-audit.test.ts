import { workCrateItemId } from "./orders"; // claude:2026-10-25T00:55:00+02:00
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { BLACK_MARKET_CRATE_PREFIX, RAID_VARIANT_SUFFIX, TAVERN_BANDS, masterRingItemId } from "@hearthforge/shared";
import { tavernCrateItemId } from "./tavern";

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
  // Chef-GO 02 (26.08.2026): 7 neue Kapitel-Meilenstein-Items sind ABSICHTLICH token-shop-exklusiv
  // (kein Loot-/Craft-/Gold-Shop-Pfad, s. token-shop-shelves.test.ts) — bisher war JEDES
  // content.tokenShop-Item redundant zu einer anderen Quelle (Aktion/Gold-Shop), deshalb fehlte
  // der Token-Shop hier bis jetzt komplett.
  for (const o of content.tokenShop ?? []) produced.add(o.itemId);
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
  // Taverne (1.2.0, SAVE 84 — design/1.2.0-alive/taverne-spec-technik.md §4/§7): die fünf
  // Schwarzmarktbehälter `black_market_crate_i..v` sind NIE in Loot/Shop/Quest verdrahtet — ihre
  // einzigen Quellen sind die Tavernen-Abgabe (`TavernTask.paysCrate`, Fremder/Karawane) und der
  // 10-%-Bonuswurf jeder Abgabe (engine/tavern.ts deliverTavernTask). Benannte Ausnahme nach dem
  // Muster der Elite-uniqueItemId oben; das Öffnen (openBlackMarketCrate) liefert nur Katalog-Items.
  for (let band = 1; band <= TAVERN_BANDS; band++) produced.add(tavernCrateItemId(band));
  // claude:2026-10-23T23:35:00+02:00 — Bergung (1.4.0 BG): Reliktstaub stammt aus dem Zerlegen gedroppter Ausrüstung (engine/salvage.ts).
  produced.add("relic_dust");
  // claude:2026-10-25T10:00:00+02:00 — Raid (1.4.0 Welle 4): Boss-Tabellen (Basis-ID + Varianten der Stufe), Trash-/Nebenbeute und Wochentruhe stehen in `content.raids`.
  for (const raid of content.raids ?? []) {
    for (const room of raid.rooms) {
      for (const e of room.table.entries) for (const suffix of Object.values(RAID_VARIANT_SUFFIX)) produced.add(e.itemId + suffix);
    }
    for (const r of [...raid.trashLoot, ...raid.bossSideLoot]) produced.add(r.itemId);
    for (const x of raid.weeklyChest.extraItems) produced.add(x.itemId);
  }
  // claude:2026-10-25T00:55:00+02:00 — Arbeitsaufträge (1.4.0 AU): Werkstattkisten zahlt die Auftragsabgabe (engine/orders.ts deliverWorkOrder).
  for (let band = 1; band <= TAVERN_BANDS; band++) produced.add(workCrateItemId(band));
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

  // Live-Bug 2026-08-23 (1.0.0, Marina-Report): leather_helm/leather_body hatten gar kein
  // `value`-Feld, rusty_sword/wooden_shield/gnarled_staff/hunting_bow ebenso — sellPrice()
  // (engine/shop.ts) fällt bei fehlendem/0-Wert auf Math.max(1, ...) zurück, ein selbst
  // hergestelltes Set verkauft sich dann lautlos für 1 Gold statt seines echten Werts. Jedes
  // erhältliche Item MUSS daher einen echten Verkaufswert tragen (Ausnahme: benannte
  // Alt-Save-Kompat-Leichen wie die deprecated Dungeon-Schlüssel oben, die absichtlich keinen
  // Erhältlichkeits-Pfad mehr haben — s. deren Kommentar in obtainableSet).
  it("jedes erhältliche Item hat einen echten Verkaufswert (kein 1-Gold-Fallback)", () => {
    const produced = obtainableSet();
    const noSellValue = Object.keys(content.items)
      .filter((id) => produced.has(id))
      // Schwarzmarktbehälter tragen laut Spec §7 BEWUSST Verkaufswert 0 (kein Shop, nicht verkaufbar
      // — man öffnet sie); benannte Ausnahme, s. obtainableSet.
      .filter((id) => !id.startsWith(BLACK_MARKET_CRATE_PREFIX))
      .filter((id) => !id.startsWith("work_crate_")) // claude:2026-10-25T00:55:00+02:00 — Werkstattkisten: Wert 0 wie die Behälter, man öffnet sie
      .filter((id) => (content.items[id]!.value ?? 0) <= 0);
    expect(
      noSellValue,
      `erhältliche Items ohne value (verkaufen sich lautlos für 1 Gold): ${noSellValue.join(", ")}`,
    ).toEqual([]);
  });
});
