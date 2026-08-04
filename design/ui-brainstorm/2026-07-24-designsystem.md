# UI-Brainstorm 24.07.2026 — Perspektive: Visuelles Handwerk & Design-System (Citadel-Look)

Read-only Audit, keine Code-Änderungen. Basis: `apps/client/src/renderer/styles/*.css` (design-system.css,
combat.css, pages.css, topbar.css, options.css, sidebar.css, components.css, modals.css, interaction.css,
character.css, base.css) + Grep über `pages/**` und `components/**`. Jeder Befund zitiert die konkrete Datei/
Selektor-Stelle, die ich tatsächlich gelesen habe — keine Vermutungen ohne Beleg.

Format je Punkt: **Befund → Vorschlag → Aufwand (S/M/L) → Priorität (1=jetzt, 2=nächster Sprint, 3=Backlog)**

---

## 1. Button-Hierarchie und -Zustände

### 1.1 Zu viele parallele Button-Systeme ohne gemeinsame Rollen-Semantik
**Befund:** Mindestens 8 optisch unabhängige Button-Familien koexistieren: `.ds-button` (design-system.css,
9-Slice-Holzrahmen), `.combat-btn`/`.combat-btn.flee`/`.combat-btn.ghost` (combat.css, Sidebar-Banner-Asset),
`.shop-btn` (pages.css, flacher `var(--panel-hover)`-Kasten), `.bestiary-fight-btn` (pages.css, eigene
Sidebar-Banner-Kopie), `.it-action-btn` (components.css, dritte Sidebar-Banner-Kopie), `.sb-footer-*`
(sidebar.css, vierte 9-Slice-Variante), `.zone-back` (combat.css, fünfter flacher Stil), `.font-apply-btn`
(pages.css, sechster flacher Stil). Der Kommentar in `options.css:8-13` bestätigt das Problem bereits explizit
("`.lang-btn` hatte AUSSERHALB dieser Datei keine Basis-/Active-Styles … jeder Options-Button lief entweder
unsichtbar unstyled oder nur halbwegs gepatcht") — die Options-Seite wurde deshalb schon auf `.combat-btn`
konsolidiert, der Rest der App (Shop/Bank/Item-Wiki/Bestiary) aber nicht.
**Vorschlag:** Drei kanonische Rollen definieren — Primär (`.combat-btn`, Sidebar-Banner-Asset, ist bereits
der am weitesten verbreitete Stil), Sekundär (`.combat-btn.ghost`), Destruktiv (`.combat-btn.flee`) — und
`.shop-btn`, `.bestiary-fight-btn`, `.it-action-btn`, `.font-apply-btn` schrittweise darauf migrieren statt
sie als eigene Familien weiterzupflegen.
**Aufwand:** L (viele Fundstellen, aber rein additiv migrierbar)
**Priorität:** 2

### 1.2 Fertiger Citadel-Close-Button wird nirgends verwendet
**Befund:** `design-system.css:189-211` definiert `.ds-close-button` — einen vollständigen 4-State-Button
(`close_n/close_h/close_p/close_d.webp`) im Citadel-Look. Grep über alle `.tsx`-Dateien findet **0** Verwendungen.
Stattdessen nutzen alle 7 echten Modal-Schließen-Buttons (`ItemWikiModal.tsx`, `VariantPouchModal.tsx`,
`BugReportDialog.tsx`, `PortraitPickerModal.tsx`, `CombatPage.tsx`, `FarmPage.tsx`, `SkillsOverviewPage.tsx`)
die generische `.modal-close`-Klasse aus `modals.css:34-51` — ein flacher grauer 1px-Border-Kasten mit
Text-"×", der komplett aus dem 9-Slice-Holzrahmen-Look des umschließenden `.modal` (selbe Datei, Zeile 17-32)
herausfällt.
**Vorschlag:** `.modal-close` auf das `.ds-close-button`-Asset umstellen (oder den Selektor direkt ersetzen).
Sichtbarster Fix in dieser Liste: eine fertige Asset-Komponente existiert bereits, sie muss nur verdrahtet werden.
**Aufwand:** S
**Priorität:** 1

### 1.3 Vier unterschiedliche Disabled-Rezepte
**Befund:** `.ds-button[disabled]` → `opacity: 0.45` (design-system.css:170-174); `.shop-btn:disabled` →
`opacity: 0.4` (pages.css:67-70); `.it-action-btn:disabled` → `filter: grayscale(75%) brightness(0.6); opacity: 0.7`
(components.css:544-547); `.bestiary-fight-btn:disabled` → `filter: grayscale(0.7) brightness(0.55)`
(pages.css:1212-1215). Vier Buttons, vier verschiedene "das hier ist tot"-Signaturen — Spieler lernen das
Signal nie zuverlässig, weil es sich je nach Seite anders anfühlt.
**Vorschlag:** Eine gemeinsame Disabled-Mixin-Regel (`grayscale(0.6) brightness(0.6)`, kein zusätzliches
Opacity-Double-Dip) für alle Button-Familien aus 1.1 übernehmen.
**Aufwand:** S
**Priorität:** 2

---

## 2. Typografie-Hierarchie

### 2.1 Body-Basis ist fett UND größer als die eigene Design-System-Skala
**Befund:** `base.css:122-128` setzt `body { font-size: 21px; font-weight: 700; line-height: 1.45; }` —
**jeder** Fließtext im Spiel ist per Default fett. `design-system.css:50-57` definiert parallel eine
Font-Scale (`--ds-fs-xs 13 / sm 15 / base 18 / md 21 / lg 25 / xl 32 / 2xl 42`), deren eigener "base"-Wert
(18px) aber KLEINER ist als der tatsächliche Body-Basiswert (21px = `--ds-fs-md`). Ds-Buttons laufen mit
`--ds-fs-sm` (15px, design-system.css:124) — neben dem umgebenden 21px-fetten Fließtext wirken sie dünn/klein,
obwohl sie interaktive Elemente sind und eher mehr Gewicht bräuchten als Text.
**Vorschlag:** `--ds-fs-base` auf den echten Body-Wert (21px) synchronisieren, damit die Skala wieder stimmt;
mittelfristig Body-Basisgewicht auf 500/600 zurückfahren und 700 gezielt Überschriften/Labels vorbehalten,
damit Fettung wieder ein Hierarchie-Signal ist statt Grundrauschen.
**Aufwand:** L (globale Wirkung, braucht Sichtprüfung auf vielen Screens)
**Priorität:** 3 (hohe Wirkung, aber riskant so kurz vor 0.2.0/Store-Push — nichts zum Ship-Blocker machen)

### 2.2 Uppercase+Letter-Spacing ist die einzige Hierarchie-Sprache, auf jeder Ebene gleich eingesetzt
**Befund:** Seiten-Titel (`.content-header h1`, topbar.css:770-790), Panel-Titel (`.opz-section-title`,
options.css:122-128; `.bank-col-title`, pages.css:176-186), Zeilen-Header (`.ds-section-header`,
design-system.css:259-274), Button-Labels (`.ds-button`, design-system.css:107-129; `.sb-skill-name`,
sidebar.css:848-885) und sogar einzelne Werte-Chips (`.itip-badge`, components.css:1132-1145) nutzen
alle `text-transform: uppercase` + `letter-spacing: 0.3–2px`. Der einzige Unterschied zwischen "das ist die
Seitenüberschrift" und "das ist ein Zeilen-Label" ist die Font-Size — die Groß-/Kleinschreibung selbst
transportiert keine Ebene mehr.
**Vorschlag:** Uppercase auf maximal 2 Ebenen begrenzen (Seiten-Titel + Panel-Titel); Zeilen-/Chip-/Badge-
Labels auf Sentence-Case umstellen, damit Uppercase wieder ein bewusstes Signal ("das ist eine Kopfzeile")
statt Standardformatierung ist.
**Aufwand:** M
**Priorität:** 3

### 2.3 Zwei Font-Assets sind kaputt bzw. tot
**Befund:** `CormorantGaramond-Regular.woff2` (fonts-Ordner) ist nur **13,9 KB** groß — zum Vergleich:
`IMFellEnglishSC-Regular.woff2` 57 KB, `MedievalSharp-Regular.woff2` 22 KB für ähnlich komplexe Display-Fonts.
13,9 KB deutet stark auf ein beschädigtes/stark subgesetztes File hin (fehlende Glyphen). Nur referenziert
in `FontPreview.tsx:8` (Dev-Tool, nicht live sichtbar) — deckt sich mit dem bekannten Backlog-Punkt "kaputte
Cormorant-Fonts". Zusätzlich liegt `Cormorant-Regular.ttf` (299 KB, andere Familie "Cormorant" statt
"Cormorant Garamond") komplett unreferenziert im selben Ordner (kein `@font-face`, kein Treffer in `.tsx`).
**Vorschlag:** Cormorant-Garamond-woff2 durch eine vollständige Datei ersetzen (Google Fonts liefert ~30-40 KB)
oder den Eintrag aus `FontPreview.tsx` entfernen, bis ersetzt; tote `Cormorant-Regular.ttf` löschen (Aufräumen,
kein Risiko — nichts referenziert sie).
**Aufwand:** S
**Priorität:** 3 (nur Dev-Tool betroffen, keine Live-Sichtbarkeit)

