# Phase C Combat-Tester · STIL=RANGED · BAND=L30 · 100% Kampf, SPIELZEIT

Stand 2026-07-03 · Headless (createGame/computeStats/advance/startCombat, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert.
Wegwerf-Harness `_tmp_cR30_sweep.test.ts` ausgeführt & gelöscht. On-tier Loadout, combatLevel = 30 (alle 7 Kampf-Skills L30, wie sim.ts).

## Loadout (on-tier, band 30)
- **Waffe:** `blacksteel_shortbow` (ranged 30) + `blacksteel_arrow` (ammoDmg 0.6). Gegenprobe Langbogen identisch.
- **Rüstung:** Scaled-Leather-Set (leatherworking 28): helm/body/legs/vambraces/boots → ΣevasionRating 59.2 ⇒ **dodge 59.2 %** (Spec-Ziel band-30 ≈ 59,5 % → on-spec).
- **Food-Leiter:** none / `cooked_cod` (heal 4) / `cooked_salmon` (heal 6). Auto-Eat Tier 0 = 50 %-Schwelle, 3 s-CD.
- **Gegner:** goblin_warlock L30 (dmg13 acc11 iv3200 **burn 0.3/25 %/5s**) · goblin_stormcaller L28 (dmg12 acc10 iv3000 **shock**) · ash_rat L30 (dmg12 acc9 **iv2600, schnell**) · dust_vulture L34 (dmg13 iv3000, Über-Level).

## Stat-/EHP-Zeilen (computeStats, CL30 on-tier — zum Vergleich Melee/Magie mitgemessen)
| Stil | maxHp | dodge | mit% | block | maxWard | evasion | acc | aIMs | dmg | **Modell-EHP** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Ranged (Leder)** | 71.7 | **59.2 %** | 0 | 0 | 6* | 5.8 | 28.5 | **1989** | 9.9–11.1 | **175.7** (maxHp/(1−dodge)) |
| Melee (Platte+Schild) | 79.7 | 0 | 42.5 | 24 % | 6* | 4.0 | 24.1 | 2600 | 12.8–14.8 | 169.0 |
| Magic (Stoff) | 53.7 | 0 | 0 | 0 | 67.5 | 4.0 | 22.2 | 2600 | 13.2–14.6 | 121.2 (maxHp+ward) |
| Ranged **nackt** (nur Bogen) | 39.7 | 0 | 0 | 0 | 6* | 5.2 | 26.8 | 2061 | 9.4–10.6 | 39.7 |

`*` maxWard 6 auf Ranged/Melee = **WARD_CORE_PER_INT-Leak** (int·1.0) — deckt sich mit GATE-B Hebel 2, hier vernachlässigbar (winziger Gratis-Absorb, würde aber eine Ward-Leiste am Ranger zeigen).
Der Leder-Modell-EHP **175.7** reproduziert GATE-B (186, +18 % über Band-Ø) → Harness geerdet.

---

## Bewertung (Zahlen)

### (1) Evasion bedeutsam + Varianz? — **JA, sehr bedeutsam; hohe Einzel-Leben-Varianz**
Single-Life, kein Food, TTK (Sekunden Spielzeit):
| Gegner | nackt (dodge 0) | Leder (dodge 59 %) | Faktor |
|---|---:|---:|---:|
| ash_rat L30 (schnell) | avg 34.1 (sd 13.3) | avg **263.4** (sd 66.8) | **7.7×** |
| goblin_warlock L30 | 23.1 (0–2 Kills) | 133.7 (8–10 Kills) | ~5.8× |

- Dodge verlängert die Überlebenszeit **~6–8×** → klar spürbar.
- **Varianz:** Einzel-Leben-TTK-sd ≈ 25 % vom Mittel; `minHp%` fällt trotz überlebbarem Mittel auf **1–15 %** (Beinahe-Tode). ⇒ swingy, Death-Spiral-Gefühl.
- **Aber im Food-gestützten Farm-Loop mittelt sich RNG raus:** ranged+salmon vs ash_rat, 20 min × 20 Seeds → Kills avg 105.1, **sd 1.0, CV 0.9 %**. Die Varianz wird als *knappe HP-Dips*, nicht als Durchsatz-Schwankung erlebt.

### (2) Unarmored = Suizid? — **JA, eindeutig**
Nackter Ranger (nur Bogen, kein Food) vs goblin_warlock L30: **8/8 Tode**, TTK avg **23.1 s**, 0–2 Kills. Vs ash_rat: **30/30 Tode**, avg 34 s. Gepanzert überlebt **5.8–7.7× länger**. EHP 39.7 → 175.7. Idle-untauglich ohne Leder.

### (3) Food nötig, nicht trivial? — **JA**
Gepanzerter Ranger, 15-min-Fenster:
| Gegner | kein Food | cooked_cod (4) | cooked_salmon (6) |
|---|---|---|---|
| goblin_warlock L30 | **6/6 Tode** (TTK 91–172 s) | 1/6 Tod, minHp bis **10 %** | 0 Tode, minHp-Boden 22–33 % |
| ash_rat L30 (schnell) | **6/6 Tode** (TTK 147–262 s) | 0 Tode, minHp 19–34 % | 0 Tode, minHp 22–39 % |
- Kein natürlicher HP-Regen ⇒ ohne Food akkumuliert der Chip-Schaden (+ ungemilderter burn-DoT 0.3/s) → sicherer Tod.
- **Der knappe on-tier-Tier (cod, heal 4) ist marginal** (1/6 Tod vs warlock, minHp 10 %) → Food nötig UND nicht trivial. Salmon (6) deckt komfortabel. Deckt Spec §7.2.

### (4) Stil-Parität L30 — Gate „Leder +18 % über Parität, im Gefühl auffällig?" — **NEIN, +18 % ist im Spiel NICHT als Tankiness spürbar; Leder fühlt sich sogar am squishigsten an**
**Der Papier-EHP-Vorsprung ist in echten Kämpfen invertiert.** Single-Life, kein Food, Überlebenszeit (s), alle Stile:
| Gegner | Ranged/Leder | Melee/Platte | Magic/Stoff |
|---|---:|---:|---:|
| goblin_warlock L30 | **133.7** | 174.1 | 879.6 |
| goblin_stormcaller L28 | **233.9** | 684.4 | 900+ |
| ash_rat L30 (schnell) | **213.6** | 743.4 | 900+ (0 Tode) |

- **Leder ist bei ALLEN drei Gegnern der squishigste Stil** (1.3–3.5× kürzere TTK als Platte), obwohl das Parität-Modell Leder mit dem HÖCHSTEN EHP (175.7, „+18 %") führt.
- Ursache (kein Code-Bug): Dodge = reine Vermeidung → die 41 % durchkommenden Treffer landen **voll** auf nur 71.7 HP; **null** Per-Treffer-Reduktion; One-Shot-Cap = 50 %·maxHp = **35.8** (ein Unglückstreffer = halbe Leiste). Platte glättet jeden Treffer (−42.5 % +Block), Magie sustained über Ward-Recharge. Genau die in Spec §4.5/§11.3 antizipierte Dodge-Varianz — hier **quantifiziert**.
- **MIT Food ist der +18 % unsichtbar:** 20-min-Farm vs warlock, salmon, 0 Tode alle Stile → Kills **ranged 73–75 (höchste)**, melee 65, magic 71. Der gefühlte Ranged-Vorteil ist **DPS/Kill-Rate** (schneller Bogen, aIMs 1989), nicht Haltbarkeit.
- **Fazit:** L30 liest sich als „Ranged = Glass-Cannon (Top-DPS, Top-Dodge auf dem Papier, aber spikey/squishy)". Das +18 %-EHP-Ziel ist doppelt fehlplatziert: über-getunt UND kauft im Spiel keine Haltbarkeit. Der echte Hebel ist die **Dodge-Varianz** (bereits auf der Iteration-2-Liste: Evasion LINEAR→diminishing; ggf. DODGE_CAP 0.65 + kleiner Leder-HP-/Basis-Mitigations-Boden).

### (5) L30 +N drüber — **getestet +4 (dust_vulture L34, nächster Nicht-Slayer-Mob über L30; ein L32 existiert nicht)**
Ranger L30 vs dust_vulture L34 (dmg13 iv3000), 15-min-Fenster:
| Food | Tode | Kills | minHp-Boden |
|---|---|---|---|
| none | **6/6** | 12–27 vor Tod | 1–14 % |
| cooked_salmon | **0/6** | 65–67 | 26–44 % |
20-min-Farm +salmon: Kills 88–90, 0 Tode. ⇒ **+4 Über-Level ist mit on-tier-Food bequem farmbar, ohne Food tödlich.** Gesunder Gradient; +2 (L32) wäre entsprechend leichter.

---

## Befunde (Severity · file:line · Owner)
- **P2 — Leder-„+18 % EHP" invertiert sich im echten Kampf; Leder ist L30 der squishigste Stil (1.3–3.5× kürzere TTK als Platte, alle 3 Gegner).** Papier-EHP 175.7 vs reale Überlebens-Reihenfolge Leder < Platte ≪ Magie. Ursache = Dodge-Varianz + null Per-Treffer-Reduktion + One-Shot-Cap 35.8 auf 71.7 HP. KEIN Code-Bug (Mechanik on-spec, `combat.ts:1583` Dodge-Roll, `character.ts:319` `dodgeChance = evasionRating/100` LINEAR). **Owner: balance-designer** (Iteration-2 diminishing-Evasion + DODGE_CAP/Leder-HP-Boden abwägen); den +18 %-Overshoot NICHT für Haltbarkeit runterziehen — er kauft keine.
- **P3 — Mit Food ist der Leder-EHP-Vorsprung unsichtbar; Ranged-Identität = DPS, nicht Tank.** Food-Farm Kills ranged 73–75 > magic 71 > melee 65, alle 0 Tode. **Owner: balance-designer** (entscheiden, ob Glass-Cannon gewollt ist; wenn ja, Parität-Tabelle §4.4 als „EHP-Erwartung" ehrlich als *nicht* felt-EHP kennzeichnen).
- **P3 — WARD_CORE_PER_INT-Leak bestätigt am Ranger** (maxWard 6 aus int·1.0). Deckt GATE-B Hebel 2. **Owner: logic-dev** (`WARD_CORE_PER_INT` 1.0→0, `character.ts:321`).
- **P4 — Beobachtung (Magie, außerhalb Ranged-Scope): Magier sustained no-Food ~900 s+ vs L28–L34** (Ward-Recharge 1.3/s > burn 0.3/s + Pool 67.5). Food-Druck auf Magie bei L30 sehr schwach → an Magie-Tester/balance-designer.
- **Kein Wiring-/Dead-Field-Bug im Ranged-Pfad:** Leder-`modifiers` (dex/con) + `evasionRating` beide angewandt, `ammoDamage` angewandt, Short-/Longbow beide korrekt. Kontext: burn/shock-DoT umgeht Dodge/Mitigation/Block/Ward (nur Dodge senkt die Applikations-Frequenz) — trifft alle Stile ~gleich, komprimiert die Parität (kein Bug, intended „Armor-bypass").

## Empfehlung: **fix-then-ship (Balance)** — Mechanik korrekt & fun als Glass-Cannon, aber die Dodge-Varianz/Squishiness (P2) an balance-designer/content-dev; kein Blocker, kein Code-Bug.
