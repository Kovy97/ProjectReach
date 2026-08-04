# QA Run 5 — Idle-Loop / AFK-Fairness / Overnight-Gefühl

**Tester:** Playtester-Analyst (Idle/AFK-Linse) · READ-ONLY (kein Spielcode geändert) · **Datum:** 2026-06-28
**Scope:** Verifikation der run4-Fixes — **Auto-Neustart nach Tod** (run4-P1) + **Essen-leer-Verhalten** (run4-P2) im Overnight-Combat; dazu Offline-Catch-up-Perf, passives Doppel-Layer (Plots + Combat), Determinismus über lange Zeiträume und **Auto-Salvage** als neuer Komfort-Hebel.
**Methode:** Code-Audit + temporäres Sim-Harness (engine/vitest, **danach entfernt**). Alle Zahlen empirisch über `advance()` mit echtem Content (seed-fix, melee/bronze_sword vs. Goblin & Goblin-Varianten). Belegt gegen `combat.ts`, `enchant.ts`, `suffix.ts`, `tick.ts`, `persistence/index.ts`, `shared/index.ts`, `state.ts` + die neuen Guard-Tests (`combat-autorestart.test.ts`, `autoeat-dot.test.ts`, `lifesteal-respawn.test.ts`).

---

## Fun-Score: **8,5 / 10** (Idle/AFK/Overnight-Linse)

**Der eine strukturelle Riss aus run4 ist geschlossen** — und zwar robust. Combat **startet nach dem Tod automatisch neu** (`onPlayerDefeated`, combat.ts:517-539): voll geheilt, Gegner-HP zurück, DoT/Pet-Status verfallen, `monsterId` **bleibt gesetzt** → der nächste Tick kämpft einfach weiter. Damit ist die größte Overnight-Asymmetrie von run4 (»ein Tod killt die Nacht«) weg: Der gemessene Starter-Lauf, der in run4 nach 9,5 min starb und **7,84 h von 8 h brach** liegen ließ, **farmt jetzt die volle Nacht durch** (3.357 Kills über 8 h, Kampf läuft am Ende noch). Das ist genau der Fix, der run4 bei 7 deckelte.

Der Score steht bei **8,5 und nicht höher**, weil die Restbremsen jetzt **Komfort/Perf/Footgun** sind, keine Fairness-Brüche mehr: (1) Das Offline-Nachholen **friert beim Laden weiter ~26 s ein** (24 h Sammeln, synchron, kein Ladebalken) — unverändert seit run4, und ausgerechnet der Overnight-Use-Case trifft es. (2) **Auto-Salvage ist „Phase 1" = alles-oder-nichts**: Flag AN zerlegt **jede** frische Suffix-Instanz, auch eine Top-Rolle — als Idle-Komfort so nicht sicher nutzbar. (3) Das Essen-leer-Verhalten wurde **über den Auto-Neustart gelöst, nicht über einen sauberen Pause-Stopp**: Geht das Essen aus, **stirbt und respawnt** der Held in einer stillen Schleife (gemessen 24-73 Tode/Nacht), statt kontrolliert zu pausieren — die Nacht ist gerettet, aber der `deaths`-Zähler bläht sich auf und der Spieler bekommt **kein Signal** („bring mehr Essen"). (4) Fernkampf bekam den Neustart **nicht**: leerer Köcher = **harter Stopp** (`stopIfOutOfAmmo`).

**Kurz:** Passives Fundament unverändert exzellent (deterministisch, echtes Parallel-Layer, fair gedeckelt). Overnight-**Melee-Combat** ist jetzt idle-rund. Was die 9,5 verstellt: Lade-Freeze, Auto-Salvage-Footgun, die still-schleifende statt sauber pausierende Essens-Decke und die Fernkampf-Sonderrolle.

---

## Belegte Messungen (Sim-Harness, danach entfernt)

