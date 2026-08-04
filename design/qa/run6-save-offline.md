# Run 6 — Save / Migration / Offline-Integrität

**Tester-Persona:** Save/Migration/Offline-Analyst
**Scope:** `packages/persistence` (serialize/deserialize/migrate/sanitize), `packages/shared` (GameState/SAVE_VERSION/OfflineSummary), `packages/engine` (advance/Offline, Drop-Suffix-Pfad, Instanz-Intake, Gear-Vault-Overflow)
**Datum:** 2026-06-28 · **SAVE_VERSION:** 39 · **Run-Typ:** Re-Test nach Run-5-Fix (Instanz-Drop-Overflow→Vault) + rng-Default

## Fun-Score 9/10

Der **eine echte Datenverlust** aus Run 5 (P1-1: gerollte Suffix-/Affix-Instanzen wurden bei
vollem Inventar offline vernichtet) ist **sauber behoben und mit Probe verifiziert**: `intakeInstance`
hat jetzt einen Overflow-Pfad analog `addItemOrBank` — volles Inventar + `autoBank` ⇒ die Instanz
fließt in den Gear-Vault (`bankInstances`) statt stumm verworfen zu werden. **Kein stiller Verlust**
und **kein Phantom-Loot** mehr: `itemsGathered` stimmt exakt mit dem überein, was tatsächlich
eingelagert wurde. Dazu ist die Korruptions-Härtung erledigt (P3-1: `rng` wird in sanitizeState
gedefaultet/geclampt). Das Kern-Idle-Versprechen „weg sein lohnt sich, **nichts geht verloren**" ist
damit wieder wahr — der Grund, der Run 5 unter Run 4 zog, ist weg.

Was die 9,5 noch hält, ist die **zweite Hälfte des Versprechens — „alles wird gezeigt"**: das
Offline-„Während du weg warst"-Popup zählt den Gear-Vault weiterhin **nicht**. Bisher war das von
P1-1 maskiert (Instanzen landeten gar nicht erst im Vault). Jetzt, wo sie es tun, ist der Undercount
**real und dominant**: in der Probe wandern 3819 offline gerollte Suffix-Instanzen in den Vault, das
Popup meldet davon **null** (nur die ~5 % plain übergelaufenen Stacks). Das ist **kein Datenverlust**
(die Items liegen sicher im Vault und round-trippen verlustfrei) — aber die wertvollsten Offline-Drops
sind im Popup unsichtbar. Sobald das gezählt wird, ist das Subsystem 9,5-reif.

---

## Verifikation (Zahlen belegt)

