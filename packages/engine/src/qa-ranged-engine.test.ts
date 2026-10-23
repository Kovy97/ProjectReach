import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, ItemDef } from "@hearthforge/shared";
import { AMMO_SAVER_CAP, RANGED_DEFENSIVE_DMG_MULT, enchantSlotsFor, quiverAcceptsAffix } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { combatStep, startCombat } from "./combat";
import { computeStats } from "./character";
import { equipItem, offhandFitsMain, unequipItem } from "./equipment";
import { addItem, itemCount } from "./inventory";
import { levelFromXp, xpForLevel } from "./leveling";
import { advance } from "./tick";
import { switchEquipKit } from "./loadouts";
import { applyEnchant } from "./enchant";
import { checkMasteryCapes } from "./capes";
import { checkAchievements } from "./achievements";
import { setActiveAction } from "./actions";
import { prestigeAscendPreview } from "./prestige";
import { activeArrow, ammoSaverChance, consumeArrow, isQuiverItem, loadQuiver, refillQuiver } from "./quiver";

/**
 * QA 1.4.0 Prüfrunde Fernkampf (kontrolleur, 2026-10-23): Grenzfälle Köcher/Pfeile in der Engine.
 * Nur Nachweise; keine Produktänderung.
 */
function archer(level = 99, bow = "copper_shortbow", quiver = "copper_quiver", c: ContentDB = content): GameState {
  const s = createTestGame({ name: "QA", baseAttributes: { dex: 8, con: 10 } }, c, 11);
  s.settings.materialsToStorage = true;
  for (const id of Object.keys(c.skills)) s.skills[id] = { xp: xpForLevel(level) };
  addItem(s.inventory, c, bow, 1);
  addItem(s.inventory, c, quiver, 1);
  expect(equipItem(s, c, bow).ok).toBe(true);
  expect(equipItem(s, c, quiver).ok).toBe(true);
  s.character.hp = computeStats(s, c).maxHp;
  return s;
}

/** Köcher ohne Sparchance: jeder Schuss kostet genau einen Pfeil, kein RNG-Zug. */
const quiver0: ItemDef = {
  ...content.items.copper_quiver!,
  id: "qa_quiver0",
  weaponEffect: { type: "ammoSaver", chance: 1, magnitude: 0, durationMs: 0 },
};
const c0: ContentDB = { ...content, items: { ...content.items, [quiver0.id]: quiver0 } };

/** Spieler-Schüsse eines Schritts aus dem Log (Treffer + echte Fehlschüsse; „frozen“ ist kein Schuss). */
function shotsInLog(s: GameState): number {
  return s.combat.log.filter((e) => e.by === "player" && (e.kind === "hit" || (e.kind === "miss" && e.missReason !== "frozen"))).length;
}

