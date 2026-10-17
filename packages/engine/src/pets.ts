import type {
  BoostableCombatSkillId,
  ContentDB,
  GameState,
  PetAbilityKind,
  PetCombatAbility,
  PetDef,
  PetId,
  PetSkillEffect,
  PetSkillEffectKind,
  SkillId,
  WeaponStyle,
} from "@hearthforge/shared";
import { PET_ABILITY_CAP, PET_ABILITY_MIN_INTERVAL_MS, PET_SKILL_EFFECT_CAP } from "@hearthforge/shared";
import { nextFloat } from "./rng";
import { talentEffect } from "./talents";

/**
 * Pet-/Begleiter-System — reine, deterministische Helfer. Logic-Dev-Revier.
 *
 * ZWEI-EFFEKT-MODELL (Chef-Freigabe 2026-06-25): jedes Pet trägt
 *  - `skillEffect`   — wirkt im Herkunfts-Skill (tick.ts Skilling-Pfad / computeStats),
 *  - `combatAbility` — getriggerte Kampf-Aktion (combat-dev löst sie via `petCombatAbility` aus).
 *
 * Pets sind eigene `PetDef`-Daten (KEIN Gear-Item, kein EquipSlot). Platz 1 (`character.companionPetId`)
 * wirkt voll; Platz 2 (`companionPetId2`, Talent `secondPetSlot`) nur mit dem skillEffect — gleiche
 * Effektart stapelt nicht (Maximum). Besessene Pets liegen als Set in `character.ownedPets`.
 *
 * Die Skill-Helfer (`petDoubleYieldBonus`, `petPreserveBonus`, `petThievingBonus`,
 * `petInstantActionChance`, `petSpellReserveMult`, `petLifesteal`, `petSkillBoost`,
 * `petDamageReduction`, `petSellBonus`, `petHuntDoubleRollsChance`) ruft tick.ts/computeStats/shop.ts/
 * hunting.ts an genau definierten Stellen ab; `petDoubleLootChance`/`petKillHealFraction`
 * konsumiert combat-dev im Kill-Pfad.
 * Die Combat-Seite konsumiert sonst NUR `petCombatAbility(state, content)` (reine Lese-API);
 * die getriggerte Anwendung im Fight (Intervall-Timer + Effekt-Dispatch) macht combat-dev in
 * `combat.ts`. Hier wird KEINE Pet-Logik dupliziert.
 *
 * XP-VERBOT (#276): Pet-Passive mit XP-Wirkung sind ABGESCHAFFT (Chef-Vorgabe). Das Legacy-Kind
 * `skillXp` wird bis zum Content-Apply (Schritt 3) geduldet, aber hier AUSGEFILTERT (No-op).
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

/** Skill-Effekte beider Plätze (Platz 1 zuerst). (#276: Content ist vollständig auf die neue
 *  Taxonomie umgestellt; der frühere Legacy-skillXp-Filter ist mit dem Typ gestorben.) */
function activeSkillEffects(state: GameState, content: ContentDB): PetSkillEffect[] {
  const out: PetSkillEffect[] = [];
  const first = equippedPet(state, content);
  if (first) out.push(first.skillEffect);
  const second = secondPet(state, content);
  if (second) out.push(second.skillEffect);
  return out;
}

/**
 * claude:2026-10-18T00:30:00+02:00 — Wert EINER Effektart über beide Plätze: gleiche Art stapelt nicht,
 * es zählt der stärkere (Maximum). `skill` gesetzt ⇒ nur skill-freie oder auf diesen Skill gemünzte
 * Effekte (Effekte verschiedener Skills treffen also nie im selben Aufruf zusammen).
 */
