# QA-Run 5 — Late-Mid Playtest (Level 50–75, „nach Parität-R3 + ironhide-Tier")

**Tester:** Playtester-Analyst (READ-ONLY; kein Game-Code/Content geändert) · **Datum:** 2026-06-28
**Persona:** Spät-Mid-Spieler L50–75 auf dem Weg ins Endgame.
**Fokus (Brief):** 3-Stil-Balance @L55/65/75, das **neue ironhide-L60-Leder-Tier** (Ranged-Wall behoben?), Gear-Kadenz pro Stil, Grind/Wall-Gefühl, Suffix-Drops.
**Methode — echte Zahlen:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`advance` 1h, echte `combatStep`-Loop), nach dem Lauf wieder **entfernt**. Pro Stil & Checkpoint (L55/65/75): **stil-realistische Skill-Investition** (Kampf-Skills + NUR die zum *Tragen* nötigen Crafting-Skills — `requirements`-Gating beachtet) und **best-craftbares Gear auto-gewählt** (höchstes erfülltes Tier pro Slot) + **Waffen-Sweep** (alle Waffen des Stils, beste gewinnt). Munition für Bögen passend zum `ammoType` versorgt, Slayer-Gate via Req-Item gelöst, Auto-Eat (potent heal, Tier 3). Zusätzlich: Magie-Ceiling mit **wand+focus-Offhand**, Mana-Throttle-Diagnose, Leder-Leiter-Dump, Self-Crafter-Variante. Alle Zahlen unten sind reale Sim-Ausgaben (deaths=0 in **allen** Läufen).

---

## Fun-Score: **7,5 / 10** (run4: 6 · run3-mid: 8)

Run 5 **repariert beide run4-P1-Baustellen**: die Ranged-Rüstungs-Wall ist mit dem **ironhide-Tier** sauber geschlossen, und der **Nahkampf-Boden ist weg** — Melee liegt jetzt an allen drei Checkpoints in enger Parität (0,96–1,00×) statt ⅓ hinten. Das ist ein großer Sprung. **Aber:** die Korrektur ist **übers Ziel hinausgeschossen** — durch den parallelen Trim der Magie-Roben (run4-P2-Vorschlag) ist **jetzt die Magie der Boden**, im oberen Band am deutlichsten (L75: 0,78× = ~22 % hinten). Die Parität-Achse hat sich also gedreht, nicht aufgelöst. Combat bleibt mechanisch grundsolide (0 Tode über alle 1h-Läufe gegen on-level Tank-Mobs, Auto-Eat fängt alles). Suffix-Drops sind live und skalieren mit Monster-Level. Was unter 9,5 hält: die neue Magie-Schwäche (L75) + drei strukturelle Magie-Nachteile, die sich stapeln.

---

## Top-Stärken

1. **Ranged-Wall L52→L72 GESCHLOSSEN (das Kern-Ziel von Run 5).** Die Leder-Leiter am Body-Slot eines levelnden Schützen (Sim-Dump):
   | Level | Body-Teil | def / rngDmg |
   |---|---|---|
   | L50–60 | studded_leather_body | 24 / 3 |
   | **L62–69** | **ironhide_body** | **29 / 4** |
   | L70+ | warhide_body | 34 / 4 |
   Leder hat jetzt **3 In-Band-Tiers** (studded 50–52, **ironhide 60–62**, warhide 70–72) auf **~10-Level-Kadenz** — exakt wie Melee-Platte (adamantium/runite/bloodiron) und Magie-Roben (aether/arcane/runewoven). ironhide ist voll-slotted (Haube/Kürass/Beine/Armschützer/Stiefel, alle 5). Das 18–20-Level-Loch von run4 ist **strukturell behoben**.
