import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { advance } from "./tick";
import { startDungeon, canEnterDungeon, isDungeonUnlocked } from "./dungeon";
import { addItem, addItemOrBank, expandBaseCapacity, itemCount } from "./inventory";
import { buildBisCharacter } from "./balance-envelope-helpers";
import type { GameState } from "@hearthforge/shared";

/**
 * P0.3 Regression: idol_sanctum meldete „720 Phantom-Runs/h, 0 Gold". Ursache war NICHT die
 * Dungeon-Abschluss-Logik (die vergibt korrekt), sondern P0.1: ein fokussierter Held kam mit der
 * alten Ø-Formel nie über das Gate 100 → `startDungeon` schlug jeden Tick fehl → eine naive
 * 5s-Harness zählte 720 Phantom-„Runs" mit 0 Gold. Diese Tests sichern beide Seiten ab:
 *   1) Ein starker Held räumt idol_sanctum als CLEAR (nicht Abbruch) und bekommt die 8000 Gold + Loot.
 *   2) Es gibt keinen Phantom-Re-Trigger: nach dem Clear ist der Run sauber beendet.
 *
 * red-team #302 L2-Re-Pin (2026-07-09, monster-threat-spec §6): die 4 idol_sanctum-Wellen
 * (idol_warden/aether_wraith/scale_skarn/last_idol) sind jetzt echte Bedrohungen (dmg/hp/ward
 * stark angehoben, Papier-Monster-Fix) statt Farm-Nodes. Zwei Konsequenzen für den Fixture-Held:
 *  - Ein reiner Melee-"Tank" ohne wardBreak stirbt DETERMINISTISCH an aether_wraith (wardCapacity
 *    1654 > eigene maxHp) — das ist Itemization-2.5-Trinität (Stoff/Magie kontert Ward, s.
 *    game-design), kein Bug. `buildBisCharacter(..., "magic", ..., "tank", ...)` liefert einen
 *    Wand/Staff mit eingebautem wardBreak (~0.2–0.3) UND die volle Tank-Rüstung (armorRating/
 *    blockChance/con/maxHp-Argmax) — das schließt die Lücke, ohne die Trinität zu brechen.
 *  - Ein voller Clear dauert jetzt deutlich länger (Boss-HP ×5–7) — der alte 600s-Guard reicht
 *    nicht mehr; 3000 Ticks (3000s Sim-Zeit) geben genug Luft, ohne dass die Tests real langsamer
 *    laufen (advance() ist reine Berechnung, kein Wall-Clock-Sleep).
 */
