# Arena25D — 2,5D-Kampfarena-Prototyp (Task #330)

Chef-GO: "Prototyp einer 2,5D-Kampfarena für 'The Pastures'" — three.js-Szene statt der flachen
2D-Kulisse, mit schwebenden Lebensbalken. **Dies ist ein Prototyp/Proof-of-Concept, kein
Ersatz-Feature für den nächsten Patch** (Chef-Vorgabe: "im nächsten Patch NICHT aktiv").

## Isolation (nicht verhandelbar)

Alles lebt in diesem Ordner. Der Rest des Renderers berührt `arena25d` an genau **einer** Stelle:

- `pages/CombatPage.tsx` — ein Import (`import { Arena25DStage, isArena25dActive } from
  "../components/arena25d";`) + ein JSX-Block markiert mit dem Kommentar
  `ARENA25D MOUNT SWITCH` (innerhalb von `Battle()`, direkt in `.battle-arena`). Der `else`-Zweig
  dieses einen Switches ist **byte-identisch** zur bisherigen 2D-Darstellung — bei Flag aus (der
  Normalfall, immer in Produktions-Builds) läuft exakt derselbe Code-Pfad wie vor Task #330.

**Entfernen:** Ordner `components/arena25d/` löschen, dann in `CombatPage.tsx` den
Import + den `ARENA25D MOUNT SWITCH`-Block gegen seinen `else`-Zweig ersetzen (die vorher
existierende JSX bleibt 1:1 erhalten, nur der `arena25dActive`-Ternary + die `Arena25DStage`-Props
verschwinden). Kein anderer Code im Repo referenziert diesen Ordner.

## Warum das Bundle in Produktions-Builds "tot" bleibt

`flag.ts` exportiert `ARENA25D_SUPPORTED = import.meta.env.DEV`. Vite/esbuild falten
`import.meta.env.DEV` in Produktions-Builds (`pnpm build`) zur literalen Konstante `false`
zusammen — jeder `if (!ARENA25D_SUPPORTED) …`-Zweig und `isArena25dActive(...)` (das intern zuerst
`ARENA25D_SUPPORTED &&` prüft) wird dadurch zu einem statisch auswertbaren `false`. Der Minifier
(esbuild, Vite-Standard) eliminiert den davon abhängigen `Arena25DStage`-JSX-Zweig in
`CombatPage.tsx` als toten Code — inklusive der kompletten `Arena25DStage.tsx`-Modul-Bodies
(Szenen-Aufbau, Billboards, Nebel-Shader, Partikel-Pool …). `three` selbst verschwindet NICHT aus
dem Bundle (das bestehende, App-weite `AmbientCanvas.tsx`/Bloom importiert es bereits unbedingt),
aber jeder arena25d-eigene Code ist unerreichbar.

Styles laufen bewusst über `styles.ts` (ein per `ARENA25D_SUPPORTED`-Gate injizierter `<style>`-Tag)
statt eines statischen `import "./arena25d.css"` — ein CSS-Side-Effect-Import wird von
Rollup/Vite beim Sammeln des Modul-Graphen unbedingt eingesammelt und landet dadurch IMMER im
finalen CSS-Bundle, unabhängig davon, ob das zugehörige JS später als toter Code erkannt wird (das
wurde bei einer früheren Zwischenfassung dieses Prototyps empirisch beobachtet: 0 Byte JS, aber
alle `.a25-*`-Selektoren trotzdem im CSS-Output). Als gated JS-String verschwindet auch das CSS
vollständig — siehe "Bundle-Beweis" im Abschlussbericht für die konkrete Grep-Verifikation gegen
den echten `pnpm build`-Output.

