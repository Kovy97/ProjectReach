import { describe, expect, it } from "vitest";
import type { ContentDB, GameState } from "@hearthforge/shared";
import { TICK_MS } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import {
  availableRefineRecipes,
  campRefineProgress,
  isRefineRecipe,
  refineAccCapMs,
  refineBuildingId,
  refineKindOf,
  refineMsPerRun,
  refineRatePerHour,
  refineryLevel,
  setCampRefineRecipe,
  tickCampRefine,
} from "./refine";

/**
 * Offline-Veredelung (Schmelzofen/Räucherhaus) — Task #359, encampment-balance.md §4.
 * Deckt ab: Gebäude-/Raten-Auflösung, Rezept-Eligibility (1-Input-Basisrezepte, „beherrscht"),
 * die Rezeptwahl-Verben, die deterministische Verarbeitung inkl. sauberer Stopps, den
 * offline==online-Beweis und die vier eisernen Regeln (kein RNG / kein XP / kein Mastery /
 * kein Ertrag ohne Anlage).
 */

const SMELTER = "camp_smelter";
const SMOKEHOUSE = "camp_smokehouse";

/** Spielstand mit voll ausgebautem Schmelzofen (Stufe III = 60/h) und Smithing auf Level. */
function smelterGame(level = 3, smithingLevel = 50): GameState {
  const s = createGame({ name: "Ofen" }, content, 1);
  s.camp.buildings[SMELTER] = level;
  s.camp.buildSeq += 1; // Cache-Vertrag: direkte buildings-Mutation muss buildSeq mit anfassen
  s.skills.smithing = { xp: xpForLevel(smithingLevel) };
  return s;
}

describe("Veredelung — Gebäude- und Raten-Auflösung", () => {
  it("löst beide Anlagen KATALOG-getrieben auf (kein Hardcoding der IDs)", () => {
    expect(refineBuildingId(content, "smeltRate")).toBe(SMELTER);
    expect(refineBuildingId(content, "smokeRate")).toBe(SMOKEHOUSE);
    expect(refineKindOf(content, SMELTER)).toBe("smeltRate");
    expect(refineKindOf(content, SMOKEHOUSE)).toBe("smokeRate");
    // Jedes andere Lager-Gebäude ist KEINE Anlage.
    expect(refineKindOf(content, "camp_townhall")).toBeNull();
    expect(refineKindOf(content, "camp_sawpit")).toBeNull();
    expect(refineKindOf(content, "gibts_nicht")).toBeNull();
  });

  it("Raten 20/40/60 pro Stufe (balance.md §4) und die passenden Durchlauf-Dauern", () => {
    const s = createGame({ name: "Rate" }, content, 1);
    expect(refineRatePerHour(s, content, "smeltRate")).toBe(0); // ungebaut = ruht
    for (const [level, rate] of [[1, 20], [2, 40], [3, 60]] as const) {
      s.camp.buildings[SMELTER] = level;
      s.camp.buildSeq += 1;
      expect(refineRatePerHour(s, content, "smeltRate")).toBe(rate);
    }
    expect(refineMsPerRun(20)).toBe(180_000); // 3 min
    expect(refineMsPerRun(40)).toBe(90_000); // 1,5 min
    expect(refineMsPerRun(60)).toBe(60_000); // 1 min
    expect(refineMsPerRun(0)).toBe(Number.POSITIVE_INFINITY); // ruht
  });

  it("refineryLevel spiegelt die Ausbaustufe (0 ohne Bau)", () => {
    const s = createGame({ name: "Stufe" }, content, 1);
    expect(refineryLevel(s, content, "smeltRate")).toBe(0);
    s.camp.buildings[SMELTER] = 2;
    expect(refineryLevel(s, content, "smeltRate")).toBe(2);
  });
});

