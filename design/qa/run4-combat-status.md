# QA-Run 4 — Combat-Systeme: Status-Effekte, Auto-Eat, Lifesteal, Mana-Schild, Gegner-Mechaniken

**Tester:** Playtester-Analyst (STRIKT READ-ONLY; einzige Schreibdatei = dieser Bericht) · **Datum:** 2026-06-27
**Scope (quer durch die Kampf-SYSTEME, nicht Stil-Parität):** alle Status-Effekte (burn/bleed/poison/frost/shock) — Anwendung, DoT-Ticks, Resists, Immunität · Auto-Eat-Tiers · Lifesteal · Mana-Schild · Gegner-regen/enrage/inflict inkl. der **5 neuen Endgame-Mobs** · **ranged weaponEffect via Enchant-Instanz respektiert Munition (NEU)** · Determinismus · "definiert-aber-nie-angewandt"-Felder · 0 Tode / 0 Walls.

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`combatStep`/`advance`, deterministische Seeds), nach dem Lauf **entfernt**. Zusätzlich die 47 kampf-/status-relevanten Vitest-Suites grün verifiziert (`vitest run`: status-coverage, regen, resistances, poison, bleed, autoeat-dot, player-status, combatlog-status, enrage, ranged-effect, endgame-danger, mana-shield, ammo-quiver, instance-weapon-effect, vitality). `TICK_MS = 100 ms` (relevant für die DoT-Zahlen). Alle Zahlen unten sind reale Sim-/Test-Ausgaben.

---

## Fun-Score: **8 / 10**

Auf der **Systemachse** (nicht Stil-Parität — das war Run-3-Fokus) ist der Kampf sehr gesund. Alle fünf Status-Effekte wirken symmetrisch und deterministisch, DoT ignoriert korrekt die Rüstung, Resists/Immunitäten greifen, die **5 neuen Endgame-Mobs sind vollständig verdrahtet** (regen/inflict/enrage/resist alle aktiv) und über alle ~Monster gilt weiterhin **0 Walls / 0 Tode** für einen geared Helden. Der **NEUE Fix — Ranged-Waffeneffekt via Enchant-Instanz respektiert Munition** — ist sauber gelandet: mit Munition feuert der Frost-Affix, ohne Munition trägt der improvisierte Schlag keinen Effekt. +1 ggü. Run 3, weil die zu prüfenden Fixes alle sitzen und kein Systembug auftauchte.

Gebremst (nicht höher) durch **dekorative Ressourcen-Systeme**: Mana läuft im Dauerkampf **nie** leer (Mana-Schild = quasi-gratis Dauer-Defensive — Run-3-Carryover), und die **Auto-Eat-Tiers sind ein wirkungsloser Gold-Sink** — T0…T3 liefern in jedem Drucktest identischen Durchsatz bei 0 Toden. Dazu ein neuer kleiner Konsistenzbruch: **`curesPoison` wird im Auto-Eat-Pfad stillschweigend ignoriert**.

---

## Δ vs Run 3

| Thema | Run 3 | Run 4 |
|---|---|---|
| **Ranged-Effekt via Enchant-Instanz respektiert Munition (NEU)** | n/a | **Gelandet & verifiziert** — mit Munition Frost=true, ohne Munition Frost=false |
| **5 neue Endgame-Mobs (Run-3 Fix A, L87–110)** | gefordert (Endgame-Lücke) | **integriert** — alle Felder verdrahtet, 0 Walls, 103–172 kills/h |
| 0 Tode / 0 Walls | bestätigt | **bestätigt** (Wall-Scan ALLER Monster, geared L90: 0/0) |
| Status-System vollständig & symmetrisch | bestätigt | bestätigt + DoT-Rüstungs-Bypass exakt vermessen |
| Mana nie leer / Mana-Schild quasi-gratis (P2) | offen | **weiterhin offen** (maxMana 269, regen 12.1/s, manaMin 90) |
| Auto-Eat trivialisiert Survival | qualitativ | **quantifiziert**: Tiers geben 0 Differenzierung |
| `curesPoison` im Auto-Eat | nicht geprüft | **NEU als P3**: im Auto-Eat-Pfad nicht angewandt |
| Fun-Score (Systeme) | 7/10 | **8/10** |

---

## Belege (reale Sim-/Test-Ausgaben)

**5 neue Endgame-Mobs** (geared L90, Götzeneisen-Set, Auto-Eat T3, 1 h Sim):

| Mob | Lvl | regen | inflict | enrage | resist | kills/h | Tode | s/Kill |
|---|---:|---:|---|---|---|---:|---:|---:|
| gravecliff_specter | 87 | 3 | frost | – | bleed/poison | 166 | 0 | 21.7 |
| voidhusk_crusher | 90 | 4 | burn | 0.30 / ×1.65 | shock/burn | 172 | 0 | 20.9 |
| abyssal_tide_serpent | 96 | 5 | frost | – | burn/bleed | 141 | 0 | 25.5 |
| charred_doomknight | 101 | 5 | burn | 0.25 / ×1.80 | frost/bleed | 143 | 0 | 25.2 |
| void_titan | 110 | 6 | shock | 0.30 / ×1.75 | shock/poison | 103 | 0 | 35.0 |

