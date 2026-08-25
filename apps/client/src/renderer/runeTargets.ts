import type { AffixDef, ItemDef, ItemTypeTag, TrinityStats } from "@hearthforge/shared";

/**
 * Wofür ist diese Rune? — eine kurze, ehrliche Antwort in Spielersprache.
 *
 * Spieler-Report 1.0.2: „why does the crafting not display what the enchantment rune is for:
 * Weapon, Armor, Jewelry, etc. What enchantment runes go into jewelry?" Berechtigt: die
 * Information lag bisher NUR in `AffixDef.appliesTo` (+ dem Trinity-Klassen-Gate) und wurde
 * nirgends angezeigt. Wer eine Rune kaufte, erfuhr erst am Verzauberungstisch, dass sie nicht
 * passt.
 *
 * Zwei Filter entscheiden, und der zweite ist der unsichtbarere:
 *  1. `appliesTo` — Tag-Filter über `itemTypeTags` (any_weapon / weapon_melee / weapon_ranged /
 *     weapon_magic / armor / shield / jewelry).
 *  2. Das TRINITY-Klassen-Gate (enchant.ts §6.2): trägt die Rune einen Trinity-Stat, muss das
 *     Zielteil denselben Stat schon > 0 haben. „Rüstung" heißt dann in Wahrheit Platte (Schutz),
 *     Leder (Ausweichen) oder Stoff (Ward) — drei verschiedene Dinge unter einem Tag.
 *
 * Deshalb liefert diese Datei die FEINE Antwort („Platte", „Nahkampfwaffen") statt der groben.
 * Und auf die Frage nach Schmuck gibt es eine klare Antwort: es gibt heute KEINE Rune, deren
 * Tag-Filter Schmuck meint. Ringe/Amulette/Umhänge tragen zwar zusätzlich das `armor`-Tag,
 * scheitern bei den drei Rüstungsrunen aber am Trinity-Gate, solange das Schmuckstück nicht
 * selbst Schutz/Ausweichen/Ward trägt (ein paar Umhänge tun das) — s. `runeFitsHint`.
 */

/** Die vier Trinity-Achsen in der Reihenfolge von `enchant.ts` TRINITY_KEYS. */
const TRINITY_KEYS: readonly (keyof TrinityStats)[] = [
  "armorRating",
  "evasionRating",
  "wardCapacity",
  "blockChance",
];

/** i18n-Schlüssel je Trinity-Achse — die Rüstungsklasse, die das Gate verlangt. */
const TRINITY_CLASS_KEY: Record<string, string> = {
  armorRating: "rune.target.plate",
  evasionRating: "rune.target.leather",
  wardCapacity: "rune.target.cloth",
  blockChance: "rune.target.shield",
};

/** i18n-Schlüssel je `appliesTo`-Tag — der grobe Filter. */
const TAG_KEY: Record<ItemTypeTag, string> = {
  any: "rune.target.any",
  any_weapon: "rune.target.anyWeapon",
  weapon_melee: "rune.target.weaponMelee",
  weapon_ranged: "rune.target.weaponRanged",
  weapon_magic: "rune.target.weaponMagic",
  armor: "rune.target.armor",
  shield: "rune.target.shield",
  jewelry: "rune.target.jewelry",
};

/**
 * Die Trinity-Achse, die eine Rune bei `tier` verlangt (oder null für Waffen-/Attribut-Runen).
 * Spiegel von `trinityGatePasses` (engine/enchant.ts), das zwei Quellen kennt, und genauso auch
 * hier geprüft werden müssen:
 *  1. `def.requiresTrinity` — Runen Tier IV (Chef-Entscheid 25.08.2026, design/runen-tier-iv.html
 *     §4.2): tragen selbst KEINEN Trinity-Wert (kein `trinityByTier`), verlangen die Klasse aber
 *     trotzdem. Ohne diesen Zweig zeigte z.B. die Schild-Rune „Ungebrochene Mauer" (blockRestore)
 *     am Tooltip nur das grobe `appliesTo`-Tag „Rüstung" statt „Schilde" — Ziel-Label und
 *     Verzauberungstisch-Gate wären auseinandergelaufen (das Gate lehnt sie auf Nicht-Schilden ab).
 *  2. `trinityByTier` — die klassischen Rüstungsklassen-Runen (Ägide/Ausweichen/…, Tier-unabhängig
 *     vom neuen Feld). Vorrang vor `requiresTrinity`, falls beide vorkämen (heute exklusiv).
 */
function trinityAxis(def: AffixDef, tier: number): keyof TrinityStats | null {
  const tri = def.trinityByTier?.[tier - 1];
  const fromTrinity = tri ? TRINITY_KEYS.find((k) => (tri[k] ?? 0) > 0) : undefined;
  return fromTrinity ?? def.requiresTrinity ?? null;
}

/**
 * Kurzes Ziel-Label für eine Rune, z.B. „Nahkampfwaffen", „Platte", „Schilde".
 * Das Trinity-Gate schlägt den groben Tag: eine Aegis-Rune ist `appliesTo: ["armor"]`, passt aber
 * nur auf Teile mit Schutzwert — „Platte" ist die ehrlichere Auskunft als „Rüstung".
 */
export function runeTargetLabel(def: AffixDef, tier: number, t: (k: string) => string): string {
  const axis = trinityAxis(def, tier);
  if (axis) return t(TRINITY_CLASS_KEY[axis]!);
  const tags = def.appliesTo ?? [];
  if (tags.length === 0) return t("rune.target.any");
  return tags.map((tag) => t(TAG_KEY[tag] ?? "rune.target.any")).join(" · ");
}

/**
 * Ein Satz Zusatz-Erklärung, wenn das Ziel-Label allein irreführen könnte — heute genau der
 * Trinity-Fall: „Nur auf Teilen, die selbst Schutzwert tragen." Ohne diesen Satz sucht ein
 * Spieler den Fehler bei sich, wenn seine Lederrüstung die Schutzrune abweist.
 * Gibt null zurück, wo das Label schon alles sagt (Waffenrunen).
 */
export function runeFitsHint(def: AffixDef, tier: number, t: (k: string) => string): string | null {
  const axis = trinityAxis(def, tier);
  if (!axis) return null;
  return t(`rune.target.hint.${axis}`);
}

/**
 * Trägt dieses Item überhaupt Verzauberungs-Slots? Nur Ausrüstung — Materialien, Tränke und
 * Nahrung haben keine. Bewusst NICHT an der Rarity entschieden: die bestimmt nur, WIE VIELE.
 */
export function isEnchantable(item: ItemDef): boolean {
  return item.type === "equipment";
}
