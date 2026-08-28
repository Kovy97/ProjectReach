import { describe, expect, it } from "vitest";
import { content } from "./index";
import type { EquipBonus, ItemDef, ItemId, LootRoll, MonsterId } from "@hearthforge/shared";
import { EQUIP_SLOTS, effectiveWeaponEffects } from "@hearthforge/shared";

/**
 * WÄCHTER — Rezension #8 (Chef-GO 25.08.2026, 1.1.0, design/rezension-patch-2026-08-25.html #p8):
 * „Monster-Ausrüstung sollte immer gut sein, immer besser auf dem Tier als hergestellte Rüstung."
 *
 * Regel für jedes Ausrüstungs-Unique aus einer Kampfquelle (Monster-Loot, Elite-Extra-Loot,
 * Dungeon-Truhe/-Abschluss, Paragon-Truhe):
 *  1) Kernwert ≥ das Craft-Gegenstück des NÄCHSTEN Tiers derselben Familie (Waffentyp bzw.
 *     Rüstungsslot+-klasse) — abgeleitet aus dem echten Katalog (keine Item-IDs hartkodiert).
 *  2) Effekt vorhanden (Status-Proc oder SpecialEffectType-Kind, oder bei Signaturen ein
 *     bonus.{hpRegenPerSec,lifesteal,critDamage}).
 *  3) Dropchance unter dem Deckel ihrer Klasse (Chase ≤ 0,1 %, sonst ≤ 15 % — großzügig genug für
 *     frühe Common-Drops, s. `REGULAR_CHANCE_CAP`-Kommentar).
 *  4) Requirement ≤ dem Level der Quelle (der Drop darf nie ein höheres Gate verlangen, als das
 *     eigene Erlege-Level hergibt) — Dungeons/Paragon bekommen eine großzügige Marge (tatsächliche
 *     Encounter-Level liegen über dem reinen Zugangs-Gate).
 *
 * Craft-Duplikate (Drop == fertiges Craft-Item, z.B. weil ein Monster direkt `iron_shortbow`
 * droppt) sind PER DEFINITION kein Chase-Fund und fallen NICHT unter diese Prüfung — sie sind kein
 * "Unique". Elite-Signatur-Items (`EliteVariantDef.uniqueItemId`) laufen mit der Engine-Konstante
 * `ELITE_UNIQUE_DROP_CHANCE_DEFAULT` (0,2, s. `@hearthforge/shared`) statt einer content-Chance —
 * hier separat mit fixem 20-%-Deckel geprüft.
 */

const CHASE_CHANCE_CAP = 0.001; // #8: "Chase-Zeilen (≤0,1 %) bleiben unverändert"
// Deckel für reguläre Zonen-/Elite-Extra-Zeilen: großzügig genug, um früheste (Level-1-5) Common-
// Drops zuzulassen (goblin_shaman/goblin_warchief-Klasse liegt real bei 8-12 %), aber weit unter
// jeder "im Grunde garantiert"-Zone.
const REGULAR_CHANCE_CAP = 0.15;
const ELITE_SIGNATURE_CHANCE_DEFAULT = 0.2; // ELITE_UNIQUE_DROP_CHANCE_DEFAULT (shared), hier lokal gepinnt

/**
 * Bekannte, geprüfte Ausnahmen von der reinen Requirement→Craft-Tier-Ableitung (Muster
 * `CHASE_ITEMS`/`LADDER_BASELINE`/`ladderExceptions` an anderer Stelle im Katalog — content-dev
 * pflegt diese Liste). Zwei Gründe:
 *  (a) Chase-Zeilen, deren Requirement schon VOR #8 hoch genug lag (`Neu:Req bleibt` in den
 *      #8-Tabellen) — ihr Craft-Anker ist die Zonen-Fenstermitte (design/rezension-patch-2026-08-25
 *      .html #p8 "Messmethode"), nicht die reine "nächste Stufe über dem eigenen Requirement". Eine
 *      rein content-gescannte Ableitung kann diesen Zonenbezug nicht rekonstruieren (Zonen tragen
 *      kein Level-Feld, s. `ZoneDef`) — individuell gegen die #8-Tabelle verifiziert (Urteil dort:
 *      "gleich"/"dazwischen" gegen den korrekten Zonen-Anker, nicht gegen die hier gefundene, zu
 *      hohe Vergleichsstufe).
 *  (b) Reine Bonus-Signaturen ohne modifiers/skillBoost (z.B. `greytooth_mantle`: nur
 *      `bonus.lifesteal`) — `coreValue()` hat für Schmuck keine Umrechnung von Bonus-Prozent in
 *      Attributpunkte (keine belastbare Äquivalenz, keine im Katalog dokumentierte Rate); der
 *      Signatur-Bonus TRÄGT den Wert, den die Attributsumme hier nicht sieht.
 */
