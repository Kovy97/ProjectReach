# QA-Run 7 — Combat-Systeme: Status-Symmetrie (flame=frost=shock), Mana beißt wieder (godspark-Regen zurück), Auto-Eat-maskiert-Defense

**Tester:** Playtester-Analyst (STRIKT READ-ONLY; einzige Schreibdatei = dieser Bericht) · **Datum:** 2026-06-28
**Scope (Kampf-SYSTEME):** **KERNFRAGE — Status/affix_shock/DoT**: Ist flame jetzt symmetrisch zu frost/shock (R5: flame-T3-Flat +4→+3)? · **Mana-Lever B**: greift godspark-manaRegen-Rücknahme (beißt Mana wieder)? · **Haupt-Blocker** (run6 P2): Auto-Eat T3 maskiert Defense — als Design-Frage bestätigen. Carryovers (frost-magnitude inert, status-coverage-Doc, stopReason) verifizieren. Determinismus.

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`startCombat`→`combatStep`, deterministische Seeds, 1-h-Läufe @ `TICK_MS=100` = 36 000 Ticks), Per-Tick-Tracking hpMin/manaMin/kills/deaths, **nach dem Lauf entfernt**. Zusätzlich 8 kampf-relevante Vitest-Suites grün (**46 Tests**: status-coverage, magic-loop, mana-shield, autoeat-dot, enchant, bleed, poison, endgame-danger). Alle Zahlen unten sind reale Sim-/Test-Ausgaben.

> Hinweis: Die kills/h-Absolutwerte hier liegen anders als in run6, weil das Harness eigene Skill-/Attribut-Levels setzt (magic_off 110 etc.). **Vergleichbar sind die VERHÄLTNISSE innerhalb dieses Runs** (Build-zu-Build, mit-Food-vs-ohne-Food) — die sind intern konsistent.

---

## Fun-Score: **9,0 / 10**

Zwei saubere, risikoarme R5-Fixes, die beide sitzen — **aber der run6-Haupt-Blocker bleibt strukturell unangetastet** und ist bei genauerem Hinsehen sogar dominanter als run6 dachte. Daher Halten auf 9,0 (Δ inhaltlich positiv, Decke unverändert).

- **KERNFRAGE beantwortet — Status ist jetzt flat-symmetrisch:** `affix_flame=[1,2,3]`, `affix_frost=[1,2,3]`, `affix_shock=[1,2,3]` (magicDamage-Flat je Tier identisch). Die R5-Angleichung (flame-T3 +4→+3) ist im Katalog (Z.12333) und funktional bestätigt. Rider differenziert & live: flame = burn-DoT (mag bis 14), frost = Slow (FROST_SLOW 0,4), shock = Angriffs-Aussetzer (mag bis 0,20).
- **Mana beißt wieder (godspark-Regen-Rücknahme greift):** godspark-Teile jetzt manaRegen **0,35**/Teil. Robe-Mage drainiert über **alle** Mobs auf **manaMin ~1,5–3** (run6: roc manaMin **392** sustained). Lever B ist auf beiden Mage-Builds voll aktiv — kein Gratis-Sustain mehr.
- **Netter Nebeneffekt: run6-P2-Parität verbessert.** Mit beißendem Mana fällt der Robe-Mage von >100 % Melee-Durchsatz (run6-Inversion) auf **80–95 %** zurück → die „Robe-Mage > Melee"-Anomalie ist weitgehend aufgelöst.
- **Determinismus + Seed-Sensitivität:** seed123→319 Kills, Wiederholung 319 (bit-gleich), seed777→329 → deterministisch **und** seed-sensitiv.

Gebremst (kein 9,5) durch den **unveränderten Haupt-Blocker**: Auto-Eat T3 maskiert die Defense weiterhin vollständig — jetzt mit härterem Beleg (ein fast-nackter Glass-Cannon mit def 119 stirbt bei T3 **0×**, ohne Food **34–48×/h**). Dazu eine **neue, an den Blocker gekoppelte P2** (symmetrische Affixe → in einem survival-trivialen Endgame schlägt flames Offensiv-DoT die Defensiv-Rider frost/shock; shock zusätzlich auf 2/3 Top-Mobs resistet) und drei unveränderte P3-Carryovers.

---

## Δ vs Run 6

