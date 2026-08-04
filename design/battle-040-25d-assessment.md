# 0.4.0 Technik-/Design-Assessment: 2,5D-Kampfarena für Grim Reach

**Datum:** 2026-08-03 · **Rolle:** UI-Dev (Renderer) · **Typ:** reines Design-Dokument, KEIN Produktivcode
**Auftrag:** ehrliche Machbarkeits-/Aufwandsbewertung der 2,5D-Battlescreen-Optionen für 0.4.0.

**Methodik-Hinweis:** Alle Aussagen unten sind entweder (a) am tatsächlichen Code/Repo-Zustand verifiziert
(Datei/Zeile zitiert, oder ein `pnpm build` + Bundle-Grep tatsächlich ausgeführt — s. Fußnoten), oder (b)
an einem echten, im Repo liegenden Wegwerf-HTML-Beweis mit echten Zonen-Assets beobachtet (Screenshots
unter `design/mockups/battle-25d-light-2026-08-03/`), oder (c) klar als Schätzung/Fremdwissen markiert.
Kein Punkt ist aus der README des Prototyps unkritisch übernommen — an zwei Stellen widerspricht der reale
Bundle-Befund sogar der README (s. 1.2).

---

## TL;DR

- Der three.js-Arena-Prototyp (`components/arena25d/`) ist **technisch weit fertiger als "Proof of Concept"
  klingt** — vier Feinschliffrunden, volle Bar-/Status-/Floater-/Kill-Card-Parität zur 2D-Ansicht, sauber
  isoliert, **heute empirisch bewiesen 0 Byte im Produktions-Bundle** (nicht nur behauptet — nachgemessen,
  s. 1.2). Der limitierende Faktor für 0.4.0 ist **nicht Engineering, sondern Kunstproduktion**: jede neue
  Zone braucht ein bespoke Boden+Kulisse-Bildpaar vom Chef, wie `pastures_ground.webp`/`pastures_backdrop.webp`.
- Der DOM/CSS-"2,5D-light"-Weg funktioniert mechanisch (Wegwerf-Beweis mit echten Assets bestätigt: Perspektive/Tiefe/Schatten/Klick-Ziele/Text alles unproblematisch), **aber der visuelle Gewinn ist bei den
  vorhandenen, gemalten Kampf-Kulissen überraschend gering** — ohne dedizierte, flache Bodenplatte pro Zone
  (derselbe Kunstbedarf wie bei three.js) wirkt der Boden-Kipp-Effekt eher wie ein Stimmungs-Vignette als
  wie eine echte 3D-Bühne, und beim Zweitversuch ohne dediziertes Bodenbild (Gruft) entsteht sichtbare
  Content-Fehlpassung (Deckenarchitektur "spiegelt" sich in den Boden).
- **Kernbefund, der die Chef-Rahmung verschiebt:** Der teuerste Faktor ist in BEIDEN 2,5D-Wegen derselbe —
  bespoke Boden-Kunst pro Zone. Wer das bezahlt, bekommt bei three.js spürbar mehr fürs Geld (dynamisches
  Licht, gekrümmte Kulisse, Partikel, bereits 4× poliert). "2,5D-light als Standard" lohnt sich damit NICHT
  in der ursprünglich gedachten Form — s. Empfehlung in Abschnitt 3.

---

## 1. Auftrag A — three.js-Arena-Prototyp: ehrlicher Ist-Zustand

### 1.1 Was ist tatsächlich fertig

