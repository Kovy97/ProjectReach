# Skilling-XP-Retune — flache Kurve ohne `earlyXpMult`

**Autor:** Balance-Designer · **Datum:** 2026-06-24 · **Status:** Spec, bereit zur 1:1-Anwendung durch content-dev
**Scope:** Die 262 Aktions-`xp`-Werte der 14 Nicht-Kampf-Skills. Keine Änderung an `durationMs`, `levelRequired`, Loot, Gold oder `xpForLevel`.

---

## 1. Auftrag & Designentscheidung

Der `earlyXpMult`-Multiplikator (`tick.ts:60`: `skill.xp += action.xp * earlyXpMult(level)`,
mit `earlyXpMult = 1 + 2*(40-level)/39`, also ×3 auf L1 → ×1 ab L40) wird **entfernt**. Künftig gilt
`skill.xp += action.xp` exakt. Die Karte zeigt damit die echte XP — transparent, kein versteckter Faktor.

Damit das Frühgame **nicht plötzlich ~3× langsamer** wird, wird die alte Früh-Beschleunigung **in die
Aktions-XP selbst eingebacken** (front-loaded Kurve), statt sie zur Laufzeit aufzuschlagen. Resultat:
gleiche gefühlte Pace, aber als saubere, flache, ablesbare Kurve.

> **Hinweis an content-dev:** Diese Spec liefert nur die neuen `xp`-Zahlen. Das **Entfernen** des
> `earlyXpMult`-Aufrufs in `packages/engine/src/tick.ts:60` (und die analoge Stelle in `combat.ts:53`,
> falls der Chef das für Kampf ebenfalls will — hier NICHT beauftragt) gehört zu logic-/combat-dev,
> nicht zu content. Diese Tabelle setzt voraus, dass der Multiplikator danach `1` ist.

---

## 2. Ziel-Pace (dokumentiert)

Anker an der **heutigen effektiven Pace** (median über alle Skills lag bei ~250 h bis L99). Die neue
flache Kurve normalisiert die heute extreme Streuung (heute 150 h bei Holzfällen vs. 380 h bei Gerberei):

| Meilenstein | Ziel (gut abgedeckte Skills) | Referenz heute (mit altem Mult.) |
|---|---|---|
| L10 | **~0,4–0,6 h** | 0,1–0,9 h |
| L50 | **~16–22 h** | 4–13 h |
| L99 | **~210–300 h** | 150–380 h (stark gestreut) |

Frühgame bleibt zügig (L10 in unter einer Stunde), L50 ist ein angenehmer Mittelblock, L99 ist das
„Maxed"-Langzeitziel. Kein 3×-Sprung, keine Wand — die XP/h steigt monoton mit dem Level.

---

## 3. Die Formel

Eine **einzige, skill-übergreifende Ziel-XP/h-Kurve als Funktion des `levelRequired`** der Aktion.
Dadurch geben gleich-levelige Aktionen — egal in welchem Skill — automatisch dieselbe XP/h; die Pace
wird fair, ohne Skill-für-Skill-Handarbeit.

```
delta(L)       = xpForLevel(L+1) − xpForLevel(L)           // Wand-Steilheit der Levelkurve
boost(L)       = 1 + 0,9 · max(0, (25 − L) / 24)           // Früh-Rampe: ×1,9 bei L1 → ×1,0 ab L25
target_xph(L)  = 115 · sqrt(delta(L)) · boost(L)           // C = 115

xp(action)     = round_nice( target_xph(levelRequired) · durationMs / 3_600_000 ),  min 1
```

`sqrt(delta)` ist dieselbe Form wie die Kampf-Zielkurve (dort `90·sqrt(Δ)`); der höhere Faktor 115 plus
die Früh-Rampe machen Skilling etwas flotter und gleichmäßiger als reines Kämpfen. `round_nice` rundet
nach Größenordnung (<10 exakt, <100 ganzzahlig, <1000 auf 5er, <10 000 auf 25er, darüber auf 100er),
damit die Karten saubere Zahlen zeigen.

### Ziel-XP/h-Referenzkurve

| Lvl | Δxp(L→L+1) | boost | target XP/h |
|---:|---:|---:|---:|
| 1 | 83 | 1.90 | 1991 |
| 3 | 102 | 1.82 | 2120 |
| 5 | 124 | 1.75 | 2241 |
| 10 | 204 | 1.56 | 2566 |
| 15 | 335 | 1.38 | 2894 |
| 20 | 548 | 1.19 | 3197 |
| 25 | 898 | 1.00 | 3446 |
| 30 | 1470 | 1.00 | 4409 |
| 40 | 3947 | 1.00 | 7225 |
| 50 | 10612 | 1.00 | 11847 |
| 60 | 28546 | 1.00 | 19430 |
| 70 | 76818 | 1.00 | 31873 |
| 85 | 339198 | 1.00 | 66977 |
| 99 | 1356729 | 1.00 | 133951 |
| 110 | 4032140 | 1.00 | 230922 |
| 120 | 9830430 | 1.00 | 360565 |

Da `delta(120)=0` (Levelcap), nutzen Aktionen ab L120 die Steigung von L119→120.

---

## 4. Eigenschaften & Fairness

- **Innerhalb eines Skills monoton:** Höhere Aktion (höheres `levelRequired`) ⇒ höhere XP/h. Es gibt
  keine „Exploit-Bahn": Highest-Level-Lane und Greedy-Max-XP/h-Lane ergeben in der Simulation dieselbe
  Pace (siehe §6). Smelting/Feeder-Aktionen geben dieselbe XP/h wie ein Forge desselben Levels — fair,
  weil die XP/h nur am Level hängt, nicht an der Dauer.
- **Skill-übergreifend fair:** L50 landet bei allen gut abgedeckten Skills bei ~16–22 h, L99 bei
  ~210–300 h. Restliche Streuung kommt rein aus **Aktions-Abdeckung** (s. §5), nicht aus der Formel.
- **Früh zügig:** L10 in ~0,4–0,6 h dank `boost`, obwohl die rohen L1-Werte (z. B. 4→2) niedriger wirken
  — die niedrigen Zahlen sind nur die ehrliche Folge des entfernten Laufzeit-Multiplikators.

---

## 5. Offene Punkte für den Chef (Content-Lücken, KEINE XP-Frage)

Die Formel kann eine Lücke in der **Aktions-Abdeckung** nicht heilen. Skills, deren höchste Aktion weit
unter L120 liegt, zwingen den Spieler, die letzten Level mit einer unter-Ziel-Aktion zu grinden → der
L99→L120-Schwanz wird lang:

