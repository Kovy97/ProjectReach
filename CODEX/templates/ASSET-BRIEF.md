# Asset-Brief — Chef / Codex-Lead → Design und QA

<!-- codex:2026-09-09T20:12:15+02:00 -->

> **Zweck:** Verbindliche Übergabe für einzelne Assets oder ganze Batches.  
> **Rollen:** Der Chef liefert Produktziel und feste Leitplanken. Codex-Lead konkretisiert den erteilten Auftrag. Art-Director/Mira verantwortet Designauflösung und Produktion; die technische Gegenprüfung übernimmt eine getrennte Fachrolle, wenn verfügbar. Der Chef behält die finale Produktentscheidung. Integration nur bei vorhandener Freigabe.
> **Benutzung:** Dokument kopieren nach `CODEX/work/YYYY-MM-DD-auftrag/BRIEF.md`. Keine Zeile löschen; Unzutreffendes mit `entfällt` markieren.
>
> **Keine Zugangshürde:** Ein freier Chat-Auftrag, eine Skizze oder eine Bildreferenz genügt. Codex überträgt vorhandene Angaben selbst in die Vorlage, markiert Annahmen und fragt nur nach, wenn eine fehlende echte Produktentscheidung das Ergebnis wesentlich verändern würde.
>
> <!-- codex:2026-08-23T18:21:18+02:00 --> **Bindender Bildvertrag für Grim Reach:** Vor jeder Produktion `design/asset-anforderungen.md` lesen. Freisteller erfordern echtes natives Alpha; Chroma-Key, gemaltes Schachbrett und nachträgliches Keying sind unzulässig. Die exakte Content-ID ist zugleich der finale Dateiname.

---

# Teil A – Auftraggeber-Briefing

**Wird vom Chef ausgefüllt oder von Codex-Lead aus dessen freiem Auftrag übertragen.** Kurze, eindeutige Antworten reichen. Gestalterische Details darf Codex im erteilten Umfang entscheiden; Produkt-/Kanon-/Scopeentscheidungen bleiben beim Chef.

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | `[kurzer eindeutiger Name]` |
| Auftraggeber | `[Chef / Codex-Lead im benannten Chefauftrag]` |
| Projekt | `[Grim Reach / Kreidestadt / anderes]` |
| Zielversion oder Meilenstein | `[aktuelle freigegebene Zielversion / kein Releasebezug]` |
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

**Woran erkennen Chef und prüfende Fachrolle, dass der Auftrag erfolgreich ist?**
`[messbare oder sichtbare Abnahmekriterien]`

## A3. Lieferumfang

| # | Asset-ID / Dateiname | Inhalt / Motiv | Typ | Varianten / Stufen | Priorität |
|---:|---|---|---|---|---|
| 1 | `[exakte Content-ID; zugleich finaler Dateiname]` | `[was dargestellt wird]` | `[Icon / Item / Monster / Porträt / Gebäude / Hintergrund / UI / Marketing]` | `[z. B. 0–3]` | `[P0–P3]` |
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
| Blick-/Flugrichtung | `[am tatsächlichen Consumer und Bestandsnachbarn prüfen; Spieler/Pets/Gegner nicht pauschal gleichrichten]` |
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
`[Quellenrang nach AGENTS/RULES. Bei UI-Assets zuerst Zielbestand prüfen; widersprechende alte Brief-/Promptvorgaben melden, nicht automatisch übernehmen. Eine ausdrückliche aktuelle Chef-Stiländerung bleibt maßgeblich.]`

## A7. Technische Leitplanken

Der Auftraggeber trägt bekannte Werte ein; bei freien Anweisungen überträgt Codex sie. Unbekannte Werte bleiben `Codex ermittelt`.

| Feld | Vorgabe |
|---|---|
| Zielpfad im Produkt | `[exakter Ordner / Codex ermittelt]` |
| Dateiformat | `[WebP / PNG / SVG / JPG / Codex ermittelt]` |
| Maße / Seitenverhältnis | `[z. B. 880×495, 16:9]` |
| Hintergrund | `[Freisteller: echtes natives Alpha / Szene oder Kulisse: ausdrücklich deckend]` |
| Alpha-Erzeugung | `[nativ im Quellbild; kein Chroma-Key, kein Schachbrett, kein nachträgliches Keying]` |
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

**Muss der Chef vor der finalen Generierung ein Konzept freigeben?**
`[ja/nein]`

**Darf Codex technisch notwendige Korrekturen ohne Rückfrage durchführen?**  
`[ja; Standard / nein, folgende Grenzen: …]`

