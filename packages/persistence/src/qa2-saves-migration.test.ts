import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { createGame, setActiveAction, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Runde 2, Spielstände (Kontrolleur, 2026-10-24): Migrationskette v88 → v93, doppelte Migration,
 * Bergungs-Schloss. `it.fails` = belegter Befund (Test ist so formuliert, wie es SEIN SOLL; er reißt heute und
 * wird nach dem Fix auf `it` umgestellt). Plain `it` = Absicherung des Ist-Zustands.
 */
const AT = 1_761_500_000_000;
const H1 = 60 * 60 * 1000;
type SaveShape = { version: number; savedAt: number; state: GameState };

/** Serialisiert `s` als Alt-Save der Version `v` (Header und State). */
function asVersion(s: GameState, v: number, at = AT): string {
  const parsed = JSON.parse(serialize(s, at)) as SaveShape;
  parsed.version = v;
  parsed.state.version = v;
  return JSON.stringify(parsed);
}

function patchVersion(json: string, v: number): string {
  const parsed = JSON.parse(json) as SaveShape;
  parsed.version = v;
  parsed.state.version = v;
  return JSON.stringify(parsed);
}

/** v88-artiger Spielstand eines Handwerk-99-Bogenbauers ohne Bognerei-Konto. */
function bowyer(actionId: string): GameState {
  const s = createGame({ name: "QA-Bogner" }, content, 7);
  s.skills.leatherworking = { xp: xpForLevel(99) };
  delete s.skills.bowcraft;
  for (const inp of content.actions[actionId]!.inputs ?? []) s.bank[inp.itemId] = 1000;
  return s;
}

describe("v88 → v91: Bogenbau zieht vom Handwerk in die Bognerei (alle starten bei Stufe 1)", () => {
  const HIGH = "fletch_godiron_shortbow"; // Bognerei-Stufe 99
  const OUT = content.actions[HIGH]!.loot[0]!.itemId;

  it("Referenz online: mit Bognerei-Stufe 1 lässt sich die Stufe-99-Aktion nicht starten", () => {
    const s = bowyer(HIGH);
    setActiveAction(s, content, HIGH);
    expect(s.activeActionId).toBeNull();
  });

  // claude:2026-10-24T15:21:04+02:00 — Befund B1 behoben (Level-Prüfung beim Laden und in jedem Tick): it.fails → it.
  it("lief die Aktion im Alt-Save, endet sie beim Laden mit Grund level_too_low; keine Bögen, keine Bognerei-XP, Bestand bleibt", () => {
    const s = bowyer(HIGH);
    s.activeActionId = HIGH;
    s.actionProgressMs = 0;
    s.actionTarget = null;
    const res = deserialize(asVersion(s, 88), content, AT + H1)!;
    // SOLL: die laufende Aktion verlangt jetzt Bognerei 99, das Konto steht auf 0 ⇒ sie darf nicht weiterlaufen.
    expect(res.state.skills.bowcraft?.xp ?? 0).toBe(0);
    expect(res.state.stats.producedById?.[OUT] ?? 0).toBe(0);
    expect(res.state.activeActionId).toBeNull();
    expect(res.state.lastStop).toEqual({ actionId: HIGH, reason: "level_too_low" });
    // Keine Rücknahme: Handwerk-XP und die Zutaten in der Bank bleiben unverändert.
    expect(res.state.skills.leatherworking!.xp).toBe(s.skills.leatherworking!.xp);
    for (const inp of content.actions[HIGH]!.inputs ?? []) expect(res.state.bank[inp.itemId]).toBe(1000);
  });

  // claude:2026-10-24T15:21:04+02:00 — Befund B3 behoben (Grund level_too_low beim Überspringen): it.fails → it.
  it("ein Bogen-Eintrag in der Warteschlange wird beim Anlauf mit lastQueueSkip-Grund level_too_low übersprungen", () => {
    const s = bowyer(HIGH);
    s.actionQueue = [{ kind: "action", actionId: HIGH, target: 5 }];
    const res = deserialize(asVersion(s, 88), content, AT + H1)!;
    expect(res.state.skills.bowcraft?.xp ?? 0).toBe(0); // Ist: korrekt nicht gelaufen
    expect(res.state.actionQueue).toEqual([]); // Ist: Eintrag weg
    // SOLL (Muster no_materials/gate_locked, actions.ts-Doku „nichts wird still übersprungen“): ein Grund bleibt zurück.
    expect(res.state.lastQueueSkip).toEqual({ monsterId: "", actionId: HIGH, reason: "level_too_low" });
    // Der Grund überlebt Speichern/Laden, solange das Level fehlt.
    const again = deserialize(serialize(res.state, AT + H1), content, AT + H1)!;
    expect(again.state.lastQueueSkip).toEqual({ monsterId: "", actionId: HIGH, reason: "level_too_low" });
  });

  it("Kontrolle: Bogen-Aktion der Stufe 1 läuft nach dem v88-Laden in der Bognerei normal weiter, Handwerk unangetastet", () => {
    const LOW = "fletch_copper_shortbow";
    const s = bowyer(LOW);
    s.activeActionId = LOW;
    const lwBefore = s.skills.leatherworking!.xp;
    const res = deserialize(asVersion(s, 88), content, AT + H1)!;
    expect(res.state.skills.bowcraft?.xp ?? 0).toBeGreaterThan(0);
    expect(res.state.skills.leatherworking!.xp).toBe(lwBefore);
    expect(res.state.skills.fletching).toBeUndefined();
  });
});

describe("Doppelte Migration schadet nicht (v88 → v93, Ergebnis erneut als v88 geladen)", () => {
  it("synthetischer v88: Mahlzeit im Heilplatz, Lagerware in bankOrder, Lücken; zweiter Lauf ist ein No-op", () => {
    const s = createGame({ name: "QA-Doppel" }, content, 9);
    s.character.food = "marshroot_chowder"; // Mahlzeit (Buff "food") im alten Essensplatz
    s.inventory.slots[0] = { itemId: "cooked_trout", qty: 5 };
    s.inventory.slots[1] = { itemId: "marshroot_chowder", qty: 2 };
    s.bank.copper_ore = 40; // Lagerware
    s.bank.cooked_shrimp = 12; // Bankware
    s.bankOrder = ["copper_ore", null, "cooked_shrimp", null];
    delete (s.character as { meal?: unknown }).meal;
    delete (s.character as { mealKeep?: unknown }).mealKeep;
    delete (s as { skillEvents?: unknown }).skillEvents;
    delete (s as { workOrders?: unknown }).workOrders;
    delete (s as { eventRng?: unknown }).eventRng;
    delete (s as { raid?: unknown }).raid;
    delete (s as { lockedItems?: unknown }).lockedItems;

    const first = deserialize(asVersion(s, 88), content, AT)!.state;
    expect(first.version).toBe(SAVE_VERSION); // claude:2026-10-24T15:21:04+02:00 — SAVE 94 (vorher fest 93)
    expect(first.stats.harvestedById).toEqual({}); // SAVE 94: alte Saves starten bei 0
    expect(first.character.meal).toBe("marshroot_chowder");
    expect(first.character.food).toBe("cooked_trout");
    expect(first.character.mealKeep).toBe(true);
    expect(first.bankOrder).toEqual(["cooked_shrimp"]);
    expect(first.bank.copper_ore).toBe(40);
    expect(first.skillEvents).toBeTruthy();
    expect(first.workOrders).toBeTruthy();
    expect(first.raid).toBeTruthy();
    expect(first.eventRng).toBeTruthy();

    const once = serialize(first, AT);
    const again = serialize(deserialize(patchVersion(once, 88), content, AT)!.state, AT);
    expect(again).toBe(once);
  });

  for (const file of ["v87-synthetic-1.3.0.json", "v88-synthetic-1.3.0.json"]) {
    it(`${file}: Vault-Fixture migriert, dann erneut als v88 geladen ⇒ identisch`, () => {
      const raw = readFileSync(join(__dirname, "..", "fixtures", "save-compat", file), "utf8");
      const savedAt = (JSON.parse(raw) as SaveShape).savedAt;
      const first = deserialize(raw, content, savedAt)!.state;
      // Fixpunkt-Referenz ab dem zweiten Serialize (der erste trägt transiente Kampffelder, s. Vault-Doku).
      const ref = serialize(deserialize(serialize(first, AT), content, AT)!.state, AT);
      const again = serialize(deserialize(patchVersion(ref, 88), content, AT)!.state, AT);
      expect(again).toBe(ref);
    });
  }
});

describe("Bergungs-Schloss (SAVE 90): Deckel beim Laden", () => {
  // claude:2026-10-24T15:21:04+02:00 — Befund B4 behoben (Deckel behält die neuesten Einträge): it.fails → it.
  it("bei 5000 verwaisten Schlössern bleibt das jüngste echte Schloss beim Laden erhalten (Deckel behält die neuesten 5000)", () => {
    const s = createGame({ name: "QA-Schloss" }, content, 3);
    const locks: Record<string, true> = {};
    for (let i = 0; i < 5000; i++) locks[`inst_verwaist_${i}`] = true; // z. B. verkaufte/verbrauchte Einzelstücke, nie aufgeräumt
    locks.copper_longbow = true; // das Schloss, das der Spieler gerade gesetzt hat
    s.lockedItems = locks;
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(Object.keys(out.lockedItems ?? {}).length).toBe(5000); // Ist: Deckel greift
    // SOLL: ein echtes Schloss auf vorhandenem Besitz geht nie verloren (verwaiste Einträge müssten zuerst fallen).
    expect(out.lockedItems?.copper_longbow).toBe(true);
    expect(out.lockedItems?.inst_verwaist_0).toBeUndefined(); // das älteste fällt
    expect(out.lockedItems?.inst_verwaist_4999).toBe(true);
  });
});
