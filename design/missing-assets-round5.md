# Fehlende Assets — Scan 2026-07-04 (Runde 5)

Autoritativer Scan: alle Item-/Monster-IDs im Content (`Object.keys(content.items)` /
`Object.keys(content.monsters)` via Wegwerf-Vitest-Helfer, `@hearthforge/content` importiert)
vs. vorhandene PNGs in `apps/client/src/renderer/assets/{items,monsters,pets}/`
(Auto-Discovery, Dateiname ohne `.png` = ID). Wegwerf-Helfer wurde nach dem Scan gelöscht.

**Ergebnis:** **1056 Item-IDs / 95 Monster-IDs** → **60 Items + 3 Monster ohne Art**.
(Die 8 Slayer-Tower-Kopien mit Art-Fallback zählen NICHT als Lücke — s.u.)

- Vorhandene PNGs: **1034 Item-Icons, 84 Monster-Bilder, 21 Pet-Bilder**.
  (Pets werden mitgezählt: Monster-Art wird auch aus `assets/pets/` gebunden.)
- **Aktuell fehlend gesamt (Prompt-relevant): 63** = 60 Item-Icons + 3 genuine Monster.
- Davon **NEU seit Runde 4: 15 Items** (TEIL A) · **noch offen aus Runde 4: 45 Items + 3 Monster** (TEIL B).

**Seit Runde 4 (2026-07-04):**
- Item-IDs **1039 → 1056** (netto +17; enthält den heutigen Combat-Depth/RC/Consumables-Batch
  UND den Abzug der 10 heute entfernten glyph_of_*/scroll_of_*-Items). **15 der neuen IDs sind ohne Art** (= die 15 TEIL-A-Lücken).
- Monster-IDs **94 → 95** (+1): `the_imp` ist jetzt echter Content (in Runde 4 nur vorgemerkt).
- Der Chef hat seit Runde 4 **KEINES** der 45 R4-Item-Icons und **keines** der 3 R4-Monster
  geliefert — alle 48 sind weiterhin offen (= TEIL B).

> Prompt-Datei dazu: `design/chatgpt-icon-prompts-round5.txt` (NEU-Assets in TEIL A priorisiert).

---

## Monster

### Genuin fehlend / zu generieren (3) — alle offen aus Runde 4
- **feral_goat** — „Wildziege", Zone *pastures* (Lvl 12, Bestie).
- **ashfield_jackal** — „Aschfeld-Schakal", Zone *ashfields* (Lvl 32, Bestie).
- **the_imp** — „The Imp", magischer Kobold-Dämon der *pastures*. In Runde 4 nur vorgemerkt,
  taucht jetzt real im Scan auf (Monster-ID-Zahl 94 → 95). Trophäe-Drop `imp_horn` s.u. (TEIL A).

### KEINE neue Art nötig — Slayer-Tower-Kopien mit Art-Fallback (8)
Reine Kopien regulärer Zonen-Monster mit eigenen Stats/Drops. `getMonsterSrc()`
(renderer/monsters.ts) hat den Fallback `tower_<x>` → `<x>.png`; alle 8 Basis-PNGs existieren
(verifiziert: goblin, goblin_rogue, skeleton_warrior, skeleton_archer, ember_elemental,
iron_revenant, frost_hound, roc_void) → im Spiel bebildert. **Diese NICHT generieren:**
tower_goblin, tower_goblin_rogue, tower_skeleton_warrior, tower_skeleton_archer,
tower_ember_elemental, tower_iron_revenant, tower_frost_hound, tower_roc_void.

---

## TEIL A — NEU seit Runde 4 (15 Items) — höchste Priorität
Aus dem heutigen Combat-Depth- / Runecrafting- / Consumables-Batch.

### Trinity-Verzauberungsrunen (12)
Runensteine zum Verzaubern von Rüstung/Schilden; drei Tiers je Familie (I/II/III), Glow steigt
mit dem Tier. Familien-Farbcode: Schutz/Aegis = **stahlblau** (armorRating), Ausweichen/Evasion =
**smaragdgrün** (evasionRating), Ward/Warding = **violett-arkan** (wardCapacity), Block/Bulwark =
**bronze-gold** (blockChance, Schild-Rune).
- **rune_aegis_i / rune_aegis_ii / rune_aegis_iii** — Rune der Ägide I/II/III (Schutz, stahlblau)
- **rune_evasion_i / rune_evasion_ii / rune_evasion_iii** — Rune des Ausweichens I/II/III (grün)
- **rune_warding_i / rune_warding_ii / rune_warding_iii** — Rune der Abwehr I/II/III (violett-arkan)
- **rune_bulwark_i / rune_bulwark_ii / rune_bulwark_iii** — Rune des Bollwerks I/II/III (bronze-gold)

