# Hearthforge Idle — Content-Katalog (Planungsdokument)

> **Status:** Planungsentwurf für Version 1.0
> **Visueller Stil:** "Ashen Iron" — kaltes, entsättigtes Stahlblau, körnig, grimmige Dark-Fantasy.
> **Welt-Pitch:** Eine sterbende Eisenwelt unter aschgrauem Himmel. Schmieden glühen gegen die Kälte an, während die Wildnis von rostigem Verfall und alten Flüchen zerfressen wird.
>
> **IP-Hinweis:** Sämtliche Namen und Inhalte in diesem Dokument sind **originär** und für die kommerzielle Veröffentlichung gedacht. Melvor Idle dient ausschließlich als *struktureller* Genre-Referenzrahmen (welche Systeme ein Idle-RPG hat), nicht als Inhaltsquelle. Keine Übernahme fremder Namen, Zahlen oder Texte.
>
> **Konsistenz-Anker (nicht widersprechen):**
> - 6 Attribute: Stärke (STR), Geschick (DEX), Konstitution (CON), Intelligenz (INT), Weisheit (WIS), Glück (LCK).
> - 3 Kampfstile per Waffe: Nahkampf (STR), Fernkampf (DEX), Magie (INT). Kein Kampf-Dreieck — reiner Statcheck.
> - Bestehende Kampf-Skills: Angriff, Wucht, Verteidigung, Fernkampf, Offensive Magie, Defensive Magie.
> - Bestehende Sammel-Skills: Holzfällen, Bergbau, Angeln.
> - Geplante Verarbeitung: Schmieden, Kochen (+ weitere unten).
> - Ausrüstungsslots: helmet, amulet, mainhand, offhand, body, legs, gloves, boots, cape, ring1, ring2.
> - Levelgrenze 120 (RuneScape-artige XP-Kurve).
> - Sprache: Deutsch für alle In-Game-Namen.

---

## 1. Skill-Übersicht

Zielumfang 1.0: **15 Skills** (6 Kampf, 3 Sammeln, 5 Verarbeitung, 1 Utility). Erweiterbar nach Release.

### Kampf-Skills (bestehend)

| Skill | Attribut | Zweck (Einzeiler) |
|---|---|---|
| Angriff | STR | Treffergenauigkeit & Trefferchance im Nahkampf. |
| Wucht | STR | Schadenshöhe im Nahkampf (max. Treffer). |
| Verteidigung | CON | Reduziert eingehenden Schaden, schaltet schwere Rüstung frei. |
| Fernkampf | DEX | Genauigkeit & Schaden mit Bögen/Wurfwaffen. |
| Offensive Magie | INT | Schaden & Trefferchance offensiver Sprüche. |
| Defensive Magie | WIS | Schutzsprüche, Bann-Effekte, Magieresistenz. |

### Sammel-Skills

| Skill | Attribut-Bezug | Zweck (Einzeiler) |
|---|---|---|
| Holzfällen | STR/LCK | Fällt Bäume für Rohholz (Verarbeitung & Brennstoff). |
| Bergbau | STR/LCK | Baut Erze, Steine und Edelsteine ab. |
| Angeln | DEX/LCK | Fängt Rohfisch und Wasser-Beute für Kochen & Alchemie. |

### Verarbeitungs-Skills

| Skill | Eingang → Ausgang | Zweck (Einzeiler) |
|---|---|---|
| Schmieden | Erz → Barren → Metallausrüstung | Schmilzt Barren und fertigt Waffen/Rüstung für Nah- & Fernkampf. |
| Kochen | Rohfisch/Fleisch → Speisen | Kocht Nahrung zur Lebensregeneration im Kampf. |
| Gerberei | Häute/Rinde → Leder & Schäfte | Stellt Leder-Rüstung, Bogen-Teile und Pfeile her. |
| Verzauberung | Edelsteine/Essenz → Schmuck & Runen | Fertigt Amulette, Ringe und Magie-Runen (INT/WIS-Gear). |
| Alchemie | Kräuter/Beute → Tränke | Braut Buff-, Heil- und Utility-Tränke. |

