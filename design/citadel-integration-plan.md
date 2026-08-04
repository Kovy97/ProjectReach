# Citadel-Integration — das ganze UI auf „Citadel RPG GUI" (PLAN, Chef-Review)

> Chef (2026-06-26): Gekauftes Profi-Kit **Citadel RPG GUI** (GameDev-Market Pro License = volle kommerzielle
> Rechte). **Kein Kenney, kein `frame.png` mehr — nur noch Citadel, überall** (Buttons, Frames, alle Elemente).
> 673 sliced PNGs liegen unter `apps/client/src/renderer/assets/ui/citadel/` (Struktur = Kit-Ordner).
> Baut auf der modularen DS-Struktur aus Phase 0 auf (die `ds-*`-Klassen bleiben, nur ihre Texturen werden
> Citadel). Ersetzt die Asset-Quelle im `design-system-rollout-plan.md`.

## Was das Kit liefert (Kategorien)
- **Generische Frames (9-Slice):** `9-Slice Box 3/wooden_frame_with_corners` (clean, Metall-Eckstuds),
  `9-Slice Box 2/content_box_2` (mit eingebautem Titel-Schild), `9-Slice Box 1/content_box_3`.
- **Buttons mit States:** `Standalone Content Buttons` — `standardbut`, `small_button`, `small_button_2`,
  `wider1`, `wider2`, je `_n/_h/_p/_d` (normal/hover/pressed/disabled). `Standalone Close Button` (+grün).
- **Slots:** `Box - Inventory`, `Box - Character Sheet/Slots`, `Box - Player Stash` → Inventar/Equip-Zellen.
- **Bars/Frames Combat:** `Character Frame - Player` + `Target` (HP/Mana), `Player/Target Cast Bar`,
  `Player/Target Buff-Debuff`, `Action Bar`, `Party Frames`, `Small NPC Frame`.
- **Tooltip**, **Various Content Box Slices**, **Content Slider** (Scrollbars), **Announcement**, **Cursors**,
  **Loading Screen**, **Minimap/Big Map**, **Chat System**.
- **Screen-spezifische Boxen:** Character Sheet, Inventory, Crafting, Merchant, Quest Log/Commune/Tracker,
  Loot, Main Menu, Ability Book, Are-You-Sure (Confirm), Friends/Add-Friend, Server Select, Player Stash.

## A) Design-System-Kern auf Citadel umstellen (Phase 1 — nach Phase-0-Skelett)
Die `ds-*`-Klassen aus Phase 0 behalten, Texturen auf Citadel umstellen (9-Slice via CSS `border-image`,
Slice-Insets pro Box aus dem PNG messen):
| ds-Klasse | Citadel-Quelle |
|---|---|
| `ds-frame` (Default-Panel) | `9-Slice Box 3/wooden_frame_with_corners.png` |
| `ds-frame--headed` (mit Titel) | `9-Slice Box 2/content_box_2.png` (Titel-Schild oben) |
| `ds-section-header` | Titel-Schild aus content_box_2 / `Announcement` / Header-Slices |
| `ds-button` (+ States) | `Standalone Content Buttons/standardbut_*` (hover/active/disabled = _h/_p/_d) |
| `ds-button--sm` / `--wide` | `small_button_*` / `wider1_*`/`wider2_*` |
| `ds-close-button` | `Standalone Close Button/close_*` |
| `ds-slot` (Inventar/Equip) | `Box - Inventory/...` bzw. `Box - Character Sheet/Slots` |
| `ds-bar` (XP/HP/Mana/Progress) | `Player Cast Bar` / `Character Frame - Player` |
| `ds-tooltip` | `Tooltip/...` |
| `ds-scroll` | `*/Content Slider/...` |
**Sidebar als Referenz neu skinnen** (wooden_frame-Sektionen + `ds-button`-Skill-Knöpfe mit States).

