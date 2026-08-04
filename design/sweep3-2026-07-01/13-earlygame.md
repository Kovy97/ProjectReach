# Sweep 3 — 13 Frühgame-Stil-Parität (L1–20, alle 3 Stile)

**Agent:** Kontrolleur (QA)
**Ziel:** Frühgame L1–20 alle 3 Stile via `SimPlayer`. Verifizieren: fühlt sich die Parität früh fair
an, hängt kein Stil hinterher, reicht Starter-Munition/Food, keine frühe Wall? **Zeit-bis-CL20 je Stil
messen.**

**Methode:** Headless via `SimPlayer` (echte Engine, seed 424242, `starterKit:true` = echter
Neuspieler mit Food + Auto-Eat Tier 0). Drei Messungen:
- **(A) Roh-DPS-Parität** an gematchten Checkpoints: gleiche Offense-Level, tier-gematchtes Gear
  (bronze L5 / iron L10 / steel L20), gleicher On-Level-Mob, 5 Sim-Min, effektiver DPS =
  `Mob-HP × Kills / s`.
- **(B) Zeit-bis-CL20** natürlich ab L1: Default-Stances (melee=attack, ranged=precise,
  magic=offensive), tier-gematchte Waffen, adaptive Mob-Leiter (chicken→…→goblin_crossbower),
  reichlich Food/Munition (Survival kein Flaschenhals).
- **(C) Starter-Munition/Food-Reichweite** mit dem **echten** Starter-Loadout (kein Gott-Modus).

**Alle Progressions-Läufe: 0 Tode.** (Skript nach dem Lauf gelöscht, wie in der Vorgabe.)

---

## Verdikt: DPS-Parität früh EXZELLENT — aber Magie erreicht CL20 ~2× langsamer (Formel-Artefakt)

Roh-Schaden ist über L1–20 **sehr eng** (Spread 8–11 %, kein Stil dominiert) — der Balance-Pass
wirkt auch früh. **Aber:** die **Zeit-bis-CL20** klafft massiv auseinander, nicht wegen Kampfkraft,
sondern wegen der `combatLevel`-Formel: Magie wird auf `(magic_off+magic_def)/2` gerechnet, während
`magic_def` im Frühgame **nie trainiert** (keine magisch angreifenden Mobs < L28). Magie killt
gleich schnell (sogar minimal schneller), braucht für dieselbe CL aber fast doppelt so viele
Offense-Level.

---

## (A) Roh-DPS-Parität — gematchte Checkpoints (5 Sim-Min, On-Level-Mob, Tier-Gear)

| Checkpoint | Stil | Kills | effDPS | maxHit | Interval | Acc | Waffe |
|---|---|---:|---:|---:|---:|---:|---|
| **Off L10 vs boar (L10, HP230)** | melee | 19 | **14.6** | 70 | 2840 ms | 129 | iron_sword |
| | ranged | 17 | 13.0 | 51 | 2712 ms | 128 | iron_shortbow/iron_arrow |
| | magic | 18 | 13.8 | 61 | 2900 ms | 105 | iron_staff |
| **Off L20 vs goblin_spearman (L20, HP258)** | melee | 22 | 18.9 | 101 | 2800 ms | 168 | steel_sword |
| | ranged | 24 | **20.6** | 80 | 2671 ms | 166 | steel_shortbow/steel_arrow |
| | magic | 22 | 18.9 | 98 | 2900 ms | 133 | steel_staff |

**Rest-Delta (best−worst)/best:** L10 = **11 %** (melee vorn), L20 = **8 %** (ranged vorn). Bei L10
führt Melee knapp, bei L20 dreht Ranged (Krit + Tempo) nach vorn, Magie liegt beide Male mittig.
**Kein Ausreißer, kein hängender Stil.** Die früher genannte Melee-Dominanz ist auch früh **weg**.
(Ranged/Magie-Waffenschaden-Anhebung + gematchte Bogen/Pfeil-Paare bestätigt.)

---

## (B) Zeit-bis-CL20 (natürliche Progression ab L1) — der Kernbefund

