# Sweep 4 — 16 · Der „100 %-Completionist" (100 %-Erreichbarkeit)

**Datum:** 2026-07-01 · **Methode:** (a) statische Erreichbarkeit, (b) Forced-State-Sim, (c) Spot-Sim (Daily-Coverage).
**Ziel:** Alle 21 Skills auf 99, alle Achievements, alle Quests. Jeden 100 %-Blocker finden.

## NOTE: **A** (100 %-Erreichbarkeit)

Das Spiel ist **vollständig 100 %-completebar. Null harte Blocker gefunden.** Jede Achievement-
Bedingung ist erfüllbar, jede Quest abschließbar, jeder der 21 Skills via verfügbarer Aktionen/
Kämpfe auf 99 bringbar. Der Forced-End-State schaltet **alle 540 Achievements** frei (0 „still-locked"),
d. h. die Auswertungs-Schicht liest jedes gesetzte Feld (kein „defined-but-never-applied"-Loch).
Abzug von A+ nur wegen einer kalender-gegateten Langzeit-Reibung (`quests_completed`, s. u. — reachable,
aber real-tage-gebunden). Kein Punktabzug für Erreichbarkeit selbst.

---

## Blocker-Liste

**Keine.** `[Blocker]`-Zähler = **0**.

Alle geprüften Achtsen der Erreichbarkeit sind grün:

| Prüfung | Ergebnis |
|---|---|
| Skills → 99 erreichbar (21/21) | ✅ jede hat unbegrenzte XP-Quelle |
| Achievement-Bedingungen erfüllbar (540/540) | ✅ 0 Blocker, statisch **und** forced-state |
| Quests abschließbar (88/88) | ✅ requires-Kette vollständig auflösbar, alle Objectives valide |
| ach_pets_all | ✅ count=21 = 21 Pets, **alle dropbar** |
| ach_sets_all | ✅ count=29 = 29 distinkte Sets, alle Teile obtainbar **und** gleichzeitig haltbar |
| witherling | ✅ Farming-Drop-Pfad live |
| Dungeon-Keys (6/6) | ✅ alle Monster-dropbar |
| Obtainability-Closure | ✅ 1014/1014 Items transitiv erreichbar, 0 tote Craft-Ketten |

---

## Bestätigungen (Sweep-3-Fixes)

- **ach_pets_all = 21** — 21 Pets total; 14 Skill-Pets (gültige `source.skill` mit Aktionen bzw.
  Farming-Crops), 7 Combat-Pets (`dropChance > 0`, Drop je Kill). Alle 21 dropbar. **Bestätigt.**
- **ach_sets_all = 29** — 30 Set-Defs, per Teile-Signatur dedupliziert auf 29 distinkte Sets
  (2 Slayer-Defs teilen identische Teile). `sets_completed` max = 29 = distinkte Sets. Alle Teile
  liegen in der Obtainability-Closure. Simultan haltbar: **181** distinkte Set-Teile < **~301**
  Halte-Kapazität (260 Bank-Arten + 20 Inventar + 8 Bag + 13 Equip). **Bestätigt.**
- **witherling** — `source: { kind:"skill", skill:"farming" }`, `dropChance 1/105000`. Farming hat
  keine `ActionDef`, aber `farming.ts:115 grantHarvest()` ruft `tryPetDrop({kind:"skill",skill:"farming"})`
  pro Ernte-Zyklus → Pet dropbar. **Bestätigt.**
- **monster.xp** — `combat.ts:453` vergibt jetzt `monster.xp` an den Stil-Skill (Kommentar: „bisher nur
  in der UI angezeigt, aber nie vergeben"). Der Fix ist live. **Bestätigt (nicht neu gemeldet).**

---

## Detail-Evidenz

### Skills → 99 (21/21 erreichbar)
Jeder Skill hat eine **unbegrenzt wiederholbare** XP-Quelle:
- **Skilling (13):** woodcutting 16, mining 21, fishing 17, smithing 262, cooking 43, foraging 33,
  thieving 23, fletching 43, leatherworking 105, jewelcrafting 36, runecrafting 88, herblore 40
  Aktionen — jede mit **transitiv obtainbaren** Inputs (0 tote Craft-Aktionen).
- **farming:** kein `ActionDef`, aber Crops (passive Plots) liefern XP + Pet-Drop.
- **Kampf (8):** attack, power, defence, ranged, magic_off, magic_def, vitality, slayer. Jeder hat
  ein dediziertes XP-Routing: Melee-Stances (attack/power/defence), Ranged-Stances (ranged/defence),
  Magie-Stances (magic_off/magic_def), vitality per Schaden (`combat.ts:431/722`), slayer per Task
  (`slayer.ts:221`). `activeStanceMods` (shared) routet jeden Offensiv-Skill sauber.
- `xpForLevel(99) = 13.034.431` — konsistent (levelFromXp roundtrip = 99). `total_level` max = **2079**
  = 21×99 → `ach_total_level_2079` exakt an der Decke, erreichbar.

### Achievements (540) — Max-Schwellen je Typ vs. Decke
| Typ | Max-count (Achievement) | Decke / Erreichbarkeit |
|---|---|---|
| total_level | 2079 (`ach_total_level_2079`) | = 21×99 ✅ |
| skill_level | 99 | = MAX_LEVEL ✅ |
| pets_owned | 21 (`ach_pets_all`) | = 21 Pets ✅ |
| sets_completed | 29 (`ach_sets_all`) | = 29 distinkte Sets ✅ |
| quests_completed | 75 (`ach_quests_100`) | ≤ 88 Quests ✅ (s. Reibungs-Notiz) |
| items_discovered | 200 (`ach_discovered_200`) | ≤ 256 Monster-Drops allein ✅ |
| dungeons_cleared | 100 (`ach_dungeons_total_100`) | unbegrenzt (Keys dropbar) ✅ |
| total_kills / items_gathered / items_crafted / gold_reached / gold_spent / daily_streak / monster_kills | 50k / 100k / 10k / 10M / 1M / 100 / 1000 | alle unbegrenzt kumulativ ✅ |

**Forced-State-Sim:** End-State (alle Skills 99, alle Zähler ≫ Schwelle, alle Pets, alle Items im
Lager, alle Quests claimed) → `checkAchievements` schaltet **540/540** frei, **0 still-locked**.

### Quests (88) — 38 Story + 50 Daily-Pool
- requires-Kette: **88/88** über topologische Auflösung erreichbar (keine toten/zirkulären `requires`).
- Alle `kill_monster`-Ziele = echte Monster (0 orphan Monster: alle 92 haben zone/slayerFloor/Dungeon).
- Alle `reach_skill_level` ≤ 99, alle `craft_items`-Targets craftbar, alle Reward-Items existieren.
- Daily-Coverage-Sim: über 400 aufeinanderfolgende Kalendertage werden **alle 50** Pool-Dailies
  mindestens einmal gezogen (0 nie-gezogen) → alle Dailies claimbar (jede geht 1× dauerhaft in `claimed[]`).

---

## Soft-Findings (kein 100 %-Blocker, nur Reibung/Housekeeping)

- **[P3][feel] `quests_completed = 75` ist kalender-gegatet.** Es gibt nur 38 Story-Quests; die
  restlichen ≥37 nötigen Claims müssen aus dem 50er-Daily-Pool kommen. Dailies re-armen pro echtem
  Kalendertag (max. 6 Draws/Tag, forward-only-Härtung gegen Clock-Cheat). → erreichbar, aber der
  „True-Completionist" muss über **mehrere reale/In-Game-Tage** ~37+ distinkte Dailies einsammeln.
  Bewusst? Falls nicht gewünscht: `ach_quests_100`-count auf ≤ Story-Quest-Zahl senken oder mehr
  permanente Quests. *Owner: content-dev (Zahl) — Design-Entscheidung Chef.*
- **[P3][housekeeping] Fremd-Test-Leiche im Repo:** `packages/engine/src/zz-runecrafting-sweep.test.ts`
  (von einem anderen Sweep-Agenten, nicht gelöscht). Nicht mein Artefakt — bitte der Runecrafting-Agent/
  content-dev entfernen, damit `pnpm test` sauber bleibt. *Owner: (fremder Sweep-Agent)/logic-dev.*
- **items_discovered** ist konzeptuell fragil (zählt `seenDrops` ∪ aktuell besessene Items). Für die
  aktuelle Höchstschwelle 200 völlig unkritisch (256 Monster-Drops persistieren in `seenDrops`). Nur
  als Hinweis, falls künftig ein `ach_discovered_500+` geplant wird: dann Bank-Cap (260 Arten) + nicht-
  Monster-Items simultan-haltbar prüfen (Est. Decke aktuell ~544). *Owner: logic-dev (nur falls erhöht).*

---

## Methodik / Reproduzierbarkeit
Temporäre Vitest-Skripte gegen `@hearthforge/content` + Engine-Helper (statische Closure-/Reachability-
Analyse, Forced-State-`checkAchievements`, Daily-`pickDailyQuests`-Coverage über 400 Tage). Skripte nach
Messung wieder gelöscht (clean). Zusätzlich Guard-Tests grün: pet-integrity, set-bonus, achievements,
quest-integrity, quests, content-integrity, zones, wiring-audit = **81/81 passed**.

## Empfehlung
**Ship (100 %-erreichbar).** Kein harter Blocker. Optional vor Release nur die zwei P3-Punkte prüfen
(Daily-Gate-Zahl als Design-Entscheidung; fremde Test-Leiche entfernen).
