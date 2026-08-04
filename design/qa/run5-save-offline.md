# Run 5 — Save / Migration / Offline-Integrität

**Tester-Persona:** Save/Migration/Offline-Analyst
**Scope:** `packages/persistence` (serialize/deserialize/migrate/sanitize), `packages/shared` (GameState/SAVE_VERSION/OfflineSummary), `packages/engine` (advance/Offline, Drop-Suffix-Pfad, Instanz-Intake)
**Datum:** 2026-06-28 · **SAVE_VERSION:** 39 · **Run-Typ:** Re-Test nach Run-4-Fixes + Suffix-Drop-Fokus

## Fun-Score 8/10

Migration, Round-Trip und Anti-Abuse bleiben das stabilste Subsystem im Spiel — die Run-4-Härtung
hält, der Offline-Popup-Bank-Bug (run4-P2-1) ist sauber behoben und verifiziert, Suffix-Instanzen
round-trippen verlustfrei aus **Craft und Drop**. Aber: ein **neuer P1** zieht den Score unter
Run 4. Genau die Sicherheitslogik, die run4-P2-1 für Stacks geradegezogen hat (volles Inventar +
Offline darf nichts verschlucken), fehlt für **Item-Instanzen** — und dort ist es kein bloßer
Zähl-Fehler mehr, sondern **echter Datenverlust**: gerollte Suffix-/Affix-Drops werden bei vollem
Inventar offline vernichtet, obwohl sie als Loot gezählt und geloggt werden. Das verletzt das
Kern-Idle-Versprechen „weg sein lohnt sich, nichts geht verloren" für genau die seltensten,
wertvollsten Drops. Sobald der gefixt ist, ist das Subsystem 9,5-reif.

---

## Verifikation (Zahlen belegt)

- **Bestandstests:** `vitest run` packages/persistence → **47/47 grün** (562 ms). (+2 vs Run 4:
  neuer Bank-Zähl-Test „zählt Offline-Erträge auch aus der Bank (Auto-Bank, P2)" + erweiterte
  Suffix-/Instanz-Round-Trip-Tests.)
- **Eigenes Run-5-Probe-Harness** (engine, danach entfernt) — Drop-Suffix unter vollem vs. leerem
  Inventar, Default-Config (autoBank=true, autoSalvage=false), 20 Kills, Suffix-Chance 1:
  - `[FULL-INV] kills=20 suffixInst_inInv=0 vault=0 bankStack=1 itemsGathered=20`
    → **19 von 20 gerollten Suffix-Instanz-Drops spurlos weg** (nicht im Inventar, nicht im
    Gear-Vault, nicht im Bank-Stack), trotzdem alle 20 als `itemsGathered` verbucht + als Loot
    geloggt.
  - `[EMPTY-INV] kills=20 suffixInst_inInv=19` → Gegenprobe: dieselben Drops werden bei Platz
    als Instanz behalten. Der Unterschied ist allein „Inventar voll".

### Kritische Prüfpunkte — Ergebnis

| Prüfpunkt | Status | Beleg |
|---|---|---|
| Migrations-Kette < 39 lädt crashfrei | ✅ | Defaults für jedes Feld v22→39; deserialize kapselt migrate in try/catch → null statt throw |
| Suffix-Instanzen round-trippen (Craft **+ Drop**) | ✅ | `sanitizeInstance` erhält suffix strukturell (index.ts:84-95), kein Katalog-Filter; Test „round-trippt eine Suffix-Instanz strukturell"; Drop-Pfad erzeugt Suffix-Instanzen (combat.ts:415-428 + drop-suffix-Tests) |
| Affix-Instanzen Inv/Equip/Vault round-trippen | ✅ | Test „round-trippt Item-Instanzen (Inventar, ausgerüstet, Gear-Vault)"; nextInstanceSeq erhalten |
| **Offline-Popup zählt Bank (run4-P2-1)** | ✅ **BEHOBEN** | `inventoryCounts` summiert jetzt `inventory.slots` **+** `state.bank` (index.ts:802-814); Test grün |
| Offline arithmetisch korrekt / Cap / Anti-Abuse | ✅ | `Math.min(Math.max(0, now-savedAt), MAX_OFFLINE_MS)` (index.ts:850); selbe `advance`-Funktion Live+Offline |
| Invariante equipment[slot]===instance.baseItemId | ✅ | index.ts:144 + 186; verletzte Instanz verworfen bzw. zu plain degradiert |
| Kein nicht-serialisierter State (Map/Set/Date/Fn) | ✅ | GameState durchgängig primitiv/array/record; rng=plain `{ state:number }` |
| **Offline-Instanz-Drops überleben volles Inventar** | ❌ **P1** | `addInstance` ohne Vault-/Bank-Overflow (inventory.ts:142-147); Instanz geht verloren statt — wie Stacks via `addItemOrBank` — ins Lager zu fließen. Probe belegt 19/20 Verlust |
| Offline-Popup zählt Gear-Vault (bankInstances) | ⚠️ **P2** | `inventoryCounts` zählt `state.bank`, aber **nicht** `state.bankInstances` |
| `state.rng` gedefaultet/validiert | ⚠️ **P3** | unverändert offen seit Run 4 |

