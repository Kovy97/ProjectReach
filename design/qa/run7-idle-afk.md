# QA Run 7 — Idle-Loop / AFK-Fairness / Overnight-Gefühl

**Tester:** Playtester-Analyst (Idle/AFK/Overnight-Linse) · READ-ONLY (kein Spielcode geändert) · **Datum:** 2026-06-28
**Scope:** Verifikation der R5-Fixes — **Offline-„Während du weg warst"-Popup zählt jetzt den Gear-Vault** (`bankInstances`), plus Re-Check, dass das Loot-Fundament aus run6 weiter idle-sicher ist (**Auto-Salvage-Qualitätsfilter** schützt Top-Rolls, **Instanz-Overflow → Vault** verlustfrei). Dazu Re-Check der zwei strukturellen Carry-over-Bremsen: **Fernkampf-Munitions-Overnight-Stopp** und **synchroner Offline-Catch-up-Freeze (~26 s)**.
**Methode:** Code-Audit + temporäres Sim-Harness (persistence/vitest, **danach entfernt** — `run7-idle.tmp.test.ts` gelöscht, bestätigt). Zahlen empirisch über `deserialize()`/`advance()` mit Custom-Content (seed-fix). Belegt gegen `persistence/index.ts` (`inventoryCounts`, `deserialize`), `enchant.ts` (`intakeInstance`, `shouldAutoSalvage`), `shared/index.ts` (`isLowQualityInstance`, `lastStop`), `combat.ts` (`endCombatOutOfAmmo`, `tryAutoEat`), `state.ts`.

---

## Fun-Score: **9,3 / 10** (Idle/AFK/Overnight-Linse)  ·  Δ vs run6: **+0,3** (9,0 → 9,3)

**Die zentrale Auftragsfrage „Ist Auto-Salvage/Vault jetzt rund?" ist mit JA beantwortet — und R5 schließt die letzte Lücke daran: der Morgen-Reveal ist jetzt ehrlich.** In run6 war die Loot-Achse zwar bereits *sicher* (nichts geht verloren), aber das Offline-Popup zählte den Gear-Vault **nicht** — genau die wertvollsten Über-Nacht-Gear-Drops (verzauberte/gesuffixte Instanzen, die bei vollem Inventar in den Vault overflowen) waren im „Während du weg warst"-Popup **unsichtbar**. Dieser Undercount ist mit R5 behoben: `inventoryCounts` (persistence:814-833) summiert jetzt zusätzlich `state.bankInstances`, je `baseItemId` aggregiert (eine Instanz = ein Exemplar), und `deserialize` bildet die Vorher/Nachher-Differenz darüber (persistence:874-883). **Empirisch bestätigt:** volles Inventar, 1 h Offline, garantierter Suffix-Gear-Drop → **3818 Instanzen in den Vault + 204 plaine Bank-Stacks = Popup meldet 4022** (= exakt alle 4022 Kills, ein Schwert pro Kill). In run6 war der Vault-Anteil **0** im Popup. „Nichts geht verloren **und** alles wird gezeigt" ist damit wieder vollständig wahr.

Das hebt die Idle-Linse von 9,0 auf **9,3**: Der Morgen-Moment — der emotionale Kern des Overnight-Use-Case — zeigt jetzt die *besten* Beute-Stücke der Nacht statt nur den Krimskrams. Kein Datenverlust war es nie (run6-Fix), aber das Gefühl „ich sehe meinen Loot" ist erst jetzt komplett.

**Der Score steht bei 9,3 und nicht bei 9,5**, weil **beide** der im Auftrag genannten Resthebel **strukturell unverändert** sind — am Code verifiziert, nicht nur vermutet: (1) **Fernkampf-Munition** stoppt weiter binär-fatal — `endCombatOutOfAmmo` setzt unverändert `monsterId=null` (combat.ts:749), der `stopReason="outOfAmmo"`-Hook ist weiter **nur ein Kommentar** (combat.ts:743-744), kein Pause/Resume; Köcher weiter 150 (state.ts:85). (2) Der **Offline-Catch-up friert weiter synchron ein** — `deserialize` ruft `advance()` unverändert in einem Rutsch (persistence:876), kein Worker/Batch/Progress (~26 s nach langer Abwesenheit). Beide sind die eklatanten Rest-Stil-/Gefühlsbrüche.

---

## Belegte Messungen (Sim-Harness, danach entfernt)

