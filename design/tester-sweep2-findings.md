# Tester-Sweep 2 (30 Tester) — 2026-06-30

Gegen den GRÜN+gefixten Code (nach Sweep-1-Hotfixes Batch 1+2). Doppelzweck: feinere Abdeckung +
REGRESSIONS-CHECK der jüngsten Fixes. Strikt read-only, Temp-Dateien `_tmp_u<N>.test.ts` (danach gelöscht).
Triage + Fixes durch CEO (Claude). 🔴 kritisch / 🟡 mittel / 🟢 minor.

Eingegangen: **29/30** (+5). Offen: 19.
- T5: ST1 Regen-Stalemate BESTÄTIGT real+stumm. Risiko-Mobs quantifiziert: void_titan (regen6+def168+enrage,
  60s/Kill selbst maxed → für JEDEN on-level Stalemate), abyssal_devourer (regen8, L96, resistiert ALLE 4 DoTs
  → erreichbar via Slayer-Tower ohne Top-Gear = gefährlichster Stalemate), last_idol (regen10, Endgame). 32 Mobs
  mit regen gesamt. Stop-Heuristik vorgeschlagen: prädiktiv (erwarteter dmg/Treffer vs regen/Intervall ×1.1) ODER
  beobachtend (enemyHpFloor sinkt 60s nicht + kein Kill → stopReason="stalemate"). → ST1 als DEDIZIERTE Iteration
  (Eingriff + Sim-Validierung gegen False-Trigger bei langsam-gewinnbaren Kämpfen). 
- T5 NEBENBEFUND: Melee-8%-Lifesteal + Gear-Lifesteal stapeln (Doppelheilung, je gedeckelt) → verschärft Stalemate
  [Balance]. Melee-Lifesteal stumm (UI, bekannt).
- T30: Regression (a) Hit-Range minHit–maxHit ✅, (b) i18n-Parität en=799/de=799 kein Roh-Key-Leak ✅.
  🟢-Politur: 82 VERWAISTE i18n-Keys (tote Übersetzungen — city.*/mastery.*/combat.macroStyle*/stat.maxHit
  (durch meinen Fix verwaist) etc.; Tester hat NICHT-verwaiste sauber ausgeschlossen) → Cleanup-Kandidat;
  2× hartkodiertes „Lv" (SkillsOverviewPage:104, CombatPage:1745); Stance-Tooltip nur Melee-Text.
- T28: 3 bekannte Punkte bestätigt. CODE-Kandidat (Batch 3): canClaimQuest soll bei Dailies zusätzlich prüfen,
  dass questId in state.quests.daily.quests liegt (sonst Off-Rotation-Claim, latent UI-gated) [quests.ts:131-140].
  ach_quests_100 (≤88) + ach_sets_all (29↔30; Nuance: slayer_set+slayer_set_4pc teilen pieces → ownedSetsCount
  zählt 4 Items als 2 Sets) = CONTENT/Chef. Zähler/Schwellen/azyklische Quest-Ketten sonst sauber.
- T29 ✅ CONTENT-INTEGRITÄT 100% sauber (kein orphan ref über items/monsters/skills/zones/dungeons/quests/
  affixes/crops/sets/pets — kein 🔴). ECHTE WALLS=0 (geared schlägt alle 92), keine 0-XP/NaN-Gold.
  NEUE Balance: runecrafting Caster-Gold (craft_godiron_wand 2,6M g/h!), forge_tower_compound −306k g/h
  (negativste Aktion), Pfeil-/Runen-ii/iii-/Herblore-Margen systematisch negativ, Endgame-Smithing-XP hoch
  (forge_godiron_platebody 608k XP/h), bull_boss L15 667HP. → alles Balance/Chef.
- T18 reproduzierte den equipAmmo-Dup (1500 iron + equip copper → iron 2499, copper weg) EXAKT — mein Fix
  (removeItem der teilweise eingelagerten alten Munition) adressiert genau das. Verifikation am Sweep-Ende.
- T4: Shock-Clamp ✅ (mag 5 == mag 1, kein Overflow). T15/T24 Kern grün (nur UI/Anzeige-Funde bei Enchant).
- T18#2 NEU 🟡: addItemOrBank-Overflow ohne Guard bei Combat-Loot/Farming/Quests (inv+bank voll → stiller
  Verlust) — pre-existing, kein Regression, größerer Eingriff. Kandidat für Batch 4.

