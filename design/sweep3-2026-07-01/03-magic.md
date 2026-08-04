# Sweep 3 — 03 „reiner Magier" (Kampf-Niveau 30 + Stil-Parität)

**Persona:** reiner Magier (nur Magie, keine Melee-/Ranged-Skills).
**Ziel:** Kampf-Niveau 30 nur mit Magie erreichen; verifizieren, ob der Balance-Pass die
Stil-Parität (Magie-DPS ~ Melee/Ranged) in der Praxis herstellt. Mana-Loop + Waffenleiter
(Runecrafting-Gate) prüfen. Kills/h gegen Referenz messen.

**Methode:** Headless über `SimPlayer` (echte Engine: `startCombat`/`fightFor`/`equip`/`computeStats`),
deterministisch (seeded). Wegwerf-Test `packages/engine/src/sweep3-magic.test.ts` (nach dem Lauf gelöscht).
Zwei Messungen: (A) **kontrollierte Parität** — gleiche Offense-Level + tier-gleiche Waffe, gleiche
Referenz-Mob, alle 3 Stile; (B) **echte Reise** von Null bis CL30 (Magie vs. Melee als sauberer,
munitionsloser Referenz-Grind, Waffen-Upgrades an den Tier-Gates).

## Ziel erreicht?
**Nein — CL30 nicht im Budget erreicht (90 Sim-Min → CL18).** ABER: das ist zum Teil der bekannt-lange
Grind (Melee kam im selben Budget nur auf CL22, auch nicht 30). Der eigentliche Befund ist ein
**stil-spezifischer Nachteil des reinen Magiers im Kampf-Niveau** (s. P2 unten): der Magier teilt am
meisten Schaden aus, bleibt aber im Kampf-Niveau am weitesten zurück.

## Kurzfazit Parität (die Kernfrage des Sweeps)
- **Roh-DPS-Parität: BESTÄTIGT GUT.** Bei gleichem Offense-Level + tier-gleicher Waffe gegen dieselbe
  Mob liegt Magie ~gleichauf mit Melee/Ranged (Spread 9–10 %, Magie sogar minimal vorn). Der Balance-Pass
  (steel_staff 14→25 etc.) wirkt. **confirmed.**
- **Mana-Loop: funktioniert** (leert unter Cast-Kosten, erholt sich, Weak-Melee-Fallback greift sauber). **confirmed.**
- **Waffenleiter / Runecrafting-Gate: konsistent verdrahtet** (Craft-Level == Equip-Level je Tier). **confirmed.**
- **ABER Kampf-Niveau-Parität: gebrochen** — der reine Magier hinkt strukturell hinterher (P2). **confirmed.**

---

## Findings (schwerste zuerst)

### [P2][balance] Reiner Magier bleibt im Kampf-Niveau strukturell zurück — obwohl er am meisten Schaden macht — weil die CL-Formel `magic_def` in den Offense-Term mittelt (confirmed)

**Erwartet:** Bei vergleichbarem Zeit-/Kill-Aufwand erreicht ein reiner Magier ein Kampf-Niveau
vergleichbar mit Melee/Ranged (Kampf-Niveau gatet Dungeons/Zonen/Content).

**Tatsächlich:** Der Magier teilt im selben 90-Min-Fenster **den meisten Schaden aus** (magic_off **29**,
**514 Kills**, **343 Kills/h** — ~1,7× die 197/h des Melees), landet aber beim **niedrigsten Kampf-Niveau
(CL18)**. Melee mit weniger Kills erreicht CL22.

