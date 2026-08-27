import { describe, expect, it } from "vitest";
import type { ContentDB, GameState, TavernTask } from "@hearthforge/shared";
import {
  CAMP_TAVERN_ID,
  TAVERN_COMBAT_XP_BY_BAND,
  TAVERN_GOLD_BY_BAND,
  TAVERN_KILL_COUNT_BY_BAND,
  TAVERN_SEATS,
  TAVERN_SWAP_GOLD_PER_BAND,
  defaultTavernState,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createTestGame, grantAllDungeons } from "./test-helpers";
import { tavernTestContent, TEST_TAVERN_GUESTS, TEST_TAVERN_TASKS } from "./tavern-test-content";
import { xpForLevel, levelFromXp } from "./leveling";
import { syncProgression, totalLevel } from "./character";
import { addItem, itemCount } from "./inventory";
import { bankCount } from "./bank";
import { campBuildStartReason, campUsedBuildSlots, campBuildSlots } from "./camp";
import { features } from "./features";

// Release-Schalter für die Tests einschalten (1.1.2 liefert die Taverne aus, 1.2.0 schaltet sie frei).
features.tavern = true;
import { useConsumable } from "./consumable";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { plantCrop, tickFarmPlots } from "./farming";
import {
  acceptTavernTask,
  bestXpPerMinute,
  deliverTavernTask,
  openBlackMarketCrate,
  rollCrateContents,
  swapTavernGuest,
  tavernBandFor,
  tavernBuilt,
  tavernCrateItemId,
  tavernFreeSwaps,
  tavernGuestDef,
  tavernHash,
  tavernHashFloat,
  tavernLevel,
  tavernRefresh,
  tavernSeatSummary,
  tavernSwapCost,
  tavernTaskProgress,
  tavernTemplateDef,
} from "./tavern";

/**
 * Taverne (1.2.0, SAVE 84 — design/1.2.0-alive/taverne-spec-technik.md): Besetzung, Bänder,
 * Zielauswahl, Belohnungsformeln, Baselines, Abgabe, Wechsel, Behälter, Zähler-Hooks. Alles auf
 * dem ECHTEN Katalog + Tavernen-Mini-Content (tavern-test-content.ts), unabhängig von der
 * parallelen content-dev-Lieferung. Determinismus-Gesetz: `state.rng` bleibt überall unberührt.
 */

const c = tavernTestContent();
const DAY = 20260827;
const CREATED_AT = 1_700_000_000_000;

const SKILLING = ["mining", "woodcutting", "fishing", "foraging", "cooking", "smithing", "leatherworking", "thieving", "herblore", "runecrafting", "jewelcrafting"];

/** Midgame-Held (Skills 30, Kampf 30, Slayer 25) mit gebauter Taverne I und Gold. */
function midgame(seed = 1, cc: ContentDB = c, level = 30): GameState {
  const s = createTestGame({ name: "Wirt" }, cc, seed);
  grantAllDungeons(s, cc);
  s.character.createdAt = CREATED_AT;
  for (const id of SKILLING) s.skills[id] = { xp: xpForLevel(level) };
  for (const id of ["attack", "power", "defence", "vitality"]) s.skills[id] = { xp: xpForLevel(level) };
  s.skills.slayer = { xp: xpForLevel(25) };
  syncProgression(s, cc);
  s.camp.buildings[CAMP_TAVERN_ID] = 1;
  s.camp.buildSeq += 1;
  s.character.gold = 10_000;
  return s;
}

/** Content nur mit den genannten Gästen (+ Halvard) und ihren Vorlagen. */
function contentWith(guestIds: string[], extra: Partial<ContentDB> = {}): ContentDB {
  const keep = new Set([...guestIds, "halvard"]);
  return tavernTestContent({
    tavernGuests: TEST_TAVERN_GUESTS.filter((g) => keep.has(g.id)),
    tavernTasks: TEST_TAVERN_TASKS.filter((t) => keep.has(t.guestId)),
    ...extra,
  });
}

function seatsOf(s: GameState) {
  return s.tavern.seats;
}

/** Fünf Abgabe-Gäste (2 Sammler + 3 Handwerker, nur deliver-Vorlagen) — vier Plätze voll, einer rückt nach. */
function deliverContent(): ContentDB {
  const asDeliver = (id: string, newId: string) => ({ ...TEST_TAVERN_TASKS.find((t) => t.id === id)!, id: newId, kind: "deliver" as const });
  return contentWith(["grumm", "brakka", "ilvara", "odo", "sefra"], {
    tavernTasks: [
      TEST_TAVERN_TASKS.find((t) => t.id === "grumm_deliver")!,
      TEST_TAVERN_TASKS.find((t) => t.id === "brakka_deliver")!,
      asDeliver("ilvara_produce", "ilvara_deliver"),
      asDeliver("odo_produce", "odo_deliver"),
      asDeliver("sefra_produce", "sefra_deliver"),
    ],
  });
}

function firstSeatOfKind(s: GameState, kind: TavernTask["kind"]): number {
  return seatsOf(s).findIndex((x) => x.task?.kind === kind);
}

/** Ein Tag, an dem der Fremde kommt (`hash(seed, day, 7) % 12 === 0`), ab `from` aufwärts gesucht. */
function strangerDay(seed: number, from = DAY): number {
  for (let d = from; d < from + 400; d++) if (tavernHash(seed, d, 7) % 12 === 0) return d;
  throw new Error("kein Fremder-Tag gefunden");
}

function stock(s: GameState, id: string): number {
  return itemCount(s.inventory, id) + bankCount(s, id);
}

describe("tavernHash — reiner Hash", () => {
  it("ist deterministisch, uint32, und der Float liegt in [0, 1)", () => {
    expect(tavernHash(1, 2, 3)).toBe(tavernHash(1, 2, 3));
    expect(tavernHash(1, 2, 3)).not.toBe(tavernHash(1, 2, 4));
    expect(tavernHash(CREATED_AT, DAY, 7)).toBe(tavernHash(CREATED_AT, DAY, 7));
    for (const v of [tavernHash(), tavernHash(0), tavernHash(CREATED_AT, DAY, 0, 0, 11, 3)]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4294967296);
    }
    for (let k = 0; k < 50; k++) {
      const f = tavernHashFloat(CREATED_AT, DAY, k);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
    // Große Zutaten (Epoch-ms > 2^32) gehen mit beiden Hälften ein: +2^32 ändert den Wert.
    expect(tavernHash(CREATED_AT, DAY)).not.toBe(tavernHash(CREATED_AT + 4294967296, DAY));
    // Nicht-endlich zählt als 0, wirft nie.
    expect(tavernHash(Number.NaN, DAY)).toBe(tavernHash(0, DAY));
  });
});

