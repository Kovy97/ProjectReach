/**
 * Spieler-Archetypen-Roster (Chef+Mira-Auftrag 26./27.08.2026): 15 Kampfklassen + 15 Berufe, je
 * männlich und weiblich, je Rasse = 60 Porträts pro Rasse (`assets/portraits/<rasse>_<archetyp>_
 * <m|f>.webp`). Identitäten/Zuordnung sind gesperrt in `CODEX/work/2026-08-26-human-roster/
 * ROSTER.md` (Mensch) und `CODEX/work/2026-08-27-elf-roster/ROSTER.md` (Elf) — dieses Modul
 * spiegelt nur IDs/Gruppen/i18n-Schlüssel, keine Bildbeschreibungen.
 *
 * `character.portrait` bleibt die einzige gespeicherte Kennung (String-ID wie bisher) — Rasse/
 * Archetyp/Variante werden bei Bedarf aus der ID abgeleitet (`parsePortraitId`), kein neues
 * Save-Feld, kein SAVE_VERSION-Bump.
 *
 * Diese Datei hieß bis 27.08.2026 `humanRoster.ts` (nur Menschen); beim Hinzufügen der Elfen als
 * zweite Rasse wurde sie zu `playerRoster.ts` verallgemeinert. Die alten Human-only-Exportnamen
 * (`HUMAN_ARCHETYPES`, `HumanArchetype`, `ParsedHumanPortrait`) bleiben als Re-Exports erhalten.
 */
import { listPortraits } from "./portraits";

export type ArchetypeGroup = "combat" | "profession";
export type Sex = "m" | "f";
export type Race = "human" | "elf" | "orc";

/** Reihenfolge = Anzeigereihenfolge der Rassen-Filterchips (Mensch zuerst, Standardwahl). */
// Ork-Roster (Mira, 27.08.2026): dritte Rasse, 60 Porträts orc_<archetyp>_<m|f>.
export const RACES: Race[] = ["human", "elf", "orc"];

export interface Archetype {
  id: string;
  group: ArchetypeGroup;
  /** i18n-Schlüssel des Anzeigenamens (`archetype.<id>`, translations.ts + locales/*). */
  nameKey: string;
}

// Reihenfolge = ROSTER.md-Tabellenreihenfolge (Kampfklassen zuerst, dann Berufe). Rassen-
// unabhängig: dieselben 30 Archetyp-IDs existieren für jede Rasse, nur die Porträts unterscheiden
// sich (human_warrior_m vs. elf_warrior_m, gleicher Anzeigename "Krieger").
const COMBAT_IDS = [
  "warrior",
  "paladin",
  "berserker",
  "spear_warden",
  "death_knight",
  "slayer",
  "ranger",
  "duelist",
  "rogue",
  "fire_mage",
  "frost_mage",
  "shadow_mage",
  "warlock",
  "shaman",
  "rune_knight",
] as const;

const PROFESSION_IDS = [
  "miner",
  "woodcutter",
  "fisher",
  "farmer",
  "forager",
  "herbalist",
  "cook",
  "blacksmith",
  "weaponsmith",
  "leatherworker",
  "jeweler",
  "runecrafter",
  "enchanter",
  "thief",
  "builder",
] as const;

export const ARCHETYPES: Archetype[] = [
  ...COMBAT_IDS.map((id): Archetype => ({ id, group: "combat", nameKey: `archetype.${id}` })),
  ...PROFESSION_IDS.map((id): Archetype => ({ id, group: "profession", nameKey: `archetype.${id}` })),
];

/** Portrait-ID für Rasse + Archetyp + Variante, z.B. `portraitIdFor("elf", "ranger", "f")` → `elf_ranger_f`. */
export function portraitIdFor(race: Race, archetype: string, sex: Sex): string {
  return `${race}_${archetype}_${sex}`;
}

export interface ParsedPortrait {
  race: Race;
  archetype: string;
  sex: Sex;
}

/** Zerlegt eine Portrait-ID zurück in Rasse/Archetyp/Variante, sofern sie ein bekannter Spieler-
 *  Archetyp einer bekannten Rasse ist — sonst `null` (Bestands-IDs wie `char_1`/`knight_m` oder
 *  Data-URL-Uploads). */
export function parsePortraitId(id: string | null | undefined): ParsedPortrait | null {
  if (!id) return null;
  const match = /^(human|elf|orc)_(.+)_(m|f)$/.exec(id);
  if (!match) return null;
  const race = match[1]! as Race;
  const archetype = match[2]!;
  const sex = match[3]! as Sex;
  if (!ARCHETYPES.some((a) => a.id === archetype)) return null;
  return { race, archetype, sex };
}

// Integritätsnetz: fehlt eines der 120 erwarteten Bilder (Asset noch nicht eingebunden/Tippfehler
// im ID-Schema), warnt das hier statt einer stillen Lücke im Charakter-Ersteller-Raster.
const AVAILABLE_PORTRAIT_IDS = new Set(listPortraits().map((p) => p.id));
for (const race of RACES) {
  for (const archetype of ARCHETYPES) {
    for (const sex of ["m", "f"] as const) {
      const id = portraitIdFor(race, archetype.id, sex);
      if (!AVAILABLE_PORTRAIT_IDS.has(id)) {
        console.warn(`[playerRoster] Fehlendes Portrait für ${race}/${archetype.id} (${sex}): ${id}`);
      }
    }
  }
}

// ─── Rückwärts-Kompatibilität (Datei hieß bis 27.08.2026 `humanRoster.ts`, nur Menschen) ────────
/** @deprecated Nutze `ARCHETYPES` (rassen-generisch identisch). */
export const HUMAN_ARCHETYPES = ARCHETYPES;
/** @deprecated Nutze `Archetype`. */
export type HumanArchetype = Archetype;
/** @deprecated Nutze `ParsedPortrait`. */
export type ParsedHumanPortrait = ParsedPortrait;
