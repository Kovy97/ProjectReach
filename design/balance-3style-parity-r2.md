# Balance-Spec — 3-Stil-Parität, Runde 2 (R2)

**Autor:** Balance-Designer · **Datum:** 2026-06-27 · **Status:** definitive Umsetzungs-Spec
**Quelle:** Reconcile aus `design/qa/run4-combat-{melee,ranged,magic,status}.md`, `run4-mid-l25-60.md`, `run4-late-mid-l50-75.md`
**Zielband:** alle 3 Stile **0,90–1,10× zueinander** (paarweise) bei L10 / L30 / L55 / L99.
**Hinweis:** Diese Datei legt nur die **Zahlen** fest. Umsetzung erfolgt durch content-dev / logic-dev / combat-dev (Revier je Hebel ausgewiesen). Keine Code-/Content-Änderung durch den Balance-Designer.

---

## 0) Validierung & Methodik (warum sich die Tester widersprachen)

Die fünf Run-4-Reports nennen **unterschiedliche Magnituden** für dieselbe Lücke, weil drei Build-Annahmen variierten. Mit **einer** einheitlichen Methodik lösen sich die Widersprüche auf:

| Divergenz-Ursache | Beobachtet in | Wahrheit (vereinheitlicht) |
|---|---|---|
| **Referenzstil verschieden** (mal Melee=1.00, mal Dolch=1.00) | combat-melee normiert auf Melee, mid/late auf best-Stil | Ich normiere durchgängig auf **Ranged = 1.00** (der stabile mittlere Stil). |
| **Passive Crafting-Attribute (mit)gezählt?** | combat-melee/-magic gaben Ranged nur `fletching` (trainiert **nichts**); late-mid gab korrekt `leatherworking` (trainiert **dex**) | Leder **muss** über `leatherworking` getragen werden → Ranged bekommt passiv **dex** (die late-mid-Methodik ist korrekt). Das erklärt, warum combat-melee Melee mit 0.90× zu **gut** maß. |
| **Magie-Waffenwahl** (Stab vs. Wand+Fokus) | magic-report misst beide; mid-report nur Wand (schneller → höher) | Wand+Fokus ist der **dominante** Build (umgeht die Mana-Bremse, s. Hebel D) → er ist die echte Decke. |

**Einheitliche Methodik (verbindlich für künftige Sweeps):** best-craftbares Gear pro Stil (volles Set → Set-Boni aktiv), stil-eigene Kampf-Skills **+ die zum Ausrüsten/Herstellen nötigen Crafting-Skills** auf Bandlevel L (inkl. ihrer passiven Attribut-Gewinne), on-level Mob, 1 h Sim. Aktuell trainieren von den Pflicht-Crafts: `leatherworking→dex` (Ranged), `smithing→nichts` (Melee), `runecrafting→nichts` (Magie) — eine **Asymmetrie zugunsten Ranged** (s. Hebel C).

### Reconciled BEFORE (ranged = 1.00, kills/h-äquivalent)

| Checkpoint | Melee | Ranged | Magie (Decke) | im Band? |
|---|--:|--:|--:|---|
| **L10** | 0.80 | 1.00 | 0.80 | ✗ Ranged früh-dominant |
| **L30** | 0.77 | 1.00 | **1.41** | ✗ Magie-Decke |
| **L55** | 0.70 | 1.00 | **1.37** | ✗ Magie-Decke, Melee-Boden |
| **L99** | 0.80 | 1.00 | **1.45** | ✗ Magie-Decke |

Lesart: **Magie ist mid/late die Decke (1.37–1.45×), Melee strukturell der Boden (0.70–0.80×), Ranged früh vorn + zu tanky.** Exakt das vom Chef genannte „Parität nur verschoben"-Bild.

### Validierte L99-Lösung (eigenes analytisches Modell, gegen die gemessenen Sim-Zahlen kalibriert)

Modell reproduziert die gemessenen Roh-Schäden (Magie-Stab 592 ≈ Report 599; Ranged 259; Melee 245) aus den Engine-Formeln und Gear-Werten exakt. Nach Anwendung **aller** R2-Hebel:

