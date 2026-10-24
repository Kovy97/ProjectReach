# Trailer v3 „Gehalten“: Storyboard

<!-- claude:2026-10-24T09:30:00+02:00 — Chef-Auftrag 24.10.: Storyboard für einen dynamischen Trailer auf settings.mp3 (1:21),
so viel Gameplay wie möglich, Kampf als inszenierte Fake-3D-Szenen statt abgefilmter Oberfläche, Narration mit KI-Stimme. -->

Status: **Chef-Entscheide vom 24.10. eingearbeitet** (§ 9). Testszenen A und B in Arbeit (`apps/client/trailer-stage`). Der Trailer zeigt das ganze Spiel (kein Update-, kein
Early-Access-Bezug). Musik: `C:\Users\MSchu\Downloads\settings.mp3`.

## 1 Eckdaten

| | |
|---|---|
| Länge | **81,41 s** (Track-Länge; Bild und Ton enden zusammen) |
| Master | 1920×1080, 60 fps, H.264 (Steam), Zeitlupen aus echten 240-fps-Unterframes |
| Sprache | Erzählstimme Englisch (Store ist EN), deutsche Fassung später möglich |
| Stimme | nur **der Wächter** (Erzähler, Kanon: knapp, sachlich, trocken) |
| Text | keine Texteinblendungen, nur Logo am Ende (Chef) |
| Grundsatz | Keine abgefilmte Oberfläche. Echtes Spielmaterial (Gemälde, Kulissen, Effekte, UI) wird inszeniert: Tiefe, Kamera, Zeitlupe, Morph-Animation |

## 2 Musikanalyse `settings.mp3`

Gemessen mit ffmpeg + numpy (Lautheit, fünf Frequenzbänder, Helligkeit, Einschläge, Tempo), Daten in
`design/trailer-v3/musik-analyse.json`.

- **Tempo** ≈ 92,5 BPM. Ein Schlag = **0,649 s**, ein Takt = **2,594 s**. Das Raster beginnt bei **3,97 s**
  (Takt *n* = 3,97 + 2,594·*n*). Alle großen Einschläge liegen auf Taktanfängen; geschnitten wird auf diesem Raster.
- **Bass-lastiger Aufbau**: Subbass und Bass tragen von Anfang an, Mitten und Höhen wachsen langsam, die Helligkeit
  steigt von ~1100 Hz auf ~1750 Hz.

| Abschnitt | Zeit | Takte | Charakter |
|---|---|---|---|
| Kaltstart | 0,00–3,97 | Auftakt | Stille, erster Bass bei ~1,4 s |
| Aufbau 1 | 3,97–22,13 | 0–6 | dunkler Puls, Höhen gedämpft, langsam heller |
| **Atemloch 1** | 22,13–24,72 | 7 | Höhen fallen weg (22,3), Totalausfall **24,0–24,3**, Riser, **Crash 24,72** |
| Aufbau 2 | 24,72–45,47 | 8–15 | lauter, **zweiter Crash 35,10**, ab 37 s steigen die Mitten |
| **Atemloch 2** | 45,47–48,07 | 16 | Höhen weg ab 45,7, nur Bass bis 47,3, **fast Stille 47,4–47,9**, Luft-Riser |
| **EPIC SWITCH** | **48,07** | 17 | größter Helligkeitssprung des Tracks |
| Episch | 48,07–68,82 | 17–24 | volle Energie, steigt bis zum **Höhepunkt 67,6–68,8** (Spitze 68,5) |
| Einbruch | 68,82–71,41 | 25 | Energie fällt um ~20 dB, nur Höhen-Nachhall |
| Finale | 71,41–74,50 | 26 | letzter Ausbruch |
| Ausklang | 74,50–81,41 | 27–29 | Nachhall fällt bis −66 dB, Raum für Logo und Endkarte |

## 3 Dramaturgie

