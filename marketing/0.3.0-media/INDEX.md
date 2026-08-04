# 0.3.0 Store-Media — Rohmaterial (2026-08-03, Verfeinerungsrunde)

Erzeugt headless über `apps/client/ui-audit/mkt-0.3.0-media.mjs` (eigener Vite-Dev-Server +
Playwright-Chromium, NIE Electron — Muster aus `sim-harness.mjs`/`newhaven-audit-335.mjs`). Sprache
durchgängig EN. Kein Produktivcode geändert; nur Fixtures (`ui-audit/fixtures/mkt_camp.json` +
Kopie in `src/renderer/public/ui-audit-fixtures/`) und das Wegwerf-Skript.

**Alle Screenshots sind maschinell auf exakt 1920×1080 px verifiziert** (Chef-Korrektur aus der
ersten Runde: keine 3440×1440-Varianten, kein DSF2-Rohformat als Endergebnis). Aufnahme lief mit
`deviceScaleFactor:2` (schärfer dank Supersampling), danach IMMER verlustarm mit Lanczos auf
1920×1080 skaliert/beschnitten (uniform, keine Verzerrung). Verifikationsmethode: Python/Pillow
`Image.size`, siehe Tabelle unten — alle 9 Dateien `OK`. Video-Clips wurden in dieser Runde NICHT
angefasst (Chef-Vorgabe), laufen weiter nativ mit DSF 1, ebenfalls 1920×1080.

## Diese Runde: Chef-Sichtprüfung von `01-newhaven-night` fand 3 echte Probleme

Nach visueller Abnahme des Nacht-Hero-Shots aus der ersten Runde kam der Auftrag: loses UI-Element
raus, warme Glutlicht-Akzente prominenter, Siedlung statt Rasterlayout, Tag-Shot nachziehen,
alle 8 Shots auf lose UI-Elemente gegenprüfen, ein neues Kampf-Motiv mit ausgeklapptem Dock. Ergebnis:

1. **Loser Fortschrittsbalken behoben.** Die alte `mkt_camp`-Fixture hatte einen DAUERHAFTEN
   `buildJob` (10h Restzeit) — im 5×3-Raster stand der Balken weit unter seinem im Dunkeln kaum
   sichtbaren Gerüst, ohne erkennbaren Bezug. Fix: Die Basis-Fixture ist jetzt vollständig fertig
   gebaut (`buildJob: null`, `camp_fence_tent` Stufe III) — der Nacht-Shot zeigt gar keine Baustelle
   mehr. Der Tag-Shot patcht `camp_fence_tent` per `evalDebug` NUR für sich selbst temporär auf
   Stufe II mit aktivem Ausbau zurück (Gerüst + Balken sitzen auf derselben Kachel, jetzt mitten in
   der dichten Siedlung statt in einer leeren Rasterzelle).