describe("Veredelung — Rezept-Eligibility (balance.md §4.1/§4.2)", () => {
  it("akzeptiert 1-Input-Schmelzrezepte, lehnt Legierungen mit 2 Zutaten ab", () => {
    expect(isRefineRecipe(content.actions.smelt_copper, "smeltRate")).toBe(true);
    expect(isRefineRecipe(content.actions.smelt_iron, "smeltRate")).toBe(true);
    // smelt_bronze braucht Kupfer UND Zinn → mehrzutatig, bleibt aktives Handwerk.
    expect(content.actions.smelt_bronze!.inputs!.length).toBeGreaterThan(1);
    expect(isRefineRecipe(content.actions.smelt_bronze, "smeltRate")).toBe(false);
  });

  it("trennt die Anlagen strikt: Kochrezepte gehören NICHT in den Schmelzofen (und umgekehrt)", () => {
    expect(isRefineRecipe(content.actions.cook_shrimp, "smokeRate")).toBe(true);
    expect(isRefineRecipe(content.actions.cook_shrimp, "smeltRate")).toBe(false);
    expect(isRefineRecipe(content.actions.smelt_copper, "smokeRate")).toBe(false);
  });

  it("lehnt Nicht-Schmelz-Smithing-Aktionen ab (Präfix-Filter) und unbekannte Aktionen", () => {
    for (const [id, action] of Object.entries(content.actions)) {
      if (action.skill !== "smithing" || id.startsWith("smelt_")) continue;
      expect(isRefineRecipe(action, "smeltRate"), id).toBe(false);
    }
    expect(isRefineRecipe(undefined, "smeltRate")).toBe(false);
  });

  it("JEDES zulässige Rezept ist deterministisch: 1 Output, chance ≥ 1, min === max, kein successBase", () => {
    let checked = 0;
    for (const action of Object.values(content.actions)) {
      for (const kind of ["smeltRate", "smokeRate"] as const) {
        if (!isRefineRecipe(action, kind)) continue;
        expect(action.loot.length, action.id).toBe(1);
        expect(action.loot[0]!.chance, action.id).toBeGreaterThanOrEqual(1);
        expect(action.loot[0]!.min, action.id).toBe(action.loot[0]!.max);
        expect(action.successBase, action.id).toBeUndefined();
        // Task #366: entweder 1 Input, ODER exakt 2 mit Kohle als einem der beiden (nie 2× Kohle,
        // nie 2 Nicht-Kohle-Zutaten — das würde eine aktive Legierung wie smelt_bronze zulassen).
        expect(action.inputs!.length, action.id).toBeGreaterThanOrEqual(1);
        expect(action.inputs!.length, action.id).toBeLessThanOrEqual(2);
        if (action.inputs!.length === 2) {
          const coalEntries = action.inputs!.filter((i) => i.itemId === "coal");
          expect(coalEntries.length, action.id).toBe(1);
        }
        checked++;
      }
    }
    expect(checked, "keine zulässigen Rezepte im Katalog gefunden").toBeGreaterThan(10);
  });

  it("Kohle als optionaler zweiter Input ist jetzt zulässig (Task #366 P1, Sim-Report §2.1: 65 000-Gold-Schmelzofen war Never-Build)", () => {
    // Vorher: false (jedes Rezept mit 2 Inputs galt pauschal als unzulässig) — der Schmelzofen
    // konnte dadurch nur smelt_copper/smelt_iron verarbeiten (2 von 14 smelt_*-Rezepten), weil ab
    // smelt_steel jede Stufe zusätzlich Kohle braucht.
    expect(isRefineRecipe(content.actions.smelt_steel, "smeltRate")).toBe(true);
    expect(content.actions.smelt_steel!.inputs).toEqual([
      { itemId: "iron_ore", qty: 1 },
      { itemId: "coal", qty: 1 },
    ]);
    expect(isRefineRecipe(content.actions.smelt_runite, "smeltRate")).toBe(true);
    expect(content.actions.smelt_runite!.inputs).toEqual([
      { itemId: "runite_ore", qty: 2 },
      { itemId: "coal", qty: 3 },
    ]);
    expect(isRefineRecipe(content.actions.smelt_titanium, "smeltRate")).toBe(true);
  });

  it("sanity: 3+ Inputs oder 2 Nicht-Kohle-Inputs bleiben unzulässig — die Kohle-Ausnahme wird NICHT zu großzügig", () => {
    const base = content.actions.smelt_iron!;
    const threeInputs = {
      ...base,
      inputs: [
        { itemId: "iron_ore", qty: 1 },
        { itemId: "coal", qty: 1 },
        { itemId: "copper_ore", qty: 1 },
      ],
    };
    expect(isRefineRecipe(threeInputs, "smeltRate")).toBe(false);

    const twoNonCoal = {
      ...base,
      inputs: [
        { itemId: "iron_ore", qty: 1 },
        { itemId: "copper_ore", qty: 1 },
      ],
    };
    expect(isRefineRecipe(twoNonCoal, "smeltRate")).toBe(false);
    // Das reale Katalog-Beispiel dafür bleibt smelt_bronze (Kupfer + Zinn, keine Kohle beteiligt).
    expect(isRefineRecipe(content.actions.smelt_bronze, "smeltRate")).toBe(false);

    const twoCoalEntries = {
      ...base,
      inputs: [
        { itemId: "coal", qty: 1 },
        { itemId: "coal", qty: 2 },
      ],
    };
    expect(isRefineRecipe(twoCoalEntries, "smeltRate")).toBe(false);

    const zeroInputs = { ...base, inputs: [] };
    expect(isRefineRecipe(zeroInputs, "smeltRate")).toBe(false);
  });

  it("„beherrschte Rezepte\": availableRefineRecipes filtert über das Skill-Level", () => {
    const low = smelterGame(3, 1);
    const high = smelterGame(3, 99);
    const lowIds = availableRefineRecipes(low, content, SMELTER).map((a) => a.id);
    const highIds = availableRefineRecipes(high, content, SMELTER).map((a) => a.id);
    expect(lowIds).toContain("smelt_copper"); // levelRequired 1
    expect(lowIds).not.toContain("smelt_iron"); // levelRequired 10
    expect(highIds).toContain("smelt_iron");
    expect(highIds.length).toBeGreaterThan(lowIds.length);
    // Nicht-Anlage ⇒ leere Liste.
    expect(availableRefineRecipes(high, content, "camp_sawpit")).toEqual([]);
  });
});

