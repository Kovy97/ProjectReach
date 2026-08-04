# Pet/Companion-Effekt-Redesign — implementierungsreife Spec (Task #276)

**Autor:** balance-designer · **Datum:** 2026-07-08 · **Status:** Design final, bereit für Umsetzung
**Chef-Vorgabe:** Jedes Pet bekommt einen coolen AKTIVEN Kampf-Skill + einen nützlichen, nicht-OP PASSIVEN Effekt. **VERBOTEN: jede Form von +x% XP** (Pets kommen meist nach Max-Level).
**Basis:** `packages/content/src/index.ts` (pets-Block, 21 Pets), `packages/engine/src/pets.ts`, `packages/engine/src/combat.ts` (`tickPetAbility`/`firePetAbility`), `packages/shared/src/index.ts` (Taxonomien + Caps). Ersetzt die Wertetabellen aus `design/pet-active-abilities.md` und `design/pet-redesign-effects.md` (Themen bleiben, Zahlen/Details hier maßgeblich).

---

## 1. Bestandsaufnahme (IST)

Das Zwei-Effekt-Modell ist **vollständig verdrahtet**: `PetDef.skillEffect` (Passiv, tick.ts/computeStats) + `PetDef.combatAbility` (getriggerte Kampf-Aktion, eigener Intervall-Timer in `combat.ts`, Dispatch `firePetAbility` für alle 16 Kinds). Genau 1 Pet aktiv, kein Stacking, Caps in shared (`PET_SKILL_EFFECT_CAP`, `PET_ABILITY_CAP`), Guard `pet-integrity.test.ts`. Sim: alle 714 Tests grün, Kill-Zeiten geared ~3.8–10.6 s/Kill.

### IST-Roster (21 Pets)

| id | Quelle | Passiv (skillEffect) IST | Aktiv (combatAbility) IST |
|---|---|---|---|
| rotbark | woodcutting | instantAction 5% | stun 600 ms / 5 s |
| cragmaw | mining | doubleDrop 5% | burstDamage 8% maxHp / 4 s |
| gillrot | fishing | doubleDrop 5% | burstDamage 7% maxHp / 5 s |
| witherling | farming | gatherYield 4.5% | delayedDot poison mag 0.7/s / 5.5 s |
| sporewretch | foraging | doubleDrop 5% | onHitStatus poison mag 0.6/s / 5.5 s |
| gloomrat | thieving | thievingSuccess 3% | stealDrop 50% / 5 s |
| slagfiend | smithing | refundMaterial 5% | onHitStatus burn mag 0.6/s / 4 s |
| ashgut | cooking | perfectCook 4% | heal 10% maxHp / 5 s |
| quillshrike | fletching | bonusAmmo 5% | multiHit 3×4% maxHp / 4.5 s |
| flayling | leatherworking | gatherYield 4% | armorRend +20% (3 s) / 5 s |
| gemwraith | jewelcrafting | flawlessGem 5% *(Referenz)* | guaranteedCrit 10% maxHp / 4.5 s |
| glyphmaw | runecrafting | bonusRunes 4.5% | manaRestore 30% maxMana / 5 s |
| hemlock | herblore | potionPreserve 5% | onHitStatus poison mag 0.8/s / 5 s |
| vellumoth | runecrafting (!) | **skillXp runecrafting 4% — VERBOTEN** | shield 10% maxHp / 6 s |
| gorehound | combat | **skillXp attack 5% — VERBOTEN** | onHitStatus bleed mag 0.9/s / 4.5 s |
| ironmaw | combat | **skillXp power 5% — VERBOTEN** | enemyAttackDelay 600 ms / 5 s |
| carapace | combat | **skillXp defence 5% — VERBOTEN** | blockNextEnemyHit / 6 s |
| carrionwing | combat | **skillXp ranged 5% — VERBOTEN** | armorPierceHit 10% maxHp / 4.5 s |
| pyreling | combat | manaRegen 5% | onHitStatus burn mag 1.0/s / 4.5 s |
| hoarspite | combat | manaRegen 4% | stun 1200 ms / 5.5 s |
| charnel | combat | **skillXp vitality 5% — VERBOTEN** | lifestealBurst 9% / 5 s |

### Befunde (Auffälligkeiten)

