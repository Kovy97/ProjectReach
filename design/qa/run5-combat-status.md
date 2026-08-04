# QA-Run 5 — Combat-Systeme: affix_shock, DoT-Tri-Damage-Garantie, Mana-Schild (Lever B), Auto-Eat, Overnight-Auto-Restart, Lifesteal

**Tester:** Playtester-Analyst (STRIKT READ-ONLY; einzige Schreibdatei = dieser Bericht) · **Datum:** 2026-06-28
**Scope (Kampf-SYSTEME, nicht Stil-Parität als Selbstzweck):** **NEU affix_shock + rune_storm i/ii/iii** (Schock-Affix end-to-end), **DoT-/Tri-Damage-Garantie** (flat Affix-Schaden trotz Resist), Status-Effekte (burn/bleed/poison/frost/shock) · Auto-Eat (food-empty-Safety + **curesPoison run4-P3 Fix**) · **Overnight-Auto-Restart (run4-P1/P2 Fix)** · **Mana-Schild Tier-Skalierung (Parität-R2 Lever B → run4-P2 Fix)** · Lifesteal-Doppeldeckel · enrage/regen/inflict · „definiert-nie-angewandt"-Suche · Determinismus.

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`combatStep`, deterministische Seeds, 1-h-Läufe @ `TICK_MS=100`), nach dem Lauf **entfernt**. Zusätzlich 15 kampf-/status-relevante Vitest-Suites grün verifiziert (**55 Tests**: status-coverage, combat-autorestart, autoeat-dot, mana-shield, lifesteal-respawn, endgame-danger, resistances, poison, bleed, enrage, regen, player-status, instance-weapon-effect, enchant, ranged-effect). Alle Zahlen unten sind reale Sim-/Test-Ausgaben.

---

## Fun-Score: **8,5 / 10**

Netto-Aufwärts-Run. **Drei offene run4-Punkte sind geschlossen** und der **neue Schock-Pfad landet sauber**:
- **affix_shock + rune_storm i/ii/iii** sind vollständig verdrahtet (Affix-Registry → Rune-Items → 3 Rezepte → `effectiveInstanceWeaponEffects` → `applyEnemyStatus`). Im Sim wird der Schock-Status real auf den Gegner angewandt.
- **DoT-/Tri-Damage-Garantie bestätigt:** Der flat `bonusByTier` (Sturm/Frost 1/2/3, Flamme 1/2/4) geht via `instanceBonusDelta` in `computeStats` ein und greift **unabhängig vom Monster-Resist** — gegen einen schock-immunen Mob (`void_titan` resist shock) ist der Proc geblockt, die **+3 Flat-Damage bleiben**. Die Rune ist auf Resist-Mobs also nicht wertlos. Das war der Kern-Fix von run5 und sitzt.
- **run4-P2 Mana-Schild-quasi-gratis: GEFIXT** via Lever-B-Tier-Skalierung (`MANA_SHIELD_TIER_DIVISOR=50`). Mana ist im Endgame jetzt eine echte Ressource (manaMin **0** statt run4: 90).
- **run4-P1/P2 Overnight-Auto-Restart** und **run4-P3 curesPoison-Auto-Eat: GEFIXT** (Code + grüne Tests + Sim bestätigt).

Gebremst (kein 9+) durch eine **Nebenwirkung des Mana-Fixes**: Da Mana am Endgame jetzt **jeden** High-Level-Kampf vollständig drainiert, kippt der Magier in einen Tod-Spiral (kein Schild **und** Weak-Melee 0,35× zugleich) und stirbt voll-gegeart 4–7×/h, während Melee 0× stirbt. Dazu zwei Carryover-Schwächen (Auto-Eat-Tiers weiter wirkungslos für Survival; frost-`magnitude` weiter inert) und ein neuer Doc-Bruch.

---

## Δ vs Run 4