- **Bestandstests:** `vitest run` packages/persistence → **49/49 grün** (470 ms). (+2 vs Run 5: zwei
  neue rng-Default-Tests „defaultet ein fehlendes rng-Feld beim Laden" + „repariert ein rng mit
  nicht-endlichem state" — index.test.ts:664/675.)
- **Eigenes Run-6-Probe-Harness** (persistence, danach entfernt) — Drop-Suffix unter vollem Inventar,
  Default-Config (autoBank=true, autoSalvage=false), 20 Kills, Suffix-Chance 1 (→ Cap 0.95):
  - `[FULL-INV] kills=20 suffixInst_inInv=0 vault=19 itemsGathered=20`
    → **19 von 19 gerollten Suffix-Instanzen jetzt im Gear-Vault** (Run 5: `vault=0`, 19 verloren),
    der 20. Drop (kein Suffix gefallen) liegt als plain Bank-Stack. `itemsGathered=20` = exakt
    Inv+Bank+Vault, **kein Phantom**.
  - `[ROUNDTRIP] vaultBefore=19 vaultAfter=19 seq 19→19 suffixPreserved={"suffixId":"suffix_bull","ilvl":30,"roll":0.2399…}`
    → Vault-Instanzen überleben serialize/deserialize 1:1, `nextInstanceSeq` erhalten, Suffix
    strukturell unverändert (Craft **+ Drop** verlustfrei).
  - `[POPUP] offlineVaultInstances=3819 offline.items={"test_drop_sword":203}`
    → 1 h Offline mit vollem Inventar: 3819 Suffix-Instanzen in den Vault, **0 davon im Popup**
    (203 = nur die plain übergelaufenen Stacks). Belegt P2-1.

### Kritische Prüfpunkte — Ergebnis

| Prüfpunkt | Status | Beleg |
|---|---|---|
| **Offline-Instanz-Drops überleben volles Inventar** | ✅ **BEHOBEN (war run5-P1)** | `intakeInstance` Overflow→`bankInstances` (enchant.ts:314-326, „Fix run5 #1"); Probe `[FULL-INV]` vault=19 statt 0 |
| **Kein Phantom-Loot** (Count = wirklich eingelagert) | ✅ | `itemsGathered=20` = Inv+Bank+Vault; Vault unbegrenzt → `intake.kept` in Default stets true |
| **`state.rng` gedefaultet/validiert** | ✅ **BEHOBEN (war run5-P3-1)** | sanitizeState clampt rng auf endlich/≥0, sonst `createRng(1)` (index.ts:112-122); 2 neue Tests grün |
| Suffix-Instanzen round-trippen (Craft **+ Drop**) | ✅ | `sanitizeInstance` erhält suffix strukturell ohne Katalog-Filter (index.ts:84-95); Probe `[ROUNDTRIP]` |
| Affix-/Instanz-Round-Trip Inv/Equip/Vault | ✅ | Test „round-trippt Item-Instanzen (Inventar, ausgerüstet, Gear-Vault)" (index.test.ts:684); nextInstanceSeq erhalten |
| Gear-Vault-Sanitize (modifikationslos→plain, unbek. ID raus) | ✅ | index.ts:369-385; Test index.test.ts:773 |
| Migrations-Kette < 39 lädt crashfrei | ✅ | Defaults je Feld; deserialize kapselt migrate in try/catch → null statt throw |
| Offline arithmetisch korrekt / Cap / Anti-Abuse | ✅ | `Math.min(Math.max(0, now-savedAt), MAX_OFFLINE_MS)` (index.ts:862); selbe `advance` Live+Offline |
| Invariante equipment[slot]===instance.baseItemId | ✅ | index.ts:156 + 198; verletzte Instanz verworfen bzw. zu plain degradiert |
| Kein nicht-serialisierter State (Map/Set/Date/Fn) | ✅ | GameState durchgängig primitiv/array/record; rng=plain `{ state:number }` |
| **Offline-Popup zählt Gear-Vault (bankInstances)** | ⚠️ **P2 (jetzt real)** | `inventoryCounts` summiert slots + `state.bank`, **nicht** `state.bankInstances` (index.ts:814-826); Probe `[POPUP]` 3819 unsichtbar |
| `instanceMade`/Loot-Log strikt an `intake.kept` gekoppelt | ⚠️ **P3** | combat.ts:419-422 setzt `instanceMade=1` bei jedem truthy `res` (ignoriert `res.intake.kept`); in Default folgenlos, bei autoSalvage=AN Stat-Unschärfe |

---

## Findings

### P0 — Blocker
*(keine)*

### P1 — Hoch
*(keine — run5-P1-1 behoben & verifiziert)*

### P2 — Mittel

- **P2-1 (CARRY-OVER, jetzt aktiv & dominant) Offline-„Während-du-weg-warst"-Popup zählt den
  Gear-Vault (`bankInstances`) nicht.** `inventoryCounts` (index.ts:814-826) summiert korrekt
  `inventory.slots` + `state.bank`, aber **nicht** `state.bankInstances`. In Run 5 war das von
  P1-1 maskiert (Instanzen wanderten gar nicht erst in den Vault, sie gingen verloren). **Mit dem
  Run-6-Fix wandern sie jetzt dorthin — und fehlen im Popup.** Es ist derselbe Undercount, den
  run4-P2-1 für Stacks behoben hat, nur eine Ebene tiefer (Instanzen statt Stacks).
  - **Beleg:** Probe `[POPUP]` — 1 h Offline bei vollem Inventar: 3819 Suffix-Instanzen in den
    Vault, `offline.items` meldet davon **0** (nur 203 plain Overflow-Stacks).
  - **Kein Datenverlust** (die Instanzen sind im Vault, round-trippen verlustfrei, `itemsGathered`
    stimmt) — rein **Anzeige/Undercount**, deshalb P2 (nicht P1). Aber es trifft genau die
    seltensten/wertvollsten Drops und ist nach dem P1-Fix der sichtbarste verbleibende Bruch des
    „alles wird gezeigt"-Teils.
  - **Fix-Richtung:** Offline-Snapshot über Inventar + Bank + **Vault** bilden. Da `bankInstances`
    Instanzen (kein qty) sind, am robustesten als **Instanz-Diff über `instanceId`** (welche IDs
    sind nach `advance` neu?) und im Popup je `baseItemId` aggregiert dazuzählen — statt sie wie
    Stacks per Menge zu zählen.

### P3 — Niedrig / Härtung

- **P3-1 (NEU, klein) `instanceMade`/Loot-Log nicht strikt an `intake.kept` gekoppelt.**
  combat.ts:419-422 setzt `qty -= 1; instanceMade = 1`, sobald `tryCraftSuffix` truthy ist —
  ungeprüft, ob `res.intake.kept`. In **Default-Config folgenlos** (Vault ist unbegrenzt → `kept`
  ist immer true). Sobald aber `autoSalvage=AN` ist, wird eine **auto-zerlegte** Instanz weiterhin
  als `instanceMade=1`/Loot gebucht, obwohl sie nicht als Instanz behalten, sondern zu
  Basis-Item+Schrott verwertet wurde (deren `addItemOrBank`-Ertrag wird zudem nicht in
  `itemsGathered` gezählt) → leichte Stat-/Log-Unschärfe, **kein Verlust**. Sauber wäre, Buchung +
  Log an `res.intake.kept`/`res.intake.salvage` zu hängen. Run5-P1-Fix-Direction hatte das bereits
  als Soll genannt; im Default-Pfad reicht der heutige Stand.

- **P3-2 (CARRY-OVER) OfflineSummary ohne Gold-Quellen-/Farm-XP-Aufschlüsselung.** Rein kosmetisch;
  aktuell nur aggregiertes gold/xp/items. Nice-to-have, für 9,5 nicht nötig.

> **Erledigt seit Run 5:** P3-1 (rng-Default) — siehe oben, sanitizeState clampt `rng` jetzt
> (index.ts:112-122), 2 neue Tests grün.

---

## Δ vs Run 5

- **Behoben & verifiziert (war run5-P1-1, Datenverlust):** Instanz-Drops bei vollem Inventar offline.
  `intakeInstance` hat jetzt Vault-Overflow analog `addItemOrBank` (enchant.ts:314-326). Probe:
  `vault=19` statt `vault=0` — **0 Verlust**, `itemsGathered=20` exakt (kein Phantom).
- **Behoben & verifiziert (war run5-P3-1, Härtung):** `state.rng` wird in sanitizeState
  gedefaultet/geclampt (index.ts:112-122). 47→49 Tests.
- **Promoted zu aktiv (P2-1):** Popup zählt den Vault nicht — in Run 5 von P1-1 maskiert, jetzt der
  dominante verbleibende Punkt. Mit Probe belegt (3819 vs. 203).
- **Neu (klein, P3-1):** `instanceMade`/Log nicht an `intake.kept` gekoppelt — im Default folgenlos.
- **Stabil/bestätigt:** Suffix-Round-Trip Craft **+ Drop** verlustfrei, Vault-Sanitize
  (modifikationslos→plain), Migrationskette v22→39 crashfrei & idempotent, Offline-Cap/Anti-Abuse,
  Security-Sanitize (NaN/Infinity/negativ/unbekannte IDs/Slot-Spoofing), kein nicht-serialisierter State.
- **Score:** Run 5 = 8 (1 P1-Datenverlust). P1 behoben **und** P3-1 behoben → **9/10**. Was die 9,5
  noch hält, ist allein P2-1 (Popup-Undercount des Vaults — Anzeige, kein Verlust). Netto-Trend:
  **0 P0, 0 P1**, 1 P2, 2 P3.

---

## Was fehlt für 9,5?

Genau ein substanzieller Schritt, dann zwei Aufräumer:

1. **P2-1 fixen (der einzige Punkt zwischen heute und 9,5):** Offline-Snapshot über Inventar + Bank
   + **Vault** bilden, damit die jetzt geretteten Instanz-Drops im „weg warst"-Popup auftauchen.
   `inventoryCounts` (index.ts:814-826) zusätzlich über `state.bankInstances` laufen lassen — als
   **Instanz-Diff über `instanceId`** (neu vs. vor `advance`), je `baseItemId` aggregiert. Guard-Test:
   volles Inventar + Offline-Kill mit Suffix ⇒ die Instanz erscheint in `offline.items`.
   *(Probe zeigt heute 3819 unsichtbar — danach sichtbar.)*
2. **P3-1 mitnehmen (sauberer Default-Pfad):** `instanceMade`/Loot-Log in combat.ts:419-422 an
   `res.intake.kept`/`res.intake.salvage` koppeln, damit auch bei aktivem Auto-Salvage Count und Log
   exakt sind. Im heutigen Default folgenlos, aber macht das Subsystem lückenlos korrekt.
3. **P3-2 bleibt Nice-to-have** (Gold-/XP-Aufschlüsselung im Popup) — für 9,5 nicht nötig.

Mit Schritt 1 ist „nichts geht verloren **und** alles wird gezeigt" wieder vollständig wahr (→ ~9,5).
Schritt 2 schließt die letzte Stat-Unschärfe. „Nichts geht verloren" ist mit dem Run-6-Fix **bereits
erfüllt** — das ist der große Sprung von 8 auf 9.
