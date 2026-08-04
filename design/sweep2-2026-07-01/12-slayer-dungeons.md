# Sweep 2 — 12 · Slayer & Dungeons (Kontrolleur/QA)

**Datum:** 2026-07-01 · **Fokus:** Slayer-Task-Pool, Slayer-XP/Belohnung, Slayer-Tower-Floors (`slayerFloor`),
Dungeon-Erreichbarkeit, Key-Drops (nicht Shop), Dungeon-Loot.
**Methodik:** Code-Read (`slayer.ts`, `dungeon.ts`, `combat.ts`, `content/index.ts`, `shared`), temporäres
SimPlayer/Content-Analyse-Skript (angelegt + wieder gelöscht), volle Headless-Verifikation (typecheck/test/build/sim).

---

## Verifikations-Gates (headless)

| Gate | Ergebnis |
|------|----------|
| `pnpm typecheck` | ❌ ROT — **ausschließlich** durch drei Fremd-Sweep-Scratchdateien (`_droptable_audit.test.ts`, `magic-sweep.test.ts`, `midgame-dump.test.ts`). Produkt-Code + Fokusbereich sauber. |
| `pnpm test` | ✅ Engine 482/482, Persistence grün (turbo 2/2 Tasks). |
| `pnpm --filter @hearthforge/client build` | ✅ built in 10.35s. |
| Balance-Sim | ✅ `AUFFÄLLIGKEITEN (9)` = exakt die per Briefing akzeptierten 9 Bronze-Baseline-Notes · `ECHTE WALLS (0)`. Alle Tower-Mobs + Dungeon-Encounter geared besiegbar (deaths=0). |

---

## GERADE-GEFIXT verifiziert (wirkt)

- **`tower_* jetzt mit slayerFloor` — WIRKT.** Alle 8 `tower_*`-Klone **und** die nativen Tower-Mobs tragen
  `slayerFloor` == passender Etage, `zone: "slayer_tower"`. Analyse-Skript: **keine** Tower-Mob-Leaks in den
  Welt-Task-Pool über L1–99 (`towerLeaks=0` an jeder Stufe), keine Orphans (kein `slayerFloor`-Tag ohne
  Floor-Listeneintrag, kein `zone=slayer_tower` außerhalb einer Floor-Liste). Evidence:
  `packages/content/src/index.ts:10560-10954`, `slayer.ts:129`.
- **Dungeon-Keys droppen von Mobs, NICHT im Shop.** Alle 5 Keys droppen (Anzahl Dropper: warband 12 · crypt 9 ·
  highland 9 · wildwood 5 · idolhall 4); **keiner** steht in `content.shop`. `content/index.ts:9457-10955`
  (Drops) vs. `shop:` ab `:10959` (kein `_key`). Verifiziert per Skript (`keyInShop=false` für alle 6 Dungeons).
- **Welt-Task-Pool immer über Spielerlevel.** `worldTaskMonsters` liefert über L1–99 nie leer, nie ≤ Spieler
  (`atOrBelowPlayer=0` durchgängig), Fallback auf fensternächste Mobs greift bei Endgame. `slayer.ts:121-140`.

---

## Findings

### Confirmed