describe("Inertheit & Bau", () => {
  it("ohne Tavernen-Content: tavernRefresh ist ein No-op (kein Throw, keine Plätze)", () => {
    const plain: ContentDB = { ...content, tavernGuests: undefined, tavernTasks: undefined };
    const s = midgame(1, plain);
    expect(tavernRefresh(s, plain, DAY)).toBe(false);
    expect(s.tavern.seats).toEqual([]);
    expect(swapTavernGuest(s, plain, 0, DAY)).toBe("not_built");
    expect(deliverTavernTask(s, plain, 0, DAY)).toBe("no_task");
    expect(openBlackMarketCrate(s, plain, "black_market_crate_i")).toBeNull();
  });

  it("ungebaut: keine Besetzung, keine Gratis-Wechsel; gebaut: Stufe + Kontingent", () => {
    const s = midgame();
    delete s.camp.buildings[CAMP_TAVERN_ID];
    expect(tavernBuilt(s, c)).toBe(false);
    expect(tavernLevel(s)).toBe(0);
    expect(tavernFreeSwaps(s, c)).toBe(0);
    expect(tavernRefresh(s, c, DAY)).toBe(false);
    expect(s.tavern).toEqual(defaultTavernState());
    s.camp.buildings[CAMP_TAVERN_ID] = 1;
    expect(tavernBuilt(s, c)).toBe(true);
    expect(tavernFreeSwaps(s, c)).toBe(1);
    s.camp.buildings[CAMP_TAVERN_ID] = 2;
    expect(tavernFreeSwaps(s, c)).toBe(2);
    s.camp.buildings[CAMP_TAVERN_ID] = 3;
    expect(tavernLevel(s)).toBe(3);
    expect(tavernFreeSwaps(s, c)).toBe(2);
  });

  it("Bauplatz-Ausnahme: die Taverne belegt keinen Bauplatz (wie das Zentralhaus)", () => {
    const s = createTestGame({ name: "Bau" }, c, 3);
    // Zentralhaus 0 ⇒ 0 Bauplätze: ein normales Gebäude scheitert am Platz …
    expect(campBuildSlots(s, c)).toBe(0);
    expect(campBuildStartReason(s, c, "camp_fishing_hut")).toBe("no_slot");
    // … die Taverne nicht (nur Kosten fehlen), und mit Kosten geht sie ohne Bauplatz.
    expect(campBuildStartReason(s, c, CAMP_TAVERN_ID)).toBe("cannot_afford");
    s.character.gold = 5_000;
    addItem(s.inventory, c, "oak_log", 100);
    expect(campBuildStartReason(s, c, CAMP_TAVERN_ID)).toBe("ok");
    // Gebaut zählt sie nicht gegen das Limit.
    s.camp.buildings[CAMP_TAVERN_ID] = 1;
    s.camp.buildSeq += 1;
    expect(campUsedBuildSlots(s, c)).toBe(0);
    s.camp.buildJob = { buildingId: CAMP_TAVERN_ID, targetLevel: 1, remainingMs: 1000 };
    expect(campUsedBuildSlots(s, c)).toBe(0);
  });
});

