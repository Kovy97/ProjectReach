# Task #232 — XP-Ökonomie-Retune (Spec)

**Autor:** Balance-Designer · **Datum:** 2026-07-05 · **Status:** Spec fertig, wartet auf content-dev-Umsetzung
**Scope:** die 12 Nicht-Kampf-Skills (woodcutting, mining, fishing, cooking, smithing, fletching, foraging, herblore, jewelcrafting, leatherworking, runecrafting, thieving). Kampf-XP separat (siehe §7).
**Geändert wird NUR** `content.actions[*].xp` in `packages/content/src/index.ts`. **`xpForLevel` (engine/leveling.ts) bleibt unangetastet** (Save-Sicherheit, §8).

---

## 0. TL;DR — Kern-Entscheidungen

1. **Ursache Befund #1 (flaches/nicht-monotones Low-Band):** die XP-pro-Aktion wurde historisch von Hand gesetzt → über `round()` bei kleinen Zahlen entstehen flache Stufen (2,2,3,3) und echte Inversionen (spätere Aktion < frühere). Fix: XP-pro-Aktion **rein aus einer Level-Kurve** ableiten.
2. **Ursache Befund #2 (utopische Zeit bis 99):** die aktuelle XP/h liegt praktisch auf der Studio-Referenzkurve `90·sqrt(Δ)` → **~245 h/Skill** bis 99. Genau die "hunderte Stunden". Die Level-Total-Kurve (`xpForLevel`, 13,03 Mio bis 99) ist NICHT das Problem — die **XP/h ist zu niedrig**.
3. **Lösung:** gleiche Kurvenform behalten, **Konstante von 90 auf 600 anheben** → XP/h ×~6,7. Das verkürzt die Zeit bis 99 auf **~40-47 h/Skill** (Ø 43 h) UND macht das Low/Mid-Band lohnend — beide Befunde mit **einem** Hebel.
4. **Formel:** `xp = max(1, round( 600·sqrt(step(levelRequired)) · durationMs / 3.600.000 ))`, danach ein billiger Monotonie-Repair (§3.3). Ergebnis: streng monoton pro Skill, keine Ausreißer.
5. **Alle 496 Aktionen** bekommen einen neuen `xp`-Wert (Tabellen §9). Save-sicher, weil nur XP-Erträge, nicht die Level-Schwellen, sich ändern.

---

## 1. Befund (Chef)

- **#1 XP-pro-Aktion viel zu flach im Low-Band, teils nicht monoton.** Bsp: Jewelcrafting Cut Garnet (L1)=2xp, Cut Sapphire (L15)=3xp; Woodcutting L1=2 → L38=9. Steile Skalierung kickt erst ~L45-55. Fühlt sich wie Bestrafung an.
- **#2 Gesamt-Zeit bis 99 utopisch** — "hunderte Stunden pro Skill".

## 2. Diagnose (mit Zahlen)

**Level-Kurve (unverändert):** `xpForLevel(L)` (RS/Melvor-Stil, `floor(n+300·2^(n/7))/4`, akkumuliert). Gesamt-XP bis 99 = **13.034.431**.

| L | total XP | Δ(L→L+1) | Anteil an 13,03 Mio |
|---|---|---|---|
| 10 | 1.154 | 204 | 0.01% |
| 30 | 13.363 | 1470 | 0.10% |
| 50 | 101.333 | 10612 | 0.78% |
| 70 | 737.627 | 76818 | 5.7% |
| 85 | 3.258.594 | 339198 | 25.0% |
| 99 | 13.034.431 | — | 100% |

**Erkenntnis A — das Low-Band ist winzig.** Bis L50 sind nur 0.8% der Gesamt-XP nötig. Das "flache Low-Band" ist reines **Feel/Rundungs**-Problem (bei xp=2..9 sieht man kaum Wachstum, und `round()` erzeugt Inversionen), NICHT der Zeittreiber.

**Erkenntnis B — die Zeit bis 99 lebt im Top-Band.** 75% aller XP liegen zwischen L85 und L99. Zeit bis 99 ≈ (Top-XP) / (XP/h der besten Aktion). Der einzige echte Hebel ist **XP/h**.

**Erkenntnis C — die aktuelle XP/h sitzt ~auf `90·sqrt(Δ)`.** Deshalb aktuelle Zeit bis 99 ≈ 188-254 h/Skill (Ø ~232 h) — das sind die "hunderte Stunden".

## 3. Ziel-Modell

### 3.1 Ziel-XP/h-Kurve
```
step(L)        = xpForLevel(L+1) − xpForLevel(L)          für L ≤ 98
step(99)       = round( step(98) · 2^(1/7) )  = 1.356.733   (Extrapolation, da Δ(99)=0)
target_xph(L)  = C · sqrt( step(L) )
```
Die Form (`sqrt(Δ)`) ist die vom Studio vorgegebene Referenz. Sie ist **streng monoton steigend** (Δ steigt monoton), wächst über den **ganzen** Bereich, und hat die schöne Eigenschaft *Zeit-pro-Level = sqrt(Δ)/C* — höhere Level dauern länger (Achievement-Gefühl), aber die XP/h explodiert nie ins Bestrafende.

### 3.2 XP-pro-Aktion
```
xp = max( 1, round( target_xph(levelRequired) · durationMs / 3.600.000 ) )
```
Jede Aktion trifft damit **per Konstruktion** die Ziel-XP/h an ihrem eigenen Level. Höheres Level ⇒ höhere target_xph ⇒ höhere XP/h, unabhängig von der Dauer ⇒ Monotonie fällt praktisch gratis ab.

### 3.3 Monotonie-Repair (Rundungs-Nachbehandlung)
Bei sehr kleinen xp (L1-L3) kann `round()` minimale Inversionen erzeugen (max −14% zwischen zwei L1/L2-Aktionen). Regel, die content-dev NICHT selbst rechnen muss (die Tabellen in §9 sind bereits repariert):
> Sortiere je Skill nach Level. Für jede Aktion muss `xp/h ≥` dem Maximum aller Aktionen **echt niedrigeren** Levels sein. Falls darunter: `xp` um +1 erhöhen, bis erfüllt.

Kosten: nur **24 von 496** Aktionen bekommen +1 xp gegenüber der reinen Formel. Danach: **streng monoton in jedem Skill**.

### 3.4 Gewählte Konstante & Zeitbudget
**C = 600.** Ideal-Zeit bis 99 = SumSqrt/C = 38 h; realistisch (beste je freigeschaltete Aktion, ungeared/roh) **40-47 h/Skill, Ø ~43 h**. Das liegt mittig im vom Chef vorgeschlagenen Band 20-60 h.

**Begründung des Bands:** Idle-RPG-Spieler erwarten pro Skill spürbaren Grind, aber "alles auf 99" soll ein Langzeit-, kein Lebenszeitziel sein. 12 Skills × ~43 h = ~510 h reines Skilling bis "alles 99" — plus Kampf ein gesunder Endgame-Umfang, ohne utopisch zu sein (vorher ~2.800 h → jetzt ~510 h, ×5,4 schneller). Idle-Offline-Progress macht die reale Wanduhr-Zeit zusätzlich kürzer.

**Chef-Stellschraube — C justiert das Band linear:**

| C | Ideal h/Skill | realistisch Ø | min–max | Charakter |
|---|---|---|---|---|
| 450 | 51 | 58 | 54–63 | entspanntester Grind |
| 500 | 46 | 52 | 48–56 |  |
| 550 | 41 | 47 | 44–51 |  |
| 600 ← **gewählt** | 38 | 43 | 40–47 | ausgewogen |
| 700 | 33 | 37 | 34–40 |  |
| 800 | 28 | 32 | 30–35 | am schnellsten |

> Umkalibrieren ist trivial: gleiche Formel, nur C tauschen, alle Tabellen neu erzeugen. Kein Save-Impact.

