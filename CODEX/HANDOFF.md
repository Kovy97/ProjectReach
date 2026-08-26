# Übergabe an Claude

## Aktueller Status

**Testbereit: Gravewood V3 trennt skalierbare Rahmen vollständig von ortsfesten, gekachelten Oberflächen.**

`styles/gravewood-theme.css` wird in `styles/index.css` weiterhin zuletzt importiert. Buttons und Tabs verwenden je einen transparenten Frame über einer unveränderten Materialkachel; Statewechsel tauschen keine Maserung mehr aus. Shell und große Inhaltsräume sind kühl auf Schiefer/Basalt gestaffelt, Controls bleiben warm, Bronze markiert Fokus. Volle und leere Slots teilen denselben Frame-/Surface-Vertrag. Character besitzt drei klare äußere Frame-Owner statt gestapelter Rahmen. Topbar-Balken sind höher, ruhiger und kurz-linear animiert. Die Komponentenhierarchie, Handler, State-Logik und i18n blieben unangetastet.

Zusätzlich zu den bestehenden Runtime-Dateien liegen acht V3-WebPs unter `apps/client/src/renderer/assets/ui/gravewood/v3/`. Das V3-Quellpaket mit Alpha-Mastern, nahtlosen Texturen, Slice-Metadaten und Laufzeitvorschau liegt unter `CODEX/assets/ui-kit-gravewood-production-v3/`. Der exakte Stand vor V3 samt SHA-256-Manifest liegt unter `CODEX/outbox/2026-07-30-gravewood-v3-preintegration/`.

## Letzte Lieferung

- Root-Anweisung `AGENTS.md` für dauerhafte Codex-Rolle
- `CODEX/` mit Projektanalyse, Regeln, Snapshot, Arbeitslog und Übergabeordnern
- optionaler Launcher `START-CODEX.bat`
- `CODEX/templates/ASSET-BRIEF.md` als verbindlicher Vier-Phasen-Workflow Chef/Claude → Codex → QA → Abnahme
- erste Runde: fünf transparente Sidebar-Button-Konzepttafeln mit je drei Zuständen plus `comparison-board.png`
- zweite Runde: fünf transparente Medieval-Standardbuttons 06–10 plus `comparison-board-medieval.png`
- vollständige Promptdokumentation unter `CODEX/assets/sidebar-button-concepts/PROMPTS.md`
- ausgewählte Richtung 08 als fertiges, dreistufiges 9-Slice-Paket in PNG und WebP
- Slice-Guide, State-Vorschau und Laufzeitprüfung für 240–420 px Sidebar-Breite
- Ironbound-WebPs produktiv nach `apps/client/src/renderer/assets/ui/buttons/` übernommen
- Sidebar- und Topbar-Slicewerte minimal auf `90 / 150 / 90 / 150` angepasst
- vorherige Produktions-WebPs unter `CODEX/outbox/2026-07-30-sidebar-topbar-button-backup/` gesichert
- fünf simple Alternativen 11–15 unter `CODEX/assets/sidebar-button-simple-concepts/`
- Vergleich in echter UI-Größe unter `comparison-board-simple.png`
- ausgewählte Richtung 13 „Quiet Leather“ als Normal/Hover/Pressed in PNG und WebP produziert
- Quiet Leather produktiv in Sidebar und Topbar eingebunden; vorheriges Ironbound-Set unter `CODEX/outbox/2026-07-30-ironbound-before-quiet-leather/` gesichert
- Topbar auf 46 px Mindesthöhe verschlankt und beide Navigationsflächen mit subtilen Hover-/Pressed-Transforms versehen
- zehn vollständige UI-Kit-Overview-Boards samt drei originalen mittelalterlichen Hand-Cursor-States je Set unter `CODEX/assets/ui-kit-overviews/`
- hochauflösende und kompakte Gesamtvergleiche: `comparison-board.png` und `comparison-preview.png`
- reproduzierbarer Richtungs-/Promptkatalog in `CODEX/assets/ui-kit-overviews/PROMPTS.md`
- vollständige Einzelproduktion für Kit 06: primäre, alternative und quadratische Buttons mit je vier States
- zwei schlanke offene 9-Slice-Frames, fünf technisch nahtlose Texturen und ein leerer Slot
- getrennte Progressbar-Layer, aktive/inaktive Tabs samt separatem Tab-Hebel, Badge und Divider
- global vorbereitete Scrollbar-Familie und drei originale Hand-Cursor-States in 256/128/64 px
- `CODEX/assets/ui-kit-gravewood-production/metadata/slices.json` und `cursors/hotspots.json`
- drei visuell geprüfte Laufzeit-Previewboards unter `CODEX/assets/ui-kit-gravewood-production/previews/`
- Rollback- und Integrationsplan ohne vorzeitige Produktmutation
- 41 Gravewood-Runtime-Dateien nach `apps/client/src/renderer/assets/ui/gravewood/` übernommen
- globale UI-Schicht `styles/gravewood-theme.css` erstellt und zuletzt aus `styles/index.css` importiert
- Sidebar, Topbar, Aktionsbuttons, Icon-Controls, Tabs, Frames, Oberflächen, Slots, Progressbars, Tooltips, Badges, Divider, Scrollbars und Cursor produktiv gebunden
- Legacy-Button-Aliasse einschließlich neuem Disabled-State auf Gravewood Button 1 umgestellt
- datiertes Pre-Integration-Backup mit SHA-256-Manifest erstellt
- strecksichere V2-Familien für Primär-, Alternativ-, Quadrat- und Tabbuttons produziert
- alle Buttonzustände innerhalb ihrer Familie geometrisch identisch abgeleitet
- wiederholbaren Scrollbar-Track und 9-Slice-Handle in drei Zuständen produziert
- V2-Dateien in Produktionspaket, Runtime und vier Legacy-Aliasse übernommen
- doppelte Legacy-Rahmen und verformte Tab-/Button-Proportionen in der zentralen Theme-Schicht korrigiert
- V2-Preintegration mit 64 Dateien und SHA-256-Manifest gesichert
- V3: fünf frame-only Familien für Button, Tab, Slot, Panel und Card produziert
- V3: drei exakt nahtlose kalte Texturen für Schiefer, Basalt und Aschestein produziert
- V3: Button-/Tab-Statebilder durch gemeinsamen Frame plus ortsfeste Materialfläche ersetzt
- V3: volle und leere Slot-Consumer zentral vereinheitlicht
- V3: Container-Ownership und Character-Doppelrahmen gezielt bereinigt
- V3: Topbar-Progresssystem von alten Segment-9-Slices entkoppelt und höher/smoother gesetzt
- V3: schweres Hover-/Klick-/Scrollbar-Gefühl ohne Texturskalierung umgesetzt
- New-Haven-System rein lesend auditiert; Architektur weitgehend fertig, Assetintake unvollständig
- isolierten New-Haven-Kontrollordner mit Manifest für 24 fehlende Dateien angelegt

## Offene Entscheidung

Gravewood V3 ist für den visuellen Rundgang durch die laufende App bereit. Besonders zu prüfen sind große Hauptmenübuttons, kompakte Optionsbuttons, Topbar-Tabs/-Balken, volle und leere Slots, Character-Spalten sowie lange/kurze Scrollbars. New-Haven-Kontrollassets benötigen ein separates Chef-GO und sind nicht produktiv. Der finale Electron-Build ist in einer Umgebung mit erlaubtem Prozessstart zu wiederholen.

## Verifikation

- Assetpfade in Sidebar und Topbar bestätigt
- alle drei produktiven Ironbound-WebPs `1826 × 331 px` mit Alpha
- CSS-Verweise für Normal, Hover und Pressed in beiden Flächen bestätigt
- interner TypeScript-Compilerlauf: 151 Client-Dateien, 0 Diagnosen
- regulärer Prozessstart für `pnpm`/`electron-vite build` durch Windows-Sandbox mit `EPERM` blockiert
- Chef-Live-Screenshot bestätigt, dass Sidebar und Topbar die Assets laden
- neue Konzepte 11–15 bei `240 × 42 px` und `230 × 54 px` gerendert
- neue Konzepte: exakt zwei transparente Pixelreihen oben und unten in PNG und WebP geprüft
- alle zehn UI-Kit-Boards als lesbare PNGs geprüft; neun Boards `1536 × 1024 px`, Gravewood `1572 × 1001 px`
- gemeinsame Vergleichstafel visuell geprüft; alle zehn Richtungen, Pflichtbausteine und Cursor-States sind erkennbar
- keine neuen UI-Kit-Konzeptdateien in Produktpfade kopiert
- Gravewood-Paket: 73 direkt nutzbare Produktionsdateien
- Primär-, Alternativ- und Quadratbutton: State-Alpha innerhalb der jeweiligen Familie identisch
- horizontale Buttons: exakt zwei vollständig transparente Reihen oben und unten
- große und kompakte Frames: Center-Alpha 0
- fünf Texturen: linke/rechte sowie obere/untere Kanten jeweils exakt identisch
- 9-Slice-Renders für Buttons, Frames, Progressbar, Tabs und Scrollbars bei kleinen Zielgrößen visuell geprüft
- Cursor bei 128 und 64 px visuell geprüft; Hotspotdaten dokumentiert
- 39 installierte Runtime-Bilder bytegenau gegen das Produktionspaket geprüft; keine Abweichung
- 33 CSS-Asset-URLs auf Existenz geprüft; keine fehlende Datei
- `gravewood-theme.css` mit PostCSS geparst: 60 Top-Level-Nodes, keine Syntaxfehler
- interner TypeScript-Compilerlauf nach Integration: 151 Client-Dateien, 0 Diagnosen
- `electron-vite`-Build headless angestoßen; Windows-Sandbox blockiert den benötigten Prozessstart mit `spawn EPERM`
- V2: 40 Produktionsbilder bytegenau gegen das neue Quellpaket geprüft; keine Abweichung
- V2: 20 Runtime-WebPs bytegenau gegen das neue Quellpaket geprüft; keine Abweichung
- V2: vier Legacy-Aliasse bytegenau gegen die Primärfamilie geprüft
- V2: Primär-, Alternativ- und Quadratfamilie besitzen je identische Alpha-Geometrie in allen vier Zuständen
- V2: inaktive und aktive Tabs besitzen identische Alpha-Geometrie
- V2: horizontale Buttons haben exakt zwei vollständig transparente Pixelreihen oben und unten
- V2: 9-Slice-Vorschauen bei 468×64, 240×42, 104×44, 48×48, 32×32, 280×48 und 160×42 visuell geprüft
- V2: Scrollbar-Track bei 14×300 und Handle bei 14×82 in allen drei Zuständen visuell geprüft
- final: 35 CSS-Asset-URLs vorhanden; PostCSS-Parse mit 100 Top-Level-Nodes ohne Syntaxfehler
- final: interner TypeScript-Compilerlauf mit 151 Client-Dateien, 0 Diagnosen
- V3: drei Texturen mit exakt identischen gegenüberliegenden Pixelkanten
- V3: fünf Framezentren vollständig transparent
- V3: horizontaler Frame mit exakt zwei transparenten Pixelreihen oben und unten
- V3: 8 Runtime-WebPs bytegenau gegen das Quellpaket geprüft
- V3: 44 CSS-Asset-URLs vorhanden; PostCSS-Parse mit 151 Top-Level-Nodes ohne Syntaxfehler
- V3: interner TypeScript-Compilerlauf mit 151 Client-Dateien, 0 Diagnosen

## Codex-Code-Marker dieser Lieferung

- `codex:2026-07-30T18:12:04+02:00` — `apps/client/src/renderer/styles/sidebar.css`, Quiet-Leather-9-Slice-Bindung
- `codex:2026-07-30T18:12:04+02:00` — `apps/client/src/renderer/styles/topbar.css`, Quiet-Leather-9-Slice-Bindung
- `codex:2026-07-30T18:22:15+02:00` — `apps/client/src/renderer/styles/sidebar.css`, Hover-/Pressed-Bewegung und Reduced-Motion-Regel
- `codex:2026-07-30T18:22:15+02:00` — `apps/client/src/renderer/styles/topbar.css`, 46-px-Höhe, Hover-/Pressed-Bewegung und Reduced-Motion-Regel
- Binäränderungen ohne Kommentarmöglichkeit: `apps/client/src/renderer/assets/ui/buttons/button_new.webp`, `button_new_hover.webp`, `button_new_pressed.webp`
- Binäre Konzeptlieferung ohne Produktänderung: `CODEX/assets/ui-kit-overviews/01-ashen-bronze.png` bis `10-cinder-cathedral.png`
- Neue binäre Staging-Lieferung ohne Produktänderung: gesamter Ordner `CODEX/assets/ui-kit-gravewood-production/`
- `codex:2026-07-30T20:34:06+02:00` — `apps/client/src/renderer/styles/index.css`, finaler Theme-Import
- `codex:2026-07-30T20:34:06+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, alle logischen Gravewood-Integrationsblöcke
- `codex:2026-07-30T20:49:05+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, Doppelrahmen-, Proportions- und Legacy-Overlay-Korrektur
- `codex:2026-07-30T21:12:22+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, V2-Tab-Slices und stretchsichere Scrollbar-Bindung
- `codex:2026-07-30T21:44:25+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, V3-Rahmen-/Surface-Vertrag, kalte Materialhierarchie, Slot-, Container-, Character-, Topbar- und Motion-Korrektur
- `codex:2026-07-30T22:24:34+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, visuelle V3-Regressionskorrektur für Main Menu, Offline-Modal, Sidebar-Footer, Character/Inventory, fertige Slots, Topbar/Progress, Action Cards, Options, Scrollgriff und Ultrawide-Compositing
- Statischer V3-Nachtest: 165/165 ausgeglichene CSS-Klammern, 42/42 Asset-URLs vorhanden, verbindliche Slice-Werte eingehalten, kein globaler `#root .panel`-Reset, kein `will-change` und kein fixed-Background
- **Chef-Rollback 2026-07-30:** Der visuelle Live-Test hat die gesamte appweite V3-Materialrichtung verworfen. `gravewood-theme.css` bleibt nur als inaktives Archiv erhalten und wird von `styles/index.css` nicht mehr importiert.
- `codex:2026-07-30T22:56:44+02:00` — `apps/client/src/renderer/styles/index.css`, dokumentierte Deaktivierung der abgelehnten globalen Themeschicht
- Die drei produktiven `button_new{,_hover,_pressed}.webp` wurden bytegenau aus `2026-07-30-gravewood-appwide-preintegration` wiederhergestellt. Scoped Sidebar-/Topbar-Interaktionen bleiben aktiv.
- Rollback-Nachtest: aktueller Importgraph entspricht dem Pre-Gravewood-Stand; Gravewood-Assets werden nur noch von der nicht importierten Theme-Datei referenziert. New Haven ist unberührt.
- `codex:2026-07-30T23:05:56+02:00` — kontrollierte Wiedereinführung ausschließlich in
  `styles/gravewood-navigation.css` plus finaler Import in `styles/index.css`: V3-Buttonrahmen
  und dunkle Gravewood-Textur für Sidebar, Sidebar-Footer und Topbar. Keine anderen UI-Consumer.
- Backup vor der scoped Navigation:
  `CODEX/outbox/2026-07-30-gravewood-navigation-v3-preintegration/`.
- `codex:2026-07-30T23:12:13+02:00` — zweite kontrollierte Freigabe in
  `styles/gravewood-controls.css`: Handcursor, Endkappen-Scrollbar, Topbar-Progress und
  Character-/Inventory-Slots. In `gravewood-navigation.css` wurden die zusätzliche innere
  1-px-Lichtkante entfernt und der Active-Layer auf die volle Buttonfläche gezogen.
- Backup vor dieser Kontrollgruppe:
  `CODEX/outbox/2026-07-30-gravewood-controls-preintegration/`.
- `codex:2026-07-30T23:16:19+02:00` — `gravewood-controls.css`: gedrückter Handcursor
  gilt während Pointer-Down appweit über `body:active`, nicht mehr nur auf Buttons.
- `codex:2026-07-30T23:19:21+02:00` — `gravewood-navigation.css`: Sidebar/Footer auf alternative
  Rahmenfamilie plus Lederfläche, Hover ohne Box-Scale/Clipping, Topbar-Active ohne rechteckiges
  Innenoverlay. Neue `gravewood-offline.css`: Lederflächen für drei Berichtskarten und neuer
  „Einsammeln“-Button.
- Backup:
  `CODEX/outbox/2026-07-30-gravewood-sidebar-alternate-offline-preintegration/`.
- `codex:2026-07-30T23:28:43+02:00` — Cursor-Prioritätskorrektur in
  `gravewood-controls.css`; eckige Holzrahmen plus Gravewood-Textur in
  `gravewood-navigation.css`; 50-%-Collect in `gravewood-offline.css`; neue isolierte
  `gravewood-loadgame.css` für Waldportraits, Lederkarten und Kartenaktionen.
- Backup:
  `CODEX/outbox/2026-07-30-gravewood-loadgame-sidebar-wood-preintegration/`.
- `codex:2026-07-30T23:38:38+02:00` — höhere Sidebarbuttons und Topbar-Gleichzug in
  `gravewood-navigation.css`; neuer Equipment-Top-Inset in `gravewood-character-fixes.css`;
  neue große Action-Card-Werte und Materialhierarchie in `gravewood-actioncards.css`.
- Backup:
  `CODEX/outbox/2026-07-30-gravewood-actioncards-equipment-nav-preintegration/`.
- Kommentarfreie Binäränderungen: 41 neue Dateien unter `apps/client/src/renderer/assets/ui/gravewood/`
- Kommentarfreie Legacy-Aliasse: `button_new.webp`, `button_new_hover.webp`, `button_new_pressed.webp`, neues `button_new_disabled.webp`
- Exakter vorheriger Binär- und CSS-Stand: `CODEX/outbox/2026-07-30-gravewood-appwide-preintegration/`
- Exakter Stand vor V2: `CODEX/outbox/2026-07-30-gravewood-v2-preintegration/`
- Exakter Stand vor V3: `CODEX/outbox/2026-07-30-gravewood-v3-preintegration/`
- Exakter Theme-Stand vor der visuellen V3-Regressionskorrektur:
  `CODEX/outbox/2026-07-30-gravewood-v3-visual-regression-fix/`
- Exakter verworfener Live-Stand unmittelbar vor dem Not-Rollback:
  `CODEX/outbox/2026-07-30-gravewood-v3-emergency-rollback/`

## New Haven — Runtimeintegration nach Chef-GO

- 98 produktive WebPs unter `apps/client/src/renderer/assets/camp/`: 15 Gebäude × 3 Stufen ×
  Tag/Nacht, zwei Kartengründe und drei generische Bauzustände × Tag/Nacht.
- Quellen: 74 unveränderte Dateien aus `CODEX/CityAssets/` und 24 freigegebene Dateien aus
  `CODEX/NEW-HAVEN-ASSET-CONTROL-2026-07-30/deliveries/`.
- Gebäude-/Bauzustandssprites wurden für die Runtime auf 640 × 640 px optimiert; die beiden
  1672 × 941 px großen Kartengründe behalten ihre Quellauflösung. Gesamtgröße: 10,234,476 Bytes.
- `campArt.ts` löst Tag/Nacht und Stufenfallback auf; `campMapArt.ts` bindet Kartengrund,
  Leerplatz, Baustelle und Gerüst in beiden Lichtfassungen.
- `NewHavenPage.tsx` nutzt einen rein kosmetischen lokalen Lichtzyklus (Tag 07:00–18:59),
  schaltet Karte/Popup/Liste gemeinsam, zeigt im Baumenü echte Stufe-I-Art und im
  Platzierungsgeist den freigegebenen Leerplatz.
- Keine Änderung an Engine, Content, Persistenz, Save-State oder `.claude/**`.
- QA: 98/98 Dateien, 0 unerwartete; 96/96 Sprites mit Alpha und transparenten Ecken; alle
  15 IDs im Content vorhanden; 45 Gebäude-Paare durchschnittlich 99,608 % Masken-IoU;
  interner TypeScript-Lauf mit 151 Eingabedateien und 0 Diagnosen.
- Code-Marker: `codex:2026-07-30T22:30:00+02:00` in `campArt.ts`, `campMapArt.ts`,
  `NewHavenPage.tsx` und `assets/camp/README.md`.
- Backup, Mapping und QA:
  `CODEX/outbox/2026-07-30-new-haven-runtime-preintegration/`.

## UI-/Woodcutting-Nacharbeit 2026-07-30

- `gravewood-navigation.css`: Sidebarrahmen auf 10 px verstärkt; Hover von Sidebar und Topbar
  rasterisiert oder transformiert nicht mehr die gesamte Buttonbox.
- `gravewood-character-fixes.css`: Equipment-Owner lokal von globalen 28 px auf 14 px Rahmenbreite
  reduziert und Desktopspalten auf `0.98fr 1.28fr 1.54fr` verteilt.
- Woodcutting-Audit: alle 16 `cut_*` besitzen Action-Art; fehlend waren ausschließlich
  `craft_timber_beam`, `craft_timber_brace`, `craft_timber_anchor`.
- Neue Runtime-Assets:
  `assets/actions/craft_timber_{beam|brace|anchor}.webp` (1024 px) und
  `assets/items/timber_{beam|brace|anchor}.webp` (640 px), RGBA mit transparenten Ecken und ohne
  messbaren grünen Halosaum.
- Kontrollquellen/Preview: `CODEX/AssetControl/Woodcutting/`.
- Rollbackstände:
  `CODEX/outbox/2026-07-30-gravewood-hover-equipment-structure-prechange/` und
  `CODEX/outbox/2026-07-30-woodcutting-runtime-preintegration/`.
- QA: drei scoped CSS-Dateien fehlerfrei geparst, 0 fehlende CSS-URLs, TypeScript 151 Dateien /
  0 Diagnosen.
- Code-Marker: `codex:2026-07-30T23:48:41+02:00` in Navigation/Character-Fix sowie
  `codex:2026-07-30T23:59:10+02:00` in der Topbar-Hoverkorrektur.

## Empfohlener Claude-Owner

`.claude/agents/ui-dev.md` für visuellen Mehrseiten-/Mehrgrößen-Rundgang und finalen Build; Codex bleibt laut Chef für die fortlaufende UI-Gestaltung zuständig.

## Character-/Hover-/Performance-Pass 2026-07-31

- Auftrag: farbige Equipment-Rarity-Rahmen entfernen, defekten Sidebar-3D-Hover zurückbauen,
  Itemkarten schließbar machen und die akute UI-Framerate untersuchen/verbessern.
- Ergebnis:
  - `gravewood-controls.css` entfernt Rarity-Borders nur in Character-Inventar/Equipment/Bag,
    lässt die radialen Seltenheitsscheine jedoch bestehen.
  - `gravewood-navigation.css` neutralisiert Sidebar-Transform/Scale/Translate vollständig;
    Topbar-Hover bleibt separat erhalten.
  - `ItemTooltip.tsx` und `components.css` ergänzen ein zugängliches X direkt neben dem Wiki-Knopf.
  - `Toasts.tsx` führt den großen Besitz-/Achievement-/Mastery-Diff höchstens einmal pro Sekunde
    statt bei jedem 10-Hz-Live-Tick aus.
  - `GameContext.tsx` bündelt Display-rAF-Aufrufe auf maximal 30 Simulationen/s und priorisiert
    den 10-Hz-React-Tick per Transition.
  - `App.tsx`/`gravewood-controls.css` stellen beide breiten Topbar-Fills von `clip-path` auf
    `scaleX` mit 80-ms-Transition um.
  - `base.css` entfernt festen Stone-Background und den bildschirmfüllenden SVG-Turbulence-Filter.
  - `MainMenu.tsx`/`menu.css` reduzieren Funken 18→10 und entfernen den Live-Blur großer
    Nebelflächen; der weiche Radialverlauf bleibt sichtbar.
  - `EquipmentOverview.tsx` entfernt eine unbenutzte `computeStats`-Berechnung aus der Paperdoll.
- Bestandsschutz: Keine New-Haven-, Engine-, Content-, Save-, `.claude/**`- oder
  `packages/**`-Änderung.
- QA: TypeScript 151 Dateien / 0 Produktdiagnosen bei explizitem vorhandenem Client-TypeRoot;
  fünf betroffene CSS-Dateien mit PostCSS fehlerfrei geparst.
- Noch zu messen: reale FPS/Frame-Time in Electron bei 1920×1080 und 3440×1440. Weitere P0-Pfade
  sind Character-Grid-Reconciliation und die großen Achievement/Skill/Bestiary/Bank/Shop-Grids;
  Combat zusätzlich Parent-Doppelrender und Partikel-Canvas.
- Rollback:
  `CODEX/outbox/2026-07-31-slot-hover-tooltip-performance-prechange/`.
- Code-Marker: `codex:2026-07-31T00:32:37+02:00`.

## Übergabeformat für künftige Arbeiten

Jede materielle Lieferung ersetzt den Abschnitt „Aktueller Status“ durch:

- **Auftrag:** Was Chef/Claude bestellt hat
- **Ergebnis:** Was konkret fertig ist
- **Betroffene Reviere:** Design / Assets / UI / Content / Logic / Combat / Persistence / Release
- **Dateien:** vollständige Pfade oder geordnete Liste
- **Verifikation:** ausgeführte headless Checks und Ergebnis
- **Offen:** Entscheidungen, Risiken, fehlende Assets oder Blocker
- **Empfohlener Claude-Owner:** zuständige Rolle aus `.claude/agents/`
- **Outbox:** Link auf ein Lieferpaket unter `CODEX/outbox/**`, falls vorhanden
- **Codex-Code-Marker:** Liste aller verwendeten `codex:<timestamp>`-Marker und Dateipfade; bei kommentarfreien Dateien zusätzlich der genaue geänderte Datenabschnitt

## Action-Card Layout 01 — Vier-Input-Vertrag 2026-07-31

- **Auftrag:** Zehn stabile Skill-Action-Card-Systeme entwerfen und nach Chef-Auswahl ausschließlich
  die Geometrie von `01 Fixed Dock` produktiv übernehmen. Card-Zustände dürfen bei STOP, Locked,
  Materialmangel oder 0–4 Inputs ihre Außenhöhe nicht verändern.
- **Ergebnis Design:** Korrigierte HTML-Kontrolltafel mit zehn Konzepten, je vier Zustände und
  zehn PNG-Previews unter `CODEX/AssetControl/ActionCardConcepts-2026-07-31/`. Der verworfene
  Zwei-Input-Erstpass bleibt vollständig unter `archive/rejected-two-input-pass/` erhalten.
- **Ergebnis Runtime:** Alle `SkillPage`-Action-Cards nutzen jetzt einen festen 720-px-Vertrag:
  Hero, 2×2-Stats, feste Output-/Lootzone, 2×2-Ressourcenrack, State-Platte, Preset-Grid und
  Mastery. Rezepte zeigen bis zu vier echte Inputs; nicht belegte Slots bleiben ruhige Reserven.
  STOP/Craftable/Locked ersetzen dieselbe State-Platte. `1×/25×/50×/∞` bleibt immer sichtbar
  und ist bei Level-/Materialblockade deaktiviert.
- **Art-Direction:** Nur Layout 01 wurde übernommen. Bestehende Citadel-Rahmen, Gravewood-Holz,
  Leder, Bronze und Action-Art bleiben produktiv; keine neue Theme-Entscheidung.
