# Armor Trinity — Number Spec (Itemization 2.5)

Stand 2026-07-03 · Autor: balance-designer · Status: **Spec fertig, wartet auf Content-/Logic-/Combat-/UI-Apply**

Dies ist die konkrete Zahlen-Spec zu `design/armor-system-plan.md`. Sie ist implementierbar für
logic-dev (Formeln/Felder/`computeStats`/SAVE), content-dev (die ~215 Teile + Gegner-Rebalance),
combat-dev (die vier Defense-Mechaniken im Fight) und ui-dev (Ward-Leiste + Tooltips).
**Ich (balance-designer) wende nichts an** — die Apply-List am Ende geht an content-dev/CEO.

Alle Zahlen sind mit dem Ist-Zustand geerdet (echte Item-Modifier, echte Gegner-Stats, Stat-Squish
÷10) und per Modell-Skript nachgerechnet (Parität + 3 Constraint-Nachweise unten).

---

## 0. Gelockte Entscheidungen (bestätigt + ausgerechnet)

| Klasse | Stil | Schicht | Feld | Mechanik |
|---|---|---|---|---|
| **Platte** | Melee (STR) | **Mitigation** | `armorRating` | Schadensreduktion via `def/(def+K)` |
| **Schild (nur Melee-1H)** | Melee | **Block** | `blockChance` | Chance, einen Treffer stark zu reduzieren |
| **Leder** | Ranged (DEX) | **Ausweichen** | `evasionRating` | flache %-Ausweichchance (Voll-Vermeidung) |
| **Stoff** | Magic (INT/WIS) | **Ward** | `wardCapacity` | Absorptions-Pool VOR HP, per Cast aufgeladen |

- **HYBRID bestätigt:** Attribute bleiben Kern — CON→maxHP, DEX→Basis-Evasion, INT/WIS→Mana/Ward-Basis,
  Schadens-Attribute unberührt. Die Klassen-Schicht (obige 4 Felder) trägt die **Defensiv-Identität**
  und ist der dominante Term. Attribute setzen die POOLS, die Klassen-Schicht die REDUKTION/VERMEIDUNG.
- **Defence-Skill raus aus Mitigation/Evasion — BESTÄTIGT.** `computeStats` verliert alle `defenceEff`-
  und `magic_def`-Defense-Terme (siehe §3). Defense/Evasion/Ward kommen NUR aus der Klassen-Schicht +
  den Attribut-Basistermen. **Defence-Skill behält GENAU eine Rolle:** Requirement-Gate der Platten-/
  Schild-Tiers (`requirements.defence`), analog `ranged` für Leder und `magic_off` für Stoff. Höheres
  Defence → höheres tragbares Platten-Tier → mehr `armorRating`. Indirekt, sauber, exploit-frei.

**Constraint-Verdikte vorab (Details §7):**
1. ✅ **Unarmored ab L10 = Suizid:** ungepanzert stirbt der Held in **~3 Treffern / ~9 s** gegen den
   on-level-Gegner (nach Gegner-Damage-Rescale). Gepanzert: 38–63 s → **4–7× EHP**.
2. ✅ **Food bleibt nötig:** gepanzert-ohne-Food TTK 38–49 s (endlich, kein Selbst-Sustain), on-tier-Food
   deckt den DPS-in nur knapp (Netto +0.0…+1.0 HP/s) → Food PFLICHT, nicht trivial.
3. ✅ **EHP-Parität ±10 %:** die drei Stile treffen je Band dasselbe erwartete EHP (Leder +5 % als
   Varianz-Ausgleich, 2H-Melee −10 % als Offense-Tradeoff, beides bewusst).

---

## 1. Kern-Formeln (exakt, squish-konsistent)

Konstanten leben bereits in `packages/shared` bzw. kommen neu dazu (kursiv = neu).

```
K  = DEFENSE_MITIGATION_K          = 12.5        (unverändert)
MITIGATION_CAP = DEFENSE_MITIGATION_MAX = 0.80   (unverändert; gilt für Spieler UND Gegner)

BLOCK_CAP              = 0.50        (neu)  max. Block-Chance eines Schildes
BLOCK_DAMAGE_REDUCTION = 0.75        (neu)  ein geblockter Treffer verliert 75 % Schaden
DODGE_CAP             = 0.75         (neu)  max. flache Leder-Ausweichchance
WARD_PER_MANA        = 0.5           (neu)  Ward, das je 1 verbrauchtem Mana-Punkt auflädt
ONE_SHOT_CAP         = 0.50          (neu)  kein Einzeltreffer > 50 % der max. HP (Anti-One-Shot)
WARD_CORE_PER_INT    = 1.0           (neu)  Attribut-Basisanteil des Ward-Pools
```

