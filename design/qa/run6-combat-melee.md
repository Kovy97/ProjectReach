# QA-Run 6 — Combat-Tiefenanalyse NAHKAMPF (nach str-in-Platte + 2H-Buff)

**Tester:** Playtester-Analyst (READ-ONLY; nur diese Datei geschrieben) · **Datum:** 2026-06-28
**Scope R6:** zwei gezielte Melee-Iterationen ggü. R5 — (1) **str-in-Platte**: `modifiers.str` auf Platten-Helm/Body/Legs (+ medhelm/gauntlets), damit Melee-str nicht mehr nur aus dem smithing-Backbone kommt; (2) **2H-Buff**: die aIMs-Strafe der 2H-Waffen (greatsword/greataxe/maul/spear) im Content auf **×0,6** gekürzt + **Greatsword `critDamage +0,30`** (Letzteres aktuell **nur** auf `godiron_greatsword`, req attack 99). Fernkampf & Magie unangetastet.
**Leitfrage:** Sind 2H jetzt konkurrenzfähig, trägt Platte str direkt, und liegt der DPS-optimale Nahkämpfer im Zielband **0,9–1,1×** zu ranged/magie @L10/L45/L98?

**Methode — echte Sim-Daten:** Temporäres Harness direkt auf der Engine (`createGame`→`startCombat`→`advance`, Seed 4242), **1 h Sim (720×5 s)** pro Build gegen denselben on-level Mob. **Auto-Gear je Slot** (bestes tragbares Teil nach Stil-Score; **anforderungs-korrekt** = ein Build trägt nur Gear, dessen Skill-Gates er trainiert → keine slayer-/platten-für-Magie-Fehlwahl). **Skill-Investition realistisch inkl. Pflicht-Handwerk:** melee→attack/power/defence/vitality **+smithing/mining**, ranged→ranged/defence/vitality/fletching **+leatherworking**, magic→magic_off/magic_def/vitality/runecrafting. Tiers per Gate gefiltert (L10 Iron, L45 Mithril, L98 Aetherium — `godiron` req99 ist @L98 **nicht** erreichbar). Auto-Eat T3 + `cooked_voidray`, voller Köcher, Mana ohne Cheat. Mobs identisch zu R5: L10 `goblin_butcher`, L45 `skeleton_nekro`, L98 `aether_wraith`. **0 Tode in ALLEN Läufen.** Harness nach dem Lauf **entfernt**.

**Stil-Hinweis (wichtig fürs Lesen):** Es wurde mit BEIDEN Nahkampf-`combatStyle` gemessen: **„power"** (Wucht, +12 % Schaden — der **DPS-optimale** Melee-Knopf) als Primär-Metrik, **„attack"** (Default, +12 % Acc) als konservative Gegenprobe. **Achtung:** der `dmgMult` aus „power" wirkt in `computeStats` **nur** auf `meleeDamage` — `rangedDamage`/`magicDamage` ignorieren ihn. „power" ist also ein **melee-exklusiver** DPS-Hebel; ein DPS-optimaler Nahkämpfer nutzt ihn, ranged/magie bekommen aus dem Stil **keinen** Schadensbonus.

*Caveat (wie R3→R5):* eigenes Harness ≠ R5-Harness (anderer Gear-Score) → **absolute** kills/h sind nicht 1:1 mit R5. Verlässlich sind (a) **within-run6** Stil-Ratios und (b) die **Richtung** vs R5.

---

## Fun-Score: **8.0 / 10**  (Δ vs run5: **±0.0** — seitwärts)

