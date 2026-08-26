# Codex-Arbeitslog

## 2026-07-30 — Einrichtung

- Projektstruktur, Architektur, aktive Release-Zielsetzung und Claude-Agentenreviere analysiert.
- Grim Reach als aktives Produkt und Kreidestadt als separates Planungsprojekt dokumentiert.
- Dauerhafte Projektanweisung in `AGENTS.md` angelegt.
- Abgegrenzeten `CODEX/`-Arbeitsplatz mit Regeln, Projektwissen, Snapshot und Handoff eingerichtet.
- Optionalen, prüfenden Codex-Launcher angelegt.
- Dauerhafte Kommunikationsregel ergänzt: natürlicher Angestellten-/Berichtston und gut lesbare Gespräche mit dem Chef.
- Kontextdisziplin ergänzt: bei Orientierungsaufträgen nur Überblick und gezielte Stichproben, keine ungefragte Tiefenanalyse großer Codebereiche.
- Definitive Asset-Brief-Vorlage angelegt: Auftraggeber-Entscheidungsblock, Codex-Art-Direction, Lieferung/QA und Abnahme.
- Auftragseingang klargestellt: Ideen und Anweisungen können frei vom Chef oder von Claude kommen; Codex überträgt freie Aufträge selbst in die Vorlage.
- Dauerhafte Work-Persona „Mira Falk“ angelegt: erwachsene Visual Designerin und Asset-Spezialistin mit definiertem Aussehen, Charakter und Gesprächsstimme.
- Chef-Dauerregel ergänzt: neu erzeugte Spiel-Assets werden standardmäßig final transparent geliefert.
- Testauftrag „Dagger of Eternal Frost“ als Minimalbrief in die Asset-Vorlage übertragen und zur Produktion vorbereitet.
- Auftrag „Sidebar-Button-Neuausrichtung“ angelegt: zehn dreistufige Konzepttafeln statt der roten aktiven Button-Familie.
- Umfang auf Chef-Anweisung bei fünf Konzepten gestoppt; 01 Ashen Iron bis 05 Runed Basalt generiert, farberhaltend freigestellt, Alpha geprüft und als Vergleichstafel dokumentiert.
- Nach Chef-Feedback zweite Button-Runde 06–10 angelegt: nur Standardzustand, klar Medieval/Dark Fantasy, ohne futuristische Linien oder Neon. Fünf Assets generiert, farberhaltend freigestellt, Alpha geprüft und auf `comparison-board-medieval.png` zusammengeführt.
- Chef-Auswahl 08 „Ironbound Leather“ in ein vollständiges 9-Slice-Set überführt: Normal, Hover und Pressed / Active als PNG und WebP, `1826 × 331 px`, identische Alpha-Maske, Slice 90 / 150 / 90 / 150. Verhalten bei 240 × 42 px und 420 × 76 px geprüft; noch nicht ins Produkt integriert.
- Ironbound Leather auf direkte Chef-Freigabe in Sidebar und Topbar integriert: drei bestehende Produktions-WebPs nachvollziehbar ersetzt, vorherige Dateien gesichert und beide CSS-Slice-Blöcke minimal mit `codex:2026-07-30T17:56:55+02:00` angepasst. Interner TypeScript-Check: 0 Diagnosen; regulärer Build-Prozess durch Sandbox-`EPERM` blockiert.
- Nach Chef-Live-Test fünf simplere Kleinskalierungsrichtungen 11–15 erzeugt. Alle als PNG/WebP auf `1826 × 331 px` normalisiert, exakt 2 px transparent oben/unten und bei echten Sidebar-/Topbar-Größen geprüft; noch nicht produktiv integriert.
- Dauerregel für künftige Codearbeit ergänzt: Jeder Codex-Codeabschnitt erhält einen suchbaren `codex:<ISO-8601-Zeitstempel>`-Kommentar; kommentarfreie Formate werden stattdessen exakt in der Übergabe markiert.
- Chef-Auswahl 13 „Quiet Leather“ als vollständiges 9-Slice-Set mit Normal, Hover und Pressed umgesetzt und anstelle des vorläufigen Ironbound-Sets in Sidebar und Topbar integriert.
- Topbar-Buttons auf 46 px Mindesthöhe verschlankt; Sidebar und Topbar erhielten dezente Hover-/Pressed-Bewegung sowie eine `prefers-reduced-motion`-Absicherung.
- Zehn vollständige Dark-Fantasy-UI-Kit-Overview-Boards neu erzeugt, jeweils unmittelbar nach Fertigstellung unter `CODEX/assets/ui-kit-overviews/` abgelegt. Alle Sets enthalten drei Buttonformen, zwei Framearten, fünf Texturen, Slot, Progressbar, Tab, Badge, Divider, Scrollbar und drei originale mittelalterliche Hand-Cursor-States.
- Vergleichstafeln `comparison-board.png` und `comparison-preview.png`, Promptset, Index und Produktionsbrief erstellt. Die zehn Kit-Konzepte sind ausdrücklich noch nicht ins Produkt integriert.
- Frühere Border-Konzeptversuche wurden nach Chef-Feedback verworfen beziehungsweise durch den umfassenderen UI-Kit-Auftrag ersetzt.
- Chef wählte UI-Kit 06 „Gravewood & Bronze“ als neue verbindliche UI-Art-Direction.
- Vollständiges Gravewood-Produktionspaket unter `CODEX/assets/ui-kit-gravewood-production/` erzeugt: drei Buttonfamilien mit je Normal/Hover/Pressed/Disabled, zwei offene Frames, fünf nahtlose Texturen, leerer Slot, getrennte Progressbar-Layer, aktive/inaktive Tabs samt separatem Tab-Hebel, Badge, Divider, Scrollbar-Familie und drei Hand-Cursor-States.
- Insgesamt 73 direkt nutzbare PNG-/WebP-Produktionsdateien plus Quellen, 9-Slice-Metadaten, Hotspots, Laufzeitrenders und QA-Vorschauen abgelegt.
- Alpha-Geometrie innerhalb aller Buttonfamilien und Scrollbar-Handle-States gesperrt; horizontale Buttons auf exakt 2 px Transparenzrand oben/unten geprüft.
- Frames mit vollständig transparenter Mitte, Texturen mit exakt übereinstimmenden Gegenkanten und Controls in echten Kleinskalierungsrundläufen geprüft.
- Read-only Vorinventar für das nächste GO erstellt. Keine neue Gravewood-Datei wurde in `apps/client/**` integriert; Quiet Leather bleibt produktiv.
- Rollback-Vorgehen festgelegt: unmittelbar vor dem nächsten Integrationsschritt datierte Pfadkopie plus SHA-256 und Codex-Code-Marker.
- `.claude/**` unverändert gelassen.
- Chef-GO für New Haven ausgeführt: 74 bestehende `CODEX/CityAssets` plus 24 freigegebene
  Kontroll-Assets als 98 optimierte Runtime-WebPs integriert, alle 15 Gebäudefamilien gegen
  Content-IDs geprüft und Tag/Nacht samt Kartengrund, Leerplatz, Baustelle und Gerüst vollständig
  verdrahtet. Lokaler kosmetischer Lichtzyklus, Baumenü-Stufe-I-Vorschau und Platzierungsgeist
  ergänzt; 151 Client-Eingabedateien intern mit 0 TypeScript-Diagnosen geprüft. Backup und
  Integrationsbericht: `CODEX/outbox/2026-07-30-new-haven-runtime-preintegration/`.

## 2026-07-31 — Stabile Skill-Action-Cards

- Zehn neue Action-Card-Layoutsysteme als isolierte HTML-Kontrolltafel und zehn PNG-Previews
  erstellt; je Konzept Idle, Active/STOP, craftbares Vier-Input-Rezept und gesperrtes
  Vier-Input-Rezept bei fester Außenhöhe gezeigt.
- Ersten fachlich zu engen Zwei-Input-Pass vollständig unter
  `CODEX/AssetControl/ActionCardConcepts-2026-07-31/archive/rejected-two-input-pass/` archiviert.
- Chef-Auswahl `01 Fixed Dock` ausschließlich als Geometrievertrag produktiv umgesetzt;
  bestehende Action-Art, Citadel-/Gravewood-Rahmen, Buttons und Texturen beibehalten.
- `SkillPage.tsx` auf ein immer vorhandenes Vier-Slot-Ressourcenrack und eine feste
  STOP/Craftable/Locked-State-Platte umgebaut; Preset-Grid bleibt immer an derselben Position.
- `gravewood-actioncards.css` auf feste 720-px-Cards mit sechs unverformbaren Body-Zonen
  erweitert; Output-/Lootbereich intern begrenzt statt die Card zu verlängern.
- Vorherigen Runtime-Stand unter
  `CODEX/outbox/2026-07-31-action-card-layout01-prechange/` gesichert.
- QA: 672 Content-Inputs-Arrays, maximal vier; 151 TypeScript-Dateien ohne Diagnose;
  scoped CSS mit PostCSS fehlerfrei; zehn Previews vorhanden.

## 2026-07-31 — New Haven freie Platzierung

- Slot- und Polygonplatzierung durch freie, persistierte Platzierung auf der gesamten Karte ersetzt;
  nur Kartenrand und Gebäudeüberlappung bleiben geometrische Grenzen.
- Rathauskapazität auf 4/9/14 weitere Gebäude festgelegt und sämtliche sichtbare Slot-Sprache in
  New Haven auf Gebäudekapazität umgestellt.
- UI-lokalen Kostenlos-Debugschalter neben `List` ergänzt; er erlässt nur Kosten, nicht die übrigen
  Bauvoraussetzungen. Karten- und Listenbau verwenden dieselben Kosten- und Verfügbarkeitsregeln.
- Veralteten oberen New-Haven-Infoblock entfernt und Map, Baumenü sowie Liste ohne Seiten-Scrollbar
  auf die verfügbare Seitenhöhe gespannt; New-Haven-Listenkarten stilistisch angeglichen.
- Bindenden Teilentscheid unter `design/newhaven-freie-platzierung-entscheid-2026-07-31.md` und
  Vorher-Backup unter `CODEX/outbox/2026-07-31-new-haven-freebuild-prechange/` abgelegt.
- QA: vier TypeScript-Projekte mit 0 Diagnosen, `newhaven.css` fehlerfrei geparst und neun gezielte
  Engine-Invarianten bestanden; regulärer Vitest-Start in der Sandbox durch `spawn EPERM` blockiert.

## 2026-07-31 — Neue 9-Slice-Rahmenauswahl

- Fünf dickere Dark-Fantasy-Rahmen passend zur produktiven Sidebar als PNG und lossless WebP
  erzeugt; alle besitzen transparente Zentren und denselben 128-px-Slice-Vertrag.
- Klickbare HTML-Kontrollansicht, Vergleichstafel, Metadaten, Prompts und QA unter
  `CODEX/AssetControl/FrameSelection-2026-07-31/` abgelegt.
- Zu dünne Erstfassung im Kontrollordner archiviert; alte Konzeptfamilie mit Manifest nach
  `CODEX/assets/archive/2026-07-31-legacy-frame-concepts/` verschoben.
- Keine Rahmenvariante produktiv eingebunden; die endgültige Auswahl bleibt bei Chef/Claude.

## 2026-07-31 — New-Haven-Maßstab, Popups und Action-Card-Chrome

- Kartenpositionen als bestehende normalisierte Save-Werte bestätigt; gemeinsame Kollisionsbühne
  auf Town-Hall-Größe vergrößert und auf der 16:9-Karte pixelquadratisch gehalten.
- Für alle 15 Gebäudefamilien kuratierte Stufenskalierungen ergänzt; Rathaus bleibt Referenz 1,0,
  Fischerhütte I wurde auf 0,64 reduziert. Sprites nutzen vollständig sichtbares `contain`.
- Separaten Debug-Sofortabschluss neben dem Kosten-Debugmodus ergänzt; er verwendet den regulären
  Engine-Abschlussweg und erzeugt keinen persistenten Debugzustand.
