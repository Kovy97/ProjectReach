# Balance Pass 2 — Exakte Zahlen-Spec (2026-07-01)

**Autor:** balance-designer · **Freigabe:** Chef (komplette Liste zur Umsetzung freigegeben)
**Geltung:** NUR Zahlen-Spec. Kein Spiel-Code geändert. content-dev / combat-dev pflegen die Werte 1:1 ein.
**Belege:** `design/sweep2-2026-07-01/{01-ranged,02-magic,03-melee,05-midgame,06-endgame,12-slayer-dungeons,TRIAGE}.md`
**Ist-Werte gelesen aus:** `packages/content/src/index.ts` · **Schadensmodell aus:** `packages/engine/src/{character.ts,combat.ts}` + `packages/shared/src/index.ts`

---

## Schadensmodell (Grundlage aller Zahlen unten)

Aus `character.ts` + `combat.ts` + `shared`:

```
meleeDamage  = (1 + str·1.5 + power·0.8 + eq.meleeDamage) · dmgMult
rangedDamage =  dex·1.2 + ranged·1.0 + eq.rangedDamage        (+ ammoDamage pro Schuss, combat.ts:773)
magicDamage  =  int·1.7 + magic_off·1.2 + eq.magicDamage      (+ Burn/Frost/Shock-Status)

attackDamage = style-Wert oben
maxHit  = round(attackDamage · 1.4815)      (DMG_MAX_HIT_MULT)
Treffer = uniform[round(maxHit·0.35) .. maxHit]   → Mittelwert ≈ attackDamage (DPS-neutral)
Crit    = attackDamage·(1−reduction)·critDamage
avgHit  ≈ attackDamage·(1−reduction)·(1 + critChance·(critDamage−1))
Intervall(ranged) = base · 0.90   (character.ts:261, schnellere Schüsse)
DPS ≈ hitChance · avgHit / (Intervall/1000)   [ + Burn-DoT bei Magie ]
```

**Kernbefund (Beleg 05-midgame):** mit on-level Tier-Gear tötet **Nahkampf L20–51 ~1.45× so schnell** wie Fern-/Magie
(steel: `steel_scimitar` meleeDamage **31** vs `steel_longbow` **10** vs `steel_staff` **14**; adamantium **62/26/33**). Weil
`DPS ∝ attackDamage` (Intervall/Crit/Reduction unverändert), braucht Fern-/Magie **≈ +45 % attackDamage** im Midgame.
**Endgame ist bereits paritätisch** (Beleg 06: last_idol-TTK melee 6 s · ranged 5 s · magic 5 s — BiS-Ranged/Magie sogar
leicht voraus), weil dort der Nicht-Waffen-Term (`dex·1.2 + ammoDamage`, `int·1.7`) den flachen Waffen-Bonus dominiert und
die Stile natürlich konvergieren. **⇒ Buff früh/mittig stark, oben getapert** — genau das, was die godly/legendären
Waffen-Caps (spectral_longbow 88, last_vengeance 130; skarn_idol_staff 105, last_condemnation 115) ohnehin erzwingen.

> **Kalibrier-Hinweis (wichtig für combat-dev/QA):** Die +45 %-Messung stammt aus einem Sim mit **Metallrüstung auf allen
> Stilen** (kein dex/int aus Gear für Fern/Magie) = Worst Case. Real trägt Ranged Leder (dex) / Magie Stoff (int) → realer
> Abstand kleiner. Die Ladder unten schließt bewusst **~60–70 %** der Metall-Sim-Lücke (Midgame-`attackDamage` +20–30 %),
> nicht die vollen +45 %, um in Real-Rüstung nicht zu überschießen. **Nach Einpflegen: geared Sim je Stil mit
> realistischer Rüstung (Ranged=Leder, Magie=Stoff) gegen L20/L40/L60-Mobs fahren; falls Melee > +10 % voraus, Ladder
> um ~1 Tier-Stufe nachziehen.**

---

## 1) DREI-STILE-PARITÄT — neue `rangedDamage` / `magicDamage` je Tier

