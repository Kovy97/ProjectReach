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

_(füllt Mira)_

# Teil C – QA-Protokoll (Mira)

_(füllt Mira)_

# Teil D – Übergabe (Mira)

_(füllt Mira)_
