# QA Run 6 — Idle-Loop / AFK-Fairness / Overnight-Gefühl

**Tester:** Playtester-Analyst (Idle/AFK/Overnight-Linse) · READ-ONLY (kein Spielcode geändert) · **Datum:** 2026-06-28
**Scope:** Verifikation der run5-Fixes — **Auto-Salvage-Qualitätsfilter** (nicht mehr alles-oder-nichts), **Instanz-Overflow → Gear-Vault** (kein stiller Verlust), **größerer Start-Köcher** (60→150) + Starter-Food/Saat. Dazu Re-Check der Carry-over-Bremsen: Offline-Catch-up-Freeze, Fernkampf-Munition, no_food-Verhalten, Determinismus.
**Methode:** Code-Audit + temporäres Sim-Harness (engine/vitest, **danach entfernt** — `run6-idle.tmp.test.ts` gelöscht, bestätigt). Zahlen empirisch über `advance()`/`intakeInstance()` mit echtem Content (seed-fix). Belegt gegen `enchant.ts`, `shared/index.ts` (`isLowQualityInstance`), `suffix.ts`, `state.ts`, `combat.ts`, `persistence/index.ts` + die neuen Guard-Tests in `enchant.test.ts`.

---

## Fun-Score: **9,0 / 10** (Idle/AFK/Overnight-Linse)  ·  Δ vs run5: **+0,5** (8,5 → 9,0)

**Die zentrale Auftragsfrage ist mit JA beantwortet: Auto-Salvage ist jetzt ein sicherer „an-und-vergessen"-Idle-Komfort.** Der run5-Footgun (Flag AN zerlegt JEDE Instanz, auch Top-Rolls) ist sauber geschlossen. `shouldAutoSalvage` (enchant.ts:357-366) liest nicht mehr nur das Flag, sondern fragt `isLowQualityInstance` (shared:1171-1176): zerlegt wird nur, wenn die Instanz **schwach** ist (Affixe ≤ Tier 1 UND kein/nur schwacher Suffix-Roll < 1/3) — oder wenn das Inventar **voll** ist (Overflow-Fall, lieber zerlegen als die Aktion blockieren). Empirisch über `intakeInstance` bestätigt: Top-Roll bei freiem Platz **bleibt**, Junk **wird zerlegt**, bei vollem Inventar wird auch der Top-Roll zerlegt (gewollter Overflow-Fall). Der AFK-Spieler, der den Komfort einschaltet, verliert über Nacht **nicht** mehr sein bestes Loot — die Funktion ist endlich nutzbar.

Zwei weitere run5-Punkte sind mit erledigt: **Instanz-Overflow geht jetzt verlustfrei in den Gear-Vault** (`intakeInstance`, enchant.ts:314-326; bei vollem Inventar + Auto-Salvage AUS → `bankInstances.push`, `kept:true/vaulted:true`) — 500 Overflow-Drops, **0 verloren**, kein Phantom-Loot. Und das **Starter-Kit** liefert jetzt 3× `graywort_seed` + Food 10→20 (state.ts:97-108), womit das Farm-Layer beim ersten Overnight nicht mehr leer startet.

**Der Score steht bei 9,0 und nicht höher**, weil die zwei am stärksten *gefühlten* Overnight-Bremsen unverändert sind: (1) **Fernkampf-Munition ist nur gepuffert, nicht repariert** — der Köcher wuchs 60→150, aber der Mechanismus ist identisch: leerer Köcher = **harter Stopp** (`endCombatOutOfAmmo`, `monsterId=null`, kein Auto-Neustart, kein Pause/Resume). Gemessen: 150 Pfeile vs Goblin = **61 Kills, Stopp nach ~7 min** — danach liegen **7 h 53 min von 8 h brach**. Für einen reinen Fernkampf-Overnight ist die Nacht weiter zu ~98 % tot; der größere Köcher verschiebt den Stopp nur von ~2,5 min auf ~7 min. (2) Der **Offline-Catch-up friert beim Laden weiter synchron ein** — `deserialize` ruft `advance()` unverändert in einem Rutsch (persistence:869), kein Worker/Batch/Progress.

---

## Belegte Messungen (Sim-Harness, danach entfernt)

