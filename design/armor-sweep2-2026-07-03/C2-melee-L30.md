# Phase-C2 Combat-Tester (Armor-Iteration 2) — STIL=MELEE, BAND=L30

Stand 2026-07-03 · Tester: kontrolleur · **READ-ONLY** (Wegwerf-Harness `_tmp_c2M30_sim.test.ts` gelaufen & gelöscht, kein Spiel-Code geändert)
Specs: `design/armor-iteration2-spec.md` · It1-Vergleich: `design/armor-sweep-2026-07-03/C-melee-L30.md`
Methodik: echte Engine (`createGame`→`equipItem`→`startCombat`→`combatStep`), 100 % Kampf, TICK_MS=100 (10 Steps=1 s **Spielzeit**), Kill-Cooldown 5 s, Auto-Eat Tier 0 (Schwelle 50 %). Kills/h & endHp/minHp = **Mittel aus 3 Seeds** (1/7/42). TTD = Mittel aus 3 Seeds.
It2 ist **appliziert** (verifiziert: K=125, BLOCK_DR=0.85, WARD_CORE_PER_INT=0, MELEE_LIFESTEAL=0.06, K_DODGE=45, LEATHER_HIT_FLOOR=0.12, SAVE_VERSION=51). Stützende Guard-Tests grün: `mitigation` (×10-Invarianz), `armor-iteration2-combat` (8), `armor-trinity-combat` (8), `wiring-audit`, `set-bonus` → **23/23**.

## Setup (identisch zu It1, für sauberen Vergleich)
- Held: Melee, Skills `attack=power=defence=vitality=30` → combatLevel 30, `attack`-Stance (Default), Food/Auto-Eat Tier 0.
- On-tier „Blacksteel": 5 Platten (`fullhelm`+`platebody`+`platelegs`+`gauntlets`+`sabatons`) + `blacksteel_kiteshield` (block **0.304**) bzw. 2H `blacksteel_greatsword`/`blacksteel_maul` (Waffen-`armorRating` **83**, ×10-Skala).
- On-tier-Mobs: `goblin_warlock` L30 (dmg13/3.2 s/burn), `ash_rat` L30 (dmg12/2.6 s, schnell), `goblin_stormcaller` L28 (dmg12/3.0 s/shock). „+2 drüber": `mire_crawler` L38, `pitch_beetle` L42, `ash_tyrant` L45.

---

## VERDIKT: **fix-then-ship** — 3 von 4 Melee-Zielen sauber erreicht; das 4. (1H+Schild≈2H) NUR auf der Sicherheits-Achse, NICHT bei Durchsatz
Rüstung bedeutsam ✅, nackter 2H = Suizid ✅ (der §4-Bug ist gefixt), Food nötig ✅ (sogar strenger als It1). **1H+Schild ist jetzt die echte höhere-EHP-/länger-überlebende Defensiv-Linie** (im It1 war 2H no-food SOGAR TANKIGER — Flip erreicht). ABER: 2H hält weiter **+17–20 % Kills/h** on-tier bei 0 Toden beider — der Block-0.85-Hebel schließt die **Sicherheits**-Lücke, nicht die **Durchsatz**-Lücke. Ursache: die **2H-Waffen-DPS wurde NICHT getrimmt** (greatsword unverändert 7.8–15.2, Ø-Hit 20.6 identisch zu It1) — genau der Hebel, den die Spec §3/§13 bewusst in die **Waffen-Spec** verschoben hat. Kein Absturz, kein Wall, kein Blocker.

---

## Stat-Readout (computeStats, L30, attack-Stance) — It1 → It2

| Build | maxHp | mit% It1→It2 | block% It1→It2 | Pro-Treffer-Faktor It1→It2 | EHP It1→It2 |
|---|---:|---:|---:|---:|---:|
| 1H+Schild (sword+kite+plate) | 73.7 | 42.5 → **37.8** | 24 → **30.4** | 0.472 → **0.461** | 156 → **160** |
| 1H+Schild DEFENSIV-Stance | 73.7 | 45.9 → **41.1** | 24 → 30.4 | — → **0.437** | 166 → **169** |
| 2H greatsword | 63.7 | 51.7 → **54.0** | 0 | 0.483 → **0.460** | 132 → **139** |
| 2H maul | 65.7 | 51.7 → **54.0** | 0 | 0.483 → **0.460** | 136 → **143** |
| UNARMORED (nur sword) | 33.7 | 0 | — | 1.000 | 34 → 34 |
| UNARMORED (nur greatsword) | 33.7 | **34.0 → 0** | — | — → 1.000 | 51 → **34** |

