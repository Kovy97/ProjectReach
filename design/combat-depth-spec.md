# Combat-Depth-Spec — Konter-Play-System (Tasks #221 / #222 / #223)

Stand 2026-07-04 · Autor: balance-designer · Status: **Spec fertig, wartet auf logic/combat/content/ui-Apply**

Grundlage: `design/armor-trinity-spec.md` + `design/armor-iteration2-spec.md` (fertige Verteidigungs-Trinität
Mitigation/Evasion/Ward, Konstanten `DEFENSE_MITIGATION_K=125`, `K_DODGE=45`, `DODGE_CAP=0.75`,
`BLOCK_DAMAGE_REDUCTION=0.85`, Ward-Pool). Diese Spec bündelt vier verzahnte Chef-Themen zu **einem**
kohärenten Konter-System:

- **#221** 2H-Melee gibt **keine** Rüstung mehr → 2H = Top-DPS / Glass-Cannon.
- **#222** Jeder Waffen-TYP (2H **und** 1H) bekommt ein eigenes Profil (Tempo/Stat/Signatur).
- **Armor-Pen** als Waffen-Signatur = Konter zur Gegner-Mitigation.
- **#223** Gegner spiegeln die Spieler-Trinität (Mitigation/Evasion/Ward je Archetyp) → die drei
  Spieler-Konter-Stats (Armor-Pen / Precision / Ward-Break) werden bedeutsam. Weiches RPS, kein hartes Dreieck.

**Ich (balance-designer) wende nichts an.** Alle Zahlen sind mit dem Ist-Content geerdet (echte Waffen-Spans,
echte Gegner-Stats, echte `computeStats`-Terme) und per Modell-Skript nachgerechnet (§1.2/§3.4). Die geordnete
Apply-List (§7) geht an CEO → logic/combat/content/ui.

---

## 0. TL;DR — Kernzahlen + offene Chef-Fragen

### 0.1 Was sich mechanisch ändert

| Thema | Ist | **Neu** | Owner |
|---|---|---|---|
| 2H-Melee `armorRating`-Bonus | `weaponAR × min(1, plateWorn/4)` (character.ts) | **komplett entfernt → 2H mitigation = nur getragene Platte** | logic |
| 2H-Waffen-`armorRating`-Feld | 51–201 je Tier | **entfällt** (Feld auf 2H-Waffen = 0/gelöscht) | content |
| 2H-EHP-Ziel | −10 % vom Anker (mit Waffen-AR) | **71 %→50 % des Ankers (fällt mit Tier)**, bewusster Glass-Cannon | balance |
| 2H-DPS-Prämie | ~+17–22 % Kills (Tester) | **bei ~+22 % HALTEN** (nicht auf +12 % trimmen! §1.3) | content |
| 2H-Tempo-Reihenfolge | greataxe (3400) **schneller** als greatsword (3480) — Bug | **greatsword schnellste der schweren Trias** (§2.1) | content |
| Waffentyp-Signaturen | nur Tempo/Damage differenziert | **Armor-Pen / Precision / Crit-Profil / Stat-Tendenz je Typ** (§2) | content/logic/combat |
| Gegner-`defenseType` | existiert, **alle = `armor`** (ungelesen) | **je Kampfrolle: melee=armor, range=evasion, caster=ward** + wirksam (§3) | content/combat |
| Konter-Stats | keine | **`armorPen` / `precision` / `wardBreak`** (Waffen/Runen/Skills) (§2.4/§3) | logic/combat/content |

### 0.2 Headline-Zahlen (Modell-Skript, §1.2/§3.4)

- **2H ohne Rüstung** trägt am Low-Band **71 %**, am High-Band **50 %** der EHP eines 1H+Schild-Melees
  (fällt mit Tier, weil Block+Schild-AR mit dem Tier wachsen, 2H aber nur die flache 5-Teile-Mitigation hat).
- **DPS-Prämie +22 %** hält 2H bei **Netto-Risiko ×1.16 (R10) → ×1.63 (R99)** gegenüber 1H+Schild: 2H killt
  klar am schnellsten, stirbt aber messbar öfter — eskalierend ins Endgame (Glass-Cannon-Fantasie). Weder
  strikt besser noch nutzlos.
- **Armor-Pen 30 %-Ignore** (Maul) gewinnt **+1.8 % Schaden @L15 → +19.4 % @L295** gegen `armor`-Gegner —
  klein im Frühgame, skaliert gegen gepanzerte Endgame-Foes. **Precision 35 %** und **Ward-Break 40 %** liefern
  vergleichbare **+10–18 %** gegen `evasion`- bzw. `ward`-Gegner → symmetrische Tiefe.

### 0.3 Offene Chef-Entscheide (Defaults gesetzt)
1. **Speer vs. Greatsword „schnellste 2H" (Chef-Widerspruch).** Default-Auflösung: **Speer = eigene leichte
   Polearm-Kategorie (schnellste 2H überhaupt); Greatsword = schnellste der SCHWEREN Trias** (Greatsword/
   Greataxe/Maul). Begründung §2.1 — bestätigen oder kippen.
2. **2H-DPS-Prämie: +22 % halten (empfohlen) vs. +12 % trimmen.** #221 ersetzt die alte iteration2-Empfehlung,
   auf +12 % zu trimmen (die galt nur bei EHP-Parität). Default: **+22 % halten** (Risiko ist jetzt der Ausgleich).
