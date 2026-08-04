# Suffix-POOL-Spec — Inhalt der Random-Roll-Suffixe (WoW-Stil)

**Autor:** Balance-Designer · **Datum:** 2026-06-27 · **Status:** Reine Design-Spec (kein Code, kein Content). 1:1-Vorlage für content-dev.
**Scope-Abgrenzung:** Diese Spec definiert NUR den **Suffix-POOL-Inhalt** (die einzelnen Suffixe: Name, Stats, Item-Typ-Logik, Level-Scaling, Gewichtung). Das **Datenmodell / die Roll-Mechanik / Instanz-Speicherung** liegt in `design/item-instance-affix-suffix-spec.md` (Logic-Dev) — wird hier nur referenziert, nicht dupliziert.

> Alle Zahlen sind **Platzhalter/Vorschlag** (Balance-Domäne). Sie sind an der gelockten Gear-Kurve aus `smithing-stats-spec.md` (D-Index 5→132, B-Index 8→136) kalibriert, damit Suffixe ein **sekundärer** Boost bleiben (~10–20 % eines gleichstufigen Items), nie ein zweites Hauptstat.

---

## 0. Korrekturen / Anker an den echten Code

Gegen `packages/shared/src/index.ts` geprüft, damit content-dev nur existierende Felder bekommt:

- **Echte Attribute (`modifiers`):** genau **`str, dex, con, int, wis, lck`** (`ATTRIBUTES`, shared 312–355). **Es gibt KEIN `vitality`.** Der „Ausdauer"-Slot ist **`con`** (Constitution = Max HP & Verteidigung). → Wo der Instanz-Spec-Entwurf (4.3) `vitality` schreibt, ist **`con`** gemeint. Hier durchgehend `con`.
- **Echte `EquipBonus`-Felder** (shared 463–501): `meleeDamage, rangedDamage, magicDamage, defense, accuracy, evasion, maxHp, maxMana, manaRegen, hpRegenPerSec, critChance, critDamage, attackIntervalMs` (+ die zwei Skilling-Mults, die für Kampf-Suffixe irrelevant sind). Suffixe nutzen ausschließlich diese Felder + die 6 `modifiers`.
- **`attackIntervalMs`**: negativ = schneller. Speed-Suffixe rollen also **negative** Werte.
- **Item-Typ-Tags** (aus dem Instanz-Spec übernommen, NICHT neu erfunden): `weapon_melee | weapon_ranged | weapon_magic | armor | shield | any_weapon | any`. Ableitung rein aus `weaponStyle`/`slot`/`type` via `itemTypeTags(item)`.

---

## 1. Item-Typ-Logik (das Kern-Versprechen des Chefs)

Ein Suffix rollt nur, wenn **`suffix.appliesTo ∩ itemTypeTags(item) ≠ ∅`**. So zieht ein Schwert **nie** einen Magier-Suffix. Mapping der Tags auf erlaubte Stats:

| Item-Typ-Tag | Trägt sinnvoll | Verboten |
|---|---|---|
| `weapon_melee` | meleeDamage, str, con, critChance/Damage, accuracy, attackIntervalMs(−) | magicDamage, rangedDamage, maxMana, manaRegen |
| `weapon_ranged` | rangedDamage, dex, accuracy, evasion, critChance, attackIntervalMs(−) | meleeDamage, magicDamage, maxMana |
| `weapon_magic` | magicDamage, int, wis, maxMana, manaRegen, critChance | meleeDamage, rangedDamage |
| `armor` (helmet/body/legs/gloves/boots) | defense, maxHp, evasion, con, +eine Stil-Affinität je Suffix | direkte Waffen-Damage-Stats |
| `shield` (offhand-Schild) | defense, maxHp, con, evasion | jegliche Damage-Stats |
| `any_weapon` | nur stil-neutrale Kampfstats: accuracy, critChance, critDamage, attackIntervalMs(−) | reine Stil-Damage-/Mana-Stats |
| `any` | nur universelle Stats: lck, hpRegenPerSec, con, maxHp | stil-spezifische Stats |