describe("Besetzung — Determinismus, Idempotenz, Regeln", () => {
  it("besetzt vier verschiedene Gäste mit gültigen Aufgaben, rng unberührt", () => {
    const s = midgame();
    const rng = s.rng.state;
    expect(tavernRefresh(s, c, DAY)).toBe(true);
    expect(s.rng.state).toBe(rng);
    expect(s.tavern.day).toBe(DAY);
    const seats = seatsOf(s);
    expect(seats).toHaveLength(TAVERN_SEATS);
    const ids = seats.map((x) => x.guestId);
    expect(new Set(ids).size).toBe(TAVERN_SEATS);
    for (const seat of seats) {
      const guest = tavernGuestDef(c, seat.guestId)!;
      expect(guest).toBeTruthy();
      expect(guest.givesTasks).toBe(true);
      const task = seat.task!;
      expect(task).toBeTruthy();
      const tpl = tavernTemplateDef(c, task.templateId)!;
      expect(tpl.guestId).toBe(seat.guestId);
      expect(task.kind).toBe(tpl.kind);
      expect(task.band).toBe(tavernBandFor(s, c, guest));
      expect(task.count).toBeGreaterThanOrEqual(1);
      expect(task.accepted).toBe(false);
      expect(task.baseline).toBe(0);
      expect(task.rewardXp).toBeGreaterThan(0);
      expect(c.skills[task.rewardSkill]).toBeDefined();
      for (const r of task.rewardItems) {
        expect(c.items[r.id]).toBeDefined();
        expect(r.qty).toBeGreaterThanOrEqual(1);
      }
      switch (task.kind) {
        case "deliver":
        case "produce":
          expect(c.items[task.targetId]).toBeDefined();
          expect(c.actions[task.actionId!]).toBeDefined();
          break;
        case "run":
          expect(c.actions[task.targetId]).toBeDefined();
          break;
        case "kill":
          expect(c.monsters[task.targetId]).toBeDefined();
          break;
        case "dungeon":
          expect(c.dungeons.some((d) => d.id === task.targetId)).toBe(true);
          break;
        default:
          break;
      }
    }
  });

  it("gleicher Seed + Tag ⇒ identische Besetzung; anderer Tag ⇒ i. d. R. andere", () => {
    const a = midgame(1);
    const b = midgame(2); // anderer rng-Seed — die Taverne hängt NICHT daran
    tavernRefresh(a, c, DAY);
    tavernRefresh(b, c, DAY);
    expect(b.tavern.seats).toEqual(a.tavern.seats);
    let differs = false;
    for (let d = 1; d <= 5 && !differs; d++) {
      const x = midgame(1);
      tavernRefresh(x, c, DAY + d);
      differs = JSON.stringify(x.tavern.seats) !== JSON.stringify(a.tavern.seats);
    }
    expect(differs).toBe(true);
    // Anderer Charakter-Seed ⇒ i. d. R. andere Besetzung.
    const other = midgame(1);
    other.character.createdAt = CREATED_AT + 12345;
    tavernRefresh(other, c, DAY);
    expect(JSON.stringify(other.tavern.seats)).not.toBe(JSON.stringify(a.tavern.seats));
  });

  it("ist am selben Tag idempotent (zweiter Aufruf false, State unverändert)", () => {
    const s = midgame();
    tavernRefresh(s, c, DAY);
    const snapshot = JSON.stringify(s.tavern);
    expect(tavernRefresh(s, c, DAY)).toBe(false);
    expect(JSON.stringify(s.tavern)).toBe(snapshot);
    // Uhr-Rücksprung löst nichts aus.
    expect(tavernRefresh(s, c, DAY - 1)).toBe(false);
    expect(JSON.stringify(s.tavern)).toBe(snapshot);
    expect(tavernRefresh(s, c, Number.NaN)).toBe(false);
  });

  it("Besetzungs-Regeln: höchstens 1 Kampf-Gast, höchstens 2 Sammler — über 60 Tage", () => {
    for (let d = 0; d < 60; d++) {
      const s = midgame();
      tavernRefresh(s, c, DAY + d);
      const defs = seatsOf(s).map((x) => tavernGuestDef(c, x.guestId)!);
      expect(defs.filter((g) => g.skill === "slayer").length).toBeLessThanOrEqual(1);
      expect(defs.filter((g) => g.skill && ["mining", "woodcutting", "fishing", "foraging"].includes(g.skill)).length).toBeLessThanOrEqual(2);
      expect(defs.some((g) => g.id === "halvard")).toBe(false);
    }
  });

  it("Rare-Gäste nur an Hash-Tagen: Fremder kommt an seinem Tag (und zahlt Behälter), sonst nie", () => {
    const seed = CREATED_AT;
    const d = strangerDay(seed);
    const s = midgame();
    tavernRefresh(s, c, d);
    const seat = seatsOf(s).find((x) => x.guestId === "stranger");
    expect(seat).toBeTruthy();
    expect(seat!.task!.paysCrate).toBe(true);
    expect(seat!.task!.rewardGold).toBe(0);
    expect(seat!.task!.rewardItems).toEqual([]);
    expect(seat!.task!.rewardXp).toBeGreaterThan(0);
    // Ein Nicht-Fremder-Tag: kein Fremder, egal wie oft man wechselt.
    let plain = d + 1;
    while (tavernHash(seed, plain, 7) % 12 === 0) plain++;
    const t = midgame();
    tavernRefresh(t, c, plain);
    expect(seatsOf(t).some((x) => x.guestId === "stranger")).toBe(false);
    t.character.gold = 1_000_000;
    for (let i = 0; i < 12; i++) swapTavernGuest(t, c, i % TAVERN_SEATS, plain);
    expect(seatsOf(t).some((x) => x.guestId === "stranger")).toBe(false);
  });

  it("weniger Gäste als Plätze: Rest bleibt task null, kein Throw; unmögliche Vorlage lässt den Gast ausfallen", () => {
    const cc = contentWith(["grumm", "nessa"]);
    const s = midgame(1, cc);
    expect(tavernRefresh(s, cc, DAY)).toBe(true);
    const seats = seatsOf(s);
    expect(seats).toHaveLength(TAVERN_SEATS);
    expect(seats.filter((x) => x.task !== null)).toHaveLength(2);
    expect(seats.filter((x) => x.task === null)).toHaveLength(2);
    expect(tavernRefresh(s, cc, DAY)).toBe(false); // idempotent trotz freier Plätze
    // Grumm mit unmöglicher Kategorie fällt aus, Nessa bleibt.
    const cc2 = contentWith(["grumm", "nessa"], {
      tavernTasks: TEST_TAVERN_TASKS.filter((t) => t.guestId === "nessa").concat([
        { ...TEST_TAVERN_TASKS.find((t) => t.id === "grumm_deliver")!, select: { skill: "mining", categories: ["gibt_es_nicht"] } },
      ]),
    });
    const s2 = midgame(1, cc2);
    tavernRefresh(s2, cc2, DAY);
    const filled = seatsOf(s2).filter((x) => x.task !== null);
    expect(filled).toHaveLength(1);
    expect(filled[0]!.guestId).toBe("nessa");
  });

  it("angenommene Aufgabe überlebt den Tageswechsel; die anderen Plätze werden neu besetzt, Zähler resetten", () => {
    const s = midgame();
    tavernRefresh(s, c, DAY);
    const idx = firstSeatOfKind(s, "deliver") >= 0 ? firstSeatOfKind(s, "deliver") : 0;
    expect(acceptTavernTask(s, c, idx)).toBe(true);
    const kept = JSON.parse(JSON.stringify(seatsOf(s)[idx]));
    s.tavern.swapsUsed = 1;
    s.tavern.deliveredToday = 2;
    seatsOf(s)[(idx + 1) % TAVERN_SEATS]!.swaps = 3;
    expect(tavernRefresh(s, c, DAY + 1)).toBe(true);
    expect(s.tavern.day).toBe(DAY + 1);
    expect(s.tavern.swapsUsed).toBe(0);
    expect(s.tavern.deliveredToday).toBe(0);
    expect(seatsOf(s)[idx]).toEqual(kept);
    for (const seat of seatsOf(s)) expect(seat.swaps).toBe(0);
    const ids = seatsOf(s).map((x) => x.guestId);
    expect(new Set(ids).size).toBe(TAVERN_SEATS);
  });

  it("nachbesetzt freie Plätze am selben Tag (Platz nach sanitize leer)", () => {
    const s = midgame();
    tavernRefresh(s, c, DAY);
    seatsOf(s)[2]!.task = null;
    expect(tavernRefresh(s, c, DAY)).toBe(true);
    expect(seatsOf(s)[2]!.task).not.toBeNull();
    expect(new Set(seatsOf(s).map((x) => x.guestId)).size).toBe(TAVERN_SEATS);
  });
});

