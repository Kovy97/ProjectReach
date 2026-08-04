# Fehlende Assets — Scan 2026-07-09 (Runde 6)

Autoritativer Scan wie R3–R5: alle Item-/Monster-/Pet-IDs im Content (`@hearthforge/content`
via Wegwerf-Vitest-Helfer, nach Scan gelöscht) vs. vorhandene Bilder in
`apps/client/src/renderer/assets/{items,monsters,pets}/` (Auto-Discovery, Dateiname ohne
Endung = ID; `tower_<x>` fällt auf `<x>.png` zurück).

**Ergebnis:** **1034 Item-IDs / 99 Monster-IDs / 21 Pet-IDs → 15 Items + 5 Monster ohne Art; Pets komplett.**

**Delta seit Runde 5 (2026-07-04, damals 60 Items + 3 Monster offen):**
- Der Chef hat seit R5 massiv geliefert: ~50 Item-Icons + alle 3 R5-Monster (feral_goat,
  ashfield_jackal, the_imp) sind eingebunden.
- Item-IDs 1056 → 1034: das Ammo-Removal #286 (08./09.07.) löschte alle 26 Pfeil-/Arrowhead-Items;
  neu dazu kamen u.a. die zwei t0-Leder-Starter-Teile (#286 Ranged-Set).
- Monster-IDs 95 → 99 (+4 Endgame-/Zonen-Nachzügler — 4 der 5 offenen Monster unten sind neu).
- **2 hartnäckige Wiedergänger** (seit R3!): `frostcaverns_bow`, `starweave_skirt` — bitte priorisieren,
  das Starweave-Set ist inzwischen 5/5 unbebildert.

> **Prompt-Datei dazu: `design/chatgpt-icon-prompts-round6.txt`**
> **Prompt-Regel (Chef-Vorgabe):** Equipment-Art OHNE Schimmer/Glühen/Leuchten — nur Runen
> und Tränke dürfen glühen. Wiedergänger-Prompts wurden entsprechend glow-frei umformuliert.

---

## Items (15)

### Rüstung & Waffen (4)
- **leather_legs** — „Lederhose" (NEU: t0-Ranged-Starter-Set aus #286)
- **leather_boots** — „Lederstiefel" (NEU: t0-Ranged-Starter-Set)
- **marrow_cap** — „Mark-Kappe" (Knochen-Kopfschutz, Umfeld hollow_marrow)
- **frostcaverns_bow** — „Frostkavernen-Bogen" (Wiedergänger seit R3; jetzt glow-frei)

### Sterngewebe-/Starweave-Set (5) — episches Magier-Stoffset (magic 92)
- **starweave_coronet** „Sterngewebe-Krone" · **starweave_vestment** „Sterngewebe-Ornat" ·
  **starweave_skirt** „Sterngewebe-Gewand (Beine)" (Wiedergänger seit R3) ·
  **starweave_handwraps** „Sterngewebe-Handwickel" · **starweave_sandals** „Sterngewebe-Sandalen"

### Runen (3) — dürfen glühen; Tier-Stufung wie die Sturm-Runen (R3)
- **rune_evasion_i / _ii / _iii** — „Rune des Ausweichens I–III"

### Speisen (3) — Endgame-Kochkunst
- **voidray_banquet** „Leerenrochen-Bankett" · **abyssal_feast** „Abgrund-Festmahl" ·
  **soulfire_banquet** „Seelenfeuer-Bankett"

## Monster (5) — Kampfbild-Format wie bestehende Monster-Art
- **hollow_marrow** — „Hohles Mark" (Lv 16)
- **mire_wisp** — „Sumpfirrlicht" (Lv 30)
- **barrow_chanter** — „Hügelgrab-Chorist" (Lv 55)
- **hollow_choir** — „Hohler Chor" (Lv 80)
- **iron_sentinel** — „Eiserner Wächter" (Lv 90)

## UI-Sonderwunsch (1)
- **icon_quest_token.png** — Quest-Token-Icon (Token-Shop + Quest-Belohnungs-Zeilen;
  offener Chef-Wunschzettel-Punkt seit dem Quest-Rework #284).

## Hinweise
- KEINE Pfeil-/Fletching-Assets mehr generieren — Munitions-System komplett entfernt (#286);
  die 31 Alt-Dateien liegen archiviert in `Downloads\ASSETS\archive\ammo-removal-2026-07-09`.
- Slayer-Tower-Kopien (`tower_*`) brauchen weiterhin KEINE eigene Art (Fallback greift).
- Nach Einbindung: Quell-Originale archivieren (Standing Rule) + ALLE Code-Referenzen bedienen.
