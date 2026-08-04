# QA-Run 7 — Late-Mid Playtest (Level 50–75, „nach R5: str-Doppel weg, godspark zurück, ironhide/warhide rangedDamage-Kurve gefixt")

**Tester:** Playtester-Analyst (READ-ONLY; kein Game-Code/Content geändert) · **Datum:** 2026-06-28
**Persona:** Spät-Mid-Spieler L50–75 auf dem Weg ins Endgame.
**Kernfrage (Brief):** Liegen nach R5 **alle 3 Stile @L55/65/75 im Band (0,90–1,10×)** — und ist **ironhide jetzt offensiv sinnvoll** (in run6 als „offensiv tot" gemeldet)?
**Methode — echte Zahlen:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→Skills/Gear setzen→`startCombat`→`advance` 1h, echte Tick/Combat-Loop, Seed 5), nach dem Lauf **entfernt** (`packages/**` von mir unverändert). Pro Stil & Checkpoint (L55/65/75): **stil-realistische Skill-Investition** (Offense-Kampf-Skills + zum *Tragen* nötiger Craft-Skill auf Checkpoint-Level; gemeinsamer con-Backbone via `defence`+`vitality`), **offense-optimale Best-Gear-Auswahl je Slot** (deaths=0 erzwingt Auto-Eat `cooked_voidray` → für kills/h zählt nur Output), **voller Waffen-Sweep** des Stils (beste gewinnt). Ranged = Referenz (1,00). Magie-Offhand = Focus, Melee/Ranged-Offhand leer (Turmschild bremst via `attackIntervalMs +100` → wäre Mess-Artefakt). **deaths=0 in allen Läufen.**

> **Methoden-Hinweis (Ehrlichkeit beim Run-Vergleich):** Die **absoluten** kills/h meines Harness liegen anders als in run6 (anderes Gear-Auswahl-/Ammo-Detail), daher sind die `Δ vs run6`-REL-Werte **richtungsweisend**, nicht aufs Promille vergleichbar. Was **belastbar** ist: (a) die **interne** run7-Reihung (gleiches Harness für alle 3 Stile), (b) die im **Code verifizierten** Struktur-Änderungen (welche Skills welches Attribut trainieren), (c) ein **Sensitivitäts-Gegentest**, der die Ursache isoliert beweist.

---

## Fun-Score: **7,5 / 10** (run6: 8,5 · run5: 7,5 · run4: 6)

**Δ vs run6: −1,0.** Run 7 schließt **einen** echten run6-Befund sauber (die Leder-Body-Leiter ist **offensiv wiederbelebt** — ironhide/warhide werden jetzt getragen), **regressiert aber die Headline-Kernfrage**: Das Entfernen des **str-Doppels** (smithing trainiert kein str mehr) war **asymmetrisch** — es hat Melee an den **unteren Bandrand** gezogen (0,89× @L55/L75) und Magie bei L75 **unter** Band (0,79×), während **Ranged** als einziger Stil seinen Craft-Offense-Doppel (`leatherworking → dex`) behält und damit zur **unkorrigierten Decke** wird. In run6 lag **kein** Stil außerhalb 0,90–1,10; in run7 dippen **zwei** Stile an je zwei bzw. einem Checkpoint unters Band. Combat bleibt todes- und bugfrei. Was unter 9,5 hält, ist diesmal also keine Politur, sondern eine **Paritäts-Regression mit klarer, kleiner Wurzel** (s. P1) plus eine **neue twoHanded-Inkonsistenz**.

---

## Headline-Tabelle (Sim, offense-optimal, on-level Mob, deaths=0 überall · Ranged = Referenz)

| Checkpoint | melee kills/h | ranged kills/h | magic kills/h | rel (melee / ranged / magic) | im Band? |
|---|---:|---:|---:|---|---|
| **L55** vs iron_revenant (L58, hp320) | 583 [adamantium_battleaxe] | 654 [adamantium_shortbow] | 597 [stormcaller_rod] | **0,89×** / 1,00× / **0,91×** | melee unter, magic am Rand |
| **L65** vs void_stalker (L66, hp350) | 664 [runite_scimitar] | 690 [runite_shortbow] | 638 [mithril_wand] | 0,96× / 1,00× / 0,92× | ✓ alle knapp im Band |
| **L75** vs sorrow_wraith (L72, hp500) | 589 [bloodiron_dagger] | 665 [bloodiron_longbow] | 526 [voidcaller_staff] | **0,89×** / 1,00× / **0,79×** | melee unter, magic **deutlich** unter |

**Spread L55–L75: Melee 0,89–0,96 · Magie 0,79–0,92 · Ranged 1,00 (Referenz).** Melee sitzt durchgehend **an/unter** dem unteren Rand, Magie kippt bei L75 **unter** Band. **Ranged ist die de-facto Decke an allen drei Checkpoints.**

