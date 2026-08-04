# QA-Sweep 2026-07-01 — Fokus: Kampf & Ranged/Ammo

**Tester:** Kontrolleur (QA). **Methode:** echte Spielsitzungen über `SimPlayer`
(`packages/engine/src/sim-player.ts`), headless, seeded RNG. Temporäres Test-Skript
`packages/engine/src/qa-combat-sweep.test.ts` angelegt, ausgeführt, wieder gelöscht.

## Gesamturteil
Kampf-Kern und die jüngsten Ranged-Fixes sind in der PRAXIS sauber. 10/10 Sim-Szenarien grün.
Zusätzlich 73/73 relevante Guard-Tests grün (ammo-quiver, ranged\*, magic\*, styles, suffix,
weapon-type, combat, combat-autorestart). **Ein bekanntes offenes Balance-/Konsistenz-Thema
bestätigt** (Magie-Waffen verlangen `runecrafting` — siehe P2-01). Keine neuen Crashes/Soft-Bricks.

---

## Verifiziert (funktioniert in der Praxis)

| Bereich | Evidence (Sim, seed-fest) |
|---|---|
| Melee kämpft & killt | style=melee, Intervall 2740 ms, 6 Kills/120 s (rusty_sword-Starter), 0 Tode |
| Ranged Bogen+Köcher | style=ranged, Intervall 2520 ms, 21 Kills/120 s, Köcher 500→453 (Verbrauch bestätigt) |
| Ranged out-of-ammo Stopp | leerer Köcher → `combat.monsterId=null`, `stopReason="outOfAmmo"` |
| Magie castet & killt | style=magic, maxMana 186, regen 5.1/s, 16 Kills/120 s, Mana wird ge- und nachgeladen |
| Waffenwechsel live | melee→ranged→magic: `computeStats().style` folgt der Mainhand-Waffe korrekt |
| Status: Waffen-Effekt | Poison-Waffe (nekro_reaperblade) → `enemyEffects=[poison]` erscheint |
| Status: Monster-inflict | goblin_felmagician → `playerEffects` enthält poison am Spieler |

### Ranged-Fixes (explizit angefordert) — alle BESTÄTIGT
- **#10 Bogen ohne Fletching ausrüstbar:** 41/41 Bögen (Shortbow+Longbow+Spezial) mit `ranged`-Gate
  erfüllt, `fletching`=1, alle equippen. Kein Bogen hat einen Nicht-`ranged`-Requirement.
- **#11 alle Pfeile köcherbar / #12 Stack 9999:** 13/13 intrinsische Pfeil-Items stapeln exakt auf
  9999 in einem Slot und wandern per `equip` vollständig in den `ammo`-Slot (`ammoCount=9999`).
- **"of the Viper" (Attack-Speed-Suffix) wirkt real:** mithril_shortbow plain
  `attackIntervalMs=2449` → mit Viper-Instanz (`suffix_viper`, ilvl 80) `=2263`, **Δ −186 ms**.
  Der Soft-Stat fließt via `instanceBonusDelta` → `eq.attackIntervalMs` → `computeStats` in das
  finale Angriffsintervall (nach dem Ranged-×0.90 und der Stance). Kein „-0.0s"-Leerlauf mehr.

---

## Findings

### P2-01 — [Konsistenz/Balance] Magie-Waffen verlangen `runecrafting` zum Ausrüsten (Ranged/Melee nicht)
**Repro (Sim):** Magier mit `magic_off=99`, `runecrafting=1` (Casten trainiert Runenkunst NICHT)
versucht `bronze_staff` (`{ magic_off: 5, runecrafting: 5 }`) auszurüsten → **`equip.ok=false`,
Grund „Skill-Anforderung nicht erfüllt"**.
**Erwartet:** Analog zur bewussten Entscheidung Chef #10 (Bögen brauchen KEIN Fletching, nur
`ranged`) sollte eine Kampfwaffe nur auf ihren KAMPF-Skill gaten. Melee gatet nur `attack`,
Ranged nur `ranged` — Magie sollte nur `magic_off` verlangen.
**Tatsächlich:** **40 von 45 Magie-Waffen** verlangen zusätzlich `runecrafting`. Da alle Skills auf
Level 1 starten, sind Tier-1-Waffen (`copper_staff`/`copper_wand`, rc1) noch frei — **ab Tier 2
(rc5) ist ein reiner Caster hart blockiert**, bis er einen Sammel-/Verarbeitungs-Skill hochzieht.
Betroffen: alle 12 Stäbe + 12 Wände (Tier ≥ 2) + 16 Spezial-Magiewaffen. In **einem** Fall ist
`runecrafting` sogar das HÖHERE, bindende Gate: `voidcaller_staff` (`magic_off 65 / runecrafting 70`).
Nur 5 Magie-Waffen sind rune-frei: `gnarled_staff`, `cracked_staff`, `skarn_idol_staff`,
`last_condemnation`, `hedgewitch_twig`.
**Evidence:** `packages/content/src/index.ts` Zeilen 3168–4025 (getierte Stäbe/Wände) sowie 3452,
3467, 3487, 3495, 3501, 3507, 3513, 3521, 3529, 3537 (Spezialwaffen); Vergleich Bögen 2670–2832
(nur `ranged`), Melee 679/876/… (nur `attack`).
**Warum ungefangen:** Es gibt einen Guard-Test für Bögen
(`ammo-quiver.test.ts`: „kein Bogen verlangt einen Verarbeitungs-Skill", prüft gegen
`COMBAT_SKILL_IDS`), aber **kein** Pendant für Magie-Waffen. `runecrafting` ist kein Element von
`COMBAT_SKILL_IDS` (`shared/src/index.ts:370`).
**Owner:** content-dev (Requirements aus den Magie-Waffen entfernen bzw. auf `magic_off` reduzieren)
— Design-Freigabe durch CEO/Chef, da es eine bewusste Gate-Entscheidung ist (analog #10).
Optional logic-dev: einen Guard-Test „Magie-Waffen gaten nur Kampf-Skills" ergänzen, damit es nicht
wieder einschleicht.

### P3-02 — [Hinweis, kein Bug] Sim-Kill-Zahlen sind KEIN Stil-Paritäts-Signal
Der Melee-Lauf nutzte die Starter-`rusty_sword`, Ranged eine `steel_shortbow`, Magie den
`cracked_staff` — die Kill-Differenz (6 vs 21 vs 16) ist reiner Gear-Tier-Unterschied, nicht
Stil-Imbalance. Echte Parität deckt die bestehende `style-xp-parity.test.ts` + die Balance-Sim ab
(beide grün). Nur zur Klarstellung notiert, damit die Zahlen oben nicht als Parität-Befund
fehlgelesen werden.

---

## Nicht reproduziert / sauber
- Munition wird aus dem Köcher (nicht Inventar) verbraucht; falsche Sorte feuert nicht; leerer
  Köcher stoppt statt lautlos weiterzuschlagen. (deckt sich mit `ammo-quiver.test.ts`)
- Mana-Depletion-Loop degradiert deterministisch zum Weak-Melee und erholt sich — kein Hänger.
- Auto-Restart nach Tod (normaler Kampf) und Status-Refresh-Semantik (`max`) unauffällig.