### 1.1 Mitigation (Platte) — diminishing, gedeckelt
```
armorRating = Σ item.armorRating (Platte-Slots: helmet/body/legs/gloves/boots + Schild)
            + (2H-Melee ohne Schild: weapon.armorRating-Bonus, §5)
reduction   = min(MITIGATION_CAP, armorRating / (armorRating + K))
```
Linearer Roh-Wert, **diminishing** über `x/(x+K)` (gleiche Kurve wie heute), **Deckel 0.80** gegen
100-%-Immunität. Der Attribut-CON-Term wird aus `defense` ENTFERNT (heute `con·0.3` → weg); CON zahlt
nur noch auf `maxHp`. Dadurch bekommt NUR Platte echte Mitigation (Leder/Stoff tragen kein `armorRating`).

### 1.2 Block (Schild, nur Melee-1H)
```
blockChance = min(BLOCK_CAP, shield.blockChance)          (ein Schild-Slot ⇒ kein Summieren)
Bei Treffer: roll < blockChance ⇒ Schaden ×= (1 - BLOCK_DAMAGE_REDUCTION)   // −75 %
```
**Warum reduzieren statt voll negieren:** ein voll-negierender Block + bereits gemilderte Kleintreffer
erzeugt „immun"-Feelbad-Swings; −75 % ist smoother, stapelt vorhersehbar mit Mitigation und lässt einen
Chip-Rest (koppelt sauber mit dem One-Shot-Cap). Erwartete Schadenssenkung durch Block =
`blockChance · 0.75` (z. B. 40 % Block → −30 % Ø-Schaden). Block ist **reine Melee-1H-Schiene** (§5).

### 1.3 Evasion / Dodge (Leder) — flache %-Vermeidung
```
dodgeChance = min(DODGE_CAP, Σ item.evasionRating)        (evasionRating in %-Punkten je Leder-Teil)
Bei Angriff: roll < dodgeChance ⇒ Treffer komplett vermieden (0 Schaden)
```
**Getrennt** vom bestehenden `evasion`-Stat (Accuracy-Contest). Der Accuracy-Contest bleibt als
*Basis-Trefferchance* (dex-Kern) für ALLE Stile bestehen; `defenceEff` fliegt auch dort raus
(`evasion = 1 + dex·0.3`). Ledecs `evasionRating` ist die **zusätzliche flache Voll-Vermeidung** und
die Leder-Identität — enemy-accuracy-unabhängig (⇒ saubere Parität). Dodge ist RNG → höhere Varianz;
Ausgleich: +5 % Ø-EHP (§4) + One-Shot-Cap (§1.6).

### 1.4 Ward (Stoff) — Pool vor HP, per Cast aufgeladen
```
maxWard      = WARD_CORE_PER_INT · attr.int  +  Σ item.wardCapacity   (Stoff-Slots)
ward         = CharacterState.ward   (persistiert, ≤ maxWard; startet = maxWard beim ersten Load/Respawn)

Beim Zaubern (Mana verbraucht):   ward = min(maxWard, ward + manaSpent · WARD_PER_MANA)
Bei eingehendem Treffer (nach Mitigation):  von `ward` zuerst abgezogen, Rest auf HP:
     absorbed  = min(ward, incomingDamage)
     ward      -= absorbed
     hpDamage   = incomingDamage - absorbed
```
- **Recharge** ist an den Mana-VERBRAUCH gekoppelt (nicht an Zeit): jeder 6-Mana-Cast lädt `6·0.5 = 3`
  Ward. Bei ~2.4 s Cast-Takt ≈ **1.3 Ward/s** Sustain, solange Mana da ist. Läuft Mana leer
  (Weak-Melee-Modus) → **kein** Recharge → Ward-Pool sinkt → Magier muss zurückstecken/essen. Das ist
  die gewollte Magier-Sustain-Identität (Gegenstück zum Melee-Lifesteal), **ohne** Unsterblichkeit:
  Recharge (1.3/s) ≪ typischer DPS-in → der große Pool ist die EHP, Recharge nur Flavor-Sustain.
- **Ersetzt `applyManaShield`** (combat.ts): der alte Ad-hoc-Manaschild (`MANA_SHIELD_*`) entfällt, damit
  Stoff nicht ZWEI Magie-Absorb-Layer stapelt. Ward ist der eine, saubere Nachfolger. (Migrations-Hinweis §3.)

### 1.5 Reihenfolge im Fight (combat-dev, resolveAttack gegen den Spieler)
```
1. dodge-Roll (Leder evasionRating)        → Treffer? sonst 0
2. Accuracy-Contest (Basis-Evasion)         → Treffer? sonst 0     (bestehend)
3. Mitigation (armorRating)                 → dmg ×= (1 - reduction)
4. Block-Roll (Schild)                      → wenn Block: dmg ×= 0.25
5. One-Shot-Cap                             → dmg = min(dmg, ONE_SHOT_CAP · maxHp)
6. Ward-Absorb (Stoff)                      → ward zuerst, Rest auf HP
7. HP -= Rest
```

