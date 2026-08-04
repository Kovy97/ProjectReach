# QA-Run 6 — Combat-Systeme: manaCost-Cap (Magie-Endgame-Fragilität), Instanz-Overflow/Auto-Salvage, Auto-Eat-Dominanz

**Tester:** Playtester-Analyst (STRIKT READ-ONLY; einzige Schreibdatei = dieser Bericht) · **Datum:** 2026-06-28
**Scope (Kampf-SYSTEME):** **KERNFRAGE — manaCost-Cap**: Ist die run5-Magie-Endgame-Fragilität (voll-gegeart 4–7 Tode/h) entschärft? · **Instanz-Overflow/Auto-Salvage** (run5 #1/#2) verifiziert · Status-/Auto-Eat-Carryovers (frost-magnitude, Auto-Eat-Tiers, stopReason, status-coverage-Doc) · Determinismus.

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`combatStep`, deterministische Seeds, 1-h-Läufe @ `TICK_MS=100` = 36 000 Ticks), Per-Tick-Tracking von hpMin/manaMin, **nach dem Lauf entfernt**. Zusätzlich 6 kampf-relevante Vitest-Suites grün (**42 Tests**: magic-loop, mana-shield, status-coverage, lifesteal-respawn, mana-equip, enchant). Alle Zahlen unten sind reale Sim-/Test-Ausgaben.

> Hinweis: Der `manaCost-Cap` ist **kein** neuer Code-Lever, sondern eine **Content-Kurven-Kappung**: Top-Tier-`item.manaCost` flach gehalten (Staff geplant 16–24 → real **10**, Wand → **8**). `castManaCost` liest weiterhin `item.manaCost` ungekappt (kein NaN/negativ-Risiko, Guard intakt).

---

## Fun-Score: **9,0 / 10**

Klarer Aufwärts-Run. **Der run5-Haupt-Blocker ist beseitigt** — und zwar robuster als erwartet.

