import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { ELITE_COOLDOWN_HARD_CAP_MS, eliteZoneCooldownBand } from "@hearthforge/shared";
import { createGame, createRng } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Elite-/World-Spawns-Persistenz (SAVE_VERSION 71→72, design/elite-spawns-concept.md +
 * design/elite-balance-spec.md §3 + Save-Kompat-GESETZ):
 *  - Alt-Saves (< 72) ohne die vier neuen Felder erhalten `eliteRng` deterministisch aus dem bereits
 *    geladenen `state.rng.state` abgeleitet (`deriveEliteRngSeed`) UND `eliteZones` über den
 *    NORMALEN, staffelnden Band-Roll befüllt (`initEliteZonesStaggered` — JEDE Zone würfelt in
 *    ihrem EIGENEN Cooldown-Band; KEIN Früh-Haken für Bestandsspieler, Chef-Nachtrag 2026-07-22);
 *    `eliteSpawnSeq`/`lastEliteSpawn` starten bei 0/null.
 *  - Die Migration KONSUMIERT `state.rng` NIE (liest nur `state.rng.state`) — Determinismus-/
 *    offline==online-Gesetz für die normale Grind-Sequenz bleibt beim Update unangetastet.
 *  - `createGame` (frischer Save) nutzt STATTDESSEN die Früh-Haken-Formel
 *    (`initEliteZonesEarlyHook`) — Pastures wird garantiert nach ~15–25 Min aktiver Spielzeit fällig.
 *  - sanitize härtet STRIKT: eliteRng-Finiteness (Muster rng), eliteZones-Shape (Ruhe/Aktiv,
 *    unbekannte Zonen-Keys toleriert wie legacyZoneGrants, ein aktiver Eintrag mit unbekannter
 *    variantId → Ruhe statt Crash), Breadcrumb-Shape + Monotonie-Invariante (Muster lastApMilestone).
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

/** v71-Shape simulieren: die vier neuen Felder entfernen + Version zurückstufen. */
function toV71Shape(s: GameState): void {
  const raw = s as unknown as Record<string, unknown>;
  delete raw.eliteRng;
  delete raw.eliteZones;
  delete raw.eliteSpawnSeq;
  delete raw.lastEliteSpawn;
  (s as { version: number }).version = 71;
}