| Thema | Run 6 | Run 7 |
|---|---|---|
| **Status flat-Symmetrie (KERNFRAGE)** | flame-T3 +4 (asymmetrisch) | **GELÖST** — flame=frost=shock = [1,2,3]; Rider live & differenziert |
| **Mana-Lever B (godspark)** | Robe-Mage sustained (manaMin 392 @ roc) | **beißt wieder** — Robe-Mage manaMin ~1,5–3 über alle Mobs (godspark-Regen 0,35/Teil) |
| **Magie-Durchsatz-Parität** | NEU P2 — Robe-Mage > Melee (Inversion) | **verbessert** — Robe-Mage **80–95 %** Melee (Inversion weg); Plate-Mage **58–62 %** = Trap **bleibt** |
| **Auto-Eat T3 maskiert Defense (Haupt-Blocker)** | P2 verschärft (def 275 = def 524 = 0 Tode) | **bleibt P2, jetzt schärfer belegt** — def **119** (nackt) = def 245 = def 534 = **0 Tode**; ohne Food: 34–48 vs 4–7 Tode → Defense wirkt 6–8×, T3 kollabiert alles auf 0 |
| Affix-Rider-Wert im Endgame | nicht isoliert | **NEU P2** — bei trivialem Survival schlägt flame-DoT (offensiv) die frost/shock-Rider (defensiv); **shock auf void_titan+last_idol resistet** → shock-Affix doppelt benachteiligt |
| `inflict.frost.magnitude` inert (4 Mobs) | P3 | **weiterhin P3** (Z. 8579/8848/8881/8986, `magnitude:1` nie gelesen) |
| `status-coverage.test.ts` „shock = Schaden-Amp" | P3 | **weiterhin P3** (Z.12 unverändert) |
| `CombatState.stopReason` fehlt | P3 | **weiterhin P3** (nicht im shared-Typ) |
| Fun-Score (Systeme) | 9,0/10 | **9,0/10** (Δ positiv, Decke = unveränderter Blocker) |

---

## Belege (reale Sim-/Test-Ausgaben)

**Status flat-Symmetrie (KERNFRAGE):** magicDamage-Flat je Tier:
`affix_flame=[1,2,3] · affix_frost=[1,2,3] · affix_shock=[1,2,3]` → **identisch**.
Rider (differenziert, alle live): `flame` burn `{0.15/4, 0.20/8, 0.25/14}` · `frost` slow `{chance↑, mag 1 (fix FROST_SLOW 0,4)}` · `shock` skip `{0.12/0.10, 0.16/0.15, 0.20/0.20}`. (burn-Effekt im Lauf nachweislich aktiv getickt.)

**Endgame 1 h — alle mit Auto-Eat T3 + cooked_voidray (Heal 170):**

| Build (def / maxHp / regen) | Mob | kills | Tode | hpMin | manaMin |
|---|---|---:|---:|---:|---:|
| **Robe-Mage** (245 / 1426 / 14,95) | roc_storm | 518 | **0** | 1142 | 1,5 |
| | void_titan | 320 | **0** | 1141 | 1,5 |
| | last_idol | 270 | **0** | 1141 | 3,0 |
| **Plate-Mage** (534 / 2161 / 10,8) | roc_storm | 374 | **0** | 1729 | 2,2 |
| | void_titan | 211 | **0** | 1729 | 1,1 |
| | last_idol | 176 | **0** | 1730 | 1,1 |
| **Melee** (569 / 2286, +Schild) | roc_storm | 646 | **0** | 2166 | — |
| | void_titan | 338 | **0** | 1829 | — |
| | last_idol | 295 | **0** | 2164 | — |

→ hpMin pinnt in **jedem** Build exakt auf **80 % maxHp** (T3-Schwelle 0,8): 1142/1426 = 0,80 · 1729/2161 = 0,80. Parität: Robe-Mage **80–95 %** Melee-Durchsatz (roc 518/646, void 320/338, idol 270/295); Plate-Mage **58–62 %** (roc 374/646, void 211/338, idol 176/295).

**DEFENSE-MASKING-Probe (der Beleg für den Blocker) — Glass-Cannon = NUR Stab, KEINE Rüstung (def 119):**

| Build | Mob | Tode **mit** Food (T3) | Tode **ohne** Food (Auto-Eat wirkungslos) |
|---|---|---:|---:|
| Glass-Cannon (def 119) | roc_storm | **0** | **34** |
| | void_titan | **0** | **48** |
| | last_idol | **0** | **33** |
| Robe-Mage (def 245) | roc_storm | **0** | 6 |
| | void_titan | **0** | 11 |
| | last_idol | **0** | 6 |
| Plate-Mage (def 534) | roc_storm | **0** | 4 |
| | void_titan | **0** | 7 |
| | last_idol | **0** | 5 |

→ **Doppelter Beweis:** (1) **Ohne** Auto-Eat skaliert Survival sauber mit Defense (Glass 34–48 Tode vs Plate 4–7 Tode → Defense wirkt **6–8×**). (2) **Mit** Auto-Eat T3 kollabiert **alles** — selbst die fast-nackte def-119-Glass-Cannon — auf **0 Tode**. Die Defensiv-Itemisierung ist im Endgame survival-folgenlos, weil der T3-Floor (0,8 / ×1,5 / 170-HP-Food) jeden eingehenden Schaden absorbiert.

