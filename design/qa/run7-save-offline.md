# Run 7 — Save / Migration / Offline-Integrität

**Tester-Persona:** Save/Migration/Offline-Analyst
**Scope:** `packages/persistence` (serialize/deserialize/migrate/sanitize, `inventoryCounts`/OfflineSummary), `packages/shared` (GameState/SAVE_VERSION/OfflineSummary), `packages/engine` (advance/Offline, Drop-Suffix-Pfad, Instanz-Intake/Vault-Overflow)
**Datum:** 2026-06-28 · **SAVE_VERSION:** 39 · **Run-Typ:** Re-Test nach Run-6-Fix (R5: Offline-Popup zählt jetzt `bankInstances`)

## Fun-Score 9,5/10

Der **einzige** Punkt, der Run 6 unter 9,5 hielt — das Offline-„Während du weg warst"-Popup
**zählte den Gear-Vault (`bankInstances`) nicht** (run6-P2-1) — ist **sauber behoben und mit Probe
verifiziert**. `inventoryCounts` (index.ts:825-831) summiert jetzt zusätzlich zu `inventory.slots`
+ `state.bank` auch `state.bankInstances`, je `baseItemId` aggregiert (eine Instanz = ein Exemplar).
Die Offline-Differenz `itemsAfter − itemsBefore` greift damit die offline gevaulteten Instanz-Drops
auf. In meiner Probe (1 h offline, volles Inventar, garantierter Equipment-Drop mit Suffix) wandern
**2806 Suffix-Instanzen in den Vault** — das Popup meldet sie jetzt **alle**, zusammen mit den ~5 %
plain übergelaufenen Stacks (140), also **leather_helm: 2946 = 2806 Vault + 140 Bank**. Vor dem Fix
hätte das Popup hier **nur 140** gezeigt (Vault unsichtbar). Damit ist beide Hälften des Idle-
Versprechens wieder wahr und verifiziert: **„nichts geht verloren UND alles wird gezeigt"** — die
wertvollsten Offline-Drops (gerollte Gear-Instanzen) sind sichtbar, ohne Datenverlust, mit sauberem
Round-Trip.

Was den Score knapp **unter die volle 10** und „nur" auf 9,5 hält, ist nicht mehr funktional, sondern
**Regressionsschutz + zwei Politur-Punkte**: Der Fix ist **ohne eigenen Guard-Test** gelandet (die
Suite blieb bei 49 Tests — derselbe Stand wie Run 6). Eine so frisch reparierte Anzeige ohne
Regressionstest kann später still zurückbrechen. Dazu zwei unveränderte Carry-over-P3 (instanceMade
nicht strikt an `intake.kept` gekoppelt; OfflineSummary ohne Quellen-Aufschlüsselung).

---

## Verifikation (Zahlen belegt)

- **Bestandstests:** `vitest run` packages/persistence → **49/49 grün** (≈465 ms). **Unverändert
  gegenüber Run 6** — d. h. der Popup-Vault-Fix kam **ohne neuen Guard-Test** (siehe P2-1).
- **Eigenes Run-7-Probe-Harness** (persistence, danach entfernt) — geklonter Content, Goblin-Loot auf
  garantierten Equipment-Drop (`leather_helm`, `chance:1`, `suffixChance:1`) gesetzt, Default-Settings
  (autoBank=true, autoSalvage=false), Inventar randvoll, 1 h offline via serialize→deserialize:
  - `[SANITY] kills(60s)=47 vaultProbe=44` → Spieler killt, Instanzen fließen in den Vault.
  - `[POPUP] offlineNewVaultInstances=2806 newBankStacks=140 popup.leather_helm=2946`
    → **alle 2806 gevaulteten Instanz-Drops im Popup sichtbar** (+140 plain Overflow-Stacks).
    `2946 = 2806 + 140`, exakt. **Vor dem Fix wäre das Popup nur 140 gewesen** (Vault unsichtbar) —
    das ist der run6-P2-1-Bruch, jetzt behoben.
  - `[ROUNDTRIP] vaultAfter1=2806 vaultAfter2=2806 offlineMs=0 suffix={"suffixId":"suffix_boar","ilvl":1,"roll":0.6247…} seqAfter=2806`
    → Vault-Instanzen überleben serialize/deserialize 1:1, **kein zweiter Offline-Lauf**
    (offlineMs=0), Suffix strukturell unverändert, `nextInstanceSeq` stabil. **0 Verlust, kein
    Phantom.**

### Kritische Prüfpunkte — Ergebnis