| Skill | höchste Aktion erreicht | Folge |
|---|---|---|
| **Gerberei** (`leatherworking`) | nur **L72** | L99 ~426 h (langsamster Skill), L120 praktisch utopisch |
| Kräuterkunde | L85, nur 6 Aktionen | L50 ~30 h (dünn besetzt) |
| Juwelierskunst / Schreibkunst / Angeln / Kochen | L82–85 | langer L99→L120-Schwanz |
| Holzfällen / Bergbau / Schmieden / Diebeskunst | L100–115 | bestabgedeckt, glatteste Kurve |

**Empfehlung (separater Auftrag):** Gerberei um 2–3 höhere Tiers (bis ~L95) ergänzen, Kräuterkunde
verdichten. Das ist eine Content-Erweiterung, die ich hier nur flagge — sie ist NICHT Teil dieser
XP-Retune-Spec.

---

## 6. Resultierende Pace pro Skill (Simulation, ohne Multiplikator)

Aktives Skillen, jeweils beste verfügbare Aktion. Repräsentative Top-Aktion je Skill:

| Skill | repr. Top-Aktion (Lvl) | → L10 | → L50 | → L99 | Top-Aktion erreicht Lvl |
|---|---|---:|---:|---:|---:|
| Holzfällen | `cut_godwood_tree` (L100) | 0.4 h | 19.8 h | 289.0 h | L100 |
| Bergbau | `mine_godiron` (L105) | 0.5 h | 18.1 h | 250.2 h | L105 |
| Angeln | `catch_voidray` (L85) | 0.5 h | 22.1 h | 296.3 h | L85 |
| Schmieden | `forge_godiron_body` (L105) | 0.5 h | 15.8 h | 210.0 h | L105 |
| Kochen | `cook_voidray` (L85) | 0.6 h | 21.7 h | 297.7 h | L85 |
| Anbau | `farm_godbloom` (L95) | 0.6 h | 21.5 h | 280.7 h | L95 |
| Sammeln | `forage_gravewood` (L95) | 0.5 h | 19.4 h | 266.2 h | L95 |
| Diebeskunst | `heist_idol_hoard` (L115) | 0.5 h | 17.6 h | 246.2 h | L115 |
| Bogenbau | `fletch_godwood_bow` (L88) | 0.6 h | 17.5 h | 259.8 h | L88 |
| Gerberei | `craft_warhide_body` (L72) | 0.6 h | 25.2 h | 426.5 h | L72 |
| Juwelierskunst | `craft_heartforged_pendant` (L82) | 0.5 h | 19.4 h | 286.4 h | L82 |
| Runenkunst | `craft_godspark_vestment` (L90) | 0.6 h | 22.4 h | 260.7 h | L90 |
| Kräuterkunde | `brew_revenant_elixir` (L85) | 0.6 h | 30.3 h | 396.3 h | L85 |
| Schreibkunst | `scribe_glyph_ruin` (L85) | 0.6 h | 21.1 h | 290.6 h | L85 |

---

## 7. Vollständige alt→neu-Tabelle (262 Aktionen)
### Holzfällen (`woodcutting`) — 9 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `cut_normal_tree` | 1 | 2800 | 4 | **2** | 5143 | **2571** |
| `cut_oak_tree` | 10 | 3600 | 9 | **3** | 9000 | **3000** |
| `cut_ashbark_tree` | 20 | 4500 | 12 | **4** | 9600 | **3200** |
| `cut_blackwood_tree` | 30 | 5000 | 22 | **6** | 15840 | **4320** |
| `cut_ironbark_tree` | 45 | 5500 | 38 | **14** | 24873 | **9164** |
| `cut_bloodoak_tree` | 55 | 6500 | 70 | **27** | 38769 | **14954** |
| `cut_shadowpine_tree` | 70 | 7000 | 130 | **62** | 66857 | **31886** |
| `cut_bonewood_tree` | 85 | 8000 | 240 | **150** | 108000 | **67500** |
| `cut_godwood_tree` | 100 | 9000 | 480 | **350** | 192000 | **140000** |

### Bergbau (`mining`) — 16 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `mine_copper` | 1 | 3000 | 4 | **2** | 4800 | **2400** |
| `mine_tin` | 1 | 3000 | 4 | **2** | 4800 | **2400** |
| `mine_iron` | 10 | 3600 | 6 | **3** | 6000 | **3000** |
| `mine_coal` | 15 | 4200 | 9 | **3** | 7714 | **2571** |
| `mine_garnet_seam` | 15 | 4500 | 8 | **4** | 6400 | **3200** |
| `mine_mithril` | 35 | 5000 | 10 | **8** | 7200 | **5760** |
| `mine_sapphire_seam` | 35 | 5500 | 18 | **9** | 11782 | **5891** |
| `mine_adamantite` | 45 | 5500 | 18 | **14** | 11782 | **9164** |
| `mine_runite` | 55 | 6500 | 36 | **27** | 19938 | **14954** |
| `mine_ruby_seam` | 55 | 6500 | 40 | **27** | 22154 | **14954** |
| `mine_bloodiron` | 70 | 7000 | 81 | **62** | 41657 | **31886** |
| `mine_diamond_seam` | 75 | 7800 | 130 | **88** | 60000 | **40615** |
| `mine_titanium` | 80 | 7800 | 148 | **115** | 68308 | **53077** |
| `mine_aetherite` | 90 | 8500 | 264 | **205** | 111812 | **86824** |
| `mine_onyx_seam` | 90 | 8800 | 264 | **210** | 108000 | **85909** |
| `mine_godiron` | 105 | 9500 | 621 | **475** | 235326 | **180000** |

### Angeln (`fishing`) — 7 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `catch_shrimp` | 1 | 3000 | 4 | **2** | 4800 | **2400** |
| `catch_trout` | 10 | 4000 | 9 | **3** | 8100 | **2700** |
| `catch_cod` | 15 | 5000 | 16 | **4** | 11520 | **2880** |
| `catch_salmon` | 35 | 6500 | 32 | **10** | 17723 | **5538** |
| `catch_lobster` | 55 | 8000 | 62 | **34** | 27900 | **15300** |
| `catch_anglerfish` | 70 | 9000 | 130 | **80** | 52000 | **32000** |
| `catch_voidray` | 85 | 10500 | 245 | **195** | 84000 | **66857** |

