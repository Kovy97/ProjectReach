# Phase C — Combat-Tester · STIL=MELEE · BAND=L60 (Krypta/Blackthorn-Übergang)

Stand 2026-07-03 · Kontrolleur · Headless (createGame/computeStats/simulateCombat, Zeiten = SPIELZEIT) ·
KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_cM60_*` ausgeführt & gelöscht.
Grundlage: `design/armor-trinity-spec.md`, Anschluss an `GATE-B.md` (R60 = „⚠ marginal").

## VERDIKT: **FIX-THEN-SHIP** — Trinität an L60 melee grundsolide, 1 P2 (2H-nackt-tankt) + bekannte Trims.
Rüstung ist bedeutsam, 1H-nackt = klarer Suizid, Food strukturell nötig, 1H-vs-2H EHP trifft die Spec-Marke
(−10 %) exakt. **Ein echter Neu-Befund (P2):** die 2H-Waffen-`armorRating` wird UNBEDINGT vergeben → ein
komplett rüstungsloser 2H-Held tankt 50 % Mitigation aus der bloßen Waffe und stirbt mit Food NULLmal (auch
+2 Krypta). Damit gilt „unarmored = Suizid" für die 2H-Schiene NICHT. Rest sind bekannte Trims (Ward-INT-Leak,
weiche Farm-Zone) + 1 Nit.

Loadout (on-tier, defence/attack-Req ≤ 60 → Auto-Selektor = **runite**, combatLevel 60, base str5/con5):
- Platte (5): runite_fullhelm/platebody/platelegs/gauntlets/sabatons — Σ armorRating **9.37** (75 % von 12.5, Spec-Ziel Band-60 ✅)
- 1H+Schild: + runite_sword (6.7–10.1, ivl 2950) + runite_kiteshield (AR 3.13, **block 0.35**, con 8) → Σ AR **12.50**, red **50 %**, block **35 %** (Spec §4.3 Band-60 exakt ✅)
- 2H: + runite_greatsword (12.9–25.1, ivl 3430, **armorRating 12.7**) → AR 9.37+12.7 = **22.07**, red **63.8 %**, block 0 (Spec §5 Band-60-Bonus 12.7 exakt ✅)
- Food on-tier: cooked_crypteel (heal 11 → 3.67 heal/s). Mobs: bramble_witch L60 (on-tier), forest_warden L65-Boss + skeleton_warrior L65 (+1), skeleton_archer L68 / skeleton_spearman L71 (+2 Krypta).

---

## Kern-Zahlen

### Statik (computeStats, combatLevel 60 melee)
| Build | maxHp | armorRating | red % | block % | maxWard | Steh-EHP |
|---|---:|---:|---:|---:|---:|---:|
| **1H+Schild** (sword+kite) | 132.7 | 12.50 | 50.0 | 35.0 | 10 | **360** |
| **2H** (greatsword) | 116.7 | 22.07 | 63.8 | 0 | 10 | **323** |
| 2H (maul) | 118.7 | 22.07 | 63.8 | 0 | 10 | 328 |
| **UNARMORED 1H** (nur sword) | 68.7 | 0.00 | 0.0 | 0 | 10 | **69** |
| **UNARMORED 2H** (nur greatsword) | 68.7 | 12.70 | 50.4 | 0 | 10 | **138** |

EHP-Faktor: 1H `(1−.50)(1−.35·.75)=0.369`, 2H `(1−.638)=0.362` — **fast gleich pro Treffer**; der EHP-Abstand
kommt fast rein aus dem Schild-`con:8` (+16 maxHp). **2H/1H = 89.7 %** → Spec-Ziel −10 % ✅.

### DPS-in (analytisch) vs Food-Sustain (Held-Evasion 6.4, Gegner-Trefferrate 65–69 %)
| Mob | L | dmg | ivl | DPS-in 1H | DPS-in 2H | DPS-in UNARM-1H |
|---|---:|---:|---:|---:|---:|---:|
| bramble_witch (on-tier) | 60 | 21 | 3200 | **1.58** | 1.55 | 4.28 |
| forest_warden (+1 Boss) | 65 | 21 | 3400 | 1.56 | 1.53 | 4.24 |
| skeleton_warrior (+1) | 65 | 23 | 3200 | 1.73 | 1.69 | 4.69 |
| skeleton_archer (+2) | 68 | 27 | 2800 | **2.32** | 2.27 | 6.29 |
| skeleton_spearman (+2) | 71 | 25 | 3200 | 1.88 | 1.84 | 5.10 |

Food heal/s (3 s-CD): spellwarden_bisque 3.00 · **cooked_crypteel 3.67** · cooked_bloodfang_eel 4.00 · cooked_wraithscale 5.00.

### Spielzeit-Sim (kills / s-je-Kill / Tode) — je Zelle 1 h Spielzeit
| Loadout | bramble L60 | forest L65-Boss | sk_warrior L65 | sk_archer L68 | sk_spearman L71 |
|---|---|---|---|---|---|
| 1H+Sch **+Food** | 255 / 14.1 / **0** | 115 / 31.3 / **0** | 244 / 14.8 / **0** | 260 / 13.8 / **0** | 230 / 15.7 / **0** |
| 1H+Sch NOFOOD | 255 / 14.1 / 1 | 101 / 35.6 / **22** | 243 / 14.8 / 2 | 255 / 14.1 / 9 | 224 / 16.1 / 6 |
| 2H **+Food** | 273 / 13.2 / **0** | 131 / 27.5 / **0** | 271 / 13.3 / **0** | 276 / 13.0 / **0** | 236 / 15.3 / **0** |
| 2H NOFOOD | 273 / 13.2 / 1 | 114 / 31.6 / **23** | 271 / 13.3 / 0 | 274 / 13.1 / 3 | 231 / 15.6 / 6 |
| **UNARM 1H +Food** | 181 / 19.9 / **5** | 27 / 133 / **67** | 170 / 21.2 / **18** | 161 / 22.4 / **57** | 137 / 26.3 / **40** |
| **UNARM 1H NOFOOD** | 127 / 28.3 / **102** | 3 / 1200 / **139** | 117 / 30.8 / **111** | 121 / 29.8 / **139** | 99 / 36.4 / **121** |
| **UNARM 2H +Food** | 222 / 16.2 / **0** | 99 / 36.4 / **0** | 216 / 16.7 / **0** | 226 / 15.9 / **0** | 194 / 18.6 / **0** |

Food-Drift 4 h (Tode): 1H+Sch nofood vs bramble = **6** / +Food **0**; nofood vs sk_archer(+2) = **38** / +Food **0**;
2H nofood vs sk_archer = **12** / +Food **0**.

---

## Bewertung der 5 Chef-Fragen

**(1) Rüstung bedeutsam? — JA, klar.** 1H: EHP 69 → 360 (**5.24×**), red 0→50 %, block 0→35 %; Tode/h (Food)
57 → 0 gegen sk_archer. 2H: EHP 138 → 323 (**2.34×**). Rüstung ist die Grenze zwischen Dauer-Sterben und 0 Tode. ✅

**(2) Unarmored = Suizid? — 1H JA, 2H NEIN (P2).**
- **1H nackt = Suizid ✅:** NOFOOD 102–139 Tode/h; selbst MIT Food 5–67 Tode gegen +1/+2. Idle-untauglich.
- **2H nackt = KEIN Suizid ❌:** nur die runite_greatsword (armorRating 12.7) trägt **50.4 % Mitigation** → EHP 138
  (2× der 1H-Nackt-69). Mit Food **0 Tode** über alle Bänder inkl. +2 Krypta (sk_archer L68). → **P2.**

**(3) Food nötig / nicht trivial? — nötig JA, „nicht trivial" nur MARGINAL an L60.**
- **Nötig ✅:** kein Natur-Regen → armored-NOFOOD akkumuliert Tode (forest-Boss 22/h, sk_archer 38 Tode/4 h; +Food 0).
- **Nicht trivial: schwach an L60 on-tier.** cooked_crypteel 3.67 heal/s ≈ **2.3× die on-tier-DPS-in** (bramble 1.58/s).
  Gegen die weichste on-tier-Zelle überlebt sogar NO-food fast (6 Tode/4 h). Druck kommt erst über Boss-Enrage
  (forest_warden 1.6×@35 %) + die +2-Krypta. Deckt Spec §7.2 „Farm-Zone-Puffer", aber die Marge ist an L60
  großzügiger als die Spec modelliert (Spec-Netto +1.05 vs. gemessen ~+2.1). → **P3.**

**(4) 1H+Schild vs 2H EHP-fair? — JA, on-spec (89.7 %).** ABER der −10 % stammt fast rein aus dem Schild-`con:8`
(+16 maxHp), NICHT aus einem Mitigations-Vorsprung: pro-Treffer-Faktor 0.369 (1H) vs 0.362 (2H) ist praktisch
gleich. In der Praxis ist **2H sogar robuster** (NOFOOD vs sk_archer: 2H 12 vs 1H 38 Tode/4 h — höhere Flat-
Mitigation + schnellere Kills). Die Spec-Erzählung „1H-Block glättet Spikes / 2H glasiger" ist mild invertiert. → **P4.**

**(5) L60-Band + 2 drüber (Krypta/Blackthorn-Übergang) — sauber, keine Wall.** Armored (1H & 2H, +Food) räumt
on-tier (bramble L60) bis +2 (sk_spearman L71) mit **0 Toden**; auch der Übergangs-Boss forest_warden L65
(regen+enrage, 216 HP) fällt 115–131×/h ohne Tod. Keine geared-Wall in diesem Band.

---

## Befunde (Severity · file:line · Owner)

- **P2 — 2H-nackt tankt, „unarmored = Suizid" bricht für die 2H-Schiene.**
  `packages/engine/src/character.ts:316-318` vergibt `twoHandMeleeArmorBonus = mainhandItem.armorRating`
  UNBEDINGT (nur `style==="melee" && twoHanded`), unabhängig davon, ob überhaupt Platte getragen wird. Folge:
  UNARM-2H = EHP 138, red 50.4 %, **0 Tode mit Food bis +2**. Spec §7.1 (Suizid-Nachweis) unterstellt implizit
  0 Mitigation für „unarmored" — hält für 2H nicht. **Owner: combat-dev / balance-designer.** Optionen:
  (a) 2H-Bonus an ≥N getragene Platten-Teile koppeln, (b) Bonus als Anteil der getragenen Platte skalieren,
  (c) bewusst akzeptieren + Spec §7.1 korrigieren (dann „2H-Grundpanzer" dokumentieren).

- **P3 — Ward-INT-Leak an Melee weiterhin aktiv (bekannt, Gate-B Hebel 2).** Jeder L60-Melee-Held zeigt
  `maxWard = 10` (INT-Kern aus magic_off=60 → int 10; `character.ts:321`, `WARD_CORE_PER_INT=1.0`). Gibt einen
  Gratis-10-Absorb bei Kampfstart/Respawn (+14.5 % Erst-Encounter-EHP auf den 69-HP-Nackt-Floor) und eine kleine
  Ward-Leiste auf Melee. **Owner: logic-dev/content-dev** (Hebel 2: `WARD_CORE_PER_INT→0`, INT-Kern in Stoff-
  `wardCapacity` einfalten). Kein Neu-Befund — nur Bestätigung, dass er im L60-Band präsent ist.

- **P3 — Food-Druck an L60 on-tier zu großzügig.** on-tier-Food-Sustain ~2.3× die DPS-in → Food = Sicherheitsnetz
  statt Ressourcen-Knappheit; weichste Zelle überlebt fast ohne Food (6 Tode/4 h). Deckt Spec-Intention (Farm-Zone),
  aber Marge > Spec-Modell. **Owner: balance-designer** (akzeptieren) bzw. content-dev (falls straffen: on-tier-Food
  heal 11→~9 ODER on-tier-Mob-Damage leicht anheben — NICHT die Engine).

- **P4 — 1H/2H-Tradeoff-Mechanik ≠ Spec-Narrativ.** EHP-fair, aber Abstand = Schild-HP, nicht „Block-Glättung";
  2H ist pro-Treffer glatter/praktisch robuster. Nur Tuning/Doku. **Owner: balance-designer.**

- **P4 (Nit) — Turmschild dominiert Tropfenschild.** `runite_towershield` (con 9) vs `runite_kiteshield` (con 8)
  bei IDENTISCHEM armorRating 3.13 & blockChance 0.35, ohne Angriffstempo-Malus (`content/src/index.ts:2042-2053`).
  Spec §4.3 wollte Kite-vs-Tower als Tradeoff (Tower +Block/−Tempo, Kite leichter/+AR) — nicht umgesetzt; Tower ist
  strikt besser. **Owner: content-dev.** (Gilt der ganzen Kite/Tower-Leiter, nicht nur runite.)

## Verify (headless, Trinität-Guards für dieses Band)
- ✅ Trinität-Guards grün: `armor-trinity-combat` (8) · `ward` (10) · `mitigation` (2) · `wiring-audit` (2) ·
  `no-natural-regen` (4) = **26 passed**. Keine toten Trinity-Felder (alle 4 in computeStats + combat.ts gelesen).
- Keine geared-Wall im L60-Band; kein Crash/Stall in den Sims.

## Empfehlung: **fix-then-ship** — P2 (2H-nackt) vor Release entscheiden (Fix ODER Spec-Korrektur);
P3/P4 mit der laufenden Iteration-2-Welle (Ward-INT→0, Food/Content-Trims) bündeln. Engine (combat.ts/character.ts)
nur für den P2-Fix anfassen; alles andere ist Content/Config/Doku.
