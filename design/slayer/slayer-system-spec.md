# Slayer — System-, Datenmodell- & Engine-Spec (Logic-Dev)

Status: DESIGN/PLAN. Kein Code geändert. Revier: shared-Typen, engine (außer `combat.ts`), persistence.
Bezug: Chef-Vorgabe „Slayer-Skill — Kern-Konzept". Zahlen = Vorschlag/Platzhalter.

Architektur-Anker (aus dem Ist-Stand):
- `SAVE_VERSION = 35` (shared/index.ts) → **Bump auf 36** für dieses Feature.
- Skills liegen als `Record<SkillId, SkillState>` im `GameState`; ein neuer Skill `"slayer"` ist
  reiner Content (`SkillDef`) und braucht **keine** GameState-Schema-Änderung (Lesen via `?? 0`).
- Kill-Hook ist `onEnemyDefeated(...)` in `combat.ts` (Combat-Dev-Revier) — wir liefern eine reine
  Engine-Funktion, die dort **aufgerufen** wird; wir editieren `combat.ts` NICHT selbst.
- `combatLevel(state)` existiert bereits (`engine/dungeon.ts`) → Master-Unlock nutzt das, keine Dopplung.
- Vorbild „Unique-Gebiet": `DungeonDef` + zonen-getaggte `MonsterDef` (Daten in content, Run-Logik in
  combat.ts). Der Slayer-Tower folgt diesem Muster: Tower-Monster = normale `MonsterDef` mit Zonen-Tag
  + Etagen-/Anforderungs-Metadaten.

---

## 1. Datenmodell

### 1.1 Neue shared-Typen (Content-Definitionen)

```ts
export type SlayerMasterId = string;

/** Ein Slayer-Master (OSRS-artiger Auftraggeber). Reine Content-Daten. */
export interface SlayerMasterDef {
  id: SlayerMasterId;
  name: LocalizedString;
  description?: LocalizedString;
  /** Freischalt-Bedingung. BEIDE müssen erfüllt sein (combatLevel via dungeon.ts, slayerLevel via skill). */
  unlock: { combatLevel: number; slayerLevel: number };
  /**
   * Pool an WELT-Monstern (normale `MonsterId`s, z.B. chicken/goblin), die dieser Master
   * als „normalen" Task vergeben darf. Tower-Tasks ziehen NICHT hieraus, sondern aus den
   * freigeschalteten Tower-Etagen (s.u.).
   */
  taskPool: MonsterId[];
  /** Chance (0..1), dass ein Auftrag stattdessen ein Slayer-Tower-Task wird. Default 0.5. */
  towerTaskChance: number;
  /** Spanne der zu tötenden Anzahl N (inkl.). Höhere Master → größere Spanne. */
  taskAmount: { min: number; max: number };
  /** Slayer-Punkte bei Standard-Abschluss (Streak-Milestones multiplizieren das, s. 3.3). */
  basePoints: number;
  /** Punkte-Kosten, um einen Task dieses Masters zu überspringen (skip). */
  skipCost: number;
}

/** Eine Tower-Etage. Slayer-Level-gated; bündelt ihre Monster. Reine Content-Daten. */
export interface SlayerTowerFloor {
  /** 1..5 (Etagen-Index, aufsteigend). */
  floor: number;
  name: LocalizedString;
  /** Mindest-SLAYER-Level zum Betreten/als Task zu bekommen. */
  slayerLevelRequired: number;
  /** Monster dieser Etage (MonsterId → MonsterDef in content.monsters, Zone "slayer_tower"). */
  monsters: MonsterId[];
}
```

