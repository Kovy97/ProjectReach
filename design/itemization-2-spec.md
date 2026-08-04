# Itemization 2.0 — Umsetzungs-Spec (Attribute-Gear + OSRS-Skill-Boosts)

**Autor:** balance-designer · **Datum:** 2026-07-02 · **Status:** FINAL zur Umsetzung (Chef-freigegebenes Großprojekt,
inkl. zweier verbindlicher Chef-Nachentscheidungen, s. §0).
**Art:** Reine Zahlen-/Struktur-Spec (design/*.md). KEIN Code geändert. content-dev / logic-dev / combat-dev / ui-dev
wenden 1:1 an. **Owner-Legende:** `[C]`=content-dev · `[L]`=logic-dev · `[K]`=combat-dev · `[U]`=ui-dev.
**Gelesen aus:** `packages/engine/src/character.ts` (computeStats) · `packages/content/src/index.ts` (alle 344
Rüstungs-/Schmuck-Stücke, 30 Sets, 23 Suffixe, 8 Affixe — maschinell extrahiert) · `packages/shared/src/index.ts`
(EquipBonus/ItemDef/SetDef/SuffixDef, Konstanten) · `design/stat-squish-spec.md` (§6.2) ·
`design/balance-pass3-2026-07-01.md`. **Baseline verifiziert:** `pnpm exec turbo run test --force` → 84 Files /
547 Tests grün, Sim ohne rote Flaggen (0-Deaths-Kette bis L96, plausible kills/h) — das ist der Vergleichszustand
für das Gate in §8.

---

## §0 Chef-Vision & getroffene Entscheidungen (Kurzliste)

**Vision (wörtlich):** Nach dem ÷10-Squish tragen Rüstungen hässliche Dezimal-Flats („Iron Full Helm +0.1 Melee").
NEU (WoW/OSRS-Hybrid): Rüstung gibt KEINE direkten Kampf-Stats mehr, sondern Kampf-ATTRIBUTE (STR/DEX/CON/INT/WIS/LCK);
der Schadenswert kommt von der WAFFE (Waffen bleiben wie sie sind). Ausnahmen wie in OSRS: besondere Stücke dürfen
Kampf-Werte tragen — Attack, Power, Defence, Ranged, Offensive Magic, Defensive Magic — wobei Power den Max-Schaden
modifiziert (wie OSRS-Strength).

**Chef-Nachentscheidung 1 (verbindlich):** STRIKTE Variante — auf Items sind DEFAULT NUR die 6 Attribute erlaubt.
KEINE def/hp/evasion/melee-Flats auf Rüstung („Iron Gauntlets mit Melee, Defense und HP sind verbotene Werte").
Verteidigung/HP entstehen indirekt über CON (+ DEX→Evasion); Stil-Identität über den Attribut-Mix
(Metall=STR/CON, Leder=DEX/CON, Stoff=INT/WIS).

**Chef-Nachentscheidung 2 (verbindlich):** Die Ausnahme-Kampfwerte sind **Skill-Level-Boosts im OSRS-Stil**
(„Ring of Power: +2 Power" → effektives Level 40→42; Wirkung über die BESTEHENDEN Formeln), kein Flat auf
EquipBonus-Felder. Item-Hierarchie: **Waffen** = Schaden/Tempo/Effekte (unverändert) · **Rüstung** = nur Attribute ·
**Schmuck/Capes/Amulette** = kleine Attribute + Skill-Boosts als Kern-Mechanik · Rüstungs-Boosts nur auf
Signaturen/Set-Krönungen.

**Top-Entscheidungen dieser Spec:**
1. **§6.2-Revert auf GANZZAHLIGE Attribute** bei gleicher Größenordnung: Basis 2.5→**3**, Skill-Beitrag
   „+0.5 je 4 Level" → „**+1 je 8 Level**" (gleiche Rate), alle Gear-/Suffix-Attributwerte ganzzahlig.
   **computeStats-Schadens-/Krit-/Tempo-/Mana-Koeffizienten bleiben UNVERÄNDERT** — nur die def/eva-Terme werden
   neu geeicht (§2), weil die bisherigen Gear-def/eva-Flats wegfallen und CON/DEX die Panzer-Kurve tragen müssen.
2. **Survivability bündelt in CON** (alte maxHp-, defense- UND evasion-Flats konvertieren nach CON), Offensive
   nach STR/DEX/INT, Mana nach WIS, Krit nach LCK. Deterministische Raten in §5.
3. **Skill-Boost-System**: neues Feld `skillBoost` auf ItemDef/SetDef (+ Suffix-Rolls auf Schmuck), Engine-Konzept
   „effektives Level" NUR in den Kampfformeln — NICHT in Requirements/CL/XP/Freischaltungen (§4).
4. **Set-Boni werden Attribute + 1 Boost-Krönung** (SetDef verliert sein EquipBonus-`bonus`-Feld zugunsten
   `modifiers` + `skillBoost`).
5. **Rüstungs-Tempo-System entfällt**: Metall-Item-Mali (`attackIntervalMs +25…+100`) UND Metall-Set-Tempo-Boni
   (−100…−300) werden ersatzlos gestrichen (heute Full-Set netto ≈ −25 ms → Änderung vernachlässigbar; Teil-Träger
   werden minimal schneller). `hpRegenPerSec`/`lifesteal` überleben NUR auf Signaturen als Effekt-Zeile (§5.4).
6. Die frühere Empfehlung „def/eva bleiben intrinsisch" ist durch Chef-Nachentscheidung 1 **verworfen**;
   §3 dokumentiert beide Rechnungen und die Eichung der strikten Variante.

---

## §1 [L] §6.2-REVERT — ganzzahlige Attributskala

Der 0.5-Raster (§6.2, a=1/2) widerspricht der neuen Attribut-Zentralität (Chef: keine 0.X-Werte). Der Revert behält
die HALBE Größenordnung (die Koeffizienten von heute bleiben), macht aber alle Quellen ganzzahlig:

### 1.1 Konstanten (shared/index.ts)
| Konstante | heute | **NEU** | Wirkung |
|---|---:|---:|---|
| `BASE_ATTRIBUTE_VALUE` | 2.5 | **3** | ganzzahlige Basis (+0.5 je Attribut ≈ +1 HP / +0.15 dmg — vernachlässigbar) |
| `ATTRIBUTE_SKILL_DIVISOR` | 4 | **8** | `floor(trainierteLevel/8)` GANZE Punkte; identische Rate wie heute (`floor(x/4)·0.5`), Rungs alle 8 statt 4 Level |
| `ATTRIBUTE_INPUT_SQUISH` | 0.5 | **entfällt** | alle Multiplikationsstellen streichen: `character.ts` Z.79 (Creation-Seed) und Z.156 (Skill-Beitrag); Suffix-Rundung s. 1.2 |

`createCharacter`: Creation-Seed-Punkte (`baseAttributes`-Input) zählen künftig 1:1 auf der neuen Skala
(Test-Fixtures, die alte Rohpunkte übergeben, werden re-baselined — Punkte sind auf der neuen Skala doppelt so
viel Output wert; Fixtures halbieren ihre Seeds oder pinnen neue Erwartungswerte).

### 1.2 [L] Suffix-Attribut-Rundung (shared, instanceBonusDelta)
Heute: `max(0.5, round(x·2)/2)` (0.5-Raster). **NEU:** `max(1, Math.round(k·S·variance))` — ganzzahlig, min 1.
Die `attrPerIlvl`-k-Werte im Content bleiben unverändert (gleiche Größenordnung, §7).

### 1.3 Ziel-Attributskala (Referenzpunkte, „jeder Punkt zählt")
| Attribut | wirkt (je Punkt, Koeffizienten unverändert bzw. §2) | L1 | Endgame-Max (BiS, gerechnet §6/Anhang A) |
|---|---|---:|---:|
| STR | +0.3 Schaden melee (≈ +0.44 maxHit) | 3 | **~82** (3+24 Skills+35 Metall+13 Set+7 Schmuck) |
| DEX | +0.24 rng-Schaden · −40 ms Intervall · +0.4 pp Krit · +0.6 acc · +0.3 eva (§2) | 3 | **~57** |
| CON | +2 maxHp · +0.3 defense (§2) | 3 | **~100–137** (Metall > Leder/Stoff) |
| INT | +0.34 Magieschaden · +10 maxMana | 3 | **~84** |
| WIS | +4 maxMana · +0.4 manaRegen · +0.1 defense (§2) | 3 | **~44** |
| LCK | +0.6 pp Krit · +0.04 Krit-Schaden | 3 | **~60** |

Skill-Training (unverändert `trains`): STR←woodcutting,power · DEX←attack,ranged,fletching · CON←mining,defence,
vitality,farming,slayer · INT←magic_off,runecrafting · WIS←magic_def,herblore · LCK←fishing,foraging,thieving.
Je Trainer-Skill L99: `floor(99/8)` = **12 Punkte** (exakt wie heute 24·0.5).

### 1.4 [L] SAVE_VERSION + Migration (Memory: „Save-Logik immer mitziehen")
`character.baseAttributes` ist persistiert (Basis 2.5, ggf. +Seed·0.5). **Migration:**
`neu[id] = 3 + Math.max(0, Math.round(alt[id] − 2.5))` (Live-Spieler ohne Seed: exakt 2.5 → 3).
SAVE_VERSION erhöhen. `character.hp` beim Laden auf neues maxHp clampen (Bestandslogik prüfen — maxHp ändert sich
durch §5-Konversion um bis zu ±20 %). `equippedInstances` brauchen KEINE Migration (Suffix-Werte werden live aus
Content-k-Werten abgeleitet; nur die Rundungsregel ändert sich → Anzeige-Delta, kein Save-Feld).

---

## §2 [L] computeStats — neue def/eva-Eichung + effektive Level

**UNVERÄNDERT bleiben:** `meleeDamage = (0.1 + str·0.3 + power·0.08 + eq.meleeDamage)·dmgMult` ·
`rangedDamage = dex·0.24 + ranged·0.1 + eq.rangedDamage` · `magicDamage = int·0.34 + magic_off·0.12 + eq.magicDamage` ·
`critChance = clamp((dex·0.4 + lck·0.6)/100 + eq.critChance, 0, 0.9)` (+ranged +0.06) ·
`attackIntervalMs = clamp(3000 − dex·40 + eq.attackIntervalMs, 800, 5000)` (+ranged ×0.90, Stances) ·
`maxHp = 5 + con·2 + (vit−1)·0.3 + eq.maxHp` · `maxMana = 30 + int·10 + wis·4 + eq.maxMana` ·
`manaRegen = (1.5 + wis·0.4 + eq.manaRegen)·petMult` · `critDamage = 1.5 + lck·0.04 + eq.critDamage` ·
`accuracy = round((5 + dex·0.6 + offenseSkill·0.2 + eq.accuracy)·accMult)` · `hpRegenPerSec`/`lifesteal`.
Die `eq.*`-Terme bleiben als Aggregat (Quellen: Waffen, Buffs/Tränke, Signatur-Effekte, Waffen-Suffixe/Affixe).

**NEU geeicht (die einzigen zwei Formel-Änderungen)** — die alten Gear-def/eva-Flats entfallen (Σ am Endgame ~57 def
/ ~19 eva auf Leder), CON/DEX übernehmen:

| Zeile | heute | **NEU** |
|---|---|---|
| defense | `(con·0.12 + wis·0.06 + defence·0.04 + magic?magic_def·0.02 + eq.defense)·defMult` | **`(con·0.3 + wis·0.1 + defenceEff·0.1 + magic?magic_defEff·0.05 + eq.defense)·defMult`** |
| evasion | `1 + dex·0.2 + defence·0.04 + eq.evasion` | **`1 + dex·0.3 + defenceEff·0.05 + eq.evasion`** |

`…Eff` = effektives (geboostetes) Level, §4. **Eichungs-Nachweis** (alt vs. neu, Werte aus §6-Konversion;
Mitigation = def/(def+12.5), Cap 0.80 ab def 50):

| Referenzpunkt | def alt | def NEU | Mitigation alt→neu | Kommentar |
|---|---:|---:|---|---|
| L99 Melee BiS (godiron) | ~69 | ~54 | 0.80 → 0.80 (beide ≥ Cap-Punkt 50) | Cap bleibt exakt erreichbar |
| L40 Melee (mithril) | ~17.5 | ~19.7 | 0.583 → 0.612 | leicht tankiger |
| L10 Melee (iron) | ~8 | ~6.2 | 0.39 → 0.33 | früh weicher — HP früh höher (min-1-Regel §5), EHP ≈ neutral |
| L99 Ranged BiS eva | ~31 | ~23 | — | Leder-eva-Flats entfallen; dex·0.3 + Boosts ersetzen ~70 % |
| L99 Magic def | ~20 | ~30 | 0.615 → 0.71 | Stoff etwas zäher (CON stilagnostisch) — Gate prüft |

**Bewusste Konsequenz der CON-Bündelung (ehrlich):** HP steigen je Leiter um ~+15–25 % (def/eva-Flats zahlen jetzt
in HP+def-über-CON aus), dafür sinken Spitzen-Mitigation im Midgame und Evasion-Spitzen (Leder) — EHP bleibt in
der Größenordnung, die KURVENFORM wird flacher/berechenbarer. Trim-Hebel stehen im Gate (§8.2).

---

## §3 Defense/Evasion-Frage — entschieden (Chef: STRIKT), beide Varianten gerechnet

**Variante „Flats bleiben intrinsisch"** (ursprüngliche Empfehlung, VERWORFEN durch Chef-Entscheid): def/eva-Zeilen
wären auf Rüstung geblieben (Panzer-Identität pro Material), nur Offensiv-Flats wandern. Vorteil: exakte Erhaltung
der Mitigations-/Evasion-Kurven. Nachteil: JEDES Rüstungsteil behielte 1–2 Dezimal-Flats („def 0.8") — der
Chef-Eyesore bliebe halb bestehen.

**Variante „alles in Attribute" (STRIKT, umgesetzt):** Die naive Umrechnung über die ALTEN Koeffizienten wäre absurd
gewesen — godiron_platebody def 13.6 ÷ 0.12 = **113 CON nur für die def-Zeile**; voidhide-Set eva 17.2 ÷ 0.2 =
**86 DEX** (= −3440 ms Angriffsintervall, +34 pp Krit → Systembruch am Tempo-Clamp). Darum ZWEI Maßnahmen:
1. **Koeffizienten-Anhebung** (§2): con·0.12→0.3 (def), dex·0.2→0.3 (eva), Skill-Terme ×2.5 — CON-Budgets in
   realistischer Größe (Endgame ~100–137) tragen die heutige Mitigations-Kurve; DEX trägt Evasion.
2. **Konversion def→CON (÷3) und eva→CON (÷2.6)** statt def→def / eva→dex: Survivability bleibt Survivability
   (HP+Mitigation über CON), Evasion-IDENTITÄT kommt aus dem dex-Mix (Leder trägt 3–5× so viel dex wie Metall)
   statt aus Flats. eva→dex hätte Ranged-DPS um ~+80 % inflationiert (dex-Punkte tragen Tempo/Krit/Schaden-Rider —
   im Generator-Lauf verifiziert und darum verworfen).

Stil-Identität über den Attribut-Mix (BiS-Leitern, aus §6): **Metall** str 35 / con 54 (+Set str 13 / con 17) ·
**Leder** dex 12 / con 33 (+Set dex 2 / lck 6) · **Stoff** int 43 / wis 15 / con 26 / lck 11 (+Set int 5 / lck 6).
Metall bleibt der CON-Panzer, Leder der DEX-Träger, Stoff der INT/WIS-Caster. ✓

---

## §4 [L]/[K]/[U] Skill-Boost-System (OSRS-Stil, Chef-Nachentscheidung 2)

### 4.1 Datenmodell (shared)
```ts
export type BoostableCombatSkillId = "attack" | "power" | "defence" | "ranged" | "magic_off" | "magic_def";
// ItemDef:  skillBoost?: Partial<Record<BoostableCombatSkillId, number>>;   // z.B. { power: 2 }
// SetDef:   bonus: EquipBonus  →  ERSETZEN durch:
//           modifiers?: Partial<Record<AttributeId, number>>;
//           skillBoost?: Partial<Record<BoostableCombatSkillId, number>>;
// SuffixDef: boostPerIlvl?: Partial<Record<BoostableCombatSkillId, number>>;  // §7, nur Schmuck-Pool
```
`vitality` ist bewusst NICHT boostbar. Kein neues EquipBonus-Feld nötig — die 6 Kampf-Werte sind Level-Boosts.

### 4.2 [L] Engine: „effektives Level" — wo es gilt und wo NICHT
In `computeStats` nach der Equipment-/Set-/Instanz-Aggregation:
```ts
const boost: Partial<Record<BoostableCombatSkillId, number>> = {}; // Σ aus item.skillBoost, set.skillBoost, Suffix-Rolls
const lvlEff = (id: BoostableCombatSkillId) => lvl(id) + (boost[id] ?? 0);
// sAttack/sPower/sDefence/sRanged/sMagicOff/sMagicDef → lvlEff(...); sVitality bleibt lvl("vitality").
```
**Geboostet wird GELESEN in:** meleeDamage (power·0.08), rangedDamage (ranged·0.1), magicDamage (magic_off·0.12),
accuracy (`offenseSkill`·0.2 — stilabhängig attack/ranged/magic_off), defense (defence·0.1, magic_def·0.05),
evasion (defence·0.05). Das sind ALLE Lesestellen der 6 Skills in computeStats — combat.ts liest die fertigen
DerivedStats und braucht keine Änderung außer den Guards (§8).
**Basis-Level (KEIN Boost) nutzen:** Ausrüstungs-Requirements (`canEquip`), Aktions-/Rezept-Freischaltungen,
`combatLevel` (dungeon.ts), XP-Kurve/`overLevelMult`/`combatXpLevelMult`, der `skill.trains`-Attributbeitrag (§1),
Anzeige des Skill-Fortschritts. → kein Zirkular-Exploit (Boost schaltet nichts frei und beschleunigt kein XP).

### 4.3 Wirkung je +1 Boost-Level (ehrliche Größenordnung, Formeln von heute)
| Boost | Wirkung je Level | Größenordnung |
|---|---|---|
| Attack | +0.2 accuracy (nur Melee-Stil-Genauigkeit) | ~+0.2–0.5 % Hit |
| Power | +0.08 meleeDamage-Roh (≈ +0.12 maxHit) | L10: ~+3 % DPS · L40: ~+0.7 % · L90: ~+0.2 % |
| Defence | +0.1 defense · +0.05 evasion | klein, stapelt mit CON |
| Ranged | +0.1 rng-Roh · +0.2 acc (Ranged-Stil) | analog Power |
| Offensive Magic | +0.12 Magie-Roh · +0.2 acc (Magie-Stil) | analog Power |
| Defensive Magic | +0.05 defense (nur Magie-Stil) | Flavor/Nische |

Boosts sind bewusst FLAVOR+früh-spürbar (OSRS-Potion-Feeling); die Masse der Kampfkraft liegt in Attributen+Waffe.
In den Budgets (§5) wird jeder vergebene Boost mit seinem Attribut-Gegenwert verrechnet (Power-Lv = 0.27 str,
Ranged-Lv = 0.15 dex, MagicOff-Lv = 0.35 int, Attack-Lv = 0.1 dex, Defence-Lv = 0.33 con) — Budget-neutral.

### 4.4 Boost-Budgets je Träger (ganzzahlig)
| Träger | Regel | Budget |
|---|---|---|
| Schmuck/Capes/Amulette | **Kern-Mechanik**: genau 1 Boost je Stück (größte thematische Alt-Zeile entscheidet den Skill) | req<20: +1 · req 20–45: +1 · 46–64: +2 · 65–81: +3 · 82–94: +3 · 95+: +4 (Ringe) / **+5** (Amulette/Capes); rarity-Fallback ohne req: epic +3, legendary +3, godly +4/+5 |
| Rüstungs-Signaturen (SELTEN: `idol_*`, `slayer_*`, rarity legendary/godly) | 1 Boost wie Schmuck-Tabelle | s. §6-Tabellen |
| Sets (Krönung) | 1 Stil-Boost je Set (Metall→Power, Leder→Ranged, Stoff→MagicOff) | T1–2: — · T3: +1 · T4–5: +2 · T6–7: +3 · T8–9: +4 · T10/Cap: +5 |
| Suffix-Rolls auf Schmuck | `boostPerIlvl` k=0.12 → +1 (früh) … +3 (ilvl 100) | §7 |
| normale Rüstung / Waffen | **KEINE Boosts** | — |

### 4.5 [U] UI-Konsequenzen
Skill-Anzeige der 6 Kampf-Skills: „42/99 **(+2)**" (geboostetes effektives Level, Boost grün; Basis bleibt die
XP-Anzeige). Item-Tooltip: Boost-Zeilen als „+2 Power" (eigene Farbe), Attribut-Zeilen ganzzahlig („+3 Strength").
Attribut-Anzeige im Charakterblatt wieder OHNE Dezimalstelle (Revert der §6.2-Ein-Dezimal-Anzeige).
Charakterblatt-Set-Anzeige liest künftig `set.modifiers`/`set.skillBoost` statt `set.bonus`.

---

## §5 [C] Attribut-Budget-System — deterministische Konversionsregeln

### 5.1 Äquivalenz-Vorrechnung (warum diese Raten)
Marginalwert je Attributpunkt (Formeln §2; Referenz Midgame L40–60, geared):
**1 STR** = +0.3 Roh ≈ +1.2 % Melee-DPS · **1 DEX** = +0.24 Roh +40 ms Tempo (+1.8 % Rate) +0.4 pp Krit +0.6 acc
≈ **0.85 Roh-ÄQUIVALENT** Ranged-DPS (3.5× des Direktanteils — darum werden rng-Flats mit ÷0.85 statt ÷0.24
konvertiert, sonst +250 % Inflation) · **1 INT** = +0.34 Roh +10 Mana (Uptime-Rider bewusst: Magie-Schwäche war
Uptime, pass3) · **1 CON** = +2 HP +0.3 def ≈ +2.6–3.4 EHP je nach Mitigationsfenster · **1 WIS** = +4 Mana
+0.4 Regen +0.1 def · **1 LCK** = +0.6 pp Krit +0.04 Krit-Mult ≈ +1.0 % DPS (bei Krit 15 %/CD 1.7).

### 5.2 Konversionsraten (alte bonus-Zeile → Attributpunkte; Basis der §6-Tabellen)
| alte Zeile | → Attribut | Rate | Begründung |
|---|---|---|---|
| meleeDamage m | STR | m ÷ 0.3 | exakt output-neutral |
| rangedDamage r | DEX | r ÷ 0.85 | Rider-Discount (Tempo/Krit/acc/eva), DPS-neutral |
| magicDamage g | INT | g ÷ 0.34 | exakt; +Mana-Rider = bewusster Uptime-Buff |
| accuracy a | DEX | a ÷ 4 | acc-Anteil eines dex-Punkts ≈ ¼ seines Werts |
| maxHp h | CON | h ÷ 2.2 | leichter Discount für den def-Rider |
| defense d | CON | d ÷ 3 | def→Panzer-CON (×0.3-Koeff. zahlt 90 % zurück + HP-Rider) |
| evasion e | CON | e ÷ 2.6 | Survivability bleibt Survivability; eva-Identität via dex-Mix (§3) |
| maxMana mm | WIS | mm ÷ 6 | 1 WIS = 4 Mana + Regen/def-Rider |
| manaRegen mr | WIS | mr ÷ 0.5 | 1 WIS = 0.4 Regen |
| critChance cc / critDamage cd | LCK | cc·65 + cd·14 | DPS-wertbasiert (kein Doppelzählen beider Zeilen) |

### 5.3 Rundung & Boost-Verrechnung
Je Stück werden ALLE Zeilen + vorhandene alte `modifiers` (0.5-Raster) je Attribut SUMMIERT, dann gerundet
(`Math.round`, half-up). **Min-1-Regel:** Summe ∈ [0.25, 0.5) → 1 Punkt (kleine Zeilen sterben nicht — bewusste,
minimale Frühgame-Aufwertung). Auf Boost-Trägern (§4.4) wird zuerst der Boost aus der größten thematischen Zeile
bestimmt (`Level = min(TierCap, floor(Zeile/Wirkung-je-Level))`, Wirkung: power 0.08 · ranged 0.1 · magic_off 0.12 ·
attack 0.2 · defence 0.1 auf def·0.8) und sein Attribut-Gegenwert (§4.3) vor der Rundung abgezogen.

### 5.4 Verbotene Werte & Effekt-Whitelist
Auf Rüstung/Schmuck sind `bonus.*`-Felder VERBOTEN (Guard, §8) — mit genau einer Whitelist:
`hpRegenPerSec`/`lifesteal` als Signatur-EFFEKTE auf Boost-Trägern/Signaturen (godly/legendary/idol_*/slayer_*,
Spalte „NEU Effekte" in §6). Gestrichen ersatzlos (zu klein für Äquivalent): `attackIntervalMs`-Mali/Boni auf
Rüstung+Metall-Sets (§0.5) sowie `hpRegenPerSec`-Krümel ≤0.08 auf Nicht-Signaturen (gravewarden_greatshield 0.04,
drovers_charm 0.03, bulls_heart 0.06, bonecharm 0.03, warden_greatcloak 0.07, slagweave 0.08 → deren Wert steckt
bereits im CON-Paket der Konversion).
**Weapon-seitige Offhands bleiben unverändert** (Schadensträger wie Waffen): `stormcaller_totem`,
`tidecaller_focus`, `beastcaller_totem`.

---

## §6 [C] Vollständige Konversions-Tabellen (id → alt → neu)

Legende ALT-Spalten: def/ev/hp/mm/mr/reg/ls/acc/mel/rng/mag/cc/cd/spd = die heutigen `bonus`-Felder.
NEU: `modifiers` = ganzzahlige Attribute · `skillBoost` = §4 · „Effekte" = Whitelist-Reste (§5.4).
„—" = Feld entfällt/leer. Diese Tabellen sind das APPLY-ARTEFAKT: content-dev ersetzt je id den kompletten
`bonus`-Block durch `modifiers`/`skillBoost`/Effekte-Whitelist exakt wie gelistet.


### 6.1 Metall-Leiter (108 Stücke: 12 Tiers × medhelm/fullhelm/platebody/chainbody/platelegs/gauntlets/sabatons/kiteshield/towershield)
| id | slot | req | ALT bonus | ALT modifiers | NEU modifiers | NEU skillBoost | NEU Effekte |
|---|---|---|---|---|---|---|---|
| copper_medhelm | helmet | defence 1 | def 0.2 · hp 0.6 | — | con 1 | — | — |
| copper_fullhelm | helmet | defence 1 | def 0.4 · hp 0.9 · spd 25 | — | con 1 | — | — |
| copper_platebody | body | defence 1 | def 0.8 · hp 2 · mel 0.1 · spd 100 | str 0.5 | str 1 · con 1 | — | — |
| copper_platelegs | legs | defence 1 | def 0.5 · hp 1.1 · mel 0.1 · spd 50 | str 0.5 | str 1 · con 1 | — | — |
| copper_gauntlets | gloves | defence 1 | def 0.1 · hp 0.2 | — | — | — | — |
| copper_sabatons | boots | defence 1 | def 0.1 · hp 0.2 | — | — | — | — |
| copper_kiteshield | offhand | defence 1 | def 0.4 · hp 0.7 · ev 0.2 | — | con 1 | — | — |
| copper_chainbody | body | defence 1 | def 0.5 · hp 1.1 · ev 0.2 | — | con 1 | — | — |
| copper_towershield | offhand | defence 1 | def 0.6 · hp 0.7 · spd 100 | — | con 1 | — | — |
| bronze_medhelm | helmet | defence 5 | def 0.3 · hp 0.8 · mel 0.1 | str 0.5 | str 1 · con 1 | — | — |
| bronze_fullhelm | helmet | defence 5 | def 0.5 · hp 1.3 · mel 0.1 · spd 25 | str 0.5 | str 1 · con 1 | — | — |
| bronze_kiteshield | offhand | defence 5 | def 0.6 · hp 1 · ev 0.2 | — | con 1 | — | — |
| bronze_platebody | body | defence 5 | def 1.1 · hp 2.8 · mel 0.1 · spd 100 | str 0.5 | str 1 · con 2 | — | — |
| bronze_chainbody | body | defence 5 | def 0.7 · hp 1.6 · ev 0.2 | — | con 1 | — | — |
| bronze_platelegs | legs | defence 5 | def 0.7 · hp 1.6 · mel 0.1 · spd 50 | str 0.5 | str 1 · con 1 | — | — |
| bronze_gauntlets | gloves | defence 5 | def 0.2 · hp 0.3 | — | — | — | — |
| bronze_sabatons | boots | defence 5 | def 0.2 · hp 0.3 | — | — | — | — |
| bronze_towershield | offhand | defence 5 | def 0.9 · hp 1 · spd 100 | — | con 1 | — | — |
| iron_medhelm | helmet | defence 10 | def 0.4 · hp 1.3 · mel 0.1 | str 0.5 | str 1 · con 1 | — | — |
| iron_fullhelm | helmet | defence 10 | def 0.8 · hp 2 · mel 0.1 · spd 25 | str 0.5 | str 1 · con 1 | — | — |
| iron_platebody | body | defence 10 | def 1.7 · hp 4.2 · mel 0.2 · spd 100 | str 1 | str 2 · con 2 | — | — |
| iron_chainbody | body | defence 10 | def 1.1 · hp 2.4 · ev 0.4 | — | con 2 | — | — |
| iron_platelegs | legs | defence 10 | def 1.1 · hp 2.4 · mel 0.2 · spd 50 | str 1 | str 2 · con 1 | — | — |
| iron_gauntlets | gloves | defence 10 | def 0.3 · hp 0.5 · mel 0.1 | — | str 1 · con 1 | — | — |
| iron_sabatons | boots | defence 10 | def 0.3 · hp 0.5 | — | con 1 | — | — |
| iron_kiteshield | offhand | defence 10 | def 0.8 · hp 1.6 · ev 0.4 | — | con 1 | — | — |
| iron_towershield | offhand | defence 10 | def 1.4 · hp 1.5 · spd 100 | — | con 1 | — | — |
| steel_medhelm | helmet | defence 20 | def 0.6 · hp 1.8 · mel 0.1 | str 0.5 | str 1 · con 1 | — | — |
| steel_fullhelm | helmet | defence 20 | def 1.1 · hp 2.8 · mel 0.1 · spd 25 | str 0.5 | str 1 · con 2 | — | — |
| steel_platebody | body | defence 20 | def 2.4 · hp 6 · mel 0.3 · spd 100 | str 1.5 | str 3 · con 4 | — | — |
| steel_chainbody | body | defence 20 | def 1.5 · hp 3.4 · ev 0.4 | — | con 2 | — | — |
| steel_platelegs | legs | defence 20 | def 1.5 · hp 3.4 · mel 0.2 · spd 50 | str 1 | str 2 · con 2 | — | — |
| steel_gauntlets | gloves | defence 20 | def 0.4 · hp 0.7 · mel 0.1 | — | str 1 · con 1 | — | — |
| steel_sabatons | boots | defence 20 | def 0.4 · hp 0.7 | — | con 1 | — | — |
| steel_kiteshield | offhand | defence 20 | def 1.2 · hp 2.2 · ev 0.4 | — | con 2 | — | — |
| steel_towershield | offhand | defence 20 | def 1.9 · hp 2.2 · spd 100 | — | con 2 | — | — |
| blacksteel_medhelm | helmet | defence 30 | def 0.8 · hp 2.4 · mel 0.1 | str 0.5 | str 1 · con 1 | — | — |
| blacksteel_fullhelm | helmet | defence 30 | def 1.5 · hp 3.7 · mel 0.1 · spd 25 | str 0.5 | str 1 · con 2 | — | — |
| blacksteel_platebody | body | defence 30 | def 3.2 · hp 8 · mel 0.3 · spd 100 | str 1.5 | str 3 · con 5 | — | — |
| blacksteel_chainbody | body | defence 30 | def 2 · hp 4.5 · ev 0.5 | — | con 3 | — | — |
| blacksteel_platelegs | legs | defence 30 | def 2 · hp 4.5 · mel 0.2 · spd 50 | str 1 | str 2 · con 3 | — | — |
| blacksteel_gauntlets | gloves | defence 30 | def 0.5 · hp 0.9 · mel 0.1 | — | str 1 · con 1 | — | — |
| blacksteel_sabatons | boots | defence 30 | def 0.5 · hp 0.9 · mel 0.1 | — | str 1 · con 1 | — | — |
| blacksteel_kiteshield | offhand | defence 30 | def 1.6 · hp 2.9 · ev 0.5 | — | con 2 | — | — |
| blacksteel_towershield | offhand | defence 30 | def 2.6 · hp 2.9 · spd 100 | — | con 2 | — | — |
| mithril_medhelm | helmet | defence 40 | def 1.1 · hp 3.1 · mel 0.1 | str 0.5 | str 1 · con 2 | — | — |
| mithril_fullhelm | helmet | defence 40 | def 1.9 · hp 4.9 · mel 0.1 · spd 25 | str 0.5 | str 1 · con 3 | — | — |
| mithril_platebody | body | defence 40 | def 4.2 · hp 10.5 · mel 0.4 · spd 100 | str 2 | str 3 · con 6 | — | — |
| mithril_chainbody | body | defence 40 | def 2.6 · hp 6 · ev 0.5 | — | con 4 | — | — |
| mithril_platelegs | legs | defence 40 | def 2.6 · hp 6 · mel 0.3 · spd 50 | str 1.5 | str 3 · con 4 | — | — |
| mithril_gauntlets | gloves | defence 40 | def 0.7 · hp 1.2 · mel 0.1 | — | str 1 · con 1 | — | — |
| mithril_sabatons | boots | defence 40 | def 0.7 · hp 1.2 · mel 0.1 | — | str 1 · con 1 | — | — |
| mithril_kiteshield | offhand | defence 40 | def 2.1 · hp 3.9 · ev 0.5 | — | con 3 | — | — |
| mithril_towershield | offhand | defence 40 | def 3.4 · hp 3.8 · spd 100 | — | con 3 | — | — |
| adamantium_medhelm | helmet | defence 50 | def 1.4 · hp 3.8 · mel 0.2 | str 1 | str 2 · con 2 | — | — |
| adamantium_fullhelm | helmet | defence 50 | def 2.4 · hp 6 · mel 0.2 · spd 25 | str 1 | str 2 · con 4 | — | — |
| adamantium_platebody | body | defence 50 | def 5.2 · hp 13 · mel 0.5 · spd 100 | str 2.5 | str 4 · con 8 | — | — |
| adamantium_chainbody | body | defence 50 | def 3.2 · hp 7.4 · ev 0.5 | — | con 5 | — | — |
| adamantium_platelegs | legs | defence 50 | def 3.2 · hp 7.4 · mel 0.4 · spd 50 | str 2 | str 3 · con 4 | — | — |
| adamantium_gauntlets | gloves | defence 50 | def 0.8 · hp 1.5 · mel 0.2 | — | str 1 · con 1 | — | — |
| adamantium_sabatons | boots | defence 50 | def 0.8 · hp 1.5 · mel 0.1 | — | str 1 · con 1 | — | — |
| adamantium_kiteshield | offhand | defence 50 | def 2.6 · hp 4.8 · ev 0.5 | — | con 3 | — | — |
| adamantium_towershield | offhand | defence 50 | def 4.2 · hp 4.7 · spd 100 | — | con 4 | — | — |
| runite_medhelm | helmet | defence 60 | def 1.7 · hp 4.7 · mel 0.3 | str 1.5 | str 3 · con 3 | — | — |
| runite_fullhelm | helmet | defence 60 | def 2.9 · hp 7.4 · mel 0.3 · spd 25 | str 1.5 | str 3 · con 4 | — | — |
| runite_platebody | body | defence 60 | def 6.4 · hp 16 · mel 0.7 · spd 100 | str 3.5 | str 6 · con 9 | — | — |
| runite_chainbody | body | defence 60 | def 4 · hp 9.1 · ev 0.6 | — | con 6 | — | — |
| runite_platelegs | legs | defence 60 | def 4 · hp 9.1 · mel 0.5 · spd 50 | str 2.5 | str 4 · con 5 | — | — |
| runite_gauntlets | gloves | defence 60 | def 1 · hp 1.8 · mel 0.2 | — | str 1 · con 1 | — | — |
| runite_sabatons | boots | defence 60 | def 1 · hp 1.8 · mel 0.1 | — | str 1 · con 1 | — | — |
| runite_kiteshield | offhand | defence 60 | def 3.2 · hp 5.9 · ev 0.6 | — | con 4 | — | — |
| runite_towershield | offhand | defence 60 | def 5.1 · hp 5.8 · spd 100 | — | con 4 | — | — |
| bloodiron_medhelm | helmet | defence 70 | def 2 · hp 5.8 · mel 0.4 | str 2 | str 3 · con 3 | — | — |
| bloodiron_fullhelm | helmet | defence 70 | def 3.6 · hp 9 · mel 0.4 · spd 25 | str 2 | str 3 · con 5 | — | — |
| bloodiron_platebody | body | defence 70 | def 7.8 · hp 19.5 · mel 0.9 · spd 100 | str 4.5 | str 8 · con 11 | — | — |
| bloodiron_chainbody | body | defence 70 | def 4.8 · hp 11.1 · ev 0.7 | — | con 7 | — | — |
| bloodiron_platelegs | legs | defence 70 | def 4.8 · hp 11.1 · mel 0.7 · spd 50 | str 3.5 | str 6 · con 7 | — | — |
| bloodiron_gauntlets | gloves | defence 70 | def 1.2 · hp 2.2 · mel 0.3 | — | str 1 · con 1 | — | — |
| bloodiron_sabatons | boots | defence 70 | def 1.2 · hp 2.2 · mel 0.2 | — | str 1 · con 1 | — | — |
| bloodiron_kiteshield | offhand | defence 70 | def 3.9 · hp 7.2 · ev 0.7 | — | con 5 | — | — |
| bloodiron_towershield | offhand | defence 70 | def 6.2 · hp 7 · spd 100 | — | con 5 | — | — |
| titanium_medhelm | helmet | defence 80 | def 2.4 · hp 7 · mel 0.5 | str 2.5 | str 4 · con 4 | — | — |
| titanium_fullhelm | helmet | defence 80 | def 4.3 · hp 10.9 · mel 0.5 · spd 25 | str 2.5 | str 4 · con 6 | — | — |
| titanium_platebody | body | defence 80 | def 9.4 · hp 23.5 · mel 1.2 · spd 100 | str 6 | str 10 · con 14 | — | — |
| titanium_chainbody | body | defence 80 | def 5.8 · hp 13.3 · ev 0.7 | — | con 8 | — | — |
| titanium_platelegs | legs | defence 80 | def 5.8 · hp 13.3 · mel 0.8 · spd 50 | str 4 | str 7 · con 8 | — | — |
| titanium_gauntlets | gloves | defence 80 | def 1.5 · hp 2.6 · mel 0.4 | — | str 1 · con 2 | — | — |
| titanium_sabatons | boots | defence 80 | def 1.5 · hp 2.6 · mel 0.3 | — | str 1 · con 2 | — | — |
| titanium_kiteshield | offhand | defence 80 | def 4.7 · hp 8.6 · ev 0.7 | — | con 6 | — | — |
| titanium_towershield | offhand | defence 80 | def 7.5 · hp 8.5 · spd 100 | — | con 6 | — | — |
| aetherium_medhelm | helmet | defence 90 | def 2.9 · hp 8.3 · mel 0.6 | str 3 | str 5 · con 5 | — | — |
| aetherium_fullhelm | helmet | defence 90 | def 5.2 · hp 13 · mel 0.6 · spd 25 | str 3 | str 5 · con 8 | — | — |
| aetherium_platebody | body | defence 90 | def 11.2 · hp 28 · mel 1.5 · spd 100 | str 7.5 | str 13 · con 16 | — | — |
| aetherium_chainbody | body | defence 90 | def 6.9 · hp 15.9 · ev 0.8 | — | con 10 | — | — |
| aetherium_platelegs | legs | defence 90 | def 6.9 · hp 15.9 · mel 1 · spd 50 | str 5 | str 8 · con 10 | — | — |
| aetherium_gauntlets | gloves | defence 90 | def 1.8 · hp 3.1 · mel 0.5 | — | str 2 · con 2 | — | — |
| aetherium_sabatons | boots | defence 90 | def 1.8 · hp 3.1 · mel 0.3 | — | str 1 · con 2 | — | — |
| aetherium_kiteshield | offhand | defence 90 | def 5.6 · hp 10.3 · ev 0.8 | — | con 7 | — | — |
| aetherium_towershield | offhand | defence 90 | def 9 · hp 10.1 · spd 100 | — | con 8 | — | — |
| godiron_medhelm | helmet | defence 99 | def 3.5 · hp 10.1 · mel 0.8 | str 4 | str 7 · con 6 | — | — |
| godiron_fullhelm | helmet | defence 99 | def 6.3 · hp 15.8 · mel 0.8 · spd 25 | str 4 | str 7 · con 9 | — | — |
| godiron_platebody | body | defence 99 | def 13.6 · hp 34 · mel 1.8 · spd 100 | str 9 | str 15 · con 20 | — | — |
| godiron_chainbody | body | defence 99 | def 8.4 · hp 19.3 · ev 0.9 | — | con 12 | — | — |
| godiron_platelegs | legs | defence 99 | def 8.4 · hp 19.3 · mel 1.2 · spd 50 | str 6 | str 10 · con 12 | — | — |
| godiron_gauntlets | gloves | defence 99 | def 2.2 · hp 3.8 · mel 0.6 | — | str 2 · con 2 | — | — |
| godiron_sabatons | boots | defence 99 | def 2.2 · hp 3.8 · mel 0.4 | — | str 1 · con 2 | — | — |
| godiron_kiteshield | offhand | defence 99 | def 6.8 · hp 12.5 · ev 0.9 | — | con 8 | — | — |
| godiron_towershield | offhand | defence 99 | def 10.9 · hp 12.2 · spd 100 | — | con 9 | — | — |

### 6.2 Leder-Leiter (46 Stücke: cured → voidhide)
| id | slot | req | ALT bonus | ALT modifiers | NEU modifiers | NEU skillBoost | NEU Effekte |
|---|---|---|---|---|---|---|---|
| cured_leather_cap | helmet | leatherworking 5 | def 0.4 · ev 0.6 · hp 1.2 | — | con 1 | — | — |
| cured_leather_body | body | leatherworking 5 | def 0.8 · ev 1 · hp 2.4 | — | con 2 | — | — |
| scaled_leather_body | body | leatherworking 28 | def 1.6 · ev 1.8 · hp 4 | — | con 3 | — | — |
| cured_leather_legs | legs | leatherworking 5 | def 0.6 · ev 0.8 · hp 1.8 | — | con 1 | — | — |
| hardened_leather_helm | helmet | leatherworking 22 | def 0.7 · ev 0.8 · hp 1.8 | — | con 1 | — | — |
| hardened_leather_body | body | leatherworking 22 | def 1.3 · ev 1.4 · hp 3.4 | — | con 3 | — | — |
| hardened_leather_legs | legs | leatherworking 22 | def 0.9 · ev 1.1 · hp 2.6 | — | con 2 | — | — |
| scaled_leather_helm | helmet | leatherworking 28 | def 0.9 · ev 1.2 · hp 2.2 | — | con 2 | — | — |
| scaled_leather_legs | legs | leatherworking 28 | def 1.2 · ev 1.5 · hp 3 | — | con 2 | — | — |
| studded_leather_helm | helmet | leatherworking 50 | def 1.4 · ev 1.4 · hp 3 · rng 0.1 | dex 0.5 | dex 1 · con 2 | — | — |
| studded_leather_body | body | leatherworking 50 | def 2.4 · ev 2.2 · hp 5.5 · rng 0.3 | dex 1 | dex 1 · con 4 | — | — |
| studded_leather_legs | legs | leatherworking 50 | def 1.8 · ev 1.8 · hp 4.2 · rng 0.2 | dex 0.5 | dex 1 · con 3 | — | — |
| warhide_helm | helmet | leatherworking 70 | def 2 · ev 1.8 · hp 4.2 · rng 0.3 | dex 0.5 | dex 1 · con 3 | — | — |
| warhide_body | body | leatherworking 70 | def 3.4 · ev 2.8 · hp 7.5 · rng 0.7 | dex 1.5 | dex 2 · con 6 | — | — |
| warhide_legs | legs | leatherworking 70 | def 2.6 · ev 2.4 · hp 5.8 · rng 0.4 | dex 1 | dex 1 · con 4 | — | — |
| cured_leather_vambraces | gloves | leatherworking 3 | def 0.2 · ev 0.4 · hp 0.8 | — | con 1 | — | — |
| hardened_leather_vambraces | gloves | leatherworking 22 | def 0.4 · ev 0.5 · hp 1.2 | — | con 1 | — | — |
| scaled_leather_vambraces | gloves | leatherworking 28 | def 0.5 · ev 0.7 · hp 1.4 | — | con 1 | — | — |
| studded_leather_vambraces | gloves | leatherworking 50 | def 0.8 · ev 0.8 · hp 2 · rng 0.2 | — | con 1 | — | — |
| warhide_vambraces | gloves | leatherworking 70 | def 1.1 · ev 1 · hp 2.8 · rng 0.4 | dex 0.5 | dex 1 · con 2 | — | — |
| cured_leather_boots | boots | leatherworking 2 | def 0.2 · ev 0.4 · hp 0.8 | — | con 1 | — | — |
| hardened_leather_boots | boots | leatherworking 22 | def 0.4 · ev 0.5 · hp 1.2 | — | con 1 | — | — |
| scaled_leather_boots | boots | leatherworking 28 | def 0.5 · ev 0.7 · hp 1.4 | — | con 1 | — | — |
| studded_leather_boots | boots | leatherworking 50 | def 0.8 · ev 0.8 · hp 2 | — | con 1 | — | — |
| warhide_boots | boots | leatherworking 70 | def 1.1 · ev 1 · hp 2.8 · rng 0.2 | dex 0.5 | dex 1 · con 2 | — | — |
| ironhide_helm | helmet | leatherworking 60 | def 1.7 · ev 1.6 · hp 3.6 · rng 0.2 | dex 0.5 | dex 1 · con 3 | — | — |
| ironhide_body | body | leatherworking 62 | def 2.9 · ev 2.5 · hp 6.5 · rng 0.5 | dex 1 | dex 2 · con 5 | — | — |
| ironhide_legs | legs | leatherworking 61 | def 2.2 · ev 2.1 · hp 5 · rng 0.3 | dex 0.5 | dex 1 · con 4 | — | — |
| ironhide_vambraces | gloves | leatherworking 60 | def 0.9 · ev 0.9 · hp 2.4 · rng 0.3 | dex 0.5 | dex 1 · con 2 | — | — |
| ironhide_boots | boots | leatherworking 60 | def 0.9 · ev 0.9 · hp 2.4 · rng 0.1 | dex 0.5 | dex 1 · con 2 | — | — |
| dragonhide_helm | helmet | leatherworking 82 | def 2.8 · ev 2.4 · hp 5.8 · rng 0.4 | dex 1 | dex 1 · con 4 | — | — |
| dragonhide_body | body | leatherworking 82 | def 4.6 · ev 3.6 · hp 10 · rng 0.9 | dex 2 | dex 3 · con 7 | — | — |
| dragonhide_legs | legs | leatherworking 82 | def 3.6 · ev 3.2 · hp 7.8 · rng 0.5 | dex 1.5 | dex 2 · con 6 | — | — |
| dragonhide_vambraces | gloves | leatherworking 82 | def 1.6 · ev 1.4 · hp 4 · rng 0.5 | dex 1 | dex 2 · con 3 | — | — |
| dragonhide_boots | boots | leatherworking 82 | def 1.6 · ev 1.4 · hp 4 · rng 0.3 | dex 0.5 | dex 1 · con 3 | — | — |
| shadowhide_helm | helmet | leatherworking 95 | def 3.8 · ev 3.2 · hp 7.8 · rng 0.5 | dex 1.5 | dex 2 · con 6 | — | — |
| shadowhide_body | body | leatherworking 95 | def 6.2 · ev 4.8 · hp 13 · rng 1.1 | dex 2.5 | dex 4 · con 10 | — | — |
| shadowhide_legs | legs | leatherworking 95 | def 4.8 · ev 4.2 · hp 10 · rng 0.6 | dex 1.5 | dex 2 · con 8 | — | — |
| shadowhide_vambraces | gloves | leatherworking 95 | def 2.2 · ev 2 · hp 5.6 · rng 0.6 | dex 1 | dex 2 · con 4 | — | — |
| shadowhide_boots | boots | leatherworking 95 | def 2.2 · ev 2 · hp 5.6 · rng 0.4 | dex 0.5 | dex 1 · con 4 | — | — |
| voidhide_helm | helmet | leatherworking 99 | def 4 · ev 3.4 · hp 8.2 · rng 0.6 | dex 1.5 | dex 2 · con 6 | — | — |
| voidhide_body | body | leatherworking 99 | def 6.4 · ev 5 · hp 14.8 · rng 1.3 | dex 2.5 | dex 4 · con 11 | — | — |
| voidhide_legs | legs | leatherworking 99 | def 5 · ev 4.4 · hp 10.8 · rng 0.7 | dex 1.5 | dex 2 · con 8 | — | — |
| voidhide_vambraces | gloves | leatherworking 99 | def 2.4 · ev 2.2 · hp 5.6 · rng 0.7 | dex 1 | dex 2 · con 4 | — | — |
| voidhide_boots | boots | leatherworking 99 | def 2.4 · ev 2.2 · hp 5.6 · rng 0.6 | dex 1 | dex 2 · con 4 | — | — |

### 6.3 Stoff-Leiter (40 Stücke: apprentice → voidweave)
| id | slot | req | ALT bonus | ALT modifiers | NEU modifiers | NEU skillBoost | NEU Effekte |
|---|---|---|---|---|---|---|---|
| apprentice_robe_hat | helmet | magic_off 1 | def 0.2 · ev 0.4 · hp 0.8 | — | con 1 | — | — |
| apprentice_robe_body | body | magic_off 1 | def 0.3 · ev 0.6 · hp 1.4 | int 0.5 | con 1 · int 1 | — | — |
| apprentice_robe_legs | legs | magic_off 1 | def 0.2 · ev 0.5 · hp 1 | — | con 1 | — | — |
| apprentice_mitts | gloves | magic_off 1 | def 0.2 · ev 0.4 · hp 0.8 | — | con 1 | — | — |
| apprentice_slippers | boots | magic_off 1 | def 0.2 · ev 0.4 · hp 0.8 | — | con 1 | — | — |
| frost_circlet | helmet | magic_off 22,runecrafting 20 | def 0.6 · ev 0.8 · hp 1.8 · mag 0.2 | int 0.5 | con 1 · int 1 | — | — |
| frost_robe_body | body | magic_off 22,runecrafting 20 | def 1 · ev 1.2 · hp 3 · mag 0.5 | int 0.5 | con 2 · int 2 | — | — |
| frost_robe_legs | legs | magic_off 22,runecrafting 20 | def 0.7 · ev 0.9 · hp 2.2 · mag 0.3 | int 0.5 | con 2 · int 1 | — | — |
| frost_handwraps | gloves | magic_off 22,runecrafting 20 | def 0.6 · ev 0.8 · hp 1.9 · mag 0.3 | int 0.5 | con 1 · int 1 | — | — |
| frost_treads | boots | magic_off 22,runecrafting 20 | def 0.6 · ev 0.8 · hp 1.9 · mag 0.2 | — | con 1 · int 1 | — | — |
| ember_robe_hood | helmet | magic_off 30,runecrafting 32 | def 0.9 · ev 1.1 · hp 2.4 · mag 0.4 · acc 0.4 | int 0.5 · wis 0.5 | con 2 · int 2 · wis 1 | — | — |
| ember_robe_body | body | magic_off 30,runecrafting 32 | def 1.4 · ev 1.5 · hp 4 · mag 0.7 · acc 0.7 | int 1 · wis 1 | con 3 · int 3 · wis 1 | — | — |
| ember_robe_legs | legs | magic_off 30,runecrafting 32 | def 1 · ev 1.1 · hp 3 · mag 0.5 | int 0.5 | con 2 · int 2 | — | — |
| ember_handwraps | gloves | magic_off 30,runecrafting 32 | def 0.8 · ev 1 · hp 2.2 · mag 0.4 · acc 0.4 | int 0.5 | con 2 · int 2 | — | — |
| ember_sandals | boots | magic_off 30,runecrafting 32 | def 0.8 · ev 1 · hp 2.2 · mag 0.3 · acc 0.3 | int 0.5 | con 2 · int 1 | — | — |
| aether_hood | helmet | magic_off 40,runecrafting 45 | def 1.1 · ev 1.4 · hp 3 · mag 0.5 · acc 0.6 | int 1 · wis 1 | con 2 · int 2 · wis 1 | — | — |
| aether_robe_body | body | magic_off 40,runecrafting 45 | def 1.8 · ev 1.8 · hp 5.2 · mag 1 · acc 1 | int 1 · wis 1.5 | dex 1 · con 4 · int 4 · wis 2 | — | — |
| aether_robe_legs | legs | magic_off 40,runecrafting 45 | def 1.3 · ev 1.3 · hp 3.8 · mag 0.7 | int 0.5 | con 3 · int 3 | — | — |
| aether_gloves | gloves | magic_off 40,runecrafting 45 | def 1.2 · ev 1.2 · hp 3.4 · mag 0.6 · acc 0.6 | int 0.5 · wis 0.5 | con 2 · int 2 · wis 1 | — | — |
| aether_slippers | boots | magic_off 40,runecrafting 45 | def 1.2 · ev 1.2 · hp 3.4 · mag 0.6 · acc 0.6 | int 0.5 | con 2 · int 2 | — | — |
| arcane_cowl | helmet | magic_off 55,runecrafting 58 | def 1.3 · ev 1.5 · hp 3.6 · mag 0.7 · acc 0.8 | int 1 · wis 1 | con 3 · int 3 · wis 1 | — | — |
| arcane_robe_body | body | magic_off 55,runecrafting 58 | def 2.2 · ev 2 · hp 6 · mag 1.3 · acc 1.2 | int 1.5 · wis 1.5 | dex 1 · con 4 · int 5 · wis 2 | — | — |
| arcane_robe_legs | legs | magic_off 55,runecrafting 57 | def 1.6 · ev 1.5 · hp 4.5 · mag 0.8 | int 1 | con 3 · int 3 | — | — |
| arcane_mitts | gloves | magic_off 55,runecrafting 57 | def 1.4 · ev 1.3 · hp 3.9 · mag 0.8 · acc 0.8 | int 1 · wis 0.5 | con 3 · int 3 · wis 1 | — | — |
| arcane_slippers | boots | magic_off 55,runecrafting 57 | def 1.4 · ev 1.3 · hp 3.9 · mag 0.8 · acc 0.8 | int 0.5 | con 3 · int 3 | — | — |
| runewoven_cowl | helmet | magic_off 70,runecrafting 72 | def 1.7 · ev 1.8 · hp 4.4 · mag 0.9 · acc 1.2 | int 1.5 · wis 1.5 | dex 1 · con 3 · int 4 · wis 2 | — | — |
| runewoven_robe_body | body | magic_off 70,runecrafting 72 | def 2.8 · ev 2.4 · hp 7.8 · mag 1.6 · acc 1.6 | int 2 · wis 2 | dex 1 · con 5 · int 7 · wis 2 | — | — |
| runewoven_robe_legs | legs | magic_off 70,runecrafting 71 | def 2.1 · ev 1.8 · hp 5.8 · mag 1.1 | int 1.5 | con 4 · int 5 | — | — |
| runewoven_handwraps | gloves | magic_off 70,runecrafting 71 | def 1.8 · ev 1.6 · hp 5.1 · mag 1 · acc 1 | int 1 · wis 1 | dex 1 · con 4 · int 4 · wis 1 | — | — |
| runewoven_treads | boots | magic_off 70,runecrafting 71 | def 1.8 · ev 1.6 · hp 5.1 · mag 1 · acc 1 | int 1 | dex 1 · con 4 · int 4 | — | — |
| godspark_mitre | helmet | magic_off 85,runecrafting 88 | def 2 · ev 2 · hp 5.4 · mag 1.4 · acc 1.4 · cc 0.03 · mr 0.35 | int 1.5 · wis 2 | dex 1 · con 4 · int 6 · wis 3 · lck 2 | — | — |
| godspark_vestment | body | magic_off 85,runecrafting 88 | def 3.4 · ev 2.8 · hp 9.2 · mag 2.3 · acc 2 · cc 0.04 · cd 0.12 · mr 0.35 | int 2 · wis 2.5 | dex 1 · con 6 · int 9 · wis 3 · lck 4 | — | — |
| godspark_skirt | legs | magic_off 85,runecrafting 88 | def 2.4 · ev 2 · hp 6.6 · mag 1.6 · acc 1.4 · mr 0.35 | int 1.5 | dex 1 · con 5 · int 6 · wis 1 | — | — |
| godspark_handwraps | gloves | magic_off 85,runecrafting 88 | def 2.2 · ev 1.8 · hp 6 · mag 1.4 · acc 1.3 · cc 0.02 · mr 0.35 | int 1.5 · wis 1.5 | dex 1 · con 4 · int 6 · wis 2 · lck 1 | — | — |
| godspark_sandals | boots | magic_off 85,runecrafting 88 | def 2.2 · ev 1.8 · hp 6 · mag 1.4 · acc 1.3 · cc 0.02 · mr 0.35 | int 1 | dex 1 · con 4 · int 5 · wis 1 · lck 1 | — | — |
| voidweave_mitre | helmet | magic_off 99,runecrafting 99 | def 2.4 · ev 2.4 · hp 6.4 · mag 2 · acc 2 · cc 0.03 · mr 0.4 | int 2 · wis 3 | dex 1 · con 5 · int 8 · wis 4 · lck 2 | — | — |
| voidweave_vestment | body | magic_off 99,runecrafting 99 | def 4.2 · ev 3.4 · hp 11 · mag 3.2 · acc 2.8 · cc 0.05 · cd 0.15 · mr 0.4 | int 3 · wis 3.5 | dex 1 · con 8 · int 12 · wis 4 · lck 5 | — | — |
| voidweave_skirt | legs | magic_off 99,runecrafting 99 | def 3 · ev 2.6 · hp 8 · mag 2.2 · acc 2 · mr 0.4 | int 2 · wis 1 | dex 1 · con 6 · int 8 · wis 2 | — | — |
| voidweave_handwraps | gloves | magic_off 99,runecrafting 99 | def 2.7 · ev 2.2 · hp 7.2 · mag 2 · acc 1.9 · cc 0.03 · mr 0.4 | int 2 · wis 2 | dex 1 · con 5 · int 8 · wis 3 · lck 2 | — | — |
| voidweave_sandals | boots | magic_off 99,runecrafting 99 | def 2.7 · ev 2.2 · hp 7.2 · mag 2 · acc 1.9 · cc 0.03 · mr 0.4 | int 1.5 · wis 1 | dex 1 · con 5 · int 7 · wis 2 · lck 2 | — | — |

### 6.4 Schmuck & Capes (68 Stücke — Boost-Kernmechanik, §4.4)
| id | slot | req | ALT bonus | ALT modifiers | NEU modifiers | NEU skillBoost | NEU Effekte |
|---|---|---|---|---|---|---|---|
| gemstone_ring | ring1 | jewelcrafting 20 | acc 0.6 · cc 0.02 | — | lck 1 | Attack +1 | — |
| gemstone_amulet | amulet | jewelcrafting 26 | acc 0.8 · cc 0.02 · hp 1.4 | — | con 1 · lck 1 | Attack +1 | — |
| garnet_ring | ring1 | jewelcrafting 1 | mel 0.1 · rng 0.1 · hp 0.4 | — | — | Power +1 | — |
| garnet_amulet | amulet | jewelcrafting 3 | hp 1 · def 0.2 | — | — | Defence +1 | — |
| fang_necklace | amulet | jewelcrafting 5 | mel 0.3 · cc 0.03 | — | str 1 · lck 2 | Power +1 | — |
| sapphire_ring | ring1 | jewelcrafting 15 | mag 0.3 · acc 0.5 | — | int 1 | Attack +1 | — |
| sapphire_amulet | amulet | jewelcrafting 18 | mag 0.5 · ev 0.4 · hp 1.2 | — | con 1 · int 1 | MagieOff +1 | — |
| ruby_ring | ring1 | jewelcrafting 34 | mel 0.4 · cc 0.02 | — | str 1 · lck 1 | Power +1 | — |
| ruby_amulet | amulet | jewelcrafting 38 | mel 0.6 · cd 0.1 · hp 1.8 | — | str 2 · con 1 · lck 1 | Power +1 | — |
| diamond_ring | ring1 | jewelcrafting 55 | def 0.5 · acc 0.6 · ev 0.4 | — | con 1 | Attack +2 | — |
| diamond_amulet | amulet | jewelcrafting 60 | def 0.8 · hp 2.5 · acc 0.6 · cc 0.02 | — | con 1 · lck 1 | Defence +2 | — |
| onyx_ring | ring1 | jewelcrafting 70 | mel 0.8 · rng 0.8 · mag 0.8 · cc 0.03 | — | str 2 · dex 1 · int 2 · lck 2 | Power +3 | — |
| onyx_amulet | amulet | jewelcrafting 75 | def 1.4 · hp 4.5 · acc 1 · cd 0.15 | — | dex 1 · con 2 · lck 2 | Defence +3 | — |
| spellbinder_ring | ring1 | jewelcrafting 46 | mag 0.8 · acc 0.6 | — | int 2 | MagieOff +2 | — |
| bloodstone_ring | ring1 | jewelcrafting 44 | mel 0.6 · rng 0.6 · cc 0.025 | — | str 2 · dex 1 · lck 2 | Power +1 | — |
| bloodstone_amulet | amulet | jewelcrafting 48 | def 0.9 · hp 3 · cc 0.025 · mel 0.5 | — | str 2 · con 1 · lck 2 | Defence +2 | — |
| voidstone_ring | ring1 | jewelcrafting 85 | mel 1.2 · rng 1.2 · mag 1.2 · cc 0.04 | — | str 3 · dex 1 · int 4 · lck 3 | Power +3 | — |
| voidstone_amulet | amulet | jewelcrafting 88 | def 1.8 · hp 6.5 · acc 1.4 · cd 0.18 | — | dex 1 · con 3 · lck 3 | Defence +3 | — |
| godgem_ring | ring1 | jewelcrafting 95 | mel 1.6 · rng 1.6 · mag 1.6 · cc 0.05 · cd 0.2 | — | str 4 · dex 2 · int 5 · lck 6 | Power +4 | — |
| godgem_amulet | amulet | jewelcrafting 99 | def 2.4 · hp 9 · acc 1.8 · cd 0.25 · cc 0.04 | — | dex 1 · con 3 · lck 6 | Defence +5 | — |
| soul_amulet | amulet | jewelcrafting 15 | hp 2.2 · mag 0.5 · def 0.3 | — | con 1 · int 1 | MagieOff +1 | — |
| grave_warden_band | ring1 | jewelcrafting 55 | def 1.2 · hp 4 · ev 0.8 | — | con 2 | Defence +2 | — |
| stormcaller_amulet | amulet | jewelcrafting 65 | mag 1.4 · acc 1.2 · cc 0.04 | — | dex 1 · int 3 · lck 3 | MagieOff +3 | — |
| heartforged_pendant | amulet | jewelcrafting 82 | def 1.2 · hp 5 · mel 0.8 · rng 0.8 · mag 0.8 · cd 0.12 | — | str 3 · dex 1 · con 2 · int 2 · lck 2 | Defence +3 | — |
| warband_signet | ring1 | jewelcrafting 15 | mel 0.6 · acc 0.8 · cc 0.02 | — | str 2 · lck 1 | Attack +1 | — |
| alpha_fang_amulet | amulet | jewelcrafting 36 | mel 1 · cc 0.04 · ev 0.6 | — | str 3 · lck 3 | Power +1 | — |
| eye_of_the_idol | amulet | — | def 3.2 · hp 13 · acc 2.2 · cc 0.06 · cd 0.3 · mel 1.2 · rng 1.2 · mag 1.2 | — | str 4 · dex 2 · con 5 · int 4 · lck 8 | Defence +5 | — |
| leather_warcape | cape | — | def 0.4 · hp 1.2 | — | con 1 | Defence +1 | — |
| hardened_warcape | cape | — | def 1 · ev 0.6 · hp 3 | — | con 2 | Defence +1 | — |
| leather_cape | cape | — | def 0.3 · ev 0.6 | — | — | Defence +1 | — |
| ranger_cape | cape | — | def 0.8 · ev 1.4 · rng 0.3 | — | dex 1 · con 1 | Defence +1 | — |
| arcane_cape | cape | — | def 0.2 · ev 0.5 · mag 0.3 | — | con 1 · int 1 | MagieOff +1 | — |
| frost_shroud | cape | — | def 0.6 · ev 1.2 · mag 0.7 · mr 0.5 | — | con 1 · int 1 · wis 1 | MagieOff +3 | — |
| slayer_amulet | amulet | slayer 70 | def 1.8 · hp 6.5 · acc 1.8 · cc 0.05 · cd 0.15 · mel 0.9 · rng 0.9 · mag 0.9 | — | str 3 · dex 1 · con 4 · int 3 · lck 5 | Attack +3 | — |
| silk_mantle | cape | ranged 30 | acc 0.8 · mag 0.4 · ev 0.6 | — | int 1 | Attack +1 | — |
| void_shroud | cape | magic_off 65 | mag 1.6 · acc 1.2 · ev 1 · mm 40 | — | dex 1 · con 1 · int 4 · wis 7 | MagieOff +3 | — |
| field_cape | cape | — | def 0.3 · ev 0.4 · hp 0.8 | — | con 1 | Defence +1 | — |
| boartusk_ring | ring1 | — | mel 0.4 · hp 1 | — | str 1 · con 1 | Power +1 | — |
| drovers_charm | amulet | — | hp 1.4 · def 0.3 · reg 0.03 | con 0.5 | con 1 | Defence +1 | reg 0.03 |
| bulls_heart_pendant | amulet | — | hp 4 · def 0.8 · mel 0.5 · reg 0.06 | con 1 | str 2 · con 3 | Defence +1 | reg 0.06 |
| warbanner_cape | cape | — | def 0.6 · ev 0.6 · hp 1.8 | — | con 1 | Defence +1 | — |
| cutpurse_ring | ring1 | — | ev 0.6 · acc 0.6 | — | — | Attack +1 | — |
| felmagician_eye | amulet | — | mag 0.8 · acc 1.2 · mm 15 · mr 0.5 | int 1 | int 3 · wis 4 | Attack +1 | — |
| smokeweave_cape | cape | — | def 0.6 · ev 1 · mag 0.4 | — | con 1 · int 1 | Defence +1 | — |
| cinderloop_ring | ring1 | — | mel 0.4 · cc 0.04 · hp 1.2 | — | str 1 · con 1 · lck 3 | Power +1 | — |
| soulopal_band | ring1 | — | mag 0.4 · mel 0.4 · rng 0.4 · cc 0.03 | — | str 1 · dex 1 · int 1 · lck 2 | Power +1 | — |
| soulthorn_pendant | amulet | — | mel 0.5 · rng 0.5 · mag 0.5 · ev 0.8 · reg 0.05 | lck 0.5 | str 1 · dex 1 · con 1 · int 1 · lck 1 | Power +1 | reg 0.05 |
| warden_greatcloak | cape | — | def 1.2 · ev 1.8 · rng 0.6 · mag 0.6 · reg 0.07 | — | dex 1 · int 2 | Defence +3 | reg 0.07 |
| shroud_of_the_dead | cape | magic_off 30 | def 0.8 · ev 1.2 · mag 0.6 · mm 20 | — | con 1 · int 2 · wis 3 | Defence +1 | — |
| bonecharm_amulet | amulet | — | mel 0.5 · hp 2 · reg 0.03 | — | str 1 · con 1 | Power +1 | reg 0.03 |
| necrosignet_ring | ring1 | — | mag 0.6 · mel 0.6 · cc 0.04 · hp 3 | — | str 2 · con 1 · int 2 · lck 3 | Power +1 | — |
| mariner_cloak | cape | ranged 30 | def 0.8 · ev 1.2 · rng 0.4 | — | dex 1 · con 1 | Defence +1 | — |
| abyssal_signet | ring1 | — | mag 1 · rng 0.8 · cc 0.05 · hp 5 | — | dex 1 · con 2 · int 2 · lck 3 | MagieOff +3 | — |
| pearl_of_the_deep | amulet | — | hp 12 · def 2.4 · mag 1.2 · mm 30 · mr 1 · reg 0.1 | — | con 5 · int 4 · wis 7 | Defence +3 | reg 0.1 |
| pelt_mantle | cape | — | def 0.8 · ev 1.2 · hp 2 | — | con 1 | Defence +1 | — |
| fang_pendant | amulet | — | mel 0.5 · cc 0.04 · hp 1.6 | — | str 1 · con 1 · lck 3 | Power +1 | — |
| alphas_heart_ring | ring1 | — | mel 1 · cc 0.05 · hp 6 · reg 0.08 | — | str 3 · con 3 · lck 3 | Power +3 | reg 0.08 |
| storm_mantle | cape | ranged 50 | def 1 · ev 1.6 · rng 0.6 · mag 0.6 · mr 0.5 | — | dex 1 · con 1 · int 2 · wis 1 | Defence +2 | — |
| stormcore_pendant | amulet | — | mag 1.2 · rng 0.8 · cc 0.05 · hp 6 · mm 25 | — | dex 1 · con 3 · int 2 · wis 4 · lck 3 | MagieOff +3 | — |
| aetherband_ring | ring1 | — | mag 1 · mel 1 · rng 1 · cc 0.04 · hp 5 | — | str 3 · dex 1 · con 2 · int 3 · lck 3 | Power +3 | — |
| void_titan_mantle | cape | — | def 4 · ev 2 · mag 1.6 · rng 1.2 · mel 1.2 · cc 0.05 · mm 30 · reg 0.12 | — | str 4 · dex 1 · con 1 · int 5 · wis 5 · lck 3 | Defence +3 | reg 0.12 |
| slagweave_cape | cape | — | def 1.6 · ev 1 · mel 0.6 · reg 0.08 | — | str 2 | Defence +3 | reg 0.08 |
| emberheart_amulet | amulet | — | mel 1.2 · cc 0.05 · cd 0.18 · hp 6 · reg 0.08 | — | str 3 · con 3 · lck 6 | Power +3 | reg 0.08 |
| doomforged_band | ring1 | — | mel 1.4 · mag 1.4 · cc 0.06 · cd 0.25 · hp 7 · reg 0.1 | — | str 4 · con 3 · int 4 · lck 7 | Power +3 | reg 0.1 |
| idolbound_signet | ring1 | — | mel 0.8 · rng 0.8 · mag 0.8 · acc 1.8 · cc 0.04 · hp 6 | — | str 3 · dex 1 · con 3 · int 2 · lck 3 | Attack +3 | — |
| last_idol_mantle | cape | defence 99 | def 6 · ev 1.6 · mag 1.8 · mel 1.4 · rng 1.4 · cc 0.06 · cd 0.25 · mm 30 · reg 0.2 | — | str 5 · dex 2 · con 1 · int 5 · wis 5 · lck 7 | Defence +5 | reg 0.2 |
| voidstalker_cloak | cape | ranged 65 | def 1.4 · ev 1.8 · rng 0.6 · mag 0.6 | — | dex 1 · int 2 | Defence +3 | — |
| soulflayer_amulet | amulet | — | mag 1.2 · mel 1.2 · cc 0.06 · cd 0.22 · hp 8 · reg 0.1 | — | str 3 · con 4 · int 4 · lck 7 | Power +3 | reg 0.1 |

### 6.5 Uniques, Drop-Rüstungen & Schilde (82 Stücke; Signaturen = Boost-Träger)
| id | slot | req | ALT bonus | ALT modifiers | NEU modifiers | NEU skillBoost | NEU Effekte |
|---|---|---|---|---|---|---|---|
| wooden_shield | offhand | — | def 0.3 · ev 0.3 | — | — | — | — |
| leather_helm | helmet | — | def 0.2 · hp 0.8 | — | con 1 | — | — |
| leather_body | body | — | def 0.4 · hp 1.5 | — | con 1 | — | — |
| idol_shroud | body | defence 99 | def 15 · hp 38 · ev 1.2 · cc 0.03 | — | con 21 · lck 2 | Defence +4 | — |
| willowbark_shield | offhand | defence 12 | def 0.7 · ev 0.5 · hp 1.6 | — | con 1 | — | — |
| grimwood_shield | offhand | defence 22 | def 1.2 · ev 0.8 · hp 2.8 | — | con 2 | — | — |
| ashfen_buckler | offhand | defence 58 | def 3 · ev 2 · hp 6.6 | — | con 5 | — | — |
| voidwood_pavise | offhand | defence 88 | def 5.8 · ev 3.6 · hp 12 | — | con 9 | — | — |
| moss_plate_body | body | defence 48 | def 2.2 · hp 5.8 · ev 0.6 | con 1 | con 5 | — | — |
| spectral_coif | helmet | ranged 50 | def 1 · ev 1.4 · cc 0.04 · rng 0.4 | — | dex 1 · con 1 · lck 3 | — | — |
| warden_brigandine | body | ranged 56,leatherworking 28 | def 2.4 · ev 2 · hp 5.5 · rng 0.6 | — | dex 1 · con 4 | — | — |
| chitin_bulwark | offhand | defence 34 | def 1 · hp 2.2 · ev 0.6 | — | con 2 | — | — |
| slayer_helm | helmet | slayer 80 | def 4.8 · hp 14 · acc 1.2 · mel 1.2 · rng 1.2 · mag 1.2 | — | str 4 · dex 2 · con 7 · int 4 | Defence +3 | — |
| slayer_vambraces | gloves | slayer 50 | def 1.6 · hp 4.5 · acc 1.4 · cc 0.05 · mel 0.7 · rng 0.7 · mag 0.7 | — | str 2 · dex 1 · con 3 · int 2 · lck 3 | Attack +3 | — |
| slayer_greaves | legs | slayer 65 | def 3 · hp 8.5 · mel 0.9 · rng 0.9 · mag 0.9 · ev 1 | — | str 3 · dex 1 · con 4 · int 3 | Defence +3 | — |
| chitin_coif | helmet | defence 14 | def 1.2 · ev 0.4 · hp 1.6 | — | con 1 | — | — |
| frost_pelt_hood | helmet | defence 55 | def 2.8 · ev 0.8 · hp 4 | — | con 3 | — | — |
| wattle_shield | offhand | defence 2 | def 0.5 · hp 1 · ev 0.2 | — | con 1 | — | — |
| cowhide_cap | helmet | leatherworking 1 | def 0.2 · ev 0.4 · hp 0.8 | — | con 1 | — | — |
| cowhide_jerkin | body | defence 4 | def 1 · ev 0.6 · hp 2.6 | — | con 2 | — | — |
| hide_leggings | legs | leatherworking 2 | def 0.5 · ev 0.6 · hp 1.4 | — | con 1 | — | — |
| worn_workgloves | gloves | defence 1 | def 0.2 · hp 0.4 | — | — | — | — |
| muckboots | boots | defence 1 | def 0.2 · ev 0.3 · hp 0.6 | — | con 1 | — | — |
| goblin_buckler | offhand | defence 4 | def 0.6 · hp 1.2 · ev 0.3 | — | con 1 | — | — |
| bonepatch_helm | helmet | defence 3 | def 0.4 · hp 1 · ev 0.2 | — | con 1 | — | — |
| warband_hauberk | body | defence 9 | def 1.4 · hp 3.2 · ev 0.4 | — | con 2 | — | — |
| goblin_warkilt | legs | defence 8 | def 1.1 · hp 2.4 · ev 0.5 | — | con 2 | — | — |
| rivetfist_gloves | gloves | defence 5 | def 0.3 · hp 0.6 · mel 0.1 | — | str 1 · con 1 | — | — |
| scavenger_boots | boots | defence 3 | def 0.3 · ev 0.5 · hp 0.8 | — | con 1 | — | — |
| chitin_helm | helmet | defence 12 | def 0.9 · hp 2 · ev 0.3 | — | con 1 | — | — |
| ashplate_cuirass | body | defence 18 | def 2.4 · hp 5.6 · mel 0.2 | — | str 1 · con 3 | — | — |
| sootscale_greaves | legs | defence 16 | def 1.5 · hp 3.2 · ev 0.4 | — | con 2 | — | — |
| ashen_gauntlets | gloves | defence 10 | def 0.4 · hp 0.7 · mel 0.1 | — | str 1 · con 1 | — | — |
| dustwalker_boots | boots | defence 8 | def 0.4 · ev 0.6 · hp 0.8 | — | con 1 | — | — |
| ash_tyrant_crown | helmet | defence 20 | def 1.6 · hp 5 · mel 0.6 · cc 0.05 · cd 0.15 | str 1 | str 3 · con 3 · lck 5 | — | — |
| bark_bulwark | offhand | defence 24 | def 1.8 · hp 4 · ev 0.5 | — | con 3 | — | — |
| mossweave_leggings | legs | defence 24 | def 1.6 · ev 1.2 · hp 3.8 | — | con 3 | — | — |
| thornmail_gauntlets | gloves | defence 28 | def 0.8 · ev 0.8 · hp 1.8 · mel 0.2 | — | str 1 · con 1 | — | — |
| wildwood_treads | boots | defence 26 | def 0.7 · ev 1.2 · hp 1.6 · rng 0.2 | — | con 1 | — | — |
| cryptguard_helm | helmet | defence 16 | def 1 · hp 2.6 · ev 0.2 | — | con 2 | — | — |
| gravesteel_cuirass | body | defence 30 | def 3.2 · hp 7.8 · mel 0.3 | — | str 1 · con 5 | — | — |
| tombplate_greaves | legs | defence 24 | def 2 · hp 4.4 · ev 0.3 | — | con 3 | — | — |
| boneknuckle_gauntlets | gloves | defence 20 | def 0.6 · hp 1.4 · mel 0.2 | — | str 1 · con 1 | — | — |
| gravetread_sabatons | boots | defence 22 | def 0.6 · hp 1.4 · ev 0.4 | — | con 1 | — | — |
| gravewarden_greatshield | offhand | defence 20 | def 2.4 · hp 5.5 · ev 0.4 · reg 0.04 | — | con 3 | — | — |
| reefscale_helm | helmet | defence 20 | def 1.2 · ev 1 · hp 2.8 | — | con 2 | — | — |
| tidewoven_leggings | legs | defence 50 | def 3 · ev 1.6 · hp 7 · mag 0.4 | — | con 5 · int 1 | — | — |
| barnacle_gauntlets | gloves | defence 24 | def 0.8 · hp 1.6 · ev 0.6 | — | con 1 | — | — |
| tidewalker_boots | boots | defence 50 | def 1.4 · ev 1.8 · hp 3.6 · rng 0.4 | — | dex 1 · con 3 | — | — |
| krakenhide_cuirass | body | defence 60,leatherworking 55 | def 6 · hp 15 · ev 0.8 | — | con 9 | — | — |
| crabshell_bulwark | offhand | defence 8 | def 1.2 · hp 2.4 · ev 0.4 | — | con 2 | — | — |
| wolfpelt_hood | helmet | defence 18 | def 0.8 · ev 1.2 · hp 2.2 · rng 0.2 | — | con 2 | — | — |
| stagleather_chaps | legs | defence 26 | def 1.4 · ev 1.4 · hp 3.6 · rng 0.2 | — | con 3 | — | — |
| clawguard_gloves | gloves | defence 24 | def 0.6 · ev 0.8 · hp 1.6 · mel 0.2 | — | str 1 · con 1 | — | — |
| padfoot_boots | boots | defence 22 | def 0.6 · ev 1.4 · hp 1.6 | — | con 1 | — | — |
| direhide_jerkin | body | defence 34,leatherworking 30 | def 3 · ev 1.4 · hp 7.8 | — | con 5 | — | — |
| bearhide_cuirass | body | defence 44,leatherworking 38 | def 5 · hp 13 · ev 0.8 · reg 0.08 | con 1 | con 9 | — | — |
| stormhide_helm | helmet | defence 50 | def 2.4 · ev 1.4 · hp 6 · rng 0.4 | — | dex 1 · con 4 | — | — |
| skygrip_gauntlets | gloves | defence 55 | def 1.4 · ev 1.2 · hp 3.6 · rng 0.4 · cc 0.03 | — | dex 1 · con 3 · lck 2 | — | — |
| aetherscale_cuirass | body | defence 75 | def 9.5 · hp 24 · ev 1 · mag 0.8 | — | con 14 · int 2 | — | — |
| wyvernscale_greaves | legs | defence 79,leatherworking 70 | def 6 · ev 1.4 · hp 15 · rng 0.6 | — | dex 1 · con 9 | — | — |
| cloudwalker_boots | boots | defence 80 | def 2 · ev 2.4 · hp 6 · rng 0.6 | — | dex 1 · con 4 | — | — |
| wyvernscale_aegis | body | defence 79,leatherworking 70 | def 10 · hp 25 · ev 1.4 · rng 0.8 · cc 0.03 · reg 0.1 | — | dex 1 · con 15 · lck 2 | — | — |
| revenant_greatshield | offhand | defence 58 | def 6 · hp 15 · ev 0.6 | — | con 9 | — | — |
| emberforge_helm | helmet | defence 50 | def 2.8 · hp 8 · mel 0.4 | — | str 1 · con 5 | — | — |
| frostplate_greaves | legs | defence 62 | def 5.5 · hp 13 · ev 0.6 | — | con 8 | — | — |
| moltengrip_gauntlets | gloves | defence 55 | def 1.6 · hp 4 · mel 0.4 · cc 0.03 | — | str 1 · con 2 · lck 2 | — | — |
| frostward_treads | boots | defence 62 | def 2.2 · ev 1.6 · hp 6 | — | con 4 | — | — |
| slagcarapace_plate | body | defence 58 | def 8 · hp 20 · mel 0.6 · reg 0.08 | — | str 2 · con 12 | — | — |
| idol_crown | helmet | defence 99 | def 6 · hp 18 · mag 1 · mel 1 · rng 1 · cc 0.05 | — | str 3 · dex 1 · con 9 · int 3 · lck 3 | Defence +4 | — |
| aetherweave_leggings | legs | defence 99 | def 9 · hp 22 · ev 1.2 · mag 1.2 · cc 0.04 | — | con 12 · int 4 · lck 3 | Defence +4 | — |
| voidtouched_gauntlets | gloves | defence 99 | def 5 · hp 13 · cc 0.05 · cd 0.2 · mel 0.8 · rng 0.8 · mag 0.8 | — | str 3 · dex 1 · con 6 · int 2 · lck 6 | Defence +4 | — |
| idolstep_sabatons | boots | defence 99 | def 5 · ev 1.8 · hp 13 · cc 0.04 | — | con 7 · lck 3 | Defence +4 | — |
| idol_aegis | offhand | defence 99 | def 12 · hp 30 · mag 2 · ev 1.4 · cc 0.04 · mm 30 · mr 1 · reg 0.2 | — | con 17 · int 6 · wis 7 · lck 3 | Defence +4 | reg 0.2 |
| plaguebone_buckler | offhand | defence 8 | def 0.6 · hp 1.4 · ev 0.2 | — | con 1 | — | — |
| marrow_cap | helmet | defence 10 | def 0.5 · hp 1.4 | — | con 1 | — | — |
| basilisk_scale_shield | offhand | defence 24 | def 1.6 · hp 3.6 · ev 0.6 | — | con 2 | — | — |
| shadestalker_hood | helmet | defence 28 | def 1 · ev 1.4 · hp 2.6 · rng 0.2 | — | con 2 | — | — |
| slagheart_cuirass | body | defence 44 | def 4 · hp 10 · mel 0.3 | — | str 1 · con 6 | — | — |
| forgeplate_greaves | legs | defence 50 | def 3 · hp 7 · mel 0.2 | — | str 1 · con 4 | — | — |

### 6.6 Sets (30 — SetDef: bonus → modifiers + skillBoost)
| id | minPieces | ALT bonus | NEU modifiers | NEU skillBoost |
|---|---|---|---|---|
| copper_set | 5 | def 0.4 · hp 1.5 · mel 0.2 · spd -100 | str 1 · con 1 | — |
| iron_set | 5 | def 0.9 · hp 3.4 · mel 0.5 · spd -150 | str 2 · con 2 | — |
| steel_set | 5 | def 1.2 · hp 4 · mel 0.6 · spd -175 | str 2 · con 2 | Power +1 |
| mithril_set | 3 | def 1.8 · hp 6 · mel 0.9 · cc 0.02 · spd -200 | str 2 · con 3 · lck 1 | Power +2 |
| adamantium_set | 3 | def 2.4 · hp 8 · mel 1.2 · cc 0.03 · spd -220 | str 3 · con 4 · lck 2 | Power +2 |
| runite_set | 3 | def 3.2 · hp 11 · mel 1.6 · cc 0.03 · cd 0.1 · spd -240 | str 5 · con 6 · lck 3 | Power +3 |
| bloodiron_set | 3 | def 4.2 · hp 14.5 · mel 2.2 · cc 0.04 · cd 0.15 · spd -260 | str 7 · con 8 · lck 5 | Power +3 |
| titanium_set | 3 | def 5.6 · hp 18.5 · mel 2.8 · cc 0.04 · cd 0.18 · spd -280 | str 8 · con 10 · lck 5 | Power +4 |
| aetherium_set | 3 | def 7 · hp 23 · mel 3.4 · cc 0.05 · cd 0.2 · spd -290 | str 10 · con 13 · lck 6 | Power +4 |
| godiron_set | 3 | def 8.8 · hp 30 · mel 4.2 · cc 0.05 · cd 0.25 · spd -300 | str 13 · con 17 · lck 7 | Power +5 |
| frost_robe_set | 2 | mag 0.6 · acc 0.8 · ev 0.6 | int 1 | MagieOff +1 |
| ember_robe_set | 2 | mag 0.8 · acc 1 · cc 0.02 | dex 1 · int 2 · lck 1 | MagieOff +2 |
| aether_robe_set | 2 | mag 1.1 · acc 1.2 · cc 0.03 | dex 1 · int 3 · lck 2 | MagieOff +2 |
| arcane_robe_set | 2 | mag 1.3 · acc 1.4 · cc 0.03 | dex 1 · int 3 · lck 2 | MagieOff +3 |
| runewoven_robe_set | 2 | mag 1.6 · acc 1.6 · cc 0.04 | dex 1 · int 4 · lck 3 | MagieOff +3 |
| godspark_vestment_set | 2 | mag 1.7 · acc 1.8 · cc 0.04 · cd 0.15 | dex 1 · int 4 · lck 5 | MagieOff +4 |
| voidweave_set | 2 | mag 2.2 · acc 2.2 · cc 0.05 · cd 0.18 | dex 1 · int 5 · lck 6 | MagieOff +5 |
| cured_set | 3 | ev 0.5 · hp 1 | con 1 | — |
| hardened_set | 3 | def 0.5 · ev 0.8 | con 1 | — |
| scaled_set | 3 | ev 1 · rng 0.4 | dex 1 · con 1 | Ranged +1 |
| studded_set | 3 | ev 1.2 · rng 0.6 · cc 0.01 | dex 1 · con 1 · lck 1 | Ranged +2 |
| ironhide_set | 3 | def 0.8 · ev 1.3 · rng 0.7 · cc 0.01 | dex 1 · con 1 · lck 1 | Ranged +2 |
| warhide_set | 3 | def 1.2 · ev 1.4 · rng 0.8 | dex 1 · con 1 | Ranged +3 |
| dragonhide_set | 3 | ev 1.8 · rng 1 · cc 0.02 | dex 1 · con 1 · lck 1 | Ranged +3 |
| shadowhide_set | 3 | ev 2.4 · rng 1.4 · cc 0.03 · cd 0.12 | dex 1 · con 1 · lck 4 | Ranged +4 |
| voidhide_set | 3 | ev 2.6 · rng 2.4 · cc 0.05 · cd 0.2 | dex 2 · con 1 · lck 6 | Ranged +5 |
| apprentice_robe_set | 3 | mag 0.2 | int 1 | — |
| godgem_jewel_set | 2 | cc 0.03 · mel 0.8 · rng 0.8 · mag 0.8 · acc 1 | str 3 · dex 1 · int 2 · lck 2 | Attack +3 |
| slayer_set | 2 | def 2 · hp 6 · acc 1 · mel 0.8 · rng 0.8 · mag 0.8 · cc 0.03 | str 3 · dex 1 · con 3 · int 2 · lck 2 | Attack +2 |
| slayer_set_4pc | 4 | def 2.5 · hp 8 · mel 1 · rng 1 · mag 1 · cc 0.03 · ev 1.2 | str 3 · dex 1 · con 4 · int 3 · lck 2 | Defence +3 |

### 6.7 [C] Waffen-Randkorrektur: Maul-Attribut-Mods ganzzahlig
Waffen bleiben unverändert (Schaden/Tempo/Effekte/acc) — einzige Ausnahme: die Maul-Linie trägt als einzige
Waffenfamilie `modifiers.str` auf dem 0.5-Raster → ganzzahlig runden (§1):

| id | str alt | **str NEU** |
|---|---:|---:|
| copper_maul / bronze_maul | 1 / 1 | **1 / 1** |
| iron_maul / steel_maul | 2 / 2 | **2 / 2** |
| blacksteel_maul / mithril_maul | 2.5 / 3 | **3 / 3** |
| adamantium_maul / runite_maul | 3.5 / 4 | **4 / 4** |
| bloodiron_maul / titanium_maul | 4.5 / 5 | **5 / 5** |
| aetherium_maul / godiron_maul | 5.5 / 6 | **6 / 6** |

Monotonie 1,1,2,2,3,3,4,4,5,5,6,6 ✓ (Doppel-Stufen wie heute, kein Regress).

---

## §7 [C]/[L] Suffixe & Affixe

**Affixe (Runen-Verzauberungen): UNVERÄNDERT** — alle 8 sind `appliesTo` waffen-seitig (geprüft: weapon_melee /
any_weapon / weapon_magic / weapon_ranged); Waffen behalten Flats.

**Waffen-Suffixe: UNVERÄNDERT** (bull, wolf, berserker, carnage, hawk, viper, magus, warlock, fox, eagle,
executioner — inkl. hawk-eva/eagle-acc: Waffenzeilen sind erlaubt).

**Rüstungs-/Schmuck-Suffixe: NEU** — rollen nur noch Attribute (+ Phoenix-Effekt). Rundung: §1.2 (`max(1, round(k·S·var))`).

| id | appliesTo | ALT (statsPerIlvl · attrPerIlvl) | **NEU (attrPerIlvl)** |
|---|---|---|---|
| suffix_bear | weapon_melee, armor, shield | — · str 0.25/con 0.25 | **unverändert** (str 0.25 · con 0.25) |
| suffix_tiger | weapon_ranged, weapon_melee, armor | — · dex 0.25/con 0.25 | **unverändert** |
| suffix_sage | weapon_magic, armor | — · int 0.2/wis 0.2 | **unverändert** |
| suffix_lynx | weapon_ranged, armor | evasion 0.14 · dex 0.225 | **dex 0.3** (eva-Zeile entfällt) |
| suffix_phantom | weapon_ranged, armor | evasion 0.16 · — | **dex 0.25** (softStats cc bleibt) |
| suffix_owl | weapon_magic, armor | maxMana 3.0/manaRegen 0.15 · — | **wis 0.3** |
| suffix_oracle | weapon_magic, armor | manaRegen 0.12 · wis 0.225 | **wis 0.3** |
| suffix_boar | armor, shield | defense 0.12/maxHp 0.2 · — | **con 0.14** |
| suffix_tortoise | armor, shield | defense 0.1 · con 0.25 | **con 0.28** |
| suffix_sentinel | armor, shield | defense 0.09/evasion 0.12 · — | **con 0.08 · dex 0.1** |
| suffix_colossus | armor, shield | maxHp 0.28/defense 0.09 · — | **con 0.16** |
| suffix_phoenix | armor | hpRegenPerSec 0.015/maxHp 0.2 · — | **con 0.09** + hpRegenPerSec 0.015 bleibt (Effekt-Whitelist) |

**NEU: 5 Schmuck-Boost-Suffixe** (Chef: Suffixe auf Schmuck rollen Boosts). Voraussetzung [L]: neues ItemTypeTag
`"jewelry"` in `itemTypeTags` (slot ∈ ring1/ring2/amulet/cape) + `boostPerIlvl`-Skalierung in `instanceBonusDelta`:
`Level = clamp(max(1, round(k·S·variance)), 1, 3)`.

| id | Suffix (en/de) | appliesTo | boostPerIlvl | weight | minIlvl |
|---|---|---|---|---:|---:|
| suffix_duelist | of the Duelist / des Duellanten | jewelry | attack 0.12 | 40 | 15 |
| suffix_brute | of the Brute / des Schlägers | jewelry | power 0.12 | 40 | 15 |
| suffix_sniper | of the Sniper / des Scharfschützen | jewelry | ranged 0.12 | 40 | 15 |
| suffix_archon | of the Archon / des Archonten | jewelry | magic_off 0.12 | 40 | 15 |
| suffix_bulwark | of the Bulwark / des Bollwerks | jewelry | defence 0.12 | 40 | 15 |

Bestehende Attribut-Suffixe (bear/tiger/sage/oracle/owl) dürfen [C]-seitig zusätzlich `"jewelry"` in appliesTo
aufnehmen (Schmuck-Pool füllen). Die alten armor-Suffixe rollen auf Schmuck NICHT mehr `defense`-Flats — durch die
NEU-Spalte oben automatisch erfüllt.

---

## §8 Migration, Tests, Risiken, PFLICHT-GATE

### 8.1 [L] Persistenz & Typen
1. **SAVE_VERSION-Bump + baseAttributes-Migration** (§1.4). `character.hp`-Clamp beim Laden gegen neues maxHp.
2. `SetDef.bonus` → `modifiers`/`skillBoost` ist ein TYP-Bruch: alle Leser anpassen (computeStats-Set-Block:
   `addBonus(set.bonus)` → Attribut-/Boost-Aggregation; Charakterblatt-Set-Anzeige [U]).
3. `ItemDef.skillBoost`, `SuffixDef.boostPerIlvl`, ItemTypeTag `jewelry`: additive Typ-Erweiterungen.
4. KEINE Item-Instanz-Migration (Content-Ersetzung wirkt live; Suffix-Rolls leiten Werte aus Content-k ab).

### 8.2 Risiken (benannt, mit Trim-Hebel)
| Risiko | Erwartung | Trim-Hebel (NUR falls Gate rot) |
|---|---|---|
| HP-Inflation (+15–25 % je Leiter, min-1-Regel früh) | EHP ≈ neutral, da def/eva sinken | conHp-Divisor 2.2→2.6 bzw. maxHp-Koeff con·2→1.8 |
| Leder-Evasion −60–70 % der Flat-Menge | dex·0.3 + Ranged-DPS-Rider kompensieren teilweise | eva-Koeff dex·0.3→0.35–0.4 |
| Stoff-Genauigkeit (Σ~13 acc-Flats entfallen) | MagicOff-Boosts (+5·0.2=1 acc) + dex-Krümel ersetzen wenig | offenseSkill-acc-Koeff 0.2→0.25 (alle Stile) ODER Stoff-dex +1/Teil T6+ |
| Ranged-Tempo-Clamp (dex ~57 → Intervall-Floor 800/1000) | Teil des dex-Werts verpufft am Cap — heute schon nahe Floor | akzeptieren; NICHT den 40-ms-Koeff anfassen |
| Boosts zu schwach „gefühlt" am Endgame | by design (Flavor-Schiene) | TierCaps +1 (§4.4), NICHT Formel-Koeffizienten |
| Metall-Midgame-Mitigation leicht über alt (L40 +3 pp) | gewollt-tolerierbar | conDef-Rate ÷3→÷3.5 |

### 8.3 Test-Impact [K]/[L]
Alle Fixtures/Guards, die `bonus`-Felder von Rüstung/Schmuck, Set-Boni, Attribut-Dezimalwerte oder maxHit/def-
Absolutwerte pinnen → re-baselinen (styles, ranged-vs-magic, set-bonus, content-integrity, wiring-audit,
combat-Fixtures). **NEUE Guards (Pflicht):**
1. **Verbotene-Werte-Guard:** kein Rüstungs-/Schmuck-Item (slot ∈ Rüstung/Schmuck, kein weaponStyle, keine
   weapon-side-Offhand §5.4) trägt `bonus`-Felder außer der Effekt-Whitelist (reg/ls auf Signaturen);
   `modifiers`-Werte ganzzahlig ≥1; `skillBoost` nur auf erlaubten Trägern, Werte 1–5.
2. **Boost-Isolations-Guard:** skillBoost ändert weder `canEquip`-Ergebnis noch `combatLevel` noch XP-Raten
   (Fixture: Ring +5 Power an/aus → identische Requirements/CL/XP, unterschiedlicher maxHit).
3. **Monotonie-Guard je Leiter/Slot:** Σ modifiers nicht-fallend über die Tiers (Anhang A als Referenz).

### 8.4 PFLICHT-GATE nach dem Einpflegen (alles in EINEM Rutsch anwenden, dann messen)
1. `pnpm exec turbo run test --force` (Turbo-Cache-Falle!) — Suite grün nach Re-Baseline.
2. **Geared-Parität 3 Stile** (Metall+Melee / Leder+Bogen / Stoff+Stab, BiS je Stufe) **L20/40/60/90:
   effektive DPS ±10 %**, 0-Tode-normiert. Abweichungen über die §8.2-Hebel trimmen — NICHT an Waffen drehen.
3. **0 geared-Walls:** boar L10, alle 4 Finalbosse, Regen-Mobs in allen 3 Stilen killbar (0-Tode-Kette wie
   Baseline-Sim). Undergeared-Walls sind ok (Chef-Prinzip).
4. **Ehrliche RealisticPlayer-Läufe** (kein Idealbuild): Progression fühlt sich als Leiter an — jede neue
   Rüstung hebt sichtbar Attribute, jeder Schmuck bringt einen lesbaren Boost.
5. EHP-Stichprobe L10/L40/L99 je Stil vs. Baseline (±15 %), Mitigation-Cap am Endgame erreichbar (def ≥ 50).

**Apply-Reihenfolge:** (1) [L] shared-Typen+Konstanten+Migration (§1/§4.1) → (2) [L] computeStats (§2/§4.2) →
(3) [C] Content-Tabellen §6 komplett (Items, Sets, Mauls) → (4) [C/L] Suffixe/Affixe+jewelry-Tag (§7) →
(5) [K/L] Guards+Re-Baseline (§8.3) → (6) [U] UI (§4.5) → (7) GATE (§8.4).

---

## §9 OPTIONAL (separat freizugeben, NICHT Teil von 2.0): def/eva/acc-Lesbarkeits-Reskalierung ×5
Nach 2.0 tragen Items keine def/eva/acc-Flats mehr — aber Monster (eva 0.8, acc 2.3) und Charakterblatt lesen
weiter dezimal-krümelig. Ein späterer ×5-Pass (alle Monster-def/eva/acc ×5, `DEFENSE_MITIGATION_K` 12.5→62.5,
die §2-Terme ×5: def `con·1.5/wis·0.5/defence·0.5`, eva `5+dex·1.5`, acc `25+dex·3+off·1`, Waffen-acc ×5) ist per
Squish-Invarianten (hitChance & Mitigation beidseitig skalen-invariant) beweisbar balance-neutral und ergäbe
durchgehend ganzzahlige Anzeige — bewusst ausgeklammert, um 2.0 nicht an einen 90-Monster-Touch zu koppeln.

---

## Anhang A — Verifikation (maschinell nachgerechnet aus dem Ist-Katalog)
Monotonie je Leiter×Slot (Σ Attributpunkte je Tier) und Familien-Äquivalenz alt→neu. „mel/rng/mag-Äquiv" nutzt
die §5.2-Raten beidseitig; HP = con·2; def-Beitrag = con·0.3; eva-Rest = dex·0.3 (bewusster Rückgang, §3).


```
metal/medhelm: Σattr je Tier = [1,2,2,2,2,3,4,6,6,8,10,13] MONOTON
metal/fullhelm: Σattr je Tier = [1,2,2,3,3,4,6,7,8,10,13,16] MONOTON
metal/platebody: Σattr je Tier = [2,3,4,7,8,9,12,15,19,24,29,35] MONOTON
metal/platelegs: Σattr je Tier = [2,2,3,4,5,7,7,9,13,15,18,22] MONOTON
metal/gauntlets: Σattr je Tier = [0,0,2,2,2,2,2,2,2,3,4,4] MONOTON
metal/sabatons: Σattr je Tier = [0,0,1,1,2,2,2,2,2,3,3,3] MONOTON
metal/kiteshield: Σattr je Tier = [1,1,1,2,2,3,3,4,5,6,7,8] MONOTON
metal/chainbody: Σattr je Tier = [1,1,2,2,3,4,5,6,7,8,10,12] MONOTON
metal/towershield: Σattr je Tier = [1,1,1,2,2,3,4,4,5,6,8,9] MONOTON
hide/cap: Σattr je Tier = [1] MONOTON
hide/body: Σattr je Tier = [2,3,3,5,7,8,10,14,15] MONOTON
hide/legs: Σattr je Tier = [1,2,2,4,5,5,8,10,10] MONOTON
hide/vambraces: Σattr je Tier = [1,1,1,1,3,3,5,6,6] MONOTON
hide/boots: Σattr je Tier = [1,1,1,1,3,3,4,5,6] MONOTON
hide/helm: Σattr je Tier = [1,2,3,4,4,5,8,8] MONOTON
cloth/helmet: Σattr je Tier = [1,2,5,5,7,10,16,20] MONOTON
cloth/body: Σattr je Tier = [2,4,7,11,12,15,23,30] MONOTON
cloth/legs: Σattr je Tier = [1,3,4,6,6,9,13,17] MONOTON
cloth/gloves: Σattr je Tier = [1,2,4,5,7,10,14,19] MONOTON
cloth/boots: Σattr je Tier = [1,2,3,4,6,9,12,17] MONOTON

metal: Familie | mel-Äquiv alt→neu | HP alt→neu(con·2) | def alt→neu(con·0.3) | rng-Äquiv(0.85/dex) | mag(0.34/int) | eva alt→neu(dex·0.3) |
copper | 0.5→0.6 | 8→14 | 3.6→2.1 | 0.0→0.0 | 0.0→0.0 | 0.4→0.0 |
bronze | 1.0→1.2 | 11→16 | 5.2→2.4 | 0.0→0.0 | 0.0→0.0 | 0.4→0.0 |
iron | 1.6→2.1 | 16→22 | 7.9→3.3 | 0.0→0.0 | 0.0→0.0 | 0.8→0.0 |
steel | 1.9→2.4 | 23→34 | 11.0→5.1 | 0.0→0.0 | 0.0→0.0 | 0.8→0.0 |
blacksteel | 1.9→2.7 | 31→40 | 14.7→6.0 | 0.0→0.0 | 0.0→0.0 | 1.0→0.0 |
mithril | 2.5→3.0 | 41→54 | 19.3→8.1 | 0.0→0.0 | 0.0→0.0 | 1.0→0.0 |
adamantium | 3.5→3.9 | 50→64 | 23.8→9.6 | 0.0→0.0 | 0.0→0.0 | 1.0→0.0 |
runite | 4.8→5.4 | 62→74 | 29.3→11.1 | 0.0→0.0 | 0.0→0.0 | 1.2→0.0 |
bloodiron | 6.5→6.6 | 75→90 | 35.5→13.5 | 0.0→0.0 | 0.0→0.0 | 1.4→0.0 |
titanium | 8.2→8.1 | 90→112 | 42.9→16.8 | 0.0→0.0 | 0.0→0.0 | 1.4→0.0 |
aetherium | 10.1→10.2 | 108→136 | 51.3→20.4 | 0.0→0.0 | 0.0→0.0 | 1.6→0.0 |
godiron | 12.5→12.6 | 131→160 | 62.3→24.0 | 0.0→0.0 | 0.0→0.0 | 1.8→0.0 |

hide: Familie | mel-Äquiv alt→neu | HP alt→neu(con·2) | def alt→neu(con·0.3) | rng-Äquiv(0.85/dex) | mag(0.34/int) | eva alt→neu(dex·0.3) |
cured_leather | 0.0→0.0 | 7→12 | 2.2→1.8 | 0.0→0.0 | 0.0→0.0 | 3.2→0.0 |
hardened_leather | 0.0→0.0 | 10→16 | 3.7→2.4 | 0.0→0.0 | 0.0→0.0 | 4.3→0.0 |
scaled_leather | 0.0→0.0 | 12→18 | 4.7→2.7 | 0.0→0.0 | 0.0→0.0 | 5.9→0.0 |
studded_leather | 0.0→0.0 | 17→22 | 7.2→3.3 | 2.5→2.5 | 0.0→0.0 | 7.6→0.9 |
ironhide | 0.0→0.0 | 20→32 | 8.6→4.8 | 4.0→5.1 | 0.0→0.0 | 8.9→1.8 |
warhide | 0.0→0.0 | 23→34 | 10.2→5.1 | 5.4→5.1 | 0.0→0.0 | 10.2→1.8 |
dragonhide | 0.0→0.0 | 32→46 | 14.2→6.9 | 7.7→7.6 | 0.0→0.0 | 13.8→2.7 |
shadowhide | 0.0→0.0 | 42→64 | 19.2→9.6 | 9.2→9.3 | 0.0→0.0 | 18.3→3.3 |
voidhide | 0.0→0.0 | 45→66 | 20.2→9.9 | 10.3→10.2 | 0.0→0.0 | 19.4→3.6 |

cloth: Familie | mel-Äquiv alt→neu | HP alt→neu(con·2) | def alt→neu(con·0.3) | rng-Äquiv(0.85/dex) | mag(0.34/int) | eva alt→neu(dex·0.3) |
apprentice | 0.0→0.0 | 5→10 | 1.1→1.5 | 0.0→0.0 | 0.2→0.3 | 2.3→0.0 |
frost | 0.0→0.0 | 11→14 | 3.5→2.1 | 0.0→0.0 | 2.2→2.0 | 4.5→0.0 |
ember | 0.0→0.0 | 14→22 | 4.9→3.3 | 0.0→0.0 | 3.3→3.4 | 5.7→0.0 |
aether | 0.0→0.0 | 19→26 | 6.6→3.9 | 0.0→0.8 | 4.6→4.4 | 6.9→0.3 |
arcane | 0.0→0.0 | 22→32 | 7.9→4.8 | 0.0→0.8 | 6.1→5.8 | 7.6→0.3 |
runewoven | 0.0→0.0 | 28→40 | 10.2→6.0 | 0.0→3.4 | 8.0→8.2 | 9.2→1.2 |
godspark | 0.0→0.0 | 33→46 | 12.2→6.9 | 0.0→4.3 | 10.7→10.9 | 10.4→1.5 |
voidweave | 0.0→0.0 | 40→58 | 15.0→8.7 | 0.0→4.3 | 15.0→14.6 | 12.8→1.5 |

**BiS-Attributsummen** (getragenes Leiter-Subset + Endgame-Schmuck)
metal godiron (6 Teile) → attr {"str":35,"con":54} boosts {}
hide voidhide (5 Teile) → attr {"dex":12,"con":33} boosts {}
cloth voidweave (5 Teile) → attr {"dex":5,"con":29,"int":43,"wis":15,"lck":11} boosts {}
jewelry endgame (godgem r+a, voidstone r) → attr {"str":7,"dex":4,"int":9,"lck":15,"con":3} boosts {"power":7,"defence":5}
```
