# Balance-XP-Tabelle — Hearthforge Idle

**Stand:** 2026-06-23 · **Quelle:** abgeleitet aus `design/balance-report.md`, `packages/engine/src/leveling.ts`, `packages/content/src/index.ts`

> Read-only Empfehlung. Diese Datei ändert **keinen** Quellcode. Sie listet für **jede** Nicht-Kampf-Aktion und **jedes** Monster den empfohlenen neuen `xp`-Wert, damit die effektive XP/h der Ziel-Kurve folgt.

---

## 1. Formel & Annahmen

**Ziel-XP/h pro Tier-Level L** (Single Source of Truth aus dem Balance-Report):

```
ziel_xph(L) = 90 · sqrt( xpForLevel(L+1) − xpForLevel(L) )
```

`xpForLevel` exakt aus `leveling.ts` repliziert (RuneScape/Melvor-Stil, Cap 120):
`acc += floor(n + 300·2^(n/7))`, `table[n+1] = floor(acc/4)`.

**Verifikation der Formel (wie im Report):** `ziel_xph(1) = 820`, `ziel_xph(50) = 9.271 (≈9.300)`, `ziel_xph(90) = 67.139 (≈67.000)`, `ziel_xph(99) = 104.831`. ✓

### 1.1 Aktionen (Sammeln / Verarbeitung / Thieving)

`L = levelRequired ?? 1`. `durationMs` bleibt unverändert (Pacing). Neuer XP-Wert:

```
xp_neu = max(1, round( ziel_xph(L) · durationMs / 3.600.000 ))
```

### 1.2 Monster (Kampf)

Ein Monster soll beim Farmen ~`ziel_xph(monster.level)` pro Stunde liefern. Dazu wird die Kill-Zeit (TTK) benötigt:

```
TTK[s]      = maxHp / spieler_dps(level)
kills_pro_h = 3600 / TTK
xp_neu      = max(1, round( ziel_xph(level) / kills_pro_h ))
            = max(1, round( ziel_xph(level) · TTK / 3600 ))
```

**Annahme `spieler_dps`:** Der Sim-Report zeigt, dass der Baseline-Held (5/5 STR/CON, Bronze-Gear) eine **nahezu konstante** effektive DPS hat, die **nicht** mit dem Monster-Tier mitwächst (goblin L1: 2,8 s/Kill ⇒ ~11 DPS; ash_tyrant L20: 11 s ⇒ ~16; ember L52: 16,9 s ⇒ ~14; forest_warden L40: 26,7 s ⇒ ~14; aether L98: 60 s ⇒ ~8). Als pragmatische, dokumentierte Näherung wird **`spieler_dps = 13` (konstant)** angesetzt. Das reproduziert das gesunde TTK-Band des Reports (≈3 s früh → 25 s+ spät) und liefert XP-Empfehlungen, die §4.4 des Reports entsprechen (z. B. ash_tyrant ≈8–9, forest_warden ≈43, ember ≈52).

> **Caveat L90+:** Ab ~Lv 90 bricht der Baseline-Held im Sim ein (viele Tode, scale_skarn/last_idol unkillbar). Dort ist die reale TTK unzuverlässig; mit echter Endgame-Ausrüstung sinkt sie wieder. Die hier gelisteten Endgame-Monster-Werte sind daher unter der **idealisierten** konstanten DPS berechnet (kein Held-Versagen) — sie sind die saubere Zielgröße, kein Abbild des kaputten Baseline-Runs. Endgame-Power ist ein separates Equipment-Balancing (Report §4.4 Punkt 3).

---

## 2. Nicht-Kampf-Aktionen (alle 96)

