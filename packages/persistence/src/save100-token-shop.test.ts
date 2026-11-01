// claude:2026-10-30T22:28:00+01:00 — Save-Vertrag SAVE 100 (1.4.2 Belohnungsladen, design/1.4.2-belohnungsladen-plan.md § 5/§ 7):
// `tokenShopLedger` (Kaufbuch der Tages-/Wochengrenzen) und `settings.raidUseFeeWrit`. Migration < 100 (echtes v99-Fixture: nur die
// neuen Felder ändern sich), Sanitizing (Ganzzahlen ≥ 0, unbekannte Ids raus, Tag/Woche nicht hinter „heute“), Grenzen über Laden.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION, calendarWeekIndex, defaultTokenShopLedger } from "@hearthforge/shared";
import { buyTokenService, createGame, refreshDailyQuests, tokenServiceStatus } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";
import { erwarteSave100Flaechen } from "./save100-test-helper";
import { erwarteSave101Flaechen } from "./save101-test-helper"; // claude:2026-10-31T11:46:28+01:00 — SAVE 101
import { erwarteSave103Flaechen } from "./save103-test-helper"; // claude:2026-10-31T16:08:21+01:00 — SAVE 103
import { erwarteSave102Rueckgabe } from "./save102-test-helper"; // claude:2026-10-31T14:58:54+01:00 — SAVE 102

const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const AT = 1_762_300_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function load(state: unknown, version = SAVE_VERSION): GameState {
  const r = deserialize(JSON.stringify({ version, savedAt: AT, state }), content, AT);
  expect(r).not.toBeNull();
  return r!.state;
}

function fresh(): GameState {
  const s = createGame({ name: "Kaufbuch" }, content, 11);
  s.character.questTokens = 100;
  refreshDailyQuests(s, content, 20261102);
  return s;
}