- Gebäude-Popups auf einen einzigen kräftigen Außenrahmen, internes Scrollen, unverzerrte Art sowie
  stabile Effekt-, Kosten-, Refining- und Aktionsflächen umgebaut.
- Suffix-Chance aus der Skillkarten-Darstellung entfernt; Produces/Loot und Mastery mit einem
  vollständigen 5-px-Frame und Lederfläche versehen. Engine-Itemlogik und Saves blieben unberührt.

## 2026-07-31 — Ironwood Bastion als Default

- Fehlerhaften ersten Rahmenpass als verworfen archiviert und fünf vollständig neue 192-px-
  9-Slice-Kandidaten unter `CODEX/AssetControl/FrameSelection-2026-07-31-v2/` bereitgestellt.
- Chef-Auswahl 01 Ironwood Bastion auf den bestehenden 224×149/28-px-Runtime-Vertrag normalisiert
  und als zentrale `wooden_frame_with_corners.webp` eingesetzt. Damit wechseln Sidebar, Topbar und
  196 bisherige Default-Citadel-Konsumenten gemeinsam.
- Vorheriges Produktionsasset unter
  `CODEX/outbox/2026-07-31-ironwood-bastion-default-prechange/` gesichert.
- QA: vier TypeScript-Projekte ohne Diagnose; direkte CSS-Verbraucher mit PostCSS fehlerfrei;
  Runtime-WebP mit Alpha, transparentem Zentrum und ohne sichtbare grüne Chroma-Pixel.

## 2026-07-31 — Ironwood Slice-Safe und Basalt-Navigation

- Live-Screenshot als echten 9-Slice-Fehler bestätigt: Eckspangen lagen im Stretchsegment.
- Ironwood Bastion als neue Slice-safe-Quelle aufgebaut; alle Ornamente vollständig in die
  192-px-Ecken gebunden und die vier Kanten auf kontinuierliche Schienen reduziert.
- Transparente 1536×1024-Kontrollassets und kompatible 224×149/28-px-Runtime-Fassung erzeugt;
  beanstandete Vorfassung im Outbox-Rollback erhalten.
- Sidebar, Footer und Topbar auf eine 192 px gekachelte Basaltfläche umgestellt.
- Sidebar-Hover von allen Transform-/Filter-/Animations- und Pseudolayer-Cascaden getrennt;
  rechteckigen Active-Inset-Selector entfernt.

## 2026-07-31 — Ironwood L-Ecken und Sidebar-Statebereinigung

- Optisch losgelöste quadratische Eckplaketten durch verbundene Ironwood-L-Knoten ersetzt; ruhige
  Stretchschienen und der bestehende 224×149/28-px-Runtimevertrag bleiben erhalten.
