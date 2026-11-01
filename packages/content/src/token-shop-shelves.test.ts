import { describe, expect, it } from "vitest";
import { content } from "./index";

/**
 * Wächter-Test für die Token-Shop-Regale (Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p13).
 *
 * Ausgangslage: der Belohnungs-Shop hatte nur 9 Angebote im Band L10-L55, während ein voller
 * Tagesertrag (bis 20 Tokens) im späten Spiel Essen kauft, das der Spieler längst nicht mehr isst.
 * Fix: 6 Regale, an dieselbe Kapitel-Kette gekoppelt, die auch die Kampfzonen öffnet
 * (ZoneDef.requiresQuest / TokenShopShelf.requiresQuest, beide über `isZoneUnlocked`-Muster
 * geprüft — hier gegen `content.quests`, die Kauf-Gate-Logik selbst sitzt in
 * `packages/engine/src/quests.ts` `isShelfOpen`/`buyTokenShopOffer`, dort getestet).
 *
 * Leitplanken, die dieser Test hart durchsetzt (Chef-Entscheidungen #13):
 *  1. Genau 6 Regale, an Chronik-Kapitel gekoppelt (offenes Start-Regal + 5 Kapitel-Regale).
 *  3. KEINE Runen im Shop (Runen gibt es nur über den Runecrafting-Skill selbst).
 *  Hausregeln: kein Equipment, kein kampf-gegatetes Material (jedes Angebots-Item muss über
 *  mindestens eine NICHT-Kampf-Aktion — Sammeln/Verarbeiten — erreichbar sein), Preisdeckel 20
 *  Tokens/Angebot (enger als der 25er-Sanity-Deckel in engine/quests.test.ts).
 */