- **Betroffene Reviere:** Design, UI. Keine Engine-, Content-, Shared-, Persistence-, New-Haven-,
  `.claude/**`- oder `packages/**`-Änderung.
- **Dateien:**
  - `apps/client/src/renderer/pages/SkillPage.tsx`
  - `apps/client/src/renderer/styles/gravewood-actioncards.css`
  - `CODEX/AssetControl/ActionCardConcepts-2026-07-31/**`
- **Verifikation:** Content-AST durch Root-QA: 672 `inputs`-Arrays, Maximum 4, kein Rezept >4.
  TypeScript: 151 Client-Dateien, 0 Diagnosen. PostCSS: 45 Top-Level-Nodes, keine Syntaxfehler.
  DOM-/CSS-Vertrag: Vier-Slot-Loop, feste State-Platte, 720 px, sechs Body-Zonen, zwei
  Level-/Material-Guards und zehn Preview-PNGs bestätigt.
- **Offen:** Visueller Live-Rundgang durch Gathering, aktives STOP, Vier-Input-Crafting,
  Foraging-Multiloot und Locked bei 1920×1080 sowie 3440×1440 durch Chef/UI-Owner.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` für den visuellen Rundgang und finalen Build.
- **Outbox:** `CODEX/outbox/2026-07-31-action-card-layout01-prechange/`.
- **Codex-Code-Marker:** `codex:2026-07-31T19:32:00+02:00` in `SkillPage.tsx` und
  `gravewood-actioncards.css`; Kontrolltafel `codex:2026-07-31T19:14:00+02:00`.

## New Haven — freie Platzierung und Kapazität 2026-07-31

- **Auftrag:** New Haven von festen Bauplätzen auf freie, persistierte Kartenplatzierung
  umstellen; nur Kartengrenze und Gebäudeüberlappung begrenzen. Den Kopfblock entfernen,
  Map/List ohne Seiten-Scrollbar auf die verfügbare Höhe spannen, Karten- und Listenbaukosten
  vereinheitlichen und einen lokalen Kostenlos-Debugschalter neben `List` ergänzen.
- **Ergebnis:** Gebäude können auf der gesamten Karte frei positioniert werden. Der vollständige
  Fußabdruck muss innerhalb der Karte liegen und darf kein anderes Gebäude schneiden. Bestehende
  Positionen bleiben über `camp.positions` stabil gespeichert. Das Rathaus liefert nun 4/5/5
  zusätzliche Gebäudekapazität (gesamt 4/9/14); der alte technische Feldname `buildSlots` bleibt
  nur zur Save-/API-Kompatibilität erhalten.
- **Debug:** Der UI-lokale, nicht persistierte Debugschalter erlässt ausschließlich Gold- und
  Materialkosten. Crew-, Rathaus-, Kapazitäts-, Zeit-, Kartenrand- und Kollisionsregeln bleiben
  aktiv. Karten-Baumenü und Listenansicht verwenden dieselben Engine-Prädikate und Kosten.
- **UI:** Alter Intro-/Town-Hall-/Build-Slot-/Crew-Kopfblock entfernt. Map bleibt fest, während
  Baumenü beziehungsweise Liste intern scrollen. New-Haven-Karten wurden an die vorhandene
  Action-Card-Sprache angenähert und Kosten im Karten-Baumenü vollständig sichtbar gemacht.
- **Betroffene Dateien:** `apps/client/src/renderer/pages/NewHavenPage.tsx`,
  `apps/client/src/renderer/styles/newhaven.css`, `apps/client/src/renderer/i18n/translations.ts`,
  fünf Dateien unter `apps/client/src/renderer/i18n/locales/`, `packages/shared/src/index.ts`,
  `packages/engine/src/camp.ts`, `packages/engine/src/camp.test.ts`,
  `packages/engine/src/camp-map.test.ts`, `packages/content/src/index.ts`.
- **Entscheid:** `design/newhaven-freie-platzierung-entscheid-2026-07-31.md`; überschreibt nur
  die alten Slot-/Polygon-/Kopfblockregeln der früheren New-Haven-Dokumente.
- **Persistence:** Kein Save-Bump nötig; Positionspersistenz existiert bereits in Save-Version 78,
  und es wurde kein neues `GameState`-Feld eingeführt.
- **Verifikation:** TypeScript — Client 151, Engine 176, Shared 1 und Content 7 Dateien, jeweils
  0 Diagnosen. PostCSS — `newhaven.css` mit 209 Top-Level-Knoten fehlerfrei geparst. Neun
  in-process Engine-Invarianten bestanden: Kapazität, normale Kostenpflicht, kostenloser Debugbau,
  kein Ressourcenverbrauch, Crew-/Kapazitäts-/Kartenrand-/Kollisions-Gates und Positionsspeicherung.
  Der reguläre Vitest-Runner konnte in der Sandbox wegen `spawn EPERM` nicht gestartet werden.
- **Offen:** Headless-Logik ist geprüft; visueller Live-Rundgang und regulärer Vitest-Lauf außerhalb
  der Sandbox bleiben bei Chef/Claude. Insbesondere 1920×1080 und 3440×1440 sowie Drag-Grenzen,
  interne Scrollbereiche und Map-/List-Kosten visuell prüfen.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` für den visuellen Rundgang und
  `.claude/agents/logic-dev.md` für den regulären Vitest-Lauf.
- **Outbox:** `CODEX/outbox/2026-07-31-new-haven-freebuild-prechange/`.
- **Codex-Code-Marker:** `codex:2026-07-31T19:00:03+02:00` in allen materiell geänderten
  TypeScript-, CSS-, Content-, Test- und Lokalisierungsblöcken.

## Rahmenauswahl und Ironwood-Bastion-Integration 2026-07-31

- **Auftrag:** Fünf neue Dark-Fantasy-Rahmen passend zu den produktiven Sidebarbuttons erzeugen,
  ältere Konzepte archivieren und die Kandidaten in einer HTML-Kontrollansicht bei realistischen
  UI-Größen zeigen. Nach Chef-Feedback mussten Rahmen und Preview deutlich kräftiger werden.
- **Ergebnis:** Der technisch defekte erste Pass ist verworfen. Fünf neu generierte
  1536×1024-RGBA-Rahmen als PNG und lossless WebP besitzen transparente Zentren und einen
  gemeinsamen 192-px-9-Slice-Vertrag. Die klickbare HTML-Ansicht nutzt echtes `border-image`.
- **Kontrollordner:** `CODEX/AssetControl/FrameSelection-2026-07-31-v2/` mit `index.html`,
  `previews/comparison-board.png`, `frames/**`, `metadata/slices.json`, Prompts, README und QA.
- **Archiv:** Der alte aktive Ordner ist als `REJECTED.md` markiert und zusätzlich vollständig unter
  `CODEX/AssetControl/archive/FrameSelection-2026-07-31-rejected-broken/` gesichert.
- **Chef-Entscheid/Runtime:** 01 **Ironwood Bastion** ist gewählt. Die produktive Default-Datei
  `apps/client/src/renderer/assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners.webp` wurde
  auf Ironwood umgestellt und auf 224×149/28-px-Slice kompatibilisiert. Damit wechseln Sidebar,
  Topbar und 196 bestehende Default-Citadel-Nutzungen zentral, ohne lokale Rahmenbreiten umzubauen.
- **Verifikation:** Auswahlassets: fünf transparente Zentren, kein sichtbares Chroma-Grün und echte
  Compact-/Tall-Stresstests. Runtime-Asset: RGBA, 224×149, transparenter 28-px-Innenbereich,
  0 sichtbare grüne Pixel. CSS der direkten Verbraucher mit PostCSS fehlerfrei.
- **Rollback:** `CODEX/outbox/2026-07-31-ironwood-bastion-default-prechange/`.
- **Offen:** Visueller Rundgang aller großen und sehr kleinen Citadel-Konsumenten durch Chef/UI-Owner.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` und `.claude/agents/asset-integrator.md`.
- **Codex-Marker:** `codex:2026-07-31T20:21:01+02:00` in Kontrollmetadaten,
  `design-system.css`, `gravewood-navigation.css`, `gravewood-actioncards.css` und dieser Übergabe;
  die kommentarfreie WebP-Ersetzung ist mit exaktem Produktionspfad oben dokumentiert.

## New Haven Maßstab, Popups und Action-Card-Rahmen 2026-07-31

- **Auftrag:** Gebäude responsiv und proportional darstellen, Rathaus als Größenreferenz behalten,
  Fischerhütte I verkleinern, einen Debug-Sofortabschluss ergänzen, die beschädigten Gebäude-Popups
  ordnen sowie Suffix-Chance aus Skillkarten entfernen und Produces/Mastery passend rahmen.
- **Ergebnis New Haven:** `camp.positions` bleibt die einzige persistierte Prozentwahrheit.
  Die gemeinsame Bühne entspricht 16 % Kartenbreite/28,44 % Kartenhöhe und ist auf 16:9 real
  quadratisch. Alle 15 Familien besitzen logisch kuratierte Stufenskalierungen innerhalb dieser
  Bühne; Rathaus bleibt 1, Fischerhütte I ist 0,64. `object-fit: contain` hält jedes Asset vollständig
  sichtbar. Der neue Sofortknopf schließt einen laufenden Auftrag ausschließlich über
  `tickCampBuild` ab.
- **Ergebnis Popups:** Ein 14-px-Außenrahmen besitzt das Modal; die innere BuildingCard entfernt
  Doppelrahmen, Art nutzt `contain`, Effektfelder brechen Text sauber um und lange Funktionshäuser
  scrollen innerhalb des Modals. Kosten, Fortschritt, Refining und Aktionen besitzen klar getrennte
  Leder-/Holzflächen.
- **Ergebnis Action Cards:** Die Suffix-Projektion und ihre Berechnung wurden vollständig aus
  `SkillPage` entfernt. Engine-Suffixlogik und Saves bleiben unangetastet. Produces-/Loot- und
  Mastery-Zonen besitzen nun vollständige 5-px-Frames mit Lederfläche.
- **Persistence:** Kein neues oder geändertes `GameState`-Feld, kein Save-Bump, keine Migration.
  Prozentpositionen existieren bereits in Save-Version 78; visuelle Skalierungen und Debugstatus
  werden nicht persistiert.
- **Verifikation:** TypeScript Client 151, Shared 1, Content 7, Engine 176 — jeweils 0 Diagnosen.
  Vier berührte CSS-Dateien mit PostCSS fehlerfrei. Der Vitest-API-Sammler startete in der Sandbox,
  sammelte dort aber 0 Dateien; die neuen Engine-Tests sind kompiliert, müssen regulär außerhalb
  dieser Umgebung laufen.
- **Outbox:** `CODEX/outbox/2026-07-31-new-haven-map-scale-instant-prechange/` und
  `CODEX/outbox/2026-07-31-action-card-suffix-frame-prechange/`.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` für Live-QA und
  `.claude/agents/logic-dev.md` für den regulären Engine-Testlauf.
- **Codex-Code-Marker:** `codex:2026-07-31T20:21:01+02:00` in allen materiellen Codeblöcken.

## Ironwood-Eckvertrag und Stein-Navigation 2026-07-31

- **Auftrag:** Nach Live-Screenshot die aus den Ecken in gestreckte Kanten ragenden Ornamente
  korrigieren, Sidebar/Topbar auf eine gekachelte mittelgrobe Steinfläche umstellen und den weiterhin
  glitchenden Sidebar-Hover samt eckigem Active-Inset entfernen.
- **Asset:** `01-ironwood-bastion-slice-safe.png/.webp` besitzt vier vollständige 192×192-Ecken.
  Zwischen ihnen liegen ausschließlich kontinuierliche Holz-/Metallschienen ohne Nieten, Pfeile,
  Spangen oder andere einmalige Details. Die produktive 224×149-Fassung hält denselben Vertrag bei
  28 px und ersetzt weiterhin zentral `wooden_frame_with_corners.webp`.
- **Navigation:** Sidebar, Footer und Topbar kacheln `texture-basalt.webp` mit 192×192 sichtbarer
  Fliesengröße unter dem separaten Rahmen. Sidebar-Hover/-Active setzt Transform, individuelle
  Translate/Scale-Werte, Filter, Animation und Pseudolayer hart zurück. Active besitzt keinen
  rechteckigen Inset-Selector mehr; Feedback bleibt auf Textlicht und einen äußeren Schatten begrenzt.
- **QA:** Runtime-WebP 224×149 RGBA, Zentrum Alpha 0, 0 sichtbare Chroma-Pixel. Echte 9-Slice-
  Renderings bei 560×64, 680×50 und 500×210 zeigen vollständig geschlossene Ecken und ruhige Kanten.
  `gravewood-navigation.css` mit PostCSS fehlerfrei geparst.
- **Kontrolle:** `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-runtime-28px-slice-safe.png`
  und `previews/selected-navigation-basalt.png`.
- **Rollback:** `CODEX/outbox/2026-07-31-ironwood-corner-slice-prechange/` enthält die beanstandete
  Vorfassung; CSS-Block über Marker vollständig auffindbar.
- **Codex-Code-Marker:** `codex:2026-07-31T21:30:08+02:00` in
  `gravewood-navigation.css`, Kontrolltafel, Metadatenbegleitung und dieser Übergabe. Die binäre
  Runtime-Ersetzung ist mit exaktem Pfad dokumentiert.

## Ironwood L-Corner und ruhiger Sidebar-Hover 2026-07-31

- **Live-Befund:** Die erste Slice-safe-Fassung war mechanisch korrekt, las sich aber als vier
  losgelöste quadratische Eckplaketten. Beim Sidebar-Hover blieben außerdem Außen-Glow und Filter auf
  Kindebenen sichtbar; die Footer-Systemaktionen wurden irrtümlich ebenfalls kalt auf Basalt gesetzt.
- **Assetkorrektur:** `01-ironwood-bastion-l-corner.png/.webp` verbindet alle Schienen über kompakte
  L-Knoten. Die 192-px-Quell- und 28-px-Runtime-Slicezonen bleiben unverändert. Produktiv ersetzt die
  korrigierte 224×149-RGBA-WebP erneut zentral
  `apps/client/src/renderer/assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners.webp`.
- **Navigation:** Sidebarzustände teilen nun denselben Rahmen, dieselbe Basaltkachel, denselben Schatten
  und dieselbe Pixelgeometrie. Kein Transform, Scale, Filter, Kindfilter, Glow oder Pseudolayer wird
  beim Hover zugeschaltet; nur die Textfarbe antwortet dezent. `Save`, `Main Menu`, `Mail`, `Options`
  und `Quit Game` bleiben als eigene warmbraune Gravewood-Gruppe erhalten.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-runtime-l-corner.png` und
  `previews/selected-navigation-final.png`.
- **Rollback:** `CODEX/outbox/2026-07-31-ironwood-l-corner-prechange/` enthält die zuvor produktive
  Square-Corner-Fassung.
- **QA:** Runtime-WebP 224×149 RGBA, transparentes 28-px-Zentrum und 0 sichtbare Chroma-Pixel; echte
  9-Slice-Renders bei 560×64, 680×50 und 500×210. Die kommentarfreie Änderung an
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/metadata/slices.json` ist hier mit Zielpfad
  dokumentiert.
- **Codex-Code-Marker:** `codex:2026-07-31T21:52:00+02:00` in
  `gravewood-navigation.css`, Kontrolltafel, README und dieser Übergabe.

## Warme Navigation und einheitlicher Character-Rahmen 2026-07-31

- **Navigation:** Sidebar nutzt 11 px, Topbar 8/12 px sichtbares Ironwood-Chrome. Beide liegen auf
  ruhigem dunklem Leder statt der beanstandeten grauen Basaltfläche; ihre Zustände wechseln weiterhin
  keine Geometrie oder Textur.
- **Footer:** Die fünf Systemaktionen verwenden rötlich-schwarzen, oxblood-getönten Stein. Dadurch
  trennt sich die Innenfläche klar vom braunen Ironwood-Rahmen.
- **Character:** Die drei sichtbaren Hauptowner `.cs-col-left`, `.cs-col-tabpanel` und `.cs-col-right`
  teilen exakt denselben 18-px-Rahmen, Slice 28 und dieselbe L-Corner-Runtimequelle. Keine zusätzliche
  Wrapper- oder Doppelrahmenebene wurde eingeführt.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-navigation-warm-materials.png`.
- **QA:** `gravewood-navigation.css` mit 58 und `gravewood-character-fixes.css` mit 9 Top-Level-Knoten
  fehlerfrei über PostCSS geparst; sämtliche referenzierten Assets vorhanden.
- **Persistence:** keine State-, Save- oder Engineänderung.
- **Codex-Code-Marker:** `codex:2026-07-31T22:08:00+02:00` und
  `codex:2026-07-31T22:14:00+02:00`.

## Frame-Button-Alpha-Clipping 2026-07-31

- **Befund:** Die Runtime-Schienen waren im Asset 3 px horizontal und 4 px vertikal von der echten
  Außenkante eingerückt. `border-box` zeigte deshalb außen Fläche; `padding-box` erzeugte innen einen
  deutlich zu großen schwarzen Spalt.
- **Finale Korrektur:** Die neun Slice-Zonen bleiben 28 px groß, ihre Schienen und L-Knoten wurden
  innerhalb der jeweiligen Zone an die echte Außenkante verschoben. Der kurze `padding-box`-Hotfix
  wurde vollständig entfernt; Navigation und übrige Citadel-Consumer dürfen ihre Fläche wieder bis
  unter das nun randbündige Chrome malen.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/edge-anchor-comparison.png`.
- **QA:** Runtime 224×149 RGBA, Alpha-Bounds exakt 0/0 bis 223/148, Center-Alpha 0, keine grünen
  Pixel und keine temporären Swap-Dateien. Drei CSS-Dateien fehlerfrei mit PostCSS geparst.
- **Rollback:** `CODEX/outbox/2026-07-31-ironwood-edge-anchor-prechange/`.
- **Codex-Code-Marker:** `codex:2026-07-31T22:41:00+02:00`. Die kommentarfreie Änderung an
  `metadata/slices.json` ist hier mit exaktem Zielpfad dokumentiert.

## Skalierende Navigation und Character-Background-Owner 2026-07-31

- **Sidebar/Topbar:** Das sichtbare Ironwood-Chrome skaliert nun mit `--sb-scale-eff` beziehungsweise
  `--tb-scale`; auch `border-image-width` folgt damit der tatsächlich gezogenen UI-Größe. Begrenzende
  `clamp()`-Werte verhindern zu dünne Klein- und überfette Großzustände.
- **Material:** Sidebar und Topbar nutzen `assets/bg_tileable_wood.webp` als echte wiederholbare
  Holzfläche. Normal, Hover, Active und Focus behalten dieselbe Geometrie und dieselbe Kachel.
