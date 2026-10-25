# Bestandsaufnahme Painterly-Assets, Stand 25.10.2026

<!-- claude:2026-10-25T12:42:00+01:00 -->

Branch `update-1.4.1`, Harness `apps/client/ui-audit/sim-harness.mjs` (Ports 5611/5612), Fixture `endgame`, locale `de`,
Stil Reforged. Nur gelesen; Spielcode, Styles, Content und Assets unverändert. Codex-Auftrag dazu: `CODEX-AUFTRAG.md`.

## Kurzfazit

Die Reforged-Oberfläche trägt vier Rahmen-Materialfamilien nebeneinander: graues Holz, dunkles Eisen, Kupfer/Bronze
(v3) und braune Holzleiste. Der meistgenutzte Holzrahmen (rund 180 CSS-Regeln) ist eine kleine, unscharfe,
ornamentlose Quelle, die mit ungleichen Faktoren gezogen wird; die Ecken sind dadurch rund 15 % verzerrt. Panels,
Karten, Dialoge und Item-Karte tragen alle denselben Rahmen. Knöpfe haben keine gemalten Zustände, der Schließen-Knopf
ist noch die rote Citadel-Glaskugel mit 25×25 px. Größter Stilbruch nach den Rahmen: Neues Spiel, Laden und
Charaktererstellung nutzen die alte gerenderte Ödland-Kulisse direkt nach dem gemalten Hauptmenü. Die Seitenwand-
Textur hat eine messbare Kachelnaht. Die 19 Zonen-Kampfkulissen laufen bereits bei Codex und sind nicht bestellt.

Nicht erfasst: der Raid-Abschnitt im Bild (laufender Kampf ersetzte das Zonenraster), der Laden-Kaufdialog.

## 1. Belege (`design/painterly-assets-2026-10-25/`)

- `shots/1920x1080/`, `shots/1366x768/`: alle Navigationsseiten (`00–31`), Sonder-Screens (`s01–s14`: Zone Weiden,
  laufender Kampf, Item-Karte im Inventar und an der Ausrüstung, Dialog „Beute zerlegen“, Werte, Menü-Schublade,
  Optionen, Post, Aschesturz), Menüs (`m01–m04`: Hauptmenü, Laden, Neues Spiel, Charaktererstellung). Nicht im Git
  (183 MB).
- `crops/slice_*.png`: Slice-Overlays von 10 Rahmenquellen (rote Linien = CSS-Slice, auf Schachbrett).
- `crops/f01–f23_*.png`: Rahmen-Ausschnitte 1:1 und 3× (f01/f02 Holzrahmen Skillkarte, f03/f04 Eisenknopf,
  f05 Kopfleiste, f06 Seitenleiste, f07 Ausrüstungsslots, f08/f09 Item-Karte, f10/f11 Dialog und Schließen-Knopf,
  f12 Bankslots, f13 Beutefenster im Kampf, f14 XP-Balken, f15 Inventarslots, f16/f16b Seitenwand, f17 New-Haven-
  Listenkarte, f18 Segen-Karte, f19 lange Holzkante, f20–f23 1366er-Ausschnitte).
- `crops/tile2x2_*.jpg` Kachelproben, Kontaktbögen `contact_skill-backgrounds.jpg`, `contact_dungeons.jpg`,
  `contact_events_blessings.jpg`, `contact_menu_pagebg.jpg`, Seitenübersichten `pages_a/b/c.jpg`, `pages_1366.jpg`.
- `shots/emoji-scan.json`, Skripte in `tools/`.

## 2. Rahmen

### 2.1 Im Reforged-CSS genutzt

