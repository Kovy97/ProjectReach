# Smithing Stats-Spec — 20 Item-Typen × 12 Metall-Tiers (finale, gelockte Palette)

**Autor:** Balance-Designer · **Datum:** 2026-06-25 · **Status:** Reine Spec/Analyse — KEINE Code-/Content-Änderung. 1:1-Vorlage für content-dev.
**Aufbauend auf:** vorherige 17er-Spec (Tier-Schaden-Index `D` 5→132, Body-Defense `B` 8→136, Profile, forge-XP-Kurve aus `skilling-xp-retune.md`). Aktueller Content `packages/content/src/index.ts` als Anker.

> **Gelockte Palette: 20 Typen** (10 Waffen, 9 Rüstung, 1 Munition) × 12 Tiers = **240 konkrete Items**. **Saves dürfen brechen** — keine „EXIST behalten"-Rücksicht mehr. Jede Zelle ist eine frische Vorgabe mit ID `<metall>_<suffix>`. Die NEUEN Typen (scimitar, battleaxe, greatsword, chainbody, towershield) sind monoton in die bestehende Skalierung eingepasst — keine Cliffs.
>
> **ENTFERNT aus der Palette:** nur 1H `warhammer` ist gestrichen. Das 1H `axe` BLEIBT (eigene Nische zwischen Schwert und Streitaxt, +Holzfäller-Doppelnutzen).

---

## 0. Tiers & Verankerung

12 Tiers, fix: **Copper · Bronze · Iron · Steel · Blacksteel · Mithril · Adamantium · Runite · Bloodiron · Titanium · Aetherium · Godiron.**

Bestätigte Content-Anker (`godiron_blade` mDmg 132, `godiron_body` def 116/hp 290 mit 6 Bars, `godiron_shield` def 68 mit 4 Bars):
die Kurve ist daran kalibriert. Da Saves brechen dürfen, ziehe ich die Body-Defense **voll auf die geglättete `B`-Kurve** (Godiron-Body = 136 statt der alten 116-Bestandsdelle) — sauberer Ladder ohne Restdelta.

---

## 1. Die Tier-Skalierungskurve (Kern)

Ein **Tier-Schaden-Index** `D(t)` und ein **Tier-Body-Defense-Index** `B(t)` treiben alles (×≈1,35/Tier, glatt, monoton).

| # | Tier | `D` (Sword-mDmg) | `B` (Body-def) | Trage-Req = Smelt-Lvl | Smith-Basis-Lvl | Rarity |
|---|------|----:|----:|----:|----:|---|
| 1 | Copper | **5** | **8** | 1 | 1 | common |
| 2 | Bronze | **8** | **11** | 5 | 5 | common |
| 3 | Iron | **14** | **17** | 10 | 10 | common |
| 4 | Steel | **20** | **24** | 20 | 20 | common |
| 5 | Blacksteel | **28** | **32** | 30 | 30 | magic |
| 6 | Mithril | **38** | **42** | 40 | 40 | rare |
| 7 | Adamantium | **48** | **52** | 50 | 50 | rare |
| 8 | Runite | **60** | **64** | 60 | 60 | epic |
| 9 | Bloodiron | **74** | **78** | 70 | 70 | epic |
| 10 | Titanium | **90** | **94** | 80 | 80 | legendary |
| 11 | Aetherium | **108** | **112** | 90 | 90 | legendary |
| 12 | Godiron | **132** | **136** | 105 | 100 | legendary |

`D`-Faktor 26,4 über 12 Tiers; `B`-Faktor 17,0. Trage-Req ist das Smelt-Level des Tiers; **Smith-`levelRequired`** = Smith-Basis-Lvl + Item-Lvl-Offset (§2). Trage-`requirements`: Waffen → `attack`-Req = Trage-Req; Rüstung → `defence`-Req = Trage-Req.

---

## 2. Item-Profile (relativ, tier-unabhängig)

`D` = Tier-Schaden-Index, `B` = Tier-Body-Defense. Werte gerundet (Damage/Acc/Def ganzzahlig; crit 2 Nachkommastellen).

### 2.1 Waffen (10) — alle `weaponStyle:"melee"`, `slot:"mainhand"`

| # | Typ | id-Suffix | 2H | `meleeDamage` | `accuracy` | Sonder-`bonus` | `attackIntervalMs` | smithLvl-Offset | Bars |
|---|-----|-----------|----|---:|---:|---|---:|---:|---:|
| 1 | **Dagger** | `dagger` | – | `0.62·D` | `1.9·D` | `critChance` (Cu .06→Go .10) | **−500** | +0 | 1 |
| 2 | **Sword** | `sword` | – | `1.0·D` | `1.5·D` | — | **0** | +0 | 2 |
| 3 | **Scimitar** | `scimitar` | – | `0.85·D` | `1.6·D` | `critChance` (Cu .05→Go .08) | **−300** | +0 | 2 |
| 4 | **Mace** | `mace` | – | `1.0·D` | `1.1·D` | `defense: 0.30·D` | **0** | +0 | 2 |
| 5 | **Axe** | `axe` | – | `1.05·D` | `1.2·D` | `tool:{woodcutting, speedMult}` (Cu .92→Go .50) | **+150** | +0 | 2 |
| 6 | **Battleaxe** | `battleaxe` | – | `1.15·D` | `1.2·D` | `critDamage` (Cu .25→Go .40) | **+200** | +1 | 2 |
| 7 | **Spear** | `spear` | ✅ | `1.12·D` | `1.7·D` | `evasion: 1.0·D` | **+200** | +1 | 2 |
| 8 | **Greataxe** | `greataxe` | ✅ | `1.62·D` | `1.3·D` | `critDamage` (Cu .40→Go .55) | **+900** | +2 | 3 |
| 9 | **Greatsword** | `greatsword` | ✅ | `1.85·D` | `1.25·D` | — | **+1100** | +2 | 3 |
| 10 | **Maul** | `maul` | ✅ | `2.15·D` | `1.0·D` | `modifiers.str` (Cu 2→Go 12) | **+1500** | +2 | 3 |

