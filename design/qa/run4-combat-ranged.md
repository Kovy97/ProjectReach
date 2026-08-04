# QA-Run 4 — Combat-Tiefenanalyse FERNKAMPF (nach Evasion-Fix + voidhide)

**Tester:** Playtester-Analyst (READ-ONLY) · **Datum:** 2026-06-27 · **Fokus:** Fernkampf
**Scope:** `combat.ts`, `computeStats` (`character.ts`), Bögen/Pfeile/Köcher/Leder/voidhide aus `packages/content/src/index.ts`, `shared/src/index.ts`.
**Leitfrage (Chef):** Nach dem Engine-Fix (flacher `evasion += 5` für ranged ENTFERNT) — ist Fernkampf nicht mehr tankier als Platten-Nahkampf? Ist er noch zu dominant (Run3: 1.47×/1.30×/1.15×) oder jetzt im ±15 %-Band? Wirkung der neuen voidhide-L99-Range-Rüstung. Ammo/Köcher/Out-of-Ammo, Pfeil-Tiers, Bogen↔Holz-Kopplung.

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`advance`, deterministischer Seed 5), je Checkpoint **drei tier-gleiche Builds** (melee Dolch / ranged Kurzbogen+Köcher / magic Stab) gegen denselben **on-level Mob** über **1 h** Spielzeit, mit **stil-realistischer Skill-Investition** (melee attack+power+defence+vitality → str/dex/con · ranged ranged+defence+vitality → dex/con · magic magic_off+magic_def+defence+vitality → int/wis/con) und **auto-gewählter, stil-passender Rüstung** pro Slot (Platte / Leder bzw. voidhide / Robe), gefülltem Köcher und Auto-Eat. Gemessen: **kills/h** + Begleit-Stats aus `computeStats`. Harness nach dem Lauf **entfernt**. Alle Zahlen unten sind reale Sim-Ausgaben.

---

## Fun-Score: **6.5 / 10**

Mechanisch ist Fernkampf weiterhin **rock-solid**: Köcher/Munition, Out-of-Ammo-Stopp, die 12-Tier-Pfeilleiter mit steigendem `ammoDamage` und die saubere Bogen↔Holz/Pfeil-Kopplung funktionieren bugfrei, 0 Tode über alle Builds. **Aber das eigentliche Ziel der Run4-Fixes ist verfehlt:** Der gefeierte Engine-Fix (`evasion += 5` raus) ist faktisch **inert** (er bewegt die Ranged-Evasion um ~1.6 %), weil der Evasion-Vorsprung gar nicht aus dem +5 kam, sondern aus **dex (ranged trainiert dex) + evasion-lastigem Leder/voidhide-Gear**. Fernkampf ist nach dem Fix **immer noch deutlich tankier als Platten-Melee** (Evasion L99: **300 vs 104**, sogar ein **größerer** Abstand als Run3) und beim Durchsatz endgame **schlechter** statt besser geworden (L99 **1.15× → 1.30×**) — getrieben von der neuen voidhide-Rüstung, die Tank- **und** Offensiv-Stats stapelt. Die intendierte „höchster Schaden, geringste Defensive"-Glass-Cannon-Identität existiert weiterhin nicht. Halber Punkt unter Run3 (7), weil die Fixes das Range-Problem nicht gelöst, am Endgame sogar leicht verschärft haben.

---

## Evasion / Survivability — die Kernfrage

| Checkpoint | melee eva | ranged eva | **ranged/melee** | melee def/hp | ranged def/hp | Tode (alle Stile) |
|---|---:|---:|---:|---:|---:|---:|
| L10 (goblin_butcher) | 22 | 59 | **2.7×** | 63 / 307 | 34 / 257 | 0 |
| L40 (forest_warden) | 42 | 115 | **2.7×** | 152 / 715 | 89 / 530 | 0 |
| L99 (aether_wraith) | 104 | 300 | **2.9×** | 493 / 1988 | 298 / 1379 | 0 |

