# Achievement-System 2.0 — Design-Doc (Planung, kein Code)

Autor: Logic-Dev · Datum: 2026-06-25 · Status: ENTWURF (wartet auf Chef-Freigabe)

Ziel des Chefs: **VIEL mehr Erfolge** (Hunderte) plus **Achievement-Points** als
vergleichbarer Score, an dem sich Spieler messen. Dieses Doc beschreibt Taxonomie,
Punkte-Schema, eine skalierbare (datengetriebene + generierte) Architektur, UI und
die Umsetzungsphasen. **Es wird hier nichts implementiert.**

---

## 0. Bestandsaufnahme (Ist-Zustand)

### Engine — `packages/engine/src/achievements.ts`
- Eine einzige Funktion `checkAchievements(state, content): string[]`.
- Iteriert `content.achievements`, überspringt bereits Freigeschaltete
  (`state.achievements.includes(id)`), prüft `condition.type` per `switch`.
- **Genau 4 condition.types** (Playtest-Befund bestätigt): `totalLevel`, `kills`,
  `itemsGathered`, `gold`.
- **Keine Punkte, keine Rewards, keine Kategorien, kein Fortschritt** (nur binär
  freigeschaltet ja/nein). Kein Tier-/Seltenheitsbegriff.

### Shared — `packages/shared/src/index.ts`
```ts
export type AchievementCondition = {
  type: "totalLevel" | "kills" | "itemsGathered" | "gold";
  value: number;
};
export interface AchievementDef {
  id: string; name: LocalizedString; description: LocalizedString;
  icon?: string; condition: AchievementCondition;
}
```
- `GameState.achievements: string[]` (Set freigeschalteter IDs).
- `SAVE_VERSION = 27`.

### Content — `packages/content/src/index.ts`
- **10 Achievements von Hand**: 3× totalLevel, 3× kills, 2× itemsGathered, 2× gold.
- Inhaltsumfang fürs Sizing: **24 Skills**, **58 Monster**, **10 Zonen**,
  **~6–8 Dungeons** (`content.dungeons`), **~900 Item-IDs**.

### UI — `apps/client/src/renderer/pages/StatsPage.tsx`
- `achievements-panel`: simples Grid „freigeschaltet/gesperrt", Zähler
  `unlocked / total`. Completion-Zeile `completion.achievements`. Keine Kategorien,
  kein Fortschrittsbalken, keine Punkte. i18n-Keys unter `achievements.*` /
  `completion.*` in `translations.ts`.

### Vorhandene State-Zähler (gegen die wir prüfen können — KEINE neuen Hooks nötig)
| Quelle | Bedeutung | Achievement-Nutzung |
|---|---|---|
| `state.character.totalLevel` | Gesamtlevel | „alle Skills auf X" indirekt, Gesamtlevel-Tiers |
| `state.character.gold` | aktueller Goldstand | Wealth-Tiers (gehalten) |
| `state.skills[id].xp` → `levelFromXp` | Skill-Level | per-Skill-Level-Erfolge |
| `state.mastery[actionId].xp` | Mastery-Level je Aktion | Mastery-Meilensteine |
| `state.stats.kills` | Gesamt-Kills | Combat-Tiers |
| `state.stats.deaths` | Tode | „X Kills ohne Tod"-Annäherung / Meta |
| `state.stats.itemsGathered` | gesammelte/gelootete Items | Gathering-Tiers |
| `state.stats.itemsCrafted` | geschmiedete Items gesamt | Crafting-Tiers |
| `state.stats.craftedById[itemId]` | je Item geschmiedet | „jedes Schmiede-Tier 1× craften" |
| `state.monsterKills[monsterId]` | Kills je Monster | per-Monster-Kill-Tiers, Boss-Kills |
| `state.seenDrops[monsterId]` | entdeckte Drops je Monster | Collection-Log / seltene Drops |
| `state.bank` + `state.inventory` | Besitz | „X verschiedene Items besessen" |
| `state.quests.claimed` | eingelöste Quests | Quest-Erfolge |
| `state.quests.daily` | Daily-State | Daily-bezogene Erfolge (eingeschränkt, s.u.) |

