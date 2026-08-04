import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Persistenz des „Jagd-Pakets" (design/elite-spawns-concept.md, Chef-GO 2026-07-22, selber
 * SAVE_VERSION-72-Bump wie das Elite-Fundament): Champion-Codex (`state.eliteCodex`) + Raben-Post-
 * Briefe (`MailMessage.kind === "letter"`). BEIDE Flächen sind rein ADDITIV zu bereits bestehenden
 * v72-Feldern (`eliteZones`) bzw. dem v71-`mailbox`-Array — kein weiterer SAVE_VERSION-Bump.
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("Champion-Codex-Persistenz (state.eliteCodex, SAVE 72 selber Bump)", () => {
  it("Migration: Alt-Save ohne das Feld bekommt ein leeres eliteCodex ({})", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    delete (s as Partial<GameState>).eliteCodex;
    const loaded = roundTrip(s);
    expect(loaded.eliteCodex).toEqual({});
  });

  it("Round-Trip erhält einen befüllten Codex-Eintrag verlustfrei (idempotent)", () => {
    const s = createGame({ name: "Champ" }, content, 1);
    s.eliteCodex = {
      elite_pastures_boar: { sightings: 5, kills: 3, uniques: 1, fastestKillMs: 12_345 },
      elite_ashfields_revenant: { sightings: 1, kills: 0, uniques: 0, fastestKillMs: null },
    };
    const loaded = roundTrip(s);
    expect(loaded.eliteCodex).toEqual(s.eliteCodex);
    const again = roundTrip(loaded);
    expect(again.eliteCodex).toEqual(loaded.eliteCodex);
  });

  it("sanitize härtet Struktur: unbekannte variantIds TOLERIERT (Content-Drift-Leitplanke)", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    (s.eliteCodex as Record<string, unknown>).ghost_variant_xyz = {
      sightings: 2,
      kills: 1,
      uniques: 0,
      fastestKillMs: 500,
    };
    const loaded = roundTrip(s);
    expect(loaded.eliteCodex.ghost_variant_xyz).toEqual({
      sightings: 2,
      kills: 1,
      uniques: 0,
      fastestKillMs: 500,
    });
  });

  it("sanitize klemmt Zahlen endlich/≥0/ganzzahlig; fastestKillMs negativ/NaN → null", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    (s.eliteCodex as unknown as Record<string, unknown>).broken = {
      sightings: Number.NaN,
      kills: -5,
      uniques: 2.7,
      fastestKillMs: -1,
    };
    (s.eliteCodex as unknown as Record<string, unknown>).brokenFastest = {
      sightings: 1,
      kills: 1,
      uniques: 0,
      fastestKillMs: Number.NaN,
    };
    const loaded = roundTrip(s);
    expect(loaded.eliteCodex.broken).toEqual({ sightings: 0, kills: 0, uniques: 2, fastestKillMs: null });
    expect(loaded.eliteCodex.brokenFastest?.fastestKillMs).toBeNull();
  });

  it("sanitize STRIKT: kaputtes eliteCodex-Shape (Array/Nicht-Objekt/fehlend) → {}, kein Crash", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    (s as unknown as { eliteCodex: unknown }).eliteCodex = ["not", "a", "record"];
    const loaded = roundTrip(s);
    expect(loaded.eliteCodex).toEqual({});

    const s2 = createGame({ name: "Editor2" }, content, 1);
    (s2 as unknown as { eliteCodex: unknown }).eliteCodex = null;
    const loaded2 = roundTrip(s2);
    expect(loaded2.eliteCodex).toEqual({});
  });

  it("frischer Save (createGame): eliteCodex startet leer", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    expect(s.eliteCodex).toEqual({});
  });
});