**Bekannte, bewusst akzeptierte Ausnahme — die beiden Chef-Texturen selbst:** anders als CSS-
Side-Effect-Importe lässt sich ein Bild-Asset-Import (`import x from "./foo.webp"`) nicht über
denselben "als String gaten"-Trick unsichtbar machen (Vites Asset-Pipeline löst den Datei-Pfad
statisch beim Build auf und kopiert die Datei IMMER in `dist/assets/`, unabhängig von der späteren
JS-Erreichbarkeit — dieselbe Klasse von Limitierung wie beim CSS-Import, nur ohne den einfachen
Workaround, weil ein Bild kein Text ist, den man als JS-String tarnen könnte). Ein echter
Produktions-Build enthält dadurch `pastures_ground.webp` (~635 KB) + `pastures_backdrop.webp`
(~289 KB) als zwei INERTE Dateien im Asset-Ordner — kein einziger Byte JS/CSS referenziert oder
lädt sie (s. Bundle-Grep im Abschlussbericht: 0 Treffer für jeden arena25d-JS-Bezeichner), sie
liegen einfach ungenutzt neben den Hunderten anderen Content-Assets. Das erfüllt die Chef-Vorgabe
"Bundle enthält den Code nicht BZW. er ist unerreichbar" über die zweite Klausel (unerreichbar —
kein Spieler-Build-Codepfad kann diese Dateien je anfordern) und ist bei ~0,9 MB von insgesamt
vielen zig MB Asset-Payload (Studio-Intro-Video allein: 7,4 MB) vernachlässigbar.

## Wie der Chef testet

Der Prototyp braucht ZWEI Bedingungen gleichzeitig: einen **Dev-Build** (`pnpm --filter
@hearthforge/client dev`, NICHT die gepackte Steam-Version) **und** den Chef-Schalter an.

1. Spiel im Dev-Modus starten, in einen Kampf in **"The Pastures"** gehen (normaler Zonen-Kampf,
   kein Dungeon/Turm/Paragon — der Prototyp deckt bewusst nur diese eine Zone ab).
2. Schalter umlegen — zwei gleichwertige Wege:
   - **Tastenkürzel:** `Strg+Umschalt+A` (Ctrl+Shift+A), funktioniert überall im Spiel, auch
     mitten im laufenden Kampf. Ein Druck schaltet um (Konsolen-Log bestätigt `[arena25d] ON/OFF`).
   - **DevTools-Konsole** (F12 im Electron-Fenster bzw. im Browser-Dev-Server):
     `localStorage.setItem('gr.arena25d', '1')` zum Anschalten,
     `localStorage.removeItem('gr.arena25d')` zum Ausschalten.
3. Die Umschaltung wirkt **sofort**, ohne Reload/Kampf-Neustart — `Battle()` re-rendert ohnehin
   10×/s (bestehender Combat-Tick-Puls), der Mount-Switch prüft das Flag bei jedem dieser
   Re-Renders frisch.
4. In jeder anderen Zone (oder mit dem Schalter aus) bleibt die Kampfdarstellung exakt die
   bestehende 2D-Ansicht — keine sichtbare Änderung, kein Performance-Unterschied.

## Architektur der Szene (Stand Task #330c)