- Echte 9-Slice-Kontrollvorschau für Sidebar, Topbar und Panel unter
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-runtime-l-corner.png` erzeugt.
- Sidebar-Hover auf identische Box-/Rahmen-/Texturgeometrie reduziert und letzte Kindfilter sowie den
  Außen-Glow entfernt; nur eine dezente Textfarbantwort bleibt.
- Footer-Systemaktionen wieder auf eine warme braune Gravewood-Fläche getrennt.
- Vorherige Square-Corner-Runtime-Fassung unter
  `CODEX/outbox/2026-07-31-ironwood-l-corner-prechange/` gesichert.

## 2026-07-31 — Warme Navigation und Character-Rahmenabgleich

- Sidebar-/Topbar-Chrome moderat verstärkt und ihre graue Basaltfläche durch dunkles warmes Leder
  ersetzt; die stabilen state-identischen Hoverregeln bleiben erhalten.
- Footer-Systemaktionen auf rötlich-schwarzen Stein umgestellt, damit Innenfläche und Ironwood-Rahmen
  nicht mehr denselben Braunwert teilen.
- Character, Equipment/Stats und Inventory auf einen gemeinsamen 18-px-Ironwood-Außenrahmen gebracht;
  keine neue Wrapper- oder Doppelrahmenebene ergänzt.
- Beide CSS-Dateien fehlerfrei mit PostCSS geparst; alle Asset-URLs vorhanden.

## 2026-07-31 — Frame-Button-Flächenclip

- Ersten `padding-box`-Hotfix nach Live-Befund als zu grob verworfen: Er verhinderte Überstand, ließ
  Flächen wegen der eingerückten Assetschiene aber sichtbar zu klein werden.
- Runtime-9-Slice stattdessen technisch edge-anchored aufgebaut: Schienen berühren alle vier echten
  Außenkanten, Slice 28 und transparentes Zentrum bleiben unverändert.
- Pauschalen Button-Clip wieder entfernt; Navigation nutzt erneut `border-box` unter dem jetzt
  randbündigen Chrome.
- Vergleichsvorschau und Rollback abgelegt; Asset- und PostCSS-QA fehlerfrei.

## 2026-07-31 — Skalierende Holz-Navigation und Background-Eigentümer

- Feste Sidebar-/Topbar-`border-image-width`-Werte durch begrenzt proportionale Werte auf Basis von
  `--sb-scale-eff` und `--tb-scale` ersetzt.
- Lederfläche der primären Navigation durch die vorhandene hochauflösende, tilebare Holztextur
  ersetzt; sämtliche Zustände bleiben material- und geometriegleich.
- Doppelten Equipment/Stats-Hintergrund entfernt und das äußere Tabpanel als alleinigen Owner
  festgelegt; Inventar-Taschenbild auf vollständige Owner-Füllung korrigiert.
- Skalierungs-Preview abgelegt, Assetpfade geprüft und beide Stylesheets mit PostCSS geparst.

## 2026-07-31 — War Table Ledger Main Menu

- Chef-Auswahl 02 als produktive responsive 2×2-Kommandotafel und geöffnetes Ledger-Layout in
  `MainMenu.tsx`/`menu.css` umgesetzt.
- Gemeinsamen Panelkopf mit Schließen-X ergänzt; erneuter Klick auf das aktive Register klappt das
  Fenster ebenfalls zu. Bestehende Save- und Optionshandler unverändert weiterverwendet.
- Klickbaren Vier-Screen-HTML-Prototypen mit Slot-, Karten-, Schalter-, Slider- und
  Rücknavigationsinteraktionen im AssetControl-Ordner angelegt.
- Client-Typecheck mit 151 Dateien und 0 Diagnosen; CSS, JavaScript, Navigationsziele und Assets
  statisch geprüft. Browser-Live-QA mangels verfügbarem Backend offen dokumentiert.

## 2026-07-31 — Eigenständige Menüfenster und New-Haven-Aspect-Fix

- Permanentes War-Table-Seitenregister entfernt; Main Menu, New Game, Load Game und Options wieder
  als eindeutige Bildschirmhierarchie mit lokalisierter Zurück-Navigation und Escape aufgebaut.
- Große nackte Holzfläche durch Basalt-Schale und Lederbuttonflächen ersetzt.
- New-Haven-Karte in flexible Stage plus exakte 1672:941-Weltfläche getrennt; `cover`-Cropping
  entfernt und alle Prozentpositionen auf den inneren Karten-Owner konzentriert.
- Tages-/Nachtasset beide 1672×941 geprüft; Client-Typecheck 151/0 und beide CSS-Parser fehlerfrei.

## 2026-07-31 — Zehn funktionale Item-Card-Konzepte

- Bestehende `ItemCell`-, `ItemTooltip`-, Inventory- und Equipment-Datenfälle untersucht.
- Zehn responsive HTML/CSS-Layouts mit identischem Unique-, Long-Name-/Many-Affix- und
  Quest-Stack-Stresstest im ItemCard-Kontrollordner angelegt.
- Klickbare Vergleichsansicht, Technik-/Assetdokumentation und statische DOM-/JS-/Asset-QA
  ergänzt; Produktionscode unangetastet gelassen.
- Headless-Browser-QA versucht und den Sandbox-Blocker (`spawn EPERM`) dokumentiert.

## 2026-07-31 — Ledger-Verdichtung und Materialkontrast

- New-/Load-Fenster auf einen einzigen inhaltsgebundenen Rahmen reduziert und fünf Save-Karten
  zentriert über die verfügbare Breite verteilt; Options separat groß und scrollbar belassen.
- Vollständigen Action-Card-Außenrahmen von 7 auf 14 px verdoppelt, ohne innere Zonen zu verändern.
- Sidebar und Topbar von braunem Holz auf kühlen Schiefer umgestellt; Footeraktionen durch hellere
  rauchige Bronze-/Oxblood-Fläche vom Schwarz gelöst.
- Vier Stylesheets geparst, sämtliche Materialpfade geprüft und Client-Typecheck mit 151/0 beendet.

## 2026-07-31 — New-Haven-Listenvertrag und Move-Modus

- New-Haven-Listenkarten auf feste 760-px-Action-Card-Zonen umgebaut; variable Build-/Refinery-
  Inhalte verändern die Außenhöhe nicht mehr.
- Gebäude-Art auf `contain`, eigene Steinbühne und kräftigen Ironwood-Rahmen umgestellt.
- Kostenlosen Move-Modus in Toolbar und Gebäude-Popup sichtbar gemacht; Drag außerhalb des Modus
  deaktiviert und vorhandene Prozent-Persistenz unverändert gelassen.
- Drei neue Move-Texte in allen sieben UI-Sprachen ergänzt.
- Client-Typecheck 151/0, CSS-Parse und lokale Assetpfade fehlerfrei verifiziert.

## 2026-07-31 — New-Haven-Kartenverdichtung und freie Überlappung

- Nach Live-Screenshot normalen Gebäudekartentyp von 760 auf 640 px verdichtet und den leeren
  Funktionsschacht entfernt; nur Refineries behalten einen 760-px-Funktionsdock.
- Gebäude-gegen-Gebäude-Kollision aus Platzieren und Verschieben entfernt.
- Positions-Sanitize so geändert, dass gültige überlappende Prozentpositionen erhalten bleiben.
- Engine-/Persistence-Tests und bindenden New-Haven-Entscheid auf die neue Chefregel aktualisiert.
- Client, Shared, Engine und Persistence mit insgesamt 343 TypeScript-Dateien ohne Diagnose geprüft.

## 2026-07-31 — Used-Iron-Navigationsrahmen

- Fünf unterschiedliche Eisenrahmen mit getrennten ImageGen-Aufrufen erzeugt.
- Chromaquellen archiviert, Alpha-PNGs lokal entkeyt, entspillt, getrimmt und pixelweise geprüft.
- Vergleichstafel und technisches Kontroll-README erstellt; keine Runtime-Assets ersetzt.

## 2026-08-01 — Bronze-Lipped-Iron 9-Slice integriert

- Chef-Auswahl 02 deterministisch zu einem 512×512-9-Slice-Atlas mit Slice 96 rekonstruiert.
- Alle Eckornamente in unverzerrten Zonen gehalten; Mittelkanten gespiegelt und nahtlos kachelbar gemacht.
- Neuen Rahmen ausschließlich auf Sidebar-Skillbuttons und Topbar-Tabs gebunden; Footer und globale
  Containerfamilien unverändert gelassen.
- Rollback, Atlas und Laufzeit-Stresstest abgelegt; PostCSS, Assetpfade und Alpha fehlerfrei geprüft;
  Client-Typecheck 151 Dateien, 0 Diagnosen.

## 2026-08-01 — Navigationsmaterial und nutzbare Innenhöhe

- Helles Cold Slate in Sidebar und Topbar durch vorhandenen nahtlosen fast schwarzen Basalt ersetzt.
- Sichtbare `border-image-width` von der kleineren layoutwirksamen `border-width` getrennt.
- Sidebarbuttons höher gesetzt, Iconboxen vollständig eingepasst und Topbar-Tabs auf volle Barhöhe gelegt.
- Kontrollpreview und Rollback abgelegt; PostCSS/Assetpfade sowie Client-Typecheck 151/0 verifiziert.

## 2026-08-01 — Sidebar-Schale und nahtfreier Holzrahmen

- Schwarzes Rosenmuster der Sidebar durch ruhige Gravewood-Fläche ersetzt; Kampfausklapper in die
  neue Eisen-/Basaltfamilie übernommen.
- Topbar um vertikale Rahmenluft ergänzt und Footeraktionen auf tiefes dunkles Leder gesetzt.
- Transparenten Zwischenraum in den 28-px-Ecken des Holzrahmens pixelgenau geschlossen und als
  sicheren Runtime-Alias an Sidebar-/Topbar-Schale gebunden.
- Alt-/Neu-Stresstest und Rollback abgelegt; PostCSS, lokale Assets und Client-Typecheck 195/0
  fehlerfrei verifiziert.

## 2026-08-01 — Globale Framebindung, New-Haven V2 und Fontlabor

- Sämtliche 198 Holzrahmen-Verweise in 36 Renderer-Stylesheets auf den nahtfreien Runtime-Alias
  migriert; gesperrtes Alt-WebP nicht gewaltsam überschrieben.
- Äußeren Topbar-Holzrahmen entfernt und doppeltes `.ds-button`-Holzchrome am Kampfausklapper
  abgeschaltet.
- New-Haven-Listenkarte und Gebäude-Popup auf responsive, feste Inhaltszonen mit ruhigen Stein-
  flächen, lesbarem Flavor, neuem Effektvergleich und eigenem Eisen-X umgebaut.
- Interaktives Sidebar-Fontlabor mit fünf lokalen Kandidaten und allen sieben Sprachen erstellt.
- 51 CSS-Dateien, sämtliche Assetpfade und Client-TypeScript 195/0 fehlerfrei geprüft.

## 2026-08-01 — Metamorphous global ausgewählt

- Chef-Auswahl aus dem Fontlabor als globale `--font-head`-Schrift umgesetzt.
- Explizite sprachgebundene Serif-Stacks für Russisch und Chinesisch ergänzt.
- CSS, lokale Fontdatei und Client-TypeScript 195/0 fehlerfrei geprüft; Rollback gesichert.

## 2026-08-01 — Fell Chronicle final und Dark-Fantasy-Mockups Runde 2

- Zwischenentscheid Metamorphous durch finale Chef-Auswahl Fell Chronicle ersetzt; RU-/ZH-Stacks
  unverändert sprachsicher gehalten.
- Varnyx Regular und Hellock ohne Dateikopie als lokale Kandidaten ins Fontlabor aufgenommen.
- Zu schlichte Cohesive-UI-Runde archiviert und fünf reichere, technisch abbildbare Gesamtsysteme
  samt konkreten Produktionsasset-Verträgen übernommen.
- Lokale Fonts, CSS/JS beider Kontrolllabore sowie Client-TypeScript ohne Fehler geprüft.

## 2026-08-01 — Warbanner-Item-Card und lesbare Sidebar-Zahlen

- ItemTooltip von hohem 480-px-Einspaltenaufbau auf das breite Konzept `05 — Warbanner Record`
  umgestellt: Bild/Lore links, Fakten/Effekte rechts, Statgruppen zweispaltig.
- Internen Tooltip-Scrollbereich entfernt und Bildbühne auf responsive 250–330 px gebracht.
- Haupt-Skilllevel für Fell Chronicle auf doppelte Grundgröße gesetzt; kleine Combat-Unterwerte
  bewusst unverändert gelassen.
- Rollback gesichert; CSS, lokale Assetpfade und Client-TypeScript 151/0 fehlerfrei geprüft.

## 2026-08-01 — Sidebar-Drawer, gleiche Topbar und Karten-Polish

- Sidebar-Level auf Metamorphous und 50 % der zwischenzeitlichen Größe zurückgestellt.
- Fünf Footeraktionen in einen hover-/fokus-/klickbaren Bottom-Drawer mit sieben lokalisierten
  Laschenlabels überführt.
- Neun Topbar-Tabs gleich breit gemacht; zellenrelative Schrift und Sidebar-Basaltfläche gebunden.
- New-Haven-Now/Next in zwei kompakte Karten getrennt und X-Steuerung verkleinert/verlagert.
- Warbanner-Divider vom Artwork getrennt, Suffixkopf bereinigt, Offense-Hierarchie und On-Hit-
  Material lesbarer und Diablo-näher aufgebaut; keine Werte oder Formeln geändert.
- Exocet wegen nicht geklärter Redistributionslizenz nicht kopiert; vorhandene Cinzel-/
  Metamorphous-Kombination scoped verwendet, RU-/ZH-Fallbacks erhalten.
- CSS, lokale Assets, sieben i18n-Varianten und Client-TypeScript 151/0 fehlerfrei geprüft.

## 2026-08-01 — Tooltip-Compare, Variantenliste und nächste Queue-Runde

- Damage-Zeilen gegen Label-/Wertüberlappung auf feste Grid-Spuren umgestellt.
- 37 alte eingebettete Bildpfeil-Aufrufe samt Renderer entfernt; `▲/▼` bleibt alleiniger
  Vergleichsindikator.
- Varianten-Pouch zu breiten responsiven Vergleichszeilen mit echten Suffix-/Enchant-Werten
  umgebaut.
- Menu-Drawer auf transparente Tab-Lasche und Topbar-Schale auf warmen Gravewood-Grund gesetzt.
- Action-Card-Produktausgabe zweizeilig strukturiert; Material-/Statuslesbarkeit und Fontbindung
  angehoben.
- Fünf funktionelle Action-Queue-Auswahlmockups lokal bereitgestellt; noch keine davon deployt.
- Rollback gesichert; CSS-/Asset-/HTML-Prüfung sauber, Client-TypeScript 151/0.

## 2026-08-01 — Korrekturpass Drawer, Tooltip, Options und Action Cards

- Falsche Goldzierleisten-Bindung des Drawers durch echte transparente Tab-Normal-/Aktivassets
  ersetzt.
- Damage-Zahl verkleinert; Enchantment und On-Hit in orange Legendary-Effektplatten überführt.
- Equipment-/Stats-Lederfläche gegen tilebaren kalten Schiefer ausgetauscht.
- Optionsseite auf volle Breite und V3-Schiefer-/Basalt-/Rahmenvertrag modernisiert.
- Bugreport zu Bug-/Feature-Feedback erweitert, Dialog neu gerahmt und alle sieben Sprachen
  aktualisiert.
- Action-Card-Höhe aus Output/Status/Preset in das Materialrack umverteilt; Preset-`×` entfernt.
- Zwei Rollbacks gesichert; sechs CSS-Dateien/Assets und Client-TypeScript 151/0 geprüft.

## 2026-08-01 — Fester Item-Raster-, Klick-Drawer- und Options-V3-Pass

- Drawer auf ausschließlich klickgesteuertes Öffnen umgestellt; transparente Lasche vom erst beim
  Öffnen sichtbaren Aktionshintergrund getrennt.
- Gleichmäßige Topbar-Abstände ergänzt, ohne die identischen Tabbreiten zurückzunehmen.
- Warbanner-Ausrüstungskarten auf 1040 px und benannte feste Statistikplätze erweitert; einfache
  Materialien in eine 620-px-Einspaltenkarte überführt; DPS in sieben Sprachen abgekürzt.
- Equip/Unequip/Sell auf Bronze-Lipped-Iron/Basalt umgestellt.
- Action-Card-Materialbilder und Mengen auf die verfügbare Vier-Slot-Fläche hochskaliert.
- Options und Feedback von heller Schieferwäsche auf dunklen Basalt, 22-px-Panelrahmen und aktuelle
  Eisenbuttons umgestellt; Feedback-Modal bis 1040 px vergrößert.
- New-Haven-Isometrie visuell diagnostiziert; keine Gebäude-/Map-Assets in diesem Pass verändert.
- Rollback gesichert; PostCSS/Assets sauber, Client-TypeScript 151/0. Electron-Vite-Build durch
  Sandbox-`spawn EPERM` blockiert und offen dokumentiert.

## 2026-08-01 — Offline-, Drawer-, Equipment- und Info-Bar-Pass

- Offline-Bericht vergrößert, 22-px-gerahmt und für besser lesbare 88-/104-px-Beuteslots neu
  proportioniert.
- Itembild-, Statistik- und Aktionsrahmen verdoppelt; transparente Füllungsbänder entfernt.
- Tatsächlich kaskadenwirksame Equipment-Lederfläche gegen warme tilebare Umber-Cloth-Textur
  ersetzt.
- Klick-Drawer-Lasche als echtes Overlay über einen passend gerahmten Aktionsblock gesetzt.
- Feedbackbanner auf denselben 22-px-Optionsrahmen wie alle Options-Hauptcontainer gebracht.
- Fünf funktionelle Info-Bar-HTML-Studien mit vorhandenen Assets und Zustandsumschaltung erstellt.
- Rollback gesichert; neun Produktions-CSS-Dateien, Mockup-CSS/-JS, Assets und Client-TypeScript
  151/0 geprüft. Browser und vollständiger Build waren in der Sandbox nicht startbar.

## 2026-08-01 — Warchain, Systemicons und Info-Bar-V2

- Sichtbare Options-/Feedback-Emoji-Platzhalter durch zwölf transparente Ashen-Iron-SVGs ersetzt.
- Alte Skill-Leerlaufzeile entfernt; Suche und Mastery auf den aktuellen UI-Vertrag gebracht.
- Action Queue nach der freigegebenen Studie „03 War Chain“ umgesetzt.
- Tooltip-Statistikfluss, Consumable-Karte, Offline-Scrollbar-Corner und Drawer-Öffnungsrichtung
  korrigiert.
- Fünf funktionelle Info-Bar-Studien V2 angelegt; Chef-Auswahl „05 Quiet Citadel“ vermerkt und
  ausgerichtet, noch nicht produktiv deployt.
- Rollback unter `CODEX/outbox/2026-08-01-ui-warchain-infobar-prechange/` gesichert.
- Acht Stylesheets, lokale Assetpfade, zwölf SVGs, Mockup-Skript und Client-TypeScript 151/0
  fehlerfrei geprüft; Browser-Laufzeit war in der Sitzung nicht initialisierbar.

## 2026-08-01 — Quiet Citadel produktiv und New Haven ohne Boden

- Bereits erteiltes Chef-GO für Info-Bar „Quiet Citadel 05“ korrigierend als Produktionsauftrag
  umgesetzt; vorhandene Selector-/Progresslogik unverändert weiterverwendet.
- Info-Bar auf dreigeteiltes Ashen-Iron-Raster mit Basaltfläche und aktuellem Eisenrahmen umgestellt.
- Geschlossenen Sidebar-Drawer vollständig transparent neben der freistehenden Lasche gemacht.
- Grounded-New-Haven-Serie als verworfene V1 eingestuft; vollständige Neuproduktion aller 15
  Gebäudefamilien als reine transparente Gebäudekomponenten beauftragt.
- Topbar-/Sidebar-CSS, lokale Assetpfade und Client-TypeScript 151/0 fehlerfrei geprüft.

## 2026-08-01 — Globale Ziffern, echter Overlay-Drawer und Major-Page-Layouts

- Cinzel als globale, per Unicode eingeschränkte Ziffernschicht vor Fell Chronicle gesetzt;
  tabellarische Lining-Zahlen und klare Sekundärschrift für Info-, XP- und Mastery-Panels ergänzt.
- Quiet-Citadel-Cluster mit sichtbarer Luft zu den Fortschrittsleisten versehen.
- Systemmenü-Drawer aus dem Sidebar-Layoutfluss gelöst: freistehende Lasche über dem Inhalt,
  keine vollbreite bemalte Footerfläche im geschlossenen Zustand.
- Funktionale 20er-HTML-Galerie mit je fünf Layouts für Companions, Shop, Bank und Quests erstellt.
- Produktions- und Mockup-CSS sowie Mockup-JavaScript parserseitig geprüft; Browserinstanz war
  nicht verfügbar, daher keine visuelle Browseraufnahme erzeugt.

## 2026-08-01 — Bank Vault Ledger und Quiet-Citadel-Nachschärfung

- Fünf funktionsnahe Bank-Layouts auf Basis der tatsächlichen Bankfunktionen erstellt; Chef wählte
  03 Vault Ledger und gab das Produktions-GO.
- Bank auf feste Content-Höhe mit kompaktem Voss-/Kapazitätskopf, zusammengeführter Befehlsleiste
  und zwei intern scrollenden quadratischen Inventar-Slotgrids umgestellt.
- Aktiven Slayer-Auftrag als eigenen Info-Bar-Cluster zwischen Aktivität und Ökonomie eingesetzt.
- Späten Metamorphous-Override der Item-Statistikziffern durch die klare Informationsschrift
  ersetzt und Menülasche vollständig oberhalb des Drawers ausgerichtet.
- Vier Produktions-CSS-Dateien, lokale UI-Assets sowie BankPage/App syntaktisch geprüft. Voller
  Program-Typecheck bleibt wegen des im installierten Workspace fehlenden `@types/node` offen.

## 2026-08-01 — Shop „Mux' Counter“

- Reale Shop-Verträge für Kauf, Verkauf, Kategorien, Upgrades, verlorene Meisterringe, Varianten,
  Massenverkauf und Rückkauf erfasst und in fünf funktionellen HTML-Layouts abgebildet.
- Nach Chef-Auswahl Konzept 01 produktiv implementiert: Warengruppen links, Warenraster mittig,
  fester Handelstresen rechts.
- Mengenwahl aus den wiederholten Warenkarten in den stabilen Tresen verlegt; konkrete Hinweise
  für Inventar voll und Goldmangel in allen sieben Sprachen ergänzt.
- Shop auf aktuelle Gravewood-V3-Rahmen sowie Basalt-/Cold-Slate-Flächen umgestellt und mit
  kontrollierten 1920-/Schmalbreiten-Fallbacks versehen.
- Client-TypeScript über 195 Quelldateien ohne Diagnose geprüft; Shop-CSS parserfehlerfrei und
  ohne fehlende lokale Assetpfade. Keine dedizierten Shop-Tests vorhanden, kein Electron-Start.

## 2026-08-01 — Shop-Viewport, Compare-Reflow und Companion-Seitenstudien

- Shop auf feste verfügbare Fensterhöhe umgestellt; äußeres Seitenscrolling entfernt und nur die
  Waren-/Verkaufsinhalte intern scrollbar belassen.
- Doppelten Itemvergleich viewportgebunden verdichtet und unter 940 px kontrolliert vertikal
  gestapelt, damit keine zweite Waffe mehr rechts außerhalb des sichtbaren Bereichs liegt.
- New-Haven-Groundless-V2 nach visueller Chefprüfung wegen inkohärenter Kamera/Projektion/
  Skalierung verworfen; Agent gestoppt, keine Produktionsbindung.
- Reale Companion-Funktionen und alle 21 Petdefinitionen geprüft; fünf neue interaktive,
  responsive Companion-HTML-Layouts ohne erfundene Subsysteme erstellt.
- Chef-Auswahl **03 Das Feldjournal des Jägers** als bevorzugte Companion-Layoutbasis vermerkt;
  Produktionsfreigabe steht noch aus.
- Pet-Neuproduktion mit drei Varianten pro Pet und strengem serienweiten Kamera-/Freistellungs-
  Vertrag in einen separaten Kontrollordner delegiert; A-bis-Z-Abnahme steht aus.
- Zu ähnliche Ashgut-Erstvarianten nach Chefprüfung verworfen; laufende Parent-/Teilagenten
  gestoppt und mit Altbild-Referenzverbot sowie deutlich strengerem Anatomie-/Silhouettenvertrag
  neu gestartet. Chef hob die geplante Ashgut-Zwischenabnahme anschließend auf: direkte Produktion
  aller 21 Companions mit je drei Varianten.
- Den anschließenden zu grotesken Dark-Fantasy-Restart ebenfalls nach Chefprüfung gestoppt und
  archiviert. Vollständige 21×3-Serie mit breiter, begehrenswerter Fantasy-Tonalität neu beauftragt.
- Mockup-JavaScript, CSS, alle lokalen Assets und Client-TypeScript (151 Dateien/0 Diagnosen)
  geprüft; kein Live-/Electron-Start.

## 2026-08-01 — Companion-Pets: vollständiger Fantasy-Auswahlbatch

<!-- codex:2026-08-01T23:45:57+02:00 -->

- Den nach Terminalabbruch unvollständigen Companion-Batch fortgesetzt und alle fehlenden Pets mit
  drei anatomisch unterschiedlichen Fantasy-Varianten fertiggestellt.
- Abschlussbestand unter `CODEX/AssetControl/CompanionPets-2026-08-01/`: 21/21 Pet-Ordner und
  63/63 Varianten; bestehende acht vollständige Pet-Familien nicht überschrieben.
- Sämtliche 63 PNGs auf 1024 × 1024, RGBA, echtes Alpha, mindestens neun Prozent Sicherheitsrand
  und null belegte Außenrandpixel geprüft; drei alphabetische Kontaktbögen erzeugt.
- Manifest auf `complete_pending_chef_selection` gesetzt und eine nachvollziehbare `QA.md`
  ergänzt. Keine Produktionsbindung und keine Änderung unter `.claude/**`.

## 2026-08-01 — Companion-Seite „Feldjournal des Jägers“

<!-- codex:2026-08-01T23:58:00+02:00 -->

- Nach ausdrücklichem Chef-GO Layout 03 aus der Companion-Einzelstudie produktiv umgesetzt.
- Altes Vier-Spalten-Kartenraster durch einen kompakten Fundindex und ein einzelnes großes Dossier
  ersetzt; Equip-/Unequip-, Owned-/Locked-, Herkunfts-, Effekt- und Dropchance-Logik bewahrt.
- Seite auf feste verfügbare Content-Höhe mit internem Index-/Dossier-Scrolling ausgelegt und an
  Gravewood-V3-Rahmen sowie Basalt-/Cold-Slate-/Umber-Cloth-Flächen angepasst.
- Vollständigen Client-Typecheck über 151 Dateien ohne Diagnose abgeschlossen; alle lokalen
  CSS-Assetpfade und die strukturelle CSS-Syntax geprüft. Kein Live-/Electron-Start.

## 2026-08-02 — Quest-Seite: fünf funktionelle Layoutstudien

<!-- codex:2026-08-02T00:15:00+02:00 -->

- Bestehende `QuestsPage.tsx`, Quest-/Chronicle-Styles und Daily-Quest-Spezifikation analysiert.
- Fünf neue, klar unterschiedliche Layouts mit gemeinsamer realer Funktionsbasis unter
  `CODEX/work/quest-layout-mockups-2026-08-02/` erstellt.
- Aschechronik, Auftragsstränge, sechs Dailies, Schwierigkeitsgrade, Reset, Tokenbestand,
  Belohnungslager, Auswahl, Claim und gesperrte Zustände interaktiv abgebildet.
- JavaScript, HTML-Struktur, CSS-Struktur und sämtliche lokalen Assetpfade statisch geprüft;
  Browser-Sichtprüfung war in der Sitzung mangels verfügbarer Browserinstanz nicht möglich.

## 2026-08-02 — Quest-Seite: Contract Wall 03 produktiv

<!-- codex:2026-08-02T00:42:00+02:00 -->

- Nach Chef-GO Konzept 03 aus der Quest-Einzelstudie produktiv umgesetzt.
- Wächter-/Tokenkopf, vier feste V3-Tabs und intern scrollende Tab-Arbeitsfläche eingeführt.
- Auftragsstränge zweispaltig links und Detailbühne rechts angeordnet; Chronik, Dailies und
  Token-Shop in dieselbe Contract-Wall-Hierarchie überführt.
- Alte Citadel-Holzrahmen im neuen Questscope durch Gravewood-V3-Rahmen sowie Basalt-, Cold-Slate-
  und Umber-Cloth-Flächen ersetzt; Questlogik, Engine, Saves, IDs und i18n nicht verändert.
- Client-TypeScript über 151 Dateien ohne Diagnose sowie beide CSS-Dateien und alle lokalen
  Assetpfade geprüft. Kein Live-/Electron-Start.

## 2026-08-02 — Rahmenkorrektur, Combat-Studie und responsive Informationsflächen

<!-- codex:2026-08-02T11:24:44+02:00 -->

- Quest- und Companion-Scope von den falschen V3-Rahmen auf Ironwood Bastion plus Bronze-Lipped
  Iron umgestellt; Questziel-/NPC-Texte vollständig, umbrechbar und normalgewichtet gemacht.
- Fünf funktionelle Combat-Layoutstudien erstellt; Chef wählte Frontline Ribbon 03.
- Quiet-Citadel-Info-Bar auf responsive Viewport-Typografie für 1080p und 3440×1440 umgestellt.
- Item-Warbanner für Rüstungen stabilisiert: Attribute links oben, Defense darunter, Suffix mit
  mehr Breite rechts; lange Suffixnamen umbrechen statt abzuschneiden.
- New-Haven-V2 ausdrücklich als verworfen bestätigt und eine neue kalibrierte Werkzeugpipeline
  statt erneuter unkontrollierter Batchgenerierung beauftragt.
- Client-TypeScript (151 Dateien, 0 Diagnosen), CSS-Struktur und Combat-Mockup-JavaScript headless
  geprüft; kein Live-/Electron-Start.

## 2026-08-02 — New-Haven Asset Foundry und Shop-Karten

<!-- codex:2026-08-02T11:52:06+02:00 -->

- Lokales New-Haven-Produktions-/QA-Werkzeug für 15 Familien × 3 Ränge und vier
  Kalibrierungsgebäude fertig geprüft; V2 nicht wiederverwendet und keine Produktionsbilder erzeugt.
- Falschen Basaltpfad im Werkzeug korrigiert; Promptpakete, Manifest, lokale Pfade und
  synthetische RGBA-QA bestanden.
- Shop-Karten auf Ironwood-Rahmen, dunkle Gravewood-Fläche und feste responsive Inhaltszeilen
  umgestellt; Hunting Bow nutzt das vorhandene Ashwood-Longbow-Bild zentral über `items.ts`.
- Keine Item-ID, Shoplogik, Engine, Balance oder `.claude/**` geändert.

## 2026-08-02 — Zehn Battle-Screen-Layoutstudien

<!-- codex:2026-08-02T12:18:49+02:00 -->

- Zehn funktionelle, responsive Battle-Screen-Architekturen mit realem Combat-Informationsvertrag
  und umschaltbaren Auflösungen/Kampfzuständen erstellt.
- Frontline-Log-Integration, große Kampfbühnen und adaptive Raster als vergleichbare Varianten
  umgesetzt; Designer empfiehlt Konzept 03 plus Responsive-Verhalten aus 10.
- HTML, CSS, JavaScript und lokale Assetpfade headless ohne Befund geprüft; mangels verfügbarer
  Browserinstanz keine visuelle Browserautomation und keine Produktionsänderung.

## 2026-08-02 — Combat-Layout produktiv vervollständigt

<!-- codex:2026-08-02T16:20:00+02:00 -->

- Frontline-Dock, Adaptive-Fortress-Arena und Battle-/Loot-Record als bestehenden Ist-Stand
  geprüft; Sitzungswerte in den Record-Fuß verschoben.
- Auto-Buff als echten einmaligen 50.000-Gold-Kauf samt Engine-Gate, Statistikbuchung,
  Save-Version 79, Migration/Sanitize und sieben Sprachen umgesetzt.
- TypeScript für Shared, Engine, Persistence und Client ohne Diagnosen; CSS-Struktur und
  Assetpfade ohne Befund. Vitest-Ausführung durch Sandbox-`spawn EPERM` blockiert.
- Combat-Gear-Stats gegen den 0px-Flex-Kollaps abgesichert und den Kampf-beenden-Button auf den
  aktuellen Bronze-Lipped-Iron/Gravewood-Stil umgestellt; Client-TypeScript erneut sauber.

## 2026-08-02 — New Haven Encampment V3 kalibriert

<!-- codex:2026-08-02T18:11:25+02:00 -->

- Fachwerk-/Dorf-Art-Direction aus der New-Haven-Foundry entfernt und verbindlich auf ein
  befestigtes Dark-Fantasy-Grenzlager mit rußigem Holz, Bruchstein, Eisen und Planen umgestellt.
- Town Hall, Watchtower, Fisher's Hut und Seed Garden als neue Rang-I-Kalibrierung generiert,
  freigestellt, auf 1536×1536/Anchor/Baseline normalisiert und im Asset-Control-Ordner abgelegt.
- Magenta-Despill besonders für Netze und Seile nachgeschärft; Kontroll-HTML und QA-JSON ergänzt.
- Keine Produktionsassets überschrieben und keine Laufzeitbindung vorgenommen.

## 2026-08-02 — New Haven Encampment V3 komplettiert

<!-- codex:2026-08-02T20:58:00+02:00 -->

- Vom Chef freigegebene Encampment-Kalibrierung auf sämtliche 15 Familien und drei Ränge ausgerollt.
- 45 Assets freigestellt, auf 1536×1536, x=768 und die gemeinsame Bodenlinie normalisiert; sämtliche
  Dateinamen, Alpha-/Canvas-Verträge und Rangflächen headless geprüft.
- Vollständige HTML-Abnahmegalerie, Gesamtübersicht und Produktions-QA im Asset-Control-Ordner ergänzt.
- Nur Staging/Foundry/Übergabedokumente verändert; keine Runtime-Bindung und keine `.claude/**`-Änderung.

## 2026-08-02 — New Haven Kartenmaßstab und Nachtabschluss

<!-- codex:2026-08-02T21:42:00+02:00 -->

- Alle Karten-Gebäudesprites auf Wunsch des Chefs geschlossen auf die doppelte bisherige Sichtgröße
  gesetzt, ohne die Ranghierarchie oder gespeicherten Prozentpositionen anzutasten.
- Lichtphase an die Karten-DOM weitergereicht; dauerhaften Bodenkontaktschatten und kühle
  Nachtanpassung für freigestellte Gebäude ergänzt.
- 45 Nachtvarianten, Tag-/Nacht-Campkarte und sechs generische Bauzustands-Assets fertiggestellt.
- Schmelzhütte II/III wegen zu geringer visueller Progression archiviert und eigenständig neu gebaut.
- Headless-Typecheck angestoßen; der lokale Windows-Sandboxprozess verweigerte den `pnpm`-Start mit
  `CreateProcessAsUserW failed: 5`, daher ist dieser Verifikationslauf noch extern nachzuholen.

## 2026-08-02 — Encampment V3 in Runtime übernommen

<!-- codex:2026-08-02T22:31:00+02:00 -->

- Chef-Freigabe umgesetzt und 98 New-Haven-Assets verlustarm als WebP in den automatischen
  Runtime-Importpfad übergeben.
- Vollständiges Pre-V3-Backup mit 98 WebP-Dateien angelegt.
- Dimensionen und Alpha aller Runtime-Dateien geprüft; 98/98 korrekt, keine Alpha-Abweichung zur
  freigegebenen Quelle.
- Schmelzhütte II/III vor Abschluss auf die tatsächliche gemeinsame Sprite-Baseline korrigiert.
- Typecheck/Build wegen einer lokalen Windows-Sandbox-Prozesssperre nicht ausführbar; kein
  Electron-/Live-Start durchgeführt.

## 2026-08-02 — New-Haven-Schlagschatten entfernt

<!-- codex:2026-08-02T22:45:00+02:00 -->

- Auf Chef-Sichtprüfung die CSS-`drop-shadow()`-Kaskade der Kartengebäude vollständig entfernt.
- Nacht- und Hover-Lesbarkeit bleibt über reine Helligkeit/Sättigung erhalten; keine Änderung an
  Assets, Platzierung, Skalierung oder Save-Daten.

## 2026-08-02 — New-Haven-Tagkarten und Nachtnebel

<!-- codex:2026-08-02T23:02:00+02:00 -->

- Listen-, Modal- und Baumenübilder auf die Tagvarianten festgesetzt; Nachtvarianten bleiben der
  platzierbaren Karte vorbehalten.
- Performante statische Nebelschicht über der gesamten Nachtkarte ergänzt, sodass Gebäude und
  Hintergrund atmosphärisch zusammengehören.

## 2026-08-02 — New-Haven-Kartenmodus konsolidiert

<!-- codex:2026-08-02T23:34:00+02:00 -->

- Widersprüchliche New-Haven-CSS-Pässe durch eine abschließende responsive Map-Mode-Schicht gebändigt.
- Toolbar, Kartenbühne, Baupalette, Gebäudelabel und Statusanzeigen an Ashen Iron angeglichen und für
  1920×1080/3440×1440 stabilisiert.
- CSS geparst, Assetpfade vollständig geprüft und alle fünf TypeScript-Projekte ohne Diagnose
  kompiliert. Build/Vitest bleiben durch die lokale `esbuild`-Sperre (`spawn EPERM`) offen.

## 2026-08-03 — Scrollfreier Abwesenheitsbericht und größere Camp-Kartenbilder

<!-- codex:2026-08-03T00:08:00+02:00 -->

- Offline-Bericht in feste Anker und ein adaptives mehrspaltiges Ergebnisraster gegliedert; internen
  Modal-Scrollweg entfernt und Collect dauerhaft sichtbar gehalten.
- New-Haven-Gebäudesprites innerhalb von Listen-/Detailkarten proportional auf 165 % vergrößert.
- Client-Typecheck sowie PostCSS-/Klammerprüfung beider Stylesheets ohne Diagnose abgeschlossen.

## 2026-08-03 — Item-Tooltip-Suffix-Overflow behoben

<!-- codex:2026-08-03T00:37:00+02:00 -->

- Equipment-Tooltip auf einen breiteren, responsiven Bild-/Datenvertrag umgestellt und feste innere
  Mindestbreiten entfernt, die den Statistikrahmen rechts aus dem Modal schoben.
- Statzeilen für Suffixe, Attribute, Defense, Skills und Misc mit getrennten Icon-, Label-, Wert- und
  Delta-Spuren abgesichert; lokalisierte Labels dürfen umbrechen, Zahlen bleiben vollständig sichtbar.
- `components.css` via PostCSS und Klammerbilanz geprüft; Client-TypeScript 151 Dateien/0 Diagnosen.
  Headless-Build bleibt wegen der lokalen Windows-Prozesssperre offen.

## 2026-08-03 — New-Haven-Kalibrierwerkzeug, Tiefensortierung und Smelter-Alpha

<!-- codex:2026-08-03T09:46:00+02:00 -->

- Objektgebundene Move-Werkzeugleiste für 1–300-%-Skalierung, Spiegelung und Rang-Reset umgesetzt;
  Gebäudenamen bleiben unabhängig von Sprite-Transforms stabil.
- Isometrische Zeichenreihenfolge über die untere Footprint-Kante eingeführt und sieben vom Chef
  gelieferte, stufenspezifische Standardwerte in `campArt.ts` übernommen.
- Zusammenschrumpfen/Überlaufen der Baupalettenkarten unterbunden; Liste bleibt intern scrollbar.
- Smelter II/III Tag/Nacht von verbundenen Chroma-Rändern bereinigt, Nachtalpha an Tagsilhouette
  gebunden sowie Originale und QA-Composites im CODEX-Arbeitsbereich abgelegt.
- Action-Queue-Nutztexte für 1080p auf klare Sekundärschrift und belastbarere Größen/Gewichte
  umgestellt; Item-Compare gegen den breiteren Einzelkartenvertrag abgesichert.
- Client-TypeScript ohne Diagnose; drei betroffene Stylesheets erfolgreich geparst und bilanziert.

## 2026-08-03 — New-Haven-Gebäudetags und Tag-/Nacht-Debug

<!-- codex:2026-08-03T12:10:00+02:00 -->

- Gebäudenamen vom unteren Hitboxrand auf 25 % der Hitboxhöhe versetzt und von Sprite-Transforms
  entkoppelt gehalten.
- Flüchtigen, lokalisierten Tag-/Nacht-Schalter für die visuelle Kartenprüfung ergänzt; keine
  Änderung an Engine- oder Save-Daten.
- Toolbar responsiv erweitert; Client-TypeScript und New-Haven-CSS ohne Diagnose geprüft.

## 2026-08-03 — New-Haven-Emblem und Read-only-Asset-Audit

<!-- codex:2026-08-03T11:27:39+02:00 -->

- Transparentes Ashen-Iron-New-Haven-Emblem als PNG/WebP produziert, für 14–20 px aufbereitet und
  mit einer tatsächlichen Kleinformat-/Pixelvorschau unter `CODEX/AssetControl/newhaven-emblem/`
  abgelegt.
- Maße, Alphakanal, transparente Ecken und Lesbarkeit geprüft; Prompt und Intake-Hinweis dokumentiert.
- Read-only-Sweep zu Asset-Abdeckung und verbliebenen Unicode-/Emoji-Platzhaltern in
  `CODEX/notes/2026-08-03-ui-asset-gap-sweep.md` abgelegt.
- Definitive Claude-Reviergrenze eingehalten: keine produktiven Code-, i18n- oder Runtime-Assets
  verändert; kein Save-Bump.

## 2026-08-03 — Micro-Icon-System: fünf Abnahme-Prüftafeln

<!-- codex:2026-08-03T11:51:35+02:00 -->

- 37 Micro-Icon-Konzepte in fünf zusammengehörigen Ashen-Iron-Sets vektorbasiert entworfen.
- Pro Set tatsächliche 14-/16-/20-px-Prüfung und 8×-Pixelinspektion gerendert; gemeinsame lokale
  HTML-Übersicht unter `CODEX/AssetControl/micro-icon-sets-2026-08-03/` abgelegt.
- Prüfgate respektiert: noch keine finalen 512er Einzeldateien und keinerlei Runtime-Verdrahtung.
- Produktivcode, Runtime-Assets, i18n und Save-Daten unangetastet; Auftrag wartet auf Abnahme.

## 2026-08-03 — Micro-Icon-System vollständig produziert

<!-- codex:2026-08-03T12:04:13+02:00 -->

- Nach Claude-GO alle 37 abgenommenen Glyphen als 512×512-PNG und verlustfreies WebP produziert:
  insgesamt 74 Finaldateien in fünf getrennten Produktionsordnern.
- Amboss- und Todesheilungs-Silhouetten gemäß Produktionsfeedback nachgeschärft; Prüftafeln neu
  gerendert und erneut visuell kontrolliert.
- Maße, Alpha, transparente Ecken, Sicherheitsrand, eindeutige IDs und Dateizahl vollständig geprüft.
  Queue-/System-Warnung in beiden Formaten per SHA256 als bitidentisch bestätigt.
- Produktivcode, Runtime-Pfade und i18n unangetastet; kein Save-Bump. Integration bleibt bei Claude.

## 2026-08-03 — Event-Artwork, System-Icon-Nachschlag und Wachstumskonzepte

<!-- codex:2026-08-03T13:43:00+02:00 -->

- New-Haven-Steam-Artwork im etablierten Patchlook als 800×450-Kapsel und 1920×622-Header erzeugt,
  typografisch deterministisch gesetzt und in beiden Zielgrößen visuell kontrolliert.
- Micro-Icon-System um `icon_sys_save` und `icon_sys_back` erweitert; Gesamtsystem erneut produziert
  und mit 39 IDs / 78 Finaldateien vollständig auf Maße, Alpha und Sicherheitsrand geprüft.
- Drei 1920×1080-Konzepttafeln zum sichtbaren Kartenwachstum auf dem unveränderten echten
  New-Haven-Kartengrund erstellt; zentrale freie Baufläche als feste Designinvariante dokumentiert.
- Ausschließlich CODEX-Staging/Work/Handoff bearbeitet; keine Runtime-, Code-, i18n- oder Save-Änderung.

## 2026-08-03 — Fight-Card-Rework: zehn HTML-Studien

<!-- codex:2026-08-03T14:37:38+02:00 -->

- Zehn responsive, interaktive Kampfkarte-Layouts mit vollständigem realem MonsterCard-
  Informationsvertrag im CODEX-AssetControl abgelegt.
- Zustände, Mengenwahl und 270–430-px-Breitentest integriert; wechselnde Inhalte besitzen feste
  Zonen und verändern die Außenmaße nicht.
- Lokale Assets vollständig, CSS bilanziert und JavaScript syntaktisch geparst; automatische
  Browser-Renderprüfung war wegen fehlender App-Browsersitzung/Sandbox-Prozesssperre nicht möglich.
- Produktivcode und Runtime unangetastet; kein Save-Bump.

## 2026-08-03 — Frontline Candidate für NPC-Fight-Cards

<!-- codex:2026-08-03T15:01:52+02:00 -->

- Vom Chef gewählte Fight-Card-Studie 10 als isolierte, spät importierte Renderer-CSS-Schicht
  produktiv eingebunden.
- Monster-, Elite-, Slayer- und weitere `monster-card`-Konsumenten auf zweispaltige Stats,
  größenstabile Informationsmodule sowie bestehende Ironwood-/Basaltassets umgestellt.
- CSS erfolgreich geparst und Asset-/Importpfade geprüft; Prozessbasierte Client-Gates durch die
  Windows-Sandbox blockiert. Kein Save-Bump.

## 2026-08-03 — Gear-Dock-Interior: drei HTML-Studien

<!-- codex:2026-08-03T16:31:00+02:00 -->

- Aktuellen Combat-Gear-Dock und Battle Record read-only gegen Claudes Brief geprüft.
- Drei responsive, interaktive Gear-Dock-Richtungen mit gemeinsamer Sprache für Gear, Skills,
  Style, Prep und einem eigenständigen 44-px-Kompaktrail im AssetControl abgelegt.
- Nur vorhandene Grim-Reach-Rahmen, Texturen und Itemassets genutzt; kein Produktivcode und kein
  Save-Bump. CSS/JS syntaktisch sowie alle lokalen Assetpfade statisch verifiziert.

## 2026-08-03 — Frontline Harness produktiv

<!-- codex:2026-08-03T17:21:00+02:00 -->

- Vom Chef gewählte Gear-Dock-Studie 03 als isolierte, spät importierte Renderer-CSS-Schicht
  produktiv umgesetzt.
- Paperdoll-Bühne, Tabs, Stats/Buffs, Skills, Style, Prep und 44-px-Rail auf den gemeinsamen
  Battle-Record-nahen Basalt-/Bronze-/Iron-Vertrag gebracht; React-, Handler- und Engine-Code
  unangetastet.
- 54 CSS-Regeln / 204 Deklarationen erfolgreich geparst, Scope und beide Runtime-Assetpfade
  vollständig geprüft. Kein Save-Bump.

<!-- codex:2026-08-03T17:41:00+02:00 -->
- Frontline-Harness-Außenhülle nach Chef-Screenshot mit dem 10-px-Rahmen und Umber-Hintergrund
  des Zonencontainers synchronisiert; CSS und Assetpfade erneut geprüft.

## 2026-08-03 — Load-Game-Kopfzeile und Achievements-Studien

<!-- codex:2026-08-03T18:42:00+02:00 -->

- Load-Game-Kopfzeile ohne React-Eingriff aus dem schwarzen Fremdbalken in das bestehende
  Gravewood-Ledger integriert; Styles vollständig auf den Load-Panel-Zustand begrenzt und geparst.
- Tatsächlichen Achievement-Funktionsvertrag inventarisiert und fünf responsive, interaktive
  Umbau-Studien im AssetControl erstellt. CSS, JavaScript und lokale Assets statisch verifiziert.
- Achievement-Produktion wartet auf Auswahl; kein Save-Bump.

## 2026-08-03 — Warden Ledger für Achievements produktiv

<!-- codex:2026-08-03T19:24:00+02:00 -->

- Chef-Auswahl 02 als dreispaltiges Achievement-Ledger mit Register, dichter Liste, Suche und
  permanentem Detailblatt umgesetzt; alle bestehenden Engine-/AP-/Meilensteinquellen erhalten.
- Claudes Micro-Icon-Verdrahtung vollständig übernommen und Koordinationsbrief abgeschlossen.
- TSX/Babel/TypeScript sowie 75 CSS-Regeln statisch geprüft; keine Achievement-Diagnose, alle
  Runtime-Assets vorhanden. Kein Save-Bump.

## 2026-08-03 — Steam Store 0.3.0, Capsule-Vorproduktion

<!-- codex:2026-08-03T19:34:00+02:00 -->

- Zwei Steam-Capsule-Familien in allen drei geforderten Massen aus freigegebenem Watchfire-Art
  und bestehendem Logo komponiert, visuell kontrolliert und per Pixelmass/Hash verifiziert.
- Gemeinsames Preview-Board, Capsule-Konzept, Shotlist, Trailer-/GIF-Storyboard, Manifest und
  Materialluecken im AssetControl-Staging abgelegt.
- Echte Gameplay-Aufbereitung bleibt offen, weil Claudes Capture-/Clip-Ordner und Index noch kein
  Material enthalten. Auftrag absichtlich nicht nach `inbox/done/` verschoben. Kein Save-Bump.

## 2026-08-03 — Steam-Beschreibungstafeln im Ashen-Iron-Stil

<!-- codex:2026-08-03T20:12:00+02:00 -->

- Vier bestehende Store-Panels neu gestaltet und um ein fuenftes New-Haven-Building-Panel aus
  echtem Capture erweitert; neue Serie im AssetControl-Staging abgelegt.
- Fehlerhafte offene SVG-Eckfuellungen sowie Titelornament-Ueberlappung waehrend visueller QA
  korrigiert. Fuenf Tafeln in Steam-Breite plus Gesamtpreview und Hashmanifest geprueft.
- Parallel eingetroffenes Claude-Material inventarisiert: acht Screenshots, vier Clips und Index
  vorhanden; Materialstatus aktualisiert. Produktive Altdateien noch nicht ersetzt. Kein Save-Bump.

<!-- codex:2026-08-03T20:18:00+02:00 -->
- Titelornament-Abstaende in Numbers und Skills nach Chef-Sichtpruefung korrigiert; Preview und
  Hashmanifest neu erzeugt.

<!-- codex:2026-08-03T20:24:00+02:00 -->
- World-Fights-Back-Tafel auf drei scharf freigestellte Elite-Runtime-Assets umgestellt; Preview
  und Pruefsummen aktualisiert.

## 2026-08-03 — Arena-Zonen 0.4.0, Pilot-Dreier

<!-- codex:2026-08-03T20:30:00+02:00 -->

- Pastures, Crypt und Slagpit als maximal gespreizte 2.5D-Arena-Pilotserie produziert; Pastures
  ergänzt, Crypt/Slagpit mit getrennten Boden- und Kulissenebenen neu aufgebaut.
- Zwölf freigestellte Props, gemeinsames Sonnen-Glow, drei 1920er Bühnen und vollständige
  Licht-/Fog-/Grade-Vorschläge im AssetControl-Staging abgelegt.
- Gerendertes Prop-Schachbrett technisch entfernt und Alpha auf zwei Kontrastgründen visuell
  geprüft. Keine Runtime- oder Save-Änderung; Runde 2 wartet auf Chef-Abnahme.
- Claudes nachgereichtes Manifest-Skelett gelesen und für alle drei Pilotzonen als valides JSON
  ausgefüllt; Pastures-Baseline erhalten, Crypt/Slagpit-Werte in die dokumentierten Runtime-
  Bereiche übersetzt. Kein Save-Bump.

## 2026-08-05 — Chicken-Pose-Pilot bis zur Kontrolltafel

<!-- codex:2026-08-05T09:08:17+02:00 -->

- Runtime-Master als feste Identitätsreferenz verwendet und Windup-, Strike- und
  Hit-Pose auf identischem 1254×1254-Canvas erzeugt.
- Chroma-Key technisch entfernt, violette Randkontamination nach visueller QA
  nachgereinigt und Alpha-Bounds sowie Flächendeckung geprüft.
- Vierer-Kontrolltafel im AssetControl-Staging abgelegt. Keine Runtime- oder
  Save-Änderung; Finalisierung wartet auf Chef-Abnahme.

## 2026-08-05 — Scene-Builder-Palette vollständig

<!-- codex:2026-08-05T09:50:35+02:00 -->

- 42 freigestellte Builder-Props erstellt: 24 generische Natur-/Bodenteile und
  je sechs Varianten für Pastures, Crypt und Slagpit.
- Alle Elemente auf Builder-Größen normalisiert, mit 8-px-Baseline-Puffer
  versehen und als Alpha-WebP abgelegt.
- Vier Bereichstafeln und eine Gesamtprüftafel gebaut. Zwei grüne
  Alt-Chroma-Flächen in der Felsserie gefunden und vor Übergabe korrigiert.
- INDEX, Alpha-/Baseline-/Chroma-QA und Handoff ergänzt. Keine Runtime- oder
  Save-Änderung; Claude übernimmt die Verdrahtung.

## 2026-08-23 — Grim Reach 1.0 Release-Artwork

<!-- codex:2026-08-23T17:38:21+02:00 -->

- Neues 1.0-Keyart im Built-in-ImageGen-Modus erzeugt und als gemeinsames Motiv für Titelbild
  1920×622 sowie Hauptkapsel 800×450 aufbereitet.
- Bestehendes `Grim Reach Idle`-Logo und `VERSION 1.0 · FULL RELEASE` deterministisch gesetzt;
  Logo-Safe-Area nach erster Zielgrößenprüfung korrigiert.
- Beide Final-PNGs, unbeschrifteter Source, gemeinsames Preview, Prompt, reproduzierbarer
  Compositor und Hash-/Maß-QA im CODEX-Staging dokumentiert. Keine Runtime- oder Save-Änderung.

<!-- codex:2026-08-23T17:51:05+02:00 -->

- Chef-Nachfix: Release-Plakette unter die vollständige Logo-Silhouette verschoben und von Gold
  auf gravierte Iron-/Crimson-Typografie im Logo-Stil umgestellt; beide Formate neu gerendert.

<!-- codex:2026-08-23T18:00:20+02:00 -->

- Rote Querornamente hinter der Release-Beschriftung nach Chef-QA entfernt; Diamantakzent erhalten
  und beide Zielgrößen samt Preview/Hashprüfung neu gerendert.

## 2026-08-23 — Native-Alpha- und ID-Abnahmeprozess

<!-- codex:2026-08-23T18:21:18+02:00 -->

- `design/asset-anforderungen.md` vollständig gelesen und als bindende Bildquelle in die aktiven
  CODEX-Regeln und die Asset-Pipeline aufgenommen.
- Chroma-Key als zulässige Option aus dem Asset-Brief entfernt; neue Native-Alpha-Promptvorlage
  und Claudes vollständiges sechsteiliges Abnahmegate ergänzt.
- 72 promptartige CODEX-Dateien klassifiziert: aktive Vorlagen sauber, 15 alte Chroma-Nennungen
  ausschließlich in historischen Arbeitsständen belassen. Keine Bild- oder Runtime-Änderung.

<!-- codex:2026-08-23T18:52:28+02:00 -->

- Claudes externen Nachtrag geprüft: zwei aktive Chroma-Prompts unter
  `Downloads\ASSETS\newGPTAssets\` vollständig auf natives Alpha umgeschrieben und als
  überschreibfertige TXT-Dateien in `CODEX/outbox/2026-08-23-newGPTAssets-native-alpha/`
  bereitgestellt.
- Je 33 exakte PNG-IDs und sechs Alpha-Pflichtblöcke bestätigt; `#FF00FF` und die widerlegte
  Behauptung saumfreier Magenta-Extraktion entfernt. Externe Kopie bleibt wegen Schreibgrenze auf
  `G:\GameDev` offen. Keine Bilder oder Runtime-Dateien verändert.

## 2026-08-23 — Neuguss-Pilot, erste drei Kreaturen

<!-- codex:2026-08-23T20:47:23+02:00 -->

- `mire_wisp`, `elite_crypt_icemage` und `elite_high_wyvern` referenzgebunden mit eingebautem
  ImageGen auf Rein-Grün neu erzeugt und in mehreren pinken Kontrastprüfungen freigestellt.
- Randverbundene Grün-Matte für das blaugrüne Irrlicht eingeführt; globale, motivzerstörende Matte
  verworfen. Despill, Teilalpha und Ein-Pixel-Kantenkorrektur auf alle drei Finals angewandt.
- Drei exakte 1254×1254-RGBA-PNGs nach `ASSETS/neuguss-2026-08-23/fertig/` geliefert; technischer
  Scan ohne sichtbares Magenta, helles Rein-Grün oder grün-dominante Teilalpha-Kanten.
- Keine Runtime-Datei verändert. Restliche elf Motive warten auf die Chef-Zwischenabnahme.

## 2026-08-23 — Neuguss Promptdatei 1 nach Zwischenabnahme

<!-- codex:2026-08-23T21:24:26+02:00 -->

- Chefkorrektur übernommen: weiches `mire_wisp` erhalten und `elite_high_wyvern` massiver mit
  zusätzlichen Rückenstacheln neu geliefert.
- `elite_slag_revenant` und `elite_coast_crab` referenzgebunden erzeugt, als farbsichere harte
  Motive kontrolliert freigestellt, despillt, kontrastgeprüft und mit exakten IDs abgelegt.
- Fünf Finals technisch gescannt: 1254×1254 RGBA, transparente Ecken, Teilalpha, keine sichtbaren
  Magenta- oder Key-Farbreste; Werte und Hashes im neuen Batch-QA.
- Neun komplexe Motive nach echten Alpha-Fehlschlägen nicht gekeyt und nicht ausgeliefert; ihre
  eingebrannten Schachbrett-/Weiß-Rohbilder bleiben ausschließlich im Arbeitsordner.
- Keine Runtime- oder `.claude/**`-Änderung; Companions noch nicht begonnen.

## 2026-08-24 — Neuguss und 21 Begleiter abgeschlossen

<!-- codex:2026-08-24T12:35:04+02:00 -->

- Alle 17 Neugüsse referenzgebunden fertiggestellt und exakt benannt in den vorgesehenen
  `fertig/`-Ordner gelegt. Nach Chefhinweis eingeschlossene weiße Schachbrettfelder entfernt und
  auf Schwarz, Grau und Magenta erneut visuell geprüft.
- Alle 21 Companion-Prompts als getrennte Motive mit eingebautem ImageGen umgesetzt. Natives
  RGBA beibehalten, farbige Niedrigalpha-Ränder motivfarbenkorrigiert und auf 1024×1024 mit
  800-Pixel-Silhouette normalisiert.
- Finalscan über 38 PNGs: vollständige exakte Dateisätze, keine technischen Verletzungen bei
  Maß, RGBA, Alpha oder Eckentransparenz. QA, Hashes und Kontaktbögen im CODEX-Arbeitsbereich.
- Keine Runtime-, Save-, i18n- oder `.claude/**`-Änderung; keine Produktionsintegration.

## 2026-08-24 — Companion-Neuguss mit zwei Bildserien

<!-- codex:2026-08-24T14:25:00+02:00 -->

- Ersten 21er-Companion-Batch nach direkter Chefkorrektur als zu naturtiernah verworfen und alle
  Begleiter mit eigenständiger, unmöglicher Fantasieanatomie neu gestaltet.
- Je ID ein Kartenmotiv und eine anatomisch gebundene, nach rechts gerichtete Kampfvariante erzeugt;
  insgesamt 42 Finals nach `fertig/card/` und `fertig/fight/` geliefert.
- Native Karten-Alphas kantenkorrigiert; neutrale Schachbrett-Rohhintergründe der Kampfvarianten
  komponentenweise entfernt. Auf Schwarz, Grau und Magenta keine weißen Restflächen oder Farbsäume.
- Final-QA bestanden: beide Serien vollständig und exakt benannt, 1024×1024 RGBA, transparente
  Ecken, Voll- und Teilalpha, Zielgröße der Silhouette eingehalten; Hashes und Werte dokumentiert.
- Verworfene 21 Alt-PNGs wiederherstellbar nach `CODEX/work/2026-08-24-companions-redesign/rejected-too-natural/`
  verschoben. Keine Runtime-, Produktdaten- oder `.claude/**`-Datei verändert.

## 2026-08-24 — Generische Patchnotes-Artworks

<!-- codex:2026-08-24T15:10:00+02:00 -->

- Versionsneutrale Ashen-Iron-Hintergrundillustration mit eingebautem ImageGen erzeugt und als
  wiederverwendbares Reparatur-/Verstärkungsmotiv für Hotfixes, Patches und Updates aufbereitet.
- Offizielles Grim-Reach-Logo und `PATCH NOTES` in Projekt-Cinzel deterministisch gesetzt; zwei
  finale PNGs in 1920×622 und 800×450 samt Vorschau, Quelle, Prompt und QA abgelegt.
- Beide Zielmaße und Hashes geprüft. Keine Runtime-, Produktdaten- oder `.claude/**`-Änderung.

## 2026-08-25 — Runen Tier IV und Schmuck-Linie

<!-- codex:2026-08-25T11:52:00+02:00 -->

- Vollständigen Brief, 14 Motivprompts, Assetvertrag, Claude-Rollen und Bestandsrunen geprüft.
  Designauflösung für Waffen-, Rüstungs- und Schmucklinie in Teil B des Briefs ergänzt.
- Drei Linienanker und elf Folgerunen mit eingebautem ImageGen erzeugt. Ausschließlich native
  Alpha-Ausgaben übernommen. Sechs Fassungen mit gemaltem Schachbrett technisch verworfen.
- 14 Rohdateien erhalten und 14 Finals ohne Keying auf 1024 × 1024 normalisiert. Exakte IDs,
  32-px-Safe-Area, sRGB, RGBA, Teilalpha und 80- bis 88-prozentige Steinhöhe bestätigt.
- Kontaktbögen auf drei Hintergründen, echte 64-/96-px-Vorschau und Vergleich neben Tier III
  visuell geprüft. Teil C ausgefüllt und Teil D zur Abnahme vorbereitet.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Änderung. Übergabe an Claude erfolgt
  aus `CODEX/assets/runen-tier-iv-2026-08-25/`.

## 2026-08-25 — Chef-Abnahme Runen Tier IV

<!-- codex:2026-08-25T11:00:35+02:00 -->

- Chef hat den vollständigen 14er-Batch ohne Korrekturen angenommen.
- Externe Gegenprüfung bestätigte Maße, RGBA, transparenten Außenrand, exakte IDs, saubere
  Tier-III-Familienbindung, getrennte Linienfarben und Lesbarkeit in Icon-Größe.
- Teil D des Briefs auf GO gesetzt. Die separate 640-px-WebP-Integration durch den zuständigen
  Agenten läuft. Keine Renderer- oder Archivdatei durch Mira verändert.

## 2026-08-25 — Achievement-Kategorie-Embleme

<!-- codex:2026-08-25T20:55:00+02:00 -->

- Vollständigen Asset-Brief, 13 Motivprompts, Alpha-Vertrag, UI-Loader, Warden-Ring-CSS,
  Bestandsicons und Runenanker geprüft. Teil B des Briefs vor Produktionsbeginn ausgefüllt.
- Trophäe, Kampf und Schriftrolle zuerst als native Alpha-Anker erzeugt und im exakten
  28-in-46-Ring geprüft. Danach den vollständigen Zehnerbatch im selben Serienkern umgesetzt.
- Amboss und Truhe nach der Maßprüfung als kompaktere Fassungen neu erzeugt. Alle zehn
  Pflichtembleme erreichen 434 oder 435 px opake Motivhöhe auf dem 512er-Canvas.
- Den flachen P2-Meilenstein zusätzlich ersetzt. Die bereits gemalte Kopf-Trophäe und
  Freigeschaltet-Plakette nach dem Qualitätsvergleich bewusst unverändert gelassen.
- 11 unveränderte 1254er-Raws und 11 finale 512er-PNGs geliefert. Native Alpha-Ausgaben nur
  transparent beschnitten, proportional skaliert und zentriert; kein Keying oder Freistellen.
- Finale QA samt Hashes, Schwarz-/Grau-/Grellrosa-Bögen, fünf Rarity-Ringen, gesperrter Reihe,
  Kleinformaten und Runenvergleich abgeschlossen. Brief Teil C dokumentiert; Teil D zur
  bindenden Gegenprüfung vorbereitet.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert. Übergabe erfolgt aus
  `CODEX/assets/achievement-icons-2026-08-25/` an Claude beziehungsweise `asset-integrator`.

## 2026-08-25 — Jägerumhang für den Slayer-Shop

<!-- codex:2026-08-25T21:34:00+02:00 -->

- Brief, Prompt, Assetvertrag und Slayer-Shop-Entscheid §4.4 geprüft. Bestandsumhänge,
  Slayer-Ausrüstung und Brenna-Porträt als Stil- und Wertigkeitskorridor verglichen.
- Zwei native Alpha-Fassungen des Jägerumhangs mit eingebautem ImageGen erzeugt. Einen vorherigen
  Entwurf mit halbtransparenter brauner Studiofläche technisch verworfen und nicht ausgeliefert.
- Variante A nach dem 48-/96-/128-px-Vergleich gewählt. Sie trägt die klarere Umhangsilhouette,
  sichtbares stumpfes Grünfutter, eine kleine Reißzahn-Schließe, Flicken und Saumkerben, bleibt aber
  unter der Material- und Ornamentwertigkeit des Seefahrer-Umhangs.
- Gewählte Fassung ohne Keying auf 1024 × 1024 normalisiert und exakt als
  `slayer_hunters_cape.png` geliefert. Beide gültigen 1254er-Generatorausgaben liegen unverändert
  in `raw/`.
- Technische QA bestanden: sRGB-RGBA, benutztes Alpha, Außenrand vollständig transparent,
  Motivhöhe 880 px, keine Glüh-, Hintergrund- oder Saumverletzung. Hashes und Kontaktbögen
  dokumentiert.
- Brief Teil B bis D, README und Übergabe abgeschlossen. Keine Renderer-, Content-, Save-, i18n-
  oder `.claude/**`-Datei verändert.

## 2026-08-26 — Belohnungsladen: sieben Kapitel-Belohnungen

<!-- codex:2026-08-26T10:26:05+02:00 -->

- Asset-Brief, sieben Serienprompts, Alpha-Vertrag, bindenden Belohnungsladen-Entscheid und
  typgleiche Bestandsitems geprüft; Designauflösung in Teil B festgehalten.
- Chronisten-Signet und Auftragsmarke zuerst als Serienanker mit eingebautem ImageGen erzeugt und
  auf drei Hintergründen geprüft. Danach fünf Folgestücke im gleichen Licht- und Materialguss
  umgesetzt.
- Fassungen mit knappem Rand, Schachbrett, Studiovignette oder zu leuchtendem Ascheriss verworfen.
  Ausschließlich sieben native Alpha-Erzeugungen in `raw/` übernommen.
- Sieben Finals ohne Keying auf 1024 × 1024 normalisiert und exakt nach den Content-IDs geliefert.
  Technische Gates für sRGB-RGBA, transparenten Außenrand, 80- bis 90-prozentige Motivhöhe und
  exakte Dateimenge bestanden; Hashes in `qa.json` dokumentiert.
- Schwarz-/Grau-/Grellrosa-Bögen, Bestandsvergleich und 48-/96-/128-px-Kontaktbogen visuell
  geprüft. Brief Teil C/D, README und Übergabe abgeschlossen.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Stil-Parität: 47 Item-Bilder

<!-- codex:2026-08-26T14:18:00+02:00 -->

- Asset-Brief, 47 Einzelprompts, Bestandsreferenzen und Alpha-Vertrag geprüft; Designauflösung
  und autonomes Qualitäts-Gate in Teil B dokumentiert.
- 47 Motive mit eingebautem ImageGen im Standardmodus und nativem Alpha erzeugt: A1 10 Bögen,
  A2 8 Magie-Items, A3 11 Lederteile, A4 16 Stoffteile und A7 2 Tonika.
- Nach Chef-Hinweis sämtliche zehn Bögen neu gegossen und einzeln auf funktionale Bogenmechanik
  geprüft: durchgehender Stab, ausbalancierte Wurfarme, klare Nocken, gerade gespannte Sehne.
- Drei zu breite A4-Paarfassungen kompakter neu erzeugt. Alle 47 angenommenen Raws unverändert
  archiviert; Finals ohne Keying proportional auf 1024 × 1024 bottom-center normalisiert.
- Technische QA bestanden: exakte Dateimenge und IDs, sRGB-RGBA, Alpha 0 bis 255, äußerer
  16-px-Rand Alpha 0, Motivhöhe 850 bis 880 px. Hashes in `qa/qa.json`.
- Je Gruppe Schwarz-/Grau-/Grellrosa-/Transparent-Bögen, Bestandsvergleich und
  48-/96-/175-px-Probe visuell geprüft. Brief Teil C/D, README und Übergabe abgeschlossen.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert. Übergabe aus
  `CODEX/assets/stil-paritaet-2026-08-26/` an Claude und danach `asset-integrator`.

## 2026-08-26 — Item-Wiki-Modal: fünf Mockup-Richtungen

<!-- codex:2026-08-26T14:48:00+02:00 -->

- Chef-Screenshot, Ashen-Iron-/Gravewood-Vorgaben und UI-Revierregeln geprüft; freien Auftrag in
  einen lokalen Brief und fünf strukturierte Prompts übertragen.
- Fünf eigenständige High-Fidelity-Mockups mit eingebautem ImageGen im Standardmodus erzeugt:
  Buchregister, Herstellungsgraph, filterbares Archiv, Tabellenindex und Item-Showcase.
- Alle fünf Bilder einzeln visuell geprüft, im Staging gesichert und in einem nummerierten
  Kontaktbogen zusammengeführt.
- Variante 3 als beste Balance aus Item-Präsenz, langer Rezeptliste und späterer HTML/CSS-
  Umsetzbarkeit empfohlen; Chefentscheidung ausstehend.
- Keine Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Main-Menü und Item-Stack, je fünf Design-Mockups

<!-- codex:2026-08-26T16:03:00+02:00 -->

- Aktuellen Main-Menü-Screenshot, `MainMenu.tsx`, `menu.css`, das aktuelle Item-Stack-Modal und
  die zuvor abgenommene Ashen-Iron-Wiki-Richtung als Referenzen geprüft.
- Fünf gepaarte Designfamilien ausgearbeitet und mit dem eingebauten ImageGen-Werkzeug erzeugt:
  Ashen Gate, War Table, Black Chronicle, Frontline Registry und Ember Reliquary.
- Insgesamt zehn PNG-Mockups geliefert: fünf Main-Menüs und fünf Item-Stack-Modals.
- Alle Dateien auf Format und Abmessung geprüft; pro Screen einen Kontaktbogen sowie einen
  gepaarten Gesamtbogen erstellt und visuell kontrolliert.
- Brief, Prompt-Set und Referenzkopien im Work-Ordner sowie Staging-README ergänzt.
- Keine HTML-, Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Ausgewählte Main-Menüs und Item-Stack als HTML

<!-- codex:2026-08-26T16:42:00+02:00 -->

- Chef-Auswahl Main 01/02/04 und Item-Stack 02 in einen eigenen Standalone-Outbox-Auftrag
  übertragen; MainMenu-Struktur, Styles und passende Originalassets geprüft.
- Vier interaktive HTML-Seiten, gemeinsame Auswahlseite, gemeinsames CSS und JavaScript gebaut.
- Item-Stack mit Variantenwahl, Vergleichspanel, Qualitätswerten, Verkaufspreis und Filterzuständen
  umgesetzt; Main-Menüs mit Sprachwahl und Aktionsfeedback versehen.
- 24 bestehende Grim-Reach-Assets lokal kopiert. Nach Chefkorrektur zusätzlich echtes Gate-Overlay
  und deckenden War-Table-Hintergrund erzeugt und eingebaut.
- Statische QA bestanden; visuelle Browserprüfung mangels verfügbarem Browser-Backend offen
  dokumentiert.
- Keine Produktions-, Renderer-, React-, i18n-, Engine-, Content- oder `.claude/**`-Datei
  verändert.

### Korrekturrunde Großmotive

<!-- codex:2026-08-26T17:08:00+02:00 -->

- CSS-Andeutung des Ashen Gate durch ein vollständiges gemaltes RGBA-Overlay ersetzt.
- Main 02 auf eine neue deckende Grim-Reach-War-Table-Hintergrundkomposition umgestellt.
- Gate-Alpha gemessen, beide Assets gegen Originalpanorama und Logo komponiert und visuell geprüft.
- Zwei schachbrettgemalte RGB-Freistellversuche verworfen; kein Keying eingesetzt.
- README, QA, Promptprotokoll und Handoff korrigiert.

### Item-Stack-War-Table-Schale

<!-- codex:2026-08-26T17:24:00+02:00 -->

- Für das Item-Stack-Modal eine eigene leere War-Table-/Iron-Shell erzeugt und eingebaut.
- Desktop-Grid und Kopf-/Filterhöhen an die gemalte Schale angepasst; Responsive-Fallback auf
  bestehende skalierbare Spielrahmen ergänzt.
- RGB-Maße geprüft und Platzierungs-Komposit mit Originalhelm visuell kontrolliert.

## 2026-08-26 — Item-Wiki HTML-Prototypen 02 und 05

<!-- codex:2026-08-26T15:24:00+02:00 -->

- Aktuelle `ItemWikiModal`-Komponente, Reverse-Indices, Wiki-CSS, Ashen-Iron-Tokens,
  Gravewood-Assets und UI-Dev-Revierregeln geprüft.
- Forge Flow als Quelle→Item→Verwendungen-Prototyp mit vier auswählbaren Beispielquellen,
  Waffen-/Rüstungsfilter und dynamischem Detailband umgesetzt.
- Relic Showcase als Item-Hero mit Mehrquellen-Band, auswählbaren Herkunftswegen, horizontaler
  Verwendungsgalerie und dynamischer Detailzeile umgesetzt.
- Gemeinsame Vergleichsseite, lokale Kopien der vorhandenen Items/Icons/Texturen/Fonts,
  responsive Zustände bei 1180 und 760 px sowie README/QA ergänzt.
- Statisch geprüft: keine fehlenden lokalen Referenzen, JavaScript syntaktisch gültig,
  CSS-Blockstruktur ausgeglichen. Browser-Screenshotprüfung mangels verfügbarem Browser-Backend
  offen dokumentiert.
- Keine Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Main-Menü-Unterseiten, je fünf Design-Mockups

<!-- codex:2026-08-26T18:52:00+02:00 -->

- Aktuelle New-Game- und Character-Creation-Screens, die vorhandene Load-Game-Inhaltsstruktur
  sowie die fünf zuvor entwickelten Hauptmenüfamilien als Referenzen geprüft.
- Je fünf reine Designmockups für New Game, Load Game und Character Creation mit eingebautem
  ImageGen im Standardmodus erzeugt; kein HTML und kein Produktcode.
- Ashen Gate, War Table, Frontline Registry, Black Chronicle und Ember Reliquary konsequent als
  gepaarte Familien über alle drei Screens geführt.
- 15 Einzel-PNGs auf 1672 × 941 RGB geprüft und in drei Stagingordner kopiert. Drei
  Screen-Kontaktbögen und einen familienweise sortierten Gesamtvergleich erzeugt und visuell
  kontrolliert.
- Brief, Promptset, Referenzen, Staging-README und reproduzierbare Hilfsskripte dokumentiert.
- Keine Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Ausgewählte Untermenüs als HTML-Prototypen

<!-- codex:2026-08-26T19:36:00+02:00 -->

- Chef-Auswahl Character Creation 03 sowie Load/New Game 05 in drei eigenständige interaktive
  Standalone-Seiten und eine gemeinsame Auswahlseite übertragen.
- Gemeinsame Ember-Reliquary-Landschaft ohne UI/Text mit eingebautem ImageGen erzeugt. Einen
  RGB-Schachbrett-Helden verworfen und ohne Keying durch den bestehenden echten Alpha-Helden
  ersetzt.
- Save-Slotwechsel, Load-/Leerzustände, Delete-Bestätigung, Name, Porträts, Startstile,
  Schrittleiste und Abschlussfeedback in lokalem JavaScript umgesetzt.
- Spielrahmen, Buttonflächen, Texturen, Logo, Porträts, Stilbilder und Fonts als lokale Kopien
  verwendet; keine Quelle verändert.
- Statische QA bestanden: keine fehlenden Referenzen, JavaScript gültig, CSS-Bilanz ausgeglichen,
  Assetmodi und -maße geprüft. Browser-Live-QA mangels verfügbarer Browserinstanz offen
  dokumentiert.
- Keine Renderer-, React-, produktive CSS-, i18n-, Engine-, Content-, Save- oder `.claude/**`-
  Datei verändert.

## 2026-08-26 — Human-Roster: Vertrag und Pilot

<!-- codex:2026-08-26T20:52:00+02:00 -->

- 30 freigegebene Human-Archetypen in 60 feste, unterscheidbare Identitätsprofile übertragen.
- Serienregeln um identischen Paar-Loadout, moderate geschlechtsspezifische Kleidungsvariation und
  verpflichtende Rechtsorientierung von Körper, Gesicht und Blick ergänzt.
- Sechs Pilotfiguren für Krieger, Feuermagier und Schurke mit eingebautem ImageGen erzeugt; drei
  weibliche Varianten nach Chefkorrektur neu gegossen.
- Sechs referenzgebundene RGB-Fehlausgaben am Alpha-Gate verworfen. Akzeptierte Finals besitzen
  natives RGBA; kein Keying.
- Finals auf Bestandsbelegung normiert, Alpha/Format/Maße gemessen und auf hellem sowie dunklem
  Kontaktbogen visuell geprüft.
- Staging unter `CODEX/assets/human-character-roster-2026-08-26/`; keine Renderer-Integration.

## 2026-08-26 — Buckhide-Set und Jagdbogen

<!-- codex:2026-08-26T21:32:00+02:00 -->

- Fünf Wildleder-Rüstungsteile und einen funktional gezeichneten Jagdbogen mit eingebautem
  ImageGen im Standardmodus erzeugt.
- Ein deckendes Beinling-Ergebnis am Alpha-Gate verworfen und nativ transparent neu erzeugt;
  kein Keying.
- Sechs akzeptierte Raws nach Staging kopiert und Finals slotweise auf 1024² sowie die gemessene
  Bestandsbelegung normiert.
- Format, Alpha, Rand, Content-ID, Slotlesbarkeit, Effektfreiheit und Bogengeometrie geprüft.
- Kontaktbögen auf dunkel, hell, grellrosa, in 48 px und neben `cured_leather_body` sowie
  `bronze_shortbow` erstellt und visuell abgenommen.
- Brief Teil B bis D, Promptprotokoll, README und QA vervollständigt; keine Renderer-Integration.