describe("Ausrüstung: Bogen ablegen, Nahkampf, Kit", () => {
  it("Bogen ablegen lässt Köcher und Ladung liegen (kein Bonus, kein Verbrauch); andere Haupthand räumt beides ins Lager", () => {
    const s = archer();
    s.bank.copper_arrow = 30;
    expect(loadQuiver(s, content, "copper_arrow")).toEqual({ ok: true, qty: 30 });
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    expect(s.character.equipment.offhand).toBe("copper_quiver");
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 30 });
    expect(activeArrow(s, content)).toBeUndefined();
    expect(computeStats(s, content).style).not.toBe("ranged"); // waffenlos ⇒ kein Pfeilbonus, kein Verbrauch
    const rng = JSON.stringify(s.rng);
    expect(consumeArrow(s, content, s.rng)).toBeNull();
    expect(JSON.stringify(s.rng)).toBe(rng);
    expect(s.character.quiver!.qty).toBe(30);
    addItem(s.inventory, content, "bronze_sword", 1);
    expect(equipItem(s, content, "bronze_sword").ok).toBe(true);
    expect(s.character.equipment.offhand).toBeNull();
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 }); // claude:2026-10-26T04:15:00+02:00 — Art gemerkt (QA-Fernkampf P3)
    expect(s.bank.copper_arrow).toBe(30);
    expect(itemCount(s.inventory, "copper_quiver")).toBe(1);
  });

  it("Zweihand-Nahkampf verdrängt den geladenen Köcher; Köcher neben Schwert bleibt verboten", () => {
    const s = archer();
    s.bank.iron_arrow = 12;
    loadQuiver(s, content, "iron_arrow");
    addItem(s.inventory, content, "copper_maul", 1);
    expect(equipItem(s, content, "copper_maul").ok).toBe(true);
    expect(s.character.equipment.offhand).toBeNull();
    expect(s.character.quiver).toEqual({ itemId: "iron_arrow", qty: 0 }); // claude:2026-10-26T04:15:00+02:00 — Art gemerkt (QA-Fernkampf P3)
    expect(s.bank.iron_arrow).toBe(12);
    expect(equipItem(s, content, "copper_quiver")).toEqual({ ok: false, reason: "Köcher nur mit Bogen" });
    expect(offhandFitsMain(content.items.copper_maul, content.items.copper_quiver)).toBe(false);
    expect(offhandFitsMain(content.items.copper_shortbow, content.items.copper_quiver)).toBe(true);
    expect(offhandFitsMain(content.items.copper_shortbow, content.items.wooden_shield ?? content.items.copper_shield)).toBe(false);
  });

  it("volles Inventar: Schwert-Tausch scheitert atomar, Köcher und Ladung bleiben", () => {
    const s = archer();
    s.bank.copper_arrow = 9;
    loadQuiver(s, content, "copper_arrow");
    addItem(s.inventory, content, "bronze_sword", 1);
    const junk = Object.values(content.items).filter((i) => i.type === "material" && i.stackable && !i.arrow && !i.shelf).map((i) => i.id);
    for (const id of junk) if (addItem(s.inventory, content, id, 1) < 1) break;
    const before = JSON.stringify([s.character.equipment, s.character.quiver, s.bank]);
    const res = equipItem(s, content, "bronze_sword");
    expect(res.ok).toBe(false);
    expect(JSON.stringify([s.character.equipment, s.character.quiver, s.bank])).toBe(before);
  });

  // claude:2026-10-26T04:15:00+02:00 — Befund P3 behoben: die Art bleibt gemerkt, zurück am Köcher füllt „Automatisch nachfüllen“ wieder nach.
  it("Kit-Wechsel: Pfeile ins Lager, zurück im Bogen-Kit füllt der Köcher automatisch nach", () => {
    const s = archer();
    s.bank.copper_arrow = 50;
    loadQuiver(s, content, "copper_arrow", 20);
    expect(switchEquipKit(s, content, 1)).toBe("ok");
    expect(s.character.equipment.offhand).toBeNull();
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 });
    expect(s.bank.copper_arrow).toBe(50);
    expect(switchEquipKit(s, content, 0)).toBe("ok");
    expect(s.character.equipment.mainhand).toBe("copper_shortbow");
    expect(s.character.equipment.offhand).toBe("copper_quiver");
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 50 });
    expect(s.bank.copper_arrow).toBeUndefined();
    expect(activeArrow(s, content)?.itemId).toBe("copper_arrow");
  });
});

