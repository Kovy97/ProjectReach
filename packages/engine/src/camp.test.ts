import { describe, expect, it } from "vitest";
import type { CampBoostKind, ContentDB, GameState } from "@hearthforge/shared";
import { CAMP_TOWNHALL_ID, CAMP_MAX_BUILDING_LEVEL, TICK_MS } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { bankCount } from "./bank";
import {
  campBoost,
  campBuildSlots,
  campBuildStartReason,
  campBuildingDef,
  campBuildingLevel,
  campUsedBuildSlots,
  cancelCampBuild,
  debugCompleteCampBuild,
  startCampBuild,
} from "./camp";

/**
 * Das Lager (Encampment Phase 1, Task #358): Katalog-Guard (§3-Pin), Bau-Loop komplett
 * (Start→Tick→Fertig), alle Start-Gates, Kosten-Abbuchung + Erstattung, Schreibzelt-Tempo,
 * campBoost-Summen und der offline==online-Beweis. Grundlagen: design/encampment-balance.md §3/§7,
 * design/encampment-konzept.md (Balance-Korrekturen K1/K2/K4/K5).
 */

/** Task-#358-IDs in Katalog-Reihenfolge (bindend — auch wo die Lore andere Vorschläge machte). */
const EXPECTED_IDS = [
  "camp_townhall",
  "camp_watchtower",
  "camp_storehouse",
  "camp_scrivener_tent",
  "camp_fishing_hut",
  "camp_sawpit",
  "camp_mine_adit",
  "camp_seed_garden",
  "camp_fence_tent",
  "camp_workyard",
  "camp_smelter",
  "camp_smokehouse",
  "camp_trophy_wall",
  "camp_warden_shrine",
  "camp_trade_post",
] as const;

const ALL_KINDS: CampBoostKind[] = [
  "buildSlots", "offlineCapMs", "bankSlots", "buildSpeed", "fishingSpeed", "woodcuttingSpeed",
  "miningSpeed", "farmingSpeed", "thievingSpeed", "craftSpeed", "smeltRate", "smokeRate",
  "slayerPoints", "blessing", "sellBonus",
];

/**
 * Frischer State. SEIT TASK #365 ist das schon alles: New Haven ist ab Spielstart offen — es gibt
 * keinen Freischaltungs-Beat mehr nachzureichen (früher: `quests.completed.push("chronicle_04")`).
 */
function unlockedGame(seed = 1): GameState {
  return createGame({ name: "Lager" }, content, seed);
}

/** Zahlt Gold + alle Materialien einer Stufe direkt ins Inventar/Konto ein. */
function fund(s: GameState, buildingId: string, targetLevel: number): void {
  const def = campBuildingDef(content, buildingId)!;
  const lvl = def.levels[targetLevel - 1]!;
  s.character.gold += lvl.gold;
  for (const c of lvl.items) addItem(s.inventory, content, c.itemId, c.qty);
}