**Regel:** Ein Suffix listet seine `appliesTo`-Tags; die Engine filtert. Damage-tragende Suffixe sind **stil-rein** (ein `weapon_melee`-Suffix gibt nie magicDamage). Stat-neutrale Suffixe (`any_weapon`/`any`) dürfen breiter rollen, geben aber nur stil-neutrale Werte.

---

## 2. Der Suffix-Pool (22 Suffixe)

Spalten: **k** = Basis-Koeffizient pro Stat (Wert bei Scale-Index S=1, s. §3). **minIlvl** = ab welchem Item-Level der Suffix überhaupt im Pool ist (Gating starker Suffixe). **w** = Pool-Gewicht (§4).

Notation Stats: `feld(k)` bzw. `mod.attr(k)`. Negative k bei `attackIntervalMs` = Speed.

### 2.1 Melee-affine Suffixe (5)

| id | Phrase {en / de} | Stats (k) | appliesTo | minIlvl | w |
|---|---|---|---|---:|---:|
| `suffix_bear` | of the Bear / des Bären | `mod.str(0.5)` + `mod.con(0.5)` | weapon_melee, armor, shield | 1 | 100 |
| `suffix_bull` | of the Bull / des Stiers | `meleeDamage(0.7)` + `mod.str(0.45)` | weapon_melee | 1 | 100 |
| `suffix_wolf` | of the Wolf / des Wolfes | `meleeDamage(0.55)` + `attackIntervalMs(−7.5)` | weapon_melee | 10 | 60 |
| `suffix_berserker` | of the Berserker / des Berserkers | `meleeDamage(0.55)` + `critDamage`(soft) | weapon_melee | 30 | 25 |
| `suffix_carnage` | of Carnage / des Gemetzels | `meleeDamage(0.8)` + `critChance`(soft) | weapon_melee | 50 | 10 |

### 2.2 Ranged-/DEX-affine Suffixe (5)

| id | Phrase {en / de} | Stats (k) | appliesTo | minIlvl | w |
|---|---|---|---|---:|---:|
| `suffix_tiger` | of the Tiger / des Tigers | `mod.dex(0.5)` + `mod.con(0.5)` | weapon_ranged, weapon_melee, armor | 1 | 100 |
| `suffix_hawk` | of the Hawk / des Falken | `rangedDamage(0.7)` + `evasion(1.2)` | weapon_ranged | 1 | 100 |
| `suffix_viper` | of the Viper / der Viper | `rangedDamage(0.55)` + `attackIntervalMs(−7.5)` | weapon_ranged | 10 | 60 |
| `suffix_lynx` | of the Lynx / des Luchses | `mod.dex(0.45)` + `evasion(1.4)` | weapon_ranged, armor | 10 | 60 |
| `suffix_phantom` | of the Phantom / des Phantoms | `evasion(1.6)` + `critChance`(soft) | weapon_ranged, armor | 50 | 10 |

### 2.3 Magic-/INT-affine Suffixe (5)

| id | Phrase {en / de} | Stats (k) | appliesTo | minIlvl | w |
|---|---|---|---|---:|---:|
| `suffix_magus` | of the Magus / des Magus | `magicDamage(0.7)` + `mod.int(0.45)` | weapon_magic | 1 | 100 |
| `suffix_owl` | of the Owl / der Eule | `maxMana(3.0)` + `manaRegen(0.15)` | weapon_magic, armor | 1 | 100 |
| `suffix_sage` | of the Sage / des Weisen | `mod.int(0.4)` + `mod.wis(0.4)` | weapon_magic, armor | 10 | 60 |
| `suffix_oracle` | of the Oracle / des Orakels | `mod.wis(0.45)` + `manaRegen(0.12)` | weapon_magic, armor | 10 | 60 |
| `suffix_warlock` | of the Warlock / des Hexers | `magicDamage(0.8)` + `critChance`(soft) | weapon_magic | 50 | 10 |

### 2.4 Defense-/Tank-Suffixe (4) — Rüstung & Schild