- **B1 — XP-Verbot verletzt (6 Pets):** vellumoth, gorehound, ironmaw, carapace, carrionwing, charnel tragen `skillXp`. combat.ts wendet `petSkillXpMult` sogar auf Kampf-XP an (Z. ~206). Alle 6 Passive werden ersetzt; das Kind `skillXp` wird KOMPLETT aus der Taxonomie gelöscht (Guard erzwingt das dauerhaft).
- **B2 — Flat-DoTs wirkungslos:** `onHitStatus`/`delayedDot` nutzen flache Magnitude/s (0.6–1.0). Das sind ~2–6 Gesamtschaden pro Trigger — gegen Endgame-Monster (200–358 maxHp) ≈ 0.2–0.8% je Proc, faktisch Null. Zum Vergleich: Endgame-WAFFEN legen burn/bleed mit Magnitude 8–10/s. → Semantik-Umstellung auf **Bruch von enemy.maxHp pro Sekunde** (§5.1), damit die 6 DoT-Pets automatisch mitskalieren wie burstDamage.
- **B3 — stealDrop hebelt die Rare-Drop-Philosophie aus:** `firePetAbility` zieht den Loot-Eintrag **gleichverteilt** (`nextInt(0, loot.length-1)`) und ignoriert `roll.chance`. Monster-Tabellen enthalten Chase-Equipment mit chance 0.0019–0.0028 (1/350–1/500, teils mit suffixChance 0.30). Bei 50%/5 s und 4–11 s TTK klaut gloomrat so ein „1/500"-Item effektiv alle ~10 Kills. → Bindungsregeln in §5.2.
- **B4 — carapace-Block zu stark:** blockNextEnemyHit alle 6 s vs. Gegner-Angriffsintervalle 2.4–3.7 s blockt ~40–60% aller Treffer — mit Abstand stärkstes Defensiv-Pet. → Intervall 10 s (≈ 24–37% Mitigation, weiterhin Premier-Tank-Pet).
- **B5 — Doppelbelegung runecrafting:** vellumoth (Ex-Inscription-Pet, Skill entfernt) wurde auf source runecrafting umgehängt → 2 Pets droppen aus einem Skill, Passiv kollidierte thematisch mit glyphmaw. Bleibt als Doppel-Drop-Quelle akzeptiert, aber Drop-Raten beider Pets werden angeglichen (§6) und vellumoth bekommt ein eigenständiges Ökonomie-Passiv.
- **B6 — Beschreibungs-Mismatch gillrot:** Der Beschreibungstext verspricht einen Low-HP-Heal („breathes something foul back into your veins"), die Ability ist burstDamage. Ability bleibt (Themen-Freigabe 2026-06-26), Beschreibungs-Schlusssatz wird angepasst (§7, content-dev). Sporewretch-Text („swing wide and stupid") passt nach dem Kind-Wechsel auf accuracyDownEnemy sogar BESSER als vorher.

---

## 2. Power-Budget-Framework (verbindlich)

Referenzgrößen: Sim-TTK geared 4–11 s; Gegner-Angriffsintervall 2.4–3.7 s; `MASTERY_DOUBLE_CAP` = 50% (Mastery 99 ≈ 49% Doppelertrag); Buff-Food/Tonika ≈ +10% Doppelertrag für 5 min; Endgame-Waffen-DoTs Magnitude 8–10/s bei 20–60% Proc-Chance; gemwraith-Passiv 5% = freigegebenes Referenz-Powerlevel.

| Rolle | Budget | Messgröße |
|---|---|---|
| **Aktiv, offensiv** | **1.8–2.2% enemy.maxHp pro Sekunde** (normalisiert: value×Wirkdauer ÷ intervalMs) | ≈ 8–22% des Kill-Schadens bei 4–11 s TTK — spürbar, nie dominant |
| **Aktiv, defensiv/Kontrolle** | ≤ ~20–25% vermiedener Gegner-Schaden (Stun-Uptime, Block-Quote, Acc-Down×Uptime) ODER ≤ 2% player.maxHp/s Heilung/Schild | Kein Pet macht unbesiegbare Gegner besiegbar (Sim-Walls bleiben Walls) |
| **Aktiv, Utility** | kein DPS; Ökonomie/Ressourcen mit harten Bindungsregeln (§5.2) | stealDrop/manaRestore |
| **Hybrid** (charnel) | Summe der Teilbudgets ≤ 140% eines Einzelbudgets → je Teil ~1.4%/s | |
| **Passiv, Skilling/Ökonomie** | ≤ 5% (additiv auf bestehende Mechanik) | = 1/10 des Mastery-Caps, halbes Buff-Food; Referenz gemwraith |
| **Passiv, Kampf-Utility** | ≤ ~3% effektiver Throughput (Lifesteal 1.5%, Schadensreduktion 3%, +2 Skill-Boost-Level) | klar unter einem Gear-Slot-Upgrade |
| **Passiv, XP** | **0. Existiert nicht mehr.** | Guard-Test verbietet das Kind |

