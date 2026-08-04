# Ranged- & Magie-Voll-Stat-Spec + Element-Essenz-/Runen-Platzierung

**Autor:** Balance-Designer · **Datum:** 2026-06-26 · **Status:** Reine Spec/Zahlen — KEIN Code, KEINE Content-Änderung. 1:1-Vorlage für content-dev.
**Aufbauend auf:** `design/smithing-stats-spec.md` (Tier-Schaden-Index `D` 5→132, Level-Anker, forge-XP-Kurve), `design/ranged-magic-tiers-plan.md`, `design/rune-system-plan.md`, `design/magic-system-plan.md`. Anker-Content: `packages/content/src/index.ts`; Felder aus `packages/shared/src/index.ts`.

> **Chef-Vorgaben umgesetzt:** Ranged = **nur Short + Long Bow** (keine Crossbows/Greatbows), je 12 Tiers + **Pfeile `*_arrow` für alle 12 Tiers** (schließt die heutige 5-Tier-Lücke). Magie = Wand/Staff/Focus je 12 Tiers, Staff mit eingebautem eskalierendem `weaponEffect`, `manaCost` pro Waffe. Alle Tier-Gear-Werte geben echte, monoton steigende Stat-Boni (Parität zu Smithing/Melee). Element-Essenzen + Runen tier-gestaffelt über die Monster-Leiter, Aether mid-/endgame, Void endgame. Enchant-Rezepte mit kombinierbaren Effekten.

---

## 0. Engine-Abhängigkeiten (MUSS der Chef routen, bevor manche Felder greifen)

Drei Felder aus dieser Spec existieren **heute noch nicht** im Datenmodell (`packages/shared/src/index.ts`). Die Zahlen sind trotzdem final; content-dev kann alles **außer** diesen dreien sofort anwenden. Routing an logic-dev/combat-dev:

| Feld | Wo | Heute | Bedarf | Betrifft |
|---|---|---|---|---|
| `manaCost?: number` | `ItemDef` (Magie-Waffe) | nur globale `MANA_PER_CAST=6` | per-Waffe-Manakosten (§5 Tabellen) | logic-dev (Typ) + combat-dev (Cast-Resolution liest Waffen-`manaCost`) |
| `maxMana?` / `manaRegen?` | `EquipBonus` | nur `maxHp` | Focus-Offhand soll +Mana-Pool/Regen geben (§5.3) | logic-dev (`EquipBonus` + `computeStats`) |
| `weaponEffects?: [...]` (Array) | `ItemDef` | nur **ein** `weaponEffect` | kombinierte Mehrfach-Status (Void-Fusion-Enchants §8) | combat-dev (Status-Apply-Loop über Array) |

**Bis dahin (Fallback, kein Blocker):** Magie-Waffen ohne `manaCost`-Feld nutzen den globalen `MANA_PER_CAST`-Default — die Waffe funktioniert, nur die Tier-Manakurve fehlt. Focus ohne `maxMana`-Bonus gibt vorerst nur `magicDamage`/`accuracy`/`critChance` (alles in `EquipBonus` vorhanden) — der Mana-Teil kommt nach. Enchants mit **einem** Effekt + Stat-Boni gehen **heute** (1 `weaponEffect` + beliebig viele `bonus`-Felder ist erlaubt); nur echte 2-Status-Fusionen warten auf das Array-Feld.

`StatusType` = `burn | frost | shock | poison | bleed` (fix). **Es gibt KEINEN „aether"- oder „void"-Status** — Aether-/Void-Runen liefern daher `magicDamage`-Boni bzw. **Kombinationen vorhandener** Status (burn+bleed), keinen Eigenstatus. Das ist in allen Tabellen unten so verdrahtet.

---

## 1. Kern-Kurve (geteilt mit Smithing)

| # | Tier | Lvl-Anker | Trage-Req | Craft-Req (Fletch/RC) | `D` (Index) | Rarity |
|---|------|---:|---:|---:|---:|---|
| 1 | Copper | 1 | 1 | 1 | **5** | common |
| 2 | Bronze | 5 | 5 | 5 | **8** | common |
| 3 | Iron | 10 | 10 | 10 | **14** | common |
| 4 | Steel | 20 | 20 | 20 | **20** | common |
| 5 | Blacksteel | 30 | 30 | 30 | **28** | magic |
| 6 | Mithril | 40 | 40 | 40 | **38** | rare |
| 7 | Adamantium | 50 | 50 | 50 | **48** | rare |
| 8 | Runite | 60 | 60 | 60 | **60** | epic |
| 9 | Bloodiron | 70 | 70 | 70 | **74** | epic |
| 10 | Titanium | 80 | 80 | 80 | **90** | legendary |
| 11 | Aetherium | 90 | 90 | 90 | **108** | legendary |
| 12 | Godiron | 100/105 | 105 | 100 | **132** | legendary |

- **Ranged Trage-Req** = `requirements.ranged` = Trage-Req-Spalte. **Bogen-Craft-Req** = `requirements.fletching` = Craft-Req-Spalte.
- **Magie Trage-Req** = `requirements.magic_off` = Trage-Req-Spalte. **Stab/Wand/Focus-Craft-Req** = `requirements.runecrafting` = Craft-Req-Spalte.
- Identität (verbindlich): **Ranged** = etwas niedrigerer Roh + crit/Tempo/evasion + Munitions-Bonus obendrauf. **Magie** = etwas niedrigerer Roh + Status-DoT/Control + Mana-Loop.
- `aIMs` = `bonus.attackIntervalMs` (additiver Offset auf das Basis-Intervall, wie bei Melee — negativ = schneller).