| Test | Ergebnis | Bedeutung |
|---|---|---|
| **Offline-Popup zählt Vault** (volles Inv, autoBank=an/autoSalvage=aus, 1 h, garant. Suffix-Drop) | **Popup `test_drop_sword`=4022** = 3818 Vault-Instanzen + 204 plaine Bank-Stacks | **R5-FIX bestätigt** — Vault-Anteil (run6: 0) ist jetzt sichtbar; exakt = alle 4022 Kills, kein Under-/Overcount |
| Vault-Wachstum offline (gleicher Lauf) | **3818 Suffix-Instanzen** verlustfrei im `bankInstances` | Overflow→Vault aus run6 weiter intakt; `itemsGathered` stimmt |
| Auto-Salvage AN, freier Platz, TOP-Roll | behalten (unverändert run6) | Qualitätsfilter `isLowQualityInstance` schützt weiter Top-Rolls |
| **Ranged-Stopp** (`endCombatOutOfAmmo`, combat.ts:749) | `monsterId=null`, **Code-Pfad unverändert** | Köcher 150 = reiner Puffer; kein Pause/Resume → harter Stopp bleibt (P1) |
| **Offline-Freeze** (`deserialize`→`advance` synchron, persistence:876) | **Code-Pfad unverändert** | kein Worker/Batch/Progress; ~26 s Freeze nach langer Abwesenheit bleibt (P2) |
| Bestandstests persistence | **49/49 grün** (452 ms) | Round-Trip/Migration/Sanitize stabil; Fix ist guard-getestet (index.test.ts) |

---

## Stärken (verifiziert)

1. **Morgen-Reveal ist ehrlich geworden** (Kern der R5-Auftragsfrage). Das Offline-Popup zählt jetzt Inventar + Bank + **Vault** (persistence:814-833). Die wertvollsten Over-Night-Gear-Drops sind nicht mehr unsichtbar. Empirisch: 4022 statt vorher nur ~204 sichtbar.
2. **Loot-Fundament weiter idle-sicher** (run6, re-bestätigt): `intakeInstance` → Overflow verlustfrei in den unbegrenzten Gear-Vault (enchant.ts:314-328, `kept:true/vaulted:true`); `shouldAutoSalvage` zerlegt nur „schwache" Instanzen via `isLowQualityInstance` (enchant.ts:362-369). Default bleibt sicher (autoBank=an, autoSalvage=aus).
3. **Round-Trip + Determinismus stabil**: Vault-Instanzen überleben serialize/deserialize 1:1 inkl. Suffix + `nextInstanceSeq`; Offline = Online weiter bit-identisch (persistence-Suite 49/49 grün).
4. **Melee/Magie-Overnight bleibt un-deckelbar** (unverändert run4-Fix): Tod-Auto-Neustart, keine Tod-Belohnung, Dungeon-Tod hart.
5. **Starter-Kit trägt den ersten Overnight** (state.ts: Food 20, 3× graywort_seed, Köcher 150) — unverändert intakt.

---

## Priorisierte Findings

> **Kein P0.** Ein P1 (Fernkampf strukturell), ein P2 (Offline-Freeze strukturell) — **beide die im Auftrag genannten Resthebel, am Code als unverändert verifiziert**. Drei P3 (no_food-Signal, instanceMade-Kopplung, Auto-Salvage-Schwelle) + ein P3 Repo-Hygiene (Leftover-Temp-Test).

### [P1 AFK-Fairness — Stil-Bruch, strukturell unverändert] Fernkampf-Overnight stoppt weiter hart
**Befund (Code verifiziert):** Identisch zu run6. `stopIfOutOfAmmo` → `endCombatOutOfAmmo` (combat.ts:771-778) setzt bei leerem Köcher **`monsterId=null`** — harter Stopp, **kein** Auto-Neustart, **kein** Pause/Resume-nach-Restock. Der dafür nötige `stopReason="outOfAmmo"` existiert weiter **nicht** im shared-Typ (`lastStop.reason` kennt nur `"no_materials" | "inventory_full"`, shared:2282); der Set-Punkt ist in combat.ts:743-744 **nur als Kommentar** angedacht. Köcher unverändert 150 (state.ts:85) → 150 Pfeile = ~61 Kills = ~7 min, danach liegen ~7 h 53 min der 8-h-Nacht brach.
**Wirkung:** Ein reiner Fernkampf-Held verliert ~98 % der Nacht. Fernkampf bleibt der **einzige binär-fatale** Overnight-Stopper; Cross-Stil-Ungleichheit besteht fort.
**Fix (combat-dev/logic-dev):** `outOfAmmo` als echten **Pause-Zustand** (`stopReason`) in shared/persistence/UI verdrahten statt `monsterId=null`; Wiederaufnahme bei Munition im Köcher — analog zum Melee-Selbstheilen. Optional Auto-Restock aus dem Inventar.

