# Asset-Brief — Chef/Claude → Codex

> **Zweck:** Verbindliche Übergabe für einzelne Assets oder ganze Batches.  
> **Rollen:** Chef oder Claude liefern Produktziel, Ideen und feste Leitplanken. Codex verantwortet Art Direction, Produktionsauflösung, Generierung und Asset-QA. Der Chef behält die finale Produktentscheidung; Claude entscheidet im übertragenen CEO-Rahmen.  
> **Benutzung:** Dokument kopieren nach `CODEX/work/YYYY-MM-DD-auftrag/BRIEF.md`. Keine Zeile löschen; Unzutreffendes mit `entfällt` markieren.
>
> **Keine Zugangshürde:** Ein freier Chat-Auftrag, eine Skizze oder eine Bildreferenz genügt. Codex überträgt vorhandene Angaben selbst in die Vorlage, markiert Annahmen und fragt nur nach, wenn eine fehlende echte Produktentscheidung das Ergebnis wesentlich verändern würde.

---

# Teil A – Auftraggeber-Briefing

**Wird von Chef oder Claude ausgefüllt – oder von Codex aus ihrer freien Anweisung übertragen.** Kurze, eindeutige Antworten reichen. Alles, was nicht ausdrücklich fixiert wird, darf Codex als Designer sinnvoll entscheiden.

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | `[kurzer eindeutiger Name]` |
| Auftraggeber | `[Chef / Claude / gemeinsame Entscheidung]` |
| Projekt | `[Grim Reach / Kreidestadt / anderes]` |
| Zielversion oder Meilenstein | `[z. B. Grim Reach 0.3.0]` |
| Priorität | `[P0 Release-Gate / P1 wichtig / P2 normal / P3 optional]` |
| Termin | `[Datum + Uhrzeit / kein fester Termin]` |
| Status | `[Entwurf / zur Produktion freigegeben / Ersatz bestehender Assets]` |

## A2. Produktziel

**Was soll mit diesen Assets erreicht werden?**  
`[1–3 Sätze: Spielerwirkung, Feature, Problem oder Marketingziel]`

**Wo sieht der Spieler sie?**  
`[konkreter Screen, Karte, Tooltip, Kampf, Store, Event, Trailer …]`

**Was muss der Spieler innerhalb der ersten Sekunde erkennen oder fühlen?**  
`[z. B. Gebäudefunktion, Seltenheit, Bedrohung, Belohnung, Fraktion, Upgrade]`

**Woran erkennt Claude, dass der Auftrag erfolgreich ist?**  
`[messbare oder sichtbare Abnahmekriterien]`

## A3. Lieferumfang

| # | Asset-ID / Dateiname | Inhalt / Motiv | Typ | Varianten / Stufen | Priorität |
|---:|---|---|---|---|---|
| 1 | `[exakte ID]` | `[was dargestellt wird]` | `[Icon / Item / Monster / Porträt / Gebäude / Hintergrund / UI / Marketing]` | `[z. B. 0–3]` | `[P0–P3]` |
| 2 |  |  |  |  |  |

**Vollständigkeitsregel:**  
`[z. B. alle 15 Gebäude × Stufe 0–3; keine Teilmenge / erster Batch nur Stufe 0]`

## A4. Feste Auftraggeber-Entscheidungen

Nur Dinge eintragen, die Codex **nicht** gestalterisch ändern darf.

| Thema | Fixe Entscheidung |
|---|---|
| Kanon / Lore | `[Figur, Fraktion, Material, Epoche, Zustand …]` |
| Motiv / Funktion | `[was zwingend sichtbar sein muss]` |
| Stilbindung | `[bestehender Look oder konkrete Referenz]` |
| Farb-/Fraktionscode | `[fixe Farben/Symbole oder frei]` |
| Perspektive / Ansicht | `[fix oder Codex entscheidet]` |
| Text im Bild | `[kein Text / exakter Text / lokalisierbar]` |
| Gewalt-/Horrorgrenze | `[zulässig / vermeiden]` |
| Bestehendes Asset | `[behalten / ersetzen / weiterentwickeln]` |
| Weitere Verbote | `[darf auf keinen Fall vorkommen]` |

## A5. Designer-Freiheit

**Codex darf frei entscheiden:**  
`[z. B. Komposition, Beleuchtung, Materialdetails, Silhouette, Atmosphäre, Ornamentik]`

**Codex soll Varianten anbieten bei:**  
`[nur echte Entscheidungsstellen; sonst "keine, direkt beste Fassung liefern"]`

**Gewünschte Zahl an Konzeptvarianten vor Finalisierung:**  
`[0 / 2 / 3 / andere]`

## A6. Referenzen und Quellen