describe("Elite-/World-Spawns-Persistenz (SAVE 72)", () => {
  it("Migration v71→v72: Alt-Save ohne die vier Felder erhält eliteRng + PER-ZONE-gestaffelte eliteZones (KEIN Früh-Haken) + Zähler 0 + Breadcrumb null", () => {
    const s = createGame({ name: "Alt" }, content, 42);
    const rngBefore = s.rng.state;
    toV71Shape(s);

    const loaded = roundTrip(s);
    expect(loaded.version).toBeGreaterThanOrEqual(72);

    expect(Number.isFinite(loaded.eliteRng.state)).toBe(true);
    expect(Object.keys(loaded.eliteZones).sort()).toEqual(content.zones.map((z) => z.id).sort());
    for (const zone of content.zones) {
      const entry = loaded.eliteZones[zone.id]!;
      expect("variantId" in entry, `${zone.id} frisch migriert ⇒ Ruhe`).toBe(false);
      const cooldownMs = (entry as { cooldownMs: number }).cooldownMs;
      const band = eliteZoneCooldownBand(zone.id);
      expect(cooldownMs, `${zone.id} außerhalb seines Bands`).toBeGreaterThanOrEqual(band.minMs);
      expect(cooldownMs, `${zone.id} außerhalb seines Bands`).toBeLessThanOrEqual(band.maxMs);
    }
    expect(loaded.eliteSpawnSeq).toBe(0);
    expect(loaded.lastEliteSpawn).toBeNull();

    // Determinismus-Gesetz: die Migration LIEST state.rng nur — konsumiert es nicht.
    expect(loaded.rng.state).toBe(rngBefore);
  });

  it("Ableitung ist deterministisch: derselbe rng.state ⇒ IMMER derselbe migrierte eliteRng-Strom", () => {
    const a = createGame({ name: "A" }, content, 42);
    const b = createGame({ name: "A" }, content, 42); // identischer Seed ⇒ identisches state.rng.state
    expect(a.rng.state).toBe(b.rng.state);
    toV71Shape(a);
    toV71Shape(b);
    const loadedA = roundTrip(a);
    const loadedB = roundTrip(b);
    expect(loadedA.eliteRng).toEqual(loadedB.eliteRng);
    expect(loadedA.eliteZones).toEqual(loadedB.eliteZones);
  });

  it("unterschiedlicher rng.state ⇒ unterschiedlicher migrierter eliteRng-Strom (keine Konstante)", () => {
    const a = createGame({ name: "A" }, content, 1);
    const b = createGame({ name: "B" }, content, 2);
    expect(a.rng.state).not.toBe(b.rng.state);
    toV71Shape(a);
    toV71Shape(b);
    const loadedA = roundTrip(a);
    const loadedB = roundTrip(b);
    expect(loadedA.eliteRng.state).not.toBe(loadedB.eliteRng.state);
  });

  it("Round-Trip erhält einen aktiven Elite-Spawn + Breadcrumb + Zähler verlustfrei (idempotent)", () => {
    const s = createGame({ name: "Kletterer" }, content, 42);
    s.eliteZones.pastures = { variantId: "some_variant", remainingMs: 400_000 };
    s.eliteZones.borderlands = { cooldownMs: 1_800_000 };
    s.eliteSpawnSeq = 3;
    s.lastEliteSpawn = { zoneId: "pastures", variantId: "some_variant", seq: 3 };
    // Real-Content hat KEINE "some_variant" — s.eliteZones.pastures ist also gegen den aktuellen
    // Content nicht auflösbar, aber das Speichern/Laden selbst darf trotzdem den STATE nicht anfassen
    // (die Referenz-Härtung greift NUR aktiv gesetzte Werte defensiv ab, s. Test unten).
    const loaded = roundTrip(s);
    expect(loaded.eliteSpawnSeq).toBe(3);
    expect(loaded.lastEliteSpawn).toEqual({ zoneId: "pastures", variantId: "some_variant", seq: 3 });
    // borderlands (Ruhe, gültiges Shape) bleibt exakt erhalten.
    expect(loaded.eliteZones.borderlands).toEqual({ cooldownMs: 1_800_000 });
    const again = roundTrip(loaded);
    expect(again.eliteSpawnSeq).toBe(loaded.eliteSpawnSeq);
    expect(again.lastEliteSpawn).toEqual(loaded.lastEliteSpawn);
    expect(again.eliteZones).toEqual(loaded.eliteZones);
  });

  it("sanitize STRIKT: aktiver Eintrag mit unbekannter variantId → Ruhe (cooldownMs 0) statt Crash", () => {
    const s = createGame({ name: "Editor" }, content, 42);
    // content.elites ist in Phase 1 leer ⇒ JEDE variantId ist "unbekannt" (Content-Drift-Simulation).
    s.eliteZones.pastures = { variantId: "ghost_variant", remainingMs: 500_000 };
    const loaded = roundTrip(s);
    expect(loaded.eliteZones.pastures).toEqual({ cooldownMs: 0 });
  });

  it("sanitize STRIKT: unbekannte Zonen-Keys werden TOLERIERT (Content-Drift-Leitplanke, Muster legacyZoneGrants)", () => {
    const s = createGame({ name: "Editor" }, content, 42);
    (s.eliteZones as Record<string, unknown>).ghost_zone = { cooldownMs: 1000 };
    const loaded = roundTrip(s);
    expect(loaded.eliteZones.ghost_zone).toEqual({ cooldownMs: 1000 });
  });

  it("sanitize STRIKT: Zahlen werden endlich/≥0/gedeckelt geklemmt (NaN/negativ/Riesenwert)", () => {
    const s = createGame({ name: "Editor" }, content, 42);
    (s.eliteZones as unknown as Record<string, unknown>).pastures = { cooldownMs: Number.NaN };
    (s.eliteZones as unknown as Record<string, unknown>).borderlands = { cooldownMs: -500 };
    (s.eliteZones as unknown as Record<string, unknown>).ashfields = { cooldownMs: 9_999_999_999 };
    const loaded = roundTrip(s);
    expect(loaded.eliteZones.pastures).toEqual({ cooldownMs: 0 });
    expect(loaded.eliteZones.borderlands).toEqual({ cooldownMs: 0 });
    // sanitize klemmt auf den BLUNTEN, zonen-unabhängigen Hard-Cap (kein Band-Lookup in sanitize).
    expect((loaded.eliteZones.ashfields as { cooldownMs: number }).cooldownMs).toBe(ELITE_COOLDOWN_HARD_CAP_MS);
  });

  it("sanitize STRIKT: kaputte eliteZones-Shape (Array statt Record) → geleert, kein Crash", () => {
    const s = createGame({ name: "Editor" }, content, 42);
    (s as unknown as { eliteZones: unknown }).eliteZones = ["pastures"];
    const loaded = roundTrip(s);
    expect(loaded.eliteZones).toEqual({});
  });

  it("sanitize STRIKT: eliteRng-Korruption (fehlend/NaN) fällt auf createRng(1) zurück, crasht nicht", () => {
    const s = createGame({ name: "Editor" }, content, 42);
    (s as unknown as { eliteRng: unknown }).eliteRng = { state: Number.NaN };
    const loaded = roundTrip(s);
    expect(loaded.eliteRng).toEqual(createRng(1));

    const s2 = createGame({ name: "Editor2" }, content, 42);
    (s2 as unknown as { eliteRng: unknown }).eliteRng = null;
    const loaded2 = roundTrip(s2);
    expect(loaded2.eliteRng).toEqual(createRng(1));
  });

  it("sanitize STRIKT: lastEliteSpawn-Shape gehärtet + eliteSpawnSeq-Monotonie erzwungen (Muster petDropSeq)", () => {
    const s = createGame({ name: "Editor" }, content, 42);
    (s as unknown as Record<string, unknown>).lastEliteSpawn = { zoneId: 5, variantId: "x", seq: 2 };
    (s as unknown as Record<string, unknown>).eliteSpawnSeq = -9;
    const loaded = roundTrip(s);
    expect(loaded.lastEliteSpawn).toBeNull(); // kaputtes Shape (zoneId nicht String) ⇒ verworfen
    expect(loaded.eliteSpawnSeq).toBe(0); // negativ ⇒ 0, kein Konflikt mit dem verworfenen Breadcrumb

    const s2 = createGame({ name: "Editor2" }, content, 42);
    (s2 as unknown as Record<string, unknown>).eliteSpawnSeq = 1; // < Breadcrumb-seq
    s2.lastEliteSpawn = { zoneId: "pastures", variantId: "ghost", seq: 5 };
    const loaded2 = roundTrip(s2);
    expect(loaded2.eliteSpawnSeq, "Zähler NIE unter dem Breadcrumb-seq").toBe(5);
  });

  /**
   * Elite-Zugangs-Load-Invariante (Spieler-Report 1.0.0 „The Ninth Warden … located in The Idol
   * Hall — i do not see how to gain access", Fix 1.0.1). BEWUSST OHNE SAVE_VERSION-Bump: kein neues
   * Feld, nur eine versions-ungegatete, idempotente, RNG-freie Invariante auf bestehenden Daten
   * (Muster Kampf-Gate-Load-Invariante, combat-gate-load.test.ts). Alt-Spielstände können einen
   * AKTIVEN Elite in `idolhall` tragen — einer Zone, die ausschließlich aus dungeonOnly-Monstern
   * besteht und deshalb gar keine Zonen-Karte hat: der Champion war dort nie erreichbar.
   */
  it("Load-Invariante 1.0.1: aktiver Elite in einer UNERREICHBAREN Zone → Ruhe (cooldownMs 0) + Breadcrumb fällt", () => {
    const s = createGame({ name: "AltSave" }, content, 42);
    for (const z of content.zones) s.legacyZoneGrants[z.id] = true; // Zone gilt als freigeschaltet
    s.eliteZones.idolhall = { variantId: "elite_idol_warden", remainingMs: 400_000 };
    s.eliteSpawnSeq = 7;
    s.lastEliteSpawn = { zoneId: "idolhall", variantId: "elite_idol_warden", seq: 7 };

    const loaded = roundTrip(s);
    expect(loaded.eliteZones.idolhall).toEqual({ cooldownMs: 0 });
    expect(loaded.lastEliteSpawn, "kein irreführender Toast beim Laden").toBeNull();
    expect(loaded.eliteSpawnSeq, "Seq-Monotonie: NIE gesenkt").toBe(7);

    const again = roundTrip(loaded); // idempotent
    expect(again.eliteZones.idolhall).toEqual({ cooldownMs: 0 });
    expect(again.lastEliteSpawn).toBeNull();
    expect(again.eliteSpawnSeq).toBe(7);
  });

  it("Load-Invariante 1.0.1: aktiver Elite in einer GESPERRTEN Zone fällt ebenfalls (Save-Edit/Alt-Save)", () => {
    const s = createGame({ name: "Gesperrt" }, content, 42); // keine Quest, kein Grant ⇒ borderlands zu
    s.eliteZones.borderlands = { variantId: "elite_border_rogue", remainingMs: 400_000 };
    s.lastEliteSpawn = { zoneId: "borderlands", variantId: "elite_border_rogue", seq: 4 };
    s.eliteSpawnSeq = 4;

    const loaded = roundTrip(s);
    expect(loaded.eliteZones.borderlands).toEqual({ cooldownMs: 0 });
    expect(loaded.lastEliteSpawn).toBeNull();
    expect(loaded.eliteSpawnSeq).toBe(4);
  });

  it("Load-Invariante 1.0.1: ein LEGITIMER aktiver Elite bleibt verlustfrei erhalten (kein Kollateralschaden)", () => {
    const s = createGame({ name: "Legit" }, content, 42); // pastures ist ungegatet + jagdbar
    s.eliteZones.pastures = { variantId: "elite_pastures_boar", remainingMs: 400_000 };
    s.lastEliteSpawn = { zoneId: "pastures", variantId: "elite_pastures_boar", seq: 2 };
    s.eliteSpawnSeq = 2;

    const loaded = roundTrip(s);
    expect(loaded.eliteZones.pastures).toEqual({ variantId: "elite_pastures_boar", remainingMs: 400_000 });
    expect(loaded.lastEliteSpawn).toEqual({ zoneId: "pastures", variantId: "elite_pastures_boar", seq: 2 });
  });

  it("frischer Save (createGame): eliteZones sofort über den FRÜH-HAKEN befüllt (Pastures ~15–25 Min), Zähler/Breadcrumb leer", () => {
    const s = createGame({ name: "Neu" }, content, 42);
    expect(Object.keys(s.eliteZones).sort()).toEqual(content.zones.map((z) => z.id).sort());
    for (const entry of Object.values(s.eliteZones)) {
      expect("variantId" in entry).toBe(false);
    }
    const pastures = s.eliteZones.pastures as { cooldownMs: number };
    expect(pastures.cooldownMs).toBeGreaterThanOrEqual(15 * 60_000);
    expect(pastures.cooldownMs).toBeLessThanOrEqual(25 * 60_000);
    expect(s.eliteSpawnSeq).toBe(0);
    expect(s.lastEliteSpawn).toBeNull();
    expect(Number.isFinite(s.eliteRng.state)).toBe(true);
    // Round-Trip ohne jede Änderung bleibt stabil.
    const loaded = roundTrip(s);
    expect(loaded.eliteZones).toEqual(s.eliteZones);
  });
});
