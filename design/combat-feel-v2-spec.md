# Combat-Feel v2 — Balance-Spec (Task #236)

Quelle: `design/combat-sweep3-2026-07-04/TRIAGE.md` (9/9 Tester SHIP, 0 Engine-Bugs). Alle Punkte
hier sind **Balance-Tuning**, keine Blocker. Grundwerte gelesen aus `packages/shared/src/index.ts`
(Konstanten) + `packages/content/src/index.ts` (Waffen/Monster/Consumables) + Sim-Report
(`pnpm --filter @hearthforge/engine test -- src/sim.test.ts`, Fenster 3 min).

**Ich (balance-designer) liefere NUR die Zahlen/Feld-Designs. content-dev / combat-dev / logic-dev
setzen um. Ich editiere kein `packages/**`.**

## Umsetzungs-Reihenfolge (Chef-Priorität #0 > #1(läuft) > #2 > Rest)

| # | Thema | Owner | Aufwand |
|---|-------|-------|---------|
| **#0** | **Rüstungs-Pflicht (Heilung → %maxHp + Auto-Trank-Durchsatz)** | logic-dev (Feld+Engine) + content-dev (Werte) + shared (1 Konstante) | groß |
| #2 | wardBreak lebendig machen | combat-dev (Formel-Fix) + content-dev (Ward-Bosse) | mittel |
| #3 | precision-Konter (Endgame-Evasion rauf) | content-dev | klein |
| #4 | armorPen sichtbar (Band-Armor-def rauf) + als Mid/Endgame-Stat dokumentiert | content-dev | klein |
| #5 | Waffen-Sidegrades (Shortbow/Staff/Maul) | content-dev | klein |
| #7 | Endgame-Heiltrank-Leiter | **fällt mit #0 weg** (Potion-%-Leiter schließt die Lücke) | — |
| #8 | Content-Coverage (ward/armor-Mobs außerhalb Slayer/Turm) | content-dev | mittel |
| #P4 | Melee-wardBreak-Rune (optional) | content-dev | klein |

---

# ★ #0 — Rüstungs-Pflicht erodiert ab L45+ (KERN)

## Diagnose (warum flach kaputt ist)
Rüstung (Platte) kauft **Mitigation**, nicht HP-Pool — geprept vs. nackt haben ~gleiches maxHp,
Unterschied ist nur der eingehende Schaden. Heilung ist aber **flach** (absolute HP), und der
One-Shot-Cap (50 % maxHp) deckelt jeden Einzeltreffer. Ergebnis:

- **Steady-State-Sustain der flachen Heilung liegt IMMER über dem eingehenden Schaden**, sobald der
  HP-Pool groß genug ist, dass Varianz in den Auto-Eat/Trank-Fenstern nicht mehr tötet.
- On-level-Gegner-DPS (roh, ungerüstet) ≈ 5 HP/s @L45, ≈ 10 HP/s @L90. Auto-Eat-Food heilt
  flach ~20–27 alle 3 s (= 7–9 HP/s) → **Food ALLEIN überheilt Nacktheit ab L45**.
- `bloodmend_draught` heilt **flach 220** (Voll-Refill eines ~200-HP-Pools) alle 5 s = 44 HP/s →
  god-mode gegen alles. (220 ist ein nie ÷10-gesquishter Alt-Wert: der nächstgrößte Trank heilt 46.)
- @L15 stirbt nackt nur, weil der Pool (~40) so klein ist, dass Burst in den Cooldown-Lücken tötet —
  Varianz, nicht Steady-State. Genau deshalb bricht die Rüstungs-Pflicht erst ab Mid.

**Kernursache:** flache Heilung ist pool-abhängig und nicht relativ zum eingehenden Schaden tunebar.
Rüstung (Mitigation) wird überflüssig, sobald die flache Heilung den ungerüsteten Chip überbietet.

## Ziel-Modell: das „Sustain-Fenster"
Weil Rüstung den eingehenden Schaden um den Mitigations-Anteil `M` senkt (voller on-level-Plattensatz
≈ 45–55 % Reduktion; godiron-Satz Σ armorRating ≈ 147 → 54 %), lässt sich Heilung so tunen, dass sie
**zwischen** gerüstetem und ungerüstetem Zufluss liegt:

```
   Zufluss_gerüstet (≈ e·(1−M))  <  Sustain (Heilung/s)  <  Zufluss_nackt (e)
```

Mit `e` = ungerüsteter on-level-Zufluss ≈ **4,5–5 % maxHp/s** (konsistent über L15/45/90, s.o.) und
`M ≈ 0,5`:

- **Ziel-Sustain ≈ 3,0–4,0 % maxHp/s** (kombiniert Food + Trank).
- Nackt: 5 % rein, ~3,5 % Heilung → **netto −1,5 %/s → stirbt durch Attrition** (kein billiger
  One-Shot — Fairness bleibt).
- Gerüstet: 2,5 % rein, 3,5 % Heilung → **netto +1 %/s → überlebt (≈0 Tode)**.

Der Clou: **als %maxHp ist der Sustain pool-invariant** → EIN Satz Werte wirkt über alle Bänder
identisch (flache Werte können das nicht — deshalb der Umbau).

## Feld-Design: `healPct` (logic-dev, shared-Typ)
Neues **optionales** Feld auf `ItemDef`:

```ts
/** Heilung als Anteil der max. HP (0..1). Wenn gesetzt, nutzen ALLE Auto-/Manuell-Heilpfade
 *  round(maxHp · healPct) statt des flachen healAmount. healAmount bleibt Fallback/Tooltip. */
healPct?: number;
```

**Engine-Vertrag (combat.ts, EINE Helper-Funktion, an allen 3 Heil-Verzehrstellen aufrufen):**
```ts
function consumableHeal(item: ItemDef, maxHp: number): number {
  return item.healPct != null
    ? Math.round(maxHp * item.healPct)     // NEU: %maxHp
    : (item.healAmount ?? 0);              // Fallback: flach (Abwärtskompat)
}
```
Betrifft: `tryAutoEat` (Zeile ~106), `tryAutoPotion`/`useConsumable` (Zeile ~148/289), sowie
`useConsumable`-Manuellpfad. `autoEatHealMult(tier)` bleibt Faktor 1.0 → weiter nur Schwellen-Upgrade,
kein Heal-Mult (unverändert multiplizieren: `round(maxHp·healPct·healMult)`).

**Migration / Abwärtskompat:**
- `healPct` lebt NUR in der ContentDB (nicht im Save) → **KEIN SAVE_VERSION-Bump**, keine
  State-Migration. `character.autoPotion`/`autoEatTier` unverändert.
- Items ohne `healPct` heilen exakt wie bisher (flach) → gemischter Zustand ist sicher, content-dev
  kann inkrementell umstellen.
- `isHealPotion`/Guard-Checks, die `healAmount > 0` prüfen (combat.ts ~148/318), müssen auf
  `(healAmount ?? 0) > 0 || (healPct ?? 0) > 0` erweitert werden (sonst gilt ein reines-`healPct`-
  Item nicht als Heiltrank). **logic-dev/combat-dev beachten.**
- UI (ui-dev, minor): Tooltip „heilt X % max. HP" wenn `healPct` gesetzt.

## Umstell-Tabelle A — FOOD (Auto-Eat, 3 s Cooldown)
Regel für content-dev: jedem Auto-Eat-Food (gekochtes Fisch/Fleisch) `healPct` nach seinem
**freischalt-Level** geben; `healAmount` als Fallback stehen lassen. Die Leiter bleibt via **Buffs +
sanftem %-Anstieg** erhalten (besseres Food = etwas mehr % + besserer Buff). Sustain = healPct/3 s.

| Food-Level-Band | healPct | Food-Sustain (/s) |
|---|---|---|
| L1–10   | **4,0 %** | 1,33 % |
| L11–25  | **4,5 %** | 1,50 % |
| L26–45  | **5,0 %** | 1,67 % |
| L46–65  | **5,5 %** | 1,83 % |
| L66–85  | **6,0 %** | 2,00 % |
| L86–99  | **6,5 %** | 2,17 % |

→ Endgame-Food allein 2,17 %/s < nackter Zufluss 5 %/s (**Food allein trägt Nacktheit nicht mehr**),
liegt aber knapp unter gerüstetem Zufluss (~2,5 %/s) → Food bleibt die Grundversorgung, Trank
schließt die Restlücke. Cooking-XP-Progression unberührt (XP kommt vom Kochen, nicht vom Heilwert).