Nur das Feld `rangedDamage` bzw. `magicDamage` im `bonus`-Block ändern; alle anderen Felder (accuracy, critChance,
critDamage, attackIntervalMs, ammoType, manaCost, weaponEffect, requirements, value, rarity) **unverändert**.
Tier-Req-Level: copper 1 · bronze 5 · iron 10 · steel 20 · blacksteel 30 · mithril 40 · adamantium 50 · runite 60 ·
bloodiron 70 · titanium 80 · aetherium 90 · godiron 99.

### 1a) LONGBOW — `rangedDamage`
| Tier (ranged req) | alt | **neu** |
|---|---|---|
| copper_longbow (1) | 3 | **6** |
| bronze_longbow (5) | 5 | **10** |
| iron_longbow (10) | 9 | **17** |
| steel_longbow (20) | 12 | **25** |
| blacksteel_longbow (30) | 15 | **33** |
| mithril_longbow (40) | 20 | **41** |
| adamantium_longbow (50) | 26 | **49** |
| runite_longbow (60) | 31 | **57** |
| bloodiron_longbow (70) | 39 | **65** |
| titanium_longbow (80) | 48 | **72** |
| aetherium_longbow (90) | 57 | **78** |
| godiron_longbow (99) | 70 | **82** |

*godiron 82 < spectral_longbow 88 (legendär) < last_vengeance 130 (godly) → Hierarchie intakt.*

### 1b) SHORTBOW — `rangedDamage` (bleibt bewusst unter Longbow: −150 ms Tempo-Kante)
| Tier | alt | **neu** |
|---|---|---|
| copper_shortbow (1) | 3 | **5** |
| bronze_shortbow (5) | 4 | **9** |
| iron_shortbow (10) | 7 | **15** |
| steel_shortbow (20) | 10 | **22** |
| blacksteel_shortbow (30) | 13 | **28** |
| mithril_shortbow (40) | 17 | **35** |
| adamantium_shortbow (50) | 21 | **42** |
| runite_shortbow (60) | 26 | **49** |
| bloodiron_shortbow (70) | 32 | **56** |
| titanium_shortbow (80) | 40 | **62** |
| aetherium_shortbow (90) | 48 | **67** |
| godiron_shortbow (99) | 59 | **71** |

**Zusätzlich (bestätigter Content-Bug, Beleg 01-ranged P2):** copper/bronze/iron/steel_shortbow fehlt
`attackIntervalMs: -150` im `bonus` (erst ab blacksteel gesetzt). **Ergänzen** — sonst ist der Kurzbogen früh strikt
schlechter als der Langbogen. (blacksteel…godiron haben es bereits.)

### 1c) STAFF — `magicDamage` (Burn-DoT kompensiert Rest → etwas weniger Flat nötig als Ranged)
| Tier (magic_off req) | alt | **neu** |
|---|---|---|
| copper_staff (1) | 3 | **5** |
| bronze_staff (5) | 6 | **11** |
| iron_staff (10) | 10 | **17** |
| steel_staff (20) | 14 | **25** |
| blacksteel_staff (30) | 19 | **33** |
| mithril_staff (40) | 26 | **42** |
| adamantium_staff (50) | 33 | **52** |
| runite_staff (60) | 41 | **62** |
| bloodiron_staff (70) | 50 | **72** |
| titanium_staff (80) | 62 | **84** |
| aetherium_staff (90) | 74 | **94** |
| godiron_staff (99) | 90 | **100** |

*godiron 100 < skarn_idol_staff 105 (legendär) < last_condemnation 115 (godly) → Hierarchie intakt. manaCost unverändert.*

### 1d) WAND — `magicDamage` (1H, −300 ms, Control-Status → niedrigere Roh-Basis als Staff)
| Tier | alt | **neu** |
|---|---|---|
| copper_wand (1) | 2 | **4** |
| bronze_wand (5) | 4 | **7** |
| iron_wand (10) | 7 | **12** |
| steel_wand (20) | 11 | **18** |
| blacksteel_wand (30) | 16 | **24** |
| mithril_wand (40) | 22 | **31** |
| adamantium_wand (50) | 29 | **40** |
| runite_wand (60) | 36 | **48** |
| bloodiron_wand (70) | 42 | **55** |
| titanium_wand (80) | 48 | **62** |
| aetherium_wand (90) | 53 | **67** |
| godiron_wand (99) | 58 | **70** |

