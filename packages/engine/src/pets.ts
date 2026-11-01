import type {
  ActionDef,
  BoostableCombatSkillId,
  ContentDB,
  GameState,
  ItemId,
  PetAbilityKind,
  PetCombatAbility,
  PetDef,
  PetFindPool,
  PetId,
  PetSkillEffect,
  PetSkillEffectKind,
  SkillId,
  WeaponStyle,
} from "@hearthforge/shared";
import {
  PET_ABILITY_CAP,
  PET_ABILITY_MIN_INTERVAL_MS,
  PET_ECHO_FACTOR,
  PET_ROOTFIND_SEED_SHARE,
  PET_SKILL_EFFECT_CAP,
} from "@hearthforge/shared";
import { nextFloat } from "./rng";
import { talentEffect, talentEffectOwned } from "./talents";
import { talentFoodHealBonus } from "./prestige-effects"; // claude:2026-10-30T18:42:00+01:00 — 1.4.2 Glutblut

/**
 * Pet-/Begleiter-System — reine, deterministische Helfer. Logic-Dev-Revier.
 *
 * ZWEI-EFFEKT-MODELL (Chef-Freigabe 2026-06-25): jedes Pet trägt
 *  - `skillEffect`   — wirkt im Herkunfts-Skill (tick.ts Skilling-Pfad / computeStats),
 *  - `combatAbility` — getriggerte Kampf-Aktion (combat-dev löst sie via `petCombatAbility` aus).
 *
 * Pets sind eigene `PetDef`-Daten (KEIN Gear-Item, kein EquipSlot). Platz 1 (`character.companionPetId`)
 * wirkt voll; Platz 2 (`companionPetId2`, Talent `secondPetSlot`) nur mit dem skillEffect.
 * claude:2026-10-18T02:00:00+02:00 — ECHO (1.3.0, Chef 17.10.2026): jeder besessene, NICHT ausgerüstete
 * Begleiter wirkt mit `PET_ECHO_FACTOR` (25 %) seines skillEffect, nie mit seiner Kampf-Fähigkeit. Je
 * (Kind, Skill bzw. Stil) zählt der GRÖSSTE Einzelwert aus {Platz 1, Platz 2, Echo je Begleiter}, keine
 * Summe (`bestOfKind`). Ein ausgerüsteter Begleiter wirkt also nie mit 125 %. Besessene Pets liegen als
 * Set in `character.ownedPets`; Echo rechnet sich allein daraus (kein Save-Feld).
 *
 * Die Skill-Helfer ruft tick.ts/farming.ts/hunting.ts/computeStats/shop.ts/consumable.ts an genau
 * definierten Stellen ab; `petDoubleLootChance`/`petKillHealFraction`/`petFoodHealMult` konsumiert
 * zusätzlich der Kampf-Pfad. Die Combat-Seite liest die Kampf-Fähigkeit NUR über
 * `petCombatAbility(state, content)` (reine Lese-API, nur Platz 1).
 *
 * XP-VERBOT (#276): Pet-Passive mit XP-Wirkung sind ABGESCHAFFT (Chef-Vorgabe, Guard pet-integrity).
 */

/** Liefert das aktive Pet (ausgerüstet UND besessen) oder null. */
export function equippedPet(state: GameState, content: ContentDB): PetDef | null {
  const id = state.character.companionPetId;
  if (!id) return null;
  if (!state.character.ownedPets[id]) return null; // nur besessene Pets wirken
  return content.pets?.[id] ?? null;
}

/**
 * claude:2026-10-18T00:30:00+02:00 — Zweiter Begleiter-Platz (Talent `secondPetSlot`, Jagdbuch
 * „Zweites Halsband“): liefert das Pet in Platz 2, wenn das Talent gekauft ist, das Pet besessen ist
 * und nicht zugleich in Platz 1 steckt; sonst null. Platz 2 wirkt NUR über seinen `skillEffect`.
 */
export function secondPet(state: GameState, content: ContentDB): PetDef | null {
  const id = state.character.companionPetId2;
  if (!id || id === state.character.companionPetId) return null;
  if (!state.character.ownedPets[id]) return null;
  if (!secondPetSlotUnlocked(state, content)) return null;
  return content.pets?.[id] ?? null;
}

/** Ist der zweite Begleiter-Platz freigeschaltet? (nur über talentEffect, nie über Knoten-Ids) */
export function secondPetSlotUnlocked(state: GameState, content: ContentDB): boolean {
  return talentEffect(state, content, "secondPetSlot") > 0;
}

/**
 * claude:2026-10-18T12:00:00+02:00 — Ist das Talent für den zweiten Platz GEKAUFT (ohne Freischalt-Gate)?
 * Nach einem Aufstieg ruht der Jägerkodex bis Slayer 85 (Chef 18.10.): der Platz wirkt dann nicht
 * (`secondPet` → null), die Wahl bleibt aber gespeichert. Leser: persistence-Sanitize von `companionPetId2`.
 */