describe("Token-Shop-Regale (#p13)", () => {
  const shelves = content.tokenShopShelves ?? [];
  const offers = content.tokenShop ?? [];

  /**
   * Chef-GO 02 (26.08.2026): sieben neue Kapitel-Meilenstein-Items, eins pro Regal (sechs
   * Ausrüstungsstücke + eine mehrfach kaufbare Verbrauchsmarke). Die #13-Hausregeln unten wurden
   * ausdrücklich FÜR DIESE SIEBEN aufgehoben:
   *  - "kein Equipment" (#p13 Chef-Entscheidung 1): die sechs chronicle_*-Ausrüstungsstücke sind
   *    bewusst idle Rider ohne Kampf-Power (Werte unter den Tier-IV-Schmuckrunen, s. Item-
   *    Kommentar im Katalog) — reine Kapitel-Meilenstein-Zeichen, kein Fortschritts-Shortcut.
   *  - "nicht kampf-gegatet" (mind. eine Sammel-/Verarbeitungs-Quelle ODER Gold-Shop): alle
   *    sieben sind ABSICHTLICH exklusiv im Token-Shop — das IST der Belohnungsladen-Witz eines
   *    Kapitel-Meilensteins, keine Materialkette, die Kampf umgehen würde.
   *  - "stackable" (nur für die sechs Ausrüstungsstücke): Ausrüstung ist wie überall im Spiel
   *    stackable:false, qty bleibt 1 — kein Bündelkauf.
   * (wiring-audit.test.ts `obtainableSet()` zählt `content.tokenShop` seither ebenfalls als
   * Erhältlichkeits-Quelle, sonst wären diese sieben "nicht erhältlich".)
   */
  const CHAPTER_MILESTONE_EQUIPMENT_IDS = new Set([
    "chronicle_wanderers_seal",
    "chronicle_ash_mark",
    "chronicle_crypt_lantern",
    "chronicle_tide_chain",
    "chronicle_idol_eye_ring",
    "chronicle_chronicler_signet",
  ]);
  // claude:2026-10-30T22:28:00+01:00 — Belohnungsladen 1.4.2 (Chef-Entscheid L4 vom 30.10.2026): der Raid-Gebührenschein ist ABSICHTLICH
  // nur im Laden erhältlich (1/Woche, 20 Marken), wie die Auftragsmarke. Er ist kein Material, er senkt nur eine Gold-Gebühr.
  const CHAPTER_MILESTONE_EXCLUSIVE_IDS = new Set([
    ...CHAPTER_MILESTONE_EQUIPMENT_IDS,
    "chronicle_task_token",
    "raid_fee_writ",
  ]);

  it("genau 6 Regale, eindeutige IDs, aufsteigende sortOrder", () => {
    expect(shelves.length).toBe(6);
    const ids = new Set(shelves.map((s) => s.id));
    expect(ids.size).toBe(shelves.length);
    const sortOrders = shelves.map((s) => s.sortOrder).slice().sort((a, b) => a - b);
    expect(sortOrders).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("genau ein Regal ist offen (kein requiresQuest), alle anderen tragen ein Kapitel-Gate", () => {
    const open = shelves.filter((s) => !s.requiresQuest);
    expect(open.length).toBe(1);
    const gated = shelves.filter((s) => s.requiresQuest);
    expect(gated.length).toBe(5);
  });

  it("jedes Regal-Gate (requiresQuest) verweist auf eine existierende Quest", () => {
    const questIds = new Set(content.quests.map((q) => q.id));
    for (const s of shelves) {
      if (s.requiresQuest) {
        expect(questIds.has(s.requiresQuest), `Regal ${s.id}: requiresQuest ${s.requiresQuest} fehlt in content.quests`).toBe(true);
      }
    }
  });

  it("jedes Regal trägt einen zweisprachigen Namen (en + de)", () => {
    for (const s of shelves) {
      // LocalizedString erlaubt auch den einsprachigen en-Shorthand (plain string) — Haus-Pflicht
      // ist aber IMMER das zweisprachige Objekt (s. Wächter-Auftrag: "jede name ist bilingual").
      expect(typeof s.name, `Regal ${s.id}: name muss { en, de } sein, nicht der en-Shorthand`).toBe("object");
      const name = s.name as { en: string; de?: string };
      expect(name.en, `Regal ${s.id}: name.en fehlt`).toBeTruthy();
      expect(name.de, `Regal ${s.id}: name.de fehlt`).toBeTruthy();
    }
  });

  it("mindestens 30 Angebote insgesamt (Aufwand-Schätzung #p13: ~34 neue + 9 bestehende)", () => {
    expect(offers.length).toBeGreaterThanOrEqual(30);
  });

  it("jedes Angebot referenziert ein existierendes Regal", () => {
    const shelfIds = new Set(shelves.map((s) => s.id));
    for (const o of offers) {
      // Fehlendes shelfId ist erlaubt (fällt laut Content-Vertrag ins offene Regal) — hier tragen
      // ALLE Angebote (auch die 9 alten #284-Angebote) explizit ein shelfId.
      expect(o.shelfId, `Angebot ${o.id} ohne shelfId`).toBeTruthy();
      expect(shelfIds.has(o.shelfId!), `Angebot ${o.id}: unbekanntes shelfId ${o.shelfId}`).toBe(true);
    }
  });

  it("jedes Angebot ist ≤ 20 Tokens (Preisdeckel #p13)", () => {
    for (const o of offers) {
      expect(o.tokenCost, `Angebot ${o.id}: tokenCost ${o.tokenCost} über dem 20er-Deckel`).toBeLessThanOrEqual(20);
      expect(o.tokenCost).toBeGreaterThanOrEqual(1);
    }
  });

  it("jedes Angebot ist kein Equipment und keine Rune (außer den 6 Kapitel-Meilenstein-Ausrüstungen, Chef-GO 02 26.08.2026)", () => {
    for (const o of offers) {
      const item = content.items[o.itemId];
      expect(item, `Angebot ${o.id}: itemId ${o.itemId} fehlt im Katalog`).toBeDefined();
      if (!CHAPTER_MILESTONE_EQUIPMENT_IDS.has(o.itemId)) {
        expect(item?.type, `Angebot ${o.id}: ${o.itemId} ist Ausrüstung — verboten im Token-Shop`).not.toBe("equipment");
      }
      expect(item?.rune, `Angebot ${o.id}: ${o.itemId} ist eine Rune — #p13 Chef-Entscheidung 3 (Runen nur über den Skill)`).toBeUndefined();
    }
  });

  it("jedes Angebot ist NICHT kampf-gegatet (mind. eine Sammel-/Verarbeitungs-Aktion ODER der Gold-Shop liefert es, außer den 7 Kapitel-Meilensteinen)", () => {
    // Herleitung wie im Ist-Stand-Befund #p13 (Saat/Essenz-Prüfung): ein Item gilt als
    // kampf-gegatet, wenn KEINE einzige content.actions-Aktion (= Sammeln/Verarbeiten, niemals
    // Kampf — Kampf-Loot sitzt ausschließlich in content.monsters) es in ihrem `loot` führt UND es
    // auch nicht direkt im Gold-Shop (content.shop) kaufbar ist (z.B. magic_binder, Task #284).
    // Die 7 Kapitel-Meilensteine (Chef-GO 02 26.08.2026) sind ABSICHTLICH token-shop-exklusiv.
    const nonCombatSources = new Set<string>();
    for (const a of Object.values(content.actions)) {
      for (const l of a.loot) nonCombatSources.add(l.itemId);
    }
    for (const s of content.shop) nonCombatSources.add(s.itemId);
    for (const o of offers) {
      if (CHAPTER_MILESTONE_EXCLUSIVE_IDS.has(o.itemId)) continue;
      expect(
        nonCombatSources.has(o.itemId),
        `Angebot ${o.id}: ${o.itemId} kommt aus keiner Sammel-/Verarbeitungs-Aktion — kampf-gegatetes Material?`,
      ).toBe(true);
    }
  });

  it("jedes Angebots-Item ist stackable (außer den 6 Kapitel-Meilenstein-Ausrüstungen), qty ist eine positive Ganzzahl", () => {
    for (const o of offers) {
      const item = content.items[o.itemId];
      if (CHAPTER_MILESTONE_EQUIPMENT_IDS.has(o.itemId)) {
        expect(item?.stackable, `Angebot ${o.id}: Ausrüstung ${o.itemId} muss stackable:false sein`).toBe(false);
        expect(o.qty, `Angebot ${o.id}: Ausrüstung ${o.itemId} muss qty 1 sein`).toBe(1);
      } else {
        expect(item?.stackable, `Angebot ${o.id}: ${o.itemId} muss stackable sein (Bündel = Stack)`).toBe(true);
      }
      expect(Number.isInteger(o.qty) && o.qty > 0, `Angebot ${o.id}: qty muss positive Ganzzahl sein`).toBe(true);
    }
  });

  it("Angebots-IDs sind eindeutig", () => {
    const ids = new Set(offers.map((o) => o.id));
    expect(ids.size).toBe(offers.length);
  });

  it("die 10 neuen Spätzonen-Dailies existieren, sind master-Schwierigkeit mit tokenReward 8", () => {
    const lateIds = [
      "daily_ma_kill_roc_20",
      "daily_ma_kill_gravecliff_specter_8",
      "daily_ma_kill_highland_wyvern_6",
      "daily_ma_kill_idol_warden_15",
      "daily_ma_kill_aether_wraith_10",
      "daily_ma_kill_scale_skarn_8",
      "daily_ma_smelt_godiron_3",
      "daily_ma_cook_witherleek_broth_20",
      "daily_ma_gather_400",
      "daily_ma_kill_total_80",
    ];
    for (const id of lateIds) {
      const q = content.quests.find((x) => x.id === id);
      expect(q, `Daily ${id} fehlt im Pool`).toBeDefined();
      expect(q?.daily).toBe(true);
      expect(q?.difficulty).toBe("master");
      expect(q?.tokenReward).toBe(8);
    }
  });
});
