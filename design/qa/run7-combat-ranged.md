# QA-Run 7 — Combat-Tiefenanalyse FERNKAMPF (Melee-/Magie-Senkung, Ranged-Gear unverändert)

**Tester:** Playtester-Analyst (READ-ONLY) · **Datum:** 2026-06-28 · **Fokus:** Fernkampf
**Scope:** `combat.ts`, `computeStats` (`character.ts`), Bögen/Pfeile/Köcher/Leder/voidhide/shadowhide + Platte/Götzeneisen aus `packages/content/src/index.ts`, `shared/src/index.ts`.
**Leitfrage (Chef):** Run 7 hat **Melee gesenkt (str-Doppel weg)** und **Magie gesenkt** — und Ranged dadurch **relativ angehoben, OHNE Ranged-Gear zu re-buffen**. Ist Fernkampf @L10/L40/L65/L99 jetzt im ±15 %-Band? Bleibt der **Evasion-Tank / Glass-Cannon-Identitäts-Punkt** der einzige 9,5-Blocker?

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`advance`/`combatStep`, Seed 5), je Checkpoint **drei stil-gleiche Builds** (melee/ranged/magic) gegen denselben **on-level Mob** über **1 h** Spielzeit (36 000 Ticks à 100 ms). Stil-realistische Skill-Investition (melee: attack+power+defence+vitality+smithing · ranged: ranged+defence+vitality+leatherworking+fletching · magic: magic_off+magic_def+defence+vitality+runecrafting). **Gear pro Slot auto-gewählt** (Requirement-gegated → tier-passend); **Waffe per ECHTER Kurz-Sim** (jeder Waffenkandidat 5 min real durchgespielt → meiste Kills gewinnt; kein Proxy, der die langsame Wuchtwaffe überbewertet). Köcher voll, Food `cooked_voidray`, Auto-Eat Tier 3. **Zweite Sonde:** L99-Ranged DPS-optimal vs. **erzwungen voidhide** vs. **erzwungen shadowhide**. Harness nach dem Lauf **entfernt**. Alle Zahlen unten sind reale Sim-Ausgaben (eine konsistente Methodik → die Run-7-internen Ratios sind sauber vergleichbar; der Δ-vs-Run-6 trägt etwas Harness-Rauschen, s.u.).

**Content-Stand verifiziert (live):** voidhide-`rangedDamage` 5-Tlg **34** (helm6/body9/legs7/vamb6/boots6 — unverändert ggü. R6) · shadowhide-`rangedDamage` **17** (helm4/body5/legs4/vamb4/boots0) · godiron_shortbow `rangedDamage` **59**, godiron_arrow `ammoDamage` **25** (beide unverändert) · **Ranged-Gear also bestätigt unangetastet.** · Götzeneisen-Platte trägt weiter `modifiers.str` (medhelm/fullhelm 8, platebody 18, platelegs 12) und der godiron_maul `str` 12. · `attack.trains = dex`, `power.trains = str`, `ranged.trains = dex`, `leatherworking.trains = dex` (Doppelfeeder weiter aktiv, s. P2).

> Melee-Referenz = **bester DPS-Melee je Checkpoint per echter Kurz-Sim** (godiron_dagger @L99/L65, *maul* @L10/L40) → faire 1.00×-Basis. Magie ist Kontext (mana-/Focus-sensitiv).

---

## Fun-Score: **7.5 / 10**

**Der Hebel ist gelandet — aber er hat die Endgame-Parität in die FALSCHE Richtung gekippt.** Run 6 hatte das dominante Run-5-Problem (Ranged @L99 1,39× über Melee) sauber ins Band gedrückt (~1,05×). Run 7 senkt nun **Melee** (L99-Durchsatz **624→560** kills/h in meiner Methodik, dmg ~416→**379**) und lässt **Ranged-Gear unverändert** — Ergebnis: Ranged steigt **relativ zurück über das Band**, @L99 auf **1,19×** (DPS-optimal) und @L65 an die Obergrenze (**1,11×**). Das ist eine **milde Regression genau der Achse, für die Run 6 seinen +1,0 bekam.** L40 (1,00×) bleibt sauber, L10 (0,73×) bleibt das bekannte Maul-One-Shot-Artefakt.

**Die zwei strukturellen Run-5/6-Befunde leben weiter unverändert:** (1) **Evasion-Tank**: Ranged out-evadet Platten-Melee weiter ~2,6×–3,6× (kein Run-7-Hebel berührt einen Evasion-Wert oder den `leatherworking→dex`-Doppelfeeder). (2) **Glass-Cannon ohne Zähne**: Ranged ist auf dem Papier squishig (def ~45 %, hp ~61 % von Melee), aber unter Auto-Eat **0 Tode an allen 14 Läufen** — der Nachteil bleibt Kosmetik.

