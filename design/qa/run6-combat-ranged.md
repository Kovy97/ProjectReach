# QA-Run 6 — Combat-Tiefenanalyse FERNKAMPF (Ranged-Endgame-Trim + str-in-Platte)

**Tester:** Playtester-Analyst (READ-ONLY) · **Datum:** 2026-06-28 · **Fokus:** Fernkampf
**Scope:** `combat.ts`, `computeStats` (`character.ts`), Bögen/Pfeile/Köcher/Leder/voidhide/shadowhide + Götzeneisen-Platte aus `packages/content/src/index.ts`, `shared/src/index.ts`.
**Leitfrage (Chef):** Nach dem Run-6-Endgame-Trim — **voidhide rangedDamage ×0,5 + boots-Typo 1→6, Bögen ×0,85, ammoDamage ×0,78, shadowhide ×0,6** — und dem **str-in-Platte**-Buff für Melee: Ist Fernkampf jetzt im ±15 %-Band @L99 (nicht mehr 1,3–1,4× über Melee)? Ist der Evasion-Tank entschärft? Ist die Glass-Cannon-Identität spürbar?

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`advance`, Seed 5), je Checkpoint **drei tier-gleiche Builds** (melee/ranged/magic) gegen denselben **on-level Mob** über **1 h** Spielzeit. Stil-realistische Skill-Investition (melee: attack+power+defence+vitality+smithing → str/dex/con · ranged: ranged+defence+vitality+leatherworking+fletching → dex/con · magic: magic_off+magic_def+defence+vitality → int/wis/con), **auto-gewähltes stil-passendes Gear pro Slot** und die **Waffe per echter DPS** (jeden Kandidaten anlegen → `computeStats` → crit-gewichtete dmg/Intervall → beste). Köcher voll, Food `cooked_voidray`, Auto-Eat Tier 3. **Zweite Sonde:** L99-Ranged mit Rüstungs-Auswahl **nach echter DPS** (durchsatz-optimierender Spieler) vs. erzwungenes voidhide — um voidhide↔shadowhide ehrlich auszufechten. Beide Harness-Dateien nach dem Lauf **entfernt**. Alle Zahlen unten sind reale Sim-Ausgaben.

