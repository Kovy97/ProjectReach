# Asset-Brief — Köder-Stufen (4 Item-Icons)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 28.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Konzept:** `design/handwerk-fasern-jagen/konzept.md`, Abschnitt „Nachtrag 28.08.: Köder-Stufen“.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Köder-Stufen (Angeln liefert den Köder fürs Jagen) |
| Zielversion | 1.2.0 „Fasern und Fallen“, Priorität P1 (Content ist bereits im Spiel, zeigt bis dahin ein Emoji) |
| Umfang | 4 Item-Icons, 640 × 640, echtes Alpha (kein Schachbrett, kein Magenta), WebP-Einbau macht Claude |
| **Bestandsreferenz (Pflicht)** | `CODEX/assets/fasern-jagen-2026-08-27/fertig/bait_worm.png` (Wurmköder als Wurm-Bündel, Korrektur vom 28.08.) und die Nachbarn im Items-Ordner des Clients (`apps/client/src/renderer/assets/items/`). **Das Item ist die Karte**: freistehendes Objekt, kein Rahmen, keine Szene, kein Boden, kein Glühen (Ausnahme Glühköder, s. u.). |
| Stil | Ashen-Iron-Palette, gemalt, leicht von oben-vorn, weiche Kante, ein Lichtsetup wie beim Wurmköder |
| Lieferung | `CODEX/assets/koeder-stufen-2026-08-28/fertig/` (+ qa/ mit Kontaktbogen der vier Köder NEBEN dem Wurmköder, damit die Stufung als Reihe lesbar ist), danach HANDOFF/WORKLOG |
| Nicht anfassen | Renderer, Content; Einbau macht Claude |

## Die vier Motive (Dateinamen exakt)

| Datei | Item | Stufe (Angeln) | Motiv |
|---|---|---|---|
| `bait_maggot.png` | Madenköder | 20 | Ein Bündel fetter, cremeweißer Maden in einer flachen Blattschale oder auf einem Stück Rinde; matt, feucht, kein Ekel-Effekt, keine Fliegen |
| `bait_crab.png` | Krebsköder | 40 | Aufgebrochenes Krebsfleisch mit Scherenstück, mit grobem Salz bestreut, auf einem Stück Sackleinen gebündelt; rostrot und blassrosa |
| `bait_squid.png` | Tintenfischköder | 60 | Drei dunkle, ölig glänzende Tintenfisch-Streifen mit einem Tentakelstück, mit Kordel zum Bündel gebunden; tiefes Blaugrau, leichter Perlmutt-Schimmer (kein Glühen) |
| `bait_glow.png` | Glühköder | 80 | Glühwürmer in ein Bündel aus Grashalmen und Kordel gebunden, das **schwach** grünlich-gold leuchtet (einzige erlaubte Ausnahme der Glüh-Regel: Stufe-5-Material wie Sternflachs, dezent, kein Strahlenkranz) |

## Regeln (Kurzfassung, s. `CODEX/RULES.md`)

- Stilabgleich mit dem Zielordner: vor dem Generieren die Bestandsdateien ansehen (Wurmköder + zwei beliebige Material-Items), gleiche Größe im Bild (Objekt füllt ~75 % der Fläche), gleiche Perspektive.
- Freisteller mit echtem Alpha; Prüfung wie bisher (Alpha-Kanal, keine Halo-Ränder).
- Kein Rahmen, keine Plakette, kein Schriftzug im Bild.
- Reihe muss stufig lesen: von schlicht (Maden) bis edel (Glühköder).

# Teil B – Produktionsplan (Mira)

<!-- codex: hier eintragen -->
