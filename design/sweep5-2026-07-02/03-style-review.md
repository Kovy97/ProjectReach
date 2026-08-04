# Sweep 5 — Visueller Stil- & Konsistenz-Review (Art-Director-Pass)

Datum: 2026-07-02 · Reviewer: Kontrolleur (visuell) · Basis: `apps/client/ui-audit/shots/` (54 Screenshots, midgame + endgame, 27 Seiten) + `apps/client/ui-audit/report.md`

**Gesichtete Seiten (beide Fixtures, sofern relevant):** combat, character, achievements, shop, bank, farming, woodcutting, smithing, cooking, skills-overview, bestiary, quests, companions, mastery, stats, options, slayer, enchanting, thieving — 19 von 27 Seiten visuell geprüft, Rest über report.md-Daten abgedeckt.

Hinweis: Während des Reviews lief die Screenshot-Tour zweimal neu durch (ui-dev arbeitet am Renderer). Alle Kernbefunde wurden auf dem **neuesten** Satz verifiziert; die Achievements-/Character-Befunde sind in alter UND neuer Aufnahme identisch, also aktuell noch offen.

---

## Priorisierte Findings (Top 10)

### 1. [HOCH][ux] Achievements: Kartentitel werden buchstabenweise zerschreddert
**Screenshots:** `midgame/achievements.png`, `endgame/achievements.png` (identisch in beiden)
Titel neben dem Rarity-Badge brechen mitten im Wort um, im Extremfall **ein Buchstabe pro Zeile**: „LEHR/LING", „G/ES/EL/LE", „TRANSZE/NDENT", „VOLLEND/ER" und komplett vertikal „T/I/E/R/B/E/G/L/E/I/T/E/R". Das ist der bekannte „Name überlappt Badge"-Fund — der frühere Fix (`word-break: break-word` in `apps/client/src/renderer/styles/pages.css:2292-2296`, Kommentar dokumentiert es) hat die Überlappung nur gegen Wort-Schreddern getauscht. Ursache: `.ach2-head` (pages.css:2278) legt Name und `white-space: nowrap`-Badge (pages.css:2299-2310) in eine Flex-Zeile; bei 159 px Body-Breite (report.md) frisst das Badge fast die ganze Zeile.
**Fix (ui-dev):** Badge aus der Titelzeile nehmen — eigene Zeile über/unter dem Namen oder als Ecken-Chip der Karte; `word-break: break-word` am Namen entfernen, normale `hyphens: auto`-Umbrüche reichen dann. Zusätzlich Icon-Spalte schmaler, damit `.ach2-body` > 200 px bekommt.

### 2. [HOCH][ux] Character: Attributwerte & Kampfwerte werden abgeschnitten
**Screenshots:** `endgame/character.png` (schlimmster Fall), `midgame/character.png`
Endgame: dreistellige Attributwerte in den Attribut-Karten sind rechts hart geclippt (aus „52/84/127" wird sichtbar „5…/8…/12…"); report.md bestätigt `.cs-attr-card` scrollWidth 101-108 vs. clientWidth 84. Im Kampf-Panel laufen die rechten Werte aus dem Grid: „Tempo 1.3|", „Verteidigung 42…", „Genauigkeit 6…", „Ausweichen 27…" (`.cs-combat-grid` 401 vs. 362). Ausgerechnet die Kern-Statuswerte des Charakters sind damit im Endgame nicht ablesbar.
**Fix (ui-dev):** `apps/client/src/renderer/styles/character.css` — `.cs-attr-card-val` (Z. 2028) bekommt `min-width: 0` im Parent + kleinere clamp-Untergrenze oder `font-variant-numeric: tabular-nums` mit Auto-Shrink; `.cs-combat-grid` (Z. 2040) Spalten von `1fr 1fr` auf `minmax(0,1fr)` + Wert-Spalte `white-space: nowrap; overflow: visible` prüfen — Werte dürfen nie clippen, eher Label ellipsen.