3. **2H-maxHp-Anker: 0.95× (nur Schild-CON verloren, empfohlen) vs. 0.90×.** Höher = Deficit weniger brutal am
   High-Band. Default: **0.95×**.
4. **Armor-Pen-Mechanik: %-Ignore (empfohlen) vs. Flat.** %-Ignore bleibt über alle Tiers relevant. Default: **%-Ignore**.
5. **Gegner-Ward-Regen: keiner (frischer Voll-Pool je Spawn, empfohlen, simpel) vs. langsame Regen.** Default: **keiner**.
6. **Ward-Break gegen Untote/Dämonen als Chase-Signatur (geweihte Waffen, `wardBreak 0.40`)** — Chef-Freigabe zum
   Erfinden solcher Items? Default: **ja** (kreative Item-Lizenz).

---

## 1. #221 — 2H-Melee gibt KEINE Rüstung

### 1.1 Mechanik-Änderung (logic + content)

**character.ts** — der `twoHandMeleeArmorBonus`-Block (aktuell Zeilen ~342–351) wird **entfernt**:

```ts
// ENTFERNEN (kompletter Block):
const PLATE_SLOTS = [...]; const plateWorn = ...;
const twoHandMeleeArmorBonus = style==="melee" && mainhandTwoHanded ? (mainhandItem?.armorRating ?? 0)*Math.min(1,plateWorn/4) : 0;
const armorRating = eq.armorRating + twoHandMeleeArmorBonus;

// NEU:
const armorRating = eq.armorRating;   // 2H-Melee bekommt NICHTS extra — nur getragene Platte zählt
```

**content/index.ts** — das `armorRating`-Feld auf **allen 2H-Melee-Waffen** (Speer/Greataxe/Greatsword/Maul,
alle Tiers, aktuell 51–201) **löschen** (→ 2H `armorRating=0`). Das Feld bleibt auf Platten-Rüstung/Schilden
unverändert. Guard (kontrolleur): „keine Waffe mit `weaponStyle` trägt `armorRating`".

**Folge:** nackter **und** voll-gepanzerter 2H-Melee hat exakt die 5-Teile-Platten-Mitigation, keinen Schild-AR,
keinen Waffen-AR, kein Block. Das erledigt zugleich den iteration2-§4-Bug-Fix (nackter 2H = wirklich ungepanzert)
ohne den `plateWorn/4`-Sonderpfad — er wird obsolet.

### 1.2 EHP neu gedacht — 2H bewusst UNTER den anderen Stilen

Modell-Skript (K=125, BLOCK_DR=0.85, iteration2-§11-Tabellen, 2H-maxHp 0.95×):

| Band | EHP 1H+Schild (Anker) | 2H neu (nur 5-Teile-mit) | **2H als % des Ankers** | Leder | Stoff |
|---:|---:|---:|---:|---:|---:|
| R10 | 79 | **56** | **71 %** | ~parity | ~parity |
| R20 | 113 | **77** | **68 %** | ~parity | ~parity |
| R40 | 210 | **135** | **64 %** | ~parity | ~parity |
| R60 | 362 | **214** | **59 %** | ~parity | ~parity |
| R90 | 710 | **373** | **53 %** | ~parity | ~parity |
| R99 | 900 | **452** | **50 %** | ~parity | ~parity |

> Die **anderen drei** Defensiv-Optionen (1H+Schild / Leder-Dodge / Stoff-Ward) bleiben untereinander in der
> geeichten iteration2-±10 %-Parität — **sie sind der Stil-Paritäts-Anker.** 2H ist bewusst der **Offense-Ausreißer
> darunter**, kein vierter Paritäts-Peer. Der Deficit **weitet sich mit dem Tier** (71 %→50 %), weil Block + Schild-AR
> mit dem Tier wachsen, 2H aber nur die flache 5-Teile-Mitigation hat. Das ist gewollt: der Endgame-2H ist der
> ultimative Glaskanonen-Pick.

### 1.3 DPS-Ausgleich beziffert — Prämie HALTEN, nicht trimmen

Die 12 Tester fanden 2H bereits bei **+17–22 % Kills** — bei damals **gleicher Sicherheit**. iteration2-§3 wollte
das deshalb auf +12 % **trimmen**. **#221 wählt den anderen Weg:** 2H **behält** seine hohe DPS, zahlt aber jetzt mit
EHP. Damit ist die Trimmung **hinfällig** — sie würde 2H doppelt bestrafen.

Modell (Netto-Risiko = `EHP_1H/EHP_2H ÷ (1+Prämie)`; >1 ⇒ 2H bei gleichem Content riskanter):

| Band | EHP-Verhältnis 1H/2H | Prämie **+22 %** → Durchsatz | **Netto-Risiko ×** | Lesart |
|---:|---:|---:|---:|---|
| R10 | 1.42 | +22 % Kills | **1.16** | 16 % riskanter, top DPS |
| R40 | 1.56 | +22 % | **1.28** | 28 % riskanter |
| R60 | 1.69 | +22 % | **1.39** | 39 % riskanter |
| R90 | 1.90 | +22 % | **1.56** | 56 % riskanter |
| R99 | 1.99 | +22 % | **1.63** | 63 % riskanter (Endgame-Glaskanone) |

