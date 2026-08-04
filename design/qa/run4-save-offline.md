# Run 4 — Save / Migration / Offline-Integrität

**Tester-Persona:** Save/Migration/Offline-Analyst
**Scope:** `packages/persistence` (serialize/deserialize/migrate/sanitize), `packages/shared` (GameState/SAVE_VERSION), `packages/engine` (advance/Offline, farming)
**Datum:** 2026-06-27 · **SAVE_VERSION:** 39 · **Run-Typ:** Re-Test nach Fixes

## Fun-Score 9/10

Save/Offline ist das stabilste Subsystem im Spiel. Die Migrations-Kette ist vollständig,
idempotent und defensiv; der P1-Instanz-Round-Trip-Bug aus Run 3 ist verifiziert behoben.
Abzug nur für zwei reine Reporting-/Härtungs-Kanten (kein Datenverlust, kein Crash bei echten
Saves). Aus Spielergefühl: „weg sein lohnt sich, nichts geht verloren, nichts lässt sich
trivial cheaten" — genau richtig für ein Idle.

---

## Verifikation (Zahlen belegt)

- **Bestandstests:** `vitest run` packages/persistence → **45/45 grün** (1.34s).
- **Eigenes Run-4-Probe-Harness** (7 Zusatz-Checks, danach entfernt) → **7/7 grün**:
  A enchant-11 sind im Content gelöscht · B pre-39-Save mit allen 11 IDs in
  inventory/equip/bagSlots/food/buffs/bank wird sauber geräumt (Slots→null, bank-Key weg,
  copper_ore=3 bleibt, version→39) · C enchant-11 als Instanz in equippedInstances **und**
  bankInstances wird entfernt · D **Suffix** (nicht nur Affix) round-trippt verlustfrei in
  Inventar **und** Vault, nextInstanceSeq=99 erhalten · E Uhr-Rückstellung (savedAt>now) → 0
  Offline · F 30 Tage weg → exakt 24h-Cap (86_400_000ms) · G version=1-Uralt-Save lädt
  crashfrei, version→39.

### Kritische Prüfpunkte — Ergebnis

| Prüfpunkt | Status | Beleg |
|---|---|---|
| Migrations-Kette < 39 lädt crashfrei | ✅ | Defaults für jedes Feld v22→39; G-Probe (v1→39); deserialize kapselt migrate in try/catch → null statt throw |
| 11 entfernte Enchant-Items geräumt (Inv/Equip/Vault/Bank) | ✅ | `DISCARD_IDS` (index.ts:617-629) via `rename()`-Pfad für slots/bagSlots/equipment/food/buffs/bank; Instanzen explizit aus equippedInstances+bankInstances (index.ts:733-738). B+C-Probe |
| Item-Instanzen (Affix **+ Suffix**) round-trippen verlustfrei | ✅ | `sanitizeInstance` erhält instanceId/baseItemId/affixes/suffix strukturvalidiert (index.ts:68-97); Bestandstest „round-trippt Item-Instanzen" + D-Probe (Suffix) |
| equippedInstances + bankInstances + nextInstanceSeq persistent | ✅ | GameState-Felder plain JSON; Bestandstest Z.644-678; nextInstanceSeq via `Math.floor(finiteNonNeg(...))` gehärtet |
| Affixe/Suffixe NICHT gegen Katalog gefiltert (verlustfrei) | ✅ | bewusst nur strukturell validiert (index.ts:62-66) — Content-Umbenennung entkernt keine Instanz; instanceBonusDelta überspringt unbekannte IDs (`if(!def)continue`) |
| Invariante equipment[slot]===instance.baseItemId erzwungen | ✅ | index.ts:144 + 186; verletzte Instanz wird verworfen bzw. zu plain degradiert |
| Offline arithmetisch korrekt | ✅ | gleiche `advance`-Funktion Live+Offline; Akkumulator-Schritte (tick.ts:216-262); Farming `floor(elapsed/growMs)` Mehrfachzyklen verlustfrei (farming.ts:137-162) |
| Offline anti-abuse | ✅ | `Math.min(Math.max(0, now-savedAt), MAX_OFFLINE_MS)` (index.ts:844): Rückwärts-Uhr→0, Vorwärts→24h-Cap. E+F-Probe |
| Kein nicht-serialisierter State (Map/Set/Date/Funktion) | ✅ | GameState durchgängig number/string/bool/array/record; alle `new Set/Map` nur in Helfern, nie im State; petAbilityRuntime sind reine Primitive |