| Stil | CL5 | CL10 | CL15 | **CL20** | Final-Offense-Skills |
|---|---:|---:|---:|---:|---|
| **RANGED** | 5 m | 10 m | 15 m | **25 m** | ranged 29 |
| **MELEE** | 10 m | 15 m | 25 m | **35 m** | attack 28 / power 19 |
| **MAGIC** | 10 m | 15 m | 25 m | **55 m** | magic_off 35 / magic_def **1** |

Magie braucht **2,2× so lange wie Ranged** und **1,6× so lange wie Melee** — obwohl sein
**Kill-Durchsatz gleich hoch oder höher ist** (goblin_crossbower-Grind: magic **261 Kills/h** >
ranged 234 > melee 212). Das ist definitiv **kein** Power-Problem, sondern die CL-Formel.

**Ursache — `combatLevel()` (`packages/engine/src/dungeon.ts:17-25`):**
```
CL = round( 0.25·(defence+vitality) + 0.5·bestOffense )
  melee bestOffense = (attack+power)/2   → (28+19)/2 = 23.5   (beide offensiv trainiert, 55/45-Split)
  ranged bestOffense = ranged            → 29                 (ein Skill, 100 % der XP)
  magic  bestOffense = (magic_off+magic_def)/2 → (35+1)/2 = 18 (magic_def bleibt 1!)
```
`magic_def` trainiert nur beim **Einstecken magischen Schadens** (`combat.ts:116-121`) oder in
Defensiv-Stance. Alle Frühmobs (chicken/cow/boar/goblin_spearman …) schlagen **physisch** → sie
härten `defence`, nie `magic_def`. Der erste magische Angreifer ist goblin_stormcaller **L28**, weit
hinter CL20. Ein Offensiv-Magier hat also über das **gesamte** Frühgame `magic_def = 1`, wodurch
sein CL-Offense-Term dauerhaft **halbiert** ist. Deshalb muss `magic_off` bis ~35 klettern, wo
Ranged mit 29 und Melee mit 23,5 (Schnitt) schon CL20 hat.

---

## (C) Starter-Munition & Food — echtes Starter-Loadout

- **Köcher:** Start 150 crude_arrow + 50 Inventar-Reserve. Gegen Huhn (kontinuierlich):
  Köcher (150) **leer nach 7,5 min**, Total (200) **leer nach 10 min** — 2,4 Pfeile/Kill (Fehlschüsse
  verbrauchen mit). Danach zwingend nachfüllen: crude_arrow im Shop **1 g**, oder
  `fletch_crude_arrows` (15/Craft). → Refill trivial/billig, aber der **erste leere Köcher kommt
  schnell** (~7,5 min), was einen Neuling irritieren kann.
- **Food:** Gegen On-Level-Mobs (Huhn, dmg 1) wird das Starter-Food (20× cooked_shrimp) praktisch
  nicht angetastet → **ausreichend**. Es drainiert nur, wenn man **über Tier** kämpft (frischer L1
  vs Kuh L5: 20 Shrimp in 60 min aufgebraucht, 5 Tode) — das ist der **bekannt & akzeptierte**
  Undergeared-Worst-Case, kein Balance-Bug.

---

## Findings

