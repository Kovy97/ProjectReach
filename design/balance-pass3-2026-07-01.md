# Balance Pass 3 — Exakte Zahlen-Spec (Endgame + Struktur), 2026-07-01

**Autor:** balance-designer · **Geltung:** NUR Zahlen-Spec (design/*.md). Kein Spiel-Code geändert.
content-dev / combat-dev / logic-dev pflegen die Werte 1:1 ein.
**Belege:** `design/sweep3-2026-07-01/{TRIAGE,05-minmaxer,15-endgame,03-magic,06-slayer,09-economy,16-gear}.md`
**Ist-Werte gelesen aus:** `packages/content/src/index.ts`
**Modell aus:** `packages/engine/src/character.ts` (computeStats) · `packages/engine/src/combat.ts` (XP-Routing) ·
`packages/engine/src/dungeon.ts` (combatLevel) · `packages/shared/src/index.ts` (activeStanceMods)

---

## 0) Auftrag & Leitplanken

Sweep 2 (balance-pass2) hat **Midgame-Parität** hergestellt (Spread von +40–60 % → ~8–10 %) und **0 Walls**.
Sweep 3 (20 gerichtete Spieler, Min-Maxer bis L90) zeigt: das **craftbare Endgame (L60–90) ist NICHT paritätisch**
(ranged −23…−26 %, magic −22…−25 % effektive DPS vs melee1h) plus **strukturelle Wurzeln** (Leder gibt kein `dex`;
CL-Formel benachteiligt Magier; Verkaufswert-Skew; 9 un-feuerbare Bögen).

**HARTE Leitplanke:** Nichts hier darf die erreichte **Midgame-Parität (L1–50)** oder die **0-Walls** brechen.
Alle Flat-/Uptime-Hebel greifen **nur ab req60 (Endgame)**; die strukturellen Hebel (dex, Stance) heben v. a. das
Endgame und lassen das (bereits paritätische) Frühgame höchstens minimal steigen — **nach Einpflegen re-simulieren
und ggf. trimmen** (Gate am Ende).

**Damage-Modell (character.ts):**
```
meleeDamage  = (1 + str·1.5 + power·0.8 + eq.meleeDamage)·dmgMult
rangedDamage =  dex·1.2 + ranged·1.0 + eq.rangedDamage        (+ ammoDamage/Schuss)
magicDamage  =  int·1.7 + magic_off·1.2 + eq.magicDamage      (+ Burn/Status)
critChance      = clamp((dex·0.2 + lck·0.3)/100 + eq.critChance, …)   (ranged +0.06)
attackIntervalMs = clamp(3000 − dex·20 + eq.attackIntervalMs, 800, 5000)·speedMult   (ranged ×0.90)
evasion         = 10 + dex·1 + defence·0.4 + eq.evasion
accuracy        = round((50 + dex·3 + offenseSkill·2 + eq.accuracy)·accMult)
```
→ **`dex` ist der Ranged-Attributhebel** (Damage + Crit + Tempo + Evasion + Accuracy). Genau dieser fehlt am Gear.

**Owner-Legende:** `[C]`=content-dev · `[K]`=combat-dev · `[L]`=logic-dev.

---

## 1) [C] HIDE-RÜSTUNG bekommt `dex`-Modifier (Root-Cause Ranged-Schwäche)

**Problem (05-minmaxer, confirmed):** Metall gibt `modifiers.str`, Stoff `modifiers.int` — **Leder gibt KEIN
Attribut**. Damit fehlt Ranged als einziger Klasse der Gear-Attributhebel (Metall→str→meleeDmg×1.5, Stoff→int→
magicDmg×1.7). Kompoundet mit Level: L90 ranged raw **264** vs melee1h **387**.

**Fix:** Jedes Hide-Stück ab `studded` bekommt `modifiers: { dex: N }` (Spiegel zur Metall-`str`/Stoff-`int`-Leiter,
Verteilung body>legs≈helm>vambraces≈boots). Set-Summen exakt an den Min-Maxer-Zielen (studded +4 … voidhide +15).
`cured`/`hardened`/`scaled` (T1–T3) bleiben **0 dex** (dort ist die Parität bereits ok; die Stance-Fix #7 hebt Frühgame).

### 1a) `modifiers.dex` je Stück (alt: kein modifiers-Block → **neu: `modifiers: { dex: N }`**)
| Tier (leatherworking-Gate) | helm | body | legs | vambraces | boots | Σ dex |
|---|---:|---:|---:|---:|---:|---:|
| studded_leather (50) | 1 | 2 | 1 | — | — | **4** |
| ironhide (60) | 1 | 2 | 1 | 1 | 1 | **6** |
| warhide (70) | 1 | 3 | 2 | 1 | 1 | **8** |
| dragonhide (82) | 2 | 4 | 3 | 2 | 1 | **12** |
| shadowhide (95) | 3 | 5 | 3 | 2 | 1 | **14** |
| voidhide (99) | 3 | 5 | 3 | 2 | 2 | **15** |

Item-IDs: `<tier>_helm/_body/_legs/_vambraces/_boots` (studded = `studded_leather_helm/_body/_legs/_vambraces/_boots`).
Wo `—` steht (studded vambraces/boots): **kein** modifiers-Block nötig.

**Monotonie je Slot** (nicht-fallend): helm 1·1·1·2·3·3 · body 2·2·3·4·5·5 · legs 1·1·2·3·3·3 · vamb 0·1·1·2·2·2 ·
boots 0·1·1·1·1·2 → **grün**. Σ 4·6·8·12·14·15 → **grün**.

**Wirkung (L90, dragonhide dex+12):** rangedDamage +14.4 · Tempo −240 ms (schneller) · critChance +0.024 · evasion +12 ·
accuracy +36. Zusammen mit #2 und #7 schließt das die Endgame-Lücke (Ziel L90 ranged raw 264→~322, s. Gate).
`dex` wird in `computeStats` bereits appliziert (`attr[id] += item.modifiers[id]`) → kein Engine-Change, kein toter Wert.

---

## 2) [C] OBERE RANGED-WAFFEN-FLATS un-tapern (craftbares L60–90 paritätisch)

**Problem (05-minmaxer, confirmed):** die oberen Longbow-Flats sind „oben getapert" (aetherium **78** vs
aetherium_scimitar 120). Der pass2-Buff wirkte früh/mittig, aber am craftbaren L90-Tier klafft der Roh-`attackDamage`.

**Entscheidung — MODERAT un-tapern (nicht die vollen Min-Maxer-104/112):** Die Stance-Fix (#7, +12 % DPS) und die
dex-Mods (#1) tragen den Großteil. Ein zu großer Flat würde **die godly/legendären Caps brechen** bzw. beim Re-Sim
überschießen. Darum runite→godiron nur `+12…+24 %`, und die legendären/godly-Bögen ziehen **im Gleichschritt** nach,
damit die Ordnung **craftbar < legendär < godly** und die Monotonie erhalten bleiben.

### 2a) LONGBOW — `bonus.rangedDamage` (nur req60+; ≤adamantium unverändert)
| id (ranged req) | alt | **neu** |
|---|---:|---:|
| runite_longbow (60) | 57 | **64** |
| bloodiron_longbow (70) | 65 | **74** |
| titanium_longbow (80) | 72 | **84** |
| aetherium_longbow (90) | 78 | **94** |
| godiron_longbow (99) | 82 | **102** |

### 2b) SHORTBOW — `bonus.rangedDamage` (nur req60+; bleibt < Longbow je Tier = −150 ms-Tempo-Kante)
| id (ranged req) | alt | **neu** |
|---|---:|---:|
| runite_shortbow (60) | 49 | **55** |
| bloodiron_shortbow (70) | 56 | **63** |
| titanium_shortbow (80) | 62 | **72** |
| aetherium_shortbow (90) | 67 | **80** |
| godiron_shortbow (99) | 71 | **86** |

### 2c) Legendär/godly + Unique NACHZIEHEN (Hierarchie + Monotonie halten)
| id | Feld | alt | **neu** | Grund |
|---|---|---:|---:|---|
| spectral_longbow (leg., req99) | rangedDamage | 88 | **108** | muss > godiron_longbow 102 bleiben |
| voidwing_greatbow (leg., req99) | rangedDamage | 92 | **112** | > spectral 108 (hat burn-DoT) |
| last_vengeance (godly, req99) | rangedDamage | 130 | **130** (unverändert) | > voidwing 112 = +18 godly-Marge; DoT via #4 |
| abyssal_tide_bow (epic-unique, req90) | rangedDamage | 64 | **96** | war schon < aetherium 78; muss ≥ aetherium 94 (frost-Identität bleibt) |

**Longbow-Leiter komplett (Monotonie-Check):** …49(adam) < **64 < 74 < 84 < 94 < 102 < 108 < 112 < 130** → grün.
**Shortbow-Leiter:** …42(adam) < **55 < 63 < 72 < 80 < 86** → grün; jeder Shortbow < gleich-Tier Longbow → grün.
Mid-Unique-Check (unverändert, kein Regress): spectral_hunter_bow 42 / stagstride 38 / skytalon 52 liegen weiter über
ihrem On-Tier-Metall.

> **MAGIE bewusst NICHT flat un-tapern** — s. #3. Magie hat am L90 bereits den **höchsten** Roh-Schaden (staff 410 >
> melee 387); ihr Endgame-Defizit ist **Intervall/Uptime**, nicht Flat. Ein Staff-Flat-Buff würde zudem godiron_staff
> 100 über den Cap `skarn_idol_staff` 105 / `last_condemnation` 115 drücken. Darum Magie = #3, nicht #2.

---

## 3) [C]/[K] MAGIE-ENDGAME = INTERVALL/UPTIME (kein Flat)

**Problem (05-minmaxer + 03-magic, confirmed):** L90 Magie hat den höchsten Roh-Schaden, aber langsames Intervall
(staff ~2900 / wand ~2600 vs melee 2025) + Mana-Downtime (Weak-Cast ×0.35) fressen den Vorsprung. Früh/mittig ist
Magie paritätisch (L20 −5 %, L40 +5 %) → **nur req60+ anfassen**.

### 3a) STAFF — `bonus.attackIntervalMs` ERGÄNZEN (alt: kein Feld = 0)
| id (magic_off req) | alt | **neu** |
|---|---:|---:|
| runite_staff (60) | — | **−100** |
| bloodiron_staff (70) | — | **−140** |
| titanium_staff (80) | — | **−180** |
| aetherium_staff (90) | — | **−220** |
| godiron_staff (99) | — | **−240** |

### 3b) WAND — `bonus.attackIntervalMs` ÄNDERN (Basis −300)
| id (magic_off req) | alt | **neu** |
|---|---:|---:|
| runite_wand (60) | −300 | **−315** |
| bloodiron_wand (70) | −300 | **−330** |
| titanium_wand (80) | −300 | **−340** |
| aetherium_wand (90) | −300 | **−350** |
| godiron_wand (99) | −300 | **−360** |

### 3c) `manaCost` am Endgame senken (Weak-Cast-Downtime raus, sekundärer Hebel)
| id | alt | **neu** |
|---|---:|---:|
| aetherium_staff | 10 | **8** |
| godiron_staff | 10 | **8** |
| aetherium_wand | 8 | **7** |
| godiron_wand | 8 | **7** |

*≤adamantium (req50) staff/wand `attackIntervalMs`/`manaCost` **unverändert** → Frühgame-Parität unangetastet. Der
Tempo-Bonus setzt bewusst am req60-Endgame-Einstieg ein (analog Metall-Set-Tempo).* Ziel: L90 magic aDPS 120→~140.
**magicDamage-Flats aller Staffs/Wands bleiben, godly-Caps unangetastet.**

---

## 4) [C] RANGED-ENDGAME-DoT für die Top-Bögen (Armor+Regen-Bypass)

**Problem (15-endgame, confirmed):** Melee (bleed) und Magie (burn) tragen einen DoT, der **Rüstung UND Gegner-Regen**
umgeht; die godly-Bögen haben **keinen** → reiner Direktschaden, den Top-Def (Mitigation bis 0,80) am härtesten
beschneidet und Regen nicht durchbricht. An den zähesten L90-Zielen liegt Ranged ~1,5–2× hinter Magie/Melee.

**Empfehlung: DoT geben (strukturell), NICHT rDmg 130→150** (Flat wird mitigiert + bypassed Regen nicht). Bleed
(„Blutungspfeil") ist der thematische Ranged-Konter; bewusst schwächer als melee-`last_judgement` (bleed 0.55/45/8000)
und magic-`last_condemnation` (burn 0.60/48/7000), weil Ranged zusätzlich Crit/Tempo/dex-Speed führt.

### 4) `weaponEffect` ERGÄNZEN
| id | Rarity | alt | **neu** |
|---|---|---|---|
| last_vengeance | godly | (kein weaponEffect) | **`{ type: "bleed", chance: 0.40, magnitude: 30, durationMs: 7000 }`** |
| spectral_longbow | legendary | (kein weaponEffect) | **`{ type: "bleed", chance: 0.35, magnitude: 22, durationMs: 7000 }`** |

`voidwing_greatbow` trägt bereits burn 0.40/30/6500 → unverändert. `last_vengeance` rDmg bleibt 130 (kein Doppelbuff).

> **[K] Guard-Hinweis:** `ranged-vs-magic.test.ts` pinnt lt. 15-endgame „Ranged trägt per Design KEINEN DoT". Bereits
> heute haben `ashfall_recurve` (burn) / `abyssal_tide_bow` (frost) einen weaponEffect → der Guard prüft vermutlich das
> **Stil-Verhalten**, nicht einzelne Waffen; nach Einpflegen **kurz gegenprüfen**. Falls er godly-Bogen-DoTs verbietet:
> öffnen für per-Waffen-Effekte auf last_vengeance/spectral_longbow (Design-Intent ändert sich bewusst).

---

## 5) [C] MAGIE/RANGED-WAFFEN-VERKAUFSWERT cappen (Craft-Vendor-Skew)

**Problem (09-economy, confirmed):** bei Schadens-Parität verkaufen craftbare Magie-/Fernkampf-Waffen für das
**2,5–4,6×** der Nahkampf-Waffe (steel_staff 560 vs steel_sword 150 bei gleichem Kampfnutzen). Regel:
`sellPrice = round(value·0.5)`.

**Fix:** `value` je req-Tier auf **~1,25× des schadensgleichen Melee-Peers** (1H-Sword) cappen — für **alle**
longbow/shortbow/staff/wand-Tiers. Ziel-`value` = `round(1.25 · sword_value)`:

| req | sword_value | **Ziel-value (alle 4 Waffenlinien)** |
|---:|---:|---:|
| 1 | 30 | **38** |
| 5 | 60 | **75** |
| 10 | 80 | **100** |
| 20 | 150 | **190** |
| 30 | 260 | **325** |
| 40 | 350 | **440** |
| 50 | 600 | **750** |
| 60 | 800 | **1000** |
| 70 | 1000 | **1250** |
| 80 | 1300 | **1600** |
| 90 | 1700 | **2100** |
| 99 | 2400 | **3000** |

### 5a) Explizite id→alt→neu (Ist-Werte gelesen; alle → Ziel-value des req-Tiers)
| Tier | longbow alt→neu | shortbow alt→neu | staff alt→neu | wand alt→neu |
|---|---|---|---|---|
| copper (1) | 30→**38** | 24→**38** | 50→**38** | 28→**38** |
| bronze (5) | 60→**75** | 55→**75** | 95→**75** | 55→**75** |
| iron (10) | 120→**100** | 100→**100** | 200→**100** | 110→**100** |
| steel (20) | 380→**190** | 260→**190** | 560→**190** | 340→**190** |
| blacksteel (30) | 560→**325** | 380→**325** | 860→**325** | 520→**325** |
| mithril (40) | 900→**440** | 600→**440** | 1350→**440** | 840→**440** |
| adamantium (50) | 1500→**750** | 980→**750** | 2250→**750** | 1400→**750** |
| runite (60) | 2600→**1000** | 1700→**1000** | 3900→**1000** | 2400→**1000** |
| bloodiron (70) | 4200→**1250** | 2700→**1250** | 6300→**1250** | 3800→**1250** |
| titanium (80) | 6400→**1600** | 4200→**1600** | 9600→**1600** | 5800→**1600** |
| aetherium (90) | 9000→**2100** | 5800→**2100** | 13500→**2100** | 8200→**2100** |
| godiron (99) | 14000→**3000** | 9000→**3000** | 21000→**3000** | 13000→**3000** |

*Sword-`value` bleibt unverändert (Anker). Godly/legendäre Drop-Bögen/Stäbe (spectral 25000, last_* 60000, skarn 25000)
sind **keine** Craft-Vendor-Quelle → `value` unverändert.* Keine Kauf<Verkauf-Schleife: keine dieser Waffen ist
shop-kaufbar (09-economy verifiziert) → reiner Sell-Value-Fix.

---

## 6) [C] 9 UN-FEUERBARE BÖGEN — `ammoType` auf ≤ Bogen-req senken

**Problem (06-slayer, confirmed):** `ammoType`-Munition verlangt höheres `ranged`-Level als der Bogen → Bogen
ausrüstbar, aber nie feuerbar (`outOfAmmo`, 0 DPS). **Regel: ammoReq ≤ bowReq.** (Arrow-reqs: bronze5·iron10·steel20·
blacksteel30·mithril40·adamantium50·aetherium90·godiron99.)

| Bogen (ranged req) | ammoType alt (req) | **ammoType neu (req)** |
|---|---|---|
| stolen_shortbow (7) | iron_arrow (10) | **bronze_arrow (5)** |
| ashwood_longbow (14) | steel_arrow (20) | **iron_arrow (10)** |
| ashfall_recurve (18) | steel_arrow (20) | **iron_arrow (10)** |
| skeletal_longbow (18) | steel_arrow (20) | **iron_arrow (10)** |
| antler_warbow (18) | steel_arrow (20) | **iron_arrow (10)** |
| stagstride_longbow (24) | mithril_arrow (40) | **steel_arrow (20)** |
| spectral_hunter_bow (28) | mithril_arrow (40) | **steel_arrow (20)** |
| skytalon_recurve (50) | runite_arrow (60) | **adamantium_arrow (50)** |
| abyssal_tide_bow (90) | godiron_arrow (99) | **aetherium_arrow (90)** |

> **KORREKTUR ggü. TRIAGE/06-Vorschlag:** `spectral_hunter_bow` (req28) → **steel_arrow (req20)**, NICHT `blacksteel_arrow`.
> blacksteel_arrow verlangt ranged **30 > 28** → bliebe im Fenster 28–29 weiter unfeuerbar (verletzt die eigene Regel).
> Die drei r18-Bögen (ashfall/skeletal/antler) → iron_arrow (r10), da steel_arrow (r20) > 18. *Alternative je Bogen:
> statt ammoType senken die `requirements.ranged` auf die Munitionsstufe heben — hier bewusst ammoType gesenkt (Prompt).*

**[K/L] Dauer-Absicherung:** Guard-Test „für jeden Bogen: ammoType.requirements.ranged ≤ bow.requirements.ranged"
ergänzen (fängt künftige Regressionen).

---

## 7) [K] RANGED-DEFAULT-STANCE `precise` = DPS-Falle → speedMult 1.12 → 1.0

**Problem (TRIAGE #7 / Midgame):** Default `rangedStance = "precise"` (character.ts:90) hat `speedMult 1.12` (12 %
langsamer) → Default liest 71–80 % vom Besten (−20…−29 % Kills/h).

**Empfehlung: `precise` speedMult 1.12 → 1.0** (NICHT Default auf `fast` umstellen — `fast` kostet −10 % Accuracy, das
verschlechtert frische Spieler). Damit ist der Default keine Falle mehr, die drei Stances bleiben ein sauberes Dreieck:

`shared/index.ts` → `activeStanceMods()`, ranged-`default`(precise)-Zweig:
```
return { accMult: STYLE_ACCURACY_MULT, dmgMult: 1, defMult: 1, speedMult: 1.12, xpSkill: "ranged" };
                                                                  ^^^^ 1.12 → 1.0
```
`fast` (0.85, −Acc) bleibt die Max-DPS-Glass-Option, `defensive` (1.12, +Def) die Tank-Option — Trade-off intakt.

**Wirkung: +12 % Ranged-DPS auf ALLEN Levels** (der stärkste Einzelhebel). Hebt Frühgame −11 %→~+1 %, Midgame −12 %→~0 %,
Endgame −23 %→~−11 % — verbessert Parität überall, ohne Melee/Magie zu berühren. **Wichtig:** dieser Hebel + #1 + #2
können am Endgame nahe an oder leicht über Parität landen → **Re-Sim-Gate**: falls Ranged >+10 % voraus, aetherium/godiron-
Longbow-Flat (#2a) um 1 Stufe zurücknehmen (94→88 / 102→96).

---

## 8) [C] voidhide zum echten BiS (nicht Survivability-Downgrade vs shadowhide)

**Problem (16-gear F1, confirmed):** der L99-Ranged-Cap `voidhide` (T9) verliert ggü. T8 `shadowhide` massiv Defense
(FULL def 149 vs 192, evasion 107 vs 186, maxHp 350 vs 420) und gewinnt nur Offense → Progressions-Cliff am Cap,
inkonsistent mit godiron/voidweave (die ihren Vorgänger auf **jeder** Achse dominieren).

**Fix:** voidhide-Teile Defense/Evasion/maxHp anheben + Set-Bonus, sodass **FULL voidhide ≥ FULL shadowhide auf jeder
Achse** und Offense-Cap bleibt (Glass-Cannon-Richtung bleibt: voidhide ist weit unter Metall-godiron def, nur nicht
mehr unter seinem eigenen Vorgänger). `rangedDamage`-Flats der Teile bleiben; dex-Mods aus #1 (Σ15) kommen additiv dazu.

### 8a) voidhide-Teile `bonus` (alt → **neu**; rangedDamage unverändert)
| id | defense | evasion | maxHp |
|---|---|---|---|
| voidhide_helm | 29→**40** | 19→**34** | 65→**82** |
| voidhide_body | 48→**64** | 28→**50** | 108→**148** |
| voidhide_legs | 38→**50** | 24→**44** | 83→**108** |
| voidhide_vambraces | 17→**24** | 12→**22** | 47→**56** |
| voidhide_boots | 17→**24** | 12→**22** | 47→**56** |

### 8b) `voidhide_set`-Bonus (alt → **neu**)
`{ evasion: 12, rangedDamage: 24, critChance: 0.04, critDamage: 0.18 }` →
**`{ evasion: 26, rangedDamage: 24, critChance: 0.05, critDamage: 0.20 }`**

**FULL voidhide neu (Teile+Set, VOR dex):** def **202** · evasion **198** · maxHp **450** · rangedDamage **63** ·
critChance **0.05** · critDamage **0.20**.
**FULL shadowhide (Teile+Set):** def 192 · evasion 186 · maxHp 420 · rangedDamage 46 · critChance 0.03 · critDamage 0.12.
→ voidhide **dominiert auf jeder Achse** (mit dex Σ15 > shadow Σ14 bleibt der Abstand). Vs dragonhide (T7) ebenfalls
strikt höher → **Leder-Kette monoton, Cap-Cliff weg**. def 202 << Metall-godiron ~393 → Leder=Evasion/Glass-Identität bleibt.

*(P3, optional 16-gear F2: `warhide_set` critChance 0→0.02, um den kosmetischen critChance-Dip der Leder-Set-Kette zu
glätten. Kein Balance-Effekt. Owner content-dev, falls Achsen-Monotonie erwünscht.)*

---

## 9) [L]/[K] combatLevel-KOHÄRENZ (dungeon.ts) — alle 3 Stile ~gleich schnell CL

**Formel (dungeon.ts:17–25):** `CL = round(0.25·(defence+vitality) + 0.5·max(meleeOff, rangedOff, magicOff))` mit
`meleeOff=(attack+power)/2 · rangedOff=ranged · magicOff=(magic_off+magic_def)/2`.

**Problem A (03-magic, confirmed, von 3 Agenten):** `magic_def` trainiert nur beim **Einstecken** von burn/frost/shock →
bei offensivem Caster praktisch 1. Der `/2`-Mittel halbiert den Magie-Offense-Term: magic_off 29 → Term (29+1)/2 = **15**
→ CL 18, während Melee (power 20 → Term 24,5) CL 22 erreicht — obwohl der Magier am meisten Schaden macht.

**Problem B (TRIAGE #9):** Ranged (`ranged` allein, ×1.2 XP) klettert im CL schneller (Lean); nach dem Magie-Fix
klettert Magie identisch schnell (beide Single-Skill ×1.2), Melee wegen `(attack+power)/2`-Mittel am langsamsten.

### Empfohlene KOHÄRENTE Kombination

**9a) [L] `magicOffense = magic_off` allein** (dungeon.ts:21) — den `magic_def`-Mittel streichen:
```
const magicOffense = (lvl("magic_off") + lvl("magic_def")) / 2;   →   const magicOffense = lvl("magic_off");
```
Nachrechnung (03-magic-Sim): Magier-Term 15→**29**, CL 18→**25** — symmetrisch zu Ranged (`ranged` allein). `magic_def`
bleibt voll wirksam als Defensiv-Skill (`computeStats.defense`), verzerrt aber nicht mehr das Kampf-Niveau. **Muss-Fix (P2).**

**9b) [K] RANGED_XP_FACTOR 1.2→1.1 UND MAGIC_XP_FACTOR 1.2→1.1** (combat.ts:365–366, **symmetrisch lassen**).
Nach 9a klettern Ranged und Magie CL-identisch (Single-Skill × Faktor); beide leicht (~−0,4 CL) Richtung Melee ziehen,
ohne die Ressourcen-Paritäts-Invariante (beide Stile gleicher Faktor) zu brechen. Der Term-Fix 9a dominiert → Magie
bleibt klar über dem alten Wert. **(P3, Feintrimm.)**

**9c) Melee-Kill-Bonus-Split: NICHT nötig — geprüft, verworfen.** Der Kill-Bonus (`monster.xp`) ist klein gegenüber der
akkumulierten Treffer-XP; ihn 55/45 zu splitten (statt 100 % → attack) hebt `power`/`meleeOffense` nur ~+0,5 CL und
verlangsamt zugleich `attack`/Accuracy. Der Rest-Rückstand von Melee (~1–2 CL bei gleichem Aufwand) ist ein **bewusstes,
faires Gegengewicht** (Melee ist der stärkste DPS-Stil, 05-minmaxer) — Melee trainiert zwei Offense-Skills separat.

**Netto-Erwartung (gleicher Aufwand):** Ranged ≈ Magie, Melee ~1–2 CL darunter. **Gate:** nach 9a/9b eine
Gleich-Aufwand-3-Stile-CL-Sim (seed 3, 90 Min, gleiches Mob-Band) fahren; Ziel Spread ≤ ~2 CL. Falls Magie/Ranged > 2 CL
über Melee → Faktoren 1.1 → 1.05. **[K] Guards updaten:** `ranged-xp.test.ts` / `kill-xp.test.ts` / `over-level.test.ts`
pinnen Faktor 1.2 → auf 1.1 anpassen; ein etwaiger `combatLevel`-Test auf die magic_off-Formel nachziehen.

---

## Kompakt-Zusammenfassung + Owner

| # | Thema | Kern-Änderung | Owner |
|---|---|---|---|
| 1 | Hide-`dex` (Root-Cause) | 6 Hide-Tiers `modifiers.dex` (Σ studded 4 … voidhide 15), monoton | **C** |
| 2 | Ranged-Flats un-tapern | 10 longbow/shortbow-Flats (req60+) + 3 leg./godly + abyssal nachziehen | **C** |
| 3 | Magie Uptime | 5 staff + 5 wand `attackIntervalMs` (req60+) + 4 endgame `manaCost` | **C** (+K QA) |
| 4 | Ranged-DoT | last_vengeance bleed 0.40/30/7000 · spectral_longbow bleed 0.35/22/7000 | **C** (K Guard) |
| 5 | Waffen-`value`-Cap | 48 longbow/shortbow/staff/wand `value` → 1,25× Sword-Peer je Tier | **C** |
| 6 | 9 un-feuerbare Bögen | 9 `ammoType` auf ≤ bow-req senken (+ Guard) | **C** (+K/L Guard) |
| 7 | Ranged-Default-Stance | precise `speedMult` 1.12→1.0 (shared/index.ts) | **K** |
| 8 | voidhide BiS | 5 Teile def/eva/maxHp + Set-Bonus (FULL ≥ shadowhide jede Achse) | **C** |
| 9 | combatLevel-Kohärenz | `magicOffense=magic_off` (L) + RANGED/MAGIC_XP_FACTOR 1.2→1.1 (K); Kill-Split verworfen | **L + K** |

## Apply-Reihenfolge (empfohlen)
**6 → 5 → 8 → 1 → 2 → 4 → 3 → 7 → 9.**
(Erst die reinen/risikoarmen Fixes: kaputte Bögen (6), Ökonomie (5), Gear-Cap (8). Dann die Ranged-Damage-Hebel
1+2+4, dann Magie-Uptime 3, dann der starke Stance-Hebel 7, zuletzt die Engine/CL-Kohärenz 9 mit Guard-Updates.)

## GATE nach dem Einpflegen (Pflicht — kein Overshoot, Midgame/0-Walls halten)
1. **Geared 3-Stile-Sim** (Ranged=Leder+dex, Magie=Stoff, Melee=Metall) L20/40/60/90, 0-Tode-normiert:
   Ziel **alle drei ±10 % effektive DPS/Tier**. Falls **Ranged >+10 %** voraus → aetherium/godiron-Longbow-Flat (#2a)
   94→88 / 102→96 zurücknehmen. Falls **Magie <−10 %** am L90 → staff `attackIntervalMs` −20 weiter bzw. `manaCost` −1.
2. **0-Walls-Regression:** boar L10, alle 4 Finalbosse, Regen-Mobs weiter in allen 3 Stilen 0-Tode killbar (15-endgame-Set).
3. **Gleich-Aufwand-CL-Sim** (#9-Gate): Spread ≤ ~2 CL.
4. **Guards grün:** content-integrity / styles / ranged-vs-magic / set-bonus / wiring-audit / ranged-xp / kill-xp /
   over-level / tower-monsters — mit den in #4/#6/#9 genannten Guard-Anpassungen.

**Godly-Cap-Checks (alle grün):** longbow godiron 102 < spectral 108 < voidwing 112 < last_vengeance 130 ·
shortbow godiron 86 < longbow godiron 102 · staff/wand-Flats unverändert (godiron_staff 100 < skarn 105 < last_cond. 115).