Roter Faden ist der Kernsatz der Lore (§ 1.6): Das Reach kann nicht gerettet werden, nur **gehalten**. Der Wächter
sagt es im Einbruch nach dem Höhepunkt („Only held.“). Bildlich trägt die **Glut** aus Hearthforge den Trailer: erster Funke im Kaltstart,
Esse der Glutfeste, Glut-Übergänge, das Logo formt sich am Ende aus Glut.

- **Aufbau 1** zeigt die verlorene Welt, die Glutfeste und den Namenlosen (Völker, Held).
- **Aufbau 2** zeigt das Spiel in die Breite: alle 15 Berufe, Handwerkskette, Ländereien, Ereignisse, Aufträge,
  Offline-Fortschritt, Zonen, die drei Kampfstile, Elemente, Dungeons, Champions, Begleiter.
- **Episch** ist ein durchinszenierter Raid-Kampf in Fake-3D mit Zeitlupen, Element-Momenten und Beute-Zeremonie.
- **Finale** zeigt in Halbschlägen die Langzeit-Systeme (Aschegang, Paragonturm, Jägerkodex, Götzenhalle, Erfolge).

## 4 Shotliste

Takt = Taktnummer im Raster (§ 2). Technik: **Bühne** = Fake-3D-Szene (three.js, § 6), **UI-Raum** = echte
Spielansicht als Textur im Raum, **Vignette** = Skill-Vorlage (§ 6.7), **Typo** = Titel/Text.