describe("Veredelung — Rezeptwahl (setCampRefineRecipe)", () => {
  it("setzt ein zulässiges Rezept und legt den Slot neutral an", () => {
    const s = smelterGame();
    expect(setCampRefineRecipe(s, content, SMELTER, "smelt_iron")).toBe("ok");
    expect(s.camp.refine[SMELTER]).toEqual({ recipeId: "smelt_iron", accMs: 0, produced: 0 });
  });

  it("lehnt in fester Reihenfolge ab: keine Anlage / nicht gebaut / unbekannt / unzulässig / nicht beherrscht", () => {
    const s = createGame({ name: "Ablehnung" }, content, 1);
    expect(setCampRefineRecipe(s, content, "camp_sawpit", "smelt_iron")).toBe("not_a_refinery");
    expect(setCampRefineRecipe(s, content, SMELTER, "smelt_copper")).toBe("not_built");
    s.camp.buildings[SMELTER] = 1;
    s.camp.buildSeq += 1;
    expect(setCampRefineRecipe(s, content, SMELTER, "gibts_nicht")).toBe("unknown_recipe");
    expect(setCampRefineRecipe(s, content, SMELTER, "smelt_bronze")).toBe("ineligible_recipe");
    expect(setCampRefineRecipe(s, content, SMELTER, "cook_shrimp")).toBe("ineligible_recipe");
    expect(setCampRefineRecipe(s, content, SMELTER, "smelt_iron")).toBe("recipe_not_known");
    // Nichts davon hat einen Slot hinterlassen.
    expect(s.camp.refine[SMELTER]).toBeUndefined();
  });

  it("Rezeptwechsel nullt accMs, erhält aber produced; dasselbe Rezept erneut ist ein No-op", () => {
    const s = smelterGame();
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
    s.camp.refine[SMELTER]!.accMs = 40_000;
    s.camp.refine[SMELTER]!.produced = 7;

    setCampRefineRecipe(s, content, SMELTER, "smelt_iron"); // identisch → Fortschritt bleibt
    expect(s.camp.refine[SMELTER]).toEqual({ recipeId: "smelt_iron", accMs: 40_000, produced: 7 });

    setCampRefineRecipe(s, content, SMELTER, "smelt_copper"); // Wechsel → accMs verfällt
    expect(s.camp.refine[SMELTER]).toEqual({ recipeId: "smelt_copper", accMs: 0, produced: 7 });
  });

  it("null löscht den Slot (Anlage ruht)", () => {
    const s = smelterGame();
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
    expect(setCampRefineRecipe(s, content, SMELTER, null)).toBe("ok");
    expect(s.camp.refine[SMELTER]).toBeUndefined();
  });
});

