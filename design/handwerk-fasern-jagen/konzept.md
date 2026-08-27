# Fasern, Stoff und Jagen: Konzept

> Stand 27.08.2026, Claude für den Chef. Antwort auf „Handwerk leveln fühlt sich schlecht an, alles braucht Leder".
> Zwei Bausteine: **A Fasern und Stoff** (Sammeln → Anbau → Handwerk, Magier-Roben aus Stoff statt Leder) und
> **B Jagen** als neuer Skill (passive Monsterbeute über Fallen mit Köder aus dem Angeln). Entscheidungen J1–J7 am Ende.

## 0 Diagnose

Rezepte bis Stufe 30 mit Zutaten, die nur aus Monsterbeute kommen: Handwerk **61 von 66**, Runenkunst 13 von 39
(Frostessenz ab 10), Kochen 6 von 18 (Fleisch), Juwelierkunst 2 von 11, Schmieden 1 von 96, Kräuterkunde 1 von 15.
Handwerk hängt an Rohhaut und vernarbter Haut, und weil Handwerk auch Bogensehnen und alle Magier-Roben macht,
schlägt die Wand auf Fernkampf und Magie durch. Alle 26 Roben-Rezepte (Lehrling bis Leerenweb) verlangen Leder.

## A Fasern und Stoff

### A1 Fünf Faser-Stufen, parallel zu Anbau und Roben

| Stufe | Faser | Sammeln (Knoten, Stufe) | Anbau (Saat aus dem Knoten, Stufe, Reifezeit) | Stoff (Handwerk, Stufe) |
|---|---|---|---|---|
| T1 | **Nesselfaser** | Nesselgrund, Sammeln 1 | Nessel, Anbau 2, 10 min | **Nesselstoff**, Handwerk 1 |
| T2 | **Flachs** | Flachsufer, Sammeln 20 | Flachs, Anbau 22, 20 min | **Leinen**, Handwerk 20 |
| T3 | **Dornhanf** | Dornhanfdickicht, Sammeln 40 | Dornhanf, Anbau 44, 40 min | **Dornleinen**, Handwerk 40 |
| T4 | **Geisterseide** | Geisterspinnweb-Lichtung, Sammeln 60 | Geisterseide-Staude, Anbau 64, 80 min | **Geistertuch**, Handwerk 60 |
| T5 | **Sternflachs** | Sternflachs-Feld, Sammeln 80 | Sternflachs, Anbau 84, 160 min | **Sternweb**, Handwerk 80 |

- Sammel-Knoten liefern die Faser (60–65 %) und die Saat (12–15 %), wie die Kräuter-Knoten heute; Dauer und XP
  auf der Sammel-Kurve der jeweiligen Stufe. Anbau-Ertrag 6–9 je Beet wie die Pflanzen derselben Stufe.
- **Weben** ist eine neue Handwerk-Kategorie: 3 Fasern → 1 Stoff, XP wie „Leder gerben" derselben Stufe.
- **Sehne aus Nesselfaser** (Handwerk 1, 2 Nesselfaser → 1 Sehne) als zweites Rezept neben der Haut-Sehne, damit
  Bogen ab Stufe 1 ohne Kampf möglich sind.

### A2 Roben aus Stoff statt Leder (26 Rezepte, Mengen wie heute)

| Roben-Reihe | Handwerk-Stufe | heute | neu |
|---|---|---|---|
| Lehrling (Hut, Robe, Hose) | 1–2 | gegerbtes Leder | Nesselstoff |
| Dämmerweb (Kapuze, Robe) | 8–12 | gegerbtes Leder | Nesselstoff |
| Frost (Robe, Hose) | 21–22 | gegerbtes/gehärtetes Leder | Leinen |
| Glut (Kapuze, Robe, Hose) | 30–32 | geschupptes Leder | Leinen |
| Seidenmantel | 30 | Spinnenseide + Leder | Spinnenseide + Leinen |
| Aether (Kapuze, Robe, Hose) | 45–47 | geschupptes Leder | Dornleinen |
| Arkan (Kapuze, Robe, Hose) | 57–58 | geschupptes Leder | Dornleinen |
| Dämmerweb-Serie (Kapuze, Robe, Hose) | 63–65 | genietetes Leder | Geistertuch |
| Runenweb (Kapuze, Robe, Hose) | 71–72 | Kriegshaut | Geistertuch |
| Götzenfunken, Sternweb, Leerenweb | 90–99 | Kriegshaut | Sternweb |