## Umstell-Tabelle B — HEILTRÄNKE (Auto-Trank) → %maxHp
Alle **dedizierten Heiltränke** auf `healPct` nach Herblore-Level. Große, befriedigende Schlucke,
aber durchsatz-gedeckelt (s. Cooldown unten). **Das entfernt den bloodmend-220-Ausreißer UND
schließt automatisch die #7-Leiter-Lücke** (h24→46→220-Sprung wird zur glatten 12 %→25 %-Rampe).

| Trank | Herblore-Lvl | flach (alt) | **healPct (neu)** |
|---|---|---|---|
| potion_minor_heal | 1 | 3 | **12 %** |
| minor_healing_potion | 1 | 5 | **12 %** |
| potion_lesser_heal | 12 | 6 | **13 %** |
| greater_healing_potion | 16 | 11 | **14 %** |
| potion_heal | 21 | 9 | **15 %** |
| salve_of_mending | 25 | 10 | **16 %** |
| mandrake_tincture | ~30 | 13 | **17 %** |
| potion_greater_heal | 41 | 15 | **18 %** |
| gallows_preserve | ~50 | 20 | **19 %** |
| bloodmend_draught | 55 | **220 (!)** | **20 %** |
| duskcap_tonic | ~56 | 23 | **20 %** |
| potion_potent_heal | ~58 | 24 | **21 %** |
| corpse_lily_salve | ~70 | 30 | **22 %** |
| elixir_renewal | ~78 | 36 | **23 %** |
| revenant_elixir | 85 | 39 | **24 %** |
| godbloom_infusion | 95 | 46 | **25 %** |

Glatte Leiter 12 %→25 %, kein Sprung, kein god-mode. (Kombi-Tränke mit `buff` + Heilung: `healPct`
zusätzlich zum Buff, Buff unverändert.)

## Auto-Trank-Durchsatz deckeln (shared-Konstante, 1 Zahl)
Damit ein 25 %-Schluck ein **großer** Schluck bleibt, aber sein Durchsatz gedeckelt ist:

```
AUTO_POTION_COOLDOWN_MS:  5_000  →  8_000
```
Top-Trank 25 %/8 s = 3,1 %/s Spitzendurchsatz. Kombiniert mit Endgame-Food 2,17 %/s ergibt der
**maximale** Dauer-Sustain ~4,0–4,5 %/s — unter nacktem Zufluss (~5 %/s), über gerüstetem (~2,5 %/s).
Der Trank feuert ohnehin nur < `AUTO_POTION_DEFAULT_THRESHOLD` (40 %) → im on-level-Alltag hält Food
allein die Leiste > 40 %, der Trank bleibt Notreserve. (Auto-Eat-Cooldown 3 s bleibt.)

## Erwartete Wirkung (Verifikations-Ziel für content-dev/combat-dev/Sweep)

| Szenario | vorher | Ziel nachher |
|---|---|---|
| **nackt + Food + Trank, on-level L45/L90** | ~0 Tode (überheilt) | **stirbt durch Attrition** (Sustain < Zufluss) |
| **Platte + Food + Trank, on-level (voll geprept)** | ~0 Tode | **unverändert ~0 Tode** (One-Shot-Cap bleibt) |
| Platte OHNE Consumables, on-level | stirbt | **stirbt** (unverändert — Food/Trank Pflicht) |
| nackt on-level L15 | stirbt | **stirbt** (unverändert) |
| bloodmend als Auto-Trank | Voll-Refill/5 s = god-mode | **20 % maxHp/8 s** (großer, endlicher Schluck) |

**Kalibrier-Auftrag:** Die %-Startwerte sind gegen die Sweep-Harness zu prüfen (RealisticPlayer
nackt/geprept @L15/45/90). Bindende Bedingung: *nackt-on-level netto negativ, geprept-on-level ≈0
Tode*. Feintuning innerhalb Food 4–7 % / Trank 12–26 % / Cooldown 6–10 s, falls die reale
Pool-/DPS-Messung von den Anker-Schätzungen (~40/110/200 HP; ~5/s Zufluss) abweicht.

