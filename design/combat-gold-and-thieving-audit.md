# Audit: Combat-Gold-Kurve (P2.6) & Thieving-Leiter (P2.4)

**Autor:** Balance-Designer · **Datum:** 2026-06-24
**Geprüft auf:** `packages/content/src/index.ts` (Mob-`gold`, Thieving-`gold`-Ranges)
**Mess-Quellen:** `design/playtests/min-maxer.md` (Combat-Gold/h, geared Endgame-Held) und
`design/playtests/merchant.md` (Thieving-Leiter g/h @ `levelRequired+5`).

> Reine Spec. content-dev übernimmt die alt→neu-Werte 1:1. Keine Engine-/Content-Datei wurde geändert.

---

## Methodik (Kill-Rate-Modell für P2.6)

Die Combat-g/h-Werte des Min-Maxers wurden mit einem geared Endgame-Helden gemessen. Aus seinen
fünf Anker-Mobs (gemessene g/h, bekanntes `gold` und `maxHp`) folgt eine sehr stabile Kill-Zeit:

| Anker | maxHp | s/Kill (aus Messung) | s/Kill ÷ hp |
|---|---:|---:|---:|
| goblin_warlock | 110 | 1,72 | 0,0156 |
| ash_tyrant | 180 | 3,24 | 0,0180 |
| forest_warden | 360 | 6,43 | 0,0179 |
| aether_wraith | 480 | 8,95 | 0,0186 |
| last_idol | 1400 | 43,29 | 0,0309* |

Für den geared Helden ist die Kill-Zeit nahezu **proportional zur maxHp** (Defense wird zerschmettert):
`s/Kill ≈ 0,018 · maxHp` (Floor 1,3 s). last_idol liegt höher (Boss-Tankiness/Def 60) — dort wird die
**gemessene** Zeit (43,3 s) direkt verwendet. Daraus: `kills/h = 3600 / s/Kill`, `gold/h = kills/h · gold`.

Dieses Modell reproduziert die gemessene flache Kurve (warlock 67k ≈ last_idol 66k) und liefert die
Basis, um neue `gold`-Werte so zu setzen, dass eine **echte gold/h-Leiter** entsteht.

---

# TEIL 1 — P2.6: Combat-Gold ist zu flach

## Befund — aktuelle (flache) Kurve

Repräsentative Auswahl (Einstieg → Endgame). `gold` = Gold pro Kill (Feld `gold` im Mob-Objekt).

| id | lvl | maxHp | s/Kill | gold/Kill | kills/h | **gold/h (aktuell)** |
|---|---:|---:|---:|---:|---:|---:|
| goblin | 1 | 30 | 1,30 | 5 | 2769 | **13 846** |
| goblin_warlock | 14 | 110 | 1,72 | 32 | 2096 | **67 066** |
| ash_tyrant | 20 | 180 | 3,24 | 60 | 1112 | **66 711** |
| skeleton_icemage | 30 | 220 | 3,96 | 36 | 909 | **32 727** |
| forest_warden | 40 | 360 | 6,43 | 120 | 560 | **67 215** |
| roc_hunter | 50 | 420 | 7,56 | 80 | 476 | **38 095** |
| deep_kraken | 60 | 620 | 11,16 | 120 | 323 | **38 710** |
| roc_storm | 75 | 720 | 12,96 | 200 | 278 | **55 556** |
| aether_wraith | 98 | 480 | 8,95 | 200 | 402 | **80 411** |
| scale_skarn | 104 | 620 | 11,16 | 230 | 323 | **74 194** |
| last_idol | 120 | 1400 | 43,29 | 800 | 83 | **66 521** |

**Problem:** Ein Lv14-Mob (goblin_warlock, 67k) liefert ~gleich viel gold/h wie der Lv120-Endboss
(last_idol, 66,5k). Spread Top→Einstieg-Band nur ~1,2–1,6×. Zudem ist die Kurve **nicht monoton** —
es gibt willkürliche Spitzen (warlock/ash_tyrant/forest_warden überrich) und Täler (skeleton_icemage,
roc_hunter). Es existiert kein „Farm-Spot-Meta": höhere Mobs lohnen nicht, weil ihr höheres
gold/Kill durch langsamere Kills neutralisiert wird.