describe("Band & Zielauswahl", () => {
  it("Band aus dem Skill des Gastes bzw. Gesamtlevel-Band für Gäste ohne Beruf", () => {
    const s = midgame();
    const grumm = tavernGuestDef(c, "grumm")!;
    const stranger = tavernGuestDef(c, "stranger")!;
    s.skills.mining = { xp: xpForLevel(20) };
    expect(tavernBandFor(s, c, grumm)).toBe(1);
    s.skills.mining = { xp: xpForLevel(21) };
    expect(tavernBandFor(s, c, grumm)).toBe(2);
    s.skills.mining = { xp: xpForLevel(99) };
    expect(tavernBandFor(s, c, grumm)).toBe(5);
    // Gesamtlevel-Band: 1–199 / 200–499 / 500–899 / 900–1299 / 1300+
    const total = totalLevel(s, c);
    expect(total).toBeGreaterThan(500);
    expect(tavernBandFor(s, c, stranger)).toBe(total >= 900 ? 4 : total >= 500 ? 3 : total >= 200 ? 2 : 1);
    s.skills.mining = { xp: xpForLevel(30) };
    expect(totalLevel(s, c)).toBeLessThan(500);
    expect(tavernBandFor(s, c, stranger)).toBe(2);
    for (const id of Object.keys(c.skills)) s.skills[id] = { xp: xpForLevel(99) };
    syncProgression(s, c);
    expect(tavernBandFor(s, c, stranger)).toBe(5);
  });

  it("Ziel-Aktion liegt im Fenster levelRequired ≤ Level + 5 und nie unter Level − 25", () => {
    for (const lvl of [1, 12, 30, 60, 99]) {
      for (let d = 0; d < 6; d++) {
        const s = midgame(1, c, lvl);
        tavernRefresh(s, c, DAY + d);
        for (const seat of seatsOf(s)) {
          const task = seat.task;
          if (!task || !task.actionId) continue;
          const a = c.actions[task.actionId]!;
          const level = levelFromXp(s.skills[a.skill]?.xp ?? 0);
          const lr = a.levelRequired ?? 1;
          expect(lr).toBeLessThanOrEqual(level + 5);
          // Boden: entweder ≥ Level − 25 oder das höchste erreichbare Tier des Skills.
          const top = Math.max(...Object.values(c.actions).filter((x) => x.skill === a.skill && (x.levelRequired ?? 1) <= level).map((x) => x.levelRequired ?? 1));
          expect(lr >= level - 25 || lr === top).toBe(true);
          expect(task.requiredLevel).toBe(lr);
        }
      }
    }
  });

  it("Vorlagen-Filter greifen: hasInputs, itemType, equipSlots, Kategorie", () => {
    const cc = contentWith(["odo", "merrit", "kell"]);
    const s = midgame(1, cc, 40);
    tavernRefresh(s, cc, DAY);
    for (const seat of seatsOf(s)) {
      if (!seat.task) continue;
      const a = cc.actions[seat.task.actionId!]!;
      const tpl = tavernTemplateDef(cc, seat.task.templateId)!;
      if (tpl.select.hasInputs !== undefined) expect((a.inputs?.length ?? 0) > 0).toBe(tpl.select.hasInputs);
      if (tpl.select.itemType) expect(cc.items[seat.task.targetId]!.type).toBe(tpl.select.itemType);
    }
    // Merrit nur ab Band 2: bei Schmieden 15 (Band 1) fällt er aus.
    const low = midgame(1, contentWith(["merrit"]), 15);
    tavernRefresh(low, contentWith(["merrit"]), DAY);
    expect(seatsOf(low).every((x) => x.task === null)).toBe(true);
  });

  it("kill-Ziel: Welt-Monster freigeschalteter Zonen mit Level ≤ Kampflevel + 5, Menge nach Band", () => {
    const cc = contentWith(["viktor"]);
    const s = midgame(1, cc);
    s.skills.slayer = { xp: xpForLevel(15) }; // Band 1 ⇒ nur kill (dungeon ab Band 3)
    tavernRefresh(s, cc, DAY);
    const seat = seatsOf(s).find((x) => x.task?.kind === "kill")!;
    expect(seat).toBeTruthy();
    const task = seat.task!;
    const m = cc.monsters[task.targetId]!;
    expect(m.dungeonOnly).toBeFalsy();
    expect(m.id.startsWith("dg_")).toBe(false);
    expect(m.level).toBeLessThanOrEqual(30 + 5);
    expect(task.count).toBe(TAVERN_KILL_COUNT_BY_BAND[1]);
    expect(task.rewardSkill).toBe("slayer");
    expect(task.rewardXp).toBe(TAVERN_COMBAT_XP_BY_BAND[1]);
    expect(task.rewardGold).toBe(Math.round(TAVERN_GOLD_BY_BAND[1]! * 1.3));
    // Rohstoff: häufigster Material-Drop × band × 3
    if (task.rewardItems.length > 0) {
      expect(task.rewardItems[0]!.qty).toBe(3);
      expect(cc.items[task.rewardItems[0]!.id]!.type).toBe("material");
    }
  });

  it("champion nur ab Band 4 und nur bekannte Varianten; dungeon aus freigeschalteten", () => {
    const cc = contentWith(["viktor"], { tavernTasks: TEST_TAVERN_TASKS.filter((t) => t.id === "viktor_champion" || t.id === "viktor_dungeon") });
    // Band 5 Slayer, aber leerer Codex ⇒ nur Dungeon möglich.
    const s = midgame(1, cc, 60);
    s.skills.slayer = { xp: xpForLevel(85) };
    tavernRefresh(s, cc, DAY);
    const seat = seatsOf(s).find((x) => x.task !== null)!;
    expect(seat.task!.kind).toBe("dungeon");
    expect(seat.task!.count).toBe(1);
    expect(seat.task!.rewardXp).toBe(TAVERN_COMBAT_XP_BY_BAND[5]! * 2);
    expect(seat.task!.rewardGold).toBe(Math.round(TAVERN_GOLD_BY_BAND[5]! * 2));
    // Mit bekannter Variante kann Champion fallen: nur Champion-Vorlage anbieten.
    const cc2 = contentWith(["viktor"], { tavernTasks: TEST_TAVERN_TASKS.filter((t) => t.id === "viktor_champion") });
    const s2 = midgame(1, cc2, 60);
    s2.skills.slayer = { xp: xpForLevel(85) };
    const variantId = Object.keys(cc2.elites!)[0]!;
    s2.eliteCodex[variantId] = { sightings: 1, kills: 0, uniques: 0, fastestKillMs: null };
    tavernRefresh(s2, cc2, DAY);
    const ch = seatsOf(s2).find((x) => x.task !== null)!;
    expect(ch.task!.kind).toBe("champion");
    expect(ch.task!.targetId).toBe(variantId);
    expect(ch.task!.rewardXp).toBe(TAVERN_COMBAT_XP_BY_BAND[5]! * 2);
    // Band 3 ⇒ Champion fällt aus.
    const s3 = midgame(1, cc2, 60);
    s3.skills.slayer = { xp: xpForLevel(50) };
    s3.eliteCodex[variantId] = { sightings: 1, kills: 0, uniques: 0, fastestKillMs: null };
    tavernRefresh(s3, cc2, DAY);
    expect(seatsOf(s3).every((x) => x.task === null)).toBe(true);
  });

  it("Belohnungsformel: Gold = Band-Tabelle × Art-Faktor (× 1,15 bei Taverne III); XP = Minuten × 1,5 × bestXpPerMinute", () => {
    const cc = contentWith(["grumm"]);
    const s = midgame(1, cc);
    tavernRefresh(s, cc, DAY);
    const seat = seatsOf(s).find((x) => x.task !== null)!;
    const task = seat.task!;
    const tpl = tavernTemplateDef(cc, task.templateId)!;
    const factor = task.kind === "produce" ? 1.2 : 1.0;
    expect(task.rewardGold).toBe(Math.round(TAVERN_GOLD_BY_BAND[task.band]! * factor));
    const minutes = tpl.minutes[task.band - 1]!;
    expect(task.rewardXp).toBe(Math.round(minutes * 1.5 * bestXpPerMinute(cc, "mining", 30)));
    expect(bestXpPerMinute(cc, "mining", 30)).toBeGreaterThan(0);
    // Ziel-Item × ceil(count × 0,4)
    expect(task.rewardItems[0]).toEqual({ id: task.targetId, qty: Math.ceil(task.count * 0.4) });
    // Taverne III ⇒ Gold × 1,15
    const s3 = midgame(1, cc);
    s3.camp.buildings[CAMP_TAVERN_ID] = 3;
    tavernRefresh(s3, cc, DAY);
    const t3 = seatsOf(s3).find((x) => x.task !== null)!.task!;
    expect(t3.rewardGold).toBe(Math.round(TAVERN_GOLD_BY_BAND[t3.band]! * (t3.kind === "produce" ? 1.2 : 1.0) * 1.15));
  });

  it("Handwerks-Aufgabe: Belohnung enthält die Inputs für ceil(count / 2) Durchläufe", () => {
    const cc = contentWith(["odo"]);
    const s = midgame(1, cc, 40);
    tavernRefresh(s, cc, DAY);
    const task = seatsOf(s).find((x) => x.task !== null)!.task!;
    const a = cc.actions[task.actionId!]!;
    expect(a.inputs!.length).toBeGreaterThan(0);
    const extraRuns = Math.ceil(task.count / 2);
    for (const input of a.inputs!) {
      const r = task.rewardItems.find((x) => x.id === input.itemId);
      expect(r, `Input ${input.itemId} fehlt`).toBeTruthy();
      expect(r!.qty).toBeGreaterThanOrEqual(input.qty * extraRuns);
    }
  });
});

