# QA-Run 5 — Combat-Tiefenanalyse: MAGIE (nach Parität-R3-Trim)

**Tester:** Playtester-Analyst (READ-ONLY, keine Content/Engine-Änderung) · **Datum:** 2026-06-28
**Scope:** Magie-Stil nach der **Parität-R3-Normalisierung** (`design/balance-3style-parity-r3.md`): Roben-`magicDamage` ×0.60 + Roben-`int`-Mods ×0.34, Foki ×0.50, Wand/Stab ×0.80, Set-Boni ×0.60. Frage des Chefs: **Sitzt Magie nach dem Trim im Band 0,90–1,10× — nicht mehr Decke, aber auch nicht überkorrigiert?** Vergleich: `design/qa/run4-combat-magic.md` (6/10).

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`startCombat`→`advance`, real combat loop, Seed 5), **1 h Spielzeit (36 000 Ticks)** pro Build/Mob. **Best-craftable pro Slot** (Score-Selektion: Stil-Schaden » Stil-Attribut » Def/HP/Krit/Mana). Waffe: Melee/Ranged per **DPS-Proxy**, **Magie per empirischer 90-s-Mini-Sim (mana-bewusst!)** — d.h. das Harness wählt die Waffe, die real die meisten Kills bringt, nicht die mit der höchsten Rohzahl (entscheidend, s. P1). Skills = Kampf-Skills + Pflicht-Crafts auf Level L (Modus A). Auto-Eat `cooked_voidray` → **0 Tode** → Ratios = reine **Offense**. **6–8 on-level Mobs (±6 Lvl)** je Checkpoint, **per-Mob-Ratio gemittelt, Ranged = 1.00** (R3-Standard). Mana per-Tick (100 ms) über 3-min-Fenster gesampelt. **Harness nach dem Lauf entfernt** — `packages/**` unverändert. Alle Zahlen unten sind reale Sim-Ausgaben.

---

## Fun-Score: **8 / 10**  (run4: 6/10 — **+2**)

**Der R3-Trim hat sein Hauptziel erreicht: Magie ist keine Decke mehr und für den realistischen Best-Build nicht überkorrigiert.** Der dominante Magie-Build (Wand+Fokus) liegt mid/late bei **1,05–1,06×** vs. Ranged, der Stab (mit mana-effizienter Waffe) bei **0,95–0,98×** — sauber im Band. Verglichen mit der run4-Decke (Wand 1,74–1,84× vs. Melee) ist das ein **Kollaps in den Korridor**. Identität bleibt voll erhalten (Status-Effekte/Krit/Mana unangetastet), und die jetzt **tier-skalierte** Mana-Schild-Mechanik (run4-P2 umgesetzt) gibt Mana endlich an **allen** Tiers Gewicht — endgame ist nicht mehr inert.

**Zwei Punkte halten Magie unter 9,5:** (1) eine **Mana-Kosten-Falle bei Stäben** — die höchststufigen craftbaren Stäbe sind durch zu hohe `manaCost` **schlechter** als niedrigere Tiers (godiron_staff 0,69× < godspark_staff 0,95×): die Progression ist **invertiert**, der Magie-Main wird für das „beste" Crafting bestraft (P1). (2) ein **L10-Wand-Overshoot** (1,17× vs. Ranged, aus dem Band, P2). Beides ist eng begrenzt — der Stil als Ganzes ist gesund.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, on-level Mob; ×-Faktor = per-Mob-Ratio-Mittel, **Ranged = 1.00**)

| Build | L10 (goblin_butcher u.a.) | L40 (forest_warden u.a.) | L99 (aether_wraith u.a.) |
|---|---:|---:|---:|
| **Melee (Dolch/power)** | 716 (1.09×) | 630 (1.01×) | 916 (**1.11×**) |
| **Ranged (Kurz-/Langbogen)** | 679 (1.00×) | 621 (1.00×) | 827 (1.00×) |
| **Stab (mana-effizient)** | 668 (**0.98×**) | 601 (**0.97×**) | 784 (**0.95×**) |
| **Wand+Fokus** | 798 (**1.17×**) | 652 (**1.05×**) | 874 (**1.06×**) |
| **BESTE MAGIE** | **1.17×** | **1.06×** | **1.06×** |

Stab-Waffe je Checkpoint: L10 bronze_staff · L40 bramble_witchstaff · L99 **godspark_staff** (nicht godiron_staff!). Wand: L10 iron_wand+dim_focus · L40 mithril_wand+frost_focus · L99 **runite_wand**+god_focus (nicht godiron_wand!). → s. P1: das Harness *muss* niedrigere Tiers wählen, weil die Top-Tiers mana-starven.

