# Offline-Rückkehr – fünf Designmockups

<!-- codex:2026-08-31T00:20:00+02:00 -->

## Bestandsanalyse

Das produktive Fenster in `OfflinePopup.tsx` kann folgende, teils optionale Zustände zeigen:

- Abwesenheitsdauer, echter Zeitraum, Offline-Cap und New-Haven-Capbonus
- Wächterbericht mit bis zu zwei priorisierten Ereigniszeilen
- Begleiterfund
- Offline-Tod samt Gegner und Wiederholungszahl
- Kampf-Patt sowie Arbeitsstopp wegen Materialmangel oder vollem Inventar
- Gold, Gesamt-XP, Kills, Erfolge und bis zu drei Erfolgsnamen plus Restzahl
- Skill-XP und Stufenanstiege
- fertiggestellte New-Haven-Gebäude und Veredelungsausstoß
- Jagdfänge
- gewöhnliche und seltene Beute
- Leerrückkehr mit Sprung zur letzten Fertigkeit
- feste Einsammeln-Aktion

Alle fünf Studien wurden gegen einen absichtlich maximal gefüllten Stressfall entworfen. Die
Ereignisfläche jedes Entwurfs ist austauschbar und kann Begleiter, Tod, Patt, Arbeitsstopp oder
Leerrückkehr aufnehmen; abwesende Ergebnisgruppen dürfen ohne Layoutloch entfallen.

## Entwürfe

1. **Wächterchronik** – monumentalste Gesamtschau; drei gleichwertige Ledger für Ereignisse,
   Fortschritt und Ausbeute/New Haven.
2. **Der Beutetisch** – stärkster Belohnungsmoment; Beute ist die zentrale Bühne, Systeme flankieren
   sie als schmale Arbeitsregister.
3. **Spuren der Nacht** – verständlichste Erzählung; links eine chronologische Ereignisspur, rechts
   Bilanz und Beute.
4. **Quartiermeister-Akte** – skalierbarster Kategorienansatz; festes Dossierregister links,
   datenreiche Gesamtübersicht rechts.
5. **Die Aschewaage** – klarste mentale Trennung; links „Was geschah“, rechts „Was blieb“.

## Produktion

- Erzeugungsweg: eingebautes ImageGen-Werkzeug, fünf getrennte Generierungen
- Referenzen: `B07-offline-bericht.png` und `nh-offline-camp-de-1920x1080.png`
- Ziel: visuelle Auswahlstudien, keine Runtime-Assets und keine HTML-Umsetzung
- Format: PNG, 16:9, deckend

## Promptkern

**Gemeinsam:** High-fidelity Desktop-Game-UI-Mockup im bestehenden Grim-Reach-Ashen-Iron-Stil;
schwarzes Eisen, dunkler Stein, abgenutztes Leder, zurückhaltendes Altgold, gemalte Runtime-Icons,
lesbare mittelalterliche Serifenschrift; vollständig gerahmtes Modal über abgedunkelter Spiel-UI;
alle oben inventarisierten Ergebnisfamilien; kein Flat Design, kein Glassmorphism, kein Sci-Fi, kein
Clipping, keine leeren Dekorationsflächen, keine Logos oder Wasserzeichen.

**Varianten:**

- 01: Dreispalten-Chronik mit festem Wächterband.
- 02: zentraler Beutetisch, Fortschritt links, New Haven/Jagd rechts.
- 03: vertikale Timeline links, Bilanz/Beute rechts.
- 04: Kategorien-Dossier links, modulare Gesamtübersicht rechts.
- 05: symmetrische Aschewaage mit Ereignissen links und Ertrag rechts.

Die vollständigen produktionsnahen Prompts wurden in den fünf separaten eingebauten ImageGen-Aufrufen
verwendet; die Variantenbezeichnungen und Pflichtinhalte entsprechen exakt dieser Datei.

## Interaktives HTML-Mockup 02

<!-- codex:2026-08-31T00:55:00+02:00 -->

Die gewählte Variante **Der Beutetisch** liegt als eigenständige Arbeitsfassung unter
`02-html/index.html`. Sie verwendet vorhandene Grim-Reach-Rahmen, Texturen, Schriften und echte
Spiel-Icons. Über die schwebende Werkbank lassen sich Begleiterfund, Niederlage, Patt, Arbeitsstopp,
Leerrückkehr sowie eine kompakte Datenmenge direkt vergleichen. Das Layout wechselt bei schmaleren
Viewports von drei auf zwei und schließlich auf eine Spalte.

Technische Pfad- und Strukturprüfung: `node 02-html/qa.cjs`.

## Produktive Umsetzung

<!-- codex:2026-08-31T01:39:00+02:00 -->

Nach Chef-Freigabe wurde Variante 02 in `OfflinePopup.tsx` und `offline-stage.css` übertragen.
Die produktive Fassung bezieht sämtliche Inhalte weiter aus `OfflineSummaryUI`, `GameState` und
dem Content-Katalog; das Auswahlmockup wurde nicht als Datenquelle verwendet. Mehrere gleichzeitige
Ereignisse bleiben sichtbar, leere Ergebnisgruppen entfernen ihre Spalte dynamisch und bei kleinen
Viewports staffelt sich die Ansicht auf zwei beziehungsweise eine Spalte.

Statische Runtime-Prüfung: `node runtime-qa.cjs`.