| Test | Ergebnis | Bedeutung |
|---|---|---|
| **Auto-Salvage AN, freier Platz, TOP-Roll** (Affix T3 + Suffix-Roll 0,99) | **behalten** (`kept:true`, kein salvage) | Qualitätsfilter schützt Top-Rolls — run5-P2 GEFIXT |
| **Auto-Salvage AN, freier Platz, JUNK** (Affix T1, Roll 0,1) | **zerlegt** (`kept:false`, salvage) | Schwach-Heuristik greift wie spezifiziert |
| **Auto-Salvage AN, VOLLES Inventar, TOP-Roll** | **zerlegt** (Overflow-Fall) | Bewusst: bei vollem Inv lieber zerlegen als blockieren |
| **Auto-Salvage AUS, VOLLES Inventar, TOP-Roll** | **in den Vault** (`vaulted:true`, kein Verlust) | Default-Pfad schützt Loot verlustfrei |
| **Instanz-Overflow** (500 Drops, Inventar voll, Flag AUS) | **500 behalten, Vault 500, 0 verloren** | run5 #1 GEFIXT — kein stiller Verlust offline |
| **Ranged Overnight** (Köcher 150, cracked_bow vs Goblin, 8 h) | **150→0 Pfeile, 61 Kills, harter Stopp nach ~7 min** | Köcher nur gepuffert; Rest der Nacht (7 h 53 min) brach |
| **Offline-Freeze 24 h Woodcutting** | synchron (Code-Pfad **unverändert**, persistence:869) | weiter kein Worker/Batch/Progress (Absolutzahl harness-verzerrt, s. P2) |
| **Determinismus 8 h** (gleicher Seed, 2 Läufe) | `same = true` | Offline = Online weiter bit-identisch |

---

## Stärken (verifiziert)

1. **Auto-Salvage ist sicher geworden** (Kern-Auftragsfrage). `isLowQualityInstance` ist eine reine, deterministische Heuristik (kein RNG/I/O); Schwellen sauber als Konstanten benannt (`AUTO_SALVAGE_MAX_AFFIX_TIER=1`, `AUTO_SALVAGE_SUFFIX_ROLL=1/3`, shared:1156-1163). Label = Verhalten. Default bleibt AUS.
2. **Instanz-Overflow verlustfrei** (`intakeInstance`). Drops/Crafts fließen ausschließlich durch diesen einen Eingang (combat.ts:413, tick.ts:131, suffix.ts:138) → bei vollem Inventar ohne Auto-Salvage in den **unbegrenzten** Gear-Vault statt stummem Verwerfen. Ausgerüstete Instanzen passieren den Eingang nie → kein Doppel-Salvage.
3. **Starter-Kit trägt den ersten Overnight an** (state.ts:97-108): Food 10→20, 3× graywort_seed → Farm-Layer startet beim ersten Mal von allein (run5-P3 adressiert).
4. **Melee/Magie-Overnight bleibt un-deckelbar** (unverändert run4-Fix): `onPlayerDefeated` (combat.ts:517-539) Auto-Neustart, `monsterId` bleibt, keine Tod-Belohnung, Dungeon-Tod bleibt hart.
5. **Determinismus + Offline=Online** unverändert robust; Auto-Eat-gegen-DoT/curesPoison-Pfade unverändert intakt.
6. **Saubere Test-Abdeckung der neuen Pfade** in `enchant.test.ts` (Top-Roll-behalten / Junk-zerlegt / Overflow-zerlegt / Vault-bei-voll) — die Fixes sind guard-getestet, nicht nur eingebaut.

---

## Priorisierte Findings

> **Kein P0.** Ein P1 (Fernkampf strukturell, nur gepuffert), ein P2 (Offline-Freeze, carry-over), zwei P3 (no_food-Signal carry-over, Auto-Salvage-Schwelle nicht konfigurierbar).

