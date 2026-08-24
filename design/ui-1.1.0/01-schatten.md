# UI-Audit 1.1.0 — Thema Schatten

Stand 2026-08-24. Auditor: ui-dev. **Kein Code geändert.**

---

## 0. Wie gemessen wurde

Gemessen wurde am laufenden Renderer, nicht am Quelltext. Harness: `apps/client/ui-audit/sim-harness.mjs`
(derselbe, den `bot.mjs` fährt), **ausschließlich Port 5341**, kein Electron, kein `pnpm dev`.
Fixture `midgame`, Locale `de`, Viewports **1920x1080** und **1600x900**.

Pro Bildschirm wurden vier Aufnahmen desselben Frames gemacht:

| Aufnahme | was abgeschaltet war |
|---|---|
| `<szene>.png` | nichts (Normalzustand) |
| `<szene>__nobox.png` | `box-shadow: none` auf allem |
| `<szene>__notext.png` | `text-shadow: none` auf allem |
| `<szene>__nodrop.png` | nur die `drop-shadow()`-Anteile aus `filter` entfernt, alle anderen Filter erhalten |
| `<szene>__again.png` | nichts — Kontrollbild, um Tick-Rauschen vom echten Schatten-Delta zu trennen |

Dazu je Element `getComputedStyle` (box-shadow-Lagen, `filter`, `text-shadow`, Rechteck, Rahmen).
Die Pixel-Differenz Normal↔Ohne-Schatten wurde auf die Element-Rechtecke zurückgerechnet, damit die
Rangfolge „was sieht man" aus dem Bild kommt und nicht aus der Rechnung. **Jeder Befund unten wurde
an einem angesehenen Vergleichsbild bestätigt.** Zwei Kandidaten sind dabei durchgefallen (s. Abschnitt 5).

Abgedeckte Bildschirme: Hauptmenü, Speicherplatz-Auswahl, Charaktererstellung (inkl. Porträt-Galerie-Modal),
Sidebar, Topbar, Charakterblatt, Item-Tooltip, Fertigkeiten-Übersicht, Kampf (Zonen / Monsterkarten /
laufender Kampf), New Haven, Bank, Shop, Aufgaben, Statistik, Modal.

Belege liegen unter `G:\GameDev\apps\client\ui-audit\_shadow-1.1.0\`.
Vergleichsausschnitte (Normal / ohne box-shadow / ohne text-shadow / ohne drop-shadow untereinander)
liegen in `…\_shadow-1.1.0\cmp\`.

---

## 1. Kurzfassung

Der Chef hat recht — es gibt doppelte und dreifache Schatten, und es gibt falsche. Aber die Ursache ist
nicht „zu viel Schatten". Sie ist:

1. **Ein Großteil der `box-shadow`-Regeln sind gar keine Schatten.** Von 571 gemessenen Einzel-Lagen sind
   nur **111 echte Fallschatten** (19 %). 207 sind Glows, 173 sind Rahmenlinien und Kantenstriche
   (Blur 0), 80 sind Innen-Vignetten.
2. **Die sichtbaren Doppelränder entstehen fast immer aus Rahmenbild + Ring-`box-shadow` am selben
   Element**, nicht aus Eltern-Kind-Stapelung. Auf Panel-Ebene gibt es **kein einziges Paar aus
   Eltern- und Kind-Element, deren Außenschatten sich sichtbar überlagern** — das war meine
   Ausgangshypothese, sie ist gemessen falsch. Einziger eng geschachtelter Fall im ganzen Spiel sind
   die Fortschrittsbalken (B12).
3. **Es gibt keine Ordnung.** 317 verschiedene Quellwerte, 271 davon genau einmal benutzt. Zwei
   Schatten-Variablen existieren (`--glow`, `--ds-glow-gold`) — und die häufiger benutzte davon
   (`--glow`, 14 Fundstellen) ist unsichtbar.

---

## 2. Befunde, sortiert nach Sichtbarkeit

### Stufe 1 — das sieht ein Spieler ohne Hinweis

---

#### B1 — Attributkacheln: Holzrahmen, Farbring und zwei Innenschatten in 6 Pixeln

- **Bildschirm:** Charakterblatt (beide Auflösungen, bei 1600x900 deutlicher)
- **Selektor:** `.cs-attr-card` (Stärke / Geschick / Konstitution / Intelligenz / Weisheit / Glück)
- **Regeln:**
  - `apps/client/src/renderer/styles/character.css:1254` — Rahmen `border-image: wooden_frame_with_corners_seamless.webp` (Zeile 1273), dazu `box-shadow` (Zeile 1279): `inset 0 0 0 1px <Attributfarbe 50%>, inset 0 2px 5px rgba(0,0,0,.55), inset 0 -3px 7px rgba(0,0,0,.4)`
  - `character.css:1325` — `.cs-attr-card::after` zusätzlich `filter: drop-shadow(0 1px 2px rgba(0,0,0,.55))` auf dem Hintergrundsymbol
  - `character.css:1424` — `.cs-attr-card-val`: `text-shadow: 0 1px 3px rgba(0,0,0,.85), 0 0 10px <Attributfarbe 35%>`
- **Screenshots:** `…\cmp\attr_tile_292_890.png` (1920), `…\cmp\attr_tile_1600_296_700.png` (1600)
- **Was man sieht:** Um jede Kachel liegen zwei Ränder mit sichtbarer Lücke dazwischen — außen der
  bronzene Holzrahmen, innen eine farbige Linie — und die Zahl trägt zusätzlich einen farbigen Textglanz;
  schaltet man `box-shadow` ab, bleibt genau ein Rahmen und die Kachel wirkt sofort ruhiger.
- **Hinweis:** Das ist der einzige Ort im Spiel mit **sechs** Elementen à **drei** box-shadow-Lagen auf
  einem Bildschirm. Der Farbring ist inhaltlich sinnvoll (Attribut-Farbcode) — er gehört nur nicht
  4 px neben einen zweiten Rahmen.

---

#### B2 — Kampfseite: die Zonenleiste wirft ihren Schatten auf das gemalte Bild

- **Bildschirm:** Kampf, laufender Kampf (1920 und 1600)
- **Selektor:** `header.battle-fortress-context` (die Leiste „Die Weiden · Huhn · Stufe 1")
- **Regel:** `apps/client/src/renderer/styles/combat.css:6102`, `box-shadow: 0 5px 14px rgba(0,0,0,.42)` (Zeile 6114)
- **Screenshot:** `…\cmp\kampf_fortress_bar.png` (Normal oben, ohne box-shadow unten)
- **Was man sieht:** Unter der Leiste liegt ein breiter dunkler Schleier quer über dem gemalten
  Abendhimmel, der wie Schmutz auf dem Artwork aussieht statt wie Schatten; ohne `box-shadow` ist der
  Himmel bis an die Rahmenkante sauber.
- **Messwert:** stärkster Außenschatten-Beitrag der gesamten Messung (9.453 sichtbar veränderte Pixel,
  rauschbereinigt). Ursache: es ist der einzige größere Schatten, der auf ein **helles gemaltes Bild**
  fällt statt auf dunkles UI.
- **Verwandt, gleiche Ursache:** `.monster-card-level-badge` (`combat.css:1271`, `0 2px 10px rgba(0,0,0,.55)`)
  und `.monster-card-xp-badge` werfen dieselbe Art Schatten auf die Monster-Artworks —
  Screenshot `…\run3-game\kampf-monster_1920x1080.png` gegen `…__nobox.png`.

---

#### B3 — Shop: die ausgewählte Karte hat drei konzentrische Ränder

- **Bildschirm:** Shop (beide Auflösungen)
- **Selektoren:** `#root .shopv2-card.selected` und darin `#root .shopv2-card-image-area`
- **Regeln:**
  - `apps/client/src/renderer/styles/shop.css:775` — `box-shadow: inset 0 0 0 2px #cda85d, inset 0 0 18px rgba(205,151,72,.15), 0 4px 16px rgba(0,0,0,.58)`
  - `shop.css:784` — `.shopv2-card-image-area`: `box-shadow: inset 0 0 0 1px rgba(0,0,0,.68), inset 0 0 18px rgba(0,0,0,.38)`
  - Basis-Rahmen der Karte: `shop.css:324` (`border-image`), Seltenheits-Ringe `shop.css:342-349`