**Empfehlung (verbindlich für content-dev):**
- **2H-Waffen-Gesamt-DPS = +22 % über der 1H+Schild-effektiv-DPS** je Tier — die aktuelle Größenordnung
  **halten**, NICHT auf +12 % trimmen (iteration2-§3 ist durch #221 ersetzt).
- Bei ±22 % bleibt 2H über **alle** Bänder riskanter als 1H+Schild (Netto-Risiko 1.16–1.63) → nie strikt besser,
  aber immer der klare Top-DPS-Pick. Der One-Shot-Cap (50 % maxHp) bindet weiter → kein „2 Treffer aus dem Nichts".
- **Nicht höher als ~+25 %** gehen: darüber kippt 2H trotz Glass-Cannon in „strikt besser" (Idle-Auto-Eat
  puffert EHP-Nachteile, solange Food nachkommt).

**Gate-Fokus:** #221 macht 2H undergeared/über-Level **gefährlich** (mehr Tode bei knappem Food/Enrage), aber
out-gearter Farm-Content bleibt für 2H der schnellste Weg — genau der Risk/Reward-Kern.

---

## 2. #222 — Waffen-Archetyp-Identität (Matrix)

**Prinzip:** Innerhalb einer Hand-Klasse (alle 1H-Melee bzw. alle 2H-Melee eines Tiers) landet **jeder Typ auf
demselben Gesamt-DPS-Budget** (2H-Klasse = 1.22 × 1H-Klasse, §1.3), verteilt aber unterschiedlich über
**Tempo · Schaden-pro-Treffer · Crit-Profil · Signatur-Effekt**. Typen mit starker (konditionaler/situativer)
Signatur zahlen einen kleinen **Roh-DPS-Tax** (~5 %) und über-performen dafür in ihrer Nische → kein Typ ist
strikt bester. Das Profil ist **konstant über alle Tiers** (jede Waffe des Typs erbt es).

### 2.1 Auflösung des Speer/Greatsword-Widerspruchs (Chef-Frage 0.3.1)

Chef sagte einerseits „Greatsword schnellste 2H", andererseits „Speer schnellste **aller** 2H". Auflösung:

- **Speer = eigene leichte Polearm-Kategorie** (Reichweite, DEX-lastig, geringer Pro-Treffer, schnell) →
  **schnellste 2H überhaupt.**
- **Greatsword = schnellste der SCHWEREN Trias** (Greatsword/Greataxe/Maul = die STR-lastigen High-Impact-2H).

Beide Aussagen sind damit gleichzeitig wahr. Der Speer ist thematisch/mechanisch kein „schweres" 2H — er ist die
Finesse-Stangenwaffe. **Bug-Fix inklusive:** aktuell ist Greataxe (3400 ms) *schneller* als Greatsword (3480 ms) —
genau das „Greataxe = Greatsword nur schneller"-Problem des Chefs. Die neue Ordnung dreht das um.

### 2.2 2H-Melee-Matrix

| Typ | Tempo (ms) | Klasse | Stat-Tendenz | Crit-Profil | Signatur | Roh-DPS | Pro-Treffer |
|---|---:|---|---|---|---|---:|---|
| **Speer** | **2900** (schnellste 2H) | leichte Polearm | **DEX** (höchste 2H) | **+Crit-Schaden** | `precision 0.20` (vs Evasion) | 95 % | niedrigster |
| **Greatsword** | **3150** (schnellste schwere) | schwere Trias | ausgewogen (STR gering) | Basis | **KEINE** (reiner Stat-Stick) | **100 %** | mittel-hoch |
| **Greataxe** | **3450** (mittel-langsam) | schwere Trias | **STR (höchste 2H)** | Basis | STR-Bonus *ist* die Identität | 100 % | hoch |
| **Maul** | **3700** (langsamste) | schwere Trias | STR | Basis | `armorPen 0.30` (vs Mitigation) | 95 % | **höchster** |

- **Greatsword** = „viel Damage, keine Extra-Effekte": höchste **unbedingte** DPS (zahlt 0 Signatur-Tax), sauberer
  Allround-Pick. Weil er jetzt schneller ist, sinkt sein **Pro-Treffer** (Tempo hoch, Budget gleich) — er ist nicht
  mehr „langsamer Maul-Klon".
- **Greataxe** höherer STR-Bonus als Greatsword (z. B. Greataxe `str +2`, Greatsword `str 0–1` je Tier). STR skaliert
  den ganzen Melee-Kit (Synergie-Identität) → budget-neutral gefoldet.
- **Maul** = „max Damage-Impact pro Treffer": langsamstes Tempo → größter Einzeltreffer; Armor-Pen-Signatur
  (stumpfe Waffe durchdringt Rüstung, §2.4) → über-performt gegen `armor`-Gegner.
- **Speer** = schnellste, DEX-lastig, Crit-Schaden-Signatur + `precision` → über-performt gegen `evasion`-Gegner.

### 2.3 1H-Melee-Matrix

