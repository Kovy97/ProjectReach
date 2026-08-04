# Sweep 2 — Robustheit / Crash-Hunt Runde 2 (Kontrolleur, 2026-07-01)

**Fokus:** Adversariales SimPlayer/Engine-Treiben, tiefere Edge-Cases als Runde 1 — verkettete
illegale Aktionen, Save/Load-Fuzz über EXTREME States, Köcher-/Ammo-Grenzfälle (9999-Stacks, leerer
Köcher, falsche Sorte, Teil-Rückgabe), Equip/Unequip-Ketten (Dupe/Verlust), NaN-Guards, Bank/
Inventar-Overflow bei 9999-Ammo. **Ziel:** nichts crasht, nichts korrumpiert dauerhaft.

**Methode:** Zwei temporäre Vitest-Skripte gegen die ECHTEN Engine-Funktionen (SimPlayer +
createGame/advance/equip/unequip/buy/sell/deposit/withdraw + serialize/deserialize). Nach dem Lauf
gelöscht (wie im Briefing verlangt). Baseline vorher grün verifiziert: die Runde-1-Datei
`packages/persistence/src/robustness-sweep.test.ts` (12/12), `ammo-quiver` + `equip-dataloss` (14/14).

---

## Findings

### [P3][bug] `activePlayMs` wird beim Sanitize NICHT auf `elapsedMs` geklemmt — CONFIRMED
**Owner-Fix:** logic-dev (Persistenz/Sanitize)

Der defensive Lade-Pass härtet `activePlayMs` nur über `finiteNonNeg` (endlich, ≥0), erzwingt aber
NICHT die logische Invariante `activePlayMs ≤ elapsedMs`. Jeder andere gepaarte Timer wird gehärtet,
dieser fällt durchs Netz: ein manipulierter/beschädigter Save mit positiv-großem `activePlayMs`
überlebt das Laden unverändert → die angezeigte „Spielzeit" (Menü-Summary + Stats-Seite) wäre absurd
groß.

- **Repro (minimal, valider v44-Save):**
  1. `createGame(...)`, `advance(60_000)` → `elapsedMs=60000`, `activePlayMs=60000`.
  2. `state.activePlayMs = 5e18` (positiv, endlich — kein NaN/negativ).
  3. `serialize` → `deserialize`.
- **Erwartet:** `activePlayMs` auf `elapsedMs` (60000) geklemmt, Gap ≤ 0.
- **Tatsächlich:** `activePlayMs = 5e18` bleibt bestehen; Gap = `+4.999…e18`.
- **Evidence:** `packages/persistence/src/index.ts:302`
  `state.activePlayMs = finiteNonNeg(state.activePlayMs, 0);` — es fehlt ein
  `Math.min(elapsedMs, …)` (analog zur `farmPlots.plantedAtMs`-Klemmung auf `elapsedMs` in
  Zeile 319, oder zum best-effort `activePlayMs = elapsedMs` der v43→44-Migration in Zeile 830).
- **Warum nur P3 (nicht höher):** Kein Crash, kein NaN, keine Gameplay-Korruption; der Wert ist rein
  kosmetisch (Anzeige der gespielten Zeit). In LEGITIMEM Spiel unerreichbar — `activePlayMs` wächst
  nur im Live-Tick, `elapsedMs` im Live- UND Offline-Tick, also gilt `activePlayMs ≤ elapsedMs`
  immer; die v43→44-Migration setzt Gleichstand. Nur ein hand-editierter/korrupter Save trifft die
  Lücke. Bemerkenswert v.a., weil der Runde-1-Test diese Invariante SELBST als hart definiert
  (`robustness-sweep.test.ts` invariants: `activePlayMs > elapsedMs + 1`), der Sanitize sie aber
  nicht erzwingt — Inkonsistenz zwischen Test-Erwartung und Härtung.
- **Fix-Skizze (1 Zeile):** nach Zeile 302
  `state.activePlayMs = Math.min(state.activePlayMs, state.elapsedMs);`

---

## Robust bestätigt (kein Bug — Regressions-/Härtungs-Nachweis)

Alle folgenden adversarialen Angriffe liefen sauber: kein Crash, kein persistiertes NaN, keine
Duplikation/Vernichtung, alle Caps eingehalten.

- **Verkettete illegale Aktionen (in/außer Kampf):** 40× durchgeschüttelte Kette aus
  equip(unbekannt)/unequip(leer)/buy/sell/deposit(unbekannt)/startCombat(unbekannt)/setAction
  (unbekannt) + Equip/Sammeln mitten im Kampf → 0 Exceptions, State bleibt perfekt invariant.
- **Equip/Unequip-Ketten — Erhaltungssatz:** 600 zufällige equip/unequip/move-Ops über ein
  gemischtes Set (2H↔Schild, Ringe ring1→ring2, Werkzeuge tool1/tool2, 4 Ammo-Sorten). Jedes Item
  exakt erhalten (Inventar+Equipment+Köcher+Bank+Vault), keine Dupe, kein Verlust; periodische
  Invarianten-Checks grün. Der bereits gefixte Datenverlust-Schutz (`stowEquipped`-Rückgabe-Prüfung)
  greift zuverlässig.
