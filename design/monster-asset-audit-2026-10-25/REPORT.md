# Monster-Asset-Audit 25.10.2026: fehlerhafte Alpha-Kanäle

<!-- claude:2026-10-25T10:35:00+01:00 -->

Auftrag (Chef, 25.10.): fehlerhafte Monster-Bilder mit schlechten Alpha-Kanälen finden, damit Mira eine neue
Asset-Liste bekommt. Es wurde nur gelesen und gemessen. Keine Spiel-Assets, kein Code, kein Content, nichts in
`CODEX/**` oder `.claude/**` verändert, kein Commit.

## Ergebnis auf einen Blick

| | Anzahl |
| --- | ---: |
| Geprüfte Bilddateien in `apps/client/src/renderer/assets/monsters/` | **152** |
| davon im Spiel sichtbare Monster- und Championbilder | 149 |
| davon Posen der pausierten 2.5D-Arena (`chicken_pose_*`) | 3 |
| **Austausch, Schwere hoch** | **3** |
| **Austausch, Schwere mittel** | **8** |
| Prüfliste (Grenzfälle, kein Austausch ohne Chef-Entscheid) | 15 Einträge (19 Dateien) |
| Audit 28.08.: bestätigte Monsterfehler heute behoben | 19 von 24 |
| Audit 28.08.: bestätigte Monsterfehler heute noch fehlerhaft | 5 von 24 (alle fünf auf der Austauschliste) |

Der Auftrag an Mira steht copy-paste-fertig in `MIRA-AUFTRAG.md`.

## Bildquellen: was im Spiel als Monster-Kunst erscheint

- **Einzige Quelle ist `assets/monsters/*.{png,webp}`** (Auto-Discovery in `apps/client/src/renderer/monsters.ts`,
  Dateiname = Monster- bzw. Champion-ID). `tower_<id>` (Slayer-Turm) und `dg_<id>` (Dungeon-Varianten) nutzen das
  Bild der Basis-ID; Champions (`elite_*`) fallen ohne eigenes Bild auf das Basis-Monster zurück.