function bestOfKind(effects: PetSkillEffect[], kind: PetSkillEffectKind, skill?: SkillId): number {
  let best = 0;
  for (const eff of effects) {
    if (eff.kind !== kind) continue;
    if (skill !== undefined && eff.skill !== undefined && eff.skill !== skill) continue;
    best = Math.max(best, capSkill(kind, eff.value ?? 0));
  }
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
 * Magnitude des aktiven Skill-Effekts, falls sein Kind in `kinds` liegt UND (für
 * skill-gebundene Kinds) auf `skill` gemünzt ist; sonst 0. `spellReserve` ist global
 * und ignoriert den Skill-Filter (über `skillFiltered: false`).
 */
function skillScopedValue(
  state: GameState,
  content: ContentDB,
  kinds: PetSkillEffectKind[],
  skill: SkillId,
): number {
  const effects = activeSkillEffects(state, content);
  if (effects.length === 0) return 0;
  // claude:2026-10-18T00:30:00+02:00 — je Art das Maximum beider Plätze, verschiedene Arten addieren.
  let sum = 0;
  for (const kind of kinds) sum += bestOfKind(effects, kind, skill);
  return sum;
}

// ── Skilling-Effekte (tick.ts) ──────────────────────────────────────────────

/**
 * Additive Chance (0..0.05), eine Skilling-Aktion sofort abzuschließen (instantAction).
 * tick.ts behandelt einen Treffer wie einen extra Aktions-Abschluss. Nur für den
 * Herkunfts-Skill des Pets.
 */
export function petInstantActionChance(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["instantAction"], skill);
}

// petSkillXpMult: GELÖSCHT (#276) — XP-Pets sind abgeschafft (Chef-Verbot); die letzte
// Call-Site in combat.ts wurde in Schritt 2 entfernt.

/**
 * Additiver Doppelertrag-Chancen-Bonus (0..0.05) für einen Skill. Aggregiert alle
 * Skill-Kinds, die funktional die Doppelertrag-Chance erhöhen (doubleDrop, gatherYield,
 * flawlessGem, bonusRunes).
 *
 * `bonusAmmo` ist seit dem Ammo-Removal (#286) ein NO-OP und hier BEWUSST AUSGEFILTERT
 * (bewährtes Muster, wie früher das Legacy-`skillXp`-Kind): das Kind ist fletching-scoped und
 * stirbt mit Fletching in Stage B — content-dev ersetzt dort das Passiv des Träger-Pets.
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
 * Additiver Material-Preservation-Bonus (0..0.05) für einen Skill. Aggregiert alle
 * Skill-Kinds, die funktional Material erstatten (refundMaterial, perfectCook, potionPreserve).
 */
export function petPreserveBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["refundMaterial", "perfectCook", "potionPreserve"], skill);
}

/** Additiver Thieving-Erfolgs-Bonus (0..0.03) für einen Skill. Cap 0.95 bleibt (actionSuccessChance). */
export function petThievingBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["thievingSuccess"], skill);
}

/**
 * Chance (0..0.05) je FANG, dass der Fang HUNT_LOOT_ROLLS_DOUBLED (zehn statt fünf) Beute-Durchläufe
 * liefert (1.2.0 „Fasern und Fallen", Chef 28.08.2026: Leon/booted_tomcat auf `hunting`).
 * hunting.ts `grantCatch` zieht den Erfolgs-nextFloat NUR, wenn diese Chance > 0 ist (Muster
 * petDoubleLootChance/tryPetDrop) — ohne passendes Pet bleibt die RNG-Sequenz bit-identisch.
 * Rein lesend, kein RNG.
 */
export function petHuntDoubleRollsChance(state: GameState, content: ContentDB, skill: SkillId): number {
  return skillScopedValue(state, content, ["huntDoubleRolls"], skill);
}

// ── Globale Effekte (computeStats / shop.ts / combat-dev-Kill-Pfad) ─────────

/**
 * Wert des aktiven Skill-Effekts, falls sein Kind exakt `kind` ist (skill-freie/globale Kinds).
 * Über `capSkill` geklemmt; 0 ohne passendes Pet. Gemeinsamer Pfad aller globalen Helfer.
 */