| Typ | Tempo (ms) | Stat-Tendenz | Crit-Profil | Signatur | Roh-DPS | Rolle |
|---|---:|---|---|---|---|---:|---|
| **Dolch** | **2400** (schnellste) | **DEX** | **+Crit-Chance (hoch)** | `precision 0.30` (vs Evasion) | 93 % | Finesse/Präzision |
| **Scimitar** | **2650** | DEX | +Crit-Chance (mittel) + Momentum | `precision 0.15` | 95 % | schnell/Krit |
| **Schwert** | **2900** | ausgewogen | Basis | **KEINE** (Balanced-Baseline) | **100 %** | Sword-and-Board-Default |
| **Kolben (Mace)** | **3000** | **STR** | Basis | **`armorPen 0.25`** (vs Mitigation) | 95 % | Anti-Panzer |
| **Axt** | **3100** | ausgewogen | Basis | Holzfäller-**Tool** (Utility) | 92 % | vielseitig (Skilling-Perk) |
| **Kampfaxt** | **3250** (langsamste 1H) | STR/LCK | **+Crit-Schaden** | Crit-Schaden | 97 % | größter 1H-Treffer |

- **Kolben (Mace)** wird **umgewidmet**: heute „Sturdy · Bonus Defence" (con-Modifier). Neu = **Armor-Pen** (blunt).
  Der alte „bonus defence"-Text/`con`-Modifier entfällt (die Verteidigungs-Trinität liest keinen Waffen-Defense-Term
  mehr). `WEAPON_TYPE_SPECIALTY.mace` → „One-Handed · Armor Penetration".
- **Axt** trägt weiter `tool: { skill: "woodcutting" }` — die Skilling-Utility ist ihr „Signatur"-Wert und kostet
  ~8 % Kampf-DPS-Budget (fair: Doppelnutzen Waffe+Werkzeug).
- **Dolch** = schnellste + höchste Crit-Chance + höchste Precision → der Anti-`evasion`-Spezialist des Melee.

### 2.4 DPS-Budget-Formel + worked Beispiel (content-dev)

Gesamt-DPS eines Schlags = `(charDamage_ref + weaponAvg) / interval`. Weil `charDamage` **je Schlag** dazukommt,
appliziert eine **schnellere** Waffe `charDamage` öfter → sie braucht einen **kleineren** `weaponAvg`, um dieselbe
Gesamt-DPS zu treffen. Generierende Regel je Typ:

```
D_class(T)   = Ziel-Gesamt-DPS der Hand-Klasse @Tier T   (2H = 1.22 · 1H)
weaponAvg_t  = (D_class · interval_t − charDamage_ref) · signatureMult_t
             signatureMult = 1.00 (keine Signatur) | 0.95 (Armor-Pen/Precision/Crit-Dmg) | 0.93 (Dolch) | 0.92 (Axt)
damageMin/Max aus weaponAvg via Typ-Spread (Maul breit ~±40 %, Speer eng ~±25 %, Rest ~±30 %)
```

**Worked Beispiel — Iron-Tier 2H (R10, charDamage_ref ≈ 2.6, D_2H ≈ 2.56 DPS):**

| Typ | interval | `weaponAvg = D·T − C` | ×SigMult | **damageMin/Max (Ziel)** | Pro-Treffer-Check |
|---|---:|---:|---:|---:|---|
| Speer | 2900 | 4.82 | ×0.95 → 4.58 | **3.1 / 6.0** | niedrigster ✅ |
| Greatsword | 3150 | 5.46 | ×1.00 → 5.46 | **3.7 / 7.2** | mittel |
| Greataxe | 3450 | 6.22 | ×1.00 → 6.22 | **4.2 / 8.2** | hoch |
| Maul | 3700 | 6.86 | ×0.95 → 6.52 | **3.9 / 9.1** (breit) | **höchster** ✅ |

> Beachte: das aktuelle Iron-Greatsword (4.3/8.3, avg 6.3 @3480) **sinkt** auf ~3.7/7.2 (avg 5.46 @3150) — weil es
> jetzt schneller ist, ist die DPS **identisch**. Genau das Ziel: differenzieren über Tempo+Pro-Treffer+Signatur,
> nicht über „mehr Damage bei fast gleichem Tempo". `charDamage_ref` je Tier aus echtem `computeStats`
> (combatLevel=Tier, Basis-Gear) ziehen — content-dev/kontrolleur kalibrieren die Absolutwerte gegen die Sim
> (Ziel: 2H-Gesamt-DPS-Spanne über die vier Typen ≤ ±3 % vom Klassen-Budget, minus Signatur-Tax).

### 2.5 Ranged/Magic-Typen (Vollständigkeit + Konter-Anbindung)

Damit **jeder Stil** jeden Gegner-Typ kontern kann (weiches RPS), tragen auch Fernkampf/Magie-Typen Konter-Stats:

| Typ | Stil | Tempo | Signatur / Konter-Stat |
|---|---|---|---|
| Kurzbogen | ranged | schnell | `precision 0.15` + Evasion-Flavor |
| Langbogen | ranged | langsam | **`precision 0.25`** (Präzisionsschuss) + Crit-Schaden |
| Stab (2H) | magic | 2H | **`wardBreak 0.30`** (arkane Disruption) + Burn |
| Zepter (1H) | magic | mittel | `wardBreak 0.25` |
| Zauberstab | magic | schnell | `wardBreak 0.20` + Frost/Schock |
| Fokus (Offhand) | magic | — | +Mana/Mana-Regen (Ward-Sustain) |

