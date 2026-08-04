<!-- codex:2026-08-02T18:11:25+02:00 -->
# Verbindliche Produktionsinstruktion — New Haven City Assets

## Ziel

Alle Gebäude wirken, als wären sie mit derselben orthografischen Kamera in derselben Welt
aufgenommen worden. Ein Gebäude-Asset enthält ausschließlich das Bauwerk und fest mit ihm
verbundene Bauteile. **Kein Boden, kein Terrainpatch, keine gemalte Bodenellipse und kein
Schlagschatten.**

## Schritt 1 — Kamera, Projektion, Licht und Canvas sperren

- Projektion: orthografisch/isometrisch, keine perspektivische Flucht.
- Kamera-Azimut: `45°` im Uhrzeigersinn; sichtbare Hauptseiten zeigen nach Südwest und Südost.
- Kamera-Elevation: `35.264°`; vertikale Kanten bleiben vertikal, Bodenachsen laufen ungefähr
  `+30°/-30°` über den Bildschirm.
- Canvas: `1536 × 1536 px`, RGBA-PNG, sRGB, nicht vorbeschnitten.
- Anker: Weltkontaktpunkt des Gebäudes bei `x=768`, `y=1352` (`50 % / 88.02 %`).
- Licht: weiches Hauptlicht von Bildschirm oben links, 35° Höhe; kühles schwaches Umgebungslicht;
  keine zweite beliebige Lichtquelle.
- Art Direction: **befestigtes Dark-Fantasy-Grenzlager**, kein freundliches Dorf. Rußgeschwärzte
  Balken, grober Bruchstein, stumpfes Schmiedeeisen, dunkle Tierhaut und schwere geflickte Planen.
  Die Architektur wirkt unter Belagerungsdruck errichtet: gedrungen, zweckmäßig, repariert und
  verteidigungsbereit. Keine Fachwerk-Romantik, keine bunten Marktbuden, keine verspielten Dächer.
- Palette: Kohleschwarz, Aschgrau, kaltes Eisen, dunkel verwittertes Holz, schmutziges Ocker und
  tiefes Ochsenblutrot; sparsame Glut-, Kräutergrün- oder Messingakzente nur bei klarer Funktion.
- Finales Alpha: Außenrand vollständig transparent. Interne Kontaktschatten/AO am Gebäude sind
  erlaubt; Schatten auf einem imaginären Boden sind verboten.

Diese Werte dürfen in keinem Einzelprompt umformuliert oder „ungefähr“ angegeben werden.

## Schritt 2 — Vierer-Kalibrierungsset vor jeder Serie

Nur diese vier Assets in Rang I generieren:

1. `camp_townhall_1.png` — breite große Referenz.
2. `camp_fishing_hut_1.png` — kleine Referenz.
3. `camp_watchtower_1.png` — hohe Referenz.
4. `camp_seed_garden_1.png` — flache/breite Referenz.

Die vier Bilder werden gleichzeitig geprüft. Eine einzelne hübsche Datei kann das Set nicht
bestehen, wenn Kamera, Grundmaß oder Materialrendering voneinander abweichen.

## Schritt 3 — Technisches Datenblatt ist Teil jedes Prompts

Für jede Familie gelten die Werte aus `manifest.json`: Welt-Footprint, Größenklasse, Ziel-Bounds,
Baseline und visuelle Funktionsmerkmale. Rang II wird als Ausbau von Rang I, Rang III als Ausbau
von Rang II behandelt. Die Familie bleibt erkennbar, **die Silhouette darf aber nicht eingefroren
werden**. Das frühere 10-%-Near-Copy-Verfahren ist verworfen.

Verbindliche Ausbaulesbarkeit:

- Rang I: improvisierter Feldposten; einfache Funktion, schwere Planen oder rohe Palisadenhölzer,
  wenig geschlossener Raum, sichtbar prekär aber plausibel benutzbar.
- Rang II: befestigter Lagerbau; neue Dach-/Gebäudemasse, mindestens ein großer integrierter Anbau,
  Eisenbänder und ein klarer funktionaler Kapazitätsgewinn.
- Rang III: dauerhafte Festungsinstallation; nochmals klar veränderte Dachlinie oder Gebäudemasse,
  massiver Bruchstein-/Eisenkern und mindestens zwei sofort lesbare Kapazitätsmerkmale. Kein
  gemütlicher Dorfkern und kein repräsentatives Fachwerk.

Ein Rangwechsel darf nicht nur aus mehr Kisten, Beschlägen, Fenstern oder einem Skalierungsfaktor
bestehen. Er muss auch als 160-px-Vorschau ohne direkten A/B-Vergleich erkennbar sein.

## Schritt 4 — Reproduzierbares Referenz- und Promptpaket

`scripts/generate-packets.mjs` erzeugt aus denselben Feldern immer dieselbe Instruktion. Nach
Kalibrierungsfreigabe müssen jeder Generierung dieselben vier freigegebenen Referenzbilder
beiliegen. Zusätzlich liegt bei Rang II das freigegebene Rang-I-Bild derselben Familie bei; bei
Rang III Rang II. Freie Einmal-Prompts außerhalb dieses Pakets sind keine Produktionskandidaten.

## Schritt 5 — Intake und QA vor Sichtprüfung

Jedes Ergebnis wird zuerst nach `intake/` gelegt und dort geprüft auf:

- Dateiname und Rang,
- 1536×1536 RGBA-PNG mit echtem Alpha,
- null belegte Pixel am Außenrand,
- Bounding Box innerhalb ±8 % der Zielmaße,
- Gebäudezentrum innerhalb ±24 px um x=768,
- unterster sichtbarer Pixel innerhalb ±20 px um y=1352,
- kein Alpha-Teppich/Bodenpatch unter dem Gebäude,
- keine abgeschnittenen Teile.

Ein technisches `PASS` ersetzt die visuelle Prüfung nicht. Kamera, Licht und Material werden
danach anhand des Kalibrierungssets kontrolliert.

Zusätzlich gilt ein visueller Rang-Gate-Test: Jede Familie wird als 3er-Reihe bei 160 px Höhe
gerendert. Rang II und III bestehen nur, wenn Dachlinie/Gebäudemasse und Funktionsausbau in dieser
Ansicht eindeutig voneinander unterscheidbar sind.

## Schritt 6 — Responsive Kartenabnahme und Tag/Nacht

- Kartenbühne bleibt immer `16:9`; `object-fit: contain` oder eine gleichwertige mathematische
  Transformation darf ihre Projektion nicht verändern.
- Gebäudepositionen und Anker werden in Prozent/normalisierten Kartenkoordinaten gespeichert,
  nicht in Fensterpixeln.
- Dasselbe freigestellte Gebäude wird für 1920×1080 und 3440×1440 benutzt.
- Nacht ist eine kosmetische Umleuchtung derselben Geometrie. Separate KI-Neugenerierungen sind
  verboten, weil sie Silhouette und Kamera verändern würden. Optional zulässig ist eine exakt
  deckungsgleiche Emissive-Maske für Fenster/Feuer.

## Produktionsgate

Die 45 Gebäude-Ränge beginnen erst nach explizitem GO auf das vollständige Vierer-
Kalibrierungsset. Die verworfenen V1/V2-Serien dürfen ausschließlich als Fehlerbeispiele dienen.
