import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { ATTRIBUTE_IDS, EQUIP_SLOTS, PARAGON_DUNGEON_ID } from "@hearthforge/shared";

/**
 * Strukturelle Referenz-Integrität: fängt tote Verweise auf Skills, Kategorien, Zonen,
 * Slots, Attribute usw. ab (ergänzt content-integrity.test.ts, das Item-Refs prüft).
 * Solche Tippfehler kompilieren oft durch (string-typisierte IDs), brechen aber das Spiel.
 */
describe("content refs: strukturelle Verweise existieren", () => {
  const skillIds = new Set(Object.keys(content.skills));
  const categoryIds = new Set(content.categories.map((c) => c.id));
  const zoneIds = new Set(content.zones.map((z) => z.id));
  const slotIds = new Set<string>(EQUIP_SLOTS);
  const attrIds = new Set<string>(ATTRIBUTE_IDS);

  it("Aktionen: skill existiert", () => {
    for (const a of Object.values(content.actions)) {
      expect(skillIds.has(a.skill), `Aktion ${a.id}: skill ${a.skill} fehlt`).toBe(true);
    }
  });

  it("Aktionen: category (falls gesetzt) existiert", () => {
    for (const a of Object.values(content.actions)) {
      if (a.category !== undefined) {
        expect(categoryIds.has(a.category), `Aktion ${a.id}: category ${a.category} fehlt`).toBe(true);
      }
    }
  });

  it("Monster: zone (falls gesetzt) existiert", () => {
    for (const m of Object.values(content.monsters)) {
      if (m.zone !== undefined) {
        expect(zoneIds.has(m.zone), `Monster ${m.id}: zone ${m.zone} fehlt`).toBe(true);
      }
    }
  });

  it("Items: slot (falls gesetzt) ist ein gültiger Ausrüstungs-Slot", () => {
    for (const it of Object.values(content.items)) {
      if (it.slot !== undefined) {
        expect(slotIds.has(it.slot), `Item ${it.id}: slot ${it.slot} ungültig`).toBe(true);
      }
    }
  });

  it("Items: requirements-Skills + modifiers-Attribute existieren", () => {
    for (const it of Object.values(content.items)) {
      for (const skill of Object.keys(it.requirements ?? {})) {
        expect(skillIds.has(skill), `Item ${it.id}: requirement-Skill ${skill} fehlt`).toBe(true);
      }
      for (const attr of Object.keys(it.modifiers ?? {})) {
        expect(attrIds.has(attr), `Item ${it.id}: modifier-Attribut ${attr} ungültig`).toBe(true);
      }
    }
  });

  it("Skills: trains (falls gesetzt) ist ein gültiges Attribut", () => {
    for (const s of Object.values(content.skills)) {
      if (s.trains !== undefined) {
        expect(attrIds.has(s.trains), `Skill ${s.id}: trains ${s.trains} ungültig`).toBe(true);
      }
    }
  });

  it("Werkzeuge: tool.skill existiert", () => {
    for (const it of Object.values(content.items)) {
      if (it.tool) {
        expect(skillIds.has(it.tool.skill), `Item ${it.id}: tool.skill ${it.tool.skill} fehlt`).toBe(true);
      }
    }
  });

  it("jede Kategorie wird von mindestens einer Aktion benutzt (keine Karteileichen)", () => {
    const used = new Set<string>();
    for (const a of Object.values(content.actions)) if (a.category) used.add(a.category);
    const orphan = content.categories.map((c) => c.id).filter((id) => !used.has(id));
    expect(orphan, `ungenutzte Kategorien: ${orphan.join(", ")}`).toEqual([]);
  });

  it("kategorisierte Skills: JEDE Aktion hat eine category (sonst verschwindet sie aus der SkillPage)", () => {
    // Die SkillPage gruppiert einen Skill, sobald EINE seiner Aktionen eine category hat —
    // unkategorisierte Aktionen desselben Skills werden dann nicht mehr gerendert. Guard dagegen.
    const categorizedSkills = new Set<string>();
    for (const a of Object.values(content.actions)) if (a.category) categorizedSkills.add(a.skill);
    for (const skill of categorizedSkills) {
      const missing = Object.values(content.actions)
        .filter((a) => a.skill === skill && !a.category)
        .map((a) => a.id);
      expect(missing, `Skill ${skill} ist kategorisiert, aber diese Aktionen haben keine category: ${missing.join(", ")}`).toEqual([]);
    }
  });
});