---

## Findings

### P0 — Blocker
*(keine)*

### P1 — Hoch
*(keine)* — der Run-3-P1 „Instanz-Round-Trip verliert Mods" ist behoben & verifiziert.

### P2 — Mittel

- **P2-1 Offline-„Während-du-weg-warst"-Item-Liste unterzählt bei Auto-Bank.**
  `inventoryCounts()` (index.ts:802-808) zählt für die OfflineSummary **nur** `inventory.slots`,
  nicht `state.bank`. Mit `autoBank=true` (Default!) wandern offline gesammelte/gefarmte Items
  bei vollem Inventar direkt ins Lager → tauchen im Popup **nicht** auf, obwohl sie gutgeschrieben
  wurden. Kein Datenverlust (Items sind in der Bank), aber das „Belohnungs-Popup" wirkt leer/zu
  klein und unterschlägt gerade die typischen Langzeit-Idle-Erträge. Fix: Offline-Snapshot über
  Inventar **+** Bank (+ Farm-Yield) bilden.

### P3 — Niedrig / Härtung

- **P3-1 `state.rng` wird nie gedefaultet/validiert.** `migrateState`/`sanitizeState` fassen
  `state.rng` nicht an. `advance()` läuft in `deserialize` (index.ts:851) **außerhalb** des
  migrate-try/catch. Ein hand-korrumpierter Save mit fehlendem/`NaN`-`rng.state` würde dort
  ungefangen werfen bzw. NaN durch RNG-abhängige Pfade (Drops/Combat) propagieren statt sauber
  `null` zurückzugeben. Für echte Saves irrelevant (createGame setzt rng stets), reine
  Korruptions-Härtung. Fix: `rng`-Default + `finiteNonNeg`-Clamp in sanitizeState, oder advance
  in denselben try/catch ziehen.

- **P3-2 OfflineSummary kennt keine Gold-Quelle-Aufschlüsselung & keine Farm-XP getrennt.**
  Rein kosmetisch; aktuell nur aggregiertes gold/xp/items. Nice-to-have fürs Popup.

---

## Δ vs Run 3

- **Behoben (war P1 in Run 3, Enchant/Crafting-Sweep):** Item-Instanzen verloren beim
  serialize/load ihre Affixe/Suffix → jetzt verlustfrei (sanitizeInstance validiert strukturell
  statt gegen Katalog zu filtern). **Verifiziert** (Bestandstest + D-Probe).
- **Neu in Run 4 abgedeckt:** SAVE_VERSION 38→39-Migration (11 Enchant-Festitems via
  generischen Verzauberungstisch ersetzt) — Räumung aus allen sechs Trägern (Inv/Bag/Equip/
  Food/Buffs/Bank) **plus** den beiden Instanz-Speichern. Sauber & idempotent.
- **Stabil seit Run 3:** Offline-Cap/Anti-Abuse, Farming-Offline-Arithmetik, Slayer/Köcher/
  Farming-Migrationen, Security-Sanitize (NaN/Infinity/negativ/unbekannte IDs/Slot-Spoofing).
- **Score:** kein direkter Save/Offline-Score in Run 3 (verteilt auf Subsystem-Reports); diese
  dedizierte Save/Offline-Sicht: **9/10**. Netto-Trend: P1 → 0 offene P1, nur noch 1×P2 + 2×P3.
