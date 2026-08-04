# QA-Run 4 — Combat-Tiefenanalyse NAHKAMPF (nach Parität-Korrektur)

**Tester:** Playtester-Analyst (READ-ONLY; nur diese Datei geschrieben) · **Datum:** 2026-06-27
**Scope:** Nahkampf-Parität nach den Fixes — `meleeDamage`-Buff (×2.0 L<20 / ×1.8 L20-39 / ×1.5 L40-59 / ×1.3 L60+ auf den Waffen-Bonus, 130 Waffen) + eva-Fix (Fernkampf-`evasion += 5` aus `computeStats` entfernt, `character.ts` Z.234-238).
**Frage:** Ist Melee jetzt im Zielband **0.9–1.1×** relativ zu ranged/magic — und **nicht** dominant?

**Methode — echte Sim-Daten:** Temporäres Harness direkt auf der Engine (`createGame`→`combatStep`, fester Seed 4242), **1 h Sim (360 000 Ticks)** pro Build gegen denselben on-level Mob. Pro Stil realistische, **stil-eigene** Skill-Investition (melee→attack/power/defence/vitality; ranged→ranged/defence/vitality/fletching; magic→magic_off/magic_def/vitality/runecrafting), **Auto-Gear** (bestes tragbares Teil je Slot nach Stil-Score → triggert echte Set-Boni), voller Köcher, Mana praktisch unbegrenzt für Magie, Auto-Eat T3 + bestes Essen. **Mobs wie run3** für ein sauberes Δ: L10 `goblin_butcher`, L45 `skeleton_nekro` (run3 nannte es „L50"), L98 `aether_wraith`. Harness nach dem Lauf entfernt. Alle Zahlen unten sind reale Sim-Ausgaben.
*Caveat:* eigenes Harness ≠ run3-Harness (Auto-Gear statt Hand-Kit) → **absolute** kills/h sind NICHT run3-vergleichbar; vergleichbar sind die **stil-relativen ×-Faktoren** innerhalb eines Laufs und die **Dominanz-Ratios** (anderer-Stil ÷ bester Melee). Re-Run mit/ohne Krit-Gewichtung für Melee = **bit-identisch** → Gear-Auswahl ist fair, Melee nicht künstlich benachteiligt.

---

## Fun-Score: **7.5 / 10**

Der Melee-Buff ist **auf seiner Zielachse gelandet**: Nahkampf ist nicht mehr das universelle Durchsatz-Schlusslicht, liegt mid/late **gleichauf mit Fernkampf** (0.90–0.92×) und hat einen **gesunden, engen Waffen-Spread** — das run3-Schlüsselproblem „Schwert ist die Trap-Option" ist sogar **umgekehrt** (Schwert jetzt top). Wichtig: der Buff hat **nicht überkorrigiert** — Melee dominiert nirgends. ABER die 3-Stil-Parität ist weiterhin nicht erreicht, weil das Ungleichgewicht **verschoben** wurde: **Magie** ist jetzt der klare Ausreißer nach oben (mid 1.86×, late 1.50× über dem besten Melee), und Melee liegt damit gegen Magie **unter** Band (0.54–0.67×). Mechanik bleibt grundsolide: 0 Tode über alle 24 Build×Checkpoint-Läufe, keine Walls, deterministisch.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, on-level Mob)

`(x)` = relativ zum **besten Melee-Build** des Checkpoints. Begleit-Stats: dmg/acc/aIMs/crit/eva/def/hp.

### L10 vs goblin_butcher (L10, hp 90, dmg 18) — Gear-Tier Iron
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Schwert** | melee | **535** | **1.00** | 49 | 129 | 3290 | .03 | 36 | 76 | 328 |
| Dolch | melee | 456 | 0.85 | 39 | 136 | 2790 | .10 | 36 | 76 | 328 |
| Scimitar | melee | 420 | 0.79 | 45 | 130 | 2990 | .08 | 36 | 76 | 328 |
| Großschwert | melee | 419 | 0.78 | 73 | 125 | 4290 | .03 | 36 | 62 | 313 |
| Maul | melee | 382 | 0.71 | 87 | 121 | 4690 | .03 | 36 | 62 | 313 |
| Kurzbogen | ranged | 750 | **1.40** | 31 | 128 | 2287 | .20 | 61 | 47 | 255 |
| Langbogen | ranged | 736 | **1.38** | 33 | 130 | 2414 | .13 | 61 | 47 | 255 |
| Stab | magic | 547 | 1.02 | 49 | 121 | 3230 | .03 | 36 | 36 | 217 |

### L45 vs skeleton_nekro (L45, hp 480, dmg 60, regen 5, resist poison/bleed) — Gear-Tier Mithril
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Schwert** (ashen_reaper) | melee | **228** | **1.00** | 131 | 256 | 3110 | .11 | 51 | 200 | 832 |
| Scimitar | melee | 223 | 0.98 | 119 | 282 | 2810 | .13 | 51 | 200 | 832 |
| Dolch | melee | 221 | 0.97 | 107 | 295 | 2610 | .14 | 51 | 200 | 832 |
| Großschwert | melee | 213 | 0.93 | 176 | 268 | 4110 | .07 | 51 | 166 | 794 |
| Maul | melee | 191 | 0.84 | 203 | 256 | 4510 | .07 | 51 | 166 | 794 |
| Kurzbogen | ranged | 252 | 1.11 | 93 | 273 | 2389 | .26 | 89 | 139 | 675 |
| Langbogen | ranged | 247 | 1.08 | 97 | 282 | 2516 | .19 | 89 | 139 | 675 |
| Stab | magic | **423** | **1.86** | 257 | 253 | 2880 | .06 | 99 | 102 | 551 |

### L98 vs aether_wraith (L98, hp 950, dmg 72, resist shock) — Gear-Tier Aetherium
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Dolch** | melee | **330** | **1.00** | 245 | 606 | 2350 | .22 | 85 | 512 | 1877 |
| Schwert | melee | 321 | 0.97 | 298 | 558 | 2850 | .13 | 85 | 512 | 1877 |
| Großschwert | melee | 313 | 0.95 | 418 | 528 | 3850 | .13 | 85 | 422 | 1776 |
| Scimitar | melee | 302 | 0.92 | 278 | 570 | 2550 | .21 | 85 | 512 | 1877 |
| Maul | melee | 284 | 0.86 | 476 | 497 | 4250 | .13 | 85 | 422 | 1776 |
| Kurzbogen | ranged | 337 | 1.02 | 198 | 545 | 2168 | .35 | 143 | 436 | 1736 |
| Langbogen | ranged | 357 | 1.08 | 209 | 570 | 2295 | .27 | 143 | 436 | 1736 |
| Stab | magic | **495** | **1.50** | 507 | 568 | 2880 | .23 | 132 | 178 | 977 |

*(0 Tode in ALLEN 24 Läufen.)*

---

## Kernbefund — bester Melee relativ zu den anderen Stilen

| Checkpoint | bester Melee | ÷ Fernkampf(best) | ÷ Magie |
|---|---|--:|--:|
| L10 | Schwert 535 | **0.71** | 0.98 |
| L45 | Schwert 228 | **0.90** | **0.54** |
| L98 | Dolch 330 | **0.92** | **0.67** |

**Antwort auf die Leitfrage:**
- **Melee vs Fernkampf:** mid/late **im/am Band** (0.90 / 0.92×) — der Buff hat hier geliefert. Früh (L10) noch **0.71×** = Fernkampf-Frühdominanz hält an.
- **Melee vs Magie:** nur L10 im Band (0.98×); mid/late **deutlich unter Band** (0.54 / 0.67×) — weil **Magie** überschießt, nicht weil Melee zu schwach ist.
- **Dominant?** **Nein** — Melee dominiert an keinem Checkpoint. Der Buff hat sauber **nicht** überkorrigiert.

---

## Δ vs run3 (stil-relative Faktoren — die vergleichbare Metrik)

run3 (normiert auf besten Melee = Dolch) → run4 (best Melee):

| Achse | run3 (L10 / L50 / L99) | run4 (L10 / L45 / L98) | Bewegung |
|---|---|---|---|
| **Fernkampf-Vorsprung** über best Melee | 1.47 / 1.30 / 1.15 | **1.40 / 1.11 / 1.08** | **enger** (v.a. mid: 1.30→1.11) ✅ |
| **Magie-Vorsprung** über best Melee | 1.33 / 1.57 / 1.11 | **1.02 / 1.86 / 1.50** | früh fix ✅, mid/late **breiter** ⚠️ |
| Melee-Waffen-Spread | Schwert 0.83–0.93× (=Trap) | **Schwert top**, Spread 0.71–1.00 | **geheilt/umgekehrt** ✅ |
| Melee dominant? | nein (Boden) | **nein** (gleichauf ranged) | gewollt ✅ |

**Lesart des Δ:** Der `meleeDamage`-Buff hat die **Melee-vs-Fernkampf**-Lücke geschlossen (run3-P1 erledigt) und den **Waffen-Spread geheilt** (run3-P3 „Schwert-Trap" umgekehrt). Das Restproblem ist **nicht mehr Melee**, sondern **Magie** — das alte run3-P2 („Magie überschießt mid") wurde nicht angefasst und ist jetzt der dominante Ungleichgewichts-Treiber. *Caveat:* Auto-Gear stapelt Magies Krit-Roben evtl. aggressiver als run3s Hand-Kit → die Magie-Zahlen sind eine **Obergrenze**, aber selbst konservativ führt Magie mid/late ≥1.5×.

---

## Priorisierte Findings

### [P0] — keine
Keine Crashes, keine Walls, 0 Tode über alle 24 Läufe, deterministisch (Seed-stabil, Re-Run bit-identisch). Mechanik grundsolide.

### [P1 Balance] Magie ist der neue Ausreißer nach oben (nicht mehr Melee)
**Befund (Sim):** Magie clears mid **1.86×** (L45) und late **1.50×** (L98) den besten Melee — der höchste Wert der ganzen Messung. magicDamage erreicht L45 **257** (vs Schwert 131) und L98 **507** (vs Dolch 245). Treiber unverändert seit run3: `magicDamage = int·2 + …` (höchster Attribut-Koeffizient), zuverlässiger Burn-DoT (ignoriert def + Mob-Regen), voller Roben-Set + Krit-Stacking, **und Mana läuft im Dauerkampf nie leer** (manaRegen > manaCost). Gegen den Regen-/bleed-resist-Mob skeleton_nekro ist der burn-DoT zusätzlich der einzige Stil, der die Regeneration durchschlägt → 1.86×. **Der Melee-Fix hat das Ungleichgewicht von „Melee-Boden" zu „Magie-Decke" verschoben.**
**Fix-Vorschlag (combat-dev/balance, Magie-Seite):** `int·2 → ~int·1.6` ODER manaCost ~×1.5 schärfen (macht Mana zur echten Ressource — adressiert auch den toten Weak-Melee-Fallback) ODER Krit-Anteil der Roben-Sets trimmen. Ziel: Magie mid/late zurück ins 0.9–1.1-Band, dann sitzen alle drei Stile im Band.

### [P1 Balance] Fernkampf-Frühdominanz hält an (L10 best Melee 0.71×)
**Befund:** L10 clearen Kurz-/Langbogen **1.40×/1.38×** über dem besten Melee (Schwert 535 vs Bogen 750). Δ vs run3: 1.47 → 1.40 — kaum bewegt. Der level-gebänderte Melee-Buff (×2.0 unter L20) reicht im echten Frühgame nicht gegen das Bogen-Tempo (aIMs 2287 vs Schwert 3290) + frühe Krit-Chance (0.20). *Nebenbefund:* der Iron-Platte-Set-Bonus zündete im Auto-Gear bei Melee an L10 nicht (sets=0; 2 Kernslots gingen an nicht-Iron-Teile) → die L10-Melee-Zahl ist eher leicht **unter**schätzt; der kleine Set-Bonus (+5 meleeDmg/+34 hp) schließt die 0.71-Lücke aber ohnehin nicht.
**Fix-Vorschlag:** Entweder Frühgame-Bogen-Tempo leicht drosseln (z.B. shortbow `attackIntervalMs`-Bonus früh kleiner) oder den Melee-Frühbuff im untersten Band (L<20) noch etwas anheben, bis L10-Melee ~0.9× Bogen erreicht.

### [P2 Balance] Evasion-Identität weiter invertiert — „Tank" weicht schlechter aus als der Schütze
**Befund:** Der eva-Fix (`evasion += 5` raus) hat die Lücke verkleinert, aber **nicht gedreht**: L98 Fernkampf **eva 143 vs Melee eva 85** — der Leder-Schütze weicht weiter besser aus als der Platten-Nahkämpfer. dex (Super-Stat) + Evasion auf High-Tier-Leder (voidhide eva 30 etc.) überwiegen. Schlimmer: Leder ist endgame **kaum noch squishig** (def 436 vs Platte 512, hp 1736 vs 1877) → Fernkampf hat **High-DPS UND kaum defensive Kehrseite**. Die „Glass-Cannon"-Ranged-Identität existiert weiterhin nicht.
**Fix-Vorschlag:** Evasion auf High-Tier-Leder reduzieren und/oder Leder-`defense` flacher skalieren, damit Fernkampf real squishier wird. Melee behält dann seine echte Tank-Identität (def/hp).

### [P2 Balance] Tankigkeit bleibt wertlos — 0 Tode bei JEDEM Stil
**Befund (unverändert seit run3):** Über alle 24 Läufe **0 Tode**, auch für die squishigsten Magie-Builds (hp 217 @L10, 977 @L98). Mit Auto-Eat T3 + Mitigation ist Überleben für alle Stile gelöst → Melees def/hp-Vorsprung (L98 def 512/hp 1877) **kauft nichts**. Der einzige strukturelle Melee-Vorteil verpufft, der Durchsatz zählt allein.
**Fix-Vorschlag:** Entweder bewusst akzeptieren (idle-fair) ODER Spitzen-Mobs gefährlich genug machen (Burst/Spike jenseits dessen, was Auto-Eat in einem Tick auffängt), damit Platte-HP für Melee einen realen Durchsatz-Wert bekommt — sonst muss Melee-Offense exakt auf ranged-Niveau liegen (kann keinen „Tank-Aufpreis" rechtfertigen).

### [P3 Balance] Maul/2H ist die schwächste Melee-Wahl an jedem Checkpoint
**Befund:** Maul L10 0.71× / L45 0.84× / L98 0.86×; Großschwert etwas darüber. Trotz höchstem dmg (Maul L98 476!) bringt das langsame Intervall (4250–4690 ms) + niedrige Krit (0.13) weniger Durchsatz als die schnellen 1H. Der Verlust des Offhand-Schilds (def/hp) kommt obendrauf. Das ist die **Umkehrung** der run3-Schwert-Trap (Schwert jetzt top) — der Spread ist insgesamt gesund (mid/late 0.86–1.00), nur die langsamsten 2H hinken leicht.
**Fix-Vorschlag (optional):** Maul/Großschwert eine eigene Nische geben (z.B. spürbarer crit-Damage-Bonus oder Rüstungsdurchschlag für die langsamen 2H), oder als bewusste „High-Risk/Burst"-Wahl kommunizieren.

### [P3 Balance] Lifesteal & player-seitiger Bleed bleiben marginal
**Befund:** Der Lifesteal-Abs-Deckel 12 ist bei Endgame-hp 1877 vernachlässigbar (≤0.6 %/Treffer) → keine spürbare Melee-Identität. Bleed (Schwert-Linie, ashen_reaper) wird ausgerechnet vom Mid-Farm-Mob skeleton_nekro **resistiert** → im wichtigsten Farm-Fenster wirkungslos. (run3-P3 unverändert.)
**Fix-Vorschlag (optional):** Lifesteal-Abs-Deckel mild mit dem Tier skalieren ODER 2–3 Mid-Tier-Bleed/Poison-Mobs ohne Resist anbieten, damit player-seitiger Bleed ein echtes Profil bekommt.

---

## Mechanik-Checks (bestanden)
- **Trefferformel/Crit/Mitigation:** acc/(acc+eva), def/(def+125) Deckel 0.80 — symmetrisch, kein NaN/Unverwundbar-Drift. Melee-Accuracy hoch (L98 558–606) → zuverlässige Treffer.
- **Determinismus:** Seed-stabil; Re-Run mit veränderter Gear-Score-Gewichtung **bit-identisch** → Auto-Gear fair, Ergebnisse robust.
- **Set-Boni:** zünden korrekt (sets≥1 bei vollem Tier-Set; Melee-Platte/Robe/Leder je Stil). Einzige Ausnahme: Auto-Gear-Slot-Quirk an L10 (s. P1) — kein Engine-Bug.
- **Auto-Eat/Köcher/Mana:** wie run3 — sauber. 0 Tode = Auto-Eat T3 wirkt.

## Fazit
Der Nahkampf-Fix ist auf seiner **Zielachse erfolgreich**: Melee ist kein Schlusslicht mehr, liegt mid/late gleichauf mit Fernkampf, der Waffen-Spread ist gesund, Schwert ist keine Trap mehr — und Melee dominiert nirgends. Die **eine** verbleibende große Stellschraube ist jetzt **Magie nach unten** (P1) statt Melee nach oben; sekundär Fernkampf-Frühtempo (P1) und die echte Leder-Squishiness/Tank-Wert-Frage (P2). Sind die adressiert, sitzt das 0.9–1.1-Band über alle Checkpoints und alle drei Stile.