- **Screenshot:** `…\cmp\shop_karte_570_625.png`
- **Was man sieht:** Von außen nach innen: bronzener Kartenrahmen, 4 px weiter innen eine goldene
  2-px-Linie, 20 px weiter innen noch eine schwarze 1-px-Linie um das Bildfeld — drei Umrandungen auf
  25 Pixeln Tiefe; ohne `box-shadow` bleibt nur der Kartenrahmen.
- **Nebenbefund:** Der goldene Auswahl-Ring ist die einzige Rückmeldung „diese Karte ist gewählt". Er darf
  also nicht ersatzlos weg — er muss nur **auf** den Rahmen statt daneben.

---

#### B4 — Charaktererstellung: die gewählte Stilkarte hat vier Goldquellen übereinander

- **Bildschirm:** Charaktererstellung, Abschnitt „Startstil"
- **Selektor:** `.creation-style-card.active` samt Kindern
- **Regeln (alle `apps/client/src/renderer/styles/creation.css`):**
  - `:466` Karte: `box-shadow: 0 0 16px rgba(216,192,106,.4), inset 0 0 12px rgba(216,192,106,.12)`
  - `:499` Icon: `filter: drop-shadow(0 4px 10px rgba(0,0,0,.6)) drop-shadow(0 0 14px rgba(216,192,106,.35))`
  - `:514` Beschriftung: `text-shadow: 0 0 10px rgba(216,192,106,.45)`
  - `:470` Häkchen: `text-shadow: 0 0 8px rgba(216,192,106,.7)`
- **Screenshot:** `…\cmp\creation_stilkarten_1080_530.png` (vier Zeilen: normal / ohne box-shadow / ohne text-shadow / ohne drop-shadow)
- **Was man sieht:** Die aktive Karte wirkt olivgrün-matschig statt hervorgehoben, weil Außenglow,
  Innenglow, Icon-Glow und Text-Glow dieselbe Goldfarbe an derselben Stelle addieren; ohne `box-shadow`
  liest sich dieselbe Karte als klar umrandetes Feld.
- **Das ist der einzige gemessene echte Dreifach-Stapel** aus box-shadow **und** mehrlagigem
  `filter: drop-shadow` **und** `text-shadow` am selben Bauteil.

---

#### B5 — Ausrüstungs-Slot: Hover ohne sichtbare Reaktion

