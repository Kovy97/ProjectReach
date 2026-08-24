# UI-Audit 1.1.0 — Thema: Bilder in Karten

Chef-Zitat: „Bilder in Cards wie zb im New Haven Building sind die Bilder nicht zentriert und viel
zu klein." Auditiert per Live-DOM-Messung (Playwright über `ui-audit/sim-harness.mjs`, Port 5343,
Fixture `midgame`, Locale `de`, Viewports 1920×1080 und 1600×900) + Kontaktbögen aus echten
Screenshots (Python/PIL), tatsächlich angesehen. **Ausgenommen laut Auftrag:** die
Gegnerauswahl-Karten im Kampf (`100% auto` / `bottom center`) — dort KEIN Befund, unabhängig vom
Aussehen.

Alle Messwerte unten sind für 1920×1080 UND 1600×900 gültig: keine der betroffenen Komponenten hat
zwischen diesen zwei Breiten eine `@media`-Regel (geprüft per Brace-Tiefen-Analyse der CSS-Dateien);
die responsiven Werte kommen ausschließlich aus `clamp()`/Container-Queries, die bei beiden
Auflösungen praktisch denselben Wert liefern (stichprobenartig verifiziert, s. New Haven unten).

## Ergebnis-Tabelle (ein Kartentyp pro Zeile)

