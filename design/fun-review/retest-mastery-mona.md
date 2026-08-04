# Fun-RETEST: Mastery-System — „Mona Feilgrund, die Perfektionistin"

**Fun-RETEST 2026-07-16 · Agent R1 · Port 5301 · Erstbesuch: [mastery-mona.md](mastery-mona.md) (Fun-Sweep F1, 2026-07-16)**

## 1. Steckbrief

Ich bin Mona, die Spielerin, die in Melvor jede Mastery-Bar auf 99 zieht, wenn es sich lohnt.
Beim Erstbesuch war mein Urteil hart: Die Substanz stimmte, aber JEDER Stern und JEDER
Checkpoint fiel lautlos — Gesamt-Sucht 4 von 10. Heute war ich wieder da, gleiche Kernfrage:
**Fühlt sich das zweite Mal Grinden jetzt anders an — und sagt mir das Spiel das auch?**

## 2. Session-Protokoll

3 Sim-Sessions (Playwright headless, Port 5301, Fixtures `midgame` + `endgame`), 20 Screenshots
(`ui-audit/shots/rt-mona-*.png`), Audio-Play-Zähler instrumentiert, null Page-Errors in allen
drei Läufen.

**Session 1 — Live-Momente (der Kern meines alten Frusts).** Ich habe Normal Tree gehackt und
die XP knapp unter die Schwellen gelegt, um jeden Moment live abzupassen:

- **Mastery 1 → 2:** Diesmal kommt ein Toast. „★ Mastery — Normal Tree +1 → level 2", blauer
  Akzentstreifen, unten rechts im Spielfluss (`rt-mona-05-lvl2-toast.png`). Kein Sound (0
  Audio-Plays) — für einen gewöhnlichen Stern ist das die richtige Dosis.
- **Mastery 10:** „★ Mastery Milestone! Normal Tree reached Bronze rank, level 10" — eigener
  Meilenstein-Toast MIT Sound (1 Audio-Play) und bronzefarbenem Streifen; das ★-Label auf der
  Karte und der Mastery-Seite färbt sich dauerhaft bronze (`rt-mona-07-lvl10-toast.png`).
- **Mastery 25:** Silber-Rang, wieder Toast + Sound; die Karte zeigt ab jetzt ein silbernes
  „★ Mastery 25" (`rt-mona-09-lvl25-toast.png`).
