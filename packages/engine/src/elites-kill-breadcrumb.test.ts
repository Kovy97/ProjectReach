import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, ItemId } from "@hearthforge/shared";
import { ELITE_BOUNTY_TOKENS, ELITE_WINDOW_MS, TICK_MS } from "@hearthforge/shared";
import { createGame } from "./state";
import { advance } from "./tick";
import { combatStep } from "./combat";
import { createRng } from "./rng";
import { eliteScaledMonster, onEliteKilled, startEliteCombat } from "./elites";

/**
 * Elite-Sieg-Breadcrumb (`state.lastEliteKill` + `eliteKillSeq`, SAVE_VERSION 74, Task #324):
 * `onEliteKilled` zeichnet die BEREITS vergebenen elite-eigenen Belohnungen (Material-Bundle/
 * Unique/Kopfgeld) für die kommende UI-Sieg-Zeremonie auf — reine Mitschrift, KEIN eigener
 * RNG-Zug (Determinismus-Gesetz). Muster elites.test.ts/elites-hunt-pack.test.ts (isolierte
 * Test-Content-Überlagerung: reale Zonen/Monster/Items aus `content`, kontrollierte `elites`).
 */
const TEST_UNIQUE_ITEM = "rusty_sword"; // reales Equipment mit minIlvl:1-Suffix-Pool (s. elites.test.ts)

const BASE_VARIANT = {
  id: "test_bc_pastures",
  zone: "pastures",
  baseMonsterId: "chicken",
  name: { en: "Test Breadcrumb Champion" },
  statMults: { hp: 5, damage: 1.2 },
  uniqueItemId: TEST_UNIQUE_ITEM,
  uniqueDropChance: 1,
  uniqueSuffixChance: 1,
} as const;

/** Gesamtbestand eines Items über ALLE Besitz-Flächen (Inventar-Stacks+Instanzen, Bank, Mail). */
function countOwned(s: GameState, itemId: ItemId): number {
  let n = 0;
  for (const slot of s.inventory.slots) if (slot && slot.itemId === itemId) n += slot.qty;
  for (const inst of s.inventory.instances) if (inst.baseItemId === itemId) n += 1;
  n += s.bank[itemId] ?? 0;
  for (const mail of s.mailbox) {
    for (const att of mail.items) if (att.itemId === itemId) n += att.qty;
    for (const inst of mail.instances) if (inst.baseItemId === itemId) n += 1;
  }
  return n;
}

/** Kämpft den aktiven Elite-Kampf bis zum Kill leer (Muster elites-hunt-pack.test.ts). */
function killActiveElite(s: GameState, c: ContentDB): void {
  s.combat.enemyHp = 1;
  let guard = 0;
  while (s.combat.monsterId !== null && guard++ < 2000) combatStep(s, c);
  expect(guard, "Kampf in der Zeitschranke beendet").toBeLessThan(2000);
}