| id | Phrase {en / de} | Stats (k) | appliesTo | minIlvl | w |
|---|---|---|---|---:|---:|
| `suffix_boar` | of the Boar / des Ebers | `defense(1.2)` + `maxHp(2.0)` | armor, shield | 1 | 100 |
| `suffix_tortoise` | of the Tortoise / der Schildkröte | `defense(1.0)` + `mod.con(0.5)` | armor, shield | 1 | 100 |
| `suffix_sentinel` | of the Sentinel / des Wächters | `defense(0.9)` + `evasion(1.2)` | armor, shield | 30 | 25 |
| `suffix_colossus` | of the Colossus / des Kolosses | `maxHp(2.8)` + `defense(0.9)` | armor, shield | 50 | 10 |

### 2.5 Universelle / Utility-Suffixe (3)

| id | Phrase {en / de} | Stats (k) | appliesTo | minIlvl | w |
|---|---|---|---|---:|---:|
| `suffix_fox` | of the Fox / des Fuchses | `mod.lck(0.4)` + `critDamage`(soft) | any_weapon | 1 | 60 |
| `suffix_phoenix` | of the Phoenix / des Phönix | `hpRegenPerSec(0.15)` + `maxHp(2.0)` | armor | 30 | 25 |
| `suffix_executioner` | of the Executioner / des Henkers | `critChance`(soft) + `critDamage`(soft) | any_weapon | 70 | 6 |

**Verteilung der Anwendbarkeit (Lücken-Check):**
- weapon_melee-Pool (ilvl-abhängig): bear, bull, tiger, wolf, eagle*, fox, berserker, carnage, executioner.
- weapon_ranged-Pool: tiger, hawk, viper, lynx, eagle*, fox, phantom, executioner.
- weapon_magic-Pool: magus, owl, sage, oracle, fox, warlock, executioner.
- armor-Pool: bear, tiger, lynx, owl, sage, oracle, boar, tortoise, sentinel, colossus, phoenix.
- shield-Pool: bear, boar, tortoise, sentinel, colossus.

\* `suffix_eagle` (accuracy + critChance, `any_weapon`, w 60, minIlvl 1) ist **zusätzlich** als 23. neutraler Allround-Waffen-Suffix sinnvoll, falls content-dev den Pool je Stil etwas voller will. Optional — ich zähle die **22 oben** als Kernset; eagle als Reserve. Stats: `accuracy(2.0)` + `critChance`(soft).

> Jeder Waffen-Stil hat **mind. 6** mögliche Suffixe (inkl. neutraler), jede Rüstung **mind. 11**, jeder Schild **5** → genug Varianz, dass dasselbe Rezept sich spürbar unterschiedlich anfühlt, ohne dass je ein stil-fremder Wert auftaucht.

---

## 3. Level-Scaling-Schema

`ilvl` = Craft-Skill-Level der Aktion (bzw. Monster-Level beim Drop). Grundgedanke: **L1-Craft → schwacher Suffix, L100-Craft → starker Suffix**, monoton, keine Cliffs — gestaffelt analog zu den 12 Smithing-Tiers (so liegt die Suffix-Stufe automatisch auf der gleichen Leiter wie das Basis-Item).

### 3.1 Scale-Index `S(ilvl)`

Ein einziger, glatter Index (≈×1,3/Band, ~20× am Cap) treibt alle „linearen" Stats:

| ilvl | 1 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **S** | 1.0 | 1.4 | 2.0 | 3.0 | 4.2 | 5.6 | 7.2 | 9.0 | 11.0 | 13.5 | 16.5 | 20.0 |

Zwischenwerte: linear zwischen den Bändern interpolieren (`S(ilvl)` als stückweise lineare Funktion). content-dev/Engine kann auch direkt `S(ilvl) ≈ 0.8 + 0.19·ilvl·(ilvl/100)^0.25` als geschlossene Näherung nutzen — die Tabelle ist maßgeblich.

### 3.2 Wertformel (lineare Stats)

```
rawValue   = k_stat · S(ilvl)
rolledValue = rawValue · (0.85 + 0.15 · roll)        // roll ∈ [0,1] aus Roll 3
finalValue  = round(rolledValue), min 1               // ganzzahlige Stats
```

