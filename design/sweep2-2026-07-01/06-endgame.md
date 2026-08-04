# Sweep 2 — 06 Endgame L50–99 (Kontrolleur)

**Fokus:** Höchste Zonen/Bosse besiegbar (0 echte Walls?), Endgame-Gear-Chase (legendary/godly je Stil
erreichbar?), Gold/h-Inflation (nur berichten — Chef-Domäne), Grind-bis-Max-Gefühl.
**Methode:** headless SimPlayer-Treiber (`packages/engine/src/sim-player.ts`), echte Engine-Funktionen
(createGame/equip/startCombat/advance/startDungeon), deterministisch (seed 99/7). Temporäre Test-Skripte
angelegt, ausgeführt, wieder gelöscht.

**Kern-Setup:** Zwei voll-gemaxte Helden-Sätze je Stil (melee/ranged/magic), alle 8 Kampf-Skills @99:
- **BiS-godly** — idolhall-Drops: Waffe last_judgement/last_vengeance/last_condemnation, Rüstung
  idol_crown/idol_shroud/aetherweave_leggings/voidtouched_gauntlets/idolstep_sabatons/eye_of_the_idol/
  last_idol_mantle/doomforged_band.
- **Epic-attainable** — VOR-idolhall craftbar: godiron-Set (Schmieden) + void_titan_mantle.
- ambergrain_feast (Heal 265, Buff), AutoEat-Stufe 3, Slayer-Anforderungs-Items im Inventar.
Kampf-Fenster 10 Sim-Min je Boss × Stil × Gear. Zusätzlich voller `idol_sanctum`-Dungeon-Run je Loadout.

---

## CONFIRMED — Endgame ist durchspielbar, keine Walls (Fix-Pass bestätigt)

### [KEIN BUG / POSITIV] 0 echte Walls: jeder Endgame-Boss L120–295 fällt in allen 3 Stilen
**Erwartet:** Ein Kampf-Niveau-99-Held mit Endgame-Gear besiegt die höchsten Zonen/Bosse ohne harte Sperre.
**Tatsächlich:** Bestätigt. **Kein einziger `kills=0`-Wall** über alle getesteten Bosse, Stile und beide
Gear-Sätze — 0 Tode. Selbst der **realistisch craftbare Epic/godiron-Held** (ohne idolhall-Drops) räumt
alles ab. Auszug Time-to-Kill (Sekunden/Kill) & Kills/10 Min:

| Boss (Lv) | HP | BiS melee | BiS ranged | BiS magic | Epic melee | Epic ranged | Epic magic |
|---|---|---|---|---|---|---|---|
| last_idol (295) | 2000 | 6 s (102) | 5 s (111) | 5 s (123) | 9 s (66) | 12 s (51) | 10 s (60) |
| scale_skarn (275) | 1550 | 3 s (181) | 4 s (147) | 4 s (157) | 6 s (98) | 7 s (81) | 7 s (83) |
| aether_wraith (260) | 1250 | 3 s (173) | 3 s (174) | 3 s (191) | 5 s (133) | 6 s (98) | 6 s (104) |
| void_titan (242) | 3580 | 14 s (42) | 14 s (44) | 11 s (56) | 24 s (25) | 30 s (20) | 27 s (22) |
| roc_void (233) | 2880 | 9 s (65) | 8 s (71) | 7 s (84) | 15 s (40) | 18 s (34) | 16 s (37) |
| charred_doomknight (200) | 2680 | 9 s (68) | 8 s (73) | 7 s (82) | 13 s (46) | 18 s (33) | 16 s (37) |

`idol_sanctum`-Vollclear (4-Wellen-Gauntlet idol_warden→last_idol) **von allen 6 Loadouts** geschafft,
0 Tode, **HP fällt nie unter ~97 %** (BiS-melee minHp 2543/2574; Epic-ranged 2514/2585). Combat-Niveau
eines single-style-gemaxten Helden = exakt **99** → `idol_sanctum` (Gate 99) betretbar.

