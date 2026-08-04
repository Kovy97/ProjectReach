---
name: combat-concept
description: "Combat system design for Hearthforge Idle — three attack styles, no triangle, auto-battle"
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

**Kampfkonzept** (Richtungsentscheidungen vom User am 2026-06-22):

- **Drei Angriffsstile, deutlich unterschiedliches Spielgefühl** (NICHT nur Stat-Varianten):
  - **Nahkampf (STR)** — Bruiser/Tank: hoher Einzelschaden, viel HP/Rüstung, **Lebensraub** (heilt % des Schadens), langsamer. Sustain.
  - **Fernkampf (DEX)** — Tempo/Präzision: schnelle Angriffe, hohe **Krit-Chance/-Schaden**, **Ausweichen** (Evasion). Konstanter, spitzer Schaden.
  - **Magie (INT)** — Ressource/Elemente: verbraucht **Mana** (WIS = Regen), **Statuseffekte** (Brennen=DoT, Frost=Gegner langsamer, Schock=Angriff überspringen), Burst/AoE, fragil (Glass Cannon).
- **KEIN Kampf-Dreieck / keine Resistenzen** — reiner Stat-Check: Schaden vs. EINE Verteidigung pro Gegner. Stile unterscheiden sich über ihre Mechanik, nicht über Gegner-Konter.
- **Waffe bestimmt den Stil, Attribut skaliert ihn.** Frei wechselbar (Spezialisieren ODER hybrid per Loadout). Passt zu „keine Klasse".
- **Combat-Loop**: Idle/Auto-Battle auf Ticks. Spieler vs. Gegner, je ein Angriffs-Timer (`attackIntervalMs`). Angriff = Treffer-Roll (accuracy vs evasion) → Schaden → Krit → On-Hit (Lebensraub/Status). Gegner tot → Loot + Kampf-XP + Respawn. Spieler tot → raus aus dem Gebiet (milde Strafe, idle-typisch). HP regeneriert passiv (+ später Essen/Tränke).
- **Mitigation = PROZENTUAL** (Balance-Pass 2, 2026-06-23): `damage = max(1, round(raw · (1 − defense/(defense+DEFENSE_MITIGATION_K))))`, K=100. Ersetzt die alte flache Subtraktion (`raw − def·0.5`), die ab `defense ≥ Mob-Damage` alles auf den 1er-Boden drückte → Spieler war praktisch unverwundbar (der „Warlock macht kaum Schaden"-Bug). Prozent-Modell: hohe Verteidigung dämpft, nullt aber nie. Referenz: nackt def 22 → 20 Schaden, Iron-Set def 83 → 13 Schaden vom Warlock (24 Basis). Test: `mitigation.test.ts`. Doc: `design/balance-combat-2.md`.
- **Ressourcen**: HP (alle) + Mana (nur Magie, Regen aus WIS). Kein Stamina.
- **Progression — granulare Kampf-Skills** (entschieden 2026-06-22, RuneScape-artig, ersetzt die provisorischen melee/ranged/magic):
  - **Angriff** (Nahkampf-Treffgenauigkeit) → trainiert DEX
  - **Wucht** (Nahkampfschaden; NICHT „Stärke" genannt, um Namensklausch mit dem Attribut Stärke/STR zu vermeiden — User-Entscheidung) → trainiert STR
  - **Verteidigung** (Verteidigung/Ausweichen) → trainiert CON
  - **Fernkampf** → trainiert DEX
  - **Offensive Magie** → trainiert INT
  - **Defensive Magie** → trainiert WIS
  - **Wirkung = direkt + via Attribut** (User-Entscheidung): Skill-Level gibt in `computeStats` DIREKT Boni (z.B. Wucht→meleeDamage, Angriff→accuracy, Verteidigung→defense/evasion) UND trainiert via `trains` das Attribut. Doppelte, spürbare Progression.
  - **XP-Routing = OSRS-Stil** (`character.combatStyle`: "attack"|"power"|"defensive", Auswahl im Battle-Screen): Nahkampf-Schadens-XP geht NUR an den gewählten Stil-Skill (`MELEE_XP_PER_DAMAGE`=0.13 nach Pass 2, da nur noch 1 statt 2 Skills mitsteigen), nicht mehr an attack+power gleichzeitig. Stil-Boni: Attack→accuracy ×1.12, Wucht→Schaden ×1.12, Defensiv→defense ×1.15. Kill-Bonus (`monster.xp`) wird ebenfalls nach Stil geroutet (ranged→ranged, magic→magic_off). **Vitality** bekommt immer XP aus ausgeteiltem Schaden. **Verteidigung** hat ZUSÄTZLICH einen passiven Pfad: jeder eingesteckte Treffer gibt Defence-XP (`DEFENCE_XP_PER_DAMAGE`), unabhängig vom Stil.
  - Skills haben (noch) keinen Sidebar-Eintrag. `ItemDef.requirements` (Min-Skill zum Tragen) ist im Modell vorhanden, Enforcement kommt mit echten Equip-Items.
  - `DerivedStats` hat jetzt auch `rangedDamage` + `evasion`.
- **Gegner-Modell** (content-driven): `MonsterDef { id, name, level, maxHp, damage, accuracy, evasion, defense, attackIntervalMs, loot, xp }`. Art unter `assets/monsters/` (goblin, goblin_shaman schon da).
- **Status-Effekte** (Engine): Combatant hat aktive Effekte `{ type, remainingMs, magnitude }`, ticken pro Tick.

**Geplante Bau-Reihenfolge (inkrementell):** 1) Gegner-Content + Combat-State + Auto-Battle-Tick-Loop mit NUR Nahkampf. 2) Drei Kampf-Skills (XP→Attribute). 3) Fernkampf (Krit/Evasion/Tempo) + Magie (Mana + Status). 4) Kampf-UI-Seite (ersetzt Platzhalter). Alles in `packages/engine` (rein/deterministisch), Save-Logik mitziehen (Combat-State serialisieren). Siehe [[game-design]], [[combat-concept]].
