# Fun-Review: Enchanting/Runen + Suffix-System — „Riko Rollwut"

**FUN-SWEEP F3** · CEO-Loop 2026-07-14 (Chef-Fokus: Spaß & Sucht-Faktor) · Datum: 2026-07-16
**Tester-Persona:** Riko Rollwut, der Perfekt-Roll-Bastler. Lebt für Item-Optimierung: Verzauberungen kombinieren, Suffix-Rolls jagen, das eine perfekte Stück bauen. Bewertet Craft-Loops nach Slot-Machine-Qualität (Erwartung → Roll → Ergebnis) und Entscheidungstiefe (Ressource vs. Chance). In ARPGs steht er 40 % der Zeit am Verzauberungs-Altar.

## Steckbrief & Test-Stats

| | |
|---|---|
| Gebiet | EnchantingPage-Altar, Runecrafting (Affix-Runen I–III, Trinity-Runen, Fokus-Kette, Void-Fusionen), Suffix-System (WoW-Stil Random Rolls), Varianten-Pouch |
| Methode | Sim-Harness (Port 5292), Fixtures `midgame` + `endgame`, Live-Patches via `__hfDebug`; Engine-Quellen gelesen (`enchant.ts`, `suffix.ts`, `shared/index.ts`, Content-Katalog) |
| Sessions | 2 Harness-Läufe, 18 Screenshots, ~10 Altar-Interaktionen, 8 Crafts (davon 2 Void-Fusionen), 4 injizierte Roll-Vergleichs-Instanzen |
| Gemessene Kernzahlen | Enchant-Kosten 100×Tier×(1+RarityIdx) Gold (rare T1 = 400 g, Entfernen = 50 %); Slots nach Rarity 1/2/3/4; Suffix-Chance 20 % Craft / 8 % Drop (+0.003·lck, Cap +15 pp) — nirgends angezeigt; Roll-Varianz ±15 % (Faktor 0.85–1.0) |

Das System in einem Satz: Der Altar ist **komplett deterministisch** (Rune + Gold = fester Affix, mit Vorher/Nachher-Vorschau), die **einzige Slot-Machine** sind Suffix-Rolls beim Craften/Droppen — und genau die versteckt ihre Chancen und ihre Roll-Qualität.

## Momente

