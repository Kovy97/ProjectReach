# Steam-Patchnotes — feste Struktur (ab Update #1 / 0.2.2)

Diese Struktur gilt für ALLE künftigen Steam-Patchnotes, damit Spieler ein wiedererkennbares Format bekommen. Quelle der Inhalte ist immer `design/patchnotes.md` (das interne Änderungsprotokoll) — von dort wird spielerrelevant destilliert, NIE 1:1 kopiert.

## WICHTIG: Zwei Fassungen (Erkenntnis 25.07., 0.2.2)
Der NEUE Steam-Event-Editor (partnerevents) parst eingefügtes BBCode NICHT — Tags bleiben als Rohtext stehen (selbst in der Event-Vorschau). Deshalb IMMER zwei Dateien liefern:
1. `steam-patchnotes-<version>.txt` — BBCode-Fassung (nur für Felder, die BBCode rendern, z.B. ältere Ankündigungs-Flows).
2. `steam-patchnotes-<version>-plain.txt` — **die Standard-Fassung fürs Event**: reine Textstruktur mit Emoji-GROSSBUCHSTABEN-Sektionsköpfen (✨ NEW / ⚖️ CHANGES / 🔧 FIXES), •-Bullets, Leerzeile zwischen Punkten. Titel/Feature-Namen kann der Chef optional per Editor-Toolbar fetten/als Überschrift setzen.

## Regeln
- **EN-only** (Store-Sprachregel), in allen Steam-Sprachen dieselbe EN-Fassung verwenden.
- **Nur Spielerrelevantes, non-technical.** Keine Testzahlen, keine Dateinamen, keine Engine-Interna, kein „Task #".
- **Kurz und knackig:** pro Punkt 1–2 Sätze, fette Feature-Namen, aktive Sprache. Lieber 6 starke Punkte als 15 schwache — Kleinkram sammelt sich unter einem Sammelpunkt („Dozens of smaller fixes …").
- Natürliche Sprache, keine KI-Gedankenstrich-Ketten (max. 1 Dash pro Punkt).
- Reihenfolge INNERHALB jeder Sektion: Wichtigstes zuerst.

## Feste Gliederung (immer identisch)
```
[h1]Update #N — <Name> (v<Version>)[/h1]

<1–2 Sätze Intro: Dank + roter Faden des Updates>

[h2]✨ New[/h2]
[list][*][b]<Feature>[/b] — <1–2 Sätze Spieler-Nutzen>[/list]

[h2]⚖️ Changes[/h2]
[list][*][b]<Bereich>[/b] — <was ist anders und warum es gut ist>[/list]

[h2]🔧 Fixes[/h2]
[list][*]<kurzer Fix-Satz, kein Fettdruck nötig>[/list]

<1 Outro-Zeile: Ausblick + Save-Sicherheits-Satz („your save is safe with every update")>
```

## Ablage & Prozess
1. Fertige Fassung je Update: `design/steam-patchnotes-<version>.txt` (BBCode-fertig zum Einfügen).
2. Chef fügt sie beim Depot-Publish in das SteamPipe-Patchnotes-Feld ein (BBCode rendert im Event, nicht in der Vorschau) und nutzt dieselbe EN-Fassung für alle Sprachen.
3. Event-Artwork: bestehendes Patch-Kapsel-Design (800×450 + 1920×622) wiederverwenden, nur Titel/Nummer tauschen.