describe("Annahme, Fortschritt, Abgabe", () => {
  it("deliver: Bestand zählt (Inventar + Lager), Abgabe verbraucht erst Inventar, dann Lager, zahlt exakt die Belohnung", () => {
    const cc = deliverContent();
    const s = midgame(1, cc);
    tavernRefresh(s, cc, DAY);
    const idx = firstSeatOfKind(s, "deliver");
    expect(idx).toBeGreaterThanOrEqual(0);
    const seat = seatsOf(s)[idx]!;
    const task = JSON.parse(JSON.stringify(seat.task)) as TavernTask;
    const guestId = seat.guestId;
    // Ohne Annahme: Bestand sichtbar, aber nicht abgebbar.
    addItem(s.inventory, cc, task.targetId, 2);
    s.bank[task.targetId] = task.count; // Lager deckt den Rest
    expect(tavernTaskProgress(s, cc, task)).toEqual({ have: task.count, need: task.count, deliverable: false });
    expect(deliverTavernTask(s, cc, idx, DAY)).toBe("not_accepted");
    expect(acceptTavernTask(s, cc, idx)).toBe(true);
    expect(acceptTavernTask(s, cc, idx)).toBe(false);
    expect(seat.task!.baseline).toBe(0);
    expect(tavernTaskProgress(s, cc, seat.task!).deliverable).toBe(true);
    const gold = s.character.gold;
    const xp = s.skills[task.rewardSkill]?.xp ?? 0;
    const before = new Map(task.rewardItems.map((r) => [r.id, stock(s, r.id)]));
    const rng = s.rng.state;
    expect(deliverTavernTask(s, cc, idx, DAY)).toBe("ok");
    expect(s.rng.state).toBe(rng);
    // Verbrauch: 2 aus dem Inventar, Rest aus dem Lager.
    expect(itemCount(s.inventory, task.targetId)).toBe(task.rewardItems.find((r) => r.id === task.targetId)?.qty ?? 0);
    expect(s.bank[task.targetId] ?? 0).toBe(2);
    expect(s.character.gold).toBe(gold + task.rewardGold);
    expect(s.skills[task.rewardSkill]!.xp).toBe(xp + task.rewardXp);
    for (const r of task.rewardItems) {
      const delta = r.id === task.targetId ? -(task.count - 2) : 0; // Ziel-Item wurde vorher abgezogen (nur Inventar-Anteil)
      expect(stock(s, r.id) - before.get(r.id)!).toBe(r.qty + delta - (r.id === task.targetId ? 2 : 0));
    }
    // Zähler + Breadcrumb
    expect(s.tavern.deliveredToday).toBe(1);
    expect(s.tavern.totalDelivered).toBe(1);
    expect(s.tavern.deliverSeq).toBe(1);
    expect(s.tavern.deliveredByGuest[guestId]).toBe(1);
    expect(s.tavern.lastDelivery).toMatchObject({ seq: 1, guestId, gold: task.rewardGold, xp: task.rewardXp, skill: task.rewardSkill, items: task.rewardItems });
    // Platz sofort neu besetzt: anderer Gast, swaps + 1, nicht angenommen.
    expect(seat.swaps).toBe(1);
    expect(seat.guestId).not.toBe(guestId);
    expect(seat.task).not.toBeNull();
    expect(seat.task!.accepted).toBe(false);
    expect(new Set(seatsOf(s).map((x) => x.guestId)).size).toBe(TAVERN_SEATS);
  });

  it("produce/run/kill: Baseline bei Annahme, Fortschritt = Zähler − Baseline, incomplete bis erfüllt", () => {
    const cc = contentWith(["grumm", "pim", "viktor"], {
      tavernTasks: TEST_TAVERN_TASKS.filter((t) => t.id === "grumm_produce" || t.id === "pim_run" || t.id === "viktor_kill"),
    });
    const s = midgame(1, cc);
    s.skills.slayer = { xp: xpForLevel(15) };
    tavernRefresh(s, cc, DAY);
    const counters: Record<string, (id: string) => Record<string, number>> = {
      produce: () => s.stats.producedById,
      run: () => s.stats.actionRunsById,
      kill: () => s.monsterKills,
    };
    for (const kind of ["produce", "run", "kill"] as const) {
      const idx = firstSeatOfKind(s, kind);
      expect(idx, `kein ${kind}-Platz`).toBeGreaterThanOrEqual(0);
      const task = seatsOf(s)[idx]!.task!;
      const rec = counters[kind]!(task.targetId);
      rec[task.targetId] = 7; // Vorgeschichte darf nicht zählen
      expect(tavernTaskProgress(s, cc, task).have).toBe(0);
      expect(acceptTavernTask(s, cc, idx)).toBe(true);
      expect(task.baseline).toBe(7);
      expect(tavernTaskProgress(s, cc, task)).toEqual({ have: 0, need: task.count, deliverable: false });
      expect(deliverTavernTask(s, cc, idx, DAY)).toBe("incomplete");
      rec[task.targetId] = 7 + task.count - 1;
      expect(tavernTaskProgress(s, cc, task).have).toBe(task.count - 1);
      rec[task.targetId] = 7 + task.count + 5;
      expect(tavernTaskProgress(s, cc, task)).toEqual({ have: task.count, need: task.count, deliverable: true });
      const gold = s.character.gold;
      const xp = s.skills[task.rewardSkill]?.xp ?? 0;
      expect(deliverTavernTask(s, cc, idx, DAY)).toBe("ok");
      expect(s.character.gold).toBe(gold + task.rewardGold);
      expect(s.skills[task.rewardSkill]!.xp).toBe(xp + task.rewardXp);
    }
    expect(s.tavern.totalDelivered).toBe(3);
  });

  it("Aufgabe über dem Level ist annehmbar; produce/run mit fehlender Stufe liefert 'level'", () => {
    const cc = contentWith(["grumm"], { tavernTasks: TEST_TAVERN_TASKS.filter((t) => t.id === "grumm_produce") });
    let found: { s: GameState; idx: number } | null = null;
    for (let d = 0; d < 40 && !found; d++) {
      const s = midgame(1, cc);
      tavernRefresh(s, cc, DAY + d);
      const idx = seatsOf(s).findIndex((x) => x.task && x.task.requiredLevel > 30);
      if (idx >= 0) found = { s, idx };
    }
    expect(found, "keine Aufgabe über dem Level in 40 Tagen").toBeTruthy();
    const { s, idx } = found!;
    const task = seatsOf(s)[idx]!.task!;
    expect(acceptTavernTask(s, cc, idx)).toBe(true);
    s.stats.producedById[task.targetId] = task.count;
    expect(tavernTaskProgress(s, cc, task).deliverable).toBe(false);
    expect(deliverTavernTask(s, cc, idx, DAY)).toBe("level");
    s.skills.mining = { xp: xpForLevel(task.requiredLevel) };
    expect(deliverTavernTask(s, cc, idx, DAY)).toBe("ok");
  });

  it("Fremder/Karawane: Abgabe zahlt einen Behälter des Bands statt Gold + Rohstoffe, XP bleibt", () => {
    const seed = CREATED_AT;
    const d = strangerDay(seed);
    const s = midgame();
    tavernRefresh(s, c, d);
    const idx = seatsOf(s).findIndex((x) => x.guestId === "stranger");
    expect(idx).toBeGreaterThanOrEqual(0);
    const task = seatsOf(s)[idx]!.task!;
    expect(task.paysCrate).toBe(true);
    expect(acceptTavernTask(s, c, idx)).toBe(true);
    if (task.kind === "assortment") {
      const per = task.count / 3;
      for (const id of task.targetIds!) addItem(s.inventory, c, id, per);
    } else if (task.kind === "kill") {
      s.monsterKills[task.targetId] = (s.monsterKills[task.targetId] ?? 0) + task.count;
    }
    expect(tavernTaskProgress(s, c, task).deliverable).toBe(true);
    const gold = s.character.gold;
    const xp = s.skills[task.rewardSkill]?.xp ?? 0;
    const crate = tavernCrateItemId(task.band);
    expect(deliverTavernTask(s, c, idx, d)).toBe("ok");
    expect(s.character.gold).toBe(gold);
    expect(s.skills[task.rewardSkill]!.xp).toBe(xp + task.rewardXp);
    expect(stock(s, crate)).toBeGreaterThanOrEqual(1);
    expect(s.tavern.lastDelivery!.crates[0]).toBe(crate);
    expect(s.tavern.lastDelivery!.gold).toBe(0);
    if (task.kind === "assortment") for (const id of task.targetIds!) expect(stock(s, id)).toBe(0);
  });

  it("10-%-Bonus-Behälter fällt über viele Abgaben in etwa jeder zehnten (Hash über deliverSeq)", () => {
    const cc = deliverContent();
    const s = midgame(1, cc);
    s.settings.autoBank = true;
    tavernRefresh(s, cc, DAY);
    let bonus = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const idx = i % TAVERN_SEATS;
      const task = seatsOf(s)[idx]!.task;
      if (!task) {
        tavernRefresh(s, cc, DAY);
        continue;
      }
      s.bank[task.targetId] = (s.bank[task.targetId] ?? 0) + task.count;
      acceptTavernTask(s, cc, idx);
      expect(deliverTavernTask(s, cc, idx, DAY)).toBe("ok");
      if (s.tavern.lastDelivery!.crates.length > 0) bonus++;
    }
    expect(bonus).toBeGreaterThan(5);
    expect(bonus).toBeLessThan(40);
    expect(s.tavern.deliverSeq).toBe(N);
  });
});

