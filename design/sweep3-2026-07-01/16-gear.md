# Sweep 3 — 16 · Gear: Best-in-Slot je Stil + Set-Boni (Kontrolleur/QA)

**Ziel:** Verifizieren, dass (a) **voidweave** jetzt das beste Magie-Set ist (>godspark auf JEDER Achse),
(b) das **Metall-Set-Tempo monoton** ist (kein Tempo-Verlust beim Aufstieg steel→godiron),
(c) **keine weiteren Set-/Item-Tier-Inversionen** existieren, und (d) die **Set-Bonus-Wirkung in
computeStats** tatsächlich greift. HEADLESS gemessen über `computeStats` (echter Engine-Pfad).

**Ziel erreicht:** JA für (a), (b), (d) — alle drei **confirmed grün**. Bei (c) **eine suspected
Inversion gefunden** (Ranged-Cap voidhide, glass-cannon-Cliff) + ein kosmetischer Achsen-Dip (warhide).

---

## Gates
- ✅ **typecheck (Produktcode):** sauber. `character.ts` / `content` / `shared` / client typechecken.
  ⚠️ Der repo-weite `pnpm typecheck` ist AKTUELL rot — **ausschließlich** wegen nicht-gelöschter
  Scratch-Tests paralleler Sweep-Agenten (`zz-catalog-dump.test.ts`, `zz-econ-sweep3.test.ts`).
  Kein Produktfehler; transientes Sweep-Hygiene-Thema, löst sich wenn die Geschwister-Agenten
  ihre `zz-*`-Dateien wie im Briefing vorgesehen wieder löschen.
- ✅ **Guard-Tests:** set-bonus (3), wiring-audit (2), content-integrity (4), styles (6), equipment (8)
  = **23 passed**.
- ✅ **client build:** `built in 10.49s`, grün.
- ✅ **Messung (eigenes Wegwerf-Skript, danach gelöscht):** 5/5 grün.

---

## (a) voidweave > godspark — CONFIRMED auf jeder Achse
Voller Set-Beitrag über nackte Baseline via `computeStats` (inkl. int/wis-Modifier → magicDamage/mana):

| Achse | godspark (voll) | voidweave (voll) | Δ zugunsten voidweave |
|---|---|---|---|
| magicDamage | +123.5 | **+171.7** | +48.2 |
| defense | +125.6 | **+156.3** | +30.7 |
| accuracy | +103 | **+143** | +40 |
| evasion | +104 | **+128** | +24 |
| maxHp | +332 | **+398** | +66 |
| maxMana | +99 | **+147** | +48 |
| manaRegen | +4.15 | **+6.2** | +2.05 |
| critChance | +0.15 | **+0.19** | +0.04 |
| critDamage | +0.27 | **+0.33** | +0.06 |

Auch je Einzelteil (Datei-Ebene, `content/src/index.ts:3947–4037`) dominiert voidweave godspark auf
jeder Achse (defense/evasion/maxHp/magicDamage/accuracy/critChance/critDamage/manaRegen/int/wis).
Set-Bonus (`index.ts:11946` vs `11953`): godspark `mDmg17/acc18/crC.04/crD.15` → voidweave
`mDmg22/acc22/crC.05/crD.18` — strikt höher auf allen 4 Achsen. **Inversion raus, bestätigt.**

## (b) Metall-Set-Tempo — CONFIRMED monoton
Getragenes Voll-Set je Stufe, `computeStats.attackIntervalMs` (nackte Baseline aIMs=2900):

| Set | Set-Bonus aIMs | gemessen aIMs | meleeDmg | def |
|---|---|---|---|---|
| copper | -100 | 2950 | 19.3 | 27 |
| iron | -150 | 2900 | 30.8 | 53 |
| steel | -175 | 2875 | 34.3 | 71 |
| mithril | -200 | 2850 | 43.3 | 117 |
| adamantium | -220 | 2830 | 54.8 | 144 |
| runite | -240 | 2810 | 68.8 | 179 |
| bloodiron | -260 | 2790 | 89.3 | 218 |
| titanium | -280 | 2770 | 109.8 | 268 |
| aetherium | -290 | 2760 | 131.8 | 322 |
| godiron | -300 | 2750 | 159.3 | 393 |

attackIntervalMs sinkt bei jedem Aufstieg strikt (schneller), **kein Tempo-Verlust**. defense/maxHp/
meleeDamage/critChance/critDamage der Set-Boni ebenfalls monoton nicht-fallend (eigener Scan grün).
Hinweis (kein Bug): copper voll (2950) ist minimal langsamer als nackt (2900) — Schwer-Rüstungs-
Malus der Teile, den der Set-Tempo-Bonus erst ab iron voll auffängt; Design-Tradeoff, kein Regress.

## (c) Weitere Inversionen — 1 suspected + 1 kosmetisch
Metall-Set-Kette (10) und Magie-Roben-Kette (frost→ember→aether→arcane→runewoven→godspark→voidweave)
sind **sauber monoton** (magicDamage/accuracy/critChance/critDamage). Metall-Waffen (staff copper→
godiron magicDamage 5→100) ebenfalls monoton. ABER die **Leder/Ranged-Kette** hat am Cap einen Bruch —
siehe Finding F1.