### Utility-Skill

| Skill | Zweck (Einzeiler) |
|---|---|
| Bündnis (Companion-Pflege) | Zähmt & versorgt Begleiter-Bestien, die passive Boni geben. |

> **Hinweis zur Skalierung:** Bei Bedarf für 1.1+ sind Kräuterkunde (eigener Sammel-Skill statt LCK-Drop), Astralkunde (Teleport/Layout) und Schnitzen (Holz-Gear) reservierte Erweiterungsslots — bewusst **nicht** in 1.0, um den Scope schlank zu halten.

---

## 2. Gear-Tiers

7 Progressionsstufen mit originärer Material-Benennung. Stufen gelten primär für Metall (Schmieden); Leder- und Magie-Gear nutzen eine parallele Materiallogik (siehe Notiz unten).

| Tier | Material (originär) | Empf. Skill-Lvl | Hergestellt von | Charakter / Flavor |
|---|---|---|---|---|
| 1 | Mürbeisen | 1 | Schmieden | Bröckeliges, oberflächlich abgebautes Roheisen. Anfängermetall. |
| 2 | Klotzstahl | 15 | Schmieden | Grober, ungleichmäßig gehärteter Stahl. Robust, aber schwer. |
| 3 | Frostbronze | 30 | Schmieden | Kältebeständige Legierung; hält dem aschigen Wind stand. |
| 4 | Aschenstahl | 45 | Schmieden | Im Schlackenfeuer gehärtet — der Namensgeber des Stils. |
| 5 | Schwarzguss | 65 | Schmieden | Tiefdunkles, schweres Metall aus Bergbau-Tiefen. |
| 6 | Klingsilber | 85 | Schmieden / Verzauberung | Klingender Silberstahl; nimmt Verzauberungen gut auf. |
| 7 | Götzeisen | 105 | Schmieden | Aus alten Götzen-Relikten umgeschmolzen; Endgame-Metall. |

> **Parallele Materiallinien (gleiche Tier-Stufen, andere Skills):**
> - **Leder (Gerberei):** Rohleder → Zähleder → Narbenleder → Schuppenleder → Drachenhautleder. DEX-Gear für Fernkampf.
> - **Holz/Schäfte (Gerberei/Holzfällen):** Fahlholz → Graueibe → Schwarzdorn → Geisterholz → Mahlbaum. Bögen & Stäbe.
> - **Magie (Verzauberung):** Trübkristall → Klarquarz → Frostberyll → Seelenopal → Aethergem. Stäbe, Schmuck, Runenfokus.
>
> Tier-Empfehlungslevel sind grobe Platzhalter und müssen gegen die XP-Kurve (Lvl 120) feingetunt werden.

---

## 3. Item-Katalog (Auswahl)

Repräsentative Items pro Kategorie. Zahlen sind **grobe Platzhalter** für die Implementierung. IDs in snake_case.

### 3.1 Rohmaterialien — Bergbau

| ID | Name | Typ | Notiz |
|---|---|---|---|
| `ore_muerbeisen` | Mürbeisenerz | raw_ore | Tier-1-Erz, Startgebiet. |
| `ore_klotzstahl` | Klotzstahlerz | raw_ore | Tier-2-Erz. |
| `ore_frostkupfer` | Frostkupfererz | raw_ore | Legierung für Frostbronze. |
| `ore_zinnschlacke` | Zinnschlacke | raw_ore | Zweite Komponente Frostbronze. |
| `ore_aschenstahl` | Aschenstahlerz | raw_ore | Tier-4-Erz, nahe Schlackenfeldern. |
| `ore_schwarzguss` | Schwarzgusserz | raw_ore | Tief-Bergbau, Tier 5. |
| `ore_klingsilber` | Klingsilbererz | raw_ore | Seltenes Tier-6-Erz. |
| `ore_goetzeisen` | Götzeisenbrocken | raw_ore | Endgame, sehr selten. |
| `stone_grauschiefer` | Grauschiefer | raw_stone | Baumaterial / Schleifstein. |
| `coal_pechkohle` | Pechkohle | fuel | Brennstoff für Schmieden. |
| `gem_truebkristall` | Trübkristall | raw_gem | Tier-1-Verzauberungsstein. |
| `gem_frostberyll` | Frostberyll | raw_gem | Mittlerer Edelstein. |
| `gem_seelenopal` | Seelenopal | raw_gem | Hochwertiger Edelstein. |
| `gem_aethergem` | Aethergem | raw_gem | Endgame-Edelstein. |

