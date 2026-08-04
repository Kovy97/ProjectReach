# Tester-Welle T1 — Kontrolleur (Bug & Integrität)

**Datum:** 2026-06-27 · **Modus:** read-only, unabhängige Verifikation
**Scope:** 4-Skill-Erweiterung · Combo-/Effekt-Food + `hpRegenPerSec` · Thieving-Fence-Kette (P1-C) · Combat-Level-XP (#113)

## Verdikt: GRÜN — keine P0/P1-Bugs gefunden. Ship.

Alle Gates unabhängig und cache-frisch reproduziert:

| Gate | Ergebnis |
|---|---|
| `vitest run` (Engine, voll) | **334 Tests / 61 Files passed**, exit 0 |
| Sim Balance-Report | **AUFFÄLLIGKEITEN (0)** · keine echten Walls (0) · alle Monster `kills>0`, `deaths=0` |
| Client-Build (`@hearthforge/client`) | grün, exit 0, built in 6.9s |
| Sim Skilling | „läuft für jede Aktion ohne Absturz und liefert Erträge" ✓ |

Die 2 „über Baseline" (scale_skarn Lv104, last_idol Lv120) sind erwartbar — Endgame-Mobs über der Bronze-Baseline, nicht als Wall gewertet.

---

## Detailprüfung der Nacht-Änderungen (alle bestätigt korrekt verdrahtet)

### Combo-/Effekt-Food + hpRegenPerSec — OK
- **heal + buff zugleich:** `useConsumable` (consumable.ts:26-49) wendet `healAmount`, `curesPoison` UND `buff` in EINEM Verzehr an — kein Verdrängen mehr. Guard-Test vorhanden: buffs.test.ts:111 „Combo-Food heilt SOFORT UND registriert den Buff".
- **hpRegenPerSec aggregiert:** character.ts `addBonus` (Z. 142) summiert `hpRegenPerSec` aus **Ausrüstung + Buffs + Set-Boni** (Z. 155/160/171) → `DerivedStats.hpRegenPerSec` (Z. 230). Kein „Feld definiert, nie angewandt".
- **Angewandt in beiden Ticks:** Idle-Tick (tick.ts:222-224, additiv zum Basis-Regen) UND Kampf-Tick (combat.ts:716-721). Beide aufs `maxHp` gedeckelt, deterministisch. Guard-Tests: buffs.test.ts:133 (Idle) + :157 (Kampf).
- **Auto-Eat wendet den Buff an:** `tryAutoEat` (combat.ts:79) ruft `applyConsumableBuff` → Combo-Food wirkt im Auto-Eat-Pfad identisch zum manuellen Verzehr. Combo-Foods sind als Auto-Eat-Food wählbar, weil alle `healAmount > 0` haben (`selectFood`-Gate, combat.ts:170).
- **Caps:** hpRegen-Leiter bis 12/s (`ambergrain_feast`), Buff-Boni statisch in Content begrenzt; alle HP-Schreibpfade auf `maxHp` geklemmt.
- **Obtainability:** alle 5 Combo-Gerichte + Effekt-Foods werden von Cooking-Aktionen (`cook_*`, index.ts:3917-3976) produziert; Inputs (Fisch/Fleisch/Crop/Herb) existieren (durch content-refs/wiring-audit grün abgedeckt).

### Thieving-Fence-Kette (P1-C) — OK
- **Alle 23 Thieving-Aktionen kategorisiert:** 14× `category:"steal"`, 9× `category:"fence"`. Garantiert durch Guard content-refs.test.ts:81-92 („kategorisierte Skills: JEDE Aktion hat eine category") — sonst würde eine Aktion lautlos aus der SkillPage verschwinden.
- **Kategorien definiert + lokalisiert:** `steal`/`fence` in ContentDB.categories (index.ts:8063-8064) mit en/de-Namen. SkillPage rendert `tr(g.cat.name)` (SkillPage.tsx:161) → **kein fehlendes i18n-Label** (Plan-Follow-up „category.fence.name" ist faktisch bereits erledigt).
- **Kein Nettoverlust / keine toten Inputs:** alle 9 Fence-Inputs (`stolen_coinpurse`, `cutpurse_trinket`, `smugglers_key`, `ledger_page`, `guard_insignia`, `signet_ring`, `ornate_goblet`, `reliquary_shard`, `idol_coin`) sind als Item definiert UND werden von Steal-Aktionen gedroppt. Gold-EV jeder Fence-Aktion liegt über dem Verkaufswert der Inputs.
- **Craft-Pfad korrekt:** Fence-Aktionen haben `inputs` und KEIN `successBase` → laufen über den Verarbeitungspfad ohne Erfolgswurf/Betäubung; thieving.test.ts:55-58 exempt fence explizit. Item-Sinks durch wiring-audit grün.

### Combat-Level-XP (#113) — OK
- **Formel `combatXpLevelMult` (shared:256-261):** `diff = skillLevel − monsterLevel`; `≤5 → 1`, `≥15 → 0`, dazwischen linear. Reine Funktion, kein State.
- **Edge-Cases alle getestet** (over-level.test.ts):
  - Spieler UNTER Mob (diff negativ) → **nie gedämpft** (=1).
  - diff exakt 5 → 1 (voll); diff exakt 15 → 0; Bandmitte → 0.5; diff 6 → reduziert aber >0.
- **Vergleich nutzt den XP-empfangenden Skill:** `offenseXpMult`→`activeOffenseSkill` (combat.ts:286-307) routet melee→attack/power/defence (je combatStyle), ranged→ranged, magic→magic_off — dieselbe Quelle wie der XP-Empfang. Konsistent über mehrere Stil-Skills.
- **Gold UNGEDÄMPFT:** `onEnemyDefeated` (combat.ts:358) berechnet Gold ohne `xpMult`; Test bestätigt `gold ≥ monster.gold` auch bei Faktor 0.
- **Vitality ungedämpft:** `grantOffenseXp` (combat.ts:325) gibt Vitality-XP ohne `xpMult` (Survival-XP) — bewusst, dokumentiert.
- **Log-Signal vorhanden:** bei genullter XP eine `xp`-Logzeile mit `amount:0` (combat.ts:352-354) als „zu schwach"-Signal; Test prüft `xpLog === 0`.
- **`monster.xp` wird tatsächlich vergeben** (combat.ts:345) — der frühere „nur in UI, nie vergeben"-Bug ist behoben und getestet.

### Save / Migration — OK (kein Bump nötig, korrekt)
- `SAVE_VERSION` bleibt **33**. Keine der Nacht-Änderungen führt neuen *persistenten* State ein:
  - hpRegenPerSec = statisches ItemDef-Feld + berechneter Stat; persistente Buffs bleiben `{itemId, remainingMs}` (unverändert).
  - Fence-Kette = reiner Content; Combat-XP = reine Logik.
- Alt-Saves mit einem Buff auf ein neu definiertes Combo-Food laden korrekt (Buff-Bonus wird zur Laufzeit aus Content gelesen). Kein Migrationsrisiko.

---

## Befunde (alle P2 — kein Blocker)

- **P2 (toter Code, bestätigt):** `overLevelMult` + `OVER_LEVEL_GRACE/SLOPE/FLOOR` in `packages/shared/src/index.ts:213-231` sind **ungenutzt** — nur noch von Design-Docs referenziert, von keinem Engine-Modul importiert; `combatXpLevelMult` hat sie abgelöst. Cleanup-Kandidat. → **Owner: logic-dev** (shared).
- **P2 (kosmetisch, NICHT aus dieser Nacht):** Fletching-Aktionen tragen Smithing-Tier-Kategorien (`category:"copper"`, z.B. `fletch_bowstring` index.ts:5374). Rendert Fletching-Aktionen unter einem „Copper/Bronze…"-Header — semantisch schief, funktional unkritisch. Pre-existing. → **Owner: content-dev** (optional).
- **P2 (UI-Follow-up, Effekt funktioniert):** `hpRegenPerSec` wird im Tooltip/Charblatt nicht angezeigt, und die „zu schwach — kein Kampf-XP"-Logzeile ist derzeit nur eine 0-XP-Zeile ohne Klartext. Beides reine Anzeige, die Engine-Wirkung ist korrekt. → **Owner: ui-dev**.
- **P2 (Härtung, nicht erreichbar):** `combatXpLevelMult` gäbe NaN bei `monsterLevel === undefined`. `MonsterDef.level` ist pflicht/typisiert und in allen Content-Mobs gesetzt → derzeit nicht auslösbar; nur erwähnt, falls künftig dynamisch generierte Mobs hinzukommen. → **Owner: combat-dev** (optional).

## Gegengeprüfte „Feld-definiert-nie-angewandt"-Kandidaten (alle SAUBER)
`hpRegenPerSec` (angewandt, 2 Ticks, getestet) · `monster.xp` (jetzt vergeben + getestet) · `EquipBonus.hpRegenPerSec` (in addBonus aggregiert) · `category` steal/fence (in SkillPage gerendert, guard-getestet) · Combo-Food-Buff-Boni meleeDamage/rangedDamage/magicDamage/critChance/accuracy/defense (alle via addBonus in DerivedStats).

**Empfehlung:** Ship. Nur P2-Cleanups (toter `overLevelMult`) + UI-Anzeige-Follow-ups offen — keiner blockiert.
