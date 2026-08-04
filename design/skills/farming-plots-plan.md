# Farming — Passives Plot-/Beet-System (DESIGN-PLAN, PLAN-ONLY)

> Balance-Designer Spec für den Übernacht-Auftrag 2 (`design/overnight-ceo-plan.md`).
> **Kein Code, kein Content** — implementierungsreife Vorgaben für logic-dev (Engine/State/Persistenz),
> content-dev (Crop-Katalog) und ui-dev (Farm-Seite). Zahlen sind verbindlich; IDs/Strings exemplarisch.
>
> Grundlage gelesen: `packages/engine/src/tick.ts` (advance/step), `state.ts` (createGame),
> `packages/shared/src/index.ts` (GameState, ActionDef, SAVE_VERSION=33), `packages/persistence/src/index.ts`
> (migrate/sanitize/deserialize-Offline), `packages/content/src/index.ts` (aktuelle `farm_*`-Aktionen),
> `apps/client/src/renderer/game/GameContext.tsx` (RAF-Loop, Autosave), und `design/skills/farming.md`
> (Crop-/Vertrags-Katalog, der hier als Crop-Quelle übernommen wird).

---

## 0. Kernidee in einem Satz

Farming wird vom „eine-Aktion-zur-Zeit"-Modell **entkoppelt**: der Spieler **pflanzt Saat in Plots**
(Level-abhängig mehrere parallel), die **passiv in Echtzeit reifen** (online wie offline), bei Reife
**automatisch geerntet** werden — **ohne** den einzelnen `activeActionId`-Slot zu belegen. Dadurch läuft
Farming *immer nebenbei*, während der Spieler kämpft, ein anderes Skilling betreibt oder weg ist.

Das ist der entscheidende Idle-Hebel: Farming konkurriert **nicht mehr** um den aktiven Aktions-Slot.

---

## 1. Logik & Datenmodell

### 1.1 Zeit-Anker: `state.elapsedMs`, NICHT `Date.now()`

Die Engine hat bereits eine deterministische Simulationsuhr: `step()` macht `state.elapsedMs += TICK_MS`
(100 ms/Tick). `advance(state, content, dtMs)` treibt sie **online** (dt aus dem RAF-Loop) **und offline**
(ein einziger großer `advance(state, content, offlineMs)` in `deserialize`, gedeckelt auf
`MAX_OFFLINE_MS = 24 h`) mit **derselben** Funktion.

→ **Reife wird gegen `state.elapsedMs` gemessen**, nicht gegen die Wanduhr. Das ist gleichzeitig die
gesamte Anti-Abuse-Antwort:

- `elapsedMs` bewegt sich **nur vorwärts** und **nur** über `advance` (Live-dt oder geclampter Offline-Block).
- Die einzige Wanduhr-Berührung ist `now - savedAt` in `deserialize`, bereits auf `[0, 24 h]` geclampt.
- Systemzeit zurückstellen, Save editieren etc. kann Reife **nicht** beschleunigen (kein Vorwärtssprung
  der Sim-Uhr). Wachstum ist strikt monoton.

`plantedAtMs` ist ein **Snapshot von `state.elapsedMs`** zum Pflanzzeitpunkt. Reife = `elapsedMs - plantedAtMs >= growMs`.

### 1.2 Neuer persistenter State

```ts
// shared/src/index.ts
export interface FarmPlot {
  /** Gepflanzte Crop-ID (Schlüssel in ContentDB.crops). null = leerer Plot. */
  cropId: string | null;
  /** Snapshot von state.elapsedMs beim Pflanzen (Sim-Uhr, nicht Wanduhr). */
  plantedAtMs: number;
  /** Bei Reife automatisch neu aussäen, solange Saat im Inventar/Lager ist. */
  autoReplant: boolean;
  /**
   * Fertige, aber (mangels Platz / autoBank=off) noch nicht eingelagerte Ernte, die als
   * „abholbar" auf dem Plot wartet. 0 = nichts offen. Verhindert Ertragsverlust.
   */
  readyYield: number;
  /** Item-ID der wartenden Ernte (für readyYield > 0). */
  readyItem: ItemId | null;
}

export const MAX_FARM_PLOTS = 9;        // harte Obergrenze (UI-Grid + Sanitize-Cap)

export interface GameState {
  // … bestehend …
  /** Passive Beete. Fixe Länge MAX_FARM_PLOTS; freigeschaltete Anzahl = plotsUnlocked(farmingLevel). */
  farmPlots: FarmPlot[];
}
```