---

## Sensitivitäts-Gegentest (isoliert die Ursache — das ist der Beleg für P1)

Gleiches Harness, aber Doppel-Backbone wiederhergestellt:

| Checkpoint | Melee normal | Melee **+ str-Doppel** | Magie normal | Magie **+ int-Doppel** |
|---|---:|---:|---:|---:|
| L65 | 664 (0,96×) | **709 (1,03×)** [runite_dagger] | 638 (0,92×) | **674 (0,98×)** [runite_wand] |
| L75 | 589 (0,89×) | **635 (0,95×)** [bloodiron_sword] | 526 (0,79×) | **659 (0,99×)** [bloodiron_wand] |

- **str-Doppel-Proxy** (melee zusätzlich `woodcutting`=L, das `str` trainiert): hebt Melee zurück **ins Band** (+7–8 %). → Der Sub-Band-Dip ist **exakt** die str-Doppel-Entfernung.
- **int-Doppel-Proxy** (Magie mit `int`-Backbone ≈ wie ein `runecrafting → int` ihn gäbe): **zentriert** Magie (L75 **+25 %** 526→659) **und** kippt die beste Waffe vom 2H-Stab zum **Wand+Focus** — löst damit zugleich die run6-Diversitäts-P3.

---

## Top-Stärken

