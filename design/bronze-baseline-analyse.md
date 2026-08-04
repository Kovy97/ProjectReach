# Bronze-Baseline-Analyse — die 9 Auffälligkeiten im L30–48-Band (Task #352, 2026-07-25)

**Auftrag:** Die seit Wochen konstanten „AUFFÄLLIGKEITEN — Bronze-Baseline (9)" systematisch erklären; Chef-Empirie („bin 30, kriege fast kein Damage gegen Level-30-Viecher") verorten; Alt→Neu-Vorschlag. **Reine Analyse — kein Content-Edit; Umsetzung erst nach Chef-GO.**

**Methodik:** Alle Zahlen aus dem Live-Sim (`npx vitest run sim.test.ts`, Lauf 2026-07-25) und zwei Wegwerf-Skripten, die die echten Engine-Pfade aufrufen (`simulateCombat`, `computeStats`, `contestHitChance`, gepatchter Content-Klon für die Neu-Werte-Verifikation; Skripte im Session-Scratchpad, nichts im Repo). TTK-Zellen: 10-min-Fenster (statt 3-min-Report) für stabile Kill-/Tode-Zahlen. Worst-Case-Annahmen wie im Report: Auto-Eat Tier 0 (Schwelle 45 %), keine Tränke/Runen/Buffs/Sets.

---

## 1) TL;DR — Wurzelursache in zwei Sätzen

