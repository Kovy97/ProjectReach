# Sweep 6 — T7: Persistenz-Foltertest vor Release

**Tester:** Sweep-6-Agent T7 (Kontrolleur-Rolle) · **Datum:** 2026-07-03 · **Modus:** headless, read-only
**Harness:** Wegwerf-Tests `packages/persistence/src/_tmp_s6t7_{helpers,migration,roundtrip,offline,transients}.{ts,test.ts}` — 41 Tests, alle grün nach Kalibrierung; Harness nach dem Sweep GELÖSCHT (dieses Dokument ist die einzige Hinterlassenschaft).

## Verdikt

**Persistenz ist release-tauglich.** Migrations-Kette v40→v49 verlustfrei und invariantenfest, Roundtrip über 20 Fuzz-Spielstände verlustfrei (bis auf dokumentierte Kampf-Transienten), Offline-Rechnung korrekt gedeckelt und tod-sicher. Vier Findings, davon **kein P1/P2** — zwei P3 (Reload-Cooldown-Skip; Offline-Regen-Buff-Untervergabe) sind Kandidaten für einen späteren Polish-Pass, kein Release-Blocker.

---

## (a) Migrations-Ketten: synthetische Alt-Saves v40/v43/v45/v46/v47/v48 → v49 ✅

Reichhaltiger Referenz-State (Skills, volle Ausrüstung inkl. **Ring in ring2**, Tool, Köcher 120 Pfeile, Instanzen in equippedInstances/bankInstances/Inventar-Slot, Buff, laufender Kampf mit Bleed-DoT + Pet-Schild, bepflanzter Farm-Plot, angeschlagene HP) je Version schema-getreu „gealtert" (Felder entfernt, HP ×10 vor 46, Attribute 5er-Skala vor 47 / 2.5er in 47) und via `deserialize` geladen. **Alle Invarianten halten für alle 6 Versionen:**

- **Kein NaN/Infinity** im gesamten geladenen State (rekursiver Scan).
- **hp ≤ maxHp** (computeStats-basiert), HP-Squish ÷10 auf ±1 Rundung genau.
- **Equipment-Slots engine-konsistent** (slot-Match; ring1-Ring in ring2 ÜBERLEBT — die alte P1-Datenverlust-Regression bleibt gefixt; Tools/Ammo slotlos korrekt).
- **Gear-Erhaltungssatz:** Item-Zählung (Inventar+Bank+Vault+Equipment) vor/nach Migration exakt gleich, keine neuen Arten, `ammoCount` erhalten.
- **Instanzen intakt:** Affix-Tier, Suffix (ilvl/roll), instanceId, nextInstanceSeq — bit-gleich über alle Versionen.
- **autoPotion-Defaults** (v<49): `{healPotionId:null, healThreshold:0.4, autoRebuffTonics:false}` ✓.
- **Attribut-Kette** 5→(×0.5)→2.5→(ganzzahlig)3 korrekt: Basis 5 → 3, Creation-Seed 7 → 4; 47er-Ära 2.5→3, 3.0→4; fehlende baseAttributes → 3 (kein Crash im ersten Offline-Tick).
- **Bank-Grandfather:** v40 → bankSlotsPurchased 40 (Kapazität 100 erhalten); v43 behält eigenen Wert.
- **Onboarding:** v<45 → Veteranen-Default `{done:true}` (kein Tutorial-Zwang); ≥45 unverändert. `activePlayMs` <44 → elapsedMs-Backfill.
- **Legacy-Pfade (v40):** grimiron→iron/blackcast→steel-Renames inkl. Bank-Mengen-Merge (5+3=8), Pet-Rename barki→rotbark (owned+companion), DISCARD-IDs (storm_scimitar) sauber genullt.
- Kampf-Timer (`playerTimerMs`/`enemyTimerMs`), DoT-Magnitude (12→1.2 alte Skala), Pet-Schild (30→3), Buff-Restdauer, Farm-Plot: alle exakt erhalten.

## (b) Roundtrip-Fuzz: 20 Spielstände serialize→deserialize→deep-equal ✅ (mit dokumentierten Transienten)

7 Lebensphasen (frisch/Holzfäller 30 min/Melee-Kämpfer 10 min/Ökonom mit Farm+Buff+Bank/Ranged mit Munitionsverbrauch/Dieb mit Stun-Risiko/Magier), Seeds variiert. **Kein einziger Wert-Verlust außerhalb der Kampf-Transienten; kein NaN.** Die EINZIGEN Drop-Felder (alle in `CombatState` als transient dokumentiert, der Load-Pfad baut `combat` ohne sie neu auf — `packages/persistence/src/index.ts:807-828`):

