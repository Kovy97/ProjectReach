# UI-Screenshot-Audit — Design & Checkliste

Teil des SIM-Agent-Toolkits. Die Engine-Personas (sim-personas.ts) prüfen **Logik/Balance/State**
headless. Dieses Dokument beschreibt den komplementären **UI-Audit**: das Ansteuern der React-Seiten
im Renderer und das Prüfen auf visuelle/i18n-Mängel.

> **Wichtig (Logic-Dev-Grenze):** Ich verifiziere ausschliesslich HEADLESS und starte **nie** Electron.
> Volle Renderer-Automation (Electron-Fenster fahren, echte Screenshots) gehört daher zu **ui-dev**.
> Dieses Dokument liefert das umsetzbare Design + eine harte Checkliste, plus einen *headless*
> Vorab-Filter, den die Engine schon heute liefern kann (siehe Abschnitt 4).

---

## 1. Was der Audit findet (Fehlerklassen)

| Klasse | Konkrete Symptome |
| --- | --- |
| **Fehlende Icons** | Broken-Image-Platzhalter, leere `<img>`, Emoji-Fallback statt echtem PNG (getSkillIcon/getSidebarIcon) |
| **Overflow / abgeschnittener Text** | `scrollWidth > clientWidth`, Ellipsis auf Buttons/Badges, umbrechende Zahlen in Stat-Zeilen |
| **Platzhalter-/Dev-Text** | „TODO", „FIXME", „Lorem", „placeholder", „undefined", „NaN", „[object Object]", roher key wie `skill.woodcutting.name` |
| **Unübersetzte Strings** | i18n-Key sichtbar statt Übersetzung; gemischte Sprache (DE-UI mit EN-Fragmenten); fehlende `de`/`en`-Variante einer LocalizedString |
| **Misalignment** | überlappende Boxen, Elemente ausserhalb ihres Containers, inkonsistente Abstände zwischen Karten |

---

## 2. Seiten- & Modal-Matrix (was ansteuern)

Reihenfolge = Sidebar-Navigation. Jede Zeile ist ein Audit-Ziel (Screenshot + DOM-Scan).

1. **Character-Sheet** — Portrait, 6 Attribute, abgeleitete Stats, Ausrüstungs-Slots (leer & belegt).
2. **Skills-Übersicht** — alle Skill-Kacheln, Icons, Level/XP-Balken.
3. **Skill-Detailseite** (je Skill) — Aktions-Liste, Kategorien-Gruppen, gate-gegraute Aktionen, Mastery-Balken.
4. **Combat** — Gegner-Listenkarten (max. 3 Spalten), Gegner-Stats/Drops, aktiver Kampf (HP/Mana-Bars, Combat-Log), Auto-Eat-Anzeige, Stil-/Stance-Auswahl.
5. **Bank** — volle & leere Bank, Slot-Zähler, „Slots kaufen"-Preis, Item-Grid.
6. **Shop** — Kauf-Liste mit Preisen, „nicht genug Gold"-Zustand.
7. **Inventar** — volle/leere Slots, Taschen-Slots, Tooltip beim Hovern (Item-Name, Bonus, Beschreibung).
8. **Quests** — Quest-Liste, Fortschritt, Belohnungs-Anzeige.
9. **Farming** — Plots (leer/wachsend/reif), Saatgut-Auswahl.
10. **Slayer** — Task-Anzeige, Slayer-Shop, Punkte.
11. **Settings** — alle Toggles, Sprachumschalter (DE↔EN → Seite muss komplett neu übersetzen).
12. **Modals/Tooltips** — Item-Tooltip, Bestätigungs-Dialoge, Level-Up-Toast, Drop-Toast, Charaktererstellung.

**Zustands-Matrix pro Seite:** (a) frischer Char (leer), (b) mid-game (viel Inhalt), (c) Grenzfälle
(volles Inventar, 0 Gold, max Level). Die drei Zustände lassen sich **deterministisch aus einem
`SimPlayer`-Snapshot** erzeugen (siehe unten) — so ist der UI-Audit reproduzierbar.

---

## 3. Ablauf (Scaffold-Design für ui-dev)

Empfohlener Stack: **Playwright** gegen den Vite-Dev-Server des Renderers (Browser-Modus, **nicht**
das Electron-Binary) — headless, CI-tauglich, deterministisch.

