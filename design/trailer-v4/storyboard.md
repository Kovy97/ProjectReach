# Trailer v4 „Inventar“: Feature-Trailer (Storyboard)

<!-- claude:2026-10-24T11:40:00+02:00 -->

Zweite Fassung neben „Gehalten“ (v3). Zeigt, was im Spiel steckt: große, nachprüfbare Zahlen und komponierte Tableaus aus
echter Spielgrafik und echten UI-Teilen. Weniger Kino, weniger Morphs; Kämpfe und UI dürfen vorkommen, sind aber nicht
der Schwerpunkt.

## 1 Chef-Entscheide (24.10.)

1. Musik wie v3: `Downloads/settings.mp3`, volle Länge 81,41 s (Steam verlangt mindestens 1 Minute).
2. Screens wechseln im Takt (Schlag 0,6486 s, Takt 2,594 s ab 3,97 s).
3. Texteinblendungen **englisch**.
4. Neue Sprachaufnahme durch den Chef (Text unten, Abschnitt 4).
5. UI und dynamische Kämpfe erlaubt, aber nicht im Fokus. Keine Fahrten über die GUI.
6. Ende: nur das Logo, keine Zeile, keine Version.

Bildsprache wie in v3 abgenommen: Gemälde unvergrößert und scharf, originalhell, kein Weichzeichner, aktuelles gemaltes
Logo (`ui/mainmenu_logo_painterly.webp`), Spieler-Gemälde nie spiegeln, Ausrüstung glüht nie.

## 2 Zahlen (gezählt aus `packages/content`, Branch `update-1.4.0`, 24.10.)

| Bereich | Bestand | Einblendung |
|---|---|---|
| Skills | 23 (Sammeln 7, Handwerk 8, Kampf 7, Slayer) | 23 SKILLS |
| Items | 1.377 ohne Raid-Varianten (1.439 mit) | 1,300+ ITEMS |
| Ausrüstung | 869 Teile | 850+ PIECES OF GEAR |
| Sets | 42 | 42 SETS |
| Rezepte | 789 | 750+ RECIPES |
| Monster | 120 verschiedene (148 Einträge inkl. 7 Dungeon-Doppel und 15 Raid-Gegner, teils gleichnamig) | 120 MONSTERS |
| Champions | 29 Eliten | 29 CHAMPIONS |
| Zonen / Dungeons / Raid | 11 (inkl. Götzenhalle, Jägerturm) / 9 eigenständige (14 Einträge inkl. 5 Raid-Säle) / 1 Raid mit 5 Sälen, Normal/Heroisch/Mythisch | 11 ZONES · 9 DUNGEONS · 1 RAID |
| Verzauberungen / Suffixe | 26 / 29 | 26 ENCHANTMENTS · 29 RANDOM SUFFIXES |
| Erfolge / Quests | 363 / 125 | 350+ ACHIEVEMENTS · 120+ QUESTS |
| Begleiter / Talentbäume | 23 / 2 (Slayer, Prestige) | 23 COMPANIONS · 2 TALENT TREES |
| Völker / Sprachen | 4 / 7 | 4 RACES · 7 LANGUAGES |

Korrektur 24.10.: Monster nach eindeutigen Namen, Dungeons ohne Raid-Säle gezählt (erste Zählung hatte Doppel).
Godgem Ring (`godgem_ring`) ist vom Trailer ausgeschlossen (Freistellungsrest, Chef 24.10.).

Mit „+“ gerundet (unter 100 exakt, 100–199 auf Zehner, ab 200 auf Fünfziger, ab 1.000 auf Hunderter abgerundet), damit
die Einblendung auch nach weiteren Updates stimmt. Vor dem finalen Render neu zählen: `npx tsx trailer-stage/gen-v4-data.ts`
(aus `apps/client`) schreibt `trailer-stage/src/v4/data.json`; die Einblendungen lesen nur daraus.

## 3 Ablauf (81,41 s)