| # | Zeit (s) | Takt | Bild | Kamera / Bewegung | Technik | Ton | Text (entfällt) |
|---|---|---|---|---|---|---|---|
| 01 | 0,00–3,97 | Auftakt | Schwarz. Ein Glutfunke steigt, Asche fällt. Beim ersten Bass zeichnet sich die erkaltete Esse von Hearthforge im Funkenlicht ab. | langsame Fahrt nach vorn | Bühne: Partikel, Kulisse im Nebel | Wind, Glutknistern | – |
| 02 | 3,97–6,56 | 0 | Die verlorene Welt: Aschfelder in drei Tiefenebenen, zerfetzte Banner, Asche. | Kran langsam abwärts | Bühne: Parallax-Kulisse | **VO1** | – |
| 03 | 6,56–9,16 | 1 | Die Diener: Silhouetten im Nebel (Goblin-Kriegsbande, Skelett, Dornwolf, Wyvern). Auf jedem Schlag enthüllt ein Blitz eine Gestalt. | seitliche Fahrt | Bühne: Billboards, Blitzlicht | Donner auf den Schlägen | – |
| 04 | 9,16–11,75 | 2 | Die Glutfeste bei Nacht: Palisadentor, dahinter Urgas Esse mit der geretteten Glut. | Fahrt durchs Tor | Bühne: Lager-Kulisse (Nacht) | **VO2** | – |
| 05 | 11,75–14,35 | 3 | Gesichter der Glutfeste: Urga, Voss, Mux, Shairi, je ein Schlag, Essenlicht flackert. | seitliche Dolly | Bühne: Büsten mit Atem-Morph | **VO3** | – |
| 06 | 14,35–16,94 | 4 | Der Namenlose: Mensch → Elf → Goblin → Ork, je ein Schlag, Glut-Übergang; dazwischen der echte Charakter-Editor, im Raum gekippt. | Push-in | Bühne + UI-Raum | Glut-Whoosh je Schlag | – |
| 07 | 16,94–19,53 | 5 | Der Held (`human_warrior_m`): atmet, Mantel weht, der Kopf dreht sich zur Kamera. | Kreisfahrt 25° | Bühne: Puppen-Morph | **VO4** | – |
| 08 | 19,53–22,13 | 6 | Erste Arbeit: Holzfällen (`human_woodcutter`, Späne) und Bergbau (`orc_miner`, Funken), je zwei Schläge; Fundstücke fliegen in ein Inventarraster; Tag-Nacht im Zeitraffer. | Schwenk, Match-Cut | Vignette | **VO5** | – |
| 09 | 22,13–24,00 | 7 | Höhen fallen weg: Makro, die Hand des Helden schließt sich um den Schwertgriff. | sehr langsamer Push, geringe Schärfentiefe | Bühne: Ausschnitt der Puppe | **VO6** | – |
| 10 | 24,00–24,72 | 7 | Schwarz im Aussetzer, dann Funkenregen von unten, weißer Blitzframe bei 24,6. | – | Typo/Partikel | Riser (im Track) | – |
| 11 | 24,72–27,32 | 8 | **Crash:** erster Schlag auf der Kampfbühne (Grenzlande), Held gegen Goblin-Plünderer. Einschlag auf dem Crash in Zeitlupe 0,25×: Funkenkranz, Schadenszahl fliegt zur Kamera, 3 Frames Treffer-Stopp, dann Echtzeit, zweiter Treffer auf Schlag 3. | Kamera ruckt mit dem Treffer, dann Orbit | Bühne: Kampf | Schwerttreffer | – |
| 12 | 27,32–29,91 | 9 | Berufe in acht Halbschlägen: Angeln (`elf_fisher`, Wasserring), Sammeln (`human_forager`), Diebeskunst (`goblin_thief`, Münzen), Kochen (`orc_cook`, Dampf), Kräuterkunde (`elf_herbalist`), Handwerk (`human_leatherworker`), Schneidern, Meisterring-Blitz (Stufe 99). | harte Schnitte, Zoom-Punch | Vignette ×8 | **VO7** (Wörter auf Schlägen) | – |
| 13 | 29,91–32,50 | 10 | Handwerkskette als Morph: Erz → Barren → Klinge (Funken) → Rune wird eingesetzt; parallel wird ein Pfeil befiedert und fliegt links aus dem Bild (Vorgriff auf Shot 23). Am Ende kippt die Itemkarte zur Kamera: Sterne, Rarität, Werte. | Kamera folgt dem Objekt | Vignette + UI-Raum (Itemkarte) | **VO8** | – |
| 14 | 32,50–35,10 | 11 | Leben im Handwerk: Felder wachsen im Zeitraffer, eine Falle schnappt, Ereigniskarten (Reiche Ader, Fischschwarm) fallen wie Spielkarten ins Bild, ein Auftragszettel wird angeheftet, der Offline-Bericht des Wächters rollt auf. | Aufsicht, Karten-Wurf | Vignette + UI-Raum | **VO9** | – |
| 15 | 35,10–37,69 | 12 | **Crash:** Das Tor geht auf. Flug durch die Zonen-Gemälde (`assets/zones`), auf jedem Halbschlag die nächste Zone: Weiden, Grenzlande, Aschfelder, Schwarzdorn, Krypta, Hochland. | Flug durch gestaffelte Bilder | Bühne: Zonen in Tiefenebenen | **VO10** | – |
| 16 | 37,69–40,29 | 13 | Drei Wege zu kämpfen, Triptychon: Nahkampf (`human_warrior_m`), Fernkampf (`elf_ranger_f` spannt, Pfeil mit Spur), Magie (`human_frost_mage_f`, Zauberpartikel); Schlag 4: die drei Bilder prallen zu einem zusammen. | drei Kameras, dann Zusammenprall | Bühne ×3 | Schlagwerk | – |
| 17 | 40,29–42,88 | 14 | Bestiarium im Schlagtakt mit Element-Signaturen: Skelett-Eismagier → Einfrieren, Dornwolf → Blutung, Aschtyrann → Brand, Schock-Kette, Gift-Stapel. | Zoom-Punch je Schlag | Bühne: Element-Effekte | **VO11** | – |
| 18 | 42,88–45,47 | 15 | Dungeons und Champions: Wellen-Totenkopfleiste im Raum, Elite-Horn, ein Champion bricht in die Szene, ein Begleiter springt dazwischen; ab 44,2 s Schnitte auf Halbschlägen. | Handkamera, schneller werdend | Bühne + UI-Raum | Elite-Horn (SFX, Datei fehlt noch) | – |
| 19 | 45,47–47,40 | 16 | Nur Bass: langsame Fahrt auf das Tor von Gobkha'raz, Goblin-Banner, Asche fällt in Zeitlupe. | sehr langsamer Push | Bühne: Raid-Kulisse | **VO12** | – |
| 20 | 47,40–48,07 | 16 | Fast Stille: Schwarz, die Krone des Kriegskönigs als Gegenlicht-Silhouette, ein Einatmen, bei 47,9 ein Lichtspalt. | Stillstand | Bühne | Atem | – |
| 21 | 48,07–50,66 | 17 | **EPIC SWITCH:** Peitschenschwenk aus dem Schwarz in die Raid-Halle, der Held stürmt in eine Goblin-Welle. Einschlag bei 48,07 in 0,2× mit Schockwelle, dann Tempo-Rampe auf 1,5×. | Whip-Pan, Rampe | Bühne: Raid-Raum | Einschlag | – |
| 22 | 50,66–53,26 | 18 | Vrikka, die Zählerin: Ihr Ward-Schild als Blase, ein Krit zerschlägt ihn in Splitter, Schuldplaketten fliegen; die Phasen-Ansage steht als Schrift im Raum. | Orbit 90° | Bühne: Ward-Shader | Glasbruch | – |
| 23 | 53,26–55,85 | 19 | Fernkampf-Moment: `elf_ranger_f` lässt einen Feuerpfeil los (der Pfeil aus Shot 13). Bullet-Time: Die Kamera folgt dem Pfeil durch die Halle bis zum Einschlag bei Krogg auf Schlag 3, der Brand entzündet sich. | Kamera am Pfeil | Bühne: Zeitlupe | Pfeil-Zischen | – |
| 24 | 55,85–58,44 | 20 | Magie-Moment: Frostnova, Ushkas Grubenhunde frieren im Sprung ein (Freeze-Frame auf dem Schlag), die Kamera fährt durch die erstarrten Körper, eine Schock-Kette springt auf jedem weiteren Schlag weiter. | Fahrt durch die Szene | Bühne: Freeze + Schock | Eisknacken | – |
| 25 | 58,44–61,04 | 21 | Beute: Die Raid-Truhe springt auf, die Set-Teile wirbeln heraus (Ornat, Grubenmeute, Kronwache) mit Krone und sechs Sternen, Heroisch- und Mythisch-Rahmen, Toast „Mythic find!“; Itemkarten drehen sich auf Halbschlägen. | Kamera im Wirbel | Bühne + UI-Raum | Truhe, Münzen | – |
| 26 | 61,04–63,63 | 22 | Das geliehene Feuer: Zil'gath, bleiches rauchloses Feuer, die Schatten bewegen sich nicht (Lore). Der Ward des Helden hält, der Brand frisst am Schild. | langsamer Schwenk | Bühne: Feuer-Shader | Fauchen | – |
| 27 | 63,63–66,23 | 23 | Kriegskönig Rakkzul in Untersicht; seine Phasen blitzen auf den Schlägen auf der Bossleiste: Schuldbuch, Zeughaus, Gruben, Erbe des Krieges. | Kran nach oben | Bühne + UI-Raum (Bossleiste) | Phasen-Stinger | – |
| 28 | 66,23–68,82 | 24 | **Höhepunkt:** Held gegen König, drei Hiebe auf den Schlägen; der letzte bei **68,5** (lautester Moment) in 0,1×: voller Partikelausbruch, Weißblitz, Treffer-Stopp, riesige Schadenszahl. | Dolly ins Gesicht, dann Stillstand | Bühne: Zeitlupe | Einschlag | – |
| 29 | 68,82–71,41 | 25 | **Einbruch:** Die Krone fällt in Zeitlupe in die Asche, die Farbe weicht, der Held steht, der Mantel bewegt sich langsam. | statisch, minimaler Drift | Bühne | **VO13** | – |
| 30 | 71,41–74,50 | 26 | Finale in Halbschlägen: Aschegang (Neubeginn), Paragonturm, Jägerkodex, Götzenhalle, Erfolg freigeschaltet, Meisterring, voll ausgerüsteter Held; Endbild: Held als Silhouette vor der Glut. | Zoom-Punches | Bühne + UI-Raum | Schlagwerk | – |
| 31 | 74,50–78,50 | 27–28 | Das Logo formt sich aus Glut (`mainmenu_logo_painterly`), Asche treibt. | Stillstand | Typo/Partikel | Nachhall | – |
| 32 | 78,50–81,41 | 28–29 | Logo bleibt stehen, versionslos (kein Update- oder Release-Text), Abblende auf Schwarz bis 81,4. | – | Typo | Nachhall | – |