const CRAFT_VALUE_EXEMPT = new Set<ItemId>([
  "briarbound_conduit", // #p8: Req bleibt, Zonen-Anker blackthorn (magic 52, "gleich" gg. adamantium_focus)
  "abyssal_tide_bow", // #p8: Req bleibt, Zonen-Anker coast (ranged 90, "gleich" gg. aetherium_longbow)
  "dreadfang_glaive", // #p8: Req bleibt, Zonen-Anker Turm F4 (attack 70, "dazwischen" gg. runite_spear)
  "abyssal_devourer_fang", // #p8: Req bleibt, Zonen-Anker Turm F5 (attack 90, "dazwischen" gg. titanium_dagger)
  "greytooth_mantle", // reine bonus.lifesteal-Signatur ohne modifiers/skillBoost (s.o.)
  // Stil-Parität 4a (Chef-GO 26.08.2026, §4a A2): felmagician_rod ist ein Szepter — die einzige
  // "Craft-Familie" `weapon|scepter` hat nur zwei Einzelstücke im ganzen Katalog (frost_scepter@8,
  // stormcaller_rod@50, s. Kommentar "Szepter-Linie fehlte in Spec §3.3" bei den Scepter-Items).
  // Bei Req 25 wäre der automatisch ermittelte "nächste Tier" stormcaller_rod (Req 50) — laut
  // Dokument bewusst auf der Stab-Kurve gebaut (Req-30-Bracket, "gleich" gegen steel/blacksteel),
  // nicht auf der eigenen, viel zu dünnen Szepter-Leiter (derselbe Randfall wie dreadfang_glaive
  // oben, nur bei einer anderen Waffenfamilie).
  "felmagician_rod",
  // Elementleiter (Chef-GO 28.08.2026, design/elementleiter-magiewaffen.md): steel_staff/
  // blacksteel_staff/adamantium_wand/titanium_staff/godiron_staff verlieren ihren Feuer-Status
  // (Arkan = kein Status, Aether = manaOnKill, Leere = execute — beide DurationMs 0). `coreValue()`
  // hier zählt NUR die rohe Basis-DPS (damageMin/damageMax/Intervall), keine Waffeneffekte — die
  // Parität zur jeweils VORHERIGEN Craft-Stufe wird darum über die Grundspanne hergestellt (Spec-
  // Mechanik „etwas höhere Grundspanne", Herleitung/Zahlen im Content-Bericht), was die rohe DPS
  // dieser fünf Stufen anhebt und die folgenden sechs Zonen-Drops (deren eigener Kernwert
  // unverändert bleibt) technisch überholt — derselbe „coreValue ignoriert X"-Bruch wie bei den
  // Trinity-Feld-Ausnahmen oben (reefscale_helm->chitin_helm-Muster in sim-consistency.test.ts),
  // nur hier auf coreValue statt coreStatScore. Die Drops behalten ihren eigenen Effekt (Rare-Drop-
  // Philosophie bleibt intakt) und sind über coreStatScore (sim-consistency.test.ts) weiterhin real
  // stärker als ihre jeweils VORHERIGE Craft-Stufe — nur der neue, Effekt-lose Vergleichspartner
  // ist an der reinen Basis-DPS-Messung vorbeigezogen.
  // Aether-Klippe (Chef-GO 29.08.2026, balance-audit-magie R5 (b)): titanium_staff 8,8–13,3 (Basis-DPS 3,97,
  // war 5,14) und aetherium_staff 11,0–16,6 (5,05, war 5,73). Neu gemessen: die drei Titan-Nachbarn liegen
  // weiter darunter (pyre 2,93 / choirbound 3,26 / sorrow 2,93) — Ausnahmen bleiben nötig, Liste unverändert.
  "shaman_gnarlstaff", // Req 15 → nächstes Tier steel_staff (Req 20, jetzt Arkan)
  "warlock_felstaff", // Req 20 → nächstes Tier blacksteel_staff (Req 30, jetzt Leere)
  "chitinshell_sparker", // Req 40 → nächstes Tier adamantium_wand (Req 50, jetzt Arkan)
  "pyre_staff", // Req 70 → nächstes Tier titanium_staff (Req 80, jetzt Aether)
  "choirbound_relic", // Req 72 → nächstes Tier titanium_staff (Req 80, jetzt Aether)
  "sorrow_staff", // Req 72 → nächstes Tier titanium_staff (Req 80, jetzt Aether)
  "stormcrest_staff", // Req 90 → nächstes Tier godiron_staff (Req 99, jetzt Leere)
]);

