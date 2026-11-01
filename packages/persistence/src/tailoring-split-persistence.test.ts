import { createRng as createRngW3, deriveEventRngSeed } from "@hearthforge/engine"; // claude:2026-10-25T00:30:00+02:00
import { defaultRaidState, defaultSkillEventState, defaultWorkOrderState } from "@hearthforge/shared";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ActionDef, ContentDB, GameState } from "@hearthforge/shared";
import { LEATHERWORKING_SKILL_ID, SAVE_VERSION, TAILORING_SKILL_ID, defaultPrestigeState } from "@hearthforge/shared";
import { createGame, levelFromXp, xpForLevel, storagePredicate } from "@hearthforge/engine";
import { erwarteSave99Flaechen } from "./save99-test-helper"; // claude:2026-10-30T19:01:00+01:00 — SAVE 99
import { erwarteSave100Flaechen } from "./save100-test-helper"; // claude:2026-10-30T22:28:00+01:00 — SAVE 100
import { erwarteSave101Flaechen } from "./save101-test-helper"; // claude:2026-10-31T11:46:28+01:00 — SAVE 101
import { erwarteSave103Flaechen } from "./save103-test-helper"; // claude:2026-10-31T16:08:21+01:00 — SAVE 103
import { deserialize, serialize, tailoringXpFromCraftLog } from "./index";

/**
 * Skill-Split „Schneidern" (SAVE_VERSION 85 → 86, Chef-Entscheid 28.08.2026, design/handwerk-fasern-jagen/
 * spec-technik.md §6): der Skill `leatherworking` (Handwerk) gibt alles aus Stoff an den neuen Skill
 * `tailoring` ab. Die Migration teilt die Handwerk-XP NACH TATSÄCHLICH HERGESTELLTEM: für jedes Rezept,
 * das jetzt `tailoring` ist, zählt `stats.craftedById[ergebnis] × rezept.xp`; dann
 * `tailoring.xp = min(Σ, leatherworking.xp)`, `leatherworking.xp −= tailoring.xp`.
 *
 * Dieser Test pinnt: (1) die Rechenregel mit Beispielzahlen aus dem echten Content (Roben, Weben,
 * Umhang; ein Leder-Stück zählt NICHT), (2) den Fall ohne Zähler (0 / unverändert), (3) die Klemme auf
 * das Handwerk-Konto (nie unter 0, Gesamt-XP erhalten), (4) den Fall ohne Handwerk-Konto, (5) die
 * konservative Sperre für Ergebnis-Items, die auch ein Nicht-Schneidern-Rezept liefert, (6) Idempotenz
 * (ein v86-Save wird nie ein zweites Mal geteilt), (7) das Vault-Fixture `v86-synthetic-1.2.0.json`.
 */

const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const SAVED_AT = 1_756_400_000_000;

type SaveShape = { version: number; savedAt: number; state: GameState };

function action(id: string): ActionDef {
  const a = content.actions[id];
  if (!a) throw new Error(`Aktion ${id} fehlt im Content`);
  return a;
}

/** Ein v85-Save (vor dem Split) aus createGame + Handwerk-XP + Craft-Zählern, über die echte serialize-Kette. */
function preSplitSave(opts: { lwXp?: number; crafted?: Record<string, number>; withTailoringKey?: number }, c: ContentDB = content): SaveShape {
  const s = createGame({ name: "Schneiderin" }, c, 21);
  s.character.createdAt = 1_700_000_000_000;
  if (opts.lwXp !== undefined) s.skills[LEATHERWORKING_SKILL_ID] = { xp: opts.lwXp };
  if (opts.withTailoringKey !== undefined) s.skills[TAILORING_SKILL_ID] = { xp: opts.withTailoringKey };
  if (opts.crafted) {
    s.stats.craftedById = { ...opts.crafted };
    s.stats.itemsCrafted = Object.values(opts.crafted).reduce((a, b) => a + b, 0);
  }
  const save = JSON.parse(serialize(s, SAVED_AT)) as SaveShape;
  // Vor dem Split gespeichert: Version 85 in Header UND State (die Migration schaltet über state.version).
  save.version = 85;
  save.state.version = 85;
  return save;
}

function load(save: SaveShape, c: ContentDB = content): GameState {
  const result = deserialize(JSON.stringify(save), c, save.savedAt);
  expect(result).not.toBeNull();
  expect(result!.offlineTicks).toBe(0);
  return result!.state;
}

