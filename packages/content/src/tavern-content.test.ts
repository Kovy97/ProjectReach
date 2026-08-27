import { describe, expect, it } from "vitest";
import { content } from "./index";
import { es } from "./locales/es";
import { ptBR } from "./locales/ptBR";
import { fr } from "./locales/fr";
import { ru } from "./locales/ru";
import { zh } from "./locales/zh";
import type { ActionDef, TavernTaskTemplateDef } from "@hearthforge/shared";
import { EQUIP_SLOTS, resolveText } from "@hearthforge/shared";

const en = (v: Parameters<typeof resolveText>[0]) => resolveText(v, "en");
const de = (v: Parameters<typeof resolveText>[0]) => resolveText(v, "de");

/**
 * Taverne (1.2.0 „Alive", design/1.2.0-alive/taverne-spec-technik.md §1/§3/§7): Content-Guards
 * für `campBuildings: camp_tavern`, `tavernGuests`, `tavernTasks` und die fünf Schwarzmarkt-
 * behälter. Nicht Sache dieses Tests: Engine-Logik (tavernRefresh/Belohnungen, logic-dev) oder
 * UI (ui-dev) — nur, dass der Content in sich stimmig ist und die Engine überhaupt ein Ziel
 * FINDEN kann (Spec §3: "ein Gast ist vom Tag ausgeschlossen, wenn sein Skill keine Vorlage mit
 * gültigem Ziel liefert" — dieser Test prüft genau das vorab, pro Vorlage).
 */

const GUEST_IDS = [
  "halvard", "viktor", "billy", "grumm", "brakka", "nessa", "tamsin", "ilvara", "odo", "dashk",
  "merrit", "kell", "sefra", "orin", "wenna", "pim", "torvald", "stranger", "ashka",
] as const;

const guests = content.tavernGuests ?? [];
const tasks = content.tavernTasks ?? [];
const skillIds = new Set(Object.keys(content.skills));
const categoryIds = new Set(content.categories.map((c) => c.id));
const equipSlotSet = new Set<string>(EQUIP_SLOTS as readonly string[]);

/** Zählt Aktionen, die zu `select` passen würden (Näherung der Engine-Kandidatenwahl, Spec §3). */
function matchingActions(t: TavernTaskTemplateDef): ActionDef[] {
  const sel = t.select;
  return Object.values(content.actions).filter((a) => {
    if (sel.skill && a.skill !== sel.skill) return false;
    if (sel.hasInputs !== undefined) {
      const has = (a.inputs?.length ?? 0) > 0;
      if (has !== sel.hasInputs) return false;
    }
    if (sel.categories && (!a.category || !sel.categories.includes(a.category))) return false;
    const mainLoot = a.loot[0];
    const mainItem = mainLoot ? content.items[mainLoot.itemId] : undefined;
    if (sel.itemType && mainItem?.type !== sel.itemType) return false;
    if (sel.equipSlots && (!mainItem?.slot || !sel.equipSlots.includes(mainItem.slot))) return false;
    return true;
  });
}

describe("Taverne: camp_tavern (Gebäude)", () => {
  const campBuildings = content.campBuildings ?? [];
  const building = campBuildings.find((b) => b.id === "camp_tavern");

  it("existiert mit genau 3 Stufen", () => {
    expect(building).toBeDefined();
    expect(building?.levels).toHaveLength(3);
  });

  it("trägt boost kind tavernPerks auf jeder Stufe", () => {
    for (const lvl of building?.levels ?? []) {
      expect(lvl.boost.kind).toBe("tavernPerks");
    }
  });

  it("jede Material-Zutat jeder Stufe existiert im Item-Katalog", () => {
    const missing: string[] = [];
    for (const lvl of building?.levels ?? []) {
      for (const it of lvl.items) {
        if (!content.items[it.itemId]) missing.push(it.itemId);
      }
    }
    expect(missing).toEqual([]);
  });

  it("belegt keinen zusätzlichen Bauplatz-Zähler (16 Gebäude gesamt, Pin angepasst)", () => {
    // Encampment Phase 1 hatte 15 Gebäude (s. Kommentare in index.ts); die Taverne ist das 16.
    // (CAMP_TAVERN_ID ist wie CAMP_TOWNHALL_ID von campUsedBuildSlots ausgenommen — Engine-Seite.)
    expect(campBuildings).toHaveLength(16);
  });
});