| Kartentyp | Motivanteil der Bildfläche (gemessen/gerechnet) | Zentriert? | Quellauflösung | Urteil |
|---|---|---|---|---|
| **New Haven — Gebäude-Karten (Liste)** | ~6–13 % (Stufe I / Vorschau, die meisten Gebäude), bis ~33–37 % (Zentralhaus Stufe III, größtes Motiv im Katalog) | Horizontal ja (Motiv-Mitte je Asset exakt bei x=0.50), **vertikal nein** — Motiv sitzt im unteren Drittel des Fensters, oben bleibt ein toter Grauband von 40–65 % der Fensterhöhe leer | 1536×1536 px (WebP), Motiv selbst nur 331–880 px hoch/breit — reichlich Pixel vorhanden, aber riesiger transparenter Rand | **BEFUND — Chefs Hauptbeispiel bestätigt** |
| **New Haven — Baumenü-Thumbnails (Dorfkarte, „Bauen"-Liste)** | de facto ~1–3 % (34×34-px-Kachel, `object-fit:contain` auf dasselbe stark gepolsterte 1536er-Asset) | horizontal ja, vertikal nein (gleicher Rand-Effekt, nur extremer) | dieselben 1536×1536-Assets | **BEFUND (Neben-Fund)** — Icon bei realer Größe praktisch unsichtbar |
| **Shop — Warenkarten** | ~45–55 % des Bild-Fensters (Icon 112×100 px in einem 208×132-px-Fenster) | **Nein** — Icon klebt oben links in der Fensterecke statt zu zentrieren | 640×640 px, Motiv selbst schon 51–83 % der Canvas ausfüllend (gute Quelle) | **BEFUND** — reiner Layout-Bug, keine Asset-Frage |
| **Rezept-Karten (Crafting, z. B. Schmieden)** | ~34 % der Banner-Fläche (150×150 px in 350×174 px), aber Banner hat einen vollflächigen Schmiede-Hintergrund | Ja, horizontal + vertikal zentriert | 640×640 px, gut komponiert | Kein Befund — der „leere" Rest ist bewusst mit Kulisse gefüllt |
| **Item-Zellen — Inventar** | ~76 % des Slots (55.4 px Bild in 73×73-px-Slot) | Wirkt zentriert (kleiner Versatz durch fehlendes echtes Zentrieren, s. Analyse unten, aber bei 88 %-Füllung nicht wahrnehmbar) | 640×640 px | Kein Befund |
| **Item-Zellen — Bank** | ~73 % des Slots (56.1 px in 76.8×76.8-px-Slot) | dito | 640×640 px | Kein Befund |
| **Zonen-Karten (Kampf-Zonengrid)** | 100 % — echtes `background-size:cover` | Ja | 880×293 px `.card.webp` (eigene Kartenvariante) | Kein Befund |
| **Monster-Karten (Gegnerauswahl)** | (laut Auftrag ausgenommen) | (ausgenommen) | 1254×1254 px | **Kein Befund per Vorgabe** |
| **Begleiter-Karten (Listenporträt + große Bühne)** | Listenporträt und Detail-Bühne füllen ihren Rahmen sichtbar voll (92–94 % Box, gutes Motiv) | Ja | 1254×1254 px, gut komponiert | Kein Befund |
| **Erfolgs-Karten (Medaillons)** | 22–46 px feste Badge-Icons, kein Artwork-Bereich | n/a (Mini-Icon, kein „Bild in Card" im Sinne der Frage) | 1254×1254 px (Kategorie-Icons) | Kein Befund / anderes Format |
| **Quest-Einträge (Story/Aufträge/Täglich)** | Kein Bildbereich vorhanden | n/a | n/a | Kein Befund (strukturell bildlos, nicht „zu klein") |
| **Quest-Belohnungs-Shop** | 100 % — Icon füllt sein 64×64-Fenster exakt | Ja | 640×640 px | Kein Befund |

---

## 1. New Haven — Gebäude-Karten (Liste), das Chef-Beispiel

**Live-DOM-Messung** (`.nh-grid > .nh-card`, Karte „Zentralhaus" Stufe III, 1920×1080):

- Karte gesamt: 379.7 × 760 px
- Bild-Fenster `.nh-art` (der Rahmen, in dem das Gebäudebild sitzt): 327.7 × 188 px, `aspect-ratio: auto`
  (NICHT mehr 16:9 — das ist eine spätere, unconditional Regel, s. u.)
- `<img class="nh-art-img">`: `object-fit: contain`, `object-position: 50% 50%` (computed, live gemessen —
  NICHT `cover`/`bottom center`, wie eine ältere, weniger spezifische Regel im selben File nahelegt)
- Zusätzlich ein `transform: scale(1.65)` mit `transform-origin: center 72%` auf genau diesem Bild

CSS-Fundstellen (`apps/client/src/renderer/styles/newhaven.css`, alle **außerhalb** jeder
`@media`-Regel geprüft, gelten also gleich bei 1920×1080 und 1600×900):
- Zeile 131–147: Basis-Regel (`aspect-ratio:16/9`, `object-fit:cover`, `object-position:center bottom`)
- Zeile 1786–1803: spätere, unconditional Regel gleicher Selektor-Familie — überschreibt `aspect-ratio`
  auf `auto` und `object-fit`/`object-position` auf `contain`/`center`
- Zeile 1973–2051 („Action-Card V2"): aktuelle Karten-/Fenstergrößen (`clamp()`-basiert)
- Zeile 2335–2347: der `transform: scale(1.65)`-Kompensationsversuch — mit einem Entwickler-Kommentar,
  der das Problem bereits benennt: *„Die produktiven Encampment-Sprites besitzen bewusst eine
  großzügige transparente 1536er Sicherheitsfläche. In Listen-/Detailkarten wird nur die sichtbare
  Gebäudemasse vergrößert."*

**Quellbild-Messung** (`apps/client/src/renderer/assets/camp/*.webp`, Alpha-Bounding-Box gemessen):
alle 15 Gebäude × 3 Stufen sind 1536×1536 px, aber das tatsächliche Gebäude-Motiv nimmt je nach
Gebäude/Stufe nur **5.8 % bis 26.7 %** der Canvas-Fläche ein (z. B. `camp_fence_tent_1` 5.8 %,
`camp_scrivener_tent_1` 9.4 %, `camp_watchtower_3` 19.3 %, `camp_townhall_3` — das größte Einzelmotiv
im ganzen Katalog — 26.7 %). Horizontal ist jedes Motiv exakt bei x=0.50 zentriert; vertikal sitzt es
fast immer knapp über dem unteren Canvas-Rand (Bottom-Anchoring).

**Rechnung** (Container-Fenster + `contain`-Fit + `scale(1.65)` kombiniert, 1920×1080): das sichtbare
Fenster entspricht — wegen `overflow:hidden` auf `.nh-art` — einem Ausschnitt von Quell-Y ≈ 416–1385 px
(von 1536), horizontal unbeschnitten. Für `camp_townhall_3` (Motiv-Y 586–1353) bleibt das Motiv knapp
innerhalb dieses Fensters und füllt ~33–37 % der sichtbaren Fensterfläche; für `camp_scrivener_tent_1`
sind es ~12–13 %; für die kleinsten Level-I-Gebäude ~7–8 %.

**Angesehene Belege** (alle unter `G:\GameDev\design\ui-1.1.0\shots\`):
- `contactsheet-newhaven-list-1920.png` — vier Karten aus dem echten 1920×1080-Screenshot
  nebeneinander (Zentralhaus III, Wachturm III, Vorratsspeicher II, Schreibzelt I/unbebaut). Man sieht:
  selbst die zwei voll ausgebauten Stufe-III-Gebäude wirken wie kleine Spielfiguren auf einer leeren
  grauen Steinfläche, das unbebaute Schreibzelt ist nur ein kleiner Fleck unten links.
- `contactsheet-newhaven-artwindow-zoom2x.png` — dieselben vier Bild-Fenster einzeln, 2× vergrößert,
  mit gemessenem Quellmotiv-Anteil als Beschriftung. Klar sichtbar: **oben in jedem Fenster bleibt eine
  durchgehende leere Grauband-Zone** (grob 55–65 % der Fensterhöhe), das Gebäude „schwimmt" im unteren
  Drittel — das ist exakt das „nicht zentriert" aus der Chef-Beschwerde, nur dass es vertikal statt
  horizontal auftritt (horizontal ist die Zentrierung durch `object-position:50% 50%` tatsächlich exakt,
  nur bringt sie nichts, wenn das Motiv selbst so klein ist, dass die Asymmetrie der Silhouette –
  Treppen, Fahnen, Vordächer – stärker ins Auge fällt als die Fenstermitte).
- `1920x1080/newhaven-list-full.png` / `1600x900/newhaven-list-full.png` — volle Seiten-Screenshots
  als Kontext (Kartengröße, Nachbarkarten, Sidebar).
- `contactsheet-newhaven-buildmenu-zoom3x.png` — die kleine 34×34-px-Vorschau im Baumenü der
  Dorfkarte-Ansicht: bei 3-facher Vergrößerung ist gerade noch ein winziger grauer Fleck am unteren
  Rand des Quadrats zu erkennen — bei echter Größe im Spiel ist das Icon praktisch nicht lesbar.

## 2. Shop — Warenkarten (zweiter echter Befund)

**Live-DOM-Messung** (`.shopv2-card-image-area .shopv2-cell .item-cell-img`, 1920×1080): Bild-Box
112 × 100.4 px, Bild-Fenster (`.shopv2-cell`) 198.1 × 122.4 px. Die Bild-Box beginnt exakt an
Position (0,0) ihres Fensters — sie ist **nicht zentriert, sondern oben links verankert.**

**Root Cause** (anders als New Haven — kein Asset-Problem, reiner Layout-Bug): die Basis-Klasse
`.item-cell` (`styles/components.css:110-126`) hat **kein** `display:flex`/`align-items`/
`justify-content` und auch kein `margin:auto` — ihr Kind `.item-cell-img` (width/height: 88 %, bzw.
im Shop-Override `min(82%,112px)`) wird dadurch nie aktiv zentriert, sondern läuft nur im normalen
Blockfluss oben links ein. Das fällt in Inventar/Bank kaum auf, weil dort der Slot fast quadratisch
UND das Bild fast so groß wie der Slot ist (88 % Füllung → nur ein winziger Rest-Offset). Im Shop
wurde `.shopv2-cell` per Override (`styles/shop.css:795-799`, `width:100%;height:100%`) aber auf ein
deutlich größeres, nicht-quadratisches Fenster aufgeblasen (198×122 statt der ursprünglich
vorgesehenen festen 84×84 aus der Basisregel `styles/shop.css:334-382`) — bei diesem Größenverhältnis
wird der fehlende Zentrierungsmechanismus klar sichtbar.

**Angesehener Beleg:** `contactsheet-shop-zoom3x.png` (3× Zoom, drei Waffen-Warenkarten aus dem
echten `1920x1080/shop-full.png`-Screenshot) — Schwert, Bogen und Stab hängen alle sichtbar in der
linken Bildhälfte ihres Fensters, die rechten zwei Drittel jeder Karte bleiben dunkler Leerraum.

## 3. Kontrollfälle ohne Befund (zum Vergleich angesehen)

- `1920x1080/character-inventory-full.png`, `1920x1080/bank-full.png`: Item-Icons füllen ihre
  quadratischen Slots sichtbar gut aus, kein wahrnehmbares Zentrierungsproblem trotz desselben
  fehlenden Flex-Mechanismus wie beim Shop (s. o.) — hier ist der Größenunterschied Bild/Fenster
  einfach zu klein, um aufzufallen.
- `1920x1080/combat-zones-full.png`: Zonenkarten nutzen echtes `background-size:cover` auf dem
  eigenen `.zone-card`-Button — volle Bildfläche, kein Rand, kein Befund.
- `1920x1080/smithing-recipes-full.png`: Rezept-Icons sind kleiner als ihr Banner, aber das Banner
  selbst trägt eine vollflächige Schmiede-Kulisse (`skillcard-banner-bg`, `cover`-Fit) — der „Rest"
  ist bespielter Hintergrund, kein toter Leerraum. Kein Befund.
- `diag/diag3-companions-detail.png`, `diag/diag3-companions-list.png` (Begleiter testweise per
  Live-State freigeschaltet, da die Fixture `midgame` 0/21 Begleiter besitzt): sowohl die kleine
  Listen-Miniatur als auch die große Detail-Bühne zeigen ein gut komponiertes, praktisch
  randfüllendes Kreaturenbild. Kein Befund.
- `1920x1080/achievements-full.png`: Erfolgs-Karten tragen nur 22–46 px große Rarity-/Kategorie-
  Medaillons, kein Artwork-Bereich im Sinne der Frage — nicht vergleichbar mit „Bild in Card".
- `1920x1080/quests-shop-full.png`: Belohnungs-Shop-Icons füllen ihr 64×64-Fenster exakt. Die
  Quest-Liste selbst (Story/Aufträge/Täglich) hat gar keinen Bildbereich — kein Rand-/Größen-Bug,
  weil schlicht nichts an Bildfläche vorhanden ist.

---

## Fazit: reines CSS vs. neue Assets

**Braucht neue/größere Assets (CSS allein reicht nicht sauber):**
- **New Haven — Gebäude-Karten.** Der transparente Sicherheitsrand der Quell-PNGs schwankt pro
  Gebäude/Stufe zwischen 5.8 % und 26.7 % Flächenanteil — mehr als das 4-Fache Spannweite. Eine
  einzelne globale CSS-Zahl (aktuell `scale(1.65)`) kann das nicht für alle Gebäude gleichzeitig
  lösen: groß genug für die kleinsten Gebäude würde die größten (Zentralhaus, Werkhof Stufe III)
  bereits am Fensterrand beschneiden. **Es muss aber keine neu generierte Kunst sein** — die
  1536×1536-Pixel sind selbst hochauflösend genug (das Zentralhaus-III-Motiv allein ist bereits
  822×767 px scharf gezeichnet); ein reines **Zuschneiden/Trimmen** des vorhandenen transparenten
  Rands auf allen 90 Dateien würde genügen, ist aber Asset-Bildbearbeitung, keine Code-Änderung.
  → Alternative, rein codeseitige Zwischenlösung: `campArt.ts` besitzt mit
  `CAMP_MAP_VISUAL_SCALE`/`CAMP_MAP_DEFAULT_CALIBRATION_PERCENT` (Zeile 60–109) bereits einen
  **pro-Gebäude-Skalierungsmechanismus**, der aktuell NUR die Dorfkarten-Ansicht bedient. Eine
  analoge, pro Gebäude/Stufe abgestufte Skalierung für die Listen-Karte (statt des einen flachen
  `scale(1.65)`) wäre ohne neue Bilddateien möglich und würde das Problem deutlich lindern, auch
  wenn ein sauberer Zuschnitt der Quellbilder langfristig die robustere Lösung bleibt.
- New Havens Baumenü-Thumbnail hängt an derselben Quelle — profitiert automatisch von jeder der
  beiden obigen Lösungen.

**Reines CSS/Layout löst es vollständig (keine neuen Bilder nötig):**
- **Shop-Warenkarten.** Die Quell-Icons sind bereits gut komponiert (51–83 % Canvas-Füllung). Es
  fehlt nur eine aktive Zentrierung (`display:flex;align-items:center;justify-content:center` auf
  `.item-cell` selbst, oder gezielt auf `.shopv2-card-image-area .shopv2-cell`) — eine
  Ein-Zeilen-CSS-Ergänzung.
- Alle anderen geprüften Kartentypen benötigen keine Änderung.

Alle Screenshots/Kontaktbögen liegen unter `G:\GameDev\design\ui-1.1.0\shots\` (Unterordner
`1920x1080/`, `1600x900/`, `diag/`, sowie die `contactsheet-*.png`-Dateien im shots-Wurzelordner).
Rohdaten der Live-DOM-Messung (Bounding-Boxes, computed styles) liegen als
`measure-result.json`/`measure2-result.json` neben den jeweiligen Screenshots.
