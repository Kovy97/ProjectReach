# Slayer Skill — UI Spec (Dialog-Seite)

**Autor:** UI-Dev  
**Datum:** 2026-06-27  
**Status:** Design/Plan — kein Code

---

## 1. Routing & Integration

### navigation.ts

Neuer Eintrag in der `"skills"` Section:

```ts
{ id: "slayer", label: "nav.slayer", icon: "💀", view: "skill", skillId: "slayer" }
```

Der Slayer-Eintrag erscheint in der Sidebar (kein `placement`), direkt nach den anderen Skill-Einträgen oder an einem eigenen Platz (Chef-Entscheidung: wo in der Liste?).

### NavView

Kein neuer `NavView`-Typ nötig — `"skill"` mit `skillId: "slayer"` reicht.

### App.tsx

Im `case "skill":`-Block, analog zu Farming:

```ts
if (page.skillId === "farming")  return <FarmPage />;
if (page.skillId === "slayer")   return <SlayerPage />;
return <SkillPage skillId={page.skillId ?? ""} />;
```

`SlayerPage` wird in `pages/SlayerPage.tsx` implementiert. Keine Änderung am restlichen Routing.

---

## 2. Seiten-Gesamtstruktur

```
┌─────────────────────────────────────────────────────────────────┐
│  .skill-head  (Slayer — Level 42 — XP-Bar)                      │
├─────────────────────────────────────────────────────────────────┤
│  .slayer-master-tabs  [Dunn ▸ Mazchna ▸ Vannaka ▸ …]           │
│  (Tabs für freigeschaltete Master; gesperrte = ausgegraut)       │
├───────────────────────────┬─────────────────────────────────────┤
│  .slayer-dialog-col (40%) │  .slayer-task-col (60%)             │
│                           │                                     │
│  [Master-Porträt]         │  .slayer-task-panel                 │
│                           │  (aktueller Task / kein Task)       │
│  .slayer-speech-box       │                                     │
│  (Sprechblase)            │  .slayer-points-bar                 │
│                           │  (Slayer-Punkte)                    │
└───────────────────────────┴─────────────────────────────────────┘
│  .slayer-bottom-tabs  [ Reward Shop | Tower ]                   │
├─────────────────────────────────────────────────────────────────┤
│  .slayer-rewards-panel  ODER  .slayer-tower-panel               │
└─────────────────────────────────────────────────────────────────┘
```

**Scrollverhalten:** `.slayer-page` ist ein normaler `div` im `.content-body`-Scroll-Container; die obere Dialog-Sektion bleibt kompakt (~300px Höhe), Bottom-Tabs scrollen mit.

---

## 3. Skill-Kopf

Exakt das `.skill-head`-Muster aus `FarmPage.tsx` und `SkillPage.tsx`:

```
┌──────────────────────────────────────────────────────┐
│  Slayer                          [Level 42]           │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  12 340 / 18 000 XP   69% │
└──────────────────────────────────────────────────────┘
```

CSS: `.skill-head`, `.skill-head-title`, `.skill-level-badge`, `.skill-xpbar`, `.bar.tall`, `.bar-fill`  
Strings: `skill.level`, `skill.toNext` (beide bereits vorhanden, keine neuen Keys).

---

## 4. Master-Auswahl (Tabs)

```
[ Dunn  Lv 1+ ]  [ Mazchna  Lv 20+ ]  [ Vannaka  Lv 40+ ]  [ 🔒 Chaeldar  Lv 60+ ]  [ 🔒 Nieve  Lv 80+ ]
```

- Aktiver Tab: `.slayer-master-tab.active` (Goldrand wie `.skillcard.active`)
- Gesperrte Tab: `.slayer-master-tab.locked` (gedimmt, Lock-Icon, Tooltip: "Slayer-Level {n} benötigt")
- Einfaches `useState<MasterId>` in `SlayerPage`; Default = höchster freigeschalteter Master

**CSS-Klassen (neu):** `.slayer-master-tabs`, `.slayer-master-tab`, `.slayer-master-tab.active`, `.slayer-master-tab.locked`  
Visuell: Reuse `.risk-option` / `.risk-option.active` aus Thieving als Vorbild für Toggle-Tabs.

---

## 5. Master-Dialog (linke Spalte)