## 4. Referenz — target_xph(L) bei C=600

| L | target_xph | | L | target_xph |
|---|---|---|---|---|
| 1 | 5.466/h | | 50 | 61.809/h |
| 5 | 6.681/h | | 55 | 79.155/h |
| 10 | 8.570/h | | 60 | 101.373/h |
| 15 | 10.982/h | | 65 | 129.836/h |
| 20 | 14.046/h | | 70 | 166.296/h |
| 25 | 17.980/h | | 75 | 212.997/h |
| 30 | 23.004/h | | 80 | 272.819/h |
| 35 | 29.449/h | | 85 | 349.444/h |
| 40 | 37.695/h | | 90 | 447.593/h |
| 45 | 48.266/h | | 95 | 573.312/h |
| 48 | 55.987/h | | 99 | 698.873/h |

## 5. Zeit bis 99 — je Skill vorher/nachher

| Skill | #Akt | Top-Lvl | vorher | nachher |
|---|---|---|---|---|
| cooking | 43 | 97 | 224 h | **41 h** |
| fishing | 17 | 97 | 212 h | **44 h** |
| fletching | 19 | 95 | 254 h | **45 h** |
| foraging | 33 | 97 | 240 h | **40 h** |
| herblore | 43 | 99 | 248 h | **41 h** |
| jewelcrafting | 36 | 99 | 246 h | **42 h** |
| leatherworking | 125 | 99 | 239 h | **41 h** |
| mining | 21 | 95 | 210 h | **44 h** |
| runecrafting | 54 | 88 | 248 h | **45 h** |
| smithing | 66 | 95 | 188 h | **45 h** |
| thieving | 23 | 99 | 234 h | **47 h** |
| woodcutting | 16 | 99 | 244 h | **45 h** |
| **Σ 12 Skills** | 496 | — | **2787 h** | **519 h** |

> Die Formel egalisiert die Skills fast von selbst (40-47 h), weil jede Top-Aktion die Ziel-XP/h ihres Levels trifft. runecrafting (Top nur L88) läuft minimal länger, weil L88-99 auf der L88-Aktion gegrindet wird — **Content-Hinweis, kein Zahlenfehler** (§7).

## 6. Bestätigung Befund-Fixes

- **Monoton:** nach Repair (§3.3) in **allen 12 Skills** streng monoton (xp/h steigt nie zwischen Leveln). Bsp Jewelcrafting: Garnet L1 **4** → Sapphire L15 **9** → Ruby L34 **27** → Diamond L55 **99** → Onyx L70 **254**. Kein "L15 < L1" mehr.
- **Low/Mid-Band lohnend:** Woodcutting L1 **2→4**, L20 **6→18**, L38 **9→50**, L45 **14→74** — durchgehendes, spürbares Wachstum ab L1 statt Sprung erst ab L45. Low-Band-XP/h ~5.500/h (L1) → ~11.000/h (L15) → ~62.000/h (L50).
- **Keine Ausreißer:** alle xp aus einer Formel; die früheren Handwerte (mit Sprüngen/Dellen) sind weg.

## 7. Kampf & Content-Hinweise (außerhalb dieses Specs)

- **Kampf-XP** (attack/strength/defence/ranged/magic/hitpoints) kommt aus Monster-Kills, nicht aus `content.actions` — **nicht Teil dieses Retunes**, gehört zu combat-dev. Der Sim-Kampfblock (`pnpm test`) ist im geared-Baseline sauber (alle gelisteten Monster kills>0, deaths=0). Nicht anfassen.
- **runecrafting Top-Aktion = L88**, fishing/mining/smithing/fletching Top = L95. Für exakt gleiche Zeit bis 99 wie L99-Skills bräuchten diese 1-2 höhere Aktionen (L90-99). Optional, **Content-Aufgabe**, nicht dieser XP-Retune. Der Zeitunterschied ist mit C=600 klein (max 47 vs 40 h).
- Der Sim meldet separat Kampf-Walls (goblin_stormcaller etc.) und 2 Aktionen ohne Output (pickpocket_city_guard, crack_strongbox) — **eigene Tickets**, nicht XP-Ökonomie.

## 8. Save-Sicherheit

Diese Spec ändert **ausschließlich `xp`-Erträge pro Aktion**. `xpForLevel` / die Level-Schwellen bleiben identisch ⇒ **kein Save remappt** auf ein anderes Level, keine Migration, kein SAVE_VERSION-Bump nötig. Bestehende Spieler behalten Level & gesammelte XP; nur künftige Aktionen geben mehr XP (rein positiv, kein Nerf).

**Optionaler Chef-Entscheid (NICHT Default):** Wer die Level-*Kurve* selbst als zu steil empfindet (Top-Band = 88% der XP), müsste `xpForLevel` abflachen — das **remappt bestehende Saves auf andere Level (Save-Bruch, Migration nötig)**. Bewusst NICHT gewählt: das Zeitproblem ist über XP/h vollständig gelöst, ohne Saves anzufassen.

## 9. Apply-Liste für content-dev

**Vorgehen:** In `packages/content/src/index.ts` → `actions` für jede unten gelistete id das Feld `xp` auf den **REC-xp**-Wert setzen. `durationMs`, `levelRequired`, `loot`, `inputs` **unverändert lassen**. Reihenfolge egal (jede Zeile ist unabhängig). Danach `pnpm test` (Turbo-Cache ggf. leeren, siehe MEMORY).

Reihenfolge-Empfehlung (größter Feel-Impact zuerst): woodcutting → jewelcrafting → mining → fishing → cooking → smithing → fletching → foraging → herblore → leatherworking → runecrafting → thieving.

Legende: `cur xp/h` und `rec xp/h` sind nur Kontrolle (Basis-Dauer, ungear). **Anzuwenden ist die fette REC-xp-Spalte.**

