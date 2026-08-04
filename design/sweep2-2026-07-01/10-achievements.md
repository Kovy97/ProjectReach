# Sweep 2 — 10 · Achievements-Erreichbarkeit (alle 540)

**Fokus:** Sind ALLE Achievements erreichbar (count ≤ tatsächliches Maximum je Condition-Typ)?
Tote Targets? Korrekte Zähler? Deutsche Umlaute? — **Methodik:** Laufzeit-Audit über das echte
`content`-Objekt (temporäres Vitest-Skript, angelegt+gelöscht) + Engine-Wiring-Prüfung + Repro.

## Ergebnis auf einen Blick
- Achievements gesamt: **540** · Content: 21 Skills · 88 Quests · 21 Pets · 30 Sets · 92 Monster · 1011 Items · 6 Dungeons.
- **539 von 540 erreichbar.** Genau **1 confirmed UNERREICHBAR:** `ach_pets_all` (blockiert durch das
  Farming-Pet `witherling`, das im Engine-Wiring keinen Drop-Pfad hat).
- Gerade gefixte Punkte **verifiziert wirksam:** `ach_quests_100→75` jetzt erreichbar (75 ≤ 88);
  deutscher Achievement-Block hat echte Umlaute (0 Mojibake).
- Alle 14 Condition-Zähler-Mappings in `achievements.ts` korrekt. Keine toten Targets, keine
  doppelten IDs, keine Orphan-Monster.

## Zähler je Typ (max threshold vs. tatsächliches Maximum)
| Typ | #Achs | max count | tatsächl. Max | ok? |
|---|---|---|---|---|
| skill_level | 200 | 99 | 99 (Cap) | ✅ |
| total_level | 9 | 2079 | 21×99 = 2079 | ✅ |
| monster_kills | 268 | 1000 | ∞ (grind), 92 Targets alle valide+reachable | ✅ |
| dungeons_cleared | 21 | 100 | ∞ (grind), 6 Dungeons | ✅ |
| quests_completed | 4 | 75 | 88 distinkte Quests | ✅ |
| pets_owned | 3 | 21 | **20 droppbar** (witherling ✗) | ❌ 21 |
| sets_completed | 4 | 29 | 30 Sets, alle Teile obtainbar | ✅ |
| items_discovered | 4 | 200 | 995 obtainbar (1011 total) | ✅ |
| items_crafted | 4 | 10000 | 4 Targets alle craftbar | ✅ |
| total_kills / items_gathered / gold_reached / gold_spent | 19 | – | reine Grind-Zähler | ✅ |
| daily_streak | 4 | 100 | 100 echte Tage in Folge (Design) | ✅* |

## Findings

### [P1][bug] `ach_pets_all` unerreichbar — Farming-Pet `witherling` hat keinen Drop-Pfad — **CONFIRMED**
**Owner: Logic-Dev** (Engine-Systeme: Pets/Farming-Wiring).

Das Pet `witherling` ist definiert mit `source: { kind: "skill", skill: "farming" }`
(`packages/content/src/index.ts:13389`, dropChance 1/105000). Der Skill-Pet-Drop-Wurf
`tryPetDrop(state, content, { kind: "skill", skill: action.skill })` wird aber **nur im
Aktions-Abschluss-Pfad** gefeuert (`packages/engine/src/tick.ts:193`). **Farming hat keine
`ActionDef`** — es läuft komplett über das Plot/Crop-System (`farming.ts` `grantHarvest`/
`tickFarmPlots`), und dieser Pfad ruft `tryPetDrop` **nie** auf (`grantHarvest`,
`packages/engine/src/farming.ts:90-107`, kein Pet-Wurf; `farming.ts` importiert `pets` gar nicht).

Damit ist `witherling` das einzige unerreichbare Pet → `pets_owned` deckelt bei 20 → das
legendäre `ach_pets_all` („Beastmaster / Bestienmeister", count = 21,
`packages/content/src/index.ts:11075`) ist **mathematisch nie freischaltbar**. Nebeneffekt:
100 %-AP/Collection nie erreichbar; der Skill-Effekt des Pets (gatherYield farming +4,5 %) ist
ebenfalls nie zu bekommen.

**Repro (headless, verifiziert):** witherling.dropChance auf **1.0** forciert, Graywort-Plot mit
Auto-Replant angelegt, Uhr um 5000 Wachstumszyklen vorgestellt, `tickFarmPlots` getickt:
- Farming-XP nach 5000 Ernten = 90000 (Ernten liefen also real durch)
- `ownedPets.witherling` = **false** (trotz garantiertem Drop → Pfad wirft nie)
- Kontroll-Wurf: `tryPetDrop(state, content, { kind:"skill", skill:"farming" })` direkt
  aufgerufen → `ownedPets.witherling` = **true** (der Wurf selbst funktioniert; es fehlt nur die
  Verdrahtung im Harvest-Pfad).