**Lesart:** Der „Leder-Schütze wendiger als der Platten-Nahkämpfer"-Effekt, den der Fix beheben sollte, ist **nicht** behoben — er ist endgame **stärker** als in Run3 (dort ranged 156 vs melee 94 = 1.66×; jetzt 300 vs 104 = 2.9×). Melee bleibt der **HP/def-Tank**, Fernkampf ist der **Evasion-Tank** — und mit Auto-Eat (0 Tode überall) ist beides „sicher genug", der Evasion-Überschuss ist also reiner Bonus ohne Kehrseite. Quantitativ ist der Engine-Fix wirkungslos: Bei L99 läge die Ranged-Evasion **mit** altem +5 bei ~305 statt 300 — der eigentliche Treiber sind 190 Gear-Evasion aus voidhide.

---

## Durchsatz (kills/h, 1 h Sim, on-level Mob)

| Build | Stil | L10 vs goblin_butcher | L40 vs forest_warden | L99 vs aether_wraith |
|---|---|---:|---:|---:|
| Dolch | melee | 500 (1.00×) | 295 (1.00×) | 359 (1.00×) |
| **Kurzbogen** | **ranged** | **707 (1.41×)** | **397 (1.35×)** | **466 (1.30×)** |
| Stab | magic | 423 (0.85×) | 559 (1.89×) | 693 (1.93×) |

*(×-Faktor relativ zum Nahkampf-Dolch. 0 Tode in allen Läufen.)*

**Begleit-Stats L99** (dmg / acc / aIMs / crit / eva / def / hp):
- melee-Dolch: dmg 274, acc 660, aIMs 2250, crit 0.23, **eva 104, def 493, hp 1988**
- ranged-Bogen: dmg 259, acc 586, aIMs 1913, crit 0.32, **eva 300, def 298, hp 1379**
- magic-Stab: dmg 592, acc 637, aIMs 2880, crit 0.29, eva 184, def 256, hp 1292

Fernkampf liegt an **jedem** Checkpoint **über** dem ±15 %-Band (1.30–1.41×). Er ist nicht mehr **der** Ausreißer — Magie überschießt jetzt noch stärker (L40/L99 ~1.9×) — aber „im Band" ist Fernkampf weiterhin nicht.

---

## Δ vs Run3

| Metrik | Run3 | Run4 | Δ |
|---|---:|---:|---|
| ranged kills/h L10 | 1.47× | **1.41×** | leicht besser (−0.06), weiter über Band |
| ranged kills/h L99 | 1.15× | **1.30×** | **schlechter (+0.15)** — voidhide drückt nach oben |
| ranged eva L99 | 156 | **300** | **deutlich schlechter (Glass-Cannon weiter weg)** |
| ranged eva/melee L99 | 1.66× | **2.9×** | **schlechter** |
| ranged dmg L99 | 216 | 259 | höher (voidhide +rangedDamage 37 + godiron-Pfeil) |
| Engine `evasion += 5` | aktiv | **entfernt** | korrekt umgesetzt, aber **wirkungslos** (~1.6 %) |
| Ammo/Out-of-Ammo/Tiers/Bogen-Kopplung | sauber | **sauber** | unverändert gut |

*(Run3 maß den Mid-Checkpoint bei L50, Run4 bei L40 — der Mid-Wert ist daher nicht 1:1 vergleichbar; L10 und L99 sind es.)*

**Fazit des Δ:** Die Run4-Fixes haben das Range-Problem **nicht** entschärft. Low-Level minimal besser, **Endgame schlechter**, Evasion-Identität **weiter entfernt** als zuvor.

---

## Priorisierte Findings

