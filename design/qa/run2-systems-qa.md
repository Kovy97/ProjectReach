# Run 2 — Systems QA / Bug-Hunt (Kontrolleur)

Datum: 2026-06-27 · Scope: Gesamtstand Hearthforge Idle (Thieving-Risiko, Farming-Plots, Crafting/Jewelcrafting/Mining-Neuzugänge, Zoom-Baseline, Save-Migration v35). Read-only.

## Verifikation (headless)

| Gate | Ergebnis |
|------|----------|
| `pnpm typecheck` | ✅ 5/5 Pakete grün |
| Engine-Tests (`--filter`, kein Cache-Replay) | ✅ 63 Dateien / 353 Tests grün (886 s, inkl. Sim) |
| Persistence-Tests | ✅ 33 Tests grün (inkl. v34→v35 thievingRisk) |
| `pnpm --filter @hearthforge/client build` | ✅ built in ~5 s |
| Sim Balance-Report | ✅ **AUFFÄLLIGKEITEN — Bronze-Baseline (0)**, ECHTE WALLS (0); jedes Monster `kills>0`, keine Skilling-Aktion bei 0 XP/h. 2 Monster über Baseline (`scale_skarn` Lv104, `last_idol` Lv120) — als „erwartbar unbesiegbar" markiert, kein Defekt. |

Cache-Falle umgangen: Engine-Sim direkt über `pnpm --filter @hearthforge/engine test` gelaufen (kein altes FULL-TURBO-Replay durchgewunken).

## Schwerpunkt-Befunde

### 1. „Defined but never applied"-Felder — KEINE gefunden
- **thievingRisk / THIEVING_RISK_MODS:** vollständig verdrahtet. `tick.ts:67–124` wendet alle drei Mods an: `successBonus` → `actionSuccessChance` (Z.75), `stunMult` → Stun bei Fehlschlag (Z.78), `rewardMult` → Skill-XP (Z.90), Gold (Z.111) und Beute-Menge (Z.124, nie unter 1). Nicht-Thieving: rewardMult exakt 1 → RNG bit-identisch (Determinismus-Fixtures grün). UI spiegelt korrekt: `SkillPage.tsx:244–246` zeigt Success/Gold/XP mit denselben Mods. Mastery-XP bleibt bewusst roh (`tick.ts:107`), wie spezifiziert.
- **FarmPlots:** `farming.ts` liest alle Felder (`cropId`, `plantedAtMs`, `autoReplant`, `readyYield`, `readyItem`). Offline-Reife rein arithmetisch (`cycles = floor((elapsedMs-plantedAtMs)/growMs)`, `tick.ts:229` einmal pro `advance`), Auto-Replant saat-begrenzt, Rest-Fortschritt verlustfrei (`plantedAtMs += cycles*growMs`). Crop aus Content entfernt → defensiv geleert, kein Crash.
- **EquipBonus / ItemDef / MonsterDef / CropDef / ActionDef:** jedes Feld hat eine reale Engine-Lesestelle stichprobenartig bestätigt — `ammoDamage` (combat.ts:605), `manaCost` (508), `inflict` (557/810), `regen` (725), `enrage` (776), `weaponEffects[]` via `effectiveWeaponEffects` (496), `gatherXpMult/gatherYieldMult` (tick.ts), `hpRegenPerSec` (idle- + combat-Tick). Die drei historischen Lecks (Status-Effekte, monster.xp, Auto-Eat-on-DoT) sind durch `status-coverage`/`kill-xp`/`autoeat-dot` Guard-Tests abgedeckt und grün.

### 2. Erreichbarkeit / Senken — sauber
- `wiring-audit.test.ts` erzwingt: jedes Item erhältlich (Loot/Shop/Start/Munition/Crop-Yield) **und** jedes Material hat einen Sink (Aktions-Input, Munition oder `value>0`). Grün.
- Manuell gegengeprüft: die neuen Crop-Yields (`herb_*`, `pigment_*`, `reed_*`) und Materialien `gravesteel/bloodstone/voidstone/godgem` erscheinen je 5–23× im Content (echte Rezept-Inputs, keine reinen Vendor-Trash-Sackgassen). Saaten alle erhältlich (sonst hätte der Obtainable-Test angeschlagen).

### 3. Save / Migration — robust
- Migration ist **idempotent property-presence-basiert**, nicht strikt versions-gegated → keine Lücken-Gefahr in der v…→35-Kette. Alt-Saves (<35) bekommen `thievingRisk='careful'` (index.ts:552), <34 bekommen `farmPlots` auf `MAX_FARM_PLOTS` leere Beete (546–547).
- `sanitizeState` verwirft unbekannte Item-Refs aus Inventar/Bank/Equip/Food/Buffs/Plots (66–217) → entfernte alte `farm_*`-Outputs hinterlassen keine verwaisten Refs. Die alten `farm_*` waren **Aktionen** (jetzt entfernt, Farming = plot-only), keine Items.
- Load ist crash-sicher (try/catch um parse + migrate, `load` gibt `null` statt zu werfen).