| Thema | Run 4 | Run 5 |
|---|---|---|
| **affix_shock + rune_storm (NEU)** | fehlte (run4-enchantment P3) | **gelandet & verifiziert** — T3 `shock chance0.20/mag0.20/5000`, Status im Sim angewandt |
| **Tri-Damage-Garantie (flat Affix-Dmg trotz Resist)** | n/a | **bestätigt** — `+3` flat bleibt gegen shock-immunen `void_titan`, Proc geblockt |
| **Mana-Schild quasi-gratis (P2 Carryover)** | offen (manaMin 90, nie leer) | **GEFIXT** (Lever B) — manaMin **0,0**, Mana real knapp am Endgame |
| **curesPoison im Auto-Eat (run4 P3)** | offen | **GEFIXT** (`combat.ts:84-88` + grüner Test) |
| **Overnight-Auto-Restart (run4 P1/P2)** | gefordert | **GEFIXT** — Tod im Normalkampf = Auto-Neustart, Nacht läuft durch |
| **Lifesteal-Doppeldeckel** | gelandet | **bestätigt** (min(5%·maxHp, abs 12), grün) |
| Auto-Eat-Tiers = wirkungsloser Survival-Sink | P2 | **weiterhin P2** — T0 stirbt selbst L30-vs-L110 nicht (0 Tode); Tiers heben nur den HP-Floor |
| `inflict.frost.magnitude` inert | P3 (2 Mobs) | **weiterhin P3** (jetzt 4 Mobs sichtbar) |
| Magie-Endgame-Survivability vs Melee | nicht isoliert | **NEU P2** — Nebenwirkung des Mana-Fixes: 4–7 Tode/h (Magie) vs 0 (Melee) |
| Fun-Score (Systeme) | 8/10 | **8,5/10** |

---

## Belege (reale Sim-/Test-Ausgaben)

**affix_shock + Tri-Damage-Garantie**
- `affix_shock` T3 → `effectiveInstanceWeaponEffects` liefert `{type:"shock", chance:0.20, magnitude:0.20, durationMs:5000}`; flat `instanceBonusDelta` = `{meleeDamage:3, rangedDamage:3, magicDamage:3}`.
- `monsterResists(void_titan,"shock") = true` → Proc geblockt, **flat +3 bleibt** (über `computeStats`). **Tri-Damage-Garantie bestätigt.**
- Sim Bronzeschwert+Sturm-Rune T3 vs `goblin` (kein Resist): Schock-Status `kind:"status", status:"shock", by:"player"` **angewandt = true**.

**DoT exakt (mag 10, 1 Tick = 100 ms):** burn/bleed/poison = **1,000 HP/Tick** Netto (10 × 0,1, voll gegen Rüstung) → **Rüstungs-Bypass bestätigt**, symmetrisch.

**Geared Melee 1 h (godiron-Set, Auto-Eat T3, cooked_shark):**

| Build / Mob | kills/h | Tode | hpMin | def |
|---|---:|---:|---:|---:|
| Greatsword *power* vs void_titan | 454 | 0 | 2002 | – |
| Greatsword *power* vs charred_doomknight | 472 | **5** | 0 | – |
| Greatsword *power* vs last_idol | 367 | 0 | 2210 | – |
| **1H+Schild *defensive*** vs charred_doomknight | 347 | **0** | 1564 | 686 |
| 1H+Schild *defensive* vs void_titan | 281 | 0 | 2133 | 686 |
| 1H+Schild *defensive* vs last_idol | 239 | 0 | 2222 | 686 |

→ **Endgame-Danger ist gesund kalibriert:** der aggressive Greatsword-Glass-Build kassiert an `charred_doomknight` (burn-inflict + enrage 0,25/×1,80) gelegentliche Tode, der Tank-Build (1H+Schild, defensiv) bleibt überall bei **0 Toden**. Auto-Restart verhindert in beiden Fällen jeden Wall (kills/h laufen weiter).

**Mana-Schild Lever B (godiron_staff + godiron-Plate + focus, Auto-Eat T3):**

| Mob (Lvl) | manaMin | maxMana | regen/s | def | kills/h | Tode | hpMin |
|---|---:|---:|---:|---:|---:|---:|---:|
| roc_storm (75) | **0,0** | 358 | 6,8 | 528 | 522 | 5 | 8 |
| void_titan (110) | **0,1** | 358 | 6,8 | 528 | 282 | 7 | 2 |
| last_idol (120) | **0,1** | 358 | 6,8 | 528 | 240 | 4 | 1 |

→ Mana **drainiert jetzt auf 0** (run4: manaMin 90) → **Lever B greift, Mana-Schild ist nicht mehr gratis**. Schattenseite: der Magier stirbt voll-gegeart 4–7×/h bei hauchdünnem hpMin (1–8), Melee 0× — siehe [P2 NEU].

**Auto-Eat-Tiers (L30, bronze, no-armor, gegen über-Level-Mobs):**

