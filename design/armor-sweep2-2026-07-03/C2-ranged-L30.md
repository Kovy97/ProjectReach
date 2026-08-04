# Phase C2 Combat-Tester (Iteration 2) · STIL=RANGED · BAND=L30 · 100% Kampf, SPIELZEIT

Stand 2026-07-03 · Kontrolleur · **READ-ONLY** (Wegwerf-Harness `_tmp_c2R30_sweep.test.ts` ausgeführt & gelöscht; KEIN Spiel-Code geändert).
Grundlage: `design/armor-iteration2-spec.md` · It1-Vergleich: `design/armor-sweep-2026-07-03/C-ranged-L30.md`.
Methodik: echte Engine (`createGame → equip → startCombat → combatStep`, `computeStats`), TICK_MS=100, seeded RNG,
Zeiten = **SPIELZEIT**. combatLevel 30 (7 Kampf-Skills L30, Default-Basisattribute, `wie sim.ts`).

## VERDIKT: **fix-then-ship (Balance)** — It1-KERNBEFUND weitgehend behoben; kein Code-Bug, kein Blocker
Die vier It2-Ranged-Fragen sind **grün**: (1) die Leder-„+18 %-EHP-invertiert"-Falle ist entschärft (diminishing-Evasion
+ Floor + INT-Ward-Leak weg → Leder trägt nicht mehr die höchste Papier-EHP UND ist real ~auf Platten-Niveau statt
1.3–3.5× squishiger), (2) Leder ist `ranged`-gegatet, (3) nackt = Suizid, (4) Food für Ranged mandatory & nicht-trivial.
**Neuer Befund (P2):** das Parität-Problem hat sich VERSCHOBEN — Stoff/Magie ist bei L30 jetzt der Ausreißer (höchste
Papier-EHP, no-Food ~unsterblich vs Nicht-DoT, top Farm-Durchsatz); der 20 %-Kill-Refill erzeugt am L30-Band **keinen**
Food-Druck. Alle Trinity-Guards grün (55/55).

---

## (A) Stat-Readout (computeStats, CL30 on-tier) — It1 → It2

| Stil (Loadout) | maxHp | dodge % | mit % | block % | maxWard | wardReg/s | acc | aIMs | dmg | It1-Wert (Ranged) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Ranged / Scaled-Leder** | 65.7 | **53.5** | 0 | 0 | **0** | 0.60 | 25.8 | 2133 | 9.0–10.2 | It1: 71.7 / **59.2** / 0 / 0 / **6\*** |
| Ranged **nackt** (nur Bogen) | 33.7 | 0 | 0 | 0 | 0 | 0.60 | 24.1 | 2205 | 8.4–9.6 | It1: 39.7 / … / **6\*** |
| Melee / Blacksteel-Platte+Schild | 73.7 | 0 | **37.8** | **30.4** | 0 | 0.60 | 24.1 | 2600 | 12.8–14.8 | It1: 79.7 / 0 / **42.5** / **24** |
| Magic / Ember-Stoff | 55.7 | 0 | 0 | 0 | **103.0** | 0.60 | 22.2 | 2600 | 12.9–14.3 | It1: 53.7 / 0 / 0 / **67.5** |

**Wichtige It2-Applies sichtbar & korrekt:**
- **INT-Ward-Leak GEFIXT** (It1-P3): Ranged/Melee `maxWard` **6 → 0** (`WARD_CORE_PER_INT = 0`). Kein Gratis-Absorb
  mehr am Schützen. ✓
- **Leder-Dodge diminishing recal:** 59.2 % (linear Σ/100, Σ=59.2) → **53.5 %** (`Σ/(Σ+45)`, Σ=51.8). Σ evasionRating
  neu getunt (§11.4-Ziel R28 ≈ 51.8 → **exakt getroffen**). Kurvenform = wie Mitigation. ✓
- **Platte-Mid runter + Block rauf:** mit **42.5 → 37.8 %**, block **24 → 30.4 %** (§3/§11 — 1H+Schild als echte
  Defensivlinie). ✓
- **Stoff-Leiter-Lücke gefüllt:** on-tier ist jetzt das **Ember-Set (magic 30)** statt frost req22 → maxWard
  **67.5 → 103.0** (INT-Kern eingefaltet, §11.5 R30-Ziel ≈ 103 → getroffen). ✓

> Harness-Kalibrier-Hinweis: meine maxHp liegen ~6 unter It1 (naked 33.7 vs 39.7), dex 12 vs It1 ~16 (aIMs 2133 vs
> 1989). Der Offset ist **konstant über alle Stile** (gleiche Default-Basis) → das **It1↔It2 vergleiche ich über
> Verhältnisse/Ordnung, nicht absolute TTK**. Die Cross-Stil-Vergleiche INNERHALB It2 sind exakt (identische Basis).

---

## (1) Leders „+18 % Papier-EHP invertiert" — BEHOBEN? → **JA, weitgehend** (Inversion aufgelöst; Rest-Squish mild)

### Einzel-Leben-Überlebenszeit, KEIN Food (s Spielzeit, avg ; minHp%-Ø), 8 Seeds:

| Gegner | Leder | Platte | Magie | **Leder/Platte** | *It1 Leder/Platte* |
|---|---:|---:|---:|---:|---:|
| goblin_warlock L30 (burn) | 86.9 (11.9 %) | 89.0 (5.3 %) | 892.9 (6/8 Cap) | **0.98×** | *0.77× (134/174)* |
| goblin_stormcaller L28 (shock) | 109.7 (8.9 %) | 131.0 (5.3 %) | 900 (Cap) | **0.84×** | *0.34× (234/684)* |
| ash_rat L30 (schnell) | 90.4 (9.6 %) | 152.2 (4.4 %) | 900 (Cap) | **0.59×** | *0.29× (214/743)* |

- **Die It1-Inversion ist aufgelöst.** In It1 trug Leder die HÖCHSTE Papier-EHP (175.7, „+18 %") UND war real der
  **squishigste** Stil (1.3–3.5× kürzere TTK als Platte). In It2:
  - Leder trägt **nicht mehr** die höchste Papier-EHP (Dodge 59→53.5 %, INT-Ward-Leak weg → Modell-EHP-Rang gefallen).
  - Real ist Leder **auf Platten-Niveau** vs dem burn-Warlock (0.98×) und **0.59–0.84×** vs schnell/stetig — ein
    **massiver Sprung** von It1s 0.29–0.77×. Der „Leder = squishigster Stil, obwohl bestes Papier"-Widerspruch ist weg.
- **LEATHER_HIT_FLOOR (−12 %) wirkt** (guard `armor-iteration2-combat` grün + empirisch): der landende Treffer wird
  gedämpft, One-Shot-Cap = 32.9 auf 65.7 HP (50 %). Leder-`minHp%-Ø` ~9–12 % (dippt weiter grenzwertig, aber der
  „ein Unglückstreffer = halbe Leiste"-Effekt ist abgemildert; kein 2-Treffer-Burst-Tod mehr in den Läufen).
- **Rest-Squish (mild):** vs dem schnellen ash_rat lebt Platte noch **1.68×** länger (Leder 0.59×). Leder bleibt der
  squishigste Panzer-Stil, aber **kein dramatischer Ausreißer** mehr — im Rahmen der Glass-Cannon-Identität vertretbar.
- **Fazit (1):** Fix greift. Diminishing + Floor + Ward-Leak-Weg lösen den Kern-Widerspruch. Kein Grund für DODGE_CAP
  0.65 am L30-Band (die Varianz ist gedämpft). **Owner der Rest-Justage (optional): balance-designer** — nur falls
  Leder vs schnelle Mobs exakt an Platte soll (aktuell bewusst −41 % = Glass-Cannon).

---

## (2) Leder `ranged`-gegatet? → **JA** (Fix #8 appliziert)

- Scaled-Leder = `requirements { ranged: 28 }` (helm/body/legs/vambraces/boots). Ein **reiner Schütze
  (leatherworking = 0)** legt alle 5 Teile an (`equipItem` ok=true). Gegenprobe `ranged=0` → `equip.ok=false`
  („Skill-Anforderung nicht erfüllt"). ✓
- Die gesamte Leder-Leiter (`cured`/`hardened`/`scaled`/`duskhide`/`studded`/`warhide`/`ironhide`) ist auf `ranged`
  umgegatet — die It1-P2-Asymmetrie (Leder crafting-gegatet, Melee/Magie kampf-gegatet) ist beseitigt. ✓

---

## (3) Unarmored = Suizid? → **JA, eindeutig**

| Gegner (nackt, nur Bogen, kein Food) | Tode | TTK avg |
|---|---:|---:|
| goblin_warlock L30 | **8/8** | 11.6 s |
| goblin_stormcaller L28 | **8/8** | 19.6 s |
| ash_rat L30 | **8/8** | 16.9 s |

Gepanzert (Leder) überlebt **5.4–7.5× länger** (EHP 33.7 → real ~87–110 s). Idle-untauglich ohne Leder. ✓
(§4-Fix „nackter 2H = Suizid" ist melee-scope; hier via nacktem Ranger bestätigt das Grundprinzip greift.)

---

## (4) Food nötig, nicht trivial? → **JA für Ranged** (Magie-Ausnahme s. P2)

Ranged/Leder, 15-min-Fenster, Auto-Eat Tier 0 (50 %-Schwelle), 6 Seeds:

| Gegner | kein Food | cooked_cod (4) | cooked_salmon (6) |
|---|---|---|---|
| goblin_warlock L30 | **Σ 51 Tode** (max 9/Lauf) | Σ 2 Tode, minHp-Boden 2.6 % | **0 Tode**, minHp-Boden 1.9–25 % |
| ash_rat L30 | **Σ 54 Tode** | Σ 2 Tode, minHp 2.6–16 % | **0 Tode**, minHp 13–29 % |

- Kein natürlicher HP-Regen ⇒ ohne Food akkumuliert Chip + ungemilderter burn-DoT → sicherer Tod.
- On-tier-Tier (cod, heal 4) ist **marginal** (2 Tode, minHp bis 2.6 %); salmon (6) deckt komfortabel. **Food mandatory
  UND nicht-trivial** — deckt Spec §6.3 (Ranged = die Referenz). ✓

### Über-Level-Gradient (ranged/leather, 15-min):
| Gegner | kein Food | +salmon |
|---|---|---|
| ashfield_jackal **L32** (+2, NEUER Content-Gap-Mob §9) | Σ 50 Tode | **0 Tode**, 66 kills, minHp 5.6 % |
| dust_vulture **L34** (+4) | Σ 46 Tode | **0 Tode**, 58 kills, minHp 16 % |

Gesunder Gradient; +2/+4 mit on-tier-Food bequem farmbar, ohne Food tödlich. Der **L31–33-Content-Gap ist gefüllt**
(ashfield_jackal L32, kein Slayer-Gate) — TRIAGE #10 erledigt. ✓

---

## Befunde (Severity · Owner)

- **P2 — Parität hat sich VERSCHOBEN: Stoff/Magie ist bei L30 der neue Ausreißer-Tank.** Magie führt jetzt bei ALLEN
  drei Kennzahlen: höchste Papier-EHP (maxHp 55.7 + maxWard **103.0**), no-Food-Einzelleben **~900 s** vs Nicht-DoT
  (minHp-Ø **96 %** — Ward + Cast-Recharge + 0.6/s Warding-Regen + **20 %-Kill-Refill** ≥ eingehend am L30-Band → HP
  wird praktisch nie berührt), UND top Farm-Durchsatz (F: 70.5 kills vs Platte 65.5 vs Leder 63.0). Der `WARD_KILL_REFILL_PCT
  0.20`-Fix (§6.1) erzeugt am **L30-Band gegen Nicht-DoT-Mobs KEINEN** Food-Druck (Verbrauch ≈ Refill). Nur der burn-Warlock
  (DoT umgeht Ward) drückt Magie no-Food auf minHp 9.9 %. → **Gate-Kriterium #5 („Food nötig ALLE Stile") am L30-Band
  für Magie NICHT erfüllt.** Owner: **balance-designer / Magie-Tester (Cross-Check C2-mage-L30)** — nicht ranged-scope,
  aber die Ranged-Referenz macht den Magie-Überhang erst sichtbar.
- **P3 — Leder vs schnelle Mobs bleibt der squishigste Panzer-Stil** (ash_rat: 0.59× Platten-Überlebenszeit, Platte
  1.68× länger). Inversion behoben, aber keine harte Parität. Vertretbar als Glass-Cannon; Owner: **balance-designer**
  (entscheiden, ob 0.59× vs schnell/stetig gewollt ist, oder Leder-con/Floor minimal nachschärfen).
- **P3 — Ember-Stoff ist DUAL-gegatet (`magic 30` + `runecrafting 32`).** Ein reiner Caster (runecrafting 0) kann das
  on-tier-Robe NICHT anlegen — **exakt die Asymmetrie, die #8 für Leder behoben hat**, nur für Stoff offen. Parallel-Fix
  erwägen (`runecrafting`-Req von Stoffrüstung streichen/senken). Owner: **balance-designer / content-dev** (magic-scope).
- **P4 — Ranged ist bei L30 NICHT mehr der Durchsatz-Führer** (F: 63.0 kills = niedrigster der 3; It1: Ranged top mit
  73–75). Ranged-DPS 4.5/s < Platte 5.3/s < Magie 5.2/s+burn. **Vorbehalt:** teils harness-basisabhängig (mein dex 12
  vs It1 ~16 verlangsamt/schwächt den Bogen am stärksten). Innerhalb-It2 ist die Ordnung dennoch valide (gleiche Basis)
  → Ranged-Identität „Glass-Cannon = Top-DPS" (It1-P3) ist am L30-Band **verwässert**. Owner: **balance-designer**
  (Waffen-DPS-/Basis-Kalibrierung), kein Blocker.

## Kein Code-Bug im Ranged-Pfad
- INT-Ward-Leak (It1-P3) **behoben** (`character.ts:358`, `WARD_CORE_PER_INT 0`). Leder-`evasionRating` + diminishing
  (`character.ts:354`), `LEATHER_HIT_FLOOR` (`combat.ts:1661`), `ammoDamage`, Kurz-/Langbogen: alle korrekt verdrahtet
  und angewandt. Keine toten Felder. Trinity-Guards **55/55 grün** (`armor-iteration2-combat`, `armor-trinity-combat`,
  `ward`, `mitigation`, `wiring-audit`, `status-coverage`, `set-bonus`, `content-integrity`, `no-natural-regen`,
  `autoeat-dot`).

## Empfehlung: **fix-then-ship (Balance)**
Ranged-Seite der Iteration 2 ist **erfüllt** — der It1-Kernbefund (Leder-EHP-Inversion) ist behoben, Mechanik sauber.
Der einzige neue Balance-Hebel (P2, Magie-Überhang / Gate #5) und die Nebenpunkte (P3/P4) gehören an balance-designer /
Magie-Tester; **kein Blocker, kein Code-Fix nötig**.