## Ziel-Kurve

Geometrische gold/h-Leiter **20 000 g/h (low) → 90 000 g/h (Top) ≈ 4,5×** über die Levelspanne
(`target_gph(L) = 20000 · (90/20)^((L−1)/119)`). Da `gold/Kill = target_gph · s/Kill / 3600`, wachsen
hohe Mobs überproportional im gold/Kill (mehr HP → weniger Kills/h → brauchen mehr pro Kill) — genau
wie gefordert. Die drei überrichen Frühmobs (warlock/ash_tyrant/forest_warden) werden moderat gesenkt,
bleiben aber mit 23–32 g klar über goblin und sehr spielbar.

## Empfehlung — alt→neu `gold` (repräsentativ)

| id | lvl | s/Kill | `gold` alt | `gold` **neu** | g/h alt → **neu** |
|---|---:|---:|---:|---:|---|
| goblin | 1 | 1,30 | 5 | **7** | 13 846 → **19 385** |
| goblin_warlock | 14 | 1,72 | 32 | **11** | 67 066 → **23 023** |
| ash_tyrant | 20 | 3,24 | 60 | **23** | 66 711 → **25 556** |
| skeleton_icemage | 30 | 3,96 | 36 | **32** | 32 727 → **29 091** |
| forest_warden | 40 | 6,43 | 120 | **58** | 67 215 → **32 473** |
| roc_hunter | 50 | 7,56 | 80 | **78** | 38 095 → **37 143** |
| deep_kraken | 60 | 11,16 | 120 | **131** | 38 710 → **42 258** |
| roc_storm | 75 | 12,96 | 200 | **183** | 55 556 → **50 833** |
| aether_wraith | 98 | 8,95 | 200 | **169** | 80 411 → **67 978** |
| scale_skarn | 104 | 11,16 | 230 | **228** | 74 194 → **73 548** |
| last_idol | 120 | 43,29 | 800 | **1082** | 66 521 → **89 979** |

Ergebnis: gold/h steigt monoton **19,4k → 90,0k** = **4,6× Spread**. Echtes Farm-Spot-Meta; niedrige Mobs
bleiben mit ~19–25k g/h attraktiv (Convenience-Farm), Endgame-Mobs lohnen spürbar.

## Vollständige Apply-Liste (alle 58 Mobs)

Damit die Kurve über den **ganzen** Bestand glatt ist, hier alle Mobs nach Level. `gold` alt → **neu**.
Mobs ohne Änderung sind weggelassen markiert; content-dev setzt nur die **neu**-Spalte.

