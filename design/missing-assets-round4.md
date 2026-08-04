# Fehlende Assets — Scan 2026-07-04 (Runde 4)

Autoritativer Scan: alle Item-/Monster-IDs im Content (`Object.keys(content.items)` /
`Object.keys(content.monsters)` via Wegwerf-Vitest-Helfer, `@hearthforge/content` importiert)
vs. vorhandene PNGs in `apps/client/src/renderer/assets/{items,monsters,pets}/`
(Auto-Discovery, Dateiname ohne `.png` = ID). Wegwerf-Helfer wurde nach dem Scan gelöscht.

**Ergebnis:** **1039 Item-IDs / 94 Monster-IDs** → **45 Items + 2 Monster ohne Art**
(+ `the_imp` auf Chef-Wunsch = **3 Monster** in der Prompt-Liste, s.u.).
(Seit Runde 3, Stand 2026-07-01: 1016 → 1039 Items; 92 → 94 Monster. Der Chef hat seit
Runde 3 KEINES der 22 R3-Item-Icons geliefert — alle 22 sind weiterhin offen. Das
R3-Monster `scale_skarn` ist inzwischen eingebunden.)

- Vorhandene PNGs: 1022 Item-Icons, 84 Monster-Bilder, 21 Pet-Bilder.
  (Pets werden mitgezählt: Monster-Art wird auch aus `assets/pets/` gebunden.)
- **Aktuell fehlend gesamt: 47** (Prompt-relevant) = 45 Item-Icons + 2 genuine Monster + `the_imp`.
- Davon **NEU seit Runde 3: 23 Items + 3 Monster** (TEIL A) · **noch offen aus Runde 3: 22 Items** (TEIL B).

> Prompt-Datei dazu: `design/chatgpt-icon-prompts-round4.txt` (NEU-Assets priorisiert in TEIL A).

---

## Monster

### Genuin fehlend / zu generieren (3)
- **feral_goat** — „Wildziege", Zone *pastures* (Lvl 12, Bestie). NEU seit R3.
- **ashfield_jackal** — „Aschfeld-Schakal", Zone *ashfields* (Lvl 32, Bestie; schließt die
  L31–33-Mob-Lücke). NEU seit R3.
- **the_imp** — „The Imp", magischer Kobold-Dämon der *pastures*. Wird gerade PARALLEL als
  Content angelegt und taucht im Scan vom 2026-07-04 evtl. noch nicht auf — auf ausdrücklichen
  Chef-Wunsch trotzdem in die Prompt-Liste (TEIL A · Monster) aufgenommen.

### Erledigt seit Runde 3 (1)
- **scale_skarn** — der R3-Orphan `dragonhide_skarn.png` wurde als
  `assets/monsters/scale_skarn.png` gebunden. Nicht mehr fehlend, KEIN Prompt mehr nötig.

### KEINE neue Art nötig — Slayer-Tower-Kopien mit Art-Fallback (8)
Reine Kopien regulärer Zonen-Monster mit eigenen Stats/Drops. `getMonsterSrc()`
(renderer/monsters.ts) hat den Fallback `tower_<x>` → `<x>.png`, alle Basis-PNGs existieren →
im Spiel bebildert. **Diese NICHT generieren:**
tower_goblin (→ goblin), tower_goblin_rogue (→ goblin_rogue),
tower_skeleton_warrior (→ skeleton_warrior), tower_skeleton_archer (→ skeleton_archer),
tower_ember_elemental (→ ember_elemental), tower_iron_revenant (→ iron_revenant),
tower_frost_hound (→ frost_hound), tower_roc_void (→ roc_void).

---

## TEIL A — NEU seit Runde 3 (23 Items + 3 Monster) — höchste Priorität
Durch die Rüstungs-Iterationen (Itemization 2.5 / Rüstungs-Trinität) neu dazugekommen.

### Leder — Dämmerleder-Set (Duskhide, L40 Fernkampf, rare, Ausweichen) (5)
Schließt die 22-Level-Lücke scaled_leather L28 → studded_leather L50.
- **duskhide_helm** — Dämmerleder-Haube (Coif)
- **duskhide_body** — Dämmerleder-Kürass
- **duskhide_legs** — Dämmerleder-Beinlinge
- **duskhide_vambraces** — Dämmerleder-Armschützer
- **duskhide_boots** — Dämmerleder-Stiefel

### Leder — Geisterleder-Set (Wraithhide, L90 Fernkampf, epic, Ausweichen) (5)
Schließt die Lücke dragonhide L82 → shadowhide L95.
- **wraithhide_helm** — Geisterleder-Haube
- **wraithhide_body** — Geisterleder-Kürass
- **wraithhide_legs** — Geisterleder-Beinschienen
- **wraithhide_vambraces** — Geisterleder-Armschützer
- **wraithhide_boots** — Geisterleder-Stiefel

