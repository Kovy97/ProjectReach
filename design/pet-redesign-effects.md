# Pet-Redesign — Zwei-Effekt-System (Chef-freigegeben 2026-06-25)

Jedes Pet hat **zwei** Effekte:
- **Skill-Passiv** (`skillEffect`) — wirkt im Herkunfts-Skill (immer, wenn Pet ausgerüstet).
- **Combat-Aktiv** (`combatEffect`) — wirkt im Kampf (Pet als Begleiter nutzbar).

Nur **1 Pet aktiv**, **kein Stacking**, alle Werte **gedeckelt** (balanciert, kein Pflicht-Must-Have). Grimm-Fantasy-Namen (id = lowercase name → Art-Datei `pets/<id>.png`). %-Werte sind Richtwerte (beim Bau austarieren, Caps setzen).

## Schema (Engine)
`PetDef = { id; name{en,de}; description?{en,de}; source:{kind:"skill";skill}|{kind:"combat"}; skillEffect:{kind; value?}; combatEffect:{kind; status?; value?}; dropChance; icon?; art? }`

## Roster (21)

### Skill-Pets — Skill · Passiv · Aktiv
| id | Skill | 🌿 skillEffect | ⚔️ combatEffect |
|---|---|---|---|
| rotbark | woodcutting | `instantAction` (Chance, Aktion sofort abzuschließen) | `enemySlow` (Chance, Gegner-Angriff zu verlangsamen) |
| cragmaw | mining | `doubleDrop` (Doppel-Erz inkl. Gems) | `damageReduction` (Steinhaut) |
| gillrot | fishing | `doubleDrop` (Doppel-Fang) | `healLowHp` (heilt bei niedriger HP) |
| witherling | farming | `gatherYield` (+Ernte) | `onHitStatus`(poison) |
| sporewretch | foraging | `doubleDrop` (Doppel-Ertrag) | `enemyAccuracyDown` (Sporen) |
| gloomrat | thieving | `thievingSuccess` (+Erfolg & Beute) | `stealGold` (Chance, bei Treffer Gold zu stehlen) |
| slagfiend | smithing | `refundMaterial` (Chance, Barren zu erstatten) | `onHitStatus`(burn) |
| ashgut | cooking | `perfectCook` (Chance, nicht zu verbrennen) | `autoEatBoost` (Auto-Eat heilt +mehr) |
| quillshrike | fletching | `bonusAmmo` (+Munition pro Craft) | `rangedCrit` (+Fernkampf-Krit) |
| flayling | leatherworking | `gatherYield` (+Leder) | `armorRend` (Gegner nimmt +Schaden) |
| gemwraith | jewelcrafting | `flawlessGem` (Chance auf besseren Gem) | `critDamage` (+Krit-Schaden) |
| glyphmaw | runecrafting | `bonusRunes` (+Runen) | `manaOnHit` (Mana bei Treffer) |
| hemlock | herblore | `potionPreserve` (+Trank-Erhalt) | `poisonPower` (Gift-Effekte +stärker) |
| vellumoth | inscription | `skillXp` (+Inscription-XP) | `periodicShield` (periodischer kleiner Schild) |

### Combat-Pets — Skill · Passiv · Aktiv
| id | Skill | 🌿 skillEffect | ⚔️ combatEffect |
|---|---|---|---|
| gorehound | attack | `skillXp` (+Attack-XP) | `onHitStatus`(bleed) |
| ironmaw | power | `skillXp` (+Power-XP) | `bonusCritChance` (Chance auf großen Krit) |
| carapace | defence | `skillXp` (+Defence-XP) | `reflect` (% reflektierten Schadens) |
| carrionwing | ranged | `skillXp` (+Ranged-XP) | `noAmmoChance` (Chance, ohne Munition zu schießen) |
| pyreling | magic_off | `manaRegen` (+Manaregen) | `onHitStatus`(burn) |
| hoarspite | magic_def | `manaRegen` (+Manaregen) | `onHitStatus`(frost) |
| charnel | vitality | `skillXp` (+Vitality-XP) | `healOnKill` (heilt bei Kill) |

## Effekt-Taxonomien (geschlossen, je gedeckelt)
- **skillEffect.kind:** instantAction · doubleDrop · gatherYield · thievingSuccess · refundMaterial · perfectCook · bonusAmmo · flawlessGem · bonusRunes · potionPreserve · skillXp · manaRegen.
- **combatEffect.kind:** onHitStatus (status ∈ burn/bleed/poison/frost, Chance×Wert) · enemySlow · enemyAccuracyDown · damageReduction · reflect · healLowHp · healOnKill · stealGold · autoEatBoost · rangedCrit · armorRend · critDamage · bonusCritChance · manaOnHit · poisonPower · periodicShield.
- Viele combat-Kinds docken an bestehende Mechaniken an (Status-System burn/bleed/poison/frost, Lifesteal, Mana-Schild) → implementierbar. Caps so wählen, dass Sim `AUFFÄLLIGKEITEN` grün bleibt.

## Phasen
1. **Engine (logic-dev):** Schema (zwei Effekte), beide Taxonomien + Caps, skillEffect-Anwendung (tick/computeStats), combatEffect-**API** für combat-dev, 21 IDs umbenennen + Migration (alt→neu), SAVE_VERSION-Bump, pet-integrity-Guard erweitern, 2-3 Beispiele.
2. **Content (content-dev):** 21 Pets mit neuen Namen + beiden Effekten.
3. **Combat (combat-dev):** combatEffect-Anwendung im Kampf (onHitStatus/reflect/manaOnHit/healOnKill/slow/…).
4. **UI (ui-dev):** beide Effekte auf Pet-Card/Slot/Galerie zeigen.