Das L30–48-Band besteht aus **zwei nie zusammengeführten Stat-Populationen**: Die Slayer-Tower-Mobs wurden im balance-pass2 (01.07.) auf eine Mini-HP-Kurve gesetzt (24–29 HP, 0,55–0,83× der gesunden HP-Fit-Kurve aus monster-threat-spec §4), die Openworld-Mobs (Aschefelder/Borderlands/Schwarzdorn) stehen auf der alten Zonen-Kurve (32–112 HP, 1,05–2,35× Fit) — und die Sim-Heuristik (`findIssues`: „unbesiegbar, obwohl Mobs bis L48 besiegbar sind") vergleicht beide gegeneinander, wodurch **jeder gesunde Openworld-Mob automatisch als „zu tanky" geflaggt wird, solange die Unter-Kurve-Tower-Mobs Bronze-killbar bleiben**. Zweitens hob Combat-Feel-v2 #0 den On-Level-Damage nur ab **L42+** auf die 5-%-Zufluss-Kurve (Diagnose damals: „Rüstungs-Pflicht erodiert ab L45+") — das Fenster **L28–41 blieb auf der alten Damage-Kurve (3,6–4,1 %/s statt 4,5–5,0)** und ist darum für gerüstete Spieler noch eine Stufe zahmer als der ohnehin milde #0-Normalzustand → Chefs „kein Damage".

Beide Ursachen sind **monster-stat-seitig** — deshalb hat keine der letzten Wellen (Combat-Feel-v2-Heilung, Itemization 2.5, Speisen-/Trank-Rebalance, Item-Audits P1–P4) etwas geändert: Kreaturen-Stats waren während der Item-Audits tabu, und die Meldung ist ein *relatives* Artefakt, das item-seitige Wellen gar nicht erreichen können.

---

## 2) Die 9 exakt (Sim-Lauf 2026-07-25, Bronze-Baseline CL12, 3-min-Fenster)

Referenz-Held der Meldung: **CL12, Bronze-Vollplatte, cooked_trout** (sim.ts `runReport`). Heuristik: `kills === 0 && level ≤ maxBeatableLevel(48) && !regen`. Der Anker `maxBeatableLevel = 48` stammt aus **cinder_wretch L48 (3 Kills)** und **slag_abomination L44 (4 Kills)** — beides Tower-Mobs mit 25/24 HP (0,55/0,59× Fit).

| # | id | Lv | Zone | hp+ward | dmg | Sim-Befund (3 min) |
|---|---|---|---|---|---|---|
| 1 | goblin_warlock | 30 | borderlands | 52+16 | 13 | 0 Kills, 6 Tode |
| 2 | ashfield_jackal | 32 | ashfields | 32 | 13 | 0 Kills, 7 Tode |
| 3 | dust_vulture | 34 | ashfields | 36 | 13 | 0 Kills, 7 Tode |
| 4 | mire_crawler | 38 | ashfields | 47 | 14 | 0 Kills, 7 Tode |
| 5 | ashfield_wraith | 38 | slayer_tower | 29+9 | 16 | 0 Kills, 9 Tode |
| 6 | pitch_beetle | 42 | ashfields | 67 | 23 | 0 Kills, 8 Tode |
| 7 | ash_tyrant | 45 | ashfields (Boss) | 112 | 24 | 0 Kills, 10 Tode |
| 8 | rootling_grunt | 45 | blackthorn | 47 | 26 | 0 Kills, 10 Tode |
| 9 | rootling_gimp | 48 | blackthorn | 59 | 28 | 0 Kills, 9 Tode |

Gesunde Vergleichs-Mobs im selben Band, die der CL12-Bronze-Held **besiegt** (und damit den Anker setzen): ash_rat L30 (28 HP, 2 Kills), mire_wisp L30 (24+9, 4 Kills), bone_stalker L34 (24 HP, 5 Kills), tower_skeleton_warrior L36 (28 HP, 5 Kills), tower_skeleton_archer L38 (26 HP, 2 Kills), slag_abomination L44 (24 HP, 4 Kills), cinder_wretch L48 (25 HP, 3 Kills).

**Wichtig:** Die Liste ist heuristik-fragil und pendelt seit Wochen (dokumentiert im sim.test.ts-Header: 12 → 21 → 15 → 9 → 14 → 7 → 9) — einzelne Mobs (wraith, tower_skeleton_*) kippen je nach 3-min-RNG zwischen „auffällig" und „erwartbar". Konstant ist nicht die Mitgliederliste, sondern der **strukturelle Erzeuger**.

---

## 3) HP-Budgets gegen die Fit-Kurve (monster-threat-spec §4: `hp_fit(L) = e^(2.617+0.0249·L)`)

| id | Lv | hp+ward | Fit | ×Fit | Einordnung |
|---|---|---|---|---|---|
| goblin_warlock | 30 | 68 | 29 | **2,35** | echter Ausreißer (Non-Boss!) |
| ash_rat | 30 | 28 | 29 | 0,97 | auf Kurve |
| mire_wisp | 30 | 33 | 29 | 1,14 | auf Kurve |
| ashfield_jackal | 32 | 32 | 30 | 1,05 | auf Kurve |
| dust_vulture | 34 | 36 | 32 | 1,13 | auf Kurve |
| bone_stalker | 34 | 24 | 32 | **0,75** | unter Kurve (Tower) |
| tower_skeleton_warrior | 36 | 28 | 34 | 0,83 | unter Kurve (Tower) |
| mire_crawler | 38 | 47 | 35 | 1,33 | leicht drüber, ok |
| ashfield_wraith | 38 | 38 | 35 | 1,08 | auf Kurve |
| tower_skeleton_archer | 38 | 26 | 35 | **0,74** | unter Kurve (Tower) |
| pitch_beetle | 42 | 67 | 39 | **1,72** | echter Ausreißer |
| slag_abomination | 44 | 24 | 41 | **0,59** | deutlich unter Kurve (Tower) — **Anker-Erzeuger** |
| ash_tyrant | 45 | 112 | 42 | 2,67 | Boss (Norm ×2,4–3,4) — ok |
| rootling_grunt | 45 | 47 | 42 | 1,12 | auf Kurve |
| cinder_wretch | 48 | 25 | 45 | **0,55** | deutlich unter Kurve (Tower) — **Anker-Erzeuger** |
| rootling_gimp | 48 | 59 | 45 | 1,30 | leicht drüber, ok |

Der r²=0,61 des HP-Fits in der threat-spec ist genau diese Zweiteilung. Die Tower-Werte sind kein Versehen, sondern der balance-pass2-„Band-Fix" (Etagen-Klone „am Unlock fair machbar", skaliert an den nativen Etagen-Mobs) — sie sind nur **nie mit der Openworld-Kurve abgeglichen** worden.

