import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { addItem, computeStats, createGame, equipItem, loadQuiver, startCombat, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Prüfrunde Fernkampf (kontrolleur, 2026-10-23): Persistenz-Grenzfälle Köcher-Ladung (SAVE 91),
 * Nachfüll-Option, SKILL_RENAME-Falle `fletching`, Raid-Köcher, Offline-Aufholen. Nur Nachweise.
 */
const AT = 1_761_300_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function archer(bow = "copper_shortbow", quiver = "copper_quiver"): GameState {
  const s = createGame({ name: "QA", baseAttributes: { dex: 8, con: 10 } }, content, 5);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
  addItem(s.inventory, content, bow, 1);
  addItem(s.inventory, content, quiver, 1);
  expect(equipItem(s, content, bow).ok).toBe(true);
  expect(equipItem(s, content, quiver).ok).toBe(true);
  s.character.hp = computeStats(s, content).maxHp;
  return s;
}

function mutate(s: GameState, fn: (save: SaveShape) => void): string {
  const save = JSON.parse(serialize(s, AT)) as SaveShape;
  fn(save);
  return JSON.stringify(save);
}

describe("Köcher-Ladung: kaputte Werte", () => {
  it.each([
    ["String", "12"],
    ["negativ", -5],
    ["Infinity", "Infinity"],
    ["NaN", "NaN"],
    ["Objekt", { a: 1 }],
  ])("qty %s wird zu 0 (Art bleibt gemerkt)", (_label, raw) => {
    const s = archer();
    s.bank.copper_arrow = 3;
    loadQuiver(s, content, "copper_arrow");
    const json = mutate(s, (save) => {
      const q = save.state.character.quiver as unknown as { qty: unknown };
      q.qty = raw === "Infinity" ? 1e400 : raw === "NaN" ? "x" : raw;
    });
    const out = deserialize(json, content, AT)!.state;
    expect(out.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 });
    expect(out.bank.copper_arrow).toBeUndefined();
  });

  it("Ladung einer Nicht-Pfeil-ID (Alt-Item) fällt weg, ohne etwas ins Lager zu schreiben", () => {
    const s = archer();
    const json = mutate(s, (save) => {
      (save.state.character as { quiver: unknown }).quiver = { itemId: "copper_bar", qty: 50 };
    });
    const out = deserialize(json, content, AT)!.state;
    expect(out.character.quiver).toBeNull();
    expect(out.bank.copper_bar).toBeUndefined();
  });

  it("Save ohne `bank`, aber mit Ladung und ohne Köcher: Laden darf nicht crashen, Pfeile landen im Lager", () => {
    const s = archer();
    s.bank.copper_arrow = 10;
    loadQuiver(s, content, "copper_arrow");
    const json = mutate(s, (save) => {
      delete (save.state as Partial<GameState>).bank;
      save.state.character.equipment.offhand = null;
    });
    const res = deserialize(json, content, AT);
    expect(res).not.toBeNull();
    expect(res!.state.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 }); // claude:2026-10-26T04:05:00+02:00 — ohne Köcher bleibt die Art als leere Ladung gemerkt (Nachfüllen nach Kit-Wechsel, QA-Fernkampf P3)
    expect(res!.state.bank.copper_arrow).toBe(10);
  });

  it("Ladung oberhalb des Fernkampf-Levels bleibt nach dem Laden aktiv (keine Neuprüfung)", () => {
    const s = archer();
    s.bank.godiron_arrow = 20;
    loadQuiver(s, content, "godiron_arrow");
    const json = mutate(s, (save) => {
      save.state.skills.ranged = { xp: 0 };
    });
    const out = deserialize(json, content, AT)!.state;
    // Beobachtung: die Ladung bleibt; der Bonus greift weiter (Engine prüft das Level nur beim Einlegen).
    expect(out.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 20 });
  });
});