### cooking — 43 Aktionen · Zeit bis 99 224 h → **41 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| cook_shrimp | 1 | 2500 | 1 | 1440 | **4** | 5760 |
| cook_ashroot_broth | 1 | 3500 | 1 | 1029 | **5** | 5143 |
| cook_chicken | 2 | 3000 | 2 | 2400 | **5** | 6000 |
| cook_grimwheat_porridge | 3 | 4000 | 2 | 1800 | **7** | 6300 |
| cook_murk_perch | 5 | 2500 | 2 | 2880 | **5** | 7200 |
| cook_beef | 5 | 3500 | 2 | 2057 | **7** | 7200 |
| cook_bog_fowl | 7 | 3000 | 2 | 2400 | **6** | 7200 |
| cook_boar_loin | 8 | 3200 | 2 | 2250 | **7** | 7875 |
| cook_honey_cake | 9 | 4000 | 2 | 1800 | **9** | 8100 |
| cook_trout | 10 | 3000 | 2 | 2400 | **7** | 8400 |
| cook_hare | 14 | 3200 | 2 | 2250 | **9** | 10125 |
| cook_cod | 15 | 3500 | 3 | 3086 | **11** | 11314 |
| cook_marshroot_chowder | 18 | 14000 | 7 | 1800 | **49** | 12600 |
| cook_ghostfin_pike | 20 | 3500 | 3 | 3086 | **14** | 14400 |
| cook_wolf_haunch | 22 | 4000 | 4 | 3600 | **17** | 15300 |
| cook_shadowcarp | 25 | 3750 | 4 | 3840 | **19** | 18240 |
| cook_venison | 28 | 4500 | 5 | 4000 | **26** | 20800 |
| cook_ironscale_bass | 30 | 4000 | 5 | 4500 | **26** | 23400 |
| cook_salmon | 35 | 4500 | 7 | 5600 | **37** | 29600 |
| cook_bloodgrain_stew | 38 | 16000 | 23 | 5175 | **152** | 34200 |
| cook_roc_drumstick | 40 | 5500 | 9 | 5891 | **58** | 37964 |
| cook_duskfin_carp | 45 | 5000 | 14 | 10080 | **67** | 48240 |
| cook_bear_shank | 48 | 6000 | 17 | 10200 | **93** | 55800 |
| cook_duskfin_rangers_stew | 48 | 10000 | 23 | 8280 | **156** | 56160 |
| cook_gallows_preserve | 50 | 13000 | 34 | 9415 | **223** | 61754 |
| cook_spellwarden_bisque | 52 | 10000 | 28 | 10080 | **190** | 68400 |
| cook_lobster | 55 | 6000 | 25 | 15000 | **132** | 79200 |
| cook_soulgourd_brisket | 58 | 18000 | 76 | 15200 | **459** | 91800 |
| cook_crypteel | 60 | 6600 | 39 | 21273 | **186** | 101455 |
| cook_bloodfang_eel | 63 | 7000 | 47 | 24171 | **229** | 117771 |
| cook_steelshot_bisque | 63 | 14000 | 69 | 17743 | **457** | 117514 |
| cook_spellflare_tisane | 65 | 14000 | 76 | 19543 | **505** | 129857 |
| cook_anglerfish | 70 | 8000 | 71 | 31950 | **370** | 166500 |
| cook_wyvern_haunch | 72 | 8500 | 76 | 32188 | **434** | 183812 |
| cook_witherleek_bouillabaisse | 75 | 20000 | 177 | 31860 | **1183** | 212940 |
| cook_witherleek_sharpshooters_pie | 76 | 20000 | 195 | 35100 | **1243** | 223740 |
| cook_witherleek_arcane_broth | 77 | 20000 | 215 | 38700 | **1306** | 235080 |
| cook_wraithscale | 78 | 8500 | 119 | 50400 | **583** | 246918 |
| cook_voidray | 85 | 9500 | 175 | 66316 | **922** | 349389 |
| cook_starcap_risotto | 90 | 15000 | 280 | 67200 | **1865** | 447600 |
| cook_ambergrain_feast | 90 | 22000 | 410 | 67091 | **2735** | 447545 |
| cook_abyssal_crawler | 92 | 10500 | 265 | 90857 | **1441** | 494057 |
| cook_soulfish | 97 | 11500 | 368 | 115200 | **2022** | 632974 |

### fishing — 17 Aktionen · Zeit bis 99 212 h → **44 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| catch_shrimp | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| catch_murk_perch | 5 | 3500 | 3 | 3086 | **6** | 6171 |
| catch_trout | 10 | 4000 | 4 | 3600 | **10** | 9000 |
| catch_cod | 15 | 5000 | 7 | 5040 | **15** | 10800 |
| catch_ghostfin_pike | 20 | 5500 | 10 | 6545 | **21** | 13745 |
| catch_shadowcarp | 25 | 5750 | 13 | 8139 | **29** | 18157 |
| catch_ironscale_bass | 30 | 6000 | 17 | 10200 | **38** | 22800 |
| catch_salmon | 35 | 6500 | 24 | 13292 | **53** | 29354 |
| catch_duskfin_carp | 45 | 7000 | 32 | 16457 | **94** | 48343 |
| catch_lobster | 55 | 8000 | 42 | 18900 | **176** | 79200 |
| catch_crypteel | 60 | 8300 | 48 | 20819 | **234** | 101494 |
| catch_bloodfang_eel | 63 | 8500 | 57 | 24141 | **278** | 117741 |
| catch_anglerfish | 70 | 9000 | 80 | 32000 | **416** | 166400 |
| catch_wraithscale | 78 | 9500 | 134 | 50779 | **652** | 247074 |
| catch_voidray | 85 | 10500 | 195 | 66857 | **1019** | 349371 |
| catch_abyssal_crawler | 92 | 11500 | 293 | 91722 | **1579** | 494296 |
| catch_soulfish | 97 | 12500 | 404 | 116352 | **2198** | 633024 |

### fletching — 19 Aktionen · Zeit bis 99 254 h → **45 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| fletch_shafts | 1 | 2000 | 1 | 1800 | **3** | 5400 |
| fletch_bowstring | 1 | 2500 | 1 | 1440 | **4** | 5760 |
| fletch_crude_arrows | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| fletch_copper_arrows | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| fletch_bronze_arrows | 5 | 3000 | 3 | 3600 | **6** | 7200 |
| fletch_arrows | 10 | 3500 | 4 | 4114 | **8** | 8229 |
| fletch_willowbark_shield | 15 | 5500 | 4 | 2618 | **17** | 11127 |
| fletch_steel_arrows | 20 | 4000 | 5 | 4500 | **16** | 14400 |
| fletch_grimwood_shield | 25 | 7000 | 9 | 4629 | **35** | 18000 |
| fletch_blacksteel_arrows | 30 | 5000 | 7 | 5040 | **32** | 23040 |
| fletch_mithril_arrows | 40 | 6000 | 10 | 6000 | **63** | 37800 |
| fletch_adamantium_arrows | 50 | 7000 | 19 | 9771 | **120** | 61714 |
| fletch_runite_arrows | 60 | 8000 | 36 | 16200 | **225** | 101250 |
| fletch_ashfen_buckler | 63 | 14000 | 80 | 20571 | **457** | 117514 |
| fletch_bloodiron_arrows | 70 | 9000 | 62 | 24800 | **416** | 166400 |
| fletch_titanium_arrows | 80 | 9500 | 110 | 41684 | **720** | 272842 |
| fletch_aetherium_arrows | 90 | 10500 | 195 | 66857 | **1305** | 447429 |
| fletch_voidwood_pavise | 92 | 22000 | 870 | 142364 | **3020** | 494182 |
| fletch_godiron_arrows | 95 | 12000 | 365 | 109500 | **1911** | 573300 |

### foraging — 33 Aktionen · Zeit bis 99 240 h → **40 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| forage_dim_essence | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| forage_marshroot | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| forage_ashfields | 1 | 3200 | 2 | 2250 | **5** | 5625 |
| forage_feathers | 5 | 4200 | 3 | 2571 | **8** | 6857 |
| forage_sootcaps | 6 | 3400 | 3 | 3176 | **7** | 7412 |
| forage_wildhives | 9 | 3600 | 3 | 3000 | **8** | 8000 |
| forage_ash_essence | 12 | 3800 | 4 | 3789 | **10** | 9474 |
| forage_deepwood | 15 | 5000 | 6 | 4320 | **15** | 10800 |
| forage_umber_pods | 18 | 4200 | 5 | 4286 | **15** | 12857 |
| forage_bloodthistle | 22 | 4600 | 6 | 4696 | **20** | 15652 |
| forage_blightmarsh | 25 | 4800 | 7 | 5250 | **24** | 18000 |
| forage_palefungus | 27 | 5000 | 8 | 5760 | **28** | 20160 |
| forage_mire_essence | 33 | 5400 | 9 | 6000 | **40** | 26667 |
| forage_umber_thickets | 38 | 5600 | 11 | 7071 | **53** | 34071 |
| forage_cinderwood | 40 | 5400 | 11 | 7333 | **57** | 38000 |
| forage_gravemoss | 42 | 5800 | 10 | 6207 | **67** | 41586 |
| forage_gravefungus | 47 | 6000 | 13 | 7800 | **89** | 53400 |
| forage_witchlights | 50 | 6200 | 16 | 9290 | **106** | 61548 |
| forage_grave_essence | 53 | 6300 | 19 | 10857 | **125** | 71429 |
| forage_frostmire | 55 | 6200 | 26 | 15097 | **136** | 78968 |
| forage_verdant_blooms | 58 | 6600 | 25 | 13636 | **168** | 91636 |
| forage_nightbloom | 62 | 6800 | 32 | 16941 | **211** | 111706 |
| forage_voidfungus | 67 | 7100 | 42 | 21296 | **283** | 143493 |
| forage_gloomfen | 70 | 7000 | 62 | 31886 | **323** | 166114 |
| forage_void_essence | 73 | 7400 | 59 | 28703 | **397** | 193135 |
| forage_violet_petals | 78 | 7700 | 79 | 36935 | **529** | 247325 |
| forage_godsbreath | 82 | 7900 | 99 | 45114 | **661** | 301215 |
| forage_voidheath | 85 | 7800 | 145 | 66923 | **757** | 349385 |
| forage_godfungus | 87 | 8200 | 132 | 57951 | **879** | 385902 |
| forage_starcaps | 90 | 8400 | 158 | 67714 | **1044** | 447429 |
| forage_divine_essence | 93 | 8600 | 186 | 77860 | **1240** | 519070 |
| forage_gravewood | 95 | 8800 | 270 | 110455 | **1401** | 573136 |
| forage_radiant_blooms | 97 | 8900 | 235 | 95056 | **1565** | 633034 |

