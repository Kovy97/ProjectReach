# UI-Audit 1.1.0 — Hauptmenü & Charaktererstellung

Auditor: UI-Dev. Themenbereich laut Auftrag: **Hauptmenü und Charaktererstellung** — die ersten
zwei Bildschirme, die jeder Käufer sieht, bevor überhaupt eine Spielmechanik zu sehen ist. Bezug
zur 25%-Rückerstattungsquote (Juli): der Ersteindruck dieser zwei Screens zahlt direkt darauf ein.

**Methode:** `apps/client/ui-audit/bot.mjs` auf Port 5345 (reserviert für diese Session), Chromium
headless, `--locale en`, zwei Auflösungen (1920×1080, 1600×900). Ein zusammenhängender Bot-Lauf pro
Auflösung: Hauptmenü ohne Spielstände → alle drei Panels (New/Load/Options) → Charaktererstellung
leer → jedes Formularfeld einzeln befüllt (Name, Portrait-Chip, Portrait-Galerie-Modal, alle drei
Stil-Karten) → Charakter angelegt → zurück ins Hauptmenü → Panels erneut MIT einem Spielstand
(Load-Liste + Overwrite-Reihe in New). Jeder Zustand wurde mit einem `wait:selector=…` auf ein
zustandsspezifisches Element abgesichert und doppelt geschossen, um den bekannten
„Vor-Render-Frame"-Fallstrick auszuschließen (siehe BOT-GUIDE.md) — eine erste Verdachtsstelle
(„Load Game" scheinbar komplett leer) hat sich dadurch als reines Timing-Artefakt erwiesen, nicht
als Bug; das ist unten entsprechend NICHT mehr aufgeführt.

Alle Pfade absolut. Rohscreenshots liegen unter:
- `G:\GameDev\apps\client\ui-audit\bot-runs\uidev-mainmenu-1920b\` (1920×1080)
- `G:\GameDev\apps\client\ui-audit\bot-runs\uidev-mainmenu-1600b\` (1600×900)
- `G:\GameDev\apps\client\ui-audit\bot-runs\uidev-sidebar-ref\` (Referenz-Sidebar, `midgame`-Fixture)

Vier Vorher-Kontaktbögen (Python/PIL, Screens direkt neben einer sauberen Sidebar-Aufnahme) unter
`G:\GameDev\design\ui-1.1.0\screens\05-mainmenu-charactercreation\`:
- `kontaktbogen-01-hauptmenue-vs-sidebar.png`
- `kontaktbogen-02-erstellung-vs-sidebar.png`
- `kontaktbogen-03-panels-detail.png`
- `kontaktbogen-04-erstellung-zwischenzustaende.png`

---

## 1. Hauptmenü — Mangelliste (schwerstes zuerst)

### 1.1 „Load Game" mit wenig Spielständen: riesige tote Fläche neben der Karte
**Screenshot:** `uidev-mainmenu-1920b\14-panel-load-withSave-b.png` (und 1600er-Variante,
identisch reproduziert; siehe auch `kontaktbogen-03-panels-detail.png`, drittes Bild).
Ein einziger Spielstand sitzt oben links in einer riesigen, komplett leeren braunen Fläche — gut
80 % des Panels sind leer. Das ist der Screenshot, der am ehesten wie ein Renderfehler aussieht,
nicht wie Absicht: kein zweiter Platzhalter, kein Hinweistext, keine visuelle Begründung für die
Leere.
**Ursache (Code, nicht Vermutung):** `styles/menu.css`, Regel für `.menu--panel-new .menu-slots`
UND `.menu--panel-load .menu-slots` gemeinsam:
```
grid-template-columns: repeat(5, minmax(176px, 238px));
justify-content: center;
```
Beide Panels erzwingen ein festes 5-Spalten-Raster. Bei „New Game" ist das unsichtbar, weil
`slots` (alle Slots inkl. leerer) gerendert wird — 5 Karten füllen 5 Spalten. Bei „Load Game" wird
aber nur `filled` (die tatsächlich belegten Slots) gerendert (`MainMenu.tsx`, Zeile ~176). Bei 1
Spielstand bleiben die Grid-Spuren 2–5 als leere Tracks stehen, weil `grid-template-columns` sie
unabhängig von der Item-Zahl reserviert. Mit 5 parallel laufenden Speicherständen sähe dasselbe
Panel voll und gut aus — genau der Zustand, den ein Erstspieler NIE hat.

### 1.2 Keine visuelle Hierarchie zwischen den vier Hauptknöpfen
**Screenshot:** `uidev-mainmenu-1920b\01-mainmenu-noSaves-a.png` /
`kontaktbogen-01-hauptmenue-vs-sidebar.png` (erstes Bild).
New Game, Load Game, Options und Quit Game sind vier optisch identische Kacheln in einem 2×2-Raster
— gleiche Boxgröße, gleiche Schriftgröße, gleiches Braun, nur Quit Game weicht per Textfarbe
(Rosa) ab. Für einen Erstspieler ohne Spielstand ist „New Game" die einzig sinnvolle Aktion — sie
sieht aber genauso aus wie „Options" oder „Quit Game". Es gibt keinen optischen Fingerzeig, wo man
zuerst hinklickt; das Auge muss lesen statt sofort zu erkennen.

### 1.3 Leerraum-Schieflage: Aktionsfläche nur im unteren Drittel
**Screenshot:** `uidev-mainmenu-1920b\01-mainmenu-noSaves-b.png`.
Bei 1080p liegt das 2×2-Menü zwischen etwa y=680 und y=1040 — knapp 33 % der Bildhöhe. Darüber:
Logo (mittig, groß) und ruhige Hero-Art ohne jede Interaktion. Ergebnis: zwei konkurrierende
Schwerpunkte (Logo vs. Buttons), keiner davon dominant genug, um den Blick eindeutig zu führen, und
die eigentliche Handlungsfläche wirkt im Verhältnis zur Bildschirmgröße klein und nachrangig — für
den wichtigsten Entscheidungsmoment des ganzen Spiels ungünstig verteilt.

### 1.4 Slot-Karten-Text wirkt blass/zurückhaltend
**Screenshot:** `uidev-mainmenu-1920b\02-panel-new-empty-b.png`.
„Empty save slot" / „New Game" auf den leeren Karten nutzt `var(--muted)` (#79848c) ohne jede
Gold-/Wärme-Akzentuierung. Kontrast-technisch (rechnerisch ca. 6:1 auf dem fast schwarzen
Kartengrund) ist das noch lesbar, aber die Karten wirken dadurch wie deaktivierte Platzhalter statt
wie eine Einladung „hier klicken, um loszulegen" — passt nicht zur sonst warmen Gold-Sprache des
Spiels (Panel-Titel, Buttons, Sidebar).

### 1.5 Panel-Titel und auslösende Buttons teilen sich Farbe/Gewicht
**Screenshot:** `uidev-mainmenu-1920b\02-panel-new-empty-b.png`.
Die Panel-Überschrift „NEW GAME" (im geöffneten Panel) und der Nav-Button „NEW GAME" (der es
öffnet) sind fast ident in Farbe/Schriftschnitt — kleinere, aber messbare Stufe in der
typografischen Hierarchie fehlt (Überschrift vs. interaktives Element sollten sich klarer
unterscheiden, z. B. über Groß-/Kleinschreibungs-Kontrast, Gewicht oder Zusatzfarbe).

---

## 2. Charaktererstellung — Mangelliste (schwerstes zuerst)

### 2.1 „BEGIN ADVENTURE" sieht nicht wie die wichtigste Aktion im Spiel aus
**Screenshot:** `uidev-mainmenu-1920b\11-creation-filled-full-b.png` (ausgefüllt/aktiv) vs.
`05-creation-empty-b.png` (leer/deaktiviert) — Unterschied ist im Screenshot kaum wahrnehmbar,
nur ein leichter Gold-Ton-Wechsel im Text.
**Ursache:** `.creation-start` (`styles/creation.css`) ist derselbe dunkle Holzrahmen-Button wie
alle anderen Boxen auf dem Screen, nur mit `box-shadow: 0 0 14px rgba(216,192,106,0.22)` als
einzigem Aktivitäts-Signal — kein Farbflächen-Kontrast. Das Studio hat genau dieses Problem an
anderer Stelle bereits gelöst: `.bugreport-entry-cta` (`styles/bug-report.css`, Kommentar direkt
im Code: „Chef-Befund 23.08.2026: 'Diese Zeile sieht nicht aus wie ein Button.'“) nutzt einen
vollflächigen Gold-Gradient mit dunkler Schrift — sichtbar als „REPORT"-Knopf in
`uidev-mainmenu-1920b\04-panel-options-b.png`. Exakt dieses Muster fehlt an der Stelle, an der ein
Spieler überhaupt erst ins Spiel eintritt.

### 2.2 Rechtes Formularpanel hat keinerlei Rahmen/Ornament — bricht mit der Sidebar-Bildsprache
**Screenshot:** `kontaktbogen-02-erstellung-vs-sidebar.png`.
**Ursache:** `.creation-panel` (`styles/creation.css`) hat KEIN `border-image`, keinen Goldrand,
keine Eckornamente — nur eine flache, zu 50 % schwarz übermalte `bg_tileable_wood.webp`-Fläche,
randlos bis zum Bildschirmrand. Im direkten Vergleich mit der Sidebar (sichtbarer
Holz-9-Slice-Rahmen `wooden_frame_with_corners_seamless.webp`, warme Textur, klare Kastenkontur —
dieselbe Asset-Datei wird an anderer Stelle im selben CSS-File sogar für den `.creation-start`-
Button verwendet, aber nicht für das Panel selbst) wirkt die Creation-Formularseite wie ein
unfertiger Platzhalter statt wie der erste große, sorgfältig gestaltete Spielmoment. Zum Vergleich:
selbst die simplen Hauptmenü-Panels (New/Load/Options) BEKOMMEN diesen Rahmen
(`.menu--war-table .menu-panel`) — die Charaktererstellung fällt damit sogar hinter den Rest des
eigenen Hauptmenüs zurück.

### 2.3 Portrait-Auswahl: Erstkontakt sind winzige, kaum unterscheidbare Thumbnails
**Screenshot:** `uidev-mainmenu-1920b\06-creation-name-filled-b.png` (Filmstreifen) vs.
`08-creation-portrait-gallery-b.png` (Modal „Alle anzeigen") — Kontaktbogen 4, erstes vs. zweites
Bild.
Der Standard-Filmstreifen zeigt Portraits bei ca. 60×60 px — bei dieser Größe ist praktisch nicht
erkennbar, welchen Look ein Portrait hat (Rüstungstyp, Geschlecht, Waffe verschwimmen). Der
eigentlich gute, klar erkennbare Modus (großes Grid im „Alle anzeigen"-Modal) ist hinter einem
Extra-Klick versteckt — der ERSTE Eindruck der Portraitauswahl ist der schwache, nicht der starke.
Für einen Moment, der eigentlich Vorfreude erzeugen soll („das wird MEIN Held"), ist das zu klein
dimensioniert.

### 2.4 Zwei-Farbwelten-Bruch zwischen linker Vitrine und rechtem Formular
**Screenshot:** `kontaktbogen-02-erstellung-vs-sidebar.png`, erstes/zweites Bild.
Die linke Seite (Charakter-Vitrine) ist nahezu reines Schwarz, die rechte Seite (Formular) ein
wärmeres, aber ebenfalls sehr dunkles Braun — beide Hälften wirken wie zwei separat gebaute Boxen,
die nur durch eine 2px-Goldlinie getrennt sind, nicht wie eine zusammenhängende Szene. Kein
gemeinsamer Verlauf, keine geteilte Vignette, kein Licht, das von einer Seite zur anderen führt.

### 2.5 (kleiner) Divider-Ornament kaum sichtbar
**Screenshot:** `uidev-mainmenu-1920b\05-creation-empty-b.png`, oben links unter „← BACK TO MENU".
Das „◆ ◆ ◆"-Trennzeichen über der Portrait-Vitrine ist so kontrastarm, dass es im Screenshot fast
untergeht — wirkt vergessen statt gestaltet. Kleinster Punkt auf dieser Liste, aber symptomatisch
für die insgesamt zu zurückhaltende Ornamentik dieses Screens.

### Positiv-Kontrast (zum Maßstab-Vergleich wichtig)
Die drei Stil-Karten (Melee/Ranged/Magic, Schritt 3) sind das mit Abstand am besten gestaltete
Element auf beiden Screens: großformatige, klare Waffen-Icon-Kunst, eindeutiger aktiver Zustand
(Haken + Goldrahmen), kurze prägnante Texte. Siehe `10-creation-style-magic-b.png` /
Kontaktbogen 4, drittes Bild. Das ist der Qualitätsmaßstab, an dem der Rest des Screens (Name-Feld,
Portrait-Strip, CTA-Button, Panel-Rahmen) gemessen werden sollte — dort ist die Lücke am größten.

---

## 3. Vorschläge

### Kleiner Aufwand, großer Hebel
1. **„Begin Adventure" auf das `.bugreport-entry-cta`-Muster ummünzen** (Gold-Gradient-Fläche,
   dunkle Schrift, `disabled` = ausgegraut). Das Muster existiert bereits 1:1 im selben Repo
   (`styles/bug-report.css`) — reines CSS-Umhängen, kein neues Asset nötig.
2. **Load-Game-Grid an die tatsächliche Item-Zahl koppeln** statt fester 5-Spalten-Regel bei
   wenigen Saves (z. B. `justify-content: start` + `grid-template-columns: repeat(auto-fit,
   minmax(...))`, oder das Panel bei < 3 Saves schmaler/linksbündig rendern). Verhindert den
   „das Spiel wirkt kaputt"-Ersteindruck direkt nach dem ersten eigenen Spielstand.
3. **Einen der vier Hauptmenü-Buttons visuell als Primary hervorheben** — z. B. New Game (kein
   Save vorhanden) bzw. Load Game/Continue (Save vorhanden) mit derselben Gold-Fläche wie oben,
   die anderen drei bleiben in der aktuellen Ghost-Optik als Sekundäraktionen.
4. **Portrait-Filmstreifen-Chips vergrößern** (von ~60px auf ~90–100px, dafür ggf. 1–2 Chips
   weniger sichtbar mit Scroll) — macht die Erstauswahl auf Anhieb lesbar.

### Größerer Umbau
1. **`.creation-panel` an die Sidebar-/Menü-Panel-Bildsprache angleichen**: denselben
   `wooden_frame_with_corners_seamless.webp`-Rahmen wie `.menu-panel` bekommen, plus eine wärmere,
   weniger stark abgedunkelte Textur (analog `texture-leather.webp` aus dem Menü-Panel statt der
   aktuellen 50%-Schwarz-Überlagerung von `bg_tileable_wood.webp`). Größte Einzelmaßnahme, um
   Charaktererstellung optisch auf Sidebar-Niveau zu heben.
2. **Hauptmenü-Gesamtkomposition überarbeiten**: Aktionsfläche höher/größer ansetzen (z. B. Logo
   verkleinern oder as Ganzes weiter nach oben schieben), damit die 2×2-Kommandotafel nicht nur
   das untere Drittel einnimmt, oder eine führende Lichtachse/Vignette einbauen, die den Blick vom
   Logo direkt zum Hauptbutton lenkt.
3. **Linke/rechte Hälfte der Charaktererstellung visuell verschmelzen** (gemeinsamer Verlauf oder
   ein durchgehendes Vignetten-/Lichtelement über beide Seiten), statt zwei per Trennlinie
   geklebter Boxen.

---

## 4. Einschätzung — die drei stärksten Hebel

1. **„Begin Adventure" (und allgemein: die eine Hauptaktion pro Screen) bekommt die bereits im
   Spiel vorhandene Gold-Fill-CTA-Optik.** Größtes Aufwand/Wirkung-Verhältnis: Muster und Assets
   existieren schon, es fehlt nur die Anwendung an der wichtigsten Stelle im Spiel — dem Moment,
   in dem ein zahlender Kunde überhaupt erst hineinfindet.
2. **Der Load-Game-Leerflächen-Bug** (Abschnitt 1.1). Das ist der Screenshot, der am ehesten wie
   ein technischer Defekt aussieht statt wie ein bewusst gestalteter leerer Zustand — und er trifft
   JEDEN Spieler nach dem ersten eigenen Spielstand, nicht nur einen Randfall.
3. **`.creation-panel` bekommt einen echten Rahmen/eine echte Textur** (Abschnitt 2.2 / 3, großer
   Umbau Punkt 1). Die Charaktererstellung ist der Screen mit dem größten Abstand zum
   „Ashen Iron"-Maßstab der Sidebar — ausgerechnet der Screen, der laut Chef am stärksten Spieler
   abschreckt. Die Stilkarten (Abschnitt „Positiv-Kontrast") beweisen, dass das Studio diese
   Qualität kann; sie fehlt hier nur an der Panel-Hülle drumherum.