**K NICHT anfassen:** `DEFENSE_MITIGATION_K=125` bleibt — es ist symmetrisch (Spieler+Gegner) und
an die gesamte Endgame-Danger-Eichung gekoppelt. #0 läuft rein über Heilung + Trank-Cooldown.

---

# #2 — wardBreak ist ein totes Feature

## Wichtige Korrektur: großer Ward-Pool ALLEIN reicht NICHT
Die aktuelle Formel (combat.ts ~1284) spaltet **einen** Treffer auf:
`bleed = dmg·wardBreak` → HP, Rest `dmg·(1−wardBreak)` → Ward-Pool. Rechnet man die Treffer bis Kill
durch, ergibt sich **unabhängig von wardBreak**:

```
Treffer bis Kill = (HP + Ward) / Schaden     ← wardBreak kürzt sich raus
```

→ wardBreak ist **TTK-neutral** ohne weitere Änderung. Der Tester-Befund „TTK-Delta 0.0 s" ist korrekt
und **würde durch reines Aufblähen des Pools NICHT behoben** (das Delta bleibt 0). Es braucht eine
Mechanik-Korrektur, damit Ward-Umgehen tatsächlich Zeit spart.

## Fix W1 (empfohlen) — bleed als ZUSATZschaden statt Anteil (combat-dev + shared-Kommentar)
Ward absorbiert den **vollen** Treffer (drainт mit `dmg`), und `bleed = dmg·wardBreak` trifft die HP
**zusätzlich** (Bonus), solange Ward steht:

```ts
// vorher: toWard = dmg - bleed;  (Split → TTK-neutral)
// NEU:
const bleed = damage * stats.wardBreak;         // Bonus-HP-Schaden, umgeht den Pool
const absorbed = Math.min(cs.enemyWard, damage); // voller Treffer drainт den Pool
cs.enemyWard = Math.max(0, cs.enemyWard - absorbed);
const overflow = damage - absorbed;              // Rest nach Ward-Bruch
damage = Math.round(bleed + overflow);
```
Dann gilt `Treffer bis Kill = (HP + Ward·(1−wardBreak)) / Schaden` — wardBreak spart `Ward·wb/Schaden`
Treffer, **skaliert mit der Pool-Größe** → großer Pool macht wardBreak spürbar. Deckel `WARD_BREAK_CAP
=0,75` bleibt (nie 100 % Umgehung). Kleiner Formel-Change, kein Unbesiegbar-Risiko.

## Ward-Bosse (content-dev) — nach W1
Große Ward-Pools auf designierte Endgame-Caster, damit W1 sichtbar wird (~+15–25 % TTK-Vorteil für
wardBreak-Waffe). Werte = handgesetzt (überschreiben die 0,3-`ENEMY_WARD_HP_FRACTION`-Autoregel):

