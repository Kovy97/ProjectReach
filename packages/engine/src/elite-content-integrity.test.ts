import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { LocalizedString } from "@hearthforge/shared";

/** `LocalizedString` ist `string | {en, ...}` — nur im Objekt-Zweig existieren `.en`/`.de`. */
function isBilingual(v: LocalizedString): boolean {
  return typeof v !== "string" && !!v.en && !!v.de;
}

/**
 * Elite-/World-Spawns Phase 2 (design/elite-balance-spec.md) — Content-Integritäts-Guard für
 * `content.elites` + die zugehörigen Unique-Items (28 aus Phase 2 + elite_ossric/esthar, 1.2.0
 * Chef 28.08.2026 = 29). Ergänzt (nicht ersetzt) die generischen
 * Suiten `wiring-audit.test.ts`/`content-integrity.test.ts`, die `content.elites` selbst NICHT
 * kennen. Content-dev-Revier (packages/content/**), daher hier statt bei Kontrolleur.
 */
const ELITE_COUNT = 29; // 28 (Phase 2) + elite_ossric (1.2.0, Hochland, Community-Item Esthar)

describe("Elite-Content-Integrität (Phase 2, 28 Varianten + 1.2.0 Ossric)", () => {
  const elites = Object.values(content.elites ?? {});
  const zoneIds = new Set(content.zones.map((z) => z.id));
  // Idol-Hall-Sonderfall (elite-spawns-concept.md §5/§6 P1, Chef-GO): idol_warden/aether_wraith
  // sind als dungeonOnly-Stat-Vorlagen erlaubt — last_idol/drazhan (Story-Bosse) bleiben tabu.
  const TABOO_BASE_IDS = new Set(["last_idol", "drazhan"]);

  it("29 Elite-Varianten vorhanden (Bestands-Detektor — bei Absicht mitziehen)", () => {
    expect(elites.length).toBe(ELITE_COUNT);
  });

  it("jede Variante referenziert eine existierende Zone", () => {
    const offenders = elites.filter((e) => !zoneIds.has(e.zone)).map((e) => `${e.id} → zone "${e.zone}"`);
    expect(offenders).toEqual([]);
  });

  it("jede Variante referenziert ein existierendes Basis-Monster — last_idol/drazhan bleiben tabu", () => {
    const missing = elites.filter((e) => !content.monsters[e.baseMonsterId]).map((e) => `${e.id} → baseMonsterId "${e.baseMonsterId}"`);
    expect(missing).toEqual([]);
    const forbidden = elites.filter((e) => TABOO_BASE_IDS.has(e.baseMonsterId)).map((e) => `${e.id} → baseMonsterId "${e.baseMonsterId}" (tabu)`);
    expect(forbidden).toEqual([]);
  });

  it("dungeonOnly-Basis-Mobs sind NUR im Idol-Hall-Sonderfall erlaubt (idol_warden/aether_wraith)", () => {
    const ALLOWED_DUNGEON_ONLY_BASES = new Set(["idol_warden", "aether_wraith"]);
    const offenders = elites
      .filter((e) => content.monsters[e.baseMonsterId]?.dungeonOnly === true)
      .filter((e) => !ALLOWED_DUNGEON_ONLY_BASES.has(e.baseMonsterId))
      .map((e) => `${e.id} → baseMonsterId "${e.baseMonsterId}" ist dungeonOnly, aber nicht in der Idol-Hall-Ausnahme`);
    expect(offenders).toEqual([]);
  });

  it("jede Variante referenziert ein existierendes Unique-Item — je Variante GENAU EINES, keine Dopplung", () => {
    const missing = elites.filter((e) => !content.items[e.uniqueItemId]).map((e) => `${e.id} → uniqueItemId "${e.uniqueItemId}"`);
    expect(missing).toEqual([]);

    const seen = new Map<string, string[]>();
    for (const e of elites) {
      const ids = seen.get(e.uniqueItemId) ?? [];
      ids.push(e.id);
      seen.set(e.uniqueItemId, ids);
    }
    const duplicated = [...seen.entries()].filter(([, ids]) => ids.length > 1).map(([itemId, ids]) => `${itemId}: ${ids.join(", ")}`);
    expect(duplicated).toEqual([]);
  });

  it("statMults.hp/.damage sind gesetzt und > 0; statMults.accuracy/.defense (falls gesetzt) sind ebenfalls > 0", () => {
    const offenders: string[] = [];
    for (const e of elites) {
      if (!(e.statMults.hp > 0)) offenders.push(`${e.id}: statMults.hp=${e.statMults.hp}`);
      if (!(e.statMults.damage > 0)) offenders.push(`${e.id}: statMults.damage=${e.statMults.damage}`);
      if (e.statMults.accuracy !== undefined && !(e.statMults.accuracy > 0)) {
        offenders.push(`${e.id}: statMults.accuracy=${e.statMults.accuracy}`);
      }
      if (e.statMults.defense !== undefined && !(e.statMults.defense > 0)) {
        offenders.push(`${e.id}: statMults.defense=${e.statMults.defense}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("enrageDamageMultOverride (falls gesetzt) ist > 0 und der Basis-Mob trägt ein enrage", () => {
    const offenders: string[] = [];
    for (const e of elites) {
      if (e.enrageDamageMultOverride === undefined) continue;
      if (!(e.enrageDamageMultOverride > 0)) offenders.push(`${e.id}: enrageDamageMultOverride=${e.enrageDamageMultOverride}`);
      const base = content.monsters[e.baseMonsterId];
      if (base && !base.enrage) offenders.push(`${e.id}: enrageDamageMultOverride gesetzt, aber Basis-Mob "${e.baseMonsterId}" trägt kein enrage`);
    }
    expect(offenders).toEqual([]);
  });

  // ── Phase-1.5-Achsen (Chef-Auftrag 2026-07-22, Contract-Lücke aus dem Phase-2-Bericht) ──────
  it("statMults.evasion/.wardCapacity (falls gesetzt) sind > 0; wardCapacity NUR bei Ward-Basis-Mob", () => {
    const offenders: string[] = [];
    for (const e of elites) {
      if (e.statMults.evasion !== undefined && !(e.statMults.evasion > 0)) {
        offenders.push(`${e.id}: statMults.evasion=${e.statMults.evasion}`);
      }
      if (e.statMults.wardCapacity !== undefined) {
        if (!(e.statMults.wardCapacity > 0)) offenders.push(`${e.id}: statMults.wardCapacity=${e.statMults.wardCapacity}`);
        const base = content.monsters[e.baseMonsterId];
        if (base && !((base.wardCapacity ?? 0) > 0)) {
          offenders.push(`${e.id}: statMults.wardCapacity gesetzt, aber Basis-Mob "${e.baseMonsterId}" trägt keinen wardCapacity`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("regenMult (falls gesetzt) ist > 0 und der Basis-Mob trägt regen", () => {
    const offenders: string[] = [];
    for (const e of elites) {
      if (e.regenMult === undefined) continue;
      if (!(e.regenMult > 0)) offenders.push(`${e.id}: regenMult=${e.regenMult}`);
      const base = content.monsters[e.baseMonsterId];
      if (base && base.regen === undefined) offenders.push(`${e.id}: regenMult gesetzt, aber Basis-Mob "${e.baseMonsterId}" trägt kein regen`);
    }
    expect(offenders).toEqual([]);
  });

  it("inflictOverride (falls gesetzt) ist strukturell gültig (bekannter StatusType, Chance 0..1, Magnitude/Dauer > 0)", () => {
    const VALID_TYPES = new Set(["burn", "frost", "shock", "poison", "bleed"]);
    const offenders: string[] = [];
    for (const e of elites) {
      if (!e.inflictOverride) continue;
      const inf = e.inflictOverride;
      if (!VALID_TYPES.has(inf.type)) offenders.push(`${e.id}: inflictOverride.type="${inf.type}" unbekannt`);
      if (!(inf.chance > 0 && inf.chance <= 1)) offenders.push(`${e.id}: inflictOverride.chance=${inf.chance} außerhalb (0,1]`);
      if (!(inf.magnitude > 0)) offenders.push(`${e.id}: inflictOverride.magnitude=${inf.magnitude}`);
      if (!(inf.durationMs > 0)) offenders.push(`${e.id}: inflictOverride.durationMs=${inf.durationMs}`);
    }
    expect(offenders).toEqual([]);
  });

  it("Bestands-Detektor: genau die 11 Caster-Varianten tragen wardCapacity, jeweils IDENTISCH zu statMults.hp (elite-balance-spec.md §0)", () => {
    const EXPECTED_CASTER_IDS = [
      "elite_pastures_imp", "elite_border_warlock", "elite_black_witch", "elite_crypt_icemage",
      "elite_crypt_pyroclasp", "elite_coast_siren", "elite_slag_ember", "elite_slag_hexer",
      "elite_high_specter", "elite_idol_wraith",
      "elite_ossric", // 1.2.0 (Chef 28.08.2026): zweite Variante auf der Ward-Basis gravecliff_specter
    ].sort();
    const withWard = elites.filter((e) => e.statMults.wardCapacity !== undefined).map((e) => e.id).sort();
    expect(withWard).toEqual(EXPECTED_CASTER_IDS);
    const offenders = elites
      .filter((e) => e.statMults.wardCapacity !== undefined)
      .filter((e) => e.statMults.wardCapacity !== e.statMults.hp)
      .map((e) => `${e.id}: wardCapacity=${e.statMults.wardCapacity} ≠ hp=${e.statMults.hp}`);
    expect(offenders).toEqual([]);
  });

  it("jede Variante ist zweisprachig (name.en + name.de)", () => {
    const offenders = elites.filter((e) => !isBilingual(e.name)).map((e) => e.id);
    expect(offenders).toEqual([]);
  });

  it("extraLoot (falls gesetzt) referenziert existierende Items mit chance 0..1 und min ≤ max", () => {
    const offenders: string[] = [];
    for (const e of elites) {
      for (const roll of e.extraLoot ?? []) {
        if (!content.items[roll.itemId]) offenders.push(`${e.id}: extraLoot-itemId "${roll.itemId}" fehlt`);
        if (!(roll.chance > 0 && roll.chance <= 1)) offenders.push(`${e.id}: extraLoot ${roll.itemId} chance=${roll.chance} außerhalb (0,1]`);
        if (!(roll.min >= 1) || roll.min > roll.max) offenders.push(`${e.id}: extraLoot ${roll.itemId} min=${roll.min} max=${roll.max} ungültig`);
      }
    }
    expect(offenders).toEqual([]);
  });

  describe("29 Unique-Items", () => {
    const uniqueIds = elites.map((e) => e.uniqueItemId);

    it("29 Unique-Item-Ids referenziert (Bestands-Detektor)", () => {
      expect(uniqueIds.length).toBe(ELITE_COUNT);
    });

    it("jedes Unique ist Equipment mit Slot, Rarity und Verkaufswert > 0", () => {
      const offenders: string[] = [];
      for (const id of uniqueIds) {
        const it = content.items[id]!;
        if (it.type !== "equipment") offenders.push(`${id}: type="${it.type}" (erwartet equipment)`);
        if (!it.slot) offenders.push(`${id}: kein slot gesetzt`);
        if (!it.rarity) offenders.push(`${id}: keine rarity gesetzt`);
        if (!((it.value ?? 0) > 0)) offenders.push(`${id}: value=${it.value} (erwartet > 0, Sink „Verkauf")`);
      }
      expect(offenders).toEqual([]);
    });

    it("jedes Unique ist zweisprachig (name.en + name.de)", () => {
      const offenders = uniqueIds.filter((id) => {
        const it = content.items[id]!;
        return !isBilingual(it.name);
      });
      expect(offenders).toEqual([]);
    });

    /**
     * Konzept §3.2/Chef-Vorgabe: „Uniques tragen von Anfang an besondere Procs/Passiva" — jedes der
     * 28 muss MINDESTENS einen Effekt tragen: einen WeaponEffect (Status- ODER Spezial-Kind) ODER
     * eine passive `bonus`-Auszeichnung über die reinen Stat-Felder hinaus (lifesteal/hpRegenPerSec
     * — die beiden reinen Passiv-Uniques #11 Oldgrowth Plate / #16 Greytooth Mantle).
     */
    it("jedes Unique hat einen Proc/Passiv-Effekt gesetzt", () => {
      const offenders: string[] = [];
      for (const id of uniqueIds) {
        const it = content.items[id]!;
        const hasWeaponEffect = !!it.weaponEffect || (it.weaponEffects?.length ?? 0) > 0;
        const hasPassiveBonus = (it.bonus?.lifesteal ?? 0) > 0 || (it.bonus?.hpRegenPerSec ?? 0) > 0;
        if (!hasWeaponEffect && !hasPassiveBonus) offenders.push(id);
      }
      expect(offenders).toEqual([]);
    });

    it("weaponEffect.magnitude/chance (falls gesetzt) sind endliche, nicht-negative Zahlen", () => {
      const offenders: string[] = [];
      for (const id of uniqueIds) {
        const it = content.items[id]!;
        const effects = [it.weaponEffect, ...(it.weaponEffects ?? [])].filter((e): e is NonNullable<typeof e> => !!e);
        for (const eff of effects) {
          if (!Number.isFinite(eff.magnitude) || eff.magnitude < 0) offenders.push(`${id}: ${eff.type}.magnitude=${eff.magnitude}`);
          if (!Number.isFinite(eff.chance) || eff.chance < 0 || eff.chance > 1) offenders.push(`${id}: ${eff.type}.chance=${eff.chance}`);
        }
      }
      expect(offenders).toEqual([]);
    });

    it("Waffen-Uniques (weaponStyle gesetzt) tragen ein gültiges weaponType", () => {
      const offenders = uniqueIds
        .map((id) => content.items[id]!)
        .filter((it) => it.weaponStyle && !it.weaponType)
        .map((it) => it.id);
      expect(offenders).toEqual([]);
    });
  });
});
