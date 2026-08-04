import { describe, expect, it } from "vitest";
import type { GameState } from "@hearthforge/shared";
import { CAMP_TOWNHALL_ID, TICK_MS } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance } from "./tick";
import { addItem } from "./inventory";
import { enqueueAction } from "./actions";
import { campBuildingDef, startCampBuild } from "./camp";
import { setCampRefineRecipe } from "./refine";

/**
 * REGRESSIONS-GUARD offline==online (entstanden als Ad-hoc-Audit-Probe des Kontrolleurs
 * 2026-08-03, Prüfauftrag New-Haven-System 0.3.0; seit Task #335 fester Bestandteil der Suite).
 *
 * DETERMINISMUS-GESETZ (encampment-konzept.md „Technische Leitplanken", camp.ts-Kopf):
 * Bauzeit + Offline-Veredelung laufen über deterministische Tick-Zeit — offline==online
 * BIT-IDENTISCH. Probe: gleicher Start-State, einmal N EINZEL-Ticks (Live-Loop-Form),
 * einmal EIN grosser advance (Offline-Catch-up-Form) → Endstate byte-gleich (JSON-Vergleich).
 *
 * HISTORIE [AUDIT-334x-1, GEFIXT in Task #335]: Veredelung, deren INPUT erst WÄHREND des
 * Fensters aus einer laufenden Aktion entstand, während der Akkumulator voll aufgeladen
 * wartete, war NICHT byte-gleich — tickCampRefine lief damals EINMAL pro advance mit dem
 * Gesamtfenster (tick.ts, `steps>0`-Block) statt pro Tick: der Catch-up verrechnete das ganze
 * Fenster gegen den END-Bestand, der Live-Loop verbrauchte die Aufladung beim ERSTEN Erz und
 * lud danach neu → `accMs` wich ab (57 000 vs. 60 000 nach 10 min). Fix: tickCampRefine tickt
 * in der Tick-Schleife von advance (nach step(), mit TICK_MS). Test 3 unten erzwingt seither
 * die Byte-Gleichheit genau dieses Szenarios — er ist der Guard gegen jede Rückkehr einer
 * per-Fenster-Verrechnung bestandsabhängiger Subsysteme.
 */

/** Zahlt Gold + alle Materialien einer Stufe direkt ein (Muster camp.test.ts `fund`). */
function fund(s: GameState, buildingId: string, targetLevel: number): void {
  const def = campBuildingDef(content, buildingId)!;
  const lvl = def.levels[targetLevel - 1]!;
  s.character.gold += lvl.gold;
  for (const c of lvl.items) addItem(s.inventory, content, c.itemId, c.qty);
}

/**
 * Byte-Vergleichsform. Normalisiert werden die zwei DOKUMENTIERT gewollten online/offline-
 * Unterschiede (beide älter als New Haven, kein Camp-Befund):
 *  · `activePlayMs` — Offline-Zeit ist keine Spielzeit (tick.ts `step`),
 *  · das Elite-Spawn-Subsystem — per Chef-Entscheid ein reines Online-/Aktiv-Feature, der
 *    Offline-Catch-up ist dafür ein kompletter No-op (tick.ts, elite-spawns-concept.md §1.3);
 *    es zieht ausschliesslich `eliteRng`, nie `state.rng`.
 * PLUS ein OFFENER Befund [AUDIT-335-2, an den CEO gemeldet, Task #335]: die REIHENFOLGE der
 * Append-Arrays `achievements` und `quests.completed` — checkAchievements/evaluateQuests laufen
 * bewusst EINMAL pro advance („günstig, lesend"); der Live-Loop (1 advance ≈ 1 Tick) hängt
 * Einträge in Freischalt-Reihenfolge an, der Catch-up alle auf einmal in Katalog-Reihenfolge.
 * Hier wird deshalb NUR die Reihenfolge sortiert-normalisiert — die MENGEN-Gleichheit beider
 * Arrays erzwingt Test 3 separat und ungeschwächt (`expect(...).toEqual([...].sort())`).
 * ALLES andere (inkl. camp/refine/rng/Bestände) muss byte-gleich sein.
 */
function comparable(s: GameState): string {
  return JSON.stringify({
    ...s,
    activePlayMs: 0,
    eliteRng: null,
    eliteZones: null,
    eliteSpawnSeq: 0,
    lastEliteSpawn: null,
    eliteCodex: null,
    eliteKillSeq: 0,
    lastEliteKill: null,
    achievements: [...s.achievements].sort(),
    quests: { ...s.quests, completed: [...s.quests.completed].sort() },
  });
}

/** N Einzel-Ticks in Live-Loop-Form (jeder advance = 1 Tick). */
function advanceTickwise(s: GameState, ticks: number): void {
  for (let i = 0; i < ticks; i++) advance(s, content, TICK_MS, { offline: false });
}

/** Dieselbe Zeitspanne als EIN Offline-Catch-up (persistence-`deserialize`-Form). */
function advanceAsCatchup(s: GameState, ticks: number): void {
  advance(s, content, ticks * TICK_MS, { offline: true });
}