### Shop-Reagenz · Consumable · Trophäe (3)
- **magic_binder** — „Magiebinder", Shop-Reagenz & Zutat der RC-Focus-Bau-Kette (Precursor).
- **tonic_bulwark** — „Bollwerk-Tonikum", Block-Chance-Trank (superRare, +10 % Block für 90 s).
- **imp_horn** — „Imp-Horn", Trophäe/Drop vom besiegten *The Imp*.

> Die 12 `enchanted_<tier>_focus` (RC-Focus-Precursor) haben bereits (duplizierte) Art und
> fehlen NICHT — verifiziert in `assets/items/` (enchanted_copper_focus … enchanted_bloodiron_focus etc.).

---

## TEIL B — noch offen aus Runde 4 (45 Items + 3 Monster)
Vom Chef seit Runde 4 nicht geliefert; Beschreibungen aus Runde 4 übernommen.

### Leder — Dämmerleder-Set (Duskhide, L40 Fernkampf, rare) (5)
duskhide_helm, duskhide_body, duskhide_legs, duskhide_vambraces, duskhide_boots

### Leder — Geisterleder-Set (Wraithhide, L90 Fernkampf, epic) (5)
wraithhide_helm, wraithhide_body, wraithhide_legs, wraithhide_vambraces, wraithhide_boots

### Stoff — Dämmergewebe-Set (Duskweave, magic 64, superRare, Ward) (5)
duskweave_cowl, duskweave_robe_body, duskweave_robe_legs, duskweave_handwraps, duskweave_treads

### Stoff — Sterngewebe-Set (Starweave, magic 92, epic, Ward) (5)
starweave_coronet, starweave_vestment, starweave_skirt, starweave_handwraps, starweave_sandals

### Grabstahl-Ausrüstung (Gravesteel, Krypta, L24–26, rare) (3)
gravesteel_blade, gravesteel_gravemark, gravesteel_warplate

### Rüstung / Waffen / Schmuck (3)
aetherscale_cuirass, frostcaverns_bow, gemstone_amulet

### Sturm-Runen (Tier I/II/III) (3)
rune_storm_i, rune_storm_ii, rune_storm_iii

### Farming — Samen, Ernte & Kräuter (4)
duskcap_seed, duskcap, nightshade_seed, mandrake_root

### Tränke / Tonika (2)
duskcap_tonic, tonic_bounty

### Slayer-Zwischenprodukte (Crafting) (2)
slayer_ward_capsule, tower_forge_compound

### Bögen / Ranged-Rüstung (2)
mithril_shortbow, voidhide_legs

### Slayer-Ausrüstung (2)
plague_mask, mirror_ward

### Materialien / Monster-Drops (4)
murkvein_ore, murkvein_bar, rot_gland, soul_flayer_fang

### Monster (3) — s. Abschnitt „Monster" oben
feral_goat, ashfield_jackal, the_imp

---

## Anhang — Orphan-PNGs (Info, kein Handlungsbedarf für den Chef)
**38 Item-PNGs** haben aktuell KEINE passende Content-ID (Auto-Discovery bindet sie also nicht):

blank_parchment, bloodiron, copper_2haxe, copper_2hmace, copper_boots, copper_breastplate,
copper_gloves, copper_legguards, copper_squareshield, copper_warhammer, corpse_lily,
**glyph_of_alacrity, glyph_of_might, glyph_of_precision, glyph_of_ruin, glyph_of_the_bulwark,
glyph_of_the_zealot, glyph_of_warding**, godiron, grimoak_longbow, iron_2haxe, iron_2hmace,
iron_boots, iron_breastplate, iron_gloves, iron_legguards, iron_squareshield, iron_warhammer,
leather_boots, leather_legs, leather_vambraces, mandrake, **scroll_of_aegis, scroll_of_cataclysm,
scroll_of_overload**, short_bow, swift_rune, ward_rune.

Keine Monster-Orphans (0).

**NEU verwaist seit Runde 4: die 10 fett markierten** — die heute aus dem Content ENTFERNTEN
Items (7 × `glyph_of_*` + 3 × `scroll_of_*`). Ihre PNGs liegen noch in `assets/items/`, binden
aber an nichts mehr → reine Orphans. **KEIN neuer Prompt dafür** (Items existieren nicht mehr).
Orphan-Zahl damit **28 (Runde 4) → 38 (Runde 5)** (+10).

Alle Orphans sind gelieferte/ältere Dateien, deren Dateiname ≠ eine aktuelle ID (Umbenennungen
oder aus dem Content entfernte Items). Kein neues Art nötig — ein Fall für asset-integrator /
content-dev (Datei aufräumen/umbenennen ODER Item wieder anlegen). Keine Aktion in Runde 5.