### 3.2 Rohmaterialien — Holzfällen & Gerberei

| ID | Name | Typ | Notiz |
|---|---|---|---|
| `log_fahlholz` | Fahlholzstamm | raw_log | Tier-1-Holz. |
| `log_graueibe` | Graueibenstamm | raw_log | Tier-2-Holz. |
| `log_schwarzdorn` | Schwarzdornstamm | raw_log | Tier-3-Holz, dornig. |
| `log_geisterholz` | Geisterholzstamm | raw_log | Leuchtet schwach blau. |
| `log_mahlbaum` | Mahlbaumstamm | raw_log | Endgame-Holz, steinhart. |
| `hide_rohleder` | Rohleder | raw_hide | Monster-Drop, Gerberei-Input. |
| `hide_narbenleder` | Narbenleder | raw_hide | Höherstufiger Hide-Drop. |
| `hide_schuppenleder` | Schuppenleder | raw_hide | Reptil-/Drachen-Drop. |
| `bark_aschrinde` | Aschrinde | raw_bark | Gerberei-Bindemittel. |

### 3.3 Rohmaterialien — Angeln & Alchemie

| ID | Name | Typ | Notiz |
|---|---|---|---|
| `fish_schlammgrundel` | Schlammgrundel | raw_fish | Tier-1-Fisch. |
| `fish_eisbarsch` | Eisbarsch | raw_fish | Tier-2-Fisch. |
| `fish_klingenaal` | Klingenaal | raw_fish | Tier-3, vorsichtig anfassen. |
| `fish_tiefenrochen` | Tiefenrochen | raw_fish | Hochstufiger Fisch. |
| `fish_aschwels` | Aschwels | raw_fish | Endgame-Fisch. |
| `herb_grauwurz` | Grauwurz | herb | Heiltrank-Basis. |
| `herb_frostranke` | Frostranke | herb | Buff-Trank-Kraut. |
| `herb_totenmoos` | Totenmoos | herb | Giftresistenz-Zutat. |
| `essence_aschestaub` | Aschestaub | reagent | Alchemie-Bindemittel. |

### 3.4 Verarbeitete Materialien — Barren & Halbzeug

| ID | Name | Typ | Notiz |
|---|---|---|---|
| `bar_muerbeisen` | Mürbeisenbarren | bar | Aus Mürbeisenerz + Pechkohle. |
| `bar_klotzstahl` | Klotzstahlbarren | bar | Tier 2. |
| `bar_frostbronze` | Frostbronzebarren | bar | Frostkupfer + Zinnschlacke. |
| `bar_aschenstahl` | Aschenstahlbarren | bar | Tier 4. |
| `bar_schwarzguss` | Schwarzgussbarren | bar | Tier 5. |
| `bar_klingsilber` | Klingsilberbarren | bar | Tier 6. |
| `bar_goetzeisen` | Götzeisenbarren | bar | Tier 7, Endgame. |
| `plank_graueibe` | Graueibenbohle | plank | Geschnittenes Holz für Schäfte. |
| `leather_zaehleder` | Zähleder | leather | Gegerbtes Rohleder. |
| `leather_schuppenleder` | Verarbeitetes Schuppenleder | leather | Hochstufige Rüstung. |
| `shaft_pfeilschaft` | Pfeilschaft | component | Pfeil-Komponente. |
| `string_sehnenfaden` | Sehnenfaden | component | Bogensehne. |
| `rune_frostrune` | Frostrune | rune | Magie-Munition/Spruchkosten. |
| `rune_aetherrune` | Aetherrune | rune | Hochstufige Spruchkomponente. |