describe("Veredelung — Verarbeitung", () => {
  it("verarbeitet exakt Rate-viele Stücke pro Stunde (60/h auf Stufe III)", () => {
    const s = smelterGame();
    addItem(s.inventory, content, "iron_ore", 500);
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");

    tickCampRefine(s, content, 3_600_000); // exakt eine Stunde
    expect(s.camp.refine[SMELTER]!.produced).toBe(60);
    expect(itemCount(s.inventory, "iron_bar")).toBe(60);
    expect(itemCount(s.inventory, "iron_ore")).toBe(440); // 1 Erz je Barren
    expect(s.camp.refine[SMELTER]!.accMs).toBe(0);
  });

  it("Stufe I liefert 20/h, Stufe II 40/h (Balance-Anker)", () => {
    for (const [level, expected] of [[1, 20], [2, 40]] as const) {
      const s = smelterGame(level);
      addItem(s.inventory, content, "iron_ore", 500);
      setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
      tickCampRefine(s, content, 3_600_000);
      expect(s.camp.refine[SMELTER]!.produced, `Stufe ${level}`).toBe(expected);
    }
  });

  it("vergibt WEDER Skill-XP NOCH Mastery-XP NOCH Crafting-Statistik (Regel 2)", () => {
    const s = smelterGame();
    addItem(s.inventory, content, "iron_ore", 100);
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
    const xpBefore = s.skills.smithing!.xp;
    const craftedBefore = s.stats.itemsCrafted;

    tickCampRefine(s, content, 3_600_000);

    expect(s.camp.refine[SMELTER]!.produced).toBe(60); // es lief wirklich
    expect(s.skills.smithing!.xp).toBe(xpBefore);
    expect(s.mastery.smelt_iron).toBeUndefined();
    expect(s.stats.itemsCrafted).toBe(craftedBefore);
    expect(s.stats.craftedById.iron_bar).toBeUndefined();
  });

  it("zieht KEINEN RNG (Regel 1): der RNG-Zustand ist vor und nach der Verarbeitung identisch", () => {
    const s = smelterGame();
    addItem(s.inventory, content, "iron_ore", 500);
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
    const rngBefore = { ...s.rng };
    const eliteRngBefore = { ...s.eliteRng };

    tickCampRefine(s, content, 8 * 3_600_000);

    expect(s.rng).toEqual(rngBefore);
    expect(s.eliteRng).toEqual(eliteRngBefore);
  });

  it("nimmt Input Inventar-ZUERST, dann aus der Bank (Craft-Semantik)", () => {
    const s = smelterGame();
    addItem(s.inventory, content, "iron_ore", 10);
    s.bank.iron_ore = 100;
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");

    tickCampRefine(s, content, 3_600_000); // 60 Durchläufe: 10 aus dem Inventar, 50 aus der Bank
    expect(itemCount(s.inventory, "iron_ore")).toBe(0);
    expect(s.bank.iron_ore).toBe(50);
    expect(s.camp.refine[SMELTER]!.produced).toBe(60);
  });

  it("stoppt SAUBER bei leerem Input — Rest-Zeit bleibt auf genau EINEM Durchlauf stehen", () => {
    const s = smelterGame();
    addItem(s.inventory, content, "iron_ore", 5);
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");

    tickCampRefine(s, content, 3_600_000); // Zeit für 60, Material für 5
    const slot = s.camp.refine[SMELTER]!;
    expect(slot.produced).toBe(5);
    expect(itemCount(s.inventory, "iron_bar")).toBe(5);
    expect(slot.accMs).toBe(refineMsPerRun(60)); // genau ein aufgeladener Durchlauf, nicht mehr

    // Nachfüllen ⇒ der aufgeladene Durchlauf löst sofort aus, aber NUR dieser eine.
    addItem(s.inventory, content, "iron_ore", 10);
    tickCampRefine(s, content, 1);
    expect(s.camp.refine[SMELTER]!.produced).toBe(6);
  });

  it("Kohle-Rezept (Task #366): EIN voller Lauf verbraucht BEIDE Zutaten in exakter Rezept-Menge (smelt_runite 2 Erz + 3 Kohle je Durchlauf)", () => {
    const s = smelterGame(3, 60); // Smithing 60 ≥ smelt_runite levelRequired 55
    addItem(s.inventory, content, "runite_ore", 10); // exakt 5 Durchläufe × 2
    addItem(s.inventory, content, "coal", 15); // exakt 5 Durchläufe × 3
    setCampRefineRecipe(s, content, SMELTER, "smelt_runite");

    tickCampRefine(s, content, 5 * refineMsPerRun(60)); // Zeit für exakt 5 Durchläufe
    const slot = s.camp.refine[SMELTER]!;
    expect(slot.produced).toBe(5);
    expect(itemCount(s.inventory, "runite_bar")).toBe(5);
    expect(itemCount(s.inventory, "runite_ore")).toBe(0); // 5 × 2 vollständig verbraucht
    expect(itemCount(s.inventory, "coal")).toBe(0); // 5 × 3 vollständig verbraucht
    expect(slot.accMs).toBe(0);
  });

  it("Kohle-Rezept (Task #366): stoppt SAUBER, wenn NUR die Kohle ausgeht — das reichlich vorhandene Erz bleibt UNANGETASTET", () => {
    const s = smelterGame(3, 60);
    addItem(s.inventory, content, "runite_ore", 1000); // Erz bleibt die ganze Zeit reichlich
    addItem(s.inventory, content, "coal", 9); // reicht für exakt 3 Durchläufe (coal × 3)
    setCampRefineRecipe(s, content, SMELTER, "smelt_runite");

    tickCampRefine(s, content, 3_600_000); // Zeit für 60 Durchläufe, Kohle nur für 3
    const slot = s.camp.refine[SMELTER]!;
    expect(slot.produced).toBe(3);
    expect(itemCount(s.inventory, "runite_bar")).toBe(3);
    // NUR die 3 tatsächlich abgeschlossenen Durchläufe verbrauchten Erz — kein Teil-Abzug ohne Kohle.
    expect(itemCount(s.inventory, "runite_ore")).toBe(1000 - 3 * 2);
    expect(itemCount(s.inventory, "coal")).toBe(0);
    expect(slot.accMs).toBe(refineMsPerRun(60)); // genau ein aufgeladener Durchlauf, nicht mehr

    // Kohle nachfüllen ⇒ der aufgeladene Durchlauf löst sofort aus und verbraucht BEIDE Zutaten.
    addItem(s.inventory, content, "coal", 3);
    tickCampRefine(s, content, 1);
    expect(s.camp.refine[SMELTER]!.produced).toBe(4);
    expect(itemCount(s.inventory, "runite_ore")).toBe(1000 - 4 * 2);
    expect(itemCount(s.inventory, "coal")).toBe(0);
  });

  it("Kohle-Rezept (Task #366): von Anfang an KEINE Kohle im Bestand ⇒ Anlage ruht sauber, kein Crash", () => {
    const s = smelterGame(3, 60);
    addItem(s.inventory, content, "runite_ore", 1000);
    setCampRefineRecipe(s, content, SMELTER, "smelt_runite");

    expect(() => tickCampRefine(s, content, 3_600_000)).not.toThrow();
    const slot = s.camp.refine[SMELTER]!;
    expect(slot.produced).toBe(0);
    expect(itemCount(s.inventory, "runite_ore")).toBe(1000); // unangetastet
    expect(itemCount(s.inventory, "runite_bar")).toBe(0);
    expect(slot.accMs).toBe(refineMsPerRun(60)); // verlustfreie Klemme, genau wie beim Erz-Mangel
  });

  it("stoppt SAUBER bei vollem Ziel (Inventar voll, Auto-Bank aus) und verbraucht kein Material", () => {
    const s = smelterGame();
    s.settings.autoBank = false;
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
    s.bank.iron_ore = 100;
    // Inventar mit lauter FREMDEN Arten komplett füllen (kein iron_bar-Stack mit Luft).
    const fillers = Object.keys(content.items).filter((id) => id !== "iron_bar" && id !== "iron_ore");
    for (let i = 0; i < s.inventory.slots.length; i++) {
      addItem(s.inventory, content, fillers[i]!, 1);
    }
    expect(s.inventory.slots.every((sl) => sl !== null)).toBe(true);

    tickCampRefine(s, content, 3_600_000);
    expect(s.camp.refine[SMELTER]!.produced).toBe(0);
    expect(s.bank.iron_ore).toBe(100); // Material unangetastet
    expect(s.mailbox.length).toBe(0); // KEIN Postfach-Spam
  });

  it("ruht ohne gewähltes Rezept und ohne gebaute Anlage (Regel 4)", () => {
    const noRecipe = smelterGame();
    addItem(noRecipe.inventory, content, "iron_ore", 100);
    tickCampRefine(noRecipe, content, 3_600_000);
    expect(itemCount(noRecipe.inventory, "iron_ore")).toBe(100);

    const notBuilt = createGame({ name: "Ungebaut" }, content, 1);
    notBuilt.skills.smithing = { xp: xpForLevel(50) };
    addItem(notBuilt.inventory, content, "iron_ore", 100);
    // Slot per Hand setzen (die Verben würden „not_built" liefern) — die Verarbeitung muss trotzdem ruhen.
    notBuilt.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 0, produced: 0 };
    tickCampRefine(notBuilt, content, 3_600_000);
    expect(notBuilt.camp.refine[SMELTER]!.produced).toBe(0);
    expect(itemCount(notBuilt.inventory, "iron_ore")).toBe(100);
  });

  it("ruht still bei Content-Drift (Rezept aus dem Katalog verschwunden)", () => {
    const s = smelterGame();
    addItem(s.inventory, content, "iron_ore", 100);
    s.camp.refine[SMELTER] = { recipeId: "weg_damit", accMs: 0, produced: 0 };
    expect(() => tickCampRefine(s, content, 3_600_000)).not.toThrow();
    expect(s.camp.refine[SMELTER]!.produced).toBe(0);
  });

  it("beide Anlagen laufen unabhängig nebeneinander", () => {
    const s = smelterGame();
    s.camp.buildings[SMOKEHOUSE] = 3;
    s.camp.buildSeq += 1;
    s.skills.cooking = { xp: xpForLevel(50) };
    addItem(s.inventory, content, "iron_ore", 100);
    addItem(s.inventory, content, "raw_shrimp", 100);
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
    setCampRefineRecipe(s, content, SMOKEHOUSE, "cook_shrimp");

    tickCampRefine(s, content, 3_600_000);
    expect(itemCount(s.inventory, "iron_bar")).toBe(60);
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(60);
  });

  it("campRefineProgress spiegelt den laufenden Durchlauf (0..1)", () => {
    const s = smelterGame();
    addItem(s.inventory, content, "iron_ore", 100);
    setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
    expect(campRefineProgress(s, content, SMELTER)).toBe(0);
    tickCampRefine(s, content, 30_000); // halbe Durchlauf-Dauer (60 000 ms)
    expect(campRefineProgress(s, content, SMELTER)).toBeCloseTo(0.5, 10);
    expect(campRefineProgress(s, content, "camp_sawpit")).toBe(0);
  });
});