### [P1 Balance] Der Evasion-Fix ist inert — Ranged ist immer noch ~3× so ausweich-stark wie Platten-Melee
**Befund:** `evasion = 10 + dex·1 + sDefence·0.4 + eq.evasion` (character.ts:238); der frühere `+5` ist raus (verifiziert, `styles.test.ts` deckt es ab). Der Range-Evasion-Vorsprung kam aber **nie** primär aus dem +5, sondern aus (a) **dex** als Evasion-Treiber, das der Fernkampf über den `ranged`-Skill (trains dex) ohnehin hochzieht, und (b) **evasion-lastiger Leder/voidhide-Rüstung**. Ergebnis: L99 ranged eva **300** vs melee **104** (2.9×) — größerer Abstand als Run3. Der Fix bewegt die Zahl um ~5 Punkte (~1.6 %).
**Fix-Vorschlag:** Den Hebel dort ansetzen, wo der Effekt sitzt — **Gear-Evasion**: Leder/voidhide-Evasion-Budget kürzen (s. P1-voidhide) **und/oder** Evasion entkoppeln, indem die Range-Identität bewusst auf „hoher Schaden, **niedrige** Evasion+def+hp" gedreht wird (Leder gibt rangedDamage statt evasion). Solange Auto-Eat Survivability trivialisiert (0 Tode), ist hohe Evasion auf dem High-DPS-Stil ein reiner Gratis-Vorteil ohne Kehrseite.

### [P1 Balance] Neue voidhide-Rüstung stapelt Tank + Offense → Ranged-Endgame 1.15× → 1.30×
**Befund:** voidhide (L99-Range-Rüstung, leatherworking 99) trägt in Summe **def 224 · evasion 190 · maxHp 485 · rangedDamage 37**. Zum Vergleich Godiron-Platte (Melee-L99): **def 327 · maxHp 767 · evasion ~0 · meleeDamage 0**. voidhide gibt also *etwas* weniger def/hp als Platte (gewollter Tank-Tradeoff), **aber zusätzlich 190 Evasion (best-in-slot) UND 37 rangedDamage** — Offense, die die Melee-Platte gar nicht bekommt. Damit ist voidhide „Tank minus ein bisschen, **plus** Ausweichen, **plus** Schaden" — rundum stärker, nicht squishier. Effekt: Range-L99 sprang von Run3 1.15× auf **1.30×** (dmg 216→259, eva 156→300).
**Fix-Vorschlag:** voidhide entweder als **echtes Glass-Gear** auslegen (Evasion ~halbieren auf ~90–100, def/hp deutlich unter Platte, rangedDamage als Identität behalten) **oder** als reine Defensiv-Option ohne rangedDamage. Aktuell ist es ein Allround-Upgrade, das die intendierte L99-„Parität" in einen Range-Vorsprung verkehrt.

### [P2 Balance] Fernkampf hat weiterhin keine Glass-Cannon-Kehrseite
**Befund:** Intendiert ist „höchster Schaden, geringste Defensive". Real ist Fernkampf: **nicht** der höchste Schaden (Magie dmg 592 > ranged 259 @L99), **höchste Evasion** aller Stile (300), **0 Tode** dank Auto-Eat. Es gibt keinen Slot, an dem Fernkampf für seinen Durchsatz bezahlt — der einzige Nominal-Nachteil (weniger hp/def) ist mit Auto-Eat + 300 Evasion bedeutungslos.
**Fix-Vorschlag:** Folgt aus P1 — wenn Gear-Evasion gekürzt und voidhide entschärft ist, entsteht die Kehrseite (mehr Treffer → mehr Food-Verbrauch / Risiko in Auto-Eat-losen Kontexten wie Dungeons). Alternativ Range-Durchsatz direkt 10–15 % senken (Kurzbogen `rangedDamage`-Linie oder `attackIntervalMs`-Bonus −150 → −100).