**1H-DPS-Leiter (Identität):** Dagger (schnellster, niedrigster Roh, +crit) → Scimitar (schnell, schneidend, +crit) → Sword (Baseline) → Mace (Baseline + Eigen-Defense) → Axe (hackend, etwas mehr Roh als Sword, minimal langsamer, +Holzfäller-Tool) → Battleaxe (langsamster 1H, höchster 1H-Roh, +critDamage).
**2H-DPS-Leiter:** Spear (mobil, +evasion) → Greataxe (+critDamage) → Greatsword (ausgewogen, sehr hoher Roh) → Maul (träge, höchster Roh, +STR). Greatsword sitzt sauber zwischen Greataxe (1.62) und Maul (2.15).

> **Axe-Doppelnutzen:** Die Axt ist zugleich Holzfäller-Werkzeug — `tool:{ skill:"woodcutting", speedMult }`. `speedMult` sinkt (schneller) mit Tier: Cu .92 · Br .90 · Fe .86 · St .82 · Bl .78 · Mi .74 · Ad .70 · Ru .66 · Bd .62 · Ti .58 · Ae .54 · Go .50. Falls die Engine `tool` an mainhand-Waffen nicht unterstützt, Axt rein als Waffe führen (Holzfäller-Axt dann als separates Tool-Item, eigener Auftrag) — Damage/aIMs/xp bleiben gleich.

Sonder-Bonus-Kurven (12 Tiers, Cu→Go):
- **critChance Dagger:** .06 .06 .07 .07 .07 .07 .08 .08 .08 .09 .09 .10
- **critChance Scimitar:** .05 .05 .05 .06 .06 .06 .06 .07 .07 .07 .08 .08
- **critDamage Battleaxe:** .25 .26 .28 .30 .31 .32 .33 .34 .36 .37 .38 .40
- **critDamage Greataxe:** .40 .41 .45 .46 .47 .48 .49 .50 .52 .53 .54 .55
- **modifiers.str Maul:** 2 2 4 4 5 6 7 8 9 10 11 12
- **Mace defense (`0.30·D`):** 2 2 4 6 8 11 14 18 22 27 32 40
- **Axe speedMult (woodcutting):** .92 .90 .86 .82 .78 .74 .70 .66 .62 .58 .54 .50

### 2.2 Rüstung (9)

`B` = Tier-Body-Defense. Slot-Ordnung (Defense): **Towershield ≈ Platebody > Platelegs ≈ Chainbody > FullHelm ≈ Kiteshield > MedHelm > Gauntlets ≈ Sabatons.**

| # | Typ | id-Suffix | Slot | `defense` | `maxHp` | Sonder-`bonus` | `attackIntervalMs` | smithLvl-Offset | Bars |
|---|-----|-----------|------|---:|---:|---|---:|---:|---:|
| 10 | **Med Helm** | `medhelm` | helmet | `0.26·B` | `0.74·B` | — | — | +0 | 1 |
| 11 | **Full Helm** | `fullhelm` | helmet | `0.46·B` | `1.16·B` | — | **+50** | +1 | 2 |
| 12 | **Platebody** | `platebody` | body | `1.0·B` | `2.5·B` | — | **+200** | +2 | 5 (Go 6) |
| 13 | **Chainbody** | `chainbody` | body | `0.62·B` | `1.42·B` | `evasion` (Cu 2→Go 9) | **—** (mobil, kein Malus) | +1 | 4 |
| 14 | **Platelegs** | `platelegs` | legs | `0.62·B` | `1.42·B` | — | **+100** | +1 | 3 |
| 15 | **Gauntlets** | `gauntlets` | gloves | `0.16·B` | `0.28·B` | — | — | +0 | 1 |
| 16 | **Sabatons** | `sabatons` | boots | `0.16·B` | `0.28·B` | — | — | +0 | 1 |
| 17 | **Kiteshield** | `kiteshield` | offhand | `0.50·B` | `0.92·B` | `evasion` (Cu 2→Go 9) | — | +1 | 2 |
| 18 | **Towershield** | `towershield` | offhand | `0.80·B` | `0.90·B` | `defense`-Tank, KEIN evasion | **+100** (träge) | +1 | 3 |