---

## 3. Spacing-Rhythmus und Ausrichtung

### 3.1 Die eigene Spacing-Skala wird praktisch nirgends benutzt
**Befund:** `design-system.css:43-48` definiert `--ds-gap-xs/-sm/-/lg/-xl` (4/8/12/20/32px). Grep über alle
31 Style-Dateien nach `var(--ds-gap` findet Treffer **ausschließlich in design-system.css selbst** — die
Skala wird von keiner anderen Datei referenziert. Parallel dazu liefert ein Grep nach rohen
px-Gap-/Padding-Deklarationen **929 Treffer über 31 Dateien** (z. B. `.opz-section` padding:18px 20px,
options.css:93; `.bank-head` padding:11px 16px, pages.css:112; `.status-legend` padding:12px, pages.css:712 —
alle drei sind funktional derselbe "Holzrahmen-Panel"-Zweck, mit drei verschiedenen Innenabständen).
**Vorschlag:** Neue Panels verpflichtend auf `--ds-gap-*` umstellen; als Zwischenschritt die 5-6 häufigsten
Panel-Padding-Muster (Holzrahmen-Panel, Zeilen-Reihe, Karten-Grid-Gap) auf die bestehende Skala runden.
**Aufwand:** L (aber rein additiv/inkrementell durchführbar, kein Big-Bang nötig)
**Priorität:** 2