| Asset | Quelle | Slice / Zeichenbreite | Einsatz |
|---|---|---|---|
| `ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp` | 376×376 RGBA | `28 / 2.15 1.87 2.15 1.87 round` | ca. 180 Regeln in rund 40 Dateien: Skill-, Monster-, Zonenkarten, Dialoge, Item-Tooltip, Beutefenster, Bank, Lager |
| `ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp` | 1152×1152 | `85 fill / calc(8px*2.125)` | ca. 90 Regeln in 25 Dateien: `.btn-iron`, Ausrüstungsspalte, Quests, New Haven, Jagd, Warteschlange |
| `ui/gravewood/v3/frames/panel-frame.webp` | 768² | `48 / 22px` bzw. `11px` | Bestiarium, Optionen, Laden, Quests, Slayer, Aschesturz, Bug-Report |
| `ui/gravewood/v3/frames/card-frame.webp` | 512² | `48 / 6px` | Laden, Slayer, Quests, Talentbaum, Chronik |
| `ui/gravewood/v3/frames/button-frame.webp` | 1826×331 | `64 120 64 120 / 6px 14px` bzw. `48 / var(--frame-w)` | Filterreiter im Laden u. a. |
| `ui/gravewood/frames/wood-frame-strip.webp` | 1024×168 | `47 / calc(5.5px*scale) round` | Kopf- und Seitenleiste (Chef-Preset 19.10.) |
| `ui/citadel/standalone-close-button/close_{n,h,p,d}.webp` | 25×25 | Hintergrundbild | Schließen-Knopf aller Dialoge und Item-Karten |
| Fortschrittsbalken | – | CSS-Verläufe | XP-Balken, HP/Ward, Beute-Timer |

Ungenutzt: `v3/frames/tab-frame.webp`, `v3/frames/slot-frame.webp`, `gravewood/frames/frame-card.webp`,
`misc/badge.webp`, `tabs/tab-lever.webp`, `buttons/primary/*`, `buttons/square/*`, Duplikat
`nav-bronze-lipped-iron-9slice.png`.

### 2.2 Befunde

1. **Holzrahmen zu schwach für seine Rolle:** Slice 28 = 7,4 % der Quelle, davon nur rund die Hälfte Holz; das gemalte
   Band ist 5–10 px breit. Schlichte Gehrungen ohne Ornament. Grauer Ton liest sich wie Stein oder Treibholz und
   wirkt verwaschen (kleine Quelle hochskaliert). Belege: `slice_wooden_frame_with_corners_seamless.png`, f01, f02,
   f08, f10, f13, f20.
2. **Verzerrte Ecken:** `border-image-width: 2.15 1.87` zieht die quadratische Ecke rund 15 % höher als breit; der
   v3-Knopfrahmen in gravewood-navigation skaliert rund 25 % anisotrop.
3. **Ein Rahmen für zu viele Zwecke:** Panel, Aktionskarte, Monsterkarte, Dialog, Item-Karte, Beutefenster und
   New-Haven-Karte tragen denselben Holzrahmen; ein schwebender Tooltip ist von einer Karte nicht zu unterscheiden.
4. **Stilbruch zwischen Familien:** graues Holz (Container), dunkles Eisen mit Diagonal-Gehrungslichtern (Knöpfe),
   Kupfer/Bronze v3 (Laden, Quests, Optionen, Slayer), braune Holzleiste (Kopf-/Seitenleiste), alte Slots mit
   Bronzekappen (vom Chef am 19.10. so zurückgewünscht). Kein gemeinsames Niet- oder Beschlagmotiv, keine einheitliche
   Lichtrichtung.
5. **Eisenknopf auf kleinen Knöpfen unruhig** (f03): helle Diagonal-Gehrungen dominieren bei Mengenknöpfen.
6. **Keine gemalten Zustände:** Hover/Active/Disabled nur per CSS-Filter.
7. **Schließen-Knopf** (f11): glänzende rote Glaskugel, 25×25 px, Fremdkörper in jedem Dialog.
8. **Fortschrittsbalken** (f13, f14): flache CSS-Pillen ohne Material, ständig sichtbar.
9. **Lange Kanten:** Wiederholung des Kantensegments fällt bei geringem Kontrast kaum auf (f19); das Problem ist eher,
   dass zu wenig zu sehen ist.

### 2.3 Texturen

- Seitenwand `bg_tileable_wood.webp` (1254², als 800-px-Kachel): Differenz an der Kachelgrenze rund doppelt so hoch
  wie innen (links/rechts 9,1 zu 4,4; oben/unten 5,2 zu 2,5); senkrechte Naht bei x = 800/1600 sichtbar (f16b).
  Maserung verschmiert. Dominiert alle leeren Seiten.
