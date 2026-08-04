---
name: combat-is-fundamental
description: Combat ist bewusst unvermeidbar — kampf-gegatete Mats NICHT durch Shop/Forage-Quellen umgehen
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-25T08:06:43.954Z
---

Chef-Entscheid (2026-07-01): **Combat soll fundamental & unvermeidbar sein.** Der Chef bevorzugt das ausdrücklich gegenüber „alle Items einfach in den Shop klatschen", um einen reinen Skiller-Pfad zu ermöglichen.

**Konsequenz für Triage:** Wenn ein Sweep meldet, ein Skill/Craft-Baum sei „kampf-gegated" (z.B. Leatherworking braucht `raw_hide` = Monster-Loot; Bögen brauchen `bowstring ← scarred_hide`; Elementar-Runen/Magie-Stäbe brauchen `frost/ember/storm/void_essence` aus Kämpfen; Fleischgerichte brauchen Monster-Drops) → **das ist INTENDED, kein Bug.** KEINE Nicht-Kampf-Quellen (forage/crop/shop) hinzufügen, nur um „reiner Skiller" zu ermöglichen. Reiner-Skiller ist KEIN unterstützter Playstyle.

**Was stattdessen zählt:** dass der INTENDIERTE Kampf→Skill-Nachschub **flüssig** ist — frühe Gegner droppen die frühen Mats (z.B. Hide) zuverlässig, sodass ein normaler (kämpfender) Spieler nach den ersten Fights natürlich in Leatherworking/Fletching reinkommt. Also: Combat-Gate ja, aber die erste Stufe smooth.

**Erweiterung (2026-07-02, Squish-Kontext):** Auch **Undergeared-Walls sind gewollt** — wenn ein unter-getierter Held (z.B. L1-Bronze) an einem Tier-passenden Boss (bull_boss L15 = Iron-Tier) scheitert, ist das Design: „der Spieler soll halt upgraden". Das Spiel soll den Spieler **indirekt zwingen, seinen Charakter weiterzubauen**. Konsequenz für Triage: „Bronze-Baseline unbesiegbar"-Sim-Einträge und Sweep-Funde der Klasse „Mob X zu hart für untergerüstete Helden" sind KEINE Bugs und werden nicht durch Mob-Nerfs gelöst — nur echte Walls (auch GEARED unbesiegbar) zählen. Passt zu Tod-bricht-Kampf-ab (Strafe für schlechte Vorbereitung).

**Präzisierung (2026-07-25, Chef wörtlich „so hart locken an Level finde ich albern"):** Die Wand wirkt über KAMPFHÄRTE, nie über Tür-Schlösser — **Dungeons haben KEINE Kampfstufen-Hard-Locks mehr; nur Quest-Gates sperren.** `requiredLevel` ist seither reine EMPFEHLUNG auf der Karte („Empfohlen: Kampfstufe X" + Kreaturen-Band + Warnhinweis bei Unterlevel). Begründung: Single-Style-Spieler erreichen Kampfstufen-Schwellen utopisch langsam; „wenn Spieler sterben, merken sie es selber und trainieren". Konsequenz für Triage: Level-Gates an Dungeons wieder einführen = verboten; Unterlevelte, die in Dungeons sterben, sind Design, kein Bug.

Verwandt: [[game-design]] [[combat-concept]] [[city-shelved-shop-relocated]] (Shop bewusst schlank halten).
