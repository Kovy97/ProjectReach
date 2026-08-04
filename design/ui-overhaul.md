# UI/UX-Überholung — Test-Feedback des Chefs (Phasen)

Ziel: cooles, reaktives Idle-Game mit gut lesbarem, navigierbarem Interface. **Fokus jetzt: Melee-Combat + die
übrigen Skills.** Range/Magie-UI kommt später. Live testbar via `START-GAME.bat` (HMR).

## Phase 1 — Fundament: volle Breite/Höhe + Lesbarkeit ✅ (erledigt)
- Basis-Schrift 16,5 → **18,5px** + `line-height 1.4`.
- Breiten-Caps entfernt: Skills-Overview, Bestiarium → volle Breite; Statistik → responsives Grid (auto-fit, füllt Breite).
- Prinzip: Seiten-Container füllen `content-body`; Grids via `auto-fit/auto-fill minmax` nutzen die Fläche.
- **Folge-To-do:** restliche Seiten gegen „füllt Breite & Höhe" durchgehen; zu kleine Schriftgrößen (11–13px) anheben.

## Phase 1.5 — Sidebar-Redesign ✅ (erledigt, via Designer-Agent)
- Breiter (240→268px), **kollabierbare Sektionen** (lange Skills-Liste standardmäßig zu, aktive Sektion auto-offen),
  Helden-Karte (Name + Gesamtlevel-Badge), Nav-Labels 18px, klarer Active-State (Gold-Border/Glow), Hover.
- Sidebar bleibt nur in `MainLayout` gemountet (useGameState sicher, kein Menü-Crash). typecheck+build grün.
- Folge-Ideen (offen): Per-Skill-Level-Badges, Collapsed-State im Save persistieren, Icon-Rail-Modus, Aktiv-Training-Indikator.

## Phase 2 — Character Sheet komplett überarbeiten (CSS-Teil ✅, Attribut-Kacheln offen)
- ✅ Equipment-Slots groß (96px), Werte/+/--Buttons/Headings größer, Spalte breiter.
- ✅ Attribut-Sektion als große Kacheln (Abk. + großer Wert + Name + +-Button), responsives Grid.
- **Equipment-Slots deutlich größer** (Paperdoll prominenter, Item-Bilder groß).
- **Attribut-Sektion** neu: große, klar lesbare Werte + Namen + +/- Steuerung; nicht gedrängt.
- Schrift überall groß genug; klare Gruppierung (Identität / Ausrüstung / Werte / Inventar), volle Fläche.

## Phase 3 — Combat-UI ✅ (erledigt)
- ✅ „Details"-Button neben „Fight" je Monster-Karte (Aktions-Reihe).
- ✅ **Monster-Info-Modal**: großes Bild (168px), volle Werte (HP/Schaden/Treffer/Ausweichen/Def/Tempo/Regen),
  Traits (Wut/Inflict/Immunitäten), komplette Drop-Tabelle (Menge + Chance), „Besiegt N×", Fight-Button. Overlay schließt.
- ⬜ Folge: Drops im Modal/Card als Collection-Log (`???`) — siehe Phase 4.

## Phase 4 — Collection-Log-Drops ✅ (erledigt)
- State `seenDrops: Record<MonsterId, ItemId[]>` (SAVE_VERSION 18 + Migration); engine `drops.ts`
  (`hasDropSeen/markDropSeen/seenDropCount`). Combat markiert jeden erbeuteten Drop als entdeckt.
- UI: Monster-Karte & Modal zeigen **`?`/`???`** für unentdeckte Drops + Zähler „entdeckt/gesamt"; aufgedeckt = Icon/Name/Chance.
- Test `drops.test.ts` (3). Grün, Sim 0 Auffälligkeiten.

## Phase 5 — Iron als eigenständiges, volles Set (wie Kupfer/Bronze)
- content: 8 Waffen + 8 Rüstung (Eigenheiten wie Kupfer) + Forge-Rezepte + Iron-Set-Bonus; 5-Teiler ablösen.
- persistence: Migration alte iron_helm/body/legs/shield → neue IDs.
- assets: bereits ins Kupfer-Schema kopiert (17 PNGs); Namens-Unstimmigkeiten direkt beim Kopieren umbenannt.

## Phase 6 — Live-Test-Feedback (Session, alles grün)
- ✅ Lesbarkeit ENTSCHIEDEN hochgezogen: Basis 21px, alle Kleingrößen +~3px; **Schriftart global Cinzel**.
- ✅ Combat-Modul neu: 3-Spalten (Spieler|Gegner|Log), Fit ohne Scroll (Bild flext), Stats inkl. **Krit-Chance/-Schaden**
  unter den Kämpfern + Gegner-Drops, **Angriffs-Lunge** (90px) + große rote Schadenszahlen, **klickbare Drop-Icons** → Item-Tooltip.
- ✅ **Balance-Fix** (Agent-Spec): Combat-XP ×0,06 (war 113× zu schnell) + Frühgame-Verstärker (L1 ×2,5→L20 ×1,0).
- ✅ **Attribut-Punkte entfernt:** Erstellung nur Name+Bild; Werte aus Basiswert + Skills (Hybrid) + Items; keine Verteil-UI/Vergabe.
- ✅ Sidebar: **PNG-Icons** (Auto-Discovery, ~2,5× groß) + **50% breiter** (400px). Custom-**Scrollbar** im Ashen-Iron-Stil.
- ✅ Assets: Thieving-Aktions-Icons (neues System), 11 Item-Icons, 18 Sidebar-Icons, Iron-Vollset, Fisch, Fleisch.
- ⬜ Offen: Monster-Auswahlkarten-Feinschliff (Bild-Fokus), laufende Politur.

## Querschnitt (laufend)
- Reaktiver „Idle-Feel": klare States, Hover/Transitions, Toasts (schon da).
- Lesbarkeit > Dichte; konsistente Abstände; Theme „Ashen Iron" beibehalten.