- `texture-basalt`, `texture-nav-wood2`, `texture-umber-cloth`: unkritisch.

## 3. Vielfalts-Lücken

| Bereich | Bestand | Befund | Sichtbarkeit |
|---|---|---|---|
| Neues Spiel / Laden / Charaktererstellung | `ui/ember_reliquary_bg.webp` | Alte gerenderte Kulisse direkt nach dem gemalten Hauptmenü | jede Sitzung |
| Menü- und Seitenleisten-Embleme | `ui/emblem_{compass,waxseal,gear,skull}.svg` | Flache Vektorgrafik; Credits ohne Emblem (`MainMenu.tsx:254`) | jede Sitzung |
| Skill-Kulissen | 13 × 2172×724 | Alter Render-Stil, auf jeder Aktionskarte | jede Sitzung |
| Zonen-Kampfkulissen | 11 + 8 Turmetagen | läuft bei Codex, nicht bestellt | – |
| Dungeon-Karten | 10, zwei Formate (4:5 und 3:1) | gemischt, alter Stil | ab Midgame |
| Dungeon-/Raid-Kampfkulissen | 10 + `gk_room_1–5` | alter Stil; Folgewelle nach der Zonenserie | ab Midgame |
| Segen | 7 | alter Stil, ständig klein in der Seitenleiste | jede Sitzung |
| Ereigniskarten | 11 | alter Stil | gelegentlich |
| Verzauberung | – | flache lila Fläche | selten |
| Aschesturz / Scherbenaltar | – | leere Holzfläche, keine Szene | Endgame |
| Post (leer) | – | kein illustrierter Leerzustand | selten |

### Emojis und Platzhalter (DOM-Scan, `shots/emoji-scan.json`)

| Zeichen | Anzahl | Ort | Weg |
|---|---|---|---|
| ⚔ | 284 | Bestiarium-Abschusszähler, Statistik, Wiki | Code: `icon_combat_status_kill` |
| ★ | 74 | „★ Meisterschaft“, Tempo-Marker auf Skillkarten | Code: `icon_mastery_star` |
| ⛏ | 49 | Werkzeug-Tempo auf Bergbau- und Angel-Karten (`SkillPage.tsx:803`) | Asset fehlt (I1) |
| ⏱ ♻ | 6/6 | Meisterschaft Tempo und Materialerhalt, Anbau | Assets fehlen (I2, I3) |
| 🔨 | 3 | „Herstellbar“ (`SkillPage.tsx:1277/1281`) | Code: `icon_crafting` |
| 🍗 🧪 🪵 ⛏ 🛡 ⚔ | je 1 | Wiki-Kategorien (`EncyclopediaModal.tsx:65ff.`) | Code-Mapping |
| 💀 ⏳ | je 1 | Statistik | Code |
| ✓, Chevrons | – | typografisch | unkritisch |

Ladefehler: `statIcon("icon_attribute_lck", "✨")` (Tippfehler, `icon_attribute_luck` existiert) und
`icon_attribute_mana` (fehlt, `icon_mana` existiert). Die Code-Fixes sind an die 1.4.1-Prüfung übergeben.

## 4. Prioritäten

- **P1, hoch:** Rahmenfamilie (Panel, Karte, Dialog, Tooltip, Knopf mit 5 Zuständen, Reiter, Fortschrittsbalken,
  Schließen-/Hilfe-Knopf), Seitenwand-Textur, Reliquiar-Kulisse, 5 Embleme.
- **P2, mittel:** Skill-Kulissen (Pilot 3, dann 10), 3 Icons für Emoji-Lücken, Vergleichsangebote Holzleiste und Slot.
- **P3, Folgewellen ohne Prompt:** Segen, Ereigniskarten, Dungeon-Karten im Einheitsformat, Dungeon-/Raid-
  Kampfkulissen, Verzauberungs-Kulisse, Scherbenaltar-Szene, leerer Postzustand.

Code-Arbeit (ui-dev) statt Assets: Emoji-Mappings auf vorhandene Icons, die beiden Tooltip-IDs, die ungleichen
`border-image-width`-Faktoren. Die Ziel-CSS-Zeilen der neuen Rahmen stehen im Auftrag.