Skalierung: Alle %-Werte referenzieren `enemy.maxHp`, `player.maxHp` oder `player.maxMana` → **implizite Skalierung mit Spielfortschritt**, keine Level-Formeln nötig. Flache ms-Werte (stun/delay) skalieren nicht und brauchen es nicht (Angriffsintervalle sind level-unabhängig ~2.4–3.7 s).

---

## 3. Aktive Kampf-Skills (SOLL) — pro Pet, mit Namen

Neu: **jede Ability bekommt einen Anzeigenamen** `combatAbility.name: { en, de }` (Datenmodell §7.1) für Combat-Log, Pet-Card und die Sprung-Animation. Trigger bleibt der bestehende Intervall-Timer (`intervalMs`), unabhängig vom Spieler-Angriff; Werte bereits über `PET_ABILITY_CAP` geklemmt.

DoT-Kinds (`onHitStatus`/`delayedDot`) nutzen ab jetzt die **neue %-Semantik** (§5.1): value = Bruch enemy.maxHp **pro Sekunde** Status-Laufzeit (onHitStatus 3 s, delayedDot 6 s — Konstanten unverändert).

| id | Ability-Name EN | Ability-Name DE | kind | intervalMs | value IST → SOLL | Wirkung (konkret) | Norm-Budget |
|---|---|---|---|---|---|---|---|
| rotbark | Root Snare | Wurzelschlinge | stun | 5000 | 600 → **600** (ms) | Gegner setzt 0.6 s aus | 12% Uptime-Cut (def) |
| cragmaw | Boulder Toss | Felswurf | burstDamage | 4000 | 0.08 → **0.08** | Sofortschaden 8% enemy.maxHp | 2.00%/s ✓ |
| gillrot | Hook & Tear | Haken & Riss | burstDamage | 5000 | 0.07 → **0.10** | Sofortschaden 10% enemy.maxHp | 2.00%/s (war 1.40 ✗) |
| witherling | Blight Bloom | Fäulnisblüte | delayedDot (poison) | 5500 | 0.7 flat → **0.018** | Gift: 1.8% maxHp/s über 6 s (= 10.8%/Trigger) | 1.96%/s ✓ |
| sporewretch | Spore Cloud | Sporenwolke | **accuracyDownEnemy** (Kind-Wechsel, war onHitStatus poison) | 5500 | **0.35** | Gegner-Trefferchance −35% für 3 s | ≈ −19% Gegner-Treffer (def) |
| gloomrat | Pilfer | Diebesgriff | stealDrop | 5000 → **6000** | 0.5 → **0.40** | klaut 1 Item aus dem Monster-Loot — **mit Bindungsregeln §5.2** | Utility (Anker-Pet) |
| slagfiend | Forge Brand | Schmiedebrand | onHitStatus (burn) | 4000 | 0.6 flat → **0.027** | Brand: 2.7% maxHp/s über 3 s | 2.03%/s ✓ |
| ashgut | Gorge | Verschlingen | heal | 5000 | 0.10 → **0.10** | heilt 10% player.maxHp | 2% maxHp/s Sustain (def) |
| quillshrike | Quill Volley | Kielsalve | multiHit | 4500 | 0.04 → **0.03** | 3 schnelle Treffer à 3% enemy.maxHp | 2.00%/s (war 2.67 ✗) |
| flayling | Flay | Häuten | armorRend | 5000 | 0.20 → **0.20** | Gegner nimmt +20% Schaden für 3 s | ≈ +12% Spieler-DPS ✓ |
| gemwraith | Prismatic Lance | Prismenlanze | guaranteedCrit | 4500 | 0.10 → **0.09** | garantierter Krit-Burst 9% enemy.maxHp | 2.00%/s (war 2.22) |
| glyphmaw | Rune Feast | Runenfraß | manaRestore | 5000 | 0.30 → **0.30** | +30% player.maxMana | Caster-Batterie (Utility) |
| hemlock | Venom Phial | Giftphiole | onHitStatus (poison) | 5000 | 0.8 flat → **0.033** | Gift: 3.3% maxHp/s über 3 s | 1.98%/s ✓ |
| vellumoth | Sigil Ward | Siegelschirm | shield | 6000 | 0.10 → **0.10** | Absorb-Schild 10% player.maxHp (max-Refresh) | ≤1.7% maxHp/s Schild (def) |
| gorehound | Maul | Zerfleischen | onHitStatus (bleed) | 4500 | 0.9 flat → **0.030** | Blutung: 3.0% maxHp/s über 3 s | 2.00%/s ✓ |
| ironmaw | Body Slam | Rammstoß | enemyAttackDelay | 5000 | 600 → **600** (ms) | Gegner-Angriffs-Timer −600 ms | ≈ 12% Gegner-Slow (def) |
| carapace | Bulwark | Bollwerk | blockNextEnemyHit | 6000 → **10000** | — | blockt den nächsten Gegner-Treffer komplett | 24–37% Mitigation (war 40–60% ✗, B4) |
| carrionwing | Death Dive | Sturzflug | armorPierceHit | 4500 | 0.10 → **0.09** | Sofortschaden 9% enemy.maxHp, ignoriert Rüstung | 2.00%/s (war 2.22) |
| pyreling | Flame Nova | Flammennova | onHitStatus (burn) | 4500 | 1.0 flat → **0.030** | Brand: 3.0% maxHp/s über 3 s | 2.00%/s ✓ |
| hoarspite | Grave Frost | Grabfrost | stun | 5500 | 1200 → **1100** (ms) | friert den Gegner 1.1 s ein | 20% Uptime — Premier-Control ✓ |
| charnel | Feast of the Fallen | Mahl der Gefallenen | lifestealBurst | 5000 | 0.09 → **0.07** | 7% enemy.maxHp Schaden + heilt 7% player.maxHp | 1.4%/s + 1.4%/s (Hybrid-Split) |