| Prüfpunkt | Status | Beleg |
|---|---|---|
| **Offline-Popup zählt Gear-Vault (`bankInstances`)** | ✅ **BEHOBEN (war run6-P2-1)** | `inventoryCounts` summiert jetzt auch `state.bankInstances` je `baseItemId` (index.ts:825-831); Probe `[POPUP]` 2806 sichtbar statt 0 |
| **Popup vollständig** (Vault + Bank + Inventar) | ✅ | Probe: `popup=2946 = vault 2806 + bank 140`, exakt |
| **Kein Datenverlust / kein Phantom** | ✅ | `[ROUNDTRIP]` Vault 2806→2806, Suffix erhalten, `nextInstanceSeq` stabil, offlineMs=0 |
| Offline-Instanz-Drops überleben volles Inventar | ✅ (run5/6) | `intakeInstance` Overflow→`bankInstances` (enchant.ts:317-329); Probe `vaultProbe=44` |
| Suffix-Instanzen round-trippen (Craft **+ Drop**) | ✅ | `sanitizeInstance` erhält suffix strukturell; Probe `suffix_boar` 1:1 |
| Gear-Vault-Sanitize (modifikationslos→plain, unbek. ID raus) | ✅ | index.ts:369-385; Tests index.test.ts:773/739 |
| `state.rng` gedefaultet/validiert | ✅ (run6) | sanitizeState clampt rng (index.ts:112-122) |
| Migrationskette < 39 lädt crashfrei & idempotent | ✅ | deserialize kapselt migrate in try/catch → null statt throw |
| Offline arithmetisch korrekt / Cap / Anti-Abuse | ✅ | `Math.min(Math.max(0, now-savedAt), MAX_OFFLINE_MS)` (index.ts:869) |
| Kein nicht-serialisierter State (Map/Set/Date/Fn) | ✅ | GameState durchgängig primitiv/array/record |
| **Guard-Test für den Popup-Vault-Fix** | ⚠️ **P2 (Regressionsschutz fehlt)** | Suite 49/49 = unverändert vs Run 6; einziger Offline-Popup-Test deckt nur Bank-**Stacks** ab (index.test.ts:67-83) |
| `instanceMade`/Loot-Log strikt an `intake.kept` gekoppelt | ⚠️ **P3 (carry-over)** | combat.ts:419-422 setzt `instanceMade=1` bei jedem truthy `res` (ignoriert `res.intake.kept`); in Default folgenlos |

---

## Findings

### P0 — Blocker
*(keine)*

### P1 — Hoch
*(keine — run6-P2-1 war eine Anzeige, kein Verlust; jetzt behoben)*

### P2 — Mittel