| Test | Ergebnis | Bedeutung |
|---|---|---|
| **Overnight Combat, Starter-Food** (10 Shrimp, melee, vs Goblin, 8 h) | Essen 10→0, **3.357 Kills, 24 Tode, Kampf läuft weiter** (hp 263/301) | **run4-P1 FIX bestätigt:** Nacht nicht mehr brach — volle 8 h produktiv trotz Essens-Ende |
| **Overnight Combat, KEIN Essen** (str/con 8, vs Goblin, 8 h) | **5.007 Kills, 0 Tode**, Kampf läuft | Goblin zu schwach + Lifesteal → Held braucht nicht mal Essen; keine Schleife nötig |
| **Overnight Combat, 500 Shrimp** (vs Goblin, 8 h) | **0 Essen verbraucht** (500→500), 4.998 Kills, 0 Tode | Essens-Decke gegen Trivial-Mob irrelevant — Lifesteal/Regen tragen allein |
| **Todesschleife: schwacher Held, KEIN Essen, härtere Mobs** (8 h) | Shaman 2.391 K/69 T · Spearman 3.222 K/57 T · Rogue 4.579 K/73 T | Auch ohne Sustain **kein** Null-Fortschritt-Spiral: tausende Kills, Nacht läuft — aber Tode inflationieren still |
| **Offline-Perf 24 h Woodcutting** | **~26 s** synchroner Freeze (run4: ~32 s) | Lade-Hänger nach langer Abwesenheit — **unverändert** (kein Worker/Batch/Progress) |
| **Determinismus 8 h** (Woodcutting, gleicher Seed, 2 Läufe) | `same = true` | Offline-Fortschritt weiter bit-identisch reproduzierbar |
| **Auto-Salvage Flag AN** (high-ilvl Suffix-Drop via `intakeInstance`) | **zerlegt — unabhängig von der Qualität** | „Phase 1" liest nur das Flag (`shouldAutoSalvage`) → alles-oder-nichts, gute Rollen gehen mit |
| **Starter-Kit** | 10× cooked_shrimp + Food-Vorbelegung, **0 Saat** (state.ts:95-101) | Saat fehlt weiter → Farm-Layer startet beim 1. Overnight nicht von allein |

---

## Stärken (verifiziert)

1. **run4-P1 GEFIXT & robust.** `onPlayerDefeated` macht Auto-Neustart im Normalkampf (monsterId bleibt, enemyHp reset, DoT/Pet-Status verfallen, voll geheilt). Deterministisch, **keine** Belohnung beim Tod (kein Doppel-Reward-Exploit), `kills`-Zähler läuft kontinuierlich weiter. Gegen jeden getesteten Mob läuft die Nacht durch.
2. **Dungeon-Tod bleibt hart** (combat.ts:529-535): Tod im Dungeon = Run-Abbruch (Schlüssel verbraucht = Einsatz). Kein Gratis-Wellen-Replay — saubere Abgrenzung zum Idle-Farmen.
3. **Auto-Eat greift jetzt auch gegen DoT** (combat.ts:833): nach dem Gift-/Brenn-/Blutungs-Tick wird gegessen — ein Spieler mit Essen stirbt nicht mehr zwischen zwei langsamen Schlägen am DoT (`autoeat-dot.test.ts`). `curesPoison` wirkt im Auto-Eat identisch zum manuellen Verzehr (run4-P3 mit-gefixt).
4. **Offline == Online, deterministisch** (unverändert): dieselbe `advance()` treibt Live + Catch-up; 8-h-Läufe mit gleichem Seed bit-identisch.
5. **Echtes zweites passives Layer** (unverändert): Farm-Plots reifen 1×/`advance` arithmetisch auch während des Kampfes; readyYield-Parken + Auto-Bank-Default-AN → kein Ertragsverlust; 24-h-Cap gegen Trivialisierung.
6. **Munitions-Stopp ist sauber** (combat.ts:747-780): Bogen ohne Munition läuft nicht mit dem -60%-Notschlag weiter, sondern stoppt — kein verschwendeter AFK-Loot. (Kehrseite siehe P2-Asymmetrie.)

---

## Priorisierte Findings

> **Kein P0, kein P1.** Die run4-P1/P2-Overnight-Bremse ist strukturell behoben. Die Restpunkte sind Komfort/Perf/Signal, keine Fairness-Brüche.

