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
 * Zweiter Baum (claude:2026-10-18T12:00:00+02:00): das Narbenbuch (Prestige, Baum-ID `prestige`), unten.
 */
// claude:2026-10-18T01:20:00+02:00 — Kosten ÷8 (Chef-Ziel: Rang 1 an wenigen Abenden, voller Baum ~200 h bei ~75 Punkten/h auf Etage 6–8; vorher ~1.200 h).
export const TALENT_TREES: TalentTreeDef[] = [
  {
    id: "slayer",
    // claude:2026-10-17T21:30:00+02:00 — Chef 17.10.: DE „Jägerkodex“ statt „Jagdbuch“ (kollidierte mit dem Jagdbuch des
    // Jagen-Skills). Andere Sprachen unterschieden beide Bücher schon.
    name: { en: "Slayer's Book", de: "Jägerkodex" },
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
  // ─────────────────────────────────────────────────────────────────────────
  // claude:2026-10-18T12:00:00+02:00 — Das Narbenbuch (Prestige „Der Aschesturz", Welle B2, Chef 18.10.2026).
  // Interne IDs neutral (Baum `prestige`, Währung `prestigePoints`); Knoten-IDs, Zeilen, Kosten, Werte und
  // Voraussetzungen exakt nach design/1.3-prestige-balance.md § 5, OHNE `queueSlot` (Rabenvorrat gestrichen,
  // Chef 18.10. Punkt 5). Namen und Flavor aus design/lore/prestige-namen-1.3.md § 5 (Set C); „Handgedächtnis"
  // ist Chef-Name (18.10. Punkt 2), EN „Second Nature" (Chef 18.10., lore § 9.1). Summe 489 Narben (Balance 504 − 15).
  // Freischaltung: mindestens ein Aufstieg (Narben gibt es ohnehin nur aus dem Aschesturz).
  {
    id: "prestige",
    name: { en: "The Book of Scars", de: "Das Narbenbuch" },
    description: {
      en: "The Warden's record of every Cinderfall. Scars earned at the Shard Altar become lasting gifts for every run that follows.",
      de: "Das Buch des Wächters über jeden Aschesturz. Narben vom Scherbenaltar werden hier zu bleibenden Gaben für jeden weiteren Durchgang.",
    },
    unlock: { prestigeCount: 1 },
    currency: "prestigePoints",
    branches: [
      { id: "legacy", name: { en: "What Remains", de: "Was bleibt" } },
      { id: "haste", name: { en: "The Short Road", de: "Der kurze Weg" } },
      { id: "might", name: { en: "Marked", de: "Gezeichnet" } },
      { id: "crown", name: { en: "Keystone", de: "Schlussstein" } },
    ],
    nodes: [
      {
        id: "startingGold",
        name: { en: "Grave Coins", de: "Grabmünzen" },
        description: {
          en: "You begin every new run with {value} gold. The dead are given coins for the road. You are not dead, but the coins do no harm.",
          de: "Du beginnst jeden neuen Durchgang mit {value} Gold. Man gibt den Toten Münzen mit. Du bist nicht tot, aber die Münzen stören nicht.",
        },
        branch: "legacy",
        row: 0,
        maxRank: 3,
        costPerRank: [4, 6, 8],
        effect: { kind: "prestigeStartingGold", perRank: [2500, 7500, 20000] },
      },
      {
        id: "keepTools",
        name: { en: "Calluses", de: "Schwielen" },
        description: {
          en: "All your tools survive the Cinderfall and wait in your bank. Hands do not forget their tools.",
          de: "Alle deine Werkzeuge überstehen den Aschesturz und warten in der Bank. Die Hände vergessen ihr Werkzeug nicht.",
        },
        branch: "legacy",
        row: 1,
        maxRank: 1,
        costPerRank: [8],
        requires: [{ node: "startingGold", rank: 1 }],
        effect: { kind: "prestigeKeepTools", perRank: [1] },
      },
      {
        id: "keepBankStacks",
        name: { en: "Buried Chest", de: "Vergrabene Truhe" },
        description: {
          en: "{value} stacks of materials or consumables survive the Cinderfall, up to 50 of each. What was buried never saw the fire.",
          de: "{value} Stapel aus Materialien oder Verbrauchsgütern überstehen den Aschesturz, je bis zu 50 Stück. Was vergraben war, hat kein Feuer gesehen.",
        },
        branch: "legacy",
        row: 2,
        maxRank: 3,
        costPerRank: [10, 16, 24],
        requires: [{ node: "keepTools", rank: 1 }],
        effect: { kind: "prestigeKeepBankStacks", perRank: [5, 10, 15] },
      },
      {
        id: "keepEquipment",
        name: { en: "Heirloom", de: "Erbstück" },
        description: {
          en: "Chosen equipment survives the Cinderfall (pieces: {value}) if each piece requires level 80 or more. A piece the ash does not get.",
          de: "Gewählte Ausrüstung übersteht den Aschesturz (Teile: {value}), sofern jedes Teil eine Anforderung ab Stufe 80 hat. Ein Stück, das die Asche nicht bekommt.",
        },
        branch: "legacy",
        row: 3,
        maxRank: 3,
        costPerRank: [14, 22, 32],
        requires: [{ node: "keepBankStacks", rank: 1 }],
        effect: { kind: "prestigeKeepEquipment", perRank: [1, 2, 3] },
      },
      {
        id: "earlyXp",
        name: { en: "Apprentice Years", de: "Lehrjahre" },
        description: {
          en: "{value} more skill XP below level 80. What you have learned once, you learn faster the second time.",
          de: "{value} mehr Fertigkeits-XP unter Stufe 80. Was man einmal gelernt hat, lernt man schneller noch einmal.",
        },
        branch: "haste",
        row: 0,
        maxRank: 5,
        costPerRank: [4, 6, 8, 10, 14],
        effect: { kind: "prestigeEarlyXp", perRank: [0.1, 0.2, 0.3, 0.4, 0.5] },
      },
      {
        id: "chronicleRecall",
        name: { en: "Familiar Pages", de: "Bekannte Seiten" },
        description: {
          en: "Chronicle chapters 1 to 18 that you have lived through can be completed with a click, for half the gold and without tokens or items. The Chronicle will not read you a chapter you have already lived.",
          de: "Erlebte Chronik-Kapitel 1 bis 18 lassen sich per Klick abschließen, für das halbe Gold und ohne Marken oder Gegenstände. Kapitel, die du gelebt hast, liest die Chronik dir nicht zweimal vor.",
        },
        branch: "haste",
        row: 1,
        maxRank: 1,
        costPerRank: [10],
        requires: [{ node: "earlyXp", rank: 1 }],
        effect: { kind: "prestigeChronicleRecall", perRank: [1] },
      },
      {
        id: "masteredXp",
        name: { en: "Second Nature", de: "Handgedächtnis" }, // claude:2026-10-18T11:00:00+02:00 — Chef 18.10.: EN „Second Nature“ (lore § 9.1)
        description: {
          en: "{value} more skill XP up to level 99 in skills you have mastered before. Your hands still know where to reach.",
          de: "{value} mehr Fertigkeits-XP bis Stufe 99 in Fertigkeiten, die du schon einmal gemeistert hast. Die Hände wissen noch, wohin sie greifen.",
        },
        branch: "haste",
        row: 1,
        maxRank: 3,
        costPerRank: [15, 30, 45],
        requires: [{ node: "earlyXp", rank: 1 }],
        effect: { kind: "prestigeMasteredXp", perRank: [0.5, 0.75, 1.0] },
      },
      {
        id: "dungeonRecall",
        name: { en: "Old Paths", de: "Alte Pfade" },
        description: {
          en: "Dungeons you cleared in an earlier run are open to you at once. Gates you have cleared once know you.",
          de: "Dungeons aus einem früheren Durchgang stehen dir sofort offen. Tore, die du einmal geräumt hast, kennen dich.",
        },
        branch: "haste",
        row: 2,
        maxRank: 1,
        costPerRank: [8],
        requires: [{ node: "chronicleRecall", rank: 1 }],
        effect: { kind: "prestigeDungeonRecall", perRank: [1] },
      },
      {
        id: "maxHp",
        name: { en: "Scar Tissue", de: "Narbengewebe" },
        description: {
          en: "{value} more maximum health. Scar tissue does not tear so easily.",
          de: "{value} mehr maximales Leben. Narbengewebe reißt nicht so leicht.",
        },
        branch: "might",
        row: 0,
        maxRank: 5,
        costPerRank: [6, 9, 12, 15, 18],
        effect: { kind: "maxHpPct", perRank: [0.01, 0.02, 0.03, 0.04, 0.05] },
      },
      {
        id: "damage",
        name: { en: "Scarred Fist", de: "Narbenfaust" },
        description: {
          en: "You deal {value} more damage. Knuckles that have broken once do not break again.",
          de: "Du verursachst {value} mehr Schaden. Knöchel, die schon einmal gebrochen waren, brechen nicht mehr.",
        },
        branch: "might",
        row: 0,
        maxRank: 5,
        costPerRank: [6, 9, 12, 15, 18],
        effect: { kind: "damagePct", perRank: [0.01, 0.02, 0.03, 0.04, 0.05] },
      },
      {
        id: "goldFind",
        name: { en: "Magpie's Eye", de: "Elsternauge" },
        description: {
          en: "{value} more gold from actions, fights, dungeons and quests, but not from selling. You gather what belonged to the idols, the way magpies gather silver.",
          de: "{value} mehr Gold aus Aktionen, Kämpfen, Dungeons und Aufgaben, aber nicht beim Verkauf. Du sammelst, was den Götzen gehörte, wie Elstern Silber sammeln.",
        },
        branch: "might",
        row: 1,
        maxRank: 1,
        costPerRank: [15],
        requires: [{ node: "damage", rank: 2 }],
        effect: { kind: "goldFindPct", perRank: [0.05] },
      },
      {
        id: "pointsBoost",
        name: { en: "The Deeper Cut", de: "Der tiefere Schnitt" },
        description: {
          en: "Every future Cinderfall grants {value} more scars. The next fall cuts deeper and leaves more behind.",
          de: "Jeder künftige Aschesturz bringt {value} mehr Narben. Der nächste Sturz schneidet tiefer und lässt mehr zurück.",
        },
        branch: "crown",
        row: 0,
        maxRank: 1,
        costPerRank: [60],
        requires: [
          { node: "earlyXp", rank: 3 },
          { node: "keepEquipment", rank: 1 },
          { node: "damage", rank: 3 },
        ],
        effect: { kind: "prestigePointsMult", perRank: [0.25] },
      },
    ],
  },
];
