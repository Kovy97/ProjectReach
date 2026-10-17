<!-- codex:2026-08-27T23:41:00+02:00 -->
# Produktionsnotiz — Fasern, Stoff und Jagen

## Erzeugungsweg

- Eingebautes ImageGen-Werkzeug, Standardmodus.
- Ein Motiv pro Aufruf beziehungsweise eindeutig getrenntem Serienauftrag.
- Für alle Freisteller natives RGBA direkt aus der Erzeugung; kein Chroma-Key und kein
  nachträgliches Freistellen.
- Die erste Faser-Proberunde mit Referenzbild-Eingabe wurde verworfen, weil sie teils deckende
  oder gemalte Hintergründe lieferte. Sie liegt nicht in `raw/` oder `fertig/`.
- Die akzeptierte Serie wurde ohne Bild-Input erzeugt; Bestandsreferenzen dienten der visuellen
  Stilprüfung durch Mira.
- Zwei Referenz-Edits der Falle wurden ebenfalls verworfen, weil sie RGB statt RGBA lieferten.
  Der finale gemeinsame Fallenstreifen wurde ohne Bild-Input direkt mit nativem Alpha erzeugt.

## Verwendete Promptstruktur

Die 26 motivspezifischen englischen Blöcke aus `PROMPTS.md` wurden vollständig verwendet. Dazu
kamen je Familie diese Produktionsbindungen:

- Items: Ashen-Iron-Inventarstil, weiches Licht oben links, großer klarer Einzelgegenstand,
  keine UI, kein Boden und echtes transparentes RGBA mit Teiltransparenz an Fasern.
- Fasern: identische horizontale Bündelkomposition.
- Saaten: identischer gefalteter Stoffbeutel, Winkel und Maßstab.
- Stoffe: identischer gefalteter Stoffballen, Winkel und Maßstab.
- Fallen: dasselbe geschmiedete Schlingenmodell, dieselbe Kamera, Beleuchtung und Größe in drei
  klaren Zuständen. Für belastbare Familienähnlichkeit wurden die drei Zustände gemeinsam auf
  einem nativen transparenten Streifen erzeugt und anschließend alphaerhaltend getrennt.
- Foraging: deckende 16:9-Ortskarte, Ressource im Vordergrund, begehbare Mitte, tiefer Hintergrund.
- Aktionskarte: deckende quadratische Nahszene ohne sichtbare Person.
- Sidebar: dunkle Eisenplakette mit dünnem Bronzerand; außerhalb der Plakette echtes Alpha.

## Aufbereitung

Akzeptierte Raws wurden unverändert kopiert. Freisteller wurden nur entlang ihres vorhandenen
Alphakanals zugeschnitten, proportional skaliert und auf transparentem Zielcanvas zentriert.
Deckende Szenen wurden proportional auf das Zielverhältnis zugeschnitten und skaliert.
Die drei Fallen-Finals sind Zellen des unverändert gesicherten `raw/trap_states_strip.png`.

## Korrekturlauf 28.08.2026

<!-- codex:2026-08-28T00:45:00+02:00 -->

- Vor der Neuproduktion wurden drei Sidebar- und drei Material-/Action-Bestandsdateien aus den
  tatsächlichen Renderer-Zielordnern visuell geprüft. Die Plaketten- und Szenenvorgaben des
  ursprünglichen Briefs widersprachen dem Bestand und wurden deshalb verworfen.
- `sidebaricon_hunting`: neuer nativer RGBA-Guss als freistehende eiserne Jagdschlinge mit
  Seilrolle, Dreiviertelansicht, oberes linkes Licht, ohne Rahmen, Plakette oder Hintergrund.
- `bait_worm`: neuer nativer RGBA-Guss als drei verschnürte dunkle Regenwürmer, ein Wurm frei
  eingerollt, ohne Eimer, Topf, Boden oder Szene.
- Aufbereitung ausschließlich alphaerhaltend: Alpharahmen zuschneiden, proportional auf 84 %
  beziehungsweise 76 % Zielbelegung skalieren, auf transparentem Zielcanvas zentrieren.
- `dig_bait` wurde nicht ersetzt. Alte Plaketten-, Eimer- und Aktionskartenfassungen wurden aus
  der aktiven Lieferung entfernt und unter `qa/` recoverable archiviert.
- Die Korrektur-Kontaktbögen stellen jedes neue UI-Asset zwei Bestandsnachbarn sowie einer
  48-px-Abnahme gegenüber. Kein Renderer-Asset wurde verändert.

## Meisterring Jagen — Nachtrag 28.08.2026

<!-- codex:2026-08-28T01:20:00+02:00 -->

- Prompt 27 gegen `ring_master_fishing.webp` und `ring_master_foraging.webp` auf Kamerawinkel,
  Ringmasse, Materialdichte, Beleuchtung und Rahmenlosigkeit abgeglichen.
- Der referenzgestützte Erstwurf und ein Transparenz-Edit wurden nicht übernommen: Beide waren
  RGB-Dateien mit tatsächlich gemaltem Schachbrett. Ihre Quellen bleiben außerhalb der Lieferung
  im ImageGen-Ausgabeordner erhalten; sie wurden weder gekeyt noch ausgeschnitten.
- Der akzeptierte dritte Wurf wurde ohne Bild-Input direkt als natives RGBA erzeugt. Das Motiv
  wurde nur entlang des bestehenden Alphakanals zugeschnitten, proportional auf maximal 550 px
  Motivmaß skaliert und auf einem transparenten 640-px-Canvas zentriert.
- Automatische Prüfung: RGBA 640 × 640, Alphaextrema 0–255, `edge_alpha_max = 0`, weiche
  Teiltransparenz vorhanden. Kontaktbogen auf dunklem Grund bei Normal- und 48-px-Größe sowie
  grellrosa Kantenprüfung visuell bestanden.
