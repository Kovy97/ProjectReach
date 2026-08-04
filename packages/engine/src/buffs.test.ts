import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { applyConsumableBuff, buffGatherXpMult, buffGatherYieldBonus, useConsumable } from "./consumable";
import { startCombat, combatStep } from "./combat";
import { advance } from "./tick";
import { setActiveAction } from "./actions";
import { addItem, itemCount } from "./inventory";
import type { ContentDB, GameState } from "@hearthforge/shared";

describe("buffs", () => {
  it("aktiviert einen Buff, der Werte erhöht und nach Ablauf verschwindet", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    // Consumables-Enchantments-Fix (#219, Glyphen entfernt): früher glyph_of_warding, jetzt
    // nightshade_extract (reiner buff.bonus.maxHp, 90s Dauer) als lebendes Fixture-Item.
    // Task #238 (Trank-Impact-Pass): maxHp 1→12 — Test prüft nur relative Werte, kein Magic-Number-Fix nötig.
    const before = computeStats(s, content).maxHp;

    addItem(s.inventory, content, "nightshade_extract", 1);
    expect(useConsumable(s, content, "nightshade_extract")).toBe(true);
    expect(s.character.buffs.length).toBe(1);
    expect(computeStats(s, content).maxHp).toBeGreaterThan(before);

    advance(s, content, 301_000); // > 90 s Dauer
    expect(s.character.buffs.length).toBe(0);
    expect(computeStats(s, content).maxHp).toBe(before);
  });

  it("heilt sofort beim Benutzen eines Heiltranks", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    s.character.hp = 1;
    addItem(s.inventory, content, "minor_healing_potion", 1);
    expect(useConsumable(s, content, "minor_healing_potion")).toBe(true);
    expect(s.character.hp).toBeGreaterThan(1);
  });

  it("erneuert die Dauer beim erneuten Benutzen statt zu stapeln", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    // Consumables-Enchantments-Fix (#219, Glyphen entfernt): früher glyph_of_might, jetzt
    // tonic_oxblood (lebendes Tempo-Buff-Fixture-Item) — der Mechanik-Test prüft nur Nicht-Stapeln.
    addItem(s.inventory, content, "tonic_oxblood", 2);
    useConsumable(s, content, "tonic_oxblood");
    useConsumable(s, content, "tonic_oxblood");
    expect(s.character.buffs.length).toBe(1);
  });

  it("kappt HP auf das Maximum, wenn ein +HP-Buff abläuft (kein dauerhafter Overheal)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    const baseMax = computeStats(s, content).maxHp;

    // Consumables-Enchantments-Fix (#219, Glyphen entfernt): früher glyph_of_warding, jetzt
    // nightshade_extract (reiner buff.bonus.maxHp, 90s Dauer) als lebendes Fixture-Item.
    // Task #238 (Trank-Impact-Pass): maxHp 1→12.
    addItem(s.inventory, content, "nightshade_extract", 1);
    useConsumable(s, content, "nightshade_extract"); // +12 maxHp
    const buffedMax = computeStats(s, content).maxHp;
    expect(buffedMax).toBeCloseTo(baseMax + 12, 6);
    s.character.hp = buffedMax; // voll während des Buffs

    advance(s, content, 301_000); // Buff läuft ab
    expect(s.character.buffs.length).toBe(0);
    expect(s.character.hp).toBeLessThanOrEqual(baseMax);
  });

  it("buffGatherXpMult multipliziert aktive Sammel-Tonika (Produkt), buffGatherYieldBonus addiert", () => {
    const fake = {
      items: {
        t_xp_a: { type: "consumable", buff: { durationMs: 1000, bonus: { gatherXpMult: 1.1 } } },
        t_xp_b: { type: "consumable", buff: { durationMs: 1000, bonus: { gatherXpMult: 1.05 } } },
        t_yield: { type: "consumable", buff: { durationMs: 1000, bonus: { gatherYieldMult: 0.1 } } },
      },
    } as unknown as ContentDB;
    const s = {
      character: { buffs: [{ itemId: "t_xp_a", remainingMs: 1 }, { itemId: "t_xp_b", remainingMs: 1 }] },
    } as unknown as GameState;
    expect(buffGatherXpMult(s, fake)).toBeCloseTo(1.155, 6);
    expect(buffGatherYieldBonus(s, fake)).toBe(0);
    s.character.buffs.push({ itemId: "t_yield", remainingMs: 1 });
    expect(buffGatherYieldBonus(s, fake)).toBeCloseTo(0.1, 6);
    // Ohne aktive Buffs: neutraler Faktor 1 / Bonus 0 (bit-identisch zu vorher).
    const empty = { character: { buffs: [] } } as unknown as GameState;
    expect(buffGatherXpMult(empty, fake)).toBe(1);
    expect(buffGatherYieldBonus(empty, fake)).toBe(0);
  });

  it("Guard: reale gatherXpMult-Tonika sind Multiplikatoren ≥ 1 (Inversions-Schutz)", () => {
    // Sweep 4 (P1-Regression-Guard): die Sammel-Tonika werden bewusst als DIREKTE Multiplikatoren
    // geführt (1.05+ = +5 %). `buffGatherXpMult` multipliziert diese auf die Gather-Skill-XP. Ein
    // Wert < 1 würde die XP SENKEN (die alte Inversion). Dieser Guard hält gebuffte Gather-XP ≥ Basis
    // für JEDES reale Tonikum — schlägt an, falls Content je wieder auf Additiv-/Sub-1-Werte kippt.
    const tonics = Object.values(content.items).filter(
      (it) => it.type === "consumable" && it.buff?.bonus?.gatherXpMult !== undefined,
    );
    expect(tonics.length, "keine realen gatherXpMult-Tonika gefunden — Guard wäre leer").toBeGreaterThan(0);
    for (const t of tonics) {
      const mult = t.buff!.bonus!.gatherXpMult!;
      expect(mult, `${t.id}: gatherXpMult ${mult} < 1 wäre eine XP-Inversion`).toBeGreaterThanOrEqual(1);
      // Aggregierter Reader über genau dieses aktive Tonikum: Faktor ≥ 1 ⇒ gebuffte Gather-XP ≥ Basis.
      const s = { character: { buffs: [{ itemId: t.id, remainingMs: 1 }] } } as unknown as GameState;
      expect(buffGatherXpMult(s, content)).toBeGreaterThanOrEqual(1);
    }
  });

  it("ein aktiver gatherXpMult-Buff erhöht die im Skilling-Tick gewährte Skill-XP", () => {
    // Eine echte Sammel-Aktion (keine Inputs, kein Erfolgswurf) deterministisch wählen.
    const gather = Object.values(content.actions).find(
      (a) => !a.inputs?.length && a.successBase === undefined && (a.levelRequired ?? 1) <= 1 && a.xp > 0,
    );
    expect(gather).toBeTruthy();
    const actionId = gather!.id;

    const run = (withBuff: boolean): number => {
      const s = createTestGame({ name: "G" }, content, 7);
      setActiveAction(s, content, actionId);
      if (withBuff) {
        // Temporär ein Tonikum mit gatherXpMult ins Content injizieren + als Buff aktivieren.
        (content.items as Record<string, unknown>).__test_tonic__ = {
          type: "consumable",
          buff: { durationMs: 600_000, bonus: { gatherXpMult: 2 } },
        };
        s.character.buffs.push({ itemId: "__test_tonic__", remainingMs: 600_000 });
      }
      advance(s, content, 120_000);
      return s.skills[gather!.skill]?.xp ?? 0;
    };

    const base = run(false);
    const buffed = run(true);
    delete (content.items as Record<string, unknown>).__test_tonic__;

    expect(base).toBeGreaterThan(0);
    // Skill-XP skaliert exakt mit dem Multiplikator (×2); Mastery-XP bleibt unberührt.
    expect(buffed).toBeCloseTo(base * 2, 6);
  });

  it("Combo-Food heilt SOFORT UND registriert den Buff in einem Verzehr", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    s.character.hp = 1;
    (content.items as Record<string, unknown>).__test_combo__ = {
      id: "__test_combo__",
      type: "consumable",
      stackable: true,
      healAmount: 20,
      // maxHp statt defense: seit Itemization 2.5 speist ein Buff-bonus.defense keine Mitigation mehr
      // (armor-trinity-spec §1.1) — maxHp ist ein Buff-Wert, der weiter greift und den Effekt beweist.
      buff: { durationMs: 60_000, bonus: { maxHp: 5 } },
    };
    const beforeMaxHp = computeStats(s, content).maxHp;
    addItem(s.inventory, content, "__test_combo__", 1);

    expect(useConsumable(s, content, "__test_combo__")).toBe(true);
    // Buff-Effekt messen, SOLANGE das injizierte Item noch existiert (danach findet computeStats
    // die bonus-Quelle nicht mehr) — dann erst aus dem Content entfernen.
    const buffedMaxHp = computeStats(s, content).maxHp;
    delete (content.items as Record<string, unknown>).__test_combo__;

    // BEIDES: sofort geheilt UND Buff aktiv (vorher galt: Buff hätte die Heilung verdrängt).
    expect(s.character.hp).toBeGreaterThan(1);
    expect(s.character.buffs.length).toBe(1);
    expect(buffedMaxHp).toBeGreaterThan(beforeMaxHp); // +5 maxHp-Buff greift
  });

  it("hpRegenPerSec regeneriert HP über die Zeit im Idle-Tick (Guard: Feld wird angewandt)", () => {
    // Referenz: reiner Basis-Regen ohne Buff über 10 Ticks.
    const baseRun = createTestGame({ name: "X" }, content, 1);
    baseRun.character.hp = 1;
    advance(baseRun, content, 1000);
    const baseHp = baseRun.character.hp;

    const s = createTestGame({ name: "X" }, content, 1);
    s.character.hp = 1;
    (content.items as Record<string, unknown>).__test_regen__ = {
      id: "__test_regen__",
      type: "consumable",
      stackable: true,
      buff: { durationMs: 600_000, bonus: { hpRegenPerSec: 20 } },
    };
    s.character.buffs.push({ itemId: "__test_regen__", remainingMs: 600_000 });
    advance(s, content, 1000);
    delete (content.items as Record<string, unknown>).__test_regen__;

    // Buff-Regen kommt ZUSÄTZLICH zum Basis-Regen → spürbar mehr HP, gedeckelt aufs Maximum.
    expect(s.character.hp).toBeGreaterThan(baseHp);
    expect(s.character.hp).toBeLessThanOrEqual(computeStats(s, content).maxHp);
  });

  it("Offline-Catch-up == Live-Chunks: Regen-Buff, der im Fenster abläuft, heilt bit-identisch (Sweep6 T7-F2)", () => {
    // Regression: der Idle-Regen lief früher 1× pro advance NACH der Tick-Schleife mit den
    // END-Stats — ein Regen-Buff, der im Offline-Fenster ablief, war darin nicht mehr enthalten
    // und brachte im One-Shot-Catch-up 0 Heilung (live gechunkt heilte er voll). Seit dem Fix
    // tickt der Regen PRO TICK (tickPlayerRegen in step) → beide Pfade sind bit-identisch.
    (content.items as Record<string, unknown>).__test_regen__ = {
      id: "__test_regen__",
      type: "consumable",
      stackable: true,
      buff: { durationMs: 600_000, bonus: { hpRegenPerSec: 0.3 } },
    };
    const mk = () => {
      const s = createTestGame({ name: "R" }, content, 11);
      s.character.hp = 1;
      s.character.buffs.push({ itemId: "__test_regen__", remainingMs: 12_000 }); // läuft nach 12 s ab
      return s;
    };
    const oneShot = mk();
    advance(oneShot, content, 20_000, { offline: true }); // Load-Pfad: EIN advance über 20 s

    const chunked = mk();
    for (let i = 0; i < 200; i++) advance(chunked, content, 100); // Live-Loop: 200 × 1 Tick

    delete (content.items as Record<string, unknown>).__test_regen__;

    // Der Buff heilt seine Laufzeit à 0.3 HP/s — auch im One-Shot (früher: +0). 119 statt 120
    // Regen-Ticks: tickBuffs läuft am Tick-ANFANG und entfernt den Buff im Ablauf-Tick, bevor der
    // Regen dieses Ticks rechnet (identisch zum Live-Verhalten, daher weiterhin bit-gleich).
    // Seit dem Out-of-Combat-Regen (1 % Max-HP/s, 2026-07-13) heilt idle zusätzlich der
    // Idle-Regen mit — deshalb 20-s-Fenster (statt 60 s): bei maxHp 11 bliebe sonst nichts
    // unter dem Deckel und der Buff-Anteil wäre nicht mehr messbar.
    const maxHp = computeStats(oneShot, content).maxHp;
    const idleHeal = maxHp * 0.01 * 0.1 * 200; // 200 Ticks à 100 ms Idle-Regen
    expect(1 + 0.3 * 11.9 + idleHeal).toBeLessThan(maxHp); // Vorbedingung: Deckel greift nicht
    expect(oneShot.character.hp).toBeCloseTo(1 + 0.3 * 11.9 + idleHeal, 7);
    expect(oneShot.character.hp).toBe(chunked.character.hp); // bit-identisch offline == online
  });

  it("hpRegenPerSec regeneriert HP auch im Kampf-Tick (Guard: Feld wird angewandt)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    (content.items as Record<string, unknown>).__test_regen__ = {
      id: "__test_regen__",
      type: "consumable",
      stackable: true,
      buff: { durationMs: 600_000, bonus: { hpRegenPerSec: 10 } },
    };
    s.character.buffs.push({ itemId: "__test_regen__", remainingMs: 600_000 });
    startCombat(s, content, "goblin");
    const max = computeStats(s, content).maxHp;
    s.character.hp = 5;
    // Timer so setzen, dass in diesem Tick weder Spieler noch Gegner zuschlägt (Regen isoliert).
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = 0;
    const before = s.character.hp;

    combatStep(s, content);
    delete (content.items as Record<string, unknown>).__test_regen__;

    // 10 HP/s × 0,1 s = +1 HP pro Tick, nie über das Maximum.
    expect(s.character.hp).toBeGreaterThan(before);
    expect(s.character.hp).toBeLessThanOrEqual(max);
  });
});