| actionId | skill | levelRequired | durationMs | xp_alt | xp_neu |
|---|---|--:|--:|--:|--:|
| cut_normal_tree | woodcutting | 1 | 3000 | 10 | 1 |
| cut_oak_tree | woodcutting | 1 | 5000 | 25 | 1 |
| mine_copper | mining | 1 | 3500 | 12 | 1 |
| mine_tin | mining | 1 | 3500 | 12 | 1 |
| mine_iron | mining | 10 | 4000 | 18 | 1 |
| mine_coal | mining | 15 | 4500 | 22 | 2 |
| mine_mithril | mining | 35 | 5000 | 40 | 6 |
| mine_adamantite | mining | 45 | 5500 | 56 | 11 |
| mine_runite | mining | 55 | 6500 | 80 | 21 |
| mine_bloodiron | mining | 70 | 7000 | 120 | 49 |
| mine_titanium | mining | 80 | 7800 | 160 | 89 |
| mine_aetherite | mining | 90 | 8500 | 200 | 159 |
| mine_godiron | mining | 105 | 9500 | 250 | 372 |
| catch_shrimp | fishing | 1 | 4000 | 10 | 1 |
| catch_trout | fishing | 1 | 6000 | 30 | 1 |
| forage_ashfields | foraging | 1 | 4000 | 12 | 1 |
| forage_deepwood | foraging | 1 | 6500 | 28 | 1 |
| farm_ashroot | farming | 1 | 8000 | 22 | 2 |
| farm_grimwheat | farming | 1 | 10000 | 34 | 2 |
| gather_graywort | farming | 1 | 6000 | 16 | 1 |
| brew_antivenom | herblore | 1 | 5000 | 30 | 1 |
| brew_greater_healing | herblore | 1 | 6000 | 44 | 1 |
| brew_minor_healing | herblore | 1 | 3500 | 16 | 1 |
| forge_copper_arrowheads | smithing | 1 | 3000 | 10 | 1 |
| forge_copper_boots | smithing | 1 | 3000 | 10 | 1 |
| forge_copper_dagger | smithing | 1 | 3000 | 10 | 1 |
| forge_copper_gloves | smithing | 1 | 3000 | 10 | 1 |
| forge_copper_mace | smithing | 1 | 3500 | 12 | 1 |
| forge_copper_medhelm | smithing | 1 | 3500 | 12 | 1 |
| forge_copper_sword | smithing | 1 | 3500 | 12 | 1 |
| smelt_copper | smithing | 1 | 2600 | 8 | 1 |
| forge_copper_axe | smithing | 2 | 4500 | 18 | 1 |
| forge_copper_fullhelm | smithing | 2 | 4500 | 18 | 1 |
| forge_copper_kiteshield | smithing | 2 | 4500 | 18 | 1 |
| forge_copper_spear | smithing | 2 | 4500 | 18 | 1 |
| forge_copper_squareshield | smithing | 2 | 4500 | 18 | 1 |
| forge_copper_warhammer | smithing | 2 | 4500 | 18 | 1 |
| forge_copper_2haxe | smithing | 3 | 6500 | 28 | 2 |
| forge_copper_2hmace | smithing | 3 | 6500 | 28 | 2 |
| forge_copper_legguards | smithing | 3 | 6500 | 30 | 2 |
| forge_copper_breastplate | smithing | 4 | 9000 | 50 | 2 |
| forge_bronze_sword | smithing | 5 | 5000 | 25 | 1 |
| smelt_bronze | smithing | 5 | 3000 | 12 | 1 |
| smelt_iron | smithing | 10 | 3200 | 16 | 1 |
| forge_iron_helm | smithing | 12 | 5000 | 32 | 2 |
| forge_iron_sword | smithing | 12 | 6000 | 40 | 2 |
| forge_iron_legs | smithing | 13 | 6000 | 44 | 2 |
| forge_iron_shield | smithing | 13 | 5500 | 38 | 2 |
| forge_iron_body | smithing | 14 | 7000 | 52 | 3 |
| smelt_steel | smithing | 20 | 4500 | 28 | 3 |
| forge_steel_helm | smithing | 22 | 7000 | 60 | 5 |
| forge_steel_warblade | smithing | 24 | 11000 | 90 | 8 |
| forge_steel_body | smithing | 26 | 12000 | 110 | 9 |
| smelt_blacksteel | smithing | 30 | 6000 | 55 | 6 |
| smelt_mithril | smithing | 35 | 6500 | 70 | 8 |
| smelt_adamantium | smithing | 45 | 7500 | 100 | 15 |
| smelt_runite | smithing | 55 | 8500 | 135 | 28 |
| smelt_bloodiron | smithing | 65 | 9000 | 175 | 49 |
| smelt_titanium | smithing | 75 | 9500 | 215 | 84 |
| smelt_aetherium | smithing | 85 | 10500 | 270 | 153 |
| smelt_godiron | smithing | 95 | 12000 | 340 | 287 |
| cook_shrimp | cooking | 1 | 2500 | 8 | 1 |
| cook_trout | cooking | 1 | 4000 | 25 | 1 |
| cook_chicken | cooking | 2 | 3000 | 12 | 1 |
| cook_beef | cooking | 5 | 3500 | 20 | 1 |
| fletch_arrows | fletching | 1 | 3000 | 12 | 1 |
| fletch_bowstring | fletching | 1 | 2500 | 8 | 1 |
| fletch_grimoak_longbow | fletching | 1 | 6000 | 38 | 1 |
| fletch_blackthorn_warbow | fletching | 18 | 9000 | 80 | 5 |
| craft_leather_body | leatherworking | 1 | 5500 | 30 | 1 |
| craft_leather_cap | leatherworking | 1 | 4000 | 18 | 1 |
| tan_leather | leatherworking | 1 | 3000 | 10 | 1 |
| craft_scaled_body | leatherworking | 14 | 9000 | 72 | 4 |
| craft_aether_rune | runecrafting | 1 | 5000 | 40 | 1 |
| craft_frost_rune | runecrafting | 1 | 3000 | 14 | 1 |
| enchant_dim_focus | runecrafting | 1 | 5000 | 28 | 1 |
| enchant_frost_scepter | runecrafting | 1 | 8000 | 66 | 2 |
| enchant_aether_runestaff | runecrafting | 20 | 11000 | 110 | 6 |
| grind_soot_ink | inscription | 1 | 2500 | 9 | 1 |
| press_parchment | inscription | 1 | 3000 | 11 | 1 |
| scribe_glyph_might | inscription | 1 | 5000 | 34 | 1 |
| scribe_glyph_warding | inscription | 1 | 5500 | 38 | 1 |
| pickpocket_beggar | thieving | 1 | 3000 | 14 | 1 |
| pickpocket_drunkard | thieving | 5 | 3200 | 20 | 1 |
| pickpocket_merchant | thieving | 12 | 3600 | 34 | 1 |
| loot_market_stall | thieving | 20 | 4200 | 48 | 2 |
| pickpocket_tax_collector | thieving | 28 | 4000 | 66 | 3 |
| burgle_warehouse | thieving | 36 | 7000 | 88 | 9 |
| pickpocket_city_guard | thieving | 45 | 4200 | 110 | 8 |
| crack_strongbox | thieving | 55 | 6000 | 140 | 20 |
| pickpocket_noble | thieving | 65 | 4600 | 175 | 25 |
| rob_cultist_shrine | thieving | 75 | 7500 | 220 | 67 |
| raid_tax_vault | thieving | 85 | 9000 | 280 | 131 |
| loot_reliquary | thieving | 95 | 8500 | 340 | 203 |
| plunder_ashen_treasury | thieving | 105 | 10000 | 420 | 392 |
| heist_idol_hoard | thieving | 115 | 12000 | 520 | 772 |