Bögen sind die natürlichen **Precision**-Träger (Anti-`evasion`), Stäbe die **Ward-Break**-Träger (Anti-`ward`).
Melee deckt **Armor-Pen** (Maul/Kolben) + Precision (Dolch/Speer). Lücken je Stil füllen **Runen/Skills** (§3.3) —
so ist kein Stil gegen einen Gegner-Typ hart gesperrt, jeder hat nur eine natürliche Affinität.

---

## 3. #223 — Gegner-Verteidigungs-Trinität + Konter-Achsen

### 3.1 Die drei Gegner-Defense-Achsen (Spiegel der Spieler-Trinität)

`MonsterDef.defenseType` existiert bereits (aktuell alle `"armor"`, **ungelesen** in der Wirkung). #223 macht sie
wirksam und taggt Gegner **nach Kampfrolle**:

| `defenseType` | Kampfrolle | Feld (Gegner) | Wirkung gegen Spieler-Schaden | Spieler-Konter |
|---|---|---|---|---|
| **`armor`** (default) | Melee-Gegner | `defense` (existiert) | Mitigation `def/(def+125)` mindert Schaden | **Armor-Pen** |
| **`evasion`** | Range-Gegner | `evasion` (existiert) | Accuracy-Contest `acc/(acc+eva)` → Miss-Chance | **Precision** |
| **`ward`** | Magier-Gegner | `wardCapacity` (**neu**) | Absorb-Pool VOR Gegner-HP | **Ward-Break** |

`armor` (Mitigation) und `evasion` (Accuracy-Contest) laufen **schon** in `resolveAttack` (combat.ts:1179) — sie
brauchen nur (a) die Konter-Stats und (b) sinnvolle Werte je Typ. **Ward auf Gegnern ist neu** (Feld + Absorb-Step).

### 3.2 Resolve-Order: Spieler-Angriff auf Gegner (Spiegel von §1.5)

`strikeEnemy` / `resolveAttack` erhält die drei Konter-Stats aus `DerivedStats` (Waffen-Signatur + Runen + Skills):

```
1. Accuracy-Contest    effEva  = monster.evasion · (1 − precision)          // Precision ↔ evasion-Gegner
                       hitChance = max(0.1, acc / (acc + effEva))            → Miss? 0 Schaden
2. Crit-Roll           (unverändert)
3. Mitigation          effDef  = monster.defense · (1 − armorPen)           // Armor-Pen ↔ armor-Gegner
                       reduction = min(0.80, effDef / (effDef + 125))
                       dmg = roll(effMin..effMax)
4. Ward-Absorb (neu)   if monster.wardCapacity > 0:                          // Ward-Break ↔ ward-Gegner
                          bleed    = dmg · wardBreak                          // ignoriert Ward, direkt auf HP
                          toWard   = dmg − bleed
                          absorbed = min(enemyWard, toWard)
                          enemyWard -= absorbed
                          dmg       = bleed + (toWard − absorbed)             // Rest auf HP
5. enemyHp -= dmg  (danach Lifesteal/Status/XP wie gehabt)
```

- **Disjunkt:** jeder Konter trifft **genau eine** Achse (Armor-Pen nur die Mitigation, Precision nur die Evasion,
  Ward-Break nur den Ward-Pool). Kein Gegner-Defense-Wert wird von zwei Kontern getroffen → sauberes, lesbares RPS.
- **`enemyWard`** ist transient (per-Encounter im Combat-State). Bei Spawn/Encounter-Start = `monster.wardCapacity`
  (frischer Voll-Pool, **kein** Regen — Default 0.3.5). **Keine SAVE-Migration nötig**, wenn `enemyWard` beim
  Kampfstart neu gesetzt und bei fehlendem Feld (Alt-Save mitten im Kampf) auf `wardCapacity` initialisiert wird.

### 3.3 Spieler-Konter-Stats: Felder, Caps, Quellen

**Neue `ItemDef`-Waffen-Signatur-Felder** (0..1, NUR auf `weaponStyle`-Trägern; Guard):
```ts
armorPen?: number;    // % der Gegner-Mitigation ignoriert   (Maul .30, Kolben .25)
precision?: number;   // % der Gegner-Evasion ignoriert       (Dolch .30, Langbogen .25, Speer .20, …)
wardBreak?: number;   // % des Treffers, der Gegner-Ward umgeht (Stab .30, Zepter .25, Zauberstab .20)
```
**Neue `DerivedStats`-Aggregate** (Σ Waffe + Runen + Skill-Boni, je auf Cap geklemmt):
```ts
armorPen: number;   // min(ARMOR_PEN_CAP=0.60, Σ)
precision: number;  // min(PRECISION_CAP=0.60, Σ)
wardBreak: number;  // min(WARD_BREAK_CAP=0.75, Σ)
```
**Neue Konstanten (shared):** `ARMOR_PEN_CAP=0.60`, `PRECISION_CAP=0.60`, `WARD_BREAK_CAP=0.75`,
`ENEMY_WARD_HP_FRACTION=0.30` (Content-Generator). Caps mirroren `DEFENSE_MITIGATION_MAX` — nie 100-%-Negation.

