# Asset-Brief — Kampfeffekte, Serie Welle 1 (33 Dateien)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 27.08.2026 nach den Chef-Entscheiden D1–D5. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Prompts:** `PROMPTS.md` (Tabelle + je Datei ein Prompt). **Konzept:** `design/combat-fx/konzept-kampfeffekte.md`.
> **Voraussetzung:** der Testlauf (`CODEX/work/2026-08-27-kampfeffekte-testbatch/`) ist von Claude abgenommen; seine sechs Dateien gehören zur Serie und werden übernommen.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Kampfeffekte Welle 1 |
| Zielversion | 1.2.x (Kampfgefühl), Priorität P2, stückweise lieferbar (jede Datei ersetzt ihren Rückfall im Spiel) |
| Umfang | 33 Dateien: 7 Magie-Geschosse (256 × 128) + 7 Einschläge, 4 Slashes, Pfeil + Pfeil-Einschlag, 3 Spritzer + Block + Fehlschlag, 6 Begleiter, 2 Crit-Overlays (alle Streifen 768 × 256, drei Felder) |
| Themen | arkan violett, Feuer glutorange, Frost eisblau, Blitz blassgelb, Gift giftgrün, Leere purpurschwarz, Aether blassgold; je Thema EIN Akzent |
| Hintergrund | echtes Alpha, kein Schachbrett, kein Key, kein Boden, kein Schatten; Motiv mittig je Feld mit Rand; gleicher Mittelpunkt in allen drei Feldern |
| Stil | Ashen-Iron-Palette, gemalt, keine Comic-Sterne, kein Text; Glühen nur bei Magie/Aether/Crit |
| Blut | gedeckt und kurz, kein Gore, keine Körperteile, keine Lachen (D3, Steam-Freigabe) |
| Richtung | Geschosse nach RECHTS, Slashes von oben links nach unten rechts, Stoß nach rechts; der Renderer spiegelt für die Gegnerseite (D5) |
| Lieferung | `CODEX/assets/kampfeffekte-welle-1-2026-08-27/fertig/` (+ raw/, qa/ mit Kontaktbogen auf dunklem Grund und über einem Battlescreen-Ausschnitt), danach HANDOFF/WORKLOG; gern in Teilen (Familie für Familie) |
| Nicht anfassen | Renderer; Einbau macht Claude (WebP q90, `assets/fx/`, Auto-Discovery) |

**Reihenfolge-Vorschlag:** A Magie (14) → B Slashes und Pfeil (6) → C Blut/Block/Fehlschlag (5) → D Begleiter (6) → Crit-Overlays (2).

**Woran Claude Erfolg erkennt:** exakte Dateinamen und Maße, Alpha-Prüfung bestanden, die drei Felder eines Streifens lesen sich als EIN Effekt in drei Momenten, die sieben Themen sind auf dem Kontaktbogen auf einen Blick unterscheidbar, Blut bleibt gedeckt.

# Teil B – Produktionsplan (Mira)

<!-- codex:2026-08-27T23:02:59+02:00 -->

1. Die sechs technisch und visuell bestandenen Testlauf-Dateien als Serienanker übernehmen;
   `fx_slash_sword.png` dabei unter der von der Serie geforderten ID `fx_slash_cut.png` führen.
2. Die 27 neuen Motive einzeln mit nativem RGBA-Alpha erzeugen, gegliedert nach Magie,
   Waffen/Pfeil, Trefferreaktionen, Begleiter und Crit.
3. Geschosse alphaerhaltend auf 256 × 128 setzen. Jeden Dreiphasen-Rohstreifen in seine drei
   Quellzellen teilen, jede Zelle alphaerhaltend auf 240 × 240 skalieren und mit acht Pixeln
   transparentem Sicherheitsrand in eine 256er-Zelle setzen.
4. Exakte IDs, PNG/RGBA, Maße, transparenten Außenrand, weiche Teiltransparenz und sichtbaren
   Inhalt in jeder der drei Zellen automatisiert prüfen.
5. Alle 33 Dateien bei nativer Effektgröße auf dunklem Grund und über dem
   Ashfields-Battlescreen gemeinsam visuell abnehmen.

# Teil C – QA-Protokoll (Mira)

<!-- codex:2026-08-27T23:02:59+02:00 -->

- **Technik:** 33/33 bestanden. Acht Geschosse sind exakt 256 × 128; 25 Dreiphasen-Streifen
  sind exakt 768 × 256. Alle Finals sind PNG RGBA mit echtem Alpha, weicher Teiltransparenz
  und vollständig transparentem Außenrand. Jede der 75 Streifenzellen enthält sichtbaren
  Effektinhalt.
- **Produktion:** kein Chroma-Key, kein nachträgliches Freistellen. Die Normalisierung änderte
  nur Größe, Zellteilung und transparentes Padding.
- **Magielesbarkeit:** Arkan, Feuer, Frost, Blitz, Gift, Leere und Aether sind auf beiden
  Kontaktbögen durch Form und Einzelakzent klar getrennt; sämtliche Geschosse zeigen nach rechts.
- **Bewegung:** Beginn, Höhepunkt und Ausklang sind in den Streifen unterscheidbar. Slash-Cut und
  Heavy laufen diagonal, Thrust horizontal nach rechts; der Pfeil ist mechanisch gerade und
  eindeutig rechtsgerichtet.
- **Inhalt:** rotes Blut, Ichor und Knochenstaub bleiben kurz, gedeckt und ungorig. Block,
  Fehlschlag, sechs Begleiterfamilien und beide Crit-Ringe bleiben bei 256 px erkennbar.
- **Sichtprüfung:** `qa/contact-dark.png` und `qa/contact-ashfields.png` vollständig geprüft.
  Die Effekte bleiben sowohl im hellen Himmel als auch auf dem dunklen, strukturierten Boden
  des Battlescreens lesbar.
- Vollständige Einzelmesswerte: `CODEX/assets/kampfeffekte-welle-1-2026-08-27/qa/qa.json`.

# Teil D – Übergabe (Mira)

<!-- codex:2026-08-27T23:02:59+02:00 -->

- **Finals:** `CODEX/assets/kampfeffekte-welle-1-2026-08-27/fertig/` — 33 exakt benannte PNGs.
- **Raws:** `CODEX/assets/kampfeffekte-welle-1-2026-08-27/raw/` — 33 native
  Erzeugungsausgaben; die sechs Testanker sind bewusst nachvollziehbar dupliziert.
- **QA:** `CODEX/assets/kampfeffekte-welle-1-2026-08-27/qa/` — Maschinenbericht,
  Kontaktbogen dunkel, Kontaktbogen Ashfields und handliche Vorschauen.
- **Reproduktion:** `generated-source-map.json`, `PROMPTS-FINAL.md` und
  `prepare-and-qa.py` liegen neben diesem Brief.
- Renderer, Content, Engine, Save-Daten und `.claude/**` wurden nicht verändert. WebP-
  Konvertierung, Einbau, Gegnerspiegelung und Laufzeitprüfung bleiben bei Claude.
