# Meisterumhänge — Konzept (Level-99-Belohnung, Chef-GO 2026-07-09)

**Prinzipien:** Jeder Umhang wird bei der **Meisterweihe** (Level 99 des Skills) verliehen — nicht
handelbar erspielbar, nur verdient. Effekte sind **thematische Utility, nie XP** (bei 99 sinnlos —
und im Geist der Pet-Regel), Größenordnung 2–5 % (Ökonomie) bzw. kleine Flats (Kampf, alle
innerhalb der Caps aus crit-/evasion-tempo-taming). Dazu trägt jeder Umhang einen kleinen
Stat-Block nach Archetyp. Cape-Slot, Rarity **legendary** (verdient!), `requirements: { <skill>: 99 }`.
Art: 20 Icons später vom Chef (No-Glow-Regel!); bis dahin Emoji-Platzhalter.

## Stat-Blöcke nach Archetyp (zusätzlich zum Perk)
- **Sammler** (woodcutting/mining/fishing/foraging/farming): `con +3`, kleine Evasion (+4 evr)
- **Handwerker** (smithing/cooking/leatherworking/jewelcrafting/runecrafting/herblore): `int +2, wis +2`
- **Kämpfer** (attack/power/defence/ranged/magic/warding/vitality): archetyp-passende +3/+2 (s. Tabelle)
- **Spezialisten** (thieving/slayer): `dex +2, lck +3`

## Die 20 Umhänge

| Skill | Name (DE / EN) | Perk | Umsetzung |
|---|---|---|---|
| woodcutting | Umhang des Hainhüters / Grovewarden's Cape | **+5 % Chance auf doppeltes Holz** | Perk-Hook `doubleYield` |
| mining | Umhang des Tiefenbrechers / Deepbreaker's Cape | **+5 % Doppel-Erz** | `doubleYield` |
| fishing | Umhang des Leerenanglers / Voidangler's Cape | **+5 % Doppel-Fang** | `doubleYield` |
| foraging | Umhang des Wildsammlers / Wildgatherer's Cape | **+5 % Doppel-Ernte** | `doubleYield` |
| farming | Umhang des Grabgärtners / Gravetender's Cape | **Beete reifen 8 % schneller** | Perk-Hook `cropSpeed` |
| smithing | Umhang des Essenmeisters / Forgemaster's Cape | **5 % Chance: Schmiede-Inputs werden nicht verbraucht** | Perk-Hook `inputSaver` |
| cooking | Umhang des Seelenkochs / Soulchef's Cape | **Gerichte misslingen nie** (Erfolgschance 100 % beim Kochen) | Perk-Hook `alwaysSucceed` — DIE RuneScape-Hommage |
| leatherworking | Umhang des Gerbermeisters / Tannermaster's Cape | **5 % Input-Sparer beim Handwerk** | `inputSaver` |
| jewelcrafting | Umhang des Steinschleifers / Gemwright's Cape | **+5 % Chance auf doppelten Schliff** | `doubleYield` (jewelcrafting) |
| runecrafting | Umhang des Runenbinders / Runebinder's Cape | **+5 % Chance auf doppelte Rune** | `doubleYield` (runecrafting) |
| herblore | Umhang des Giftbrauers / Venombrewer's Cape | **Tonika/Tränke wirken 10 % länger** | Perk-Hook `buffDuration` |
| thieving | Umhang des Schattengriffs / Shadowgrasp Cape | **+3 % Diebstahl-Erfolg, −20 % Betäubung bei Misserfolg** | Perk-Hooks `successBoost` + `stunReduction` |
| slayer | Umhang des Kopfgeldmeisters / Bountymaster's Cape | **+10 % Slayer-Punkte** | Perk-Hook `slayerPoints` |
| attack | Umhang des Klingenmeisters / Blademaster's Cape | **+2 % Rüstungsdurchdringung** · `str +3, dex +2` | existierendes `armorPen` |
| power | Umhang des Kriegsherrn / Warlord's Cape | **+3 % Krit-Schaden** (Cap-sicher) · `str +3, con +2` | existierendes `critDamage` |
| defence | Umhang des Bollwerks / Bulwark Cape | **+2 % Blockchance** (Cap-sicher) · `con +4` | existierendes `blockChance` |
| ranged | Umhang des Falkenauges / Hawkeye Cape | **+2 % Präzision** (senkt Gegner-Ausweichen) · `dex +3, lck +2` | existierendes `precision` |
| magic | Umhang des Erzmagiers / Archmage's Cape | **+3 % Ward-Bruch** · `int +3, wis +2` | existierendes `wardBreak` |
| warding | Umhang des Seelenwächters / Soulwarden's Cape | **+8 % Ward-Regeneration** · `wis +3, con +2` | existierendes Ward-Regen-Feld |
| vitality | Umhang des Unbeugsamen / Cape of the Unbroken | **+0,2 HP/s Regeneration** (Post-L1-Skala!) · `con +4` | existierendes `hpRegen` |

## Die Krönung: Umhang der Vollendung / Cape of Completion 👑
Alle 20 Meisterungen → der eine **mythische** Umhang: `+2 auf ALLE 6 Attribute`, **kein** Stapeln
der Einzel-Perks (Prestige, nicht Power-Creep) — dafür als einziges Item mit dezent animierter
Rahmen-Aura im UI (UI-Rahmen, nicht Item-Art — No-Glow-Regel bleibt gewahrt). Das Max-Cape-Ziel
für die 500-Stunden-Spieler.

## Implementierungs-Notizen (für die Apply-Welle)
1. **7 Kampf-Capes = null neue Hooks** (bestehende Bonus-Felder).
2. **Ökonomie-Perks = EIN generisches Feld** `ItemDef.masterPerk?: { kind, skill?, value }` mit 8 kinds
   (`doubleYield`, `inputSaver`, `cropSpeed`, `alwaysSucceed`, `buffDuration`, `stunReduction`,
   `successBoost`, `slayerPoints`) — Engine-Verdrahtung an denselben Stellen, wo die Pet-Passiva
   greifen (Präzedenz petDoubleYieldBonus etc.); Werte stapeln ADDITIV mit Pets, Gesamt-Caps prüfen
   (Envelope-Suite nachpinnen!).
3. **Verleihung:** Engine-Hook „Skill erreicht 99" → Cape via addItemOrBank (Entdeckung automatisch)
   + Weihe-Event fürs Zeremonie-Popup. Ein Cape je Skill nur EINMAL (persistierter Marker oder
   Ableitung „Level ≥ 99 && nie verliehen" → kleiner State + SAVE_VERSION-Bump).
4. Alt-Saves mit bestehenden 99ern: Migration verleiht rückwirkend (fair) + Zeremonie feuert beim
   ersten Login je Cape gestaffelt (nicht 12 Popups auf einmal — Queue).
5. Sim-/Guard-Erwartung: Ökonomie-Perks verschieben Raten um ~5 % im Endgame — Baselines ehrlich
   nachziehen; `alwaysSucceed` (Kochen) gegen Food-Ökonomie gegenrechnen.