Gemischtes Bild: **ein Treffer, eine Überkorrektur.** Der **2H-Buff ist gelandet** — der aIMs-×0,6 zieht (Maul-Intervall L98 4075→**3475 ms**, −600), und 2H sind erstmals echt konkurrenzfähig: Maul/Großschwert/Großaxt stiegen von R5s **0,66–0,73×** auf **0,81–0,91×** des besten 1H mid/late, die **Großaxt** liegt L98 sogar bei **0,91×** und der **Speer (2H)** ist L10 **Top-Waffe**. Das adressiert R5-P3 sauber. **Platte trägt str jetzt direkt** (bestätigt: `modifiers.str` greift). ABER die str-in-Platte hat **überkorrigiert**: der DPS-optimale (Wucht-Stil) Nahkämpfer sitzt jetzt an **allen** Checkpoints **über** Band (÷ranged **1,55/1,11/1,21**, ÷magie **1,92/1,21/1,46**) — die R5-Sorge „Fernkampf ist der Endgame-Ausreißer (Melee 0,87×)" ist nicht nur geheilt, sondern **ins Gegenteil gekippt**: Melee ist der Ausreißer nach oben, **Magie der neue Boden**. Zudem ist das **eigentliche Ziel verfehlt** — Melee ist late **weiter smithing-abhängig** (ohne smithing L98 nur **0,76×** des smithing-Builds; der Platten-str neutralisiert die Lücke nur **früh**). Mechanik weiter grundsolide (0 Tode, deterministisch). Netto: der 2H-Gewinn (echte Build-Vielfalt) und die engere Melee-vs-Fernkampf-Parität (konservativ L98 0,87→**0,98×**) werden von der Überkorrektur + dem Magie-Boden + der verbliebenen smithing-Abhängigkeit aufgewogen → **kein Netto-Fortschritt zur 8,0**.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim) — **DPS-optimal („power"-Wucht-Stil)**

`×` = relativ zum **besten Melee-Build** des Checkpoints. **0 Tode überall.**

### L10 vs goblin_butcher (hp 90, dmg 18) — Iron
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Speer (2H)** | melee | **1133** | **1.00** | 105 | 118 | 2960 | .03 | 42 | 73 | 461 |
| Schwert | melee | 1123 | 0.99 | 100 | 115 | 2840 | .03 | 32 | 81 | 474 |
| Streitkolben | melee | 1116 | 0.98 | 100 | 109 | 2840 | .03 | 32 | 85 | 474 |
| Kampfaxt | melee | 1098 | 0.97 | 105 | 111 | 3040 | .03 | 32 | 81 | 474 |
| Axt | melee | 1084 | 0.96 | 102 | 111 | 2990 | .03 | 32 | 81 | 474 |
| Scimitar | melee | 1053 | 0.93 | 96 | 116 | 2540 | .08 | 33 | 83 | 487 |
| Großaxt (2H) | melee | 1027 | 0.91 | 120 | 112 | 3390 | .03 | 28 | 73 | 461 |
| Großschwert (2H) | melee | 998 | 0.88 | 127 | 112 | 3490 | .03 | 28 | 73 | 461 |
| Maul (2H) | melee | 922 | 0.81 | 143 | 108 | 3740 | .03 | 30 | 77 | 481 |
| Dolch | melee | 774 | 0.68 | 89 | 121 | 2340 | .10 | 34 | 84 | 497 |
| Langbogen | ranged | 729 | 0.64 | 55 | 184 | 2448 | .10 | 81 | 46 | 359 |
| Kurzbogen | ranged | 689 | 0.61 | 53 | 181 | 2448 | .17 | 81 | 47 | 369 |
| Stab | magic | 591 | 0.52 | 69 | 155 | 2955 | .03 | 46 | 39 | 316 |

### L45 vs skeleton_nekro (hp 480, regen 5, resist poison/bleed, enrage) — Mithril
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Dolch** | melee | **391** | **1.00** | 173 | 263 | 2310 | .14 | 56 | 185 | 928 |
| Schwert | melee | 371 | 0.95 | 200 | 229 | 2810 | .11 | 56 | 185 | 928 |
| Scimitar | melee | 365 | 0.93 | 187 | 252 | 2510 | .13 | 56 | 185 | 928 |
| Kampfaxt | melee | 357 | 0.91 | 207 | 237 | 3010 | .07 | 56 | 185 | 928 |
| Speer (2H) | melee | 350 | 0.90 | 206 | 256 | 2930 | .07 | 89 | 164 | 889 |
| Großaxt (2H) | melee | 344 | 0.88 | 237 | 240 | 3360 | .07 | 51 | 164 | 889 |
| Großschwert (2H) | melee | 342 | 0.87 | 251 | 239 | 3460 | .07 | 51 | 164 | 889 |
| Maul (2H) | melee | 318 | 0.81 | 281 | 229 | 3710 | .07 | 51 | 164 | 889 |
| Kurzbogen | ranged | 352 | 0.90 | 124 | 335 | 2025 | .24 | 145 | 101 | 582 |
| Langbogen | ranged | 342 | 0.87 | 127 | 344 | 2160 | .17 | 145 | 101 | 582 |
| Stab | magic | 322 | 0.82 | 185 | 271 | 2880 | .06 | 105 | 109 | 597 |