`stopReason, encounterXp, effectCounters, cooldownRemainingMs, lastKill, autoEatCooldownMs, autoPotionCooldownMs, enemyHpLow, noProgressMs`

→ Konsequenzen dieser Drops siehe Findings F1/F3/F4 unten.

## (c) Offline-Rechnung: 1h/8h/24h/7d ✅

- **Skilling 1 h:** offline.ms exakt, 36 000 Ticks, Woodcutting-XP im Erwartungsband (~2× Abschlüsse à 2 XP, Mastery-Beschleunigung inklusive), Items ≥ 1000 Logs, **SPIELZEIT korrekt: elapsedMs +1 h, activePlayMs UNVERÄNDERT** (Offline zählt nicht als Spielzeit).
- **Cap:** 24 h- und 7 d-Load sind **bit-identisch** zum 8 h-Load, `offline.ms == MAX_OFFLINE_MS` — kein Über-Cap-Leck.
- **Kampf 1 h (überlebensfähig):** Kills/Gold/XP fließen, hp ∈ [0, maxHp], kein Phantom-Tod.
- **Offline-TOD:** `offline.deaths == 1` (GENAU einmal — kein Todes-Loop im Restfenster), `diedAgainst == highland_wyvern`, `combatStopped:true`, `combatStopReason:"defeated"`, Kampf hart gestoppt (monsterId null), **voll geheilt** (Engine-Vertrag).
- **Dungeon-Tod:** `diedAgainst == encounters[encounterIndexBefore + killsDelta]` — die Killer-Rekonstruktion aus deserialize (index.ts:1198-1206) stimmt auch für Dungeon-Runs.
- **Buff-Dauer-Exploit: NEIN.** Tonikum mit 120 s Rest läuft offline nach 120 s ab (nicht das ganze Fenster — der alte Bug bleibt gefixt, tickBuffs pro Tick). Auto-Rebuff verbraucht offline korrekt den Inventar-Vorrat (2 Tonika → 0).
- **Bitgleichheit offline==online (Stichprobe):** One-Shot-Catch-up vs. 36 000×100 ms-Chunks — **Skilling und Kampf in allen WERTEN bit-identisch** (RNG-State, XP, Items, HP, Gold). Einzige Divergenz: REIHENFOLGE von `achievements[]`/`quests.completed[]` (Vergabe 1× pro advance statt pro Tick) → F5 (P4). Mit **Farm-Plots + Regen-Buff** divergiert es real → F2 (P3) und F6 (P4).

## (d) Kampf-Transienten über Save/Load

- ✅ **Angriffs-Timer überleben exakt** (playerTimerMs/enemyTimerMs bit-gleich — kein Timer-Reset, kein Gratis-Schlag durch Reload), Status-Effekte (Restdauer/Magnitude), `petAbility`-Laufzeit (Trigger-Timer, Schild-HP), kills/enemyHp: alles verlustfrei.
- ✅ Kein „Cooldown aus dem Nichts" beim Reload eines cooldown-freien Kampfs.
- ❌ **Kill-Cooldown-Skip durch Reload** → F1 (P3).

---

## Findings