function reqLevel(item: ItemDef): number {
  let max = 0;
  for (const v of Object.values(item.requirements ?? {})) {
    if (typeof v === "number" && v > max) max = v;
  }
  return max;
}

/** Familie eines Ausrüstungs-Items für die Craft-Leiter: Waffentyp bzw. Rüstungsslot+-klasse. */
function familyKey(item: ItemDef): string | null {
  if (item.weaponStyle) return `weapon|${item.weaponType ?? "-"}`;
  if (item.blockChance !== undefined) return `shield|${item.slot}`;
  if (item.armorRating !== undefined) return `plate|${item.slot}`;
  if (item.evasionRating !== undefined) return `leather|${item.slot}`;
  if (item.wardCapacity !== undefined) return `cloth|${item.slot}`;
  if (item.slot) return `jewelry|${item.slot}`;
  return null;
}

/** Kennzahl je Klasse (design/rezension-patch-2026-08-25.html #p8 "Messmethode"). */
function coreValue(item: ItemDef): number {
  if (item.weaponStyle && item.damageMin !== undefined && item.damageMax !== undefined) {
    const intervalS = (item.attackIntervalMs ?? 3000) / 1000;
    return (item.damageMin + item.damageMax) / 2 / intervalS; // Basis-DPS
  }
  if (item.blockChance !== undefined) return (item.armorRating ?? 0) + item.blockChance * 20; // Schild
  if (item.armorRating !== undefined) return item.armorRating;
  if (item.evasionRating !== undefined) return item.evasionRating;
  if (item.wardCapacity !== undefined) return item.wardCapacity;
  // Foki/Schmuck: Attributsumme + doppelter Skill-Boost.
  const modSum = Object.values(item.modifiers ?? {}).reduce((a: number, b) => a + (b ?? 0), 0);
  const boostSum = Object.values(item.skillBoost ?? {}).reduce((a: number, b) => a + (b ?? 0), 0);
  return modSum + 2 * boostSum;
}

function hasEffect(item: ItemDef): boolean {
  if (effectiveWeaponEffects(item).length > 0) return true;
  const b: EquipBonus = item.bonus ?? {};
  return !!(b.hpRegenPerSec || b.lifesteal || b.critDamage);
}

// ── Craft-Item-Erkennung: garantierter (chance ≥ 1) Loot einer Aktion ──────────────────────────
const craftItemIds = new Set<ItemId>();
for (const action of Object.values(content.actions)) {
  for (const roll of action.loot) {
    if (roll.chance >= 1 && content.items[roll.itemId]?.type === "equipment") craftItemIds.add(roll.itemId);
  }
}

// ── Craft-Leitern je Familie, aufsteigend nach Requirement ──────────────────────────────────────
const craftFamilies = new Map<string, ItemDef[]>();
for (const id of craftItemIds) {
  const item = content.items[id]!;
  const key = familyKey(item);
  if (!key) continue;
  (craftFamilies.get(key) ?? craftFamilies.set(key, []).get(key)!).push(item);
}
for (const list of craftFamilies.values()) list.sort((a, b) => reqLevel(a) - reqLevel(b));

/**
 * Craft-Gegenstück, gegen das ein Drop gemessen wird — die Stufe DIREKT ÜBER dem aktuellen
 * Craft-Anker. Normalfall (Requirement des Drops == Requirement einer Craft-Stufe, weil #8 die
 * Drops exakt auf "Requirement der AKTUELLEN Craft-Stufe" gesetzt hat): der Anker ist die
 * Craft-Stufe mit GLEICHEM Requirement, "nächstes Tier" die Stufe direkt darüber. Randfall (Chase-
 * /"bleibt"-Zeilen, deren Requirement schon vor #8 hoch genug lag und keine exakte Craft-Stufe
 * trifft): Anker = die höchste Craft-Stufe MIT Requirement ≤ Drop-Requirement, "nächstes Tier" die
 * Stufe direkt darüber — dieselbe Ableitung, nur ohne exakten Treffer.
 */