Identitäts-Check der 3 Kampfstile bleibt gewahrt: Kein Pet ist stil-exklusiv; carrionwing (Pierce) schmeichelt Ranged, glyphmaw/hoarspite Magie, gorehound/charnel Melee-Lifesteal-Identität — alle im selben Budget, kein Pflicht-Pet pro Stil.

---

## 4. Passive Effekte (SOLL)

### 4.1 Unverändert (15 Pets — bereits im Budget, Referenz gemwraith)

| id | Passiv | Wert | Warum nicht OP |
|---|---|---|---|
| rotbark | instantAction woodcutting | 5% | ≙ ~5% Zeitersparnis; 1/10 Mastery-Cap |
| cragmaw | doubleDrop mining | 5% | additiv auf Mastery-Doppelertrag (Cap 50%) → +5 Pp., relativ ~+3–10% Ertrag |
| gillrot | doubleDrop fishing | 5% | wie cragmaw |
| witherling | gatherYield farming | 4.5% | Farming ist harvest-arm; 4.5% ist Komfort |
| sporewretch | doubleDrop foraging | 5% | wie cragmaw |
| gloomrat | thievingSuccess | 3% | additiv auf Erfolgschance (Cap 0.95 bleibt); enger Cap 3% |
| slagfiend | refundMaterial smithing | 5% | ≙ 5% Materialersparnis, halbes Buff-Food |
| ashgut | perfectCook cooking | 4% | bewusst 1 Pp. unter Standard — Gegengewicht zum starken Heal-Aktiv |
| quillshrike | bonusAmmo fletching | 5% | Munitions-Komfort |
| flayling | gatherYield leatherworking | 4% | Ertrags-Komfort |
| gemwraith | flawlessGem jewelcrafting | 5% | **Referenz-Powerlevel (Chef-abgesegnet)** |
| glyphmaw | bonusRunes runecrafting | 4.5% | Ertrags-Komfort |
| hemlock | potionPreserve herblore | 5% | Materialersparnis |
| pyreling | manaRegen (global) | 5% | Caster-Komfort; multiplikativ auf Regen, nicht auf Schaden |
| hoarspite | manaRegen (global) | 4% | 1 Pp. unter pyreling (hat das stärkere Aktiv) |

