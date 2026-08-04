# Phase C2 — Combat-Tester (Iteration 2) · MAGIC · Band L90 (Endgame) · Rüstungs-Trinität

Stand 2026-07-03 · Kontrolleur (Combat-Tester) · **HEADLESS** (createGame/computeStats/advance/combatStep, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_c2G90_sweep.test.ts` gelaufen & **gelöscht**.
Loadout: **BiS Stoff+Stab @ L90** = `godspark`-Set (mitre/vestment/skirt/handwraps/sandals, req magic 85 + runecrafting 88) + `godspark_vestment_set`-Bonus {int5,wis3,lck2} + `aetherium_staff` (2H, magic 90). Skills magic/warding/vitality/runecrafting/herblore = 90 → **CL 68** (reiner Offensiv-Caster; defence untrainiert). starweave (req magic 92) liegt über dem Band → godspark bleibt BiS (wie It1).
Gegner: die 4 Götzenhallen-Endbosse (idol_warden L245, aether_wraith L260, scale_skarn L275, last_idol L295 enrage). Food = `cooked_soulfish` (heal 27), autoEat Tier 3 (80 %). Vergleichsbasis: `design/armor-sweep-2026-07-03/C-mage-L90.md` (It1) + `design/armor-iteration2-spec.md`.

## VERDIKT: **SHIP** — Food kehrt auf last_idol zurück (Fixliste #6 greift), kein unendlicher Sustain, Parität im Band (CL90-Methodik). Kein Bug, kein Exploit.

Der It2-Kernwechsel wirkt genau wie vorgesehen: der **per-Kill-Ward-Voll-Reset** ist weg (`WARD_KILL_REFILL_PCT = 0.20`), und der Ward-Pool **erodiert** über eine Farm-Session am härtesten Boss → **Food ist auf `last_idol` jetzt PFLICHT** (OHNE Food 7 Tode / 3600 s; MIT Food 0). Auf den 3 weicheren Idolhall-Bossen hält der Ward-Puffer weiter (Food nicht getriggert) — spec-konform (§6.1 „Farm-Zone-Puffer gewollt"). Der neue **Warding-Regen** (+1,80/s offensiv) schafft **keinen** unendlichen Sustain (Dauerkampf: Ward leer nach ~99 s, Tod ohne Food nach 114 s). Parität R90 ist per CL90-Methodik im Band (Stoff −7,7 %, wie It1); als realer CL68-Caster marginal drüber (−10,3 %). Ein P3-Kalibrier-Nit (CL68-Parität + „Food nötig" gilt nur am Über-Level-Boss), kein Blocker.

---

## It1 → It2 · computeStats des BiS-Magiers (echte Werte)

| Stat | It1 | **It2** | Kommentar |
|---|---:|---:|---|
| maxHp (CL68) | 105,7 | **105,7** | unverändert (con 37 = base3 + vitality90/8 + godspark-Gear con23; §1.1-CON-Retune traf nur Low-Band) |
| maxWard | 414 (68 INT-Kern + 346 Gear) | **476,2** | `WARD_CORE_PER_INT=0` → **nur Gear**; INT-Kern in godspark-`wardCapacity` eingefaltet (Σ 476,2, on-curve für R85-Set, §1.2/§11.5) |
| oneShotCap (0,5·maxHp) | 53 | **52,9** | unverändert |
| wardRegenPerSec | – (Feature neu) | **1,80** offensiv / **2,00** defensiv (Cap) | Warding-90 · 0,02 = 1,8; defensiv ×1,5 = 2,7 → auf `WARDING_REGEN_CAP` 2,0 gedeckelt (Cap NACH Stance-Mult, Gate-C #1 ✅) |
| Cast-Recharge | ~1,53/s | **~1,46/s** | cost 8·WARD_PER_MANA 0,5 / Cast-Takt; **Gesamt-Regen jetzt ~3,26/s** (Cast + Warding) ≪ Boss-DPS-in ~7,5/s |
| dmg / maxHit | 41,5–45,1 | **41,5–45,1** | unverändert (Waffe orthogonal) |
| mit / dodge / block | 0 / 0 / 0 | **0 / 0 / 0** | Stoff trägt keine der 3 Nicht-Ward-Schichten (korrekt) |
| maxMana / manaRegen | 886 / 19,1 | **886 / 19,1** | Mana nie knapp → Voll-Power-Casting im ganzen Fenster |

Godspark `wardCapacity` Σ = 95,23+142,85+104,76+66,66+66,66 = **476,16**. Der frühere INT·1-Kern (It1: 68) ist in die Teile eingefaltet → Pool **netto +62** vs It1 (414 → 476), aber **allein aus Gear** (Ward-INT-Leak beseitigt, wie in allen 12 It1-Testern gefordert).

---

## Die 4 Gate-Fragen (mit Zahlen)

### Q1 — Food jetzt nötig im Endgame? (It1-P3: per-Kill-Voll-Reset machte Stoff HP-schadensfrei)

**900 s Farm je Boss, MIT vs OHNE Food (identische autoEat-Config):**

| Boss | Lv | kills | Tode (Food/NoFood) | minHP % (Food/NoFood) | minWard | wardEnd | Food gegessen |
|---|---:|---:|---:|---:|---:|---:|---:|
| idol_warden | 245 | 52 | 0 / 0 | 100 / 100 | 370/476 | voll | **0** |
| aether_wraith | 260 | 43 | 0 / 0 | 100 / 100 | 296/476 | ~voll | **0** |
| scale_skarn | 275 | 36 | 0 / 0 | 100 / 100 | 341/476 | voll | **0** |
| **last_idol** | 295 | 28/26 | **0 / 2** | 74 / 12 | **0**/476 | 3 (Food) | **14** |

**last_idol · 3600 s (Über-Level-Dauerfarm):** MIT Food **0 Tode / 77 Food**; OHNE Food **7 Tode**. Ward-Trajektorie oszilliert (dipt mehrfach auf 0: t≈2100 s→0, t≈3300 s→1) → der Pool **erodiert** und wird von Kills nur teil-aufgefüllt; Food fängt die HP ab, sobald Ward leer ist.

- **Fazit Q1:** **Food kehrt zurück — aber gezielt am härtesten Boss.** Auf `last_idol` (höchste DPS-in + regen 1 + enrage ×1,75) verbraucht ein Kampf mehr Ward, als 20 %-Kill-Refill + Recharge + Warding-Regen zurückgeben → Pool erodiert → **Food ist Pflicht** (OHNE Food Tode). Auf den 3 weicheren Bossen (kürzere TTK, weniger Ward-Verbrauch/Kampf) hält der Puffer → **0 Food** (spec-konform §6.1). **It1→It2:** It1 war Stoff auf ALLEN 4 Bossen 0-Food/0-Tod (minHP 100 %) — der Voll-Reset unterlief die Chip-Akkumulation. It2 stellt die Food-Säule für den Über-Level-Fall wieder her (**Fixliste #6 erreicht**), ohne die Farm-Zonen-Kulanz zu töten.

### Q2 — Ward-Pool + Warding-Regen-Loop gegen Boss-Burst (One-Shot-Cap→Ward)?

- **Einzel-Bosskampf last_idol → Kill (Burst/Enrage):** TTK ≈ 23,5 s, **minHP 100 %**, minWard **306/476**. Der Enrage-Roh-Spike (bis 32·1,75·1,4815 ≈ 83) wird vom **One-Shot-Cap auf 52,9 gedeckelt** und landet vollständig im Ward (≥306) → **HP nie berührt**. Absorb-Order combat.ts:1656–1683 exakt (Mitigation → Leder-Floor → Block → One-Shot-Cap → **Ward** → HP). ✅
- **Dauer-Härte (last_idol-Klon 20 k HP, KEIN Kill-Refill → isoliert den Sustain):** Ward leer bei **~99 s** (MIT und OHNE Food identisch — Regen kann den Pool nicht halten). **OHNE Food → Tod bei 114 s.** **MIT Food → 600 s, 0 Tode** (Food trägt ab Ward-Leere, minHP 80 %). Ward-Verlauf: 10 s→439, 30 s→377, 60 s→218, 90 s→39, 120 s→4.
- **Fazit Q2:** Ward + Cap **halten jeden Einzel-Burst** (Pool 476 ≫ Cap 53). **Kein unendlicher Sustain / kein Warding-Exploit:** Gesamt-Regen ~3,26/s (Cast 1,46 + Warding 1,80) ≪ DPS-in ~7,5/s → im Dauerkampf ist der **Pool die EHP**, danach trägt Food oder es folgt der Tod. Der NEUE Warding-Regen (+1,80/s) verlängert die Erschöpfung nur minimal (99 s vs It1 ~90 s) — Spec §9.2 „Regen ≪ DPS-in" intakt. Ward-Cap-Guard 0 Verletzungen (Ward nie > 476; Kill-Refill/Regen sauber auf maxWard geklemmt).

### Q3 — Stil-Parität R90 (EHP)

Voll-Sets je Klasse, echte computeStats. EHP = maxHp/[(1−mit)(1−block·0,85)] (1H+Schild) · maxHp/(1−mit) (2H) · maxHp/[(1−dodge)(1−0,12)] (Leder, inkl. Floor) · maxHp+maxWard (Stoff). K=125, K_DODGE=45.

| Stil | CL | maxHp | armorR | mit % | block % | dodge % | maxWard | **EHP** | Δ vs Ø |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Platte 1H+Schild | 90 | 197,7 | 143,2 | 53,4 | 47,2 | – | 0 | **708** | +8,3 % |
| Platte 2H | 90 | 175,7 | 323,0 | 72,1 | – | – | 0 | **630** | −3,7 % |
| Leder (wraithhide) | 90 | 165,7 | – | – | – | 72,0 | 0 | **674** | +3,0 % |
| **Stoff (CL90-Methodik)** | 90 | 127,7 | – | – | – | – | 476 | **604** | **−7,7 %** |
| *Stoff (realer CL68-Caster)* | 68 | 105,7 | – | – | – | – | 476 | *582* | *−10,3 %* |

- **CL90-Methodik (It1-Konvention):** Ø 654, **maxAbw 8,3 % → alle ≤ ±10 % ✅**. Stoff **−7,7 %** — praktisch identisch zu It1 (−7,4 %).
- **Realer CL68-Caster:** Stoff **−10,3 %** → **marginal über ±10 %** (It1: −9,1 %). 2H liegt bewusst am unteren Offense-Rand, Leder via Accuracy-Contest-Evasion real etwas über dem Papierwert (§11.6-Modell für Leder leicht pessimistisch — von C2-ranged-L90 bestätigt).
- **It1→It2:** Alle Stile GEWANNEN EHP (Platte 1H 627→708 durch Block 0,75→0,85; Leder 554→674 durch NEU `wraithhide_set` con8; Stoff 542→604 durch maxWard 414→476). Der Ø stieg schneller als Stoffs Ward-Zuwachs → Stoff bleibt am **unteren** Paritäts-Rand, minimal tiefer als It1. **Fixliste #1/#2/#7 sichtbar wirksam**, Parität-Charakter unverändert.

### Q4 — 4 Endbosse killbar, 0 Tode?

| Boss | Lv | kills/900 s | Tode (MIT Food) | Tode (OHNE Food) | TTK₁ | minWard |
|---|---:|---:|---:|---:|---:|---:|
| idol_warden | 245 | 52 | **0** | 0 | ~14 s | 370 |
| aether_wraith | 260 | 43 | **0** | 0 | ~17 s | 296 |
| scale_skarn | 275 | 36 | **0** | 0 | ~19 s | 341 |
| last_idol | 295 | 28 | **0** | **2** | 23,5 s | 0 |

**Alle 4 mit BiS-Food 0 Tode** (last_idol auch über 3600 s: 0 Tode). **It1→It2-Unterschied:** In It1 waren alle 4 auch OHNE Food 0-Tod; jetzt ist **`last_idol` food-abhängig** (2 Tode/900 s, 7 Tode/3600 s foodless) — genau der gewünschte Effekt. ✅ (mit Food)

---

## Findings

- **P3 — Balance/Methodik-Nit (Owner: balance-designer, low).** Als **realer CL68-Caster** liegt Stoff-EHP bei **−10,3 %** — marginal über dem ±10 %-Gate (Gate-Kriterium #1). Per **CL90-Methodik** (die Konvention aus It1/§11.6) ist es **−7,7 %**, im Band. Gleiche Doppeldeutigkeit wie It1-P4, durch It2 minimal verschärft, weil die anderen Stile (Block 0,85, wraithhide_set) EHP dazugewannen. **Kontext:** das reale L90-BiS-Cloth ist godspark (req magic **85**, maxWard 476, on-curve) — es existiert **kein** magic-90-Cloth-Set (starweave req 92 > Band), daher liegt das reale BiS-Cloth unter dem §11.6-Modellziel (681). Kein Blocker; Kalibrier-Note (Stoff-EHP an BEIDEN Zahlen messen, CL68 vs CL90).

- **P4 — Info: „Food nötig für ALLE" gilt für Stoff nur am Über-Level-Boss (Owner: balance-designer / Chef-Food-Philosophie §13).** Gate-Kriterium #5 („je Stil über langes Fenster driftet/stirbt ohne Food") ist für Stoff **auf `last_idol` erfüllt** (foodless Tode), auf den 3 weicheren Idolhall-Bossen aber **nicht** — dort hält der Ward-Puffer (0 Food, 0 Chip). Das ist **spec-konform** (§6.1: weiche Nicht-DoT-Mobs = gewollter Farm-Puffer), aber die pauschale Formulierung trifft für Stoff nur den Enrage-/Über-Level-Fall. Falls der Chef „härter" will (§13-Default „moderat"): `WARD_KILL_REFILL_PCT 0.20 → 0.10` zöge Food auch auf die weicheren Bosse.

- **Keine Bugs / kein Exploit.** 20 %-Kill-Refill greift (combat.ts:767/797), Warding-Regen additiv + gedeckelt + **kampf-scoped** (läuft korrekt auch in der Kill-Cooldown-Verschnaufpause, combat.ts:1516), One-Shot-Cap→Ward→HP-Order exakt, Ward-Cap 0 Verletzungen, kein unendlicher Sustain, kein Warding-Endgame-Exploit. Guard-Tests grün: `ward` (10) · `armor-iteration2-combat` (8) · `armor-trinity-combat` (8) · `mitigation` (2) · `lifesteal-respawn` (4) = **32/32**.

**Empfehlung: SHIP** für Magier-L90-Endgame. It2 ist mechanisch korrekt; der It1-P3-Kernbefund (Ward-Voll-Reset → Stoff food-frei) ist **behoben** (Food kehrt am härtesten Boss zurück), der INT-Ward-Leak ist weg, Parität ist per CL90-Methodik im Band. Offen sind nur die **bewusst zu entscheidenden** Kalibrier-/Philosophie-Punkte P3/P4 (CL68-Rand-Parität, Food-Härtegrad) — kein Blocker, berührt Code nur bei aktiver Chef-Entscheidung.
