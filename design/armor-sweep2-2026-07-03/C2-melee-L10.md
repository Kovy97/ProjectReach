# Phase C2 — Combat-Tester (Iteration 2) · MELEE · Band L10 (Frühgame) · Rüstungs-Trinität

Stand 2026-07-03 · Kontrolleur (Combat-Tester, Iteration 2) · **HEADLESS** (createGame/computeStats/combatStep, Zeiten = SPIELZEIT, TICK_MS 100) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_c2M10_sweep.test.ts` gelaufen & gelöscht.
Loadout: **on-tier Eisen** (defence/attack 10; Kampf-Skills attack/power/defence/vitality = xpForLevel(10) → CL 10). 5-Platte (`iron_fullhelm/platebody/platelegs/gauntlets/sabatons`) + (`iron_kiteshield` | `iron_greatsword` | `iron_maul`). Gegner: die frei-startbaren Band-Mobs boar L10 (on-level) … goblin_spearman L20 (+10) + bull_boss L15 (Enrage) + der NEUE feral_goat L12 (armor-iter2 §9 Content-Gap-Fix, kein Slayer-Gate). Fenster: 600 s/Seed, TTD 20 Seeds, Sustain/Gradient 16 Seeds.
Vergleich: `design/armor-sweep-2026-07-03/C-melee-L10.md` (Iteration 1, Runde 1). Iteration-2-Spec: `design/armor-iteration2-spec.md`.

## VERDIKT: **SHIP (mit einer Balance-Notiz)** — die beiden It1-Frühband-Befunde sind BEHOBEN
Kein P1-Blocker. **It1-P4 (nackter 2H tankte) und It1-P3 (Food am On-Level vestigial) sind in It2 sauber geschlossen; der It1-Ward-INT-Leak ist weg.** Das System ist korrekt verdrahtet, alle 32 relevanten Mechanik-Guards grün (armor-iteration2-combat / armor-trinity-combat / mitigation / ward / lifesteal-respawn). **Eine echte Notiz (P3, balance):** die 1H+Schild-Defensive wanderte per Spec von flacher AR (35 %→32,6 %) auf stochastischen Block (15 %→24,8 % · 0,85) — netto glättet der Schild die Spikes NICHT, er erhöht ihre Varianz gegenüber dem flach-mitigierenden 2H (der jetzt 46,8 % trägt); an Über-Level-Mobs hat 1H+Schild dadurch ein NIEDRIGERES min-HP als 2H. Kein Bug, kein Tod (Food nullt alles), aber ein Feel-/Spike-Widerspruch zur Spec-§3-Begründung „Block glättet Spikes".

---

## It1 → It2 Konstanten-/Content-Diff, der am Band 10 zieht (verifiziert im Ist-Code)
| Hebel | Iteration 1 | **Iteration 2** | Quelle im Code |
|---|---|---|---|
| `WARD_CORE_PER_INT` | 1.0 | **0** | shared:576 → maxWard(melee) 3 → **0** |
| 2H-`armorRating`-Bonus-Gate | unbedingt | **× min(1, plateWorn/4)** | character.ts:342-350 |
| 1H+Schild flache Mitigation | 35 % | **32,6 %** | kiteshield AR 10.39 (war ~16.8 ×10) |
| Kiteshield `blockChance` | 15 % | **24,8 %** | content:1342 (`0.248`) |
| `BLOCK_DAMAGE_REDUCTION` | 0.75 | **0.85** | shared:542 |
| 2H flache Mitigation | 39 % | **46,8 %** | 2H weaponAR 60 (war ~2.8 ×10), content:1286/1294 |
| `iron_set`-con-Bonus | +2 | **+1** | content:12447 (§1.1 CON-Budget) |
| `MELEE_LIFESTEAL` | 0.08 | **0.06** | shared:360 |

---

## computeStats (Band L10, CL 10) — It2, mit It1-Delta
| Loadout | maxHp | con | armorRating | Mitigation | Block | Dodge | **maxWard** | atkMs | rawDPS | Modell-EHP\* |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **1H+Schild** (kite) | 47,7 | 20 | 60,46 | **32,6 %** | 24,8 % | 0 | **0** | 2840 | 2,78 | **90** |
| 1H+Turmschild | 49,7 | 21 | 60,46 | 32,6 % | 24,8 % | 0 | 0 | 2840 | 2,78 | 93 |
| **2H-Greatsword** | 41,7 | 17 | 110,07 | **46,8 %** | 0 | 0 | **0** | 3320 | 3,43 | **78** |
| 2H-Maul | 41,7 | 17 | 110,07 | 46,8 % | 0 | 0 | 0 | 3400 | 3,59 | 78 |
| Plate-1H-ohne-Schild | 41,7 | 17 | 50,07 | 28,6 % | 0 | 0 | 0 | 2840 | 2,78 | 58 |
| **Ungepanzert-1H** | 17,7 | 5 | 0 | **0 %** | 0 | 0 | 0 | 2840 | 1,73 | **18** |
| **Nackt-2H-GS** | 17,7 | 5 | **0** | **0 %** | 0 | 0 | 0 | 3320 | 2,53 | **18** |

\* Modell-EHP = `maxHp / ((1−red)·(1−block·0,85))`, red = `armorRating/(armorRating+125)`. **Block-DR jetzt 0,85 (war 0,75).**
It1-Referenz: 1H+Schild maxHp 49,7 / mit 35 % / block 15 % / **maxWard 3** / EHP 86 · 2H maxHp 43,7 / mit 39 % / EHP 71.

**Zwei It1→It2-Kernbefunde direkt aus der Tabelle:**
1. **maxWard 3 → 0 auf ALLEN Melee-Loadouts** → der It1-P3-„Ward-INT-Leak" (`WARD_CORE_PER_INT` 1.0) ist ELIMINIERT. Kein Gratis-Absorb-Sockel mehr, keine Ward-Leiste auf reinem Melee.
2. **Nackt-2H-GS: armorRating 0, Mitigation 0 %, Modell-EHP 18 = identisch zu Ungepanzert-1H** → der It1-P4-Bug (nackter 2H trug 18 % @L10, 47–50 % high-band via unbedingtem `twoHandMeleeArmorBonus`) ist durch die `× min(1, plateWorn/4)`-Kopplung (character.ts:347-350) geschlossen: 0 Platten-Teile → Faktor 0 → Bonus 0.

---

## Die vier Gate-Fragen (mit Zahlen + It1-Vergleich)

### (1) Rüstung bedeutsam? — **JA, dramatisch (unverändert stark)**
- Modell-EHP ungepanzert **18** → 1H+Schild **90** = **5,0×** (It1 4,8×).
- No-food-TTD (Spielzeit bis 1. Tod, kein Restart, 20 Seeds): Ungepanzert-1H stirbt gegen **jeden** Mob zu 100 %, 11–22 s, 0–0,8 Kills — gepanzert 70–187 s, 3,5–15,7 Kills. Der Unterschied bleibt „Tod in 2–4 Treffern" vs. „Dauer-Farm". ✅

### (2) Nackt-2H jetzt Suizid? — **JA, 100 % (It1-BUG BEHOBEN)** ✅✅
| Mob (Lvl, dmg) | Nackt-2H-GS | Ungepanzert-1H | It1 Nackt-2H (§P4) |
|---|---|---|---|
| boar (10, 5) | **26 s / 1,1 K / 100 %** | 22 s / 0,6 K / 100 % | tankte 18 % mit, EHP 22 |
| goblin (15, 7) | **19 s / 1,0 K / 100 %** | 19 s / 0,8 K / 100 % | — |
| goblin_shaman (18, 9) | 19 s / 0,7 K / 100 % | 12 s / 0,1 K / 100 % | — |
| goblin_spearman (20, 9) | 11 s / 0,1 K / 100 % | 11 s / 0,0 K / 100 % | — |
| bull_boss (15, Enr) | 11 s / 0,0 K / 100 % | 13 s / 0,0 K / 100 % | — |

- Der nackte 2H hat jetzt **exakt 0 % Mitigation** und Modell-EHP 18 (= Ungepanzert-1H), stirbt gegen alles zu 100 % in 11–26 s / 0–1,1 Kills. Das minimale Über-Ungepanzert-1H (26 vs 22 s @boar) ist reiner Greatsword-DPS (schnellere Kills = etwas weniger Zeit unter Feuer), NICHT Rüstung. **It1-„unarmored = Suizid bricht für 2H" ist geschlossen.** ✅

### (3) Food nötig (Lifesteal 0.06)? — **JA, jetzt SPÜRBAR (It1-P3 „vestigial am On-Level" BEHOBEN)** ✅
Sustain 600 s, 1H+Schild, Auto-Eat Tier 0 (< 50 %), 16 Seeds:
| Mob | mit chicken(3) | Food-Verbrauch | min-HP | **OHNE Food (Tode/600 s, min-HP)** | It1 no-food |
|---|---|---:|---:|---|---|
| boar L10 (on-level) | 39,3 K, 0 Tode | **24** | 50 % | **2,38 Tode, min 2 %** | ~0 Tode |
| feral_goat L12 (+2, NEU) | 26,9 K, 0 Tode | 61 | 46 % | 4,69 Tode, min 1 % | (Mob war It1 nicht offen) |
| goblin L15 (+5) | 51,6 K, 0 Tode | **23** | 46 % | **2,25 Tode, min 3 %** | 0,19 Tode, min 27 % |
| goblin_shaman L18 | 35,5 K, 0 Tode | 91 | 29 % | 6,69 Tode | stirbt |
| goblin_spearman L20 | 34,8 K, 0 Tode | 101 | 26 % | 7,13 Tode | stirbt |
| bull_boss L15 | 18,4 K, 0 Tode | 100 | 23 % | 7,56 Tode | stirbt |

Food-Gradient vs goblin (1H+Schild, 600 s, 16 Seeds):
| Food | Heal | Kills | Tode | verbraucht | min-HP | It1 (Tode / min-HP) |
|---|---:|---:|---:|---:|---:|---|
| **KEIN** | 0 | 50,9 | **2,25** | 0 | 3 % | 0,19 / 27 % |
| cooked_shrimp | 1 | 51,6 | 0,06 | 111 | 23 % | 0 / 46 % |
| cooked_chicken | 3 | 51,6 | **0** | 23 | 46 % | 0 / 54 % |
| cooked_cod | 4 | 51,7 | 0 | 30 | 48 % | 0 / 54 % |

- **Am On-Level (boar/goblin) stirbt no-food jetzt 2,25–2,38× / 600 s** (It1: ~0 / 0,19). min-HP no-food 2–3 % (It1: 27 %). **Food-Verbrauch am On-Level 10× hoch (2 → 23–24 Stück).** Constraint-2 „Food strukturell nötig" hält jetzt AUCH am unteren Band. ✅
- **Ehrlicher Mechanik-Hinweis:** der Treiber am Band 10 ist NICHT primär der Lifesteal-Nerf. Melee hat innaten Lifesteal (combat.ts:1242), aber bei L10-Treffern (~2,5 Schaden) verschluckt das `round(dmg·rate·10)/10`-Raster den Unterschied 0.08→0.06 fast komplett (~0,2 HP/Treffer in beiden Fällen). Die On-Level-Food-Rückkehr kommt aus **Ward-Leak-Wegfall (3 Gratis-Absorb ≈ ½ Treffer/Encounter weg) + 1H-mit 35→32,6 % + con −1**. Der 0.06-Nerf beißt erst am High-Band (große Treffer). Am Band 10 wirkt er korrekt neutral — kein Overkorrektur-Risiko hier.
- shrimp(1) nullt Tode NICHT mehr ganz (0,06 Rest, 111 verbraucht); chicken(3) reicht. Sauber kalibriert: Food nötig, aber On-Level nicht brutal.

### (4) 1H+Schild ≈ 2H jetzt (Block 0.85)? — **VIEL näher als It1, echter Sidegrade — aber mit Spike-Notiz** ⚠️
**EHP-Parität:** Modell-EHP 2H **78** / 1H **90** → **2H = 86,7 % von 1H** (It1: 82,5 %; Spec-Ziel §4.4 = 90 %). **+4,2 pp Richtung Ziel**, aber weiter ~3,3 pp unter −10 %. Ursache Rest-Lücke: die Schild-`+3 con` (−6 HP an 42-HP-Pool) wiegt am Band 10 schwer; der auf 60 angehobene 2H-weaponAR hebt die 2H-Mitigation auf 46,8 % (Spec-§11.3-Ziel „47 %" exakt getroffen), aber der maxHp-Rückstand bleibt.

**Pro-Treffer (der Spec-§13-Kriterium-6-Test „1H-Faktor ≤ 2H"):**
- 1H+Schild Ø-Durchlass = `(1−0,326)·(1−0,248·0,85)` = 0,674 · 0,789 = **0,532**
- 2H Durchlass (flach) = `(1−0,468)` = **0,532** → **im Ø exakt gleich** (Kriterium 6 „≤" gerade noch erfüllt).
- **ABER:** 1H auf einem NICHT-geblockten Treffer (75 % der Fälle) = **0,674 > 2H 0,532**. 1Hs Verteidigung ist jetzt bimodal (0,674 ungeblockt / 0,101 geblockt), 2H flach 0,532. → 1Hs schlimmster Treffer ist größer als JEDER 2H-Treffer.

**Empirie (das bestätigt die Bimodalität):**
- No-food-TTD @goblin: 1H **187 s** vs 2H **94 s** → 1H überlebt 2× so lang (höhere Gesamt-EHP + Block-Mittel). ✅ 1H = Survival-Anker am On-Level.
- Aber Sustain-min-HP @Über-Level (Food, 0 Tode): shaman 1H **29 %** vs 2H-GS **42 %**; bull_boss 1H **23 %** vs 2H-GS **27 %** → **2H hat die HÖHEREN min-HP** (flache Mitigation dämpft die Spitzen zuverlässiger als stochastischer Block).
- Throughput (Food, 600 s): goblin 1H 51,6 K ≈ 2H-GS 50,9 K ≈ 2H-Maul 50,1 K (**Low-HP-Overkill → gleich**, wie It1); shaman 1H 35,5 vs 2H-GS 39,8 (**2H +12 %**); bull_boss 1H 18,4 vs 2H-GS 21,9 (**2H +19 %**, wie It1). 2H kassiert seine DPS weiter nur an High-HP-Zielen.

**Fazit Q4:** Die Block-0,85-/2H-weaponAR-Hebel haben 1H+Schild und 2H aus der It1-Ein-Seiten-Dominanz zu einem **echten Sidegrade** gebracht — 1H = Survival-Anker (2× no-food-TTD am On-Level, +4 maxHp), 2H = Offense (+12…19 % Kills an High-HP) MIT jetzt konkurrenzfähiger, an Über-Level sogar glatterer Mitigation. Näher an der Spec-Absicht als It1. **Der Rest-Widerspruch:** die Spec §3 begründet den Block-Buff mit „Block glättet Spikes" — mechanisch tut er das GEGENÜBER FLACHER AR **nicht** (Block ist Varianz, nicht Glättung), und weil die Schild-flach-AR gleichzeitig gesenkt wurde (35→32,6 %), ist 1H+Schild an harten Mobs spitzenanfälliger als der flach-mitigierende 2H. Kein Tod (Food deckt), aber ein Feel-Punkt.

### Block isoliert (gleiche `iron_sword`, no-food, TTD, 20 Seeds)
| Build | maxHp | Mitigation | Block | TTD @goblin | TTD @boar |
|---|---:|---:|---:|---:|---:|
| 1H+Schild | 47,7 | 32,6 % | 24,8 % | **187 s** | **173 s** |
| Plate-ohne-Schild-1H | 41,7 | 28,6 % | 0 % | 109 s | 109 s |

Der Schild (+3 con, +4 pp flache Mitigation, +24,8 % Block · 0,85) = **+59…+71 % no-food-Überlebenszeit**. Block wirkt (bestätigt via Guards); RNG-Draw NUR bei blockChance > 0 (2H/kein Schild → kein Draw → Alt-Content-Parität).

---

## Befunde (Priorität + Owner)

**P1 — keiner.** Kein Blocker im Melee-Frühgame-Pfad. Alle Mechanik-Guards grün (32/32).

**It1-P4 (nackter 2H tankte) — GESCHLOSSEN.** `× min(1, plateWorn/4)` (character.ts:347-350) → nackter 2H armorRating 0 / mitigation 0 / EHP 18 / 100 % Tod. Re-Gate-Kriterium §13.3 erfüllt.

**It1-P3 (Ward-INT-Leak) — GESCHLOSSEN.** `WARD_CORE_PER_INT = 0` → maxWard(melee) = 0 auf allen Loadouts. Keine Ward-Leiste, kein Gratis-Absorb.

**It1-P3 (Food am On-Level vestigial) — BEHOBEN.** No-food stirbt am On-Level jetzt 2,25–2,38× / 600 s (war ~0 / 0,19); Food-Verbrauch On-Level 10× hoch. Constraint-2 hält am unteren Band.

**P3 (Balance, NEU-Notiz) — 1H+Schild ist varianz-, nicht glättungs-getunt · Owner: balance-designer.**
Der Spec-§3-Umbau (Schild-flach-AR 35→32,6 % RUNTER, blockChance 15→24,8 % + DR 0,85 RAUF) macht 1H+Schild pro Treffer bimodal: Ø-Durchlass 0,532 (= 2H), aber ungeblockt 0,674 > 2Hs flache 0,532. Effekt: an Über-Level-Mobs hat 1H+Schild ein NIEDRIGERES min-HP als der 2H (shaman 29 % vs 42 %, boss 23 % vs 27 %) — das Gegenteil der Spec-Begründung „Block glättet Spikes". Kein Tod (Food deckt), 0 Exploits. Optionaler Hebel, falls „Schild = ruhiger Tank" gewünscht: einen kleinen Teil des Schild-Defense-Budgets von Block zurück in flache AR schieben (z. B. block 24,8→20 %, Schild-AR leicht rauf) — glättet die Spitzen ohne die EHP-Parität zu brechen. **Nur Feel, kein Gate-Blocker.**

**P4 (Balance-Rest) — 2H-EHP 86,7 % statt 90 % am Band 10 · Owner: balance-designer (Watch).**
It1 82,5 % → It2 86,7 % (deutlich besser), aber weiter ~3,3 pp unter dem −10 %-Ziel, weil die fehlende Schild-`+3 con` (−6 HP) an einem 42-HP-Pool schwer wiegt. Band-skaliert (bei L90 erwartet fair). Rest-Hebel nur bei Bedarf: minimaler con/maxHp-Ersatz an 2H-Waffen am Low-Band. Innerhalb ±10 %-Toleranz für ship.

**BEKANNTER TRIM (nur bestätigt, NICHT neu): R10-Frühband-Leiterlücke Leder/Stoff.** Außerhalb dieses Melee-Laufs (kein Leder/Stoff getragen), daher hier nicht direkt gemessen. Als bekannt (Untertierung, Parität ±21 %) übernommen, kein neuer Befund.

**`defenseType` (Monster) — kein Bug.** In combat.ts NICHT gelesen (resolveAttack nutzt `monster.defense` direkt, defenseType-neutral). Das ist per shared:2107-2111 + SAVE_VERSION-51-Kommentar **intendiert** („jetzt nur Daten/Tagging, die Konter-Wirkung folgt"); content-integrity-Guard prüft nur die Existenz. Bit-invariant zwischen It1/It2 (die ×10-Monster-`defense` mit K=125 hält die Player-DPS-out-Mitigation identisch). Notiert, nicht gemeldet.

**Kein Exploit bestätigt:** One-Shot-Cap (50 % maxHp ≈ 21–25) bindet am Band 10 NIE (schlimmster Treffer bull_boss-Enrage ~11). Block = single-Offhand + MAX-Aggregation. maxWard 0 → kein Ward-Draw. Mitigation 28–47 %, weit vom 0,80-Cap. Held nicht un-treffbar (Gegner-Trefferquote ~70 %).

---

## Methodik / Reproduzierbarkeit
- Held: `createGame({name, startingStyle:"melee"})` (Stance `attack`, defMult 1,0), Skills attack/power/defence/vitality = `xpForLevel(10)` → CL 10; con 20 (1H+kite) / 17 (2H) aus Platten-`modifiers` + `iron_set`-Bonus (≥5 Teile, jetzt +con 1/+str 2).
- Instrumentierung: eigener `combatStep`-Loop (TICK_MS 100). Kills/Tode aus `state.stats.kills/deaths`. Food-Verbrauch aus `itemCount`-Delta (200k gebunkert). min-HP als Sim-Minimum von `character.hp/maxHp`.
- TTD = Zeit bis 1. Tod, kein Restart (Kampf endet on-death via `onPlayerDefeated` → `monsterId=null`). Sustain = 600 s, Restart-on-death (Neustart desselben Mobs bei `monsterId===null`), Auto-Eat Tier 0.
- Modell-EHP = `maxHp / ((1−red)·(1−block·0,85))`, red = `armorRating/(armorRating+125)` (Block-DR 0,85 = It2).
- Seed-stabil: Ungepanzert/Nackt 100 % Tod deterministisch; 1H+Schild/2H 0 Tode mit chicken in allen Zellen. TTD 20 Seeds, Sustain/Gradient 16 Seeds.
- Verifiziert grün (headless): armor-iteration2-combat (8), armor-trinity-combat (8), mitigation (2), ward (10), lifesteal-respawn (4) = 32/32.