### 3.2 TopBar-Titel-Zentrierung ist strukturell fragil
**Befund:** `.content-header h1` (topbar.css:770-790) ist `position:absolute; left:50%` exakt auf die Mitte
von `.content-header-row` gepinnt. Die beiden flankierenden Blöcke sind aber NICHT symmetrisch:
`.header-charinfo` (links) hat `max-width: 26%` (topbar.css:669), `.game-stats` (rechts) hat `max-width: 30%`
(topbar.css:831). Bei ungleich langen Inhalten (langer Spielername links + aktiver Slayer-Chip rechts,
`.gamestats-slayer-chip` topbar.css:1117-1130) bleibt der Titel zwar mathematisch mittig, der optische
Schwerpunkt der ganzen Bar kippt aber sichtbar zur volleren Seite. Der Code-Kommentar (topbar.css:336-346)
zeigt, dass dies bereits mind. einmal (#233) nachgebessert wurde.
**Vorschlag:** Die beiden max-width-Werte auf denselben Wert angleichen (z. B. beide 28%), oder langfristig
auf ein echtes 3-Spalten-Grid (`1fr auto 1fr`) umstellen, das automatisch symmetrisch bleibt statt per
Handwert austariert zu werden.
**Aufwand:** M
**Priorität:** 3

### 3.3 Auto-Fill-Grids ohne Spalten-Cap erzeugen Restzeilen-Lücken
**Befund:** `.monster-grid` (combat.css:100-104, `repeat(auto-fill, minmax(150px, 1fr))`), `.bestiary-grid`
(pages.css:826-830, `minmax(340px, 1fr)`) und `.zone-grid` (combat.css:120-124) haben keine feste
Spaltenanzahl — bei bestimmten Fensterbreiten bleibt die letzte Zeile mit 1-2 Karten übrig, die dann über die
volle `1fr`-Breite gestreckt werden und dadurch überproportional groß neben den vollen Zeilen wirken.
Die Memory-Notiz "Combat-Gegnerauswahl-Layout: 4 Spalten (Chef-Update)" zeigt, dass für Monster-Karten
bereits eine feste Spaltenzahl gewünscht ist — im CSS steht aber weiterhin `auto-fill`.
**Vorschlag:** Auf feste Spaltenzahlen mit Breakpoints umstellen (z. B. 4/3/2 statt `auto-fill`), damit die
letzte Zeile nie unkontrolliert gestreckt wird.
**Aufwand:** M
**Priorität:** 3

---

## 4. Rahmen/Panels — Citadel-Look-Rollout

### 4.1 Zonen-Auswahlkarten sind der sichtbarste noch nicht migrierte Screen
**Befund:** `.zone-card` (combat.css:126-148) ist weiterhin ein flaches `border: 1px solid var(--border);
border-radius: 8px; background: var(--panel);` — kein 9-Slice-Holzrahmen. Direkt daneben in derselben Datei
sind `.dungeon-progress` (combat.css:592-611), `.paragon-preview-card`/`.monster-card-level-badge`
(combat.css:1084-1107) längst auf `border-image: wooden_frame_with_corners.webp` umgestellt. Die
Zonenauswahl ist die erste Seite, die praktisch jeder Spieler nach der Charaktererstellung sieht — sie ist
der auffälligste verbliebene "alte" Screen.
**Vorschlag:** `.zone-card` auf dasselbe border-image-Rezept wie `.bestiary-card`/`.dungeon-progress`
umstellen (9-Slice-Rahmen + `bg_black.webp`-Textur statt `var(--panel)`).
**Aufwand:** M
**Priorität:** 1 (höchster Sichtbarkeits-Impact aller Rahmen-Befunde)

### 4.2 Legacy-Options-CSS bleibt als totes Parallel-System geladen
**Befund:** `pages.css:1291-1518` (`.options-page`/`.opt-*`) ist ein komplettes zweites Options-Layout neben
`options.css` (`.opz-page`/`.opz-*`). Der Kommentar in `options.css:8-11` nennt es explizit "dead weight,
left for the CEO to prune later". Solange beide Klassenfamilien im Bundle liegen, ist jede künftige
Options-Änderung anfällig dafür, versehentlich die falsche (alte, Stein/Kasten statt Holz) Familie zu treffen.
**Vorschlag:** Prüfen (Grep über `.tsx`), ob `.opt-*` noch von einer Komponente referenziert wird; wenn nicht,
den kompletten Block aus `pages.css` entfernen. Reines Housekeeping, senkt Drift-Risiko für den nächsten
Options-Task.
**Aufwand:** S
**Priorität:** 2

### 4.3 Eingebettete Controls fallen aus dem Holzrahmen-Kontext ihres eigenen Panels heraus
**Befund:** `.modal` (modals.css:17-32) trägt konsequent den 9-Slice-Holzrahmen — aber Controls direkt darin
bleiben flach: `.onboarding-skip` (modals.css:136-146, reiner Text-Button ohne jede Textur),
`.ib-search`/`.ib-select` (pages.css:1618-1647, 1px-Border-Boxen). Innerhalb eines aufwendig gerahmten
Holz-Modals wirken diese Controls wie aus einer anderen App eingefügt.
**Vorschlag:** Zumindest die spielrelevanten Fälle (`.onboarding-skip`, sichtbar für jeden neuen Spieler) an
`.combat-btn.ghost` angleichen. Dev-Tool-Controls (`.ib-*`) haben niedrigere Priorität.
**Aufwand:** S
**Priorität:** 3

---

## 5. Farbdisziplin

### 5.1 Rarity-Farbkollision: magic und superRare sind identisch
**Befund:** `components.css:93,95` — `--rar-magic: #5b8fd6;` und `--rar-superRare: #5b8fd6;` sind **exakt
derselbe Hex-Wert**, obwohl der Kommentar direkt darüber (components.css:80-89) sie als zwei bewusst
getrennte Tiers beschreibt ("magic = Legacy-Tier, kein neues Content" vs. "superRare = mittlere/gehobene
Ausrüstung — Hauptband"). Jeder Border/Glow/Tooltip-Rahmen, der sich aus `--rar-*` speist (z. B.
`.item-cell.rarity-magic`/`.rarity-superRare`, components.css:163-168; `.inv-slot.rarity-*.filled`,
components.css:306-311), macht Legacy- und Hauptband-Items farblich ununterscheidbar.
**Vorschlag:** `--rar-magic` auf einen erkennbar anderen (entsättigten/dunkleren) Blauton setzen, z. B.
`#4a6d99`, damit Legacy-Items optisch "älter/blasser" statt gleichwertig zu superRare lesen. Trivialer Fix,
eine Zeile.
**Aufwand:** S
**Priorität:** 1 (verwirrt Spieler direkt bei der Item-Bewertung — trivialer Aufwand für den Fix)

### 5.2 Zwei fast identische, aber nicht identische "Gold"-Token-Systeme
**Befund:** `base.css:59` definiert `--gold: #d8c06a`, App-weit dominant genutzt (Sidebar-Titel,
Topbar-Titel, Item-Namen …). `design-system.css:9-11` definiert parallel `--ds-gold-bright: #f0dca0`,
`--ds-gold: #d8b870`, `--ds-gold-dim: #a07840` — nur von `ds-*`-Komponenten genutzt. `#d8c06a` vs. `#d8b870`
unterscheiden sich nur in G/B um 6-8 Werte — nebeneinander (z. B. `.content-header h1` direkt über einem
`.ds-button`) ist der Unterschied klein, aber bei genauem Hinsehen sichtbar: kein einheitliches "Gold" mehr.
**Vorschlag:** `--ds-gold*` auf die App-weite `--gold`/`--accent`-Basis aliasen statt eine zweite,
unabhängige Palette zu pflegen.
**Aufwand:** S
**Priorität:** 2

### 5.3 Bronze/Sepia-Tonfamilie ist über 7 unabhängige Variablen zersplittert
**Befund:** `--accent: #9a8060`, `--accent-2: #b39468`, `--accent-dim: #5a4a30` (base.css:55-57) plus
`--ds-bronze-bright: #d8904a`, `--ds-bronze: #b86030`, `--ds-bronze-dim: #7a3c18`, `--ds-parch-muted: #806840`
(design-system.css:13-14,28) — 7 verschiedene "gedämpftes Braun/Bronze"-Werte ohne erkennbare gemeinsame
Stufung; `--ds-bronze*` ist deutlich wärmer/oranger als das kühlere Sepia von `--accent*`. Erschwert es an
neuer Stelle, die "richtige" Nuance zu wählen, ohne einen weiteren Ton zu erfinden.
**Vorschlag:** Eine gemeinsame Bronze-Stufenskala (4-5 Stufen hell→dunkel) definieren, auf die sowohl
`--accent*` als auch `--ds-bronze*` als Aliase verweisen.
**Aufwand:** M
**Priorität:** 3

### 5.4 `--danger` trägt drei unterschiedliche Bedeutungen gleichzeitig
**Befund:** `--danger: #a85a52` (base.css:58) wird verwendet für (a) echte Fehlermeldungen
(`.game-alert`, pages.css:574-583), (b) destruktive Bestätigung (`.combat-btn.flee:hover`, combat.css:1289-1293;
`.sb-footer-quit:hover`, sidebar.css:1090-1097) und (c) unerfüllte Item-Anforderungen
(`.itip-req-unmet`, components.css:1336-1340). Ein einziger Rot-Ton für "das schadet dir", "das ist
unwiderruflich" und "das erfüllst du nur noch nicht" nimmt dem Spieler die Möglichkeit, rein farblich
zwischen Fehler/Warnung/offene Anforderung zu unterscheiden.
**Vorschlag:** Ein separates `--warn`/`--unmet`-Token einführen (wärmeres Amber — das System hat mit
`#d9a86b` bereits eine "voll/Warnung"-Farbe im Einsatz, z. B. `.slots-display.full`, pages.css:92-94) statt
`--danger` für alles Nicht-Erfolgreiche zu recyceln.
**Aufwand:** M
**Priorität:** 3

---

## 6. Icon-Sprache

### 6.1 Skill-Emoji-Fallback-Map ist 4-5-fach dupliziert statt zentral
**Befund:** `MasteryPage.tsx:52-63`, `SkillsOverviewPage.tsx:18-38`, `ItemWikiModal.tsx:22-37`,
`Onboarding.tsx:46-62` und teilweise `ItemTooltip.tsx:120-123` definieren JEWEILS ihre eigene, fast
identische Emoji-Fallback-Liste (woodcutting: 🪓, smithing: 🔨, thieving: 🗝️, herblore: 🧪, attack: 🎯,
defence: 🛡️, ranged: 🏹 …). Diese Emoji greifen nur, wenn `getSkillIcon`/`getSidebarIcon`/`getUiIcon` kein
PNG findet (das Fallback-Pattern selbst ist sauber gebaut, siehe `SkillsOverviewPage.tsx:41-67`) — die
Duplikation selbst ist aber Wartungslast: 5 Stellen, die synchron bleiben müssen, sonst driften Emoji
zwischen Screens auseinander.
**Vorschlag:** Eine zentrale `SKILL_EMOJI_FALLBACK`-Konstante exportieren (z. B. in `skillIcons.ts`), alle
5 Stellen importieren daraus statt eigener Kopien.
**Aufwand:** S
**Priorität:** 2

### 6.2 Zwei Achievement-Kategorien haben laut eigenem Code-Kommentar noch keine echten Icons
**Befund:** `AchievementsPage.tsx:49` — Kommentar: "Echte PNG-Icons je Kategorie (exploration/meta haben
noch keine Art → Emoji-Fallback)". `CATEGORY_UI` (Zeile 50-59) listet 7 Kategorien mit echtem `icon_*`-Asset,
`exploration` (🧭) und `meta` (⭐) fehlen. Sichtbarer Bruch der "echte Icons"-Standing-Rule ausgerechnet auf
der Achievements-Seite, die Spieler regelmäßig besuchen (jede Sammel-Prämie triggert einen Blick dorthin).
**Vorschlag:** 2 fehlende Kategorie-Icons (Kompass für exploration, Stern/Medaille für meta) als
Asset-Bedarf an den Chef melden — reines Content-/Art-Gap, kein UI-Codeproblem.
**Aufwand:** S (nur Meldung — Umsetzung liegt bei der Asset-Pipeline)
**Priorität:** 2