### [POSITIV] Drei-Stile-Parität im Endgame eng — Midgame-Melee-Vorsprung verschwindet
**Erwartet:** „3 Stile, kein Dreieck" — vergleichbare Performance im gleichen Content.
**Tatsächlich:** Am Endgame konvergieren die Stile und **kippen sogar leicht zu Magie/Fernkampf**.
`last_idol` TTK BiS: melee 6 s · ranged 5 s · magic 5 s. Der im Midgame-Report (05) dokumentierte
Melee-Vorsprung (+30–60 %) **überlebt nicht bis L99** — hier ist Melee der langsamste (aber tankigste)
Killer. Gute Nachricht für die Parität; als Kontrast-Datenpunkt für Chef notiert.

### [POSITIV] Gear-Chase je Stil erreichbar — Endgame ohne eigene Drops clearbar
- **Godly Stil-Waffe je Stil vorhanden & fair droppbar:** last_judgement (melee, 0.8 %), last_vengeance
  (ranged, 0.9 %), last_condemnation (magic, 0.9 %) — alle von last_idol. ~100–150-Kill-Grind je Stil,
  kein Stil ausgesperrt.
- **Kein Chicken-and-Egg-Wall:** Der Epic/godiron-Held (craftbar via Schmieden, VOR idolhall) cleart
  `idol_sanctum` und farmt last_idol mit 0 Toden. Man braucht die idolhall-Drops NICHT, um an sie
  heranzukommen.

---

## BALANCE / FEEL — nur berichten (Chef-Domäne)

### [P3][feel] Schwierigkeitskurve nicht-monoton — die FINALE Zone ist die leichteste
**Beobachtung:** Die idolhall-Bosse (L245–295) sind **Glass-Cannons** mit niedriger Defense/EHP
(idol_warden def 36 / hp 1100; last_idol def 64 / hp 2000) und sterben in 3–6 s. Die davor liegenden
Zonen sind deutlich zäher: **highlands void_titan** (L242, def 168, hp 3580) = 14 s, **slagpit
charred_doomknight** (L200, def 135, hp 2680) = 9 s. Der intendierte Höhepunkt (idol_sanctum/last_idol)
ist per-Kill **klar leichter** als die Zonen davor, und der Final-Dungeon bedroht den Helden nie (min HP
~97 %). Peak-Schwierigkeit liegt im Mid-Endgame (highlands/slagpit), dann fällt sie zum Finale ab.
**Repro:** BiS-Held, je 10 Min last_idol (6 s TTK, 0 Tode) vs. void_titan (14 s TTK, 0 Tode).
Für Chef: ggf. last_idol/idolhall Defense+HP anheben, damit das Finale sich wie ein Finale anfühlt.

### [P3][balance] Endgame-Gold/h-Inflation (laut Briefing bereits Chef-akzeptiert — nur Magnitude)
idolhall-Farm liefert **1.2–2.0 Mio Gold/h** (scale_skarn ~2.04 Mio/h BiS-melee; last_idol ~1.53–1.85
Mio/h) vs. wildwood forest_bear ~0.26 Mio/h. Zusätzlich geben **triviale Low-Level-Slayer-Tower-Floor-5-
Mobs** (soul_flayer L86, void_herald L90) einem gemaxten Helden ~0.48 Mio Gold/h bei 2–3 s TTK. Reiner
Bericht — keine Aktion meinerseits.

### [P3][feel] Endgame-XP-Feuerwehrschlauch
last_idol gibt **58 000 XP/Kill** × ~600–740 Kills/h ≈ **35–43 Mio Kampf-XP/h**; ein 1→99-Skill kostet
~13 Mio XP. Sobald idolhall farmbar ist, maxen die restlichen Kampf-Skills in Minuten. Reiner Bericht.

### [P3][balance · suspected] True-BiS-Slotteile (Helm/Offhand/Ringe) sind ein extremer Chase
Die idolhall-„Signature"-Drops sind **nur-Drop (kein Rezept)** und sitzen am absoluten Boden der ohnehin
seltenen Signature-Stufe:
- `idol_aegis` (godly Offhand) **0.0031 %** · `idol_crown` (leg. Helm) **0.0074 %** · `idolbound_signet`
  (leg. Ring) **0.0079 %** · `doomforged_band` (leg. Ring) **0.014 %**.