**Body-Wahl (Identität):** Platebody = maximale Defense + dicker HP-Puffer, dafür Angriffstempo-Malus (+200). Chainbody = mobile Body-Variante: ~0.62·B Defense, +evasion, **kein** aIMs-Malus → Gegenstück für DEX/INT-Builds, die Tempo behalten wollen.
**Schild-Wahl:** Kiteshield = mobil (+evasion, kein Malus). Towershield = tankigster Schild (höchste Schild-Defense 0.80·B), +aIMs-Malus, KEIN evasion → reiner STR-Tank-Konter (ersetzt das alte „square shield").

Sonder-Bonus-Kurven (Cu→Go):
- **evasion Chainbody / Kiteshield:** 2 2 4 4 5 5 5 6 7 7 8 9

### 2.3 Munition — Arrowheads (1)

| # | Typ | id-Suffix | `type` | Stack/Bar | `bonus.ammoDamage` (`0.32·D`) | Bars |
|---|-----|-----------|--------|----:|---:|---:|
| 19 | **Arrowheads** | `arrowheads` | `material`, `stackable:true` | 15 | 2→42 (s. §4.19) | 1 |

---

## 3. Level- & XP-Staffel pro Tier

**Smith-`levelRequired`** = Smith-Basis-Lvl (§1) + Item-Lvl-Offset (§2). **forge-`xp`** ist an die angewandte Schmiede-XP-Kurve gekoppelt: pro Tier ein „Sword-xp@Basis"-Anker (= bisherige `*_blade`-neu-xp), und jedes Item skaliert ≈ **Sword-xp × (Bar-Zahl / 2) × leichte Lvl-Korrektur**, gerundet. `durationMs` skaliert mit Bar-Zahl/Schwere.

| Tier | Smith-Basis | Sword-xp@Basis (2 Bars) | xp pro Bar (≈) | durationMs Sword |
|---|---:|---:|---:|---:|
| Copper | 1 | 3 | 1.5 | 4000 |
| Bronze | 5 | 5 | 2.5 | 5500 |
| Iron | 10 | 6 | 3 | 6500 |
| Steel | 20 | 15 | 7.5 | 11000 |
| Blacksteel | 30 | 28 | 14 | 13000 |
| Mithril | 40 | 36 | 18 | 12500 |
| Adamantium | 50 | 68 | 34 | 14500 |
| Runite | 60 | 128 | 64 | 16500 |
| Bloodiron | 70 | 240 | 120 | 18500 |
| Titanium | 80 | 555 | 278 | 20500 |
| Aetherium | 90 | 870 | 435 | 22500 |
| Godiron | 100 | 1690 | 845 | 26500 |

> Diese Sword-xp@Basis-Werte = die bisherige `*_blade`-XP-Skala, aber linear auf 2 Bars normiert (Sword ist jetzt 2-Bar-Standard). „xp pro Bar" treibt alle anderen Typen: 1-Bar-Item ≈ ½ Sword-xp, 3-Bar-Item ≈ 1,5× Sword-xp, 5-Bar-Body ≈ 2,5× Sword-xp. Konkrete xp je Item stehen in §4.

---

## 4. Vollständige Item × Tier Tabellen (alle 19 × 12)

Reihenfolge der Tiers in jeder Tabelle: Copper, Bronze, Iron, Steel, Blacksteel, Mithril, Adamantium, Runite, Bloodiron, Titanium, Aetherium, Godiron. `aIMs` = `attackIntervalMs`. `attackReq`/`defReq` = Trage-`requirements` (= Smelt-Lvl). IDs durchgehend `<metall>_<suffix>`.

### 4.1 DAGGER — `<tier>_dagger` · mainhand · aIMs **−500** · 1 Bar

| Tier | mDmg | acc | critChance | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 3 | 10 | 0.06 | 1 | 1 | 3000 | 2 | 20 |
| Bronze | 5 | 15 | 0.06 | 5 | 5 | 4000 | 3 | 50 |
| Iron | 9 | 27 | 0.07 | 10 | 10 | 4500 | 3 | 90 |
| Steel | 12 | 38 | 0.07 | 20 | 20 | 6000 | 8 | 240 |
| Blacksteel | 17 | 53 | 0.07 | 30 | 30 | 8000 | 14 | 360 |
| Mithril | 24 | 72 | 0.07 | 40 | 40 | 8000 | 18 | 560 |
| Adamantium | 30 | 91 | 0.08 | 50 | 50 | 9000 | 34 | 920 |
| Runite | 37 | 114 | 0.08 | 60 | 60 | 10000 | 64 | 1600 |
| Bloodiron | 46 | 141 | 0.08 | 70 | 70 | 11000 | 120 | 2600 |
| Titanium | 56 | 171 | 0.09 | 80 | 80 | 12000 | 278 | 4000 |
| Aetherium | 67 | 205 | 0.09 | 90 | 90 | 13000 | 435 | 5600 |
| Godiron | 82 | 251 | 0.10 | 100 | 105 | 15000 | 845 | 8800 |

### 4.2 SWORD — `<tier>_sword` · mainhand · aIMs **0** · 2 Bars

| Tier | mDmg | acc | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|
| Copper | 5 | 8 | 1 | 1 | 4000 | 3 | 30 |
| Bronze | 8 | 12 | 5 | 5 | 5500 | 5 | 60 |
| Iron | 14 | 21 | 10 | 10 | 6500 | 6 | 120 |
| Steel | 20 | 30 | 20 | 20 | 11000 | 15 | 380 |
| Blacksteel | 28 | 42 | 30 | 30 | 13000 | 28 | 560 |
| Mithril | 38 | 57 | 40 | 40 | 12500 | 36 | 900 |
| Adamantium | 48 | 72 | 50 | 50 | 14500 | 68 | 1500 |
| Runite | 60 | 90 | 60 | 60 | 16500 | 128 | 2600 |
| Bloodiron | 74 | 111 | 70 | 70 | 18500 | 240 | 4200 |
| Titanium | 90 | 135 | 80 | 80 | 20500 | 555 | 6400 |
| Aetherium | 108 | 162 | 90 | 90 | 22500 | 870 | 9000 |
| Godiron | 132 | 198 | 100 | 105 | 26500 | 1690 | 14000 |

### 4.3 SCIMITAR — `<tier>_scimitar` · mainhand · aIMs **−300** · 2 Bars · +critChance

| Tier | mDmg | acc | critChance | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 4 | 8 | 0.05 | 1 | 1 | 4000 | 3 | 28 |
| Bronze | 7 | 13 | 0.05 | 5 | 5 | 5500 | 5 | 55 |
| Iron | 12 | 22 | 0.05 | 10 | 10 | 6500 | 6 | 110 |
| Steel | 17 | 32 | 0.06 | 20 | 20 | 11000 | 15 | 360 |
| Blacksteel | 24 | 45 | 0.06 | 30 | 30 | 13000 | 28 | 540 |
| Mithril | 32 | 61 | 0.06 | 40 | 40 | 12500 | 36 | 860 |
| Adamantium | 41 | 77 | 0.06 | 50 | 50 | 14500 | 68 | 1450 |
| Runite | 51 | 96 | 0.07 | 60 | 60 | 16500 | 128 | 2500 |
| Bloodiron | 63 | 118 | 0.07 | 70 | 70 | 18500 | 240 | 4000 |
| Titanium | 76 | 144 | 0.07 | 80 | 80 | 20500 | 555 | 6200 |
| Aetherium | 92 | 173 | 0.08 | 90 | 90 | 22500 | 870 | 8600 |
| Godiron | 112 | 211 | 0.08 | 100 | 105 | 26500 | 1690 | 13500 |

### 4.4 MACE — `<tier>_mace` · mainhand · aIMs **0** · 2 Bars · +defense

| Tier | mDmg | acc | defense | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 5 | 6 | 2 | 1 | 1 | 4000 | 3 | 30 |
| Bronze | 8 | 9 | 2 | 5 | 5 | 5500 | 5 | 60 |
| Iron | 14 | 15 | 4 | 10 | 10 | 6500 | 6 | 120 |
| Steel | 20 | 22 | 6 | 20 | 20 | 11000 | 15 | 380 |
| Blacksteel | 28 | 31 | 8 | 30 | 30 | 13000 | 28 | 560 |
| Mithril | 38 | 42 | 11 | 40 | 40 | 12500 | 36 | 900 |
| Adamantium | 48 | 53 | 14 | 50 | 50 | 14500 | 68 | 1500 |
| Runite | 60 | 66 | 18 | 60 | 60 | 16500 | 128 | 2600 |
| Bloodiron | 74 | 81 | 22 | 70 | 70 | 18500 | 240 | 4200 |
| Titanium | 90 | 99 | 27 | 80 | 80 | 20500 | 555 | 6400 |
| Aetherium | 108 | 119 | 32 | 90 | 90 | 22500 | 870 | 9000 |
| Godiron | 132 | 145 | 40 | 100 | 105 | 26500 | 1690 | 14000 |

### 4.5 AXE — `<tier>_axe` · mainhand 1H · aIMs **+150** · 2 Bars · `tool:{woodcutting, speedMult}`

| Tier | mDmg | acc | speedMult | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 5 | 6 | 0.92 | 1 | 1 | 4000 | 3 | 32 |
| Bronze | 8 | 10 | 0.90 | 5 | 5 | 5500 | 5 | 65 |
| Iron | 15 | 17 | 0.86 | 10 | 10 | 6500 | 6 | 130 |
| Steel | 21 | 24 | 0.82 | 20 | 20 | 11000 | 15 | 400 |
| Blacksteel | 29 | 34 | 0.78 | 30 | 30 | 13000 | 28 | 580 |
| Mithril | 40 | 46 | 0.74 | 40 | 40 | 12500 | 36 | 920 |
| Adamantium | 50 | 58 | 0.70 | 50 | 50 | 14500 | 68 | 1550 |
| Runite | 63 | 72 | 0.66 | 60 | 60 | 16500 | 128 | 2700 |
| Bloodiron | 78 | 89 | 0.62 | 70 | 70 | 18500 | 240 | 4300 |
| Titanium | 94 | 108 | 0.58 | 80 | 80 | 20500 | 555 | 6600 |
| Aetherium | 113 | 130 | 0.54 | 90 | 90 | 22500 | 870 | 9200 |
| Godiron | 139 | 158 | 0.50 | 100 | 105 | 26500 | 1690 | 14500 |

### 4.6 BATTLEAXE — `<tier>_battleaxe` · mainhand 1H · aIMs **+200** · 2 Bars · +1 smithLvl · +critDamage

| Tier | mDmg | acc | critDamage | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 6 | 6 | 0.25 | 2 | 1 | 4500 | 3 | 35 |
| Bronze | 9 | 10 | 0.26 | 6 | 5 | 6000 | 5 | 70 |
| Iron | 16 | 17 | 0.28 | 11 | 10 | 7000 | 6 | 135 |
| Steel | 23 | 24 | 0.30 | 21 | 20 | 11500 | 16 | 420 |
| Blacksteel | 32 | 34 | 0.31 | 31 | 30 | 13500 | 30 | 620 |
| Mithril | 44 | 46 | 0.32 | 41 | 40 | 13000 | 38 | 1000 |
| Adamantium | 55 | 58 | 0.33 | 51 | 50 | 15000 | 72 | 1650 |
| Runite | 69 | 72 | 0.34 | 61 | 60 | 17000 | 136 | 2900 |
| Bloodiron | 85 | 89 | 0.36 | 71 | 70 | 19000 | 255 | 4600 |
| Titanium | 103 | 108 | 0.37 | 81 | 80 | 21000 | 590 | 7000 |
| Aetherium | 124 | 130 | 0.38 | 91 | 90 | 23000 | 925 | 9800 |
| Godiron | 152 | 158 | 0.40 | 101 | 105 | 27000 | 1790 | 15000 |

### 4.7 SPEAR (2H) — `<tier>_spear` · mainhand twoHanded · aIMs **+200** · 2 Bars · +1 smithLvl · +evasion

| Tier | mDmg | acc | evasion | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 6 | 8 | 5 | 2 | 1 | 4500 | 3 | 45 |
| Bronze | 9 | 14 | 8 | 6 | 5 | 6000 | 5 | 80 |
| Iron | 16 | 24 | 14 | 11 | 10 | 7500 | 6 | 160 |
| Steel | 22 | 34 | 20 | 21 | 20 | 11500 | 16 | 440 |
| Blacksteel | 31 | 48 | 28 | 31 | 30 | 13500 | 30 | 660 |
| Mithril | 43 | 65 | 38 | 41 | 40 | 13000 | 38 | 1050 |
| Adamantium | 54 | 82 | 48 | 51 | 50 | 15000 | 72 | 1700 |
| Runite | 67 | 102 | 60 | 61 | 60 | 17000 | 136 | 3000 |
| Bloodiron | 83 | 126 | 74 | 71 | 70 | 19000 | 255 | 4800 |
| Titanium | 101 | 153 | 90 | 81 | 80 | 21000 | 590 | 7200 |
| Aetherium | 121 | 184 | 108 | 91 | 90 | 23000 | 925 | 10000 |
| Godiron | 148 | 224 | 132 | 101 | 105 | 27000 | 1790 | 15500 |

### 4.8 GREATAXE (2H) — `<tier>_greataxe` · mainhand twoHanded · aIMs **+900** · 3 Bars · +2 smithLvl · +critDamage

| Tier | mDmg | acc | critDamage | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 8 | 6 | 0.40 | 3 | 1 | 6500 | 4 | 55 |
| Bronze | 13 | 10 | 0.41 | 7 | 5 | 8000 | 7 | 95 |
| Iron | 23 | 18 | 0.45 | 12 | 10 | 9000 | 9 | 200 |
| Steel | 32 | 26 | 0.46 | 22 | 20 | 15000 | 23 | 560 |
| Blacksteel | 45 | 36 | 0.47 | 32 | 30 | 17000 | 42 | 860 |
| Mithril | 62 | 49 | 0.48 | 42 | 40 | 17000 | 54 | 1350 |
| Adamantium | 78 | 62 | 0.49 | 52 | 50 | 19000 | 102 | 2250 |
| Runite | 97 | 78 | 0.50 | 62 | 60 | 21000 | 192 | 3900 |
| Bloodiron | 120 | 96 | 0.52 | 72 | 70 | 23000 | 360 | 6300 |
| Titanium | 146 | 117 | 0.53 | 82 | 80 | 25000 | 835 | 9600 |
| Aetherium | 175 | 140 | 0.54 | 92 | 90 | 27000 | 1305 | 13500 |
| Godiron | 214 | 172 | 0.55 | 102 | 105 | 31000 | 2535 | 21000 |

### 4.9 GREATSWORD (2H) — `<tier>_greatsword` · mainhand twoHanded · aIMs **+1100** · 3 Bars · +2 smithLvl

| Tier | mDmg | acc | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|
| Copper | 9 | 6 | 3 | 1 | 6500 | 4 | 60 |
| Bronze | 15 | 10 | 7 | 5 | 8000 | 7 | 100 |
| Iron | 26 | 18 | 12 | 10 | 9500 | 9 | 210 |
| Steel | 37 | 25 | 22 | 20 | 15000 | 23 | 580 |
| Blacksteel | 52 | 35 | 32 | 30 | 17000 | 42 | 880 |
| Mithril | 70 | 48 | 42 | 40 | 17000 | 54 | 1400 |
| Adamantium | 89 | 60 | 52 | 50 | 19000 | 102 | 2300 |
| Runite | 111 | 75 | 62 | 60 | 21000 | 192 | 4000 |
| Bloodiron | 137 | 92 | 72 | 70 | 23000 | 360 | 6400 |
| Titanium | 166 | 112 | 82 | 80 | 25000 | 835 | 9800 |
| Aetherium | 200 | 135 | 92 | 90 | 27000 | 1305 | 14000 |
| Godiron | 244 | 165 | 102 | 105 | 31000 | 2535 | 22000 |

### 4.10 MAUL (2H) — `<tier>_maul` · mainhand twoHanded · aIMs **+1500** · 3 Bars · +2 smithLvl · +modifiers.str

| Tier | mDmg | acc | str | smithLvl | attackReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 11 | 5 | 2 | 3 | 1 | 6500 | 4 | 60 |
| Bronze | 17 | 8 | 2 | 7 | 5 | 8000 | 7 | 105 |
| Iron | 30 | 14 | 4 | 12 | 10 | 10000 | 9 | 220 |
| Steel | 43 | 20 | 4 | 22 | 20 | 15000 | 23 | 600 |
| Blacksteel | 60 | 28 | 5 | 32 | 30 | 17000 | 42 | 900 |
| Mithril | 82 | 38 | 6 | 42 | 40 | 17000 | 54 | 1400 |
| Adamantium | 103 | 48 | 7 | 52 | 50 | 19000 | 102 | 2300 |
| Runite | 129 | 60 | 8 | 62 | 60 | 21000 | 192 | 4000 |
| Bloodiron | 159 | 74 | 9 | 72 | 70 | 23000 | 360 | 6400 |
| Titanium | 194 | 90 | 10 | 82 | 80 | 25000 | 835 | 9800 |
| Aetherium | 232 | 108 | 11 | 92 | 90 | 27000 | 1305 | 14000 |
| Godiron | 284 | 132 | 12 | 102 | 105 | 31000 | 2535 | 22000 |

### 4.11 MED HELM — `<tier>_medhelm` · helmet · 1 Bar

| Tier | defense | maxHp | smithLvl | defReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|
| Copper | 2 | 6 | 1 | 1 | 3500 | 2 | 25 |
| Bronze | 3 | 8 | 5 | 5 | 5000 | 3 | 45 |
| Iron | 4 | 13 | 10 | 10 | 5000 | 3 | 80 |
| Steel | 6 | 18 | 20 | 20 | 7000 | 8 | 200 |
| Blacksteel | 8 | 24 | 30 | 30 | 8000 | 14 | 320 |
| Mithril | 11 | 31 | 40 | 40 | 8000 | 18 | 480 |
| Adamantium | 14 | 38 | 50 | 50 | 9000 | 34 | 800 |
| Runite | 17 | 47 | 60 | 60 | 10000 | 64 | 1300 |
| Bloodiron | 20 | 58 | 70 | 70 | 11000 | 120 | 2100 |
| Titanium | 24 | 70 | 80 | 80 | 12000 | 278 | 3200 |
| Aetherium | 29 | 83 | 90 | 90 | 13000 | 435 | 4600 |
| Godiron | 35 | 101 | 100 | 105 | 15000 | 845 | 7000 |

### 4.12 FULL HELM — `<tier>_fullhelm` · helmet · aIMs **+50** · 2 Bars · +1 smithLvl

| Tier | defense | maxHp | smithLvl | defReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|
| Copper | 4 | 9 | 2 | 1 | 4500 | 3 | 40 |
| Bronze | 5 | 13 | 6 | 5 | 6000 | 5 | 70 |
| Iron | 8 | 20 | 11 | 10 | 6000 | 6 | 110 |
| Steel | 11 | 28 | 21 | 20 | 7000 | 15 | 260 |
| Blacksteel | 15 | 37 | 31 | 30 | 8000 | 28 | 360 |
| Mithril | 19 | 49 | 41 | 40 | 8000 | 36 | 560 |
| Adamantium | 24 | 60 | 51 | 50 | 9000 | 68 | 920 |
| Runite | 29 | 74 | 61 | 60 | 10000 | 128 | 1500 |
| Bloodiron | 36 | 90 | 71 | 70 | 11000 | 240 | 2400 |
| Titanium | 43 | 109 | 81 | 80 | 12000 | 555 | 3600 |
| Aetherium | 52 | 130 | 91 | 90 | 13000 | 870 | 5200 |
| Godiron | 63 | 158 | 101 | 105 | 15000 | 1690 | 7800 |

### 4.13 PLATEBODY — `<tier>_platebody` · body · aIMs **+200** · 5 Bars (Go 6) · +2 smithLvl

| Tier | defense | maxHp | smithLvl | defReq | bars | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 8 | 20 | 3 | 1 | 5 | 9000 | 8 | 70 |
| Bronze | 11 | 28 | 7 | 5 | 5 | 10000 | 13 | 130 |
| Iron | 17 | 42 | 12 | 10 | 5 | 9000 | 15 | 200 |
| Steel | 24 | 60 | 22 | 20 | 5 | 12000 | 38 | 480 |
| Blacksteel | 32 | 80 | 32 | 30 | 5 | 14000 | 70 | 660 |
| Mithril | 42 | 105 | 42 | 40 | 5 | 13000 | 90 | 1000 |
| Adamantium | 52 | 130 | 52 | 50 | 5 | 15000 | 170 | 1650 |
| Runite | 64 | 160 | 62 | 60 | 5 | 17000 | 320 | 2700 |
| Bloodiron | 78 | 195 | 72 | 70 | 5 | 19000 | 600 | 4400 |
| Titanium | 94 | 235 | 82 | 80 | 5 | 21000 | 1390 | 6600 |
| Aetherium | 112 | 280 | 92 | 90 | 5 | 23000 | 2175 | 9400 |
| Godiron | 136 | 340 | 102 | 105 | 6 | 27000 | 5070 | 14500 |

### 4.14 CHAINBODY — `<tier>_chainbody` · body · **kein aIMs-Malus** · 4 Bars · +1 smithLvl · +evasion

| Tier | defense | maxHp | evasion | smithLvl | defReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 5 | 11 | 2 | 2 | 1 | 8000 | 6 | 55 |
| Bronze | 7 | 16 | 2 | 6 | 5 | 9000 | 10 | 105 |
| Iron | 11 | 24 | 4 | 11 | 10 | 8000 | 12 | 165 |
| Steel | 15 | 34 | 4 | 21 | 20 | 11000 | 30 | 400 |
| Blacksteel | 20 | 45 | 5 | 31 | 30 | 13000 | 56 | 560 |
| Mithril | 26 | 60 | 5 | 41 | 40 | 12000 | 72 | 860 |
| Adamantium | 32 | 74 | 5 | 51 | 50 | 14000 | 136 | 1400 |
| Runite | 40 | 91 | 6 | 61 | 60 | 16000 | 256 | 2300 |
| Bloodiron | 48 | 111 | 7 | 71 | 70 | 18000 | 480 | 3700 |
| Titanium | 58 | 133 | 7 | 81 | 80 | 20000 | 1110 | 5600 |
| Aetherium | 69 | 159 | 8 | 91 | 90 | 22000 | 1740 | 8000 |
| Godiron | 84 | 193 | 9 | 101 | 105 | 26000 | 3380 | 12500 |

### 4.15 PLATELEGS — `<tier>_platelegs` · legs · aIMs **+100** · 3 Bars · +1 smithLvl

| Tier | defense | maxHp | smithLvl | defReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|
| Copper | 5 | 11 | 2 | 1 | 6500 | 4 | 50 |
| Bronze | 7 | 16 | 6 | 5 | 8000 | 7 | 95 |
| Iron | 11 | 24 | 11 | 10 | 6500 | 9 | 125 |
| Steel | 15 | 34 | 21 | 20 | 11000 | 23 | 360 |
| Blacksteel | 20 | 45 | 31 | 30 | 11000 | 42 | 480 |
| Mithril | 26 | 60 | 41 | 40 | 11000 | 54 | 720 |
| Adamantium | 32 | 74 | 51 | 50 | 13000 | 102 | 1180 |
| Runite | 40 | 91 | 61 | 60 | 15000 | 192 | 1950 |
| Bloodiron | 48 | 111 | 71 | 70 | 16500 | 360 | 3100 |
| Titanium | 58 | 133 | 81 | 80 | 18000 | 835 | 4700 |
| Aetherium | 69 | 159 | 91 | 90 | 19500 | 1305 | 6800 |
| Godiron | 84 | 193 | 101 | 105 | 23000 | 2535 | 10200 |

### 4.16 GAUNTLETS — `<tier>_gauntlets` · gloves · 1 Bar

| Tier | defense | maxHp | smithLvl | defReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|
| Copper | 1 | 2 | 1 | 1 | 3000 | 2 | 18 |
| Bronze | 2 | 3 | 5 | 5 | 4000 | 3 | 35 |
| Iron | 3 | 5 | 10 | 10 | 4000 | 3 | 55 |
| Steel | 4 | 7 | 20 | 20 | 6000 | 8 | 140 |
| Blacksteel | 5 | 9 | 30 | 30 | 7000 | 14 | 220 |
| Mithril | 7 | 12 | 40 | 40 | 7000 | 18 | 340 |
| Adamantium | 8 | 15 | 50 | 50 | 8000 | 34 | 560 |
| Runite | 10 | 18 | 60 | 60 | 9000 | 64 | 920 |
| Bloodiron | 12 | 22 | 70 | 70 | 10000 | 120 | 1500 |
| Titanium | 15 | 26 | 80 | 80 | 11000 | 278 | 2300 |
| Aetherium | 18 | 31 | 90 | 90 | 12000 | 435 | 3300 |
| Godiron | 22 | 38 | 100 | 105 | 14000 | 845 | 5000 |

### 4.17 SABATONS — `<tier>_sabatons` · boots · 1 Bar (Werte = Gauntlets-Profil)

| Tier | defense | maxHp | smithLvl | defReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|
| Copper | 1 | 2 | 1 | 1 | 3000 | 2 | 18 |
| Bronze | 2 | 3 | 5 | 5 | 4000 | 3 | 35 |
| Iron | 3 | 5 | 10 | 10 | 4000 | 3 | 55 |
| Steel | 4 | 7 | 20 | 20 | 6000 | 8 | 140 |
| Blacksteel | 5 | 9 | 30 | 30 | 7000 | 14 | 220 |
| Mithril | 7 | 12 | 40 | 40 | 7000 | 18 | 340 |
| Adamantium | 8 | 15 | 50 | 50 | 8000 | 34 | 560 |
| Runite | 10 | 18 | 60 | 60 | 9000 | 64 | 920 |
| Bloodiron | 12 | 22 | 70 | 70 | 10000 | 120 | 1500 |
| Titanium | 15 | 26 | 80 | 80 | 11000 | 278 | 2300 |
| Aetherium | 18 | 31 | 90 | 90 | 12000 | 435 | 3300 |
| Godiron | 22 | 38 | 100 | 105 | 14000 | 845 | 5000 |

### 4.18 KITESHIELD — `<tier>_kiteshield` · offhand · 2 Bars · +1 smithLvl · +evasion · kein aIMs-Malus

| Tier | defense | maxHp | evasion | smithLvl | defReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 4 | 7 | 2 | 2 | 1 | 4500 | 3 | 35 |
| Bronze | 6 | 10 | 2 | 6 | 5 | 6000 | 5 | 70 |
| Iron | 8 | 16 | 4 | 11 | 10 | 5500 | 6 | 100 |
| Steel | 12 | 22 | 4 | 21 | 20 | 9000 | 15 | 320 |
| Blacksteel | 16 | 29 | 5 | 31 | 30 | 11000 | 28 | 500 |
| Mithril | 21 | 39 | 5 | 41 | 40 | 11000 | 36 | 640 |
| Adamantium | 26 | 48 | 5 | 51 | 50 | 13000 | 68 | 1050 |
| Runite | 32 | 59 | 6 | 61 | 60 | 14000 | 128 | 1700 |
| Bloodiron | 39 | 72 | 7 | 71 | 70 | 15000 | 240 | 2700 |
| Titanium | 47 | 86 | 7 | 81 | 80 | 16000 | 555 | 4000 |
| Aetherium | 56 | 103 | 8 | 91 | 90 | 17000 | 870 | 5800 |
| Godiron | 68 | 125 | 9 | 101 | 105 | 19000 | 1690 | 8800 |

### 4.19 TOWERSHIELD — `<tier>_towershield` · offhand · aIMs **+100** (träge) · 3 Bars · +1 smithLvl · KEIN evasion

| Tier | defense | maxHp | smithLvl | defReq | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|
| Copper | 6 | 7 | 2 | 1 | 6500 | 4 | 45 |
| Bronze | 9 | 10 | 6 | 5 | 8000 | 7 | 85 |
| Iron | 14 | 15 | 11 | 10 | 6500 | 9 | 130 |
| Steel | 19 | 22 | 21 | 20 | 11000 | 23 | 400 |
| Blacksteel | 26 | 29 | 31 | 30 | 11000 | 42 | 620 |
| Mithril | 34 | 38 | 41 | 40 | 11000 | 54 | 800 |
| Adamantium | 42 | 47 | 51 | 50 | 13000 | 102 | 1300 |
| Runite | 51 | 58 | 61 | 60 | 15000 | 192 | 2100 |
| Bloodiron | 62 | 70 | 71 | 70 | 16500 | 360 | 3300 |
| Titanium | 75 | 85 | 81 | 80 | 18000 | 835 | 5000 |
| Aetherium | 90 | 101 | 91 | 90 | 19500 | 1305 | 7200 |
| Godiron | 109 | 122 | 101 | 105 | 23000 | 2535 | 11000 |

### 4.20 ARROWHEADS — `<tier>_arrowheads` · `type:"material" stackable:true` · 1 Bar → 15 Stück · `bonus.ammoDamage`

| Tier | ammoDamage | smithLvl | dur(ms) | xp | value/Stück |
|---|---:|---:|---:|---:|---:|
| Copper | 2 | 1 | 3000 | 2 | 2 |
| Bronze | 3 | 5 | 3500 | 3 | 2 |
| Iron | 5 | 10 | 3500 | 2 | 3 |
| Steel | 7 | 20 | 4500 | 4 | 4 |
| Blacksteel | 9 | 30 | 6000 | 7 | 6 |
| Mithril | 12 | 40 | 6500 | 10 | 8 |
| Adamantium | 15 | 50 | 7500 | 19 | 11 |
| Runite | 19 | 60 | 8500 | 36 | 15 |
| Bloodiron | 24 | 70 | 9000 | 62 | 19 |
| Titanium | 29 | 80 | 9500 | 110 | 24 |
| Aetherium | 35 | 90 | 10500 | 195 | 30 |
| Godiron | 42 | 100 | 12000 | 365 | 40 |

> Arrowhead-smithLvl folgt jetzt dem Smith-Basis-Lvl des Tiers (nicht mehr dem alten Smelt-Offset). `loot.min/max = 15`. `ammoDamage` greift erst beim Pfeil-Crafting (Fletching).

---

## 5. Forge-Aktions-Schema (für content-dev)

Jede `forge_<tier>_<suffix>`-Aktion:
```
{ id:"forge_<tier>_<suffix>", name:{en,de}, skill:"smithing", category:"<tier>",
  durationMs:<dur>, xp:<xp>, levelRequired:<smithLvl>,
  inputs:[{ itemId:"<tier>_bar", qty:<bars> }],
  loot:[{ itemId:"<tier>_<suffix>", chance:1, min:1, max:1 }] }   // Arrowheads: min:15,max:15
```
Bar-Item je Tier: `copper_bar … godiron_bar` (alle existieren). Bar-Zahlen je Typ (fix über alle Tiers): dagger 1 · sword 2 · scimitar 2 · mace 2 · axe 2 · battleaxe 2 · spear 2 · greataxe 3 · greatsword 3 · maul 3 · medhelm 1 · fullhelm 2 · platebody 5 (Go 6) · chainbody 4 · platelegs 3 · gauntlets 1 · sabatons 1 · kiteshield 2 · towershield 3 · arrowheads 1.

Item-Definition je Zelle: `bonus`-Felder aus §4 · `slot`/`weaponStyle:"melee"`/`twoHanded`(Spear/Greataxe/Greatsword/Maul) · `requirements` (Waffe `attack`, Rüstung `defence` = Trage-Req) · `rarity` (§1) · `value` · ggf. `modifiers.str` (Maul) / `tool:{woodcutting,speedMult}` (Axe) / `attackIntervalMs` / `type:"material"+stackable` (Arrowheads).

---

## 6. Style-Parität (Kontrolle)

Schmieden liefert **Melee** + Metall-Munition. **Melee-intern** ist die DPS-Parität über die festen aIMs-/Damage-Faktoren gesichert: schnelle Waffen (Dagger −500, Scimitar −300) niedrigerer Rohschaden + crit; langsame (Greatsword +1100, Maul +1500) höchster Roh — effektive DPS vergleichbar, Wahl ist Burst-vs-Steady. Die neuen Typen füllen die DPS-Leiter lückenlos (1H: Dagger<Scimitar<Sword=Mace<Axe<Battleaxe; 2H: Spear<Greataxe<Greatsword<Maul), keine neuen Spitzen über Maul. Axe sitzt knapp über Sword (1.05·D, +150 aIMs) und bietet als einzige 1H-Waffe den Holzfäller-Doppelnutzen — eigene Nische ohne DPS-Cliff.
**Cross-Style:** Ranged-Parität über `ammoDamage` (Godiron-Pfeilköpfe 42) + Fletching-Bögen → Ranged = niedrigerer Roh, dafür crit/speed/evasion. Magic (Runecrafting) ist schmiedeunabhängig.
**Defense-Parität:** Chainbody (mobil, +evasion, kein aIMs-Malus) gibt DEX/INT-Builds eine Body-Option ohne Tempoverlust; Platebody bleibt der STR-Tank-Body. Towershield ersetzt das alte Square als reiner Tank-Schild. **Kein neuer Sim-Lauf nötig** — alle Werte aus den sim-validierten Copper/Iron/Godiron-Ankern interpoliert, keine neue Mechanik.

---

## 7. Apply-Reihenfolge für content-dev

Saubere Voll-Neuanlage (Saves brechen): pro Tier **alle 20 Typen** in §4-Reihenfolge anlegen, Tiers von Copper→Godiron. Pro Typ je Tier: (a) Item in `items` (§4-Werte + Bonus + requirements + value + rarity + slot/weaponStyle/twoHanded/modifiers/tool/material); (b) `forge_*`-Aktion (§5).

**Reihenfolge der 20 Typen:** dagger, sword, scimitar, mace, axe, battleaxe, spear, greataxe, greatsword, maul, medhelm, fullhelm, platebody, chainbody, platelegs, gauntlets, sabatons, kiteshield, towershield, arrowheads.
**Gesamt:** 20 × 12 = **240 Items + 240 forge-Aktionen.** Alte IDs (`*_blade/warblade/_warhammer/_2haxe/_2hmace/_breastplate/_legguards/_gloves/_boots/_helm/_squareshield`) entfallen — Save-Bump erforderlich. (`<tier>_axe` bleibt als ID bestehen.)

---

## 8. Kern-Kurve auf einen Blick

- **`D`-Index (Sword-mDmg):** 5 · 8 · 14 · 20 · 28 · 38 · 48 · 60 · 74 · 90 · 108 · 132 (×≈1,35/Tier).
- **`B`-Index (Body-def):** 8 · 11 · 17 · 24 · 32 · 42 · 52 · 64 · 78 · 94 · 112 · 136.
- **Waffen-Damage-Faktoren (×D):** Dagger 0.62 · Scimitar 0.85 · Sword 1.0 · Mace 1.0 · Axe 1.05 · Battleaxe 1.15 · Spear 1.12 · Greataxe 1.62 · Greatsword 1.85 · Maul 2.15.
- **aIMs (tier-fix):** Dagger −500 · Scimitar −300 · Sword/Mace 0 · Axe +150 · Battleaxe/Spear +200 · Greataxe +900 · Greatsword +1100 · Maul +1500.
- **Rüstung-Faktoren (×B):** MedHelm 0.26 · FullHelm 0.46 · Platebody 1.0 · Chainbody 0.62 · Platelegs 0.62 · Gauntlets/Sabatons 0.16 · Kiteshield 0.50 · Towershield 0.80.
- **Trage-Req = Tier-Smelt-Lvl** (1·5·10·20·30·40·50·60·70·80·90·105); Smith-`levelRequired` = Smith-Basis (1·5·10·20·30·40·50·60·70·80·90·100) + Offset.
- **forge-xp** an die `*_blade`/`smelt`-XP-Kurve gekoppelt, auf 2-Bar-Sword normiert, pro Bar-Zahl interpoliert.

**Doc-Pfad:** `G:\GameDev\design\smithing-stats-spec.md`