### [P1 AFK-Fairness — Stil-Bruch, nur gepuffert] Fernkampf-Overnight stoppt weiter hart — Köcher 150 hält nur ~7 min
**Befund (gemessen):** Der größere Start-Köcher (60→150, state.ts:83-85) ist ein reiner Puffer, **keine** strukturelle Reparatur. Der Stopp-Mechanismus ist identisch zu run5: `stopIfOutOfAmmo` → `endCombatOutOfAmmo` (combat.ts:747-780) setzt **`monsterId=null`** — harter Stopp, **kein** Auto-Neustart, **kein** Pause/Resume-nach-Restock. Empirisch: 150 Pfeile vs Goblin = 61 Kills, Stopp nach **~7 min**; die restlichen **7 h 53 min der 8-h-Nacht liegen brach**. Melee/Magie sind durch den Tod-Neustart praktisch un-deckelbar — Fernkampf bleibt der **einzige binär-fatale** Overnight-Stopper und damit der eklatante Stil-Bruch.
**Wirkung:** Wer einen reinen Fernkampf-Helden über Nacht laufen lässt, verliert ~98 % der Nacht. Der Puffer adressiert das Symptom (Zeitpunkt), nicht die Ursache (fehlende Wiederaufnahme). Cross-Stil-Ungleichheit besteht fort.
**Fix (combat-dev):** Bei leerer Munition in einen **pausierten** Zustand (`stopReason="outOfAmmo"` — im Code bei combat.ts:743-746 schon angedacht, aber „außerhalb des combat-Reviers" = noch nicht in shared/persistence/UI verdrahtet) statt `monsterId=null`; Wiederaufnahme, sobald Munition im Köcher liegt — analog zum Melee-Selbstheilen. Optional: Auto-Restock aus dem Inventar in den ammo-Slot.

### [P2 Perf/UX — CARRY-OVER aus run4/run5] Offline-Catch-up friert beim Laden weiter synchron ein
**Befund:** `deserialize` ruft `advance(state, content, offlineMs)` unverändert **synchron in einem Rutsch** (persistence:869; 24 h = 864.000 Steps). Kein Worker, kein Batch, **kein Progress-Indikator** — der Code-Pfad ist seit run4/run5 identisch. (Hinweis: Die Absolutzahl meines Harness ist diesmal **nicht** mit run5 vergleichbar — ich habe das Sim-Inventar auf 50.000 Slots aufgebläht, was jeden Loot-Tick das Inventar scannen lässt und die Wanduhr künstlich hochtreibt; aussagekräftig ist allein die **unveränderte Mechanik**: synchron, ungebatcht.)
**Wirkung:** Der Kern-Use-Case dieser Linse (über Nacht/Wochenende liegenlassen) wird beim Start weiter mit einem mehrsekündigen Freeze begrüßt, der wie ein Hänger wirkt. Korrektheit ist intakt (deterministisch) — reines Gefühl.
**Fix (logic-dev/ui-dev):** Catch-up in zeit-budgetierte Häppchen mit Ladebalken oder Worker; alternativ die heißen Mengen-Akkumulations-Pfade (`completeAction`-Loot/`addItemOrBank`) optimieren.

### [P3 AFK-Signal — CARRY-OVER aus run5] no_food löst weiter still-schleifende Tode aus, kein „bring Essen"-Hinweis
**Befund:** Unverändert. `tryAutoEat` macht bei `itemCount(food) < 1` weiter lautlos nichts (combat.ts:74); `lastStop`/`stopReason` kennen weiter **kein** `no_food`. Geht das Essen aus, kippt der Held in die stille sterben→voll-heilen→sterben-Schleife (über `onPlayerDefeated`-Neustart) statt sauber zu pausieren — die Nacht ist gerettet, aber der `deaths`-Zähler bläht sich auf und der Spieler bekommt kein Diagnose-Signal.
**Wirkung:** Funktional gerettet, aber unsauber: aufgeblähte Tod-Statistik + fehlendes Signal. Reines Idle-Feinschliff-Thema.
**Fix (combat-dev/logic-dev/ui-dev):** Optionaler `no_food`-Pause-Stopp + Toast „Essen leer — Kampf pausiert" + Wiederaufnahme nach Restock (gemeinsam mit dem Fernkampf-Pause-Pfad aus P1 lösbar — beide brauchen denselben „pausiert mit Grund/Resume"-Mechanismus).

### [P3 AFK-Komfort — NEU, klein] Auto-Salvage-Qualitätsschwelle ist fix verdrahtet, nicht spielerseitig einstellbar
**Befund:** Die Schwelle ist hart auf Affix-Tier 1 / Suffix-Roll 1/3 gesetzt (shared:1156-1163). Gut als sicherer Default — aber ein Min-Maxer, der „zerlege alles bis Rare" oder „behalte alles mit irgendeinem T2-Affix" will, kann die Linie nicht verschieben. Keine Slot-Whitelist/Rarität-Wahl in der UI.
**Wirkung:** Kein Fairness-/Verlust-Problem (Default ist sicher), nur eine Komfort-Decke für Power-User. Bewusst „Phase 2"-Material.
**Fix (logic-dev/ui-dev, optional):** Einstellbare Keep-Regel (Mindest-Rarität / Affix-Tier-Schwelle / Slot-Whitelist) im Settings-Panel.

---

## Engagement-Gefälle: aktiv vs. AFK (Auftrags-Frage)