| Art | Pfad / Link / Bezeichnung | Was davon übernehmen? | Was ausdrücklich nicht? |
|---|---|---|---|
| Bestehendes Spielasset | `[Pfad]` | `[Form, Palette, Qualität …]` | `[Abweichungen]` |
| Mood-/Stilreferenz | `[Pfad oder Beschreibung]` |  |  |
| Lore-/Designquelle | `[design/*.md]` |  |  |
| Technische Quelle | `[Loader, README, Content-ID-Liste]` |  |  |

**Referenzrang bei Widerspruch:**  
`[welche Quelle gewinnt? Standard: aktuelle Chef-Entscheidung > bindendes Design-Doc > bestehende Art Direction > ältere Assets]`

## A7. Technische Leitplanken

Der Auftraggeber trägt bekannte Werte ein; bei freien Anweisungen überträgt Codex sie. Unbekannte Werte bleiben `Codex ermittelt`.

| Feld | Vorgabe |
|---|---|
| Zielpfad im Produkt | `[exakter Ordner / Codex ermittelt]` |
| Dateiformat | `[WebP / PNG / SVG / JPG / Codex ermittelt]` |
| Maße / Seitenverhältnis | `[z. B. 880×495, 16:9]` |
| Hintergrund | `[Standard: final transparent / ausdrücklich Chroma-Key / ausdrücklich deckend]` |
| Alpha-Rand / Beschnitt | `[Vorgabe / Codex ermittelt]` |
| Farbraum | `[sRGB, falls nichts anderes nötig]` |
| Dateigrößenlimit | `[Wert / keines bekannt]` |
| Auto-Discovery / Namensschema | `[Regel / Codex ermittelt]` |
| Muss vorhandenes Asset ersetzen? | `[Pfad / nein]` |
| Quelldatei zusätzlich liefern? | `[ja/nein + Format]` |

## A8. Batch-Konsistenz

**Welche Merkmale müssen über den gesamten Batch identisch bleiben?**  
`[Kamera, Maßstab, Licht, Grundfläche, Rahmen, Materialwelt, Charakterproportionen …]`

**Welche Merkmale müssen Fortschritt oder Unterschiede zeigen?**  
`[Upgrade-Stufen, Seltenheiten, Fraktionen, Biome, Rollen …]`

**Reihenfolge oder visuelle Hierarchie:**  
`[z. B. Stufe 0 Baustelle → I funktional → II befestigt → III ikonisch]`

## A9. Abnahme und Entscheidungsgrenzen

**Muss Chef oder Claude vor der finalen Generierung ein Konzept freigeben?**  
`[ja/nein]`

**Darf Codex technisch notwendige Korrekturen ohne Rückfrage durchführen?**  
`[ja; Standard / nein, folgende Grenzen: …]`

**Folgende Änderungen brauchen zwingend Auftraggeber-GO:**  
`[Kanon, Motivwechsel, Scope, Anzahl, Stilbruch, Terminverschiebung …]`

**Offene Entscheidungen, ohne die Codex nicht starten darf:**  
`[keine / Liste]`

---

# Teil B – Designauflösung

**Wird von Codex vor der Produktion ausgefüllt.** Codex löst das CEO-Briefing fachlich auf, ohne die Produktentscheidungen umzudeuten.

## B1. Verständnis des Auftrags

**Designziel in einem Satz:**  
`[Codex-Zusammenfassung]`

**Wichtigste visuelle Aussage:**  
`[was muss sofort lesbar sein?]`

**Annahmen von Codex:**  
`[jede Annahme explizit; "keine" ist erlaubt]`

**Gefundene Widersprüche oder fehlende Pflichtangaben:**  
`[keine / konkrete Liste mit Empfehlung]`

## B2. Art Direction

| Bereich | Codex-Entscheidung |
|---|---|
| Stil | `[konkrete gestalterische Übersetzung]` |
| Komposition | `[Fokus, Negativraum, Blickführung]` |
| Kamera / Perspektive | `[Ansicht, Brennweitenwirkung, Winkel]` |
| Silhouette | `[Erkennungsmerkmal auf kleiner Darstellung]` |
| Materialwelt | `[Holz, Eisen, Stein, Stoff …]` |
| Palette | `[Basis-, Akzent- und verbotene Farben]` |
| Licht | `[Richtung, Härte, Tageszeit, Kontrast]` |
| Atmosphäre | `[Nebel, Partikel, Wetter, aber kontrolliert]` |
| Detailgrad | `[auf reale Zielgröße abgestimmt]` |
| Batch-Klammer | `[Elemente, die alle Assets zusammenhalten]` |

## B3. Technische Produktionsspezifikation

