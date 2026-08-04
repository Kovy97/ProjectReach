# Fehlende Assets — Scan Runde 7 (2026-07-10)

Anlass: Endgame-Dungeon-Re-Tiering (Paragon-Content Teil A + goblin_warband-Re-Tiering Teil B,
CEO-GO 2026-07-10). goblin_warband hebt von Gate 20 auf Gate 55 — die alten `dg_goblin_*`-Reskins
(Stufe 19–30) sind dafür zu schwach. Ersatz: 5 EIGENSTÄNDIGE neue Kreaturen ohne Openworld-Basis
("Kriegstrupp-Veteranen", Stufe 50–60). Diese haben **keine** existierende Art zum Aliasen (anders
als die bisherigen `dg_*`-Varianten, die per Namenskonvention auf die Basis-Art zurückfallen) —
bis der Chef liefert, greift der generische Fallback (Familien-Icon/Emoji), kein Crash.

**Prompt-Datei dazu: `design/chatgpt-monster-prompts-round7.txt`**

## Monster (5) — Kampfbild-Format wie bestehende Monster-Art

- **goblin_reaver** — „Goblin-Plünderer" (Stufe 50, Trash, Welle 1 „Die Vorhut")
- **goblin_pikeman** — „Goblin-Pikenier" (Stufe 52, Trash, Welle 2 „Die Speerwand")
- **goblin_siegebrute** — „Goblin-Belagerungsbestie" (Stufe 55, Elite, Welle 3 „Die Belagerungslinie")
- **goblin_bloodshaman** — „Goblin-Blutschamane" (Stufe 57, Elite, Welle 4 „Der Blutritus")
- **goblin_warchief** — „Goblin-Kriegshäuptling" (Stufe 60, Boss, Welle 5 „Der Kriegshäuptling der Bande")

Alle 5 sind normale, direkt startbare Monster (zone `borderlands`, Präzedenz `dg_skeleton_*` aus
der Krypta — bewusst OHNE `dungeonOnly`, s. Kommentar im Content bei den Definitionen), tauchen
aber nur als Wellen von `goblin_warband` im Content vor. Dateiname exakt `<id>.png` (Auto-Bind,
kein Code nötig).

## Keine weiteren Asset-Lücken durch diese Welle

- `paragon_key` (neues Item) nutzt das bestehende Schlüssel-Emoji-Icon (🗝️, wie alle anderen
  Dungeon-Schlüssel) — kein PNG-Bedarf.
- `paragon_tower` (neue DungeonDef, `encounters: []`) hat keine eigene Dungeon-Karten-Art nötig
  — Dungeon-Karten binden nicht per-Dungeon-PNG (UI-Konvention unverändert).
- Alle Paragonturm-Etagen-Gegner (`content.paragon.pool`/`bossPool`) sind bereits existierende,
  bebilderte Monster (iron_revenant, frost_hexer, charred_doomknight, roc_void, void_titan) —
  keine neue Art nötig.
- Die umgestuften Dungeons (wildwood_hunt/highland_aerie/wyvern_lair, nur Gate-Level geändert)
  behalten ihre bestehenden Wellen-Monster — keine neue Art nötig.

## Hinweise

- Nach Einbindung: Quell-Originale archivieren (Standing Rule) + Bestiarium-/Dungeon-Encounter-
  Referenzen prüfen (Asset-Bind-Regel: jede Code-Referenz bedienen, nicht nur eine).