### Bestätigte Tracking-LÜCKEN (kein vorhandener Zähler)
- **`dungeonsCleared`** existiert NICHT. `state.combat.dungeonId` wird nach Clear/Tod
  nur auf `null` gesetzt; es gibt keinen kumulativen „Dungeon X N-mal geclear"-Zähler.
- **`goldSpent`** existiert NICHT (Shop/Quests addieren/subtrahieren Gold, ohne Summe).
- **`bossKills` / Boss-Flag**: kein eigenes Feld; Boss-Kills nur über
  `monsterKills[bossId]` ableitbar, falls Bosse als Monster mit ID existieren.
- **Daily-Streaks**: kein Streak-Zähler (`state.quests.daily` kennt nur den aktuellen
  Tag, keine fortlaufende Serie).

> Wichtig: Das Quest-System löst denselben „lese vorhandene Zähler"-Ansatz bereits
> sauber (siehe `quests.ts → rawProgress`). Wir spiegeln dieses Muster 1:1.

---

## 1. Taxonomie — Masse an Erfolgen

Leitprinzip: **gestaffelte Tiers** (gleicher Zähler, mehrere Schwellen) erzeugen
billig Masse. „Pro Skill / pro Monster / pro Item-Tier" multipliziert das weiter.
Jede Kategorie unten nennt konkrete Beispiele + geschätzte Anzahl.