describe("Skill-Split Schneidern (v85 → v86): XP-Aufteilung nach tatsächlich Hergestelltem", () => {
  it("Content-Vorbedingung: Roben/Weben/Umhänge sind tailoring, Leder-Rüstung bleibt leatherworking", () => {
    expect(content.skills[TAILORING_SKILL_ID]).toBeDefined();
    expect(action("craft_apprentice_robe").skill).toBe(TAILORING_SKILL_ID);
    expect(action("weave_linen").skill).toBe(TAILORING_SKILL_ID);
    expect(action("craft_leather_warcape").skill).toBe(TAILORING_SKILL_ID);
    expect(action("craft_leather_body").skill).toBe(LEATHERWORKING_SKILL_ID);
  });

  it("(1) Beispiel: 10 Lehrlings-Roben, 30 Leinen, 4 Leder-Kriegsumhänge, 5 Lederwämser → tailoring bekommt genau Roben+Leinen+Umhang", () => {
    const robe = action("craft_apprentice_robe"); // xp 8 → 10 × 8 = 80
    const linen = action("weave_linen"); // xp 22 → 30 × 22 = 660
    const cape = action("craft_leather_warcape"); // xp 18 → 4 × 18 = 72
    const body = action("craft_leather_body"); // leatherworking → zählt nicht
    const expected = 10 * robe.xp + 30 * linen.xp + 4 * cape.xp;
    expect(expected).toBe(812);

    const lwXp = 200_000;
    const save = preSplitSave({
      lwXp,
      crafted: { apprentice_robe_body: 10, cloth_linen: 30, leather_warcape: 4, cured_leather_body: 5 },
    });
    expect(save.state.skills[TAILORING_SKILL_ID]).toBeUndefined();

    const s = load(save);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.skills[TAILORING_SKILL_ID]).toEqual({ xp: expected });
    expect(s.skills[LEATHERWORKING_SKILL_ID]).toEqual({ xp: lwXp - expected });
    // Gesamt-XP exakt erhalten.
    expect(s.skills[TAILORING_SKILL_ID]!.xp + s.skills[LEATHERWORKING_SKILL_ID]!.xp).toBe(lwXp);
    // Die Zähler selbst bleiben unangetastet (Quests/Erfolge/Taverne lesen sie weiter).
    expect(s.stats.craftedById).toEqual({ apprentice_robe_body: 10, cloth_linen: 30, leather_warcape: 4, cured_leather_body: 5 });
    expect(body.skill).toBe(LEATHERWORKING_SKILL_ID);
  });

  it("(2) ohne Zähler: tailoring = { xp: 0 }, Handwerk unverändert", () => {
    const s = load(preSplitSave({ lwXp: 12_345 }));
    expect(s.skills[TAILORING_SKILL_ID]).toEqual({ xp: 0 });
    expect(s.skills[LEATHERWORKING_SKILL_ID]).toEqual({ xp: 12_345 });
  });

  it("(3) Klemme: mehr Stoff-XP gezählt als Handwerk hat → tailoring = Handwerk, Handwerk = 0 (nie negativ)", () => {
    // 100 Lehrlings-Roben à 8 XP = 800 > 500 Handwerk-XP.
    const s = load(preSplitSave({ lwXp: 500, crafted: { apprentice_robe_body: 100 } }));
    expect(s.skills[TAILORING_SKILL_ID]).toEqual({ xp: 500 });
    expect(s.skills[LEATHERWORKING_SKILL_ID]).toEqual({ xp: 0 });
  });

  it("(4) ohne Handwerk-Konto: tailoring = { xp: 0 }, kein leatherworking-Key erfunden", () => {
    const s = load(preSplitSave({ crafted: { apprentice_robe_body: 3 } }));
    expect(s.skills[TAILORING_SKILL_ID]).toEqual({ xp: 0 });
    expect(s.skills[LEATHERWORKING_SKILL_ID]).toBeUndefined();
  });

  it("(5) Ergebnis-Items, die auch ein Nicht-Schneidern-Rezept liefert, zählen konservativ nicht", () => {
    const smithRobe: ActionDef = {
      ...action("craft_apprentice_robe"),
      id: "forge_apprentice_robe_x",
      skill: "smithing",
      xp: 999,
    };
    const c: ContentDB = { ...content, actions: { ...content.actions, [smithRobe.id]: smithRobe } };
    const save = preSplitSave({ lwXp: 10_000, crafted: { apprentice_robe_body: 10, cloth_linen: 2 } }, c);
    expect(tailoringXpFromCraftLog(save.state, c)).toBe(2 * action("weave_linen").xp);
    const s = load(save, c);
    expect(s.skills[TAILORING_SKILL_ID]).toEqual({ xp: 2 * action("weave_linen").xp });
    expect(s.skills[LEATHERWORKING_SKILL_ID]).toEqual({ xp: 10_000 - 2 * action("weave_linen").xp });
  });

  it("(6) idempotent: ein bereits geteilter v86-Save wird beim nächsten Laden nicht erneut geteilt", () => {
    const first = load(preSplitSave({ lwXp: 200_000, crafted: { apprentice_robe_body: 10, cloth_linen: 30 } }));
    const tailoringXp = first.skills[TAILORING_SKILL_ID]!.xp;
    const lwXp = first.skills[LEATHERWORKING_SKILL_ID]!.xp;
    expect(tailoringXp).toBe(10 * action("craft_apprentice_robe").xp + 30 * action("weave_linen").xp);
    const again = deserialize(serialize(first, SAVED_AT), content, SAVED_AT)!.state;
    expect(again.skills[TAILORING_SKILL_ID]).toEqual({ xp: tailoringXp });
    expect(again.skills[LEATHERWORKING_SKILL_ID]).toEqual({ xp: lwXp });
    expect(again).toEqual(first);
  });

  it("frühe Stände mit vorhandenem tailoring-Key (Save-Edit) behalten ihn additiv; XP-Werte nicht-endlich → 0", () => {
    const s = load(preSplitSave({ lwXp: 1_000, crafted: { apprentice_robe_body: 5 }, withTailoringKey: 7 }));
    expect(s.skills[TAILORING_SKILL_ID]).toEqual({ xp: 7 + 5 * action("craft_apprentice_robe").xp });
    expect(s.skills[LEATHERWORKING_SKILL_ID]).toEqual({ xp: 1_000 - 5 * action("craft_apprentice_robe").xp });

    const broken = preSplitSave({ lwXp: 1_000, crafted: { apprentice_robe_body: 5 } });
    (broken.state.stats.craftedById as Record<string, unknown>).apprentice_robe_body = Number.NaN;
    (broken.state.stats.craftedById as Record<string, unknown>).cloth_linen = -4;
    expect(tailoringXpFromCraftLog(broken.state, content)).toBe(0);
  });

  it("Level-Sicht: Handwerk 99 mit vielen Roben kann unter 99 fallen — Erfolge/Marker bleiben, nichts geht verloren", () => {
    const lw99 = xpForLevel(99);
    const save = preSplitSave({ lwXp: lw99, crafted: { godspark_vestment: 400 } });
    save.state.achievements = ["ach_skill_leatherworking_99"];
    save.state.masteryCapes = { [LEATHERWORKING_SKILL_ID]: true };
    save.state.capeGranted = { [LEATHERWORKING_SKILL_ID]: true };
    const s = load(save);
    const moved = 400 * action("craft_godspark_vestment").xp;
    expect(s.skills[TAILORING_SKILL_ID]).toEqual({ xp: moved });
    expect(s.skills[LEATHERWORKING_SKILL_ID]).toEqual({ xp: lw99 - moved });
    expect(levelFromXp(lw99 - moved)).toBeLessThan(99);
    expect(s.achievements).toContain("ach_skill_leatherworking_99");
    expect(s.masteryCapes[LEATHERWORKING_SKILL_ID]).toBe(true);
    expect(s.capeGranted[LEATHERWORKING_SKILL_ID]).toBe(true);
  });
});