---

## 2. RANGED — Archetyp-Faktoren (gelten in jedem Tier)

| Archetyp | id-Suffix | Slot | `rangedDamage` | `accuracy` | aIMs | Sonder-`bonus` | ammoType |
|---|---|---|---:|---:|---:|---|---|
| **Shortbow** | `shortbow` | mainhand | `0.60·D` | `1.4·D` | **−400** | `critChance` (.06→.10) + `evasion` (2→9) | `<tier>_arrow` |
| **Longbow** | `longbow` | mainhand | `0.78·D` | `1.6·D` | **0** | `critDamage` (.10→.25) | `<tier>_arrow` |

**Identität:** Shortbow = schnellster Bogen, niedrigster Roh, DEX-Burst (crit + dodge). Longbow = Baseline-Bogen, höherer Roh + Präzision + harter Crit-Schaden. Kein 2H-Bogen, keine Armbrust (Chef-Vorgabe).

**Effektiver Schuss** = `rangedDamage + ammoDamage`. Godiron: Shortbow 79+42 = **121** bei −400 aIMs (schneller); Longbow 103+42 = **145** ≈ `1.10·D` bei 0 aIMs. Beide liegen leicht über Sword-`D` (132) — gerechtfertigt durch laufenden **Munitionsverbrauch** (1 Pfeil/Schuss) und fehlende Lifesteal/Rohwucht.

Sonder-Bonus-Kurven (Cu→Go):
- **Shortbow `critChance`:** .06 .06 .07 .07 .07 .07 .08 .08 .08 .09 .09 .10
- **Shortbow `evasion`:** 2 2 4 4 5 5 5 6 7 7 8 9
- **Longbow `critDamage`:** .10 .10 .12 .13 .14 .15 .16 .17 .18 .20 .22 .25

---

## 3. RANGED — Voll-Tabellen je Tier

### 3.1 SHORTBOW — `<tier>_shortbow` · mainhand · weaponStyle `ranged` · aIMs **−400**

| Tier | rDmg | acc | critChance | evasion | ranged-Req | fletch-Req | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 3 | 7 | 0.06 | 2 | 1 | 1 | 3000 | 2 | 24 |
| Bronze | 5 | 11 | 0.06 | 2 | 5 | 5 | 4000 | 3 | 55 |
| Iron | 8 | 20 | 0.07 | 4 | 10 | 10 | 4500 | 3 | 100 |
| Steel | 12 | 28 | 0.07 | 4 | 20 | 20 | 6000 | 8 | 260 |
| Blacksteel | 17 | 39 | 0.07 | 5 | 30 | 30 | 8000 | 14 | 380 |
| Mithril | 23 | 53 | 0.07 | 5 | 40 | 40 | 8000 | 18 | 600 |
| Adamantium | 29 | 67 | 0.08 | 5 | 50 | 50 | 9000 | 34 | 980 |
| Runite | 36 | 84 | 0.08 | 6 | 60 | 60 | 10000 | 64 | 1700 |
| Bloodiron | 44 | 104 | 0.08 | 7 | 70 | 70 | 11000 | 120 | 2700 |
| Titanium | 54 | 126 | 0.09 | 7 | 80 | 80 | 12000 | 278 | 4200 |
| Aetherium | 65 | 151 | 0.09 | 8 | 90 | 90 | 13000 | 435 | 5800 |
| Godiron | 79 | 185 | 0.10 | 9 | 105 | 100 | 15000 | 845 | 9000 |

### 3.2 LONGBOW — `<tier>_longbow` · mainhand · weaponStyle `ranged` · aIMs **0**

| Tier | rDmg | acc | critDamage | ranged-Req | fletch-Req | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 4 | 8 | 0.10 | 1 | 1 | 4000 | 3 | 30 |
| Bronze | 6 | 13 | 0.10 | 5 | 5 | 5500 | 5 | 60 |
| Iron | 11 | 22 | 0.12 | 10 | 10 | 6500 | 6 | 120 |
| Steel | 16 | 32 | 0.13 | 20 | 20 | 11000 | 15 | 380 |
| Blacksteel | 22 | 45 | 0.14 | 30 | 30 | 13000 | 28 | 560 |
| Mithril | 30 | 61 | 0.15 | 40 | 40 | 12500 | 36 | 900 |
| Adamantium | 37 | 77 | 0.16 | 50 | 50 | 14500 | 68 | 1500 |
| Runite | 47 | 96 | 0.17 | 60 | 60 | 16500 | 128 | 2600 |
| Bloodiron | 58 | 118 | 0.18 | 70 | 70 | 18500 | 240 | 4200 |
| Titanium | 70 | 144 | 0.20 | 80 | 80 | 20500 | 555 | 6400 |
| Aetherium | 84 | 173 | 0.22 | 90 | 90 | 22500 | 870 | 9000 |
| Godiron | 103 | 211 | 0.25 | 105 | 100 | 26500 | 1690 | 14000 |

### 3.3 PFEILE — `<tier>_arrow` · `type:"material" stackable:true` · `ammoDamage = 0.32·D`

Identisch zur gelockten Arrowhead-`ammoDamage`-Kurve (Smithing-Spec §4.20). **Schließt die heutige Lücke: heute nur 5 Pfeil-Tiers (copper/iron/steel/mithril/runite, ammoDamage 1→11) — die Top-Bögen schießen mit Runit-Pfeil (11) statt Godiron-Spitze (42).** Hier alle 12 Tiers.

