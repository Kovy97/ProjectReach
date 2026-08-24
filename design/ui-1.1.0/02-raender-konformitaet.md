# Ränder & UI-Konformität — Audit für 1.1.0

Auftrag des Chefs: "doppelte Ränder und sowas" finden — Stellen, wo gleichartige Elemente
unterschiedlich aussehen, und Stellen, wo Elemente Ränder übereinanderlegen. Reiner
Befundbericht, keine Code-Änderungen.

## Methodik (damit "hingesehen, nicht nur Code gelesen" nachprüfbar ist)

1. `apps/client/ui-audit/BOT-GUIDE.md` gelesen. Für die reine Navigation/Screenshots hätte
   `bot.mjs` gereicht, aber sein Vokabular hat **keinen** "lies computed style"-Befehl (nur
   `assert:` gegen `__hfDebug`, kein DOM-Zugriff). Für die getComputedStyle-Analyse, die der
   Auftrag ausdrücklich verlangt, habe ich deshalb ein eigenes, NICHT eingechecktes Wegwerf-Skript
   gebaut, das lesend auf `ui-audit/sim-harness.mjs` aufsetzt (dieselbe Dev-Server-/Fixture-/
   Ein-Seite-Infrastruktur wie `bot.mjs`) — ausschließlich Port **5342**, sequenziell, nie zwei
   Seiten gleichzeitig. Das Skript liegt zur Nachprüfbarkeit unter
   `design/ui-1.1.0/shots/raender-konformitaet/data/audit-script-used.mjs`.
2. Für jede der zwei Ziel-Auflösungen (1920×1080, 1600×900) 22 Szenen durchlaufen: Hauptmenü,
   Charaktererstellung, Charakter, Companions, Kampf-Zonenliste, Kampf-Zonendetail, aktiver Kampf,
   Bestiary, Mastery, New Haven, Shop, Bank (+ Item-Detail-Panel), Quests, Achievements, Stats,
   Skills-Overview, ein Skill (Mining), Enchanting — je Szene ein Screenshot **und** ein
   `getComputedStyle`-Scan aller sichtbaren Elemente mit Rand/Outline (Breite/Stil/Farbe je Seite,
   Radius, Outline, Hintergrundfarbe, Eltern-Vergleich für Doppelrand-Geometrie). Zusätzlich ein
   gezielter Hover auf eine Attribut-Karte (Tooltip) und ein Hover auf ein Bank-Item. Rohdaten:
   `design/ui-1.1.0/shots/raender-konformitaet/data/*.json` (40 Dateien, eine je Szene×Auflösung).
3. **Jeden Fund unten mit eigenen Augen im Screenshot bzw. im Kontaktbogen geprüft** — die
   Doppelrand-Geometrie-Heuristik allein produzierte etliche falsche Positive (z.B. Achievements-
   Filter-Tabs, die nur ein normales Segmented-Control sind); die wurden verworfen. Für die
   Knopf-/Eingabefeld-Vergleiche zusätzlich zwei Kontaktbögen per Python/PIL gebaut (mehrere Crops
   in ein Bild), wie beauftragt.
4. Für jede Zahl ("X verschiedene Breiten") den CSS-Quellcode gegengeprüft (`grep` über alle 56
   Style-Dateien), nicht nur geschätzt.
5. **Deckungslücken, ehrlich benannt:** Der Sidebar-"Spiel verlassen"-Bestätigungsdialog und das
   Bug-Report-Modal ließen sich im Automatik-Lauf nicht anklicken (Sidebar-Footer-Drawer braucht
   echtes Hover-Timing, Banner-Selektor griff nach der Zurück-Navigation nicht mehr) — für diese
   zwei Modale gibt es daher nur die CSS-Quelle, keinen eigenen Screenshot; sie sind unten explizit
   als "nicht bildlich geprüft" markiert und NICHT als eigene Befunde gezählt. Das Bank-Item-Panel
   (Klick auf ein Item) diente stattdessen als geprüftes Modal-Beispiel.

