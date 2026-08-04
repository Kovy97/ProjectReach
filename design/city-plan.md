# Stadt-System — Umsetzungsplan (Hearthforge Idle)

> Status: Vorschlag / Doku. Kein Code. Erstellt nach Code-Recherche gegen den aktuellen Stand
> (`SAVE_VERSION = 21`). Vorbilder im Code: Achievements (datengetriebene Bedingungen),
> Shop/Bank (Engine-Aktionsfunktionen), Sidebar/`navigation.ts` (datengetriebenes Routing),
> Dungeons (neuer ContentDB-Block + content-refs-Guard), Toasts (client-only Snapshot-Diff).

---

## 1. Vision & Scope

Die **Stadt** ist ein Hub (Sidebar-Eintrag), der bestehende und künftige „zivilisierte"
Aktivitäten bündelt — als Gegenpol zu Kampf/Skills. Sie ist der narrative & funktionale
Sammelpunkt für: Handel (Laden), Lager (Bank) und **Quests** (neu, Kern dieses Plans).

**In Scope (v1, dieser Plan):**
- Stadt-Hub-Seite als neuer Nav-Eintrag, von dem aus Shop & Bank erreichbar sind.
- **Quest-System** mit datengetriebenen `QuestDef` im ContentDB.
- **Daily Quests**: tägliche Rotation, Schwierigkeitsgrade (easy/medium/hard), lohnende Belohnungen.
- Fortschritts-Tracking gekoppelt an bestehende Engine-Hooks (gather/craft/kill/gold).
- Annehmen / Fortschritt / Abgeben / Belohnung, plus Daily-Reset.

**NICHT in v1 (bewusst später):**
- Eigene Stadt-Wirtschaft / Gebäude-Ausbau / Stadt-Level.
- NPCs mit Dialog, Story-Questketten (nur generische, wiederholbare Quests).
- Exklusive Cosmetics/Portraits als Belohnung (Hook vorsehen, Inhalt später — Portrait-System
  ist laut Memory noch geplant).
- Verschieben der Shop-/Bank-Logik selbst (Engine-Funktionen bleiben unverändert; nur die
  Navigation/Verlinkung ändert sich — siehe §2).

---

## 2. Sidebar / Navigation-Integration

### Ist-Zustand (recherchiert)
- `apps/client/src/renderer/navigation.ts`: `navigation: NavSection[]` ist datengetrieben.
  Sektion `"other"` enthält bereits `shop`, `bank`, `stats`, `options`. `NavView` ist eine
  String-Union; `findPage(id)` / `findSectionIdForPage(id)` laufen über alle Sektionen.
- `apps/client/src/renderer/components/Sidebar.tsx`: rendert `navigation.map(...)` automatisch,
  inkl. Auto-Expand der aktiven Sektion. **Keine Änderung nötig** außer ggf. neuem Icon.
- `apps/client/src/renderer/App.tsx`: `PageContent` ist ein `switch (page.view)` → jede neue
  `NavView` braucht hier einen `case`. `MainLayout` hält `activePageId` als lokalen State und
  gibt `onNavigate={setActivePageId}` an Sidebar **und** an Seiten (z.B. `BestiaryPage`,
  `SkillsOverviewPage` bekommen `onNavigate` bereits durch — gleiches Muster für die Stadt).
- `apps/client/src/renderer/sidebarIcons.ts`: optionales Pixelart-Icon je `page.id`
  (`getSidebarIcon`). Fällt auf das Emoji aus `navigation.ts` zurück.

