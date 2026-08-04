# Phase-C Combat-Tester — MAGIC, Band L10 (Rüstungs-Trinität)

Stand 2026-07-03 · Tester: kontrolleur · READ-ONLY (Wegwerf-Harness `_tmp_cG10_*`, ausgeführt & gelöscht)
Grundlage: `design/armor-trinity-spec.md` · Loadout: **on-tier Stoff (Apprentice-Set) + iron_staff**, 100 % Kampf, Spielzeit.
Methodik: `createGame` (startingStyle magic) → alle COMBAT_SKILL_IDS auf `xpForLevel(10)` (combatLevel = R, wie Gate-B) → equip → `combatStep`-Loop (TICK_MS 100), Delta-/seq-basiertes Accounting (ring-buffer-fest).

## VERDIKT: **BLOCK für Parität — FIX-THEN-SHIP** (Engine sound, Content-Zahlen kaputt)
Die Ward-**Mechanik** ist korrekt verdrahtet (Absorb vor HP, Recharge am Cast, Reihenfolge §1.5, Cap, Respawn-Init — alle grün). Der **Content** unter der Mechanik ist am unteren Band leer: das on-tier-Stoff-Set (Apprentice) trägt **90 % zu wenig Ward**, wodurch der Magier bei L10 mit **−59 % EHP** gegenüber Platte der mit Abstand schwächste Stil ist. Das ist **kein neuer Bug**, sondern die exakte Bestätigung + Beziffrung des größten offenen Trims aus GATE-B (Hebel 1) — jetzt mit Kampf-Zahlen. Root-Cause: content-dev (Ward-Werte + Ladder-Lücke), nicht combat/logic.

---

## Kern-Zahl (die GATE-WARNUNG, verifiziert)

| Größe | Spec-Ziel Band-10 | **IST (gemessen)** | Abweichung |
|---|---:|---:|---:|
| **maxWard** | 31 | **7.9** (pure) … **8.9** (+runecrafting-INT) | **−71…−74 %** |
| davon Feld-Ward (Stoff-Items) | 19 | **1.91** | **−90 %** |
| davon INT-Kern | 12 | 6.0 … 7.0 | −42…−50 % |

Beide Terme sind unter-spec und **multiplizieren sich**: (a) das Apprentice-Set (`apprentice_*`, req magic_off 1) trägt `wardCapacity` **0.38/0.57/0.42/0.27/0.27 = 1.91** — Faktor ~10 unter Spec §4.3 (helmet 4 / body 6 / legs 4 / gloves 3 / boots 3 = 19). (b) Ein reiner Kampf-L10-Magier hat nur **int 6** (magic_off L10), nicht 12 wie die Spec-Tabelle annimmt (die Spec rechnet mit int·1 = 12, was erst bei ~magic_off 72 erreicht wird). Nächste Stoff-Sprosse erst bei magic_off **22** (frost) → der Magier hängt für das **ganze** Band 1–21 auf maxWard ≈ 8 fest (CL12-Gegenprobe: maxWard **7.9**, unverändert).

---

## Die 5 Bewertungspunkte (mit Zahlen)

### 1. Ward-Casting-Loop — ✅ Mechanik korrekt, ❌ Pool zu klein für echten Puffer
- **Cast-Sustain:** manaRegen **3.10/s** > Verbrauch **2.14/s** (cost 6 / 2.8 s-Takt) ⇒ Mana läuft **nie** leer, **kein Weak-Melee** (manaMin über 900 s = 100, cost 6). Der Magier castet dauerhaft ⇒ Ward lädt dauerhaft **~1.07 Ward/s** (Spec-Ziel 1.3/s, plausibel bei 2.8 s-Takt).
- **Absorb funktioniert:** über 900 s vs boar (Gegner-Trefferrate 75 %) fing Ward **645** von **672** eingehendem Schaden = **96 %** ab; nur 27 HP leckten durch.
- **ABER:** trotz 96 % Absorb bleeder der Held von 27.7 → **hpMin 0.7** (netHp **−0.03/s**), 0 Tode aber messerscharf. Der Pool (7.9) ist so klein, dass Multi-Hit-Bursts ihn mitten im Encounter auf **0** ziehen (wardMin 0.0) und die Überläufe direkt auf die HP gehen. Loop **arbeitet**, puffert aber praktisch nichts — die 96 % kommen v. a. aus dem Respawn-Full-Reset je Kill, nicht aus Pool-Tiefe.