Zum Vergleich: die restlichen Signature-Drops im ganzen Spiel liegen konsistent bei **0.03–0.09 %**
(alle mit `suffixChance:0.30`), die godly Stil-Waffen bei ~0.9 %. Die idolhall-Slotteile sind also
**~5–10× seltener als die sonst überall gleiche Signature-Stufe**. Bei ~600–740 last_idol-Kills/h ist
idol_aegis erwartungswert ~32 000 Kills ≈ **45+ h auf EINEM Boss** für ein Teil.
**Einschätzung:** Passt ins bewusste Signature-Muster (kein Daten-Bug), aber extrem am unteren Rand →
für Chef zur bewussten Entscheidung markiert. Die **Stil-Waffen sind fair** (~0.9 %); die Parität-relevante
Aussage „legendary/godly je Stil erreichbar" ist damit **erfüllt**.

---

## AUSGESCHLOSSEN — Test-Artefakte, NICHT als Bug melden

Beim ersten Durchlauf zwei Auffälligkeiten gesehen, beide als **Harness-Artefakte** verifiziert (kein
Spiel-Bug):

1. **„3 Slayer-Tower-Floor-5-Mobs startCombat BLOCKED"** (abyssal_devourer/void_herald/soul_flayer) —
   Ursache: mein Setup gab einen 20 000er-Food-Stack (MAX_STACK=999) → 20 Slots → **Inventar voll**,
   bevor die Slayer-Anforderungs-Items (void_anchor/soul_veil) gelegt wurden. Nach Fix (Slayer-Items
   zuerst) alle drei kämpfbar & 0 Tode. Items existieren, `canFightMonster` korrekt.
2. **„BiS-ranged vs soul_flayer 25 Kills / 111 Tode"** — Ursache: der ausgerüstete Köcher-Stack lief am
   14. Sequenz-Boss leer; `endCombatOutOfAmmo` beendet den Kampf (monsterId=null), was mein `fightFor`
   als „Tod" zählt. Frischer soul_flayer-Kampf = **0 Tode**. Der Out-of-Ammo-Stopp ist **intendiertes,
   dokumentiertes Design** (combat.ts:849 — kein lautloser Weiterkampf).

---

## SIM-TOOLING-HINWEIS (QA-intern, kein Spiel-Bug)

`SimPlayer.fightFor` (sim-player.ts:167) zählt **jedes** `combat.monsterId === null` als Tod (`deaths++`)
und respawnt — ohne `combat.stopReason` zu prüfen. Ein **Out-of-Ammo-Stopp** (`stopReason="outOfAmmo"`,
combat.ts:835) wird damit fälschlich als Tod verbucht. Für andere Sweeps relevant: eine Ranged-Persona,
der die Munition ausgeht, könnte einen **falschen „Wall"/Tod-Befund** produzieren. Empfehlung an die
zuständige Person (Logic-Dev/QA-Tooling): in `fightFor` `stopReason` unterscheiden. Niedrige Prio, betrifft
nur das Sim-Harness.

---

## Zusammenfassung

**Findings je Severity:** P0/P1/P2 = **0** · P3 = **4** (alle Chef-Balance-Domäne, nur Bericht) ·
1 Sim-Tooling-Hinweis. **Keine confirmed Bugs im Endgame-Kampf/Progression.**

**Top-3:**
1. **Endgame ist sauber durchspielbar** — 0 Walls L120–295, alle 3 Stile, BiS *und* craftbares
   Epic-Gear, idol_sanctum-Vollclear 0 Tode. Die gefixte Endgame-Gefahr (Mitigation-/Lifesteal-Deckel)
   hält: der Held nimmt Schaden, stirbt aber bei korrektem Food/Gear nicht. **Ship-tauglich.**
2. **[P3 feel] Nicht-monotone Schwierigkeit** — die finale Zone (idolhall) ist leichter als
   highlands/slagpit davor; der Höhepunkt fühlt sich nicht wie einer an (min HP ~97 % im Final-Dungeon).
   Chef: idolhall/last_idol Defense+HP erwägen.
3. **[P3 balance] True-BiS-Slotteile 5–10× seltener als der Rest der Signature-Stufe** (idol_aegis
   0.0031 %, ~45+ h/Boss). Stil-Waffen selbst sind fair erreichbar → Gear-Chase-Ziel „je Stil erreichbar"
   erfüllt; nur die tri-stat-Accessoires sind ein extremer Grind.

**Empfehlung:** **Ship** für Endgame-Spielbarkeit. Die 4 P3-Punkte sind reine Chef-Balance-Tuning-Fragen
(Finale-Schwierigkeit, Gold/XP-Inflation, BiS-Accessoire-Droprate), kein Release-Blocker.
