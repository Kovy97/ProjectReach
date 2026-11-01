// claude:2026-10-31T16:08:21+01:00 — Save-Vertrag SAVE 103 (1.4.2 Warteschlangen-Vorlagen): `queueTemplates`. Migration < 103 (echtes
// v102-Fixture: nur das neue Feld ändert sich), Sanitizing (drei Plätze, Namen, bekannte Ids, Längen), Vorlagen über Laden und Speichern.
// Die Aschesturz-Einstufung („keep“) prüft engine/queue-templates.test.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { QUEUE_TEMPLATE_MAX_ENTRIES, SAVE_VERSION, makeFightQueueEntry } from "@hearthforge/shared";
import { createGame, enqueueAction, enqueueFight, loadQueueTemplate, saveQueueTemplate } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";
import { erwarteSave103Flaechen } from "./save103-test-helper";

const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const AT = 1_762_300_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function load(state: unknown, version = SAVE_VERSION): GameState {
  const r = deserialize(JSON.stringify({ version, savedAt: AT, state }), content, AT);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("SAVE 103: Migration < 103 (echtes v102-Fixture)", () => {
  it("drei leere Plätze, sonst byte-genau derselbe Stand", () => {
    const json = readFileSync(join(VAULT_DIR, "v102-synthetic-1.4.2.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(102);
    expect((raw.state as Partial<GameState>).queueTemplates).toBeUndefined();
    const s = deserialize(json, content, raw.savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.queueTemplates).toEqual([null, null, null]);
    const erwartet = structuredClone(raw.state);
    erwarteSave103Flaechen(erwartet);
    erwartet.version = SAVE_VERSION;
    expect((JSON.parse(serialize(s, raw.savedAt)) as SaveShape).state).toEqual(erwartet);
  });

  it("ein v102-Dev-Stand, der das Feld schon trägt, behält seine Vorlagen (gehärtet)", () => {
    const json = readFileSync(join(VAULT_DIR, "v102-synthetic-1.4.2.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    (raw.state as unknown as Record<string, unknown>).queueTemplates = [
      { name: "Alt", entries: [{ kind: "action", actionId: "mine_copper", target: 5 }, { kind: "action", actionId: "weg", target: 1 }] },
    ];
    const s = deserialize(JSON.stringify(raw), content, raw.savedAt)!.state;
    expect(s.queueTemplates).toEqual([{ name: "Alt", entries: [{ kind: "action", actionId: "mine_copper", target: 5 }] }, null, null]);
  });

  it("idempotent: ein zweites Laden ändert nichts mehr", () => {
    const json = readFileSync(join(VAULT_DIR, "v102-synthetic-1.4.2.json"), "utf-8");
    const savedAt = (JSON.parse(json) as SaveShape).savedAt;
    const once = serialize(deserialize(json, content, savedAt)!.state, savedAt);
    expect(serialize(deserialize(once, content, savedAt)!.state, savedAt)).toBe(once);
  });
});

describe("SAVE 103: Sanitizing der Vorlagen", () => {
  it("fehlt/kaputt ⇒ drei leere Plätze", () => {
    for (const bad of [undefined, null, 7, "x", { a: 1 }, []]) {
      const s = createGame({ name: "Planer" }, content, 3);
      (s as unknown as Record<string, unknown>).queueTemplates = bad;
      expect(load(s).queueTemplates).toEqual([null, null, null]);
    }
  });

  it("Name gehärtet, unbekannte Ids raus, Ziele normalisiert, höchstens 30 Einträge, Fixpunkt", () => {
    const s = createGame({ name: "Planer" }, content, 3);
    const many = Array.from({ length: QUEUE_TEMPLATE_MAX_ENTRIES + 4 }, () => ({ kind: "action", actionId: "mine_copper", target: 1 }));
    (s as unknown as Record<string, unknown>).queueTemplates = [
      { name: "x".repeat(40), entries: [{ kind: "fight", monsterId: "chicken", target: 0 }, { kind: "dungeon", dungeonId: "nirgendwo", target: 1 }] },
      { name: "\u0007Lang", entries: many },
      { name: null, entries: null },
      { name: "überzählig", entries: [] },
    ];
    const out = load(s);
    expect(out.queueTemplates).toHaveLength(3);
    expect(out.queueTemplates[0]).toEqual({ name: "x".repeat(24), entries: [makeFightQueueEntry("chicken", null)] });
    expect(out.queueTemplates[1]!.name).toBe("Lang");
    expect(out.queueTemplates[1]!.entries).toHaveLength(QUEUE_TEMPLATE_MAX_ENTRIES);
    expect(out.queueTemplates[2]).toEqual({ name: "", entries: [] });
    expect(load(out).queueTemplates).toEqual(out.queueTemplates);
  });
});

describe("SAVE 103: Vorlagen überleben Speichern und Laden", () => {
  it("Inhalt und Reihenfolge bleiben, Round-Trip byte-stabil, danach weiter ladbar", () => {
    const s = createGame({ name: "Planer" }, content, 5);
    enqueueAction(s, content, "mine_copper", 25);
    enqueueFight(s, content, "chicken", 10);
    expect(saveQueueTemplate(s, 1, "Runde")).toBe(true);
    const json = serialize(s, AT);
    const back = deserialize(json, content, AT)!.state;
    expect(back.queueTemplates[1]).toEqual({
      name: "Runde",
      entries: [{ kind: "action", actionId: "mine_copper", target: 25 }, makeFightQueueEntry("chicken", 10)],
    });
    expect(serialize(back, AT)).toBe(json);
    back.actionQueue = [];
    expect(loadQueueTemplate(back, content, 1)).toEqual({ added: 2, skipped: 0 });
  });
});