Alle referenzierten Bilder liegen unter `design/ui-1.1.0/shots/raender-konformitaet/`.

---

## Befund A — Sidebar-"Segen"-Kachel: echter verschachtelter Doppelrand (JEDER Bildschirm)

**Bildschirm:** alle — die Sidebar ist auf jeder Seite sichtbar, oben links.
**Selektor:** `div.sb-blessing-card` innerhalb `div.sb-brand.sb-blessing` innerhalb `aside.sidebar`.
**Datei+Zeile:** `apps/client/src/renderer/styles/sidebar.css:450-459` (`.sb-brand`, Stein-Hintergrund
+ `border-bottom: 2px solid #2a2318`) und `sidebar.css:475-491` (`.sb-blessing-card`, eigener
9-Slice-Holzrahmen `border-image-width: calc(4px * var(--sb-scale-eff))`).
**Screenshot:** `01-sidebar-blessing-doppelrahmen-zoom.png` (15×-Pixel-Zoom auf die Ecke, zeigt zwei
klar getrennte Kanten) + `02-sidebar-blessing-kontext.png` (Übersicht).
**Was man sieht:** Die Kachel hat eine dicke braune Stein-Umrandung (`.sb-brand`-Padding auf
Steintextur) und DARIN, mit sichtbarem Abstand, einen zweiten, dünneren Holzrahmen um das
Segens-Bild selbst — zwei optisch unterschiedliche Kanten direkt ineinander verschachtelt, exakt
das Muster, das der Chef mit "doppelte Ränder" meint. Per `getComputedStyle` bestätigt: das
DOM-Scan-Tool flaggt dieses Paar auf **allen 20 erfolgreich gescannten Szenen** (beide Auflösungen)
unverändert — es ist keine Einzelseite, sondern strukturell in jedem Sidebar-Rendering vorhanden.

---

## Befund B — Sidebar-Navigation vs. Topbar-Navigation: zwei Rahmen-Sprachen, dauerhaft nebeneinander

**Bildschirm:** alle — Sidebar (links) und Topbar (oben) sind IMMER gleichzeitig sichtbar.
**Selektor:** `.sb-skill-btn` (Sidebar-Einträge) vs. `.topbar-item` (Topbar-Einträge).
**Datei+Zeile:** `sidebar.css:798-802` — `border-image: url(".../button_new.webp") 90 150 90 150
fill / 18px 18px 18px 18px`. `topbar.css:151` — derselbe Asset, aber
`border-image: ... / calc(15px * var(--tb-scale))`.
**Screenshot:** `03-sidebar-nav-ornament.png` vs. `04-topbar-nav-ornament.png` (beide Crops aus
demselben Frame, `06-combat-zone-detail-voll-1920x1080.png`).
**Was man sieht:** Die Sidebar-Einträge sind einzelne Platten mit deutlich sichtbaren
Eck-Beschlägen (Metall-Ecken, klare Plattenkontur). Die Topbar-Einträge derselben Navigation
wirken dagegen wie ein durchgehendes Band mit dünnen Doppellinien-Pfeilern zwischen den Labels —
keine eigene Plattenkontur pro Button erkennbar. Beide nutzen zwar dasselbe Quell-Asset
(`button_new.webp`), aber bei unterschiedlicher `border-image-width` (18px fest vs. ~15px skaliert)
und unterschiedlichem Slice-Kontext wirkt es wie zwei verschiedene Bauteile für exakt dieselbe
Aufgabe (Seiten-Navigation) — und beide sind auf jedem Screenshot gleichzeitig im Bild.

---

## Befund C — Kampf-Monsterkarte: drei bis vier Knopf-/Feld-Sprachen in einem Widget