Frostpelz-Kapuze (Pelz + Haut) bleibt Leder, sie ist ein Pelz. Essenzen und Runen bleiben wie heute. Leder bleibt
die Rüstung des Ausweichens (Lederrüstung, Sehnen-Alternative), Stoff die des Schilds (Ward), damit die Trinität
auch in den Zutaten stimmt.

## B Jagen: neuer Skill, passive Beute über Fallen

### B1 Die Schleife

1. **Köder holen:** Angeln 1, „Köder graben", 2,5 s, 1 XP, 1 Köder (20 % zwei). Schnell, wenig XP, ein Vorrat für die Fallen.
2. **Falle stellen:** Fallenplatz wählen, Gebiet wählen, 1 Köder. Nur Gebiete, die im Kampf freigeschaltet sind, und nur wenn dort
   mindestens ein fangbares Monster schon einmal besiegt wurde.
3. **Warten:** je Gebiet eine feste Zeit (15 min bis 2 h, Tabelle B3), online wie offline im Tick, wie die Beete.
4. **Fang:** ein zufälliges fangbares, bereits besiegtes Monster des Gebiets geht in die Falle: **5 Beute-Würfe** seiner Tabelle
   (Rare-Drop-Regel gilt, keine Champion-Unikate, keine Begleiter-Drops) plus Jagen-XP.
5. **Erneuern:** Auto-Erneuern wie beim Anbau, jede Falle nimmt 1 Köder; ohne Köder bleibt sie leer.

### B2 Fallenplätze nach Stufe

| Jagen-Stufe | 1 | 10 | 25 | 45 | 65 | 85 |
|---|---|---|---|---|---|---|
| Plätze | 1 | 2 | 3 | 4 | 5 | 6 |

### B3 Gebiete

| Gebiet | Jagen-Stufe | Fallenzeit | Fangbar heute (Beispiele) |
|---|---|---|---|
| Die Weiden | 1 | 15 min | Huhn, Kuh, Eber, wilde Ziege |
| Die Grenzlande | 10 | 20 min | Goblins (Schlinge) |
| Die Aschfelder | 20 | 30 min | Aschratte, Schakal, Staubgeier, Moorkriecher, Pechkäfer |
| Der Schwarzdornwald | 30 | 40 min | Dornwolf, Hexe (Schlinge) |
| Die Krypta | 40 | 50 min | nur Skelette (s. J1) |
| Wildwald-Jagdgründe | 50 | 60 min | Waldhase, Grauwolf, Hirsch, Schattenwolf |
| Gezeitenuntiefen | 60 | 75 min | Schlammkrabbe, Tiefenkrake, Gezeitenschlange |
| Schlackengrube | 70 | 90 min | Grubenspinne, Frosthund, Kobolde (Schlinge) |
| Das Hochland | 80 | 105 min | Roc, Roc-Jäger, Roc-Ältester |
| Die Götzenhalle | 90 | 120 min | nichts Fangbares (Konstrukte, Untote, Drazhan) |

Fangbar: Familien **Tier** und **Humanoid** (Schlinge). Nie: Untote, Konstrukte, Dämonen, Drachen, Bosse, Dungeon-Monster,
Champions. Damit hat die Krypta keine Fänge; die Götzenhalle auch nicht. Beides ist Absicht: Fallen sind Jägerwerkzeug,
keine zweite Kampfmaschine. Die Jagen-Stufe je Gebiet ist die Leiter des Skills, die Kampf-Freischaltung die Tür.

### B4 Zahlen

- **Fangchance** 70 % plus 0,5 Prozentpunkte je Jagen-Stufe über der Gebietsstufe, Deckel 95 %. Bei Fehlschlag ist der Köder weg,
  die Falle erneuert sich (mit Köder) von selbst.