- Die Raid-Gegner (`gk_*`, Hallen von Gobkha'raz) liegen ebenfalls dort. `assets/ui/raid/` enthält nur die
  Raid-Truhe, `assets/raid/` existiert nicht. Jagd, Slayer, Bestiarium, Tod-/Patt-/Offline-Popups,
  Champion-Toasts und Warteschlange laden alle über `getMonsterSrc`/`getEliteMonsterSrc`.
- Die 2.5D-Arena lädt zusätzlich `*_pose_*.webp`; sie ist per `ARENA25D_PAUSED = true`
  (`components/arena25d/flag.ts`) stillgelegt. Die drei Hühner-Posen wurden mitgeprüft, sind im Spiel derzeit
  aber nicht zu sehen.
- Abdeckung: 148 Monster- und 29 Champion-IDs im Content, alle haben ein Bild (28 davon über die
  `tower_`/`dg_`-Alias-Regel). Keine verwaisten Dateien außer den drei Arena-Posen.
- Formate heute: 146 × 1254 × 1254 RGBA, 5 × 1122 × 1402 RGBA, 1 × 320 × 320 RGBA (`scale_skarn`).

## Darstellungsgröße im Spiel (aus den Styles abgelesen)

- **Monsterkarte** (`styles/gravewood-fighter-cards.css`): Karten 255 bis ca. 341 px breit (Zeile 18),
  Artwork-Fenster `min-height: clamp(230px, 78cqw, 320px)` bei `aspect-ratio: 16/11` (Zeile 63), Bild
  `height: 91%`, `object-fit: contain`, unten verankert (Zeile 94). Ein quadratisches Monsterbild erscheint damit
  **ca. 209 bis 242 px hoch**. Hintergrund: Zonenkulisse mit dunklem Verlauf, sonst `#100c08`.
- **Kampfansicht** (`styles/combat.css` 2370 ff., 2389): `height: 80%` der Szenenhöhe, `max-width: 102%` der
  Spalte. Laut Code-Kommentar ist die Bühne bei großer Auflösung ca. 616 px hoch, die Spalte ca. 459 px breit,
  also ca. **460 bis 490 px**. Fließend und **nicht im laufenden Spiel gemessen** (kein Electron/Chromium
  erlaubt). Geprüft wurde mit 420 px, für HiDPI zusätzlich rechnerisch mit 840 px.
- Gegner stehen rechts und blicken nach **links**; die Bilder werden nicht gespiegelt.

## Methode

1. **Automatische Vorprüfung aller 152 Dateien** (`tools/measure.py`, Rohwerte in `messwerte.csv`):
   Alpha-Histogramm und Zahl der Alpha-Stufen, Canvas-Randberührung, RGB unter Alpha 0, sichtbare
   Kantenkontamination (Farbe der halbtransparenten Kantenpixel gegen das nächste deckende Motivpixel: hell,
   dunkel, weiß, Magenta, Grün, Cyan, Blau), deckender Fremdsaum, harte Treppenkanten (Anteil direkter Sprünge
   transparent → deckend), halbtransparente Körperflächen, Bodenplatte/Schlagschatten, Schachbrett, Krümel.
   Grundlage sind die Methoden aus `CODEX/work/2026-08-28-asset-fehler-audit/` (Matte-Modell, Hidden-RGB),
   erweitert um Messungen in Spielgröße.
2. **Messung in Spielgröße** (`tools/screenhalo.py`): Bild wie Chromium mit vormultipliziertem Alpha auf 420 px
   und 840 px skaliert, dann gezählt, wie viele Kantenpixel auf Schwarz deutlich heller als das Motiv
   (Lichtsaum) bzw. auf Hell deutlich dunkler (Dunkelsaum) erscheinen. Median aller Bilder 0,95 %,
   90. Perzentil 3,4 %. Zusätzlich `tools/keycolor.py` (deckende Key-Farben im Motiv, Dunst weit vom Motiv) und
   `tools/whitecrumb.py` (weiße Krümel an dunklen Kanten).
3. **Sichtprüfung** (`tools/contacts.py`): **alle 152 Dateien** auf 19 Übersichtsbögen in Kartengröße (230 px)
   auf Schwarz, Mittelbraun `#3a2a1e` und Hell `#d8cfbf`. **38 Dateien zusätzlich im Detail**: Karte 240 px,
   Kampf 420 px, Bildschirm-Zoom 4× der Kampfgröße und Quellpixel-Zoom 3× an den auffälligsten Stellen.
   **9 weitere** Geister- und Magiemotive in Kampfgröße auf drei Gründen. Auf die Austauschliste kam nur, was in
   diesen Bögen selbst gesehen wurde.
4. Skalierung immer über vormultipliziertes Alpha. **RGB unter Alpha 0 ist im Spiel unsichtbar** und wird nur als
   Hinweis auf ein altes Chroma-Key-Verfahren gewertet, nie allein als Fehler.

**Schwere-Regel:** *hoch* = in normaler Spielgröße ohne Zoom auf realistischem Hintergrund sichtbar.
*mittel* = eindeutiger technischer Alphafehler (Keyreste, weiße Mattenkrümel, harte Binärkante, Löcher), der bei
genauerem Hinsehen, auf hellen Kulissen oder bei HiDPI sichtbar ist. *Prüfliste* = nur im Quellzoom sichtbar
oder Absicht unklar (Rauch, Magie, Leuchten).

## Austauschliste

Belege: je ein Bogen `contacts/<id>.jpg` (oben Kartengröße auf drei Gründen, Mitte Bildschirm-Zoom 4× bei
Kampfgröße, unten Quellpixel 2×). Alle elf Dateien sind 1254 × 1254 RGBA.

| # | Datei | Monster (EN) | Zone | Fehlerart | Schwere |
| ---: | --- | --- | --- | --- | --- |
| 1 | `elite_pastures_boar.webp` | Rustbristle the Famished (Champion, Basis Wild Boar) | The Pastures | Weiße Mattenreste in Rückenborsten und Kinnbart; auf dunklen und braunen Gründen schon in Kartengröße als weißer Reifsaum sichtbar. Höchster Lichtsaum-Wert aller Bilder (9,6 % der Kantenpixel bei 420 px, Median 0,95 %). | **hoch** |
| 2 | `elite_border_rogue.webp` | Vex the Throatfinder (Champion, Basis Goblin Rogue) | The Borderlands | Weiße Mattenflecken an den zerrissenen Umhangspitzen rechts und neben dem unteren Dolch; in Kampfgröße auf Dunkel als weiße Punkte sichtbar. | **hoch** |
| 3 | `elite_slag_hexer.webp` | Skalva the Rimebound (Champion, Basis Frost Hexer) | Slag Pit & Frost Caverns | Alter Magenta-Chroma-Key: Magentasaum um die ganze Figur (33 % der Kantenpixel), Magentaflecken in den Eiskristallen beider Hände, binäre Alphakante mit Treppenstufen (67 % harte Sprünge). | **hoch** |
| 4 | `elite_border_warlock.webp` | Vhazrak the Ashtongue (Champion, Basis Goblin Warlock) | The Borderlands | Weiße Mattenkrümel in den Umhanglöchern unter dem Arm, weiße Spitzen an den Haarbüscheln. | mittel |
| 5 | `elite_border_butcher.webp` | Gorehook the Flayer (Champion, Basis Goblin Butcher) | The Borderlands | Weiße Mattenkrümel an den Lücken zwischen Arm und Körper und an der Schürzenkante. | mittel |
| 6 | `elite_black_wolf.webp` | Briarfang the Sleepless (Champion, Basis Thorn Wolf) | The Blackthorn Wood | Weiße Flecken an Fellspitzen (Schwanz, Rücken) und zwischen den Dornenranken. | mittel |
| 7 | `elite_idol_wraith.webp` | Hollowveil the Forgotten (Champion, Basis Idol Priest) | The Idol Hall | Alter Magenta-Key: binäre Treppenkante (77 %), violett-magentafarbener Saum an Kapuze und Robe, kleine ausgestanzte Löcher im Robensaum. Die Magenta-Einlagen im Stabkopf sind gemalt und kein Fehler. | mittel |
| 8 | `elite_idol_warden.webp` | The Ninth Warden (Champion, Basis Idol Husk) | The Idol Hall | Alter Magenta-Key: binäre Treppenkante (75 %), dünner Lila-Saum an Stein- und Goldkanten. | mittel |
| 9 | `elite_slag_ember.webp` | Furnaceheart the Undying (Champion, Basis Ember Elemental) | Slag Pit & Frost Caverns | Alter Magenta-Key: binäre Treppenkante (82 %), dünner Lila-Saum an den Schlackesplittern. | mittel |
| 10 | `elite_coast_crab.webp` | Shellfather the Unbroken (Champion, Basis Mud Crab) | Tidewater Shoals | Alter Magenta-Key: binäre Treppenkante (76 %), Lila-Saum an Scheren und Beinen, gezackte Fühler; Motiv nur 8 bis 12 px vom linken/rechten Rand. | mittel |
| 11 | `the_imp.webp` | The Imp | The Pastures | Lichtschein um die Zauberflamme hart abgeschnitten: deckender türkisfarbener Fleck mit ausgefranster Kante und losen Krümeln um die Hand. Auf hellen Kulissen in Kampfgröße sichtbar. | mittel |

Einordnung:

- **Nr. 3 und Nr. 7 bis 10** sind die letzten fünf Bilder aus der alten Magenta-Key-Generation; die anderen
  13 Champions dieser Serie wurden in der Ausbesserungswelle vom 10.09. ersetzt. In Normalgröße fallen bei Nr. 7
  bis 10 vor allem Treppenkanten und ein dünner Lila-Rand auf; neben den sauberen Geschwistern wirken sie
  sichtbar gröber.
- **Nr. 1, 2, 4, 5, 6** gehören zu einer frühen Champion-Serie mit gleicher technischer Signatur (252 bis
  254 Alpha-Stufen statt 256; das deutet auf eine nachträgliche Alpha-Bearbeitung hin, ist aber nicht bewiesen).
  Der Fehler ist eine weiße Matte, die an Fell-, Borsten- und Stoffspitzen hängen geblieben ist.
- **Hinweis zu Nr. 3:** In `CODEX/assets/monster-neuguss-2026-08-28/fertig/elite_slag_hexer.png` liegt seit
  28.08. ein Neuguss mit **nativem Alpha**, der nie eingebaut wurde. Messung: keine Magenta-Kante, keine harten
  Sprünge, 256 Alpha-Stufen. Die Figur ist etwas kleiner im Bild (Ränder ca. 180 px seitlich, 89 px oben und
  unten) und hat eine etwas zackigere Eisrobe. Nimmt der Chef diese Fassung, entfällt Punkt 3 im Mira-Auftrag.
  Die Neugüsse vom 28.08. für Nr. 7 bis 10 wurden laut dortigem `qa/QA.md` aus einer grünen Key-Zwischenstufe
  freigestellt und erfüllen die heutige Regel (natives Alpha, kein Keying) nicht.

## Prüfliste (kein Austausch ohne Chef-Entscheid)

| Datei(en) | Monster (EN) | Beobachtung | Warum nur Prüfliste |
| --- | --- | --- | --- |
| `elite_ash_beetle.webp` | Cinderhusk the Unbowed | Weiß-graue Büschel auf dem Panzer, hellgraue beinförmige Flächen unter den Beinen (Beleg `contacts/pruef-elite_ash_beetle.jpg`); in Kampfgröße sichtbar. | Kann gewollte Asche sein. Falls nicht gewollt: Austausch (mittel). |
| `elite_pastures_imp.webp` | Embergrin the Unbidden | Kleiner weißer Rest zwischen den Hörnern; Flammenspitze blassrosa und flächig (Beleg `contacts/pruef-elite_pastures_imp.jpg`). | Sehr klein; Flamme kann so gemalt sein. Gleiche Serie wie Nr. 1, 2, 4 bis 6. |
| `elite_ash_crawler.webp` | Mireclutch the Venomous | Weiße Krümel an Bein- und Stachelspitzen; Giftwolke selbst sauber. | Nur im Quellzoom sichtbar. Gleiche Serie. |
| `hollow_marrow.webp` | Hollow Marrow | Binäre Treppenkante, dunkler Saum auf Hell, Zwischenräume von Rippen und Fußknochen deckend graublau gefüllt (Beleg `contacts/pruef-hollow_marrow.jpg`). | Füllung kann gemaltes Gewebe sein; auf dunklen Kulissen unauffällig. |
| `hollow_choir.webp` | Hollow Choir | Binäre Treppenkante, Cyan-Saum an Stoffkanten, zwei kleine Löcher im Stoff. | Nur im Bildschirm-Zoom sichtbar. |
| `goblin_warchief`, `goblin_siegebrute`, `goblin_bloodshaman`, `goblin_pikeman`, `goblin_reaver` (`.webp`) | Goblin Warchief, Siegebrute, Bloodshaman, Pikeman, Reaver | Eine Produktionsserie: binäre Treppenkante (63 bis 66 %), grüne und magentafarbene Krümel an Ketten und Stofffransen (Beleg `contacts/pruef-goblin_siegebrute.jpg`). | In Spielgröße nur leichte Zacken; Farbkrümel erst im Zoom. |
| `drazhan.webp` | Drazhan the Crownless | Binäre Treppenkante (78 %), vereinzelte türkis-rote Krümel im Umhang. | Nur im Zoom sichtbar. |
| `ember_elemental.webp` | Ember Elemental | Graue Rauchkanten wirken auf Schwarz wie ein heller Kranz um die Figur. | Technisch deckend grauer Rauch, kein Mattenrest; Art-Intent. |
| `ashfield_wraith.webp` | Ashfield Wraith | Hellgrauer Rauchkranz unten und rechts. | Wie oben; schon am 09.09. als Art-Intent-Frage vermerkt. |
| `frost_hexer.webp` | Frost Hexer | Frostkugel in der linken Hand halbtransparent, wirkt auf Dunkel trüb grau statt leuchtend. | Gemalte Magie, kein Kantenfehler. |
| `scale_skarn.webp` | Dragonhide Skarn | **Nur 320 × 320 px** (alle anderen 1254 px), Alpha nur 49 Stufen; im Kampf hochskaliert und unscharf. | Kein Alphafehler, aber sichtbarer Qualitätsmangel bei einem Stufe-275-Gegner. Optional in Anhang B des Mira-Auftrags. |
| `chicken_pose_hit`, `chicken_pose_strike`, `chicken_pose_windup` (`.webp`) | Chicken (Arena-Posen) | Harte Kanten (52 bis 60 %), lila Krümel an Schwanzfedern; `hit` im Detail gesehen, `strike` und `windup` nur in Übersicht und Messung. | 2.5D-Arena pausiert, im Spiel nicht sichtbar. Erst bei Wiederaufnahme relevant. |

Das sind 15 Einträge mit zusammen 19 Dateien (Goblin-Serie 5, Hühner-Posen 3).

**Ohne Eintrag, nur zur Einordnung:** 73 Bilder des Altbestands (Stand 04.08., z. B. `goblin`, `boar`,
`thorn_wolf`, `forest_warden`) tragen einen ca. 1 px breiten hellen Saum aus weichen Kanten auf hellem
Ursprungsgrund. Er ist im Quellzoom sichtbar, verschwindet aber in Karten- und Kampfgröße (Beispiel
`contacts/referenz-altbestand-goblin.jpg`). Kein Austausch empfohlen; die Liste steht in `messwerte.csv`
(`fringe_white_pct` ≥ 15). Dunkle Konturen bei `gray_wolf`, `forest_hare`, `gk_crownguard` u. a. sind gemalte
Umrisslinien, kein Saum.

Ohne Befund: keine Schachbrettreste, keine mitgeschnittenen Bodenplatten, kein Motiv am Canvasrand abgeschnitten
(`iron_sentinel` berührt rechts 1 px mit Alpha ≤ 25, unsichtbar). Die Geister- und Magiemotive `void_herald`,
`sorrow_wraith`, `wailing_shade`, `aether_wraith`, `gravecliff_specter`, `spectral_stag`, `roc_void`,
`void_titan`, `abyssal_tide_serpent`, `soul_flayer` und `voidhusk_crusher` zeigen gewolltes Leuchten und Rauch
mit sauberem Alpha. Die 15 Raid-Gegner `gk_*` (1.4.0) und die 8 Codex-Bilder aus 1.3.0 sind sauber.

## Abgleich mit dem Audit vom 28.08.2026

Quelle: `CODEX/work/2026-08-28-asset-fehler-audit/REPORT.md` und `qa/confirmed-defects.csv` (24 Monster).
Berücksichtigt sind außerdem das Audit `CODEX/work/2026-09-09-asset-fehler-audit/` und die Ausbesserungswelle
vom 10.09., die 20 Monster ersetzt hat (im Branch seit Commit `373236a`). Sichtbogen:
`contacts/abgleich-2808-bestaetigte-24.jpg`.

**Behoben (19).** Alle sind heute sauber gemessen und in der Übersicht gesehen, 4 davon zusätzlich im Detail:
`ashfield_jackal` (Boden weg), `barrow_chanter`, `elite_black_golem`, `elite_black_witch`, `elite_coast_drowned`,
`elite_coast_siren`, `elite_crypt_butcher`, `elite_crypt_icemage`, `elite_crypt_pyroclasp`, `elite_high_roc`,
`elite_high_specter`, `elite_high_wyvern`, `elite_pastures_bull` (Atemwolke jetzt weich mit echtem Alpha),
`elite_slag_revenant`, `elite_wild_stag`, `elite_wild_wolf`, `feral_goat` (Bodenplatte weg), `iron_sentinel`,
`mire_wisp`.

**Noch fehlerhaft (5), Datei seit 04.08. unverändert:** `elite_coast_crab`, `elite_idol_warden`,
`elite_idol_wraith`, `elite_slag_ember`, `elite_slag_hexer`. Das Audit vom 09.09. hatte sie nur zur Beobachtung
vorgemerkt. Die Messung zeigt heute eindeutig Magenta-Keyreste und binäre Kanten; alle fünf stehen auf der
Austauschliste.

**Weißsaum-Prüfliste vom 28.08. (14 Monster, alle seit 04.08. unverändert):** `ember_elemental`,
`ashfield_wraith` und `frost_hexer` bleiben auf der Prüfliste (Art-Intent). `abyssal_tide_serpent`,
`aether_wraith`, `gravecliff_specter`, `roc_void`, `sorrow_wraith`, `soul_flayer`, `spectral_stag`,
`void_herald`, `void_titan`, `voidhusk_crusher` und `wailing_shade` zeigen gewolltes Leuchten; kein Austausch.
Die zwei Begleiter der damaligen Liste gehören nicht zu den Monstern und wurden nicht geprüft.

**Neu gegenüber beiden früheren Audits:**
- Austausch: `elite_pastures_boar`, `elite_border_rogue`, `elite_border_warlock`, `elite_border_butcher`,
  `elite_black_wolf`, `the_imp`.
- Prüfliste: `elite_ash_beetle`, `hollow_marrow`, `hollow_choir`, Goblin-Serie, `drazhan`, `scale_skarn`.

## Was nicht geprüft wurde

- Keine Darstellung im echten Spiel (kein Electron, kein Chromium, keine Spielstände). Die Kampfgröße ist aus CSS
  und Code-Kommentar abgeleitet, nicht gemessen. Zonenkulissen hinter den Karten wurden nicht nachgebaut;
  geprüft wurde auf drei Flachfarben.
- Nicht jedes Originalpixel jeder Datei wurde im Zoom angesehen: 38 Dateien im Detail, 9 in Kampfgröße, alle 152
  in Kartengröße. Feine Reste in nicht ausgewählten Bildstellen können übersehen sein.
- Begleiter (`assets/pets`), Porträts, Items und Kulissen gehörten nicht zum Auftrag.
- Identität und Stil (Anatomie, Ausrüstung, Passung zur Zone) wurden nicht bewertet, nur Alpha.

## Nach der Lieferung

Die Mira-Lieferung lässt sich read-only mit denselben Werkzeugen prüfen:

```text
python -I design/monster-asset-audit-2026-10-25/tools/measure.py <ausgabeordner> CODEX/assets/2026-10-25-monster-alpha-neuguss/delivery
```

Zielwerte:
- 256 Alpha-Stufen;
- `hard_step_pct` 0;
- `fringe_magenta_pct` und `fringe_green_pct` unter 0,3;
- Bildschirm-Lichtsaum (`tools/screenhalo.py`) nicht über dem heutigen 90. Perzentil von 3,4 %.

Danach Sichtprüfung mit `tools/contacts.py detail` und Vergleich neben dem Altbild.

## Dateien in diesem Ordner

- `REPORT.md`: dieser Bericht.
- `MIRA-AUFTRAG.md`: Auftragstext an Mira, 11 Motive plus optionaler Anhang B.
- `messwerte.csv`: alle Messwerte der 152 Dateien, inklusive Lichtsaum in Spielgröße.
- `contacts/`: 11 Austauschbelege, 4 Prüflistenbelege, 1 Referenzbeispiel, 1 Abgleichsbogen (zusammen ca. 2,4 MB).
- `tools/`: `measure.py`, `contacts.py`, `screenhalo.py`, `keycolor.py`, `whitecrumb.py` (alle read-only, ein
  Prozess, mit `python -I` starten).