**Band-Urteil:** Von 6 Magie-Werten (Stab+Wand × 3 Checkpoints) liegen **5 im Band 0,90–1,10**; einziger Ausreißer ist **Wand@L10 (1,17×)**. Der Stab ist auf **allen** Checkpoints im Band (0,95–0,98). **Magie ist keine Decke mehr** — die eigentliche Spitze ist jetzt **Melee** (1,11× @L99), das außerhalb meines Scopes liegt (s. P3-Hinweis).

### Δ vs run4 (run4-Referenz war Melee/Dolch — hier ×-Faktor **vs. Melee** zum Direktvergleich)

| Checkpoint | run4 Stab | run4 Wand | **run5 Stab** | **run5 Wand** | Δ Wand |
|---|---:|---:|---:|---:|---|
| L10 | 0.92× | 0.96× | 0.92× | **1.10×** | +0.14 |
| L40 | 1.64× | 1.84× | **0.96×** | **1.04×** | **−0.80** (Decke weg) |
| L99 | 1.54× | 1.74× | **0.86×** | **0.96×** | **−0.78** (Decke weg) |

**Antwort auf die Kernfrage:** Ja. Die run4-Magie-Decke (mid/late 1,5–1,84× vs. Melee) ist auf **~0,9–1,1×** zusammengeschmolzen. Magie ist im Band und **nicht** überkorrigiert (Best-Build 0,95–1,17× vs. Ranged). Die einzige Überkorrektur betrifft **nicht** den Stil, sondern eine **Waffen-Teilmenge** (Top-Tier-Stäbe, P1).

---

## Mana-Verlauf (3-min-Sampling, on-level Mob; Pool min/avg/max, below-cost % = Weak-Melee-Fenster)

| Build | maxMana | min | avg | Cost | Regen/s | below-cost % |
|---|---:|---:|---:|---:|---:|---:|
| Stab L10 (bronze_staff) | 64 | 1 | 13 | 5 | 2.9 | 5.6 % |
| Wand L10 (iron+dim_focus) | 64 | 1 | 19 | 6 | 2.9 | 7.5 % |
| Stab L40 (bramble_witchstaff) | 151 | 1 | 49 | 6 | 5.1 | 0.6 % |
| Wand L40 (mithril+frost_focus) | 151 | 4 | 19 | 8 | 5.1 | 10.9 % |
| **Stab L99 (godspark_staff)** | 312 | 6 | 116 | 6 | 9.7 | **0.1 %** |
| **Wand L99 (runite+god_focus)** | 312 | 4 | 26 | 9 | 9.7 | **7.1 %** |

**Lesart:** Mana **beißt jetzt** — anders als run4 (dort endgame inert, min 507/650). Treiber ist der **tier-skalierte Mana-Schild** (`costPerDamage = 2 × (1 + monster.level/50)` → **~5,9 Mana je absorbiertem HP bei L98**, run4 war flat 2). Das ist die Umsetzung der run4-P2-Empfehlung und funktioniert: der Pool wird im Dauerkampf real gedrückt, der `MAGIC_WEAK_FACTOR (0.35)`-Notschlag feuert. **ABER** dieselbe Mechanik + die hohen `manaCost` der Top-Stäbe sind genau die Ursache der Stab-Falle (P1): bei `manaCost 24` und Regen 9,7/s reicht das Mana nicht für einen vollen Cast-Loop **plus** Schild → 73 % Weak-Melee (Messung unten).

---

## Top-Stärken (Magie)

1. **R3-Trim sitzt — Decke weg, nicht überkorrigiert.** Best-Magie 0,95–1,17× vs. Ranged (mid/late 1,05–1,06; Stab 0,95–0,98). Die run4-Mid/Late-Decke (1,5–1,84×) ist sauber in den Korridor gefallen, ohne den Stil zu zerschießen.
2. **Gear-Trim verifiziert im Content.** godspark body magicDamage **18**, mitre **11**, skirt **12** (R3-Soll exakt); voidweave body **17**; aether_orb **12**, void_focus **16**, god_focus **21**; godiron_wand **58**. Alle R3-§3-Faktoren angewandt; Status-Effekte/maxMana/Krit/`wis` unberührt — Identität intakt.
3. **Mana ist endlich durchgehend relevant.** Der tier-skalierte Schild drückt den Pool an allen Tiers (L40-Wand 10,9 %, L99-Wand 7,1 % Weak-Melee), endgame ist **nicht mehr inert** (run4-B4 behoben).
4. **0 Tode, 0 NaN, 0 Crashes** über alle 4 Builds × 3 Checkpoints; Save/Combat-Guards greifen.

