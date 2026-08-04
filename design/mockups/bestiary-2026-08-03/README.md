# Bestiarium-Layoutstudien (2026-08-03)

Fünf funktionale HTML-Mockups für einen immersiveren Bestiary-Umbau. **Reine Design-Studien, kein Produktivcode.**

Start: [`index.html`](index.html) — klickbare Übersicht mit Live-Vorschau (Konzept-Umschalter, Spielstand-Umschalter,
1920/3440-Ansicht). Jedes Konzept ist auch einzeln direkt per Doppelklick öffenbar (`concept-1-journal.html` …
`concept-5-archiv.html`).

## Vertrag (was jede Studie zeigt — nichts erfunden)

Erfasst aus `apps/client/src/renderer/pages/BestiaryPage.tsx` + zugehörigem CSS: Zonen-Gruppierung (Reihenfolge
`content.zones`, einklappbar), Monster-Karten (Art/Level/Kill-Zähler, DefenseType-Badge immer sichtbar, Stats/
Resist/Inflict/Kill-Leiter/Drops nur wenn bekannt), Drop-Discovery (Silhouette + „?" für Unentdecktes, echte
Item-Bilder + Dropchance für Entdecktes), Champion-Kodex-Tab (Sichtungen/Kills/Unikate/schnellster Kill),
„Nur Unbesiegte"-Filter, Status-Effekt-Legende, Zonen-Sperre (`requiresQuest`) und Dungeon-Only-Sperre je mit
eigenem Hinweistext, Fight-Button NUR auf bereits entdeckten Karten (unentdeckt = reiner Hinweistext, kein Button
— der Ersteinstieg läuft über die Kampf-Zonenauswahl, nicht übers Bestiarium).

Alle Monster-/Zonen-/Champion-/Item-Daten sind aus `packages/content/src/index.ts` gezogen (10 Zonen, 78 Monster,
28 Champions, echte Namen/Level/Stats/Loot-Chancen). Drei deterministische Spielstände (`data.js`) simulieren
Frühspieler / Fortgeschritten / Completionist über Zonen-Reifestufen — keine Zufallszahlen, damit Screenshots
reproduzierbar sind.

## Die fünf Konzepte

### 1 — Jäger-Journal
Ein aufgeschlagenes Feldbuch: Doppelseiten je Zone, Monster als angeklebte Studienkärtchen mit Tesafilm-Ecken,
Kills als Ink-Stempelzahl, Unentdecktes als leerer Bleistift-Platzhalter. Gesperrte Zonen tragen einen
„VERSIEGELT"-Stempel quer über die Seite. Warm, persönlich, am charmantesten für eine kleine Sammlung.

### 2 — Trophäenwand
Dunkle Holzwand mit medaillonartig gerahmten Monster-Porträts je Zonen-Abschnitt; Drops hängen als kleine
Anhänger an Ketten neben der Haupttrophäe, Kill-Meilensteine als Gravuren. Gesperrte Abschnitte liegen hinter
einer Samtkordel mit Schloss-Hinweis. Sammlung fühlt sich wie Besitz und Stolz an statt wie eine Liste.

### 3 — Wardens Kodex
Master-Detail wie ein Companion-Feldjournal: schmaler Index links (Zonen → Monster, Fortschritts-Pips pro
Eintrag), rechts eine große Studien-Bühne mit Großformat-Kunst, Drop-Tafel, Kill-Statistik und einer aus echten
Feldern abgeleiteten Feldnotiz-Zeile. Ruhig, präzise, skaliert am saubersten auf 100+ Monster.

### 4 — Reise durch den Reach
Die Zonen als vertikale Kulissen-Bänder mit den echten Kampf-Backdrops als Vollbild-Hintergrund; Monster als
Wegpunkte auf einem gestrichelten Pfad, der horizontal durchs Band führt. Gesperrte Zonen liegen im Nebel mit
Wegweiser-Hinweis. Das Bestiarium wird zur spürbaren Wanderung von den Weiden bis in die Götzenhalle.

### 5 — Archiv der Asche
Ein Karteikatalog-Schrank: Zonen als Schubladen mit Messing-Griff und Wachs-Siegel-Ring (X/Y als Kreisdiagramm),
Öffnen enthüllt strenge Karteikarten mit Ablage-Reiter und Verzeichnungs-Sigel. Gesperrte Schubladen bleiben
versiegelt. Ordentlich, vollständig, akademisch — Sammlung als sichtbares Archiv-System.

## Designer-Empfehlung

**Erste Wahl: Konzept 4, „Reise durch den Reach".** Es beantwortet den Auftrag „immersiver" am direktesten,
ohne irgendein neues Feature zu erfinden — die echten Kampf-Backdrops sind schon da, sie werden hier nur endlich
groß gezeigt statt als 340px-Kartenausschnitt. Der fortschreitende Stimmungsbogen (goldene Weiden → nebliger
Sumpf → Krypta → Götzenhalle) erzählt die Spielreise von selbst, und der Wegpunkt-Pfad macht Fortschritt räumlich
statt nur numerisch spürbar. Größtes Risiko: bei Zonen mit vielen Monstern (Grenzlande = 15) wird horizontal
gescrollt — bei 1920px passt das gerade noch, bei 3440px verschwindet die Notwendigkeit meist ganz.

**Zweite Wahl / sinnvolle Kombination: Konzept 3, „Wardens Kodex".** Sobald der Spieler weit im Endgame ist
(alle 10 Zonen offen, 78+ Einträge), wird jede reine Scroll-Seite unhandlich — Master-Detail bleibt dabei am
übersichtlichsten. Ich würde NICHT eines gegen das andere tauschen, sondern könnte mir gut einen Ansichts-Umschalter
„Reise / Kodex" auf derselben Bestiary-Seite vorstellen: Konzept 4 als Standard-Erlebnis (Entdeckung, Atmosphäre),
Konzept 3 als kompakter Nachschlage-Modus für gezieltes Suchen.

Konzept 2 (Trophäenwand) und Konzept 5 (Archiv) sind beide stimmig und liebevoll ausgearbeitet, treffen aber
eher „heutiges Grid in neuem Gewand" als einen echten Immersions-Sprung — gute Fallback-Optionen, falls Konzept 4
aus Performance- oder Asset-Gründen (viele große Backdrop-Bilder auf einer Seite) zu schwer würde. Konzept 1
(Journal) ist das charmanteste kleine Format, wirkt aber bei den größeren Zonen (Grenzlande, Slayer-artige
Roster) am schnellsten voll und unübersichtlich.

## Verifikation

Alle 5 Konzepte + Index headless in Chromium geöffnet (Playwright, `playwright-core` aus dem Repo-`node_modules`),
für jede Kombination aus 5 Konzepten × 3 Spielständen × 2 Tabs (Bestiarium/Champion-Kodex) auf Konsolenfehler
geprüft — **0 Fehler über alle 30 Kombinationen**. Screenshots bei 1920×1080 und 3440×1440 einzeln angesehen,
inklusive gesperrter Zonen, Dungeon-Only-Bosse (Götzenhalle) und der interaktiven Index-Vorschau (iframe-Umschalter).
