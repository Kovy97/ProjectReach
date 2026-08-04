# Security- & Cheat-Härtungs-Pass — Hearthforge Idle (Runde 1)

**Datum:** 2026-06-25
**Methode:** Adversariales Code-Lesen (5 böswillige Tester, je eigener Vektor). Alle Befunde am echten Code verankert (persistence / engine / combat / quests / inventory / shop / character / content). Reine Analyse, kein Code geändert.
**Codebasis:** Monorepo `packages/{shared,engine,content,persistence}` + `apps/client`. Save-Persistenz: `localStorage` (Web-Fallback) bzw. Electron-Bridge (`apps/client/src/renderer/saves.ts`), JSON via `serialize`/`deserialize` (`packages/persistence/src/index.ts`).

---

## 1. Executive Summary

**Gesamturteil: Funktional robust gegen *Abstürze* im Normalbetrieb, aber praktisch schutzlos gegen *Save-Manipulation* und *Clock-Cheating*.** Die Engine ist sauber, deterministisch und idle-fair; viele Endgame-Deckel (Mitigation, Lifesteal, Mastery, Pet-Effekte, Over-Level-Dämpfung) sind vorbildlich gekappt. ABER: Der gesamte Schutzwall endet bei einem **frei editierbaren Client-Save**, und `migrateState`/`deserialize` macht **ausschließlich Default-Auffüllung — null Wert-Validierung, null Clamping, null Sanity-Checks**. Jeder, der die JSON-Datei (oder `localStorage`) öffnet, hat Vollzugriff auf Gold/Level/Items/Pets/Achievements.

Wichtig für die Einordnung: Ein Client-Save eines Singleplayer-Idle-Games ist **inhärent editierbar** — „unmöglich machen" geht clientseitig nicht. Mitigation = **Sanity-Clamping & Schadensbegrenzung**, damit ein editierter Save (a) nicht die App **crasht**, (b) keine **NaN/Infinity-Seuche** in den Spielstand einschleust, die ihn dauerhaft kaputt macht, und (c) ein paar billige **Plausi-Schranken** offensichtlichen Unfug abfangen.

### Top-Exploits nach Schweregrad

| # | Exploit | Schwere | Datei |
|---|---------|---------|-------|
| 1 | `deserialize` validiert/clamped NICHTS — beliebiges Gold/Level/Items/Pets/Achievements per Save-Edit | **P1** (inhärent, aber Clamping fehlt) | `persistence/src/index.ts:329` |
| 2 | NaN/Infinity/negativ im Save → DoT-/HP-/Mana-/accuracy-Formeln produzieren `NaN`, der sich permanent in den State frisst (Soft-Brick) | **P1** | `combat.ts:156`, `tick.ts:194` |
| 3 | Clock-Cheat: Daily-Reset hängt 100 % an lokaler `new Date()` → Uhr vorstellen = Dailies beliebig oft neu ziehen & claimen | **P1** | `QuestsPage.tsx:25`, `quests.ts:241` |
| 4 | `savedAt`/`accumulatorMs` aus Save ungeprüft → `accumulatorMs` riesig = Offline-Cap umgangen (24h-Deckel greift NUR auf `now - savedAt`, nicht auf bereits gespeicherten Akkumulator) | **P2** | `persistence/src/index.ts:337`, `tick.ts:194` |
| 5 | `resolveAttack` Trefferchance `acc/(acc+eva)` → bei beidem 0 (editierter Save / fehlender Content) `0/0 = NaN` | **P2** | `combat.ts:156` |
| 6 | Negative Item-Mengen (`qty: -5`) im Save überleben Migration, vergiften `itemCount`/Stacking/Verkauf | **P2** | `inventory.ts:43`, `persistence` |

---

## 2. Befunde pro Angreifer

### Angreifer 1 — Save-Editor
**Ziel:** Save-Datei / localStorage direkt editieren.

**Speicherweg (Befund, kein Exploit):** `serialize` (`persistence:282`) schreibt rohes `JSON.stringify({version, savedAt, summary, state})`. Im Web liegt das **unverschlüsselt & unsigniert** in `localStorage["hf_save_<slot>"]` (`apps/client/src/renderer/saves.ts:24`). Es gibt **keine Prüfsumme, keine Signatur, keine Obfuskation**. → Save ist trivial editierbar. (Inhärent für Client-SP-Game.)

