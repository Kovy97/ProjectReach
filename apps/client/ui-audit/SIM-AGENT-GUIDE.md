# Sim-/Tester-Agent-Leitfaden

Kompakter Leitfaden für jeden Agenten, der ein Playwright-Skript gegen den Client fährt (Sweep-
Tester, Fable-Multimodal-Check, ein gezielter Regressions-Check nach einer Änderung). Ziel: nicht
jedes Mal dieselben, inzwischen gut dokumentierten Fallen neu treten.

**Lies das hier zuerst, dann `ui-audit/sim-harness.mjs`'s Kopfkommentar (vollständige API-Doku).**

**Steuerst du einen "Spieler-Bot" (ein Modell, das den Client wie ein Spieler bedienen soll — Zonen
wählen, kämpfen, Mengen einreihen, Screenshots/State-Checks), statt selbst ein Playwright-Skript zu
schreiben? Nimm `ui-audit/bot.mjs` + `ui-audit/BOT-GUIDE.md` (Task #351) — EIN deklaratives
Kommando (`node ui-audit/bot.mjs --fixture midgame --do "goto:combat; ..."`), das alles unten (Vite-
Server, GPU-Flags, Fixture-Laden, `__hfDebug`) kapselt, plus eine `result.json` zum Auswerten statt
Konsolen-Rauschen. Für ein NEUES, bespokes Playwright-Skript (eigene Checks, die über das feste
Bot-Vokabular hinausgehen) bleibt der Rest dieser Datei + `sim-harness.mjs` der richtige Weg.

## Quickstart

```js
import { withHarness } from "./sim-harness.mjs";

await withHarness({ port: 5299, fixture: "midgame" }, async (h) => {
  await h.shot("mein-check-01-start");

  // Live-State/Content patchen (dev-only Hook, s. "__hfDebug" unten):
  await h.patchContent((dbg) => { dbg.state.character.gold = 999999; });

  await h.page.locator('[data-guide-id="topbar.bank"]').first().click();
  await h.shot("mein-check-02-bank");

  if (h.errors.length) console.log("PAGE ERRORS:\n" + h.errors.join("\n"));
});
```

- `port`: eigener, freier 52xx-Port — s. Port-Registry unten, IMMER eintragen.
- `fixture`: `"midgame"` | `"endgame"` | ein anderer Name aus `ui-audit/fixtures/*.json` | `null`
  (→ landet auf dem Hauptmenü statt in einem geladenen Spielstand).
- `withHarness` räumt IMMER auf (`finally { await h.stop() }`) — auch wenn dein Check-Code wirft.
  Für mehr Kontrolle (z. B. mehrere Seiten parallel/sequenziell in einem Skript) geht auch
  `const h = await startHarness(opts); try { ... } finally { await h.stop(); }` direkt.
- Voller API-Überblick + alle Optionen: Kopfkommentar in `sim-harness.mjs`.
- Lauffähiges Referenzbeispiel: `sim-harness-selftest.mjs` (Menü-Shot + Fixture-Load +
  `patchContent` mit Retry/Verify + `setState`) — bleibt bewusst liegen, nicht löschen.

## Die 7 Lektionen — Do/Don't

1. **vite-HMR-Falle.** Parallele Code-Änderungen anderer Agenten in `src/renderer` lösen einen
   Full-Reload aus, der eine laufende `?fixture=`-Session mittendrin resettet (real beobachtet: ein
   14-Minuten-Bosskampf-Test verlor seinen kompletten präparierten Endgame-State).
   - **Do:** `sim-harness.mjs` nutzen — HMR ist dort standardmäßig AUS (`hmr: false`).
   - **Don't:** eine eigene Vite-Config ohne `server.hmr: false` bauen, wenn dein Test länger als
     ein paar Sekunden läuft oder parallel zu anderen Agenten laufen könnte.

2. **Cold-Start-Race.** `window.__hfDebug` EXISTIERT schnell, aber der Inhalt, den React 18
   `StrictMode`s doppelter Dev-Mount-Zyklus produziert, kann auf einem kalten Vite-Devserver
   beobachtet bis zu ~16s brauchen, bis er final steht. Ein Patch, der VOR diesem Settle läuft,
   kann Sekunden später von der noch laufenden Fixture-Load-Kette überschrieben werden — flaky
   (mal 0, mal 21 Einträge), nicht deterministisch reproduzierbar auf den ersten Blick.
   - **Do:** `sim-harness.mjs`s eingebaute Reihenfolge nutzen (existiert bereits automatisch beim
     `startHarness()`-Aufruf): `__hfDebug`-existiert-Check (schnell) → `networkidle` (bis 20s) →
     `settleMs`-Puffer (Default 2000ms) — DANACH erst patchen. Für Content-Mutationen, die selbst
     noch mit der Ladekette race'n können (z. B. `content.quests` leeren, während ein Fixture-Load
     gerade läuft), zusätzlich `patchContent(fn, { verify })` nutzen (retry-bis-stabil, s. API-Doku).
   - **Don't:** direkt nach `page.goto()` patchen, oder einen einzelnen festen `waitForTimeout`
     als einzige Absicherung verwenden.

