import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { addItem, createGame, setSlayerAutoTask, syncActiveKit } from "@hearthforge/engine";
import {
  SLAYER_TALENT_COSTS_V95,
  SLAYER_TALENT_COSTS_V96,
  SLAYER_UNIQUE_REFUND_V96,
  deserialize,
  serialize,
} from "./index";

/**
 * claude:2026-10-25T10:32:00+01:00 — Save-Vertrag SAVE 96 (1.4.1 Slayer-Punkte, Chef-Freigabe 25.10.2026):
 *  - neues Feld `slayerAutoTask` (Standard aus, strikt boolean),
 *  - optional `lastEliteKill.slayerPoints` (Champion-Kill, nur endliche ganze Zahl ≥ 0),
 *  - einmalige Gutschrift der Migration < 96 für die halbierten Jägerkodex-Ränge und die drei Punkte-Unikate je Exemplar
 *    an jedem Besitz-Ort; idempotent (ein schon migrierter Stand zahlt nie doppelt), ganzzahlig, nie negativ.
 */
const AT = 1_762_000_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

/** Serialisiert als ALT-Version (v95): Header und State tragen 95, das neue Feld fehlt wie in jedem echten v95-Save. */
function asV95(s: GameState, keepAutoField = false): string {
  const parsed = JSON.parse(serialize(s, AT)) as SaveShape;
  parsed.version = 95;
  parsed.state.version = 95;
  if (!keepAutoField) delete (parsed.state as Partial<GameState>).slayerAutoTask;
  return JSON.stringify(parsed);
}
const load = (json: string): GameState => deserialize(json, content, AT)!.state;
function fixpoint(s: GameState): void {
  const once = serialize(load(serialize(s, AT)), AT);
  expect(serialize(load(once), AT)).toBe(once);
}

describe("SAVE 96: Preistabellen der Gutschrift", () => {
  it("eingefrorene Tabellen: alt − neu = genau die Halbierung; der Content trägt die neuen Preise (Summe 7.575)", () => {
    const tree = content.talentTrees!.find((t) => t.id === "slayer")!;
    let sumOld = 0;
    let sumNew = 0;
    for (const node of tree.nodes) {
      expect(node.costPerRank, node.id).toEqual(SLAYER_TALENT_COSTS_V96[node.id]);
      expect(SLAYER_TALENT_COSTS_V95[node.id]!.map((c) => c / 2), node.id).toEqual(SLAYER_TALENT_COSTS_V96[node.id]);
      sumOld += SLAYER_TALENT_COSTS_V95[node.id]!.reduce((a, b) => a + b, 0);
      sumNew += node.costPerRank.reduce((a, b) => a + b, 0);
    }
    expect(sumOld).toBe(15_150);
    expect(sumNew).toBe(7_575);
    const shop = Object.fromEntries((content.slayerShop ?? []).map((e) => [e.itemId, e.cost]));
    expect(shop).toMatchObject({ slayer_turnkey_ring: 750, slayer_predecessor_mantle: 1250, slayer_guest_right: 2000 });
    expect(SLAYER_UNIQUE_REFUND_V96).toEqual({ slayer_turnkey_ring: 750, slayer_predecessor_mantle: 1250, slayer_guest_right: 2000 });
  });
});