#### V1.1 — `migrateState` validiert keine einzige Zahl — **P1** (inhärent; Mitigation = Clamping)
`persistence/src/index.ts:29-261`. Die Funktion prüft durchweg nur **Existenz/Typ** (`typeof x !== "number" → default`) und füllt fehlende Felder. Sie clamped **nirgends** Wertebereiche. Konkret ungeschützt:
- `state.character.gold` (`:41`) — nur `=== undefined`-Check. `gold = 1e12` wird 1:1 übernommen.
- `state.character.totalLevel`, alle `skills[].xp`, `mastery[].xp` — keinerlei Range/Cap. (Wirkt sich aber durch `levelFromXp`-Cap bei MAX_LEVEL 120 begrenzt aus → der *Effekt* von Über-XP ist gedeckelt; der gespeicherte Wert nicht.)
- `inventory.slots[].qty` — keine Untergrenze/Obergrenze (siehe V1.4 / V3).
- `state.bank[itemId]` — Mengen werden nur bei Rename zusammengeführt (`:233`), nie validiert. Negativ/riesig möglich.
- `character.ownedPets` (`:126-136`) — **einziger teilvalidierter Block**: unbekannte Pet-IDs werden über `renamePet` durchgereicht, aber NICHT gegen `content.pets` geprüft. Ein erfundenes `ownedPets:{"god_pet":true}` überlebt; `equippedPet` (`pets.ts:27`) fängt es zwar ab (`content.pets[id] ?? null`), aber `ownedPetCount` (`pets.ts:136`) iteriert nur über Content → harmlos. **Gut genug.**
- `state.achievements` (`:76`) — nur `Array.isArray`-Check. Beliebige (auch erfundene) Achievement-IDs werden akzeptiert; `checkAchievements` (`achievements.ts:78`) baut ein `Set` daraus → erfundene IDs sind inert, aber bereits „freigeschaltete" echte IDs lassen sich vorab eintragen.

**Ausnutzbar wie:** Datei öffnen → `"gold": 999999999` → laden → reich. Kein Crash, voll akzeptiert.
**Fix-Empfehlung:** In `migrateState` einen finalen `sanitize(state, content)`-Pass ergänzen:
- `gold = clampFinite(gold, 0, GOLD_HARD_CAP)`; alle `xp`-Felder `= clampFinite(xp, 0, xpForLevel(MAX_LEVEL))`.
- Inventar/Bank: `qty` auf `[1, STACK_HARD_CAP]` clampen (siehe V1.4), Slots mit `qty<=0` oder `!Number.isFinite` leeren; unbekannte `itemId` (nicht in `content.items` nach Rename) verwerfen statt durchreichen.
- Equipment-Slots: IDs gegen `content.items` prüfen; unbekannte → `null`.
- Das ist **kein** Anti-Cheat-Versprechen, sondern **Korruptions- & Crash-Schutz** mit Cheat-Nebeneffekt.

#### V1.2 — Kaputtes JSON crasht `deserialize` (nicht `parseSummary`) — **P2**
`parseSummary` (`:293`) hat `try/catch` → null bei Müll (getestet, `index.test.ts:41`). Aber `deserialize` (`:334`) macht `JSON.parse(json)` **ohne** try/catch. Aufrufer:
- `GameContext.importSave` (`:84`) ist in `try/catch` → ok.
- `GameContext.loadGame` (`:121`) ist **NICHT** in try/catch. Ein manuell auf Müll gesetzter Slot (oder ein abgeschnittener Save durch vollen Speicher) wirft beim Laden → unbehandelte Exception, Menü-Hänger.

**Fix-Empfehlung:** `deserialize` selbst defensiv machen (try/catch um `JSON.parse`, bei Fehler `LoadResult`-Fehlersignal statt throw) ODER `loadGame` in try/catch hüllen und dem Spieler einen sauberen „Spielstand beschädigt"-Dialog zeigen.

#### V1.3 — Riesige Arrays / zu viele Item-IDs — **P3**
`inventory.slots`/`bagSlots`/`combat.log` werden bei Migration nicht längenbegrenzt. Ein Save mit `slots.length = 10_000_000` oder Millionen Bank-Keys friert beim Laden/Rendern ein (DoS gegen sich selbst). Reiner Selbstschuss, daher P3 — aber `migrateState` synct Slot-Längen nicht gegen `effectiveCapacity`, sodass ein überlanges `slots`-Array bestehen bleibt, bis ein Kapazitäts-Event `syncSlots` triggert.
**Fix:** Im Sanitize-Pass `slots` auf `effectiveCapacity` trimmen (belegte zuerst), `combat.log` auf `COMBAT_LOG_MAX` kürzen.

