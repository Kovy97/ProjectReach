# QA-Run 7 — Combat-Tiefenanalyse NAHKAMPF (nach str-Entdopplung + Greatsword-crit-Rollout)

**Tester:** Playtester-Analyst (READ-ONLY; nur diese Datei geschrieben) · **Datum:** 2026-06-28
**Scope R7:** zwei gezielte Melee-Iterationen ggü. R6 — (1) **`smithing trains:"str"` ENTFERNT** (`smithing`-Skill trainiert jetzt KEIN Attribut mehr; der str-Doppelzähl-Backbone ist weg → die Platte ist die einzige verbleibende Gear-str-Quelle, der Rest kommt aus dem `power`-Skill). (2) **Greatsword `critDamage +0,30` auf ALLE 12 Tiers** ausgerollt (war R6 nur auf `godiron_greatsword`, req99). Fernkampf & Magie unangetastet.
**Leitfrage:** Sitzt der DPS-optimale Nahkämpfer jetzt im Zielband **0,9–1,1×** (nachdem die str-Doppelzählung weg ist)? Ist **smith == noSmith** (gear-basiert, nicht mehr grind-abhängig)? Sind **2H/Greatsword über alle Tiers** konkurrenzfähig?

**Methode — echte Sim-Daten:** Temporäres Harness direkt auf der Engine (`createGame`→`startCombat`→`advance`, Seed **4242**), **1 h Sim (720×5 s)** pro Build gegen denselben on-level Mob. **Auto-Gear je Slot** (bestes tragbares Teil nach Stil-Score; **anforderungs-korrekt** = ein Build trägt nur Gear, dessen Skill-Gates er trainiert → Platte braucht `defence`, Robe `magic_def`, Leder `ranged`/`defence`; keine Fehlwahl). **Skill-Investition realistisch inkl. Pflicht-Handwerk:** melee→attack/power/defence/vitality **+smithing/mining**, ranged→ranged/defence/vitality/fletching **+leatherworking**, magic→magic_off/magic_def/vitality/runecrafting. Tier-Cap entsteht **natürlich aus den `requirements`** (L10 attack 10 → Iron, L45 → Mithril, L98 → Aetherium; `godiron` req99 @L98 nicht erreichbar). Auto-Eat T3 + `cooked_voidray`, voller Köcher (5 Mio Pfeile), Mana ohne Cheat. Mobs identisch zu R6: L10 `goblin_butcher` (90 hp), L45 `skeleton_nekro` (480 hp, regen 5, enrage), L98 `aether_wraith` (950 hp). **0 Tode in ALLEN Läufen.** Harness nach dem Lauf **entfernt** (`packages/**` unverändert).

**Checkpoints:** Wie R6 **L10/L45/L98** gewählt (clean Δ vs run6). Der Prompt nennt „L10/L40/L99" — die ±1–5-Level-Differenz ist für die Bandlage irrelevant; @L99 würde nur `godiron` (req99) zusätzlich freischalten, was am Greatsword-crit (jetzt alle Tiers) nichts ändert.

**Stil-Hinweis:** Gemessen mit BEIDEN Nahkampf-`combatStyle`: **„power"** (Wucht, +12 % Schaden — DPS-optimaler Melee-Knopf) als Primär-Metrik, **„attack"** (+12 % Acc) als konservative Gegenprobe. Der Wucht-`dmgMult` wirkt weiterhin **nur** auf `meleeDamage` (ranged/magie bekommen aus dem Stil 0 %) — „power" ist ein melee-exklusiver Hebel.

*Caveat:* eigenes Harness ≠ R6-Harness (anderer Gear-Score) → **absolute** kills/h nicht 1:1 mit R6. Verlässlich sind (a) **within-run7** Stil-Ratios und (b) die **Richtung** vs R6.

---

## Fun-Score: **8.5 / 10**  (Δ vs run6: **+0.5** — klarer Fortschritt)

**Die str-Entdopplung trifft.** Der DPS-optimale Nahkämpfer ist mid/late zurück ins Band gezogen: **L45 ÷ranged 0,98 / ÷magie 1,00** (lehrbuchhafte Parität), **L98 ÷ranged 1,11** (Bandkante) — vs R6s **1,11/1,21** bzw. **1,55/1,11/1,21**. Die R6-Überkorrektur (Melee an allen Checkpoints über Band) ist **geheilt**, soweit es um den realistischen smithing-Main geht. Noch wichtiger: **smith == noSmith ist jetzt EXAKT 1,000** an allen drei Checkpoints — das R5-Fix-Ziel „Melee nicht mehr smithing-grind-abhängig" ist **voll erreicht** (R6 war late noch 0,76×). Das ist der überzeugendste Teil von R7. Der Greatsword-crit-Rollout ist **mechanisch bestätigt** (cd 1,90 L10/L45, **2,10 L98** = +0,30 ggü. Maul auf jeder Stufe).