describe("Verbrauch im Kampf", () => {
  it("jeder Schuss (auch Fehlschuss) kostet genau einen Pfeil; Sparchance 0 zieht kein RNG", () => {
    const s = archer(5, "copper_shortbow", quiver0.id, c0);
    expect(ammoSaverChance(s, c0)).toBe(0);
    s.bank.copper_arrow = 500;
    loadQuiver(s, c0, "copper_arrow");
    expect(startCombat(s, c0, "gray_wolf")).toBe(true);
    let shots = 0;
    let misses = 0;
    let consumed = 0;
    for (let i = 0; i < 400 && s.combat.monsterId !== null; i++) {
      s.combat.log.length = 0;
      const qty = s.character.quiver!.qty;
      combatStep(s, c0);
      const n = shotsInLog(s);
      shots += n;
      misses += s.combat.log.filter((e) => e.by === "player" && e.kind === "miss" && e.missReason !== "frozen").length;
      const delta = qty - s.character.quiver!.qty;
      consumed += delta;
      expect(delta).toBe(n); // Verbrauch im selben Schritt wie der Schuss
    }
    expect(shots).toBeGreaterThan(3);
    expect(misses).toBeGreaterThan(0);
    expect(consumed).toBe(shots);
  });

  const dsBow = Object.values(content.items).find(
    (i) => i.weaponStyle === "ranged" && i.slot === "mainhand" && [i.weaponEffect, ...(i.weaponEffects ?? [])].some((e) => e?.type === "doubleStrike"),
  );
  it.skipIf(!dsBow)("doubleStrike: der Zweitschlag ist kostenlos (höchstens ein Pfeil je Schritt)", () => {
    const s = archer(99, dsBow!.id, quiver0.id, c0);
    s.bank.godiron_arrow = 2000;
    loadQuiver(s, c0, "godiron_arrow");
    expect(startCombat(s, c0, "dire_wolf")).toBe(true);
    let doubles = 0;
    for (let i = 0; i < 1500; i++) {
      if (s.combat.monsterId === null) startCombat(s, c0, "dire_wolf");
      s.combat.log.length = 0;
      const qty = s.character.quiver!.qty;
      combatStep(s, c0);
      const n = shotsInLog(s);
      const delta = qty - s.character.quiver!.qty;
      expect(delta).toBeLessThanOrEqual(1);
      if (n >= 2) doubles++;
      if (n >= 1) expect(delta).toBe(1);
    }
    expect(doubles).toBeGreaterThan(0);
  });

  it("Pfeilbonus folgt der Ladung durch den Stats-Cache: leer ⇒ weg, nachgefüllt ⇒ wieder da", () => {
    const s = archer(99, "copper_shortbow", quiver0.id, c0);
    const plain = computeStats(s, c0).attackDamageMax;
    s.bank.copper_arrow = 3;
    loadQuiver(s, c0, "copper_arrow", 1);
    const bonus = content.items.copper_arrow!.arrow!.bonusMax;
    expect(computeStats(s, c0).attackDamageMax).toBeCloseTo(plain + bonus, 9);
    expect(consumeArrow(s, c0, s.rng)).toBe("copper_arrow"); // 1 → 0 ⇒ Nachfüllen 2 aus dem Lager
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 2 });
    expect(computeStats(s, c0).attackDamageMax).toBeCloseTo(plain + bonus, 9);
    consumeArrow(s, c0, s.rng);
    consumeArrow(s, c0, s.rng);
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 });
    expect(computeStats(s, c0).attackDamageMax).toBeCloseTo(plain, 9);
    s.bank.copper_arrow = 4;
    expect(refillQuiver(s, c0)).toBe(true);
    expect(computeStats(s, c0).attackDamageMax).toBeCloseTo(plain + bonus, 9);
  });

  it("Offline-Kampf: Nachfüllen aus dem Lager läuft im Aufholen, Ergebnis ist mit dem Live-Tick identisch", () => {
    const s = archer();
    s.bank.copper_arrow = 2000;
    loadQuiver(s, content, "copper_arrow", 10);
    expect(startCombat(s, content, "chicken")).toBe(true);
    const live = structuredClone(s);
    advance(s, content, 600_000, { offline: true });
    for (let i = 0; i < 6000; i++) advance(live, content, 100);
    expect(s.combat.kills).toBeGreaterThan(5);
    expect((s.bank.copper_arrow ?? 0) + s.character.quiver!.qty).toBeLessThan(2000); // verbraucht
    expect(s.bank.copper_arrow ?? 0).toBeLessThan(1990); // nachgefüllt (mehr als die ersten 10)
    expect(s.character.quiver!.qty).toBeGreaterThan(0);
    expect([s.character.quiver, s.bank.copper_arrow ?? 0, s.combat.kills, s.rng]).toEqual([live.character.quiver, live.bank.copper_arrow ?? 0, live.combat.kills, live.rng]);
  });

  it("Offline-Kampf ohne Nachfüllen: Stapel bleibt leer, Lager unberührt, Kampf läuft mit einfachen Pfeilen", () => {
    const s = archer();
    s.settings.quiverAutoRefill = false;
    s.bank.copper_arrow = 500;
    loadQuiver(s, content, "copper_arrow", 5);
    expect(startCombat(s, content, "chicken")).toBe(true);
    advance(s, content, 600_000, { offline: true });
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 });
    expect(s.bank.copper_arrow).toBe(495);
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.combat.kills).toBeGreaterThan(5);
  });
});