**Warum 7,5 statt 8,0:** Der Throughput-Fix (Run-6-Kernerfolg) ist @L99 **teil-rückabgewickelt** — Ranged ist wieder der stärkste Endgame-Stil, diesmal weil Melee gesunken ist statt weil Ranged zu hoch wäre. Die **Senkung hat überschossen.** Evasion + Glass-Cannon bleiben offen. **−0,5 ggü. Run 6.** (Nicht −1,0, weil die Überschreitung mit 1,19× viel milder ist als Run-5's 1,39× und L40/L65 nicht kippen.)

> **Wichtig:** Der Evasion-Tank ist **NICHT mehr der einzige** 9,5-Blocker. Run 7 hat einen zweiten, frischen Balance-Blocker geschaffen (L99-Throughput wieder out-of-band). Antwort auf die Kernfrage: **Nein** — Ranged ist @L99 (und an der L65-Kante) NICHT im Band.

---

## Durchsatz (kills/h, 1 h Sim, on-level Mob, melee = 1.00×)

| Build | L10 vs goblin_butcher | L40 vs forest_warden | L65 vs roc_elder¹ | L99 vs aether_wraith |
|---|---:|---:|---:|---:|
| melee  | 945 (1.00×) | 457 (1.00×) | 415 (1.00×) | 560 (1.00×) |
| **ranged** | **689 (0.73×)²** | **455 (1.00×)** | **459 (1.11×)** | **664 (1.19×)³** |
| magic (Kontext) | 681 (0.72×) | 475 (1.04×) | 465 (1.12×) | 578 (1.03×) |

¹ *roc_elder hat `regen` 4 (DPS-Check) → staucht alle Ratios leicht; L65 konservativ.*
² *L10-Artefakt (wie R6): bei L10/L40 ist der **maul** der echte DPS-Melee — er one-shottet den 90-HP-goblin (melee dmg 104). Gegen so squishige Mobs schlägt Burst-Melee den Mehrfachtreffer-Ranged. Kein echter Ranged-Schwächebefund.*
³ *L99 ranged DPS-optimal = **664 (1,19×)**; erzwungen voidhide = 656 (1,17×); erzwungen shadowhide (eva-lastig) = 579 (1,03×). **Nur der eva-Build liegt im Band; der durchsatz-optimale Build (den ein Idle-Spieler trägt) liegt darüber.***

**Begleit-Stats L99** (dmg / acc / aIMs / crit / **eva / def / hp** / Tode):
- melee (godiron_dagger):  dmg **379**, acc 663, aIMs 2050, crit 0.23, **eva 86, def 471, hp 1934**, 0 Tode
- ranged (DPS-optimal):    dmg **283**, acc 673, aIMs 1575, crit 0.37, **eva 221, def 212, hp 1179**, 0 Tode
- ranged (shadowhide-eva): dmg 269, acc 702, aIMs 1710, crit 0.22, **eva 305, def 274, hp 1314**, 0 Tode
- magic (godiron_staff):   dmg 409, acc 763, aIMs 2400, crit 0.35, **eva 196, def 233, hp 1226**, 0 Tode

**Trefferquote (Miss-Kosten):** Ranged-acc 673 vs aether_wraith eva 40 → **hitChance ~94 %** (`acc/(acc+eva)`), ~6 % Miss — vernachlässigbar, Ranged hat keine Accuracy-Schwäche. Munitionssenke real (~2.300 Pfeile/h @L99). Mechanik bugfrei (s.u.).

---

## Evasion / Survivability — die Kernfrage

| Checkpoint | melee eva | ranged eva | **ranged/melee** | melee def/hp | ranged def/hp | Tode |
|---|---:|---:|---:|---:|---:|---:|
| L10 | 34 | 81 | **2.38×** | 75 / 441 | 46 / 355 | 0 |
| L40 | 50 | 141 | **2.82×** | 154 / 743 | 97 / 546 | 0 |
| L65 | 65 | 180 | **2.77×** | 234 / 1096 | 146 / 785 | 0 |
| L99 | 86 | **221 (dps) / 305 (eva)** | **2.57× / 3.55×** | 471 / 1934 | 212–274 / 1179–1314 | 0 |

**Lesart (unverändert ggü. Run 5/6):** **Kein Run-7-Hebel berührt einen Evasion-Wert** — der Evasion-Tank ist mechanisch identisch. Die Spanne 2,57×–3,55× @L99 ist reine Build-Wahl (DPS-optimaler vs. shadowhide-Stapel). **Treiber bleibt:** dex aus **ranged + leatherworking** (Divisor 4) + das gesamte Leder-/Cape-/Offhand-Evasion-Budget; **Platte trägt strukturell ~0 Evasion**. Mit Auto-Eat (0 Tode) ist die hohe Evasion ein **reiner Gratis-Vorteil ohne Kehrseite**. aether_wraith trifft den DPS-Ranged nur ~32 % der Schläge (acc 102 vs eva 221) und macht dmg 72 → mit voidray-Auto-Eat folgenlos.

---

## Δ vs Run 6

| Metrik | Run 6 | Run 7 | Δ |
|---|---:|---:|---|
| **Fun-Score** | 8.0 | **7.5** | **−0.5** (L99-Parität teil-rückabgewickelt) |
| ranged kills/h **L99** | **~1.05× (dps)** | **1.19× (dps) / 1.03× (eva)** | **REGRESSION — wieder über Band** ✗ |
| ranged kills/h L65 | 1.08× | **1.11×** | leicht höher (an der Obergrenze) |
| ranged kills/h L40 | 1.01× | **1.00×** | im Band ✓ |
| ranged kills/h L10 | 0.78× | **0.73×** | unter Band (Maul-One-Shot-Artefakt, beide) |
| **melee** kills/h L99 | 624 | **560** | **gesenkt** (Run-7-Hebel landet) ✓ |
| melee dmg L99 | 416 | **379** | **gesenkt** ✓ |
| ranged kills/h L99 (absolut) | 653 | **664** | ~gleich (Gear unverändert) ✓ |
| ranged eva L99 | 224–333 | **221–305** | unverändert (kein eva-Hebel) |
| ranged eva/melee | 2.6×–3.87× | **2.57×–3.55×** | unverändert |
| voidhide / shadowhide rangedDamage | 34 / 17 | **34 / 17** | unverändert (kein Re-Buff bestätigt) ✓ |
| Tode (alle Läufe) | 0 | **0** | unverändert (Glass-Cannon zahnlos) |

**Fazit Δ:** Run 7 hat **Melee gesenkt** (L99 624→560 / dmg 416→379) und Magie auf ein gesundes ~1,0× gebracht — aber weil **Ranged-Gear unangetastet blieb**, ist der Ranged-Durchsatz **relativ über das Band zurückgestiegen** (L99 1,05×→**1,19×**). Run 6 schloss den Spalt von Ranged her (Damage-Trim); Run 7 öffnet ihn von Melee her wieder. **Netto: dieselbe Out-of-Band-Diagnose wie Run 5 @L99, nur milder (1,19× statt 1,39×) und mit umgekehrtem Vorzeichen in der Ursache.** Evasion-Tank und Glass-Cannon-Kehrseite blieben — wie schon in Run 6 — unberührt.

> **Methodik-Hinweis zum Δ:** Mein L99-Melee misst dmg 379 (run6 berichtete 416) und Magie L99 1,03× (run6 berichtete 0,28× — run6's Magie war mana-/focus-gestarvt und als „nur Kontext" markiert). Der Magie-Δ ist deshalb **nicht** belastbar (unterschiedliche Gear-Wahl), der Melee-Senkungs-Δ und vor allem die **Run-7-INTERNEN Ratios** (alle drei Stile identisch gemessen) sind belastbar — und intern liegt Ranged @L99 mit **1,19× > 1,15×** eindeutig out-of-band.

---

## Priorisierte Findings

### P0 — keine
Keine blockierenden/kaputten Befunde. Alle Mechaniken laufen, 0 Tode über alle 14 Läufe, kein Soft-Brick, kein Out-of-Ammo-Lautlos-Weiterlauf.

### [P1 Balance — NEU/Regression] Melee-Senkung überschießt → Ranged @L99 wieder über Band (1,19×)
**Befund:** Run 7 senkt Melee (L99 560 vs Ranged 664) ohne Ranged anzufassen → Ranged ist wieder der stärkste Endgame-Stil (1,19× @L99, 1,11× @L65-Kante). Das macht den Run-6-Throughput-Fix @L99 teilweise zunichte. Ursache ist diesmal **nicht** zu hoher Ranged-Schaden, sondern zu tief gesenktes Melee bei eingefrorenem Ranged-Gear.
**Fix-Vorschlag:** Entweder Melee-Senkung **abschwächen** (Ziel: melee L99 ~600–620 kills/h, dann ranged ~1,07–1,10×), **oder** — wenn die Melee-Senkung aus Melee-/Magie-Sicht gewollt ist — Ranged **doch leicht trimmen** (godiron_arrow `ammoDamage` 25→~22 **oder** voidhide-`rangedDamage` 34→~30), um die ~4 % Überschuss @L99 herauszunehmen. **Nie wieder Melee/Magie senken, ohne den Ranged-Durchsatz im selben Pass gegenzumessen** — die drei Stile hängen über die Baseline zusammen.

### [P1 Balance] Evasion-Tank unverändert — Ranged out-evadet Platten-Melee weiter ~2,6×–3,6×
**Befund:** Kein Run-7-Hebel berührt einen Evasion-Wert. eva/melee mechanisch identisch zu R6 (~2,4× L10 → 2,57×/3,55× L99). Treiber unverändert: dex-Doppelfeeder (ranged+leatherworking) + gesamtes Leder-/Cape-/Offhand-Evasion-Budget; Platte trägt ~0 Evasion. Unter Auto-Eat (0 Tode) reiner Gratis-Vorteil.
**Fix-Vorschlag:** Am echten Hebel ansetzen (seit R5 empfohlen): **Gesamt-Leder-Evasion-Budget** kürzen (nicht nur ein Set), Plattenträgern etwas Evasion geben, **und** den `leatherworking→dex`-Doppelfeeder kappen (P2). Ziel: ranged eva/melee ≤ ~1,5×.

### [P2 Balance/Identität] `leatherworking → dex` weiter aktiv — 5-Stat-Doppelfeeder (Root-Cause Evasion + Tempo)
**Befund:** Verifiziert in `skills` (`index.ts`): `leatherworking.trains = "dex"`. Ranged zieht dex aus **ranged + leatherworking** (2 Skills), Melee dex nur aus **attack**. dex speist **fünf** Ranged-Stats (rangedDamage, critChance, attackIntervalMs, accuracy, evasion). Strukturtreiber hinter Evasion-Vorsprung **und** Tempo (aIMs 1575 vs Melee 2050). Identisch zu R5-P2 / R6-P2 / `parity-r2-gegenprobe.md`.
**Fix-Vorschlag:** `leatherworking.trains` entfernen (analog fletching/runecrafting) **oder** auf ein Nicht-Kampf-Attribut legen.

### [P2 Balance] Glass-Cannon-Kehrseite weiter unsichtbar (Auto-Eat trivialisiert niedrige hp/def)
**Befund:** Ranged ist defensiv echt „glass" (hp 1179 = 61 %, def 212 = 45 % von Melee im DPS-Build) — aber `cooked_voidray` + Auto-Eat Tier 3 → **0 Tode an allen Checkpoints**. Kein Slot, an dem Ranged für seinen Durchsatz bezahlt. Run 7 hat daran nichts geändert.
**Fix-Vorschlag:** Der squishy-Identität Zähne geben — Food-/Auto-Eat-Druck (höherer Verbrauch bei vielen Treffern), Auto-Eat-lose Boss-/Dungeon-Kontexte oder Spike-Damage-Mobs, die niedrige hp wirklich bestrafen.

### [P2 Balance] str-in-Platte/Maul kippt das Frühgame-Melee zum Burst → L10/L40-Ranged scheinbar < Band
**Befund:** Die `modifiers.str` auf Platte (18/12/8) + Maul (12) machen den schweren Maul zum besten DPS-Melee @L10/L40; der Maul one-shottet den 90-HP-goblin (L10 945 kills) → Ranged nominell 0,73×. **Kein echter Ranged-Schwächebefund** (L40 ist mit 1,00× sauber, sobald der Mob nicht mehr one-shotbar ist). Hinweis: Das „str-Doppel weg"-Lever hat die str-in-Platte **nicht** entfernt (live noch vorhanden) — nur die Skill-/Formel-Seite wurde gesenkt.
**Fix-Vorschlag:** Niedrige Priorität. Falls exakte Frühgame-Parität gewünscht: str-in-Platte erst ab höheren Tiers greifen lassen **oder** Frühgame-Mob-HP minimal anheben.

### [P3 Content] shadowhide bleibt Grenzfall-Content (voidhide weiter BiS für Durchsatz)
**Befund:** Der DPS-Optimierer @L99 trägt voidhide-dominiert (664 kills) + spectral_coif-Helm; shadowhide-erzwungen nur 579 (1,03×). shadowhides einzige Kante ist Evasion/def/hp — die ein durchsatz-orientierter Idle-Spieler nicht gewichtet, solange Auto-Eat 0 Tode liefert.
**Fix-Vorschlag:** shadowhide eine klare Nische geben (echte Survivability-Wahl mit spürbarem rangedDamage-Verzicht) — greift erst sinnvoll, sobald die Glass-Cannon-Kehrseite (P2) Zähne hat.

### [P3 Abdeckung] Suffix-/Random-Roll-Ranged-Items nicht getestet
**Befund:** Harness nutzt **plain** Gear (keine `equippedInstances`). Affix-/Suffix-Rolls (Memory: WoW-Stil) nicht abgedeckt. Risiko: Suffixe könnten Evasion erneut stapeln und P1 verschärfen.
**Fix-Vorschlag:** Separat verifizieren, dass Ranged-Suffix-Pools **kein** Evasion-Restacking erlauben (eher rangedDamage/crit/Tempo).

---

## Mechanik-Checks Fernkampf (alle bestanden)
- **Köcher/Ammo:** Munition im `ammo`-Slot (`equipment.ammo` + `state.ammoCount`); nur passende, nicht-leere Munition feuert scharf und addiert `ammoDamage` (combat.ts:693–700). Verbrauch nie negativ.
- **Out-of-Ammo-Stopp:** greift sauber (combat.ts:771–780). Kein lautloser Notschlag, kein AFK-Loot-Verlust.
- **Pfeil-Tiers:** lückenlose copper→godiron-Leiter mit monoton steigendem `ammoDamage` (… **25**); Top-Bogen schießt Top-Pfeil über `ammoType`.
- **Bogen↔Pfeil-Kopplung:** jeder Tier-Bogen referenziert seinen Tier-Pfeil; Requirements steigen tier-gerecht. Kein Top-Bogen→Low-Pfeil-Schlupf.
- **Krit/Tempo-Identität:** Ranged-Boni greifen (critChance +0.06 ≤0,85; aIMs ×0,90). L99 ranged crit 0.37, aIMs 1575 — schnellster Stil.
- **0 Tode** über alle 14 Läufe.

---

## Was fehlt für 9,5?
1. **L99-Throughput zurück ins Band** (NEU der #1-Blocker, weil Run 7 ihn re-geöffnet hat): Die Melee-Senkung hat überschossen → Ranged 1,19×. Melee-Senkung abschwächen **oder** Ranged minimal trimmen (ammoDamage 25→~22 **oder** voidhide rangedDamage 34→~30), bis ranged L99 wieder ≤ ~1,10×. **Den dritten Stil im selben Pass gegenmessen.**
2. **Evasion-Tank auflösen:** Ranged darf nicht der beste Ausweicher sein (~2,6×–3,6×). Gesamt-Leder-Evasion-Budget kürzen, Platte etwas Evasion geben, `leatherworking→dex`-Doppelfeeder kappen. Ziel eva/melee ≤ ~1,5×.
3. **Glass-Cannon-Kehrseite mit Zähnen:** unter Auto-Eat ist niedrige hp/def gratis (0 Tode). Food-/Auto-Eat-Druck, Auto-Eat-lose Boss-/Dungeon-Kontexte oder Spike-Damage, damit „weniger Defensive" wirklich wehtut.
4. **L10-Feinschliff:** str-in-Platte/Maul nicht den Frühgame-Burst zur dominanten Melee-Baseline machen (Ranged-L10 zurück ins Band ~1,0×). Niedrige Priorität.
5. **shadowhide-Nische** definieren + **Suffix-Ranged-Items** gegen Evasion-Restacking verifizieren.

**Bottom line:** Die Melee-/Magie-Senkung ist gelandet (Melee L99 624→560, Magie auf gesundes ~1,0×), **aber sie hat überschossen**: weil Ranged-Gear bewusst nicht re-gebufft wurde, ist der Ranged-Endgame-Durchsatz **relativ über das Band zurückgestiegen** (L99 1,05×→**1,19×**, L65 an der Kante). Damit ist **die Antwort auf die Kernfrage „Nein"** — Ranged ist @L99 nicht im Band, und der **Evasion-Tank ist NICHT mehr der einzige 9,5-Blocker**: Run 7 hat einen frischen Throughput-Blocker geschaffen. Der saubere Weg ist eine **stilübergreifende** Baseline-Justierung (Melee-Senkung milder ODER Ranged minimal mit-trimmen) statt einseitiger Einzelhebel — plus der weiter offene Defense-Pass (Evasion + zahnlose Glass-Cannon).