describe("Lager-Katalog: 15 Gebäude × 3 Stufen exakt nach encampment-balance.md §3", () => {
  const catalog = content.campBuildings!;

  it("alle 15 Task-IDs vorhanden, jede mit genau 3 Stufen, jede Stufe mit Materialien", () => {
    expect(catalog.map((b) => b.id)).toEqual([...EXPECTED_IDS]);
    for (const b of catalog) {
      expect(b.levels.length, b.id).toBe(CAMP_MAX_BUILDING_LEVEL);
      for (const lvl of b.levels) {
        expect(lvl.items.length, `${b.id}: Stufe ohne Materialien`).toBeGreaterThan(0);
        expect(lvl.gold).toBeGreaterThan(0);
        expect(lvl.buildMs).toBeGreaterThan(0);
      }
    }
  });

  it("jede Material-ID aller 45 Stücklisten existiert im Item-Katalog", () => {
    for (const b of catalog) {
      for (const lvl of b.levels) {
        for (const c of lvl.items) {
          expect(content.items[c.itemId], `${b.id}: unbekanntes Item ${c.itemId}`).toBeDefined();
          expect(Number.isInteger(c.qty) && c.qty > 0, `${b.id}: qty ${c.itemId}`).toBe(true);
        }
      }
    }
  });

  it("Gold-Leiter (Balance-K5): Σ Stufe I = 27 300 · Σ II = 136 500 · Σ III = 551 000; II = 5×I, III = 4×II (Ausnahme Zentralhaus III = 15 000)", () => {
    // Task #366: Schrein der Stillen 4 000/20 000/80 000 → 1 500/7 500/30 000 verschiebt jede
    // Summe um genau das eigene Gold-Delta des Schreins (-2 500/-12 500/-50 000).
    const sums = [0, 0, 0];
    for (const b of catalog) {
      b.levels.forEach((lvl, i) => (sums[i]! += lvl.gold));
      expect(b.levels[1]!.gold, `${b.id}: II ≠ 5×I`).toBe(b.levels[0]!.gold * 5);
      if (b.id === CAMP_TOWNHALL_ID) {
        expect(b.levels[2]!.gold).toBe(15_000); // Story-Flaggschiff-Ausnahme (K5)
      } else {
        expect(b.levels[2]!.gold, `${b.id}: III ≠ 4×II`).toBe(b.levels[1]!.gold * 4);
      }
    }
    expect(sums).toEqual([27_300, 136_500, 551_000]);
  });

  it("Bauzeiten exakt nach der Konzept-Tabelle (encampment-konzept.md)", () => {
    const MIN = 60_000;
    const H = 3_600_000;
    const expected: Record<string, [number, number, number]> = {
      camp_townhall: [10 * MIN, 8 * H, 24 * H],
      camp_watchtower: [1 * H, 12 * H, 48 * H],
      camp_storehouse: [30 * MIN, 8 * H, 24 * H],
      camp_scrivener_tent: [1 * H, 12 * H, 36 * H],
      camp_fishing_hut: [20 * MIN, 6 * H, 20 * H],
      camp_sawpit: [20 * MIN, 6 * H, 20 * H],
      camp_mine_adit: [20 * MIN, 6 * H, 20 * H],
      camp_seed_garden: [15 * MIN, 5 * H, 16 * H],
      camp_fence_tent: [30 * MIN, 6 * H, 20 * H],
      camp_workyard: [2 * H, 16 * H, 48 * H],
      camp_smelter: [1 * H, 10 * H, 30 * H],
      camp_smokehouse: [45 * MIN, 8 * H, 24 * H],
      camp_trophy_wall: [4 * H, 16 * H, 48 * H],
      camp_warden_shrine: [2 * H, 16 * H, 48 * H],
      camp_trade_post: [1 * H, 10 * H, 30 * H],
    };
    for (const b of catalog) {
      expect(b.levels.map((l) => l.buildMs), b.id).toEqual(expected[b.id]);
    }
  });

  it("Boost-Arten + Stufen-Deltas nach Konzept-Tabelle inkl. Balance-Korrekturen (K1 buildSpeed, K4 +4/+5/+5) — Budget-Pin §7.11", () => {
    // codex:2026-07-31T19:00:03+02:00 — bindender Kapazitäts-Pin 4/9/14.
    const expected: Record<string, { kind: CampBoostKind; values: [number, number, number] }> = {
      camp_townhall: { kind: "buildSlots", values: [4, 5, 5] },
      camp_watchtower: { kind: "offlineCapMs", values: [3_600_000, 3_600_000, 3_600_000] },
      camp_storehouse: { kind: "bankSlots", values: [4, 4, 6] },
      camp_scrivener_tent: { kind: "buildSpeed", values: [0.10, 0.10, 0.10] },
      camp_fishing_hut: { kind: "fishingSpeed", values: [0.05, 0.05, 0.05] },
      camp_sawpit: { kind: "woodcuttingSpeed", values: [0.05, 0.05, 0.05] },
      camp_mine_adit: { kind: "miningSpeed", values: [0.05, 0.05, 0.05] },
      camp_seed_garden: { kind: "farmingSpeed", values: [0.04, 0.04, 0.04] },
      camp_fence_tent: { kind: "thievingSpeed", values: [0.05, 0.05, 0.05] },
      camp_workyard: { kind: "craftSpeed", values: [0.03, 0.03, 0.03] },
      camp_smelter: { kind: "smeltRate", values: [20, 20, 20] },
      camp_smokehouse: { kind: "smokeRate", values: [20, 20, 20] },
      camp_trophy_wall: { kind: "slayerPoints", values: [0.10, 0.10, 0.10] },
      camp_warden_shrine: { kind: "blessing", values: [0.10, 0.10, 0.10] },
      camp_trade_post: { kind: "sellBonus", values: [0.02, 0.02, 0.02] },
    };
    for (const b of catalog) {
      const e = expected[b.id]!;
      for (let i = 0; i < 3; i++) {
        expect(b.levels[i]!.boost.kind, `${b.id} Stufe ${i + 1}`).toBe(e.kind);
        expect(b.levels[i]!.boost.value, `${b.id} Stufe ${i + 1}`).toBe(e.values[i]);
      }
    }
    // Eiserne Regel 3 (Boost-Budget, encampment-balance.md §3-Tabelle): Voll-Lager-Summen je Skill.
    const full = createGame({ name: "Voll" }, content, 1);
    for (const id of EXPECTED_IDS) full.camp.buildings[id] = 3;
    expect(campBoost(full, content, "fishingSpeed")).toBeCloseTo(0.15, 10);
    expect(campBoost(full, content, "woodcuttingSpeed")).toBeCloseTo(0.15, 10);
    expect(campBoost(full, content, "miningSpeed")).toBeCloseTo(0.15, 10);
    expect(campBoost(full, content, "thievingSpeed")).toBeCloseTo(0.15, 10);
    expect(campBoost(full, content, "farmingSpeed")).toBeCloseTo(0.12, 10);
    expect(campBoost(full, content, "craftSpeed")).toBeCloseTo(0.09, 10);
    expect(campBoost(full, content, "buildSlots")).toBe(14); // K4: 14 Nicht-Zentralhaus-Gebäude
    expect(campBoost(full, content, "offlineCapMs")).toBe(3 * 3_600_000);
    expect(campBoost(full, content, "bankSlots")).toBe(14);
    expect(campBoost(full, content, "slayerPoints")).toBeCloseTo(0.30, 10);
    expect(campBoost(full, content, "blessing")).toBeCloseTo(0.30, 10);
    expect(campBoost(full, content, "sellBonus")).toBeCloseTo(0.06, 10);
    expect(campBoost(full, content, "buildSpeed")).toBeCloseTo(0.30, 10);
    expect(campBoost(full, content, "smeltRate")).toBe(60);
    expect(campBoost(full, content, "smokeRate")).toBe(60);
  });

  it("Zentralhaus: KEIN Gebäude trägt mehr requiresQuest (Task #366 — Bauteile sind jetzt das einzige Gate)", () => {
    for (const b of catalog) {
      for (const lvl of b.levels) expect(lvl.requiresQuest, b.id).toBeUndefined();
    }
  });
});