**Konter-Quellen (damit jeder Stil jeden Gegner-Typ bespielen kann):**
- **Waffen-Signatur** (Haupt-Quelle, §2): natürliche Affinität je Waffentyp.
- **Runen** (`design/rune-system-plan.md` / `ranged-magic-rune-spec.md`): je eine Rune-Familie pro Konter-Achse
  (z. B. „Rune der Durchdringung" = +armorPen), damit ein Bogen-/Magie-Build Armor-Pen nachrüsten kann. **Konkrete
  Rune-Werte = Rune-Spec-Scope**, hier nur die Achse festgezurrt.
- **Skills/Slayer-Perks** (optional, spätere Iteration): kleiner Flat-Bonus. Jetzt **nicht** nötig — Waffe+Rune
  reichen für die Anbindung.

### 3.4 Gegner-Defense-Werte je Typ × Tier (generierende Formeln)

Geerdet an echten Gegner-Stats (goblin L15: `def 10, eva 1, hp 15`; ×10-Skala aktiv) und der §6.1-Damage-Rescale.

```
armor-Gegner:    defense  = round(0.5 · L)                  (×10-Floor, existiert; Tanks ×1.5)
                 → reduction 6 % @L15 → 29 % @L100 → 54 % @L295
evasion-Gegner:  evasion  = round(0.22 · L + 2)             (Melee-Gegner haben ~0.07·L)
                 → ~32 % Miss für on-level UNGEARTEN Spieler (geared weniger; Precision drückt weiter)
ward-Gegner:     wardCapacity = round(ENEMY_WARD_HP_FRACTION · maxHp)   (= +30 % effektive HP als brechbarer Schild)
                 defense/evasion bleiben niedrig (Caster sind HP-weich, aber abgeschirmt)
```

**Konter-Wirksamkeit (Modell-Skript) — vergleichbare +10–19 % Über-Performance je Achse:**

| Achse | Konter (Beispiel) | Gegen-Typ | Gewinn Low→Endgame |
|---|---|---|---|
| Armor-Pen | Maul 30 % | `armor` | **+1.8 % @L15 → +19.4 % @L295** Schaden |
| Precision | Dolch/Langbogen 30–35 % | `evasion` | Miss ~32 %→24 % = **~+13 %** effektiver Schaden |
| Ward-Break | Stab 40 % | `ward` | Schild-EHP 30 %→18 % = **~+9–15 %** Durchsatz |

Roh-Größenordnungen sind **absichtlich vergleichbar** (kein Konter dominiert). Alle drei sind **Identitäts-Level**,
kein hartes Gate: ein Nicht-Konter-Build tötet jeden Gegner-Typ weiter, nur langsamer — der passende Konter
über-performt in seiner Nische. Das ist die gewünschte RPS-Tiefe **ohne** hartes Dreieck.

### 3.5 Tagging-Beispiele (content-dev, je Kampfrolle)

| Monster | Rolle | `defenseType` | Werte (Beispiel @Level) |
|---|---|---|---|
| goblin (L15, Melee) | Melee | `armor` | `defense 10` (heute) → Floor `round(0.5·15)=8`, halten ≥ heute |
| goblin_archer (L22, Range) | Range | **`evasion`** | `evasion 2 → round(0.22·22+2)=7` (Miss-relevant) |
| goblin_shaman/warlock (Caster) | Magier | **`ward`** | `wardCapacity = round(0.3·maxHp)` (z. B. 24 HP → Ward 7) |

**Family-Heuristik** (Vorschlag, aber Rolle schlägt Family): humanoid-Melee/construct/dragonkin=`armor`;
flinke beast/rogue/archer/flying=`evasion`; undead-Caster/demon/wraith/shade/elemental-arkan=`ward`. Ungetaggt =
`armor` (rein additiv, kein Bruch). Offensiv-Rollen-Flavor (§6.1 Trinity-Spec) bleibt: Caster/Archer +10–15 %
Damage, Tanks −10 %.

---

## 4. Zusammenspiel mit der bestehenden Trinität & Konstanten

- **Symmetrie:** Die Spieler-Defensiv-Trinität (Mitigation/Evasion/Ward) und die Gegner-Defensiv-Trinität nutzen
  **dieselben Formeln** (`x/(x+K)` für Mitigation, `acc/(acc+eva)` für Evasion, Pool-Absorb für Ward). Die drei
  Konter-Stats sind die **Kehrseite**: Armor-Pen mindert einen `x/(x+K)`-Wert, Precision einen Evasion-Wert,
  Ward-Break einen Absorb-Pool — exakt gespiegelt zwischen Spieler- und Gegner-Seite.
- **Konstanten wiederverwendet:** `DEFENSE_MITIGATION_K=125` / `DEFENSE_MITIGATION_MAX=0.80` gelten für Gegner-
  Mitigation unverändert (Armor-Pen reduziert nur den Input `effDef`, nicht K). Kein ×10-Rescale nötig — Gegner-
  `defense` liegt bereits in der ×10-Skala (goblin `def 10`).
- **Block bleibt reine Melee-1H-Schiene** (Armor-iteration2 §3): Armor-Pen umgeht Gegner-Mitigation, **nicht** Block/
  Evasion — falls Gegner je Block bekämen, wäre Precision (nicht Armor-Pen) der Konter (disjunkte Kanäle, Trinity §9).
- **Ward-Break ≠ Player-Ward:** der Spieler-Ward-Pool (Stoff) ist unberührt; Ward-Break wirkt nur auf den **neuen
  Gegner**-`wardCapacity`. Zwei getrennte Systeme, gleiche Absorb-Mechanik.
- **2H-Änderung (#221)** berührt nur `armorRating` — Dodge/Block/Ward/Konter-Achsen bleiben, wie in iteration2 geeicht.
- **Kein SAVE_VERSION-Bump** durch diese Spec nötig (alle neuen Felder additiv/optional; `enemyWard` transient).
  Sollte logic-dev die Migration ohnehin anfassen: mit dem nächsten Bump bündeln, nicht separat.

---

## 5. Balance-Ziele / Gate-Kriterien (kontrolleur, headless, echtes computeStats/simulateCombat)

1. **2H = Glass-Cannon, nicht Suizid, nicht strikt-besser:**
   - Voll-Set 2H-Melee je Band → `computeStats`: `armorRating` = nur 5-Teile-Platte (kein Waffen-/Schild-AR),
     `blockChance 0`. EHP = 50–71 % des 1H+Schild-Ankers (§1.2).
   - `simulateCombat` on-level, on-tier-Food: 2H **kills/h > 1H+Schild** (Top-DPS bestätigt), aber 2H **deaths >
     1H+Schild** (Risiko real). Netto-Kills-bei-Tod-Abzug: 2H ≈ 1H+Schild ±15 % (weder strikt besser noch nutzlos).
   - Naked 2H (nur Waffe): `armorRating 0`, on-level `simulateCombat` → stirbt (Suizid-Constraint intakt).
2. **Waffentyp-Parität:** je Hand-Klasse/Tier die vier (2H) bzw. sechs (1H) Typen → Gesamt-DPS-Spanne ≤ ±3 % vom
   Klassen-Budget (minus dokumentierter Signatur-Tax); Tempo-Ordnung korrekt (greatsword < greataxe < maul;
   spear < greatsword; dagger schnellste 1H).
3. **Signaturen wirken:** Waffe mit `armorPen`/`precision`/`wardBreak` verändert `DerivedStats` korrekt (auf Cap
   geklemmt); Guard fängt Out-of-Range & Signatur auf Nicht-Waffe.
4. **Konter-Über-Performance messbar & gedeckelt:** Armor-Pen-Waffe vs `armor`-Gegner tötet schneller als vs
   `evasion`/`ward`-Gegner (analog Precision/Ward-Break); Über-Performance +10–20 % (nicht >~25 %, kein hartes Gate).
5. **Kein Gegner-Typ unbesiegbar für irgendeinen Stil:** je Stil × je `defenseType` → `simulateCombat` liefert
   `kills > 0` (weiches RPS, kein hartes Dreieck). `findGearedWalls` bleibt leer.
6. **Gegner nicht zu tanky:** kein `defenseType`-Tag hebt die TTK eines on-level-Gegners für einen geeigneten Build
   über die heutige Größenordnung ×1.5 (Chef: „nicht zu tanky"). Ward-Pool = +30 % EHP, nicht mehr.
7. **`pnpm typecheck` + Engine/Persistence-Tests + Client-Build grün**; `mitigation.test.ts` unverändert grün
   (Gegner-Mitigation-Formel unberührt).

---

## 6. Turbo-Test-Hinweis
`pnpm test` kann ein altes rotes Ergebnis replayen (MEMORY: Turbo-Cache-Falle). Für die Sim-Stichproben den
Engine-Test direkt/ohne Cache fahren (`--filter @hearthforge/engine`, Cache leeren). Die Zahlen dieser Spec sind
per Modell-Skript nachgerechnet (nicht sim-final) — kontrolleur re-gatet gegen echtes `simulateCombat` (§5).

---

## 7. Apply-List (geordnet, Single-Writer je Datei)

**Reihenfolge zwingend:** A (shared/logic) zuerst — definiert Felder/Konstanten, die B/C lesen. Innerhalb C sind
#221-Waffen-AR-Löschung und #222-Tempo/Signatur **eine** Content-Welle (dieselben Waffen-Objekte).

### A — logic-dev (shared + character.ts) — ZUERST
1. `ItemDef`: Felder `armorPen?`, `precision?`, `wardBreak?` (0..1, Guard: nur `weaponStyle`-Träger).
2. `MonsterDef`: Feld `wardCapacity?` (Gegner-Ward-Pool).
3. `DerivedStats`: `armorPen`/`precision`/`wardBreak` (aggregiert, auf Cap geklemmt).
4. Konstanten (shared): `ARMOR_PEN_CAP=0.60`, `PRECISION_CAP=0.60`, `WARD_BREAK_CAP=0.75`, `ENEMY_WARD_HP_FRACTION=0.30`.
5. `computeStats`: **`twoHandMeleeArmorBonus` + `plateWorn`-Block entfernen** → `armorRating = eq.armorRating` (§1.1);
   `armorPen`/`precision`/`wardBreak` aus `eq` (Waffe/Runen/Set) aggregieren + klemmen.
6. `eq`-Aggregator um die drei Konter-Stats erweitern (Σ, analog `eq.critChance`).

### B — combat-dev (combat.ts) — NACH A
7. `resolveAttack` (Spieler→Gegner) um die Konter-Order §3.2 erweitern: `effEva = monster.evasion·(1−precision)`,
   `effDef = monster.defense·(1−armorPen)`; die drei Konter-Stats ins `AttackProfile`/`DefendProfile` durchreichen.
8. Gegner-Ward-Absorb-Step (§3.2 Schritt 4) in `strikeEnemy` **nach** der Mitigation, **vor** `enemyHp -=`; transienter
   `enemyWard` im Combat-State (Init = `monster.wardCapacity` bei Encounter-Start, kein Regen).
9. Naked-2H-Verhalten mit-verifizieren (mitigation 0 ohne Platte — folgt automatisch aus §1.1).

### C — content-dev (index.ts) — NACH A (eine Welle)
10. **#221:** `armorRating` von **allen** 2H-Melee-Waffen (Speer/Greataxe/Greatsword/Maul, alle Tiers) **löschen**.
11. **#222 Tempo:** neue `attackIntervalMs` je Typ (2H: Speer 2900 / Greatsword 3150 / Greataxe 3450 / Maul 3700;
    1H: Dolch 2400 / Scimitar 2650 / Schwert 2900 / Kolben 3000 / Axt 3100 / Kampfaxt 3250) — **konstant über alle Tiers**.
12. **#222 Damage:** `damageMin/Max` je Typ per §2.4-Formel neu ableiten (Gesamt-DPS: 1H-Klasse-Budget, 2H = ×1.22,
    Signatur-Tax); worked Iron-Beispiel §2.4 als Anker. 2H-Prämie bei **+22 % halten**, NICHT trimmen (§1.3).
13. **#222 Stat/Signatur:** Greataxe höchster STR-Bonus; Maul `armorPen 0.30`; Kolben `armorPen 0.25` (+ alten
    `con`/„bonus defence" entfernen); Dolch `precision 0.30`+hohe Crit-Chance; Speer `precision 0.20`+Crit-Schaden;
    Scimitar `precision 0.15`; Langbogen `precision 0.25`; Stab `wardBreak 0.30`; Zepter/Zauberstab `wardBreak 0.25/0.20`.
14. **#223:** Gegner `defenseType` je Kampfrolle re-taggen (Melee=`armor`, Range=`evasion`, Caster=`ward`); `evasion`-
    Gegner `evasion = round(0.22·L+2)`; `ward`-Gegner `wardCapacity = round(0.3·maxHp)` (§3.4/§3.5).
15. `WEAPON_TYPE_SPECIALTY`: Texte an neue Signaturen anpassen (mace→Armor-Pen, spear→Crit/Precision, etc.).

### D — ui-dev
16. Tooltip/Char-Sheet: Konter-Stats anzeigen, wenn > 0 („Armor-Pen X %" / „Präzision Y %" / „Ward-Bruch Z %").
17. Gegner-Karte: `defenseType`-Icon + (bei `ward`) Gegner-Ward-Leiste; Floating-Text „DURCHDRUNGEN" / „PRÄZISE" /
    „WARD GEBROCHEN". Waffentyp-Rollenzeile (`WEAPON_TYPE_SPECIALTY`) zeigt die Signatur.

### E — kontrolleur — Re-Gate (§5-Kriterien).

---

## 8. Zusammenfassung für den CEO

- **Datei:** `G:\GameDev\design\combat-depth-spec.md`.
- **#221:** 2H verliert **jeden** Rüstungsbeitrag (Waffen-AR-Feld gelöscht, `twoHandMeleeArmorBonus` raus) → 2H-EHP
  fällt auf **71 %→50 %** des 1H+Schild-Ankers. **DPS-Ausgleich: 2H-Prämie bei +22 % HALTEN** (die iteration2-„auf
  +12 % trimmen"-Empfehlung ist hiermit **aufgehoben**) → Netto-Risiko ×1.16–1.63, Top-DPS-Glaskanone, nie strikt besser.
- **#222:** Waffentyp-Matrix (§2.2/§2.3) mit Tempo-Fix (**Greatsword jetzt schnellste schwere 2H**, Bug „Greataxe
  schneller als Greatsword" behoben), Stat-Tendenz, Crit-Profil, Signatur je Typ + DPS-Budget-Formel §2.4.
- **Armor-Pen** = %-Ignore der Gegner-Mitigation (Maul .30 / Kolben .25), skaliert +1.8 %→+19.4 % ins Endgame.
- **#223:** Gegner-Defense-Trinität wirksam (Melee=armor / Range=evasion / Caster=ward) + drei disjunkte Spieler-
  Konter (Armor-Pen / Precision / Ward-Break) → weiches RPS, kein hartes Dreieck; Resolve-Order §3.2.
- **Apply-List §7** (A logic → B combat → C content-Welle → D ui → E gate).

**Offene Chef-Fragen (§0.3):** v. a. **(1)** Speer=leichte-Kategorie / Greatsword=schnellste-schwere als Auflösung
des Chef-Widerspruchs — bestätigen? **(2)** 2H-Prämie +22 % halten statt +12 % trimmen — bestätigen? Plus 2H-maxHp-
Anker (0.95×), Armor-Pen %-vs-Flat, Gegner-Ward-Regen, geweihte Ward-Break-Chase-Items.