### 3. [HOCH][ux] Quests: rohes Enum „CRAFT_ITEMS" sichtbar auf jeder Daily-Karte
**Screenshot:** `midgame/quests.png` (alle 4 sichtbaren Dailies)
Jede Craft-Daily zeigt als Objective-Label den internen Typ `CRAFT_ITEMS` statt eines Textes. Ursache gefunden: `apps/client/src/renderer/pages/QuestsPage.tsx:70-95` — `objectiveLabel()` hat Cases für kill/skill/gather, aber **keinen für `craft_items`**; der `default:`-Zweig (Z. 93-94) gibt `obj.type` roh zurück. Der automatische i18n-Check fängt das nicht (kein Punkt-Token). Klassischer „definiert, aber nicht verdrahtet"-Fund.
**Fix (ui-dev):** Case `craft_items` + i18n-Keys `quests.obj.craftItems` (EN/DE) ergänzen; den `default`-Zweig zusätzlich mit einem Dev-Warnlog versehen, damit künftige Objective-Typen auffallen.

### 4. [MITTEL][ux] Skill-Seiten: „Nichts aktiv"-Banner über hellen Szenen unlesbar
**Screenshot:** `midgame/woodcutting.png` (Text vor hellem Wald-Himmel praktisch unsichtbar); Gegenprobe `midgame/smithing.png` (dunkler BG → lesbar), `endgame/thieving.png` (grenzwertig)
`.skill-idle` (`apps/client/src/renderer/styles/skills.css:1123-1129`) hat **keinen Hintergrund** — nur gestrichelte Border + `muted`-Textfarbe, transparent über dem Szenen-Artwork. Auf Holzfällen/Angeln/Anbau-artigen hellen Szenen fällt der Zustand „nichts läuft" komplett weg.
**Fix (ui-dev):** dunkles Backdrop analog Panel-Standard (z. B. `background: rgba(8,10,14,0.82)` + bg_black-Kachel), Textfarbe auf `var(--text)`.

### 5. [MITTEL][feel] Emoji-Fallbacks sichtbar — Audit-Check meldet fälschlich „0"
**Screenshots:** `midgame/slayer.png` + `endgame/slayer.png` (Belohnungs-Shop: großes 😷-Emoji und Spiegel-Emoji als „Item-Icons"; 💀 als Empty-State), `endgame/bestiary.png` (rotes 😡 als Enrage-Marker beim Rasenden Bullen), `midgame/farming.png` + `endgame/farming.png` (🌱-Emoji als „Leeres Beet"-Icon)
Quellen: `SlayerPage.tsx:196,199,238,336` (💀), `BestiaryPage.tsx:93` (😡, in `statIcons.tsx:29` sogar als bekannt dokumentiert). Verstößt gegen die „echte Icons statt Emojis"-Richtlinie. Wichtig: `report.md` meldet „Emoji-fallback icons seen: 0" — der Check erfasst offenbar nur `<img>`-Fallbacks, keine Emoji-Textknoten. **Der Audit-Check hat hier ein Loch.**
**Fix:** ui-dev ersetzt Emojis durch vorhandene UI-Icons (Skull-Icon existiert als Slayer-Sidebar-Art); Chef-Icons für die 2-3 Slayer-Shop-Items ohne Art nachbestellen; Tour-Skript: Emoji-Regex über Textknoten ergänzen.

