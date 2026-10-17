# Asset-Brief — Kampfeffekte, Testlauf (6 Dateien)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 27.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Prompts:** `PROMPTS.md`. **Konzept:** `design/combat-fx/konzept-kampfeffekte.md` (§3 Format ist bindend).
> Zweck des Testlaufs: Format, Größe und Lesbarkeit der Effekte auf dem Battlescreen prüfen, BEVOR die Serie (~40) läuft.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Kampfeffekte Testlauf |
| Zielversion | 1.2.x (Kampfgefühl), Priorität P2 |
| Umfang | 6 Dateien: `fx_missile_arcane.png` (Geschoss, 256 × 128), `fx_impact_arcane.png`, `fx_impact_fire.png`, `fx_slash_sword.png`, `fx_blood_red.png`, `fx_pet_bite.png` (je Streifen 768 × 256 = drei Felder à 256 × 256: Beginn, Höhepunkt, Ausklang) |
| Hintergrund | echtes Alpha, kein Schachbrett, kein Key, kein Boden, kein Schatten; Motiv mittig je Feld mit Rand |
| Stil | Ashen-Iron-Palette, gemalt, kein Comic-Stern, kein Text; Glühen NUR bei Magie (Ausnahme von der Rüstungs-Regel, das sind Effekte) |
| Blut | gedeckt und kurz, kein Gore, keine Körperteile (Steam-Freigabe) |
| Richtung | Geschoss fliegt nach RECHTS; Slash von oben links nach unten rechts; der Renderer spiegelt für die Gegnerseite |
| Lieferung | `CODEX/assets/kampfeffekte-testlauf-2026-08-27/fertig/` (+ raw/, qa/ mit Kontaktbogen auf dunklem Grund UND über einem Battlescreen-Ausschnitt, z. B. `apps/client/src/renderer/assets/battlescreens/ashfields.webp`), danach HANDOFF/WORKLOG |
| Nicht anfassen | Renderer; Einbau macht Claude (WebP q90, `assets/fx/`) |

**Woran Claude Erfolg erkennt:** 6 Dateien mit exakten Namen und Maßen, Alpha-Prüfung bestanden, die drei Felder eines Streifens lesen sich als EIN Effekt in drei Momenten (gleiche Position, gleiche Farbwelt), Kontaktbogen über dem Battlescreen zeigt Lesbarkeit bei 256 px.

# Teil B – Produktionsplan (Mira)
<!-- codex:2026-08-27T20:27:00+02:00 -->

- Sechs eigenständige native RGBA-Motive mit eingebautem ImageGen erzeugen.
- Streifen im Rohformat als exakt drei gleich breite Quadratzellen erzeugen.
- Raws unverändert sichern; finale Zellen alphaerhaltend auf 240 × 240 skalieren und mit acht
  transparenten Pixeln Innenrand in 256 × 256 setzen.
- Geschoss proportional auf 256 × 128 skalieren.
- Alpha, Maße, Außenränder und jede einzelne Zelle messen.
- Kontaktbogen bei nativer Anzeigegröße auf dunklem Grund und über `ashfields.webp` prüfen.

# Teil C – QA-Protokoll (Mira)
<!-- codex:2026-08-27T20:27:00+02:00 -->

- 6/6 PNG RGBA mit echtem Alpha und exakten Maßen.
- 5/5 Streifen enthalten drei sichtbare Zellen mit transparentem Sicherheitsrand.
- Geschossrichtung, Zustandsfolge, Mittelpunktstabilität und Lesbarkeit visuell geprüft.
- Blut gedeckt und ohne Gore; keine Assets enthalten Boden, Schatten oder deckenden Hintergrund.
- Beide Pflicht-Kontaktbögen bestanden. Detailwerte unter
  `CODEX/assets/kampfeffekte-testlauf-2026-08-27/qa/qa.json`.

# Teil D – Übergabe (Mira)
<!-- codex:2026-08-27T20:27:00+02:00 -->

- Finals: `CODEX/assets/kampfeffekte-testlauf-2026-08-27/fertig/`
- Native Raws: `CODEX/assets/kampfeffekte-testlauf-2026-08-27/raw/`
- QA: `CODEX/assets/kampfeffekte-testlauf-2026-08-27/qa/`
- Produktionsprompts und Quellenkarte liegen neben diesem Brief.
- Keine Renderer-Datei verändert; Einbau und Laufzeitprüfung bleiben bei Claude.