- Die **±15 %-Roll-Varianz** (`0.85…1.00`) liefert das WoW-Gefühl „dasselbe Suffix, mal stärker, mal schwächer". `roll` selbst kommt aus der seeded Roll-Mechanik (anderer Spec).
- `manaRegen`, `hpRegenPerSec`: **nicht** runden/min-1 — 1 Nachkommastelle behalten (fraktionale Regen-Werte sind gewollt).

### 3.3 „Soft"-Stats (crit & speed) — eigene, gedeckelte Skala

`critChance`, `critDamage`, `attackIntervalMs` dürfen **nicht** mit 20× skalieren (sonst 100 % Crit / Negativ-Intervalle). Sie haben feste Endpunkte ilvl1→ilvl100 und skalieren über `Ssoft(ilvl) = S(ilvl)/20` (also 0,05→1,0):

```
finalSoft = endLow + (endHigh − endLow) · Ssoft(ilvl)
finalSoft = finalSoft · (0.85 + 0.15 · roll)
```

| Soft-Stat | ilvl1 (endLow) | ilvl100 (endHigh) | Rundung |
|---|--:|--:|---|
| `critChance` | 0.010 | 0.050 | 3 Nachkommastellen |
| `critDamage` | 0.05 | 0.25 | 2 Nachkommastellen |
| `attackIntervalMs` (Speed) | −15 | −150 | auf 5 ms gerundet |

