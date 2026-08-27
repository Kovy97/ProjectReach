import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, ItemDef, MasterPerk, PetSkillEffect } from "@hearthforge/shared";
import { COMPLETION_CAPE_KEY, DEFAULT_STUN_MS, MASTER_PERK_CAP, masterRingItemId } from "@hearthforge/shared";
import { createGame } from "./state";
import { advance } from "./tick";
import { setActiveAction } from "./actions";
import { addItem, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { useConsumable } from "./consumable";
import { plantCrop, plotProgress } from "./farming";
import { recordKillForSlayer } from "./slayer";
import { petDoubleYieldBonus } from "./pets";
import {
  checkMasteryCapes,
  grantPendingCapes,
  markCapeCeremonySeen,
  masterAlwaysSucceeds,
  masterBuffDurationMult,
  masterCropSpeedBonus,
  masterDoubleYieldBonus,
  masterPreserveBonus,
  masterSlayerPointsBonus,
  masterStunReduction,
  masterSuccessBonus,
  pendingCapeCeremonies,
} from "./capes";

/**
 * Meisterweihe-Guards (design/master-capes-konzept.md, Engine-Fundament 2026-07-09):
 *  §1 Weihe bei Level 99 — einmalig, idempotent, über den advance-Chokepoint.
 *  §2 Verleihung mit/ohne existierendes Content-Item + Nachreichung (Content-Guard) +
 *     kein Verlust-Fenster bei vollem Inventar.
 *  §3 Zeremonie-Signal (pendingCapeCeremonies / markCapeCeremonySeen) für die UI-Welle.
 *  §4 Perk-Aggregation: Skill-Scope, Cap-Klemme, Additivität mit den Pet-Boni.
 *  §5 Jede der 8 Perk-Verdrahtungen EINZELN end-to-end (synthetische Cape-Items).
 *  §6 No-op-/Determinismus-Guard: ohne Cape-Items sind Weihe-Marker RNG-neutral (bit-identisch).
 *
 * Alle Tests sind deterministisch: feste Seeds; wo ein RNG-Treffer nötig ist (Doppelertrag/
 * Preservation), sucht eine BEGRENZTE Seed-Schleife den Treffer — das Ergebnis je Seed ist
 * reproduzierbar, die Schleife dokumentiert nur, dass der Effekt AUS DEM PERK kommen muss.
 */

const CAPE_ID = "test_master_cape";

/** Content-Klon mit einem synthetischen Cape-Slot-Item, das den gegebenen masterPerk trägt. */
function withPerkCape(perk: MasterPerk, extraItems: Record<string, ItemDef> = {}): ContentDB {
  const cape: ItemDef = {
    id: CAPE_ID,
    name: "Test Master Cape",
    type: "equipment",
    stackable: false,
    slot: "cape",
    rarity: "legendary",
    masterPerk: perk,
  };
  return { ...content, items: { ...content.items, [CAPE_ID]: cape, ...extraItems } };
}

/** Rüstet das Test-Cape direkt aus (Engine liest equipment[slot] — wie geladene Saves). */
function equipCape(s: ReturnType<typeof createGame>): void {
  s.character.equipment.cape = CAPE_ID;
}

/** Content-Klon mit einem ECHTEN `ring_master_<skill>`-Item (Verleihungs-/Nachreich-Tests). */
function withMasterCapeItem(skillId: string): ContentDB {
  const id = masterRingItemId(skillId);
  const ring: ItemDef = {
    id,
    name: `Master Ring (${skillId})`,
    type: "equipment",
    stackable: false,
    slot: "ring1",
    rarity: "legendary",
    requirements: { [skillId]: 99 },
  };
  return { ...content, items: { ...content.items, [id]: ring } };
}

/**
 * Content-Klon OHNE jegliche `ring_master_*`-Items (Content-Welle 2026-07-10 lieferte alle 20
 * echten Meister-Items, seit SAVE 69 als Ringe — Tests, die gezielt das „Item existiert (noch)
 * nicht"-Verhalten prüfen, brauchen dafür einen Content-Stand OHNE sie, statt sich auf eine
 * inzwischen falsche Annahme über den globalen `content` zu verlassen).
 */
function withoutMasterCapes(): ContentDB {
  const items = { ...content.items };
  for (const skillId of Object.keys(content.skills)) delete items[masterRingItemId(skillId)];
  return { ...content, items };
}

// ───────────────────────────────────────────────────────────────────────────
// §0 Vollendungs-Weihe (COMPLETION_CAPE_KEY): ALLE Skills ≥ 99 → ring_master_completion
// ───────────────────────────────────────────────────────────────────────────
describe("Meisterweihe §0: Vollendungs-Weihe (alle Skills 99)", () => {
  it("verleiht die Vollendung erst, wenn WIRKLICH alle Skills ≥ 99 sind — dann genau einmal", () => {
    const s = createGame({ name: "T", startingStyle: "melee", starterKit: false, baseAttributes: {} }, content, 1);
    const skillIds = Object.keys(content.skills);
    // Alle bis auf einen auf 99 → KEINE Vollendung.
    for (const id of skillIds.slice(1)) s.skills[id] = { xp: xpForLevel(99) };
    checkMasteryCapes(s, content);
    expect(s.masteryCapes?.[COMPLETION_CAPE_KEY]).toBeUndefined();
    // Letzter Skill auf 99 → Vollendung markiert, Cape verliehen, Zeremonie offen.
    s.skills[skillIds[0]!] = { xp: xpForLevel(99) };
    const newly = checkMasteryCapes(s, content);
    expect(newly).toContain(COMPLETION_CAPE_KEY);
    expect(s.masteryCapes?.[COMPLETION_CAPE_KEY]).toBe(true);
    expect(s.capeGranted?.[COMPLETION_CAPE_KEY]).toBe(true);
    const capeId = masterRingItemId(COMPLETION_CAPE_KEY);
    expect(itemCount(s.inventory, capeId) + (s.bank[capeId] ?? 0)).toBe(1);
    expect(pendingCapeCeremonies(s)).toContain(COMPLETION_CAPE_KEY);
    // Idempotent: zweiter Lauf verleiht NICHT erneut.
    checkMasteryCapes(s, content);
    expect(itemCount(s.inventory, capeId) + (s.bank[capeId] ?? 0)).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §1 Weihe bei 99 — einmalig & idempotent
// ───────────────────────────────────────────────────────────────────────────
describe("Meisterweihe §1: Weihe-Marker bei Level 99", () => {
  it("setzt den Marker bei Level ≥ 99 über den advance-Chokepoint — einmalig & idempotent", () => {
    const local = withoutMasterCapes(); // isoliert den Marker-Test von der Cape-VERLEIHUNG (§2)
    const s = createGame({ name: "X" }, local, 1);
    s.skills.mining = { xp: xpForLevel(99) };
    s.skills.fishing = { xp: xpForLevel(98) }; // knapp darunter → KEINE Weihe

    advance(s, local, 100);
    expect(s.masteryCapes.mining).toBe(true);
    expect(s.masteryCapes.fishing).toBeUndefined();
    // Kein Cape-Item im Content → nur der Marker, keine Verleihung.
    expect(s.capeGranted).toEqual({});
    // Zeremonie offen (die Migration/Weihe setzt seen NIE selbst).
    expect(pendingCapeCeremonies(s)).toEqual(["mining"]);

    // Idempotent: weitere advances ändern nichts (Marker monoton, keine Duplikate).
    const snapshot = { ...s.masteryCapes };
    advance(s, local, 1000);
    expect(s.masteryCapes).toEqual(snapshot);
    expect(pendingCapeCeremonies(s)).toEqual(["mining"]);
  });

  it("checkMasteryCapes liefert die FRISCH geweihten Skills zurück (nur beim ersten Mal)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.skills.woodcutting = { xp: xpForLevel(99) };
    expect(checkMasteryCapes(s, content)).toEqual(["woodcutting"]);
    expect(checkMasteryCapes(s, content)).toEqual([]); // zweiter Aufruf: nichts Neues
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §2 Verleihung: Content-Guard + Nachreichung + kein Verlust-Fenster
// ───────────────────────────────────────────────────────────────────────────
describe("Meisterweihe §2: Cape-Verleihung & Nachreichung", () => {
  it("verleiht das Cape-Item GENAU EINMAL, wenn es im Content existiert", () => {
    const local = withMasterCapeItem("mining");
    const s = createGame({ name: "X" }, local, 1);
    s.skills.mining = { xp: xpForLevel(99) };

    advance(s, local, 100);
    const capeId = masterRingItemId("mining");
    expect(itemCount(s.inventory, capeId) + (s.bank[capeId] ?? 0)).toBe(1);
    expect(s.capeGranted.mining).toBe(true);
    expect(s.discoveredItems[capeId]).toBe(true); // addItemOrBank markiert die Entdeckung

    advance(s, local, 5000); // kein zweites Cape (capeGranted-Marker)
    expect(itemCount(s.inventory, capeId) + (s.bank[capeId] ?? 0)).toBe(1);
  });

  it("Content-Guard: ohne Item nur der Marker; die Nachreichung verleiht, sobald der Content da ist", () => {
    const withoutItem = withoutMasterCapes(); // simuliert den Content-Stand VOR dieser Content-Welle
    const s = createGame({ name: "X" }, withoutItem, 1);
    s.skills.mining = { xp: xpForLevel(99) };
    advance(s, withoutItem, 100);
    expect(s.masteryCapes.mining).toBe(true);
    expect(s.capeGranted).toEqual({}); // Item existiert (noch) nicht

    // Content-Welle liefert das Item → der nächste advance (checkMasteryCapes) reicht nach.
    const local = withMasterCapeItem("mining");
    advance(s, local, 100);
    const capeId = masterRingItemId("mining");
    expect(s.capeGranted.mining).toBe(true);
    expect(itemCount(s.inventory, capeId) + (s.bank[capeId] ?? 0)).toBe(1);
  });

  it("Zustell-Garantie (Chef-Fund 2026-07-18): volles Inventar + Auto-Bank aus ⇒ Ring landet DIREKT in der Bank", () => {
    // Vorher blieb die Verleihung in diesem Fall „pending" (Retry beim nächsten advance) — genau
    // in diesem Fenster ging dem Chef das 99er-Fishing-Cape verloren. Jetzt: addItemOrBank
    // liefert 0 ⇒ Direkt-Zustellung in den Bank-Record + granted-Marker sofort gesetzt.
    const local = withMasterCapeItem("mining");
    const s = createGame({ name: "X" }, local, 1);
    s.skills.mining = { xp: xpForLevel(99) };
    s.settings.autoBank = false;
    // Inventar komplett mit vollen Stacks blockieren → addItemOrBank liefert 0.
    for (let i = 0; i < s.inventory.slots.length; i++) {
      s.inventory.slots[i] = { itemId: "copper_ore", qty: 9999 };
    }

    advance(s, local, 100);
    const ringId = masterRingItemId("mining");
    expect(s.masteryCapes.mining).toBe(true);
    expect(s.capeGranted.mining).toBe(true); // sofort verliehen — kein Pending-Fenster mehr
    expect(s.bank[ringId]).toBe(1); // Direkt-Zustellung in die Bank
    expect(itemCount(s.inventory, ringId)).toBe(0);
    expect(s.discoveredItems[ringId]).toBe(true); // Zustellung markiert die Entdeckung

    // Idempotent: weitere advances verleihen NICHT erneut.
    advance(s, local, 5000);
    expect((s.bank[ringId] ?? 0) + itemCount(s.inventory, ringId)).toBe(1);
  });

  it("grantPendingCapes ist direkt aufrufbar (sanitize-Pfad der Persistenz) und idempotent", () => {
    const local = withMasterCapeItem("slayer");
    const s = createGame({ name: "X" }, local, 1);
    s.masteryCapes.slayer = true; // z.B. rückwirkend von der v59-Migration gesetzt
    grantPendingCapes(s, local);
    grantPendingCapes(s, local);
    const capeId = masterRingItemId("slayer");
    expect(itemCount(s.inventory, capeId) + (s.bank[capeId] ?? 0)).toBe(1);
    expect(s.capeGranted.slayer).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §3 Zeremonie-Signal für die UI-Welle
// ───────────────────────────────────────────────────────────────────────────
describe("Meisterweihe §3: pendingCapeCeremonies / markCapeCeremonySeen", () => {
  it("liefert offene Zeremonien in Weihe-Reihenfolge; seen filtert; Quittung nur für echte Weihen", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.skills.mining = { xp: xpForLevel(99) };
    s.skills.fishing = { xp: xpForLevel(99) };
    checkMasteryCapes(s, content);
    // Insertion-Order = Content-Skill-Reihenfolge beim gemeinsamen Weihe-Durchlauf.
    const pending = pendingCapeCeremonies(s);
    expect(pending).toHaveLength(2);
    expect(new Set(pending)).toEqual(new Set(["mining", "fishing"]));

    markCapeCeremonySeen(s, pending[0]!);
    expect(pendingCapeCeremonies(s)).toEqual([pending[1]]);
    markCapeCeremonySeen(s, pending[1]!);
    expect(pendingCapeCeremonies(s)).toEqual([]);

    // No-op für nie geweihte Skills (Invariante seen ⊆ masteryCapes bleibt gewahrt).
    markCapeCeremonySeen(s, "woodcutting");
    expect(s.capeCeremonySeen.woodcutting).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §4 Perk-Aggregation: Scope, Cap, Additivität mit Pets
// ───────────────────────────────────────────────────────────────────────────
describe("Meisterweihe §4: masterPerk-Aggregation", () => {
  it("Skill-Scope: Perk wirkt nur für den deklarierten Skill; nur ausgerüstet; skill-frei = überall", () => {
    const local = withPerkCape({ kind: "doubleYield", skill: "woodcutting", value: 0.05 });
    const s = createGame({ name: "X" }, local, 1);
    expect(masterDoubleYieldBonus(s, local, "woodcutting")).toBe(0); // nicht ausgerüstet
    equipCape(s);
    expect(masterDoubleYieldBonus(s, local, "woodcutting")).toBeCloseTo(0.05, 10);
    expect(masterDoubleYieldBonus(s, local, "mining")).toBe(0); // falscher Skill

    const globalCape = withPerkCape({ kind: "doubleYield", value: 0.05 }); // ohne skill → generisch
    const s2 = createGame({ name: "X" }, globalCape, 1);
    equipCape(s2);
    expect(masterDoubleYieldBonus(s2, globalCape, "mining")).toBeCloseTo(0.05, 10);
  });

  it("Cap-Klemme: Fehl-Content (value 5) wird auf MASTER_PERK_CAP geklemmt; NaN/negativ → 0", () => {
    const big = withPerkCape({ kind: "doubleYield", skill: "mining", value: 5 });
    const s = createGame({ name: "X" }, big, 1);
    equipCape(s);
    expect(masterDoubleYieldBonus(s, big, "mining")).toBe(MASTER_PERK_CAP.doubleYield);

    const bad = withPerkCape({ kind: "successBoost", skill: "thieving", value: Number.NaN });
    const s2 = createGame({ name: "X" }, bad, 1);
    equipCape(s2);
    expect(masterSuccessBonus(s2, bad, "thieving")).toBe(0);
  });

  it("Additivität mit Pet-Boni: Cape-doubleYield + Pet-doubleDrop stapeln additiv (0.05 + 0.05)", () => {
    const petEffect: PetSkillEffect = { kind: "doubleDrop", skill: "mining", value: 0.05 };
    const local: ContentDB = {
      ...withPerkCape({ kind: "doubleYield", skill: "mining", value: 0.05 }),
      pets: {
        test_pet: {
          id: "test_pet",
          name: "T",
          skillEffect: petEffect,
          combatAbility: { name: "A", kind: "stun", intervalMs: 100_000_000, value: 600 },
          source: { kind: "skill", skill: "mining" },
          dropChance: 0,
          icon: "x",
        },
      },
    };
    const s = createGame({ name: "X" }, local, 1);
    equipCape(s);
    s.character.ownedPets.test_pet = true;
    s.character.companionPetId = "test_pet";
    const pet = petDoubleYieldBonus(s, local, "mining");
    const cape = masterDoubleYieldBonus(s, local, "mining");
    expect(pet).toBeCloseTo(0.05, 10);
    expect(cape).toBeCloseTo(0.05, 10);
    expect(pet + cape).toBeCloseTo(0.1, 10); // exakt die Summe, die tick.ts in bonusChance addiert
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §5 Die 8 Verdrahtungen einzeln (end-to-end über die echten Engine-Pfade)
// ───────────────────────────────────────────────────────────────────────────
describe("Meisterweihe §5: Perk-Verdrahtungen einzeln", () => {
  it("doubleYield (tick.ts bonusChance): Doppelertrag ist NUR mit Cape möglich (mastery 0)", () => {
    // mine_copper: chance 1, min=max=1 → Ertrag pro Abschluss ist 1 ODER (nur via bonusChance) 2.
    // Bei Mastery Level 1 ist masteryDoubleChance 0 → ohne Cape ist der Doppel unmöglich.
    // Begrenzte Seed-Suche nach einem Treffer (Cap 0.10) — deterministisch je Seed.
    const local = withPerkCape({ kind: "doubleYield", skill: "mining", value: 0.1 });
    let hitSeed = -1;
    for (let seed = 1; seed <= 500 && hitSeed < 0; seed++) {
      const s = createGame({ name: "X" }, local, seed);
      equipCape(s);
      setActiveAction(s, local, "mine_copper");
      advance(s, local, 3000); // exakt 1 Abschluss
      if (itemCount(s.inventory, "copper_ore") === 2) hitSeed = seed;
    }
    expect(hitSeed, "kein Doppelertrag in 500 Seeds — Verdrahtung tot?").toBeGreaterThan(0);

    // Kontrolle: identischer Seed OHNE Cape → exakt 1 Erz (kein Bonus-Wurf existiert).
    const s = createGame({ name: "X" }, content, hitSeed);
    setActiveAction(s, content, "mine_copper");
    advance(s, content, 3000);
    expect(itemCount(s.inventory, "copper_ore")).toBe(1);
  });

  it("inputSaver (tick.ts preserveChance): Materialerhalt ist NUR mit Cape möglich (mastery 0)", () => {
    // smelt_copper: 1× copper_ore → 1× copper_bar. Bei Mastery 1 + Pool 0 + kein Pet ist
    // preserveChance ohne Cape exakt 0 (kein Preserve-Wurf) → Erz wird IMMER verbraucht.
    const local = withPerkCape({ kind: "inputSaver", skill: "smithing", value: 0.1 });
    let hitSeed = -1;
    for (let seed = 1; seed <= 500 && hitSeed < 0; seed++) {
      const s = createGame({ name: "X" }, local, seed);
      equipCape(s);
      addItem(s.inventory, local, "copper_ore", 5);
      setActiveAction(s, local, "smelt_copper");
      advance(s, local, 2600); // exakt 1 Abschluss
      if (itemCount(s.inventory, "copper_bar") === 1 && itemCount(s.inventory, "copper_ore") === 5) {
        hitSeed = seed; // Barren erzeugt UND Erz erhalten = Preservation griff
      }
    }
    expect(hitSeed, "keine Preservation in 500 Seeds — Verdrahtung tot?").toBeGreaterThan(0);

    const s = createGame({ name: "X" }, content, hitSeed);
    addItem(s.inventory, content, "copper_ore", 5);
    setActiveAction(s, content, "smelt_copper");
    advance(s, content, 2600);
    expect(itemCount(s.inventory, "copper_ore")).toBe(4); // ohne Cape immer verbraucht
  });

  it("cropSpeed (farming.ts effectiveGrowMs): Beete reifen um den Perk-Wert schneller — Engine UND UI-Balken", () => {
    const GROW = 600_000;
    const seedDef: ItemDef = { id: "t_seed", name: "s", type: "material", stackable: true };
    const herbDef: ItemDef = { id: "t_herb", name: "h", type: "material", stackable: true };
    const base = withPerkCape({ kind: "cropSpeed", skill: "farming", value: 0.08 });
    const local: ContentDB = {
      ...base,
      items: { ...base.items, t_seed: seedDef, t_herb: herbDef },
      crops: {
        t_crop: {
          id: "t_crop", name: "c", seedItem: "t_seed", yieldItem: "t_herb",
          yieldMin: 8, yieldMax: 8, levelRequired: 1, growMs: GROW, xp: 24, tier: 1,
        },
      },
    };
    const s = createGame({ name: "X" }, local, 1);
    equipCape(s);
    addItem(s.inventory, local, "t_seed", 1);
    expect(plantCrop(s, local, 0, "t_crop")).toBe(true);

    const effective = Math.round(GROW * (1 - 0.08)); // 552 000 ms
    advance(s, local, effective - 1000); // knapp davor: noch nichts
    expect(itemCount(s.inventory, "t_herb")).toBe(0);
    expect(plotProgress(s, local, 0).remainingMs).toBe(1000); // UI-Balken teilt dieselbe Uhr
    advance(s, local, 1000); // exakt bei der beschleunigten Reife
    expect(itemCount(s.inventory, "t_herb")).toBe(8);

    // Kontrolle ohne Cape: bei 552 000 ms ist die Crop noch NICHT reif (Basis 600 000).
    const s2 = createGame({ name: "X" }, local, 1);
    addItem(s2.inventory, local, "t_seed", 1);
    expect(plantCrop(s2, local, 0, "t_crop")).toBe(true);
    advance(s2, local, effective);
    expect(itemCount(s2.inventory, "t_herb")).toBe(0);
  });

  it("alwaysSucceed (tick.ts Erfolgs-Mechanik): Aktionen des Skills misslingen NIE (Soulchef-Hommage)", () => {
    const local = withPerkCape({ kind: "alwaysSucceed", skill: "thieving", value: 1 });
    const s = createGame({ name: "X" }, local, 123); // Seed 123 sah ohne Cape Stuns (thieving.test.ts)
    equipCape(s);
    setActiveAction(s, local, "pickpocket_beggar");
    let sawStun = false;
    for (let i = 0; i < 800; i++) {
      advance(s, local, 100);
      if (s.stunMs > 0) sawStun = true;
    }
    expect(sawStun).toBe(false); // 100 % Erfolg — kein einziger Fehlschlag/Stun
    expect(s.character.gold).toBeGreaterThan(0);

    // Kontrolle: identischer Seed ohne Cape → Fehlschläge existieren (successBase 0.6).
    const s2 = createGame({ name: "X" }, content, 123);
    setActiveAction(s2, content, "pickpocket_beggar");
    let sawStun2 = false;
    for (let i = 0; i < 800; i++) {
      advance(s2, content, 100);
      if (s2.stunMs > 0) sawStun2 = true;
    }
    expect(sawStun2).toBe(true);
  });

  it("buffDuration (consumable.ts applyConsumableBuff): +10 % Dauer beim Anlegen — auch beim Refresh", () => {
    const tonic: ItemDef = {
      id: "t_tonic", name: "t", type: "consumable", stackable: true,
      buff: { durationMs: 10_000, bonus: { gatherXpMult: 1.1 } },
    };
    const local = withPerkCape({ kind: "buffDuration", skill: "herblore", value: 0.1 }, { t_tonic: tonic });
    const s = createGame({ name: "X" }, local, 1);
    equipCape(s);
    addItem(s.inventory, local, "t_tonic", 2);
    expect(useConsumable(s, local, "t_tonic")).toBe(true);
    expect(s.character.buffs.find((b) => b.itemId === "t_tonic")?.remainingMs).toBe(11_000);
    // Aufladen (Chef 27.08.2026, buff-stacking.test.ts): der zweite Schluck ADDIERT seine ebenfalls verlängerte
    // Dauer auf die Restzeit (11 000 + 11 000) — der Cape-Faktor wirkt also auf jedes Stück, nicht nur aufs erste.
    expect(useConsumable(s, local, "t_tonic")).toBe(true);
    expect(s.character.buffs.find((b) => b.itemId === "t_tonic")?.remainingMs).toBe(22_000);

    // Kontrolle ohne Cape: exakt die Content-Dauer (Faktor exakt 1, keine Rundung).
    const s2 = createGame({ name: "X" }, local, 1);
    addItem(s2.inventory, local, "t_tonic", 1);
    expect(useConsumable(s2, local, "t_tonic")).toBe(true);
    expect(s2.character.buffs.find((b) => b.itemId === "t_tonic")?.remainingMs).toBe(10_000);
  });

  it("stunReduction (tick.ts Fehlschlag-Stun): −20 % auf die Betäubungsdauer", () => {
    // Synthetische Nicht-Thieving-Aktion (kein Risiko-Mult) mit successBase 0 → schlägt immer
    // fehl und nutzt DEFAULT_STUN_MS (kein eigenes stunMs).
    const base = withPerkCape({ kind: "stunReduction", skill: "foraging", value: 0.2 });
    const local: ContentDB = {
      ...base,
      actions: {
        ...base.actions,
        t_fail: { id: "t_fail", name: "f", skill: "foraging", durationMs: 1000, xp: 1, levelRequired: 1, successBase: 0, loot: [] },
      },
    };
    const s = createGame({ name: "X" }, local, 7);
    equipCape(s);
    setActiveAction(s, local, "t_fail");
    advance(s, local, 1000); // exakt 1 (fehlgeschlagener) Abschluss
    expect(s.stunMs).toBe(Math.round(DEFAULT_STUN_MS * 0.8)); // 960

    const s2 = createGame({ name: "X" }, local, 7);
    setActiveAction(s2, local, "t_fail");
    advance(s2, local, 1000);
    expect(s2.stunMs).toBe(DEFAULT_STUN_MS); // 1200 ohne Cape
  });

  it("successBoost (tick.ts successBonus → actionSuccessChance): hebt die Erfolgschance additiv", () => {
    // successBase 0 → ohne Cape ist die Chance exakt 0 (Erfolg nur bei Roll == 0 ⇒ praktisch nie);
    // mit +5 Pp gelingen über ein langes Fenster deterministisch (Seed-fix) einige Versuche.
    const base = withPerkCape({ kind: "successBoost", skill: "foraging", value: 0.05 });
    const local: ContentDB = {
      ...base,
      actions: {
        ...base.actions,
        t_try: { id: "t_try", name: "t", skill: "foraging", durationMs: 1000, xp: 1, levelRequired: 1, successBase: 0, loot: [] },
      },
    };
    const s = createGame({ name: "X" }, local, 42);
    equipCape(s);
    setActiveAction(s, local, "t_try");
    advance(s, local, 900_000); // ~15 min Sim (Fehlschläge kosten Stun-Zeit)
    expect(s.skills.foraging?.xp ?? 0).toBeGreaterThan(0); // Erfolge existieren nur via Boost

    const s2 = createGame({ name: "X" }, local, 42);
    setActiveAction(s2, local, "t_try");
    advance(s2, local, 900_000);
    expect(s2.skills.foraging?.xp ?? 0).toBe(0); // Chance 0 ohne Cape
  });

  it("slayerPoints (slayer.ts recordKillForSlayer): +10 % Punkte-Gutschrift, kaufmännisch gerundet", () => {
    const local = withPerkCape({ kind: "slayerPoints", skill: "slayer", value: 0.1 });
    const mkTask = () => ({
      masterId: "any", monsterId: "chicken", isTower: false,
      required: 1, progress: 0, xpReward: 0, pointReward: 10,
    });
    const s = createGame({ name: "X" }, local, 1);
    equipCape(s);
    s.slayerTask = mkTask();
    expect(recordKillForSlayer(s, local, "chicken")).toBe(true);
    expect(s.slayerPoints).toBe(11); // round(10 × 1.1)

    const s2 = createGame({ name: "X" }, local, 1);
    s2.slayerTask = mkTask();
    expect(recordKillForSlayer(s2, local, "chicken")).toBe(true);
    expect(s2.slayerPoints).toBe(10); // ohne Cape der alte Pfad (bit-identisch)
  });

  it("die 8 Lese-Helfer liefern je ihren Kind-Wert (Vollständigkeits-Sweep)", () => {
    const mk = (perk: MasterPerk) => {
      const local = withPerkCape(perk);
      const s = createGame({ name: "X" }, local, 1);
      equipCape(s);
      return { s, local };
    };
    let r = mk({ kind: "doubleYield", skill: "mining", value: 0.05 });
    expect(masterDoubleYieldBonus(r.s, r.local, "mining")).toBeCloseTo(0.05, 10);
    r = mk({ kind: "inputSaver", skill: "smithing", value: 0.05 });
    expect(masterPreserveBonus(r.s, r.local, "smithing")).toBeCloseTo(0.05, 10);
    r = mk({ kind: "cropSpeed", skill: "farming", value: 0.08 });
    expect(masterCropSpeedBonus(r.s, r.local)).toBeCloseTo(0.08, 10);
    r = mk({ kind: "alwaysSucceed", skill: "cooking", value: 1 });
    expect(masterAlwaysSucceeds(r.s, r.local, "cooking")).toBe(true);
    expect(masterAlwaysSucceeds(r.s, r.local, "thieving")).toBe(false);
    r = mk({ kind: "buffDuration", skill: "herblore", value: 0.1 });
    expect(masterBuffDurationMult(r.s, r.local)).toBeCloseTo(1.1, 10);
    r = mk({ kind: "stunReduction", skill: "thieving", value: 0.2 });
    expect(masterStunReduction(r.s, r.local, "thieving")).toBeCloseTo(0.2, 10);
    r = mk({ kind: "successBoost", skill: "thieving", value: 0.03 });
    expect(masterSuccessBonus(r.s, r.local, "thieving")).toBeCloseTo(0.03, 10);
    r = mk({ kind: "slayerPoints", skill: "slayer", value: 0.1 });
    expect(masterSlayerPointsBonus(r.s, r.local)).toBeCloseTo(0.1, 10);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §6 No-op-/Determinismus-Guard (Sim-Bitidentität ohne Cape-Content)
// ───────────────────────────────────────────────────────────────────────────
describe("Meisterweihe §6: No-op-Guard — ohne Cape-Items bleibt alles bit-identisch", () => {
  it("der Weihe-Marker zieht KEIN RNG: frisch geweiht vs. vor-markiert ⇒ identische End-States", () => {
    // A weiht mining im ersten advance; B startet bereits markiert. Wäre der Weihe-/Nachreich-
    // Pfad nicht RNG-/State-neutral, würden die Läufe divergieren (RNG-Stream, Erträge, XP).
    const build = (preMarked: boolean) => {
      const s = createGame({ name: "X" }, content, 777);
      s.character.createdAt = 0; // Wanduhr-Feld neutralisieren (Date.now in createCharacter)
      s.skills.mining = { xp: xpForLevel(99) };
      if (preMarked) s.masteryCapes.mining = true;
      setActiveAction(s, content, "mine_copper");
      advance(s, content, 60_000);
      return s;
    };
    const a = build(false);
    const b = build(true);
    expect(a.rng.state).toBe(b.rng.state);
    expect(a).toEqual(b); // kompletter State bit-identisch (inkl. Inventar/XP/Marker)
  });

  it("Live-Content-Detektor (SAVE 69, Ring-Umbau): alle 20 ring_master_*-Items existieren als Ringe", () => {
    // Spiegel des §8-Envelope-Pins (balance-envelope.test.ts): dieser Guard ist mit Absicht
    // GEDREHT worden, sobald content-dev die 20 Meister-Items geliefert hat (Konzept-Notiz §5);
    // seit dem Chef-Entscheid 2026-07-17 (SAVE 69) sind sie RINGE. Jeder Skill hat GENAU ein
    // Item unter der `masterRingItemId`-Konvention, alle im kanonischen Ring-Slot (ring1 —
    // equipment.ts weicht auf ring2 aus), alle legendary.
    for (const skillId of Object.keys(content.skills)) {
      const ring = content.items[masterRingItemId(skillId)];
      expect(ring, `ring_master_${skillId}`).toBeDefined();
      expect(ring?.slot, `ring_master_${skillId}.slot`).toBe("ring1");
      expect(ring?.rarity, `ring_master_${skillId}.rarity`).toBe("legendary");
    }
    // Welle TT (Chef-Entscheid 2026-07-18): „Enchanting geht in Runecrafting mit rein" — es gibt
    // FINAL keinen eigenen Enchanting-Skill (Verzauberungs-Progression = Runecrafting), und der
    // vormals geparkte 22. Ring ist ersatzlos aus dem Katalog entfernt. Dieser Guard pinnt beide
    // Seiten des Entscheids (reißt er, hat jemand den Skill oder das Item wieder eingeführt).
    expect(content.skills["enchanting"], "enchanting ist KEIN Skill (Chef-Entscheid 18.07.: in Runecrafting integriert)").toBeUndefined();
    expect(content.items["ring_master_enchanting"], "ring_master_enchanting ist entfernt (Welle TT)").toBeUndefined();
  });
});