describe("content refs: Dungeons sind konsistent verdrahtet", () => {
  const itemIds = new Set(Object.keys(content.items));
  const monsterIds = new Set(Object.keys(content.monsters));
  const zoneIds = new Set(content.zones.map((z) => z.id));
  // Alle Items, die als Monster-Loot droppen ODER als Quest-Belohnung vergeben werden (für die
  // Key-Erhältlichkeit — Welle D2, Aschechronik: `masters_mark` ist der erste Dungeon-Schlüssel,
  // dessen einzige Quelle eine Quest-Reward-Zeile statt eines Monster-Drops ist).
  const keySources = new Set<string>();
  for (const m of Object.values(content.monsters)) for (const l of m.loot) keySources.add(l.itemId);
  for (const q of content.quests) for (const r of q.rewards.items ?? []) keySources.add(r.id);

  it("jeder Dungeon: zone, keyItem, encounters, loot existieren + sinnvolle Werte", () => {
    for (const d of content.dungeons) {
      if (d.zone !== undefined) {
        expect(zoneIds.has(d.zone), `Dungeon ${d.id}: zone ${d.zone} fehlt`).toBe(true);
      }
      // keyItem ist seit Welle J (2026-07-13, quest-based unlock) deprecated-optional — WENN es
      // (noch) gesetzt ist, muss die Referenz stimmen (kein toter Verweis im Content).
      if (d.keyItem !== undefined) {
        expect(itemIds.has(d.keyItem), `Dungeon ${d.id}: keyItem ${d.keyItem} fehlt`).toBe(true);
      }
      // Paragonturm-Ausnahme (dungeon-rework-spec §7-Kopf-Kommentar, shared/index.ts): dessen
      // DungeonDef trägt ABSICHTLICH leere encounters (hält startDungeon/canEnterDungeon inert —
      // der einzige Eintritt ist startParagonFloor/engine/paragon.ts, das einen eigenen
      // `content.paragon`-Pool liest). Jeder andere Dungeon braucht weiterhin ≥1 Welle.
      if (d.id === PARAGON_DUNGEON_ID) {
        expect(d.encounters.length, `Dungeon ${PARAGON_DUNGEON_ID}: encounters muss LEER bleiben (§7-Konvention)`).toBe(0);
      } else {
        expect(d.encounters.length, `Dungeon ${d.id}: keine encounters`).toBeGreaterThan(0);
      }
      for (const mid of d.encounters) {
        expect(monsterIds.has(mid), `Dungeon ${d.id}: encounter ${mid} fehlt`).toBe(true);
      }
      for (const l of d.loot) {
        expect(itemIds.has(l.itemId), `Dungeon ${d.id}: loot ${l.itemId} fehlt`).toBe(true);
      }
      // keysPerRun ist deprecated (Welle J) — falls Alt-Content es noch trägt, muss es sinnvoll sein.
      if (d.keysPerRun !== undefined) {
        expect(d.keysPerRun, `Dungeon ${d.id}: keysPerRun muss > 0 sein`).toBeGreaterThan(0);
      }
      expect(d.requiredLevel, `Dungeon ${d.id}: requiredLevel muss > 0 sein`).toBeGreaterThan(0);
    }
  });

  // Keys deprecated 2026-07-13 (Welle J, quest-based unlock; die v64-Migration räumt Alt-Bestände):
  // die generische „jeder Schlüssel ist erhältlich"-Pflicht entfällt — Welle K darf Key-Drops
  // streichen. EINZIGE verbleibende Pflicht: der Paragonturm bleibt eigenes Einmal-Unlock-System,
  // SEIN Schlüssel muss erreichbar bleiben (sonst ist der Turm tot).
  it("der Paragonturm-Schlüssel bleibt erhältlich (eigenes Einmal-Unlock-System)", () => {
    const tower = content.dungeons.find((d) => d.id === PARAGON_DUNGEON_ID);
    if (!tower) return; // Turm-Def fehlt ⇒ Turm inert (Engine toleriert das) — nichts zu prüfen
    expect(tower.keyItem, "Paragonturm ohne keyItem (§7-Konvention)").toBeTruthy();
    expect(
      keySources.has(tower.keyItem!),
      `Paragonturm: Schlüssel ${tower.keyItem} droppt von keinem Monster und ist keine Quest-Belohnung — unerreichbar`,
    ).toBe(true);
  });
});