- **Bildschirm:** Charakterblatt (gilt genauso für Beutel-, Inventar- und Shop-Verkaufszellen)
- **Selektor:** `.cs-slot:hover` → `box-shadow: var(--glow)`
- **Regeln:** `apps/client/src/renderer/styles/base.css:80` — `--glow: 0 0 12px rgba(150,160,170,0.10)`;
  Nutzer u.a. `character.css:1768` (`.cs-slot:hover`), `character.css:34` (`.portrait-thumb.active`),
  `character.css:521/634/709/1957`, `components.css:116/295`, `pages.css:1634/4820`, `combat.css:4160`
- **Screenshot:** `…\cmp\hover_ausruestungsslot.png` (oben ohne Hover, unten mit Hover)
- **Was man sieht:** Nichts. Der Slot sieht mit Mauszeiger exakt aus wie ohne; nur der Tooltip erscheint.
  Ein 10-%-Grau-Glow über fast schwarzem Grund liegt unter der Wahrnehmungsschwelle.
- **Warum es hierher gehört:** Das ist das **einzige vorhandene Schatten-Token des Projekts** — und es ist
  unsichtbar. In der Porträt-Galerie wird derselbe Wert als „ausgewählt"-Anzeige benutzt
  (`character.css:34`); dass man dort die Auswahl trotzdem erkennt, liegt allein am zusätzlichen
  Gold-`border`, nicht am Schatten (Screenshot `…\run3-menu3\creation-portraits_1920x1080.png`).

---

#### B6 — Sidebar- und Topbar-Beschriftung: zweilagiger Textschatten macht die Schrift weich

- **Bildschirm:** überall (Sidebar + Topbar sind auf jeder Seite)
- **Selektoren:** `.sb-skill-btn` (vererbt an alle Kinder), `#root .sb-skill-btn .sb-skill-level`, Topbar-Titel
- **Regeln:** `sidebar.css:727` — `text-shadow: 0 1px 2px rgba(0,0,0,.9), 0 0 5px rgba(0,0,0,.65)`;
  `sidebar.css:1052`; `gravewood-navigation.css:603` — `0 2px 3px rgba(0,0,0,.95), 0 0 5px rgba(0,0,0,.7)`
- **Screenshots:** `…\cmp\sidebar_btn_6_250.png`, `…\cmp\topbar_btn_245_8.png`
- **Was man sieht:** Die goldenen Versalien haben einen grauen Hof, der die Serifen zuschmiert; ohne
  `text-shadow` stehen dieselben Wörter kantenscharf und wirken heller.
- **Einordnung:** Ein Spieler nennt das nicht „Schatten", er nennt es „unscharfe Schrift". Der
  Kontrast-Gewinn des zweiten Lagen ist auf dem ohnehin fast schwarzen Button null — die erste Lage
  allein reicht.
- **Maßstab, ehrlich gesagt:** Im Live-DOM tragen ~90 Elemente je Bildschirm einen zweilagigen
  `text-shadow`. Das sind **nicht** 90 Entscheidungen, sondern 2–3 Regeln, die über Vererbung auf jedes
  Kind-`span` durchschlagen. Der Fix ist entsprechend klein.

---

### Stufe 2 — fällt auf, wenn man hinsieht

---

#### B7 — Kopfleiste: Rahmenbild, Innen-Vignette und Fallschatten am selben Element, plus eine zweite Vignette darin