describe("Taverne: Schwarzmarktbehälter", () => {
  const crateIds = ["black_market_crate_i", "black_market_crate_ii", "black_market_crate_iii", "black_market_crate_iv", "black_market_crate_v"];

  it("alle 5 Stufen existieren mit tier 1..5", () => {
    crateIds.forEach((id, i) => {
      const item = content.items[id];
      expect(item, `fehlt: ${id}`).toBeDefined();
      expect(item?.type).toBe("consumable");
      expect(item?.stackable).toBe(true);
      expect(item?.consumable?.kind).toBe("blackMarketCrate");
      expect(item?.consumable?.tier).toBe(i + 1);
    });
  });

  it("kein Verkaufswert, keine Heilung, kein Shop-Eintrag", () => {
    for (const id of crateIds) {
      const item = content.items[id];
      expect(item?.value ?? 0).toBe(0);
      expect(item?.healAmount ?? 0).toBe(0);
      expect(item?.healPct ?? 0).toBe(0);
      expect((content.shop ?? []).some((s) => s.itemId === id)).toBe(false);
    }
  });
});

describe("Taverne: Gäste", () => {
  it("genau die 19 erwarteten IDs, keine Duplikate", () => {
    const ids = guests.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...GUEST_IDS].sort());
  });

  it("jeder Gast hat eine bilinguale name/role/greeting (en+de)", () => {
    for (const g of guests) {
      expect(en(g.name), g.id).toBeTruthy();
      expect(de(g.name), g.id).toBeTruthy();
      expect(en(g.role), g.id).toBeTruthy();
      expect(de(g.role), g.id).toBeTruthy();
      expect(en(g.greeting), g.id).toBeTruthy();
      expect(de(g.greeting), g.id).toBeTruthy();
    }
  });

  it("greeting hat höchstens einen Gedankenstrich (natürliche Spieltexte)", () => {
    const bad: string[] = [];
    for (const g of guests) {
      for (const text of [en(g.greeting), de(g.greeting)]) {
        const dashes = (text.match(/—/g) ?? []).length;
        if (dashes > 1) bad.push(`${g.id}: "${text}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("skill ist entweder null oder eine echte Skill-ID", () => {
    for (const g of guests) {
      if (g.skill !== null) expect(skillIds.has(g.skill), `${g.id}: ${g.skill}`).toBe(true);
    }
  });

  it("Halvard vergibt keine Aufgaben; alle anderen schon", () => {
    const halvard = guests.find((g) => g.id === "halvard");
    expect(halvard?.givesTasks).toBe(false);
    for (const g of guests) {
      if (g.id !== "halvard") expect(g.givesTasks, g.id).toBe(true);
    }
  });

  it("rarity: nur stranger/ashka sind rare, der Rest daily", () => {
    for (const g of guests) {
      const expected = g.id === "stranger" || g.id === "ashka" ? "rare" : "daily";
      expect(g.rarity, g.id).toBe(expected);
    }
  });
});

describe("Taverne: Vorlagen (tavernTasks)", () => {
  it("jede Vorlage referenziert einen existierenden Gast", () => {
    const guestIds = new Set(guests.map((g) => g.id));
    const orphans = tasks.filter((t) => !guestIds.has(t.guestId)).map((t) => t.id);
    expect(orphans).toEqual([]);
  });

  it("jeder Gast mit givesTasks hat mindestens 2 (höchstens 4) Vorlagen", () => {
    const byGuest = new Map<string, number>();
    for (const t of tasks) byGuest.set(t.guestId, (byGuest.get(t.guestId) ?? 0) + 1);
    for (const g of guests) {
      if (!g.givesTasks) continue;
      const n = byGuest.get(g.id) ?? 0;
      expect(n, g.id).toBeGreaterThanOrEqual(2);
      expect(n, g.id).toBeLessThanOrEqual(4);
    }
  });

  it("Vorlagen-IDs sind eindeutig", () => {
    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("minutes hat genau 5 positive Werte", () => {
    const bad = tasks.filter((t) => t.minutes.length !== 5 || t.minutes.some((m) => !(m > 0))).map((t) => t.id);
    expect(bad).toEqual([]);
  });

  it("minBand <= maxBand, beide im Bereich 1..5 wenn gesetzt", () => {
    for (const t of tasks) {
      if (t.minBand !== undefined) {
        expect(t.minBand, t.id).toBeGreaterThanOrEqual(1);
        expect(t.minBand, t.id).toBeLessThanOrEqual(5);
      }
      if (t.maxBand !== undefined) {
        expect(t.maxBand, t.id).toBeGreaterThanOrEqual(1);
        expect(t.maxBand, t.id).toBeLessThanOrEqual(5);
      }
      if (t.minBand !== undefined && t.maxBand !== undefined) {
        expect(t.minBand, t.id).toBeLessThanOrEqual(t.maxBand);
      }
    }
  });

  it("select.skill (falls gesetzt) ist eine echte Skill-ID", () => {
    const bad = tasks.filter((t) => t.select.skill && !skillIds.has(t.select.skill)).map((t) => t.id);
    expect(bad).toEqual([]);
  });

  it("select.categories (falls gesetzt) existieren im Kategorien-Katalog", () => {
    const bad: string[] = [];
    for (const t of tasks) {
      for (const c of t.select.categories ?? []) {
        if (!categoryIds.has(c)) bad.push(`${t.id}: ${c}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("select.equipSlots (falls gesetzt) sind echte Ausrüstungs-Slots", () => {
    const bad: string[] = [];
    for (const t of tasks) {
      for (const s of t.select.equipSlots ?? []) {
        if (!equipSlotSet.has(s)) bad.push(`${t.id}: ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("line enthält {count} außer bei dungeon/champion", () => {
    const bad: string[] = [];
    for (const t of tasks) {
      if (t.kind === "dungeon" || t.kind === "champion") continue;
      if (!en(t.line).includes("{count}") || !de(t.line).includes("{count}")) bad.push(t.id);
    }
    expect(bad).toEqual([]);
  });

  it("kill-Vorlagen nutzen select.zoneBand", () => {
    const bad = tasks.filter((t) => t.kind === "kill" && !t.select.zoneBand).map((t) => t.id);
    expect(bad).toEqual([]);
  });

  it("line hat höchstens einen Gedankenstrich je Sprache (natürliche Spieltexte)", () => {
    const bad: string[] = [];
    for (const t of tasks) {
      for (const text of [en(t.line), de(t.line)]) {
        if ((text.match(/—/g) ?? []).length > 1) bad.push(`${t.id}: "${text}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("deliver/produce/run/assortment-Vorlagen finden mindestens eine passende Aktion im Content " +
    "(Sonderfall farming: kein content.actions-Eintrag, geprüft über content.crops — s. Content-Bericht)", () => {
    const noTarget: string[] = [];
    for (const t of tasks) {
      if (t.kind === "kill" || t.kind === "dungeon" || t.kind === "champion") continue;
      if (t.select.skill === "farming") {
        // Sonderfall: Anbau läuft über content.crops, nicht content.actions (kein Skill-Action-Pfad).
        const cropCandidates = Object.values(content.crops ?? {});
        if (cropCandidates.length === 0) noTarget.push(`${t.id} (crops)`);
        continue;
      }
      const matches = matchingActions(t);
      if (matches.length === 0) noTarget.push(t.id);
    }
    expect(noTarget).toEqual([]);
  });

  it("dungeon/champion-Vorlagen haben einen nicht-leeren Kandidatenpool im Katalog", () => {
    const hasDungeon = tasks.some((t) => t.kind === "dungeon");
    const hasChampion = tasks.some((t) => t.kind === "champion");
    if (hasDungeon) expect(content.dungeons.length).toBeGreaterThan(0);
    if (hasChampion) expect(Object.keys(content.elites ?? {}).length).toBeGreaterThan(0);
  });

  it("assortment-Vorlagen filtern auf mindestens 3 verschiedene Items im gewählten itemType", () => {
    for (const t of tasks) {
      if (t.kind !== "assortment") continue;
      const wantedType = t.select.itemType;
      const pool = Object.values(content.items).filter((it) => !wantedType || it.type === wantedType);
      expect(pool.length, t.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("Taverne: Overlay-Vollständigkeit (5 Sprachen)", () => {
  const overlays: Record<string, Record<string, string>> = { es, "pt-BR": ptBR, fr, ru, zh };

  it("camp_tavern name+description in allen 5 Sprachen", () => {
    for (const [locale, table] of Object.entries(overlays)) {
      expect(table["campBuildings:camp_tavern:name"], locale).toBeTruthy();
      expect(table["campBuildings:camp_tavern:description"], locale).toBeTruthy();
    }
  });

  it("alle 5 Behälter-Items: name+description in allen 5 Sprachen", () => {
    const ids = ["black_market_crate_i", "black_market_crate_ii", "black_market_crate_iii", "black_market_crate_iv", "black_market_crate_v"];
    for (const [locale, table] of Object.entries(overlays)) {
      for (const id of ids) {
        expect(table[`items:${id}:name`], `${locale}/${id}`).toBeTruthy();
        expect(table[`items:${id}:description`], `${locale}/${id}`).toBeTruthy();
      }
    }
  });

  it("jeder Gast: role+greeting in allen 5 Sprachen", () => {
    for (const [locale, table] of Object.entries(overlays)) {
      for (const g of guests) {
        expect(table[`tavernGuests:${g.id}:role`], `${locale}/${g.id}`).toBeTruthy();
        expect(table[`tavernGuests:${g.id}:greeting`], `${locale}/${g.id}`).toBeTruthy();
      }
    }
  });

  it("jede Vorlage: line in allen 5 Sprachen", () => {
    for (const [locale, table] of Object.entries(overlays)) {
      for (const t of tasks) {
        expect(table[`tavernTasks:${t.id}:line`], `${locale}/${t.id}`).toBeTruthy();
      }
    }
  });
});