- **Kamera:** `THREE.PerspectiveCamera`, Pitch ≈30° (Chef-Vorgabe #330c Punkt 1 "mach Kamerawinkel
  statt 45° mal 30°" — flacher als der #330b-Ausgangswert ≈36°). Sehr dezente Sinus-Idle-Drift + ein
  kurzer Kamera-Kick bei Crit-Treffern. Beides läuft NUR bei `fxLevel === "full"` — bei
  `prefers-reduced-motion` (übersteuert das Options-Toggle immer, s. `Battle()`s `fxLevel`-Memo) ist
  die Kamera vollkommen statisch.
- **Boden:** `assets/arena25d/pastures_ground.webp` (1536×1024) auf einer flach liegenden
  `PlaneGeometry`, STRETCHED (Task #330c Punkt 3, Chef-Vorgabe explizit) — `ClampToEdgeWrapping`,
  UV 0..1, kein Repeat mehr (ersetzt das `MirroredRepeatWrapping`-Kachelmuster aus #330b). Maximale
  Anisotropie bleibt.
- **Backdrop:** `assets/arena25d/pastures_backdrop.webp` (nur die oberen ~70%, Feldweg im unteren
  Drittel weggecroppt) auf einer GEBOGENEN Fläche (Task #330c Punkt 2, "curven wie ein
  Curved-Monitor") — ein per Hand gebauter Zylinder-Ausschnitt (`buildCurvedBackdropGeometry`,
  keine `THREE.CylinderGeometry`, volle Kontrolle über Normalen/Winding/UV), Mitte auf der alten
  Flachwand-Tiefe, Enden biegen sich sanft (`BACKDROP_CURVE_RADIUS`) Richtung Kamera vor — deckt
  dadurch auch die äußersten Bildschirmecken bei Ultrawide ab (behebt die dunklen toten Keile
  links/rechts der alten Flachwand). Material ist UNLIT (`MeshBasicMaterial`, nicht
  `MeshStandardMaterial`) — die Kulisse ist eine fertig gemalte Fläche wie eine Skybox, kein
  physisches Objekt; mit einem lichtempfindlichen Material schlug die gebogene Fläche (variierende
  Normalen) ungleichmäßig auf die gerichtete Sonne (s.u.) an und kippte kühl/stürmisch statt den
  warmen gemalten Ton zu zeigen. Eine dritte, kleine Plane mit einer prozedural per `<canvas>`
  erzeugten Verlaufstextur kaschiert die Boden↔Kulisse-Nahtstelle.
- **Licht (Task #330c Punkt 4):** ein gerichtetes warmes Key-Light ("Sonne", `0xffd9a0`) von schräg
  oben UND leicht rechts (passend zum gemalten Sonnenstand der Kulisse), zielt auf die Bodenmitte.
  Dazu ein dezentes, kühleres `THREE.HemisphereLight`-Fill (Himmel bläulich-kühl / Boden warmer
  Bounce) — Boden UND Sprites stehen dadurch im selben Licht wie die Kulisse. Eine kleine additiv
  geblendete Sonnenscheibe/Glow (Canvas-Sprite, kein Asset) sitzt hoch am Himmel vor der Kulisse.
- **Kämpfer als Billboards:** zwei `PlaneGeometry`-Meshes (Pivot am Fuß), Textur = dieselben
  Portrait-/Monster-/Elite-Bild-URLs wie im 2D-Modus (`getPortrait`, `getMonsterSrc`,
  `getEliteMonsterSrc` — **unverändert von CombatPage übergeben**, keine eigene Bildauflösung).
  **Zylindrisches Billboarding** (Task #330c Punkt 6-Fix): NUR Gier-Rotation um die Y-Achse
  (`Math.atan2` gegen die Kamera-Position), NICHT die volle Kamera-Quaternion. Ein "sphärisches"
  Billboard (volle Quaternion-Kopie) lehnt die Figur um den Kamera-Pitch nach hinten — der gemessene
  Fuß-Pixel (s.u.) landet dadurch trotz korrektem `feetOffset` sichtbar zu hoch. Zylindrisch hält
  die Figur aufrecht wie einen Pappaufsteller, exakt das gewünschte Octopath-Bild, UND hält den
  Boden-Kontaktpunkt exakt. Weicher elliptischer Kontaktschatten (Canvas-Radial-Gradient-Textur,
  kompakterer Falloff seit #330c als zuvor) direkt unter den Füßen. Leichtes Sinus-"Atmen" (Bob) und
  eine Angriffs-Lunge (Translation Richtung Bildmitte + zurück, ease-out/ease-in, 400ms) beim
  `attackNonce`-Wechsel.
- **Fuß-Baseline (Task #330b/#330c, Punkt 6):** pro Sprite-Textur wird einmalig (gecacht pro URL)
  die tatsächlich unterste Alpha>16-Pixelzeile gemessen (`measureSpriteBaseline`) — die Figur wird
  so verschoben, dass DIESE Zeile (nicht die PNG-Kante) auf dem Boden aufsetzt. Die Messung selbst
  war schon in #330b korrekt; der verbleibende sichtbare Versatz kam vom sphärischen Billboarding
  (s.o.), nicht von der Messung — per Ground-Truth-Marker-Debugging in #330c verifiziert.
- **Schwebende HP-/Ward-Balken:** siehe `Arena25DStage.tsx`-Moduldoc — 3D-Kopfposition wird pro
  Frame auf den Bildschirm projiziert (`Vector3.project(camera)`), ein DOM-Anker-Div bekommt den
  projizierten Punkt als `transform: translate(...)` (imperativ, React rührt dieses Attribut nie
  an). Der eigentliche Balken-Inhalt ist eine 1:1-Kopie von `Bar()`/`Fighter`s Nameplate-Markup
  (dieselben globalen `.cbar`/`.cbar-fill`/`.cbar-label`-Klassen aus `styles/combat.css`) — echter,
  gestochen scharfer DOM-Text, keine Textur, i18n-Zahlenformat (`formatNum`/`formatStat`) und Icons
  (`statIcon`) 1:1 wiederverwendet.
- **Schadens-/Heil-Floater (Task #330c Punkt 5, `FloaterList`/`Arena25DFloaterInput`):** derselbe
  Ansatz wie die HP-Balken — ein zweiter, tiefer angesetzter Anker-Satz (Brusthöhe statt Kopf) wird
  pro Frame projiziert, der Inhalt ist eine 1:1-Darstellungs-Kopie der `.dmg-number`-Zweige aus
  `Fighter()` in CombatPage.tsx (dieselben globalen CSS-Klassen/Keyframes aus `styles/combat.css` —
  Hit/Crit rot-gold, Heilung grün mit Quell-Icon, Ward-Absorb cyan, Miss blau, DoT/Lifesteal/Proc/XP
  ebenfalls abgedeckt). CombatPage übergibt sein bestehendes `floaters`-State-Array (gefiltert nach
  Seite) unverändert in die Arena25DStage-Props — dieselbe Event-Quelle wie die 2D-Ansicht, KEIN
  eigener Combat-Event-Konsum.
- **Effekte:** ein `THREE.PointLight`, das bei jedem gelandeten Treffer kurz aufflackert (Intensität
  hoch, exponentieller Zerfall `*= 0.88` pro Frame) und Boden+Figuren einfärbt (echte
  `MeshStandardMaterial`, reagiert auf Licht — anders als die reinen `MeshBasicMaterial` im
  einfacheren `AmbientCanvas`-Vorbild). Kurzer Weißblitz auf der getroffenen Figur (Material-Farbe
  kurz Richtung hell gelerpt). Ein rundum-gepooltes `THREE.Points`-System (30 Partikel, round-robin
  recycelt, tote Partikel geparkt statt entfernt) für einen kleinen Funken-Burst am Einschlagpunkt.

## Task #330d — Feinschliff Runde 2 + volle Bar-/Status-/Kill-Card-Parität

Chef-Screenshot (3440×1440) brachte 5 präzise Befunde, ein Chef-Nachtrag während der Umsetzung
erweiterte den Auftrag um volle UI-Parität der schwebenden Anzeigen mit der 2D-Ansicht:

1. **Ultrawide-Bodenbreite:** `GROUND_WORLD_WIDTH`/die Kulissenbreite sind jetzt an das aktuelle
   Seitenverhältnis gekoppelt (`resize()`s `widthScale = max(1, aspect/REFERENCE_ASPECT)`, s.
   dortiges JSDoc für die Herleitung) — bei 1920×1080 (REFERENCE_ASPECT) exakt Faktor 1 (Chef-
   Vorgabe "1920×1080 darf sich nicht verändern"), bei Ultrawide skaliert Boden UND Kulisse
   automatisch mit. Keine dunklen Keile mehr an den unteren Bildschirm-Ecken.
2. **Nebelschleier entfernt:** `scene.fog` UND die separate `fogSeam`-Canvas-Gradient-Plane
   (samt `makeFogGradientTexture`) sind komplett raus — harte, saubere Boden↔Kulisse-Naht statt
   eines aufgelegten grauen Schleiers (Chef hat das ausdrücklich als OK abgesegnet).
3. **Spieler 2× so groß:** `PLAYER_FIGURE_HEIGHT = FIGURE_HEIGHT * 2`, Gegner-Skala unverändert
   (`Billboard.figureHeight` ist jetzt pro Board, nicht mehr eine globale Konstante). Folgefund
   beim Pflicht-Framing-Check (Chef: "danach prüfen ... Anker sitzen noch"): der alte lineare
   `figureHeight * BAR_ANCHOR_Y_FACTOR`-Ankerplatz hätte die Karte komplett über den Canvas-Rand
   hinaus verortet — `barAnchorHeight()` dämpft den Zuwachs oberhalb von `FIGURE_HEIGHT` (Faktor
   0.6, empirisch gegen echte Bildschirm-Projektionen kalibriert), die Karte sitzt jetzt auf
   Schulterhöhe mit sattem Rand-Abstand statt hoch über dem Kopf abgeschnitten zu werden.
4. **Sonnenlicht von vorne:** Key-Light-Position gedreht (Z deutlich näher an die Kamera-Seite,
   s. `sun.position`-JSDoc für die N·L-Herleitung) — die Billboards (deren Normale bauartbedingt
   IMMER horizontal zur Kamera zeigt) sind jetzt sichtbar front-beleuchtet statt Silhouette; die
   Sonnenscheibe am Himmel bleibt unverändert an ihrer Position.
5. **Kein Idle-Hover mehr:** das Sinus-"Atmen" (Bob) ist komplett raus, Sprites stehen im Leerlauf
   still. Lunge (Angriff) und Flash/Recoil (Treffer) bleiben unverändert.
6. **Mana-/Angriffsbalken:** `Arena25DFighter` trägt jetzt `manaCur/manaMax` (nur Spieler, gleiche
   `showManaBar`-Ableitung wie 2D) und `timerPct/timerRemainingSec` (beide Seiten) — `NameplateOverlay`
   stapelt Name → Status → HP → Mana → Ward → Timer, exakt die 2D-Reihenfolge.
7. **Status-Effekt-Icons:** `Arena25DFighter.effects` (dieselbe `StatusEffect[]`-Quelle wie
   `cs.playerEffects`/`cs.enemyEffects`), gerendert über `StatusEffectRow` (dieselben
   `renderEffectIcon`/`.effect-badge`-Bausteine wie 2D, kompakter gestapelt statt als Eck-Overlay).
8. **Kill-Summary-Karte:** `Arena25DStageProps.killSummary` — CombatPage rendert `<KillSummaryCard>`
   SELBST (dieselbe Komponente/derselbe `cs.lastKill`-State wie 2D, kein Duplikat) und reicht das
   fertige Element durch; `.a25-root` ist bereits `position:absolute`, die Karte zentriert sich über
   ihr eigenes CSS automatisch über dem gesamten Canvas. Damit ist der einzige verbliebene Punkt aus
   der bisherigen Scope-Cut-Liste unten geschlossen. Eine Spieler-Tod-Anzeige gibt es AUCH in der 2D-
   Ansicht nicht (nur eine Log-Zeile, `combat.defeat`) — nichts zum Nachbauen.

## Was der Prototyp bewusst NICHT kann (Scope-Ehrlichkeit)

Das hier ist ein Beweis, dass die 2,5D-Optik technisch funktioniert und sich sauber isolieren
lässt — bewusst NICHT die volle Feature-Parität zur bestehenden 2D-Kampf-FX-Palette:

- **XP-Drops/Status-Text-Floater sind über den generischen `FloaterList`-Zweig mit abgedeckt**
  (Task #330c Punkt 5 hat die Damage-/Heal-Floater nachgezogen). Das Combat-Log rechts zeigt
  weiterhin JEDE Zahl zusätzlich unverändert (Kampf-Logik/Ergebnis ist zu 100% unberührt).
- **Kein Bloom-Postprocessing** (Chef-Spec nannte es "optional dezent") — bewusst weggelassen, um
  die Perf-/Komplexitätsfläche für einen Prototyp klein zu halten (kein `EffectComposer`, direktes
  `renderer.render()`).
- **Kein separater Cast-/Magier-Sonderanimation** (die 2D-Ansicht hat eine eigene
  `CAST_KEYFRAMES`-Animation für Magier statt der physischen Lunge) — der Prototyp nutzt für alle
  Stile dieselbe Lunge-Bewegung.
- **Kein Pet-Begleiter-Sprite in der 3D-Szene** — das Pet bleibt (falls ausgerüstet) in diesem
  Prototyp unsichtbar während die Arena aktiv ist (die Kampflogik/Pet-Effekte selbst laufen
  unverändert weiter, nur die visuelle Pet-Figur fehlt).
- **Nur EINE Zone** ("The Pastures", per Chef-Auftrag) — jede andere Zone/jeder Dungeon/Turm/
  Paragon-Lauf zeigt unverändert die bestehende 2D-Ansicht, auch bei Flag an.
- **Nur zwei Ebenen** (Boden + Hintergrund, beide jetzt mit dedizierten Chef-Texturen, s.o.) —
  keine dritte Mittelebene (z.B. Zaun-/Hügel-Streifen mit Alpha-Freistellung, im Chef-Auftrag
  explizit als "optional" markiert) — dafür wäre ein eigenes, händisch zugeschnittenes Layer-Asset
  mit echtem Alpha-Freisteller nötig, das es heute nicht gibt.
  **[Update 0.4.0-Arena Welle 1, s.u.]** — inzwischen NACHGEZOGEN als dekorativer Prop-Billboard-
  Layer (Bäume/Büsche etc.), s. Abschnitt unten.
- **"Nur EINE Zone"** war Task-#330-Stand. **[Update 0.4.0-Arena Welle 1]** — jetzt datengetrieben:
  jede Zone MIT einem gültigen `manifests/<zoneId>.json` ist arena-fähig, s.u. Heute weiterhin nur
  "pastures" (das einzige bisher gelieferte Manifest), aber keine Code-Änderung mehr nötig, um eine
  weitere Zone freizuschalten — nur eine neue JSON-Datei + Mira-Texturen.

## Standalone-EXE — Scene-Builder als doppelklickbares Chef-Werkzeug (2026-08-05)

Der Arena-Scene-Builder (`builder/`) ist als SEPARATES Build-Ziel des Clients auch außerhalb des
Dev-Servers baubar — eine portable Windows-EXE, die direkt in den Builder startet
(`?sceneBuilder=pastures` wird vom Main-Prozess mitgegeben, Zone danach im Dropdown wechselbar).

**Bauen:**

```
pnpm --filter @hearthforge/client package:scenebuilder
```

(= `scripts/package-scenebuilder.mjs`: setzt `SCENE_BUILDER_BUILD=1`, baut per `electron-vite build`
in den separaten Root `out-scenebuilder/` und packt per
`electron-builder --config electron-builder-scenebuilder.json`.)

**Ausgabepfade:**

- `apps/client/out-scenebuilder/` — Vite-Build (main/preload/renderer) der Builder-Fassung.
  Bewusst ein EIGENER Root: `out/` enthält NIE eine Builder-aktivierte Fassung, das
  Spieler-Packaging (`electron-builder.json` liest `out/**`) kann sie nicht einsacken.
- `apps/client/release-scenebuilder/GrimReach-SceneBuilder.exe` — die portable EXE
  (+ `win-unpacked/` für Tests).
- `G:\GameDev\SceneBuilder.exe` — Kopie der EXE im Repo-Root (Chef-Startpunkt per Doppelklick,
  in `.gitignore`), wird vom Skript nach jedem erfolgreichen Packaging aktualisiert.

**Eigene App-Identität:** appId `com.hearthforge.scenebuilder`, App-Name "Grim Reach Scene
Builder" ⇒ eigener userData-Pfad, keinerlei Berührung mit den Spiel-Saves unter
`%APPDATA%\Grim Reach\`. Fenster: immer windowed 1920×1080, kein Save-on-Close-Handshake
(Fenster-X beendet sofort). F11/F12 funktionieren wie im Spiel.

**Assets sind eingebacken:** Die Palette entsteht zur BUILD-Zeit aus `assets/arena/*.webp`
(`import.meta.glob`). Neue Arena-Assets (Mira-Lieferungen) tauchen in der EXE erst nach einem
erneuten `package:scenebuilder`-Lauf auf — für tagesaktuelle Asset-Arbeit bleibt der Dev-Server
(`?sceneBuilder=<zoneId>`) der schnellere Weg.

**Drittes Gate im Tree-Shaking-Vertrag:** `builder/flag.ts` exportiert seit diesem Auftrag
`SCENE_BUILDER_SUPPORTED = import.meta.env.DEV || __SCENE_BUILDER_BUILD__`.
`__SCENE_BUILDER_BUILD__` ist eine Vite-`define`-Konstante (electron.vite.config.ts, Typ in
`src/vite-env.d.ts`), nur im `SCENE_BUILDER_BUILD=1`-Build `true`. Im normalen Spieler-Build
(`pnpm build` ohne Env-Var) steht dort literal `false || false` — wird exakt wie bisher konstant
gefaltet, der komplette Builder-Ordner bleibt nachweislich 0 Byte im Spieler-Bundle (Bundle-Grep
gegen `out/renderer/assets/*.js` UND `out/main/index.js` nach jedem einschlägigen Umbau
wiederholen!). Dieselbe `|| __SCENE_BUILDER_BUILD__`-Erweiterung tragen auch die drei weiteren
DEV-Gates, die der Builder zur Laufzeit braucht: der Registry-Aufbau in `manifest.ts` sowie
`KNOWN_ZONE_IDS`/`ARENA_ASSET_PALETTE`/`PLACEHOLDER_PALETTE` in `builder/assetPalette.ts` (ohne
sie stünde die EXE vor leerem Zonen-Dropdown und leerer Palette — im Spieler-Build falten sie
identisch zu `false`).

## 0.4.0-Arena, Logik-Welle 1 (Chef-Entscheid 2026-08-03) — Zonen-Manifest-System

Ersetzt die Task-#330-Hartcodierung ("nur Pastures, feste Sonne/Fill-Werte, zwei fest importierte
Texturen") durch ein datengetriebenes System — s. `design/battle-040-arena-produktion.md` für den
vollen Auftrag/die Arbeitsteilung mit Mira (Assets).

**Neue Dateien in diesem Ordner** (Isolationsvertrag unverändert — alles bleibt hier drin, der EINE
Mount-Switch in `CombatPage.tsx` bekam nur eine zusätzliche `zoneId`-Prop):
- `manifest.ts` — TS-Schema (`ZoneManifest`/`ZoneManifestLighting`/`ZoneManifestProp`), strikte
  Validierung (`validateZoneManifest`, sammelt ALLE Probleme auf einmal in einem Konsolen-Report)
  und Auto-Discovery-Registry (`getZoneManifest`, Muster: `zoneMaps.ts`). **Bundle-Beweis-kritisch:**
  der Registry-Aufbau (`for`-Schleife über die geglobbten JSONs) läuft nur hinter
  `if (import.meta.env.DEV)` — er hat echte Seiteneffekte (`console.error`), ein ungegatetes
  Top-Level-`for` würde in JEDEM Build laufen und die Tree-Shaking-Kette brechen (empirisch
  gefunden, s. Kommentar an der Stelle für die volle Herleitung).
- `assets.ts` — löst Manifest-Dateinamen zu echten URLs auf: Auto-Discovery über
  `assets/arena/*.{webp,png}` (der künftige Mira-Zielordner, heute noch leer) MIT Fallback auf den
  bestehenden `assets/arena25d/pastures_*.webp`-Altbestand für "pastures". Baut außerdem
  prozedurale Canvas-Silhouetten (Baum/Busch/Fels) für Props, deren Mira-Datei noch nicht existiert.
- `manifests/<zoneId>.json` — eine Datei pro arena-fähiger Zone, Dateiname = Zone-ID aus
  `content.zones` (z.B. `pastures.json`). Fehlt/ist ungültig ⇒ Zone bleibt klassische 2D-Ansicht.
- `manifests/_SKELETON.jsonc` — kommentierte Vorlage für Mira (JSONC, wird von der Auto-Discovery
  NICHT eingelesen, da nur `*.json` gematcht wird): kopieren nach `<zoneId>.json`, Kommentare raus,
  Werte eintragen, Bilder nach `assets/arena/` legen — kein Code-Eingriff nötig.

**Manifest-Schema** (s. `manifest.ts` für die vollständigen JSDoc-Kommentare je Feld):
```
{
  zoneId: string,               // muss exakt dem Dateinamen entsprechen
  ground: string,                // Dateiname unter assets/arena/, Schema arena_<zoneId>_ground.webp
  backdrop: string,               // Dateiname, Schema arena_<zoneId>_backdrop.webp
  backdropLayout?: {              // optional (Chef-Auftrag 05.08.): Kulissen-Platzierung pro Zone —
    z?: number,                   //   Welt-Z der Kulissen-Mitte (Default BACKDROP_Z ≈ -3.5)
    height?: number,              //   Wandhöhe > 0 (Default BACKDROP_HEIGHT 12.2)
    widthScale?: number,          //   Breiten-Multiplikator > 0 auf Höhe×Bild-Aspect (Default 1)
    yOffset?: number,             //   vertikaler Offset auf die Standard-Höhenlage (Default 0)
  },                              //   fehlt der Block ⇒ exakt die Code-Konstanten (sceneEnvironment.ts)
  lighting: {
    sunColor: string,            // CSS-Hex
    sunIntensity: number,
    sunAngleDeg: number,          // Elevation, 0=Horizont, 90=Zenit
    sunAzimuthDeg: number,        // 0=von der Kamera-Seite, 90=rechts, "180 vermeiden" (Silhouette)
    ambientColor: string,
    ambientIntensity: number,
    fogColor: string,
    fogDensity: number,           // 0 = kein Nebel (THREE.FogExp2 sonst)
    grade: { saturation: number, temperature: number, lift?: number },
  },
  props: [{ file: string, x: number, z: number, scale: number, flip?: boolean, layer: "back"|"mid" }],
}
```

**Licht/Fog/Grade-Engine** (`Arena25DStage.tsx`): Sonne (`DirectionalLight`) + Fülllicht
(`HemisphereLight`) + optionaler `THREE.FogExp2` werden aus den Manifest-Werten gebaut (Sonnen-
Position aus Elevation/Azimut hergeleitet, s. `deriveSunOffset`). Farb-Grade läuft NICHT als
Post-Processing-Pass, sondern als billiger CSS-`filter` (`saturate`/`hue-rotate`/`brightness`) auf
dem `<canvas>`-Element selbst — einmal pro Zonen-Mount gesetzt, keine Pro-Frame-Kosten.

**Prop-Billboard-Layer**: dekorative, statische Billboards (Baum/Busch/etc.) aus `manifest.props` —
strukturell ein schlankeres Geschwister der Kämpfer-Billboards (dieselbe Alpha-Baseline-Fußmessung
fürs Grounding, derselbe weiche Kontaktschatten). Tiefensortierung mit den Kämpfern ist GRATIS
(dieselbe `alphaTest`-Cutout-Material-Strategie lässt den normalen Z-Buffer korrekt sortieren, kein
manuelles `renderOrder`). `layer:"back"` kaschiert die Boden↔Kulisse-Naht an den Rändern,
`layer:"mid"` steht auf der Fläche (außerhalb der Kampf-Mitte). Fehlt die Mira-Datei noch, springt
automatisch eine prozedurale, ehrlich als Platzhalter erkennbare Canvas-Silhouette ein (mit
`// TODO Mira arena_<zoneId>_prop_<nn>`-Marker im jeweiligen Manifest-Eintrag) — verschwindet
automatisch, sobald die echte Datei unter demselben Namen in `assets/arena/` auftaucht.

**Zonenwechsel ohne Reload**: `Arena25DStageProps.zoneId` ist jetzt eine echte Effect-Dependency
(`useEffect(..., [props.zoneId])` statt `[]`) — ein Wechsel zu einer anderen arena-fähigen Zone baut
die komplette Three.js-Szene sauber ab und neu auf (derselbe Cleanup-Pfad wie ein normales
Unmount/Mount), ohne dass die Seite neu geladen werden muss.
