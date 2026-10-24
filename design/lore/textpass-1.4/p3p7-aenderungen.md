# Textpass 1.4 · P3 (Content) und P7 · Änderungsliste EN/DE

**Stand:** 2026-10-24, Content-Dev. Geändert nur `packages/content/src/index.ts` und `packages/content/src/talents.ts` (Anzeigetexte, keine IDs, Werte oder Strukturen, kein Save-Bump). `raid-text.ts` hat keine Glossar-Treffer. Die fünf Overlays und alle Item-Beschreibungen (Flavor) sind unberührt.

## 1 Änderungen

### 1.1 P7 Namen

| ID / Feld | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `skills.slayer.name` | Monsterjäger | Slayer | Slayer | unverändert |
| `items.slayer_combat_draught.name` | Monsterjäger-Kampftrank | Slayer-Kampftrank | Slayer's Combat Draught | unverändert |
| `items.slayer_hunters_elixir.name` | Monsterjäger-Jagdelixier | Slayer-Jagdelixier | Slayer's Hunter Elixir | unverändert |
| `items.slayer_war_brew.name` | Monsterjäger-Kriegsgebräu | Slayer-Kriegsgebräu | Slayer's War Brew | unverändert |
| `categories.slayer_requirements.name` | Monsterjäger-Ausrüstung | Slayer-Ausrüstung | Slayer Requirements | unverändert |
| `ach_skill_slayer_25.name` / `.description` | Monsterjäger-Geselle / Erreiche Monsterjäger Stufe 25. | Slayer-Geselle / Erreiche Slayer Stufe 25. | Slayer Journeyman | unverändert |
| `ach_skill_slayer_50` | Monsterjäger-Veteran / … Monsterjäger Stufe 50. | Slayer-Veteran / … Slayer Stufe 50. | Slayer Veteran | unverändert |
| `ach_skill_slayer_75` | Monsterjäger-Meister / … Monsterjäger Stufe 75. | Slayer-Meister / … Slayer Stufe 75. | Slayer Master | unverändert |
| `ach_skill_slayer_90` | Monsterjäger-Legende / … Monsterjäger Stufe 90. | Slayer-Legende / … Slayer Stufe 90. | Slayer Legend | unverändert |
| `ach_skill_slayer_99` | Monsterjäger-Maximiert / … Monsterjäger Stufe 99. | Slayer-Maximiert / … Slayer Stufe 99. | Slayer Maxed | unverändert |
| `suffixes.suffix_sentinel.suffix` | des Wächters | des Hüters | of the Sentinel | unverändert |

Bei den Erfolgen wurde nur das Wort „Monsterjäger“ getauscht. „Stufe“ → „Level“ und die Partizip-Namen („…-Maximiert“) gehören zu P5.
„des Wächters“ kollidiert mit der Erzählerfigur (Glossar § 16: „der Wächter“ = the Warden). Namens-Vorschlag, im Zweifel zurückdrehen.

### 1.2 P3 Effektzeilen (talents.ts)

Alle Platzhalter `{value}` und alle Werte, Kosten, Voraussetzungen und `effect`-Felder sind unverändert. Die zweiten Sätze (Wächter-Flavor der Narbenbuch-Knoten) blieben stehen, soweit nicht anders vermerkt.