| id | lvl | maxHp | `gold` alt | `gold` **neu** |
|---|---:|---:|---:|---:|
| chicken | 1 | 12 | 1 | **7** |
| goblin | 1 | 30 | 5 | **7** |
| ash_rat | 2 | 22 | 3 | **7** |
| cow | 3 | 40 | 2 | **7** |
| goblin_shaman | 4 | 65 | 18 | **8** |
| dust_vulture | 5 | 38 | 6 | **8** |
| goblin_rogue | 5 | 38 | 9 | **8** |
| boar | 6 | 64 | 4 | **8** |
| goblin_spearman | 6 | 52 | 10 | **8** |
| goblin_archer | 7 | 46 | 12 | **8** |
| mire_crawler | 8 | 55 | 9 | **8** |
| mud_crab | 8 | 90 | 12 | **10** |
| rootling_grunt | 8 | 70 | 6 | **8** |
| goblin_crossbower | 9 | 60 | 16 | **8** |
| bull_boss | 10 | 220 | 30 | **25** |
| goblin_butcher | 10 | 90 | 18 | **10** |
| goblin_felmagician | 11 | 70 | 20 | **8** |
| forest_hare | 12 | 70 | 8 | **8** |
| goblin_stormcaller | 12 | 78 | 24 | **9** |
| rootling_gimp | 12 | 100 | 8 | **11** |
| goblin_warlock | 14 | 110 | 32 | **11** |
| pitch_beetle | 14 | 80 | 14 | **9** |
| rootling_gimp2 | 16 | 130 | 12 | **16** |
| skeleton_warrior | 16 | 120 | 14 | **15** |
| gray_wolf | 18 | 150 | 16 | **19** |
| skeleton_archer | 18 | 100 | 16 | **12** |
| ash_tyrant | 20 | 180 | 60 | **23** |
| reef_drowned | 20 | 180 | 28 | **23** |
| skeleton_spearman | 20 | 130 | 18 | **17** |
| thorn_wolf | 20 | 110 | 20 | **14** |
| moss_golem | 24 | 160 | 24 | **21** |
| skeleton_butcher | 24 | 200 | 26 | **27** |
| wild_stag | 26 | 240 | 26 | **33** |
| spectral_stag | 28 | 140 | 30 | **20** |
| skeleton_icemage | 30 | 220 | 36 | **32** |
| bramble_witch | 32 | 150 | 38 | **22** |
| rootling_treemonster | 32 | 380 | 60 | **56** |
| dire_wolf | 34 | 330 | 42 | **50** |
| roc | 35 | 300 | 50 | **46** |
| skeleton_pyroclasp | 36 | 280 | 48 | **44** |
| tide_siren | 38 | 320 | 55 | **51** |
| forest_warden | 40 | 360 | 120 | **58** |
| pit_spider | 42 | 200 | 44 | **34** |
| forest_bear | 45 | 520 | 80 | **91** |
| skeleton_nekro | 45 | 480 | 120 | **84** |
| slag_kobold | 46 | 220 | 60 | **39** |
| roc_hunter | 50 | 420 | 80 | **78** |
| ember_elemental | 52 | 240 | 70 | **46** |
| iron_revenant | 58 | 320 | 90 | **66** |
| deep_kraken | 60 | 620 | 120 | **131** |
| frost_hound | 62 | 300 | 95 | **65** |
| roc_elder | 65 | 560 | 130 | **126** |
| frost_hexer | 68 | 340 | 110 | **79** |
| roc_storm | 75 | 720 | 200 | **183** |
| idol_warden | 92 | 520 | 180 | **164** |
| aether_wraith | 98 | 480 | 200 | **169** |
| scale_skarn | 104 | 620 | 230 | **228** |
| last_idol | 120 | 1400 | 800 | **1082** |

**Hinweis zur Streuung innerhalb eines Levels:** Werte sind primär level-getrieben. Wo zwei Mobs auf
gleichem Level liegen, darf content-dev den tankigeren (höhere maxHp) leicht höher setzen (mehr
gold/Kill = identisches gold/h trotz langsamerer Kills) — die Tabelle oben tut das bereits über die
s/Kill-Skalierung. Floor: kein Mob unter `gold` 7.

---

# TEIL 1b — P2.6 **ITERATION 2** (Korrektur nach Melee-Retest)

**Status Iteration 1:** angewendet & vermessen → **zu schwach**. Quelle: `design/playtests/melee-bruiser-retest.md`,
Abschnitt „FIX 2". Gemessen wurde nur **2,1× realisiertes gold/h** (12,5k→26,4k) statt Ziel ~4,6×, und die
Kurve war **nicht monoton** (thorn_wolf 23,9k g/h > ash_tyrant 21,0k g/h, obwohl ash_tyrant höher/zäher).

## Warum Iteration 1 zu schwach war — das alte Kill-Zeit-Modell war falsch

Iteration 1 nahm `s/Kill ≈ 0,018·maxHp` an (Kill-Zeit ~proportional zur HP). Der Retest hat reale
`(mob.gold, kills/h)`-Paare geliefert; daraus folgt das **echte** `s/Kill = 3600 / kills_h`:

| Anker | maxHp | gemessen kills/h | **reale s/Kill** | s/Kill ÷ hp |
|---|---:|---:|---:|---:|
| goblin | 30 | 1471 | 2,45 | 0,082 |
| pitch_beetle | 80 | 1450 | 2,48 | 0,031 |
| goblin_butcher | 90 | 1484 | 2,43 | 0,027 |
| thorn_wolf | 110 | 1406 | 2,56 | 0,023 |
| spectral_stag | 140 | 721 | 4,99 | 0,036 |
| moss_golem | 160 | 776 | 4,64 | 0,029 |
| ash_tyrant | 180 | 751 | 4,79 | 0,027 |
| rootling_treemonster | 380 | 391 | 9,21 | 0,024 |

**Erkenntnis:** Es gibt einen **Kill-Zeit-Floor** (~2,45 s) für alle Mobs bis ~110 HP — der gegnerte Held
2-/3-shottet sie unabhängig von der HP, also ist `kills/h` dort **flach bei ~1450**, nicht ↓ mit HP. Ab
~140 HP knickt es scharf ab (kills/h halbiert sich auf ~750). Iter-1-`0,018·hp` hat den Floor ignoriert
und die Kompression im High-End **unterschätzt** → die gold/Kill-Spreizung wurde von der Kill-Raten-
Kompression aufgefressen. Genau wie der Min-Maxer beschreibt.

## Neu kalibriertes Kill-Zeit-Modell (an den 8 Retest-Ankern geeicht)

`s/Kill(hp) = max(2,45 ; 0,997 + 0,02186·hp)` — linearer Fit auf den hp≥110-Ankern, mit hartem Floor 2,45 s.
Reproduziert die Messung sauber (goblin 2,45→1469 kh, ash_tyrant 4,93→730 kh, root_treant 9,30→387 kh).
Für tankige Bosse (hohe Def/Regen/Resists) wird ein `boss_extra`-Faktor draufgelegt (bull_boss/forest_warden
×1,1; deep_kraken ×1,2; scale_skarn ×1,25; iron_revenant/skeleton_nekro/forest_bear ×1,15); `last_idol`
nutzt die direkt gemessene Boss-Kill-Zeit **43,3 s** (Def 60 + Regen 14 + all-resist).

## Neue Ziel-gold/h-Leiter

`target_gph(L) = 12 800 · (66 000/12 800)^((L−1)/119)` über **Level** (nicht maxHp). `gold/Kill =
target_gph · s/Kill / 3600`. Dadurch bekommen **High-HP-Mobs überproportional mehr gold/Kill** als in
Iter 1 — exakt die geforderte Kopplung „gold/Kill ↑ schneller, damit gold/h trotz weniger kills/h steigt".

**Monotonie-Regel (wichtig, Lehre aus dem Floor):** Wegen des flachen Low-End-Kill-Floors lässt sich
**keine** strikte Pro-Mob-Treppe im L1–9-Band erzwingen, ohne den Einstieg künstlich aufzublähen. Daher:
**streng monoton pro Level-Stufe** (die höchste g/h einer Levelstufe > die der vorigen), und **innerhalb
einer Levelstufe bekommt der zähere Mob (höhere maxHp) ≥ g/h** des schnelleren. Das **behebt die
thorn_wolf/ash_tyrant-Inversion direkt**: ash_tyrant (180 HP, 730 kh) → `gold` 54 → 39,4k g/h ≥ thorn_wolf
(110 HP, 1058 kh) → `gold` 37 → 39,2k g/h.

## Erwartung Retest

- **Realisiertes gold/h: 13,2k (L1) → 66,0k (L120) = 4,99× Spread** (Iter 1 maß 2,1×).
- **Streng monoton** über alle Level-Stufen; keine Inversion mehr (thorn_wolf ≤ ash_tyrant).
- Endgame verbessert sich gegenüber Iter 1 (idol_warden 47,8k→55,0k, aether_wraith 48,1k→55,8k,
  scale_skarn 45,1k→56,4k). **last_idol** war in Iter 1 der einzige On-Curve-Mob mit einem **Off-Ladder-
  Spike** (90k) — er wird auf den Treppen-Apex 66,0k zurückgeführt (`gold` 1082→**794**), bleibt aber
  klar der lukrativste Farm-Spot (>scale_skarn).
  - *Optional, falls der Chef einen deutlicheren Boss-Bonus will:* `last_idol` `gold` **869** → ~72k g/h
    (1,28× scale_skarn); Voll-Spread dann ~5,5×. Default-Empfehlung bleibt **794** für saubere ~5×.