---

## Findings

### P0 — Blocker
*(keine)*

### P1 — Hoch

- **P1-1 (NEU) Suffix-/Affix-Instanz-Drops gehen bei vollem Inventar offline VERLOREN — echter
  Datenverlust.** Im Kill-Loot-Pfad (combat.ts:415-428, derselbe Code läuft im Offline-Catch-up
  via `advance`) erzeugt ein Equipment-Drop mit ~8 % (`DEFAULT_DROP_SUFFIX_CHANCE`) eine
  Suffix-Instanz und schleust sie über `tryCraftSuffix → intakeInstance → addInstance` ins
  Inventar. `addInstance` (inventory.ts:142-147) sucht den ersten freien Slot; **ist keiner frei,
  gibt es `false` zurück und die Instanz wird stillschweigend verworfen** — es gibt für Instanzen
  KEINEN Overflow-in-die-Bank/den-Vault, wie ihn Stacks über `addItemOrBank` (autoBank) haben.
  combat.ts hat `qty -= 1` und `instanceMade = 1` bereits gesetzt, sobald `res` truthy ist
  (egal ob `intake.kept`), also wird die verlorene Instanz zusätzlich noch als `itemsGathered`
  gezählt **und** als Loot ins Combat-Log geschrieben → der Spieler glaubt, er habe sie bekommen.
  - **Default-Config trifft es:** `autoBank=true`, `autoSalvage=false`. Bei langen Idle-Sessions
    läuft das Inventar voll (exakt das Szenario, für das run4-P2-1 die Stack-Auto-Bank rettet) →
    jeder weitere gerollte Suffix-/Affix-Drop ist weg.
  - **Beleg:** Probe `[FULL-INV]` 19/20 verloren (Vault=0, Bank-Stack=1), `[EMPTY-INV]` 19 behalten.
  - **Warum P1 (und nicht P2 wie der run4-Vorgänger):** run4-P2-1 war ein reiner Anzeige-Undercount
    (Items lagen sicher in der Bank). Hier verschwinden die wertvollsten, seltensten Drops
    **wirklich** — und stumm. Das ist der direkte Bruch des Idle-Versprechens.
  - **Fix-Richtung:** `intakeInstance` braucht einen Overflow-Pfad analog `addItemOrBank` — bei
    vollem Inventar + autoBank die Instanz in `bankInstances` (Gear-Vault) ablegen statt verwerfen;
    `instanceMade`/Log nur buchen, wenn die Instanz tatsächlich eingelagert (oder bewusst
    auto-salvaged) wurde. Eigentümer: Inventar/Combat-Logik (nicht Persistence) — aber die
    Auswirkung ist Save/Offline. **Danach P2-1 gleich mitlösen** (sonst landen die geretteten
    Instanzen im Vault und fehlen weiterhin im Popup).

### P2 — Mittel

- **P2-1 Offline-„Während-du-weg-warst"-Popup zählt den Gear-Vault (`bankInstances`) nicht.**
  `inventoryCounts` (index.ts:802-814) summiert jetzt korrekt `inventory.slots` + `state.bank`,
  aber **nicht** `state.bankInstances`. Aktuell maskiert P1-1 das (Instanzen wandern bei vollem
  Inventar gar nicht erst in den Vault, sondern gehen verloren). Sobald P1-1 mit Vault-Overflow
  gefixt ist, würden offline geloggte Instanz-Drops im Popup fehlen — derselbe Undercount, den
  run4-P2-1 für Stacks behoben hat, nur eine Ebene tiefer. Gemeinsam mit P1-1 lösen: Snapshot
  über Inventar + Bank + **Vault** bilden (Instanz-Diff über instanceId, nicht über Menge).

