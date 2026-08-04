import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Story-Zonen-Gating-Persistenz (SAVE_VERSION 62→63, Aschechronik ceo-run-2026-07-13 Welle C +
 * Save-Kompat-GESETZ):
 *  - Alt-Saves (< 63) ohne `legacyZoneGrants` erhalten ALLE zum v62-Zeitpunkt existierenden
 *    Kampf-Zonen als Bestandsschutz-Grant (eingefrorene Liste — Bestandsspieler verlieren NIE
 *    Zugriff; die Chronik bleibt trotzdem ab Kapitel 1 spielbar, KEIN Auto-Complete).
 *  - Frische Saves (createGame) starten leer und werden beim Laden NICHT nachgefüllt.
 *  - sanitize härtet auf eine strikte true-Map (Muster toursSeen, Keys ≤ 64 Zeichen), BEWUSST
 *    ohne content.zones-Abgleich (Grants überleben Content-Drift).
 */

/** Die zum v62-Zeitpunkt eingefrorenen Kampf-Zonen (Spiegel von LEGACY_V62_ZONE_IDS). */
const V62_ZONE_IDS = [
  "pastures",
  "borderlands",
  "ashfields",
  "blackthorn",
  "crypt",
  "wildwood",
  "coast",
  "slagpit",
  "highlands",
  "idolhall",
  "slayer_tower",
] as const;

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("Story-Zonen-Gating-Persistenz (SAVE 63)", () => {
  it("Migration v62→v63: Alt-Save ohne Feld erhält ALLE v62-Zonen als Grant", () => {
    const s = createGame({ name: "Alt" }, content, 42);
    delete (s as Partial<GameState>).legacyZoneGrants; // v62-Shape simulieren
    (s as { version: number }).version = 62;
    const loaded = roundTrip(s);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(Object.keys(loaded.legacyZoneGrants).sort()).toEqual([...V62_ZONE_IDS].sort());
    for (const z of V62_ZONE_IDS) expect(loaded.legacyZoneGrants[z]).toBe(true);
    // Der künftige Endkampf-Dungeon-Kontext gehört NICHT auf die Liste (regulär quest-gated).
    expect(loaded.legacyZoneGrants["behind_the_throne"]).toBeUndefined();
  });

  it("Uralt-Save (v56-Launch-Ära) → ebenfalls volle Grant-Liste (Bestandsschutz für jede Alt-Ära)", () => {
    const s = createGame({ name: "Launch" }, content, 42);
    delete (s as Partial<GameState>).legacyZoneGrants;
    (s as { version: number }).version = 56;
    const loaded = roundTrip(s);
    expect(Object.keys(loaded.legacyZoneGrants).length).toBe(V62_ZONE_IDS.length);
  });

  it("Frischer Save (createGame): leer — und bleibt über Round-Trips leer (kein Re-Fill bei v63)", () => {
    const s = createGame({ name: "Neu" }, content, 42);
    expect(s.legacyZoneGrants).toEqual({});
    const loaded = roundTrip(s);
    expect(loaded.legacyZoneGrants).toEqual({});
    expect(roundTrip(loaded).legacyZoneGrants).toEqual({});
  });

  it("sanitize: Fremdwerte gehärtet — strikte true-Map, leere/überlange Keys raus, KEIN Zonen-Abgleich", () => {
    const s = createGame({ name: "Editor" }, content, 42);
    (s as unknown as { legacyZoneGrants: Record<string, unknown> }).legacyZoneGrants = {
      pastures: 1, // truthy Fremdwert → strikt true
      crypt: true,
      ghost_zone: false, // falsy → raus
      "": true, // leerer Key → raus
      ["x".repeat(65)]: true, // > 64 Zeichen → raus
      future_zone: "yes", // unbekannte Zone bleibt (Grant überlebt Content-Drift — bewusst)
    };
    const loaded = roundTrip(s);
    expect(loaded.legacyZoneGrants).toEqual({ pastures: true, crypt: true, future_zone: true });
  });

  it("Round-Trip-Stabilität: gesetzte Grants überleben unverändert (Migration + sanitize idempotent)", () => {
    const s = createGame({ name: "RT" }, content, 42);
    s.legacyZoneGrants = { idolhall: true };
    const loaded = roundTrip(s);
    expect(loaded.legacyZoneGrants).toEqual({ idolhall: true });
    expect(roundTrip(loaded).legacyZoneGrants).toEqual({ idolhall: true });
  });

  it("korruptes Feld (Array statt Record) auf v63 → leeres Objekt, KEIN Grant aus dem Nichts", () => {
    const s = createGame({ name: "Korrupt" }, content, 42);
    (s as unknown as { legacyZoneGrants: unknown }).legacyZoneGrants = ["pastures"];
    const loaded = roundTrip(s); // version === 63 ⇒ Reset auf {}, der <63-Fill greift NICHT
    expect(loaded.legacyZoneGrants).toEqual({});
  });
});
