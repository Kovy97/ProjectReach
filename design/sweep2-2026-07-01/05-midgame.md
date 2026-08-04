# Sweep 2 — 05 Midgame-Progression L20–50 (Kontrolleur)

**Fokus:** Tier-Übergänge (Zonen/Metalle/Gear), Skilling-XP/h-Kurven, Kampf-Schwierigkeit vs. verfügbares
Gear, Ökonomie mittig, tote/übersprungene Inhalte. **Methode:** headless SimPlayer-Treiber
(`packages/engine/src/sim-player.ts`), echte Engine-Funktionen (createGame/equip/startCombat/advance),
deterministisch (seed 5). Temporäre Test-Skripte angelegt, ausgeführt, wieder gelöscht.

**Kern-Setup Kampf-Sim:** „on-level gearter" Held je Stil — alle 7 Kampf-Skills auf Monster-Level
gesetzt, Metall-Rüstung des passenden Tiers (Platte/Helm/Beine), Waffe + ggf. Munition des Tiers,
Tier-passende Nahrung. 3 Sim-Minuten Dauerkampf je Monster × Stil. Metall-Tier nach Level:
steel(20) · gravesteel(22) · blacksteel(30) · mithril(35/40) · adamantium(45/50).

---

## CONFIRMED

### [P2][balance] Drei-Stile-Parität im Midgame gebrochen: Nahkampf tötet 40–60 % schneller als Fern-/Magie
**Erwartet:** Kein Kampf-Dreieck, „Waffe bestimmt Stil", die drei Stile sollen im gleichen Content
vergleichbar performen (Design-Pfeiler „3 Stile, kein Dreieck").
**Tatsächlich:** Mit **on-level Tier-Gear** tötet Nahkampf durchgehend ~1.3–1.6× so schnell wie Fern-/
Magie — über ALLE 14 Welt-Mobs L20–51, mit 0 Toden in jedem Stil. Der Vorsprung überlebt die
Best-Waffen-Wahl je Stil (Waffen-Sweep). Gold/h skaliert 1:1 mit — Fern-/Magie-Spieler verdienen im
Midgame ~35–40 % weniger.

Kills / 3 min (Auszug, `midgame-combat.json`):
| Mob (Lv) | HP | melee | ranged | magic | melee-Vorsprung |
|---|---|---|---|---|---|
| goblin_spearman (20) | 258 | **16** | 11 | 11 | +45 % |
| goblin_warlock (30) | 524 | **11** | 7 | 8 | +38–57 % |
| ash_rat (30) | 281 | **20** | 13 | 14 | +43–54 % |
| pitch_beetle (42) | 672 | **11** | 8 | 8 | +38 % |
| rootling_gimp2 (51) | 725 | **13** | 9 | 9 | +44 % |

Gold/h Beispiel rootling_gimp2: melee **73 400** vs ranged 47 480 vs magic 49 200.

Best-Waffen-Sweep (bestes Ergebnis je Stil, 3 min):
- goblin_warlock L30: melee `blacksteel_maul`=**12** · ranged `blacksteel_longbow`=7 · magic `blacksteel_staff`=8
- rootling_gimp2 L51: melee `cinderfang_dagger`=**14** · ranged `adamantium_longbow`=9 · magic `adamantium_staff`=9

**Wahrscheinliche Ursache (für den zuständigen Dev):** die flachen Waffen-Schadensboni klaffen pro Tier
weit auseinander — z.B. steel: `steel_scimitar` meleeDamage **31** vs `steel_longbow` rangedDamage **10**
vs `steel_staff` magicDamage **14**; adamantium: **62 / 26 / 33**. Die Schadensformel
(`packages/engine/src/character.ts:238-240`) gleicht das nicht aus: Nahkampf
`(1 + str·1.5 + power·0.8 + eqMelee)·dmgMult` läuft schneller hoch als ranged `dex·1.2 + ranged + eqRanged`
bzw. magic `int·1.7 + magic_off·1.2 + eqMagic`, selbst mit Ranged-Krit/-Tempo (`character.ts:256-262`)
und Pfeil-`ammoDamage`. Im Midgame gibt es KEINE Regen-Welt-Mobs (alle regen=0 bei L20-51), daher greift
der Magie-DoT-Vorteil (`ranged-vs-magic.test.ts`) hier nicht — der Roh-DPS-Nachteil bleibt unkompensiert.
**Keine Guard-Test-Deckung:** `style-xp-parity.test.ts` pinnt nur XP-pro-Schaden (magic≈ranged),
`ranged-vs-magic.test.ts` nur die DoT-Profil-Differenz — beide vergleichen NICHT melee-DPS vs. den anderen.
**Owner:** Balance-Designer / Combat-Dev (Chef-Domäne — nur berichtet, nicht gefixt).

**Repro:** frischer SimPlayer je Stil → alle Kampf-Skills auf Mob-Level → Tier-Metallrüstung +
Tier-Waffe (+Pfeile) + Nahrung → `startCombat(mob)` → `fightFor(180000)`. Kills melee ≫ ranged/magic.

### [P3][balance] Fischen: XP/h-Kurve nicht monoton — `catch_duskfin_carp` (L45) schlechter als `catch_salmon` (L35)
**Erwartet:** Innerhalb einer Sammel-Hauptlinie steigt XP/h mit dem Level-Gate (neuer Fisch ≥ alter).
**Tatsächlich:** In der Fischen-Hauptlinie (ein Fisch pro Spot):
salmon L35 = **13 292 XP/h** → duskfin_carp L45 = **10 286 XP/h** (−23 %) → lobster L55 = 15 300 XP/h.
`catch_duskfin_carp` hat längere Dauer (7000 ms) UND weniger XP (20 statt salmon 24) → wer Fischen
trainiert, bleibt bei salmon bis lobster und überspringt duskfin komplett (totes XP-Content). duskfin ist
nur über Nahrung (heal 68 vs 55) / Verkaufswert (52 vs 40) minimal begründet, die XP-Kurve dippt aber real.
**Evidence:** `packages/content/src/index.ts` Aktion `catch_duskfin_carp` (dur 7000, xp 20) vs
`catch_salmon` (dur 6500, xp 24). **Owner:** Content-Dev / Balance.

---

## SUSPECTED

### [P3][balance] Einige Loot-Bögen verlangen Munition ein volles Tier über ihrem eigenen Level → unbrauchbar beim Fund
**Beobachtung:** mehrere gedroppte Midgame-Bögen fordern per `ammoType` Pfeile weit über ihrem
`ranged`-Gate:
- `stagstride_longbow` (ranged **24**, drop von wild_stag) → `ammoType: mithril_arrow` (Mithril =
  Smithing L40 / Mining L35)
- `spectral_hunter_bow` (ranged **28**, superRare) → `ammoType: mithril_arrow`
- `skytalon_recurve` (ranged **50**) → `ammoType: runite_arrow` (Runite = Smithing L55)
- (früh, minor: `farmhand_sling` ranged3 / `stolen_shortbow` ranged7 → `iron_arrow`)

Ein on-level Schütze, der z.B. stagstride mit L24 lootet, kann ihn NICHT mit tier-passenden Pfeilen
(steel_arrow @L20) füttern — er braucht L40-Munition. Die craftbaren Metall-Bögen sind sauber
(blacksteel_longbow→blacksteel_arrow). Wirkt wie „dead on arrival"-Gear bzw. bewusst aspirational —
kurz prüfen, ob gewollt. (Im Waffen-Sweep fielen diese Bögen mit 0 Kills auf, weil der Test
tier-Pfeile statt der geforderten gab — das war ein Test-Artefakt, deckt aber die reale ammoType-
Anforderung auf.) **Evidence:** `equipment`-Dump ammoType; `packages/content/src/index.ts`
`spectral_hunter_bow` (Zeile ~4610). **Owner:** Content-Dev.

### [P3][feel] Midgame-Kampf ist bei on-level Gear sehr sicher (0 Tode überall) — wenig Spannung
**Beobachtung:** In JEDEM der 14 L20–51-Kämpfe × 3 Stile = 0 Tode, auch am Zonen-Boss `ash_tyrant`
(L45, 1357 HP). Keine Auto-Eat-Belastung, kein Risiko. Das ist einerseits gut (keine Wände), andererseits
könnte dem Midgame Tension fehlen (Auto-Battle „läuft von selbst"). Reiner Feel-Hinweis, Chef-Balance-Domäne.

---

## VALIDIERT / SAUBER (kein Bug — bestätigt, dass der Fix-Pass wirkt)

- **Kampf-Schwierigkeit vs. Gear:** alle Welt-Mobs L20–51 mit on-level craftbarem Tier-Gear besiegbar,
  0 Tode, keine Progressions-Wall. Keine „zu tanky"-Wall im Midgame-Welt-Content mehr sichtbar.
- **Tier-Übergänge glatt:** Metalle steel(20) → gravesteel(22) → blacksteel(30) → mithril(35) →
  adamantium(45) dicht gestaffelt; Zonen borderlands(15–30) → ashfields(30–45) → blackthorn(45–65) ohne
  Level-Lücke im 20–51-Fenster.
- **Zugangs-Parität der Stile intakt:** alle 3 Stile haben craftbare Waffen an JEDEM Midgame-Tier
  (20/30/40/50) — melee via smithing, ranged via fletching, magic via runecrafting; gleiche Level-Gates.
  (Nur der DPS-OUTPUT klafft — s. P2 — die Verfügbarkeit ist paritätisch.)
- **Skilling-XP/h ansonsten monoton:** woodcutting sauber steigend; mining/foraging/thieving „Dips" sind
  Parallel-/Verarbeitungs-Linien (Edelstein-Adern, Diebesgut→Gold-Umwandlung), keine echte Hauptlinien-
  Inversion. Keine Aktion mit 0 XP/h.
- **Ökonomie mittig:** Midgame-Kampf-Gold ~27–73 k/h; Shop verkauft nur Früh-Gear + Tools/Saat
  (steel_pickaxe 850 … runite 4500), Midgame-Kampf-Gear wird gecraftet/gelootet (RuneScape-Stil, gewollt).
  Gold ist nicht knapp — eher großzügig, aber das deckt sich mit der bereits akzeptierten
  Endgame-Gold-Inflation; kein neuer Midgame-Ökonomie-Blocker.

---

## Kurz-Zusammenfassung

**Findings je Severity:** P0: 0 · P1: 0 · P2: 1 · P3: 3 (2 confirmed, 2 suspected).

**Top-3:**
1. **[P2 confirmed] Stil-Parität gebrochen (Midgame):** Nahkampf tötet & verdient ~40–60 % mehr als
   Fern-/Magie über den gesamten L20–50-Welt-Content, 0 Tode, auch mit bester Waffe je Stil. Keine
   Guard-Test-Deckung. Verdächtige Ursache: klaffende flache Waffen-Schadensboni je Tier + Melee-Formel.
2. **[P3 confirmed] Fischen-XP/h-Dip:** `catch_duskfin_carp` (L45) < `catch_salmon` (L35) → totes
   XP-Content, wird beim Trainieren übersprungen.
3. **[P3 suspected] Loot-Bögen mit Über-Tier-Munition:** stagstride/spectral/skytalon fordern Pfeile
   ein volles Tier über ihrem `ranged`-Gate → beim Fund nicht befeuerbar.

**Gesamt-Einschätzung Midgame:** Progression, Tier-Staffelung, Gear-Verfügbarkeit und Kampf-
Schwierigkeit sind **solide und wandfrei** (Fix-Pass wirkt). Der eine gewichtige Punkt ist die
**Stil-Parität** — sie untergräbt den „drei gleichwertige Stile"-Pfeiler und trifft jeden Fern-/Magie-
Spieler im gesamten Midgame. Empfehlung: Balance-Pass auf ranged/magic Waffen-Schaden (oder eine
Stil-Ausgleichs-Konstante) — Chef-Entscheidung.