Gelesen: `apps/client/src/renderer/components/arena25d/{README.md,flag.ts,index.ts,Arena25DStage.tsx,styles.ts}`
(zusammen ~1.700 Zeilen, vier dokumentierte Task-Runden #330/#330b/#330c/#330d).

| Baustein | Stand | Beleg |
|---|---|---|
| Kamera | `PerspectiveCamera`, FOV 40°, Pitch ≈30°, dezente Idle-Drift + Crit-Kick (nur `fxLevel="full"`) | Stage.tsx Z. 188–192, 1061–1079 |
| Boden | dediziertes `pastures_ground.webp` (1536×1024), 1:1 gestreckt, `ClampToEdgeWrapping`, max. Anisotropie | Stage.tsx Z. 823–845 |
| Kulisse | **gebogen** (Zylinder-Ausschnitt, handgebaute `BufferGeometry`, nicht `CylinderGeometry`), oberer 70%-Crop von `pastures_backdrop.webp`, unlit (`MeshBasicMaterial`) | Stage.tsx Z. 269–330, 851–923 |
| Sonne/Licht | ein `DirectionalLight` (front, nicht Silhouette — extra Justierrunde in #330d nötig), `HemisphereLight`-Fill, additiv geblendetes Sonnenscheiben-Sprite | Stage.tsx Z. 793–818 |
| Sprite-Baseline | pro Bild-URL gecachte Canvas-Alpha-Messung (unterste Pixelzeile mit Alpha>16) statt PNG-Kante — verhindert schwebende Figuren | Stage.tsx Z. 332–414 |
| Billboards | zylindrisch (nur Y-Gier-Rotation, nicht volle Kamera-Quaternion) — Lehre aus einem echten Bug (#330c: sphärisches Billboard hob den Fuß-Pixel sichtbar an) | Stage.tsx Z. 1082–1095 |
| Bars/Mana/Ward/Timer | echtes DOM (3D→2D projiziert, `Vector3.project`), dieselben `.cbar`-Klassen wie 2D — **kein Textur-Text** | Stage.tsx Z. 555–641, 1139–1189 |
| Status-Icons | `StatusEffectRow`, dieselbe `renderEffectIcon`/`.effect-badge`-Quelle wie 2D | Stage.tsx Z. 584–599 |
| Floater (Dmg/Heal/Crit/Ward/DoT/Lifesteal/Proc/XP/Miss) | 1:1-Darstellungskopie der 2D-`.dmg-number`-Zweige, dieselbe Event-Quelle (`floaters`-Prop von `Battle()`) | Stage.tsx Z. 643–728 |
| Kill-Summary-Karte | dieselbe `<KillSummaryCard>`-Instanz/State wie 2D, nur Platzierung arena-spezifisch (kein Duplikat) | Stage.tsx Z. 117–134, 1266–1269; README Z. 175–180 |
| Ultrawide | Boden+Kulisse-Breite skaliert mit `aspect/REFERENCE_ASPECT` (1920×1080 bleibt Faktor 1) | Stage.tsx Z. 966–994 |
| FX-Gating | Idle-Drift/Kamera-Kick/Funken/Screenshake nur bei `fxLevel==="full"`; `prefers-reduced-motion` übersteuert immer | Stage.tsx Z. 1039–1077, 1137 |
| Kill-Cooldown-Blur | `.a25-dimmed` (Grayscale+Blur), analog `.cooldown-blur` 2D | Stage.tsx Z. 607, styles.ts Z. 73–76 |

**Fazit 1.1:** Für **eine** Zone (Pastures) ist das kein Wegwerf-Prototyp mehr, sondern ein fast
produktionsreifer Renderpfad — vier iterative Feinschliffrunden mit echten Chef-Screenshots als
Eingabe, inklusive eines schon behobenen echten Bugs (Billboard-Floating). Das ist der ehrlich stärkste
Teil dieses Assessments.

Bewusste Lücken laut README ("Scope-Ehrlichkeit", Z. 182–204) — geprüft, Stand stimmt:
- Kein Bloom-Postprocessing (kein `EffectComposer` im Code — verifiziert, s. 1.3.4).
- Keine Cast-Sonderanimation für Magier (alle Stile nutzen dieselbe Lunge).
- Kein Pet-Sprite in der 3D-Szene (Pet-Logik läuft weiter, nur unsichtbar).
- Nur EINE Zone ("Pastures"), Dungeons/Türme/Paragon zeigen immer 2D, auch bei Flag an.

### 1.2 Bundle-/Wartungskosten three.js — empirisch nachgemessen, nicht aus der README übernommen

Die README behauptet einen "Bundle-Beweis" per Konstanten-Faltung. Ich habe das **nachgebaut, nicht nur
gelesen**: `pnpm --filter @hearthforge/client build` ausgeführt und den echten `out/renderer`-Output
gegrept.

```
grep -o "arena25d|Arena25DStage|buildCurvedBackdropGeometry|measureSpriteBaseline|ARENA25D_ZONE_ID" index-*.js
→ 0 Treffer
grep -o "PerspectiveCamera|WebGLRenderer|DoubleSide" index-*.js
→ 0 Treffer (auch stringliterale three.js-Bezeichner, die Minifier nicht umbenennen können)
find out/renderer/assets -iname "*pastures_backdrop*" -o -iname "*pastures_ground*"
→ pastures_backdrop-AZUc8F4K.webp (295.694 B), pastures_ground-DOfvjwTs.webp (634.816 B)
grep -c "pastures_ground|pastures_backdrop" index-*.js  → 0 (Dateien liegen inert im Asset-Ordner)
grep ".a25-" index-*.css → NUR ".a25-root" (1 Treffer, s.u.)
```

**Bestätigt (README stimmt hier):** Arena25D-eigener JS-Code ist tatsächlich 0 Byte im Produktions-Build.
Die zwei Chef-Texturen (~910 KB) liegen als inerte, von keinem Code-Pfad referenzierte Dateien im
Asset-Ordner (bei 201 MB Gesamt-`out/renderer` vernachlässigbar, 0,46 %).

**Zwei Korrekturen gegenüber der README (Stand heute, nicht böswillig, sondern Doku-Drift):**

1. **"three selbst verschwindet NICHT aus dem Bundle"** (README, wegen `AmbientCanvas.tsx`, das three
   angeblich unbedingt importiert) — **stimmt nicht mehr**. `AmbientCanvas.tsx` existiert im aktuellen
   Repo-Stand nicht (`find … -iname "*AmbientCanvas*"` → kein Treffer). Eine Suche nach
   `from "three"` im gesamten `src`-Baum findet **nur noch** `Arena25DStage.tsx`. Ergebnis: three.js
   (0.185.1) ist heute **komplett** wegtreeshaked, nicht nur der arena25d-eigene Code — der Bundle-Beweis
   ist also sogar *besser* als dokumentiert. Kehrseite: **sobald** der Prototyp für echte Spieler aktiv
   geschaltet wird, wird three.js zum ersten Mal ein echter, dauerhafter Produktions-Dependency (aktuell
   trägt es buchstäblich 0 Byte bei, weil niemand sonst es importiert).
2. **Isolationsvertrag "genau ein Berührungspunkt"** — nicht ganz exakt. `combat.css` Z. 6101–6102 enthält
   eine zweite, echte (nicht arena25d-eigene) Regel `.battle-arena-stage, .battle-arena > .a25-root { … }`
   — ein zweiter, winziger (~1 Zeile) Berührungspunkt außerhalb des Ordners, der beim "Ordner löschen"
   -Rückbau ebenfalls entfernt werden müsste. Bytes vernachlässigbar, aber die Isolations-Doku sollte das
   nennen.

**Kosten, falls für 0.4.0 real aktiviert (nicht mehr Dev-only):**
- three.js-Kernpaket per `import * as THREE from "three"` (Namespace-Import, kein Tree-Shaking auf
  Modulebene) — laut gängigen öffentlichen Bundle-Analysen (bundlephobia u. ä., **nicht in diesem Repo
  selbst nachgemessen**, da eine echte Messung eine Produktivcode-Änderung erfordert hätte) liegt das in
  der Größenordnung ~150–200 KB gzip. In einer Electron-App mit ohnehin ~550 MB Asset-Payload (Studio-Intro
  allein 7,4 MB, Musik 9,6 MB) ist das für die Ladezeit irrelevant — relevant ist es für **CSP/Renderer-
  Startkosten** (JS-Parse/Compile) und für **Wartung**: three.js bringt in Minor-Versionen gelegentlich
  Breaking Changes (Material-/Color-Management-API hat sich in den letzten Jahren mehrfach verschoben) —
  ein zweiter Renderpfad, der bei jedem three-Update mitgetestet werden muss.
- Kein Shadow-Mapping, kein Post-Processing im Code (`grep "castShadow|receiveShadow|EffectComposer"` →
  0 Treffer) — die Szene ist bewusst schlank gehalten, das drückt sowohl Perf- als auch Wartungskosten.

### 1.3 Was fehlt zur Produktionsreife

**(1) Pipeline für alle ~10 Zonen (+ Dungeon-Etagen)**

Der Prototyp braucht pro Zone **zwei bespoke Bilder vom Chef/der Designerin**: eine gestreckte,
flach-getreue Bodentextur (`<zone>_ground.webp`, hier 1536×1024) und eine Kulisse, die als gebogene Fläche
funktioniert (`<zone>_backdrop.webp`, oberer Bildanteil, unterer "Feldweg"-Streifen weggecroppt — das war
selbst für Pastures ein eigener Nacharbeitsschritt, s. README "#330b-Nachtrag"). Das ist **keine
Wiederverwendung** der bestehenden `battlescreens/*.webp` (die sind als EIN gemaltes Bild für die flache
2D-Ansicht konzipiert, mit eigener gemalter Perspektive/Fluchtpunkt — genau das kollidierte mit der 3D-
Bodenebene, s. README-Zitat "zwei Böden übereinander, schwarzes Loch dazwischen").

Realer Umfang laut Repo: `assets/battlescreens/` enthält **24 unterschiedliche Kampf-Hintergründe** (48
Dateien inkl. `.card.webp`-Variante) — 14 Zonen + `crypt_depths`/`wildwood_hunt`/`idol_sanctum`/
`goblin_warband`/`highland_aerie`/`wyvern_lair`/`behind_the_throne`/`paragon_tower`/`borderlands`/
`blackthorn` als Dungeon-/Encounter-spezifische Varianten + `slayer_tower_1`…`_5` als 5 einzelne Turm-
Etagen. Der Chef-Auftrag sprach von "~10 Zonen" — real bräuchte eine VOLLE Pipeline eher **~24
Bildpaare** (48 Einzelbilder), wenn jede unterscheidbare Kampf-Szene ihre eigene Bodenplatte bekommen soll.
Realistischer Rahmen für 0.4.0: nur die Haupt-Freilandzonen (~10), Dungeon-Etagen bleiben 2D (das
deckt sich mit dem unten vorgeschlagenen Staged Plan).

Pro Zone braucht der Chef/die Designerin (aus dem Code abgeleitet, nicht geraten):
- eine flache, gut belichtete Bodenansicht im Format ~1536×1024, die bei 1:1-Streckung nicht wie eine
  verzerrte Fotografie wirkt (Gras/Stein/Sand funktioniert erfahrungsgemäß besser als z. B. Wasser mit
  Spiegelungen oder architektonisch strenge Böden mit Fliesenraster, die bei Streckung sofort als schief
  aiffallen),
- eine Kulissen-Illustration, bei der der UNTERE Streifen (der später weggecroppt wird, hier 30 %)
  entbehrlich ist, und die auch an den äußersten Rändern (wegen der Zylinder-Krümmung für Ultrawide)
  noch plausibel aussieht,
- beide farblich/lichtmäßig aufeinander UND auf die vorhandene 2D-Kulisse abgestimmt (derselbe Ort muss
  in 2D und 2,5D wiedererkennbar bleiben).

Das ist ein wiederkehrender, nicht-trivialer Kunstauftrag pro Zone — kein Icon-Batch, sondern im Aufwand
eher vergleichbar mit den bestehenden `battlescreens/*.webp` selbst (deren Erstellung schon einmal
passiert ist). Reine Engineering-Seite (Textur einbinden, Zylinder-Kulisse bauen, Baseline messen) ist
dank des bereits bewährten Musters **pro Zone eher klein** (geschätzt 0,5–1 Tag Einbindung, kein neues
Konzept) — der Flaschenhals ist die Kunstproduktion, nicht der Code.

**(2) FX-Parität zur 2D-Ansicht**

Größtenteils bereits geschlossen (s. 1.1-Tabelle: Floater/Status/Bars/Kill-Card alle vorhanden). Real
offen: Bloom (bewusst weggelassen, Chef nannte es "optional"), Cast-Sonderanimation für Magier, Pet-
Sprite in der 3D-Szene. Alle drei sind klar umrissene Nacharbeiten, kein architektonisches Problem —
Aufwand je einzeln klein bis mittel (Pet bräuchte ein drittes Billboard + eigene Positions-/Skalierlogik,
Cast-Animation eine zweite Lunge-Variante, Bloom einen `EffectComposer`-Umbau mit eigener Perf-Prüfung).

**(3) Dungeons/Wellen/Paragon**

Wichtiger, unter Punkt (1) versteckter Fund beim Code-Lesen: `CombatPage.tsx` zeigt, dass Dungeons/Türme/
Paragon **mechanisch immer 1-gegen-1** bleiben — "Wellen" sind sequenzielle Einzel-Encounter mit einem
Übergangs-Banner (`dungeon-wave-announce`, Z. 2732), NIE mehrere Monster gleichzeitig im Bild. Das ist eine
gute Nachricht für die Arena-Erweiterung: es gibt **kein N-Monster-Framing-Problem** zu lösen — die
bestehende Zwei-Billboard-Architektur (Spieler+EIN Gegner) trägt unverändert auch Dungeons/Türme/Paragon.
Nötig wäre nur: (a) ein Textur-/Baseline-Reload beim Wellenwechsel (neues Monster tritt ein — Übergang
müsste choreografiert werden, aktuell gibt es dafür noch keinen Arena-eigenen Beat) und (b) — der
eigentliche Aufwand — wieder Boden+Kulisse-Bildpaare, diesmal pro Dungeon/Turm-Etage (s. oben, bis zu 14
weitere Bildpaare für volle Abdeckung).

**(4) Perf bei 3440×1440**

Aus dem Code (nicht nur behauptet) verifiziert: kein Shadow-Mapping, kein Post-Processing/`EffectComposer`,
DPR hart auf 1,25 gedeckelt, `powerPreference:"low-power"`, ein einziges gepooltes 30-Partikel-System
(round-robin, keine Allokationen pro Frame), rAF pausiert bei `document.hidden`. Das ist für eine
WebGL-Szene bewusst sehr genügsam — vier Texturen, zwei einfache planare Meshes + eine handgebaute
Zylinder-Kulisse (~30 Segmente, trivial wenig Geometrie), drei Lichter, keine Schatten. Die vom Chef
berichteten 60 fps bei 3440×1440 sind bei dieser Szenenkomplexität **plausibel auf praktisch jeder GPU der
letzten ~8 Jahre**, auch integriert — das kann ich aus dem Code ableiten, aber (Regel: kein `pnpm dev`/
Electron) **nicht selbst nachmessen**. Offene Lücke: **kein Test auf schwächerer/älterer Hardware als der
Chef-Maschine** — bei einem Idle-Game-Publikum, das erfahrungsgemäß auch auf älteren Laptops/Büro-PCs
spielt, ist "läuft flüssig auf dem Chef-Rechner" kein Beweis für "läuft flüssig auf dem 10-Perzentil-Gerät
der Spielerbasis". Sobald FX ergänzt werden (Bloom, mehr Partikel für Dungeon-Bosse etc.), wächst dieses
Risiko — der aktuell schlanke Zustand ist ein Fenster, kein Dauerzustand.

**(5) Bundle-/Wartungskosten** — s. 1.2, dort vollständig behandelt (heute 0, real relevant erst nach
Aktivierung, geschätzt ~150–200 KB gzip + laufende three.js-Versionswartung).

### 1.4 Staged Plan — ehrlicher 0.4.0-Schnitt

Empfehlung, falls three.js-Arena weiterverfolgt wird (s. auch Gesamt-Empfehlung Abschnitt 3):

1. **"Arena-Beta" hinter einem echten Options-Toggle** (kein Dev-Hotkey mehr, sondern ein Eintrag in den
   Spieleinstellungen, Default AUS) — der bestehende Flag-Mechanismus (`ARENA25D_SUPPORTED`/
   `isArena25dEnabled`/`isArena25dActive`) ist strukturell bereits genau das Muster dafür, müsste nur von
   `import.meta.env.DEV` auf einen echten Produktions-Options-State umgehängt werden.
2. Nur **2–3 Zonen** mit bereits budgetiertem Kunstauftrag (Pastures existiert; 2 weitere nach Chef-Wahl,
   idealerweise visuell einfache Fälle — offene Wiese/Ebene wie `ashfields`/`highlands` eher geeignet als
   Innenräume mit vielen architektonischen Fluchtlinien wie `crypt`/`idolhall`, s. Auftrag-B-Befund zur
   Doppelperspektive, der hier genauso greift).
3. Dungeons/Türme/Paragon bleiben **bewusst 2D**, auch in den Beta-Zonen (kein N-Monster-Problem, aber
   zusätzlicher Kunstaufwand ohne unmittelbaren Mehrwert für einen Beta-Schnitt).
4. Bloom/Cast-Animation/Pet-Sprite bleiben Nice-to-have für eine spätere Runde, nicht 0.4.0-Scope.
5. Perf-Smoke-Test auf mind. einem Nicht-Chef-Gerät (Laptop/ältere GPU) VOR dem Rollout — der einzige
   Punkt aus diesem Assessment, der eine echte Spielsitzung braucht und damit außerhalb meiner
   Werkzeuge liegt (Electron-Start ist mir per Rolle untersagt).

---

## 2. Auftrag B — "2,5D light" ohne WebGL (reines DOM/CSS)

### 2.1 Wegwerf-Beweis

Gebaut: `design/mockups/battle-25d-light-2026-08-03/index.html` — eigenständige HTML-Datei, referenziert
**ausschließlich echte, unveränderte Repo-Assets** über relative Pfade (`../../../apps/client/src/renderer/
assets/...`), kein Build-Schritt, direkt im Browser (auch `file://`) zu öffnen. Technik: ein
`perspective`-Container, `rotateX`-gekippter Boden, zwei Parallax-Ebenen (Himmel/Vorderzone),
Vignette-Overlay, aufrechte Sprites mit `translateZ`-Tiefenstaffelung, elliptischem Radial-Gradient-
Kontaktschatten, DOM-Nameplates, ein Klick-Ziel-Test (Monster-Figur), FX-Level-Umschalter
(voll/reduziert/aus) inkl. `prefers-reduced-motion`-Override für die Maus-Parallax.

Zwei Zonen, bewusst unterschiedlich behandelt, um die Kernfrage ("reichen die vorhandenen Kulissen?") real
zu beantworten statt zu behaupten:
- **Weiden**: nutzt `arena25d/pastures_ground.webp` — dasselbe bespoke Chef-Bild aus dem three.js-Prototyp
  (ein reines Asset, technikneutral — funktioniert 1:1 auch als `background-image` einer DOM-Ebene).
- **Gruft**: hat KEIN dediziertes Bodenbild. Testweise wird der obere Bildbereich der normalen 2D-Kulisse
  (`battlescreens/crypt.webp`) hochskaliert als "Boden" gekippt — die billigste denkbare Notlösung, um zu
  sehen, wie schlimm es ohne dediziertes Asset wird.

Verifiziert per Playwright-Screenshot (Chromium, `file://`-Aufruf, 1600×950) — **kein Electron/`pnpm dev`**,
reines Rendern einer statischen HTML-Datei, deckt sich mit der Rollen-Regel:

- `mockup-pastures.png`, `mockup-crypt.png`, `mockup-checker-proof.png` liegen in meinem Scratch-Verzeichnis
  (Session-lokal, nicht Teil des Repos) — Kernbeobachtungen unten.
- Zur Gegenprobe, ob der `rotateX`-Mechanismus überhaupt korrekt greift (nicht nur "sieht flach aus, weil
  Bug"): `getComputedStyle(floor).transform` ergab `matrix3d(1,0,0,0, 0,0.559,0.829,0, 0,-0.829,0.559,0,
  0,0,0,1)` — exakt `cos(56°)=0,559` / `sin(56°)=0,829`, die Transformation ist real und korrekt, keine
  fehlerhafte CSS. Ein Schachbrett-Test-Overlay auf dem Boden zeigt sichtbare (wenn auch bei diesen
  Parametern moderate) Stauchung zum Horizont hin — der Mechanismus funktioniert, nur der visuelle Ertrag
  bei gemalten (nicht gerasterten) Bodentexturen ist gering.

### 2.2 Befunde — was funktioniert

- **Aufrechte Sprites + Tiefenstaffelung + Kontaktschatten lesen sich sofort richtig** — dieselbe visuelle
  Sprache wie die three.js-Billboards, ohne jede WebGL-Beteiligung.
- **DOM-Text bleibt scharf** (Nameplates), exakt derselbe Vorteil, den der three.js-Prototyp durch
  DOM-Anker statt Textur-Rendering schon zieht — kein Unterschied zwischen den beiden 2,5D-Wegen hier.
- **Klick-Ziele bleiben trivial** — normales `<img>`/Element mit `pointer-events`, kein Raycasting, keine
  Hit-Test-Sonderlogik nötig (im Beweis getestet: Klick auf die Monster-Figur löst einen Weißblitz aus).
- **FX-Gating überträgt sich 1:1** — dieselbe `fxLevel`-Dreiteilung (voll/reduziert/aus) und derselbe
  `prefers-reduced-motion`-Override lassen sich testweise im Beweis nachbilden, ohne dass die Technik
  dagegen ankämpft. Wichtig: alle Bewegungs-Updates (Maus-Parallax) ändern NUR `transform`
  (Compositor-Thread), nie `background-position`/Filter — das ist die korrekte Performance-Praxis und
  im Beweis bereits so umgesetzt, nicht nachträglich zu reparieren.

### 2.3 Befunde — was bricht / Risiko

- **Der Boden-Kipp-Effekt ist bei gemalten (nicht gekachelten) Bodentexturen visuell erstaunlich subtil.**
  Weiden mit dem dedizierten Chef-Bodenbild sieht solide aus — aber kaum jemand würde ohne Vorher/Nachher
  behaupten, hier stünde eine "gekippte 3D-Ebene" statt eines schlicht angezeigten Bodenbilds. Der
  Schachbrett-Beweis bestätigt: die Transformation rechnet korrekt, aber ohne erkennbares Linien-/
  Fliesenmuster im Bildinhalt liest das Auge die Stauchung kaum. **Das ist eine echte, nicht-triviale
  Erkenntnis:** der "Octopath-Eindruck" kommt in der Praxis eher aus den GROSSEN, klar gestaffelten
  Sprites + Schatten + Parallax als aus dem Boden-Tilt selbst — der Boden-Tilt ist der teuerste (Asset-
  Bedarf!) und visuell am wenigsten überzeugende Teil der Technik.
- **Ohne dediziertes Bodenbild entsteht sichtbare Content-Fehlpassung.** Gruft zeigt im Beweis-Screenshot
  deutlich Deckenarchitektur/Ketten-Formen, die als "Boden" gekippt wurden — durch Zufall (die gotische
  Kulisse ist vertikal fast symmetrisch) liest sich das noch halbwegs als "nasser, reflektierender
  Steinboden", würde bei einer typischen Außenzone mit Horizont (Wald, Küste, Hochland) aber sofort als
  Fehler auffallen (Himmel/Baumkronen-Farben landen im "Boden"). Diese Notlösung ist **kein verlässlicher
  Weg für ~10 Zonen ohne individuelle Kuration**.
- **Bottom-Alpha-Padding ist KEIN WebGL-spezifisches Problem** — real an den vorhandenen Sprites gemessen
  (Python/Pillow, unterste Zeile mit Alpha>16 gesucht): `bull_boss.webp` hat ~16,8 % transparente Fußzone,
  `skeleton_warrior.webp` ~8,9 %, `char_1.webp` ~3,0 %. Ohne Pro-Sprite-Kalibrierung (Foot-Inset, exakt das
  Problem, das der three.js-Prototyp per Canvas-Baseline-Messung löst) schweben Figuren unterschiedlich
  stark über dem Boden — **dieselbe Kalibrierungsarbeit fällt bei DOM/CSS genauso an**, nur ohne die
  fertige Laufzeit-Lösung, die three.js schon hat (müsste als einmalige Build-Zeit-Metadaten pro Sprite
  nachgebaut werden, z. B. ein `--foot-inset`-Wert je Bild).
- **Compositor-Layer-Zahl** — Sky+Mid+Floor+Vignette+2 Sprite-Layer ≈ 5–6 eigene GPU-Compositor-Layer pro
  Kampf-Bühne (DevTools-"Layers"-Panel nicht im Rahmen dieses Assessments geprüft, da das einen laufenden
  Browser-Kontext mit Devtools-Protokoll bräuchte, den ich für einen reinen Wegwerf-Beweis nicht aufgesetzt
  habe — als offene Prüfung vor jedem Rollout vermerkt). Bei Ultrawide-Fill-Rate (3440×1440, mehrere
  großflächige, blur-gefilterte Vollbild-Ebenen) ist das nicht "nichts", aber deutlich günstiger als ein
  volles WebGL-Canvas mit Echtzeit-Beleuchtung — reines Compositing, kein Pixel-Shading pro Frame, solange
  nur `transform` animiert wird (im Beweis korrekt so gebaut).
- **Der bestehende 2D-Ausgangspunkt ist bereits poliert** — `CombatPage.tsx` (Z. 113, 1041–1069, 2803)
  zeigt: die heutige flache Ansicht hat schon Ken-Burns-Drift auf dem Zonenbild UND einen themenbezogenen
  Partikel-Canvas, beides `fxLevel`-gegated. Der 2,5D-light-Vergleich ist also nicht "Standbild vs.
  Tiefen-Bühne", sondern "bereits animiertes/partikelbesetztes Bild vs. Tiefen-Bühne" — das verkleinert
  den wahrgenommenen Sprung zusätzlich zum oben beschriebenen Boden-Befund.

### 2.4 Reicht es mit den vorhandenen Kampf-Kulissen?

**Differenzierte Antwort, keine ja/nein-Behauptung:**
- Für die reinen **Parallax-/Hintergrund-Ebenen**: ja, die vorhandenen `battlescreens/*.webp` (bereits
  1536×1024, bereits pro Zone vorhanden) reichen technisch aus, wie im Beweis gezeigt.
- Für eine **überzeugende gekippte Bodenfläche**: nein, nicht ohne Weiteres — entweder (a) man committet
  zu genau demselben Kunstauftrag wie bei three.js (dediziertes, flach-gestrecktes Bodenbild pro Zone —
  dann ist der Kostenvorteil von "light" gegenüber der Arena dahin, bei geringerer visueller Deckenhöhe),
  oder (b) man kuratiert lediglich einen Crop/Fade der VORHANDENEN Kulisse pro Zone (Designer-Zeit statt
  Neu-Illustration — deutlich günstiger als (a), aber der Gruft-Befund zeigt: das braucht echte
  Einzelfall-Prüfung, kein Pauschal-Crop-Skript über alle Zonen), oder (c) man verzichtet auf den
  Boden-Tilt komplett und behält nur Parallax+Sprite-Tiefe+Schatten — was laut 2.3 ohnehin der Teil ist,
  der den größten Teil des visuellen Effekts trägt.

### 2.5 Aufwandsschätzung

Reines Engineering (Komponente + CSS, kein Fremdpaket) für den in 2.4(c) beschriebenen "leichten" Schnitt
(Parallax + Sprite-Tiefe + Schatten, ohne Boden-Tilt) über alle Zonen: klein bis mittel, da kein neues
Asset nötig und die Technik im Beweis bereits sauber funktioniert. Für die volle Variante mit
überzeugendem Boden-Tilt: mittel bei Engineering, aber mit demselben Asset-Flaschenhals wie three.js
(s. 2.4a) — dann ist der Aufwandsvorteil gegenüber der bereits 4× polierten Arena nicht mehr eindeutig.

---

## 3. Auftrag C — Vergleichsmatrix & Empfehlung

| Dimension | (1) 2D + Juice pur | (2) 2,5D-light (DOM/CSS) | (3) three.js-Arena | (4) Hybrid (Chef-Rahmung: light Standard, Arena Opt-in) |
|---|---|---|---|---|
| **Wow-Faktor** | niedrig–mittel (bereits Ken-Burns+Partikel, aber flach) | mittel, **stark asset-abhängig** — mit Bestandskulissen eher gering (2.3), mit dediziertem Bodenbild mittel-hoch | hoch (4 Feinschliffrunden, dynamisches Licht, gekrümmte Kulisse, für Pastures bereits überzeugend) | gemischt/uneinheitlich zwischen Zonen |
| **Perf-Risiko** | sehr niedrig (produktiv, bekannt) | niedrig (reines Compositing), aber 5–6 Layer/Kampf bei Ultrawide ungetestet vor Rollout | mittel (schlank gebaut, aber nur auf Chef-Hardware beobachtet, kein Low-End-Test) | Summe aus (2)+(3) |
| **Asset-Kosten** | keine | mittel (für gutes Ergebnis fast identisch zu (3); billig nur bei sichtbarem Qualitätsverlust, s. Gruft) | hoch (bespoke Bildpaar pro Zone/Etage, ~10–24 je nach Umfang) | hoch (beide Pfade brauchen Kuration) |
| **Implementierungsaufwand** | keins–klein | mittel (neue CSS-3D-Bühne, geteiltes Alpha-Padding-Problem ungelöst) | mittel (Muster 4× bewährt, pro Zone v. a. Asset-Einbindung; Dungeons mechanisch einfach, da immer 1v1) | hoch (zwei Präsentationspfade parallel bauen/pflegen) |
| **Wartung** | sehr niedrig (Standard-React/CSS) | niedrig–mittel (kein Fremdpaket, aber zweiter Präsentationspfad neben 2D) | mittel–hoch (three.js-Versionspflege + zweiter Präsentationspfad) | am höchsten (beide Wartungslasten gleichzeitig) |
| **Rückbaubarkeit** | n/a (ist die Baseline) | hoch (reine Komponente, kein Fremdpaket) | sehr hoch (Ein-Ordner-Isolation bereits bewiesen, heute 0 Byte Bundle) | hoch (beide Pfade einzeln abschaltbar, aber zwei Flags statt einem) |

### Empfehlung

**Nicht die ursprünglich gerahmte Variante (4) "light als Standard, Arena als Opt-in".** Der Kernbefund aus
Auftrag B kippt diese Reihenfolge: der teuerste, limitierende Faktor ist bei BEIDEN 2,5D-Wegen derselbe
Kunstauftrag (bespoke, flache Bodenbilder pro Zone) — und wer diesen Auftrag bezahlt, bekommt bei three.js
für dasselbe Geld spürbar mehr (dynamisches Licht, gekrümmte Kulisse, Partikel, bereits vier Runden
kampferprobt) als bei DOM/CSS. "2,5D-light mit vorhandenen Kulissen" (die einzige WIRKLICH kostenlose
Variante) liefert laut Beweis einen zu geringen/uneinheitlichen visuellen Sprung, um als spielweiter
Standard zu rechtfertigen, dass ALLE Zonen einen zweiten Präsentationspfad zusätzlich zur bereits
polierten 2D-Basis bekommen.

**Empfohlener Schnitt für 0.4.0 — dreistufig, nutzt beide Recherchen, aber anders gewichtet:**

1. **Sofort, für alle Zonen, ohne neuen Kunstauftrag:** aus dem 2,5D-light-Beweis NUR das mitnehmen, was
   ohne dediziertes Bodenbild bereits funktioniert und den bestehenden 2D-Pfad direkt verbessert —
   Sprite-Tiefenstaffelung (`translateZ`/Skalierung) + elliptischer Kontaktschatten als Ergänzung der
   heutigen `.battle-arena`-Szene, KEIN Boden-Tilt. Kein neuer Kunstbedarf, kleiner Engineering-Aufwand,
   baut auf dem bereits vorhandenen Ken-Burns+Partikel-Fundament auf. Das ist Option (1) "2D+Juice", nur
   spürbar erweitert — kein eigener Match in der Matrix, sondern die eigentliche Breitenverbesserung.
2. **Opt-in-Beta, 2–3 Zonen, mit Kunstbudget:** three.js-Arena nach dem in 1.4 skizzierten Staged Plan
   (echtes Options-Toggle statt Dev-Hotkey, Dungeons bleiben 2D, Perf-Smoke-Test auf Nicht-Chef-Hardware
   vor Rollout). Der Prototyp ist dafür bereits fast bereit — der Isolationsvertrag hält nachweislich
   (1.2), die verbleibende Arbeit ist überwiegend Kunstproduktion + ein echtes Settings-UI statt Hotkey.
3. **2,5D-light als eigenständiges Produktivsystem NICHT weiterverfolgen.** Der Wegwerf-Beweis war die
   richtige Entscheidung, GENAU DAS vorab zu klären, bevor Engineering-Zeit in einen zweiten kompletten
   DOM/CSS-Präsentationspfad fließt, der (a) denselben Asset-Flaschenhals hat wie three.js und (b) bei
   gleichem Kunstbudget eine niedrigere visuelle Decke bietet. Der Beweis bleibt als dokumentierte
   Erkenntnis unter `design/mockups/battle-25d-light-2026-08-03/` liegen — kein Code daraus wird
   produktionsiert.

**Warum nicht einfach three.js für alle ~10 Zonen sofort:** weil der limitierende Faktor Kunstproduktion
ist, nicht Code — ein "großer Wurf" über alle Zonen sofort würde den kompletten verfügbaren Kunstauftrag
des 0.4.0-Fensters auf Kampfhintergründe verwenden, mit noch unbewiesenem Perf-Verhalten auf schwächerer
Hardware als der Chef-Maschine. Der 2–3-Zonen-Beta-Schnitt hält das Risiko klein, hält den Rest der
Roadmap (Horn/Musik-Lizenz/Rest-Battlescreens, laut Memory-Stand 0.2.0 noch offen) unangetastet, und der
Options-Toggle macht das Ergebnis nach echtem Spieler-Feedback beliebig nachschärf- oder rückbaubar.

---

## Anhang: Belege/Artefakte

- Code gelesen: `apps/client/src/renderer/components/arena25d/{README.md,flag.ts,index.ts,Arena25DStage.tsx,styles.ts}`,
  `apps/client/src/renderer/pages/CombatPage.tsx` (Mount-Switch, Ken-Burns/Partikel-Stellen),
  `apps/client/src/renderer/styles/combat.css` (Z. 1879–2038, 6039–6127).
- Build tatsächlich ausgeführt: `pnpm --filter @hearthforge/client build` (grün, 7,0 s) — Bundle-Grep-
  Ergebnisse s. Abschnitt 1.2 (kein Repo-File verändert, `out/renderer/` ist regulärer Build-Output).
- Wegwerf-Beweis: `design/mockups/battle-25d-light-2026-08-03/index.html` (referenziert echte, unveränderte
  Assets, kein Produktivcode, nicht ins Spiel eingebunden).
- Sprite-Alpha-Messung (Python/Pillow, einmaliges Skript, nicht Teil des Repos): `bull_boss.webp` 16,8 %,
  `skeleton_warrior.webp` 8,9 %, `char_1.webp` 3,0 % unterste transparente Fußzone.
- Nicht geprüft (außerhalb meiner Werkzeuge/Rolle): Framerate auf realer Nicht-Chef-Hardware, DevTools-
  Layers-Panel-Auszählung für den DOM/CSS-Beweis, three.js-Gzip-Größe real in DIESEM Bundle (nur
  Fremdwissen zitiert, klar markiert).
