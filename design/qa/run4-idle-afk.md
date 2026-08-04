# QA Run 4 — Idle-Loop / AFK-Fairness / Overnight-Gefühl

**Tester:** Playtester-Analyst (Idle/AFK-Linse) · READ-ONLY (kein Spielcode geändert) · **Datum:** 2026-06-27
**Scope:** Passive Schicht (aktive Aktion + Farm-Plots laufen offline parallel), Auto-Replant/Auto-Eat/Auto-Bank/readyYield als Komfort, Ertrag bei vollem Inventar, ob ein Über-Nacht-Lauf sinnvoll Fortschritt bringt ohne zu trivialisieren, Engagement-Gefälle aktiv vs. AFK, Tick-Determinismus über lange Zeiträume.
**Methode:** Code-Audit + temporäres Sim-Harness (engine/vitest, danach **entfernt**). Alle Zahlen empirisch gemessen über `advance()` mit echtem Content (seed-fix, melee, starterKit). Belegt gegen `tick.ts`, `farming.ts`, `combat.ts`, `persistence/index.ts`, `shared/index.ts`.

---

## Fun-Score: **7 / 10** (Idle/AFK/Overnight-Linse)

Das **passive Fundament ist exzellent und idle-fair**: Offline läuft bit-identisch zu Online über dieselbe `advance()`-Funktion (deterministisch über 24 h verifiziert), aktive Aktion **und** alle Farm-Plots reifen gleichzeitig (echtes zweites Layer, auch während des Kampfes), nichts geht bei vollem Inventar verloren (`readyYield`-Parken + Auto-Bank-Default-AN), und ein 24-h-Cap verhindert Trivialisierung/Hortung. Das ist sauber gebaut.

Der Score liegt trotzdem bei 7 und nicht höher, weil das **Overnight-Gefühl im Kampf zerbricht**: Combat hat **keinen Auto-Neustart nach dem Tod** — stirbt der Held einmal (z. B. weil das Essen aufgebraucht ist), endet der Kampf endgültig und der **Rest der Nacht liegt brach**. Ein frischer Spieler, der mit Starter-Ausrüstung über Nacht kämpft, **verliert 7,84 von 8 Stunden**. Dazu zwei Reibungspunkte: Offline-Nachholen friert beim Laden spürbar ein (~32 s für 24 h Sammeln), und sowohl Combat (Essen) als auch Farming (Saat) sind über endliche Verbrauchsgüter **zeitlich gedeckelt**, ohne dass das Spiel sauber pausiert statt zu „verunglücken".

**Kurz:** Passives Sammeln/Farmen = idle-fair und rund (≈8–9). Overnight-Combat = fragil (eine Niederlage killt die Nacht). Diese Asymmetrie deckelt den Gesamteindruck.

---

## Belegte Messungen (Sim-Harness, danach entfernt)

| Test | Ergebnis | Bedeutung |
|---|---|---|
| **Determinismus 24 h offline** (Woodcutting, gleicher Seed, 2 Läufe) | `same = true`, 864.000 Ticks identisch | Offline-Fortschritt ist exakt reproduzierbar |
| **Tick-Determinismus** (1× advance(8 h) vs. 480× advance(1 min)) | **identisch** | Akkumulator korrekt; Chunking ändert das Ergebnis nicht |
| **Offline-Perf 24 h Sammeln** | **~32 s** synchron (8 h ≈ ~11 s) | Lade-Freeze nach langer Abwesenheit |
| **Offline-Perf 24 h Combat** | ~4 s, 11.108 Kills, 0 Tode (Essen satt) | Combat-Tick deutlich billiger; läuft mit Essen unbegrenzt |
| **Overnight Combat, Starter-Food** (10 Shrimp, Tier 0, vs. Goblin, 8 h) | **Tod @ 9,5 min**, dann Stopp → **7,84 h / 8 h brach** | Eine Niederlage beendet die Nacht |
| **Overnight Combat, 500 Shrimp + Tier 2** (8 h) | Stopp @ ~417 min (~7 h), 2.910 Kills, Essen=0→Tod | Combat ist hart essens-gedeckelt |
| **Farming 8 h** (8 Plots, 50 Saat, Auto-Replant) | 365 Ernte, **Saat=0** | Saat-limitiert: 50 Saat ≈ 1 h, dann 7 h Leerlauf |
| **Parallel-Schicht** (Combat + 8 Plots, 8 h) | 3.343 Kills **und** 2.868 Ernte | Beide Schichten laufen offline gleichzeitig ✅ |
| **readyYield** (Inventar voll, Auto-Bank aus) | `readyYield = 366`, nicht verloren | Komfort-Netz greift ✅ |
| **>24 h Abwesenheit** | `offlineMs = min(now−savedAt, 24h)` in `deserialize` | Überschuss jenseits 24 h verfällt (fair, aber Wochenend-AFK kappt) |

