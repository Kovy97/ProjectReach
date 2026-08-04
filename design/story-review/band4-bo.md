# Band 4 — Bo Flink, der Speedrunner · Aschechronik Kapitel 13–17

## Persona-Steckbrief
**Bo Flink, der Speedrunner.** Pacing-Fanatiker. Ich messe die tote Zeit zwischen den Kapiteln,
suche Gate-Reibung und Leerlauf und will, dass jeder Schritt sich wie Fortschritt anfühlt. Ich hasse
Wartezonen und Backtracking. Gear nur so viel wie das Tempo verlangt. Ich finde die optimale Route
und fühle jede Sekunde Reibung.

## Methode & Fluss-Befund (Machbarkeit belegt)
Gegengeprüft habe ich die Gate-Kette read-only direkt am Kanon-Content (`packages/content/src/index.ts`),
statt eine Browser-Instanz hochzufahren — für die reine Fluss-Frage präziser, und im Rahmen der
Budget-Regeln (keine App-Instanz/Langläufer). Der Takt 12→17 löst sich lückenlos vorwärts auf:

- Zone `wildwood` ← ch11 · Dungeon `wildwood_hunt` ← ch12
- **ch13** killt `forest_bear` (`dungeonOnly`, `wildwood_hunt` Welle 4) + `dire_wolf` (Overworld wildwood) → öffnet Zone `coast`
- **ch14** killt `reef_drowned`/`tide_siren` (beide `coast`) → öffnet Zone `slagpit`
- **ch15** killt `iron_revenant`/`frost_hexer` (beide `slagpit`) → öffnet Zone `highlands`
- **ch16** killt `roc`-Union/`gravecliff_specter` (alle `highlands`) → öffnet Dungeon `highland_aerie`
- **ch17** killt `roc_storm` (`dungeonOnly`, `highland_aerie` Welle 4) → öffnet Dungeon `wyvern_lair`

**Drei Dinge, die den Fluss retten:** (1) Jedes Grind-Ziel liegt in der GERADE geöffneten Zone —
null Backtracking über 13→17. (2) Kampf ist Monster-Auswahl aus einer Liste, kein Zufalls-Spawn — es
gibt kein „auf die Sirene warten"-Leerlauf; jedes Zielmonster ist direkt anwählbar. (3) Die
Boss-Kapitel-Ziele sind `dungeonOnly`, also erreichbar und sauber gegatet, aber nie im Overworld
trivialisierbar. Kein einziges Gate zeigt auf etwas Unerreichbares. Die einzige Reibung im Band ist
Grind-**Länge**, nicht Gate-**Reibung**.

**Rhythmus-Diagnose:** Boss(13) → Grind 40 (14) → Grind 20 + Reveal (15) → Grind 33 (16) → Boss(17).
Die zwei Dungeon-Beats klammern die Mitte sauber ein — aber 14-15-16 sind drei Grind-Kapitel am
Stück (~93 Kills), und nur der Ch15-Reveal setzt dazwischen einen echten Beat. Genau da fühle ich die
Sekunden ticken.

---

### chronicle_13 — Die alte Jagd / The Old Hunt
- Spaß: 7/10
- Einfallsreichtum: 7/10
- Machbarkeit: 8/10
- Notiz: Knackiger Dungeon-Höhepunkt nach dem Ch12-Grind, gestaffelte Wellen (Heulen→Hirsch→Schreckenswolf→Alter), öffnet direkt die Küste. Der Reißzahn als Clear-Loot fühlt sich wie verdienter Fortschritt. Ein Boss-Kapitel, das nach einem Zug riecht — mag ich.
- Bug/Blocker: keiner. Routing-Reibung (kein Blocker): `dire_wolf` ist zugleich Overworld-Spawn UND Dungeon-Welle 3 (1 Credit/Run). Die Ziel-Reihenfolge „3 Schreckenswölfe, dann der Alte" lockt Naive zu 3 Dungeon-Runs; die optimale Route ist 3 Wölfe Overworld + 1 Run. Ich finde sie, ein Gelegenheitsspieler frisst den Umweg.

### chronicle_14 — Was die See heimträgt / What the Sea Gives Back
- Spaß: 5/10
- Einfallsreichtum: 6/10
- Machbarkeit: 8/10
- Notiz: Der schwerste Einzel-Grind des Bandes: 30 Ertrunkene + 10 Sirenen = 40 Kills, alles in der frisch geöffneten Küste. Mechanisch ein glatter Doppel-Kill-Grind ohne Zwischen-Beat — hier fühle ich die tote Zeit am deutlichsten, auch wenn jeder Kill zählt. Die Zahl 30 ist der längste beat-lose Abschnitt der Kette.
- Bug/Blocker: keiner. Fluss sauber, öffnet slagpit, kein Backtracking.

### chronicle_15 — Die kalte Esse / The Cold Forge
- Spaß: 6/10
- Einfallsreichtum: 7/10
- Machbarkeit: 8/10
- Notiz: Kürzer (10+10) und symmetrisch — „beide Gesichter der Grube", Glut und Frost. Der große Zeugen-Reveal landet genau hier und gibt dem Grind endlich eine Auszahlung; das ist der narrative Hochpunkt des Bandes und der einzige echte Mitten-Beat. Nach dem 40er-Marathon von Ch14 fühlt sich das 20er-Ziel fast schnell an.
- Bug/Blocker: keiner. Öffnet highlands, sauber.

### chronicle_16 — Der dünne Himmel / The Thin Sky
- Spaß: 5/10
- Einfallsreichtum: 6/10
- Machbarkeit: 8/10
- Notiz: Zweitschwerster Grind (25 Rocs + 8 Klippengeister = 33) und der dritte Grind in Folge — genau hier zieht die Mitte zäh. Immerhin ist es die Rampe zum Ch17-Dungeon, also läuft es auf einen Beat zu. Atmosphärisch stark (dünner Schleier), mechanisch wieder nur Doppel-Kill.
- Bug/Blocker: keiner. Öffnet den Dungeon `highland_aerie` sauber.

### chronicle_17 — Der Horst / The Aerie
- Spaß: 7/10
- Einfallsreichtum: 7/10
- Machbarkeit: 8/10
- Notiz: Sauberer, fokussierter Dungeon-Payoff nach dem Ch16-Grind — ein Ziel (`roc_storm`), aber als Welle 4 hinter drei gestaffelten Elite-Wellen (Wächter→Schwinge→Ältester→Sturmbringer), mit Enrage + Schock. Öffnet direkt das nächste Lager. Genau die Art Kapitel, die sich wie ein Zug statt wie Füller anfühlt.
- Bug/Blocker: keiner. `roc_storm` `dungeonOnly` und erreichbar; Gate öffnet `wyvern_lair`.

---

## Summe & Empfehlung (Bo-Sicht)
Der Fluss ist im Kern schnell und ehrlich: kein Backtracking, kein Spawn-Warten, jedes Gate zeigt
vorwärts, die Boss-Kapitel klammern die Kette. Die Reibung ist rein Grind-**Länge** in der Mitte
(14-15-16). Zwei billige Tempo-Gewinne, falls jemand nachjustieren will: (a) Ch14 von 30 auf ~20
Ertrunkene ziehen, damit der 40er-Block nicht der längste beat-lose Abschnitt bleibt; (b) Ch13s
Ziel-Text so schärfen, dass die Overworld-Route für die Schreckenswölfe klar ist (oder den Wolf aus
der Dungeon-Welle nehmen), damit niemand aus Versehen 3 Runs grindet. Beides sind Feinschliffe, keine
Blocker — die Kette ist launch-tauglich.
