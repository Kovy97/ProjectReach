# Projektanalyse

## Produkt

Das aktive Root-Projekt ist **Grim Reach** von Heartforge Studio: ein umfangreiches Dark-Fantasy-Idle-RPG für Steam mit Electron-Desktopclient. Historische Arbeitsnamen und technische Paketnamen lauten noch „Hearthforge Idle“ beziehungsweise `@hearthforge/*`; neuere Build-, Design- und Release-Dateien führen den Produktnamen Grim Reach.

Die spielerische Basis folgt dem Skill-/Aktions-/Offline-Fortschrittsmodell des Idle-RPG-Genres. Die eigene Identität wird über eine lebendige, feindselige Welt, individuelles Loot/Item-Instanzen, die Aschechronik, sichtbare Kämpfe, Elites, Dungeons, Paragon, Slayer, Verzauberung und die düstere Welt „The Reach“ aufgebaut.

Das visuelle System wird intern als **Ashen Iron** beschrieben: dunkle Fantasy, raues Eisen, Stein, Holz und Leder, gedämpfte Flächen mit Gold-/Kupferakzenten, kompakte spielnahe Informationsdichte und gezielte Belohnungsinszenierung.

## Architektur

Das Repository ist ein pnpm-/Turborepo-Monorepo:

- `packages/shared/` — gemeinsame Typen, Konstanten, `GameState`, Save-Version
- `packages/content/` — datengetriebener Inhaltskatalog; sehr großes zentrales `src/index.ts` plus Sprach-Overlays
- `packages/engine/` — reine deterministische TypeScript-Engine, Tick-Loop, Kampf, Skills, Inventar, Quests, Lager/New Haven, Simulationen und umfangreiche Tests
- `packages/persistence/` — Save/Load, Migrationen, Offline-Berechnung und Kompatibilitäts-Vault
- `apps/client/` — React-/Electron-Client, Steam-/Windows-Paketierung und UI-Audit-Harness
- `design/` — bindende Spezifikationen, Balance, Lore, Releaseplanung, Audits und Prompt-Batches
- `steam/` — SteamPipe-Konfiguration und Depot-Unterlagen
- `tools/` — Asset-Browser und Asset-/Content-Hilfen
- `newGPTAssets/` — neuere Prompt- und Asset-Batches
- `passion-project/` — separates GDD „Kreidestadt“, derzeit Planung, Unity 6 LTS; nicht Teil von Grim Reach
- `SDK/` — Steamworks SDK; Drittanbieter-/Vendorbereich, nicht beiläufig bearbeiten

## Zentrale technische Prinzipien

- Engine und UI sind strikt getrennt.
- Die Engine ist deterministisch und serialisierbar; derselbe Tick-Pfad trägt Online- und Offline-Fortschritt.
- Save-Kompatibilität wird über versionierte Migrationen und Vault-Fixtures geschützt.
- Content ist datengetrieben, aber der zentrale Katalog ist ein konfliktanfälliges Hot File.
- React rendert tickgetrieben; Selector-/Performance-Disziplin ist wichtig.
- UI-Texte und Content-Overlays existieren in sieben Sprachen: Englisch, Deutsch, Spanisch, Französisch, brasilianisches Portugiesisch, Russisch und Chinesisch.
- Tests und Builds erfolgen headless. Zusätzlich existiert ein großer Playwright-/Screenshot-gestützter UI-Audit-Bereich.

## Größenordnung beim Analyse-Snapshot 2026-07-30

- 8 spezialisierte Claude-Agentenrollen
- 132 Engine-Testdateien und 14 Persistenz-Testdateien
- 26 React-Seiten
- über 1.100 Item-Bilddateien, 125 Monsterbilder, 21 Petbilder und 57 Porträts im Renderer
- ein rund 1,3 MB großer zentraler Content-Katalog

Diese Zahlen dienen nur zur Einordnung und müssen bei Bedarf neu gezählt werden.

## Aktive Produktlinie