```
┌──────────────────────────────┐
│   [Portrait 96×96 px]        │
│   pixelart, border: --gold   │
│                              │
│   Dunn                       │
│   "Slayer Master"            │
└──────────────────────────────┘
        ↓ Sprechblase
┌──────────────────────────────────────────────────────┐
│  .slayer-speech-box  (Pergament-Optik)               │
│  bg: bg_copper.png (gekachelt) + --panel 80% alpha   │
│  border: 1px solid --gold; border-radius: 4px        │
│                                                      │
│  "Ah, {playerName}. Dein nächstes Ziel wartet."      │
│  (dynamischer Dialogtext, abhängig von Task-Status)  │
└──────────────────────────────────────────────────────┘
```

- Portrait: `assets/portraits/slayermaster_<id>.png` — fällt auf Emoji `💀` zurück
- Dialogtext: 2–3 Varianten je Zustand (kein Task, Task läuft, Task abgeschlossen) — alle i18n-Keys
- Pergament-Box: `background-image: url(bg_copper.png)` (bereits in Palette), `background-repeat: tile`, mit `--panel`-Overlay für Lesbarkeit

**CSS-Klassen (neu):** `.slayer-dialog-col`, `.slayer-master-portrait`, `.slayer-master-name`, `.slayer-master-title`, `.slayer-speech-box`

---

## 6. Task-Panel (rechte Spalte)

### 6a. Kein aktiver Task

```
┌──────────────────────────────────────────────────────┐
│  .slayer-task-panel.empty                            │
│                                                      │
│  [💀 Kein aktiver Task]                              │
│  "Sprich mit einem Slayer-Master, um einen Task      │
│   zu erhalten."                                      │
│                                                      │
│  [ Neuen Task holen ]  ← .skillcard-cta              │
└──────────────────────────────────────────────────────┘
```

### 6b. Aktiver Task

```
┌──────────────────────────────────────────────────────┐
│  .slayer-task-panel                                  │
│                                                      │
│  ┌──────┐  Skelettbogenschütze              Lv 42    │
│  │[Img] │  [Ort: Slayer Tower, Etage 2]             │
│  └──────┘  [⚔ Combat: 35+ empfohlen]                │
│                                                      │
│  Fortschritt    34 / 120                             │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░  28%                │
│  (= .bar.tall + .bar-fill, accent-colored)           │
│                                                      │
│  [⚠ Anforderungs-Item fehlt: Nasenklammer]           │  ← .slayer-req-warning (--gold bg, bold)
│                                                      │
│  [ Zum Monster / Quick-Travel ]  .skillcard-cta      │
│  [ Neuen Task holen (kostet 30 Pkt) ]  .skillcard-cta.stop
│  [ Task abbrechen ]  kleiner Link-Button .muted      │
└──────────────────────────────────────────────────────┘
```

- Monster-Icon: `getItemImage(monsterId)` — Fallback auf Monster-Emoji aus Bestiary-Muster
- Ort-Badge: Welt-Text ODER "Slayer Tower, Etage N" — eigene `.slayer-task-location`-Zeile mit Icon
- Anforderungs-Item-Warnung: nur sichtbar wenn `state.inventory` das Item nicht enthält; goldene Warn-Box, kein Toast-Spam
- Quick-Travel: `onNavigate("combat")` + setzt Zone/Monster-Filter im CombatPage über shared State oder Context-Param (Chef-Entscheidung: Engine-seitige Unterstützung nötig)
- "Task abbrechen": ohne Punktekosten (kostet beim OSRS-Äquivalent keine Punkte für normalen Cancel — Chef-Entscheidung)

**CSS-Klassen (neu):** `.slayer-task-panel`, `.slayer-task-panel.empty`, `.slayer-task-monster`, `.slayer-task-monster-img`, `.slayer-task-location`, `.slayer-task-progress`, `.slayer-req-warning`, `.slayer-task-actions`

---

## 7. Punkte-Bar

Direkt unter dem Task-Panel, vor den Bottom-Tabs:

```
┌────────────────────────────────────────────────────┐
│  💀 Slayer-Punkte:  [★ 430]      (var(--gold))     │
└────────────────────────────────────────────────────┘
```

Einfache einzeilige Leiste. Punkte = `state.skills.slayer?.points ?? 0`.

**CSS-Klassen (neu):** `.slayer-points-bar`, `.slayer-points-value`

---

## 8. Bottom-Tabs: Reward Shop | Tower

```
[ Reward Shop ]  [ Slayer Tower ]
```

Toggle via `useState<"shop" | "tower">`.

### 8a. Reward Shop

