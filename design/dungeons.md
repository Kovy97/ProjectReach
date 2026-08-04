# Dungeons & Map-Bereiche — Design (2026-06-24)

Chef-Richtung: den Battle-Teil ausbauen — **dedizierte Map-Bereiche** (Zonen mit Hintergründen) und
**Dungeons** als Mid/Endgame-Aktivität, deren **Schlüssel von schweren Mobs** des jeweiligen Levels
droppen, mit **dedizierter Dungeon-Loot**.

## Slice 1 — Map-Bereiche mit Hintergründen ✅ (umgesetzt)
- `renderer/zoneBackgrounds.ts` → `assets/zones/<zoneId>.png` (Auto-Discovery, `getZoneBackground`).
- Gerendert als Zonen-Karten-Hintergrund + Kampf-Backdrop (mit Abdunkel-Overlay, Fallback aufs Alte).
- Chef generiert Hintergründe für die 10 Zonen-IDs.

## Slice 2 — Dungeons (mehrere Iterationen)

### 2a) Datenmodell (shared + content) — ✅ FERTIG (2026-06-24)
Umgesetzt: `DungeonDef` + `ContentDB.dungeons` (shared); 2 Dungeons `crypt_depths` (Lv30, crypt_key,
5 Skelett-Wellen inkl. Nekromantenfürst) + `idol_sanctum` (Lv100, idolhall_key, 4 Wellen bis last_idol);
Keys `crypt_key`/`idolhall_key` (droppen von skeleton_nekro 8% / last_idol 6%); Dungeon-Loot inkl. neuer
exklusiver Platzhalter `grave_warden_sigil`/`idol_heart` + bestehende wertige Items. Guards: `content-refs`
(Dungeon-Refs existieren + Keys erhältlich), `wiring-audit` (Dungeon-Loot zählt als erhältlich). KEINE
SAVE_VERSION (reiner Content). Original-Plan unten:

### 2a-Plan (Original)
- **shared:** `DungeonDef { id; name: LocalizedString; zone?: string; requiredLevel: number;
  keyItem: ItemId; keysPerRun: number (=1); encounters: MonsterId[] (Wellen/Sequenz);
  loot: LootRoll[] (dungeon-exklusiv, beim Clear); xp: number; gold: number }`.
  `ContentDB.dungeons: DungeonDef[]`.
- **content:** **Dungeon-Keys** als neue Items (`type: "material"`, value), z.B. `crypt_key`,
  `highlands_key`, `idolhall_key`. Je 1 Dungeon pro passender Zone (crypt/highlands/coast/wildwood/
  idolhall …), `encounters` = 3–5 Monster der Zone aufsteigend + Zonen-Boss zum Schluss.
- **Key-Drops:** je ein „schwerer" Mob der Zone (Boss/enrage-Mob) droppt den Key mit kleiner Chance
  (z.B. 0.05–0.1). In dessen `loot` ergänzen.
- **Dungeon-Loot:** neue, NUR hier erhältliche Items (Gear/Schmuck/Materialien) — eigener Tier-Stolz.
  Erst die Datenstruktur, die konkreten Items füllt der Chef/content-dev später (eigener Loot-Pass).
- Guard: `content-refs`/`wiring-audit` erweitern (DungeonDef-Refs: keyItem/encounters/loot existieren;
  jeder Dungeon-Key erhältlich = Mob-Drop; Dungeon-Loot erhältlich = Dungeon-Loot).

### 2b) Engine — Dungeon-Run ✅ FERTIG (2026-06-24)
Umgesetzt: `CombatState.dungeonId/encounterIndex` (shared, SAVE_VERSION 20→21 + migrateState-Default);
neue `engine/dungeon.ts` (`combatLevel` = Ø der 7 Kampf-Skills, `canEnterDungeon` = Niveau+Key,
`startDungeon` = Key verbrauchen + erste Welle); `combat.ts onEnemyDefeated`: bei aktivem Dungeon →
encounterIndex++ + nächste Welle, nach letzter Welle → `grantDungeonRewards` (Loot+Gold+Vitality-XP) +
`endDungeon`; `onPlayerDefeated` → Run-Abbruch (dungeonId=null, Key bleibt weg). Determinismus: neue
Felder bei Nicht-Dungeon-Kämpfen immer null/0 → keine zusätzlichen RNG-Würfe (combat.test grün).
Tests: `dungeon.test.ts` (5). Plan unten:

### 2b-Plan (Original)
- `GameState.combat` um Dungeon-Kontext erweitern: `dungeonId: string | null; encounterIndex: number`.
  (→ SAVE_VERSION + migrateState: defaults null/0.)
- `startDungeon(state, content, dungeonId)`: prüft requiredLevel + Key-Besitz, **verbraucht keysPerRun**,
  setzt dungeonId + encounterIndex 0, startet `encounters[0]`.
- In `combat.ts onEnemyDefeated`: wenn Dungeon aktiv → nicht respawnen, sondern `encounterIndex++` und
  nächste Welle starten; nach letzter Welle → `grantDungeonRewards` (loot + xp + gold), Dungeon beenden.
- `onPlayerDefeated` während Dungeon → Run-Abbruch (Key bereits verbraucht = Risiko/Einsatz, Melvor-artig).
- Determinismus wahren (RNG nur wie bisher).
- Tests: `dungeon.test.ts` (Run-Clear vergibt Loot; Key verbraucht; Tod bricht ab; Migration).

### 2c) UI ✅ FERTIG (2026-06-24) — Dungeons SPIELBAR
Umgesetzt in CombatPage: Dungeons-Sektion in der Zonen-Auswahl (Karten mit Zone-Hintergrund, Name,
requiredLevel, Schlüssel-Anzeige x/Bedarf, Wellen-Anzahl, „Betreten"-Button gated via canEnterDungeon
mit Grund-Tooltip); Wellen-Fortschritts-Banner im Kampf (Dungeon-Name + „Welle X/Y" + Balken). i18n en+de.
**Damit Slices 1+2 komplett — Dungeons end-to-end spielbar** (Key von Boss → betreten → Wellen → Clear-Loot
ODER Tod = Abbruch). Plan unten:

### 2c-Plan (Original)
- Dritter Auswahl-Pfad neben Zonen: „Dungeons"-Sektion. Karten je Dungeon (Hintergrund via Zone),
  Key-Anzeige (Besitz x/Bedarf), requiredLevel, „Betreten" (disabled ohne Key/Level).
- Während des Runs: Fortschritt „Welle X/Y", aktuelle Gegner-Welle, Abbruch/Flucht.
- Dungeon-Loot-Vorschau (Collection-Log-Stil, ??? bis entdeckt — wie Monster-Drops).
- i18n en+de.

## Build-Reihenfolge
1. ✅ Slice 1 (Zonen-Hintergründe).
2. Slice 2a (Datenmodell + 1 Beispiel-Dungeon + Keys + Guard-Tests) — als Nächstes.
3. Slice 2b (Engine-Run + SAVE_VERSION + Tests).
4. Slice 2c (UI).
5. Dungeon-Loot-Design-Pass (eigene Items) — Chef/content-dev.

## Offen / Chef-Input willkommen
- Wie viele Wellen pro Dungeon? (Vorschlag 4–5 + Boss.)
- Key nur bei Boss-Mobs oder auch bei normalen schweren Mobs?
- Sollen Dungeons wiederholbar sein (ja, solange Keys da) und skalieren?
- Dungeon-Loot-Thema je Zone (eigene Gear-Linie? Schmuck? Cosmetics?).
