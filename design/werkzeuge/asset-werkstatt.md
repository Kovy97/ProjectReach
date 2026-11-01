# Asset-Werkstatt (Dev-Overlay) — Bedienung für den Chef

Zweck: im laufenden Spiel eine Fläche, einen Knopf oder einen Rahmen anklicken und live andere Texturen, Rahmen, Größen und Anordnungen probieren. Das Ergebnis kommt als **Bauauftrag (Markdown)** oder CSS zu Claude, der es fest einbaut. Es ändert nur die Darstellung, nie Spielstand oder Spiellogik. Das Werkzeug ist bewusst nur Deutsch.

## Schnellstart

1. **Strg + Umschalt + Alt + A** öffnet die Werkstatt (nochmal drücken = ausblenden). Das Panel sitzt rechts, Kopfleiste ziehen verschiebt es.
2. Der **Auswahlmodus** ist beim Öffnen an: Zeiger über das Spiel bewegen, das Element unter dem Zeiger wird umrandet (`tag.klasse`). **Mausrad hoch/runter oder Pfeil hoch/runter** springt zum Eltern-/Kind-Element (man trifft oft ein inneres Element, z. B. das Icon statt den Knopf). **Klick oder Enter** wählt, **Esc** bricht ab. Im Auswahlmodus reagiert das Spiel nicht auf Klicks. Erneut wählen: Knopf „Auswählen“.
3. Unter **Texturen / Assets** ein Bild anklicken (Suchfeld oben, Gruppen nach Ordner) und dann **als Hintergrund**, **als Rahmen** oder (bei `<img>`) **als Bild** anwenden. Eigene Datei: PNG/WebP/JPG ins Feld ziehen oder „wählen“.
4. Unter **Regler** feinjustieren: Hintergrund (size, repeat, position, Tönung), Rahmen (slice, fill, width, outset, repeat, border-width), Filter (brightness, contrast, saturate, hue-rotate), opacity. Das „x“ neben einem Regler setzt ihn zurück.
5. **Geltungsbereich** (unter „Auswahl“): „nur dieses Element“ oder „alle mit Selektor“ (Selektor frei editierbar, darunter steht die Trefferzahl).

## Layout live gestalten (neu 31.10.)

Gleiche Mechanik und gleicher Geltungsbereich wie alle Regler („nur dieses Element“ / „alle mit Selektor“). Bereich **Layout** im Panel, sobald ein Element gewählt ist:

- **Box-Modell:** width/height, min-/max-, padding und margin je Seite (Haken „alle gleich“), radius, box-sizing, Hintergrundfarbe. Je Zeile Regler + Zahlenfeld + Einheit (px, %, vw, vh, em, auto/none); „x“ setzt zurück. Ungesetzte Werte zeigen den aktuellen berechneten Wert.
- **Layout:** display; bei Flex direction/wrap/justify/align-items/gap; bei Grid Spalten (Freitext oder „n gleiche Spalten“), Zeilen, gap. Darunter „Als Kind“: flex-grow/shrink/basis, align-self, order, grid-column/-row (Schnellwahl span).
- **Position:** position, top/right/bottom/left, z-index, verschieben X/Y, scale (mit Spiegeln), rotate.
- **Text:** font-size (Haken „mit --text-scale“ lassen, sonst umgeht die Schrift die Option Textgröße), weight, line-height, letter-spacing, align, Farbe, transform.
- **Sichtbarkeit:** ausblenden (display:none, A/B-fähig), opacity, overflow, „Klicks durch“.
- **Ziehen am Element:** Am gelben Auswahlrahmen sitzen 8 Griffe (Breite/Höhe) und ein türkises „+“ (verschieben). Umschalt = 4-px-Raster. Die Werte erscheinen sofort in den Reglern. Verschieben setzt translate (bei eingefügten Bildern left/top).
- **Einfügen:** erst ein Ziel-Element wählen. „Bild als Kind“ (absolut im Ziel; ggf. setzt die Werkstatt dort position:relative) oder „Bild danach“; das Bild kommt aus der Asset-Liste oder per Drag-and-drop (eigene Dateien bis ca. 3 MB bleiben lokal erhalten). „Container als Kind/danach“ legt ein leeres Element an (Fläche/Rahmen wie gewohnt). Eingefügtes ist ziehbar, wird gespeichert und nach Neustart wieder eingesetzt; fehlt das Ziel (andere Seite, umgebaut), steht in der Liste „Ziel nicht gefunden“. Reine Darstellung, nie Spielstand.
- **Notiz:** je Override „Was soll das bewirken?“ – Claude liest sie im Bauauftrag.
- **Rückgängig/Wiederholen:** Knöpfe „Zurück/Vor“ oder Strg+Z / Strg+Y, solange das Panel den Fokus hat (nicht in Textfeldern). Ein Zug am Griff oder ein Reglerzug ist ein Schritt. In der Liste: „wählen“ springt zum Element, „dupl.“ kopiert die Einstellungen auf das gerade gewählte Element (bei eingefügten Elementen: Kopie daneben).

