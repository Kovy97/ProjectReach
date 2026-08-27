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

## Verwendete Promptstruktur

Die 26 motivspezifischen englischen Blöcke aus `PROMPTS.md` wurden vollständig verwendet. Dazu
kamen je Familie diese Produktionsbindungen:

- Items: Ashen-Iron-Inventarstil, weiches Licht oben links, großer klarer Einzelgegenstand,
  keine UI, kein Boden und echtes transparentes RGBA mit Teiltransparenz an Fasern.
- Fasern: identische horizontale Bündelkomposition.
- Saaten: identischer gefalteter Stoffbeutel, Winkel und Maßstab.
- Stoffe: identischer gefalteter Stoffballen, Winkel und Maßstab.
- Fallen: dasselbe geschmiedete Schlingenmodell, dieselbe Kamera, Beleuchtung und Größe in drei
  klaren Zuständen.
- Foraging: deckende 16:9-Ortskarte, Ressource im Vordergrund, begehbare Mitte, tiefer Hintergrund.
- Aktionskarte: deckende quadratische Nahszene ohne sichtbare Person.
- Sidebar: dunkle Eisenplakette mit dünnem Bronzerand; außerhalb der Plakette echtes Alpha.

## Aufbereitung

Akzeptierte Raws wurden unverändert kopiert. Freisteller wurden nur entlang ihres vorhandenen
Alphakanals zugeschnitten, proportional skaliert und auf transparentem Zielcanvas zentriert.
Deckende Szenen wurden proportional auf das Zielverhältnis zugeschnitten und skaliert.
