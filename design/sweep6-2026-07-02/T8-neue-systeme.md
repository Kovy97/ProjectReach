# T8 — Heutige-Systeme-Prober (adversarial) — Sweep 6, 2026-07-03

Prober: Kontrolleur (T8). Methode: Code-Audit (combat.ts / character.ts / consumable.ts / tick.ts /
equipment.ts / dungeon.ts / persistence) + Wegwerf-Harness `_tmp_s6t8_*` (21 Engine- + 1 Persistenz-Probe,
alle gelaufen, danach gelöscht). Kein Fix vorgenommen.

**Gesamtbild: Die heute gelandeten Systeme sind sauber verdrahtet.** Kein P1, kein P2.
Alle sechs Prüf-Achsen halten den adversarialen Proben stand. 2× P3 (Anzeige-Drift, latenter
Pfad), 3× P4 (Härtungs-/Doku-Notizen).

---

## Findings

### P3-1 · Tooltip zeigt Pfeilschaden/DPS bei LEEREM Köcher — Anzeige lügt gegen die Engine
`apps/client/src/renderer/components/ItemTooltip.tsx:399–405` liest für Range-Form-Bögen nur
`state.character.equipment.ammo` (Item-Def des Köcher-Slots) — **nicht `state.ammoCount`**.
Die Engine zählt `ammoDamage` nur bei `ammoCount >= 1` in die Spanne
(`packages/engine/src/character.ts:327–331`). Zustand ist real erreichbar: alle Pfeile verschossen,
Slot bleibt belegt (`performPlayerAttack` dekrementiert nur die Menge; Auto-Reload kann scheitern).
Messung (Harness E4): maxHit mit Köcher 2.66, mit leerem Köcher 2.56 — Tooltip zeigt weiter den
+0.1-Pfeil-Anteil und KEINEN „ohne Munition"-Hinweis (der `noAmmo`-Hint greift nur bei leerem Slot).
Bei höheren Pfeil-Tiers wächst die Lüge absolut. **Fix-Owner: ui-dev** (Bedingung um
`state.ammoCount >= 1` ergänzen, sonst `noAmmo`-Pfad).

### P3-2 · Latenter Stale-Monster-Tick, falls `cooldownOnKill` je ≥ KILL_COOLDOWN_MS wird
`packages/engine/src/combat.ts:636–661` (`beginKillCooldown`): drückt `cooldownOnKill` den Cooldown
auf **0**, kehrt `onEnemyDefeated` im **Dungeon-Wellen-Pfad** (combat.ts:791–809) zurück, ohne dass
der restliche Tick anhält — die Guards (combat.ts:1547/1553/1580 `killCooldownActive`) sind dann false,
und der Tick rechnet mit dem **lokalen `monster` der ALTEN Welle** weiter (Pet-Ability-Schaden aus
altem `maxHp`, XP-Dämpfung/bane-family/enrage/Gegner-Angriffswerte der alten Welle gegen die neue
`enemyHp`). Heute unerreichbar: max. `cooldownOnKill.durationMs` im Content ist 2000 (kektus-Bogen,
content:2654) vs. `KILL_COOLDOWN_MS = 5000`. Ein künftiger Content-/Tuning-Drop (Cooldown senken ODER
stärkere cooldownOnKill-Waffe) macht den Pfad scharf. **Fix-Owner: combat-dev** (nach Wellen-Vorrücken
bei `cooldownMs <= 0` den Tick beenden oder `monster` neu auflösen) — billige Defensiv-Zeile.

### P4-1 · Save/Reload überspringt den laufenden Kill-Cooldown, der Kampf selbst läuft aber weiter
`packages/persistence/src/index.ts:807–828` (migrateState) baut `state.combat` mit fixer Feldliste neu
auf → `cooldownRemainingMs`/`lastKill`/`autoEatCooldownMs`/`autoPotionCooldownMs` fallen bei JEDEM Load
weg, `monsterId` bleibt (Harness B3: nach Load `cooldownRemainingMs=undefined`, `monsterId=goblin` →
Respawn kämpft sofort, auch im Offline-Catch-up). Das ist in `shared/src/index.ts:2727` ausdrücklich
als „transient, NICHT persistiert" dokumentiert und praktisch nicht exploitbar (Reload kostet mehr als
die ersparten ≤5 s). Asymmetrie bleibt aber: Stop/Start/Flucht/Tod übernehmen den Rest strikt
(combat.ts:229/248/941, dungeon.ts:69–75 — Harness-verifiziert), nur der Load-Pfad nicht. Wenn der
Chef den Cooldown je auf 15–30 s anhebt, lohnt das Persistieren. **Owner: logic-dev, nur bei Tuning.**