### 4. Skalierung / UI-Integrität — keine Brüche
- Zoom-Baseline (`main/index.ts:39–45`): `setZoomFactor` = clamp(0.65..0.95, min(w/2400, h/1350)) → 1920×1080 ≈ 0.80. Kohärent; liegt als Electron-Zoom-Layer unter dem separaten User-CSS-Scale (`util/uiScale`) — bewusst multiplikativ, kein Konflikt.
- FarmPage: Plot-Grid max 3 Spalten, alle State-Zugriffe optional-chained (`plot?.cropId`), `plotUnlockLevel` konsistent mit `PLOT_UNLOCK` (aufsteigend, Endwert [85,9] = `MAX_FARM_PLOTS`).
- **UI-Crash-Gate (bestanden):** alle `useGameState()`-Aufrufer (14 Pages + Toasts/Sidebar/PetCelebration) sind ausschließlich unter `MainLayout` gemountet. Der einzige App-Root-Overlay `ItemTooltipOverlay` nutzt die sichere `useGameStateMaybe()`-Variante (null im Menü/Creation) → keine „leeres Hauptmenü"-Regression. `Toasts` ist korrekt in `MainLayout` (App.tsx:260), nicht am Root.

### 5. Cross-Feature-Kohärenz — greift sauber
- Thieving-Risiko ↔ Pets (additive Boni), ↔ Buffs (gatherXpMult), ↔ Mastery (roh) sauber getrennt.
- Plots ↔ Bank/Inventar (Saat aus beiden, Auto-Bank-Overflow), ↔ Offline-Advance, ↔ Quests/Achievements (Farming-XP fließt in derselben advance-Runde via syncProgression nach tickFarmPlots).
- i18n-Parität **compile-time erzwungen** (`de: Record<keyof typeof en, string>`) → typecheck-grün garantiert Parität für alle neuen Keys (`thieving.risk.*`, `farm.*`).

---

## Findings-Liste

### [P0 Bug] — keine
Keine Blocker. Tests + Sim grün, keine toten Felder, keine Sackgassen, keine UI-Crash-Pfade.

### [P1 Balance] — keine
Sim ohne Auffälligkeiten; Drei-Stile-Parität durch `style-xp-parity`/`ranged-vs-magic`/`styles` Guard-Tests abgedeckt und grün.

### [P2 UX] — keine harten

### [P3 Politur] (optional, nicht ship-blockierend)
1. **`activeActionId` wird nicht gegen entfernte Aktionen sanitisiert.** — `persistence/src/index.ts` (sanitizeState). Ein Alt-Save mit `activeActionId` auf eine inzwischen entfernte Aktion (z.B. altes `farm_*`) bleibt gesetzt. Kein Crash (Engine `tick.ts:164` no-op `if (!action) return`; UI `App.tsx:107` null-checked), aber der Header zeigt eine leere „Aktiv"-Zeile mit 0-Fortschrittsbalken, und der Spieler „tut" still nichts, bis er eine neue Aktion wählt (`lastStop` wird nicht gesetzt). *Fix:* in sanitizeState `if (state.activeActionId && !content.actions[state.activeActionId]) state.activeActionId = null;`. *Revier:* logic-dev. Sehr geringe Realwahrscheinlichkeit (betrifft nur Saves, die exakt beim Verlassen eine später entfernte Aktion liefen).
2. **Farm-Offline-Catch-up-Schleife** (`farming.ts:144`) iteriert `cycles`-mal pro Plot bei Auto-Replant — durch `growMs`, `MAX_OFFLINE_MS` und Saatbestand beidseitig beschränkt, also unkritisch; nur als bewusste Notiz, kein Eingriff nötig.

---

## Gesamt-Verdikt

**SHIP-fähig.** Keine P0/P1-Blocker. Alle vier Build-Gates grün, Sim 0 Auffälligkeiten, die kürzlich neuen Systeme (Thieving-Risiko, Farming-Plots, Crafting/Jewelcrafting/Mining-Materialien) sind vollständig Quelle↔Senke↔Engine↔UI verdrahtet, Save-Migration robust und crash-sicher, UI-Crash-Gate bestanden, i18n-Parität compile-time garantiert. Einzig zwei kosmetische P3-Notizen (entbehrlich). Auffällig saubere Iteration.