**[P2][balance] Magie erreicht CL20 ~2× langsamer als Ranged trotz gleicher (leicht höherer) DPS — confirmed.**
- Repro: `SimPlayer`, je Stil ab L1 mit tier-gematchtem Gear + Default-Stance natürlich hochspielen bis `combatLevel()>=20`.
- Erwartet: bei gleicher Kampfleistung ähnliche Zeit-bis-CL20 über alle Stile (Parität-Ziel des Sweeps).
- Tatsächlich: Ranged 25 m, Melee 35 m, **Magie 55 m** — bei magic-Kill-Durchsatz ≥ den anderen (261 vs 234 vs 212 Kills/h).
- Evidence/Ursache: `combatLevel` rechnet `magicOffense = (magic_off+magic_def)/2` (`packages/engine/src/dungeon.ts:21`), aber `magic_def` wird nur durch **eingesteckten magischen** Schaden trainiert (`packages/engine/src/combat.ts:116-121`); Frühmobs sind alle physisch → `magic_def=1` das ganze Frühgame → magic-Offense-Term dauerhaft halbiert. Sichtbare Folge: gleicher XP-/Kill-Aufwand, aber niedrigere Combat-Level-Zahl → Magier warten länger auf CL-gegatete Dungeons (`canEnterDungeon`, dungeon.ts).
- **Empfehlung (Owner: Logic-Dev — Formel in dungeon.ts):** `magicOffense = lvl("magic_off")` (symmetrisch zu Ranged, das ebenfalls seinen einen Offensiv-Skill nimmt). Damit erreicht Magie CL20 bei magic_off ~29 → gleichauf mit Ranged/Melee, ohne den Roh-DPS anzufassen. **Alternative (Owner: Combat-Dev):** im Offensiv-Cast einen kleinen Anteil der Offense-XP an `magic_def` routen (analog zum Melee-55/45-Split) — trainiert `magic_def` mit, hebt aber auch magics `defense` leicht an (Nebeneffekt bedenken). Formel-Fix ist der saubere Weg.

**[P3][feel] Starter-Köcher (150) ist nach ~7,5 min leer — confirmed.**
- Erwartet: Starter-Munition trägt die erste Session, bevor der Spieler den Nachschub-Loop (kaufen/fletchen) kennt.
- Tatsächlich: 150 Pfeile → ~7,5 min, +50 Reserve → 10 min; danach Stopp (`stopReason:"outOfAmmo"`).
- Empfehlung (Owner: Logic-Dev — Startmenge in `packages/engine/src/state.ts:88`): entweder Köcher-Start auf **~300** anheben, ODER sicherstellen, dass der `outOfAmmo`-Hinweis im UI klar auf „Pfeile kaufen (1 g) / fletchen" zeigt (UI-Dev). Kein Muss — Refill ist trivial billig; rein Onboarding-Komfort.

**[P3][info] Magie-Accuracy skaliert nur über `magic_off` (kein Attribut-Bonus) — confirmed, früh unkritisch.**
- Acc magic 105/133 vs melee/ranged 128–129 / 166–168 (Test A), weil `accuracy = 50 + dex·3 + offenseSkill·2` und Magie kein `dex` trainiert. Gegen die niedrig-evasiven Frühmobs irrelevant (magic trifft 18–22 Kills/5min); nur als Notiz für später (hoch-evasive Mobs). Kein Handlungsbedarf früh.

**Kein P0/P1.** Keine echte Wall: alle drei Stile clearen mit passendem Gear boar L10 und
goblin_spearman L20 sauber; die alte boar-L10-Melee-Wall ist weg (melee trainiert `power` bis 19 via
55/45-Split, bestätigt).

---

## Ziel erreicht?

**Teilweise.** Die **DPS-/Kampf-Parität** L1–20 ist **erreicht** (8–11 % Spread, kein hängender Stil,
0 Tode, keine Wall). **Aber** die **Progressions-Parität auf der sichtbarsten Kennzahl (Combat Level)
ist gebrochen:** Magie braucht ~2× so lange bis CL20 wie Ranged — reines Formel-Artefakt, mit einer
Ein-Zeilen-Korrektur behebbar. Starter-Food reicht (on-level); Starter-Munition trägt ~10 min (billig
nachfüllbar).

## Top-3
1. **[P2] Magie-CL20-Lag:** 55 m vs 25 m (ranged) bei gleichem Kill-Durchsatz → `combatLevel`-Formel `(magic_off+magic_def)/2` mit dauer-untrainiertem `magic_def`. Fix: `magicOffense = magic_off` (dungeon.ts:21).
2. **[Positiv] Roh-DPS-Parität früh bestätigt:** melee/ranged/magic innerhalb 8–11 % bei L10 & L20; kein Stil dominiert, keine frühe Wall.
3. **[P3] Starter-Köcher leer nach 7,5 min:** auf ~300 anheben oder klaren Refill-Hint zeigen; Food ist on-level ausreichend.