## ✅ REGRESSIONEN — alle bestätigt GRÜN
minHit-Anzeige (T1: implementiert, aber ±1-Drift → FIX gemacht) · ammo-unequip-Überlauf (T2 ✅) · shock≤1 (T4
ausstehend) · stopCombat-Dungeon-Cleanup (T8 ✅ alle 4 Pfade) · SL1 Slayer-Pool (T9 ✅, determinismus-neutral) ·
L1 autoBank-Stop (T11 ✅ 4 Szenarien) · Equip-Datenverlust (T18 ausstehend) · Instanz-Drag/Sell (T20 ✅ alle
Sortierungen) · Bank-Instanz-Phantom (T21 ✅) · deserialize null-Skill (T27 ✅).

## 🔴/🟡 NEUE CODE-FIXES (Batch 3 — CEO, nach Sweep-Ende verifizieren)
- ✅ GEMACHT: minHit aus gerundetem maxHit ableiten (character.ts) [T1#1,T26#5].
- ✅ GEMACHT: equipAmmo-Revert entfernt teilweise eingelagerte alte Munition (Duplikations-Bug, den ICH
  eingebaut hatte) [T2#1 🔴].
- ✅ GEMACHT: Pet-skillXp für 5 Combat-Pets (gorehound/ironmaw/carapace/carrionwing/charnel): combat addXp ×
  petSkillXpMult verdrahtet (content durch addXp/grantOffenseXp/grantDefenseXp/tickPlayerEffects) → +5%-Passiv
  wirkt jetzt im Kampf. Engine no-sim 456 grün, Pets nicht im Sim → Balance unverändert. [T7 P1]
- 🟡 GameContext dt ungecappt (Sleep→UI-Freeze + umgeht 12h-Offline-Cap). Fix: advance(…, Math.min(dt,
  MAX_OFFLINE_MS)) [T27#2].
- 🟢 autoEatCooldownMs geht beim Round-Trip verloren (migrate-rebuild kopiert es nicht) [T27#3].
- 🟢 NaN in baseAttributes vergiftet computeStats (clamp deckt nur crit/interval/lifesteal); Fix: attr-Werte
  via Number.isFinite klemmen (computeStats + createCharacter + sanitize) [T26#1/2, T3#8].
- 🟢 Stance-Strings (rangedStance/magicStance/combatStyle) in sanitizeState nicht validiert (analog
  thievingRisk clampen) [T27#4].
- 🟢 Ranged-1000ms-Floor von Stance-speedMult unterlaufen (850 bei fast) [T26#3].
- 🟢 xpForLevel(fraktional/NaN)=undefined (Math.floor+finite-Guard) [T26#4].
- 🟢 worldTaskMonsters spiegelt slayerRequirementMet-Filter NICHT (latent, kein Welt-Mob hat Requirement) [T9#1].
- 🟢 withdrawItem O(n)/Stück → einmal addItem(qty) [T21#3]; bankSlotsUsed zählt 0-qty-Keys [T21#1].
- 🟢 Shop-UI sperrt partiellen Gold-Kauf + verwirft buyItem-Count (kein Feedback) [T22#1/2].
- 🟢 (DOKU/LATENT) Math.max(1,…) kippt künftige negative Suffix-Roll-Stats im Vorzeichen [T23#4].

## 🟡 BALANCE/CONTENT (→ Chef/content-dev, sim-sensitiv, single-writer)
- Mining [T12]: Gem-Adern ≫ Erz; mine_garnet_seam @L15 (36k), mine_bloodstone_seam @L25 (82k); rough_onyx 240
  < rough_diamond 320 (Onyx-Ader L90 = Downgrade); Tool-Gap Pickaxe-Cap L55 vs Erz L95; onyx-Bonus-Gem 20%.
- Cooking/Herblore [T14]: cook_shadowcarp (−1920 g/h), cook_honey_cake (−12.6k); 7+ negative Brau-Margen
  (godsbreath −55.8k …); 2 „Heiltrank"-Namens-Dubletten (greater 70 vs 150!, minor 30/30).
- Farming [T17]: 🔴-Exploit reed_iron levelRequired 26 (XP von L46) + reed_void 58 (XP von L84) = Power-Level-
  Skip, billige Saat im Shop → levelRequired auf ~46/~84 anheben (klare Typos).
- WC/Fishing [T13]: kein woodcutting-gegatetes Tool (nur attack-Äxte); Fishing XP pro Versuch (Fang-Chance
  senkt nur Ertrag); XP-Knick L45.
- Sets [T25]: minPieces rückwärts (copper/iron/steel 5 vs mithril..godiron 3); voidweave magicDmg 13<godspark
  17; voidhide evasion 12<Vortiers; attackInterval-Bonus nur copper/iron.
- Dungeons [T8]: idol_sanctum Difficulty-Inversion (Endboss schwächster Dmg); Endgame-Gates 90-99 zu eng für
  Mob-Level 200-295.
- Instanzen/Suffix [T23]: Roll-Varianz −15%..0% statt ±15% (fühlt deterministisch); Auto-Salvage zerlegt
  Beinahe-Best (Schwelle auf rohen roll); Low-ilvl-Kollaps (Math.max(1) macht alle Rolls=1).
- Thieving [T16]: bold gibt +20% auf Fence-Kette risikolos (kein successBase); actionTarget zählt Fehlschläge mit.
- Pets [T7]: accuracyDownEnemy von keinem Pet genutzt; kein Magie-Stil-Pet; instantAction Doku-Mismatch.
- Slayer-Helm [T10]: Kette verbraucht Ward-Gate-Items (durch SL80-Gate entschärft).

## Funde — Balance/Content (→ Chef/content-dev, sim-sensitiv, single-writer)
- **Mining [T12]:** Gem-Adern schlagen Erz-Adern systematisch ~2-4× (dominanter Goldpfad). NEUE Ausreißer:
  mine_garnet_seam @L15 = 36k value/h (wie L55-Erz), mine_bloodstone_seam @L25 = 82k (bekannt). WERT-INVERSION:
  rough_onyx 240 < rough_diamond 320 obwohl Onyx-Ader L90 vs Diamant L75 → mine_onyx_seam L90 ist Downgrade.
  Tool-Gap: beste Pickaxe runite L55, Erze bis L95 → 40 Level ohne Tempo-Belohnung. Onyx-Bonus-Gem-Chance 20%
  (Ausreißer). copper/tin_ore ohne value (→1g). Empfehlung: Gem-Gold global nerfen ODER als JC-Feeder.
- **Slayer-Tower/Helm [T10]:** solide, 22/22 grün. Nur BEKANNT (T7#2): Helm-Kette verbraucht die 5 Ward-Gate-
  Items → Helm nur im Inventar (nicht equipt) hebt Block nicht auf (Pfad b prüft nur equipment). Praktisch
  durch SL80-Gate (abyssal_core/Helm-Equip beide SL80) entschärft. Reines Design-Risiko, kein Crash.

## Abdeckung (je 1 Tester)
1 Melee(+minHit) · 2 Ranged(+ammo-unequip) · 3 Magie · 4 Status(+shock-clamp) · 5 Lifesteal/Regen/Stalemate ·
6 Auto-Eat · 7 PETS(neu) · 8 Dungeons(+stopCombat) · 9 Slayer-Tasks(+SL1) · 10 Slayer-Tower/Helm ·
11 Smithing(+L1) · 12 Mining · 13 Woodcutting/Fishing · 14 Cooking/Herblore(Dubletten) · 15 Fletching/RC ·
16 Thieving(Fence) · 17 Farming · 18 Inventar-Datenverlust-REGRESSION · 19 Equipment/2H/Bags ·
20 Quick-Sell/Instanz-Drag-REGRESSION · 21 Bank(+Phantom-Fix) · 22 Shop · 23 Instanzen/Suffix-Varianz ·
24 Enchant/Affixe · 25 Sets · 26 Progression/computeStats · 27 Save/Migration(+null-Skill-Fix) ·
28 Achievements/Quests · 29 Ökonomie-Sim+Content-Integrität · 30 UI/UX/i18n(+Hit-Range-Fix).

## REGRESSIONS, die explizit verifiziert werden (sollten alle ✅ sein)
- minHit-Anzeige (T1,T30) · ammo-unequip-Überlauf (T2,T18) · shock≤1 (T4) · stopCombat-Dungeon-Cleanup (T8) ·
  SL1 Slayer-Pool-Filter (T9) · L1 autoBank-Stop (T11) · Equip-Datenverlust voll (T18) · Instanz-Drag/Sell (T20) ·
  Bank-Instanz-Phantom (T21) · deserialize null-Skill (T27) · Hit-Range-UI (T30).

---

## Funde (werden bei Eingang ergänzt)