function globalValue(state: GameState, content: ContentDB, kind: PetSkillEffectKind): number {
  return bestOfKind(activeSkillEffects(state, content), kind); // claude:2026-10-18T00:30:00+02:00 — beide Plätze, Maximum
}

/**
 * Zauberreserve-Multiplikator (≥1) durch ein spellReserve-Pet (Zauberreserve, Chef-GO 28.08.2026:
 * ersetzt den früheren manaRegen-Multiplikator — es gibt keine Mana-Regeneration mehr). Für computeStats
 * (multipliziert maxMana NACH allen additiven Boni).
 */
export function petSpellReserveMult(state: GameState, content: ContentDB): number {
  return 1 + globalValue(state, content, "spellReserve");
}

// ── #276 Pet-Redesign: die 6 neuen Passiv-Kinds (Spec §4.2/§5.3) ────────────

/**
 * Additiver Lebensraub-Anteil (0..0.02) durch ein lifesteal-Pet (gorehound „Blood Tithe").
 * computeStats addiert ihn in den bestehenden lifesteal-Aggregat (`lifestealPct`).
 */
export function petLifesteal(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "lifesteal");
}

/**
 * GANZE effektive Bonus-Level (0..2) für EINEN boostbaren Kampf-Skill durch ein skillBoost-Pet
 * (ironmaw „Bonecrusher": power +2). computeStats addiert sie in den bestehenden Skill-Boost-
 * Aggregat — NUR Kampfformeln, wie Gear-Boosts: schaltet nichts frei, kein XP-Effekt,
 * Requirements/combatLevel lesen weiter das Basis-Level. `floor` gegen Fehl-Content (keine
 * halben Level).
 */
export function petSkillBoost(state: GameState, content: ContentDB, skill: BoostableCombatSkillId): number {
  // claude:2026-10-18T00:30:00+02:00 — beide Plätze; skillBoost braucht einen exakt passenden Skill.
  let best = 0;
  for (const eff of activeSkillEffects(state, content)) {
    if (eff.kind !== "skillBoost" || eff.skill !== skill) continue;
    best = Math.max(best, Math.floor(capSkill("skillBoost", eff.value ?? 0)));
  }
  return best;
}

/**
 * Multiplikative Schadensreduktion (0..0.04) durch ein damageReduction-Pet (carapace
 * „Stoneshell"). computeStats legt sie als `DerivedStats.damageReduction` ab; combat-dev
 * (Schritt 2) wendet sie in der Gegner→Spieler-Pipeline NACH Armor/Ward/Block an.
 */
export function petDamageReduction(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "damageReduction");
}

/**
 * Chance (0..0.05) je Monster-Kill, den kompletten Loot- UND Gold-Wurf ein zweites Mal
 * auszuführen (carrionwing „Scavenger"). combat-dev konsumiert das im Kill-Pfad (nach Loot/Gold,
 * vor `tryPetDrop`): keine Rekursion, kein zweiter doubleLoot-/Pet-Wurf, keine Dungeon-Token.
 * RNG-Disziplin: den Erfolgs-nextFloat NUR ziehen, wenn diese Chance > 0 ist (Muster tryPetDrop).
 */
export function petDoubleLootChance(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "doubleLoot");
}

/**
 * Heil-Anteil (0..0.05, Bruch player.maxHp) bei jedem Monster-Kill (charnel „Corpsefeeder").
 * combat-dev: `healPlayer(…, maxHp × Wert, "effect")` im Kill-Pfad.
 */
export function petKillHealFraction(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "killHeal");
}

/**
 * Verkaufs-Gold-Bonus (0..0.05) durch ein sellBonus-Pet (vellumoth „Appraiser's Eye").
 * shop.ts wendet ihn in `effectiveSellPrice` an (×(1+Wert), runden wie bisher, min 1).
 */
export function petSellBonus(state: GameState, content: ContentDB): number {
  return globalValue(state, content, "sellBonus");
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
    if (src.kind === "combat" && source.kind === "combat" && src.style !== source.style) continue;

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