2. **Nahkampf-Boden (run4-P1) BEHOBEN.** Mit minimalem, realistischem Build (kein Smithing nötig zum Tragen der Platte) ist Melee jetzt konkurrenzfähig bis top — siehe Parität-Tabelle. Treiber: Melee-Offense/Tempo angehoben **und** `smithing` trainiert jetzt **str** (run4: „trainierte nichts") → ein Self-Crafter-Melee zieht zusätzlich str.
3. **Combat-Robustheit hält bis an die Endgame-Schwelle.** Alle 9 Haupt-Läufe (3 Stile × 3 Checkpoints, on-level Tank-Mobs inkl. void_stalker shock-inflict, sorrow_wraith burn-inflict) + alle Waffen-Sweep-Varianten: **deaths = 0**. Auto-Eat + Mitigation greifen sauber.
4. **Suffix-Drops live & level-skaliert.** Equipment-Drops rollen mit `DEFAULT_DROP_SUFFIX_CHANCE = 8 %` einen Suffix, `ilvl = Monster-Level` → ein L72-Mob kann z. B. „des Stiers" (≈ +50 meleeDamage, +32 str bei ilvl 72) droppen. WoW-Stil-Random-Rolls funktionieren im Spät-Mid.
5. **Gear-Kadenz jetzt für alle 3 Stile gleich getaktet (~10 Level):** Platte adamantium(50)/runite(60)/bloodiron(72), Leder studded(50)/**ironhide(60)**/warhide(70), Roben aether(45)/arcane(57)/runewoven(71). Kein Stil steht mehr still.

---

## Priorisierte Findings

### [P1 Balance] Über-Korrektur: Magie ist der NEUE Boden — am stärksten bei L75
**Befund (Sim, best-craftbares Gear + Waffen-Sweep, on-level Mob, deaths=0 überall):**

| Checkpoint | melee kills/h | ranged kills/h | magic kills/h | relativ (melee / ranged / magic) |
|---|---:|---:|---:|---|
| **L55** vs iron_revenant (L58) | 618 | 607 | 457¹ / **570²** | 1,00× / 0,98× / **0,92×**² |
| **L65** vs void_stalker (L66) | 678 | 679 | 634¹ / **636²** | 1,00× / 1,00× / **0,94×**² |
| **L75** vs sorrow_wraith (L72) | 617 | 644 | **505** | 0,96× / 1,00× / **0,78×** |

¹ einzelne beste Magie-Waffe ohne Offhand · ² **fairer Magie-Ceiling** mit optimalem wand+focus-Offhand (so würde ein Magier wirklich spielen). Bei L75 bleibt der **2H-Stab (505)** das Beste — wand+focus erreicht nur 467 (s. P2-Content).

Die run4-Achse hat sich **gedreht**: dort war Melee ⅓ hinten (0,63–0,69×), Magie/Ranged teilten die Spitze. Jetzt sind **Melee+Ranged in enger Parität** (≤ ~8 % bei L55/65, exakt gleichauf bei L65), und **Magie fällt ab** — bei L75 **~22 % hinter** dem Spitzenstil. Ursache (gemessen): der Magie-**Roben-magicDamage wurde getrimmt** (run4 dokumentierte runewoven-Set +93 aus Rüstung; **jetzt nur +56**: cowl9+body16+legs11+hands10+treads10) — das war genau der run4-P2-Vorschlag, aber kombiniert mit dem Melee-Buff schießt es Magie unter beide anderen Stile. **Wichtig — es ist KEIN Mana-Problem:** Mana-Throttle-Diagnose (L75, Mana künstlich vollgehalten vs. limitiert) = **identische 505 kills/h** → die Schwäche ist roher Output (magicDamage 275, aIMs 2880 = langsamster Stil, crit 0,10 = niedrigster), nicht Sustain. **Fix-Vorschlag:** Roben-magicDamage teil-zurücknehmen (Set ~56 → ~68–72) **oder** Stab-`attackIntervalMs` leicht senken; Zielband alle Stile ±10 % über L50–75 (Melee/Ranged sind schon drin, nur Magie nachziehen — nicht überdrehen, sonst Rückfall in run4-Magie-Dominanz).

### [P2 Balance] `runecrafting` trainiert KEIN Attribut — Magies Pflicht-Craft-Steuer hat null Gegenwert
**Befund (`skills`-Dump):** Zum *Tragen* von Stab + Robe muss ein Magier `runecrafting` bis aufs Gear-Level mitziehen (Robe-`requirements` = `{magic_off, runecrafting}`). `runecrafting` hat aber **kein `trains`** → der Grind zahlt **kein** Attribut zurück. Im Kontrast:
| Stil | Pflicht-Craft (wear-req) | trainiert |
|---|---|---|
| Melee | smithing (optional; Platte braucht nur `defence`) | **str** (neu in Run 5) |
| Ranged | leatherworking | **dex** (= schnellere Schüsse + Crit + Eva) |
| **Magie** | **runecrafting** | **— (nichts)** |
Ranged bekommt durchs Pflicht-Leder passiv dex (Offense + Tempo); Magie bekommt durch Pflicht-Runenkunst **nichts**. Das ist die run4-P2-Asymmetrie, **jetzt zu Magies Nachteil verschärft** (weil smithing nun str gibt, runecrafting aber weiter leer ist) und ein zweiter Treiber hinter P1. **Fix-Vorschlag:** `runecrafting` ein `trains: "int"` (oder `wis`) geben → symmetrisch zu leatherworking/smithing, löst einen Gutteil von P1 gleich mit.

### [P2 Content] Top-Tier 1H-Magie-Waffe fehlt — Magie verliert Build-Flexibilität genau im Defizit-Fenster
**Befund (Waffen-Sweep):** Bei L75 ist die beste 1H-Wand + Focus (467 kills/h) **schlechter** als der erzwungene 2H-Stab (505). Bei L55/L65 ist wand+focus dagegen das Beste (570/636). Es fehlt also eine **bloodiron-Tier 1H-Wand**, sodass Magie im oberen Band auf den langsamen 2H-Stab gezwungen wird — genau dort, wo sie ohnehin hinten liegt. **Fix-Vorschlag:** eine bloodiron-Tier 1H-Wand (~req 70) ergänzen, damit der wand+focus-Pfad bis L75 trägt (gibt Magie ~+crit/+mana-Flexibilität statt reinem 2H-Stab).

### [P3 Balance] `sorrow_wraith` (L72) XP-Dichte-Ausreißer — run4-P3 UNVERÄNDERT
**Befund (Monster-Dump):** weiterhin **xp 680 / hp 500 → xp/hp 1,36**, ohne regen/enrage (nur inflict burn), wird genauso schnell gelegt wie die Nachbarn. Über den gleichstufigen Nicht-Tank-Mobs. Harmlos (kein Wall), aber der run4-P3-Vorschlag (xp ~680→~520 **oder** leichtes regen/enrage) ist **nicht** umgesetzt.

### [P3 Content/Feel] Suffix-Drops sind ein seltener Bonus, kein spürbarer Strom
**Befund:** 8 % Suffix nur auf **Equipment**-Drops; die meisten L50–75-Mob-Loots sind Materialien (Essences/Threads), echte Gear-Drops sind ohnehin selten → suffixte Ausrüstung ist ein gelegentlicher Glücksfund, kein Build-prägender Strom. Für jetzt okay (run4-Brief: „Suffix aktiv"), aber wenn Suffixe sich „im Spät-Mid lohnen" sollen, lohnt ein Blick, ob L50–75-Mobs genug Equipment-Basen droppen, damit die 8 % je greifen.

---

## Δ vs Run 4 (Beleg)

| run4-Befund | Status in Run 5 | Beleg (Sim/Dump) |
|---|---|---|
| **P1 Nahkampf ~⅓ hinten** (0,63–0,69×) | **BEHOBEN** | Melee jetzt 0,96–1,00× an allen Checkpoints; minimaler Build, deaths=0. |
| **P1 Ranged-Wall L52→L72** (18–20 Lvl Stillstand) | **BEHOBEN** | ironhide_body füllt L62–69 (def 29/rngDmg 4); 3 In-Band-Leder-Tiers, ~10-Lvl-Kadenz. |
| P2 Magie top-DPS UND zäh | **GEDREHT** | Magie-Roben-magicDamage 93→**56** getrimmt → Magie jetzt **Boden** (L75 0,78×). Über-korrigiert. |
| P2 Crafting-Steuer asymmetrisch | **TEILS / verschoben** | smithing trainiert jetzt **str** (war „nichts"); leatherworking→dex bleibt; **runecrafting weiter ohne `trains`** → jetzt Magie-Nachteil. |
| P3 `sorrow_wraith` xp-Ausreißer | **NICHT GEFIXT** | xp 680 / xp-hp 1,36 unverändert. |
| (neu) smithing-Attribut | **GEÄNDERT** | `smithing.trains = "str"` (Self-Crafter-Melee: L55 +92, L75 +128 kills/h ggü. ohne). |

---

## Was fehlt für 9,5?

1. **Magie-Parität bei L75 herstellen** (Kern): Roben-magicDamage teil-zurücknehmen (Set ~56→~68–72) **oder** Stab-aIMs leicht senken — Magie auf 0,9–1,0× ziehen, **ohne** in run4-Magie-Dominanz zurückzukippen. Zielband: alle 3 Stile ±10 % über L55/65/75.
2. **`runecrafting` ein `trains`-Attribut geben** (int/wis) — entfernt Magies gegenwertlose Pflicht-Craft-Steuer und schließt P1 teilweise gleich mit. Symmetrie zu leatherworking→dex / smithing→str.
3. **Bloodiron-Tier 1H-Magie-Wand** ergänzen → wand+focus-Pfad trägt bis L75 (Build-Flexibilität im Defizit-Fenster).
4. **`sorrow_wraith` xp trimmen** (680→~520) oder regen/enrage spendieren (run4-P3 endlich schließen).
5. **Suffix-Strom prüfen:** sicherstellen, dass L50–75-Mobs genug Equipment-Basen droppen, damit die 8 %-Suffix-Chance im Spät-Mid spürbar wird (sonst Drop-Suffix-Chance auf Gear leicht anheben).
6. **Carry-over (run4-P3):** 1–2 Nicht-Slayer-Combat-Mobs im Fenster L55–62 für mehr On-Level-Auswahl (nicht in diesem Run neu vermessen).

---

## Fazit
Run 5 ist ein **klarer Fortschritt** (6 → 7,5): die beiden run4-P1-Walls (Nahkampf-Boden, Ranged-Rüstungs-Wall) sind **echt geschlossen** — das ironhide-L60-Tier sitzt perfekt und die Stil-Kadenz ist jetzt durchgängig ~10-Level-getaktet. Combat bleibt bug- und todesfrei. Der Wermutstropfen ist eine **Über-Korrektur**: der Roben-Trim hat Magie vom Spitzen- zum Boden-Stil gemacht (L75 ~22 % hinten), und drei Magie-Nachteile stapeln sich (Roben-Offense ↓, `runecrafting` ohne Attribut, keine Top-Tier-1H-Wand). Ein **moderater** Magie-Re-Buff (Punkte 1–3) bringt alle drei Stile ins ±10 %-Band und hebt den Score zügig Richtung 8,5–9.