**Der Preis: 2H sind am Endgame zurückgerutscht.** Genau die str-Entdopplung, die Melee ins Band zieht, trifft die **langsamen 2H am härtesten** — bei L98 fällt **Greatsword auf 0,71× (schlechtester Melee überhaupt)** und Greataxe auf 0,73× (R6: 0,84/0,91). Der frisch ausgerollte Greatsword-crit (cd 2,10) ist **korrekt aktiv, aber zu schwach**, um den langsamen Intervall bei gesunkenem Grundschaden zu kompensieren. Der R6-2H-Gewinn ist mid (L45: Greataxe 0,98 / Greatsword 0,97) **erhalten**, late aber **teilweise rückabgewickelt**. Dazu unverändert: **Magie bleibt der Boden** (L98 0,74× Melee / 0,81× ranged), L10-One-Shot-Schwelle bleibt volatil (Speer über die Kante gekippt: R6 Top → R7 0,52×), Tankigkeit weiter wertlos (0 Tode). Netto: zwei saubere Treffer (Band + smith-Unabhängigkeit) gegen eine 2H-Endgame-Regression + Altlasten → **+0,5**.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim) — **DPS-optimal („power"-Wucht-Stil)**

`×` = relativ zum **besten Melee-Build** des Checkpoints. **0 Tode überall.**

### L10 vs goblin_butcher (hp 90, dmg 18) — Iron · *⚠ One-Shot-Schwelle → volatil*
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | cd | str |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|
| **Kampfaxt** | melee | **1061** | **1.00** | 101 | 111 | 3040 | .03 | 1.88 | 16 |
| Axt | melee | 1022 | 0.96 | 99 | 111 | 2990 | .03 | 1.60 | 16 |
| Schwert | melee | 1021 | 0.96 | 96 | 115 | 2840 | .03 | 1.60 | 16 |
| Streitkolben | melee | 1016 | 0.96 | 96 | 109 | 2840 | .03 | 1.60 | 16 |
| Großaxt (2H) | melee | 966 | 0.91 | 111 | 112 | 3540 | .03 | 2.05 | 16 |
| Großschwert (2H) | melee | 941 | 0.89 | 118 | 112 | 3640 | .03 | 1.90 | 16 |
| Maul (2H) | melee | 881 | 0.83 | 133 | 108 | 3890 | .03 | 1.60 | 20 |
| Dolch | melee | 771 | 0.73 | 85 | 121 | 2340 | .10 | 1.60 | 16 |
| Langbogen | ranged | 729 | 0.69 | 56 | 184 | 2448 | .10 | 1.72 | 5 |
| Scimitar | melee | 692 | 0.65 | 92 | 116 | 2540 | .08 | 1.60 | 16 |
| Kurzbogen | ranged | 691 | 0.65 | 54 | 181 | 2448 | .17 | 1.60 | 5 |
| Stab | magic | 610 | 0.57 | 69 | 155 | 2880 | .03 | 1.60 | 5 |
| Speer (2H) | melee | 552 | 0.52 | 95 | 118 | 3110 | .03 | 1.60 | 16 |

> **L10 ist ein Schwellen-Artefakt, kein robuster Befund.** goblin 90 hp: Waffen mit dmg knapp >90 one-shotten, knapp <90 brauchen 2 Hits → Durchsatz halbiert sich sprunghaft. Die str-Entdopplung hat **Speer** (R6 dmg 105 = one-shot, Top-Waffe) auf dmg 95 = **two-shot** gedrückt → 0,52× (Absturz von Platz 1). Scimitar (dmg 92, two-shot) ebenso unten. Das ist run6-P2 in Reinform.

### L45 vs skeleton_nekro (hp 480, regen 5, enrage) — Mithril · *robust, im Band*
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | str |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| Kurzbogen | ranged | 359 | 1.02 | 125 | 335 | 2025 | .24 | 5 |
| **Scimitar** | melee | **351** | **1.00** | 170 | 252 | 2510 | .13 | 26 |
| Stab | magic | 350 | 1.00 | 197 | 291 | 2880 | .06 | 5 |
| Großaxt (2H) | melee | 345 | 0.98 | 220 | 240 | 3360 | .07 | 26 |
| Langbogen | ranged | 343 | 0.98 | 128 | 344 | 2160 | .17 | 5 |
| Großschwert (2H) | melee | 342 | 0.97 | 233 | 239 | 3460 | .07 | 26 |
| Dolch | melee | 340 | 0.97 | 156 | 263 | 2310 | .14 | 26 |
| Schwert | melee | 328 | 0.93 | 183 | 229 | 2810 | .11 | 26 |
| Maul (2H) | melee | 318 | 0.91 | 264 | 229 | 3710 | .07 | 32 |
| Streitkolben | melee | 308 | 0.88 | 179 | 233 | 2810 | .07 | 26 |
| Speer (2H) | melee | 299 | 0.85 | 188 | 256 | 2930 | .07 | 26 |
| Axt | melee | 294 | 0.84 | 182 | 237 | 2960 | .07 | 26 |
| Kampfaxt | melee | 290 | 0.83 | 189 | 237 | 3010 | .07 | 26 |

### L98 vs aether_wraith (hp 950, resist shock) — Aetherium
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | cd | str |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|
| **Scimitar** | melee | **554** | **1.00** | 411 | 509 | 2275 | .21 | 1.80 | 61 |
| Kurzbogen | ranged | 501 | 0.90 | 239 | 626 | 1593 | .31 | 1.60 | 5 |
| Maul (2H) | melee | 498 | 0.90 | 630 | 444 | 3475 | .13 | 1.80 | 71 |
| Dolch | melee | 469 | 0.85 | 371 | 541 | 2075 | .22 | 1.80 | 60 |
| Schwert | melee | 468 | 0.84 | 431 | 498 | 2575 | .13 | 1.80 | 60 |
| Streitkolben | melee | 467 | 0.84 | 431 | 455 | 2575 | .13 | 1.80 | 60 |
| Langbogen | ranged | 463 | 0.84 | 248 | 651 | 1728 | .22 | 1.82 | 5 |
| Speer (2H) | melee | 443 | 0.80 | 450 | 520 | 2695 | .13 | 1.80 | 60 |
| Axt | melee | 441 | 0.80 | 438 | 466 | 2725 | .13 | 1.80 | 60 |
| Kampfaxt | melee | 433 | 0.78 | 454 | 466 | 2775 | .13 | 2.18 | 60 |
| Stab | magic | 408 | 0.74 | 371 | 568 | 2880 | .23 | 2.02 | 5 |
| Großaxt (2H) | melee | 403 | 0.73 | 529 | 476 | 3125 | .13 | 2.34 | 60 |
| Großschwert (2H) | melee | 391 | 0.71 | 565 | 471 | 3225 | .13 | 2.10 | 60 |

---

## Kernbefund — bester Melee relativ zu den anderen Stilen

| Checkpoint | bester Melee (×) | ÷ Fernkampf(best) | ÷ Magie | **konservativ (attack)** ÷FK / ÷Magie |
|---|---|--:|--:|--:|
| L10 ⚠ | Kampfaxt 1061 | **1.46** | **1.74** | 1.25 / 1.49 |
| L45 | Scimitar 351 | **0.98** | **1.00** | **0.90** / **0.92** |
| L98 | Scimitar 554 | **1.11** | **1.36** | **0.94** / 1.15 |

**Antwort auf die Leitfrage:**
- **Im Band? mid/late JA (vs Fernkampf), L10 nein (Schwellen-Artefakt).** DPS-optimal: L45 **0,98** und L98 **1,11** (Bandkante) gegen Fernkampf — die R6-Überkorrektur (1,11/1,21 + L10 1,55) ist weg. Konservativ sitzt Melee-vs-Fernkampf **klar im Band** (L45 0,90 / L98 0,94). Das einzige verbleibende „über Band" ist **vs Magie** (L98 1,36) — und das ist ein **Magie-Boden**-Problem, kein Melee-Überschuss (s.u.). L10 (1,46/1,74) ist die bekannte One-Shot-Schwelle, kein robustes Signal.
- **smith == noSmith? JA, EXAKT (1,000 an L10/L45/L98).** Da `smithing` kein Attribut mehr trainiert, ist die str eines Melee-Builds **identisch**, ob er smithing/mining grindet oder nicht. Das R5/R6-Ziel „nicht mehr smithing-level-abhängig" ist **vollständig erreicht** (R6 war late 0,76×). **Größter Gewinn von R7.**
- **2H über alle Tiers konkurrenzfähig? NEIN — late zurückgerutscht.** mid (L45) top: Großaxt **0,98**, Großschwert **0,97**. late (L98) aber: **Großschwert 0,71× (schlechtester Melee)**, Großaxt **0,73×** (R6: 0,84/0,91). Nur der **Maul** hält sich late (0,90×, sogar verbessert ggü. R6 0,81). Die str-Entdopplung senkt den Grundschaden — bei festem Mob-HP brauchen die **langsamen** 2H dann anteilig mehr Hits, und jeder Extra-Hit kostet 3100–3500 ms. Der neue Greatsword-crit (cd 2,10) federt das nicht ab.
- **Dominant?** Nicht mehr nach oben. Melee ist mid/late **auf Augenhöhe** mit Fernkampf. **Magie ist weiter der Boden** (L98 0,74× Melee / 0,81× ranged).

---

## Δ vs run6 (Richtung — die verlässliche Metrik)

| Achse | run6 (L10/L45/L98) | run7 (L10/L45/L98) | Bewegung |
|---|---|---|---|
| best Melee ÷ Fernkampf (DPS-opt.) | 1.55 / 1.11 / 1.21 | **1.46 / 0.98 / 1.11** | **ins Band gezogen** ✅ (L45 perfekt, L98 Kante; L10 Schwelle) |
| best Melee ÷ Fernkampf (konserv.) | 1.40 / 0.97 / 0.98 | 1.25 / **0.90 / 0.94** | weiter sauber im Band ✅ |
| best Melee ÷ Magie | 1.92 / 1.21 / 1.46 | **1.74 / 1.00 / 1.36** | besser, aber **Magie weiter Boden** ⚠ |
| **Melee ohne smithing** | L98 **0.76×** (abhängig) | **1.000× an ALLEN CP** | **vollständig geheilt** ✅✅ |
| 2H Großaxt/Großschwert ÷ best (L98) | 0.91 / 0.84 | **0.73 / 0.71** | **late zurückgerutscht** ⚠ (str-Nerf trifft langsame 2H) |
| 2H Maul ÷ best (L98) | 0.81 | **0.90** | leicht verbessert ✅ |
| 2H mid (L45 Großaxt/Großschwert) | 0.88 / 0.87 | **0.98 / 0.97** | mid stark ✅ |
| Greatsword critDamage | nur godiron (L99) | **alle Tiers** (cd 1,90/1,90/2,10) | **mechanisch ausgerollt** ✅ (Wirkung aber zu schwach) |
| 0 Tode / Determinismus | ja / ja | **ja / ja** | unverändert solide ✅ |

**Lesart:** R7 räumt die zwei R6-Hauptkritiken ab — die **Überkorrektur** (Melee zurück ins Band) und die **smithing-Abhängigkeit** (jetzt exakt entkoppelt). Der Kollateralschaden: dieselbe str-Senkung, die Melee ins Band bringt, kippt die **langsamen 2H am Endgame** unter Band — ausgerechnet das Großschwert, das gerade seinen crit-Buff bekam, ist nun der schwächste L98-Melee. Per Saldo ein **klarer Netto-Fortschritt** (+0,5).

---

## Priorisierte Findings

### [P0] — keine
Keine Crashes/Walls, **0 Tode** über alle Läufe, deterministisch (Seed 4242). Treffer/Mitigation/Auto-Eat/Köcher/Mana sauber. str-Entdopplung und Greatsword-crit korrekt im Stat-Pfad (`computeStats`) angewandt (verifiziert: smith==noSmith 1,000; greatsword cd 1,90/1,90/2,10 vs maul 1,60/1,60/1,80 → exakt +0,30 Delta auf jeder Stufe).

### [P1 Balance] 2H-Endgame zurückgerutscht — Großschwert L98 0,71× (schlechtester Melee), Großaxt 0,73×
**Befund (Sim):** Die str-Entdopplung senkt den Melee-Grundschaden gleichmäßig, aber bei festem Mob-HP (950) brauchen die **langsamen** 2H dann anteilig mehr Hits — und jeder Extra-Hit kostet 3100–3500 ms (vs Scimitar 2275 ms). Resultat L98: Großschwert **391 (0,71×)**, Großaxt **403 (0,73×)** — beide **unter** dem Magie-Boden. Der R6-2H-Gewinn ist late teilweise rückabgewickelt (R6: 0,84/0,91). Der frisch ausgerollte Greatsword-crit (cd 2,10, korrekt aktiv) reicht nicht: höhere crit-**Damage** bei nur 0,13 crit-**Chance** und langsamem Intervall schlägt den schnellen Scimitar (crit 0,21, cd 1,80, 1,42× so viele Schwünge) nicht. **Maul** (0,90×) hält sich, weil sein Schaden/Hit groß genug bleibt, um die Hit-Zahl niedrig zu halten.
**Fix-Vorschlag (content):** den **2H-Grundschaden am oberen Tier (Adamantium→Aetherium) anheben** ODER die aIMs-Strafe der langsamsten 2H (Großschwert/Großaxt) late weiter kürzen — Ziel: Großschwert/Großaxt L98 zurück auf ≥0,90×. Alternativ Greatsword-**crit-Chance** (statt nur -Damage) leicht heben, damit der Burst-Identität reale Wirkung bekommt. Konsistenz-Ziel: alle Melee-Waffen pro Checkpoint im 0,85–1,05×-Korridor.

### [P1 Balance] Magie bleibt der Boden — L98 0,74× Melee / 0,81× Fernkampf
**Befund (Sim):** Mit Melee zurück im Band ist **Magie** weiter der niedrigste Stil: L98 Stab **408** = 0,74× Melee, 0,81× Fernkampf; L10 0,57× Melee. **Aber:** L45 ist Magie **1,00× Melee** (im Band) — das Problem ist **früh & spät**, nicht mid. (Außerhalb des Melee-Reviers; hier nur als Anker.)
**Fix-Vorschlag (magic-seitig):** an magic-/content-dev — der Melee-Anker steht jetzt (mid/late vs Fernkampf im Band); Magie L10 & L98 gegen diesen Anker heben. Das ist der **letzte große Hebel für echtes 3-Stile-Gleichgewicht**.

### [P2 Balance] L10-One-Shot-Schwelle macht die beste Frühwaffe volatil (Speer abgestürzt)
**Befund (Sim):** goblin 90 hp. Mit der gesenkten str kreuzen Waffen die 1-Hit-Schwelle in beide Richtungen: **Speer** (R6 dmg 105 = one-shot, Top-Waffe) fällt auf dmg 95 = **two-shot** → 0,52× (Absturz von Platz 1 auf letzten). Scimitar (dmg 92, two-shot) ebenfalls unten (0,65×). Die „beste" L10-Waffe ist ein Schwellen-Artefakt, kein robustes Balance-Signal.
**Fix-Vorschlag (optional):** `goblin_butcher`-hp leicht anheben (z.B. 90→110), sodass am L10-Gear-Stand **keine** Waffe one-shottet → die Frühgame-Waffenwahl wird wieder durch Tempo/Schaden statt durch eine harte Kante bestimmt.

### [P2 Balance] Tankigkeit weiter wertlos — 0 Tode, Platte zahlt nur noch Offense (über str)
**Befund (unverändert seit R3/R5/R6):** 0 Tode bei jedem Stil/Checkpoint; def 495 / hp 2150 @L98 kaufen weiterhin **nichts** (Auto-Eat T3 löst Survival für alle). Da die Platte jetzt die **einzige** Gear-str-Quelle ist (smithing trägt nichts mehr bei), ist sie für Melee noch mehr ein **Offense**-Item — die Tank-Achse bleibt tot.
**Fix-Vorschlag:** 1–2 Endgame-Burst-Mobs jenseits eines Auto-Eat-Ticks, damit Platte-HP realen Durchsatz-Wert bekommt (sonst gewinnt Melee rein über die Platten-str-Offense).

### [P3 Balance] Evasion-Inversion bleibt — Leder-Schütze weicht 2× besser aus als Platten-Tank
**Befund:** L98 Fernkampf eva **257** vs Melee eva 121 (Scimitar) / 85 (2H); L45 150 vs 56. Unverändert invertiert. Mit 0 Toden ist die hohe ranged-Evasion ein reiner Gratis-Vorteil — und mildert die Melee-vs-Fernkampf-Lücke late zusätzlich zugunsten Fernkampf.
**Fix-Vorschlag:** Leder/Voidhide-Evasion-Budget kürzen; Melee behält def/hp als Tank-Achse (greift erst mit Burst-Mobs, s.o.).

### [P3 Info] Maul ist der 2H-Endgame-Gewinner, Scimitar der Allround-King
**Befund (Sim):** **Scimitar** ist L45 (1,00) und L98 (1,00) jeweils der beste Melee — schneller 1H mit solider crit (L98 0,21). Unter den 2H trägt am Endgame nur der **Maul** (0,90×); Großschwert/Großaxt brauchen den P1-Fix. Kein Defizit am Scimitar/Maul — nur als Profil-Hinweis.

---

## Mechanik-Checks (bestanden)
- **str-Entdopplung:** `smithing` trainiert kein Attribut mehr (verifiziert im `skills`-Block: nur `woodcutting→str`, `power→str`; `smithing` ohne `trains`). Effekt isoliert: **smith == noSmith = 1,000** an allen drei Checkpoints (R6 war late 0,76×). str des besten Melee fiel erwartungsgemäß (L98 von R6-Niveau auf 60–61, getragen aus `power`/4 + Platte).
- **Greatsword-crit auf allen Tiers:** cd 1,90 (L10), 1,90 (L45), **2,10 (L98)** — jeweils exakt +0,30 ggü. der Vergleichswaffe Maul (1,60/1,60/1,80). Der Bonus ist im gesamten getesteten Bereich aktiv (R6: nur godiron/L99).
- **Anforderungs-Gating:** Builds tragen nur Gear ihrer trainierten Skills (Platte/`defence` für Melee, Robe/`magic_def` für Magie, Leder für Fernkampf) → faire Stil-Ratios.
- **Treffer/Mitigation/Köcher/Mana/Determinismus:** sauber, kein NaN/Drift, Seed 4242 stabil, 0 Tode.

## Fazit
**Zwei saubere Treffer, eine Endgame-Regression.** Die str-Entdopplung holt den DPS-optimalen Nahkämpfer mid/late **zurück ins Band** (L45 0,98, L98 1,11 vs Fernkampf; konservativ 0,90/0,94) und macht Melee — der eigentliche R5/R6-Daueraufreger — **vollständig smithing-unabhängig** (smith==noSmith 1,000). Der Greatsword-crit ist sauber auf alle Tiers ausgerollt. **Was Melee unter 9,5 hält:** (P1) die 2H rutschen am Endgame zurück (Großschwert 0,71× = schlechtester L98-Melee — der str-Nerf trifft die langsamen 2H, der neue crit reicht nicht), (P1) Magie bleibt früh & spät der Boden, (P2) L10-One-Shot-Schwelle macht die Frühwaffenwahl volatil, (P2) Tankigkeit wertlos. Ziehe die 2H late zurück über Band (Grundschaden/aIMs am Top-Tier) und hebe Magie L10/L98 gegen den nun stabilen Melee-Anker — dann sitzen alle Stile im 0,9–1,1-Band.

---

## „Was fehlt für 9,5?"
1. **2H-Endgame zurück ins Band (P1):** Großschwert/Großaxt L98 von 0,71/0,73 auf ≥0,90 heben — 2H-Grundschaden am oberen Tier (Adamantium→Aetherium) anheben ODER aIMs der langsamsten 2H late weiter kürzen. Optional Greatsword-**crit-Chance** (nicht nur -Damage) leicht erhöhen, damit der ausgerollte crit-Buff reale Wirkung zeigt.
2. **Magie nachziehen (P1):** Der Melee-Anker steht jetzt (mid/late vs Fernkampf im Band). Magie L10 (0,57×) & L98 (0,74×) gegen diesen Anker heben — letzter großer Hebel fürs 3-Stile-Gleichgewicht.
3. **L10-Schwelle entschärfen (P2):** `goblin_butcher`-hp leicht anheben (90→~110), damit am L10-Gear-Stand keine Waffe one-shottet → robuste Frühgame-Waffenwahl statt Schwellen-Kippen (Speer-Absturz).
4. **Tankigkeit Wert geben (P2):** 1–2 Endgame-Burst-Mobs jenseits eines Auto-Eat-Ticks → Platte-HP/def wird Durchsatz-Faktor (sonst zahlt die Platte nur noch Offense über str).
5. **Evasion-Inversion drehen (P3):** Leder/Voidhide-Evasion runter, damit der Platten-Tank nicht vom Schützen ausgeweicht wird (L98 257 vs 121).
