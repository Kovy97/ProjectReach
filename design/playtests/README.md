# Playtest-Leitfaden für Spieler-Sim-Agents

Du bist ein **Spieler** mit einer eigenen Persona. Du „spielst" Hearthforge Idle, indem du die
deterministische Engine (kein UI/Electron nötig) programmatisch ansteuerst, das **Pacing** beobachtest
(zu schnell? zu langsam? sich lohnend?) und am Ende **konstruktives Feedback** schreibst.

## So spielst du (Engine direkt ansteuern)
Lege eine WEGWERF-Testdatei an: `packages/engine/src/_playtest_<deinPersonaSlug>.test.ts`, importiere aus
`@hearthforge/content` (`content`) und der Engine (`"./state"`, `"./tick"`, `"./actions"`, `"./combat"`,
`"./dungeon"`, `"./shop"`, `"./equipment"`, `"./inventory"`, `"./leveling"`, `"./character"`, `"./mastery"`),
treibe deinen Durchlauf, **`console.log`** deine Kennzahlen, und führe sie aus mit:
`cd packages/engine && pnpm exec vitest run src/_playtest_<slug>.test.ts`.
**Räume die Testdatei am Ende wieder weg (`rm`)** — nur dein Feedback-`.md` bleibt.

### Kern-API (Signaturen)
```ts
createGame({ name, allocated? }, content, seed)        // neuer Spielstand (allocated = Start-Attribute, optional)
advance(state, content, dtMs)                          // ZEIT vorspulen (z.B. 3_600_000 = 1h) → das ist deine „Zeitsteuerung"
setActiveAction(state, content, actionId)              // eine Skilling-Aktion starten (läuft dann über advance)
startCombat(state, content, monsterId)                 // Kampf gegen ein Monster
startDungeon(state, content, dungeonId)                // Dungeon-Run (braucht Schlüssel + Niveau)
canEnterDungeon(state, content, dungeonId)             // Dungeon betretbar?
combatLevel(state)                                     // Kampf-Niveau (Ø der 7 Kampf-Skills)
buyItem(state, content, itemId, cost) / sellItem(state, content, itemId, qty)
buySlotUpgrade(state, content) / buyAutoEatUpgrade(state)
equipItem(state, content, itemId) / selectFood(state, content, itemId) / setCombatStyle(state, style)
computeStats(state, content)                           // abgeleitete Werte (Schaden/Def/HP/…)
levelFromXp(xp) / xpForLevel(level) / itemCount(inv, itemId) / masteryLevel(state, actionId)
```
Zustand lesen: `state.character.gold`, `state.skills[id].xp`, `state.character.totalLevel`,
`state.character.equipment`, `state.combat`, `state.stats` (kills/deaths/itemsGathered), `state.inventory.slots`.
Content erkunden: `content.actions`, `content.monsters`, `content.dungeons`, `content.items`, `content.zones`, `content.shop`.
**Tipp:** Schau in vorhandene `*.test.ts` (z.B. `sim.test.ts`, `shop.test.ts`, `dungeon.test.ts`, `combat.test.ts`)
für echte Nutzungs-Beispiele. Unklar bei einer Signatur? grep den Export in `packages/engine/src/`.

## Was du beobachten/messen sollst (Pacing!)
Du steuerst die ZEIT selbst (`advance`). Spiele eine plausible Session DEINER Persona (z.B. „erste 2h",
„bis Combat L30", „eine Woche idle = advance(7*24h in Häppchen)"). Miss u.a.:
- **Zeit bis Meilensteinen**: wie lange (Sim-Zeit) bis Skill-L10/30/50? bis erstes besseres Gear? bis erster Dungeon-Key/-Clear?
- **XP/h & Gold/h** für deine bevorzugten Aktivitäten — fühlt es sich zäh oder zu schnell an?
- **Fortschritts-Gefühl**: gibt es Durststrecken/Leerlauf? Belohnt sich deine Spielweise?
- **Zugänglichkeit**: sind Dungeons/Gear/Upgrades für deine Persona erreichbar oder frustrierend weit weg?
- **Was FEHLT**, damit es sich wie ein vollwertiges Spiel anfühlt (aus Sicht DEINER Persona).

## Dein Feedback-Dokument
Schreibe nach `design/playtests/<deinPersonaSlug>.md`:
- **Persona & Spielstil** (1–2 Sätze).
- **Was ich gespielt habe** (kurzer Verlauf + grobe Sim-Zeit).
- **Pacing-Messungen** (konkrete Zahlen: Zeit bis Meilenstein X, XP/h, Gold/h …).
- **Was sich gut anfühlt** ✅ / **Was sich zu langsam/schnell/zäh anfühlt** ⚠️ (mit Zahlen).
- **Reibungspunkte & Frust** (konkret).
- **Was fehlt für ein vollwertiges Spiel** (aus Persona-Sicht) + **konkrete Verbesserungs-Vorschläge** (priorisiert).
- **Spaß-Bewertung** 1–10 + 1 Satz Begründung.

Sei ehrlich, konkret und zahlengetrieben — kein Marketing. Wir wollen wissen, wo wir nachbessern müssen.

## Regeln
- NUR deine Wegwerf-Test-Datei + dein Feedback-`.md` anfassen. KEINE Spiel-/Engine-/Content-Dateien ändern.
- Wegwerf-Test am Ende löschen.
- Determinismus: die Engine ist deterministisch je Seed — variiere ggf. den Seed für mehrere Stichproben.