describe("Wechsel", () => {
  it("Gratis-Kontingent, dann 100 × Band Gold; angenommen nicht wechselbar; no_gold; rng unberührt", () => {
    const s = midgame();
    tavernRefresh(s, c, DAY);
    const rng = s.rng.state;
    expect(tavernSwapCost(s, c, 0)).toBe(0);
    const before = seatsOf(s)[0]!.guestId;
    expect(swapTavernGuest(s, c, 0, DAY)).toBe("ok");
    expect(seatsOf(s)[0]!.guestId).not.toBe(before);
    expect(seatsOf(s)[0]!.swaps).toBe(1);
    expect(s.tavern.swapsUsed).toBe(1);
    expect(s.character.gold).toBe(10_000);
    const band = seatsOf(s)[1]!.task!.band;
    expect(tavernSwapCost(s, c, 1)).toBe(TAVERN_SWAP_GOLD_PER_BAND * band);
    expect(swapTavernGuest(s, c, 1, DAY)).toBe("ok");
    expect(s.character.gold).toBe(10_000 - TAVERN_SWAP_GOLD_PER_BAND * band);
    expect(s.stats.goldSpent).toBe(TAVERN_SWAP_GOLD_PER_BAND * band);
    expect(s.tavern.swapsUsed).toBe(2);
    acceptTavernTask(s, c, 2);
    expect(swapTavernGuest(s, c, 2, DAY)).toBe("accepted");
    s.character.gold = 0;
    expect(swapTavernGuest(s, c, 3, DAY)).toBe("no_gold");
    expect(swapTavernGuest(s, c, 9, DAY)).toBe("no_seat");
    expect(s.rng.state).toBe(rng);
    expect(new Set(seatsOf(s).map((x) => x.guestId)).size).toBe(TAVERN_SEATS);
    // Taverne II: zwei Gratis-Wechsel am neuen Tag.
    s.camp.buildings[CAMP_TAVERN_ID] = 2;
    tavernRefresh(s, c, DAY + 1);
    s.character.gold = 0;
    expect(swapTavernGuest(s, c, 0, DAY + 1)).toBe("ok");
    expect(swapTavernGuest(s, c, 1, DAY + 1)).toBe("ok");
    expect(swapTavernGuest(s, c, 3, DAY + 1)).toBe("no_gold");
  });

  it("kein Nachrücker ⇒ no_guest, nichts passiert", () => {
    const cc = contentWith(["grumm", "nessa"]);
    const s = midgame(1, cc);
    tavernRefresh(s, cc, DAY);
    const idx = seatsOf(s).findIndex((x) => x.task !== null);
    const snap = JSON.stringify(s.tavern);
    expect(swapTavernGuest(s, cc, idx, DAY)).toBe("no_guest");
    expect(JSON.stringify(s.tavern)).toBe(snap);
  });

  it("tavernSeatSummary liefert Gast, Vorlage, Band, Fortschritt und Wechselkosten", () => {
    const s = midgame();
    tavernRefresh(s, c, DAY);
    const sum = tavernSeatSummary(s, c, 0)!;
    expect(sum.guest!.id).toBe(seatsOf(s)[0]!.guestId);
    expect(sum.template!.id).toBe(seatsOf(s)[0]!.task!.templateId);
    expect(sum.progress!.need).toBe(seatsOf(s)[0]!.task!.count);
    expect(sum.swapCost).toBe(0);
    expect(sum.band).toBe(seatsOf(s)[0]!.task!.band);
    expect(tavernSeatSummary(s, c, 7)).toBeNull();
  });
});

