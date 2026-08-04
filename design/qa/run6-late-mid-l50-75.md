# QA-Run 6 — Late-Mid Playtest (Level 50–75, „nach R4-Parität: manaCost-Cap + str-in-Platte + Ranged-Trim")

**Tester:** Playtester-Analyst (READ-ONLY; kein Game-Code/Content geändert) · **Datum:** 2026-06-28
**Persona:** Spät-Mid-Spieler L50–75 auf dem Weg ins Endgame.
**Kernfrage (Brief):** Ist die Magie bei **L75 jetzt im Band** (war run5: 0,78× = ~22 % hinten)? Liegen **alle 3 Stile @L55/65/75 bei 0,9–1,1×**? Gear-Kadenz/ironhide.
**Methode — echte Zahlen:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`startCombat`→`advance` 1h, echte Tick/Combat-Loop, Seed 5), nach dem Lauf **entfernt** (`packages/**` unverändert). Pro Stil & Checkpoint (L55/65/75): **stil-realistische Skill-Investition** (Offense-Kampf-Skills + zum *Tragen* nötiger Craft-Skill; gemeinsamer con-Backbone via defence+vitality), **offense-dominante Best-Gear-Auswahl je Slot** (da Auto-Eat `cooked_voidray` → deaths=0 erzwingt, zählt für kills/h nur Output) + voller **Waffen-Sweep** des Stils (beste gewinnt). Munition passend zum `ammoType`, Slayer-Gate via Req-Item gelöst. Zusätzlich: Magie-Wand+Focus-Pfad, Melee-Self-Crafter-vs.-Nicht-Crafter-Gegenprobe. Alle Zahlen sind reale Sim-Ausgaben, **deaths=0 in allen Läufen**.

