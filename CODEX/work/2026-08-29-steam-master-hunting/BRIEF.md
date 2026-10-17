# Asset-Brief — Steam-Erfolgsbild „Master Hunter“ (2 Dateien)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 29.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Hintergrund:** Das Steam-Set wächst von 67 auf 69 Erfolge (1.2.0): `MASTER_TAILORING` hast du am 28.08. geliefert, `MASTER_HUNTING` (Jagen Stufe 99) fehlt noch.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Steam-Erfolg Master Hunter |
| Zielversion | 1.2.0, Priorität P1 (Chef legt die Erfolge in Steamworks vor dem Upload an) |
| Umfang | `MASTER_HUNTING.jpg` + `MASTER_HUNTING_gray.jpg`, exakt wie das bestehende Set (256 × 256, deckendes RGB, Rahmen-Look) |
| **Bestandsreferenz (Pflicht)** | `CODEX/assets/steam-achievement-icons-2026-08-27/fertig/MASTER_LEATHERWORKING.jpg` und `_gray.jpg` sowie dein `MASTER_TAILORING.jpg` (`CODEX/assets/schneidern-2026-08-28/fertig/`): gleicher goldener Meisterrahmen, gleiche Plakettenfläche, gleiche Lichtführung; Graufassung als echte Ableitung der Farbversion |
| Motiv | Die Eisenschlinge des Jagen-Skills mit Ködertopf (wie dein `trap_set`-Bild aus dem Fasern/Jagen-Auftrag) auf dunklem Grund, davor ein Wurmköder-Bündel; Ashen-Iron-Palette, kein Text |
| Lieferung | `CODEX/assets/steam-master-hunting-2026-08-29/fertig/` (+ qa/ mit Kontaktbogen neben MASTER_LEATHERWORKING und MASTER_TAILORING), danach HANDOFF/WORKLOG |
| Nicht anfassen | Renderer, Content; die Dateien gehen direkt an den Chef für Steamworks |

# Teil B – Produktionsplan (Mira)

<!-- codex:2026-08-29T01:15:00+02:00 -->

- MASTER_LEATHERWORKING und MASTER_TAILORING als verbindliche Seriennachbarn prüfen.
- `trap_set.png`, `bait_worm.png` und `sidebaricon_hunting.webp` als Motivquellen ansehen.
- Eine quadratische Meisterplakette mit identischem Goldrahmen, dunkler Eisenfläche und
  Lorbeerkranz über das eingebaute ImageGen-Werkzeug erzeugen.
- Farbfinal auf 256 × 256 RGB JPEG normalisieren; Graufassung ausschließlich aus dem Farbfinal
  ableiten.
- Beide Fassungen neben Leatherworking und Tailoring im Kontaktbogen prüfen; Maße, Modus,
  Dateigröße und Hash protokollieren.

# Teil C – Produktionsprotokoll (Mira)

<!-- codex:2026-08-29T01:15:00+02:00 -->

- Bildmotiv: mechanisch plausible Eisenschlinge als Zentrum, Ködertopf rechts dahinter,
  gebundenes Wurmbündel im unteren Vordergrund.
- Palette und Material: Schwarzstahl, angelaufenes Altgold, Seil, Ton und gedämpftes Burgund;
  kein Glühen, kein Text und keine Landschaft.
- Raw: `CODEX/assets/steam-master-hunting-2026-08-29/raw/MASTER_HUNTING.png`.
- Finalisierung reproduzierbar über `finalize_master_hunting.py`.

# Teil D – Abnahme (Mira)

<!-- codex:2026-08-29T01:15:00+02:00 -->

- [x] Exakte Dateinamen `MASTER_HUNTING.jpg` und `MASTER_HUNTING_gray.jpg`
- [x] 256 × 256, deckendes RGB
- [x] Goldener Meisterrahmen und Lorbeerkranz wie die beiden Seriennachbarn
- [x] Motiv bei kleiner Steam-Darstellung klar lesbar
- [x] Kein Text, keine Zahl, kein Glow, keine Partikel
- [x] Gray direkt aus der Farbdatei abgeleitet
- [x] Kontaktbogen und maschinenlesbarer QA-Bericht vorhanden
- [x] Zusätzlicher Kontaktbogen bei realer 64-px-Steam-Darstellung vorhanden
