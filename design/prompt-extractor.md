# Prompt-Extractor — Charakter für Bildgeneratoren exportieren

Chef-Auftrag 28.08.2026. Ein Klick im Charakterbogen exportiert alles, was ein Spieler braucht, um
sich seinen Charakter mit der aktuellen Ausrüstung von ChatGPT (oder einem anderen Bildgenerator)
malen zu lassen: ein Ausrüstungs-Blatt als PNG, das Portrait als PNG und ein fertiges englisches
Prompt als TXT.

## Ablauf

1. Knopf **„Charakter exportieren"** (`.btn-iron.btn-iron--sm`) in der Kit-Zeile des
   Charakterbogens, direkt unter den drei Ausrüstungs-Kit-Knöpfen
   (`apps/client/src/renderer/pages/CharacterPage.tsx`, `.cs-export-row`). Tooltip: „Speichert
   Ausrüstungs-Blatt, Portrait und ein fertiges Prompt für Bildgeneratoren."
2. Der Renderer baut drei Dateien rein clientseitig (kein DOM-Screenshot — Canvas 2D, unabhängig
   von der UI-Skalierung, immer scharf):
   - **`kit.png`** (2048×1152, Ashen-Iron-Look): Kopfzeile mit Name, Gesamtlevel, aktivem Kampfstil
     (Melee/Ranged/Magic, aus der Hauptwaffe abgeleitet — `computeStats().style`) und aktivem Kit;
     links das Portrait groß; rechts alle 14 Ausrüstungsplätze als Kacheln mit Item-Bild,
     englischem Item-Namen, seltenheits-gefärbtem Rahmen/Label und Slot-Beschriftung. Leere Plätze
     zeigen „empty". Alle Texte sind bewusst Englisch, unabhängig von der UI-Sprache — das Blatt
     begleitet das ebenfalls englische Prompt.
   - **`portrait.png`**: das Portrait-Asset des Charakters (WebP/PNG/hochgeladenes Bild), 1:1 per
     Canvas nach PNG gewandelt, Originalgröße.
   - **`prompt.txt`**: fertiges englisches Prompt, s. Vorlage unten. Wird zusätzlich in die
     Zwischenablage kopiert.
3. Ein neuer IPC-Handler `export:characterKit(characterName, files)` (main-Prozess) schreibt die
   drei Dateien nach `<Downloads>\Grim Reach Exports\<sicherer Charaktername>-<yyyy-mm-dd-hhmm>\`
   und öffnet den Ordner im Explorer. `GR_EXPORT_DIR` überschreibt den Wurzelordner (Tests/Sim-
   Harness laufen ohne echtes Downloads-Verzeichnis eines Spielers).
4. Erfolg: Toast „Export gespeichert — Das Prompt liegt in der Zwischenablage, der Ordner ist
   offen." Fehlerfall: Toast mit Grund (keine Desktop-App-Bridge / Dateien konnten nicht
   geschrieben werden / Bilder konnten nicht erstellt werden).

## Charakterdaten, die es (bewusst) nicht gibt

Der Chef-Auftrag nannte „Volk" und „Geschlecht falls bekannt" für die Charakterzeile des Prompts.
Das Spieler-Charakter-Datenmodell (`CharacterState`, packages/shared) hat kein `race`/`gender`-Feld
— nur Tavern-NPCs (`TavernGuestDef.race`) haben eines. Die Charakterzeile lässt beides deshalb
bewusst aus, statt erfundene Werte zu behaupten: `Character: <Name> — Total level <N>, a <style>
fighter.`

## Dateien

| Datei | Zweck |
| --- | --- |
| `apps/client/src/renderer/util/characterExportPrompt.ts` | Reine Prompt-Text-Funktion `buildCharacterExportPrompt`, unit-getestet. |
| `apps/client/src/renderer/util/characterExportCanvas.ts` | Canvas-Renderer für `kit.png`/`portrait.png` (async, lädt Bilder/Fonts). |
| `apps/client/src/renderer/util/characterExport.ts` | Ein-Klick-Orchestrator: baut alle drei Dateien, ruft die IPC-Bridge, Zwischenablage, Toast. |
| `apps/client/src/main/characterExportFiles.ts` | Reine Dateisystem-Logik (Namens-Bereinigung, Schreiben) — kein `electron`-Import, headless testbar. |
| `apps/client/src/main/characterExport.ts` | Dünne IPC-Fassade (`export:characterKit`), Allowlist der drei Dateinamen, Downloads-Pfad. |
| `apps/client/src/preload/index.ts` | Bridge `window.hearthforge.export.characterKit(...)`. |
| `apps/client/src/vite-env.d.ts` | Typdeklarationen `CharacterExportFileInput`/`CharacterExportResult`/`CharacterExportBridge`. |

## Prompt-Vorlage

```
Create a full-body illustration of my character from the dark-fantasy RPG Grim Reach. Use the
attached portrait.png for face, hair and skin tone, and the attached kit.png as the exact
reference for every piece of equipment.

Character: <Name> — Total level <N>, a <melee fighter|ranged marksman|spellcaster>.

Equipment:
Helmet: <EN name> (<rarity>) — <EN description, falls vorhanden>
Neck: …
Right Hand: …
Left Hand: …
Chest: …
Legs: …
Hands: …
Feet: …
Cape: …
Ring: …
Ring: …
Tool: …
Tool: …
Tool: …

Weapon style: <Melee|Ranged|Magic> (mainhand: <EN name>, offhand: <EN name>).

Style: painted dark-fantasy realism, muted ashen-iron palette of dark iron, bronze and parchment
tones; veteran presence, confident stance; a generic, immediately readable fantasy archetype — no
folk costume, no comedy. No text, no watermark, no rarity glow or shimmer on the gear. Background: fully
transparent. Deliver a PNG with a real alpha channel, no scene, no backdrop, no ground shadow, and do not paint a
checkerboard pattern instead of transparency. Aspect ratio 3:4 (portrait orientation).

*Chef 28.08.: ChatGPT lieferte mit der alten Regel („smoky battlefield background“) einen gemalten Hintergrund; seitdem
verlangt das Prompt echte Transparenz (Muster unserer Freisteller-Regel, kein Schachbrett).*

Attach kit.png and portrait.png with this prompt.
```

Leere Slots erscheinen als `<Slot>: empty`. Der Stilabsatz folgt der Spieler-Charakter-Ästhetik
(Memory `player-char-aesthetik.md`) und der Regel „kein Rarity-Glow" (Memory
`no-rarity-glow-on-equipment.md`).