1. **Der erste Altar-Moment (stark).** Steel Scimitar auf den Sockel, Grimoire rechts, Preview zeigt „Luck +1 → +3" mit Gold-Highlight, „Cost: 400 Gold + 1 Rune", Klick → grünes „ENCHANTED!", Slot-Pip füllt sich und das Item heißt ab sofort **„Precise Steel Scimitar"** — überall (Sidebar-Liste, Character, Tooltip). Umbenennung = echtes Besitzgefühl. Kein Sound/FX-Beat (Combat-FX ist bewusst späterer Meilenstein), aber die Inszenierung trägt.
2. **Die Regeln nehmen mich ernst (stark).** Duplikat-Rune: „This rune is already on this item." Warded-Rune auf Platte: „Doesn't fit this armor class." Dritter Affix auf rare: „No enchant slots free." Alles wird VOR den Kosten geprüft, die Vorschau graut den Button aus, bevor ich Gold verbrenne. Als Bastler liebe ich das — kein Trial-and-Error-Steuer.
3. **Mein Kernmoment — und er existiert nicht (schwach).** Roll-Vergleich, gleiche Basis, gleicher Suffix, gleiches ilvl: „Steel Scimitar of Carnage" (ilvl 60) mit Roll 0.02 → **+2 % Crit / +2 Str**; mit Roll 0.98 → **+3 % Crit / +2 Str**. „of the Wolf" (ilvl 40): Suffix-Block bei Min- und Max-Roll **zeichengleich** („Attack Speed −0.1s / Strength +1"), nur die abgeleitete Speed-Zeile verrät 2.6s vs. 2.5s. Der dritte Würfelwurf des Systems (Stärke-Roll) ist nach Rundung praktisch unsichtbar. Ein Perfekt-Roll-Jäger hat hier **nichts zu jagen**.
4. **Die Pull-Serie (halbstark).** 5 Kupfer-Fokus-Crafts à ~3 s bei den (unsichtbaren) 20 %: einer trifft → Toast „✦ Enchanted item! Copper Focus of the Magus" in der Ecke, während die Craft-Karte nicht einmal blinkt. Der „eine Runde noch"-Reflex zuckt kurz — billige Inputs, schnelle Crafts, das Grundmaterial für einen Sog ist da — aber ohne sichtbare Chance, ohne Reveal-Moment und ohne Reroll-Hebel bleibt es ein Zufall ohne Vertrag.
5. **Void-Fusion Godspark (enttäuscht).** Rezeptkarte mit schöner Art, 12 Leerenrunen + Onyx + Götzeneisenbarren, RC-Level 88 — Anspruch stimmt. Ergebnis: derselbe „Rare find!"-Standard-Toast wie bei jedem raren Fund; bei vollem Inventar rutscht der Stab kommentarlos in die Bank. Mit erzwungenem Suffix wurde daraus immerhin „Godspark Staff of the Magus" (+8 INT, ilvl 97) — DER Jackpot-Fall (Highend-Fusion × Suffix-Roll) ist mechanisch drin, wird aber nicht gefeiert.

## Bewertungsbogen — Enchanting/Runen + Suffix-System (Riko Rollwut, Perfekt-Roll-Bastler)
- Spaß sofort (erste 5 Minuten): 7/10
- Spaß über Zeit (Stunden/Tage, simuliert): 5/10
- Sucht-Faktor („eine Runde noch"): 4/10
- Belohnungs-Dichte & Dopamin-Momente: 6/10
- Ziel-Klarheit (warum mache ich weiter?): 6/10
- Tiefe & Entscheidungen (denken statt klicken?): 7/10
- Frustfreiheit (10 = kein Frust): 6/10
- Verzahnung mit dem Rest des Spiels: 8/10
- GESAMT-SUCHT-URTEIL: 5/10
- Komme ich morgen wieder? Ja — aber wegen Runen-Leiter und Drops, nicht wegen der Rolls: Solange ich einen 98er-Roll nicht von einem 2er unterscheiden kann, gibt es für meinen Spielertyp nichts zu jagen.

**Begründung der Spreizung:** Das Fundament ist ein 8er (Vorschau, Regeln, Verzahnung: Essenzen/Pigmente/Schilf aus Foraging, Gold-Sink, Suffix-Drops aus Combat, zweistufige Fokus-Kette, Mastery pro Rezept). Die Slot-Machine ist ein 3er (unsichtbare Chancen, unsichtbare Rolls, kein Reveal, kein Reroll). Der Altar selbst ist bewusst ein Formular — das ist okay, WENN die RNG-Schicht daneben glänzt. Tut sie nicht.

## Top-3-Sucht-Verbesserungen

1. **Roll-Qualität sichtbar & spürbar machen.** (a) Anzeige: Roll-Prozent oder Sterne an der Suffix-Zeile in Tooltip UND Varianten-Pouch („of Carnage · Roll 98 %"). (b) Substanz: Die ±15 %-Varianz kollabiert durch Ganzzahl-Rundung (attrPerIlvl min 1) und Anzeige-Raster (−0.1s) — entweder Varianz auf ±30–40 % aufziehen oder Suffix-Werte auf ein feineres Raster legen. Ohne (b) ist (a) peinlich, ohne (a) ist (b) unsichtbar. Das ist DIE eine Änderung, die aus dem System eine Jagd macht.
2. **Chancen in % zeigen — überall.** Suffix-Chance-Chip auf jeder Equipment-Craft-Karte („✦ 20 % Suffix-Chance", live mit lck-Bonus), Drop-Suffix-Chance im Loot-Tooltip/Bestiarium, und der `enchant.suffixHint`-Text auf der Altar-Seite nennt Zahlen statt „appear automatically". Transparente Odds sind der Vertrag, der aus Zufall Spannung macht (Chef-Vorgabe „Chancen in %!" gilt hier wörtlich).
3. **Reveal-Moment + der fehlende „ein Versuch noch"-Knopf.** Suffix-Treffer beim Craft: Karten-Flash/Glow + kurzes Namens-Reveal („… OF CARNAGE") statt nur Ecken-Toast; Void-Fusionen bekommen eine eigene Abschluss-Zeremonie (mindestens einen eigenen Toast-Typ). Dazu ein **Reroll-Suffix-Rezept** am Altar (teuer: Essenzen + Gold, behält Basis+Affixe, würfelt nur den Suffix neu) — das gibt dem Altar die fehlende RNG-Interaktion und dem Suffix-System den Wiederholungshebel, ohne den deterministischen Enchant-Kern anzutasten.

## Bugs & Befunde

| # | Schwere | Befund | Repro/Beleg |
|---|---|---|---|
| B1 | Mittel (kosmetisch, irritierend) | **Falscher „Rare find!"-Toast beim Verzaubern eines angelegten rare+ Items.** Die Rare-Zählung in `Toasts.tsx` (~Z. 270–276) zählt `character.equipment[slot]` UND `equippedInstances[slot].baseItemId`; `applyEnchant` lässt `equipment[slot]` absichtlich auf der baseId stehen → Promotion zur Instanz = Netto +1 → Toast. | Rare Waffe anlegen → am Altar verzaubern → „Rare find! Steel Scimitar" (Screenshot f3-a03) |
| B2 | Hoch (Design) | **Roll-Varianz nach Rundung unsichtbar** (Detail s. Moment 3 / Verbesserung 1). Roll 0.02 vs. 0.98 ergibt identische oder um 1 Punkt verschiedene Anzeige- und Wirkwerte. Widerspricht dem eigenen Spec-Versprechen (±15 %-Roll-Varianz als dritter Würfelwurf). | Zwei Instanzen gleicher Basis/ilvl mit Roll 0.02/0.98 injiziert; Tooltips verglichen (f3-a09-*) |
| B3 | Mittel (UX) | **Suffix-Chancen nirgends beziffert** — weder 20 % Craft noch 8 % Drop noch lck-Bonus tauchen in irgendeiner UI auf. | Craft-Karten, Tooltips, Altar-Hint geprüft |
| B4 | Niedrig (UX) | **Varianten-Pouch ohne Unterscheidbarkeit:** zwei „Steel Scimitar of Carnage" mit verschiedenen Rolls sind im Modal namensgleich; Stats nur per Einzelklick-Tooltip, kein Side-by-side. | Pouch mit 4 Varianten (f3-a14) |
| B5 | Niedrig (Begrifflichkeit) | **„Rune of Precision" gibt +Luck**, während Waffen einen eigenen sichtbaren „Precision"-Stat tragen (Scimitar: „Precision +15 %"). Am Altar stehen beide Begriffe direkt untereinander — Verwechslung programmiert. | Preview f3-a02 |
| B6 | Info (kein Bug) | Fusion-Output rutscht bei vollem Inventar still in die Bank (addItemOrBank-Standard); „Rare find!"-Toast suggeriert Inventar. Bei Highend-Momenten einen Ort-Hinweis erwägen. | Endgame-Session, Fusion 1 |
| — | Anmerkung | Namenslogik bei mehreren Affixen (höchster Tier liefert den Präfix, Rest nur im Tooltip) ist dokumentiertes Design und in Ordnung — nur der Tooltip listet zuverlässig alle. | `instanceDisplayName`, shared/index.ts ~Z. 2694 |

## Was schon richtig gut ist (nicht anfassen)

- **Enchant-Preview** (Vorher/Nachher, geänderte Zeilen gold, Blocker-Gründe mit eigenen Vokabeln) ist Best-in-Class für ein Idle-Game.
- **Duplikatsperre & Trinity-Klassen-Gates vor Kostenabzug** — kein einziger Fehlversuch hat mich Rune oder Gold gekostet.
- **Tier-Upgrade als echte Entscheidung:** alter Affix muss disenchantet werden (Rune weg, Gold-Kosten) — Ressource vs. Fortschritt, genau meine Sorte Abwägung.
- **Verzahnung:** Essenz-/Pigment-/Schilf-Ökonomie, zweistufige Fokus-Kette (bauen → verzaubern), Suffix-Instanzen aus Combat-Drops, unbegrenzte Varianten-Tasche mit Stern-Marker im Inventar.