- **Bildschirm:** alle Spielseiten (die Leiste mit Name / „Aktiv: …" / XP-Balken)
- **Selektoren:** `#root .content-header--quiet-citadel` und darin `.gamestats-row--activity`
- **Regeln:** `apps/client/src/renderer/styles/topbar.css:1174` (Rahmen `border-image` Zeile 1189,
  `box-shadow` Zeile 1195: `inset 0 0 calc(26px*var(--tb-scale)) rgba(0,0,0,.68), 0 calc(4px*…) calc(14px*…) rgba(0,0,0,.46)`)
  und `topbar.css:1273` (`inset 0 0 calc(12px*var(--tb-scale)) rgba(0,0,0,.55)`)
- **Screenshot:** `…\cmp\contentheader_240_66.png`
- **Was man sieht:** Der Innenraum der Leiste ist an allen vier Kanten abgedunkelt, und die „Aktiv"-Box
  darin wird ein zweites Mal abgedunkelt, weil sie 17 px vom oberen Rand entfernt sitzt und damit voll im
  Auslauf der 26-px-Vignette der Elternleiste liegt.
- **Messwert:** rund 19.000 sichtbar veränderte Pixel je Seite — der flächenmäßig größte
  Schatten-Beitrag im Spiel, aber kontrastarm, daher Stufe 2 und nicht Stufe 1.

---

#### B8 — Item-Tooltip: 65-px-Fallschatten und 54-px-Innenvignette gleichzeitig

- **Bildschirm:** jeder Tooltip (Charakterblatt, Bank, Shop)
- **Selektor:** `.item-tooltip.itip-panel`
- **Regeln:** `components.css:1386` (box-shadow Zeile 1396): `0 28px 65px rgba(0,0,0,.9), inset 0 0 54px rgba(0,0,0,.72)`
  — **die Klasse ist in derselben Datei dreimal definiert**: `components.css:729` (`0 28px 60px rgba(0,0,0,.85)`, wird überschrieben),
  `:1386` (gewinnt), `:1962` (nur Schrift).
- **Screenshot:** `…\cmp\tooltip_panel_290_300.png`
- **Was man sieht:** Die Holztextur des Tooltips ist an den Rändern so weit abgesoffen, dass die
  Eckbeschläge des Rahmens im Dunkeln verschwinden; ohne `box-shadow` sieht man Maserung und Ecken.

---

#### B9 — Gegner-Plakette im Kampf: drei Lagen, davon eine unsichtbar

- **Bildschirm:** laufender Kampf
- **Selektor:** `.fighter.enemy .fighter-nameplate`
- **Regeln:** `combat.css:3718` `.fighter-nameplate` — `border-image` (Citadel-Holzrahmen) + `inset 0 0 18px rgba(0,0,0,.5), 0 6px 18px rgba(0,0,0,.55)`;
  `combat.css:3740` Gegner-Variante hängt eine dritte Lage an: `0 0 14px rgba(140,60,30,.35)`.
  **Dazu:** `combat.css:6171` definiert `.fighter-nameplate` ein zweites Mal und tauscht den Rahmen gegen
  das Gravewood-9-Slice aus, ohne den Schatten anzufassen — der Schatten stammt also noch aus der
  Citadel-Ära und wurde beim Rahmenwechsel nie nachgezogen.
- **Screenshot:** `…\cmp\kampf_gegner_plakette.png` (Aufnahmen aus `…\_shadow-1.1.0\kampf\ka_normal_2.png` / `ka_nobox_2.png`)
- **Was man sieht:** Ein weicher dunkler Saum unter der Plakette, der auf den Boden des Kampfbildes fällt;
  vom orangen Gefahr-Glow ist auf dem sandfarbenen Untergrund nichts zu erkennen.
- **Einordnung:** klassischer „falscher Schatten" — die dritte Lage kostet eine Compositing-Ebene und
  liefert nichts. Sie ist als *Gegner-Kennzeichnung* gemeint und erfüllt diese Aufgabe nicht.

---

#### B10 — Aufgaben/Chronik: drei ineinander liegende Panels mit demselben Schatten

- **Bildschirm:** Aufgaben („Die Aschechronik")
- **Selektoren:** `.quests-command-header` / `.quests-content--chronicle` → `.chronicle-stage` → `.npc-bubble`
- **Regeln:**
  - `quests.css:949` bzw. `:962` — `inset 0 0 34px rgba(0,0,0,.58), 0 7px 18px rgba(0,0,0,.34)`
  - `chronicle.css:407` — `.quests-contract-wall .chronicle-stage`: `inset 3px 0 0 rgba(183,135,69,.58), 0 7px 18px rgba(0,0,0,.34)`
    (überschreibt `chronicle.css:42`, das dasselbe mit `inset 4px` und `0 8px 26px` machen wollte — tote Zeile)
  - `npc-greeting.css` — `.npc-bubble`: `0 2px 10px rgba(0,0,0,.45)`
- **Screenshot:** `…\cmp\q_nested_264_430.png`
- **Was man sieht:** Drei Kastenkanten kurz hintereinander, jede mit eigener dunkler Bordüre — das Panel
  wirkt „verrußt" statt gestaffelt; ohne `box-shadow` liest man die Schachtelung an den Rahmen besser als
  vorher an den Schatten.

---

#### B11 — Innen-Vignetten, die größer sind als das Element

- **Bildschirme:** Kampf-Dock, Shop, Charakterblatt, Kampfprotokoll
- **Beispiele (Blur ≥ 50 % der kurzen Elementkante):**

| Element | Größe | inset-Blur | Anteil | Regel |
|---|---|---|---|---|
| `.cl-dock-tab.active` | 92×55 | 18 px | 65 % | `combat.css:5932` / `:5937` (zweimal definiert) |
| `.shopv2-chip.active` | 214×48 | 14 px | 58 % | `shop.css:226`, überschrieben von `shop.css:697` |
| `.cs-tab-btn.active` | 231×30 | 8 px | 53 % | `character.css:2785` |
| `.battle-log-tab.active` | 112×30 | 8 px | 53 % | `combat.css:3114` |
| `.gamestats-row--activity` | 607×55 | 14 px | 51 % | `topbar.css:1273` |

- **Screenshot:** `…\run3-game\kampf-zonen_1920x1080.png` gegen `…__nobox.png`
- **Was man sieht:** Statt eines Randeffekts wird der ganze Knopf gleichmäßig dunkler, die Beschriftung
  verliert Kontrast — der Schatten ist zum Hintergrund geworden.

---

#### B12 — Fortschrittsbalken: vier Schattenlagen auf 19 px Höhe

- **Bildschirm:** alle Seiten (Aktions- und Level-Balken der Kopfleiste)
- **Selektoren:** `.tb-bar` und `.tb-bar-fill` (Abstand 1–3 px)
- **Werte (gemessen):** Spur `inset 0 1px 3px rgba(0,0,0,.82), 0 1px 0 rgba(218,166,89,.12)`,
  Füllung `inset 0 1px 0 rgba(255,231,172,.2), 0 0 4px rgba(183,124,44,.24)`
- **Screenshot:** `…\cmp\contentheader_240_66.png` (unterer Bildteil)
- **Was man sieht:** Der 4-px-Glow der Füllung läuft über die 3-px-Innenkante der Spur; die Balkenkante
  ist dadurch weder scharf noch weich, sondern schlicht undefiniert.

---

### Stufe 3 — sieht nur ein Auditor (Code-Ebene, aber die Ursache der Stufen 1 und 2)

---

#### B13 — `gravewood-navigation.css` überschreibt seine eigenen Nav-Schatten siebenmal, mit `!important`

Für `#root .sb-skill-btn.active` existieren **vier** konkurrierende `box-shadow`-Deklarationen,
alle mit `!important`, alle in **einer** Datei:

| Datei:Zeile | Wert | Wirkung |
|---|---|---|
| `gravewood-navigation.css:204` (Z. 206) | `inset 0 0 0 1px rgba(204,151,76,.18), 0 2px 4px rgba(0,0,0,.3) !important` | tot |
| `gravewood-navigation.css:286` (Z. 299) | `0 2px 4px rgba(0,0,0,.34) !important` | tot |
| `gravewood-navigation.css:343` (Z. 357) | `0 2px 4px rgba(0,0,0,.34) !important` | tot |
| `gravewood-navigation.css:416` (Z. 431) | `0 2px 4px rgba(0,0,0,.34) !important` | **gewinnt** |
| `sidebar.css:792` (Z. 801) | `box-shadow: none` (+ `filter: none`) | **wirkungslos** |

Gemessener Live-Wert: `rgba(0,0,0,0.34) 0px 2px 4px 0px`. Das heißt: der Versuch in `sidebar.css`,
den Sidebar-Schatten ganz zu entfernen, ist nie angekommen, und der Innen-Ring aus Zeile 204 wird
nirgends gemalt.

Dasselbe für `#root .topbar-item.active`: `gravewood-navigation.css:160`, `:323`, `:434` —
gewinnt Zeile 449 (`0 2px 4px rgba(0,0,0,.32) !important`), gemessen bestätigt.

Insgesamt: 18 `box-shadow`-Deklarationen mit `!important`, 33 Deklarationen `box-shadow: none`,
29 Einzelselektoren mit mindestens drei konkurrierenden `box-shadow`-Werten.

---

#### B14 — `gravewood-theme.css` wird von niemandem geladen

`apps/client/src/renderer/styles/gravewood-theme.css` steht in keinem `@import` von `styles/index.css`
und wird von keiner `.ts`/`.tsx` importiert (geprüft über den kompletten `apps/client/src`-Baum).
Die Datei enthält 18 Schatten-Deklarationen, unter anderem eine eigene Variante von
`.topbar-item.active` und der `.combat-btn`-Zustände. Sie zählt in jeder Statistik mit und wirkt nie.
Dasselbe gilt für `bestiary-flip.css` (dort ohne Schatten-Anteil).

Konsequenz für die Ausgangszahlen: Von den 55 Dateien in `styles/` sind **53 wirksam**.

---

#### B15 — Fünf Bauteile in vier Dateien definieren denselben „aktiver Reiter"-Glow, mit drei verschiedenen Zahlen

| Selektor | Datei:Zeile | Wert |
|---|---|---|
| `.shopv2-maintab.active` | `shop.css:149` | `0 0 12px rgba(216,184,112,.34), inset 0 0 10px …,.12)` |
| `.shopv2-chip.active` | `shop.css:226` | `0 0 10px …,.30), inset 0 0 8px …,.10)` |
| `.cs-tab-btn.active` | `character.css:2785` | `0 0 10px …,.30), inset 0 0 8px …,.10)` |
| `.nh-view-tab.active` | `newhaven.css:665` | `0 0 10px …,.3), inset 0 0 8px …,.1)` |
| `.battle-log-tab.active` | `combat.css:3114` | `0 0 10px …,.30), inset 0 0 8px …,.10)` |

Und `#root .shopv2-chip.active` (`shop.css:697`) überschreibt den Shop-Chip anschließend mit einem
komplett anderen Look (`inset 3px 0 0 #c8a15a, inset 0 0 14px …`) — dasselbe Bauteil hat also zwei
Auswahl-Sprachen im Repo, von denen eine gewinnt.

Dazu kommen **19 verschiedene Puls-/Glow-Keyframes**, die alle dieselbe Idee „Gold pulsiert"
umsetzen, mit Blur-Werten zwischen 3 px und 44 px:
`chronicle.css:176` (12→22 px), `combat.css:668` (12→22 px), `enchanting.css:508` (10→18 px),
`skills.css:206` (0→26 px), `offline-stage.css:342` (14→22 px), `sidebar.css:939` (3→8 px),
`achievements.css:341` (none→20 px), dazu `pet-celebration.css` und `dungeon-clear-ceremony.css`.

---

## 3. Die Zahlen, nachgemessen und korrigiert

Die Ausgangszahlen des Briefings zählen Textvorkommen, nicht Deklarationen. Korrigiert:

| Größe | Briefing | gemessen | Anmerkung |
|---|---|---|---|
| CSS-Dateien in `styles/` | 55 | 55, davon **53 geladen** | s. B14 |
| `box-shadow`-Vorkommen | 524 | 524 | stimmt, aber **160 davon stehen in Kommentaren** |
| echte `box-shadow`-Deklarationen | — | **400** (in geladenen Dateien) | |
| verschiedene Quellwerte | 327 | **317** | 271 davon genau einmal benutzt |
| `text-shadow`-Deklarationen | 122 | **120**, 77 verschiedene Werte | 33 davon mehrlagig |
| `filter: drop-shadow` | 71 | **71**, 59 verschiedene | 5 davon mit mehreren Lagen |
| Schatten-Tokens | 0 | **2** (`--glow`, `--ds-glow-gold`) | `--glow` ist unsichtbar, s. B5 |

**Wichtiger als die Gesamtzahl: die 400 Deklarationen zerfallen in 571 Einzel-Lagen, und die sind
größtenteils gar keine Schatten.**

| Art der Lage | Anzahl | Anteil | was es wirklich ist |
|---|---|---|---|
| Glow (`0 0 <blur>`) | 207 | 36,3 % | Zustandsanzeige (aktiv/ausgewählt/Gefahr/Puls) |
| Ring (Blur 0, mittig) | 119 | 20,8 % | **Rahmen, mit `box-shadow` gezeichnet** |
| echter Fallschatten | 111 | 19,4 % | Höhe/Ebene |
| Innen-Vignette (`inset` mit Blur) | 80 | 14,0 % | Materialtiefe |
| Kantenstrich (Blur 0, versetzt) | 54 | 9,5 % | Akzentlinie an einer Seite |

Zusammengefasst: **173 der 571 Lagen (30 %) sind Rahmen**, weitere 207 (36 %) sind Lichteffekte.
Nur jede fünfte Lage ist überhaupt ein Schatten im Wortsinn.

Weitere gemessene Eigenschaften:

- **Richtung ist konsistent.** Von 111 Fallschatten gehen 109 nach unten, 2 bewusst nach oben
  (`combat.css:1251` `.monster-card-footer` und `sidebar.css:1435` Footer-Lasche — beide sitzen am
  unteren Rand, das ist korrekt). *Es gibt kein Richtungsproblem.*
- **103 der 400 Deklarationen mischen `inset` und Außenschatten am selben Element.** Das ist die
  eigentliche Quelle des „doppelten" Eindrucks.
- **23 verschiedene Deckkräfte** allein für dunkle Fallschatten (0.30 bis 0.90), Spitzenreiter 0.55 (40×).
- Nur `--tb-scale` skaliert einige Schatten mit der UI-Größe; alle übrigen sind feste Pixel. Bei
  1600x900 sind die Bauteile schmaler, die Schatten aber gleich groß — deshalb wirkt derselbe Effekt
  dort **stärker** (klar zu sehen an den Attributkacheln, B1: 108×64 px bei 1920, 80×64 px bei 1600,
  identischer Ring).

---

## 4. Vorschlag: ein Schatten-Token-System

Kernpunkt: **eine Skala reicht nicht.** Die 571 Lagen erfüllen vier verschiedene Aufgaben, und man kann
sie nicht in eine gemeinsame Reihe pressen, ohne die Zustandsanzeigen kaputtzumachen. Vorschlag sind
sechs Tiefenstufen plus drei kleine Nebenskalen, alle in `design-system.css`:

### 4.1 Tiefe (`--sh-0` … `--sh-6`) — echte Fallschatten, Licht immer von oben

| Token | Wert | wofür | ersetzt heute |
|---|---|---|---|
| `--sh-0` | `none` | flach im Panel | 33× `none` |
| `--sh-1` | `0 1px 2px rgba(0,0,0,.45)` | Kante, Pip, Badge auf UI | 5 Lagen |
| `--sh-2` | `0 2px 4px rgba(0,0,0,.34)` | Knöpfe, Nav, Chips | 21 Lagen |
| `--sh-3` | `0 4px 10px rgba(0,0,0,.45)` | Karten, Badges auf Artwork | 11 Lagen |
| `--sh-4` | `0 8px 20px rgba(0,0,0,.5)` | Panels, Plaketten | 21 Lagen |
| `--sh-5` | `0 14px 32px rgba(0,0,0,.55)` | schwebende Karten, Popover | 37 Lagen |
| `--sh-6` | `0 24px 60px rgba(0,0,0,.7)` | Modale, Tooltips, Menü-Panel | 11 Lagen |

Summe: **106 der 111 Fallschatten**.

### 4.2 Zustands-Glow (`--gl-1` … `--gl-3`) — ersetzt die 207 Glow-Lagen

`--gl-1: 0 0 8px`, `--gl-2: 0 0 16px`, `--gl-3: 0 0 24px`, jeweils mit `currentColor`-artiger
Farbvariable (`--gl-color`), damit Gold / Gefahrrot / Slayer-Gold / Elite-Orange denselben Radius teilen
und sich nur in der Farbe unterscheiden. Deckt gemessen **201 der 207 Glow-Lagen** ab
(`--gl-1` 133x, `--gl-2` 49x, `--gl-3` 19x).

### 4.3 Ring (`--rg-1`, `--rg-2`) und Kante (`--edge-*`) — ersetzen die 173 Rahmen-Lagen

`--rg-1: inset 0 0 0 1px`, `--rg-2: inset 0 0 0 2px`. Deckt **85 der 119 mittigen Ring-Lagen** ab.
Die 54 Kantenstriche (`inset 3px 0 0`, `inset 0 -2px 0`, `inset 5px 0 0`) sind ein eigener Fall und
bekommen ein `--edge-*`-Paar; sie sind durchweg Akzentlinien und lassen sich vollständig abbilden.

**Regel dazu, wichtiger als die Tokens selbst:** Ein Element hat **entweder** ein `border-image`
**oder** einen Ring-`box-shadow` — nie beides. Diese eine Regel räumt B1, B3 und den halben
Stufe-2-Block ab.

### 4.4 Innen-Vignette (`--vg-1`, `--vg-2`, `--vg-3`)

`inset 0 0 10px / 20px / 34px rgba(0,0,0,.5)`, und **nur zulässig, wenn der Blur unter 25 % der kurzen
Elementkante liegt** (räumt B11 ab). Deckt **73 der 80 Vignetten-Lagen** ab.

### 4.5 Abdeckungsgrad, gemessen

Ich habe die Zuordnung gegen alle 571 Lagen durchgerechnet (Toleranz: Versatz ±2 px oder ±50 %,
Blur ±50 %):

- **519 von 571 Lagen (91 %) fallen in die 15 Tokens.**
- 52 Ausreißer: 14 sind bereits `var(--glow)`/`var(--ds-glow-gold)`, also schon Variablen;
  4 sind Keyframe-Nullzustände (`0 0 0 0` als Puls-Startwert); bleiben **34 echte Sonderfälle**
  (z.B. `creation.css:46` `inset 0 0 70px`, `champion-defeat.css:80` `0 0 40px 6px`,
  `combat.css:1251` `0 -8px 14px`).

Auf die **317 verschiedenen Quellwerte** übertragen: rund **280 lassen sich ohne sichtbare Änderung
ersetzen**, etwa 25 brauchen eine bewusste Entscheidung (die zeremoniellen Effekte), und etwa 12 sollten
ersatzlos gestrichen werden (die nachweislich unsichtbaren, s. B5 und B9).

### 4.6 Textschatten

Drei Tokens reichen für alle 120 Deklarationen:
`--ts-1: 0 1px 2px rgba(0,0,0,.85)` (Standard, ersetzt die 30 häufigsten),
`--ts-2: 0 2px 4px rgba(0,0,0,.9)` (große Überschriften auf Artwork),
`--ts-glow: 0 0 10px <Farbe>` (nur für die wenigen Zeremonie-Titel).
Die zweilagigen Varianten aus B6 entfallen ersatzlos.

---

## 5. Zwei Kandidaten, die ich verworfen habe

Der Vollständigkeit halber, weil sie in einer reinen Code-Analyse als Befund durchgegangen wären:

- **Eltern-Kind-Doppelschatten auf Panel-Ebene:** gesucht, gemessen, **nicht vorhanden**. In allen 13
  Spielszenen gibt es keinen Fall, in dem ein Panel mit Außenschatten so eng in einem zweiten Panel mit
  Außenschatten sitzt, dass sich die Ringe überlagern. Engster Panel-Fall: `.shopv2-card-image-area` in
  `.shopv2-card.selected` mit 21 px Abstand, und dort ist der Elternschatten ein Ring ohne Ausdehnung
  nach innen. Einziges wirklich enges Paar im ganzen Spiel: `.tb-bar-fill` in `.tb-bar` mit 1–3 px
  (als B12 aufgenommen). Der Doppelrand-Eindruck, den der Chef meint, kommt aus B1/B3 — Rahmenbild
  plus Ring am **selben** Element.
- **`.sb-footer-*`-Schatten:** Eine reine Code-Analyse meldet hier ein `box-shadow: none`
  (`gravewood-navigation.css:60-62`), das gegen eine spätere Deklaration in `gravewood-theme.css:1586`
  verliert. Das ist **falsch** — `gravewood-theme.css` wird nie geladen (B14), das `none` gewinnt.
  Genau solche Scheinbefunde sind der Grund, warum diese Runde am laufenden Bild gemessen wurde.

Eine methodische Falle sei ebenfalls notiert: Auf der Kampfseite läuft ein periodischer
Vollbild-`blur`-Effekt (Treffer-Moment). Die erste Messreihe hat dort ein unscharfes Vergleichsbild
erwischt und hätte einen dramatischen „Schatten"-Unterschied gemeldet, den es nicht gibt. Die Befunde B2
und B9 stammen deshalb aus einer eigenen Aufnahmereihe mit fünf Bildpaaren
(`…\_shadow-1.1.0\kampf\`), von der das schärfste Paar verwendet wurde.

---

## 6. Chef-Frage: „Schatten komplett raus?"

**Nein — und zwar nicht aus Geschmacksgründen, sondern weil vier von fünf `box-shadow`-Lagen gar keine
Schatten sind, sondern Rahmen, Auswahlringe und Zustandsleuchten.**

Ich habe das nicht geschätzt, sondern gebaut: In jeder Szene liegt ein Screenshot mit
`box-shadow: none` auf allem (`…__nobox.png`). Was dabei verloren geht:

**Was ersatzlos wegfallen kann (und sollte) — etwa 19 % der Lagen:**
Die 111 echten Fallschatten sind größtenteils entbehrlich. Das UI trägt bereits gezeichnete
9-Slice-Rahmen mit Lippe und Eckbeschlägen; die tun optisch schon, was ein Fallschatten tun soll. Bei
B2 (Zonenleiste über dem Kampfbild) und B9 (Gegner-Plakette) ist das Bild **ohne** Schatten
nachweislich besser.

**Was NICHT wegfallen darf — mit konkreten Folgen:**

| was verschwindet | Folge im `__nobox`-Bild |
|---|---|
| `.shopv2-card.selected` Goldring | Man sieht nicht mehr, welche Ware gewählt ist (`…\cmp\shop_karte_570_625.png`, zweite Zeile) |
| `.creation-style-card.active` | Nahkampf/Fernkampf/Magie: die getroffene Wahl ist nicht mehr markiert |
| `.cs-attr-card` Farbring | Der Attribut-Farbcode (Stärke rot, Intelligenz blau …) fällt weg |
| `.sb-skill-btn.active` / `.topbar-item.active` | Die aktive Seite in Sidebar und Topbar ist nicht mehr erkennbar |
| `.monster-card.diff-danger` / `.slayer-target` / `.elite-monster-card` | Gefahrstufe, Slayer-Ziel und Elite-Karten verlieren ihre Kennzeichnung |
| `.tb-bar` / alle Fortschrittsbalken | Spur und Füllung verschmelzen zu einer flachen Fläche |
| `.topbar-claim-dot`, `.sb-running-pip` | „Es gibt etwas abzuholen" / „läuft gerade" verschwindet |

Das ist kein Schönheitsverlust, das ist Funktionsverlust. Ein pauschales `box-shadow: none` würde
mindestens sieben Zustandsanzeigen abschalten und mehrere Tage Nacharbeit erzeugen, um dieselben
Zustände über Rahmen und Farben neu zu bauen.

**Empfehlung für 1.1.0, in dieser Reihenfolge:**

1. **Tokens anlegen** (Abschnitt 4) und die Regel „Rahmenbild **oder** Ring, nie beides" durchsetzen.
   Erledigt B1, B3, B7 und den größten Teil des sichtbaren Doppelrand-Eindrucks.
2. **Die 111 Fallschatten auf `--sh-2` bis `--sh-6` reduzieren** und dort streichen, wo sie auf gemaltes
   Artwork fallen (B2, B9, Monsterkarten-Badges). Das ist der spürbarste Einzelgewinn und betrifft
   ungefähr ein Dutzend Regeln.
3. **`--glow` neu definieren** (B5) — der heutige Wert ist unsichtbar und wird an 14 Stellen als
   Hover-/Auswahl-Rückmeldung benutzt.
4. **Textschatten auf eine Lage** (B6). Kleiner Eingriff, sofort sichtbar besser lesbare Sidebar.
5. **Aufräumen** (B13/B14/B15): tote `!important`-Stapel in `gravewood-navigation.css`,
   `gravewood-theme.css` entweder einbinden oder löschen, die fünf Kopien des „aktiver Reiter"-Glows
   zusammenführen. Ändert am Bild nichts, verhindert aber, dass die nächste Korrektur wieder
   wirkungslos verpufft.

---

## 7. Für den CEO zu routen

Nichts davon liegt außerhalb des Renderers — alle 15 Befunde sind reine CSS-Änderungen in
`apps/client/src/renderer/styles/**`. **Kein Bedarf an Engine-Selektoren oder neuen Content-Feldern.**

Zwei Punkte gehören trotzdem entschieden, bevor jemand anfängt:

1. **`gravewood-theme.css`:** einbinden oder löschen? Die Datei ist zu 100 % tot. Vor jedem
   Schatten-Refactoring muss klar sein, ob sie noch gemeint ist, sonst refactored jemand ins Leere.
2. **Design-Entscheid „Rahmenbild oder Ring":** Die Ring-`box-shadow`-Lagen sind Farbcode
   (Attribute, Item-Seltenheit im Shop). Wenn diese Information erhalten bleiben soll, brauchen die
   betroffenen Bauteile entweder ein eingefärbtes Rahmen-Asset oder den Verzicht auf das Rahmenbild.
   Das ist ein Kunst-/Design-Entscheid, kein CSS-Entscheid.

Nebenbeobachtung außerhalb des Themas, für die Liste: Auf der New-Haven-Seite sind die Knöpfe
„DEBUG: GRATIS" und „DEBUG: FERTIG" sichtbar (`…\run3-game\newhaven_1920x1080.png`). Falls das nicht
nur an der Test-Fixture hängt, gehört das vor 1.1.0 geprüft.

---

## 8. Belegverzeichnis

Alle Pfade absolut, alle Bilder in dieser Runde erzeugt und angesehen.

**Vergleichsausschnitte** (`G:\GameDev\apps\client\ui-audit\_shadow-1.1.0\cmp\`):

| Datei | Befund |
|---|---|
| `attr_tile_292_890.png` / `attr_tile_1600_296_700.png` | B1 |
| `kampf_fortress_bar.png` | B2 |
| `shop_karte_570_625.png` | B3 |
| `creation_stilkarten_1080_530.png` | B4 |
| `hover_ausruestungsslot.png` | B5 |
| `sidebar_btn_6_250.png`, `topbar_btn_245_8.png` | B6 |
| `contentheader_240_66.png` | B7, B12 |
| `tooltip_panel_290_300.png` | B8 |
| `kampf_gegner_plakette.png`, `kampf_spieler_plakette.png` | B9 |
| `q_nested_264_430.png` | B10 |
| `inv_cell_1225_445.png`, `equip_slot_770_355.png` | geprüft, ohne Befund |

**Vollbilder** (Normal + `__nobox` + `__notext` + `__nodrop` + `__again`, je 1920x1080 und 1600x900):

- `G:\GameDev\apps\client\ui-audit\_shadow-1.1.0\run3-game\` — 13 Spielszenen
- `G:\GameDev\apps\client\ui-audit\_shadow-1.1.0\run3-menu3\` — Hauptmenü, Speicherplätze, Charaktererstellung, Porträt-Galerie
- `G:\GameDev\apps\client\ui-audit\_shadow-1.1.0\kampf\` — 5 Bildpaare laufender Kampf (blurfrei)
- `G:\GameDev\apps\client\ui-audit\_shadow-1.1.0\diff\` — verstärkte Differenzbilder (Schatten-Fußabdruck)

**Rohmessung:** `…\run3-game\report.json` und `…\run3-menu3\report.json` (je Element: Selektor,
DOM-Pfad, Rechteck, alle Schattenlagen, Rahmen, Radius).
