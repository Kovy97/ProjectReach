# Sweep 2 — 08 Drop-Table-Kohärenz aller Monster

**QA:** Kontrolleur · **Datum:** 2026-07-01 · **Fokus:** Sind Loot-Tiers durchgängig monster-level-passend
(Pfeile, Erze, Barren, Materialien, Gear)? Weitere „falsches Tier auf falschem Level"-Fälle? Chancen/Mengen plausibel?

**Methode:** Temp-Vitest über `content` (92 Monster, alle `loot`-Zeilen) → je Item die Tier-Quelle abgeleitet
(Equipment = `requirements`-Skill; Munition + Roh-Materialien = `levelRequired` der erzeugenden Action) und gegen
Monster-Level abgeglichen. Temp-Skript wieder gelöscht. `content-refs` + `content-integrity` laufen grün → **kein
loose/dangling Loot-Ref** (0 fehlende Item-IDs in allen Drop-Tables).

---

## Kernbefund (Root Cause): zwei kollidierende Skalen

`design/zone-drops-plan.md` (Balance-Spec, „Owner-Apply: content-dev") ist die Quelle der ganzen Gear-Loot-Matrix.
Die **Equip-Reqs und Dropchancen im Content stimmen exakt mit dem Plan überein** — aber die **Monster-LEVEL im
Content sind gegenüber dem Plan massiv nach oben skaliert** (Faktor ~2–6× im High-End), während Gear-Req und
Material-Tiers auf der Skill-/Plan-Skala (1–99) blieben. Beleg (Plan-Level → Content-Level, identische Mobs):

| Mob | Plan-Level (zone-drops-plan.md) | Content-Level | Gedroptes Gear-Req (an Plan kalibriert) |
|---|---|---|---|
| chicken | 1 | 1 | – |
| cow | 3 | **5** | pitchfork_spear req attack 3 |
| goblin | 1 | **15** | goblin_shank req attack 2 |
| ash_tyrant | 20 | **45** | ashplate_cuirass req defence 18 |
| skeleton_warrior | 16 | **65** | boneblade req attack 16 |
| forest_hare | 12 | **90** | hunting_knife req attack 12 |
| wild_stag | 26 | **104** | antler_warbow req ranged 18 |
| mud_crab | 8 | **120** | coral_shiv req attack 8 |
| roc | 35 | **200** | talon_dagger req attack 35 |
| roc_void | 84 | **233** | aetherscale_cuirass req defence 75 |

Zusatz-Kontext: Der Spieler-`combatLevel` **cappt bei 99** (`packages/engine/src/dungeon.ts:17-25`, maxed =
0.25·(99+99)+0.5·99 = 99). Monster gehen bis 233. Monster-Level ist also KEINE Größe, die mit der Skill-/Gear-Skala
(1–99) auf einer Achse liegt — die früheren „Pfeil auf Lv1"-Fixes und die Level-Inflation (XP-Lücken-Brücken) haben
die beiden Skalen aber unterschiedlich behandelt, und **genau daraus entstehen die neuen Fehlpaarungen.**

> Ob die Lösung „Monster-Level runter Richtung Plan" oder „Gear-Reqs/Arrows rauf" ist, ist **Chef-/Balance-Domäne**.
> Ich melde die konkrete, aus dieser Divergenz resultierende **Inkohärenz** — nicht die Balance-Zahl selbst.

---

## Findings

### [P2][bug] Pfeil-Drop-Tier passt nicht zum Bogen-Tier desselben Monsters (Fortsetzung des Pfeil-Bugs) — CONFIRMED
Die frühere Korrektur hat die **Pfeil-Drops ans (inflationierte) Monster-Level** gekoppelt; die **Bögen** (und deren
`ammoType`) blieben auf der Skill-/Plan-Skala. Wo beide Skalen zufällig zusammenfallen (Grenzlande/Aschfelder/Turm),
passt es. In den hoch-skalierten Zonen (Küste/Wildwald/Hochland/Schlackengrube) droppt **dasselbe Monster einen Bogen
für Ranged X und Pfeile eines viel höheren Ranged-Tiers** — der Spieler auf dem passenden Ranged-Niveau kann die Pfeile
mit keinem tragbaren Bogen abfeuern (Bogen verlangt exakt seinen `ammoType`, `combat.ts:767-773`). Das ist funktional
die gleiche „dead loot"-Konsequenz wie der Ur-Bug „iron_arrow auf Lv1".

Pfeil-Leiter (Pfeil → Ranged-Req via Bogen): copper r1 · bronze r5 · iron r10 · steel r20 · blacksteel r30 · mithril r40 ·
adamantium r50 · runite r60 · bloodiron r70 · titanium r80 · aetherium r90 · godiron r99.

| Monster | Lvl · Zone | Gedroppter Bogen → dessen Pfeil (Ranged-Req) | Gedroppter PFEIL (Tier) | Δ |
|---|---|---|---|---|
| chicken | 1 · pastures | farmhand_sling → **iron_arrow** (r3) | **copper_arrow** (r1) | Pfeil zu NIEDRIG — Sling feuert kein Kupfer |
| goblin_archer | 22 · borderlands | stolen_shortbow → iron_arrow (r7) | iron_arrow (r10) | **MATCH ✓** |
| gaze_basilisk | 22 · slayer_tower | mirrorglass_bow → steel_arrow (r28) | steel_arrow (r20) | **MATCH ✓** |
| dust_vulture | 34 · ashfields | ashwood_longbow → steel_arrow (r14) | steel_arrow | **MATCH ✓** |
| ash_tyrant | 45 · ashfields | ashfall_recurve → steel_arrow (r18) | mithril_arrow (r40) | +2 Tiers zu HOCH |
| spectral_stag | 58 · blackthorn | spectral_hunter_bow → mithril_arrow (r28) | adamantium_arrow (r50) | +1–2 zu HOCH |
| forest_warden | 65 · blackthorn | mithril_longbow → mithril_arrow (r40) | runite_arrow (r60) | +2 zu HOCH |
| skeleton_archer | 68 · crypt | skeletal_longbow → steel_arrow (r18) | runite_arrow (r60) | +3–4 zu HOCH |
| wild_stag | 104 · wildwood | antler_warbow → steel (r18) / stagstride → mithril (r24) | aetherium_arrow (r90) | +5–6 zu HOCH |
| **mud_crab** | **120 · coast** | driftwood_bow → **iron_arrow** (r10) | **godiron_arrow** (r99, BiS) | **+9 Tiers** — Smoking Gun |
| frost_hound | 182 · slagpit | frostcaverns_bow → runite_arrow (r62) | godiron_arrow (r99) | +2 zu HOCH |
| roc_hunter | 208 · highlands | skytalon_recurve → runite_arrow (r50) | godiron_arrow (r99) | +2 zu HOCH |

**Evidence (mud_crab):** `packages/content/src/index.ts:10224-10232` — Level 120, dropt `driftwood_bow`
(`index.ts:4769` → `ammoType: "iron_arrow"`, req ranged 10) UND `godiron_arrow` (chance 0.15, qty 10–20). Neun Tiers
Abstand: die Endgame-Munition (Ranged-99) fällt aus einer der einfachsten Küsten-Krabben (hp 520).
**Erwartet:** Pro Monster den Pfeil droppen, der zum `ammoType` seines gedroppten Bogens / zum Ranged-Niveau der Zone
passt (skeleton_archer → steel; wild_stag → steel/mithril; mud_crab → iron; roc_hunter → runite). **Owner: Content-Dev**
(intendiertes Pfeil-Tier je Zone ggf. mit Balance-Designer bestätigen).

Der **chicken-Fall** ist die *umgekehrte* Fehlpaarung, die der Fix selbst erzeugt hat: `farmhand_sling` (chicken-Drop)
verlangt `iron_arrow`, das Monster dropt aber `copper_arrow` → Starter-Loop „Bogen + Pfeile vom selben Mob" ist
gebrochen. Kohärent wäre: entweder `farmhand_sling.ammoType` auf `copper_arrow`, oder chicken dropt (wenige) iron_arrow.

### [P2][balance] godiron_arrow (Ranged-99-Endgame-Munition) fällt aus mittelschweren Bestien über eine riesige Level-Spanne — CONFIRMED
`godiron_arrow` (Top-Pfeil, ammoDamage 38, req-99-Bögen) dropt bei **mud_crab L120 (hp 520, leicht)**,
`abyssal_tide_serpent` L155, `frost_hound` L182, `roc_hunter` L208 — je chance 0.15, qty 10–20. Die leichteste dieser
Quellen (mud_crab) liefert BiS-Munition. Das entwertet die Ranged-Munitions-Progression (Fletching/Kauf) für Ranged
lange vor Ranged 99. Enger Verwandter von Finding 1; **Chef-Balance-Domäne**, aber als Kohärenz gemeldet.

### [P3][balance] Systemische „Gear/Material weit unter Monster-Level" — Folge der Skalen-Divergenz — CONFIRMED (Ursache), Intent SUSPECTED
Direkte Folge des Kernbefunds: 100+ Loot-Zeilen droppen Gear, dessen Req nur ein Bruchteil des angezeigten
Monster-Levels ist. Beispiele:
- `roc` L200 → `talon_dagger` req attack **35** (`index.ts:10139`).
- `forest_hare` L90 → `hunting_knife` req attack **12** (`index.ts:10280`).
- `skeleton_warrior` L65 → `boneblade` req attack **16**, `iron_sword` req attack 10.
- `mud_crab` L120 → `crabshell_bulwark` req defence **8**.

Für den Spieler sichtbar inkohärent („Level-200-Monster dropt Attack-35-Waffe"). **Wahrscheinlich Nebeneffekt der
bewussten Level-Inflation** (XP-Lücken-Brücken), bei der die Loot-Spec nicht neu abgeleitet wurde → **Chef-Balance-Domäne**.
Kein Funktions-Bug (Items sind nutzbar, nur „zu schwach fürs Level-Label").

### [P3][balance] Tiered Roh-Materialien (Erze/Barren/Runen) weit unter Monster-Level — CONFIRMED, low value
Gleiche Wurzel, aber Neben-Loot niedrigen Werts:
- `iron_ore` (mine L10) bei `goblin_crossbower` L24, `pitch_beetle` L42, `skeleton_warrior` L65.
- `steel_bar` (smelt L20) bei `iron_revenant` L175.
- `frost_rune` (craft L10) bei `iron_revenant` L175.
- `mithril_ore` (mine L35) bei `slag_kobold` L162.

Nur Vendor-/Byproduct-Trash, kein Progressions-Schaden. Positiv: das **obere** Ende ist kohärent — `godiron_ore`/
`godiron_bar` (mine/smelt L95) fallen nur aus L195–200-Mobs (voidhusk_crusher, charred_doomknight); `aether_essence`
(L85–95) nur aus L90+-Mobs. **Kein Fall „hohes Material auf niedrigem Mob"** (die gefährliche Pfeil-Richtung) bei
Erzen/Barren gefunden — L1–45-Mobs droppen ausschließlich T1–T20-Materialien.

---

## Was VERIFIZIERT wurde (Fixes wirken)

- **Pfeil-Fix am unteren Ende wirkt:** chicken → `copper_arrow` 3–8 (`index.ts:10230`-Analog), kein `iron_arrow` auf Lv1.
  Grenzlande/Aschfelder/Turm-Bogenmobs (goblin_archer, gaze_basilisk, dust_vulture) droppen den zum Bogen passenden
  Pfeil (iron/steel) — kohärent. Die Fehlpaarung tritt erst in den hoch-inflationierten Zonen auf (Finding 1).
- **Keine dangling/loose Loot-Refs:** alle 92 Monster-Loot-Tables referenzieren existierende Item-IDs
  (`content-refs` + `content-integrity` grün, 0 MISSING im Audit-Dump).
- **Drop-Chancen intern konsistent** mit dem 12-h-Modell aus zone-drops-plan.md §0.1/§14: common/rare-Gear ~0.0019–0.0046,
  superRare/epic ~0.0003–0.0013, legendary/godly ~0.00014–0.00003. Keine Ausreißer-Chance gefunden. (Caveat: die Chancen
  wurden auf die **Plan**-killSek kalibriert; durch die Level-Inflation weichen die realen Kills/12h ab — reine
  Balance-Nuance, Chef-Domäne.)
- **Mengen plausibel:** Pfeil-Stacks 10–40 (schneller Verbrauch), Roh-Mats 1–3, Keys 1. Keine unplausiblen Mengen.

---

## Kurz-Zusammenfassung

**Findings je Severity:** P0: 0 · P1: 0 · P2: 2 · P3: 2 · (0 dangling refs, Chancen/Mengen ok).

**Top 3:**
1. **[P2] Pfeil-Drop-Tier ≠ Bogen-Tier desselben Monsters** (Fortsetzung des Pfeil-Bugs): in Küste/Wildwald/Hochland/
   Schlackengrube dropt der Mob Pfeile 2–9 Tiers über dem Bogen, den er selbst dropt (mud_crab L120: driftwood_bow=iron
   vs. godiron_arrow = +9). Dead loot für den passenden Spieler. **Owner: Content-Dev.** Smoking Gun: `index.ts:10224-10232`.
2. **[P2] godiron_arrow (BiS-Ranged-Munition) fällt schon aus leichten L120-Krabben** — entwertet die Munitions-Progression.
   **Chef-Balance**, als Kohärenz gemeldet.
3. **[P3] Root Cause: Monster-Level (bis 233) und Gear/Material-Tier (Skill-Skala 1–99, an zone-drops-plan.md kalibriert)
   sind zwei kollidierende Skalen** — Level wurde inflationiert, Loot-Spec nicht neu abgeleitet. Erklärt ~alle
   „Gear/Material weit unter Level"-Fälle. **Chef-Entscheidung:** Level runter ODER Reqs/Arrows rauf.

**Empfehlung:** fix-then-ship für Finding 1 (Content-Dev: Pfeil-Drop je Monster an den `ammoType` seines Bogens/an das
Zonen-Ranged-Niveau binden, inkl. chicken-Reverse-Case). Findings 2–4 zur Chef-/Balance-Entscheidung vorlegen; sie
blocken den Release nicht (Items nutzbar, keine Crashes/Dead-Refs).