Pro-Treffer-Faktor = Ø-HP-Anteil je Treffer: 1H `(1−mit)(1−block·BLOCK_DR)`, 2H `(1−mit)`. EHP = `maxHp / Faktor` (It1: BLOCK_DR 0.75; It2: 0.85).

**Die vier It1→It2-Kern-Verschiebungen:**
1. **1H+Schild:** Platten-Mit runter (42.5→37.8, §11.2 „Platte-Mid runter") + Block rauf (24→30.4) + BLOCK_DR 0.75→0.85 → Pro-Treffer 0.472→**0.461** (leicht tankiger/Treffer), EHP 156→**160**.
2. **2H:** flache Mit RAUF (51.7→**54.0**, §11.3-Tabelle) → Pro-Treffer 0.483→**0.460**. maxHp bleibt 63.7 (2H-Anker 0.86× = −10 %-EHP-Ziel via HP, NICHT via Mit). EHP 132→**139** (−13 % vs 1H).
3. **Nackter 2H:** mit **34.0 → 0** — der §4-Fix (`twoHandMeleeArmorBonus × min(1, plateWorn/4)`, plateWorn=0 ⇒ 0) greift. EHP 51→**34** = jetzt gleich nacktem Schwert.
4. **maxHp/con-Budget unverändert** (73.7/63.7/65.7/33.7 bit-identisch zu It1) — die §1.1-CON-Leitplanke zielte auf das Low-Band (iron L10), nicht auf Blacksteel L30; L30-Anker war bereits sauber.

---

## (1) Rüstung bedeutsam? — **JA, unverändert klar (~4–5× Survivability)**
UNARMORED-sword EHP **34**, stirbt on-tier in **10–13 s / 0 Kills**; 1H+Schild EHP **160**, farmt minutenlang. Der ×10-Armor-Rescale ist reine Anzeige (mit% bit-invariant, `mitigation.test.ts` grün). Bedeutsam ✅.

## (2) Nackter 2H = Suizid JETZT? — **JA (der It1-Bug ist gefixt)**
- **It1:** „nackt + greatsword" trug 34 % Mitigation (Waffen-AR unbedingt) → EHP 51, TTD 27–46 s / 1–2 Kills → **„unarmored=Suizid" brach für 2H**.
- **It2:** nackter 2H → mit **0 %**, EHP **34**, TTD **~9–20 s / 0–1 Kills** (avg 14 s) — **dieselbe Liga wie nacktes Schwert** (10–13 s). Der §4-Fix (plateWorn/4-Kopplung) ist wirksam; `armor-iteration2`/`armor-trinity`-Combat-Tests re-pinnen es. ✅

## (3) Food nötig / nicht trivial? — **JA, strenger als It1**
No-food, gepanzert, bis zum ersten Tod (avg 3 Seeds):

| vs Mob | 1H+Schild It1→It2 | 2H-gs It1→It2 |
|---|---:|---:|
| goblin_warlock | 150 s → **101 s** | 164 s → **97 s** |
| ash_rat | 90 s → **85 s** | 129 s → **91 s** |
| goblin_stormcaller | **∞ (überlebt)** → **136 s** | 85 s → **76 s** |

- Die **`MELEE_LIFESTEAL` 0.08→0.06** (§6.2) verkürzt jede no-food-TTD und **eliminiert die It1-„foodless-forever"-Ecke**: der weichste on-tier-Mob (stormcaller), gegen den 1H+Schild in It1 UNBEGRENZT hielt, tötet jetzt in **136 s**. Food-Druck ist zurück. ✅
- **Mit Food** (salmon h6, 30 min): **0 Tode** bei allen Builds; endHp pendelt **51–62 %**, minHp **32–49 %** — deckt den Drain, überheilt nicht → spürbarer Dauerdruck.
- **Food-Wahl zählt:** 1H+Schild vs goblin_warlock, 30 min: `cooked_cod` (h4) 187 kph / endHp 47 % / **365 Einheiten** vs `cooked_salmon` (h6) 187 kph / endHp 51 % / **244 Einheiten** — Preis/Menge-Tradeoff, keine Bestrafung. ✅

## (4) 1H+Schild ≈ 2H jetzt? — **Sicherheit: JA/geflippt. Durchsatz: NEIN (2H weiter +20 %).**

### 4a) Sicherheit/EHP — 1H+Schild ist jetzt die echte Defensiv-Linie (Flip vs It1)
- **EHP:** 1H+Schild **160** vs 2H **139–143** = **1H +12…15 % tankiger** (It1 war 156 vs 132 = +18 %; Ziel §11.6 ~+11 %). 1H bleibt klar der EHP-König.
- **No-food-Überleben (der entscheidende Flip):** In **It1 überlebte 2H LÄNGER** no-food (goblin_warlock 164 s vs 1H 150 s) UND war pro-Treffer tankiger — der It1-P2. In **It2 überlebt 1H+Schild ≥ 2H auf 2 von 3 on-tier-Mobs**: goblin_warlock **101 s vs 97 s**, stormcaller **136 s vs 76 s** (+79 %!); nur gegen den schnellen `ash_rat` liegt 2H vorn (91 s vs 85 s). **Die Sword-&-Board-Defensiv-Identität ist auf der Überlebens-Achse jetzt real.** ✅

### 4b) Durchsatz — 2H dominiert weiter (Waffen-DPS unangetastet)
Food-Farm (salmon), 30 min, 0 Tode je Build, Kills/h (avg 3 Seeds):

| Build | goblin_warlock | ash_rat | stormcaller |
|---|---:|---:|---:|
| 1H+Schild | 187 | 263 | 253 |
| 1H+Schild DEFENSIV | 186 | 264 | 249 |
| **2H greatsword** | **224** | **307** | **266** |
| 2H maul | 224 | 302 | 267 |
| **2H-Vorsprung** | **+20 %** | **+17 %** | **+5 %** |

- **It1: +22 %. It2: +17–20 %.** Praktisch unverändert. Der Block-0.85-Hebel hat die **Sicherheit** angeglichen, aber die **Kills-Lücke ist eine Waffen-DPS-Frage** — und die **2H-Waffen-DPS wurde NICHT getrimmt** (greatsword dmg 7.8–15.2, Ø-Hit 20.6 = bit-identisch zu It1; maul Ø-Hit 21.1 = identisch). Genau wie die Spec §3/§13 es festhält: „2H-Offense-Prämie …→ Waffen-Spec, hier nur geflaggt". ⚠️
- **Feel-Umkehrung im Normalspiel:** trotz höherer Papier-EHP erreicht 1H+Schild MIT Food den TIEFEREN minHp-Boden (goblin_warlock **35 % vs 2H 46 %**), weil (a) Block **Varianz** ist (ungeblockter Treffer trifft mit 0.622 tiefer als 2H-konstant 0.460) und (b) 1H langsamer killt → längere Burn-/Schlag-Exposition. **2H ist im Food-Farm also weiter sowohl durchsatzstärker ALS AUCH gefühlt sicherer (höherer HP-Boden)** — die Defensiv-Prämie zahlt sich nur no-food/EHP aus, nicht im gefütterten Normalspiel.

**Fazit #4:** Armor-It2 hat 1H+Schild die höhere EHP + das längere no-food-Überleben verschafft (Ziel erreicht, gegenüber It1 geflippt), aber **„≈ bei Kills-gleicher-Sicherheit" ist weiter NICHT erfüllt** — dafür fehlt der 2H-Waffen-DPS-Trim (Waffen-Spec, out-of-scope dieser Iteration).

## (5) L30 + 2 drüber — sanfte Abbremsung, kein Wall (unverändert zu It1)
Salmon, 30 min, 0 Tode überall:

| vs Mob | 1H+Schild kph It1→It2 | 2H-gs kph It1→It2 | endHp% (1H/2H) |
|---|---:|---:|---:|
| mire_crawler L38 (+8) | 206 → **208** | 242 → **240** | 56 / 59 |
| pitch_beetle L42 (+12) | 158 → **156** | 184 → **185** | 47 / 57 |
| ash_tyrant L45 (+15) | 86 → **85** | 102 → **103** | 51 / 57 |

Über-Level-Durchsatz **praktisch identisch zu It1** (Kill-Speed unberührt). ash_tyrant L45 halbiert den Durchsatz (85–103 vs ~180–220) bei 0 Toden — Progressions-Druck, kein Cliff. **Ohne Food** kippt es hart (1H+Schild TTD: mire 78 s, pitch 79 s, ash_tyrant 62 s/1 Kill) — Food beim Über-Level-Farmen doppelt zwingend. Deckt „Undergeared-Walls=gewollt". ✅

---

## Befunde (P1–P4)

**P1 — keine.** Kein Absturz, kein Wall, kein Sequenz-Bruch. Alle stützenden Guard-Tests grün (23/23). Trinität am L30-Band korrekt verdrahtet; die vier It2-Melee-Mechaniken (Block 0.85, 2H-mit, §4-plateWorn-Kopplung, Lifesteal 0.06) greifen alle messbar.

**P2 — 2H hält on-tier +17–20 % Kills/h bei 0-Tod-Parität (der It1-P2, gemildert aber NICHT gelöst).**
Zahlen: 2H 224 vs 1H 187 kph (goblin_warlock) = +20 %; +17 % (ash_rat), +5 % (stormcaller). Ursache: die **2H-Waffen-DPS ist unverändert** (Ø-Hit 20.6 = It1). Der Armor-Iteration-Teil ist erledigt (1H EHP +15 %, no-food-Flip); die verbleibende Durchsatz-Lücke ist definitionsgemäß eine **Waffen-Spec-Aufgabe** (Spec §3-Grenze + §13 offener Chef-Entscheid „2H-Offense-Prämie +22→+12 % trimmen"). *Owner:* **balance-designer → Waffen-Spec.** Kein Armor-content/combat.ts-Fix.

**P3 — Re-Gate-Kriterium #6 (Pro-Treffer) marginal NICHT erfüllt.**
#6 fordert „1H-EHP > 2H-EHP UND 1H-Pro-Treffer-Faktor ≤ 2H". EHP-Klausel klar erfüllt (160 > 139). Pro-Treffer-Klausel **um 0.2 % verfehlt**: 1H **0.461** vs 2H **0.460** (2H einen Hauch weicher/Treffer). Grund: die 2H-flat-Mit stieg 51.7→**54.0** (§11.3-Tabelle verbatim), was den Block-0.85-Buff auf der Ø-Ebene fast exakt neutralisiert, statt 1H klar vorziehen zu lassen. **Die applizierten Werte entsprechen der Spec §11.2/§11.3 exakt** — das ist also eine **Spec-Kalibrierungs-Entscheidung**, kein Content-Apply-Bug. Wenn 1H strikt pro-Treffer-tankiger sein soll: 2H-weaponAR eine Stufe runter ODER block/BLOCK_DR minimal rauf. *Owner:* **balance-designer** (Kalibrierung), nicht content/combat.

**P4 — Feel: 1H+Schild ist im gefütterten Normalspiel SPIKIGER als 2H trotz höherer EHP.**
Mit Food (0 Tode) erreicht 1H+Schild den TIEFEREN minHp-Boden (35 % vs 2H 46 %, goblin_warlock), weil Block reine Varianz ist (ungeblockter Treffer 0.622 vs 2H konstant 0.460) und 1H langsamer killt (mehr DoT-/Schlag-Exposition). Netto bleibt 2H im Normalspiel **beides**: durchsatzstärker UND mit höherem HP-Boden — die „Sword-&-Board fühlt sich sicherer an"-Fantasie zahlt sich nur no-food/EHP aus. Kein Bug (Block-Varianz ist spec-gewollt, §5-Analogie), aber der Grund, warum P2 sich weiter zugunsten 2H anfühlt. *Owner:* balance-designer (Kontext für P2/#3-Chef-Entscheid).

---

## It1 → It2 Netto-Bilanz (Melee L30)
| Ziel (Spec-Constraint) | It1 | It2 | Delta |
|---|---|---|---|
| Rüstung bedeutsam | ✅ | ✅ | = |
| Nackter 2H = Suizid | ❌ (2H mit 34 %) | ✅ (2H mit 0 %) | **behoben (§4)** |
| Food nötig / nicht trivial | ✅ (mit foodless-Ecke) | ✅ (Ecke weg, Lifesteal 0.06) | **strenger** |
| 1H+Schild ≥ 2H Sicherheit | ❌ (2H no-food tankiger) | ✅ (1H EHP +15 %, no-food-Flip) | **geflippt** |
| 1H+Schild ≈ 2H Kills | ❌ (+22 %) | ❌ (+17–20 %) | **unverändert** (Waffen-DPS) |

## Empfehlung
**fix-then-ship.** Die Armor-Iteration hat ihre vier Melee-Ziele auf der **Rüstungs-Achse** sauber geliefert (bedeutsam / nackt-2H-Suizid / Food-Druck / 1H-EHP-Prämie + no-food-Flip). Der einzige offene Punkt (P2: 2H +20 % Kills/h) ist **per Spec-Design** eine Waffen-Spec-Aufgabe, kein Armor-Bug → **P2-Ticket an balance-designer/Waffen-Spec** (2H-Offense-Prämie trimmen, §13-Chef-Entscheid). P3 (Pro-Treffer-Tie) optional an balance-designer als Kalibrierungs-Feinschliff. Kein Eingriff in content/character.ts/combat.ts durch diese Befunde nötig; die reine QA-Gate-Suite (typecheck/full-test/build) gehört in den §12-E-Re-Gate-Schritt.