describe("Schwarzmarktbehälter", () => {
  it("Inhalt: 2 Materialien des Bands × 3–8 + ein Ausrüstungsstück; deterministisch; verbraucht genau 1 Stück", () => {
    const s = midgame();
    addItem(s.inventory, c, "black_market_crate_ii", 2);
    const preview = rollCrateContents(s, c, 2);
    expect(preview).toEqual(rollCrateContents(s, c, 2));
    const rng = s.rng.state;
    const res = openBlackMarketCrate(s, c, "black_market_crate_ii")!;
    expect(res).toBeTruthy();
    expect(res.tier).toBe(2);
    expect(res.items).toEqual(preview);
    expect(s.rng.state).toBe(rng);
    expect(itemCount(s.inventory, "black_market_crate_ii")).toBe(1);
    const mats = res.items.filter((i) => c.items[i.id]!.type === "material" && !c.items[i.id]!.rune);
    expect(mats.length).toBeGreaterThanOrEqual(2);
    for (const m of mats.slice(0, 2)) {
      expect(m.qty).toBeGreaterThanOrEqual(3);
      expect(m.qty).toBeLessThanOrEqual(8);
    }
    expect(res.items.some((i) => c.items[i.id]!.type === "equipment")).toBe(true);
    for (const i of res.items) expect(stock(s, i.id)).toBeGreaterThanOrEqual(i.qty);
    // Der zweite Behälter würfelt anders (itemsGathered ist gewachsen).
    const res2 = openBlackMarketCrate(s, c, "black_market_crate_ii")!;
    expect(itemCount(s.inventory, "black_market_crate_ii")).toBe(0);
    expect(JSON.stringify(res2.items)).not.toBe(JSON.stringify(res.items));
    // Kein Bestand ⇒ null; kein Behälter-Item ⇒ null.
    expect(openBlackMarketCrate(s, c, "black_market_crate_ii")).toBeNull();
    expect(openBlackMarketCrate(s, c, "copper_ore")).toBeNull();
    // Aus dem Lager öffnen geht ebenfalls.
    s.bank["black_market_crate_v"] = 1;
    expect(openBlackMarketCrate(s, c, "black_market_crate_v")).toBeTruthy();
    expect(s.bank["black_market_crate_v"]).toBeUndefined();
  });

  it("useConsumable delegiert und verbraucht NICHT doppelt (Auto-Rebuff-Sperre für Sonder-Wirkungen: consumable-slayer-reroll.test.ts)", () => {
    const s = midgame();
    addItem(s.inventory, c, "black_market_crate_i", 3);
    const rng = s.rng.state;
    expect(useConsumable(s, c, "black_market_crate_i")).toBe(true);
    expect(itemCount(s.inventory, "black_market_crate_i")).toBe(2);
    expect(s.rng.state).toBe(rng);
    expect(s.stats.itemsGathered).toBeGreaterThan(0);
  });

  it("Seltene Beigaben über viele Öffnungen: Rune des Band-Tiers, Champion-Unikat nur aus besiegten Varianten", () => {
    const s = midgame();
    s.settings.autoBank = true;
    const variantId = Object.keys(c.elites!)[0]!;
    const unique = c.elites![variantId]!.uniqueItemId;
    s.eliteCodex[variantId] = { sightings: 3, kills: 1, uniques: 0, fastestKillMs: null };
    let runes = 0;
    let uniques = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      s.tavern.deliverSeq = i; // andere Zutat je Öffnung
      const res = rollCrateContents(s, c, 3);
      if (res.some((x) => c.items[x.id]!.rune?.tier === 3)) runes++;
      if (res.some((x) => x.id === unique)) uniques++;
      expect(res.some((x) => c.items[x.id]!.rune && c.items[x.id]!.rune!.tier !== 3)).toBe(false);
    }
    expect(runes).toBeGreaterThan(3);
    expect(runes).toBeLessThan(60);
    expect(uniques).toBeGreaterThan(10);
    expect(uniques).toBeLessThan(100);
  });
});