### Entscheidung (empfohlen): Stadt als eigene Sektion, Shop/Bank wandern hinein
Statt einer flachen `"other"`-Liste bekommt die Stadt eine **eigene Sektion** mit Unter-Seiten.
Das ist mit dem bestehenden Sektions-/Routing-Modell ohne neue Mechanik machbar (eine Sektion
ist bereits genau „Hub mit mehreren Seiten").

Konkret in `navigation.ts`:
- Neue Sektion `{ id: "city", label: "nav.section.city", pages: [...] }` **vor** `"other"`.
- Pages der Stadt-Sektion:
  - `{ id: "city", label: "nav.city", icon: "🏰", view: "city" }` — der Hub/Überblick.
  - `{ id: "quests", label: "nav.quests", icon: "📜", view: "quests" }` — die Quest-Tafel.
  - `{ id: "shop", ... }` und `{ id: "bank", ... }` **aus `"other"` hierher verschieben**
    (IDs/Views bleiben gleich → keine Routing-/Save-Auswirkung, nur andere Gruppierung).
- `"other"` behält dann nur noch `stats`, `options`.

Damit ist „Shop & Bank sind unter der Stadt zusammengefasst" erfüllt, ohne ihre Engine-Logik
anzufassen. Der Hub (`view: "city"`) zeigt zusätzlich große Verlinkungs-Kacheln zu Shop / Bank /
Quests (über `onNavigate`), damit es sich wie ein echter Hub anfühlt.

> Alternative (in §8 als offene Frage): Shop/Bank bleiben separat in `"other"`, und die Stadt
> verlinkt nur dorthin. Weniger Umbau, aber widerspricht „unter der Stadt zusammengefasst".

### Änderungen je Datei (Slice A)
- `navigation.ts`: neue `NavView`-Werte `"city"` und `"quests"`; neue Sektion `"city"`;
  Shop/Bank umhängen.
- `App.tsx`: in `PageContent` zwei `case`: `case "city": return <CityPage onNavigate={onNavigate} />;`
  und `case "quests": return <QuestsPage />;`.
- Neue Seiten `pages/CityPage.tsx` (Hub mit Kacheln) und (in Slice C) `pages/QuestsPage.tsx`.
- `i18n/translations.ts`: Keys `nav.section.city`, `nav.city`, `nav.quests` in `en` **und** `de`
  (de ist strukturell auf en typisiert → fehlende Keys sind ein tsc-Fehler, Parität erzwungen).
- Optional `sidebarIcons.ts`: Pixelart für `city`/`quests`, sobald Assets da sind.

---

## 3. Quest-Datenmodell

### Content-Definitionen (in `packages/shared/src/index.ts`, neben `AchievementDef`/`DungeonDef`)

```
export type QuestDifficulty = "easy" | "medium" | "hard";

// Datengetriebene Zielbedingung. Bewusst eng an vorhandene Zähler/Hooks gekoppelt.
export type QuestObjective =
  | { type: "gather"; itemId: ItemId; amount: number }   // X von Item Y sammeln/erhalten
  | { type: "craft";  itemId: ItemId; amount: number }   // X von Item Y herstellen (Aktion mit loot Y)
  | { type: "kill";   monsterId: MonsterId; amount: number } // N eines Monsters besiegen
  | { type: "killZone"; zone: string; amount: number }   // N Kills in einer Zone (beliebige Monster)
  | { type: "earnGold"; amount: number }                 // N Gold einnehmen
  | { type: "clearDungeon"; dungeonId: string; amount: number }; // Dungeon Z N-mal clearen

export interface QuestReward {
  gold?: number;
  xp?: { skill: SkillId; amount: number };  // gezielte Skill-XP (kein „Total-XP"-Begriff vorhanden)
  items?: Array<{ itemId: ItemId; qty: number }>;
  // Hook für später: token?: number; cosmeticId?: string; (in v1 ungenutzt)
}

export interface QuestDef {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  icon?: string;
  difficulty: QuestDifficulty;
  objective: QuestObjective;
  reward: QuestReward;
  /** Mindest-Gesamtlevel, damit die Quest im Daily-Pool auftauchen darf. */
  requiredLevel?: number;
}
```

`ContentDB` (gleiche Datei) bekommt ein neues Feld:
```
quests: QuestDef[];
```
Analog zu `dungeons`/`achievements`. In `packages/content/src/index.ts` wird `quests: [ ... ]`
ergänzt (neuer Block neben `achievements`/`dungeons`).

### Laufzeit-State (im `GameState`, gleiche Datei)
Ein eigenes Sub-Objekt hält den Stadt-/Quest-Zustand kompakt zusammen:

```
export interface QuestState {
  /** IDs der aktuell angebotenen Daily-Quests (deterministisch gewählt, siehe §5). */
  dailyQuestIds: string[];
  /** Fortschritt je aktiver Quest-ID (z.B. erlegte Kills / gesammelte Items). */
  progress: Record<string, number>;
  /** Bereits abgegebene (claimed) Daily-Quest-IDs des aktuellen Tages. */
  claimed: string[];
  /** Welcher „Tag" gerade läuft (Reset-Marker — Definition siehe §5). */
  dayKey: number;
  /** Optional: aufeinanderfolgende Tage mit ≥1 Abgabe (Streak). */
  streak: number;
  /** Verbleibende Rerolls heute (falls Reroll erlaubt, §5). */
  rerollsLeft: number;
}
```

`GameState` bekommt `quests: QuestState;`. **`createGame()` in `engine/state.ts`** initialisiert
es (leere Listen, `dayKey` aus aktueller Reset-Logik, `rerollsLeft` = Konfig-Default).

### SAVE_VERSION & Migration
- **`SAVE_VERSION` 21 → 22** (`packages/shared/src/index.ts`).
- `migrateState()` in `packages/persistence/src/index.ts`: defensiver Default für Alt-Saves,
  exakt im vorhandenen Muster:
  ```
  if (!state.quests || typeof state.quests !== "object") {
    state.quests = { dailyQuestIds: [], progress: {}, claimed: [], dayKey: 0, streak: 0, rerollsLeft: 0 };
  }
  ```
  Beim ersten `advance`/Stadt-Besuch generiert die Daily-Rotation (§5) dann den ersten Satz.

> Memory-Regel „Save-Logik immer mitziehen" beachtet: neuer State ⇒ SAVE_VERSION-Bump +
> Migration in derselben Slice (Slice B).

---

## 4. Quest-Objective-Typen & Fortschritts-Hooks

Alle Zähler werden **engine-seitig** inkrementiert (deterministisch, läuft so auch offline mit),
analog dazu, wie `checkAchievements` heute am Ende von `advance()` gegen Lebenszähler prüft.

Empfohlenes Muster: eine Funktion **`trackQuestProgress(state, content, event)`** in neuer
Datei `packages/engine/src/quests.ts`, die einen kleinen, typisierten „Event" entgegennimmt und
nur den Fortschritt **aktiver, noch nicht claimter** Daily-Quests erhöht, deren Objective passt.
Die Hooks rufen diese Funktion an genau den Stellen auf, an denen das Spiel den Zähler ohnehin
schon erhöht:

| Objective       | Hook-Stelle (existiert bereits)                                   | Datei |
|-----------------|-------------------------------------------------------------------|-------|
| `gather`        | `completeAction()` nach `addItem(...)` (`state.stats.itemsGathered += added`) | `engine/tick.ts` |
| `craft`         | dieselbe Stelle, aber nur wenn `action.inputs` gesetzt (Verarbeitung) → unterscheidet Sammeln vs. Herstellen | `engine/tick.ts` |
| `kill`          | `onEnemyDefeated()` direkt bei `state.monsterKills[...]++`         | `engine/combat.ts` |
| `killZone`      | dito — `monster.zone` mitführen                                   | `engine/combat.ts` |
| `earnGold`      | überall wo `state.character.gold += ...` (Kill-Gold, Aktions-Gold, Thieving). Sauberer Weg: **Diff** statt N Hooks — siehe Hinweis | `engine/combat.ts`, `engine/tick.ts` |
| `clearDungeon`  | Dungeon-Clear-Zweig in `onEnemyDefeated()` (`cs.dungeonId` + letzte Welle) | `engine/combat.ts` |

**Hinweis `earnGold` (Diff-Variante, empfohlen):** statt jede Gold-Quelle einzeln anzuzapfen,
am Ende von `advance()` die Gold-Differenz seit Tick-Beginn bilden (Snapshot vor der
`while`-Schleife, vgl. wie `deserialize` Gold/XP/Items per Vorher/Nachher-Diff misst) und nur
*positive* Zuwächse an `earnGold`-Quests geben. Vermeidet verstreute Hook-Calls und zählt
Verkäufe/Quest-Belohnungen bewusst **nicht** mit, wenn der Snapshot vor der Belohnung sitzt.
(Für `gather`/`craft`/`kill` sind die punktuellen Hooks präziser und werden bevorzugt.)

**Wichtig (Determinismus):** `trackQuestProgress` darf **kein** `nextFloat/nextInt` ziehen
(keine RNG-Berührung), sonst bricht die bit-identische Offline-Reproduzierbarkeit. Es liest/
schreibt nur Integer-Zähler — unkritisch.

**Abgabe/Belohnung** ist *kein* Tick-Hook, sondern eine Spieler-Aktion (UI-Button) →
Engine-Funktion `claimQuest(state, content, questId)` (siehe §7/Slice C), die prüft
`progress >= amount` und dann Reward gutschreibt (`addGold`, `addItem`, gezielte `skill.xp += ...`).

---

## 5. Daily-Quest-System

### Auswahl / Rotation (deterministisch)
- **Pool**: alle `QuestDef`, gefiltert nach `requiredLevel <= character.totalLevel` und nach
  Erreichbarkeit (Refs gültig, siehe §9).
- **Tagesauswahl**: deterministisch per Seed aus `dayKey` (z.B. ein eigener, vom Spiel-RNG
  *getrennter* Hash `mulberry/xfnv(dayKey ^ saveSeed)`), damit der Satz pro Tag stabil ist und
  nicht vom Spiel-`state.rng` abhängt (würde sonst Determinismus der Simulation stören).
- **Anzahl pro Tag**: empfohlen **3** (Default-Konstante `DAILY_QUEST_COUNT = 3`).
- **Schwierigkeits-Mix**: 1× easy, 1× medium, 1× hard (aus den jeweiligen Pool-Teilmengen
  gezogen; wenn eine Stufe leer ist, mit nächstniedriger auffüllen).

### Reset
- **Empfehlung v1: Echtzeit-Tag** (lokale Mitternacht des Spielers). `dayKey = Math.floor(
  (now - tzOffset) / 86_400_000)`. Vorteil: vertraut (Melvor/Mobile-Idle-Standard), unabhängig
  von Offline-Cap. Der Reset wird beim ersten `advance`/Stadt-Render geprüft: ändert sich
  `dayKey` gegenüber `state.quests.dayKey`, dann neue Dailies würfeln, `progress`/`claimed`
  leeren, `streak` fortschreiben/abreißen, `rerollsLeft` zurücksetzen.
- Offene Alternative (siehe §8): **Spielzeit-Tag** (`elapsedMs / 86_400_000`) — fairer für
  seltene Spieler, aber für Idle-Games unüblich. Als offene Frage an den Chef.

### Reroll & Streaks
- **Reroll**: optional, `rerollsLeft` (Default 1/Tag) erlaubt, **eine** noch nicht claimte
  Daily gegen eine andere zufällige (gleiche Difficulty) aus dem Pool zu tauschen; setzt deren
  `progress` zurück. Einfacher Skill-Sink, kein Pflicht-Feature für v1 (kann in Slice D weg).
- **Streak**: `streak` zählt aufeinanderfolgende Tage mit ≥1 Abgabe. Optionaler kleiner
  Multiplikator auf Gold-Reward (z.B. `+5% pro Streak-Tag, Cap +50%`) oder rein kosmetisch.
  Für v1 als Zähler vorhanden, Belohnungs-Effekt optional (Balance-Slice E).

---

## 6. Schwierigkeitsgrade & Belohnungen

Richtwerte als **Designanker** (finale Zahlen im Balance-Pass / via balance-designer). Bezug:
Monster geben ~grob 5–800 Gold/Kill, Aktionen 0,x–mehrere XP; Auto-Eat-Upgrade kostet 2k–25k —
Dailies sollten spürbar, aber nicht XP-/Gold-brechend sein.

| Difficulty | Aufwand (Beispiel)                | Gold-Reward      | Skill-XP-Reward            | Item-Reward |
|------------|-----------------------------------|------------------|----------------------------|-------------|
| easy       | „Sammle 20 Logs" / „Besiege 10 Goblins" | ~100–250    | klein (≈3–5 Aktionen wert) | optional, low |
| medium     | „Schmiede 15 Iron Bars" / „Besiege 40 Mobs Zone X" | ~400–800 | mittel                 | gelegentlich Consumable |
| hard       | „Clear Dungeon Z" / „Verdiene 5.000 Gold" | ~1.500–3.000 | groß                    | öfter / wertvoller |

Leitlinien, damit es sich „lohnend" anfühlt:
- **Gold-Reward > passiver Gold-Ertrag derselben Zeit**, sonst ignoriert man Quests. Faustregel:
  Reward ≈ 1,5–2× des Gold-Werts, den der Aufwand „nebenbei" ohnehin produziert.
- **Hard** sollte sich klar lohnen (Dungeon-/Boss-Quests sind der Anreiz, das Endgame anzufassen).
- **Item-Rewards** anfangs aus bestehendem Content (Tränke, Munition, Materialien), kein neuer
  Content nötig für v1.
- **Exklusive Belohnung (Hook, Inhalt später)**: `QuestReward.token`/`cosmeticId` ist im Modell
  vorgesehen, aber in v1 leer. Wenn der Chef ein Stadt-Token/Shop-für-Tokens will, dockt das
  später an `ShopEntry` an (Token-Währung als zweite Gold-artige Resource) — bewusst out of scope.

---

## 7. Inkrementelle Build-Slices

Jede Slice ist klein und **grün testbar** (Vitest + `tsc` + en/de-Parität). Reihenfolge =
Abhängigkeit.

### Slice A — Stadt-Hub + Shop/Bank-Verlinkung (UI-only, KEIN State)
- `navigation.ts`: neue Sektion `city`, neue Views `city`/`quests` (Quests-Page noch Placeholder),
  Shop/Bank in die Stadt-Sektion umhängen.
- `App.tsx`: `case "city"`, `case "quests"` (vorerst `PlaceholderPage` für Quests).
- `pages/CityPage.tsx`: Hub mit Kacheln → `onNavigate("shop"/"bank"/"quests")`.
- `i18n`: `nav.section.city`, `nav.city`, `nav.quests` (+ `city.*` Hub-Texte) in en/de.
- **Kein** SAVE_VERSION-Bump. Tests: bestehende Suite bleibt grün; ggf. kleiner Smoke-Test, dass
  `findPage("city")` existiert. **Sofort auslieferbar.**

### Slice B — Quest-Datenmodell + statische Quests + Tracking-Hooks (Engine + Save)
- `shared`: `QuestDef`/`QuestObjective`/`QuestReward`/`QuestState`, `ContentDB.quests`,
  `GameState.quests`, **SAVE_VERSION 21→22**, Daily-Konstanten (`DAILY_QUEST_COUNT` usw.).
- `content`: erste statische `quests: [...]` (je 2–3 pro Difficulty, refs auf vorhandene
  Items/Monster/Zonen/Dungeons).
- `engine/state.ts`: `createGame` initialisiert `quests`.
- `persistence`: Migration (Default für Alt-Saves).
- `engine/quests.ts`: `trackQuestProgress(...)` + Hook-Calls in `tick.ts` (gather/craft) und
  `combat.ts` (kill/killZone/clearDungeon); `earnGold` per Gold-Diff in `advance()`.
- **Tests**: Unit-Tests für jeden Objective-Typ (z.B. „nach 10 Kills steht progress=10"),
  Determinismus-Test (gleicher Seed ⇒ gleiche Ticks, weil keine RNG-Berührung), Migration-Test
  (Alt-Save lädt, hat `quests`-Default).
- **Noch keine UI nötig** — rein mechanisch testbar.

### Slice C — Quest-UI: annehmen / Fortschritt / abgeben / Belohnung
- `engine/quests.ts`: `claimQuest(state, content, questId)` (prüft `progress >= amount`,
  gutschreibt Reward via `addGold`/`addItem`/`skill.xp`, markiert `claimed`, aktualisiert `streak`).
- `pages/QuestsPage.tsx`: Liste der heutigen Dailies, je Karte Difficulty-Badge,
  Objective-Text, Fortschrittsbalken (`progress/amount`), Reward-Vorschau, „Abgeben"-Button
  (disabled bis erfüllt). Anbindung über `GameContext` (gleiches Muster wie Shop/Bank-Aktionen).
- `i18n`: `quests.*` Texte (Objective-Templates wie `"Gather {n} {item}"` → mit `tr(item.name)`),
  en/de.
- Toast: in `components/Toasts.tsx` Snapshot-Diff um `claimed`-Set erweitern → „Quest erfüllt!"-
  Toast (gleiches client-only Muster wie Achievements).
- **Tests**: `claimQuest` happy/Fehlerpfade (zu früh, doppelt, falsche ID).

### Slice D — Daily-Rotation + Reset (+ optional Reroll/Streak)
- `engine/quests.ts`: `rollDailyQuests(state, content)` (deterministischer Tages-Seed,
  Difficulty-Mix, requiredLevel-Filter) und `maybeRollDaily(state, content, now)` (Reset bei
  `dayKey`-Wechsel; Aufruf in `advance()` und beim Stadt-Render).
- Reset leert `progress`/`claimed`, schreibt `streak` fort, setzt `rerollsLeft`.
- Optional: `rerollQuest(...)`.
- **Tests**: gleicher `dayKey` ⇒ stabiler Satz; `dayKey+1` ⇒ neuer Satz + geleerter Fortschritt;
  requiredLevel-Filter greift; Streak-Logik.

### Slice E — Belohnungs-Balance
- Zahlen final justieren (balance-designer): Gold/XP/Item je Difficulty, optional Streak-Bonus,
  ggf. Item-Reward-Tabellen je Level-Band.
- Reine Content-/Konstanten-Änderung, keine neuen Typen.

**Abhängigkeiten:** A → (B ∥ unabhängig von A) ; C braucht B ; D braucht B (UI aus C ideal davor) ;
E braucht B+C+D. **SAVE_VERSION-Bump nur in Slice B.**

---

## 8. Offene Fragen an den Chef

1. **Reset-Logik**: Echtzeit-Tag (Standard, empfohlen) **oder** Spielzeit-Tag (fairer für
   Gelegenheitsspieler)? Beeinflusst `dayKey`-Definition in §5.
2. **Anzahl Dailies/Tag**: 3 (Vorschlag) oder mehr/weniger? Difficulty-Mix fix (1/1/1) oder variabel?
3. **Shop/Bank wirklich UNTER die Stadt** (eigene Sektion, empfohlen) **oder** nur verlinken und
   in `"other"` belassen?
4. **Exklusive Belohnungen**: Quest-Token + Token-Shop / Cosmetics gewünscht? Wenn ja, eigener
   Folge-Plan (Portrait-System ist laut Memory ohnehin geplant — könnte andocken).
5. **Reroll & Streak**: gewünscht für v1 oder erst später? (Beides ist optional gebaut.)
6. **Quest-Annahme**: Dailies automatisch „aktiv" (Fortschritt zählt immer, nur Abgabe nötig —
   einfacher, empfohlen) **oder** explizites „Annehmen" mit Slot-Limit?

---

## 9. Guards / Tests (nötig)

Analog zu `content-refs.test.ts` (Dungeon-Refs) und `content-integrity.test.ts` (Item-Refs) —
neuer Block **„content refs: Quests sind konsistent verdrahtet"**:

- `objective.itemId` (gather/craft) existiert in `content.items`.
- `objective.monsterId` (kill) existiert in `content.monsters`.
- `objective.zone` (killZone) existiert in `content.zones` **und** mindestens ein Monster hat
  diese Zone (sonst unerfüllbar).
- `objective.dungeonId` (clearDungeon) existiert in `content.dungeons`.
- `craft`-Quests: das Ziel-Item ist tatsächlich Output **einer** Aktion mit `inputs`
  (sonst nie „herstellbar"); `gather`-Quests: das Item droppt von Aktion/Monster (erhältlich).
- `reward.itemId` existiert; `reward.xp.skill` existiert in `content.skills`.
- `objective.amount > 0`; `requiredLevel` (falls gesetzt) `> 0`.
- **Pool-Deckung pro Difficulty/Level-Band**: für jeden Daily-Mix (1 easy/1 medium/1 hard) gibt
  es ab dem jeweiligen Mindest-Level genug Kandidaten (sonst kann die Rotation nicht füllen).
- en/de-Parität der Quest-Texte ist durch das `translations.ts`-Typing erzwungen (UI-Strings);
  `QuestDef.name/description` sind `LocalizedString` im Content — optionaler Test, dass beide
  Sprachen gesetzt sind (Objekt-Form, nicht nur String), passend zum bestehenden i18n-Anspruch.
- **Determinismus-Guard**: Test, dass `trackQuestProgress`/`maybeRollDaily` `state.rng` nicht
  verändern (Snapshot `state.rng.state` vor/nach), damit Offline-Reproduzierbarkeit bleibt.

> Verifikations-Suite (kontrolleur): `tsc` + Vitest grün, en/de-Parität, content-refs-Guard,
> Migration lädt einen 21er-Save. „Defined but never applied"-Check: sicherstellen, dass jedes
> `QuestDef`-Feld wirklich gelesen wird (Objective im Tracker, jede Reward-Art in `claimQuest`).