describe("SAVE 100: Migration < 100 (echtes v99-Fixture)", () => {
  it("leeres Kaufbuch, Schein-Schalter aus, sonst byte-genau derselbe Stand", () => {
    const json = readFileSync(join(VAULT_DIR, "v99-synthetic-1.4.2.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(99);
    expect((raw.state as Partial<GameState>).tokenShopLedger).toBeUndefined();
    const s = deserialize(json, content, raw.savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.tokenShopLedger).toEqual(defaultTokenShopLedger());
    expect(s.settings.raidUseFeeWrit).toBe(false);
    const erwartet = structuredClone(raw.state);
    erwarteSave100Flaechen(erwartet);
    erwarteSave101Flaechen(erwartet); // claude:2026-10-31T11:46:28+01:00 — SAVE 101 (1.4.2): keine angepinnten Rezepte
    erwarteSave103Flaechen(erwartet); // claude:2026-10-31T16:08:21+01:00 — SAVE 103 (1.4.2): drei leere Warteschlangen-Vorlagen
    erwarteSave102Rueckgabe(erwartet); // claude:2026-10-31T14:58:54+01:00 — SAVE 102 (1.4.2): Dev-Stand, nur die Rückgabe (54 Narben, Ränge weg)
    erwartet.version = SAVE_VERSION;
    expect((JSON.parse(serialize(s, raw.savedAt)) as SaveShape).state).toEqual(erwartet);
  });

  it("idempotent: ein zweites Laden ändert nichts mehr", () => {
    const json = readFileSync(join(VAULT_DIR, "v99-synthetic-1.4.2.json"), "utf-8");
    const savedAt = (JSON.parse(json) as SaveShape).savedAt;
    const once = serialize(deserialize(json, content, savedAt)!.state, savedAt);
    expect(serialize(deserialize(once, content, savedAt)!.state, savedAt)).toBe(once);
  });
});

describe("SAVE 100: Sanitizing des Kaufbuchs", () => {
  it("Zähler ganzzahlig ≥ 0, unbekannte Ids und Null-Zähler raus, weggewürfelte Karten nur bekannte Tagesaufgaben ohne Doppel", () => {
    const s = fresh();
    const daily = content.quests.find((q) => q.daily)!.id;
    (s as unknown as Record<string, unknown>).tokenShopLedger = {
      day: 20261102.7,
      week: calendarWeekIndex(20261102),
      byDay: { svc_daily_reroll: 2.9, svc_nope: 4, ts_raid_writ_1: -1, svc_skill_lesson: "3", svc_order_call_2: 0, __proto__x: 1 },
      byWeek: { svc_skill_lesson: 7, ts_raid_writ_1: 1, ts_cooked_trout_50: Number.NaN },
      rerolledDailies: [daily, daily, "q_unknown", 42, "chronicle_01"],
      extra: true,
    };
    const out = load(s);
    expect(out.tokenShopLedger).toEqual({
      day: 20261102,
      week: calendarWeekIndex(20261102),
      byDay: { svc_daily_reroll: 2 },
      byWeek: { svc_skill_lesson: 7, ts_raid_writ_1: 1 },
      rerolledDailies: [daily],
    });
    // Fixpunkt
    expect(load(out).tokenShopLedger).toEqual(out.tokenShopLedger);
  });

  it("fehlt/kaputt ⇒ leer; Tag und Woche nie hinter den letzten Daily-Tag (Zähler bleiben stehen)", () => {
    for (const bad of [undefined, null, 7, "x", [1, 2]]) {
      const s = fresh();
      (s as unknown as Record<string, unknown>).tokenShopLedger = bad;
      expect(load(s).tokenShopLedger).toEqual(defaultTokenShopLedger());
    }
    const s = fresh();
    s.tokenShopLedger = { day: 20991231, week: 999_999, byDay: { svc_order_call_2: 2 }, byWeek: { svc_skill_lesson: 7 }, rerolledDailies: [] };
    const out = load(s);
    expect(out.tokenShopLedger.day).toBe(20261102);
    expect(out.tokenShopLedger.week).toBe(calendarWeekIndex(20261102));
    expect(out.tokenShopLedger.byDay).toEqual({ svc_order_call_2: 2 });
    expect(tokenServiceStatus(out, content, "svc_order_call_2").remaining).toBe(0);
    expect(tokenServiceStatus(out, content, "svc_skill_lesson").remaining).toBe(0);
  });

  it("Schein-Schalter strikt boolean", () => {
    const s = fresh();
    (s.settings as unknown as Record<string, unknown>).raidUseFeeWrit = "yes";
    expect(load(s).settings.raidUseFeeWrit).toBe(false);
    s.settings.raidUseFeeWrit = true;
    expect(load(s).settings.raidUseFeeWrit).toBe(true);
  });
});

describe("SAVE 100: Grenzen und Würfel überleben Speichern und Laden", () => {
  it("verbrauchte Grenzen, Staffelpreis und weggewürfelte Karte bleiben; Round-Trip stabil", () => {
    const s = fresh();
    expect(buyTokenService(s, content, "svc_order_call_2").ok).toBe(true);
    s.workOrders!.tierMs![2] = 1_000;
    expect(buyTokenService(s, content, "svc_order_call_2").ok).toBe(true);
    const target = s.quests.daily.quests.find((d) => buyTokenService(structuredClone(s), content, "svc_daily_reroll", d.questId).ok)!.questId;
    expect(buyTokenService(s, content, "svc_daily_reroll", target).ok).toBe(true);
    const json = serialize(s, AT);
    const back = deserialize(json, content, AT)!.state;
    expect(back.tokenShopLedger).toEqual(s.tokenShopLedger);
    expect(back.tokenShopLedger.rerolledDailies).toEqual([target]);
    expect(tokenServiceStatus(back, content, "svc_order_call_2")).toMatchObject({ remaining: 0, reason: "limit" });
    expect(tokenServiceStatus(back, content, "svc_daily_reroll").price).toBe(3);
    expect(serialize(back, AT)).toBe(json);
  });
});
