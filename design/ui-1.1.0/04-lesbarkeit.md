# Lesbarkeit & Textskalierung — Audit für 1.1.0

Auftrag: Sidebar-Befund des Chefs ("Woodcutting" bricht zu "Woodcutti"/"ng") einordnen,
Ursache finden, und einen Mechanik-Vorschlag für dynamische Schriftskalierung liefern.
Fokus: kleine Auflösungen (1366×768, 1600×900), NICHT oberhalb 1920×1080. Sprachen: Deutsch
und Russisch (längste Wörter), plus gezielte Nachprüfung in Englisch (das ist die Sprache des
gemeldeten Wort-Bruchs). Keine Code-Änderungen — dies ist ein reiner Befundbericht.

**Bindende Chef-Regel für jeden Vorschlag unten:** Es gibt eine Mindestgröße; darunter wird
umgebrochen oder umpositioniert — **niemals abgeschnitten**.

## Methodik

1. `apps/client/ui-audit/clip-audit.mjs` gelaufen bei 1366×768, 1600×900, 1920×1080 × {de, ru},
   Port 5344, vollständiger Szenensatz (49 Szenen: Menü, Charakter, alle Skill-Seiten, Kampf,
   Bank, Shop, Quests, New Haven, Mail, Optionen …). Ergebnis unter
   `apps/client/ui-audit/clip-audit-runs/lesbarkeit-1.1.0/` (`report.md`, `findings.json`,
   Screenshots je Szene unter `shots/<sprache>-<auflösung>/`).
2. **Unabhängig davon** jeden Screenshot der Hauptbildschirme mit eigenen Augen durchgesehen
   (nicht nur die vom Tool markierten) — genau die Gegenprobe, die der Auftrag verlangt, weil das
   Werkzeug nachweislich schon einmal 0 Funde bei sichtbar abgeschnittenem Text gemeldet hat.
3. Für die Sidebar zusätzlich ein eigenes, gezieltes Diagnose-Skript gefahren (gleiches
   Fundament wie `bot.mjs`/`clip-audit.mjs`, `sim-harness.mjs`, ausschließlich Port 5344,
   sequenziell, eine Seite pro Lauf) — weil der Chef-Befund sich im Ausgangszustand nicht
   reproduzieren ließ und ich wissen musste, unter welcher Bedingung er auftritt, bevor ich einen
   Mechanik-Vorschlag machen kann. Details siehe Abschnitt „Sidebar" unten.
