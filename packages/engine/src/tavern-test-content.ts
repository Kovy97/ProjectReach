import type { CampBuildingDef, ContentDB, ItemDef, TavernGuestDef, TavernTaskTemplateDef } from "@hearthforge/shared";
import { CAMP_TAVERN_ID } from "@hearthforge/shared";
import { content } from "@hearthforge/content";

/**
 * Mini-Content der Taverne für die Engine-Tests (NICHT in index.ts exportieren — reine
 * Test-Infrastruktur, Muster test-helpers.ts). content-dev liefert Gäste/Vorlagen/Gebäude/Behälter
 * parallel; damit die Engine-Tests nicht an seiner Lieferung hängen, wird hier auf dem ECHTEN
 * Katalog (Aktionen, Monster, Items, Zonen) ein eigener Gäste-/Vorlagen-Satz nach
 * taverne-spec-technik.md §1/§3/§7 aufgesetzt. IDs folgen der Spec (halvard … ashka), damit ein
 * späteres Vault-Fixture auch gegen den echten Content lädt.
 */

const L = (en: string, de: string) => ({ en, de });

export const TEST_TAVERN_BUILDING: CampBuildingDef = {
  id: CAMP_TAVERN_ID,
  name: L("The Tavern", "Die Taverne"),
  levels: [
    { gold: 1_500, items: [{ itemId: "oak_log", qty: 100 }], buildMs: 900_000, boost: { kind: "tavernPerks", value: 1 } },
    { gold: 7_500, items: [{ itemId: "ironbark_log", qty: 60 }, { itemId: "timber_brace", qty: 8 }], buildMs: 28_800_000, boost: { kind: "tavernPerks", value: 1 } },
    { gold: 30_000, items: [{ itemId: "shadowpine_log", qty: 80 }, { itemId: "bloodiron_bar", qty: 12 }, { itemId: "timber_anchor", qty: 20 }], buildMs: 86_400_000, boost: { kind: "tavernPerks", value: 1 } },
  ],
};

export const TEST_CRATE_IDS = ["black_market_crate_i", "black_market_crate_ii", "black_market_crate_iii", "black_market_crate_iv", "black_market_crate_v"] as const;

export function testCrateItems(): Record<string, ItemDef> {
  const out: Record<string, ItemDef> = {};
  TEST_CRATE_IDS.forEach((id, i) => {
    out[id] = {
      id,
      name: L(`Black Market Crate ${i + 1}`, `Schwarzmarktbehälter ${i + 1}`),
      type: "consumable",
      stackable: true,
      value: 0,
      consumable: { kind: "blackMarketCrate", tier: i + 1 },
    };
  });
  return out;
}

const guest = (
  id: string,
  skill: string | null,
  opts: Partial<TavernGuestDef> = {},
): TavernGuestDef => ({
  id,
  name: L(id, id),
  race: "human",
  sex: "m",
  role: L(skill ?? "wanderer", skill ?? "Wanderer"),
  skill,
  givesTasks: true,
  greeting: L("...", "..."),
  rarity: "daily",
  ...opts,
});

export const TEST_TAVERN_GUESTS: TavernGuestDef[] = [
  guest("halvard", null, { givesTasks: false }),
  guest("viktor", "slayer"),
  guest("grumm", "mining"),
  guest("brakka", "woodcutting"),
  guest("nessa", "fishing"),
  guest("tamsin", "foraging"),
  guest("ilvara", "cooking"),
  guest("odo", "smithing"),
  guest("merrit", "smithing"),
  guest("kell", "leatherworking"),
  guest("pim", "thieving"),
  guest("sefra", "herblore"),
  guest("orin", "runecrafting"),
  guest("wenna", "jewelcrafting"),
  guest("stranger", null, { rarity: "rare" }),
  guest("ashka", null, { rarity: "rare" }),
];

const tpl = (
  id: string,
  guestId: string,
  kind: TavernTaskTemplateDef["kind"],
  select: TavernTaskTemplateDef["select"],
  minutes: readonly number[],
  extra: Partial<TavernTaskTemplateDef> = {},
): TavernTaskTemplateDef => ({
  id,
  guestId,
  kind,
  select,
  minutes,
  line: L(`${guestId}: {count} {target}`, `${guestId}: {count} {target}`),
  ...extra,
});

const DELIVER = [6, 8, 10, 12, 15] as const;
const PRODUCE = [8, 10, 12, 15, 18] as const;
const RUN = [6, 8, 10, 12, 15] as const;

export const TEST_TAVERN_TASKS: TavernTaskTemplateDef[] = [
  tpl("viktor_kill", "viktor", "kill", { zoneBand: true }, DELIVER),
  tpl("viktor_dungeon", "viktor", "dungeon", {}, DELIVER, { minBand: 3 }),
  tpl("viktor_champion", "viktor", "champion", {}, DELIVER, { minBand: 4 }),
  tpl("grumm_deliver", "grumm", "deliver", { skill: "mining" }, DELIVER),
  tpl("grumm_produce", "grumm", "produce", { skill: "mining" }, PRODUCE),
  tpl("brakka_deliver", "brakka", "deliver", { skill: "woodcutting", hasInputs: false }, DELIVER),
  tpl("nessa_deliver", "nessa", "deliver", { skill: "fishing" }, DELIVER),
  tpl("nessa_produce", "nessa", "produce", { skill: "fishing" }, PRODUCE),
  tpl("tamsin_deliver", "tamsin", "deliver", { skill: "foraging" }, DELIVER),
  tpl("ilvara_produce", "ilvara", "produce", { skill: "cooking", hasInputs: true }, PRODUCE),
  tpl("odo_produce", "odo", "produce", { skill: "smithing", hasInputs: true, itemType: "material" }, PRODUCE),
  tpl("merrit_produce", "merrit", "produce", { skill: "smithing", itemType: "equipment" }, PRODUCE, { minBand: 2 }),
  tpl("kell_produce", "kell", "produce", { skill: "leatherworking", hasInputs: true }, PRODUCE),
  tpl("pim_run", "pim", "run", { skill: "thieving" }, RUN),
  tpl("sefra_produce", "sefra", "produce", { skill: "herblore" }, PRODUCE),
  tpl("orin_produce", "orin", "produce", { skill: "runecrafting" }, PRODUCE),
  tpl("wenna_produce", "wenna", "produce", { skill: "jewelcrafting" }, PRODUCE),
  tpl("stranger_assortment", "stranger", "assortment", {}, DELIVER),
  tpl("stranger_kill", "stranger", "kill", { zoneBand: true }, DELIVER),
  tpl("ashka_assortment", "ashka", "assortment", {}, DELIVER),
];

/** Echter Katalog + Tavernen-Mini-Content (Gäste, Vorlagen, Gebäude, Behälter). */
export function tavernTestContent(overrides: Partial<ContentDB> = {}): ContentDB {
  return {
    ...content,
    items: { ...content.items, ...testCrateItems() },
    campBuildings: [...(content.campBuildings ?? []).filter((b) => b.id !== CAMP_TAVERN_ID), TEST_TAVERN_BUILDING],
    tavernGuests: TEST_TAVERN_GUESTS,
    tavernTasks: TEST_TAVERN_TASKS,
    ...overrides,
  };
}
