/**
 * Kampfeffekte Welle 1 (design/combat-fx/konzept-kampfeffekte.md, Chef-Entscheide D1–D5) —
 * reine Auflösungs-Logik: welches Mira-Sprite gehört zu welchem Kampflog-Ereignis. Kein DOM,
 * kein WAAPI, kein React-State hier — das WAAPI-Abspielen sitzt in CombatPage.tsx (Battle),
 * direkt neben dem bestehenden FX-Layer (`acquireFx`/`playFx`/`fxRect`/`bumpFx`), damit beide
 * denselben Pool/Layer/Koordinaten-Anker teilen. Diese Datei bleibt dadurch pur und ohne
 * Vitest-DOM-Aufwand testbar.
 *
 * Auto-Discovery wie bei den Kampf-Sounds (util/audio.ts COMBAT_FILES) bzw. den Sidebar-Icons
 * (sidebarIcons.ts): fehlt eine Datei unter assets/fx/, liefert `fxSprite` null — der Aufrufer
 * fällt dann auf den alten Form-Effekt zurück (Konzept §3 „stückweise lieferbar").
 */
import type { ItemDef, MonsterDef, PetAbilityKind, PetDef, PetId, StatusType, WeaponType } from "@hearthforge/shared";
import { effectiveWeaponEffects } from "@hearthforge/shared";