| Monster | Lvl | maxHp | wardCapacity alt → **neu** | Rationale |
|---|---|---|---|---|
| `aether_wraith` | 260 | 125→**180** | 38 → **400** | „reines Ätherwesen" = Ward-Boss schlechthin |
| `gravecliff_specter` | 237 | 308 | 92 → **350** | großer Pool ~ HP → echte Ward-Phase |
| (neu, s. #8) `hollow_choir` | ~80 | ~90 | — → **220** | Mid-Endgame-Ward-Showcase außerhalb Turm |

`ENEMY_WARD_HP_FRACTION` **bei 0,3 lassen** (globale Anhebung würde alle Ward-Mobs für Nicht-Caster
zäh machen — Fairness-Risiko). Nur die 2–3 designierten Bosse handsetzen.

## Option W2 (optional, mehr Tiefe) — Ward-Regen
Falls wardBreak ein *harter Konter* (Pflicht) statt nur Bonus sein soll: neues `MonsterDef.wardRegen`
(Ward/s, combat-dev) → ohne wardBreak drainт man einen regenerierenden Pool kaum/gar nicht (Stall),
mit wardBreak blutet man trotzdem durch. Nur für optionale Magier-Bosse setzen (sonst Melee/Ranged
ausgesperrt). **Nicht nötig für den Grund-Fix — W1 reicht.** Als späterer Tiefe-Hebel notiert.

---

# #3 — precision unter-wirksam (Ranged)

Treffer = `acc / (acc + eva·(1−precision))`. Endgame-Ranged-acc ≈ 82, **höchste Gegner-Evasion im
Spiel = 53** → Basis-Treffer 82/135 = 61 %; precision 0,25 hebt nur auf 67 % (+6,6 pts). precision
ist zu schwach, weil Evasion zu niedrig ist.

**Fix: Ranged-acc NICHT senken** (würde Ranged gegen alle Low-Eva-Bosse nerfen — Ranged ist laut
Sweep der sicherste, gut ausbalancierte Stil). Stattdessen **Endgame-Evasion-Mobs auf eva 70–86
heben** (= die precision-Showcase-Ziele der weichen RPS). Bei eva 80: Basis-Treffer 82/162 = 51 %,
precision 0,25 → 58 % (+7), precision 0,60 (Deckel, Dolch/precision-stack) → 72 % (+21 pts, +42 %
Durchsatz). precision wird sichtbarer, gestaffelter Konter.

| Monster | Lvl | evasion alt → **neu** |
|---|---|---|
| `deep_kraken` | 150 | 35 → **70** |
| `abyssal_tide_serpent` | 155 | 36 → **72** |
| `roc` | 200 | 46 → **78** |
| `roc_hunter` | 208 | 48 → **80** |
| `roc_elder` | 215 | 49 → **82** |
| `roc_storm` | 222 | 51 → **84** |
| `roc_void` | 233 | 53 → **86** |

RPS-Hinweis: hohe Evasion ist bewusst **hart für Magie** (kein precision-Zugang) — Magie hat dafür die
Ward-Bosse. Sicherstellen (via #8), dass jedes Band Ziele für jeden Stil hat, damit kein Stil an einem
Evasion-Mob *gezwungen* scheitert.

---

# #4 — armorPen unsichtbar bis ~L150

Mitigation `effDef/(effDef+125)`, `effDef = def·(1−armorPen)`. Band-Mob-def ist zu klein gegen K=125:
bei def 20 gibt armorPen 0,30 nur +4 % Schaden, echter Payoff erst bei def 120–170 (Endgame).

**Entscheidung: BEIDES —**
1. **armorPen als Mid-/Endgame-Konter dokumentieren** (Waffen-Tooltip/Wiki-Notiz: „stark gegen schwer
   gepanzerte Ziele"). Es ist per Kurve inhärent endgame-lastig — das ist ok und RPS-kohärent.
2. **Band-Armor-Mob-def moderat anheben (L60–120)**, damit die Crossover-Sichtbarkeit von ~L150 auf
   ~L65 vorzieht. Bei def 70: Mitigation 36 %, armorPen 0,30 → effDef 49 → 28 % → **+12 % Schaden**
   (sichtbar). K bleibt unangetastet.

| Monster | Lvl | def alt → **neu** (defenseType armor) |
|---|---|---|
| `skeleton_warrior` | 65 | 33 → **58** |
| `skeleton_butcher` | 75 | 50 → **68** |
| `bone_colossus` | 76 | 40 → **66** |
| `dread_knight` | 82 | 41 → **70** |
| `abyssal_devourer` | 96 | 50 → **78** |

Trade-off: diese Mobs werden für Nicht-armorPen ~+10 % zäher (Armor-Mob-Identität, gewollt) — bleiben
killbar (geared-Sim tötet sie in 9–13 s; +10 % TTK unkritisch). Nach Anwendung Sim gegenprüfen, dass
kein Nicht-Slayer-Band ausschließlich aus zähen Armor-Mobs besteht.

---

# #5 — Waffen-Sidegrades

## Shortbow < Longbow (jeder Mob)
Longbow (precision 0,25 + eagleEye-Öffnungskrit) schlägt Shortbow (precision 0,15, −150 ms Tempo) an
jedem Ziel. Shortbow braucht eine **Tempo/On-Hit-Nische** statt reiner Roh-Parität.

**Empfehlung (content-dev):** Shortbow-Identität = „schnelle, on-hit-stapelnde" Fernwaffe.
- Shortbow-Tempo weiter runter: `attackIntervalMs 2850 → 2650` (Longbow bleibt 3000). Macht Shortbow
  zur klaren Schnellfeuer-Option (mehr Treffer/s → mehr Ammo-Verbrauch, mehr Krit-Würfe, mehr
  DoT-/On-Hit-Procs) gegenüber Longbows Burst-Öffnung.
- Ab Mid-Tier (ab `runite_shortbow`, L60) einen `momentum`-Effekt geben
  (`{ type:"momentum", chance:1, magnitude:0.02, stacks:8 }`) — belohnt langes Draufbleiben (Tanky-
  Ziele), komplementär zu Longbows eagleEye (Öffnungs-Burst, gut gegen schwache/schnelle Kills).
Netto: Longbow = Burst/Alpha (kurze Kämpfe), Shortbow = Sustain/Tempo (lange Kämpfe). Nach Anwendung
DPS-Parität ±5 % über die Bänder gegenprüfen.

## Wand+Focus > Staff (Low/Mid-Band)
Wand (1H, +Focus-Offhand: +maxMana/+manaRegen/+critChance, Control-Frost/Shock, schnelleres Tempo)
schlägt Staff (2H, Burn-DoT, höherer wardBreak) — Staffs wardBreak ist an kleinen Pools wertlos, sein
Roh-Vorteil frisst das langsamere Tempo.

**Empfehlung (content-dev):** Staff-Identität = „DoT/Anti-Tanky/Anti-Ward-Powercaster".
- Burn zur echten DPS-Säule machen: Staff-Burn-`chance` auf **0,45** (alle Tiers, aktuell 0,25→0,40)
  und `magnitude` **×1,5**. Burn umgeht Ward (→ direkt HP) und tickt auf zähen/High-HP-Zielen auf —
  Staffs klarer Vorteil gegen Ward-Bosse (#2) + Tanks, wo Wands schnelle Control weniger bringt.
- Staff behält `wardBreak 0,30` (> Wand 0,20) → mit W1 (#2) wird das an den Ward-Bossen sein zweiter
  sichtbarer Vorteil.
- Wand unverändert (Control + Mana-Ökonomie + 1H-Flexibilität = Squishy/Burst-Nische).
Netto: Staff = anhaltender Schaden gegen zähe/ward Ziele, Wand = schnelle Kontrolle gegen squishy.

## Maul < Greatsword auf ungepanzerten Zielen
Maul (armorPen 0,30, langsam 3700 ms) liegt auf weichen Zielen 2–5 % unter Greatsword, sein
armorPen-Payoff kommt spät. **Kein Roh-Buff** (Maul-Roh-DPS überholt Greatsword bei niedrigem
charDamage bereits — ein flacher Buff würde ihn strikt dominieren lassen; der Soft-Target-Rückstand
ist der *gewollte* Sidegrade-Trade). Stattdessen **Identität schärfen:**
- Maul-`armorPen 0,30 → 0,40` (alle Tiers; Deckel 0,60). Verdoppelt fast den Payoff gegen Armor-Mobs
  (bei def 70: +12 %→+16 %) und zieht den Crossover vor. In Kombi mit #4 (mehr Band-Armor-Mobs) hat der
  Maul ab ~L65 klare Gewinn-Matchups.
- **Nur falls** die Post-Apply-Sim Maul auf weichen Zielen am BiS-Band immer noch >3 % unter Greatsword
  zeigt: godiron/aetherium-Maul `attackIntervalMs 3700 → 3600` (uniform, +2,8 % DPS, bleibt langsamste
  2H). Sim-gegatet, nicht blind.

---

# #7 — Endgame-Heiltrank-Leiter

**Erledigt durch #0.** Die Potion-%-Leiter (Tabelle B) ersetzt die kaputte Flach-Leiter (Cap h24 →
Sprung godbloom 46 / bloodmend 220) durch eine glatte 12 %→25 %-Rampe. Kein separater Mid-Endgame-Trank
mehr nötig — bloodmend (L55, 20 %), duskcap/potent (~L56/58, 20–21 %), corpse_lily (L70, 22 %),
elixir_renewal/revenant (L78/85, 23–24 %), godbloom (L95, 25 %) füllen das Band lückenlos.

---

# #8 — Content-Coverage (content-dev legt neue Mobs an)

Lücken laut Triage: kein **non-slayer/non-tower Ward-Mob L18–85**, kein **Armor-Mob ~L90 außerhalb
Turm**. Vorschläge (Stat-Richtwerte auf on-tier-Kurve; defenseType/Zone gesetzt):

| id (Vorschlag) | Lvl | Zone | defenseType | Richtwerte (maxHp/dmg/def/eva/int) | Zweck |
|---|---|---|---|---|---|
| `mire_wisp` | 30 | swamp/mire (open) | ward, wardCapacity ~9 | 24 / 12 / 20 / 2 / 3000 | erster freier Ward-Mob für Magier |
| `barrow_chanter` | 55 | ashfield/graveyard (open) | ward, wardCapacity ~14 | 38 / 19 / 30 / 2 / 3000 | Mid-Band Ward (frei) |
| `hollow_choir` | 80 | highlands (open) | ward, **wardCapacity 220** | 90 / 30 / 45 / 3 / 3000 | Mid-Endgame Ward-Showcase (#2, mit W1) |
| `iron_sentinel` | 90 | highlands/slagpit (open) | armor | 130 / 33 / 75 / 3 / 3200 | freier Armor-Mob ~L90 (armorPen-Ziel, #4) |

Alle als **Nicht-Slayer** (kein `slayerFloor`/`requires`), damit jeder Stil in jedem Band ein
passendes RPS-Ziel hat. Loot/Gold on-tier (content-dev nach Zonen-Konvention).

---

# #P4 — Melee hat keinen wardBreak-Zugang (optional)

Melee kann armorPen/precision (Mace/Maul/Dolch/Speer), aber **kein wardBreak** → gegen Ward-Bosse
(#2) reine Brute-Force. Optional eine **geweihte Ward-Break-Quelle für Melee** anlegen (content-dev),
damit Melee ein Werkzeug gegen Ward-Bosse hat statt sie nur langsam durchzuprügeln:

- **Rune/Enchant** „Sigil des Ward-Brechers" (Affix-System, Instanz-Rune) die `wardBreak +0,25` auf
  eine Melee-Waffe legt — passt ins bestehende Runen-Fundament, kein neuer Waffentyp nötig.
- Alternativ eine geweihte Drop-Waffe (Endgame) mit `wardBreak 0,30`.

Niedrige Priorität — erst wenn #2 (W1) steht (sonst wäre wardBreak auch für Melee wertlos).

---

# Geordnete Apply-Liste (für den Chef → content-dev/combat-dev/logic-dev)

1. **#0a (logic-dev/shared):** `ItemDef.healPct?` einführen; `consumableHeal`-Helper an Auto-Eat/
   Auto-Trank/useConsumable; `isHealPotion`-Guard auf `healPct` erweitern. KEIN SAVE_VERSION-Bump.
2. **#0b (shared):** `AUTO_POTION_COOLDOWN_MS 5_000 → 8_000`.
3. **#0c (content-dev):** Food `healPct` nach Tabelle A; Heiltränke `healPct` nach Tabelle B
   (bloodmend 220 → 20 %). `healAmount` als Fallback belassen.
4. **#0d (Verifikation):** Sweep-Harness — nackt-on-level netto negativ, geprept ≈0 Tode. %-Werte
   ggf. im angegebenen Rahmen nachtunen.
5. **#2a (combat-dev):** W1 Ward-Bleed-Formel (Zusatzschaden). Shared-Kommentar an `absorbWard`/
   `WARD_BREAK_CAP` aktualisieren.
6. **#2b (content-dev):** `aether_wraith` ward 38→400 (+maxHp 125→180), `gravecliff_specter` ward
   92→350.
7. **#3 (content-dev):** Endgame-Evasion-Mobs eva → 70–86 (Tabelle).
8. **#4 (content-dev):** Band-Armor-Mob-def L60–120 rauf (Tabelle) + armorPen-Doku.
9. **#5 (content-dev):** Shortbow-Tempo 2850→2650 (+momentum ab runite); Staff-Burn chance 0,45 /
   mag ×1,5; Maul armorPen 0,30→0,40.
10. **#8 (content-dev):** 4 neue Mobs (Tabelle) inkl. `hollow_choir` ward 220.
11. **#P4 (content-dev, optional):** Melee-Ward-Break-Rune, nach #2a.

Nach 5–10 erneut `sim.test.ts` laufen + Sweep gegenprüfen (kontrolleur): geared bleibt ≈0 Tode,
undergeared-Härte akzeptiert, keine neue „echte Wall".