---

## 4) TTK-Matrix beide Richtungen (10-min-Fenster, echte Sims)

Builds (alle str2/con2-Basis wie der Report-Held): **Bronze-CL12** (Sim-Referenz) · **Nackt CL30 + Band-Food** · **Platte CL30** Blacksteel voll (7 Teile) · **Platte CL40** Mithril voll · **Platte CL48** = Mithril (Adamant erst req 50) · **Leder CL30/40** (Langbogen + Scaled/Duskhide) · **Stoff CL30/40** (Stab + Ember-Roben). Food: bass (7,5 %) / Roc-Keule (8,5 %) / Bär (9 %); Sustain-Peak = healPct/4,5 s.

### 4.1 Spieler→Monster (s/Kill; „—" = 0 Kills) und Tode je 10 min

| Monster (Lv) | Bronze12 | Platte30 | Platte40 | Platte48 | Leder30 | Leder40 | Stoff30 | Stoff40 |
|---|---|---|---|---|---|---|---|---|
| goblin_warlock (30) | — /18 | 18,8 /0 | 15,0 /0 | 14,3 /0 | 24 /2 | 15,8 /0 | 14,3 /0 | 12,8 /0 |
| ashfield_jackal (32) | 300 /23 | 13,0 /0 | 9,5 /0 | 9,0 /0 | 14 /3 | 9,7 /0 | 11,3 /0 | 9,7 /0 |
| dust_vulture (34) | 200 /22 | 14,0 /0 | 11,3 /0 | 10,5 /0 | 14 /1 | 9,8 /0 | 10,7 /0 | 10,0 /0 |
| mire_crawler (38) | 600 /23 | 17,6 /1 | 12,5 /0 | 11,8 /0 | 20 /5 | 13,3 /0 | 14,6 /0 | 12,0 /0 |
| ashfield_wraith (38) | 150 /27 | 12,8 /0 | 10,2 /0 | 9,8 /0 | 14 /6 | 9,5 /0 | 9,8 /1 | 8,6 /0 |
| pitch_beetle (42) | — /27 | 30,0 /4 | 18,8 /1 | 18,2 /0 | 46 /15 | 22,2 /6 | 26,1 /9 | 18,2 /3 |
| ash_tyrant (45, Boss) | — /31 | 50,0 /8 | 25,0 /1 | 22,2 /0 | 120 /18 | 40 /12 | 66,7 /11 | 42,9 /9 |
| rootling_grunt (45) | 600 /28 | 15,8 /2 | 12,0 /1 | 10,2 /0 | 23 /15 | 11,8 /3 | 12,8 /5 | 10,9 /3 |
| rootling_gimp (48) | — /28 | 19,4 /6 | 13,0 /0 | 12,8 /0 | 27 /14 | 17,1 /9 | 16,7 /7 | 13,6 /3 |
| *ash_rat (30, gesund)* | 100 /19 | 13,0 /0 | 8,0 /0 | 8,1 /0 | 11 /0 | 8,1 /0 | 10,5 /1 | 9,4 /0 |
| *bone_stalker (34, gesund)* | 25 /13 | 8,5 /0 | 7,2 /0 | 7,0 /0 | 9,1 /0 | 6,7 /0 | 8,2 /0 | 7,4 /0 |
| *slag_abomination (44, gesund)* | 40 /27 | 9,0 /1 | 7,1 /0 | 7,1 /0 | 10 /8 | 6,8 /3 | 9,8 /3 | 7,6 /0 |
| *cinder_wretch (48, gesund)* | 46 /27 | 10,7 /4 | 7,5 /0 | 6,9 /0 | 10,3 /7 | 7,0 /3 | 9,4 /3 | 7,6 /0 |

Lesart: **Angemessen gerüstet ist KEINER der 9 ein Wall.** On-level-TTKs liegen bei 10–19 s (Trash) bzw. 22–25 s (Boss ash_tyrant), Tode ≈ 0 (Platte). Die 9 sind nur für den CL12-Bronze-Helden unbesiegbar — genau die gewollte Undergeared-Wall. Auffällig bleiben zwei Zäh-Ausreißer im On-Level-Vergleich: goblin_warlock (18,8 s = 2,2× seiner Band-Nachbarn) und pitch_beetle (18,8 s bei CL40 vs. 12 s Nachbarn) — deckungsgleich mit den ×Fit-Ausreißern aus §3.

