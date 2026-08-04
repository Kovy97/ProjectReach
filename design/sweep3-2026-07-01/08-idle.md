# Sweep 3 — 08 Idle (reiner AFK-Idler: lange Auto-Kämpfe + Offline-Sprünge)

**Rolle:** Kontrolleur (QA) · **Ziel:** Das Spiel als **reiner AFK-Idler** verifizieren — Auto-Eat überlebt, 8h-Offline-Cap greift, `activePlayMs` zählt Offline NICHT, Ranged-Köcher-Management im Idle (läuft er leer?).
**Datum:** 2026-07-01 · **Methode:** zwei eigene Testskripte (`packages/engine/src/idle-afk-sweep.test.ts` via `SimPlayer` + `packages/persistence/src/idle-offline-sweep.test.ts` via echtem `serialize`/`deserialize`) — angelegt → ausgeführt → **gelöscht**. Kein Spiel-Code geändert.

## Ziel erreicht? — JA (alle vier Prüfziele beantwortet). 1 P2-Reibung gefunden (Ranged-Idle bricht ab).

| Prüfziel | Ergebnis | Evidence |
|---|---|---|
| **Auto-Eat überlebt** langen Auto-Kampf | ✅ confirmed | Geared Ranged vs goblin, cooked_lobster (heal 80), **4h → 0 Tode**, 245 Food gegessen, HP stabil |
| **8h-Offline-Cap** greift | ✅ confirmed | 24h weg → `offlineMs = 28.800.000` (exakt 8,00h), `offlineTicks = 288000` (echter `deserialize`-Pfad) |
| **`activePlayMs` OHNE Offline** | ✅ confirmed | Vor Offline `ap=1.200.000`; +8h Offline → `ap` **unverändert**, `elapsedMs += 28.800.000`; danach live → `ap` wächst wieder. Invariante `activePlayMs ≤ elapsedMs` hält |
| **Ranged-Köcher im Idle — läuft er leer?** | ⚠️ **JA, mit hartem Progress-Stop** | 8h Offline, Köcher 500 + **3000 Reserve-Pfeile im Inventar** → nur **208 Kills**, Köcher 0, **Reserve unangetastet (3000)**, `monsterId=null`, `stopReason=outOfAmmo`. Melee im selben Fenster: **3172 Kills** |

## Gemessene Idle-Kennzahlen (echte Engine-Zahlen)

Geared Ranged (steel_longbow + steel_arrow, ranged/def/vit 40, maxHp 417) vs goblin (L15), 1 Fenster:

| Metrik | Wert |
|---|---|
| Kills/h | 555 |
| Pfeile/h | 1.322 (≈ 2,4 Pfeile/Kill) |
| Food/h (lobster, heal 80) | 63 |
| Tode/h | 0 |
| **Reichweite voller Köcher (9999)** | **~7,56 h** — knapp UNTER dem 8h-Offline-Cap |

Offline-Vergleich (echter `deserialize`, volle 8h, jeweils mit Food + Auto-Eat):

| Stil | Kills in 8h Offline | Stop? | Grund |
|---|---|---|---|
| **Melee** (rusty_sword) | **3.172** | nein | — (kein Ressourcen-Limit) |
| **Ranged** (Köcher 500 + 3000 Inv-Reserve) | **208** | **ja, nach ~15 min** | `outOfAmmo` → Köcher leer, Reserve NICHT nachgeladen |

Magie (aus Code-Analyse `combat.ts:768-780`): kein Ressourcen-Stop — ohne Mana degradiert der Cast zum schwachen Stab-Nahkampf (`MAGIC_WEAK_FACTOR`), Mana regeneriert nach → **idle-sicher wie Melee**. Nur **Ranged** kann einen Idle/Offline-Lauf komplett anhalten.

## Findings

### [P2][balance/feel] Ranged-Idle/Offline bricht bei leerem Köcher ab — Reserve-Munition aus Inventar/Bank wird NIE automatisch nachgeladen — confirmed
- **Repro:** Ranged (steel_longbow), Köcher **500** steel_arrow, zusätzlich **3000** steel_arrow im **Inventar**, Food + Auto-Eat, 8h Offline via `serialize`/`deserialize`. → **208 Kills**, `ammoCount=0`, Inventar-Pfeile **unverändert 3000**, `combat.monsterId=null`, `combat.stopReason="outOfAmmo"`. Die restlichen ~7,75h der Offline-Zeit sind **toter Progress**.
- **Mechanik:** `stopIfOutOfAmmo` (`combat.ts:876-885`) stoppt den Kampf, sobald `ammoCount<1` — bewusst statt Weak-Melee-Notschlag (Kommentar `combat.ts:864-874`). Aber es gibt **keinen Nachlade-Pfad**: weder `performPlayerAttack` (`combat.ts:781-795`) noch `stopIfOutOfAmmo` ziehen den nächsten passenden Pfeil-Stack aus `state.inventory`/`state.bank`. Nachladen ist NUR die manuelle UI-Aktion (`equipAmmo`, `equipment.ts:185`).
- **Erwartet (reiner AFK-Idler):** Läuft der Köcher leer, wird automatisch der nächste passende Munitions-Stack aus dem Inventar (dann optional Bank) nachgeladen; erst wenn **nirgends** passende Munition liegt, wird gestoppt.
- **Tatsächlich:** Harter Stopp trotz 3000 Pfeilen einen Slot weiter. Ranged ist der **einzige** der drei Stile, der einen Offline-Lauf vollständig anhält — 208 vs 3172 Kills = **~15× Nachteil** rein durch den fehlenden Nachlade-Pfad. Selbst ein voll gefüllter Köcher (9999, das Maximum) deckt nur **~7,5h** ab, also NICHT die volle 8h-Offline-Fenster für schnelle Ranged-Builds.
- **Impact:** Bricht das Kernversprechen „reiner AFK-Idler" für ~⅓ der Spieler (Ranged). Kein Crash/Datenverlust → P2, aber die **dominante Idle-Reibung** dieses Sweeps.
- **Empfehlung (Zahlen):** (1) **Auto-Nachladen** des Köchers aus Inventar → Bank beim Leerlaufen (bevor `endCombatOutOfAmmo`); nur bei 0 passender Munition überall stoppen. (2) Falls Auto-Nachladen nicht gewünscht: `AMMO_MAX_STACK` (aktuell 9999, `inventory.ts:14`) so anheben, dass ein voller Köcher die schnellsten Ranged-Builds über die vollen 8h trägt (≥ ~11.000 bei 1.322 Pfeilen/h). Auto-Nachladen ist die bessere Lösung.
- **Owner:** combat-dev (`stopIfOutOfAmmo`/`performPlayerAttack`, `combat.ts:781-885`) + logic-dev (Inventar-/Bank-Pull).