### 1.6 One-Shot-Floor (Anti-Burst, alle Stile)
`dmg = min(dmg, ONE_SHOT_CAP · maxHp)` — kein Einzeltreffer entfernt mehr als 50 % der max. HP.
Garantiert **≥ 2 Treffer** aus vollem Leben und deckelt Enrage-/Über-Level-Spikes. Besonders wichtig
für Leder (RNG-Dodge darf keine „zwei Treffer aus dem Nichts = tot"-Spirale unter 2 zulassen).

---

## 2. Neue/geänderte Felder (logic-dev + shared)

### 2.1 `ItemDef` (packages/shared)
```ts
/** Platte-Mitigation: Roh-Armor je Teil. NUR auf Platten-Rüstung + Platten-Schilden (Guard). */
armorRating?: number;
/** Schild-Block-Chance 0..1. NUR auf offhand-Schilden gültig (Guard: slot==="offhand" && !weaponStyle). */
blockChance?: number;
/** Leder-Ausweichen: flache %-Ausweichchance (als 0..100-Punkte) je Teil. NUR auf Leder-Rüstung (Guard). */
evasionRating?: number;
/** Stoff-Ward: Beitrag zum Ward-Pool je Teil. NUR auf Stoff-Rüstung (Guard). */
wardCapacity?: number;
```
Guards (kontrolleur/logic-dev): `blockChance` nur auf Schilden; jede Klassen-Schicht nur auf ihrer
Klasse; alle vier ≥ 0; streng steigend je Tier (Ladder-Guard, §4).

### 2.2 `MonsterDef` (packages/shared)
```ts
/** Bestehendes `defense` bleibt = Armor-Mitigation. NEU: jeder Gegner bekommt einen Floor (§6). */
/** Defense-Typ für die spätere Konter-Achse (Armor-Pen/Precision/Mana-Break). Default "armor". */
defenseType?: "armor" | "evasion" | "ward";
```
`damage` wird per Rescale-Tabelle (§6) neu gesetzt. HP/Accuracy bleiben (Chef: „nicht zu tanky").

### 2.3 `DerivedStats` (packages/shared, computeStats-Output)
```ts
maxWard: number;        // §1.4
dodgeChance: number;    // §1.3 (0..1, bereits gecappt)
blockChance: number;    // §1.2 (0..1, gecappt)  — 0 bei 2H/kein Schild
armorRating: number;    // roh, VOR reduction (UI zeigt reduction% daraus)
// `defense` bleibt als Feld, ist jetzt = armorRating (Mitigation-Quelle); reduction wie gehabt in combat.
```

### 2.4 `CharacterState` (packages/shared) → **SAVE_VERSION-Bump 49 → 50**
```ts
/** Aktueller Ward-Pool (analog `hp`/`mana`). Persistiert. */
ward: number;
```
**Migration (persistence.ts):** Alt-Saves < 50 → `ward = 0` (wird beim ersten `computeStats`/Kampfstart
auf `maxWard` aufgefüllt, analog wie `hp`/`mana` beim Load geklemmt werden). `createCharacter` setzt
`ward: 0`. `sanitizeState` klemmt `ward` auf `[0, maxWard]`. Kein weiteres Feld nötig (Recharge/Block/
Dodge sind transient bzw. aus Gear abgeleitet).

---

## 3. `computeStats`-Änderungen (logic-dev, character.ts)

**Entfernen** (die `defenceEff`/Attribut-Defense-Terme):
```ts
// ALT (Zeile ~405):
defense: (attr.con*0.3 + attr.wis*0.1 + sDefence*0.1 + (style==="magic"? sMagicDef*0.05:0) + eq.defense) * defMult,
// ALT (Zeile ~362):
const evasion = 1 + attr.dex*0.3 + sDefence*0.05 + eq.evasion;
```
**Neu:**
```ts
// Mitigation kommt NUR aus der Platten-Schicht (+2H-Waffen-Bonus). Kein CON/WIS/defence-Term mehr.
const armorRating = eq.armorRating + twoHandMeleeArmorBonus;      // eq.armorRating = Σ item.armorRating
const defense = armorRating * defMult;                            // reduction in combat.ts wie gehabt

// Basis-Evasion (Accuracy-Contest) = nur DEX-Kern, KEIN defence-Skill:
const evasion = 1 + attr.dex*0.3 + eq.evasion;

// Neue Klassen-Schichten:
const dodgeChance = Math.min(DODGE_CAP, eq.evasionRating / 100);  // Leder, flache Vermeidung
const blockChance = mainhandTwoHanded ? 0 : Math.min(BLOCK_CAP, eq.blockChance); // Schild nur bei 1H
const maxWard = WARD_CORE_PER_INT*attr.int + eq.wardCapacity;     // Stoff
```
- Neue Aggregatoren im `eq`-Objekt: `armorRating`, `evasionRating`, `blockChance` (max, nicht sum, da 1 Schild),
  `wardCapacity` — analog zu `eq.defense` etc.
- **2H-Melee-Bonus** `twoHandMeleeArmorBonus`: wenn `style==="melee" && mainhandItem.twoHanded`, addiere
  den `armorRating`-Bonus der 2H-Waffe (§5). So kompensiert 2H den fehlenden Schild-Slot.
- `magic_def`-Skill verliert seinen Defense-Term komplett; er bleibt als Magie-Requirement-/XP-Skill bestehen
  (keine tote Referenz, nur der Defense-Beitrag entfällt). Prüfen, dass kein Test den alten `defense`-Wert pinnt
  (falls doch → neu pinnen, das ist gewollte Balance-Änderung).

**combat.ts:** `applyManaShield` + `MANA_SHIELD_ABSORB_PCT/COST_PER_DAMAGE/MANA_SHIELD_TIER_DIVISOR` entfernen;
stattdessen Ward-Absorb (§1.4/1.5) + Ward-Recharge beim Cast in `performPlayerAttack` (bei `casts=true`:
`ward = min(maxWard, ward + cost·WARD_PER_MANA)`).

---

## 4. Werte-Tabellen je Tier × Slot × Klasse

**Bänder** = Gear-Requirement-Level R (= `defence` / `ranged`/`leatherworking` / `magic_off`). Die drei
Linien existieren im Content bereits (Metall-Platte defence-gated, Hide-Leder leatherworking-gated,
Robe-Stoff magic_off-gated) — sie bekommen nur die neue Klassen-Schicht aufgeprägt.

### 4.1 Set-Ziele (volle 5 Rüstungsteile; Schild separat) + EHP-Referenz

| Band R | Platte mit% | Schild block% | Leder dodge% | Stoff maxWard | **EHP-Ref (1H+Schild)** |
|---:|---:|---:|---:|---:|---:|
| 10 | 35 | 15 | 42 | 31 | **72** |
| 20 | 40 | 20 | 58 | 54 | **110** |
| 40 | 45 | 28 | 61 | 110 | **179** |
| 60 | 50 | 35 | 67 | 186 | **292** |
| 90 | 55 | 40 | 73 | 432 | **556** |
| 99 | 57 | 43 | 75 (Cap) | ~560 | **~700** (Extrapol.) |

EHP-Ref = `maxHp / [(1−mit)(1−block·0.75)]` der Platte. Leder/Stoff sind auf **dieselbe** EHP-Ref
kalibriert (Leder ×1.05, siehe §4.5). maxHp-Basis je Band aus echten Set-Modifiern +
Skill-Attributen (combatLevel = R).

### 4.2 Generierende Formeln (für ALLE ~215 Teile, auch off-tier/Spezial)
content-dev leitet jedes Teil aus seinem Requirement-Level R ab — so ist die Leiter **streng steigend
und lückenlos** (keine Cliffs/Flats), auch für Zwischen-/Spezial-Tiers:
```
Platte:  mit(R)   = clamp(0.33 + 0.0024·R, 0, 0.60)      armorRating_set = K·mit/(1−mit)
Schild:  block(R) = clamp(0.13 + 0.0030·R, 0, BLOCK_CAP)
Leder:   dodge(R) = clamp(0.40 + 0.0037·R, 0, DODGE_CAP)          (in %-Punkte ×100)
Stoff:   maxWard(R) = EHP_Ref(R) − maxHp_cloth(R)   (Pool = EHP-Deckung des HP-Defizits; Tabelle 4.1)
```

### 4.3 Per-Slot-Verteilung (Gewichte, Summe = Set-Ziel)
| Slot | Gewicht |
|---|---:|
| body | 0.30 |
| legs | 0.22 |
| helmet | 0.20 |
| gloves | 0.14 |
| boots | 0.14 |
`pieceValue = round(setTotal × slotWeight, 1)`.

**Platte `armorRating` je Slot** (Set-AR = `K·mit/(1−mit)`; **75 %** auf die 5 Teile, **25 %** auf den Schild):

| Band R | Set-AR | helmet | body | legs | gloves | boots | Schild-AR | Schild block% |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 6.7 | 1.0 | 1.5 | 1.1 | 0.7 | 0.7 | 1.7 | 15 |
| 20 | 8.3 | 1.3 | 1.9 | 1.4 | 0.9 | 0.9 | 2.1 | 20 |
| 40 | 10.2 | 1.5 | 2.3 | 1.7 | 1.1 | 1.1 | 2.6 | 28 |
| 60 | 12.5 | 1.9 | 2.8 | 2.1 | 1.3 | 1.3 | 3.1 | 35 |
| 90 | 15.3 | 2.3 | 3.4 | 2.5 | 1.6 | 1.6 | 3.8 | 40 |

(Schild trägt Block als Identität **plus** 25 % der Set-AR. Kite- vs Tower-Schild als Sub-Wahl: Tower
= +Block/−Angriffstempo, Kite = leichter/mehr AR — Tuning content-dev, gleiches Gesamt-Defense-Budget.)

**Leder `evasionRating` je Slot** (%-Punkte, Summe = dodge%, +5 % EHP-Ziel):

| Band R | dodge% (Set) | helmet | body | legs | gloves | boots |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 42 | 8.4 | 12.6 | 9.3 | 5.9 | 5.9 |
| 20 | 58 | 11.5 | 17.3 | 12.7 | 8.1 | 8.1 |
| 40 | 61 | 12.2 | 18.4 | 13.5 | 8.6 | 8.6 |
| 60 | 67 | 13.4 | 20.1 | 14.8 | 9.4 | 9.4 |
| 90 | 73 | 14.6 | 21.9 | 16.1 | 10.2 | 10.2 |

**Stoff `wardCapacity` je Slot** (Pool minus INT-Kern `int·1`, Rest auf Felder):

| Band R | maxWard | INT-Kern | Feld-Ward | helmet | body | legs | gloves | boots | Recharge |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 31 | 12 | 19 | 4 | 6 | 4 | 3 | 3 | 1.3/s |
| 20 | 54 | 16 | 38 | 8 | 12 | 8 | 5 | 5 | 1.3/s |
| 40 | 110 | 16 | 94 | 19 | 28 | 21 | 13 | 13 | 1.3/s |
| 60 | 186 | 29 | 157 | 31 | 47 | 35 | 22 | 22 | 1.3/s |
| 90 | 432 | 48 | 384 | 77 | 115 | 84 | 54 | 54 | 1.3/s |

### 4.4 Parität-Nachweis (Modell-Skript, erwartetes EHP)

| Band R | Platte 1H+Schild | 2H-Melee | Leder | Stoff | Spanne |
|---:|---:|---:|---:|---:|---:|
| 10 | 72 (0 %) | 65 (−10 %) | 76 (+5 %) | 72 (0 %) | ±10 % ✅ |
| 20 | 110 (0 %) | 99 (−10 %) | 116 (+5 %) | 110 (0 %) | ±10 % ✅ |
| 40 | 179 (0 %) | 161 (−10 %) | 188 (+5 %) | 179 (0 %) | ±10 % ✅ |
| 60 | 292 (0 %) | 263 (−10 %) | 307 (+5 %) | 292 (0 %) | ±10 % ✅ |
| 90 | 556 (0 %) | 500 (−10 %) | 583 (+5 %) | 556 (0 %) | ±10 % ✅ |

### 4.5 Bewusste Abweichungen (innerhalb ±10 %)
- **Leder +5 %:** Varianz-Ausgleich (Dodge ist RNG, Mitigation/Ward glatt) — Chef-Freigabe „riskanterer
  Stil, minimal höheres Ø-EHP".
- **2H-Melee −10 %:** siehe §5 (Offense-Tradeoff).
- **Stoff:** Pool-basiert exakt auf EHP-Ref; +1.3/s Recharge-Sustain kommt on-top (im langen Kampf ~+5–8 %
  effektiv, bleibt in Toleranz) — die Magier-Sustain-Identität statt reiner Food-Abhängigkeit.

---

## 5. 1H+Schild vs. 2H — der Melee-interne Tradeoff (EHP-fair)

**Block ist AUSSCHLIESSLICH Melee-1H.** Bogen (2H) und Stab (2H)/Fokus-Offhand tragen KEINE Schilde →
Ranged/Magic haben nie Block. Damit ist Block eine reine Melee-1H-Schiene und bricht die Stil-Parität
NICHT (die Parität-Referenz ist die volle Melee-Defensiv-Ausstattung 1H+Schild vs. Leder-Dodge vs.
Stoff-Ward — alle drei auf dieselbe EHP-Ref geeicht).

**Innerhalb Melee** entsteht die klassische Wahl:

| Build | Mitigation | Block | Steh-EHP | Ausgleich |
|---|---|---|---|---|
| **1H + Schild** | Platte (§4.3) | ja (§4.3) | **100 % EHP-Ref** (Defensiv-Melee) | — |
| **2H (kein Schild)** | Platte **+ 2H-Waffen-`armorRating`-Bonus** | nein | **90 % EHP-Ref** | **Offense-Prämie** der 2H-Waffe (Waffen-Spec) |

- Der 2H-`armorRating`-Bonus (computeStats, §3) holt den fehlenden **Schild-AR-Anteil + einen Teil des
  Blocks** zurück, sodass 2H bei **90 %** der EHP-Ref landet (nicht bei nackten −Schild ~60 %, das wäre
  zu glasig). Die restlichen **10 %** sind der bewusste Tradeoff, gegengerechnet durch die höhere
  2H-Waffen-DPS (kürzere Kämpfe = weniger kumulierter Schaden).

**2H-Waffen-`armorRating`-Bonus je Band** (auf die Melee-2H-Waffe legen):

| Band R | 2H mit%-Ziel | 2H Set-AR gesamt | − 5 Platten-Teile (0.75·Set) | = **Waffen-AR-Bonus** |
|---:|---:|---:|---:|---:|
| 10 | 39 | 7.9 | 5.0 | **2.8** |
| 20 | 47 | 10.9 | 6.2 | **4.7** |
| 40 | 56 | 15.9 | 7.7 | **8.2** |
| 60 | 64 | 22.1 | 9.4 | **12.7** |
| 90 | 70 | 29.2 | 11.5 | **17.7** |

**Empfehlung:** 2H als **Offensiv-Melee** positionieren (−10 % EHP, +DPS via Waffen-Spec), 1H+Schild als
**Defensiv-Melee** (volle EHP, Block glättet Spikes). Das ist die idiomatische Sword-and-Board-vs-2H-Wahl
und EHP-fair (Gesamtmacht ≈ gleich). Die konkrete Offense-Prämie gehört in die **Waffen-Spec** (out of
scope hier) — Kopplungs-Hinweis: 2H-DPS-Prämie ~ +12–18 %, damit sie den EHP-Verlust genau ausgleicht,
NICHT übererfüllt (sonst „2H strikt besser").

---

## 6. Gegner-Rebalance (content-dev)

### 6.1 Damage-Rescale (nur `damage`, HP/Defense NICHT sprengen)
Ziel: on-level-Gegner tötet den **ungepanzerten** Helden in ~3 Treffern. Ziel-Damage als Funktion des
Monster-Levels (für L ≤ 99, die Leveling-Kurve, wo Gear progressiert):
```
targetDamage(L) = round(0.32·L + 2.2)      // L15→7, L30→12, L45→17, L65→23, L90→31
```
Für **L > 99 (Endgame-Gegner)** bleibt `damage` grob wie heute (bereits auf L99-Gear getunt, D≈8–31 +
Enrage) — nur nach unten glätten, falls ein Ausreißer unter `0.11·L` liegt. Rolle-Streuung erlaubt:
Caster/Archer +10–15 %, Tanks −10 %.

**Beispiel-Rescale (Ist → Ziel):**

| Monster | Lv | jetzt `damage` | Ziel | ×Faktor |
|---|---:|---:|---:|---:|
| goblin | 15 | 1 | 7 | 7.0 |
| goblin_warlock | 30 | 5 | 12 | 2.4 |
| ash_tyrant | 45 | 8 | 17 | 2.1 |
| forest_warden | 65 | 11 | 23 | 2.1 |
| skeleton_nekro | 90 | 15 | 31 | 2.1 |
| void_titan | 242 | 31 | 31 (halten) | 1.0 |

→ **Früh (L1–30) am stärksten hochziehen (×2.4–7), Mid (L40–90) ~×2, Endgame ~×1.** Der geared L99-Held
merkt die Frühgame-Erhöhung nicht (55 % Mitigation + 150 HP); der on-level-Bronze-Held gerät ungepanzert
in Lebensgefahr — genau der Effekt.

### 6.2 Gegner-Armor-Leiter (Groundwork für spätere Armor-Pen)
Jeder Gegner (auch Bestien) bekommt einen Armor-Floor + Defense-Typ, damit Spieler-Armor-Pen später
überall Sinn hat:
```
enemyArmorFloor(L) = round(0.05·L)        // L20→1, L60→3, L100→5, L200→10, L295→15
monster.defense = max(currentDefense, enemyArmorFloor(level))
```
(Deckt sich mit der heutigen `defense`-Größenordnung — meist nur ein Floor, kein Sprengen der TTK.)

**Defense-Typ** (`defenseType`, für die Konter-Achse; Waffen-Konter kommen später):

| Typ | Familien (Vorschlag) | später gekontert von |
|---|---|---|
| `armor` (default) | construct, humanoid, dragonkin | Armor-Pen (Streitkolben/Maul) |
| `evasion` | beast (flinke Tiere: Wölfe, Rocs, Hasen) | Precision (Dolche/Speere/Präzisionsbögen) |
| `ward` | undead-Caster, demon, wraith/shade | Mana-Break/Bann (geweihte Waffen/Stäbe) |

Nur Tagging jetzt (rein additiv, ungetaggt = `armor`). Die Konter-WIRKUNG ist Waffen-Spec-Scope.

---

## 7. Constraint-Nachweise (Modell-Skript, on-level je Band)

Enemy-Damage = §6.1-Rescale; Enemy-Interval ~3 s; hitChance aus Accuracy-Contest; Food = on-tier
(`cooked_chicken`→`cooked_salmon`→`greater_heal`→`cooked_wraithscale`, 3/4/6/9/15 Heilung, 3 s-CD).

### 7.1 Constraint 1 — Unarmored = Suizid, Armor = spürbar
| Band | ungepanzert TTK | gepanzert 1H+Schild TTK (kein Food) | EHP-Multiplikator |
|---:|---:|---:|---:|
| 10 | **9 s** (3.1 Treffer) | 38 s | 4.1× |
| 20 | **9 s** (2.9) | 41 s | 4.5× |
| 40 | **9 s** (2.9) | 40 s | 4.2× |
| 60 | **9 s** (3.0) | 49 s | 5.2× |
| 90 | **9 s** (3.0) | 63 s | 6.8× |

→ Ungepanzert stirbt der Held ab L10 in ~9 s (Idle-untauglich = Suizid). Rüstung gibt **4–7× EHP** →
klar spürbar, aber (7.2) nicht selbst-tragend.

### 7.2 Constraint 2 — Food bleibt nötig, nicht trivial (gepanzert, 1H+Schild)
| Band | DPS-in | Food-Heal/s | no-food-TTK | Netto (Heal−DPS) | Verdikt |
|---:|---:|---:|---:|---:|---|
| 10 | 1.04 | 1.00 | 38 s | −0.04 | Food nötig, knapp |
| 20 | 1.30 | 1.33 | 41 s | +0.03 | Food nötig, dünne Marge |
| 40 | 1.79 | 2.00 | 40 s | +0.21 | Food nötig, dünne Marge |
| 60 | 1.95 | 3.00 | 49 s | +1.05 | Food nötig |
| 90 | 2.40 | 5.00 | 63 s | +2.60 | Food deckt (Endgame-Puffer) |

→ **Kein natürlicher HP-Regen** (Chef-Entscheid v49) ⇒ jeder ungeheilte Chip-Schaden akkumuliert über
Kills → Food strukturell PFLICHT. on-tier-Food deckt den DPS-in nur knapp (Netto ~0) → schlechtes/kein
Food = Tod; Enrage-Spikes (×1.6–2.0) + 3 s-Auto-Eat-CD lassen mehrere harte Treffer durch → Food nie
trivial. Der Endgame-Puffer bei L90 (softester on-tier-Gegner) ist gewollt „Farm-Zone"; tiefes Endgame
(L100–295 + Enrage) stellt den Food-Druck wieder her.

### 7.3 Constraint 3 — EHP-Parität ±10 %
Siehe §4.4 — alle drei Stile je Band innerhalb ±10 % (Leder +5 %, 2H −10 %, beides bewusst).

**Gate-Methodik (für kontrolleur/Sim, analog itemization-2-spec):**
1. Voll-Set je Klasse je Band ausrüsten (combatLevel = R), `computeStats` → `maxHp/maxWard/dodge/block/
   reduction` lesen.
2. **EHP-Parität:** `EHP = maxHp / erwarteter Schadens-Faktor` je Stil vergleichen (Plate: `(1−red)(1−block·0.75)`,
   Leder: `(1−dodge)`, Stoff: `+maxWard`). Assert Spanne ≤ ±10 % je Band.
3. **Unarmored-Suizid:** `simulateCombat` on-level, `equip:[]`, `food:undefined` → erwartet `deaths` hoch /
   `kills` niedrig ab L10.
4. **Food-nötig:** dasselbe Loadout mit Voll-Rüstung, EINMAL `food:undefined` (muss über lange Fenster
   sterben/stallen) und EINMAL mit on-tier-Food (muss überleben) → beweist „Food nötig UND ausreichend".
5. **Kein geared-Wall:** `findGearedWalls` bleibt leer (kein Mob durch Rescale unbesiegbar).

---

## 8. Ward-UI-Vertrag (ui-dev)

- **Dritte Leiste** unter HP (rot) und Mana (blau): **Ward** (Vorschlag: cyan/weiß „Energieschild").
  Nur sichtbar, wenn `maxWard > 0` (Stoff getragen) — Platte/Leder zeigen sie nicht.
- Anzeige `ward / maxWard`; füllt sich sichtbar beim Casten (Recharge-Puls je Cast), sinkt bei Treffern
  VOR der HP-Leiste. Combat-Log-Event `kind:"shield"` bleibt (Betrag = absorbiert).
- **Leer-Zustand:** Ward = 0 → Leiste blinkt/gedämpft, Hinweis „Ward erschöpft — casten zum Aufladen".
  Kein Recharge im Weak-Melee (Mana leer) → visuelles Feedback, dass Casten die Defense speist.
- Char-Sheet: neue Zeilen je nach Klasse — **Platte:** „Mitigation X %" (aus `armorRating`), „Block Y %";
  **Leder:** „Ausweichen Z %"; **Stoff:** „Ward-Pool N, Recharge 1.3/s". Tooltip erklärt die Mechanik.
- Floating-Text: Block = „BLOCKIERT" (−75 %), Dodge = „AUSGEWICHEN" (0), Ward-Absorb = Schild-Icon.

---

## 9. Armor-Pen / Block / Konter-Achse (Chef-Frage, kurz)

- **Armor-Pen** (spätere Spieler-Waffen) reduziert **Mitigation/`armorRating`** des GEGNERS — es
  **umgeht Block NICHT**. Begründung: Pen ist eine Wert-Reduktion (gegen `armorRating`), Block ist eine
  **Vermeidungs-Chance** (wie Evasion). Saubere Konter-Zuordnung:
  - **Armor-Pen** ↔ Mitigation (`armor`-Typ)
  - **Precision** ↔ **Evasion UND Block** (beide = Vermeidungs-Chance; „Precision" ignoriert beide)
  - **Mana-Break** ↔ Ward (`ward`-Typ)
- Symmetrie: falls MONSTER später Block/Schilde bekommen, greift dieselbe Regel — Precision ignoriert
  Monster-Block, Armor-Pen nicht. Hält die drei Konter-Kanäle disjunkt (keine Mechanik von zwei Kontern
  getroffen). Konter-Wirkung selbst = **Waffen-Spec-Scope**, hier nur die Interaktions-Regel festgezurrt.

---

## 10. Apply-List (für CEO → content-dev / logic-dev / combat-dev / ui-dev)

**logic-dev (shared + character.ts + persistence):**
1. `ItemDef`: Felder `armorRating`, `blockChance`, `evasionRating`, `wardCapacity` (+ Guards §2.1).
2. `MonsterDef.defenseType`; `DerivedStats` +`maxWard/dodgeChance/blockChance/armorRating`.
3. `CharacterState.ward` + **SAVE_VERSION 49→50** + Migration (Alt→`ward:0`, Klemmen in sanitizeState).
4. `computeStats`: `defenceEff`/CON/WIS-Defense-Terme raus (§3), 4 neue Klassen-Schichten + 2H-AR-Bonus rein.
5. Konstanten in shared: `BLOCK_CAP=0.5`, `BLOCK_DAMAGE_REDUCTION=0.75`, `DODGE_CAP=0.75`,
   `WARD_PER_MANA=0.5`, `ONE_SHOT_CAP=0.5`, `WARD_CORE_PER_INT=1.0`.

**combat-dev (combat.ts):**
6. resolveAttack-Reihenfolge §1.5 (Dodge→Contest→Mitigation→Block→One-Shot-Cap→Ward→HP).
7. `applyManaShield` + `MANA_SHIELD_*` entfernen; Ward-Absorb + Ward-Recharge-beim-Cast rein.
8. One-Shot-Cap (§1.6) in der Schadens-Anwendung (Spieler-Seite).

**content-dev (index.ts):**
9. Alle ~215 Rüstungsteile: Klassen-Schicht per §4.2-Formel + §4.3-Slot-Gewichten setzen (Platte
   `armorRating`, Schilde `blockChance`+`armorRating`, Leder `evasionRating`, Stoff `wardCapacity`).
   Streng steigend je Tier (Ladder-Guard).
10. 2H-Melee-Waffen: `armorRating`-Bonus je Band (§5-Tabelle).
11. Gegner-`damage`-Rescale (§6.1) + `defense`-Floor + `defenseType`-Tags (§6.2).

**ui-dev:**
12. Ward-Leiste + Char-Sheet-Zeilen + Floating-Text (§8).

**kontrolleur:** Gate §7.3 fahren (Parität ±10 %, Unarmored-Suizid, Food-nötig, keine geared-Walls).

---

## 11. Offene Punkte (Chef-Entscheidung)
1. **Ward-Recharge-Quelle:** nur Cast-Mana (aktuell) — ODER auch Weak-Melee-Treffer minimal aufladen,
   damit ein Mana-leerer Magier nicht komplett Ward-los ist? (Aktuell bewusst: leer = kein Recharge = Druck.)
2. **Block: reduzieren (−75 %, gewählt) vs. voll negieren.** −75 % ist smoother; falls „BLOCKIERT = 0"
   mehr Wumms geben soll, `BLOCK_DAMAGE_REDUCTION=1.0` + `BLOCK_CAP` auf ~0.35 senken (gleiches Ø-Budget).
3. **DODGE_CAP 0.75:** hoch = swingy (Leder-Identität). Falls zu frustig → Cap 0.65 + Leder etwas mehr
   maxHp/Basis-Mitigation (weicht die Reinheit auf). Aktuell: Cap 0.75 + One-Shot-Floor als Sicherung.
4. **Leder-Ladder-Lücken** (L28→L50, kein L90-Tier) und **kein L90-Stoff-Tier zwischen 85/99** — content-dev
   sollte Zwischen-Tiers ergänzen, damit „viele Sprossen" auch für Leder/Stoff gilt (Platte ist am dichtesten).
5. **2H-Offense-Prämie** exakt beziffern in der Waffen-Spec (~+12–18 % DPS = −10 % EHP-Ausgleich).
