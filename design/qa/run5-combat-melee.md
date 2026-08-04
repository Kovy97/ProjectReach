# QA-Run 5 — Combat-Tiefenanalyse NAHKAMPF (nach Parität-R3: Magie-Gear getrimmt)

**Tester:** Playtester-Analyst (READ-ONLY; nur diese Datei geschrieben) · **Datum:** 2026-06-28
**Scope R5:** Parität-Iteration R3 — **NUR Magie-Gear getrimmt** (Roben-/Stab-Linie). **Melee unverändert ggü. R2** (Platten-`meleeDamage`-Backbone: platebody +18 / fullhelm +8 / platelegs +12 / gauntlets +6 / sabatons +4 / medhelm +8; `smithing→str` als Melee-str-Quelle). Fernkampf ebenfalls unangetastet.
**Leitfrage:** Liegt der beste **DPS-optimale** Nahkampf-Build jetzt im Zielband **0.9–1.1×** zu ranged/magie @L10/L45/L98 — und hat der Magie-Trim das run4-Problem („Magie ist die Decke") geheilt, ohne Melee zu beschädigen?

**Methode — echte Sim-Daten:** Temporäres Harness direkt auf der Engine (`createGame`→`startCombat`→`advance`, fester Seed 4242), **1 h Sim (720×5 s-Chunks)** pro Build gegen denselben on-level Mob. **Auto-Gear** (bestes tragbares Teil je Slot nach Stil-Score → echte Set-/Slot-Wahl), Auto-Eat **T3** + `cooked_voidray`, voller Köcher (Bogen-`ammoType`), Magie via Gear-`manaRegen` (KEIN Mana-Cheat — so bildet der Lauf den Gear-Trim ehrlich ab). **Skill-Investition pro Stil = realistisch inkl. der Pflicht-Handwerksskills für das jeweilige Gear:** melee→attack/power/defence/vitality **+ smithing/mining** (Platte ist defence-gated, aber `smithing`=str-Backbone), ranged→ranged/defence/vitality/fletching **+ leatherworking** (Leder/Voidhide sind leatherworking-gated → dex), magic→magic_off/magic_def/vitality/runecrafting. Alle Skills auf das Checkpoint-Level → „best craftbar @ Level" (Iron/Mithril/Aetherium). Mobs **identisch zu run4-melee** für ein sauberes Δ: L10 `goblin_butcher`, L45 `skeleton_nekro`, L98 `aether_wraith`. Harness nach dem Lauf **entfernt**. Alle Zahlen unten sind reale Sim-Ausgaben.

*Caveat (wie schon run3→run4):* eigenes Harness ≠ run4-Harness (anderer Seed/Gear-Score; run4-melee trainierte für ranged **kein** leatherworking und bot Melee **ohne** smithing an) → **absolute** kills/h und die **exakten** ×-Faktoren sind nicht 1:1 mit run4. Verlässlich sind (a) die **within-run5** Stil-Ratios (gleiches Harness/Seed über alle drei Stile) und (b) die **Richtung** der Bewegung vs run4.

---

## Fun-Score: **8.0 / 10**  (Δ vs run4: **+0.5**)

Der Magie-Trim ist **gelandet**: Magie ist **nicht mehr** der Ausreißer nach oben — von run4s **1.86× / 1.50×** über dem besten Melee (mid/late) auf jetzt **1.04× / 0.88×**. Das run4-P1 („Magie ist die Decke") ist damit **erledigt**, und Melee wurde dabei **nicht** angefasst und auch **nicht** kaputt-balanciert. Mit dem realistischen `smithing→str`-Backbone sitzt der beste Nahkämpfer **früh an der Spitze** (L10 top), **mid perfekt im Band** (L45: 1.00× ranged / 0.96× magie) und **late nur knapp unter** Fernkampf (L98 0.87×). Mechanik weiter grundsolide: **0 Tode** über alle Läufe, deterministisch, keine Walls. Was die 9,5 verhindert: (1) mit gefixtem Magie-Dach ist **Fernkampf** der neue Ausreißer (L98 **1.14×** über Melee), (2) die Melee-Parität **hängt am smithing→str-Backbone** — ohne diese Investition sackt Melee mid/late unter Band, (3) die Evasion-Identität ist weiter **invertiert** (Leder-Schütze weicht besser aus als der Platten-Tank) und (4) **0 Tode überall** → Melees def/hp-Tank-Vorteil kauft nach wie vor nichts.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, on-level Mob)

`×` = relativ zum **besten Melee-Build** (fair = mit smithing-Backbone) des Checkpoints. Begleit-Stats: dmg(effektiv)/acc/aIMs/crit/eva/def/hp. **0 Tode in ALLEN Läufen.**

### L10 vs goblin_butcher (L10, hp 90, dmg 18) — Gear-Tier Iron
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Dolch** | melee | **760** | **1.00** | 55 | 136 | 2365 | .10 | 36 | 82 | 394 |
| Scimitar | melee | 725 | 0.95 | 61 | 130 | 2565 | .08 | 36 | 82 | 394 |
| Schwert | melee | 630 | 0.83 | 65 | 129 | 2865 | .03 | 36 | 82 | 394 |
| Streitkolben | melee | 630 | 0.83 | 62 | 122 | 2865 | .03 | 36 | 84 | 394 |
| Axt | melee | 596 | 0.78 | 64 | 124 | 3015 | .03 | 36 | 80 | 364 |
| Kampfaxt | melee | 588 | 0.77 | 66 | 124 | 3065 | .03 | 36 | 80 | 364 |
| Speer (2H) | melee | 556 | 0.73 | 61 | 132 | 3215 | .03 | 46 | 63 | 314 |
| Großaxt (2H) | melee | 459 | 0.60 | 75 | 125 | 3915 | .03 | 32 | 63 | 314 |
| Großschwert (2H) | melee | 437 | 0.58 | 84 | 125 | 4115 | .03 | 32 | 65 | 344 |
| Maul (2H) | melee | 397 | 0.52 | 95 | 121 | 4515 | .03 | 32 | 63 | 314 |
| Langbogen | ranged | 686 | 0.90 | 36 | 137 | 2678 | .10 | 50 | 68 | 303 |
| Kurzbogen | ranged | 652 | 0.86 | 34 | 134 | 2678 | .17 | 50 | 68 | 303 |
| Stab | magic | 610 | 0.80 | 45 | 121 | 2880 | .03 | 51 | 26 | 213 |

### L45 vs skeleton_nekro (L45, hp 480, dmg 60, regen 5, resist poison/bleed, enrage) — Gear-Tier Mithril
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Dolch** | melee | **305** | **1.00** | 135 | 295 | 2435 | .14 | 51 | 206 | 946 |
| Scimitar | melee | 285 | 0.93 | 147 | 282 | 2635 | .13 | 51 | 206 | 946 |
| Schwert | melee | 281 | 0.92 | 156 | 278 | 2935 | .07 | 51 | 206 | 946 |
| Großschwert (2H) | melee | 254 | 0.83 | 204 | 268 | 3935 | .07 | 51 | 172 | 908 |
| Maul (2H) | melee | 259 | 0.85 | 214 | 256 | 4335 | .07 | 51 | 166 | 798 |
| Kurzbogen | ranged | 305 | 1.00 | 108 | 310 | 2286 | .26 | 98 | 185 | 761 |
| Langbogen | ranged | 290 | 0.95 | 112 | 319 | 2421 | .19 | 98 | 185 | 761 |
| Stab | magic | 318 | 1.04 | 171 | 281 | 2880 | .08 | 97 | 98 | 548 |

### L98 vs aether_wraith (L98, hp 950, dmg 72, resist shock) — Gear-Tier Aetherium
| Build | Stil | kills/h | × | dmg | acc | aIMs | crit | eva | def | hp |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **Dolch** | melee | **444** | **1.00** | 322 | 606 | 2175 | .22 | 85 | 527 | 2131 |
| Scimitar | melee | 407 | 0.92 | 355 | 570 | 2375 | .21 | 85 | 527 | 2131 |
| Schwert | melee | 342 | 0.77 | 375 | 558 | 2675 | .13 | 85 | 527 | 2131 |
| Großaxt (2H) | melee | 341 | 0.77 | 427 | 533 | 3475 | .13 | 85 | 422 | 1780 |
| Großschwert (2H) | melee | 325 | 0.73 | 495 | 528 | 3675 | .13 | 85 | 437 | 2030 |
| Maul (2H) | melee | 295 | 0.66 | 518 | 497 | 4075 | .13 | 85 | 422 | 1780 |
| **Langbogen** | ranged | **508** | **1.14** | 268 | 651 | 1908 | .21 | 255 | 413 | 1560 |
| Kurzbogen | ranged | 477 | 1.07 | 257 | 626 | 1773 | .30 | 255 | 413 | 1560 |
| Stab | magic | 392 | 0.88 | 353 | 568 | 2880 | .23 | 132 | 178 | 981 |

*(DPS-optimale Melee-Waffe an JEDEM Checkpoint = der schnelle **Dolch**, nicht der Maul — der Maul hat trotz höchstem dmg (L98 518!) den schlechtesten Durchsatz. Persona-Vorgabe erfüllt: gemessen wurde der Dolch, nicht das langsame 2H.)*

---

## Kernbefund — bester Melee relativ zu den anderen Stilen

| Checkpoint | bester Melee (fair) | ÷ Fernkampf(best) | ÷ Magie |
|---|---|--:|--:|
| L10 | Dolch 760 | **1.11** | **1.25** |
| L45 | Dolch 305 | **1.00** | **0.96** |
| L98 | Dolch 444 | **0.87** | **1.13** |

**Antwort auf die Leitfrage:**
- **Magie-Trim erfolgreich:** Magie ÷ best Melee fiel von run4 **0.98 / 1.86 / 1.50** auf jetzt **0.80 / 1.04 / 0.88**. Magie ist **nicht mehr** die Decke; mid/late sitzt sie sauber im 0.9–1.1-Band (L98 sogar leicht **unter** Melee). Melee wurde dabei **nicht** beschädigt (war ja unangetastet).
- **Melee vs Magie:** an allen drei Checkpoints **im/am Band oder darüber** (1.25 / 0.96 / 1.13) — d.h. Melee schlägt Magie früh deutlich und liegt mid/late gleichauf.
- **Melee vs Fernkampf:** L10 **1.11×** (Melee top), L45 **1.00×** (perfekt), L98 **0.87×** (knapp unter). Über alle Checkpoints in einem ±13 %-Korridor — **deutlich enger** als das run4-Bild, aber late ist Fernkampf jetzt der **neue Ausreißer** nach oben.
- **Dominant?** Nein. Melee dominiert nirgends überzogen (max 1.25× früh über Magie); der Magie-Fix hat **nicht** zu einer Melee-Decke überkorrigiert.

---

## Δ vs run4 (Richtung — die verlässliche Metrik)

| Achse | run4 (L10 / L45 / L98) | run5 (L10 / L45 / L98) | Bewegung |
|---|---|---|---|
| **Magie** ÷ best Melee | 0.98 / **1.86** / **1.50** | 0.80 / **1.04** / **0.88** | **geheilt** ✅ — Magie raus aus der Decke |
| **Fernkampf** ÷ best Melee | 1.40 / 1.11 / 1.08 | **0.90 / 1.00 / 1.14** | früh entschärft ✅, **late jetzt Ausreißer** ⚠️ |
| best Melee = Trap? | nein (Schwert top) | **Dolch top, Schwert mid-rang** | gesund, schnelle 1H führen ✅ |
| Melee dominant? | nein | nein | gewollt ✅ |
| 0 Tode / Determinismus | ja / ja | **ja / ja** | unverändert solide ✅ |

**Lesart:** R3 hat **genau das angefasste Problem gelöst** (Magie-Dach) und **nichts an Melee kaputtgemacht**. Das Restungleichgewicht ist **verschoben**: nachdem Magie nicht mehr überschießt, ist **Fernkampf** der höchste Stil im Endgame (L98 1.14× über Melee) — getrieben von Voidhide (eva 255 / +rangedDamage) + Top-Pfeil + dem leatherworking-dex-Backbone. *Wichtig fürs Δ:* run4-melee bot Melee **ohne** smithing und ranged **ohne** leatherworking an; run5 misst beide Stile **mit** ihren Pflicht-Handwerksskills → die run5-Ratios sind die **ehrlichere** „voll ausgebauter Main"-Sicht, weichen aber methodisch von run4 ab (s. Caveat). Der **smithing→str-Backbone hebt Melee mid/late um ~14–16 %** (s. P1 unten) — ohne ihn läge Melee bei 0.83/0.80× Fernkampf.

---

## Priorisierte Findings

### [P0] — keine
Keine Crashes, keine Walls, **0 Tode** über alle Läufe, deterministisch (Seed 4242 stabil). Trefferformel/Mitigation/Auto-Eat/Köcher/Mana sauber.

### [P1 Balance] Fernkampf ist der neue Endgame-Ausreißer — Melee liegt L98 bei 0.87×
**Befund (Sim):** Mit gefixtem Magie-Dach ist **Fernkampf** late der höchste Stil: L98 Langbogen **508** vs bester Melee (Dolch) **444** = **1.14×**, Kurzbogen 477 = 1.07×. Treiber: Voidhide stapelt **eva 255 + rangedDamage** UND def 413/hp 1560 (kaum squishier als Platte def 527/hp 2131), dazu Top-Pfeil-`ammoDamage` und das schnellste Intervall (aIMs 1908 vs Dolch 2175). Das ist exakt das aus dem run4-**Fernkampf**-Report bekannte Voidhide-Problem, nur jetzt — ohne Magie-Decke — der oberste Wert. Melee selbst ist gesund; es ist Fernkampf, der über Band schießt.
**Fix-Vorschlag (combat-dev/balance, Fernkampf-Seite):** Voidhide-Evasion-Budget kürzen (eva 255→~130) und/oder Voidhide als echtes Glass-Gear (def/hp spürbar unter Platte). Erst dann landet auch der L98-Fernkampf ≤1.1× und Melee sitzt sauber in der Mitte. (Identisch zum run4-Fernkampf-P1 — noch offen.)

### [P1 Balance] Melee-Parität hängt am `smithing→str`-Backbone — ohne ihn sackt Melee unter Band
**Befund (Sim):** Platte ist **defence**-gated, nicht smithing-gated — ein Spieler kann Platte tragen, **ohne** smithing zu trainieren, und verliert damit die str aus dem Backbone. Effekt auf den besten Melee:
- L45: **mit** smithing **305** (im Band) → **ohne** smithing **264** (×0.87 ranged / 0.83 magie = **unter Band**).
- L98: **mit** smithing **444** (0.87× ranged) → **ohne** smithing **407** (0.80× ranged = **deutlich unter**).
Die mid/late-Parität von Melee steht und fällt also mit ~14–16 % Damage, die **nur** aus der smithing-Investition kommen. Ranged dagegen MUSS leatherworking trainieren (Leder ist leatherworking-gated) → bekommt seinen dex-Backbone „gratis" mit dem Gear-Zugang. Diese Asymmetrie macht Melee-Parität **bedingt**.
**Fix-Vorschlag:** Entweder einen Teil des str-Backbones **direkt in die Platte** legen (z.B. `modifiers.str` auf platebody/legs), sodass Melee auch ohne smithing-Grind im Band sitzt — ODER `smithing→str` als bewusst **dokumentierten** Pflicht-Pfad für Melee kommunizieren (analog leatherworking für Fernkampf). Aktuell ist es ein verstecktes „du musst smithen, sonst bist du schwächer".

### [P2 Balance] Evasion-Identität weiter invertiert — und endgame stärker als gemessen in run4-melee
**Befund:** L98 Fernkampf **eva 255** vs Melee **eva 85** — der Leder-Schütze weicht **3×** besser aus als der Platten-Nahkämpfer. (Höher als run4-melee mit 143, weil run5 für Fernkampf realistisch leatherworking-dex + Voidhide mitführt.) Mit Auto-Eat (0 Tode) ist die hohe Evasion ein reiner Gratis-Vorteil ohne Kehrseite — die „Glass-Cannon"-Identität für Fernkampf existiert weiter **nicht**, und Melees Tank-Achse (def/hp) bringt keinen Durchsatz.
**Fix-Vorschlag:** Leder/Voidhide-Evasion-Budget kürzen (deckt P1 mit ab); Melee behält def/hp als echte Tank-Identität.

### [P2 Balance] Tankigkeit bleibt wertlos — 0 Tode bei JEDEM Stil
**Befund (unverändert seit run3/run4):** Über alle Läufe **0 Tode**, auch für die squishigsten Magie-Builds (hp 213 @L10, 981 @L98). Auto-Eat T3 + Mitigation lösen Überleben für alle → Melees def 527/hp 2131 @L98 **kauft nichts**. Der einzige strukturelle Melee-Vorteil verpufft; nur Durchsatz zählt → Melee-Offense muss exakt auf ranged-Niveau liegen, kann aber keinen „Tank-Aufpreis" rechtfertigen.
**Fix-Vorschlag:** Entweder bewusst akzeptieren (idle-fair) ODER 1–2 Endgame-Mobs mit Burst jenseits eines Auto-Eat-Ticks ausstatten, damit Platte-HP für Melee einen realen Durchsatz-Wert bekommt.

### [P3 Balance] 2H (Maul/Großschwert/Großaxt) bleibt die schwächste Melee-Wahl
**Befund:** Trotz höchstem dmg (Maul L98 **518**, Großschwert 495) liefern die langsamen 2H den niedrigsten Durchsatz (Maul L10 0.52× / L45 0.85× / L98 0.66×; Großschwert ähnlich) — das lahme Intervall (4075–4515 ms) + niedrige Krit + Verlust des Schild-def/hp überwiegen die Trefferwucht. Der Dolch (schnell, crit, aIMs −500) gewinnt überall. Der Spread ist insgesamt gesund (1H eng beieinander), nur die langsamen 2H hängen klar zurück.
**Fix-Vorschlag (optional):** Langsamen 2H eine eigene Nische geben — Rüstungsdurchschlag oder spürbarer crit-Damage-Skalierer (godiron_battleaxe/greataxe haben bereits critDamage-Boni; auf maul/greatsword ausweiten) — oder bewusst als „High-Burst gegen def-tanky Mobs" kommunizieren.

### [P3 Balance] Lifesteal-Cap-„Fix" bleibt im Endgame marginal
**Befund:** Der Cap ist jetzt `min(maxHp·5 %, 12)` pro Treffer (`MELEE_LIFESTEAL_CAP_PCT 0.05`, `_ABS 12`). Weil es ein **min()** ist, bindet im Endgame weiterhin die **absolute 12** (5 % von 2131 hp = 106 ≫ 12) → Lifesteal heilt ≤ **12/Treffer ≈ 0.6 % hp**: keine spürbare Melee-Identität. Die pct-Schranke greift nur **unter** ~240 maxHp und macht Lifesteal früh sogar restriktiver, nicht stärker. (Nebenbefund wie run4: der Schwert-Bleed wird vom Mid-Farm-Mob skeleton_nekro **resistiert** → im wichtigsten Mid-Fenster wirkungslos.)
**Fix-Vorschlag (optional):** Absolut-Cap mild mit dem Gear-Tier skalieren (z.B. `_ABS` 12→30/50 auf High-Tier) ODER 2–3 Mid-Tier-Mobs ohne bleed-Resist, damit player-seitiger Bleed/Lifesteal ein echtes Profil bekommt.

### [P3 Info] Suffix-System trägt einen gesunden Melee-Pool (nicht gemessen, kein Defizit)
**Befund:** Es gibt 5 melee-affine Suffixe (`of the Bull` meleeDamage 0.7/ilvl + str, `of Carnage` meleeDamage 0.8 + critChance, `of the Berserker` + critDamage, `of the Wolf` + Tempo, `of the Bear` str/con) auf `weapon_melee`/`armor`/`shield`. Wie run4 wurde mit **Basis-Gear ohne Suffixe** gemessen (saubere Parität), da **alle** Stile affine Suffixe haben → die Suffix-Decke verschiebt das Band nicht melee-spezifisch. Melee hat hier kein Defizit; der Pool ist gut.

---

## Mechanik-Checks (bestanden)
- **Trefferformel/Crit/Mitigation:** acc/(acc+eva), def-Deckel — symmetrisch, kein NaN/Drift. Melee-Accuracy hoch (L98 558–606) → zuverlässige Treffer.
- **Köcher/Out-of-Ammo:** Bogen feuert nur passenden `ammoType` scharf; falsche Munition → sauberer Stopp (im ersten Harness-Lauf reproduziert, danach korrekt mit `ammoType` befüllt → 0 Tode, voller Durchsatz).
- **Magie-Mana:** ohne Cheat gemessen; Roben-`manaRegen` trägt den Dauerkampf, kein Degradieren zu Weak-Melee an den Checkpoints — der niedrigere Magie-Durchsatz ggü. run4 stammt also echt aus dem **Gear-Trim**, nicht aus Mana-Hunger.
- **Determinismus:** Seed 4242 stabil; saubere Set-/Slot-Wahl im Auto-Gear.

## Fazit
**R3 ist auf seiner Zielachse erfolgreich:** Der Magie-Gear-Trim hat das run4-Hauptproblem (Magie 1.5–1.86× über Melee) entschärft (jetzt 0.88–1.04×), **ohne** Melee anzufassen oder zu beschädigen. Der beste Nahkämpfer (schneller **Dolch**) ist früh top, mid perfekt im Band und late nur knapp unter Fernkampf. **Was Melee unter 9,5 hält:** (P1) **Fernkampf** ist der neue Endgame-Ausreißer (L98 1.14×) — Voidhide trimmen; (P1) Melee-Parität ist **bedingt** an den `smithing→str`-Backbone — str-Anteil in die Platte legen oder den Pfad dokumentieren; (P2) Evasion-Inversion + (P2) wertlose Tankigkeit (0 Tode) nehmen Melee seine einzige nicht-Durchsatz-Identität. Sind P1×2 adressiert, sitzen alle drei Stile über alle Checkpoints im 0.9–1.1-Band.

---

## „Was fehlt für 9,5?"
1. **Fernkampf-Decke schließen (P1):** Voidhide-Evasion ~halbieren / def-hp unter Platte → L98-Fernkampf von 1.14× auf ≤1.1×. Dann ist KEIN Stil mehr Ausreißer.
2. **Melee-Parität bedingungslos machen (P1):** ~14–16 % str-Backbone, der heute nur aus smithing kommt, **in die Platte** gießen (modifiers.str) — damit Melee auch ohne smithing-Grind im Band sitzt.
3. **Evasion-Identität drehen (P2):** Leder-Evasion runter, damit der Platten-Tank wendiger ist als der Schütze (oder Fernkampf bewusst squishy) — gibt Melee seine Tank-Achse zurück.
4. **Tankigkeit Wert geben (P2):** 1–2 Endgame-Burst-Mobs jenseits eines Auto-Eat-Ticks → Platte-HP wird zum echten Durchsatz-Faktor (sonst zählt nur Offense, und „Tank-Aufpreis" ist nie gerechtfertigt).
5. **2H-Nische (P3):** Maul/Großschwert/Großaxt Rüstungsdurchschlag oder crit-Damage-Skalierer geben, damit die Trefferwucht den Tempo-Nachteil ausgleicht.
6. **Lifesteal endgame-relevant (P3):** Absolut-Cap mit dem Tier skalieren; Mid-Mobs ohne bleed-Resist anbieten.