### herblore — 43 Aktionen · Zeit bis 99 248 h → **41 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| brew_minor_healing | 1 | 3500 | 2 | 2057 | **5** | 5143 |
| brew_minor_heal | 1 | 3500 | 1 | 1029 | **5** | 5143 |
| brew_forager_tonic_i | 3 | 4000 | 2 | 1800 | **7** | 6300 |
| brew_oxblood_tonic | 5 | 4500 | 2 | 1600 | **8** | 6400 |
| brew_antivenom | 8 | 5000 | 3 | 2160 | **11** | 7920 |
| brew_antidote | 8 | 5000 | 2 | 1440 | **11** | 7920 |
| brew_rot_ward_tonic | 8 | 5000 | 2 | 1440 | **11** | 7920 |
| brew_lesser_heal | 12 | 5500 | 3 | 1964 | **14** | 9164 |
| brew_greater_healing | 16 | 6000 | 3 | 1800 | **19** | 11400 |
| brew_stoneskin_tonic | 16 | 6000 | 3 | 1800 | **19** | 11400 |
| brew_heal | 21 | 6500 | 4 | 2215 | **27** | 14954 |
| brew_salve_of_mending | 25 | 6000 | 6 | 3600 | **30** | 18000 |
| brew_keeneye_tonic | 26 | 7000 | 6 | 3086 | **37** | 19029 |
| brew_mandrake_tincture | 30 | 9500 | 16 | 6063 | **61** | 23116 |
| brew_forager_tonic_ii | 32 | 7500 | 8 | 3840 | **53** | 25440 |
| brew_nightshade_extract | 35 | 8500 | 11 | 4659 | **70** | 29647 |
| brew_bloodrage_tonic | 38 | 8000 | 11 | 4950 | **76** | 34200 |
| brew_emberleaf_tonic | 40 | 8500 | 13 | 5506 | **89** | 37694 |
| brew_bulwark_tonic | 40 | 8600 | 14 | 5860 | **90** | 37674 |
| brew_greater_heal | 41 | 9000 | 15 | 6000 | **99** | 39600 |
| brew_greater_antidote | 46 | 9500 | 20 | 7579 | **134** | 50779 |
| brew_bounty_tonic | 48 | 9800 | 23 | 8449 | **152** | 55837 |
| brew_witchlight_tonic | 50 | 10000 | 26 | 9360 | **172** | 61920 |
| brew_arcane_surge | 52 | 10000 | 28 | 10080 | **190** | 68400 |
| brew_bloodmend_draught | 55 | 8000 | 34 | 15300 | **176** | 79200 |
| brew_duskcap_tonic | 56 | 10500 | 36 | 12343 | **243** | 83314 |
| brew_harvest_tonic | 58 | 11000 | 42 | 13745 | **281** | 91964 |
| brew_potent_heal | 61 | 12000 | 53 | 15900 | **355** | 106500 |
| brew_gravensap_salve | 62 | 12000 | 55 | 16500 | **373** | 111900 |
| brew_emberroot_tonic | 65 | 12000 | 65 | 19500 | **433** | 129900 |
| brew_ironbark_tonic | 66 | 12500 | 71 | 20448 | **474** | 136512 |
| brew_gloomspore_tincture | 70 | 13500 | 90 | 24000 | **624** | 166400 |
| brew_corpse_lily_salve | 70 | 15000 | 130 | 31200 | **693** | 166320 |
| brew_warding_elixir | 72 | 13000 | 99 | 27415 | **663** | 183600 |
| brew_warpath_tonic | 78 | 14000 | 144 | 37029 | **961** | 247114 |
| brew_elixir_renewal | 81 | 15000 | 179 | 42960 | **1194** | 286560 |
| brew_revenant_elixir | 85 | 11000 | 205 | 67091 | **1068** | 349527 |
| brew_godharvest_tonic | 86 | 16000 | 245 | 55125 | **1632** | 367200 |
| brew_apex_tonic | 90 | 17000 | 317 | 67129 | **2114** | 447671 |
| brew_panacea_elixir | 94 | 18000 | 409 | 81800 | **2728** | 545600 |
| brew_grave_lily_elixir | 94 | 18000 | 409 | 81800 | **2728** | 545600 |
| brew_godbloom_infusion | 95 | 19000 | 535 | 101368 | **3026** | 573347 |
| brew_godsbreath_elixir | 99 | 20000 | 582 | 104760 | **3883** | 698940 |

### jewelcrafting — 36 Aktionen · Zeit bis 99 246 h → **42 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| cut_garnet | 1 | 2500 | 2 | 2880 | **4** | 5760 |
| craft_garnet_ring | 1 | 3000 | 3 | 3600 | **5** | 6000 |
| craft_garnet_amulet | 3 | 3500 | 3 | 3086 | **6** | 6171 |
| craft_fang_necklace | 5 | 3500 | 3 | 3086 | **6** | 6171 |
| cut_sapphire | 15 | 3000 | 3 | 3600 | **9** | 10800 |
| craft_soul_amulet | 15 | 4000 | 3 | 2700 | **12** | 10800 |
| craft_sapphire_ring | 15 | 4000 | 3 | 2700 | **12** | 10800 |
| craft_warband_signet | 15 | 5000 | 4 | 2880 | **15** | 10800 |
| craft_sapphire_amulet | 18 | 4500 | 4 | 3200 | **16** | 12800 |
| craft_gemstone_ring | 20 | 6000 | 4 | 2400 | **23** | 13800 |
| craft_gemstone_amulet | 26 | 4000 | 3 | 2700 | **21** | 18900 |
| cut_ruby | 34 | 3500 | 5 | 5143 | **27** | 27771 |
| craft_ruby_ring | 34 | 5000 | 7 | 5040 | **39** | 28080 |
| craft_alpha_fang_amulet | 36 | 9000 | 15 | 6000 | **77** | 30800 |
| craft_ruby_amulet | 38 | 5500 | 10 | 6545 | **52** | 34036 |
| cut_bloodstone | 44 | 4000 | 12 | 10800 | **51** | 45900 |
| craft_bloodstone_ring | 44 | 5700 | 17 | 10737 | **73** | 46105 |
| craft_spellbinder_ring | 46 | 5700 | 12 | 7579 | **80** | 50526 |
| craft_bloodstone_amulet | 48 | 6200 | 23 | 13355 | **96** | 55742 |
| cut_diamond | 55 | 4500 | 19 | 15200 | **99** | 79200 |
| craft_diamond_ring | 55 | 6500 | 27 | 14954 | **143** | 79200 |
| craft_grave_warden_band | 55 | 10000 | 42 | 15120 | **220** | 79200 |
| craft_diamond_amulet | 60 | 7000 | 38 | 19543 | **197** | 101314 |
| craft_stormcaller_amulet | 65 | 12000 | 83 | 24900 | **433** | 129900 |
| cut_onyx | 70 | 5500 | 49 | 32073 | **254** | 166255 |
| craft_onyx_ring | 70 | 7000 | 62 | 31886 | **323** | 166114 |
| craft_void_anchor | 70 | 10000 | 90 | 32400 | **462** | 166320 |
| craft_onyx_amulet | 75 | 8000 | 91 | 40950 | **473** | 212850 |
| craft_slayer_amulet | 80 | 20000 | 293 | 52740 | **1516** | 272880 |
| craft_heartforged_pendant | 82 | 16000 | 255 | 57375 | **1339** | 301275 |
| cut_voidstone | 85 | 6000 | 87 | 52200 | **582** | 349200 |
| craft_voidstone_ring | 85 | 8000 | 116 | 52200 | **777** | 349650 |
| craft_voidstone_amulet | 88 | 9000 | 151 | 60400 | **1013** | 405200 |
| cut_godgem | 95 | 7000 | 167 | 85886 | **1115** | 573429 |
| craft_godgem_ring | 95 | 10000 | 239 | 86040 | **1593** | 573480 |
| craft_godgem_amulet | 99 | 12000 | 365 | 109500 | **2330** | 699000 |