### L98 vs aether_wraith (hp 950, resist shock) — Aetherium
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Dolch** | melee | **616** | **1.00** | 413 | 541 | 2075 | .22 | 121 | 495 | 2146 |
| Großaxt (2H) | melee | 559 | 0.91 | 571 | 476 | 3125 | .13 | 85 | 437 | 2026 |
| Scimitar | melee | 554 | 0.90 | 450 | 509 | 2275 | .21 | 121 | 495 | 2146 |
| Großschwert (2H) | melee | 515 | 0.84 | 606 | 471 | 3225 | .13 | 85 | 437 | 2026 |
| Maul (2H) | melee | 498 | 0.81 | 671 | 444 | 3475 | .13 | 85 | 437 | 2026 |
| Schwert | melee | 468 | 0.76 | 471 | 498 | 2575 | .13 | 121 | 495 | 2146 |
| Speer (2H) | melee | 443 | 0.72 | 490 | 520 | 2695 | .13 | 193 | 437 | 2026 |
| Kurzbogen | ranged | 509 | 0.83 | 235 | 626 | 1593 | .31 | 228 | 204 | 1143 |
| Langbogen | ranged | 468 | 0.76 | 244 | 651 | 1728 | .22 | 228 | 204 | 1143 |
| Stab | magic | 421 | 0.68 | 386 | 568 | 2880 | .23 | 138 | 187 | 1017 |

---

## Kernbefund — bester Melee relativ zu den anderen Stilen

| Checkpoint | bester Melee (×) | ÷ Fernkampf(best) | ÷ Magie | **konservativ (attack-Stil)** ÷FK / ÷Magie |
|---|---|--:|--:|--:|
| L10 | Speer 1133 | **1.55** | **1.92** | 1.40 / 1.73 |
| L45 | Dolch 391 | **1.11** | **1.21** | **0.97** / 1.07 |
| L98 | Dolch 616 | **1.21** | **1.46** | **0.98** / 1.19 |

**Antwort auf die Leitfrage:**
- **2H konkurrenzfähig? JA, klar verbessert.** Maul/Großschwert/Großaxt von R5 **0,52/0,58/0,60** (L10) bzw. **0,66/0,73/0,77** (L98) auf jetzt **0,81/0,88/0,91** (L10) bzw. **0,81/0,84/0,91** (L98). Der **Speer (2H)** ist L10 **die Top-Waffe**, die **Großaxt** L98 die **Nr. 2** hinter dem Dolch. Das R5-P3 (langsames 2H = klar schwächste Wahl) ist **erledigt**. aIMs-×0,6 bestätigt (Maul L98 4075→3475 ms).
- **Platte trägt str direkt? JA, aber zu schwach.** `modifiers.str` greift (bestätigt im Equip). Aber: **früh** dominiert der Platten-str (L10 smith==noSmith, identisch), **late** dominiert wieder der smithing-Backbone → noSmith-Melee L98 **0,76×** des smithing-Builds. Das Ziel „nicht mehr smithing-level-abhängig" ist **late verfehlt**.
- **Im Band? NEIN (DPS-optimal).** Unter dem DPS-optimalen Wucht-Stil liegt Melee an **allen** Checkpoints über 1,1× — vs Magie sogar 1,2–1,9×. **Nur** konservativ (attack-Stil) sitzt Melee-vs-Fernkampf mid/late sauber im Band (0,97/0,98×); vs Magie bleibt es auch konservativ darüber.
- **Dominant?** Effektiv ja, nach oben: Melee ist jetzt der höchste Stil (war R5 late der niedrigste). **Magie ist der neue Boden** (L98 0,68× Melee / 0,83× Fernkampf).

---

## Δ vs run5 (Richtung — die verlässliche Metrik)

