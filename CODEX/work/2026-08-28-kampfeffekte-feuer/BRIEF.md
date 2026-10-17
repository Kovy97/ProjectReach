# Asset-Brief — Kampfeffekte Welle 2: Feuer in Sequenzen (7 Streifen)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 28.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Konzept:** `design/combat-fx/konzept-kampfeffekte.md`. **Vorgänger:** `CODEX/work/2026-08-27-kampfeffekte-welle-1/` (drei Felder je Effekt, 33 Dateien, alle im Spiel).
> **Chef-Feedback zu Welle 1:** „Die Effekte sind cool, ich hätte aber gerne mehr Frames pro Effekt. Die Projektile sind zu schnell, wir sehen die Assets nicht. Ich möchte mich erstmal auf Feuer fokussieren, mit Varianten, die zufällig abspielen.“ Die Geschwindigkeit regelt der Renderer (Claude), die Frames kommen von dir.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Kampfeffekte Welle 2: Feuer |
| Zielversion | 1.2.x (Kampfgefühl), Priorität P1; Feuer ist das Pilot-Thema, die anderen sechs Magie-Themen folgen erst nach Chef-Abnahme in demselben Format |
| Umfang | 7 Streifen: 3 Feuer-Geschoss-Varianten à **5 Frames**, 1 Crit-Geschoss à **5 Frames**, 3 Feuer-Einschlag-Varianten à **3 Frames** |
| **Bestandsreferenz (Pflicht)** | `CODEX/assets/kampfeffekte-welle-1-2026-08-27/fertig/fx_missile_fire.png` und `fx_impact_fire.png` (bleiben als Rückfall im Spiel). Gleiche Palette (glutorange Kern, dunkelroter Saum, wenig Gelb), gleiche Zellengröße, gleicher Mittelpunkt, gleiche Flugrichtung nach RECHTS. Die neuen Streifen müssen sich neben den alten wie EINE Familie lesen. |
| Stil | Ashen-Iron-Palette, gemalt, kein Comic, kein Text; Glühen erlaubt (Magie); echtes Alpha, kein Schachbrett, kein Key, kein Boden, kein Schatten |
| Lieferung | `CODEX/assets/kampfeffekte-feuer-2026-08-28/fertig/` (+ raw/, qa/ mit Kontaktbogen: jeder Streifen als Zeile, dazu ein Bild, das die drei Geschoss-Varianten untereinander über dem Ashfields-Battlescreen zeigt), danach HANDOFF/WORKLOG; gern in Teilen (erst Geschosse, dann Einschläge) |
| Nicht anfassen | Renderer; Einbau macht Claude (WebP q90, `assets/fx/`, Auto-Discovery) |

## Format

- **Geschoss-Streifen:** 5 Felder à 256 × 128 nebeneinander = **1280 × 128**. Feld 1 = Entstehen (Funke/Zündung), Feld 2 bis 4 = Flug (Kern + Schweif, Schweif nach LINKS), Feld 5 = kurz vor dem Einschlag (heißester Moment). Mittelpunkt des Kerns in allen fünf Feldern identisch (x = 160 von 256, y = 64), Schweif darf bis Feldrand links reichen, nie über den Rand.
- **Einschlag-Streifen:** 3 Felder à 256 × 256 = **768 × 256** (wie Welle 1): Aufprall, Ausbreitung, Verglimmen. Mittelpunkt 128/128.
- Acht Pixel transparenter Sicherheitsrand je Feld; weiche Teiltransparenz an Rauch und Glut.
- Die fünf Felder eines Streifens müssen als **zusammenhängende Bewegung** lesen (gleicher Kern, gleiche Lichtquelle, Schweif wächst, Funken wandern). Kein Neuwürfeln je Feld: erst EIN Bild, dann daraus die Phasen.

## Die sieben Dateien (Namen exakt)

