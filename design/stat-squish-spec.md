# Stat-Squish Spec — „Grim Reach" (OSRS-artige Überschaubarkeit)

**Autor:** balance-designer · **Datum:** 2026-07-01 · **Status:** ENTWURF — wartet auf Chef-Freigabe.
**Art:** Reine Zahlen-/Formel-Spec (design/*.md). KEIN Code geändert. content-/logic-/combat-dev pflegen NACH Freigabe 1:1 ein.
**Gelesen aus:** `packages/engine/src/character.ts` (computeStats/Schadensmodell) · `packages/engine/src/combat.ts`
(Trefferberechnung/Mitigation/Mana-Schild/XP) · `packages/shared/src/index.ts` (Kampf-Konstanten) ·
`packages/content/src/index.ts` (alle Ist-Zahlen) · `packages/engine/src/leveling.ts` (XP-Tabelle) ·
`design/balance-pass2-2026-07-01.md`, `design/balance-pass3-2026-07-01.md` (frisch austarierte Parität).

---

## 0) Auftrag & das eiserne Prinzip

Der Chef findet die absoluten Zahlen zu hoch/willkürlich (HP bis ~3600, maxHit bis ~570, Monster-HP bis ~3580) und will
einen **Stat-Squish** wie in OSRS: kleinere, überschaubare Zahlen, in denen **jedes HP und jeder Stärke-Punkt spürbar zählt**.
NICHT max 99 HP — aber deutlich kompakter.

**Ein Squish ist eine reine UMSKALIERUNG, kein Rebalance.** Er darf NICHT anfassen:
- die frisch austarierte **3-Stile-Parität** (Pass 2 + 3),
- die **Progressions-/XP-Kurve** (`target_xph`, Leveltempo),
- die **relativen Verhältnisse** (Time-to-Kill, Trefferchancen, Mitigation, Gear-Tier-Ladder, 0-Walls).

**Der mathematische Hebel, der das garantiert:** Kampf zerfällt in drei entkoppelte Teilsysteme, jedes mit einer
eigenen Skalen-Invariante. Wenn wir jede Invariante respektieren, ist Balance-Erhaltung KONSTRUKTIV bewiesen:

| Teilsystem | Bestimmende Größe | Invariante bei Skalierung mit Faktor `f` |
|---|---|---|
| **HP ↔ Schaden** | Time-to-Kill = HP / Schaden-pro-Treffer | bleibt gleich, wenn **HP UND Schaden ×f** (Zähler & Nenner kürzen sich) |
| **Treffer (acc/eva)** | hitChance = acc / (acc+eva) | **skalen-INVARIANT** — acc & eva ×beliebig (gleich) → hitChance unverändert |
| **Mitigation (def)** | reduction = def / (def+K) | bleibt gleich, wenn **def ×f UND K ×f** |

Alles andere (Krit-CHANCE, Krit-MULTIPLIKATOR, Angriffsintervall/Zeit, Lifesteal-%, Gold, Flat-Kill-XP, Drop-Raten,
Skilling-Dauern, Requirements) ist entweder ein Bruchteil/Multiplikator (skalen-invariant) oder gehört gar nicht in die
Squish-Domäne → **unverändert**. Mana ist ein eigenes Teilsystem mit einer harten Ganzzahl-Untergrenze → **Sonderfall (§3.4)**.

**Kern-Erkenntnis:** Ein EINZIGER globaler Faktor `f` auf alle Kampf-*Beträge* (HP, Schaden, def, acc, eva, DoT, Food,
Monster) genügt — die Stil-Differenzierer (Krit, Tempo, Mana, Lifesteal-%) werden gar nicht angetastet, also bleibt Parität
per Konstruktion erhalten. Es sind nur **drei gekoppelte Formel-Konstanten** nachzuziehen (K, XP-pro-Schaden,
Mana-Schild-Kosten) und **Mana auszunehmen**.

---

## 1) IST-Ranges (heute, mit echten Zahlen)

Damage-Modell (character.ts), maxHit = `round(attackDamage · DMG_MAX_HIT_MULT)`, `DMG_MAX_HIT_MULT = 1.4815`,
`DMG_ROLL_FLOOR = 0.35`. Standard-Stances: Melee „attack" (accMult 1.12, dmgMult 1), Ranged „precise" (speedMult 1.0),
Magie „offensive" (alles 1). Basis-Attribut 5, `ATTRIBUTE_SKILL_DIVISOR = 4`.

### 1a) Spieler — L1 ungeared (exakt nachgerechnet, reproduzierbar)
| Größe | Formel | L1-Wert |
|---|---|---|
| maxHp | `50 + con·10 + (vit−1)·3` | **100** |
| meleeDamage / maxHit | `(1 + str·1.5 + power·0.8)·1` → ×1.4815 | 9.3 → **14** (minHit 5) |
| rangedDamage / maxHit | `dex·1.2 + ranged·1.0` | 7.0 → **10** |
| magicDamage / maxHit | `int·1.7 + magic_off·1.2` | 9.7 → **14** |
| defense | `con·0.6 + wis·0.3 + defence·0.4` | **4.9** |
| accuracy | `round((50 + dex·3 + off·2)·1.12)` | **75** |
| evasion | `10 + dex·1 + defence·0.4` | **15.4** |
| maxMana | `30 + int·5 + wis·2` | **65** |
| critChance / critDamage | `(dex·0.2+lck·0.3)/100` / `1.5+lck·0.02` | 0.025 / 1.60 |
| attackIntervalMs | `clamp(3000 − dex·20, 800, 5000)` (ranged ×0.90) | 2900 (ranged 2610) |

### 1b) Spieler — Endgame, voll gegeart (aus balance-pass3, raw `attackDamage`)
| Stil | attackDamage (raw) | **maxHit (×1.4815)** |
|---|---:|---:|
| Melee 1H (aetherium/godiron-Tier) | 387 | **~573** |
| Ranged (nach Pass-3-Hebeln) | 264 → 322 | **~391 → ~477** |
| Magie (Staff) | 410 | **~607** |

- **maxHp voll gegeart:** ~**3600** (con via 5 Trainings-Skills: mining/defence/vitality/farming/slayer → con ~128
  bei Vollendung; `50 + 128·10 + vit·3 + Gear-maxHp ~1500`).
- **defense** Endgame ~**400–500**, **accuracy/evasion** in die **hunderte**.

### 1c) Gear-Flats (Content-Spannweiten, gelesen)
| Feld | Spanne (min → max) |
|---|---|
| Waffe `bonus.meleeDamage` | 0 → **400** |
| Waffe `bonus.rangedDamage` | 5 → **130** |
| Waffe `bonus.magicDamage` | 9 → **115** |
| `ammoDamage` | 1 → **42** |
| Rüstung `bonus.maxHp` | 2 → **~360** (voidhide; Monster-maxHp ausgenommen) |
| Rüstung `bonus.defense` | 0 → **~168** |
| Rüstung `bonus.evasion` | 1 → **132** |
| Rüstung/Waffe `bonus.accuracy` | 2 → **265** |
| Attribut-Mods `str` / `int` / `dex` | 0→18 / 0→6 / 0→5 (→15 mit Pass-3) |
| `maxMana`-Bonus | 3 → 45 |
| `manaCost` (Waffe) | 4 → 10 |
| Food `healAmount` | 8 → **380** |

### 1d) Monster (L1 → L295, gelesen)
| Feld | L1 (chicken) | Mid (L90 skeleton_nekro) | High (L242 void_titan) | Boss (L295 last_idol) |
|---|---:|---:|---:|---:|
| level | 1 | 90 | 242 | 295 |
| maxHp | 28 | 2806 | **3580** | 2000 |
| damage | 1 | 147 | **312** | 125 |
| defense | 0 | 64 | 168 | 64 |
| evasion | 8 | 36 | 92 | 62 |
| accuracy | 23 | 150 | 192 | 162 |
| xp (Kill-Flat) | 2 | 1200 | 10500 | 58000 |

Untere Kette: chicken 28/1 · rot_rat 28/5 · cow 120/6 · boar 230/13 · goblin 150/13 … glatte Rampe bis void_titan 3580/312.

### 1e) Gekoppelte Formel-Konstanten (shared/index.ts) — HEUTE
`DMG_MAX_HIT_MULT 1.4815` · `DMG_ROLL_FLOOR 0.35` · `DEFENSE_MITIGATION_K 125` · `DEFENSE_MITIGATION_MAX 0.80` ·
`MELEE_LIFESTEAL 0.08` · `MELEE_LIFESTEAL_CAP_PCT 0.05` · `MELEE_LIFESTEAL_CAP_ABS 12` · `HP_REGEN_PER_TICK 0.4` ·
`MELEE_XP_PER_DAMAGE 0.13` · `DEFENCE_XP_PER_DAMAGE 0.11` · `VITALITY_XP_PER_DAMAGE 0.05` · `MANA_PER_CAST 6` ·
`MANA_SHIELD_ABSORB_PCT 0.5` · `MANA_SHIELD_COST_PER_DAMAGE 2` · `MAGIC_WEAK_FACTOR 0.35` · `RANGED_WEAK_FACTOR 0.4`.

---

## 2) ZIEL-Skala (Vorschlag) — Squish-Divisor `S = 9` (f = 1/9)

`S = 9` trifft die vom Chef genannte Ziel-Marke (HP-Endgame ~400) exakt und hält die Kurve (Ist 100→3600 = 36×;
Ziel 11→400 = 36× — identisch). Sensitivitäts-Tabelle für die finale Chef-Wahl in §5.

| Größe | IST (L1 → Endgame) | ZIEL bei S=9 (L1 → Endgame) |
|---|---|---|
| Spieler-maxHp | 100 → ~3600 | **11 → ~400** |
| maxHit Melee | 14 → ~573 | **2 → ~64** |
| maxHit Ranged | 10 → ~391–477 | **1 → ~43–53** |
| maxHit Magie | 14 → ~607 | **2 → ~67** |
| Monster-maxHp | 28 → 3580 | **3 → ~398** (last_idol 2000 → **222**) |
| Monster-damage | 1 → 312 | **1 (Floor) → ~35** |
| Waffe meleeDamage-Flat | 0 → 400 | **0 → ~44** |
| Waffe rangedDamage-Flat | 5 → 130 | **~1 → ~14** |
| Waffe magicDamage-Flat | 9 → 115 | **~1 → ~13** |
| Rüstung maxHp-Flat | 2 → 360 | **~1 → ~40** |
| Spieler-defense | 4.9 → ~450 | **~1 → ~50** (K wird 125 → **14**) |
| Spieler-accuracy | 75 → hunderte | **~8 → ~zehner** |
| Spieler-evasion | 15 → ~200 | **~2 → ~22** |
| Food-Heal | 8 → 380 | **~1 → ~42** |
| **Mana (Pool/Kosten)** | 65 → hunderte / 4–10 | **UNVERÄNDERT** (Sonderfall §3.4) |

**Ehrlicher Trade-off (WICHTIG für die Chef-Erwartung):** Ein ratio-erhaltender Squish kann NICHT gleichzeitig
„HP-Endgame ~400" UND „maxHit endgame ein-/niedrig-zweistellig" liefern — beide skalieren mit demselben `f`, also ist
maxHit-Endgame ≈ 573/9 ≈ **64** (nicht ~15). Die beiden Chef-Beispiele sind geometrisch unvereinbar, SOLANGE die TTK
erhalten bleibt. maxHit ist **früh** ein-/niedrig-zweistellig (L1 = 2, L20 ≈ 5–8) und **mittel-zweistellig am Cap** (~64) —
ein 3-stellig→2-stellig-Gewinn, aber kein einstelliges Endgame. Ein WIRKLICH niedrig-zweistelliges Endgame-maxHit würde
das Verhältnis Früh:Endgame **stauchen** = **Progressions-Rebalance**, NICHT Squish → als separater, eigens
freizugebender Schritt in §6 beschrieben.

**Floor-Effekt (bewusst, OSRS-artig):** Am ganz unteren Ende kollabieren Kleinstwerte auf den `Math.max(1, …)`-Boden
(chicken-damage 1 → 0.11 → Boden 1; heute schon maxHit 1). Das ist authentisches Frühgame („alles trifft 1–3") und
verzerrt die TTK NICHT nennenswert, weil HP UND Schaden gemeinsam am Boden ankommen. Muss aber im Re-Sim (§5-Gate) verifiziert werden.

---

## 3) KONVERSION — mechanisch, pro Zahlen-Typ

**Schema (zweiseitig, damit kein Wert doppelt geteilt wird):**
- **Content-Katalog:** jeder HP-/Schadens-*Betrag* wird mit `f` multipliziert (= ÷9), **gerundet, min 1** wo sinnvoll.
- **Engine-Formeln (character.ts):** jeder **intrinsische** Koeffizient/Konstanten-Term (Attribut·Koeff, Skill·Koeff,
  additive Basis) wird mit `f` multipliziert. Die additiven `eq.*`-Terme behalten Koeffizient **1** — ihre Werte kommen
  bereits vor-gesquisht aus dem Content. → Gesamt-Output = f·(alles). Keine Doppel-Teilung.

### 3.1) character.ts — computeStats (intrinsische Terme ×f)
| Zeile (heute) | NEU (mit f = 1/9) |
|---|---|
| `meleeDamage = (1 + str·1.5 + power·0.8 + eq.meleeDamage)·dmgMult` | `(1·f + str·(1.5f) + power·(0.8f) + eq.meleeDamage)·dmgMult` |
| `rangedDamage = dex·1.2 + ranged·1.0 + eq.rangedDamage` | `dex·(1.2f) + ranged·(1.0f) + eq.rangedDamage` |
| `magicDamage = int·1.7 + magic_off·1.2 + eq.magicDamage` | `int·(1.7f) + magic_off·(1.2f) + eq.magicDamage` |
| `maxHp = 50 + con·10 + (vit−1)·3 + eq.maxHp` | `50f + con·(10f) + (vit−1)·(3f) + eq.maxHp` |
| `defense = (con·0.6 + wis·0.3 + defence·0.4 + magic_def·0.2 + eq.defense)·defMult` | intrinsische Koeffs ×f: `(con·(0.6f) + wis·(0.3f) + defence·(0.4f) + magic_def·(0.2f) + eq.defense)·defMult` |
| `accuracy = round((50 + dex·3 + off·2 + eq.accuracy)·accMult)` | `round((50f + dex·(3f) + off·(2f) + eq.accuracy)·accMult)` |
| `evasion = 10 + dex·1 + defence·0.4 + eq.evasion` | `10f + dex·(1·f) + defence·(0.4f) + eq.evasion` |

*Konkret bei f=1/9:* meleeDamage-Koeffs 1→0.111, 1.5→0.1667, 0.8→0.0889; maxHp 50→5.56, 10→1.111, 3→0.333; usw.
(Chef kann sich für „glatte" Koeffizienten entscheiden — dann `f` so wählen, dass z.B. `con·10 → con·1` exakt, siehe §5.)

**UNVERÄNDERT in computeStats** (skalen-invariant / andere Domäne): `critChance` (Wahrscheinlichkeit 0..1),
`critDamage` (Multiplikator), `attackIntervalMs` (Zeit — der `dex·20`-Term bleibt!), `maxMana`, `manaRegen`,
`lifestealPct`, `hpRegenPerSec` (Quelle ist bereits vor-gesquishtes `eq.hpRegenPerSec`).

### 3.2) shared/index.ts — gekoppelte Konstanten
| Konstante | heute | NEU | Begründung |
|---|---:|---|---|
| `DEFENSE_MITIGATION_K` | 125 | **125·f ≈ 14** | Mitigation = def/(def+K); def ist ×f → K MUSS ×f, sonst kippt die Reduktions-Kurve. **PFLICHT.** |
| `MELEE_LIFESTEAL_CAP_ABS` | 12 | **12·f ≈ 1.33** | absoluter HP-Deckel → ×f (relativer Bindungspunkt bleibt: 12/3600 = 1.33/400). |
| `HP_REGEN_PER_TICK` | 0.4 | **0.4·f ≈ 0.044** | HP/Tick = HP-Betrag → ×f. |
| `MELEE_XP_PER_DAMAGE` | 0.13 | **0.13/f = 1.17** | Kampf-XP = Schaden·Faktor; Schaden ×f → Faktor ×1/f, damit XP/Treffer (= Leveltempo) EXAKT gleich. **PFLICHT.** |
| `DEFENCE_XP_PER_DAMAGE` | 0.11 | **0.11/f = 0.99** | dito (falls noch pro-Schaden genutzt). |
| `VITALITY_XP_PER_DAMAGE` | 0.05 | **0.05/f = 0.45** | dito. |
| `MANA_SHIELD_COST_PER_DAMAGE` | 2 | **2/f = 18** | Mana bleibt unskaliert, Schaden ×f → Kosten-pro-absorbiertem(gesquishtem)-Schaden ×1/f, damit die Schild-Ökonomie (Mana:Schaden) identisch bleibt. **PFLICHT (Mana-Sonderfall).** |

**UNVERÄNDERT:** `DMG_MAX_HIT_MULT`, `DMG_ROLL_FLOOR` (reine Multiplikatoren auf Schaden — skalen-invariant),
`DEFENSE_MITIGATION_MAX 0.80` (Deckel-Bruchteil), `MELEE_LIFESTEAL 0.08`, `MELEE_LIFESTEAL_CAP_PCT 0.05`,
`MAGIC_WEAK_FACTOR 0.35`, `RANGED_WEAK_FACTOR 0.4`, `MANA_PER_CAST 6`, `MANA_SHIELD_ABSORB_PCT 0.5`, sämtliche
XP-Kurven/`earlyXpMult`/`combatXpLevelMult`/`overLevelMult` (Level-Domäne), `FROST_SLOW`.

### 3.3) content/index.ts — Katalog (jeder HP-/Schadens-Betrag ×f, round, min 1)
**Squishen (×f):**
- Monster: `maxHp`, `damage`, `defense`, `evasion`, `accuracy`, `regen`, sowie `inflict.magnitude` (DoT-DPS).
  *(Monster-`accuracy`/`evasion` ×f + Spieler-acc/eva ×f → hitChance beidseitig invariant; Monster-`defense` ×f + K ×f → Mitigation invariant.)*
- Waffen: `bonus.meleeDamage`/`rangedDamage`/`magicDamage`, `ammoDamage`, `weaponEffect(.s).magnitude` (burn/bleed/poison-DPS).
- Rüstung/Sets/Buffs/Suffix/Affix: `bonus.maxHp`, `bonus.defense`, `bonus.evasion`, `bonus.accuracy` (auch Set- & Potion-Boni & Affix-/Suffix-Tier-Magnituden, die `instanceBonusDelta` speist).
- Consumables: `healAmount`; alle Heil-/Schild-Beträge.

**NICHT squishen (Domäne außerhalb):** `bonus.critChance`/`critDamage` (Bruch/Mult), `bonus.attackIntervalMs` (Zeit),
`bonus.lifesteal` (Bruch), `bonus.maxMana`/`manaRegen`/`manaCost` (Mana §3.4), `bonus.hpRegenPerSec` → doch ×f (HP-Betrag!),
Attribut-`modifiers` (str/int/dex — bleiben, außer optionaler §6.2), `value`/`sellPrice`/`gold` (Ökonomie), `xp`
(Kill-/Dungeon-Flat-XP → Leveltabelle unverändert), `loot.chance/min/max`, `requirements`, Skilling-`durationMs`/`xp`.

> **hpRegenPerSec-Notiz:** ist ein HP-Betrag → im Content ×f. In computeStats bleibt der Term (Quelle = `eq.hpRegenPerSec`, bereits vor-gesquisht).

### 3.4) Mana — Sonderfall (Faktor 1, bewusst NICHT gesquisht)
`manaCost` ist heute 4–10; ÷9 ergäbe **Sub-Ganzzahl** (0.4–1.1) → Cast-Logik bricht. Darum bleibt das **ganze
Mana-Teilsystem auf heutiger Skala**: `maxMana`-Koeffs (int·5, wis·2, +30), `manaRegen`, `MANA_PER_CAST`, `manaCost`
je Waffe, `maxMana`-Gear-Boni — alle **unverändert**. Cast-Anzahl pro Kampf hängt an Kampf-DAUER (Ticks), nicht an der
Schadensskala → automatisch erhalten. Einzige Kopplung: der **Mana-Schild** rechnet Mana gegen (gesquishten) Schaden →
`MANA_SHIELD_COST_PER_DAMAGE 2 → 18` (§3.2) hält die Schild-Ökonomie exakt. Damit bleibt Magie-Survivability paritätisch.
*(Mana war auch nicht der Eyesore des Chefs — HP 3600 & maxHit 570 sind es. Mana-Pool ~zweistellig bis dreistellig ist tolerierbar.)*

---

## 4) AUSWIRKUNGEN / RISIKEN — was alles mitziehen muss

1. **Gesamter Content-Katalog** (`packages/content/src/index.ts`, ~14.5k Zeilen): JEDES Monster (per-Feld, ~90 Monster
   L1–L295), JEDE Waffe/Rüstung/Ammo/Set/Buff/Food/Suffix-Affix-Magnitude gemäß §3.3. Das ist der Löwenanteil. Content-dev-Revier.
2. **`character.ts` computeStats** — die 7 Formel-Zeilen (§3.1). logic-dev-Revier.
3. **`shared/index.ts`** — 6 Konstanten (§3.2, davon 3 PFLICHT). logic-/combat-dev.
4. **`combat.ts`** — liest die Konstanten; keine strukturelle Änderung, aber Mitigation/Mana-Schild/Lifesteal/XP-Pfade
   müssen die neuen Werte fahren. combat-dev-QA.
5. **Suffix/Affix-System** (`suffix.ts`/`instanceBonusDelta`): die Tier-Magnituden, die in maxHp/defense/damage münden,
   MÜSSEN ×f. Prüfen, ob Magnituden im Content-Def liegen (dann §3.3 deckt sie) oder in gespeicherten Instanzen (dann Migration, s. 7).
6. **Food-/Auto-Eat-Werte:** `healAmount` ×f. `AUTO_EAT_TIERS` sind Schwellen/Bruchteile → unverändert. Auto-Eat heilt
   dann kleinere absolute Beträge auf kleinere maxHp — relativ identisch.
7. **Persistenz / SAVE_VERSION-Migration (logic-dev):** Abgeleitete Stats werden NICHT gespeichert (gut). ABER
   `character.hp` (aktueller HP-Wert) IST gespeichert → nach Squish wäre ein Alt-Save-`hp` von 3600 gegen neues maxHp 400
   → beim Laden auf maxHp clampen ODER in der Migration ×f. `character.mana` bleibt (Mana ungesquisht). Falls Item-Instanzen
   absolute Bonus-Magnituden persistieren → migrieren. **SAVE_VERSION erhöhen + Migration schreiben (Memory: „Save-Logik immer mitziehen").**
8. **UI/Tooltips/Anzeige (ui-dev):** Kein hartkodierter Zahlen-Text, aber Achsen/Balken/„Damage 5–7"-Anzeigen zeigen
   automatisch die neuen kleineren Werte — Sichtprüfung auf Layout (kürzere Zahlen = gut).
9. **Guard-/Fixture-Tests:** ALLE Tests, die absolute Zahlen pinnen (styles / ranged-vs-magic / set-bonus /
   content-integrity / combat-Fixtures / maxHit-Snapshots), müssen auf die neuen Skalen **neu gebaselined** werden.
   Die *ratio-basierten* Guards (Parität-Spread, Monotonie) sollten unverändert grün bleiben — genau das ist der Beweis,
   dass der Squish sauber war.
10. **PFLICHT-GATE nach dem Anwenden:** eine **volle Neu-Sim + 3-Stile-Parität-Re-Messung** (§5). Ein Squish ist erst
    „fertig", wenn die Sim zeigt: gleiche kills/deaths-Verhältnisse, gleiche XP/h, Spread der 3 Stile ≤ vor dem Squish.

**Risiken:** (a) **Rundungs-/Floor-Drift** am unteren Ende (Kleinstwerte → 1) — verzerrt Einzel-Kämpfe minimal,
im Re-Sim prüfen. (b) **Doppel-Teilung** falls ein Wert sowohl im Content als auch in der Formel gesquisht wird — das
zweiseitige Schema (§3) verhindert es, aber je Wert genau EINE Seite anwenden. (c) **Vergessene Magnitude-Konstante**
(Pet-Ability-Beträge, Dungeon-Reward-Heals, seltene Inflict-Werte) → §3.3-Audit muss vollständig sein; ein „definiert aber
nicht mitskaliert"-Feld bricht lokal die Balance. (d) **Mana-Kopplung** übersehen (`MANA_SHIELD_COST_PER_DAMAGE`) → Magie
würde über-/untertanky. (e) **XP-pro-Schaden** übersehen → Kampf-Leveltempo bräche (langsameres Leveln bei kleinerem Schaden).

---

## 5) EMPFEHLUNG

**1) Ein einheitlicher linearer Faktor genügt — mit genau EINER Ausnahme (Mana) und DREI gekoppelten Konstanten.**
Es sind KEINE unterschiedlichen Faktoren pro Kategorie nötig: HP, Schaden, def, acc, eva, DoT, Food, Monster teilen
denselben `f`. acc/eva sind ohnehin skalen-invariant (dürfen `f` mitnehmen, müssen aber nicht — für optische Konsistenz:
ja). Der einzige Bruch ist **Mana = Faktor 1** (Ganzzahl-Untergrenze). Die drei Kopplungen (`K`, `XP_PER_DAMAGE`,
`MANA_SHIELD_COST_PER_DAMAGE`) sind mechanisch bestimmt, nicht frei justierbar. → **„Ein Faktor, eine Ausnahme, drei Kopplungen."**

**2) Empfohlener Faktor: `S = 9` (f = 1/9).** Trifft die Chef-Marke (HP 11→~400) und hält die 36×-Kurve exakt.
Sensitivität für die finale Chef-Entscheidung:

| S (÷) | HP L1 → Endgame | maxHit Melee L1 → Endgame | Monster-HP L1 → High | Charakter |
|---:|---|---|---|---|
| 6 | 17 → 600 | 2 → 95 | 5 → 597 | milder, mehr Granularität unten, Endgame noch 3-stellig(HP) |
| **9** | **11 → 400** | **2 → 64** | **3 → 398** | **Chef-Marke, empfohlen** |
| 12 | 8 → 300 | 1 → 48 | 2 → 298 | kompakter, Floor-Effekt unten stärker |

**Glatte-Koeffizienten-Option:** Will der Chef runde Engine-Zahlen, `S` so wählen, dass Schlüssel-Koeffizienten aufgehen —
z.B. `con·10 → con·1` bei S=10 (HP 10→360). S=9 vs 10 ist balance-neutral; reine Ästhetik-/Rundungswahl.

**3) „Jeder Punkt zählt" — ehrliche Einordnung + optionaler Zusatz (§6.2).** Der reine Output-Squish macht die Zahlen
klein, aber bei S=9 bleibt Endgame-str ~90 während maxHit ~64 → +1 str ≈ +0.25 maxHit (rundet weg). Um jeden Punkt WIRKLICH
spürbar zu machen, empfehle ich als **separat freizugebenden** Zusatz einen **output-neutralen Attribut-Input-Squish**
(§6.2): Attribut-Beträge halbieren, alle Koeffizienten DIESES Attributs verdoppeln → Attribute lesen ~1–45 statt ~5–128,
Outputs bit-identisch. Nicht Teil des Kern-Squish (berührt dex→Tempo/Krit-Koeffs), aber die sauberste Antwort auf
„jeder Stärke-Punkt zählt".

**4) Reihenfolge & Gate.** Anwenden in EINEM Rutsch (Content + Engine + Konstanten zusammen — Zwischenzustände sind
unbalanciert). Danach **PFLICHT-GATE:** volle Sim (`pnpm test`, Cache leeren — Memory „Turbo-Test-Cache-Falle") +
3-Stile-Parität-Re-Messung (L20/40/60/90, 0-Tode-normiert): Ziel **identische** kills/deaths, XP/h und Stil-Spread wie VOR
dem Squish (±Rundung). Weicht etwas ab → es wurde ein Feld/Konstante übersehen (nicht „nachbalancen" — den Squish-Fehler finden).

**Fazit:** Ein sauberer, ratio-erhaltender ÷9-Squish ist mechanisch vollständig durch diese Spec bestimmt. Er verkleinert
HP (3600→400), maxHit (573→64) und Monster (3580→398) auf überschaubare OSRS-artige Größen, OHNE Parität, XP-Kurve oder
Progressions-Ladder anzutasten — sofern die drei Pflicht-Kopplungen mitgezogen und Mana ausgenommen wird.

---

## 6) OPTIONAL (separat freizugeben — NICHT Teil des Kern-Squish)

### 6.1) Kurven-Stauchung für „niedrig-zweistelliges Endgame-maxHit"
Nur falls der Chef maxHit-Endgame ~15 statt ~64 will: das ist ein **Rebalance** (staucht Früh:Endgame von 36× auf ~8×),
kein Squish. Verändert TTK/Gefühl über die Level → braucht eine **eigene Parität-Neubalance**, nicht diese Spec. Bewusst ausgeklammert.

### 6.2) Output-neutraler Attribut-Input-Squish („jeder Punkt zählt")
Je Attribut `X` mit Skalenfaktor `a`: alle Quellen von `X` (Basis 5, Gear-`modifiers.X`, Skill-Beitrag via
`ATTRIBUTE_SKILL_DIVISOR`) mit `a`, und ALLE Koeffizienten von `X` in computeStats mit `1/a`. Output bit-identisch, weil
innerhalb eines Attributs alle Koeffizienten gemeinsam skalieren. Achtung `dex`: speist 5 Terme (rangedDamage 1.2,
critChance 0.2/100, attackIntervalMs 20, evasion 1, accuracy 3) — ALLE fünf ×1/a, sonst driften Tempo/Krit. `con` speist
HP (10) + defense (0.6). Sauber, aber invasiver → daher optional und getrennt zu testen.