- **XP je Fang** aus der bekannten C-600-Kurve (wie Schmieden/Kochen): Ziel-XP/h der Gebietsstufe × Fallenzeit/60, verteilt auf die
  Plätze. Richtwerte: Weiden 25 XP je Fang, Aschfelder 140, Wildwald 1 100, Hochland 9 000. Mit sechs Fallen liegt Jagen damit auf der
  Anbau-Kurve, nicht darüber.
- **Beute** 5× der Beutetabelle des Monsters. Beispiel Eber: 5 Würfe auf Rohhaut (70 %) ergeben im Schnitt 3,5 Häute je Fang alle
  15 Minuten, ohne Kampf. Gold der Tabelle fällt ebenfalls (5×), Auftragsmarken nicht.
- **Kein Ruhm:** Fänge zählen nicht als Kills (keine Slayer-Aufträge, keine Kill-Erfolge, kein Bestiarium-Zähler, keine Begleiter).
  Jagen ist Beute, Kampf bleibt Fortschritt.
- **Gesamtlevel:** ein neuer Skill hebt das erreichbare Gesamtlevel um 99; Schwellen (Dailies-Deckel, Tavernen-Bänder, Erfolge
  „Gesamtlevel") werden nachgezogen. Kein Steam-Erfolg, das Set ist eingefroren.

### B5 Oberfläche

Seite „Jagen" nach dem Muster der Anbau-Seite: sechs Fallenplätze als Karten (Gebiet, Restzeit, Köder, Auto-Erneuern, letzter Fang),
Köder-Zähler oben, daneben das **Jagdbuch**: je Gebiet die fangbaren Monster mit Häkchen „schon besiegt" (aus dem Bestiarium) und
den Beutezeilen. Offline-Bericht listet Fänge („Eber ×3, Ziege ×1"). Sidebar-Eintrag hinter Angeln, Icon von Mira.

## C Technik

- **Content:** 5 Fasern, 5 Saaten, 5 Stoffe, 5 Pflanzen, 5 Sammel-Knoten, 5 Web-Rezepte, 1 Sehnen-Rezept, 26 Roben-Rezepte umgestellt,
  Skill `hunting` (trainiert Geschick), Köder-Item + Angel-Aktion, Gebietstabelle Jagen (Stufe, Zeit).
- **Engine:** `state.huntTraps[6]` (Gebiet, Restzeit, Köder gesetzt, Auto-Erneuern, Baseline), Tick wie `tickFarmPlots` (offline ==
  online, bit-identisch), Fang-Wurf über `state.rng` in fester Reihenfolge, Beute über `grantLoot` (Überlauf ins Postfach),
  Skill-XP über den normalen Pfad. `SAVE_VERSION 85` mit Migration (leere Fallen) und Sanitize.
- **Client:** `HuntingPage` (Muster FarmPage), Sidebar, Offline-Bericht, Jagdbuch aus Bestiarium-Daten, i18n ×7.
- **Mira:** Icons Fasern ×5, Stoffe ×5, Köder, Falle, Sidebar-Icon Jagen, Sammel-Knoten-Karten ×5.
- **Aufwand:** Content 1 Tag, Engine 1–2 Tage, UI 2 Tage, Tests/Sim 1 Tag. Passt in 1.2.0 neben die Taverne (ein Save-Bump für beides).

## D Entscheidungen des Chefs

- **J1 Fangbar:** Tiere und Humanoide (Schlinge), nie Untote/Konstrukte/Dämonen/Drachen/Bosse? Oder nur Tiere?
- **J2 Ruhm:** Fänge zählen nicht als Kills (Empfehlung) oder doch für Bestiarium/Slayer?
- **J3 Plätze:** 6 Plätze mit Freischaltung 1/10/25/45/65/85, oder 9 wie beim Anbau?
- **J4 Chance:** 70 % + Stufenbonus (Empfehlung) oder garantierter Fang?
- **J5 Fasern:** die fünf Stufen und Namen so (Nessel, Flachs, Dornhanf, Geisterseide, Sternflachs)?
- **J6 Sehne:** Nessel-Sehne als kampffreie Alternative für Bogen ab Stufe 1?
- **J7 Version:** beides in 1.2.0 zusammen mit der Taverne?