### 3.5 Waffen — Nahkampf (STR, Schmieden)

| ID | Name | Typ | Slot | Notiz |
|---|---|---|---|---|
| `wpn_muerbeisen_kurzschwert` | Mürbeisen-Kurzschwert | weapon_melee | mainhand | Tier 1, ausgewogen. |
| `wpn_klotzstahl_streitaxt` | Klotzstahl-Streitaxt | weapon_melee | mainhand | Hohe Wucht, langsam. |
| `wpn_frostbronze_speer` | Frostbronze-Speer | weapon_melee | mainhand | Reichweite, schnell. |
| `wpn_aschenstahl_langschwert` | Aschenstahl-Langschwert | weapon_melee | mainhand | Tier 4, Allround. |
| `wpn_schwarzguss_kriegshammer` | Schwarzguss-Kriegshammer | weapon_melee | mainhand | 2H, sehr hoher Maxhit. |
| `wpn_klingsilber_richtschwert` | Klingsilber-Richtschwert | weapon_melee | mainhand | Tier 6, Crit-fokussiert. |
| `wpn_goetzeisen_schlachtklinge` | Götzeisen-Schlachtklinge | weapon_melee | mainhand | Endgame, 2H. |
| `shield_aschenstahl_buckler` | Aschenstahl-Buckler | offhand | offhand | Defensiver Offhand. |

### 3.6 Waffen — Fernkampf (DEX, Gerberei/Holzfällen)

| ID | Name | Typ | Slot | Notiz |
|---|---|---|---|---|
| `wpn_fahlholz_kurzbogen` | Fahlholz-Kurzbogen | weapon_ranged | mainhand | Tier 1, schnell. |
| `wpn_graueibe_langbogen` | Graueibe-Langbogen | weapon_ranged | mainhand | Reichweite/Schaden. |
| `wpn_schwarzdorn_recurve` | Schwarzdorn-Reflexbogen | weapon_ranged | mainhand | Tier 3. |
| `wpn_geisterholz_jagdbogen` | Geisterholz-Jagdbogen | weapon_ranged | mainhand | Tier 4, crit-lastig. |
| `wpn_mahlbaum_kriegsbogen` | Mahlbaum-Kriegsbogen | weapon_ranged | mainhand | Endgame-Bogen. |
| `ammo_eisenpfeil` | Eisenpfeile | ammo | offhand | Standard-Munition. |
| `ammo_schwarzgusspfeil` | Schwarzgusspfeile | ammo | offhand | Hochstufige Munition. |
| `wpn_klotzstahl_wurfaxt` | Klotzstahl-Wurfaxt | weapon_ranged | mainhand | Wurfwaffe, stapelbar. |

### 3.7 Waffen — Magie (INT, Verzauberung)

| ID | Name | Typ | Slot | Notiz |
|---|---|---|---|---|
| `wpn_truebkristall_stab` | Trübkristall-Stab | weapon_magic | mainhand | Tier 1 Fokus. |
| `wpn_frostberyll_stab` | Frostberyll-Stab | weapon_magic | mainhand | Tier 3, Frostschaden. |
| `wpn_seelenopal_zepter` | Seelenopal-Zepter | weapon_magic | mainhand | Hoher Spruchschaden. |
| `wpn_aethergem_runenstab` | Aethergem-Runenstab | weapon_magic | mainhand | Endgame-Stab. |
| `off_truebkristall_fokus` | Trübkristall-Fokus | weapon_magic | offhand | Magie-Offhand, INT-Bonus. |
| `off_seelenopal_grimoire` | Seelenopal-Grimoire | weapon_magic | offhand | WIS/Defensive-Magie-Bonus. |

