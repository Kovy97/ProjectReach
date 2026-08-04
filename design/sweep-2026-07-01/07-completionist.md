# Sweep 2026-07-01 — Completionist-Systeme (Achievements, Sets, Pets, Bestiarium, Slayer, Dungeons)

**Rolle:** QA / Kontrolleur — Fokus Completionist. Nur Analyse, kein Code geändert (Audit-Skript war ein Wegwerf-Test, wieder gelöscht).
**Basis:** `G:\GameDev`, headless.

## Gate-Ergebnisse
| Gate | Status | Detail |
| --- | --- | --- |
| `pnpm typecheck` | ✅ | exit 0 (FULL TURBO) |
| `pnpm test` | ✅ | exit 0 — engine **478 passed** (79 files), persistence **58 passed** (1 file) |
| `pnpm --filter @hearthforge/client build` | ✅ | exit 0 (built in ~10s) |
| Balance-Sim `AUFFÄLLIGKEITEN` | ⚠ (9) | „Bronze-Baseline (9)" — akzeptierter Snapshot, Test grün (nicht 0, aber keine neuen Regressionen) |

Content-Umfang: 1011 Items, 92 Monster, 21 Skills, **540 Achievements**, **30 Sets**, **6 Dungeons**, **21 Pets**, **88 Quests**, 1 Slayer-Master, 5 Tower-Etagen, 15 Slayer-Shop-Einträge.

---

## Findings

### P2 — [Achievements] `ach_quests_100` ist mathematisch unerreichbar → 100%/Max-AP unmöglich
- **Kategorie:** Achievements / tote Condition
- **Erwartet:** Jedes definierte Achievement ist erspielbar (Completionist kann 100 % / totalAP erreichen).
- **Tatsächlich:** `ach_quests_100` (rarity `epic`, 50 AP) verlangt `quests_completed >= 100`. Der Zähler ist `state.quests.claimed.length` (`achievements.ts:98`). `claimQuest` pusht ausschließlich IDs aus `content.quests` und jede höchstens **einmal** (`quests.ts:206` für repeatable, `:208` für einmalige; Daily-Claims setzen nur `entry.claimed`, nicht `claimed[]`). Damit ist die Obergrenze = Anzahl distinkter Quests = **88 < 100** → nie erfüllbar.
- **Repro:** Alle 88 Quests (inkl. aller 51 Dailies je einmal) einlösen → `claimed.length` = 88, Achievement bleibt gesperrt.
- **Evidence:** `content/src/index.ts:11530` (`count: 100`); Nachbarn `ach_quests_50` (`:11529`) = 50 ist noch erfüllbar; `engine/src/quests.ts:184/206/208`; `engine/src/achievements.ts:98`; `content.quests.length = 88`.
- **Owner:** **content-dev** — `count` auf ≤ 88 senken (z. B. 75) ODER ≥ 12 statische Quests ergänzen. (Alternativ Logic-Dev: Daily-Claims kumulativ zählen — widerspricht aber dem dokumentierten Design.)

### P3 — [Slayer/Bestiarium] `slayerFloor`-Tag fehlt auf 8 Tower-Kopie-Monstern (Invariante verletzt, latent)
- **Kategorie:** Daten-Konsistenz / „definiert aber nicht gepflegt"
- **Erwartet:** Laut Typ-Doku (`shared/src/index.ts:1563-1567`) setzt Content `slayerFloor` „analog zur passenden `SlayerTowerFloor.floor`" für JEDES Tower-Monster.
- **Tatsächlich:** Die 8 Tower-Kopien `tower_goblin`, `tower_goblin_rogue`, `tower_skeleton_warrior`, `tower_skeleton_archer`, `tower_iron_revenant`, `tower_ember_elemental`, `tower_frost_hound`, `tower_roc_void` tragen zwar `zone: "slayer_tower"`, aber **kein `slayerFloor`** — während ihre Etagen-Kollegen (`rot_rat`, `plague_grub`, …) `slayerFloor` setzen. Inkonsistente Tagging innerhalb derselben Etage.
- **Auswirkung heute:** funktional harmlos — `worldTaskMonsters` (`slayer.ts:129`) schließt Tower-Mobs über `m.zone !== "slayer_tower"` aus, nicht über `slayerFloor`; die 8 Mobs leaken also NICHT in Welt-Tasks. Aber latente Falle: jeder künftige Konsument, der auf `slayerFloor` baut (Bestiarium-Gruppierung nach Etage, oder falls der zone-Guard je entfernt wird), würde diese 8 als Welt-Monster fehlklassifizieren.
- **Evidence:** `content/src/index.ts:10822-10937` (8 Defs ohne `slayerFloor`) vs. `:10552-10593` (mit `slayerFloor: 1`); Filter `engine/src/slayer.ts:129`.
- **Owner:** **content-dev** — `slayerFloor` auf den 8 Kopien nachtragen (Etage laut `slayerTower`-Liste `:13987`).

