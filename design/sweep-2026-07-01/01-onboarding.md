# Sweep 2026-07-01 — Onboarding / Erste Spielstunde (Kontrolleur)

**Fokus:** Anfänger-Erfahrung — Charaktererstellung, erste Aktionen, UI-Verständlichkeit,
Equip/Kampf/Craft-Auffindbarkeit, Tooltips, fehlende Erklärungen. Rein statische Code-Analyse
der Renderer-Seiten (`apps/client/src/renderer/**`) + Verifikation der gerade gefixten Punkte.
**Headless only** — kein Electron gestartet.

## Verifikations-Gates
- **typecheck:** ✅ grün (exit 0)
- **client build:** ✅ grün (`built in 7.71s`, exit 0)
- **tests:** ❌ **ROT — 1 Test-File failed / 84 passed (85); 1 Test failed / 514 passed (515)**,
  frischer Lauf (`0 cached`, kein Turbo-Cache-Replay). Fehler: siehe **G0** unten.
- **UI-Crash-Gate (useGameState-Mountpunkte):** ✅ sauber. Alle 22 strikten `useGameState()`-Aufrufer
  hängen unter `MainLayout` (Sidebar, GameStats, alle Pages via `PageContent`, plus `Toasts`,
  `PetCelebration`, `Onboarding`, `OfflinePopup` in `App.tsx:305-308`). Der einzige an der App-Wurzel
  gemountete Overlay `ItemTooltipOverlay` (`App.tsx:345`) nutzt korrekt `useGameStateMaybe`
  (`ItemTooltip.tsx:7,477,729`). Kein Menü-/Creation-Screen kann eine live-State-Komponente rendern.

---

## Findings (schwerste zuerst)