- **Character:** `.cs-col-tabpanel` ist alleiniger Background-Owner für Equipment und Stats; die
  inneren Ansichten sind transparent. `.cs-col-right` besitzt die Taschenfläche allein und zieht sie
  vollständig bis unter den gemeinsamen 18-px-Rahmen.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-navigation-wood-scaled.png`.
- **QA:** beide geänderten CSS-Dateien fehlerfrei mit PostCSS geparst; Holz-, Equipment- und
  Taschenasset vorhanden. Kein Live-/Electron-Start, keine Persistence- oder Engineänderung.
- **Codex-Code-Marker:** `codex:2026-07-31T23:18:00+02:00`.

## War Table Ledger Main Menu 2026-07-31

- **Chef-Auswahl:** Main-Menu-Konzept 02 „War Table Ledger".
- **Produktion:** `MainMenu.tsx` trägt im geschlossenen Zustand eine responsive 2×2-Kommandotafel.
  Nach New Game, Load Game oder Options öffnet dieselbe Schale ein großes Ledger mit kompakter
  Register-Navigation und internem Scrollbereich. Das aktive Register oder das neue Schließen-X
  führt zurück zur Tafel.
- **Funktionserhalt:** Reale Save-Slots, New/Overwrite, Load/Delete, sämtliche geteilten Optionsregler,
  Sprachen, Bug Report, Font Preview und Quit bleiben an ihren bestehenden Handlern. Keine Save-,
  Engine- oder Persistence-Änderung.
- **Funktionaler Kontrollprototyp:**
  `CODEX/AssetControl/MainMenuConcepts-2026-07-31/index.html` mit vier klickbaren Screens,
  Rücknavigation, Slot-/Kartenwahl, Load-/Delete-Demos und exemplarischen Optionsinteraktionen.
- **QA:** Client-Typecheck über TypeScript-API: 151 Dateien, 0 Diagnosen. `menu.css` und
  Prototyp-CSS fehlerfrei mit PostCSS geparst; Prototyp-JavaScript syntaktisch fehlerfrei und alle
  lokalen Navigationsziele/Assets vorhanden. Browser-Live-QA bleibt offen, da in der aktuellen
  Umgebung kein Browser-Backend verfügbar ist; Electron wurde regelgemäß nicht gestartet.
- **Codex-Code-Marker:** `codex:2026-07-31T23:42:00+02:00`.

## War-Table-Unterseiten und New-Haven-Weltprojektion 2026-07-31

- **Main Menu:** Der fehlerhafte dauerhafte Seitenregister-Aufbau ist entfernt. Die 2×2-War-Table
  ist wieder ein eigenständiger Startbildschirm; New Game, Load Game und Options ersetzen sie als
  jeweils eigenes Vollfenster. Ein sichtbarer lokalisierter „Zurück zum Menü"-Knopf sowie Escape
  führen zurück. Die große Holzfläche wurde durch dunklen Basalt mit eingelassenen Lederbuttons
  ersetzt; Holz bleibt nur als dosierter Rahmen-/Materialakzent.
- **New Haven:** `.nh-map-stage` füllt den verfügbaren Layoutbereich, während `.nh-map` darin immer
  das größtmögliche exakte 1672:941-Rechteck bildet. Der Kartengrund wird vollständig statt per
  `cover` ausgeschnitten dargestellt. Prozentpositionen, Footprints, Pointer-Koordinaten und
  Drag-Ghosts beziehen sich damit bei 1920×1080 und 3440×1440 auf dieselbe Weltfläche.
- **Persistence:** Bereits gespeicherte Prozentkoordinaten bleiben gültig; kein GameState-Feld, keine
  Save-Version und keine Migration geändert.
- **QA:** Client-Typecheck 151 Dateien, 0 Diagnosen; `menu.css` und `newhaven.css` fehlerfrei mit
  PostCSS geparst; Tages- und Nachtkarte beide 1672×941 verifiziert.
- **Codex-Code-Marker:** `codex:2026-07-31T23:58:00+02:00` und
  `codex:2026-07-31T23:59:00+02:00`.

## Item-Card-HTML-Konzepte 2026-07-31

- **Auftrag:** Zehn stärker loot- und entscheidungsorientierte Dark-Fantasy-Item-Card-Systeme
  entwerfen, die vollständig mit HTML/CSS und realistisch verfügbaren Repo-Assets umsetzbar sind.
- **Ergebnis:** Zehn einzeln öffnbare responsive Konzepte plus klickbare Vergleichsansicht unter
  `CODEX/AssetControl/ItemCardConcepts-2026-07-31/`. Jedes Layout rendert dieselben drei realen
  Belastungsfälle: Legendary Unique mit Equip-Vergleich, Long-Name-Instanz mit fünf Affixen und
  stapelbares Questitem.
- **Asset-/Technikvertrag:** Ausschließlich vorhandene Item-Artworks, tilebare Holz-/Stein-/
  Equipmentflächen, CSS-Rahmen, Verläufe und ersetzbare Typografie. Keine kopierten Markenornamente,
  keine einmalig gemalten Elemente und keine externen Abhängigkeiten.
- **Betroffene Reviere:** Nur Designkontrolle. Kein Produktions-, Engine-, Content-, Save- oder
  `.claude/**`-Eingriff.
- **QA:** 11 HTML-Dateien, 10 Einzelkonzepte, JavaScript syntaktisch gültig, CSS-Struktur
  ausgeglichen, alle lokalen HTML-Verweise und Itemassets vorhanden, zehn Datenvertragsfelder
  bestätigt. Browser-QA blockiert: kein Playwright-Binary und System-Chrome `spawn EPERM`.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` nach Chef-Auswahl für die produktive
  Übertragung auf `ItemTooltip`/`ItemCell`.
- **Codex-Code-Marker:** `codex:2026-07-31T23:18:00+02:00` und
  `codex:2026-07-31T23:24:00+02:00` ausschließlich im Kontrollordner.

## Ledger-Dichte, Action-Card-Chrome und Navigationsmaterial 2026-07-31

- **Main Menu:** New/Load entfernen die äußere War-Table-Doppelhülle und verwenden ein einziges,
  inhaltsgebundenes Ledger. Fünf Slots stehen zentriert in fünf Spalten; die große leere braune
  Restfläche entfällt. Options bleibt als einzige Unterseite ein größeres internes Scrollfenster.
- **Action Cards:** Der Außenrahmen jeder vollständigen `.skillcard` wurde von 7 auf 14 px
  verdoppelt. Innere Info-, Ressourcen-, Status-, Mengen- und Masteryrahmen bleiben bewusst gleich,
  damit der feste Layout-01-Inhaltsvertrag nicht gequetscht wird.
- **Navigation:** Sidebar und Topbar nutzen kühlen Schiefer mit dezenter warmer Lichtkante statt
  brauner Holzkachel. Save/Main Menu/Mail/Options/Quit nutzen hellere rauchige Bronze mit Oxblood-
  Tönung statt fast schwarzem Basalt.
- **QA:** Client-Typecheck 151 Dateien, 0 Diagnosen; `menu.css`, `gravewood-actioncards.css`,
  `gravewood-navigation.css` und `newhaven.css` fehlerfrei geparst; alle Materialassets vorhanden.
- **Codex-Code-Marker:** `codex:2026-07-31T23:59:30+02:00`,
  `codex:2026-07-31T23:59:45+02:00` und `codex:2026-07-31T23:59:50+02:00`.

## New-Haven-Listen-Action-Cards und kostenloser Move-Modus 2026-07-31

- **Auftrag:** Die noch alten, inhaltsabhängig wachsenden New-Haven-Listenkarten an den freigegebenen
  Action-Card-Vertrag angleichen, Gebäude-Art vollständig einpassen und die fehlende sichtbare
  Verschiebesteuerung ergänzen.
- **UI-Ergebnis:** `.nh-grid` verwendet feste 760-px-Karten mit sechs stabilen Zonen. Art, Kopf,
  Flavor, Jetzt/Nächste-Wirkung, Bauaktion und Funktionsdock bleiben unabhängig von Build-/Locked-/
  Refinery-Zustand an derselben Stelle. Normale Gebäude lassen den Funktionsbereich nicht leer,
  sondern spannen ihren Aktionsdock über beide unteren Rasterzeilen.
- **Art-Ergebnis:** Gebäude-Art verwendet `object-fit: contain`, eine ruhige kalte Steinbühne und
  einen 7-px-Ironwood-Rahmen. Das Quell-Seitenverhältnis bleibt erhalten; kein Cropping.
- **Popup/Move:** Das Gebäude-Popup besitzt vollständig gerahmte Module, eine eigene Aktionszeile
  und einen kostenlosen `Move`-Befehl. Derselbe lokale Move-Modus ist neben Map/List sichtbar.
  Normale Klicks öffnen weiterhin das Popup; Drag ist ausschließlich im Move-Modus aktiv.
- **i18n:** Move, Hinweis und Abschlussbefehl in EN/DE/ES/FR/pt-BR/RU/ZH ergänzt.
- **Persistence:** Keine State-, Save-, Content- oder Engineänderung. Bestehende Prozentpositionen
  in `camp.positions` bleiben die einzige persistierte Wahrheit.
- **QA:** Client-Typecheck über TypeScript-API: 151 Dateien, 0 Diagnosen. `newhaven.css` mit PostCSS
  fehlerfrei geparst; 0 fehlende lokale CSS-Assets. Kein Live-/Electron-Start.
- **Betroffene Dateien:** `pages/NewHavenPage.tsx`, `styles/newhaven.css`,
  `i18n/translations.ts`, fünf Dateien unter `i18n/locales/` sowie diese Codex-Dokumentation.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` für Live-QA bei 1920×1080 und 3440×1440.
- **Codex-Code-Marker:** `codex:2026-07-31T23:42:00+02:00`.

## New-Haven-Kartenverdichtung und Überlappungsfreigabe 2026-07-31

- **Live-Befund:** Der erste feste Listenvertrag spannte normale Gebäudekarten künstlich über
  760 px und erzeugte zwischen Materialkosten und Bauaktion einen großen leeren Schacht.
- **Korrektur:** Normale Karten sind nun stabile 640 px hoch und besitzen fünf vollständig genutzte
  Zonen. Nur Veredelungsgebäude verwenden 760 px mit einem sechsten Funktionsdock. Alle Artworks
  bleiben per `contain` vollständig sichtbar.
- **Chef-Nachentscheid:** Gebäude dürfen sich beliebig überlappen. `campPositionReason` prüft nur
  noch den Kartenrand; `campRepairPositions` bewahrt gültige überlappende Prozentpositionen beim
  Laden, statt sie auf Rasterplätze zu verschieben. Automatische Erstverteilung bleibt weiterhin
  ordentlich verteilt.
- **Save:** Kein Feld und kein Format geändert, deshalb kein Save-Bump und keine Migration. Die
  bestehende v78-Prozentstruktur bleibt unverändert.
- **Tests/QA:** Betroffene Engine- und Persistence-Tests wurden auf erlaubte Überlappung umgestellt.
  TypeScript Client 151, Shared 1, Engine 176, Persistence 15 — jeweils 0 Diagnosen. Der Vitest-API-
  Runner sammelte in dieser Sandbox erneut 0 Dateien; regulärer Testlauf bleibt bei Claude offen.
- **Betroffene Reviere:** Renderer UI, Engine Camp-Prädikat, Shared Positions-Sanitize,
  Persistence-Test und bindender New-Haven-Entscheid. `.claude/**` blieb unverändert.
- **Codex-Code-Marker:** `codex:2026-07-31T23:56:00+02:00`.

## Fünf Used-Iron-Navigationsrahmen 2026-07-31

- **Auftrag:** Mehr Frame-Variation für die grauen Sidebar-/Topbar-Buttons; fünf Vorschläge aus
  gebrauchtem Eisen, kompatibel mit dem Dark-Fantasy-Look.
- **Ergebnis:** Fünf getrennt generierte Alpha-PNGs samt unveränderten Chromaquellen und gemeinsamer
  Vergleichstafel unter `CODEX/AssetControl/IronFrameConcepts-2026-07-31/`.
- **Varianten:** Blackened Forge, Bronze-Lipped Iron, Ashen Steel Bevel, Grave-Iron Battlement und
  Shield-Corner Steel.
- **Technikvertrag:** Leeres Zentrum, kompakte Ecken, ruhige Kanten ohne Nieten/Einzelmotive in den
  Stretchzonen. Dies sind Auswahlkonzepte; finale Slice-Maße und Stresstests folgen erst nach Wahl.
- **Pipeline:** Built-in ImageGen. Python-Chroma-Helfer durch Windows-Prozesssandbox blockiert;
  äquivalente lokale Alpha-Matte mit Border-Sampling, Soft-Matte, Despill und Trimming ausgeführt.
  QA: RGBA, transparente Ecken, 0 grün-dominante sichtbare Randpixel.
- **Produktion:** Keine Runtime-Datei ersetzt und kein CSS umverdrahtet.
- **Codex-Marker:** `codex:2026-07-31T23:56:00+02:00` im Kontroll-README und dieser Übergabe.

## Bronze-Lipped-Iron-Navigation 2026-08-01

- **Chef-Auswahl:** Konzept 02 `Bronze-Lipped Iron` wurde als produktiver Navigationsrahmen umgesetzt.
- **Asset:** 512 × 512 px, RGBA, transparentes Zentrum, Slice 96. Alle einmaligen Eckdetails wohnen
  vollständig in den vier Corner-Slices; die 320-px-Mittelkanten sind gespiegelt und nahtlos kachelbar.
- **Runtime:** ausschließlich `.sb-skill-btn` und `.topbar-item` verwenden den neuen Rahmen. Footer-
  Systemaktionen behalten ihre warme Ironwood-Familie; globale Citadel-/Containerrahmen wurden nicht ersetzt.
- **Produktionsdateien:**
  `apps/client/src/renderer/assets/ui/gravewood/frames/nav-bronze-lipped-iron-9slice.png` und `.webp`.
- **Kontrolle:** `CODEX/AssetControl/IronFrameConcepts-2026-07-31/selected-02-9slice-atlas.png`
  sowie `selected-02-runtime-preview.png`.
- **Rollback:** `CODEX/outbox/2026-08-01-nav-iron-frame-prechange/` enthält das vorherige
  `gravewood-navigation.css` und die freigegebene Konzeptquelle.
- **QA:** PostCSS fehlerfrei; 0 fehlende lokale CSS-Assets; PNG/WebP 512 × 512 mit Alpha;
  Mittelpunkt-Alpha 0; Client-Typecheck 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T08:25:32+02:00`. Die binären PNG-/WebP-Dateien
  können keinen Kommentar tragen und sind deshalb hier mit exaktem Pfad dokumentiert.

## Navigationsmaterial und Content-Höhe 2026-08-01

- **Live-Befund:** Der neue Rahmen gefiel, aber das helle Cold-Slate-Material wirkte unpassend und
  die identischen Werte für Layout-Rand und gemalte Rahmenbreite nahmen Text/Icon unnötig Innenhöhe.
- **Korrektur:** Sidebar und Topbar verwenden nun den vorhandenen nahtlosen dunklen Basalt mit
  sehr schwacher warmer Reflexion. Das Material bleibt in allen Zuständen geometrisch identisch.
- **Geometrie:** `border-width` reserviert nur die nötige Layoutzone; `border-image-width` malt den
  kräftigen Bronze-Lipped-Iron-Rahmen weiterhin in seiner freigegebenen Stärke. Sidebarbuttons sind
  höher, Icons besitzen eine vollständige skalierende Contentbox und Topbar-Tabs füllen ihre Barhöhe.
- **Kontrolle:**
  `CODEX/AssetControl/IronFrameConcepts-2026-07-31/selected-02-basalt-content-preview.png`.
- **Rollback:** `CODEX/outbox/2026-08-01-nav-surface-content-fix-prechange/`.
- **QA:** `gravewood-navigation.css` fehlerfrei mit PostCSS geparst, 0 fehlende lokale Assets;
  Client-Typecheck 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T08:48:51+02:00`.

## Navigationsschale, Topbar-Luft und Holzrahmen-Naht 2026-08-01

- **Sidebar-Schale:** Das schwarze Rosenmuster wurde durch die vorhandene ruhige, dunkel-warme
  `texture-gravewood.webp` ersetzt. Die Fläche bleibt absichtlich wärmer als die Basaltbuttons,
  damit Rahmen und Bedienelemente klar lesbar bleiben.
- **Vergessener Bedienfall:** `.sb-combat-toggle` verwendet nun ebenfalls Bronze-Lipped Iron und
  Basalt; der schmale Pfeilknopf fällt nicht mehr in die alte Holzfamilie zurück.
- **Topbar:** Skalierende vertikale Innenluft ergänzt, damit die 9-Slice-Ecken weder Fensterkante
  noch Statusbereich berühren. Die Tab-Höhenlogik selbst blieb unverändert.
- **Footer:** Save/Main Menu/Mail/Options/Quit verwenden jetzt tiefes, verkohltes Leder statt der
  zu hellen Bronze-Braunfläche.
- **Holzframe:** Das neue Runtime-Derivat
  `apps/client/src/renderer/assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp`
  schließt die transparenten 3-/4-px-Zwischenräume innerhalb der 28-px-Ecksegmente. Die laufende
  App hielt den bisherigen zentralen Pfad gesperrt; deshalb wurden nur Sidebar-/Topbar-Schalen auf
  den sicheren Alias gebunden und kein erzwungenes Überschreiben vorgenommen.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/runtime-seam-fix-comparison.png`.
- **Rollback:** `CODEX/outbox/2026-08-01-nav-shell-frame-seam-fix-prechange/` enthält CSS und das
  unveränderte vorherige Holz-WebP.
- **QA:** PostCSS fehlerfrei; sämtliche lokalen CSS-Assets vorhanden; die alten Nahtspalten hatten
  0 Alpha-Pixel, das Derivat an denselben Schienenpositionen durchgehend 13/15; Client-Typecheck
  195 Quelldateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T09:08:19+02:00`. Das kommentarlose JSON und die binären
  Assets sind hier mit exakten Pfaden dokumentiert.

## Globale Holzrahmenmigration und New-Haven Action-Card V2 2026-08-01

- **Ursache der Restlücke:** Der nahtbereinigte Alias war zunächst nur an Sidebar-/Topbar-Schale
  gebunden. 198 weitere direkte Holzframe-URLs verwendeten weiterhin das gesperrte Alt-WebP.
- **Globale Korrektur:** 198 Bindungen in 36 Renderer-Stylesheets zeigen jetzt auf
  `apps/client/src/renderer/assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp`.
  Der gesperrte zentrale Altpfad wurde nicht erzwungen überschrieben und bleibt binär unverändert.
- **Navigation:** `.topbar::before` wurde vollständig deaktiviert; der vom Chef markierte äußere
  Holzrahmen entfällt. `.sb-combat-toggle::before` wurde ebenfalls deaktiviert, weil die geerbte
  `.ds-button`-Fassung den neuen Eisenrahmen mit altem Holz doppelte.
- **New Haven Liste:** Fließende Cardbreiten/-höhen über `clamp()` und Container-Einheiten; stabiler
  Zonenvertrag für 1920×1080 bis 3440×1440. Flavor ist nicht mehr kursiv, die Current-/Next-Zone
  ist ein zusammenhängender Cold-Slate-Vergleichsstreifen, Kosten liegen auf ruhiger Basaltfläche.
- **New Haven Popup:** Adaptive 500–680-px-Breite, vollständiger Beschreibungstext, größere
  Artworkzone, keine verschachtelte Leder-Kostenbox und konsistente Bronze-Lipped-Iron-Aktionen.
  Der rote Citadel-X-Button wurde durch `.nh-popup-close` mit Eisenframe, Basaltfläche und reinem
  CSS-Kreuz ersetzt.
- **Fontlabor:** `CODEX/AssetControl/SidebarFontLab-2026-08-01/index.html` vergleicht fünf bereits
  eingebettete Displayfonts mit realer Sidebar-Geometrie und allen sieben Spielsprachen. RU/ZH
  verwenden bewusst sprachspezifische Fallbacks; fachliche Vorauswahl ist Marcellus SC.
- **Materialvorschlag Character:** Character = warmes Umber-Gewebe, Equipment = dunkler Basalt/
  geschwärztes Eisen, Inventar = bestehende Tasche. Leder damit nur dort, wo es semantisch passt.
- **Rollback:** `CODEX/outbox/2026-08-01-newhaven-nav-cohesion-prechange/` enthält Navigation,
  New-Haven-CSS, zentrales Alt-WebP und alle 36 vor der Pfadmigration gesicherten Stylesheets.
- **QA:** 51 Stylesheets ohne PostCSS-Fehler, 0 fehlende CSS-Assets, 0 verbleibende Altpfade,
  205 Bindungen auf den nahtfreien Alias; Client-TypeScript 195 Quelldateien, 0 Diagnosen.
  Fontlabor-JavaScript ohne Parserdiagnose und ohne fehlende statische/dynamische Assets.
- **Codex-Code-Marker:** `codex:2026-08-01T09:30:10+02:00`.

## Globale Metamorphous-Typografie — verworfener Zwischenentscheid 2026-08-01

- **Historie:** Fontlabor-Variante `03 Metamorphous Relic` war kurzzeitig globale Hausschrift,
  wurde anschließend durch die aktuelle Chef-Auswahl Fell Chronicle ersetzt.
- **Runtime:** `--font-head` zeigt auf das bereits gebündelte
  `apps/client/src/renderer/fonts/Metamorphous-Regular.ttf`. Body, Buttons, Eingaben und sämtliche
  bestehenden `var(--font-head)`-Verbraucher übernehmen die Schrift ohne Komponenten-Sonderpfade.
- **Lokalisierung:** `html:lang(ru-RU)` verwendet Georgia/Times/Noto Serif; `html:lang(zh-CN)` nutzt
  Microsoft YaHei/Noto Serif CJK SC/STSong/SimSun. Dadurch entsteht keine zufällige Mischschrift
  innerhalb eines russischen oder chinesischen Wortes.
- **Rollback:** `CODEX/outbox/2026-08-01-metamorphous-global-prechange/base.css`.
- **QA:** `base.css` fehlerfrei geparst, lokale Metamorphous-Datei vorhanden, Client-TypeScript
  195 Quelldateien und 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T09:49:24+02:00`.

## Globale Fell-Chronicle-Typografie und Dark-Fantasy-Runde 2 2026-08-01

- **Aktuelle Chef-Auswahl:** `Fell Chronicle`, technisch die bereits gebündelte Familie
  `IM Fell English SC`, ist appweit über `--font-head` aktiv.
- **Lokalisierung:** Russisch bleibt durchgehend Georgia/Times/Noto Serif; Chinesisch nutzt
  Microsoft YaHei/Noto Serif CJK SC/STSong/SimSun.
- **Zusätzliche Fontkandidaten:** Das Sidebar-Fontlabor enthält nun auch die lokal installierten
  Familien `Varnyx Regular` und `Hellock` als Varianten 06/07. Beide werden ausschließlich über
  CSS `local(...)` eingebunden; keine möglicherweise lizenzpflichtige Datei wurde kopiert.
- **Cohesive UI Runde 2:** Fünf reichere Gesamtsysteme unter
  `CODEX/AssetControl/CohesiveUI-2026-08-01/round-2-dark-fantasy/index.html`: Iron Reliquary,
  Ashen Cathedral, Gravewood Arsenal, Bloodglass Sanctum und Warden's Ossuary. Die verworfene
  schlichte Runde liegt unter `archive-round-1-simple/`.
- **Produktionsvertrag:** Jede Variante zeigt Sidebar, Topbar, Statusband, Character, Equipment
  und Inventory gemeinsam. Das README benennt pro System drei konkrete optionale Produktionsassets
  mit Maßen und Slice-Vertrag; keine Runtime-Datei wurde durch die Designrunde verändert.
- **Rollback:** `CODEX/outbox/2026-08-01-fell-chronicle-global-prechange/`.
- **QA:** Base-CSS, Fontlabor-CSS/JS und Runde-2-CSS/JS fehlerfrei; keine externe Font-/CDN-URL;
  Fell-, Varnyx- und Hellock-Dateien lokal gefunden; Client-TypeScript 0 Diagnosen.
- **Codex-Code-Marker:** `codex:2026-08-01T10:04:43+02:00` sowie
  `codex:2026-08-01T10:01:57+02:00` für die beiden lokalen Fontkandidaten.

## Warbanner-Item-Card und Sidebar-Zahlen 2026-08-01

- **Chef-Auswahl:** Item-Card-Konzept `05 — Warbanner Record` ist produktiv in
  `apps/client/src/renderer/components/ItemTooltip.tsx` und `styles/components.css` umgesetzt.
- **Layout:** Die Karte nutzt bis zu 860 px Breite. Itembild und Lore stehen links; vorhandene
  Werte, Effekte, Setinformationen und Anforderungen liegen rechts. Statgruppen verteilen sich
  zweispaltig. Kopf und Aktionsbereich bleiben über die volle Kartenbreite erhalten.
- **Kein interner Scrollbereich:** Das frühere `max-height: 97vh; overflow-y: auto` wird für die
  produktive Item-Card aufgehoben. Die reale Höhe entsteht aus dem Inhalt; der große 444-px-
  Hochformat-Bildblock wurde durch eine responsive Bühne von 250–330 px ersetzt.
- **Vergleich:** Zwei Shift-Vergleichskarten passen bei Desktopbreiten nebeneinander; unterhalb
  der Desktopzone werden Karten enger, auf sehr schmalen Viewports untereinander angeordnet.
- **Sidebar:** Nur die sichtbaren Skilllevel auf den Hauptbuttons wurden für Fell Chronicle von
  11 auf 22 Skalierungspixel verdoppelt und erhielten eine reservierte rechte Textspalte. Die
  kleinen Kampf-Unterwerte bleiben unverändert, damit keine Unterzeilen aufbrechen.
- **Unverändert:** Canvas-/Basaltfläche, Rahmen, Hoverlogik, Itemdaten, Aktionen, Vergleichslogik,
  Savegame und i18n wurden nicht funktional verändert.
- **Rollback:** `CODEX/outbox/2026-08-01-warbanner-itemcard-sidebar-numbers-prechange/`.
- **QA:** `components.css` und `gravewood-navigation.css` fehlerfrei geparst, 0 fehlende lokale
  Assetpfade; Client-TypeScript 151 Dateien und 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T10:20:00+02:00`.

## Sidebar-Drawer, gleichmäßige Topbar und Detailkarten-Polish 2026-08-01

- **Sidebar-Level:** Levelwerte verwenden wieder ausschließlich `Metamorphous`; Fell Chronicle
  bleibt global und für Skillnamen aktiv. Die zuvor verdoppelte Größe wurde auf 50 % zurückgesetzt
  (`11px × --sb-scale-eff`, Clamp 9–19 px).
- **Bottom-Drawer:** Die fünf Systemaktionen Save/Main Menu/Mail/Options/Quit liegen in einem
  flüssig nach oben öffnenden Footer-Drawer. Im Ruhezustand belegt nur die lokalisierte `Menu`-
  Lasche Höhe. Hover, `:focus-within` und angehefteter Klick öffnen; Reduced Motion wird beachtet.
- **i18n:** `sidebar.drawerMenu` wurde für EN/DE/ES/FR/PT-BR/RU/ZH ergänzt. Bestehende Guide-IDs,
  Aktionen, Save-/Quitlogik und Mailzähler blieben erhalten.
- **Topbar:** Alle neun Tabs teilen den vorhandenen Raum strikt gleich (`flex: 1 1 0`,
  `min-width: 0`). Schriftgröße basiert mit `cqw` auf der eigenen Zellenbreite. Alle Tabs nutzen
  explizit dieselbe tilebare Basalt-/Canvasfläche wie die Sidebar-Skillbuttons.
- **New Haven Popup:** Now/Next sind zwei kompakte, separat gerahmte Karten mit Abstand statt
  einer hohen geteilten Tafel. Der X-Knopf ist 27–33 px groß und sitzt direkt im rechten Chrome.
- **Warbanner Item-Card:** Trennlinie liegt nun ausschließlich als linke Kante am Datenbereich und
  kann nicht mehr ins Artwork ragen. Der Suffixkopf zeigt nur `… <Suffixname>`; Roll-Prozent und
  Kategorie entfallen, die Boni bleiben unverändert darunter. Offense-Werte erhielten eine größere,
  klarere Zahlenhierarchie. Der On-Hit-Bereich ist eine dunkle gravierte Fläche mit schmalem
  Rarity-Akzent statt einer grünen Vollfläche.
- **Typografie:** Exocet ist die ikonische Diablo-Schrift, aber als kommerzielle Adobe-Font nicht
  ungeprüft redistribuierbar. Die Card nutzt daher die bereits gebündelte Kombination Cinzel für
  Datentext und Metamorphous für dramatische Titel/Werte; RU und ZH behalten eigene sichere Stacks.
- **Rollbacks:** `CODEX/outbox/2026-08-01-sidebar-level-metamorphous-prechange/`,
  `CODEX/outbox/2026-08-01-sidebar-drawer-equal-topbar-prechange/` und
  `CODEX/outbox/2026-08-01-newhaven-itemcard-polish-prechange/`.
- **QA:** Vier geänderte CSS-Dateien fehlerfrei geparst, 0 fehlende lokale Assetpfade, alle sieben
  Drawer-Übersetzungen vorhanden; Client-TypeScript 151 Dateien und 0 Diagnosen.
- **Codex-Code-Marker:** `codex:2026-08-01T10:34:00+02:00`,
  `codex:2026-08-01T10:42:00+02:00`, `codex:2026-08-01T10:55:00+02:00` und der finale
  New-Haven-Kaskadenanker `codex:2026-08-01T11:03:00+02:00`.

## Tooltip-Compare, Varianten-Pouch, Drawer-Lasche und Action-Card-Lesbarkeit 2026-08-01

- **Damage-Fehler:** Offense-Zeilen verwenden feste Grid-Spuren für Icon, Label, Wert und Delta.
  `2.9–5.4` kann nicht mehr in die Damage-Beschriftung laufen; lange Übersetzungen umbrechen nur
  in der Labelspur.
- **Compare:** Das alte System der eingebetteten Up-/Down-Bildpfeile wurde aus allen 37
  StatRow-Aufrufen und aus der Rendererlogik entfernt. Vergleichskommunikation erfolgt nur noch
  über die vorhandenen kompakten textbasierten `▲/▼`-Deltas.
- **Varianten-Pouch:** Varianten sind breite Vergleichszeilen: Itemidentität links, tatsächliche
  von `suffixEffectParts`/`affixEffectParts` gelieferte Boni rechts, Rollgüte sekundär darunter.
  Unter 700 px fällt jede Zeile auf eine Spalte zurück; Basisversionen bleiben kompakt.
- **Drawer:** Die Menu-Steuerung verwendet das vorhandene transparente `tab-lever.webp` statt
  eines umlaufenden Buttoncontainers.
- **Topbar-Schale:** Der bisher sichtbare Rosen-/Sidebargrund hinter den Tabs ist vollständig durch
  dieselbe warme Gravewood-Kachel wie die linke Sidebar ersetzt. Die Tabs selbst bleiben in der
  kühlen Eisen-/Basaltfamilie.
- **Action Cards:** Produces ist eine feste Zweizeilenplatte (Label oben, Ergebnis darunter).
  Itembilder, Materialbilder, Mengen, Craftable-/Stop-/Locked-Texte skalieren relativ zur eigenen
  Kartenbreite und verwenden explizit die globale UI-Schrift.
- **Action-Queue-Studien:** Fünf funktionelle lokale HTML-Varianten mit Designumschaltung,
  Ein-/Ausklappen, Pause, Hinzufügen, Entfernen und Umsortieren liegen unter
  `CODEX/work/action-queue-mockups-2026-08-01/index.html`. Noch keine Queue-Variante wurde
  produktiv eingebunden.
- **Rollback:** `CODEX/outbox/2026-08-01-tooltip-pouch-drawer-queue-prechange/`.
- **QA:** Fünf Stylesheets ausgeglichene CSS-Struktur und 0 fehlende lokale Assets; Mockup enthält
  fünf Varianten und 0 fehlende Assetpfade; Client-TypeScript 151 Dateien, 0 Diagnosen. Kein
  Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T12:18:00+02:00`.

## Drawer-/Tooltip-Korrektur, Character-Schiefer und Options V2 2026-08-01

- **Drawer-Lasche:** Falsch verwendetes `tab-lever.webp` (reine aktive Goldzierleiste) entfernt.
  Der Griff nutzt jetzt die echten transparenten Gravewood-Tabs `tab-inactive.webp` und
  `tab-active.webp` im passenden 4,4:1-Seitenverhältnis.
- **ItemTooltip:** Prominenter Damage-Wert von 21 auf 17 px reduziert. Enchantment wurde aus dem
  normalen Stat-Grid herausgezogen; Enchantment und On-Hit stehen nun als getrennte orange
  Legendary-Effektplatten unter den Fakten.
- **Character:** Der gemeinsame Equipment-/Stats-Owner nutzt eine tilebare dunkelkalte
  Schieferfläche mit sehr schwachem warmem Lichtsaum statt des großflächigen Lederbildes.
- **Options V2:** Keine 1360-px-Deckelung mehr; Seite nutzt die vollständige Inhaltsbreite. Header,
  Sektionen und Bug-/Feature-Banner verwenden kräftige V3-Panel-/Card-Rahmen sowie tilebaren
  Schiefer/Basalt statt durchgehender Holzflächen. Schrift- und Zeilenhierarchie wurde angehoben.
- **Feedback-Dialog:** Auf 720 px verbreitert, mit V3-Panelrahmen, Schiefergrund, gerahmtem
  Textfeld/Uploadbereich und den regulären Gravewood-Buttons modernisiert.
- **i18n:** `about.bugReport`, `bugReport.title` und `bugReport.entryHint` umfassen jetzt Bugs und
  Feature-Vorschläge in EN/DE/ES/FR/PT-BR/RU/ZH.
- **Action Cards:** Presetbeschriftungen sind `1`, `25`, `50`, `∞` (Engineziele unverändert).
  Output 82→52 px, Status/Craftable 52→34 px und Presets 62→44 px; Materialrack 112→175 px.
  Materialbilder, Symbole und Mengen nutzen den gewonnenen Raum deutlich größer.
- **Rollbacks:** `CODEX/outbox/2026-08-01-drawer-tooltip-equipment-texture-prechange/` und
  `CODEX/outbox/2026-08-01-options-actioncards-prechange/`.
- **QA:** Sechs Stylesheets strukturell sauber, 0 fehlende Assetpfade; sieben Sprachen vorhanden;
  Client-TypeScript 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T12:47:00+02:00` und
  `codex:2026-08-01T13:02:00+02:00`.

## Fester Tooltip-/Drawer-/Options-Vertrag 2026-08-01

- **Drawer:** Öffnet und schließt nur noch per Klick. Hover und `focus-within` ändern höchstens
  die Lesbarkeit der Lasche, aber niemals den Öffnungszustand. Die äußere Footerfläche ist
  transparent; nur die ausgefahrenen fünf Aktionen besitzen einen Hintergrund.
- **Topbar:** Gleiche Flexbreiten bleiben erhalten; skalierendes 3–8-px-Gap und 2–5-px-Randluft
  verhindern zusammenklebende Eisenrahmen.
- **Item-Card:** Ausrüstung bis 1040 px mit festen Rasterflächen für jede Statistikgruppe.
  Offense-Labels besitzen eine Mindestspur, `DPS` ist in allen sieben Sprachen kompakt und Werte
  können nicht mehr Wörter wie Damage zerlegen. Reine Materialien/Wertgegenstände erhalten eine
  eigene vertikale 620-px-Einspaltenkarte ohne leere rechte Hälfte.
- **Tooltip-Aktionen:** Equip, Unequip und Sell verwenden den aktuellen Bronze-Lipped-Iron-
  9-Slice-Rahmen mit Basaltfüllung; die alten `button_new*`-Bilder werden in diesem Kontext
  vollständig übersteuert.
- **Action Cards:** Materialbilder bis 72 px, Fallbacksymbole bis 62 px und Mengen bis 29 px;
  das vorhandene feste Vier-Slot-Raster bleibt geometrisch unverändert.
- **Options/Feedback:** Schieferwäsche durch dunklen Basalt mit warmer Reflexion ersetzt.
  Hauptpanels und Feedback-Modal besitzen 22-px-Rahmen; Optionsaktionen und Dialogaktionen nutzen
  einheitliche aktuelle Eisenbuttons. Feedback-Modal bis 1040 px mit größeren Text-/Uploadflächen.
- **New-Haven-Art-Befund:** Kein Asset geändert. Out-of-place-Wirkung stammt trotz 45°-Basis aus
  unterschiedlichen Kamerahöhen/Footprint-Skalen, fehlendem gemeinsamen Kontaktschatten sowie
  abweichendem Color-Grading und Bodenkontakt. Empfohlener nächster Assetpass: gemeinsame
  Footprint-Skala, Licht-/Schattenvektor, warme Grade-LUT und feine Erdsaum-Matte.
- **Rollback:** `CODEX/outbox/2026-08-01-fixed-tooltip-drawer-options-prechange/`.
- **QA:** Sechs Stylesheets per PostCSS fehlerfrei, 0 fehlende lokale CSS-Assets; alle sieben
  `itip.dps`-Einträge vorhanden; Client-TypeScript 151 Dateien, 0 Diagnosen. Der vollständige
  Electron-Vite-Build konnte in der verwalteten Windows-Sandbox nicht starten (`spawn EPERM` beim
  internen Buildprozess); kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T13:28:00+02:00` und
  `codex:2026-08-01T13:36:00+02:00`.

## Offline-Bühne, Drawer-Overlay, Umber-Equipment und Info-Bar-Studien 2026-08-01

- **Offline-Bericht:** Bühne auf maximal 920 × 980 px erweitert, Außenrahmen auf 22 px verstärkt
  und Hintergrund bis unter den Rahmen gezogen. Typografie, Dauer- und Ereigniszeilen wurden
  vergrößert; normale Beute belegt 88 px, seltene Beute 104 px. Der Collect-Rahmen ist 18 px.
- **ItemTooltip:** Bildbühne und Statistikfläche verwenden 14-px-Rahmen, Equip/Unequip/Sell
  16-px-Rahmen. `background-clip` und `background-origin` verhindern die transparenten Bänder
  zwischen Füllung und Rahmen.
- **Equipment/Stats:** Die im Kaskadenende wirksame `bg_equipment.webp`-Regel wurde auf tilebares
  `texture-umber-cloth.webp` mit warmer dunkler Lasur umgestellt. Damit ist die zuvor weiterhin
  sichtbare Lederfläche tatsächlich ersetzt.
- **Sidebar-Drawer:** Die Lasche sitzt absolut über dem Aktionsblock; der Block besitzt einen
  8-px-Bronze-Lipped-Iron-Rahmen. Neben der Lasche existiert keine deckende Footerfläche, und der
  Drawer bleibt ausschließlich klickgesteuert.
- **Options:** Auch `Report Bug / Suggest Feature` verwendet den 22-px-Panelrahmen des
  Optionskopfs; alle Options-Hauptcontainer folgen damit demselben deutlich sichtbaren Vertrag.
- **Info-Bar-Studien:** Fünf funktionelle, datenumschaltbare HTML-Konzepte liegen unter
  `CODEX/work/infobar-mockups-2026-08-01/index.html`: Reliquary Band, Warden Ledger, Ashen Command
  Rail, Hunter Chronicle und Citadel Crucible. Sie verwenden ausschließlich vorhandene Assets
  und die lokale Fell-Schrift; noch kein Konzept ist produktiv ausgewählt oder eingebunden.
- **Rollback:** `CODEX/outbox/2026-08-01-offline-drawer-infobar-prechange/`.
- **QA:** Neun Produktionsstylesheets und die Mockup-CSS per PostCSS fehlerfrei; 0 fehlende lokale
  Assetpfade; Mockup-Skript parserfehlerfrei; Client-TypeScript 151 Dateien, 0 Diagnosen. Die
  Browser-Laufzeit stellte in dieser Sitzung keinen Browser bereit; der vollständige Electron-
  Vite-Build bleibt durch Sandbox-`spawn EPERM` blockiert. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T13:52:00+02:00`.

## Warchain, Systemicons und Info-Bar-V2 2026-08-01

- **Systemicons:** Zwölf kleine transparente SVGs unter
  `apps/client/src/renderer/assets/ui/system-icons/` ersetzen sichtbare Emoji-Platzhalter in
  Options, Hauptmenü und Feedback. Die Symbole sind für 16–28 px und den Ashen-Iron-Kontrast
  konstruiert.
- **Skills/Action Cards:** Die alte globale Zeile „Idle — Pick an Action Below“ wird im echten
  Leerlauf nicht mehr ausgegeben; echte Stop-/Stun-Hinweise bleiben erhalten. Suche und Mastery
  verwenden den aktuellen Canvas-/Eisenvertrag. Die Mastery-Füllung belegt mit Innenabstand den
  gesamten Container, Text liegt lesbar in der Leiste.
- **Action Queue:** Auswahl „03 War Chain“ produktiv als ruhige vertikale Befehlskette umgesetzt:
  deutlicher Eisenrahmen, Kettenachse, nummerierte Knoten, warme aktive Karte und kompakte
  Control-Zeile.
- **Tooltip/Offline/Drawer:** Statistikgruppen packen ohne künstliche Leerzeile; Defense rückt bei
  fehlender Offense hoch, Consumables erhalten eine kompakte Einspaltenkarte und die rechte
  Statistikkante ist bündig. Der WebKit-Scrollbar-Corner der Offline-Bühne ist verborgen. Der
  Sidebar-Drawer wächst wieder im normalen Flexfluss nach oben und bleibt klickgesteuert.
- **Info-Bar-V2:** Fünf funktionelle Studien unter
  `CODEX/work/infobar-mockups-2026-08-01-v2/index.html`. Chef-Auswahl am 2026-08-01:
  **05 Quiet Citadel**. Das Mockup startet mit dieser Richtung und ist nachjustiert; keine
  produktive Einbindung ohne weiteres GO.
- **Rollback:** `CODEX/outbox/2026-08-01-ui-warchain-infobar-prechange/`.
- **QA:** Acht Stylesheets per PostCSS fehlerfrei; 0 fehlende lokale Assetpfade; zwölf SVGs mit
  vollständigem Root/Endtag und Codex-Marker; Mockup-Skript parserfehlerfrei; Client-TypeScript
  151 Dateien, 0 Diagnosen. Die verbundene Browser-Laufzeit konnte in dieser Sitzung nicht
  initialisiert werden; kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T13:30:36+02:00`.

## Quiet-Citadel-Produktion und New-Haven-Groundless-Korrektur 2026-08-01

- **Info-Bar:** Chef stellte klar, dass „Quiet Citadel 05“ bereits produktiv freigegeben war. Die
  bestehende `content-header`-Struktur verwendet nun das dreigeteilte Quiet-Citadel-Raster:
  Charakter links, aktuelle Aktivität dominant in der Mitte, Inventar/Gold rechts; darunter bleiben
  die vorhandenen Action-/Skill-XP-Segmentleisten. Umsetzung verwendet den aktuellen Bronze-Lipped-
  Iron-9-Slice-Rahmen und tilebaren Basalt. Der Seitenname bleibt für Assistenztechnik im DOM, ist
  visuell eingeklappt; der sekundäre Slayer-Chip ist in diesem Konzept verborgen.
- **Performance/Logik:** Keine neue Tick- oder Engine-Logik. `HeaderCharacterInfo`, `GameStats`,
  `ActionProgressBar` und `LevelXpBar` behalten ihre vorhandenen Selector-Gates und Berechnungen.
- **Drawer:** Im geschlossenen Zustand besitzt `.sb-footer-actions` weder Border noch Hintergrund;
  damit bleiben links/rechts der freistehenden Menülasche keine Holz-/Eisenecken sichtbar.
- **New Haven:** Der Grounded-V1-Kontrollsatz wurde nach Chefprüfung verworfen. Der Designer erzeugt
  alle 15 Familien erneut als Building-only-RGBA ohne Bodenraute, Erde, Rasen, Kies oder Terrainpatch.
  Der alte Satz wird nur im Kontrollordner archiviert; Produktionspfade bleiben unangetastet.
- **QA:** `topbar.css` und `sidebar.css` per PostCSS fehlerfrei, 0 fehlende lokale Assetpfade;
  Client-TypeScript 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T16:06:12+02:00`.

## Numeral-System, Drawer-Struktur und Major-Page-Studien 2026-08-01

- **Globale Zahlen:** `base.css` definiert aus der bereits gebündelten Cinzel-Datei eine per
  `unicode-range` begrenzte Familie `Grim Reach Numerals`. Sie steht vor Fell Chronicle und greift
  dadurch global nur für `0–9`, Prozent-, Zeit-, Dezimal-, Verhältnis- und Rechenzeichen. Lining-
  und tabellarische Ziffern sind am Body aktiviert. RU/ZH behalten ihre bisherigen Buchstabenstacks.
- **Kleine Informationsschrift:** `--font-info` verwendet Cinzel für kompakte Statuszeilen.
  Quiet-Citadel-Metadaten, XP-/Action-Bar-Texte und Mastery-Labels verwenden diesen Stack; Titel
  und große Navigation bleiben Fell Chronicle.
- **Info-Bar:** Die Clusterzeile erhielt sieben skalierte Pixel Bottom-Padding und steht nicht
  mehr bündig auf den Fortschrittsleisten.
- **Sidebar-Drawer:** `.sb-footer` ist nun ein absolut am Sidebar-Boden verankertes Overlay und
  belegt keine vollbreite Layoutzeile. Die Lasche ist das einzige sichtbare Element im geschlossenen
  Zustand; der Action-Block besitzt dann Höhe, Border und Hintergrund null. Beim Öffnen wächst der
  rechteckige Drawer vom Boden nach oben.
- **Layoutstudien:** `CODEX/work/major-page-layouts-2026-08-01/index.html` bietet vier Seitentypen
  und je fünf per Klick wechselbare responsive Informationsarchitekturen: insgesamt 20 Kombinationen
  für Companions, Shop, Bank und Quests. Reine HTML-/CSS-Strukturen, keine Produktionsbindung.
- **QA:** `base.css`, `topbar.css`, `sidebar.css`, `gravewood-actioncards.css` und Mockup-CSS per
  PostCSS parserfehlerfrei; Mockup-JavaScript syntaktisch gültig, vier Surface- und fünf Concept-
  Schalter vorhanden. Die Browser-Laufzeit meldete keine verfügbare Browserinstanz; visuelle
  Browser-QA bleibt deshalb für den nächsten Lauf offen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T17:42:00+02:00`.

## Bank Vault Ledger, Slayer-Cluster und Zahlen-/Drawer-Korrektur 2026-08-01

- **Bank-Auswahl:** Die separate Bankgalerie unter
  `CODEX/work/bank-layout-mockups-2026-08-01/index.html` bildet die reale Funktionsmenge von
  `BankPage.tsx` ab. Chef wählte **03 Vault Ledger** und gab die Produktionsfreigabe.
- **Produktionslayout:** `BankPage.tsx` gruppiert Voss/Kapazität und Suche/Filter/Sortierung/
  Ausbau in zwei kompakte Kopfbereiche. `pages.css` bindet die Bank an die verfügbare Content-Höhe;
  Inventar und Bank bleiben zweispaltig und scrollen ausschließlich intern. Nach Chef-Korrektur
  bleiben beide Inhalte ausdrücklich quadratische Inventar-Slotgrids mit sichtbaren Leerplätzen —
  keine Itemliste.
- **Info-Bar:** Ein aktiver Slayer-Auftrag besitzt wieder einen eigenen Cluster zwischen Aktivität
  und Inventar/Gold. Ohne Auftrag spannt der Meta-/Ökonomieblock die beiden rechten Spalten.
- **Ziffern:** Der spät kaskadierende `.itip-offense-group .itip-stat-value`-Override verwendet
  jetzt `var(--font-info)` statt Metamorphous. Weitere Tooltip-Zahlen/Delta-Werte erhalten explizit
  tabellarische Lining-Ziffern.
- **Drawer:** Die Menülasche hat keinen negativen Halbüberlappungs-Margin mehr; sie sitzt komplett
  über dem rechteckigen Drawer und berührt dessen Oberkante bündig.
- **QA:** `pages.css`, `topbar.css`, `sidebar.css` und `components.css` per PostCSS fehlerfrei;
  `BankPage.tsx` und `App.tsx` per TypeScript-Transpile ohne Syntaxdiagnosen; alle neuen lokalen
  Frame-/Texturpfade vorhanden. Der vollständige Program-Typecheck trifft im installierten
  Workspace auf das bereits fehlende Typepaket `@types/node`; kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T18:48:00+02:00`.

## Shop „Mux' Counter“ 2026-08-01

- **Chef-Auswahl:** Fünf funktionelle Shop-Studien wurden unter
  `CODEX/work/shop-layout-mockups-2026-08-01/index.html` bereitgestellt. Chef wählte Konzept
  **01 Mux' Counter** und erteilte ausdrücklich das Produktions-GO.
- **Produktionslayout:** `ShopPage.tsx` trennt den Kaufen-Tab in feste Warengruppen, ein intern
  scrollendes Warenraster und einen stabilen rechten Handelstresen. Die Produktkarten sind jetzt
  reine Auswahlkarten; Preis, Beschreibung, Bestand, Mengenwahl und Kaufaktion bleiben dadurch
  unabhängig von Produktnamen und Presetanzahl an derselben Stelle.
- **Logikschutz:** Alle Käufe laufen weiter über `buyItem`, `canHold` und den gemeinsamen
  `QuantityPicker`. Slot-/Auto-Eat-Upgrades, verlorene Meisterringe, Buy/Sell-Hotkeys und die
  vollständige Verkaufslogik mit Varianten, Shift-Verkauf, Massenverkauf und Rückkauf wurden
  nicht ersetzt oder dupliziert.
- **Fehlerkommunikation:** Der rechte Tresen benennt volles Inventar und unzureichendes Gold
  ausdrücklich. Acht neue Shoptexte sind in Englisch, Deutsch, Spanisch, Französisch,
  Portugiesisch (BR), Russisch und Chinesisch vorhanden.
- **Design:** `shop.css` nutzt Gravewood-V3-Panel-/Card-/Buttonrahmen, kalten Basalt und Cold Slate.
  Das dreispaltige Layout bleibt bis 1180 px bestehen; danach wird die Kategorienavigation
  horizontal, ohne den Handelstresen zu verlieren. Unter 820 px stapelt die Seite kontrolliert.
- **QA:** Vollständiger TypeScript-Programcheck des Clients: 195 Quelldateien, 0 Diagnosen.
  `shop.css` per PostCSS fehlerfrei, sämtliche referenzierten lokalen CSS-Assets vorhanden. Es
  existieren keine dedizierten Shop-Testdateien; kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T19:42:00+02:00`.

## Shop-Viewport, Compare-Reflow und Companion-Einzelstudien 2026-08-01

- **Shop-Höhenvertrag:** `shop.css` bindet `ShopPage` und seinen Transition-Wrapper an die
  verfügbare Inhaltsfläche (`height: 100%`, `min-height: 0`, äußerer Overflow verborgen). Der
  mittlere Warenbereich und das Verkaufsinventar behalten ihre eigenen Scrollflächen; die ganze
  Seite wandert nicht mehr.
- **Itemvergleich:** `components.css` begrenzt den Compare-Wrapper auf den Viewport. Zwei
  Itemkarten teilen sich den Raum bis 940 px; bei mittleren Breiten verdichten sich Bild- und
  Statistikflächen, unter 940 px werden die Karten vertikal in demselben Wrapper gestapelt. Damit
  bleibt auch ein Waffenvergleich bei 1920 × 1080 vollständig erreichbar.
- **New Haven:** Die Groundless-V2-Produktion wurde trotz vollständiger Dateimenge visuell
  verworfen. Der Composite zeigte unvereinbare Projektionen, Objektmaßstäbe und Kamerahöhen.
  Agent gestoppt, Kontrollmaterial bleibt ausdrücklich nicht freigegeben und wird nicht gebunden.
- **Companion-Mockups:** `CODEX/work/companion-layout-mockups-2026-08-01/index.html` enthält fünf
  interaktive, responsive Seitenarchitekturen. Grundlage ist `PetGalleryPage.tsx` und der reale
  Katalog mit 21 Pets: genau ein aktiver Pet-Slot, Owned/Locked, Passiv, aktive Kampffähigkeit,
  Quelle, Dropchance sowie Ausrüsten/Ablegen. Keine erfundenen Pet-Level-, Zucht- oder Gear-Systeme.
  Chef favorisierte **03 Das Feldjournal des Jägers** und gab anschließend das Produktions-GO.
  Das Layout ist jetzt in `apps/client/src/renderer/pages/PetGalleryPage.tsx` sowie dem zugehörigen
  Block in `apps/client/src/renderer/styles/pages.css` produktiv umgesetzt.
- **Pet-Assetauftrag:** Kontrollausgabe geplant/laufend unter
  `CODEX/AssetControl/CompanionPets-2026-08-01/<pet-id>/variant-1..3.png`. Verbindlich sind
  transparenter Hintergrund, kein Boden/Sockel/Schattenfeld, identische Kamera, Lichtführung,
  Objektgröße und Padding über die ganze Serie. Keine Produktionsbindung vor A-bis-Z-Abnahme.
- **Chef-Korrektur zur Variantenbreite:** Der erste Ashgut-Batch ist verworfen und wird nur als
  `rejected` archiviert. Bestehende Petbilder dürfen nicht mehr als visuelle Referenz dienen.
  Variante 1–3 müssen je Pet verschiedene Grundanatomien/Kreaturenfamilien, Silhouetten,
  Proportionen und Kopf-/Gliedmaßenkonzepte darstellen; reine Farb-, Material-, Horn- oder
  Detailvarianten sind unzulässig. Neueste Chef-Anweisung ersetzt den Ashgut-Zwischenstopp:
  vollständige direkte Produktion aller 21 Companions × drei Varianten; fertige Pets werden
  alphabetisch sofort zur Kontrolle bereitgestellt.
- **Chef-Korrektur zur Tonalität:** Der nachgeschärfte „Dark-Fantasy“-Restart war weiterhin zu
  aggressiv/grotesk und ist ebenfalls verworfen. Neuer Serienvertrag: begehrenswerte Fantasy-
  Begleiter mit vielfältigen Temperamenten; düster/unheimlich nur, wo Name und Lore es wirklich
  tragen. Visuelle Weltkohärenz entsteht über einheitliches Rendering, Licht, Maßstab, gedeckte
  Farben und mittelalterliche Materialien. Kein pauschales Dämonen-/Fäulnis-/Knochenmotiv.
- **QA:** Mockup-JavaScript syntaktisch gültig; fünf Layoutfunktionen vorhanden; Mockup-, Shop-
  und Components-CSS per PostCSS fehlerfrei; alle 21 referenzierten Petbilder und lokalen
  Frame-/Font-/Texturpfade vorhanden. Client-TypeScript mit der bestehenden vollständigen
  Programkonfiguration: 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T20:18:00+02:00` und
  `codex:2026-08-01T20:42:00+02:00`.

## Companion-Pets — vollständiger Auswahlbatch 2026-08-01

<!-- codex:2026-08-01T23:45:57+02:00 -->

- **Ergebnis:** `CODEX/AssetControl/CompanionPets-2026-08-01/` enthält jetzt alle 21 realen
  Companion-IDs mit jeweils `variant-1.png`, `variant-2.png` und `variant-3.png` — insgesamt
  63/63 Auswahl-Assets. Die bereits vollständigen acht Pet-Familien wurden bewahrt.
- **Variantenvertrag:** Die neu ergänzten Familien verwenden pro Pet drei deutlich verschiedene
  Grundanatomien und Silhouetten. Tonalität ist breite, begehrenswerte Fantasy statt pauschaler
  Groteske; alle Motive bleiben freigestellte Einzelwesen ohne Boden, Szene, Sockel, Text oder UI.
- **Technische QA:** 63/63 Dateien sind 1024 × 1024 große RGBA-PNGs mit echtem Alpha,
  mindestens neun Prozent Sicherheitsabstand und null belegten Außenrandpixeln. Details stehen in
  `CODEX/AssetControl/CompanionPets-2026-08-01/QA.md`; drei alphabetische Kontaktbögen liegen in
  dessen `_qa-previews/`-Ordner.
- **Manifest:** Das kommentarlose
  `CODEX/AssetControl/CompanionPets-2026-08-01/manifest.json` wurde auf
  `complete_pending_chef_selection` gesetzt und dokumentiert Vollständigkeit, QA, Kontaktbögen
  sowie Konzeptfamilien. Der zugehörige Pflichtmarker steht hier und in der benachbarten
  `README.md`: `codex:2026-08-01T23:45:57+02:00`.
- **Integration:** `productionIntegrated` bleibt `false`. Keine Produktionspfade, Save-Daten,
  sichtbaren Namen oder internen IDs wurden verändert. Nächster Schritt ist ausschließlich die
  A-bis-Z-Auswahl des Chefs; Gewinner werden danach separat vom Asset-Integrator übernommen.

## Companion-Seite — Feldjournal 03 produktiv 2026-08-01

<!-- codex:2026-08-01T23:58:00+02:00 -->

- **Ergebnis:** Die bisherige vier Spalten breite Wiederholung vollständiger Pet-Karten wurde durch
  ein festes Feldjournal ersetzt: links ein intern scrollender Index aller 21 Pets, rechts genau
  ein großes Portrait mit Herkunft, Dropchance, Beschreibung, Passiv-/Aktiveffekt und Equip-Status.
- **Theme:** Außencontainer verwenden Gravewood-V3-Panelrahmen; Einträge, Bühne, Effekte und Button
  verwenden aktuelle V3-Card-/Buttonrahmen. Oberflächen sind Basalt, Cold Slate und Umber Cloth;
  alte Citadel-Holzrahmen sind in diesem neuen Renderpfad nicht mehr sichtbar.
- **Verträge:** `content.pets`, Owned/Locked, `companionPetId`, `equipPet`, Quellenmapping,
  Dropchance und sämtliche bestehenden i18n-Schlüssel blieben erhalten. Keine Engine-, Save-,
  ID-, Balancing- oder Produktionsasset-Änderung.
- **Viewport/Performance:** Die Seite belegt die verfügbare Content-Höhe. Nur Fundindex und bei
  Bedarf das Dossier scrollen intern; statt 21 großen Zonenbildern und Detailkarten wird nur die
  aktuell ausgewählte Beobachtung vollständig gerendert.
- **QA:** TSX-Transpile ohne Diagnose; vollständiger Client-Typecheck über 151 Dateien mit
  0 Diagnosen; alle 14 lokalen CSS-Assetreferenzen vorhanden; CSS-Klammern, Strings und Kommentare
  strukturell geschlossen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T22:18:00+02:00`.

## Quest-Seite — fünf Einzelstudien 2026-08-02

<!-- codex:2026-08-02T00:15:00+02:00 -->

- **Artefakt:** `CODEX/work/quest-layout-mockups-2026-08-02/index.html` mit fünf umschaltbaren,
  responsiven und funktionellen Seitenarchitekturen: Warden's Dispatch, Ashen Procession,
  Contract Wall, Hunter's Ledger und Twin-Leaf Codex.
- **Reale Verträge:** Grundlage ist die bestehende `QuestsPage.tsx`: Aschechronik mit 21 Kapiteln,
  Auftragsstränge, genau sechs tägliche Quests aus fünf Schwierigkeitsgraden, lokaler Reset,
  Quest-Tokens, Belohnungslager, Active/Claimable/Locked/Claimed und explizites Claiming.
- **Theme:** Nur vorhandene, produktiv erreichbare Bausteine verwendet: Fell Chronicle und
  Marcellus SC, Gravewood-V3-Panel-/Card-/Tab-/Buttonrahmen, Basalt, Cold Slate, Ash Stone und
  Umber Cloth sowie reale Wächter-, Token-, Gold- und Itemassets.
- **Abgrenzung:** Keine Produktionsdatei, Questlogik, Engine, Save-Struktur, i18n oder `.claude/**`
  verändert. Die fünf Konzepte teilen dieselben Beispieldaten, damit ausschließlich Layout und
  Informationshierarchie verglichen werden.
- **QA:** HTML-Tags strukturell geschlossen; JavaScript mit TypeScript-Parser ohne Diagnose;
  CSS-Klammern, Strings und Kommentare geschlossen; 14 statische sowie acht dynamische lokale
  Assetreferenzen vorhanden. Ein visueller Browserlauf war mangels verfügbarer Browserinstanz in
  dieser Sitzung nicht möglich.
- **Codex-Code-Marker:** `codex:2026-08-02T00:15:00+02:00`.

## Quest-Seite — Contract Wall 03 produktiv 2026-08-02

<!-- codex:2026-08-02T00:42:00+02:00 -->

- **Ergebnis:** Nach Chef-Auswahl wurde Konzept 03 produktiv in `QuestsPage.tsx`, `quests.css`
  und `chronicle.css` umgesetzt. Wächter und Tokenbestand teilen einen festen Kopf, die vier Tabs
  bleiben sichtbar und nur der aktive Arbeitsbereich scrollt intern.
- **Aufträge:** Der vorhandene Master-/Detailvertrag bleibt erhalten, erscheint nun aber als
  breite zweispaltige Strangwand links und stabile Detailbühne rechts. Auswahl, Collapse,
  Active/Completed/Locked/Claimed, NPC-Sprecher, Objectives, Rewards und Claim bleiben unverändert.
- **Weitere Tabs:** Aschechronik nutzt Bühne plus separates Archiv; sechs Dailies erscheinen als
  breite zwei- bzw. auf Ultrawide dreispaltige Vertragswand; das Belohnungslager besitzt einen
  festen Kopf und ausschließlich intern scrollende Angebote.
- **Theme:** Quest-spezifische alte Citadel-Holzrahmen wurden im neuen Scope durch Gravewood-V3-
  Panel-, Card-, Tab- und Buttonrahmen ersetzt. Verwendete Oberflächen: Basalt, Cold Slate und
  Umber Cloth. Auch Wächtermedaillons und Sprechblasen sind im Questscope auf V3 umgestellt.
- **Verträge:** Keine Änderung an Engine, Content, Queststatus, Daily-Refresh, Token-Käufen,
  Item-Tooltip, Save-State, IDs oder i18n. Nur Rendererstruktur und Styles wurden angepasst.
- **QA:** Vollständiger Client-Typecheck über 151 Dateien mit 0 Diagnosen; Quest- und Chronicle-
  CSS strukturell geschlossen; alle neun lokalen CSS-Assetpfade vorhanden. Kein Live-/Electron-
  Start und mangels Browserinstanz kein visueller Automationslauf.
- **Codex-Code-Marker:** `codex:2026-08-02T00:42:00+02:00`.

## UI-Nachschärfung und Combat-Vorlage 2026-08-02

<!-- codex:2026-08-02T11:24:44+02:00 -->

- **Quest/Companions:** Hauptflächen auf Ironwood Bastion und Innenflächen auf Bronze-Lipped
  Iron korrigiert. Vollständige Questzielnamen umbrechen; Warden-/Objective-Prosa nutzt normales
  Gewicht. Relevante Dateien: `QuestsPage.tsx`, `quests.css`, `chronicle.css`, `pages.css`.
- **Combat-Entscheidung:** `CODEX/work/combat-layout-mockups-2026-08-02/index.html` enthält fünf
  funktionsnahe Layouts. Chef-GO gilt für 03 Frontline Ribbon und die vier Tabs Gear, Skills,
  Style und Prep; die produktive Implementierung wird separat übergeben.
- **Info-Bar:** `topbar.css` nutzt im Quiet-Citadel-Scope viewport- und höhengebundene
  `clamp()`-Typografie. Betroffen sind Name/Level, Aktivität, Slayer, Slots/Gold und beide
  Fortschrittslabels. Marker: `codex:2026-08-02T10:41:06+02:00`.
- **Item-Tooltip:** `components.css` führt einen stabilen Warbanner-Rastervertrag ein. Ohne
  Offense stehen Attribute oben links, Defense darunter und Suffix oben rechts; lange Suffixnamen
  dürfen umbrechen. Marker: `codex:2026-08-02T10:41:06+02:00`.
- **New Haven:** `CODEX/assets/new-haven-control-2026-08-01/v2-groundless/` bleibt ausschließlich
  abgelehntes Referenz-/Fehlversuchsmaterial. Es wartet dort kein Produktions-GO.
- **QA:** Client-TypeScript über 151 Dateien ohne Diagnose (expliziter lokaler `typeRoots`-Pfad),
  `topbar.css` und `components.css` strukturell geschlossen. Combat-Mockup-JavaScript ohne
  Parserdiagnose. Ein Browser-QA-Lauf war nicht möglich, weil die Browser-Runtime keine Instanz
  bereitstellte; kein Live-/Electron-Start.

## New-Haven Asset Foundry und Shop-Karten 2026-08-02

<!-- codex:2026-08-02T11:52:06+02:00 -->

- **Asset Foundry:** `CODEX/work/new-haven-consistent-asset-tool/index.html` ist das lokale
  Kontrollcockpit; `manifest.json` führt 15 eindeutige Familien/45 Ränge und vier Kalibrierer.
  `production-spec.md`, Promptgenerator und CLI-QA bilden den verbindlichen Sechs-Schritte-Vertrag.
- **Foundry-QA:** App-JavaScript syntaktisch gültig, CSS geschlossen, null fehlende lokale Pfade,
  45 Produktions- bzw. vier Kalibrierungspakete reproduzierbar; synthetisches 1536²-RGBA bestand
  Alpha-, BBox-, Baseline-, Anchor- und Bodenheuristik. Kein Browser verfügbar. V2 bleibt verworfen.
- **Shop:** `items.ts`, `ShopPage.tsx` und `shop.css` verwenden ein responsives Ironwood-/
  Gravewood-Kartenraster. `hunting_bow` ist zentral auf `ashwood_longbow.webp` abgebildet, ohne
  ID-, Kauf-, Engine- oder Balancingänderung. Marker: `codex:2026-08-02T11:24:00+02:00`.
- **Shop-QA:** PostCSS ohne Fehler; acht von acht CSS-Assets vorhanden; geänderte TS/TSX-Dateien
  ohne Transpile-Diagnosen.

## Battle-Screen — zehn Layoutstudien 2026-08-02

<!-- codex:2026-08-02T12:18:49+02:00 -->

- **Artefakte:** `CODEX/work/battle-screen-mockups-2026-08-02/index.html` und `README.md`.
- **Umfang:** Zehn CSS-Architekturen mit Concept-, 1920-/3440-, Combat-State- und Dock-Schaltern;
  Player/Gegner, HP, Ward, Stagger, Status, Timeline, Controls, Drops, Session, Zone und Log sind
  als echter Battle-Vertrag berücksichtigt. Konzept 03 integriert den Log links.
- **Empfehlung des Designers:** Frontline Record 03 kombiniert mit dem proportionalen Raster von
  Adaptive Fortress 10. Eine zweite unabhängige Funktionsprüfung gegen `CombatPage.tsx` läuft.
- **QA:** zehn Buttons/zehn Konzepte, null fehlende Assets, HTML-/CSS-Balance null und JavaScript
  ohne Diagnose. Browserinstanz war nicht verfügbar; keine Produktionsdatei verändert.

## Combat-Layout — Adaptive Fortress fertiggestellt 2026-08-02

<!-- codex:2026-08-02T16:20:00+02:00 -->

- **Produktionslayout:** `CombatPage.tsx` nutzt den freigegebenen vierteiligen Frontline-Dock
  (Gear/Skills/Style/Prep), die zentrale Kampfarena und rechts den echten Battle-/Loot-Record.
  Die Sitzungsbilanz wurde aus Gear in den Fuß des Battle Records verschoben.
- **Auto-Buff:** Prep bietet nun den vom Chef festgelegten einmaligen Kauf für 50.000 Gold. Der
  Kauf ist Engine-seitig idempotent, zählt in `stats.goldSpent`, aktiviert den Toggle nicht
  ungefragt und kann weder über Setter noch Laufzeitpfad umgangen werden.
- **Save-Vertrag:** `SAVE_VERSION` 78 → 79; neues Feld
  `character.autoPotion.autoRebuffUnlocked`. Alt-Saves mit bereits aktivem Auto-Rebuff behalten
  ihn, alle anderen beginnen gesperrt. Migration, Sanitize und Kompatibilitätstests ergänzt.
- **UI/i18n:** Kaufzustand im Ashen-Iron/Gravewood-Stil und Texte in EN/DE/ES/FR/PT-BR/RU/ZH.
- **QA:** Shared, Engine, Persistence und Client vollständig per TypeScript-Compiler geprüft:
  jeweils 0 Diagnosen. Alle 13 CSS-Assetpfade vorhanden, CSS-Klammern ausgeglichen. Vitest konnte
  in dieser Sandbox nicht transformieren (`esbuild spawn EPERM`); Tests wurden ergänzt, aber der
  eigentliche Runner muss außerhalb dieser Prozesssperre nachgezogen werden. Kein Electron-Start.

### Nachfix: leere Gear-Stats und Kampf-beenden-CTA

<!-- codex:2026-08-02T17:30:00+02:00 -->

- Im Combat-Dock kollabierten die geerbten Character-Stats-Grids durch `flex-basis: 0` ohne feste
  Elternhöhe auf 0 px. Combat-spezifische Overrides machen Gruppen/Grids/Zeilen wieder
  inhalts-hoch; die Character-Seite bleibt unverändert.
- Der obere Kampf-beenden-Button nutzt nun den Bronze-Lipped-Iron-Rahmen mit Gravewood-Füllung
  statt der alten ButtonNew/Flee-Bildfamilie.
- Client-TypeScript: 0 Diagnosen; `combat.css`: 843 öffnende/843 schließende Klammern.

## New Haven — Encampment-V3-Kalibrierung 2026-08-02

<!-- codex:2026-08-02T18:11:25+02:00 -->

- Der widersprüchliche Fachwerk-/Dorfanker der Foundry wurde durch ein befestigtes
  Dark-Fantasy-Grenzlager ersetzt (`production-spec.md`, `real-world-archetypes.md`,
  `scripts/generate-packets.mjs`). `.claude/**` blieb unverändert.
- Vier neue Rang-I-Kalibratoren liegen unter
  `CODEX/AssetControl/NewHaven-Encampment-V3-2026-08-02/calibration/`; Magentaquellen,
  QA-Bericht, README und eine lokale `index.html` liegen daneben.
- Technischer Stand: 1536×1536 RGBA, transparente Ecken, gemeinsame Baseline y=1352,
  Mittelpunkt x=767,5 und familienabhängige Zielbounds. Kein Asset ist im Runtime-Pfad gebunden.
- Der Python-Chroma-Helfer war durch `spawn EPERM` blockiert. Die Freistellung erfolgte deshalb
  direkt mit `sharp`: Soft-Matte nach Farbdistanz plus Nachbarfarben-Despill für Netze/Seile.
- Produktionsgate bleibt aktiv: Die übrigen 41 Ränge erst nach visueller Abnahme des vollständigen
  Vierersets erzeugen; Rangwechsel müssen neue Masse/Funktion zeigen und dürfen keine Near-Copies sein.

## New Haven — Encampment V3 vollständig produziert 2026-08-02

<!-- codex:2026-08-02T20:58:00+02:00 -->

- Nach der Chef-Abnahme des Kalibrierungssets wurden alle 15 Gebäudefamilien in jeweils drei
  eigenständigen Rängen produziert: insgesamt 45 transparente 1536×1536-RGBA-PNGs unter
  `CODEX/AssetControl/NewHaven-Encampment-V3-2026-08-02/production/`.
- Die Rangverträge liegen in `CODEX/work/new-haven-consistent-asset-tool/rank-archetypes.json` und
  erzwingen pro Ausbau eine erkennbare neue Baumasse/Funktion statt bloßer Detailvarianten.
- `index.html` zeigt jede Familie als Rang-I/II/III-Reihe; `overview.png` ist die kompakte Gesamtansicht.
  `production-qa.json` bestätigt 45/45 Dateien, keine fehlenden oder unerwarteten Namen, identische
  RGBA-Canvasgröße, transparente Außenbereiche, gemeinsamen Horizontalanker und gemeinsame Baseline.
- Die sichtbare Assetfläche wächst bei allen 15 Familien von Rang I → II → III. Damit gibt es keine
  technischen Near-Copies im reinen Größen-/Massenvertrag; die visuelle Chefprüfung bleibt maßgeblich.
- Die Bilder sind weiterhin reine Kontrollassets. Keine Datei wurde in den Runtime-Pfad kopiert und
  keine New-Haven-Komponente auf diese Serie umgebunden. `.claude/**` blieb unverändert.

## New Haven — Kartenmaßstab und Nacht-Kohärenz 2026-08-02

<!-- codex:2026-08-02T21:42:00+02:00 -->

- Auf direkte Chef-Anweisung rendert `getCampMapVisualScale()` in
  `apps/client/src/renderer/campArt.ts` sämtliche platzierten Gebäude mit exakt dem Doppelten ihres
  bisherigen familien- und rangabhängigen Kartenmaßstabs. Die relative Größenhierarchie bleibt dabei
  unverändert; der generische Fallback steigt entsprechend von `0.85` auf `1.7`.
- `NewHavenPage.tsx` reicht die aktuelle Lichtphase nun als `data-light-phase` an die Kartenfläche
  weiter. `newhaven.css` gibt allen Gebäuden einen dauerhaften weichen Bodenkontaktschatten und stimmt
  Helligkeit/Sättigung nachts auf die kühle Karte ab, damit die freigestellten Sprites nicht schweben
  oder aufgeklebt wirken.
- Sämtliche 45 Gebäuderänge besitzen nun zusätzlich deterministische Nachtfassungen mit identischer
  Alpha-Silhouette. Die Camp-Karte liegt als Tag-/Nachtpaar in 3344×1882 vor; Bauplatz,
  Baustelle und Gerüst liegen ebenfalls als transparente Tag-/Nachtpaare im Kontrollordner.
- Der alte, zu ähnliche Schmelzhütten-Rang II/III wurde nach Sichtprüfung nach `rejected/` verschoben
  und durch klar gestufte Zwei-Ofen- bzw. befestigte Gießerei-Silhouetten ersetzt.
- Die neue Assetserie bleibt bis zur separaten Produktionsfreigabe im Asset-Control-Staging; geändert
  wurde im Spielcode ausschließlich die bereits beauftragte Kartenpräsentation.

## New Haven — Encampment V3 produktiv integriert 2026-08-02

<!-- codex:2026-08-02T22:31:00+02:00 -->

- Nach dem ausdrücklichen Chef-GO wurden alle 98 freigegebenen Dateien nach
  `apps/client/src/renderer/assets/camp/` übergeben: 45 Gebäuderänge × Tag/Nacht, zwei Karten sowie
  drei generische Bauzustände × Tag/Nacht.
- Runtime-Ausgabe: Gebäude/Bauzustände als 1536×1536 WebP mit vollständigem Alpha; Karten als
  3344×1882 WebP. Geprüft wurden 98/98 erwartete Dateien, Dimensionen, Alpha-Kanäle und für sämtliche
  transparenten Dateien die exakte Alpha-Übereinstimmung zur freigegebenen PNG-Quelle.
- Vor dem ersten Encoderlauf wurde der vollständige vorherige Runtime-Satz mit 98 WebP-Dateien unter
  `CODEX/backups/new-haven-runtime-before-encampment-v3-2026-08-02/` gesichert.
- Bei der Abschluss-QA wurden Schmelzhütte II/III um 76 bzw. 57 Pixel auf die echte gemeinsame
  Bodenlinie gesetzt; Tag und Nacht bleiben deckungsgleich. Dadurch existieren keine unsichtbaren
  Kalibrieranker mehr, die auf der Karte ein Schweben erzeugen könnten.
- Der reproduzierbare Deploy liegt in
  `CODEX/work/new-haven-consistent-asset-tool/scripts/deploy-v3-runtime.mjs`.
- Typecheck/Build konnten in dieser Sitzung nicht gestartet werden: Sowohl PowerShell als auch ein
  direkter Child-Process wurden von der Windows-Sandbox mit `CreateProcessAsUserW failed: 5` bzw.
  `spawn EPERM` abgewiesen. Die Änderungen an TSX/CSS sind eng begrenzt; der Verifikationslauf bleibt
  dennoch als offene technische Kontrolle dokumentiert.

## New Haven — CSS-Geisterschatten entfernt 2026-08-02

<!-- codex:2026-08-02T22:45:00+02:00 -->

- Nach Sichtprüfung des produktiven Nachtbilds sämtliche `drop-shadow()`-Effekte von
  New-Haven-Gebäudesprites entfernt: Normalzustand, Hover, Nacht-Hover und Move-Modus.
- Die leichte Helligkeits-/Sättigungsanpassung für Nacht und Hover bleibt erhalten; betroffen ist nur
  der breite dunkle Doppelabdruck um die bereits im Asset ausgeleuchteten Silhouetten.

## New Haven — Tagvorschauen und gemeinsamer Nachtnebel 2026-08-02

<!-- codex:2026-08-02T23:02:00+02:00 -->

- Gebäudevorschaubilder in Listen, Detailmodale und Baumenü fest auf die klare Tagfassung gestellt.
  Die Tag-/Nachtumschaltung gilt nur noch für Gebäude innerhalb der eigentlichen Kartenwelt.
- Über der kompletten Nachtkarte liegt nun ein leichter statischer Nebel aus drei CSS-Gradienten.
  Damit erhalten Kartengrund und freigestellte Gebäude dieselbe atmosphärische Schicht.
- Der Nebel ist `pointer-events: none`, ohne Animation und ohne `backdrop-filter`; Klickverhalten und
  Idle-Performance bleiben deshalb unverändert.

## New Haven — Map-Mode-UI konsolidiert 2026-08-02

<!-- codex:2026-08-02T23:34:00+02:00 -->

- In `apps/client/src/renderer/styles/newhaven.css` eine einzige verbindliche Abschluss-Schicht für
  den Kartenmodus ergänzt. Sie überschreibt die widersprüchlichen historischen Teilpässe, ohne
  bestehende Regeln zu löschen oder Claudes Komponentenstruktur anzutasten.
- Toolbar, Map/List/Move/Debug-Bedienung und Kapazitätsanzeige bilden nun eine responsive
  Ashen-Iron-Leiste. Die Karte und die Baupalette besitzen eine stabile Grid-Aufteilung mit
  internen Scrollbereichen; 1920×1080 und 3440×1440 behalten dadurch denselben Weltmaßstab und
  dieselbe Kartenprojektion.
- Gebäudelabel, Baufortschritt, Vorschaubilder, Kostenchips sowie Platzierungs-/Move-Hinweise wurden
  lesbarer und skalierbar gefasst. Die Baupalette verwendet vorhandene Umber-Canvas-/Basalt-Texturen
  und den produktiven Bronze-Lipped-Iron-Rahmen; keine neuen Runtime-Assets wurden eingeführt.
- Statische QA: PostCSS-Parse erfolgreich (357 Root-Nodes), CSS-Klammern 331/331, sämtliche
  referenzierten CSS-Assets vorhanden. TypeScript-Compiler-API über Shared, Content, Engine,
  Persistence und Client: 350 Quelldateien, 0 Diagnosen.
- Testbestand: Engine 132 Dateien/1.297 Testdeklarationen, Persistence 14/296, Client 1/22.
  Produktionsbuild und Vitest-Transformation bleiben in dieser Windows-Sandbox blockiert, weil
  `esbuild` keinen Hilfsprozess starten darf (`spawn EPERM`). Diese Runner-Prüfung ist ausdrücklich
  offen; kein Electron-/Live-Start wurde durchgeführt.

## Abwesenheitsbericht ohne Scrollweg + größere New-Haven-Kartenbilder 2026-08-03

<!-- codex:2026-08-03T00:08:00+02:00 -->

- `OfflinePopup.tsx` trennt feste Kopf-/Wächter-/Collect-Anker vom variablen Berichtskern. Skills,
  Camp-Bauten, Veredelung und Beute liegen darin in einem automatisch mehrspaltigen Ergebnisraster.
- `offline-stage.css` passt Breite, Höhe, Abstände, Schrift und Lootzellen über `dvh`/`clamp()` an
  den verfügbaren Viewport an. Der Modal-Scrollweg ist vollständig entfernt (`overflow: hidden`),
  der Collect-Button bleibt außerhalb des komprimierbaren Berichtskerns immer erreichbar.
- `newhaven.css` vergrößert die sichtbare Gebäudemasse in Listen- und Detailkarten auf 165 %, um
  die transparente Sicherheitsfläche der 1536er Sprites auszugleichen. Container und Bilder werden
  weiterhin proportional dargestellt und sauber geclippt.
- QA: Client-TypeScript 151 Dateien/0 Diagnosen; `offline-stage.css` und `newhaven.css` erfolgreich
  via PostCSS geparst; Klammerbilanzen 139/139 bzw. 333/333. Build/Vitest bleiben wegen der bereits
  dokumentierten lokalen `esbuild spawn EPERM`-Sperre offen.

## Item-Tooltip — rechter Suffix-Overflow strukturell behoben 2026-08-03

<!-- codex:2026-08-03T00:37:00+02:00 -->

- `apps/client/src/renderer/styles/components.css` besitzt nun am Ende der Kaskade einen einzigen
  verbindlichen Warbanner-Rastervertrag. Ausrüstungsmodale dürfen auf großen Viewports bis 1220 px
  wachsen; die Bildspalte bleibt begrenzt und der zusätzliche Raum geht gezielt an den Datenbereich.
- Die widersprüchlichen festen 250-px-Mindestbreiten der beiden inneren Statistikspalten werden dort
  durch schrumpffähige `minmax(0, …)`-Spuren ersetzt. Dadurch kann der innere Grid nicht mehr rechts
  über seinen eigenen Rahmen hinauswachsen.
- Suffix-, Attribut-, Defense-, Skill- und Misc-Zeilen besitzen feste Spuren für Icon, umbrechbares
  Label, nicht umbrechenden Wert und optionales Compare-Delta. Lange deutsche Namen wie
  `Konstitution` verdrängen damit weder den `+1`-Wert noch Vergleichszahlen aus dem Modal.
- Unter 1040 px ordnen sich die Datengruppen einspaltig, unter 760 px zusätzlich Bild und Daten.
  Simple- und Consumable-Einspaltenkarten behalten ihre bewusst kompakteren Breiten.
- QA: `components.css` erfolgreich mit PostCSS geparst (428 Root-Nodes), Klammerbilanz 399/399;
  vollständiger Client-Typecheck über 151 Dateien mit 0 Diagnosen. Der Produktionsbuild konnte nicht
  gestartet werden, weil die Windows-Sandbox bereits den PowerShell-Prozess mit
  `CreateProcessAsUserW failed: 5 (Zugriff verweigert)` blockiert. Kein Electron-/Live-Start.

## New Haven — objektgebundene Kartenkalibrierung und Tiefensortierung 2026-08-03

<!-- codex:2026-08-03T09:46:00+02:00 -->

- Der Move-Modus in `apps/client/src/renderer/pages/NewHavenPage.tsx` wählt Gebäude nun per Klick
  aus und blendet Skalierung (1–300 %), horizontale Spiegelung und Reset als kompakte Werkzeugleiste
  direkt am Gebäude ein. Sprite, Namensschild und Werkzeugleiste sind getrennte Ebenen; die beiden
  UI-Elemente skalieren oder wandern nicht mit dem Sprite.
- Gebäude werden anhand der unteren Kante ihres prozentualen Footprints tiefensortiert. Ein näher am
  unteren Kartenrand stehendes Gebäude wird damit vor einem weiter hinten stehenden Gebäude
  gezeichnet. Auswahl erhält nur während der Bearbeitung einen temporären Bedienvorrang.
- Die Kalibrierung bleibt bis zur vollständigen Chef-Abnahme renderer-lokal und erzeugt keine neuen
  Save-Felder. Abgenommene Standardprozente liegen stufenspezifisch in `campArt.ts`: Fischerhütte I
  165 %, Saatgarten I 155 %, Schmelzofen I 140 % / II 180 %, Händlerposten I 137 % / III 120 % und
  Hehlerzelt I 185 %. Reset springt auf den jeweiligen Rangstandard.
- Die Baupalette lässt ihre Karten nicht mehr durch den flexiblen Seitenhöhenvertrag
  zusammenschrumpfen; ausschließlich die Kartenliste scrollt intern.
- Smelter II/III, jeweils Tag und Nacht, wurden mechanisch von den verbundenen Magenta-Chroma-Rändern
  bereinigt. Nachtfassungen verwenden exakt die bereinigte Tag-Silhouette als Alphagrenze. Originale
  liegen unter `CODEX/work/backups/newhaven-smelter-chroma-2026-08-03/`, neutrale QA-Composites unter
  `CODEX/work/qa/newhaven-smelter-cleanup/`.
- `action-queue.css` verwendet für operative Informationen nun die klarere Sekundärschrift mit
  600/700 Gewicht und größeren Mindestgrößen. Fell Chronicle bleibt den kurzen Fantasy-Überschriften
  vorbehalten; die Queue ist dadurch bei 1920×1080 belastbarer lesbar.
- Der breitere Item-Tooltip besitzt zusätzlich einen Compare-Schutz: zwei Karten teilen sich den
  Viewport, klappen ihre Datenspalten bei Bedarf um und stapeln sich unter 1100 px.
- QA: Client-TypeScript 151 Dateien/0 Diagnosen. `newhaven.css`, `action-queue.css` und
  `components.css` via PostCSS erfolgreich geparst; Klammerbilanzen 355/355, 84/84 und 406/406.
  Smelter-Sprites 1536×1536 mit Alpha-Bounds ausschließlich um die Gebäudesilhouette. Kein
  Electron-/Live-Start; der bekannte Windows-Prozessfehler verhindert weiterhin den CLI-Build.

## New Haven — Gebäudetags und Licht-Debug 2026-08-03

<!-- codex:2026-08-03T12:10:00+02:00 -->

- Gebäudenamen liegen nun bei 25 % der logischen Hitboxhöhe, also mittig zwischen Oberkante und
  Zentrum. Sie bleiben unabhängig von Sprite-Skalierung, Spiegelung und der darunterliegenden
  Tiefensortierung an dieser Position.
- Die Kartenleiste besitzt einen lokalisierten `Debug: Tag`/`Debug: Nacht`-Schalter. Er überschreibt
  ausschließlich die gerenderte Lichtphase bis zum Seiten-Remount; Engine, Spielzeit und Savegame
  bleiben unverändert.
- Die Toolbar-Raster für Desktop und kleinere Breiten wurden um den zusätzlichen Schalter erweitert.
- QA: vollständiger Client-Typecheck über 195 Nicht-Deklarationsdateien mit 0 Diagnosen;
  `newhaven.css` via PostCSS erfolgreich geparst. Kein Electron-/Live-Start.

## Design-Lieferung — New-Haven-Emblem und Asset-Gap-Sweep 2026-08-03

<!-- codex:2026-08-03T11:27:39+02:00 -->

- Definitiver Auftrag: `CODEX/inbox/2026-08-03-02-definitiv-arbeitsteilung-heute.md`.
- Neues New-Haven-Emblem als kompaktes Wachfeuer zwischen zwei Palisadenspitzen im bestehenden
  Ashen-Iron-Farbraum erstellt. Produktionskandidaten und Kontrollmaterial liegen ausschließlich im
  Staging unter `CODEX/AssetControl/newhaven-emblem/`.
- Lieferdateien: `icon_newhaven.webp` und `icon_newhaven.png` (je 512×512, RGBA/Alpha),
  `preview_14-20px.png`, `source_chromakey.png` und die lokale `README.md` mit Prompt und QA-Notizen.
- Visuelle QA: tatsächliche 14-/16-/20-px-Darstellung sowie 8×-Pixelansicht geprüft. Das Wachfeuer
  bleibt auf 14 px erkennbar; Palisaden und Bronzeakzente werden ab 16–20 px klar lesbar.
  Technische QA: beide Finalformate exakt 512×512 mit Alpha; alle vier PNG-Ecken Alpha 0.
- Intake-Hinweis: Claudes Wunschname lautet `icon_newhaven.webp`; die vorhandene Sidebar-Konvention
  kann `sidebaricon_newhaven.webp` erwarten. Den produktiven Zielnamen beim Einbinden gegen den
  tatsächlichen Konsumenten festlegen, statt die Staging-Datei automatisch zu verdrahten.
- Read-only-Bestandsaufnahme unter `CODEX/notes/2026-08-03-ui-asset-gap-sweep.md`: Items 355/355,
  Monster 109/109, Pets 21/21 und 53/53 statische `getUiIcon`-Referenzen sind auflösbar. Priorisierte
  UI-Lücken sind direkte Unicode-/Emoji-Platzhalter in Action Queue, Quests, Achievements, Combat,
  Farming, Options, Mail/Offline und Footer-Lokalisierungen.
- Gemäß der definitiven Arbeitsteilung wurden keine produktiven Renderer-, Engine-, Content-,
  Persistenz-, i18n- oder Runtime-Asset-Dateien geändert. Daher kein Save-Bump und keine Code-Tests
  erforderlich; Claude übernimmt ausschließlich Sichtprüfung, Namensentscheidung und späteres Intake.

## Micro-Icon-System — fünf Prüftafeln, Abnahmegate 2026-08-03

<!-- codex:2026-08-03T11:51:35+02:00 -->

- Auftrag: `CODEX/inbox/2026-08-03-03-micro-icon-sets.md`. Gemäß dem vereinbarten Gate wurden nur
  Prüftafeln erzeugt; transparente 512er PNG/WebP-Einzeldateien folgen erst nach Chef-/Claude-GO.
- Gemeinsame Art Direction: flache geschmiedete Glyphen, 44–48 px Master-Strich in einer 512er
  ViewBox, Altgold als Primärsignal und Kupfer als Sekundärzustand. Keine Schatten, Partikel oder
  Materialdetails, die bei 14 px verschwimmen.
- Action Queue — 6 Konzepte: Queue, Warnung, Blockiert, Priorität, Hoch, Runter.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/01-action-queue/review-board.png`.
- Quest Semantik — 6 Konzepte: Ticket, Pin, Dialog, Kalender, Journal, Münze.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/02-quest-semantics/review-board.png`.
- Achievements — 12 Konzepte: zehn Kategorien plus Milestone-Trophäe und Lupe.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/03-achievements/review-board.png`.
- Combat Status — 7 Konzepte: drei Heilquellen, Kill, Immunität, Boss/Dungeon, Regeneration.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/04-combat-status/review-board.png`.
- System/Empty State — 6 Konzepte: Warnung, Idle, Mail, Ordner, Checkbox an/aus.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/05-system-empty/review-board.png`.
- Gesamtübersicht: `CODEX/AssetControl/micro-icon-sets-2026-08-03/index.html`. Reproduzierbare
  Designquelle: `CODEX/work/2026-08-03-micro-icon-sets/generate-previews.mjs`; übertragener Brief:
  `CODEX/work/2026-08-03-micro-icon-sets/BRIEF.md`.
- QA: 37/37 eindeutige Konzept-IDs; alle fünf PNG-Tafeln 1804 px breit; tatsächliche 14-/16-/20-px-
  Raster sowie 8×-Pixelinspektion pro Glyph geprüft. Keine finalen Einzelassets im Staging vorhanden.
- Namensempfehlung für die Vollproduktion: `icon_queue_*`, `icon_quest_*`, `icon_ach_*`,
  `icon_combat_status_*`, `icon_sys_*`; eindeutiger als die Kurzformen `icon_q_*`/`icon_cs_*`.
- Sperrzonen eingehalten: kein Produktivcode, keine Runtime-Assets und keine i18n-Dateien geändert.
  Kein Save-Bump. Nachricht 03 bleibt bis zur Abnahme und anschließenden Vollproduktion offen.

### Rückfrage an Claude / Chef

Bitte entweder das Gesamtsystem freigeben oder Korrekturen pro Set/ID nennen. Nach GO produziert Mira
die 37 transparenten 512er PNG/WebP-Dateien und verschiebt den Auftrag anschließend nach `inbox/done/`.

## Micro-Icon-System — Vollproduktion nach GO 2026-08-03

<!-- codex:2026-08-03T12:04:13+02:00 -->

- Freigabe: `CODEX/inbox/2026-08-03-04-go-micro-icon-vollproduktion.md`; das vollständige System aus
  37 Glyphen wurde als transparentes 512×512-PNG und verlustfreies WebP produziert.
- Action Queue: 6 Icons / 12 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/01-action-queue/production/`.
- Quest Semantik: 6 Icons / 12 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/02-quest-semantics/production/`.
- Achievements: 12 Icons / 24 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/03-achievements/production/`.
- Combat Status: 7 Icons / 14 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/04-combat-status/production/`.
- System/Empty State: 6 Icons / 12 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/05-system-empty/production/`.
- Claudes Produktionshinweise umgesetzt: `icon_ach_forge` besitzt nun eine kantige Ambossform mit
  getrenntem Horn und Fuß; `icon_combat_status_heal_death` hat größere, kontrastierende
  Schädelmerkmale. Beide korrigierten Formen wurden erneut bei 14/16/20 px geprüft.
- Warnungs-Dedupe: `icon_queue_warning` und `icon_sys_warning` stammen aus demselben Glyphenbuffer.
  PNG-SHA256 jeweils `f844aeb1b808d092a68377caab867b5e50814690e03973a54ea63932fa20255b`,
  WebP-SHA256 jeweils `c539781d493e50a43db6d089e18b26b0c6a8853d78cf652a648c0d075c62d6ee`.
- Gesamt-QA: `CODEX/AssetControl/micro-icon-sets-2026-08-03/production-qa.json`. Ergebnis:
  37/37 eindeutige IDs, 74/74 Finaldateien, Maße 512×512, Alpha vorhanden, vier Ecken transparent,
  24-px-Außenrandprüfung bestanden und Warnungsdateien in beiden Formaten bitidentisch.
- Jeder Produktionsordner enthält zusätzlich ein `manifest.json` mit Dateigröße, SHA256,
  Alpha-Bounds und Formatprüfung. Diese kommentarlosen JSON-Dateien gehören ausschließlich zum
  CODEX-Staging; der zugehörige `codex:`-Nachweis ist dieser HANDOFF-Block.
- Sperrzonen eingehalten: kein Produktivcode, keine Runtime-Assets und keine i18n-Dateien geändert.
  Kein Save-Bump. Claude ist nächster Owner für set-weises Intake und Emoji-Ablösung.

## 0.3.0-Event-Artwork, System-Icon-Nachschlag und New-Haven-Wachstum 2026-08-03

<!-- codex:2026-08-03T13:43:00+02:00 -->

### Steam-Event-Artwork

- Auftrag: `CODEX/inbox/2026-08-03-05-event-artwork-und-konzepte.md`; bestehende Patchvorlage und
  0.2.0-Eventgrafiken wurden als verbindliche Layoutreferenz verwendet.
- Finale Staging-Dateien:
  `CODEX/AssetControl/event-0.3.0/event_new_haven_capsule_800x450.png` und
  `CODEX/AssetControl/event-0.3.0/event_new_haven_header_1920x622.png`.
- Zielgrößenprüfung: exakt 800×450 und 1920×622; kombinierte Sichtprüfung unter
  `CODEX/AssetControl/event-0.3.0/preview-target-sizes.png`.
- Motiv: düsteres Lager an Furt und alter Straße, einzelnes Wachfeuer, Palisaden-/Zelt-Silhouetten
  und ruinierte Wegstation mit Glockenrahmen; keine Figuren, Kreaturen, Logos oder KI-Typografie.
- Der unbeschriftete 1672×941-Source liegt als `source_new_haven_watchfire.png` bei. Der exakte finale
  ImageGen-Prompt ist in `CODEX/AssetControl/event-0.3.0/PROMPT.md` dokumentiert. Titel und übrige
  Typografie wurden deterministisch mit dem Renderer-Cinzel gesetzt.
- Der statusneutrale Badge `NEW FRONTIER` vermeidet eine nicht freigegebene Datums- oder
  Verfügbarkeitsaussage. Claude/Chef kann ihn vor Steam-Upload bei Bedarf durch `OUT NOW` ersetzen.

### System-Icon-Nachschlag

- `icon_sys_save` und `icon_sys_back` wurden im bereits abgenommenen Vektorstil unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/05-system-empty/production/` ergänzt, jeweils als
  transparentes 512×512-PNG und verlustfreies WebP.
- Systemset nun 8 Icons; Gesamtsystem nun 39 eindeutige IDs / 78 Finaldateien. Review-Board,
  HTML-Übersicht, Set-Manifest und `production-qa.json` wurden neu erzeugt.
- QA vollständig grün: Maße, Alpha, transparente Ecken und 24-px-Außenrand. Beide neuen Glyphen
  wurden zusätzlich im echten 14-/16-/20-px-Prüfstreifen visuell kontrolliert.

### Konzepttafeln: sichtbares New-Haven-Wachstum

- Drei kumulative 1920×1080-Tafeln unter `CODEX/work/newhaven-growth-concepts/`:
  `01-watchfire.png`, `02-tent-ring.png` und `03-waystation.png`; Übersicht: `overview.png`.
- Empfehlung: sichtbares Wachstum ausschließlich über Wachfeuer, Bodenabdrücke, Straßenkante,
  randständige Palisade sowie alte Fundamente/Glocken-Landmarke erzählen. Die zentrale freie
  Spielerbaufläche bleibt ruhig und unverstellt.
- Der echte Kartengrund wurde nur gelesen und nicht verändert. Sein geprüfter SHA256 lautet
  `91395050afcdb819ce06946df8879e0210b6438cdcf98f8ecec6143118ef6481`.
- Die Tafeln sind ausdrücklich eine Entscheidungsgrundlage, keine bindende Art- oder Runtime-
  Freigabe. Nächster Owner ist Claude für Produktentscheidung und gegebenenfalls Scope-/Roadmap-
  Einordnung.

### Sperrzonen und Verifikation

- Kein Produktivcode, keine Runtime-Assets, keine Engine-/Persistenz-/Content-/i18n-Dateien geändert;
  kein Save-Bump und keine Produkt-Tests erforderlich.
- Alle erzeugten Rasterdateien wurden headless auf Maße geprüft und visuell in Zielgröße kontrolliert.
  Nachricht 05 kann nach dieser vollständigen Dreifachlieferung nach `CODEX/inbox/done/` verschoben
  werden.

## Fight-Card-Rework — zehn interaktive HTML-Studien 2026-08-03

<!-- codex:2026-08-03T14:37:38+02:00 -->

- Direkter Chef-Auftrag; keine Inbox-Nachricht. Prüfarbeitsplatz:
  `CODEX/AssetControl/FightCardConcepts-2026-08-03/index.html`.
- Zehn eigenständige Layoutvarianten auf Basis des tatsächlichen `MonsterCard`-Datenvertrags:
  XP, Level/Prognose, Slayer-/Trait-Zustände, sechs Kampfwerte, beide Trefferchancen, Drops,
  Slayer-Anforderung, Sofortkampf, 1/25/50/∞ und Queue-Fortschritt.
- Zustandsumschaltung für Bereit/Kampf läuft/Slayer-Ziel/gesperrt/Elite, interaktive Mengenwahl und
  Breitentest von 270 bis 430 px sind direkt in der HTML enthalten.
- Empfehlung aus Design-Sicht ist Studie 10 `Frontline Candidate`; Studie 03 ist die lesbarste
  Ledger-Variante, Studie 08 die platzsparende breite Desktopalternative.
- QA: 10 Konzeptdefinitionen und CSS-Varianten vorhanden, alle zehn lokalen Medien-/Fontpfade
  existent, CSS-Klammerbilanz 158/158 und eingebettetes JavaScript mit Babel-Parser syntaktisch
  erfolgreich geprüft. Die In-App-Browser-Sitzung war auf diesem Launch nicht verfügbar und der
  lokale Chrome-Prozess wurde von der Sandbox blockiert; daher keine automatisierte Screenshot-
  Renderprüfung in dieser Lieferung.
- Nur CODEX-Staging und Dokumentation geändert. Kein Produktivcode, keine Runtime-Assets, i18n-,
  Engine-, Persistenz- oder Save-Änderung. Umsetzung nach Chef-Auswahl bleibt bei Claude.

## Fight Cards — Chef-Auswahl 10 „Frontline Candidate“ produktiv 2026-08-03

<!-- codex:2026-08-03T15:01:52+02:00 -->

- Direkte Chef-Freigabe für Studie 10; produktive, isolierte Styleschicht:
  `apps/client/src/renderer/styles/gravewood-fighter-cards.css`.
- Import ausschließlich über den letzten Block von
  `apps/client/src/renderer/styles/index.css`; Rollback besteht aus dem Entfernen dieses Imports
  und der neuen Stylesheet-Datei. Bestehende `CombatPage.tsx`-Struktur, Handler, Queue-Logik und
  i18n blieben unangetastet.
- Alle `monster-card`-Konsumenten erhalten den Frontline-Vertrag: echtes Zonen-/Monsterartwork,
  Ironwood-Bastion-12-px-Rahmen, gekacheltes Basalt, zweispaltiges Stat-Register, feste Prognose-,
  Loot- und Aktionsmodule sowie stabile responsive Kartenbreiten. Elite- und Slayer-Karten behalten
  ihre Statusakzente.
- Verwendet ausschließlich bestehende Runtime-Assets:
  `assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp` und
  `assets/ui/gravewood/v3/textures/texture-basalt.webp`.
- QA: neue CSS-Datei mit PostCSS erfolgreich geparst (46 Top-Level-Nodes), beide Asset-URLs
  vorhanden, Importbindung bestätigt. Interner Client-TypeScript-Lauf las 153 Dateien und meldete
  ausschließlich die umgebungsbedingte Auflösung von `@types/node`; keine TS-/TSX-Datei wurde
  geändert. Regulärer pnpm-/Build-Prozess bleibt durch Windows `CreateProcessAsUserW: Zugriff
  verweigert` blockiert.
- Kein Save-Bump; keine Engine-, Content-, Persistenz-, i18n- oder Binärasset-Änderung. Claude ist
  nächster Owner für regulären Client-Typecheck/Build und visuellen Live-Sign-off.

## Gear Dock — drei interaktive Interior-Studien 2026-08-03

<!-- codex:2026-08-03T16:31:00+02:00 -->

- Auftrag `2026-08-03-06-gear-dock-design.md`; Design-Staging:
  `CODEX/AssetControl/gear-dock-2026-08-03/index.html` mit Kurzbrief in der dortigen `README.md`.
- Drei produktionsnahe Richtungen auf Basis des echten Combat-Dock-Vertrags und des aktuellen
  Referenzscreens: `Quartermaster’s Mannequin`, `Iron Reliquary` und `Frontline Harness`.
- Jede Richtung demonstriert klickbar alle vier Tabs `Gear`, `Skills`, `Style`, `Prep`; der
  Pfeil unten rechts schaltet zusätzlich einen echten 44-px-Rail-Zustand. Damit ist nachgewiesen,
  dass die vorgeschlagene Material-/Rahmensprache nicht nur auf dem Paperdoll funktioniert.
- Bestehende Slot-Geometrie, reale Grim-Reach-Itemassets, Bronze-Lipped-Iron-Rahmen sowie
  Basalt-/Umber-Texturen wurden wiederverwendet. Keine neuen Produktionsassets erzeugt oder
  in Runtime-Pfade eingebunden.
- Designempfehlung: `Frontline Harness` für die stärkste Battle-Record-Kohärenz;
  `Iron Reliquary` als lesbarste und risikoärmste Produktionsoption bei kleinen Dockbreiten.
- QA: eingebettetes JavaScript mit Babel-Parser und CSS mit PostCSS erfolgreich geparst;
  14 eindeutige lokale Assetreferenzen vorhanden, keine fehlenden Pfade. Die Browser-/Chrome-
  Renderprüfung war in dieser Sandbox nicht verfügbar; deshalb visuelle Endabnahme direkt über
  die lokale HTML.
- Ausschließlich `CODEX/AssetControl`, Übergabeprotokoll und Inbox-Status geändert. Kein
  Produktivcode, keine Runtime-Assets, Engine-, Persistenz-, Content-, i18n- oder Save-Änderung.
  Umsetzung wartet ausdrücklich auf Chef-/Claude-Auswahl.

## Gear Dock — Chef-Auswahl 03 „Frontline Harness“ produktiv 2026-08-03

<!-- codex:2026-08-03T17:21:00+02:00 -->

- Direkte Chef-Freigabe für Studie 03; produktive, isolierte Styleschicht:
  `apps/client/src/renderer/styles/frontline-harness-dock.css`.
- Einbindung ausschließlich als letzter Import in
  `apps/client/src/renderer/styles/index.css`. Rollback: diesen Import entfernen und die neue
  Stylesheet-Datei löschen; bestehende `CombatPage.tsx`-/`EquipmentOverview.tsx`-Struktur wurde
  nicht verändert.
- Gear erhält die Frontline-Harness-Bühne mit zentraler Ausrüstungsachse, zurückhaltender
  Körpersilhouette und zwei bronzenen Gurtrahmen hinter den unveränderten echten Slots. Stats und
  Buffs folgen der Dichte des Battle Record.
- Skills, Style und Prep verwenden denselben Basalt-/Bronze-/Iron-Ledger-Vertrag. Das bestehende
  Auto-Eat-/Auto-Potion-/Auto-Buff-UI wurde nur visuell gefasst; alle Handler und Engine-Werte
  bleiben unverändert. Der 44-px-Kollapsrail ist als eigenständige Metallleiste ausgearbeitet.
- Ausschließlich vorhandene Runtime-Assets:
  `assets/ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp` und
  `assets/ui/gravewood/v3/textures/texture-basalt.webp`; keine neuen Binärassets.
- QA: neue CSS-Datei mit PostCSS erfolgreich geparst (54 Regeln / 204 Deklarationen), alle Regeln
  auf `.combat-frontline-dock` begrenzt, beide Assetpfade existent, Import exakt einmal und als
  letzter Renderer-Import vorhanden. Keine TS-/TSX-Datei geändert; daher keine Engine-/Content-
  oder Save-Verifikation erforderlich. Claude bleibt Owner des visuellen Live-Sign-offs und des
  regulären Client-Builds, der in Miras Windows-Sandbox nicht gestartet werden kann.
- Kein Save-Bump; keine Engine-, Persistenz-, Content-, i18n- oder Datenänderung.

## Main Menu — integrierte Load-Game-Kopfzeile 2026-08-03

<!-- codex:2026-08-03T18:42:00+02:00 -->

- Chef-Screenshot-Nachfix ausschließlich in
  `apps/client/src/renderer/styles/gravewood-loadgame.css`.
- Der fast schwarze, aufgesetzte `Load Game`-Balken ist jetzt eine in das Save-Ledger integrierte
  Materialkopfzeile: Leder-/Gravewood-Vertrag, feine Bronze-Trennlinie, skalierbarer Titel und ein
  kompakter, holzgerahmter Rückweg. Alle Selektoren sind auf `.menu--panel-load` begrenzt; New Game
  und Options bleiben unangetastet.
- QA: Stylesheet mit PostCSS erfolgreich geparst; acht neue/angepasste Kopfzeilen-Selektoren sind
  vollständig gescoped, alle drei verwendeten Runtime-Assets vorhanden. Kein TS-/TSX-Eingriff,
  kein Save-Bump.

## Achievements — fünf funktionale Umbau-Studien 2026-08-03

<!-- codex:2026-08-03T18:42:00+02:00 -->

- Bestehende `AchievementsPage.tsx` read-only gegen ihren tatsächlichen Funktionsvertrag geprüft:
  537 Karten, neun Kategorien, Statusfilter, AP, AP-Meilensteine, „Kurz davor“, Seltenheiten und
  kategorieweise Trophy-Room-Gruppierung.
- Fünf klickbare Studien unter
  `CODEX/AssetControl/AchievementsConcepts-2026-08-03/index.html`:
  `Trophy Hall`, `Warden Ledger`, `Milestone Forge`, `Archive Table`, `Hall of Banners`.
- Jede Studie behält die echten Kernfälle; die produktiv sinnvolle Suche wurde als Ergänzung für
  537 Einträge demonstriert. Kategorien, Alle/Erhalten/Offen, Suche, Detailauswahl und bei Studie 05
  die Hallenflügel sind interaktiv.
- QA: HTML 26 KB, eingebettetes JavaScript mit Babel und CSS mit PostCSS erfolgreich geparst;
  fünf Studien erkannt, alle statisch referenzierten lokalen Assets vorhanden. Keine produktive
  Achievement-, Engine-, Content-, Persistenz-, i18n- oder Save-Änderung. Umsetzung wartet auf
  Chef-/Claude-Auswahl.

### Gear Dock — Außenhüllen-Nachfix 2026-08-03

<!-- codex:2026-08-03T17:41:00+02:00 -->

- Chef-Screenshot-Nachfix in `frontline-harness-dock.css`: der ausgeklappte Dock besitzt jetzt
  exakt den 10-px-Bronze-Lipped-Iron-Außenrahmen und die Umber-Cloth-Hintergrundschichtung des
  rechten `.combat-select`-Zonencontainers. Die kontrastierende Basalt-Harness-Bühne bleibt nur
  innerhalb dieser gemeinsamen Außenhülle.
- PostCSS-Parse erfolgreich; Rahmenwerte gegen die bestehende Zonenregel abgeglichen, alle drei
  verwendeten Runtime-Assetpfade vorhanden. Kein Save-Bump.

## Achievements — Warden Ledger produktiv 2026-08-03

<!-- codex:2026-08-03T19:24:00+02:00 -->

- Direkte Chef-Freigabe für Studie 02; `AchievementsPage.tsx` in ein dreispaltiges Warden Ledger
  umgebaut: links Filter/Kategorien mit Live-Zählern, mittig Suche/„Kurz davor“/scrollbare Liste,
  rechts ein permanentes Detailblatt für die ausgewählte Errungenschaft.
- Neue, spät importierte Styleschicht:
  `apps/client/src/renderer/styles/warden-ledger-achievements.css`. Rollback: Import entfernen,
  Stylesheet löschen und `AchievementsPage.tsx` auf den Trophy-Room-Renderer zurückführen.
- Die von Claude am selben Tag verdrahteten `CATEGORY_UI`-, Meilenstein- und Such-Icons wurden
  ausdrücklich erhalten und im neuen Layout eingesetzt. Keine Emoji-Rückstufung.
- Suche und Auswahl sind rein lokal. AP, Seltenheit, Freischaltung, Kategorien, Meilensteine sowie
  Fortschritt lesen weiterhin ausschließlich die vorhandenen Shared-/Engine-Quellen. Keine neue
  i18n-Zeichenkette: die Suche verwendet den bestehenden `inv.filter.searchPlaceholder`-Vertrag.
- QA: TSX mit Babel und TypeScript-Transpile geparst; Client-Semantiklauf über 153 Dateien meldet
  keine Diagnose in `AchievementsPage.tsx`. Einzige Gesamtdiagnose bleibt die bekannte
  umgebungsbedingte fehlende `@types/node`-Definition. Neue CSS-Schicht: 75 Regeln / 292
  Deklarationen, PostCSS erfolgreich, alle drei Runtime-Assets vorhanden.
- Claudes Koordinationsbrief `2026-08-03-07-koordination-achievements.md` nach Abgleich nach
  `CODEX/inbox/done/` verschoben. Kein Save-Bump; keine Engine-, Content-, Persistenz- oder
  Datenänderung. Claude ist nächster Owner für regulären Build und Screenshot-Abnahme.

## Steam Store 0.3.0 — Capsule-Schiene und Produktionsplan 2026-08-03

<!-- codex:2026-08-03T19:34:00+02:00 -->

- Claudes Auftrag `2026-08-03-08-steam-store-elemente.md` aufgenommen. Unter
  `CODEX/AssetControl/store-elements-0.3.0/` liegen zwei vollstaendige, dimensionsgetreue
  Capsule-Familien fuer Header (920 x 430), Small (462 x 174) und Main (1232 x 706):
  permanente logo-only Watchfire-Familie sowie ein englisches New-Haven-0.3.0-Override.
- Quelle sind ausschliesslich das freigegebene Watchfire-Keyart und das vorhandene transparente
  Grim-Reach-Logo. Komposition, Crops, Gradierung und Schrift wurden deterministisch erzeugt;
  keine Bild-KI-Typografie und kein Fake-Gameplay. Visuelle Abnahme ueber
  `PREVIEW-capsule-families.png`; Pixelmasse und Kurz-Hashes stehen in `MANIFEST.md`.
- Shotlist fuer sieben echte Store-Screenshots, Trailer-/GIF-Storyboard, Capsule-Konzept und
  Materialluecken sind dokumentiert. Claudes angekuendigte Ordner
  `marketing/0.3.0-media/screenshots/**`, `clips/**` sowie `INDEX.md` sind derzeit leer bzw. fehlen.
  Deshalb wurden Screenshot-Auswahl und Videoschnitt bewusst nicht simuliert.
- Brief bleibt bis zum Eingang und zur Verarbeitung der echten Capture-Dateien offen in
  `CODEX/inbox/`. Keine Runtime-, Engine-, Persistenz-, i18n- oder Save-Aenderung; kein Save-Bump.

## Steam Store — Ashen-Iron-Beschreibungstafeln 2026-08-03

<!-- codex:2026-08-03T20:12:00+02:00 -->

- Auf Chef-Nachtrag die vier alten Citadel-Holztafeln als zusammenhaengende Ashen-Iron-Serie neu
  gesetzt und um `panel_newhaven.png` erweitert. Abnahmeordner:
  `CODEX/AssetControl/store-elements-0.3.0/description-panels/`.
- Gemeinsamer visueller Vertrag: korrekter Bronze-Lipped-Iron-9-Slice, Basalt bzw. Umber-Cloth,
  kalte Informationstexte und sparsame warme Bronzehierarchie. Exakte gebuendelte Fonts statt
  generierter Bildschrift; reale Runtime-Skill-/Elite-Assets und echte New-Haven-Aufnahme.
- Chef-Screenshot-Nachfix direkt waehrend Produktion: schwarze SVG-Eckkeile aus offenen Pfaden
  entfernt und Titelornamente auf sicheren Abstand gesetzt. Alle fuenf Einzeltafeln visuell
  kontrolliert und auf exakt 616 px Breite verifiziert; Masse/Hashes im lokalen README.
- Die alten Dateien in `design/marketing/store-panels/` bleiben bis zur Freigabe unangetastet.
  Keine Runtime-, Engine-, Persistenz-, i18n- oder Save-Aenderung; kein Save-Bump.
- Claudes Capture-Lieferung ist inzwischen vollstaendig vorhanden (Index, acht PNGs, vier WebMs),
  daher ist die uebrige Screenshot-/Trailer-Schiene wieder ungebremst offen.

<!-- codex:2026-08-03T20:18:00+02:00 -->

- Chef-QA-Nachfix: `panel_numbers.png` und `panel_skills.png` verwendeten noch die erste
  Titelornament-Funktion. Beide auf denselben breitenabhaengigen Sicherheitsabstand wie World und
  New Haven umgestellt; Linien enden nun klar vor Diamanten und Schrift. Gesamtpreview sowie
  Pruefsummen aktualisiert.

<!-- codex:2026-08-03T20:24:00+02:00 -->

- `panel_worldfightsback.png` auf Chef-Wunsch mit drei neuen, klar freigestellten Runtime-Elites
  bestueckt: Coast Crab, Border Butcher und Black Golem. Fell-, Feder- und Rauchsilhouetten der
  ersten Fassung entfernt; Gesamtpreview und Hashmanifest aktualisiert.

## Arena-Zonen 0.4.0 — Pilot-Dreier zur Abnahme 2026-08-03

<!-- codex:2026-08-03T20:30:00+02:00 -->

- Claudes Auftrag `2026-08-03-09-arena-zonen-assets.md` vollständig als kontrollierte Runde 1
  umgesetzt. Staging: `CODEX/AssetControl/arena-zones-0.4.0/round-01-pilot/`.
- Pastures um vier echte Alpha-Props ergänzt. Crypt und Slagpit erhielten jeweils neuen
  1536×1024-Boden, neue 1717×916-Kulisse und vier zoneneigene Alpha-Props. Zusätzlich liegt ein
  gemeinsames 512×512-Sonnen-Glow-Sprite vor.
- Chefkontrolle über `CONTROL-BOARD-round-01.webp`; jede Zone besitzt außerdem eine
  1920×1080-Einzelbühne und eine Stimmungsreferenz. Licht-, Ambient-, Fog- und Grade-Vorschläge
  stehen in `MOOD-VALUES.md` und warten nur noch auf Claudes JSON-Skelett.
- Alpha-QA: zwölf Props auf dunklem und warmem Kontrastgrund geprüft. Das von ImageGen
  gerenderte Schachbrett wurde entfernt; finale WebPs besitzen echte Alpha-Kanäle und saubere
  Fußkanten. Maß-QA für alle Boden-/Kulissendateien bestanden.
- Keine Runtime-, Prototyp-, Engine-, Persistenz-, i18n- oder Save-Änderung; kein Save-Bump.
  Claude bleibt Owner der Manifest-Verdrahtung. Runde 2 startet erst nach Chef-Abnahme dieses
  Piloten.
- Nach Eingang von `2026-08-03-10-manifest-skelett.md` drei valide Staging-Manifeste ergänzt:
  `round-01-pilot/pastures.manifest.json`, `crypt.manifest.json` und `slagpit.manifest.json`.
  JSON erlaubt keine `codex:`-Kommentare; dieser HANDOFF-Eintrag dokumentiert deshalb die drei
  exakten kommentarfreien Zielpfade. Pastures übernimmt Claudes abgenommene Juli-Lichtwerte
  unverändert; Crypt und Slagpit folgen den Grenzen des neuen Skeletons.

## Chicken-Pose-Pilot — Kontrolltafel zur Chef-Abnahme 2026-08-05

<!-- codex:2026-08-05T09:08:17+02:00 -->

- Claudes Auftrag `2026-08-05-01-chicken-pose-pilot.md` bis zum vorgeschriebenen
  Abnahmepunkt umgesetzt. Staging:
  `CODEX/AssetControl/chicken-pose-pilot-2026-08-05/`.
- Dateien: `chicken_pose_windup.webp`, `chicken_pose_strike.webp`,
  `chicken_pose_hit.webp` und `CONTROL-BOARD-chicken-poses.webp`.
- Alle drei Posen besitzen dasselbe 1254×1254-Canvas wie der unveränderte Master,
  echtes Alpha, dieselbe Blickrichtung und eng vergleichbare sichtbare
  Flächendeckung. Boden, Schatten und Glow fehlen absichtlich.
- Eine violette Chroma-Kante der ersten Freistellung wurde vor Übergabe entfernt;
  Detailwerte und Alpha-Bounds stehen in `QA.md`.
- Keine Runtime-, Engine-, Persistenz-, i18n- oder Save-Änderung; kein Save-Bump.
  Brief bleibt bis zur Chef-Abnahme offen. Claude bleibt Owner der produktiven
  Einbindung.

## Arena Scene Builder — vollständige Pilot-Palette 2026-08-05

<!-- codex:2026-08-05T09:50:35+02:00 -->

- Claudes reaktivierten Auftrag `2026-08-04-11-scene-builder-assets.md`
  vollständig im Staging `CODEX/AssetControl/arena-scene-builder-lib/`
  produziert.
- 42 echte Alpha-WebPs: 24 generische Natur-/Bodenelemente sowie je sechs
  charakteristische Props für Pastures, Crypt und Slagpit. Dateinamen folgen
  exakt `arena_lib_<category>_<nn>.webp` bzw.
  `arena_<zoneId>_lib_<nn>.webp`.
- Visuelle Chef-Abnahme über `CONTROL-BOARD-all-assets.webp`; vier kleinere
  Bereichstafeln liegen daneben. `INDEX.md` erklärt jede Variante, `QA.md`
  dokumentiert Maße, Alpha, Baseline und Chroma-Prüfung.
- Zwei grüne Alt-Chroma-Rohlinge wurden während der Gesamt-QA erkannt und vor
  Übergabe adaptiv korrigiert. Alle finalen Teile besitzen 8 px transparente
  Baseline-Luft und bleiben unter 900 px.
- Keine Runtime-, Engine-, Persistenz-, i18n-, Manifest- oder Save-Änderung;
  kein Save-Bump. Claude bleibt Owner der Builder-Verdrahtung.

## Grim Reach 1.0 — Release-Titelbild und Hauptkapsel 2026-08-23

<!-- codex:2026-08-23T17:38:21+02:00 -->

- Direkter Chef-Auftrag. Zwei finale Staging-Dateien unter `CODEX/AssetControl/event-1.0/`:
  `grim_reach_1_0_title_1920x622.png` und
  `grim_reach_1_0_main_capsule_800x450.png`.
- Neues ImageGen-Keyart setzt die 1.0-Identität als Schwellenbild um: einzelner Wächter auf der
  alten Straße, letztes Wachfeuer links, feindseliger Elite-Champion und Paragonturm in der Ferne.
  Das Motiv folgt der bindenden These „die Welt lebt und schlägt zurück“ und ist kein Fake-Gameplay.
- Das bestehende transparente `Grim Reach Idle`-Logo aus
  `apps/client/src/renderer/assets/ui/mainmenu_logo.webp` wurde unverändert und deterministisch
  komponiert. Die Bild-KI erzeugte weder Logo noch Schrift. Der statusneutrale Zusatz lautet
  `VERSION 1.0 · FULL RELEASE`; die laufende Patchversion 1.0.2 ändert die 1.0-Eventbezeichnung nicht.
- Built-in ImageGen wurde für das unbeschriftete 1672×941-Keyart verwendet. Exakter Prompt:
  `CODEX/AssetControl/event-1.0/PROMPT.md`; reproduzierbarer Crop-/Logo-Compositor:
  `CODEX/work/2026-08-23-release-1.0-artwork/build-release-artwork.mjs`.
- Visuelle QA erfolgte einzeln in beiden Zielgrößen und gemeinsam über
  `preview-target-sizes.png`. Eine erste Komposition wurde nach Sichtprüfung gezielt korrigiert,
  damit die Krone des offiziellen Logos vollständig innerhalb beider Canvas bleibt.
- Maß-/Format-/SHA256-Prüfung ist im kommentarfreien
  `CODEX/AssetControl/event-1.0/qa.json` dokumentiert; dieser HANDOFF-Eintrag ist der verpflichtende
  `codex:`-Nachweis für diese JSON-Datei sowie für die vier kommentarfreien PNG-Binärdateien.
- Ausschließlich CODEX-Staging und Dokumentation geändert. Kein Steam-Upload, keine Runtime-,
  Engine-, Content-, Persistenz-, i18n- oder Save-Änderung; kein Save-Bump.
- Empfohlener nächster Owner: Claude für Marketinggegenprüfung; Chef für finale Motivfreigabe und
  späteren Steam-Upload.

### Codex-Code-Marker

- `codex:2026-08-23T17:38:21+02:00` — Produktionsscript, Prompt, README, Handoff und Worklog.
- `codex:2026-08-23T17:44:00+02:00` — gezielte Logo-Safe-Area-Korrektur im Produktionsscript.

<!-- codex:2026-08-23T17:51:05+02:00 -->

- Chef-Nachfix: Die `VERSION 1.0 · FULL RELEASE`-Plakette wurde in beiden Zielgrößen deutlich unter
  die untere Logo-Spitze gesetzt. Goldene Flachschrift wurde durch eine gravierte Cinzel-Fassung
  mit silberner Eisenstaffelung, dunkler Kontur und rotem Logo-Akzent ersetzt. Die exakte
  Wortmarkenschrift existiert nur im fertigen Rasterlogo; deshalb ist Cinzel die reproduzierbare
  gebündelte Näherung. Keyart, Crop und offizielles Logo blieben unverändert.
- Marker: `codex:2026-08-23T17:51:05+02:00` im Produktionsscript, HANDOFF und WORKLOG.

<!-- codex:2026-08-23T18:00:20+02:00 -->

- Chef-QA-Nachfix: Die beiden roten horizontalen Plakettenornamente liefen hinter der Release-
  Beschriftung und wurden zwischen den Buchstaben von `RELEASE` sichtbar. Beide Querlinien wurden
  vollständig entfernt; nur der kleine rote Diamant oberhalb der Schrift bleibt. Beide Finalformate,
  Preview und Hash-QA wurden neu erzeugt.

## Verbindlicher Native-Alpha- und ID-Prozess 2026-08-23

<!-- codex:2026-08-23T18:21:18+02:00 -->

- Claudes bindende Quelle `design/asset-anforderungen.md` vollständig gelesen und als dauerhafte
  Grundlage in `CODEX/RULES.md` sowie `CODEX/PROJECT.md` verankert.
- Projektinterner Konflikt aufgelöst: Der allgemeine ImageGen-Leitfaden erlaubt Chroma-Key plus
  Freistellung; Grim Reach verbietet diesen Weg für neue Freisteller. Innerhalb des Projekts gilt
  ausschließlich natives echtes Alpha. Kann der aktuelle Erzeugungsweg dies nicht garantieren,
  stoppt die Produktion vor der Generierung.
- `CODEX/templates/ASSET-BRIEF.md` korrigiert: alte Chroma-Key-Option entfernt, exakte Content-ID
  vor Produktionsbeginn verpflichtend, Native-Alpha-Promptblock und alle sechs Abnahmepunkte aus
  Abschnitt 5 ergänzt.
- Neue aktive Vorlage `CODEX/templates/IMAGEGEN-ASSET-PROMPT.md` enthält gemeinsame Ashen-Iron-
  Vorgaben, den nativen Alpha-Pflichtblock, Kreaturen-/Ausrüstungsregeln, exakte Dateibenennung und
  das sechsteilige Abnahmegate. `CODEX/templates/README.md` verweist darauf.
- Prompt-Audit: 72 prompt-/brief-/templateartige CODEX-Dateien geprüft. 17 enthalten Chroma-
  Referenzen; in den beiden aktiven Vorlagen nur noch als Verbot, die übrigen 15 ausschließlich in
  datierten oder abgelehnten historischen Lieferungen. Diese Altbestände und Elite 11–28 wurden
  auftragsgemäß nicht verändert.
- Ausführlicher Befund: `CODEX/notes/2026-08-23-native-alpha-process-audit.md`.
- Keine Bild-, Runtime-, Content-, Engine-, Persistenz-, i18n-, Save- oder `.claude/**`-Änderung.
  Kein Save-Bump. Claude bleibt Owner der bekannten Elite-Altlasten; Mira wendet das neue Gate auf
  jede künftige Bildlieferung an.

### Codex-Code-Marker

- `codex:2026-08-23T18:21:18+02:00` — RULES, PROJECT, beide aktiven Vorlagen, Auditnotiz,
  HANDOFF und WORKLOG.

## Nachtrag: aktive Downloads-Prompts auf Native Alpha 2026-08-23

<!-- codex:2026-08-23T18:52:28+02:00 -->

- Claudes Hinweis bestätigt: Die weiterhin operative Sammlung
  `C:\Users\MSchu\Downloads\ASSETS\newGPTAssets\` lag außerhalb des ersten CODEX-Prompt-Audits.
  `alle-prompts-aktuell.txt` und `elite-nachschlag-chroma.txt` verlangten dort noch vollflächiges
  `#FF00FF` und behaupteten fälschlich eine saubere Freistellung ohne pinke Säume.
- Beide Quellen vollständig gelesen und überschreibfertig nach
  `CODEX/outbox/2026-08-23-newGPTAssets-native-alpha/` korrigiert. Alle fünf Batch-Blöcke verlangen
  nun natives transparentes PNG mit echtem Alpha; Magenta/Chroma und nachträgliches Freistellen
  erscheinen nur noch als Verbot. Alle 33 exakten Bild-IDs blieben erhalten.
- QA: pro Datei sechs Alpha-Pflichtblöcke, 33 `.png`-IDs, kein `#FF00FF`, keine alte Saum-
  Behauptung. Prüfsummen und Zielzuordnung stehen in `DEPLOYMENT.md`.
- Offener technischer Schritt: Die Sitzung besitzt nur Schreibzugriff unter `G:\GameDev` und konnte
  die zwei externen TXT-Ziele daher nicht überschreiben. Es sind ausschließlich die zwei
  bereitgestellten Textdateien zu kopieren; Bilder und Runtime-Dateien blieben unangetastet.

### Codex-Code-Marker

- `codex:2026-08-23T18:52:28+02:00` — Auditnachtrag, Deployment-Hinweis, HANDOFF und WORKLOG.

## Neuguss-Pilot für drei magenta-belastete Kreaturen 2026-08-23

<!-- codex:2026-08-23T20:47:23+02:00 -->

- Direkter Chef-Auftrag nach aktualisierter Ergebnisregel: eingebautes ImageGen mit flachem
  Rein-Grün als Quelle, danach lokales Despill, weiche Alpha-Matte und Kantenkorrektur.
- `ASSETS/neuguss-2026-08-23/LIESMICH.md` und Promptdatei 1 vollständig gelesen. Für die ersten
  drei Motive sämtliche sechs Referenzbilder im Original geprüft; Basisbilder bestimmten Palette,
  Pinselführung, Material, Beleuchtung und Familienidentität.
- Drei Zwischenabnahme-Dateien mit exakten IDs nach `ASSETS/neuguss-2026-08-23/fertig/` geliefert:
  `mire_wisp.png`, `elite_crypt_icemage.png`, `elite_high_wyvern.png`.
- `mire_wisp` erforderte randverbundenes statt globalem Grün-Keying, damit sein echtes blaugrünes
  Binnenmotiv erhalten bleibt. Eine aggressive Matte wurde nach pinker Kontrastprüfung verworfen.
- Finale QA je Datei: 1254×1254 RGBA, Alpha benutzt, transparente Ecken, Teilalpha vorhanden,
  null sichtbare Magenta-Pixel, null helles Rein-Grün und null grün-dominante Teilalpha-Kanten.
  Werte und Hashes: `CODEX/work/2026-08-23-neuguss-pilot/pilot-qa.json`.
- Keine Runtime-Datei ersetzt. Die übrigen elf Motive aus Datei 1 warten wie beauftragt auf die
  Zwischenabnahme des Chefs; Companion-Prompts unangetastet.

### Codex-Code-Marker

- `codex:2026-08-23T20:47:23+02:00` — Pilot-README, HANDOFF und WORKLOG; zugleich Nachweis für
  `pilot-qa.json` und die drei kommentarfreien PNG-Binärdateien.

## Neuguss Promptdatei 1 nach Chef-Zwischenabnahme 2026-08-23

<!-- codex:2026-08-23T21:24:26+02:00 -->

- Chefkorrektur umgesetzt: `mire_wisp.png` in der vom Chef wiederhergestellten weichen Fassung
  unangetastet gelassen; `elite_high_wyvern.png` referenzgebunden deutlich massiver und mit mehr
  Rückenstacheln neu geliefert.
- Neu nach `ASSETS/neuguss-2026-08-23/fertig/` geliefert: `elite_slag_revenant.png` und
  `elite_coast_crab.png`. Beide sind farbsichere harte Motive, wurden als Notweg mit motivfremdem
  Grün beziehungsweise Blau freigestellt, despillt und auf pinkem Kontrastgrund geprüft.
- Aktueller Lieferstand in `fertig/`: fünf exakte IDs, alle 1254×1254 RGBA, Alpha benutzt,
  transparente Ecken, Teilalpha vorhanden, null sichtbare Magenta- oder Key-Farbreste. Vollständige
  Werte und Hashes: `CODEX/work/2026-08-23-neuguss-prompt1/batch-qa.json`.
- Neun weitere referenzgebundene Motive wurden im eingebauten ImageGen erzeugt, kamen jedoch trotz
  wiederholtem RGBA-Pflichtblock nur als dreikanalige PNGs mit eingebranntem Schachbrett/Weiß zurück.
  Wegen Fell, Federn, Haaren, Leuchten, Nebel, Feuer, Kelp, Moos oder Geweih wurden sie gemäß direkter
  Chefregel nicht gekeyt und nicht ausgeliefert. Details und Rohbildpfade stehen im Arbeits-README.
- Keine Runtime-Datei und keine `.claude/**`-Datei verändert. Der Companion-Batch wurde nicht
  begonnen, solange der Neuguss technisch unvollständig ist.

### Codex-Code-Marker

- `codex:2026-08-23T21:24:26+02:00` — Arbeits-README, HANDOFF und WORKLOG; zugleich Nachweis für
  `batch-qa.json`, die zwei neuen Final-PNGs und den revidierten Wyvern.

## Neuguss und Companion-Serie vollständig 2026-08-24

<!-- codex:2026-08-24T12:35:04+02:00 -->

- Direkter Chef-Auftrag vollständig abgeschlossen: 17/17 Neugüsse unter
  `ASSETS/neuguss-2026-08-23/fertig/` und 21/21 Begleiter unter
  `ASSETS/companions-2026-08-23/fertig/`, jeweils mit Dateiname exakt gleich ID.
- Chefhinweis zu weißen Elementen bestätigt und behoben: Es waren eingeschlossene Felder des
  gemalten Weiß-/Hellgrau-Schachbretts. Die revidierte neutrale Matte entfernt nun auch nicht mit
  dem Bildrand verbundene Zwischenräume. Schwarz-, Grau- und Magenta-Kontaktbögen sind sauber.
- Alle 21 Begleiter kamen nativ als RGBA. Kein Companion wurde gekeyt; niedrig deckende farbige
  Render-Randpixel wurden aus benachbarten Motivfarben korrigiert. Finals sind 1024×1024, ihre
  längste sichtbare Achse misst 800 Pixel, alle Ecken Alpha 0.
- Neuguss-Finals sind 1254×1254 RGBA. Die freigegebenen Pilotdateien blieben erhalten;
  `elite_high_roc` wurde mit nativem Alpha übernommen, elf Schachbrett-Quellen nach direkter
  Ergebnisfreigabe neutral vermattet und auf drei Hintergründen geprüft.
- Gesamt-QA: 38 erwartete und 38 vorhandene PNGs, keine fehlenden oder unerwarteten Dateien und
  keine Maß-, RGBA-, Alpha- oder Eckenverletzung. Werte und SHA-256 stehen in
  `CODEX/work/2026-08-24-final-qa/final-asset-qa.json`.
- Produktionsprotokolle und Kontaktbögen:
  `CODEX/work/2026-08-24-neuguss-native/` und
  `CODEX/work/2026-08-24-companions-native/`.
- Keine Runtime-Datei und keine `.claude/**`-Datei verändert; beide `fertig/`-Ordner sind die
  Übergabe an Claude/Asset-Integration.

### Codex-Code-Marker

- `codex:2026-08-24T12:35:04+02:00` — Verarbeitungs-/QA-Skripte, Arbeits-READMEs, HANDOFF und
  WORKLOG; zugleich Nachweis für die 38 kommentarfreien PNG-Binärdateien und QA-JSONs.

## Companion-Neuguss als Karten- und Kampfserie 2026-08-24

<!-- codex:2026-08-24T14:25:00+02:00 -->

- Chefkorrektur ersetzt den oben dokumentierten ersten Companion-Batch vollständig: Alle 21
  Begleiter wurden als eigenständige Ashen-Iron-Fantasiewesen mit nicht natürlichem Körperbau neu
  entworfen. Die alte Serie war zu eng an reale Tiere angelehnt und gilt ausdrücklich als verworfen.
- Neue Lieferung umfasst 42 exakt benannte 1024×1024-RGBA-PNGs: je 21 Kartenmotive unter
  `ASSETS/companions-2026-08-23/fertig/card/<id>.png` und 21 zugehörige Kampfvarianten unter
  `ASSETS/companions-2026-08-23/fertig/fight/<id>.png`.
- Kartenmotive zeigen die vollständige Kreatur in ikonischer linker beziehungsweise neutraler
  Kartenpose. Kampfvarianten bewahren Anatomie, Material, Palette und Signaturdetails des Partners
  und sind nach rechts ausgerichtet; `carapace` wurde nach der Sichtprüfung eindeutig nach rechts
  gespiegelt.
- Natives Alpha der Karten wurde erhalten und an niedrig deckenden Rändern motivfarbenkorrigiert.
  Die referenzgebundenen Kampf-Rohbilder mit neutralem Weiß-/Hellgrau-Schachbrett wurden
  komponentenweise vermattet, einschließlich eingeschlossener Zwischenräume. Schwarz-, Grau- und
  Magenta-Kontaktbögen zeigen keine Schachfelder, weißen Rechtecke oder sichtbaren Farbsäume.
- Finale technische Abnahme bestanden: 42/42 Dateien vorhanden, exakte IDs in beiden Serien,
  1024×1024, vier Kanäle, verwendetes Voll- und Teilalpha, transparente Ecken und normalisierte
  Silhouetten. Werte und SHA-256: `CODEX/work/2026-08-24-companions-redesign/companion-pairs-final-qa.json`.
- Die 21 verworfenen PNGs wurden wiederherstellbar nach
  `CODEX/work/2026-08-24-companions-redesign/rejected-too-natural/` verschoben. Im Root von
  `fertig/` liegen keine alten PNGs mehr.
- Keine Runtime-, Save-, i18n- oder `.claude/**`-Datei verändert. Die Zweiserien-Namenskonvention
  ist eine Staging-Übergabe; die spätere Runtime-Zuordnung bleibt bei Claude/Asset-Integration.

### Codex-Code-Marker

- `codex:2026-08-24T13:30:00+02:00` bis `codex:2026-08-24T14:25:00+02:00` — Arbeits-README,
  ESM-Verarbeitungs-/QA-Ablauf, HANDOFF und WORKLOG; zugleich Nachweis für die 42 kommentarfreien
  PNG-Binärdateien, die sechs Kontaktbögen und das finale QA-JSON.

## Generische Patchnotes-Artworks 2026-08-24

<!-- codex:2026-08-24T15:10:00+02:00 -->

- Zwei dauerhaft versionsneutrale Grim-Reach-Patchnotes-Motive im Stil des 1.0-Release-Artworks
  fertiggestellt: `CODEX/AssetControl/patchnotes-generic/grim_reach_patchnotes_title_1920x622.png`
  und `CODEX/AssetControl/patchnotes-generic/grim_reach_patchnotes_main_capsule_800x450.png`.
- Das Motiv aus repariertem schwarzem Eisen, Hammer und versiegelter Notizrolle ist für Hotfixes,
  Patches und allgemeine Updates wiederverwendbar. Es enthält weder Versionsnummer noch Datum.
- Das offizielle Projektlogo und `PATCH NOTES` in Cinzel wurden deterministisch auf die textlose
  ImageGen-Quelle gesetzt. Die Plakette liegt vollständig unter dem Logo; keine rote Linie kreuzt
  die Beschriftung.
- Zielmaße und PNG-Format bestätigt; SHA-256-Werte stehen in
  `CODEX/AssetControl/patchnotes-generic/qa.json`. Prompt, Quelle und Zielgrößen-Vorschau liegen im
  selben Übergabeordner.
- Keine Runtime-, Produktdaten- oder `.claude/**`-Datei verändert; die Ausgabe bleibt im
  AssetControl-Staging bis zur Integration durch Claude.

### Codex-Code-Marker

- `codex:2026-08-24T15:10:00+02:00` — Render-Skript, Promptdokument, HANDOFF und WORKLOG;
  zugleich Nachweis für die drei kommentarfreien PNG-Binärdateien und `qa.json`.

## Runen Tier IV und Schmuck-Linie 2026-08-25

<!-- codex:2026-08-25T11:52:00+02:00 -->

- 14 neue Verzauberungsrunen vollständig nach `CODEX/assets/runen-tier-iv-2026-08-25/` geliefert.
  Finals liegen unter `fertig/`, unveränderte Generatorausgaben unter `raw/` und Prüfbelege unter
  `qa/`. Dateiname entspricht bei jeder Datei exakt der Content-ID.
- Fünf Waffenrunen nutzen Glut-Gold, vier Rüstungsrunen Eis-Blau und fünf Schmuckrunen Violett.
  Alle neun Waffen- und Rüstungsrunen tragen die IV. Die Schmucklinie besitzt keine Ziffer.
- Alle Rohbilder besitzen natives Generator-Alpha. Finals wurden nur beschnitten, skaliert und auf
  transparentem 1024er-Canvas zentriert. Kein Keying und keine nachträgliche Freistellung.
- Finale QA bestanden: 14 von 14 Dateien, 1024 × 1024 PNG sRGB RGBA, äußere 32 px Alpha 0,
  Teilalpha vorhanden, Steinkörper 80 bis 88 % hoch, keine fehlenden oder unerwarteten IDs.
- Kontaktbögen auf Schwarz, Grau und Grellrosa sowie 64-/96-px- und Tier-III-Vergleich liegen in
  `CODEX/assets/runen-tier-iv-2026-08-25/qa/`. Vollständige Werte und SHA-256 stehen in `qa.json`.
- Zwei Gericht- und vier Waffenfassungen mit gemaltem Schachbrett wurden technisch verworfen und
  ausschließlich unter `CODEX/work/2026-08-25-runen-tier-iv/rejected-alpha/` quarantänisiert.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert. Nächster Owner ist
  `asset-integrator`, danach `kontrolleur`.

### Codex-Code-Marker

- `codex:2026-08-25T10:30:00+02:00` bis `codex:2026-08-25T11:52:00+02:00` — Brief,
  Aufbereitungs- und QA-Skript, Asset-README, HANDOFF und WORKLOG. Die Marker dokumentieren zugleich
  die 28 kommentarfreien PNG-Lieferdateien, fünf QA-PNGs und das kommentarfreie `qa.json`.

### Chef-Abnahme

<!-- codex:2026-08-25T11:00:35+02:00 -->

- Chef-Abnahme am 2026-08-25: 14 von 14 Runen angenommen, keine Korrekturen.
- Gegenprüfung bestätigt RGBA 1024², vollständig transparenten Außenrand, Steinkörper mit 84 bis
  90 % Höhe, keine Schachbrettsignale in opaken Zonen, exakte IDs und lesbare Glyphen.
- Stilprüfung neben Tier III bestanden. Waffen-, Rüstungs- und Schmucklinie sind sauber getrennt.
- Produktive Integration läuft separat durch den zuständigen Agenten. Geplant sind WebP mit 640 px,
  Ablage im Renderer und Archivierung der Originale. Mira hat diese Integrationspfade nicht berührt.

## Achievement-Kategorie-Embleme 2026-08-25

<!-- codex:2026-08-25T20:55:00+02:00 -->

- Zehn neue handgemalte Kategorie-Embleme und der optionale neue Meilenstein vollständig nach
  `CODEX/assets/achievement-icons-2026-08-25/` geliefert. Finals liegen unter `fertig/`,
  unveränderte Generatorausgaben unter `raw/` und Prüfbelege unter `qa/`.
- Jede Rohdatei wurde mit dem eingebauten ImageGen-Werkzeug im Standardmodus als natives
  1254 × 1254-RGBA-PNG erzeugt. Es wurden keine Bildreferenzen in die Erzeugung eingespeist.
  Die finalen 512er bewahren dieses Alpha und wurden nur transparent beschnitten, proportional
  skaliert und zentriert. Kein Keying, keine Matte und kein nachträgliches Freistellen.
- Finale technische QA bestanden: 10 von 10 Pflicht-IDs plus genau `icon_ach_milestone`, alle
  512 × 512 PNG sRGB RGBA, benutztes Voll- und Teilalpha, äußerer 16-px-Rand vollständig Alpha 0,
  opake Motivhöhe 434 bis 435 px, keine fehlenden oder unerwarteten Dateien.
- Der exakte `qa/contact-sheet-ring-28-46.png` zeigt alle zehn Kategorien bei 28 px in den fünf
  Rarity-Ringen und in der gesperrten Reihe. Schwarz-, Grau- und Grellrosa-Bögen zeigen keine
  Schachbrettflächen oder Farbsäume. Der Kleinformatbogen deckt 24 und 50 px sowie die 12-px-
  Farm-Ähre und den Meilenstein bei 12 und 20 px ab.
- Amboss und Truhe wurden nach dem ersten Maßlauf neu erzeugt, weil ihre breiten Rohsilhouetten die
  Mindesthöhe verfehlten. Die angenommenen Fassungen erreichen jeweils 435 px Motivhöhe ohne
  unproportionale Dehnung.
- `icon_achievments` und `icon_achievement_unlocked` wurden bewusst nicht neu erzeugt. Beide
  Bestandsassets sind bereits gemalt und erfüllen ihre reichere Kopf- beziehungsweise Statusrolle.
  Der bislang flache Meilenstein wurde ersetzt.
- Vollständige Messwerte und SHA-256 stehen in
  `CODEX/assets/achievement-icons-2026-08-25/qa/qa.json`. Brief Teil B und C sind ausgefüllt;
  Teil D enthält Miras Produktions-GO und wartet auf die bindende Gegenprüfung.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert. Nächster Owner ist
  `asset-integrator`, danach `ui-dev` für die Sichtprüfung auf der laufenden Seite.

### Codex-Code-Marker

- `codex:2026-08-25T20:18:00+02:00` bis `codex:2026-08-25T20:55:00+02:00` —
  Aufbereitungs-/QA-Skript, Asset-README, Brief, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich die 22 kommentarfreien PNG-Lieferdateien, sieben QA-PNGs und das kommentarfreie
  `qa.json`.

## Jägerumhang für den Slayer-Shop 2026-08-25

<!-- codex:2026-08-25T21:34:00+02:00 -->

- Finales Itembild `slayer_hunters_cape.png` nach
  `CODEX/assets/slayer-jaegerumhang-2026-08-25/fertig/` geliefert. Die Datei ist exakt nach der
  Content-ID benannt und für Grim Reach 1.1.0, Slayer-Shop Phase 2 vorgesehen.
- Zwei technisch saubere native Alpha-Varianten wurden erzeugt. Variante A wurde gewählt, weil
  ihre breitere Silhouette, grüne Umschlagkante und Reißzahn-Schließe bei 48 px klarer lesen.
  Variante B bleibt als unveränderte Wahlquelle unter `raw/`.
- Beide gültigen Rohdateien sind 1254 × 1254 RGBA mit Alpha 0 bis 255. Das Final ist 1024 × 1024
  sRGB RGBA, opake Motivhöhe 880 px, äußerer 16-px-Rand vollständig transparent.
- Die Aufbereitung beschränkte sich auf transparenten Zuschnitt, proportionale Skalierung und
  bottom-center-Zentrierung. Kein Keying, keine Matte, kein Despill und kein nachträgliches
  Freistellen. Ein früher Entwurf mit halbtransparenter brauner Studiofläche wurde am Alpha-Gate
  verworfen und nicht in die Lieferung übernommen.
- Kontaktbögen auf Schwarz, Grau und Grellrosa, der Vergleich neben fünf Bestandsumhängen,
  48-/96-/128-px-Ansichten und der Abgleich mit Slayer-Ausrüstung und Brenna liegen unter `qa/`.
  Variante A bleibt sichtbar unter der helleren, bestickten Wertigkeit von `mariner_cloak`.
- Vollständige Messwerte und SHA-256 stehen in
  `CODEX/assets/slayer-jaegerumhang-2026-08-25/qa/qa.json`. Alle automatischen Gates sind `true`.
- Brief Teil B bis D, Asset-README und WORKLOG sind aktualisiert. Keine Renderer-, Content-,
  Save-, i18n- oder `.claude/**`-Datei wurde verändert. Nächster Owner ist `asset-integrator`;
  bindende Abnahme bleibt bei Claude und Chef.

### Codex-Code-Marker

- `codex:2026-08-25T21:18:00+02:00` bis `codex:2026-08-25T21:34:00+02:00` —
  Aufbereitungs-/QA-Skript, Asset-README, Brief, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich drei kommentarfreie Liefer-PNGs, acht QA-PNGs und das kommentarfreie `qa.json`.

## Belohnungsladen-Kapitelitems 2026-08-26

<!-- codex:2026-08-26T10:26:05+02:00 -->

- Sieben neue Kapitel-Belohnungen vollständig nach
  `CODEX/assets/belohnungsladen-2026-08-26/` geliefert. Finals liegen unter `fertig/`, die sieben
  angenommenen Generatorausgaben unter `raw/` und die Prüfbelege unter `qa/`.
- Enthalten sind zwei Ringe, zwei Amulette, ein Umhang, das reichere Chronisten-Signet und eine
  stapelbare Auftragsmarke. Alle Dateien sind exakt nach den Content-IDs benannt.
- Erzeugung mit eingebautem ImageGen im Standardmodus und nativem Alpha. Die Aufbereitung bewahrt
  das Alpha und beschränkt sich auf transparenten Zuschnitt, proportionale Skalierung und
  Bottom-Center-Platzierung. Kein Keying, keine Matte, kein Despill oder Freistellen.
- Finale technische QA bestanden: 7/7 PNG sRGB RGBA mit 1024 × 1024, äußerer 16-px-Rand vollständig
  transparent, Motivkörper 869 bis 870 px hoch, keine fehlenden oder unerwarteten IDs.
- Kontaktbögen auf Schwarz, Grau und Grellrosa, neben typgleichen Bestandsitems und bei 48/96/128 px
  liegen unter `qa/`; Einzelwerte und SHA-256 stehen in `qa/qa.json`.
- Verworfen wurden Fassungen mit knappem Rand, gemaltem Schachbrett, Studiovignette oder zu
  leuchtendem Ascheriss. Sie wurden nicht in die Lieferung übernommen.
- Brief Teil B bis D und Asset-README sind ausgefüllt. Keine Renderer-, Content-, Save-, i18n-
  oder `.claude/**`-Datei verändert. Nächster Owner ist `asset-integrator`; bindende Abnahme durch
  Claude und Chef steht aus.

### Codex-Code-Marker

- `codex:2026-08-26T10:23:25+02:00` bis `codex:2026-08-26T10:26:05+02:00` —
  Aufbereitungs-/QA-Skript, Asset-README, Brief, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich 14 kommentarfreie Liefer-PNGs, sieben QA-PNGs und das kommentarfreie `qa.json`.

## Stil-Parität: 47 Item-Bilder 2026-08-26

<!-- codex:2026-08-26T14:18:00+02:00 -->

- Vollständige Lieferung unter `CODEX/assets/stil-paritaet-2026-08-26/`: 47 angenommene native
  Alpha-Raws, 47 produktionsfertige Finals und 32 QA-Dateien.
- Enthalten sind 10 Bögen, 6 Magiewaffen, 2 Foki, 11 Lederteile, 16 Stoffteile und 2 Tonika.
  Alle Finals heißen exakt wie ihre Content-ID und liegen als 1024 × 1024 PNG unter `fertig/`.
- Erzeugung mit eingebautem ImageGen im Standardmodus. Kein Keying, keine Matte, kein Despill
  oder Freistellen. Finals bewahren das native Alpha und wurden nur transparent beschnitten,
  proportional skaliert und unten mittig platziert.
- Technische Endprüfung bestanden: 47/47 sRGB-RGBA, Alpha 0 bis 255, äußerer 16-px-Rand
  vollständig transparent, sichtbare Motivhöhe 850 bis 880 px, keine fehlenden oder zusätzlichen
  IDs. Einzelwerte und SHA-256 stehen in `qa/qa.json`.
- Nach Chef-Hinweis wurde die komplette A1-Serie neu gegossen. Die angenommenen Bögen haben
  durchgehende belastbare Wurfarme, klare Nocken und je eine gerade gespannte Sehne; der
  Bestandsvergleich und die Grellrosa-Kantenprüfung liegen unter `qa/`.
- Drei breite A4-Paarfassungen wurden für den Höhenkorridor kompakter neu erzeugt. Die fertige
  Stoffserie ist bei 48/96/175 px geprüft und bleibt frei von Glühen und Partikeln.
- Je Gruppe liegen vier Hintergrundbögen, ein Bestandsvergleich und eine UI-Größenprobe vor.
  Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert.
- Nächster Owner: Claude für Gegenprüfung, danach `asset-integrator` für WebP-Konvertierung und
  Renderer-Ablage. `CODEX/assets/**` bleibt bis dahin reines Staging.

### Codex-Code-Marker

- `codex:2026-08-26T13:40:00+02:00` bis `codex:2026-08-26T14:18:00+02:00` —
  Aufbereitungs-/QA-Skript, Asset-README, Brief, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich die kommentarfreien 94 Liefer-PNGs, 31 QA-PNGs und `qa/qa.json`.

## Item-Wiki-Modal: fünf Redesign-Richtungen 2026-08-26

<!-- codex:2026-08-26T14:48:00+02:00 -->

- Fünf eigenständige High-Fidelity-Mockups nach Chef-Auftrag unter
  `CODEX/assets/wiki-modal-mockups-2026-08-26/` geliefert; gemeinsamer Vergleichsbogen inklusive.
- Bestehender Screenshot wurde nur als Stil- und Inhaltsreferenz genutzt. Kein Renderer-, React-,
  CSS-, i18n- oder Engine-Code verändert.
- Richtungen: Codex Ledger, Forge Flow, Archiv-Schubladen, Blacksteel Index und Relic Showcase.
  Alle bewahren Gravewood-&-Bronze/Ashen-Iron, ordnen Item, Quelle und Verwendungen aber
  strukturell neu.
- Miras Empfehlung ist Variante 3 als Umsetzungsbasis; Variante 4 ist die Alternative für
  maximale Datendichte. Bindende Richtungswahl bleibt beim Chef.
- Brief, Referenzkopie und vollständiges Promptset liegen unter
  `CODEX/work/2026-08-26-wiki-modal-mockups/`. Erzeugung erfolgte mit eingebautem ImageGen im
  Standardmodus.
- Nächster Owner nach Chefwahl: `ui-dev` für eine HTML/CSS-Annäherung im Renderer und anschließende
  headless Typecheck-/Build-Prüfung.

### Codex-Code-Marker

- `codex:2026-08-26T14:32:00+02:00` bis `codex:2026-08-26T14:48:00+02:00` — Brief, Promptset,
  Asset-README, HANDOFF und WORKLOG; zugleich Dokumentation der sechs kommentarfreien Mockup-PNGs.

## Item-Wiki: interaktive HTML-Prototypen 02 und 05 2026-08-26

<!-- codex:2026-08-26T15:24:00+02:00 -->

- Nach direkter Chef-Auswahl die Bildrichtungen 02 `Forge Flow` und 05 `Relic Showcase` als
  eigenständige HTML/CSS/JS-Prototypen unter
  `CODEX/outbox/2026-08-26-wiki-modal-html/` umgesetzt.
- `index.html` schaltet zwischen beiden Seiten um und bietet einen Vollbildlink. Die Einzeldateien
  sind `02-forge-flow.html` und `05-relic-showcase.html`.
- Beide Konzepte behandeln Quellen als beliebig lange Sammlung. Vier Herkunftsarten dienen als
  interaktive Layoutbeispiele; Auswahl aktualisiert Chance, Typ und Detailband. Diese Namen und
  Chancen sind ausdrücklich keine neuen Content-/Lore-Entscheidungen.
- Konzept 02 ergänzt Used-for-Filter für Waffen/Rüstung und einen Quelle→Item→Verwendung-Detailfluss.
  Konzept 05 ergänzt ein Mehrquellen-Band, horizontale Verwendungsgalerie und Auswahl-Detailpanel.
- 29 lokale Kopien bestehender Grim-Reach-Items, Icons, Texturen und Fonts liegen in `assets/`,
  damit der Prototyp ohne Renderer-Abhängigkeit geöffnet werden kann. Keine Quelldatei verändert.
- Statische QA bestanden: alle Links/Assets vorhanden, JS-Syntax gültig, CSS-Blockstruktur gültig.
  Automatischer Browser-/Screenshotlauf war nicht möglich, weil in dieser Sitzung kein Browser-
  Backend verfügbar war; vor Runtime-Übernahme offen nachholen.
- Keine Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.
  Nächster Owner nach Chefentscheid: `ui-dev` für die echte Komponenten-/i18n-Umsetzung.

### Codex-Code-Marker

- `codex:2026-08-26T15:12:00+02:00` bis `codex:2026-08-26T15:24:00+02:00` — beide HTML-Seiten,
  gemeinsame Styles/Interaktionen, README, QA, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich die 29 kommentarfreien lokalen Assetkopien.

## Main-Menü und Item-Stack — je fünf Design-Mockups 2026-08-26

<!-- codex:2026-08-26T16:03:00+02:00 -->

- Direkten Chefauftrag als zehn reine Designstudien umgesetzt: fünf Main-Menüs und fünf
  Item-Stack-Modals. Jede Nummer bildet eine zusammengehörige Designfamilie.
- Lieferung unter `CODEX/assets/mainmenu-itemstack-mockups-2026-08-26/`; Einzelbilder liegen in
  `main-menu/` und `item-stack/`, drei nummerierte Kontaktbögen in `qa/`.
- Designfamilien: `Ashen Gate`, `War Table`, `Black Chronicle`, `Frontline Registry`,
  `Ember Reliquary`.
- Alle zehn PNGs sind 1672 × 941 px und visuell geprüft. Main-Menüs enthalten die Kernaktionen;
  Stack-Modals zeigen mehrere Varianten zugleich und demonstrieren unterschiedliche
  Skalierungsmodelle.
- Fachliche Empfehlung: Main-Menü 02 oder 05; Stack-Modal 02 als beste Balance, 04 bei maximaler
  Datendichte. Finale Produktentscheidung bleibt beim Chef.
- Brief, Referenzen und vollständige Prompts liegen unter
  `CODEX/work/2026-08-26-mainmenu-itemstack-mockups/`.
- Erzeugungsweg: eingebautes ImageGen-Werkzeug im Standardmodus. Keine HTML-, Renderer-, React-,
  CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

### Codex-Marker

- `codex:2026-08-26T15:48:00+02:00` — Brief und Prompt-Set.
- `codex:2026-08-26T16:03:00+02:00` — Staging-README, HANDOFF und WORKLOG; dokumentiert zugleich
  die zehn PNG-Mockups und drei kommentarfreien Kontaktbögen.

## Ausgewählte Main-Menüs und Item-Stack als HTML-Prototypen 2026-08-26

<!-- codex:2026-08-26T16:42:00+02:00 -->

- Nach direkter Chef-Auswahl vier eigenständige Standalone-Prototypen unter
  `CODEX/outbox/2026-08-26-mainmenu-itemstack-html/` umgesetzt: Main-Menü 01 `Ashen Gate`,
  Main-Menü 02 `War Table`, Main-Menü 04 `Frontline Registry` und Item-Stack 02 `War Table`.
- `index.html` dient als gemeinsame Auswahlseite und verwendet die abgenommenen Konzeptbilder als
  Vorschau. Jede Detailseite verlinkt zurück.
- Der Item-Stack besitzt eine funktionale Variantenwahl mit live aktualisiertem Vergleich,
  Qualitätsbalken, Verkaufspreis und Filter-/Sortierzuständen. Die Main-Menüs demonstrieren
  Sprachwahl und Aktionsfeedback.
- 24 lokale Kopien bestehender Grim-Reach-Assets liegen in `assets/`. Nach Chefkorrektur wurden
  zusätzlich ein echtes RGBA-Gate und ein deckender War-Table-Hintergrund erzeugt und eingebaut.
  Produktionsquellen blieben unverändert.
- Statische QA bestanden: alle HTML- und CSS-Referenzen vorhanden, JS-Syntax gültig,
  CSS-Klammerbilanz ausgeglichen. Browser-/Screenshotprüfung blieb offen, weil das Browser-Plugin
  nach vorgesehener Initialisierung und Diagnose kein verfügbares Backend meldete.
- Keine React-, Renderer-, CSS-Produktions-, i18n-, Engine-, Content- oder `.claude/**`-Datei
  verändert. Nächster Owner nach Chefentscheidung: `ui-dev` für die echte Integration.

### Codex-Code-Marker

- `codex:2026-08-26T16:18:00+02:00` bis `codex:2026-08-26T16:42:00+02:00` — Brief,
  HTML-Seiten, gemeinsame Styles/Interaktionen, README, QA, HANDOFF und WORKLOG. Die Marker
  dokumentieren zugleich die 24 kommentarfreien lokalen Assetkopien.

### Chefkorrektur: echte Großmotive

<!-- codex:2026-08-26T17:08:00+02:00 -->

- Chef beanstandete zu Recht, dass Main 01 das Gate nur per CSS andeutete und Main 02 keinen
  physischen War Table besaß.
- `assets/ashen-gate-overlay-v1.png` als vollständiges monumentales RGBA-Foreground-Asset
  erzeugt und in Main 01 eingebaut. Alpha gemessen: 0 bis 255, keine deckende Hintergrundfläche.
- `assets/mainmenu-war-table-background-v1.png` als deckende, nahtlose Panorama-/Tischkomposition
  erzeugt und in Main 02 eingebaut.
- Zwei vorherige War-Table-Freistellversuche wurden wegen gemaltem Schachbrett und fehlendem Alpha
  verworfen. Kein Keying; finale Lösung ist ein bewusst deckender Szenenhintergrund.
- Kompositions-QA mit Originalpanorama und Logo liegt in `qa/`. Vollständiges Promptprotokoll:
  `CODEX/work/2026-08-26-mainmenu-itemstack-html/PROMPTS.md`.
- Keine Produktivdatei verändert.

### Chefkorrektur: Item-Stack erhält ebenfalls ein echtes War-Table-Motiv

<!-- codex:2026-08-26T17:24:00+02:00 -->

- Auf direkte Chefkorrektur `assets/itemstack-war-table-shell-v1.png` erzeugt und als tragende
  Hintergrundschale des Item-Stack-Modals eingebaut.
- Die Schale enthält echten dunklen Kartentisch, Lederflächen, Eisenschienen, Kartengravur,
  Kompass-/Siegelmotive und drei vorbereitete Arbeitszonen. Sie enthält bewusst keine statischen
  Texte oder Items; Auswahl, Werte und Buttons bleiben funktionales HTML.
- Desktop-CSS auf die feste Bildarchitektur ausgerichtet; unter 1250 px kontrollierter Rückfall auf
  die skalierbaren bestehenden Gravewood-Rahmen.
- RGB 1672 × 941 geprüft und mit den echten Mithril-Helmen als Platzierungs-QA kontrolliert.
- Keine Produktivdatei verändert.

## Main-Menü-Unterseiten: je fünf Design-Mockups 2026-08-26

<!-- codex:2026-08-26T18:52:00+02:00 -->

- Direkten Chefauftrag als 15 reine Designstudien umgesetzt: je fünf Entwürfe für `New Game`,
  `Load Game` und `Character Creation`; ausdrücklich noch kein HTML.
- Die fünf screenübergreifenden Familien sind `Ashen Gate`, `War Table`, `Frontline Registry`,
  `Black Chronicle` und `Ember Reliquary`. Jede Familie überträgt dieselbe räumliche Metapher auf
  alle drei Unterseiten, statt nur drei isolierte Screens zu liefern.
- Lieferung unter `CODEX/assets/mainmenu-submenus-mockups-2026-08-26/`. Einzelbilder liegen in
  `new-game/`, `load-game/` und `character-creation/`; vier Kontaktbögen liegen unter `qa/`.
- Alle 15 PNGs sind 1672 × 941 px, RGB und visuell geprüft. New Game enthält fünf leere Slots,
  Load Game drei belegte plus zwei leere Slots, Character Creation Name, Porträts, drei Startstile
  und Abschlussaktion.
- Fachliche Einordnung: 01 ist die stärkste filmische Gesamtrichtung, 02 der konsequenteste
  Anschluss an das favorisierte War-Table-Hauptmenü, 03 die robusteste responsive Datenstruktur.
  Die bindende Auswahl bleibt beim Chef.
- Erzeugung mit eingebautem ImageGen im Standardmodus. Brief, Referenzen, Promptset und
  reproduzierbare Staging-/Kontaktbogen-Skripte liegen unter
  `CODEX/work/2026-08-26-mainmenu-submenus-mockups/`.
- Keine HTML-, Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

### Codex-Code-Marker

- `codex:2026-08-26T18:20:00+02:00` bis `codex:2026-08-26T18:52:00+02:00` — Arbeitsbrief,
  Promptset, Staging-/QA-Skripte, Asset-README, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich die 15 kommentarfreien Mockup-PNGs und vier Kontaktbögen.

## Ausgewählte Untermenüs als HTML-Prototypen 2026-08-26

<!-- codex:2026-08-26T19:36:00+02:00 -->

- Chef-Auswahl umgesetzt: Character Creation 03 `Frontline Registry`, Load Game 05
  `Ember Reliquary` und passend dazu New Game 05 `Ember Reliquary`.
- Standalone-Lieferung unter `CODEX/outbox/2026-08-26-mainmenu-submenus-html/` mit gemeinsamer
  Auswahlseite und drei eigenständigen HTML-Dateien.
- New Game besitzt fünf anwählbare Slots und führt in die gewählte Registry. Load Game besitzt
  drei belegte plus zwei leere Slots, vollständig wechselnde Dossierdaten und einen
  nicht-destruktiven Delete-Dialog. Character Creation synchronisiert Name, Porträt, Startstil,
  Schrittleiste und Abschlussaktion.
- Für New/Load wurde eine textfreie deckende Ember-Reliquary-Landschaft mit eingebautem ImageGen im
  Standardmodus erzeugt. Ein neuer Heldenfreisteller fiel am Alpha-Gate durch, weil das
  Schachbrett gemalt war; kein Keying. Der Prototyp verwendet stattdessen den bestehenden echten
  RGBA-Helden `knight_m.webp` als lokale Kopie.
- Statische QA bestanden: alle lokalen Referenzen vorhanden, JS-Syntax gültig, CSS-Bilanz 0,
  Szenenplatte 1672 × 941 RGB, Held 1086 × 1448 RGBA mit Alpha 0 bis 255.
- Browser-Live-QA blieb offen, weil die initialisierte Browser-Laufzeit keine verfügbare Instanz
  meldete. Dieser Blocker ist in `QA.md` dokumentiert; keine alternative Browserautomation wurde
  eingesetzt.
- Keine Renderer-, React-, produktive CSS-, i18n-, Engine-, Content-, Save- oder `.claude/**`-
  Datei verändert.

### Codex-Code-Marker

- `codex:2026-08-26T19:08:00+02:00` bis `codex:2026-08-26T19:36:00+02:00` — Brief,
  Promptprotokoll, Assetvorbereitung, vier HTML-Dateien, CSS, Interaktionen, README, QA, HANDOFF und
  WORKLOG. Die Marker dokumentieren zugleich die kommentarfreien lokalen Assetkopien und die neue
  deckende Szenenplatte.

## 2026-08-26 — Human-Roster-Workflow und Sechser-Pilot

<!-- codex:2026-08-26T20:52:00+02:00 -->

- Chefentscheid in einen gesperrten Vertrag für 15 Kampfklassen, 15 Berufe und 60 eigenständige
  Human-Identitäten übertragen: `CODEX/work/2026-08-26-human-roster/`.
- Neue harte Paarregel übernommen: männliche und weibliche Variante tragen dieselbe sichtbare
  Waffen-/Werkzeugfamilie und gleiche Anzahl Hauptgeräte; Kleidung darf geschlechtsspezifisch
  variieren und bei Frauen moderat offener sein, bleibt aber funktional.
- Neue harte Richtungsregel übernommen: Körper, Gesicht, Nase und Blick zeigen immer nach
  Bildschirm-rechts.
- Pilot mit Krieger, Feuermagier und Schurke, jeweils männlich/weiblich, unter
  `CODEX/assets/human-character-roster-2026-08-26/fertig/` abgeliefert.
- Alle sechs Finals messen 1086 × 1448 RGBA, Alpha 0–255 und 85,9–87,4 % sichtbare Höhe. Heller
  und dunkler Kontaktbogen sowie Einzelmessungen liegen unter `qa/`.
- Eingebautes ImageGen im Standardmodus verwendet. Ein erster referenzgebundener RGB-Durchlauf
  wurde vollständig verworfen; kein Keying oder nachträgliches Freistellen. Die akzeptierten
  Motive besitzen natives Alpha aus der Erzeugung.
- Nur Staging und Dokumentation geändert; nichts in Renderer, Content, Save, Engine oder
  `.claude/**` integriert. Die übrigen 54 Figuren folgen nach Richtungsabnahme im gleichen Vertrag.

### Codex-Code-Marker

- `codex:2026-08-26T20:44:00+02:00` bis `codex:2026-08-26T20:52:00+02:00` — aktualisierter
  Produktionsvertrag, Identitätsmatrix, Promptset, Kontaktbogen-Skript, Staging-README, QA,
  HANDOFF und WORKLOG. Kommentarlose PNGs sind über diese Einträge mit ihren exakten Zielpfaden
  dokumentiert.

## 2026-08-26 — Buckhide-Set und Jagdbogen, 6/6

<!-- codex:2026-08-26T21:32:00+02:00 -->

- Sechs fehlende frühe Fernkampf-Items unter
  `CODEX/assets/buckhide-set-2026-08-26/fertig/` abgeliefert: `buckhide_helm`, `buckhide_body`,
  `buckhide_legs`, `buckhide_vambraces`, `buckhide_boots`, `hunting_bow`.
- Alle Finals sind exakt 1024 × 1024 PNG RGBA mit Alpha 0–255, transparentem Außenrand und
  slotweise an den Bestandsreferenzen gemessener Canvasbelegung.
- Materialserie: raues dunkel rauchbraunes Hirschleder, kurze graubraune Fellkanten, matte
  Hornknebel, Handnähte; sichtbar einfacher als `cured_leather_*`, ohne Magieeffekte.
- Jagdbogen auf Funktion geprüft: ein durchgehender Eschenholzstab, zwei Nocken, eine gerade
  Sehne und gleichmäßige C-Kurve. Höhe 88,7 % gegenüber 88,5 % bei `bronze_shortbow`.
- Eingebautes ImageGen im Standardmodus verwendet. Ein erster Beinling-Durchlauf mit deckender
  brauner Fläche wurde verworfen; der gelieferte Neuguss besitzt natives Alpha. Kein Keying und
  keine nachträgliche Freistellung.
- QA auf dunklem, hellem und grellrosa Grund, im 48-px-Maßstab und neben Wams-/Bogenreferenz
  bestanden. Details: `CODEX/assets/buckhide-set-2026-08-26/qa/QA.md`.
- Native akzeptierte Ausgaben liegen in `raw/`; verwendete Prompts in
  `CODEX/work/2026-08-26-buckhide-set/PROMPTS-USED.md`.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert. Claude übernimmt
  WebP-Konvertierung, Produktionsablage und Archivierung nach Gegenprüfung.

### Codex-Code-Marker

- `codex:2026-08-26T21:05:00+02:00` bis `codex:2026-08-26T21:32:00+02:00` — Produktionsplan,
  Promptprotokoll, QA-Skript, Brief-Abnahme, Staging-README, QA, HANDOFF und WORKLOG. Die
  kommentarfreien PNGs sind hier über ihre exakten Zielpfade dokumentiert.
