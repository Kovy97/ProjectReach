# Sweep 2026-07-01 — 05 Idle / AFK / Offline

**Tester:** Kontrolleur (QA)
**Fokus:** Offline-Cap (8h), `activePlayMs` (Offline zählt nicht als Spielzeit), Auto-Eat über lange AFK-Kämpfe, Offline-Popup-Erträge inkl. Skill-Icons, Determinismus (großer Offline-Sprung == viele kleine Ticks), Grenzfälle, Farming über Offline.
**Methode:** Headless Vitest gegen echte Engine (`advance` mit `offline`-Flag), Persistenz-Pfad (`serialize`/`deserialize`), `SimPlayer` für Kampf/Auto-Eat. Keine Electron-, keine Render-Prüfung.

## Verdikt: **fix-then-ship** (1× P2 Determinismus-Gap, 2× P3 Doku). Kernfunktionen alle grün.

---

## Findings

### P2 — Determinismus: Offline-Sprung ≠ Online-Ticks, wenn ein Farm-Plot gleichzeitig reift
- **Kategorie:** Korrektheit / Determinismus
- **Repro (produktionsnah):** Melee-Char, `food` gesetzt, ein `graywort`-Plot bepflanzt (Auto-Replant, Saat vorrätig), Kampf gegen `chicken` gestartet. Dann 1h vergehen lassen, EINMAL als Offline-Catch-up (`deserialize`, ein `advance(3_600_000, {offline:true})`) vs. als Live-Loop (36000× `advance(100ms)`). Gleicher Seed (9), gleicher Startzustand.
- **Erwartet:** Beide Pfade liefern identisches Ergebnis (die vom Task geforderte Invariante „großer Offline-Sprung == viele kleine Ticks").
- **Tatsächlich:** Ergebnisse divergieren.
  - Kills: **913 (offline) vs 916 (live)**
  - Items gesamt: **113977 (offline) vs 114034 (live)** — differiert um 57 (nicht bloß Umverteilung)
  - `graywort` 49 vs 45, `feather` 1523 vs 1535, `rng.state` 2117238408 vs 405978689
- **Root Cause:** `tickFarmPlots` läuft EINMAL pro `advance()`-Aufruf (nach der Step-Schleife, `tick.ts:318`) und zieht seine Ernte-RNG (`grantHarvest` → `nextInt`, `farming.ts:97`) aus demselben `state.rng`-Stream wie Kampf/Aktion. Offline = 1 großer `advance` → alle Farming-Würfe am Stück ganz am Ende. Online = viele kleine `advance` → Farming-Würfe interleaven zwischen den Kampf-/Aktions-Würfen. Dadurch verschiebt sich die Wurf-REIHENFOLGE des gemeinsamen RNG → andere Treffer/Loot → sogar andere Kill-Zahl.
- **Isolation (Beweis für Ursache):**
  - Nur Sammeln (kein Plot): großer vs. kleiner Chunk **bit-identisch** ✅ (DET-1, DET-3)
  - Nur Farming (keine Aktion/kein Kampf): großer vs. kleiner Chunk **bit-identisch** ✅
  - Sammeln/Kampf **+ Farming gleichzeitig**: **divergiert** ❌
- **Impact (ehrlich):** Gering. Keine Dupe/kein Verlust, kein Crash, kein ausnutzbarer Exploit; Größenordnung ~0,05 % Items / ~0,3 % Kills. XP/Level-Summen bleiben gleich (nur Loot-Mix + Kill-Zahl driften). ABER: es verletzt die ausdrücklich zu prüfende Determinismus-Zusage, und der Normalfall im Idle-Game IST „Plot wächst passiv, während ich kämpfe/sammle".
- **Fix-Optionen (Logic-Dev-Entscheidung):** (a) Farming-Ernte aus eigenem Sub-RNG (z.B. seeded auf `elapsedMs`) statt aus `state.rng` ziehen → draw-order-unabhängig; oder (b) bewusst als akzeptierte Abweichung dokumentieren und die „bit-identisch"-Zusage in `farming.ts`/`tick.ts` präzisieren. Empfehlung: (a).
- **Owner:** **Logic-Dev** (`packages/engine/src/tick.ts:313-318`, `packages/engine/src/farming.ts:90-107`)

### P3 — Veralteter Cap-Kommentar in der Persistenz (24 h statt 8 h)
- **Kategorie:** Doku / Wartbarkeit
- **Evidence:** `packages/persistence/src/index.ts:924` — JSDoc sagt „Gedeckelt auf 24 h." Der Code cappt aber korrekt auf `MAX_OFFLINE_MS` (8 h, `index.ts:956`). Nur der Kommentar ist falsch, das Verhalten stimmt.
- **Owner:** **Logic-Dev**

### P3 — Veralteter Cap-Kommentar im Live-Loop (12 h statt 8 h)
- **Kategorie:** Doku / Wartbarkeit
- **Evidence:** `apps/client/src/renderer/game/GameContext.tsx:190` — Kommentar „umginge den 12h-Offline-Cap". Der Code deckelt `dt` korrekt auf `MAX_OFFLINE_MS` (8 h, `GameContext.tsx:192`). Nur der Kommentar ist stale.
- **Owner:** **UI-Dev**

---

## Bestätigt korrekt (grün)

| Prüfung | Ergebnis |
|---|---|
| `MAX_OFFLINE_MS` = 8 h (`8*60*60*1000`) | ✅ `shared/src/index.ts:26` |
| Offline-Cap greift bei 30-Tage-Lücke → `offlineMs == MAX_OFFLINE_MS` | ✅ |
| Grenzfall exakt 8 h → `offlineMs == MAX_OFFLINE_MS`, 288000 Ticks | ✅ |
| Grenzfall 0 ms (`savedAt == now`) → 0 Ticks, keine Änderung, leere Summary | ✅ |
| Grenzfall negativer Sprung (Uhr rückwärts) → auf 0 geklemmt | ✅ |
| `activePlayMs` steigt im Offline-Catch-up NICHT (`step`-Flag), `elapsedMs` schon | ✅ `tick.ts:216-220` |
| `activePlayMs` steigt im Live-Loop gleich mit `elapsedMs` | ✅ |
| Summary trägt `activePlayMs` (< `elapsedMs`, < 8 h nach Offline-Lücke) | ✅ `persistence:851-863` |
| Menü nutzt `activePlayMs ?? elapsedMs`, StatsPage `state.activePlayMs` | ✅ `MainMenu.tsx:92`, `StatsPage.tsx:33` |
| Auto-Eat überlebt 8 h AFK-Kampf bei genug Nahrung (isst, killt, HP > 0) | ✅ `combat.ts:76-101` |
| Auto-Eat läuft aus → Spieler stirbt sauber, kein Crash/NaN | ✅ |
| Farm-Plots reifen + auto-ernten offline; Ertrag landet in Bank/Inventar | ✅ `farming.ts:114-164` |
| Farming-only: offline == online (bit-identisch) | ✅ |
| Offline-Summary: Items (inkl. Bank via Auto-Bank), Gold, `skillXp` je Skill | ✅ `persistence:901-995` |
| Offline-Popup: gültige `content.skills`-IDs → Icon via `getSkillIcon ?? getSidebarIcon` | ✅ `OfflinePopup.tsx:31` |
| Icon-Asset-Abdeckung: JEDER Offline-XP-Skill hat ein Icon (Kampf `power/attack/...`, Sammeln via Sidebar) | ✅ |
| Popup guardet fehlendes Icon (`{icon && <img>}`) → kein Broken-Image | ✅ |
| Live-Loop cappt `dt` ebenfalls auf `MAX_OFFLINE_MS` (nach OS-Sleep) | ✅ `GameContext.tsx:192` |

## Test-Evidenz
- Engine-Sweep: 12 Tests, 11 grün, 1 rot (DET-2 = das P2-Finding).
- Persistenz-Sweep: 9 Tests, alle grün (Cap, Grenzfälle, `activePlayMs`, Summary, Offline-Farming, Woodcutting-only offline==online).
- Determinismus-Charakterisierung: 3 Tests grün (Farming-only deterministisch; Kampf+Farming divergiert; Gather+Farming: XP-Summe gleich, nur Loot-Mix driftet).
- Temp-Testskripte nach dem Lauf wieder entfernt (kein Repo-Rückstand).

---

## Nachtrag 2026-07-01 (Logic-Dev) — P2 Determinismus-Gap: für EA AKZEPTIERT

Entscheidung nach dem Robustheits-Sweep-Fix-Pass: Die oben beschriebene Offline-vs-Online-Divergenz
(Farming-Harvest zieht seine Ernte-RNG aus demselben `state.rng`-Stream wie Kampf/Aktion → große
Offline-Batches interleaven die Würfe anders als viele kleine Live-Ticks) wird für Early Access
**bewusst akzeptiert** und in diesem Pass **NICHT** behoben.

- **Begründung:** Fix-Option (a) (eigener, auf `elapsedMs` gesäter Farming-Sub-RNG) verändert die
  Draw-Order und damit die Drop-/Kampf-RNG **aller** bestehenden Seeds — riskant und über den Umfang
  eines defensiven Fix-Passes hinaus. Impact ist niedrig (~0,05 % Items / ~0,3 % Kills, kein
  Dupe/Verlust/Crash, kein Exploit; XP/Level-Summen bleiben identisch).
- **Status:** Bekannter, akzeptierter Punkt. Keine RNG-Logik in `farming.ts`/`tick.ts` geändert.
- **Wenn später doch:** Fix-Option (a) als eigener, isolierter Task mit Seed-Migration/Neucharakterisierung
  einplanen — nicht als Nebeneffekt eines anderen Changes.