### leatherworking — 125 Aktionen · Zeit bis 99 239 h → **41 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| tan_leather | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| craft_apprentice_mitts | 1 | 3500 | 2 | 2057 | **5** | 5143 |
| craft_apprentice_slippers | 1 | 3500 | 2 | 2057 | **5** | 5143 |
| craft_leather_cap | 1 | 4000 | 2 | 1800 | **6** | 5400 |
| craft_apprentice_hat | 1 | 4000 | 2 | 1800 | **6** | 5400 |
| craft_leather_body | 1 | 5500 | 3 | 1964 | **8** | 5236 |
| craft_apprentice_robe | 1 | 5500 | 3 | 1964 | **8** | 5236 |
| craft_cured_boots | 2 | 4000 | 2 | 1800 | **7** | 6300 |
| craft_apprentice_robe_legs | 2 | 4000 | 2 | 1800 | **7** | 6300 |
| craft_cured_vambraces | 3 | 4000 | 2 | 1800 | **7** | 6300 |
| craft_cured_legs | 5 | 5000 | 3 | 2160 | **9** | 6480 |
| craft_leather_cape | 8 | 5000 | 2 | 1440 | **11** | 7920 |
| craft_arcane_cape | 12 | 6000 | 3 | 1800 | **16** | 9600 |
| craft_scaled_body | 14 | 9000 | 7 | 2800 | **26** | 10400 |
| craft_plague_mask | 15 | 8000 | 5 | 2250 | **24** | 10800 |
| craft_chitin_coif | 16 | 6000 | 5 | 3000 | **19** | 11400 |
| craft_leather_warcape | 18 | 5000 | 3 | 2160 | **18** | 12960 |
| craft_frost_handwraps | 20 | 6500 | 6 | 3323 | **25** | 13846 |
| craft_frost_treads | 20 | 6500 | 6 | 3323 | **25** | 13846 |
| craft_frost_circlet | 20 | 7000 | 6 | 3086 | **27** | 13886 |
| craft_ear_plugs | 20 | 7000 | 7 | 3600 | **27** | 13886 |
| craft_frost_robe_legs | 21 | 7500 | 7 | 3360 | **31** | 14880 |
| craft_hardened_vambraces | 22 | 4000 | 3 | 2700 | **17** | 15300 |
| craft_hardened_boots | 22 | 4000 | 3 | 2700 | **17** | 15300 |
| tan_hardened_leather | 22 | 6000 | 6 | 3600 | **26** | 15600 |
| craft_hardened_helm | 22 | 6500 | 6 | 3323 | **28** | 15508 |
| craft_frost_robe_body | 22 | 9000 | 8 | 3200 | **39** | 15600 |
| craft_hardened_legs | 23 | 7500 | 7 | 3360 | **34** | 16320 |
| craft_hardened_body | 24 | 8500 | 8 | 3388 | **40** | 16941 |
| craft_scaled_vambraces | 28 | 4000 | 3 | 2700 | **23** | 20700 |
| craft_scaled_boots | 28 | 4000 | 3 | 2700 | **23** | 20700 |
| craft_scaled_helm | 28 | 8000 | 9 | 4050 | **46** | 20700 |
| craft_ember_handwraps | 30 | 8000 | 9 | 4050 | **51** | 22950 |
| craft_ember_sandals | 30 | 8000 | 9 | 4050 | **51** | 22950 |
| craft_scaled_legs | 30 | 8500 | 10 | 4235 | **54** | 22871 |
| craft_ember_robe_hood | 30 | 9000 | 10 | 4000 | **58** | 23200 |
| craft_silk_mantle | 30 | 9000 | 11 | 4400 | **58** | 23200 |
| craft_ember_robe_legs | 31 | 10000 | 12 | 4320 | **67** | 24120 |
| craft_ember_robe_body | 32 | 11000 | 14 | 4582 | **78** | 25527 |
| craft_ranger_cape | 35 | 8000 | 10 | 4500 | **65** | 29250 |
| craft_frost_shroud | 38 | 9000 | 13 | 5200 | **85** | 34000 |
| craft_duskhide_vambraces | 40 | 4200 | 7 | 6000 | **44** | 37714 |
| craft_duskhide_boots | 40 | 4200 | 7 | 6000 | **44** | 37714 |
| craft_duskhide_helm | 40 | 8800 | 14 | 5727 | **92** | 37636 |
| craft_duskhide_legs | 40 | 9200 | 14 | 5478 | **96** | 37565 |
| craft_duskhide_body | 40 | 10500 | 16 | 5486 | **110** | 37714 |
| craft_hardened_warcape | 45 | 9000 | 18 | 7200 | **121** | 48400 |
| craft_aether_gloves | 45 | 9500 | 25 | 9474 | **127** | 48126 |
| craft_aether_slippers | 45 | 9500 | 25 | 9474 | **127** | 48126 |
| craft_aether_hood | 45 | 10000 | 26 | 9360 | **134** | 48240 |
| craft_aether_robe_legs | 46 | 11000 | 30 | 9818 | **155** | 50727 |
| craft_aether_robe_body | 47 | 13000 | 37 | 10246 | **192** | 53169 |
| craft_studded_vambraces | 50 | 4000 | 10 | 9000 | **69** | 62100 |
| craft_studded_boots | 50 | 4000 | 10 | 9000 | **69** | 62100 |
| reinforce_studded_leather | 50 | 9000 | 30 | 12000 | **155** | 62000 |
| craft_studded_helm | 50 | 9500 | 31 | 11747 | **163** | 61768 |
| craft_studded_legs | 51 | 10500 | 36 | 12343 | **189** | 64800 |
| craft_studded_body | 52 | 12000 | 44 | 13200 | **227** | 68100 |
| craft_arcane_mitts | 57 | 11000 | 40 | 13091 | **267** | 87382 |
| craft_arcane_slippers | 57 | 11000 | 40 | 13091 | **267** | 87382 |
| craft_arcane_cowl | 57 | 12000 | 44 | 13200 | **291** | 87300 |
| craft_arcane_robe_legs | 57 | 12000 | 44 | 13200 | **291** | 87300 |
| craft_frost_pelt_hood | 58 | 11000 | 61 | 19964 | **281** | 91964 |
| craft_arcane_robe_body | 58 | 14000 | 54 | 13886 | **357** | 91800 |
| craft_ironhide_vambraces | 60 | 8000 | 50 | 22500 | **225** | 101250 |
| craft_ironhide_boots | 60 | 8000 | 50 | 22500 | **225** | 101250 |
| craft_ironhide_helm | 60 | 11000 | 75 | 24545 | **310** | 101455 |
| craft_ironhide_legs | 61 | 12500 | 85 | 24480 | **370** | 106560 |
| craft_ironhide_body | 62 | 14000 | 100 | 25714 | **435** | 111857 |
| craft_duskweave_handwraps | 63 | 12500 | 60 | 17280 | **408** | 117504 |
| craft_duskweave_treads | 63 | 12500 | 60 | 17280 | **408** | 117504 |
| craft_duskweave_cowl | 63 | 13000 | 62 | 17169 | **425** | 117692 |
| craft_duskweave_robe_legs | 64 | 14000 | 68 | 17486 | **481** | 123686 |
| craft_void_shroud | 65 | 13000 | 87 | 24092 | **469** | 129877 |
| craft_duskweave_robe_body | 65 | 16000 | 80 | 18000 | **577** | 129825 |
| craft_warhide_vambraces | 70 | 4000 | 28 | 25200 | **185** | 166500 |
| craft_warhide_boots | 70 | 4000 | 28 | 25200 | **185** | 166500 |
| cure_warhide | 70 | 12000 | 105 | 31500 | **554** | 166200 |
| craft_warhide_helm | 70 | 13000 | 115 | 31846 | **601** | 166431 |
| craft_runewoven_handwraps | 71 | 13000 | 99 | 27415 | **631** | 174738 |
| craft_runewoven_treads | 71 | 13000 | 99 | 27415 | **631** | 174738 |
| craft_runewoven_cowl | 71 | 14000 | 107 | 27514 | **680** | 174857 |
| craft_runewoven_robe_legs | 71 | 14000 | 102 | 26229 | **680** | 174857 |
| craft_warhide_legs | 71 | 14500 | 135 | 33517 | **704** | 174786 |
| craft_warhide_body | 72 | 16000 | 155 | 34875 | **816** | 183600 |
| craft_runewoven_robe_body | 72 | 17000 | 130 | 27529 | **867** | 183600 |
| tan_wyvern_scale | 75 | 14000 | 120 | 30857 | **828** | 212914 |
| craft_slayer_vambraces | 75 | 15000 | 129 | 30960 | **887** | 212880 |
| tan_dragonhide | 78 | 12000 | 125 | 37500 | **824** | 247200 |
| craft_dragonhide_vambraces | 82 | 4000 | 50 | 45000 | **335** | 301500 |
| craft_dragonhide_boots | 82 | 4000 | 50 | 45000 | **335** | 301500 |
| craft_dragonhide_helm | 82 | 13000 | 163 | 45138 | **1088** | 301292 |
| craft_dragonhide_legs | 82 | 14000 | 176 | 45257 | **1171** | 301114 |
| craft_dragonhide_body | 82 | 16000 | 201 | 45225 | **1339** | 301275 |
| craft_godspark_handwraps | 88 | 15000 | 323 | 77520 | **1689** | 405360 |
| craft_godspark_sandals | 88 | 15000 | 323 | 77520 | **1689** | 405360 |
| craft_godspark_mitre | 88 | 16000 | 345 | 77625 | **1802** | 405450 |
| craft_godspark_skirt | 89 | 17500 | 395 | 81257 | **2071** | 426034 |
| craft_wraithhide_vambraces | 90 | 4000 | 75 | 67500 | **497** | 447300 |
| craft_wraithhide_boots | 90 | 4000 | 75 | 67500 | **497** | 447300 |
| craft_wraithhide_helm | 90 | 13000 | 242 | 67015 | **1616** | 447508 |
| tan_shadowhide | 90 | 14000 | 245 | 63000 | **1741** | 447686 |
| craft_wraithhide_legs | 90 | 14000 | 261 | 67114 | **1741** | 447686 |
| craft_wraithhide_body | 90 | 16000 | 298 | 67050 | **1989** | 447525 |
| craft_godspark_vestment | 90 | 21000 | 500 | 85714 | **2611** | 447600 |
| craft_starweave_handwraps | 93 | 15000 | 325 | 78000 | **2164** | 519360 |
| craft_starweave_sandals | 93 | 15000 | 325 | 78000 | **2164** | 519360 |
| craft_starweave_coronet | 93 | 16000 | 346 | 77850 | **2308** | 519300 |
| craft_starweave_skirt | 93 | 17500 | 379 | 77966 | **2524** | 519223 |
| craft_starweave_vestment | 93 | 21000 | 454 | 77829 | **3029** | 519257 |
| craft_shadowhide_vambraces | 95 | 4000 | 96 | 86400 | **637** | 573300 |
| craft_shadowhide_boots | 95 | 4000 | 96 | 86400 | **637** | 573300 |
| craft_shadowhide_helm | 95 | 13000 | 311 | 86123 | **2070** | 573231 |
| craft_shadowhide_legs | 95 | 14000 | 334 | 85886 | **2230** | 573429 |
| craft_shadowhide_body | 95 | 16000 | 382 | 85950 | **2548** | 573300 |
| craft_voidhide_vambraces | 99 | 12000 | 667 | 200100 | **2330** | 699000 |
| craft_voidhide_boots | 99 | 12000 | 667 | 200100 | **2330** | 699000 |
| craft_voidweave_handwraps | 99 | 13000 | 722 | 199938 | **2524** | 698954 |
| craft_voidweave_sandals | 99 | 13000 | 722 | 199938 | **2524** | 698954 |
| craft_voidhide_helm | 99 | 14000 | 778 | 200057 | **2718** | 698914 |
| craft_voidweave_mitre | 99 | 15000 | 833 | 199920 | **2912** | 698880 |
| craft_voidhide_legs | 99 | 16000 | 889 | 200025 | **3106** | 698850 |
| craft_voidweave_skirt | 99 | 17000 | 944 | 199906 | **3300** | 698824 |
| craft_voidhide_body | 99 | 18000 | 1000 | 200000 | **3494** | 698800 |
| craft_voidweave_vestment | 99 | 20000 | 1111 | 199980 | **3883** | 698940 |