---

## 3. Monster (alle 49)

| monsterId | level | xp_alt | xp_neu |
|---|--:|--:|--:|
| chicken | 1 | 8 | 1 |
| goblin | 1 | 15 | 1 |
| ash_rat | 2 | 12 | 1 |
| cow | 3 | 16 | 1 |
| goblin_shaman | 4 | 40 | 1 |
| dust_vulture | 5 | 22 | 1 |
| goblin_rogue | 5 | 28 | 1 |
| boar | 6 | 28 | 1 |
| goblin_spearman | 6 | 34 | 1 |
| goblin_archer | 7 | 40 | 1 |
| mire_crawler | 8 | 34 | 1 |
| rootling_grunt | 8 | 40 | 2 |
| goblin_crossbower | 9 | 52 | 2 |
| bull_boss | 10 | 90 | 6 |
| goblin_butcher | 10 | 64 | 2 |
| goblin_felmagician | 11 | 70 | 2 |
| goblin_stormcaller | 12 | 80 | 2 |
| rootling_gimp | 12 | 58 | 3 |
| goblin_warlock | 14 | 110 | 4 |
| pitch_beetle | 14 | 52 | 3 |
| rootling_gimp2 | 16 | 78 | 5 |
| skeleton_warrior | 16 | 80 | 4 |
| skeleton_archer | 18 | 90 | 4 |
| ash_tyrant | 20 | 140 | 8 |
| skeleton_spearman | 20 | 100 | 6 |
| thorn_wolf | 20 | 70 | 5 |
| moss_golem | 24 | 88 | 9 |
| skeleton_butcher | 24 | 140 | 11 |
| spectral_stag | 28 | 100 | 9 |
| skeleton_icemage | 30 | 190 | 16 |
| bramble_witch | 32 | 120 | 12 |
| rootling_treemonster | 32 | 240 | 31 |
| roc | 35 | 220 | 28 |
| skeleton_pyroclasp | 36 | 240 | 28 |
| forest_warden | 40 | 280 | 43 |
| pit_spider | 42 | 150 | 27 |
| skeleton_nekro | 45 | 420 | 74 |
| slag_kobold | 46 | 170 | 36 |
| roc_hunter | 50 | 320 | 83 |
| ember_elemental | 52 | 200 | 52 |
| iron_revenant | 58 | 240 | 94 |
| frost_hound | 62 | 260 | 108 |
| roc_elder | 65 | 440 | 233 |
| frost_hexer | 68 | 300 | 164 |
| roc_storm | 75 | 600 | 492 |
| idol_warden | 92 | 420 | 824 |
| aether_wraith | 98 | 460 | 1023 |
| scale_skarn | 104 | 520 | 1779 |
| last_idol | 120 | 1200 | 8441 |