| ID / Feld | DE alt | DE neu | EN alt | EN neu |
|---|---|---|---|---|
| `slayer` (Baum) `description` | … zu dauerhaften Verbesserungen für deinen ganzen Account. | Brennas Buch der Jagd. Hier ausgegebene Slayer-Punkte werden zu bleibenden Verbesserungen für jeden deiner Durchgänge. | … permanent upgrades for your whole account. | … permanent upgrades for every run you play. |
| `slayer.tracking` | Jeder Begleiter fällt {value} häufiger. | Jeder Begleiter fällt dir {value} öfter zu. | (unverändert) Every companion drops {value} more often. | unverändert |
| `slayer.trail` | Nach {value} so vielen Versuchen wie erwartet ohne Begleiter ist der nächste Wurf garantiert. | Nach {value} so vielen Fehlwürfen wie erwartet ist der nächste Wurf auf einen Begleiter garantiert, den du noch nicht hast. | After {value} the expected number of attempts without a companion, your next roll is guaranteed. | After {value} the expected number of failed rolls for a companion you are missing, your next roll for it is guaranteed. |
| `slayer.collar` | … Dort wirkt nur der passive Effekt. | … Dort wirkt nur der Fertigkeits-Effekt, nicht die Kampf-Fähigkeit. | … Only its passive effect applies there. | … There, only the skill effect works, not the combat ability. |
| `slayer.pace` | Abgeschlossene Aufträge bringen {value} mehr Slayer-Punkte. | Abgeschlossene Slayer-Aufträge bringen {value} mehr Slayer-Punkte. | Completed tasks pay … | Completed Slayer tasks pay … |
| `slayer.spoils` | (unverändert, geprüft) | | (unverändert, geprüft) | |
| `slayer.lore` | Du verursachst {value} mehr Schaden an Monsterfamilien mit vollständigem Bestiarium. | Du verursachst {value} mehr Schaden an einer Monsterfamilie, sobald du jedes ihrer Monster mindestens einmal besiegt hast. | … to monster families whose bestiary is complete. | … to a monster family once you have defeated every monster in it at least once. |
| `prestige.keepBankStacks` | {value} Stapel … überstehen den Aschesturz, je bis zu 50 Stück. | Du wählst {value} Stapel aus Materialien oder Verbrauchsgütern, die den Aschesturz überstehen, je bis zu 50 Stück. | {value} stacks … survive the Cinderfall, up to 50 of each. | You choose {value} stacks of materials or consumables to survive the Cinderfall, up to 50 of each. |
| `prestige.keepEquipment` | Gewählte Ausrüstung übersteht den Aschesturz (Teile: {value}), sofern jedes Teil eine Anforderung ab Stufe 80 hat. | Du wählst {value} Ausrüstungsteile, die den Aschesturz überstehen, mit einer Anforderung ab Level 80. Werkzeuge und Meisterringe sind ausgenommen. | Chosen equipment survives the Cinderfall (pieces: {value}) if each piece requires level 80 or more. | You choose {value} pieces of equipment to survive the Cinderfall, each with a requirement of level 80 or more. Tools and master rings are excluded. |
| `prestige.earlyXp` | … unter Stufe 80. | … unter Level 80. | (unverändert) | |
| `prestige.chronicleRecall` | Erlebte Chronik-Kapitel 1 bis 18 lassen sich per Klick abschließen, für das halbe Gold und ohne Marken oder Gegenstände. | Die Chronik-Kapitel 1 bis 18 schließt du per Klick ab, eines nach dem anderen. Sie zahlen das halbe Gold, aber keine Marken, Gegenstände oder XP. | Chronicle chapters 1 to 18 that you have lived through can be completed with a click, for half the gold and without tokens or items. | You can complete Chronicle chapters 1 to 18 with a click, one after another. They pay half the gold, and no tokens, items or XP. |
| `prestige.masteredXp` | … bis Stufe 99 in Fertigkeiten, die du schon einmal gemeistert hast. | … bis Level 99 in Fertigkeiten, die du schon einmal auf Level 99 gebracht hast. | … in skills you have mastered before. | … in skills you have taken to level 99 before. |
| `prestige.dungeonRecall` | Dungeons aus einem früheren Durchgang stehen dir sofort offen. | Dungeons, die du schon einmal abgeschlossen hast, stehen dir sofort offen, auch wenn Aufgabe oder Zone noch gesperrt sind. Der Paragonturm ist ausgenommen. | Dungeons you cleared in an earlier run are open to you at once. | Dungeons you have cleared before are open to you at once, even if their quest or zone is still locked. The Paragon Spire is excluded. |
| `prestige.goldFind` | … aus Aktionen, Kämpfen, Dungeons und Aufgaben, aber nicht beim Verkauf. | … aus Aktionen, Kämpfen, Dungeons, Aufgaben, Jagen und der Taverne, aber nicht beim Verkauf. | … from actions, fights, dungeons and quests, but not from selling. | … from actions, fights, dungeons, quests, hunting and the tavern, but not from selling. |

Ohne Textänderung nach Prüfung: `startingGold`, `keepTools`, `maxHp`, `damage`, `pointsBoost`, `spoils`, Baumbeschreibung Narbenbuch.

## 2 Befunde: Text und Mechanik widersprachen sich (jetzt richtiggestellt)

