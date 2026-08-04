# Fun-RETEST: Enchanting/Runen + Suffix-System — „Riko Rollwut" (R3)

**Fun-RETEST 2026-07-16** · Erstbesuch: Fun-Sweep F3 (2026-07-16, Bogen: `enchanting-riko.md`)
**Tester-Persona:** Riko Rollwut, der Perfekt-Roll-Bastler. Lebt für Item-Optimierung: Verzauberungen kombinieren, Suffix-Rolls jagen, das eine perfekte Stück bauen. Bewertet Craft-Loops nach Slot-Machine-Qualität (Erwartung → Roll → Ergebnis) und Entscheidungstiefe (Ressource vs. Chance).

## 1. Steckbrief & Test-Stats

| | |
|---|---|
| Gebiet | Suffix-Chance-Chip (Craft-Karten), Suffix-Treffer beim Craften, Roll-Qualität & Anzeige (Tooltip/Pouch), Suffix-REROLL (Kosten/Confirm/Ergebnis/Fehlerfälle), Altar-Enchant auf angelegtem rare-Item (alter B1), Altar-Hint, Bestiarium-Drop-Seite |
| Methode | Sim-Harness Port 5303, Fixture `midgame`, 4 Wegwerf-Skripte (`rt-riko-01..04.mjs`, gelöscht), Live-Patches via `__hfDebug`; Engine-Quellen gegengelesen (`suffix.ts`, `shared/index.ts`, `VariantPouchModal.tsx`, `Toasts.tsx`) |
| Sessions | 4 Harness-Läufe, 29 Screenshots (`ui-audit/shots/rt-riko-*.png`), ~60 echte Crafts, 6er-Reroll-Kette + Fehlerfall-Tests, 1 Altar-Enchant auf angelegtem Item, 4 injizierte Roll-Vergleichs-Instanzen |
| Gemessene Kernzahlen | Chip-Formel exakt verifiziert: 20 % Basis + 0,3 pp je lck-Punkt, lck-Bonus-Cap +15 pp (Chip 35 %), Gesamt-Cap 95 %; Reroll-Kosten formelgetreu (ilvl 60 rare = 1.600 Gold, ilvl 40 rare = 1.200 Gold, 6× exakt abgebucht); Enchant rare T1 = 400 Gold; Roll-Varianz unverändert ±15 % |

Das System in einem Satz, Stand heute: Die Slot-Machine hat jetzt einen **Vertrag** (Chance in % auf jeder Karte), einen **Reveal** (Jackpot-Toast mit Sound) und einen **Hebel** (🎲-Reroll mit ehrlichem Confirm) — nur die **Substanz** der Roll-Varianz ist bei Attribut-Suffixen weiterhin nach Rundung unsichtbar; das „98 % of max roll"-Label trägt die Jagd fast allein.

## 2. Session-Protokoll

