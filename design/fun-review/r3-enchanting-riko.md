# Fun-Sweep RUNDE 3: Enchanting/Runen + Suffix-System — „Riko Rollwut"

**Fun-Sweep R3 · 2026-07-16** · Bögen: `enchanting-riko.md` (R1) · `retest-enchanting-riko.md` (R2)
**Tester-Persona:** Riko Rollwut, der Perfekt-Roll-Bastler. Lebt für Item-Optimierung: Verzauberungen kombinieren, Suffix-Rolls jagen, das eine perfekte Stück bauen. Bewertet Craft-Loops nach Slot-Machine-Qualität (Erwartung → Roll → Ergebnis) und Entscheidungstiefe (Ressource vs. Chance).

## 1. Steckbrief — die Reise R1 → R2 → R3

| | R1 (F3) | R2 (Retest) | R3 (jetzt) |
|---|---|---|---|
| Das System in einem Satz | Deterministischer Altar top, aber die einzige Slot-Machine (Suffixe) versteckt Chancen UND Rolls — „Zufall ohne Vertrag" | Vertrag (Chance-Chip), Reveal (Jackpot-Toast) und Hebel (Reroll im Pouch) sind da — nur die Roll-Substanz fehlt und die getragene Waffe bleibt außen vor | Der Loop ist GESCHLOSSEN: Reroll jetzt auch an der getragenen Waffe, toter Button sieht tot aus, Erst-Fund nennt sein Roll-%, Craft-Serie ist still. Was bleibt: Attribut-Rolls ohne Substanz, Drop-Seite ohne Odds, und ein letzter Fehl-Toast am Batch-Ende |
| Gesamt-Sucht | 5/10 | 7,5/10 | **8/10** |
| Methode | Port 5292, 2 Läufe, 18 Shots | Port 5303, 4 Läufe, 29 Shots | Port 5311, 5 Läufe, 26 Shots (`rt3-riko-*.png`), Skripte nach Lauf gelöscht |

## 2. Session-Protokoll

Fixture `midgame` (Mira Ashfall, Luck 19, Smithing 24, rare Steel Scimitar angelegt). Alle Läufe ohne Page-Errors.