#### V1.4 — Negative / Overflow-Mengen überleben Migration — **P2** (siehe auch Angreifer 3)
`migrateState` fasst `slot.qty` nie an. `qty: -5` oder `qty: 1e15` gelangt direkt in den Live-State.
**Fix:** wie V1.1 (qty clampen).

---

### Angreifer 2 — Zeit-Reisender / Clock-Cheater

#### V2.1 — Daily-Reset komplett an lokaler Systemuhr — **P1** (mitigierbar, nicht eliminierbar)
`apps/client/src/renderer/pages/QuestsPage.tsx:25` `todayStamp()` = `new Date()` (lokal). Bei jedem Mount/Tageswechsel ruft die Seite `refreshDailyQuests(state, content, todayStamp())` (`:361-369`). Die Engine selbst erzeugt bewusst keine Zeit (`quests.ts:191` Doku) und vertraut dem vom Client gelieferten `day`-Stempel.
**Exploit:** Systemuhr auf morgen stellen → `todayStamp()` springt → `refreshDailyQuests` zieht 6 neue Dailies + reset → alle 6 claimen → Uhr weiter vorstellen → **unbegrenzte Daily-Belohnungen + Streak-Pumpe**. Zusätzlich: Uhr genau einen Tag pro Reset vorstellen lässt `dailyStreak` (`quests.ts:248-256`, `day === nextCalendarDay(last)`) monoton hochzählen → `daily_streak`-Achievements trivial.
**Inhärenz:** Echte Eliminierung braucht eine vertrauenswürdige Zeitquelle (Server) — bei reinem SP-Idle nicht vorhanden. **Mitigation:**
- Monotonie-Schranke: `refreshDailyQuests` nur akzeptieren, wenn `day >= state.quests.daily.day` (bereits idempotent bei `===`, aber **Rückwärts**-Sprünge sind ungeprüft → erst vor-, dann zurückstellen ermöglicht beliebige Re-Rolls). Speichere zusätzlich `lastDailyDay` als **harte Untergrenze**: `day` < `lastDailyDay` → ignorieren.
- Streak nur +1, wenn echter Realzeit-Fortschritt plausibel (z.B. via gespeichertem `savedAt`-Delta gegen `day`-Delta gegengeprüft).

#### V2.2 — Offline-Cap umgehbar über gespeicherten `accumulatorMs` — **P2**
Offline-Berechnung: `offlineMs = clamp(now - savedAt, 0, MAX_OFFLINE_MS=24h)` (`persistence:337`) — der 24h-Deckel ist sauber und auch Negativ-`savedAt` (Zukunft) ist via `Math.max(0, …)` abgefangen (kein Crash, 0 Offline). **ABER**: `advance(state, content, offlineMs)` (`:344`) addiert `offlineMs` auf das **bereits geladene `state.accumulatorMs`** (`tick.ts:194`). `accumulatorMs` wird in `migrateState` nie validiert. Ein editierter Save mit `accumulatorMs = 9e18` lässt die `while`-Schleife in `advance` (`tick.ts:196`) effektiv „unendlich" viele Ticks fahren → entweder Mega-Offline-Gewinn oder Endlos-Freeze beim Laden.
**Fix:** `accumulatorMs` (und `actionProgressMs`, `stunMs`, alle Timer) in Sanitize auf `[0, TICK_MS)` bzw. plausible Obergrenzen clampen; in `advance` zusätzlich ein Hard-Cap auf `steps` pro Aufruf.

#### V2.3 — Zukunfts-`savedAt` — **P3 (kein Bug)**
`savedAt` in der Zukunft → `now - savedAt < 0` → `Math.max(0, …)` → 0 Offline. Korrekt behandelt, kein Crash. Nur erwähnt zur Vollständigkeit.

---

### Angreifer 3 — Dupe-/Economy-Exploiter