export function secondPetSlotOwned(state: GameState, content: ContentDB): boolean {
  return talentEffectOwned(state, content, "secondPetSlot") > 0;
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Wirkt der besessene Begleiter `petId` gerade als Echo (besessen,
 * weder in Platz 1 noch wirksam in Platz 2)? Für die Begleiter-Seite (Echo-Hinweis).
 */
export function petEchoActive(state: GameState, content: ContentDB, petId: PetId): boolean {
  if (!state.character.ownedPets[petId] || !content.pets?.[petId]) return false;
  if (equippedPet(state, content)?.id === petId) return false;
  if (secondPet(state, content)?.id === petId) return false;
  return true;
}

/** Ein Skill-Effekt samt Gewicht (1 = Platz 1/2, PET_ECHO_FACTOR = Echo). */
interface WeightedEffect {
  eff: PetSkillEffect;
  weight: number;
}

/** Memo der wirksamen Effekte je Content + Besitz-Set (siehe `weightedEffects`). */
interface WeightedEffectTable {
  firstId: PetId | null;
  secondId: PetId | null;
  ownedCount: number;
  /** claude:2026-10-30T18:42:00+01:00 — 1.4.2: Echo-Gewicht (Narbenbuch „Echo der Gefährten“) gehört zum Cache-Schlüssel. */
  echo: number;
  entries: WeightedEffect[];
}
const weightedEffectCache = new WeakMap<ContentDB, WeakMap<object, WeightedEffectTable>>();

/**
 * claude:2026-10-18T02:00:00+02:00 — Alle wirksamen skillEffects: Platz 1 und Platz 2 mit Gewicht 1,
 * danach jeder übrige besessene Begleiter mit `PET_ECHO_FACTOR` (Echo). computeStats/tick rufen die
 * Helfer je Tick mehrfach, darum gemerkt je Content + `ownedPets`-Objekt und invalidiert über Platz 1,
 * Platz 2 und die Besitz-Anzahl (Besitz wächst nur: grantPet fügt hinzu, nichts entfernt einzeln).
 * Rein lesend, kein RNG; die Reihenfolge ist für die Max-Aggregation egal.
 */
function weightedEffects(state: GameState, content: ContentDB): readonly WeightedEffect[] {
  const first = equippedPet(state, content);
  const second = secondPet(state, content);
  const owned = state.character.ownedPets;
  let ownedCount = 0;
  for (const id in owned) if (owned[id]) ownedCount++;
  const firstId = first?.id ?? null;
  const secondId = second?.id ?? null;
  const echo = petEchoFactor(state, content); // claude:2026-10-30T18:42:00+01:00 — 1.4.2 Echo der Gefährten
  let byOwned = weightedEffectCache.get(content);
  if (!byOwned) {
    byOwned = new WeakMap();
    weightedEffectCache.set(content, byOwned);
  }
  const hit = byOwned.get(owned);
  if (hit && hit.firstId === firstId && hit.secondId === secondId && hit.ownedCount === ownedCount && hit.echo === echo) {
    return hit.entries;
  }
  const entries: WeightedEffect[] = [];
  if (first) entries.push({ eff: first.skillEffect, weight: 1 });
  if (second) entries.push({ eff: second.skillEffect, weight: 1 });
  const pets = content.pets;
  if (pets) {
    for (const id in owned) {
      if (!owned[id] || id === firstId || id === secondId) continue;
      const pet = pets[id];
      if (pet) entries.push({ eff: pet.skillEffect, weight: echo });
    }
  }
  byOwned.set(owned, { firstId, secondId, ownedCount, echo, entries });
  return entries;
}

/** Ruft `visit` für jeden wirksamen skillEffect auf (siehe `weightedEffects`). */
function forEachWeightedEffect(
  state: GameState,
  content: ContentDB,
  visit: (w: WeightedEffect) => void,
): void {
  const entries = weightedEffects(state, content);
  for (let i = 0; i < entries.length; i++) visit(entries[i]!);
}

/** Passt ein Effekt zum Skill-Filter? `skill` gesetzt ⇒ nur skill-freie oder auf diesen Skill gemünzte Effekte. */
function skillMatches(eff: PetSkillEffect, skill: SkillId | undefined): boolean {
  return skill === undefined || eff.skill === undefined || eff.skill === skill;
}

/**
 * Wert EINER Effektart über Platz 1, Platz 2 und Echo: gleiche Art stapelt nicht, es zählt der stärkere
 * (Maximum aus gedeckeltem Wert × Gewicht). `skill` gesetzt ⇒ nur skill-freie oder auf diesen Skill
 * gemünzte Effekte (Effekte verschiedener Skills treffen also nie im selben Aufruf zusammen).
 */
function bestOfKind(state: GameState, content: ContentDB, kind: PetSkillEffectKind, skill?: SkillId): number {
  let best = 0;
  forEachWeightedEffect(state, content, ({ eff, weight }) => {
    if (eff.kind !== kind || !skillMatches(eff, skill)) return;
    best = Math.max(best, capSkill(kind, eff.value ?? 0) * weight);
  });
  return best;
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Wie `bestOfKind`, liefert aber zusätzlich den gewinnenden Effekt
 * (für Kinds mit Zusatzfeldern: pool/ladder/style). `accept` filtert weiter (z. B. Stil). null ohne Treffer.
 */
function bestEffectOfKind(
  state: GameState,
  content: ContentDB,
  kind: PetSkillEffectKind,
  skill: SkillId | undefined,
  accept?: (eff: PetSkillEffect) => boolean,
): { eff: PetSkillEffect; value: number } | null {
  let best: { eff: PetSkillEffect; value: number } | null = null;
  forEachWeightedEffect(state, content, ({ eff, weight }) => {
    if (eff.kind !== kind || !skillMatches(eff, skill)) return;
    if (accept && !accept(eff)) return;
    const value = capSkill(kind, eff.value ?? 0) * weight;
    if (value > 0 && (best === null || value > best.value)) best = { eff, value };
  });
  return best;
}

/** Combat-Ability des aktiven Pets (oder null). */
function activeCombatAbility(state: GameState, content: ContentDB): PetCombatAbility | null {
  return equippedPet(state, content)?.combatAbility ?? null;
}

/** Hält einen Skill-Effekt-Wert defensiv im erlaubten Deckel (Schutz vor Fehl-Content). */
function capSkill(kind: PetSkillEffectKind, value: number): number {
  const max = PET_SKILL_EFFECT_CAP[kind] ?? 0;
  return Math.max(0, Math.min(max, value));
}

/** Hält einen Ability-Wert defensiv im erlaubten Deckel. */
function capAbility(kind: PetAbilityKind, value: number): number {
  const max = PET_ABILITY_CAP[kind] ?? 0;
  return Math.max(0, Math.min(max, value));
}

/**
 * Summe über `kinds` (je Art das Maximum aus Platz 1/2/Echo, verschiedene Arten addieren), gefiltert
 * auf `skill`.
 */
function skillScopedValue(
  state: GameState,
  content: ContentDB,
  kinds: PetSkillEffectKind[],
  skill: SkillId,
): number {
  let sum = 0;
  for (const kind of kinds) sum += bestOfKind(state, content, kind, skill);
  return sum;
}

// ── Skilling-Effekte (tick.ts) ──────────────────────────────────────────────

/**
 * Additive Chance (0..0.05), eine Skilling-Aktion sofort abzuschließen (instantAction).
 * tick.ts behandelt einen Treffer wie einen extra Aktions-Abschluss. Seit 1.3.0 trägt kein
 * Begleiter mehr dieses Kind (bleibt als legale Taxonomie bestehen).
 */
export function petInstantActionChance(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["instantAction"], skill);
}

/**
 * Additiver Doppelertrag-Chancen-Bonus für einen Skill. Aggregiert alle Skill-Kinds, die funktional
 * die Doppelertrag-Chance erhöhen (doubleDrop, gatherYield, flawlessGem, bonusRunes).
 * `bonusAmmo` zählt NICHT hier: es wirkt nur beim Pfeile-Befiedern (petBonusAmmoChance, 1.4.0 FK).
 */
export function petDoubleYieldBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(
    state,
    content,
    ["doubleDrop", "gatherYield", "flawlessGem", "bonusRunes"],
    skill,
  );
}