Fixe Array-Länge `MAX_FARM_PLOTS` → stabile Indizes für die UI; die **freigeschaltete** Anzahl ist eine
**reine Funktion** des Farming-Levels (§2.1), kein State. Plots oberhalb des Unlocks werden „gesperrt" angezeigt.

### 1.3 Crop-Katalog (neue ContentDB-Sektion)

Die aktiven `farm_*`-Aktionen tragen heute schon Saat/Ertrag/XP/Level. Für Plots brauchen wir aber
**echte Wachszeiten** (Minuten/Stunden) und **passiv getunte XP** (§3). Sauberster Weg: ein eigener,
schlanker Crop-Katalog, der dieselben **Item-Verträge** (`herb_*`, `pigment_*`, `reed_*`, Cooking-/Flavor-Items
aus `design/skills/farming.md`) wiederverwendet:

```ts
// shared/src/index.ts
export interface CropDef {
  id: string;                 // z.B. "marshroot"
  name: LocalizedString;
  seedItem: ItemId;           // verbraucht beim Pflanzen
  yieldItem: ItemId;          // Vertrags-ID (herb_marshroot …)
  yieldMin: number;
  yieldMax: number;
  levelRequired: number;      // Farming-Level zum Pflanzen
  growMs: number;             // echte Wachszeit (§2.2)
  xp: number;                 // Farming-XP pro Ernte (passiv-getunt, §3)
  tier: 1 | 2 | 3 | 4 | 5;
  icon?: string;
}
export interface ContentDB { /* … */ crops: Record<string, CropDef>; }
```

> **Mapping**: jede Crop aus `design/skills/farming.md` (Vertrags-Kräuter, Pigmente, Schilf, Cooking, Flavor)
> wird **1:1** zu einem `CropDef` — gleiche Saat-/Ernte-IDs, neue `growMs` + passiv-`xp` aus den Tabellen unten.

### 1.4 Plot-Tick (Pseudocode)

Läuft **einmal pro `advance`** (nach dem Step-Loop, im `if (steps > 0)`-Block in `tick.ts`), rein
arithmetisch gegen `elapsedMs` — **nicht** pro 100-ms-Tick (unnötig). O(MAX_FARM_PLOTS) = 9 Operationen.

```text
function tickFarmPlots(state, content):
  unlocked = plotsUnlocked(levelFromXp(state.skills.farming?.xp ?? 0))
  for i in 0 .. MAX_FARM_PLOTS-1:
    plot = state.farmPlots[i]
    if i >= unlocked: continue            # gesperrt
    if plot.cropId == null: continue      # leer
    crop = content.crops[plot.cropId]
    if !crop: { plot.cropId = null; continue }   # defensiv (Content entfernt)

    elapsed = state.elapsedMs - plot.plantedAtMs
    if elapsed < crop.growMs: continue    # wächst noch

    cycles = floor(elapsed / crop.growMs) # >=1; offline evtl. mehrere
    # Anti-DoS: cycles ist durch 24h-Offline-Cap / growMs natürlich beschränkt (≤ 24h/10min = 144).

    harvested = 0
    for c in 1 .. cycles:
      grantHarvest(state, content, crop)  # Ertrag (RNG min..max) + Farming-XP + Mastery(optional)
      harvested++
      # nächste Runde nur, wenn Auto-Replant UND Saat vorhanden:
      if plot.autoReplant and hasSeed(state, crop.seedItem):
        consumeSeed(state, crop.seedItem)
        continue
      else:
        break                             # eine Ernte fertig; Plot wird leer/wartend

    if plot.autoReplant and harvested == cycles and hasSeed-bei-letztem-Schritt:
      plot.plantedAtMs += cycles * crop.growMs   # Rest-Fortschritt übernehmen (kein Verlust)
    else:
      plot.cropId = null                          # Plot ist nun leer (manuell neu bepflanzen)
      plot.plantedAtMs = 0
```

