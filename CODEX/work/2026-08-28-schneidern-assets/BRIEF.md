# Asset-Brief — Neuer Skill „Schneidern“ (Tailoring), 6 Dateien

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 28.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Hintergrund:** Der Skill „Handwerk“ (leatherworking: Lederzeug + Bögen) wird aufgeteilt; neu ist **Schneidern** (`tailoring`): Weben der fünf Stoffe (Nesselstoff, Leinen, Dornleinen, Geistertuch, Sternweb), alle Magier-Roben, alle Umhänge. Konzept: `design/handwerk-fasern-jagen/konzept.md` (Fasern/Stoffe), Skill-Split-Notiz folgt in `spec-technik.md`.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Schneidern (Tailoring), Skill-Set |
| Zielversion | 1.2.0 „Fasern und Fallen“, Priorität P1 (Skill ist im Bau, bis zur Lieferung Emoji-/Rückfall-Icons) |
| Umfang | 6 Dateien: Sidebar-Icon, Skill-Kulisse, Skill-Karte, Meisterring, Steam-Erfolgsbild (farbig + grau) |
| **Bestandsreferenz (Pflicht)** | Sidebar: `apps/client/src/renderer/assets/sidebar/sidebaricon_leatherworking.webp` und dein `sidebaricon_hunting.png` (freistehendes Objekt, KEIN Rahmen, keine Plakette). Kulisse/Karte: `assets/skill-backgrounds/leatherworking.webp` (2172 × 724) und `leatherworking.card.webp` (880 × 293), dazu `smithing.webp` als zweiter Nachbar. Ring: `assets/items/ring_master_leatherworking.webp` und `ring_master_fishing.webp` (dieselbe Serie: Ringansicht, Perspektive, Licht). Steam: `CODEX/assets/steam-achievement-icons-2026-08-27/fertig/MASTER_LEATHERWORKING.jpg` + `_gray.jpg` (gleiche Maße, gleicher Rahmen-Look). |
| Motivwelt | Nadel und Faden, Schere, Stoffballen in den fünf Stoffen (Nessel grau-grün, Leinen strohgold, Dornleinen dunkeloliv, Geistertuch silberweiß, Sternweb nachtblau mit schwachem Schimmer), Schneidertisch, Spindel/Webstuhl im Hintergrund; Ashen-Iron-Palette, gemalt, kein Comic, kein Text |
| Lieferung | `CODEX/assets/schneidern-2026-08-28/fertig/` (+ raw/, qa/ mit Kontaktbogen: Sidebar-Icon neben Handwerk und Jagen, Ring neben zwei Bestandsringen, Karte neben der Handwerk-Karte), danach HANDOFF/WORKLOG |
| Nicht anfassen | Renderer, Content; Einbau macht Claude (WebP; Sidebar/Ring q92, Kulisse q85, Karte q85 ≥ 880 px) |

## Die sechs Dateien (Namen exakt)

| Datei | Maße | Motiv |
|---|---|---|
| `sidebaricon_tailoring.png` | 1254 × 1254, echtes Alpha | Freistehend: gekreuzte Schere und Nadel mit Faden, dahinter ein kleiner gefalteter Stoffballen (Leinen); gleiche Größe im Bild und Lichtführung wie das Handwerk-Icon |
| `tailoring.png` | 2172 × 724, deckend | Skill-Kulisse: Schneiderwerkstatt in New Haven, Webstuhl links, Tisch mit Schnittmustern, an der Wand die fünf Stoffballen als Stufenreihe, warmes Lampenlicht; Bildmitte ruhig (dort liegt Text) |
| `tailoring.card.png` | 880 × 293, deckend | Karte: Ausschnitt derselben Werkstatt, Stoffballen und Schere im Fokus, rechte Hälfte ruhiger |
| `ring_master_tailoring.png` | 640 × 640, echtes Alpha | Meisterring Schneidern: dunkler Silberring mit einer Nadel als Schiene um den Reif und einem Fadenknoten als Fassung in Sternweb-Blau; kein Glühen |
| `MASTER_TAILORING.jpg` + `MASTER_TAILORING_gray.jpg` | wie `MASTER_LEATHERWORKING.jpg` | Steam-Erfolg „Meister-Schneider“: Nadel und Faden über gefaltetem Sternweb, im Rahmen-Look des bestehenden Sets; graue Variante wie beim Bestand |