/**
 * Buff-Kategorien mit Verdrängung (red-team 2026-07-09 L3, Task #303): pro `buff.category` ist
 * max. EIN Buff aktiv — ein neuer verdrängt den alten derselben Kategorie; dasselbe Item erneut
 * ist ein reiner Dauer-Refresh; Buffs OHNE Kategorie (HoT-Heiltränke) stapeln wie bisher frei.
 * Alle Tests laufen gegen ECHTE Content-Items (Kategorie-Tags aus dem Katalog, kein Injection).
 */
describe("Buff-Kategorien / Verdrängung (#303 L3)", () => {
  it("zwei Tonika DERSELBEN Kategorie: der zweite verdrängt den ersten (ersetzt, nicht addiert)", () => {
    // tonic_warpath + tonic_apex sind beide category "offense".
    expect(content.items.tonic_warpath?.buff?.category).toBe("offense");
    expect(content.items.tonic_apex?.buff?.category).toBe("offense");
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "tonic_warpath", 1);
    addItem(s.inventory, content, "tonic_apex", 1);

    expect(useConsumable(s, content, "tonic_warpath")).toBe(true);
    expect(s.character.buffs.map((b) => b.itemId)).toEqual(["tonic_warpath"]);
    expect(useConsumable(s, content, "tonic_apex")).toBe(true);
    // Nur der zweite ist aktiv — kein Additiv-Stack mehr (vor #303: beide, Σ −1250 ms).
    expect(s.character.buffs.map((b) => b.itemId)).toEqual(["tonic_apex"]);
  });

  it("Tonika VERSCHIEDENER Kategorien stapeln weiter (offense + defense + regeneration + food)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    for (const id of ["tonic_warpath", "tonic_stoneskin", "panacea_elixir", "soulfire_banquet"]) {
      addItem(s.inventory, content, id, 1);
      expect(useConsumable(s, content, id), id).toBe(true);
    }
    expect(s.character.buffs.map((b) => b.itemId).sort()).toEqual(
      ["panacea_elixir", "soulfire_banquet", "tonic_stoneskin", "tonic_warpath"].sort(),
    );
  });

  it("dasselbe Item erneut = Dauer-Refresh (kein Verdrängen, kein Stapeln)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "tonic_warpath", 2);
    useConsumable(s, content, "tonic_warpath");
    s.character.buffs[0]!.remainingMs = 1000; // fast abgelaufen
    useConsumable(s, content, "tonic_warpath");
    expect(s.character.buffs).toHaveLength(1);
    expect(s.character.buffs[0]!.remainingMs).toBe(content.items.tonic_warpath!.buff!.durationMs);
  });

  it("kategorielose Buffs (HoT-Heiltränke) stapeln wie bisher frei und werden nicht verdrängt", () => {
    // Dokumentierter Alt-/Sonderfall: die 2–4-s-HoTs sind Heil-Mechanik, keine Dauer-Buffs.
    expect(content.items.minor_healing_potion?.buff?.category).toBeUndefined();
    expect(content.items.greater_healing_potion?.buff?.category).toBeUndefined();
    expect(content.items.bloodmend_draught?.buff?.category).toBeUndefined();
    const s = createTestGame({ name: "X" }, content, 1);
    for (const id of ["minor_healing_potion", "greater_healing_potion", "bloodmend_draught"]) {
      addItem(s.inventory, content, id, 1);
      expect(useConsumable(s, content, id), id).toBe(true);
    }
    expect(s.character.buffs).toHaveLength(3); // stapeln frei
    // Ein kategorisiertes Tonikum räumt NUR seine Kategorie — die kategorielosen bleiben stehen.
    addItem(s.inventory, content, "panacea_elixir", 1);
    useConsumable(s, content, "panacea_elixir");
    expect(s.character.buffs).toHaveLength(4);
  });

  it("Alt-Save-Duldung: gestapelte Buffs derselben Kategorie bleiben aktiv, bis ein neuer Apply die Kategorie räumt", () => {
    // Alt-Save-Zustand (vor #303 legal): 3 offense-Buffs gleichzeitig — direkt in den State gelegt,
    // wie ihn deserialize liefern würde. KEINE Säuberung beim Laden/Ticken: alle laufen natürlich.
    const s = createTestGame({ name: "X" }, content, 1);
    s.character.buffs.push(
      { itemId: "tonic_warpath", remainingMs: 60_000 },
      { itemId: "tonic_apex", remainingMs: 60_000 },
      { itemId: "godsbreath_elixir", remainingMs: 60_000 },
    );
    advance(s, content, 1000); // ticken ohne Säuberung
    expect(s.character.buffs).toHaveLength(3);
    // Erst ein NEUER kategorisierter Apply räumt die gesamte Kategorie (alle drei sind offense).
    applyConsumableBuff(s, content, "slayer_war_brew");
    expect(s.character.buffs.map((b) => b.itemId)).toEqual(["slayer_war_brew"]);
  });

  it("Auto-Rebuff respektiert die Verdrängung: kein Nachtrinken, solange ein ANDERER Buff der Kategorie aktiv ist", () => {
    // Alt-Save-Übergangsfall: zwei offense-Buffs, der eine läuft im Fenster ab. Ohne den Guard
    // würde der Rebuff den noch aktiven zweiten Buff verdrängen (Trank verbrannt, Kategorie-
    // Ping-Pong). Erwartung: warpath wird NICHT nachgetrunken (apex hält den Slot), Bestand bleibt.
    const s = createTestGame({ name: "X" }, content, 1);
    // codex:2026-08-02T16:20:00+02:00 — Verhalten nach gekauftem Auto-Buff testen.
    s.character.autoPotion.autoRebuffUnlocked = true;
    s.character.autoPotion.autoRebuffTonics = true;
    addItem(s.inventory, content, "tonic_warpath", 5);
    s.character.buffs.push(
      { itemId: "tonic_warpath", remainingMs: 500 }, // läuft gleich ab
      { itemId: "tonic_apex", remainingMs: 600_000 },
    );
    advance(s, content, 2000);
    expect(s.character.buffs.map((b) => b.itemId)).toEqual(["tonic_apex"]);
    expect(itemCount(s.inventory, "tonic_warpath")).toBe(5); // nichts verbrannt

    // Steady-State danach: ist die Kategorie frei, rebufft dasselbe Tonikum normal weiter.
    const s2 = createTestGame({ name: "X" }, content, 1);
    s2.character.autoPotion.autoRebuffUnlocked = true;
    s2.character.autoPotion.autoRebuffTonics = true;
    addItem(s2.inventory, content, "tonic_warpath", 5);
    s2.character.buffs.push({ itemId: "tonic_warpath", remainingMs: 500 });
    advance(s2, content, 2000);
    expect(s2.character.buffs.map((b) => b.itemId)).toEqual(["tonic_warpath"]);
    expect(itemCount(s2.inventory, "tonic_warpath")).toBe(4); // genau 1 nachgetrunken, kein Flackern
  });

  it("Auto-Rebuff trinkt kategorielose Heil-HoTs NICHT nach (Spieler-Report 2026-07-22: Endlos-Tränke bei 100% HP)", () => {
    // HoT-Draughts (bloodmend_draught: 4-s-HoT, BEWUSST ohne buff.category) sind Heil-Mechanik,
    // keine Dauer-Tonika. Vor dem Fix rebuffte tickBuffs sie bei JEDEM Ablauf ohne HP-Prüfung:
    // ein Schluck unter der Schwelle genügte, und der Spieler verbrannte danach bei vollen HP
    // endlos alle paar Sekunden einen Trank. Erwartung jetzt: Ablauf ohne Nachtrinken; Heil-
    // Nachschub ist allein Sache von tryAutoPotion (Schwelle + Cooldown + HoT-Guard).
    const s = createTestGame({ name: "X" }, content, 1);
    s.character.autoPotion.autoRebuffUnlocked = true;
    s.character.autoPotion.autoRebuffTonics = true;
    addItem(s.inventory, content, "bloodmend_draught", 5);
    s.character.buffs.push({ itemId: "bloodmend_draught", remainingMs: 500 }); // läuft gleich ab
    advance(s, content, 10_000); // reichlich Fenster: jede Kette hätte hier mehrfach nachgetrunken
    expect(s.character.buffs).toHaveLength(0); // abgelaufen, NICHT erneuert
    expect(itemCount(s.inventory, "bloodmend_draught")).toBe(5); // kein einziger Trank verbrannt
  });
});