const FX_FILES = import.meta.glob<string>("./assets/fx/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const FX_BY_NAME: Record<string, string> = {};
for (const [path, url] of Object.entries(FX_FILES)) {
  const name = path.split("/").pop()?.replace(/\.webp$/, "");
  if (name) FX_BY_NAME[name] = url;
}

/**
 * URL eines fx-Sprites (Dateiname ohne Endung, z.B. `fx_impact_fire`, `fx_missile_arrow`,
 * `fx_slash_cut`, `fx_blood_ichor`, `fx_pet_bite`, `fx_crit_magic`, `fx_miss_whiff`), oder
 * `null`, wenn die Datei (noch) nicht unter assets/fx/ liegt.
 */
export function fxSprite(name: string): string | null {
  return FX_BY_NAME[name] ?? null;
}

// ─── Sequenzen, Varianten, Crit (28.08.2026, Chef-Feedback "mehr Frames, Varianten, Crit") ─────
// Reine Auflösungs-Helfer, kein Zufall/State hier (das bleibt in CombatPage, s. dortiges
// `pickFxVariant` — dieselbe "kein React-State"-Trennung wie beim Rest der Datei).

/** Varianten-Suffixe für Zufallspools: Basisdatei `fx_<key>.webp` plus optional `_v1`…`_v9`. */
const VARIANT_SUFFIXES = Array.from({ length: 9 }, (_, i) => `_v${i + 1}`);

/**
 * Alle vorhandenen Varianten-URLs eines Effekt-Schlüssels (Basisdatei zuerst, dann `_v1`…`_v9` in
 * Reihenfolge), z.B. `missile_fire` → [fx_missile_fire, fx_missile_fire_v1, …_v3]. Gilt generisch
 * für jeden Schlüssel (Geschosse `missile_<thema>`, Einschläge `impact_<thema>`, Slashes
 * `slash_<familie>`, Blut `blood_<variante>`, Begleiter `pet_<bild>`, Miss/Block …) — Auto-
 * Discovery wie bei `fxSprite`: fehlende Dateien fehlen einfach im Array, leeres Array = kein
 * Sprite vorhanden.
 */
export function fxVariants(key: string): string[] {
  const out: string[] = [];
  const base = fxSprite(`fx_${key}`);
  if (base) out.push(base);
  for (const suffix of VARIANT_SUFFIXES) {
    const url = fxSprite(`fx_${key}${suffix}`);
    if (url) out.push(url);
  }
  return out;
}

/** Crit-Sonderdatei eines Effekt-Schlüssels (`fx_<key>_crit.webp`), oder `null`. Getrennt von den
 *  normalen Varianten und vom bestehenden Crit-OVERLAY (`fx_crit_magic`/`fx_crit_weapon`, bleibt
 *  unverändert zusätzlich obendrauf, s. CombatPage `playImpactFx`/`playSlashFx`). */
export function fxCritVariant(key: string): string | null {
  return fxSprite(`fx_${key}_crit`);
}

/** Alle bekannten fx-URLs, für den Bild-Maße-Preload in CombatPage (Feldzahl-Ableitung aus der
 *  Bildbreite). */
export function fxAllUrls(): string[] {
  return Object.values(FX_BY_NAME);
}

// ─── Familie A — Magie-Thema ─────────────────────────────────────────────────
// Chef-D1: alle sieben Themen. Reihenfolge = Priorität: klassischer Waffeneffekt zuerst
// (effectiveWeaponEffects deckt weaponEffect + weaponEffects[]), danach die Aether-Tier-ID,
// sonst arkaner Standard.
export type MagicTheme = "arcane" | "fire" | "frost" | "shock" | "poison" | "void" | "aether";

const WEAPON_EFFECT_THEME: Partial<Record<string, MagicTheme>> = {
  burn: "fire",
  frost: "frost",
  frostbite: "frost",
  shock: "shock",
  poison: "poison",
  plaguebearer: "poison",
  bane: "void",
  execute: "void",
};

/**
 * Magie-Thema der angreifenden Waffe (Familie A). `weapon` ist die mainhand-Waffe des Casters
 * (Stab/Zauberstab/Fokus/Szepter) — für Aether-Waffen greift die ID-Erkennung (`aether_orb`,
 * `aether_runestaff`, `godspark_*`; `aetherium_*` matcht über den `aether`-Präfix mit, was
 * beabsichtigt ist: die Aetherium-Tier-Magiewaffen sollen dasselbe Licht-Thema tragen).
 */
export function magicThemeFor(weapon: ItemDef | null | undefined): MagicTheme {
  // Elementleiter (Chef-GO 28.08.2026): expliziter Content-Override zuerst (z. B. Aether-Waffen, die Brand tragen).
  if (weapon?.magicTheme) return weapon.magicTheme;
  for (const fx of effectiveWeaponEffects(weapon)) {
    const theme = WEAPON_EFFECT_THEME[fx.type];
    if (theme) return theme;
  }
  if (weapon && (weapon.id.startsWith("aether") || weapon.id.startsWith("godspark"))) return "aether";
  return "arcane";
}

// ─── Familie B — Slash ────────────────────────────────────────────────────────
// "arrow" wird nie an playSlashFx durchgereicht (Bögen laufen über den Geschoss+Einschlag-Pfad
// wie Familie A, Konzept §2 „Pfeil wie Geschoss A") — die Zuordnung steht hier trotzdem
// vollständig, weil `stats.style === "ranged"` in CombatPage bereits VOR jedem slashFamilyFor-
// Aufruf abzweigt; der Rückgabewert dient nur der Vollständigkeit/Testbarkeit der Tabelle.
export type SlashFamily = "cut" | "heavy" | "blunt" | "thrust" | "arrow";

const WEAPON_TYPE_SLASH: Partial<Record<WeaponType, SlashFamily>> = {
  dagger: "cut",
  sword: "cut",
  scimitar: "cut",
  greatsword: "heavy",
  greataxe: "heavy",
  battleaxe: "heavy",
  axe: "heavy",
  mace: "blunt",
  maul: "blunt",
  spear: "thrust",
  shortbow: "arrow",
  longbow: "arrow",
};

/**
 * Slash-Sprite-Familie aus dem WeaponType (Familie B). Fällt auf "cut" zurück, wenn kein
 * WeaponType bekannt ist — Gegner-Angriffe haben keine Waffendaten (kein `weaponType` im
 * MonsterDef), Chef-D5 verlangt trotzdem denselben (gespiegelten) Slash-Effekt für den Gegner,
 * darum ist "cut" hier der bewusste Default statt eines Nichts.
 */
export function slashFamilyFor(weaponType: WeaponType | null | undefined): SlashFamily {
  return (weaponType && WEAPON_TYPE_SLASH[weaponType]) || "cut";
}

// ─── Familie C — Blutvariante ─────────────────────────────────────────────────
export type BloodVariant = "red" | "ichor" | "bone";

/**
 * Blut-/Ichor-/Knochenstaub-Variante des GETROFFENEN Wesens (Familie C). `monster` ist nur
 * gesetzt, wenn der Gegner getroffen wurde — trifft ein Monster-Angriff den SPIELER, ruft
 * CombatPage diese Funktion mit `undefined` (Spieler blutet immer rot).
 */
export function bloodVariantFor(monster: Pick<MonsterDef, "id" | "family"> | null | undefined): BloodVariant {
  if (!monster) return "red";
  if (monster.family === "construct") return "bone";
  if (/skeleton/i.test(monster.id)) return "bone"; // viele Skelett-Mobs sind untagged Alt-Content
  if (monster.family === "undead" || monster.family === "demon") return "ichor";
  return "red";
}

// ─── Familie D — Begleiter-Bildfamilie ────────────────────────────────────────
export type PetFxImage = "bite" | "bolt" | "ward" | "mark" | "pilfer" | "critstar";

const PET_ABILITY_IMAGE: Record<PetAbilityKind, PetFxImage> = {
  multiHit: "bite",
  burstDamage: "bite",
  armorRend: "bite",
  delayedDot: "bolt",
  onHitStatus: "bolt",
  shield: "ward",
  heal: "ward",
  blockNextEnemyHit: "ward",
  wardRestore: "ward",
  lifestealBurst: "ward",
  accuracyDownEnemy: "mark",
  enemyAttackDelay: "mark",
  stun: "mark",
  stealDrop: "pilfer",
  guaranteedCrit: "critstar",
  armorPierceHit: "critstar",
  // claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-Rework: neue Kinds auf die bestehende Bildfamilie.
  currentHpStrike: "bite",
  crippleStrike: "critstar",
  cripplingPoison: "bolt",
  emberBrand: "bolt",
  emberDetonate: "critstar",
  executeBleed: "bolt",
  frostBite: "mark",
  emergencyHeal: "ward",
  deathSave: "ward",
};

/** Begleiter-Bildfamilie aus `combatAbility.kind` (Familie D, alle 16 Kinds gemappt). */
export function petFxImageFor(kind: PetAbilityKind): PetFxImage {
  return PET_ABILITY_IMAGE[kind];
}

/**
 * Ziel-Seite eines Begleiter-Effekts (Konzept §2 D: „Effekt am Ziel (Gegner) bzw. am Spieler
 * bei Schutz/Heilung"). Nur die "ward"-Bildfamilie (shield/heal/blockNextEnemyHit/wardRestore/
 * lifestealBurst) trifft den Spieler, alles andere den Gegner.
 */
export function petFxTargetSide(image: PetFxImage): "player" | "enemy" {
  return image === "ward" ? "player" : "enemy";
}

// ─── Begleiter-Partikel-Thema (Chef-Auftrag 29.08.2026) ───────────────────────
// Bislang wählte der Begleiter-Partikel-Effekt sein Aussehen NUR aus der Bildfamilie
// (`petFxImageFor`, oben) — nicht aus dem Element der Fähigkeit. Der Pyreling schießt „Flame
// Nova" (status:"burn") und feuerte damit einen stahlfarbenen Blitz statt Feuer. `petFxThemeFor`
// leitet das Thema rein aus dem Content ab: zuerst über den Status der Fähigkeit (dieselbe
// Elementleiter wie `magicThemeFor`/`WEAPON_EFFECT_THEME` oben), sonst über eine kleine explizite
// Tabelle für die Begleiter, deren Fähigkeit thematisch eindeutig ist, aber kein `status`-Feld
// trägt (packages/content/src/index.ts `pets`). `bleed` ist bewusst KEIN `MagicTheme` (kein
// Element) — eigener Rückgabewert, das Rezept nutzt dafür die Blut-/Crimson-Palette statt einer
// der sieben Magie-Paletten. `null` = kein Treffer = heutiges neutrales Aussehen, unverändert
// (z.B. Quillshrikes „Quill Volley", Gloomrats „Pilfer", Ironmaws „Body Slam" — kein Element).
export type PetFxTheme = MagicTheme | "bleed";

const PET_STATUS_THEME: Partial<Record<StatusType, PetFxTheme>> = {
  burn: "fire",
  frost: "frost",
  shock: "shock",
  poison: "poison",
  void: "void",
  bleed: "bleed",
};

/** Begleiter ohne `status`-Feld, deren Fähigkeit trotzdem eindeutig thematisch ist: hoarspite
 *  friert/betäubt ("Grave Frost"), gemwraith/glyphmaw/vellumoth sind arkane Rune-/Kristall-
 *  Effekte ("Prismatic Lance"/"Rune Feast"/"Sigil Ward"), charnel ist ein Leere-Lebensraub
 *  ("Feast of the Fallen"). */
const PET_ID_THEME: Partial<Record<PetId, PetFxTheme>> = {
  hoarspite: "frost",
  gemwraith: "arcane",
  glyphmaw: "arcane",
  vellumoth: "arcane",
  charnel: "void",
};

/** claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-Rework: die neuen Kinds tragen ihr Element im Kind statt im `status`-Feld. */
const PET_KIND_THEME: Partial<Record<PetDef["combatAbility"]["kind"], PetFxTheme>> = {
  emberBrand: "fire",
  emberDetonate: "fire",
  cripplingPoison: "poison",
  executeBleed: "bleed",
  frostBite: "frost",
};

/** Partikel-Thema eines Begleiters (Familie D), oder `null` = heutiges neutrales Aussehen. */
export function petFxThemeFor(pet: Pick<PetDef, "id" | "combatAbility">): PetFxTheme | null {
  const status = pet.combatAbility.status;
  if (status) {
    const theme = PET_STATUS_THEME[status];
    if (theme) return theme;
  }
  return PET_KIND_THEME[pet.combatAbility.kind] ?? PET_ID_THEME[pet.id] ?? null;
}