### [P3][ux] „Während du weg warst"-Popup nennt keinen Abbruchgrund — confirmed
- **Repro:** Nach dem Ranged-Offline-Abbruch steht `combat.stopReason="outOfAmmo"` im State, aber `OfflineSummary` (`persistence/index.ts:888-998`) trägt nur `ms/gold/xp/items/skillXp` — **nicht**, dass der Kampf nach ~15 min mangels Munition endete.
- **Erwartet:** Rückkehr-Popup zeigt „Kampf nach X gestoppt: Köcher leer" (analog dem geplanten Stalemate-/outOfAmmo-Hinweis im Live-Kampf), damit der Spieler die mageren Offline-Erträge einordnen kann.
- **Tatsächlich:** Spieler sieht nur 208 Kills Ertrag ohne Erklärung, warum 7,75h leer blieben.
- **Owner:** logic-dev (`OfflineSummary` um `stopReason`/`stoppedAtMs` erweitern) + ui-dev (Popup-Zeile).

## Positiv-Bestätigungen (kein Bug — Idle-Fundament ist solide)

- **8h-Offline-Cap exakt:** 24h weg → `offlineMs = MAX_OFFLINE_MS = 28.800.000`, `offlineTicks = 288000` (`persistence/index.ts:959`). Kein Overflow, keine Endlosschleife.
- **`activePlayMs` sauber getrennt:** Offline-Catch-up läuft mit `offline:true` (`persistence/index.ts:970`) → `step` zählt `activePlayMs` nur live hoch (`tick.ts:220`). Vor/nach Offline **identisch**, `elapsedMs` (Sim-Uhr) läuft weiter, Invariante `activePlayMs ≤ elapsedMs` hält.
- **Auto-Eat überlebt lange Auto-Kämpfe:** Mit adäquatem Food (lobster heal 80) + Auto-Eat T0 (isst @50% HP, 3s Cooldown) **0 Tode über 4h** (`combat.ts:77-101`). Auto-Eat gilt auch für DoT-Schaden (`combat.ts:981`).
- **Food-Leerlauf ist idle-FAIR (kein Hard-Stop):** Läuft das Essen aus (oder ist zu schwach), stirbt der Held zwar, aber `onPlayerDefeated` (`combat.ts:581-604`) heilt voll und startet denselben Gegner automatisch neu → Farmen läuft weiter, nur mit harmlosen Toden (kein Fortschrittsverlust). Gemessen: nach Food-Ende +12 Tode/h **aber weiter 639 Kills/h**. Anders als Ranged blockiert leeres Food den Idle-Lauf NICHT.

## Hinweis zur Messmethodik (keine Findings, damit kein Folge-Agent stolpert)
`SimPlayer.combat.kills` ist kumulativ über die ganze Session und wird von `fightFor` bei jedem Aufruf neu „gebankt", solange der Gegner nie stoppt (Dauerfarm). Wer `fightFor` in einer Schleife auf denselben Dauerkampf ruft, misst dadurch dreieckszahl-inflationierte Kills (bei mir kurz 37.503 statt real ~4.196). Die korrekten Raten oben stammen aus **Einzelaufruf**-Fenstern. Kein Spiel-Bug — reiner Test-Harness-Footgun.

## Top-3
1. **[P2] Ranged-Idle/Offline bricht bei leerem Köcher ab** — Reserve-Munition aus Inventar/Bank wird nie nachgeladen (208 vs 3172 Kills/8h ggü. Melee). → Auto-Nachladen implementieren (combat-dev + logic-dev).
2. **[P3] Offline-Popup nennt keinen Abbruchgrund** — `outOfAmmo`/`stalemate` nach Offline unsichtbar (logic-dev + ui-dev).
3. **Fundament bestätigt:** 8h-Cap exakt, `activePlayMs` Offline-frei, Auto-Eat überlebt & Food-Leerlauf ist idle-fair — Melee/Magie idlen unbegrenzt, nur Ranged hat die o.g. Reibung.
