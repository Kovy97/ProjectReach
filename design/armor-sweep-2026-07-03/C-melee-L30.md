# Phase-C Combat-Tester — STIL=MELEE, BAND=L30

Stand 2026-07-03 · Tester: kontrolleur · **READ-ONLY** (Wegwerf-Harness `_tmp_cM30_*` gelaufen & gelöscht, kein Spiel-Code geändert)
Spec: `design/armor-trinity-spec.md` · Vorlauf: `GATE-B.md` (TRIM), `TRIAGE.md`
Methodik: echte Engine (`createGame`→`equipItem`→`startCombat`→`advance`/`combatStep`), 100 % Kampf, alle Zeiten = **SPIELZEIT**, seeded RNG.

## Setup
- Held: Melee, Skills `attack=power=defence=vitality=30` → **combatLevel 30**, `attack`-Stance (Default), Food/Auto-Eat Tier 0 (Schwelle 50 %).
- On-tier-Gear (defence/attack-30, „Blacksteel"): 5 Platten-Teile + `blacksteel_kiteshield` (block 24 %) bzw. 2H `blacksteel_greatsword`/`blacksteel_maul` (Waffen-armorRating 6.45).
- On-tier-Mobs: `goblin_warlock` L30 (dmg13/3.2 s/**burn**), `ash_rat` L30 (dmg12/2.6 s, schnell), `goblin_stormcaller` L28 (dmg12/3.0 s/shock).
- „2 drüber": `mire_crawler` L38, `pitch_beetle` L42, `ash_tyrant` L45.

---

## VERDIKT: **fix-then-ship** (System spürbar & sound; EIN Balance-Hebel P2, sonst grün)
Die vier Constraints (Rüstung bedeutsam / unarmored = Suizid / Food nötig / 1H-vs-2H EHP-fair) sind am L30-Band **erfüllt**. Der einzige echte Befund: **2H schlägt 1H+Schild im Normalspiel klar** (+22 % kills/h bei gleicher Sicherheit) — der beabsichtigte Sword-&-Board-Defensiv-Tradeoff wird on-tier nicht sichtbar. Kein Absturz, kein Wall, kein Blocker.

---

## Stat-Readout (computeStats, L30, attack-Stance)

| Build | maxHp | armorR | Mit% | Block% | Dodge% | maxWard | Ø-Hit(out) | Intervall | analyt. EHP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1H+Schild (sword+kite+plate) | 73.7 | 9.24 | 42.5 | 24 | 0 | **3.0** | 13.8 | 2720 | **156** |
| 1H+Schild DEFENSIV-Stance | 73.7 | 9.24 | 45.9 | 24 | 0 | 3.0 | 13.8 | 2720 | 166 |
| 2H (greatsword+plate) | 63.7 | 13.38 | **51.7** | 0 | 0 | 3.0 | 20.6 | 3200 | **132** |
| 2H (maul+plate) | 65.7 | 13.38 | 51.7 | 0 | 0 | 3.0 | 21.1 | 3280 | 136 |
| UNARMORED (nur sword) | 33.7 | 0 | 0 | 0 | 0 | 3.0 | 9.3 | 2720 | **34** |
| UNARMORED (nur greatsword) | 33.7 | 6.45 | 34.0 | 0 | 0 | 3.0 | 16.1 | 3200 | 51 |

EHP = `maxHp / [(1−Mit)(1−Block·0.75)]`. **2H liegt bei 132–136 vs 1H+Schild 156 → −14 … −15 %** (deckt Spec §4.4/§5 „2H −10 %" + GATE-B „R30 2H −14 %").
Gross-DPS-in durch die Rüstung (Dauerbeschuss, inkl. DoT, ohne Lifesteal): 1H+Schild **~1.5/s**, 2H **~1.5/s**, unarmored-sword **~3.0/s**, unarmored-greatsword ~2.0/s.

---

## (1) Ist Rüstung bedeutsam? — **JA, klar spürbar (~4× Survivability)**
Zwei kombinierte Effekte: die Platten-`con`-Mods **verdoppeln HP** (73.7 vs 33.7) UND Mitigation **halbiert den DPS-in** (1.5 vs 3.0/s).
Zeit bis zum ersten Tod (no-food, on-tier):

| vs Mob | unarmored (sword) | 1H+Schild | 2H | Faktor |
|---|---:|---:|---:|---:|
| goblin_warlock | **16 s / 0 Kills** | 150 s / 7 | 164 s / 9 | ~10× |
| ash_rat | **13 s / 0** | 90 s / 6 | 129 s / 10 | ~7–10× |
| goblin_stormcaller | **22 s / 1** | ∞ (überlebt, 53 % HP) | 85 s / 6 | — |

→ Rüstung ist die Grenze zwischen „stirbt in 3 Schlägen" und „farmt minutenlang". Bedeutsam ✅.

## (2) Unarmored = Suizid? — **JA**
Ungepanzert stirbt der L30-Held gegen den on-level-Gegner in **13–22 s (≈ 2–4 Treffer), 0–1 Kills** — idle-untauglich, deckt Spec §7.1 („~9 s/3 Treffer"). Etwas härter als die Spec-Zahl (weil goblin_warlock/ash_rat schneller/burniger sind als das Spec-Modell), aber richtige Größenordnung. ✅
Nuance: **„unarmored 2H" (nur greatsword) stirbt langsamer (27–46 s / 1–2 Kills)** — die Waffen-armorRating 6.45 gibt selbst ohne Rüstung 34 % Mitigation. Kein Bug (Spec-Formel, s. P4), aber „nackt mit 2H" ist bewusst weniger suizidal als „nackt mit 1H".

## (3) Food nötig / nicht trivial? — **JA, gut austariert**
- **No-food, gepanzert:** der Held blutet über 90–164 s aus (goblin_warlock 150 s, ash_rat 90 s) — Melee-Lifesteal (Cap 1.2 HP/Treffer ≈ 0.4/s) + kein Naturregen decken den Chip **nicht**. Food ist strukturell PFLICHT.
  - Einzige Ausnahme: die WEICHSTE on-tier-Zelle (`goblin_stormcaller`, dmg12/shock) hält 1H+Schild no-food gerade eben (53 % HP) — „Farm-Zonen"-Rand, Spec §7.2.
- **Mit on-tier-Food (cooked_cod h4 / cooked_salmon h6), 30 min:** **0 Tode**, HP pendelt sich stabil bei **~48–64 %** ein (Auto-Eat-Schwelle 50 %). Food deckt den Drain, **überheilt aber nicht auf voll** → dauerhafter, spürbarer Druck, nicht trivial. ✅
- Food-Wahl zählt sinnvoll: `cooked_cod` (h4) funktioniert, verbraucht aber mehr Einheiten (274 vs 183 salmon je 30 min gegen goblin_warlock) — Preis/Menge-Tradeoff, keine Bestrafung.

## (4) 1H+Schild vs 2H — EHP-fair? welcher besser? — **EHP-fair auf dem Papier, aber 2H im Spiel besser**
- **EHP-fair:** 1H+Schild 156 vs 2H 132–136 (−14 … −15 %) — im Spec-Zielband (§4.4/§5). ✅
- **Im Spielgefühl gewinnt 2H klar** (kills/h, salmon, 30 min, 0 Tode je Build):

  | Build | goblin_warlock | ash_rat | stormcaller |
  |---|---:|---:|---:|
  | 1H+Schild | 182 | 260 | 256 |
  | 1H+Schild DEFENSIV | 182 (endHp 56 %) | — | — |
  | **2H greatsword** | **222** | **310** | **264** |
  | 2H maul | 224 | — | — |

  → **2H +22 % Durchsatz** (222 vs 182) bei **gleicher Sicherheit** (beide 0 Tode, endHp ~50–57 %). Sogar no-food überlebt 2H vs goblin_warlock **länger** (164 s vs 150 s), weil schnellere Kills die Expositionszeit senken UND 2H pro Treffer **mehr** mitigiert (51.7 % vs 42.5 %).
  → Der 1H+Schild-Defensiv-Vorteil zeigt sich NUR in einer Ecke: no-food + weichster Mob (`goblin_stormcaller`) → 1H überlebt, 2H stirbt (85 s). Im Normalspiel (mit Food) ist er unsichtbar.

## (5) L30-Band + 2 drüber — **sanfte, gewollte Abbremsung, kein harter Wall**
Mit salmon, 30 min, 0 Tode überall:

| vs Mob | 1H+Schild kills/h | 2H kills/h | endHp% |
|---|---:|---:|---:|
| on-tier (goblin_warlock L30) | 182 | 222 | ~50 |
| mire_crawler L38 (+8) | 206 | 242 | ~55 |
| pitch_beetle L42 (+12) | 158 | 184 | ~55 |
| ash_tyrant L45 (+15) | **86** | **102** | ~57–62 |

→ Der L30-Held kann bis L45 (Mob-HP 136) **ohne Tod** farmen, aber der Durchsatz halbiert sich (86–102 vs ~180–220) — Progressions-Druck „gear dich hoch", kein Cliff (deckt „Undergeared-Walls = gewollt"). **Ohne Food** kippt es hart: gegen 2 drüber stirbt der Held in 40–162 s (ash_tyrant L45: 1H 40 s/0 Kills). Food ist beim Über-Level-Farmen doppelt zwingend.

---

## Befunde (P1–P4)

**P1 — keine.** Kein Absturz, kein Wall, kein Sequenz-Bruch. Trinität ist am L30-Band funktional korrekt verdrahtet.

**P2 — 2H dominiert 1H+Schild im Normalspiel (Archetyp-Differenzierung fehlt on-tier).**
Zahlen: 2H **+22 % kills/h** (222 vs 182) bei 0 Toden beider Builds; 2H überlebt no-food sogar länger (164 s vs 150 s). Ursache: der 2H-Waffen-armorRating-Bonus (6.45) hebt 2H auf **51.7 % flache Mitigation**, während 1H+Schild nur 42.5 % Mit + 24 % Block trägt — und **Block senkt den Ø-Schaden nur um 24 %·0.75 = 18 %**, ein schwächerer Hebel als der Mitigations-Sprung. Zusammen mit der kürzeren 2H-Kampfzeit (weniger Exposition) macht das die −14 % Steh-EHP im Spiel unsichtbar. Der „defensive Sword-&-Board"-Identität fehlt on-tier jede Belohnung.
*Owner:* **balance-designer** (Spec §5: Block-Wumms rauf ODER 2H-Waffen-AR-Bonus runter, damit 1H+Schild seine EHP-Prämie im Feld auszahlt) → dann **content-dev**. Kein combat.ts-Fix nötig.

**P3 — maxWard = 3 auf reinem Melee-Held (WARD_CORE_PER_INT-Leak).**
Bestätigt am L30-Band: der Melee-Held hat `int=3` → `maxWard=3` → die UI-Ward-Leiste (gatet auf `maxWard>0`) erscheint auf einem Nicht-Stoff-Build, plus ~3 HP Gratis-Absorb pro Kampf. **Bereits bekannt** (GATE-B Hebel 2 / TRIAGE „Ward-Sockel aus INT"). *Owner:* logic-dev (`WARD_CORE_PER_INT` 1.0→0). Kein Neu-Befund, nur Re-Bestätigung.

**P3 — Klassen-Schichten stapeln stil-übergreifend (Guard-Prüfung).**
`computeStats` summiert `evasionRating`/`wardCapacity` aus ALLEN Slots bedingungslos, und der 2H-Waffen-`armorRating` gilt bedingungslos für Melee — d. h. ein Melee-2H-Held könnte off-class-Leder (Dodge) ODER Stoff (Ward) in nicht-konkurrierenden Slots tragen und Waffen-Mitigation + Dodge/Ward gleichzeitig ziehen (kein Slot-Rüstungsklassen-Lock). Vermutlich kein strikt-dominanter Build (kostet die große Platten-`con`-HP), aber die Spec (§1/§2.1) will die drei Identitäten getrennt. *Owner:* logic-dev/kontrolleur — gegen `itemization-guards`/`wiring-audit` prüfen, ob Mischen gewollt ist. Spekulativ, nicht quantifiziert.

**P4 — Notiz: 2H-Waffen-armorRating mitigiert auch ohne jede Rüstung.**
„Nackt + greatsword" = 34 % Mitigation, TTD 27–46 s statt 13–22 s (nackt + sword). Folgt exakt der Spec-Formel (`twoHandMeleeArmorBonus` unbedingt für Melee-2H) → **kein Bug**, nur ein Feel-Hinweis: „unarmored" ist für 2H nie ganz ungepanzert.

---

## Gate-Hinweis-Verifikation (Auftrag)
„L30-Leder +18 % über Parität, 2H-Melee −14 % (by-design) — im Spielgefühl auffällig?"
- **2H −14 % EHP: im Spielgefühl NICHT auffällig** — vollständig maskiert durch +22 % Durchsatz + höhere Pro-Treffer-Mitigation; die −14 % sind eine reine Papierzahl (führt zu P2: der Tradeoff geht zu Gunsten 2H aus statt neutral).
- **Leder +18 %:** außerhalb meines Stils (Melee); Referenz-Wert steht in GATE-B (R30 Leder EHP 186, +18 %). Aus Melee-Sicht relevant nur als Kontext für P2 — falls Leder ZUSÄTZLICH +18 % über 1H+Schild liegt UND 2H 1H+Schild schlägt, ist die Melee-Defensiv-Schiene (1H+Schild) die schwächste der drei. Empfehlung an die Range-/Mage-Tester + balance-designer, das gemeinsam zu betrachten.

## Empfehlung
**fix-then-ship:** Phase C weiterlaufen lassen (System ist spürbar & korrekt). Ein Balance-Ticket **P2 an balance-designer** (Block-Hebel/2H-AR-Bonus nachjustieren, damit 1H+Schild seine Steh-EHP-Prämie im Feld auszahlt und nicht strikt von 2H geschlagen wird). P3-Ward-Leak wie in GATE-B eingeplant. Kein Eingriff in combat.ts/character.ts durch diesen Befund nötig.