### 2. Unarmored (kein Stoff) = Suizid? — ⚠️ nur schwach erfüllt bei L10
Nur `iron_staff`, kein Stoff, kein Food (maxHp 17.7, maxWard 4.0 = reiner INT-Kern):
| Gegner | Kills/300 s | **Tode/300 s** | hpMin |
|---|---:|---:|---:|
| boar (L10, dmg5) | 13 | **3** | 0.7 |
| goblin (L15, dmg7) | 16 | **8** | 0.7 |
- Gegen den **weichsten** on-level-Mob (boar) stirbt der nackte Magier nur **3×/5 min** — **nicht** der von Spec §7.1 versprochene „~9 s-Suizid". Grund: (i) boar ist mit dmg5 weich, (ii) der **INT-Kern-Ward 4.0** (`WARD_CORE_PER_INT=1.0`) puffert auch den Nackten. Erst gegen goblin (dmg7) wird es tödlich (8 Tode).
- Stoff senkt Tode vs goblin von **8 → 2** — der Stoff hilft also, aber der Löwenanteil kommt aus den **CON-Modifiern** der Items (maxHp 17.7 → 27.7), **nicht** aus dem Ward-Feld (nur +1.9). Deckt sich mit Gate-B-Hebel 2: `WARD_CORE_PER_INT → 0` würde den Nackten korrekt tödlich machen (und die UI-Leiste bei Nicht-Stoff verstecken).

### 3. Food nötig — ODER macht Ward Food überflüssig? — ✅ Food bleibt nötig (nicht trivialisiert)
1 h Dauerkampf, on-tier-Food `cooked_chicken` (heal 3, Auto-Eat Tier 0 @ 50 %):
| Gegner | NoFood Tode | NoFood netHp/s | mit Food Tode | Food/h verbraucht |
|---|---:|---:|---:|---:|
| boar (L10) | **3** | +0.001 | 0 | **2** |
| goblin (L15) | **9** | +0.0005 | 0 | **14** |
- Ward macht Food **nicht** überflüssig: ohne Food stirbt der Magier **3–9×/h**. Gegen boar ist Food **fast** trivial (2 Hühnchen/h) — das ist aber der von Spec §7.2 vorgesehene „Farm-Zone-Puffer" (weichster Mob), nicht ein System-Defekt. Sobald der Mob härter trifft (goblin), ist Food eindeutig Pflicht (9 Tode ohne). **Chef-Constraint erfüllt.**

### 4. Stil-Parität L10 — ❌ BLOCK (Spanne 89 %, Gate ±10 %)
Analytische EHP, on-tier Voll-Set je Stil (Armor-Klasse isoliert, combat-only + minimaler Craft-Skill fürs Anlegen):
| Stil | maxHp | Klassen-Schicht | **EHP** | vs Platte |
|---|---:|---|---:|---:|
| **Platte** (iron + kiteshield) | 49.7 | red 35 % / block 15 % | **86.2** | — |
| **Leder** (cured_leather) | 31.7 | dodge 34 % | **48.3** | −44 % |
| **Stoff** (apprentice) | 27.7 | maxWard 7.9 | **35.6** | **−59 %** |
- **Spanne 89 %** (Gate ±10 %). Stoff ist mit Abstand der schwächste Stil: **−59 % vs Platte, −26 % vs Leder.** Doppelter Nachteil: (i) Stoff-Items geben nur con 1/Teil (Platte con 2–3) ⇒ maxHp 27.7 vs 49.7 schon **vor** dem Ward; (ii) die Ward-Schicht (+7.9) ist zu klein, um den HP-Rückstand aufzuholen. Die eigentliche **Stoff-Item-Ward-Schicht** (Feld 1.91) steuert nur ~2 EHP bei — der Stoff-Panzer ist bei L10 **defensiv praktisch wirkungslos**.
- Konsistent mit GATE-B (R10 Stoff −37 %); mein Wert liegt tiefer, weil ich int sauber isoliert (reiner Kampf-Magier int 6 statt der Spec-Annahme 12).

### 5. L10+2 (Over-Level) — ⚠️ + Content-Roster-Lücke
- **Roster-Lücke:** zwischen boar (**L10**) und goblin/bull_boss (**L15**) gibt es **keinen** sauberen (nicht-Slayer-gegateten) Gegner L11–14. Ein echtes „L10+2"-Ziel existiert im Content nicht — der Magier springt von L10 direkt auf +5.
- L10-Magier vs L15 (on-tier Stoff + Food): goblin **21 Kills / 0 Tode** (ohne Food 2 Tode) — machbar. bull_boss (L15-Boss, enrage): mit Food **5 Kills / 2 Tode**, ohne Food **1 Kill / 9 Tode** — echte Wand (erwartet für +5-Boss).
- CL12-Gegenprobe: maxWard bleibt **7.9** (Apprentice weiter on-tier bis magic_off 22) ⇒ der Ward-Rückstand friert über das ganze frühe Band ein.