```
┌──────────────────────────────────────────────────────┐
│  .slayer-rewards-panel                               │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ [Img] Slayer-Helm (draft)        500 Pkt    │    │
│  │       "Kombiniert Schutzeffekte deiner      │    │  ← .slayer-reward-card
│  │        Helm-Upgrades."                      │    │
│  │       [ Freischalten ] / [✓ Freigeschaltet] │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ [Img] Erweiterte Task-Liste         200 Pkt │    │
│  │       "Zugang zu mehr Monster-Tasks."       │    │
│  │       [ Freischalten ]                      │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ [Img] Task-Block (einmalig)          50 Pkt │    │
│  │       "Blockiert einen Monster-Typ          │    │
│  │        dauerhaft."                          │    │
│  │       [ Einlösen ]                          │    │
│  └─────────────────────────────────────────────┘    │
│  … weitere Belohnungen …                            │
└──────────────────────────────────────────────────────┘
```

- Layout: vertikale Liste `.slayer-reward-list`, jede Karte `.slayer-reward-card`
- Karte: links Item-Icon (`.ItemCell`-Muster, `getItemImage`), mitte Name + Beschreibung, rechts Preis + Button
- Button-Zustände: "Freischalten" (genug Punkte), "Freischalten" disabled (zu wenig Punkte, Tooltip), "Freigeschaltet" (gegraut, Text-Label)
- Karten-BG: `var(--panel)`, border `var(--border)`, Preis in `var(--gold)`

**CSS-Klassen (neu):** `.slayer-rewards-panel`, `.slayer-reward-list`, `.slayer-reward-card`, `.slayer-reward-cost`

### 8b. Slayer Tower

```
┌──────────────────────────────────────────────────────┐
│  .slayer-tower-panel                                 │
│  "Der Slayer Tower — 5 Etagen, jede mit eigenen      │
│   Monstern und einzigartigen Drops."                 │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Etage 1  │  │ Etage 2  │  │ Etage 3  │           │
│  │ Lv 1–19  │  │ Lv 20–39 │  │ Lv 40–59 │           │
│  │[Freigesch│  │[Freigesch│  │ 🔒 Slayer │           │
│  │  altet]  │  │  altet]  │  │  Lv 40   │           │
│  │ [Betreten│  │ [Betreten│  │          │           │
│  │  ]       │  │  ]       │  │          │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐  ┌──────────┐                          │
│  │ Etage 4  │  │ Etage 5  │                          │
│  │ Lv 60–79 │  │ Lv 80–99 │                          │
│  │ 🔒 Lv 60  │  │ 🔒 Lv 80  │                          │
│  └──────────┘  └──────────┘                          │
└──────────────────────────────────────────────────────┘
```

- Grid: `display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;`
- Freigeschaltete Etage: `.slayer-floor-card` (analog `.plot-card`) mit Mob-Level-Range, Drops-Hinweis, Button "Betreten"
- Gesperrte Etage: `.slayer-floor-card.locked` wie `.plot-card.locked` — Schloss-Icon + "Slayer Lv N benötigt"
- "Betreten": navigiert zu Combat + setzt Tower-Zone-Filter (analog Quick-Travel)

**CSS-Klassen (neu):** `.slayer-tower-panel`, `.slayer-tower-grid`, `.slayer-floor-card`, `.slayer-floor-card.locked`, `.slayer-floor-header`, `.slayer-floor-range`, `.slayer-floor-lock`

---

## 9. ASCII-Gesamtmockup (vollständige Seite)