- **Pool-Checkpoint 25 % live überschritten:** „★ Mastery Pool Checkpoint! Woodcutting pool at
  25%: permanently +4% speed" — goldener Titel, goldener Streifen, Sound
  (`rt-mona-12-pool25-toast.png`). Und das Beste: Direkt danach tragen ALLE
  Woodcutting-Karten sichtbar den skillweiten Bonus („+3 % ×2" auch auf Mastery-1-Karten) —
  der Checkpoint ist kein Geheimnis mehr, er steht sofort überall.
- Anti-Spam funktioniert: Level-Sprünge werden gebündelt („Normal Tree +14 → level 24"), und
  wenn mehrere Aktionen gleichzeitig einen Meilenstein reißen, kommt EIN Sammel-Toast
  („+2 more actions hit a milestone", `rt-mona-14-masterypage-default.png`).

**Session 2 — Mastery-Seite als Ziel-Brett?** Spread präpariert (★50/★25/★10/★5/★2 in
Woodcutting, eine 99er-Aktion in Mining, Verarbeitung in Smithing), Aktion laufen lassen:

- Jede Skill-Zeile trägt jetzt SCHON EINGEKLAPPT ein benanntes Ziel: „Next checkpoint: +3 %
  double yield in 3,799.5 XP" bzw. „Pool fully charged" (`rt-mona-14`, `rt-mona-19`).
- Checkpoint-Marker auf der Pool-Leiste haben Hover-Texte mit dem echten Bonus („25%: +4%
  speed", „95%: +5% double yield · +4% speed").
- Jede Aktions-Zeile nennt den nächsten Rang samt Bonus-Vorschau und Rest-XP: „Next rank: Gold
  at level 50 — +25 % double yield · +7 % speed — 93,491 XP to level 50". Läuft die Aktion
  gerade, steht eine echte ETA da: „Level 75 in 183 h 51 min" (`rt-mona-16-wc-block.png`).
- Rang-Treppe komplett erlebt: Bronze 10 / Silber 25 / Gold 50 / Platin 75 / Diamant 99,
  jeweils als Farbe auf dem ★-Label; Diamant schimmert animiert (Endgame-Session).
- Completed-Tab zeigt den Skill mit der maximierten Aktion (`rt-mona-18-completed-tab.png`).
- Der alte „−0 % ⏱"-Chip ist weg — programmatisch die ganze Seite abgesucht: kein Vorkommen.

**Session 3 — Endgame.** Fixture endgame (Total-Level 1915): Smithing hat jetzt eine
Schaufenster-Leiter (★10 bis ★99 quer durch die Ränge, `rt-mona-20-endgame-smithing.png`),
eine Aktion ist maximiert, Preservation-Chips zeigen bis „39 % ♻". Ring trotzdem nur 2 %,
Woodcutting-Pool 0 % bei Skill-Level 97 — dazu unten mehr.

## 3. Bewertungsbogen (alt → neu → Delta)

| Aspekt | alt | neu | Δ | Begründung |
|---|---|---|---|---|
| Spaß sofort (erste 5 Minuten) | 3 | 7 | +4 | Der erste Stern landet nach ~1 Minute Hacken MIT Toast — der namensgebende Moment existiert jetzt; auf der Karte selbst pulsiert allerdings weiterhin nichts. |
| Spaß über Zeit | 6 | 7 | +1 | Der Tropf ist jetzt LESBAR (Rang-Vorschau, Rest-XP), aber die Kurve selbst ist unverändert — zwischen den Rängen bleibt mechanisch alles ein 0,5-%-Rinnsal. |
| Sucht-Faktor („eine Runde noch") | 3 | 7 | +4 | „766 XP to level 10" und „Next checkpoint in 138 XP" sind echte Eine-Runde-noch-Anker — ich habe mich selbst dabei ertappt; sie hängen nur leider fast alle auf der Mastery-Seite statt an der Karte, wo man spielt. |
| Belohnungs-Dichte & Dopamin | 2 | 8 | +6 | Toast je Stern, Meilensteine mit Sound + Rangfarbe, Pool-Checkpoints gefeiert, sauberes Batching gegen Spam — der größte Sprung des Retests. Kein 9, weil Meilensteine nichts Materielles geben. |
| Ziel-Klarheit | 4 | 8 | +4 | Nächster Rang benannt + beziffert + terminiert, Checkpoint-Boni am Marker, „Pool fully charged" als Abschluss — vorbildlich. Abzug: „Legendary" auf allen Skills ist weiter Rauschen, 1/760 weiter das einzige Fernziel. |
| Tiefe & Entscheidungen | 5 | 5 | ±0 | Ehrlich: Es gibt nichts Neues zu ENTSCHEIDEN. Mastery passiert weiter passiv der einen AFK-Aktion; Ränge sind Kosmetik, der Pool bleibt Beifang. |
| Frustfreiheit | 7 | 7 | ±0 | Nichts Neues frustriert; Kleinigkeiten (261-Zeilen-Wand in Smithing, Dezimal-XP, „183 h"-ETA als Motivationsdämpfer) kosten den Aufstieg. |
| Verzahnung mit dem Rest | 6 | 7 | +1 | Pool-Boni schlagen sofort sichtbar auf ALLE Karten des Skills durch; Zeit-/Ertragskacheln rechnen live mit. Das Karten-Badge summiert aber weiter Pet+Pool+Buff unter der Überschrift „Mastery". |

**GESAMT-SUCHT-URTEIL: 4 → 7 (+3).**

**„Komme ich morgen wieder?"** — „Ja — und diesmal wegen der Mastery. Ich habe beim Testen
Blackwood auf Bronze gezogen, weil ‚766 XP to level 10' da stand und ich es nicht stehen
lassen konnte. DAS ist der Haken, der letztes Mal fehlte. Was mich noch nicht hält: Auf der
Skill-Karte, wo ich tatsächlich spiele, steht keiner dieser Termine."

## 4. Top-3-Verifikation (meine alten Empfehlungen)

1. **„Mastery-Momente einbauen" → GUT umgesetzt.** (a) Toast bei jedem Level-Up: ja, live
   erlebt, mit Batching. (b) Eigener Pool-Checkpoint-Toast mit Bonus-Text: ja, wortwörtlich
   („Woodcutting pool at 25%: permanently +4% speed"), goldene Sonderoptik + Sound; bei
   mehreren gleichzeitig gerissenen Checkpoints kommt sinnvoll nur der höchste. Meilensteine
   (10/25/50/…) haben stärkeren Look + Sound. (c) Stern-Puls auf der Karten-Mastery-Bar beim
   Level-Up: NICHT da — ich habe die Karte im Moment des Crossings per DOM beobachtet, es
   ändert sich nur die Zahl. Der Toast trägt den Moment allein. 2,5 von 3 Punkten.

2. **„Ziele sichtbar machen" → GUT auf der Mastery-Seite, HALBHERZIG an der Karte.**
   Checkpoint-Marker mit Bonus-Hover: ja. „Nächster Checkpoint: Bonus in X XP (+ETA wenn
   aktiv)": ja, pro Skill-Zeile, sogar eingeklappt sichtbar. Nächster-Stern-Zeile mit
   Rest-XP/ETA je Aktion: ja. ABER: Der Mastery-Tooltip auf der Skill-Karte ist unverändert
   („Action mastery grows as you repeat it…") — keine ETA, kein nächstes Ziel dort, wo der
   Spieler die Stunde verbringt. Genau die Hälfte meiner Empfehlung.

3. **„Meilenstein-Sprünge statt reinem 0,5-%-Tropf" → HALBHERZIG.** Die kosmetische Hälfte ist
   liebevoll da: Bronze/Silber/Gold/Platin/Diamant als dauerhafte Label-Färbung auf Karte UND
   Seite, Diamant animiert bei 99. Aber es gibt KEINEN fühlbaren mechanischen Sprung bei
   10/25/50 (kein Einmal-Bonus, kein Paket), das Fernziel „1 / 760 maxed" steht ohne
   erreichbare Zwischenziele da („Aktionen auf Bronze+: 5/16" fehlt), und das
   „Legendary"-Badge hängt unverändert an der Aktions-Anzahl — alle 11 Skills tragen
   dasselbe Wort, Information weiter null.

## 5. Bug-Verifikation (meine alten Funde)

- **„−0 % ⏱"-Chip bei Mastery 2–4: WEG.** Ganze Seite mit ★2-Zeile programmatisch abgesucht,
  kein „−0%" mehr. Kleiner neuer Schönheitsfehler in der Gegenrichtung: ★2 zeigt „+1 % ×2",
  real sind es 0,5 % (Aufrundung verspricht das Doppelte des echten Werts).
- **Alle Skills „Legendary": NICHT BEHOBEN.** Identisches Badge auf allen 11 Skill-Zeilen,
  in midgame UND endgame verifiziert.
- **Endgame-Fixture ohne Mastery-Daten: TEILWEISE BEHOBEN.** Jetzt 14 Einträge (Smithing-
  Leiter ★10–★99 über alle Ränge, 1 maximierte Aktion → Completed-Tab testbar, Mining/Cooking
  etwas Pool). Für einen Total-Level-1915-Charakter aber weiter unplausibel: Woodcutting-Pool
  0 % bei Skill 97, Ring 2 % — ein echter Spieler hätte längst volle Pools. Sweeps, die
  Endgame-Mastery beurteilen, werden weiter verzerrt.
- **Design-Flag Pool-Mathe: UNVERÄNDERT.** Eine einzige Aktion auf ~★47 füllt den ganzen
  Woodcutting-Pool (im Test: ★50 allein → „Pool fully charged"); Checkpoint-Pacing schwankt
  weiter extrem (Cooking „in 138 XP" neben Crafting „in 36,207 XP"); der Pool bleibt Beifang
  der Lebenszeit-XP statt ansteuerbares Ziel. Die neuen XP-Zahlen machen diese Varianz jetzt
  sogar sichtbarer.
- **Karten-Badge summiert alle Quellen unter „Mastery": UNVERÄNDERT** (★25 zeigt „+15 % ×2"
  = 12 % Mastery + 3 % Pool). Weiter nur ein Lesbarkeitspunkt, kein Fehler.

## 6. Neue Funde

- **[POLISH] Smithing-Aufklappen ist eine 22.000-Pixel-Wand.** 261 Aktions-Zeilen, jede jetzt
  zweizeilig (Next-Rank-Zeile) — ohne Sortierung „nächster Rang zuerst", Filter oder Suche
  ist die Liste als Ziel-Brett unbrauchbar; die Skill-Seite gruppiert längst nach Tiers
  (`rt-mona-21-endgame-skillpage.png`), die Mastery-Seite nicht.
- **[POLISH] Dezimal-XP in Ziel-Zeilen:** „in 3,799.5 XP", „in 8,634.5 XP" — halbe XP sind
  Rechen-Artefakte und sehen unfertig aus; ganzzahlig runden.
- **[POLISH] Aufrundungs-Chip bei ★2–★4:** „+1 % ×2" bei real 0,5 % (s. o.) — auf eine
  Dezimale („+0,5 %") oder erst ab echtem 1 % anzeigen.
- **[POLISH] Ohne laufende Aktion keine ETA** — nur nackte Rest-XP. Verständlich (keine Rate
  ableitbar), aber eine „bei deiner üblichen Rate"-Schätzung aus der letzten Session wäre der
  bessere Anker. Klein.
- **[POLISH] „183 h 51 min"-ETAs demotivieren mehr als sie ziehen.** Die Ehrlichkeit ist
  richtig, aber ab ~50 wird jede Rang-ETA drei- bis vierstellig in Stunden — genau dort wäre
  ein NÄHERES Zwischenziel (s. neue Top-3 #2) wichtig, damit die Zeile nicht „nie" liest.
- Kein BLOCKER, kein neuer BUG, kein ASSET-Bedarf; alle drei Sessions ohne Page-Errors.

## 7. Meine NEUEN Top-3 für mehr Sucht-Faktor

1. **Die Anker an die Karte holen.** Der Spieler verbringt die Stunde auf der Skill-Seite,
   nicht auf der Mastery-Seite. In die Mastery-Zeile der Aktionskarte gehört ein Mini-Ziel:
   „★ 23 → Silber in 1,2k XP (~18 min)" (Tooltip reicht zur Not, besser direkt sichtbar) —
   plus der immer noch fehlende kurze Stern-Puls/Glow der Zeile beim Level-Up. Die Daten
   existieren alle schon auf der Mastery-Seite; das ist Verkabelung, kein neues System.
2. **Meilensteine fühlbar + Zwischenziele zählbar machen.** Bronze/Silber/Gold sind hübsch,
   aber leer: je Rang ein kleiner Einmal-Effekt (Material-Päckchen, einmalig +3 %
   Doppelertrag-Schub für die Aktion, o. ä.), und im Seitenkopf erreichbare Zähler statt nur
   „1 / 760": „Bronze+: 5/16 in Woodcutting · nächster: Blackwood in 766 XP". Das
   „Legendary"-Badge endlich durch den verdienten Skill-Rang ersetzen (Ø-Mastery →
   Bronze/Silber/Gold) — dann ist das Badge selbst ein Ziel.
3. **Den Pool zum Ziel machen statt zum Beifang.** Solange eine Aktion den ganzen Pool füllt
   und alle Checkpoints im Vorbeigehen fallen, bleibt die schönste Checkpoint-Inszenierung
   Deko. Kapazität an Breite koppeln (z. B. nur die besten N Aktionen zählen je zur Kappe
   Referenz-Level 20) oder Checkpoints an „X Aktionen auf Bronze+" hängen — irgendetwas, das
   der Perfektionistin einen GRUND gibt, die zweite und dritte Aktion anzufassen. Das ist
   der einzige meiner alten Kernpunkte, den das Programm komplett liegen gelassen hat.