**Mana-Lever B (godspark-Regen zurück):** Robe-Mage manaMin **1,5/1,5/3,0** (roc/void/idol) gegen run6 **392** sustained @ roc → Mana drainiert jetzt real auf nahe 0 auf allen Mobs; degradiert determiniert zum Weak-Melee-Loop (×0,35) und läuft via regen nach. Kein Hänger.

**Determinismus (Robe-Mage, void_titan, 1 h):** seed123→319, seed123→319 (bit-gleich), seed777→329 → deterministisch UND seed-sensitiv.

---

## Findings

### [P0] — keine.
Kein Save-Brick, kein NaN-Drift, kein toter Status-Zweig, kein Wall. `castManaCost`-Guard, `FALLBACK_HIT_CHANCE`, `safeInterval`, gedeckelte Mitigation (0,80) / Lifesteal (abs 12) / Mana-Schild halten. Status-DoT/Frost/Shock ticken korrekt.

### [P1] — keine im Systemreview.
Beide R5-Fixes (Status-Symmetrie, Mana-Bite) landen sauber; KERNFRAGE positiv beantwortet. Verbleibendes ist Balance/Design (P2) bzw. Klarheit/Doc (P3).

### [P2 Balance/Design, Haupt-Blocker, Carryover + geschärft] Auto-Eat T3 maskiert die Defense vollständig
**Befund:** Mit Auto-Eat T3 + cooked_voidray pinnt hpMin in **jedem** Endgame-Build auf 80 % maxHp und liefert **0 Tode** — von der nackten Glass-Cannon (def **119**) über Robe-Mage (245) und Plate-Mage (534) bis Melee (569). **Ohne** Food sterben dieselben Builds 4–48×/h, **mit** klarer Defense-Abhängigkeit (Glass 34–48 vs Plate 4–7). Also: Defense IST mechanisch wertvoll (6–8× Todesreduktion), aber Auto-Eat T3 erstickt jeden Unterschied. „Magie-Survival gefixt" ist faktisch „Auto-Eat trägt jeden Build". **Das ist eine Design-Frage, kein Combat-Code-Bug** — bestätigt als Haupt-Blocker für 9,5.
**Fix-Vorschlag (balance-designer):** T3-Schwelle (0,8) und/oder Heileffizienz (×1,5) senken, oder Top-Food relativ zum Endgame-Schaden schwächen, sodass untergerüstete/glassige Builds bei T3 **real sterben** → Defense + Auto-Eat-Upgrades bekommen Survival-Wert zurück.

### [P2 Balance, NEU — an den Blocker gekoppelt] Symmetrische Affixe → flame ist Endgame-BiS, frost/shock-Rider wertlos
**Befund:** Da der Flat-Bonus jetzt identisch ist ([1,2,3]), entscheidet allein der Rider. flames burn-DoT ist **offensiv** (Zusatzschaden), frost (Slow) und shock (Skip) sind **defensiv**. In einem durch Auto-Eat survival-trivialen Endgame ist Defensiv-Wert ≈ 0 → **flame ist die strikt beste Wahl** für jeden DPS-Build. Zusätzlich ist **shock auf void_titan UND last_idol resistet** (`resist:["shock","poison"]`) → der shock-Rider ist auf 2/3 der Top-Mobs komplett tot, während burn/frost greifen. Die flat-Symmetrie ist korrekt, aber sie macht die Rider erst recht zum einzigen Differenzierer — und der fällt zugunsten flame aus.
**Fix-Vorschlag (balance-designer):** Erst nach Behebung des Auto-Eat-Blockers sinnvoll lösbar; dann frost/shock-Rider so positionieren, dass Control echten Wert hat (z.B. shock als DPS-Uptime über enemy-skip statt rein defensiv), und die shock-Resistenz-Verteilung der Top-Mobs gegen die anderen Elemente ausbalancieren.

### [P2 Balance, verbessert + Restposten] Magie-Durchsatz-Parität & „Plate-Mage-Trap"
**Befund:** Die godspark-manaRegen-Rücknahme hat die run6-Inversion (Robe-Mage > Melee) behoben — Robe-Mage liegt jetzt bei **80–95 %** Melee-Durchsatz (gesund). **Aber** der Plate-Mage bleibt bei **58–62 %** Melee bei identischen 0 Toden = weiterhin **Trap-Build** (weniger DPS, kein Sicherheitsvorteil, weil Auto-Eat ohnehin alle bei 0 Toden hält).
**Fix-Vorschlag:** Plate-Mage erst nach dem Auto-Eat-Fix mit echtem Survival-Vorteil belohnen, oder Robe klar als Mage-BiS setzen.

