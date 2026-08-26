/**
 * Human-Archetypen-Roster (Chef+Mira-Auftrag 26.08.2026): 15 Kampfklassen + 15 Berufe, je männlich
 * und weiblich = 60 Porträts (`assets/portraits/human_<id>_<m|f>.webp`). Identitäten/Zuordnung sind
 * gesperrt in `CODEX/work/2026-08-26-human-roster/ROSTER.md` (Chef+Mira) — dieses Modul spiegelt nur
 * IDs/Gruppen/i18n-Schlüssel, keine Bildbeschreibungen.
 *
 * `character.portrait` bleibt die einzige gespeicherte Kennung (String-ID wie bisher) — Rasse/
 * Archetyp/Variante werden bei Bedarf aus der ID abgeleitet (`parsePortraitId`), kein neues
 * Save-Feld, kein SAVE_VERSION-Bump.
 */
import { listPortraits } from "./portraits";

export type ArchetypeGroup = "combat" | "profession";
export type Sex = "m" | "f";

export interface HumanArchetype {
  id: string;
  group: ArchetypeGroup;
  /** i18n-Schlüssel des Anzeigenamens (`archetype.<id>`, translations.ts + locales/*). */
  nameKey: string;
}

// Reihenfolge = ROSTER.md-Tabellenreihenfolge (Kampfklassen zuerst, dann Berufe).
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

export const HUMAN_ARCHETYPES: HumanArchetype[] = [
  ...COMBAT_IDS.map((id): HumanArchetype => ({ id, group: "combat", nameKey: `archetype.${id}` })),
  ...PROFESSION_IDS.map((id): HumanArchetype => ({ id, group: "profession", nameKey: `archetype.${id}` })),
];

/** Portrait-ID für einen Archetyp + Variante, z.B. `portraitIdFor("warrior", "m")` → `human_warrior_m`. */
export function portraitIdFor(archetype: string, sex: Sex): string {
  return `human_${archetype}_${sex}`;
}

export interface ParsedHumanPortrait {
  race: "human";
  archetype: string;
  sex: Sex;
}

/** Zerlegt eine Portrait-ID zurück in Rasse/Archetyp/Variante, sofern sie ein bekannter Human-
 *  Archetyp ist — sonst `null` (Bestands-IDs wie `char_1`/`knight_m` oder Data-URL-Uploads). */
export function parsePortraitId(id: string | null | undefined): ParsedHumanPortrait | null {
  if (!id) return null;
  const match = /^human_(.+)_(m|f)$/.exec(id);
  if (!match) return null;
  const archetype = match[1]!;
  const sex = match[2]! as Sex;
  if (!HUMAN_ARCHETYPES.some((a) => a.id === archetype)) return null;
  return { race: "human", archetype, sex };
}

// Integritätsnetz: fehlt eines der 60 erwarteten Bilder (Asset noch nicht eingebunden/Tippfehler
// im ID-Schema), warnt das hier statt einer stillen Lücke im Charakter-Ersteller-Raster.
const AVAILABLE_PORTRAIT_IDS = new Set(listPortraits().map((p) => p.id));
for (const archetype of HUMAN_ARCHETYPES) {
  for (const sex of ["m", "f"] as const) {
    const id = portraitIdFor(archetype.id, sex);
    if (!AVAILABLE_PORTRAIT_IDS.has(id)) {
      console.warn(`[humanRoster] Fehlendes Portrait für Archetyp "${archetype.id}" (${sex}): ${id}`);
    }
  }
}
