---
name: enchant-and-suffix-systems
description: "Enchant-System (Affixe, Arch B Item-Instanzen) + Suffix-System (Random Rolls) — Chef-Entscheidungen"
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-18T12:23:25.493Z
---

Chef-Entscheidungen (2026-06-27) für zwei item-modifizierende Systeme, BEIDE auf **echten Item-Instanzen** (Architektur **B** — Inventar wird von rein stack/anzahl-basiert auf Instanzen erweitert; gemeinsames Fundament).

**Affixe = Verzauberungen (Enchant-System, deterministisch):** Verzauberungstisch: Basis-Waffe + Enchant-Rune → neue Instanz mit Affix (z.B. Kupferschwert + Feuer-Rune → „Feuriges Kupferschwert", neuer Effekt je Rune). Runen **TIERED** (Feuer ab ~L20 möglich, stärkere Tiers auf höherem Level), gecraftet von **Runecrafting** mit gestaffelten Essenzen. Enchant-Slots pro Item **nach Rarity**. **Disenchant:** Rune weg + Gold. **Kosten:** Rune + Gold (bewusster Endgame-Gold-Sink). Erfolg deterministisch. **Rüstungs-Enchants = Phase 2.**

**Suffixe = Random Rolls (WoW-Stil, NEU):** Beim Craften (und später bei **Drops**): Roll 1 = bekommt Item einen Suffix? (Chance). Roll 2 = welcher aus vordefiniertem **Pool**. **Level-Scaling** (L1-Craft → schwächer). **Logisch zum Item-Typ** (Schwert ≠ Magier-Suffix). Eigene Suffixe („des Tigers"=dex+vitality etc.). Zweck: nicht immer dasselbe Item, sondern Varianten/bessere Versionen — macht Crafts + Grinds spannend.

**Inscription:** wird **GANZ abgewickelt** (Skill + Aktionen + nur-Inscription-Materialien + die `inscription_enchanting`-Sim-Heuristik raus).

**Inventar-Overflow:** Lösung nötig (damit nicht zig Varianten desselben Items das Inventar fluten) — wird im Fundament-Plan empfohlen (Salvage/Auto-Vergleich/Gear-Bank).

**Why:** Tiefe-Feature für Loot/Crafting; Enchantment ZUERST implementieren, Suffix geplant.
**How to apply:** Gemeinsames Item-Instanz-Fundament EINMAL bauen (Affixe + Suffixe + Overflow). Plan: `design/item-instance-affix-suffix-spec.md`. SAVE-Bump nötig ([[always-update-save-logic]]). Drop-Suffixe ergänzen [[item-builder-planned]].

**NACHTRAG Chef-Entscheid 2026-07-18: „Enchanting geht in Runecrafting mit rein"** — Enchanting wird NIE ein eigener Skill; die Verzauberungs-Progression gehört zu Runecrafting (Spec-Empfehlung bestätigt). Der geparkte ring_master_enchanting wurde daraufhin entfernt (21 Meister-Ringe, einer je echtem Skill + Completion).

**NACHTRAG Chef-Entscheid 2026-07-18: Suffixe sind NICHT rerollbar.** „Suffixe sollen nicht rerollbar sein!" — das im Fun-Sweep-Programm gebaute Suffix-Reroll (rerollSuffix gegen Gold + UI-Buttons, aus Rikos Tester-Top-3) wurde auf Chef-Entscheid wieder ENTFERNT: Reroll entwertet die Item-Jagd (BiS-Stück am Altar perfekt würfeln statt neue Items jagen). Der ERST-Roll (zufällige Suffix-Stärke bei Craft/Drop, „x % vom Maximalwurf") bleibt — nur das Neu-Würfeln ist tabu. Nicht wieder vorschlagen, auch wenn Tester-Personas es fordern.