### 3.8 Rüstung — Schwer/Metall (Nahkampf, Schmieden)

| ID | Name | Typ | Slot | Notiz |
|---|---|---|---|---|
| `arm_muerbeisen_helm` | Mürbeisen-Helm | armor_heavy | helmet | Tier 1. |
| `arm_muerbeisen_panzer` | Mürbeisen-Brustpanzer | armor_heavy | body | Tier 1. |
| `arm_klotzstahl_beinschienen` | Klotzstahl-Beinschienen | armor_heavy | legs | Tier 2. |
| `arm_aschenstahl_helm` | Aschenstahl-Helm | armor_heavy | helmet | Tier 4. |
| `arm_aschenstahl_panzer` | Aschenstahl-Brustpanzer | armor_heavy | body | Tier 4. |
| `arm_schwarzguss_handschuhe` | Schwarzguss-Panzerhandschuhe | armor_heavy | gloves | Tier 5. |
| `arm_klingsilber_stiefel` | Klingsilber-Stahlstiefel | armor_heavy | boots | Tier 6. |
| `arm_goetzeisen_panzer` | Götzeisen-Brustpanzer | armor_heavy | body | Endgame. |

### 3.9 Rüstung — Leicht/Leder (Fernkampf, Gerberei)

| ID | Name | Typ | Slot | Notiz |
|---|---|---|---|---|
| `arm_rohleder_kapuze` | Rohleder-Kapuze | armor_light | helmet | Tier 1. |
| `arm_rohleder_wams` | Rohleder-Wams | armor_light | body | Tier 1. |
| `arm_zaehleder_handschuhe` | Zähleder-Handschuhe | armor_light | gloves | DEX-Bonus. |
| `arm_narbenleder_wams` | Narbenleder-Wams | armor_light | body | Tier 4. |
| `arm_schuppenleder_beinzeug` | Schuppenleder-Beinzeug | armor_light | legs | Tier 5. |
| `arm_drachenhaut_wams` | Drachenhautleder-Wams | armor_light | body | Endgame, Fernkampf. |

### 3.10 Rüstung — Magie/Stoff (Magie, Verzauberung/Gerberei)

| ID | Name | Typ | Slot | Notiz |
|---|---|---|---|---|
| `arm_aschrobe_haube` | Aschroben-Haube | armor_cloth | helmet | Tier 1 Magie. |
| `arm_aschrobe_gewand` | Aschroben-Gewand | armor_cloth | body | INT-Bonus. |
| `arm_frostgewand_oberteil` | Frostgewand | armor_cloth | body | Tier 3, Magieschaden. |
| `arm_seelengewand_oberteil` | Seelengewand | armor_cloth | body | Tier 5, WIS-Bonus. |
| `arm_aethergewand_oberteil` | Aethergewand | armor_cloth | body | Endgame-Magie. |

### 3.11 Schmuck & Umhänge (Verzauberung)

| ID | Name | Typ | Slot | Notiz |
|---|---|---|---|---|
| `amu_frostberyll_amulett` | Frostberyll-Amulett | amulet | amulet | Magieresistenz. |
| `amu_seelenopal_amulett` | Seelenopal-Amulett | amulet | amulet | +Maxhit alle Stile. |
| `ring_truebkristall_reif` | Trübkristall-Reif | ring | ring1/ring2 | Früher LCK-Bonus. |
| `ring_aethergem_siegel` | Aethergem-Siegel | ring | ring1/ring2 | Endgame, +Crit. |
| `cape_aschenmantel` | Aschenmantel | cape | cape | Standard-Umhang. |
| `cape_schlackenmantel` | Schlackenmantel | cape | cape | +Feuerresistenz. |
| `cape_goetzenmantel` | Götzenmantel | cape | cape | Endgame-Umhang. |