| Datei | Maße | Motiv |
|---|---|---|
| `fx_missile_fire_v1.png` | 1280 × 128 | Klassischer Feuerball: runder Glutkern, langer wehender Flammenschweif, wenige Funken |
| `fx_missile_fire_v2.png` | 1280 × 128 | Feuerlanze: gestreckter, spitz zulaufender Flammenpfeil, Schweif als Hitzeschlieren, kaum Rauch |
| `fx_missile_fire_v3.png` | 1280 × 128 | Glutschwarm: drei bis vier kleine Glutkugeln, die als Traube fliegen und Funkenspuren ziehen |
| `fx_missile_fire_crit.png` | 1280 × 128 | Crit-Feuerball: größerer, weißheißer Kern mit dunkelrotem Doppelsaum, Schweif doppelt so dicht, in Feld 5 Hitzeblitz; deutlich „mehr“ als v1, gleiche Familie |
| `fx_impact_fire_v1.png` | 768 × 256 | Feuerstoß: runde Explosion mit Glutwolke und Rauchkrone |
| `fx_impact_fire_v2.png` | 768 × 256 | Flammenspritzer: Feuer schlägt seitlich weg wie Flüssigkeit, Funkenfächer nach oben |
| `fx_impact_fire_v3.png` | 768 × 256 | Glutsäule: kurze senkrechte Flammensäule mit Aschewirbel, verglimmt zu Glutpunkten |

## Regeln (Kurzfassung, s. `CODEX/RULES.md`)

- Stilabgleich mit dem Zielordner: erst die Welle-1-Feuerdateien und zwei Nachbarn (Frost, Arkan) ansehen, dann generieren.
- Automatisierte Prüfung wie in Welle 1: exakte IDs, PNG/RGBA, Maße, transparenter Außenrand, sichtbarer Inhalt in JEDEM Feld, keine Halo-Ränder.
- Einschläge ohne Blut, ohne Boden; Geschosse ohne Hintergrund-Schein.

**Woran Claude Erfolg erkennt:** die fünf Felder eines Geschosses laufen als Film, wenn man sie mit 60 ms Abstand hintereinander zeigt; die drei Varianten sind auf den ersten Blick unterscheidbar, gehören aber zur selben Familie wie `fx_missile_fire.png`; der Crit ist erkennbar „größer“ und nicht nur heller.

# Teil B – Produktionsplan (Mira)

<!-- codex:2026-08-28T20:00:03+02:00 -->

1. Welle-1-Feuer, Frost und Arkan sowie Ashfields visuell auf Palette, Maßstab und Lesbarkeit
   prüfen.
2. Je finalem Streifen genau einen nativen RGBA-Basiseffekt erzeugen; keine einzeln neu
   gewürfelten Frames.
3. Aus jedem Basisbild die Phasen deterministisch um denselben Kern/Mittelpunkt ableiten:
   Skalierung, Helligkeit und Alpha staffeln, ohne Keying oder neue Bildelemente.
4. Finale Streifen auf exakte Zellen zusammensetzen, Zellinhalt und transparenten Sicherheitsrand
   messen, 60-ms-Vorschauen und verlangte Kontaktbögen erzeugen.

# Teil C – Produktion

<!-- codex:2026-08-28T20:00:03+02:00 -->

- Sieben native RGBA-Basisbilder mit eingebautem ImageGen erzeugt: vier Geschosse und drei
  Einschläge. Kein Schachbrett, kein Key, kein Boden.
- Geschossphasen aus demselben Basisbild um Kernanker 160/64 abgeleitet; Einschlagphasen aus
  demselben Basisbild um Mittelpunkt 128/128. Dadurch bleiben Kern, Silhouette und Lichtquelle
  über den Film identisch.
- Finale 5er- beziehungsweise 3er-Streifen reproduzierbar über `prepare_and_qa.py` gebaut.
  Promptset in `PROMPTS-FINAL.md`, Quellenkarte in `qa/source-map.json`.

# Teil D – QA und Abnahme

<!-- codex:2026-08-28T20:00:03+02:00 -->

- 7/7 Dateinamen exakt, 7/7 PNG RGBA. Vier Geschosse exakt 1280 × 128, drei Einschläge exakt
  768 × 256.
- Alphaextrema überall 0–255, `edge_alpha_max = 0`; jedes der 29 Felder enthält sichtbaren
  Inhalt und hält mindestens acht Pixel Sicherheitsrand.
- Alle Geschosse fliegen nach rechts, Schweife liegen links; v1, Lanze, Schwarm und Crit sind
  sofort unterscheidbar. Crit ist größer und dichter, nicht nur heller.
- Kontaktbögen auf Dunkel und Magenta, direkter Welle-1-Familienvergleich, Ashfields-Vorschau
  sowie sieben animierte QA-GIFs unter `qa/` vorhanden.
- Vollständige Zellmesswerte in `qa/qa.json`. Renderer nicht verändert.