### A. Skilling (≈ **264**)
- **Per-Skill-Level alle 10 Level**: 10/20/30/40/50/60/70/80/90/**99** je Skill.
  → 10 Stufen × **24 Skills = 240**.
  - Beispiel: `ach_skill_woodcutting_50` „Holzfäller-Veteran — Holzfällen Stufe 50".
- **„Alle Skills auf X"**: Gesamt-Schwellen über `min(level über alle Skills)` —
  X ∈ {10, 25, 50, 75, 99}. → **5**.
  - Beispiel: `ach_all_skills_50` „Alleskönner — jede Fertigkeit mind. Stufe 50".
- **Gesamtlevel-Tiers** (gehalten/erweitert): 25/100/250/500/1000/1500/max.
  → **~7**.
- **Mastery-Meilensteine**: „erste Aktion auf Mastery 99", „10 Aktionen auf
  Mastery 99", „X Aktionen gemeistert". → **~6**.
- **Skill-Vielfalt**: „erste Aktion in jeder Sammel-Fertigkeit", „erste in jeder
  Verarbeitung". → **~6**.

### B. Combat (≈ **240**)
- **Per-Monster-Kill-Tiers**: 10/100/1000 je Monster.
  → 3 × **58 = 174**. (Optional 4. Tier 5000 für Boss-/Endgame-Monster.)
  - Beispiel: `ach_kill_goblin_brute_100` „Goblin-Schreck — 100 Goblin-Schläger erlegt".
- **Gesamt-Kills-Tiers**: 10/100/1000/5000/10000/25000/100000. → **~7**.
- **Jeden Boss besiegen**: 1 Erfolg je Boss (Bosse = markierte Monster-IDs).
  → **~8** (abhängig davon, wie viele Monster als Boss gelten).
- **Jeden Dungeon clearen**: 1 Erfolg je Dungeon + „alle Dungeons geclear".
  → **~8** (BENÖTIGT neuen `dungeonsCleared`-Zähler, s. §3).
- **Zonen-Komplettierung**: „jedes Monster einer Zone mind. 1×" je Zone (10 Zonen)
  + „jedes Monster im Spiel mind. 1× (Bestiarium voll)". → **~12**.
- **No-Death-Erfolge**: „1000 Kills bei `deaths == 0`" u. ä. — als Meilenstein
  realisierbar, aber spröde (ein einziger Tod sperrt dauerhaft). Empfehlung:
  wenige, klar kommunizierte Stufen. → **~3**. *(Design-Hinweis: echtes
  „Streak ohne Tod" bräuchte einen Streak-Zähler; aus dem MVP herauslassen.)*

### C. Gathering / Crafting (≈ **40**)
- **Gather-Tiers**: 100/1000/10000/100000/1Mio (`itemsGathered`). → **~5**.
- **Craft-Tiers**: 100/1000/10000/100000 (`itemsCrafted`). → **~4**.
- **„Jedes Schmiede-/Verarbeitungs-Tier einmal craften"**: je relevantes
  Output-Item ein „mind. 1× geschmiedet" (`craftedById[item] >= 1`). Selektiv auf
  Leit-Items pro Tier statt aller ~900 Items. → **~20**.
- **Craft-/Sammel-Vielfalt**: „X verschiedene Items geschmiedet", „in jeder
  Verarbeitungs-Fertigkeit etwas hergestellt". → **~6**.
  - *Vielfalts-Zähler* lassen sich aus `craftedById`/`seenDrops` lesend ableiten
    (Anzahl Keys ≥ N) — kein neuer State nötig.

### D. Quests (≈ **15**)
- **N Quests eingelöst**: 1/10/25/50/100 (`quests.claimed.length`). → **~5**.
- **Alle Story-Quests**: „komplette Story-Linie abgeschlossen". → **1**.
- **X Dailies eingelöst (lifetime)**: 10/50/100. → **~3**. *(BENÖTIGT lifetime-
  Daily-Zähler; aktuell nicht vorhanden — s. §3. Sonst weglassen.)*
- **Daily-Streaks**: 7/30 Tage Serie. → **~2**. *(BENÖTIGT Streak-State — Phase 2.)*
- **Quest-Vielfalt / Schwierigkeit**: „erste Master-Daily eingelöst" etc. → **~4**.

### E. Wealth / Economy (≈ **12**)
- **Gold gehalten**: 1k/10k/100k/1Mio/10Mio/100Mio (`character.gold`). → **~6**.
- **Gold ausgegeben (lifetime)**: 1k/100k/1Mio. → **~3**. *(BENÖTIGT `goldSpent`-
  Zähler — s. §3.)*
- **Reichtums-Meta**: „erste 6-stellige Goldsumme", „Bank voll mit Wert X". → **~3**.

### F. Collection (≈ **70**)
- **Items entdeckt (Collection-Log)**: 10/50/100/250/500/„alle"
  (Summe entdeckter Item-IDs über `seenDrops` + jemals besessen). → **~6**.
- **Seltene Drops**: 1 Erfolg je definiertem „rare/epic"-Drop (selektiv auf die
  Marken-Drops, nicht alle 900). → **~50**.
  - Beispiel: `ach_drop_godwood_log` „Götzenholz erbeutet".
- **Set-Komplettierung**: je Ausrüstungs-Set „komplett besessen/getragen". → **~?**
  (abhängig von Set-Anzahl im Content; aktuell keine Sets gefunden → später).
- **Bestiarium**: „X Monster entdeckt" 10/25/58. → **~3**. *(Überschneidet sich mit
  Combat-Zonen — als eigene Collection-Kette führen.)*

### G. Exploration / Meta (≈ **20**)
- **Zonen freischalten**: je Zone „betreten/freigeschaltet". → **~10**.
  *(Braucht ein Zonen-Unlock-Signal; falls nicht vorhanden, via „erstes Monster
  der Zone gekillt" annähern.)*
- **Achievement-Meta**: „25% / 50% / 75% / 100% aller Erfolge freigeschaltet" und
  „X Achievement-Points erreicht". → **~8**.
  - **Design-Regel:** Meta-Erfolge zählen für die Completion-% mit, geben aber
    **0 Punkte oder eigene Punkte aus einem separaten Pool**, sonst entsteht eine
    rekursive Punkte-Schleife (Punkte aus „X Punkte erreicht"). Empfehlung:
    Meta-Erfolge **geben 0 AP** und dienen nur als Badges.
- **Spielzeit/Idle-Meta**: „X Stunden gespielt" via `elapsedMs`. → **~2**.

### Geschätzte Gesamtzahl
| Kategorie | ~Anzahl |
|---|---:|
| A. Skilling | 264 |
| B. Combat | 240 |
| C. Gathering/Crafting | 40 |
| D. Quests | 15 |
| E. Wealth/Economy | 12 |
| F. Collection | 70 |
| G. Exploration/Meta | 20 |
| **Summe** | **≈ 660** |

> **Zielgröße: ~600–700 Erfolge.** Davon entstehen ~95 % **programmatisch generiert**
> (Skilling-Level-Tiers, Per-Monster-Tiers), der Rest von Hand kuratiert (Meta,
> seltene Drops, Story). Eine MVP-Teilmenge (~150) lässt sich ohne neue State-Zähler
> sofort liefern (alles außer dungeonsCleared/goldSpent/Daily-lifetime/Streak).

---

## 2. Achievement-Points-Schema

Jeder Erfolg trägt eine **Seltenheits-/Schwierigkeitsstufe** mit festem Punktwert.
Score = Summe der AP aller freigeschalteten Erfolge → **direkt vergleichbar**.

### Punkte-Tiers
| Tier | AP | Einsatz (Beispiel) |
|---|---:|---|
| `common`    | **5**   | erste/leichte Stufe (Skill 10, 10 Kills, 100 gathered) |
| `uncommon`  | **10**  | mittlere Stufe (Skill 30–50, 1000 Kills) |
| `rare`      | **25**  | hohe Stufe (Skill 70–80, 10k Kills, seltener Drop) |
| `epic`      | **50**  | sehr hoch (Skill 99 eines Skills, alle Skills 50) |
| `legendary` | **100** | Endgame (alle Skills 99, Bestiarium voll, alle Dungeons) |

Zuordnung **regelbasiert** (im Generator, nicht von Hand):
- Skill-Level → 10/20=common · 30/40/50=uncommon · 60/70/80=rare · 90=rare · 99=epic.
- Per-Monster-Kill → 10=common · 100=uncommon · 1000=rare.
- Gesamt-Tiers (kills/gold/gather) → frühe=common, mittlere=uncommon/rare, Top=epic/legendary.
- Per-Boss/Per-Dungeon → rare; „alle Bosse"/„alle Dungeons" → legendary.
- Meta-Erfolge → **0 AP** (Badges, s. §1 G).

### Geschätzte Gesamtpunktzahl
Grobe Verteilung über ~660 Erfolge (ohne Meta-0-AP):
- common ≈ 230 × 5 = 1.150
- uncommon ≈ 200 × 10 = 2.000
- rare ≈ 150 × 25 = 3.750
- epic ≈ 50 × 50 = 2.500
- legendary ≈ 20 × 100 = 2.000
→ **Gesamt ≈ 11.000–12.000 Achievement-Points** im Vollausbau. Runde, kommunizierbare
Hausnummer fürs Marketing: „über 10.000 Punkte zu erspielen".

### Optionale Belohnungen (Chef-Entscheidung)
- **Reine Score-Variante (empfohlen für 1.0):** AP sind nur Score/Prestige, keine
  spielmechanische Belohnung. Hält die Balance sauber und entkoppelt Achievements
  von Progression.
- **Reward-Variante (später):** Punkte-Schwellen schalten kosmetische Titel/Badges
  oder kleine Boni frei. Würde `AchievementDef.reward` analog `QuestReward`
  erfordern → eigener Slice. **Nicht im MVP.**

---

## 3. Skalierbare Architektur

### 3.1 Erweitertes `AchievementDef` (shared)
```ts
export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const ACHIEVEMENT_POINTS: Record<AchievementRarity, number> = {
  common: 5, uncommon: 10, rare: 25, epic: 50, legendary: 100,
};

export type AchievementCategory =
  | "skilling" | "combat" | "gathering" | "crafting"
  | "quests" | "wealth" | "collection" | "exploration" | "meta";

export type AchievementCondition =
  // bestehende 4 — Rückwärtskompatibilität gewahrt:
  | { type: "totalLevel"; value: number }
  | { type: "kills"; value: number }
  | { type: "itemsGathered"; value: number }
  | { type: "gold"; value: number }
  // neue, an Quest-Objective-Typen angelehnt (Wiederverwendung der Zähler):
  | { type: "skillLevel"; target: SkillId; value: number }     // levelFromXp(skills[target].xp)
  | { type: "allSkillsLevel"; value: number }                  // min level über alle Skills
  | { type: "monsterKills"; target: MonsterId; value: number } // monsterKills[target]
  | { type: "itemsCrafted"; value: number }                    // stats.itemsCrafted
  | { type: "craftItem"; target: ItemId; value: number }       // craftedById[target]
  | { type: "questsCompleted"; value: number }                 // quests.claimed.length
  | { type: "itemsDiscovered"; value: number }                 // |union(seenDrops, besessen)|
  | { type: "dropDiscovered"; target: ItemId }                 // item in seenDrops/Besitz
  | { type: "masteryLevel"; target: ActionId; value: number }  // mastery[target] level
  | { type: "masteredActions"; value: number }                 // #Aktionen mit Mastery 99
  | { type: "goldSpent"; value: number }                       // NEU: state.stats.goldSpent
  | { type: "dungeonsCleared"; target?: DungeonId; value: number } // NEU: state.dungeonsCleared
  | { type: "achievementPoints"; value: number }               // Meta (0 AP)
  | { type: "achievementsUnlocked"; value: number };           // Meta (0 AP)

export interface AchievementDef {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  icon?: string;
  category: AchievementCategory;
  rarity: AchievementRarity;          // → Punkte via ACHIEVEMENT_POINTS
  hidden?: boolean;                   // optional: erst nach Unlock sichtbar
  condition: AchievementCondition;
}
```

**Naming-/Übersetzungs-Strategie für generierte Erfolge:** Damit die ~600 Defs nicht
600 handgeschriebene `LocalizedString`s brauchen, nutzen generierte Erfolge
**Template-Strings mit Platzhaltern** (Skill-/Monster-Name via `content`, Zahl via
`value`). Der Generator setzt `name/description` aus wenigen Schablonen je
condition.type zusammen, die lokalisierten Entitätsnamen kommen aus `content`
(`skills[id].name`, `monsters[id].name`). So bleiben nur ~15 Schablonen × 2 Sprachen
zu pflegen statt 1.200 Strings.

### 3.2 Generator (der Schlüssel zur Wartbarkeit)
Repetitive Erfolge werden **NICHT von Hand** in den Content geschrieben, sondern
**programmatisch erzeugt**. Empfohlene Heimat: eine reine Funktion im **content**-Paket
(z. B. `buildGeneratedAchievements(coreData): AchievementDef[]`), die beim
Zusammenbau von `content.achievements` mit den handkuratierten Defs zusammengeführt
wird. (Engine bleibt rein; Generator ist Content-Aufbau, kein Laufzeit-State.)

Generator-Bausteine:
- `forEachSkill × [10,20,…,99]` → `skillLevel`-Erfolge (240 Stück).
- `forEachMonster × [10,100,1000]` → `monsterKills`-Erfolge (174 Stück).
- Tier-Listen für `kills/gold/gather/craft/quests` → Gesamt-Tier-Erfolge.
- Kuratierte Listen (seltene Drops, Bosse, Dungeons, Meta) bleiben handgeschrieben.

**ID-Konvention (stabil & migrationssicher):**
`ach_<cat>_<key>_<value>` — z. B. `ach_skill_woodcutting_50`,
`ach_kill_goblin_brute_100`, `ach_gold_1000000`. IDs sind deterministisch aus
(condition.type, target, value) ableitbar → der Generator erzeugt sie reproduzierbar,
und Saves referenzieren nur diese stabilen Strings.

> **Guard:** Ein Test stellt sicher, dass alle generierten IDs **eindeutig** sind und
> nicht mit handkuratierten kollidieren.

### 3.3 Engine — `checkAchievements` Erweiterung
- Bleibt **eine** Funktion, identisches Muster (über `content.achievements` iterieren,
  bereits freigeschaltete überspringen, `condition.type`-`switch`).
- Neue `case`-Zweige lesen **ausschließlich vorhandene Zähler** (plus die zwei neuen
  `goldSpent`/`dungeonsCleared`, falls Chef die Combat/Shop-Erfolge will).
- **Performance:** Bei ~660 Defs × Aufruf pro Tick wäre eine lineare Volliteration
  teuer. Empfehlung:
  1. `checkAchievements` **nicht jeden Tick**, sondern gedrosselt (z. B. alle N Ticks
     bzw. bei relevanten Events am Tick-Ende, analog `evaluateQuests`), ODER
  2. nur über **noch nicht freigeschaltete** Defs iterieren (ein `Set` der offenen
     IDs mitführen; nach Unlock entfernen). Bei 660 Defs ist Option 2 trivial billig.
- `levelFromXp` für `skillLevel`/`masteryLevel` wie in `quests.ts` wiederverwenden.

### 3.4 Punkte-Aggregation (Single Source)
- Reine Helper im **shared**-Paket:
  ```ts
  export function achievementPoints(def: AchievementDef): number
  export function earnedAchievementPoints(state, content): number  // Σ über unlocked
  export function totalAchievementPoints(content): number          // Σ über alle
  ```
- **Score wird NICHT im State gespeichert**, sondern jederzeit aus
  `state.achievements` + `content` **abgeleitet** (deterministisch, keine
  Save-Migration für den Score nötig, kann nie „falsch" persistiert werden).
  - Vorteil: spätere Punkt-Rebalancing-Änderungen wirken sofort ohne Migration.

### 3.5 Persistenz & SAVE_VERSION
- `GameState.achievements: string[]` **bleibt unverändert** → bestehende Saves laden
  weiter, alte IDs (`ach_kills_10` etc.) bleiben gültig (wir behalten sie als
  generierte IDs bei!).
- **SAVE_VERSION-Bump NUR**, wenn neue **State-Zähler** eingeführt werden:
  - `state.stats.goldSpent: number` (default 0) — für Economy-Erfolge.
  - `state.dungeonsCleared: Record<DungeonId, number>` (default `{}`) — für
    Dungeon-Erfolge.
  - `state.stats.dailiesClaimedLifetime: number` + Streak-State — nur falls Phase 2.
  → Pro neuem Feld: **`SAVE_VERSION` erhöhen (27 → 28)**, `migrateState`-Branch
    default-initialisiert die Felder, Persistenz-Test um Migration ergänzen.
- **Wenn der Chef die MVP-Teilmenge ohne neue Zähler will, ist KEIN Bump nötig** —
  reine Content-/Engine-/UI-Erweiterung. (Empfohlener erster Schritt.)
- **Keine Item-ID-Renames** durch dieses Feature → keine Inventar-/Bank-Key-Migration.

---

## 4. UI / Vergleich

Owner: ui-dev (Renderer). Logic-Dev liefert die Helper (`earned/total points`,
`category`, `rarity`, Fortschrittswert je Def).

- **Eigene Achievements-Seite** (aus dem StatsPage-Panel herauslösen; 660 Karten
  brauchen Platz + Filter):
  - **Kategorie-Tabs/Akkordeons** (`AchievementCategory`), je Kategorie ein
    Completion-Zähler.
  - **Fortschrittsbalken pro Erfolg** (aktueller Zählerstand / `value`) — analog
    Quest-Fortschritt; nutzt dieselbe „rawProgress"-Idee.
  - **Punkte pro Karte** (rarity-Badge mit AP-Wert + Farbe).
- **Prominente Punkte-Anzeige (der „messen"-Aspekt):**
  - Kopfzeile: **`Achievement-Points: erspielt / gesamt`** + **Completion-%**.
  - Optional im Hauptmenü/Charakter-Header als Prestige-Zahl sichtbar.
- **Vergleichs-/Leaderboard-Hook (später):** Da der Score eine reine, deterministische
  Funktion aus `state.achievements` ist, lässt er sich trivial exportieren
  (Save-Code/Share). 1.0: lokaler Score sichtbar; ein Leaderboard-Endpoint ist ein
  reiner UI/Backend-Anhang ohne Engine-Änderung.
- **i18n:** alle Texte über `LocalizedString`/`translations.ts`; generierte Erfolge
  über Schablonen (s. §3.1). Keine hartkodierten Strings.

---

## 5. Umsetzungs-Phasen

### Phase 0 — Freigabe (jetzt)
Chef entscheidet: (a) Zielumfang (~660 oder MVP ~150), (b) reine Score-Variante vs.
Rewards, (c) ob die neuen Zähler `goldSpent`/`dungeonsCleared`/Daily-Streak dazu sollen
(→ SAVE_VERSION-Bump).

### Phase 1 — Engine/Types-Fundament (Logic-Dev)
1. `AchievementDef` um `category`, `rarity` erweitern; `AchievementCondition`-Union
   um die neuen Typen (shared). Punkte-Helper + `ACHIEVEMENT_POINTS` (shared).
2. `checkAchievements` um die neuen `case`-Zweige (lesen vorhandene Zähler).
   Open-Set-Optimierung (§3.3).
3. **Falls neue Zähler freigegeben:** State-Felder + `SAVE_VERSION 27→28` +
   `migrateState`-Branch + Persistenz-Migrationstest.
4. **Guard-Test erweitern** (Pflicht, verhindert „definiert-aber-nie-geprüft"):
   `HANDLED`-Set in `achievements.test.ts` um ALLE neuen condition.types ergänzen;
   Test schlägt fehl, sobald Content einen ungeprüften Typ nutzt.

### Phase 2 — Generator + Content-Defs (content-dev)
1. `buildGeneratedAchievements()` (Skilling-Level, Per-Monster-Kill, Gesamt-Tiers)
   mit stabilen IDs + Template-Namen.
2. Handkuratierte Defs: seltene Drops, Bosse, Dungeons, Quests, Meta.
3. **Boss-/Dungeon-Markierung** im Content klären (welche Monster sind Bosse?
   `dungeonsCleared`-Inkrement im Dungeon-Clear-Pfad — combat-dev/Logic-Dev je nach
   Modul).

### Phase 3 — UI (ui-dev)
Eigene Achievements-Seite mit Kategorien, Fortschritt, Punkte-Header, Completion-%.

### Guard-/Verifikations-Checkliste (vor „fertig")
- `pnpm typecheck` (shared-Änderungen rippeln überall).
- `pnpm --filter @hearthforge/persistence test` (Migrations-Round-Trip, falls Bump).
- `pnpm test` — Engine-Suite + Sim `AUFFÄLLIGKEITEN (0)`.
- Achievement-Guard-Test (alle condition.types behandelt).
- Neue Tests: ID-Eindeutigkeit (Generator vs. handkuratiert); ein Beispiel-Unlock je
  neuer condition.type-Familie; Punkte-Aggregation (`earned ≤ total`, monoton).

---

## 6. Kern-Empfehlung (für den Chef)

- **Taxonomie-Umfang:** ~**660 Erfolge** im Vollausbau (Ziel „Hunderte" klar erfüllt),
  ~95 % davon **generiert** (per-Skill-Level-Tiers + per-Monster-Kill-Tiers).
  Sofort-MVP ohne neue State-Zähler: ~**150** Erfolge.
- **Punkte-Schema:** 5 Seltenheitsstufen **common 5 / uncommon 10 / rare 25 /
  epic 50 / legendary 100 AP**, regelbasiert zugewiesen. Gesamt **≈ 11.000–12.000 AP**.
  Score wird **abgeleitet, nicht persistiert** (keine Migration, kein Drift).
- **Architektur:** datengetrieben + **Generator** im content-Paket; **ein**
  `checkAchievements`-Switch (Muster aus `quests.ts` wiederverwendet, liest nur
  vorhandene Zähler); erweitertes `AchievementDef` (category/rarity); reine
  Punkte-Helper im shared-Paket. Save-kompatibel — Bump **nur** wenn die optionalen
  Zähler `goldSpent`/`dungeonsCleared`/Daily-Streak dazukommen.

### Offene Chef-Entscheidungen (zum Routen)
1. Vollausbau (~660) oder MVP-first (~150 ohne neue Zähler)?
2. Reine Score-Variante (empfohlen) oder Punkte schalten Belohnungen frei?
3. Neue Zähler freigeben? → `goldSpent` (Economy), `dungeonsCleared` (Dungeon-Erfolge),
   Daily-lifetime/Streak (Quests). Jeder davon = **SAVE_VERSION-Bump 27→28** + Migration.
4. Welche Monster gelten als **Bosse**, und in welchem Modul wird der
   Dungeon-Clear-Zähler erhöht (Combat-Dev-Abstimmung)?

---

### Relevante Dateien (für die spätere Umsetzung)
- `G:\GameDev\packages\shared\src\index.ts` — `AchievementDef`/`AchievementCondition`,
  Rarity/Points, Helper, ggf. neue State-Felder + `SAVE_VERSION`.
- `G:\GameDev\packages\engine\src\achievements.ts` (+ `achievements.test.ts`) — Checker,
  Guard-Test.
- `G:\GameDev\packages\engine\src\quests.ts` — Referenzmuster (`rawProgress`,
  Counter-Auswertung) zum Wiederverwenden.
- `G:\GameDev\packages\content\src\index.ts` — `achievements`-Array + neuer Generator.
- `G:\GameDev\packages\persistence\src\index.ts` — `migrateState` (nur bei neuen Zählern).
- `G:\GameDev\apps\client\src\renderer\pages\StatsPage.tsx` +
  `apps\client\src\renderer\i18n\translations.ts` — UI/i18n (ui-dev).