describe("Lager, Inventar, API-Grenzfälle", () => {
  // claude:2026-10-26T04:15:00+02:00 — Befund P3 behoben: Nachfüllen nimmt auch Inventar-Pfeile.
  it("„Direkt ins Lager“ aus: Einlegen und Nachfüllen nehmen Inventar-Pfeile", () => {
    const s = archer();
    s.settings.materialsToStorage = false;
    addItem(s.inventory, content, "copper_arrow", 40);
    expect(loadQuiver(s, content, "copper_arrow", 10)).toEqual({ ok: true, qty: 10 });
    expect(itemCount(s.inventory, "copper_arrow")).toBe(30);
    s.character.quiver!.qty = 0;
    expect(refillQuiver(s, content)).toBe(true);
    expect(s.character.quiver!.qty).toBe(30);
    expect(itemCount(s.inventory, "copper_arrow")).toBe(0);
  });

  // claude:2026-10-26T04:15:00+02:00 — Befund P3 behoben: NaN-Menge heißt „alles“, die Ladung ist endlich.
  it("loadQuiver mit NaN-Menge legt alles ein, die Ladung ist endlich und leert sich", () => {
    const s = archer();
    s.bank.copper_arrow = 10;
    s.settings.quiverAutoRefill = false;
    const res = loadQuiver(s, content, "copper_arrow", Number.NaN);
    expect(res).toEqual({ ok: true, qty: 10 });
    expect(s.character.quiver?.qty).toBe(10);
    for (let i = 0; i < 50; i++) consumeArrow(s, content, s.rng);
    expect(activeArrow(s, content)).toBeUndefined();
  });

  // claude:2026-10-26T04:15:00+02:00 — Befund P3 behoben: ohne Vorrat bleibt die alte Ladung im Köcher.
  it("Artwechsel ohne Vorrat: Ergebnis „none“, die alte Ladung bleibt im Köcher", () => {
    const s = archer();
    s.bank.copper_arrow = 7;
    loadQuiver(s, content, "copper_arrow");
    expect(loadQuiver(s, content, "iron_arrow")).toEqual({ ok: false, reason: "none" });
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 7 });
    expect(s.bank.copper_arrow).toBeUndefined();
  });

  // claude:2026-10-26T04:15:00+02:00 — Befund P3 behoben: geladene Pfeile zählen wie ein Lagerstapel.
  it("Prestige-Vorschau: geladene Pfeile sind Truhen-Kandidat wie Lagerpfeile", () => {
    const s = archer();
    s.bank.godiron_arrow = 100;
    const inBank = prestigeAscendPreview(s, content).stashCandidates.some((c) => c.itemId === "godiron_arrow");
    loadQuiver(s, content, "godiron_arrow");
    expect(s.bank.godiron_arrow).toBeUndefined();
    const loaded = prestigeAscendPreview(s, content).stashCandidates.some((c) => c.itemId === "godiron_arrow");
    expect(inBank).toBe(true);
    expect(loaded).toBe(true);
  });
});

