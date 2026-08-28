# Zauberreserve und Weisheit (Chef-GO 28.08.2026)

**Anlass:** Spieler-Feedback (RU): „Warum gibt es Weisheit, wenn es kein Mana mehr gibt? Wofür ist Mana-Regen?“ Analyse 28.08.: Mana ist als Verbrauch tot (Regeneration 1,5 + 0,4·WIS je Sekunde übersteigt die Kosten von ~2/s immer), Weisheit tut außer Mana fast nichts (+0,1 Verteidigung je Punkt). Vorschlag des Spielers: Mana als Wert wie Rüstung, Haltungen lesen ihn. Chef: „Mana und Weisheit war schon lange Go.“

## Regeln

1. **Mana wird Zauberreserve (EN „Spell Reserve“).** Kein Verbrauch mehr: `manaCost` verschwindet von allen Magiewaffen (Content, Typ, Karte), Zauber kosten nichts, der „schwache Magier“ bei leerem Mana entfällt. `maxMana` bleibt als Wert (30 + 10·INT + 4·WIS + Ausrüstung) und heißt in der UI Zauberreserve; `character.mana` bleibt im Save (Kompat), wird auf `maxMana` gehalten und nicht mehr angezeigt.
2. **Magie-Haltungen lesen die Reserve** (bestehende Haltungen der Magie-Stances, Namen/IDs im Content prüfen):
   - **Fokus** (offensive Magie-Haltung): +1 % Zauberschaden je 40 Reserve, Deckel +30 % (CL-90-Kit ≈ +20 %).
   - **Schild** (defensive Magie-Haltung, heute ×1,5 Ward-Regeneration und ×0,85 Schaden): zusätzlich +1 % Ward-Regeneration je 20 Reserve, Deckel +60 %.
   - Nahkampf-/Fernkampf-Haltungen unverändert.
3. **Weisheit = Status-Widerstand für alle Stile:** Statuseffekte, die auf den SPIELER gelegt werden (Brand, Frost, Schock, Gift, Blutung, Entzug), sind je Weisheitspunkt 1 % kürzer UND 1 % schwächer, Deckel 40 % (`WIS_STATUS_RESIST_PER_POINT = 0.01`, `WIS_STATUS_RESIST_CAP = 0.4`). Für Schock heißt schwächer: Verzögerung kürzer; für Frost: Einfrieren braucht ab 20 % Widerstand vier statt drei Anwendungen. Weisheit behält maxMana und den Verteidigungsterm.
4. **Alt-Werte umdeuten (kein Save-Bump):**
   - `manaRegen`-Boni auf Items/Sets/Buffs → Reserve-Boni: +1 Regen ⇒ +10 Zauberreserve (Content-Umschreibung oder Engine-Umrechnung; Karte zeigt „+10 Zauberreserve“).
   - `manaOnKill`-Effekte (sorrow_staff, skarn_idol_staff …) → `wardOnKill` (flacher Ward-Rückfluss je Kill; neues Effekt-Kind nach Muster healOnKill, Doku-Tabelle) oder, wenn die Waffe schon einen zweiten Effekt hat, entfernen; Bericht.
   - Begleiter `glyphmaw` (Fähigkeit manaRestore) → Fähigkeit, die Ward füllt (Muster `shield`/heal); `petManaRegenMult` entfällt.
   - Mana-Tränke/Verbrauchsgüter, die Mana füllen → temporärer Reserve-Bonus (+X Zauberreserve für Y Minuten) oder Umbau zu Ward-Trank; Bericht.
   - Camp-/New-Haven-Gebäude, Runen, Suffixe mit Mana-Bezug: gleiche Umdeutung.
5. **Symmetrie:** Monster haben kein Mana; Gegner-Statuseffekte gegen den Spieler unterliegen dem Weisheits-Widerstand, Spieler-Status gegen Gegner nicht (Monster haben keine Weisheit).
6. **Texte:** Item-Karte ohne Manakosten-Zeile; Stat-Zeilen „Zauberreserve“ mit Tooltip („Zauber kosten nichts. Fokus-Haltung: +x % Zauberschaden, Schild-Haltung: +y % Ward-Regeneration“), Weisheit-Tooltip „Status-Widerstand x %“; Kampf-Panel ohne Mana-Balken (Reserve als Zahl neben Ward); Onboarding-/Hinweistexte („Dein Stab wirkt Zauber und verbraucht Mana …“) neu; 7 Sprachen.
7. **Balance:** DPS-Parität je Stufe; Fokus-Bonus ersetzt den Wegfall des „schwachen Magiers“ (der nie griff) und ist ein bewusster Magie-Buff im Rahmen des Zauberfokus-Beschlusses; Pins neu messen, im Bericht auflisten.

## Umsetzung

- combat-dev/logic-dev (packages): shared (Konstanten, Effekt-Kinds, ItemDef.manaCost entfernen), engine (character.ts computeStats: Haltungen, Widerstand; combat.ts: Cast ohne Kosten, Status-Anwendung auf Spieler skaliert; pets.ts; consumable.ts), content (manaCost weg, Umdeutungen), Tests, Patchnotes, Doku.
- ui-dev (client): Kampf-Panel, Charakter-/Stat-Seite, Item-Karte, Tooltips, Onboarding-Texte ×7.