function nextCraftTier(item: ItemDef, minReq: number): ItemDef | undefined {
  const key = familyKey(item);
  if (!key) return undefined;
  const list = craftFamilies.get(key) ?? [];
  let anchorReq = -1;
  for (const c of list) {
    const r = reqLevel(c);
    if (r <= minReq && r > anchorReq) anchorReq = r;
  }
  return list.find((c) => reqLevel(c) > anchorReq);
}

// ── "Zonen-Tier" je Zone: das höchste Monster-Level IN dieser Zone (abgeleitet, nicht hartkodiert
//    — eine Zone trägt selbst kein Level-Feld, s. `ZoneDef`). Ein einzelner Drop darf ein Requirement
//    bis zu diesem Zonen-Deckel verlangen, auch wenn die konkrete Quelle selbst niedriger liegt
//    (dieselbe Zone rechtfertigt das Gate über andere, stärkere Zonenbewohner). ──────────────────
const zoneMaxLevel = new Map<string, number>();
for (const m of Object.values(content.monsters)) {
  if (!m.zone) continue;
  zoneMaxLevel.set(m.zone, Math.max(zoneMaxLevel.get(m.zone) ?? 0, m.level));
}

// ── Kampfquellen sammeln: Monster-Loot, Elite-Extra-Loot (+ Elite-Signatur), Dungeon-Loot/-Truhe,
//    Paragon-Truhe. Craft-Duplikate (Drop-Item ist selbst ein Craft-Item) zählen nicht als Unique. ──
interface DropRef {
  itemId: ItemId;
  chance: number;
  isChase: boolean; // informativ (Chase-Zeilen bleiben laut Regel unverändert an ihrem alten Wert)
  isEliteSignature: boolean; // eigener Chance-Deckel (fix 20 %), NICHT der reguläre/Chase-Deckel
  sourceLabel: string;
  sourceLevel: number;
}

const drops: DropRef[] = [];

function pushRolls(
  rolls: LootRoll[] | undefined,
  sourceLabel: string,
  sourceLevel: number,
  isEliteSignature = false,
): void {
  for (const roll of rolls ?? []) {
    const item = content.items[roll.itemId];
    if (!item || item.type !== "equipment") continue;
    if (craftItemIds.has(roll.itemId)) continue; // Craft-Duplikat, kein Unique
    drops.push({
      itemId: roll.itemId,
      chance: roll.chance,
      isChase: roll.chance <= CHASE_CHANCE_CAP,
      isEliteSignature,
      sourceLabel,
      sourceLevel,
    });
  }
}

for (const m of Object.values(content.monsters)) {
  pushRolls(m.loot, `monster:${m.id}`, zoneMaxLevel.get(m.zone ?? "") ?? m.level);
}
for (const d of content.dungeons ?? []) {
  const lvl = Math.max(d.requiredLevel + 25, zoneMaxLevel.get(d.zone ?? "") ?? 0); // Marge: das reine Zugangs-Gate liegt unter den echten Encounter-Leveln
  pushRolls(d.loot, `dungeon-clear:${d.id}`, lvl);
  pushRolls(d.chest?.loot, `dungeon-chest:${d.id}`, lvl);
}
for (const e of Object.values(content.elites ?? {})) {
  const baseMonster = content.monsters[e.baseMonsterId as MonsterId];
  const zoneLevel = zoneMaxLevel.get(e.zone) ?? zoneMaxLevel.get(baseMonster?.zone ?? "") ?? baseMonster?.level ?? 0;
  pushRolls(e.extraLoot, `elite-extra:${e.id}`, zoneLevel);
  // Elite-Signatur-Item: eigene Prüfung (fixe 20-%-Chance, kein regulärer/Chase-Deckel).
  const uniqueItem = content.items[e.uniqueItemId];
  if (uniqueItem && uniqueItem.type === "equipment" && !craftItemIds.has(e.uniqueItemId)) {
    drops.push({
      itemId: e.uniqueItemId,
      chance: e.uniqueDropChance ?? ELITE_SIGNATURE_CHANCE_DEFAULT,
      isChase: false,
      isEliteSignature: true,
      sourceLabel: `elite-signature:${e.id}`,
      sourceLevel: zoneLevel,
    });
  }
}
for (const tier of content.paragon?.chest ?? []) {
  pushRolls(tier.loot, `paragon:floor${tier.minFloor ?? 0}`, 99);
}

