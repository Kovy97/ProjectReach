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

<!-- codex:2026-08-27T11:40:00+02:00 -->

- Die eingefrorenen 67 API-Namen werden direkt aus
  `design/achievements-1.2.0/steam-set.csv` übernommen; Dateinamen werden nicht aus Anzeigenamen
  abgeleitet.
- Drei visuelle Anker definieren den Guss: `CH01_THE_FIRST_PAGE` für die 21 Kapitel,
  `MASTER_WOODCUTTING` für die 20 echten Skill-Meister und `BLOODED` für die 26
  Einzelmotive. `CHAMPIONS_BANE` und `MASTER_OF_TRADES` bleiben trotz Präfix Einzelmotive.
- Farbmotive entstehen mit dem eingebauten ImageGen-Werkzeug als hochauflösende
  Arbeitsfassungen. Die drei Anker werden innerhalb des Sets als Bildreferenzen für
  Plakettenbau, Material, Licht und Malgrad verwendet.
- Finals werden rein mechanisch auf 256 × 256 px normalisiert, deckend als JPG ausgegeben und
  ohne zweite Erzeugung entsättigt. Keine Renderer- oder Steam-Integration.
- Eigentliche Lesbarkeitsabnahme erfolgt auf Kontaktbögen, in denen jedes Icon exakt 64 × 64 px
  groß ist.

# Teil C – QA-Protokoll (Mira)

<!-- codex:2026-08-27T11:40:00+02:00 -->

- **PASS:** 67/67 Content-IDs und 134/134 erwartete JPG-Dateien vorhanden.
- **PASS:** Jede Datei ist 256 × 256 px, JPEG und vollständig deckend; kein Alpha.
- **PASS:** Exakter Dateisatz `<api_name>.jpg` plus `<api_name>_gray.jpg`, ohne fehlende oder
  unerwartete Namen.
- **PASS:** Jede Graufassung wurde aus derselben normalisierten Farbfassung abgeleitet.
  Pixelprüfung bestätigt für alle 67 Dateien identische R-, G- und B-Kanäle.
- **PASS:** Kontaktbögen Farbe und Graustufen verwenden die Steam-Zielgröße 64 × 64 px.
  Serienkennung, grobe Silhouetten und zentrale Motive wurden dort visuell geprüft.
- **PASS:** Keine sichtbaren Buchstaben, Zahlen, Wasserzeichen, Partikeleffekte oder leuchtenden
  Auren. Gold wird als Materialakzent geführt.
- Maschinenlesbares Protokoll:
  `CODEX/assets/steam-achievement-icons-2026-08-27/qa/qa.json`.

# Teil D – Übergabe (Mira)

<!-- codex:2026-08-27T11:40:00+02:00 -->

- **GO für Claudes Gegenprüfung.**
- Finale 134 Steam-JPGs:
  `CODEX/assets/steam-achievement-icons-2026-08-27/fertig/`.
- Hochauflösende akzeptierte Arbeitsfassungen:
  `CODEX/assets/steam-achievement-icons-2026-08-27/raw/`.
- Kontaktbögen und QA:
  `CODEX/assets/steam-achievement-icons-2026-08-27/qa/`.
- Tatsächlich eingesetzte Produktionsprompts:
  `CODEX/work/2026-08-27-steam-achievement-icons/PROMPTS-FINAL.md`.
- Reproduzierbarer mechanischer Finalisierer:
  `CODEX/work/2026-08-27-steam-achievement-icons/build-final.mjs`.
- Nichts in Renderer oder Steam-Backend kopiert.