### P4-2 · Auto-Trank bei Schwelle 1.0: Trank-Verbrauch bei VOLLEN HP (0 Heilung)
`combat.ts:127–144`: Bedingung `hp > maxHp*threshold` ist bei `threshold=1` und vollen HP false →
Trank wird alle 5 s konsumiert, heilt 0 (Harness A1: 5→4 Tränke bei hp 11/11). Engine/sanitize klemmen
auf [0,1] **inklusive** 1.0 (`combat.ts:319–322`, persistence:144); nur die UI verhindert es
(Slider 10–90 %, CombatPage.tsx:1870–1872). Erreichbar allein per Save-Edit/API → Selbstschaden.
Billige Härtung: `if (hp >= maxHp) return;` in `tryAutoPotion` oder Klemme ≤0.95. **Owner: combat-dev.**

### P4-3 · Auto-Rebuff eines Combo-Items (Buff + healAmount) heilt beim Nachtrinken schwellenlos
`consumable.ts:93–106`: Rebuff läuft über `useConsumable` → ein Tonikum, das AUCH heilt, heilt beim
automatischen Nachtrinken unabhängig von jeder HP-Schwelle mit. Dokumentiert gewollt („identisch zum
manuellen Verzehr"); notiert, weil künftige Combo-Tonika damit faktisch ein zweiter, schwellenloser
Heilkanal am Auto-Trank-Cooldown vorbei wären. Aktuell kein Content-Träger mit relevanter Heilung
bekannt → reine Design-Notiz. **Owner: content-dev (beim Anlegen von Combo-Tonika bedenken).**

---

## Verifiziert sauber (Probe-Ergebnisse je Auftrags-Achse)

**(a) Auto-Trank** — Schwelle EXAKT = trinkt (Grenze inklusive, wie dokumentiert „auf/unter");
knapp darüber = nicht. Trank-Mangel/Fehlkonfiguration = stiller No-op, kein Crash, kein RNG-Draw.
Cooldown tickgenau (bestehende Suite) und getrennt vom Auto-Eat (beide feuern unabhängig im selben
Tick; Eat-first-Ordnung an allen 3 Callsites: combat.ts:1509f/1557f/1647f). Ein lethaler DoT-Tick im
Kill-Cooldown wird von Trank/Food noch abgefangen (Reihenfolge DoT→Eat→Trank→Death-Check — konsistent
zum Auto-Eat-Design, Harness A2). Rebuff-Loop: keine Buff-Dauer < 10 s im Content (min-Scan F5), Rebuff
zieht kein RNG, Verbrauch = 1 Tonikum/Laufzeit → Gold-Drain über den Shop plausibel-moderat, kein
Tick-Drain möglich. Buffs ticken seit heute PRO TICK → offline==online bit-identisch (bestehender
Determinismus-Test grün).

**(b) Kill-Cooldown** — Kill setzt exakt `KILL_COOLDOWN_MS` (50 Ticks): im Fenster KEINE Kills, KEIN
Gold, Respawn-HP unangetastet, `lastKill.expiresInMs` synchron, tickgenaues Ende (Feld → undefined).
Kills/h-Mathe: gemessene Kill-Abstände 92/91/92 Ticks ≥ 50-Tick-Cooldown, kein Leak (Harness B4).
Keine Doppel-Rewards: jeder Kill-Pfad (Schlag/DoT/Pet/Thorns) ruft `onEnemyDefeated` genau einmal,
danach harte Guards (combat.ts:1547/1553/1580/1656). Cooldown-Skip: Flucht (stopCombat), Gegnerwechsel
(startCombat), Dungeon-Start (dungeon.ts:74) und Tod übernehmen ALLE den Rest — nur Save/Load nicht
(→ P4-1). Dungeon-Abschluss bewusst cooldown-frei (Chef-Vorgabe), über Schlüssel gegated.

**(c) Tod bricht Kampf** — Genau EIN `deaths++`, harter Stopp (`monsterId`/`dungeonId` null,
`stopReason="defeated"`), Vollheilung, Transient-State (DoTs/Pet/Timer/encounterXp/effectCounters)
verfällt, KEINE Kill-Rewards durch den Tod (Gold/Loot/Offensiv-XP unverändert; nur legitime
Vitality-XP des erlittenen DoTs). Folge-Ticks: kein Doppel-Tod, kein Kampf. Auto-Restart-Verbot:
Engine startet nichts neu (step() geht in den Skilling-Zweig); UI ruft `startCombat` ausschließlich
auf explizite Klicks (CombatPage.tsx:1304/1314/1544/1554). Tod IM Cooldown lässt den Rest stehen,
der nächste manuelle Start erbt ihn.

**(d) Skill-Boosts** — Anti-Exploit hält: `meetsRequirements` (equipment.ts:42–49), `combatLevel`
(dungeon.ts:17–29), Aktions-Gates und `combatXpLevelMult` lesen sämtlich BASIS-Level. Harness:
cutpurse_ring (+1 attack) schaltet gravesteel_blade (req attack 24) bei Basis 23 NICHT frei;
Kill-Bonus-XP mit/ohne Boost bit-identisch (48.615 == 48.615). Stacking Ring+Ring2+Amulett ADDITIV
(garnet_ring+ruby_ring+fang_necklace → power +3 = Σ), exakt die dokumentierte Regel
(itemization-2-spec §4.1 „Σ aus item.skillBoost, set.skillBoost, Suffix-Rolls"). Boost wirkt real in
den Kampftermen (accuracy steigt). `vitality` nicht boostbar (BOOSTABLE-Liste). Buff-Items können
keine Boosts tragen (EquipBonus hat kein skillBoost-Feld) — kein Trank-Boost-Bypass.

**(e) Waffen-Spannen** — Content-Scan über 245 Range-Form-Waffen: 0 Verstöße (min ≤ max, endlich,
≥ 0, kein halbes min/max-Paar, Tempo innerhalb Engine-Clamp 800–5000). 0 Legacy-Mainhands mehr im
Katalog; der Legacy-Ableitungspfad (flat×DMG_MAX_HIT_MULT, ×DMG_ROLL_FLOOR) stimmt weiterhin exakt
(unbewaffnet geprüft). Doppel-Guard in Engine: computeStats klemmt (character.ts:190–194) UND
resolveAttack klemmt (combat.ts:476–478). Anzeige==Engine: 38 Non-Crit-Rolls lagen alle in der
mitigierten Spanne [11..18] der angezeigten minHit/maxHit-Quelle (identische computeStats-Quelle,
CharacterPage/CombatPage lesen `stats.minHit/maxHit` direkt) — Abweichung 0 %. Krits ≤ Mittel-Anker.
Einzige Anzeige-Lüge: leerer Köcher (→ P3-1).

**(f) Effekt-Stacking-Kombos** — Entwarnung, „Budget-Sprengung" ist strukturell nicht möglich:
ALLE 12 multiplikativen Kinds (execute/bane/momentum/desperation/bounty/firstBlood/frostbite/surplus/
firstStrike/everyNth/vengeance/giantSlayer) leben ausschließlich auf **Mainhand**-Items (40 Items,
Slot-Scan F1); Offhand/Rüstung tragen nur thorns/packLeader/luckyStrike (nicht multiplikativ auf den
Schlag); Verzauberungs-Affixe fügen NUR Status-Procs hinzu (burn/frost/shock — content affixes,
14400ff) → man kann kein zweites Mult-Kind auf eine Waffe enchanten. Gleiches Kind aus mehreren
Quellen stapelt nicht (max-Magnitude, combat.ts:383–388). bane+execute+momentum gleichzeitig existiert
auf keinem Item. Worst-Case real: Peak ×2.0 (boar_tusk_mace firstStrike — nur der ERSTE Treffer der
Begegnung), Sustained ×1.30 (crude_waraxe desperation — nur unter 30 % eigener HP, risikogekoppelt).
gravesteel_blade bane ×1.25 nur gegen family=undead; alle bane-targetFamilies existieren als
Monster-family (kein toter Bane, F4). Dead-Wiring-Scan: keine Status-Procs außerhalb Mainhand (F6).

---

## Empfehlung
Kein Blocker. P3-1 (Tooltip-Pfeil-Drift) an ui-dev, P3-2 (Defensiv-Zeile Dungeon-Pfad) an combat-dev
— beides klein und gefahrlos nachziehbar; P4s als Backlog-Notizen. Die heutigen Systeme können so bleiben.