**Fix-Richtung (Logic-Dev):** In `grantHarvest`/`tickFarmPlots` pro Ernte-Zyklus einmal
`tryPetDrop(state, content, { kind: "skill", skill: "farming" })` aufrufen — analog `tick.ts:193`.
Determinismus-Disziplin beibehalten (`tryPetDrop` zieht nur RNG, wenn ein passendes, noch nicht
besessenes Pet existiert → Alt-Fixtures bit-identisch). Offline-Zyklen im Batch: entweder pro Zyklus
werfen oder Erwartungswert korrekt aggregieren.

### [P2][bug] Guard-Test-Lücke: „jedes Pet ist erhältlich" prüft das Falsche — **CONFIRMED**
**Owner: Logic-Dev** (Test).

`packages/engine/src/pet-integrity.test.ts:55-68` akzeptiert ein Farming-Pet als „erhältlich",
sobald **Crops existieren** (`hasCrops = srcSkill === "farming" && crops.length > 0`, Zeile 62) —
prüft aber NICHT, dass der Drop-Hook im Farming-Pfad tatsächlich feuert. Deshalb sind alle 30
pet-integrity-Tests grün, obwohl das Pet de-facto undroppbar ist. Genau dieses „Daten-Annahme grün,
Engine-Wiring fehlt"-Muster. **Empfehlung:** Guard verschärfen — mit forciertem dropChance einen
Farming-Harvest fahren und assert, dass das Pet fällt (deckt gleichzeitig den P1-Fix ab).

### [P3][note] `ach_quests_50` / `ach_quests_75` brauchen Daily-Quests — kein Bug
`quests_completed` liest `state.quests.claimed.length`; auch Daily/Repeatable landen beim ersten
Claim **einmalig** in `claimed` (`quests.ts:206`), Max = 88 distinkte Quests. Aber nur **37**
Quests sind statisch (nicht-daily); **51** sind Daily-Pool (`daily: true`). Für count 50/75 MÜSSEN
also Daily-Quests eingelöst werden — erreichbar, solange der Daily-Picker über die Zeit alle 51
distinkten Dailys ausspielt. Margin zur 75 (bei 88 total) ist mit 13 komfortabel; nur als Hinweis,
dass 75 vom Daily-System abhängt.

### [P3][note] `daily_streak` bis 100 = 100 Kalendertage in Folge
`ach_daily_streak_100` erfordert 100 aufeinanderfolgende Login-Tage (Echtzeit). Erreichbar, aber
Langfrist-Meilenstein — reine Design-Info, kein Content-Defekt.

## Verifizierte Fixes (aus dem großen Fix-Pass — wirken)
- **`ach_quests_100→75`:** count 75 ≤ 88 Quests → erreichbar (war vorher 100 > 88 = unerreichbar). ✅
- **Deutsche Umlaute im Achievement-Block:** 0 Mojibake-Treffer (`Ã¤/Ã¶/Ã¼/ÃŸ/â€ž` …) in Zeilen
  11061–12032; Stichproben korrekt: „Holzfällen", „Großmeister", „Künste", „Universalgelehrter",
  „Kräuter…", „Beinahe Vollständig". ✅

## Nicht-Befunde (explizit geprüft, sauber)
- **Tote Targets:** 0. Alle skill_level/monster_kills/items_crafted/dungeons_cleared-Targets
  existieren im Content (deckt der bestehende Guard `achievements.test.ts` ab).
- **Orphan-Monster:** 0 — jedes der 92 Monster hat Zone / Dungeon-Encounter / slayerFloor; alle 268
  monster_kills-Targets sind kämpfbar. Keine unerreichbare `slayerRequirement`-Gate.
- **sets_completed_29:** 30 Sets existieren, **alle 30 vollständig obtainbar** → 29 erreichbar.
- **items_discovered ≤ 200:** 995 Items obtainbar (Drops/Craft/Shop/Quest/Crop) von 1011 total.
- **total_level 2079:** = 21×99; Farming erreicht 99 über Crops (XP-Pfad `farming.ts:94`), alle
  übrigen Skills über Actions oder Combat → erreichbar.
- **Zähler-Mapping:** alle 14 Condition-Typen in `achievements.ts:84-121` lesen den korrekten
  State-Zähler. Keine doppelten Achievement-IDs.

## Zusammenfassung
- **P0:** 0 · **P1:** 1 · **P2:** 1 · **P3:** 2
- **Top-3:**
  1. **[P1] `ach_pets_all` unerreichbar** — Farming-Pet `witherling` hat keinen Drop-Hook im
     Harvest-Pfad (`farming.ts` ruft `tryPetDrop` nie). Confirmed per Repro. → Logic-Dev.
  2. **[P2] Guard-Test-Lücke** — `pet-integrity` prüft „Crops existieren" statt „Drop feuert",
     ließ P1 durch. → Logic-Dev.
  3. **[note] Verifiziert:** `ach_quests_75` reachable (75 ≤ 88), Umlaute korrekt. Ansonsten
     539/540 erreichbar, keine toten Targets, Zähler korrekt.
