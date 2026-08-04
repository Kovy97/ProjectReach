# Aktueller Snapshot

**Erfasst:** 2026-07-31  
**Wichtig:** Dieser Stand ist zeitgebunden. Bei jedem neuen Auftrag zuerst gegen Code, neueste Dateien in `design/` und aktuelle Claude-Anweisungen prüfen.

## Produktstand

- Produktname: **Grim Reach**
- Client-Paketversion im Repository: **0.2.2**
- Aktive Zielsetzung: **0.3.0 „New Haven“**
- Bindende Quelle: `design/0.3.0-zielsetzung.md`
- In der Zielsetzung gesetzter Feature-Freeze: **2026-07-30, 20:00**
- Geplanter Depot-/Sichtbarkeits-Zeitraum laut Zielsetzung: **2026-08-02 bis 2026-08-03**

## New Haven

Chef-GO zur Runtime-Verdrahtung: **2026-07-30**. Der produktive Ordner
`apps/client/src/renderer/assets/camp/` enthält nun den vollständigen Bestand:

- 15 Gebäude × 3 sichtbare Ausbaustufen × Tag/Nacht
- Kartenuntergrund Tag/Nacht
- Leerplatz, Baustelle und Gerüst jeweils Tag/Nacht
- insgesamt 98 WebP-Assets; Runtime-Sprites 640 × 640 px, Karten 1672 × 941 px
- kosmetischer lokaler Tag-/Nachtzyklus 07:00–18:59, ohne Save- oder Engineänderung
- Stage-I-Vorschau im Baumenü und Leerplatzgrafik als Placement-Ghost
- sichere Nacht-zu-Tag-Fallbacks in den Camp-Art-Resolvern

Chef-Entscheid und Runtime-Pass vom **2026-07-31**:

- keine festen Slots oder Bauzonen mehr; Gebäude sind auf der gesamten Karte frei platzierbar
- nur vollständiger Kartenrand und Gebäudeüberschneidung begrenzen die Position
- Rathauskapazität für andere Gebäude: 4 / 9 / 14 auf Stufe I / II / III
- flüchtiger Kostenlos-Debugschalter neben der Listenansicht; alle übrigen Bau-Gates bleiben aktiv
- Map und Liste verwenden dieselben vollständigen Gold-/Materialkosten und Engine-Prädikate
- alter Introblock entfernt; Map und Listenbereich nutzen die verfügbare Seitenhöhe mit internem Scrollen
- Positionen bleiben prozentual gespeichert; die gemeinsame Bühne ist Town-Hall-groß und auf der
  16:9-Karte pixelquadratisch. Gebäudefamilien/Stufen besitzen kuratierte visuelle Skalierungen.
- separater Debug-Sofortabschluss beendet nur einen laufenden Bau über den regulären Engine-Weg
- Gebäude-Popups besitzen einen einzigen kräftigen Außenrahmen, intern scrollende Funktionsbereiche
  und keine doppelt geschachtelten Card-/Bildrahmen mehr
- bindender Teilentscheid: `design/newhaven-freie-platzierung-entscheid-2026-07-31.md`
- Voränderungsstand: `CODEX/outbox/2026-07-31-new-haven-freebuild-prechange/`

## Skill-Action-Cards

- Chef-Freigabe für **Layout 01 Fixed Dock** am 2026-07-31
- alle Skill-Action-Cards verwenden einen festen 720-px-Zonenvertrag
- Hero, 2×2-Stats, Output/Loot, vier Ressourcenplätze, Status, Mengenwahl und Mastery bleiben positionsstabil
- STOP, Craftable und Locked ersetzen dieselbe reservierte Statusplatte
- Suffix-Chancen werden nicht mehr auf Items/Produces projiziert; die zugrunde liegende Engine-
  Itemlogik wurde nicht verändert
- Produces- und Mastery-Zone besitzen einen vollständigen, zum restlichen Card-Raster passenden Frame
- Kontrolltafel: `CODEX/AssetControl/ActionCardConcepts-2026-07-31/index.html`
- Voränderungsstand: `CODEX/outbox/2026-07-31-action-card-layout01-prechange/`

## Rahmenauswahl

- der fehlerhafte erste Pass ist als verworfen markiert und zusätzlich unter
  `CODEX/AssetControl/archive/FrameSelection-2026-07-31-rejected-broken/` archiviert