**Run-6-Hebel im Content verifiziert (alle live):** voidhide-`rangedDamage` 5-Tlg **57→34** (helm6/body9/legs7/vamb6/**boots6** — Typo 1→6 gefixt; def/eva/hp unverändert 149/95/350) · godiron_shortbow `rangedDamage` **59** (×0,85) · godiron_arrow `ammoDamage` **32→25** (×0,78) · shadowhide-`rangedDamage` gekürzt (helm4/body5/legs4/vamb4/boots0) · Götzeneisen-Platte trägt jetzt `modifiers.str` (Vollhelm 8 / Platebody 18 / Platelegs 12).

> Melee-Referenz = bester DPS-Melee je Checkpoint (godiron_dagger @L99 etc.) → faire 1.00×-Basis. Magie ist nur Kontext (mana-/Stab-sensitiv).

---

## Fun-Score: **8.0 / 10**

**Der Endgame-Trim ist gelandet — und zwar präzise, ohne Überschuss.** Das mit Abstand größte Run-5-Problem (Ranged @L99 **1,39×** über Melee, Endgame-Decke) ist **gelöst**: L99 sitzt jetzt bei **~1,05×** (durchsatz-optimierter voidhide-Build, 653 vs 624 kills/h) bzw. **0,92×** (evasions-lastiger Build) — beide **im ±15 %-Band**. L40 (**1,01×**) und L65 (**1,08×**) sind sauber im Band. Die drei Damage-Trims (voidhide ×0,5, Bögen ×0,85, ammo ×0,78) **plus** der str-in-Platte-Buff (Melee-L99-dmg **359→416**) haben den Spalt von zwei Seiten zugedrückt, ohne Ranged zu zerstören. **+1,0 ggü. Run 5.**

**Aber die zwei strukturellen Run-5-Befunde leben unverändert weiter, weil Run 6 sie schlicht nicht angefasst hat:** (1) **Kein einziger Run-6-Hebel berührt einen Evasion-Wert** — der Evasion-Tank ist daher mechanisch unverändert (~3× über Platten-Melee, je nach Offhand-Wahl bis 3,9× stapelbar). (2) **Glass-Cannon ohne Zähne:** Ranged ist auf dem Papier squishig (def ~43 %, hp ~59 % von Melee), aber unter Auto-Eat **0 Tode an allen 12 Läufen** — der Nachteil bleibt Kosmetik. (3) Der `leatherworking→dex`-Doppelfeeder (Treiber von Evasion **und** Tempo) ist ebenfalls unangetastet. Dazu eine kleine **Überkorrektur am Low-End** (L10 0,78×, s.u.). Ein voller Punkt rauf für den sauberen Throughput-Fix; nicht mehr, weil Evasion + Glass-Cannon-Kehrseite weiter offen sind.

---

## Durchsatz (kills/h, 1 h Sim, on-level Mob, melee = 1.00×)

| Build | L10 vs goblin_butcher | L40 vs forest_warden | L65 vs roc_elder¹ | L99 vs aether_wraith |
|---|---:|---:|---:|---:|
| melee  | 938 (1.00×) | 454 (1.00×) | 412 (1.00×) | 624 (1.00×) |
| **ranged** | **732 (0.78×)²** | **458 (1.01×)** | **447 (1.08×)** | **653 (1.05×)³ / 573 (0.92×)** |
| magic (Kontext) | 590 (0.63×) | 233 (0.51×) | 178 (0.43×) | 176 (0.28×) |

¹ *roc_elder hat `regen` (DPS-Check) → staucht alle Ratios; L65 konservativ.*
² *L10-Artefakt: str-in-Platte macht den schweren Maul zum besten Melee-DPS — er **one-shottet** den 90-HP-Goblin (dmg 110). Gegen einen so squishigen Mob schlägt ein Burst-Melee den Mehrfach-Treffer-Ranged. Mit dagger-Baseline läge L10 ~1,0×. Kein echter Ranged-Schwächebefund, aber der str-Buff verschiebt die Frühgame-Melee-Identität (s. P2).*
³ *L99 ranged hängt von der Rüstungswahl ab: durchsatz-optimal (voidhide, max rangedDamage) = **653 (1,05×)**; evasions-lastig (shadowhide) = 573 (0,92×). **Beide im Band.** Der DPS-Optimierer trägt weiter voidhide, weil voidhide auch nach dem ×0,5-Nerf mehr rangedDamage hat als shadowhide.*

**Begleit-Stats L99** (dmg / acc / aIMs / crit / **eva / def / hp** / Tode):
- melee:  dmg **416**, acc 660, aIMs 2075, crit 0.23, **eva 86, def 499, hp 1995**, 0 Tode · str 92
- ranged (durchsatz-optimal): dmg **284**, acc 670, aIMs 1575, crit 0.37, **eva 224, def 215, hp 1183**, 0 Tode
- ranged (evasions-lastig):    dmg 265, acc 670, aIMs 1575, crit 0.32, **eva 333, def 327, hp 1429**, 0 Tode
- magic:  dmg 177, acc 307, aIMs 2755, crit 0.08, **eva 68, def 522, hp 1965**, 0 Tode

**Trefferquote (Miss-Kosten):** Ranged-acc 670 vs aether_wraith eva 40 → **hitChance ~94 %** (`acc/(acc+eva)`), ~6 % Miss — vernachlässigbar, Ranged hat keine Accuracy-Schwäche. Munitionssenke real (~2.300 Pfeile/h @L99). Mechanik bugfrei (s.u.).

---

## Evasion / Survivability — die Kernfrage

| Checkpoint | melee eva | ranged eva | **ranged/melee** | melee def/hp | ranged def/hp | Tode |
|---|---:|---:|---:|---:|---:|---:|
| L10 | 28 | 79 | **2.82×** | 73 / 341 | 50 / 277 | 0 |
| L40 | 48 | 146 | **3.04×** | 162 / 749 | 109 / 562 | 0 |
| L65 | 64 | 199 | **3.11×** | 246 / 1127 | 176 / 855 | 0 |
| L99 | 86 | **224 (dps) / 333 (eva)** | **2.6× / 3.87×** | 499 / 1995 | 215–327 / 1183–1429 | 0 |

**Lesart (unverändert ggü. Run 5):** **Run 6 hat keinen Evasion-Wert getrimmt** (alle fünf Hebel sind rangedDamage/ammoDamage/str — kein evasion). Der Evasion-Tank ist deshalb **mechanisch identisch zu Run 5** (R5 L99 3,14×). Die Spanne 2,6×–3,87× @L99 ist **reine Build-Wahl**: der DPS-Optimierer nimmt zufällig ein evasions-armes Offhand (wooden_shield) → 224; ein Spieler mit natürlichem Leder-/Pavise-Offhand stapelt auf 333. **Treiber bleibt:** dex aus **ranged + leatherworking** (Divisor 4 → dex 55 @L99 vs Melee dex 30) + das gesamte Leder-/Cape-/Offhand-Evasion-Budget; **Platte trägt strukturell ~0 Evasion**. Mit Auto-Eat (0 Tode) ist die hohe Evasion ein **reiner Gratis-Vorteil ohne Kehrseite**. Defensiv ist Ranged „glass" auf dem Papier (def 43 %, hp 59 % von Melee) — folgenlos.

---

## Δ vs Run 5

| Metrik | Run 5 | Run 6 | Δ |
|---|---:|---:|---|
| **Fun-Score** | 7.0 | **8.0** | **+1.0** (Endgame-Throughput-Fix gelandet) |
| ranged kills/h **L99** | **1.39×** | **~1.05× (dps) / 0.92× (eva)** | **GELÖST — im Band** ✓ |
| ranged kills/h L40 | 1.32× | **1.01×** | **gelöst** ✓ |
| ranged kills/h L65 | 1.12× | **1.08×** | im Band (beide) |
| ranged kills/h L10 | 1.01× | **0.78×** | leicht **unter** Band (str-Maul-Artefakt, s. P2) |
| ranged dmg L99 | 318 | **284 (dps)** | niedriger (Trims landen) ✓ |
| melee dmg L99 | 359 | **416** | höher (str-in-Platte) → staucht Ratio ✓ |
| ranged eva L99 | 270 | **224–333** | **unverändert** (kein eva-Hebel in R6) |
| ranged eva/melee | 3.14× | **2.6×–3.87×** | **unverändert** (Build-abhängig) |
| voidhide rangedDamage 5-Tlg | 57 | **34** (×0,5) | ✓ umgesetzt |
| voidhide_boots Typo | rd 1 | **rd 6** | ✓ gefixt |
| godiron-Bogen / Pfeil | 69? / 32 | **59 / 25** (×0,85 / ×0,78) | ✓ umgesetzt |
| Ammo/Out-of-Ammo/Tiers/Kopplung | sauber | **sauber** | unverändert gut |

**Fazit Δ:** Run 6 war ein **chirurgischer Throughput-Pass** — die kombinierten Damage-Trims + der Melee-str-Buff haben die Endgame-Decke (1,39×) exakt ins Band gedrückt (~1,0×), ohne Ranged zu killen oder zu überkorrigieren (außer einer kleinen L10-Delle). **Aber:** Run 6 hat Evasion (#2 aus R5) und die Glass-Cannon-Kehrseite (#3 aus R5) **nicht angefasst** — die leben 1:1 weiter.

---

## Priorisierte Findings

### P0 — keine
Keine blockierenden/kaputten Befunde. Alle Mechaniken laufen, 0 Tode über alle 12 Läufe, kein Soft-Brick. boots-Typo gefixt.

### [P1 Balance] Evasion-Tank unverändert — Ranged out-evadet Platten-Melee weiter ~3× (bis 3,87× stapelbar)
**Befund:** **Kein Run-6-Hebel berührt einen Evasion-Wert** (alle fünf sind rangedDamage/ammoDamage/str). Das eva/melee-Verhältnis ist daher mechanisch identisch zu R5: ~2,8–3,1× über L10–L65, @L99 je nach Offhand 2,6× (DPS-Build) bis **3,87×** (eva-Build). Treiber unverändert: dex-Doppelfeeder (ranged+leatherworking, dex 55 vs Melee 30) + gesamtes Leder-/Cape-/Offhand-Evasion-Budget; Platte trägt ~0 Evasion. Unter Auto-Eat (0 Tode) ist das ein reiner Gratis-Vorteil.
**Fix-Vorschlag:** Am echten Hebel ansetzen (war schon R5-Empfehlung): **Gesamt-Leder-Evasion-Budget** kürzen (nicht nur ein Set), Plattenträgern etwas Evasion geben, **und** den `leatherworking→dex`-Doppelfeeder kappen (P2). Ziel: ranged eva/melee ≤ ~1,5×.

### [P2 Balance/Identität] `leatherworking → dex` weiter aktiv — 5-Stat-Doppelfeeder (Root-Cause von Evasion **und** Tempo)
**Befund:** Verifiziert in `skills.trains` — `leatherworking` trainiert weiter **dex**. Ranged zieht dex aus **ranged + leatherworking** (2 Skills → dex 55 @L99), Melee dex nur aus **attack** (dex 30). dex speist **fünf** Ranged-Stats (rangedDamage, critChance, attackIntervalMs, accuracy, evasion). Das ist der strukturelle Treiber hinter dem Evasion-Vorsprung **und** dem Tempo (aIMs 1575 vs Melee 2075). Derselbe Befund wie R5-P2 und `parity-r2-gegenprobe.md`.
**Fix-Vorschlag:** `leatherworking.trains` entfernen (→ nichts, analog fletching/runecrafting) **oder** auf ein nicht-Kampf-Attribut legen.

### [P2 Balance] Glass-Cannon-Kehrseite weiter unsichtbar (Auto-Eat trivialisiert niedrige hp/def)
**Befund:** Ranged ist defensiv echt „glass" (hp 1183 = 59 %, def 215 = 43 % von Melee im DPS-Build) — aber `cooked_voidray` (170 HP) + Auto-Eat Tier 3 → **0 Tode an allen Checkpoints**. Es gibt keinen Slot, an dem Ranged für seinen Durchsatz bezahlt. Run 6 hat die voidhide-def/hp nicht weiter gesenkt (nur rangedDamage), der Nachteil bleibt also folgenlos.
**Fix-Vorschlag:** Der squishy-Identität Zähne geben — Food-/Auto-Eat-Druck (höherer Verbrauch bei vielen Treffern), Boss-/Dungeon-Kontexte ohne Auto-Eat, oder Spike-Damage-Mobs, die niedrige hp wirklich bestrafen.

### [P2 Balance] str-in-Platte kippt das Frühgame-Melee zum Burst-Maul → L10-Ranged scheinbar 0,78×
**Befund:** Der str-in-Platte-Buff hebt den Melee-Schaden so, dass der schwere **Maul** zum besten DPS-Melee wird und den 90-HP-goblin_butcher **one-shottet** (dmg 110). Dadurch springt die Melee-L10-Baseline (R5 727 → R6 938 kills/h) und Ranged fällt nominell auf 0,78× — **kein echter Ranged-Schwächebefund**, sondern eine Mob-HP-/Burst-Wechselwirkung. Mit dagger-Baseline läge L10 ~1,0×.
**Fix-Vorschlag:** Kein dringender Fix nötig (L40–L99 sind sauber). Falls die Frühgame-Parität exakt sein soll: str-in-Platte erst ab höheren Tiers greifen lassen **oder** Frühgame-Mob-HP minimal anheben, damit One-Shot-Maul nicht dominiert. Niedrige Priorität.

### [P3 Content] shadowhide droht totes Content zu werden (×0,6-rangedDamage + voidhide bleibt BiS)
**Befund:** Nach dem shadowhide-rangedDamage-×0,6 trägt der DPS-Optimierer @L99 **kein einziges** shadowhide-Teil mehr (gewählt: voidhide body/legs/gloves/boots + spectral_coif helm). shadowhides einzige Kante wäre noch Evasion/def/hp — die ein durchsatz-orientierter Idle-Spieler aber nicht gewichtet, solange Auto-Eat 0 Tode liefert. shadowhide ist damit faktisch nur noch das „tanky-Ranged"-Set ohne Anreiz.
**Fix-Vorschlag:** Entweder shadowhide eine klare Nische geben (echte Survivability-Wahl mit spürbarem rangedDamage-Verzicht — sobald P2-Auto-Eat-Druck existiert), oder die Tiers konsolidieren. Erst relevant, wenn die Glass-Cannon-Kehrseite (P2) Zähne hat.

### [P3 Abdeckung] Suffix-/Random-Roll-Ranged-Items nicht getestet
**Befund:** Harness nutzt **plain** Gear (keine `equippedInstances`). Affix-/Suffix-Rolls (Memory: WoW-Stil) sind nicht abgedeckt. Risiko: Suffixe könnten Evasion erneut stapeln und P1 verschärfen.
**Fix-Vorschlag:** Separat verifizieren, dass Ranged-Suffix-Pools **kein** Evasion-Restacking erlauben (eher rangedDamage/crit/Tempo).

---

## Mechanik-Checks Fernkampf (alle bestanden)
- **Köcher/Ammo:** Munition im `ammo`-Slot (`equipment.ammo` + `state.ammoCount`); nur passende, nicht-leere Munition feuert scharf und addiert `ammoDamage` (combat.ts:693–700). Verbrauch nie negativ.
- **Out-of-Ammo-Stopp:** greift sauber (combat.ts:777). Kein lautloser Notschlag, kein AFK-Loot-Verlust.
- **Pfeil-Tiers:** lückenlose copper→godiron-Leiter mit monoton steigendem `ammoDamage` (1 … **25** nach ×0,78); Top-Bogen schießt Top-Pfeil.
- **Bogen↔Pfeil-Kopplung:** jeder Tier-Bogen referenziert seinen Tier-Pfeil; Requirements steigen tier-gerecht. Kein Top-Bogen→Low-Pfeil-Schlupf.
- **Krit/Tempo-Identität:** Ranged-Boni greifen (critChance +0.06 ≤0,85; aIMs ×0,90). L99 ranged crit 0.37, aIMs 1575 — schnellster Stil.
- **voidhide_boots-Fix:** rangedDamage 1→6 verifiziert — der Stiefel ist nicht mehr tot; DPS-Optimierer trägt ihn jetzt.
- **0 Tode** über alle 12 Läufe.

---

## Was fehlt für 9,5?
1. **Evasion-Tank auflösen** (jetzt der #1-Blocker, da Throughput erledigt ist): Ranged darf nicht der beste Ausweicher sein. Gesamt-Leder-Evasion-Budget kürzen, Platte etwas Evasion geben, `leatherworking→dex`-Doppelfeeder kappen. Ziel eva/melee ≤ ~1,5×.
2. **Glass-Cannon-Kehrseite mit Zähnen:** unter Auto-Eat ist niedrige hp/def gratis (0 Tode). Food-/Auto-Eat-Druck, Auto-Eat-lose Boss-/Dungeon-Kontexte oder Spike-Damage, damit „weniger Defensive" wirklich wehtut — erst dann zahlt Ranged für seinen Durchsatz.
3. **L10-Feinschliff:** str-in-Platte nicht den Frühgame-Burst-Maul zur dominanten Melee-Baseline machen (Ranged-L10 zurück ins Band ~1,0×). Niedrige Priorität.
4. **shadowhide-Nische** definieren, damit der ×0,6-Trim es nicht zu totem Content macht (greift erst sinnvoll nach Punkt 2).
5. **Suffix-Ranged-Items** gegen Evasion-Restacking verifizieren (Random-Roll-Pools auf rangedDamage/crit/Tempo statt Evasion).

**Bottom line:** Der Endgame-Durchsatz — das dominante Run-5-Problem — sitzt jetzt **im Band** (L40–L99 ~1,0–1,1×); der Trim war präzise und ohne Überschuss. Was Fernkampf weiter unter 9,5 hält, ist **nicht mehr der Schaden, sondern die Defensive**: der unangetastete Evasion-Tank (~3×) und die zahnlose Glass-Cannon-Kehrseite. Beide brauchen einen eigenen Pass — Run 6 war bewusst ein Damage-Pass, kein Defense-Pass.