### 3.12 Nahrung & Verbrauchsgegenstände

| ID | Name | Typ | Notiz |
|---|---|---|---|
| `food_gegrillte_grundel` | Gegrillte Schlammgrundel | food | Kleine Heilung. |
| `food_eisbarsch_filet` | Eisbarsch-Filet | food | Mittlere Heilung. |
| `food_klingenaal_braten` | Klingenaal-Braten | food | Gute Heilung. |
| `food_aschwels_eintopf` | Aschwels-Eintopf | food | Hohe Heilung, Endgame. |
| `potion_grauwurz_heiltrank` | Grauwurz-Heiltrank | potion | Sofortheilung über Zeit. |
| `potion_frostranke_staerketrank` | Frostranke-Stärketrank | potion | Temporärer STR-Buff. |
| `potion_klarsicht_trank` | Klarsicht-Trank | potion | +Genauigkeit (DEX/INT). |
| `potion_totenmoos_antigift` | Totenmoos-Antigift | potion | Entfernt/widersteht Gift. |
| `potion_gluecksbalsam` | Glücksbalsam | potion | Temporärer LCK-Drop-Buff. |

### 3.13 Taschen & Behälter

| ID | Name | Typ | Notiz |
|---|---|---|---|
| `bag_leinensack` | Leinensack | bag | +kleine Inventarkapazität. |
| `bag_lederranzen` | Lederranzen | bag | Mittlere Kapazität. |
| `bag_jaegertasche` | Jägertasche | bag | +Loot-Slots beim Idle-Kampf. |
| `bag_schmiedsack` | Schmiedsack | bag | +Erz/Barren-Stapelgröße. |
| `bag_seelenbeutel` | Seelenbeutel | bag | Endgame, große Kapazität. |

### 3.14 Begleiter-Items (Bündnis-Skill)

| ID | Name | Typ | Notiz |
|---|---|---|---|
| `comp_aschkraehe` | Aschkrähe | companion | Passiver Loot-LCK-Bonus. |
| `comp_frostwolf` | Frostwolf | companion | Passiver Nahkampf-Schaden. |
| `comp_grubenmolch` | Grubenmolch | companion | Passiver Bergbau-Ertrag. |
| `comp_seelenkauz` | Seelenkauz | companion | Passiver Magie-XP-Bonus. |

> **Itemzahl gesamt (gelistet):** ~95 Items über alle Kategorien. Für 1.0 reicht das als Rückgrat; Zwischen-Tiers (z. B. Helm/Beine jeder Metallstufe) werden generativ aufgefüllt.

---

## 4. Monster-Roster & Zonen

5 Zonen, ~6 Monster je Zone (~32 inkl. Bosse). Level grob; Drops zeigen die Verbindung zu Sammeln/Verarbeitung.

### Zone 1 — Die Aschfelder (Lvl 1–20)
Verwehte graue Ebenen rund um die Startsiedlung.

| ID | Name | Lvl | Drops |
|---|---|---|---|
| `mob_aschratte` | Aschratte | 2 | Rohleder, Knochen, wenig Gold. |
| `mob_staubgeier` | Staubgeier | 5 | Federn, Rohleder. |
| `mob_morastkriecher` | Morastkriecher | 8 | Grauwurz, Aschestaub. |
| `mob_marodeur` | Verarmter Marodeur | 12 | Mürbeisen-Schrott, Gold. |
| `mob_pechkaefer` | Pechkäfer | 15 | Pechkohle, Chitin. |
| `boss_aschtyrann` | **Aschtyrann** (Boss) | 20 | Frostbronze-Rezept, seltener Ring. |

### Zone 2 — Der Schwarzdornwald (Lvl 18–40)
Dornige, immer dämmrige Waldzone mit Geisterholz.

