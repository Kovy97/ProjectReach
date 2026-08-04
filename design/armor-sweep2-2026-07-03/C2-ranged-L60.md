# Phase C2 — RANGED · Band L60 · Kontrolleur-Combat-Tester (Iteration 2)

Stand 2026-07-03 · Headless (computeStats/simulateCombat-Pattern, Zeiten = SPIELZEIT) · Wegwerf-Harness `_tmp_c2R60_*` gelöscht · KEIN Spiel-Code geändert.
Specs: `design/armor-iteration2-spec.md`. It1-Vergleich: `design/armor-sweep-2026-07-03/C-ranged-L60.md`.
Iteration-2-Konstanten im Code VERIFIZIERT vor der Messung (shared: `WARD_CORE_PER_INT=0`, `K_DODGE=45`, `LEATHER_HIT_FLOOR=0.12`, `WARD_KILL_REFILL_PCT=0.20`, `MELEE_LIFESTEAL=0.06`, `BLOCK_DAMAGE_REDUCTION=0.85`, `DEFENSE_MITIGATION_K=125`, `SAVE_VERSION 51`; character.ts: diminishing dodge + `maxWard=ΣwardCapacity` + 2H`·min(1,plateWorn/4)` + `wardRegenPerSec`; combat.ts: Leder-Floor-Step, 20%-Kill-Refill, Warding-XP). 63 Trinität-/Ranged-Guard-Tests grün.