---

## Priorisierte Findings

### [P0] — keine. Keine Crashes, NaN-Drift, 0 Tode über alle Magie-Läufe.

### [P1 Balance] Mana-Kosten-Falle: Die höchststufigen craftbaren Stäbe sind throughput-NEGATIV (invertierte Progression)
**Befund (verifiziert, L99, forced weapon, avg kills über 6 Mobs, ×vs Ranged):**
| Waffe | manaCost | magicDamage | kills/h | ×Ranged |
|---|---:|---:|---:|---:|
| **godiron_staff** (req 99, Top-Tier) | **24** | 90 | 574 | **0.69×** |
| **aetherium_staff** (req 90) | 21 | 74 | 581 | **0.70×** |
| godspark_staff (req 88) | *fallback 6* | 62 | 784 | **0.95×** |
| godiron_wand (req 99, Top-Tier) | 12 | 58 | 855 | 1.03× |
| aetherium_wand (req 90) | 12 | 47 | 834 | 1.01× |
| **runite_wand** (req 60) | 9 | 26 | 875 | **1.06×** |

Bei **Stäben** ist die Progression **invertiert**: der teuerste, höchst-gegatete Stab (godiron_staff, 90 Schaden) liefert mit **0,69×** dramatisch weniger als der niedrigere godspark_staff (0,95×). Ursache: `manaCost` wächst (8→24), `manaRegen` aber nicht im selben Tempo (L99 nur 9,7/s) — und der tier-skalierte Mana-Schild zieht am **selben** Pool. Folge: godiron_staff steht **73 %** der Ticks unter Cast-Kosten → Dauer-Weak-Melee (×0,35). Ein Magie-Main, der bis req 99 grindet, um den „besten" Stab zu bauen, wird dafür **bestraft**. Bei Wänden ist die Falle nur mild (godiron 1,03 vs runite 1,06), weil deren Cost-Spanne klein ist (9–12). **Nebenbefund:** godspark_staff ist nur deshalb gut, weil ihm das `manaCost`-Feld **fehlt** und er auf `MANA_PER_CAST = 6` zurückfällt — ein **Glücksfall-Bug**: würde man ihm den „korrekten" hohen Wert geben, wäre auch er eine Falle.
**Fix-Vorschlag (content/engine):** `manaRegen`-Skalierung mit Tier anheben **oder** die Stab-`manaCost`-Leiter am oberen Ende kappen (godiron/aetherium_staff 24/21 → ~10–12), sodass der Top-Stab den Top-Schaden auch ausspielen kann. Ziel: kein craftbares Top-Tier darf strikt schlechter sein als ein niedrigeres. (Revier: content für Werte; ggf. combat/logic für Regen-Kurve.)

### [P2 Balance] L10-Wand überschießt das Band (1,17× vs Ranged)
**Befund:** Wand+`dim_focus` ist früh der stärkste Stil (798 vs Ranged 679 = 1,17× — out of band; Stab dagegen 0,98×, sauber). Die billige Cast-Kosten (5–6) + −300 ms Intervall + Fokus-Crit machen den frühen Wand-Caster überlegen, während Melee/Ranged früh langsamer hochlaufen. Kein Drama (eng begrenzt auf L10), aber der einzige Magie-Wert außerhalb 0,90–1,10.
**Fix-Vorschlag:** Früh-Foki (dim_focus) oder Früh-Wand-`magicDamage` minimal trimmen, bis L10-Wand ≤1,10× trifft. (Revier: content.)

### [P2 Balance] Wand+Fokus bleibt der dominante Magie-Build — Stab strukturell darunter
**Befund:** An jedem Checkpoint liegt Wand+Fokus über dem (mana-effizienten) Stab: L10 1,17 vs 0,98, L40 1,05 vs 0,97, L99 1,06 vs 0,95. Der Abstand ist **klein** (run4 war Wand 1,84 vs Stab 1,28 — jetzt ~0,1 statt ~0,5), aber Wand ist konsistent die bessere Wahl. Die Stab-vs-Wand-Identität existiert, aber Wand „gewinnt" weich.
**Fix-Vorschlag:** Mit P1 zusammen lösen — wenn der Top-Stab seinen Schaden ausspielen darf (Cost-Fix), zieht der Stab an den Wand-Durchsatz heran und die Burn-Identität sitzt auf einem konkurrenzfähigen Pferd.

