# Steam-Achievements — Export fürs Steamworks-Backend (App 4915450)

> Generiert 2026-07-13. Ingame gibt es 530 Achievements; Steam bekommt die
> kuratierten 65 Meilensteine unten (Steam-Launch-Limit ~100; die übrigen
> bleiben reine Ingame-Achievements — technisch sauber: nicht im Backend angelegte IDs
> werden vom Spiel still übersprungen, nichts bricht).
> 
> **Anlegen unter:** Steamworks → App 4915450 → Stats & Achievements → Achievements.
> **API Name = exakt die ID-Spalte** (1:1-Mapping, kein Code-Anfassen nötig).
> Icons: Steam verlangt je Achievement ein 64×64-Icon (erreicht/grau) — Platzhalter reicht
> zum Start, ein Batch aus den Ingame-Icons kann später nachgezogen werden.

| API Name (exakt so) | Display Name (EN) | Description (EN) | Seltenheit |
|---|---|---|---|
| `ach_total_level_25` | Apprentice | Reach a total level of 25. | common |
| `ach_total_level_100` | Journeyman | Reach a total level of 100. | uncommon |
| `ach_total_level_250` | Master of Trades | Reach a total level of 250. | rare |
| `ach_total_level_500` | Polymath | Reach a total level of 500. | rare |
| `ach_total_level_1000` | Ascendant | Reach a total level of 1000. | epic |
| `ach_total_level_1500` | Eternal Scholar | Reach a total level of 1500. | legendary |
| `ach_total_level_1750` | Transcendent | Reach a total level of 1750. | legendary |
| `ach_total_level_2000` | Nigh Complete | Reach a total level of 2000. The pinnacle lies just ahead. | legendary |
| `ach_total_level_2079` | True Completionist | Reach the absolute maximum total level of 2079. All 21 skills at level 99. | legendary |
| `ach_pets_all` | Beastmaster | Own all 21 pets. | legendary |
| `ach_skill_woodcutting_99` | Woodcutting Maxed | Reach Woodcutting level 99. | epic |
| `ach_skill_mining_99` | Mining Maxed | Reach Mining level 99. | epic |
| `ach_skill_fishing_99` | Fishing Maxed | Reach Fishing level 99. | epic |
| `ach_skill_smithing_99` | Smithing Maxed | Reach Smithing level 99. | epic |
| `ach_skill_cooking_99` | Cooking Maxed | Reach Cooking level 99. | epic |
| `ach_skill_attack_99` | Attack Maxed | Reach Attack level 99. | epic |
| `ach_skill_power_99` | Power Maxed | Reach Power level 99. | epic |
| `ach_skill_defence_99` | Defence Maxed | Reach Defence level 99. | epic |
| `ach_skill_ranged_99` | Ranged Maxed | Reach Ranged level 99. | epic |
| `ach_skill_magic_off_99` | Magic Maxed | Reach Magic level 99. | epic |
| `ach_skill_magic_def_99` | Warding Maxed | Reach Warding level 99. | epic |
| `ach_skill_vitality_99` | Vitality Maxed | Reach Vitality level 99. | epic |
| `ach_skill_farming_99` | Farming Maxed | Reach Farming level 99. | epic |
| `ach_skill_foraging_99` | Foraging Maxed | Reach Foraging level 99. | epic |
| `ach_skill_thieving_99` | Thieving Maxed | Reach Thieving level 99. | epic |
| `ach_skill_leatherworking_99` | Crafting Maxed | Reach Crafting level 99. | epic |
| `ach_skill_jewelcrafting_99` | Jewelcrafting Maxed | Reach Jewelcrafting level 99. | epic |
| `ach_skill_runecrafting_99` | Runecrafting Maxed | Reach Runecrafting level 99. | epic |
| `ach_skill_herblore_99` | Herblore Maxed | Reach Herblore level 99. | epic |
| `ach_kills_10000` | Annihilator | Defeat 10000 enemies. | epic |
| `ach_kills_50000` | God of Slaughter | Defeat 50000 enemies. | legendary |
| `ach_boss_bull_boss` | Bull Slayer | Defeat the Maddened Bull. | epic |
| `ach_boss_ash_tyrant` | Tyrant Felled | Defeat the Ash Tyrant. | epic |
| `ach_boss_rootling_treemonster` | The Old Grove | Defeat the Elder Treant. | epic |
| `ach_boss_forest_warden` | Forest Conquered | Defeat the Forest Warden. | epic |
| `ach_boss_skeleton_nekro` | Death Denied | Defeat the Necromancer Lord. | epic |
| `ach_boss_deep_kraken` | From the Deep | Defeat the Deep Kraken. | epic |
| `ach_boss_roc_storm` | Stormbreaker | Defeat the Storm Roc. | epic |
| `ach_boss_forest_bear` | Alpha Predator | Defeat the Elder Bear. | epic |
| `ach_boss_last_idol` | Idol Shattered | Defeat the Last Idol. | legendary |
| `ach_boss_roc_elder` | Ancient Wings | Defeat the Roc Elder. | epic |
| `ach_boss_dire_wolf` | Pack Breaker | Defeat the Dire Wolf. | epic |
| `ach_boss_goblin_warlock` | Hexbane | Defeat the Goblin Warlock. | epic |
| `ach_boss_frost_hexer` | Ice Breaker | Defeat the Frost Hexer. | epic |
| `ach_boss_iron_revenant` | Iron Will | Defeat the Iron Revenant. | epic |
| `ach_boss_scale_skarn` | Scale Breaker | Defeat the Dragonhide Skarn. | epic |
| `ach_dungeon_goblin_warband_50` | Warband Victor - Legend | Clear the Goblin Warband 50 times. | epic |
| `ach_dungeon_crypt_depths_50` | Crypt Delver - Legend | Clear the Crypt Depths 50 times. | epic |
| `ach_dungeon_wildwood_hunt_50` | Master Hunter - Legend | Clear the Wildwood Hunt 50 times. | epic |
| `ach_dungeon_highland_aerie_50` | Aerie Conqueror - Legend | Clear the Highland Aerie 50 times. | epic |
| `ach_dungeon_wyvern_lair_50` | Wyvern Slayer - Legend | Clear the Wyvern Lair 50 times. | epic |
| `ach_dungeon_idol_sanctum_50` | Sanctum Cleared - Legend | Clear the Idol Sanctum 50 times. | epic |
| `ach_dungeons_total_100` | Dungeon Legend | Complete 100 dungeon runs. | epic |
| `ach_gather_100000` | Eternal Harvest | Gather 100000 resources. | epic |
| `ach_craft_10000` | Forge Lord | Craft 10000 items. | epic |
| `ach_gold_1000000` | Merchant Prince | Hold 1000000 gold at once. | epic |
| `ach_gold_10000000` | The Golden Throne | Hold 10000000 gold at once. | legendary |
| `ach_gold_spent_1000000` | Opulent | Spend 1000000 gold total. | epic |
| `ach_quests_100` | Legend of the Realm | Complete 75 quests. | epic |
| `ach_daily_streak_30` | Obsessed | Maintain a 30-day daily streak. | epic |
| `ach_daily_streak_100` | The Unbroken | Maintain a 100-day daily streak. | legendary |
| `ach_godly_drop` | Fortune's Chosen | Defeat the Last Idol 5 times. Only those who face death repeatedly ever hold a divine relic. | legendary |
| `ach_discovered_200` | Encyclopedist | Discover 200 unique items. | epic |
| `ach_sets_completed_10` | Set Completionist | Complete 10 full equipment sets. | epic |
| `ach_sets_all` | Master of All Sets | Complete all 33 equipment sets. | legendary |

**Summe: 65 Achievements.**