### Stoff — Dämmergewebe-Set (Duskweave, magic 64, superRare, Ward) (5)
Schließt die Stoff-Mid-Ladder-Lücke magic 55 → 70.
- **duskweave_cowl** — Dämmergewebe-Kapuze
- **duskweave_robe_body** — Dämmergewebe-Robe
- **duskweave_robe_legs** — Dämmergewebe-Gewand (Beine)
- **duskweave_handwraps** — Dämmergewebe-Handwickel
- **duskweave_treads** — Dämmergewebe-Schrittschuhe

### Stoff — Sterngewebe-Set (Starweave, magic 92, epic, Ward) (5)
Schließt die Lücke godspark L85 → voidweave L99.
- **starweave_coronet** — Sterngewebe-Krone
- **starweave_vestment** — Sterngewebe-Ornat
- **starweave_skirt** — Sterngewebe-Gewand (Beine)
- **starweave_handwraps** — Sterngewebe-Handwickel
- **starweave_sandals** — Sterngewebe-Sandalen

### Grabstahl-Ausrüstung (Gravesteel, Krypta, L24–26, rare) (3)
Eigenständige Craft-Stücke (nicht mit dem Chase-Drop `gravesteel_cuirass` verwechseln).
- **gravesteel_blade** — Grabstahlklinge (Schwert, Bane vs. Untote + Grabfeuer-Burn)
- **gravesteel_gravemark** — Grabstahl-Grabmal (Nebenhand-Ward, Grabstein-Form)
- **gravesteel_warplate** — Grabstahl-Kriegsplatte (Body-Platte)

### Monster (3) — s. Abschnitt „Monster" oben
- **feral_goat**, **ashfield_jackal**, **the_imp**

---

## TEIL B — noch offen aus Runde 3 (22 Items)
Vom Chef seit Runde 3 nicht geliefert; Beschreibungen aus round3 übernommen.

### Rüstung / Waffen / Schmuck (3)
- **aetherscale_cuirass** — Aetherschuppen-Kürass (Body, epic)
- **frostcaverns_bow** — Frostkavernen-Bogen (Langbogen, epic, Frost)
- **gemstone_amulet** — Edelsteinamulett (Amulett, rare)

### Runen — Sturm I & II (2)
- **rune_storm_i** — Rune des Sturms I
- **rune_storm_ii** — Rune des Sturms II

### Farming — Samen & Ernte (2)
- **duskcap_seed** — Dämmerkappen-Saat
- **duskcap** — Dämmerkappe

### Tränke / Tonika (2)
- **duskcap_tonic** — Dämmerkappen-Tonikum
- **tonic_bounty** — Ergiebigkeits-Tonikum

### Slayer-Zwischenprodukte (Crafting) (2)
- **slayer_ward_capsule** — Slayer-Schutzkapsel
- **tower_forge_compound** — Turmschmiedeschmelze

### Bögen / Ranged-Rüstung (2)
- **mithril_shortbow** — Pestholz-Kurzbogen
- **voidhide_legs** — Leerenleder-Beinschienen

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
- **rune_storm_iii** — Rune des Sturms III (Abschluss der Sturm-Runen-Trilogie)

---

## Anhang — Orphan-PNGs (Info, kein Handlungsbedarf für den Chef)
28 Item-PNGs haben aktuell KEINE passende Content-ID (Auto-Discovery bindet sie also nicht):
blank_parchment, bloodiron, copper_2haxe, copper_2hmace, copper_boots, copper_breastplate,
copper_gloves, copper_legguards, copper_squareshield, copper_warhammer, corpse_lily,
godiron, grimoak_longbow, iron_2haxe, iron_2hmace, iron_boots, iron_breastplate, iron_gloves,
iron_legguards, iron_squareshield, iron_warhammer, leather_boots, leather_legs,
leather_vambraces, mandrake, short_bow, swift_rune, ward_rune.

Keine Monster-Orphans (0). Gegenüber Runde 3 (29 Item-Orphans) ist `dragonhide_skarn`
verschwunden — er wurde korrekt als `scale_skarn.png` gebunden.

Das sind gelieferte/ältere Dateien, deren Dateiname ≠ eine aktuelle ID (mögliche
Umbenennungen im Content oder Content-Lücken). Kein neues Art nötig — ein Fall für
asset-integrator/content-dev (Datei umbenennen ODER Item ergänzen).