| Feld | Finale Produktionsentscheidung |
|---|---|
| Arbeitsauflösung | `[größer als Ziel, falls sinnvoll]` |
| Zielauflösung |  |
| Zielformat |  |
| Hintergrund / Alpha |  |
| Beschnitt / Safe Area |  |
| Namensschema |  |
| Staging-Pfad | `CODEX/assets/[auftrag]/` |
| Produktionspfad nach Freigabe |  |
| Varianten- und Quellablage |  |

## B4. Generierungsplan

**Methode:**  
`[ImageGen neu / ImageGen Edit / manuelle Vektor-/Code-Arbeit / Hybrid]`

**Konsistenzstrategie:**  
`[Referenzbild, Master-Asset, Seed-ähnliche visuelle Klammer, feste Prompt-Basis, Batch-Reihenfolge]`

**Produktionsreihenfolge:**  
1. `[Master-/Ankerasset]`
2. `[Varianten oder Stufen]`
3. `[Restbatch]`
4. `[technische Aufbereitung und QA]`

**Master-Prompt beziehungsweise unveränderlicher Prompt-Kern:**  
```text
[wird von Codex geschrieben]
```

**Asset-spezifische variable Prompt-Felder:**  
`[Motiv, ID, Stufe, Materialien, Funktion, Akzent …]`

**Negativvorgaben:**  
```text
[unerwünschte Motive, Stilbrüche, Artefakte, Text, Logos, abgeschnittene Formen …]
```

## B5. Prüfplan vor Produktion

- [ ] CEO-Pflichtfelder ausreichend
- [ ] relevante Design-/Lore-Dokumente gelesen
- [ ] Ziel-Loader und Namensschema geprüft
- [ ] bestehende Assets in echter Zielgröße betrachtet
- [ ] Rechte-/Lizenzlage der Referenzen klar
- [ ] Konflikte mit Claudes Revier oder laufender Arbeit ausgeschlossen
- [ ] Freigabe-Gate aus A9 erfüllt

---

# Teil C – Lieferung und QA

**Wird von Codex nach der Produktion ausgefüllt.**

## C1. Gelieferte Dateien

| # | Datei | Asset-ID | Maße / Format | Status | Produktionspfad |
|---:|---|---|---|---|---|
| 1 |  |  |  | `[Final / Variante / verworfen]` |  |

## C2. Visuelle QA

- [ ] Motiv und Funktion auf Zielgröße sofort erkennbar
- [ ] Batch wirkt wie aus einem Guss
- [ ] Silhouette und Hauptkontrast funktionieren
- [ ] Keine unerwünschten Texte, Logos oder Wasserzeichen
- [ ] Keine typischen Generierungsfehler an Anatomie, Geometrie, Kanten oder Wiederholungen
- [ ] Keine abgeschnittenen wichtigen Formen
- [ ] Alpha/Chroma-Key/Hintergrund technisch sauber
- [ ] Farb- und Helligkeitswerte passen zum echten UI-Kontext
- [ ] Upgrade-/Seltenheits-/Fraktionsunterschiede sind klar, aber systemtreu
- [ ] Reduced-size-Preview und mindestens eine echte UI-Einbettung geprüft

## C3. Technische QA

- [ ] Dateinamen entsprechen exakt den IDs
- [ ] Maße, Format und Farbraum korrekt
- [ ] Dateigröße im Zielrahmen
- [ ] Keine versehentliche automatische Bindung aus dem Staging
- [ ] Zielpfad und Loader-Regel verifiziert
- [ ] Vorhandene Dateien nicht unbeabsichtigt überschrieben
- [ ] Quellen, Prompts und Rechte dokumentiert
- [ ] Relevanter headless Build/Test erfolgreich

## C4. Nachweis

**Preview-/Proof-Pfade:**  
`[Kontaktbogen, UI-Screenshot, Größenvergleich, Diff …]`

**Ausgeführte Checks:**  
`[Befehl oder visuelle Prüfung + Ergebnis]`

**Bekannte Grenzen:**  
`[keine / Liste]`

**Codex-Empfehlung:**  
`[freigeben / Variante X wählen / gezielte Korrektur]`

**Empfohlener Claude-Owner für Gegenprüfung:**  
`[asset-integrator / ui-dev / lore-dev / content-dev / kontrolleur / anderer]`

---

# Teil D – Abnahme

**Wird vom Chef oder von Claude im Rahmen seiner übertragenen Entscheidungsbefugnis ausgefüllt.**

**Entscheidung:**  
`[GO / GO mit kleinen Korrekturen / neue Variante / abgelehnt]`

**Gewählte Variante:**  
`[Datei oder Variante]`

**Verbindliche Korrekturen:**  
1. `[konkrete Änderung]`

**Darf danach integriert werden?**  
`[ja / nein / nur nach erneutem Gegencheck]`

**Zielversion / Changelog-Zuordnung:**  
`[Version / Task / Patchnote]`

**Abnahme durch / Datum:**  
`[Claude / Chef, YYYY-MM-DD]`
