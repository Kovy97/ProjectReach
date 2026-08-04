# Phase-C2 Combat-Tester (Iteration 2) — RANGED / Band L10

Stand 2026-07-03 · Headless (echte `computeStats`/`combatStep`, seeded RNG, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_c2R10_sweep.test.ts` gelaufen & gelöscht.
Loadout: on-tier **iron_shortbow + iron_arrow** (ranged 10) + **cured-leather-Set** (Kappe/Wams/Beine/Armschützer/Stiefel) + cooked_chicken (Heal 3). Build: ranged 10 / vitality 10 / defence 10 → **combatLevel 10**. Auto-Eat Tier 0 (isst < 50 % HP, 3 s CD).

## VERDIKT: **fix-then-ship**
Alle vier Iteration-2-Hebel für den Ranged/Leder-Stil sind **korrekt gewired und wirken zahlengenau**. Die zwei It1-Ranged-Blocker sind behoben: Leder ist jetzt **`ranged`-gegatet** (It1-#2 ✅) und die **Dodge-Varianz ist spürbar entschärft** (worst-case no-food-TTD 12 s → 26 s; It1-#1 ✅). Der einzige verbleibende Ranged-Punkt ist der **bekannte Trim** (Leder-`evasionRating` untertiert → dodge 37 % statt 42 %) — reiner Content-Zahlen-Fix, kein Engine-Bug. Broader R10-Parität (Platte über-, Stoff untertiert) bleibt offen (Melee/Mage-Slices).

---

## It1 → It2 auf einen Blick (die 4 Auftrags-Fragen)

| # | Frage | It1 (armor-sweep) | **It2 (jetzt)** | Status |
|---|---|---|---|---|
| 1 | Dodge-Varianz entschärft? | no-food-TTD **min 12 s** / med 58 / max 111, dodge 34.4 %, „Unglückstreffer voll" | no-food-TTD **min 26.2 s** / med 57.4 / max 99.6, dodge **37 %**, Floor −12 %/Treffer | ✅ entschärft |
| 2 | Leder `ranged`-gegatet? | ALLE Teile `leatherworking`-gated (0 ranged) | ALLE 5 cured-Teile `{ranged:5}`, 0 leatherworking | ✅ behoben |
| 3 | unarmored = Suizid? | ~19 s, 0–1 Kills | **14.6 s** vs goblin (0.4 K), 20 s vs boar | ✅ Suizid |
| 4 | Food nötig & nicht trivial? | 41 K/0 T, ~55–58 % HP, no-food 69 s | **41.8 K/0.1 T**, ~55 % HP, no-food 55 s | ✅ spec-konform |

---

## Kern-Zahlen (computeStats, on-tier, CL10)

| Stil | maxHp | con | Layer | armorR / mit | paperEHP (§7.3-Modell) | vs Ø |
|---|---:|---:|---|---|---:|---:|
| **Leder/Ranged (mein Slice)** | **35.7** | 14 | **dodge 37.0 %**, 0 mit, 0 block, oneShotCap 17.9 | 0 / 0 % | **64.4** | −7 % |
| Platte/Melee 1H+Schild | 45.7 | 19 | mit 32.6 % + block 24.8 % | 60.5 / 32.6 % | 85.9 | +24 % |
| Stoff/Magier | 33.7 | 13 | maxWard 24.3 | 0 / 0 % | 58.0 | −16 % |
| unarmored-Ranged | 17.7 | 5 | 0 aller Layer, oneShotCap 8.9 | 0 / 0 % | 17.7 | — |

- Leder-Bogen: attackDmg 3.9 [Spanne], interval **2421 ms**, crit 9.4 %, One-Shot-Cap **17.9** (= 0.5·35.7).
- **maxHp 35.7 ist ON-Spec** (§1.1-Ziel ~36): kommt aus `cured_set`-Bonus `con 3` (§1.1 con 1→3, verifiziert) → con 14. Die Leder-Unterparität ist **rein die Dodge-Achse**, nicht CON.
- 3-Stil-paperEHP-Spread **48 %** (max/min), max-Abw **±23.7 %** vom Ø 69.4 — **verbessert** von It1 (142 %), aber **> Spec-Ziel ±10 %**. Treiber: Platte-maxHp über (45.7 vs §1.1-Ziel 42, con 19), Stoff-maxWard unter (24.3 vs §11.5-Ziel 45), Leder-dodge unter (37 vs 42).

---

## Die 4 Fragen — mit Zahlen

### (1) Dodge-Varianz jetzt entschärft? — **JA (P4)**

**Mechanik verifiziert:** diminishing Evasion `dodge = Σevr/(Σevr+45)` (K_DODGE 45, character.ts:354) + `LEATHER_HIT_FLOOR 0.12` als STEP 4 der Resolve-Order (combat.ts:1661, `if dodgeChance>0 dmg *= 1−0.12`). Reihenfolge exakt Spec §5.2: Dodge → Contest → Mitigation → **Leder-Floor** → Block → One-Shot-Cap → Ward → HP.

**Netto-Varianz vs goblin L15 (dmg 7), no-food, 40 Seeds:**

| Build | maxHp | dodge | mean TTD | min | med | max | sd |
|---|---:|---:|---:|---:|---:|---:|---:|
| unarmored | 17.7 | 0 % | 14.6 s | 9 | 12 | 28.6 | 6.4 |
| Leder ohne Dodge (evR=0) | 35.7 | 0 % | 29.7 s (**×2.0 HP**) | 20.2 | 26.7 | 43.3 | 6.8 |
| **Leder + Dodge** | 35.7 | 37.0 % | **55.1 s** (**×1.9 Dodge**) | **26.2** | 57.4 | 99.6 | 16.1 |

- **Worst-case (min-TTD) 12 s → 26.2 s** (It1→It2): der „zwei-frühe-Treffer-Tod"-Boden mehr als verdoppelt. sd/mean 29 %.
- Gesamt Leder-Set vs unarmored **×3.8 Überleben** (It1: ×2.9), getrieben von dodge 34.4→37 % + Floor.
- **Floor isoliert** (echter 35.7-HP-Build, dodge≈0, 10-s-Fenster, 40 Seeds): worst-case Min-HP-Boden **24.4 % → 38.4 % (+14 pp)**, Ø +7.6 pp. Der Floor dämpft den tiefsten Einbruch genau am HP-armen Low-Band.
- **Per-Treffer-Floor bestätigt:** goblin rawMax ≈ 10 → gefloored ≈ 9; gemessener max gelandeter Treffer = 8 (< ungefloorte 10). Deterministisch, greift bei jedem Leder-Träger (`dodgeChance>0`).

**Fazit:** Leder fühlt sich robustER an — die It1-„Papier-EHP invertiert, squishigster Stil"-Sorge ist entschärft, ohne Leders Vermeidungs-Identität zu Mitigation umzubauen (Floor 12 % ist klein). Swingy bleibt es (sd 16 s), aber fair.

### (2) Leder jetzt `ranged`-gegatet? — **JA, behoben (P4)**

Alle 5 cured-Teile tragen `requirements: { ranged: 5 }`, **null** `leatherworking`-Gate. Verifiziert via `meetsRequirements` mit einem reinen Kampf-Schützen (ranged 10, leatherworking nie getrained): **alle 5 Teile ausrüstbar = true**. Die It1-Progressions-Falle (Schütze levelt `ranged`, kann Dodge-Schicht aber nicht anlegen) ist **weg**. Symmetrisch zu Melee(`defence`)/Magier(`magic`). Req-Mapping wie Spec §8 (2→5).

*Bonus (It1-P3 mitbehoben):* gelootetes `leather_helm`/`leather_body` trägt jetzt evasionRating (4.29 / 6.43, §8-Kommentar) statt 0 — gelootetes Leder ist nicht mehr auf der Avoidance-Achse ungepanzert.

### (3) Unarmored = Suizid? — **JA (P4)**

No-food, on-level, 40 Seeds: unarmored (maxHp 17.7) stirbt vs **goblin in 14.6 s** (min 9, 0.4 Kills), vs **boar in 20.1 s** (0.5 Kills). Kein Idle-Sustain, keine Farm. Der 2H-naked-Suizid-Fix (§4) betrifft Melee (nicht diesen Slice) und ist in den Guard-Tests re-gepinnt.

### (4) Food nötig & nicht trivial? — **JA, spec-konform (P4)**

| Szenario vs goblin L15, 600 s | Ergebnis |
|---|---|
| Leder **no-food** | Tod nach **55.1 s**, ~2.9 Kills |
| Leder **+ cooked_chicken** (Heal 3, Tier 0) | **41.8 Kills / 0.1 Tode**, Ende-HP ~55 % |

Food **PFLICHT** (no-food-TTD 55 s ≪ 600 s), **sufficient** on-level (0.1 Tode ≈ 0), **nicht trivial**: Heal 3 < ein goblin-Treffer (5–9), 3 s-CD → Held pendelt bei ~55 % HP (Netto ≈ 0). Deckt sich 1:1 mit It1 (41 K/0 T, ~55–58 %) und Spec §6.3 (Ranged = Referenz, kein Sustain).

*Über-Level-Gefälle (Leder+food, 600 s):* boar (on-lvl) **31 K/0 T**; goblin (+0) **41.8 K/0 T**; goblin_shaman (L18 +3) **28.9 K/1.4 T** [max 3]; goblin_rogue (L19 +4, schnell 2600 ms) **35.3 K/2.4 T** [max 4]. On-level = 0 Tode (solides Idle-Farmen); +3/+4 = spielbar mit Progressions-Druck, kein Cliff — der schnellere rogue tötet öfter als der härtere shaman (identisch zu It1).

---

## Bug-Checks / Wiring (Iteration-2-Felder im Ranged-Pfad)

Alle neuen/geänderten Felder sind **gewired UND gelesen** (kein „defined-but-never-read"):
- `evasionRating` → `computeStats` dodge (`Σ/(Σ+45)`), character.ts:354 → dodge 37 % gemessen ✅
- `LEATHER_HIT_FLOOR` → combat.ts:1661 STEP 4 → per-Treffer −12 % gemessen ✅
- `dodgeChance` → combat.ts:1619 STEP 1 (Voll-Vermeidung) → ×1.9-Beitrag gemessen ✅
- `cured_set.modifiers.con 3` → Set-Bonus gelesen → con 14, maxHp 35.7 on-target ✅
- Leder-`{ranged:5}`-Gating → `meetsRequirements` → pure-ranged equipbar ✅
- **×10-Invarianz (Gegner):** goblin defense 1→**10**, void_titan 17→**170** (Backup-Diff) mit K 12.5→125 → Mitigation bit-identisch (10/(10+125)=7.4 %). Player-Killspeed unverändert-korrekt ✅

**Keine Bugs im Ranged/Leder-Engine-Pfad.**

---

## Findings (Severity · Owner)

**P1 — Leder Band-10 `evasionRating` untertiert (dodge 37 % statt 42 %) — BEKANNTER TRIM.** `content-dev`.
cured-Set Σ evasionRating = **26.4** (cap 5.28 / body 7.92 / legs 5.81 / gloves 3.7 / boots 3.7) → dodge `26.4/(26.4+45)` = **37.0 %**. Spec §11.4-Ziel Band-10 = **42 %** (Σ **32.6**: cap 6.5 / body 9.8 / legs 7.2 / gloves 4.6 / boots 4.6). Unter −5 pp / −19 % rel. maxHp ist ON-target (35.7 ≈ 36), also **rein die Avoidance-Achse**. Fix: cured-`evasionRating` auf die §11.4-Werte heben. (Bekannt/erwartet lt. Auftrag; blockiert die R10-Parität mit.)

**P2 — R10 3-Stil-EHP-Spread 48 % > Spec-Ziel ±10 % (Re-Gate-Kriterium #1) — KNOWN/breiter.** `content-dev`.
paperEHP Leder 64.4 / Platte 85.9 / Stoff 58 (Ø 69.4, max-Abw ±23.7 %). Treiber jenseits meines Slice: **Platte-maxHp über** (45.7 vs §1.1-Ziel 42; iron-Set con 2→1 angewandt, aber Teile-con noch hoch → con 19) und **Stoff-maxWard unter** (24.3 vs §11.5-Ziel 45). Verbessert von It1 (142 %), aber Kriterium #1 („±10 % ALLE Bänder") ist an **R10 noch NICHT erfüllt**. Gehört in die Melee-L10- + Mage-L10-Slices; hier als Cross-Style-Kontext geflaggt.

**P3 — (verifiziert, kein Handlungsbedarf) It1-P3 gelootetes Leder ohne Dodge — BEHOBEN.** `content-dev`.
`leather_helm`/`leather_body` tragen jetzt evasionRating 4.29 / 6.43 (§8). Nur zur Bestätigung gelistet.

**P4 — Engine sound.** Dodge (×1.9, exakt), Floor (−12 %/Treffer, +14 pp Worst-Case-Boden), One-Shot-Cap (bindet, ≤ 0.5·maxHp), Food-Loop (Pflicht & knapp) und Über-Level-Gefälle stimmen zahlengenau mit der Spec. Kein combat.ts/character.ts-Fix nötig.

---

### Einordnung
Der Ranged/Leder-Stil ist nach Iteration 2 **engine-sauber und deutlich runder** als in It1: die zwei It1-Blocker (leatherworking-Gate, invertierte Dodge-Varianz) sind **behoben**, Dodge/Floor/Food/One-Shot-Cap wirken zahlengenau. Der einzige Ranged-Rest ist der **bekannte `evasionRating`-Trim** (37 statt 42 %) — ein Content-Zahlen-Fix (§11.4), kein Engine-Thema. Empfehlung: **fix-then-ship** — P1 mit der R10-CON/Ward-Nachjustierung (Melee/Mage-Slices, P2) in EINER Content-Welle bündeln, dann R10-Parität re-messen.
