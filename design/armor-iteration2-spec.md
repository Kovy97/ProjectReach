# Armor-Iteration 2 — Zahlen-Spec (Kalibrierung + 2 Chef-Features)

Stand 2026-07-03 · Autor: balance-designer · Status: **Spec fertig, wartet auf logic/combat/content/ui-Apply**

Grundlage: `design/armor-trinity-spec.md` (Iteration 1, gebaut+gegatet), `design/armor-sweep-2026-07-03/TRIAGE.md`
(PHASE-C-GESAMTBILANZ, 10-Punkt-Fixliste) + die 12 Einzelberichte `C-*.md` + `GATE-B.md`.

**Die Kampf-MECHANIK ist bugfrei** (12/12 Tester + Gate-B: „0 Bugs im Kampf-Kern"). Diese Iteration ist
**Balance-Kalibrierung** (Fixliste 1–8, 10) + **2 Chef-Features** (Warding-Skill #9, Buff-Typ #10) +
die **×10-Armor-Skala** (Chef-Ergänzung, unten §0.2). Alle Zahlen sind mit dem Ist-Zustand geerdet (echte
computeStats-Werte der Tester) und per Modell-Skript auf EHP-Parität ±10 % nachgerechnet (§11).

**Ich wende nichts an** — die geordnete Apply-List (§12) geht an CEO → logic/combat/content/ui.

---

## 0. TL;DR

### 0.1 Konstanten-Diff (shared, `packages/shared/src/index.ts`)

| Konstante | Alt | **Neu** | Warum | Owner |
|---|---:|---:|---|---|
| `DEFENSE_MITIGATION_K` | 12.5 | **125** | ×10-Armor-Skala, mitigation-invariant (§0.2) | logic |
| `BLOCK_DAMAGE_REDUCTION` | 0.75 | **0.85** | Block-Wumms rauf → 1H+Schild als echte Defensiv-Linie (#3) | logic/combat |
| `WARD_CORE_PER_INT` | 1.0 | **0** | Ward NUR aus Stoffgear (Chef-Wunsch, #2) | logic |
| `MELEE_LIFESTEAL` | 0.08 | **0.06** | Lifesteal-Deckel → Food für Melee nicht mehr trivial (#6) | logic/combat |
| `K_DODGE` *(neu)* | – | **45** | diminishing Evasion `er/(er+K)` (Chef-Wunsch, #5) | logic |
| `LEATHER_HIT_FLOOR` *(neu)* | – | **0.12** | landender Treffer auf Leder −12 % → Dodge-Varianz-Boden (#5) | logic/combat |
| `WARD_KILL_REFILL_PCT` *(neu)* | – | **0.20** | Ward nur TEIL-Refill je Kill statt 100 % → Food-Druck für Magier (#6) | combat |
| `WARDING_REGEN_PER_LEVEL` *(neu)* | – | **0.02** | Warding-Skill → Ward-Regen/s (#9) | logic |
| `WARDING_REGEN_CAP` *(neu)* | – | **2.0** | Deckel Ward-Regen (bleibt ≪ DPS-in) (#9) | logic |
| `WARDING_DEF_STANCE_MULT` *(neu)* | – | **1.5** | Defensiv-Magie-Stance × Ward-Regen → Stance endlich nützlich (#9) | logic/combat |
| `WARDING_XP_PER_ABSORB` *(neu)* | – | **0.25** *(kalibrieren)* | Warding-XP je absorbiertem Ward-Punkt (#9) | combat |
| `DODGE_CAP` | 0.75 | **0.75** *(unverändert)* | diminishing soft-cappt schon; 0.65 würde high-band nerfen (§5) | – |
| `BLOCK_CAP` · `ONE_SHOT_CAP` · `WARD_PER_MANA` | 0.5 · 0.5 · 0.5 | *(unverändert)* | | – |

- **SAVE_VERSION 50 → 51** (Skill-Rename `magic_off→magic`, `magic_def→warding` braucht Migration, §9).

### 0.2 ×10-Armor-Skala (Chef-Ergänzung) — reine Anzeige-Skala, kein Balance-Shift

Der Chef will OSRS-artige, „große" Rüstungswerte (statt `iron_platelegs armorRating 1.11` künftig `~11`).
**Alle `armorRating`-Werte in DIESER Spec sind bereits in der ×10-Skala** (Fixliste-1-Retune direkt neu gerechnet,
NICHT doppelt). Mitigation bleibt **exakt identisch**, weil `K` mit-skaliert:

```
mitigation = armorRating / (armorRating + K)
alt: 6.73 / (6.73 + 12.5)  = 35.0 %
neu: 67.3 / (67.3 + 125)   = 35.0 %   ✅ bit-identisch
```

Betrifft (alle ×10): **jedes Platten-Teil-`armorRating`, Schild-`armorRating`, der 2H-Waffen-`armorRating`-Bonus,
`DEFENSE_MITIGATION_K` (12.5→125), UND jeder Monster-`defense`/`armor`-Wert** (die Gegner-Mitigation nutzt
DENSELBEN K-Term → symmetrisch mit-skalieren, sonst kippt die Gegner-Reduktion). `DEFENSE_MITIGATION_MAX` (0.80)
ist ein Verhältnis → **unverändert**.

**Entscheidung (begründet): `evasionRating` und `wardCapacity` NICHT skalieren.**
- `wardCapacity` **MUSS** 1:1 bleiben — der Pool wird DIREKT gegen eingehenden Schaden verrechnet
  (`absorbed = min(ward, dmg)`) und gegen `maxHp` (EHP, One-Shot-Cap). Schaden/HP werden NICHT skaliert;
  ein ×10-Ward würde 10× zu viel absorbieren → Kampf kaputt. Harte Kopplung, keine Präferenz.
- `evasionRating` ist reiner Formel-Input (`dodge = er/(er+45)`), verglichen mit nichts sonst → **kein**
  Konsistenz-Zwang. Seine Werte liegen schon im Zehner-Bereich (Σ 33–135, Teile 5–41), also nach dem
  Armor-×10 in **derselben Größenordnung** wie die Armor-Teile (11–37). Skalieren wäre reine Churn
  (nur `K_DODGE` ×10) ohne Gewinn.
- Netto: das Armor-×10 **verbessert** die Cross-Feld-Konsistenz (Armor war das einzige „kleine" Feld;
  jetzt liegen alle drei Trinity-Felder im Zehner-/niedrigen-Hunderter-Bereich).

---

## 1. Fixliste-Punkt 1 — Low-Band Stoff/Leder heben, Platte-Mid runter, Ladder füllen

**Root-Cause (Tester):** die Parität-Spanne bricht UNTER R60 (Gate-B: R10 Spanne 121 %, R30 37 %), weil (a) die
Leder/Stoff-Leitern am unteren Ende unter-spec + löchrig sind (L10 Leder dodge 34 statt 42, Stoff maxWard 8 statt 31),
und (b) das **CON-Budget** stark auseinanderläuft (iron-Platte con 21 → maxHp 49.7 vs Stoff con 10 → maxHp 27.7;
Platte ist am Low-Band +38–52 % **vor** der Schicht). Beide Terme multiplizieren sich.

### 1.1 CON-Budget-Leitplanke (der eigentliche Low-Band-Hebel)

Ziel-`maxHp` je Klasse **je Band** (Voll-Set, on-tier combatLevel), als Anteil der Platte-1H-`maxHp`:

| Klasse | Ziel-maxHp-Anteil | Begründung |
|---|---:|---|
| Platte 1H+Schild | **1.00** (Anker) | Tank-Identität, höchste HP |
| Platte 2H | **0.90** | verliert Schild-con |
| **Leder** | **0.86** | leichter, aber Dodge trägt |
| **Stoff** | **0.80** | leichtester; Ward kompensiert den Rest zur Parität |

Wo der Ist-Content abweicht (Low-Band-Stoff/Leder zu niedrig, Low-Band-Platte zu hoch), justiert content-dev die
**Set-`modifiers.con`**. Konkrete Prioritäts-Fixes (Band-10, aus den Testern):

| Set | Ist maxHp | **Ziel maxHp** | con-Änderung |
|---|---:|---:|---|
| iron-Platte (1H) | 49.7 | **~42** | con 21 → **~17** (Platte-Low-Band-Übertunung −38 % runter, GATE-B) |
| cured-Leder | 31.7 | **~36** | con 12 → **~14** |
| apprentice-Stoff | 27.7 | **~34** | con 10 → **~14** (Stoff-CON-Budget rauf, C-mage-L10 P2) |

### 1.2 Schicht-Ziel-Kurven (generierende Formeln, gelten für ALLE ~215 Teile + Zwischen-Tiers)

R = Requirement-Level des Teils (`defence` / `ranged`* / `magic`*). Streng steigend je Tier (Ladder-Guard).

```
Platte 5-Teile flat-mit(R) = clamp(0.26 + 0.0026·R, 0, 0.50)      armorRating_5pc = 125·mit/(1−mit)   [×10]
Schild block(R)            = clamp(0.22 + 0.0028·R, 0, BLOCK_CAP)  Schild-armorRating: +4 pp mit (Tab. §10)
Leder dodge(R)             = clamp(0.40 + 0.0032·R, 0, DODGE_CAP)  Σ evasionRating = 45·dodge/(1−dodge)
Stoff maxWard(R)           = EHP_Anker(R)·clothMult − maxHp_cloth(R)   (WARD_CORE_PER_INT=0 ⇒ Σ wardCapacity = maxWard)
   clothMult = 0.96 ab R60 (Recharge-Slack), sonst 1.00
2H-Waffen-armorRating(R)   = 125·mit2H/(1−mit2H) − armorRating_5pc,  mit2H aus EHP-Ziel 0.90·Anker (Tab. §10)
```

- **Platte-Mid runter:** `flat-mit(60)=0.416` (5-Teile) statt der Ist-0.50 → mit Schild-Bump `1H-mit(60)=46 %`
  (Ist 50 %). Das nimmt die von C-mage/C-melee-L60 gemeldete **Platte-L60-Übertunung (+14 %)** genau zurück.
- **Ladder-Lücken füllen** (content-dev, Zwischen-Tiers per obiger Formel ableiten):
  `leatherworking`/`ranged`-Lücke 5→22, `magic_off`/`magic`-Lücke 1→22 und 58→70, sowie ein Leder-Tier L28→L50.

**Die konkreten Werte-Tabellen je Tier × Slot stehen konsolidiert in §10.**

---

## 2. Fixliste-Punkt 2 — `WARD_CORE_PER_INT` 1.0 → 0 (gekoppelt mit #1 für Ranged)

- `WARD_CORE_PER_INT = 0` ⇒ `maxWard = eq.wardCapacity` (Ward NUR aus Stoffgear). Melee/Ranged zeigen keine
  Ward-Leiste mehr (UI gatet schon auf `maxWard>0`) und bekommen keinen Gratis-Absorb-Sockel. Löst den in ALLEN
  12 Testern gemeldeten „Ward-INT-Leak".
- **INT-Kern in `wardCapacity` einfalten:** die §10-Stoff-Tabelle rechnet den Pool bereits **komplett** aus
  Gear-`wardCapacity` (kein INT-Term mehr). Die maxWard-Zielwerte sind gegenüber Iteration 1 entsprechend erhöht
  (der frühere `int·1`-Anteil wandert in die Teile).
- **⚠️ KOPPLUNG (C-ranged-L60 P3):** der INT-Leak hob Ranged-EHP künstlich von −6 % auf +3 %. Fällt der Leak auf 0,
  rutscht Ranged unter Ziel — **außer** #1 (Leder-`evasionRating` + Leder-con rauf) landet GLEICHZEITIG. In dieser
  Spec ist Leder komplett auf Dodge+Floor+con neu geeicht (§11 zeigt Leder ohne INT-Ward on-parity) → **#1 und #2
  MÜSSEN in derselben Welle apply’d werden.**

---

## 3. Fixliste-Punkt 3 — 1H+Schild vs 2H: Block-Wumms rauf + 2H-AR runter

**Befund (C-melee-L30):** 2H dominiert 1H+Schild (+22 % Kills bei gleicher Sicherheit); 2H trägt **höhere** flache
Mitigation (51.7 % vs 42.5 %) UND Block cuttet nur `24 %·0.75 = 18 %` Ø. Die Defensiv-Melee-Linie ist unbelohnt.

**Gewählte Hebel (beide, moderat):**

1. **`BLOCK_DAMAGE_REDUCTION` 0.75 → 0.85** + **blockChance-Kurve am Low/Mid-Band angehoben**
   (`block(R)=0.22+0.0028·R` statt der Ist-`~0.15+0.0028·R`): Block-Ø-Reduktion an L30 steigt von 18 %
   (`24 %·0.75`) auf **~26 %** (`30 %·0.85`) — ein +42 % stärkerer Hebel, genau am Band, wo 2H am meisten dominiert.
   Full-Negate (§11.2-Chef-Option der alten Spec) wird **NICHT** genommen (C-melee-L10-„Immun-Feelbad"); 0.85 gibt
   Wumms ohne Null-Chip.
2. **2H-Waffen-`armorRating` gesenkt** auf ein sauberes EHP-Ziel **−10 %** (statt der gemessenen −5.6 % @L90 /
   Overshoot): die §10-Tabelle setzt `mit2H` so, dass 2H-EHP = `0.90·Anker` UND der **Pro-Treffer-Faktor von 2H
   ≥ dem von 1H+Schild** bleibt (§11: „2H softer/hit OK" alle Bänder) — d. h. 2H ist NICHT mehr auch der
   pro-Treffer-tankigere Build. Damit ist 1H+Schild die klar defensivere Wahl (höhere EHP + Block glättet Spikes),
   2H die offensive (−10 % EHP).

**Grenze der Armor-Hebel (ehrlich):** „Kills-bei-gleicher-Sicherheit" ist letztlich eine **Waffen-DPS-Frage**. Die
Armor-Seite macht 1H zur echten Defensiv-Linie und nimmt 2H den Pro-Treffer-Vorteil; die restliche Durchsatz-Parität
gehört in die **Waffen-Spec**: **2H-Offense-Prämie von effektiv ~+22 % auf ~+12 % trimmen** (= genau der −10 %-EHP-
Ausgleich, nicht mehr). → **Chef/weapon-spec-Kopplung (§13).**

---

## 4. Fixliste-Punkt 4 — 2H-`armorRating` an getragene Platte koppeln (BUG-Fix)

**Bug (C-melee-L60 P2):** `character.ts:316-318` vergibt `twoHandMeleeArmorBonus` UNBEDINGT (nur
`style==="melee" && twoHanded`) → nackter 2H-Held tankt 47–50 % Mitigation, stirbt nie → „unarmored = Suizid"
bricht für 2H.

**Fix (logic-dev, character.ts):** den Bonus mit dem Anteil getragener **Platten-Rüstungsteile** skalieren
(Body-Armor-Slots helmet/body/legs/gloves/boots, die `armorRating>0` tragen):

```ts
const plateWorn = ["helmet","body","legs","gloves","boots"]
  .filter(s => (content.items[c.equipment[s]]?.armorRating ?? 0) > 0).length;
const twoHandMeleeArmorBonus =
  (style === "melee" && mainhandTwoHanded)
    ? (mainhandItem?.armorRating ?? 0) * Math.min(1, plateWorn / 4)   // voll ab 4 Platten-Teilen, 0 nackt
    : 0;
```

- `plateWorn/4` (Cap 1.0): 0 Teile → 0 Bonus (nackter 2H = wirklich ungepanzert = Suizid ✅), 4–5 Teile → voller
  Bonus (Spec §5-Kompensation intakt). Sauberer linearer Übergang (kein harter Schwellen-Cliff).
- Guard-Test: „nackter 2H-Held (nur Waffe) hat `armorRating === 0` und `mitigation === 0`".

---

## 5. Fixliste-Punkt 5 — Evasion LINEAR → diminishing + Leder-Schadens-Floor

**Befund (C-ranged-L30 P2):** Leders „+18 % Papier-EHP" ist im echten Kampf INVERTIERT — Leder ist der
**squishigste** Stil low/mid-band (Dodge = reine Vermeidung; die ~41 % landenden Treffer treffen VOLL auf niedrige
HP; 1.3–3.5× kürzere TTK als Platte). High-Band (L60/L90) ist Leder **fine** (One-Shot-Cap bindet, Varianz niedrig,
beide SHIP).

### 5.1 Diminishing-Evasion (Chef-Wunsch „genau das gleiche wie Armor")

```
ALT:  dodgeChance = min(0.75, Σ evasionRating / 100)                       // linear
NEU:  dodgeChance = min(DODGE_CAP, Σ evasionRating / (Σ evasionRating + K_DODGE))   // diminishing, K_DODGE = 45
```

Identische Kurvenform wie Mitigation (`x/(x+K)`). Die **item-`evasionRating`-Werte werden neu getunt** (§10), damit
die neue Formel dieselbe Ziel-Dodge-Kurve liefert (streng steigend, erreicht den Cap erst bei L99):

| R | 10 | 20 | 40 | 60 | 90 | 99 |
|---|---:|---:|---:|---:|---:|---:|
| **dodge %** | 42 | 50 | 58 | 65 | 72 | 75 (Cap) |
| **Σ evasionRating** | 33 | 45 | 62 | 84 | 116 | 135 |

**`DODGE_CAP` bleibt 0.75** (NICHT 0.65). Begründung: die diminishing-Kurve soft-cappt das Wachstum bereits (wie
Armors 0.80-Cap, der selten bindet); ein Hard-Cap 0.65 würde die **bereits ge-SHIP-te** High-Band-Leder (L60 67 %,
L90 73 %) nerfen, obwohl die Tester sie explizit als sauber bestätigt haben. Die Varianz-Sorge des Testers löst
stattdessen der Floor (§5.2), gezielt am Low/Mid-Band. *(0.65 als optionale Chef-Verschärfung: §13.)*

### 5.2 Leder-Schadens-Floor (Varianz-Boden, low/mid entschärft, high-band harmlos)

```
NEU-Konstante  LEATHER_HIT_FLOOR = 0.12
combat.ts (resolveAttack gegen den Spieler): wenn dodgeChance > 0 (Leder getragen), wird ein
LANDENDER Treffer nach der Mitigation um 12 % reduziert:   if (dodgeChance > 0) dmg *= (1 − LEATHER_HIT_FLOOR)
```

- **Wirkung:** die Treffer, die durch den Dodge kommen, treffen nicht mehr VOLL → der „ein Unglückstreffer = halbe
  Leiste"-Effekt (C-ranged-L30) wird gedämpft, ohne Leders Vermeidungs-Identität zu Mitigation umzubauen (12 % ist
  klein). Am Low-Band (niedrige HP) spürbar, am High-Band nebensächlich (dort deckelt ohnehin der One-Shot-Cap).
- **Reihenfolge (aktualisiert, §1.5 der Alt-Spec):**
  `Dodge → Accuracy-Contest → Mitigation(Platte) → Leder-Floor(if dodge>0) → Block → One-Shot-Cap → Ward → HP`.
- Guard-Test: „Leder-Build: landender Treffer = `round(base·(1−0.12))`, gedeckelt durch One-Shot-Cap".

---

## 6. Fixliste-Punkt 6 — Food-Sustain-Asymmetrie (Chef: „Food nicht trivial" für ALLE)

**Befund:** Food ist trivial für **Melee** (Lifesteal deckt DPS-in bei hoher Mitigation; 3/4 L90-Bosse foodless
0-Tod) UND **Magier** (Ward-Voll-Reset je Kill → 0 HP-Schaden auf Nicht-DoT), aber **mandatory für Ranged**
(kein Sustain). Ranged ist die **korrekte Referenz** — die anderen beiden werden zu ihr hin getrimmt.

### 6.1 Ward-Reset auf X % statt 100 % — encounter-übergreifend tragen

**Bug-Wurzel (C-mage-L30/L90):** `combat.ts:760` (Welle) + `:785` (Respawn) setzen `ward = maxWard` je Kill →
voller Pool gratis → Chip akkumuliert nie → Food-Säule fällt.

**Fix (combat-dev):** Ward wird **farm-session-scoped** statt encounter-scoped, mit nur TEIL-Refill je Kill:

```
Konstante  WARD_KILL_REFILL_PCT = 0.20
combat.ts:244 (Kampf-START, frisches Engagen)      → ward = maxWard              (voll, unverändert)
combat.ts (Tod/Respawn-zu-voll-Heal)               → ward = maxWard              (voll, unverändert)
combat.ts:760 & :785 (Kill → Welle/Respawn)        → ward = min(maxWard, ward + WARD_KILL_REFILL_PCT · maxWard)
```

- **Effekt:** Der Magier startet jeden Farm-Lauf voll (stark für Burst/Boss), aber in einem Dauerkampf, wo pro
  Kill mehr Ward verbraucht wird als die 20 %+Cast-Recharge zurückgeben, **erodiert** der Pool über die Kills →
  fällt unter die eingehende Trefferhöhe → HP nimmt Schaden → **Food kehrt zurück**. Gegen weiche Nicht-DoT-Mobs
  (kurze Kämpfe, wenig Ward-Verlust) bleibt er lange oben (Farm-Zone-Puffer, gewollt), aber nicht mehr *unendlich*.
- Bleibt spec-konform „Recharge ≪ DPS-in, Pool = die EHP" (§1.4 Alt-Spec) — nur der Gratis-Voll-Reset entfällt.

### 6.2 Lifesteal-Deckel (Melee)

```
MELEE_LIFESTEAL 0.08 → 0.06   (Deckel MELEE_LIFESTEAL_CAP_PCT 0.05 / _ABS 1.2 unverändert)
```

- −25 % Lifesteal-Durchsatz: die 3 Nicht-Enrage-L90-Bosse kippen von „netto ~0 HP/s" (foodless 0-Tod) auf ein
  **leichtes Netto-Minus** → Food füllt die Lücke, ohne die Melee-Sustain-Identität zu töten (Lifesteal deckt weiter
  ~¾ des Chips). Der Enrage-Boss (last_idol) brauchte schon MIT 0.08 Food → bleibt so.

### 6.3 Stil-abhängige Food-Balance — Netto-Bild nach den Fixes

| Stil | Sustain-Quelle | nach Iteration 2 |
|---|---|---|
| **Ranged** | keine (Referenz) | Food **mandatory** (unverändert — die Zielmarke) |
| **Melee** | Lifesteal 0.06 | Food nötig (Lifesteal deckt ~¾ Chip, Rest = Food) |
| **Magier** | Ward-Recharge + 20 %-Kill-Refill | Food nötig auf Dauer-/Über-Level-Farm (Pool erodiert); stark für Burst |

→ Alle drei brauchen Food spürbar; keiner ist mehr food-frei. **Chef-Entscheid offen: Food-Philosophie**
(diese moderate Angleichung akzeptieren, ODER härter — dann Lifesteal 0.05 / Kill-Refill 0.10; §13).

---

## 7. Fixliste-Punkt 7 — L90-Sets `wraithhide_set` + `starweave_set`

**Bug (C-ranged-L90 P3):** `wraithhide` (Leder) + `starweave` (Stoff) existieren als ITEMS, aber ohne
`content.sets`-Eintrag → **0 Set-Bonus**, während on-band-Platte `aetherium_set` `{str12,con13,lck6}` (+26 maxHp)
trägt → Leder −3.5 % statt +5 %, Stoff-Unterparität. **NICHT** die Platte kopieren (= +13 % Overshoot).

**Neu anlegen (content-dev), auf die §1.1-maxHp-Anteile geeicht (Leder 0.86×, Stoff 0.80× Platte):**

| Set | pieces | minPieces | `modifiers` (auf +2…+5 % EHP getunt, NICHT Platte-äquiv.) |
|---|---|---:|---|
| **wraithhide_set** | 5 wraithhide-Teile | 5 | `{ dex 6, con 8, lck 3 }` (dex = Leder/Ranged-Identität; ~+16 maxHp) |
| **starweave_set** | 5 starweave-Teile | 5 | `{ int 6, wis 5, con 6 }` (int/wis = Magie; con trägt maxHp, Ward trägt den Rest) |

- Guard (C-ranged-L90 „Guard-Gap"): **content-integrity-Test** „jede Rüstungs-Familie mit ≥5 Slot-Teilen hat einen
  `content.sets`-Eintrag" — fängt diese Klasse Lücken künftig (Owner: logic-dev/kontrolleur).

---

## 8. Fixliste-Punkt 8 — Leder-Gating (Chef-Entscheid): `leatherworking` → `ranged`

**Befund (C-ranged-L10 P2):** ALLE Leder-Rüstung ist `leatherworking`-gegatet (Crafting-Skill), **0 Teile
`ranged`-gegatet. Ein reiner Kampf-Schütze levelt `ranged`, kann die Dodge-Schicht aber nicht anlegen ohne
Crafting-Grind — Asymmetrie zu Melee (`defence`) / Magier (`magic_off`→`magic`), die ihre Rüstung durchs Kämpfen
freischalten. Spec §0 wollte Leder `ranged`-gegatet.

**Empfehlung: Leder auf `ranged` umgaten.** Migrations-Impact:

- **Content:** `ItemDef.requirements` aller Leder-Rüstung `{ leatherworking: N }` → `{ ranged: M }`. Req-Mapping
  (leatherworking-Tiers ≈ ranged-Bänder): 2→5, 22→20, 28→28, 60→60, 90→90, 99→99.
- **KEINE Save-Migration nötig** (Requirements sind statischer Content, werden je Load neu gelesen). **Ein Edge-Case:**
  ein Held, der Leder rein via leatherworking trug, aber niedriges `ranged` hat, könnte es nach dem Umgaten nicht
  mehr anlegen. Mitigation: **bereits ausgerüstete Items grandfathern** (kein Force-Unequip beim Version-Load) ODER
  die neuen `ranged`-Reqs niedrig genug halten. (Owner: logic-dev bestätigt die equip-Gating-Kulanz.)
- **Gelootete Leder** (`leather_helm`/`leather_body`, aktuell nur `modifiers.con:1`, **0 evasionRating**): die
  on-tier-`evasionRating` aus §10 setzen, sonst ist gelootetes Leder auf der Avoidance-Achse effektiv ungepanzert.

**Chef-Alternative** (falls Crafting-Gate erwünscht): bestätigen + sicherstellen, dass `leatherworking` trivial früh
erreichbar ist. → **Chef-Entscheid (§13).**

---

## 9. Chef-Feature #9 — Warding-Skill (`magic_def`→`warding`, `magic_off`→`magic`)

Löst **zugleich** die von 3 Mage-Testern gemeldete „Magie-Defensiv-Stance ist nutzlos" (defMult × armorRating=0 für
Stoff) — die Defensiv-Stance wird die **Ward-Regen-Fertigkeit**.

### 9.1 Skill-Rename (shared + content + persistence)

```
magic_off  → magic     (Offensiv-Magie; trains: "int")
magic_def  → warding    (Ward-Regen;      trains: "wis")
```

- `shared`: `COMBAT_SKILL_IDS` / `BOOSTABLE_COMBAT_SKILL_IDS` / `SkillId`-Nutzungen (`magic_off`→`magic`,
  `magic_def`→`warding`); `activeStanceMods` (magic-defensive `xpSkill: "magic_def"` → `"warding"`,
  magic-offensive `"magic_off"` → `"magic"`).
- `content`: Skill-Defs (`magic` + `warding`, Namen/Desc/Icon `skills/warding.png` liegt bereits), + **alle 131×
  `magic_off`- und 11× `magic_def`-Referenzen** (Requirements, Actions, Achievements) umbenennen.
- `persistence`: **SAVE_VERSION 50→51 Migration** — `skills.magic_off`→`skills.magic`, `skills.magic_def`→
  `skills.warding` (XP/Level ERHALTEN, nur Key umbenennen). `magicStance`-Feld bleibt.
- `warding` bleibt in `COMBAT_SKILL_IDS`. Empfehlung: auch in `BOOSTABLE_COMBAT_SKILL_IDS` behalten (ein
  Gear-Boost → +Warding-Level → mehr Ward-Regen, konsistent). `magic` ersetzt `magic_off` überall dort.

### 9.2 Warding → Ward-Regen-Formel (logic-dev computeStats + combat-dev Tick)

```
DerivedStats.wardRegenPerSec =
    min(WARDING_REGEN_CAP, warding_level · WARDING_REGEN_PER_LEVEL)      // 0.02/Level, Cap 2.0
    · (magicStance === "defensive" ? WARDING_DEF_STANCE_MULT : 1)         // ×1.5 in Defensiv-Magie
```

| warding | 10 | 25 | 50 | 75 | 99 | 99 defensiv |
|---|---:|---:|---:|---:|---:|---:|
| Ward-Regen/s | 0.20 | 0.50 | 1.00 | 1.50 | 1.98 | **2.0 (Cap)** |

- **combat.ts (per Tick, analog `hpRegenPerSec`):** wenn `maxWard>0 && ward<maxWard`:
  `ward = min(maxWard, ward + wardRegenPerSec · dt_s)`. **Treibt/ergänzt** den bestehenden Cast-Recharge
  (`rechargeWard`, `combat.ts:1094`) — beide addieren sich. Max-Gesamt-Regen (Cast ~1.5/s + Warding ≤2.0/s) =
  **≤3.5/s ≪ Endgame-DPS-in (~7.5/s)** → der Pool bleibt die EHP (Spec §1.4 intakt, KEIN Unsterblichkeits-Sustain).
- **Löst zwei Dinge zugleich:** (a) Defensiv-Magie-Stance gibt jetzt echten Nutzen (×1.5 Ward-Regen + Warding-XP);
  (b) der mana-leere „Weak-Melee"-Magier (Spec §11.1-Offenpunkt) ist nicht mehr komplett ward-los — Warding regeneriert
  auch ohne Cast weiter.

### 9.3 XP-Quelle für Warding (Vorschlag)

**Primär (universell): Ward-Absorb trainiert Warding** — jeder Magier, der Treffer schluckt, levelt es, stil-
neutral und thematisch („man lernt Abwehr durch Abwehren"):

```
combat.ts (in absorbWard-Anwendung): grantSkillXp("warding", absorbed · WARDING_XP_PER_ABSORB)   // 0.25/Punkt, kalibrieren
```

**Sekundär (Anreiz): Defensiv-Magie-Stance-Casting** gibt zusätzlich Warding-XP (die bestehende
`xpSkill:"warding"`-Route der Stance) → macht die Stance-Wahl bedeutsam, ohne dass der Offensiv-Magier Warding NIE
trainiert (er trainiert es passiv übers Absorbieren).

- `WARDING_XP_PER_ABSORB = 0.25` ist ein **Startwert** — logic/combat-dev kalibriert gegen die `vitality`/`defence`-
  XP-Rate (Ziel: Warding levelt on-pace mit den anderen Defensiv-Skills bei einem farmenden Magier).
- **Chef-Entscheid offen:** Absorb-basiert (empfohlen, universell) vs. rein Stance-Casting-basiert (einfacher, aber
  Offensiv-Magier trainiert’s kaum). → §13.

### 9.4 Skill-Def-Shape (content)

```ts
magic:   { id: "magic",   name: { en: "Magic",   de: "Magie" },   trains: "int" }
warding: { id: "warding", name: { en: "Warding", de: "Abwehr" }, trains: "wis", icon: "skills/warding.png" }
```

---

## 10. Chef-Feature #10 — Buff-Typ-Erweiterung (Attribute + Trinity-Stats)

**Befund (TRIAGE nach Gate-B):** 39 Consumable-Buffs stehen auf Tempo/Krit/HP, weil `ActiveBuff.buff.bonus`
(`EquipBonus`) **KEINE** Attribute (str/dex/con/int/wis/lck) und **KEINE** Trinity-Stats (armorRating/evasionRating/
wardCapacity/blockChance) tragen kann. Chef will „Buffs stärken Attribute/Evasion/Block".

### 10.1 Erweiterte Buff-Shape (shared)

```ts
buff?: {
  durationMs: number;
  bonus: EquipBonus;                                  // wie bisher (Kampf-Flats)
  modifiers?: Partial<Record<AttributeId, number>>;   // NEU: Attribute (ganzzahlig)
  trinity?: {                                          // NEU: Trinity-Schicht
    armorRating?: number;      // ×10-Skala
    evasionRating?: number;    // Punkte (dodge-Formel-Input)
    wardCapacity?: number;     // 1:1-Pool
    blockChance?: number;      // 0..1 (nur mit Schild wirksam)
  };
}
```

**computeStats-Buff-Loop erweitern** (`character.ts:271-274`, parallel zu Gear):
```ts
for (const buff of c.buffs) {
  const bf = content.items[buff.itemId]?.buff; if (!bf) continue;
  addBonus(bf.bonus);
  if (bf.modifiers) for (const id of ATTRIBUTE_IDS) attr[id] += bf.modifiers[id] ?? 0;
  if (bf.trinity) {
    eq.armorRating += bf.trinity.armorRating ?? 0;
    eq.evasionRating += bf.trinity.evasionRating ?? 0;
    eq.wardCapacity += bf.trinity.wardCapacity ?? 0;
    eq.blockChance = Math.max(eq.blockChance, bf.trinity.blockChance ?? 0);
  }
}
```
Buff-Trinity wirkt **stil-unabhängig** (ein Trank-Effekt, temporär, kostet ein Consumable — wie OSRS; bewusst KEIN
Rüstungsklassen-Gate, damit z. B. ein Stein-Haut-Trank jedem kurz Mitigation gibt).

### 10.2 Erlaubte Buff-„Währungen" + Beispiel-Konversionen

| Währung | Feld | erlaubter Bereich (Guard) |
|---|---|---|
| Attribute | `buff.modifiers.{str,dex,con,int,wis,lck}` | 1…6 (ganzzahlig) |
| Armor | `buff.trinity.armorRating` | 0…150 (×10) |
| Dodge | `buff.trinity.evasionRating` | 0…40 |
| Ward | `buff.trinity.wardCapacity` | 0…80 |
| Block | `buff.trinity.blockChance` | 0…0.15 |
| Kampf-Flats (wie bisher) | `buff.bonus.*` | wie EquipBonus |

**Konversion der bestehenden Consumables (Beispiele — content-dev):**

| Consumable | Ist (buff.bonus) | **Neu (thematisch)** |
|---|---|---|
| `elixir_warding` | `maxHp: 6.6` | `trinity.wardCapacity: 40` (temp. Ward-Pool — passt zum Namen) |
| Stein-Haut-Trank (neu/umwidmen) | – | `trinity.armorRating: 80` (~+13 % Mitigation low/mid) |
| Fuchs-/Ausweich-Elixier | crit/speed | `trinity.evasionRating: 20` (temp. Dodge) |
| Bollwerk-Trank | – | `trinity.blockChance: 0.10` (nur mit Schild) |
| Riesen-/Adler-/Weisheits-Trank | flat dmg | `modifiers.{str|dex|int}: 4` |

**Guard (fehlt laut TRIAGE):** ein `consumable-buff`-content-Guard, der (a) verbietet, dass Consumables
Gear-only-Sinnlos-Flats tragen, und (b) die obigen Bereiche prüft. Owner: logic-dev.

---

## 11. Konsolidierte Werte-Tabellen (content-dev applied das VERBATIM)

Slot-Gewichte (Summe = Set-Ziel): **body 0.30 · legs 0.22 · helmet 0.20 · gloves 0.14 · boots 0.14** (unverändert
zu Iteration 1). Alle `armorRating` in **×10-Skala**. Zwischen-Tiers per §1.2-Formeln ableiten.

### 11.1 Platte `armorRating` (5 Teile, shared 1H+2H) — ×10

| R | 5pc-Σ | (mit %) | helmet | body | legs | gloves | boots |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 50 | 29 | 10 | 15 | 11 | 7 | 7 |
| 20 | 57 | 31 | 11 | 17 | 12 | 8 | 8 |
| 40 | 72 | 36 | 14 | 21 | 16 | 10 | 10 |
| 60 | 89 | 42 | 18 | 27 | 20 | 12 | 12 |
| 90 | 122 | 49 | 24 | 37 | 27 | 17 | 17 |
| 99 | 125 | 50 | 25 | 38 | 28 | 18 | 18 |

### 11.2 Schild (nur 1H): `blockChance` + `armorRating`-Bump — ×10

| R | block % | Schild-armorRating | → 1H-Gesamt-mit % |
|---:|---:|---:|---:|
| 10 | 25 | 10 | 33 |
| 20 | 28 | 11 | 35 |
| 40 | 33 | 13 | 40 |
| 60 | 39 | 16 | 46 |
| 90 | 47 | 21 | 53 |
| 99 | 50 | 22 | 54 |

*(Kite vs Tower als Sub-Wahl bleibt content-Tuning: Tower +Block/−Angriffstempo, Kite leichter/+AR — gleiches
Defense-Budget. C-melee-L60-P4: derzeit dominiert Tower strikt, weil Angriffstempo-Malus fehlt → beheben.)*

### 11.3 2H-Melee-Waffen-`armorRating`-Bonus (an getragene Platte gekoppelt, §4) — ×10

| R | weaponAR | → 2H-Gesamt-mit % | EHP-Ziel |
|---:|---:|---:|---:|
| 10 | 60 | 47 | −10 % |
| 20 | 70 | 50 | −10 % |
| 40 | 96 | 57 | −10 % |
| 60 | 129 | 64 | −10 % |
| 90 | 201 | 72 | −10 % |

### 11.4 Leder `evasionRating` (diminishing dodge = Σ/(Σ+45), Cap 0.75) — UNSKALIERT

| R | dodge % | Σ evR | helmet | body | legs | gloves | boots |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 42 | 32.6 | 6.5 | 9.8 | 7.2 | 4.6 | 4.6 |
| 20 | 50 | 45.0 | 9.0 | 13.5 | 9.9 | 6.3 | 6.3 |
| 40 | 58 | 62.1 | 12.4 | 18.6 | 13.7 | 8.7 | 8.7 |
| 60 | 65 | 83.6 | 16.7 | 25.1 | 18.4 | 11.7 | 11.7 |
| 90 | 72 | 115.7 | 23.1 | 34.7 | 25.5 | 16.2 | 16.2 |
| 99 | 75 | 135.0 | 27.0 | 40.5 | 29.7 | 18.9 | 18.9 |

*(+ `LEATHER_HIT_FLOOR = 0.12` pro landendem Treffer, §5.2.)*

### 11.5 Stoff `wardCapacity` (WARD_CORE_PER_INT=0 → Σ = voller Pool) — UNSKALIERT

| R | maxWard | helmet | body | legs | gloves | boots |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 45 | 9 | 14 | 10 | 6 | 6 |
| 20 | 68 | 14 | 20 | 15 | 10 | 10 |
| 40 | 138 | 28 | 41 | 30 | 19 | 19 |
| 60 | 242 | 48 | 73 | 53 | 34 | 34 |
| 90 | 523 | 105 | 157 | 115 | 73 | 73 |
| 99 | 640 | 128 | 192 | 141 | 90 | 90 |

*(Der frühere `int·1`-Kern ist eingefaltet — diese Pools sind höher als Iteration-1-§4.3 und stehen allein.)*

### 11.6 Parität-Nachweis (Modell-Skript, EHP je Spec §7.3-Methodik, ×10-invariant)

Konstanten: K=125, DODGE_CAP=0.75, K_DODGE=45, BLOCK_DR=0.85, LEATHER_FLOOR=0.12. maxHp-Anteile §1.1.

| Band | 1H+Schild | 2H | Leder | Stoff | Ø | max-Abw. | Verdikt |
|---:|---:|---:|---:|---:|---:|---:|---|
| R10 | 79 (+5 %) | 71 (−5 %) | 71 (−5 %) | 79 (+5 %) | 75 | 5.5 % | ✅ |
| R20 | 113 (+3 %) | 102 (−7 %) | 109 (0 %) | 113 (+3 %) | 109 | 6.9 % | ✅ |
| R40 | 210 (+3 %) | 189 (−8 %) | 209 (+2 %) | 210 (+3 %) | 205 | 7.5 % | ✅ |
| R60 | 362 (+3 %) | 326 (−7 %) | 369 (+5 %) | 348 (−1 %) | 351 | 7.2 % | ✅ |
| R90 | 710 (+4 %) | 639 (−6 %) | 691 (+2 %) | 681 (0 %) | 680 | 6.1 % | ✅ |

**Alle Bänder ≤ ±10 %** (max 7.5 %). 2H liegt bewusst am unteren Rand (−5…−8 %, Offense-Tradeoff). Leder trägt jetzt
seine EHP über Dodge+Floor+con OHNE INT-Ward — d. h. Punkt #1/#2 sind gekoppelt erfüllt. *(Die reale Leder-EHP liegt
via Accuracy-Contest-Evasion noch etwas höher — das §7.3-Papiermodell ist für Leder leicht pessimistisch, wie die
Tester bestätigten; darum kein +5 %-Zwang am High-Band.)*

---

## 12. Apply-List (geordnet, Single-Writer je Datei)

**Reihenfolge zwingend:** A (shared/logic) zuerst — sie definiert Konstanten/Felder/Migration, die B/C/D lesen.
**#1 und #2 in DERSELBEN Content-Welle** (Ranged-Kopplung, §2).

### A — logic-dev (shared + character.ts + persistence) — ZUERST
1. Konstanten (§0.1): `DEFENSE_MITIGATION_K 125`, `BLOCK_DAMAGE_REDUCTION 0.85`, `WARD_CORE_PER_INT 0`,
   `MELEE_LIFESTEAL 0.06`, + neu `K_DODGE 45`, `LEATHER_HIT_FLOOR 0.12`, `WARD_KILL_REFILL_PCT 0.20`,
   `WARDING_REGEN_PER_LEVEL 0.02`, `WARDING_REGEN_CAP 2.0`, `WARDING_DEF_STANCE_MULT 1.5`, `WARDING_XP_PER_ABSORB 0.25`.
2. `computeStats`: diminishing `dodgeChance = min(0.75, Σevr/(Σevr+K_DODGE))` (§5.1); `maxWard = eq.wardCapacity`
   (§2); 2H-Bonus × `min(1, plateWorn/4)` (§4); neu `wardRegenPerSec` (§9.2).
3. Skill-Rename `magic_off→magic`, `magic_def→warding` in `COMBAT_SKILL_IDS`/`BOOSTABLE`/`SkillId`/`activeStanceMods`
   (§9.1).
4. Buff-Shape `+modifiers +trinity` + Buff-Loop-Apply (§10.1) + Consumable-Buff-Guard (§10.2).
5. **SAVE_VERSION 50→51** + Migration Skill-Keys `magic_off→magic`/`magic_def→warding` (XP erhalten); equip-Gating-
   Kulanz für umgegatetes Leder (§8).
6. content-integrity-Guard „jede ≥5-Teile-Armor-Familie hat ein Set" (§7).

### B — combat-dev (combat.ts) — NACH A
7. resolveAttack-Reihenfolge: Leder-Floor-Step (§5.2) einfügen; `BLOCK_DAMAGE_REDUCTION` liest neu 0.85.
8. Ward-Kill-Refill: `:760`/`:785` `ward = maxWard` → `min(maxWard, ward + WARD_KILL_REFILL_PCT·maxWard)` (§6.1).
9. Warding: per-Tick `wardRegenPerSec` anwenden (§9.2) + Warding-XP bei `absorbWard` (§9.3).
10. 2H-Bonus-Guard-Verhalten (naked 2H mitigation 0) mit-verifizieren.

### C — content-dev (index.ts) — NACH A (Werte aus §11 VERBATIM)
11. Alle Platten-Teile `armorRating` §11.1 (×10) + Schilde §11.2 + 2H-Waffen §11.3; Platte-Mid runter (§1).
12. Alle Leder-`evasionRating` §11.4 (neu getunt für diminishing) + gelootete Leder evasionRating (§8).
13. Alle Stoff-`wardCapacity` §11.5 (INT-Kern eingefaltet).
14. CON-Budget-Leitplanke §1.1 (iron-Platte con runter, cured-Leder/apprentice-Stoff con rauf) + Ladder-Zwischen-Tiers.
15. `wraithhide_set` + `starweave_set` (§7).
16. Leder-Requirements `leatherworking→ranged` (§8, falls Chef zustimmt).
17. Monster: alle `defense`/`armor` ×10 (§0.2); Armor-Floor `round(0.5·L)` (×10).
18. Skill-Refs `magic_off→magic`/`magic_def→warding` (131+11 Refs) + Skill-Defs `magic`/`warding` (§9.1/§9.4).
19. Consumable-Buff-Konversionen (§10.2).
20. Content-Gaps: Monster L11–14, L31–33 (TRIAGE #10).

### D — ui-dev
21. Ward-Regen-Anzeige (Warding-Rate) im Charakterblatt; Skill-Sidebar `Magie`/`Abwehr` (Warding-Icon); Buff-Tooltips
    für Attribut-/Trinity-Buffs; Defensiv-Magie-Stance-Tooltip „+50 % Ward-Regen".

### E — kontrolleur — Re-Gate (§13-Kriterien)

---

## 13. Gate-Kriterien für Re-Gate + offene Chef-Entscheide

### Re-Gate-Kriterien (kontrolleur, headless, analog Gate-B — auf ECHTEM computeStats/simulateCombat)
1. **EHP-Parität ±10 % ALLE Bänder R10–R99** (nicht nur R90): Voll-Set je Klasse je Band, `computeStats` →
   EHP-Formel §7.3 → Spanne je Band ≤ ±10 % vom Ø. (Modell-Ziel §11.6.)
2. **×10-Invarianz:** Mitigation-% je Platten-Tier bit-identisch zu vor dem Rescale (K=125); Gegner-Mitigation
   ebenso. `mitigation.test.ts` grün.
3. **Naked 2H = Suizid:** `computeStats` nackter 2H → `armorRating 0`, `mitigation 0`; `simulateCombat` on-level →
   stirbt (§4-Fix greift).
4. **Leder-Varianz gedämpft:** Leder low-band `simulateCombat` → min-HP-Boden höher als Ist (Floor wirkt), TTK-sd
   niedriger; kein „2-Treffer-Burst-Tod < 2".
5. **Food nötig für ALLE Stile:** je Stil Voll-Set, on-tier, `food:undefined` über langes Fenster → driftet/stirbt
   (Melee via 0.06-Lifesteal-Rest, Magier via erodierendem Ward, Ranged wie gehabt); mit on-tier-Food → 0 Tode.
6. **1H+Schild ≥ 2H in Defensiv-Kennzahlen:** 1H-EHP > 2H-EHP UND 1H-Pro-Treffer-Faktor ≤ 2H (kein „2H tankiger/hit").
7. **Warding wirkt:** Warding-Level > 0 → `wardRegenPerSec > 0`; Defensiv-Magie-Stance → ×1.5; Gesamt-Ward-Regen
   ≪ Endgame-DPS-in (kein Unsterblichkeits-Sustain).
8. **Buff-Typ:** ein Test-Consumable mit `modifiers`/`trinity` verändert `computeStats`-Attribute/Trinity-Werte
   korrekt; Guard fängt Out-of-Range.
9. **Keine geared-Walls** (`findGearedWalls` leer); `pnpm typecheck` + Engine/Persistence-Tests + client-build grün.
10. Save-Migration 50→51: Alt-Save mit `magic_off`/`magic_def`-XP lädt → `magic`/`warding` mit erhaltener XP.

### Offene Chef-Entscheide (Defaults sind gesetzt; Chef kann kippen)
- **Leder-Gating (#8):** `ranged` umgaten (empfohlen) vs. `leatherworking` bestätigen. Default: **umgaten**.
- **Food-Philosophie (#6):** moderate Angleichung (Lifesteal 0.06 / Kill-Refill 0.20) akzeptieren vs. härter
  (0.05 / 0.10). Default: **moderat**.
- **Warding-XP-Quelle (#9.3):** Ward-Absorb-basiert (empfohlen, universell) vs. rein Defensiv-Stance-Casting.
  Default: **Absorb-basiert**, `WARDING_XP_PER_ABSORB 0.25` kalibrieren.
- **DODGE_CAP (§5.1):** 0.75 beibehalten (empfohlen) vs. 0.65 (aggressiver, nerft aber ge-SHIP-te High-Band-Leder).
  Default: **0.75**.
- **2H-Offense-Prämie (Waffen-Spec-Kopplung, #3):** effektiv +22 %→+12 % trimmen, damit „Kills-bei-gleicher-
  Sicherheit" ≈ 1H+Schild. Gehört in die Waffen-Spec, hier nur geflaggt.
```