### mining — 21 Aktionen · Zeit bis 99 210 h → **44 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| mine_copper | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| mine_tin | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| mine_iron | 10 | 3600 | 3 | 3000 | **9** | 9000 |
| mine_coal | 15 | 4200 | 4 | 3429 | **13** | 11143 |
| mine_garnet_seam | 15 | 4500 | 4 | 3200 | **14** | 11200 |
| mine_gravesteel | 22 | 4500 | 5 | 4000 | **19** | 15200 |
| mine_bloodstone_seam | 25 | 5000 | 7 | 5040 | **25** | 18000 |
| mine_mithril | 35 | 5000 | 8 | 5760 | **41** | 29520 |
| mine_sapphire_seam | 35 | 5500 | 9 | 5891 | **45** | 29455 |
| mine_adamantite | 45 | 5500 | 14 | 9164 | **74** | 48436 |
| mine_runite | 55 | 6500 | 27 | 14954 | **143** | 79200 |
| mine_ruby_seam | 55 | 6500 | 27 | 14954 | **143** | 79200 |
| mine_murkvein | 62 | 7000 | 33 | 16971 | **218** | 112114 |
| mine_bloodiron | 70 | 7000 | 62 | 31886 | **323** | 166114 |
| mine_diamond_seam | 75 | 7800 | 88 | 40615 | **461** | 212769 |
| mine_titanium | 80 | 7800 | 115 | 53077 | **591** | 272769 |
| mine_voidstone_seam | 82 | 8300 | 145 | 62892 | **694** | 301012 |
| mine_aetherite | 90 | 8500 | 205 | 86824 | **1057** | 447671 |
| mine_onyx_seam | 90 | 8800 | 210 | 85909 | **1094** | 447545 |
| mine_godgem_seam | 95 | 9000 | 270 | 108000 | **1433** | 573200 |
| mine_godiron | 95 | 9500 | 475 | 180000 | **1513** | 573347 |