**Folgende Änderungen brauchen zwingend Auftraggeber-GO:**  
`[Kanon, Motivwechsel, Scope, Anzahl, Stilbruch, Terminverschiebung …]`

**Offene Entscheidungen, ohne die Codex nicht starten darf:**  
`[keine / Liste]`

---

# Teil B – Designauflösung

**Wird von Art-Director/Mira vor der Produktion ausgefüllt.** Codex löst den Auftrag fachlich auf, ohne die Produktentscheidungen umzudeuten.

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
| Bindende Content-ID / finaler Dateiname |  |
| Native-Alpha-Produktionsweg bestätigt | `[ja / nicht erforderlich, da deckende Szene]` |
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

<!-- codex:2026-08-23T18:21:18+02:00 -->
**Pflichtblock für jeden Grim-Reach-Freisteller:**
```text
Output requirement: a native transparent PNG/WebP with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fur, feathers, smoke, fog, cloth fibers, glow, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark unless the brief explicitly requires it.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

**Dateinamenspflicht außerhalb des Bildprompts:** Das geprüfte Finalformat heißt exakt
`<content_id>.png` beziehungsweise `<content_id>.webp`; keine Zusätze wie `final`, `v2` oder
Variantennummern.

**Asset-spezifische variable Prompt-Felder:**  
`[Motiv, ID, Stufe, Materialien, Funktion, Akzent …]`

**Negativvorgaben:**  
```text
[unerwünschte Motive, Stilbrüche, Artefakte, Text, Logos, abgeschnittene Formen …]
```

## B5. Prüfplan vor Produktion

- [ ] Auftrag und Pflichtfelder ausreichend
- [ ] `design/asset-anforderungen.md` vollständig gelesen
- [ ] relevante Design-/Lore-Dokumente gelesen
- [ ] Ziel-Loader und Namensschema geprüft
- [ ] exakte Content-ID und finaler Dateiname vor Generierung bestätigt
- [ ] bei Freistellern ein echter nativer Alpha-Produktionsweg bestätigt; kein Keying eingeplant
- [ ] bestehende Assets in echter Zielgröße betrachtet
- [ ] zwei bis drei Bestandsnachbarn des Zielordners wirklich angesehen und dokumentiert
- [ ] Rechte-/Lizenzlage der Referenzen klar
- [ ] Konflikte mit zugewiesenen Fachrevieren oder laufender Arbeit ausgeschlossen
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
- [ ] Alphakanal vorhanden und tatsächlich benutzt; kein Karo und kein Vollflächen-Hintergrund
- [ ] Silhouette auf grellrosa Prüffläche ohne Farbsaum kontrolliert
- [ ] Auflösungsuntergrenze aus `design/asset-anforderungen.md` erreicht
- [ ] Dateiname entspricht exakt der Content-ID
- [ ] Ausrüstung besitzt kein Schimmern, Glühen oder Leuchten; Ausnahme nur freigegebene Runen/Tränke
- [ ] Blick-/Flugrichtung entspricht dem tatsächlichen Consumer und der Festlegung in A4
- [ ] Kontaktbogen mit mindestens zwei Bestandsnachbarn; Silhouette auch auf hell/dunkel geprüft
- [ ] Farb- und Helligkeitswerte passen zum echten UI-Kontext
- [ ] Upgrade-/Seltenheits-/Fraktionsunterschiede sind klar, aber systemtreu
- [ ] Reduced-size-Preview und mindestens eine echte UI-Einbettung geprüft

## C3. Technische QA

- [ ] Dateinamen entsprechen exakt bestätigten IDs/Loadervertrag einschließlich Groß-/Kleinschreibung; keine ungeplanten `final`-/`v2`-/Variantenanhänge
- [ ] Maße, Format und Farbraum korrekt
- [ ] Freisteller sind PNG/WebP mit echtem Alpha; kein JPG und keine nachträgliche Key-Matte
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

**Zuständige Codex-Fachrolle für Gegenprüfung:**
`[asset-integrator / ui-dev / lore-dev / content-dev / kontrolleur / anderer]`

---

# Teil D – Abnahme

**Produkt-/Stilabnahme durch den Chef; technische Abnahme durch Codex-Lead auf Basis der QA.** Eine bereits im Auftrag erteilte Produktions-/Integrationsfreigabe darf übernommen werden. Keine neue Produktfreigabe durch Selbstabnahme erfinden.

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
`[Chef: Produktfreigabe / Codex-Lead: technische QA, YYYY-MM-DD, Beleg]`