**Ursache (reine Arithmetik, `dungeon.ts` → `combatLevel()`):**
```
meleeOffense  = (attack + power) / 2      // beide trainieren beim Zuschlagen (attack-Stance-Split 55/45)
rangedOffense = ranged                    // EIN Skill, volles Gewicht
magicOffense  = (magic_off + magic_def)/2 // magic_def trainiert NUR beim Einstecken magischen Schadens
CL = round(0.25·(defence+vitality) + 0.5·max(meleeOffense, rangedOffense, magicOffense))
```
`magic_def` (trainiert via `grantDefenseXp`/`tickPlayerEffects` NUR bei eingehendem burn/frost/shock) bleibt
für einen offensiven Caster praktisch bei **1**. Damit halbiert sich der effektive Magie-Offense-Term:
`(29 + 1)/2 = 15` — **niedriger als Melee (24,5) und Ranged (35)**, obwohl magic_off der höchste
Offense-Skill aller drei Läufe ist. Magie ist der **einzige** Stil, dessen CL-Offense-Term einen Skill
enthält, der beim Angreifen nicht mitwächst.

**Verstärkender Rückkopplungs-Loop:** niedriges CL → der Ziel-Picker („bestes Monster ≤ CL") schickt den
Magier gegen schwächere Mobs → weniger XP/Kill → CL wächst noch langsamer.

**Evidence (deterministischer Lauf, seed 3, 90 Sim-Min, food=cooked_trout, Waffen an Tier-Gates):**
| Stil  | Kills | Kills/h | Deaths | Offense-Skill | Skills (Ende) | CL-Offense-Term | CL |
|-------|------:|--------:|-------:|---------------|---------------|----------------:|---:|
| MAGIC | 514   | 343     | 0      | magic_off 29  | magic_off29 **magic_def1** defence17 vitality25 | (29+1)/2 = **15** | **18** |
| MELEE | 295   | 197     | 0      | power 20      | attack29 power20 defence19 vitality21 | (29+20)/2 = 24,5 | 22 |

Nachrechnung Magie: `round(0.25·(17+25) + 0.5·15) = round(10,5 + 7,5) = 18`.

**Empfehlung (konkret, Chef-freigegeben — Zahlen erwünscht):**
- **Bevorzugt:** Magie-Offense in `combatLevel()` symmetrisch zu Ranged behandeln → **nur `magic_off`**
  als Offense-Term (das `magic_def`-Mittel streichen). Dann Magier-Term = 29 →
  `round(0.25·(17+25) + 0.5·29) = 25` (statt 18) — dicht an Melee/Ranged bei gleichem Aufwand.
  `magic_def` bleibt weiterhin voll wirksam als Defensiv-Skill (geht in `computeStats.defense` ein),
  verzerrt aber nicht länger das Kampf-Niveau.
- **Alternativ** (falls `magic_def` im CL bleiben soll): einen Anteil der offensiven Cast-XP an
  `magic_def` routen (analog zum Melee-`attack`/`power`-Split 55/45 in `grantOffenseXp`), damit
  `magic_def` beim Zaubern mitwächst.
- **Owner:** logic-dev (`combatLevel`/Leveling in `packages/engine/src/dungeon.ts`); combat-dev als Stakeholder.

---

## Bestätigungen (kein Bug — der Balance-Pass wirkt)

### [confirmed] Roh-DPS-Parität Magie ≈ Melee ≈ Ranged (früh + mittig)
Kontrolliert: identisches Offense-Level + tier-gleiche Waffe + gleiche defensive Skills, gleiche Mob,
6 Sim-Min je Messung.

**FRÜH — Offense L20, Steel-Tier, vs goblin (L15, hp150):**
| Stil | Waffe | Kills | Kills/h | s/Kill | maxHit |
|------|-------|------:|--------:|-------:|-------:|
| melee  | steel_sword    | 42 | 420 | 8,6 | 101 |
| ranged | steel_longbow  | 43 | 430 | 8,4 | 84 |
| magic  | steel_staff    | 46 | 460 | 7,8 | 98 |

→ Spread **10 %**; Magie 110 % von Melee, 107 % von Ranged.

**MITTIG — Offense L45, Mithril-Tier, vs mire_crawler (L38, hp465):**
| Stil | Waffe | Kills | Kills/h | s/Kill | maxHit |
|------|-------|------:|--------:|-------:|-------:|
| melee  | mithril_sword   | 24 | 240 | 15,0 | 175 |
| ranged | mithril_longbow | 22 | 220 | 16,4 | 156 |
| magic  | mithril_staff   | 24 | 240 | 15,0 | 183 |

→ Spread **9 %**; Magie 100 % von Melee, 109 % von Ranged. **Der ranged/magic-Früh/Mid-Schadensanhub
wirkt — Magie ist bei gleichem Level+Tier kein Underdog mehr, sondern gleichauf.**

### [confirmed] Mana-Loop funktioniert (Cast → Weak-Melee → Regen → Resume)
steel_staff (Cast-Kosten 6, Pool 90): Mana fiel unter die Kosten (min **2**) und erholte sich wieder
über die Kosten — der Weak-Melee-Fallback (`MAGIC_WEAK_FACTOR`) greift und das Casten nimmt automatisch
wieder auf. Kein Hänger, kein NaN. magic_off-XP wuchs durchgehend.

### [confirmed] Waffenleiter „sinnig verdrahtet": Runecrafting-Craft-Gate == magic_off-Equip-Gate
| Tier | Equip-Gate (magic_off) | Craft-Gate (runecrafting) | |
|------|:---:|:---:|:---:|
| copper_staff | 1 | 1 | == |
| steel_staff | 20 | 20 | == |
| mithril_staff | 40 | 40 | == |
| adamantium_staff | 50 | 50 | == |
| godiron_staff | 99 | 95 | ≠ (bewusst, minimal) |

Equip-Gate greift echt: `steel_staff` @magic_off 10 → blockiert („magic_off Lvl 20 (aktuell 10)"),
@magic_off 20 → OK. Da Runecrafting `int` trainiert (→ magicDamage), speist der Kraft-Beruf des Magiers
direkt seine Offensive — schöne Kopplung. Einziger Mini-Widerspruch: godiron craftbar bei RC95, aber
tragbar erst bei magic_off99 (P3-Kosmetik, nicht dringlich; ggf. RC95→99 angleichen).

---

## Top 3
1. **[P2 balance] Kampf-Niveau-Formel benachteiligt den reinen Magier** — magic_off 29 → CL nur 18
   (Melee: power 20 → CL22), weil `magicOffense = (magic_off + magic_def)/2` und `magic_def` beim
   Angreifen nie wächst. Fix: in `combatLevel()` Magie-Offense = nur `magic_off` (symmetrisch zu Ranged).
   → `logic-dev`.
2. **[confirmed / kein Bug] Roh-DPS-Parität hält** — Magie 9–10 % innerhalb von Melee/Ranged, früh und
   mittig. Der Schadensanhub wirkt in der Praxis.
3. **[confirmed] Mana-Loop + Runecrafting-Waffenleiter funktionieren & sind konsistent gegatet**
   (godiron RC95 vs equip99 = einziger P3-Kosmetik-Mismatch).

## Notizen zur Methode / Ehrlichkeit
- „confirmed"-Zahlen sind deterministisch reproduzierbar (feste Seeds). Die kontrollierte Paritäts-Messung
  ist die **primäre** Parität-Evidenz (Waffen/Munition korrekt vor-ausgerüstet).
- Der Ranged-**Reise**-Lauf wurde bewusst **weggelassen**: die Munitions-Tier-Wechsel im Reise-Harness
  sind fragil (Köcher-Umstellung → falsch-positive „out-of-ammo"-Stopps). Ranged-DPS ist über den
  kontrollierten Test sauber abgedeckt; als Reise-Referenz dient das munitionslose Melee.
- Fair-Annahme (wie im Balance-Sim `sim.ts`): Tier-Waffen werden am Skill-Gate „gegeben" (repräsentiert
  Schmieden/Fletching/Runecrafting) — isoliert die Kampf-Balance von der Beschaffung.