`ContentDB` bekommt zwei neue Felder (beide OPTIONAL → Alt-Content/Tests laufen unverändert; Engine
behandelt Fehlen defensiv als „kein Slayer verfügbar"):

```ts
slayerMasters?: SlayerMasterDef[];
slayerTower?: SlayerTowerFloor[];
```

### 1.2 Erweiterung bestehender Typen

`MonsterDef` (shared) erhält zwei OPTIONALE Felder (Content füllt sie; alte Monster unberührt):

```ts
/** Tower-Etage, falls dieses Monster zum Slayer-Tower gehört (1..5). Sonst undefined. */
slayerFloor?: number;
/**
 * Pflicht-Item zum Bekämpfen (OSRS-Nasenklammer-Analog). Ist es gesetzt und der Spieler erfüllt
 * die Anforderung nicht (kein Item ausgerüstet/im Inventar/kein Slayer-Helm), greift die
 * Item-Anforderungs-Mechanik (s. 4). undefined = keine Anforderung.
 */
slayerRequirement?: ItemId;
```

`ItemDef` (shared) erhält ein OPTIONALES Flag für den späteren Slayer-Helm:

```ts
/** true = dieses Ausrüstungsteil erfüllt ALLE Slayer-Item-Anforderungen (kombinierter Slayer-Helm). */
slayerHelm?: boolean;
```

Neuer Skill `"slayer"` ist nur ein `SkillDef`-Eintrag in content (`trains` → offene Entscheidung,
Vorschlag `"lck"` oder kein Attribut). Kein shared-Strukturfeld nötig.

### 1.3 Laufzeit-State im Save (GameState)

```ts
/** Aktiver Slayer-Auftrag. null = aktuell kein Task. */
export interface SlayerTask {
  masterId: SlayerMasterId;
  /** Art des Ziels: normaler Welt-Mob ODER Tower-Mob. */
  kind: "world" | "tower";
  /** Ziel-Monster (eine konkrete MonsterId). */
  monsterId: MonsterId;
  /** Benötigte Kills. */
  required: number;
  /** Bereits erzielte Kills (0..required). */
  progress: number;
  /** Vorab berechnete Belohnung bei Abschluss (deterministisch beim Assign gezogen). */
  slayerXp: number;
  points: number;
  /**
   * Gecachte Anforderungs-Item-ID (aus monster.slayerRequirement beim Assign), damit die UI sie
   * ohne Content-Lookup zeigen kann. Reine Bequemlichkeit; Quelle der Wahrheit bleibt der Content.
   */
  requirementItemId?: ItemId;
}
```

`GameState` bekommt NEUE Felder (→ SAVE-Bump + Migration, s. 1.4):

```ts
/** Aktiver Slayer-Task (null = keiner). */
slayerTask: SlayerTask | null;
/** Slayer-Punkte (Belohnungs-Währung, getrennt von Gold). */
slayerPoints: number;
/** Lebenslang abgeschlossene Slayer-Tasks (für Streak-Milestones + Achievements). */
slayerTasksCompleted: number;
/** Aktuelle Abschluss-Serie (für OSRS-artige Streak-Punkte-Boni; s. 3.3). */
slayerStreak: number;
```

Slayer-Skill-XP lebt im bestehenden `state.skills["slayer"]` (kein neues Feld).

### 1.4 SAVE_VERSION & Migration

**SAVE_VERSION: 35 → 36.**

`migrateState`-Zweig (default-init der neuen Felder; idempotent):

```ts
// Slayer-System (SAVE_VERSION 35→36): neue State-Felder defaulten. Alt-Saves haben weder Task
// noch Punkte. Der neue Skill "slayer" wird beim nächsten advance/computeStats über ?? 0 als 0
// gelesen — kein Eintrag im skills-Record nötig.
if (state.slayerTask === undefined) state.slayerTask = null;
if (typeof state.slayerPoints !== "number") state.slayerPoints = 0;
if (typeof state.slayerTasksCompleted !== "number") state.slayerTasksCompleted = 0;
if (typeof state.slayerStreak !== "number") state.slayerStreak = 0;
```

Keine Item-ID-Renames durch dieses Feature → der bestehende RENAME-Pfad bleibt unangetastet.
(Falls Content später eine Slayer-Item-ID umbenennt, läuft das über denselben `RENAME`-Mechanismus
inkl. inventory.slots/bagSlots/equipment/food/buffs/bank — Standard.)

`sanitizeState`-Ergänzung (Korruptions-/Cheat-Härtung, KEIN Versions-Bump):

```ts
state.slayerPoints = clampFinite(state.slayerPoints, 0, GOLD_HARD_CAP, 0);
state.slayerTasksCompleted = finiteNonNeg(state.slayerTasksCompleted, 0);
state.slayerStreak = finiteNonNeg(state.slayerStreak, 0);
// Task gegen aktuellen Content validieren: Master/Monster muss existieren, sonst Task verwerfen.
const t = state.slayerTask;
if (
  t &&
  (!content.slayerMasters?.some((m) => m.id === t.masterId) ||
    !content.monsters[t.monsterId])
) {
  state.slayerTask = null;
} else if (t) {
  t.required = clampFinite(t.required, 0, QTY_HARD_CAP, 0);
  t.progress = clampFinite(t.progress, 0, t.required, 0);
  t.slayerXp = finiteNonNeg(t.slayerXp, 0);
  t.points = finiteNonNeg(t.points, 0);
}
```

**Persistence-Test**: Round-trip eines v35-Saves → erwartet `slayerTask === null`, `slayerPoints === 0`,
Felder vorhanden; plus ein Save mit gesetztem Task, dessen Monster im Content fehlt → Task wird genullt.

---

## 2. Task-Assignment-Algorithmus

Alles über die seeded `state.rng` (`nextInt`/`nextFloat`) → deterministisch, wie Thieving/Loot.
Assign ist eine spieler-getriggerte Aktion (Klick im Master-Dialog) und darf RNG vorrücken.

**Master-Verfügbarkeit** (`getAvailableMasters`): Master ist freigeschaltet, wenn
`combatLevel(state) >= unlock.combatLevel && slayerLevel >= unlock.slayerLevel`
(`slayerLevel = levelFromXp(state.skills["slayer"]?.xp ?? 0)`).

**`assignTask(state, content, masterId)`** (nur wenn `state.slayerTask === null`; Master muss
freigeschaltet sein, sonst `null`):

1. **Typ-Wurf:** `nextFloat(rng) < master.towerTaskChance` → Tower-Task, sonst Welt-Task.
2. **Monster-Wahl:**
   - *Welt:* gleichverteilt aus `master.taskPool` (leerer Pool → Fallback auf Tower-Task, falls
     möglich; sonst `null`).
   - *Tower:* freigeschaltete Etagen = `slayerTower.filter(f => slayerLevel >= f.slayerLevelRequired)`.
     Etage ziehen (Vorschlag: **gewichtet zur höchsten freigeschalteten Etage** → mehr XP/Anspruch;
     Alternative = gleichverteilt, s. offene Entscheidung). Dann Monster gleichverteilt aus der Etage.
3. **Anzahl N:** `nextInt(rng, master.taskAmount.min, master.taskAmount.max)`. (Skaliert über die
   Master-Definition mit der Schwierigkeit — höhere Master = größere Spannen.)
4. **Belohnung (beim Assign fixiert):**
   - `slayerXp = round(monster.xp * SLAYER_XP_KILL_FACTOR * N)` (Vorschlag `SLAYER_XP_KILL_FACTOR ≈ 0.5`;
     macht Slayer-XP an Mob-Stärke × Menge gekoppelt).
   - `points = master.basePoints` (Streak-Milestone-Multiplikator wird erst BEI Abschluss angewandt, 3.3).
5. **Task schreiben:** `{ masterId, kind, monsterId, required: N, progress: 0, slayerXp, points,
   requirementItemId: monster.slayerRequirement }`. Rückgabe = der Task.

Bandbreite-Konsistenz: Tower-Etagen folgen der Chef-Vorgabe
(Slayer 1→Etage1 Lvl1–19, 20→Etage2, 40→Etage3, 60→Etage4, 80→Etage5), kodiert in
`SlayerTowerFloor.slayerLevelRequired` (1/20/40/60/80). Engine liest nur diese Schwellen, keine
Hardcodes.

---

## 3. Fortschritt / Completion

### 3.1 Kill-Hook (Cross-Revier zu Combat-Dev)

Wir liefern eine reine Engine-Funktion in **`engine/slayer.ts`** (Logic-Dev-Revier):

```ts
/**
 * Verbucht einen Kill für den aktiven Slayer-Task. Pur & deterministisch. Wird von combat.ts in
 * onEnemyDefeated NACH dem Kill-Zähler aufgerufen. No-op, wenn kein Task / falsches Monster /
 * Item-Anforderung nicht erfüllt (s. 4).
 * Rückgabe: true, wenn der Task durch diesen Kill ABGESCHLOSSEN wurde (für Combat-Log-Eintrag).
 */
export function recordKillForSlayer(state: GameState, content: ContentDB, monsterId: MonsterId): boolean;
```

Logik:
- `task = state.slayerTask`; wenn null oder `task.monsterId !== monsterId` → return false.
- Item-Anforderung: wenn nicht erfüllt → Kill zählt NICHT (return false; s. 4 für „blockiert vs Strafe").
- `task.progress++`. Wenn `progress >= required` → **completeTask** (3.2) → return true.

**Einzige nötige `combat.ts`-Änderung** (an Combat-Dev zu beauftragen): ein Aufruf von
`recordKillForSlayer(state, content, monster.id)` in `onEnemyDefeated`, direkt nach
`state.monsterKills[...]++`. Optional ein `slayer`-Log-Eintrag bei Abschluss (CombatEvent-`kind`
„slayer" wäre eine winzige shared-Erweiterung; Alternativ reuse `kind: "xp"` mit `skill: "slayer"`).

### 3.2 Completion

`completeTask(state, content)` (intern, von recordKill aufgerufen):
- `addXp(state, "slayer", task.slayerXp)` (bestehende leveling/addXp-Mechanik).
- Streak hochzählen: `state.slayerStreak++`, `state.slayerTasksCompleted++`.
- Punkte: `state.slayerPoints += task.points * streakMultiplier(state.slayerStreak)` (3.3).
- `state.slayerTask = null` (Spieler holt beim Master einen neuen Task).
- Achievements-Hook (z.B. `slayer_tasks_10/50/100`) über das bestehende Achievement-System.

### 3.3 Streak-Boni (OSRS-artig, optional für 1.0)

`streakMultiplier(streak)`: Standard 1×, an Milestones Bonus (Vorschlag: jeder 10. Task ×5, jeder
50. ×15). Rein arithmetisch, kein State über `slayerStreak` hinaus. Offene Entscheidung, ob 1.0.

### 3.4 Skip / Cancel

```ts
/** Überspringt den aktiven Task gegen Punkte (OSRS-Skip). Bricht die Streak NICHT. */
export function skipTask(state: GameState, content: ContentDB): boolean;
```
- Kosten = `master.skipCost` aus `state.slayerPoints`; reicht es nicht → `false`, kein Effekt.
- Bei Erfolg: Punkte abziehen, `state.slayerTask = null` (neuer Assign nötig). RNG NICHT berührt.
- **Cancel** (kostenlos, aber Streak-Reset) als Alternative — Vorschlag: anbieten, setzt
  `slayerStreak = 0` und `slayerTask = null`, keine Punkte-Kosten. (Offene Entscheidung: skip-only
  vs skip+cancel.)

---

## 4. Item-Anforderungs-Mechanik

Prüf-Helfer in `engine/slayer.ts` (pur):

```ts
/**
 * Erfüllt der Spieler die Slayer-Item-Anforderung des Monsters?
 * true, wenn (a) das Monster keine Anforderung hat, ODER (b) das geforderte Item ausgerüstet
 * ist, im Inventar/Bank liegt, ODER (c) ein Item mit `slayerHelm: true` ausgerüstet ist.
 */
export function slayerRequirementMet(state: GameState, content: ContentDB, monster: MonsterDef): boolean;
```

Prüf-Reihenfolge:
1. `monster.slayerRequirement` undefined → `true`.
2. Irgendein ausgerüstetes Item mit `slayerHelm === true` → `true` (kombinierter Slayer-Helm ersetzt
   ALLE Einzel-Anforderungen).
3. Gefordertes Item in `equipment` (egal welcher Slot) ODER `inventory.slots` ODER `bank` → `true`.
   (Vorschlag: „besitzen genügt", muss nicht im Kampf-Slot stecken — idle-fair. Alternative: muss
   ausgerüstet sein. Offene Entscheidung.)
4. sonst `false`.

**Was bei Nicht-Erfüllung passiert** — zwei Modi (Chef wählt einen):
- **A) Hard-Block (OSRS-nah, empfohlen):** `startCombat` gegen ein Monster mit unerfüllter
  Anforderung wird verweigert (Read-API `canFightMonster(state, content, monsterId)`), die UI zeigt
  „benötigt: <Item>". Sauber, keine Combat-Loop-Sonderfälle.
- **B) Soft-Penalty:** Kampf erlaubt, aber Kills zählen nicht für den Task UND ein Accuracy-/Damage-
  Malus (würde von Combat-Dev in `resolveAttack` über unsere Read-API `slayerRequirementMet`
  angewandt). Mehr Combat-Kopplung.

`recordKillForSlayer` ruft in BEIDEN Modi `slayerRequirementMet` und zählt nur bei `true`.

**Slayer-Helm (später craftbar):** ein equipment-Item mit `slayerHelm: true` (Content liefert
Rezept + Stats). Logik ist schon abgedeckt (Schritt 2 oben) — keine weitere Engine-Arbeit nötig.

---

## 5. API-Surface (`engine/slayer.ts`, Logic-Dev)

```ts
// Lesen
getAvailableMasters(state, content): SlayerMasterDef[];
getActiveTask(state): SlayerTask | null;
getSlayerLevel(state): number;                 // levelFromXp(skills.slayer)
slayerRequirementMet(state, content, monster): boolean;
canFightMonster(state, content, monsterId): boolean;   // (nur Hard-Block-Modus)
unlockedTowerFloors(state, content): SlayerTowerFloor[];

// Schreiben (alle pur, RNG nur in assignTask)
assignTask(state, content, masterId): SlayerTask | null;
skipTask(state, content): boolean;
cancelTask(state): void;                       // (falls Cancel-Option beschlossen)
recordKillForSlayer(state, content, monsterId): boolean;  // ← combat.ts ruft das
spendSlayerPoints(state, amount): boolean;     // generische Senke für den Punkte-Shop (Phase 2)
```

Engine-Konstanten in shared: `SLAYER_XP_KILL_FACTOR`, `DEFAULT_TOWER_TASK_CHANCE = 0.5`,
`SLAYER_TOWER_FLOOR_THRESHOLDS = [1, 20, 40, 60, 80]` (Referenz/Validierung).

---

## 6. Cross-Revier-Schnittstellen

**Content-Dev liefert:**
- `SkillDef` `"slayer"` (+ Sidebar-Eintrag-Entscheidung: eigene Skill-Seite, aber Dialog statt Aktions-Karten).
- `slayerMasters: SlayerMasterDef[]` (Vorschlag 4–5 Master, gestaffelt nach combat/slayerLevel).
- `slayerTower: SlayerTowerFloor[]` (5 Etagen, Schwellen 1/20/40/60/80) + die Tower-`MonsterDef`s
  (Zone `"slayer_tower"`, `slayerFloor` gesetzt, ggf. `slayerRequirement`, mit **Tower-Unique-Drops**
  in `loot` — der Lohn-Anker für Slayer).
- Anforderungs-Items (Nasenklammer-Analoga) als `ItemDef`s + Bezug `MonsterDef.slayerRequirement`.
- Slayer-Helm-`ItemDef` (`slayerHelm: true`) + Crafting-Rezept (Phase 2-tauglich).
- Slayer-Punkte-Shop-Einträge (Phase 2): Unlocks/Perks, Senke via `spendSlayerPoints`.

**Combat-Dev (combat.ts):** EIN Hook-Aufruf `recordKillForSlayer(state, content, monster.id)` in
`onEnemyDefeated`; im Soft-Penalty-Modus zusätzlich `slayerRequirementMet` in `resolveAttack`. Sonst nichts.

**UI-Dev:** Slayer-Skill-Seite = Master-Dialog (freigeschaltete Master, Assign-Button, aktive
Task-Karte mit Fortschritt N/required + Anforderungs-Item-Hinweis, Skip/Cancel, Punkte-Stand).
Slayer-Tower als Kampf-Zone mit Etagen-Tabs (Level-gated) + „benötigt <Item>"-Warnung. Punkte-Shop = Phase 2.

**Bewusst Phase 2:** Punkte-Belohnungs-Shop & Perks, Slayer-Helm-Craft-Tier, Streak-Tuning,
Teil-Anforderungs-Helme, Slayer-Level als Equip-Set-/Item-Voraussetzung.

---

## 7. Offene Chef-Entscheidungen

- **Item-Anforderung ohne Item:** Hard-Block (A, empfohlen) vs Soft-Penalty (B)?
- **Anforderung erfüllt durch:** Besitz (Inventar/Bank) genügt, oder muss ausgerüstet sein?
- **Tower-Etagen-Wahl beim Task:** gewichtet zur höchsten freigeschalteten Etage (mehr XP) vs gleichverteilt?
- **Skip vs Cancel:** nur kostenpflichtiger Skip, oder zusätzlich kostenloser Cancel mit Streak-Reset?
- **Streak-Punkte-Boni** (OSRS-Milestones ×5/×15) schon in 1.0 oder Phase 2?
- **Slayer-Skill `trains`-Attribut:** `lck`, `wis` oder keines?
- **`towerTaskChance`** global fix 50 % oder pro Master justierbar (Default 50 %)?
- **Master-Anzahl & Schwellen** für 1.0 (Vorschlag 4–5).
