import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { QUIVER_CAPACITY, SAVE_VERSION } from "@hearthforge/shared";
import { addItem, createGame, equipItem, plantCrop, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * claude:2026-10-24T15:21:04+02:00 — Save-Vertrag SAVE 94 (QA-Runde 2, 1.4.0): neuer Zähler `stats.harvestedById` (Beet-Ernte,
 * Klarheit B1) mit Migration (alte Saves starten bei 0) und Sanitizing; dazu die versionsfreien Lade-Härtungen dieser Runde:
 * laufende Aktion ohne Skill-Level endet (Spielstände B1), Grund `level_too_low` im Warteschlangen-Breadcrumb (B3), Köcher über
 * dem Deckel gibt den Überschuss verlustfrei ins Lager (Fernkampf B2). Alles Fixpunkt (zweites Laden ändert nichts).
 */
const AT = 1_761_900_000_000;
const H = 3_600_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

const load = (s: GameState, at = AT): GameState => deserialize(serialize(s, at), content, at)!.state;
function fixpoint(s: GameState): void {
  const once = serialize(load(s), AT);
  expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
}
function asVersion(s: GameState, v: number): string {
  const parsed = JSON.parse(serialize(s, AT)) as SaveShape;
  parsed.version = v;
  parsed.state.version = v;
  return JSON.stringify(parsed);
}

describe("SAVE 94: stats.harvestedById (Beet-Ernte)", () => {
  it("Vault v93: lädt auf v94, der Zähler startet leer, alles andere wie zuvor; Fixpunkt", () => {
    const raw = readFileSync(join(__dirname, "..", "fixtures", "save-compat", "v93-synthetic-1.4.0.json"), "utf8");
    const savedAt = (JSON.parse(raw) as SaveShape).savedAt;
    const s = deserialize(raw, content, savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(94); // claude:2026-10-24T16:03:31+02:00 — inzwischen 95 (Werkstatt B2)
    expect(s.stats.harvestedById).toEqual({});
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 250 }); // unter dem Deckel: unverändert
    expect(s.activeActionId).toBe("mine_copper"); // Level reicht: läuft weiter
    fixpoint(s);
  });

  it("Migration < 94: fehlender Zähler wird {}; ein vorhandener (erneut als Alt-Version geladen) bleibt", () => {
    const s = createGame({ name: "QA94" }, content, 3);
    delete (s.stats as { harvestedById?: unknown }).harvestedById;
    expect(deserialize(asVersion(s, 93), content, AT)!.state.stats.harvestedById).toEqual({});
    const t = createGame({ name: "QA94b" }, content, 4);
    t.stats.harvestedById = { herb_marshroot: 7 };
    expect(deserialize(asVersion(t, 93), content, AT)!.state.stats.harvestedById).toEqual({ herb_marshroot: 7 });
  });

  it("Sanitizing: nur bekannte Items, endliche positive Mengen; Fremdformen ⇒ {}", () => {
    const s = createGame({ name: "QA94c" }, content, 5);
    (s.stats as { harvestedById: unknown }).harvestedById = { herb_marshroot: 3, gibt_es_nicht: 9, graywort: -2, flax: "x" };
    expect(load(s).stats.harvestedById).toEqual({ herb_marshroot: 3 });
    (s.stats as { harvestedById: unknown }).harvestedById = [1, 2];
    expect(load(s).stats.harvestedById).toEqual({});
    (s.stats as { harvestedById: unknown }).harvestedById = null;
    expect(load(s).stats.harvestedById).toEqual({});
  });

  it("Beet-Ernte zählt offline in harvestedById und im Bericht, Fixpunkt danach", () => {
    const s = createGame({ name: "QA94d" }, content, 6);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    const crop = Object.values(content.crops ?? {}).sort((a, b) => a.growMs - b.growMs)[0]!;
    addItem(s.inventory, content, crop.seedItem, 20);
    expect(plantCrop(s, content, 0, crop.id)).toBe(true);
    const res = deserialize(serialize(s, AT), content, AT + 2 * H)!;
    const n = res.state.stats.harvestedById[crop.yieldItem] ?? 0;
    expect(n).toBeGreaterThan(0);
    expect(res.offline.farmHarvests?.find((h) => h.itemId === crop.yieldItem)?.qty).toBe(n);
    fixpoint(res.state);
  });
});

describe("Lade-Härtungen der QA-Runde 2 (versionsfrei)", () => {
  it("v94-Stand mit laufender Aktion über dem Skill-Level: endet beim Laden (level_too_low), nichts produziert, Fixpunkt", () => {
    const s = createGame({ name: "QA94e" }, content, 7);
    const id = "fletch_godiron_shortbow";
    for (const inp of content.actions[id]!.inputs ?? []) s.bank[inp.itemId] = 50;
    s.activeActionId = id;
    s.actionTarget = 3;
    s.actionProgressMs = 1234;
    const res = deserialize(serialize(s, AT), content, AT + H)!;
    expect(res.state.activeActionId).toBeNull();
    expect(res.state.actionTarget).toBeNull();
    expect(res.state.actionProgressMs).toBe(0);
    expect(res.state.lastStop).toEqual({ actionId: id, reason: "level_too_low" });
    expect(res.state.skills.bowcraft?.xp ?? 0).toBe(0);
    for (const inp of content.actions[id]!.inputs ?? []) expect(res.state.bank[inp.itemId]).toBe(50);
    fixpoint(res.state);
  });

  it("Breadcrumb level_too_low fällt beim Laden weg, sobald das Level reicht", () => {
    const s = createGame({ name: "QA94f" }, content, 8);
    const id = "fletch_godiron_shortbow";
    s.lastQueueSkip = { monsterId: "", actionId: id, reason: "level_too_low" };
    expect(load(s).lastQueueSkip).toEqual({ monsterId: "", actionId: id, reason: "level_too_low" });
    s.skills.bowcraft = { xp: xpForLevel(99) };
    expect(load(s).lastQueueSkip).toBeNull();
  });

  it("Köcher über dem Deckel: Überschuss geht beim Laden verlustfrei ins Lager, Gesamtzahl gleich, Fixpunkt", () => {
    const s = createGame({ name: "QA94g" }, content, 9);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    addItem(s.inventory, content, "copper_shortbow", 1);
    addItem(s.inventory, content, "copper_quiver", 1);
    expect(equipItem(s, content, "copper_shortbow").ok).toBe(true);
    expect(equipItem(s, content, "copper_quiver").ok).toBe(true);
    s.character.quiver = { itemId: "copper_arrow", qty: QUIVER_CAPACITY + 777 };
    s.bank.copper_arrow = 5;
    const out = load(s);
    expect(out.character.quiver).toEqual({ itemId: "copper_arrow", qty: QUIVER_CAPACITY });
    expect(out.bank.copper_arrow).toBe(782);
    fixpoint(out);
  });
});