3. **Port-Kollisionen.** Zwei Agenten auf demselben Port → einer der beiden vite-Server startet
   gar nicht (der Harness meldet das per Fehler, kein stiller Hang) oder — schlimmer — ein Agent
   verbindet sich versehentlich mit dem Server eines anderen Agenten.
   - **Do:** einen freien Port aus der Registry unten nehmen, SOFORT dort eintragen (Name des
     Skripts + Port), bevor du das Skript laufen lässt.
   - **Don't:** einen Port wiederverwenden, der unten schon für ein noch existierendes/aktives
     Skript steht, ohne zu prüfen, ob der Prozess wirklich beendet ist.

4. **Fixture-Injection — zwei Wege, nicht neu erfinden.**
   - `?fixture=<name>`-Route (`startHarness({ fixture: "midgame" })`): springt SOFORT in einen
     fertigen `GameState` (Sidebar/Topbar sichtbar, kein Menü-Klicken nötig). Für "ich will einen
     bestimmten Spielstand sehen/patchen".
   - `localStorage`-Slot-Injection (`startHarness({ slotSaves: { 0: "midgame", 1: "endgame" } })`):
     landet auf dem Hauptmenü, aber die Load/New-Panels zeigen belegte Karten. Für "ich teste das
     Menü/Load-Screen selbst".
   - Beide sind in `sim-harness.mjs` fertig verdrahtet — kein bespoke `page.route(...)`-Patch oder
     `addInitScript`-Boilerplate mehr pro Skript nötig.

5. **`__hfDebug` existiert inzwischen auch im normalen Spielpfad.** Seit Fix-Welle M wird der Hook
   in ALLEN DREI State-Entstehungspfaden gesetzt — Fixture-Load, `createCharacter` (neuer
   Charakter), UND `loadGame` (normal geladener Spielstand) —, nicht mehr nur im Fixture-Pfad.
   - **Do:** wenn dein Skript den "echten" Neu-erstellen- oder Laden-Flow durchklickt (statt
     `?fixture=`), trotzdem `h.waitForDebugHook()` nutzen, sobald der Spielstand aktiv ist — der
     Hook ist da, du musst nur auf ihn warten.
   - **Don't:** annehmen, `__hfDebug` sei nur über `?fixture=` erreichbar (das war der Stand vor
     Tester-Sweep 2 / T1, ist überholt).