### 4.2 Ersetzt (6 Pets — alle IST-`skillXp`, Chef-Verbot)

Sechs **neue** `PetSkillEffectKind`-Einträge (Caps in §5.3). Kein einziges XP-Kind mehr im System.

| id | Passiv-Name (Log/Card) | Neues Kind | Wert | Wirkung (konkret) | Warum nicht OP |
|---|---|---|---|---|---|
| gorehound | Blood Tithe / Blutzehnt | `lifesteal` | **0.015** | +1.5% Lebensraub auf allen Spieler-Schaden (additiv in den bestehenden `lifesteal`-Aggregat von computeStats) | Gear-Lifesteal-Quellen liegen bei ~10%; 1.5% ist Komfort, kein Wall-Breaker |
| ironmaw | Bonecrusher / Knochenbrecher | `skillBoost` (skill: power) | **+2 Level** | +2 effektive Power-Level, NUR in den computeStats-Kampfformeln (wie Gear-Boosts: schaltet nichts frei, kein XP-Effekt, base-Level bleibt) | identisch zum existierenden Item-Boost („Ring of Power +2"); am Cap ≈ +1–2% DPS |
| carapace | Stoneshell / Steinpanzer | `damageReduction` | **0.03** | Spieler nimmt 3% weniger Schaden (multiplikativ, nach Armor/Ward) | deutlich kleiner als ein Rüstungs-Tier-Upgrade; stapelt nicht (1 Pet aktiv) |
| carrionwing | Scavenger / Aasfresser | `doubleLoot` | **0.05** | 5% Chance je Monster-Kill, den kompletten Loot-Wurf ein zweites Mal auszuführen (inkl. Gold; **ohne** Pet-Drop-Wurf, **ohne** Dungeon-Token) | Ökonomie-Spiegel des gemwraith-5%-Referenzlevels; verdoppelt im Mittel +5% Farm-Ertrag |
| charnel | Corpsefeeder / Leichenzehrer | `killHeal` | **0.03** | heilt 3% player.maxHp bei jedem Monster-Kill | reines Food-Sparen im Grind; im Kampf selbst (vor dem Kill) wirkungslos |
| vellumoth | Appraiser's Eye / Kennerblick | `sellBonus` | **0.05** | +5% Gold beim Verkauf von Items (Shop-Sell-Pfad) | Gold-Zufluss-Komfort; berührt Drops/Loot nicht; 5%-Referenzlevel |

**Ability-übergreifende Regel:** `skillXp` wird aus `PetSkillEffectKind`, `PET_SKILL_EFFECT_CAP`, `SKILL_SCOPED_PET_KINDS` **gelöscht**; `petSkillXpMult` (pets.ts) und seine Call-Sites (tick.ts Skilling-XP, combat.ts Z. ~203–206 Kampf-XP) werden entfernt. Der Guard-Test bekommt einen expliziten Verbots-Check („kein Pet trägt ein XP-Kind; das Kind existiert nicht").

---

## 5. Neue Semantiken, Regeln, Caps

### 5.1 DoT-Umstellung: Flat → %-basiert (B2)

`onHitStatus`/`delayedDot`: `value` bedeutet neu **Bruch von enemy.maxHp pro Sekunde** Status-Laufzeit. In `firePetAbility` (combat.ts) wird die an `applyEnemyStatus` übergebene Magnitude berechnet als:

```
magnitude = Math.max(1, Math.round(monster.maxHp * ability.value))   // pro Sekunde
```

frost bleibt reiner Slow (magnitude 0, unverändert). Laufzeiten unverändert (`PET_ABILITY_STATUS_MS` 3000, `PET_ABILITY_DELAYED_DOT_MS` 6000). Neue Caps: `onHitStatus: 0.04`, `delayedDot: 0.04` (statt 12 flat). Ergebnis: Pet-DoTs erreichen am Endgame genau die Magnituden-Region der Endgame-Waffen (0.03 × 358 maxHp ≈ 10.7/s) und sind früh nicht mehr trivial/nicht mehr OP (0.03 × 100 = 3/s).

### 5.2 stealDrop-Bindung (B3 — Rare-Drop-Schutz, PFLICHT)

Neue Auswahlregeln in `firePetAbility` case `stealDrop`:
1. **Filter:** nur Loot-Einträge mit `chance ≥ 0.05` sind stehlbar (Chase-/Rare-Einträge und Keys mit chance < 5% sind ausgeschlossen — kein Suffix-Equipment-Farming über das Pet).
2. **Auswahl:** gleichverteilt über die GEFILTERTE Liste (wie bisher, nur auf Commons).
3. **Menge:** `qty = roll.min` (statt Zufall min..max) — der Dieb klaut, er erntet nicht.
4. Leere gefilterte Liste → kein Effekt, kein Log (wie bisher bei leerem Loot).
5. Trigger 6000 ms, Erfolgschance 0.40 (Tabelle §3).
Damit bleibt gloomrat das coole Anker-Pet („klaut sichtbar Items") und liefert ~0.2–0.4 Common-Items pro Kill Mehrwert — Ökonomie-Komfort statt Chase-Bypass.

### 5.3 Cap-Änderungen (shared, `PET_ABILITY_CAP` / `PET_SKILL_EFFECT_CAP`)

| Konstante | Eintrag | IST | SOLL |
|---|---|---|---|
| PET_ABILITY_CAP | onHitStatus | 12 (flat/s) | **0.04** (Bruch maxHp/s) |
| PET_ABILITY_CAP | delayedDot | 12 (flat/s) | **0.04** (Bruch maxHp/s) |
| PET_SKILL_EFFECT_CAP | skillXp | 0.05 | **entfällt (Kind gelöscht)** |
| PET_SKILL_EFFECT_CAP | lifesteal | — | **0.02** |
| PET_SKILL_EFFECT_CAP | skillBoost | — | **2** (ganze Level; von der „≤5%-Bruch"-Guard-Prüfung ausnehmen) |
| PET_SKILL_EFFECT_CAP | damageReduction | — | **0.04** |
| PET_SKILL_EFFECT_CAP | doubleLoot | — | **0.05** |
| PET_SKILL_EFFECT_CAP | killHeal | — | **0.05** |
| PET_SKILL_EFFECT_CAP | sellBonus | — | **0.05** |

`SKILL_SCOPED_PET_KINDS`: `skillXp` raus; von den neuen Kinds ist NUR `skillBoost` skill-scoped (BoostableCombatSkillId, `vitality` bleibt wie bei Gear unboostbar); lifesteal/damageReduction/doubleLoot/killHeal/sellBonus sind global (wie manaRegen).

---

## 6. Nebenbefund Drop-Raten (kein Blocker, mitnehmen)

Sweep4 P2 hat Skilling-Pets auf 1/60000 normalisiert, drei blieben zurück: gloomrat 1/90000, glyphmaw 1/120000, vellumoth 1/90000. gloomrat → **1/60000** (Angleichung, Thieving ist aktionsreich). glyphmaw + vellumoth teilen sich die runecrafting-Quelle (B5): beide → **1/80000** (kombiniert ≈ 1/40k pro Aktion fürs erste Pet ≈ Erwartung der anderen Skills). witherling 1/15000 und alle Combat-Pet-Raten (1/75k–1/105k, Kills sind häufig) bleiben.

---

## 7. Implementierungs-Hinweise (Apply-Liste, in dieser Reihenfolge)

**Kein SAVE_VERSION-Bump nötig:** `ownedPets`/`companionPetId` bleiben unverändert; Effekte sind reine Content-/Typ-Daten, kein neuer State. (`PetAbilityRuntime` unverändert.)

### Schritt 1 — logic-dev (shared + engine, außer combat.ts)
1. `shared/src/index.ts`: `PetSkillEffectKind` — `skillXp` löschen, 6 neue Kinds ergänzen; `PET_SKILL_EFFECT_CAP` + `SKILL_SCOPED_PET_KINDS` gemäß §5.3; `PET_ABILITY_CAP.onHitStatus/delayedDot` → 0.04 (Kommentar-Tabelle der value-Semantik aktualisieren: „Bruch enemy.maxHp/s").
2. `PetCombatAbility` um `name: { en: string; de: string }` erweitern (PFLICHT-Feld; Guard prüft en+de nicht-leer).
3. `engine/src/pets.ts`: `petSkillXpMult` löschen; neue Lese-Helfer: `petLifesteal`, `petSkillBoost(skill)`, `petDamageReduction`, `petDoubleLootChance`, `petKillHealFraction`, `petSellBonus` (alle über `capSkill` geklemmt, Muster wie `petManaRegenMult`).
4. `engine/src/tick.ts`: `petSkillXpMult`-Call-Site entfernen. `engine/src/character.ts` (computeStats): `petLifesteal` in den bestehenden lifesteal-Aggregat, `petSkillBoost` in den bestehenden Skill-Boost-Aggregat (NUR Kampfformeln, wie Gear), `petDamageReduction` als neues abgeleitetes Feld. Shop-Sell-Pfad: `petSellBonus` (×1.05, runden wie bisher).
5. Tests: `pet-integrity.test.ts` (ALL_SKILL_KINDS aktualisieren + skillXp-Verbots-Check + combatAbility.name-Check + skillBoost-Cap-Sonderfall), betroffene Nutzungen von `petSkillXpMult` in `pet-combat.test.ts` u.a. ersetzen.

### Schritt 2 — combat-dev (combat.ts)
1. Kampf-XP: `petSkillXpMult`-Aufruf (Z. ~203–206) entfernen.
2. `firePetAbility`: DoT-%-Semantik (§5.1); stealDrop-Bindung (§5.2).
3. Kill-Pfad (nach Loot/Gold, vor `tryPetDrop`): `doubleLoot` — bei Erfolg Loot- UND Gold-Wurf einmal wiederholen (keine Rekursion, kein zweiter doubleLoot-/Pet-Wurf, keine Dungeon-Token); `killHeal` — `healPlayer(…, maxHp × 0.03, "effect")`.
4. Schadens-Pipeline Gegner→Spieler: `petDamageReduction` multiplikativ NACH Armor/Ward/Block anwenden (`damage = max(1, round(damage × (1 − dr)))`).
5. RNG-Disziplin wie gehabt: neue Würfe (doubleLoot) nur ziehen, wenn ein Pet mit dem Kind aktiv ist — Determinismus für pet-lose States bleibt bit-identisch (Muster `tryPetDrop`).

### Schritt 3 — content-dev (packages/content/src/index.ts, pets-Block)
1. Alle 21 `combatAbility`-Einträge exakt nach Tabelle §3 (kind/intervalMs/value/status + **name en/de**).
2. Die 6 Passiv-Ersetzungen exakt nach Tabelle §4.2 (gorehound/ironmaw/carapace/carrionwing/charnel/vellumoth).
3. Drop-Raten §6 (gloomrat 1/60000, glyphmaw 1/80000, vellumoth 1/80000) mit Kommentar „balance-fix 2026-07 (#276)".
4. Beschreibungs-Fix gillrot (B6): Schlusssatz auf Haken-Riss-Thema (EN: „…and in a fight it hooks deep and tears something loose." / DE: „…und im Kampf hakt es sich tief ein und reißt etwas los."). Übrige Texte passen (sporewretch deckt accuracyDown bereits ab).
5. Locale-Overlays `content/src/locales/*` (5 weitere Sprachen): neue Felder `pets.*.combatAbility.name` nachziehen — darf als Folge-Task an den nächsten Loc-Pass gehen, EN/DE sind die Quelle.

### Schritt 4 — ui-dev (klein, nach 1–3)
Combat-Log + Pet-Card/Galerie zeigen `combatAbility.name` statt generischem Kind-Text; i18n-Strings für die 6 neuen Passiv-Kinds (Anzeigetexte aus §4.2-Spalte „Wirkung"). `pnpm build` nicht vergessen (stale-build-Regel).

### Schritt 5 — kontrolleur
`pnpm test` (Turbo-Cache-Falle beachten: notfalls `--filter` direkt): Sim-Block muss grün bleiben (keine neuen AUFFÄLLIGKEITEN; die 6 bekannten Bronze-Baseline-Einträge sind vorbestehend), Guard-Tests neu: kein XP-Kind, Caps, Ability-Namen. Stichprobe „defined but never applied": alle 6 neuen Passiv-Kinds müssen in Engine-Pfaden konsumiert werden.

---

## 8. Nicht-Ziele
- Keine Pet-Level/-Fütterung/-Evolution (nicht Teil von #276).
- Keine VFX-Vergoldung (Combat-FX ist späterer Meilenstein; die bestehende Sprung-Animation + Log genügt).
- Keine Änderung am Drop-Mechanismus selbst (pures RNG, kein Pity — Rare-Drop-Philosophie).
