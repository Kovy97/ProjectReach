# Sweep2 — Konsolidierte Triage (2026-07-01)

25 Agenten, alle Berichte in `design/sweep2-2026-07-01/`. **0 Crashes, 0 echte Walls, Engine bombenfest.**
Fixes aus Pass 1 durchgehend bestätigt. Zwei Kategorien: **autonom fixbar (Fix-Pass 2)** + **Chef-Balance/Design**.

## FIX-PASS 2 — autonom (klare Bugs/Qualität)

### CONTENT (content-dev, sole content writer)
- **[P1] `dim_essence` KOMPLETT aus dem Shop** — @8g füttert eine Gold-Loop-Familie (`craft_iron_staff` +52/Craft ≈ 15k g/h, +bronze_staff/iron_focus). Free L1-`forage_dim_essence` löst den Magier-Start weiterhin → Loop tot.
- **[P2] Affix/Suffix-ASCII-Umlaute:** `Jaegerisch`→Jägerisch (14141), `des Baeren`→Bären (14174), `der Schildkroete`→Schildkröte (14315), `des Waechters`→Wächters (14324).
- **[P2] Achievement-Umlaut-Straggler:** `ach_boss_roc_elder` „Roc-Aeltesten"→„Roc-Ältesten" (11487).
- **[P2] Heal-Trank Doppelnamen** (DE ununterscheidbar, unterschiedliche Heilung): `greater_healing_potion`(70) vs `potion_greater_heal`(150) beide „Großer Heiltrank"; ditto minor + die 2 Herblore-Aktionsnamen. Legacy-Linie distinkt umbenennen (Linie behalten — Konsolidierung ist Chef-Frage).
- **[P2] Kurzbogen-Tempo-Merkmal fehlt** copper/bronze/iron/steel (`attackIntervalMs:-150`; erst ab blacksteel gesetzt) → Kurzbogen früh strikt schlechter als Langbogen.
- **[P2] Pfeil↔Bogen-Paarung:** jedes Bogen-droppende Monster dropt den `ammoType` SEINES gedroppten Bogens (nutzbares Paar); niedrige Bögen mit zu hohem ammoType umtiern (farmhand_sling Lv1 iron→copper) → level-passend UND nutzbar.
- **[P3] `Aehter`→`Aether`** (3817/3826/3835/3854); Aktion≠Item-Namen (arcane_surge/apex/godharvest/lesser_heal/potent_heal); „Gelauteter"→„Geläuterter Seelenfisch" (136); steel/blacksteel_arrow ammoDamage-Flatspot; duskfin_carp Fishing-XP (nicht-monoton).

### UI (ui-dev)
- **[P1] Köcher im UI befüllbar** (`CharacterPage.tsx:548` Drag + `invActions` „Ausrüsten" für ammo-Items) — Engine kann's, UI ruft's nie → **Ranged nach Start-Munition tot.** = Vervollständigung Chef-#11.
- **[P2] Rohe Enum-Token:** `CombatPage.tsx:616` (Pet-Ability→t(`pet.effect.combat.*`)), `:340` (Status→t(`status.*`)).
- **[P2] Skilling-Rare-Toast-Spam** bei Gems: garantierte Primär-Outputs (chance≥1) aus `isSkillRareItem` ausschließen.
- **[P2] SkillPage-Collapse-Leck:** `key={page.skillId}` an `<SkillPage>` (App.tsx).
- **[P2] Enchanting-Vorschau/Affix-Liste zeigen Waffeneffekt-Proc nicht** (`weaponEffectByTier` in `formatBonusLines`).
- **[P2] StatsPage alte Achievement-Sektion** (540 Karten, 🏆) entfernen.
- **[P2] ItemTooltip verschweigt Buff-Effekte** (gatherXpMult/attackIntervalMs/maxMana/manaRegen im Buff-Block).
- **[P2] Ranged/Magie-Starter sehen Stil-Hint-Toast nie** (feuert nur bei Stil-Transition; Same-Style-Start).
- **[P2] Onboarding-Text O1 KORREKT neu:** 3 Kampf-Skills leveln (Offense je Focus + Vitality immer + Defence bei erlittenen Treffern) — der vorige Fix überkorrigierte.
- **[P2] Rarity-Sortierung** kennt nur 5/8 Tiers (superRare/poor/godly fehlen in `RARITY_ORDER`+`ITEM_RARITY_ORDER`).
- **[P3] (leicht):** Bestiarium-Fight reqMet-Check; Auto-Eat 🍗→Icon; Gold/Kills Tausender-Trennung; Fence-Hint-Grammatik (1574); Gear-Vault→Ausrüstungstresor; Empty-State-Texte; Detail-Rarity-Label lokalisieren; tote i18n/CSS (offline.xpGained/goldGained, .offline-stats). NICHT löschen: onboarding.*-Keys (Chef-Tutorial-Milestone).

### LOGIC (logic-dev)
- **[P1] `witherling` Farming-Pet kann nie droppen** — `tryPetDrop` in den Ernte-Zyklus (`farming.ts grantHarvest`) einhängen (Determinismus-Disziplin) + Guard-Test verschärfen → `ach_pets_all` erreichbar.
- **[P2] Toolkit `SimPlayer.fightFor` zählt Munitions-Stops als Tode** (`stopReason` prüfen, nicht nur `monsterId===null`) → alle Sweep-Todeszahlen unzuverlässig.
- **[P2] Enchant Reason-Codes** statt hartkodiertem Deutsch (`enchant.ts` → Codes; ui rendert `t(enchant.reason.*)`). Codes: `not_enough_gold`, `affix_mismatch`, `no_affix_slots`, `no_affix`, `not_enchantable`, `not_found`.
- **[P3] `activePlayMs`-Clamp** an `elapsedMs` in sanitize (persistence:302, 1 Zeile).

## CHEF-BALANCE / DESIGN (NICHT autonom — Entscheidung Chef)
- **Stil-Parität Midgame:** Melee tötet/verdient L20–51 40–60% mehr als Ranged/Magie (flache Waffen-dmg-Boni divergieren; kein Guard). Endgame-Parität dagegen eng. → Ranged/Magie-Waffen-dmg-Pass.
- **2H-Melee tot im gearten Spiel** (schnelle 1H+Schild dominiert, ~48 Items).
- **Magie-Set-Inversion:** voidweave (Lv99) < godspark (Lv85) im Magieschaden (13<17).
- **Magie-Waffenleiter craft-only** (keine Loot-Parität mit Melee/Ranged unter magic_off 26).
- **Slayer-Tower Etagen 2–5 überlevelt** (2–3× Freischalt-Band) + `tower-monsters.test.ts`-Guard zementiert die Level.
- **Default-„attack"-Stance → Melee-Wall an boar L10** + Stance früh sichtbar machen.
- **Ranged-Auto-Reload** (Reserve-Pfeile aus Inventar nicht auto-nachgeladen → Idle-Stop nach ~10min).
- Metall-Set-Tempo iron→steel verliert −150ms; Heal-Trank-Doppel-Linie konsolidieren?; Slayer/Monsterjäger-Terminologie; endgame gold/XP-Inflation + Finale-Schwierigkeit nicht-monoton + BiS-Accessoire-Raten; aether_essence-Rezept-Stufen-Kopplung; Content-Lücken (jewelcrafting L20-34, farming L50-62); Starter-Food-Bump; godiron_arrow aus L120-Krabben; guaranteedCrit/armorPierceHit == burstDamage; scale_skarn-Portrait (Chef-Art).
