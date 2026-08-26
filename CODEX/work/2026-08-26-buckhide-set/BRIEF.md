# Asset-Brief — Wildleder-Set und Jagdbogen (6 Item-Bilder)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 26.08.2026 (Chef-Fund im 1.1.0-Test: „das ganze Buckhide-Set hat keine Icons").
> **Vorlage:** `CODEX/templates/ASSET-BRIEF.md`. Teil A ist ausgefüllt. Teil B, C und D füllt Mira.
> **Bindender Bildvertrag:** `design/asset-anforderungen.md` (Alpha, Auflösung, Benennung, Abnahme).
> **Prompts:** `CODEX/work/2026-08-26-buckhide-set/PROMPTS.md` (je Item ein fertiger Prompt in Englisch).

---

# Teil A – Auftraggeber-Briefing

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Wildleder-Set (5 Teile) und Jagdbogen |
| Auftraggeber | Chef (Testfund 26.08.2026), Briefing durch Claude |
| Projekt | Grim Reach |
| Zielversion oder Meilenstein | 1.1.0 (Nachlieferung, das Spiel läuft bis dahin mit Platzhalter-Symbolen) |
| Priorität | P2. Frühes Fernkampf-Set (Fernkampf 10), sichtbar in den ersten Spielstunden, Wiki, Bestiarium-Beute und Inventar. |
| Termin | so bald wie möglich, spätestens vor dem 1.1.0-Upload |
| Status | zur Produktion freigegeben |

## A2. Produktziel