### 6.3 Schließen-Symbol bleibt Text-Glyph statt Icon (dieselbe Stelle wie 1.2)
**Befund:** `.modal-close` (modals.css:34-46) rendert ein reines "×"-Zeichen als Inhalt statt eines Icons —
während der Rest der App konsequent auf Bild-Assets für Symbolik umgestellt wurde (`.locked-icon-img`,
components.css:8-17, ersetzt explizit "🔒 emoji across all pages"; `.ui-icon`-Pattern app-weit). Löst sich
automatisch mit, sobald 1.2 (`.ds-close-button`-Umstellung) umgesetzt ist — hier separat gelistet, weil es
strikt genommen ein Icon-Sprache-Verstoß und kein reines Button-Zustand-Problem ist.
**Vorschlag:** Siehe 1.2.
**Aufwand:** S (identisch mit 1.2, kein Zusatzaufwand)
**Priorität:** 1

---

## 7. Fokus-/Tastatur-Sichtbarkeit

### 7.1 Solide globale Basis vorhanden — aber nicht lückenlos
**Befund:** `interaction.css:41-55` liefert bereits einen sauberen, gut dokumentierten globalen Gold-Ring
für `:is(button, a, input, select, textarea, summary):focus-visible` sowie `[role="button"]:focus-visible`.
Das ist eine gute Grundlage, die in vielen anderen Projekten fehlt — hier ausdrücklich als Positivbefund
vermerkt, nicht nur als Lücke.
**Vorschlag:** Keiner nötig, nur als Kontext für 7.2/7.3.
**Aufwand:** —
**Priorität:** —