### [P2 Perf/UX — CARRY-OVER aus run4] Offline-Nachholen friert beim Laden ~26 s ein (24 h Sammeln)
**Befund (gemessen):** `deserialize` ruft `advance(state, content, offlineMs)` weiter **synchron in einem Rutsch** (persistence/index.ts:857; 24 h = 864.000 Steps). Re-gemessen: **~26 s für 24 h Woodcutting** (run4: ~32 s — leichte Schwankung, gleiche Größenordnung). Kein Worker, kein Batch, **kein Progress-Indikator** — der UI-Thread steht bis zum Ende.
**Wirkung:** Genau der Kern-Use-Case dieser Linse (über Nacht/Wochenende liegen lassen) wird beim nächsten Start mit einem mehrsekündigen Freeze begrüßt, der wie ein Hänger wirkt. **Nicht** adressiert seit run4.
**Fix (logic-dev/ui-dev):** Catch-up in zeit-budgetierte Häppchen mit Ladebalken oder in einen Worker; alternativ die heißen Pfade (`completeAction`-Loot/`addItemOrBank`) für reine Mengen-Akkumulation optimieren. Korrektheit ist intakt (deterministisch), reines Gefühl.

### [P2 AFK-Komfort — NEU] Auto-Salvage ist alles-oder-nichts (Phase 1) → zerlegt auch Top-Rollen
**Befund (gemessen):** `shouldAutoSalvage` (enchant.ts:342-350) ist „Phase 1" und **liest nur das Flag** (`void content; void inst; return settings.autoSalvage === true`). Im Harness wurde eine high-ilvl-Suffix-Instanz über `intakeInstance` geschickt → **zerlegt, unabhängig von der Rolle**. Default ist AUS (state.ts/`defaultSettings`), gut — aber wer den Komfort einschaltet, **schreddert jeden verzauberten/gerollten Drop**, inkl. der seltenen guten.
**Wirkung:** Der einzige neue Idle-Komfort dieser Runde ist als „an und vergessen"-Funktion **nicht sicher** nutzbar — der AFK-Spieler, der genau dafür einschaltet, verliert über Nacht potenziell sein bestes Loot. Faktisch bleibt die Funktion ungenutzt, bis ein Qualitätsfilter existiert.
**Fix (logic-dev/balance):** Keep-Regeln vor dem Auto-Salvage (z. B. Mindest-Rarität/Affix-Schwelle/Whitelist-Slot), wie im Kommentar als „Phase 2" bereits vorgesehen. Bis dahin in der UI klar als „zerlegt ALLE Instanz-Drops" labeln (Bericht an ui-dev).

### [P2 AFK-Fairness — Stil-Asymmetrie] Fernkampf bekam den Auto-Neustart nicht: leerer Köcher = harter Stopp
**Befund:** Der Tod-Neustart gilt nur für Melee/Magie. Geht dem Bogen die Munition aus, ruft `stopIfOutOfAmmo` → `endCombatOutOfAmmo` (combat.ts:747-780) und setzt **`monsterId = null`** — **harter Stopp ohne Wiederaufnahme**. Damit ist Overnight-Fernkampf weiter **binär gedeckelt**: Pfeile reichen → Nacht läuft; Pfeile leer → Rest der Nacht brach (genau das run4-P1-Muster, nur für Munition statt Essen). Melee dagegen ist durch den Neustart praktisch un-deckelbar (Essen optional).
**Wirkung:** Cross-Stil-Ungleichheit im Idle: Melee verzeiht Unter-Provisionierung, Fernkampf bestraft sie mit der ganzen Nacht. (Der Stopp selbst ist sinnvoll — der Notschlag-Loop wäre schlimmer; die Asymmetrie liegt in der **fehlenden Wiederaufnahme nach Restock**, die es für Munition genauso wenig gibt wie für Essen.)
**Fix (combat-dev):** Bei Restock automatisch fortsetzen — analog Essen: Combat bei leerer Munition in einen **pausierten** Zustand (mit Grund/Signal) statt `monsterId=null`, Wiederaufnahme sobald Munition im Köcher liegt.