1. **Der Chip ist da, und er rechnet richtig (stark).** Jede Equipment-Craft-Karte in Smithing trägt „✦ 25.7% SUFFIX CHANCE" (`rt-riko-02-card-chip.png`) — Steel Bar (Material) korrekt ohne. Nachgerechnet: Charakterbogen zeigt Luck 19 → 20 % + 19×0,3 pp = exakt 25,7 %. Live-Patch +10 lck → Chip springt auf 28,7 % (`rt-riko-03`); +510 lck → sauber gedeckelt bei 35,0 % (`rt-riko-04`); forcierte Basis-Chance 100 % → Gesamt-Cap 95 % greift (`rt-riko-25`). Hover-Hint: „Includes your current luck bonus". Der Vertrag steht.
2. **Der Moment, der mich wirklich erwischt hat:** Ich verzaubere am Altar meinen Scimitar mit einer Precise-Rune (+2 Luck, 400 Gold) — und ALLE Craft-Karten-Chips springen sofort von 25,7 % auf 26,3 % (`rt-riko-25`). Meine Verzauberung verzinst sichtbar meine Suffix-Jagd. Das ist Systemverzahnung, die man FÜHLT — kein Menü sagt es mir, die Zahl bewegt sich einfach.
3. **Die Pull-Serie mit Reveal (stark, mit einem Schatten).** ~58 Scimitar-Crafts bei ehrlichen 25,7 %: Treffer kommen im Erwartungsband (dokumentiert u. a. Eagle 86 %, Eagle 45 %, Wolf 54 %, Bull 39 %, Bear 36 %, Fox 18 %, Bear 10 %, Tiger 7 % — eine echte Streuung zum Vergleichen). Jeder Treffer feuert jetzt den Jackpot-Toast „ENCHANTED ITEM! Steel Scimitar · OF THE WOLF" im Rare-Stil mit Licht-Sweep und Achievement-Sound (`rt-riko-25-craft-suffix-reveal-fresh.png`) statt des alten Ecken-Toasts. ABER: daneben feuert bei JEDEM Craft eines rare-rarity Items ein „Rare find! Steel Scimitar"-Toast — 4 Crafts, 4 „Rare find!" (gezählt, `rt-riko-30`). Der deterministische Produktions-Toast entwertet die Jackpot-Währung und stapelt sich ÜBER meinen Suffix-Reveal.
4. **Der Pouch ist jetzt ein Vergleichs-Werkzeug (stark).** „4 VARIANT(S) OWNED": jede Zeile mit Roll-%-Chip (2 % / 98 %) und 🎲-Button mit Goldpreis direkt dran (`rt-riko-11-pouch-rolls.png`). Zwei namensgleiche „Steel Scimitar of Carnage" sind auf einen Blick unterscheidbar — mein alter B4 ist tot. Tooltip-Titel: „SUFFIX · OF CARNAGE · 98% OF MAX ROLL" — auch auf der ANGELEGTEN Instanz (`rt-riko-31`).
5. **Die Reroll-Schleife — mein alter Wunsch Nr. 3, und sie sitzt (stark).** 🎲 1.600 auf der Carnage-ilvl-60-Zeile (formelgetreu: rare, ilvl-Band T4). Klick → Zeile expandiert zum Confirm-Panel mit ehrlichem Text („may be worse, the same, or better") und rotem CONFIRM (1,600 GOLD) + Back (`rt-riko-16`). 6er-Kette: Carnage 2 % → Bull 94 % → Tiger 98 % → Fox 74 % → Wolf 37 % → Bull 86 % → Fox 47 %; jede Abbuchung exakt 1.600 Gold, Suffix in place ersetzt, ilvl bleibt (kein Exploit), Pouch bleibt offen, Zeile aktualisiert live, und jedes Ergebnis kommt als Jackpot-Toast MIT Roll-%: „SUFFIX REROLLED! Steel Scimitar · OF THE BULL (94%)" (`rt-riko-17`). Ich habe bei Roll 5 ehrlich „einen noch" gedacht. Das ist die Slot-Machine, die gefehlt hat.
6. **Fehlerfall Gold (solide, ein Optik-Makel).** Gold auf 100 gesetzt: Confirm-Button ist klick-tot (disabled, verifiziert im DOM) — aber er SIEHT exakt aus wie der aktive rote Button (`rt-riko-19` vs. `rt-riko-16`). Wer arm ist, sieht einen saftigen Knopf, der nichts tut, und keine Begründung.
7. **Der alte Fehl-Toast ist weg (B1-Retest).** Angelegten rare Steel Scimitar am Altar mit Precise T1 verzaubert: Vorschau „Luck +1 → +3", Kosten „400 Gold + 1 Rune" (`rt-riko-21`), Enchant → **null Toasts**, Gold exakt −400, Instanz sauber angelegt (`rt-riko-22`). Kein „Rare find!" mehr. Fix bestätigt.
8. **Was stumm blieb:** Der Altar-Hint sagt weiterhin wortgleich „Suffixes appear automatically…" — keine Zahl, kein Verweis auf den Chip (`rt-riko-20`). Und die Drop-Seite (8 % Basis-Chance bei Monster-Drops) taucht NIRGENDS auf: Bestiarium-Dropzeilen kennen das Wort Suffix nicht (`rt-riko-29`, Volltext-Check negativ). Die halbe Slot-Machine (Combat-Drops) läuft weiter ohne Vertrag.
9. **Angelegte Instanz rerollen? Geht nicht.** Tooltip der angelegten 98 %-Carnage: nur UNEQUIP (`rt-riko-31`). Die Engine kann Reroll auf `equippedInstances` (gegengelesen), aber es gibt keinen UI-Einstieg — ich muss ablegen, Pouch öffnen, rerollen, wieder anlegen. Reibung genau an der Stelle, wo der Loop am heißesten ist: an der Waffe, die ich trage.

## 3. Bewertungsbogen — alt → neu → Delta

| Aspekt | Alt | Neu | Δ | Begründung |
|---|---|---|---|---|
| Spaß sofort (erste 5 Min) | 7 | 8 | +1 | Chip in % auf jeder Karte beantwortet sofort „lohnt sich das?"; Altar-Formular unverändert Best-in-Class. |
| Spaß über Zeit (simuliert) | 5 | 7 | +2 | Rolls sind jetzt sichtbar und vergleichbar (Pouch/Tooltip), der Reroll gibt dem Grind ein Langzeit-Ziel; Substanz-Varianz bei Attribut-Suffixen bleibt aber dünn. |
| Sucht-Faktor („eine Runde noch") | 4 | 7 | +3 | Die 🎲-Kette (Confirm → Abbuchung → Jackpot-Toast mit %) ist eine echte Slot-Machine mit ehrlichem Vertrag — ich habe den „einen noch"-Sog real gespürt; Drop-Seite ohne Odds und substanzarme Attribut-Rolls kosten die letzten Punkte. |
| Belohnungs-Dichte & Dopamin | 6 | 7 | +1 | Suffix-Treffer feiern jetzt (Rare-Stil-Toast + Sound + Licht-Sweep); Abzug, weil der „Rare find!"-Spam bei rare-Crafts dieselbe Währung im Sekundentakt entwertet. |
| Ziel-Klarheit | 6 | 8 | +2 | „98 % of max roll" definiert das Chase-Ziel glasklar; der Chip sagt mir, WO ich jage und was mein Luck wert ist. |
| Tiefe & Entscheidungen | 7 | 8 | +1 | Reroll = saubere Gold-vs-Chance-Abwägung (1.600 Gold pro Zug bei 5.400 Startgold tut weh); lck-Investment hat jetzt einen sichtbaren Rückkanal. |
| Frustfreiheit | 6 | 7 | +1 | Confirm-Gate + ehrlicher Text + kein Fehlklick-Verlust; Abzüge: Disabled-Button ohne Disabled-Optik, kein Reroll am angelegten Item, Toast-Stapel überm Reveal. |
| Verzahnung | 8 | 9 | +1 | Der Enchant-hebt-Chip-Moment (Luck-Rune → alle Chips +0,6 pp, live) ist Verzahnung zum Anfassen; Gold-Sink Reroll, Pouch/Tooltip/Toast durchgängig konsistent. |

**GESAMT-SUCHT-URTEIL: 5/10 → 7,5/10.** Aus „Zufall ohne Vertrag" ist eine Slot-Machine mit Vertrag, Reveal und Hebel geworden. Die fehlenden 2,5 Punkte liegen an drei Stellen: Attribut-Suffixe rollen nach Rundung weiterhin substanzlos (das %-Label verspricht mehr Unterschied, als die Zahlen liefern), die Drop-Hälfte des Systems (8 % Basis) ist weiter unsichtbar, und der Reveal-Moment teilt sich die Bühne mit einem Spam-Toast.

**Komme ich morgen wieder?** „Ja — und zum ersten Mal wegen der Rolls, nicht trotz ihnen. Ich habe eine 98 %-Tiger-Waffe in der Kette weggeworfen, weil ich Carnage wollte, und das hat sich wie MEINE dumme, großartige Entscheidung angefühlt. Morgen hole ich mir das Carnage-98. Aber sagt mir endlich die Drop-Chance am Monster, und lasst mich die Waffe rerollen, die ich TRAGE."

## 4. Top-3-Verifikation (alte Empfehlungen)

| # | Alte Empfehlung | Status | Befund |
|---|---|---|---|
| 1 | **Roll-Qualität sichtbar & spürbar machen** — (a) Anzeige in Tooltip + Pouch, (b) Substanz: Varianz aufziehen oder feineres Raster | **(a) GUT, (b) HALBHERZIG** | (a) voll erlebbar: „98% OF MAX ROLL" im Tooltip-Gruppentitel (auch angelegt), Roll-%-Chip an jeder Pouch-Zeile. (b) Varianz weiter ±15 %; Flat-/Soft-Stats haben ein feineres Raster bekommen (Crit zeigt jetzt 2 % vs. 3 % über die Roll-Spanne, abgeleitete Speed-Zeile 2,6 s vs. 2,5 s) — aber der Wolf-Suffixblock ist bei Roll 2 % und 98 % weiterhin ZEICHENGLEICH („Attack Speed −0.1s / Strength +1"), und reine Attribut-Suffixe (Bear/Bull/Tiger, die Pool-Mehrheit bei weight 100) sind bei ilvl ≤ 60 über die gesamte Roll-Spanne wertidentisch (+2 Str ist +2 Str, ob 2 % oder 98 %). Das Label trägt die Jagd, die Substanz noch nicht. |
| 2 | **Chancen in % zeigen — überall** | **GUT auf der Craft-Seite, GAR NICHT auf der Drop-Seite** | Craft-Karten: Live-Chip inkl. lck-Bonus, mathematisch exakt (25,7 % bei lck 19, Cap 35 % bzw. 95 % Gesamt), reagiert live auf Luck-Enchants — besser als gefordert. Aber: Altar-`suffixHint` weiterhin wortgleich ohne Zahl, und die Drop-Suffix-Chance (8 % Basis) steht weder im Bestiarium noch an Loot-Tooltips. |
| 3 | **Reveal-Moment + Reroll-Hebel** | **GUT (Reveal mit Einschränkung, Reroll voll)** | Reveal: Suffix-Treffer = Rare-Stil-Jackpot-Toast + Sound statt Ecken-Toast — erlebt und gut; Einschränkung: kein Karten-Flash am Craft-Slot, und der parallele „Rare find!"-Spam (s. Neue Funde N1) drängt sich davor. Reroll: vollständig da und besser als von mir skizziert — am Pouch statt am Altar (näher am Item), ehrlicher Confirm, formelkonsistente Kosten, Ergebnis-Toast mit Roll-%, ilvl bleibt fixiert. Void-Fusions-Zeremonie (Teil c) nicht separat geprüft. |

## 5. Bug-Verifikation (alte Befunde)

| # | Alter Befund | Status | Beleg |
|---|---|---|---|
| B1 | Falscher „Rare find!"-Toast beim Verzaubern eines angelegten rare-Items | **WEG** | Angelegten rare Scimitar verzaubert: null Toasts, Gold exakt −400, Instanz korrekt (`rt-riko-22`); Zählung läuft laut Code jetzt über den Gesamtbesitz statt Topf-Diffs. |
| B2 | Roll-Varianz nach Rundung unsichtbar | **TEILBEHOBEN** | Soft-/Flat-Stats differenzieren jetzt (Crit 2 %→3 %, Speed-Endpunkte angehoben, 1-Dezimal-Raster); Attribut-Suffixe bleiben über die Roll-Spanne wertidentisch (s. Top-3 #1b). Das neue Roll-%-Label kaschiert das gut — löst es aber nicht. |
| B3 | Suffix-Chancen nirgends beziffert | **BEHOBEN (Craft-Seite)** | Live-Chip auf jeder Equipment-Craft-Karte; Drop-Seite weiter unbeziffert (→ N5). |
| B4 | Varianten-Pouch ohne Unterscheidbarkeit | **BEHOBEN** | Roll-%-Chip an jeder Zeile; namensgleiche Instanzen sofort unterscheidbar (`rt-riko-11`). |
| B5 | „Rune of Precision" gibt +Luck neben Waffen-Stat „Precision" | **NICHT BEHOBEN** | Grimoire-Karte „PRECISE T1 · +2 LUCK" direkt neben Scimitar-Zeile „Precision +15%" (`rt-riko-21`). Verwechslung weiter programmiert. |
| B6 | Fusion-Output rutscht bei vollem Inventar still in die Bank | **NICHT ERNEUT GEPRÜFT** | Diesmal Fokus auf Chip/Roll/Reroll; kein Widerspruchs-Befund. |

## 6. Neue Funde

| # | Schwere | Befund | Repro/Beleg |
|---|---|---|---|
| N1 | **BUG (Mittel, Toast-Ökonomie)** | **„Rare find!" feuert bei JEDEM deterministischen Craft eines rare-rarity Items.** 4 Scimitar-Crafts (Suffix-Chance ~0) = 4 „Rare find!"-Toasts. Beim Suffix-Treffer stapeln sich „Rare find!" + „Enchanted item!" (zwei Jackpot-Toasts für einen Craft). Produktion ist kein Fund — der Toast entwertet die Jackpot-Währung genau dort, wo der neue Suffix-Reveal glänzen soll. | `rt-riko-30-rarefind-spam.png`; Zähl-Log 4/4; Doppel-Stapel in `rt-riko-25` |
| N2 | **POLISH** | **Disabled-Confirm sieht aktiv aus.** Bei zu wenig Gold ist CONFIRM (1,600 GOLD) korrekt klick-tot, aber optisch identisch zum aktiven Zustand — kein Grau, kein Hinweis „Not enough gold" (der Engine-Fehlertext existiert, wird hier aber nie erreicht). | `rt-riko-19` vs. `rt-riko-16` |
| N3 | **POLISH** | **Kein Reroll-Einstieg für ANGELEGTE Instanzen.** Engine unterstützt `equippedInstances` explizit, Tooltip am Equip-Slot bietet nur UNEQUIP. Der heißeste Reroll-Kandidat (die getragene Waffe) erzwingt einen Ablegen-Umweg. | `rt-riko-31`; `suffix.ts` rerollSuffix-JSDoc |
| N4 | **POLISH** | **Fresh-Suffix-Toast ohne Roll-%.** Reroll-Toast zeigt „… OF THE BULL (94%)", der Erst-Fund-Toast nur „… OF THE WOLF". Gerade beim Erst-Fund will ich sofort wissen, ob sich das Behalten lohnt. | Toast-Log Lauf 1 vs. `rt-riko-17` |
| N5 | **POLISH** | **Drop-Suffix-Chance (8 % Basis + lck) nirgends sichtbar** — Bestiarium-Dropzeilen und Loot-Tooltips nennen keine Suffix-Chance; der Altar-Hint bleibt zahlenlos („appear automatically"). Die Craft-Seite hat ihren Vertrag, die Combat-Seite nicht. | `rt-riko-29`, Volltext-Check „suffix" negativ; Hint-Text-Log |
| N6 | **POLISH (alt-offen)** | B5 unverändert: „Precise"-Rune (+Luck) neben „Precision"-Waffenstat. | `rt-riko-21` |

Kein BLOCKER, keine Page-Errors in allen 4 Läufen, keine ASSET-Lücken im getesteten Pfad (Stern-Badge, Würfel-Icon, Rune-Art vorhanden).

## 7. Neue Top-3 für mehr Sucht-Faktor

1. **Attribut-Rolls Substanz geben — das %-Label muss die Wahrheit sagen.** „98 % of max roll" verspricht Differenz, aber +2 Str ist bei Bear/Bull/Tiger über die ganze Spanne +2 Str (ilvl ≤ 60). Entweder Roll-Varianz für Attribute auf ±30–40 % aufziehen oder die attrPerIlvl-Koeffizienten so legen, dass zwischen 0 % und 100 % mindestens 1 voller Punkt Differenz liegt (ab dem Suffix-Mindest-ilvl). Sonst lernt der Spieler beim ersten Side-by-side: „Roll-% ist Deko" — und genau daran stirbt die Jagd ein zweites Mal.
2. **„Rare find!" vom Fließband nehmen (N1) und den Suffix-Reveal solo auf die Bühne stellen.** Kein „Rare find!" für deterministische Craft-Outputs (Crafts sind Produktion; der Toast gehört Drops/Fusionen) — dann ist der „Enchanted item!"-Moment der EINE goldene Toast der Craft-Session, plus Roll-% im Erst-Fund-Toast (N4) und einem kurzen Flash auf der Craft-Karte. Ein Jackpot, der sich die Bühne nicht teilt, ist doppelt so laut.
3. **Reroll ans angelegte Item + Odds an die Drop-Seite.** (a) Reroll-Button in den Equip-Slot-Tooltip (Engine kann es schon) — die getragene Waffe ist der emotionalste Reroll-Kandidat, jeder Umweg kühlt den Impuls ab. (b) Suffix-Chance in % an Bestiarium-Dropzeilen/Loot-Tooltips („✦ 9,7 % Suffix-Chance" live mit lck) und ein Zahlensatz im Altar-Hint — dann gilt der Vertrag, der das Craften süchtig macht, endlich auch fürs Jagen.

## Was jetzt richtig gut ist (nicht mehr anfassen)

- **Der Chip-Live-Loop:** Luck-Enchant am Altar → alle Craft-Chips steigen sichtbar. Bestes Verzahnungs-Detail des Systems; bitte nie wegoptimieren.
- **Die Reroll-Dramaturgie:** Zeile expandiert → ehrlicher Vertragstext → roter Confirm mit Preis → Jackpot-Toast mit Ergebnis-%. Kein Modal-Gewitter, Pouch bleibt offen, Kette fühlt sich flüssig an.
- **Kosten-Konsistenz:** Reroll = Enchant-Kostenmodell (ilvl-Band × Rarity), 6× exakt abgebucht, ilvl nicht per Gold aufwertbar.
- **Enchant-Preview & Regel-Gates** (unverändert Best-in-Class) und der weiter tadellose Umbenennungs-Effekt („Precise Steel Scimitar" überall).