### 7.2 Klickbare `<div>`s ohne `role="button"`/`tabIndex` sind für Tastatur komplett unerreichbar
**Befund:** `.bestiary-drop` (`BestiaryPage.tsx:636-642`) ist ein `<div onClick={...}>` ohne `role="button"`
und ohne `tabIndex` — das Element ist nicht Teil der Tab-Reihenfolge, kein Fokusring kann greifen, weil es
gar nicht fokussierbar ist. Das ist kein reines Politur-Thema mehr, sondern eine echte
Tastatur-Erreichbarkeitslücke: der Drop-Chip öffnet das Item-Wiki-Modal, das per Maus jederzeit erreichbar
ist, für reine Tastaturnutzung aber nicht. Vermutlich sind weitere `cursor:pointer`-`<div>`s im selben Muster
betroffen (z. B. `.dungeon-loot-chip:not(.undiscovered)`, combat.css:344-350 — hier nicht am Code verifiziert,
aber gleiches Risiko).
**Vorschlag:** Grep-Audit über alle `onClick`-tragenden `<div>`/`<span>` ohne begleitendes `role="button"` +
`tabIndex={0}` + `onKeyDown`(Enter/Space); wo ein echter `<button>` möglich ist, direkt dorthin migrieren
(einfacher als role/tabIndex/onKeyDown von Hand nachzurüsten und bekommt Fokus-Ring + Cursor automatisch).
**Aufwand:** M (Umfang hängt vom Audit-Ergebnis ab, pro Fundstelle aber trivialer Fix)
**Priorität:** 2