### [P2 Kontext] Magie überschießt jetzt stärker als Fernkampf (außerhalb Range-Remit, aber bandrelevant)
**Befund:** L40 1.89×, L99 1.93× — Magie ist der neue Top-Durchsatz (Run3: L50 1.57×). Das verschiebt zwar den „schlimmsten Ausreißer" weg vom Fernkampf, ändert aber nichts daran, dass **Fernkampf selbst nicht im Band** ist. Detail-Analyse Sache des Magie-Testers; hier nur als Einordnung, dass das ±15 %-Ziel global noch nicht erreicht ist.

### [P3 Ökonomie] Pfeil-Durchsatz ist real spürbar (Köcher-Logistik)
**Befund:** Bei L99 (aIMs 1913 ms) verschießt Fernkampf ~**1.880 Pfeile/h**; im Dauer-Idle summiert sich das zur fühlbaren Fletching/Schmiede-Senke. Mechanisch korrekt (Out-of-Ammo-Stopp greift), aber der Spieler muss Munition aktiv nachproduzieren — das ist die einzige echte „Kosten"-Seite des Fernkampfs und sollte beim Balancing **nicht** noch entwertet werden (z. B. durch zu billige Pfeile).
**Fix-Vorschlag:** Keine Aktion nötig; bewusst als Range-Kostenfaktor erhalten.

---

## Mechanik-Checks Fernkampf (alle bestanden)
- **Köcher/Ammo (OSRS):** Munition lebt im `ammo`-Slot (`equipment.ammo` + `state.ammoCount`); nur passende, nicht-leere Munition feuert scharf und addiert `ammoDamage` (combat.ts:615–621). Verbrauch nie negativ.
- **Out-of-Ammo-Stopp:** `stopIfOutOfAmmo` (combat.ts:697–705) beendet den Kampf sauber, sobald der Köcher leer ist (letzter Pfeil fällt noch) — kein lautloser −60 %-Notschlag, keine AFK-Loot-Verschwendung. Nur Fernkampf betroffen; Nahkampf läuft munitionslos weiter, Magie degradiert bewusst zum Weak-Melee statt zu stoppen.
- **Pfeil-Tiers:** Lückenlose 12-Tier-Leiter copper→godiron mit monoton steigendem `ammoDamage` (copper 1 … godiron 32; via Pfeilspitzen-Schmiedekette bis 42). Top-Bogen schießt Top-Pfeil.
- **Bogen↔Holz/Pfeil-Kopplung:** Jeder Kurz-/Langbogen referenziert seinen Tier-Pfeil (`copper_shortbow`→`copper_arrow` … `godiron_shortbow`→`godiron_arrow`), `requirements.ranged/fletching` steigen tier-gerecht. Kein Top-Bogen→Low-Pfeil-Schlupf.
- **Krit/Tempo-Identität:** Fernkampf-Stil-Boni greifen (critChance +0.1 gedeckelt 0.85; aIMs ×0.85). L99 ranged crit 0.32, aIMs 1913 — schnellster Stil. Funktioniert wie gedacht.
- **0 Tode:** Über alle 9 Läufe — Auto-Eat + Mitigation tragen für alle Stile.

## Fazit
Fernkampf-**Mechanik** bleibt sauber und bugfrei. Fernkampf-**Balance** wurde durch die Run4-Fixes **nicht** verbessert: Der Engine-`evasion += 5`-Fix ist korrekt umgesetzt, aber **wirkungslos**, weil der Evasion-Vorsprung aus dex + Gear stammt — und die neue voidhide-Rüstung hat den Endgame-Durchsatz **und** den Evasion-Abstand sogar **vergrößert**. Ranged ist weiterhin **über dem ±15 %-Band** (1.30–1.41×) und **tankier als Platten-Melee** in Evasion. Die zwei wirksamen Hebel: **(1)** Gear-Evasion (Leder/voidhide) kürzen, **(2)** voidhide als echtes Glass-Gear (oder ohne rangedDamage) auslegen — erst dann landet Fernkampf im Band und bekommt seine Glass-Cannon-Kehrseite.