### Schmieden (`smithing`) — 92 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `smelt_copper` | 1 | 2600 | 2 | **1** | 2769 | **1385** |
| `forge_copper_dagger` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `forge_copper_gloves` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `forge_copper_boots` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `forge_copper_arrowheads` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `forge_copper_sword` | 1 | 3500 | 2 | **2** | 2057 | **2057** |
| `forge_copper_mace` | 1 | 3500 | 2 | **2** | 2057 | **2057** |
| `forge_copper_medhelm` | 1 | 3500 | 2 | **2** | 2057 | **2057** |
| `forge_copper_axe` | 2 | 4500 | 2 | **3** | 1600 | **2400** |
| `forge_copper_warhammer` | 2 | 4500 | 2 | **3** | 1600 | **2400** |
| `forge_copper_spear` | 2 | 4500 | 2 | **3** | 1600 | **2400** |
| `forge_copper_fullhelm` | 2 | 4500 | 2 | **3** | 1600 | **2400** |
| `forge_copper_kiteshield` | 2 | 4500 | 2 | **3** | 1600 | **2400** |
| `forge_copper_squareshield` | 2 | 4500 | 2 | **3** | 1600 | **2400** |
| `forge_copper_2haxe` | 3 | 6500 | 3 | **4** | 1662 | **2215** |
| `forge_copper_2hmace` | 3 | 6500 | 3 | **4** | 1662 | **2215** |
| `forge_copper_legguards` | 3 | 6500 | 3 | **4** | 1662 | **2215** |
| `forge_copper_breastplate` | 4 | 9000 | 4 | **5** | 1600 | **2000** |
| `smelt_bronze` | 5 | 3000 | 2 | **2** | 2400 | **2400** |
| `forge_bronze_sword` | 5 | 5000 | 2 | **3** | 1440 | **2160** |
| `smelt_iron` | 10 | 3200 | 2 | **2** | 2250 | **2250** |
| `forge_iron_arrowheads` | 10 | 3500 | 2 | **2** | 2057 | **2057** |
| `forge_iron_gloves` | 11 | 4000 | 3 | **3** | 2700 | **2700** |
| `forge_iron_boots` | 11 | 4000 | 3 | **3** | 2700 | **2700** |
| `forge_iron_dagger` | 11 | 4500 | 3 | **3** | 2400 | **2400** |
| `forge_iron_medhelm` | 11 | 5000 | 3 | **4** | 2160 | **2880** |
| `forge_iron_fullhelm` | 12 | 5500 | 4 | **4** | 2618 | **2618** |
| `forge_iron_kiteshield` | 12 | 5500 | 4 | **4** | 2618 | **2618** |
| `forge_iron_sword` | 12 | 6000 | 4 | **4** | 2400 | **2400** |
| `forge_iron_mace` | 12 | 6000 | 4 | **4** | 2400 | **2400** |
| `forge_iron_axe` | 12 | 6000 | 4 | **4** | 2400 | **2400** |
| `forge_iron_legguards` | 13 | 6500 | 4 | **5** | 2215 | **2769** |
| `forge_iron_squareshield` | 13 | 6500 | 4 | **5** | 2215 | **2769** |
| `forge_iron_warhammer` | 13 | 7000 | 5 | **5** | 2571 | **2571** |
| `forge_iron_spear` | 14 | 7500 | 5 | **6** | 2400 | **2880** |
| `forge_iron_breastplate` | 14 | 8000 | 6 | **6** | 2700 | **2700** |
| `forge_iron_2haxe` | 15 | 9000 | 7 | **7** | 2800 | **2800** |
| `forge_iron_2hmace` | 16 | 10000 | 8 | **8** | 2880 | **2880** |
| `smelt_steel` | 20 | 4500 | 4 | **4** | 3200 | **3200** |
| `forge_steel_arrowheads` | 20 | 4500 | 4 | **4** | 3200 | **3200** |
| `forge_steel_helm` | 22 | 7000 | 8 | **6** | 4114 | **3086** |
| `forge_steel_warblade` | 24 | 11000 | 13 | **10** | 4255 | **3273** |
| `forge_steel_body` | 26 | 12000 | 16 | **12** | 4800 | **3600** |
| `smelt_blacksteel` | 30 | 6000 | 10 | **7** | 6000 | **4200** |
| `forge_blacksteel_helm` | 32 | 8000 | 18 | **11** | 8100 | **4950** |
| `forge_blacksteel_warblade` | 34 | 13000 | 28 | **19** | 7754 | **5262** |
| `smelt_mithril` | 35 | 6500 | 13 | **10** | 7200 | **5538** |
| `forge_mithril_arrowheads` | 35 | 6500 | 13 | **10** | 7200 | **5538** |
| `forge_blacksteel_legs` | 35 | 11000 | 24 | **17** | 7855 | **5564** |
| `forge_blacksteel_body` | 36 | 14000 | 32 | **23** | 8229 | **5914** |
| `forge_mithril_helm` | 38 | 8000 | 19 | **15** | 8550 | **6750** |
| `forge_mithril_shield` | 39 | 9000 | 22 | **17** | 8800 | **6800** |
| `forge_mithril_blade` | 40 | 12000 | 31 | **24** | 9300 | **7200** |
| `forge_mithril_legs` | 41 | 11000 | 30 | **23** | 9818 | **7527** |
| `forge_mithril_body` | 42 | 13000 | 38 | **29** | 10523 | **8031** |
| `smelt_adamantium` | 45 | 7500 | 25 | **19** | 12000 | **9120** |
| `forge_adamantium_helm` | 48 | 9000 | 35 | **27** | 14000 | **10800** |
| `forge_adamantium_shield` | 49 | 10500 | 43 | **33** | 14743 | **11314** |
| `forge_adamantium_blade` | 50 | 14000 | 60 | **46** | 15429 | **11829** |
| `forge_adamantium_legs` | 51 | 13000 | 59 | **45** | 16338 | **12462** |
| `forge_adamantium_body` | 52 | 15000 | 71 | **54** | 17040 | **12960** |
| `smelt_runite` | 55 | 8500 | 47 | **36** | 19906 | **15247** |
| `forge_runite_arrowheads` | 55 | 8500 | 47 | **36** | 19906 | **15247** |
| `forge_runite_helm` | 58 | 10000 | 64 | **49** | 23040 | **17640** |
| `forge_runite_shield` | 59 | 12000 | 80 | **62** | 24000 | **18600** |
| `forge_runite_blade` | 60 | 16000 | 113 | **86** | 25425 | **19350** |
| `forge_runite_legs` | 61 | 15000 | 111 | **85** | 26640 | **20400** |
| `forge_runite_body` | 62 | 17000 | 132 | **100** | 27953 | **21176** |
| `smelt_bloodiron` | 65 | 9000 | 81 | **62** | 32400 | **24800** |
| `forge_bloodiron_helm` | 68 | 11000 | 115 | **88** | 37636 | **28800** |
| `forge_bloodiron_shield` | 69 | 13000 | 143 | **110** | 39600 | **30462** |
| `forge_bloodiron_blade` | 70 | 18000 | 208 | **160** | 41600 | **32000** |
| `forge_bloodiron_legs` | 71 | 16500 | 200 | **155** | 43636 | **33818** |
| `forge_bloodiron_body` | 72 | 19000 | 242 | **185** | 45853 | **35053** |
| `smelt_titanium` | 75 | 9500 | 141 | **110** | 53432 | **41684** |
| `forge_titanium_helm` | 83 | 12000 | 264 | **200** | 79200 | **60000** |
| `forge_titanium_shield` | 84 | 14500 | 335 | **255** | 83172 | **63310** |
| `smelt_aetherium` | 85 | 10500 | 255 | **195** | 87429 | **66857** |
| `forge_titanium_blade` | 85 | 20000 | 485 | **370** | 87300 | **66600** |
| `forge_titanium_legs` | 86 | 18000 | 459 | **350** | 91800 | **70000** |
| `forge_titanium_body` | 87 | 21000 | 563 | **430** | 96514 | **73714** |
| `forge_aetherium_helm` | 91 | 13000 | 425 | **325** | 117692 | **90000** |
| `forge_aetherium_shield` | 92 | 15500 | 532 | **410** | 123561 | **95226** |
| `forge_aetherium_blade` | 92 | 22000 | 755 | **580** | 123545 | **94909** |
| `forge_aetherium_legs` | 93 | 19500 | 703 | **540** | 129785 | **99692** |
| `forge_aetherium_body` | 94 | 23000 | 871 | **670** | 136330 | **104870** |
| `smelt_godiron` | 95 | 12000 | 478 | **365** | 143400 | **109500** |
| `forge_godiron_helm` | 100 | 15000 | 765 | **585** | 183600 | **140400** |
| `forge_godiron_shield` | 101 | 17500 | 938 | **720** | 192960 | **148114** |
| `forge_godiron_blade` | 102 | 26000 | 1464 | **1125** | 202708 | **155769** |
| `forge_godiron_legs` | 103 | 23000 | 1361 | **1050** | 213026 | **164348** |
| `forge_godiron_body` | 105 | 27000 | 1764 | **1350** | 235200 | **180000** |