---

## Stärken (verifiziert, kein Regress ggü. run3)

1. **Offline == Online, deterministisch.** Dieselbe `advance()` treibt Live-Loop und Offline-Nachholen (`persistence/index.ts:851`); zwei 24-h-Läufe mit gleichem Seed sind bit-identisch. Maximal idle-fair: kein Offline-Tax, kein Online-Bonus.
2. **Echtes zweites passives Layer.** Farm-Plots reifen gegen `state.elapsedMs` 1×/`advance` rein arithmetisch (`tickFarmPlots`), **auch während des Kampfes** — der Parallel-Test liefert gleichzeitig Kills **und** Ernten. Genau das „zwei Dinge auf einmal"-Gefühl, das ein Idler will.
3. **Nichts geht verloren.** Auto-Bank ist Default AN (`defaultSettings()` → Sammeln stoppt nie an vollem Inventar, Überlauf → Lager); bei Auto-Bank-aus parkt die Ernte als `readyYield` auf dem Plot und wird nachgeholt, sobald Platz frei ist (verifiziert: 366 geparkt).
4. **Auto-Replant Default AN**, Saat aus Inventar **und** Lager — der Normalfall läuft ohne Eingriff weiter.
5. **Combat farmt durchgehend.** Nach einem Kill respawnt derselbe Gegner automatisch (`combat.ts:406`) → mit genug Essen 24 h = 11.108 Kills, 0 Tode.
6. **Milde Tod-Strafe.** Bei Niederlage: voll geheilt, **kein** Item-/XP-Verlust (`onPlayerDefeated`, combat.ts:464) — fair für ein Idle-Genre … *aber* (siehe P1) der Kampf startet danach nicht neu.
7. **24-h-Cap** (`MAX_OFFLINE_MS`) verhindert Trivialisierung durch tagelanges Liegenlassen.

---

## Priorisierte Findings