describe("Veredelung — offline == online (Determinismus-Gesetz)", () => {
  it("EIN 8-h-Sprung liefert exakt dasselbe wie 288 000 Einzel-Ticks", () => {
    const build = (): GameState => {
      const s = smelterGame();
      addItem(s.inventory, content, "iron_ore", 1000);
      setCampRefineRecipe(s, content, SMELTER, "smelt_iron");
      return s;
    };
    const bulk = build();
    const stepwise = build();

    tickCampRefine(bulk, content, 8 * 3_600_000);
    for (let i = 0; i < (8 * 3_600_000) / TICK_MS; i++) tickCampRefine(stepwise, content, TICK_MS);

    expect(bulk.camp.refine[SMELTER]).toEqual(stepwise.camp.refine[SMELTER]);
    expect(itemCount(bulk.inventory, "iron_bar")).toBe(itemCount(stepwise.inventory, "iron_bar"));
    expect(itemCount(bulk.inventory, "iron_ore")).toBe(itemCount(stepwise.inventory, "iron_ore"));
    expect(bulk.camp.refine[SMELTER]!.produced).toBe(480); // 8 h × 60/h
  });

  it("läuft über den echten advance-Pfad (tick.ts steps>0-Block), live wie offline", () => {
    const live = smelterGame();
    addItem(live.inventory, content, "iron_ore", 500);
    setCampRefineRecipe(live, content, SMELTER, "smelt_iron");
    const offline = smelterGame();
    addItem(offline.inventory, content, "iron_ore", 500);
    setCampRefineRecipe(offline, content, SMELTER, "smelt_iron");

    // Live: 3600 advance-Aufrufe à 1 s. Offline: EIN Aufruf über die volle Stunde.
    for (let i = 0; i < 3600; i++) advance(live, content, 1000);
    advance(offline, content, 3_600_000, { offline: true });

    expect(live.camp.refine[SMELTER]!.produced).toBe(60);
    expect(offline.camp.refine[SMELTER]!.produced).toBe(60);
    expect(itemCount(live.inventory, "iron_bar")).toBe(itemCount(offline.inventory, "iron_bar"));
  });

  it("ohne Lager ist advance() für die Veredelung ein vollständiger No-op", () => {
    const s = createGame({ name: "Ohne" }, content, 1);
    addItem(s.inventory, content, "iron_ore", 100);
    advance(s, content, 8 * 3_600_000, { offline: true });
    expect(s.camp.refine).toEqual({});
    expect(itemCount(s.inventory, "iron_ore")).toBe(100);
    expect(itemCount(s.inventory, "iron_bar")).toBe(0);
  });

  it("Content ohne campBuildings-Katalog: komplett inert", () => {
    const bare = { ...content, campBuildings: undefined } as ContentDB;
    const s = smelterGame();
    addItem(s.inventory, content, "iron_ore", 100);
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 0, produced: 0 };
    tickCampRefine(s, bare, 3_600_000);
    expect(s.camp.refine[SMELTER]!.produced).toBe(0);
  });
});

