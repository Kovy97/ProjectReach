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
// claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2 (Chef-Freigabe 25.10., Spieler-Feedback 322 h/Slayer 99: „viel zu langsam“): Jägerkodex-Kosten
// nochmals halbiert, Summe 15.150 → 7.575 Punkte (Fährtenkunde 2.525 + Spur 325 + Halsband 1.500 + Jagdtempo 825 + Beute 1.200 + Wissen 1.200).
// Bereits gekaufte Ränge erstattet die Migration 95→96 einmalig (persistence `SLAYER_TALENT_COSTS_V95`/`SLAYER_TALENT_COSTS_V96`). Das Narbenbuch bleibt unverändert.
// claude:2026-10-30T18:39:00+01:00 — 1.4.2: Narbenbuch neu (Spec § 3, unten); beide Bäume tragen jetzt `flavor` (Erzählsatz) neben der reinen Wirkung.
export const TALENT_TREES: TalentTreeDef[] = [
  {
    id: "slayer",
    // claude:2026-10-17T21:30:00+02:00 — Chef 17.10.: DE „Jägerkodex“ statt „Jagdbuch“ (kollidierte mit dem Jagdbuch des
    // Jagen-Skills). Andere Sprachen unterschieden beide Bücher schon.
    name: { en: "Slayer's Book", de: "Jägerkodex" },
    description: {
      // claude:2026-10-24T18:42:00+02:00 Textpass P3/P7 (Glossar 24.10.)
      en: "Brenna's ledger of the hunt. Slayer points spent here become permanent upgrades for every run you play.",
      de: "Brennas Buch der Jagd. Hier ausgegebene Slayer-Punkte werden zu bleibenden Verbesserungen für jeden deiner Durchgänge.",
    },
    unlock: { skill: "slayer", level: 85 },
    currency: "slayerPoints",
    branches: [
      { id: "companions", name: { en: "Companions", de: "Begleiter" } },
      { id: "hunt", name: { en: "The Hunt", de: "Jagd" } },
      { id: "lore", name: { en: "Lore", de: "Wissen" } },
    ],
    nodes: [
      // claude:2026-10-24T18:42:00+02:00 Textpass P3/P7 (Glossar 24.10.) (Jägerkodex-Knoten: Wirkung gegen pets.ts/slayer.ts/combat.ts geprüft)
      {
        id: "tracking",
        name: { en: "Tracking", de: "Fährtenkunde" },
        description: {
          en: "Every companion drops {value} more often.",
          de: "Jeder Begleiter fällt dir {value} öfter zu.",
        },
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (Spec § 3): Erzählsatz getrennt von der Wirkung
        flavor: {
          en: "Brenna reads a trail the way others read a letter.",
          de: "Brenna liest eine Fährte wie andere einen Brief.",
        },
        branch: "companions",
        row: 0,
        maxRank: 5,
        costPerRank: [125, 250, 450, 700, 1000], // claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2 halbiert (war 250/500/900/1400/2000)
        effect: { kind: "petChanceMult", perRank: [0.2, 0.4, 0.6, 0.8, 1.0] },
      },
      {
        id: "trail",
        name: { en: "On the Trail", de: "Spur aufgenommen" },
        description: {
          en: "After {value} the expected number of failed rolls for a companion you are missing, your next roll for it is guaranteed.",
          de: "Nach {value} so vielen Fehlwürfen wie erwartet ist der nächste Wurf auf einen Begleiter garantiert, den du noch nicht hast.",
        },
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (Spec § 3): Erzählsatz getrennt von der Wirkung
        flavor: {
          en: "Bad luck runs out eventually. Patience does not.",
          de: "Das Pech geht irgendwann aus. Die Geduld nicht.",
        },
        branch: "companions",
        row: 1,
        maxRank: 1,
        costPerRank: [325], // claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2 halbiert (war 650)
        requires: [{ node: "tracking", rank: 1 }],
        effect: { kind: "petPity", perRank: [2] },
      },
      {
        id: "collar",
        name: { en: "Second Collar", de: "Zweites Halsband" },
        description: {
          en: "Unlocks a second companion slot. There, only the skill effect works, not the combat ability.",
          de: "Schaltet einen zweiten Begleiter-Platz frei. Dort wirkt nur der Fertigkeits-Effekt, nicht die Kampf-Fähigkeit.",
        },
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (Spec § 3): Erzählsatz getrennt von der Wirkung
        flavor: {
          en: "One more collar on the hook by the door.",
          de: "Ein Halsband mehr am Haken neben der Tür.",
        },
        branch: "companions",
        row: 2,
        maxRank: 1,
        costPerRank: [1500], // claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2 halbiert (war 3000)
        requires: [{ node: "tracking", rank: 5 }],
        effect: { kind: "secondPetSlot", perRank: [1] },
      },
      {
        id: "pace",
        name: { en: "Hunting Pace", de: "Jagdtempo" },
        description: {
          en: "Completed Slayer tasks pay {value} more Slayer points.",
          de: "Abgeschlossene Slayer-Aufträge bringen {value} mehr Slayer-Punkte.",
        },
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (Spec § 3): Erzählsatz getrennt von der Wirkung
        flavor: {
          en: "Brenna pays by the head, and she counts quickly.",
          de: "Brenna zahlt pro Kopf, und sie zählt schnell.",
        },
        branch: "hunt",
        row: 0,
        maxRank: 3,
        costPerRank: [125, 250, 450], // claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2 halbiert (war 250/500/900)
        effect: { kind: "slayerPointsMult", perRank: [0.1, 0.2, 0.3] },
      },
      {
        id: "spoils",
        name: { en: "Spoils", de: "Beute" },
        description: {
          en: "Rare drops (1/500 or rarer) from your current task monster are {value} more likely.",
          de: "Seltene Drops (1/500 oder seltener) vom Monster deines Auftrags sind {value} wahrscheinlicher.",
        },
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (Spec § 3): Erzählsatz getrennt von der Wirkung
        flavor: {
          en: "The beast you are sent after always carries something worth the trip.",
          de: "Das Tier, auf das man dich ansetzt, trägt immer etwas bei sich, das den Weg lohnt.",
        },
        branch: "hunt",
        row: 1,
        maxRank: 3,
        costPerRank: [200, 375, 625], // claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2 halbiert (war 400/750/1250)
        effect: { kind: "slayerTaskRareMult", perRank: [0.1, 0.2, 0.3] },
      },
      {
        id: "lore",
        name: { en: "Hunter's Lore", de: "Jägerwissen" },
        description: {
          en: "You deal {value} more damage to a monster family once you have defeated every monster in it at least once.",
          de: "Du verursachst {value} mehr Schaden an einer Monsterfamilie, sobald du jedes ihrer Monster mindestens einmal besiegt hast.",
        },
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (Spec § 3): Erzählsatz getrennt von der Wirkung
        flavor: {
          en: "Once you have killed every kind, you know where each of them breaks.",
          de: "Wer jede Art einmal erlegt hat, weiß, wo jede von ihnen bricht.",
        },
        branch: "lore",
        row: 0,
        maxRank: 3,
        costPerRank: [200, 375, 625], // claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2 halbiert (war 400/750/1250)
        effect: { kind: "familyDamage", perRank: [0.02, 0.04, 0.06] },
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // claude:2026-10-18T12:00:00+02:00 — Das Narbenbuch (Prestige „Der Aschesturz", Welle B2, Chef 18.10.2026).
  // Interne IDs neutral (Baum `prestige`, Währung `prestigePoints`). Namen und Flavor aus design/lore/prestige-namen-1.3.md
  // § 5 (Set C); „Handgedächtnis" ist Chef-Name (18.10. Punkt 2), EN „Second Nature" (Chef 18.10., lore § 9.1).
  // Freischaltung: mindestens ein Aufstieg (Narben gibt es ohnehin nur aus dem Aschesturz).
  //
  // claude:2026-10-30T18:39:00+01:00 — 1.4.2 „Aschesturz 2.0“ (Chef-Freigabe 30.10.2026, design/1.4.2-aschesturz-spec.md § 3):
  // fünf Äste mit genau einem Knoten je `row` (strenges Raster), zwölf neue Knoten und der Ast `watch`, Werte/Kosten/Ränge
  // der zwölf alten Knoten angehoben, kein „Glutkern“ (E4 abgelehnt). Summe 1.217 Narben (vorher 489). Kosten bereits
  // gekaufter Ränge werden nie nachgefordert. Beschreibung = nur die Wirkung (ein Satz, `{value}`), der Erzählsatz steht in
  // `flavor`. Knoten in Ast-Reihenfolge, je Ast nach `row`.
  {
    id: "prestige",
    // claude:2026-10-24T18:42:00+02:00 Textpass P3/P7 (Glossar 24.10.) (Narbenbuch-Knoten: Wirkung gegen prestige-effects.ts/prestige.ts geprüft)
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
      { id: "watch", name: { en: "The Long Watch", de: "Die lange Wacht" } }, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu
      { id: "crown", name: { en: "Keystone", de: "Schlussstein" } },
    ],
    nodes: [
      // ── legacy: Was bleibt ──
      {
        id: "startingGold",
        name: { en: "Grave Coins", de: "Grabmünzen" },
        description: {
          en: "You begin every new run with {value} gold.",
          de: "Du beginnst jeden neuen Durchgang mit {value} Gold.",
        },
        flavor: {
          en: "The dead are given coins for the road. You are not dead, but the coins do no harm.",
          de: "Man gibt den Toten Münzen mit. Du bist nicht tot, aber die Münzen stören nicht.",
        },
        branch: "legacy",
        row: 0,
        maxRank: 3,
        costPerRank: [4, 8, 12], // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (war 4/6/8)
        effect: { kind: "prestigeStartingGold", perRank: [25000, 100000, 400000] }, // 1.4.2 (war 2.500/7.500/20.000)
      },
      {
        id: "keepTools",
        name: { en: "Calluses", de: "Schwielen" },
        description: {
          en: "All your tools survive the Cinderfall and wait in your bank.",
          de: "Alle deine Werkzeuge überstehen den Aschesturz und warten in der Bank.",
        },
        flavor: {
          en: "Hands do not forget their tools.",
          de: "Die Hände vergessen ihr Werkzeug nicht.",
        },
        branch: "legacy",
        row: 1,
        maxRank: 1,
        costPerRank: [8],
        requires: [{ node: "startingGold", rank: 1 }],
        effect: { kind: "prestigeKeepTools", perRank: [1] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/prestige.ts ascend: autoEatTier, autoPotion, bankSlotsPurchased)
        id: "keepPurchases",
        name: { en: "Settled Accounts", de: "Bezahlte Rechnung" },
        description: {
          en: "Your Auto-Eat tier, your Auto-Buff unlock and every bank slot you bought survive the Cinderfall.",
          de: "Deine Auto-Essen-Stufe, die Auto-Buff-Freischaltung und alle gekauften Bankplätze überstehen den Aschesturz.",
        },
        flavor: {
          en: "What was paid for stays paid. Even the ash keeps its books.",
          de: "Was bezahlt ist, bleibt bezahlt. Auch die Asche führt Buch.",
        },
        branch: "legacy",
        row: 2,
        maxRank: 1,
        costPerRank: [12],
        requires: [{ node: "keepTools", rank: 1 }],
        effect: { kind: "prestigeKeepPurchases", perRank: [1] },
      },
      {
        id: "keepBankStacks",
        name: { en: "Buried Chest", de: "Vergrabene Truhe" },
        description: {
          en: "You choose {value} stacks of materials or consumables to survive the Cinderfall, up to 500 of each.",
          de: "Du wählst {value} Stapel aus Materialien oder Verbrauchsgütern, die den Aschesturz überstehen, je bis zu 500 Stück.",
        },
        flavor: {
          en: "What was buried never saw the fire.",
          de: "Was vergraben war, hat kein Feuer gesehen.",
        },
        branch: "legacy",
        row: 3, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (war 2)
        maxRank: 3,
        costPerRank: [10, 16, 24],
        requires: [{ node: "keepTools", rank: 1 }],
        effect: { kind: "prestigeKeepBankStacks", perRank: [10, 20, 30] }, // 1.4.2 (war 5/10/15, Deckel je Stapel 50 → 500)
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/prestige.ts ascend: slayerPoints, character.questTokens)
        id: "keepSlayerPoints",
        name: { en: "Unbroken Trail", de: "Ungebrochene Fährte" },
        description: {
          en: "{value} of your Slayer points and tokens survive the Cinderfall.",
          de: "{value} deiner Slayer-Punkte und Marken überstehen den Aschesturz.",
        },
        flavor: {
          en: "A trail does not go cold just because the hunter fell.",
          de: "Eine Fährte erkaltet nicht, nur weil der Jäger gefallen ist.",
        },
        branch: "legacy",
        row: 4,
        maxRank: 3,
        costPerRank: [8, 14, 20],
        requires: [{ node: "keepBankStacks", rank: 1 }],
        effect: { kind: "prestigeKeepSlayerPoints", perRank: [0.25, 0.5, 1] },
      },
      {
        id: "keepEquipment",
        name: { en: "Heirloom", de: "Erbstück" },
        description: {
          en: "You choose {value} pieces of equipment with a level 80 requirement or higher to survive the Cinderfall with their runes, never tools or master rings.",
          de: "Du wählst {value} Ausrüstungsteile ab Anforderung Level 80, die den Aschesturz samt Runen überstehen, nie Werkzeuge oder Meisterringe.",
        },
        flavor: {
          en: "A piece the ash does not get.",
          de: "Ein Stück, das die Asche nicht bekommt.",
        },
        branch: "legacy",
        row: 5, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (war 3; Voraussetzung bleibt Truhe 1)
        maxRank: 3,
        costPerRank: [14, 22, 32],
        requires: [{ node: "keepBankStacks", rank: 1 }],
        effect: { kind: "prestigeKeepEquipment", perRank: [2, 4, 6] }, // 1.4.2 (war 1/2/3)
      },
      // ── haste: Der kurze Weg ──
      {
        id: "earlyXp",
        name: { en: "Apprentice Years", de: "Lehrjahre" },
        description: {
          en: "{value} more skill XP below level 80.",
          de: "{value} mehr Fertigkeits-XP unter Level 80.",
        },
        flavor: {
          en: "What you have learned once, you learn faster the second time.",
          de: "Was man einmal gelernt hat, lernt man schneller noch einmal.",
        },
        branch: "haste",
        row: 0,
        maxRank: 5,
        costPerRank: [4, 6, 8, 10, 14],
        effect: { kind: "prestigeEarlyXp", perRank: [0.2, 0.4, 0.6, 0.8, 1.0] }, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (war 0,1–0,5)
      },
      {
        id: "chronicleRecall",
        name: { en: "Familiar Pages", de: "Bekannte Seiten" },
        description: {
          en: "You complete Chronicle chapters 1 to 18 with a click, one after another, for half the gold and no tokens, items or XP.",
          de: "Die Chronik-Kapitel 1 bis 18 schließt du per Klick ab, eines nach dem anderen, für das halbe Gold und ohne Marken, Gegenstände oder XP.",
        },
        flavor: {
          en: "The Chronicle will not read you a chapter you have already lived.",
          de: "Kapitel, die du gelebt hast, liest die Chronik dir nicht zweimal vor.",
        },
        branch: "haste",
        row: 1,
        maxRank: 1,
        costPerRank: [10],
        requires: [{ node: "earlyXp", rank: 1 }],
        effect: { kind: "prestigeChronicleRecall", perRank: [1] },
      },
      {
        id: "dungeonRecall",
        name: { en: "Old Paths", de: "Alte Pfade" },
        description: {
          en: "Dungeons you have cleared before are open to you at once, even if their quest or zone is still locked, except the Paragon Spire.",
          de: "Dungeons, die du schon einmal abgeschlossen hast, stehen dir sofort offen, auch wenn Aufgabe oder Zone noch gesperrt sind, nur der Paragonturm nicht.",
        },
        flavor: {
          en: "Gates you have cleared once know you.",
          de: "Tore, die du einmal geräumt hast, kennen dich.",
        },
        branch: "haste",
        row: 2,
        maxRank: 1,
        costPerRank: [8],
        requires: [{ node: "chronicleRecall", rank: 1 }],
        effect: { kind: "prestigeDungeonRecall", perRank: [1] },
      },
      {
        id: "masteredXp",
        name: { en: "Second Nature", de: "Handgedächtnis" }, // claude:2026-10-18T11:00:00+02:00 — Chef 18.10.: EN „Second Nature“ (lore § 9.1)
        description: {
          en: "{value} more skill XP up to level 99 in skills you have taken to level 99 before.",
          de: "{value} mehr Fertigkeits-XP bis Level 99 in Fertigkeiten, die du schon einmal auf Level 99 gebracht hast.",
        },
        flavor: {
          en: "Your hands still know where to reach.",
          de: "Die Hände wissen noch, wohin sie greifen.",
        },
        branch: "haste",
        row: 3, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (war 1)
        maxRank: 3,
        costPerRank: [15, 30, 45],
        requires: [{ node: "earlyXp", rank: 1 }],
        effect: { kind: "prestigeMasteredXp", perRank: [1, 2, 3] }, // 1.4.2 E5 (war 0,5/0,75/1,0)
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/tick.ts effectiveActionDurationMs)
        id: "actionSpeed",
        name: { en: "Practised Hand", de: "Geübte Hand" },
        description: {
          en: "Gathering, crafting and thieving actions take {value} less time.",
          de: "Aktionen beim Sammeln, im Handwerk und in der Diebeskunst dauern {value} kürzer.",
        },
        flavor: {
          en: "The second time, nobody has to show you how to hold it.",
          de: "Beim zweiten Mal muss dir keiner mehr zeigen, wie man es hält.",
        },
        branch: "haste",
        row: 4,
        maxRank: 3,
        costPerRank: [10, 20, 30],
        requires: [{ node: "earlyXp", rank: 2 }],
        effect: { kind: "actionSpeedPct", perRank: [0.04, 0.08, 0.12] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/tick.ts Meisterschafts-XP je Abschluss)
        id: "masteryXp",
        name: { en: "Mastery Embers", de: "Meisterglut" },
        description: {
          en: "{value} more mastery XP.",
          de: "{value} mehr Meisterschafts-XP.",
        },
        flavor: {
          en: "Mastery never burned with the rest. It only waited for more fuel.",
          de: "Die Meisterschaft ist nie mitverbrannt. Sie hat nur auf neue Glut gewartet.",
        },
        branch: "haste",
        row: 5,
        maxRank: 3,
        costPerRank: [8, 16, 24],
        requires: [{ node: "actionSpeed", rank: 1 }],
        effect: { kind: "masteryXpPct", perRank: [0.25, 0.5, 1.0] },
      },
      // ── might: Gezeichnet ──
      {
        id: "damage",
        name: { en: "Scarred Fist", de: "Narbenfaust" },
        description: {
          en: "You deal {value} more damage.",
          de: "Du verursachst {value} mehr Schaden.",
        },
        flavor: {
          en: "Knuckles that have broken once do not break again.",
          de: "Knöchel, die schon einmal gebrochen waren, brechen nicht mehr.",
        },
        branch: "might",
        row: 0,
        maxRank: 5,
        costPerRank: [6, 9, 12, 15, 18],
        effect: { kind: "damagePct", perRank: [0.02, 0.04, 0.06, 0.08, 0.1] }, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 E6 (war 0,01–0,05)
      },
      {
        id: "maxHp",
        name: { en: "Scar Tissue", de: "Narbengewebe" },
        description: {
          en: "{value} more maximum health.",
          de: "{value} mehr maximales Leben.",
        },
        flavor: {
          en: "Scar tissue does not tear so easily.",
          de: "Narbengewebe reißt nicht so leicht.",
        },
        branch: "might",
        row: 1, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (war 0, neben Narbenfaust)
        maxRank: 5,
        costPerRank: [6, 9, 12, 15, 18],
        effect: { kind: "maxHpPct", perRank: [0.02, 0.04, 0.06, 0.08, 0.1] }, // 1.4.2 E6 (war 0,01–0,05)
      },
      {
        id: "goldFind",
        name: { en: "Magpie's Eye", de: "Elsternauge" },
        description: {
          en: "{value} more gold from actions, fights, dungeons, quests, hunting and the tavern, but not from selling.",
          de: "{value} mehr Gold aus Aktionen, Kämpfen, Dungeons, Aufgaben, Jagen und der Taverne, aber nicht beim Verkauf.",
        },
        flavor: {
          en: "You gather what belonged to the idols, the way magpies gather silver.",
          de: "Du sammelst, was den Götzen gehörte, wie Elstern Silber sammeln.",
        },
        branch: "might",
        row: 2, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (war 1)
        maxRank: 3,
        costPerRank: [15, 20, 25], // 1.4.2 (war ein Rang zu 15)
        requires: [{ node: "damage", rank: 2 }],
        effect: { kind: "goldFindPct", perRank: [0.05, 0.1, 0.15] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/pets.ts petFoodHealMult: Auto-Essen und manueller Verzehr)
        id: "foodHeal",
        name: { en: "Emberblood", de: "Glutblut" },
        description: {
          en: "Food heals you for {value} more.",
          de: "Essen heilt dich um {value} mehr.",
        },
        flavor: {
          en: "Blood that has run through ash takes whatever warmth it is given.",
          de: "Blut, das schon durch Asche lief, nimmt jede Wärme an, die man ihm gibt.",
        },
        branch: "might",
        row: 3,
        maxRank: 3,
        costPerRank: [8, 12, 16],
        requires: [{ node: "maxHp", rank: 2 }],
        effect: { kind: "foodHealPct", perRank: [0.1, 0.2, 0.3] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/prestige-effects.ts talentRareDropMult, Muster Jägerkodex „Beute“)
        id: "rareDrop",
        name: { en: "Keen Eye", de: "Scharfer Blick" },
        description: {
          en: "Rare combat drops (1/500 or rarer) are {value} more likely.",
          de: "Seltene Kampfbeute (1/500 oder seltener) ist {value} wahrscheinlicher.",
        },
        flavor: {
          en: "You have seen the glint before. This time you know where to look.",
          de: "Du hast das Glitzern schon einmal gesehen. Diesmal weißt du, wohin du schauen musst.",
        },
        branch: "might",
        row: 4,
        maxRank: 3,
        costPerRank: [15, 25, 35],
        requires: [{ node: "goldFind", rank: 1 }],
        effect: { kind: "rareDropPct", perRank: [0.05, 0.1, 0.15] },
      },
      // ── watch: Die lange Wacht (1.4.2 neu) ──
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (shared effectiveMaxOfflineMs; Rang 4: 8 h → 16 h, mit Wachturm bis 19 h)
        id: "offlineHours",
        name: { en: "Long Night", de: "Lange Nacht" },
        description: {
          en: "Your offline time grows by {value} hours.",
          de: "Deine Offline-Zeit wächst um {value} Stunden.",
        },
        flavor: {
          en: "The fire burns low, not out. The work goes on while you are away.",
          de: "Das Feuer brennt herunter, nicht aus. Die Arbeit geht weiter, während du fort bist.",
        },
        branch: "watch",
        row: 0,
        maxRank: 4,
        costPerRank: [6, 10, 14, 20],
        effect: { kind: "offlineHours", perRank: [2, 4, 6, 8] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/orders.ts onWorkOrderActionCompleted)
        id: "workOrders",
        name: { en: "Raven Post", de: "Rabenpost" },
        description: {
          en: "Work orders arrive {value} more often.",
          de: "Arbeitsaufträge kommen {value} häufiger.",
        },
        flavor: {
          en: "The ravens have learned your name. Since then they will not leave you alone.",
          de: "Die Raben kennen jetzt deinen Namen. Seitdem lassen sie dich nicht mehr in Ruhe.",
        },
        branch: "watch",
        row: 1,
        maxRank: 2,
        costPerRank: [6, 12],
        requires: [{ node: "offlineHours", rank: 1 }],
        effect: { kind: "workOrderRatePct", perRank: [0.2, 0.4] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/hunting.ts huntTrapSlots)
        id: "huntTraps",
        name: { en: "Trapper", de: "Fallensteller" },
        description: {
          en: "The number of trap slots you can use while hunting rises by {value}.",
          de: "Die Zahl deiner Fallenplätze beim Jagen steigt um {value}.",
        },
        flavor: {
          en: "Every snare you ever set is still in your hands somewhere.",
          de: "Jede Schlinge, die du je gelegt hast, steckt noch irgendwo in deinen Händen.",
        },
        branch: "watch",
        row: 2,
        maxRank: 2,
        costPerRank: [10, 20],
        requires: [{ node: "workOrders", rank: 1 }],
        effect: { kind: "huntTrapSlots", perRank: [1, 2] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/farming.ts farmPlotsUnlocked, Obergrenze 9 → 12)
        id: "farmPlots",
        name: { en: "Seed Vault", de: "Saatkammer" },
        description: {
          en: "The number of farm plots you can use rises by {value}.",
          de: "Die Zahl deiner Beete steigt um {value}.",
        },
        flavor: {
          en: "A few seeds stayed dry through the whole fire.",
          de: "Ein paar Samen blieben durch das ganze Feuer trocken.",
        },
        branch: "watch",
        row: 3,
        maxRank: 3,
        costPerRank: [8, 14, 20],
        requires: [{ node: "huntTraps", rank: 1 }],
        effect: { kind: "farmPlotSlots", perRank: [1, 2, 3] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/camp.ts campBuildDurationMs, multiplikativ zum Schreibzelt)
        id: "campBuild",
        name: { en: "Master Builder", de: "Bauherrin" },
        description: {
          en: "Construction in New Haven takes {value} less time.",
          de: "Bauten in New Haven dauern {value} kürzer.",
        },
        flavor: {
          en: "Builders work faster for someone who has already lost everything once.",
          de: "Für jemanden, der schon einmal alles verloren hat, arbeiten die Bauleute schneller.",
        },
        branch: "watch",
        row: 4,
        maxRank: 2,
        costPerRank: [8, 16],
        requires: [{ node: "offlineHours", rank: 2 }],
        effect: { kind: "campBuildSpeedPct", perRank: [0.15, 0.3] },
      },
      // ── crown: Schlussstein ──
      {
        id: "pointsBoost",
        name: { en: "The Deeper Cut", de: "Der tiefere Schnitt" },
        description: {
          en: "Every future Cinderfall grants {value} more scars from the run itself, not from your collection.",
          de: "Jeder künftige Aschesturz bringt {value} mehr Narben aus dem Durchgang selbst, nicht aus deiner Sammlung.",
        },
        flavor: {
          en: "The next fall cuts deeper and leaves more behind.",
          de: "Der nächste Sturz schneidet tiefer und lässt mehr zurück.",
        },
        branch: "crown",
        row: 0,
        maxRank: 2, // claude:2026-10-30T18:39:00+01:00 — 1.4.2 (war ein Rang)
        costPerRank: [60, 120],
        requires: [
          { node: "earlyXp", rank: 3 },
          { node: "keepEquipment", rank: 1 },
          { node: "damage", rank: 3 },
        ],
        effect: { kind: "prestigePointsMult", perRank: [0.25, 0.5] },
      },
      {
        // claude:2026-10-30T18:39:00+01:00 — 1.4.2 neu (engine/pets.ts petEchoFactor statt PET_ECHO_FACTOR)
        id: "petEcho",
        name: { en: "Echo of Companions", de: "Echo der Gefährten" },
        description: {
          en: "Companions you have not equipped work at {value} of their skill effect instead of 25%.",
          de: "Nicht ausgerüstete Begleiter wirken mit {value} ihres Fertigkeits-Effekts statt mit 25 %.",
        },
        flavor: {
          en: "They no longer walk beside you, but they have not stopped following.",
          de: "Sie gehen nicht mehr neben dir, aber sie folgen dir noch immer.",
        },
        branch: "crown",
        row: 1,
        maxRank: 2,
        costPerRank: [40, 80],
        requires: [{ node: "pointsBoost", rank: 1 }],
        effect: { kind: "petEchoFactor", perRank: [0.35, 0.5] },
      },
    ],
  },
];