describe("SAVE 96: Migration und Gutschrift", () => {
  it("Vault v95: lädt auf v96, Auto aus, Gutschrift für die drei gekauften Kodex-Knoten (4.600), Fixpunkt", () => {
    const raw = readFileSync(join(__dirname, "..", "fixtures", "save-compat", "v95-synthetic-1.4.0.json"), "utf8");
    const parsed = JSON.parse(raw) as SaveShape;
    expect(parsed.state.talents.slayer).toEqual({ tracking: 5, collar: 1, lore: 2 });
    const s = deserialize(raw, content, parsed.savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(96); // claude:2026-10-25T17:28:00+01:00 — 1.4.1 gestufte Aufträge heben auf 97
    expect(s.slayerAutoTask).toBe(false);
    // tracking 5 Ränge: 125+250+450+700+1000 = 2.525, collar 1.500, lore 2 Ränge: 200+375 = 575.
    expect(s.slayerPoints).toBe(parsed.state.slayerPoints + 2525 + 1500 + 575);
    expect(s.talents.slayer).toEqual({ tracking: 5, collar: 1, lore: 2 }); // Ränge bleiben gekauft
    fixpoint(s);
  });

  it("Unikate an jedem Besitz-Ort zählen je Exemplar; aktives Kit (Spiegel) nicht doppelt; Rückkauf nicht", () => {
    const s = createGame({ name: "Refund", createdAt: 1 }, content, 31);
    s.skills.slayer = { xp: 13_034_431 };
    s.slayerPoints = 100;
    s.talents = { slayer: { tracking: 5, trail: 1, collar: 1, pace: 3, spoils: 2, lore: 1 } };
    // Ring: Inventar-Stapel, Gear-Vault (mit Affix, bleibt Instanz), angelegt (aktives Kit spiegelt ihn).
    addItem(s.inventory, content, "slayer_turnkey_ring", 1);
    s.bankInstances.push({ instanceId: "inst_r1", baseItemId: "slayer_turnkey_ring", affixes: [{ affixId: "affix_keen", tier: 1 }] });
    s.character.equipment.ring1 = "slayer_turnkey_ring";
    // Mantel: Bank, inaktives Kit 2, Postfach-Instanz.
    s.bank.slayer_predecessor_mantle = 1;
    s.equipKits[1]!.equipment.cape = "slayer_predecessor_mantle";
    // Gastrecht: Postfach-Stapel, Inventar-Instanz.
    s.inventory.instances.push({ instanceId: "inst_g1", baseItemId: "slayer_guest_right", affixes: [] });
    s.mailbox.push({
      id: "mail_t1",
      kind: "overflow",
      createdSeq: 1,
      items: [{ itemId: "slayer_guest_right", qty: 1 }],
      instances: [{ instanceId: "inst_m1", baseItemId: "slayer_predecessor_mantle", affixes: [] }],
    });
    s.mailSeq = 2;
    // Verkauft (Rückkauf-Liste): zählt nicht.
    s.buyBack = [{ itemId: "slayer_guest_right", qty: 1, price: 1 }];
    syncActiveKit(s);
    expect(s.equipKits[0]!.equipment.ring1).toBe("slayer_turnkey_ring"); // Spiegel trägt den Ring ebenfalls

    const out = load(asV95(s));
    const talents = 2525 + 325 + 1500 + 825 + (200 + 375) + 200; // 5.950
    const uniques = 3 * 750 + 3 * 1250 + 2 * 2000; // 10.000
    expect(out.slayerPoints).toBe(100 + talents + uniques);
    expect(out.slayerAutoTask).toBe(false);

    // Idempotent: erneut als v95 geladen (das Feld ist jetzt da) ⇒ keine zweite Gutschrift.
    expect(load(asV95(out, true)).slayerPoints).toBe(out.slayerPoints);
    // Ein v96-Stand lädt ohnehin ohne Migration.
    expect(load(serialize(out, AT)).slayerPoints).toBe(out.slayerPoints);
    fixpoint(out);
  });

  it("kaputte Ränge zählen defensiv: geklemmt auf die Tabelle, ganzzahlig, unbekannte Knoten/Bäume 0, nie negativ", () => {
    const s = createGame({ name: "Garbage", createdAt: 1 }, content, 32);
    s.slayerPoints = 0;
    (s as { talents: unknown }).talents = {
      slayer: { tracking: 99, pace: -2, spoils: "x", gibt_es_nicht: 3, collar: 1.7, lore: Number.NaN },
      prestige: { startingGold: 3 },
    };
    const json = asV95(s);
    // NaN überlebt JSON nicht (wird null) — der Rang zählt dann 0.
    expect(load(json).slayerPoints).toBe(2525 + 1500);
  });

  it("ohne Käufe: Punkte unverändert, nur das neue Feld kommt dazu", () => {
    const s = createGame({ name: "Plain", createdAt: 1 }, content, 33);
    s.slayerPoints = 42;
    const out = load(asV95(s));
    expect(out.slayerPoints).toBe(42);
    expect(out.slayerAutoTask).toBe(false);
  });
});

describe("SAVE 96: Sanitizing", () => {
  it("slayerAutoTask: nur exakt true schaltet ein; Round-Trip hält den Wert", () => {
    const s = createGame({ name: "Auto", createdAt: 1 }, content, 34);
    setSlayerAutoTask(s, true);
    expect(load(serialize(s, AT)).slayerAutoTask).toBe(true);
    for (const bad of ["true", 1, null, {}]) {
      (s as { slayerAutoTask: unknown }).slayerAutoTask = bad;
      expect(load(serialize(s, AT)).slayerAutoTask, String(bad)).toBe(false);
    }
    fixpoint(s);
  });

  it("lastEliteKill.slayerPoints: gültig bleibt (ganzzahlig), kaputt oder fehlend ⇒ Feld fehlt", () => {
    const s = createGame({ name: "Elite", createdAt: 1 }, content, 35);
    const bc = { variantId: "x", atMs: 5, drops: [], uniqueItemId: null, suffixRolled: false, bountyTokens: 1, seq: 1 };
    s.eliteKillSeq = 1;
    s.lastEliteKill = { ...bc, slayerPoints: 20 };
    expect(load(serialize(s, AT)).lastEliteKill).toEqual({ ...bc, slayerPoints: 20 });
    s.lastEliteKill = { ...bc, slayerPoints: 20.9 };
    expect(load(serialize(s, AT)).lastEliteKill?.slayerPoints).toBe(20);
    for (const bad of [-5, "20", null]) {
      (s.lastEliteKill as { slayerPoints: unknown }).slayerPoints = bad;
      expect(load(serialize(s, AT)).lastEliteKill, String(bad)).toEqual(bc);
    }
    s.lastEliteKill = { ...bc };
    expect(load(serialize(s, AT)).lastEliteKill).toEqual(bc); // Breadcrumb aus v95: kein Feld
  });
});