4. Alle Screenshots, auf die unten verwiesen wird, liegen zusätzlich kuratiert unter
   `G:\GameDev\design\ui-1.1.0\shots\lesbarkeit\` (nummeriert, gleiche Reihenfolge wie im Text).

---

## 1. Sidebar (Chef-Befund) — vollständige Ursachenanalyse

### 1.1 Was die Messung fand

`clip-audit.mjs` meldet für die Sidebar **0 Funde**, in jeder Sprache, bei allen drei
Auflösungen. Kein overflow-clip, kein line-clamp, kein Container-/Viewport-Überlauf.

### 1.2 Was die Augen im Ausgangszustand fanden

Im Standardzustand (Sidebar-Breite 240px, das ist der Default aus `uiPrefs.ts`,
`SIDEBAR_WIDTH_DEFAULT = 240`) bricht **nichts** — bei keiner der drei Auflösungen, in keiner der
drei geprüften Sprachen. Bildbeleg:

- `05-sidebar-en-breite240-standard-ok.png` — Englisch, 1366×768, Breite 240px: WOODCUTTING,
  JEWELCRAFTING, RUNECRAFTING passen einzeilig.
- `14-sidebar-ru-1366x768-standardbreite-ok.jpg` — Russisch, 1366×768: sogar die längsten
  Einzelwörter (СОБИРАТЕЛЬСТВО, РУНОТВОРЧЕСТВО, ЮВЕЛИРНОЕ ДЕЛО, je 14 Zeichen) passen einzeilig.
- `15-sidebar-de-1366x768-standardbreite-ok.jpg` — Deutsch, 1366×768: JUWELIERSKUNST (14 Zeichen,
  das längste deutsche Label) passt einzeilig.

Das heißt: **der exakte Chef-Befund reproduziert NICHT einfach durch "Fenster ist 1366×768".**
Messung und Ausgangszustands-Sichtprüfung stimmen hier überein — beide sagen "sauber". Das war
der Anlass, tiefer zu graben, statt den Befund als "schon erledigt" abzuhaken.

### 1.3 Reproduktion — unter welcher Bedingung der Bruch wirklich auftritt

Die Sidebar hat SEIT Task #291 einen Zieh-Griff: Breite frei einstellbar von 64–420px
(`SIDEBAR_WIDTH_MIN`/`MAX` in `apps/client/src/renderer/util/uiPrefs.ts:26-28`), persistiert
in `localStorage` unter `gr.sidebarWidth` und wirkt über eine CSS-Variable `--sb-scale`
(`Sidebar.tsx:92-97`, `applySidebarWidth`). Ich habe diesen persistierten Wert gezielt auf
verschiedene Breiten gesetzt und die immer gleiche aktive Seite (`jewelcrafting`, das längste
einzelne Wort im Englischen) angesteuert. Ergebnis, Englisch, 1366×768:

| Sidebar-Breite | Ergebnis |
|---|---|
| 240px (Standard) | Alles einzeilig, keine Auffälligkeit |
| 200px | WOODCUTTING passt noch einzeilig — **aber** `JEWELCRAFTING` läuft ohne Lücke direkt in die Levelanzeige: `JEWELCRAFTING24/99` (Bild 10) |
| **170px** | **`WOODCUTTI` / `NG`** — exakt der vom Chef gemeldete Bruch, roh, ohne Trennstrich (Bild 6, Zoom in Bild 7) |
| 150px | Flächendeckend: `COMB`/`AT`, `WOODCUT`/`TING24/99`, `FORAGI`/`NG24/99`, `JEWELCRA`/`FTING24/99` … praktisch jedes Label betroffen (Bild 11) |
| 130px | Noch schlimmer, 3-zeilige Rohbrüche (`SKILLS`/`OVERVI`/`EW`), Icon-Rail-Kollaps (Schwelle ≤120px Containerbreite) greift hier noch NICHT (Bild 12) |

**170px liegt mitten im normalen, vom Spiel erlaubten Ziehbereich** (64–420px) — kein Rand-, kein
Extremfall. Ein Spieler auf einem kleinen 1366×768-Bildschirm zieht die Sidebar sehr plausibel
genau in diese Zone, weil er Platz für den Inhaltsbereich gewinnen will. Das erklärt, warum der
Chef den Bruch gesehen hat, obwohl der Standardzustand sauber ist: **die Breite ist gespeichert,
bildschirmunabhängig, und es gibt keinerlei Sicherheitsnetz, das ein Zurückrutschen in eine
lesbare Zone erzwingt.**

Wichtiger Befund zur Auflösung selbst: der Bruch hängt **nicht an der Fensterhöhe/-auflösung**,
sondern rein an der Sidebar-BREITE. Bei identischer Breite (170px) und 1920×1080 statt 1366×768
bricht "WOODCUTTING" **exakt gleich** (Bild 13). Die Auflösungsabhängigkeit, die der Chef
beschreibt, ist also eine Verhaltens-Korrelation (kleine Bildschirme → Spieler zieht enger), keine
CSS-Media-Query-Abhängigkeit — was für den Fix relevant ist: eine reine `@media`-Lösung nach
Fensterbreite würde diesen Fall NICHT abdecken, weil das Fenster dabei beliebig groß sein kann.

### 1.4 Warum genau DIESER Bruch entsteht (kaputtes Sicherheitsnetz)

`.sb-skill-name` (`apps/client/src/renderer/styles/sidebar.css:995-1032`) trägt bereits ein
mehrstufiges Anti-Clipping-Konzept aus einer früheren Fixrunde ("1.0.1"):

```
white-space: normal;
overflow-wrap: anywhere;
hyphens: auto;
text-wrap: balance;
```

Die Absicht (laut Code-Kommentar dort): zuerst sauber nach Silben trennen (`hyphens: auto`,
`<html lang>` wird korrekt pro Sprache gesetzt, `I18nProvider` → `applyDocumentLocale`,
`i18n/index.tsx:36-54`), und nur wenn das nicht reicht, roh umbrechen (`overflow-wrap: anywhere`)
als letzte Notbremse.

**Das ist genau die Stelle, die für Englisch nicht greift.** Direkter Vergleich, gleiche
Komponente, gleiche Breite (170px), gleiche Auflösung (1366×768), nur die Sprache unterscheidet
sich:

- Englisch: `WOODCUTTI` / `NG` — kein Trennstrich (Bild 7).
- Deutsch: `HOLZ-FÄLLEN`, `DIEBES-KUNST`, `JUWELIERS-KUNST`, `RUNEN-KUNST`, `KRÄUTER-KUNDE` — sauber
  mit Trennstrich (Bild 8).
- Russisch: `ДРЕВО-РУБСТВО`, `КУЗНЕЧ-НОЕ ДЕЛО`, `ЗЕМЛЕ-ДЕЛИЕ`, `СОБИРА-ТЕЛЬСТВО`,
  `ЮВЕЛИР-НОЕ ДЕЛО`, `РУНОТВОР-ЧЕСТВО` — ebenfalls sauber mit Trennstrich (Bild 9).

`hyphens: auto` funktioniert in diesem Electron/Chromium-Build für Deutsch UND Russisch in der
Sidebar, aber **nicht für Englisch** — obwohl `html[lang]` korrekt auf `en-US` steht. Das deckt
sich mit einem bereits vorhandenen (aber anders gelagerten) Befund im Code selbst:
`character.css:1844` dokumentiert einen Fall, in dem `hyphens: auto` für Russisch in einer sehr
kleinen 39×39px-Box NICHT griff ("kein greifendes Russisch-Silbentrennwörterbuch"). Meine Messung
zeigt: in der geräumigeren Sidebar-Box greift Russisch sehr wohl — Chromiums Silbentrennung
scheint vom verfügbaren Platz UND von der Sprache abzuhängen, und Englisch ist in diesem Build in
BEIDEN von mir getesteten Kontexten (Sidebar, Attribut-Karte: `DEXTERI`/`TY` ohne Trennstrich,
sichtbar in Bild 6 links unten) die Sprache, die nie einen Trennstrich bekommt. Für die
englischsprachige Mehrheit der Spielerschaft ist das bestehende Sicherheitsnetz also im
wichtigsten Fall wirkungslos — genau der Fall, den der Chef gemeldet hat.

Wenn `hyphens: auto` nicht greift, bleibt nur `overflow-wrap: anywhere` — das bricht *irgendwo*,
ohne Rücksicht auf Silben, kombiniert mit `text-wrap: balance` (das versucht, die Zeilenlängen
auszugleichen, nicht die Wortgrenze zu respektieren). Ergebnis: `WOODCUTTI`/`NG`.

### 1.5 Zweite, eng verwandte Ursache: keine reservierte Lücke zur Levelanzeige

Unabhängig vom Zeilenumbruch selbst: `.sb-skill-level` (rechts positioniert,
`sidebar.css:1054`ff., `right: calc(12px * var(--sb-scale-eff))`) und der rechte Innenabstand von
`.sb-skill-name` skalieren zwar beide mit `--sb-scale-eff`, aber bei ~190–210px Sidebar-Breite
reicht der verbleibende Puffer nicht mehr, um Name und Levelzahl sauber zu trennen — auch wenn der
Name selber noch einzeilig passt. Ergebnis: Wort und Zahl berühren sich ohne Lücke
(`JEWELCRAFTING24/99`, Bild 10). Kein Zeichen fehlt, aber es ist genauso schlecht lesbar wie ein
Umbruch mitten im Wort, und tritt in allen drei Sprachen auf (`SCHMIEDEN24/99`,
`РЫБАЛКА24/99` bei entsprechender Breite).

### 1.6 Warum die Breite überhaupt nicht "mitskaliert"

Das ist die Kernlücke, die den Chef-Wunsch ("dynamisch genug skalieren") unerfüllt lässt: die
Sidebar hat **zwei** Skalierungsachsen, aber nur EINE davon reagiert automatisch auf irgendetwas:

- `--sb-scale` — die Breite. Wird **ausschließlich** durch manuelles Ziehen am Rand-Handle
  gesetzt (`Sidebar.tsx:106-132`, `handleResizeStart`) und in `localStorage` persistiert. Der
  CSS-Default ist ein fixer Wert (`sidebar.css:18`, `width: 240px`) — **komplett unabhängig von
  der Fenster-/Bildschirmbreite.** Ob das Fenster 1366px oder 3840px breit ist: die Sidebar
  startet immer bei 240px, bis der Spieler sie manuell ändert.
- `--sb-vscale` — die Höhe. Reagiert automatisch über eine reine `@media (max-height: 1100px)`-
  Regel (`sidebar.css:437-441`) und komprimiert bei knapper Fensterhöhe Schriftgröße/
  Button-Höhe/Icon-Größe gemeinsam auf 0,72×. Das trifft alle drei geprüften Auflösungen
  gleichermaßen (768/900/1080 sind alle ≤1100px hoch) — ist aber eine Höhen-, keine
  Breiten-Reaktion, und hätte "Woodcutting" nie retten können, weil das Problem horizontal ist.

Es gibt also bereits eine funktionierende Automatik-Infrastruktur (Media-Query → CSS-Variable →
`calc(... * var(--sb-scale-eff))` überall in der Datei) — sie ist nur an die falsche Achse
angeschlossen. Genau dieses Muster (inklusive `container-type: inline-size` auf `.sidebar`
selbst, `sidebar.css:44-46`, aktuell nur für den Icon-Rail-Kollaps ab ≤120px Containerbreite
genutzt) ist der naheliegende Ansatzpunkt für einen Fix — siehe Mechanik-Vorschlag am Ende.

---

## 2. Automatisierter Messlauf — Zusammenfassung

Voller Report: `apps/client/ui-audit/clip-audit-runs/lesbarkeit-1.1.0/report.md`.

| Auflösung | Funde (de) | Funde (ru) |
|---|---:|---:|
| 1366×768 | 0 | 5 |
| 1600×900 | 0 | 0 |
| 1920×1080 | 0 | 0 |

Alle 5 Russisch-Funde bei 1366×768, zwei Ursachen-Gruppen:

- **G001 · `.cs-slot-empty-label`** (Charakterbogen, leerer Werkzeug-Slot in der Ausrüstungspuppe,
  3 Fundstellen: `character-equipment`, `character-item-tooltip`, `character-equip-tooltip`) —
  Kriterium "ueberdeckt" (y-Achse), `Инструмент` → sichtbar nur `Инструме`, 4,2px (9%) von einem
  Nachbar-Slot verdeckt. Bereits als bekannter, nicht CSS-lösbarer Fall in `character.css:1830-1855`
  dokumentiert ("Zelle ist für dieses Wort schlicht zu klein, unabhängig vom Feinschliff").
- **`menu-load` · `.hf-btn__face`** (2 Fundstellen, "Laden"-Knopf auf den Speicherstand-Kacheln im
  Hauptmenü) — Container-Überlauf x-Achse, 4px (4%), Text `Загрузить` minimal breiter als sein
  Knopf. Geringfügig (`minor`), aber real.

Das Werkzeug selbst schätzt alle 5 Funde als **gering** ein (nichts kritisch/deutlich) — deckt
sich mit dem visuellen Eindruck (kleine Überstände, kein Totalverlust von Information).

---

## 3. Was die Augen fanden, das die Messung NICHT fand

Das ist der Teil, den der Auftrag ausdrücklich verlangt hat ("ein grüner Messwert ist kein
Beweis"). Zwei klare Fälle, beide **nur** durch Sichtprüfung gefunden, beide vom automatisierten
Lauf mit "0 Funde" quittiert:

### 3.1 Deutsch: "Werkzeug"-Slot bricht in 3 Rohzeilen bei 1366×768 (Tool: 0 Funde)

Gleiche Komponente wie der oben vom Tool gefundene russische Fall
(`.cs-slot-empty-label`, leerer Werkzeug-Slot, Charakterbogen → Ausrüstung), diesmal auf
Deutsch, **1366×768**: `WER` / `KZEU` / `G` — drei Zeilen, kein Trennstrich, das Wort ist mitten
im Buchstaben "KZEUG" nochmal gebrochen (Bild 1). Bei **1600×900** in identischem Spielzustand
löst sich das sauber: `WERK-ZEUG`, zwei Zeilen, mit Trennstrich (Bild 2) — ein weiterer Beleg,
dass genau die vom Chef genannten kleinen Auflösungen die Schmerzgrenze markieren, hier sogar
mit demselben Wort in derselben Zelle.

Warum die Messung das übersah: der automatisierte Lauf bewertet Überlappung nur, wenn ein
FREMDES Element per `elementFromPoint` nachweislich über dem überstehenden Text liegt (Kriterium
F, "ueberdeckt"). Bei 1366×768 landet die dritte Zeile ("G") knapp im Zellen-Zwischenraum, ohne
exakt auf einem Nachbar-Icon zu liegen — für das Kriterium unsichtbar, für das Auge trotzdem
hässlich und schwer lesbar.

### 3.2 Russisch: "Lager erweitern"-Kachel — Text läuft unter den Preis-Knopf, NUR bei 1366×768 (Tool: 0 Funde)

Bank-Seite, Kachel "Lager erweitern" (`BankPage.tsx:438-457`, Klassen `.shop-upgrade-card` /
`.shop-upgrade-text`, `pages.css:4561-4583` + `.bank-page`-Override `pages.css:5246-5266`).
Russischer Text `Расширить хранилище банка` wird bei 1366×768 vom danebenliegenden
Kaufen-Knopf (`+10 ячеек · 5 000`) **sichtbar überdeckt**: `Расширить` verliert sein `ь`,
`хранилище` sein `е` (Bild 3 — Zoom, deutlich sichtbar an der harten Kante, wo die Buchstaben
unter die Knopf-Box laufen). Bei **1600×900**, identischer Spielzustand, ist genug Breite da:
derselbe Text steht sauber daneben, ohne Überlappung (Bild 4).

Root Cause (Code-Lektüre): `.shop-upgrade-text` ist selbst `display: flex` (Icon + Text als
Flex-Kinder) innerhalb der äußeren `.shop-upgrade-card` (ebenfalls `display: flex`,
`justify-content: space-between`, kein `flex-wrap`). Das `min-width: 0`, das nötig wäre, damit der
Text unter seine intrinsische Breite schrumpfen und zuverlässig umbrechen kann, ist zwar auf dem
**Container** gesetzt (`.bank-page .shop-upgrade-text { min-width: 0; }`, `pages.css:5258`), aber
nicht auf dem TEXTKNOTEN selbst — der liegt als anonymes Flex-Item direkt im selben Flex-Kontext
wie das Icon-Medaillon. Bei sehr wenig verfügbarer Breite reicht das nicht, um den Text zuverlässig
unter dem fest positionierten Knopf zu halten; der Knopf (`min-width: 0` auf Bank-Seite, aber sein
Inhalt "+10 ячеек · 5 000" hat trotzdem eine harte Mindestbreite) gewinnt den Platzkonflikt, der
Text wird von ihm überdeckt statt selbst weiter umzubrechen oder die Karte höher zu machen.

Warum die Messung das übersah: dieselbe Erklärung wie oben — die Überlappung ist real
(`elementFromPoint` würde sie technisch auch treffen können), aber der Fund tauchte in dieser
konkreten Szene/diesem Sichtbereich nicht im automatisierten Lauf auf. Das unterstreicht, dass
auch ein prinzipiell greifendes Kriterium nicht jede Instanz zuverlässig einsammelt — ein Grund
mehr, Screenshots aktiv zu prüfen statt der Fundliste allein zu vertrauen.

### 3.3 Übrige Bildschirme

Sidebar-Nachbarschaft (Charakterbogen, Bank, Shop, Quests, Mastery, Achievements, New Haven,
Optionen) auf Deutsch und Russisch bei allen drei Auflösungen sonst unauffällig durchgesehen —
Silbentrennung greift dort zuverlässig (z. B. `ОТКРЫ-ТЫЕ`/`ЗАКРЫ-ТЫЕ`-Filter auf der
Erfolge-Seite, `GE-SCHICK`/`KONSTI-TUTION`/`INTELLI-GENZ`/`WEIS-HEIT` auf den Attribut-Karten
des Charakterbogens), keine weiteren rohen Wortbrüche oder Überdeckungen gefunden.

---

## 4. Wo Messung und Augen auseinandergingen — Zusammenfassung

| Fall | Messung | Augen | Auflösung |
|---|---|---|---|
| Sidebar, Standardbreite 240px | 0 Funde | sauber, kein Bruch | Übereinstimmung |
| Sidebar, gezogen auf 170px | *(vom Standardlauf nicht erfasst — kein Testfall)* | `WOODCUTTI`/`NG`, roh, kein Trennstrich | — |
| `.cs-slot-empty-label` "Инструмент" (RU) | 1 Fund, "ueberdeckt" | bestätigt, 3-zeilig+verdeckt | Übereinstimmung |
| `.cs-slot-empty-label` "Werkzeug" (DE) | **0 Funde** | 3 Rohzeilen `WER`/`KZEU`/`G`, kein Trennstrich | **Divergenz** |
| `.shop-upgrade-text` "Расширить хранилище банка" (RU) | **0 Funde** | Text sichtbar unter Kaufen-Knopf verdeckt | **Divergenz** |

Zwei von fünf untersuchten Problemklassen wurden **ausschließlich** durch Sichtprüfung
gefunden. Das bestätigt die Warnung aus dem Auftrag: die Fundliste ist ein guter Ausgangspunkt,
aber kein Beweis für Abwesenheit von Bugs.

---

## 5. Mechanik-Vorschlag: dynamische Schriftskalierung

Ziel: der Chef-Satz "die Schrift soll dynamisch genug skalieren, dass diese Schriften dann
kleiner werden" statt zu brechen oder abzuschneiden — und die bindende Regel: Mindestgröße,
darunter Umbruch/Umpositionierung, **nie** Abschneiden.

### 5.1 Diagnose in einem Satz

Es gibt bereits eine funktionierende Skalierungs-Pipeline (`--sb-scale-eff`,
`calc(... * var(--sb-scale-eff))` überall in `sidebar.css`) — sie hängt nur an der falschen
Variable: an der Fensterhöhe (automatisch) und am manuellen Ziehen (Spieleraktion), aber **nicht**
an der tatsächlich verfügbaren Textbreite. Der Chef-Bug entsteht in genau der Lücke dazwischen.

### 5.2 Vorschlag A — Breite an den verfügbaren Platz koppeln, nicht nur an die Hand des Spielers

Der `.sidebar`-Container trägt schon `container-type: inline-size` (`sidebar.css:44-46`) und wird
schon per `@container sidebar (max-width: 120px)` abgefragt (Icon-Rail-Kollaps,
`sidebar.css:1305`, `gravewood-navigation.css:1011`). Denselben Mechanismus **eine Stufe früher**
greifen lassen: eine zusätzliche Zwischenstufe `@container sidebar (max-width: 210px)`, die NICHT
das Label versteckt (das tut erst die 120px-Schwelle), sondern gezielt

- die rechte Reserve vor der Levelanzeige vergrößert (behebt 1.5 / `JEWELCRAFTING24/99`), und
- unterhalb einer weiteren, engeren Schwelle (empirisch ~150–160px, dort wo der Rohbruch
  einsetzt) das Label-Feld zusätzlich in der Höhe freigibt (min-height des Buttons hoch genug für
  2 Zeilen) UND die Schrift geringfügig weiter absenkt, damit möglichst VIELE Wörter erst gar
  nicht zweizeilig werden müssen — Kleiner-statt-Umbrechen ist ja genau das, was der Chef will.

Das ist eine reine CSS-Ergänzung im selben Design-System (`--sb-scale-eff`-Familie), kein neuer
Mechanismus — sie schließt nur die Lücke, dass die bestehende Automatik nie auf die Breite des
tatsächlich gezogenen Zustands reagiert, egal wie schmal er wird.

### 5.3 Vorschlag B — Mindestgröße explizit und dokumentiert festlegen

Es gibt im Projekt bereits einen etablierten, an mehreren Stellen wiederverwendeten Bodenwert:
**9px** (`.sb-skill-name`, `.sb-skill-level`, `.cs-attr-card-name`, `:where(.cs-col-left)
.cs-attr-card-name` — alle floor bei 9px, mit demselben Begründungsmuster: "Schrift verkleinern
ist die letzte Wahl, nicht die erste, aber ein CSS-Fußboden gegen unlesbare Mini-Schrift").
Vorschlag: **9px als studio-weite, benannte Konstante** etablieren (z. B. eine CSS-Custom-Property
`--font-floor: 9px` in `base.css` neben `--font-head`), statt sie an jeder Stelle als
Magic-Number im `clamp()` zu wiederholen — spart künftigen Fixes das erneute "was war nochmal der
Bodenwert" und macht sichtbar, dass es sich um eine bewusste, studio-weite Design-Entscheidung
handelt, nicht um einen Zufallswert pro Komponente.

**Unterhalb von 9px wird NICHT weiter verkleinert** — ab da ausschließlich umbrechen (2. Zeile,
Button wird höher) oder umpositionieren (siehe 5.4). Das ist bereits die gelebte Praxis an den
genannten Stellen; der Vorschlag ist, sie zu benennen, nicht sie zu ändern.

### 5.4 Vorschlag C — Silbentrennung nicht als alleinige Notbremse verwenden

`hyphens: auto` ist nachweislich sprachabhängig unzuverlässig in diesem Chromium-Build
(Englisch: nie beobachtet; Russisch: abhängig vom verfügbaren Platz — funktioniert in der
Sidebar, versagt in der 39px-Werkzeug-Zelle). Es darf als ERSTE Wahl bestehen bleiben (kostenlos,
sprachrichtig, wenn es greift), aber die Notbremse dahinter sollte nicht `overflow-wrap: anywhere`
sein (bricht irgendwo, auch mitten im Wort, wie beim Chef-Fall gesehen), sondern
**`overflow-wrap: break-word`** — das bricht nur dort, wo es wirklich nötig ist (am Ende, wenn
sonst gar nichts passt), meist also erst NACH mehr Zeichen, was den Bruch "Woodcutti"/"ng" in
Richtung "Woodcuttin"/"g" oder besser verschiebt und in der Praxis oft überhaupt einzeilig lässt
(weil `break-word` das ganze Wort erst dann aufbricht, wenn selbst mit optimalem Zeilenumbruch
kein Platz mehr ist — `anywhere` bricht dagegen, sobald es für das Balancieren der Zeilen "besser"
aussieht, auch wenn es das gar nicht müsste, s. `text-wrap: balance`-Zusammenspiel oben).
Zusätzlich, nur für die nachweislich betroffenen Fälle (kurze, einsilbige Labels ohne
Trennwörterbuch-Erfolg wie `Strength`/`Woodcutting`): ein **manuelles weiches Trennzeichen**
(`&shy;`) an einer sinnvollen Stelle im Übersetzungsstring selbst (z. B. `Wood&shy;cutting`) — ein
gezielter, kuratierter Fallback für die Handvoll Wörter, bei denen der Browser nachweislich nie
selbst trennt, statt sich auf eine Wörterbuch-Funktion zu verlassen, die für genau die
Hauptsprache des Spiels nicht zuverlässig funktioniert.

### 5.5 Vorschlag D — Wo diese Technik überall gebraucht wird

Container-Query-getriebene Skalierung (Vorschlag A) plus `break-word`-Notbremse (Vorschlag C)
sollte an jeder Stelle greifen, die schon heute denselben `clamp(Xpx, ... * var(--sb-scale-eff
o.ä.), Ypx)` + `hyphens:auto`-Vertrag verwendet, namentlich (aus dieser Prüfung bekannt):

- `.sb-skill-name` / `.sb-skill-level` (Sidebar, dieser Bericht)
- `.cs-slot-empty-label` (Charakterbogen, leere Ausrüstungs-Slots — betrifft sowohl DE
  "Werkzeug" als auch RU "Инструмент", s. Abschnitt 2 und 3.1)
- `.cs-attr-card-name` (Charakterbogen, Attribut-Karten — funktioniert aktuell gut, aber am
  selben 9px-Boden, sollte bei einer zentralen `--font-floor`-Einführung mitgezogen werden)
- `.achv-ledger-*`-Filterlabels (Erfolge-Seite, bereits mit `hyphens:auto` abgesichert)
- `.shop-upgrade-text` (Bank/Shop-Ausbau-Kachel) — hier zusätzlich das `min-width: 0` auf den
  Textknoten selbst statt nur den Container legen (eigener eng gefasster Fix, kein reiner
  Skalierungs-/Schriftgrößen-Fall wie die anderen, s. 3.2)

---

## Anhang — Dateien

- Automatisierter Messlauf: `apps/client/ui-audit/clip-audit-runs/lesbarkeit-1.1.0/` (`report.md`,
  `findings.json`, `groups.json`, `scale.json`, Szenen-Screenshots je Sprache×Auflösung)
- Sidebar-Breiten-Diagnose (Rohdaten dieses Berichts): Screenshots kuratiert unter
  `G:\GameDev\design\ui-1.1.0\shots\lesbarkeit\` (01–15, s. Verweise oben)
- Relevante Quelldateien (nur gelesen, nicht verändert):
  `apps/client/src/renderer/components/Sidebar.tsx`
  `apps/client/src/renderer/styles/sidebar.css`
  `apps/client/src/renderer/styles/gravewood-navigation.css`
  `apps/client/src/renderer/styles/character.css`
  `apps/client/src/renderer/styles/pages.css`
  `apps/client/src/renderer/pages/BankPage.tsx`
  `apps/client/src/renderer/util/uiPrefs.ts`
  `apps/client/src/renderer/i18n/index.tsx`
