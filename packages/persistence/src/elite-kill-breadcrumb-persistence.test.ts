import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Persistenz des Elite-Sieg-Breadcrumbs (`eliteKillSeq`/`lastEliteKill`, SAVE_VERSION 73→74,
 * Task #324): Migration (Alt-Save-Defaults), Round-Trip-Idempotenz und die sanitize-Härtung
 * (Unbekanntes → null, itemIds gegen Content, Seq-Monotonie). Muster jagd-paket-persistence.test.ts.
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

/** Ein legitimer, voll befüllter Breadcrumb (reale Content-Items). */
function validBreadcrumb(): NonNullable<GameState["lastEliteKill"]> {
  return {
    variantId: "elite_pastures_boar",
    atMs: 123_400,
    drops: [
      { itemId: "copper_ore", qty: 3 },
      { itemId: "cooked_trout", qty: 2 },
    ],
    uniqueItemId: "rusty_sword",
    suffixRolled: true,
    bountyTokens: 1,
    seq: 4,
  };
}

describe("Elite-Sieg-Breadcrumb — Migration v73→v74", () => {
  it("Alt-Save ohne die Felder (v73-Shape): eliteKillSeq 0, lastEliteKill null", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    delete (s as Partial<GameState>).eliteKillSeq;
    delete (s as Partial<GameState>).lastEliteKill;
    const loaded = roundTrip(s);
    expect(loaded.eliteKillSeq).toBe(0);
    expect(loaded.lastEliteKill).toBeNull();
  });

  it("frischer Save (createGame): eliteKillSeq 0, lastEliteKill null", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    expect(s.eliteKillSeq).toBe(0);
    expect(s.lastEliteKill).toBeNull();
  });
});

describe("Elite-Sieg-Breadcrumb — Round-Trip", () => {
  it("erhält einen befüllten Breadcrumb verlustfrei (idempotent)", () => {
    const s = createGame({ name: "Champ" }, content, 1);
    s.eliteKillSeq = 4;
    s.lastEliteKill = validBreadcrumb();
    const loaded = roundTrip(s);
    expect(loaded.eliteKillSeq).toBe(4);
    expect(loaded.lastEliteKill).toEqual(validBreadcrumb());
    const again = roundTrip(loaded);
    expect(again.lastEliteKill).toEqual(loaded.lastEliteKill);
    expect(again.eliteKillSeq).toBe(loaded.eliteKillSeq);
  });

  it("Quittier-Zustand (lastEliteKill null bei stehendem Zähler) bleibt erhalten — der Zähler wird NIE genullt", () => {
    const s = createGame({ name: "Ack" }, content, 1);
    s.eliteKillSeq = 7;
    s.lastEliteKill = null; // UI hat quittiert
    const loaded = roundTrip(s);
    expect(loaded.eliteKillSeq).toBe(7);
    expect(loaded.lastEliteKill).toBeNull();
  });
});

describe("Elite-Sieg-Breadcrumb — sanitize-Härtung", () => {
  it("kaputtes Gesamt-Shape (Array/String/Zahl/Objekt ohne variantId) → null, kein Crash", () => {
    for (const garbage of [["not", "an", "object"], "kaputt", 42, { drops: [] }]) {
      const s = createGame({ name: "Editor" }, content, 1);
      (s as unknown as { lastEliteKill: unknown }).lastEliteKill = garbage;
      const loaded = roundTrip(s);
      expect(loaded.lastEliteKill, JSON.stringify(garbage)).toBeNull();
    }
  });

  it("drops: unbekannte itemIds und ungültige Mengen (0/negativ/NaN) werden gestrippt, valide Zeilen bleiben", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    s.lastEliteKill = {
      ...validBreadcrumb(),
      drops: [
        { itemId: "copper_ore", qty: 3 },
        { itemId: "gibt_es_nicht", qty: 5 }, // unbekannt → raus
        { itemId: "cooked_trout", qty: 0 }, // Menge 0 → raus
        { itemId: "iron_ore", qty: Number.NaN }, // NaN → raus
        { itemId: "iron_ore", qty: -2 }, // negativ → raus
      ],
    };
    const loaded = roundTrip(s);
    expect(loaded.lastEliteKill!.drops).toEqual([{ itemId: "copper_ore", qty: 3 }]);
  });

  it("uniqueItemId: unbekannte Id → null UND suffixRolled fällt mit auf false (kein Unique ⇒ kein Unique-Suffix)", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    s.lastEliteKill = { ...validBreadcrumb(), uniqueItemId: "geloeschtes_unique", suffixRolled: true };
    const loaded = roundTrip(s);
    expect(loaded.lastEliteKill!.uniqueItemId).toBeNull();
    expect(loaded.lastEliteKill!.suffixRolled).toBe(false);
  });

  it("suffixRolled: nicht-boolescher Wert → false; atMs/bountyTokens/seq NaN/negativ → 0", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    s.lastEliteKill = {
      ...validBreadcrumb(),
      suffixRolled: "ja" as unknown as boolean,
      atMs: -5,
      bountyTokens: Number.NaN,
      seq: Number.POSITIVE_INFINITY,
    };
    const loaded = roundTrip(s);
    expect(loaded.lastEliteKill!.suffixRolled).toBe(false);
    expect(loaded.lastEliteKill!.atMs).toBe(0);
    expect(loaded.lastEliteKill!.bountyTokens).toBe(0);
    expect(loaded.lastEliteKill!.seq).toBe(0);
  });

  it("Monotonie: eliteKillSeq wird auf lastEliteKill.seq hochgezogen, NIE gesenkt (Muster eliteSpawnSeq)", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    s.eliteKillSeq = 1; // inkonsistent niedriger als der Breadcrumb
    s.lastEliteKill = validBreadcrumb(); // seq 4
    const loaded = roundTrip(s);
    expect(loaded.eliteKillSeq).toBe(4);

    const s2 = createGame({ name: "Editor2" }, content, 1);
    s2.eliteKillSeq = 10; // höher als der Breadcrumb — bleibt stehen
    s2.lastEliteKill = validBreadcrumb();
    const loaded2 = roundTrip(s2);
    expect(loaded2.eliteKillSeq).toBe(10);

    const s3 = createGame({ name: "Editor3" }, content, 1);
    (s3 as unknown as { eliteKillSeq: unknown }).eliteKillSeq = Number.NaN;
    s3.lastEliteKill = null;
    const loaded3 = roundTrip(s3);
    expect(loaded3.eliteKillSeq).toBe(0);
  });

  it("die variantId bleibt bewusst OHNE Content-Abgleich (stale Breadcrumb nach Content-Entfernung ist kosmetisch)", () => {
    const s = createGame({ name: "Drift" }, content, 1);
    s.eliteKillSeq = 4;
    s.lastEliteKill = { ...validBreadcrumb(), variantId: "elite_entfernte_variante" };
    const loaded = roundTrip(s);
    expect(loaded.lastEliteKill!.variantId).toBe("elite_entfernte_variante");
  });
});