#### V3.1 — Quest/Daily-Doppel-Claim — **kein Exploit gefunden (gut!)** 
`claimQuest` (`quests.ts:149`) ist sauber guarded: `canClaimQuest` prüft `claimed.includes` (einmalig), `isDailyClaimed` (Daily 1×/Tag, `:137`) und Objektiv-Erfüllung; nach Claim wird `entry.claimed = true` gesetzt (`:178`) bzw. die ID in `claimed` gepusht. **Doppel-Claim im selben Tag/Zustand ist verhindert.** Der einzige Daily-Re-Claim-Weg ist der Clock-Cheat (V2.1), nicht eine fehlende Guard.

#### V3.2 — Negative Mengen vergiften Verkauf/Stacking — **P2**
`sellItem` (`shop.ts:56`) → `have = itemCount(...)`. `itemCount` (`inventory.ts:43`) **summiert `slot.qty` ohne Vorzeichen-Check**. Ein editierter Slot `{itemId:"gold_ore", qty:-3}` macht `itemCount` falsch; in Kombination mit einem zweiten positiven Stack desselben Items kann `removeItem` (`inventory.ts:130`, `Math.min(slot.qty, remaining)` — bei `slot.qty<0` ergibt `take<0`) die Buchhaltung verschieben. `addItem`/`addItemOrBank` schützen die *Eingangs*-Menge (`qty<=0 → return 0`, `:79/:120`), aber **nicht** bereits im State liegende negative Stacks.
**Fix:** Sanitize-Pass (V1.4) + defensiv in `itemCount`/`removeItem` `Math.max(0, slot.qty)` verwenden.

#### V3.3 — Über-Level-Mechanik / Trivial-Mob-Farm — **kein Exploit (gut)** 
`overLevelMult` (`shared:215`) dämpft XP/Gold sauber bei `skillLevel - monsterLevel > GRACE`, Floor 0.02. Mob-`level` ist im Content durchgängig gesetzt (`content:4588+`). **Falls** ein editierter/fehlerhafter Mob `level: undefined` hätte, würde `diff = skillLevel - undefined = NaN`, `NaN <= GRACE` → false, dann `Math.max(0.02, 1 - (NaN)*slope) = Math.max(0.02, NaN) = NaN` → XP/Gold würden `NaN`. Da aber alle Content-Mobs `level` haben, nur theoretisch — **P3-Defensive**: `overLevelMult` sollte `monsterLevel ?? skillLevel` o.ä. absichern.

#### V3.4 — Auto-Bank-Overflow — **kein Exploit (gut)** 
`addItemOrBank` (`inventory.ts:114`) schiebt Overflow korrekt ins Lager, keine Mengen-Duplikation. `withdrawItem` (`bank.ts:46`) prüft Bestand UND Inventarplatz, dekrementiert exakt. `depositItem` (`bank.ts:21`) clamped `Math.min(Math.max(0,qty), have)`. **Sauber.** Einziger Dreh: Bank-Mengen selbst sind per Save-Edit beliebig (V1.1).

#### V3.5 — Verkauf/Kauf — **kein Logik-Exploit (gut)** 
`buyItem` (`shop.ts:46`) prüft Gold + Platz vor Abzug; `sellItem` clamped an Bestand; `sellPrice` `Math.max(1,…)`. Kein Negativ-Preis-/Gratis-Kauf-Pfad. Gold selbst editierbar (V1.1).

---

### Angreifer 4 — Crasher / Softlocker

#### V4.1 — `accuracy/(accuracy+evasion)` = 0/0 → NaN — **P2**
`resolveAttack` (`combat.ts:156`): `hitChance = atk.accuracy / (atk.accuracy + def.evasion)`. Im Normalspiel unkritisch (Spieler-Accuracy startet bei 50, `computeStats:208` `50 + …`, Mob-Evasion > 0). **Aber:** Editierter Save mit Equipment-Boni, die `accuracy` auf 0 ziehen (negative `bonus.accuracy`), **gegen** einen (editierten) Mob mit `evasion:0` → `0/0 = NaN`. `nextFloat > NaN` → false → **Treffer zählt immer**, dann `raw = damage * …`; falls `damage` ebenfalls NaN/0-Edit, propagiert `NaN` in `enemyHp -= NaN` → `enemyHp` wird `NaN`, `NaN <= 0` false → **Gegner unsterblich, Kampf-Softlock** (kein Kill, kein Tod, Aktion blockiert).
**Fix:** `const denom = atk.accuracy + def.evasion; const hitChance = denom > 0 ? atk.accuracy/denom : 1;` plus `damage`/`hp` über `Number.isFinite` absichern.