describe("Raid-Köcher und Runen", () => {
  const ids = ["gk_quarter_quiver", "gk_quarter_quiver_heroic", "gk_quarter_quiver_mythic"];
  it.each(ids)("%s: Köcher-Regel, 4 Runenplätze, Sparchance unter Deckel, nur Stat-Runen", (id) => {
    const item = content.items[id]!;
    expect(isQuiverItem(item)).toBe(true);
    expect(item.twoHanded).toBeFalsy();
    expect(enchantSlotsFor(item.rarity!)).toBe(4);
    expect(item.weaponEffect?.type).toBe("ammoSaver");
    expect(item.weaponEffect!.magnitude).toBeGreaterThan(0.15);
    expect(item.weaponEffect!.magnitude).toBeLessThanOrEqual(AMMO_SAVER_CAP);
    expect(quiverAcceptsAffix("affix_flame", item)).toBe(false);
    expect(quiverAcceptsAffix("affix_hunter", item)).toBe(true);
    const s = archer(99, "copper_shortbow", id);
    expect(s.character.equipment.offhand).toBe(id);
    expect(ammoSaverChance(s, content)).toBeCloseTo(item.weaponEffect!.magnitude, 9);
    s.character.gold = 100_000_000;
    s.bank.rune_flame_i = 1;
    s.bank.rune_hunter_i = 1;
    expect(applyEnchant(s, content, { kind: "equipment", slot: "offhand" }, "rune_flame_i")).toMatchObject({ ok: false, reason: "affix_mismatch" });
    expect(applyEnchant(s, content, { kind: "equipment", slot: "offhand" }, "rune_hunter_i").ok).toBe(true);
    addItem(s.inventory, content, "bronze_sword", 1);
    expect(equipItem(s, content, "bronze_sword").ok).toBe(true);
    expect(s.character.equipment.offhand).toBeNull(); // verzauberte Instanz wandert in die Tasche
    expect(s.inventory.instances.some((i) => i.baseItemId === id)).toBe(true);
  });
});

describe("Bognerei: Meisterring, Erfolge, Alt-Save ohne Konto", () => {
  it("Bognerei 99 verleiht ring_master_bowcraft und den 99er-Erfolg", () => {
    const s = createTestGame({ name: "QA" }, content, 3);
    s.skills.bowcraft = { xp: xpForLevel(99) };
    expect(checkMasteryCapes(s, content)).toContain("bowcraft");
    expect(itemCount(s.inventory, "ring_master_bowcraft") + (s.bank.ring_master_bowcraft ?? 0)).toBe(1);
    const unlocked = new Set<string>();
    for (let i = 0; i < 3; i++) for (const id of checkAchievements(s, content)) unlocked.add(id);
    expect(unlocked.has("ach_skill_bowcraft_99")).toBe(true);
  });

  it("fehlendes Konto liest Level 1: Schäfte und Kupferpfeile starten, Bronzepfeile (7) nicht", () => {
    const s = createTestGame({ name: "QA" }, content, 4);
    expect(s.skills.bowcraft).toBeUndefined();
    expect(levelFromXp(s.skills.bowcraft?.xp ?? 0)).toBe(1);
    setActiveAction(s, content, "fletch_arrow_shaft");
    expect(s.activeActionId).toBe("fletch_arrow_shaft");
    setActiveAction(s, content, "fletch_copper_arrow");
    expect(s.activeActionId).toBe("fletch_copper_arrow");
    setActiveAction(s, content, "fletch_bronze_arrow");
    expect(s.activeActionId).toBe("fletch_copper_arrow");
  });

  it("Abwehrhaltung: Schaden ×0,9, Tempo ×1,0", () => {
    const s = archer();
    const precise = computeStats(s, content);
    s.character.rangedStance = "defensive";
    const def = computeStats(s, content);
    expect(RANGED_DEFENSIVE_DMG_MULT).toBe(0.9);
    expect(def.attackIntervalMs).toBe(precise.attackIntervalMs);
    expect(def.attackDamageMax).toBeLessThan(precise.attackDamageMax);
  });
});
