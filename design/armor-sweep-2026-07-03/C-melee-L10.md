# Phase C — Combat-Tester · MELEE · Band L10 (Frühgame) · Rüstungs-Trinität

Stand 2026-07-03 · Kontrolleur (Combat-Tester) · **HEADLESS** (createGame/computeStats/combatStep, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_cM10_*` gelaufen & gelöscht.
Loadout: **on-tier Eisen** (defence/attack 10; Kampf-Skills attack/power/defence/vitality = 10 → CL = 10). 5-Platte (`iron_fullhelm/platebody/platelegs/gauntlets/sabatons`) + (`iron_kiteshield` | `iron_greatsword` | `iron_maul`). Gegner: die frei-startbaren Band-Mobs boar L10 (on-level) … goblin_spearman L20 (+10) + bull_boss L15 (Enrage). Fenster: 600 s/Seed, 16–30 Seeds/Zelle.

## VERDIKT: **FIX-THEN-SHIP** (System korrekt verdrahtet; zwei Frühgame-Balance-Hebel)
Kein P1-Blocker. Rüstung wirkt massiv (4,8× Modell-EHP, ungepanzert = 100 % Tod), Block/Mitigation/One-Shot-Cap/Ward mechanisch korrekt, kein Exploit. **Zwei echte Befunde:** (P2) 2H ist am unteren Band deutlich glasiger als das Spec-Ziel (**EHP 82,5 % von 1H statt der intendierten 90 %**) und seine Mehr-DPS verpufft an den Low-HP-Band-Mobs (Overkill) → 1H+Schild ist am Band 10 der klar bessere Default. (P3) Food ist gegen die ON-LEVEL-Mobs nahezu optional (kein-Food überlebt 600 s) — Constraint-2 „Food PFLICHT" hält am Band-10-On-Level nicht.

---

## Die Gate-Fragen (mit Zahlen)

### computeStats (Band L10, CL 10) — Referenz für alles Weitere
| Loadout | maxHp | con | armorRating | Mitigation | Block | Ward* | Ø-Hit | atkMs | DPS-out | Modell-EHP** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **1H+Schild** (kite) | 49,7 | 21 | 6,73 | **35 %** | 15 % | 3 | 7,9 | 2840 | 2,78/s | **86** |
| **2H-Greatsword** | 43,7 | 18 | 7,85 | **39 %** | 0 % | 3 | 11,4 | 3320 | 3,43/s | **71** |
| 2H-Maul | 43,7 | 18 | 7,85 | 39 % | 0 % | 3 | 12,2 | 3400 | 3,59/s | 71 |
| Plate-ohne-Schild-1H | 43,7 | 18 | 5,05 | 29 % | 0 % | 3 | 7,9 | 2840 | 2,78/s | 61 |
| **Ungepanzert-1H** | 17,7 | 5 | 0 | **0 %** | 0 % | 3 | 4,9 | 2840 | 1,73/s | **18** |

\* Ward 3 auf reinem Melee-Held = `WARD_CORE_PER_INT`-Leak (P3). \*\* Modell-EHP = `maxHp / ((1−red)(1−block·0,75))`.
Platte trifft die Spec §4.1 exakt (Set-AR 6,73 → red 35 %, Kiteschild block 15 %). Mitigation weit vom 0,80-Cap (kein Invuln).

### (1) Rüstung bedeutsam? — **JA, dramatisch**
- Modell-EHP ungepanzert **18** → 1H+Schild **86** = **4,8×**. In-Sim-Überlebenszeit (no-food) 5–18× länger.
- Ungepanzert: maxHp 17,7, 0 % Mitigation, Ø-Gegnertreffer entfernt ~25–50 % des Lebens. Gepanzert: 49,7 HP + 35 % Mitigation + 15 % Block → jeder Treffer ist ein Chip. Der Unterschied ist der zwischen „Dauer-Farmen" und „Tod in 3 Treffern". ✅

### (2) Ungepanzert = Suizid? — **JA, 100 %**
TTD = Spielzeit bis zum ersten Tod (Live-Auto-Battle, kein Food, kein Restart; avg/Seed):
| Mob (Lvl, dmg) | Ungepanzert-1H | 1H+Schild | Überlebens-× (armor/nackt) |
|---|---|---|---:|
| boar (10, 5) — **on-level** | **29,8 s / 1 Kill / stirbt 100 %** | 500,8 s / 37 K / stirbt 29 % | ~17× |
| goblin (15, 7) | **25,8 s / 1,2 K / 100 %** | 474,7 s / 50 K / stirbt 17 % | ~18× |
| goblin_shaman (18, 9) | **13,6 s / 100 %** | 98,6 s / 5,2 K | 7,2× |
| goblin_spearman (20, 9) | **12,5 s / 100 %** | 93,5 s / 4,8 K | 7,5× |
| bull_boss (15, 7, Enr ×1,6) | **15,5 s / 100 %** | 77,1 s / 1,8 K | 5,0× |

- Ungepanzert stirbt gegen **jeden** offenen Mob zu 100 %, schafft 0–1 Kills. Gegen die +5…+10-Mobs 12–15 s = 2–4 Treffer = das Spec-§7.1-„Suizid". Gegen den weichen On-Level-boar 30 s / 1 Kill — ebenfalls idle-untauglich. EHP-Multiplikator 5–7,5× (deckt Spec-§7.1 „4–7×"). ✅
- *(shambling_carcass L12 = einziger „+2"-Mob im Band ist slayer-gated (`plague_mask`) → nicht frei startbar; als Band-Vertreter fällt er aus, goblin L15 ist die nächste offene Stufe.)*

### (3) Food nötig aber nicht trivial? — **ZU WEICH am On-Level** (P3)
600 s, 1H+Schild, `cooked_chicken` (Heal 3), Auto-Eat Tier 0 (isst < 50 %):
| Mob | mit Food | Food-Verbrauch | min-HP | **OHNE Food** |
|---|---|---:|---:|---|
| boar L10 (on-level) | 39 K, 0 Tode | **2 Stück / 600 s** | 55 % | ~0 Tode |
| goblin L15 (+5) | 51,6 K, 0 Tode | **2 Stück / 600 s** | 54 % | **0,19 Tode / 600 s, min 27 %** |
| goblin_shaman L18 | 35,4 K, 0 Tode | 67 Stück | 34 % | stirbt |
| goblin_spearman L20 | 34,8 K, 0 Tode | 79 Stück | 33 % | stirbt |
| bull_boss L15 | 18,4 K, 0 Tode | 93 Stück | 26 % | stirbt |

Food-Gradient gegen goblin L15 (1H+Schild, 600 s):
| Food | Heal | Kills | Tode | verbraucht | min-HP |
|---|---:|---:|---:|---:|---:|
| **KEIN** | 0 | 51,6 | **0,19** | 0 | 27 % |
| cooked_shrimp | 1 | 51,7 | **0** | 15 | 46 % |
| cooked_chicken | 3 | 51,6 | 0 | 2 | 54 % |
| cooked_cod | 4 | 51,7 | 0 | 4 | 54 % |

- Gegen die ON-LEVEL-Mobs (boar/goblin) ist Food faktisch **optional**: kein-Food überlebt die vollen 600 s (goblin: nur 0,19 Tode, min 27 %). Grund: schnelle Kills + Kill-Cooldown-Lücken → effektiver DPS-in nur ~0,22/s; die 3-Ward-Refill je Kill hilft zusätzlich.
- Selbst **Heal-1-Shrimp** nullt alle Tode gegen den +5-Mob. Food wird erst bei +3…+5 Über-Level (shaman/spearman/boss) wirklich verbraucht (67–103 Stück, min-HP 24–34 %) — aber auch dort **0 Tode**. → Food = Komfort-Marge, kein harter Gate am Band 10. Passt zum „Early-Farm-Buffer" (Spec §7.2), liegt aber am trivialen Ende. **Spiegelbild zum L90-Tester:** dort Food trivial durch Lifesteal, hier trivial durch Low-Mob-DPS + schnelle Kills — Constraint-2 hält an beiden Enden nicht.

### (4) 1H+Schild vs 2H EHP-fair? — **NEIN am Band 10** (P2)
- **Modell-EHP: 1H 86 vs 2H 71 → 2H = 82,5 % von 1H** (Spec-Ziel §4.4/§5: 2H = −10 %, also **90 %**). 2H ist ~7,5 pp **unter** seinem eigenen Ziel, außerhalb der ±10 %-Parität. Ursache band-skaliert: 2H verliert die **+3 con des Schildes** (−6 HP = großer Anteil eines 44-HP-Pools) UND den Block; der Waffen-`armorRating`-Bonus (2,8 → 39 % statt 35 % Mitigation) gleicht das am unteren Band **nicht** aus. (Bei L90 ist die Schild-con ein kleiner Pool-Anteil → dort landet 2H bei −5,6 % = fair. Der Fehler ist am Band 10 am größten.)
- **Throughput (600 s, Food, 0 Tode):** vs goblin L15 1H **51,7** vs 2H-GS **51,1** vs 2H-Maul **50,3** = **gleich**. 2H's +23…+29 % Roh-DPS **verpufft** — goblin (15 HP) stirbt so oder so in ~2 Schwüngen (Overkill), der Kill-Takt dominiert. 2H zahlt die EHP-Steuer, kassiert aber am Low-HP-Mob keine Mehr-Kills.
- 2H zieht **nur an High-HP-Zielen** an: vs bull_boss (67 HP) 2H-GS **21,9 K** vs 1H **18,4 K** = **+19 %**. Dort greift die Offense-Prämie.
- **Fazit:** Am Band 10 ist 1H+Schild der klar bessere Default (gleiche Kills an Standard-Mobs + **weit** bessere Survival: boar TTD 500 s vs 303 s, goblin 475 s vs 260 s). 2H ist erst am Boss/High-HP-Ziel eine echte Alternative. Der intendierte EHP-faire Sidegrade **stimmt am Band 10 nicht** — 2H ist zu glasig UND unterbelohnt.

### Block isoliert (gleiche `iron_sword`, no-food, vs goblin)
| Build | maxHp | Mitigation | Block | TTD |
|---|---:|---:|---:|---:|
| 1H+Schild | 49,7 | 35 % | 15 % | **474,7 s** |
| Plate-ohne-Schild-1H | 43,7 | 29 % | 0 % | 326,4 s |

Der Schild (+3 con, +6 pp Mitigation, +15 % Block gebündelt) = **+45 % Überlebenszeit**. Block reduziert (−75 %), nullt nicht (bestätigt via `armor-trinity-combat.test.ts`); RNG-Draw NUR bei blockChance > 0 (2H/kein Schild → block 0 → kein Draw → Alt-Content-Parität).

---

## Befunde (Priorität + Owner)

**P1 — keiner.** Kein Blocker im Melee-Frühgame-Pfad.

**P2 (Balance) — 2H am Band 10 zu glasig + Offense-Prämie verpufft · Owner: balance-designer (+ content-dev).**
2H-EHP = 82,5 % von 1H statt der Spec-Ziel-90 % (§4.4/§5) — außerhalb der ±10 %-Parität, weil der Verlust der Schild-`+3 con` (−6 HP) an einem 44-HP-Pool schwer wiegt und der 2H-Waffen-`armorRating`-Bonus (2,8) das nicht deckt. Gleichzeitig kassiert 2H seine +23…+29 % DPS an den Low-HP-Band-Mobs NICHT (Overkill → gleiche Kills wie 1H vs goblin; Vorteil erst am Boss +19 %). Netto: 1H+Schild dominiert am Band 10 (gleiche Kills + weit bessere Survival). Hebel: Band-10-2H-Waffen-`armorRating`-Bonus anheben (Ziel: 2H-EHP ≈ 90 % von 1H) ODER 2H-Waffen einen kleinen con/maxHp-Ersatz für die fehlende Schild-con geben. Band-skaliert (bei L90 fair) → nur die unteren Bänder betroffen.

**P3 (bekannt, offen) — Ward-Sockel auf reinem Melee-Held (`WARD_CORE_PER_INT = 1,0`) · Owner: logic-dev.**
On-tier-Melee zeigt `maxWard = 3` (aus INT 3) → 3 HP Gratis-Absorb VOR HP, per Kampfstart/Respawn refresht, + eine sichtbare Ward-Leiste, obwohl Ward Magier-Mechanik sein soll. Am Band 10 ist der Effekt **proportional größer** als im Endgame (3/49 HP ≈ 6 % vs 15/292 ≈ 5 %) und deckt bei Ø-Treffern von 3–9 real ~1 Treffer je Encounter — trägt sichtbar zur weichen Food-Lage (Frage 3) bei. Deckt sich 1:1 mit GATE-B §7 / TRIAGE Lever 2 (Empfehlung `WARD_CORE_PER_INT = 0`). Noch nicht angewandt.

**P3 (Balance) — Food am Band-10-On-Level nahezu vestigial · Owner: balance-designer.**
Kein-Food überlebt 600 s gegen den On-Level-boar UND den +5-goblin (nur 0,19 Tode/600 s, min 27 %); Heal-1-Shrimp nullt alle Tode. Food tut erst bei +3…+5 Über-Level echte Arbeit, dort aber ebenfalls 0 Tode. Constraint-2 „Food strukturell PFLICHT" (Spec §7.2) gilt am unteren Band nicht. Kein Bug (schnelle Kills + Kill-Cooldown-Lücken senken den effektiven DPS-in auf ~0,22/s, dazu P3-Ward-Refill). Entweder als Early-Farm-Buffer akzeptieren oder On-Level-Mob-`damage` leicht anheben / Kill-Tempo senken, damit Food seine Rolle behält.

**P4 (Edge) — „Ungepanzert" mit 2H-Waffe ist nicht wirklich ungepanzert · Owner: balance-designer (Watch).**
Ein nackter 2H-Held (nur Waffe, 0 Rüstungsteile) trägt trotzdem **18 % Mitigation** (armorRating 2,8 aus dem 2H-Waffen-Bonus) → Modell-EHP 22 statt 18. Der 2H-Waffen-`armorRating` greift unabhängig davon, ob Rüstung getragen wird (computeStats:316 gated nur auf `style==="melee" && twoHanded`, NICHT auf getragene Platte). Intendiert per §5, aber weicht die „ungepanzert = Suizid"-Grenze für 2H-Träger marginal auf. Nur Notiz.

**Kein Exploit bestätigt:** One-Shot-Cap bindet am Band 10 NIE (schlimmster Einzeltreffer boar 5 / goblin 7 / shaman 9 / spearman 9 / **bull_boss-Enrage 11** vs Cap 24,9 = 50 % maxHp) — korrektes Anti-Burst-Rail für höhere Level, hier inert. Block = single-Offhand + `MAX`-Aggregation (kein Stacking). Dodge-Draw übersprungen (dodgeChance 0 → RNG-Parität zu Alt-Content). Mitigation 35–39 %, weit vom 0,80-Cap. Held nicht un-treffbar (Gegner-Trefferquote ~70–75 %).

---

## Methodik / Reproduzierbarkeit
- Held: `createGame({name})` (Default-Melee, Stance `attack`, defMult 1,0), Skills attack/power/defence/vitality = `xpForLevel(10)` → CL 10, con 21 (1H) / 18 (2H) aus Platten-`modifiers` + `iron_set`-Bonus (≥5 Teile, +con 2/+str 2).
- Instrumentierung: eigener `combatStep`-Loop (TICK_MS 100), Events per `seq`-Delta aus `combat.log` gezählt (enemy hit/miss, player heal/shield), `stats.deaths/kills`-Delta.
- TTD = Zeit bis erster Tod, `restartOnDeath:false`; Sustain = 600 s, `restartOnDeath:true` (idle-fair Respawn desselben Mobs); Food unbegrenzt.
- Modell-EHP = `maxHp / ((1−red)(1−block·0,75))`, red = `min(0,80, armorRating·defMult / (armorRating·defMult + 12,5))`.
- Ergebnisse seed-stabil über 16–30 Seeds (Ungepanzert 100 % Tod deterministisch; 1H+Schild 0 Tode mit Food in allen Zellen).