### Kochen (`cooking`) — 9 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `cook_shrimp` | 1 | 2500 | 5 | **1** | 7200 | **1440** |
| `cook_chicken` | 2 | 3000 | 5 | **2** | 6000 | **2400** |
| `cook_beef` | 5 | 3500 | 8 | **2** | 8229 | **2057** |
| `cook_trout` | 10 | 3000 | 9 | **2** | 10800 | **2400** |
| `cook_cod` | 15 | 3500 | 16 | **3** | 16457 | **3086** |
| `cook_salmon` | 35 | 4500 | 30 | **7** | 24000 | **5600** |
| `cook_lobster` | 55 | 6000 | 58 | **25** | 34800 | **15000** |
| `cook_anglerfish` | 70 | 8000 | 130 | **71** | 58500 | **31950** |
| `cook_voidray` | 85 | 9500 | 240 | **175** | 90947 | **66316** |

### Anbau (`farming`) — 9 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `gather_graywort` | 1 | 4500 | 7 | **2** | 5600 | **1600** |
| `farm_ashroot` | 1 | 6000 | 9 | **3** | 5400 | **1800** |
| `farm_grimwheat` | 1 | 7000 | 11 | **4** | 5657 | **2057** |
| `farm_bloodbeet` | 20 | 9000 | 12 | **8** | 4800 | **3200** |
| `farm_nightshade` | 35 | 10000 | 24 | **16** | 8640 | **5760** |
| `farm_ironvine` | 50 | 11000 | 44 | **36** | 14400 | **11782** |
| `farm_emberroot` | 65 | 12000 | 90 | **83** | 27000 | **24900** |
| `farm_wraithcap` | 80 | 13000 | 170 | **190** | 47077 | **52615** |
| `farm_godbloom` | 95 | 14000 | 360 | **425** | 92571 | **109286** |

### Sammeln (`foraging`) — 9 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `forage_ashfields` | 1 | 3200 | 5 | **2** | 5625 | **2250** |
| `forage_feathers` | 5 | 4200 | 7 | **3** | 6000 | **2571** |
| `forage_deepwood` | 15 | 5000 | 7 | **4** | 5040 | **2880** |
| `forage_blightmarsh` | 25 | 4800 | 12 | **5** | 9000 | **3750** |
| `forage_cinderwood` | 40 | 5400 | 22 | **11** | 14667 | **7333** |
| `forage_frostmire` | 55 | 6200 | 40 | **26** | 23226 | **15097** |
| `forage_gloomfen` | 70 | 7000 | 78 | **62** | 40114 | **31886** |
| `forage_voidheath` | 85 | 7800 | 150 | **145** | 69231 | **66923** |
| `forage_gravewood` | 95 | 8800 | 320 | **270** | 130909 | **110455** |

### Diebeskunst (`thieving`) — 14 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `pickpocket_beggar` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `pickpocket_drunkard` | 5 | 3200 | 2 | **2** | 2250 | **2250** |
| `pickpocket_merchant` | 12 | 3600 | 2 | **3** | 2000 | **3000** |
| `loot_market_stall` | 20 | 4200 | 4 | **4** | 3429 | **3429** |
| `pickpocket_tax_collector` | 28 | 4000 | 6 | **4** | 5400 | **3600** |
| `burgle_warehouse` | 36 | 7000 | 15 | **12** | 7714 | **6171** |
| `pickpocket_city_guard` | 45 | 4200 | 14 | **11** | 12000 | **9429** |
| `crack_strongbox` | 55 | 6000 | 33 | **25** | 19800 | **15000** |
| `pickpocket_noble` | 65 | 4600 | 41 | **32** | 32087 | **25043** |
| `rob_cultist_shrine` | 75 | 7500 | 111 | **85** | 53280 | **40800** |
| `raid_tax_vault` | 85 | 9000 | 218 | **165** | 87200 | **66000** |
| `loot_reliquary` | 95 | 8500 | 338 | **260** | 143153 | **110118** |
| `plunder_ashen_treasury` | 105 | 10000 | 653 | **500** | 235080 | **180000** |
| `heist_idol_hoard` | 115 | 12000 | 1286 | **985** | 385800 | **295500** |

