# Phase C — RANGED · Band L60 · Kontrolleur-Combat-Tester

Stand 2026-07-03 · Headless (computeStats/simulateCombat-Pattern, Zeiten = SPIELZEIT) · Wegwerf-Harness `_tmp_cR60_*` gelöscht · KEIN Spiel-Code geändert.
Spec: `design/armor-trinity-spec.md`. Bekannte offene Trims (Gate-B/TRIAGE) NICHT als Neu-Befund gewertet: Leder/Stoff low/mid unter-spec (Hebel 1), `WARD_CORE_PER_INT=1.0`-INT-Leak (Hebel 2).

## VERDIKT: **SHIP** (RANGED L60 on-spec)
Dodge 67.2 % (Spec-Ziel 67 %), EHP-Parität **+3 % vs 1H+Schild** (Ziel +5 %), unarmored = Suizid gegen alles mit Zähnen, Food nötig (Ranged = am food-tolerantesten), L60+2 sauber. Kein neuer Engine-Bug — nur die zwei VORAB bekannten Hebel (Magie-Leiter, INT-Leak) berühren Ranged, beide außerhalb meiner Zell-Fix-Scope.

## Loadout (combatLevel 60, on-tier)
- **Waffe** `runite_shortbow` (ranged 60) + `runite_arrow`; Longbow-Variante gegengeprüft.
- **Rüstung** Ironhide-Leder (leatherworking 60–62): `ironhide_helm/body/legs/vambraces/boots`. Σ evasionRating = 67.16.
- **Food** `cooked_bloodfang_eel` (heal 12, on-tier); Gegenproben `cooked_salmon` (6) + kein Food.
- **Parität-Refs** 1H+Schild = runite-Platte+`runite_sword`+`runite_kiteshield`; 2H = runite-Platte+`runite_greatsword`; Magie = arcane-Stoff (magic_off 55)+`runite_staff`.
- **Gegner** on-level `bramble_witch` (L60, dmg 21, Gift-Inflict 0.35); L60+2 `rootling_treemonster` (L62, regen 0.4, enrage×1.5); Boss-Stress `forest_warden` (L65, acc 14, enrage×1.6).
- **Methodik-Hinweis** Rüstung per direkter Slot-Zuweisung ausgerüstet (leatherworking/runecrafting sind KEINE Kampf-Skills → `equipItem` gatet sie sonst weg) — isoliert die reine Rüstungs-Mathematik, identisch zur Injektion in `armor-trinity-combat.test.ts` + Spec §7.3 „combatLevel = R".

## Abgeleitete Stats (RANGED-full L60)
`dex 24 · con 40 · int 10` · maxHp **102.7** · maxWard **10.0** (INT-Leak) · Basis-Evasion 8.2 · Accuracy 46
**dodgeChance 67.2 %** (Spec R60 = 67 % ✓) · Mitigation 0 % · Block 0 % · dmg 17.6–19.8 (Ø 18.7) · aIMs 1701 · Krit 19 % · rawDPS 11.0
(Longbow: Ø 19.3, aIMs 1836, rawDPS 10.5 — härter/langsamer; Diff via damage/Tempo real.)

---

## (1) Evasion bedeutsam + Varianz-Risiko — ✅ bedeutsam, Varianz NIEDRIG on-tier
- **Bedeutsam:** dodge 67.2 % Voll-Vermeidung. Gegen bramble_witch (acc 12): Accuracy-Contest-Treffer 59 % × (1−dodge) ⇒ **nur 19.5 % der Gegner-Angriffe landen** (vs 65 % bei Melee/Magie ohne Dodge). Evasion ist der dominante Ranged-Defensiv-Hebel.
- **Varianz gering:** 20 Seeds × 5 min, food=eel → **0 Tode** (sd 0). Boss-Stress forest_warden L65 (enrage×1.6) → mean 0.05 Tode, max 1 (sd 0.22). One-Shot-Cap = 51 @ maxHp 103 liegt WEIT über jedem L60-Max-Treffer (~31 roh, ~49 enraged) ⇒ Dodge-Streaks können keinen 2-Treffer-Burst erzeugen → Varianz gedeckelt.
- **Varianz zeigt sich NUR ohne Food:** RANGED-full KEIN Food vs bramble_witch, 20 Seeds → mean 0.70, sd 0.71, max 2. Todesmodus dann = **uncured Gift-DoT** (Dodge mindert bereits applizierten DoT NICHT), nicht Direktschaden.

## (2) Unarmored = Suizid? — ✅ ja gegen alles mit Zähnen
Naked (kein Leder; durch Kampf-Level trotzdem con 18 / 58 HP), 30 min:
| Szenario | Kills | Tode |
|---|---:|---:|
| naked vs bramble_witch, **KEIN Food** | 70 | **62** |
| naked vs bramble_witch, + eel | 103 | 2 |
| naked vs rootling L62, + eel | 40 | **23** |
| naked vs forest_warden L65, + eel | 19 | **37** |
→ Unarmored = Suizid gegen Over-Level/Boss/ungefüttert (23–62 Tode). Der EINE weiche on-tier-Farm-Mob (bramble_witch) + Top-Food lässt einen nackten L60-Skill-Ranger humpeln (2 Tode) — dieselbe Farm-Zone-Weichheit, die Gate-B als „Puffer" notierte, KEIN Break. Rüstungswert ist eindeutig, sobald der Mob Zähne hat (naked 37 vs armored **0** bei forest_warden).

