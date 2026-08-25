# Asset-Brief — Achievement-Kategorie-Embleme (10 Pflicht, 3 optional)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 25.08.2026.
> **Vorlage:** `CODEX/templates/ASSET-BRIEF.md`. Teil A ist ausgefüllt. Teil B, C und D füllt Mira.
> **Bindender Bildvertrag:** `design/asset-anforderungen.md` (Alpha, Auflösung, Benennung, Abnahme).
> **Prompts:** `CODEX/work/2026-08-25-achievement-icons/PROMPTS.md` (je Emblem ein fertiger Prompt in Englisch).
> **Stil-Anker:** die heute abgenommene Runen-Lieferung `CODEX/assets/runen-tier-iv-2026-08-25/` (Struktur, Detailgrad, Dark-Fantasy-Ernst, echtes Alpha).

---

# Teil A – Auftraggeber-Briefing

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Achievement-Kategorie-Embleme |
| Auftraggeber | Chef (Entscheidung: „Nicht jedes Achievement, eher als Kategorie"), Briefing durch Claude |
| Projekt | Grim Reach |
| Zielversion oder Meilenstein | 1.0-Kurs, Erfolge-Seite (Warden-Ledger-Layout) |
| Priorität | P1 für die zehn Kategorie-Embleme. P2 für die drei UI-Symbole (Kopf-Trophäe, Meilenstein, Freigeschaltet). |
| Termin | kein fester Termin. Andere Agents arbeiten parallel im Code, die Seite bleibt bis zur Lieferung mit den Platzhaltern lauffähig. |
| Status | Ersatz bestehender Assets, zur Produktion freigegeben |

## A2. Produktziel

**Was soll mit diesen Assets erreicht werden?**
Die Erfolge-Seite zeigt je Erfolg ein rundes Medaillon: ein Ring in der Seltenheitsfarbe, darin das Symbol der Kategorie. Diese zehn Symbole sind heute generierte, flache Zweiton-Strichzeichnungen, die neben den gemalten Runen, Items und Monstern wie Fremdkörper wirken. Der Chef will sie nicht je Erfolg, sondern je Kategorie ersetzt haben: zehn richtige, gemalte Embleme, die dieselbe Qualitätsstufe haben wie die Runen von heute. Wer ein Emblem sieht, soll die Kategorie in einer Sekunde erkennen, auch bei 28 px im Ring.

**Wo sieht der Spieler sie?**
Alles auf der Erfolge-Seite (`apps/client/src/renderer/pages/AchievementsPage.tsx`), aktives Layout `achv-page--warden` (`styles/warden-ledger-achievements.css` über `styles/achievements.css`). Gemessen am 25.08.2026:

| Ort | Container | Bildgröße | Datei |
|---|---|---|---|
| Karten-Medaillon `.achv-emblem` (537 Karten) | runder Ring 46 × 46 px, 2 px Rand in Rarity-Farbe, innen dunkler Radialverlauf | **28 × 28 px** | Kategorie-Emblem |
| Detailblatt rechts `.achv-ledger-detail-emblem` | runder Ring 72 bis 92 px, 3 px Rand in Rarity-Farbe | 39 bis 50 px (54 % des Rings) | Kategorie-Emblem |
| Kategorie-Leiste links `.achv-ledger-cat-icon` | 24 × 24 px, kein Ring | 24 × 24 px | Kategorie-Emblem |
| Kopf-Emblem `.achv-hero-emblem` | runder Ring 58 px | 38 × 38 px | `icon_achievments` |
| AP-Zeile in jeder Karte `.ui-icon` | 1 em | ca. 12 px | `icon_achievments` |
| Meilenstein-Leiste `.ui-icon` | 1 em | ca. 12 bis 20 px | `icon_ach_milestone` |
| Eck-Plakette der Karte `.achv-card-corner` | 22 × 22 px | 22 × 22 px | `icon_achievement_unlocked` (freigeschaltet) / `icon_locked` (gesperrt) |
| Suchfeld `.achv-ledger-search img` | 20 × 20 px | 20 × 20 px | `icon_ach_search` |

Ohne Warden-Layout (Basis-CSS, derzeit nicht aktiv) wäre der Kartenring 54 px, das Bild ebenfalls 28 px, Gruppenkopf 26 px und Filterknöpfe 1,3 em. Die Bildgröße im Ring ist also in beiden Fassungen **28 px**.

Zwei Nebenverbraucher außerhalb der Seite: `icon_ach_nature` steht auch auf der Farm-Seite (`FarmPage.tsx`, `.ui-icon`, 1 em), `icon_achievement_unlocked` erscheint im Erfolgs-Toast (`Toasts.tsx`) und im Offline-Bericht (`OfflinePopup.tsx`). Beide werden mit ersetzt, das ist gewollt.

**Was muss der Spieler innerhalb der ersten Sekunde erkennen oder fühlen?**
1. Die Kategorie: Trophäe, Amboss, Klingen, Ähre, Zahnrad, Schriftrolle, Münzsack, Truhe, Kompass, Stern. Silhouette zuerst, Material danach.
2. „Das gehört zu Grim Reach": gemaltes Metall, Leder, Pergament, Holz mit Tiefe und Abnutzung, kein Icon-Font.
3. Die Seltenheit kommt vom Ring, nicht vom Bild. Ein Emblem darf nie so aussehen, als sei es schon selbst ein Abzeichen mit Rand.

**Woran erkennt Claude, dass der Auftrag erfolgreich ist?**
Siehe A9 und die Abnahme-Liste am Ende. Kurz: zehn Dateien mit exakten Namen, 512 px, echtes Alpha, kein eigener Ring im Bild, ein Akzentton je Kategorie, und auf dem Kontaktbogen bei 28 px im 46-px-Ring ist jede Kategorie ohne Beschriftung benennbar, auch im gesperrten Zustand (Karte entsättigt und abgedunkelt).

## A3. Lieferumfang

Dateiname = bestehender Icon-Name, immer `.png` mit echtem Alpha. Der Renderer bindet über den Dateinamen (`uiIcons.ts`, Auto-Discovery `assets/icons/*.{png,webp}`), die WebP-Konvertierung und der Austausch im Renderer sind Claudes Sache.

| # | Asset-ID / Dateiname | Kategorie (DE / EN) | Erfolge heute | Motiv | Akzentton | Priorität |
|---:|---|---|---:|---|---|---|
| 1 | `icon_ach_trophy.png` | Alle / All | 537 | Pokal auf kurzem Sockel, zwei Henkel, Lorbeer eingraviert | gealtertes Bronze-Gold | P1 |
| 2 | `icon_ach_forge.png` | Fertigkeiten / Skilling | 199 | Amboss mit aufliegendem Schmiedehammer | Glut-Orange am heißen Eisen | P1 |
| 3 | `icon_ach_combat.png` | Kampf / Combat | 301 | zwei gekreuzte Schwerter, Griffe unten | Oxblood-Rot an den Lederwicklungen | P1 |
| 4 | `icon_ach_nature.png` | Sammeln / Gathering | 4 | eine Ähre mit zwei Blättern | Moosgrün | P1 |
| 5 | `icon_ach_craft.png` | Handwerk / Crafting | 4 | Zahnrad, dahinter Nadel mit Faden | Kupfer | P1 |
| 6 | `icon_ach_scroll.png` | Aufgaben / Quests | 8 | halb aufgerollte Schriftrolle mit Wachssiegel | Pergament-Creme | P1 |
| 7 | `icon_ach_gold.png` | Reichtum / Wealth | 9 | zugebundener Münzsack, drei Münzen davor | Münz-Gold (heller als die Trophäe) | P1 |
| 8 | `icon_ach_gift.png` | Sammlung / Collection | 12 | eisenbeschlagene Holztruhe, Deckel einen Spalt offen | Grünspan auf den Beschlägen | P1 |
| 9 | `icon_ach_compass.png` | Erkundung / Exploration | 0 (angelegt) | Messing-Kompass, Windrose mit Nadel | Indigo-Blau des Zifferblatts | P1 |
| 10 | `icon_ach_star.png` | Meta / Meta | 0 (angelegt) | achtstrahliges Eisensigill, Stern in Ring aus Runenkerben | Silber | P1 |
| 11 | `icon_achievments.png` | Kopf-Trophäe der Seite | | große Trophäe, reicher als Nr. 1 (Lorbeerkranz, Sockelplatte) | gealtertes Gold | P2 |
| 12 | `icon_ach_milestone.png` | Meilenstein-Leiste | | Meilenstein aus Stein mit eingeschlagener Kerbmarke | Kupfer | P2 |
| 13 | `icon_achievement_unlocked.png` | Plakette „Freigeschaltet", Toast, Offline-Bericht | | Lorbeerkranz um ein geprägtes Siegel mit Haken | gealtertes Gold | P2 |

Zu Nr. 1 und Nr. 11: Beide sind Trophäen. Nr. 1 ist das ruhige Kategorie-Emblem für „Alle" (kompakt, 28 px). Nr. 11 ist das große Kopfstück der Seite (38 px im 58-px-Ring) und darf reicher sein. Nr. 11 ist heute schon gemalt (1254 px, kein Platzhalter) und wird nur ersetzt, wenn es neben dem neuen Nr. 1 alt wirkt. Mira entscheidet das nach dem Kontaktbogen und sagt es dazu.

Die Kategorien Erkundung und Meta haben heute keine Erfolge, sind im Typ `AchievementCategory` aber angelegt und in der Leiste sichtbar. Sie werden mitgeliefert, damit die Seite vollständig ist.

**Vollständigkeitsregel:**
Die zehn Kategorie-Embleme in einem Batch. Kein Teilbatch, weil der Kontaktbogen aller zehn im Ring die eigentliche Abnahme ist. Die drei UI-Symbole dürfen nachgereicht werden.

## A4. Feste Auftraggeber-Entscheidungen

| Thema | Fixe Entscheidung |
|---|---|
| Kanon / Lore | Keine Lore-Bindung, reine UI-Symbolik. Ashen Iron: Eisen, Bronze, Leder, Pergament, Stein, Holz. Keine Comedy, keine Folklore-Klischees. |
| Motiv / Funktion | Ein Emblem = ein Motiv aus A3. Kein zweites Objekt, keine Szene, kein Hintergrund. Das Motiv muss bei 28 px an der Silhouette erkennbar sein. |
| Stilbindung | **Bildsprache der Runen-Lieferung von heute** (`CODEX/assets/runen-tier-iv-2026-08-25/fertig/`): gemalt statt gerendert, Material mit Abnutzung, Tiefe durch Licht und Schatten, kein Comic, kein Vektor-Icon. Bindend ist der Grad an Detail und Ernst, nicht das Runen-Motiv. |
| Farb-/Fraktionscode | Gedeckte Grundpalette (dunkles Eisen, Aschgrau, gealtertes Bronze) plus **genau ein Akzentton je Kategorie** aus A3. Kein Regenbogen, kein Neon. |
| Perspektive / Ansicht | Für alle 13 gleich: frontal, leicht von oben, Hauptlicht weich von oben links. Kompakte, annähernd runde Silhouette, die gut in einem Kreis sitzt. |
| Text im Bild | Kein Text, keine Buchstaben, keine Ziffern, keine lesbare Runenschrift. |
| Gewalt-/Horrorgrenze | Dark Fantasy erlaubt (Klingen, Kerben, Abnutzung). Kein Blut, kein Schädel. |
| Bestehendes Asset | **Ersetzen.** Die zehn Kategorie-WebPs und `icon_ach_milestone.webp` sind Platzhalter (Messung in A7). `icon_achievments.webp` und `icon_achievement_unlocked.webp` sind gemalt und werden nur ersetzt, wenn sie neben den neuen Emblemen abfallen. `icon_ach_search` und `icon_locked` sind nicht Teil des Auftrags (siehe offene Fragen). |
| Weitere Verbote | **Kein eigener Ring, Kreis, Rahmen, Rand, Banner, Band oder Schild um das Motiv.** Den Ring zeichnet das Spiel in der Seltenheitsfarbe. Kein Rarity-Glühen, keine Aura, kein Funkeln, kein Lichtsaum. Kein gemaltes Schachbrett, kein Magenta-Key, keine Bodenplatte, kein Sockel außer bei der Trophäe, kein Schatten auf dem Canvas, kein Wasserzeichen. |

## A5. Designer-Freiheit

**Mira darf frei entscheiden:**
Exakte Form innerhalb des Motivs (Ambossform, Klingentyp, Truhenbeschläge, Kompassrose), Abnutzungsgrad, Materialdetails, Winkel der Nadel und des Hammers, Menge der Münzen, Wachsfarbe des Siegels, solange die Silhouette bei 28 px die Kategorie trägt.

**Mira soll Varianten anbieten bei:**
Keine Pflicht. Empfohlen: drei Anker zuerst (Nr. 1 Trophäe, Nr. 3 Kampf, Nr. 6 Schriftrolle), im 46-px-Ring an Claude oder den Chef zeigen, dann die übrigen sieben im gleichen Guss.

**Gewünschte Zahl an Konzeptvarianten vor Finalisierung:**
0 für den Batch, optional 2 für den ersten Anker.

## A6. Referenzen und Quellen

Die Pfade dienen der Stil-Kontrolle. Die Prompts sind so geschrieben, dass sie ohne Referenzbild funktionieren.

| Art | Pfad | Was davon übernehmen? | Was ausdrücklich nicht? |
|---|---|---|---|
| **Stil-Anker (heute abgenommen)** | `G:\GameDev\CODEX\assets\runen-tier-iv-2026-08-25\fertig\*.png` und `qa\contact-sheet-neben-tier-iii.png` | Malgrad, Materialtiefe, Kantenqualität, Alpha-Qualität, QA-Aufbau (Kontaktbögen, qa.json) | das Glühen und die Aura (Runen dürfen leuchten, Embleme nicht), die Steinform, die Ziffern |
| Platzhalter, die ersetzt werden | `G:\GameDev\apps\client\src\renderer\assets\icons\icon_ach_{trophy,forge,combat,nature,craft,scroll,gold,gift,compass,star}.webp` | nur die Motiv-Idee (welches Symbol welche Kategorie trägt) und den Motivanteil von rund 80 % | alles andere: Strichstil, Zweiton-Ocker, fehlende Tiefe |
| Gemalte Nachbarn auf derselben Seite | `G:\GameDev\apps\client\src\renderer\assets\icons\icon_achievments.webp` (Kopf-Trophäe), `icon_achievement_unlocked.webp` (Plakette), `icon_locked.webp` (Schloss) | Farbtemperatur des Goldes, Grad an Abnutzung, so ernst sollen die Embleme sein | die weiche Glut-Kante der Plakette (11 % Teilalpha) ist für die Embleme zu viel Leuchten |
| Item-Icons als Größenvergleich | `G:\GameDev\apps\client\src\renderer\assets\items\godiron_bar.webp` (Bronze-Gold), `copper_bar.webp` (Kupfer), `essence_void.webp` (Violett, Vergleich für „nicht so") | Metallfarben und Malgrad im Inventar bei 48 bis 96 px | nichts |
| Ring, den das Spiel zeichnet | `G:\GameDev\apps\client\src\renderer\styles\achievements.css` ab `.achv-emblem` und `styles\warden-ledger-achievements.css` ab `.achv-page--warden .achv-emblem` | Ringfarben für den QA-Bogen: common `#454d54`, uncommon `rgba(91,143,214,.6)`, rare `rgba(216,192,106,.65)`, epic `rgba(170,80,200,.65)`, legendary `rgba(217,138,74,.7)`; Innenfläche `radial-gradient(circle at 35% 30%, rgba(255,255,255,.06), rgba(10,8,6,.85) 74%)`; gesperrt: Emblem `grayscale(0.45)`, Karte `saturate(0.72) brightness(0.84)` | nichts |
| Zuordnung Kategorie → Datei | `G:\GameDev\apps\client\src\renderer\pages\AchievementsPage.tsx`, `CATEGORY_UI` (Zeile 57) | die zehn Namen, exakt | nichts |
| Technische Quelle | `G:\GameDev\apps\client\src\renderer\uiIcons.ts` (Auto-Discovery `assets/icons/*.{png,webp}`, Name ohne Endung ist der Schlüssel) | Namensschema | nichts |

**Referenzrang bei Widerspruch:**
Dieses Briefing > `design/asset-anforderungen.md` > Runen-Lieferung von heute > gemalte Nachbarn auf der Seite > Platzhalter. Bei Zweifeln an einem Motiv kurz nachfragen statt raten.

## A7. Technische Leitplanken

**Bestand, gemessen mit PIL am 25.08.2026** (`apps/client/src/renderer/assets/icons/`):

| Datei | Format | Größe | Dateigröße | Farben (opak) | Motiv-Box (Höhe) | Rand min. | Teilalpha |
|---|---|---|---|---:|---|---|---|
| `icon_ach_trophy.webp` | WebP RGBA | 512 × 512 | 4,4 KB | 8 | 392 × 386 (75 %) | 60 px | 0,7 % |
| `icon_ach_forge.webp` | WebP RGBA | 512 × 512 | 5,1 KB | 16 | 424 × 432 (84 %) | 38 px | 0,8 % |
| `icon_ach_combat.webp` | WebP RGBA | 512 × 512 | 3,8 KB | 16 | 464 × 408 (80 %) | 24 px | 1,8 % |
| `icon_ach_nature.webp` | WebP RGBA | 512 × 512 | 6,4 KB | 140 | 332 × 354 (69 %) | 44 px | 0,7 % |
| `icon_ach_craft.webp` | WebP RGBA | 512 × 512 | 3,8 KB | 23 | 426 × 426 (83 %) | 34 px | 1,0 % |
| `icon_ach_scroll.webp` | WebP RGBA | 512 × 512 | 3,6 KB | 43 | 388 × 408 (80 %) | 34 px | 0,5 % |
| `icon_ach_gold.webp` | WebP RGBA | 512 × 512 | 5,3 KB | 57 | 328 × 356 (70 %) | 56 px | 1,0 % |
| `icon_ach_gift.webp` | WebP RGBA | 512 × 512 | 4,1 KB | 146 | 460 × 408 (80 %) | 26 px | 0,4 % |
| `icon_ach_compass.webp` | WebP RGBA | 512 × 512 | 7,9 KB | 17 | 436 × 436 (85 %) | 38 px | 1,4 % |
| `icon_ach_star.webp` | WebP RGBA | 512 × 512 | 5,4 KB | 8 | 432 × 412 (80 %) | 36 px | 1,1 % |
| `icon_ach_milestone.webp` | WebP RGBA | 512 × 512 | 5,8 KB | 132 | 376 × 380 (74 %) | 60 px | 0,6 % |
| `icon_ach_search.webp` | WebP RGBA | 512 × 512 | 5,7 KB | 16 | 402 × 402 (79 %) | 50 px | 1,1 % |
| `icon_achievments.webp` | WebP RGBA | 1254 × 1254 | 175 KB | 60.234 | 971 × 1102 (88 %) | 74 px | 1,6 % |
| `icon_achievement_unlocked.webp` | WebP RGBA | 1254 × 1254 | 310 KB | 123.682 | 1078 × 1035 (83 %) | 86 px | 11,1 % |

Alle 14 haben echtes Alpha und transparente Ecken. Die zwölf 512er sind reine Strichzeichnungen mit einem Ocker-Gold (mittleres RGB etwa 200/152/77) und einem dunklen Kupfer als zweitem Ton, 8 bis 146 Farbwerte, ohne Schattierung, Material oder Tiefe, mit harter Kante (Teilalpha unter 2 %): so wirkt ein Icon-Font, nicht ein gemaltes Spielsymbol, und genau das ist der Grund für den Austausch. Die beiden 1254er sind gemalt und spielen in einer anderen Klasse.

| Feld | Vorgabe |
|---|---|
| Zielpfad im Produkt | `apps/client/src/renderer/assets/icons/<name>.webp` (Übergabe durch Claude nach Freigabe, nicht durch Mira) |
| Dateiformat | Lieferung: **PNG mit echtem Alpha**. Claude wandelt bei der Integration in WebP und ersetzt die alte Datei gleichen Namens. |
| Maße / Seitenverhältnis | **512 × 512 px**, quadratisch, Motiv mittig. Das entspricht der Untergrenze für Items im Assetvertrag; die Embleme werden nie größer als 50 px gezeigt, 512 reicht mit Reserve. Wer nativ größer erzeugt, liefert die Rohdatei ungeschnitten in `raw/`. |
| Motivanteil | Motiv 80 bis 90 % der Kantenhöhe, mittig. Die äußeren 16 px auf allen vier Seiten bleiben vollständig transparent (Alpha 0). Die Silhouette soll kompakt und annähernd rund sein, weil das Bild als 28-px-Quadrat in einem 46-px-Kreis sitzt; lange schmale Formen (ein einzelnes Schwert) verschenken Fläche. |
| Hintergrund | Freisteller, echtes natives Alpha. Keine Bodenfläche, kein Schatten auf dem Canvas, kein Sockel außer bei der Trophäe, keine Hintergrundplatte. |
| Alpha-Erzeugung | Nativ im Quellbild. Kein Chroma-Key, kein Schachbrett, kein nachträgliches Keying. Kanten sauber und leicht weich (Antialiasing), keine Ein-Bit-Kante. |
| Alpha-Rand / Beschnitt | Kein Farbsaum (Prüfung auf grellrosa Fläche). Nichts angeschnitten. |
| Farbraum | sRGB |
| Dateigrößenlimit | keines. Qualität vor Dateigröße. |
| Auto-Discovery / Namensschema | Dateiname exakt wie in A3, Kleinbuchstaben, Unterstriche. Der Tippfehler in `icon_achievments` ist der bestehende Schlüssel und bleibt so. Kein `final`, kein `v2`. |
| Muss vorhandenes Asset ersetzen? | ja, dieselben Namen (Liste in A3) |
| Quelldatei zusätzlich liefern? | ja: die unveränderte Roh-Ausgabe des Generators als `<name>-raw.png` in `raw/` |

**Lesbarkeit im dunklen Ring:** Die Innenfläche des Medaillons ist fast schwarz, im gesperrten Zustand wird das Emblem zusätzlich zu 45 % entsättigt und die Karte abgedunkelt. Das Motiv braucht deshalb mittlere bis helle Werte auf der Hauptform und eine klare Hell-Dunkel-Kante. Ein schwarzes Eisenschwert auf schwarzem Grund verschwindet; eine Klinge mit hellem Grat bleibt. Farbe darf die Kategorie unterstützen, aber nie allein tragen.

## A8. Batch-Konsistenz

**Welche Merkmale müssen über den gesamten Batch identisch bleiben?**
Kamera (frontal, leicht von oben), Maßstab (Motiv 80 bis 90 % der Höhe, optisch gleiches Gewicht), Lichtrichtung (weiches Hauptlicht oben links, eine Lichtkante, eine Schattenseite), Materialwelt (gemaltes Metall, Leder, Pergament, Holz, Stein mit Gebrauchsspuren), Handmal-Look Ashen Iron, gedeckte Grundpalette, kein Glühen, kein eigener Ring, Transparenz.

**Welche Merkmale müssen Fortschritt oder Unterschiede zeigen?**
Nur die Kategorie: Motiv und Akzentton aus A3. Es gibt keine Stufen und keine Seltenheit im Bild. Zehn Embleme, zehn Akzente, ein Malstil.

**Reihenfolge oder visuelle Hierarchie:**
Alle zehn gleichwertig. Nr. 11 (Kopf-Trophäe) darf als einziges Stück reicher sein, weil es größer gezeigt wird und allein steht.

## A9. Abnahme und Entscheidungsgrenzen

**Muss Chef oder Claude vor der finalen Generierung ein Konzept freigeben?**
Nein für den Batch. Empfohlen: die drei Anker (Trophäe, Kampf, Schriftrolle) im 46-px-Ring kurz zeigen, bevor die übrigen sieben laufen.

**Darf Mira technisch notwendige Korrekturen ohne Rückfrage durchführen?**
Ja, Standard: Zuschnitt, Zentrierung, Skalierung auf 512, Kantenkorrektur aus Motivfarben. Kein Keying.

**Folgende Änderungen brauchen zwingend Auftraggeber-GO:**
Motivwechsel einer Kategorie (etwa Helm statt Klingen), anderer Akzentton, ein Ring oder Rahmen im Bild, Glühen, Text, Teilbatch bei den zehn Kategorie-Emblemen, Ersatz von `icon_ach_search` oder `icon_locked`.

**Offene Entscheidungen, ohne die Mira nicht starten darf:**
Keine. Alles Nötige steht hier und in PROMPTS.md.

---

# Hausregeln (bindend, aus dem Projektgedächtnis)

1. **Echte Transparenz.** Alphakanal aus der Erzeugung, niemals ein gemaltes Schachbrett, kein Magenta-Key, kein nachträgliches Keying. Gemessen wird das Ergebnis auf grellrosa Grund.
2. **Kein Glühen.** Embleme sind keine Runen. Kein Schimmer, keine Aura, kein Lichtsaum, kein Funkeln. Die Seltenheit kommt vom Ring des Spiels.
3. **Kein eigener Ring.** Das Bild endet an der Motivsilhouette. Kein Kreis, kein Rand, kein Schild, kein Banner.
4. **Dark Fantasy, gemalt.** Kein Comedy, keine Folklore-Klischees, kein Neon, kein Vektor-Icon, keine Mobile-Game-Politur. Derselbe Ernst wie bei den Runen von heute.
5. **Prompts sind vollständig.** Jeder Prompt nennt Motiv, Material, Akzent, Perspektive, Licht und Verbote. Referenzbilder sind nur Stil-Kontrolle.
6. **Natürliche Texte** in allen Begleitdokumenten: höchstens ein Gedankenstrich pro Satz.
7. **Dateiname = bestehender Icon-Name**, exakt wie in A3, inklusive `icon_achievments`.

---

# Ablage der Lieferung

Gemäß `CODEX/RULES.md` (Staging unter `CODEX/assets/**`, produktive Übergabe erst nach Freigabe):

```
CODEX/assets/achievement-icons-2026-08-25/
  README.md              <- Auftrag, Prompt-Verweis, Lizenz-/Urheberstatus, Ziel-Namen, Maße, QA-Status
  fertig/                <- 10 (plus bis zu 3) finale PNGs, Dateiname exakt der bestehende Icon-Name
    icon_ach_trophy.png
    icon_ach_forge.png
    icon_ach_combat.png
    icon_ach_nature.png
    icon_ach_craft.png
    icon_ach_scroll.png
    icon_ach_gold.png
    icon_ach_gift.png
    icon_ach_compass.png
    icon_ach_star.png
    (optional) icon_achievments.png, icon_ach_milestone.png, icon_achievement_unlocked.png
  raw/                   <- unveränderte Generator-Ausgaben als <name>-raw.png
  qa/                    <- contact-sheet-black.png, contact-sheet-gray.png, contact-sheet-magenta.png,
                            contact-sheet-ring-28-46.png (jedes Emblem bei 28 px in einem 46-px-Ring in allen
                            fünf Rarity-Farben, dazu eine Reihe im gesperrten Zustand: grayscale 0.45 plus
                            saturate 0.72 und brightness 0.84), contact-sheet-neben-runen-iv.png (die zehn
                            Embleme neben drei Runen von heute in gleicher Größe), qa.json mit Maßen,
                            Alpha-Werten und SHA-256
```

Danach `CODEX/HANDOFF.md` und `CODEX/WORKLOG.md` aktualisieren. Keine Datei nach `apps/client/src/renderer/assets/**` kopieren, das übernimmt Claude (asset-integrator) nach Prüfung. Die alten WebPs bleiben bis dahin unangetastet.

---

# Abnahme-Kriterien (Claude prüft jede Datei)

1. Alphakanal vorhanden und benutzt. Äußere 16 px rundum Alpha 0. Kein Karo, kein Vollflächen-Hintergrund.
2. Kein Farbsaum auf grellrosa Fläche. Kanten antialiased, keine harte Ein-Bit-Kante.
3. 512 × 512 px, PNG, sRGB. Motiv 80 bis 90 % der Höhe, mittig, kompakte Silhouette.
4. Dateiname exakt einer der zehn Namen aus A3 (plus optional drei), keine unerwartete Datei.
5. **Lesbar bei 28 px im 46-px-Ring:** auf `contact-sheet-ring-28-46.png` ist jede der zehn Kategorien ohne Beschriftung benennbar, in allen fünf Ringfarben und in der gesperrten Reihe.
6. Lesbar bei 24 px ohne Ring (Kategorie-Leiste) und sauber bei 50 px (Detailblatt).
7. Kein eigener Ring, Kreis, Rahmen, Rand, Band oder Schild im Bild. Kein Glühen, keine Aura, kein Lichtsaum.
8. Genau ein Akzentton je Emblem, wie in A3; Grundpalette gedeckt. Die zehn Akzente sind auf dem Kontaktbogen unterscheidbar.
9. Gleiche Perspektive und Lichtrichtung über alle Dateien; neben drei Runen von heute derselbe Malgrad, kein Stilbruch.
10. Kein Text, kein Wasserzeichen, kein Sockel (außer Trophäe), kein Schatten auf dem Canvas.
11. Roh-Dateien und qa.json vorhanden.

---

# Teil B – Designauflösung

**Wird von Mira vor der Produktion ausgefüllt.**

## B1. Verständnis des Auftrags

**Designziel in einem Satz:**
`[Mira]`

**Wichtigste visuelle Aussage:**
`[Mira]`

**Annahmen von Mira:**
`[Mira]`

**Gefundene Widersprüche oder fehlende Pflichtangaben:**
`[Mira]`

## B2. Art Direction

| Bereich | Mira-Entscheidung |
|---|---|
| Stil | |
| Komposition | |
| Kamera / Perspektive | |
| Silhouette | |
| Materialwelt | |
| Palette | |
| Licht | |
| Atmosphäre | |
| Detailgrad | |
| Batch-Klammer | |

## B3. Technische Produktionsspezifikation

| Feld | Finale Produktionsentscheidung |
|---|---|
| Arbeitsauflösung | |
| Zielauflösung | 512 × 512 px |
| Zielformat | PNG, sRGB, vier Kanäle |
| Hintergrund / Alpha | |
| Bindende Content-ID / finaler Dateiname | die Namen aus A3, exakt und ohne Zusatz |
| Native-Alpha-Produktionsweg bestätigt | |
| Beschnitt / Safe Area | |
| Namensschema | |
| Staging-Pfad | `CODEX/assets/achievement-icons-2026-08-25/` |
| Produktionspfad nach Freigabe | `apps/client/src/renderer/assets/icons/<name>.webp`, Integration ausschließlich durch Claude |
| Varianten- und Quellablage | |

## B4. Generierungsplan

**Methode:**
`[Mira]`

**Konsistenzstrategie:**
`[Mira]`

**Produktionsreihenfolge:**
1. `[Anker: Trophäe, Kampf, Schriftrolle]`
2. `[Prüfung im 46-px-Ring]`
3. `[Restbatch]`
4. `[technische Aufbereitung und QA]`

**Master-Prompt beziehungsweise unveränderlicher Prompt-Kern:**
```text
[siehe PROMPTS.md, Serienkern]
```

**Pflichtblock für jeden Grim-Reach-Freisteller:**
```text
Output requirement: a native transparent PNG/WebP with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fur, feathers, smoke, fog, cloth fibers, glow, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark unless the brief explicitly requires it.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

**Asset-spezifische variable Prompt-Felder:**
`[Motiv, Akzentton, Materialdetails je Block in PROMPTS.md]`

**Negativvorgaben:**
```text
[Mira]
```

## B5. Prüfplan vor Produktion

- [ ] CEO-Pflichtfelder ausreichend
- [ ] `design/asset-anforderungen.md` vollständig gelesen
- [ ] relevante Design-/Lore-Dokumente gelesen
- [ ] Ziel-Loader und Namensschema geprüft
- [ ] exakte Content-ID und finaler Dateiname vor Generierung bestätigt
- [ ] bei Freistellern ein echter nativer Alpha-Produktionsweg bestätigt; kein Keying eingeplant
- [ ] bestehende Assets in echter Zielgröße betrachtet (28 px im Ring)
- [ ] Rechte-/Lizenzlage der Referenzen klar
- [ ] Konflikte mit Claudes Revier oder laufender Arbeit ausgeschlossen
- [ ] Freigabe-Gate aus A9 erfüllt

---

# Teil C – Lieferung und QA

**Wird von Mira nach der Produktion ausgefüllt.**

## C1. Gelieferte Dateien

| # | Datei | Asset-ID | Maße / Format | Status | Produktionspfad |
|---:|---|---|---|---|---|
| 1 |  |  |  | `[Final / Variante / verworfen]` |  |

## C2. Visuelle QA

- [ ] Motiv und Funktion bei 28 px im Ring sofort erkennbar
- [ ] Batch wirkt wie aus einem Guss
- [ ] Silhouette und Hauptkontrast funktionieren, auch entsättigt
- [ ] Keine unerwünschten Texte, Logos oder Wasserzeichen
- [ ] Keine typischen Generierungsfehler an Geometrie, Kanten oder Wiederholungen
- [ ] Keine abgeschnittenen wichtigen Formen
- [ ] Alphakanal vorhanden und tatsächlich benutzt; kein Karo und kein Vollflächen-Hintergrund
- [ ] Silhouette auf grellrosa Prüffläche ohne Farbsaum kontrolliert
- [ ] Auflösungsuntergrenze aus `design/asset-anforderungen.md` erreicht
- [ ] Dateiname entspricht exakt dem bestehenden Icon-Namen
- [ ] Kein Schimmern, Glühen oder Leuchten; kein eigener Ring
- [ ] Blickrichtung: nicht anwendbar
- [ ] Farb- und Helligkeitswerte passen zum dunklen Medaillon
- [ ] Ein Akzentton je Kategorie, gedeckte Grundpalette
- [ ] Ring-Kontaktbogen 28/46 und Vergleich neben den Runen geprüft

## C3. Technische QA

- [ ] Dateinamen entsprechen exakt den Namen aus A3; keine `final`-/`v2`-/Variantenanhänge
- [ ] Maße, Format und Farbraum korrekt
- [ ] Freisteller sind PNG mit echtem Alpha; kein JPG und keine nachträgliche Key-Matte
- [ ] Äußere 16 px vollständig transparent
- [ ] Keine versehentliche automatische Bindung aus dem Staging
- [ ] Zielpfad und Loader-Regel verifiziert
- [ ] Vorhandene Dateien nicht unbeabsichtigt überschrieben
- [ ] Quellen, Prompts und Rechte dokumentiert
- [ ] Relevanter headless Check erfolgreich

## C4. Nachweis

**Preview-/Proof-Pfade:**
`[Kontaktbögen, Ring-Bogen, Runen-Vergleich, qa.json]`

**Ausgeführte Checks:**
`[Befehl oder visuelle Prüfung + Ergebnis]`

**Bekannte Grenzen:**
`[keine / Liste]`

**Mira-Empfehlung:**
`[freigeben / Variante X wählen / gezielte Korrektur]`

**Empfohlener Claude-Owner für Gegenprüfung:**
`asset-integrator`, danach `ui-dev` für den Blick auf die laufende Seite.

---

# Teil D – Abnahme

**Wird vom Chef oder von Claude im Rahmen seiner übertragenen Entscheidungsbefugnis ausgefüllt.**

**Entscheidung:**
`[GO / GO mit kleinen Korrekturen / neue Variante / abgelehnt]`

**Gewählte Variante:**
`[Datei oder Variante]`

**Verbindliche Korrekturen:**
1. `[konkrete Änderung]`

**Darf danach integriert werden?**
`[ja / nein / nur nach erneutem Gegencheck]`

**Zielversion / Changelog-Zuordnung:**
`[Version / Task / Patchnote]`

**Abnahme durch / Datum:**
`[Claude / Chef, YYYY-MM-DD]`