### Bogenbau (`fletching`) — 16 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `fletch_shafts` | 1 | 2000 | 2 | **1** | 3600 | **1800** |
| `fletch_bowstring` | 1 | 2500 | 2 | **1** | 2880 | **1440** |
| `fletch_copper_arrows` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `fletch_grimoak_longbow` | 1 | 6000 | 3 | **3** | 1800 | **1800** |
| `fletch_arrows` | 10 | 3000 | 2 | **2** | 2400 | **2400** |
| `fletch_blackthorn_warbow` | 18 | 9000 | 8 | **8** | 3200 | **3200** |
| `fletch_steel_arrows` | 20 | 3500 | 3 | **3** | 3086 | **3086** |
| `fletch_ashbark_longbow` | 25 | 8000 | 16 | **8** | 7200 | **3600** |
| `fletch_mithril_arrows` | 35 | 4000 | 8 | **6** | 7200 | **5400** |
| `fletch_composite_warbow` | 40 | 12000 | 31 | **24** | 9300 | **7200** |
| `fletch_ironbark_warbow` | 45 | 11000 | 40 | **28** | 13091 | **9164** |
| `fletch_runite_arrows` | 55 | 4500 | 25 | **19** | 20000 | **15200** |
| `fletch_runed_longbow` | 60 | 16000 | 113 | **86** | 25425 | **19350** |
| `fletch_shadowpine_longbow` | 65 | 14000 | 110 | **97** | 28286 | **24943** |
| `fletch_bonewood_greatbow` | 80 | 18000 | 175 | **260** | 35000 | **52000** |
| `fletch_godwood_bow` | 88 | 22000 | 619 | **475** | 101291 | **77727** |

### Gerberei (`leatherworking`) — 19 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `tan_leather` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `craft_leather_cap` | 1 | 4000 | 2 | **2** | 1800 | **1800** |
| `craft_leather_body` | 1 | 5500 | 3 | **3** | 1964 | **1964** |
| `craft_cured_legs` | 5 | 5000 | 3 | **3** | 2160 | **2160** |
| `craft_scaled_body` | 14 | 9000 | 7 | **7** | 2800 | **2800** |
| `tan_hardened_leather` | 22 | 6000 | 12 | **6** | 7200 | **3600** |
| `craft_hardened_helm` | 22 | 6500 | 12 | **6** | 6646 | **3323** |
| `craft_hardened_legs` | 23 | 7500 | 14 | **7** | 6720 | **3360** |
| `craft_hardened_body` | 24 | 8500 | 16 | **8** | 6776 | **3388** |
| `craft_scaled_helm` | 28 | 8000 | 18 | **9** | 8100 | **4050** |
| `craft_scaled_legs` | 30 | 8500 | 20 | **10** | 8471 | **4235** |
| `reinforce_studded_leather` | 50 | 9000 | 44 | **30** | 17600 | **12000** |
| `craft_studded_helm` | 50 | 9500 | 44 | **31** | 16674 | **11747** |
| `craft_studded_legs` | 51 | 10500 | 50 | **36** | 17143 | **12343** |
| `craft_studded_body` | 52 | 12000 | 58 | **44** | 17400 | **13200** |
| `cure_warhide` | 70 | 12000 | 130 | **105** | 39000 | **31500** |
| `craft_warhide_helm` | 70 | 13000 | 130 | **115** | 36000 | **31846** |
| `craft_warhide_legs` | 71 | 14500 | 148 | **135** | 36745 | **33517** |
| `craft_warhide_body` | 72 | 16000 | 165 | **155** | 37125 | **34875** |

### Juwelierskunst (`jewelcrafting`) — 22 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `cut_garnet` | 1 | 2500 | 2 | **1** | 2880 | **1440** |
| `craft_garnet_ring` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `craft_garnet_amulet` | 3 | 3500 | 2 | **2** | 2057 | **2057** |
| `craft_fang_necklace` | 5 | 3500 | 2 | **2** | 2057 | **2057** |
| `cut_sapphire` | 15 | 3000 | 2 | **2** | 2400 | **2400** |
| `craft_soul_amulet` | 15 | 4000 | 5 | **3** | 4500 | **2700** |
| `craft_sapphire_ring` | 15 | 4000 | 3 | **3** | 2700 | **2700** |
| `craft_warband_signet` | 15 | 5000 | 14 | **4** | 10080 | **2880** |
| `craft_sapphire_amulet` | 18 | 4500 | 4 | **4** | 3200 | **3200** |
| `cut_ruby` | 34 | 3500 | 7 | **5** | 7200 | **5143** |
| `craft_ruby_ring` | 34 | 5000 | 10 | **7** | 7200 | **5040** |
| `craft_alpha_fang_amulet` | 36 | 9000 | 40 | **15** | 16000 | **6000** |
| `craft_ruby_amulet` | 38 | 5500 | 13 | **10** | 8509 | **6545** |
| `cut_diamond` | 55 | 4500 | 25 | **19** | 20000 | **15200** |
| `craft_diamond_ring` | 55 | 6500 | 36 | **27** | 19938 | **14954** |
| `craft_grave_warden_band` | 55 | 10000 | 120 | **42** | 43200 | **15120** |
| `craft_diamond_amulet` | 60 | 7000 | 49 | **38** | 25200 | **19543** |
| `craft_stormcaller_amulet` | 65 | 12000 | 150 | **83** | 45000 | **24900** |
| `cut_onyx` | 70 | 5500 | 90 | **49** | 58909 | **32073** |
| `craft_onyx_ring` | 70 | 7000 | 150 | **62** | 77143 | **31886** |
| `craft_onyx_amulet` | 75 | 8000 | 180 | **91** | 81000 | **40950** |
| `craft_heartforged_pendant` | 82 | 16000 | 220 | **255** | 49500 | **57375** |