describe("AUDIT: offline==online byte-gleich — Bau-Loop", () => {
  it("mitten im Bau UND über die Fertigstellung hinweg (Zentralhaus I, 10 min)", () => {
    const base = createGame({ name: "Audit" }, content, 334);
    fund(base, CAMP_TOWNHALL_ID, 1);
    expect(startCampBuild(base, content, CAMP_TOWNHALL_ID)).toBe("ok");
    const online = structuredClone(base);
    const offline = structuredClone(base);

    // Phase 1: 2 500 Ticks (250 s) — der Bau (600 s) ist MITTENDRIN.
    advanceTickwise(online, 2_500);
    advanceAsCatchup(offline, 2_500);
    expect(online.camp.buildJob?.remainingMs).toBe(600_000 - 250_000);
    expect(comparable(offline)).toBe(comparable(online));

    // Phase 2: weitere 4 000 Ticks (400 s) — die Fertigstellung liegt IM Fenster.
    advanceTickwise(online, 4_000);
    advanceAsCatchup(offline, 4_000);
    expect(online.camp.buildJob).toBeNull();
    expect(online.camp.buildings[CAMP_TOWNHALL_ID]).toBe(1);
    expect(online.camp.buildSeq).toBe(1);
    expect(comparable(offline)).toBe(comparable(online));
  });
});

describe("AUDIT: offline==online byte-gleich — laufende Veredelung (Vorrat vorhanden)", () => {
  it("Schmelzofen I, smelt_copper, 500 Erz in der Bank, 1 h Fenster (20 Durchläufe)", () => {
    const base = createGame({ name: "Audit" }, content, 334);
    base.camp.buildings.camp_smelter = 1;
    base.camp.buildSeq += 1; // Cache-Vertrag (camp.ts campBoostCached)
    base.bank.copper_ore = 500;
    expect(setCampRefineRecipe(base, content, "camp_smelter", "smelt_copper")).toBe("ok");
    const online = structuredClone(base);
    const offline = structuredClone(base);

    advanceTickwise(online, 36_000); // 1 h in Einzel-Ticks
    advanceAsCatchup(offline, 36_000); // 1 h als EIN Catch-up

    expect(online.camp.refine.camp_smelter?.produced).toBe(20); // Stufe I = 20/h
    expect(online.bank.copper_ore).toBe(480);
    expect(comparable(offline)).toBe(comparable(online));
  });
});

describe("AUDIT: offline==online byte-gleich — Veredelung mit Input aus laufender Aktion (Ex-Befund 334x-1)", () => {
  it("aufgeladener Schmelzofen + Kupfer-Abbau ab 0 Erz: Endstate byte-gleich (Guard Task #335)", () => {
    const base = createGame({ name: "Audit" }, content, 334);
    base.camp.buildings.camp_smelter = 1;
    base.camp.buildSeq += 1;
    expect(setCampRefineRecipe(base, content, "camp_smelter", "smelt_copper")).toBe("ok");
    // Anlage 4 min OHNE Erz laufen lassen → Akkumulator lädt legitim bis msPerRun (180 000 ms) auf.
    advanceAsCatchup(base, 2_400);
    expect(base.camp.refine.camp_smelter?.accMs).toBe(180_000);

    const online = structuredClone(base);
    const offline = structuredClone(base);
    expect(enqueueAction(online, content, "mine_copper", null)).toBe(true);
    expect(enqueueAction(offline, content, "mine_copper", null)).toBe(true);

    // 10 min Fenster: das erste Erz entsteht nach ~3 s AUS der Aktion.
    advanceTickwise(online, 6_000);
    advanceAsCatchup(offline, 6_000);

    // Semantik-Pin: beide Pfade verbrauchen die Aufladung beim Eintreffen des ERSTEN Erzes (~3 s)
    // und laden danach neu — Endstand 57 000 ms (Live-Loop-Wahrheit von vor dem Fix; der alte
    // per-Fenster-Catch-up landete fälschlich bei 60 000 ms). Wer diesen Wert bricht, hat die
    // Verrechnungs-Reihenfolge der Veredelung verändert.
    expect(online.camp.refine.camp_smelter?.accMs).toBe(57_000);
    expect(offline.camp.refine.camp_smelter?.accMs).toBe(57_000);

    // Mengen-Gleichheit der beiden Append-Arrays, deren REIHENFOLGE `comparable` normalisiert
    // (offener Befund AUDIT-335-2, s. Kommentar dort): gleiche Einträge, nur andere Reihenfolge —
    // fehlt oder überzählt ein Eintrag, schlägt ES HIER fehl, nicht stumm an der Normalisierung
    // vorbei.
    expect([...offline.achievements].sort()).toEqual([...online.achievements].sort());
    expect([...offline.quests.completed].sort()).toEqual([...online.quests.completed].sort());

    // DER GUARD (Ex-Befund 334x-1, gefixt Task #335): der komplette Endstate ist byte-gleich —
    // inkl. Fortschritts-Akkumulator (Save-Feld!), Ausstoß, Beständen und RNG.
    expect(offline.camp.refine.camp_smelter?.produced).toBe(
      online.camp.refine.camp_smelter?.produced,
    );
    expect(offline.rng).toEqual(online.rng);
    expect(comparable(offline)).toBe(comparable(online));
  });
});