| Tier | ammoDamage | fletch-Req | dur(ms) | xp | value/Stück | Output/Action |
|---|---:|---:|---:|---:|---:|---:|
| Copper | 2 | 1 | 3000 | 2 | 2 | 15 |
| Bronze | 3 | 5 | 3000 | 3 | 2 | 15 |
| Iron | 5 | 10 | 3500 | 2 | 3 | 15 |
| Steel | 7 | 20 | 4000 | 4 | 4 | 15 |
| Blacksteel | 9 | 30 | 5000 | 7 | 6 | 15 |
| Mithril | 12 | 40 | 6000 | 10 | 8 | 15 |
| Adamantium | 15 | 50 | 7000 | 19 | 11 | 15 |
| Runite | 19 | 60 | 8000 | 36 | 15 | 15 |
| Bloodiron | 24 | 70 | 9000 | 62 | 19 | 15 |
| Titanium | 29 | 80 | 9500 | 110 | 24 | 15 |
| Aetherium | 35 | 90 | 10500 | 195 | 30 | 15 |
| Godiron | 42 | 100 | 12000 | 365 | 40 | 15 |

**Pfeil-Rezept (Fletching):** `inputs: [{ arrow_shaft, qty:1 }, { <tier>_arrowheads, qty:1 }, { feather, qty:1 }]` → `loot: [{ <tier>_arrow, chance:1, min:15, max:15 }]`. `arrow_shaft`, `feather`, `<tier>_arrowheads` existieren alle bereits. (Heutige `copper_arrow`/`iron_arrow`-ammoDamage-Werte 1/2 auf 2/5 anheben — Kurven-Korrektur; Save-Bump ohnehin durch Smithing-Spec.)

---

## 4. MAGIE — Archetyp-Faktoren (gelten in jedem Tier)

| Archetyp | id-Suffix | Slot | `magicDamage` | `accuracy` | aIMs | twoHanded | weaponEffect | `manaCost` |
|---|---|---|---:|---:|---:|:--:|---|---:|
| **Wand** | `wand` | mainhand | `0.55·D` | `0.9·D` | **−300** | – | leichter Control (frost→shock) | niedrig (§5) |
| **Staff** | `staff` | mainhand | `0.85·D` | `1.1·D` | **0** | ✅ | **eingebauter Burn-DoT, je Tier eskalierend** | mittel (§5) |
| **Focus** | `focus` | offhand | `+0.30·D` | `0.5·D` | – | – | – (reiner Stat-Stick) | – |

**Identität:** Wand = schnell (−300), niedriger Roh, **Control-Status** (frost-Slow früh → shock-Lockout spät), gepaart mit Focus-Offhand. Staff = Haupt-Magie-Waffe, `twoHanded` (blockt Offhand → **kein Focus mit Staff**, wie Chef-Vorgabe), höherer Roh + **eskalierender Burn-DoT**. Focus = Wand-Begleiter, gibt `magicDamage` + Mana-Pool + crit.

**DPS-Parität (Magie ↔ Melee):** Staff-Roh `0.85·D` < Sword-`D`; die Differenz holt der **Burn-DoT** (rüstungsignorierend) + **Mana-Sustain** rein → effektiv ≈ `D`. Wand+Focus = `0.55·D + 0.30·D = 0.85·D` Roh + Control-Status + größerer Mana-Pool = gleiche Klasse wie Staff, als 1H+Offhand-Variante.

`magicDamage`-Kurven (Cu→Go): Staff `0.85·D` = 4·7·12·17·24·32·41·51·63·77·92·112 · Wand `0.55·D` = 3·4·8·11·15·21·26·33·41·50·59·73 · Focus `0.30·D` = 2·2·4·6·8·11·14·18·22·27·32·40.

---

## 5. MAGIE — Voll-Tabellen je Tier

### 5.1 STAFF — `<tier>_staff` · mainhand · `twoHanded:true` · weaponStyle `magic` · aIMs **0**