| ID | Name | Lvl | Drops |
|---|---|---|---|
| `mob_dornwolf` | Dornwolf | 20 | Narbenleder, Reißzahn. |
| `mob_moosgolem` | Moosgolem | 24 | Grauschiefer, Totenmoos. |
| `mob_geisterhirsch` | Geisterhirsch | 28 | Geisterholz-Splitter, Sehnenfaden. |
| `mob_rankenhexe` | Rankenhexe | 32 | Frostranke, Trübkristall. |
| `mob_schwarzdorn_ent` | Schwarzdorn-Ent | 36 | Schwarzdorn-Holz, Aschrinde. |
| `boss_walddvogt` | **Der Waldvogt** (Boss) | 40 | Geisterholz-Bogenrezept, Schuppenleder. |

### Zone 3 — Die Schlackengrube (Lvl 38–62)
Heiße Bergbaustollen voll Schlacke und Glut.

| ID | Name | Lvl | Drops |
|---|---|---|---|
| `mob_grubenspinne` | Grubenspinne | 40 | Seidenfaden, Gift-Reagenz. |
| `mob_schlackenkobold` | Schlackenkobold | 44 | Aschenstahlerz, Gold. |
| `mob_glutelementar` | Glutelementar | 50 | Frostberyll, Aschestaub. |
| `mob_eisenrevenant` | Eisenrevenant | 56 | Aschenstahl-Schrott, Frostrune. |
| `mob_schwarzgussbestie` | Schwarzgussbestie | 60 | Schwarzgusserz, Schuppenleder. |
| `boss_schmelzherr` | **Der Schmelzherr** (Boss) | 62 | Schwarzguss-Rezept, Seelenopal. |

### Zone 4 — Die Frostkavernen (Lvl 60–88)
Eisige Tiefenhöhlen unter der sterbenden Welt.

| ID | Name | Lvl | Drops |
|---|---|---|---|
| `mob_frosthund` | Frosthund | 62 | Frostpelz, Narbenleder. |
| `mob_eishexer` | Eishexer | 68 | Frostberyll, Aetherrune. |
| `mob_klingenspinne` | Klingenspinne | 74 | Klingsilber-Splitter, Gift. |
| `mob_tiefenwurm` | Tiefenwurm | 80 | Schuppenleder, Klingsilbererz. |
| `mob_frostrevenant` | Frostrevenant | 85 | Seelenopal, Klingsilber-Schrott. |
| `boss_eiskoenigin` | **Die Eiskönigin** (Boss) | 88 | Klingsilber-Rezept, Aethergem (selten). |

### Zone 5 — Die Götzenhalle (Lvl 90–120)
Endgame-Ruinen alter Götzen, durchwirkt von Aether.

| ID | Name | Lvl | Drops |
|---|---|---|---|
| `mob_goetzenwaechter` | Götzenwächter | 92 | Götzeisenbrocken, Aethergem. |
| `mob_aetherwraith` | Aetherwraith | 98 | Aetherrune, Seelenopal. |
| `mob_drachenhaut_skarn` | Drachenhaut-Skarn | 104 | Drachenhautleder, Götzeisen. |
| `mob_seelenkoloss` | Seelenkoloss | 110 | Götzeisenbrocken, Aethergem. |
| `mob_aschwandler` | Aschwandler | 115 | Aschestaub (massenhaft), Götzeisen. |
| `boss_letzter_goetze` | **Der Letzte Götze** (Endboss) | 120 | Götzeisen-Endgame-Rezepte, einzigartiges Amulett, Mount-/Companion-Token. |

> **Drop-Logik:** Bestien droppen Hides/Reagenzien (Gerberei/Alchemie), humanoide/konstruierte Gegner droppen Erz-Schrott & Rezepte (Schmieden), magische Gegner droppen Edelsteine/Runen (Verzauberung). So speist jede Zone die zeitgemäße Verarbeitung.

---

## 5. Progression-Kurve

Wie sich Sammeln → Verarbeitung → Gear → Kampf gegenseitig gaten:

