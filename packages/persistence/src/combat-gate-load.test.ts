import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createGame, startCombat } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Kampf-Gate-Load-Invariante (Tester-Sweep 2 T10, 2026-07-13 — Save-Tampering-Offline-Farm):
 * `combatStep` prüft das Zonen-Gate nie erneut — ein Save-JSON-Edit (`combat.monsterId` auf ein
 * Monster einer GESPERRTEN Zone) konnte offline stundenlang durchfarmen (bestätigt: 220 Kills).
 * Fix: persistence sanitize prüft das Gate beim Load erneut und beendet einen unrechtmäßigen
 * Kampf STILL (stopCombat-Felder, KEIN Loot, kein Fehler). Der Bestandsschutz (legacyZoneGrants
 * v63 / dungeonsUnlocked inkl. „aktiver Run ⇒ unlocked") macht das für alle LEGITIMEN Saves zum
 * garantierten No-op — nur getamperte Saves verlieren den Kampf.
 *
 * Fixture-Konvention: goblin sitzt in der Zone `borderlands` (Gate: chronicle_03) — ein frischer
 * Save (SAVE_VERSION aktuell, keine Quest, kein Grant) hat die Zone GESPERRT.
 */

const SAVED_AT = 1_000_000;

function loadOk(json: string, now: number): NonNullable<ReturnType<typeof deserialize>> {
  const r = deserialize(json, content, now);
  expect(r).not.toBeNull();
  return r!;
}

describe("Kampf-Gate-Load-Invariante (T10)", () => {
  it("getamperter Save (monsterId in gesperrter Zone) → Kampf beim Load still beendet, 0 Offline-Kills", () => {
    const s = createGame({ name: "Tamper" }, content, 7);
    // Der Live-Pfad hält dicht (canFightMonster) — die Lücke war NUR der geladene Zustand …
    expect(startCombat(s, content, "goblin")).toBe(false);
    // … also den Save-JSON-Edit simulieren: Kampf-Felder von Hand setzen.
    s.combat.monsterId = "goblin";
    s.combat.enemyHp = content.monsters.goblin!.maxHp;
    const json = serialize(s, SAVED_AT);

    const { state: loaded, offline } = loadOk(json, SAVED_AT + 3_600_000); // 1 h „offline farmen"
    // Kampf still beendet (Felder wie stopCombat) — KEIN Fehler, der Save lädt normal.
    expect(loaded.combat.monsterId).toBeNull();
    expect(loaded.combat.dungeonId).toBeNull();
    expect(loaded.combat.encounterIndex).toBe(0);
    // 0 Offline-Kills gegen das gesperrte Monster — kein Loot, kein XP-Farm.
    expect(loaded.stats.kills).toBe(0);
    expect(loaded.monsterKills["goblin"]).toBeUndefined();
    expect(offline.kills ?? 0).toBe(0);
  });

  it("legitimer Alt-Save-Kampf (Bestandsschutz-Grant) läuft offline exakt weiter wie bisher (Regression)", () => {
    // Identisches Fixture wie der bestehende Fernkampf-Offline-Test (goblin + Grant): der Grant
    // macht die Invariante zum No-op — Kampf überlebt den Load und farmt im Catch-up weiter.
    const s = createGame({ name: "Alt", baseAttributes: { dex: 8, con: 10 } }, content, 5);
    s.character.equipment.mainhand = "copper_shortbow";
    s.legacyZoneGrants["borderlands"] = true; // Bestandsschutz wie bei einem echten Alt-Save
    expect(startCombat(s, content, "goblin")).toBe(true);
    const json = serialize(s, SAVED_AT);

    const { state: loaded } = loadOk(json, SAVED_AT + 600_000); // 10 min offline
    expect(loaded.stats.kills).toBeGreaterThan(0); // der Catch-up hat GEKÄMPFT
    expect(loaded.monsterKills["goblin"]).toBeGreaterThan(0);
  });

  it("Uralt-Save (< 63) mitten im borderlands-Kampf: Migrations-Grant hält den Kampf offen (No-op)", () => {
    // Die v62→63-Migration grantet Alt-Saves ALLE v62-Zonen — derselbe Kampf-Zustand, der bei
    // einem frischen Save als Tampering endet, ist für einen Alt-Save rechtmäßig und ÜBERLEBT.
    const s = createGame({ name: "Ur" }, content, 7);
    delete (s as Partial<GameState>).legacyZoneGrants; // v62-Shape simulieren
    (s as { version: number }).version = 62;
    s.combat.monsterId = "goblin";
    s.combat.enemyHp = content.monsters.goblin!.maxHp;
    const json = serialize(s, SAVED_AT);

    const { state: loaded } = loadOk(json, SAVED_AT); // Load ohne Offline-Zeit: reiner Gate-Check
    expect(loaded.legacyZoneGrants["borderlands"]).toBe(true); // Migration hat gegrantet
    expect(loaded.combat.monsterId).toBe("goblin"); // Kampf unangetastet
  });

  it("unauflösbare (getamperte) dungeonId im geladenen Kampf → Kampf still beendet", () => {
    const s = createGame({ name: "Ghost" }, content, 3);
    s.combat.monsterId = "chicken"; // Zone pastures wäre frei — aber der Dungeon-Kontext zählt
    s.combat.enemyHp = 5;
    s.combat.dungeonId = "ghost_dungeon"; // existiert nicht → Gate unauflösbar
    const json = serialize(s, SAVED_AT);

    const { state: loaded } = loadOk(json, SAVED_AT);
    expect(loaded.combat.monsterId).toBeNull();
    expect(loaded.combat.dungeonId).toBeNull();
  });
});