### P3 — [Pets] Pet-pro-Skill nicht 1:1 (Runecrafting 2, Slayer 0) — kein Blocker
- **Kategorie:** Content-Kohärenz / Design-Ziel „21 Pets, eins pro Skill"
- **Tatsächlich:** 14 skill-gequellte Pets (runecrafting hat 2: `glyphmaw` + `vellumoth`) + 7 combat-gequellte Pets (droppen bei jedem Kill) = 21. Der Skill **slayer** hat kein eigenes skill-source Pet.
- **Auswirkung:** KEIN Blocker — alle 21 Pets sind erhältlich (Combat-Pets decken den Slayer-Grind über Kills ab). Nur eine Abweichung vom „eins pro Skill"-Ideal.
- **Evidence:** Pet-Roster-Audit (skill-source: runecrafting=2, slayer=0; combat-source=7).
- **Owner:** content-dev / Design-Entscheidung (bewusst so lassen oder umverteilen).

### INFO — Sim `AUFFÄLLIGKEITEN (9)` = akzeptierte Bronze-Baseline (nicht 0)
- Keine neuen Regressionen; `sim.test.ts` prüft gegen diese Baseline und ist grün. Inhalt:
  - `pickpocket_city_guard` und `crack_strongbox`: „keine Ausgabe-Items" (geben nur Gold/XP — nur relevant, falls je ein Sammel-Item exklusiv daran hängt; aktuell nicht der Fall).
  - 7 Monster „unbesiegbar (Stat-Wall ohne Regen)" für einen Bronze-Char: `goblin_warlock` (Lv30), `bull_boss` (Lv15), `dust_vulture` (Lv34), `mire_crawler` (Lv38), `pitch_beetle` (Lv42), `bone_stalker` (Lv34), `ashfield_wraith` (Lv38). **Nicht** wirklich unkillbar (kein Regen → mit besserem Gear besiegbar) → kein Bestiarium-Blocker.
- **Owner (falls angefasst):** combat-dev / balance-designer — NICHT completionist-kritisch.

---

## Saubere Bestätigungen (Completionist grün)

- **Sets:** Alle **30 Sets** vollständig sammelbar — jedes `pieces`-Item existiert UND ist beschaffbar (Drop/Craft/Shop/Dungeon/Slayer-Shop/Quest). Kein `minPieces > pieces.length`. `set-bonus.test` grün → Boni greifen.
- **Dungeons + Keys (Chef-Frage):** Alle **6 Dungeons erreichbar**; **jeder Key droppt von normalen (Nicht-Tower-)Monstern** und **KEIN Key ist im Shop**:
  - `warband_key` (Goblin-Zone, `:9448-9541`), `crypt_key` (`:10055-10119`), `highland_key` (`:10134-10205`), `wildwood_key` (`:10276-10329`), `idolhall_key` (`:10358-10435`) — alle mit Drop-Chance > 0, mehrfach farmbar. `highland_key` bedient sowohl `highland_aerie` als auch `wyvern_lair`. **Anforderung „Keys nur noch Drops" erfüllt.**
- **Pets (Wiring):** Alle 21 erhältlich; Drop-Wiring live — `tryPetDrop` in `tick.ts:193` (Skilling) + `combat.ts:481` (Kill); Combat-Ability via `firePetAbility` (`combat.ts:1080/1096`). Kein „definiert aber nie geworfen".
- **Bestiarium:** Alle **92 Monster erreichbar** (Zone/Dungeon-Encounter/Tower/Slayer-Pool); alle `zone`-Refs existieren; alle `monster.xp > 0`. `content-integrity` deckt Loot-Item-Refs ab (grün).
- **Slayer:** Leerer `taskPool` bei `brenna_ashwick` ist **BY DESIGN** (dynamisch via `worldTaskMonsters`, `slayer.ts:92-157`, Feld bewusst nicht mehr gelesen). Alle 5 Tower-Etagen-Monster existieren; alle 15 Slayer-Shop-Items existieren; alle `slayerRequirement`-Items (plague_mask/ear_plugs/mirror_ward/soul_veil/void_anchor) existieren und sind beschaffbar (Slayer-Shop).
- **Achievements:** 540 Defs, **keine doppelten IDs**, alle `condition.target` gültig (skill/monster/dungeon/item existieren); alle Zähler-Bedingungen erreichbar außer `ach_quests_100` (s. P2). Alle 14 `AchievementConditionType` werden in `achievements.ts` tatsächlich ausgewertet (kein toter Typ).
- **Gear-Obtainability:** 0 Ausrüstungs-Items ohne Beschaffungsquelle.

---

## Empfehlung
**fix-then-ship.** Ein echter Completionist-Blocker: `ach_quests_100` macht 100 % Achievements unmöglich → vor EA-Release durch content-dev fixen (count ≤ 88 oder Quests nachlegen). Der `slayerFloor`-Tag-Fix (P3) und die Pet-1:1-Frage (P3) sind sauber-machen/optional. Alle Gates (typecheck/tests/build) grün; Sim auf akzeptierter Baseline.
