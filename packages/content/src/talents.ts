import type { TalentTreeDef } from "@hearthforge/shared";

/**
 * claude:2026-10-18T00:30:00+02:00 — Talentbäume (1.3.0 Säule 0, Chef 17.10.2026).
 *
 * Eigene Content-Datei, damit weitere Bäume ohne Eingriff in `index.ts` dazukommen (dort nur
 * `talentTrees: TALENT_TREES`). en+de stehen hier, die übrigen fünf Sprachen als Overlay unter
 * `locales/<lang>.ts` (Schlüssel `talentTrees:<baum>:…`, `talentBranches:<baum>.<ast>:name`,
 * `talentNodes:<baum>.<knoten>:…`, s. locales/apply.ts). `{value}` in Beschreibungen ersetzt die UI
 * durch den formatierten Rangwert (TALENT_EFFECT_FORMAT).
 *
 * Werte und Kosten: Chef 17.10. (design/1.3.0-goal.md Säule 0). Fährtenkunde gesamt 40.000 Punkte.
 */
// claude:2026-10-18T01:20:00+02:00 — Kosten ÷8 (Chef-Ziel: Rang 1 an wenigen Abenden, voller Baum ~200 h bei ~75 Punkten/h auf Etage 6–8; vorher ~1.200 h).
export const TALENT_TREES: TalentTreeDef[] = [
  {
    id: "slayer",
    name: { en: "Slayer's Book", de: "Jagdbuch" },
    description: {
      en: "Brenna's ledger of the hunt. Slayer points spent here become permanent upgrades for your whole account.",
      de: "Brennas Buch der Jagd. Slayer-Punkte werden hier zu dauerhaften Verbesserungen für deinen ganzen Account.",
    },
    unlock: { skill: "slayer", level: 85 },
    currency: "slayerPoints",
    branches: [
      { id: "companions", name: { en: "Companions", de: "Begleiter" } },
      { id: "hunt", name: { en: "The Hunt", de: "Jagd" } },
      { id: "lore", name: { en: "Lore", de: "Wissen" } },
    ],
    nodes: [
      {
        id: "tracking",
        name: { en: "Tracking", de: "Fährtenkunde" },
        description: {
          en: "Every companion drops {value} more often.",
          de: "Jeder Begleiter fällt {value} häufiger.",
        },
        branch: "companions",
        row: 0,
        maxRank: 5,
        costPerRank: [250, 500, 900, 1400, 2000],
        effect: { kind: "petChanceMult", perRank: [0.2, 0.4, 0.6, 0.8, 1.0] },
      },
      {
        id: "trail",
        name: { en: "On the Trail", de: "Spur aufgenommen" },
        description: {
          en: "After {value} the expected number of attempts without a companion, your next roll is guaranteed.",
          de: "Nach {value} so vielen Versuchen wie erwartet ohne Begleiter ist der nächste Wurf garantiert.",
        },
        branch: "companions",
        row: 1,
        maxRank: 1,
        costPerRank: [650],
        requires: [{ node: "tracking", rank: 1 }],
        effect: { kind: "petPity", perRank: [2] },
      },
      {
        id: "collar",
        name: { en: "Second Collar", de: "Zweites Halsband" },
        description: {
          en: "Unlocks a second companion slot. Only its passive effect applies there.",
          de: "Schaltet einen zweiten Begleiter-Platz frei. Dort wirkt nur der passive Effekt.",
        },
        branch: "companions",
        row: 2,
        maxRank: 1,
        costPerRank: [3000],
        requires: [{ node: "tracking", rank: 5 }],
        effect: { kind: "secondPetSlot", perRank: [1] },
      },
      {
        id: "pace",
        name: { en: "Hunting Pace", de: "Jagdtempo" },
        description: {
          en: "Completed tasks pay {value} more Slayer points.",
          de: "Abgeschlossene Aufträge bringen {value} mehr Slayer-Punkte.",
        },
        branch: "hunt",
        row: 0,
        maxRank: 3,
        costPerRank: [250, 500, 900],
        effect: { kind: "slayerPointsMult", perRank: [0.1, 0.2, 0.3] },
      },
      {
        id: "spoils",
        name: { en: "Spoils", de: "Beute" },
        description: {
          en: "Rare drops (1/500 or rarer) from your current task monster are {value} more likely.",
          de: "Seltene Drops (1/500 oder seltener) vom Monster deines Auftrags sind {value} wahrscheinlicher.",
        },
        branch: "hunt",
        row: 1,
        maxRank: 3,
        costPerRank: [400, 750, 1250],
        effect: { kind: "slayerTaskRareMult", perRank: [0.1, 0.2, 0.3] },
      },
      {
        id: "lore",
        name: { en: "Hunter's Lore", de: "Jägerwissen" },
        description: {
          en: "You deal {value} more damage to monster families whose bestiary is complete.",
          de: "Du verursachst {value} mehr Schaden an Monsterfamilien mit vollständigem Bestiarium.",
        },
        branch: "lore",
        row: 0,
        maxRank: 3,
        costPerRank: [400, 750, 1250],
        effect: { kind: "familyDamage", perRank: [0.02, 0.04, 0.06] },
      },
    ],
  },
];
