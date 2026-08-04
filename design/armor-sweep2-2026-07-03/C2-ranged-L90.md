# Phase C2 — Combat-Tester (Iteration 2) · RANGED · Band L90 (Endgame) · Rüstungs-Trinität

Stand 2026-07-03 · Kontrolleur (Combat-Tester) · **HEADLESS** (createGame/computeStats/combatStep, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_c2R90_sim.test.ts` gelaufen (8 Seeds × 30 min = **4 h Spielzeit/Zelle**, TICK_MS 100) & gelöscht.
Loadout: **BiS Leder+Bogen R90** = `wraithhide`-Set (helm/body/legs/vambraces/boots) + `aetherium_longbow` + `aetherium_arrow`, alle 7 `COMBAT_SKILL_IDS` = 90. Gegner: die 4 Idol-Hall-Endbosse (L245–295) + `void_titan` (L242, Enrage) als 5. Referenz.
Vergleichsbasis: `design/armor-sweep-2026-07-03/C-ranged-L90.md` (Iteration 1) + `design/armor-iteration2-spec.md`.

## VERDIKT: **SHIP** — beide It1-P3-Funde behoben & gegatet, Parität-Spanne kollabiert, Leder-Varianz gesunken
Kein P1/P2. Die zwei echten It1-Befunde sind **beide gefixt**: (a) `wraithhide_set`/`starweave_set` sind jetzt in `content.sets` registriert → Leder-Unterparität −3,5 % → **≈ Parität**; (b) `WARD_CORE_PER_INT = 0` → der Ranged-Held zeigt **maxWard 0** (war 14, Ward-INT-Leak weg). Die von It1 gemeldete 15,8-%-Stil-Spanne (getrieben von der Set-losen Leder/Stoff-Unterparität) **kollabiert auf ~4 pp**. Der Leder-Floor (−12 %) + der Set-con-getriebene HP-Bump (149,7 → 165,7) **senken die Endgame-Varianz** gegenüber It1 (Casual/Mid-Food `void_titan` jetzt **0 Tode**, war 1). Alle 4 Idol-Hall-Endbosse mit BiS-Food **0 Tode / 4 h**. Ein kleiner P4-Kalibrier-Nit (Leder con8 minimal knapp vs. dem Spec-§11.6-R90-Ziel +2 %), kein Blocker.

---

## It1 → It2 · computeStats des BiS-Rangers (echte Werte)

| Stat | It1 | **It2** | Kommentar |
|---|---:|---:|---|
| maxHp | 149,7 | **165,7** | +16 aus `wraithhide_set` con8 (It1 hatte 0 Set-Bonus) |
| dodgeChance | 73,0 % (linear Σ/100) | **72,05 %** | jetzt diminishing `Σ116/(Σ116+45)`; **2,95 pp** unter Cap 0,75 (nicht am Cap) |
| maxWard | **14** (INT-Leak) | **0** | `WARD_CORE_PER_INT=0` → Ward NUR aus Stoff → 0 auf Leder ✅ (It1-P3 behoben) |
| evasion (Contest, DEX-Kern) | 12,1 | **17,5** | höhere DEX (Set dex6 + Teile-Modifier) |
| defense / Mitigation | 0 / 0 % | **0 / 0 %** | Leder trägt kein armorRating (korrekt) |
| blockChance | 0 | **0** | kein Schild (korrekt) |
| attackIntervalMs | 1368 | **1000** | Ranged-Speed-**Floor** (`character.ts:442` `max(1000, …·0,90)`), von hoher DEX erreicht — legit, **kein** Clamp-Bug |
| critChance | 23,2 % | **32,2 %** | Waffen-Balance-Pass (orthogonal zur Rüstung) |

Σ `evasionRating` wraithhide = 23,2+34,8+25,52+16,24+16,24 = **116,0** → dodge `116/161 = 72,05 %` (Spec §11.4-Ziel 72 %, **getroffen**). Requirements sind auf `{ ranged: 90 }` umgegatet (§8 angewandt).

---

## Die 4 Gate-Fragen (mit Zahlen)

### (1) Dodge nahe Cap + Leder-Floor — Endgame-Varianz? — **Varianz REAL, aber GERINGER als It1; Cap kaum noch bindend**
- **Nicht am Cap:** 72,05 % (2,95 pp Luft bis 0,75). Die diminishing-Kurve soft-cappt bereits; der Hard-Cap 0,75 erreicht erst L99 (`voidhide`).
- **One-Shot-Cap greift jetzt kaum:** Cap = `0,5·165,7 = 82,85`. Enrage-Roh-Max: `void_titan 31·1,75·1,4815 = 80,4` (**unter** Cap), `last_idol 32·1,75·1,4815 = 82,96` (marginal über → auf 82,85 gekappt, vernachlässigbar). In It1 (maxHp 149,7 → Cap 74,8) band der Cap **beide** Enrage-Bosse auf „2 Treffer aus vollem Leben"; der Set-con-HP-Bump hebt den Cap über den void_titan-Roh-Max.
- **Leder-Floor dämpft den Rest:** ein gelandeter Enrage-Treffer = `80,4·0,88 (Floor) = 70,75` ≈ **43 % maxHp** → „2 aus vollem Leben" ≈ 85 % → überlebbar. Genau der It1-Gefahrenvektor („2 gekappte Treffer im 3-s-Auto-Eat-Fenster") ist durch Floor + mehr HP **entschärft**.
- **Empirisch:** Casual/Mid-Food `void_titan` fällt von It1 **1 Tod** auf It2 **0 Tode** (minHP 15,5 % / 26,4 %). Der Floor (combat.ts STEP 4, `armor-iteration2-combat.test.ts` gegatet) wirkt wie beabsichtigt.

### (2) `wraithhide_set` registriert → Leder-Parität R90 jetzt +? — **Von −3,5 % auf ≈ PARITÄT; Spanne 15,8 % → ~4 pp**
Paper-EHP-Modell (Spec §11.6-Konstanten: K=125, K_DODGE=45, BLOCK_DR=0,85, LEATHER_FLOOR=0,12), on-band-Sets, alle Kampf-Skills 90:

| Stil (on-band-Set @R90) | maxHp | Schicht | **EHP** | Δ vs Ø₃ | Δ vs Ø₄ |
|---|---:|---|---:|---:|---:|
| **Platte 1H+Schild** aetherium (+Set) | 195,7 | red 53,4 % · block 47,2 % | **701,3** | +1,9 % | +4,4 % |
| **Platte 2H** aetherium (+Set) | 173,7 | red 72,1 % | **622,6** | — | −7,4 % |
| **Leder** wraithhide (**+Set NEU**) | 165,7 | dodge 72,05 % · Floor 12 % | **673,7** | **−2,2 %** | **+0,2 %** |
| **Stoff** starweave (**+Set NEU**) | 141,7 | maxWard 549 | **690,7** | +0,3 % | +2,8 % |

Ø₃ (3 Rüstungsstile, wie It1) = 688,6 · Ø₄ (alle 4, wie Spec §11.6) = 672,1.

- **It1-Vergleich:** It1 = Platte **627 (+9,2 %)**, Leder **554 (−3,5 %)**, Stoff **542 (−5,7 %)**, Ø 575, **Spanne 15,8 %** (getrieben von der einzigen Set-tragenden Platte). It2 = Platte **+1,9 %**, Leder **−2,2 %**, Stoff **+0,3 %** → **Spanne 4,1 pp** (Ø₃); Ø₄ max-Abweichung **7,4 %** (2H, gewollter Offense-Tradeoff). **Alle Bänder ≤ ±10 %.**
- **Leder-Fix bestätigt:** `wraithhide_set {dex6,con8,lck3}` (+16 maxHp) hebt Leder von **−3,5 %** auf **≈ Parität** (−2,2 % Ø₃ / +0,2 % Ø₄). Bewusst **kein** Overshoot (Spec warnte: Platte-Bonus kopieren = +13 %). `starweave_set {int6,wis5,con6}` bringt Stoff parallel auf Parität. `set-bonus` + `content-integrity` (§7-Guard) + `wiring-audit`: **18/18 grün**.
- **Der §7-Guard existiert** (`content-integrity.test.ts:143–181` „Jede ≥5-Teile-Rüstungsfamilie hat einen content.sets-Eintrag", listet wraithhide/starweave/duskhide) — genau die von It1 empfohlene „Guard-Gap"-Absicherung. Diese Klasse Lücke ist künftig gefangen.

### (3) Food nötig (Ranged war schon mandatory)? — **JA, weiterhin PFLICHT (Referenzstil unverändert)**
BiS = `cooked_soulfish` (27 Heal) T3 · Casual = soulfish T0 (isst @50 %) · Mid = `cooked_wraithscale` (15) T3 · noFood. minHP % = Tiefpunkt über 8 Seeds:

| Boss (Lvl) | BiS T3 | Casual T0 | Mid T3 | **noFood** |
|---|---|---|---|---|
| idol_warden (245) | 0 T, 75,9 % | 0 T, 45,7 % | 0 T, 68,6 % | **23 T, 0,4 %** |
| aether_wraith (260) | 0 T, 73,4 % | 0 T, 45,1 % | 0 T, 66,2 % | **30 T, 0,4 %** |
| scale_skarn (275) | 0 T, 73,4 % | 0 T, 43,3 % | 0 T, 60,2 % | **33 T, 0,4 %** |
| last_idol (295, enrage) | 0 T, 50,5 % | 0 T, 24,6 % | 0 T, 37,8 % | **56 T, 0,4 %** |
| void_titan (242, enrage) | 0 T, 46,9 % | 0 T, 15,5 % | 0 T, 26,4 % | **93 T, 0,4 %** |

- **noFood = Dauertod** (23–93 Tode/4 h): Ranged hat keinen Lifesteal, Leder keine Mitigation → jeder gelandete Treffer ist unmitigierter Voll-Schaden (nur der Floor −12 %). Food strukturell **PFLICHT** — Spec §6.3-Zielmarke „Ranged mandatory (Referenz)" **erfüllt/unverändert**.
- **Nicht-trivial, aber jetzt großzügiger als It1:** Casual/Mid halten alle 5 Bosse tot-frei (It1: je 1 void_titan-Tod in Casual/Mid). Der Puffer ist gewachsen — Set-con-HP + Floor. Food arbeitet weiter (Casual void_titan minHP 15,5 %), tötet aber nicht mehr bei sub-optimalem Setup.

### (4) Alle 4 Endbosse killbar, 0 Tode? — **JA, 0 Tode/4 h je Boss (BiS); void_titan als 5. Ref auch 0**
BiS-Food T3, 4 h/Boss:

| Boss (Lvl) | Kills/4 h (It1→It2) | Tode | min-HP |
|---|---:|---:|---:|
| idol_warden (245) | 1012 → **1374** | **0** | 75,9 % |
| aether_wraith (260) | 873 → **1226** | **0** | 73,4 % |
| scale_skarn (275, regen 0,6) | 730 → **1066** | **0** | 73,4 % |
| last_idol (295, regen 1, enrage) | 553 → **862** | **0** | 50,5 % |
| *void_titan (242, enrage)* | 293 → **496** | **0** | 46,9 % |

- **Alle 4 Idol-Hall-Endbosse: 0 Tode/4 h**, minHP 50–76 % (komfortabler Puffer, höher als It1s 38–41 %). Ranger-DPS schlägt die Regen (scale_skarn/last_idol werden gekillt).
- **Kills +30–70 % vs It1:** rein Durchsatz — der Ranger trifft jetzt am Ranged-Speed-Floor (1000 ms statt 1368) durch höhere DEX + Waffen-Balance-Pass-DPS. **Orthogonal zur Rüstungs-Iteration** (kein Armor-Effekt), hier nur als Kontext notiert.
- **void_titan** bleibt der Varianz-Grenzfall (höchste acc 19 + Enrage → minHP BiS 46,9 %, Casual 15,5 %) — aber jetzt **0 Tode** in ALLEN Food-Szenarien (It1: 1 Tod Casual/Mid).

---

## Befunde (Priorität + Owner)

**P1/P2 — keiner.** Kein Blocker, kein Balance-Bug im Ranged-Endgame-Pfad. Dodge (diminishing), Leder-Floor, One-Shot-Cap, Ammo-Verbrauch, Auto-Eat, Set-Bonus: alle korrekt verdrahtet.

**It1-P3a (Set-Wiring) — BEHOBEN.** `wraithhide_set {dex6,con8,lck3}` + `starweave_set {int6,wis5,con6}` sind in `content.sets` registriert (`index.ts:12629` / `:12552`), minPieces 5, auf +2…+5 % EHP geeicht (nicht Platte-äquiv.). Leder −3,5 % → ≈ Parität; 15,8-%-Spanne → ~4 pp. `set-bonus`/`content-integrity`/`wiring-audit` grün (18/18). Der §7-Guard fängt die Lückenklasse künftig.

**It1-P3b (Ward-INT-Leak) — BEHOBEN.** `WARD_CORE_PER_INT = 0` → BiS-Ranger `maxWard = 0` (war 14). Keine Phantom-Ward-Leiste + kein Gratis-Absorb-Sockel mehr auf Leder. `character.ts:358` `maxWard = 0·int + eq.wardCapacity`.

**P4 (Kalibrier-Nit, minor) — Leder con8 minimal knapp vs. Spec-§11.6-R90-Ziel · Owner: balance-designer/content-dev.**
Paper-EHP Leder = **673,7**; Spec §11.6 nennt für R90-Leder **691 (+2 %)**. Differenz ~−2,5 pp ⇒ `wraithhide_set` con8 ist ein Hauch leicht für das *literale* §11.6-Ziel (con8→~10 träfe 691 exakt). **Kein Blocker:** (i) das Paper-Modell zählt nur Dodge, NICHT die Accuracy-Contest-Vermeidung — die **reale** Leder-EHP liegt höher (0 Tode an allen Bossen bestätigt); (ii) die Spec selbst hat +5 %→+2 % am High-Band zurückgenommen, genau weil das Modell für Leder pessimistisch ist. Die vom Auftrag erhoffte „+5 %"-Marke ist die **R60**-Zahl; das R90-Ziel war +2 %, und wir liegen praktisch drauf (≈ Parität). Nur anpassen, wenn der Chef die exakte +2 % im Paper-Modell will.

**P4 (Watch) — Enrage-Boss-Dodge-Varianz · Owner: balance-designer.**
`void_titan` (acc 19, Enrage) + `last_idol` bleiben der Varianz-Boden (Casual minHP 15,5 % / 24,6 %), aber jetzt **0 Tode** (It1: 1). Kein Bug — Floor + One-Shot-Cap greifen. Bei künftigen Enrage-/Accuracy-Buffs mitprüfen, dass Leder nicht als einziger Stil kippt.

**Kontext (kein Fund) — Ranger-Durchsatz +30–70 % vs It1.** attackIntervalMs 1368 → 1000 (Ranged-Speed-Floor, hohe DEX) + Waffen-Balance-Pass. Reine DPS/Waffen-Domäne, **nicht** die Rüstungs-Iteration.

---

## Methodik / Reproduzierbarkeit
- Held: `createGame({startingStyle:"ranged"})`, alle `COMBAT_SKILL_IDS` = 90, 5× wraithhide + `aetherium_longbow` + `aetherium_arrow` (ammoCount 5e7), Food als Inventar-Stack (5e7, autoEatTier gesetzt), direkt in die equipment-Slots gelegt (Requirements bei Direkt-Zuweisung irrelevant).
- `computeStats` → maxHp/dodgeChance/evasion/defense/maxWard/blockChance. EHP-Modell: Platte1H `maxHp/((1−red)(1−block·0,85))`, Platte2H `maxHp/(1−red)`, Leder `maxHp/((1−dodge)(1−0,12))`, Stoff `maxHp+maxWard`; `red = min(0,80, armorRating/(armorRating+125))`.
- Überleben: `startCombat(boss)` + `combatStep` je Tick über 30 min, Restart bei `combat.monsterId===null` (Tod → voll geheilt, Ammo/Food nachgelegt); Tode = `stats.deaths`, minHP je Tick gesampelt. 8 Seeds {1..8} = 4 h/Zelle.
- Parität-Referenzen R90: Platte `aetherium_set` (defence 90), Leder `wraithhide_set` (ranged 90), Stoff `starweave_set` (magic 92) — die drei R90-Sprossen mit jeweils registriertem Set.
- Guards gegengeprüft: `content-integrity` (inkl. §7-Set-Coverage) + `set-bonus` + `wiring-audit` = 18/18 grün. Konstanten verifiziert in `shared/src/index.ts` (K_DODGE 45, LEATHER_HIT_FLOOR 0,12, WARD_CORE_PER_INT 0, DODGE_CAP 0,75, BLOCK_DAMAGE_REDUCTION 0,85).