### [P3 AFK-Signal — NEU] Essens-Decke löst still-schleifende Tode aus, kein „bring Essen"-Hinweis
**Befund (gemessen):** Das Essen-leer-Verhalten wurde über den Auto-Neustart gelöst, **nicht** über den in run4-P2 vorgeschlagenen sauberen Pause-Stopp. `tryAutoEat` macht bei `itemCount(food) < 1` weiter **lautlos nichts** (combat.ts:74); `lastStop` kennt weiterhin **nur** `no_materials | inventory_full` (shared:2254) — **kein** `no_food`. Folge: Geht das Essen aus, kippt der Held in eine stille **sterben→voll heilen→sterben**-Schleife. Gemessen: 24 Tode/Nacht (Starter vs Goblin) bzw. 57-73 Tode (schwacher Held vs härtere Mobs). Fortschritt bleibt (tausende Kills), aber der `deaths`-Zähler inflationiert und der Spieler erfährt nie, dass „mehr Essen" das Problem löst. Magie/Fernkampf **ohne Lifesteal** schleifen härter als Melee (kein Sustain zwischen den Toden).
**Wirkung:** Funktional gerettet, aber unsauber: aufgeblähte Tod-Statistik (kann Tod-bezogene Achievements/Anzeigen verfälschen) und ein fehlendes Diagnose-Signal. Reines Idle-Feinschliff-Thema, kein Fairness-Bruch.
**Fix (combat-dev/logic-dev/ui-dev):** Optionaler `no_food`-Pause-Stopp mit Toast „Essen leer — Kampf pausiert" + Wiederaufnahme nach Restock (zusätzlich zum Neustart, als bevorzugter Pfad solange Essen gewählt ist). Macht die Food-Decke planbar statt still-fatal-aber-gerettet.

### [P3 AFK-Onboarding — CARRY-OVER aus run4/run3] Starter-Kit gibt keine Saat → Farm-Layer startet nicht von allein
**Befund:** `createGame` legt mit `starterKit` 10× cooked_shrimp + Food-Vorbelegung an, **aber keine Saat** (state.ts:95-101 — verifiziert, unverändert). Plots stehen beim ersten Besuch leer; das zweite passive Layer läuft beim allerersten Overnight **gar nicht**, bis der Spieler aktiv Saat besorgt. Dazu unverändert der Saat-Drain (kein Saat-Rückwurf bei Ernte) → 8 Plots × 8 h brauchen ~384 Saat für eine volle Nacht.
**Fix (content-dev):** Mini-Saat-Stack ins Starter-Kit (z. B. 3× `ashroot_seed`) + niedriger Saat-Rückwurf bei Ernte (5-10 %) — beide schon in run3/run4 vorgeschlagen, weiter offen.

---

## Engagement-Gefälle: aktiv vs. AFK (Auftrags-Frage)

Weil Offline bit-identisch zu Online rechnet, liefert AFK für einen ununterbrochenen Loop denselben Ertrag wie aktives Spiel — gesund und idle-fair. Der run4-Vergleich der Stopper sieht jetzt deutlich besser aus:

| Stopper | run4-AFK-Folge | run5-AFK-Folge | Aktiver Vorteil |
|---|---|---|---|
| Tod im Melee/Magie-Kampf | **Nacht endet, Rest brach** | **Auto-Neustart → Nacht läuft durch** ✅ | Restock spart die Tod-Schleife |
| Essen leer | Tod → Stopp | Tod-Schleife, aber **läuft weiter** (still, Tode↑) | Restock → keine Tode, sauberer |
| Munition leer (Fernkampf) | (ungeprüft) | **harter Stopp, Rest brach** ⚠ | Nachfüllen → Kampf läuft |
| Saat leer | Plots still | Plots still (unverändert) | Nachsäen → Layer lebt |
| Inventar voll (Auto-Bank aus) | readyYield parkt | readyYield parkt (unverändert) | Auto-Bank an → endlos |

**Verdikt:** Der wichtigste Stopper (Melee/Magie-Tod) ist von **binär-fatal** zu **graduell-selbstheilend** geworden — genau die run4-Empfehlung. Die Asymmetrie ist jetzt nahezu ideal: aktiv = optimiert, AFK = solide statt zerbrechlich. Einziger verbleibender binär-fataler Stopper ist **Fernkampf-Munition** (P2-Asymmetrie).