### [P1 AFK-Fairness] Overnight-Combat endet endgültig beim ersten Tod — kein Auto-Neustart → Nacht verschenkt
**Befund (gemessen):** `onPlayerDefeated` setzt `combat.monsterId = null` und heilt voll, **aber** nichts startet den Kampf erneut. Im 8-h-Lauf eines frischen Spielers (Starter-Food, Tier 0) gegen Goblin: **Tod nach 9,5 min, danach 7,84 h von 8 h brach** (0 Fortschritt). Selbst gut ausgerüstet beendet **eine einzige** Niederlage die gesamte Nacht — und der häufigste Auslöser ist nicht der Gegner, sondern **aufgebrauchtes Essen** (Auto-Eat feuert nicht mehr → Held nimmt Schaden bis zum Tod → Stopp).
**Wirkung auf Spaß:** Der Auftrags-Kern „bringt ein Über-Nacht-Lauf sinnvoll Fortschritt?" wird für **Combat verfehlt**, sobald Essen/HP nicht 8 h durchhalten. Gathering/Farming laufen die Nacht durch, Combat fällt nach Minuten/Stunden tot um. Das ist die größte Overnight-Asymmetrie.
**Fix-Vorschlag (Reviere: combat-dev/logic-dev):** (a) Optionaler **Auto-Restart desselben Gegners** nach Tod (Idle-Standard; die milde Strafe ist ohnehin schon „voll heilen"), ODER (b) bei leerem Essen **sauber pausieren statt sterben** (Combat stoppt mit `lastStop = "no_food"` analog `no_materials`/`inventory_full`) — dann verliert man Kampfzeit, aber nicht die ganze Nacht an einen Tod.

### [P2 AFK-Komfort] Auto-Eat hat keinen „Essen leer"-Sicherheitsstopp → Depletion wird zum Tod
**Befund:** `tryAutoEat` (combat.ts:67) macht bei `itemCount(food) < 1` einfach nichts — kein Stopp, kein Hinweis. Der Held kämpft weiter, nimmt Schaden, stirbt (siehe P1). 500 Shrimp + Tier 2 reichen nur ~7 h; für eine 8-h-Nacht gegen Goblin braucht es mehr, und das Ende ist immer **Depletion → Tod → Stopp** statt eines kontrollierten „kein Essen mehr".
**Wirkung:** Das einzige aktive Management, das Overnight-Combat verlängert, ist „genug Essen vorlegen" — aber das Fehlerverhalten bestraft Fehleinschätzung maximal (ganze Nacht weg statt ab Essens-Ende). Eng mit P1 gekoppelt; gemeinsam fixbar.
**Fix:** Combat bei `food`-Bestand 0 **anhalten** (mit `lastStop`-Grund + Toast „Essen leer"), HP bleibt erhalten, Wiederaufnahme nach Restock. Macht die Food-Decke planbar statt fatal.

### [P2 Perf/UX] Offline-Nachholen friert beim Laden spürbar ein (~32 s für 24 h Sammeln)
**Befund (gemessen):** `deserialize` ruft `advance(state, content, offlineMs)` **synchron** in einem Rutsch (24 h = 864.000 `step`-Iterationen). Gemessen: **~32 s für 24 h Woodcutting** (8 h ≈ ~11 s). Combat ist mit ~4 s/24 h deutlich billiger (weniger `completeAction`-Abschlüsse), aber Sammel-Loops mit kurzer Aktionsdauer (z. B. 2,8 s/Baum) summieren sich. Es gibt **keinen Progress-Indikator und keine Async-/Batch-Aufteilung** — der UI-Thread steht still, bis der Catch-up fertig ist.
**Wirkung:** Wer das Spiel über Nacht/übers Wochenende liegen lässt (der Kern-Use-Case dieser Linse!), wird beim nächsten Start mit einem mehrsekündigen Freeze begrüßt, der wie ein Hänger wirkt.
**Fix-Vorschlag (Reviere: logic-dev/ui-dev):** Offline-Catch-up in einen Worker oder in zeit-budgetierte Häppchen mit Ladebalken auslagern; oder die heißen Pfade (`completeAction` Loot/`addItemOrBank`) für reine Mengen-Akkumulation optimieren. Kein Korrektheitsproblem (Ergebnis ist deterministisch korrekt), aber ein Overnight-Gefühl-Dämpfer.

### [P2/P3 AFK-Tiefe] Farming-Saat ist der Overnight-Begrenzer — passive Schicht steht nachts früh still
**Befund (gemessen):** Saat ist ein permanenter Sink (kein Saat-Rückwurf bei Ernte). 8 Plots × 8 h ÷ 10-min-growMs = **384 Saat nötig**, um eine volle Nacht durchzufarmen. Mit 50 Saat: nach ~1 h erschöpft (365 Ernte), dann **7 h Leerlauf** auf allen Plots. Das passive Layer „verhungert" über Nacht, wenn man nicht hunderte Saat hortet. (run3-gathering P2/P3 nannte die 6 Forage-only-Saaten ohne Shop-Fallback als Soft-Stall-Risiko — derselbe Mechanismus, hier zeitlich quantifiziert.)
**Wirkung:** Das zweite passive Layer trägt overnight nur, solange Saat reicht; danach ist Combat/Gathering die einzige laufende Schicht. Mildert, aber bricht nicht das Overnight-Gefühl.
**Fix-Vorschlag:** Niedriger **Saat-Rückwurf bei Ernte (5–10 %)** (run3-gathering schlug das bereits vor) — dämpft den Saat-Drain global und hält Plots über Nacht länger am Leben, ohne Saat-Ökonomie zu trivialisieren.

### [P3 AFK-Onboarding] Starter-Kit gibt keine Saat → passive Farming-Schicht startet nicht von allein
**Befund:** `createGame` legt mit `starterKit` 10× Essen (+ bei Ranged Köcher/60 Pfeile) an, **aber keine Saat** (state.ts:95–101 — verifiziert). Die freigeschalteten Plots stehen beim ersten Besuch leer (jeder Crop „keine Saat"); die erste Saat muss erst erforagt/gekauft werden. (Identisch zu run3-early-game P2 — **nicht** gefixt.) Für die AFK-Linse heißt das: das zweite passive Layer läuft beim allerersten Über-Nacht-Lauf **gar nicht**, bis der Spieler aktiv Saat besorgt hat.
**Fix:** Mini-Saat-Stack ins Starter-Kit (z. B. 3× `ashroot_seed`/`graywort_seed`) — gleicher „sofort loslegen"-Effekt wie Essen/Köcher.

---

## Engagement-Gefälle: aktiv vs. AFK (Auftrags-Frage)

Weil Offline **bit-identisch** zu Online rechnet, liefert AFK für **einen ununterbrochenen Loop exakt denselben Ertrag** wie aktives Spiel — es gibt keinen Online-Bonus und (innerhalb 24 h) keine Offline-Strafe. Das ist für ein Idle-Game **gesund und fair**. Der einzige mechanische Vorteil aktiven Spiels ist das **Überwinden der AFK-Stopper**:

| Stopper | AFK-Folge | Aktiver Vorteil |
|---|---|---|
| Tod im Kampf (P1) | Nacht endet, Rest brach | Sofort neu starten → keine verlorene Zeit |
| Essen leer (P2) | Tod → Stopp | Restock → Kampf läuft weiter |
| Saat leer (P2/P3) | Plots stehen still | Nachsäen → passives Layer lebt |
| Inventar voll (Auto-Bank aus) | Aktion stoppt / readyYield parkt | Auto-Bank an lassen → läuft endlos |
| Aufgabe wechseln / Ziel hochstufen | bleibt beim alten Loop | Optimieren → besserer g/h-XP-Schnitt |

**Verdikt:** Das Gefälle ist *grundsätzlich gut austariert* — aktives Spiel optimiert und verlängert, AFK fährt die Baseline. **Problem:** der wichtigste Stopper (Combat-Tod) ist **binär und fatal** statt graduell. Würde Combat nach Tod/Essens-Ende sauber pausieren statt die Nacht zu killen (P1+P2), wäre die Asymmetrie ideal: aktiv = mehr, AFK = solide statt zerbrechlich.

---

## Δ vs run3

Direkter Vergleichspunkt ist **`run3-gathering.md` (Fun-Score 8/10)**, das die Gathering/Idle-Linse abdeckte (Plots, Auto-Replant, readyYield, 24-h-Cap, Saat-Ökonomie).

- **Kein Regress:** Alle run3-Idle-Stärken **empirisch bestätigt** (Determinismus, Parallel-Layer, readyYield, Auto-Bank/Replant-Defaults, 24-h-Cap). Der reine Sammel-/Farm-Idle-Loop steht weiter bei ~8–9.
- **Breitere Linse, niedrigerer Gesamtscore (8 → 7):** run3-gathering betrachtete **Combat nicht**. Diese Linse deckt Combat-AFK + Offline-Perf mit ab und legt damit **drei neue Dämpfer** offen, die run3 nicht hatte:
  - **NEU P1** — Overnight-Combat endet endgültig beim ersten Tod (run3 ungeprüft).
  - **NEU P2** — Auto-Eat ohne „Essen leer"-Sicherheitsstopp (Depletion → Tod).
  - **NEU P2** — Offline-Catch-up-Freeze (~32 s/24 h) — Perf erstmals gemessen.
- **Aus run3 übernommen, noch offen:** Saat-Drain als Overnight-Begrenzer (run3-gathering P2/P3, hier zeitlich quantifiziert) und fehlende Starter-Saat (run3-early-game P2) — **beide nicht gefixt**.
- **Netto Δ ≈ −1**, aber **scope-bedingt, kein Qualitätsverlust**: Das Fundament ist unverändert stark; der Abzug spiegelt die erstmals beleuchtete Combat-AFK-Fragilität + Perf.

---

## Bottom Line
Das **passive Fundament ist idle-fair und sehr sauber** (deterministisch offline, echtes Parallel-Layer, kein Ertragsverlust, fair gedeckelt). Der eine strukturelle Riss im Overnight-Gefühl ist **Combat-AFK**: ein einziger Tod (meist durch leeres Essen) **beendet die Nacht endgültig** statt sauber zu pausieren — gemessen 7,84 h/8 h verschenkt beim Starter-Lauf. Höchster Hebel ist das **gekoppelte P1+P2-Paket**: Combat bei leerem Essen sauber pausieren (statt sterben) **und/oder** optionaler Auto-Restart nach Tod. Sekundär: Offline-Catch-up entkoppeln (Perf-Freeze) und den Saat-/Starter-Saat-Drain abfedern, damit die passive Schicht die ganze Nacht trägt.
