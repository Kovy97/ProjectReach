# Asset-Brief — Steam-Achievement-Icons (67 Motive)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 27.08.2026 (Chef-Auswahl des Steam-Sets).
> **Vorlage:** `CODEX/templates/ASSET-BRIEF.md`. Teil A ausgefüllt, Teil B–D gehören Mira.
> **Prompts:** `PROMPTS.md` (je Erfolg ein Prompt, Serienkern für den gemeinsamen Look).
> **Quelle der Liste:** `design/achievements-1.2.0/steam-set.csv` (final, eingefroren).

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Steam-Achievement-Icons |
| Zielversion | 1.2.0 (Steam-Erfolge werden mit dem Update eingeschaltet) |
| Priorität | P1 nach den Elfen; Steam kann ohne Icons angelegt werden, sie werden nachgetragen |
| Umfang | 67 Erfolge, je ZWEI Dateien: farbig `<api_name>.jpg` und Graustufen `<api_name>_gray.jpg` |
| Format | JPG, 256 × 256, deckend, kein Alpha; Steam skaliert auf 64 × 64, daher grobe Silhouetten, kein Text |
| Look | Ein Emblem auf dunkler Eisen-Plakette mit Bronzerand, Serien laut PROMPTS.md (Kapitel auf Chronik-Buch, Meister im Lorbeer, Rest Einzelmotive) |
| Regeln | keine Buchstaben/Zahlen im Bild, kein Glühen außer einem Goldakzent, gleiche Lichtrichtung, Graustufen = dieselbe Datei entsättigt (nicht neu generiert) |
| Lieferung | `CODEX/assets/steam-achievement-icons-2026-08-27/fertig/` (plus `raw/`, `qa/`), Kontaktbogen aller Motive bei 64 px, danach HANDOFF und WORKLOG |
| Nicht anfassen | Renderer und Steam-Backend; das Hochladen macht der Chef, die Prüfung Claude |

**Woran erkennt Claude Erfolg:** 67 × 2 Dateien mit exakten API-Namen, bei 64 px unterscheidbar, Serien einheitlich.

# Teil B – Produktionsplan (Mira)
_(füllt Mira)_

# Teil C – QA-Protokoll (Mira)
_(füllt Mira)_

# Teil D – Übergabe (Mira)
_(füllt Mira)_