## 5 Sprechertext

<!-- claude:2026-10-24T11:40:00+02:00 — Aufnahme des Chefs („Video Project 2“, 43,4 s) in 14 Zeilen geschnitten und eingepasst -->

Regie: Der Wächter spricht wie ein wortkarger, alter Mann am Feuer. Kein Trailer-Pathos, keine tiefe Kinostimme, eher
müde Ruhe mit trockenem Unterton. Musik wird unter jeder Zeile um etwa 5 dB abgesenkt.

**Aufnahme vorhanden** (Chef, 24.10.): geschnitten nach `marketing/trailer-v3/voice/vo01.wav` … `vo14.wav`, Pausen
innerhalb einer Zeile behutsam gekürzt (höchstens 0,22–0,40 s), Spitze −1 dBFS. Hörprobe Musik + Stimme:
`marketing/trailer-v3/voice/trailer-ton-vorschau.mp3`. Start = Zeitpunkt im Trailer, Ende inklusive kurzem Ausklang.

| # | Start (s) | Ende (s) | Text | Anschluss |
|---|---|---|---|---|
| VO1 | 4,60 | 7,28 | The world out there is lost. | |
| VO2 | 9,40 | 13,17 | Hearthforge fell. We carried the embers here. | |
| VO3 | 13,40 | 16,22 | It isn't much. It's all we have left. | |
| VO4 | 17,20 | 18,97 | So you'll do the work. | |
| VO5 | 19,90 | 20,73 | All of it. | |
| VO6 | 21,50 | 24,01 | And when they come, you fight. | Sprache endet vor dem Aussetzer bei 24,0 |
| VO7 | 25,70 | 30,09 | Fish. Herbs. Leather. Whatever keeps us breathing. | nach dem ersten Treffer |
| VO8 | 30,15 | 32,09 | Steel holds better. | |
| VO9 | 32,15 | 35,09 | And when you sleep, the work goes on. | endet vor dem Crash 35,10 |
| VO10 | 35,60 | 38,17 | Out past the wall, they're waiting. | |
| VO11 | 40,30 | 44,18 | Goblins. The dead. Things with too many teeth. | |
| VO12 | 45,60 | 48,02 | Under the old keep, there's a king. | endet in der Stille vor dem Epic Switch |
| VO13 | 68,85 | 70,77 | The Reach can't be saved. | direkt nach dem Höhepunkt |
| VO14 | 70,95 | 72,13 | Only held. | „held“ fällt auf den Finale-Einsatz 71,41 |