/**
 * claude:2026-10-24T18:40:00+02:00 — `bonusAmmo` (1.4.0 FK, tote Haken wiederbelebt): Chance auf doppelten Ertrag beim Befiedern von
 * Pfeilen (`fletch_*_arrow`, `fletch_*_arrow_*`, Skill `bowcraft`). Heute trägt kein Begleiter dieses Kind ⇒ 0.
 */
export function petBonusAmmoChance(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["bonusAmmo"], skill);
}

/** Befiedert diese Aktion Pfeile (Grund- oder Effektpfeil)? */
export function isArrowFletchAction(actionId: string): boolean {
  return /^fletch_[a-z]+_arrow(_[a-z]+)?$/.test(actionId);
}

/**
 * Additiver Material-Preservation-Bonus für einen Skill. Aggregiert alle Skill-Kinds, die
 * funktional Material erstatten (refundMaterial, perfectCook, potionPreserve).
 */
export function petPreserveBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["refundMaterial", "perfectCook", "potionPreserve"], skill);
}

/**
 * Additiver Thieving-Erfolgs-Bonus für einen Skill. Cap 0.95 bleibt (actionSuccessChance).
 * claude:2026-10-18T02:00:00+02:00 — 1.3.0: zählt auch den Erfolgs-Anteil von `thievingFinesse`.
 */