```
╔═══════════════════════════════════════════════════════════════════╗
║  content-header: Slayer  [💀 icon]              [GameStats →]    ║
╠═══════════════════════════════════════════════════════════════════╣
║  .skill-head                                                      ║
║  ┌───────────────────────────────────────────────────────────┐   ║
║  │  Slayer                              [Level 42]            │   ║
║  │  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  12 340 / 18 000 XP   69%         │   ║
║  └───────────────────────────────────────────────────────────┘   ║
╠═══════════════════════════════════════════════════════════════════╣
║  .slayer-master-tabs                                              ║
║  [ Dunn ▸ ] [ Mazchna ] [ Vannaka ] [🔒 Chaeldar] [🔒 Nieve]    ║
╠══════════════════════════╦════════════════════════════════════════╣
║  .slayer-dialog-col      ║  .slayer-task-col                     ║
║                          ║                                        ║
║  ┌────────────────────┐  ║  ┌──────────────────────────────────┐ ║
║  │  [Portrait 96px]   │  ║  │  .slayer-task-panel              │ ║
║  │  ──────────────    │  ║  │                                  │ ║
║  │  Dunn              │  ║  │  ┌─────┐  Skelettbogenschütze    │ ║
║  │  Slayer Master     │  ║  │  │[Img]│  Slayer Tower, Etage 2  │ ║
║  └────────────────────┘  ║  │  └─────┘  Lv 42                  │ ║
║                          ║  │                                  │ ║
║  ┌────────────────────┐  ║  │  Fortschritt    34 / 120         │ ║
║  │ .slayer-speech-box │  ║  │  ▓▓▓▓░░░░░░░░░░░░░   28%        │ ║
║  │                    │  ║  │                                  │ ║
║  │ "Dein nächstes     │  ║  │  ⚠ Nasenklammer fehlt!          │ ║
║  │  Ziel wartet,      │  ║  │                                  │ ║
║  │  Abenteurer…"      │  ║  │  [ Zum Monster ]                 │ ║
║  │                    │  ║  │  [ Neuen Task (30 Pkt) ]         │ ║
║  └────────────────────┘  ║  │  [ Task abbrechen ]              │ ║
║                          ║  └──────────────────────────────────┘ ║
║                          ║                                        ║
║                          ║  💀 Slayer-Punkte: ★ 430              ║
╠══════════════════════════╩════════════════════════════════════════╣
║  .slayer-bottom-tabs                                              ║
║  [ Reward Shop ] [ Slayer Tower ]                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║  --- Reward Shop (aktiver Tab) ---                                ║
║  ┌───────────────────────────────────────────────────────────┐   ║
║  │ [Img] Slayer-Helm (Draft)               ★ 500  [Kaufen]  │   ║
║  ├───────────────────────────────────────────────────────────┤   ║
║  │ [Img] Erweiterte Task-Liste             ★ 200  [Kaufen]  │   ║
║  ├───────────────────────────────────────────────────────────┤   ║
║  │ [Img] Task-Block (dauerhaft)            ★  50  [Kaufen]  │   ║
║  └───────────────────────────────────────────────────────────┘   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 10. i18n-Bedarf

Alle Keys müssen in `en` UND `de` eingetragen werden (compile-enforced parity).

### Neue Keys (Englisch / Deutsch)

| Key | EN | DE |
|-----|----|----|
| `nav.slayer` | "Slayer" | "Slayer" |
| `slayer.master.title` | "Slayer Master" | "Slayer-Meister" |
| `slayer.speech.noTask` | "Speak with me to receive a task, {name}." | "Sprich mit mir, {name}, um einen Auftrag zu erhalten." |
| `slayer.speech.taskActive` | "Your target awaits, {name}. Push on." | "Dein Ziel wartet, {name}. Weiter." |
| `slayer.speech.taskDone` | "Well done, {name}. Come back for more." | "Gut gemacht, {name}. Komm wieder." |
| `slayer.task.none` | "No active task." | "Kein aktiver Auftrag." |
| `slayer.task.noneHint` | "Speak with a Slayer Master to receive your next task." | "Sprich mit einem Slayer-Meister für einen neuen Auftrag." |
| `slayer.task.getTask` | "Get New Task" | "Neuen Auftrag holen" |
| `slayer.task.location` | "Location: {place}" | "Ort: {place}" |
| `slayer.task.progress` | "{done} / {total}" | "{done} / {total}" |
| `slayer.task.travel` | "Go to Monster" | "Zum Monster" |
| `slayer.task.skipCost` | "Skip Task ({n} pts)" | "Auftrag überspringen ({n} Pkt.)" |
| `slayer.task.cancel` | "Cancel task" | "Auftrag abbrechen" |
| `slayer.task.cancelConfirm` | "Abandon this task? You won't get Slayer XP or points." | "Auftrag abbrechen? Du erhältst keine XP oder Punkte." |
| `slayer.req.missing` | "Required: {item} — not in inventory!" | "Benötigt: {item} — nicht im Inventar!" |
| `slayer.points` | "Slayer Points" | "Slayer-Punkte" |
| `slayer.master.locked` | "Requires Slayer Level {n}" | "Benötigt Slayer-Level {n}" |
| `slayer.tab.shop` | "Reward Shop" | "Belohnungs-Shop" |
| `slayer.tab.tower` | "Slayer Tower" | "Slayer-Turm" |
| `slayer.shop.unlock` | "Unlock" | "Freischalten" |
| `slayer.shop.unlocked` | "Unlocked" | "Freigeschaltet" |
| `slayer.shop.notEnough` | "Not enough points" | "Nicht genug Punkte" |
| `slayer.shop.cost` | "{n} pts" | "{n} Pkt." |
| `slayer.tower.title` | "The Slayer Tower" | "Der Slayer-Turm" |
| `slayer.tower.intro` | "Five floors of escalating danger, each gated by Slayer level. Tower tasks grant unique drops." | "Fünf Etagen mit steigender Schwierigkeit, je nach Slayer-Level freigeschaltet. Tower-Aufgaben gewähren einzigartige Drops." |
| `slayer.tower.floor` | "Floor {n}" | "Etage {n}" |
| `slayer.tower.range` | "Lv {lo}–{hi}" | "Lv {lo}–{hi}" |
| `slayer.tower.enter` | "Enter Floor" | "Etage betreten" |
| `slayer.tower.locked` | "Slayer Lv {n} required" | "Slayer-Level {n} benötigt" |
| `slayer.location.tower` | "Slayer Tower, Floor {n}" | "Slayer-Turm, Etage {n}" |
| `slayer.location.world` | "Open World" | "Offene Welt" |

**Gesamt:** ~28 neue Key-Paare.

---

## 11. Engine/Content-Bedarf (offene Chef-Entscheidungen)

Diese Punkte **kann UI-Dev nicht allein lösen** — bitte an CEO/logic-dev/content-dev weiterleiten:

- **State-Felder** (logic-dev): `state.skills.slayer.points`, `state.slayerTask: { monsterId, target, killed, masterId, requiresItem? }`, `state.slayerUnlocks: Set<string>` (Reward-Shop-Käufe), `SAVE_VERSION` + Migration.
- **Engine-Funktionen** (logic-dev): `getSlayerTask()`, `cancelSlayerTask()`, `skipSlayerTask(cost)`, `completeSlayerTask()`, `buySlayerReward()`, `slayerTowerFloor(monsterId)` (gibt Etage 1–5 oder null zurück).
- **Content-Felder** (content-dev): `SlayerMasterDef` (id, name, minSlayerLevel, taskPool), `SlayerTaskPool` (monsterId, weightMin/Max, requiresItem?), `SlayerRewardDef` (id, name, cost, type), Slayer Tower Zonen + Monster-Zuordnung (5 Etagen), Anforderungs-Items (z.B. `nose_peg`).
- **Quick-Travel** (logic-dev + ui-dev): Benötigt einen Mechanismus, um von der Slayer-Seite direkt zur richtigen Zone/Monster im CombatPage zu navigieren. Optionen: (a) Context-Param `onNavigate("combat", { preselect: monsterId })`, (b) shared State-Feld `state.combatPreselect`. Chef-Entscheidung welcher Ansatz.
- **Slayer Tower als Zone** (content-dev): Braucht eigene ZoneDef (5 Sub-Zones, level-gated). Werden Tower-Monster auch im normalen Combat zugänglich? Oder nur über Task + Tower?
- **Porträt-Assets**: Slayer-Master-Portraits (`slayermaster_dunn.png` etc.) — Art-Request an Asset-Pipeline.
- **Task-Kill-Tracking** (logic-dev): Kill-Events müssen prüfen ob `monsterId === state.slayerTask?.monsterId` und Zähler inkrementieren.
- **Anforderungs-Item-Prüfung**: Soll die Warnung nur informieren (Kämpfe trotzdem möglich) oder den Task-Start blockieren? OSRS erlaubt den Kampf, zählt aber keinen Fortschritt. Chef-Entscheidung.
- **Master-Namen**: Dunn/Mazchna/Vannaka/Chaeldar/Nieve sind OSRS-Namen — sollen eigene Hearthforge-Originalnamen rein? Chef-Entscheidung.
- **Slayer-Helm**: Craftbar oder Shop-Kauf? Crafting-Rezept = content-dev. Helm-Effekte (kombiniert multiple Schutz-Effekte) = logic-dev.

---

## 12. Datei-Plan (bei Implementierung)

| Datei | Aktion |
|-------|--------|
| `apps/client/src/renderer/pages/SlayerPage.tsx` | Neu erstellen |
| `apps/client/src/renderer/navigation.ts` | Slayer-Eintrag hinzufügen |
| `apps/client/src/renderer/App.tsx` | Routing-Guard für `slayer` |
| `apps/client/src/renderer/i18n/translations.ts` | ~28 neue Key-Paare (en + de) |
| `apps/client/src/renderer/styles.css` | Neue `.slayer-*`-Klassen |
| `apps/client/src/renderer/assets/portraits/` | Slayer-Master-Portraits (Art) |

Keine Änderungen an `packages/**` durch UI-Dev.