Hinweis: Die Aufnahme ist langsamer gesprochen als geschätzt. Der Block VO7–VO9 füllt 25,7–35,1 s fast lückenlos; wird
er zu dicht, ist „Steel holds better.“ die Zeile, die am ehesten entfallen kann.

## 6 Technik-Plan: die Trailer-Bühne

Ziel: Szenen werden nicht in Echtzeit abgefilmt, sondern **Bild für Bild gerendert**. Damit gibt es saubere
Zeitlupen, echte Bewegungsunschärfe und exakt wiederholbare Aufnahmen. Alles läuft als eigener Dev-Einstieg im Client
und gelangt nie in den Spiel-Build.

### 6.1 Bühne und Zeitleiste
- Basis ist der pausierte 2,5D-Arena-Prototyp (`components/arena25d`, three.js): gebogene Kulisse, Boden, Billboards
  mit Bodenkontakt, Kamera. Er wird für den Trailer als eigene Seite genutzt, das Spiel-Flag bleibt aus.
- Eine **Shot-Datei** (JSON, eine je Shot) beschreibt Ebenen, Figuren, Effekte und Keyframes: Kamera (Position, Ziel,
  Brennweite, Rolle, Schärfentiefe), Zeitkurve (Zeitlupe, Treffer-Stopp, Rampen), Licht, Text.