### 7.3 Einzelne Komponenten heben den globalen Fokusring per höherer Spezifität wieder auf
**Befund:** `.ib-search:focus` (pages.css:1629-1632, Dev-Item-Browser) setzt `outline: none; border-color:
var(--accent);` — Klasse+Pseudoklasse hat höhere Spezifität als das globale `:is(input):focus-visible`
(interaction.css:47-50) und gewinnt daher, obwohl es dieselbe Eigenschaft (`outline`) betrifft. Dev-Tool,
daher niedrige Priorität, aber ein Beispiel für das generelle Muster: überall dort, wo ein Selektor mit
Klassen-Spezifität `outline: none` setzt, ohne selbst eine sichtbare Fokus-Alternative zu liefern, wird der
globale Ring lokal unsichtbar.
**Vorschlag:** Grep nach `outline: none` außerhalb von `interaction.css`/den bewusst eigenständigen Fällen
(`.cs-attr-card:focus-visible`, character.css:1304-1310, die den Ring korrekt durch einen eigenen box-shadow-
Ring ersetzt) und je Fundstelle prüfen, ob eine sichtbare Alternative existiert.
**Aufwand:** S
**Priorität:** 3

---

## Zusammenfassung nach Priorität

**Priorität 1 (jetzt, alle S/M-Aufwand):**
- 1.2 / 6.3 — `.ds-close-button` verdrahten statt `.modal-close` (fertiges Asset ungenutzt)
- 4.1 — `.zone-card` auf 9-Slice-Holzrahmen umstellen (sichtbarster Screen)
- 5.1 — `--rar-magic`/`--rar-superRare`-Farbkollision auflösen (eine Zeile, verwirrt Spieler direkt)