### P3 — Niedrig / Härtung

- **P3-1 (CARRY-OVER, unverändert) `state.rng` wird nie gedefaultet/validiert.**
  `migrateState`/`sanitizeState` fassen `state.rng` nicht an, und `advance()` läuft in
  `deserialize` (index.ts:857) **außerhalb** des migrate-try/catch (Z.842-847). Ein
  hand-korrumpierter Save mit fehlendem/`NaN`-`rng.state` wirft dort ungefangen bzw. propagiert
  NaN durch RNG-Pfade (Drops/Combat), statt sauber `null` zurückzugeben. Für echte Saves
  irrelevant (`createGame` setzt rng stets). Fix: `rng`-Default + `finiteNonNeg`-Clamp in
  sanitizeState, **oder** advance in denselben try/catch ziehen.

- **P3-2 (CARRY-OVER, unverändert) OfflineSummary ohne Gold-Quellen-/Farm-XP-Aufschlüsselung.**
  Rein kosmetisch; aktuell nur aggregiertes gold/xp/items. Nice-to-have fürs Popup.

---

## Δ vs Run 4

- **Behoben & verifiziert (war run4-P2-1):** Offline-Popup unterzählte Auto-Bank-Erträge.
  `inventoryCounts` zählt jetzt Inventar **+** Bank; eigener Test grün. 45→47 Tests.
- **NEU entdeckt (P1-1):** Instanz-Drops gehen bei vollem Inventar offline verloren — kein
  Vault-/Bank-Overflow für Instanzen. Entstand aus derselben Lücke wie run4-P2-1 (Stacks
  abgesichert, Instanzen vergessen), ist aber gravierender: **Datenverlust statt Undercount**.
  Mit Probe belegt.
- **Neu sichtbar (P2-1):** Popup zählt den Gear-Vault nicht — heute von P1-1 maskiert, nach
  dessen Fix relevant.
- **Stabil/bestätigt:** Suffix-Round-Trip Craft **+ Drop** verlustfrei (sanitizeInstance ohne
  Katalog-Filter), Migrationskette v22→39 crashfrei & idempotent, Offline-Cap/Anti-Abuse,
  Security-Sanitize (NaN/Infinity/negativ/unbekannte IDs/Slot-Spoofing), kein nicht-serialisierter
  State.
- **Carry-over offen:** P3-1 (rng), P3-2 (Popup-Aufschlüsselung) — unverändert.
- **Score:** Run 4 = 9. P2 behoben (+), aber ein P1-Datenverlust im Kern-Offline-Szenario
  überwiegt → **8/10**. Netto-Trend: 0 P0, **1 P1 (neu, Datenverlust)**, 1 P2, 2 P3.

---

## Was fehlt für 9,5?

Konkret drei Schritte, in dieser Reihenfolge:

1. **P1-1 fixen (der eine echte Blocker fürs Idle-Versprechen):** `intakeInstance` einen
   Overflow-Pfad analog `addItemOrBank` geben — volles Inventar + `autoBank` ⇒ Instanz in
   `bankInstances` ablegen statt verwerfen. `instanceMade`/Loot-Log in combat.ts nur buchen, wenn
   die Instanz wirklich eingelagert oder bewusst auto-salvaged wurde (kein Phantom-Loot). Guard-Test:
   volles Inventar + Offline-Kill mit Suffix ⇒ Instanz liegt im Vault, `itemsGathered` stimmt.
2. **P2-1 im selben Aufwasch:** Offline-Snapshot über Inventar + Bank + **Vault** bilden, damit die
   geretteten Instanz-Drops im „weg warst"-Popup auch auftauchen (Instanz-Diff über instanceId).
3. **P3-1 abräumen (letzte Korruptions-Härtung):** `state.rng` in sanitizeState defaulten/clampen
   **oder** `advance` in denselben try/catch wie `migrateState` ziehen, damit ein kaputtes rng
   sauber `null` ergibt statt zu werfen.

Mit 1 + 2 ist „nichts geht verloren, alles wird gezeigt" wieder wahr (→ ~9,5); 3 macht die
Crash-Resistenz lückenlos. P3-2 bleibt reines Nice-to-have und ist für 9,5 nicht nötig.