6. **`MODULE_NOT_FOUND` / hartkodierte Pfade.** Skripte, die mit `process.cwd()` oder einem
   hartkodierten absoluten Pfad arbeiten, brechen, sobald der Agent aus einem anderen Verzeichnis
   heraus startet oder in einer anderen Session mit anderem Scratchpad-Pfad läuft.
   - **Do:** `sim-harness.mjs` nutzen — alle Pfade sind von `import.meta.url` abgeleitet, nicht von
     `process.cwd()`; funktioniert unabhängig vom Aufrufer-cwd. Für den Screenshot-Ordner
     `SIM_OUT_DIR` env var setzen (Fallback: `ui-audit/shots/`), statt einen Pfad im Skript zu
     hartkodieren.
   - **Don't:** `node ui-audit/mein-check.mjs` aus einem anderen Verzeichnis als `apps/client/`
     erwarten zu funktionieren, wenn dein Skript irgendwo `process.cwd()` referenziert.

7. **Server-Cleanup.** Ein vite-Kindprozess, der nicht gekillt wird, wenn das Skript abbricht
   (Exception, `process.exit()`, Ctrl-C), bleibt als Zombie auf seinem Port hängen — blockiert
   diesen Port für den nächsten Lauf.
   - **Do:** `withHarness(opts, fn)` nutzen (garantiertes `finally { await h.stop() }`), oder bei
     manuellem `startHarness()` selbst ein `try { ... } finally { await h.stop(); }` drumherum
     bauen.
   - **Don't:** `child.kill()` nur im Erfolgspfad aufrufen.

## Port-Registry (52xx)

Konvention: **nimm den nächsten freien Port unterhalb, trage deinen Skriptnamen + Port hier ein,
BEVOR du das Skript laufen lässt.** Die Tabelle unten ist der Stand aus der Skript-Historie
(`grep -roh 'PORT = [0-9]*' ui-audit/*.mjs`) plus dem neuen Harness-Selftest — nicht vollständig
zukunftssicher, aber der verlässlichste Blick auf "was wurde hier je benutzt".

**Höchster bekannter Port: 5260 (letztes Alt-Skript). 5280 ist fest für
`sim-harness-selftest.mjs` reserviert — NICHT wiederverwenden.** Nächster freier Bereich für neue
Skripte: **5261–5279** oder **5281+**.