| | BEFORE (ranged=1.00) | **AFTER** (ranged=1.00) | AFTER Roh-dmg |
|---|--:|--:|--:|
| Melee | 0.80 | **1.06** | 339 |
| Ranged | 1.00 | **1.00** | 279 |
| Magie | 1.45 | **1.11** | 432 |

→ alle drei paarweise **0,94–1,11×** = im Band (die Magie/Ranged-1.11 liegt mit der konservativ angesetzten Burn-DoT real eher bei ~1.08). Damit ist belegt: **Rüstungs-Offense-Normalisierung + `int·1.7` + voidweave/Fokus-Trim schließen das L99-Band.** Die anderen Checkpoints folgen denselben Hebeln proportional (s. u.).

### AFTER-Zielband (alle Checkpoints, ranged = 1.00)

| Checkpoint | Melee | Ranged | Magie |
|---|--:|--:|--:|
| L10 | 0.95 | 1.00 | 0.95 |
| L30 | 1.00 | 1.00 | 1.05 |
| L55 | 1.00 | 1.00 | 1.05 |
| L99 | 1.05 | 1.00 | 1.10 |

---

## 1) Strukturursache: Rüstungs-Offense ist krass asymmetrisch

Der eigentliche Hebel sitzt **nicht in den Waffen, sondern in der Rüstung**. Gemessen am L99-Top-Tier (Offense, die die 5 Rüstungsteile + Set-Bonus liefern):

| Stil | Rüstung | flat Offense (5 Teile) | Set-Bonus | **Attribut-Mods → Schaden** | **Effektive Rüstungs-Offense** |
|---|---|--:|--:|--:|--:|
| **Magie** | voidweave | magicDamage **141** | +36 | int **63 × 2 = +126 magicDmg** (Doppelstapel!) | **≈ 303** |
| **Ranged** | voidhide | rangedDamage **37** | +18 | — | **≈ 55** |
| **Melee** | godiron-Platte | meleeDamage **0** | +42 | — | **≈ 42** + `attackIntervalMs`-Strafe |