Der derzeit bindende Zielrahmen ist `design/0.3.0-zielsetzung.md`: Update **0.3.0 „New Haven“**. Headline ist ein 2D-Karteninterface für das Lager mit 15 Gebäuden und je drei Ausbaustufen, deterministischen/offlinefähigen Bauzeiten, permanenten Nicht-Kampf-Boosts, Veredelung, Save-Migration und vollständiger i18n.

Für laufende Arbeit sind die jeweils neuesten bindend markierten Dokumente maßgeblich. Besonders relevante Quellen:

- `design/0.3.0-zielsetzung.md`
- `design/identity-strategy.md`
- `design/encampment-konzept.md`
- `design/encampment-balance.md`
- `design/lore/encampment-lore.md`
- `design/update-backlog.md`
- `design/lore/weltlore-grim-reach.md`
- `design/lore/aschechronik-spec.md`
- `.claude/agents/*.md`

## Asset-Pipeline

Viele Renderer-Assets werden über `import.meta.glob` automatisch an Content-IDs gebunden. Allgemeine Regel: Dateiname entspricht exakt der ID. Relevante Ziele liegen unter `apps/client/src/renderer/assets/**`.

Beispiele:

- Items: `assets/items/<itemId>.(webp|png)`
- Monster: `assets/monsters/<monsterId>.(webp|png)`
- New-Haven-Gebäude: `assets/camp/<buildingId>_<stufe>.(webp|png)`

Vor jeder Integration die aktuelle Loader-Datei und die Ziel-README lesen; Formate und Fallbacks haben sich im Projekt bereits weiterentwickelt. Historische Claude-Dokumente nennen teilweise noch ausschließlich PNG, der aktuelle Bestand verwendet überwiegend WebP.

## Produktive UI-Theme-Schicht

Seit dem Chef-GO vom 2026-07-30 ist **Gravewood & Bronze** die produktive Art-Direction des Renderers:

- Runtime-Assets: `apps/client/src/renderer/assets/ui/gravewood/`
- globale Theme-Bindung: `apps/client/src/renderer/styles/gravewood-theme.css`
- Importpunkt: letzter Import in `apps/client/src/renderer/styles/index.css`
- Hauptaktionen: Gravewood Button 1
- Gefahr/Abbruch/Verkauf: alternative Buttonfamilie
- Icon-Controls: quadratische Buttonfamilie
- Navigation: eigene Tabs mit aktivem Bronze-Hebel
- außerdem zentral: Frames, fünf Oberflächentexturen, Slots, Balken, Scrollbars, Tooltips, Badges, Divider und Cursorzustände

Die Schicht überschreibt bewusst nur Darstellung und Interaktionsbewegung. Komponentenstruktur, Game-State, Handler und i18n bleiben Eigentum der bestehenden Claude-Architektur.

Seit der V2-Korrektur gelten für alle neu erzeugten skalierbaren UI-Assets zusätzlich diese festen Designinvarianten:

- keine Nieten, Symbole, Bänder oder einmaligen Materialdetails in 9-Slice-Stretchzonen
- Schmuck ausschließlich sparsam in den unverzerrten Ecken
- ruhige, niedrig detaillierte Button-Mitten für kleine Laufzeitgrößen
- bei horizontalen Buttons exakt 2 px transparenter Rand oben und unten
- lange Scrollbar-Tracks als wiederholbare Textur; Handles ausschließlich per 9-Slice

## Bekannte Stolperstellen

- `README.md` ist als Architektur-Einstieg nützlich, aber beim Namen und Entwicklungsstand veraltet.
- Technische Namen `hearthforge` nicht beiläufig umbenennen; das wäre eine koordinierte Migration.
- Grim Reach und Kreidestadt sind getrennte Produkte.
- Bindend markierte Chef-/Claude-Dokumente nicht stillschweigend umdeuten.
- Asset-Dateien können allein durch ihren Namen automatisch live gebunden werden.
- Neue State-Felder ohne Migration gefährden Bestands-Saves.
- UI kann trotz Typecheck/Build zur Laufzeit crashen, wenn Game-State-Hooks außerhalb des Playing-Layouts gemountet werden.
- Performance und Reduced-Motion sind feste Bestandteile der UI-Qualität.