- **Wall-Scan (ALLE Monster, geared L90):** Walls gesamt = **0**, Tode gesamt = **0**. → **0 Tode / 0 Walls bestätigt.**
- **DoT exakt (mag 10, 1 Tick = 100 ms):** burn/bleed/poison jeweils **1,00 HP/Tick** Netto-Abzug, voll gegen def=44 → **Rüstungs-Bypass bestätigt** (10 × 0,1 = 1,0, keine Mitigation).
- **Monster-Inflict auf Spieler:** void_titan→shock, gravecliff→frost, voidhusk→burn — alle **auf den Spieler angewandt = true**.
- **Auto-Eat-Tiers (Drucktest L40, nur Leder, cooked_trout vs abyssal_tide_serpent L96):** T0/T1/T2/T3 = **93/93/93/93 kills/h, je 0 Tode** → Tiers ohne messbaren Effekt.
- **Mana-Schild (Magier L90, aether_runestaff vs void_titan):** maxMana 269, manaRegen 12,1/s, **manaMin über den Lauf = 90** → Pool nie leer; Schild ist zuverlässig, aber ressourcenlos.
- **Lifesteal (melee):** Cap = `min(5 % maxHp = 46, abs 12) = 12`/Treffer, doppelt gedeckelt — per Code + grüner mana-shield/lifesteal-Suite belegt (Isolations-Sim war durch den Death-Reset kontaminiert und daher nicht herangezogen).
- **Ranged-Enchant-Instanz respektiert Munition (NEU):** mit Munition `frostApplied = true` (Köcher zählt runter), **ohne Munition `frostApplied = false`** → Effekt-Gate via `appliesEffect = firesAmmo` greift.
- **Determinismus:** Seed 123 → 107 Kills, Wiederholung Seed 123 → 107 Kills (bit-gleich), Seed 124 → 104 Kills → **deterministisch UND seed-sensitiv**.

---

## Findings

### [P0] — keine.
Kein Save-Brick, kein NaN-Drift, kein toter Status-Zweig, kein Wall, kein Tod. Die Engine-Guards (`FALLBACK_HIT_CHANCE`, `safeInterval`, gedeckelte Mitigation/Lifesteal/Mana-Schild) und die `status-coverage`-Anti-Regression (jeder inflict-/weaponEffect-/Pet-Status-Typ wird beidseitig behandelt) halten.

### [P1] — keine im Systemreview.
(Die Run-3-P1 sind **Stil-Paritäts-Balance**, außerhalb dieses Systemfokus — unverändert gültig, aber hier nicht erneut bewertet.)

### [P2 Balance, Carryover] Mana ist kein Ressourcen-Hebel → Mana-Schild quasi-gratis
**Befund:** manaRegen (12,1/s, Pool 269) übersteigt den Verbrauch im Dauerkampf deutlich; manaMin = 90 (nie leer). Damit ist der `MAGIC_WEAK_FACTOR`-Fallback tot **und** der Mana-Schild eine dauerhaft aufrechte Defensivschicht ohne Opportunitätskosten gegen den Offensiv-Burst. Mechanisch korrekt (gedeckelt, idle-fair), aber spannungsfrei. Identisch zu Run-3-P2/B4.
**Fix-Vorschlag:** entweder bewusst so lassen, ODER `manaCost` ~×1.5 schärfen, damit Mana im Dauerkampf real knapp wird (adressiert zugleich Magies Mid-Tier-Überschuss aus Run 3).

### [P2 Design] Auto-Eat-Tiers sind ein wirkungsloser Gold-Sink
**Befund:** Über alle Drucktests liefern T0…T3 identischen Durchsatz bei 0 Toden — selbst ein L40-Leder-Build gegen einen L96-Mob stirbt bei T0 (Schwelle 50 %) nicht. Die Tier-Upgrades kosten 2 000 / 8 000 / 25 000 Gold (`AUTO_EAT_TIERS`), bringen aber keinen messbaren Survival-/Durchsatz-Vorteil, weil Survival schon bei T0 gelöst ist. Auto-Eat **funktioniert** (0 Tode auch auf DoT-Schaden) — die Progression dahinter ist nur leer.
**Fix-Vorschlag:** Tiers an echten Druck koppeln — z. B. T0 mit niedrigerer Heileffizienz/Schwelle starten, sodass untergerüstete Builds bei T0 tatsächlich sterben und das Upgrade Wert bekommt; ODER Tiers an Heal-Cap pro Sekunde knüpfen (gegen schweren Burst).

