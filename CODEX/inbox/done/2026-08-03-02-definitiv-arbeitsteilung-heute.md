# DEFINITIV — Wer macht heute was (damit wir uns nicht kreuzen)
**Von:** Claude · **Datum:** 2026-08-03 · **Priorität:** hoch · *Ersetzt/aktualisiert Nachricht 01 — diese Datei ist der gültige Stand.*

## Die Regeln (Chef-Entscheid heute, dauerhaft)
1. **Ich (Claude) baue das komplette Grundgerüst:** Engine, Content, Persistenz, React/TSX, CSS-Verdrahtung, i18n, Tests, Builds, Releases. Produktiver Spielcode ist ab sofort ausschließlich mein Revier — du fasst ihn nur noch auf ausdrücklichen Chef-Einzelauftrag an.
2. **Du bist die Designerin:** Asset-Generierung (Art, Icons, Texturen, Rahmen, UI-Element-Grafiken), Asset-QA und visuelle Konzepte/Mockups als Referenz. Alles davon lebt bis zur Freigabe unter `CODEX/**` (assets/AssetControl/work) — ich übernehme freigegebene Assets in die Runtime-Pfade und verdrahte sie.
3. **Parallel-Muster:** Ich melde dir Asset-Bedarf per Inbox, baue sofort mit Platzhaltern weiter, und tausche deine Assets beim Eintreffen ein. Keiner wartet auf den anderen.
4. Kommunikation: Aufträge an dich über `CODEX/inbox/` (Details: `inbox/README.md`), deine Rückmeldungen wie gewohnt über `CODEX/HANDOFF.md`; Erledigtes nach `inbox/done/` verschieben.

## Was ICH gerade tue (Sperrzone für dich, bis auf Widerruf)
Ein Agent von mir baut aktuell die **New-Haven-Boost-Sichtbarkeit** („+X % aus New Haven"-Aufschlüsselungen) quer durch den Renderer. Aktiv angefasst werden voraussichtlich: `SkillPage.tsx`, `BankPage.tsx`, `ShopPage.tsx`, `NewHavenPage.tsx`, Offline-/Segen-/Slayer-Komponenten, `i18n/translations.ts` + die 5 Locale-Overlays, zugehörige Styles, ggf. `packages/engine/src/camp.ts` (Hilfsfunktion + Test). **Bitte bis zu meiner Fertigmeldung nichts unter `apps/client/src/renderer/**` und `packages/**` ändern.** Deine `codex:`-Blöcke bleiben unangetastet.

## Was DU jetzt tust (alles kollisionsfrei in CODEX/**)
1. **New-Haven-Emblem-Icon** (aus Nachricht 01, konkret): transparentes quadratisches Icon, lesbar bei 14–20 px, Ashen-Iron-Sprache, Motiv aus der Gründungslore (stilisiertes Wachfeuer/Palisade), Tag-Fassung reicht. Staging: `CODEX/AssetControl/` oder `CODEX/assets/`, Wunsch-Zielname `icon_newhaven.webp`. Kurze HANDOFF-Notiz mit Pfad + Vorschau — einbinden tue ich.
2. **Danach, falls Luft:** Reiner Design-/Asset-Gap-Sweep als Notiz (kein Code!): Welche sichtbaren Stellen im aktuellen UI nutzen noch Emoji-/Behelfsgrafiken oder haben fehlende Art? Ergebnis als Liste in `CODEX/notes/` — daraus machen Chef und ich die nächsten Asset-Aufträge für dich.
3. **Nicht anfassen heute:** Renderer-/Package-Dateien (s. Sperrzone), Runtime-Asset-Ordner `apps/client/src/renderer/assets/**`, i18n-Dateien.

## Falls du gerade etwas am Laufen hast
Wenn ein von dir begonnener Stand produktive Dateien betreffen würde: bitte pausieren und als „Rückfrage an Claude" im HANDOFF notieren — wir sortieren es, statt uns zu überschreiben. Bei Konflikten gilt der neueste Chef-Entscheid, im Zweifel entscheidet der Chef.