| Port | Skript(e) |
|---|---|
| 5183 | tour.mjs |
| 5185 | portrait-shot.mjs |
| 5186 | lang-click-test.mjs |
| 5187 | shop-shot-269.mjs |
| 5189 | enchant-shot-275.mjs |
| 5190 | quests-shot-274.mjs |
| 5191 | combat-cards-shot-273.mjs |
| 5192 | pet-celeb-shot-276.mjs |
| 5193 | badge-check.mjs |
| 5194 | pet-redesign-shot-276.mjs |
| 5196 | creation-shot-282.mjs, crop-zoom-282.mjs, font-check-282.mjs, lang-check-282.mjs, menu-shot.mjs |
| 5197 | scale-shot-283.mjs |
| 5198 | tokenshop-shot-284-low.mjs, tokenshop-shot-284.mjs |
| 5199 | onboarding-tour-285.mjs |
| 5201 | resize-shot-291.mjs |
| 5203 | combat-fx-hitclean-296.mjs, combat-fx-level-check-296.mjs, combat-fx-shot-296.mjs, combat-fx-status-296.mjs |
| 5204 | ammo-fletch-removal-shot-286.mjs |
| 5205 | scale-audit-298.mjs |
| 5206 | loadout-shot-298.mjs |
| 5207 | creation-shot-298.mjs, tooltip-shot-304.mjs |
| 5208 | combat-prognosis-shot-305.mjs, session-tally-shot.mjs, verify-skillsoverview-298.mjs |
| 5209 | equip-debug-298.mjs, offline-stage-shot.mjs |
| 5210 | tooltip-shot-307.mjs |
| 5211 | skill-eta-rates-shot.mjs |
| 5212 | invfilter-shot-309.mjs |
| 5213 | hotkeys-shot.mjs |
| 5214 | tooltip-shot-308.mjs |
| 5215 | wiki-audit-shot-309.mjs |
| 5216 | reward-juice-shot.mjs |
| 5217 | pin-tracker-shot.mjs |
| 5218 | bestiary-slayer-verify.mjs |
| 5219 | zone-particles-reduced-check.mjs, zone-particles-shot.mjs, zone-particles-visibility-check.mjs |
| 5220 | item-cell-rarity-shot.mjs |
| 5221 | smoothness-bundle-shot.mjs |
| 5222 | citadel-consistency-shots.mjs |
| 5223 | backdrop-drift-check.mjs |
| 5224 | charpage-overflow-check.mjs |
| 5225 | perf-smithing-audit.mjs |
| 5226 | zoneprogress-save-shot.mjs |
| 5227 | shop-btn-debug.mjs |
| 5228 | mastery-ceremony-shot.mjs |
| 5229 | dungeon-dramaturgy-shot.mjs |
| 5230 | paragon-tower-shot.mjs |
| 5231 | mastery-esc-check.mjs, tooltip-shot-masterperk.mjs |
| 5233 | loadout-scroll-check.mjs |
| 5234 | menu-slots-shot.mjs |
| 5235 | showcase-verify.mjs |
| 5236 | portrait-upload-check.mjs |
| 5237 | arena-rework-check.mjs |
| 5238 | arena-details-toggle-check.mjs |
| 5239 | effectchip-zoom.mjs |
| 5241 | trailer-scroll-check.mjs |
| 5242 | juice-check.mjs |
| 5243 | cosmetics-buffbar-check.mjs, cosmetics-toast-baseline-check.mjs, cosmetics-tooltip-check.mjs |
| 5244 | enemy-size-shot.mjs |
| 5245 | npc-greeting-check.mjs |
| 5246 | npc-greeting-zoom.mjs, onboarding-brenna-tours-check.mjs |
| 5247 | chronicle-compass-check.mjs |
| 5248 | story-tab-check.mjs |
| 5249 | dungeon-gate-check.mjs |
| 5250 | sweep1-followup.mjs, sweep1-run.mjs, sweep2-t1-newbie.mjs, sweep2-t1-newbie2.mjs, sweep2-t1-skiptours.mjs |
| 5251 | sweep2-death-check.mjs, sweep2-details-zoom-check.mjs, sweep2-flow-check.mjs, sweep2-hardcase-check.mjs, sweep2-t2-chronicle.mjs, sweep2-viewport-check.mjs |
| 5252 | sweep2-t3-finale.mjs, sweep2-t3-finale2.mjs, sweep3-bank-check.mjs, sweep3-recipes-wiki-check.mjs, sweep3-shop-check.mjs |
| 5253 | sweep2-t4-run.mjs, sweep4-dungeons.mjs, sweep4-mastery.mjs, sweep4-paragon.mjs, sweep4-towers.mjs |
| 5254 | sweep2-t5-followup.mjs, sweep2-t5-gates.mjs, sweep5-full.mjs |
| 5255 | sweep2-t6-bank.mjs, sweep2-t6-pouch-equip-withdraw.mjs, sweep2-t6-shop.mjs, sweep2-t6-variants.mjs, sweep6-lang-sweep.mjs |
| 5256 | sweep2-t7-arena.mjs, sweep2-t7-sound.mjs, sweep2-t7-systems.mjs, sweep7-item-systems.mjs |
| 5257 | debug-menuslot.mjs, sweep2-t8-content.mjs, sweep2-t8-lang-format.mjs, sweep2-t8-realchronicle.mjs, sweep2-t8-tours.mjs, sweep8-menu.mjs, sweep8-prefs-stats.mjs, sweep8-saveflow.mjs |
| 5258 | sweep2-t9-hotkeys-escape-window.mjs, sweep2-t9-menu-saves.mjs, sweep2-t9-options.mjs, sweep9-a-esc-rapidfire.mjs, sweep9-b-dragdrop.mjs, sweep9-c-boundaries.mjs, sweep9-d-windowsizes.mjs |
| 5260 | fix-wave-m-check.mjs |
| **5280** | **sim-harness-selftest.mjs (reserviert, lebendes Beispiel — nicht wiederverwenden)** |
| 5282 | review-h-idle.mjs (Kernloop-Review „Henrik", 2026-07-16) |
| 5283 | review-corvin-*.mjs (Gesamtbogen-Review „Corvin", 2026-07-16) |
| 5284 | review-jorin-*.mjs (Neuling-2.0-Review „Jorin", 2026-07-16) |
| 5285 | review-recheck-tal.mjs (Tal-Re-Check Phase 2, 2026-07-16) |
| 5287 | review-wavey-quests.mjs, review-wavey-import.mjs, review-wavey-ch1619.mjs (Welle Y Fix-Verifikation, 2026-07-16) |
| 5288 | review-aa-welcomeback.mjs (Welcome-Back-Polish, Welle AA, 2026-07-16) |
| 5290 | fun-f1-*.mjs (Fun-Sweep F1 „Mona" Mastery-System, 2026-07-16) |
| 5291 | fun-f2-*.mjs (Fun-Sweep F2 „Fenn" Pets/Companions, 2026-07-16) |
| 5292 | fun-f3-*.mjs (Fun-Sweep F3 „Riko" Enchanting/Runen+Suffix, 2026-07-16) |
| 5293 | fun-f4-*.mjs (Fun-Sweep F4 „Vesna" Slayer-System, 2026-07-16) |
| 5294 | fun-f5-*.mjs (Fun-Sweep F5 „Aldric" Paragonturm, 2026-07-16) |
| 5295 | fun-f6-*.mjs (Fun-Sweep F6 „Grete" Dungeon-Wiederhol-Loop, 2026-07-16) |
| 5296 | fun-f7-*.mjs (Fun-Sweep F7 „Pip" Achievements/Bestiarium/Sammel-Meta, 2026-07-16) |
| 5297 | review-cc-fixes.mjs (Welle CC P1-Bug-Paket-Verifikation, 2026-07-16) |
| 5298 | ee-momentpack-a-check.mjs (Welle EE Moment-Paket A Verifikation, 2026-07-16) |
| 5299 | review-ff-momentpack-b.mjs (Welle FF Moment-Paket B Verifikation, 2026-07-16) |
| 5300 | review-ii-fun-sweep.mjs (Fun-Sweep Programm Welle II Verifikation, 2026-07-16) |
| 5301 | rt-mona-*.mjs (Fun-RETEST R1 „Mona" Mastery, 2026-07-16) |
| 5302 | rt-fenn-*.mjs (Fun-RETEST R2 „Fenn" Pets, 2026-07-16) |
| 5303 | rt-riko-*.mjs (Fun-RETEST R3 „Riko" Enchanting, 2026-07-16) |
| 5304 | rt-vesna-*.mjs (Fun-RETEST R4 „Vesna" Slayer, 2026-07-16) |
| 5305 | rt-aldric-*.mjs (Fun-RETEST R5 „Aldric" Paragonturm, 2026-07-16) |
| 5306 | rt-grete-*.mjs (Fun-RETEST R6 „Grete" Dungeons, 2026-07-16) |
| 5307 | rt-pip-*.mjs (Fun-RETEST R7 „Pip" Achievements/Sammel-Meta, 2026-07-16) |
| 5308 | kk-*.mjs (Welle KK Retest-UI-Fixes Verifikation, 2026-07-16) |
| 5309 | rt3-mona-*.mjs (Fun-Sweep RUNDE 3 „Mona" Mastery, 2026-07-16) |
| 5310 | rt3-fenn-*.mjs (Fun-Sweep RUNDE 3 „Fenn" Pets, 2026-07-16) |
| 5311 | rt3-riko-*.mjs (Fun-Sweep RUNDE 3 „Riko" Enchanting, 2026-07-16) |
| 5312 | rt3-vesna-*.mjs (Fun-Sweep RUNDE 3 „Vesna" Slayer, 2026-07-16) |
| 5313 | rt3-aldric-*.mjs (Fun-Sweep RUNDE 3 „Aldric" Paragonturm, 2026-07-16) |
| 5314 | rt3-grete-*.mjs (Fun-Sweep RUNDE 3 „Grete" Dungeons, 2026-07-16) |
| 5315 | rt3-pip-*.mjs (Fun-Sweep RUNDE 3 „Pip" Achievements/Sammel-Meta, 2026-07-16) |
| 5308 | kk-*.mjs (Welle KK UI-Fixes aus Fun-RETEST, 2026-07-16) |
| 5316 | mm-*.mjs (Welle MM Abschluss-Fix-Runde aus Fun-Sweep Runde 3, 2026-07-16) |
| 5318 | pp-*.mjs (Welle PP Antizipation+Funkel-Verifikation: Mastery-/Achievement-Schimmer, Truhen-Enthüllung, Inventar-„NEU"-Funkel, Bestiarium-Erstfund-Flip, 2026-07-16) |
| 5320 | ceo-invscroll-check*.mjs (CEO-Direktfix: Inventar-Intern-Scroll + Token-Icon-Größe, 2026-07-17, Skripte gelöscht) |
| 5317 | oo-*.mjs (Welle OO „UI-Juice Stufe 1: Der Kern-Loop klickt"-Verifikation: Skill-Karten-Tick-Puls/Funken/Icon-Pop, XP-Floater, Mastery-Level-Up-Überschwapp, Shop-/Offline-Odometer, 2026-07-16) |
| 5319 | qq-verify.mjs (Welle QQ Asset-Verdrahtung: NPC-Porträts/Picker-Filter/Icon-Ersatz/Drazhan-Boss-Intro-Verifikation, 2026-07-17, Skript gelöscht — alle Checks grün) |
| 5321 | ss-*.mjs (Welle SS UI-Nachwelle: Meisterring-Shop/Zeremonie/Stapelmengen/Reroll-Entfernung Verifikation, 2026-07-18) |
| 5322 | bugreport-check.mjs (Report-Bug-Feature Verifikation, 2026-07-18) |
| 5323 | pouch-redesign-vv-check.mjs (Welle VV Varianten-Pouch-Redesign Verifikation, 2026-07-19) |
| 5324 | dcc-scroll-check.mjs (C8 Zeremonie-Layout-Fix Verifikation, 2026-07-20) |
| 5325 | smokeA-*.mjs (Release-Smoke-Sweep A, Launch-Vortag, 2026-07-20, Wegwerf) |
| 5326 | smokeB-compat.mjs (Release-Smoke-Sweep B: Save-Kompat Live-Lade-Flow, 2026-07-20, Wegwerf — nach Lauf gelöscht) |
| 5327 | smokeC-sweep.mjs (Release-Smoke-Sweep C: 7-Sprachen Key/Layout-Scan, 2026-07-20, Wegwerf — nach Lauf gelöscht) |
| 5328 | smokeD-*.mjs (Release-Smoke-Sweep D: Meisterring-Shop/Varianten-Modal/Bug-Report/9999-Stack/Zeremonie, 2026-07-20 — alle 5 grün, Skripte gelöscht) |
| 5330 | qa-nav-latency-check.mjs (QA-Analyse Seitenwechsel-Latenz/DOM-Größen, 2026-07-22, Wegwerf — nach Lauf gelöscht) |
| 5331 | champion-defeat-325-shot.mjs (Task #325 Vhazrak-Art-Fix + Champion-Sieg-Zeremonie Verifikation, 2026-07-24) |
| 5332-5338 | Task #335 Name-Clipping/Drops-Overlap-Diagnose + Verifikations-Shots (Grid/Elite/schmal), 2026-07-25, Wegwerf — alle Skripte nach Lauf gelöscht |
| **5340-5359** | **`bot.mjs` (Task #351, Spieler-Bot-Toolkit) — PERMANENT reserviert, kein Sweep-Skript.** Default 5340 für einen einzelnen/sequenziellen Bot; bei mehreren PARALLELEN Bot-Sessions je Session einen weiteren freien Port aus diesem Bereich. S. `BOT-GUIDE.md`. |
| 5482 | review-1.2.0-fixes-shot.mjs (Review-Fix-Verifikation: Gebiet-Modal Hochland-Bosse + Update-Hinweis 1.2.0, 2026-08-29, Wegwerf) |
| _dein Skript_ | _→ hier eintragen_ |

## Regeln

- **Kein Electron, keine App-Instanzen.** Immer headless Chromium gegen den plain-React-Vite-Devserver
  (`sim-harness.mjs` macht das automatisch) — nie `pnpm dev`/`electron-vite dev` interaktiv starten.
  Grund: Electron lässt sich hier nicht sauber per `APPDATA` isolieren (s. Projekt-Memory).
- **Keine Langläufer ohne explizites GO.** Kein Übernacht-Loop, kein Dauerprozess — ein Sim-Check
  ist ein einmaliger, endlicher Lauf (`startHarness` → Checks → `stop()`), keine Daemon.
- **Read-only bei reinen Tester-/Reviewer-Rollen.** Ein Tester-Agent patcht `window.__hfDebug`
  (In-Memory, dev-only, verschwindet mit dem Browser-Tab) — er ändert NIE Dateien in `src/`,
  `packages/**` oder Content. Ein UI-Fix ist ein separater Auftrag an ui-dev.
- **Wegwerf-Skripte: `sweep*-`/`review*-`-Namensschema, nach dem Lauf löschen.** Ein einmaliger
  Check für eine einzelne Frage ("ist Bug X noch da?") ist Rauschen, sobald er beantwortet ist —
  lösch die Datei, nachdem du das Ergebnis berichtet hast. Skripte, die als Referenz/Beispiel
  bleiben sollen (wie `sim-harness-selftest.mjs`, `story-tab-check.mjs` als dokumentiertes Muster),
  sind die Ausnahme, nicht die Regel — und tragen einen sprechenden Namen ohne `sweep*`/`review*`-
  Präfix.
- **KEIN `pnpm build`.** Ein Sim-/Tester-Agent verifiziert am laufenden Dev-Server, nicht am
  Produktions-Build — `pnpm build` ist Sache des Agenten, der den Produktcode geändert hat (z. B.
  ui-dev), nicht des Testers, der ihn nur beobachtet.
- **Screenshots/Output ins Scratchpad oder `ui-audit/shots/`, nicht in den Produktcode.** `sim-
  harness.mjs`s `SIM_OUT_DIR`-Override nutzen, wenn dein Screenshot-Output an einem bestimmten Ort
  landen soll (z. B. der Session-Scratchpad-Pfad).

## `__hfDebug` — was geht, was nicht (dev-only Hook)

`window.__hfDebug = { state, content }`, gesetzt in `GameContext.tsx` in ALLEN DREI
State-Pfaden (Fixture-Load / `createCharacter` / `loadGame`), gestrippt aus Prod-Builds
(`import.meta.env.DEV`-Gate — existiert im gepackten Electron-Build nicht).

- **`state`** — die LIVE `GameState`-Referenz (derselbe Objekt-Zeiger, den der Game-Loop jeden Tick
  mutiert). Direktes Feld-Mutieren (`state.character.gold = 999999`, `state.monsterKills["chicken"]
  = 3`, `state.quests.completed.push(...)`, …) wird automatisch sichtbar, sobald der nächste
  Render-Tick durchläuft (Game-Loop tickt mehrmals pro Sekunde) — kein manuelles "State neu setzen"
  nötig, es ist eine Mutation auf dem echten Objekt, kein Ersatz. `sim-harness.mjs`s `setState(fn)`
  ist die Kurzform dafür.
- **`content`** — der LIVE `@hearthforge/content`-Katalog-Zeiger (dasselbe Objekt, das die ganze
  App importiert). Mutationen hier (Quest/Zonen/Dungeon-Objekte pushen/patchen/entfernen) sind
  REINER In-Memory-Patch auf DIESER Playwright-Seite — kein `packages/content`-Edit, verschwindet
  mit dem Browser-Tab. Das ist das Standard-Muster, um isolierten Test-Content zu injizieren, ohne
  echten Content anzufassen oder von parallelen Content-Änderungen abhängig zu sein (s.
  `story-tab-check.mjs`, `dungeon-gate-check.mjs`).
- **Race-Vorsicht:** direkt nach Seiten-Load kann die App selbst noch an `content`/`state` schreiben
  (StrictMode-Doppel-Mount der Fixture-Lade-Kette) — s. Lektion 2. `sim-harness.mjs`s eingebautes
  Settle deckt den Normalfall ab; für Content-Arrays, die die Ladekette selbst noch anfasst,
  `patchContent(fn, { verify })` (retry-bis-stabil) nutzen.
- **Nicht verfügbar:** auf dem nackten Hauptmenü (vor `createCharacter`/`loadGame`/Fixture-Load gibt
  es noch keinen `state`) — `h.waitForDebugHook()` wartet genau darauf.

## vitest-Wegwerf-Muster für Engine-Direktprüfungen

Für eine Frage, die NICHTS mit der UI zu tun hat (z. B. "gibt `computeStats()` für dieses Gear-Set
den erwarteten Wert zurück?", "greift diese `packages/engine`-Formel richtig?") ist Playwright der
falsche Hebel — direkt gegen `@hearthforge/engine`/`@hearthforge/content` prüfen, ohne Browser.

**Falle: `tsx` existiert NICHT in jedem Package.** `packages/engine` (und die anderen
`packages/**`) exportieren rohes TypeScript — ein einfaches `node script.mjs`, das von dort
importiert, scheitert an den erweiterungslosen relativen Imports. `tsx` ist NUR in
`apps/client`s `node_modules/.bin` vorhanden (dort, weil `gen-fixtures.mjs` es braucht) — in
`packages/engine/node_modules/.bin` (und den anderen Packages) gibt es kein `tsx`. Ein
`tsx`-Aufruf aus einem `packages/**`-Kontext heraus schlägt mit "command not found" fehl.

**Do:** die **garantiert vorhandene** vitest-Infrastruktur nutzen — jedes Package hat bereits
`"test": "vitest run"` verdrahtet (`package.json`). Wirf eine Wegwerf-Testdatei ins Package,
schreib deine Prüfung als `it(...)`-Block, lauf sie gezielt, lösch sie danach wieder:

```bash
# Aus dem Repo-Root oder egal wo — pnpm --filter löst den Workspace-Pfad zuverlässig auf:
pnpm --filter @hearthforge/engine exec vitest run src/__scratch__.test.ts
```

```ts
// packages/engine/src/__scratch__.test.ts  (Wegwerf — nach dem Check wieder löschen)
import { describe, it, expect } from "vitest";
import { computeStats } from "./character"; // oder was auch immer du direkt prüfen willst
import { content } from "@hearthforge/content";

describe("scratch check", () => {
  it("computeStats gibt plausible Werte für X zurück", () => {
    // ... dein eigentlicher Check hier, mit echten expect()s ...
  });
});
```

Achtung `pnpm test`-Cache-Falle (s. Projekt-Memory "Turbo-Test-Cache-Falle"): `pnpm test` kann ein
altes, gecachtes rotes/grünes Ergebnis replayen, statt frisch zu laufen — für einen Wegwerf-Check
IMMER direkt mit `--filter <pkg> exec vitest run <datei>` laufen lassen, nicht über den
Root-`pnpm test`-Turbo-Task.