- **Virtuelle Zeit:** `renderFrame(t)` statt Echtzeit; Zufall mit festen Seeds. Jede Aufnahme ist bitgleich wiederholbar.

### 6.2 Aufnahme und Schnitt
- Playwright (wie in `ui-audit`) steuert die Bühne Bild für Bild: 60 fps, je Bild 4 Unterframes für echte
  Bewegungsunschärfe; Zeitlupen ziehen aus denselben Unterframes.
- Schnitt-Skript nach dem Cue-Sheet (Shot-Zeiten aus § 4): Musik, Stimmen, SFX, Übergänge (Glut-Auflösung, Whip-Pan,
  Weißblitz), Farbkorrektur (LUT), Filmkorn, Vignette, Lautheit −14 LUFS, Ausgabe 1080p60 H.264.

### 6.3 Puppen-Morphs für 2D-Gemälde
- Die Ganzkörper-Gemälde (z. B. `portraits/human_warrior_m.webp`, 1122×1402, freigestellt) liegen auf einem
  unterteilten Gitter. **Verformer mit Gewichtsmasken** (Kopf, Oberkörper, Hüfte, Waffenarm, Mantel) bewegen es.
- Gesten als Keyframe-Bibliothek: Atmen, Ausholen, Schlag, Rückstoß, Bogen spannen und lösen, Zauber wirken, Blick
  zur Kamera. Mantel und Haare schwingen per Shader nach.
- Für den Fake-3D-Eindruck bei Kreisfahrten: leichte Perspektiv-Verzerrung des Gitters, getrennte Ebene für die Waffe.

### 6.4 Effekte in 3D
- Port der prozeduralen Kampfpartikel (`fxParticles.ts`) in die Bühne: Funkenkranz, Schockwelle, Blut, Asche.
- **Element-Signaturen:** Brand (Glut, Hitzeflimmern), Frost (Kristalle, Einfrieren = Freeze-Frame mit Reif),
  Schock (springende Bögen), Gift (Wolke, Stapel-Tropfen), Blutung.
- Ward-Blase (Fresnel-Shader, splittert bei Krit), bleiches „geliehenes Feuer“ (rauchlos, Schatten bleiben stehen).
- Schadenszahlen als 3D-Schrift mit Punch, Treffer-Stopp, Kamera-Wackeln. Ausrüstung glüht nie, nur Effekte und Runen.

### 6.5 Tiefe aus 2D-Kulissen
- Kulissen (Aschfelder, Glutfeste, Grenzlande, Raid-Räume 1–5) werden in **Vorder-, Mittel- und Hintergrund**
  zerlegt und gestaffelt; dazu Nebel, Lichtstrahlen und treibende Asche als Volumen.

### 6.6 UI im Raum
- Echte Spielansichten aus dem **Testprofil** (nie echte Spielstände) in doppelter Auflösung: Itemkarte, Bossleiste,
  Zonenkarte, Offline-Bericht, Charakter-Editor, Wellen-Leiste, Toasts. Sie werden als Ebenen im Raum gekippt, Zahlen
  zählen animiert hoch.