describe("campBoost: neutral ohne Lager (Guard balance.md §7) + korrekte Summen", () => {
  it("frischer Spielstand: JEDE Boost-Art liefert exakt 0", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    for (const kind of ALL_KINDS) expect(campBoost(s, content, kind), kind).toBe(0);
  });

  it("Content ohne campBuildings-Katalog: 0 (inert) und startCampBuild lehnt ab", () => {
    const s = unlockedGame();
    const bare = { ...content, campBuildings: undefined } as ContentDB;
    for (const kind of ALL_KINDS) expect(campBoost(s, bare, kind)).toBe(0);
    expect(startCampBuild(s, bare, CAMP_TOWNHALL_ID)).toBe("unknown_building");
  });

  it("summiert die Stufen-Deltas gebauter Stufen (Fischerhütte II = 0.10, III = 0.15)", () => {
    const s = createGame({ name: "Boost" }, content, 1);
    s.camp.buildings.camp_fishing_hut = 2;
    expect(campBoost(s, content, "fishingSpeed")).toBeCloseTo(0.10, 10);
    s.camp.buildings.camp_fishing_hut = 3;
    expect(campBoost(s, content, "fishingSpeed")).toBeCloseTo(0.15, 10);
    // Andere Arten bleiben unberührt.
    expect(campBoost(s, content, "miningSpeed")).toBe(0);
  });

  it("ignoriert unbekannte buildings-Einträge (Content-Drift crasht nie)", () => {
    const s = createGame({ name: "Drift" }, content, 1);
    s.camp.buildings.camp_gibts_nicht = 3;
    for (const kind of ALL_KINDS) expect(campBoost(s, content, kind)).toBe(0);
  });
});