## VERDIKT: **SHIP** (RANGED L60 on-parity, Kopplung #1+#2 sauber gelandet)
Dodge 65.3 % (Spec-Ziel 65 %). INT-Leak ist WEG (maxWard 10→**0**) UND der Leder-`evasionRating`-Bump (Σ 67.16→**84.87**) hat GLEICHZEITIG gegriffen → Ranged-EHP bleibt **on-parity (+0.1 % §7.3-Papier / +27.6 % empirisch-TTD vs 1H+Schild)**, statt wie It1-P3 gewarnt auf ~−6 % zu rutschen. Varianz mit on-tier-Food = 0 Tode (sd 0). Unarmored = klarer Suizid (jetzt HÄRTER als It1). Food für ALLE Stile nötig (Fixliste #6 greift). Kein neuer Engine-Bug.

## Loadout (alle 7 Kampf-Skills = L60, on-tier)
- **Waffe** `runite_shortbow` (ranged 60) + `runite_arrow`; Longbow-Gegenprobe.
- **Rüstung** Ironhide-Leder `ironhide_helm/body/legs/vambraces/boots` (jetzt `ranged`-gegatet 60–62, Fixliste #8). **Σ evasionRating = 84.87** (It1: 67.16). ironhide_set {dex1,con1,lck1}.
- **Food** `cooked_bloodfang_eel` (heal 12); Gegenproben `cooked_salmon` (6) + kein Food.
- **Parität-Refs** 1H+Schild = runite-Platte(fullhelm/platebody/platelegs/gauntlets/sabatons)+`runite_sword`+`runite_kiteshield`; 2H = +`runite_greatsword`; Magie = arcane-Stoff(`magic 55`)+`runite_staff`.
- **Gegner** on-level `bramble_witch` (L60, dmg21, Gift 0.35); L60+2 `rootling_treemonster` (L62, regen0.4, enrage×1.5); Boss `forest_warden` (L65, enrage×1.6).
- **Methodik** Rüstung per direkter Slot-Zuweisung (leatherworking/runecrafting sind keine Kampf-Skills; ironhide_body req ranged 62 > 60 → Injektion isoliert die Rüstungs-Mathematik, identisch zu It1 + `armor-trinity-combat.test.ts`).

## Abgeleitete Stats (RANGED-full L60)
`str10 · dex24 · con40 · int10 · wis10 · lck6` · maxHp **102.7** · **maxWard 0.0** (It1: 10.0 INT-Leak) · Basis-Evasion 8.2 · Accuracy 46.0
**dodgeChance 65.3 %** (Spec R60 = 65 % ✓) · Mitigation 0 % · Block 0 % · dmg 17.6–19.8 · aIMs 1701 · Krit 19.2 % · rawDPS ~12.0
(Longbow: 17.8–20.9, aIMs 1836 — härter/langsamer, Diff via damage/Tempo real.)

Parität-Refs L60: 1H+Schild maxHp122.7/AR104.8/mit45.6%/block38.8% · 2H maxHp106.7/AR218.1/mit63.6% · Stoff maxHp90.7/maxWard216.0.

---

## (P1) Evasion-diminishing + Leder-Floor — Varianz/Robustheit — ✅ Varianz NIEDRIG, Floor greift
20 Seeds × 5 min, `bramble_witch`:
| Food | Kills | Tode µ | sd | max | endHP | minHP |
|---|---:|---:|---:|---:|---:|---:|
| KEINS | 19.6 | 1.50 | 0.81 | 3 | 59.0 % | 7.9 % |
| salmon (6) | 20.1 | 0.05 | 0.22 | 1 | 51.7 % | 26.4 % |
| **eel (12)** | 20.1 | **0.00** | **0.00** | 0 | 55.5 % | **39.7 %** |
- Boss-Stress `forest_warden` (enrage×1.6): KEIN Food µ2.55/sd0.59; **+eel µ0.10, max1** — food-gedeckelt.
- **Floor wirkt:** minHP-Boden mit eel = **39.7 %** (kein „Unglückstreffer = halbe Leiste"). One-Shot-Cap 51 @ maxHp103 ≫ jeder L60-Max-Treffer (~31 roh / ~49 enraged) → kein 2-Treffer-Burst-Tod.
- **It1-Vergleich:** eel 0 Tode/sd0 = **identisch** robust wie It1. Die diminishing-Kurve (65.3 % statt 67.2 %) + Floor halten die Varianz on-tier niedrig; die 12-%-Reduktion pro landendem Treffer ist am L60-Band der von der Spec §5.2 avisierte „am High-Band nebensächliche" Dämpfer (spürbarer am Low-Band). Bei L60 war Leder schon in It1 sauber — hier bestätigt.

## (P2) Stil-Parität L60 + KOPPLUNGS-VERIFIKATION — ✅ Ranged on-parity, Kopplung gelandet
EHP nach Spec §7.3 (Anker = 1H+Schild), aus echtem computeStats:
| Build | maxHp | maxWard | §7.3-EHP | vs 1H+Schild | It1 | §11.6-Modell |
|---|---:|---:|---:|---:|---:|---:|
| 1H+Schild | 122.7 | 0 | 336.6 | 0 % (Anker) | 0 % | 0 % |
| 2H-Melee | 106.7 | 0 | 292.8 | **−13.0 %** | −11 % | −7 % |
| **RANGED (Leder)** | 102.7 | **0** | **336.8** | **+0.1 %** | +3 % | +5 % |
| MAGIC (Stoff) | 90.7 | 216.0 | 306.7 | **−8.9 %** | −20 % | −1 % |
- **Kopplung #1+#2 VERIFIZIERT (die zentrale It1→It2-Frage):** In It1 hob der `WARD_CORE_PER_INT=1.0`-Leak Ranged künstlich von −6 % auf +3 % (maxWard 10 aus int·1). It2 setzt den Leak auf 0 → **maxWard 0** (im Code + Messung bestätigt). ALLEIN hätte das Ranged auf ~−6 % gedrückt. Gleichzeitig wurde Leder-`evasionRating` von Σ67.16 auf **Σ84.87** gehoben (§11.4-Werte im Content, ironhide 16.8/25.84/18.71/11.76/11.76) → dodge 65.3 % → EHP-Kompensation. **Netto: Ranged +0.1 % (on-parity), NICHT unter Ziel.** Die beiden Hebel sind in DERSELBEN Welle appliziert (Spec §2 „MÜSSEN zusammen") — bestätigt.
- **Empirisch tankiger als das Papiermodell:** TTD-Test (Standard-Angreifer dmg20, jeder Tick, Food aus, 30 Seeds) → Ranged **+27.6 %** Überlebens-Ticks vs 1H+Schild (Leder 21.0 vs Platte 16.4 Ticks). Das §7.3-Modell ist für Leder pessimistisch (Dodge-Streak-Varianz ist konvex im Überleben) — die reale Ranged-EHP liegt DEUTLICH über der Papier-Parität. Bestätigt It1-Fußnote §11.6.
- **Survival-Parität** (30 min, eel, bramble_witch): Kills 1H121/2H131/Ranged122/Stoff122 — ±8 %, Ranged Mittelfeld (Offense-Parität ok, wie It1).
- **Magie deutlich verbessert:** −20 % (It1) → **−8.9 %** (It2) — jetzt IM ±10 %-Band. Der §11.5-Ward-Pool-Bump (INT-Kern in Gear eingefaltet, Σ216) hob Stoff-EHP 265→307, TROTZ arcane = `magic 55` (unter L60-Band). Rest-Unterparität = bekannte Content-Leiter-Lücke L58→L72 (Spec §1.2), Owner content-dev — NICHT Ranged.

## (P3) Unarmored = Suizid? — ✅ ja, jetzt HÄRTER als It1
naked = nur Bogen (kein Leder; con18/58 HP durch Kampf-Level), 30 min × 6:
| Szenario | Kills | Tode µ (max) | endHP |
|---|---:|---:|---:|
| naked vs bramble_witch, **KEIN Food** | 72.7 | **78.67** (82) | 34.6 % |
| naked vs bramble_witch, +eel | 96.7 | **12.83** (16) | 55.4 % |
| naked vs rootling L62, +eel | 41.8 | **23.33** (31) | 49.5 % |
| naked vs forest_warden L65, +eel | 16.8 | **44.33** (52) | 41.5 % |
| **armored** ranged vs forest_warden, +eel | 55.2 | **0.83** (2) | 56.2 % |
- Rüstungswert kristallklar: naked+eel vs forest_warden **44.33 Tode**, armored+eel **0.83**.
- **It1-Vergleich:** It1 naked+eel vs bramble = 2 Tode („humpelt"); It2 = **12.83 Tode**. HÄRTER — weil der It1-INT-Leak dem NACKTEN Ranger noch einen 10-Ward-Pool (mit It1-100%-Kill-Reset) gab. It2 nimmt Leak (maxWard 0) UND Voll-Reset (nur 20 % Refill) → nackt hat 0 Absorb → stirbt auch gegen den weichsten on-tier-Mob. **Intendiert** (Spec §2 De-Leak macht „unarmored = suicide" korrekter), KEIN Regress.

## (P4) Food nötig? — ✅ nötig für ALLE Stile (Fixliste #6 greift); Ranged = Referenz
30 min × 10, bramble_witch:
| Stil | KEIN Food Tode µ | +eel Tode µ | It1 foodless |
|---|---:|---:|---:|
| **RANGED** | **11.40** | 0.00 | 7 |
| 1H+Schild | **7.90** | 0.00 | **0** |
| 2H-Melee | **10.10** | 0.00 | 0 |
| Stoff (Magie) | 1.30 | 0.00 | 1 |
- **Food-Asymmetrie-Fix bestätigt:** It1 waren Melee-1H/2H foodless bei **0 Toden** (Lifesteal deckte alles). It2 MELEE_LIFESTEAL 0.08→0.06 → 1H **7.90** / 2H **10.10** foodless-Tode → **Food kehrt für Melee zurück**. Magier foodless nur 1.30 (Ward-Recharge + 20 %-Refill tragen gegen weichen Mob — Spec §6.3 „Farm-Zone-Puffer, gewollt; stark für Burst"). **Kein Stil mehr food-frei.**
- **Ranged bleibt die Referenz** (foodless 11.40 = am food-abhängigsten; die anderen wurden zu IHM hin getrimmt). Ranged-Tode kommen aus dem **Gift-DoT** (endHP foodless 71.4 % höchste — weicht ~65 % aus, HP sinkt langsam, aber Poison-Stacks töten in Pechsträhnen). Mit eel → 0 Tode.
- **L60+2** (`rootling` L62, regen0.4, enrage×1.5): KEIN Food 13.60 Tode → **+eel 0.00**. Over-Level korrekt food-gegated (It1: 11→0; It2 leicht höher wg. entferntem Leak-Puffer).

---

## Bugs / Findings
- **P1 — keine.**
- **P2 — keine.** Trinität sauber verdrahtet: `item.evasionRating`→`eq.evasionRating`→diminishing `dodgeChance` (character.ts:354) → Gegner-Treffer STEP 1 (combat.ts:1619); Leder-Floor STEP 4 (combat.ts:1661); `maxWard=ΣwardCapacity` (character.ts:358, WARD_CORE_PER_INT·int=0); 2H`·min(1,plateWorn/4)` (character.ts:349). 63 Guard-Tests grün (armor-iteration2-combat 8, armor-trinity-combat 8, ward 10, wiring-audit, ranged 9, ranged-vs-magic 5, mitigation, status-coverage, set-bonus, content-integrity 13).
- **P4 (niedrig, Owner content-dev) — Leder-con leicht unter §1.1-Guardrail:** ironhide-Σcon (21 + set1) → maxHp 102.7 = **0.837×** Platte-Anker (§1.1-Ziel 0.86×). Das ist der Grund, warum Ranged bei +0.1 % statt der +5 %-Modell-Aspiration landet. **Passt trotzdem ±10 %-Parität** (und empirisch +27.6 % TTD), aber wer die +5 % treffen will, hebt ironhide-con minimal (+1…+2 Σ). Kosmetisch/optional.
- **P4 (niedrig, Owner content-dev, bekannt) — kein on-band L60-Stoff:** arcane = `magic 55` (Lücke L58→runewoven L72, Spec §1.2). Deshalb Stoff L60 −8.9 % (statt Modell −1 %). Bereits als §1.2-Ladder-Fix (magic-Lücke 58→70) in der Apply-List. NICHT Ranged.

## Empfehlung
**RANGED L60 = ship.** Die zentrale It1→It2-Kopplung (INT-Leak→0 + Leder-`evasionRating`-Bump in DERSELBEN Welle) ist verifiziert gelandet — Ranged bleibt on-parity (+0.1 % Papier / +27.6 % empirisch), NICHT unter Ziel. Evasion-diminishing + Leder-Floor halten die Varianz niedrig (eel 0 Tode/sd0, minHP-Boden 39.7 %). Unarmored = klarer Suizid (härter als It1, intendiert). Food für alle Stile nötig (Melee-Sustain-Trim greift). Einzige Notizen: Leder-con minimal unter dem 0.86-maxHp-Guardrail (optional) + fehlender on-band-L60-Stoff (bekannt, content-dev). Beides low, keine Ranged-Blocker.