**Frühspiel (Lvl 1–30):**
- Spieler startet mit Bergbau/Holzfällen/Angeln auf Mürbeisen/Fahlholz/Schlammgrundel.
- Schmieden wandelt Erz→Barren→Mürbeisen/Klotzstahl-Gear; Kochen liefert erste Nahrung für längeren Idle-Kampf.
- Aschfelder-Monster sind mit Tier-1/2-Gear schlagbar; Boss-Drops (Frostbronze-Rezept) schalten den nächsten Tier-Sprung frei → **Gear gatet Zonenzugang**, Boss-Rezepte gaten Crafting.

**Mittelspiel (Lvl 30–65):**
- Sammel-Skills müssen mitziehen: Aschenstahlerz/Schwarzdornholz erfordern höhere Sammel-Level → **Sammeln gatet Verarbeitung**.
- Verzauberung wird relevant: Edelstein-Drops aus Schlackengrube ermöglichen Schmuck (+Maxhit/+LCK), das Kampfeffizienz hebt.
- Alchemie-Buffs (Stärketrank/Klarsicht) werden nötig, um Glutelementare/Revenants effizient idle zu farmen.
- Kochen-Tier muss zur eingehenden Schadenshöhe passen → **Nahrung gatet nachhaltigen Idle-Kampf**.

**Endspiel (Lvl 65–120):**
- Klingsilber/Götzeisen erfordern tiefe Bergbau-Level + Boss-Rezepte (Eiskönigin, Letzter Götze).
- Aethergem (selten) wird zum Engpass für Top-Magie-Gear → bewusster Grind-Gate.
- Companion-Skill (Bündnis) liefert passive Multiplikatoren, die Endgame-Idle-Raten tragbar machen.
- Zyklus schließt sich: Endboss-Drops sind sowohl Best-in-Slot-Items als auch Rezepte, sodass Crafting bis zur Levelgrenze relevant bleibt.

**Leitprinzip:** Jeder Tier-Sprung verlangt (a) ausreichendes Sammel-Level für das Rohmaterial, (b) ein Verarbeitungs-Level + ggf. Boss-Rezept, (c) genug Verteidigung/Nahrung, um die nächste Zone idle zu überstehen. Keine Stufe darf allein durch Gold-Kauf übersprungen werden.

---

## 6. Offene Balancing-Fragen

- **XP-Kurvenanker:** Wo genau liegen die Tier-Freischalt-Level relativ zur Lvl-120-Kurve? (Tier-Tabelle nutzt grobe Platzhalter.)
- **Nahrungsökonomie:** Heilt Nahrung pro Tick oder als Sofortheilung? Stackgröße vs. Idle-Dauer balancieren.
- **LCK-Skalierung:** Wie stark beeinflusst Glück Drop-Raten, ohne RNG-frustrierend oder Pflicht-Stat zu werden?
- **Boss-Rezept-Gating:** Sind Tier-Sprünge an Boss-Drops gebunden (hartes Gate) oder nur beschleunigt? Risiko von Soft-Locks bei Pech.
- **Aethergem-Seltenheit:** Drop-Rate des Endgame-Edelsteins — Grind-Wall vs. erreichbares Endziel.
- **Companion-Power-Budget:** Wie viel passive Effizienz dürfen Begleiter geben, bevor sie zur Pflicht statt zur Option werden?
- **Offhand-Munition:** Verbrauchen Pfeile sich pro Treffer (RuneScape-Modell) oder pauschal? Balance gegen Nah-/Magie-Kosten.
- **Magie-Runen-Kosten:** Kosten Sprüche Runen (Ressourcen-Sink) oder sind sie kostenlos? Beeinflusst Verzauberungs-Relevanz.
- **Zonen-Überlappung:** Level-Bänder der Zonen überschneiden sich bewusst — sicherstellen, dass keine "tote" Zone ohne Anreiz entsteht.
- **Parallele Materiallinien:** Sollen Leder/Holz/Magie exakt dieselben 7 Tiers haben oder bewusst versetzte Stufen für Abwechslung?
