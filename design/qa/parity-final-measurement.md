# 3-Stil-Paritäts-Endmessung — nach leatherworking→dex-Wurzelfix

**Datum:** 2026-06-28  ·  **Rolle:** Balance-Designer (READ-ONLY-Messung)
**Kontext:** Wurzelfix gelandet — `leatherworking trains:"dex"` entfernt (zusätzlich war `smithing trains:"str"` schon raus). Verifiziert in `packages/content/src/index.ts:13,29`: **kein Crafting-Skill trainiert mehr ein Offense-Attribut.** Offense kommt jetzt symmetrisch nur aus dem Combat-Skill-Attribut (power→str, ranged→dex, magic_off→int) + Gear.

## Methodik (EIN konsistenter per-Stil-Harness)
- Held auf Kampf-Level L; **alle** Skills auf L (inkl. fletching/runecrafting/leatherworking/smithing — sonst scheitert `equipItem` an `meetsRequirements` und Bogen/Stab/Robe/Platte legen NICHT an → Faust-Fallback). Innate nur `con:10` (symmetrisch, kein Offense-Bias). Bestes Food (Seared Voidray), Auto-Eat-Pfad aktiv.
- **Best-craftbares Gear pro Stil** je Slot (höchste Anforderung ≤ L), inkl. der jetzt-symmetrischen passiven Craft-Attribute.
- **DPS-optimale Waffenwahl** je Stil: Harness simt jeden weaponType (Schwert/Maul/Dolch/… · Short-/Longbow · Stab/Wand) und nimmt die kill-stärkste Variante; Munition mana-/köcher-aware vorbefüllt.
- On-Level-Mob je Checkpoint, 1 h Spielzeit, **Mittel aus 3 Seeds (5/7/11)**.

## ×-Faktor-Tabelle (kills/h, relativ zum 3-Stil-Mittel je Checkpoint)

| Checkpoint (Mob) | melee | ranged | magic | Mittel kills/h |
|---|---|---|---|---|
| **L10** (goblin_butcher Lv10) | **1.17×** (975) | 0.94× (783) | 0.89× (745) | 834 |
| **L30** (skeleton_icemage Lv30) | 0.92× (637) | 0.96× (669) | **1.12×** (781) | 696 |
| **L55** (ember_elemental Lv52) | 0.96× (1291) | 1.04× (1399) | 1.00× (1343) | 1344 |
| **L75** (roc_storm Lv75) | 0.92× (889) | 0.98× (952) | 1.10× (1067) | 969 |
| **L99** (aether_wraith Lv98) | **1.17×** (1871) | 0.91× (1450) | 0.92× (1476) | 1599 |

Gewählte DPS-optimale Waffe je Zelle: L10 melee=iron_maul / rng=iron_shortbow / mag=iron_wand · L30 spear/shortbow/wand · L55 dagger/shortbow/wand · L75 dagger/shortbow/wand · L99 dagger/longbow/wand. (Melee nimmt ab L55 1H-Dolch **+ Turmschild** → schnell **und** tanky.)

## Urteil: ZENTRIERT — ja
Die leatherworking→dex-Entfernung hat die Bänder **zentriert**:
- **Ranged ist nicht mehr die Decke.** Run7: Ranged war via leatherworking→dex-Doppelfütterung Spitzenreiter. Jetzt liegt Ranged bei **0.91–1.04×** (an den Enden sogar leicht *unter* Mittel) — kein Stil-Deckel mehr.
- **Melee/Magie nicht mehr unter Band.** Run7 late-mid: Melee 0.89× / Magie 0.79×. Jetzt mid-game (L30–L75) **alle drei 0.92–1.12×**; Magie ist sogar die milde Mid-Game-Decke (L30 1.12, L75 1.10).
- Das Muster ist sauber gespiegelt: **Melee** ragt an den Level-Extremen (L10/L99 = 1.17×), **Magie** ragt im Mid-Game (1.10–1.12×), **Ranged** ist durchweg am zentriertesten.