### F1 (P3) — Kill-Cooldown-Skip durch Reload widerspricht dem eigenen Design-Kommentar
**Wo:** `packages/persistence/src/index.ts:807-828` (migrateState baut `combat` ohne `cooldownRemainingMs`/`lastKill` neu auf) vs. `packages/engine/src/combat.ts:248-250` („Der Kill-Cooldown gilt IMMER — Stop+Start darf ihn nicht überspringen") und `shared/src/index.ts:2727` (Feld-Kommentar erklärt den Drop zum Design).
**Messung (Harness):** Save bei `cooldownRemainingMs=5000`; nach Reload ist das Feld weg; in den folgenden 4900 ms macht das Original **0** Schaden/Kills (pausiert), der Reload **3** (kämpft sofort). ⇒ Bis zu 5 s Kampfpause pro Kill per Save-Scumming überspringbar; `lastKill`-Summary verschwindet zusätzlich (kosmetisch).
**Bewertung:** praktisch geringer Nutzen (ein echter Reload dauert länger als 5 s), aber ein dokumentierter Design-Widerspruch — die zwei Kommentare behaupten Gegenteiliges. Entweder Cooldown persistieren (Feld in den migrate-Neuaufbau aufnehmen; Alt-Saves defaulten undefined) oder den combat.ts-Kommentar auf „gilt nicht über Reload" korrigieren.
**Owner:** logic-dev (Persistenz) + combat-dev (Kommentar/Intent-Klärung). Kein Fix in diesem Sweep.

### F2 (P3) — Regen-Buff wird im Offline-Catch-up unter-vergeben (offline ≠ online)
**Wo:** `packages/engine/src/tick.ts:353-370` — HP-/Mana-Regen läuft **1× pro advance NACH der Tick-Schleife** mit `computeStats` vom END-Zustand. Läuft ein hpRegen-Buff (z. B. emberroot_tonic, 0.3 HP/s, 120 s) während des Offline-Fensters ab, ist er in den End-Stats nicht mehr enthalten → **0 Regen** für seine gesamte Restlaufzeit.
**Messung (Harness):** identischer Save (hp 7/13, Buff 120 s Rest), 1 h Catch-up: One-Shot (Load-Pfad) endet bei **hp 7**, Live-Chunks bei **hp 13** (voll). Der Offline-Spieler verliert die komplette Buff-Heilung.
**Bewertung:** kein Exploit (Untervergabe, nicht Übervergabe), aber eine echte offline-vs-online-Inkonsistenz — genau die Klasse, die tickBuffs bereits pro Tick gefixt hat; der Regen-Konsument hinkt hinterher. Betrifft nur Saves mit aktivem Regen-/Stat-Buff beim Beenden.
**Owner:** logic-dev (tick.ts-Regen in die Tick-Schleife ziehen oder buff-bewusst segmentieren).

### F3 (P4) — autoEat-/autoPotion-Cooldown resetten beim Reload auf „sofort bereit"
**Wo:** dieselbe migrate-Neuaufbau-Stelle (index.ts:807-828); Felder laut Typ transient (shared:2706-2715).
**Messung:** `autoEatCooldownMs=2500`/`autoPotionCooldownMs=4000` im Save → nach Load beide undefined (= 0, sofort essen/trinken). Minimaler Heil-Takt-Vorteil pro Reload; konsistent mit dem dokumentierten Transient-Design. Nur beobachten.

### F4 (P4) — effectCounters (Waffen-Spezialeffekt-Zähler) gehen beim Reload verloren
**Wo:** wie F3; `combat.ts:399-402` legt sie lazy neu an.
**Wirkung:** `momentumStacks` weg (NACHTEIL für den Spieler), `firstHitDone` reset → First-Strike-/EagleEye-Effekte proccen nach Reload erneut (kleiner Vorteil), `hitCount`-basierte everyNth-Effekte starten neu. Symmetrisch klein in beide Richtungen, pro Begegnung ohnehin resettet. Nur beobachten; ggf. mit F1 gemeinsam persistieren.

### F5 (P4) — Achievements-/Quest-Vergabe-REIHENFOLGE divergiert offline vs. live
**Wo:** `tick.ts:344-377` (checkAchievements/evaluateQuests 1× pro advance).
**Messung:** identische MENGEN, nur Array-Order von `achievements[]`/`quests.completed[]` unterschiedlich (z. B. `ach_total_level_25` vor/nach `ach_gather_100`). Rein kosmetisch (falls eine UI „zuletzt freigeschaltet" aus der Array-Order liest). Kein Handlungsbedarf.

### F6 (P4/Info) — Mit aktiven Farm-Plots ist offline==online nicht bit-identisch (RNG-Interleaving)
**Wo:** `tick.ts:344` (tickFarmPlots 1× pro advance) + `farming.ts:123-173` (Multi-Zyklen arithmetisch — Ernte-ANZAHL stimmt offline!).
**Messung:** 1 h, Plot + Auto-Replant: Ernten identisch (46 graywort beide), aber die Ernte-RNG-Züge interleaven anders mit den Aktions-Würfen → Doppelertrags-Procs verschieben sich (354 vs. 344 Logs, itemsGathered 1410 vs. 1405, RNG-State divergiert). Statistisch fair, deterministisch je Pfad — nur keine Bit-Gleichheit. Erwartbares Chunking-Artefakt; kein Fix nötig, aber bei künftigen „Replay/MP-Abgleich"-Plänen (rng.ts-Kommentar) relevant.

### Beobachtung (kein Finding) — mana wird beim Load nicht gegen maxMana geklemmt
`sanitizeState` härtet `mana` nur auf endlich/≥0 (index.ts:136); der Clamp passiert erst im ersten Out-of-Combat-advance (tick.ts:364-369). Harmlos (selbstheilend nach 1 Tick), nur der Vollständigkeit halber notiert.

---

## Prüfumfang / Nicht geprüft
- Geprüft: deserialize/migrate/sanitize (headless), advance-Offline-Pfad, Engine-Kampf/Skilling/Farming/Buffs/Slayer-Gate am Rand. NICHT geprüft: Electron-IPC-Save-Datei-I/O, UI-Anzeige des OfflineSummary-Popups (T9-Domäne).
- Alle Zahlen deterministisch (Seeds 11-24, 1000+37i, 4242); Harness-Log lag im Session-Scratchpad.