| Achse | run5 (L10/L45/L98) | run6 (L10/L45/L98) | Bewegung |
|---|---|---|---|
| best Melee ÷ Fernkampf | 1.11 / 1.00 / **0.87** | 1.55 / 1.11 / 1.21 *(DPS-opt.)* · 1.40/0.97/**0.98** *(konserv.)* | Melee **hoch**; late-Lücke geschlossen, aber DPS-opt. **über** Band ⚠️ |
| best Melee ÷ Magie | 1.25 / 0.96 / 1.13 | 1.92 / 1.21 / 1.46 | Melee **deutlich über** Magie — Magie neuer Boden ⚠️ |
| 2H (Maul/GS/GA) ÷ best 1H | 0.52–0.60 (L10) · 0.66–0.85 (L98) | **0.81–1.00 (L10)** · **0.81–0.91 (L98)** | **geheilt** ✅ — 2H konkurrenzfähig |
| Melee ohne smithing | unter Band (R5: ×0.80–0.87) | L98 **0.76×** des smithing-Builds | **weiter abhängig** late ⚠️ (früh neutralisiert ✅) |
| 0 Tode / Determinismus | ja / ja | **ja / ja** | unverändert solide ✅ |

**Lesart:** Der 2H-Buff trifft **genau** sein Ziel. Die str-in-Platte trifft ihr Ziel **nur halb** (früh ja, late nein) und schießt zugleich für den realistischen smithing-Main **über** das Band — die R5-Parität (mid 1,00 / late 0,87) ist gegen eine **Melee-Übergewichtung** + einen **Magie-Boden** getauscht. Per Saldo eine Seitwärtsbewegung.

---

## Priorisierte Findings

### [P0] — keine
Keine Crashes/Walls, **0 Tode** über alle Läufe, deterministisch (Seed 4242). Treffer/Mitigation/Auto-Eat/Köcher/Mana sauber. aIMs-×0,6 und Platten-str korrekt im Equip/Stat-Pfad angewandt.

### [P1 Balance] str-in-Platte hat überkorrigiert — DPS-optimaler Melee liegt über Band (vs Magie 1,2–1,9×)
**Befund (Sim):** Unter dem DPS-optimalen Wucht-Stil sitzt der beste Nahkämpfer an allen Checkpoints **über** 1,1× (÷ranged 1,55/1,11/1,21, ÷magie 1,92/1,21/1,46). Treiber: der zusätzliche Platten-str **stapelt sich auf** den weiterhin vorhandenen smithing→str-Backbone (statt ihn zu ersetzen) → der smithing-Main bekommt **doppelten** str. Verstärkt durch den **melee-exklusiven** `dmgMult` (Wucht-Stil +12 % nur auf `meleeDamage`; ranged/magie bekommen aus dem Stil 0 %).
**Fix-Vorschlag (combat/content):** Entweder den smithing→str-Beitrag für Melee **reduzieren**, jetzt wo Platte den str trägt (damit beide zusammen nicht überschießen) — ODER den Platten-`modifiers.str` zurücknehmen und den smithing-Backbone als dokumentierten Pflichtpfad belassen. Zusätzlich prüfen, ob der Wucht-`dmgMult` bewusst melee-exklusiv sein soll (sonst latenter +12 %-Melee-Bonus, der bei höherem Melee-Grundschaden jetzt entscheidend wird).

### [P1 Balance] Ziel „smithing-unabhängig" late verfehlt — noSmith-Melee L98 nur 0,76×
**Befund (Sim):** Der Platten-str ist **flach** und neutralisiert die fehlende smithing-str nur **früh** (L10: smith==noSmith identisch). Late skaliert der smithing→str mit dem Level (L98 smithing 98 → +24 str) und dwarft den flachen Platten-str → ohne smithing fällt der beste Melee L98 von **616 auf 469 (0,76×)**, L45 391→342 (0,87×). Die mid/late-Parität hängt also **weiterhin** am smithing-Grind — das deklarierte Ziel der Änderung ist late nicht erreicht.
**Fix-Vorschlag:** Platten-`modifiers.str` mit dem Gear-Tier **stärker skalieren** (z.B. Aetherium-Platte str deutlich höher), sodass der Platten-str den smithing-Beitrag auch late ersetzt — gekoppelt mit P1 (sonst Überkorrektur). Konsistenz-Ziel: smith- und noSmith-Build sollten an JEDEM Checkpoint ≤ ~5 % auseinanderliegen.

### [P1 Balance] Magie ist der neue Boden — kein Stil-Gleichgewicht, nur Verschiebung
**Befund (Sim):** Mit dem Melee-Lift ist **Magie** der niedrigste Stil: L98 Stab **421** = 0,83× Fernkampf, 0,68× Melee; L45 0,82× Melee; L10 0,52× Melee. (Fernkampf liegt mittig.) R5 hatte Magie im Band (0,88–1,04× Melee) — der Melee-Buff hat das Gleichgewicht nicht hergestellt, sondern nur verschoben.
**Fix-Vorschlag (magic-seitig, außerhalb Melee-Revier):** an magic-/content-dev — sobald Melee zurück ins Band gezogen ist (P1), Magie gegen den dann gültigen Melee-Anker neu prüfen; aktuell ist Magie ggü. allen anderen Stilen unter Band.

### [P2 Balance] Greatsword-`critDamage +0,30` ist auf godiron (L99) gestrandet — am Checkpoint unsichtbar
**Befund:** Der crit-Bonus existiert **nur** auf `godiron_greatsword` (req attack 99). Am L98-Checkpoint (Aetherium-Großschwert) hat das Großschwert **kein** critDamage (cd 1,80 = Basis), und alle Tiers L10–L90 ebenso. Die „2H-Burst-Identität" über crit greift damit **genau eine Stufe** (L99) und ist im gesamten getesteten Bereich wirkungslos — das Großschwert hängt seinen Durchsatz aktuell **allein** am aIMs-×0,6 auf (L98 0,84×). 
**Fix-Vorschlag (content):** `critDamage` auch auf die Großschwert-Tiers ab ~Mithril/Aetherium legen (analog battleaxe/greataxe, die ihren critDamage über alle Tiers tragen) — sonst ist der dokumentierte Greatsword-crit-Buff für 99 % des Spielverlaufs tot.

### [P2 Balance] L10-One-Shot-Schwelle macht die beste Melee-Waffe volatil
**Befund (Sim):** goblin_butcher hat 90 hp. Mit dem Platten-str kreuzen am L10 mehrere Waffen die **1-Hit-Schwelle** (dmg > 90) → ihr Durchsatz springt sprunghaft (Speer/Schwert one-shotten, Dolch braucht 2 Hits). Folge: die „beste" L10-Waffe kippt je nach Stil-Wahl wild (power: Speer/Schwert top, Dolch **schlechteste**; attack: Großschwert/Maul top) und Melee schießt L10 auf 1,40–1,92×. Das ist ein Schwellen-Artefakt, kein robuster Befund — aber es zeigt, dass der Platten-str das Frühgame in Überschuss kippt.
**Fix-Vorschlag (optional):** Mit P1 (str runter) entschärft sich das automatisch; alternativ goblin_butcher-hp leicht anheben, damit kein 1-Hit am L10-Gear-Stand entsteht.

### [P2 Balance] Tankigkeit weiter wertlos — 0 Tode, und Platte gibt jetzt nur MEHR Offense
**Befund (unverändert seit R3/R5):** 0 Tode bei jedem Stil. Der neue Platten-`modifiers.str` macht Platte für Melee noch attraktiver — aber **offensiv**; def 495/hp 2146 @L98 kaufen weiterhin **nichts** (Auto-Eat löst Survival für alle). Die einzige nicht-Durchsatz-Identität von Melee bleibt tot, und der Platten-str verschärft, dass Melee rein über Offense gewinnt.
**Fix-Vorschlag:** wie R5 — 1–2 Endgame-Burst-Mobs jenseits eines Auto-Eat-Ticks, damit Platte-HP realen Durchsatz-Wert bekommt.

### [P3 Balance] Evasion-Inversion bleibt — Leder-Schütze weicht 2–3× besser aus als Platten-Tank
**Befund:** L98 Fernkampf eva **228** vs Melee eva 85–121; L45 145 vs 56. Unverändert invertiert. Mit 0 Toden ist die hohe ranged-Evasion ein reiner Gratis-Vorteil. (Deckt sich mit R5-P2.)
**Fix-Vorschlag:** Leder/Voidhide-Evasion-Budget kürzen; Melee behält def/hp als Tank-Achse (greift erst mit Burst-Mobs, s.o.).

### [P3 Info] Speer (2H) ist die heimliche Gewinner-Nische des 2H-Buffs
**Befund (Sim):** Der Speer kombiniert 2H-Schaden + hohe Evasion (L98 eva 193) + moderates Intervall und ist L10 die **Top-Waffe** (1133) sowie L45/L98 mit ~0,72–0,90× solide. Kein Defizit — nur als Hinweis, dass der 2H-Buff dem Speer ein klares Profil gegeben hat.

---

## Mechanik-Checks (bestanden)
- **Platten-str:** `modifiers.str` aus Helm/Body/Legs landet korrekt in `computeStats.attr.str` → `meleeDamage`; im noSmith-Vergleich isoliert sichtbar.
- **2H-aIMs-×0,6:** bestätigt über den Intervall-Abfall vs R5 (Maul −600 ms, Großschwert −450 ms, Großaxt/Speer entsprechend). Keine 2H-Sonderlogik in der Engine — die Strafe lebt sauber in den Content-`bonus.attackIntervalMs`-Werten.
- **Anforderungs-Gating:** Builds tragen nur Gear ihrer trainierten Skills (slayer-Gear / Platte-für-Magie korrekt ausgeschlossen) → faire Stil-Ratios.
- **Treffer/Mitigation/Köcher/Mana/Determinismus:** wie R5 sauber, kein NaN/Drift, Seed 4242 stabil.

## Fazit
**Ein klarer Treffer (2H), eine Überkorrektur (Platte).** Der 2H-Buff macht Maul/Großschwert/Großaxt/Speer erstmals konkurrenzfähig (R5-P3 erledigt) — das ist echte Build-Vielfalt und der überzeugendste Teil von R6. Platte trägt str jetzt direkt, schließt die R5-late-Lücke zu Fernkampf (0,87→0,98× konservativ) — **aber** überkorrigiert für den realistischen smithing-Main (DPS-optimal über Band), verfehlt sein eigenes Ziel late (Melee bleibt L98 0,76× ohne smithing) und drückt **Magie unter Band**. **Was Melee unter 9,5 hält:** (P1) Überkorrektur via doppeltem str + melee-exklusivem Wucht-Bonus, (P1) weiter bestehende smithing-Abhängigkeit late, (P1) Magie als neuer Boden, (P2) Greatsword-crit auf L99 gestrandet, (P2) wertlose Tankigkeit. Sind str-Quellen entzerrt (Platte rauf / smithing runter, oder umgekehrt) und Magie nachgezogen, sitzen alle Stile im 0,9–1,1-Band.

---

## „Was fehlt für 9,5?"
1. **str-Quellen entzerren (P1):** Platten-str und smithing→str so austarieren, dass smith- UND noSmith-Build an JEDEM Checkpoint ≤ ~5 % auseinanderliegen UND der DPS-optimale Melee ≤ 1,1× ranged/magie bleibt. Heute stapeln sie sich → Überschuss.
2. **Wucht-`dmgMult` prüfen (P1):** klären, ob der +12 %-Schaden bewusst melee-exklusiv ist; falls nicht, auf ranged/magie spiegeln ODER Melee-Grundschaden entsprechend senken — sonst ist „power" ein versteckter Dauer-Melee-Bonus.
3. **Magie nachziehen (P1):** sobald Melee im Band ist, Magie (L98 0,68× Melee / 0,83× Fernkampf) gegen den Anker heben — sonst nur Boden-Verschiebung statt Gleichgewicht.
4. **Greatsword-crit aus L99 holen (P2):** `critDamage` auf die Großschwert-Tiers ab Mithril/Aetherium legen, damit der dokumentierte 2H-crit-Buff im Spielverlauf überhaupt existiert.
5. **Tankigkeit Wert geben (P2):** 1–2 Endgame-Burst-Mobs jenseits eines Auto-Eat-Ticks → Platte-HP wird Durchsatz-Faktor (sonst gewinnt Melee rein über die neue Offense).
6. **Evasion-Inversion drehen (P3):** Leder/Voidhide-Evasion runter, damit der Platten-Tank nicht vom Schützen ausgeweicht wird.