### runecrafting — 54 Aktionen · Zeit bis 99 248 h → **45 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| craft_force_rune | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| enchant_dim_focus | 1 | 5000 | 3 | 2160 | **8** | 5760 |
| craft_frost_rune | 10 | 3000 | 2 | 2400 | **7** | 8400 |
| craft_fire_rune | 15 | 4000 | 3 | 2700 | **12** | 10800 |
| craft_rune_keen_i | 15 | 7000 | 3 | 1543 | **21** | 10800 |
| craft_rune_aegis_i | 16 | 7500 | 4 | 1920 | **24** | 11520 |
| craft_rune_flame_i | 18 | 8000 | 4 | 1800 | **28** | 12600 |
| craft_rune_evasion_i | 19 | 8000 | 4 | 1800 | **30** | 13500 |
| craft_rune_frost_i | 20 | 8000 | 5 | 2250 | **31** | 13950 |
| craft_rune_storm_i | 20 | 8000 | 5 | 2250 | **31** | 13950 |
| craft_rune_precise_i | 22 | 9000 | 6 | 2400 | **39** | 15600 |
| craft_rune_warding_i | 23 | 9000 | 6 | 2400 | **41** | 16400 |
| enchant_frost_focus | 25 | 6000 | 6 | 3600 | **30** | 18000 |
| enchant_frost_scepter | 25 | 8000 | 4 | 1800 | **40** | 18000 |
| craft_rune_swift_i | 25 | 10000 | 7 | 2520 | **50** | 18000 |
| craft_rune_bulwark_i | 27 | 10000 | 8 | 2880 | **55** | 19800 |
| craft_rune_hunter_i | 28 | 10000 | 9 | 3240 | **58** | 20880 |
| bind_shade_rune | 30 | 5000 | 5 | 3600 | **32** | 23040 |
| craft_rune_arcane_i | 30 | 10000 | 10 | 3600 | **64** | 23040 |
| craft_rune_keen_ii | 38 | 11000 | 16 | 5236 | **104** | 34036 |
| craft_rune_aegis_ii | 39 | 11500 | 17 | 5322 | **115** | 36000 |
| craft_shock_rune | 40 | 5000 | 8 | 5760 | **52** | 37440 |
| craft_rune_flame_ii | 40 | 12000 | 19 | 5700 | **126** | 37800 |
| craft_rune_hunter_ii | 40 | 14000 | 22 | 5657 | **147** | 37800 |
| craft_rune_frost_ii | 42 | 12000 | 21 | 6300 | **139** | 41700 |
| craft_rune_storm_ii | 42 | 12000 | 21 | 6300 | **139** | 41700 |
| craft_rune_arcane_ii | 42 | 15000 | 26 | 6240 | **173** | 41520 |
| craft_rune_evasion_ii | 44 | 12500 | 24 | 6912 | **160** | 46080 |
| enchant_aether_orb | 45 | 8000 | 21 | 9450 | **107** | 48150 |
| enchant_aether_runestaff | 45 | 11000 | 10 | 3273 | **147** | 48109 |
| craft_rune_precise_ii | 45 | 13000 | 26 | 7200 | **174** | 48185 |
| craft_rune_swift_ii | 48 | 14000 | 33 | 8486 | **218** | 56057 |
| craft_rune_warding_ii | 49 | 14000 | 34 | 8743 | **229** | 58886 |
| craft_aether_rune | 50 | 5000 | 13 | 9360 | **86** | 61920 |
| enchant_stormcaller_rod | 50 | 11000 | 36 | 11782 | **189** | 61855 |
| craft_soul_veil | 50 | 12000 | 60 | 18000 | **206** | 61800 |
| craft_rune_bulwark_ii | 53 | 15000 | 45 | 10800 | **299** | 71760 |
| craft_rune_keen_iii | 62 | 16000 | 75 | 16875 | **497** | 111825 |
| craft_rune_aegis_iii | 63 | 16500 | 81 | 17673 | **539** | 117600 |
| bind_void_rune | 65 | 6500 | 35 | 19385 | **234** | 129600 |
| enchant_void_focus | 65 | 10000 | 69 | 24840 | **361** | 129960 |
| craft_rune_flame_iii | 65 | 18000 | 97 | 19400 | **649** | 129800 |
| craft_rune_evasion_iii | 67 | 18000 | 108 | 21600 | **717** | 143400 |
| craft_rune_frost_iii | 68 | 18000 | 113 | 22600 | **753** | 150600 |
| craft_rune_storm_iii | 68 | 18000 | 113 | 22600 | **753** | 150600 |
| enchant_voidcaller_staff | 70 | 14000 | 125 | 32143 | **647** | 166371 |
| craft_rune_precise_iii | 70 | 19000 | 132 | 25011 | **878** | 166358 |
| craft_rune_swift_iii | 72 | 20000 | 153 | 27540 | **1020** | 183600 |
| craft_rune_warding_iii | 73 | 20000 | 161 | 28980 | **1072** | 192960 |
| craft_rune_hunter_iii | 74 | 20000 | 169 | 30420 | **1126** | 202680 |
| craft_rune_arcane_iii | 75 | 21000 | 186 | 31886 | **1242** | 212914 |
| craft_rune_bulwark_iii | 79 | 22000 | 238 | 38945 | **1587** | 259691 |
| enchant_god_focus | 85 | 13000 | 240 | 66462 | **1262** | 349477 |
| enchant_godspark_staff | 88 | 18000 | 390 | 78000 | **2027** | 405400 |