describe("Elite-Sieg-Breadcrumb — Material-Bundle (drops == tatsächlich vergebene Items/Mengen)", () => {
  it("Fixture-Kampf mit bekanntem Seed: drops spiegelt EXAKT die vergebenen extraLoot-Items; 0-Mengen-Zeilen fehlen", () => {
    const variant = {
      ...BASE_VARIANT,
      uniqueDropChance: 0,
      uniqueSuffixChance: 0,
      // WICHTIG bei der Item-Wahl: nichts aus der chicken-Basis-Loot-Tabelle (feather/raw_chicken)
      // und KEIN cooked_trout — der ERSTE Champion-Kill löst den Brenna-Brief mit 5× cooked_trout
      // aus (Jagd-Paket L), der die Besitz-Deltas verfälschen würde.
      extraLoot: [
        { itemId: "copper_ore", chance: 1, min: 3, max: 3 },
        { itemId: "iron_ore", chance: 1, min: 2, max: 2 },
        // Menge 0 bei Chance 1: der Roll feuert, vergibt aber nichts → darf NICHT im Breadcrumb landen.
        { itemId: "oak_log", chance: 1, min: 0, max: 0 },
      ],
    };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const s = createGame({ name: "Bundle", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, 6);
    s.eliteZones.pastures = { variantId: variant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);

    const before: Record<string, number> = {};
    for (const row of variant.extraLoot) before[row.itemId] = countOwned(s, row.itemId);
    const tokensBefore = s.character.questTokens;
    killActiveElite(s, c);

    const bc = s.lastEliteKill;
    expect(bc).not.toBeNull();
    expect(bc!.variantId).toBe(variant.id);
    // Feste min==max-Mengen ⇒ das Bundle ist exakt vorhersagbar (Reihenfolge = extraLoot-Reihenfolge).
    expect(bc!.drops).toEqual([
      { itemId: "copper_ore", qty: 3 },
      { itemId: "iron_ore", qty: 2 },
    ]);
    // Die Mitschrift stimmt mit den TATSÄCHLICH vergebenen Beständen überein — der Kern-Vertrag.
    // (Basis-Zonen-Loot der chicken-Tabelle enthält keins dieser Items — die Deltas sind rein elite-eigen.)
    for (const drop of bc!.drops) {
      expect(countOwned(s, drop.itemId) - before[drop.itemId]!, drop.itemId).toBe(drop.qty);
    }
    expect(countOwned(s, "oak_log") - before.oak_log!).toBe(0);
    // Kein Unique (Chance 0) + Kopfgeld-Mitschrift == tatsächliche Vergabe.
    expect(bc!.uniqueItemId).toBeNull();
    expect(bc!.suffixRolled).toBe(false);
    expect(bc!.bountyTokens).toBe(ELITE_BOUNTY_TOKENS);
    expect(s.character.questTokens - tokensBefore).toBe(bc!.bountyTokens);
    // atMs ist SPIELZEIT (elapsedMs zum Kill-Zeitpunkt — combatStep bewegt elapsedMs nicht).
    expect(bc!.atMs).toBe(s.elapsedMs);
    expect(bc!.seq).toBe(1);
    expect(s.eliteKillSeq).toBe(1);
  });

  it("extraLoot-Suffix-Instanz zählt in der Bundle-Menge mit (dropped = Stack + Instanz)", () => {
    const variant = {
      ...BASE_VARIANT,
      id: "test_bc_suffix_row",
      uniqueDropChance: 0,
      uniqueSuffixChance: 0,
      extraLoot: [{ itemId: TEST_UNIQUE_ITEM, chance: 1, min: 2, max: 2, suffixChance: 1 }],
    };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const s = createGame({ name: "SuffixRow", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, 6);
    s.eliteZones.pastures = { variantId: variant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    const before = countOwned(s, TEST_UNIQUE_ITEM);
    killActiveElite(s, c);

    // 1 Exemplar wurde zur Suffix-Instanz, der Rest blieb Stack — die Breadcrumb-Menge deckt BEIDE.
    expect(s.inventory.instances.filter((i) => i.baseItemId === TEST_UNIQUE_ITEM).length).toBe(1);
    expect(s.lastEliteKill!.drops).toEqual([{ itemId: TEST_UNIQUE_ITEM, qty: 2 }]);
    expect(countOwned(s, TEST_UNIQUE_ITEM) - before).toBe(2);
  });
});

describe("Elite-Sieg-Breadcrumb — Unique-Fall / Nicht-Unique-Fall", () => {
  it("Unique gefallen (Chance 1) mit Suffix: uniqueItemId gesetzt, suffixRolled true", () => {
    const c: ContentDB = { ...content, elites: { [BASE_VARIANT.id]: BASE_VARIANT } };
    const s = createGame({ name: "Unique", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, 6);
    s.eliteZones.pastures = { variantId: BASE_VARIANT.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);

    const bc = s.lastEliteKill!;
    expect(bc.uniqueItemId).toBe(TEST_UNIQUE_ITEM);
    // uniqueSuffixChance 1 ⇒ die Instanz trägt garantiert einen Suffix — die Mitschrift stimmt
    // mit der tatsächlich entstandenen Instanz überein.
    const inst = s.inventory.instances.find((i) => i.baseItemId === TEST_UNIQUE_ITEM)!;
    expect(inst.suffix).toBeDefined();
    expect(bc.suffixRolled).toBe(true);
  });

  it("Unique gefallen OHNE Suffix (uniqueSuffixChance 0): uniqueItemId gesetzt, suffixRolled false", () => {
    const variant = { ...BASE_VARIANT, id: "test_bc_plain_unique", uniqueSuffixChance: 0 };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const s = createGame({ name: "Plain", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, 6);
    s.eliteZones.pastures = { variantId: variant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);

    expect(s.lastEliteKill!.uniqueItemId).toBe(TEST_UNIQUE_ITEM);
    expect(s.lastEliteKill!.suffixRolled).toBe(false);
    const inst = s.inventory.instances.find((i) => i.baseItemId === TEST_UNIQUE_ITEM)!;
    expect(inst.suffix).toBeUndefined();
  });

  it("Unique NICHT gefallen (Chance 0): uniqueItemId null, suffixRolled false — Breadcrumb existiert trotzdem", () => {
    const variant = { ...BASE_VARIANT, id: "test_bc_no_unique", uniqueDropChance: 0, uniqueSuffixChance: 0 };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const s = createGame({ name: "NoUnique", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, 6);
    s.eliteZones.pastures = { variantId: variant.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);

    const bc = s.lastEliteKill!;
    expect(bc.uniqueItemId).toBeNull();
    expect(bc.suffixRolled).toBe(false);
    expect(bc.drops).toEqual([]); // keine extraLoot-Zeilen definiert
    expect(bc.bountyTokens).toBe(ELITE_BOUNTY_TOKENS); // Kopfgeld fließt unabhängig vom Unique
  });
});

describe("Elite-Sieg-Breadcrumb — seq/Monotonie & Leitplanken", () => {
  it("seq inkrementiert je Kill; der jüngste Kill überschreibt (letzter gewinnt)", () => {
    const c: ContentDB = { ...content, elites: { [BASE_VARIANT.id]: BASE_VARIANT } };
    const s = createGame({ name: "Seq", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, 6);
    s.eliteZones.pastures = { variantId: BASE_VARIANT.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);
    expect(s.eliteKillSeq).toBe(1);
    expect(s.lastEliteKill!.seq).toBe(1);
    const firstBreadcrumb = s.lastEliteKill;

    s.eliteZones.pastures = { variantId: BASE_VARIANT.id, remainingMs: ELITE_WINDOW_MS };
    expect(startEliteCombat(s, c, "pastures")).toBe(true);
    killActiveElite(s, c);
    expect(s.eliteKillSeq).toBe(2);
    expect(s.lastEliteKill!.seq).toBe(2);
    expect(s.lastEliteKill).not.toBe(firstBreadcrumb); // frisches Objekt, kein Mutieren des alten
  });

  it("verwaister Kampf (Variante aus dem Content entfernt): KEIN Breadcrumb, kein Seq-Inkrement, kein Crash", () => {
    const c: ContentDB = { ...content, elites: { [BASE_VARIANT.id]: BASE_VARIANT } };
    const s = createGame({ name: "Ghost" }, c, 1);
    s.combat.eliteVariantId = "ghost_variant_removed";
    expect(() => onEliteKilled(s, c, content.monsters.chicken!)).not.toThrow();
    expect(s.lastEliteKill).toBeNull();
    expect(s.eliteKillSeq).toBe(0);
  });

  it("die Mitschrift ist RNG-neutral: onEliteKilled zieht NIE state.rng, und der eliteRng-Konsum ist unverändert deckungsgleich zwischen Unique-Ja/Nein (Sequenz-Stabilität)", () => {
    // Muster elites.test.ts „uniqueDropChance: der Wurf feuert IMMER": identischer eliteRng-Konsum
    // bei Chance 0 vs 1 — die NEUE Breadcrumb-Mitschrift darf daran nichts ändern (kein Extra-Zug).
    const zeroVariant = { ...BASE_VARIANT, id: "test_bc_zero", uniqueDropChance: 0, uniqueSuffixChance: 0 };
    const oneVariant = { ...BASE_VARIANT, id: "test_bc_one", uniqueDropChance: 1, uniqueSuffixChance: 0 };
    const zeroContent: ContentDB = { ...content, elites: { [zeroVariant.id]: zeroVariant } };
    const oneContent: ContentDB = { ...content, elites: { [oneVariant.id]: oneVariant } };

    const sZero = createGame({ name: "Zero" }, zeroContent, 42);
    sZero.eliteRng = createRng(999);
    sZero.combat.eliteVariantId = zeroVariant.id;
    const sOne = createGame({ name: "One" }, oneContent, 42);
    sOne.eliteRng = createRng(999);
    sOne.combat.eliteVariantId = oneVariant.id;

    const mainRngBefore = sZero.rng.state;
    onEliteKilled(sZero, zeroContent, eliteScaledMonster(zeroContent, zeroVariant.id)!);
    onEliteKilled(sOne, oneContent, eliteScaledMonster(oneContent, oneVariant.id)!);

    expect(sZero.rng.state).toBe(mainRngBefore); // state.rng bleibt unangetastet
    expect(sZero.eliteRng.state).toBe(sOne.eliteRng.state); // identischer Draw-Count
    // … und die Breadcrumbs spiegeln die divergierenden ERGEBNISSE korrekt.
    expect(sZero.lastEliteKill!.uniqueItemId).toBeNull();
    expect(sOne.lastEliteKill!.uniqueItemId).toBe(TEST_UNIQUE_ITEM);
  });
});

describe("Elite-Sieg-Breadcrumb — offline == online (Determinismus-Gesetz)", () => {
  it("ein offline zu Ende gekämpfter Elite-Kampf schreibt den Breadcrumb bit-identisch zum Online-Lauf", () => {
    const variant = {
      ...BASE_VARIANT,
      id: "test_bc_parity",
      extraLoot: [{ itemId: "copper_ore", chance: 0.5, min: 1, max: 4 }],
    };
    const c: ContentDB = { ...content, elites: { [variant.id]: variant } };
    const TOTAL_TICKS = 600; // 60 s — weit unter jedem Zonen-Cooldown (keine Zyklus-Divergenz)

    const setup = (): GameState => {
      const s = createGame({ name: "Parity", baseAttributes: { str: 80, dex: 80, con: 80 } }, c, 7);
      s.eliteZones.pastures = { variantId: variant.id, remainingMs: ELITE_WINDOW_MS };
      expect(startEliteCombat(s, c, "pastures")).toBe(true);
      return s;
    };

    const online = setup();
    for (let k = 0; k < TOTAL_TICKS; k++) advance(online, c, TICK_MS);

    const offline = setup();
    advance(offline, c, TOTAL_TICKS * TICK_MS, { offline: true });

    // Der Kampf ist in beiden Läufen vorbei und hat den Breadcrumb geschrieben (chicken-Basis ×5 HP
    // fällt in 60 s locker).
    expect(online.combat.monsterId).toBeNull();
    expect(online.lastEliteKill).not.toBeNull();

    // Kern-Parität: identische Beute, identischer Breadcrumb (inkl. atMs — Spielzeit, keine Wanduhr).
    expect(offline.lastEliteKill).toEqual(online.lastEliteKill);
    expect(offline.eliteKillSeq).toBe(online.eliteKillSeq);
    expect(offline.rng).toEqual(online.rng);
    expect(offline.inventory).toEqual(online.inventory);
    expect(offline.character.questTokens).toBe(online.character.questTokens);
  });
});