| Mob | T0 Tode / hpMin | T3 Tode / hpMin |
|---|---|---|
| abyssal_tide_serpent (L96) | 0 / 210 | 0 / 383 |
| void_titan (L110) | 0 / 124 | 0 / 299 |

→ Tiers heben den **HP-Floor** (124→299), ändern aber **Survival-Outcome (0 Tode) und Durchsatz nie** — selbst L30-Bronze vs L110-Titan überlebt bei T0. [P2 Carryover].

**Determinismus:** Seed 123 → 792 Kills, Wiederholung 123 → 792 (bit-gleich), Seed 124 → 793 → **deterministisch UND seed-sensitiv.**

---

## Findings

### [P0] — keine.
Kein Save-Brick, kein NaN-Drift, kein toter Status-Zweig, kein Wall. Engine-Guards (`FALLBACK_HIT_CHANCE`, `safeInterval`, gedeckelte Mitigation/Lifesteal/Mana-Schild) + `status-coverage`-Anti-Regression halten; affix_shock ist beidseitig behandelt.

### [P1] — keine im Systemreview.
(Die Magie-Endgame-Fragilität unten ist ein Balance-/Parität-Thema — als P2 geführt, mit Hinweis an balance-designer. Kein Wall dank Auto-Restart.)

### [P2 Balance, NEU] Magie-Endgame-Survivability bricht ein — Nebenwirkung des Mana-Schild-Fixes
**Befund:** Lever B nerft den Mana-Schild korrekt (manaMin 90→0). Folge: am High-Level-Mob ist Mana **jeden** Kampf komplett leer → der Magier verliert gleichzeitig (a) den Mana-Schild und (b) die Offensive (Weak-Melee ×`MAGIC_WEAK_FACTOR`=0,35). Das erzeugt einen Tod-Spiral, den Melee strukturell nicht hat: voll-gegeart 4–7 Tode/h (roc_storm 5, void_titan 7, last_idol 4) bei hpMin 1–8, gegen Melee 0 Tode / hpMin 1564–2222 auf denselben Mobs. Kein Wall (Auto-Restart farmt weiter), aber ein klarer Stil-Nachteil im Endgame, der vor run5 nicht existierte.
**Fix-Vorschlag (balance-designer):** den Drain abfedern, z.B. (i) Mana-Schild-Mindest-Floor/Cooldown statt Voll-Drain, (ii) Weak-Melee-Strafe am Endgame milder, oder (iii) Magier ein eigenes Defensiv-Lever (manaRegen-Skalierung mit magic_def) geben, sodass voll-gegearte Magie ≈ Melee-Todesrate erreicht.