- **Köcher/Ammo-Grenzfälle:**
  - 9999-Stacks: 3× 9999 (=29997) equippen → ammoCount 29997, Inventar komplett geleert; Nachfüllen
    (+5000) akkumuliert korrekt auf 34997.
  - **Teil-Rückgabe beim UNEQUIP** (der `ammoCount = amount − added`-Zweig): riesiger Köcher (25000)
    in fast-volles Inventar (1 freier Slot) → nur 9999 wandern zurück, Rest (15001) bleibt im Köcher,
    Slot bleibt belegt, Erhaltungssatz exakt (25000 gesamt).
  - Leerer Köcher / falsche Sorte im Kampf: Kampf stoppt sauber (`outOfAmmo`), falsche Munition wird
    NICHT verbraucht (500→500), keine HP/NaN-Korruption. (Bestätigt Runde-1-/`ammo-quiver`-Fixes.)
- **NaN/Infinity-Guards (neu):** NaN/±Infinity durch give/buy/sell/deposit/advance sind No-ops;
  Inventar-, Gold-, Bank-Bestand + Akkumulator bleiben endlich & unverändert. (Verifiziert; nicht als
  neuer Bug gemeldet — war der „NaN-Guards auf Roh-Primitiven"-Fix.)
- **Save/Load-Fuzz über EXTREME States:** Kitchen-Sink-Korruption eines ursprünglich validen States
  (gold −999999, hp NaN, mana Infinity, accumulator 9e18, elapsed −100, bankSlotsPurchased 999999,
  nextInstanceSeq NaN, Skill-XP NaN/negativ, Inventar mit unbekannten IDs + NaN/negativ qty +
  4000-Slot-Überlänge, Bank mit unbekanntem Key + 5e12 + negativ, Köcher-Desync ammoCount 5e12 auf
  UNBEKANNTE Munition, Kampf mit enemyHp NaN + 50000-Zeilen-Log) → heilt vollständig: alle harten
  Invarianten sauber, Köcher-Desync korrekt auf ammoCount 0 zurückgesetzt, idempotent (2× Roundtrip
  bit-identisch). (Einzige Restbeobachtung = das P3-Finding oben.)
- **ammoCount ≫ Cap:** 9e15 mit gültiger Munition → auf 1e9 (QTY_HARD_CAP) geklemmt, Invariante hält.
- **Bank-Overflow mit 9999-Ammo:** Bank bis Kapazität mit 9999er-Ammo-Stacks + falsche Munition im
  Köcher → Roundtrip sauber & idempotent, Bank-Slots ≤ Kapazität.
- **8h+ Offline-Nachholen** auf mid-combat (ranged) UND mid-gather States → kein Crash, `offlineMs`
  korrekt auf `MAX_OFFLINE_MS` gedeckelt, Ergebnis endlich & invariant.
- **Farm-Plots-Fuzz:** Zukunfts-/NaN-`plantedAtMs`, unbekannte Crop/readyItem → geheilt, kein
  Negativ-Wachstum (`plantedAtMs ≤ elapsedMs`), alles endlich.
- **Huge-Ammo-Withdraw (kein Hang/Dupe):** 500.000 Ammo aus der Bank abheben terminiert in 38 ms,
  füllt Inventar exakt auf Kapazität (199980), Rest bleibt in der Bank, Gesamtmenge erhalten.
- **Müll-Saves:** leerer/abgeschnittener/strukturell kaputter JSON → `deserialize` gibt `null`
  (Vertrag „beschädigt ⇒ null"), wirft nie.

---

## Kurz-Zusammenfassung

- **P0:** 0 · **P1:** 0 · **P2:** 0 · **P3:** 1 (confirmed)
- Keine Crashes, keine Korruption, keine Dupe/Verlust-Pfade gefunden. Die Engine ist gegen
  adversariale Eingaben, Cap-Overflow, Köcher-Grenzfälle und Save/Load-Fuzz sehr robust.

**Top-3:**
1. **[P3][bug] `activePlayMs` nicht auf `elapsedMs` geklemmt** (`persistence/index.ts:302`) — 1-Zeilen-
   Fix (logic-dev); rein kosmetisch, korruptions-only.
2. **(Positiv)** Equip/Unequip-Erhaltungssatz über 600 Zufalls-Ops hält exakt — Datenverlust-Schutz
   solide.
3. **(Positiv)** Köcher-Teil-Rückgabe beim Unequip + Sortenwechsel-Rollback erhalten Munition exakt;
   NaN-Guards greifen durchgängig.

**Empfehlung:** ship — das einzige Finding ist ein P3-Kosmetik-Härtungspunkt (nur bei manipulierten
Saves relevant), kein EA-Blocker. Optional als 1-Zeilen-Härtung mitnehmen.