### [P2 Perf/UX — strukturell unverändert, Carry-over] Offline-Catch-up friert beim Laden weiter synchron ein (~26 s)
**Befund (Code verifiziert):** `deserialize` ruft `advance(state, content, offlineMs)` unverändert **synchron in einem Rutsch** (persistence:876; 24 h = 864.000 Steps). Kein Worker, kein Batch, **kein Progress-Indikator** — Code-Pfad identisch seit run4/run5/run6.
**Wirkung:** Der Kern-Use-Case dieser Linse (über Nacht/Wochenende liegenlassen) wird beim Start mit einem mehrsekündigen Freeze (~26 s nach langer Abwesenheit) begrüßt, der wie ein Hänger wirkt. Korrektheit ist intakt (deterministisch) — reines Gefühl.
**Fix (logic-dev/ui-dev):** Catch-up in zeit-budgetierte Häppchen mit Ladebalken oder Worker; alternativ die heißen Mengen-Akkumulations-Pfade optimieren.

### [P3 AFK-Signal — Carry-over] no_food löst weiter still-schleifende Tode aus, kein „bring Essen"-Hinweis
**Befund (Code verifiziert):** Unverändert. `tryAutoEat` macht bei `itemCount(food) < 1` weiter lautlos nichts (combat.ts:74); `lastStop.reason` kennt weiter **kein** `no_food` (shared:2282). Geht das Essen aus, kippt der Held in die stille sterben→voll-heilen→sterben-Schleife (Tod-Neustart) statt sauber zu pausieren — die Nacht ist gerettet, aber der `deaths`-Zähler bläht sich auf, ohne Diagnose-Signal.
**Fix (combat-dev/ui-dev):** Optionaler `no_food`-Pause-Stopp + Toast „Essen leer — Kampf pausiert" + Resume nach Restock — **teilt sich den „pausiert-mit-Grund/Resume"-Mechanismus mit P1**.

### [P3 Stat-Sauberkeit — Carry-over aus run6-save] `instanceMade`/Loot-Log nicht an `intake.kept` gekoppelt
**Befund (Code verifiziert):** combat.ts:419-425 setzt `instanceMade=1` (→ `itemsGathered`) sobald `tryCraftSuffix` truthy ist — ungeprüft, ob `res.intake.kept`. Im **Default-Pfad folgenlos** (Vault unbegrenzt → `kept` immer true). Bei aktivem Auto-Salvage würde eine auto-zerlegte Instanz weiter als `instanceMade=1` gebucht → leichte Stat-Unschärfe, **kein Verlust**.
**Fix (combat-dev/logic-dev):** Buchung + Log an `res.intake.kept`/`res.intake.salvage` hängen.