#### V4.2 — NaN/Infinity in HP/Mana/Stats frisst sich in den Save — **P1**
Mehrere Stellen rechnen ungeprüft mit `state.character.hp/mana`:
- `tick.ts:212` `hp = Math.min(maxHp, hp + HP_REGEN*steps)` — falls `hp` bereits `NaN` (Save-Edit), bleibt `NaN` (kein Floor).
- `combat.ts:437/457` DoT: `enemyHp -= magnitude*(TICK/1000)`, `hp -= dmg`. `magnitude` aus Effekt — editierter `playerEffects:[{magnitude: Infinity}]` → `hp = -Infinity` → `hp <= 0` → `onPlayerDefeated` heilt voll (`combat.ts:401`), **aber** `-Infinity`/`NaN` kann zuvor in andere Formeln lecken.
- `computeStats` produziert bei `baseAttributes:{str: NaN}` durchgängig `NaN`-Stats; `attackIntervalMs` via `clamp(…, 800, 5000)` → `clamp(NaN)` = `Math.max(800, Math.min(5000, NaN))` = `Math.max(800, NaN)` = `NaN` → `playerTimerMs >= NaN` nie wahr → **Spieler greift nie an** (Softlock).

Der „frisst sich in den Save"-Teil: Sobald `hp`/`mana`/`attr` einmal `NaN` sind, schreibt das nächste Autosave (alle 30 s, `GameContext:49`) den `NaN`-State zurück (als `null` in JSON via `JSON.stringify(NaN)===null` — beim nächsten Laden wird `null` evtl. zu Default, ABER verschachtelte `NaN` in Arrays/Zahlenfeldern serialisieren als `null` und brechen Typannahmen).
**Fix:** Sanitize-Pass auf alle numerischen Live-Felder (`Number.isFinite`-Guard, sonst Default); `clamp` defensiv gegen `NaN` (`if (!Number.isFinite(v)) return min`). Höchste Priorität, weil es einen Save **dauerhaft unspielbar** machen kann.

#### V4.3 — Tooltip-Pfad / fehlende Content-Refs — **größtenteils gehärtet (gut)** 
Stichproben zeigen durchgängiges `content.items[id]?.…` / `content.monsters[id]` mit Null-Guards (`combat.ts:99,557` `if (!monster) … return`, `equipItem` `if (!item…) return`). Ein editiertes `equipment.mainhand:"nonexistent"` wird in `computeStats:135` (`if (!item) continue`) und `combat.ts:412` sauber ignoriert. **Keine offensichtliche Crash-Stelle** über fehlende Refs gefunden — solide.

#### V4.4 — Falscher Equip-Slot — **kein Crash, aber Slot-Spoofing möglich** — **P3**
`equipItem` (`equipment.ts:36`) vertraut `item.slot` aus dem Content. Per Save-Edit kann man ein Item ohnehin direkt in `equipment[slot]` schreiben (umgeht `equipItem` ganz). `computeStats` liest dann dessen `modifiers`/`bonus` — ein in den falschen Slot geschriebenes Item wirkt voll. Inhärent (Save-Edit). Mitigation: optionaler Slot-Konsistenz-Check im Sanitize (`content.items[equip[slot]].slot === slot`), sonst ablegen.

#### V4.5 — Leeres Inventar/Bank, leere States — **robust (gut)** 
`createInventory`, alle Iterationen tolerieren leere Arrays; `migrateState` füllt fehlende Strukturen. Kein Crash bei leerem Inventar/Bank.

---

### Angreifer 5 — Logic-Abuser