### 6.7 Skill-Vignetten
- Vorlage: Skill-Kulisse (`skill-backgrounds`) als Parallax + passende Völker-Figur mit Geste + Item-Pop ins Raster.
  15 Berufe, je 0,3–1,3 s.
- Handwerkskette als **Item-Morph** (Erz → Barren → Klinge) mit Verdrängungs-Shader statt Überblendung.

### 6.8 Typo und Logo
- Schrift Cinzel (wie im Spiel), graviert, mit Glutkanten. Das Logo setzt sich aus Glutpartikeln zusammen.
- Keine Texteinblendungen (Chef). Untertitel nur als optionale .srt-Datei für die Stimmen.

### 6.9 Ton
- Stimmen mit deiner KI-Stimme (Wächter, Kriegskönig), einzeln je Zeile als WAV.
- SFX-Liste (Schwert, Bogen, Frost, Feuer, Truhe, Horn, Asche-Wind) aus einer lizenzfreien Quelle, die du festlegst;
  vorhandene Spiel-Sounds (`assets/audio`: Kampf, Level-up, Erfolg) zuerst. Das Elite-Horn hat im Spiel noch keine Datei.

## 7 Arbeitspakete

Vorschlag: zuerst ein **Vertical Slice** (Shot 28, der Höhepunkt, komplett mit Bühne, Puppe, Effekten, Zeitlupe und
Ton) zur Abnahme des Looks. Erst danach der Rest.

| Paket | Inhalt | Aufwand | hängt ab von |
|---|---|---|---|
| T1 | Bühne, Shot-Format, virtuelle Zeit | groß | Arena-Prototyp |
| T2 | Aufnahme- und Schnitt-Pipeline | mittel | T1 |
| T3 | Puppen-Morphs + Gesten-Bibliothek | groß | T1, Gewichtsmasken |
| T4 | 3D-Effekte, Elemente, Zeitlupe | groß | T1 |
| T5 | Kulissen in Tiefenebenen | mittel | Ebenen-Assets |
| T6 | UI im Raum (Testprofil-Aufnahmen) | mittel | – |
| T7 | Skill-Vignetten + Item-Morph | mittel | T1, T3 |
| T8 | Typo, Logo aus Glut, Untertitel | klein | T1 |
| T9 | Stimmen, SFX, Mischung | klein | deine Aufnahmen |
| Schnitt | 32 Shots nach Cue-Sheet, Abnahmeschleifen | mittel | alles |

## 8 Asset-Bedarf

- **Raid-Assets** aus der laufenden Codex-Produktion (Gegner, Räume, Set-Teile): Shots 19–29 warten darauf.
- **Neu für den Trailer (Codex):**
  - Gewichts- oder Ebenenmasken für 6 Hauptfiguren: `human_warrior_m`, `elf_ranger_f`, `human_frost_mage_f`, dazu
    Kriegskönig, Vrikka und ein Goblin-Plünderer (Kopf, Oberkörper, Waffenarm, Waffe, Mantel getrennt).
  - Tiefenebenen für 9 Kulissen (Vorder-, Mittel-, Hintergrund als Freisteller).
  - Ein Weitbild der Glutfeste bei Nacht, falls die Lager-Kulisse für die Torfahrt nicht reicht.
- **Ton:** 14 Sprechzeilen (deine KI-Stimme), SFX-Paket.

## 9 Chef-Entscheide (24.10.)

1. **Endkarte versionslos:** nur das Logo, kein Update- oder Release-Text. Gezeigt wird das Spiel bis einschließlich der
   1.4-Inhalte.
2. **Held:** menschlicher Krieger (`human_warrior_m`).
3. **Stimme:** nur der Wächter, kein Kriegskönig.
4. **Kein** Schlusssatz.
5. **Raid** als Höhepunkt.
6. **Keine** Texteinblendungen (Text-Ebene entfällt).
7. **Nur 16:9.**