## Regeln (Kurzfassung, s. `CODEX/RULES.md`)

- Stilabgleich mit dem Zielordner: erst die Bestandsdateien ansehen, dann generieren; Sidebar-Icon ohne Rahmen; Kulisse und Karte deckend, Icon und Ring mit echtem Alpha (kein Schachbrett, kein Key).
- Kein Text, keine Plakette im Bild; Materialien ohne Glühen (Sternweb darf schwach schimmern).
- QA wie gewohnt: Maße, Alpha-Kanal, Kontaktbögen.

# Teil B – Produktionsplan (Mira)

<!-- codex:2026-08-28T20:55:00+02:00 -->

1. Alle Pflichtreferenzen vor der Produktion visuell auf Motivgröße, Perspektive,
   Lichtführung, Freistellung und Rahmenlogik vergleichen.
2. Vier native Basismotive erzeugen: Sidebar-Icon und Ring als RGBA, Werkstatt als deckende
   Breitbildszene, Steam-Emblem als deckende quadratische Plakette.
3. `tailoring.card.png` aus exakt derselben Werkstattszene ableiten; die Steam-Graufassung aus
   exakt dem farbigen Erfolgsmotiv berechnen. Kein Neuwurf für diese beiden Varianten.
4. Raws unverändert archivieren, Finals auf die exakten Zielmaße normalisieren und transparenten
   Außenrand beziehungsweise deckendes RGB automatisiert messen.
5. Kontaktbögen mit den vorgeschriebenen Bestandsnachbarn anlegen und erst danach übergeben.

# Teil C – Produktion und Aufbereitung (Mira)

<!-- codex:2026-08-28T20:55:00+02:00 -->

- Vier ImageGen-Raws wurden ohne Chroma-Key erzeugt und unter
  `CODEX/assets/schneidern-2026-08-28/raw/` archiviert.
- Sidebar-Icon und Meisterring verwenden das native Alpha. Die Aufbereitung beschränkt sich auf
  Größen-/Positionsnormalisierung, transparente Nullpixel und die Korrektur des von ImageGen knapp
  unter 255 liegenden opaken Alpha-Plateaus; RGB-Farbkeying und Freistellung wurden nicht verwendet.
- Die Skill-Karte ist eine maßgerechte Ableitung der großen Kulisse und zeigt deshalb garantiert
  dieselbe Werkstatt. Die Graufassung des Steam-Erfolgs ist eine echte Graustufenableitung des
  farbigen JPGs.
- Reproduzierbare Aufbereitung und QA: `process_assets.py` in diesem Auftragsordner.

# Teil D – Abnahme (Mira)

<!-- codex:2026-08-28T20:55:00+02:00 -->

- [x] Sechs Dateien mit exakt den geforderten Namen vorhanden.
- [x] Maße: 1254², 2172 × 724, 880 × 293, 640² und zweimal 256².
- [x] Sidebar-Icon und Ring sind RGBA mit Alphaextrema 0–255 und Außenrand-Alpha 0.
- [x] Kulisse und Karte sind deckendes RGB; beide Steam-Dateien sind deckende RGB-JPGs.
- [x] Kein Rahmen/keine Plakette am Sidebar-Icon; kein Text und kein unzulässiges Glühen.
- [x] Graufassung stammt pixelidentisch in der Geometrie aus der Farbversion.
- [x] Kontaktbögen neben allen verlangten Bestandsnachbarn unter `qa/` geprüft.
- [x] Renderer, Content, Engine und `.claude/**` wurden nicht verändert.