describe("P0.3 idol_sanctum vollständiger Clear", () => {
  /** BiS-"Tank"-Magier (Rüstung maximiert, Wand liefert wardBreak) + Top-Food, voller Buff-Stack. */
  function gearedHero(): GameState {
    const build = buildBisCharacter(content, "magic", 99, "tank", { allBuffs: true });
    const s = build.state;
    // Guard: Waffe/Offhand wirklich getragen (kein Nackt-Clear, der der Test nicht mehr behauptet).
    expect(s.character.equipment.mainhand, "Waffe getragen").toBeTruthy();
    expandBaseCapacity(s.inventory, content, 100);
    addItem(s.inventory, content, "cooked_voidray", 50_000); // praktisch unbegrenzt Food für 4 Wellen
    s.character.food = "cooked_voidray";
    return s;
  }

  /** Lässt einen laufenden Dungeon-Run bis Clear/Abbruch/Guard durchlaufen (Sim-Zeit, kein Sleep). */
  function runToCompletion(s: GameState): void {
    let guard = 0;
    while (s.combat.dungeonId && guard++ < 3000) advance(s, content, 1000);
  }

  it("räumt alle 4 Wellen als CLEAR und vergibt die Dungeon-Belohnung (8000 Gold + Loot)", () => {
    const dungeon = content.dungeons.find((d) => d.id === "idol_sanctum")!;
    const s = gearedHero();
    let goldBefore = s.character.gold;
    let itemsBefore = s.stats.itemsGathered;
    let deathsBefore = s.stats.deaths;
    let cleared = false;
    // Quest-based unlock (Welle J, 2026-07-13): kein Schlüssel mehr — der Bestandsschutz-Eintrag
    // hält den Test K-fest (Welle K legt requiresQuest auf die echten Dungeons). Retries sind
    // frei wiederholbar; der eigentliche Guard ist „wird IRGENDWANN 0-Tode gecleart".
    s.dungeonsUnlocked["idol_sanctum"] = true;
    for (let attempt = 0; attempt < 5 && !cleared; attempt++) {
      goldBefore = s.character.gold;
      itemsBefore = s.stats.itemsGathered;
      deathsBefore = s.stats.deaths;

      expect(canEnterDungeon(s, content, "idol_sanctum")).toBe(true);
      expect(startDungeon(s, content, "idol_sanctum")).toBe(true);
      runToCompletion(s);

      expect(s.combat.dungeonId, "Run nicht beendet").toBe(null);
      cleared = s.stats.deaths === deathsBefore;
    }

    expect(cleared, "mindestens ein 0-Tode-Clear innerhalb von 5 Versuchen").toBe(true);
    expect(s.stats.deaths, "als Clear, nicht als Tod/Abbruch beendet").toBe(deathsBefore);
    expect(s.combat.kills, "alle 4 Wellen besiegt").toBeGreaterThanOrEqual(dungeon.encounters.length);
    // Gold-Gewinn muss mindestens die Dungeon-Belohnung enthalten (zzgl. Monster-Gold).
    expect(s.character.gold - goldBefore, "Dungeon-Gold vergeben").toBeGreaterThanOrEqual(dungeon.gold);
    expect(s.stats.itemsGathered, "Loot vergeben").toBeGreaterThan(itemsBefore);
    // Run sauber beendet: kein hängender Monster-/Encounter-Zustand.
    expect(s.combat.monsterId).toBe(null);
    expect(s.combat.encounterIndex).toBe(0);
  });

  it("kein Phantom-Re-Trigger: mehrere Runs hintereinander vergeben bei Clear echtes Gold (nicht 0)", () => {
    // Frühere Version dieses Tests fuhr ein festes Wall-Clock-Zeitbudget (5s-Harness) und teilte
    // Gold/gestartete-Runs — mit RNG-Toden UND deutlich längeren Clears (Boss-HP ×5–7) ist dieser
    // Schnitt kein sauberer Regressions-Indikator mehr (er sinkt jetzt AUCH legitim, nicht nur
    // durch den alten Phantom-Bug). Der P0.3-Kern bleibt scharf: das Entry-Gate öffnet real
    // (mehrere Runs starten erfolgreich) UND liefert über mehrere Versuche mindestens einen
    // vollen Clear mit echtem Gold — kein „0 Gold trotz N Runs"-Phantom mehr.
    const dungeon = content.dungeons.find((d) => d.id === "idol_sanctum")!;
    const s = gearedHero();
    s.dungeonsUnlocked["idol_sanctum"] = true; // Bestandsschutz-Unlock: trägt alle 10 Versuche (K-fest)
    let starts = 0;
    let clears = 0;
    let clearGoldGain = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      if (!canEnterDungeon(s, content, "idol_sanctum")) break;
      const goldBefore = s.character.gold;
      const deathsBefore = s.stats.deaths;
      expect(startDungeon(s, content, "idol_sanctum")).toBe(true);
      starts++;
      runToCompletion(s);
      expect(s.combat.dungeonId, "Run nicht beendet").toBe(null);
      if (s.stats.deaths === deathsBefore) {
        clears++;
        clearGoldGain += s.character.gold - goldBefore;
      }
    }
    expect(starts, "mindestens ein echter Run startet (kein Entry-Gate-Phantom)").toBeGreaterThan(0);
    expect(clears, "mindestens ein echter Clear über mehrere Versuche").toBeGreaterThan(0);
    // Jeder Clear bringt die volle Dungeon-Belohnung → kein „0 Gold trotz Runs"-Phantom mehr.
    expect(clearGoldGain, "Gold aus echten Clears (kein Phantom)").toBeGreaterThanOrEqual(dungeon.gold);
  });

  it("Quest-based unlock (Welle J): kein Schlüssel-System mehr — Eintritt über das Gate, idolhall_key ist gewöhnlicher Besitz", () => {
    const s = gearedHero();
    // Bestandsschutz-Unlock statt Übergangsregel → K-fest (die Übergangsphase selbst pinnt der
    // dafür markierte Test in dungeon.test.ts).
    s.dungeonsUnlocked["idol_sanctum"] = true;
    expect(isDungeonUnlocked(s, content, "idol_sanctum")).toBe(true);
    expect(canEnterDungeon(s, content, "idol_sanctum")).toBe(true);
    // Der Alt-Schlüssel ist stillgelegt: er landet als normales Item im Inventar und tut nichts.
    addItemOrBank(s, content, "idolhall_key", 1);
    expect(itemCount(s.inventory, "idolhall_key")).toBe(1);
    expect(startDungeon(s, content, "idol_sanctum")).toBe(true);
    expect(itemCount(s.inventory, "idolhall_key")).toBe(1); // Eintritt verbraucht keine Items
  });
});