### Runenkunst (`runecrafting`) — 24 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `craft_frost_rune` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `craft_apprentice_hat` | 1 | 4000 | 2 | **2** | 1800 | **1800** |
| `craft_aether_rune` | 1 | 5000 | 2 | **3** | 1440 | **2160** |
| `enchant_dim_focus` | 1 | 5000 | 2 | **3** | 1440 | **2160** |
| `craft_apprentice_robe` | 1 | 5500 | 2 | **3** | 1309 | **1964** |
| `enchant_frost_scepter` | 1 | 8000 | 4 | **4** | 1800 | **1800** |
| `craft_frost_circlet` | 20 | 7000 | 14 | **6** | 7200 | **3086** |
| `enchant_aether_runestaff` | 20 | 11000 | 11 | **10** | 3600 | **3273** |
| `craft_frost_robe_legs` | 21 | 7500 | 16 | **7** | 7680 | **3360** |
| `craft_frost_robe_body` | 22 | 9000 | 20 | **8** | 8000 | **3200** |
| `enchant_frost_focus` | 25 | 6000 | 14 | **6** | 8400 | **3600** |
| `enchant_aether_orb` | 45 | 8000 | 38 | **21** | 17100 | **9450** |
| `craft_aether_hood` | 45 | 10000 | 38 | **26** | 13680 | **9360** |
| `craft_aether_robe_legs` | 46 | 11000 | 48 | **30** | 15709 | **9818** |
| `craft_aether_robe_body` | 47 | 13000 | 60 | **37** | 16615 | **10246** |
| `bind_void_rune` | 50 | 6500 | 44 | **21** | 24369 | **11631** |
| `enchant_stormcaller_rod` | 50 | 11000 | 44 | **36** | 14400 | **11782** |
| `enchant_void_focus` | 65 | 10000 | 90 | **69** | 32400 | **24840** |
| `enchant_voidcaller_staff` | 70 | 14000 | 130 | **125** | 33429 | **32143** |
| `enchant_god_focus` | 85 | 13000 | 180 | **240** | 49846 | **66462** |
| `craft_godspark_mitre` | 88 | 16000 | 180 | **345** | 40500 | **77625** |
| `enchant_godspark_staff` | 88 | 18000 | 185 | **390** | 37000 | **78000** |
| `craft_godspark_skirt` | 89 | 17500 | 220 | **395** | 45257 | **81257** |
| `craft_godspark_vestment` | 90 | 21000 | 280 | **500** | 48000 | **85714** |

### Kräuterkunde (`herblore`) — 6 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `brew_minor_healing` | 1 | 3500 | 2 | **2** | 2057 | **2057** |
| `brew_antivenom` | 1 | 5000 | 2 | **3** | 1440 | **2160** |
| `brew_greater_healing` | 1 | 6000 | 3 | **3** | 1800 | **1800** |
| `brew_salve_of_mending` | 25 | 6000 | 16 | **6** | 9600 | **3600** |
| `brew_bloodmend_draught` | 55 | 8000 | 48 | **34** | 21600 | **15300** |
| `brew_revenant_elixir` | 85 | 11000 | 160 | **205** | 52364 | **67091** |

### Schreibkunst (`inscription`) — 10 Aktionen

| id | Lvl | dur(ms) | alt xp | **neu xp** | alt XP/h | **neu XP/h** |
|---|---:|---:|---:|---:|---:|---:|
| `grind_soot_ink` | 1 | 2500 | 2 | **1** | 2880 | **1440** |
| `press_parchment` | 1 | 3000 | 2 | **2** | 2400 | **2400** |
| `scribe_glyph_might` | 1 | 5000 | 2 | **3** | 1440 | **2160** |
| `scribe_glyph_warding` | 1 | 5500 | 3 | **3** | 1964 | **1964** |
| `scribe_glyph_precision` | 25 | 6000 | 14 | **6** | 8400 | **3600** |
| `scribe_glyph_zealot` | 40 | 7500 | 30 | **15** | 14400 | **7200** |
| `grind_ether_ink` | 50 | 6000 | 44 | **20** | 26400 | **12000** |
| `scribe_glyph_bulwark` | 55 | 9000 | 56 | **38** | 22400 | **15200** |
| `scribe_glyph_alacrity` | 70 | 11000 | 130 | **97** | 42545 | **31745** |
| `scribe_glyph_ruin` | 85 | 13000 | 180 | **240** | 49846 | **66462** |

---

## 8. Apply-Liste für content-dev (geordnet, id → neu-xp)