### [P3 AFK-Komfort — Carry-over] Auto-Salvage-Qualitätsschwelle fix verdrahtet, nicht spielerseitig einstellbar
**Befund:** Schwelle hart auf Affix-Tier 1 / Suffix-Roll 1/3 (shared-Konstanten). Sicherer Default, aber kein Min-Maxer-Tuning (keine Mindest-Rarität/Slot-Whitelist in der UI). Kein Fairness-/Verlust-Problem — Komfort-Decke für Power-User („Phase 2").

### [P3 Repo-Hygiene — NEU] Leftover-Temp-Test eines Parallel-Laufs im Repo
**Befund:** `packages/persistence/src/__run7_probe.test.ts` liegt im Repo (Header: „TEMP RUN-7 PROBE — nach Lauf wieder entfernen") — offenbar von einem parallelen Run-7-Tester (Save/Offline-Linse). Es **bestätigt meinen Befund unabhängig** (Popup = Vault-Instanzen + Bank-Stacks, Vault dominant), ist aber ein liegengebliebenes Test-Artefakt. **Ich habe es bewusst nicht gelöscht** (außerhalb meines Read-only-Mandats; ggf. noch laufender Agent). **Empfehlung:** entfernen, bevor an den Chef gemeldet wird.

---

## Engagement-Gefälle: aktiv vs. AFK (Auftrags-Frage)

| Stopper / Sichtbarkeit | run6-AFK-Folge | run7-AFK-Folge | Aktiver Vorteil |
|---|---|---|---|
| **Offline-Loot-Reveal (Vault-Drops)** | **Vault unsichtbar im Popup** ⚠ | **Vault gezählt → voller Reveal** ✅ | — (reiner Anzeige-Gewinn) |
| Loot-Verwaltung (Auto-Salvage AN) | sicher: Top-Rolls bleiben ✅ | unverändert ✅ | manuell salvagen = feiner |
| Instanz-Overflow (Inventar voll) | verlustfrei in den Vault ✅ | unverändert ✅ | aufräumen = mehr Platz |
| **Munition leer (Fernkampf)** | harter Stopp, Rest brach ⚠ | **unverändert** ⚠ (P1) | Nachfüllen → Kampf läuft |
| **Offline-Lade-Freeze** | synchroner Freeze ⚠ | **unverändert** ⚠ (P2) | — |
| Essen leer | still-schleifende Tode ⚠ | unverändert (P3) | Restock → keine Tode |

**Verdikt:** Die **Loot-/Sichtbarkeits-Achse ist jetzt vollständig rund** — sicher (run6) *und* ehrlich angezeigt (run7). Der AFK-Spieler verliert nichts und sieht morgens seinen besten Loot. Es bleiben exakt die **zwei im Auftrag genannten strukturellen Resthebel**: Fernkampf-Munitions-Stopp (P1) und Offline-Freeze (P2).

---

## Δ vs run6

- **run6-save-P2-1 (Offline-Popup zählt Vault nicht) → GEFIXT & empirisch bestätigt.** `inventoryCounts` summiert jetzt `bankInstances` (persistence:825-831); Probe: Popup 4022 (= 3818 Vault + 204 Bank) statt run6-Vaultanteil 0. **Das war der dominante verbleibende „alles wird gezeigt"-Bruch** → die Loot-Achse ist jetzt komplett.
- **run6-P1 (Fernkampf harter Stopp) → UNVERÄNDERT (strukturell).** `endCombatOutOfAmmo` weiter `monsterId=null`; `stopReason="outOfAmmo"` weiter nur Kommentar.
- **run6-P2 (Offline-Freeze) → UNVERÄNDERT (strukturell).** Synchroner `advance` in `deserialize` (persistence:876).
- **run6-P3 (no_food still-Schleife) → UNVERÄNDERT.** Kein `no_food` in `lastStop.reason`.
- **run6-save-P3-1 (instanceMade nicht an intake.kept) → UNVERÄNDERT** (Default folgenlos).
- **Netto Δ ≈ +0,3 (9,0 → 9,3):** Der letzte Loot-Sichtbarkeits-Bruch ist geschlossen (echter Morgen-Reveal-Gewinn). Die zwei strukturellen Resthebel bleiben unangetastet → kein Sprung auf 9,5.

---

## Was fehlt für 9,5?

Genau die **zwei strukturellen Hebel aus dem Auftrag** — beide am Code als unverändert verifiziert — plus ein eleganter Mitnahme-P3:

1. **Fernkampf strukturell heilen, nicht nur puffern** (größter Fairness-Hebel). `outOfAmmo` als **Pause** mit `stopReason` + Wiederaufnahme-nach-Restock statt `monsterId=null`. Der Hook ist in combat.ts:743-744 schon kommentiert, aber nicht in shared/persistence/UI verdrahtet. Beseitigt den letzten binär-fatalen Overnight-Stopper. *(combat-dev/logic-dev)*
2. **Offline-Catch-up entkoppeln** (größter Gefühls-Hebel). Den synchronen ~26-s-Lade-Freeze per Batch+Ladebalken oder Worker beseitigen — der sichtbarste „fühlt-sich-kaputt-an"-Moment im Overnight-Kern-Use-Case. *(logic-dev/ui-dev)*
3. **no_food sauber pausieren statt schleifen** + Toast „Essen leer". Löst sich elegant zusammen mit Hebel 1 über denselben „pausiert-mit-Grund/Resume"-Mechanismus; vermeidet deaths-Inflation. *(combat-dev/ui-dev)*

Mit Hebel 1+2 fällt der letzte binär-fatale Stopper **und** der letzte Lade-Freeze → die Idle-Linse erreicht 9,5+. Hebel 3 ist die Politur obendrauf.

---

## Bottom Line
Run 7 schließt die **letzte Lücke der Loot-Achse**: das Offline-„Während du weg warst"-Popup zählt jetzt den Gear-Vault, womit die wertvollsten Über-Nacht-Drops im Morgen-Reveal endlich sichtbar sind (empirisch 4022 statt vorher 0 Vault-Anteil). Zusammen mit dem schon sicheren Auto-Salvage/Overflow-Fundament ist „nichts geht verloren **und** alles wird gezeigt" wieder vollständig wahr → Idle-Linse **9,3** (von 9,0). **Die Auftrags-Kernfrage ist eindeutig:** Auto-Salvage/Vault ist jetzt rund, und es verbleiben **exakt** die zwei im Auftrag genannten **strukturellen** Resthebel — der Fernkampf-Munitions-Overnight-Stopp (P1) und der synchrone Offline-Catch-up-Freeze (~26 s, P2). Kein P0. Beide Resthebel brauchen Mechanik-Arbeit (Pause/Resume bzw. Lade-Entkopplung), kein Daten-Risiko. *(Hinweis: Stray-Temp-Test `__run7_probe.test.ts` eines Parallel-Laufs liegt noch im Repo — vor der Chef-Meldung entfernen.)*