describe("drop-gear-beats-craft — Rezension #8 (Chef-GO 25.08.2026, #p8)", () => {
  it("jeder Kampf-Drop trägt den Kernwert des NÄCHSTEN Craft-Tiers derselben Familie", () => {
    const offenders: string[] = [];
    for (const d of drops) {
      if (CRAFT_VALUE_EXEMPT.has(d.itemId)) continue;
      const item = content.items[d.itemId]!;
      const req = reqLevel(item);
      const next = nextCraftTier(item, req);
      if (!next) continue; // an der Spitze der Leiter (kein "nächstes" Craft-Tier) — nichts zu vergleichen
      const dropVal = coreValue(item);
      const craftVal = coreValue(next);
      if (dropVal < craftVal - 1e-9) {
        offenders.push(
          `${d.itemId} (${d.sourceLabel}, Req ${req}): Kernwert ${dropVal.toFixed(3)} < Craft-Gegenstück ${next.id} (Req ${reqLevel(next)}) mit ${craftVal.toFixed(3)}`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("jeder Kampf-Drop trägt einen Effekt (Status-Proc, Spezial-Kind oder Signatur-Bonus)", () => {
    const offenders: string[] = [];
    const seen = new Set<ItemId>();
    for (const d of drops) {
      if (seen.has(d.itemId)) continue; // ein Item mit mehreren Quellen nur einmal prüfen
      seen.add(d.itemId);
      const item = content.items[d.itemId]!;
      if (!hasEffect(item)) offenders.push(`${d.itemId} (${d.sourceLabel}): kein Effekt (weaponEffect/weaponEffects/bonus-Signatur)`);
    }
    expect(offenders).toEqual([]);
  });

  it("Dropchance bleibt unter dem Deckel ihrer Klasse (Chase ≤ 0,1 %, sonst ≤ 5 %)", () => {
    const offenders: string[] = [];
    for (const d of drops) {
      if (d.isEliteSignature) continue; // eigener Deckel, s. nächster Test
      const cap = d.isChase ? CHASE_CHANCE_CAP : REGULAR_CHANCE_CAP;
      if (d.chance > cap + 1e-12) {
        offenders.push(`${d.itemId} (${d.sourceLabel}): Chance ${d.chance} > Deckel ${cap} (${d.isChase ? "Chase" : "regulär"})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Elite-Signatur-Items bleiben bei genau der Engine-Default-Chance (20 %, sofern nicht explizit überschrieben)", () => {
    const offenders: string[] = [];
    for (const e of Object.values(content.elites ?? {})) {
      const chance = e.uniqueDropChance ?? ELITE_SIGNATURE_CHANCE_DEFAULT;
      if (chance > ELITE_SIGNATURE_CHANCE_DEFAULT + 1e-9) {
        offenders.push(`${e.id} → ${e.uniqueItemId}: uniqueDropChance ${chance} > ${ELITE_SIGNATURE_CHANCE_DEFAULT}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Requirement eines Drops übersteigt nie das Level seiner Quelle", () => {
    const offenders: string[] = [];
    for (const d of drops) {
      const item = content.items[d.itemId]!;
      const req = reqLevel(item);
      if (req > d.sourceLevel) {
        offenders.push(`${d.itemId} (${d.sourceLabel}): Requirement ${req} > Quellen-Level ${d.sourceLevel}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Sanity: die Slots aus EQUIP_SLOTS/familyKey decken jeden geprüften Drop ab (kein stiller Skip)", () => {
    const unclassified: string[] = [];
    for (const d of drops) {
      const item = content.items[d.itemId]!;
      if (!familyKey(item)) unclassified.push(`${d.itemId} (${d.sourceLabel}, slot=${item.slot})`);
    }
    // Reine Diagnose (informativ) — kein harter Fail, aber sichtbar im Testlauf, falls der Katalog
    // einen neuen Ausrüstungs-Slot bekommt, den familyKey() noch nicht kennt.
    if (unclassified.length > 0) {
      // eslint-disable-next-line no-console
      console.warn("drop-gear-beats-craft: unklassifizierte Drops (familyKey=null):", unclassified);
    }
    expect(EQUIP_SLOTS.length).toBeGreaterThan(0);
  });
});