---

## Δ vs run4

- **run4-P1 (Overnight-Tod beendet Nacht) → GEFIXT & empirisch bestätigt.** Der Starter-Lauf, der in run4 7,84 h/8 h brach liegen ließ, farmt jetzt die volle Nacht (3.357 Kills, Kampf läuft am Ende). Eigene Guard-Tests vorhanden (`combat-autorestart.test.ts`).
- **run4-P2 (Auto-Eat-Sicherheitsstopp) → ANDERS gelöst.** Statt des vorgeschlagenen sauberen `no_food`-Pause-Stopps wurde der Auto-Neustart-Weg gewählt: funktional gerettet, aber still-schleifende Tode statt kontrolliertem Pausieren + kein Signal (jetzt P3). Auto-Eat-gegen-DoT zusätzlich gefixt (`autoeat-dot.test.ts`).
- **run4-P3 (curesPoison nur manuell) → GEFIXT.** Auto-Eat heilt Gift jetzt identisch zum manuellen Verzehr.
- **run4-P2 (Offline-Freeze) → UNVERÄNDERT** (~26 s; weiter synchron, kein Progress).
- **run4-P2/P3 (Saat-Drain) + run3 (Starter-Saat) → UNVERÄNDERT offen.**
- **NEU:** Auto-Salvage als Komfort eingeführt, aber Phase-1-alles-oder-nichts (P2-Footgun); Fernkampf-Munition als verbleibende binär-fatale Overnight-Bremse erstmals beleuchtet (P2-Asymmetrie).
- **Netto Δ ≈ +1,5 (7 → 8,5):** Der eine strukturelle Riss, der run4 deckelte, ist sauber geschlossen. Der Rest ist Komfort/Perf/Signal.

---

## Was fehlt für 9,5?

Vier konkrete Hebel, alle „Politur" statt „Reparatur":

1. **Offline-Catch-up entkoppeln** (größter Gefühls-Hebel). Den ~26-s-Lade-Freeze nach langer Abwesenheit per Batch+Ladebalken oder Worker beseitigen — es ist der sichtbarste „fühlt sich kaputt an"-Moment ausgerechnet im Overnight-Kern-Use-Case. *(logic-dev/ui-dev)*
2. **Auto-Salvage sicher machen.** Qualitäts-/Keep-Filter (Rarität/Affix-Schwelle/Slot-Whitelist) vor dem Zerlegen, wie als „Phase 2" vorgesehen — erst dann ist der Komfort „an und vergessen"-tauglich, ohne Top-Drops zu verlieren. *(logic-dev/balance)*
3. **Essen/Munition sauber pausieren statt schleifen/hart-stoppen.** `no_food`-Pause + Toast statt stiller Tod-Schleife (deaths-Inflation vermeiden, Spieler informieren), und Fernkampf-Munition pausieren+Wiederaufnahme-nach-Restock statt hartem `monsterId=null`. Macht beide Decken planbar und beseitigt die letzte Stil-Asymmetrie. *(combat-dev/logic-dev/ui-dev)*
4. **Farm-Layer die ganze Nacht tragen.** Mini-Saat-Stack ins Starter-Kit + 5-10 % Saat-Rückwurf bei Ernte, damit das zweite passive Layer auch beim ersten Overnight startet und nicht nach ~1 h verhungert. *(content-dev)*

---

## Bottom Line
Der strukturelle Overnight-Riss aus run4 ist **geschlossen**: Melee/Magie-Combat farmt nach Tod automatisch weiter — die Nacht ist nicht mehr an einer Niederlage verloren (empirisch 8 h voll produktiv statt 7,84 h brach). Damit springt die Idle-Linse von 7 auf **8,5**. Was die 9,5 noch verstellt, ist reine Politur: der unveränderte ~26-s-Lade-Freeze, das alles-oder-nichts-Auto-Salvage, die still-schleifende statt sauber pausierende Essens-/Munitions-Decke (inkl. Fernkampf-Sonderrolle) und der fehlende Starter-Saat. Kein P0/P1 mehr — das Fundament ist idle-fair und rund.
