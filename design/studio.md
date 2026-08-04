# Hearthforge Studio — Betriebsmodell

**Chef:** der User (setzt Richtung, testet das Spiel live, gibt frei).
**CEO/Orchestrator:** Claude (zerlegt Aufgaben, delegiert an Spezialisten, integriert Hot-Files, lässt freigeben).
**Team (Subagents in `.claude/agents/`):**

| Agent | Revier (editiert NUR das) | Verifikation |
|---|---|---|
| **content-dev** | `packages/content/src/index.ts` (Items/Gear/Monster/Zonen/Skills/Rezepte/Balance) | wiring/zones/integrity + Sim |
| **combat-dev** | `packages/engine/src/combat.ts` + Combat-Tests | Combat-Tests + Sim |
| **logic-dev** | engine/* (außer combat.ts) + `shared/src/index.ts` + `persistence` | typecheck + persistence + Sim |
| **ui-dev** | `apps/client/src/renderer/**` | client typecheck (i18n-Parität) + build |
| **balance-designer** | (nur `design/*.md`) entscheidet Zahlen/Kurven/3-Stile-Parität → content-dev tippt ein | Sim lesen |
| **asset-integrator** | `renderer/assets/**` — PNGs der Chef-Lieferungen einbinden (Auto-Discovery) | client build |
| **kontrolleur** | (read-only) prüft alles, jagt Bugs, **UI-Crash-Gate**, gibt Verdikt | volle Suite |

## Warum diese Schnitte? — Konfliktfreiheit
Das Repo ist **kein Git-Repo** → keine Worktrees. Zwei Agents dürfen nie dieselbe Datei parallel ändern.
Die Reviere sind **disjunkt**, damit mehrere Agents gleichzeitig laufen können:
- **Hot-Files mit Einzel-Owner:** `content/src/index.ts` → nur content-dev; `shared/src/index.ts` → nur logic-dev.
- **Kein paralleler `pnpm build`** (gemeinsames `out/`). Targeted `tsc --noEmit`/Vitest sind parallel sicher.
- Client (ui-dev) ist komplett disjunkt von den packages → immer parallelisierbar.

## CEO-Delegationsprotokoll (so zerlege ich eine Aufgabe)
1. **Zerlegen** in disjunkte Slices entlang der Reviere. Beispiel „neuer Bogen-Tier mit UI-Badge":
   - content-dev: Bogen-Items + Fletch-Rezepte (+ ggf. Pfeil-Tier).
   - ui-dev (parallel): Badge/Anzeige im Charakterblatt.
   - Braucht es ein neues Feld? → logic-dev macht zuerst Typ + SAVE_VERSION, DANN bauen die anderen darauf (sequenziell).
2. **Parallel starten**, was disjunkt ist; **sequenzieren**, was auf einem Typ/Feld aufbaut.
3. **Integration:** Cross-Revier-Bedarf (neuer Typ, Migration, neue Content-ID für die UI) meldet jeder Agent an mich zurück; ich route es an den richtigen Owner statt es im fremden Revier zu erzwingen.
4. **Kontrolleur** läuft am Ende: volle Suite + Review + Bug-Hunt → Verdikt.
5. **Freigabe:** ich melde dem Chef Ergebnis + Test-Tally; der Chef testet live und gibt frei.

## Studio-weite Regeln (gelten für alle)
- **Headless-Verifikation, NIE Electron/`pnpm dev`** (das macht der Chef beim Testen). Befehle:
  `pnpm typecheck` · `pnpm test` (Engine+Persistenz, inkl. ~2-min Balance-Sim) ·
  `pnpm --filter @hearthforge/client build` · targeted: `pnpm --filter @hearthforge/engine exec vitest run src/<x>.test.ts`.
- **Grün heißt grün:** typecheck 5/5, Tests passed, build sauber, Sim `AUFFÄLLIGKEITEN (0)`. Pro Bugfix ein Regressionstest.
- **Sinnig verdrahtet:** keine toten/verwaisten Items; jedes angezeigte/definierte Feld wird auch angewandt.
- **Bilingual:** alle Spieler-Texte `{en,de}` bzw. `t()`-Key in beiden Sprachen (tsc erzwingt en/de-Parität).
- **Save-Disziplin:** neues State-Feld / umbenannte ID → SAVE_VERSION + Migration (logic-dev).
- **Balance ist real:** XP-Formel `90·sqrt(Δxp)`; neue Aktionen müssen sinnvoll auf der Kurve liegen.

## Aktueller Projektstand (für kalt startende Agents)
Idle-RPG „Hearthforge" (Electron+React+TS, pnpm+Turborepo). Reine deterministische Engine (TICK_MS=100,
mulberry32, `computeStats`/`advance`). 8 Zonen/58 Monster, 12-Tier-Metallleiter mit vollem Gear, Skills inkl.
Fletching/Jewelcrafting/Mastery/Bank. SAVE_VERSION 17. 3 Stile (Melee=Lifesteal, Ranged=Krit/Tempo, Magie=Mana/Status).
Offene Richtung: Fernkampf-/Magie-Waffen auf gleiche Progressionstiefe wie Melee bringen. Logbuch: `design/autonomous-session-2.md`.