| # | Zeit (s) | Musik | Einblendung | Tableau | Sprecher |
|---|---|---|---|---|---|
| 01 | 0,00–3,97 | Intro | A DARK FANTASY IDLE RPG (ab 1,8) | Glutfunke im Schwarz, dahinter wird `ui/mainmenu.webp` sichtbar | V1 |
| 02 | 3,97–9,16 | 2 Takte | 23 SKILLS · Gathering · Crafting · Combat | Mosaik der 23 Skill-Gemälde (6 × 4), je Schlag leuchtet eine Spalte; auf Takt 2 sortiert es sich in drei Spalten | V2 |
| 03 | 9,16–14,35 | 2 Takte | Skill-Name klein unten links | Je Schlag ein Sammel-/Handwerks-Bild mit Figur und Fund (Holz, Erz, Fisch, Ernte, Kräuter, Beute, Jagd, Schmied) | V3 |
| 04 | 14,35–19,53 | 2 Takte | 1,300+ ITEMS → 850+ PIECES OF GEAR · 42 SETS | Wand aus echten Item-Bildern zoomt heraus; dann je Schlag eine Seltenheitsreihe; zuletzt ein Set ausgelegt | V4 |
| 05 | 19,53–22,13 | 1 Takt | 750+ RECIPES | Ketten als Fluss: Erz → Barren → Klinge → Rune; Fisch → Gericht; Kraut → Salbe (je Schlag eine Zeile) | V5 |
| 06 | 22,13–24,72 | Atemloch | – | Fast schwarz: eine einzelne echte Item-Karte eines göttlichen Drops dreht sich ins Licht | V6 |
| 07 | 24,72–29,91 | Crash, 2 Takte | 120 MONSTERS · 29 CHAMPIONS | Bestiarium-Raster aus Monsterkarten klappt im Takt auf; drei Champions treten hervor | V7 |
| 08 | 29,91–35,10 | 2 Takte | 11 ZONES · 9 DUNGEONS | Je Schlag eine Zone, dann Raster der Dungeon-Kulissen | V8 |
| 09 | 35,10–40,29 | Crash, 2 Takte | 3 COMBAT STYLES · Melee · Ranged · Magic → 3 ARMOR TYPES (Spalten Plate/Leather/Cloth mit Mitigation/Evasion/Ward) | Dreigeteilt: Krieger/Waldläuferin/Magierin je ein kurzer Treffer; dann Rüstungs-Trinität mit Werten | V9 |
| 10 | 40,29–45,47 | 2 Takte | 26 ENCHANTMENTS · 29 RANDOM SUFFIXES | Echte Item-Karte, Zeilen für Verzauberung und Suffix erscheinen im Takt; Runen | V10 |
| 11 | 45,47–48,07 | Bass, Stille 47,4–47,9 | – | Raid-Tor (`gk_room_1`), langsamer Push, Dunkel | V11 |
| 12 | 48,07–53,26 | EPIC SWITCH | 1 RAID · 5 HALLS | Schnitte im Takt durch die Säle, kurze Kampfmomente (Saal 5 „The Heir's Throne“ fehlt noch als Bild) | V12 |
| 13 | 53,26–58,44 | 2 Takte | NORMAL · HEROIC · MYTHIC | Drei Rahmen nebeneinander, dann Raid-Beute (Sets) | V13 |
| 14 | 58,44–63,63 | 2 Takte | 350+ ACHIEVEMENTS · 125 QUESTS | Echte Erfolgs-Einblendungen regnen ins Bild, Quest-Rolle | V14 |
| 15 | 63,63–68,82 | 2 Takte, Spitze 68,5 | 23 COMPANIONS · 2 TALENT TREES · PRESTIGE | Begleiter-Reihe, Talentbaum, Prestige-Altar; bei 68,5 alles zusammen als Collage | V15 |
| 16 | 68,82–71,41 | Bruch | PROGRESS WHILE YOU'RE AWAY | Ruhig: Lagerfeuer, echte Offline-Zusammenfassung blendet ein | V16 |
| 17 | 71,41–74,50 | Finale | 4 RACES · 7 LANGUAGES | Die vier Völker als Krieger nebeneinander | V17 |
| 18 | 74,50–81,41 | Ausklang | nur das Logo (keine Zeile, keine Version) | Logo formt sich aus Glut (wie v3) | V18 |

Echte UI-Teile (Item-Karte, Erfolgs-Einblendung, Offline-Zusammenfassung, Talentbaum) werden über isolierte
Browser-Fixtures mit dem Testprofil aufgenommen, freigestellt und als Ebene ins Tableau gesetzt. Keine echten Spielstände.

## 4 Sprechertext (Wächter, englisch)

| # | Einsatz (s) | Zeile |
|---|---|---|
| V1 | 0,6 | Every legend in the Reach begins with nothing. |
| V2 | 4,4 | Twenty-three skills. Gather, craft and fight. |
| V3 | 9,6 | Fell the forest. Mine the deep. Hunt what hunts you. |
| V4 | 14,8 | Over thirteen hundred items. Forty-two sets to complete. |
| V5 | 19,8 | Ore becomes steel. Steel becomes legend. |
| V6 | 22,4 | Some treasures are rarer than others. |
| V7 | 25,2 | A hundred and twenty monsters. Twenty-nine champions. |
| V8 | 30,3 | Eleven zones. Nine dungeons. |
| V9 | 35,5 | Steel, bow or spell. Plate, leather or cloth. |
| V10 | 40,7 | Enchant it. Hunt the perfect roll. Make it yours. |
| V11 | 45,7 | And beneath the goblin hold… |
| V12 | 48,4 | Gobkha'raz waits. |
| V13 | 53,6 | Normal. Heroic. Mythic. |
| V14 | 58,9 | Over three hundred and fifty achievements to chase. |
| V15 | 64,0 | Companions. Talents. Prestige. |
| V16 | 69,0 | And when you rest, the Reach keeps working. |
| V17 | 71,7 | Four peoples. One Reach. |
| V18 | 76,0 | Grim Reach. |

## 5 Offen

- Raid-Bosse (Shots 12–13) warten wie in v3 auf Codex' `gk_*`-Bilder; bis dahin Platzhalter.

## 6 Baustand (24.10.)

<!-- claude:2026-10-24T12:14:00+02:00 -->

Alle 18 Abschnitte gebaut: `apps/client/trailer-stage/src/v4/` (`index.ts` Zeitstrahl und Einblendungen, `shots.ts` und
`shots2.ts` Tableaus, `ui.ts` Bausteine, `data.json` aus `gen-v4-data.ts`). Aufruf: `?scene=v4`, Rendern wie v3 in
Abschnitten unter 10 Minuten. Ton: vorerst nur Musik; die Sprachaufnahme des Chefs wird nach Eingang geschnitten und
gemischt (Zeilen V7 und V8 korrigiert, siehe Abschnitt 4).

Abweichungen vom Plan: 06 zeigt den göttlichen Schild „Aegis of the Last Idol“ (statt einer UI-Item-Karte), 09 nennt in
der zweiten Hälfte „3 ARMOR TYPES“ mit den Spalten Plate/Leather/Cloth, 14 zeigt alle Erfolgsnamen als Wand (statt
Einblendungen aus dem Spiel), 16 ohne Offline-Fenster. Echte UI-Aufnahmen (Item-Karte, Erfolgs-Einblendung,
Offline-Zusammenfassung) sind ein möglicher nächster Schritt.

## 7 Ton (24.10.)

<!-- claude:2026-10-24T16:00:00+02:00 -->

Sprachaufnahme des Chefs (`Downloads/2026-10-24 11-41-56.mkv`, als MP3 daneben) per Whisper-Wortzeiten und Pausen in
31 Stücke geschnitten und auf die Bildzeitleiste gelegt (`vo-timing.json`); Musik unter der Stimme −5 dB. Fertig:
`marketing/trailer-v4/GrimReach-Trailer-v4-Inventar.mp4`.

- Die Aufnahme entstand vor der Zählkorrektur und enthält noch „More than a hundred and forty monsters“ und „fourteen
  dungeons“. Beide Teile sind **nicht verwendet**; im Trailer laufen nur „Twenty-nine champions.“ und „Eleven lands.“.
  Neu einsprechen bei Bedarf: „A hundred and twenty monsters.“ und „Nine dungeons.“
- „Forty-two sets.“ ohne „to complete“ (so eingesprochen).