### Bauauftrag für Claude

Unten bei „Aktive Overrides“: **Bauauftrag kopieren** (Zwischenablage, Text erscheint auch im Feld) oder **Bauauftrag speichern** (`asset-werkstatt-bauauftrag.md`). Pro Override: Seite des Spiels, Selektor/Pfad, Textausschnitt zur Wiedererkennung, geänderte Eigenschaften **alt → neu** (alt = berechneter Wert beim ersten Ändern), Asset-Pfade, eingefügte Elemente samt Ziel, Notiz. Diese Datei an Claude geben; der baut daraus sauberen Code. Tipp: Overrides erst auf der jeweiligen Seite anlegen, dann steht die richtige Seite im Auftrag.

Speicherformat v2; alte v1-Stände laden unverändert weiter.

## Mehrfachauswahl (neu 31.10.)

Rahmen und Hintergrund (und alle anderen Regler) lassen sich auf mehrere Elemente gleichzeitig anwenden.

- **Hinzufügen:** im Auswahlmodus **Strg + Klick** (oder Strg + Enter) fügt das Element unter dem Zeiger zur Auswahl hinzu bzw. entfernt es wieder; der Auswahlmodus bleibt dabei an. Ein normaler Klick ersetzt die ganze Auswahl durch ein Element (wie bisher). Knopf **Weitere hinzufügen**: Auswahlmodus, in dem jeder Klick hinzufügt/entfernt (Esc beendet). Knopf **Gleichartige hinzufügen**: alle Elemente mit dem Selektor des primären Elements (Feld unter „alle mit Selektor“, sonst Tag + Klassen), höchstens 300, je als Einzelelement.
- **Anzeige:** alle Gewählten haben einen gelben Rahmen, das primäre (★, zuerst gewählt) einen dickeren. Im Panel steht „n Elemente gewählt“ mit Name und Textausschnitt je Eintrag, **primär** (Eintrag zum primären machen), **×** (entfernen) und **Auswahl leeren**. **Esc** (nicht im Auswahlmodus) behält nur das primäre Element; ein weiteres Esc verhält sich wie gewohnt.
- **Anwenden:** Hintergrund, Rahmen, Filter, Layout-Regler, Notiz wirken auf alle Gewählten. Jedes Element bekommt sein **eigenes Override** (eigener Pfad), der Bauauftrag bleibt also je Element sauber. Das Rahmen-Erbe (neuer Rahmen übernimmt Slice/Breite/Outset/Repeat des alten) gilt je Element einzeln. Bei abweichenden Werten bleibt das Zahlenfeld leer („gem.“), oben im Bereich Regler steht, was sich unterscheidet; eine Änderung setzt dann für alle denselben Wert. Mehrfachauswahl gilt immer „je Element“ (der Geltungsbereich „alle mit Selektor“ ist dabei gesperrt).
- **Rückgängig/Wiederholen:** eine Änderung an n Elementen ist ein Schritt.
- **Layout:** die Layout-Regler wirken auf alle. Die Ziehgriffe (Größe/Verschieben am Rahmen) wirken nur auf das **primäre** Element. „dupl.“ in der Override-Liste kopiert weiter auf das primäre Element.
- **Speicher:** kein neues Format; die Auswahl selbst wird nicht gespeichert (nur die Overrides, wie bisher). Alte Stände (v1/v2) laden unverändert.