---

## Bug-Hunt (die zwei benannten Verdachtsfälle) — beide **KEIN Bug**

- **Ward-Recharge-Exploit:** ❌ nicht reproduzierbar. `ward` lag über 4000 Ticks **nie** über dem LIVE-`maxWard` (Über-Cap-Max = **0.000000**). Der scheinbare „über Cap"-Effekt (7.91 → 8.91) ist legitim: `magic_off` levelte im Kampf **10 → 18** (Cast-XP) ⇒ int 6 → 7 ⇒ maxWard wuchs. `rechargeWard` cappt korrekt (`min(maxWard, …)`, unit-getestet).
- **Ward-Init bei Respawn = Farming-Sustain:** funktioniert **wie in Spec §1.4 vorgesehen** (nicht als Bug), aber quantitativ relevant: **jeder Kill** setzt `ward = maxWard` (voller Pool umsonst). Kombiniert mit dem In-Fight-Recharge trägt der Magier **keinen** Ward-Schaden über Kills hinweg — der einzige Akkumulator ist der HP-Leak, den der Ward minimiert. Das ist der Mechanismus hinter „Ward streckt Food" (Punkt 3). Für den winzigen L10-Pool harmlos; bei großen Endgame-Pools verstärkt es die Food-Streckung (bereits in Spec §4.5 als +5–8 % effektiv eingepreist).

---

## Befunde P1–P4 (Severity · file:line · Owner)

- **P1 — Stoff-Ward am Band 1–21 ~90 % unter Spec → −59 % EHP-Parität.** `packages/content/src/index.ts:3898-3936` (Apprentice-Set `wardCapacity` 0.38/0.57/0.42/0.27/0.27; Spec §4.3-Ziel 4/6/4/3/3). Zusätzlich Ladder-Lücke magic_off 1 → 22 (`frost_*` erst req 22). **Owner: content-dev** (Ward-Werte auf Spec §4.2/§4.3 heben + Zwischen-Tier magic_off ~10 füllen). Deckt Gate-B-Hebel 1 ab.
- **P2 — Stoff-CON-Budget zu niedrig (maxHp 27.7 vs Platte 49.7) verschärft die Parität VOR dem Ward.** `packages/content/src/index.ts:3898-3936` (Apprentice con 1/Teil vs iron plate con 2–3). Der Spec-Pool (§4.1) rechnet maxHp_cloth zwar heraus, aber mit int=12; bei realem int=6 fehlt beides. **Owner: content-dev + balance-designer** (Ward-Zielwert an reales int koppeln, nicht an angenommenes 12).
- **P3 — INT-Kern-Ward puffert nackte Nicht-Magier (unarmored L10 nur schwach tödlich; UI-Leiste auf Melee/Ranged).** `packages/engine/src/character.ts:321` (`maxWard = WARD_CORE_PER_INT*attr.int + eq.wardCapacity`), Konstante `packages/shared/src/index.ts` (`WARD_CORE_PER_INT=1.0`). **Owner: logic-dev + content-dev** (`WARD_CORE_PER_INT → 0`, INT-Kern in `wardCapacity` einfalten — schon als Gate-B-Hebel 2 gequeued; fixt zugleich Punkt 2 der low-band-Parität).
- **P4 — Content-Roster-Lücke L11–14 (keine sauberen on-level-Gegner) + eingefrorener Ward über das ganze frühe Band.** `packages/content/src/index.ts` (Monster-Sprung boar L10 → goblin/bull_boss L15). **Owner: content-dev** (Zwischen-Gegner L11–14; deckt sich mit Ladder-Lücke aus P1).

## Was NICHT anzufassen ist (verifiziert korrekt)
Ward-Absorb-vor-HP, Recharge-am-Cast, Reihenfolge §1.5 (Dodge→Contest→Mitigation→Block→One-Shot→Ward→HP), Recharge-Cap, Respawn-/Start-Init, Mana-Sustain-Loop — alle combat.ts/character.ts-Mechaniken sind sauber. **Kein Eingriff in combat.ts/character.ts nötig; die L10-Magier-Schwäche ist zu 100 % Content-Zahlen (content-dev).**