Eingebauter `weaponEffect` = **Burn-DoT**, Magnitude/Chance/Dauer monoton steigend (= „Status-DoT je Tier eskalierend"). Top-Tiers (Aetherium/Godiron) sind die Signatur-Stäbe (höchster DoT + `critChance`).

| Tier | mDmg | acc | manaCost | burn-chance | burn-mag | burn-dur(ms) | +critChance | RC-Req | mag_off-Req | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 4 | 6 | 5 | 0.25 | 1 | 3500 | — | 1 | 1 | 6500 | 4 | 50 |
| Bronze | 7 | 9 | 5 | 0.26 | 2 | 3800 | — | 5 | 5 | 8000 | 7 | 95 |
| Iron | 12 | 15 | 6 | 0.28 | 3 | 4000 | — | 10 | 10 | 9500 | 9 | 200 |
| Steel | 17 | 22 | 7 | 0.30 | 5 | 4300 | — | 20 | 20 | 15000 | 23 | 560 |
| Blacksteel | 24 | 31 | 8 | 0.31 | 7 | 4600 | — | 30 | 30 | 17000 | 42 | 860 |
| Mithril | 32 | 42 | 9 | 0.32 | 9 | 4900 | 0.02 | 40 | 40 | 17000 | 54 | 1350 |
| Adamantium | 41 | 53 | 10 | 0.33 | 11 | 5200 | 0.02 | 50 | 50 | 19000 | 102 | 2250 |
| Runite | 51 | 66 | 11 | 0.34 | 14 | 5500 | 0.03 | 60 | 60 | 21000 | 192 | 3900 |
| Bloodiron | 63 | 81 | 12 | 0.36 | 18 | 5800 | 0.03 | 70 | 70 | 23000 | 360 | 6300 |
| Titanium | 77 | 99 | 13 | 0.37 | 22 | 6100 | 0.04 | 80 | 80 | 25000 | 835 | 9600 |
| Aetherium | 92 | 119 | 14 | 0.38 | 26 | 6300 | 0.05 | 90 | 90 | 27000 | 1305 | 13500 |
| Godiron | 112 | 145 | 16 | 0.40 | 31 | 6500 | 0.06 | 100 | 105 | 31000 | 2535 | 21000 |

### 5.2 WAND — `<tier>_wand` · mainhand 1H · weaponStyle `magic` · aIMs **−300**

Eingebauter `weaponEffect` = **Control** (Frost-Slow T1–4 → Shock-Lockout T5–12). Niedriger manaCost (schneller, billiger Cast → mehr Casts/Pool). Paart mit Focus (§5.3).

| Tier | mDmg | acc | manaCost | effect | chance | mag | dur(ms) | RC-Req | mag_off-Req | dur(ms) | xp | value |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 3 | 5 | 3 | frost | 0.18 | 1 | 3000 | 1 | 1 | 4500 | 3 | 28 |
| Bronze | 4 | 7 | 3 | frost | 0.20 | 1 | 3200 | 5 | 5 | 6000 | 5 | 55 |
| Iron | 8 | 13 | 4 | frost | 0.22 | 1 | 3400 | 10 | 10 | 6500 | 6 | 110 |
| Steel | 11 | 18 | 4 | frost | 0.25 | 1 | 3600 | 20 | 20 | 9000 | 15 | 340 |
| Blacksteel | 15 | 25 | 5 | shock | 0.20 | 0.22 | 3500 | 30 | 30 | 11000 | 28 | 520 |
| Mithril | 21 | 34 | 5 | shock | 0.22 | 0.24 | 3800 | 40 | 40 | 11000 | 36 | 840 |
| Adamantium | 26 | 43 | 6 | shock | 0.24 | 0.26 | 4000 | 50 | 50 | 13000 | 68 | 1400 |
| Runite | 33 | 54 | 6 | shock | 0.26 | 0.28 | 4200 | 60 | 60 | 14000 | 128 | 2400 |
| Bloodiron | 41 | 67 | 7 | shock | 0.28 | 0.30 | 4400 | 70 | 70 | 15000 | 240 | 3800 |
| Titanium | 50 | 81 | 7 | shock | 0.30 | 0.32 | 4600 | 80 | 80 | 16000 | 555 | 5800 |
| Aetherium | 59 | 97 | 8 | shock | 0.32 | 0.34 | 4800 | 90 | 90 | 17000 | 870 | 8200 |
| Godiron | 73 | 119 | 8 | shock | 0.34 | 0.36 | 5000 | 105 | 100 | 19000 | 1690 | 13000 |

### 5.3 FOCUS — `<tier>_focus` · offhand · weaponStyle `magic` · kein aIMs

Reiner Stat-Stick: `magicDamage` `0.30·D` + `accuracy` `0.5·D` + Mana-Pool + crit. (`maxMana`/`manaRegen` = neues `EquipBonus`-Feld, s. §0 — bis dahin nur die mit `*` markierten Spalten weglassen.)

| Tier | mDmg | acc | *maxMana | *manaRegen | critChance | RC-Req | mag_off-Req | dur(ms) | xp | value |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Copper | 2 | 3 | 6 | 0.0 | — | 1 | 1 | 4500 | 3 | 35 |
| Bronze | 2 | 4 | 8 | 0.0 | — | 5 | 5 | 6000 | 5 | 70 |
| Iron | 4 | 7 | 12 | 0.1 | — | 10 | 10 | 5500 | 6 | 110 |
| Steel | 6 | 10 | 16 | 0.1 | 0.02 | 20 | 20 | 9000 | 15 | 320 |
| Blacksteel | 8 | 14 | 22 | 0.2 | 0.02 | 30 | 30 | 11000 | 28 | 500 |
| Mithril | 11 | 19 | 28 | 0.2 | 0.03 | 40 | 40 | 11000 | 36 | 640 |
| Adamantium | 14 | 24 | 34 | 0.3 | 0.03 | 50 | 50 | 13000 | 68 | 1050 |
| Runite | 18 | 30 | 42 | 0.3 | 0.04 | 60 | 60 | 14000 | 128 | 1700 |
| Bloodiron | 22 | 37 | 52 | 0.4 | 0.04 | 70 | 70 | 15000 | 240 | 2700 |
| Titanium | 27 | 45 | 62 | 0.4 | 0.05 | 80 | 80 | 16000 | 555 | 4000 |
| Aetherium | 32 | 54 | 74 | 0.5 | 0.05 | 90 | 90 | 17000 | 870 | 5800 |
| Godiron | 40 | 66 | 90 | 0.6 | 0.06 | 105 | 100 | 19000 | 1690 | 8800 |

### 5.4 Mana-Loop-Kontrolle (manaCost-Kalibrierung)

`maxMana = 10 + INT·5 + WIS·2` (heute). Ziel-Burst **3–6 Casts**, dann kurze Bash-Phase (Stab-Nahkampf ×0.35, kein Mana), dann Regen. Stichproben:

| Situation | maxMana (ca.) | manaCost | Casts/Pool | Urteil |
|---|---:|---:|---:|---|
| Starter, Copper-Staff (INT 5/WIS 5) | 45 | 5 | 9 | ok (früh großzügig) |
| Mid, Runite-Staff (INT 25/WIS 12) | 159 | 11 | ~14 | etwas hoch → Burst lang, ok für Komfort |
| Endgame, Godiron-Staff (INT 60/WIS 30) | 370 | 16 | ~23 | Pool dominiert → Loop weich; +Focus-`maxMana` macht Wand-Build mana-stärker, Staff mana-knapper als Trade-off |
| Wand-Build früh (INT 5) Copper-Wand | 45 | 3 | 15 | sehr viele Casts (Wand = billiger Dauerfeuer, dafür Control statt DoT) |

**Empfehlung:** Wenn der Loop sich „nie leer" anfühlt (Casts/Pool > ~8 im Endgame zu hoch), `MANA_PER_CAST`-Skalierung über `manaCost` schärfen oder Pool-Formel-Tuning (combat-dev/logic-dev). Die hier gesetzte manaCost-Kurve (Staff 5→16, Wand 3→8) ist bewusst **moderat**, damit kein Cast→Bash-Frust entsteht; finale Loop-Härte = combat-dev-Stellschraube nach erstem Sim mit ausgerüsteter Magie.

---

## 6. Gear stärkt den Charakter — Parität-Kontrolle (Chef-Punkt 3)

Jede Tier-Waffe gibt **echte, monoton steigende** Stat-Boni (kein toter Flavor):

| Linie | Primär-Stat (steigt jeden Tier) | Sekundär | Effekt am Charakter |
|---|---|---|---|
| Shortbow | `rangedDamage` 3→79 | `accuracy`, `critChance`, `evasion` | Burst-DEX, Ausweichen |
| Longbow | `rangedDamage` 4→103 | `accuracy`, `critDamage` | Roh + Crit-Spitzen |
| Pfeil | `ammoDamage` 2→42 | — | addiert auf jeden Schuss |
| Staff | `magicDamage` 4→112 | `accuracy`, Burn-DoT, `critChance` | DoT-Schaden + Roh |
| Wand | `magicDamage` 3→73 | `accuracy`, Control-Status | Tempo + CC |
| Focus | `magicDamage` 2→40 | `maxMana`, `critChance`, `accuracy` | Mana-Sustain + Roh |

Roh-Damage-Faktoren liegen exakt auf der Smithing-`D`-Kurve (×Faktor) → **paritätisch zu Melee/Smithing**, gleiches Tempo der Steigerung (×≈1,35/Tier), keine Cliffs/Flatstretches.

**Optionale Rüstungs-Parität (Folge-Auftrag, NICHT Teil dieser Voll-Spec):** Die heutige Leder-Linie (Leatherworking → `ranged`-leichte Rüstung: evasion/maxHp + etwas `rangedDamage`) und die Magie-Roben-Linie (Runecrafting → `magicDamage`/maxHp/evasion) decken die defensiven Ranged-/Magie-Slots ab, sind aber **nicht** auf 12 saubere Tiers gezogen. **Ziel-Profil je Tier (falls der Chef sie nachzieht):** Leder-Body `evasion ≈ 0.45·B`, `maxHp ≈ 1.0·B`, `+rangedDamage ≈ 0.10·D`; Robe-Body `evasion ≈ 0.30·B`, `maxHp ≈ 0.9·B`, `+magicDamage ≈ 0.20·D` (B = Smithing-Body-Index 8→136). Das ist ein **separater** Voll-Spec-Auftrag — hier nur als Parität-Anker vermerkt.

---

## 7. Element-Essenz → Monster → Rune (Chef-Punkt 4)

### 7.1 Essenz-Potenz-Leiter (heute 3 → jetzt 6, an Monster-/Smithing-Leiter gekoppelt)

6 Essenzen, potenz-geordnet. **NEU:** `ember_essence`, `storm_essence`, `void_essence`. **Behalten:** `dim_essence`, `frost_essence`, `aether_essence` (Drop-Floor angepasst). Aether = 2.-höchstes Tier (mid-/endgame), Void = höchstes (endgame).

| Essenz-Tier | Essenz (id) | Element | Smithing-Band | Monster-Lvl-Band | Status |
|---|---|---|---|---|---|
| E1 | `dim_essence` | Arkan (Starter) | Cu–Iron | 5–14 | existiert |
| E2 | `ember_essence` *(neu)* | Feuer | Iron–Blacksteel | 15–36 | NEU |
| E3 | `frost_essence` | Frost | Steel–Adamantium | 20–58 | existiert |
| E4 | `storm_essence` *(neu)* | Schock | Blacksteel–Runite | 35–75 | NEU |
| E5 | `aether_essence` | Aether | Adamantium–Aetherium | **45–98** (Floor angehoben) | existiert |
| E6 | `void_essence` *(neu)* | Void | Titanium–Godiron | **90–120** (endgame) | NEU |

### 7.2 Mapping-Tabelle: Element → Essenz → Monster (Lvl) → Drop-Chance → Rune (RC-Lvl)

| Element | Essenz | Dropt von (Monster, Lvl) | Chance | → Rune | RC-Lvl | Runen-Effekt |
|---|---|---|---:|---|---:|---|
| **Arkan** | `dim_essence` | goblin_stormcaller (12), goblin_warlock (14), cave_goblin-Band (5–11) | 0.20–0.30 | `force_rune` | 1 | +meleeDamage/+rangedDamage (Utility) |
| **Feuer** | `ember_essence` | skeleton_pyroclast (36) **[Haupt]**, goblin_warlock (14, burn) **[früh, niedrig]**; Vulkan-Zone später | 0.20–0.25 | `fire_rune` | 15 | `weaponEffect: burn` |
| **Frost** | `frost_essence` | frost-Wölfe/Schneefeld (20–40), skeleton_icemage (30), deep_kraken-Band (58) | 0.30–0.40 | `frost_rune` | 10 | `weaponEffect: frost` (Slow); `ward_rune` (RC20) +defense/+maxHp |
| **Schock** | `storm_essence` | roc (35), tide_siren (38), roc_hunter (50), roc_elder (65), roc_storm (75); goblin_stormcaller (12, niedrig) | 0.20–0.30 | `shock_rune` | 40 | `weaponEffect: shock`; `swift_rune` (RC45) +accuracy/+evasion |
| **Aether** | `aether_essence` | skeleton_nekro (45), forest_bear (45), deep_kraken (60), roc_elder (65), idol_warden (92), aether_wraith (98) | 0.30–0.40 | `aether_rune` | **50** | +magicDamage-Boost (kein Eigenstatus) |
| **Void** | `void_essence` *(neu)* | aether_wraith (98), scale_skarn (104), last_idol (120) | 0.10–0.20 (last_idol 0.50) | `void_rune` | **65** | Kombi-Endgame (burn+bleed, s. §8 Fusion) |

**Drop-Floor-Korrekturen (verbindlich):**
- `aether_essence`: **alle Drops unter Monster-Lvl 45 entfernen** (heute taucht es früher auf). Floor = 45. Damit ist Aether echtes Mid-/Endgame-Material (Chef-Vorgabe „2.-höchstes Tier").
- `void_rune`-Rezept umstellen: heute `aether_essence ×3` → **neu `void_essence ×2`** (RC65). Void wird damit endgame-gebunden statt aether-recycelt.
- Konkrete Drop-Einträge je Monster (`loot:[{ itemId, chance, min, max }]`): content-dev fügt die Essenz-Zeile in die genannten Monster ein; min/max 1–2 (Boss last_idol 2–4).

### 7.3 Runen-Leiter (heute 3 → jetzt 8), RC-Level an Essenz-Verfügbarkeit gekoppelt

| Rune (id) | RC-Lvl | Input | Output/Action | Typ | Effekt |
|---|---:|---|---:|---|---|
| `force_rune` *(neu)* | 1 | `dim_essence ×2` | 3 | Utility | +meleeDamage & +rangedDamage |
| `frost_rune` | 10 | `frost_essence ×1` | 3 | Aktiv | frost (Slow) |
| `fire_rune` *(neu)* | 15 | `ember_essence ×1` | 3 | Aktiv | burn (DoT) |
| `ward_rune` *(neu)* | 20 | `frost_essence ×2` | 2 | Utility | +defense & +maxHp |
| `shock_rune` *(neu)* | 40 | `storm_essence ×2` | 2 | Aktiv | shock (Lockout) |
| `swift_rune` *(neu)* | 45 | `storm_essence ×2` | 2 | Utility | +accuracy & +evasion |
| `aether_rune` | 50 | `aether_essence ×1` | 2 | Boost | +magicDamage |
| `void_rune` | 65 | `void_essence ×2` | 1 | Kombi | burn+bleed (Fusion, §8) |

> 6 Essenz-Tiers speisen 12 Magie-Waffen-Tiers (≈2 Waffen-Tiers je Essenz: low=dim/ember/frost, mid=storm/aether, high=void). Damit ist die in den Plänen geforderte Erweiterung „3 → ~6–12 Tiers" erfüllt: **6 Essenzen + 8 Runen**.

### 7.4 Magie-Waffen-Crafting-Inputs (welche Rune/Essenz craftet welchen Stab-Tier)

Pro Staff/Wand/Focus-Tier (Runecrafting `enchant_*`/`craft_*`-Aktion). Mengen steigen mit Tier; Holz/Barren-Schaft optional als Gerüst.

| Tier-Band | Essenz-Input | Runen-Input (zusätzlich für Staff/Wand) |
|---|---|---|
| Cu–Iron (RC1–10) | `dim_essence ×3–4` | `force_rune ×2` (Wand: +`frost_rune ×2`) |
| Steel–Blacksteel (RC20–30) | `ember_essence ×3` / `frost_essence ×3` | `fire_rune ×3` (Staff) / `frost_rune ×3` (Wand) |
| Mithril–Adamantium (RC40–50) | `storm_essence ×3` / `aether_essence ×2` | `shock_rune ×3` / `aether_rune ×2` |
| Runite–Bloodiron (RC60–70) | `aether_essence ×3` | `aether_rune ×3` (+`void_rune ×1` Bloodiron) |
| Titanium–Godiron (RC80–100) | `void_essence ×2–4` | `void_rune ×2–4` (+`onyx`/`godiron_bar` Spitze) |

---

## 8. Verzauberungs-Rezepte (Chef-Punkt 5) — kombinierbare Effekte

Kategorie `rune_enchanting` (Runecrafting-Aktion). Basis-Item + Rune(n) → **neue** Item-ID (kein Overwrite). **Mehrere Effekte/Item:** 1 `weaponEffect` + beliebig viele `bonus`-Stat-Felder geht **heute**; echte 2-Status-Fusion (Void) braucht `weaponEffects[]` (§0).

### 8.1 Rune-Effekt-Beiträge (pro Rune, skaliert mit Basis-Item-`D`)

| Rune | Beitrag pro Rune | Skalierung |
|---|---|---|
| `force_rune` | +2 `meleeDamage`, +2 `rangedDamage` | flat je Rune (×N stapelt) |
| `ward_rune` | +2 `defense`, +6 `maxHp` | flat je Rune |
| `swift_rune` | +3 `accuracy`, +2 `evasion` | flat je Rune |
| `aether_rune` | +4 `magicDamage` | flat je Rune |
| `fire_rune` | `weaponEffect: burn` — `chance` +0.10/Rune (cap .40), `magnitude = 0.20·D_basis`, `dur 4000` | magnitude an Basis-Tier |
| `frost_rune` | `weaponEffect: frost` — `chance` +0.08/Rune (cap .35), `mag 1`, `dur 4000` | Control |
| `shock_rune` | `weaponEffect: shock` — `chance` +0.06/Rune (cap .30), `mag 0.25`, `dur 3000` | Lockout |
| `void_rune` | **Fusion**: `burn (0.25·D_basis)` + `bleed (0.20·D_basis)` (2 Effekte → braucht Array) | endgame |

`D_basis` = `D`-Index des Basis-Item-Tiers (Iron 14 … Godiron 132).

### 8.2 Beispiel-Rezepte (repräsentativ, low → endgame; 1:1 erweiterbar je Tier)

| Rezept-id | Basis-Item | + Rune(n) | → Output | RC-Lvl | Effekt(e) am Output |
|---|---|---|---|---:|---|
| `enchant_forceful_iron_sword` | `iron_sword` | `force_rune ×3` | `forceful_iron_sword` | 5 | +6 meleeDamage, +6 rangedDamage |
| `enchant_flaming_steel_sword` | `steel_sword` | `fire_rune ×3` | `flaming_steel_sword` | 18 | burn .30 / mag 4 / 4s (+kein Stat = rein DoT) |
| `enchant_flaming_force_sword` | `steel_sword` | `fire_rune ×2` + `force_rune ×2` | `emberforce_sword` | 22 | **burn .20/mag4/4s + +4 meleeDamage** (1 Status + Stat, geht heute) |
| `enchant_frostbite_longbow` | `mithril_longbow` | `frost_rune ×4` | `frostbite_longbow` | 24 | frost .32 / mag1 / 4s + (Bogen behält rangedDamage/crit) |
| `enchant_warded_platebody` | `steel_platebody` | `ward_rune ×5` | `warded_platebody` | 28 | +10 defense, +30 maxHp |
| `enchant_swift_chainbody` | `mithril_chainbody` | `swift_rune ×4` | `swift_chainbody` | 45 | +12 accuracy, +8 evasion (DEX/Ranged-Body) |
| `enchant_storm_scimitar` | `runite_scimitar` | `shock_rune ×4` | `storm_scimitar` | 48 | shock .24 / mag .25 / 3s (+behält crit) |
| `enchant_aether_staff` | `runite_staff` | `aether_rune ×3` | `aether_runite_staff` | 55 | +12 magicDamage (Boost auf bestehenden Burn-Staff) |
| `enchant_swiftflame_shortbow` | `bloodiron_shortbow` | `fire_rune ×3` + `swift_rune ×2` | `swiftflame_shortbow` | 60 | **burn .30/mag15/5s + +6 accuracy + +4 evasion** (Status + 2 Stats, geht heute) |
| `enchant_void_greatsword` | `titanium_greatsword` | `void_rune ×5` | `void_greatsword` | 70 | **burn (0.25·D=22) + bleed (0.20·D=18)** — *Fusion, braucht `weaponEffects[]`* |
| `enchant_voidstorm_staff` | `godiron_staff` | `void_rune ×4` + `aether_rune ×4` | `voidstorm_staff` | 88 | **burn 33 + bleed 26 + +16 magicDamage** — *Fusion + Stat, braucht Array* |

**Kombinierbarkeit (Chef-Punkt 5):** Die meisten Rezepte mischen **1 Aktiv-Status + N Utility-Stats** (heute sofort lauffähig). Die echten **Multi-Status-Fusionen** (`void_*`) sind als Endgame-Tier markiert und gebündelt — sie sind der einzige Trigger für das `weaponEffects[]`-Feld. So kann content-dev sofort 9 der 11 Beispiele bauen und die 2 Fusionen warten auf combat-dev.

---

## 9. XP-/Durations-Parität & Apply-Reihenfolge

- **Craft-XP** (Fletching-Bögen, Runecrafting-Stäbe) = Smithing-`forge_*`-XP-Tempo: leichte Stücke (Shortbow/Wand/Focus/Munition) ≈ Dagger/Arrowhead-XP, schwere (Longbow ≈ Sword-xp, Staff ≈ Greatsword-xp) höher — Werte direkt in §3/§5-Tabellen (Spalte `xp`). Keine XP-Cliffs gegenüber Smithing.
- **`durationMs`** nach Schwere: Munition 3–6 s, Wand/Focus 4,5–19 s, Short/Longbow 4–26,5 s, Staff 6,5–31 s — steigend je Tier (Werte in den Tabellen).
- **Aktions-Schema (content-dev):**
  ```
  { id:"fletch_<tier>_<bow>"/"enchant_<tier>_<magic>", name:{en,de}, skill:"fletching"|"runecrafting",
    category:"<tier>"|"rune_staves"/"rune_foci", durationMs:<dur>, xp:<xp>, levelRequired:<craft-Req>,
    inputs:[ <Holz/Essenz/Rune wie §3.3/§7.4> ], loot:[{ itemId:"<tier>_<suffix>", chance:1, min:1, max:1 }] }
  ```

**Ordered apply-list (content-dev):**
1. **Pfeile zuerst** (kleinste Mühe, größte Lücke): `<tier>_arrow` alle 12 Tiers (§3.3), `ammoDamage`-Kurve, Fletching-Rezept aus Shaft+Arrowhead+Feather. Alte `copper/iron_arrow`-ammoDamage auf 2/5 korrigieren.
2. **Bögen:** `<tier>_shortbow` + `<tier>_longbow` je 12 Tiers (§3.1/§3.2), `ammoType:"<tier>_arrow"`. Alte Holz-Ad-hoc-Bögen (grimoak/ashbark/…/godwood) entfernen oder als Flavor-Sammler-Drops belassen (Chef-Entscheid) — die Leiter trägt jetzt Short/Long.
3. **Essenzen + Runen:** `ember_/storm_/void_essence` + `force_/fire_/ward_/shock_/swift_rune` anlegen (§7.3), `void_rune`-Input auf `void_essence` umstellen, Essenz-Drops in die Monster aus §7.2 setzen, `aether_essence`-Floor auf Lvl 45 anheben.
4. **Magie-Waffen:** `<tier>_staff` (twoHanded + Burn-DoT + manaCost), `<tier>_wand` (Control + manaCost), `<tier>_focus` (Stat-Stick + maxMana) je 12 Tiers (§5), Crafting-Inputs §7.4. Alte Ad-hoc-Stäbe/Foki (gnarled/frost/aether/stormcaller/void/godspark) entfernen oder als Drop-Prestige belassen.
5. **Enchants:** Kategorie `rune_enchanting` + Rezepte §8.2 (9 sofort, 2 Fusionen nach `weaponEffects[]`).
6. **Cross-Revier-Tickets** (CEO → logic-dev/combat-dev): `manaCost` an ItemDef, `maxMana`/`manaRegen` in EquipBonus, `weaponEffects[]`-Array (§0).

**Gesamt-Neuanlage:** Ranged 2 Bögen×12 + 12 Pfeile = **36** + Magie 3×12 = **36** Items, + 3 Essenzen + 5 Runen + ~11 Enchants. Save-Bump ohnehin durch Smithing-Spec gedeckt.

---

## 10. Sim-/Parität-Hinweise

- **Sim-Status heute:** Der Sim-Block (`packages/engine/src/sim.ts`) rüstet den Testhelden mit **`bronze_sword`** (Melee) aus — er testet **keine** ausgerüstete Ranged-/Magie-Waffe. Ranged/Magie-DPS ist daher **nicht** direkt sim-validiert; die Zahlen interpolieren aus den **sim-validierten Melee-`D`-Ankern** (gleiche Kurve × Stil-Faktor). Aktueller Sim-Lauf zeigt **keine** Skilling-Aktion bei 0 XP/h (Baseline-Skilling ~2400–3000 XP/h bei Lvl 15, sauber steigend) — die Fletching-/Runecrafting-Aktionen erben dieselbe XP-Kurve, also kein 0-XP/h-Risiko.
- **Fälliger Sim-Pass nach Anwendung (eigener Auftrag):** sim.ts um Ranged- (`<tier>_longbow`+`<tier>_arrow`) und Magie-Loadout (`<tier>_staff`/`wand`+`focus`) erweitern, dann prüfen: (a) effektiver Schuss `rangedDamage+ammoDamage` ≈ Melee-`D` pro Tier? (b) Staff-DoT schließt die `0.85·D`-Roh-Lücke (kein `kills=0` auf passendem Lvl-Band)? (c) Mana-Loop-Casts/Pool im Ziel 3–6 (nicht „nie leer")?
- **Essenz-Gating-Check:** Nach Drop-Platzierung verifizieren, dass jede Essenz **erreichbar** ist (kein Mob mit `kills=0` als einzige Quelle) — Aether-Floor 45 und Void-endgame liegen in besiegbaren Bändern (necro 45, idolhall 92–120 sind im geared-Endgame-Sim besiegbar).

---

## 11. Kern-Kurven auf einen Blick

- **Ranged-Roh (×D):** Shortbow `0.60·D` (3→79, −400 aIMs, +crit/evasion) · Longbow `0.78·D` (4→103, 0 aIMs, +critDamage). Pfeil `ammoDamage 0.32·D` (2→42, alle 12 Tiers).
- **Magie-Roh (×D):** Staff `0.85·D` (4→112, twoHanded, Burn-DoT mag 1→31, manaCost 5→16) · Wand `0.55·D` (3→73, −300 aIMs, Control frost→shock, manaCost 3→8) · Focus `+0.30·D` (2→40, +maxMana 6→90).
- **Essenz-Leiter (6):** dim → ember → frost → storm → aether → void (Lvl-Bänder 5–14 / 15–36 / 20–58 / 35–75 / 45–98 / 90–120).
- **Runen-Leiter (8):** force(1) · frost(10) · fire(15) · ward(20) · shock(40) · swift(45) · aether(50) · void(65).
- **Effektive DPS-Parität:** Schuss ≈ Roh+Ammo ≈ `1.10·D` (Munitionskosten) · Stab ≈ Roh+DoT ≈ `D` · Wand+Focus ≈ `0.85·D`+Control+Mana. Alle drei Stile erreichen Lvl 1→100/105 im selben Tempo wie Melee/Smithing.

**Doc-Pfad:** `G:\GameDev\design\ranged-magic-rune-spec.md`