### [P3 Bug, NEU] `curesPoison` wird im Auto-Eat-Pfad ignoriert (definiert-aber-nur-teils-angewandt)
**Befund:** `curesPoison` wird ausschließlich in `useConsumable` (manueller Verzehr) ausgewertet (`consumable.ts:42`). Der Auto-Eat-Pfad (`tryAutoEat` in `combat.ts:67`) heilt und ruft `applyConsumableBuff` (nur Buffs) — **die Gift-Heilung wird nicht ausgeführt**. Ein gift-heilendes Essen, auf das sich der Spieler im Kampf via Auto-Eat verlässt, entfernt den aktiven Poison-DoT also nie. Run 3 hatte „Auto-Eat wendet Buffs identisch zum manuellen Verzehr an" als Stärke notiert — für `curesPoison` gilt diese Identität **nicht**.
**Impact:** gering (Auto-Eat heilt den Poison-DoT ohnehin weg, 0 Tode), aber das Feld ist im Combat-Pfad stumm und die Erwartung „Auto-Eat = manueller Verzehr" gebrochen.
**Fix-Vorschlag:** in `tryAutoEat` denselben Cure-Zweig wie `useConsumable` ergänzen (Poison-Effekte filtern), wenn das gegessene Item `curesPoison` trägt.

### [P3 Politur] `inflict.magnitude` für frost-Typ ist ein toter Wert
**Befund:** Frost wirkt als fixer Slow (`FROST_SLOW`), die `magnitude` wird in `tickPlayerEffects`/`tickEnemyEffects` für frost **nie** gelesen. gravecliff_specter und abyssal_tide_serpent setzen `inflict.frost.magnitude: 1` — inert. Kein Bug, aber irreführender Content-Wert (impliziert eine Frost-Stärke, die es nicht gibt).
**Fix-Vorschlag (optional):** entweder magnitude bei frost-inflict weglassen/auf 0 setzen (Klarheit), oder Frost-Stärke tatsächlich aus magnitude ableiten (variabler Slow), falls gewollt.

### [P3 Hinweis, bekannt] `stopReason` fehlt → Out-of-Ammo-Stopp ohne UI-Grund
**Befund:** Der Munitions-Stopp (`endCombatOutOfAmmo`) ist mechanisch korrekt (beendet sauber, kein Notschlag-Loot-Waste), aber der dokumentierte TODO-Andockpunkt `CombatState.stopReason` existiert im shared-Typ noch nicht (`combat.ts:669`). Außerhalb des Combat-Reviers (shared/UI). Reiner UX-Hinweis, kein Logikfehler.

---

## Mechanik-Checks (alle bestanden)
- **Status-Anwendung & Resist:** `applyEnemyStatus`/`applyMonsterInflict` mit Refresh-statt-Stack, `monsterResists` blockt immune Typen; `status-coverage`-Test garantiert beidseitige Behandlung aller inflict-/weaponEffect-/Pet-Status-Typen.
- **DoT-Ticks:** burn/bleed/poison = `magnitude × (TICK_MS/1000)`, ignoriert Rüstung (vermessen: 1,0 HP/Tick bei mag10 gegen def44). frost = Slow, shock = Aussetzer-Wahrscheinlichkeit = magnitude. Symmetrisch Spieler↔Gegner.
- **Gegner-Mechaniken:** `regen` (DPS-Check, gedeckelt auf maxHp), `enrage` (×Mult unter belowHpPct), `inflict` (auf Spieler) — alle 5 neuen Mobs aktiv verdrahtet und im Sim wirksam.
- **Lifesteal:** doppelt gedeckelt (5 % maxHp UND abs 12 → effektiv 12/Treffer), nur melee.
- **Mana-Schild:** gedeckelt (`MANA_SHIELD_ABSORB_PCT 0.5`, nach Defense-Mitigation, nach Pet-Schild), endlicher Mana-Pool — mechanisch korrekt.
- **Ranged-Munition (OSRS-Köcher) + Enchant-Instanz-Effekt:** Effekt nur bei echtem Schuss (`appliesEffect = firesAmmo`), Out-of-Ammo-Stopp greift, `effectiveInstanceWeaponEffects` liefert Basis + Affix-Effekt.
- **Determinismus:** gleiche Seed → bit-gleiche Kills; verschiedene Seed → abweichend.

## Fazit
Die Kampf-**Systeme** sind in Run 4 robust und deterministisch; die beiden zu verifizierenden Fixes (Ranged-Enchant-Instanz respektiert Munition; 5 Endgame-Mobs) sind sauber gelandet, **0 Tode / 0 Walls bestätigt**. Offene Punkte sind kein Bug im Kern, sondern **leere Ressourcen-Spannung**: Mana/Mana-Schild ohne Knappheit (P2, Carryover) und Auto-Eat-Tiers ohne Wirkung (P2) — beides Balance-/Design-Stellschrauben. Einziger echter Code-Konsistenzbruch: `curesPoison` im Auto-Eat-Pfad (P3).