> So bleibt ein Crit-Suffix selbst am Cap ein **+5 %**-Boost (vergleichbar mit einem Waffen-Eigen-Crit), nie spielbrechend; ein Speed-Suffix max. −150 ms (eine zweite, schwächere „Dolch-Beschleunigung").

### 3.4 Konkrete Beispiel-Werte (Kontroll-Sicht)

`des Tigers` (`dex` k0.5 + `con` k0.5), volle Roll (roll=1):

| ilvl | dex | con |
|---|--:|--:|
| 1 | 1 | 1 |
| 20 | 2 | 2 |
| 50 | 4 | 4 |
| 80 | 7 | 7 |
| 100 | 10 | 10 |

`des Bären`-Schwert (meleeDamage über `suffix_bull` k0.7): ilvl1 = 1 · ilvl60 = 6 · ilvl100 = 14 → bei einem Godiron-Sword (mDmg 132) ein **~+11 %**-Sekundärboost. `des Ebers` def k1.2: ilvl100 = 24 auf einem Platebody (def 136) = **~+18 %**. → durchweg sekundär, nie Hauptstat. ✓ Parität gewahrt (kein Stil bekommt überproportionalen Suffix-Vorteil; Damage-k ist über alle drei Stile gleich 0.7/0.8).

---

## 4. Rarität / Gewichtung der Suffixe

Gewichteter Roll (Roll 2): `P(suffix) = w / Σw` über den **bereits ilvl- und typ-gefilterten** Pool. Vier Gewichts-Klassen:

| Klasse | w | Charakter | Beispiele |
|---|--:|---|---|
| **Common** | 100 | Brot-und-Butter, 1 Attribut-Paar oder Damage+Stat | bear, tiger, hawk, magus, boar, owl … |
| **Uncommon** | 60 | leichte Spezialisierung (Speed, Evasion-Fokus) | wolf, viper, lynx, sage, oracle, fox |
| **Rare** | 25 | starker Doppelnutzen, crit-tragend | berserker, sentinel, colossus, phoenix |
| **Epic** | 6–10 | Spitzen-Chase-Suffix, hoher minIlvl | carnage, phantom, warlock, executioner |

Zusammenspiel mit **minIlvl**: starke Suffixe sind früh gar nicht im Pool → ein L20-Craft kann nur common/uncommon ziehen, ein L80-Craft hat Zugriff auf das ganze Spektrum (epic bleibt durch w=6–10 trotzdem selten). Das ist das zweite Level-Gating zusätzlich zur Wertskala.

---

## 5. Suffix-Chance-Rahmen (nur Vorschlag — Mechanik gehört dem Instanz-Spec)

Roll 1 (`hasSuffix`, ob überhaupt ein Suffix entsteht). Knapp gehalten:

- **Craft-Basis:** `suffixChance ≈ 0.20` (20 % der Crafts werden „etwas Besonderes"). Pro Rezept überschreibbar (`ActionDef.suffixChance`).
- **lck-Modifikator:** `+0.0015 · lck`, gedeckelt bei **+0.15** (also max 35 % mit viel Glück). lck wird so zum sinnvollen Sekundärnutzen.
- **Crafting-Mastery-Bonus (optional):** zusätzlich `+0.05` ab Mastery-Schwelle des Rezepts — belohnt Vielcraften.
- **Drop-Pfad (Phase 2):** deutlich niedriger, `suffixChance ≈ 0.06–0.10` pro Drop (`LootRoll.suffixChance`), gleicher lck-Modifikator. Drops sollen seltener, aber dafür über jedes Monster-Level skalierend Suffixe liefern.

> Genaue Kopplung (linear vs. Treppe, Caps) entscheidet der Instanz-/Mechanik-Spec; hier nur die Größenordnung als Balance-Leitplanke.

---

## 6. Drop-Anwendung (Phase 2) — derselbe Pool, dieselbe Logik

Der **identische Pool** (§2) wird beim Drop gerollt — **kein zweiter Suffix-Katalog**. Es ändert sich nur die Quelle der drei Rolls:

- `ilvl` = **Monster-Level** statt Craft-Level → ein L70-Monster dropt potenziell stärkere Suffixe als ein L10-Monster (gleiche `S(ilvl)`-Skala).
- Item-Typ-Filter **unverändert**: ein gedropptes Schwert filtert über `itemTypeTags(item)` genauso → nie ein Magier-Suffix auf einer Drop-Nahkampfwaffe.
- Gewichtung & minIlvl-Gating **identisch**.
- Niedrigere Roll-1-Chance (§5) — sonst kein Inhalts-Unterschied. So fühlt sich ein „… des Bären"-Drop genauso an wie ein gecrafteter, und der Pool muss nur einmal gepflegt werden.

---

## 7. Apply-Liste für content-dev (geordnet)

> Befüllt `ContentDB.suffixes: Record<SuffixId, SuffixDef>` (Feld kommt aus dem Instanz-Spec). Pro Eintrag: `id`, `suffix:{en,de}`, `appliesTo`, `statsPerIlvl`/`attrPerIlvl` (= die k-Koeffizienten aus §2), `weight`, `minIlvl`. Soft-Stats (crit/speed) als separate End-Punkte gemäß §3.3 markieren (z.B. eigenes Feld `softStats` oder Konvention im Stat-Template — Datenmodell-Detail beim Logic-Dev anfragen).

1. **Common-Kern zuerst** (minIlvl 1, w 100): `suffix_bear, suffix_bull, suffix_tiger, suffix_hawk, suffix_magus, suffix_owl, suffix_boar, suffix_tortoise`. → liefert sofort funktionierende Pools für alle 5 Item-Typen.
2. **Uncommon** (w 60): `suffix_wolf, suffix_viper, suffix_lynx, suffix_sage, suffix_oracle, suffix_fox` (+ optional `suffix_eagle`).
3. **Rare** (w 25, minIlvl 30): `suffix_berserker, suffix_sentinel, suffix_phoenix` und (minIlvl 50) `suffix_colossus`.
4. **Epic** (w 6–10, minIlvl 50/70): `suffix_carnage, suffix_phantom, suffix_warlock, suffix_executioner`.
5. **`S(ilvl)`-Tabelle (§3.1) + Soft-Endpunkte (§3.3)** als gemeinsame Skalierungs-Konstante hinterlegen (eine Stelle, von der Roll-Engine gelesen) — NICHT pro Suffix duplizieren.
6. Roll-1-Chance-Defaults (§5) an die Mechanik-Engine übergeben (Logic-Dev), sobald `ActionDef.suffixChance`/`LootRoll.suffixChance` existieren.

**Was content-dev NICHT hier macht:** Instanz-Speicherung, Stack/Vault, computeStats-Overlay, Roll-RNG — alles im Instanz-Spec (Logic-Dev).

**Doc-Pfad:** `G:\GameDev\design\suffix-pool-spec.md`