- fünf technisch neue 192-px-9-Slice-Kandidaten liegen unter
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/`
- Chef-Auswahl: **01 Ironwood Bastion**
- Ironwood Bastion ersetzt produktiv die zentrale `wooden_frame_with_corners.webp`; die Runtime-
  Fassung ist auf 224×149 px und den bestehenden 28-px-Slice-Vertrag normalisiert
- Live-QA-Korrektur: Integrierte L-Knoten ersetzen die optisch losgelösten Eckplaketten. Alle
  Eckornamente wohnen vollständig in den vier 28-px-Runtime-Ecken; horizontale und vertikale Kanten
  enthalten ausschließlich ruhige stretchbare Schienen
- dadurch verwenden Sidebar, Topbar und alle 196 bisherigen Default-Citadel-Konsumenten denselben
  Rahmen, ohne ihre komponentenspezifischen sichtbaren Rahmenbreiten zu verändern
- Sidebar- und Topbar-Flächen verwenden ruhiges dunkles Leder unter kräftigeren Ironwood-Kanten; die
  Footer-Systemaktionen liegen auf rötlich-schwarzem Stein als deutlichem Gegenmaterial. Sidebar-Hover verändert keinerlei
  Geometrie, Kindfilter, Glow oder Pseudolayer mehr; der eckige Active-Inset ist entfernt
- Die zentrale 224×149-Runtime-Fassung ist edge-anchored: alle Schienen berühren die echte Außenkante.
  Flächen laufen einheitlich unter das Chrome, ohne außen überzuragen oder innen schwarze Spalten zu bilden
- Rollback des ersetzten Assets:
  `CODEX/outbox/2026-07-31-ironwood-bastion-default-prechange/`
- Rollback der fehlerhaften ersten Ironwood-Runtime-Fassung:
  `CODEX/outbox/2026-07-31-ironwood-corner-slice-prechange/`
- Rollback der optisch losgelösten Square-Corner-Fassung:
  `CODEX/outbox/2026-07-31-ironwood-l-corner-prechange/`
- Rollback der eingerückten Schienenfassung:
  `CODEX/outbox/2026-07-31-ironwood-edge-anchor-prechange/`

## Codex-Schwerpunkt

Codex unterstützt standardmäßig:

- New-Haven-Gebäude-Art, UI-Visuals und Asset-QA
- Dark-Fantasy-/Ashen-Iron-Designarbeit
- Prompt-Batches und nachvollziehbare Asset-Mappings
- visuelle Audits, Mockups und Übergabedokumentation

Code-, Content-, Balance-, Lore- oder Releasearbeit erfolgt nur auf konkreten Auftrag und mit Übergabe an den zuständigen Claude-Owner.

## Aktueller UI-Rollback-Status

- Chef-Auswahl: **06 Gravewood & Bronze**
- vollständiges Produktionspaket: `CODEX/assets/ui-kit-gravewood-production/`
- stretchsichere V2-Neuproduktion: `CODEX/assets/ui-kit-gravewood-production-v2/`
- getrennte V3-Rahmen-/Oberflächenarchitektur: `CODEX/assets/ui-kit-gravewood-production-v3/`
- Die appweite Gravewood-V3-Richtung wurde nach visueller Chef-Prüfung am **2026-07-30** verworfen.
- `gravewood-theme.css` und `assets/ui/gravewood/**` bleiben als reversible Designarchive vorhanden, sind aber nicht mehr produktiv importiert.
- `styles/index.css` nutzt wieder exakt den Importgraphen vor der ersten appweiten Gravewood-Integration.
- Main Menu, Load Game, Options, Offline-Fenster, Character/Inventory und Action Cards verwenden wieder ihre bewährten dunklen Citadel-Flächen und Rahmen.
- `button_new.webp`, `button_new_hover.webp` und `button_new_pressed.webp` entsprechen bytegenau dem Pre-Gravewood-Backup.
- Die Topbar behält ihre lokal begrenzte Zustandsantwort. Die Sidebar besitzt nach Live-QA keinerlei
  Hover-/Pressed-Bewegung mehr, weil selbst kleine Rasteränderungen dort sichtbar störten.
- Kontrollierte Wiedereinführung: Nur Sidebar-, Sidebar-Footer- und Topbar-Buttons laden über
  `styles/gravewood-navigation.css` den transparenten V3-Buttonrahmen und die dunkle
  Gravewood-Fläche. Das globale V3-Theme bleibt deaktiviert.
- Freigegebene zweite Kontrollgruppe in `styles/gravewood-controls.css`: Gravewood-Handcursor,
  stretchsichere Scrollbar, glatte Topbar-Fortschrittsleisten sowie fertige Character-Equipment-
  und Inventarslots für leere und belegte Zellen.
- Sidebar und Footer verwenden nun die ruhigere alternative Gravewood-Rahmenfamilie mit separater
  Lederfläche; ihr Hover skaliert nicht mehr die gesamte Buttonbox und kann deshalb nicht am
  Scrollcontainer abschneiden. Der aktive Topbar-State besitzt keine rechteckige Innenauswahl mehr.
- `styles/gravewood-offline.css` tauscht ausschließlich Dauer-, Wächter- und Fertigkeitskarten auf
  dunkles Leder und bindet den alternativen Gravewood-Rahmen an „Einsammeln“.
- Sidebar, Footer und Topbar verwenden den zentralen Ironwood-Bastion-L-Corner-Rahmen. Sidebar und
  Topbar liegen auf Basalt; der Footer bleibt warmbraun auf Gravewood. „Einsammeln“ nutzt denselben
  Grundvertrag, ist auf 50 % begrenzt und zentriert.
- `styles/gravewood-loadgame.css` strukturiert ausschließlich die Spielstandkarten neu:
  Character-Wald als Portraitbühne, Leder-Informationsflächen, kräftiger Holzrahmen und
  konsistente Kartenaktionen.
- Der globale gedrückte Cursor besitzt eine eigene höhere Prioritätsregel für Buttons und andere
  interaktive Elemente; der Select-Cursor kann Pointer-Down dort nicht mehr überstimmen.
- Sidebarbuttons sind höher, besitzen größere Iconflächen und einen 10-px-Holzrahmen. Hover
  verändert weder Geometrie noch Rasterung der gesamten Buttonbox; auch die Topbar nutzt diesen
  stabilen eckigen Holz-/Gravewood-Vertrag.
- `styles/gravewood-character-fixes.css` behebt die eigentliche Equipment-Quetschursache: Der
  Character-Screen besitzt nun an Character, Equipment/Stats und Inventory denselben sichtbaren
  18-px-Ironwood-Rahmen; die mittlere Desktopspalte erhält etwas mehr Breite.
- `styles/gravewood-actioncards.css` vergrößert Informationswerte und Mengenaktionen und trennt
  Schmiedebronze-, Leder- und Gravewood-Flächen ausschließlich innerhalb der Action Cards.
- Woodcutting besitzt für `craft_timber_beam`, `craft_timber_brace` und `craft_timber_anchor`
  nun je ein echtes Action- und Item-Asset. Damit sind sämtliche 19 Woodcutting-Aktionen frei von
  Emoji-Platzhaltern; transparente Quellen und eine Kontrolltafel liegen unter
  `CODEX/AssetControl/Woodcutting/`.
- New Haven ist vom UI-Rollback vollständig isoliert und bleibt produktiv verdrahtet.
- Character-Equipment und Inventar zeigen Rarity nur noch als ruhigen Hintergrundschein; die
  farbigen Rechteckrahmen der eingebetteten ItemCells sind in diesen Slots deaktiviert.
- Sidebar und Topbar verwenden kühlen, wiederholbaren Schiefer statt braunem Holz; die sichtbare
  Ironwood-Rahmenstärke skaliert proportional mit ihren jeweiligen UI-Skalierungsvariablen.
- Die fünf Sidebar-Footeraktionen verwenden eine hellere rauchige Bronze-/Oxblood-Fläche statt
  nahezu schwarzem Basalt.
- Im Character-Screen besitzt das mittlere Equipment/Stats-Panel nur noch einen Hintergrund-Owner;
  das Inventar-Taschenbild füllt seinen kompletten gemeinsamen 18-px-Rahmen-Owner.
- Das Hauptmenü folgt produktiv der Chef-Auswahl 02 „War Table Ledger": geschlossene
  2×2-Kommandotafel, gemeinsame Ledger-Fensterfamilie für New Game, Load Game und Options sowie
  funktionaler lokaler Kontrollprototyp unter `CODEX/AssetControl/MainMenuConcepts-2026-07-31/`.
- New Game, Load Game und Options sind eigenständige War-Table-Unterseiten mit sichtbarer
  Zurück-Navigation; das fehlerhafte permanente Seitenregister ist entfernt.
- New/Load sind kompakte inhaltsgebundene Ledger mit fünf zentrierten Slotspalten und nur einem
  Außenrahmen; ausschließlich Options behält das größere intern scrollbarere Fenster.
- Vollständige Skill-Action-Cards besitzen nun einen 14-px-Außenrahmen; ihre inneren Layout-01-
  Inhaltszonen bleiben unverändert.
- Die New-Haven-Karte besitzt eine auflösungsunabhängige 1672:941-Weltprojektion. Gespeicherte
  Prozentpositionen und Gebäudegrößen bleiben bei Fenster-/Fullscreen-Wechsel deckungsgleich.
- Sidebarbuttons besitzen keinerlei Scale-/Translate-/3D-Transformation mehr; die Topbar behält
  ihren stabilen eigenen Hover. Itemkarten haben rechts neben dem Wiki-Knopf ein Schließen-X.
- Performance-Pass vom 2026-07-31: appweiter Toast-Vollscan von 10 Hz auf höchstens 1 Hz
  gedrosselt, unbenutzte Paperdoll-Statberechnung entfernt, Game-Simulation auf maximal 30 Hz
  gebündelt und React-Tick als Transition priorisiert.
- Topbar-Fills animieren compositorfreundlich per `scaleX` statt permanentem `clip-path`-Repaint.
  Der Runtime-SVG-Rauschfilter und das feste Stone-Background-Attachment sind entfernt; im
  Hauptmenü laufen zehn statt achtzehn Funken und die großen Nebelflächen benötigen keinen
  Live-Blur mehr.

## Offene Vorsichtspunkte

- Keine Annahme, dass dieser Snapshot noch aktuell ist.
- Kein Release oder Depot-Upload durch Codex.
- `design/0.3.0-zielsetzung.md` ist bindend markiert; Scope nicht eigenmächtig verändern.
- Bestehende Arbeitsstände anderer Agenten nicht überschreiben.
- `.claude/**` bleibt unberührt.
- Pre-Integration-Backup samt SHA-256 liegt unter `CODEX/outbox/2026-07-30-gravewood-appwide-preintegration/`.
- Der exakte Stand unmittelbar vor der V2-Ersetzung liegt unter `CODEX/outbox/2026-07-30-gravewood-v2-preintegration/`.
- Der exakte Stand unmittelbar vor V3 liegt unter `CODEX/outbox/2026-07-30-gravewood-v3-preintegration/`.
- Der exakte Theme-Stand vor der visuellen V3-Regressionskorrektur liegt unter `CODEX/outbox/2026-07-30-gravewood-v3-visual-regression-fix/`.
- Der New-Haven-Stand vor der Runtime-Verdrahtung liegt unter `CODEX/outbox/2026-07-30-new-haven-runtime-preintegration/`.
- Der finale `electron-vite`-Build muss außerhalb der aktuellen Windows-Sandbox wiederholt werden; deren Prozessstart endet mit `spawn EPERM`.
- Der Quellcode-Typecheck lief mit 151 Eingabedateien und 0 Produktdiagnosen; die lokale
  Basiskonfiguration meldet nach dem Freiräumen von C: lediglich das fehlende Root-`@types/node`,
  während das vorhandene Client-TypeRoot vollständig fehlerfrei prüft.
- Der Performance-Pass ist quellseitig verifiziert, aber noch nicht als reale FPS-Zahl gemessen.
  Für ein belastbares 60/120/165-FPS-Ziel folgt ein Runtime-Profiling der schweren Character-,
  Achievement-, Skill-, Bestiary-, Bank-, Shop- und Combat-Grids.
- Vollständiger Voränderungsstand dieses Passes:
  `CODEX/outbox/2026-07-31-slot-hover-tooltip-performance-prechange/`.

## New-Haven-Assetkontrolle

- Kontrollordner: `CODEX/NEW-HAVEN-ASSET-CONTROL-2026-07-30/`
- vorhandene `CODEX/CityAssets` bleiben unverändert
- 24 fehlende Kandidaten bleiben mit Vergleichstafeln und QA unter `deliveries/` archiviert
- Chef-GO wurde erteilt; 74 CityAssets plus 24 freigegebene Kandidaten sind produktiv gebunden
- Runtime-Mapping und QA stehen in `CODEX/outbox/2026-07-30-new-haven-runtime-preintegration/`

## New-Haven-Listenvertrag und Move-Modus

- Die Listenansicht verwendet feste, kartentypgebundene Action-Card-Zonen: normale Gebäude 640 px,
  Veredelungsgebäude 760 px. Zustände innerhalb eines Typs verändern die Außenmaße nicht mehr.
- Gebäude-Art wird in einem kräftigen 7-px-Rahmen vollständig per `contain` gezeigt.
- Normale Gebäude besitzen keinen leeren Funktionsraum mehr. Ihr kompakter Aktionsdock folgt direkt
  auf Effekte; Veredelungsgebäude besitzen zusätzlich ein intern begrenztes Funktionspanel.
- Die Karte besitzt einen sichtbaren, kostenlosen Move-Modus in der Toolbar und im Gebäude-Popup.
  Nur in diesem Modus sind fertige Gebäude ziehbar; Positionen bleiben Prozentwerte in
  `camp.positions`.
- Chef-Nachentscheid: Gebäude besitzen gegeneinander keine Hitbox und dürfen überlappen. Der
  Kartenrand bleibt Gate; Save-Sanitize erhält gültige überlappende Prozentpositionen exakt.
- Kein neues `GameState`-Feld und kein Save-Bump. Geändert wurden Engine-Prädikat und bestehender
  Positions-Sanitize, nicht das Datenformat.
- TypeScript: Client 151, Shared 1, Engine 176, Persistence 15 Dateien — jeweils 0 Diagnosen.
  `newhaven.css` fehlerfrei geparst; alle lokalen CSS-Assets vorhanden.
- Codex-Marker: `codex:2026-07-31T23:42:00+02:00`.

## Used-Iron-Navigationsrahmen — Auswahlrunde

- Fünf Rahmenkonzepte für die grauen Sidebar-/Topbar-Flächen:
  `CODEX/AssetControl/IronFrameConcepts-2026-07-31/`.
- Varianten: Blackened Forge, Bronze-Lipped Iron, Ashen Steel Bevel, Grave-Iron Battlement und
  Shield-Corner Steel.
- Finale Konzept-PNGs besitzen Alpha; Chromaquellen bleiben daneben erhalten. QA: transparente
  Ecken und 0 sichtbar grün-dominante Randpixel in allen fünf Dateien.
- Chef-Auswahl 2026-08-01: **02 Bronze-Lipped Iron**.
- Produktiver 512-px-Atlas mit Slice 96 liegt unter
  `apps/client/src/renderer/assets/ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp`.
- Sidebar-Skillbuttons und Topbar-Tabs verwenden ihn mit wiederholbaren Mittelkanten; Footer-
  Systembuttons und globale Containerrahmen bleiben unverändert.
- Die Innenfläche ist jetzt fast schwarzer, nahtloser Basalt statt hellem Cold Slate. Sichtbares
  Chrome und Layout-Rand sind getrennt, damit Rahmenstärke nicht länger Text- und Iconhöhe frisst.
- Sidebar-Skillbuttons verwenden eine höhere skalierende Innenzone mit vollständig eingepassten
  Symbolen; Topbar-Tabs nutzen ihre verfügbare Barhöhe vollständig.
- Rollback: `CODEX/outbox/2026-08-01-nav-iron-frame-prechange/`.
- Material-/Content-Rollback: `CODEX/outbox/2026-08-01-nav-surface-content-fix-prechange/`.
- Die Sidebar-Schale verwendet nun die ruhige Gravewood-Textur statt des schwarzen Rosenmusters;
  der schmale Kampfausklapper gehört ebenfalls zur Bronze-Lipped-Iron-/Basalt-Familie.
- Topbar-Tabs besitzen zusätzliche vertikale Innenluft; die fünf Footeraktionen liegen auf tiefem
  dunklem Leder.
- Sidebar- und Topbar-Außenrahmen verwenden den nahtbereinigten Alias
  `wooden_frame_with_corners_seamless.webp` (224×149, Slice 28). Vergleich:
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/runtime-seam-fix-comparison.png`.
- Rollback dieses Passes: `CODEX/outbox/2026-08-01-nav-shell-frame-seam-fix-prechange/`.
- Alle 198 direkten Holzframe-Bindungen in 36 Stylesheets verwenden nun den nahtfreien Alias;
  der gesperrte zentrale Altpfad blieb unangetastet. Rollback:
  `CODEX/outbox/2026-08-01-newhaven-nav-cohesion-prechange/`.
- Topbar besitzt keinen eigenen umlaufenden Holzrahmen mehr; der schmale Kampfausklapper unterdrückt
  das alte geerbte `.ds-button::before` und zeigt nur seinen Bronze-Lipped-Iron-Rahmen.
- New-Haven-Liste und Gebäude-Popup folgen Action-Card V2: responsive feste Zonen, nicht-kursiver
  Flavor, gemeinsamer Current-/Next-Vergleich, ruhige Steinflächen und eigener Eisen-X-Button.
- Sidebar-Fontlabor: `CODEX/AssetControl/SidebarFontLab-2026-08-01/index.html`.
- Aktuelle Chef-Auswahl: Fell Chronicle (`IM Fell English SC`) ist global über `--font-head` aktiv.
  RU nutzt Georgia/Noto Serif, ZH Microsoft YaHei/Noto Serif CJK. Rollback:
  `CODEX/outbox/2026-08-01-fell-chronicle-global-prechange/`.
- Fontlabor enthält zusätzlich Varnyx Regular und Hellock als lokale Varianten 06/07.
- Aktuelle Cohesive-UI-Kontrolle:
  `CODEX/AssetControl/CohesiveUI-2026-08-01/round-2-dark-fantasy/index.html`; die verworfene
  schlichte Runde ist unter `archive-round-1-simple/` archiviert.
- Chef-Entscheid: keine weiteren ganzheitlichen UI-Mockup-Runden; Elemente werden wieder einzeln
  ausgewählt, umgesetzt und getestet.
- Produktive Item-Card folgt `05 — Warbanner Record`: Ausrüstung nutzt bis 1040 px Breite mit
  festen Rasterplätzen für Offense/Suffix/Defense/Attribute/Skill/Misc/Rune; reine Materialien
  wechseln in eine kompakte vertikale Einspaltenkarte bis 620 px. Kein interner Scrollcontainer.
- Sichtbare Skilllevel in der Sidebar sind für Fell Chronicle auf doppelte Grundgröße gesetzt;
  Canvas-Fläche und Navigationsrahmen bleiben unverändert.
- Rollback: `CODEX/outbox/2026-08-01-warbanner-itemcard-sidebar-numbers-prechange/`.
- Sidebar-Level nutzen wieder Metamorphous in ursprünglicher Größe; Fell Chronicle bleibt für
  Namen und globale UI aktiv.
- Sidebar-Systemaktionen sind als Bottom-Drawer hinter einer lokalisierten Menu-Lasche verborgen;
  ausschließlich ein Klick öffnet/schließt ihn. Die Lasche liegt transparent oberhalb der erst
  beim Öffnen sichtbaren Aktionsfläche.
- Topbar-Tabs sind unabhängig vom Textinhalt exakt gleich breit; ihre Schrift skaliert pro Zelle.
  Ihre Oberfläche ist dieselbe dunkle tilebare Basalt-/Canvastextur wie links.
- New-Haven-Popup: kompakte getrennte Now-/Next-Karten und kleiner X-Knopf im rechten Eckchrome.
- Warbanner-Card: saubere Datenspaltenkante, vereinfachter Suffixkopf, stärker lesbare Offense-
  Werte und dunkler gravierter On-Hit-Bereich. Werte/Formeln unverändert.
- Rollbacks: `CODEX/outbox/2026-08-01-sidebar-drawer-equal-topbar-prechange/` und
  `CODEX/outbox/2026-08-01-newhaven-itemcard-polish-prechange/`.
- ItemTooltip-Offense nutzt feste Grid-Spuren; Damage-Werte überdecken keine Labels mehr.
- Alte eingebettete Compare-Bildpfeile sind entfernt; nur die kompakten `▲/▼`-Deltas bleiben.
- Varianten-Pouch zeigt Itemidentität und echte Suffix-/Enchant-Boni als breite responsive
  Vergleichszeile nebeneinander.
- Drawer-Menu nutzt die transparente Gravewood-Tab-Lasche; Topbar-Schale verwendet den warmen
  Gravewood-Grund der Sidebar, während die einzelnen Tabs kühl bleiben.
- Action Cards: Produces Label oben/Item darunter; Ressourcen-, Mengen- und Statusschrift größer
  und containerrelativ skaliert.
- Fünf noch nicht produktiv ausgewählte Action-Queue-HTML-Studien:
  `CODEX/work/action-queue-mockups-2026-08-01/index.html`.
- Rollback dieses Passes: `CODEX/outbox/2026-08-01-tooltip-pouch-drawer-queue-prechange/`.
- Drawer-Griff verwendet jetzt echte transparente `tab-inactive`-/`tab-active`-Flächen; die
  irrtümlich als Hintergrund verwendete reine Goldzierleiste `tab-lever` ist entfernt.
- ItemTooltip: Damage-Zahl kleiner; Enchantment und On-Hit als getrennte orange Effektplatten.
- Equipment-/Stats-Mittelpanel verwendet tilebaren kalten Schiefer statt Leder.
- Options V2 nutzt volle Inhaltsbreite, V3-Rahmen, Schiefer/Basalt und größere Text-/Zeilenhierarchie.
- Feedbackkanal heißt in allen sieben Sprachen sinngemäß „Bug melden / Feature vorschlagen“; das
  Dialogfenster folgt dem neuen Panel-/Card-Vertrag.
- Action-Card-Höhenbudget: Output 52 px, Status 34 px, Presets 44 px, Materialrack 175 px;
  sichtbare Presets ohne `×`, tatsächliche Queueziele unverändert.
- Rollbacks: `CODEX/outbox/2026-08-01-drawer-tooltip-equipment-texture-prechange/` und
  `CODEX/outbox/2026-08-01-options-actioncards-prechange/`.
- UI-Vertrag Pass 2026-08-01 13:28: Topbar-Tabs besitzen gleichmäßige Zwischenluft; Item-Aktionen
  einschließlich Unequip verwenden Bronze-Lipped Iron/Basalt; DPS ist in allen sieben Sprachen
  kompakt; Materialbilder und Mengen nutzen das 2×2-Rack deutlich stärker aus.
- Options V3 verwendet dunklen Basalt mit warmem Licht statt heller Schieferwäsche, 22-px-
  Panelrahmen und aktuelle Eisenbuttons. Feedback-Dialog bis 1040 px, mit 22-px-Außenrahmen,
  größeren Eingabeflächen und Controls.
- Rollback: `CODEX/outbox/2026-08-01-fixed-tooltip-drawer-options-prechange/`.
- Offline-Bühne bis 920 × 980 px mit 22-px-Panelrahmen; Beute-Slots sind 88 px, seltene
  Beute 104 px groß. Die dunkle Fläche reicht bündig bis unter den Rahmen.
- ItemTooltip: Bild- und Statistikflächen besitzen 14-px-, Aktionsbuttons 16-px-Rahmen;
  transparente Zwischenbänder an Equip/Unequip/Sell sind beseitigt.
- Equipment/Stats verwendet nun die tatsächlich kaskadenwirksame tilebare Umber-Cloth-Fläche
  statt der später überschreibenden Lederdatei `bg_equipment.webp`.
- Der klickgesteuerte Sidebar-Drawer besitzt einen passenden Eisenrahmen; die Lasche liegt absolut
  über den Aktionen und erzeugt keine deckenden Seitenflächen. Der Report-Bug-/Feature-Banner
  verwendet denselben 22-px-Optionsrahmen wie der Optionskopf.
- Fünf funktionelle Info-Bar-Studien liegen unter
  `CODEX/work/infobar-mockups-2026-08-01/index.html`.
- Rollback: `CODEX/outbox/2026-08-01-offline-drawer-infobar-prechange/`.
- UI-Vertrag Pass 2026-08-01 13:30: Sichtbare Options-Emojis sind durch kleine transparente
  Ashen-Iron-SVGs ersetzt; die alte Skill-Leerlaufzeile entfällt, Suche und Mastery nutzen den
  aktuellen Rahmen-/Flächenvertrag. Action Queue folgt produktiv der Studie „03 War Chain“.
- ItemTooltip packt Defense/Attributes ohne leere Offense-Lücke nach oben und besitzt rechts
  dieselbe Innenkante wie links; Consumables verwenden eine kompakte Einspaltenvariante.
- Offline-Bühne besitzt keinen horizontalen Scrollbar-Corner mehr. Der Sidebar-Drawer öffnet
  wieder nach oben und bleibt klickgesteuert.
- Neue Info-Bar-Studien V2:
  `CODEX/work/infobar-mockups-2026-08-01-v2/index.html`. Chef-Auswahl ist **05 Quiet Citadel**;
  Designrichtung freigegeben, aber noch nicht produktiv implementiert.
- Rollback dieses Passes: `CODEX/outbox/2026-08-01-ui-warchain-infobar-prechange/`.
- Chef-Korrektur 2026-08-01 16:06: **Quiet Citadel 05 war bereits produktiv freigegeben**. Die
  Info-Bar ist nun in `App.tsx`/`topbar.css` implementiert und auf bestehende Ashen-Iron-/Gravewood-
  Frames, Basaltfläche, Selector-Gates und Segmentleisten angepasst. Sichtbar bleiben Identität,
  Aktivität, Inventar/Gold und beide Fortschritte; redundanter Screenname und Slayer-Vertrag sind
  in dieser ruhigen Variante visuell eingeklappt.
- Der geschlossene Sidebar-Drawer rendert außer der Tablasche keine Rahmen-/Eckfragmente mehr;
  links und rechts der Lasche ist die Fläche transparent.
- New-Haven-Assetvertrag korrigiert: Die zuerst erzeugten Grounded-V1-Gebäude sind verworfen und
  werden nur archiviert. Alle 15 Familien werden als reine freigestellte Gebäudekomponenten ohne
  Bodenplatte, Terrainpatch oder Erdsaum neu erzeugt; noch keine Produktionsbindung.
- Typografie-Vertrag 2026-08-01: Fell Chronicle bleibt Display-/Hausschrift; die bereits
  gebündelte OFL-Schrift Cinzel liefert über die eingeschränkte Familie `Grim Reach Numerals`
  global nur Ziffern und zugehörige Rechen-/Zeitzeichen. Kleine Info-/XP-/Mastery-Texte verwenden
  `--font-info`; tabellarische Lining-Ziffern sind global aktiviert.
- Quiet-Citadel-Abstand nachgeschärft: sieben skalierte Pixel Luft zwischen den drei Info-Clustern
  und den beiden Fortschrittsleisten.
- Sidebar-Systemmenü ist nun als bodenverankertes Overlay aus der Layoutzeile genommen. Links und
  rechts der separat mittig sitzenden Lasche wird kein Footer-Layer gemalt; nur der geöffnete
  rechteckige Action-Drawer besitzt Fläche und Rahmen.
- Je fünf funktionelle Layoutstudien für Companions, Shop, Bank und Quests (20 Kombinationen)
  liegen unter `CODEX/work/major-page-layouts-2026-08-01/index.html`; noch keine Produktionswahl.
- Chef lehnt die generische Major-Page-Galerie als Gesamtrichtung ab; weitere Reworks erfolgen
  kontrolliert Seite für Seite. Die alte Galerie bleibt nur als verworfene Studie erhalten.
- Bank: Fünf funktionsnahe Einzelstudien liegen unter
  `CODEX/work/bank-layout-mockups-2026-08-01/index.html`. Chef wählte **03 Vault Ledger** als
  Layoutbasis und gab das Produktions-GO. Produktiv bleibt das vertraute quadratische Inventar-
  Slotgrid; „Ledger“ bezeichnet die feste Seitenstruktur mit kompaktem Kopf/Befehlsbereich,
  zwei stets sichtbaren Spalten und ausschließlich intern scrollenden Slotflächen.
- Quiet Citadel zeigt den aktiven Slayer-Auftrag nun als eigenen dritten Cluster zwischen
  Aktivität und Inventar/Gold; ohne Auftrag nutzt die Ökonomie den freien Raum. Der späte
  ItemTooltip-Override für Statistikwerte verwendet jetzt ebenfalls `--font-info`, damit dort
  nicht mehr Metamorphous-Ziffern durchschlagen.
- Die Sidebar-Menülasche steht vollständig oberhalb des rechteckigen Drawers; ihre Unterkante
  liegt bündig an dessen Oberkante statt mittig im Rahmen.
- Shop-Einzelstudie: Fünf funktionsnahe Entwürfe liegen unter
  `CODEX/work/shop-layout-mockups-2026-08-01/index.html`. Chef wählte **01 Mux' Counter** und gab
  das Produktions-GO.
- Produktiv verwendet der Kaufen-Tab nun drei feste Arbeitszonen: vertikale Warengruppen links,
  ausschließlich intern scrollendes Warenraster mittig und einen stabilen Handelstresen rechts.
  Mengenwahl und Kosten wurden aus den einzelnen Warenkarten in den Tresen verlegt; Upgrades,
  verlorene Meisterringe und die komplette bestehende Verkaufs-/Varianten-/Massenverkaufs-/
  Rückkauflogik bleiben erhalten.
- Konkrete Kaufsperrgründe für volles Inventar und zu wenig Gold sind in allen sieben Sprachen
  ergänzt. Der Shop nutzt aktuelle Gravewood-V3-Rahmen sowie Basalt-/Cold-Slate-Flächen.
- Shop-Nachschärfung 2026-08-01: Der Shop belegt nun exakt die verfügbare Content-Höhe; die
  äußere Seite scrollt nicht mehr. Kategorien/Tresen bleiben stehen, nur Warenraster bzw.
  Verkaufsinventar scrollen intern.
- Doppelter Itemvergleich ist nicht mehr an zwei starre 860-px-Karten gebunden: Die Karten
  schrumpfen bis zum verfügbaren Viewport, verwenden bei mittleren Breiten kompaktere interne
  Statistikspalten und stapeln sich unter 940 px vertikal innerhalb eines scrollbaren Compare-
  Containers.
- Die technisch vollständige New-Haven-V2-Serie (15 Familien/90 Gebäudevarianten) ist nach
  visueller Chefprüfung **verworfen**: Kamerawinkel, Kamerahöhe, Maßstab und Projektion waren als
  Serie nicht kohärent. Der Agent wurde gestoppt; keine V2-Datei wird produktiv gebunden.
- Separate Companion-Einzelstudie unter
  `CODEX/work/companion-layout-mockups-2026-08-01/index.html`: fünf funktionale Layouts auf Basis
  der realen 21 findbaren Pets mit Passiv-/Aktiveffekt, Herkunft, Dropchance, Lock-State und
  Ausrüsten/Ablegen. Chef-Auswahl **03 Das Feldjournal des Jägers** ist nach Produktions-GO nun in
  `PetGalleryPage.tsx` umgesetzt: kompakter intern scrollender Fundindex links, eine große
  Beobachtungsbühne und ein vollständiges Dossier rechts. Gravewood-V3-Rahmen sowie Basalt-,
  Cold-Slate- und Umber-Cloth-Flächen passen das Layout an das aktuelle Ashen-Iron-Theme an.
- Die Companion-Pet-Neuproduktion im Kontrollordner
  `CODEX/AssetControl/CompanionPets-2026-08-01/` ist als 21×3-Auswahlbatch technisch vollständig.
  Chef hat die weitere Asset-Auswahl vorerst zurückgestellt; Produktionsassets und interne IDs
  bleiben unangetastet.
- Chef-Korrektur Companion-Art 2026-08-01: Die erste Ashgut-Serie war zu nah am bestehenden Bild
  und die drei Varianten unterschieden sich nur oberflächlich. Der gesamte laufende Batch wurde
  gestoppt. Neue verbindliche Regel: Altbilder sind als visuelle Referenz verboten; Name, Lore und
  Effekte sind die Designquelle. Varianten müssen unterschiedliche Anatomien, Silhouetten,
  Proportionen und Kreaturenfamilien zeigen. Neueste Chef-Anweisung: keine Zwischenabnahme nach
  Ashgut; alle 21 Companions werden direkt als vollständige 3er-Serie produziert und alphabetisch
  fortlaufend im Kontrollordner bereitgestellt.
- Zweite Chef-Korrektur Companion-Art: Auch der anatomisch breitere Neustart ist verworfen, weil
  die Serie Fantasy zu stark mit grotesk, dämonisch und ultra-böse gleichsetzte. Neue verbindliche
  Richtung ist ein breites Fantasy-Begleiter-Roster mit freundlichen, neugierigen, würdevollen,
  wilden, mystischen, robusten und nur punktuell unheimlichen Temperamenten. Grim-Reach-Kohärenz
  kommt über Renderstil, Licht, mittelalterliche Materialien und gedeckte Palette – nicht über
  universelle Hörner, Knochen, Fäulnis oder Monstergrimassen. Alle 21 × 3 werden neu produziert.
- Quest-Seite: Fünf neue funktionsnahe Einzelstudien liegen unter
  `CODEX/work/quest-layout-mockups-2026-08-02/index.html`. Sie wurden nach Analyse der realen
  `QuestsPage.tsx` erstellt und decken Aschechronik, Auftragsstränge, genau sechs Dailies,
  Reset-Timer, fünf Schwierigkeitsgrade, Tokenbestand und Belohnungslager ab. Chef wählte
  **03 Contract Wall** und gab das Produktions-GO. Die laufende Quest-Seite nutzt nun einen
  festen Wächter-/Tokenkopf, gleich breite V3-Tabs und eine intern scrollende Arbeitsfläche.
  Auftragsstränge stehen als breite zweispaltige Wand links, die Detailentscheidung rechts;
  Chronik, Dailies und Token-Shop besitzen dazu passende Contract-Wall-Ausprägungen.

<!-- codex:2026-08-02T11:24:44+02:00 -->

- Quest/Companion-Rahmenkorrektur: Die produktiven Hauptcontainer verwenden wieder Ironwood
  Bastion, innere Karten und Bedienelemente Bronze-Lipped Iron. Die vom Chef abgelehnten
  Gravewood-V3-Rahmen sind in diesen beiden neuen Seitenscopes nicht mehr der visuelle Vertrag.
  Questziele werden vollständig umgebrochen statt gekürzt; NPC-/Zielprosa ist nicht fett gesetzt.
- Combat-Layoutstudie: Fünf funktionelle Konzepte liegen unter
  `CODEX/work/combat-layout-mockups-2026-08-02/index.html`. Chef wählte **03 Frontline Ribbon**;
  der Produktivumbau mit Gear, Skills, Style und Prep ist beauftragt.
- Quiet-Citadel-Info-Bar skaliert ihre Informationsschrift jetzt zusätzlich mit der realen
  Viewportgröße. 3440×1440 nutzt sichtbar größere Namen, Status-, Slayer-, Ökonomie- und
  Leistentexte; clamp-Grenzen sichern 1920×1080 und lange Übersetzungen ab.
- Item-Warbanner: Rüstungen reservieren Attribute oben links, Defense darunter und den Suffix
  oben rechts. Die Suffixspalte ist breiter und umbrechbar, damit lange lokalisierte Namen nicht
  mehr am Modalrand abgeschnitten werden.
- New Haven: Der V2-Gebäudebatch bleibt verworfen und ist nicht freigabefähig. Vor einer neuen
  Assetproduktion entsteht ein lokales Kalibrierungs-/Generierungswerkzeug mit fester Kamera,
  Manifest, Alpha-/Baseline-QA und 1080p-/Ultrawide-Mapprüfung.

<!-- codex:2026-08-02T11:52:06+02:00 -->

- Das New-Haven-Werkzeug liegt fertig unter
  `CODEX/work/new-haven-consistent-asset-tool/`: 15 Familien × 3 Ränge, Vierer-Kalibrierung,
  feste Produktionsspezifikation, Promptpakete, Alpha-/BBox-/Baseline-/Anchor-/Boden-QA sowie
  responsive Tag-/Nacht-Mapvorschau. Es erzeugt bewusst noch keine Produktionsgebäude.
- Shop-Item-Cards verwenden nun einen deutlichen Ironwood-Rahmen, dunkle Gravewood-Fläche und
  feste Bild-/Name-/Preiszeilen. `hunting_bow` greift zentral auf das vorhandene
  `ashwood_longbow.webp` zurück; ein späteres exaktes Asset behält automatisch Vorrang.

<!-- codex:2026-08-02T12:18:49+02:00 -->

- Zehn funktionelle Battle-Screen-Studien liegen unter
  `CODEX/work/battle-screen-mockups-2026-08-02/index.html`. Sie enthalten 1920-/3440-Umschaltung,
  mehrere Kampfmomente und Frontline-Dock-Varianten. Designer-Empfehlung: 03 Frontline Record
  mit dem proportionalen Responsive-Raster aus 10 Adaptive Fortress.