---

## 4. Apply-Liste (`id -> xp_neu`)

### 4.1 Aktionen

```
cut_normal_tree -> 1
cut_oak_tree -> 1
mine_copper -> 1
mine_tin -> 1
mine_iron -> 1
mine_coal -> 2
mine_mithril -> 6
mine_adamantite -> 11
mine_runite -> 21
mine_bloodiron -> 49
mine_titanium -> 89
mine_aetherite -> 159
mine_godiron -> 372
catch_shrimp -> 1
catch_trout -> 1
forage_ashfields -> 1
forage_deepwood -> 1
farm_ashroot -> 2
farm_grimwheat -> 2
gather_graywort -> 1
brew_antivenom -> 1
brew_greater_healing -> 1
brew_minor_healing -> 1
forge_copper_arrowheads -> 1
forge_copper_boots -> 1
forge_copper_dagger -> 1
forge_copper_gloves -> 1
forge_copper_mace -> 1
forge_copper_medhelm -> 1
forge_copper_sword -> 1
smelt_copper -> 1
forge_copper_axe -> 1
forge_copper_fullhelm -> 1
forge_copper_kiteshield -> 1
forge_copper_spear -> 1
forge_copper_squareshield -> 1
forge_copper_warhammer -> 1
forge_copper_2haxe -> 2
forge_copper_2hmace -> 2
forge_copper_legguards -> 2
forge_copper_breastplate -> 2
forge_bronze_sword -> 1
smelt_bronze -> 1
smelt_iron -> 1
forge_iron_helm -> 2
forge_iron_sword -> 2
forge_iron_legs -> 2
forge_iron_shield -> 2
forge_iron_body -> 3
smelt_steel -> 3
forge_steel_helm -> 5
forge_steel_warblade -> 8
forge_steel_body -> 9
smelt_blacksteel -> 6
smelt_mithril -> 8
smelt_adamantium -> 15
smelt_runite -> 28
smelt_bloodiron -> 49
smelt_titanium -> 84
smelt_aetherium -> 153
smelt_godiron -> 287
cook_shrimp -> 1
cook_trout -> 1
cook_chicken -> 1
cook_beef -> 1
fletch_arrows -> 1
fletch_bowstring -> 1
fletch_grimoak_longbow -> 1
fletch_blackthorn_warbow -> 5
craft_leather_body -> 1
craft_leather_cap -> 1
tan_leather -> 1
craft_scaled_body -> 4
craft_aether_rune -> 1
craft_frost_rune -> 1
enchant_dim_focus -> 1
enchant_frost_scepter -> 2
enchant_aether_runestaff -> 6
grind_soot_ink -> 1
press_parchment -> 1
scribe_glyph_might -> 1
scribe_glyph_warding -> 1
pickpocket_beggar -> 1
pickpocket_drunkard -> 1
pickpocket_merchant -> 1
loot_market_stall -> 2
pickpocket_tax_collector -> 3
burgle_warehouse -> 9
pickpocket_city_guard -> 8
crack_strongbox -> 20
pickpocket_noble -> 25
rob_cultist_shrine -> 67
raid_tax_vault -> 131
loot_reliquary -> 203
plunder_ashen_treasury -> 392
heist_idol_hoard -> 772
```

### 4.2 Monster

```
chicken -> 1
goblin -> 1
ash_rat -> 1
cow -> 1
goblin_shaman -> 1
dust_vulture -> 1
goblin_rogue -> 1
boar -> 1
goblin_spearman -> 1
goblin_archer -> 1
mire_crawler -> 1
rootling_grunt -> 2
goblin_crossbower -> 2
bull_boss -> 6
goblin_butcher -> 2
goblin_felmagician -> 2
goblin_stormcaller -> 2
rootling_gimp -> 3
goblin_warlock -> 4
pitch_beetle -> 3
rootling_gimp2 -> 5
skeleton_warrior -> 4
skeleton_archer -> 4
ash_tyrant -> 8
skeleton_spearman -> 6
thorn_wolf -> 5
moss_golem -> 9
skeleton_butcher -> 11
spectral_stag -> 9
skeleton_icemage -> 16
bramble_witch -> 12
rootling_treemonster -> 31
roc -> 28
skeleton_pyroclasp -> 28
forest_warden -> 43
pit_spider -> 27
skeleton_nekro -> 74
slag_kobold -> 36
roc_hunter -> 83
ember_elemental -> 52
iron_revenant -> 94
frost_hound -> 108
roc_elder -> 233
frost_hexer -> 164
roc_storm -> 492
idol_warden -> 824
aether_wraith -> 1023
scale_skarn -> 1779
last_idol -> 8441
```