`grantHarvest` spiegelt die bestehende Loot-/XP-Logik aus `completeAction`:
- Farming-XP `+= crop.xp` (passiv-getunt). Buffs/Pets dürfen wie gehabt multiplizieren (optional, §7).
- Ertrag `nextInt(min,max)` → `addItemOrBank` (Auto-Bank-Komfort wie bei Aktionen).
- Passt der Ertrag NICHT (Inventar voll **und** `autoBank=off`): in `plot.readyYield/readyItem` parken
  (statt verlieren) → UI zeigt „abholbar". Beim nächsten Tick / manuellen Collect erneut versuchen einzulagern.
- `state.stats.itemsGathered += gained` (zählt für Achievements/Quests, konsistent mit Gather-Aktionen).

**Saat-Verbrauch beim PFLANZEN** (nicht bei der Ernte): `plantCrop(plotIndex, cropId)` prüft Level +
Saatbesitz, zieht **1 Saat** sofort ab, setzt `cropId/plantedAtMs=elapsedMs/readyYield=0`. Das ist
anti-abuse-sauber (kein „pflanzen ohne Kosten") und macht Auto-Replant zu einer ehrlichen Saat-Senke.

### 1.5 Offline-Mehrzyklen — Mathe

Beim Laden ruft `deserialize` genau einen `advance(state, content, offlineMs)` mit `offlineMs ≤ 24 h`.
Dabei springt `elapsedMs` um bis zu 24 h. `tickFarmPlots` läuft danach (im `steps>0`-Block) **einmal** und
rechnet `cycles = floor(elapsed/growMs)` **arithmetisch** — kein Schleifen über zehntausende Ticks.
Begrenzung der Zyklen:
- **Auto-Replant aus**: max **1** Ernte pro Plot pro Abwesenheit (klassisches „reif & wartet").
- **Auto-Replant an**: bis zu `floor(offline/growMs)` Ernten, zusätzlich durch **vorhandene Saat** begrenzt
  (jede Runde zieht 1 Saat; geht die Saat aus, stoppt der Plot leer/wartend).

→ Offline-Ertrag ist damit **planbar und seed-begrenzt**, keine Explosion. Die `OfflineSummary`
(„Während du weg warst") erfasst die Plot-Ernten automatisch, weil sie über `addItemOrBank` +
`skills.farming.xp` laufen und `deserialize` die Differenz vor/nach `advance` bildet.

---

## 2. Freischaltung, Wachszeiten, Ertrag

### 2.1 Plot-Freischaltung (Funktion des Farming-Levels)

Viele Sprossen, kein Cliff: 7 Stufen von 3 → 9 Plots.

| Farming-Lv | Plots | Anker |
|---|---|---|
| 1  | 3 | Start: sofort drei parallele Beete |
| 10 | 4 | |
| 25 | 5 | |
| 40 | 6 | |
| 55 | 7 | |
| 70 | 8 | |
| 85 | 9 | Vollausbau |

```ts
const PLOT_UNLOCK: Array<[level: number, plots: number]> =
  [[1,3],[10,4],[25,5],[40,6],[55,7],[70,8],[85,9]];
export function plotsUnlocked(farmingLevel: number): number {
  let p = 3; for (const [lv,n] of PLOT_UNLOCK) if (farmingLevel >= lv) p = n; return p;
}
```

### 2.2 Wachszeiten je Tier (echte Idle-Zeiten)

Lang genug, dass es sich nach „pflanzen & später/nächste Session wiederkommen" anfühlt; alle ≤ 24 h
(reift offline voll, mehrere Zyklen bei Auto-Replant). Tiers wie in `farming.md`.

| Tier | Level-Band | Wachszeit `growMs` |
|---|---|---|
| T1 | 1–20  | **10 min**  (600 000) |
| T2 | 21–40 | **20 min**  (1 200 000) |
| T3 | 41–60 | **40 min**  (2 400 000) |
| T4 | 61–80 | **80 min**  (4 800 000) |
| T5 | 81–99 | **160 min** (9 600 000) |

### 2.3 Ertrag (Batch je Ernte)

Längere Wartezeit → größerer Batch, aber bewusst **Supplement, nicht Flut** (Material/h-Check §3.3).

| Tier | Ertrag `yieldMin–yieldMax` |
|---|---|
| T1 | 6–9 |
| T2 | 7–11 |
| T3 | 8–12 |
| T4 | 10–15 |
| T5 | 12–18 |

---

## 3. Balance

### 3.1 XP-Anker: per-Plot = 15 % der Zielkurve

`target_xph(L) = 90·√(xpForLevel(L+1) − xpForLevel(L))` (aus `engine/leveling.ts` verifiziert).

Passive XP pro Ernte: **`xp = max(1, round(0.15 · target_xph(levelRequired) · growMs / 3_600_000))`.**

`PLOT_XP_SHARE = 0.15` ist der Identitäts-Hebel: **ein** Plot bringt nur 15 % der nackten Kurven-XP/h.
Die Progression liegt im **Plot-Count** (3 → 9). Damit bleibt die Summe aller Plots stets ungefähr auf
oder unter dem, was *eine* aktiv betriebene Farm-Aktion (1,25× Kurve) liefert — obwohl Plots **parallel +
offline** laufen. Die Parallelität/Offline-Fähigkeit ist die Belohnung, nicht ein XP/h-Sprung.

### 3.2 XP-Tabelle (Crop-Katalog aus farming.md, passiv-getunt)

`xp/harv` = passiv-XP pro Ernte; `per-Plot xph` = realisierte XP/h eines Plots (konstant 15 % der Kurve).

| Crop (Vertrag) | Lv | Tier | grow | xp/harv | per-Plot xph |
|---|---|---|---|---|---|
| gravetato      | 4  | T1 | 10 m | 24    | 144 |
| reed_pale      | 6  | T1 | 10 m | 26    | 156 |
| herb_marshroot | 8  | T1 | 10 m | 29    | 174 |
| pigment_umber  | 12 | T1 | 10 m | 36    | 216 |
| bloodgrain     | 22 | T2 | 20 m | 116   | 348 |
| herb_bloodthistle | 26 | T2 | 20 m | 142 | 426 |
| mandrake_root  | 30 | T2 | 20 m | 173   | 519 |
| soulgourd      | 42 | T3 | 40 m | 624   | 936 |
| pigment_verdant| 44 | T3 | 40 m | 689   | 1 034 |
| herb_gravemoss | 46 | T3 | 40 m | 761   | 1 142 |
| reed_iron      | 46 | T3 | 40 m | 761   | 1 142 |
| gallows_apple  | 50 | T3 | 40 m | 927   | 1 391 |
| wither_leek    | 62 | T4 | 80 m | 3 358 | 2 519 |
| pigment_violet | 64 | T4 | 80 m | 3 707 | 2 780 |
| herb_nightbloom| 66 | T4 | 80 m | 4 093 | 3 070 |
| corpse_lily    | 70 | T4 | 80 m | 4 989 | 3 742 |
| pigment_radiant| 84 | T5 | 160 m| 19 954| 7 483 |
| reed_void      | 84 | T5 | 160 m| 19 954| 7 483 |
| ambergrain     | 84 | T5 | 160 m| 19 954| 7 483 |
| herb_godsbreath| 86 | T5 | 160 m| 22 031| 8 262 |

### 3.3 Gesamt-Durchsatz vs. aktive Skills

Total passive Farming-XP/h = `plotsUnlocked(L) · 0.15 · target_xph(L)` (alle Plots auf Level-Tier):

| Lv | Plots | Total passiv xph | = % Kurve | Aktive Farm-Aktion (1,25×) |
|---|---|---|---|---|
| 1  | 3 | 369     | 45 %  | 1 025 |
| 10 | 4 | 771     | 60 %  | 1 606 |
| 25 | 5 | 2 023   | 75 %  | 3 371 |
| 40 | 6 | 5 089   | 90 %  | 7 068 |
| 55 | 7 | 12 467  | 105 % | 14 841 |
| 70 | 8 | 29 933  | 120 % | 31 180 |
| 85 | 9 | 70 763  | 135 % | 65 521 |
| 99 | 9 | 141 522 | 135 % | 131 039 |

**Lesart:** passives Farming bleibt bis ~L70 **unter** einer aktiv betriebenen Farm-Aktion und liegt erst
im Endgame leicht (1,35× vs. 1,25×) darüber — gerechtfertigt durch 160-min-Realzyklen + Saatkosten. Nie
„übermächtig", nie 0 XP/h, monoton steigend.

**Material/h (Supplement-Check):** z. B. T1 früh = 3 Plots · ~7,5 Stück / (10 min) = **~135/h**; T5 spät =
9 Plots · ~15 / (160 min) = **~51/h**. Aktives Foraging liefert ~1 000+/h. Plots sind also ein
**verlässlicher Hintergrund-Tropfen** (~5–15 % des aktiven Durchsatzes) für Herblore/Cooking/Inscription —
genau die „läuft immer nebenbei"-Rolle, keine Überflutung der Crafting-Senken.

### 3.4 Verzahnung (Utility-Kette bleibt intakt)
- **Herblore**: `herb_*`-Plots = stetiger Kräuter-Nachschub parallel zum Wildsammeln.
- **Inscription**: `pigment_*` (Tinte) + `reed_*` (Pergament) tröpfeln passiv.
- **Cooking**: Gemüse/Getreide (`gravetato`, `bloodgrain`, `soulgourd`, `wither_leek`, `ambergrain`).
- **Saat-Kopplung**: `*_seed` droppt beim Foraging (bestehender Mechanismus, vgl. `bloodbeet_seed`) →
  Foraging speist Farming; Auto-Replant macht die Saat zur echten Senke.

---

## 4. Koexistenz mit den aktiven `farm_*`-Aktionen

**Empfehlung: KONVERTIEREN statt zwei Farm-UIs.** Die aktiven `farm_*`-Aktionen (heute Gathering-Style,
belegen `activeActionId`) werden **in den Crop-Katalog überführt** (gleiche Saat-/Ernte-Items, neue
`growMs` + passiv-`xp`) und als aktive Aktionen **entfernt**. Begründung:
- Der Chef-Vision-Kern ist „**keine** aktive Aktion". Zwei parallele Farming-Pfade (aktiv + passiv) wären
  verwirrend und würden den Aktions-Slot wieder besetzen.
- Items/Verträge (`herb_*`/`pigment_*`/`reed_*`/Cooking/Flavor) bleiben **unverändert** — nur die
  Bezugs-Mechanik (Plot statt Aktion) ändert sich. Herblore/Cooking/Inscription merken nichts.
- Farming gibt damit den `activeActionId`-Slot **vollständig** frei → Spieler kann aktiv ein anderes Skill
  betreiben, während alle Beete passiv laufen. Maximaler Idle-Gewinn.

> **Chef-Entscheidung A** (Default: konvertieren). Alternative „koexistieren": aktive `farm_*` als schneller
> Hands-on-XP-Pfad behalten, Plots als Material-Hintergrund. Risiko: Doppel-Pfad/Doppel-Tuning + Slot-Konflikt.
> Ich empfehle **konvertieren**.

---

## 5. UI — Farm-Seite (Citadel-Look)

Neue Seite **„Farm"** (ersetzt die Farming-`SkillPage`; Sidebar-Eintrag „Anbau/Farming" verlinkt dorthin).
Grid aus Plot-Cards, **max. 3 Spalten** (Memory: Karten-Layout). Holzrahmen/Pergament/Cinzel, echte Icons
via `getSkillIcon`/Item-Icons. Liest `useGameState()`; der bestehende RAF-`tick` aus `GameContext` triggert
das Re-Render → Progress-Bar/Restzeit aktualisieren sich pro Frame ohne neuen Loop.

```text
┌──────────────────────── FARM (Anbau)  ·  Lv 47  ·  Plots 6/6 frei ────────────────────────┐
│  Auto-Ernte: AN   ·   [Alle ernten]   ·   Hintergrund-Ertrag läuft auch offline weiter      │
├───────────────────────────┬───────────────────────────┬───────────────────────────────────┤
│  PLOT 1  · Gravemoss 🌿    │  PLOT 2  · leer            │  PLOT 3  · Soulgourd 🎃 (REIF)    │
│  ▓▓▓▓▓▓▓▓░░░░  64%         │   ＋ Saat pflanzen          │  ✔ abholbar: 11×                  │
│  Restzeit 14:22            │  (Picker: nur pflanzbare    │  [Ernten]                         │
│  Ertrag 8–12 · 761 XP      │   Crops ≤ Lv, mit Saat)     │  Auto-Replant ☑                   │
│  Auto-Replant ☑  [Roden]   │                             │                                   │
├───────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│  PLOT 4  · Ironreed 🪵     │  PLOT 5  · leer            │  PLOT 6 🔒 gesperrt               │
│  ▓▓░░░░░░░░░░  18%         │   ＋ Saat pflanzen          │  Frei ab Farming Lv 55            │
│  Restzeit 32:48            │                             │   (ausgegraut)                    │
└───────────────────────────┴───────────────────────────┴───────────────────────────────────┘
```

**Card-Zustände:**
- **leer + frei** → „＋ Saat pflanzen" öffnet **Crop-Picker** (gefiltert: `levelRequired ≤ farmingLevel`
  UND Saat im Inventar/Lager; zeigt grow/Ertrag/XP/Saat-Bestand). Auswahl ruft `plantCrop(i, cropId)`.
- **wachsend** → Crop-Icon, Progress-Bar `(elapsedMs − plantedAtMs)/growMs`, Restzeit, Ertrag-/XP-Vorschau,
  `Auto-Replant`-Toggle, **Roden** (Crop entfernen — Saat verfällt, Bestätigungs-Dialog).
- **reif/abholbar** (`readyYield > 0`) → Glow + „Ernten" (manueller Fallback, falls Auto-Einlagern blockiert war).
- **gesperrt** (Index ≥ `plotsUnlocked`) → Padlock + „Frei ab Farming Lv X".

**Engine-Lese-/Schreib-API (logic-dev)**, die die UI nutzt (Mutationen NICHT in der UI rechnen):
`plantCrop(state, content, plotIndex, cropId)`, `uprootPlot(state, plotIndex)`,
`collectPlot(state, content, plotIndex)`, `setAutoReplant(state, plotIndex, bool)`,
`plotProgress(state, content, plotIndex): {growing, pct, remainingMs, ready}` (reine Lese-Funktion fürs Rendern).

---

## 6. Migration & Persistenz

**SAVE_VERSION 33 → 34.**

`migrateState` (idempotent, defensiv):
```text
if (!Array.isArray(state.farmPlots)) state.farmPlots = [];
while (state.farmPlots.length < MAX_FARM_PLOTS)
  state.farmPlots.push({ cropId:null, plantedAtMs:0, autoReplant:false, readyYield:0, readyItem:null });
state.farmPlots.length = MAX_FARM_PLOTS;   // auf fixe Länge trimmen
```
`createGame` (`state.ts`): `farmPlots` mit `MAX_FARM_PLOTS` leeren Plots initialisieren.

`sanitizeState` (Security-Härtung, kein Versions-Bump nötig, läuft bei jedem Load):
- `farmPlots` als Array erzwingen, Länge `MAX_FARM_PLOTS`.
- `cropId` nur behalten, wenn `content.crops[cropId]` existiert, sonst `null` (+ Plot zurücksetzen).
- `plantedAtMs = clampFinite(plantedAtMs, 0, state.elapsedMs)` (nie in der Zukunft → kein Negativ-Wachstum/Exploit).
- `readyYield = clampFinite(0, QTY_HARD_CAP)`, `readyItem` nur wenn `known(readyItem)`, sonst `readyYield=0/readyItem=null`.
- `autoReplant` zu Boolean casten.

> **Save-Logik-Memo beachtet** (`always-update-save-logic`): neues persistentes Feld ⇒ SAVE_VERSION-Bump
> + Migration + Sanitize, alles oben spezifiziert.

---

## 7. „Test durch" — Machbarkeit & Edge-Cases

**State-Größe:** 9 Plots × {cropId(~15 B), plantedAtMs(Zahl), autoReplant(Bool), readyYield/readyItem} ≈
**~0,5 KB JSON**. Vernachlässigbar gegen Inventar/Bank/Combat-Log. Kein Save-Bloat.

**Tick-Kosten:** `tickFarmPlots` läuft **einmal pro `advance`** (nicht pro 100-ms-Tick), O(9) Arithmetik.
Live ~60×/s × 9 = trivial. Kein per-Zyklus-Loop offline (Zyklen arithmetisch, max ~144 bei T1/24 h).

**Offline-Mathe:** verifiziert gegen `deserialize`-Pfad — ein `advance(offlineMs≤24h)`, danach
`tickFarmPlots` rechnet `floor(elapsed/growMs)`. Auto-Replant seed-begrenzt; Auto-Replant-aus = 1 Ernte.
`OfflineSummary` erfasst Ertrag/XP automatisch (Diff vor/nach `advance`).

**Edge-Cases & Verhalten:**
| Fall | Verhalten |
|---|---|
| Voller Plot, Inventar voll, autoBank **an** | Ertrag → Lager (kein Verlust). |
| Voller Plot, Inventar voll, autoBank **aus** | Ertrag wartet als `readyYield` → UI „abholbar". |
| Leerer Plot | Tick überspringt (cropId null). |
| Crop-Wechsel/Roden bei wachsendem Plot | Saat verfällt (Bestätigung). cropId→null. |
| Auto-Replant an, Saat alle | Letzte Ernte gewährt, dann Plot leer/wartend. |
| Crop aus Content entfernt (Update) | Sanitize/Tick setzt Plot defensiv auf leer. |
| Plot-Index ≥ Unlock (Level-Verlust unmöglich, aber defensiv) | gesperrt, Tick überspringt — **kein** Datenverlust, reift weiter wenn später wieder frei. |
| Mehrere volle Zyklen offline ohne Replant | genau **1** Ernte (klassisch reif & wartend). |

**Determinismus/RNG:** `grantHarvest` zieht `nextFloat`/`nextInt` aus `state.rng` exakt wie
`completeAction`. Da Plots **nach** dem Step-Loop laufen, ändert sich die bestehende Aktions-RNG-Sequenz
nicht (Plots ziehen nur, wenn tatsächlich geerntet wird) → bestehende Determinismus-Fixtures unberührt,
**solange** kein leerer Plot je würfelt (Pseudocode garantiert das).

**Verifikation nach Umsetzung:** `tsc` + `pnpm --filter @hearthforge/engine test` (cache-frisch, vgl.
`turbo-test-cache-gotcha`). Neue Guard-Tests vorschlagen: (a) Reife exakt bei `growMs`; (b) Offline-N-Zyklen
mit/ohne Replant; (c) Saat-Erschöpfung stoppt sauber; (d) Sanitize clampt `plantedAtMs ≤ elapsedMs`;
(e) leerer Plot zieht keine RNG (Determinismus-Snapshot).

---

## 8. Risiken & offene Chef-Entscheidungen

1. **Entscheidung A — Konvertieren vs. Koexistieren** (§4). *Default/Empfehlung: konvertieren* (aktive
   `farm_*` entfernen, Crops in `crops`-Katalog). Sicherer Default, falls keine Antwort: konvertieren.
2. **Auto-Replant Default** — Vorschlag **AN** pro Plot (maximaler Idle-Komfort), aber transparent als
   Saat-Senke. Risiko: ungewolltes Saat-Verbrennen. *Default: AN, jederzeit pro Plot abschaltbar; globaler
   Toggle im Header.* (Konservative Alternative: Default AUS.)
3. **`PLOT_XP_SHARE = 0.15`** — Endgame-Total 1,35× Kurve (§3.3). Wenn der Chef Plots strikt ≤ aktives
   Farming will: `0.13` → Endgame ~1,17×. Reiner Skalar, trivial justierbar.
4. **Mastery für Plots?** — Vorschlag: Plots speisen **keine** per-Aktion-Mastery (Mastery ist an
   `activeActionId` gekoppelt; Plots haben keinen). Farming-Mastery entfällt damit oder wandert auf einen
   skillweiten Bonus. *Default: keine Mastery für Plots* (sauberste Variante). Chef-Bestätigung erbeten.
5. **Buffs/Pets auf Plot-Ertrag** — Vorschlag: Skilling-XP-/Yield-Buffs & Farming-Pet wirken auch passiv
   (konsistent mit Gather-Aktionen). Niedriges Risiko (gedeckelt). *Default: ja.*
6. **Grow-Zeiten** (10 min … 160 min) sind Idle-fair und ≤ 24 h. Falls „über Nacht eine Ernte" gewünscht:
   T5 könnte auf ~6–8 h gehoben werden (dann XP/Ernte entsprechend höher, XP/h bleibt gleich). *Default:
   wie Tabelle §2.2.*

---

## 9. Apply-Liste (geordnet, nach Revier)

**logic-dev (Engine + shared + persistence):**
1. `shared`: `FarmPlot`, `MAX_FARM_PLOTS=9`, `CropDef`, `ContentDB.crops`, `GameState.farmPlots`,
   `PLOT_UNLOCK`/`plotsUnlocked`, `PLOT_XP_SHARE=0.15`. `SAVE_VERSION 33→34`.
2. `engine/state.ts`: `farmPlots` in `createGame` mit 9 leeren Plots initialisieren.
3. `engine/tick.ts`: `tickFarmPlots(state, content)` im `if (steps>0)`-Block (§1.4); `grantHarvest`
   (Loot/XP/Stats analog `completeAction`).
4. `engine`: Lese-/Schreib-API `plantCrop`/`uprootPlot`/`collectPlot`/`setAutoReplant`/`plotProgress`.
5. `persistence`: Migration (Default-Fill auf fixe Länge) + Sanitize-Clamps (§6).
6. Guard-Tests (§7).

**content-dev (`content/src/index.ts`):**
7. `crops`-Katalog füllen: jede Crop aus `design/skills/farming.md` → `CropDef` (Saat-/Ernte-IDs **exakt**,
   `growMs` aus §2.2, `xp` aus §3.2, `tier`, `levelRequired`, `yieldMin/Max` aus §2.3).
8. Aktive `farm_*`-Aktionen entfernen (Entscheidung A = konvertieren). Saat-Drops im Foraging bleiben.

**ui-dev (`apps/client/.../renderer`):**
9. Farm-Seite (Plot-Grid, max 3 Spalten, Citadel-Look, §5), Crop-Picker, Progress/Restzeit aus
   `plotProgress`, Auto-Replant-Toggle, Ernten/Roden, Sidebar-Verlinkung.

**Nicht in diesem Plan:** konkrete Herblore-/Cooking-/Inscription-Rezepte (eigene Skill-Docs); Pixelart der
Plot-/Crop-Icons (Asset-Pipeline).