**⚠ Mid-Unique-Prüfung (content-dev):** Nach dem Buff prüfen, dass die **lootbaren mittleren** Magie-/Fern-Uniques noch
ÜBER dem gleich-Band-Metalltier liegen — sonst neue Inversion. Kandidaten: `witchroot_wand` (magic_off 26),
`wailing_wand` (28), `pyre_staff` (36), `frosthex_wand` (68), `mirrorglass_bow`, `stagstride_longbow` (24),
`spectral_hunter_bow` (28), `skytalon_recurve` (50), `frostcaverns_bow` (~74). Jedes, das jetzt unter dem gebufften
Metalltier seiner Bandbreite liegt, um denselben Faktor mit anheben.

**Owner: content-dev** (alle 48 Waffen-Flats + 4 Shortbow-Intervalle + Mid-Unique-Check).

---

## 2) 2H-MELEE VIABEL — neue `meleeDamage` + Intervall

**Problem (Beleg 03-melee):** „schnelle 1H + Schild" schlägt jedes 2H auf **beiden** Achsen (dagger+Schild 816 kills/h,
+68 def/+125 hp vs. bester 2H greatsword 642). Ursache: flache Gear-`str`-Mods setzen sich auf schnellen Waffen in mehr
DPS um; 2H hat zusätzlich keinen Schild-Slot. **Fix = Roh-`meleeDamage` rauf (Chef-Wunsch) + Intervall runter** (der
Intervall-Hebel wandelt den ohnehin hohen 2H-Flat in DPS, ohne den godly-Cap `last_judgement` meleeDamage **400** zu
verletzen — deshalb bekommt der Maul primär Tempo, nicht Flat).