/**
 * Task #364 Fix 5a: `campBuildStartReason` ist das REINE Prädikat hinter `startCampBuild` — und
 * seit diesem Task auch die einzige Quelle der UI-Sperr-Zeilen (NewHavenPage). Zwei Zusicherungen
 * müssen halten: (a) identische Antwort wie das mutierende Verb in JEDER Lage, (b) wirklich keine
 * Mutation (die UI ruft es pro Karte und pro Render auf).
 */
describe("campBuildStartReason: reines Prädikat, deckungsgleich mit startCampBuild", () => {
  /** Alle Katalog-Gebäude in einer Lage durchprüfen: Prädikat == Verb (Verb auf einer Kopie). */
  function expectAgreement(s: GameState, label: string): void {
    for (const def of content.campBuildings ?? []) {
      const predicted = campBuildStartReason(s, content, def.id);
      const copy = structuredClone(s);
      const actual = startCampBuild(copy, content, def.id);
      expect(predicted, `${label} / ${def.id}`).toBe(actual);
    }
  }

  it("stimmt in jeder Lage mit dem mutierenden Verb überein (alle 15 Gebäude)", () => {
    // (1) frischer Charakter, keine Mittel
    const fresh = createGame({ name: "Frisch" }, content, 1);
    expectAgreement(fresh, "frisch");

    // (2) bezahlbares Zentralhaus I
    const funded = unlockedGame();
    fund(funded, CAMP_TOWNHALL_ID, 1);
    expectAgreement(funded, "Zentralhaus I bezahlbar");

    // (3) laufender Bau (crew_busy für ALLE)
    const busy = unlockedGame();
    fund(busy, CAMP_TOWNHALL_ID, 1);
    startCampBuild(busy, content, CAMP_TOWNHALL_ID);
    expectAgreement(busy, "Bautrupp beschäftigt");

    // (4) ausgebautes Lager mit vollen Bauplätzen und offenen Quest-Gates
    const grown = unlockedGame();
    grown.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    grown.character.gold = 10_000_000;
    for (const def of content.campBuildings ?? []) {
      if (def.id === CAMP_TOWNHALL_ID) continue;
      grown.camp.buildings[def.id] = 1;
      for (const c of def.levels[1]?.items ?? []) addItem(grown.inventory, content, c.itemId, c.qty);
    }
    grown.camp.buildSeq += 1;
    expectAgreement(grown, "ausgebautes Lager");

    // (5) Stufe III überall (max_level)
    const maxed = unlockedGame();
    for (const def of content.campBuildings ?? []) maxed.camp.buildings[def.id] = 3;
    maxed.camp.buildSeq += 1;
    expectAgreement(maxed, "voll ausgebaut");

    // (6) unbekannte ID
    expect(campBuildStartReason(fresh, content, "camp_luftschloss")).toBe("unknown_building");
  });

  it("mutiert NICHTS — auch nicht bei fehlendem camp-Objekt (die UI ruft es pro Render auf)", () => {
    const s = unlockedGame();
    fund(s, CAMP_TOWNHALL_ID, 1);
    const before = structuredClone(s);
    for (const def of content.campBuildings ?? []) campBuildStartReason(s, content, def.id);
    expect(s).toEqual(before);

    // Hand-konstruierter Alt-State ohne `camp`: das Prädikat darf das Feld NICHT anlegen.
    const legacy = unlockedGame();
    delete (legacy as Partial<GameState>).camp;
    expect(campBuildStartReason(legacy, content, CAMP_TOWNHALL_ID)).toBe("cannot_afford");
    expect(legacy.camp).toBeUndefined();
  });

  it("startCampBuild liefert weiterhin exakt dieselben Gründe (kein Verhaltens-Drift)", () => {
    const s = unlockedGame();
    expect(campBuildStartReason(s, content, CAMP_TOWNHALL_ID)).toBe("cannot_afford");
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("cannot_afford");
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(campBuildStartReason(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    // Nach dem Start sagen beide „crew_busy" — das Prädikat sieht denselben Job.
    expect(campBuildStartReason(s, content, CAMP_TOWNHALL_ID)).toBe("crew_busy");
  });
});

describe("startCampBuild: Gates in fester Reihenfolge", () => {
  it("KEIN Zugangs-Gate (Task #365): der FRISCHE Charakter kann sofort bauen, sobald er die Kosten hat", () => {
    // Rot vor #365 (Grund war „locked", bis chronicle_04 erfüllt war), grün seit #365.
    const s = createGame({ name: "Frisch" }, content, 1);
    expect(s.quests.completed).toEqual([]); // wirklich keine Story-Fortschritte
    expect(s.quests.claimed).toEqual([]);

    // Ohne Mittel scheitert es an den KOSTEN — nicht an einer Freischaltung.
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("cannot_afford");

    // Mit den Stufe-I-Kosten in der Tasche baut derselbe frische Charakter sofort los.
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    expect(s.camp.buildJob).toEqual({
      buildingId: CAMP_TOWNHALL_ID,
      targetLevel: 1,
      remainingMs: 600_000,
    });
  });


  it("unknown_building: ID nicht im Katalog", () => {
    const s = unlockedGame();
    expect(startCampBuild(s, content, "camp_luftschloss")).toBe("unknown_building");
  });

  it("max_level: Stufe III ist das Ende", () => {
    const s = unlockedGame();
    s.camp.buildings[CAMP_TOWNHALL_ID] = 3;
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("max_level");
  });

  it("crew_busy: der EINE Bautrupp (eiserne Regel 4)", () => {
    const s = unlockedGame();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    fund(s, "camp_fishing_hut", 1);
    expect(startCampBuild(s, content, "camp_fishing_hut")).toBe("crew_busy");
  });

  // Das frühere PACING-Gerüst (chronicle_09/14 an Zentralhaus II/III) ist mit Task #366 ersatzlos
  // entfallen — die Bauteile (timber_beam/brace/anchor) sind jetzt das EINZIGE Stufen-Gate.
  it("Zentralhaus II/III: kein Quest mehr nötig, nur Bauteile + Gold (Task #366)", () => {
    const s = unlockedGame();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    advance(s, content, 600_000); // Stufe I fertig
    expect(campBuildingLevel(s, CAMP_TOWNHALL_ID)).toBe(1);

    expect(s.quests.completed).toEqual([]); // wirklich keine Story-Fortschritte
    expect(s.quests.claimed).toEqual([]);
    fund(s, CAMP_TOWNHALL_ID, 2);
    // Beweist, dass die Streichung wirklich griff (nicht nur, dass das Feld fehlt): ohne jeden
    // Quest-Fortschritt geht Stufe II trotzdem durch, allein weil Gold+Bauteile bezahlt sind.
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
  });

  it("townhall_required: Gebäude-Stufe II/III verlangt Zentralhaus II/III (Balance-K4)", () => {
    const s = unlockedGame();
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    s.camp.buildings.camp_fishing_hut = 1;
    fund(s, "camp_fishing_hut", 2);
    expect(startCampBuild(s, content, "camp_fishing_hut")).toBe("townhall_required");
    s.camp.buildings[CAMP_TOWNHALL_ID] = 2;
    expect(startCampBuild(s, content, "camp_fishing_hut")).toBe("ok");
  });

  it("no_slot: Zentralhaus gibt +4/+5/+5 Kapazität; das 5. Gebäude blockt auf Stufe I; Ausbau braucht keine neue Kapazität", () => {
    const s = unlockedGame();
    // codex:2026-07-31T19:00:03+02:00 — Kapazität statt räumlicher Slots.
    // Ohne Zentralhaus: 0 Kapazität → gar kein Neubau möglich.
    fund(s, "camp_fishing_hut", 1);
    expect(startCampBuild(s, content, "camp_fishing_hut")).toBe("no_slot");
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    expect(campBuildSlots(s, content)).toBe(4);
    for (const id of [
      "camp_fishing_hut",
      "camp_sawpit",
      "camp_mine_adit",
      "camp_seed_garden",
    ]) {
      s.camp.buildings[id] = 1;
    }
    expect(campUsedBuildSlots(s, content)).toBe(4);
    fund(s, "camp_smelter", 1);
    expect(startCampBuild(s, content, "camp_smelter")).toBe("no_slot");
    // Ausbau eines GEBAUTEN Gebäudes belegt keinen neuen Platz (nur Zentralhaus-Gate zählt).
    s.camp.buildings[CAMP_TOWNHALL_ID] = 2;
    fund(s, "camp_fishing_hut", 2);
    expect(startCampBuild(s, content, "camp_fishing_hut")).toBe("ok");
    // Zentralhaus II addiert +5 und hebt die Gesamtkapazität auf 9.
    s.camp.buildJob = null;
    expect(campBuildSlots(s, content)).toBe(9);
    expect(startCampBuild(s, content, "camp_smelter")).toBe("ok");
    // Der laufende NEUBAU reserviert Kapazität sofort (4 gebaut + 1 neu = 5).
    expect(campUsedBuildSlots(s, content)).toBe(5);
  });

  it("das Zentralhaus selbst braucht nie einen Bauplatz und zählt nie gegen das Limit", () => {
    const s = unlockedGame();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok"); // 0 Plätze frei — egal
    expect(campUsedBuildSlots(s, content)).toBe(0); // laufender Zentralhaus-Bau reserviert nichts
  });

  it("cannot_afford: Gold ODER Materialien fehlen", () => {
    const s = unlockedGame();
    // Nur Gold, keine Logs:
    s.character.gold = 500;
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("cannot_afford");
    // Nur Logs, zu wenig Gold:
    s.character.gold = 499;
    addItem(s.inventory, content, "oak_log", 20);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("cannot_afford");
    s.character.gold = 500;
    // Chef-Entscheid 2026-08-03: Zentralhaus I ist wieder „zeremoniell billig" — 500 g + 20 Eiche,
    // KEIN Bauteil mehr (die 2× timber_beam aus #366 machten den ersten Bau zum 35-60-min-Grind).
    // Alle anderen Stücklisten behalten ihre Bauteile.
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
  });
});

describe("Bau-Loop komplett: Start → Kosten → Tick → Fertig (+ Breadcrumb)", () => {
  it("Zentralhaus I: Kosten Inventar-zuerst-dann-Bank, Job exakt 10 min, Fertigstellung setzt Stufe + Breadcrumb", () => {
    const s = unlockedGame();
    s.character.gold = 700;
    addItem(s.inventory, content, "oak_log", 12);
    s.bank.oak_log = 15;

    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    // Gold abgebucht + als Ausgabe verbucht; Materialien Inventar zuerst, Rest aus der Bank.
    expect(s.character.gold).toBe(200);
    expect(s.stats.goldSpent).toBe(500);
    expect(itemCount(s.inventory, "oak_log")).toBe(0);
    expect(bankCount(s, "oak_log")).toBe(7); // 12 + 8 aus der Bank = 20
    expect(s.camp.buildJob).toEqual({ buildingId: CAMP_TOWNHALL_ID, targetLevel: 1, remainingMs: 600_000 });

    // Ein Tick vor Fertigstellung: noch nicht fertig.
    advance(s, content, 600_000 - TICK_MS);
    expect(s.camp.buildJob!.remainingMs).toBe(TICK_MS);
    expect(campBuildingLevel(s, CAMP_TOWNHALL_ID)).toBe(0);

    // Der letzte Tick vollendet den Bau.
    advance(s, content, TICK_MS);
    expect(s.camp.buildJob).toBeNull();
    expect(campBuildingLevel(s, CAMP_TOWNHALL_ID)).toBe(1);
    expect(s.camp.buildSeq).toBe(1);
    expect(s.camp.lastCompletedBuild).toEqual({ buildingId: CAMP_TOWNHALL_ID, level: 1, seq: 1 });
    // codex:2026-07-31T19:00:03+02:00 — Zentralhaus I öffnet vier Kapazitätseinheiten.
    expect(campBuildSlots(s, content)).toBe(4);
  });

  it("der Bautrupp arbeitet auch während Betäubung weiter (Timer tickt vor dem Skilling-Zweig)", () => {
    const s = unlockedGame();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    s.stunMs = 5_000;
    advance(s, content, 5_000);
    expect(s.camp.buildJob!.remainingMs).toBe(600_000 - 5_000);
  });

  it("cancelCampBuild erstattet 100 % (Gold + Materialien über die Normalpfade), Stufe bleibt unverändert", () => {
    const s = unlockedGame();
    s.character.gold = 500;
    addItem(s.inventory, content, "oak_log", 20);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    advance(s, content, 60_000); // investierte Bauzeit verfällt ersatzlos
    expect(cancelCampBuild(s, content)).toBe(true);
    expect(s.camp.buildJob).toBeNull();
    expect(campBuildingLevel(s, CAMP_TOWNHALL_ID)).toBe(0);
    expect(s.character.gold).toBe(500);
    expect(s.stats.goldSpent).toBe(0); // Statistik zählt nur ECHTE Ausgaben
    expect(itemCount(s.inventory, "oak_log") + bankCount(s, "oak_log")).toBe(20);
    // Ohne laufenden Auftrag: false, nichts passiert.
    expect(cancelCampBuild(s, content)).toBe(false);
    expect(s.character.gold).toBe(500);
  });

  it("Debug-Sofortabschluss nutzt den regulären Abschlusszustand und ist ohne Job wirkungslos", () => {
    // codex:2026-07-31T20:21:01+02:00 — Regression für den flüchtigen UI-Debugknopf.
    const s = unlockedGame();
    fund(s, CAMP_TOWNHALL_ID, 1);
    expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
    expect(debugCompleteCampBuild(s)).toBe(true);
    expect(s.camp.buildJob).toBeNull();
    expect(campBuildingLevel(s, CAMP_TOWNHALL_ID)).toBe(1);
    expect(s.camp.buildSeq).toBe(1);
    expect(s.camp.lastCompletedBuild).toEqual({ buildingId: CAMP_TOWNHALL_ID, level: 1, seq: 1 });
    expect(debugCompleteCampBuild(s)).toBe(false);
  });
});

describe("Schreibzelt (buildSpeed, Balance-K1): wirkt multiplikativ auf NEUE Bau-Jobs", () => {
  it("Stufe III (−30 %): Wachturm I 1 h → 42 min; ohne Schreibzelt volle Bauzeit", () => {
    const s = unlockedGame();
    s.camp.buildings[CAMP_TOWNHALL_ID] = 3;
    s.camp.buildings.camp_scrivener_tent = 3;
    fund(s, "camp_watchtower", 1);
    expect(startCampBuild(s, content, "camp_watchtower")).toBe("ok");
    expect(s.camp.buildJob!.remainingMs).toBe(Math.round(3_600_000 * 0.7));
  });

  it("NICHT rückwirkend: ein laufender Job behält seinen Timer, wenn das Schreibzelt danach wächst", () => {
    const s = unlockedGame();
    s.camp.buildings[CAMP_TOWNHALL_ID] = 1;
    fund(s, "camp_watchtower", 1);
    expect(startCampBuild(s, content, "camp_watchtower")).toBe("ok");
    expect(s.camp.buildJob!.remainingMs).toBe(3_600_000);
    s.camp.buildings.camp_scrivener_tent = 3; // Ausbau „während" des Baus (direkt gesetzt)
    advance(s, content, 10_000);
    // Nur die getickten 10 s sind runter — keine nachträgliche Verkürzung.
    expect(s.camp.buildJob!.remainingMs).toBe(3_600_000 - 10_000);
  });
});

describe("Determinismus: Offline-Aufholung baut fertig und ist bit-identisch zum Live-Loop", () => {
  it("gleicher Seed, gleicher Bau: 1× großes Offline-Fenster == viele kleine Live-Ticks", () => {
    const make = () => {
      const s = unlockedGame(42);
      s.character.gold = 500;
      addItem(s.inventory, content, "oak_log", 20);
      expect(startCampBuild(s, content, CAMP_TOWNHALL_ID)).toBe("ok");
      return s;
    };
    const offline = make();
    const online = make();

    const WINDOW = 600_000 + 5_000; // Bau (10 min) endet mitten im Fenster
    advance(offline, content, WINDOW, { offline: true });
    for (let t = 0; t < WINDOW; t += 1_000) advance(online, content, 1_000);

    // Der Bau ist in BEIDEN Welten fertig — und zwar identisch.
    expect(offline.camp).toEqual(online.camp);
    expect(offline.camp.buildJob).toBeNull();
    expect(campBuildingLevel(offline, CAMP_TOWNHALL_ID)).toBe(1);
    expect(offline.camp.lastCompletedBuild).toEqual({ buildingId: CAMP_TOWNHALL_ID, level: 1, seq: 1 });
    // Bit-Identität der übrigen Sim-Flächen (RNG unangetastet — der Bautrupp würfelt nie).
    expect(offline.rng.state).toBe(online.rng.state);
    expect(offline.elapsedMs).toBe(online.elapsedMs);
    expect(offline.character.gold).toBe(online.character.gold);
    expect(offline.bank).toEqual(online.bank);
  });
});