### 6. [MITTEL][consistency] Zahlenformatierung inkonsistent: Topbar-Gold & XP-Header roh
**Screenshots:** alle endgame-Shots (Topbar rechts „482000" vs. Sidebar „482.000"), `endgame/cooking.png`/`slayer.png`/`thieving.png` („0 / 1112977 XP")
`App.tsx:230` rendert `{state.character.gold}` unformatiert, während die Sidebar `toLocaleString` nutzt. Der Skill-Header formatiert die XP-Schwelle ebenfalls nicht. Im Midgame unauffällig (5400), im Endgame sofort sichtbar.
**Fix (ui-dev):** zentrale `fmtNumber()`-Helper konsequent verwenden (Topbar-Gold, Skill-XP-Header, vermutlich auch Bestiary-HP ab 1000).

### 7. [MITTEL][ux] Seitentitel kollidiert mit Status-Block rechts in der Kopfzeile
**Screenshot:** `midgame/skills-overview.png` — „FERTIGKEITEN-ÜBERSICHT" läuft in „AKTIV: GRABSTAHLADER…" hinein
Der zentrierte Seitentitel reserviert keinen Platz für den rechten Aktiv-/Inventar-/Gold-Block; bei langen Titeln + langem Aktionsnamen überlappt es. Im Endgame nur deshalb unauffällig, weil dort „UNTÄTIG" kurz ist.
**Fix (ui-dev):** Header als Grid `[1fr auto]` mit `min-width: 0` + Ellipsis auf dem Titel, statt absoluter Zentrierung.

### 8. [MITTEL][consistency] Shop: Kaufkarten-Proportionen & gequetschte Preis-Buttons
**Screenshots:** `midgame/shop.png`, `endgame/shop.png` (identisch)
report.md bestätigt Hard-Clip auf `.shop-item-card` (bis 183 vs. 146 px): die 2×2-Preis-Buttons (1×/5×/25×/100×) quetschen sich mit Coin-Icon + 4-stelligen Preisen („100× 2000") an die Kartenränder. Zudem dominiert das Artwork (min-height 220 px, `pages.css:3401-3406`) die Karte so stark, dass nur ~1,5 Kartenreihen sichtbar sind — im Kontrast zu Bank/Inventar, wo gleiche Items als kompakte Tiles erscheinen.
**Fix (ui-dev):** Karten-Info-Bereich (`.shop-item-info`, pages.css:3434) min. auf Kartenbreite fixen (`min-width: 0`, Preis-Buttons 2 Spalten mit `1fr`), Bildbereich auf ~160 px reduzieren → mehr Karten pro Viewport, weniger Clip.

### 9. [MITTEL][ux] Companions (Midgame): Locked-Karten fast unsichtbar → Seite wirkt leer/kaputt
**Screenshot:** `midgame/companions.png` (Gegenprobe: `endgame/companions.png` ist top)
Bei 0/21 Begleitern werden die Locked-Platzhalter so stark abgedunkelt, dass die Seite wie eine leere Fläche mit Geister-Umrissen aussieht; „??? / Skill: Holzfällen / Drop-Chance: 1/60.000" ist kaum lesbar. Genau diese Seite sieht ein neuer Spieler zuerst — aktuell kommuniziert sie „hier ist nichts" statt „hier gibt es 21 Begleiter zu jagen".
**Fix (ui-dev):** Locked-Karten auf ~60 % Opazität statt ~20 %, Silhouetten-Icon statt „?", Skill+Drop-Chance in normaler `muted`-Lesbarkeit.

### 10. [NIEDRIG][consistency] Bestiary: Kartenkopf bricht bei langen Namen (Endgame)
**Screenshot:** `endgame/bestiary.png` — „RASENDER BULLE": Name zweizeilig, Stat-Zeile (HP/DMG/DEF/XP) bricht um, Enrage-😡 schiebt sich dazwischen
report.md: `.bestiary-card-top` bis 295 vs. 239 px. Kurznamige Karten (Huhn, Kuh) sind sauber; das Layout skaliert nicht mit Namenslänge + Zusatz-Badges.
**Fix (ui-dev):** Stat-Zeile als eigenes Grid unter dem Namen (nicht im Flex-Kopf), Enrage als kleines Eck-Badge der Bildfläche.

---

## Weitere Findings (nicht Top-10, sammelbar als Polish-Pass)

- **[NIEDRIG][consistency] Drei verschiedene Tab-/Filter-Stile:** Enchanting nutzt Unterstrich-Tabs (`endgame/enchanting.png`: TISCH/AUSRÜSTUNGSTRESOR/ZERLEGEN), Quests gerahmte Toggle-Buttons (GESCHICHTE/TÄGLICH), Achievements/Mastery kleine Frame-Chips. Ein Stil (Citadel-Frame-Chips) sollte gewinnen.
- **[NIEDRIG][consistency] Options: native HTML-Slider & -Checkbox** (`midgame/options.png`) fallen aus dem Citadel-Look (grauer Standard-Thumb); außerdem doppelt gemoppelt „Ton an" (Label) + Button „TON AN".
- **[NIEDRIG][consistency] Buttons nicht bodenbündig in Kartenreihen:** `endgame/thieving.png` (STARTEN sitzt je nach Beute-Listenlänge unterschiedlich hoch), `endgame/companions.png` (AUSRÜSTEN bei Felsschlund tiefer). Karten in einer Reihe: Button per `margin-top: auto` ans Kartenende.
- **[NIEDRIG][feel] Achievements: jede Karte trägt dasselbe Schwerter-Icon** — bei 540 Erfolgen wirkt das Grid monoton; mindestens Kategorie-Icons (Sammeln/Kampf/Handwerk/Reichtum existieren als Filter-Icons) verwenden.
- **[NIEDRIG][feel] Stats-Seite halb leer** (`midgame/stats.png`): zwei Panels oben, untere Hälfte nackte Textur. Entweder Panels vertikal strecken oder mehr Kennzahlen (Beste Zone, meistgetötetes Monster, Gold/h) einziehen.
- **[NIEDRIG][ux] Farming: „ALLE BEPFLANZEN"-Button über halbe Contentbreite** (`midgame/farming.png`) — massiv überdimensioniert für eine Nebenaktion; zudem verwirrt „4/9 Beete aktiv", wenn alle sichtbaren Beete leer sind (gemeint ist „freigeschaltet"). report.md meldet zusätzlich Clipping in `.farm-catalogue-card` (243-259 vs. 220 px) im Saatgut-Katalog unterhalb des Folds.
- **[NIEDRIG][ux] Sidebar-Label „JUWELIERSKUN…" ellipsiert** (`midgame/slayer.png`) — längster Skill-Name passt nicht; Schriftgröße minimal reduzieren oder `letter-spacing` der Sidebar-Labels verringern.
- **[NIEDRIG][ux] Mastery: alle Skills tragen ein oranges „LEGENDÄR"-Badge bei 1 % Pool** (`midgame/mastery.png`) — semantisch unklar (Rang? Ziel-Tier?); wirkt wie ein Bug, auch wenn es keiner ist. Label prüfen/umbenennen (z. B. „Nächster Rang: …").
- **[NIEDRIG][consistency] Skill-Kartentitel liegen je nach Länge mal unter, mal neben/über dem Artwork** (`midgame/woodcutting.png`: „BIRKE"/„EICHE" rechts neben dem Baum, „NORMALER BAUM" mittig darunter; `midgame/smithing.png`: „KUPFER-DOLCH SCHMIEDEN" überlappt die Klinge). Titelzone fix unter dem Bild reservieren.
- **[INFO] `div.skill-page` Spillover 1501 vs. 1472 auf allen Skill-Seiten** (report.md): konstant 29 px — vermutlich das Szenen-Artwork/negative Margin; kein sichtbarer Schaden, aber die eine Ursache beheben und 28 Report-Zeilen Rauschen verschwinden.

## Endgame vs. Midgame — skaliert das UI?

**Hält stand:** Inventar-Grid (20/20 gemischte Stacks sauber), Kampf-Zonen/Dungeon-Fortschritt, Companions mit 7 Pets, Enchanting-Ausrüstungsliste, Crafting-Seiten mit vielen Kategorien (Smithing endgame: 1081 Buttons, Layout bleibt stabil), Bestiary-Discovery.
**Bricht:** dreistellige Attributwerte (Finding 2), Kampfwert-Spalte (Finding 2), lange Monsternamen im Bestiary (Finding 10), ungeformte große Zahlen (Finding 6). Muster: **überall dort, wo Zahlen/Namen im Endgame länger werden als im Midgame getestet.**

## Gesamtnote visuelle Konsistenz: **B−**

Das Citadel-Design-System ist auf beeindruckend vielen Seiten konsequent durchgezogen (Frames, Cinzel-Headlines, Karten-Templates der Skill-Seiten sind praktisch identisch — das ist die Stärke). Abgewertet wegen zweier harter P1-Textfehler auf Prestige-Seiten (Achievements-Schreddern, Character-Clipping), eines rohen Enum-Leaks (Quests) und sichtbarer Emoji-Reste — alles Dinge, die ein Spieler in den ersten 30 Minuten sieht.

## Top-3-Verbesserungen

1. **„Name + Badge"-Pattern einmal sauber lösen** und auf Achievements-, Bestiary- und Character-Karten anwenden: Badge nie in der Titel-Flexzeile, Werte nie clippen (`min-width: 0` + tabular-nums + Auto-Shrink). Erledigt Findings 1, 2, 10 in einem Pass.
2. **Zahlen-/Text-Formatierungs-Helper konsequent nutzen** (`toLocaleString` für Gold/XP überall, i18n-Fallback-Warnung statt rohem Enum). Erledigt Findings 3 und 6.
3. **Icon-Vollständigkeits-Pass + Audit-Check härten:** Emoji-Reste (Slayer-Shop, Enrage, Farming-Sprout, Skull) durch echte Icons ersetzen und den Tour-Check auf Emoji-Textknoten erweitern, damit „0 Emojis" wieder stimmt. Erledigt Finding 5 nachhaltig.

— Ende Review. Kein Code geändert (reiner Review; Fixes gehören zu ui-dev, i18n-Key zu ui-dev, Slayer-Shop-Art zum Chef/asset-integrator).
