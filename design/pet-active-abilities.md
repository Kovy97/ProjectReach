# Pet Active Abilities — getriggerte Kampf-Aktionen (Chef-freigegeben 2026-06-26)

Ersetzt die bisherigen %-`combatEffect`. **Skill-Passiv bleibt unverändert.** Jedes Pet bekommt eine **getriggerte Spezial-Aktion** im Kampf:
- **Intervall-Trigger** (z.B. alle ~3–6s je Pet/Stärke), unabhängig vom Spieler-Angriff.
- **Combat-Log-Eintrag** je Auslösung (flavor + Wirkung).
- **Animation:** das Pet **springt zum Gegner** (wie der Charakter bei seiner Aktion), führt die Aktion aus, springt zurück.
- Gedeckelt/fair (Sim `AUFFÄLLIGKEITEN` muss grün bleiben). Nur 1 Pet aktiv, kein Stacking.
- Framework **erweiterbar** gedacht (Magie-Waffen-Zauber könnten dieselbe „getriggerte Combat-Ability"-Maschinerie später mitnutzen).

## Anker-Beispiel (Chef)
**Gloomrat (Thieving):** versucht im Intervall, ein Item aus dem **Droptable des aktuellen Monsters** zu klauen → bei Erfolg sofort gutgeschrieben + Log „Gloomrat erbeutet <Item>!".

## Abilities (id → Skill → Aktion)
| Pet | Skill | Getriggerte Aktion |
|---|---|---|
| rotbark | Woodcutting | Wurzel-Snare → kurzer Stun (überspringt Gegner-Angriff) |
| cragmaw | Mining | schleudert Felsbrocken → Burst-Bonusschaden |
| gillrot | Fishing | hakt & reißt heran → Bonus-Treffer |
| witherling | Farming | sät Blight-Samen → verzögerte DoT-Explosion |
| sporewretch | Foraging | Sporenwolke → Poison + Gegner-Accuracy down |
| gloomrat | Thieving | **klaut Item aus Monster-Droptable** (Anker) |
| slagfiend | Smithing | glüht Waffe → nächster Treffer mit schwerem Burn |
| ashgut | Cooking | verschlingt Brocken → heilt Spieler kräftig |
| quillshrike | Fletching | Stachel-Salve → Multi-Hit-Fernkampf-Burst |
| flayling | Leatherworking | häutet Gegner → Rüstungsbruch (nimmt mehr Schaden) |
| gemwraith | Jewelcrafting | prismatischer Strahl → garantierter Krit-Burst |
| glyphmaw | Runecrafting | brandmarkt Rune → detoniert (Arkanschaden) + Mana zurück |
| hemlock | Herblore | wirft Giftphiole → starkes stapelndes Gift |
| vellumoth | Inscription | entrollt Schutzschriftrolle → kurzer Absorb-Schild |
| gorehound | Attack | stürzt sich & zerfleischt → tiefes Bluten |
| ironmaw | Power | Body-Slam → Gegner taumelt (Angriff verzögert) |
| carapace | Defence | schirmt ab → blockt nächsten Gegner-Treffer komplett |
| carrionwing | Ranged | Sturzflug → rüstungsdurchdringender Treffer |
| pyreling | Magic-off | Flammen-Nova → schwerer Burn-Burst |
| hoarspite | Magic-def | tödlicher Frost → friert Gegner (Angriff übersprungen) + Mana zurück |
| charnel | Vitality | labt sich am Verwundeten → Lebensraub-Burst (heilt) |

## Effekt-Bausteine (Framework-Kinds, gedeckelt)
stun/skipEnemyTurn · burstDamage · onHitStatus(burn/poison/bleed/frost — sofort appliziert) · delayedDot · accuracyDownEnemy · stealDrop · heal · shield/absorb · armorRend(enemy takesMore) · guaranteedCrit · manaRestore · lifestealBurst · enemyAttackDelay · blockNextEnemyHit · armorPierceHit · multiHit. Intervalle + Werte beim Bau austarieren.

## Phasen
1. Engine: getriggertes Ability-Framework (Intervall im combat-Loop, Effekt-Dispatch der Kinds, Log) + Datenmodell (`PetDef.combatAbility` ersetzt `combatEffect`). Migration/SAVE.
2. Content: je Pet die Ability zuweisen + Werte.
3. UI: Pet-Sprung-zum-Gegner-Animation + Log-Darstellung.