/**
 * Task #364 Fix 2 (Audit #363 „Veredelungs-Fortschritt geht beim Laden verloren"): die Klemme,
 * die persistence-Sanitize auf einen geladenen `accMs` anwendet, muss an der TATSÄCHLICHEN Stufe
 * des Slots hängen — nicht an der Bestmarke des Katalogs.
 */
describe("Veredelung — Akkumulator-Obergrenze je Ausbaustufe (refineAccCapMs)", () => {
  it("liefert exakt msPerRun der gebauten Stufe (I 180 000 / II 90 000 / III 60 000 ms)", () => {
    const s = createGame({ name: "Klemme" }, content, 1);
    for (const [level, expected] of [[1, 180_000], [2, 90_000], [3, 60_000]] as const) {
      s.camp.buildings[SMELTER] = level;
      s.camp.buildSeq += 1;
      expect(refineAccCapMs(s.camp, content, "smeltRate"), `Stufe ${level}`).toBe(expected);
      // Gegenprobe: exakt die Dauer, die die Verarbeitung selbst benutzt.
      expect(refineAccCapMs(s.camp, content, "smeltRate")).toBe(
        refineMsPerRun(refineRatePerHour(s, content, "smeltRate")),
      );
    }
  });

  it("deckt den vollen Aufladezustand ab, den die Engine selbst erzeugt (Stufe I)", () => {
    // tickOneRefinery klemmt verlustfrei auf EINEN Durchlauf — bei Stufe I sind das 180 000 ms.
    const s = smelterGame(1);
    s.camp.refine[SMELTER] = { recipeId: "smelt_iron", accMs: 0, produced: 0 };
    tickCampRefine(s, content, 8 * 3_600_000); // ohne Erz: nichts läuft, der Akku lädt sich auf
    expect(s.camp.refine[SMELTER]!.produced).toBe(0);
    expect(s.camp.refine[SMELTER]!.accMs).toBe(180_000);
    expect(s.camp.refine[SMELTER]!.accMs).toBeLessThanOrEqual(refineAccCapMs(s.camp, content, "smeltRate"));
  });

  it("ungebaute Anlage: endliche, GROSSZÜGIGE Klemme (längste je legitime Dauer), nie Infinity", () => {
    const s = createGame({ name: "Ungebaut" }, content, 1);
    const cap = refineAccCapMs(s.camp, content, "smeltRate");
    expect(Number.isFinite(cap)).toBe(true);
    expect(cap).toBe(180_000); // Stufe-I-Dauer = die langsamste Rate des Katalogs
  });

  it("ohne campBuildings-Katalog: endlicher Rückfall (eine Stunde)", () => {
    const bare = { ...content, campBuildings: undefined } as ContentDB;
    const s = createGame({ name: "Leer" }, content, 1);
    expect(refineAccCapMs(s.camp, bare, "smeltRate")).toBe(3_600_000);
    expect(refineAccCapMs(null, content, "smokeRate")).toBe(180_000);
  });
});