2. **Warme Glutlicht-Akzente geprüft und bewusst komponiert.** Ein Pixel-Scan ALLER 15
   `camp_*_3_night.webp`-Sprites (jedes Pixel, Schwelle r>150 & r-b>60 & r>g+10) ergab: NUR
   `camp_smelter` trägt echtes Glutlicht (2 Ofenmäuler, ~28 kräftige warme Pixel) — Zentralhaus,
   Räucherhaus und alle anderen sind komplett kalt (Warden-Schrein-Brazier: nur 3 sehr schwache
   Pixel, kaum sichtbar). Der einzige weitere echte warme Fleck ist fest in `camp_map_night.webp`
   gebacken — ein Lagerfeuer-/Herdfleck am Kartenmittelpunkt (Zentroid bei 50%/48%, pixelgenau
   vermessen), UNABHÄNGIG davon, welches Gebäude dort steht. Erste Positionierung (Zentralhaus
   direkt AUF den Fleck) verdeckte ihn komplett unter dem großen, opaken Gebäude-Sprite — behoben,
   indem die Kachel selbst frei bleibt: die 6 Kern-Gebäude bilden jetzt einen Ring UM den Fleck
   („Dorfplatz mit Feuerstelle"), der warme Schein füllt die Lücke zwischen den Dächern. Zusammen
   mit dem Schmelzofen-Glutlicht (oben rechts an der Felswand) ergibt das 2 echte, bewusst
   komponierte Lichtquellen — s. „Was ggf. noch verbessert werden könnte" für eine Asset-Anregung.
3. **Kästchenpapier → gewachsene Siedlung.** `camp.positions` komplett neu: kein Gitter mehr,
   sondern ein dichter, unregelmäßiger Ring aus Zentralhaus/Schrein/Ahnenwand/Schreiberzelt/
   Lagerhaus/Handelsposten um den Dorfplatz, Schmelzofen+Stollen an der Felswand (oben rechts),
   Sägegrube+Fischerhütte+Räucherhaus am Bach (unten links), Wachturm am Waldrand (oben links),
   Saatgarten an der Palisade (unten rechts) — bewusste Lücken, keine zwei Gebäude auf gleicher
   Zeile/Spalte. Zusätzlich: ein `zoomFrac`-Crop (0.82, zentriert) in `finalizeTo1080p()`, damit die
   Karte dichter/„voller" wirkt statt eine dünn besiedelte Lichtung zu zeigen (Chef-O.K. „gern
   heranzoomen").
4. **Tag-Shot nachgezogen** mit identischer Komposition/Positionen — zeigt dieselbe Siedlung bei
   Tag, MIT der lebenden Baustelle (s. Punkt 1).
5. **Alle 8 Alt-Shots gegengeprüft.** Fund: `06-skills-*` (alle drei) hatten einen losen
   „Mist Vigil"-Tooltip über der TopBar — Ursache war `page.mouse.move(10, 10)` im Skript, das
   GENAU auf dem Wetter-Buff-Badge unter dem Charakterporträt landete und dessen Hover-Tooltip
   auslöste, statt es (wie beabsichtigt) loszulassen. Fix: Zielpunkt jetzt bei `(960, 215)`, einer
   garantiert leeren Zone. Alle 3 neu geschossen, Tooltip weg. `03`, `04`, `05` waren bei genauer
   Prüfung sauber (keine Toasts/Tooltips/Overlays ohne Kontext) — unverändert gelassen.
6. **Neues Zusatzmotiv `07-combat-drazhan-dock`**: Kampf mit AUSGEKLAPPTEM Ausrüstungs-Dock (Gear-Tab)
   UND ausgeklapptem Battle Record — zeigt das gelandete Frontline-Harness-Redesign in voller Tiefe.
   `endgame`-Fixture (Lv1915, vollständiges Godly/Ninth-Warden-14-Slot-Loadout) + Runtime-Patch
   direkt in `drazhan` (Endboss hinter `behind_the_throne`, s. Abweichungen unten).

## Screenshots (`screenshots/`, alle 1920×1080 PNG)

| # | Datei | Motiv | Fixture / Zustand | Verifikation |
|---|---|---|---|---|
| 1 | `01-newhaven-night-1920x1080.png` | **[ERSETZT]** New Haven bei Nacht, gewachsene Siedlung um einen lagerfeuerhellen Dorfplatz, Schmelzofen-Glutlicht an der Felswand, dichter herangezoomt | `mkt_camp` (neu: Ring-Layout, kein `buildJob`), `.nh-debug-light` „night", `zoomFrac 0.82` | 1920×1080 OK, 2567KB |
| 2 | `02-newhaven-day-construction-1920x1080.png` | **[ERSETZT]** Dieselbe Siedlung bei Tag, `camp_fence_tent` per Runtime-Patch auf Stufe II mit Gerüst+Balken inmitten der dichten Bebauung | `mkt_camp` + `evalDebug`-Patch, „day", `zoomFrac 0.82` | 1920×1080 OK, 3627KB |
| 3 | `03-bestiary-journey-1920x1080.png` | Bestiarium — „Ashfields" (7/7 entdeckt) übergehend in „Blackthorn Wood" (4/10, gesperrt) — unverändert, bei Prüfung sauber befunden | `nh_map_audit` | 1920×1080 OK, 2048KB |
| 4 | `04-zones-overview-1920x1080.png` | Zonen-Übersicht, 3-Spalten-Grid mit Artwork-Bühne (9 Zonen, freigeschaltet+gesperrt gemischt) — unverändert | `nh_map_audit` | 1920×1080 OK, 2344KB |
| 5 | `05-combat-goblin-warchief-1920x1080.png` | Kampf gegen Goblin Warchief (Dungeon-Endboss, „The Goblin Warband" Wave 5/5), Dock EINGEKLAPPT (cinematischer Bühnen-Fokus) — unverändert | `nh_map_audit` + Runtime-State-Patch | 1920×1080 OK, 2235KB |
| 6 | `06-skills-mining-1920x1080.png` | **[ERSETZT]** Skill-Seite Mining, aktive Aktion — loser Tooltip entfernt | `nh_map_audit` | 1920×1080 OK, 1772KB |
| 7 | `06-skills-foraging-1920x1080.png` | **[ERSETZT]** Skill-Seite Foraging, aktive Aktion — loser Tooltip entfernt | `nh_map_audit` | 1920×1080 OK, 1782KB |
| 8 | `06-skills-woodcutting-1920x1080.png` | **[ERSETZT]** Skill-Seite Woodcutting, aktive Aktion — loser Tooltip entfernt | `nh_map_audit` | 1920×1080 OK, 1865KB |
| 9 | `07-combat-drazhan-dock-1920x1080.png` | **[NEU]** Kampf gegen Drazhan the Crownless (finaler Story-Endboss, „Behind the Throne"), Ausrüstungs-Dock UND Battle Record beide AUSGEKLAPPT — zeigt volles Godly-Loadout + Live-Kampf-Log | `endgame` + Runtime-State-Patch (Lv1915-Charakter direkt in den Boss-Encounter versetzt) | 1920×1080 OK, 2202KB |

### Top 6 (Empfehlung für die Store-Seite)

1. **`01-newhaven-night-1920x1080.png`** — jetzt der stärkste Einzelshot: warmer Dorfplatz, Glutlicht
   am Schmelzofen, dichte gewachsene Siedlung statt Raster.
2. **`04-zones-overview-1920x1080.png`** — zeigt Umfang/Content-Tiefe auf einen Blick.
3. **`07-combat-drazhan-dock-1920x1080.png`** — NEU: UI-Tiefe (Gear-Dock + Battle Record), imposanter
   Endgame-Boss, volles Loadout sichtbar.
4. **`05-combat-goblin-warchief-1920x1080.png`** — cinematischer Gegenpol zu #3 (Dock eingeklappt,
   Kampf-Bühne dominiert).
5. **`02-newhaven-day-construction-1920x1080.png`** — Ergänzung zu #1, zeigt „lebendiges" Lager mit
   echter Baustelle.
6. **`03-bestiary-journey-1920x1080.png`** — Content-Tiefe/Entdeckungsschleife, gut lesbar.

Die drei Skill-Shots bleiben solides, austauschbares Zusatzmaterial (z.B. Feature-Grid). `foraging`
ist von den dreien am unterscheidbarsten (eigenes Kulissenbild je Aktion statt Icon-Wiederholung).

## Video-Clips (`clips/`, alle 1920×1080 WebM/VP8, 25fps) — diese Runde NICHT angefasst

| # | Datei | Dauer | Inhalt |
|---|---|---|---|
| 1 | `clip-01-day-to-night.webm` | 11.2s | Volles Lager: 2s Tag, Klick auf Tag/Nacht-Umschalter, ~8s Nacht einwirken lassen. |
| 2 | `clip-02-camp-life.webm` | 12.0s | Cursor wandert über 3 Gebäude (Townhall/Smelter/Fence's Tent), Townhall anklicken → Popup (Level III, „Fully built") → schließen, Move-Modus an, Wachturm sanft verschieben, Move-Modus aus. |
| 3 | `clip-03-bestiary-journey.webm` | 14.1s | Gleichmäßiger, programmatischer Scroll (120 Schritte, konstante Geschwindigkeit) durch 4+ Zonen-Bänder — sichtbarer Übergang von voll entdeckt zu Silhouetten. |
| 4 | `clip-04-combat-loop.webm` | 13.4s | ~12s echter Kampf gegen Goblin Warchief: Treffer-Floater, Kampf-Log (inkl. Pet-Fähigkeit „Root Snare"), HP-Balken bewegen sich sichtbar. |

Hinweis: `clip-01`/`clip-02` nutzen `mkt_camp` und zeigen damit ab sofort automatisch das NEUE
Siedlungs-Layout (Fixture wurde in-place aktualisiert) — visuell nicht neu geprüft in dieser Runde
(Chef-Vorgabe: Clips nicht neu machen), sollte aber bei Gelegenheit einmal gegengesehen werden, da
sich Gebäudepositionen/-abstände verschoben haben.

## Motiv-Entscheidungen & Abweichungen vom Briefing (diese Runde)

- **Drazhan statt Zufallsmonster für #7:** Der Auftrag nannte „endgame/b3_dungeon" als Fixture:
  beide sind Lv1915-Charaktere ohne aktiven Kampf. Gewählt wurde der Endboss `drazhan` (hinter
  `behind_the_throne`, Gate `chronicle_19`) statt z.B. `last_idol` — sein Art-Asset
  (`assets/monsters/drazhan.webp`, gekrönter Dunkelritter mit Kronenkette) ist trotz eines
  gegenteiligen Content-Kommentars („Boss-Art existiert noch nicht") tatsächlich vorhanden und
  imposant; außerdem sorgt ein anderer Boss als in Screenshot #5 für Abwechslung im Store-Material.
- **Kein künstlicher HP-Boost für Screenshot #7:** `drazhan` schlägt vor Mitigation hart zu (dmg
  262), aber ein erfundener `character.hp`-Wert hätte nur ein unplausibles Label produziert (die
  HP-Leiste clamped `pct` ohnehin auf 100 %, s. `Bar()` in `CombatPage.tsx`). Stattdessen bleibt die
  Wartezeit nach dem Zustands-Patch bewusst KNAPP unter `drazhan`s `attackIntervalMs` (3500ms) — der
  Spieler landet mit seinem schnelleren Timer sicher einen echten Treffer (Log zeigt „YOU MISS" +
  Floater, also lebendig), der erste potenziell kräftige Gegenschlag ist zum Aufnahmezeitpunkt aber
  noch gar nicht fällig. Kein Risiko eines One-Shot-Defeat-Overlays. Präzedenzfall: Screenshot #5
  (`goblin_warchief`, längere Wartezeit, Treffer landete) blieb mit vollem Loadout safe bei 14 von
  208 hp — Drazhans Gegner ist bewusst NIE zum Schlag gekommen, nicht nur mitigiert.
- **Ring-Layout statt Raster für `mkt_camp`:** Positionen sind jetzt bewusst NICHT
  kollisionsmathematisch exakt vermessen (dafür gibt es keine Laufzeit-Introspektion außerhalb des
  Browsers) — iterativ per Screenshot geprüft und nachjustiert, bis die Siedlung dicht, aber ohne
  hässliche Sprite-Überlappungen wirkt.
- **Zoom/Crop statt echtem Kamera-Pan:** Wie in der ersten Runde festgestellt, hat `.nh-map` keine
  Kamera (feste Aspect-Ratio, volle Weltfläche immer sichtbar). Statt dessen schneidet
  `finalizeTo1080p()` jetzt optional einen zentrierten `zoomFrac`-Ausschnitt VOR dem finalen
  Lanczos-Resize aus der DSF2-Rohaufnahme — reiner Post-Processing-Crop, keine Änderung an
  `NewHavenPage.tsx`/CSS.

## Bekannter, NICHT behobener UI-Befund (Empfehlung für ein Folge-Ticket)

Der Baustellen-Fortschrittsbalken (`.nh-map-tile-progress`, `newhaven.css`) sitzt CSS-fix am unteren
Rand der gemeinsamen, townhall-großen Kollisionsbühne jeder Kachel (`position:absolute; bottom:4px`
relativ zu `.nh-map-tile`). Kleinere Gebäude (Skalierungsfaktor < 1, z.B. `camp_fence_tent` bei
0.94) sitzen dank `object-fit:contain`+`align-items:flex-end` VISUELL höher in dieser Box als der
Balken — im Tag-Shot (#2) ist dadurch ein sichtbarer, wenn auch kleiner, Abstand zwischen Gerüst und
Balken zu sehen (in dieser Runde durch dichtere Nachbarbebauung kaschiert, aber nicht strukturell
behoben — das wäre eine CSS-Änderung in `newhaven.css`/`NewHavenPage.tsx`, außerhalb des
Marketing-Fixture-Auftrags). Kein Blocker für den aktuellen Screenshot, aber ein echter kleiner
Layout-Bug, den die UI-Kollegin bei Gelegenheit im Produktivcode beheben könnte (z.B. Balken relativ
zur tatsächlichen Sprite-Höhe statt zur Kollisionsbühne positionieren).

## Was ggf. noch verbessert werden könnte (Asset-Anregung, kein Code-Fix)

Der Pixel-Scan (s.o.) zeigt: von 15 Lager-Gebäuden trägt nur `camp_smelter` echtes Glutlicht in
seiner Nacht-Textur. Für zukünftige Store-/Marketing-Aufnahmen (und für die Nacht-Atmosphäre im
Spiel selbst) wäre ein zweites oder drittes Gebäude mit einem echten, kleinen Ember-Akzent
(z.B. ein beleuchtetes Fenster am Zentralhaus, eine Räucherhaus-Feuerstelle) ein günstiger
Folge-Auftrag für die Art-Pipeline — das wäre KEIN UI-Code-Fix, sondern eine neue Sprite-Lieferung
vom Chef/Art-Team.

## Was store-ready ist

Alle 9 Screenshots und alle 4 Clips sind nach visueller Einzelprüfung (jede Datei angesehen) sauber:
keine Debug-/Dev-Elemente, kein Onboarding-Overlay, keine leeren Fehlerzustände, keine losen
Tooltips/Toasts/Overlays, EN-Sprache, exakt 1920×1080. `01`, `04`, `07` sind unmittelbar store-ready
Hero-Shots. `02`, `03`, `05` sind starke Ergänzungen. Die Skill-Shots sind solides, aber
austauschbares Zusatzmaterial.

## Reproduzierbarkeit

```
cd apps/client
node ui-audit/mkt-0.3.0-media.mjs list                      # alle Motive auflisten
node ui-audit/mkt-0.3.0-media.mjs camp-night camp-day        # Lager-Screenshots neu erzeugen
node ui-audit/mkt-0.3.0-media.mjs combat-dock                # neues Dock+Battle-Record-Motiv
node ui-audit/mkt-0.3.0-media.mjs skills                     # alle 3 Skill-Shots neu erzeugen
node ui-audit/mkt-0.3.0-media.mjs clip-combat                # einzelnen Clip neu erzeugen
node ui-audit/mkt-0.3.0-media.mjs all                        # alles neu erzeugen (inkl. Clips)
```

Eigener Wegwerf-Dev-Server auf Port 5391 (außerhalb des bot.mjs-Reservats 5340-5359). Fixtures:
`ui-audit/fixtures/{nh_map_audit,mkt_camp,endgame,b3_dungeon}.json` (+ Kopie in
`src/renderer/public/ui-audit-fixtures/`).