- **manaCost-Cap bestätigt:** Leiter `copper_staff=5 · iron_staff=6 · godiron_staff=10` / `copper_wand=4 · iron_wand=5 · godiron_wand=8`. Top-Tier-Staff von geplant 16–24 auf **10** gekappt.
- **KERNFRAGE beantwortet — Magie stirbt im Endgame NICHT mehr 4–7×/h, sondern 0×/h.** Über **zwei** voll-gegearte BiS-Mage-Builds (Plate **und** Robe) auf allen drei run5-Mobs (roc_storm L75, void_titan L110, last_idol L120): **0 Tode/h**, hpMin gepinnt bei ~80 % maxHp (run5: 4–7 Tode/h, hpMin 1–8).
- **Instanz-Overflow/Auto-Salvage (run5 #1/#2) sitzt:** volles Inventar → Instanz wandert verlustfrei in den Gear-Vault (`kept:true, vaulted:true`, kein Salvage), Auto-Salvage Default **AUS**.
- **Determinismus + Seed-Sensitivität:** seed123→840 Kills (Wiederholung 840, bit-gleich), seed777→857 → deterministisch **und** seed-sensitiv.

Gebremst (kein 9,5) durch eine **ehrliche Nuance der Untersuchung** plus Carryovers: Der manaCost-Cap ist **nicht** der eigentliche Survival-Fix — er ist ein **Durchsatz**-Regler. Im Counterfactual (Staff-manaCost zurück auf pre-Cap 24) sterben beide Mages **weiterhin 0×**, nur ~40 % weniger Kills. Die run5-Todesspirale ließ sich mit **keinem** vernünftigen Endgame-Build reproduzieren — das Survival-Problem ist überbestimmt geschlossen (cheaper Casts + Auto-Eat-T3-Sustain absorbieren es vollständig). Schattenseite: **Auto-Eat T3 dominiert das Überleben so stark, dass es die Defensiv-Stats völlig maskiert** (def 275 Robe ≈ def 524 Plate ≈ 0 Tode). Dazu 3 unveränderte run5-P3-Carryovers und ein Itemisierungs-/Parität-Signal.

---

## Δ vs Run 5

| Thema | Run 5 | Run 6 |
|---|---|---|
| **Magie-Endgame-Survivability (KERNFRAGE)** | **P2** — 4–7 Tode/h (roc 5, void 7, idol 4), hpMin 1–8 | **GELÖST** — **0 Tode/h** über Plate- **und** Robe-Mage, hpMin ~80 % maxHp |
| **manaCost-Cap** | Staff bis ~16 geplant | **gekappt** — Staff 5/6/**10**, Wand 4/5/**8** |
| **manaCost = Survival-Hebel?** | implizit angenommen | **widerlegt** — Counterfactual (Staff 24) = weiterhin 0 Tode, nur −40 % Kills → reiner **Durchsatz**-Regler |
| **Mana drainiert real (Lever B)** | manaMin 0 | **weiter aktiv** — Plate-Mage manaMin 0; Robe-Mage manaMin 392→1 (godspark-regen 13.4 hält fast) |
| **Instanz-Overflow → kein stiller Verlust (#1)** | gefixt | **bestätigt** — Overflow → Vault `vaulted:true`, verlustfrei |
| **Auto-Salvage opt-in (#2)** | gefixt | **bestätigt** — Default AUS, greift nur bei Flag+voll/low-quality |
| Auto-Eat-Tiers = wirkungsloser Survival-Sink | P2 | **weiterhin P2 + verschärft** — T3-Floor (0,8/×1,5) pinnt hpMin auf 80 % und **maskiert Defensiv-Stats** (def 275 = def 524 = 0 Tode) |
| Stil-Durchsatz-Parität (Magie vs Melee) | nicht isoliert | **NEU P2** — Plate-Mage ~53 % der Melee-Kills/h; Robe-Mage konkurrenzfähig (roc 2955 > Melee 2700) → **Plate-Mage = Trap-Build** |
| `inflict.frost.magnitude` inert (4 Mobs) | P3 | **weiterhin P3** (unverändert, magnitude:1 nie gelesen) |
| `status-coverage.test.ts` „shock = Schaden-Amp" | P3 (NEU) | **weiterhin P3** (Z.12 unverändert) |
| `CombatState.stopReason` fehlt | P3 | **weiterhin P3** (nicht im shared-Typ) |
| Fun-Score (Systeme) | 8,5/10 | **9,0/10** |

---

## Belege (reale Sim-/Test-Ausgaben)

**manaCost-Leiter (Cap-Check):** `copper_staff=5 iron_staff=6 godiron_staff=10 · copper_wand=4 iron_wand=5 godiron_wand=8`. Top: Staff **10**, Wand **8**.

**Magie-Endgame 1 h — Plate-Mage** (godiron_staff[2H,Burn-DoT mag31] + godiron-Plate, Auto-Eat T3, cooked_voidray; maxMana 395, regen 8, **def 524**, maxHp 2715):

| Mob (Lvl) | kills/h | Tode | hpMin | manaMin |
|---|---:|---:|---:|---:|
| roc_storm (75) | 1509 | **0** | 2173 | 0,0 |
| void_titan (110) | 834 | **0** | 2173 | 0,0 |
| last_idol (120) | 735 | **0** | 2174 | 0,0 |

(Lean-Variante maxMana 393/regen 7.8/def 517: roc 1492/0/2096 · void 822/0/2093 · idol 718/0/2093 — identisches 0-Tode-Bild.)

**Magie-Endgame 1 h — Robe-Mage** (godiron_staff + volles godspark-Set, Auto-Eat T3; maxMana 474, **regen 13.4**, **def 275**, maxHp 1996):

| Mob (Lvl) | kills/h (Cap 10) | Tode | hpMin | manaMin | kills/h (pre-Cap 24) | Tode |
|---|---:|---:|---:|---:|---:|---:|
| roc_storm (75) | 2955 | **0** | 1981 | 392 | 1760 | **0** |
| void_titan (110) | 1548 | **0** | 1605 | 1,3 | 1029 | **0** |
| last_idol (120) | 1387 | **0** | 1599 | 4,0 | 895 | **0** |

→ **Counterfactual-Beweis:** Staff-manaCost 10 vs 24 ändert **nur den Durchsatz** (−40 %), **nicht die Todesrate** (0 ↔ 0). Der Cap ist ein Durchsatz-Regler, kein Survival-Fix. (Gleiches Bild beim Plate-Mage: pre-Cap 24 → roc 1072/0/2177 · void 585/0/2173 · idol 511/0/2174.)

**Melee-Endgame 1 h (Vergleich)** (godiron-Voll-Set + Schild, Auto-Eat T3; def 590, maxHp 2840):

| Mob (Lvl) | kills/h | Tode | hpMin |
|---|---:|---:|---:|
| roc_storm (75) | 2700 | 0 | 2822 |
| void_titan (110) | 1614 | 0 | 2760 |
| last_idol (120) | 1353 | 0 | 2802 |

→ **Durchsatz-Parität:** Plate-Mage = **53–56 %** der Melee-Kills/h (safe, aber halber Loot/Gold-Durchsatz). Robe-Mage ist konkurrenzfähig bis überlegen (roc 2955 > Melee 2700), weil das godspark-Set den Pool fast sustained. **Plate-Mage ist somit strikt schlechter (= Trap-Build): geringere DPS UND nicht sicherer (beide 0 Tode).**

**Auto-Eat-Dominanz (Survival-Maskierung):** hpMin pinnt in **jeder** Konfiguration bei ~80 % maxHp (T3-Schwelle 0,8, healMult ×1,5, cooked_voidray 170 HP). Robe-Mage def 275 und Plate-Mage def 524 liefern **dasselbe** 0-Tode-/80-%-Outcome → die Defensiv-Stats sind survival-folgenlos.

**Instanz-Overflow/Auto-Salvage:** `autoSalvageDefault=false`, volles Inventar → `kept=true vaulted=true salvaged=false`, Vault-Länge 1 (verlustfrei, kein Phantom-Count).

**Determinismus (Magie, void_titan, 1 h):** seed123→840, seed123→840 (bit-gleich), seed777→857 → deterministisch UND seed-sensitiv.

---

## Findings

### [P0] — keine.
Kein Save-Brick, kein NaN-Drift, kein toter Status-Zweig, kein Wall. `castManaCost`-Guard (NaN/negativ → MANA_PER_CAST), `FALLBACK_HIT_CHANCE`, `safeInterval`, gedeckelte Mitigation/Lifesteal/Mana-Schild und der verlustfreie Instanz-Vault-Overflow halten.

### [P1] — keine im Systemreview.
Die KERNFRAGE-Fragilität ist beseitigt (0 Tode). Die verbleibenden Punkte sind Balance/Itemisierung (P2) bzw. Klarheits-/Doc-Themen (P3).

### [P2 Balance/Design, verschärft] Auto-Eat T3 dominiert das Überleben und maskiert alle Defensiv-Stats
**Befund:** Mit Auto-Eat T3 + cooked_voidray pinnt hpMin in **jedem** Endgame-Build auf ~80 % maxHp — unabhängig von der Defense. Ein Robe-Mage (def **275**) und ein Plate-Mage (def **524**) sterben **beide 0×** und sitzen beide am 80-%-Floor. Damit ist (a) die run5-Magie-Fragilität überbestimmt geschlossen (gut), aber (b) Defensiv-Itemisierung im Endgame survival-folgenlos und die Auto-Eat-Tiers bleiben ein kosmetischer Floor statt echter Survival-Progression (run5-P2, jetzt mit Stat-Maskierung belegt). Der manaCost-Cap als „Survival-Fix" ist faktisch nicht der wirksame Hebel — er reguliert Durchsatz.
**Fix-Vorschlag (balance-designer):** T3-Schwelle/Heileffizienz senken oder das Top-Food relativ zum Endgame-Schaden schwächen, sodass untergerüstete/glassige Builds bei T3 **tatsächlich riskieren** zu sterben → Defense und Auto-Eat-Upgrades bekommen wieder Survival-Wert. (Kein Combat-Code-Bug.)

### [P2 Balance, NEU] Magie-Durchsatz-Parität & „Plate-Mage-Trap"
**Befund:** Endgame-Durchsatz Plate-Mage ≈ 53–56 % der Melee-Kills/h (roc 1509 vs 2700, void 834 vs 1614, idol 735 vs 1353) → halber Loot/Gold-Durchsatz bei voller Sicherheit. Der Robe-Mage (godspark, manaRegen 13.4) schließt die Lücke (roc 2955 > Melee 2700) bei ebenfalls 0 Toden. Folge: **Plate auf einem Magier ist ein Trap-Build** — geringere DPS und kein Sicherheitsvorteil. Die Stil-Wahl reduziert sich für Magie auf „richtige Robe = konkurrenzfähig / Plate = strikt schlechter".
**Fix-Vorschlag (balance-designer):** Plate-Mage entweder mit echtem Survival-Vorteil belohnen (greift erst, wenn Auto-Eat-Dominanz aus P2 oben behoben ist) **oder** die Robe als klare Mage-BiS positionieren und den Durchsatz-Gap zwischen Robe-Mage und Melee feinjustieren (Robe-Mage liegt aktuell streckenweise über Melee).

### [P3 Bug, Carryover] `inflict.frost.magnitude` weiter inert (definiert-nie-angewandt)
**Befund:** `tickPlayerEffects`/`tickEnemyEffects` lesen die frost-`magnitude` **nie** (Frost = fixer `FROST_SLOW`). Vier Mobs setzen sie trotzdem (`magnitude:1`, content/index Zeilen 8501/8770/8803/8908). Unverändert seit run5.
**Fix-Vorschlag:** frost-`magnitude` bei inflict weglassen/0 (Klarheit) **oder** Slow aus magnitude ableiten (variabler Slow).

### [P3 Doc, Carryover] `status-coverage.test.ts` labelt Gegner-Schock weiter falsch als „Schaden-Amp"
**Befund:** Z.12 sagt unverändert „tickEnemyEffects: … shock = Schaden-Amp." Tatsächlich ist Schock beidseitig ein **Angriffs-Aussetzer** (`nextFloat < magnitude` → Treffer ausgelassen, `combat.ts:846/863`). Reiner Doc-Bruch (Verhalten korrekt), aber irreführend.
**Fix-Vorschlag:** Kommentar auf „shock = Angriff aussetzen (Wahrscheinlichkeit = magnitude)" korrigieren.

### [P3 Hinweis, Carryover] `CombatState.stopReason` fehlt weiterhin
**Befund:** `endCombatOutOfAmmo` ist mechanisch korrekt, aber `stopReason` existiert im shared-Typ weiter nicht → Out-of-Ammo-Stopp ohne UI-Grund. Außerhalb des Combat-Reviers (shared/UI).

---

## Mechanik-Checks (alle bestanden)
- **manaCost-Cap:** Content-Kurve flach (Staff 5/6/10, Wand 4/5/8); `castManaCost` liest `item.manaCost`, Guard (NaN/negativ → `MANA_PER_CAST`) intakt.
- **Mana-Depletion-Loop:** Cast → Weak-Melee (×0,35) → Regen → Resume; deterministisch, hängt bei manaRegen-Boden nicht (degradiert zum Dauer-Weak-Melee). Plate-Mage drainiert real (manaMin 0, Lever B aktiv); Robe-Mage sustained fast.
- **Instanz-Intake:** Auto-Salvage opt-in (Default AUS) → sonst `addInstance` → bei vollem Inventar verlustfrei in `bankInstances` (Vault), `kept:true vaulted:true`. Kein stiller Verlust, kein Doppel-Salvage.
- **Mana-Schild:** gedeckelt (ABSORB_PCT 0,5), Cast-Reserve-Floor (Hebel C) + Tier-Skalierung (Hebel B) → endlicher Pool.
- **Determinismus:** gleiche Seed → bit-gleich; andere Seed → abweichend.
- **Guard-Suite:** 42 Tests grün (magic-loop, mana-shield, status-coverage, lifesteal-respawn, mana-equip, enchant).

---

## Was fehlt für 9,5?
1. **Auto-Eat-Dominanz entschärfen (Haupt-Blocker jetzt).** T3 (0,8/×1,5) + Top-Food pinnt hpMin bei 80 % und maskiert die Defense vollständig (def 275 = def 524 = 0 Tode). Solange das so ist, ist „Magie-Survival gefixt" eher „Auto-Eat trägt jeden Build" als echte Combat-Balance. T3-Schwelle/Heilrate senken oder Top-Food relativ zum Endgame-Schaden schwächen, sodass untergerüstete/glassige Builds bei T3 **real sterben** → Defense + Auto-Eat-Upgrades bekommen Survival-Wert zurück.
2. **Magie-Durchsatz-Parität sauber ziehen.** Plate-Mage (~53 % Melee-Durchsatz) als Trap auflösen: entweder echten Survival-Vorteil geben (nach #1) oder Robe als klare Mage-BiS setzen und den Robe-Mage-vs-Melee-Durchsatz feinjustieren (Robe-Mage liegt streckenweise über Melee).
3. **Null „definiert-nie-angewandt"-Oberfläche.** frost-`inflict.magnitude` (4 Mobs) säubern/aktivieren, `CombatState.stopReason` einführen (UI-Grund für Munitions-Stopp), und den „Schaden-Amp"-Kommentar in `status-coverage.test.ts` (Z.12) auf das echte Schock-Aussetzer-Modell korrigieren.
