# Phase C2 — Combat-Tester · MELEE · Band L90 (Endgame) · Rüstungs-Iteration 2

Stand 2026-07-03 · Kontrolleur (Combat-Tester, Iteration 2) · **HEADLESS** (createGame/computeStats/combatStep, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_c2M90_sweep` gelaufen & gelöscht.
Loadout: **BiS Godiron** (godiron_set, attack/defence 99, alle 7 COMBAT_SKILL_IDS = 99, baseAttributes str30/con30). 1H = `godiron_sword`+`godiron_kiteshield`; 2H = `godiron_greatsword`. Gegner: die 4 Idol-Hall-Endbosse (L245–295). Fenster: 60 min/Seed, Seeds {1,7,13,29,42,101} = **6 h Spielzeit je Zelle**. Stance: power (offensiv/Default). „Mit Food" = `cooked_soulfish` (27 Heal) + Auto-Eat-Tier 3 (Schwelle 80 %).

## VERDIKT: **SHIP** (fix-then-ship für 1 Balance-Watch)
Kein P1-Blocker. Iteration 2 hat das zentrale It1-Problem **gelöst**: Food ist für Melee-Endgame jetzt **echt nötig** — foodless bringt auf **allen 4 Bossen** Tode (It1: nur `last_idol`). Mit Food 0 Tode über 6 h auf allen 4 Bossen, beide Loadouts. Der It1-Ward-Leak (`WARD_CORE_PER_INT`) ist gefixt (`maxWard=0` auf reinem Melee). 1H+Schild vs 2H bleibt EHP-fair. **Ein Balance-Watch (P2):** 2H-defensive liegt bei 76 % Mitigation, und ein einzelner neuer §10-Trinity-Rüstungsbuff schiebt 2H praktisch an den 80 %-Cap. **Ein Attributions-Hinweis (P3):** der eigentliche Food-Hebel war NICHT die Lifesteal-Senkung (0.08→0.06, im Endgame durch den Abs-Cap 1.2 inert), sondern der Ward-Leak-Fix.

---

## Die 4 Gate-Fragen (mit Zahlen)

### (1) Rüstung bedeutsam? Mitigation nahe Cap? — JA bedeutsam / NEIN (2H-def am nächsten)
Echte computeStats-Werte (×10-Skala: 5 Platten-AR Σ125, Kiteschild AR21,74 / Block49,7 %, 2H-Waffen-AR-Bonus 222,6 voll bei 5 Platten-Teilen):

| Loadout | Stance | maxHp | armorRating | defense | Mitigation | Block | Ward | Steh-EHP | Cap 0,80 erreicht? |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1H+Schild | power | 292,4 | 146,74 | 146,74 | **54,0 %** | 49,7 % | 0 | 1101 | nein |
| 1H+Schild | defensive | 292,4 | 146,74 | 168,75 | **57,4 %** | 49,7 % | 0 | 1190 | nein |
| 2H (Greatsword) | power | 268,4 | 347,6 | 347,6 | **73,6 %** | 0 % | 0 | 1015 | nein |
| 2H (Greatsword) | defensive | 268,4 | 347,6 | 399,74 | **76,2 %** | 0 % | 0 | 1127 | nein |

- Rüstung ist die Überlebens-Grenze: foodless stirbt selbst der Voll-BiS-Held (s. Gate 2); nackter 2H hat `armorRating 0 / defense 0` (§4-Fix verifiziert → nackt = Suizid). Effektive Ø-Reduktion pro Treffer ist bei beiden Loadouts ~identisch: **1H 73,4 %** (54 % flat + Block 49,7 %·85 %) ≈ **2H 73,6 %** (flat) → 2H ist NICHT mehr der pro-Treffer-tankigere Build (Gate-Kriterium §13-6 erfüllt), 1H streut nur stärker (ungeblockter Treffer = 46 % roh) und puffert das über +24 maxHp + Block-Glättung.
- **Mitigation NICHT am Cap:** 54–76 %; der 0,80-Deckel ist ein nicht-bindendes Anti-Invuln-Rail (gut). **`maxWard=0`** auf reinem Melee → der It1-P3-Ward-Leak (`WARD_CORE_PER_INT=1`) ist gefixt (§2 appliziert).

### (2) Food nötig oder trivial? — **JETZT NÖTIG auf ALLEN 4 Bossen** (It1: nur last_idol)
Tode je Zelle = Σ über 6 Seeds × 60 min = 6 h. „minHP" = tiefster HP-Stand über alle Seeds.

| Boss (Lvl) | 1H Food | 1H OHNE Food | 2H Food | 2H OHNE Food |
|---|---|---|---|---|
| idol_warden (245) | **0 Tode**, minHP 80 % | **12 Tode**, minHP 0,8 % | **0 Tode**, 80 % | **12 Tode**, 0,1 % |
| aether_wraith (260) | **0 Tode**, 80 % | **24 Tode**, 0,1 % | **0 Tode**, 80 % | **35 Tode**, 0,1 % |
| scale_skarn (275) | **0 Tode**, 80 % | **15 Tode**, 0,2 % | **0 Tode**, 80 % | **24 Tode**, 0,1 % |
| last_idol (295, enrage ×1,75) | **0 Tode**, 78 % | **43 Tode**, 0,1 % | **0 Tode**, 80 % | **55 Tode**, 0,1 % |

- **It1→It2-Umschwung:** In It1 waren idol_warden/aether_wraith/scale_skarn foodless **0-Tod bei 90–100 % HP**; jetzt sterben sie foodless (mittlere Zeit-bis-Tod ~15–30 min). last_idol foodless: It1 8 Tode/6h → It2 **43–55 Tode/6h**. Foodless-Netto-Drift (saubere 10-min-Sonde, idol_warden 1H, keine Tode im Fenster): **−0,16 HP/s** (It1 lag bei ~0). → **Food-Constraint erfüllt.**
- **Wichtige Ursachen-Klärung (P3):** Der Food-Rückkehr-Hebel ist NICHT die Lifesteal-Senkung 0.08→0.06, sondern der **Ward-Leak-Fix (§2)**. Der Melee-Lifesteal ist im Endgame durch den **absoluten Deckel `MELEE_LIFESTEAL_CAP_ABS = 1,2/Treffer`** hart begrenzt: `heal = min(1,2, dealt·L)`, dealt(post-Boss-Mitigation) ≥ 30 ⇒ `dealt·0.06 ≥ 1,8 > 1,2` UND `dealt·0.08 ≥ 2,4 > 1,2` → **beide L-Werte liefern exakt 1,2/Treffer** (empirisch gemessen: 38,4 HP / 32 Treffer = 1,20). Die 0.08→0.06-Änderung ist am L90-Endgame also **wirkungslos**. Was It1 foodless-tragfähig machte, war der `WARD_CORE_PER_INT=1`-Leak: ~15 Ward Gratis-Absorb, per 100%-Kill-Refill bei JEDEM Kill zurückgesetzt. `WARD_CORE_PER_INT=0` entfernt diesen Sockel → Netto kippt ins Minus → Food kehrt zurück.

### (3) 1H+Schild vs 2H EHP-fair (R90-Parität)? — **JA**
- Steh-EHP: 1H **1101** vs 2H **1015** (power) → **2H −7,8 %**; defensive 1190 vs 1127 → **2H −5,3 %**. Richtung korrekt (1H = defensive Linie: höhere EHP + Block glättet Spikes; 2H = offensiv, leichter). Spec §11.6-Modellziel R90 „2H am unteren Rand (−6…−10 %)" getroffen. (It1: 2H −5,6 %; der Gap wuchs leicht, weil `BLOCK_DAMAGE_REDUCTION` 0,75→0,85 die 1H-Seite hebt.)
- Kill-Gegenrechnung (Ø Kills/60 min, mit Food): idol_warden 1H **310** / 2H **317**; aether 302/303; skarn 261/269; last_idol 214/206. → **2H +0,3…+3,1 %** (last_idol −3,7 %). Klassische Sword-and-Board-vs-2H-Wahl, kein dominanter Build. Die It1-§3-Sorge „2H dominiert" manifestiert sich am L90 NICHT.
- Minor-Hinweis (weapon-spec-Domäne): 2H zahlt −7,8 % EHP für nur ~+2 % Kills → die 2H-Offense-Prämie liegt am L90 bereits **deutlich unter** dem §13-Zielband +12 %; eher leicht UNTER-belohnt als über. Kein Blocker.

### (4) Alle 4 Endbosse killbar, 0 Tode mit Food? — **JA**
`cooked_soulfish` + Auto-Eat-Tier-3: idol_warden 0, aether_wraith 0, scale_skarn 0, last_idol 0 — **0 Tode über je 6 h, beide Loadouts, alle 6 Seeds** (min-HP-Boden ~78–80 %, d.h. Auto-Eat fängt selbst die last_idol-Enrage-Spikes ab). Kill-Volumen 206–317/h (last_idol am zähsten). Alle 4 Bosse haben Kills ≫ 0 (kein 0-Kill-Auffälliger).

---

## Befunde (Priorität + Owner)

**P1 — keiner.** Kein Blocker im Melee-Endgame-Pfad. Kein Cap-/Block-/One-Shot-Stacking-Exploit (Block = single-Offhand `MAX`-Aggregation 49,7 % < BLOCK_CAP; One-Shot-Cap 0,5·maxHp ~134–146 bindet im Endgame nie; Mitigation-Cap 0,80 von keinem Build erreicht).

**P2 (Balance-Watch) — 2H-Mitigation nahe Cap + §10-Trinity-Buff-Vektor · Owner: balance-designer (+ combat-dev für Buff-Guard).**
2H-defensive liegt bei **76,2 %** Mitigation (defense 399,74; Cap-Punkt def=500). Der neue §10-Buff-Typ erlaubt `trinity.armorRating` bis **150**. Ein „Stein-Haut"-Trank (+80, ×defMult 1,15 = +92) hebt 2H-def auf def ~492 → **79,7 % ≈ Cap**; ein Max-Buff (150) klemmt 2H hart auf 80 %. Damit verpufft weiteres armorRating UND 2H wird über die intendierten −7,8 % EHP hinaus stark. Kein Invuln (Cap nimmt weiterhin Schaden), aber: (a) 2H erreicht den Cap trivial (1H-def 57 % ist weit entfernt → asymmetrisch), (b) der Buff-Guard-Bereich `armorRating 0…150` ist für 2H zu großzügig. Empfehlung: Buff-`trinity.armorRating`-Obergrenze prüfen ODER 2H-Waffen-AR/defMult-Interaktion am Cap deckeln. (It1 P4-Watch, durch §10-Buffs jetzt schärfer.)

**P3 (Attributions-Hinweis, kein Bug) — Lifesteal-Änderung am Endgame inert; Food-Marge dünn · Owner: balance-designer.**
`MELEE_LIFESTEAL 0.08→0.06` (§6.2) ist am L90 **wirkungslos** — der Abs-Cap 1,2/Treffer bindet für beide Werte (s. Gate 2). Der Food-Effekt kommt allein aus §2. Konsequenzen für spätere Tunings: (a) Wer Endgame-Melee-Sustain justieren will, muss `MELEE_LIFESTEAL_CAP_ABS` (1,2) anfassen, nicht die Rate. (b) Die Food-Notwendigkeit hängt jetzt an einem **dünnen** Netto-Minus (−0,02…−0,16 HP/s) und ruht auf `maxWard=0`; jede künftige Melee-Sustain-Quelle (Lifesteal-Suffix, hpRegen-Gear, Ward auf Melee) könnte foodless zurück ins Triviale kippen → beim Suffix-/Set-Pass mitprüfen. Am unteren Band (L10) bleibt 0.08→0.06 hingegen wirksam (kleine Treffer < Cap) — die Änderung ist dort korrekt, nur am Endgame inert.

**Positive Bestätigungen (It1-Offenpunkte geschlossen):**
- **It1-P3 (Ward-Leak) GEFIXT:** reiner Melee-BiS zeigt `maxWard=0` (kein Gratis-Absorb, keine Ward-Leiste). `WARD_CORE_PER_INT=0` greift.
- **§4 (naked 2H = Suizid) verifiziert:** nackter 2H → `armorRating 0 / defense 0 / maxWard 0`.
- **§6.1 (Ward-Kill-Teil-Refill), §5.2 (Leder-Floor), §9 (Warding-Regen/XP):** Guard-Tests grün (irrelevant für reines Melee, aber mitgeprüft).

---

## It1 → It2 Diff (Kurz)

| Kennzahl | It1 (C-melee-L90) | It2 (dieser Bericht) | Bewegung |
|---|---|---|---|
| maxWard (reines Melee) | 15 (Leak) | **0** | Leak gefixt ✅ |
| Mitigation 1H power | 57 % | 54 % | ~gleich (×10-invariant, Platte-Retune) |
| Mitigation 2H power | 71,7 % | 73,6 % | leicht ↑ (näher am Cap → P2) |
| Steh-EHP 2H vs 1H | −5,6 % | −7,8 % | leicht ↑ Gap (Block-DR 0,75→0,85) |
| Foodless Nicht-Enrage-Bosse | 0 Tode, 90–100 % HP | **Tode auf allen** | Food-Ziel erfüllt ✅ |
| Foodless last_idol / 6 h | 8 Tode | 43 (1H) / 55 (2H) | Food deutlich nötiger |
| Mit Food, 4 Bosse | 0 Tode | 0 Tode | unverändert ✅ |

---

## Methodik / Reproduzierbarkeit
- Held: `createGame({baseAttributes:{str:30,con:30}})`, alle `COMBAT_SKILL_IDS`=99, Godiron 5-Platte (fullhelm/platebody/platelegs/gauntlets/sabatons) + (kiteshield | greatsword), `combatStyle` power/defensive, `autoEatTier=3`.
- computeStats → maxHp/armorRating/defense/blockChance/dodgeChance/maxWard; Steh-EHP = `maxHp / ((1−red)·(1−block·BLOCK_DAMAGE_REDUCTION))`, red = `min(0,80, def/(def+125))`, BLOCK_DAMAGE_REDUCTION=0,85.
- Survival: `startCombat(boss)` + 36 000 Ticks/Seed (60 min), `restartOnDeath`; Tode/Kills via `state.stats.deaths`/`.kills`-Delta, 6 Seeds summiert.
- Lifesteal-Cap-Nachweis: 32 Spieler-Treffer heilten 38,4 HP = 1,20/Treffer = Abs-Cap (Fight endete via Stalemate-Guard, daher sauber begrenzt).
- Ergebnisse seed-stabil (Nicht-Enrage foodless-Tode in allen 6 Seeds; Food-Läufe deterministisch 0 Tod). Armor/Mitigation/Ward/Lifesteal-Guard-Tests (32) grün.