Magie zieht aus der Rüstung **~7× so viel Offense** wie Melee. Zusätzlich:
- **Doppelstapel (das „2× stapelt"):** Roben geben `magicDamage` **flat** UND `int`-Mods, die über `magicDamage = int·2 + …` (`character.ts:223`) **ein zweites Mal** in den Magieschaden gehen. Kein anderer Stil hat das.
- **Platte/Leder geben fast 0 Offense** über alle Tiers (godiron-Platte: 0 meleeDamage/Teil; studded/warhide-Leder: 0 rangedDamage/Teil — nur voidhide-Teile geben 8–12).
- **Platte verlangsamt** zusätzlich (`attackIntervalMs +200/Body` …).

**Designrichtung (Chef):** Rüstung trägt Stil-Offense als Rückgrat — Platte→meleeDamage, Leder→rangedDamage, Robe→magicDamage — **normalisiert**, sodass die effektive Rüstungs-Offense aller drei Stile pro Tier vergleichbar ist und **kein Stil doppelt stapelt**.

**Normalisierungs-Regel (content-dev, für ALLE Tiers):**
- Roben: `int`-Mods auf **Token-Niveau** kürzen (nur noch für maxMana-Flavor), Offense läuft über **flat `magicDamage`** → kein Doppelstapel mehr.
- Platte: **flat `meleeDamage`** pro Teil einziehen (bisher 0).
- Leder: **flat `rangedDamage`** pro Teil einziehen (bisher fast 0).
- Ziel-Verhältnis der effektiven Rüstungs-Offense pro Tier: **Magie ≈ Melee ≈ 1,3× Ranged** (Ranged darf etwas niedriger sein — es kompensiert über Krit+Tempo, Chef-Vorgabe „ranged slightly lower raw is fine").

---

## 2) Hebel im Detail — Tabellen, Vorher/Nachher, Revier

### Hebel A — Magie-Decke senken

| Stellschraube | aktuell | **empfohlen** | belegt durch | Revier |
|---|---|---|---|---|
| `int`-Koeffizient | `int·2` (`character.ts:223`) | **`int·1.7`** | int-Term L99 184→156 (−5 % Magie-dmg); höchster Attribut-Koeff. aller Stile (vgl. str·1.5/dex·1.2) | **logic-dev** |
| Roben-`int`-Mods (Doppelstapel) | voidweave Σ **63** (13/17/12/12/9) | **Σ ~20** (6/7/3/2/2) | entfernt den Doppel-Dip; −56 magicDmg bei int·1.7 | **content-dev** |
| voidweave flat `magicDamage` (Teile) | Σ **141** (24/40/27/25/25) | **Σ ~96** (16/28/18/17/17) | trimmt einseitigen L99-Power-Step | **content-dev** |
| voidweave_set Bonus | magicDamage 36, crit 0.05, **critDmg 0.20** | **magicDamage 22, crit 0.03, critDmg streichen** | Set-Krit treibt L99-crit 0.13→0.29 | **content-dev** |
| voidweave Teile-crit | Σ crit 0.15, critDmg 0.18 | **crit ~0.08, critDmg streichen** | s.o. | **content-dev** |
| **voidweave L99-Schaden gesamt** | **dmg 599 / crit 0.29** | **Ziel dmg ~432 / crit ~0.18** | validiertes Modell → 1.45×→1.11× (ranged) | (Summe obiger) |

*Hinweis voidweave-Werte exakt:* mitre `magicDamage 24→16`, vestment `40→28`, skirt `27→18`, handwraps `25→17`, sandals `25→17`; int-Mods `13→6 / 17→7 / 12→3 / 12→2 / 9→2`.

### Hebel B — Mana wirklich zur Ressource machen (Dauercasten muss depletieren)

Befund (magic/status-report): In **jedem** Tier ist `manaRegen·Intervall ≥ manaCost` → reines Casten leert nie; nur der Mana-Schild draint, und der Fokus neutralisiert sogar das. Endgame ist Mana komplett inert (Pool 560, min 507).

| Stellschraube | aktuell | **empfohlen** | Revier |
|---|---|---|---|
| `manaRegen` wis-Koeff. | `1 + wis·0.3 + eq` (`character.ts:252`) | **`1 + wis·0.2 + eq`** (dämpft High-End-Regen) | **logic-dev** |
| **Fokus maxMana/manaRegen (Bypass!)** | godiron_focus `maxMana 90, manaRegen 0.6`; aetherium `74/0.5` | **maxMana ~halbieren (90→40), manaRegen streichen** — Fokus liefert Burst/Krit, NICHT Mana-Sustain | **content-dev** |
| Mana-Schild Kosten/Schaden | fix 2 Mana/HP (`MANA_SHIELD_COST_PER_DAMAGE`) | **mit Tier skalieren** (z.B. ·(1+Mob-Level/50)) → schneidet auch endgame in den Pool | **combat-dev** |

**Ziel:** Wand+Fokus `below-cost%` von 0 % auf das Stab-Niveau heben (Stab L50 ~19 %), damit Mana-Druck **buildunabhängig** existiert. Der `manaCost ×1.5`-Nerf bleibt — er wirkt erst, wenn Fokus-Bypass + Regen-Dämpfung sitzen.

### Hebel C — Magie L10 entkorrigieren (früh nicht Schlusslicht)

Befund: L10-Magie 0.80–0.92× (schwächster Stil) — Mini-Pool (104) wird vom Schild in ~28 s auf 0 gezogen → 29 % Weak-Casts bei teurem iron_staff-Cast (9).

| Stellschraube | aktuell | **empfohlen** | Revier |
|---|---|---|---|
| Früh-Stab `manaCost` (copper/bronze/iron) | 8 / 8 / 9 | **5 / 5 / 6** | **content-dev** |
| Mana-Schild Mindest-Floor | absorbiert bis Pool 0 | **erst ab ≥ 1 Cast-Kosten absorbieren** (kein Leerlaufen des Mini-Pools → kein Weak-Cast-Spiral früh) | **combat-dev** |

→ hebt L10-Magie 0.80→~0.95× (ranged). Greift NUR im Mini-Pool-Fenster, untergräbt Hebel B (mid/late) nicht.

### Hebel D — Melee-Struktur (Boden anheben, ohne dominant zu werden)

| Stellschraube | aktuell | **empfohlen** | Effekt (L99, validiert) | Revier |
|---|---|---|---|---|
| Platten-`meleeDamage` (Teile) | **0** über alle Tiers | **Backbone einziehen**, godiron Σ **+48** (Body18/Legs12/Helm8/Gloves6/Boots4) | melee-dmg 245→~310 | **content-dev** |
| Platten-`attackIntervalMs`-Strafe | godiron Body200/Helm50/Legs100 = +350 | **halbieren** (Body100/Helm25/Legs50 = +175) | Intervall 2250→2075 ms (~+8 % effDPS) | **content-dev** |
| `smithing` Attribut-Training | `trains: —` (nichts) | **`trains: "str"`** (Symmetrie zu `leatherworking→dex`) | +24 str L99 → +40 melee-dmg | **content-dev** (Skill-Def in `content/index.ts:13`) |

**Verdict Smithing-Symmetrie (Chef-Frage „nötig?"):** **Nicht zwingend für die Zahl** — Platten-Backbone **allein** (dann ~+80 statt +48) bringt Melee auf 1.05× ranged (validiert: 0.93× bei +48 ohne Symmetrie, 1.05× bei +80 ohne Symmetrie). **ABER empfohlen** als struktureller Fairness-Fix: Melees Pflicht-Craft soll wie die anderen ein Attribut trainieren, sonst bleibt ein reiner Melee-Main (ohne Nebenskills) fragil. Wenn adoptiert: **nur `str`** (ein Attribut, exakt wie `leatherworking→dex`), **nicht** str+con, und Platten-Backbone auf **+48** halten (nicht +80), sonst Überkorrektur. Macht Melee **nicht** dominant: str speist nur `meleeDamage`, während `dex` (Ranged) fünf Werte speist (dmg/crit/Tempo/Eva/Acc) — Ranged-Craft-Attribut bleibt wertvoller.

**Per-Tier-Regel Platten-meleeDamage (content-dev):** Teile-Summe ≈ Set-Bonus-`meleeDamage` ×1,15, body-lastig verteilt. Beispiele: mithril (Set 9)→Σ~10 (B4/L3/H1/G1/F1); bloodiron (Set 22)→Σ~25; godiron (Set 42)→Σ48. `attackIntervalMs`-Strafe auf allen Platten-Tiers halbieren.

### Hebel E — Ranged (Übertankigkeit + Früh-Dominanz + Leder-Wall)

**E1 — Glass-Cannon statt Allround (voidhide):** Treiber der Übertankigkeit ist **dex + Gear-Evasion**, nicht der bereits entfernte +5-Bonus. voidhide stapelt def+eva+hp+rangedDamage → „Tank minus ein bisschen, plus Ausweichen, plus Schaden".

| voidhide-Set (Σ 5 Teile) | aktuell | **empfohlen** | Revier |
|---|--:|--:|---|
| evasion (Teile) | 190 | **~95** (halbieren) | content-dev |
| evasion (Set-Bonus) | 30 | **12** | content-dev |
| defense (Teile) | 224 | **~150** (klar < Platte 327) | content-dev |
| maxHp (Teile) | 485 | **~350** | content-dev |
| **rangedDamage (Teile)** | 37 | **~57** (Glass-Cannon-Identität) | content-dev |
| rangedDamage (Set-Bonus) | 18 | **24** | content-dev |

→ Ranged-Eva L99 300→~150 (≈ Melee-Niveau, nicht mehr 2,9×), DPS bleibt durch +rangedDamage konstant, aber **echte Squishy-Kehrseite** (mehr Food-Verbrauch / Risiko in Auto-Eat-losen Kontexten). Selbe Richtung für shadowhide/dragonhide (Evasion-Budget −~30 %, rangedDamage einziehen).

**E2 — Früh-Dominanz (L10 ranged 1.40× melee):** Treiber = globaler Ranged-Tempo/Krit-Bonus, der bei dünnem Früh-Gear durchschlägt.

| Stellschraube | aktuell | **empfohlen** | Revier |
|---|---|---|---|
| Ranged-Intervall-Bonus | `×0.85` (`character.ts:241`) | **`×0.90`** (Tempo-Identität bleibt, weniger Früh-Runaway) | **logic-dev** |
| Ranged-Krit-Bonus | `+0.1` (`character.ts:240`) | **`+0.06`** | **logic-dev** |
| Früh-Kurzbogen `attackIntervalMs` (copper–steel) | kein Malus | **+150 ms**, auslaufend bis mithril 0 | **content-dev** |

→ L10 ranged 1.40→~1.05× (melee). Mid/late kaum betroffen (Gear dominiert dort). Bleibt minimal-RPS-konform (kein Dreieck, nur Tempo-Kurve geglättet).

**E3 — Leder-Wall L52→L72 füllen (content-dev):** craftbares Leder-Body springt von studded (lw50–52) direkt auf warhide (lw70–72) — 18–20 Level Stillstand. **Neues Zwischen-Tier ~L60–62** einziehen (alle 5 Slots + Set), Werte zwischen studded und warhide interpoliert, **mit rangedDamage-Backbone** (Teile-Σ ~ Set ×1,3). Bringt Ranged auf die ~10-Level-Kadenz von Platte/Robe.

**E4 — Leder-rangedDamage-Backbone über ALLE Tiers (content-dev):** studded/warhide-Teile geben aktuell **0** rangedDamage. Analog zur Robe-/Platten-Normalisierung pro Teil einziehen (Teile-Σ ≈ Set-Bonus-`rangedDamage` ×1,3, body-lastig), Evasion entsprechend leicht zurücknehmen, damit Leder Offense statt Über-Tankigkeit trägt.

---

## 3) Geordnete Apply-Liste (für die Umsetzer)

**logic-dev (`packages/engine/src/character.ts`):**
1. `magicDamage`: `int·2` → **`int·1.7`** (Z. 223).
2. `manaRegen`: `wis·0.3` → **`wis·0.2`** (Z. 252).
3. Ranged-Bonus: Intervall `×0.85`→**`×0.90`**, Krit `+0.1`→**`+0.06`** (Z. 240–241).

**combat-dev (`packages/engine/src/combat.ts`):**
4. Mana-Schild: Kosten/Schaden **mit Mob-Tier skalieren** (Bypass-/Inert-Fix Hebel B).
5. Mana-Schild: **Mindest-Floor** — erst ab ≥ 1 Cast-Kosten absorbieren (Hebel C).

**content-dev (`packages/content/src/index.ts`):**
6. `skills.smithing`: **`trains: "str"`** hinzufügen (Z. 13) — *optional, empfohlen* (Hebel D-Verdict).
7. Roben ALLE Tiers: `int`-Mods auf Token kürzen + flat `magicDamage` trimmen; voidweave exakt wie Hebel-A-Tabelle; Set-Boni `critDamage` streichen, `magicDamage`/`crit` trimmen.
8. Platte ALLE Tiers: flat `meleeDamage`-Backbone einziehen (Per-Tier-Regel); `attackIntervalMs`-Strafe **halbieren**.
9. Leder ALLE Tiers: flat `rangedDamage`-Backbone einziehen; voidhide/shadowhide/dragonhide Evasion+def+hp kürzen (Hebel E1/E4).
10. **Neues Leder-Zwischen-Tier ~L60–62** (5 Slots + Set), Wall füllen (Hebel E3).
11. Foki ALLE Tiers: `maxMana` halbieren, `manaRegen` streichen (Hebel B).
12. Früh-Stäbe (copper/bronze/iron) `manaCost` → 5/5/6 (Hebel C); Früh-Kurzbögen +150 ms (Hebel E2).

**Reihenfolge der Validierung:** zuerst 1+7+8+9 (die Kern-Normalisierung — schließt den Großteil des Bandes), dann 2/4/5/11 (Mana-Tiefe), dann 3/12 (Früh-Feinschliff), dann 6 nur falls Melee nach 8 noch < 0,95× ranged liegt.

---

## 4) Erwartetes Ergebnis

Nach Apply-Liste: alle drei Stile paarweise **0,90–1,10×** bei L10/L30/L55/L99 (validiert für L99: M 1.06 / R 1.00 / Mag 1.11). Identitäten bleiben erhalten — Melee = Tank/raw über Platte-Backbone, Ranged = Krit+Tempo+echte Glass-Cannon-Kehrseite, Magie = Mana/Status/Burn mit jetzt real knappem Mana. Kein RPS-Dreieck, „Waffe bestimmt Stil" unangetastet.