### 4.2 Monster→Spieler: Zufluss in % maxHp/s (analytisch aus der echten Treffer-Pipeline) vs. Food-Sustain

Pipeline: Dodge → Accuracy-Contest → Mitigation `def/(def+125)` → Leder-Floor (−18 %) → Block (30–33 % × −85 %) → One-Shot-Cap → Ward → HP. Sustain-Peak (Auto-Eat Tier 0): Platte30/Leder30/Stoff30 1,67 · Platte40 1,89 · Platte48 2,00 %/s.

| Monster | vs. Nackt CL30 | vs. Platte30 | vs. Platte40 | vs. Platte48 | vs. Leder30 | vs. Stoff30 |
|---|---|---|---|---|---|---|
| goblin_warlock | 7,93 | **1,78** | 1,31 | 1,19 | 2,69 | 5,01* |
| ashfield_jackal | 8,83 | 1,98 | 1,46 | 1,32 | 2,99 | 5,58* |
| dust_vulture | 8,24 | 1,85 | 1,36 | 1,23 | 2,79 | 5,21* |
| mire_crawler | 8,32 | 1,86 | 1,37 | 1,25 | 2,82 | 5,26* |
| ashfield_wraith | 10,54 | 2,36 | 1,73 | 1,57 | 3,56 | 6,66* |
| pitch_beetle | 13,21 | 2,96 | 2,19 | 1,99 | 4,48 | 8,34* |
| ash_tyrant | 13,31 | 2,98 | 2,21 | 2,01 | 4,53 | 8,41* |
| rootling_grunt | 14,55 | 3,26 | 2,40 | 2,18 | 4,93 | 9,19* |
| rootling_gimp | 15,19 | 3,40 | 2,52 | 2,28 | 5,15 | 9,59* |

\* Stoff: vor dem 103er-Ward-Pool + Cast-Recharge — real deutlich milder (siehe Tode-Spalten oben).