### smithing — 66 Aktionen · Zeit bis 99 188 h → **45 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| smelt_copper | 1 | 2600 | 2 | 2769 | **4** | 5538 |
| forge_copper_dagger | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| forge_copper_gauntlets | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| forge_copper_sabatons | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| forge_copper_arrowheads | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| forge_copper_sword | 1 | 3500 | 2 | 2057 | **5** | 5143 |
| forge_copper_mace | 1 | 3500 | 2 | 2057 | **5** | 5143 |
| forge_copper_medhelm | 1 | 3500 | 2 | 2057 | **5** | 5143 |
| forge_copper_scimitar | 1 | 4000 | 3 | 2700 | **6** | 5400 |
| forge_copper_axe | 2 | 4500 | 3 | 2400 | **8** | 6400 |
| forge_copper_battleaxe | 2 | 4500 | 3 | 2400 | **8** | 6400 |
| forge_copper_spear | 2 | 4500 | 3 | 2400 | **8** | 6400 |
| forge_copper_fullhelm | 2 | 4500 | 3 | 2400 | **8** | 6400 |
| forge_copper_kiteshield | 2 | 4500 | 3 | 2400 | **8** | 6400 |
| forge_copper_towershield | 2 | 6500 | 4 | 2215 | **11** | 6092 |
| forge_copper_chainbody | 2 | 8000 | 6 | 2700 | **14** | 6300 |
| forge_copper_greataxe | 3 | 6500 | 4 | 2215 | **12** | 6646 |
| forge_copper_greatsword | 3 | 6500 | 4 | 2215 | **12** | 6646 |
| forge_copper_maul | 3 | 6500 | 4 | 2215 | **12** | 6646 |
| forge_copper_platelegs | 3 | 6500 | 4 | 2215 | **12** | 6646 |
| forge_copper_platebody | 4 | 9000 | 5 | 2000 | **17** | 6800 |
| smelt_bronze | 5 | 3000 | 3 | 3600 | **6** | 7200 |
| recycle_scrap | 5 | 3500 | 3 | 3086 | **7** | 7200 |
| forge_bronze_arrowheads | 5 | 3500 | 3 | 3086 | **7** | 7200 |
| forge_bronze_dagger | 5 | 4000 | 3 | 2700 | **8** | 7200 |
| forge_bronze_gauntlets | 5 | 4000 | 3 | 2700 | **8** | 7200 |
| forge_bronze_sabatons | 5 | 4000 | 3 | 2700 | **8** | 7200 |
| forge_bronze_mace | 5 | 5000 | 3 | 2160 | **10** | 7200 |
| forge_bronze_medhelm | 5 | 5000 | 3 | 2160 | **10** | 7200 |
| forge_bronze_sword | 5 | 5500 | 5 | 3273 | **11** | 7200 |
| forge_bronze_scimitar | 5 | 6000 | 4 | 2400 | **12** | 7200 |
| forge_bronze_axe | 6 | 6000 | 4 | 2400 | **12** | 7200 |
| forge_bronze_battleaxe | 6 | 6000 | 4 | 2400 | **12** | 7200 |
| forge_bronze_spear | 6 | 6000 | 4 | 2400 | **12** | 7200 |
| forge_bronze_fullhelm | 6 | 6000 | 4 | 2400 | **12** | 7200 |
| forge_bronze_kiteshield | 6 | 6000 | 5 | 3000 | **12** | 7200 |
| forge_bronze_platelegs | 6 | 8000 | 7 | 3150 | **16** | 7200 |
| forge_bronze_towershield | 6 | 8000 | 7 | 3150 | **16** | 7200 |
| forge_bronze_chainbody | 6 | 9000 | 10 | 4000 | **18** | 7200 |
| forge_bronze_greataxe | 7 | 8000 | 6 | 2700 | **16** | 7200 |
| forge_bronze_greatsword | 7 | 8000 | 6 | 2700 | **16** | 7200 |
| forge_bronze_maul | 7 | 8000 | 6 | 2700 | **16** | 7200 |
| forge_bronze_platebody | 7 | 10000 | 13 | 4680 | **20** | 7200 |
| smelt_iron | 10 | 3200 | 3 | 3375 | **8** | 9000 |
| smelt_steel | 20 | 4500 | 4 | 3200 | **18** | 14400 |
| forge_steel_arrowheads | 20 | 4500 | 4 | 3200 | **18** | 14400 |
| smelt_gravesteel | 22 | 4800 | 5 | 3750 | **21** | 15750 |
| forge_gravesteel_blade | 24 | 11800 | 20 | 6102 | **56** | 17085 |
| forge_gravesteel_warplate | 25 | 12600 | 48 | 13714 | **63** | 18000 |
| forge_gravesteel_gravemark | 26 | 10000 | 22 | 7920 | **52** | 18720 |
| smelt_blacksteel | 30 | 6000 | 7 | 4200 | **38** | 22800 |
| craft_mirror_ward | 30 | 10000 | 18 | 6480 | **64** | 23040 |
| smelt_mithril | 35 | 6500 | 10 | 5538 | **53** | 29354 |
| forge_mithril_arrowheads | 40 | 6500 | 10 | 5538 | **68** | 37662 |
| smelt_adamantium | 45 | 7500 | 19 | 9120 | **101** | 48480 |
| smelt_runite | 55 | 8500 | 36 | 15247 | **187** | 79200 |
| forge_runite_arrowheads | 60 | 8500 | 36 | 15247 | **239** | 101224 |
| smelt_murkvein | 62 | 5500 | 37 | 24218 | **171** | 111927 |
| smelt_bloodiron | 65 | 9000 | 62 | 24800 | **325** | 130000 |
| forge_slayer_ward_capsule | 65 | 20000 | 156 | 28080 | **721** | 129780 |
| smelt_titanium | 75 | 9500 | 110 | 41684 | **562** | 212968 |
| craft_slayer_greaves | 75 | 18000 | 333 | 66600 | **1065** | 213000 |
| forge_tower_compound | 78 | 20000 | 306 | 55080 | **1373** | 247140 |
| craft_slayer_helm | 80 | 30000 | 695 | 83400 | **2273** | 272760 |
| smelt_aetherium | 85 | 10500 | 195 | 66857 | **1019** | 349371 |
| smelt_godiron | 95 | 12000 | 365 | 109500 | **1911** | 573300 |

### thieving — 23 Aktionen · Zeit bis 99 234 h → **47 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| fence_coinpurse | 1 | 2500 | 1 | 1440 | **4** | 5760 |
| pickpocket_beggar | 1 | 3000 | 2 | 2400 | **5** | 6000 |
| pickpocket_drunkard | 5 | 3200 | 3 | 3375 | **6** | 6750 |
| fence_trinket | 12 | 3000 | 2 | 2400 | **8** | 9600 |
| pickpocket_merchant | 12 | 3600 | 4 | 4000 | **9** | 9000 |
| loot_market_stall | 20 | 4200 | 6 | 5143 | **16** | 13714 |
| crack_smugglers_lock | 28 | 3000 | 3 | 3600 | **17** | 20400 |
| pickpocket_tax_collector | 28 | 4000 | 7 | 6300 | **23** | 20700 |
| launder_ledger | 30 | 3500 | 3 | 3086 | **22** | 22629 |
| melt_insignia | 36 | 4000 | 5 | 4500 | **34** | 30600 |
| burgle_warehouse | 36 | 7000 | 14 | 7200 | **60** | 30857 |
| pickpocket_city_guard | 45 | 4200 | 11 | 9429 | **56** | 48000 |
| crack_strongbox | 55 | 6000 | 25 | 15000 | **132** | 79200 |
| reforge_signet | 65 | 4000 | 22 | 19800 | **144** | 129600 |
| pickpocket_noble | 65 | 4600 | 32 | 25043 | **166** | 129913 |
| melt_goblet | 75 | 4500 | 40 | 32000 | **266** | 212800 |
| rob_cultist_shrine | 75 | 7500 | 85 | 40800 | **444** | 213120 |
| desecrate_reliquary | 85 | 5000 | 73 | 52560 | **485** | 349200 |
| raid_tax_vault | 85 | 9000 | 165 | 66000 | **874** | 349600 |
| appraise_idol | 95 | 5000 | 119 | 85680 | **796** | 573120 |
| loot_reliquary | 95 | 8500 | 260 | 110118 | **1354** | 573459 |
| plunder_ashen_treasury | 97 | 10000 | 500 | 180000 | **1758** | 632880 |
| heist_idol_hoard | 99 | 12000 | 985 | 295500 | **2330** | 699000 |

### woodcutting — 16 Aktionen · Zeit bis 99 244 h → **45 h**

| id | lvl | durMs | cur xp | cur xp/h | **REC xp** | rec xp/h |
|---|---|---|---|---|---|---|
| cut_normal_tree | 1 | 2800 | 2 | 2571 | **4** | 5143 |
| cut_birchwood_tree | 5 | 3200 | 3 | 3375 | **6** | 6750 |
| cut_oak_tree | 10 | 3600 | 4 | 4000 | **9** | 9000 |
| cut_willowbark_tree | 15 | 4050 | 5 | 4444 | **12** | 10667 |
| cut_ashbark_tree | 20 | 4500 | 6 | 4800 | **18** | 14400 |
| cut_grimwood_tree | 25 | 4750 | 7 | 5305 | **24** | 18189 |
| cut_blackwood_tree | 30 | 5000 | 8 | 5760 | **32** | 23040 |
| cut_blightwood_tree | 38 | 5250 | 9 | 6171 | **50** | 34286 |
| cut_ironbark_tree | 45 | 5500 | 14 | 9164 | **74** | 48436 |
| cut_bloodoak_tree | 55 | 6500 | 27 | 14954 | **143** | 79200 |
| cut_ashfen_tree | 63 | 6750 | 38 | 20267 | **221** | 117867 |
| cut_shadowpine_tree | 70 | 7000 | 62 | 31886 | **323** | 166114 |
| cut_wraithwood_tree | 78 | 7500 | 90 | 43200 | **515** | 247200 |
| cut_bonewood_tree | 85 | 8000 | 150 | 67500 | **777** | 349650 |
| cut_voidwood_tree | 92 | 8600 | 205 | 85814 | **1181** | 494372 |
| cut_godwood_tree | 99 | 9000 | 350 | 140000 | **1747** | 698800 |

---
*Generiert aus content.actions (496 Aktionen) + engine/leveling.ts. Formel C=600. Bei C-Änderung Tabellen neu erzeugen.*