- **P2-1 (NEU, Regressionsschutz) Der Popup-Vault-Fix ist ohne eigenen Guard-Test gelandet.**
  Die persistence-Suite ist **49/49 — exakt der Stand aus Run 6**, d. h. zur 7-Zeilen-Änderung in
  `inventoryCounts` (index.ts:825-831) kam **kein Regressionstest**. Der einzige bestehende
  Offline-Popup-Test (index.test.ts:67-83, „zählt Offline-Erträge auch aus der Bank") deckt nur
  plain Bank-**Stacks** (`normal_log`) ab — **nicht** den Instanz-/Vault-Pfad. Genau der eben
  reparierte Bruch ist damit ungeschützt und kann still zurückfallen (z. B. wenn jemand den
  Snapshot-Diff umbaut).
  - **Beleg:** Suite unverändert 49; mein Probe-Harness (extern, danach entfernt) ist der einzige
    Nachweis, dass `[POPUP] 2806` sichtbar ist — im Repo sichert das **nichts** ab.
  - **Kein Live-Defekt** (die Funktion ist verifiziert korrekt), deshalb P2 statt P1. Aber für einen
    *stabil* gehaltenen 9,5-Stand ist der Guard-Test das eine fehlende Stück.
  - **Fix-Richtung:** Test analog index.test.ts:67-83, aber mit Equipment-Drop + erzwungenem Suffix
    bei vollem Inventar (mein Harness ist die Vorlage): erwarte `offline.items[gearId] > 0` **und**
    `=== neueVaultInstanzen + neueBankStacks`.

### P3 — Niedrig / Härtung

- **P3-1 (CARRY-OVER, unverändert) `instanceMade`/Loot-Log nicht strikt an `intake.kept` gekoppelt.**
  combat.ts:419-422 setzt `qty -= 1; instanceMade = 1`, sobald `tryCraftSuffix` truthy ist —
  ungeprüft, ob `res.intake.kept`. In **Default-Config folgenlos** (Vault unbegrenzt → `kept` immer
  true). Bei `autoSalvage=AN` wird eine auto-zerlegte Instanz weiterhin als `instanceMade=1`/Loot
  gebucht → leichte Stat-/Log-Unschärfe, **kein Verlust**. Sauber wäre Buchung + Log an
  `res.intake.kept`/`res.intake.salvage`.

- **P3-2 (NEU, klein, Folge des count-basierten Diffs) Popup-Undercount-Kante bei `autoSalvage=AN`.**
  Der Fix zählt den Vault **count-basiert je `baseItemId`** (Differenz vor/nach `advance`), nicht
  per `instanceId`. Solange offline nur Instanzen *dazukommen* (Default-Pfad), ist das exakt. Verlässt
  aber im selben Offline-Fenster eine Vault-Instanz desselben `baseItemId` den Vault (theoretisch via
  Auto-Management), während neue desselben Typs ankommen, netten sich die Counts → leichter
  Undercount. Im aktuellen `advance`-Pfad entfernt nichts aus dem Vault → heute **folgenlos**; der
  in run6 vorgeschlagene `instanceId`-Diff wäre robuster, ist aber für 9,5 nicht nötig.

- **P3-3 (CARRY-OVER) OfflineSummary ohne Gold-Quellen-/Farm-XP-Aufschlüsselung.** Rein kosmetisch;
  aktuell nur aggregiertes gold/xp/items. Nice-to-have, für 9,5 nicht nötig.

---

## Δ vs Run 6

- **Behoben & verifiziert (war run6-P2-1, der einzige 9,5-Blocker):** Offline-Popup zählt jetzt den
  Gear-Vault. `inventoryCounts` summiert `bankInstances` je `baseItemId` (index.ts:825-831). Probe:
  `popup.leather_helm=2946` (= 2806 Vault + 140 Bank) statt vorher nur ~140 → **Vault jetzt
  sichtbar**.
- **Neu (P2-1, Regressionsschutz):** Der Fix kam **ohne Guard-Test** (Suite 49 = unverändert). Das
  ist jetzt der sichtbarste verbleibende Punkt — kein Live-Defekt, aber ungesichert.
- **Neu (P3-2, klein):** count-basierter Diff hat eine theoretische Undercount-Kante bei
  `autoSalvage=AN` (heute folgenlos).
- **Carry-over unverändert:** P3-1 (`instanceMade` nicht an `intake.kept`), P3-3 (keine
  Quellen-Aufschlüsselung).
- **Stabil/bestätigt:** Instanz-Drop-Overflow→Vault (run5/6-Fix), Suffix-Round-Trip Craft **+ Drop**
  verlustfrei, Vault-Sanitize, Migrationskette v22→39 crashfrei & idempotent, rng-Default/Clamp,
  Offline-Cap/Anti-Abuse, Security-Sanitize, kein nicht-serialisierter State.
- **Score:** Run 6 = 9,0 (1 P2: Popup-Undercount). P2-1 behoben & verifiziert → **9,5/10**.
  Netto-Trend: **0 P0, 0 P1, 1 P2 (Regressionsschutz statt Live-Defekt), 3 P3**. Die Qualität des
  einen verbleibenden P2 hat sich von „sichtbarer Funktionsbruch" zu „fehlender Test für korrekt
  laufende Funktion" verbessert.

---

## Was fehlt für 9,5?

**Funktional: nichts — 9,5 ist erreicht.** „Nichts geht verloren **und** alles wird gezeigt" ist
wieder vollständig wahr und mit Probe belegt (`[POPUP] 2806` sichtbar, `[ROUNDTRIP]` verlustfrei).
Der eine substanzielle Schritt aus dem Run-6-Bericht (Popup zählt den Vault) ist erledigt.

Um 9,5 **abzusichern** (und Richtung 9,5+ zu gehen), bleibt nur Aufräumen — keine Pflicht für die
9,5 selbst:

1. **P2-1: Guard-Test nachziehen** (der einzige Punkt, der den 9,5-Stand *sichert*). Test in
   index.test.ts analog 67-83, aber Equipment-Drop + erzwungener Suffix bei vollem Inventar:
   `offline.items[gearId] > 0` und `=== neueVaultInstanzen + neueBankStacks`. Mein entferntes
   Probe-Harness ist die fertige Vorlage. Damit ist der frisch reparierte Pfad gegen stille
   Regression geschützt und die Suite geht 49→50.
2. **P3-1 mitnehmen:** `instanceMade`/Loot-Log in combat.ts:419-422 an `res.intake.kept`/`salvage`
   koppeln — schließt die Stat-Unschärfe bei aktivem Auto-Salvage. Im Default folgenlos.
3. **P3-2/P3-3 bleiben Nice-to-have** (instanceId-basierter Diff; Gold-/XP-Aufschlüsselung) — für
   9,5 nicht nötig.

Für die **9,5+/10** (volle Bombensicherheit) würde ich Schritt 1 als nicht-verhandelbar sehen: ein
verifizierter, aber untestierter Fix ist genau die Art Stelle, an der ein späterer Refactor unbemerkt
zurückbricht.