describe("Raben-Post-Briefe-Persistenz (MailMessage kind:\"letter\", SAVE 72 selber Bump)", () => {
  it("Round-Trip erhält einen Brief MIT Geschenk verlustfrei (Muster Überlauf-Mail-Items)", () => {
    const s = createGame({ name: "Brief" }, content, 1);
    s.mailbox = [
      {
        id: "mail_0",
        kind: "letter",
        createdSeq: 0,
        items: [{ itemId: "cooked_trout", qty: 5 }],
        instances: [],
        from: "brenna",
        textKey: "mail.letter.brenna.firstChampion",
      },
    ];
    s.mailSeq = 1;
    const loaded = roundTrip(s);
    expect(loaded.mailbox).toEqual(s.mailbox);
    const again = roundTrip(loaded);
    expect(again.mailbox).toEqual(loaded.mailbox);
  });

  it("ein Brief OHNE Geschenk (leere items/instances) wird NIE als 'leer' verworfen (anders als Überlauf-Mail)", () => {
    const s = createGame({ name: "Warden" }, content, 1);
    s.mailbox = [
      { id: "mail_0", kind: "letter", createdSeq: 0, items: [], instances: [], from: "warden", textKey: "mail.letter.warden.firstUnique" },
    ];
    s.mailSeq = 1;
    const loaded = roundTrip(s);
    expect(loaded.mailbox.length).toBe(1);
    expect(loaded.mailbox[0]).toEqual(s.mailbox[0]);
  });

  it("sanitize verwirft einen Brief mit ungültigem from/textKey, behält andere Mails", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    (s as unknown as { mailbox: unknown }).mailbox = [
      { id: "mail_bad_from", kind: "letter", createdSeq: 0, items: [], instances: [], from: "nobody", textKey: "x" },
      { id: "mail_bad_key", kind: "letter", createdSeq: 1, items: [], instances: [], from: "brenna", textKey: "" },
      { id: "mail_ok", kind: "letter", createdSeq: 2, items: [], instances: [], from: "warden", textKey: "mail.letter.warden.firstUnique" },
    ];
    const loaded = roundTrip(s);
    expect(loaded.mailbox.map((m) => m.id)).toEqual(["mail_ok"]);
  });

  it("sanitize härtet Brief-items wie Überlauf-Items (unbekannte Item-IDs raus, Stapelung, qty-Clamp)", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    (s as unknown as { mailbox: unknown }).mailbox = [
      {
        id: "mail_0",
        kind: "letter",
        createdSeq: 0,
        items: [
          { itemId: "cooked_trout", qty: 3 },
          { itemId: "cooked_trout", qty: 2 }, // stapelt → 5
          { itemId: "gibt_es_nicht", qty: 9 }, // unbekannt → raus
        ],
        instances: [],
        from: "brenna",
        textKey: "mail.letter.brenna.firstChampion",
      },
    ];
    const loaded = roundTrip(s);
    expect(loaded.mailbox[0]!.items).toEqual([{ itemId: "cooked_trout", qty: 5 }]);
  });

  it("collectMail auf einen geschenklosen Brief räumt ihn beim ersten Aufruf weg (gelesen = eingesammelt)", async () => {
    const { collectMail } = await import("@hearthforge/engine");
    const s = createGame({ name: "Reader" }, content, 1);
    s.mailbox = [
      { id: "mail_0", kind: "letter", createdSeq: 0, items: [], instances: [], from: "warden", textKey: "mail.letter.warden.firstUnique" },
    ];
    const res = collectMail(s, content, "mail_0");
    expect(res).toEqual({ collected: 0, partial: false });
    expect(s.mailbox.length).toBe(0);
  });

  it("unbekannte Mail-Sorte fällt raus, bekannte Sorten bleiben unangetastet nebeneinander im selben Array", () => {
    const s = createGame({ name: "Mixed" }, content, 1);
    (s as unknown as { mailbox: unknown }).mailbox = [
      { id: "mail_overflow", kind: "overflow", createdSeq: 0, items: [{ itemId: "copper_ore", qty: 3 }], instances: [] },
      { id: "mail_letter", kind: "letter", createdSeq: 1, items: [], instances: [], from: "brenna", textKey: "mail.letter.brenna.firstChampion" },
      { id: "mail_ghost", kind: "system_broadcast", createdSeq: 2, items: [], instances: [] },
    ];
    const loaded = roundTrip(s);
    expect(loaded.mailbox.map((m) => m.id).sort()).toEqual(["mail_letter", "mail_overflow"]);
  });

  it("frischer Save (createGame): keine Briefe, mailbox leer", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    expect(s.mailbox).toEqual([]);
  });
});