## Weiteres

- **A/B aus / A/B an** (Kopfleiste): alle Overrides kurz aus- und einschalten, um vorher/nachher zu vergleichen.
- **Aktive Overrides**: Liste mit Einzel-Entfernen (x) und „Alles zurücksetzen“.
- **CSS kopieren**: alle Overrides als lesbare CSS-Regeln mit Asset-Pfaden relativ zu `apps/client/src/renderer/` (als Kommentar und im `url("…")`). Der Text erscheint zusätzlich in einem Feld zum manuellen Kopieren. Diesen Text an Claude geben. **JSON speichern** legt `asset-werkstatt.json` im Download-Ordner ab.
- Die Versuche bleiben in `localStorage` (`hearthforge:assetLab`) und überleben einen Neustart (auch bei geschlossenem Panel). Eigene Dateien werden nicht gespeichert und sind in der Liste als „Datei nicht gespeichert“ markiert. Zum Löschen: „Alles zurücksetzen“.
- Die Liste enthält nur UI-Ordner (`ui`, `icons`, `sidebar`, `skills`) und die `bg_*`-Texturen im Wurzelordner. Inhalts-Ordner (Items, Monster, Porträts usw.) fehlen bewusst, damit das Paket klein bleibt.

## Mit Werkstatt bauen

Die Werkstatt ist im normalen Release-Build (`pnpm build`) **nicht enthalten**: weder Hotkey noch Bildliste landen im Paket. Im Vite-Dev-Server ist sie immer an. Für einen Testbuild mit Werkstatt die Umgebungsvariable `ASSET_LAB=1` setzen (Flag `__ASSET_LAB_BUILD__` in `electron.vite.config.ts`):

- Git Bash: `ASSET_LAB=1 pnpm build`
- PowerShell: `$env:ASSET_LAB = "1"; pnpm build; Remove-Item Env:ASSET_LAB`

Probe: Im Ordner `apps/client/out/renderer/assets` liegt nur mit der Variable ein `assetLab-*.js`. Vor einem Upload immer ohne Variable neu bauen.

## Grenzen

- Pseudo-Elemente (`::before`/`::after`) sind nicht anklickbar. Sitzt eine Textur dort, das Eltern-Element wählen und mit Claude klären.
- „nur dieses Element“ merkt sich das Element über einen Strukturpfad. Wird die Seite umgebaut, kann ein gespeicherter Einzelfall ins Leere laufen. Für Dauerhaftes „alle mit Selektor“ nehmen.
- Die Regeln sind `!important` mit erhöhter Spezifität, damit sie Spiel-Regeln schlagen. Im Export fehlt das `!important`; Claude prüft die Spezifität beim Einbau.
- „als Bild“ setzt `content: url(…)` und wirkt nur bei `<img>`.
- Alt-Werte („alt → neu“) fehlen bei Overrides, die vor dem 31.10. angelegt wurden (v1); die Seite steht dort als „(unbekannt)".
- Beim Ziehen wird die Skalierung der Oberfläche berücksichtigt, bei gedrehten Elementen kann es leicht abweichen.
- Zuständig: `apps/client/src/renderer/devtools/` (`assetLabHotkey.ts` lädt `assetLab.tsx` erst beim ersten Öffnen; Kern `assetLabCore.ts`, Regler `assetLabLayout.tsx`).