```
1. State-Fixtures bauen (headless, hier in der Engine):
   - Für jede Zustands-Variante einen SimPlayer fahren und `snapshot()` + serialisierten
     GameState exportieren (persistence.serialize). Ablage: design/qa/ui-fixtures/*.json
2. Renderer im Test-Modus starten:
   - Vite-Dev-Server; App liest ?fixture=<name> aus der URL und lädt den Save statt Hauptmenü.
3. Pro Ziel aus der Matrix:
   - page.goto(route + fixture)
   - await networkidle / Skeleton-weg
   - DOM-Scan (Abschnitt 5) ausführen → Findings
   - page.screenshot({ path }) für den visuellen Beleg
4. Findings in denselben Finding-Typ (sim-report.ts) mappen und mit den Engine-Findings
   zu einem Bericht mergen (formatFindingsMarkdown).
```

Der Renderer braucht dafür genau **einen** kleinen Test-Hook (`?fixture=`), den ui-dev ergänzt.
Solange der fehlt, bleibt der Audit beim Design + dem headless Vorab-Filter.

---

## 4. Headless Vorab-Filter (heute lieferbar, ohne Electron)

Ein grosser Teil der i18n-/Platzhalter-Klasse ist **ohne Renderer** über die Content-Daten prüfbar —
das fängt die häufigsten Textfehler vor dem teuren Screenshot-Lauf. Als Guard-Test umsetzbar
(content-refs.test.ts / content-integrity.test.ts sind die passenden Nachbarn — Ownership: content-dev):

- **LocalizedString-Vollständigkeit:** jede `{ en, de }` im Content hat beide Sprachen, keine leer.
- **Kein Platzhalter-Leak:** kein Content-String enthält `TODO/FIXME/Lorem/placeholder/undefined/NaN`.
- **Icon-Referenzen:** jede Item/Monster-Icon-Referenz zeigt auf eine existierende Asset-Datei
  (Auto-Discovery-Ordner) — fehlende Bindung = „fehlendes Icon" noch vor dem UI.
- **i18n-Key-Deckung:** jeder in `translations.ts` erwartete Key existiert in beiden Locales.

Diese vier laufen deterministisch/headless und sind das kostengünstige 80 % des Audits.

---

## 5. DOM-Scan-Checkliste (pro Seite, für den Playwright-Schritt)

```
[ ] Kein <img> mit naturalWidth === 0  (broken/fehlendes Icon)
[ ] Kein Emoji-Fallback, wo ein echtes PNG erwartet wird (Skill-/Sidebar-Icons)
[ ] Kein Element mit scrollWidth > clientWidth + 1  (Text-Overflow / abgeschnitten)
[ ] Kein sichtbarer Textknoten matcht /TODO|FIXME|Lorem|undefined|NaN|\[object Object\]/
[ ] Kein sichtbarer roher i18n-Key (Muster: wortteil.wortteil.wortteil ohne Leerzeichen)
[ ] Nach Sprachwechsel DE→EN: kein DE-Reststring auf der Seite (und umgekehrt)
[ ] Alle Karten/Buttons einer Liste haben gleiche Höhe (Misalignment-Heuristik)
[ ] Kein Kind ragt über die Bounding-Box seines Containers hinaus (overflow-Leak)
[ ] Zahlen sind gerundet/formatiert (kein 12.333333, kein -0)
[ ] Leerer Zustand hat einen Empty-State-Text (nicht nur eine leere Box)
```

---

## 6. Priorisierung der UI-Findings (Severity-Mapping)

- **P0** — App-Crash/weisser Screen, Interaktion blockiert, Datenverlust-Dialog.
- **P1** — sichtbarer roher i18n-Key, `undefined/NaN` im Text, fehlendes Icon auf Kern-Seite.
- **P2** — Text-Overflow/abgeschnitten, Misalignment, Sprach-Mix.
- **P3** — Abstands-/Politur-Kleinkram, leerer Empty-State ohne Text.

---

## 7. Umsetzungs-Status & nächster Schritt

- **Fertig (Logic-Dev):** Design, Seiten-Matrix, DOM-Checkliste, Severity-Mapping, headless
  Vorab-Filter-Spezifikation, gemeinsamer `Finding`-Typ (sim-report.ts) für den Merge.
- **Offen (Route an den Chef → ui-dev):**
  1. Renderer-Test-Hook `?fixture=<name>` (Save aus Fixture laden statt Hauptmenü).
  2. Playwright-Scaffold gegen den Vite-Dev-Server (kein Electron) inkl. der DOM-Scan-Checks aus §5.
  3. Optional: die vier headless Content-Guards aus §4 als Vitest im content-Paket (Ownership: content-dev).