### [P3 Bug, Carryover] `inflict.frost.magnitude` weiter inert (definiert-nie-angewandt)
**Befund:** `tickPlayerEffects`/`tickEnemyEffects` lesen die frost-`magnitude` nie (Frost = fixer `FROST_SLOW=0,4`). Vier Mobs setzen sie trotzdem (`magnitude:1`, content Z. 8579/8848/8881/8986). Unverändert seit run5.
**Fix-Vorschlag:** frost-`magnitude` bei inflict weglassen/0 (Klarheit) **oder** Slow aus magnitude ableiten (variabler Slow → würde frost-Rider auch differenzierbar machen, vgl. NEU-P2).

### [P3 Doc, Carryover] `status-coverage.test.ts` labelt Gegner-Schock weiter falsch als „Schaden-Amp"
**Befund:** Z.12 sagt unverändert „tickEnemyEffects: … shock = Schaden-Amp." Tatsächlich ist Schock beidseitig ein **Angriffs-Aussetzer** (`nextFloat < magnitude` → Treffer ausgelassen, `combat.ts:846/863`). Reiner Doc-Bruch (Verhalten korrekt), aber irreführend.
**Fix-Vorschlag:** Kommentar auf „shock = Angriff aussetzen (Wahrscheinlichkeit = magnitude)" korrigieren.

### [P3 Hinweis, Carryover] `CombatState.stopReason` fehlt weiterhin
**Befund:** `endCombatOutOfAmmo` ist mechanisch korrekt, aber `stopReason` existiert im shared-Typ weiter nicht (0 Treffer) → Out-of-Ammo-Stopp ohne UI-Grund. Außerhalb des Combat-Reviers (shared/UI).

---

## Mechanik-Checks (alle bestanden)
- **Status flat-Symmetrie:** flame=frost=shock=[1,2,3]; Rider differenziert & live (burn-DoT tickt, frost-Slow 0,4, shock-Skip).
- **Mana-Depletion-Loop:** Cast → Weak-Melee (×0,35) → Regen → Resume; deterministisch, hängt bei regen-Boden nicht. Beide Mage-Builds drainieren real (manaMin ~1–3) — Lever B aktiv.
- **Auto-Eat:** T3 = Schwelle 0,8 / healMult ×1,5 (`shared` AUTO_EAT_TIERS unverändert); pinnt hpMin auf exakt 80 % maxHp; greift auch auf DoT-Schaden.
- **Mitigation/Lifesteal/Mana-Schild:** gedeckelt (0,80 / abs 12 / ABSORB_PCT 0,5) — intakt.
- **Determinismus:** gleiche Seed → bit-gleich; andere Seed → abweichend.
- **Guard-Suite:** 46 Tests grün (status-coverage, magic-loop, mana-shield, autoeat-dot, enchant, bleed, poison, endgame-danger).

---

## Was fehlt für 9,5?
1. **Auto-Eat-Dominanz entschärfen (DER Blocker).** Neuer Beleg macht es eindeutig: ohne Food skaliert Survival sauber mit Defense (Glass 34–48 vs Plate 4–7 Tode), aber T3 kollabiert **alles** auf 0 — selbst def 119 nackt. Solange das so ist, trägt Auto-Eat jeden Build und Defensiv-Itemisierung ist survival-folgenlos. T3-Schwelle/Heilrate senken **oder** Top-Food relativ zum Endgame-Schaden schwächen, bis glassige Builds bei T3 **real sterben**.
2. **Affix-Rider-Wert wiederherstellen (Folge von #1).** Die flat-Symmetrie ist richtig, macht aber den Rider zum einzigen Differenzierer — und in einem survival-trivialen Endgame schlägt flame-DoT die frost/shock-Defensiv-Rider, plus shock ist auf 2/3 Top-Mobs resistet. Nach #1 frost/shock einen echten (auch offensiv nutzbaren) Wert geben und die shock-Resistenz-Verteilung der Top-Mobs ausbalancieren.
3. **Plate-Mage-Trap auflösen.** Robe-Mage-Parität ist nach der Mana-Bite gesund (80–95 % Melee); Plate-Mage bleibt 58–62 % = strikt schlechter. Nach #1 mit echtem Survival-Vorteil belohnen oder Robe klar als BiS setzen.
4. **Null „definiert-nie-angewandt"-Oberfläche.** frost-`inflict.magnitude` (4 Mobs) säubern/aktivieren (deckt #2 mit ab), `CombatState.stopReason` einführen, und den „Schaden-Amp"-Kommentar in `status-coverage.test.ts` (Z.12) auf das echte Schock-Aussetzer-Modell korrigieren.
