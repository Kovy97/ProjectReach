# Auftrag: Asset-Bibliothek für den Arena-Scene-Builder (ERSETZT den früheren Clutter-Nachtrag; Chef-Reaktivierung 04.08.)
**Von:** Claude · **Datum:** 2026-08-04 · **Priorität:** hoch

Mira — Chef-Entscheid: Aus der Arena wird ein **Scene Builder**. Ich baue gerade das Werkzeug, mit dem der Chef 2D-Elemente frei in der 3D-Szene platziert, skaliert und rotiert (WYSIWYG im echten Arena-Renderer mit echtem Zonen-Licht). **Deine Aufgabe: die Asset-Bibliothek, aus der er baut.** Der Chef sucht parallel selbst nach Assets — deine Serie ist die stilistische Referenz, an der sich alles andere messen muss.

## Was gebraucht wird: eine PALETTE, keine Einzelstücke
Da der Chef von Hand platziert, zählt VIELFALT in Varianten. Zwei Ebenen:

**A) Generisches Natur-/Boden-Set (zonenübergreifend einsetzbar):**
- Grasbüschel: 4-6 Varianten (klein/mittel/hoch, sattgrün bis vertrocknet)
- Steine/Felsen: 5-8 Varianten (Kiesel bis hüfthoher Brocken)
- Büsche/Sträucher: 3-4 Varianten (grün, kahl, dornig)
- Totholz: Äste, Stumpf, umgestürzter Stamm (2-3)
- Bodendetails: Blumen-Tuffs, Pilzgruppe, Wurzelwerk (2-3)

**B) Zonen-Sets für die 3 Pilot-Zonen (je 5-8 Stücke, Charakter-Details):**
- `pastures`: Zaunsegmente, Heuballen, Feldblumen, Weidepfahl
- `crypt`: Knochenhaufen, Steinschutt, Kerzengruppen, zerbrochene Platte, kleines Grablicht
- `slagpit`: Schlacke-Brocken, Glut-Nester, verbogene Träger, Aschehaufen, Kettenstück

## Format-Vertrag (wie Runde 1, ein Zusatz)
- Transparente WebP, echtes Alpha, saubere Fußkante (Baseline-Messung stellt sie auf den Boden).
- Größen: Clutter-Teile ~150-500px, größere Stücke (Stamm, Träger) bis ~900px.
- **Benennung NEU:** `arena_lib_<kategorie>_<nn>.webp` fürs generische Set (z.B. `arena_lib_grass_01`), `arena_<zoneId>_lib_<nn>.webp` für Zonen-Sets — der Builder liest die Palette automatisch aus dem Asset-Ordner, Namen erscheinen als Beschriftung.
- Palette gedeckt/malerisch wie Runde 1; bei 30-80px Darstellung noch als Form lesbar.
- Lieferung mit Kontakt-Tafel (alle Stücke auf neutralem Grund, wie deine Prüftafeln) + QA.

## Staging & Rückgabe
`CODEX/AssetControl/arena-scene-builder-lib/` (Unterordner `generic/`, `pastures/`, `crypt/`, `slagpit/`), HANDOFF-Notiz, dann diese Datei nach `inbox/done/`. Das Intake in den Builder mache ich — jede Nachlieferung erscheint dort automatisch. Runde 2 (die 8 restlichen Zonen) folgt NACH dem ersten Chef-Bau-Erlebnis mit dem Builder, dann inkl. Zonen-Lib im Vertrag.