#### V5.1 — Pet-Drop-RNG via Reload re-rollbar — **P2**
`tryPetDrop` (`pets.ts:189`) zieht aus `state.rng` (mulberry32, **im Save serialisiert**, `rng.ts:8`). Determinismus ist gewollt, hat aber eine Kehrseite: Der RNG-Zustand ist Teil des Save. Ein Spieler kann **vor** einer Aktion speichern/exportieren, die Aktion ausführen; bei Misserfolg den Save **neu laden** → identischer `rng.state` → er kann gezielt so lange Aktionen/Reihenfolgen variieren, bis der Pet-Drop fällt („Save-Scumming"). Da `nextFloat` nur bei vorhandenem, noch nicht besessenem Pet zieht, ist die Sequenz vorhersehbar reproduzierbar.
Zusätzlich (härter): Wer den Save editiert, kann `rng.state` direkt auf einen Wert setzen, der beim nächsten Wurf trifft — oder schlicht `ownedPets` setzen (V1.1). Pet-Drops sind also **nicht** gegen Manipulation geschützt.
**Inhärenz:** Save-Scumming ist in jedem SP-Idle-Game ohne Server möglich. **Mitigation (Komfort, nicht Sicherheit):** Auto-Save unmittelbar nach jedem RNG-ziehenden Event (verkürzt das Re-Roll-Fenster), und RNG-Zustand nicht in der exportierbaren Summary spiegeln. Echte Härtung nur serverseitig.

#### V5.2 — Mana-Schild + Lifesteal-Interaktion — **sauber gedeckelt (gut)** 
`applyManaShield` (`combat.ts:182`) ist doppelt begrenzt (Anteil `MANA_SHIELD_ABSORB_PCT` UND vorhandenes Mana), greift NACH Mitigation, verbraucht echten Mana-Pool. Lifesteal (`combat.ts:535`) ist doppelt gekappt (% von maxHp UND absolut). **Keine Unsterblichkeits-Schleife** über legitime Mechanik — die Deckel sind gut gewählt. (Mana/HP selbst per Save editierbar → V1.1/V4.2.)

#### V5.3 — Auto-Eat-Timing — **kein Exploit (gut)** 
`tryAutoEat` (`combat.ts:43`) wird pro Tick mehrfach geprüft (nach DoT, nach Gegner-Schlag), heilt nur bis `maxHp`, verbraucht echtes Food aus dem Inventar. Keine Gratis-Heilung. Threshold/Mult kommen aus `autoEatTier` (`shared:147`), das den Tier-Index bereits **defensiv clamped** (`Math.max(0, Math.min(AUTO_EAT_MAX_TIER, tier))`) → ein editierter `autoEatTier:999` crasht NICHT, sondern fällt auf den Max-Tier zurück. **Sauber, kein Handlungsbedarf.**

#### V5.4 — Enrage — **kein Exploit (gut)** 
`combat.ts:612` `enrage && enemyHp/maxHp <= belowHpPct` → `damageMult`. Rein zugunsten des Gegners, kein Spieler-Vorteil. Bei `maxHp:0`-Edit → `enemyHp/0 = Infinity/NaN`, aber Mob mit `maxHp:0` ist sofort tot (`enemyHp = maxHp = 0 <= 0`). Randfall, P3.

#### V5.5 — Achievement/AP-Gaming, Mastery, Stat-Overflow — **siehe V1.1** 
Achievements/Mastery werden aus kumulativen Zählern abgeleitet (`achievements.ts`, `mastery`), die alle per Save editierbar sind. `checkAchievements` ist idempotent (Set, kein Doppel-Unlock). Mastery-Boni sind im Content gedeckelt (`masteryDoubleChance` etc.). Kein Logik-Loop — nur die Save-Edit-Fläche (V1.1).

#### V5.6 — Daily-Streak-Manipulation — **siehe V2.1** (Clock-Cheat + direkter `dailyStreak`-Edit).

---

## 3. Priorisierte Härtungs-Liste

### P0 — sofort (Crash/Soft-Brick-Schutz, billig)
*(Kein „echtes" P0 im Sinne von Remote-Crash gefunden — aber die folgenden P1 sind die De-facto-Top-Prioritäten, da sie einen Save dauerhaft zerstören können.)*

### P1
1. **Zentraler `sanitizeState(state, content)`-Pass am Ende von `migrateState`** (`persistence/src/index.ts`). Pflicht-Bestandteile:
   - Alle numerischen Felder durch `finite(v, default)`: `gold, hp, mana, accumulatorMs, actionProgressMs, stunMs, totalLevel, elapsedMs, totalTicks`, alle `skills[].xp`, `mastery[].xp`, `bank[]`, `inventory.slots[].qty`, alle `*Effects[].magnitude/remainingMs`, `baseAttributes[]`.
   - Clamping: `gold∈[0, CAP]`, `xp∈[0, xpForLevel(MAX_LEVEL)]`, `qty∈[1, STACK_CAP]` (Slot leeren wenn `<=0`/`!finite`), Timer auf plausible Obergrenzen. (`autoEatTier` ist bereits in `autoEatTier()` geclamped — optional, nicht nötig.)
   - Referenz-Validierung: `inventory/bank/equipment/food`-IDs gegen `content.items` (nach Rename) — unbekannt → verwerfen/`null`. Equipment-Slot-Konsistenz prüfen.
   - Array-Trimming: `slots`→`effectiveCapacity`, `combat.log`→`COMBAT_LOG_MAX`.
   → deckt V1.1, V1.3, V1.4, V2.2, V3.2, V4.2, V4.4 in einem Schlag ab.
2. **`clamp` NaN-fest machen** (`character.ts:28`): `if (!Number.isFinite(value)) return min;` — verhindert NaN-Stats-Soft-Brick (V4.2).
3. **`resolveAttack` Division absichern** (`combat.ts:156`): `denom>0 ? acc/denom : 1`; Schadens-/HP-Writes über `Number.isFinite`-Guard (V4.1).
4. **Clock-Cheat-Mitigation für Dailies** (`quests.ts:241` / `QuestsPage.tsx`): harte Monotonie — `day < state.stats.lastDailyDay` (Rückwärtssprung) ignorieren; Streak-Inkrement gegen `savedAt`-Realzeit plausibilisieren (V2.1, V5.6).

### P2
5. **`deserialize` crash-fest** (`persistence:334`): `JSON.parse` in try/catch, sauberes Fehlersignal; `loadGame` (`GameContext:121`) Fehlerdialog statt Exception (V1.2).
6. **`advance` Step-Hardcap** (`tick.ts:194`): max. Tickzahl pro Aufruf deckeln, damit ein riesiger `accumulatorMs` nicht einfriert (V2.2).
7. **`itemCount`/`removeItem` vorzeichensicher** (`inventory.ts`): `Math.max(0, slot.qty)` (V3.2).
8. **Auto-Save direkt nach RNG-Events** (combat/tick) zur Verkürzung des Save-Scum-Fensters (V5.1, Komfort-Mitigation).

### P3
9. `overLevelMult` gegen `undefined` Mob-Level absichern (`shared:215`) (V3.3).
10. Equipment-Slot-Spoofing im Sanitize prüfen (V4.4); `enrage` `maxHp:0`-Randfall (V5.4).

---

## Abschlussbericht

**Top-3 P0/P1-Härtungen (höchste Hebelwirkung):**
1. **Zentraler `sanitizeState`-Pass in `migrateState`** (`packages/persistence/src/index.ts:29`) — clamped/validiert ALLE Zahlen & Referenzen beim Laden. Schließt die mit Abstand größte Fläche (Save-Edit-Gold/Level/Items/Mengen, NaN-Injektion, riesige Arrays, Offline-Cap-Umgehung via `accumulatorMs`) in einer Funktion.
2. **NaN-feste Formeln** — `clamp` (`character.ts:28`) und `resolveAttack`-Division (`combat.ts:156`) gegen `NaN`/`0-0` absichern. Verhindert den schlimmsten Fall: einen **dauerhaft soft-gebrickten Spielstand** (unsterblicher Gegner / Spieler greift nie an).
3. **Clock-Cheat-Mitigation für Dailies** (`packages/engine/src/quests.ts:241` + `apps/client/src/renderer/pages/QuestsPage.tsx:25`) — Monotonie-Schranke gegen Uhr-Zurückstellen + Streak-Plausibilisierung.

**Positiv-Befunde (bereits robust, kein Handlungsbedarf):** Quest/Daily-Doppel-Claim-Guards, Mana-Schild/Lifesteal-Deckel, Auto-Eat, Bank-Transfers, Shop-Kauf/Verkauf, Over-Level-Dämpfung, Null-Guards für fehlende Content-Refs (Tooltip-/Equip-Pfade).

**Einordnung:** Kein Befund ist ein Remote-/Mehrspieler-Exploit (reines SP-Idle). Die „Cheat"-Vektoren (Gold/Level/Items/Pets/Streak) sind **inhärent** durch den editierbaren Client-Save — sie lassen sich nicht eliminieren, nur durch Sanity-Clamping plausibel begrenzen. Der **echte, fixbare** Kern ist Robustheit: Crash- und Soft-Brick-Schutz beim Laden manipulierter/beschädigter Saves. Das ist mit den drei Top-Härtungen mit überschaubarem Aufwand erreichbar.

**Doc-Pfad:** `G:\GameDev\design\playtests\security-adversarial-r1.md`