## (d) Set-Bonus-Wirkung in computeStats — CONFIRMED
Der Set-Bonus wird in `character.ts:207–210` (`addBonus(set.bonus)` gated durch `count >= minPieces`)
korrekt appliziert und fließt in die abgeleiteten Werte (attackIntervalMs `:250`, magicDamage `:240`,
defense/accuracy/… `:294–299`). Schwellen-Gate gemessen an voidweave:
- 1 Teil (mitre): magicDamage +26.8 (Bonus 20 + int4·1.7) — **kein** Set.
- 2 Teile (mitre+vestment): +91.0 = 26.8 + [32 + int6·1.7=10.2] + **Set +22** → der +22-Sprung erscheint
  exakt an der 2-Teile-Schwelle. Isolierter Set-Delta = 22.00. **Set feuert, verifiziert.**

---

## Findings (schwerste zuerst)

### [P2][balance][suspected] F1 — Ranged-L99-Cap „voidhide" ist Survivability-Downgrade ggü. T8 „shadowhide"
- **Repro:** Voll-Set-Vergleich (Teile + Set-Bonus) via `computeStats`/Content:
  - shadowhide (T8, L95, `index.ts:3054–3078` + Set `:12010`): def 192, **evasion 186**, **maxHp 420**, rangedDmg 46, crC .03, crD .12
  - voidhide (T9, **L99-Cap**, `index.ts:3082–3107` + Set `:12017`): def **149**, **evasion 107**, **maxHp 350**, rangedDmg 63, crC .04, crD .18
- **Erwartet:** Der L99-Ranged-Cap ist laut Kommentar (`index.ts:3080–3081`) explizit „same as Godiron
  for melee" gedacht. godiron (Melee) und voidweave (Magie) **dominieren ihren Vorgänger auf JEDER
  Achse**. voidhide sollte das analog tun.
- **Tatsächlich:** voidhide gewinnt nur Offense (rangedDmg +17, crit) und verliert massiv Defense
  (**-43 def, -79 evasion, -70 maxHp**). Wer L99-Leatherworking grindet, wird spürbar squishiger als
  mit dem T8-Set, das er schon hat — Progressions-Cliff / feels-bad am Cap; inkonsistent mit den
  Melee/Magie-Caps. (Ranged HAT bewusst Glass-Cannon-Identität — aber die Magnitude am Cap ist der
  Ausreißer, nicht die Richtung.)
- **Empfehlung (Zahlen, Chef-freigegeben):** voidhide-Teile evasion/maxHp anheben, sodass Voll-voidhide
  ≥ Voll-shadowhide auf def/evasion/maxHp bleibt und Offense führt. Konkret z.B. Set-Bonus
  `voidhide_set` evasion 12→**26** (statt unter shadowhide 24) und maxHp der 5 Teile in Summe ~+70
  (z.B. body 108→150, legs 83→110, helm 65→85). Dann bleibt voidhide klarer Best-in-Slot ohne
  Tank-Regress. **Owner:** balance-designer → content-dev.

### [P3][balance][suspected] F2 — warhide-Set-Bonus lässt critChance fallen (kosmetischer Achsen-Dip)
- **Repro:** Leder-Set-Bonus critChance-Kette: studded .01 → ironhide .01 → **warhide 0** → dragonhide .02
  (`index.ts:11982/11989/11996/12003`).
- **Erwartet/Tatsächlich:** warhide (T6) verliert die critChance der zwei Stufen darunter; kompensiert
  über höheres def/evasion/rangedDamage, Gesamt-Power steigt weiter. Wahrscheinlich als „tankige"
  Leder-Stufe gewollt — daher nur P3. Falls Achsen-Monotonie erwünscht: warhide critChance 0→**0.02**.
  **Owner:** content-dev.

### [P3][process][confirmed] F3 — repo-`pnpm typecheck` transient rot durch Geschwister-Scratch-Tests
- `zz-catalog-dump.test.ts`, `zz-econ-sweep3.test.ts` (paralleler Sweep-Agenten) brechen den engine-
  typecheck (`attackDamage` nicht auf `EquipBonus`; `possibly undefined`). **Kein Produktcode betroffen.**
  Löst sich mit dem im Briefing vorgesehenen Löschen der Scratch-Tests. Nur als Sichtbarkeits-Reminder.

---

## Top 3
1. **F1** — Ranged-Cap voidhide als Glass-Cannon-Cliff (−79 evasion, −70 maxHp ggü. T8) angleichen,
   damit „Best-in-Slot je Stil" für Ranged am L99-Cap konsistent mit Melee/Magie ein echter Upgrade ist.
2. **Kernauftrag bestätigt:** voidweave > godspark auf jeder Achse; Metall-Set-Tempo monoton; Set-Bonus
   feuert korrekt in computeStats — **alles grün, keine Regression.**
3. **F2/F3** — warhide-critChance-Dip (kosmetisch) und die transiente typecheck-Verschmutzung durch
   Nachbar-Scratch-Tests auf dem Radar behalten.