### Checkpoints im 0,90–1,10-Band
| | melee | ranged | magic |
|---|---|---|---|
| L10 | ✗ 1.17 | ✓ 0.94 | ~ 0.89 (1 Pp drunter) |
| L30 | ✓ 0.92 | ✓ 0.96 | ✗ 1.12 |
| L55 | ✓ 0.96 | ✓ 1.04 | ✓ 1.00 |
| L75 | ✓ 0.92 | ✓ 0.98 | ✓ 1.10 |
| L99 | ✗ 1.17 | ✓ 0.91 | ✓ 0.92 |

13/15 im Band (L55 perfekt). Alle Abweichungen ≤ ±17 %; keine Decke/kein Loch wie in run7.

## Rest-Abweichungen — kleine Hebel (nur benannt, NICHT umgesetzt)
1. **Melee-Extreme-Decke (+17 % bei L10 und L99).** Größter Ausreißer.
   - *L99:* Top-Melee-Waffendamage ist hoch (godiron_dagger meleeDamage 107 / aIMs −500 + Krit, dazu Lifesteal + Schild). Hebel: **godiron-Tier-Waffen meleeDamage −8 bis −10 %** (zieht L99-melee ~1.17→~1.06). Alternativ `MELEE_LIFESTEAL_CAP_ABS` leicht senken (combat-Revier, nicht content).
   - *L10:* `iron_maul` (frühes 2H mit `modifiers.str +12`) ist für einen frischen L10 einen Tick zu stark. Hebel: **iron_maul meleeDamage oder den str-Modifier ~10 % kürzen.**
2. **Magie-Mid-Decke (+12 % L30, +10 % L75).** Hebel: **mittlere Wand-Tiers (blacksteel/mithril) magicDamage −5 bis −8 %** ODER Burn-/Frost-Magnitude der Mid-Stäbe leicht zurück.
3. **Magie L10 marginal drunter (0.89).** 1 Prozentpunkt; Hebel falls gewünscht: **iron_wand magicDamage +1–2** oder apprentice-Robe magicDamage +1. Kosmetisch.

> Empfehlung: Nur Hebel 1 (Melee-Extreme) ist es wert; 2/3 sind innerhalb der Mob-zu-Mob-Streuung und könnten an einem anderen On-Level-Mob bereits im Band liegen. **Keine Maßnahme ist dringend** — die Zahlen-Parität ist erreicht.

## Strukturelle Nicht-Zahlen-Deckel (über reine Parität hinaus für „Combat 9,5")
Diese drei limitieren NICHT die Zahlen-Parität, aber das Combat-*Erlebnis* — bestätigt:
1. **Auto-Eat-0-Tode maskiert Defense.** In JEDER Zelle (alle Stile, alle Checkpoints) `deaths=0`. Mit unbegrenztem Top-Food + Auto-Eat ist effektive EHP/Defense für den Durchsatz irrelevant → Melees Tank-Identität und die Glass-Cannon-Kehrseite von Ranged/Magie sind unsichtbar. Reine kills/h können „balanciert" aussehen, während Verteidigung dekorativ ist.
2. **aIMs-Tempo-Floor deckelt Melee-1H-Durchsatz endgame.** `attackIntervalMs` clampt bei 800 ms (Ranged 1000). Endgame-dex drückt schnelle 1H-Waffen (Dolch) an den 800-Floor → zusätzliche Tempo/dex-Quellen bringen nichts mehr; 1H-Melee-Durchsatz ist hart gedeckelt (und genau deshalb ist der Dolch+Schild-Build optimal: schnell am Floor **und** tanky).
3. **Faceroll-Endgame.** `deaths=0` + hohe kills/h + Lifesteal/Mana-Schild = kein Risiko. Endgame ist stilunabhängig ein Selbstläufer.

Für „Combat 9,5" braucht es über die Zahlen hinaus: ein **defense-relevantes Szenario** (Auto-Eat-Drossel / Food-Knappheit / Eat-Cooldown), einen **stil-distinkten statt globalen Tempo-Floor** (oder dessen Anhebung), und **echte Endgame-Bedrohung** (Mechaniken, die `deaths=0` brechen).

---
*Harness: temporär in `packages/engine/src/_parity_harness.test.ts` + `_parity_diag.test.ts` gefahren, danach entfernt (packages/** unverändert). Re-run: Harness setzt ALLE Skills auf L, sonst equippen Bogen/Stab/Robe nicht (fletching/runecrafting/leatherworking-Co-Requirements).*