1. **`slayer.collar`** sagte „passiver Effekt“. Platz 2 wirkt nur über den `skillEffect` (pets.ts, `secondPet`), nie über die Kampf-Fähigkeit. „Passiv“ ist im Begleiter-System ein toter Altbegriff. Neu: Fertigkeits-Effekt / Kampf-Fähigkeit, wie `companions.echo.hint`.
2. **`slayer.trail`** sagte „ohne Begleiter“. Der Zähler (`state.petPity`) läuft je fehlendem Begleiter und je Wurf-Quelle und zählt nur Fehlwürfe; die Schwelle ist `ceil(Faktor / effektive Chance)`. Neu: Fehlwürfe, je fehlendem Begleiter.
3. **`slayer.lore`** („Bestiarium vollständig“) ist in der Engine strenger: jedes erreichbare Monster der Familie (ohne `dg_`-Varianten) braucht mindestens 1 Kill (`familyBestiaryComplete`). Neu so ausformuliert.
4. **Baum Jägerkodex**: „für deinen ganzen Account“. Es gibt keinen Account; Talente überleben den Aschesturz (`talents: "keep"`). Neu: jeder Durchgang.
5. **`prestige.masteredXp`**: „gemeistert“ meint den Erfolg `ach_skill_<id>_99`, also Level 99 erreicht. Mit der Meisterschaft (Mastery-System) verwechselbar. Neu: „auf Level 99 gebracht“.
6. **`prestige.dungeonRecall`**: Quelle ist der Lebenszeit-Zähler `dungeonsCleared` (nicht nur ein früherer Durchgang) und er überstimmt Quest- und Zonen-Sperre; der Paragonturm ist ausgenommen (dungeon.ts, `isDungeonUnlocked` b2).
7. **`prestige.goldFind`** nannte vier Quellen; die Engine wirkt auch auf Jagen (hunting.ts `grantCatch`) und Taverne (tavern.ts). Nicht auf Verkauf, Erstattung, Erinnerung.
8. **`prestige.chronicleRecall`**: zahlt auch keine XP (prestigeRecallChapter); Kapitel nur der Reihe nach (Reason `locked`).
9. **`prestige.keepBankStacks` / `keepEquipment`**: die Auswahl trifft der Spieler (Standard: nach Wert bzw. Anforderung); Meisterringe und Schlüssel sind gesperrt (`isCrossSaveTransferBlocked`), Werkzeuge haben den eigenen Knoten.
10. **Level-Schwellen** geprüft und richtig: Lehrjahre unter Level 80 (`PRESTIGE_EARLY_XP_LEVEL_CAP`), Handgedächtnis unter Level 99, Erbstück ab Anforderung 80, Truhe 50 je Stapel, Erinnerung Kapitel 1 bis 18 zum halben Gold.

## 3 Weitere Befunde und offene Punkte (nichts davon geändert)

- **Affixe und Suffixe tragen im Content nur den Namen** (`prefix`/`suffix`). Es gibt keine Effektzeilen in `index.ts`; die Zeilen entstehen in der UI (`enchant.*`, `itip.*` in translations.ts) und gehören dem UI-Agenten. Die Zahl „ca. 55 Zeilen“ im Inventar bezeichnet diese Namen.
- **`affix_precise` (Präzise)** gibt Glück (`lck` 2/4/6), das in `computeStats` Krit-Chance und Krit-Schaden speist, aber weder Genauigkeit noch Präzision. Name und Wirkung passen nicht; Glossar § 14 hält Genauigkeit und Präzision als eigene Werte. Vorschlag für den Chef: Namen belassen und in der UI die Wirkung nennen, oder umbenennen.
- **Item-Flavor mit „Monsterjäger“** (P4, nicht angefasst): `chronicle_task_token`-Text (index.ts ~8486, „die Monsterjäger gegen einen frischen Auftrag eintauschen“) und der Bogen mit „Monsterjäger-Turms“ (~8532, Kanon: Slayer-Turm).
- **Weitere Glossar-Treffer in P5-Gebiet** (nicht angefasst): Erfolge „Verlies-Läufer / -Veteran / -Legende“ samt „Schließe 5 Verliese ab.“ (Dungeon-Entscheid); Erfolg „Legende des Reichs“ (EN „Legend of the Realm“, Glossar: das Reach); Tagesaufgaben mit „im Reich“, „Reichtum des Reiches“, „Items“, „ins Lager zurückkehrst“ (Lager = Erzählwort, dort erlaubt, aber `daily_m_gather_80` lieber „zurück nach New Haven“); „Auftragsanfänger“ (Aufgabe); `q_woodcutter_1` „Holzfällen-Level 5“ gegen „Stufe“-Schreibung in Erfolgen.
- **Namen, die bleiben:** „Reiches Füllhorn“ („Reiches“ = reich, kein Reach-Treffer), „Wyvernlager“ (Lager = Nest), „Lagerhaus ausrauben“ (Ortsbezeichnung), alle Schild-Gegenstände (Waffenschilde, kein Ward), „Tierbegleiter“ / „Tierfreund“ (Erfolgsnamen), Viktors Rolle „Slayer“ (schon richtig).
- **Entwicklerwörter in Namen:** keine gefunden (kein Boost, Mitigation, Slot, Kill, Item in Namen; die Treffer stehen nur in Item-Beschreibungen, P4).

## 4 Prüfung

- `pnpm --filter @hearthforge/content exec vitest run`: 18 Dateien, 483 Tests grün.
- `engine`: `talents.test.ts`, `wiring-audit.test.ts`, `content-integrity.test.ts` grün (32 Tests).
- `apps/client`: `npx tsc --noEmit` ohne Ausgabe (grün).
- Volle `pnpm test` und Balance-Sim nicht gelaufen (reine Anzeigetexte, keine Werte).