**Bildschirm:** Kampf → Zonendetail (der zentrale, meistgesehene Bildschirm des Spiels).
**Selektor:** `.combat-btn` (Fight) · `.ds-button.qty-picker-btn` (1×/25×/50×/∞-Presets) ·
`.qty-picker-input` (Custom-Amount-Feld) · `.ds-button.qty-picker-confirm` (Go) — alle vier in
JEDER einzelnen Monsterkarte direkt untereinander.
**Datei+Zeile:** `combat.css:3577-3592` (`.combat-btn`, `button_new.webp` 90/92/90/90 fill, 12px) ·
`components/QuantityPicker.tsx:93-142` (JSX) mit `quantity-picker.css:25-37`
(`.qty-picker-btn::before { border-width:6px; border-image-width:6px; }`, überschreibt
`.ds-button`s 10px) · `quantity-picker.css:55-65` (`.qty-picker-input { border: 1px solid
var(--border); border-radius: var(--radius); }`, plain, kein Rahmenbild).
**Screenshot:** `05-monsterkarte-knopf-mischmasch.png` (enger Crop) + `06-combat-zone-detail-voll-
1920x1080.png` / `06b-...-1600x900.png` (Kontext, Muster identisch bei beiden Auflösungen).
**Was man sieht:** Direkt übereinander: ein gerundetes, goldberietetes Prunk-Plättchen ("FIGHT"),
darunter vier kleine rotbraune Kästchen mit eigenen Eck-Klammern ("1×/25×/50×/∞"), darunter ein
flaches, dünn umrandetes Eingabefeld MIT sichtbarem nativem Browser-Spinner-Pfeil ("Custom
Amount"), und rechts daneben nochmal ein Holzrahmen-Knopf ("GO"). Vier unterschiedliche
Rand-Behandlungen auf identischer Höhe im selben kleinen Widget, das auf praktisch jedem Kampf-
Screenshot mehrfach nebeneinander steht (3 Karten × 1 Widget). Dasselbe Widget (`QuantityPicker`)
wird identisch in Bank und Shop wiederverwendet — der Bruch ist also nicht auf Combat beschränkt.

---

## Befund D — Charaktererstellung: eckige Holzrahmen direkt neben runden Flach-Rahmen

**Bildschirm:** Charaktererstellung (erster Bildschirm, den jeder neue Spieler sieht).
**Selektor:** `.creation-input` (Name-Feld) vs. `.creation-portrait-chip` (Portrait-Kacheln) vs.
`.creation-portrait-more-btn` ("Show All").
**Datei+Zeile:** `creation.css:312-330` (`.creation-input`, Holzrahmen 12px, `border-radius:0`) ·
`creation.css:365-371` (`.creation-portrait-chip`, `border: 2px solid rgba(216,192,106,0.16);
border-radius: 3px`) · `creation.css:396-410` (`.creation-portrait-more-btn`, Holzrahmen 8px,
`border-radius:0`).
**Screenshot:** `07-charaktererstellung-formular-zoom.png` + `08-charaktererstellung-voll-
1920x1080.png`.
**Was man sieht:** Das Namensfeld hat einen satten, eckigen Holzrahmen. Direkt darunter, in
derselben Formularspalte, haben die sieben Portrait-Kacheln dünne, RUNDE (3px-Radius),
halbtransparent-goldene Ränder — eine andere Randfarbe, eine andere Stärke UND ein anderer
Eckenradius (rund statt eckig) in derselben Formularzeile wie das Namensfeld darüber und der
"Show All"-Knopf daneben (der wieder eckig/holzgerahmt ist). Erster Eindruck des Spiels, drei
Randsprachen in einem Blickfeld.

---

## Befund E — Zwei verschiedene Tooltip-Familien für dieselbe Aufgabe

**Bildschirm:** Charakter (Attribut-Hover) vs. Bank/Inventar (Item-Hover).
**Selektor:** `.ct-tip` (CitadelTip, Attribut-Tooltip) vs. `.item-tooltip` (Item-Tooltip).
**Datei+Zeile:** `components.css:347-366` (`.ct-tip`, Holzrahmen **6px**) vs.
`components.css:321-331` (`.item-tooltip`, Holzrahmen **9px**) — dieselbe
`wooden_frame_with_corners_seamless.webp`-Textur, unterschiedliche Dicke.
**Screenshot:** `09-tooltip-attribut-cttip-zoom.png` vs. `10-tooltip-item-bank-voll-
1920x1080.png` (zeigt zusätzlich, dass der Item-Hover in der Bank tatsächlich ein GROSSES
Detail-Panel mit eigenem Rahmen öffnet, kein kleines Tooltip — noch ein drittes Format für
"Info bei Hover zeigen").
**Was man sieht:** Der Attribut-Tooltip (`ct-tip`) hat zusätzlich einen inneren Glow-Ring in der
Attributfarbe (Zitat CSS: "Glow bleibt exklusiv bei den Attributen") — das ist bewusstes Design,
liest sich aber in Kombination mit dem äußeren Holzrahmen selbst wie ein Doppelrand (Foto zeigt
zwei klar getrennte Kanten: Holzmaserung außen, scharfe Farblinie innen). Kein Bug, aber
zusammen mit Befund A ein zweites Beispiel, wo "Rahmen + Akzent-Ring" wie "zwei Rahmen" aussieht.

---

## Systemischer Befund F — Konformitäts-Zahlen (Codebasis, durch A–E visuell bestätigt)

Die Einzelfunde oben sind keine Ausreißer, sondern Symptome einer sehr breiten Streuung. Auszählung
über alle 56 Style-Dateien (`apps/client/src/renderer/styles/*.css`):

| Rahmen-Asset (dasselbe Bild!) | Einsatzstellen | Verschiedene `border-image-width`-Werte |
|---|---|---|
| `wooden_frame_with_corners_seamless.webp` (Citadel-Holzrahmen) | 206 | **14**: 2,3,4,5,6,7,8,9,10,12,14,16,18,20px |
| `nav-bronze-lipped-iron-9slice.webp` (Sidebar-Bronze-Rahmen) | 57 | **~15**, von 3px bis 16px, plus mehrere `clamp()`-Fließwerte |
| `button_new.webp` + Hover/Pressed-Varianten (Nav-/Kampf-Knöpfe) | 26 | **4**: 10px, 12px, 18px, `calc(15px*scale)` |

Dazu `border-radius` app-weit (`grep -c` über alle CSS): **0** (196×, Holzrahmen-Kontexte),
**`var(--radius)`=4px** (72×), **3px** (40×), **2px** (18×), **4px** literal (17×), **8px** (11×),
**10px** (6×), **6px** (5×), **5px** (5×), **9px** (3×), **7px** (2×), plus `var(--ds-radius-sm)`,
`var(--ds-radius)` und diverse asymmetrische Einzelwerte. Zwei Token existieren bereits
(`--radius: 4px` in `base.css:79`, `--ds-radius: 4px` in `design-system.css:38` — zufällig
identisch, aber getrennt gepflegt) und werden trotzdem an über 100 Stellen durch freihändige
Literalwerte umgangen.

**Code-Hygiene-Randnotiz (kein sichtbarer Fehler, computed style bestätigt die lebende Regel
gewinnt korrekt):** `combat.css` definiert `.zone-back` zweimal — Zeile 1140 (alter Plattenlook,
`border: 1px solid var(--border-bright)`) und Zeile 4554 (aktueller Holzrahmen, 6px, per Kommentar
bewusst so gewählt). Die zweite Regel gewinnt zuverlässig (per `getComputedStyle` verifiziert:
6px, transparente Randfarbe = Rahmenbild aktiv), aber die tote erste Regel bleibt eine Falle für
die nächste Person, die an dieser Klasse etwas ändert, ohne von der zweiten Definition zu wissen.

---

## Geprüft, aber sauber (damit die Suche nicht einseitig wirkt)

- **`border` + `outline` am selben Element:** über alle 20 gescannten Szenen × 2 Auflösungen kein
  einziger Treffer (`outl=0` durchgehend in den Rohdaten).
- **Charakterblatt** (`14-character-voll-1920x1080.png`): Ausrüstungs-Slots, Attribut-Kacheln,
  Inventar-Grid sehen intern konsistent aus — kein Fund hier.
- **Shop-Rahmenecke** (`13-shop-rahmenecke-referenz-gut.png`): ein sauberes Beispiel, WIE es
  aussieht, wenn ein einzelner Holzrahmen mit Eck-Ornament korrekt (nicht doppelt) gesetzt ist —
  als Referenz für den Kanon-Vorschlag unten.
- Die "CHOOSE AMOUNT"-Knöpfe im Shop sahen im Screenshot zunächst wie eine dritte
  Mengen-Optik aus; Code-Gegenprobe (`ShopPage.tsx:262-276`) zeigt: es ist dasselbe
  `QuantityPicker`/`.qty-picker-btn` wie in Combat/Bank — **kein eigener Fund**, nur andere Zahlen.

---

## Kanon-Vorschlag für 1.1.0

**Wie viele Rahmen sollte es geben?** Drei, klar getrennt nach Rolle statt nach Zufall:

1. **"Ornamentaler Citadel-Rahmen"** — EIN Asset (`wooden_frame_with_corners_seamless.webp`, das
   bereits an 206 Stellen lebt), auf **zwei** feste `border-image-width`-Stufen begrenzt statt 14:
   z.B. **8px** (Standard: Buttons, Panels, Tooltips) und **4px** (kompakt: kleine Preset-Chips,
   Badges). Jeder der anderen zwölf Werte (2,3,5,6,7,9,10,12,14,16,18,20px) wird beim nächsten
   Antasten der jeweiligen Datei auf die nächstliegende der zwei Stufen gerundet.
2. **"Nav-Chrome-Rahmen"** — `button_new.webp`, exklusiv für Sidebar+Topbar-Navigation (nicht für
   In-Content-Buttons wie Fight/Deposit/Confirm, die stattdessen Rahmen-Typ 1 bekommen sollten).
   Eine einzige Breite für beide Leisten (z.B. 16px), damit Sidebar und Topbar (Befund B) als EIN
   Bauteil-Paar statt zwei erkennbar sind.
3. **"Flacher Utility-Rahmen"** — `1px solid var(--border)` + `border-radius: var(--radius)`
   (beide Tokens existieren schon) für Eingabefelder, Suchleisten, Listenzeilen — NIE Holzrahmen
   in Formularkontrollen mischen (Befund D, C).

**`border-radius`:** auf die zwei bestehenden Fälle reduzieren — `0` (jedes Element mit
Rahmenbild/Ornament, per CSS-Zwang sowieso kompatibel) und `var(--radius)` (jedes Element mit
flachem 1px-Rand). `50%` für runde Icons/Avatare bleibt unverändert legitim. Der lange Schwanz aus
2/3/5/6/7/8/9/10px-Literalen entfällt ersatzlos.

**Am weitesten vom vorgeschlagenen Kanon entfernt (Priorität für 1.1.0-Politur):**

1. Die Sidebar-"Segen"-Kachel (Befund A) — verschachtelt zwei Rahmen-Ebenen, die niemand als
   "zwei Bauteile" lesen soll; einfachste Korrektur mit größter Sichtbarkeit (jeder Bildschirm).
2. `QuantityPicker` (Befund C) — vier Randsprachen in einem Widget, das app-weit (Combat/Bank/Shop)
   wiederverwendet wird; eine Korrektur hier behebt den Fund an ALLEN drei Orten gleichzeitig.
3. Charaktererstellung Portrait-Kacheln (Befund D) — einzige RUNDEN Ränder in einem sonst
   durchgehend eckigen Bildschirm, dazu noch erster Eindruck des Spiels.
4. Sidebar-vs-Topbar-Navigation (Befund B) — strukturell am teuersten zu vereinheitlichen (zwei
   ganze Komponenten), aber auch am dauerhaftesten sichtbar (jeder einzelne Screenshot des
   gesamten Sweeps zeigt beide gleichzeitig).
5. Tooltip-Familie (Befund E) — am wenigsten dringend, weil nur bei Hover sichtbar, aber am
   billigsten zu fixen (zwei CSS-Zeilen: `.ct-tip`/`.item-tooltip` auf dieselbe Breite bringen).