### [P3 Doku] Live-Code hat `int·1.7` — zusätzlich zum R3-Gear-Trim (R3 hat auf `int·2` validiert)
**Befund:** `character.ts:223` lautet `magicDamage = int·1.7 + magic_off·1.2 + eq` — run4 hatte `int·2`. Der R3-Spec ändert **nur Gear** und validierte explizit auf `int·2` („`int·1.7` revertiert"). Im Live-Code sind also **beide** Nerfs aktiv (Gear-Trim **und** `int·1.7`, run4-P3-Empfehlung). Netto landet Magie trotzdem **im Band** (kein Schaden), aber: wer später eine der beiden Stellschrauben „zurückdreht" in der Annahme, die andere existiere nicht, verschiebt die Balance. **Festhalten:** beide gehören zusammen.

### [P3 Politur] Burn-DoT sitzt auf dem schwächeren Build
**Befund:** Burn liegt exklusiv auf Stäben (godspark_staff burn 22, godiron_staff 31) — also auf dem Build, der per P1/P2 unter dem Wand liegt. Die thematische „Feuer-Magier"-Fantasie ist damit der schwächere Pfad. Behebt sich mit dem Stab-Fix (P1/P2).

### [P3 Kontext — außerhalb Magie-Scope, für Melee/Ranged-Personas] Melee ist jetzt die Decke
**Befund:** Nach dem Magie-Trim ist **Melee** die Spitze (Dolch/power 1,09–1,11× vs Ranged), Ranged der Boden, Magie dazwischen. Die L99-Ordnung ist Melee 1,11 > Magie(Wand) 1,06 > Ranged 1,00. Kein Magie-Problem, aber „alle 3 im Band" ist erst erreicht, wenn die Melee>Ranged-Spreizung (R3 ließ Attribut-/ammo-Hebel bewusst unangetastet) adressiert wird. Für die Melee/Ranged-Tester notieren.

---

## Mechanik-Checks (Magie, alle bestanden)
- **R3-Gear-Trim** im Content angewandt (godspark/voidweave-Roben, Foki, Wände/Stäbe, Set-Boni) — Stichproben decken sich exakt mit `balance-3style-parity-r3.md` §3.
- **Per-Waffe `manaCost`** korrekt gelesen (`castManaCost`), Fallback auf `MANA_PER_CAST = 6` bei fehlendem Feld (godspark_staff) — funktioniert, aber als Glücksfall (s. P1).
- **Mana-Schild tier-skaliert** (`MANA_SHIELD_COST_PER_DAMAGE × (1 + level/50)`, Deckel `ABSORB_PCT 0.5`) — greift NACH Defense, draint den Cast-Pool, endlich → keine Unsterblichkeit.
- **Cast → Weak-Melee (×0.35) → Regen → Resume** deterministisch, kein Hänger; Weak-Melee legt keinen Burn.
- **accuracy** stil-abhängig an `magic_off` gekoppelt (run3-B1 intakt): L99 acc 745–781, Miss ~0–2/Log.

## „Was fehlt für 9,5?"
1. **Stab-Mana-Falle entschärfen (P1)** — Top-Stäbe (godiron/aetherium) so, dass ihr höherer Schaden den höheren `manaCost` schlägt; kein craftbares Top-Tier darf throughput-negativ sein. **Größter Hebel.**
2. **L10-Wand trimmen (P2)** — den einzigen Out-of-Band-Wert (1,17×) auf ≤1,10 ziehen.
3. **Stab an Wand-Parität heben (P2)** — beide Magie-Builds gleichwertig, damit die Burn-Identität konkurrenzfähig ist.
4. **(cross-style) Melee>Ranged-Spreizung schließen** — erst dann sitzt das ganze Dreieck im Band (nicht Magie-Revier, aber Voraussetzung für „alle drei sauber").

## Fazit
Der R3-Trim ist ein **klarer Erfolg**: Magie ist von der Allerwelt-Decke (run4 mid/late 1,5–1,84×) auf **0,95–1,06× im Korridor** gefallen, ohne überzukorrigieren, mit voll erhaltener Mana/Status-Identität und einer Mana-Mechanik, die jetzt an allen Tiers beißt. **+2 auf 8/10.** Was den Sprung auf 9,5 verhindert, ist **keine** Stil-Decke mehr, sondern eine eng begrenzte **Waffen-Falle** (Top-Tier-Stäbe sind durch `manaCost` × tier-Schild throughput-negativ — invertierte Progression) plus ein kleiner **L10-Wand-Overshoot**. Beide sind reine Content/Cost-Justierungen.

*(Sim-Harness war temporär und wurde nach dem Lauf entfernt — keine Engine-/Content-Änderung; `packages/**` unverändert.)*