**Priorität 2 (nächster Sprint):**
1.1, 1.3, 3.1, 4.2, 5.2, 6.1, 6.2, 7.2

**Priorität 3 (Backlog, teils bewusst zurückgestellt wegen Ship-Nähe):**
2.1, 2.2, 2.3, 3.2, 3.3, 4.3, 5.3, 5.4, 7.3

---

## Eingeordnete bekannte Punkte aus dem Brief

- **Kaputte Cormorant-Fonts:** verifiziert in 2.3 (Dateigröße 13,9 KB, stark subgesetzt) — nur Dev-Tool
  betroffen (`FontPreview.tsx`), kein Live-Risiko, daher P3.
- **Stein- vs. Holz-Beschluss:** `base.css:129-137` zeigt den Beschluss bereits korrekt umgesetzt — die
  App-Hintergrundwand ist bewusst Stein (`bg_tileable_stone.webp`, Chef-Entscheidung 2026-07-21), Panels
  sind Holz. Das ist **kein** Rest-Problem mehr auf App-Ebene. Der einzige verbliebene Stein-Rest ist
  strukturell (4.1, `.zone-card` nutzt noch `var(--panel)` statt Holzrahmen) — kein Wand/Panel-Konflikt,
  sondern schlicht eine noch nicht migrierte Karten-Komponente.