### [P2 Design, Carryover] Auto-Eat-Tiers bleiben ein wirkungsloser Survival-Gold-Sink
**Befund:** Tiers skalieren nachweisbar den HP-Floor (hpMin T0→T3: 124→299 / 210→383), aber das **Survival-Outcome ändert sich nie**: T0 überlebt selbst eine absurde L30-Bronze-vs-L110-Titan-Paarung mit 0 Toden, Durchsatz T0=T3 identisch. Die Upgrades (2 000/8 000/25 000 Gold) kaufen nur einen kosmetischen Sicherheitspuffer, keine reale Survival-Progression. Identisch zu run4-P2 (run4 maß nur kills/Tode → „0 Differenz"; der HP-Floor differenziert zwar, ändert das Outcome aber nicht).
**Fix-Vorschlag:** T0 mit niedrigerer Schwelle/Heileffizienz starten, sodass untergerüstete Builds bei T0 **tatsächlich sterben** → das Upgrade bekommt Wert.

### [P3 Bug, Carryover] `inflict.frost.magnitude` weiter inert (definiert-nie-angewandt)
**Befund:** Frost wirkt als fixer Slow (`FROST_SLOW`); `tickPlayerEffects`/`tickEnemyEffects` lesen die frost-`magnitude` **nie**. Vier Mobs setzen sie trotzdem: `skeleton_icemage`, `gravecliff_specter`, `abyssal_tide_serpent`, `gaze_basilisk` (alle `magnitude:1`) — inerter Content-Wert, suggeriert eine Frost-Stärke, die es nicht gibt. (run4-P3, jetzt mit allen 4 betroffenen Mobs benannt.)
**Fix-Vorschlag:** frost-`magnitude` bei inflict weglassen/0 (Klarheit) **oder** Frost-Slow aus magnitude ableiten (variabler Slow), falls gewollt.

### [P3 Hinweis, Carryover] `CombatState.stopReason` fehlt weiterhin
**Befund:** Der Munitions-Stopp (`endCombatOutOfAmmo`) ist mechanisch korrekt, aber der TODO-Andockpunkt `stopReason` existiert im shared-Typ noch nicht (`"stopReason" in combat = false`) → Out-of-Ammo-Stopp ohne UI-Grund. Außerhalb des Combat-Reviers (shared/UI).

### [P3 Doc, NEU] `status-coverage.test.ts` labelt Gegner-Schock falsch als „Schaden-Amp"
**Befund:** Kommentar Z.13 sagt „tickEnemyEffects: … shock = Schaden-Amp." Tatsächlich ist Schock beidseitig ein **Angriffs-Aussetzer** (`nextFloat < magnitude` → Treffer ausgelassen, `combat.ts:846/863`), keine Schadensverstärkung. Reiner Doc-Bruch (Verhalten korrekt), aber irreführend für die nächste Person, die das Schock-Modell aus dem Test liest.
**Fix-Vorschlag:** Kommentar auf „shock = Angriff aussetzen (Wahrscheinlichkeit = magnitude)" korrigieren.

---

## Mechanik-Checks (alle bestanden)
- **affix_shock end-to-end:** Affix-Registry (`bonusByTier` 1/2/3 + `weaponEffectByTier` shock 0.12/0.16/0.20) → `rune_storm_i/ii/iii` (rune-Feld) → 3 Rezepte (`rune_affixes`) → `effectiveInstanceWeaponEffects` → `applyEnemyStatus` (Refresh-statt-Stack, resist-geblockt). 0 verwaiste Runen.
- **Tri-Damage-Garantie:** flat `bonusByTier` über `instanceBonusDelta` in `computeStats` — resist-unabhängig (Proc resistbar, Flat-Damage nicht).
- **DoT:** burn/bleed/poison = `magnitude × TICK/1000`, Rüstungs-Bypass (1,0/Tick @ mag10). frost = Slow, shock = Aussetzer (magnitude = Skip-Chance). Symmetrisch Spieler↔Gegner.
- **Mana-Schild:** gedeckelt (`ABSORB_PCT 0.5`), Cast-Reserve-Floor (Hebel C) + Tier-Skalierung (Hebel B) → endlicher Pool, drainiert real (manaMin 0).
- **Lifesteal:** Doppeldeckel min(5%·maxHp, abs 12), nur melee, Respawn-Voll-Heal umgeht den Pro-Treffer-Cap nicht.
- **Overnight-Auto-Restart:** Normalkampf-Tod → Neustart (monsterId bleibt, voll geheilt, transient verfällt, Tod gezählt, keine Reward); Dungeon-Tod → harter Abbruch.
- **curesPoison Auto-Eat:** filtert aktiven Poison-DoT identisch zu `useConsumable`.
- **Gegner:** regen (gedeckelt), enrage (×Mult unter belowHpPct), inflict (auf Spieler) — alle aktiv.
- **Determinismus:** gleiche Seed → bit-gleich; andere Seed → abweichend.

---

## Was fehlt für 9,5?
1. **Magie-Endgame-Parität reparieren (Haupt-Blocker).** Der Mana-Fix hat „gratis Schild" gegen „Tod-Spiral bei leerem Pool" getauscht: voll-gegearte Magie stirbt 4–7×/h, Melee 0×. Ein Mindest-Floor/Cooldown für den Mana-Schild **oder** ein milderer Weak-Melee-Penalty am Endgame **oder** ein magic_def-gekoppeltes manaRegen-Lever, bis armored Magie ≈ Melee-Todesrate liegt.
2. **Auto-Eat-Tiers mit echtem Survival-Wert.** T0 darf untergerüstete Spieler tatsächlich sterben lassen (niedrigere Schwelle/Heilrate), damit die 2k/8k/25k-Gold-Upgrades reale Progression statt eines kosmetischen HP-Floors kaufen.
3. **Null „definiert-nie-angewandt"-Oberfläche.** frost-`inflict.magnitude` (4 Mobs) säubern oder aktivieren, `CombatState.stopReason` einführen (UI-Grund für Munitions-Stopp), und den „Schaden-Amp"-Kommentar in `status-coverage.test.ts` auf das echte Schock-Aussetzer-Modell korrigieren.