## B) Seiten → Citadel-Box-Mapping (Phase 2+, Prio-Reihenfolge)
| Prio | Surface | Citadel-Box |
|---|---|---|
| 1 | **Combat** | `Character Frame - Player`+`Target` (HP/Mana), `Player/Target Cast Bar`, `Buff-Debuff`, `Action Bar` |
| 2 | **Character-Sheet** (#82) | `Box - Character Sheet` (+Slots, Skills Tab, Content Slider) |
| 3 | **Skill-Seiten** (Gathering/Crafting) | `Box - Crafting` + `Action Bar` |
| 4 | **Inventory / Bank** | `Box - Inventory` / `Box - Player Stash` + Slots |
| 5 | **Shop** | `Box - Merchant` |
| 6 | **Quests** | `Box - Quest Log` / `Quest Tracker` / `Box - Quest Commune` |
| 7 | **City / Map** | `Box - Big Map` / `Minimap` |
| 8 | **Loot/Drops** | `Box - Loot` |
| 9 | **Achievements/Mastery/Skills-Overview/Stats/Options** | generische `ds-frame` + Content-Box-Slices |
| 10 | **Main Menu** | `Box - Main Menu` (+ `Loading Screen`) |
| 11 | **Character-Creation** (+ Starter-Stil-Wahl) | `ds-frame` + `ds-button` |
| — | **Tooltips / Confirm-Dialoge / Toasts** | `Tooltip`, `Box - Are You Sure` |
| — | **Cursors** (optional) | `Cursors/` |

## Technik / Konventionen
- **9-Slice:** je Box per `border-image: url(...) <t r b l> fill / <widths>` + Padding; Slice-Insets pro PNG
  ausmessen (Eckornament-Größe). `fill` rendert die dunkle Mitte als Panel-BG → kein separater background.
- **Button-States:** `_n`=Basis, `_h`=`:hover`, `_p`=`:active`, `_d`=`disabled` (PNG-Tausch via background-image
  oder border-image pro State). Saubere, fühlbare Interaktion „gratis".
- **Pfade:** Kit-Ordner haben Leerzeichen (`Box - Inventory`). Beim Integrieren in **kebab-case umbenennen**
  (z.B. `box-inventory/`) für saubere Imports; nur tatsächlich genutzte Assets referenzieren (Vite bündelt
  nur Referenziertes → die 17 MB Quelle blähen den Build NICHT auf).
- **Was rausfällt:** `frame.png`, `bg_copper`-als-Rahmen, Kenney (weg). **Behalten:** unsere Spiel-Icons
  (`assets/skills/*`, `assets/sidebar/*`, Item-/Monster-Art) — Citadel liefert Rahmen/Buttons, nicht unsere
  Inhalts-Icons. game-icons-Embleme nur behalten, wo Citadel kein Pendant hat (sonst durch Citadel-Ornamente
  ersetzen → dann CC-BY-Credit ggf. entfernbar).
- **Fonts:** Kit linkt nur freie Fonts (`Font Links.txt`), keine Dateien. Vorerst bei Cinzel bleiben; Kit-Font
  später prüfen, falls er den Look maßgeblich trägt.
- Jede Phase **cache-frisch grün** (typecheck + build) + Chef-Sichtcheck. `styles.css` ist modularisiert →
  später ggf. parallele Seiten-Migration möglich.

## Reihenfolge / nächste Schritte
1. **Phase 0 grün landen lassen** (läuft: modulare Struktur + ds-Skelett).
2. **Phase 1 — DS-Kern auf Citadel** (Frames/Buttons/Slots/Bars/Tooltip + Sidebar-Reskin als Referenz).
3. **Phase 2+ — Seiten** in obiger Prio-Reihenfolge, je 1 ui-dev-Runde, sequenziell (styles.css), mit Sichtcheck.

## Offene Chef-Entscheidungen
- Welche generische Frame-Variante als **Default** (`wooden_frame` clean vs. `content_box_2` mit Titel)?
- Reihenfolge ok, oder Combat vs. Character zuerst?
- Kit-Font testen oder bei Cinzel bleiben?
