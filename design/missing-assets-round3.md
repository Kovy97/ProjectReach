# Fehlende Assets — Scan 2026-07-01 (Runde 3)

Autoritativer Scan: alle Item-/Monster-IDs im Content (`Object.keys(content.items)` /
`Object.keys(content.monsters)` via Wegwerf-Vitest-Helfer, `@hearthforge/content` importiert)
vs. vorhandene PNGs in `apps/client/src/renderer/assets/{items,monsters}/` (Auto-Discovery,
Dateiname ohne `.png` = ID).

**Ergebnis:** **1016 Item-IDs / 92 Monster-IDs** → **22 Items + 1 Monster ohne Art.**
(Seit Runde 2, Stand 2026-06-28: 788 Items → 1016; 84 → 92 Monster. 91 der 102 R2-Items
wurden inzwischen vom Chef geliefert und sind eingebunden.)

- Vorhandene PNGs: 1023 Item-Icons, 83 Monster-Bilder (mehr Dateien als IDs → siehe „Orphans" unten).
- **Aktuell fehlend gesamt: 23** = 22 Item-Icons + 1 Monster-Bild.
- Davon **NEU seit Runde 2: 11 Items** (Liste A) · **noch offen aus Runde 2: 11 Items + 1 Monster** (Liste B).

> Prompt-Datei dazu: `design/chatgpt-icon-prompts-round3.txt` (NEU-Icons priorisiert ganz oben).

---

## Monster

### Genuin fehlend (1)
- **scale_skarn** — „Drachenhaut-Skarn", Boss/Monster der Idolhalle. Weiterhin offen aus Runde 2.
  - ⚠️ Hinweis: In `assets/items/` liegt eine verwaiste `dragonhide_skarn.png` (Orphan, keine
    Item-ID). Sehr wahrscheinlich ist DAS bereits die scale_skarn-Art, nur falsch abgelegt/benannt.
    Vor Neu-Generierung sollte asset-integrator prüfen, ob diese Datei als
    `assets/monsters/scale_skarn.png` gebunden werden kann — dann entfällt der Prompt.

### KEINE neue Art nötig — Tower-Kopien mit Art-Fallback (8)
Die 8 neuen Slayer-Tower-Duplikate sind reine Kopien regulärer Zonen-Monster mit eigenen
Stats/Drops. `getMonsterSrc()` (renderer/monsters.ts) hat einen Fallback
`tower_<x>` → `<x>.png`, und alle Basis-PNGs existieren → sie sind im Spiel bebildert.
**Diese NICHT generieren:**
tower_goblin (→ goblin), tower_goblin_rogue (→ goblin_rogue),
tower_skeleton_warrior (→ skeleton_warrior), tower_skeleton_archer (→ skeleton_archer),
tower_ember_elemental (→ ember_elemental), tower_iron_revenant (→ iron_revenant),
tower_frost_hound (→ frost_hound), tower_roc_void (→ roc_void).

---

## Liste A — NEU seit Runde 2 (11 Items) — höchste Priorität
Kürzlich über Balance-Pässe/Sweeps hinzugekommen; fehlen „jetzt wieder".

### Rüstung / Waffen / Schmuck (3)
- **aetherscale_cuirass** — Aetherschuppen-Kürass (Body, epic; Aether-/Schuppen-Set mit aetherscale/wyvernscale)
- **frostcaverns_bow** — Frostkavernen-Bogen (Langbogen, epic, Frost-Effekt)
- **gemstone_amulet** — Edelsteinamulett (Amulett, rare, Juwelierskunst L26; Gegenstück zum bereits gebundenen gemstone_ring)

### Runen (2)
- **rune_storm_i** — Rune des Sturms I (Schock-Rune Tier 1)
- **rune_storm_ii** — Rune des Sturms II (Schock-Rune Tier 2)

### Farming — Samen & Ernte (2)
- **duskcap_seed** — Dämmerkappen-Saat (Pilzsporen, Farming L56)
- **duskcap** — Dämmerkappe (geernteter Dämmerpilz)

### Tränke / Tonika (2)
- **duskcap_tonic** — Dämmerkappen-Tonikum (Heiltrank +235)
- **tonic_bounty** — Ergiebigkeits-Tonikum (Buff: +10% Sammel-Ertrag)

### Slayer-Zwischenprodukte (Crafting) (2)
- **slayer_ward_capsule** — Slayer-Schutzkapsel (rare; versiegelte Kapsel, 4 Turmschutz-Komponenten)
- **tower_forge_compound** — Turmschmiedeschmelze (rare; dichte Leeren-/Glut-/Knochen-Legierung)

---

## Liste B — noch offen aus Runde 2 (11 Items + 1 Monster)
Vom Chef noch nicht geliefert.

### Bögen / Ranged-Rüstung (2)
- **mithril_shortbow** — Pestholz-Kurzbogen (letzter offener Bogen der Tier-Leiter)
- **voidhide_legs** — Leerenleder-Beinschienen (einziges offenes Teil des voidhide-Ranged-Sets)

### Slayer-Ausrüstung (2)
- **plague_mask** — Seuchenmaske
- **mirror_ward** — Spiegelschutz

### Materialien / Monster-Drops (4)
- **murkvein_ore** — Trübergaderz
- **murkvein_bar** — Trübergadbarren
- **rot_gland** — Verfaulte Drüse
- **soul_flayer_fang** — Seelenschinder-Reißzahn

### Samen / Kräuter / Runen (3)
- **nightshade_seed** — Nachtschatten-Saat
- **mandrake_root** — Alraunenwurzel
- **rune_storm_iii** — Rune des Sturms III (Schock-Rune Tier 3; vervollständigt die Sturm-Runen-Trilogie mit I/II aus Liste A)

### Monster (1)
- **scale_skarn** — siehe Abschnitt „Monster" oben (Orphan-Datei ggf. verwertbar).

---

## Anhang — Orphan-PNGs (Info, kein Handlungsbedarf für den Chef)
29 Item-PNGs haben aktuell KEINE passende Content-ID (Auto-Discovery bindet sie also nicht):
blank_parchment, bloodiron, copper_2haxe, copper_2hmace, copper_boots, copper_breastplate,
copper_gloves, copper_legguards, copper_squareshield, copper_warhammer, corpse_lily,
dragonhide_skarn, godiron, grimoak_longbow, iron_2haxe, iron_2hmace, iron_boots,
iron_breastplate, iron_gloves, iron_legguards, iron_squareshield, iron_warhammer,
leather_boots, leather_legs, leather_vambraces, mandrake, short_bow, swift_rune, ward_rune.

Das sind gelieferte/ältere Dateien, deren Dateiname ≠ eine aktuelle ID (mögliche Umbenennungen
im Content oder Content-Lücken). Kein neues Art nötig — ein Fall für asset-integrator/content-dev
(Datei umbenennen ODER Item ergänzen). `dragonhide_skarn` ist der wichtigste (siehe scale_skarn).