Befund: **Nackt stirbt überall** (Attrition ✓, Combat-Feel-v2-#0-Garantie hält im Band). **Platte on-level** liegt bei den L42+-Mobs (nach-#0) im gewollten Mild-Druck-Korridor (Zufluss ≈ 1,05–1,25× Sustain), bei den **L30–38-Mobs aber auf/unter Food-Niveau** — und ab CL40 (Mithril) sind alle L30–38-Mobs mathematisch harmlos (Zufluss < Food-Sustain allein). Das ist das „zäh UND ungefährlich"-Fenster — allerdings nur für goblin_warlock in voller Breite (zäh + zahm); jackal/vulture/crawler sind normal-schnell tot und nur zahm.

---

## 5) Diagnose je Monster (die geforderte 1-Zeilen-Triage)

| # | id | Diagnose |
|---|---|---|
| 1 | goblin_warlock (30) | **ECHTES PROBLEM, beide Achsen:** hp+ward 2,35× Fit (zäheste Non-Boss-TTK im Band, 18,8 s on-level) UND Damage unter v2-Kurve (3,85 %/s statt 4,5–5) → genau der „zähe, ungefährliche Brei". |
| 2 | ashfield_jackal (32) | Mildes Problem, nur Damage-Achse: HP auf Kurve (1,05×), aber dmg 13 = 4,07 %/s → zahm; Flag selbst ist Baseline-Artefakt. |
| 3 | dust_vulture (34) | Mildes Problem, nur Damage-Achse: HP 1,13× ok, dmg 13 = 3,77 %/s → zahm; Flag = Artefakt. |
| 4 | mire_crawler (38) | Mildes Problem, nur Damage-Achse: HP 1,33× vertretbar (on-level 12,5 s), dmg 14 = 3,60 %/s → zahm; Flag = Artefakt. |
| 5 | ashfield_wraith (38) | **OKAY per Design:** HP 1,08×, dmg 16 = 4,55 %/s bereits im v2-Korridor; pendelte historisch ohnehin zwischen Flag und „erwartbar". Nichts ändern. |
| 6 | pitch_beetle (42) | **ECHTES PROBLEM, HP-Achse:** Damage schon v2-gehoben (5,08 %/s ✓), aber 67 HP = 1,72× Fit → 50 % längere TTK als Band-Nachbarn. |
| 7 | ash_tyrant (45) | **OKAY per Design (Boss):** ×2,67 in der Boss-Norm (2,4–3,4), Welle T hat ihn bereits getunt (enrage + burn); on-level 22–25 s TTK, 0 Tode @CL48. Flag = Artefakt. |
| 8 | rootling_grunt (45) | **OKAY per Design:** HP 1,12×, dmg 26 = 5,32 %/s ✓; on-level 10–12 s, milder Druck. Flag = reines Artefakt. |
| 9 | rootling_gimp (48) | **OKAY per Design:** HP 1,30× (Familien-Identität „knorrig"), dmg 28 = 5,34 %/s ✓; on-level 12,8 s. Flag = Artefakt. |

Bilanz: **2 echte Stat-Fehler** (warlock, beetle), **3 zahme Damage-Nachzügler** (jackal, vulture, crawler), **4 komplett gesunde Mobs**, die nur vom Vergleichsanker (Tower-Mini-HP) in die Liste gedrückt werden.

---

## 6) Chef-Empirie verortet: „Darum nimmst du bei CL30 fast keinen Schaden"

Rechnung CL30, volle Blacksteel-Platte + Schild, vs. goblin_warlock (L30) — alles Live-Engine-Werte:

1. Warlock trifft mit acc 11 gegen eva 3,9 → **74 %**.
2. Roh-Roll Ø 13 × 1,4815 × 0,675 = **13,0 HP**; Platte def 76 → −37,8 % → **8,1**; Schild blockt 30 % der Treffer × −85 % → Erwartung **Ø 6,0 pro Landung** (jeder ~3. Treffer zeigt nur „1–2").
3. Pool: Gear-CON verdoppelt die HP (**77,7** angezogen vs. 37,7 nackt) → ein Treffer kostet ~7,7 % der Leiste, alle 3,2 s.
4. Netto-Zufluss **1,78 % maxHp/s** — Auto-Eat isst ab 45 % (Tier 0) bzw. 70 % (Max-Tier) und heilt 7,5 %/4,5 s = **1,67 %/s**: Die Leiste pendelt an der Schwelle, tiefer geht es praktisch nie; mit Auto-Trank (12–18 %/8 s) oder besserem Food ist die Bilanz klar positiv.
5. Ab Mithril (CL40) fällt der Zufluss auf **1,31 %/s < Food allein** → im L30–38-Fenster ist ein Mithril-Träger buchstäblich unsterblich, ohne je einen Trank anzurühren.

Anteil Design vs. Fehler: Punkte 2–4 sind die bewusste Combat-Feel-v2-#0-Garantie („nackt stirbt durch Attrition, geprept ≈ 0 Tode") — die gilt im ganzen Spiel. Der **Fehler-Anteil** ist, dass die L28–38-Monster nie den #0-On-Level-Raise bekamen (Kommentar-Historie im Content: Raise-Kette beginnt bei pitch_beetle L42; darunter 12–16 dmg = 3,6–4,1 %/s statt 4,5–5,0). Das Band ist also ~15–25 % zahmer als der ohnehin milde Rest — zusammen mit dem zähen warlock ergibt das exakt Chefs Slog-Gefühl. Will der Chef darüber hinaus **generell** mehr Gefahr für angemessen gerüstete Spieler, ist das ein separater, systemischer Regler (Food-%-Leiter / BLOCK_DAMAGE_REDUCTION / Sustain-Korridor aus combat-feel-v2 §0) und keine Monster-Flickerei — als Option E unten notiert, ausdrücklich ohne Empfehlung meinerseits, weil sie den #0-Chef-Entscheid anfassen würde.

---

## 7) Warum überlebt das Band jede Balance-Welle?

1. **Die Meldung ist ein Relativ-Artefakt:** `findIssues` ankert auf `maxBeatableLevel` = höchstes vom CL12-Bronze-Helden getötetes Level (48, via cinder_wretch/slag_abomination mit 0,55–0,59× Fit-HP). Solange diese Unter-Kurve-Mobs Bronze-killbar sind, werden ALLE gesunden Openworld-Mobs L30–48 zwangsläufig geflaggt — ihre Unbesiegbarkeit für CL12/Bronze ist ja Design („Undergeared-Wall"). Item-, Food- und Trank-Wellen können daran nichts ändern.
2. **Kreaturen-Stats waren tabu** während der Item-Audits (dokumentierte Regel) — die einzige Stellschraube, die die Meldung erreicht, wurde bewusst nicht angefasst.
3. **Zwei-Kurven-Historie:** balance-pass2 (01.07.) setzte die Tower-Etagen auf „am Unlock machbar" (Mini-HP), Combat-Feel-v2 #0 (04.–05.07.) hob Damage nur ab L42 (Diagnose „Rüstungs-Pflicht erodiert ab L45+"). Ergebnis: L28–41 hängt zwischen alter und neuer Kurve — die Verdachtshypothese aus dem Auftrag bestätigt sich, nur liegt die Kalibrier-Grenze bei **L42** (pitch_beetle), nicht bei Blackthorn L45.

---

## 8) EMPFOHLENE Alt→Neu-Tabelle (Kern-Paket, 5 Monster)

Ziel: (a) die 2 HP-Ausreißer auf Band-Niveau, (b) die L30–38-Damage-Lücke auf den #0-Korridor (4,5–5,0 %/s unmitigierter Zufluss vs. on-level-Platten-Pool — exakt die Methodik der bestehenden `Combat-Feel-v2 #0`-Kommentare im Content). Alle anderen Felder (accuracy, evasion, defense, interval, inflict, resist, xp, gold, loot) **unverändert** — Identitäten bleiben.

| id | Feld | alt → **neu** | Begründung (1 Zeile) | erwarteter Effekt (aus Verifikations-Sim, 10 min) |
|---|---|---|---|---|
| goblin_warlock | maxHp | 52 → **36** | 2,35× Fit als Non-Boss; Ziel ~1,64× = bleibt Zonen-Apex (Boss-Achievement), aber kein Brei | on-level-TTK 18,8 → 15,0 s; CL40 15,0 → 11,1 s |
| goblin_warlock | wardCapacity | 16 → **12** | Ward-Anteil ~30 % des Budgets beibehalten (Muster dg_goblin_warlock) | — |
| goblin_warlock | damage | 13 → **16** | #0-Korridor: 3,85 → 4,74 %/s | Platte30 on-level: 0 → 2 Tode/10 min (= milder Druck, wie L42+-Norm) |
| ashfield_jackal | damage | 13 → **15** | #0-Korridor: 4,07 → 4,70 %/s | Platte30: TTK/Tode unverändert (13 s/0), Leiste arbeitet wieder sichtbar |
| dust_vulture | damage | 13 → **16** | #0-Korridor: 3,77 → 4,64 %/s | Platte30: 14 s/0 Tode unverändert |
| mire_crawler | damage | 14 → **17** | #0-Korridor: 3,60 → 4,37 %/s (bewusst unter 4,7 — Poison-Inflict rechnet oben drauf) | Platte30 (8 Level drunter): 1 → 3 Tode = spürbare Reichweiten-Härte |
| pitch_beetle | maxHp | 67 → **50** | 1,72× → 1,28× Fit; Damage ist schon v2-korrekt (5,08 %/s) | CL40-TTK 18,8 → 15,0 s, Tode 1 → 0; Leder40 22 → 30 Kills |

**Nicht anfassen:** ashfield_wraith, ash_tyrant, rootling_grunt, rootling_gimp (Diagnose §5: gesund; Flag = Anker-Artefakt) sowie goblin_stormcaller L28 (im Dungeon-Rework bereits gesenkt).

### Verifikation (gepatchter Content-Klon, echte Sims, 10-min-Fenster)

- **Undergeared-Wall bleibt Wall:** Bronze-CL12 gegen die 5 nachher: 0–3 Kills, 24–28 Tode (vorher 0–3 / 18–27). Kein Aufweichen der Kampfhärte-Gates (wichtig, seit Dungeon-Level-Locks weg sind).
- **Nackt CL30 stirbt weiter** (32–37 Tode; Attrition-Garantie hält, wird sogar schärfer).
- **On-level Platte:** milder Druck statt Nullnummer (warlock 2 Tode/10 min bei Tier-0-Auto-Eat ohne Tränke; mit Auto-Trank/Max-Auto-Eat wieder ≈ 0 — genau der #0-Zielkorridor der L42+-Mobs).
- **XP/h im Band steigt** über die Kill-Rate (warlock on-level +25 %, CL40 +35 %; beetle +25–35 %): Der Aschefelder-Grind Richtung Kriegsbande fühlt sich BESSER an, trivialisisert aber nicht — jackal/vulture/crawler-TTKs sind unverändert, nur warlock/beetle verlieren ihre Zäh-Ausreißer-Rolle.

### Nebenwirkungen (ausgewiesen)

1. **Eliten erben proportional** (`statMults` auf Basis-Stats): `elite_border_warlock` hp 208 → 144, ward 64 → 48, dmg 16,9 → 20,8 (gefährlicher, weniger schwammig — passt zur Elite-Identität); `elite_ash_vulture`/`elite_ash_crawler`/`elite_ash_beetle` analog. Jackpot-/Unique-Farmraten steigen mit der Kill-Rate leicht; Chase-Drops am warlock (warbanner_cape/felstaff 0,001) bleiben Zweitquelle hinter dem Warband-Clear (Dungeon-Rework §5.5) — akzeptabel.
2. **Leder/Stoff on-level:** Der Damage-Raise dehnt das (schon heute bei L42+ bestehende) Anti-Leder-Gefälle auf L30–38 aus: Leder-CL30 gegen die gepatchten Mobs 6–11 Tode/10 min (vorher 1–5); Stoff moderat (0–3, Ward puffert). Das ist KONSISTENT mit dem Ist-Zustand des L42+-Bands (Leder30 vs. beetle heute schon 15 Tode), aber als Trinity-Befund separat zu behandeln (Option D unten). Wer die Leder-Klasse bis dahin schonen will, nimmt die weiche Variante dmg 15/14/15/16 (Korridor ~4,4 statt 4,7 %/s).
3. **Tests/Pins (kontrolleur nach Apply):** sim.test.ts-Header (akzeptierte Auffälligkeiten-Liste) neu pinnen; `elites.test.ts` (abgeleitete Elite-Werte) gegenprüfen; `mitigation.test.ts` liest warlock.damage **dynamisch** (nur Stale-Kommentar „// 5" beiläufig fixen), `poison.test.ts`/`combatlog-status.test.ts` (mire_crawler-Inflict unverändert, verhaltensbasiert) und `bleed.test.ts`/`ranged-*.test.ts` (ash_tyrant unverändert) sind robust; `sim-consistency.test.ts` pinnt nur Drop-IDs ✓; „ECHTE WALLS (Skill-Band) = leer"-Assert bleibt grün (geared killt weiterhin alles).
4. **Save-Kompat: statuslos ✓** — Monster-Stats leben in der ContentDB, nicht im Save. Einzige Berührung: `combat.enemyHp` eines laufenden Kampfs im Alt-Save kann über dem neuen maxHp liegen; der Load-Pfad sanitisiert (`finiteNonNeg`) und der Kampf läuft schlicht zu Ende (Präzedenz: Stat-Squish-Migration). Kein SAVE_VERSION-Bump.

### Erwartung ans Sim-Flag — ehrlich gesagt

Das Kern-Paket macht die 9 **inhaltlich** richtig, lässt die Meldungs-LISTE aber nicht zwingend verschwinden: Der CL12-Bronze-Held wird gesunde L30+-Mobs weiterhin nicht töten (soll er ja nicht), und der Anker (Tower-Mini-HP) besteht weiter. Dafür gibt es zwei getrennte Optionen (B/C unten) — Empfehlung: **B** (Heuristik reparieren), nicht C (Content dem Messfehler hinterher tunen).

---

## 9) Abgrenzung & Optionen (getrennte Entscheide)

- **Option B — Sim-Heuristik band-fest machen (empfohlen, logic-dev/kontrolleur, NICHT mein Revier):** `findIssues` soll „zu tanky" gegen die deskriptive Fit-Kurve messen (z. B. Flag nur bei `hp+ward > 1,6× hp_fit(L)` für Non-Bosse) statt gegen `maxBeatableLevel` des Bronze-Helden. Damit misst der Report echte Ausreißer statt der Differenz zweier Populationen, und die Dauer-9 verschwindet strukturell. (Der Bronze-Held bleibt als Frühgame-Zugänglichkeits-Probe wertvoll — nur die Tanky-Ableitung ist kaputt.)
- **Option C — Tower-Anker anheben (NUR falls Chef die Flags content-seitig beruhigen will):** slag_abomination 24 → ~36, cinder_wretch 25 → ~40, bone_stalker 24 → ~30, tower_skeleton_archer 26 → ~31 (≈ 0,85–0,9× Fit). Nebenwirkung: Slayer-Task-Dauer +30–50 % in Et. 2–3, Tower-XP/h sinkt entsprechend — widerspricht dem balance-pass2-Entscheid „am Unlock fair machbar". Darum nachrangig zu B.
- **Option D — Trinity-On-Level-Survivability Leder/Stoff (separater Balance-Task):** Leder verliert on-level ab L42 (und nach dem Kern-Paket ab L30) deutlich gegen Platte (Dodge 23–25 % + Floor 18 % vs. Mitigation 38–40 % + Block 30 %×85 %). Kandidaten-Hebel: Duskhide/Scaled-EVR-Kurve, LEATHER_HIT_FLOOR, oder ein Leder-eigenes Sustain-Element. Gehört zu combat-dev/armor-iteration, nicht in dieses Paket.
- **Option E — systemische Gefahr für Gerüstete (Chef-Grundsatzentscheid):** Falls „geprept ≈ 0 Tode" (#0) selbst das Problem sein sollte: Food-%-Leiter oder Block-Reduktion senken. Nicht empfohlen ohne expliziten Chef-Wunsch — es würde den dokumentierten #0-Entscheid kippen.
- **Gear-Verfügbarkeit im Band: KEIN Befund.** Die Craft-Leiter ist lückenlos (Steel 20 → Gravesteel 22–26 → Blacksteel 30 → Mithril 40 → Adamant 50; Leder Scaled 28 → Duskhide 40; Stoff Ember 30 → Aether 45) — eine „Steel→Mithril-Lücke" existiert seit dem Blacksteel-Tier nicht mehr. Die Chef-Empirie ist NICHT durch fehlendes Gear erklärbar, sondern durch §6.

---

## 10) Geordnete Apply-Liste (nach Chef-GO → content-dev)

1. `goblin_warlock`: maxHp 52→36, wardCapacity 16→12, damage 13→16 (+ Kommentar `#352 Bronze-Baseline: Budget 2,35×→1,64× Fit; dmg auf #0-Korridor 4,74 %/s`).
2. `pitch_beetle`: maxHp 67→50 (+ Kommentar `#352: 1,72×→1,28× Fit; dmg bereits v2-korrekt`).
3. `ashfield_jackal` damage 13→15, `dust_vulture` damage 13→16, `mire_crawler` damage 14→17 (+ je Kommentar `#352 On-Level-Raise Nachzügler L30–38, Methodik Combat-Feel-v2 #0`).
4. kontrolleur: `pnpm test` + sim.test.ts-Auffälligkeiten-Header neu pinnen; elites.test.ts gegenprüfen; „ECHTE WALLS leer" bestätigen.
5. Getrennt entscheiden: Option B (Sim-Heuristik, logic-dev) — meine Empfehlung; Optionen C/D/E nur auf expliziten Chef-Wunsch.
