# Design-System-Rollout — den Sidebar-Look aufs ganze Spiel bringen (PLAN, Chef-Review)

> Ziel (Chef 2026-06-26): Die neue **Sidebar** ist der Stil-Anker. Ihren Look — ornamentierte Dark-Metal-
> Frames, Pergament-Panels, goldene Cinzel-Serifen-Caps, gerahmte Icons, klare Sektions-Unterteilungen,
> Button-Stil mit Eck-Ornamenten, Textur-Set, Embleme — auf **alle** Seiten ausrollen. Generell **größere
> Icons & Schrift** (Sichtbarkeit). Siehe Memory „Sidebar-Stil = Design-System".

## Strategie: erst Baukasten, dann Seiten
Nicht jede Seite einzeln neu erfinden, sondern **einmal ein Design-System extrahieren**, dann Seiten darauf
migrieren. So bleibt alles konsistent und der Aufwand pro Seite klein.

### Phase 0 — Design-System-Layer extrahieren (Fundament, 1×)
Aus der fertigen Sidebar die wiederverwendbaren Bausteine in eine eigene, dokumentierte CSS/Komponenten-
Schicht ziehen (z.B. `design-system.css` + kleine React-Wrapper):
- **Tokens (CSS-Variablen):** Gold/Bronze-Palette, Dunkelmetall-Stufen, Pergament-Töne, Border-/Glow-Farben,
  Radius, Spacing, Schriftgrößen-Skala (großzügig — Chef-Prinzip).
- **Texturen:** `bg_black/grey/copper`, `parchment.svg` als benannte Hintergrund-Utilities.
- **Komponenten/Klassen:**
  - `ds-frame` — ornamentierter Sektions-Rahmen (Eck-Brackets + Metall; später Kenney-9-Slice).
  - `ds-section-header` — Header mit Emblem-Slot + Cinzel-Caps-Titel + seitliche Embleme.
  - `ds-parchment-panel` — Pergament-Inhaltsfläche.
  - `ds-row` — gerahmtes Icon + Name + optional Progress-Bar + Wert rechts (wie Combat-Zeilen).
  - `ds-button` / `ds-icon-button` — großer Button mit rundem gerahmten Icon, Chevron, Aktiv = Bronze.
  - `ds-stat-pill`, `ds-badge` (Rarität/Level), `ds-emblem` (game-icons-Set, gold/rot tönbar).
  - `ds-footer-button` (Wachssiegel/Kompass-Stil).
- **Embleme-Set ausbauen:** game-icons (CC BY) sind eine riesige Bibliothek — pro Sektion ein passendes
  Emblem (Amboss=Smithing, Münze=Shop, Truhe=Bank, Buch=Bestiary, Trank=Herblore …), gleiche Pipeline
  (BG strippen, gold/rot tönen, als SVG).

### Phase 1–N — Seiten migrieren (nach Nutzungshäufigkeit/Sichtbarkeit)
Jede Seite = eine ui-dev-Aufgabe, die nur `design-system`-Bausteine verwendet. **Sequenziell** (eine Seite
zur Zeit besitzt `styles.css`, kein Clobber). Reihenfolge:

| Prio | Surface | Warum | Status |
|---|---|---|---|
| ✅ | **Sidebar** | meistgenutzt, Stil-Anker | fertig |
| 1 | **Top Bar** | immer sichtbar, gehört visuell zur Sidebar | offen |
| 2 | **Combat** | meiste Zeit beim Kämpfen | offen |
| 3 | **Skill-Seite** (Gathering/Crafting-Aktionen) | viel Zeit, viele Karten | offen |
| 4 | **Character-Sheet** | Kern-Identität, Paperdoll | offen (BG schon transparent) |
| 5 | **Skills-Overview / Mastery / Achievements** | kürzlich überarbeitet → auf DS umskinnen | offen |
| 6 | **Bank / Shop / City / Quests** | Wirtschaft/Hub | offen |
| 7 | **Stats / Options / Bestiary / Companions** | Neben-Seiten | offen |
| 8 | **Character-Creation** (+ neue Starter-Stil-Wahl) | First Impression → gleich im DS bauen | offen |
| 9 | **Main Menu / Save-Flow** | Rahmen ums Spiel | offen |
| — | Tooltips / Toasts / Modals | Querschnitt, am Ende vereinheitlichen | offen |

### Asset-Bedarf (einmalig, dann spielweit wiederverwendet)
- **9-Slice-Metallrahmen** (Kenney „Fantasy UI Borders", CC0) — der eine fehlende Baustein für pixel-genaue
  Frames; einmal einbinden → jede Sektion nutzt ihn. (Aktuell CSS-Approximation.)
- **Pergament**: prozedurales SVG vorhanden; optional gegen eine schönere CC0-Textur (ambientCG) tauschen.
- **Embleme**: nach Bedarf je Sektion aus game-icons ziehen (CC BY → Credits-Datei pflegen).
- Alles, was du (Chef) lieber selbst in ChatGPT malst, ersetzt die freien Assets 1:1 in denselben Slots.

## Leitplanken
- **Größer als bisher** (Icons & Schrift) bleibt Default — Chef-Prinzip.
- Jede migrierte Seite **cache-frisch grün** (typecheck + build) + manueller Sichtcheck.
- `styles.css` wird groß → in Phase 0 ggf. modularisieren (pro-Seiten-CSS-Dateien), damit parallele Arbeit
  später möglich wird; bis dahin **ein ui-dev pro `styles.css`-Zeitfenster**.
- Funktion nie brechen (Navigation/Aktionen/Toasts bleiben).
- i18n-Parität halten.

## Aufwand & Vorgehen
Großes, mehrteiliges Projekt. Vorschlag: **Phase 0 zuerst** (Fundament, 1 ui-dev-Runde) — danach Seiten in
Prio-Reihenfolge, je 1 ui-dev-Runde, zwischendurch Chef-Sichtchecks. Kein Big-Bang; inkrementell &
verifiziert. Parallel laufen unabhängige Nicht-UI-Stränge (Content/Balance) ungestört weiter.

## Offene Chef-Entscheidungen
1. **Reihenfolge ok?** (oder eine Seite vorziehen, z.B. Combat vor Top Bar?)
2. **9-Slice-Metallrahmen:** Kenney-CC0 ziehen, oder malst du eigene Frames?
3. **Wann starten:** sofort mit Phase 0, oder erst die laufenden Stränge (Starter-Stil-Feature) abschließen?
4. **Modularisierung von `styles.css`** jetzt mitnehmen (ermöglicht später parallele UI-Arbeit)?