1. **Chip-Verifikation.** Jede Equipment-Craft-Karte (Mace/Axe/Scimitar/Battleaxe, auch Copper-Tier) trägt „✦ 25.7% SUFFIX CHANCE" — nachgerechnet exakt 20 % + 19 × 0,3 pp (Luck 19). Material-Rezepte (Steel Bar) korrekt ohne. Chance testweise auf 0 gezwungen → Chip verschwindet; auf 100 % gezwungen → Chip zeigt sauber den 95-%-Gesamt-Cap (`rt3-riko-01/04`).
2. **Craft-Fließband, Phase A (Chance 0, 6 Crafts, Ziel 10, manuell gestoppt):** null „Rare find!" — der R2-Spam (4 Crafts = 4 Toasts) ist von der Serie verschwunden (`rt3-riko-02`). Nur Mastery-Toasts.
3. **Phase B (echte 25,7 %, 14 Crafts am Stück):** 4 Suffix-Treffer (28,6 % — im Erwartungsband). Jeder Treffer als Rare-Stil-Jackpot MIT Roll-%: „ENCHANTED ITEM! Steel Scimitar · OF THE EAGLE (45%)", dazu Eagle 58 %, Tiger 80 %, Bear 81 % (`rt3-riko-03`). Kein einziger „Rare find!" während der Serie.
4. **Phase C (Chance erzwungen, Ziel 1):** Suffix-Treffer beim letzten Craft des Batches → „Rare find! Steel Scimitar" stapelt sich DIREKT über den Jackpot „OF THE BULL (77%)" (`rt3-riko-05`). Isoliert nachgestellt mit Chance 0: Ziel 1 → 1 Fehl-Toast, Ziel 5 → genau 1 Fehl-Toast am Batch-Ende (`rt3-riko-19`). Der Spam ist also nicht tot, er hat sich ans Batch-Finale zurückgezogen (Details N1-Rest unten).
5. **Pouch-Vergleich.** 6 injizierte Vergleichs-Instanzen (Carnage/Bull ilvl 60, Wolf ilvl 40, je Roll 2 %/98 %): jede Zeile mit Roll-%-Chip und 🎲-Preis (1.600 bzw. 1.200 Gold, formelgetreu nach ilvl-Band), Tooltips mit „… % OF MAX ROLL"-Gruppentitel (`rt3-riko-07/09/15`).
6. **Substanz-Messung (der Kern meiner R1/R2-Kritik):** Bull 2 % = **Strength +4**, Bull 98 % = **Strength +4** — zeichengleich. Wolf 2 % und 98 % — Suffix-Block zeichengleich („Attack Speed −0.1s / Strength +1"), nur die abgeleitete Speed-Zeile verrät 2,6 s vs. 2,5 s. Carnage: Crit 2 % → 3 % über die Spanne, Strength identisch +2. Unverändert zu R2 (bewusst im Balance-Block geparkt, s. Abschnitt 5).
7. **Reroll-Kette im Pouch (6 Züge):** Carnage@98 → Eagle 17 % (Fehlgriff meinerseits, die falsche Zeile — tat trotzdem weh), dann Bull@98 → Eagle 88 → Bear 84 → Eagle 87 → Wolf 64. Jede Abbuchung exakt 1.600 Gold, ilvl bleibt fixiert, Pouch bleibt offen, Zeile wechselt live, jeder Zug als „SUFFIX REROLLED! … (%)"-Jackpot (`rt3-riko-10/11`).
8. **Goldmangel (Gold = 100):** Confirm-Button ist klick-tot UND sieht tot aus — grayscale(75 %), brightness 0.6, opacity 0.7, Hover bleibt stumm (`rt3-riko-12` vs. `rt3-riko-10`). DOM-verifiziert (`disabled: true`).
9. **Der Moment der Runde:** Wolf-98 (mein bestes injiziertes Stück) über den Pouch ANGELEGT, dann im Equip-Slot-Tooltip: „UNEQUIP / REROLL SUFFIX (1,200)" (`rt3-riko-17`). Bei 100 Gold: Alert „Not enough gold." Mit Gold: ehrlicher Confirm-Text, −1.200 exakt, Wolf@98 → **Tiger@48**, ilvl 40 bleibt, Jackpot-Toast feuert für die getragene Waffe, und das Attribut-Panel springt live mit (Dex 13→14, Con 48→49, `rt3-riko-18`). Ich habe meine 98er-Waffe am eigenen Leib verzockt. Genau dieses Risiko hat R2 gefordert.
10. **Altar-Regression (alter B1):** angelegten rare Scimitar mit Precise T1 verzaubert — Preview „Luck +1 → +3", Kosten exakt −400 Gold, Rune 9→8, Umbenennung „Precise Steel Scimitar" überall, Pip 1/2, Remove (200G) = 50 % (`rt3-riko-25/26`). KEIN „Rare find!". Neu gegenüber R2: ein leiser Ecken-Toast „✦ Enchanted item! Steel Scimitar" (Drop-Stil, kein Jackpot) — Beobachtung, kein Bug (s. Neue Funde N4).
11. **Chip-Live-Loop (mein R2-Liebling):** nach dem +2-Luck-Enchant springen ALLE Craft-Chips von 25,7 % auf 26,3 % (`rt3-riko-27`). Lebt.
12. **Bestiarium:** Dropzeilen zeigen Drop-Chancen in % („✓ 25%"), aber das Wort Suffix existiert auf der ganzen Seite nicht (Volltext-Check negativ, `rt3-riko-23/24`). Altar-Hint wortgleich zahlenlos wie R1/R2 (`rt3-riko-06`).

## 3. Bewertungsbogen — R1 | R2 | R3 | Δ(R2→R3)

| Aspekt | R1 | R2 | R3 | Δ | Begründung |
|---|---|---|---|---|---|
| Spaß sofort (erste 5 Min) | 7 | 8 | 8 | ±0 | Chip beantwortet „lohnt sich das?" auf jeder Karte, Altar-Formular unverändert Best-in-Class. Im Einstieg ist nichts Neues dazugekommen — musste es auch nicht. |
| Spaß über Zeit (simuliert) | 5 | 7 | 7 | ±0 | Der Reroll-Loop trägt und die getragene Waffe macht ihn persönlicher. Die Decke bleibt dieselbe: sobald man zwei Attribut-Rolls nebeneinanderlegt (+4 Str vs. +4 Str), stirbt die Langzeit-Jagd auf „das perfekte Roll" zum zweiten Mal. |
| Sucht-Faktor („eine Runde noch") | 4 | 7 | 8 | +1 | Der Reroll am Leib ist der fehlende Kick: Ich habe meine getragene 98er-Wolf verzockt und Tiger-48 gezogen — der Verlust FÜHLT sich an, weil die Stats sofort im Charakterbogen wandern. Craft → % → Pouch → Reroll → tragen → nochmal rollen ist jetzt ein geschlossener Kreis. |
| Belohnungs-Dichte & Dopamin | 6 | 7 | 8 | +1 | Erst-Fund-Toast nennt jetzt sein Roll-% (Eagle 45 %/58 %, Tiger 80 %…), die Craft-Serie ist still, der Jackpot steht fast immer solo. Der Punkt zum 9er fehlt, weil am Batch-Ende weiter ein „Rare find!" nachfeuert und sich im schlimmsten Fall genau über den Suffix-Reveal legt. |
| Ziel-Klarheit | 6 | 8 | 8 | ±0 | „98 % of max roll" + Chip definieren das Chase-Ziel weiter glasklar. Die Drop-Hälfte (Combat) bleibt ohne einen einzigen Zahlenwert — dort weiß ich immer noch nicht, WOFÜR ich jage. |
| Tiefe & Entscheidungen | 7 | 8 | 8 | ±0 | Gold vs. Chance jetzt auch an der getragenen Waffe (1.200 bis 1.600 Gold pro Zug tun bei 25.000 Gold weh, und der Reroll zahlt sichtbar aufs Gold-Ausgeben-Meta ein: „Shopper"-Achievement ploppte mitten in der Kette). Keine NEUE Entscheidungsachse, darum kein Sprung. |
| Frustfreiheit | 6 | 7 | 8 | +1 | Alle drei R2-Reibungen sind raus: toter Button sieht tot aus, Goldmangel wird erklärt (Alert), kein Ablegen-Umweg mehr. Kleine neue Reibungen: natives Browser-Confirm am Equip-Slot bricht die Optik, und der Batch-Ende-Toast bleibt ein Störgeräusch. |
| Verzahnung | 8 | 9 | 9 | ±0 | Chip-Live-Loop bestätigt (25,7 → 26,3 % nach Luck-Enchant, alle Karten). Reroll-Gold füttert Wealth-Achievements. Auf dem Niveau ist kaum noch Luft. |

**GESAMT-SUCHT-URTEIL: R1 5/10 → R2 7,5/10 → R3 8/10.**
Der Drei-Runden-Trend: aus „Zufall ohne Vertrag" (R1) wurde eine Slot-Machine mit Vertrag, Reveal und Hebel (R2), und R3 hat den Hebel dahin gelegt, wo er am meisten wiegt: an die Waffe am Leib. Die letzten zwei Punkte liegen exakt dort, wo sie schon in R2 lagen: (a) Attribut-Suffixe rollen substanzlos, das %-Label verspricht eine Differenz, die es für die Pool-Mehrheit nicht gibt; (b) die Drop-Hälfte des Systems läuft weiter ohne Odds; dazu (c) das letzte Fehl-Toast-Echo am Batch-Ende.

**Komme ich morgen wieder?** „Ja. Und zwar zum ersten Mal, weil das Spiel mich an MEINER Waffe zocken lässt statt nur an der Werkbank. Ich habe heute eine getragene 98er-Wolf für 1.200 Gold in eine Tiger-48 verwandelt und den Verlust im Charakterbogen zucken sehen — dieser Stich ist der Grund, warum Leute wie ich wiederkommen: morgen hole ich mir die 98 zurück. Aber solange +4 Stärke bei Roll 2 % und Roll 98 % dieselben +4 Stärke sind, jage ich eine Zahl, keine Waffe. Gebt dem Label endlich Substanz, dann bin ich nicht nur morgen da, sondern nachts um zwei."

## 4. Runde-2-Funde-Verifikation

| # | R2-Befund | Status | Beleg |
|---|---|---|---|
| N1 | „Rare find!"-Spam bei jedem deterministischen rare-Craft (4/4) | **WEITGEHEND BEHOBEN — Rest-Kante am Batch-Ende** | Laufende Serie: 0 Toasts bei 6 Crafts (Chance 0) und 0 bei 14 Crafts mit 4 Suffix-Treffern (`rt3-riko-02/03`). ABER: der LETZTE Craft eines endlichen Ziels feuert genau 1 „Rare find!" — 3× reproduziert (Ziel 1: 1/1; Ziel 5: 1/1; mit Suffix-Treffer stapelt er sich über den Jackpot, `rt3-riko-05/19`). Mechanik-Vermutung aus dem Verhalten: die Ausschluss-Liste gilt nur, solange die Aktion läuft; der finale Craft landet im selben Tick, in dem die Aktion endet. Von 4 Fehl-Toasts pro 4 Crafts auf 1 pro Batch ist ein echter Fortschritt, aber er trifft den dramaturgisch teuersten Moment (Finale + Reveal). |
| N2 | Disabled-Confirm ohne Disabled-Optik | **BEHOBEN** | Bei 100 Gold: `disabled: true`, grayscale(75 %) + brightness 0.6 + opacity 0.7, Hover/Active bleiben stumm (`rt3-riko-12` vs. `rt3-riko-10`). Rest-Nit: das Panel nennt den GRUND nicht („Not enough gold" existiert als Text und kommt am Equip-Slot, im Pouch-Panel aber nicht). |
| N3 | Kein Reroll-Einstieg für ANGELEGTE Instanzen | **BEHOBEN** | Equip-Slot-Tooltip einer Suffix-Instanz: „REROLL SUFFIX (1,200)" neben Unequip (`rt3-riko-17`). Goldmangel → Alert; sonst Confirm mit ehrlichem Text, exakte Abbuchung, Suffix in place (Wolf@98 → Tiger@48, ilvl fix), Jackpot-Toast MIT % für die getragene Waffe, Attributs-Panel aktualisiert live (`rt3-riko-18`). Plain-Items ohne Suffix zeigen korrekt KEINEN Reroll (`rt3-riko-13`). |
| N4 | Erst-Fund-Toast ohne Roll-% | **BEHOBEN** | „ENCHANTED ITEM! Steel Scimitar · OF THE EAGLE (45%)" u. a., 4/4 Treffer mit % (`rt3-riko-03/05`). |
| N5 | Drop-Suffix-Chance nirgends sichtbar | **NICHT BEHOBEN** | Bestiarium-Dropzeilen: Drop-% ja, Suffix nein (Volltext negativ, `rt3-riko-24`); Altar-Hint wortgleich zahlenlos wie in R1 (`rt3-riko-06`). |
| B5 | „Rune of Precision" (+Luck) neben Waffen-Stat „Precision" | **NICHT BEHOBEN** | Rune heißt weiter „Rune of Precision I", Grimoire-Karte „PRECISE T1 · +2 LUCK", direkt daneben der Scimitar mit „Precision +15%" im selben Tooltip-Block (`rt3-riko-20/25`). Verwechslung weiter programmiert. |
| B2 | Roll-Varianz nach Rundung unsichtbar | **UNVERÄNDERT (Teilstand R2)** | s. Abschnitt 5, Punkt 1. |

## 5. Runde-2-Top-3-Check

| # | R2-Empfehlung | Erlebbar passiert? | Befund |
|---|---|---|---|
| 1 | **Attribut-Rolls Substanz geben** | **NEIN** (ehrlich: bewusst im Balance-Block geparkt, das werte ich nicht als gebrochenes Versprechen — aber erlebbar ist nichts) | Hart gemessen: Bull ilvl 60 bei Roll 2 % = +4 Str, bei Roll 98 % = +4 Str (`rt3-riko-09` + Tooltip-Paar). Wolf ilvl 40: Suffix-Block zeichengleich über die ganze Spanne, nur die abgeleitete Speed-Zeile zeigt 2,6 s vs. 2,5 s. Carnage differenziert allein über den Soft-Stat (Crit 2 % → 3 %). Für die weight-100-Mehrheit des Pools (Bear/Bull/Tiger/Boar/Tortoise…) ist „98 % of max roll" weiterhin Deko. Das ist und bleibt die eine Baustelle zwischen 8 und 10. |
| 2 | **Craft-Spam von der Bühne** | **GRÖSSTENTEILS JA** | Serien sind still (0 Fehl-Toasts über 20 Serien-Crafts), der Suffix-Reveal steht solo und trägt jetzt sein Roll-% (N4). Der Rest-Spam hat sich ans Batch-Ende zurückgezogen (N1-Rest) — genau dort, wo bei Ziel „1" JEDER Craft ein Batch-Ende ist: Wer einzeln nachcraftet (mein Spielstil beim Jagen!), bekommt weiter pro Craft einen „Rare find!". |
| 3 | **(a) Reroll ans angelegte Item + (b) Odds an die Drop-Seite** | **(a) JA, voll · (b) NEIN** | (a) erlebt und für gut befunden, inkl. Fehlerfall (s. N3-Verifikation). (b) Bestiarium und Loot-Pfad weiter ohne einen einzigen Suffix-Zahlenwert; die Craft-Hälfte hat ihren Vertrag, die Jagd-Hälfte nicht. |

## 6. Neue Funde (R3)

| # | Tag | Befund | Repro/Beleg |
|---|---|---|---|
| R3-1 | **BUG (Mittel, Toast-Ökonomie)** | **„Rare find!" feuert beim LETZTEN Craft jedes endlichen Batches** eines rare-rarity-Rezepts — bei Ziel 1 also bei jedem Craft, bei Ziel 5/10 genau einmal am Ende, und im Suffix-Fall stapelt er sich direkt ÜBER den Jackpot-Reveal (zwei Gold-Toasts für einen Craft, exakt das R2-Bild). Während die Aktion läuft, ist alles sauber. | Chance 0, Ziel 1 → 1/1; Chance 0, Ziel 5 → 1/1 am Ende; Chance 100 %, Ziel 1 → „Rare find!" + „OF THE BULL (77%)" gestapelt (`rt3-riko-05/19`) |
| R3-2 | **BUG (Niedrig, theoretisch)** | **Pouch-Stacking ignoriert das ilvl:** Die Stack-Signatur fasst Instanzen mit gleicher Basis + gleichem Suffix + gleichem Roll zusammen, auch wenn ihre ilvl (und damit ihre Stat-Stärke und ihr Reroll-Preis) verschieden sind — mein injiziertes Paar Bull ilvl 60/ilvl 100 mit identischem Roll wurde „×2" mit den Werten des ilvl-60-Repräsentanten. Organisch fast unmöglich (exakt gleicher Float-Roll), aber die „alle N sind stat-identisch"-Zusage des Stacks ist verletzt. | `rt3-riko-15` („of the Bull 2% ×2 🎲 1,600") |
| R3-3 | **POLISH** | **Equip-Slot-Reroll nutzt native Browser-Dialoge** (confirm/alert) statt des schönen Inline-Confirm-Panels aus dem Pouch — OS-graue Kästen mitten in der Citadel-Optik, und der ehrliche Vertragstext wirkt dort wie eine Fehlermeldung. Funktional einwandfrei. | Equip-Reroll-Flow, Dialog-Log Lauf 02b |
| R3-4 | **INFO (Beobachtung, kein Bug)** | Der Altar-Enchant am ANGELEGTEN Item toastet jetzt leise „✦ Enchanted item! Steel Scimitar" (Drop-Stil; R2 hatte hier null Toasts — Nebeneffekt der Equip-Instanzen im Toast-Diff). Konsistent zum Enchant im Inventar und klar vom Suffix-Jackpot unterscheidbar, aber redundant zum grünen „Enchanted!"-Banner der Seite, und er nennt die Basis statt des neuen Namens („Steel Scimitar" statt „Precise Steel Scimitar"). | `rt3-riko-26` |
| R3-5 | **POLISH (N2-Rest)** | Pouch-Confirm bei Goldmangel: Button korrekt tot und tot AUSSEHEND, aber ohne Begründungszeile — der existierende „Not enough gold."-Text wird nur am Equip-Slot (Alert) genutzt. | `rt3-riko-12` |
| R3-6 | **POLISH (alt-offen)** | Altar-Hint weiter wortgleich ohne Zahl („Suffixes appear automatically…") — gehört inhaltlich zu N5. | `rt3-riko-06` |

Kein BLOCKER. Keine Page-Errors in allen 5 Läufen. Chip-Mathe (Basis, Luck-Bonus, 35-pp-Luck-Cap-Verhalten aus R2, 95-%-Gesamt-Cap), Reroll-Kosten (1.200/1.600 nach ilvl-Band), Enchant-Kosten (400/200) und Trefferquote (4/14 ≈ 28,6 % bei 25,7 %) alle formelkonsistent nachgemessen.

## 7. Riko's Top-3 für Runde 4

1. **Attribut-Rolls Substanz geben — zum dritten Mal, jetzt mit Beweisfoto.** +4 Str bei 2 % und +4 Str bei 98 % (`rt3-riko-09`) ist die eine Zahl, die das ganze „% of max roll"-Versprechen entwertet. Varianz für attrPerIlvl auf ±30 bis 40 % aufziehen ODER Koeffizienten so eichen, dass zwischen Roll 0 % und 100 % ab Suffix-Mindest-ilvl mindestens 1 voller Punkt liegt. Alles andere an diesem System ist inzwischen ehrlich; nur dieses Label lügt noch. (Liegt im Balance-Block — dann bitte in Runde 4 mit Priorität aus dem Block holen.)
2. **Die Batch-Ende-Kante schließen (R3-1).** Der Ausschluss „deterministischer Craft-Output ist kein Fund" muss den finalen Craft eines auslaufenden Batches mit abdecken (Snapshot der Ausschluss-Liste eine Diff-Runde länger halten oder den Batch-Abschluss-Tick mitzählen). Erst dann ist die Craft-Bühne wirklich still — aktuell bekommt ausgerechnet der Einzeln-Nachcrafter (Ziel 1, der Jäger-Spielstil) weiter pro Craft einen falschen Jackpot, und im Treffer-Fall klaut er dem echten Reveal die Bühne.
3. **Drop-Seite bevertragen + Dialog-Optik angleichen.** (a) Suffix-Chance in % an Bestiarium-Dropzeilen/Loot-Tooltips (live mit Luck-Bonus, wie der Craft-Chip) und ein Zahlensatz im Altar-Hint — die Jagd-Hälfte des Systems spielt seit drei Runden ohne Vertrag. (b) Klein, aber stilbildend: Equip-Slot-Reroll vom nativen window.confirm auf das Pouch-Inline-Panel heben (R3-3), dann fühlt sich der heißeste Klick des Systems auch nach Grim Reach an.

## Was jetzt richtig gut ist (nicht mehr anfassen)

- **Der geschlossene Kreis:** Craft-Chip → Jackpot mit % → Pouch-Vergleich → Reroll (Tasche UND Leib) → Stats wandern live im Charakterbogen. Jede Station zahlt in die nächste ein.
- **Chip-Live-Loop** (Luck-Enchant hebt sichtbar alle Craft-Chips, 25,7 → 26,3 %) — weiterhin das beste Verzahnungs-Detail des Spiels.
- **Reroll-Dramaturgie im Pouch:** expandierende Zeile, ehrlicher Vertragstext, roter Confirm mit Preis, Jackpot mit Ergebnis-%, Pouch bleibt offen. Und der tote Button sieht jetzt tot aus.
- **Altar-Kern unverändert Best-in-Class:** Preview mit Vorher/Nachher, Kosten vor Abzug geprüft, Umbenennung („Precise Steel Scimitar") überall konsistent, Disenchant zu 50 %.