export function petThievingBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["thievingSuccess", "thievingFinesse"], skill);
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Faktor (≤ 1) auf die Betäubungsdauer nach einem Fehlschlag durch
 * `thievingFinesse` (Düsterratte „Leise Pfoten": stunMult 0.5). Echo skaliert die ERSPARNIS:
 * 1 − (1 − stunMult) × Gewicht (Echo: 1 − 0.5 × 0.25 = 0.875). Exakt 1 ohne passenden Begleiter.
 */
export function petThievingStunMult(state: GameState, content: ContentDB, skill: SkillId): number {
  let saving = 0;
  forEachWeightedEffect(state, content, ({ eff, weight }) => {
    if (eff.kind !== "thievingFinesse" || !skillMatches(eff, skill)) return;
    if ((eff.value ?? 0) <= 0) return; // ein Fehl-Content ohne Wert schaltet auch die Betäubungs-Hälfte nicht frei
    const mult = Math.max(0, Math.min(1, eff.stunMult ?? 1));
    saving = Math.max(saving, (1 - mult) * weight);
  });
  return 1 - saving;
}

/**
 * Chance (0..0.05) je FANG, dass der Fang HUNT_LOOT_ROLLS_DOUBLED (zehn statt fünf) Beute-Durchläufe
 * liefert (Leon/booted_tomcat auf `hunting`). hunting.ts `grantCatch` zieht den Erfolgs-nextFloat NUR,
 * wenn diese Chance > 0 ist. Rein lesend, kein RNG.
 */
export function petHuntDoubleRollsChance(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["huntDoubleRolls"], skill);
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Suffix-Chancen-Bonus (Pp, 0..0.05) auf Ausrüstungs-Outputs eines
 * Skills (Schlackenscheusal „Glutsegen", smithing). tick.ts addiert ihn auf die aufgelöste Suffix-Chance,
 * wenn diese > 0 ist, Deckel 1. Kein RNG (die Zahl der Würfe bleibt gleich).
 */
export function petCraftSuffixBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return bestOfKind(state, content, "craftSuffixChance", skill);
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Reifezeit-Anteil (0..0.06) für Farming (Welkling „Fäulnisdünger").
 * farming.ts `effectiveGrowMs` addiert ihn zum Meister-Ring-Bonus.
 */
export function petGrowSpeed(state: GameState, content: ContentDB): number {
  return bestOfKind(state, content, "growSpeed", "farming");
}

/** claude:2026-10-18T02:00:00+02:00 — Ist der Haupt-Output einer Aktion eine Vorstufe (Material, keine Ausrüstung/kein Werkzeug)? */
function isPrepAction(content: ContentDB, action: ActionDef): boolean {
  const main = action.loot[0]?.itemId;
  if (!main) return false;
  return content.items[main]?.type === "material";
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Tempo-Anteil (0..0.06) für Vorstufen-Aktionen eines Skills
 * (Schindling „Gerberhand", leatherworking): Aktionen, deren Haupt-Output KEINE Ausrüstung ist (Gerben,
 * Kordeln), laufen um den Anteil schneller. 0 für Ausrüstungs-Rezepte. tick.ts `effectiveActionDurationMs`.
 */
export function petPrepSpeed(state: GameState, content: ContentDB, action: ActionDef): number {
  const v = bestOfKind(state, content, "prepSpeed", action.skill);
  if (v <= 0) return 0;
  return isPrepAction(content, action) ? v : 0;
}

// ── 1.3.0 Fund-/Stufen-Effekte (tick.ts completeAction) ─────────────────────

/** Item-Wert (Gleichstand-Brecher bei veinGem). */
function itemValue(content: ContentDB, id: ItemId): number {
  return content.items[id]?.value ?? 0;
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Saat der Crop mit dem höchsten `levelRequired` ≤ `level` (Faulrinde
 * „Wurzelgespür"). Nur Saaten, die als Item existieren. null ohne passende Crop.
 */
function rootFindSeed(content: ContentDB, level: number): ItemId | null {
  let best: { seed: ItemId; lvl: number } | null = null;
  const crops = content.crops ?? {};
  for (const id of Object.keys(crops)) {
    const crop = crops[id];
    if (!crop || !content.items[crop.seedItem]) continue;
    const lvl = crop.levelRequired ?? 1;
    if (lvl > level) continue;
    if (best === null || lvl > best.lvl) best = { seed: crop.seedItem, lvl };
  }
  return best?.seed ?? null;
}

/** Vogelnest (vorhandenes Item, Faulrinde „Wurzelgespür"). */
const BIRDS_NEST_ID = "birds_nest";

/**
 * claude:2026-10-18T02:00:00+02:00 — `veinGem` (Felsschlund „Ader-Witterung"): das `rough_*` mit der
 * KLEINSTEN Chance in der Loot-Tabelle der Aktion (Gleichstand: höchster Item-Wert); null ohne `rough_*`.
 */
function veinGemItem(content: ContentDB, action: ActionDef): ItemId | null {
  let best: { id: ItemId; chance: number; value: number } | null = null;
  for (const roll of action.loot) {
    if (!roll.itemId.startsWith("rough_") || !content.items[roll.itemId]) continue;
    const value = itemValue(content, roll.itemId);
    if (
      best === null ||
      roll.chance < best.chance ||
      (roll.chance === best.chance && value > best.value)
    ) {
      best = { id: roll.itemId, chance: roll.chance, value };
    }
  }
  return best?.id ?? null;
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Fund-Effekt `bonusFind` für eine abgeschlossene Aktion: liefert
 * Chance + die Kandidaten (Fund-Pool), oder null, wenn kein passender Begleiter wirkt bzw. der Pool für
 * diese Aktion leer ist (dann zieht tick.ts KEINEN Wurf). Nur Sammel-Aktionen (ohne `inputs`).
 *  - rootFind: Anteil PET_ROOTFIND_SEED_SHARE Saat (höchste Crop ≤ Aktions-Level), sonst Vogelnest.
 *  - veinGem : das seltenste `rough_*` der Loot-Tabelle.
 */
export function petBonusFind(
  state: GameState,
  content: ContentDB,
  action: ActionDef,
): { chance: number; pool: PetFindPool; primary: ItemId | null; secondary: ItemId | null } | null {
  if (action.inputs && action.inputs.length > 0) return null;
  const best = bestEffectOfKind(state, content, "bonusFind", action.skill);
  if (!best || !best.eff.pool) return null;
  const pool = best.eff.pool;
  if (pool === "veinGem") {
    const gem = veinGemItem(content, action);
    return gem ? { chance: best.value, pool, primary: gem, secondary: null } : null;
  }
  // rootFind
  const seed = rootFindSeed(content, action.levelRequired ?? 1);
  const nest = content.items[BIRDS_NEST_ID] ? BIRDS_NEST_ID : null;
  if (!seed && !nest) return null;
  return { chance: best.value, pool, primary: seed, secondary: nest };
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Würfelt den Fund (RNG-Reihenfolge: Erfolgs-Wurf, bei rootFind mit
 * zwei Kandidaten ein zweiter Wurf für die Auswahl). Liefert das gefundene Item oder null. Der Aufrufer
 * zieht das NUR, wenn `petBonusFind` nicht null ist.
 */
export function rollPetBonusFind(
  state: GameState,
  find: { chance: number; pool: PetFindPool; primary: ItemId | null; secondary: ItemId | null },
): ItemId | null {
  if (nextFloat(state.rng) >= find.chance) return null;
  if (find.primary && find.secondary) {
    return nextFloat(state.rng) < PET_ROOTFIND_SEED_SHARE ? find.primary : find.secondary;
  }
  return find.primary ?? find.secondary;
}

/** Cache: je Content und Skill das kleinste `levelRequired` der Aktionen, deren Haupt-Output (loot[0]) das Item ist. */
const sourceLevelCache = new WeakMap<ContentDB, Map<SkillId, Map<ItemId, number>>>();

function mainOutputSourceLevel(content: ContentDB, skill: SkillId, itemId: ItemId): number | null {
  let bySkill = sourceLevelCache.get(content);
  if (!bySkill) {
    bySkill = new Map();
    sourceLevelCache.set(content, bySkill);
  }
  let byItem = bySkill.get(skill);
  if (!byItem) {
    byItem = new Map();
    for (const id of Object.keys(content.actions)) {
      const a = content.actions[id];
      if (!a || a.skill !== skill) continue;
      const main = a.loot[0]?.itemId;
      if (!main) continue;
      const lvl = a.levelRequired ?? 1;
      const prev = byItem.get(main);
      if (prev === undefined || lvl < prev) byItem.set(main, lvl);
    }
    bySkill.set(skill, byItem);
  }
  return byItem.get(itemId) ?? null;
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Ziel des Stufensprungs `tierUp` für den Haupt-Output `itemId` einer
 * Aktion des Skills: der nächste Eintrag seiner Leiter, sofern dessen Quell-Aktion (gleicher Skill, Item
 * als Haupt-Output) `levelRequired` ≤ `skillLevel` hat. null = kein Effekt (oberste Stufe, nicht in einer
 * Leiter, Stufe noch gesperrt oder keine Leitern im Content).
 */
export function petTierUpTarget(
  content: ContentDB,
  skill: SkillId,
  ladderKey: string,
  itemId: ItemId,
  skillLevel: number,
): ItemId | null {
  const ladders = content.petTierLadders?.[ladderKey];
  if (!ladders) return null;
  for (const ladder of ladders) {
    const i = ladder.indexOf(itemId);
    if (i < 0) continue;
    const next = ladder[i + 1];
    if (!next || !content.items[next]) return null;
    const lvl = mainOutputSourceLevel(content, skill, next);
    return lvl !== null && lvl <= skillLevel ? next : null;
  }
  return null;
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Stufensprung `tierUp` (Kiemenfäule „Tiefenzug", Sporenwicht
 * „Sporenfund", Edelsteinwicht „Meisterschliff", Pergamotte „Archivar"): Chance + Leiter des stärksten
 * passenden Effekts für den Skill, oder null.
 */
export function petTierUp(
  state: GameState,
  content: ContentDB,
  skill: SkillId,
): { chance: number; ladder: string } | null {
  const best = bestEffectOfKind(state, content, "tierUp", skill, (eff) => !!eff.ladder);
  return best && best.eff.ladder ? { chance: best.value, ladder: best.eff.ladder } : null;
}

// ── Globale Effekte (computeStats / shop.ts / Kampf-Pfad) ───────────────────

/** Wert der stärksten globalen Effektart `kind` über Platz 1/2/Echo; 0 ohne passendes Pet. */
function globalValue(state: GameState, content: ContentDB, kind: PetSkillEffectKind): number {
  return bestOfKind(state, content, kind);
}

/**
 * Zauberreserve-Multiplikator (≥1) durch ein spellReserve-Pet. Für computeStats (multipliziert maxMana
 * NACH allen additiven Boni).
 */
export function petSpellReserveMult(state: GameState, content: ContentDB): number {
  return 1 + globalValue(state, content, "spellReserve");
}

/** Additiver Lebensraub-Anteil (0..0.02) durch ein lifesteal-Pet (Blutbracke „Blutspur"). */
export function petLifesteal(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "lifesteal");
}

/**
 * GANZE effektive Bonus-Level (0..2) für EINEN boostbaren Kampf-Skill durch ein skillBoost-Pet. Seit
 * 1.3.0 trägt kein Begleiter mehr dieses Kind (Eisenschlund → `styleDamage`); bleibt legal. `floor`
 * gegen Fehl-Content und Echo-Bruchteile (keine halben Level).
 */
export function petSkillBoost(state: GameState, content: ContentDB, skill: BoostableCombatSkillId): number {
  let best = 0;
  forEachWeightedEffect(state, content, ({ eff, weight }) => {
    if (eff.kind !== "skillBoost" || eff.skill !== skill) return;
    best = Math.max(best, Math.floor(capSkill("skillBoost", eff.value ?? 0) * weight));
  });
  return best;
}

/**
 * Multiplikative Schadensreduktion (0..0.05) durch ein damageReduction-Pet (Chitinpanzer „Panzerhaut").
 * computeStats legt sie als `DerivedStats.damageReduction` ab; combat.ts wendet sie NACH Armor/Ward/Block an.
 */
export function petDamageReduction(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "damageReduction");
}

/**
 * Chance (0..0.05) je Monster-Kill, den Loot- UND Gold-Wurf ein zweites Mal auszuführen (Aasschwinge
 * „Aasfund"). combat.ts: kein zweiter Pet-Wurf, keine Dungeon-Token, seit 1.3.0 ohne Champion-Unikate.
 */
export function petDoubleLootChance(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "doubleLoot");
}

/** Heil-Anteil (0..0.05, Bruch player.maxHp) bei jedem Monster-Kill (Beinzehrer). */
export function petKillHealFraction(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "killHeal");
}

/** Verkaufs-Gold-Bonus (0..0.05) durch ein sellBonus-Pet. Seit 1.3.0 ohne Träger (bleibt legal). */
export function petSellBonus(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "sellBonus");
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Multiplikator (≥ 1) auf die Heilung von ESSEN (nicht Tränken) durch
 * `foodHealBonus` (Aschbauch „Feinschmecker"). Exakt 1 ohne passenden Begleiter.
 */
export function petFoodHealMult(state: GameState, content: ContentDB): number {
  // claude:2026-10-30T18:42:00+01:00 — 1.4.2 Glutblut (`foodHealPct`, Spec § 3): EINZIGER Essen-Heilfaktor (Leser combat.ts Auto-Essen und
  // consumable.ts), daher hier additiv zum Begleiter-Anteil. Ohne Rang exakt der Alt-Wert.
  return 1 + globalValue(state, content, "foodHealBonus") + talentFoodHealBonus(state, content);
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Schadens-Anteil (0..0.03) für den Kampfstil `style` durch
 * `styleDamage` (Eisenschlund „Eisenkiefer", melee). computeStats multipliziert die Schadensspanne.
 */
export function petStyleDamage(state: GameState, content: ContentDB, style: WeaponStyle): number {
  return bestEffectOfKind(state, content, "styleDamage", undefined, (eff) => eff.style === style)?.value ?? 0;
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Ward-Kapazitäts-Anteil (0..0.06) durch `wardCapacityPct`
 * (Frostgroll „Kältepanzer"). computeStats: maxWard × (1 + Anteil); ohne Stoff-Pool wirkungslos.
 */
export function petWardCapacityPct(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "wardCapacityPct");
}

/**
 * claude:2026-10-18T02:00:00+02:00 — Echo-Wert eines Begleiters für die Anzeige: sein gedeckelter
 * skillEffect-Wert × PET_ECHO_FACTOR (0 bei Kinds ohne Bruch-Wert).
 * claude:2026-10-30T18:42:00+01:00 — 1.4.2: mit `state` + `content` gilt das Echo-Gewicht des Narbenbuchs (`petEchoFactor`).
 */
export function petEchoValue(pet: PetDef, state?: GameState, content?: ContentDB): number {
  const factor = state && content ? petEchoFactor(state, content) : PET_ECHO_FACTOR;
  return capSkill(pet.skillEffect.kind, pet.skillEffect.value ?? 0) * factor;
}

/**
 * claude:2026-10-30T18:42:00+01:00 — 1.4.2 „Echo der Gefährten“ (Spec § 3): Gewicht nicht ausgerüsteter, besessener Begleiter. Narbenbuch
 * `petEchoFactor` (0,35 / 0,5) ersetzt PET_ECHO_FACTOR (0,25), wenn größer; ohne Rang exakt PET_ECHO_FACTOR.
 */
export function petEchoFactor(state: GameState, content: ContentDB): number {
  if (!state.talents) return PET_ECHO_FACTOR;
  const v = talentEffect(state, content, "petEchoFactor");
  return v > PET_ECHO_FACTOR ? Math.min(1, v) : PET_ECHO_FACTOR;
}

// ── Combat-Ability-API (combat-dev konsumiert NUR das) ──────────────────────

/** Was `petCombatAbility` zurückgibt: eine bereits gedeckelte, sofort anwendbare Ability. */
export interface ActivePetAbility {
  kind: PetAbilityKind;
  /** Trigger-Intervall in ms (defensiv ≥ PET_ABILITY_MIN_INTERVAL_MS). */
  intervalMs: number;
  /** Auf den Cap geklemmter Wert (Bedeutung je Kind, siehe `PET_ABILITY_CAP`). */
  value: number;
  /** Nur für `onHitStatus`/`delayedDot`: zu legender Status. */
  status?: PetCombatAbility["status"];
  /** claude:2026-10-18T02:00:00+02:00 — Nur `emberBrand`: Brand-Dauer (ms, > 0), sonst undefined. */
  durationMs?: number;
  /** claude:2026-10-18T02:00:00+02:00 — Nur `emberDetonate`: Brand-Magnitude vor der Zündung (gedeckelt wie emberBrand). */
  burnValue?: number;
}

/**
 * Reine Lese-API für combat-dev: die getriggerte Combat-Ability des aktiven Pets (gedeckelt)
 * oder null. combat.ts hält dafür einen eigenen Intervall-Timer (`combat.petAbility.timerMs`)
 * und löst bei Fälligkeit `firePetAbility` aus. `value` ist bereits geklemmt, `intervalMs`
 * defensiv auf ein endliches Minimum gehoben; `status` nur bei statusbringenden Kinds gesetzt.
 */
export function petCombatAbility(state: GameState, content: ContentDB): ActivePetAbility | null {
  const ab = activeCombatAbility(state, content);
  if (!ab) return null;
  const intervalMs =
    Number.isFinite(ab.intervalMs) && ab.intervalMs > 0
      ? ab.intervalMs
      : PET_ABILITY_MIN_INTERVAL_MS;
  const out: ActivePetAbility = {
    kind: ab.kind,
    intervalMs,
    value: capAbility(ab.kind, ab.value ?? 0),
  };
  if ((ab.kind === "onHitStatus" || ab.kind === "delayedDot") && ab.status) out.status = ab.status;
  // claude:2026-10-18T02:00:00+02:00 — 1.3.0: Zusatzfelder defensiv übernehmen (endlich, > 0, gedeckelt).
  if (ab.kind === "emberBrand" && Number.isFinite(ab.durationMs) && (ab.durationMs ?? 0) > 0) {
    out.durationMs = ab.durationMs;
  }
  if (ab.kind === "emberDetonate") out.burnValue = capAbility("emberBrand", ab.burnValue ?? 0);
  return out;
}

// ── Besitz / Ausrüstung ─────────────────────────────────────────────────────

/** Besitzt der Spieler dieses Pet? */
export function ownsPet(state: GameState, petId: PetId): boolean {
  return state.character.ownedPets[petId] === true;
}

/** Anzahl besessener Pets, die es im Content (noch) gibt — für den Galerie-Fortschritt. */
export function ownedPetCount(state: GameState, content: ContentDB): number {
  let n = 0;
  for (const id of Object.keys(content.pets ?? {})) {
    if (state.character.ownedPets[id]) n++;
  }
  return n;
}

/**
 * Fügt ein Pet dem Besitz hinzu (idempotent). Gibt true zurück, wenn es NEU ist
 * (für „Pet erhalten!"-Log). Rüstet das erste je erhaltene Pet automatisch aus,
 * damit ein frischer Spieler sofort einen Effekt sieht; weitere Pets nicht (Wahl
 * trifft der Spieler in der UI).
 */
export function grantPet(state: GameState, petId: PetId): boolean {
  if (state.character.ownedPets[petId]) return false;
  state.character.ownedPets[petId] = true;
  if (state.character.companionPetId === null) state.character.companionPetId = petId;
  // claude:2026-10-18T00:30:00+02:00 — Pech-Schutz-Zähler endet mit dem Erhalt (egal über welchen Pfad).
  if (state.petPity) delete state.petPity[petId];
  return true;
}

/** Rüstet ein besessenes Pet aus (oder null zum Ablegen). Gibt Erfolg zurück. */
export function equipPet(state: GameState, petId: PetId | null): boolean {
  if (petId === null) {
    state.character.companionPetId = null;
    return true;
  }
  if (!state.character.ownedPets[petId]) return false; // nur besessene Pets ausrüstbar
  // claude:2026-10-18T00:30:00+02:00 — derselbe Begleiter nie in beiden Plätzen: wechselt er von
  // Platz 2 nach Platz 1, rückt der bisherige Platz-1-Begleiter in Platz 2 (Tausch, nichts geht verloren).
  if (state.character.companionPetId2 === petId) state.character.companionPetId2 = state.character.companionPetId;
  state.character.companionPetId = petId;
  return true;
}

/**
 * claude:2026-10-18T00:30:00+02:00 — Rüstet ein besessenes Pet in den zweiten Platz (oder null zum
 * Ablegen). Nur mit Talent `secondPetSlot`; das Pet aus Platz 1 wird abgelehnt (kein Doppel-Platz).
 */
export function equipSecondPet(state: GameState, content: ContentDB, petId: PetId | null): boolean {
  if (petId === null) {
    state.character.companionPetId2 = null;
    return true;
  }
  if (!secondPetSlotUnlocked(state, content)) return false;
  if (!state.character.ownedPets[petId]) return false;
  if (state.character.companionPetId === petId) return false;
  state.character.companionPetId2 = petId;
  return true;
}

/**
 * claude:2026-10-18T00:30:00+02:00 — Effektive Drop-Chance eines Begleiters inkl. Talent
 * `petChanceMult` (Jagdbuch „Fährtenkunde“), auf [0, 1] geklemmt. Ohne Talent exakt `dropChance`.
 */
export function effectivePetDropChance(state: GameState, content: ContentDB, pet: PetDef): number {
  const base = Math.max(0, pet.dropChance);
  const bonus = talentEffect(state, content, "petChanceMult");
  return bonus > 0 ? Math.min(1, base * (1 + bonus)) : base;
}

/**
 * claude:2026-10-18T00:30:00+02:00 — Pech-Schutz (Talent `petPity`, Jagdbuch „Spur aufgenommen“):
 * Stand und Schwelle für einen noch fehlenden Begleiter, oder null ohne Talent / bei Chance 0.
 * Schwelle = ceil(Faktor / effektive Chance); erreicht `count` sie, ist der nächste Wurf garantiert.
 */
export function petPityProgress(
  state: GameState,
  content: ContentDB,
  pet: PetDef,
): { count: number; threshold: number } | null {
  const factor = talentEffect(state, content, "petPity");
  if (factor <= 0) return null;
  const chance = effectivePetDropChance(state, content, pet);
  if (chance <= 0) return null;
  return { count: state.petPity?.[pet.id] ?? 0, threshold: Math.ceil(factor / chance) };
}

/**
 * claude:2026-10-30T22:28:00+01:00 — Belohnungsladen 1.4.2 „Begleiter-Fährte“ (L5): Vorschau, um wie viele Fehlwürfe der Pech-Schutz
 * eines noch FEHLENDEN Begleiters vorgezogen würde: max(1, round(`pct` × Schwelle)), gedeckelt auf die Schwelle.
 *  - `locked`          kein aktives Talent `petPity` („Spur aufgenommen“, Jägerkodex; ruht nach dem Sturz bis Slayer 85).
 *  - `invalid_target`  unbekannter oder schon besessener Begleiter, oder einer ohne Drop-Chance.
 *  - `no_effect`       Spur schon voll (der nächste passende Wurf ist ohnehin garantiert).
 * Rein, kein RNG.
 */
export function petTrailPreview(
  state: GameState,
  content: ContentDB,
  petId: PetId,
  pct: number,
): { ok: true; add: number; count: number; threshold: number } | { ok: false; reason: "locked" | "invalid_target" | "no_effect" } {
  const pet = content.pets?.[petId];
  if (!pet || state.character.ownedPets[petId]) return { ok: false, reason: "invalid_target" };
  if (!(talentEffect(state, content, "petPity") > 0)) return { ok: false, reason: "locked" };
  const pity = petPityProgress(state, content, pet);
  if (!pity) return { ok: false, reason: "invalid_target" };
  if (pity.count >= pity.threshold) return { ok: false, reason: "no_effect" };
  const step = Math.max(1, Math.round(pity.threshold * (Number.isFinite(pct) && pct > 0 ? pct : 0)));
  const add = Math.min(step, pity.threshold - pity.count);
  return { ok: true, add, count: pity.count, threshold: pity.threshold };
}

/** claude:2026-10-30T22:28:00+01:00 — Schreibt die Fährte gut (s. `petTrailPreview`). Gibt die vorgezogenen Fehlwürfe zurück (0 = nichts). */
export function addPetTrail(state: GameState, content: ContentDB, petId: PetId, pct: number): number {
  const p = petTrailPreview(state, content, petId, pct);
  if (!p.ok) return 0;
  (state.petPity ??= {})[petId] = p.count + p.add;
  return p.add;
}

// ── Rare-Drop-Mechanik (Skilling- UND Combat-Seite) ─────────────────────────

/**
 * Unabhängiger Pet-Drop-Wurf für eine abgeschlossene Skilling-Aktion bzw. einen
 * Monster-Kill. Pity nur über das Talent `petPity`. Zieht NUR dann einen `nextFloat`, wenn es
 * für die Quelle ein passendes, noch NICHT besessenes Pet gibt — so bleibt die
 * RNG-Sequenz für frische States (ohne Pet-Content) bit-identisch.
 *
 * `source`:
 *  - `{ kind: "skill", skill }` — Skilling-Aktion (tick.ts ruft das auf).
 *  - `{ kind: "combat", style }` — Monster-Kill (combat-dev ruft das im Kill-Pfad auf, mit dem
 *    AKTIVEN Kampfstil des Spielers). Chef-Fix 2026-07-22: Combat-Pets sind an ihren Stil
 *    gebunden — nur Pets, deren `pet.source.style` dem übergebenen `style` entspricht, werfen.
 *
 * Effektive Chance = `effectivePetDropChance` (dropChance × Talent `petChanceMult`); mit Talent
 * `petPity` zählt jeder Fehlwurf, ab der Schwelle ist der Wurf garantiert. Bei Treffer wird
 * `grantPet` aufgerufen; der Aufrufer loggt.
 *
 * Determinismus-Vorsicht: Bei mehreren passenden, noch-nicht-besessenen Pets pro
 * Quelle wird pro Pet höchstens ein Wurf gezogen (ein gemeinsamer Wurf je Pet, in
 * stabiler Content-Reihenfolge). Bricht beim ersten Treffer ab.
 *
 * @returns die ID des frisch erhaltenen Pets, oder null.
 */
export function tryPetDrop(
  state: GameState,
  content: ContentDB,
  source: { kind: "skill"; skill: SkillId } | { kind: "combat"; style: WeaponStyle },
): PetId | null {
  const pets = content.pets;
  if (!pets) return null;

  // Stabile Reihenfolge (Object.keys = Insertion-Order in V8) → determinismus-stabil.
  for (const id of Object.keys(pets)) {
    const pet = pets[id];
    if (!pet) continue;
    if (state.character.ownedPets[id]) continue; // bereits besessen → kein Wurf
    const src = pet.source;
    if (src.kind !== source.kind) continue;
    if (src.kind === "skill" && source.kind === "skill" && src.skill !== source.skill) continue;
    if (src.kind === "combat" && source.kind === "combat" && src.style !== source.style) {
      // claude:2026-10-30T18:42:00+01:00 — 1.4.2 Begleiter-Spur (E10, Spec § 4): ein Kill in einem ANDEREN Stil zählt den Pech-Schutz
      // dieses Kampf-Begleiters um 1 weiter, nur mit Talent `petPity` und OHNE RNG-Zug (Wurfreihenfolge unverändert).
      // Gedeckelt auf die Schwelle: ist die Spur voll, fällt er beim nächsten Kill im passenden Stil (Garantie unten).
      const offPity = petPityProgress(state, content, pet);
      if (offPity !== null && offPity.count < offPity.threshold) (state.petPity ??= {})[id] = offPity.count + 1;
      continue;
    }

    // claude:2026-10-18T00:30:00+02:00 — Talente: Chance ×(1+petChanceMult), Pech-Schutz-Garantie.
    // Der nextFloat wird IMMER gezogen (auch bei Garantie) → RNG-Folge unabhängig vom Zählerstand;
    // ohne Talente bit-identisch zum Altstand (Chance = dropChance, kein Zähler).
    const chance = effectivePetDropChance(state, content, pet);
    if (chance <= 0) continue;
    const pity = petPityProgress(state, content, pet);
    const roll = nextFloat(state.rng);
    if (roll <= chance || (pity !== null && pity.count >= pity.threshold)) {
      grantPet(state, id);
      // Breadcrumb für die UI-Benachrichtigung („Begleiter erhalten!"). Die seq kommt aus dem
      // monotonen Lebenszeit-Zähler `petDropSeq` — NICHT aus `lastPetDrop.seq`: die UI quittiert
      // den Breadcrumb mit null, und `(lastPetDrop?.seq ?? 0) + 1` fiele danach auf 1 zurück,
      // unter die seenSeq-Hochwassermarke der UI → jeder weitere Session-Drop bliebe stumm
      // (Welle DD, Fun-Sweep pets-fenn Top-1). petDropSeq wird NIE genullt oder gesenkt.
      state.petDropSeq += 1;
      state.lastPetDrop = { petId: id, seq: state.petDropSeq };
      return id;
    }
    if (pity !== null) (state.petPity ??= {})[id] = pity.count + 1; // Fehlwurf zählt nur mit Talent
  }
  return null;
}