describe("v86-Fixture: Round-Trip mit geteiltem Handwerk", () => {
  it("lädt (Kette v86, aktuell ohne Migration), trägt tailoring > 0 UND leatherworking > 0 samt Craft-Zählern; Sanitize-Fixpunkt", () => {
    const json = readFileSync(join(VAULT_DIR, "v86-synthetic-1.2.0.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(86);
    expect(raw.state.version).toBe(86);
    const result = deserialize(json, content, raw.savedAt)!;
    expect(result.offlineTicks).toBe(0);
    const s = result.state;
    expect(s.skills[TAILORING_SKILL_ID]!.xp).toBeGreaterThan(0);
    expect(s.skills[LEATHERWORKING_SKILL_ID]!.xp).toBeGreaterThan(0);
    // Das Fixture wurde über die reale Kette aus einem v85-Stand gepinnt: die Aufteilung entspricht
    // exakt der Rechenregel auf seinen eigenen Craft-Zählern (Belegt, dass die Regel eingebacken ist).
    expect(s.skills[TAILORING_SKILL_ID]!.xp).toBe(Math.min(
      tailoringXpFromCraftLog(s, content),
      s.skills[TAILORING_SKILL_ID]!.xp + s.skills[LEATHERWORKING_SKILL_ID]!.xp,
    ));
    expect(Object.keys(s.stats.craftedById).length).toBeGreaterThan(0);
    // Sanitize-Fixpunkt: byte-genau derselbe Save, bis auf das v87-Delta.
    // v87 (Bank-Platzierung, Chef-Auftrag 31.08.2026 "wie OSRS"): Das Fixture ist v86, wird also
    // eine Version hochgezogen und bekommt `bankOrder` — die Faecher aus den vorhandenen
    // Bank-Eintraegen in alphabetischer Id-Reihenfolge. Die Mengen in `bank` bleiben unberuehrt.
    const erwartet = JSON.parse(JSON.stringify(raw)) as typeof raw;
    erwartet.version = SAVE_VERSION;
    erwartet.state.version = SAVE_VERSION;
    // v87 (vierter Werkzeug-Slot): migrateState baut den Equipment-Record generisch aus EQUIP_SLOTS
    // neu — `tool4` kommt als null dazu, im Charakter wie in jedem Kit-Spiegel.
    erwartet.state.character.equipment.tool4 = null;
    for (const kit of erwartet.state.equipKits) kit.equipment.tool4 = null;
    erwartet.state.bankOrder = Object.keys(erwartet.state.bank ?? {}).sort();
    // claude:2026-10-18T00:30:00+02:00 — Jagdbuch/Talentbäume (kein SAVE-Bump): sanitize ergänzt die Defaults.
    Object.assign(erwartet.state, { talents: {}, petPity: {} });
    erwartet.state.character.companionPetId2 = null;
    // claude:2026-10-17T23:30:00+02:00 — SAVE 88 (Prestige-Fundament): Default-Zustand für den Alt-Save.
    erwartet.state.prestige = defaultPrestigeState();
    Object.assign(erwartet.state.character, { meal: null, mealKeep: true }); // claude:2026-10-23T16:50:00+02:00 — SAVE 89 (Mahlzeit-Platz)
    erwartet.state.settings.estateNotifications = true;
    // claude:2026-10-23T22:05:00+02:00 — SAVE 90 (Materiallager): Option an, Lagerware ohne Bankfach, Lücken einmal geschlossen.
    erwartet.state.settings.materialsToStorage = true;
    erwartet.state.lockedItems = {}; // claude:2026-10-24T17:05:00+02:00 — SAVE 90 (Bergung): Schloss-Liste
    // claude:2026-10-24T20:25:00+02:00 — SAVE 91 (Bognerei): Köcher leer, Nachfüllen an.
    erwartet.state.settings.quiverAutoRefill = true;
    erwartet.state.character.quiver = null;
    // claude:2026-10-25T00:30:00+02:00 — SAVE 92 (Ereignisse/Aufträge): Strom aus rng abgeleitet, leere Listen.
    erwartet.state.eventRng = createRngW3(deriveEventRngSeed(erwartet.state.rng.state));
    erwartet.state.skillEvents = defaultSkillEventState();
    erwartet.state.workOrders = defaultWorkOrderState();
    // claude:2026-10-25T04:50:00+02:00 — SAVE 93 (Raid): leerer Raid-Zustand, Schalter aus.
    erwartet.state.raid = defaultRaidState();
    Object.assign(erwartet.state.settings, { raidAutoContinue: false, raidAutoBuyRestart: false });
    erwartet.state.stats.harvestedById = {}; // claude:2026-10-24T15:21:04+02:00 — SAVE 94 (Beet-Ernte-Zähler, alte Saves starten bei 0)
    erwartet.state.stats.producedBySkill = {}; // claude:2026-10-24T16:03:31+02:00 — SAVE 95 (Erzeugt je Skill, ohne offene Aufträge leer)
    erwartet.state.slayerAutoTask = false; // claude:2026-10-25T10:32:00+01:00 — SAVE 96 (1.4.1): Auto-Auftrag aus
    erwartet.state.inventory.variantCells = {}; // claude:2026-10-25T18:11:00+01:00 — SAVE 98: neues Feld, das Fixture hat keine reinen Variantengruppen
    erwarteSave99Flaechen(erwartet.state); // claude:2026-10-30T19:01:00+01:00 — SAVE 99 (1.4.2): Beete 12, Fallen 8, Raid-Laufanker, leeres Hauptbuch
    erwarteSave100Flaechen(erwartet.state); // claude:2026-10-30T22:28:00+01:00 — SAVE 100 (1.4.2): leeres Kaufbuch, Gebührenschein-Schalter aus
    erwarteSave101Flaechen(erwartet.state); // claude:2026-10-31T11:46:28+01:00 — SAVE 101 (1.4.2): keine angepinnten Rezepte
    erwarteSave103Flaechen(erwartet.state); // claude:2026-10-31T16:08:21+01:00 — SAVE 103 (1.4.2): drei leere Warteschlangen-Vorlagen
    erwartet.state.bankOrder = (erwartet.state.bankOrder ?? []).filter((id): id is string => typeof id === "string" && !storagePredicate(content)(id));
    expect(JSON.parse(serialize(s, raw.savedAt))).toEqual(erwartet);
  });
});