describe("Einstellungen und Skill-Umbenennung", () => {
  it("quiverAutoRefill als String/Zahl wird auf Standard „an“ gesetzt, false bleibt false", () => {
    const s = archer();
    for (const raw of ["no", 0, null]) {
      const json = mutate(s, (save) => {
        (save.state.settings as unknown as Record<string, unknown>).quiverAutoRefill = raw;
      });
      expect(deserialize(json, content, AT)!.state.settings.quiverAutoRefill).toBe(true);
    }
    const off = mutate(s, (save) => {
      save.state.settings.quiverAutoRefill = false;
    });
    expect(deserialize(off, content, AT)!.state.settings.quiverAutoRefill).toBe(false);
  });

  it("Alt-Key `fletching` faltet in Handwerk, ein echtes `bowcraft`-Konto daneben bleibt unangetastet", () => {
    const s = archer();
    const json = mutate(s, (save) => {
      save.state.skills.leatherworking = { xp: 1000 };
      save.state.skills.bowcraft = { xp: 777 };
      (save.state.skills as Record<string, { xp: number }>).fletching = { xp: 500 };
    });
    const out = deserialize(json, content, AT)!.state;
    expect(out.skills.leatherworking).toEqual({ xp: 1500 });
    expect(out.skills.bowcraft).toEqual({ xp: 777 });
    expect((out.skills as Record<string, unknown>).fletching).toBeUndefined();
    // Idempotent: zweiter Lauf ändert nichts mehr.
    const again = deserialize(serialize(out, AT), content, AT)!.state;
    expect(again.skills.leatherworking).toEqual({ xp: 1500 });
    expect(again.skills.bowcraft).toEqual({ xp: 777 });
  });
});

describe("Raid-Köcher und Offline-Aufholen", () => {
  it("Raid-Köcher (mythisch) + Bogen + Ladung überstehen den Round-Trip; neben Schwert fliegt er ohne Brief", () => {
    const s = archer("copper_shortbow", "gk_quarter_quiver_mythic");
    s.bank.godiron_arrow = 99;
    loadQuiver(s, content, "godiron_arrow");
    const st = deserialize(serialize(s, AT), content, AT)!.state; // erster Load markiert Entdeckungen
    expect(st.character.equipment.offhand).toBe("gk_quarter_quiver_mythic");
    expect(st.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 99 });
    const once = serialize(st, AT);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once); // Fixpunkt
    const mails = s.mailbox?.length ?? 0;
    const json = mutate(s, (save) => {
      save.state.character.equipment.mainhand = "bronze_sword";
    });
    const out = deserialize(json, content, AT)!.state;
    expect(out.character.equipment.offhand).toBeNull();
    expect(out.character.quiver).toEqual({ itemId: "godiron_arrow", qty: 0 }); // claude:2026-10-26T04:05:00+02:00 — ohne Köcher bleibt die Art als leere Ladung gemerkt (Nachfüllen nach Kit-Wechsel, QA-Fernkampf P3)
    expect(out.bank.godiron_arrow).toBe(99);
    expect(out.mailbox?.length ?? 0).toBe(mails);
  });

  it("Offline-Aufholen beim Laden verbraucht Pfeile und füllt aus dem Lager nach", () => {
    const s = archer();
    s.bank.copper_arrow = 300;
    loadQuiver(s, content, "copper_arrow", 5);
    expect(startCombat(s, content, "chicken")).toBe(true);
    const json = serialize(s, AT);
    const res = deserialize(json, content, AT + 10 * 60_000)!;
    expect(res.offlineMs).toBeGreaterThanOrEqual(10 * 60_000 - 1);
    const st = res.state;
    expect(st.combat.kills).toBeGreaterThan(5);
    expect((st.bank.copper_arrow ?? 0) + st.character.quiver!.qty).toBeLessThan(300);
    expect(st.bank.copper_arrow ?? 0).toBeLessThan(295); // mindestens einmal nachgefüllt
    expect(st.character.quiver!.qty).toBeGreaterThan(0);
  });
});