1. **Leder-Body-Leiter offensiv WIEDERBELEBT (run6-P2 geschlossen).** ironhide_body `rangedDamage 4→7`, warhide_body `4→8` — die Leiter ist jetzt **offensiv monoton**: studded(3) < warden_brigandine(6) < **ironhide(7)** < **warhide(8)** < voidhide(9). Im Sim **trägt** der offense-optimale Schütze jetzt **ironhide_body @L65** und **warhide_body @L75** (statt durchgehend warden_brigandine). Das in run5 gefeierte ironhide-Tier ist endlich auch offensiv ein Upgrade.
2. **Combat-Robustheit bis an die Endgame-Schwelle.** 3 Stile × 3 Checkpoints + voller Waffen-Sweep + Sensitivitäts-Läufe: **deaths = 0** überall (inkl. void_stalker shock-inflict, sorrow_wraith burn-inflict). Auto-Eat + Mitigation greifen sauber.
3. **str-Doppel-Entfernung ist *als Mechanik* sauber & wirkt wie gewollt** — `smithing` trainiert nachweislich **kein** Attribut mehr (Code: `skills.smithing` ohne `trains`), Melee-str kommt nur noch aus `power`. Das war ein berechtigter Eingriff (Melee saß in run6 mit 1,10× an der **oberen** Decke). Nur die **Gegenseite** (Ranged-Doppel) blieb stehen — daher die Schieflage (P1).
4. **godspark zurück** (godspark_staff/-Set vorhanden, manaCost 9, req 88) — liegt aber **im Endgame** (L88), **außerhalb** des L50-75-Bands; für diese Persona ohne Effekt (nur als „existiert wieder" vermerkt).

---

## Priorisierte Findings

### [P1 Balance] Paritäts-REGRESSION: str-Doppel asymmetrisch entfernt → Melee & Magie unter Band, Ranged unkorrigierte Decke
**Befund (Sim + Code):** Nach R5 trainiert **nur noch `leatherworking → dex`** ein **Offense-Attribut** unter den drei Craft-Skills — `smithing` (Melee-Craft) und `runecrafting` (Magie-Craft) trainieren **nichts**. Damit:
- Ranged-dex-Backbone = `ranged` + `leatherworking` (**×2**) → @L75 dex≈37
- Melee-str-Backbone = nur `power` (**×1**) → @L75 str≈18
- Magie-int-Backbone = nur `magic_off` (**×1**) → @L75 int≈18

Resultat: **Ranged 1,00× ist die Decke**, Melee 0,89–0,96× und Magie 0,79–0,92× sitzen darunter; **zwei** Stile dippen unter 0,90× (run6: keiner). Der Sensitivitäts-Test (oben) beweist die Ursache: Doppel zurück → beide wieder im Band/zentriert. **Fix (gepaart, sauber):** Entweder **(a) Symmetrie nach unten** — `leatherworking trains` entfernen, dann sind alle drei Crafts attribut-neutral (×1), Ranged sinkt auf Melee/Magie-Niveau (sauberste Linie, deckt sich mit der „str-Doppel weg"-Philosophie); **oder (b) Symmetrie nach oben** — `smithing trains:"str"` **und** `runecrafting trains:"int"` wieder/neu, gepaart mit einem leichten Waffen-Damage-Re-Trim (~×0,93), damit niemand über 1,10× schießt. **(a) ist der kleinere, kohärentere Eingriff.**

### [P1 Balance] Magie-L75 fällt UNTER Band (0,79×) — Waffen-Plateau-Klippe + int-×1-Backbone
**Befund (Magie-Sweep L75):** beste Magie-Waffe `voidcaller_staff` **526**, dahinter `bloodiron_staff` 501, `runite_staff` 496, `bloodiron_wand` 481. **Alle** L75-Magie-Optionen liegen **unter** dem L65-Bestwert (`mithril_wand` 638) — Magie wird von L65→L75 in absoluten kills/h **schlechter**, obwohl der Mob tankier ist (sorrow_wraith hp500 vs void_stalker hp350). Zwei Treiber überlagern sich: (1) der int-×1-Backbone (P1), (2) das bekannte L75-Waffen-Plateau — der einzige starke 2H-Stab ist langsam (kein attackIntervalMs-Bonus, manaCost 8), die schnellen Wands sind zu schwach. Der int-Doppel-Proxy hebt L75 von 526 **auf 659 (0,99×)** **und** macht den **Wand** zur Bestwaffe — d. h. der P1-Fix (b/a) räumt diese Klippe gleich mit ab. **Fix:** primär P1; sekundär Top-1H-Wand-Output @L70–75 leicht anheben.

### [P2 Content] twoHanded-Inkonsistenz: `voidcaller_staff` & `godspark_staff` (weaponType „staff") fehlt `twoHanded`
**Befund (Item-Dump):** **alle** anderen Stäbe sind `twoHanded:true` (`runite_staff`, `adamantium_staff`, `bloodiron_staff`, `titanium_staff`, `godiron_staff`, `aetherium_staff`), aber **`voidcaller_staff`** und **`godspark_staff`** (beide `weaponType:"staff"`) **nicht** — der Design-Kommentar bei den Stäben sagt ausdrücklich „STAFF: … twoHanded …". Folge: Diese beiden Top-Caster-Stäbe lassen sich **mit einem Focus dual-wielden** (unbeabsichtigter Gratis-Offhand: magicDamage + maxMana). Im Sim trägt `voidcaller_staff` dadurch real einen `bloodiron_focus` mit → leicht überhöht. (Hinweis: `stormcaller_rod` ist `weaponType:"scepter"` — ein 1H-Zepter+Focus ist plausibel **gewollt**; betrifft die Findung nicht.) **Fix:** `voidcaller_staff` und `godspark_staff` `twoHanded:true` setzen (Konsistenz + Exploit zu).

### [P2 Balance] `runecrafting` trainiert weiter KEIN Attribut — jetzt akut (run6-P2, verschärft)
**Befund:** In run6 war das ein **deferred** Feinschliff (Magie nur unterer Bandrand). Nach der str-Doppel-Entfernung ist es **die** Hälfte der Schieflage: Magie ist der einzige Stil, dessen Pflicht-Craft (`runecrafting`, Roben/Stab-Reqs) **nichts** zurückzahlt — und im Gegensatz zu run6 (wo auch smithing zahlte) steht dem jetzt der ungetrimmte Ranged-Doppel gegenüber. **Fix:** identisch zu P1-Variante (b) — `runecrafting trains:"int"` gepaart mit Re-Trim; oder via P1-Variante (a) gar nicht nötig (dann ist „Craft trainiert nichts" konsistent für **alle** drei).

### [P3 Balance] Melee-Bestwaffe ist der schnelle Dolch, das „ikonische" Schwert trailt
**Befund (Melee-Sweep):** @L75 `bloodiron_dagger` 589 > `runite_dagger` 587 > `bloodiron_greataxe` 548 > `bloodiron_scimitar` 534 > `runite_greatsword`/`bloodiron_greatsword` 531; @L55 `adamantium_battleaxe` 583 > `adamantium_dagger` 563. Der **Dolch/Beil** dominiert, das namensgebende **Schwert** liegt ~9 % drunter. Harmlos für Parität, aber das Power-Fantasy-Gefühl („das große Schwert ist das stärkste") stimmt nicht. **Fix-Vorschlag:** Sword-`meleeDamage` minimal anheben oder Dolch-Tempo leicht zähmen.

### [P3 Content] `sorrow_wraith` (L72) XP-Dichte-Ausreißer — run4/run5/run6-P3, **vierter** Carry-over
**Befund (Monster-Dump):** unverändert **xp 680 / maxHp 500 → xp/hp 1,36**, ohne regen/enrage (nur burn-inflict). Über den gleichstufigen Nachbarn (void_stalker L66 xp315/hp350 = 0,90). Zusätzlich ist seine **hp500** (deutlich über iron_revenant L58 hp320 / void_stalker L66 hp350) der Mit-Treiber der Magie-L75-Klippe (P1/P1). **Fix-Vorschlag:** xp 680→~520 **oder** leichtes regen/enrage — seit 4 Runs offen.

---

## Δ vs Run 6 (Beleg)

| run6-Status | Status in Run 7 | Beleg (Sim/Dump) |
|---|---|---|
| **Alle 3 Stile @L55/65/75 im Band** (0,92–1,10) | **REGRESSIERT** | Melee 0,89–0,96 · Magie 0,79–0,92 · Ranged 1,00; **2** Stile unter 0,90× an je 1–2 Checkpoints. |
| run6-P2 **Leder-Body offensiv tot** (ironhide 4 < warden 6) | **GESCHLOSSEN** | ironhide 4→7, warhide 4→8; Sim trägt ironhide@L65 / warhide@L75. Leiter offensiv monoton. |
| Melee saß an der **oberen** Decke (1,10× @L75) | **gesenkt — aber zu weit** | str-Doppel weg → Melee 0,89× @L75 (jetzt **unterer** Rand). Korrektur überschießt nach unten. |
| run6-P2 `runecrafting` ohne `trains` (deferred) | **UNVERÄNDERT, jetzt P2-akut** | Magie int nur aus `magic_off` (×1); Ranged behält `leatherworking`-Doppel → Schieflage. |
| run6-P3 Magie hängt an **einer** 2H-Waffe / Wand trailt | **UNVERÄNDERT → jetzt unter Band** | L75-Magie best 526 (Stab) < L65 best 638 (Wand); alle L75-Optionen schwach. |
| (neu) twoHanded der Stäbe | **INKONSISTENT** | voidcaller_staff/godspark_staff fehlt `twoHanded`, alle anderen Stäbe haben es. |
| run6-P3 `sorrow_wraith` xp 680 | **NICHT GEFIXT (4. Run)** | xp 680 / xp-hp 1,36 unverändert. |

---

## Was fehlt für 9,5?

1. **Den Doppel-Eingriff symmetrisch zu Ende führen** (P1 — der Hebel). Sauberste Linie: **`leatherworking trains` entfernen**, dann sind alle drei Crafts attribut-neutral und Ranged sinkt auf Melee/Magie-Niveau (alle ×1, gleicher Backbone). Alternative: `smithing trains:"str"` + `runecrafting trains:"int"` wieder rein, **gepaart** mit Waffen-Re-Trim ~×0,93. Beweis, dass es zentriert: der Sensitivitäts-Test (Doppel zurück → Melee 0,95–1,03×, Magie 0,98–0,99×).
2. **Magie-L75-Klippe schließen** (P1): folgt großteils aus Punkt 1 (int-Backbone hebt L75 526→659 **und** macht Wand+Focus zur Bestwaffe). Restlich: Top-1H-Wand-Output @L70–75 leicht anheben, damit die Klippe (L65 638 > L75 526) verschwindet.
3. **twoHanded-Inkonsistenz fixen** (P2): `voidcaller_staff` + `godspark_staff` → `twoHanded:true` (Konsistenz + Stab+Focus-Exploit zu).
4. **Melee-Waffen-Identität** (P3): Schwert minimal über den Dolch heben (oder Dolch-Tempo zähmen), damit die „große Waffe" sich auch stark anfühlt.
5. **`sorrow_wraith` xp endlich trimmen** (P3): 680→~520 oder regen/enrage — 4. Run offen; senkt nebenbei die L75-Magie-Klippe ab.

---

## Fazit
Run 7 ist **kein** sauberer Fortschritt, sondern ein **gemischter** Lauf (8,5 → 7,5): Ein echter run6-Befund ist **geschlossen** — die **Leder-Body-Leiter ist offensiv wiederbelebt** (ironhide/warhide werden jetzt getragen), und Combat bleibt todes-/bugfrei. **Aber** die Headline-Kernfrage ist **regressiert**: die str-Doppel-Entfernung war **einseitig** — sie hat das (in run6 zu hohe) Melee an den unteren Rand gezogen und Magie bei L75 unter Band gedrückt, während **Ranged** mit seinem unangetasteten `leatherworking → dex`-Doppel zur **alleinigen Decke** wurde. Die Wurzel ist **klein und im Sensitivitäts-Test eindeutig belegt**: ein **symmetrischer** Doppel-Eingriff (Punkt 1) zentriert alle drei Stile **und** räumt die Magie-L75-Klippe samt Waffen-Diversität gleich mit ab. Plus die neue twoHanded-Inkonsistenz und die zwei alten P3-Carry-overs — dann sitzt L50–75 sauber auf 9–9,5.