**Was soll mit den Assets erreicht werden?**
Das Wildleder-Set ist die erste Leder-Rüstung nach dem Kuhleder (Fernkampf 10, „gehärtetes
Wildleder" vom Hirsch), der Jagdbogen der erste echte Bogen nach dem rissigen Übungsbogen. Beide
sind die einzigen sechs Ausrüstungsstücke im Katalog ohne Bild; sie fallen jedem neuen Spieler in
der ersten Stunde auf.

**Wo sieht der Spieler sie?**
Inventar und Bank (48 bis 96 px), Paperdoll, Item-Tooltip, Item-Wiki (Held-Bild bis 260 px),
Bestiarium-Beute (30 px), Schmiede-/Handwerksrezept. Immer auf dunklem Gravewood- oder Basalt-Grund.

**Was muss der Spieler innerhalb der ersten Sekunde erkennen?**
1. Den Slot (Haube, Wams, Beinlinge, Armschützer, Stiefel, Bogen) in derselben Perspektive und Größe
   wie die Bestandsstücke `cured_leather_cap/body/legs/vambraces/boots` und `bronze_shortbow`.
2. Das Material: dunkles, gehärtetes Wildleder mit Fellrand und Hirschhorn-Knebeln, eine Stufe
   rauer als das Kuhleder (`cowhide_jerkin`) und schlichter als das gegerbte Leder (`cured_leather_*`).
3. Kein Glühen, keine Aura: gewöhnliche Seltenheit, der Rahmen im Spiel zeigt sie.

**Woran erkennt Claude, dass der Auftrag erfolgreich ist?**
Sechs Dateien mit exakten IDs, echtes Alpha, 1024 px, Kontaktbogen neben `cured_leather_body` und
`bronze_shortbow`; im Spiel liegen Set und Bogen im selben Licht und derselben Sättigung wie die
Nachbarstücke.

## A3. Umfang

| Content-ID | Slot | Bild (ein Satz) |
|---|---|---|
| `buckhide_helm` | Helm | Enge Wildleder-Haube mit Fellrand und seitlicher Hornknebel-Schließe |
| `buckhide_body` | Körper | Ärmelloses Wildleder-Wams, vorn mit Hornknebeln geschnürt, Fellsaum an den Schultern |
| `buckhide_legs` | Beine | Wildleder-Beinlinge mit seitlicher Riemenschnürung und Kniepolstern aus doppeltem Leder |
| `buckhide_vambraces` | Handschuhe | Paar Wildleder-Armschützer mit Kreuzriemen und Hornknebel |
| `buckhide_boots` | Stiefel | Paar knöchelhohe Wildleder-Stiefel mit Fellumschlag und Riemen |
| `hunting_bow` | Waffe (Zweihand-Kurzbogen) | Schlichter Jagdbogen aus Eschenholz mit Lederwicklung am Griff, Sehne aus Sehnenfaser |

## A4. Regeln (nicht verhandelbar)

1. Echtes Alpha aus der Erzeugung. Kein Schachbrett, kein Magenta-Key, kein nachträgliches Keying.
2. Kein Glühen, keine Partikel, keine Aura auf Ausrüstung.
3. Perspektive, Größe und Licht (oben links) wie die Bestandsstücke desselben Slots; eine Serie, eine Sättigung.
4. Dateinamen exakt die Content-IDs, 1024 × 1024 PNG. Lieferung nach
   `CODEX/assets/buckhide-set-2026-08-26/fertig/` (plus `raw/` und `qa/`), danach HANDOFF und WORKLOG.
5. Nichts in den Renderer kopieren; den Einbau (640 px WebP q92, Archiv) macht Claude.

---

# Teil B – Produktionsplan (Mira)

<!-- codex:2026-08-26T21:05:00+02:00 -->

## B1. Serienauflösung

- Die fünf Rüstungsteile übernehmen Slotwinkel, mittige Freisteller-Komposition, Licht von oben
  links und ruhige Sättigung der jeweiligen `cured_leather_*`-Referenz.
- Gemeinsames Materialsignal: raues, dunkel rauchbraunes gehärtetes Hirschleder, kurze
  graubraune Fellkante, matte Hirschhorn-Knebel und sichtbare Handnähte.
- Hierarchie: gröber und wilder als frühes Kuhleder, aber eindeutig einfacher als das gegerbte
  Bestandsleder; keine Metallplatten, Ziernieten, Edelsteine oder ornamentale Prägung.
- Der Jagdbogen ist ein schlichter einteiliger Eschenholz-Selbstbogen. Seine Sehne bildet eine
  gerade Linie zwischen beiden Nocken; beide Wurfarme bilden eine belastbare, gleichmäßige
  C-Kurve ohne S-Knick, Bruch, Zusatzsehne oder asymmetrischen Totpunkt.

## B2. Produktionsweg

1. `buckhide_body` und `hunting_bow` als Material- und Formanker erzeugen.
2. Beide Anker auf natives RGBA, Slotlesbarkeit bei 48 px und beim Bogen auf mechanisch
   glaubwürdige Wurfarm-/Sehnengeometrie prüfen.
3. Die vier übrigen Rüstungsteile mit demselben Materialkern erzeugen.
4. Akzeptierte native Ausgaben unverändert nach `raw/` kopieren; Finals unter exakter ID nach
   `fertig/` übernehmen. Nur transparente Außenluft und Canvasbelegung dürfen bei Bedarf ohne
   Freistellung normiert werden.
5. Einzelmessung und Kontaktbögen auf dunklem, hellem und grellrosa Untergrund erstellen.

## B3. Abnahme-Gates

- 1024 × 1024 PNG, RGBA mit tatsächlich genutztem Alpha 0–255
- vollständig transparenter Außenrand; natürliche Teiltransparenz an Fellfasern
- genau ein Slotmotiv pro Datei, kein Körper, keine Hand, kein Mannequin
- klare Lesbarkeit des Slots bei 48 px und konsistente Serie bei 96 px
- kein Leuchten, keine Partikel, keine Aura, kein Bodenkontakt und kein Schlagschatten
- exakter Dateiname; keine Zusätze wie `final`, `v2` oder laufende Nummern
- Bogen-Gate zusätzlich: durchgängiger Holzstab, zwei Nocken, genau eine straffe Sehne,
  gleichmäßig funktionale Biegung und vollständige Form innerhalb des Canvas

# Teil C – QA-Protokoll (Mira)

<!-- codex:2026-08-26T21:28:00+02:00 -->

| Content-ID | Final | Alpha | sichtbare Höhe | Slot-/Inhaltsprüfung |
|---|---:|---:|---:|---|
| `buckhide_helm` | 1024² RGBA | 0–255 | 79,1 % | Haube, Fellrand, ein Hornknebel; bestanden |
| `buckhide_body` | 1024² RGBA | 0–255 | 88,3 % | ärmellos, drei Hornknebel, Schulterfell; bestanden |
| `buckhide_legs` | 1024² RGBA | 0–255 | 91,4 % | Seitenlacing, doppelte Kniepolster; bestanden |
| `buckhide_vambraces` | 1024² RGBA | 0–255 | 80,1 % | Paar, Kreuzriemen, Hornknebel; bestanden |
| `buckhide_boots` | 1024² RGBA | 0–255 | 85,2 % | Paar, Fellumschlag, Hornknebel; bestanden |
| `hunting_bow` | 1024² RGBA | 0–255 | 88,7 % | funktionale C-Kurve, zwei Nocken, eine Sehne; bestanden |

Zusätzliche Prüfung:

- alle Dateinamen entsprechen exakt den sechs Content-IDs
- vollständiger transparenter Sicherheitsrand und natürliche Teiltransparenz an Fellfasern
- keine deckende Fläche, kein gemaltes Transparenzmuster und kein Chroma-Key
- kein Glühen, keine Partikel, keine Aura, kein Rahmen, kein Boden und kein Schlagschatten
- heller, dunkler und grellrosa Kontaktbogen ohne auffälligen Farbsaum visuell bestanden
- 48-px-Kontaktbogen: alle fünf Slots und der Bogen bleiben unterscheidbar
- Referenzbogen: `hunting_bow` 88,7 % Höhe gegenüber `bronze_shortbow` 88,5 %
- Referenz-Wams: gleiches Licht und Slotwinkel; Buckhide sichtbar gröber und weniger veredelt

Verworfen: Der erste Beinling-Durchlauf besaß zwar einen RGBA-Kanal, trug aber eine deckende
braune Hintergrundfläche. Er wurde nicht nachbearbeitet, nicht gekeyt und nicht in Staging
übernommen; der Neuguss besitzt natives Alpha.

# Teil D – Übergabe (Mira)

<!-- codex:2026-08-26T21:28:00+02:00 -->

- Finals: `CODEX/assets/buckhide-set-2026-08-26/fertig/`
- native akzeptierte ImageGen-Ausgaben: `CODEX/assets/buckhide-set-2026-08-26/raw/`
- QA und Kontaktbögen: `CODEX/assets/buckhide-set-2026-08-26/qa/`
- verwendetes Promptset: `CODEX/work/2026-08-26-buckhide-set/PROMPTS-USED.md`
- Erzeugungsweg: eingebautes ImageGen, Standardmodus, natives Alpha
- Finalisierung: ausschließlich Größen-/Canvasnormierung unter Erhalt des erzeugten Alpha;
  keine Freistellung und kein Keying
- Renderer-Integration ausdrücklich nicht durchgeführt; Claude übernimmt WebP 640 px q92,
  Produktionsablage und Archivierung nach Gegenprüfung