### G0 — [P2 / bug+process / confirmed] Test-Gate ROT: übrig gelassenes TEMP-Testfile eines Schwester-Agenten schlägt fehl (echtes Determinismus-Signal)
- **Repro:** `pnpm test` → `@hearthforge/engine:test` failed, `packages/engine/src/zzz_qa_idle.test.ts:91`
  (Testfall **DET-2** „gathering + active farming plot: one big advance == many small advances").
- **Zwei Ebenen — beide melden:**
  1. **Prozess/Cleanup:** `zzz_qa_idle.test.ts:1` trägt den Header
     `// QA SWEEP 2026-07-01 — Idle/AFK/Offline (Kontrolleur). TEMP test script, delete after run.`
     → Es ist ein **temporäres QA-Skript einer Schwester-Persona aus GENAU diesem Sweep**, das nach
     dem Lauf gelöscht werden sollte, aber im Baum liegen blieb und jetzt das Engine-Test-Gate rot
     färbt. Muss aufgeräumt werden, unabhängig vom Befund.
  2. **Echtes Signal (nicht wegwerfen):** DET-2 deckt eine **Determinismus-Divergenz im Offline-Pfad**
     auf, wenn Holzfällen UND ein aktives Farm-Beet gleichzeitig laufen. Ein einzelner großer
     `advance(MAX_OFFLINE_MS)` ergibt einen ANDEREN Zustand als 100s-Chunks:
     `rng.state` divergiert (big `1694328245` vs chunked `2830117191`) und der `normal_log`-Inventarstand
     unterscheidet sich — **obwohl** `itemsGathered` (12791), woodcutting-XP (21488), farming-XP (864),
     mastery und `totalTicks` (288000) **identisch** sind. D.h. das Farm-Auto-Harvest/Replant zieht
     RNG an chunk-abhängigen Punkten → der geteilte RNG-Strom desynchronisiert → die Rare-Drop-
     Aufteilung des Holzfällens (normal_log vs. seltener Nebendrop) verschiebt sich.
  - **Wichtig:** Die reinen Gathering-Determinismus-Tests **DET-1** (100s-Chunks, `:72`) und **DET-3**
    (100ms-Live-Ticks vs. großer Offline-Sprung, `:105`) **bestehen** — nur die Farming+Gathering-
    Kombination bricht. Die Engine postuliert Chunk-Invarianz (genau das prüfen DET-1/DET-3), hält sie
    aber bei überlagertem Farming nicht ein.
- **Impact:** Gering für den Spieler (Gesamtertrag/XP praktisch gleich; nur die Seltendrop-Verteilung
  + interner RNG-Zustand hängen von der Chunk-Größe ab). Aber es verletzt die Determinismus-Zusage
  und macht Offline- vs. Online-Ergebnisse bei aktivem Farming minimal reproduzierbar-abhängig.
- **Evidence:** `packages/engine/src/zzz_qa_idle.test.ts:1,75-92`; Fehlerausgabe des `pnpm test`-Laufs.
- **Empfehlung / Routing:** **Logic-Dev** triagiert: entweder (a) Farming-Offline-Catch-up
  chunk-invariant machen (RNG-Ziehung an deterministische Tick-Grenzen koppeln) → Bug-Fix, ODER
  (b) den Invarianz-Anspruch für Farming bewusst aufgeben. In BEIDEN Fällen muss das **TEMP-Testfile
  entfernt** werden, damit das Gate wieder grün ist. **NICHT selbst gefixt (Read-only-QA).**
  *(Außerhalb meines Onboarding-Fokus, aber ein rotes Gate ist ein rotes Gate — daher gemeldet.)*

### F1 — [P2 / ux / confirmed] First-Run-Onboarding ist eine 21-Schritte-Textwand
- **Repro:** Neuen Charakter erstellen → Guide öffnet automatisch (`GameContext.tsx:120,125`).
- **Erwartet:** Ein kurzer, überspringbarer Kern-Loop-Einstieg ("core loop in a few steps",
  so verspricht es `onboarding.welcome.body`).
- **Tatsächlich:** `STEPS` (`components/Onboarding.tsx:32-41`) = 1 Welcome + **14** Einzel-Skill-Screens
  (`GENERAL_SKILL_IDS` = alle Nicht-Kampf-Skills: woodcutting, mining, fishing, smithing, cooking,
  farming, foraging, thieving, fletching, leatherworking, jewelcrafting, runecrafting, herblore, slayer)
  + 1 Combat + 4 System-Screens (achievements/mastery/shop/bank) + 1 Done = **21 modale Schritte**,
  jeder ein dichter Absatz. Das Overlay schließt bewusst NICHT bei Außenklick
  (`Onboarding.tsx:188-190`) → der Neuling hat nur die Binärwahl "21× Weiter durchklicken" oder
  "Skip" (dann lernt er gar nichts). Der Guide passt sich außerdem nicht an den bei der Erstellung
  gewählten Stil an: ein Magie-Starter sieht trotzdem den Fletching-Screen ("keep your quiver
  stocked", `onboarding.guide.fletching`).
- **Evidence:** `apps/client/src/renderer/components/Onboarding.tsx:28-41`, `:130-185`;
  Skill-Zählung aus `packages/content/src/index.ts:9-34` (21 Skills − 7 Kampf = 14 General).
- **Empfehlung:** Kern-Loop auf ~5 Schritte verdichten (die dafür passenden Strings existieren noch,
  s. F4), Skills in-context erklären statt vorab. Bewusst gegen die Memory-Notiz
  „Onboarding-Guide = finaler Meilenstein" abzuwägen — hier geht es nur um die Länge des
  Interim-Guides, nicht den großen geführten Flow. **Owner: UI-Dev (+ CEO-Produktentscheid).**

### F2 — [P3 / ux / confirmed] Nach dem Guide landet der Neuling auf dem dichten Charakterblatt ohne Handlungsaufforderung
- **Repro:** Guide schließen → Standard-Seite ist `character` (`App.tsx:264` `useState("character")`).
- **Erwartet:** Ein sichtbarer "Jetzt loslegen"-Anker (erste Sammel-Aktion oder Kampf).
- **Tatsächlich:** Der Spieler sieht sofort das komplexeste Screen der App — Portrait, 6 Attribute,
  Paperdoll, Kampf-Stats, Inventar-Grid (`pages/CharacterPage.tsx`) — ohne Hinweis, wohin als
  Nächstes. Die Startwaffe ist zwar auto-equipped (`state.ts:81`), aber es gibt keinen CTA Richtung
  Sidebar-Skill oder Combat. Kein Blocker (Sidebar ist da), aber eine verpasste Führung.
- **Empfehlung:** Erste-Sitzung-Landing auf eine Sammel-Skill-Seite oder ein dezenter
  „Starte hier"-Nudge. **Owner: UI-Dev.**

### F3 — [P3 / ux / confirmed] Equip-Auffindbarkeit hängt an 1s-Hover bzw. Klick-Pin
- **Repro:** Charakterblatt → Inventar-Item ausrüsten.
- **Tatsächlich:** Wege sind (a) Item auf die Paperdoll ziehen oder (b) Item anklicken → Tooltip
  wird gepinnt und zeigt die „Ausrüsten"-Aktion (`CharacterPage.tsx:344-346`, `ItemCell.tsx:83-91`).
  Der Hover-Tooltip erscheint aber erst nach **1000 ms** (`ItemCell.tsx:8 HOVER_DELAY_MS`) — für einen
  Neuling, der über ein Item fährt und nichts sieht, wirkt das kurz „tot". Der Klick-Pin
  mildert das (sofort), ist aber nicht beschriftet. Onboarding-Text sagt nur „drag items onto the
  paperdoll" (`onboarding.guide`/`onboarding.equip.body`), nennt den Klick-Weg nicht.
- **Empfehlung:** Hover-Delay für Inventar-Items senken oder eine kleine „Klick für Aktionen"-Andeutung.
  Niedrige Prio. **Owner: UI-Dev.**

### F4 — [P3 / code+i18n / confirmed] Verwaiste Onboarding-Strings (alter 5-Schritt-Guide)
- **Tatsächlich:** `onboarding.gather.*`, `onboarding.process.*`, `onboarding.equip.*`,
  `onboarding.fight.*`, `onboarding.economy.*`, `onboarding.idle.*` (Title+Body, en+de = 24 Keys)
  sind in `i18n/translations.ts` definiert (en `:179-190`, de `:1056-1067`), werden aber **nirgends**
  im Renderer referenziert (grep über `apps/client/src/renderer/**` außer translations.ts = 0 Treffer).
  Reste des früheren 5-Schritt-Guides, ersetzt durch den per-Skill-Guide. Tot, aber harmlos.
- **Empfehlung:** Entweder als kompakter Guide wiederverwenden (deckt F1 ab) oder entfernen.
  **Owner: UI-Dev.**

### F5 — [P3 / code / confirmed] Veralteter Kommentar „12h-Offline-Cap" (Cap ist 8h)
- **Tatsächlich:** `GameContext.tsx:191` Kommentar spricht von „12h-Offline-Cap", der reale Wert ist
  aber `MAX_OFFLINE_MS = 8h` (`packages/shared/src/index.ts:26`). Nur Kommentar-Drift, kein
  Verhaltensfehler (der Code deckelt korrekt auf 8h).
- **Owner: Logic-Dev.**

---

## Verifikation der „gerade gefixten" Punkte — alle bestätigt ✅
- **Offline-Cap 8h:** `MAX_OFFLINE_MS = 8 * 60 * 60 * 1000` (`shared/src/index.ts:26`); rAF-Loop
  (`GameContext.tsx:192`) und deserialize deckeln beide darauf. ✅
- **Offline-Popup-Icons:** `getSkillIcon(id) ?? getSidebarIcon(id)` Fallback (`OfflinePopup.tsx:31`). ✅
- **Save-Übersicht + activePlayMs:** `MainMenu.tsx:92` zeigt `activePlayMs ?? elapsedMs` (Alt-Save-Fallback). ✅
- **Bogen-Equip ohne Fletching:** `cracked_bow` hat KEIN `requirements`-Feld
  (`content/src/index.ts:298-315`) → Ranged-Starter ist re-equipbar ohne Fletching. ✅
- **Pfeile köcher-equippable + Stack 9999:** `crude_arrow` `ammo:true, stackable:true`
  (`content/src/index.ts:316-324`); `AMMO_MAX_STACK = 9999` (`engine/src/inventory.ts:14`);
  Equip von Munition läuft über `equipAmmo` (`equipment.ts:59-61`). ✅
- **Magie-Starter re-equipbar:** `cracked_staff` hat KEIN `requirements`
  (`content/src/index.ts:326-344`) → ein frischer Magie-Spieler kann seinen Startstab jederzeit
  wieder anlegen. Der bekannt-offene „Magie verlangt Runecrafting zum Equippen"-Fall betrifft die
  **Progressions-Stäbe** (z.B. `gnarled_staff`), NICHT die Startwaffe. Kein Onboarding-Blocker. ✅

## Suspected / Verifikationslücken (nicht Erste-Stunde-relevant)
- **[suspected] Dungeon-Keys aus Shop:** `content.shop` enthält KEINE Schlüssel-Einträge — `crypt_key`
  & Co. tauchen nur als Monster-Drops auf (`content/src/index.ts:364`, Loot-Tabellen `:10055ff`),
  kein `{ itemId: "crypt_key", cost: … }` im Shop-Array. Konnte nicht bestätigen, dass der Fix
  „Keys kaufbar" im Content gelandet ist. Für die erste Spielstunde irrelevant (Dungeons brauchen
  Combat-Level). **→ Content-Dev zur Klärung der Absicht.**
- **[suspected] Attack-Speed-Suffix:** Konnte per grep kein Swift/Speed-Suffix mit `attackIntervalMs`
  im Content lokalisieren — außerhalb des Onboarding-Fokus, nicht abschließend geprüft.
  **→ Content-Dev / Combat-Dev falls relevant.**

---

## Kurz-Zusammenfassung
- **Gates:** typecheck ✅ · build ✅ · **tests ❌ (1 failed / 514 passed)** · UI-Crash-Gate ✅
- **P0:** 0 · **P1:** 0 · **P2:** 2 (G0, F1) · **P3:** 4 (F2–F5) · **suspected:** 2
- **Top-3:**
  1. **G0** — Test-Gate ROT: TEMP-Testfile `zzz_qa_idle.test.ts` einer Schwester-Persona blieb liegen
     UND deckt eine echte Farming+Gathering-Offline-Determinismus-Divergenz auf. Aufräumen +
     triagieren (P2, Logic-Dev).
  2. **F1** — 21-Schritte-Onboarding-Wand; verdichten oder in-context erklären (P2, UI-Dev).
  3. **F2** — Post-Guide-Landing auf dichtem Charakterblatt ohne „Jetzt loslegen"-Anker (P3, UI-Dev).
- **Alle 6 gerade gefixten Punkte verifiziert grün.** UI-Crash-Gate sauber; typecheck + build grün.
- **Empfehlung:** **fix-then-ship.** Die reine Erste-Stunde-*Mechanik* ist ship-fähig (keine
  Onboarding-Blocker), aber das Test-Gate ist rot: erst G0 aufräumen (TEMP-Test raus + Determinismus
  triagieren), dann F1 als UX-Politur vor EA. F2–F5 sind niedrige Prio.