| Stopper | run5-AFK-Folge | run6-AFK-Folge | Aktiver Vorteil |
|---|---|---|---|
| Tod im Melee/Magie-Kampf | Auto-Neustart → läuft durch ✅ | unverändert ✅ | Restock spart Tod-Schleife |
| **Loot-Verwaltung (Auto-Salvage AN)** | **Footgun: zerlegt Top-Rolls** ⚠ | **sicher: Top-Rolls bleiben, Junk weg** ✅ | manuell salvagen = feiner steuerbar |
| **Instanz-Overflow (Inventar voll)** | (war stiller Verlust / Phantom) | **verlustfrei in den Vault** ✅ | aufräumen = mehr Inventar-Platz |
| Munition leer (Fernkampf) | harter Stopp, Rest brach ⚠ | **harter Stopp, nur ~5 min später** ⚠ (P1) | Nachfüllen → Kampf läuft |
| Essen leer | still-schleifende Tode (Tode↑) | unverändert (P3) | Restock → keine Tode |
| Saat leer (erster Overnight) | Plots still (kein Starter-Saat) | **3× Starter-Saat → Layer startet** ✅ | Nachsäen → Layer lebt länger |

**Verdikt:** Die Loot-Achse (Auto-Salvage + Overflow) ist von „riskant/verlustbehaftet" auf „sicher" gekippt — genau die run5-Empfehlung. AFK = solide. Der **einzige verbleibende binär-fatale** Stopper ist Fernkampf-Munition (P1), jetzt nur zeitlich verschoben.

---

## Δ vs run5

- **run5-P2 (Auto-Salvage alles-oder-nichts) → GEFIXT & empirisch bestätigt.** Qualitätsfilter (`isLowQualityInstance`) schützt Top-Rolls; guard-getestet in `enchant.test.ts`.
- **Instanz-Overflow (latenter stiller Verlust / Phantom-Loot) → GEFIXT.** Verlustfrei in den Gear-Vault; 500 Drops, 0 verloren.
- **run5-P3 (Starter-Saat fehlt) → GEFIXT.** 3× graywort_seed + Food 10→20 im Starter-Kit.
- **run5-P2 (Fernkampf-Munition harter Stopp) → NUR GEPUFFERT (60→150), strukturell UNVERÄNDERT.** Stopp nach ~7 min statt ~2,5 min; kein Pause/Resume → bleibt der binär-fatale Overnight-Stopper (jetzt P1).
- **run5-P2 (Offline-Freeze) → UNVERÄNDERT.** Synchroner `advance` in `deserialize`, kein Worker/Batch/Progress.
- **run5-P3 (no_food still-Schleife, kein Signal) → UNVERÄNDERT.** Kein `no_food` in `lastStop`/`stopReason`.
- **Netto Δ ≈ +0,5 (8,5 → 9,0):** Zwei der vier run5-„9,5-Hebel" sind eingelöst (Auto-Salvage sicher, Starter-Saat) plus der Overflow-Verlust geschlossen. Die zwei am stärksten gefühlten (Offline-Freeze, Fernkampf/no_food sauber pausieren) bleiben.

---

## Was fehlt für 9,5?

Drei Hebel, alle „Politur" statt „Reparatur" — zwei davon Carry-over:

1. **Fernkampf strukturell heilen, nicht nur puffern** (größter Fairness-Hebel). `no_ammo`-**Pause** mit `stopReason` + Wiederaufnahme-nach-Restock statt `monsterId=null` — der Hook ist im Code schon kommentiert (combat.ts:743-746), aber nicht in shared/persistence/UI verdrahtet. Beseitigt den letzten binär-fatalen Overnight-Stopper. *(combat-dev/logic-dev)*
2. **Offline-Catch-up entkoppeln** (größter Gefühls-Hebel). Den synchronen Lade-Freeze nach langer Abwesenheit per Batch+Ladebalken oder Worker beseitigen — der sichtbarste „fühlt-sich-kaputt-an"-Moment im Overnight-Kern-Use-Case. *(logic-dev/ui-dev)*
3. **no_food sauber pausieren statt schleifen** + Toast „Essen leer". Löst sich elegant zusammen mit Hebel 1 über denselben „pausiert-mit-Grund/Resume"-Mechanismus; vermeidet deaths-Inflation und informiert den Spieler. *(combat-dev/ui-dev)*

---

## Bottom Line
Run 6 macht den **einen neuen Idle-Komfort aus run5 endlich sicher**: Auto-Salvage mit Qualitätsfilter behält Top-Rolls (empirisch bestätigt), Instanz-Overflow geht verlustfrei in den Vault, und das Starter-Kit trägt den ersten Overnight (Saat + mehr Food). Damit steigt die Idle-Linse von 8,5 auf **9,0**. Was die 9,5 noch verstellt: der **nur gepufferte, nicht reparierte** Fernkampf-Munitions-Stopp (P1 — 150 Pfeile = ~7 min, dann brach), der unveränderte synchrone Offline-Lade-Freeze (P2) und die still-schleifende statt sauber pausierende no_food-Decke (P3). Kein P0 — das Loot-/Overflow-Fundament ist jetzt idle-sicher; die Restbremsen sind Combat-Pause-Mechanik und Lade-Perf.