Ziel: 2H-DPS ≈ **+8…12 % über 1H+Schild** (echter Offense-für-Defense-Trade). Parität (#1) ist am **1H+Schild**-Melee
kalibriert; 2H-Melee ist damit die bewusste „Glass-Cannon"-Melee-Nische (verzichtet auf Schild-def/hp/evasion), analog
Ranged=Krit/Tempo.

### 2a) `meleeDamage` (alt → neu)
| Tier | spear ×1.18 | greataxe ×1.22 | greatsword ×1.22 | maul ×1.08 |
|---|---|---|---|---|
| copper | 12→**14** | 16→**20** | 18→**22** | 22→**24** |
| bronze | 18→**21** | 26→**32** | 30→**37** | 34→**37** |
| iron | 32→**38** | 46→**56** | 52→**63** | 60→**65** |
| steel | 40→**47** | 58→**71** | 67→**82** | 77→**83** |
| blacksteel | 56→**66** | 81→**99** | 94→**115** | 108→**117** |
| mithril | 65→**77** | 93→**113** | 105→**128** | 123→**133** |
| adamantium | 81→**96** | 117→**143** | 134→**163** | 155→**167** |
| runite | 94→**111** | 136→**166** | 156→**190** | 181→**195** |
| bloodiron | 108→**127** | 156→**190** | 178→**217** | 207→**224** |
| titanium | 131→**155** | 190→**232** | 216→**264** | 252→**272** |
| aetherium | 157→**185** | 228→**278** | 260→**317** | 302→**326** |
| godiron | 192→**227** | 278→**339** | 317→**387** | 369→**399** |

*godiron greatsword 387 & maul 399 bleiben < last_judgement 400 (godly greatsword) → Hierarchie intakt.*

### 2b) `attackIntervalMs` (primärer DPS-Hebel — nur das Feld ändern)
| weaponType | alt | **neu** | Delta |
|---|---|---|---|
| spear (alle Tiers) | +120 | **+40** | −80 |
| greataxe (alle Tiers) | +550 | **+400** | −150 |
| greatsword (alle Tiers) | +650 | **+480** | −170 |
| maul (alle Tiers) | +900 | **+560** | −340 |

Maul bleibt die langsamste/„größte Hits"-Waffe (Intervall > alle anderen), nur nicht mehr straf-langsam. Spear behält
`evasion`, Greataxe/Greatsword ihr hohes `critDamage`, Maul seinen `str`-Modifier — Identitäten unverändert.

**Owner: content-dev** (48 meleeDamage-Werte + 4 Intervall-Konstanten). **Danach QA-Sim** (geared, 1H+Schild vs 2H) —
2H-DPS soll knapp führen, nicht davonziehen.

---

## 3) PFEIL-RANGED-REQUIREMENT (neue Chef-Regel)

Jeder Pfeil bekommt `requirements: { ranged: X }` = das `ranged`-Req seines Metall-Bogens. Bisher haben Pfeile **kein**
`requirements`-Feld.

| Pfeil (id) | ammoDamage | **neu: `requirements`** |
|---|---|---|
| copper_arrow | 1 | `{ ranged: 1 }` |
| bronze_arrow | 2 | `{ ranged: 5 }` |
| iron_arrow | 3 | `{ ranged: 10 }` |
| steel_arrow | 5 | `{ ranged: 20 }` |
| blacksteel_arrow | 6 | `{ ranged: 30 }` |
| mithril_arrow | 7 | `{ ranged: 40 }` |
| adamantium_arrow | 9 | `{ ranged: 50 }` |
| runite_arrow | 11 | `{ ranged: 60 }` |
| bloodiron_arrow | 14 | `{ ranged: 70 }` |
| titanium_arrow | 17 | `{ ranged: 80 }` |
| aetherium_arrow | 20 | `{ ranged: 90 }` |
| godiron_arrow | 38 | `{ ranged: 99 }` |

**⚠ Engine-Hinweis (combat-dev/logic-dev):** Der **Ammo-Equip-Pfad** muss `requirements` prüfen. `meetsRequirements`
(`equipment.ts`) liest heute nur die Mainhand-Reqs; der Munitions-Equip-Flow (Köcher belegen) muss dieselbe Prüfung gegen
das `ranged`-Level durchlaufen, sonst ist das neue Feld tot. Guard/Test in `ammo-quiver.test.ts` entsprechend erweitern.

**Owner: content-dev** (12 `requirements`-Felder) + **combat-dev/logic-dev** (Equip-Pfad-Enforcement).

---

## 4) voidweave-SET-INVERSION — voidweave (L99) klar > godspark (L85)

**Ist (Beleg TRIAGE + Items):** voidweave (magic_off/runecrafting 99) hat **weniger** Magieschaden als godspark (85):
Set-Bonus `magicDamage` **13 < 17**, Item-Summe magicDamage **58 < 81**, **kein** critDamage/manaRegen, weniger `int`.
Ziel: voidweave ist das eindeutige oberste Magie-Set. Defense/evasion/maxHp/wis von voidweave bleiben (ohnehin schon
höher); nur die Offense-Achsen anheben.

### 4a) Item-`bonus` + `modifiers` (alt → neu; nur genannte Felder ändern)
| Item | Feld | alt | **neu** |
|---|---|---|---|
| voidweave_mitre | magicDamage | 10 | **20** |
| | accuracy | 18 | **20** |
| | critChance | 0.02 | **0.03** |
| | manaRegen | — | **0.4** |
| | modifiers int / wis | 2 / 5 | **4 / 6** |
| voidweave_vestment | magicDamage | 17 | **32** |
| | accuracy | 26 | **28** |
| | critChance | 0.03 | **0.05** |
| | critDamage | — | **0.15** |
| | manaRegen | — | **0.4** |
| | modifiers int / wis | 2 / 7 | **6 / 7** |
| voidweave_skirt | magicDamage | 11 | **22** |
| | accuracy | 18 | **20** |
| | manaRegen | — | **0.4** |
| | modifiers int / wis | 1 / — | **4 / 2** |
| voidweave_handwraps | magicDamage | 10 | **20** |
| | accuracy | 17 | **19** |
| | critChance | 0.02 | **0.03** |
| | manaRegen | — | **0.4** |
| | modifiers int / wis | — / 4 | **4 / 4** |
| voidweave_sandals | magicDamage | 10 | **20** |
| | accuracy | 17 | **19** |
| | critChance | 0.01 | **0.03** |
| | manaRegen | — | **0.4** |
| | modifiers int / wis | — / — | **3 / 2** |

Item-magicDamage-Summe neu **114** (> godspark 81); int-Summe **21** (> godspark 15); wis-Summe **21** (> godspark 12);
critDamage + manaRegen jetzt vorhanden. Defense/evasion/maxHp unverändert (bereits > godspark).

### 4b) `voidweave_set`-Bonus (alt → neu)
`{ magicDamage: 13, accuracy: 22, critChance: 0.03 }` → **`{ magicDamage: 22, accuracy: 22, critChance: 0.05, critDamage: 0.18 }`**

(godspark_vestment_set-Bonus bleibt `{ magicDamage: 17, accuracy: 18, critChance: 0.04, critDamage: 0.15 }` → voidweave
jetzt auf **jeder** Achse ≥ godspark.)

**Owner: content-dev.**

---

## 5) METALL-SET-TEMPO — monotone `attackIntervalMs`-Fortsetzung

**Ist:** copper_set −100, iron_set −150, **steel_set+ keins** → Aufstieg verliert die Tempo-Kante. Fortsetzung monoton,
mit gedämpften Schritten (Soft-Cap −300), weil das ein reiner — kleiner — Melee-Speed-Perk ist und die Parität (#1) nicht
wieder aufreißen soll (≈ +1–2 % DPS/Stufe). Nur das Feld `attackIntervalMs` im Set-`bonus` ergänzen/ändern.

| Set (minPieces) | attackIntervalMs alt | **neu** |
|---|---|---|
| copper_set (5) | −100 | −100 (unverändert) |
| iron_set (5) | −150 | −150 (unverändert) |
| steel_set (5) | — | **−175** |
| mithril_set (3) | — | **−200** |
| adamantium_set (3) | — | **−220** |
| runite_set (3) | — | **−240** |
| bloodiron_set (3) | — | **−260** |
| titanium_set (3) | — | **−280** |
| aetherium_set (3) | — | **−290** |
| godiron_set (3) | — | **−300** |

*(Hinweis: bronze/blacksteel haben aktuell gar kein Metall-Set — optional später ergänzen, nicht Teil dieses Passes.)*
**Owner: content-dev.** combat-dev/QA re-verifiziert kurz, dass der Perk die #1-Parität nicht kippt (erwartet: nein).

---

## 6) SLAYER-TOWER-ETAGEN 2–5 — neue Level/Stats für 8 `tower_*`-Klone

**Problem (Beleg 12):** die `tower_*`-Klone liegen 2–3× über ihrem Etagen-Band → ~1/5 der Tower-Tasks am Freischalt-Niveau
unkillbar (`kills=0` im Sim), inkonsistente XP/Task. Etagen-Bänder: Et.1 L1–19 · Et.2 L20–39 · Et.3 L40–59 · Et.4 L60–79 ·
Et.5 L80–99. Neue Werte = **Top-of-Band** (Klon bleibt Etagen-Apex, aber am Unlock fair machbar), skaliert an den nativen
Etagen-Mobs (z.B. Et.2 `ashfield_wraith` L38: hp290/dmg52/def14/xp78/g96; Et.3 `forge_demon` L54: hp320/dmg46/def22/xp165;
Et.5 `abyssal_devourer` L96: hp1200/dmg140/def36/xp2300).

**Etage 1 (L1–19): bereits im Band — `tower_goblin` (L15), `tower_goblin_rogue` (L19) UNVERÄNDERT lassen.**

| Klon (Etage) | Feld | alt → **neu** |
|---|---|---|
| **tower_skeleton_warrior** (2) | level | 65 → **36** |
| | maxHp | 886 → **275** |
| | damage | 62 → **48** |
| | accuracy | 115 → **88** |
| | evasion | 18 → **14** |
| | defense | 34 → **22** |
| | xp | 230 → **68** |
| | gold | 244 → **90** |
| **tower_skeleton_archer** (2) | level | 68 → **38** |
| | maxHp | 777 → **260** |
| | damage | 68 → **54** |
| | accuracy | 124 → **94** |
| | evasion | 28 → **26** |
| | defense | 26 → **14** |
| | xp | 250 → **78** |
| | gold | 280 → **96** |
| **tower_ember_elemental** (3) | level | 168 → **50** |
| | maxHp | 1000 → **280** |
| | damage | 135 → **42** |
| | accuracy | 128 → **90** |
| | evasion | 46 → **22** |
| | defense | 70 → **24** |
| | xp | 800 → **130** |
| | gold | 338 → **165** |
| **tower_iron_revenant** (3) | level | 175 → **56** |
| | maxHp | 1225 → **360** |
| | damage | 152 → **50** |
| | accuracy | 134 → **94** |
| | evasion | 35 → **14** |
| | defense | 84 → **34** |
| | regen | 4 → **3** |
| | xp | 1000 → **180** |
| | gold | 388 → **200** |
| **tower_frost_hound** (4) | level | 182 → **74** |
| | maxHp | 1370 → **560** |
| | damage | 168 → **76** |
| | accuracy | 140 → **102** |
| | evasion | 62 → **40** |
| | defense | 80 → **26** |
| | regen | 4 → **4** (unverändert) |
| | xp | 1180 → **820** |
| | gold | 428 → **262** |
| **tower_roc_void** (5) | level | 233 → **94** |
| | maxHp | 2880 → **1120** |
| | damage | 275 → **134** |
| | accuracy | 180 → **124** |
| | evasion | 84 → **30** |
| | defense | 116 → **34** |
| | regen | 5 → **5** (unverändert) |
| | xp | 6720 → **2150** |
| | gold | 862 → **305** |

Alle `resist`/`inflict`/`enrage`/`loot`/`attackIntervalMs`/`slayerFloor`/`zone` **unverändert** (nur Level + Kampfstats +
xp/gold). Danach ist jeder Klon der zäheste Mob seiner Etage, aber am Unlock-Level besiegbar; XP/Task innerhalb der Etage
konsistent (z.B. Et.2 `bone_stalker` 58 vs `tower_skeleton_archer` 78 statt vorher 250).

**⚠ Guard-Test (combat-dev/logic-dev):** `packages/engine/src/tower-monsters.test.ts:14` erlaubt Drift NUR in
`id|zone|slayerFloor` und zementiert damit die (falschen) Basis-Level. **Öffnen** für `level` + Kampfstats + `xp/gold`
(die Klone sind laut Content-Kommentar `:10835` bewusst „unabhängig editierbar"). Ohne diese Lockerung kann content-dev
die Werte nicht einpflegen, ohne den Guard rot zu machen.

**Owner: content-dev** (8 Monster-Stat-Blöcke) + **combat-dev/logic-dev** (Guard lockern).

---

## 7) DEFAULT-STANCE-WALL @ boar L10 — SICHERSTER Fix

**Root Cause (bestätigt Engine-seitig):** In der Default-Melee-Stance `combatStyle: "attack"` routet
`activeStanceMods().xpSkill` **alle** Offensiv-XP nur an `attack` (`shared/index.ts`, `combat.ts:399-411`). Damit trainiert
`power` **nie** → `meleeDamage = 1 + str·1.5 + power·0.8 + eq` bleibt niedrig (power=1; und `str` wächst kaum, da
`trained[str] = power + woodcutting` ebenfalls untrainiert). Ein frischer Melee levelt nur Treffsicherheit, nicht Schaden →
Wall am `boar` (L10, hp230). **Das trifft nicht nur boar** — jeder reine Attack-Stance-Melee bleibt dauerhaft unter der
Midgame-Parität (die Sim setzte power=level; ein Default-Spieler hat power=1).

### Empfehlung: **ENGINE-Fix (XP-Routing) — der sichere, ursächliche Fix.**
Attack-Stance splittet die Melee-Offensiv-XP statt sie zu 100 % an `attack` zu geben:

- **`attack`-Stance: 55 % XP → `attack`, 45 % XP → `power`.** (Power/Defence-Stance bleiben rein: 100 % → power bzw.
  defence — Identität erhalten.)

Konkret in `grantOffenseXp` (`combat.ts:399`): wenn `style==="melee"` und `combatStyle==="attack"`, den Betrag
`damage·MELEE_XP_PER_DAMAGE·xpMult` **aufteilen** (0.55 an `attack`, 0.45 an `power`) statt an einen Skill. Ranged/Magie
und die anderen Melee-Stances unverändert. `style-xp-parity.test.ts` prüft XP-pro-Schaden gesamt — Split lässt die Summe
gleich; Guard bleibt grün (kurz gegenprüfen).

**Warum nicht Content-only (stärkere Basiswaffen):** würde die Wall nur verschieben, nicht heilen — `power` bleibt bei 1,
der Melee bleibt midgame-weit unter Parität. Nur ein Pflaster.

### Optionaler Content-Zusatz (Sicherheitsnetz, nicht Ersatz): frühe Basiswaffen leicht anheben
Falls der Chef ZUSÄTZLICH früh mehr Luft will (nur die drei Starter/frühen 1H-Basisschwerter, kleiner Bump):
| Item | Feld | alt → **neu** |
|---|---|---|
| rusty_sword | meleeDamage | 3 → **5** |
| bronze_sword (attack 5) | meleeDamage | 16 → **18** |
| iron_sword (attack 10) | meleeDamage | 28 → **31** |

**Owner: combat-dev (XP-Routing = Kennzeichnung ENGINE, Primärfix)** · optionaler Bump = content-dev.

---

## 8) KLEINERE PUNKTE (Empfehlungen + exakte Werte wo sinnvoll)

### 8a) aether_essence-Rezept-Stufen-Kopplung
`aether_essence`-Quellen sind hochstufig (thieving `plunder…` L95 / `desecrate_reliquary` L85 / `appraise_idol` L95;
`tower_roc_void` L94; früheste Drops ~L55), aber Rezepte verbrauchen es früher: `craft_mithril_focus` (L40),
`enchant_aether_runestaff`/`enchant_aether_orb` (L45), `craft_aether_rune` (L50). → L40–50-Magiehandwerker kommen ohne
L55+-Grind nicht an die Zutat.
**Empfehlung: FRÜHERE QUELLE** (bessere Progression als Rezepte hochgaten). content-dev streut `aether_essence` in
**1–2 Welt-Mobs L45–55** (ashfields/blackthorn) als Drop `chance 0.12–0.18, min 1 max 1`. Damit sind die L40–50-Rezepte
on-level bedienbar; die Rezept-`levelRequired` bleiben. **Owner: content-dev** (Mob wählen).

### 8b) Content-Lücken (Füller)
- **jewelcrafting L20–34** (keine Aktion): eine Schleif-/Fass-Aktion einschieben, Ziel-**XP/h ≈ 2.500–4.000** (Kurve
  `target_xph`, Referenz ~820/h@L1 → ~9.3k@L50). z.B. Cut eines Mid-Gems (levelRequired ~26, durationMs ~4000, xp so
  gesetzt, dass xp·3600/dur im Zielband liegt).
- **farming L50–62** (keine Crop): eine Crop-Linie einschieben, Ziel-**XP/h ≈ 9.000–13.000**.
**Owner: content-dev** (Inhalt designen; Zahlen an obige XP/h-Ziele legen).

### 8c) godiron_arrow-Restquellen
Nur req-99-Bögen feuern `godiron_arrow`; Quelle = L120+-Krabben (+ godiron via Fletching). Als BiS-Munition korrekt
gegated. **Empfehlung: LASSEN** — nur sicherstellen, dass die **Fletching-Aktion** für `godiron_arrow` existiert (Ranged-
Ökonomie = Fletching, Beleg 01). Kein Zahlen-Change.

### 8d) Heal-Trank-Doppel-Linie
`greater_healing_potion` (heal 70) vs `potion_greater_heal` (heal 150) — DE-Name identisch, Heilung verschieden (ditto
minor). **Empfehlung: BEHALTEN + DISTINKT UMBENENNEN** (kein Save-Migration-Risiko; die reine Umbenennung ist bereits im
Fix-Pass-2 als autonom markiert). Konsolidierung (eine Linie streichen) nur, wenn der Chef die Redundanz aktiv weg will —
dann Migration nötig. **Empfehlung des balance-designer: behalten + umbenennen.** **Owner: content-dev** (Namen).

### 8e) Endgame-Gold/XP-Inflation + Finale-Schwierigkeit — nur Empfehlung
- **Gold/XP-Inflation** (idolhall 1.2–2.0 Mio g/h; last_idol ~58k XP/Kill): Chef-akzeptiert lt. Briefing. **NICHT
  anfassen** — kein Blocker, gewollter Idle-Payoff.
- **Finale-Schwierigkeit (nicht-monoton, Beleg 06):** die finale Zone (idolhall) ist die **leichteste** (last_idol def 64
  /hp 2000, TTK 5–6 s; davor void_titan L242 def168/hp3580 = 14 s). **Optionale** Empfehlung, damit das Finale sich wie
  eins anfühlt (rein defensiv, verschiebt keine Parität): `last_idol` **defense 64 → 110**, **maxHp 2000 → 3200**
  (bleibt unter void_titan, verdreifacht aber nicht die TTK). Nur wenn der Chef den Peak am Ende will — **kein Muss**.
  **Owner: content-dev** (falls gewünscht).

---

## Kompakt-Zusammenfassung + Owner je Punkt

| # | Thema | Kern-Änderung | Owner |
|---|---|---|---|
| 1 | Stil-Parität | 48 neue rangedDamage/magicDamage-Flats (früh/mittig stark, oben getapert unter godly-Cap) + 4 Shortbow `-150`-Intervalle | **content-dev** |
| 2 | 2H viabel | 48 neue meleeDamage (+8–22 %) + 4 Intervall-Kürzungen (spear/greataxe/greatsword/maul) | **content-dev** |
| 3 | Pfeil-Req | 12 Pfeile bekommen `requirements:{ranged:X}` | **content-dev** + **combat-dev/logic-dev** (Equip-Pfad prüft Ammo-Reqs) |
| 4 | voidweave-Inversion | 5 Item-Bonusblöcke + Set-Bonus rauf (magicDamage-Summe 58→114, +critDamage/manaRegen/int) | **content-dev** |
| 5 | Metall-Set-Tempo | steel_set…godiron_set `attackIntervalMs −175…−300` (monoton) | **content-dev** |
| 6 | Tower-Etagen 2–5 | 6 Klone auf Band-Level+Stats (Et.1 unverändert) | **content-dev** + **combat-dev/logic-dev** (Guard `tower-monsters.test.ts` für level/stats öffnen) |
| 7 | Boar-Default-Wall | **Engine:** attack-Stance splittet XP 55 % attack / 45 % power (+ optional 3 Basiswaffen-Bumps) | **combat-dev** (Engine-Routing) · optional content-dev |
| 8a | aether_essence | frühere Quelle: Drop in 1–2 Mobs L45–55 | **content-dev** |
| 8b | Content-Lücken | jewelcrafting L20–34 (~2.5–4k XP/h), farming L50–62 (~9–13k XP/h) | **content-dev** |
| 8c | godiron_arrow | lassen; Fletching-Rezept sicherstellen | **content-dev** |
| 8d | Heal-Doppel-Linie | behalten + distinkt umbenennen (keine Konsolidierung) | **content-dev** |
| 8e | Finale-Schwierigkeit | optional last_idol def 64→110 / hp 2000→3200; Gold/XP-Inflation lassen | **content-dev** (optional) |

**Apply-Reihenfolge (empfohlen):** 3 → 4 → 5 → 6 (+Guard) → 1 → 2 → 7 (Engine) → 8. Nach 1+2+7: **geared QA-Sim je Stil mit
realistischer Rüstung** (Ranged=Leder, Magie=Stoff) L20/L40/L60 + 1H+Schild-vs-2H — falls Melee > +10 % voraus, Fern/Magie
bzw. 2H um eine Tier-Stufe nachziehen. Parität-Ziel: alle drei Stile ± ~10 % effektive DPS pro Tier, distinkte Identität
erhalten (melee=Lifesteal/roh + 2H-Burst-Nische; ranged=Krit/Tempo; magic=Mana/Status/DoT).