> **Wichtiger Methoden-Hinweis (selbst korrigiertes Artefakt):** Mein erster Auswahl-Score gewichtete Defense mit → er steckte den Schützen bei L65/L75 fälschlich in **Platte** (kein `rangedDamage`) und deflationierte Ranged künstlich auf 0,84–0,86× (→ scheinbar „Ranged ist der neue Boden"). Da bei 0 Toden Defense für kills/h **irrelevant** ist, habe ich auf reine Offense-Auswahl umgestellt. **Alle Zahlen unten sind die korrigierte, offense-optimale Messung** — das deckt sich mit dem §6-Artefakt-Hinweis der R4-Spec.

---

## Fun-Score: **8,5 / 10** (run5: 7,5 · run4: 6 · run3-mid: 8)

Run 6 **schließt die run5-Kernbaustelle vollständig**: die Magie-Über-Korrektur ist behoben — **L75-Magie 0,78× → 1,01×**, und **alle drei Stile liegen an allen drei Checkpoints im Zielband 0,90–1,10×** (für den Stil-Self-Crafter). Der Treiber ist exakt der R4-Hebel 1: die **manaCost-Falle ist entschärft** (Stab-Cap 24→10, Wand-Cap 12→8) — Magie war nie roh-schwach, sondern mana-gestarvt; mit dem Cap sustained der `voidcaller_staff` jetzt 583 kills/h statt früher abzusacken. Combat bleibt todes- und bugfrei über alle 9 Haupt-Läufe + Sweeps. Was unter 9,5 hält: die Parität ist **gelöst, aber nicht zentriert** — Magie sitzt am **unteren** Rand (runecrafting trainiert weiter **kein** Attribut), die Leder-Body-Leiter ist nach dem Ranged-Trim **offensiv tot** (ironhide/warhide werden von einem fixen Mid-Item überholt), Magie hängt bei L75 an **einer** 2H-Waffe, und ein paar Mid-Glättungen (Wand-Tier flach, Nicht-Crafter-Melee L65, sorrow_wraith-XP) stehen offen.

---

## Headline-Tabelle (Sim, offense-optimal, on-level Mob, deaths=0 überall · Ranged = Referenz)

| Checkpoint | melee kills/h | ranged kills/h | magic kills/h | rel (melee / ranged / magic) | im Band? |
|---|---:|---:|---:|---|---|
| **L55** vs iron_revenant (L58) | 626 [adamantium_sword] | 620 [adamantium_longbow] | 595 [stormcaller_rod] | 1,01× / 1,00× / **0,96×** | ✓ alle |
| **L65** vs void_stalker (L66) | 717 [runite_dagger] | 692 [runite_shortbow] | 638 [mithril_wand] | 1,04× / 1,00× / **0,92×** | ✓ alle |
| **L75** vs sorrow_wraith (L72) | 635 [bloodiron_sword] | 579 [bloodiron_shortbow] | 583 [voidcaller_staff] | 1,10× / 1,00× / **1,01×** | ✓ alle |

**Spread L55–L75: Melee 1,01–1,10 · Magie 0,92–1,01 · Ranged 1,00 (Referenz).** Kein Stil außerhalb 0,90–1,10. **Die Magie-L75-Wall aus run5 (0,78×) ist geschlossen.** Melee L75 liegt am oberen Rand (1,10) — gerade noch im Band.

---

## Top-Stärken

1. **Magie-L75-Boden GESCHLOSSEN (das Kern-Ziel von Run 6).** 0,78× → **1,01×**. Bestätigt als manaCost-Fix, nicht als Roh-Buff: `godiron_staff`/`aetherium_staff` jetzt `manaCost 10` (war 24), Magie nicht mehr throughput-negativ. `voidcaller_staff` sustained bei L75 volle 583 kills/h (deaths=0, keine Schwach-Schläge mehr).
2. **Vollständige 3-Stil-Parität @L55/65/75** für den Self-Crafter (alle 0,92–1,10). Die run5-„gedrehte Achse" (Magie Boden) ist **aufgelöst**, ohne dass ein Stil eine neue Decke bildet.
3. **str-in-Platte ist live & wirkt:** `godiron_platebody modifiers.str = 18` (= sein meleeDamage), analog Helm/Legs. Melee hält ohne Smithing-Grind bei L55/L75 im Band (0,91× / 1,02×).
4. **Ranged korrekt eingenordet:** nach dem R4-Trim (voidhide ×0,5, Bögen ×0,85, Munition ×0,78, `voidhide_boots`-Typo 1→6) ist Ranged **mittig** — nicht mehr Endgame-Decke, aber auch nicht Boden. Als Referenz sauber.
5. **Combat-Robustheit hält bis an die Endgame-Schwelle.** Alle Läufe (3 Stile × 3 Checkpoints + voller Waffen-Sweep, inkl. void_stalker shock-inflict, sorrow_wraith burn-inflict): **deaths = 0**. Auto-Eat + Mitigation greifen sauber.

---

## Priorisierte Findings

### [P2 Balance] `runecrafting` trainiert weiter KEIN Attribut → Magie sitzt am unteren Bandrand
**Befund:** Magie liegt an allen Checkpoints am **unteren** Rand (0,96 / 0,92 / 1,01), während Melee/Ranged mittig-oben sitzen. Ursache wie run5-P2 dokumentiert und in R4 **bewusst deferred**: Magies Pflicht-Craft `runecrafting` (Robe-/Stab-`requirements`) hat **kein `trains`** → der int-Backbone der Magie kommt nur aus `magic_off` (×1 Skill), während Melee str aus **power + smithing** (×2) und Ranged dex aus **ranged + leatherworking** (×2) ziehen. Magies Offense-Attribut ist strukturell **halb so dick**. Es ist im Band, aber asymmetrisch. **Fix (gepaart, kein reiner Add — R4 §Hebel 3):** `runecrafting trains:"int"` NUR zusammen mit einem uniformen Magie-Waffen-`magicDamage`-Re-Trim (~×0,90), sonst überschießt L75 auf ~1,14× (R4 gemessen). Eigener Pass.

### [P2 Content] Leder-Body-Leiter ist nach dem Ranged-Trim OFFENSIV TOT — ironhide/warhide werden überholt
**Befund (Gear-Dump + Item-Werte):** Der offense-optimale Schütze trägt an Body L55–L98 durchgehend **`warden_brigandine`** (`rangedDamage 6`), weil die gesamte craftbare Leder-Leiter nach dem R4-Trim nur winzigen rangedDamage hat:
| Body | rangedDamage | req |
|---|---:|---:|
| studded_leather_body | 3 | 50 |
| **ironhide_body** (run5-„Fix") | **4** | 62 |
| warhide_body | 4 | 70 |
| **warden_brigandine** (fix) | **6** | ≤55 |
| voidhide_body | 9 | 99 |
Das in **run5 als Fix gefeierte ironhide-L60-Tier** ist damit für einen DPS-Schützen **offensiv bedeutungslos** (rangedDamage 4 < warden 6) — es bleibt nur ein Defense/Evasion-Upgrade, und Defense ist bei deaths=0 moot. Die Leder-„Tiers" am Body-Slot fühlen sich für den Schützen **flach** an (kein Offense-Fortschritt L50→L98 außer voidhide ganz am Ende). **Fix-Vorschlag:** rangedDamage der In-Band-Leder-Bodies (ironhide 4→~6, warhide 4→~7) leicht anheben, sodass die Leiter `warden_brigandine` einholt — oder `warden_brigandine` als bewussten Side-grade umlabeln. (Hinweis: der R4-Trim hat hier evtl. zu hart auf die Tier-Leiter durchgeschlagen, während das fixe Mid-Item ungetrimmt blieb.)

### [P3 Balance] Magie-L75 hängt an EINER 2H-Waffe — Wand-/Stab-Alternativen trailen (run5-P2 unverändert)
**Befund (Magie-Waffen-Sweep L75):** `voidcaller_staff` **583** dominiert; `bloodiron_staff` 501, `runite_staff` 496, `runite_wand` 479, **`bloodiron_wand` 477**. Der Wand+Focus-Pfad (477) liegt **~18 % unter** dem 2H-Special-Caster. Magie wird im oberen Band auf **eine** Waffe gezwungen — Build-Flexibilität fehlt genau dort. (R4 hat `bloodiron_wand` als „vorhanden" gewertet und kein neues 1H-Tier ergänzt; das Parität-Ziel ist erfüllt, die **Diversität** nicht.) **Fix-Vorschlag:** Top-Tier-1H-Wand-Output anheben oder einen Spezial-1H-Caster zwischen `voidcaller_staff` (req65) und god-Tier ergänzen.

### [P3 Balance] Wand-Tier-Progression bei L65 nahezu flach
**Befund (Magie-Sweep L65):** `copper_wand` 630 ≈ `blacksteel_wand` 634 ≈ `adamantium_wand` 637 ≈ `runite_wand` 638. Zwischen niedrigstem und höchstem craftbaren Wand-Tier liegen **~8 kills/h (1 %)** — ein Wand-Tier-Up fühlt sich mid praktisch wertlos an (der Output kommt aus int-Backbone + Cast-Kadenz, nicht aus dem Waffen-magicDamage). Harmlos für Parität, aber schwaches Progressionsgefühl. **Fix-Vorschlag:** Wand-`magicDamage`-Spreizung über die Tiers leicht erhöhen.

### [P3 Balance] Nicht-Crafter-Melee dippt bei L65 unter Band (str-in-Platte trägt fast, aber nicht ganz)
**Befund (Melee mit vs. ohne smithing):** L55 564 (0,91×) · **L65 594 (0,86×)** · L75 589 (1,02×). Ohne Smithing-Grind fällt Melee bei L65 auf **0,86×** (= ~14 % hinter Ranged). str-in-Platte fängt L55/L75 ab, aber das L65-Fenster (runite-Shortbow-Ranged ist dort hoch) bleibt für den reinen Nicht-Crafter knapp unter Band. **Fix-Vorschlag:** entweder kleinen str-Schub auf die L60–66-Platte (runite Helm/Body/Legs +1–2 str) oder als bewusst werten (Self-Crafter ist die Norm).

### [P3 Content] `sorrow_wraith` (L72) XP-Dichte-Ausreißer — run4/run5-P3 weiter UNVERÄNDERT
**Befund (Monster-Dump):** weiterhin **xp 680 / hp 500 → xp/hp 1,36**, ohne regen/enrage (nur inflict burn), wird genauso schnell gelegt wie Nachbarn. Über den gleichstufigen Mobs. Harmlos (kein Wall), aber der Vorschlag (xp ~680→~520 **oder** leichtes regen/enrage) ist über 3 Runs **nicht** umgesetzt.

---

## Δ vs Run 5 (Beleg)

| run5-Befund | Status in Run 6 | Beleg (Sim/Dump) |
|---|---|---|
| **P1 Magie ist der Boden, L75 0,78×** (Über-Korrektur) | **BEHOBEN** | L75-Magie **0,78× → 1,01×**; alle 3 Stile @L55/65/75 im Band (0,92–1,10). |
| P1-Ursache: Magie mana-gestarvt | **BEHOBEN** | manaCost-Cap live: `godiron_staff`/`aetherium_staff` `manaCost 24→10`; `voidcaller_staff` sustained 583, 0 Schwach-Schläge. |
| P2 `runecrafting` ohne `trains` | **UNVERÄNDERT (deferred)** | Magie weiter am unteren Bandrand (0,92); int-Backbone halb so dick wie melee-str/ranged-dex. |
| P2 keine konkurrenzfähige Top-1H-Magie-Waffe | **UNVERÄNDERT** | L75: wand+focus 477 vs voidcaller_staff 583 (~18 % drunter). |
| (run4-P1) Nahkampf-Boden | **BLEIBT GESCHLOSSEN** | Melee 1,01–1,10 (Self-Crafter); str-in-Platte live (godiron_platebody str+18). |
| (run4-P1) Ranged-Wall | **GESCHLOSSEN, aber Leder offensiv tot** | Ranged mittig (Referenz); ironhide-Body offensiv von warden_brigandine überholt (neues P2). |
| Ranged war (r4-baseline) Endgame-Decke | **GETRIMMT/eingenordet** | voidhide ×0,5, Bögen ×0,85, Munition ×0,78, `voidhide_boots` 1→6 (Typo-Fix) live. |
| P3 `sorrow_wraith` xp-Ausreißer | **NICHT GEFIXT** | xp 680 / xp-hp 1,36 unverändert. |

---

## Was fehlt für 9,5?

1. **Magie ins Band-Zentrum statt an den Rand** (P2): `runecrafting trains:"int"` **gepaart** mit einem uniformen Magie-Waffen-`magicDamage`-Re-Trim (~×0,90) — schließt die Fairness-Lücke (einziger Stil, dessen Pflicht-Craft nichts zurückzahlt), **ohne** L75 auf 1,14× zu überschießen. Eigener, sorgfältiger Pass.
2. **Leder-Body-Leiter offensiv wiederbeleben** (P2): rangedDamage der In-Band-Leder-Bodies anheben (ironhide 4→~6, warhide 4→~7), sodass das gefeierte ironhide-L60-Tier auch **offensiv** ein Upgrade ist und nicht von `warden_brigandine` (6) überholt wird. (Der R4-Trim hat die Tier-Leiter, aber nicht das fixe Mid-Item erfasst.)
3. **Magie-1H-Build-Flexibilität bei L75** (P3): Top-Wand-Output anheben oder Spezial-1H-Caster ergänzen, damit wand+focus konkurriert und Magie nicht an `voidcaller_staff` hängt.
4. **Wand-Tier-Spreizung** (P3): Wand-`magicDamage` über Tiers stärker staffeln (mid fühlt sich ein Wand-Up wertlos an: copper≈runite @L65).
5. **Nicht-Crafter-Melee L65** (P3): kleiner str-Schub auf L60–66-Platte oder bewusst als Self-Crafter-Norm werten (0,86× ohne smithing).
6. **`sorrow_wraith` xp trimmen** (P3): 680→~520 oder regen/enrage — den 3-Run-Carry-over endlich schließen.

---

## Fazit
Run 6 ist ein **sauberer Fortschritt** (7,5 → 8,5): das run5-Kernproblem (Magie-L75-Boden 0,78×) ist **echt geschlossen** — der manaCost-Cap bestätigt die R4-These „Magie war mana-gestarvt, nicht roh-schwach", und **alle drei Stile sitzen jetzt @L55/65/75 im Zielband 0,90–1,10×**. Combat bleibt todes- und bugfrei. Die verbleibenden Bremsen sind **Feinschliff, keine Walls**: Magie sitzt am unteren Bandrand (runecrafting weiter ohne Attribut — bewusst deferred), die Leder-Body-Leiter ist nach dem Ranged-Trim offensiv flach (ironhide/warhide < warden_brigandine), Magie hängt bei L75 an einer 2H-Waffe, und drei Mid-Glättungen stehen offen. Ein behutsamer, **gepaarter** Magie-Zentrier-Pass (Punkt 1+2) plus die Diversitäts-/Glättungs-Punkte bringen das auf 9–9,5.