**[P2][balance] Slayer-Tower-Etagen 2–5: Schwierigkeits-/XP-Sprung durch die `tower_*`-Klone**
Die neu in die Etagen aufgenommenen `tower_*`-Klone liegen **2–3× über dem dokumentierten Level-Band** der
jeweiligen Etage. Ein Tower-Slayer-Task zieht gleichverteilt Etage → dann gleichverteilt Mob der Etage
(`slayer.ts:191-194`), d.h. jeder Klon ist mit gleicher Wahrscheinlichkeit wie ein niveaugerechter nativer Mob dran.
- Etage 2 (Kommentar „Mob L20–39", Unlock Slayer 20): native L22–38, aber `tower_skeleton_warrior` **L65** /
  `tower_skeleton_archer` **L68**.
- Etage 3 („L40–59", Unlock 40): native L44–54, aber `tower_iron_revenant` **L175** / `tower_ember_elemental` **L168**.
- Etage 4 („L60–79", Unlock 60): native L62–76, aber `tower_frost_hound` **L182**.
- Etage 5 („L80–99", Unlock 80): native L82–96, aber `tower_roc_void` **L233**.
- Etage 1 dagegen sauber: Klone `tower_goblin` L15 / `tower_goblin_rogue` L19 passen ins Band L1–19.

**Erwartet:** Ein frisch freigeschalteter Etagen-Task ist für einen Spieler auf Höhe der Unlock-Schwelle
machbar. **Tatsächlich:** ~1/5 der Tower-Tasks je Etage (2–5) zielt auf einen Mob 2–3× über dem Band → für den
Spieler auf Freischalt-Niveau unkillbar, Zwang zum Skip (Kosten 20 Pkt bei nur 5 Basispunkten/Task) bzw.
Punkte-Drain. Kein Hard-Lock (towerTaskChance 0.5 → Welt-Tasks bleiben machbar), aber deutlicher Feel-Bruch und
inkonsistente XP/Task innerhalb einer Etage (z.B. Etage 2: `bone_stalker` 58 XP/Kill vs `tower_skeleton_archer`
250 XP/Kill).
**Evidence:** `content/index.ts:10831-10954` (Klon-Level) vs. Floor-Bänder `:10613/:10669/:10713/:10769`;
Balance-Sim Bronze-Baseline: `tower_skeleton_*`/`tower_ember_elemental`/`tower_iron_revenant`/`tower_frost_hound`/
`tower_roc_void` alle `kills=0`, während die nativen Etagen-Mobs Kills liefern. Assign-Sim (Seed 12345):
`tower_frost_hound(L182)` wird bei Spieler-Slayer 60 als Task vergeben.
**Owner:** Content-Dev (Klon-Level je Etage passend setzen) — **braucht Chef-Balance-Entscheidung** + Lockerung
der `tower-monsters`-Guard (siehe nächstes Finding).

**[P2][bug] Guard-Test widerspricht der dokumentierten Klon-Intention**
`packages/engine/src/tower-monsters.test.ts:14` erlaubt Drift nur in `id|zone|slayerFloor` und erzwingt damit,
dass `tower_<x>` in **Level/Stats/Loot** byte-identisch zur Basis `<x>` bleibt. Der Content-Kommentar
`content/index.ts:10829-10830` sagt aber ausdrücklich, die Tower-Kopien existierten als „separate IDs damit
Level/Drops/Stats **unabhängig editierbar** sind". Beides ist nicht gleichzeitig haltbar: Der Guard zementiert
genau die Basis-Level, die auf den Etagen 2–5 nicht ins Band passen (Ursache des vorigen Findings). Solange der
Guard so steht, kann Content-Dev die Klon-Level nicht korrigieren, ohne den Guard zu brechen.
**Erwartet:** Guard und Intention konsistent. **Tatsächlich:** widersprüchlich.
**Owner:** Logic-Dev/Content-Dev nach Chef-Entscheidung (entweder Guard auf „darf Level abweichen" lockern und
Klon-Level je Etage tunen, ODER die überhohen Klone von den Etagen 2–5 nehmen).

### Suspected / Minor

**[P3][feel] Tower-Tasks nicht nach Spielerlevel gefiltert (beide Richtungen)**
`unlockedTowerFloors` liefert **alle** Etagen ≤ Slayer-Level und `assignTask` wählt gleichverteilt
(`slayer.ts:46-51, 168-195`). Anders als Welt-Tasks (immer über dem Spieler) schwanken Tower-Tasks in beide
Richtungen: Ein Slayer-99-Spieler rollt zu ~1/5 noch triviale Etage-1-Tasks (Assign-Sim: `plague_grub(L7)` als
Task bei Spieler-Level 99); gleichzeitig der überhohe Klon (siehe oben). Kein Bug, aber die „immer über
Spielerlevel"-Vorgabe gilt nur für Welt-Tasks, nicht für den Tower-Pfad.
**Owner:** Chef-Design (ob Tower-Tasks ein Level-Fenster bekommen sollen).

**[P3][balance] Combat-Gate der Endgame-Dungeons ist faktisch trivial**
`highland_aerie` (reqLvl 92), `wyvern_lair` (96), `idol_sanctum` (99) gaten nur auf `combatLevel` (Cap 99),
während ihre Encounter- und Key-Dropper-Mobs L200–295 sind. Der reale Gate ist Gear/Key-Farming, nicht das
Level. Erreichbarkeit ist gesichert (Sim: alle geared besiegbar, `idol-sanctum-clear.test.ts` grün, `ECHTE
WALLS (0)`), also **kein Blocker** — nur der Hinweis, dass die `requiredLevel`-Schranke für Endgame-Dungeons
keine echte Wirkung mehr hat. Chef-Balance-Domäne.

### Prozess-Hinweis (kein Produktdefekt)

**[P2][process] `pnpm typecheck` rot durch Fremd-Sweep-Scratchdateien**
`packages/engine/src/{_droptable_audit,magic-sweep,midgame-dump}.test.ts` (von parallelen Sweep-Agenten)
brechen `tsc --noEmit` (TS2532/TS18048/TS2367/TS2783). Sie laufen unter Vitest/esbuild (kein strict-null) grün
durch, weshalb die Testsuite trotzdem 482/482 zeigt. Diese Dateien müssen vor Sweep-Abschluss gelöscht werden
(Regel: „temporäres Test-Skript … löscht es danach wieder"). Nach Entfernen aller drei ist der Engine-Typecheck
sauber (verifiziert per gefiltertem Re-Run: keine weiteren `error TS`-Zeilen). Mein eigenes Analyse-Skript wurde
bereits gelöscht.

---

## Positiv-Bestätigungen (Wiring „sinnig verdrahtet")

- **Dungeons alle erreichbar:** 6/6 mit `requiredLevel ≤ 99`, alle im Combat-UI gerendert
  (`CombatPage.tsx:1206-1247`, iteriert `content.dungeons`), alle Encounter-Mobs + Loot-Items existieren
  (Skript: `encMissing=[]`, `lootMissing=[]`).
- **Dungeon-Loot/-XP/-Gold korrekt vergeben** genau beim Clear der letzten Welle, `dungeonsCleared++` genau 1×/Run
  (`combat.ts:486-551`); durch `dungeon.test.ts` + `idol-sanctum-clear.test.ts` abgesichert.
- **Kein blockiertes Task-Monster:** `assignTask` filtert Welt- **und** Tower-Pfad auf `slayerRequirementMet`
  (`slayer.ts:129, 184, 193`); Skript über L1–99 × 8 Tasks: nie ein `slayerRequirement`-gesperrtes Monster,
  `xpReward>0` immer.
- **Slayer-XP-Wiring:** Pro-Kill-XP (`perKillSlayerXp`, monster.xp×0.5) + Abschluss-Bonus (beim Assign fixiert),
  `slayerPoints`/`slayerTasksCompleted` erst beim letzten Kill (`slayer.ts:224-261`); alle Task-Monster xp>0.
- **Tower fightbar/verdrahtet:** Combat-UI hat eigene Tower-Sektion pro Etage (`CombatPage.tsx:649-653, 1093,
  1159-1276`), Slayer-Page zeigt Task-Mob + Etagen-Label (`SlayerPage.tsx:72-73, 248-249`).

---

## Kurz-Zusammenfassung

- **P0:** 0 · **P1:** 0 · **P2:** 2 (+1 Prozess) · **P3:** 2
- **Top-3:**
  1. **[P2][balance]** Tower-Etagen 2–5: `tower_*`-Klone 2–3× über dem Etagen-Level-Band → unspielbare/Skip-Zwang-
     Tower-Tasks am Freischalt-Niveau, inkonsistente XP/Task (Content-Dev + Chef-Balance).
  2. **[P2][bug]** `tower-monsters`-Guard widerspricht der Klon-Intention und zementiert die falschen Klon-Level
     (Logic/Content-Dev nach Chef-Entscheid).
  3. **[P2][process]** `pnpm typecheck` rot nur wegen dreier Fremd-Sweep-Scratchdateien — vor Abschluss löschen.
- **Verdikt Fokusbereich:** Kern-Wiring (Task-Pool, Key-Drops, Dungeon-Erreichbarkeit/-Loot, `slayerFloor`-Fix)
  **sauber & verifiziert**. Ein echter Balance-/Konsistenz-Defekt auf den Tower-Etagen 2–5 (P2) → **fix-then-ship**
  im Fokusbereich; die typecheck-Röte ist ein Prozess-Aufräumen, kein Produktfehler.