## (3) Food nötig? — ✅ nötig; Ranged ist der food-toleranteste Stil
| Stil (KEIN Food, bramble_witch, 30 min) | Kills | Tode | endHP |
|---|---:|---:|---:|
| RANGED-full | 117 | **7** | 81 % |
| MELEE-1H+Schild | 122 | 0 | 19 % |
| MELEE-2H | 133 | 0 | 36 % |
| MAGIC-cloth | 122 | 1 | 15 % |
- Mit Food (salmon ODER eel) → RANGED 0 Tode. L60+2 KEIN Food 11 Tode → mit Food 0.
- Ranged weicht ~80 % aus ⇒ HP sinkt langsam (endHP 81 % ungefüttert, vs Melee 19 % / Magie 15 %). Seine ungefütterten Tode kommen aus dem **Gift-DoT**, nicht Direktschaden. Food PFLICHT bei Over-Level/DoT-Mobs; gegen weiche on-tier-Mobs ein niedrig-Ess-Raten-Komfort. On-tier-Food (heal 9–12) deckt voll (0 Tode).

## (4) Stil-Parität L60 — ✅ RANGED on-spec (+3 %); Ausreißer ist Magie (bekannt)
EHP je Spec §7.3-Methodik, Anker = 1H+Schild:
| Build | maxHp | EHP | vs 1H+Schild | Spec-Ziel |
|---|---:|---:|---:|---:|
| 1H+Schild | 123 | 333 | 0 % (Anker) | 0 % |
| 2H-Melee | 107 | 295 | −11 % | −10 % ✓ |
| **RANGED (Leder)** | 103 | **343** | **+3 %** | +5 % ✓ |
| MAGIC (Stoff) | 91 | 265 | −20 % | 0 % ✗ (bekannt) |
- **RANGED +3 % vs 1H+Schild = im Ziel** (+5 % beabsichtigt). Sauberer Pass.
- Survival-Parität (30 min, eel, bramble_witch): RANGED 121 Kills/0 Tode · Melee-1H 122/0 · 2H 133/0 · Magie 124/0 — Kills ±10 %, Ranged Mittelfeld; s/kill 14.9 ≈ Melee 14.8 (auch Offense-Parität ok).
- Magie −20 % = bekannte Content-Leiter-Lücke (Gate-B Hebel 1) + meine Stoff-Wahl arcane ist magic_off 55 (unter-Band → pessimistisch). NICHT Ranged, außerhalb Zell-Scope.

## (5) L60+2 (rootling_treemonster L62, regen 0.4, enrage×1.5) — ✅ sauber mit Food
| RANGED-full | Kills | Tode | s/kill |
|---|---:|---:|---:|
| KEIN Food | 64 | 11 | 28.1 |
| eel | 70 | 0 | 25.7 |
| wraithscale | 70 | 0 | 25.7 |
Regen 0.4/s ist kein Wall für Ranged-DPS (11 roh vs 166 HP). Enrage-Max-Treffer ~49 < One-Shot-Cap 51 → kein Burst-Tod. Over-Level-Gefahr skaliert korrekt (food-gegated).

---

## Bugs / Findings (P1–P4)
- **P1 — keine.**
- **P2 — keine.** Trinität sauber verdrahtet: `item.evasionRating` → `eq.evasionRating` → `dodgeChance` (`character.ts:319`) → Gegner-Treffer-Auflösung STEP 1 (`combat.ts:1583`). 39 Trinität-/Ranged-Guard-Tests grün (`armor-trinity-combat`, `ward`, `wiring-audit`, `ranged`, `ranged-vs-magic`, `status-coverage`, `mitigation`).
- **P3 (bekannt, kein NEUER Bug) — Owner content-dev / logic-dev:**
  1. EHP-Parität-Spanne 25 % @ L60 wird von **MAGIE (−20 % vs 1H+Schild)** gezogen — bekannte low/mid-Content-Leiter-Unter-Spec (Gate-B Hebel 1, Spec §11.4). Ranged selbst ist +3 % (on-spec). Kein Ranged-Defekt.
  2. `WARD_CORE_PER_INT=1.0`-INT-Leak gibt dem RANGED-Build einen 10-Ward-Pool. **Cross-Lever-Warnung:** dieser Leak hebt Ranged-EHP von **−6 % auf +3 %** vs 1H+Schild — Gate-B Hebel 2 (Leak→0) regressiert Ranged-Parität auf ~−6 %, es sei denn Hebel 1 (Leder-`evasionRating` heben) kompensiert. Die beiden Hebel sind FÜR RANGED gekoppelt — beim Apply zusammen fahren.
- **P4 (niedrig, Owner content-dev) — Doc-Drift, kosmetisch:** der Shortbow-Leiter-Header (`packages/content/src/index.ts:2785`) wirbt „SHORTBOW: … +critChance, +evasion", aber **0/12 Shortbows tragen ein `bonus`-Feld** — der Ranged-Evasion-Bonus wurde bewusst entfernt (Spec §1.3, Glass-Cannon). Shortbow/Longbow-Diff ist real via damage/Tempo; der Kommentar ist veraltet. Rein kosmetisch, keine Kampf-Wirkung.

## Empfehlung
**RANGED L60 = ship.** Dodge on-spec, EHP-Parität on-spec, Suizid/Food/Over-Level-Constraints alle erfüllt. Beim Iteration-2/Hebel-Apply beachten: Hebel 1 (Leder-Leiter) + Hebel 2 (INT-Leak) gekoppelt für Ranged — sonst rutscht Ranged nach dem Leak-Fix unter die +5 %-Ziel-Parität.