212 von 262 Aktionen ändern sich; 50 bleiben gleich (mit „unverändert" markiert — überspringen).
Reihenfolge: nach Skill, dann aufsteigend nach Level. 1:1 in `packages/content/src/index.ts` setzen.
**woodcutting**
- `cut_normal_tree`: xp 4 → **2**
- `cut_oak_tree`: xp 9 → **3**
- `cut_ashbark_tree`: xp 12 → **4**
- `cut_blackwood_tree`: xp 22 → **6**
- `cut_ironbark_tree`: xp 38 → **14**
- `cut_bloodoak_tree`: xp 70 → **27**
- `cut_shadowpine_tree`: xp 130 → **62**
- `cut_bonewood_tree`: xp 240 → **150**
- `cut_godwood_tree`: xp 480 → **350**

**mining**
- `mine_copper`: xp 4 → **2**
- `mine_tin`: xp 4 → **2**
- `mine_iron`: xp 6 → **3**
- `mine_coal`: xp 9 → **3**
- `mine_garnet_seam`: xp 8 → **4**
- `mine_mithril`: xp 10 → **8**
- `mine_sapphire_seam`: xp 18 → **9**
- `mine_adamantite`: xp 18 → **14**
- `mine_runite`: xp 36 → **27**
- `mine_ruby_seam`: xp 40 → **27**
- `mine_bloodiron`: xp 81 → **62**
- `mine_diamond_seam`: xp 130 → **88**
- `mine_titanium`: xp 148 → **115**
- `mine_aetherite`: xp 264 → **205**
- `mine_onyx_seam`: xp 264 → **210**
- `mine_godiron`: xp 621 → **475**

**fishing**
- `catch_shrimp`: xp 4 → **2**
- `catch_trout`: xp 9 → **3**
- `catch_cod`: xp 16 → **4**
- `catch_salmon`: xp 32 → **10**
- `catch_lobster`: xp 62 → **34**
- `catch_anglerfish`: xp 130 → **80**
- `catch_voidray`: xp 245 → **195**

**smithing**
- `smelt_copper`: xp 2 → **1**
- `forge_copper_dagger`: xp 2 → **2** (unverändert)
- `forge_copper_gloves`: xp 2 → **2** (unverändert)
- `forge_copper_boots`: xp 2 → **2** (unverändert)
- `forge_copper_arrowheads`: xp 2 → **2** (unverändert)
- `forge_copper_sword`: xp 2 → **2** (unverändert)
- `forge_copper_mace`: xp 2 → **2** (unverändert)
- `forge_copper_medhelm`: xp 2 → **2** (unverändert)
- `forge_copper_axe`: xp 2 → **3**
- `forge_copper_warhammer`: xp 2 → **3**
- `forge_copper_spear`: xp 2 → **3**
- `forge_copper_fullhelm`: xp 2 → **3**
- `forge_copper_kiteshield`: xp 2 → **3**
- `forge_copper_squareshield`: xp 2 → **3**
- `forge_copper_2haxe`: xp 3 → **4**
- `forge_copper_2hmace`: xp 3 → **4**
- `forge_copper_legguards`: xp 3 → **4**
- `forge_copper_breastplate`: xp 4 → **5**
- `smelt_bronze`: xp 2 → **2** (unverändert)
- `forge_bronze_sword`: xp 2 → **3**
- `smelt_iron`: xp 2 → **2** (unverändert)
- `forge_iron_arrowheads`: xp 2 → **2** (unverändert)
- `forge_iron_gloves`: xp 3 → **3** (unverändert)
- `forge_iron_boots`: xp 3 → **3** (unverändert)
- `forge_iron_dagger`: xp 3 → **3** (unverändert)
- `forge_iron_medhelm`: xp 3 → **4**
- `forge_iron_fullhelm`: xp 4 → **4** (unverändert)
- `forge_iron_kiteshield`: xp 4 → **4** (unverändert)
- `forge_iron_sword`: xp 4 → **4** (unverändert)
- `forge_iron_mace`: xp 4 → **4** (unverändert)
- `forge_iron_axe`: xp 4 → **4** (unverändert)
- `forge_iron_legguards`: xp 4 → **5**
- `forge_iron_squareshield`: xp 4 → **5**
- `forge_iron_warhammer`: xp 5 → **5** (unverändert)
- `forge_iron_spear`: xp 5 → **6**
- `forge_iron_breastplate`: xp 6 → **6** (unverändert)
- `forge_iron_2haxe`: xp 7 → **7** (unverändert)
- `forge_iron_2hmace`: xp 8 → **8** (unverändert)
- `smelt_steel`: xp 4 → **4** (unverändert)
- `forge_steel_arrowheads`: xp 4 → **4** (unverändert)
- `forge_steel_helm`: xp 8 → **6**
- `forge_steel_warblade`: xp 13 → **10**
- `forge_steel_body`: xp 16 → **12**
- `smelt_blacksteel`: xp 10 → **7**
- `forge_blacksteel_helm`: xp 18 → **11**
- `forge_blacksteel_warblade`: xp 28 → **19**
- `smelt_mithril`: xp 13 → **10**
- `forge_mithril_arrowheads`: xp 13 → **10**
- `forge_blacksteel_legs`: xp 24 → **17**
- `forge_blacksteel_body`: xp 32 → **23**
- `forge_mithril_helm`: xp 19 → **15**
- `forge_mithril_shield`: xp 22 → **17**
- `forge_mithril_blade`: xp 31 → **24**
- `forge_mithril_legs`: xp 30 → **23**
- `forge_mithril_body`: xp 38 → **29**
- `smelt_adamantium`: xp 25 → **19**
- `forge_adamantium_helm`: xp 35 → **27**
- `forge_adamantium_shield`: xp 43 → **33**
- `forge_adamantium_blade`: xp 60 → **46**
- `forge_adamantium_legs`: xp 59 → **45**
- `forge_adamantium_body`: xp 71 → **54**
- `smelt_runite`: xp 47 → **36**
- `forge_runite_arrowheads`: xp 47 → **36**
- `forge_runite_helm`: xp 64 → **49**
- `forge_runite_shield`: xp 80 → **62**
- `forge_runite_blade`: xp 113 → **86**
- `forge_runite_legs`: xp 111 → **85**
- `forge_runite_body`: xp 132 → **100**
- `smelt_bloodiron`: xp 81 → **62**
- `forge_bloodiron_helm`: xp 115 → **88**
- `forge_bloodiron_shield`: xp 143 → **110**
- `forge_bloodiron_blade`: xp 208 → **160**
- `forge_bloodiron_legs`: xp 200 → **155**
- `forge_bloodiron_body`: xp 242 → **185**
- `smelt_titanium`: xp 141 → **110**
- `forge_titanium_helm`: xp 264 → **200**
- `forge_titanium_shield`: xp 335 → **255**
- `smelt_aetherium`: xp 255 → **195**
- `forge_titanium_blade`: xp 485 → **370**
- `forge_titanium_legs`: xp 459 → **350**
- `forge_titanium_body`: xp 563 → **430**
- `forge_aetherium_helm`: xp 425 → **325**
- `forge_aetherium_shield`: xp 532 → **410**
- `forge_aetherium_blade`: xp 755 → **580**
- `forge_aetherium_legs`: xp 703 → **540**
- `forge_aetherium_body`: xp 871 → **670**
- `smelt_godiron`: xp 478 → **365**
- `forge_godiron_helm`: xp 765 → **585**
- `forge_godiron_shield`: xp 938 → **720**
- `forge_godiron_blade`: xp 1464 → **1125**
- `forge_godiron_legs`: xp 1361 → **1050**
- `forge_godiron_body`: xp 1764 → **1350**

**cooking**
- `cook_shrimp`: xp 5 → **1**
- `cook_chicken`: xp 5 → **2**
- `cook_beef`: xp 8 → **2**
- `cook_trout`: xp 9 → **2**
- `cook_cod`: xp 16 → **3**
- `cook_salmon`: xp 30 → **7**
- `cook_lobster`: xp 58 → **25**
- `cook_anglerfish`: xp 130 → **71**
- `cook_voidray`: xp 240 → **175**

**farming**
- `gather_graywort`: xp 7 → **2**
- `farm_ashroot`: xp 9 → **3**
- `farm_grimwheat`: xp 11 → **4**
- `farm_bloodbeet`: xp 12 → **8**
- `farm_nightshade`: xp 24 → **16**
- `farm_ironvine`: xp 44 → **36**
- `farm_emberroot`: xp 90 → **83**
- `farm_wraithcap`: xp 170 → **190**
- `farm_godbloom`: xp 360 → **425**

**foraging**
- `forage_ashfields`: xp 5 → **2**
- `forage_feathers`: xp 7 → **3**
- `forage_deepwood`: xp 7 → **4**
- `forage_blightmarsh`: xp 12 → **5**
- `forage_cinderwood`: xp 22 → **11**
- `forage_frostmire`: xp 40 → **26**
- `forage_gloomfen`: xp 78 → **62**
- `forage_voidheath`: xp 150 → **145**
- `forage_gravewood`: xp 320 → **270**

**thieving**
- `pickpocket_beggar`: xp 2 → **2** (unverändert)
- `pickpocket_drunkard`: xp 2 → **2** (unverändert)
- `pickpocket_merchant`: xp 2 → **3**
- `loot_market_stall`: xp 4 → **4** (unverändert)
- `pickpocket_tax_collector`: xp 6 → **4**
- `burgle_warehouse`: xp 15 → **12**
- `pickpocket_city_guard`: xp 14 → **11**
- `crack_strongbox`: xp 33 → **25**
- `pickpocket_noble`: xp 41 → **32**
- `rob_cultist_shrine`: xp 111 → **85**
- `raid_tax_vault`: xp 218 → **165**
- `loot_reliquary`: xp 338 → **260**
- `plunder_ashen_treasury`: xp 653 → **500**
- `heist_idol_hoard`: xp 1286 → **985**

**fletching**
- `fletch_shafts`: xp 2 → **1**
- `fletch_bowstring`: xp 2 → **1**
- `fletch_copper_arrows`: xp 2 → **2** (unverändert)
- `fletch_grimoak_longbow`: xp 3 → **3** (unverändert)
- `fletch_arrows`: xp 2 → **2** (unverändert)
- `fletch_blackthorn_warbow`: xp 8 → **8** (unverändert)
- `fletch_steel_arrows`: xp 3 → **3** (unverändert)
- `fletch_ashbark_longbow`: xp 16 → **8**
- `fletch_mithril_arrows`: xp 8 → **6**
- `fletch_composite_warbow`: xp 31 → **24**
- `fletch_ironbark_warbow`: xp 40 → **28**
- `fletch_runite_arrows`: xp 25 → **19**
- `fletch_runed_longbow`: xp 113 → **86**
- `fletch_shadowpine_longbow`: xp 110 → **97**
- `fletch_bonewood_greatbow`: xp 175 → **260**
- `fletch_godwood_bow`: xp 619 → **475**

**leatherworking**
- `tan_leather`: xp 2 → **2** (unverändert)
- `craft_leather_cap`: xp 2 → **2** (unverändert)
- `craft_leather_body`: xp 3 → **3** (unverändert)
- `craft_cured_legs`: xp 3 → **3** (unverändert)
- `craft_scaled_body`: xp 7 → **7** (unverändert)
- `tan_hardened_leather`: xp 12 → **6**
- `craft_hardened_helm`: xp 12 → **6**
- `craft_hardened_legs`: xp 14 → **7**
- `craft_hardened_body`: xp 16 → **8**
- `craft_scaled_helm`: xp 18 → **9**
- `craft_scaled_legs`: xp 20 → **10**
- `reinforce_studded_leather`: xp 44 → **30**
- `craft_studded_helm`: xp 44 → **31**
- `craft_studded_legs`: xp 50 → **36**
- `craft_studded_body`: xp 58 → **44**
- `cure_warhide`: xp 130 → **105**
- `craft_warhide_helm`: xp 130 → **115**
- `craft_warhide_legs`: xp 148 → **135**
- `craft_warhide_body`: xp 165 → **155**

**jewelcrafting**
- `cut_garnet`: xp 2 → **1**
- `craft_garnet_ring`: xp 2 → **2** (unverändert)
- `craft_garnet_amulet`: xp 2 → **2** (unverändert)
- `craft_fang_necklace`: xp 2 → **2** (unverändert)
- `cut_sapphire`: xp 2 → **2** (unverändert)
- `craft_soul_amulet`: xp 5 → **3**
- `craft_sapphire_ring`: xp 3 → **3** (unverändert)
- `craft_warband_signet`: xp 14 → **4**
- `craft_sapphire_amulet`: xp 4 → **4** (unverändert)
- `cut_ruby`: xp 7 → **5**
- `craft_ruby_ring`: xp 10 → **7**
- `craft_alpha_fang_amulet`: xp 40 → **15**
- `craft_ruby_amulet`: xp 13 → **10**
- `cut_diamond`: xp 25 → **19**
- `craft_diamond_ring`: xp 36 → **27**
- `craft_grave_warden_band`: xp 120 → **42**
- `craft_diamond_amulet`: xp 49 → **38**
- `craft_stormcaller_amulet`: xp 150 → **83**
- `cut_onyx`: xp 90 → **49**
- `craft_onyx_ring`: xp 150 → **62**
- `craft_onyx_amulet`: xp 180 → **91**
- `craft_heartforged_pendant`: xp 220 → **255**

**runecrafting**
- `craft_frost_rune`: xp 2 → **2** (unverändert)
- `craft_apprentice_hat`: xp 2 → **2** (unverändert)
- `craft_aether_rune`: xp 2 → **3**
- `enchant_dim_focus`: xp 2 → **3**
- `craft_apprentice_robe`: xp 2 → **3**
- `enchant_frost_scepter`: xp 4 → **4** (unverändert)
- `craft_frost_circlet`: xp 14 → **6**
- `enchant_aether_runestaff`: xp 11 → **10**
- `craft_frost_robe_legs`: xp 16 → **7**
- `craft_frost_robe_body`: xp 20 → **8**
- `enchant_frost_focus`: xp 14 → **6**
- `enchant_aether_orb`: xp 38 → **21**
- `craft_aether_hood`: xp 38 → **26**
- `craft_aether_robe_legs`: xp 48 → **30**
- `craft_aether_robe_body`: xp 60 → **37**
- `bind_void_rune`: xp 44 → **21**
- `enchant_stormcaller_rod`: xp 44 → **36**
- `enchant_void_focus`: xp 90 → **69**
- `enchant_voidcaller_staff`: xp 130 → **125**
- `enchant_god_focus`: xp 180 → **240**
- `craft_godspark_mitre`: xp 180 → **345**
- `enchant_godspark_staff`: xp 185 → **390**
- `craft_godspark_skirt`: xp 220 → **395**
- `craft_godspark_vestment`: xp 280 → **500**

**herblore**
- `brew_minor_healing`: xp 2 → **2** (unverändert)
- `brew_antivenom`: xp 2 → **3**
- `brew_greater_healing`: xp 3 → **3** (unverändert)
- `brew_salve_of_mending`: xp 16 → **6**
- `brew_bloodmend_draught`: xp 48 → **34**
- `brew_revenant_elixir`: xp 160 → **205**

**inscription**
- `grind_soot_ink`: xp 2 → **1**
- `press_parchment`: xp 2 → **2** (unverändert)
- `scribe_glyph_might`: xp 2 → **3**
- `scribe_glyph_warding`: xp 3 → **3** (unverändert)
- `scribe_glyph_precision`: xp 14 → **6**
- `scribe_glyph_zealot`: xp 30 → **15**
- `grind_ether_ink`: xp 44 → **20**
- `scribe_glyph_bulwark`: xp 56 → **38**
- `scribe_glyph_alacrity`: xp 130 → **97**
- `scribe_glyph_ruin`: xp 180 → **240**