## Vollständige alt(Iter1)→neu(Iter2)-Tabelle (alle 58 Mobs, nach Level)

`s/K` und `kills/h` = kalibriertes Modell (Retest-geeicht). `gold` = Feld `gold` im Mob-Objekt.
content-dev setzt **nur die fettgedruckte `gold` neu`-Spalte**. Die g/h-Spalte ist die Retest-Erwartung.

| id | lvl | maxHp | s/K | kills/h | `gold` alt | `gold` **neu** | gold/h alt → **neu** |
|---|---:|---:|---:|---:|---:|---:|---|
| chicken | 1 | 12 | 2.5 | 1469 | 7 | **9** | 10.286 -> **13.224** |
| goblin | 1 | 30 | 2.5 | 1469 | 7 | **9** | 10.286 -> **13.224** |
| ash_rat | 2 | 22 | 2.5 | 1469 | 7 | **10** | 10.286 -> **14.694** |
| cow | 3 | 40 | 2.5 | 1469 | 7 | **11** | 10.286 -> **16.163** |
| goblin_shaman | 4 | 65 | 2.5 | 1469 | 8 | **12** | 11.755 -> **17.633** |
| dust_vulture | 5 | 38 | 2.5 | 1469 | 8 | **13** | 11.755 -> **19.102** |
| goblin_rogue | 5 | 38 | 2.5 | 1469 | 8 | **14** | 11.755 -> **20.571** |
| goblin_spearman | 6 | 52 | 2.5 | 1469 | 8 | **15** | 11.755 -> **22.041** |
| boar | 6 | 64 | 2.5 | 1469 | 8 | **15** | 11.755 -> **22.041** |
| goblin_archer | 7 | 46 | 2.5 | 1469 | 8 | **16** | 11.755 -> **23.510** |
| mire_crawler | 8 | 55 | 2.5 | 1469 | 8 | **17** | 11.755 -> **24.980** |
| rootling_grunt | 8 | 70 | 2.5 | 1425 | 8 | **18** | 11.396 -> **25.641** |
| mud_crab | 8 | 90 | 3.0 | 1214 | 10 | **22** | 12.144 -> **26.717** |
| goblin_crossbower | 9 | 60 | 2.5 | 1469 | 8 | **19** | 11.755 -> **27.918** |
| goblin_butcher | 10 | 90 | 3.0 | 1214 | 10 | **24** | 12.144 -> **29.146** |
| bull_boss | 10 | 220 | 6.4 | 564 | 25 | **52** | 14.092 -> **29.310** |
| goblin_felmagician | 11 | 70 | 2.5 | 1425 | 8 | **21** | 11.396 -> **29.915** |
| forest_hare | 12 | 70 | 2.5 | 1425 | 8 | **22** | 11.396 -> **31.339** |
| goblin_stormcaller | 12 | 78 | 2.7 | 1332 | 9 | **24** | 11.991 -> **31.975** |
| rootling_gimp | 12 | 100 | 3.2 | 1131 | 11 | **29** | 12.441 -> **32.799** |
| pitch_beetle | 14 | 80 | 2.7 | 1311 | 9 | **26** | 11.800 -> **34.088** |
| goblin_warlock | 14 | 110 | 3.4 | 1058 | 11 | **33** | 11.642 -> **34.925** |
| skeleton_warrior | 16 | 120 | 3.6 | 994 | 15 | **36** | 14.916 -> **35.799** |
| rootling_gimp2 | 16 | 130 | 3.8 | 938 | 16 | **39** | 15.005 -> **36.574** |
| skeleton_archer | 18 | 100 | 3.2 | 1131 | 12 | **33** | 13.572 -> **37.323** |
| gray_wolf | 18 | 150 | 4.3 | 842 | 19 | **45** | 15.996 -> **37.886** |
| thorn_wolf | 20 | 110 | 3.4 | 1058 | 14 | **37** | 14.817 -> **39.158** |
| skeleton_spearman | 20 | 130 | 3.8 | 938 | 17 | **42** | 15.942 -> **39.387** |
| ash_tyrant | 20 | 180 | 4.9 | 730 | 23 | **54** | 16.789 -> **39.418** |
| reef_drowned | 20 | 180 | 4.9 | 730 | 23 | **54** | 16.789 -> **39.418** |
| moss_golem | 24 | 160 | 4.5 | 801 | 21 | **50** | 16.820 -> **40.048** |
| skeleton_butcher | 24 | 200 | 5.4 | 671 | 27 | **60** | 18.104 -> **40.231** |
| wild_stag | 26 | 240 | 6.2 | 577 | 33 | **71** | 19.028 -> **40.939** |
| spectral_stag | 28 | 140 | 4.1 | 887 | 20 | **47** | 17.745 -> **41.702** |
| skeleton_icemage | 30 | 220 | 5.8 | 620 | 32 | **68** | 19.841 -> **42.162** |
| bramble_witch | 32 | 150 | 4.3 | 842 | 22 | **51** | 18.522 -> **42.937** |
| rootling_treemonster | 32 | 380 | 9.3 | 387 | 56 | **111** | 21.669 -> **42.950** |
| dire_wolf | 34 | 330 | 8.2 | 438 | 50 | **99** | 21.922 -> **43.406** |
| roc | 35 | 300 | 7.6 | 477 | 46 | **93** | 21.919 -> **44.315** |
| skeleton_pyroclasp | 36 | 280 | 7.1 | 506 | 44 | **89** | 22.254 -> **45.014** |
| tide_siren | 38 | 320 | 8.0 | 450 | 51 | **101** | 22.972 -> **45.494** |
| forest_warden | 40 | 360 | 9.8 | 369 | 58 | **125** | 21.408 -> **46.138** |
| pit_spider | 42 | 200 | 5.4 | 671 | 34 | **70** | 22.798 -> **46.936** |
| skeleton_nekro | 45 | 480 | 13.2 | 272 | 84 | **174** | 22.886 -> **47.407** |
| forest_bear | 45 | 520 | 14.2 | 253 | 91 | **188** | 23.040 -> **47.599** |
| slag_kobold | 46 | 220 | 5.8 | 620 | 39 | **78** | 24.181 -> **48.362** |
| roc_hunter | 50 | 420 | 10.2 | 354 | 78 | **139** | 27.588 -> **49.164** |
| ember_elemental | 52 | 240 | 6.2 | 577 | 46 | **87** | 26.524 -> **50.165** |
| iron_revenant | 58 | 320 | 9.2 | 392 | 66 | **130** | 25.851 -> **50.919** |
| deep_kraken | 60 | 620 | 17.5 | 206 | 131 | **250** | 27.010 -> **51.546** |
| frost_hound | 62 | 300 | 7.6 | 477 | 65 | **110** | 30.973 -> **52.416** |
| roc_elder | 65 | 560 | 13.2 | 272 | 126 | **195** | 34.263 -> **53.027** |
| frost_hexer | 68 | 340 | 8.4 | 427 | 79 | **126** | 33.739 -> **53.812** |
| roc_storm | 75 | 720 | 16.7 | 215 | 183 | **253** | 39.364 -> **54.421** |
| idol_warden | 92 | 520 | 12.4 | 291 | 164 | **189** | 47.751 -> **55.030** |
| aether_wraith | 98 | 480 | 12.6 | 285 | 169 | **196** | 48.138 -> **55.828** |
| scale_skarn | 104 | 620 | 18.2 | 198 | 228 | **285** | 45.129 -> **56.412** |
| last_idol | 120 | 1400 | 43.3 | 83 | 1082 | **794** | 89.958 -> **66.014** |

**Ergebnis:** realisiertes gold/h **streng monoton 13,2k → 66,0k = 4,99× Spread**, Inversionen behoben,
Endgame > Iter 1. Der nächste Melee-Retest sollte diese ~5×-Treppe (Ziel ~4,6×, erreicht 5,0×) und die
Monotonie bestätigen.

## Apply-Liste Iteration 2 für content-dev (überschreibt Iter-1-`gold`-Werte)

Datei `packages/content/src/index.ts`, Objekt `monsters`, Feld `gold` pro Mob auf die **neu**-Spalte
oben setzen. Größte Hebel zuerst (zähe Mobs, die Iter 1 zu wenig bekamen):
`last_idol 1082→794`, `scale_skarn 228→285`, `deep_kraken 131→250`, `forest_bear 91→188`,
`skeleton_nekro 84→174`, `forest_warden 58→125`, `rootling_treemonster 56→111`, `dire_wolf 50→99`,
`roc_hunter 78→139`, `roc_storm 183→253`; danach den Rest der 58er-Tabelle der Reihe nach.
**Inversions-Fix konkret:** `thorn_wolf 14→37`, `ash_tyrant 23→54` (ash bleibt jetzt ≥ thorn in g/h).

> Die Iter-1-Tabelle in **TEIL 1** ist damit **überholt**; Iter-2-Werte oben gelten. `pnpm test`-Retest
> nach Apply: Combat-g/h-Spread sollte sich von 2,1× auf ~5× öffnen, streng monoton, ash_tyrant ≥ thorn_wolf.

---

# TEIL 2 — P2.4: Thieving-Leiter nicht monoton

## Befund — aktuelle Leiter (Messung aus `merchant.md`, @ `levelRequired+5`)

| id | lvlReq | Erfolg% | direkt g/h | Loot g/h | **TOTAL g/h** | |
|---|---:|---:|---:|---:|---:|:--|
| pickpocket_beggar | 1 | 66 | 3 009 | 3 842 | **6 851** | |
| pickpocket_drunkard | 5 | 64 | 4 691 | 4 752 | **9 443** | |
| pickpocket_merchant | 12 | 61 | 7 234 | 5 452 | **12 686** | |
| loot_market_stall | 20 | 58 | 8 327 | 2 462 | **10 789** | ⬇ < merchant |
| pickpocket_tax_collector | 28 | 56 | 16 296 | 6 598 | **22 894** | |
| burgle_warehouse | 36 | 55 | 16 359 | 4 031 | **20 390** | ⬇ < tax_collector |
| pickpocket_city_guard | 45 | 48 | 22 779 | 1 185 | **23 964** | |
| crack_strongbox | 55 | 51 | 40 675 | 3 770 | **44 445** | |
| pickpocket_noble | 65 | 46 | 29 859 | 5 060 | **34 919** | ⬇ < strongbox |
| rob_cultist_shrine | 75 | 48 | 43 919 | 3 808 | **47 727** | |
| raid_tax_vault | 85 | 46 | 70 090 | 6 744 | **76 834** | |
| loot_reliquary | 95 | 46 | 60 681 | 5 220 | **65 901** | ⬇ < tax_vault |
| plunder_ashen_treasury | 105 | 45 | 98 170 | 9 610 | **107 780** | |
| heist_idol_hoard | 115 | 41 | 150 131 | 14 880 | **165 011** | |

**Problem:** Vier höhere Stufen sind ein gold/h-**Downgrade** ggü. der vorigen (market_stall, warehouse,
noble, reliquary). Optimierer überspringen sie → toter Content.

## Empfehlung — minimal-invasiv, nur Direkt-Gold anheben

Direkt-g/h ist proportional zum mittleren `gold`-Wert (`(min+max)/2`); Erfolgschance/Dauer/Loot bleiben
unverändert. Ziel: jede gehobene Stufe **strikt > vorige** (Faktor ~1,07 über Vorgänger). Achtung —
das Anheben von `burgle_warehouse` würde `pickpocket_city_guard` überholen, daher wird city_guard
ebenfalls minimal angehoben (Kaskaden-Korrektur). **5 Stufen ändern sich, der Rest bleibt unangetastet.**

| id | lvlReq | `gold` alt | `gold` **neu** | TOTAL g/h alt → **neu** |
|---|---:|---:|---:|---|
| loot_market_stall | 20 | `{ min: 14, max: 32 }` | **`{ min: 19, max: 43 }`** | 10 789 → **13 685** |
| burgle_warehouse | 36 | `{ min: 40, max: 90 }` | **`{ min: 50, max: 113 }`** | 20 390 → **24 543** |
| pickpocket_city_guard | 45 | `{ min: 60, max: 120 }` | **`{ min: 66, max: 132 }`** | 23 964 → **26 242** |
| pickpocket_noble | 65 | `{ min: 90, max: 180 }` | **`{ min: 128, max: 256 }`** | 34 919 → **47 526** |
| loot_reliquary | 95 | `{ min: 260, max: 520 }` | **`{ min: 330, max: 660 }`** | 65 901 → **82 238** |

Alle übrigen Thieving-Stufen (beggar, drunkard, merchant, tax_collector, strongbox, cultist_shrine,
tax_vault, ashen_treasury, idol_hoard) **bleiben unverändert**.

### Verifikation — Leiter nach Fix (strikt monoton)

| id | lvlReq | TOTAL g/h alt | **TOTAL g/h neu** |
|---|---:|---:|---:|
| pickpocket_beggar | 1 | 6 851 | 6 851 |
| pickpocket_drunkard | 5 | 9 443 | 9 443 |
| pickpocket_merchant | 12 | 12 686 | 12 686 |
| loot_market_stall | 20 | 10 789 | **13 685** ↑ |
| pickpocket_tax_collector | 28 | 22 894 | 22 894 |
| burgle_warehouse | 36 | 20 390 | **24 543** ↑ |
| pickpocket_city_guard | 45 | 23 964 | **26 242** ↑ |
| crack_strongbox | 55 | 44 445 | 44 445 |
| pickpocket_noble | 65 | 34 919 | **47 526** ↑ |
| rob_cultist_shrine | 75 | 47 727 | 47 727 |
| raid_tax_vault | 85 | 76 834 | 76 834 |
| loot_reliquary | 95 | 65 901 | **82 238** ↑ |
| plunder_ashen_treasury | 105 | 107 780 | 107 780 |
| heist_idol_hoard | 115 | 165 011 | 165 011 |

→ **Streng monoton steigend** über die gesamte Leiter. Keine Downgrades mehr.

---

# Geordnete Apply-Liste für content-dev

**P2.6 (Combat-Gold), Datei `packages/content/src/index.ts`, Objekt `monsters`** — Feld `gold` pro Mob
auf den **neu**-Wert der Vollständig-Tabelle (Teil 1) setzen. Prioritär die größten Ausreißer:
goblin_warlock 32→11, ash_tyrant 60→23, forest_warden 120→58, goblin_felmagician 20→8,
last_idol 800→1082; danach den Rest der 58er-Tabelle der Reihe nach.

**P2.4 (Thieving), gleiche Datei, Thieving-Aktionen** — nur diese 5 `gold`-Ranges ändern:
1. `loot_market_stall` → `{ min: 19, max: 43 }`
2. `burgle_warehouse` → `{ min: 50, max: 113 }`
3. `pickpocket_city_guard` → `{ min: 66, max: 132 }`
4. `pickpocket_noble` → `{ min: 128, max: 256 }`
5. `loot_reliquary` → `{ min: 330, max: 660 }`

Nach dem Apply: `pnpm test` laufen lassen und den Sim-Block gegen diese Spec gegenprüfen
(Combat-g/h-Spread sollte sich ~1,6× → ~4,5× öffnen; Thieving-Leiter monoton).