describe("Zähler-Hooks", () => {
  it("tick: actionRunsById je erfolgreichem Durchlauf, producedById je erzeugtem Stück (online == offline)", () => {
    const run = (offline: boolean) => {
      const s = createTestGame({ name: "Z" }, c, 11);
      s.skills.mining = { xp: xpForLevel(30) };
      setActiveAction(s, c, "mine_copper");
      advance(s, c, 60_000, { offline });
      return s;
    };
    const a = run(false);
    const b = run(true);
    const runs = a.stats.actionRunsById["mine_copper"] ?? 0;
    expect(runs).toBeGreaterThan(0);
    expect(a.stats.producedById["copper_ore"]).toBe(a.stats.itemsGathered);
    expect(a.stats.producedById["copper_ore"]).toBeGreaterThanOrEqual(runs);
    expect(b.stats.actionRunsById).toEqual(a.stats.actionRunsById);
    expect(b.stats.producedById).toEqual(a.stats.producedById);
  });

  it("farming: Ernte zählt in producedById", () => {
    const s = createTestGame({ name: "F" }, c, 12);
    addItem(s.inventory, c, "graywort_seed", 2);
    expect(plantCrop(s, c, 0, "graywort")).toBe(true);
    const crop = c.crops!["graywort"]!;
    s.elapsedMs += crop.growMs;
    tickFarmPlots(s, c);
    expect(s.stats.producedById["graywort"]).toBeGreaterThanOrEqual(crop.yieldMin);
    expect(s.stats.producedById["graywort"]).toBe(stock(s, "graywort"));
  });
});

describe("Integration gegen den echten Content", () => {
  const real = content;
  const ready = (real.tavernGuests?.length ?? 0) > 0 && (real.tavernTasks?.length ?? 0) > 0;
  it.skipIf(!ready)("jeder Gast mit givesTasks liefert an einem Midgame-Save mindestens ein gültiges Ziel", () => {
    const cc: ContentDB = { ...real, campBuildings: real.campBuildings?.some((b) => b.id === CAMP_TAVERN_ID) ? real.campBuildings : c.campBuildings };
    for (const g of real.tavernGuests!.filter((x) => x.givesTasks)) {
      const solo: ContentDB = { ...cc, tavernGuests: [g], tavernTasks: real.tavernTasks!.filter((t) => t.guestId === g.id) };
      const s = midgame(1, solo, 45);
      s.skills.slayer = { xp: xpForLevel(45) };
      // Champion-Vorlagen brauchen bekannte Varianten.
      for (const id of Object.keys(real.elites ?? {}).slice(0, 3)) s.eliteCodex[id] = { sightings: 1, kills: 1, uniques: 0, fastestKillMs: null };
      let ok = false;
      for (let d = 0; d < 12 && !ok; d++) {
        const day = g.rarity === "rare" ? strangerDay(CREATED_AT, DAY + d * 13) : DAY + d;
        tavernRefresh(s, solo, day);
        ok = seatsOf(s).some((x) => x.guestId === g.id && x.task !== null);
      }
      expect(ok, `Gast ${g.id} liefert kein gültiges Ziel`).toBe(true);
    }
  });
  it.skipIf(!ready)("echter Content: an einem Midgame-Save sind an 30 Tagen alle vier Plätze besetzt, rng unberührt", () => {
    const cc: ContentDB = { ...real, campBuildings: real.campBuildings?.some((b) => b.id === CAMP_TAVERN_ID) ? real.campBuildings : c.campBuildings };
    for (let d = 0; d < 30; d++) {
      const s = midgame(1, cc, 35);
      const rng = s.rng.state;
      expect(tavernRefresh(s, cc, DAY + d)).toBe(true);
      expect(s.rng.state).toBe(rng);
      const seats = seatsOf(s);
      expect(seats).toHaveLength(TAVERN_SEATS);
      expect(seats.filter((x) => x.task !== null), `Tag ${DAY + d}: freie Plätze`).toHaveLength(TAVERN_SEATS);
      expect(new Set(seats.map((x) => x.guestId)).size).toBe(TAVERN_SEATS);
      for (const seat of seats) {
        const tpl = tavernTemplateDef(cc, seat.task!.templateId)!;
        expect(tpl.guestId).toBe(seat.guestId);
        expect(seat.task!.count).toBeGreaterThanOrEqual(1);
        expect(seat.task!.rewardXp).toBeGreaterThan(0);
      }
    }
  });
  it.skipIf(!ready)("Vorlagen referenzieren nur bekannte Gäste, Kategorien, Skills und Item-Typen", () => {
    const guestIds = new Set(real.tavernGuests!.map((g) => g.id));
    const cats = new Set(real.categories.map((x) => x.id));
    for (const t of real.tavernTasks!) {
      expect(guestIds.has(t.guestId), `${t.id}: Gast ${t.guestId}`).toBe(true);
      if (t.select.skill) expect(real.skills[t.select.skill], `${t.id}: Skill ${t.select.skill}`).toBeDefined();
      for (const cat of t.select.categories ?? []) expect(cats.has(cat), `${t.id}: Kategorie ${cat}`).toBe(true);
      expect(t.minutes.length).toBeGreaterThanOrEqual(1);
    }
  });
});
