# Fun-Sweep RUNDE 3: Mastery-System — „Mona Feilgrund, die Perfektionistin"

**Fun-Sweep Runde 3 · 2026-07-16 · Port 5309 · Vorbesuche: [mastery-mona.md](mastery-mona.md) (R1) · [retest-mastery-mona.md](retest-mastery-mona.md) (R2)**

## 1. Steckbrief

Dritter Besuch. Meine Reise in einem Satz: In Runde 1 fiel jeder Stern lautlos (Gesamt-Sucht
4/10), in Runde 2 hatte das System plötzlich Momente und Ziele und ich blieb freiwillig hängen
(7/10) — heute wollte ich wissen, ob die dritte Runde den letzten Schritt macht: die Anker
dorthin holen, wo ich tatsächlich spiele. Kernfrage wie immer: **Fühlt sich das zweite Mal
Grinden anders an — und sagt mir das Spiel das auch, während ich es tue?**

## 2. Session-Protokoll

3 Sim-Sessions (Playwright headless, Port 5309, Fixtures `midgame` + `endgame`), 12 Screenshots
+ 2 Zoom-Crops (`ui-audit/shots/rt3-mona-*.png`), Audio-Zähler + MutationObserver auf der
Aktionskarte instrumentiert, 0 Page-Errors in allen drei Läufen.

**Session A — Live-Momente (Regression + Karten-Check).** Normal Tree gehackt, XP knapp unter
die Schwellen gelegt, jeden Moment live abgepasst:

- **Mastery 1 → 2:** Toast kommt wie in R2 („★ Mastery — Normal Tree +1 → level 2", blauer
  Streifen, kein Sound — richtige Dosis; `rt3-mona-01-lvl2-toast.png`). Ich hatte diesmal einen
  MutationObserver auf der Mastery-Zeile der KARTE: im Moment des Crossings ändert sich dort
  exakt nichts außer der Zahl (0 Klassenwechsel, 0 laufende CSS-Animationen; einzige Mutation:
  der „+1 % ×2"-Chip erscheint). Der Stern-Puls an der Karte fehlt weiterhin — dritter Besuch,
  dritte Runde ohne ihn.
- **Karten-Tooltip:** wortgleich zu R2 („Action mastery grows as you repeat it. Double-yield
  chance: 1% · speed bonus: 0%."). Kein nächstes Ziel, keine ETA an der Karte. Und: „1 %" bei
  real 0,5 % — dazu unten mehr.
- **Meilenstein ★10:** „Mastery Milestone! Normal Tree reached Bronze rank, level 10" mit Sound,
  Label auf der Karte färbt sich dauerhaft bronze (`rt3-mona-02-lvl10-milestone.png`). Batching
  intakt: mein präparierter Sprung kam als EIN Sammel-Toast, der Silber-Meilenstein von Oak Tree
  als eigene Karte.
- **Pool-Checkpoint 5 % live gerissen:** goldener Toast „Woodcutting pool at 5%: permanently
  +3% double yield" mit Puls-Glow (`rt3-mona-03-pool25-toast.png`, Zoom `rt3-mona-03b`), und
  direkt danach tragen ALLE Woodcutting-Karten den skillweiten „+3 % ×2"-Chip, auch die auf
  Mastery 1 (`rt3-mona-04-cards-after-cp.png`). Bei mehreren gleichzeitig gerissenen
  Checkpoints kommt weiterhin nur der höchste.

**Session B — Ziel-Brett & Fix-Verifikation.** Spread präpariert (★60/★49/★24/★5/★2 in
Woodcutting, Mining eine Aktion ★99), Aktion laufen lassen, Mastery-Seite seziert
(`rt3-mona-05` bis `rt3-mona-09`):

- ★2-Zeile zeigt jetzt **„+0,5 % ×2 −0,1 % ⏱"** — ehrliche 1-Dezimal-Anzeige statt der alten
  Aufrundung auf „+1 %" (`rt3-mona-08-wc-eta.png`).
- Dezimal-XP: ganze Seite programmatisch abgesucht (Regex auf „x.y XP"): **0 Treffer.** Alle
  Ziel-Zeilen ganzzahlig („774 XP to level 25", Pool „in 58,334 XP").
- Rang-Treppe, Next-Rank-Zeilen mit Bonus-Vorschau, Checkpoint-Hover, „Pool fully charged",
  Completed-Tab (Mining): alles da und funktional wie in R2.
- Laufende ★60-Aktion: „Level 75 in **152 h 43 min**" — die dreistellige Stunden-ETA steht
  unverändert als Motivationsdämpfer da.
- Smithing aufgeklappt: **261 Zeilen, 22.755 px hoch, 0 Filter-/Such-/Sortier-Controls**
  (`rt3-mona-07-smithing-wall-top.png`).
- Alle **11** Skill-Zeilen tragen weiterhin dasselbe „Legendary"-Badge; Kopf weiterhin nur
  „Total Mastery" + „Maxed Actions 1 / 760", keine erreichbaren Zwischenzähler.
- Nebenbei mein Design-Flag erneut live belegt: die EINE ★99-Mining-Aktion aus meiner
  Präparation riss allein den 95-%-Capstone („Mining pool at 95%…") und stellte den Pool auf
  „fully charged" — ohne dass je eine zweite Mining-Aktion angefasst wurde.

**Session C — Endgame.** Fixture `endgame` (Total-Level 1915): Smithing-Schaufenster-Leiter
★99 (Diamant, schimmert) / ★94/★87/★80 (Platin) / ★73/★66 (Gold) … bis ★1, Preservation-Chips
bis 39,2 % ♻, Completed-Tab zeigt Smithing (`rt3-mona-10`, `rt3-mona-12`). Aber: Ring weiterhin
**2 %**, Woodcutting-Pool ~0 % bei Skill-Level 97, Fishing 0 %, Cooking 4,9 % — dieselben 14
Mastery-Einträge wie in R2, kein weiterer Backfill. Ein echter 97er-Charakter hätte volle Pools.

## 3. Bewertungsbogen

| Aspekt | R1 | R2 | R3 | Δ(R2→R3) | Begründung |
|---|---|---|---|---|---|
| Spaß sofort (erste 5 Minuten) | 3 | 7 | 7 | ±0 | Der erste Stern kommt nach ~1 Minute mit Toast — aber exakt wie in R2: auf der Karte selbst pulsiert weiterhin nichts, und ihr Chip verspricht sogar das Doppelte des echten Werts (+1 % bei 0,5 %). |
| Spaß über Zeit | 6 | 7 | 7 | ±0 | Kurve, Ränge, Pool-Mathe: alles mechanisch identisch zu R2 — lesbarer Tropf, aber derselbe 0,5-%-Tropf. |
| Sucht-Faktor („eine Runde noch") | 3 | 7 | 7 | ±0 | „774 XP to level 25" zieht mich immer noch — aber weiterhin nur auf der Mastery-Seite; an der Karte, wo die Stunde vergeht, hängt nach wie vor kein einziger Anker. |
| Belohnungs-Dichte & Dopamin | 2 | 8 | 8 | ±0 | Alle Momente aus R2 live regressionsgeprüft und intakt (Stern-Toast, Rang-Sound, Gold-Checkpoint, Batching); nichts Neues dazu, kleiner Schönheitsfehler am Pool-Toast (s. Neue Funde). |
| Ziel-Klarheit | 4 | 8 | 8 | ±0 | Die Ziel-Zeilen sind durch die zwei KK-Fixes ehrlicher geworden (ganzzahlige XP, echte 0,5 %), aber beide R2-Abzüge stehen: „Legendary" auf allen 11 Zeilen ist Rauschen, „1 / 760" das einzige Fernziel. |
| Tiefe & Entscheidungen | 5 | 5 | 5 | ±0 | Unverändert nichts zu ENTSCHEIDEN: Mastery passiert der einen AFK-Aktion, Ränge sind Kosmetik, der Pool bleibt Beifang (eine ★99-Aktion = voller Pool, live belegt). |
| Frustfreiheit | 7 | 7 | 7 | ±0 | Dezimal-XP als kleinster der drei R2-Irritationspunkte ist weg; die beiden schwereren (261-Zeilen-Wand, „152 h 43 min"-ETA) stehen unverändert. |
| Verzahnung mit dem Rest | 6 | 7 | 7 | ±0 | Pool-Boni schlagen weiter sofort auf alle Karten durch; dafür zeigen Karte und Mastery-Seite jetzt DENSELBEN Wert unterschiedlich gerundet an (0,5 % vs. 1 %) — die Fix-Runde hat nur eine der zwei Stellen angefasst. |

**GESAMT-SUCHT-URTEIL: 4 → 7 → 7 (Δ R2→R3: ±0).**

**„Komme ich morgen wieder?"** — „Ja, und immer noch wegen der Mastery-Seite: ‚774 XP bis
Silber' lässt mich nicht los. Aber Runde 3 war für mich als Mastery-Spielerin die erste Runde
Stillstand: alles, was mich in Runde 2 gepackt hat, funktioniert noch — und nichts von dem, was
ich mir für Runde 3 gewünscht habe, ist passiert. Die Karte, vor der ich die Stunde sitze,
ist so stumm wie am ersten Tag."

Einordnung streng UND fair: Der Trend 4 → 7 → 7 ist kein Absturz, sondern ein Plateau. Die
Fix-Runde seit R2 hat zwei meiner fünf R2-POLISH-Funde sauber behoben (die zwei kleinsten),
aber keinen meiner Top-3-Punkte — davon liegen zwei erklärtermaßen im Balance-Block, der
dritte (Karten-Anker) war als „reine Verkabelung" markiert und blieb trotzdem liegen.

## 4. Runde-2-Funde-Verifikation

1. **★2-Chip „+1 %" bei real 0,5 %: BEHOBEN — aber nur auf der Mastery-Seite.** Dort jetzt
   „+0,5 % ×2 −0,1 % ⏱" mit 1-Dezimal-Gate (live verifiziert, `rt3-mona-08`). Derselbe Fehler
   lebt aber unverändert auf der **Skill-Karte** weiter: Chip „+1 % ×2" und Tooltip
   „Double-yield chance: 1%" bei real 0,5 % (★10: „+5 %" bei real 4,5 %; nach Checkpoint
   „+8 %" bei real 7,5 %). Halber Fix — s. Neue Funde.
2. **Dezimal-XP in Ziel-Zeilen: BEHOBEN.** Ganze Seite programmatisch abgesucht, 0 Treffer;
   Aktions- UND Pool-Zeilen ganzzahlig.
3. **Smithing-261-Zeilen-Wand: NICHT BEHOBEN.** 261 zweizeilige Rows, 22.755 px, keinerlei
   Sortier-/Filter-/Such-Controls (DOM-Zählung + `rt3-mona-07`). Als Ziel-Brett unbrauchbar.
4. **Dreistellige Stunden-ETAs: NICHT BEHOBEN.** „Level 75 in 152 h 43 min" an der laufenden
   ★60-Aktion; ohne laufende Aktion weiterhin nur nackte Rest-XP (auch das unverändert).

Ältere Funde, mitgeprüft: „Legendary"-Badge auf allen 11 Skills — unverändert. Endgame-Fixture
— unverändert zu R2 (14 Einträge, Ring 2 %, Woodcutting-Pool ~0 % bei Skill 97). Pool-Mathe —
unverändert (Kapazität = Aktionszahl × XP(Referenz-Level 20), Lebenszeit-Summe). Karten-Badge
summiert weiter Mastery+Pool+Pet unter der Überschrift „Mastery" (Lesbarkeitspunkt).

## 5. Runde-2-Top-3-Check

1. **„Die Anker an die Karte holen" → NICHT PASSIERT.** Mastery-Zeile der Aktionskarte ist
   byte-gleich zu R2: kein Mini-Ziel, keine ETA, Tooltip generisch, und der Stern-Puls beim
   Level-Up fehlt weiter (per MutationObserver im Crossing-Moment belegt: nur die Zahl ändert
   sich). Das war der einzige meiner drei Punkte OHNE Balance-Abhängigkeit — reine Verkabelung
   bereits existierender Daten — und er ist der einzige Grund, warum R3 sich wie R2 anfühlt.
2. **„Meilensteine fühlbar + Zwischenziele zählbar" → NICHT PASSIERT.** Ränge weiter rein
   kosmetisch (kein Einmal-Effekt), Kopf weiter nur „1 / 760", „Legendary" unverändert an der
   Aktions-Anzahl. Fair: die MECHANISCHE Hälfte (Rang-Boni) liegt bewusst im Balance-Block —
   akzeptiert. Aber die Zähler-Hälfte („Bronze+: 5/16 · nächster: Blackwood in 726 XP") und
   der Badge-Tausch sind reine UI und hätten keine Balance-Freigabe gebraucht.
3. **„Pool ansteuerbar statt Beifang" → NICHT PASSIERT.** Mathe identisch; ich habe es in
   Session B unfreiwillig erneut demonstriert: eine einzige ★99-Aktion füllt den kompletten
   Skill-Pool und reißt den 95-%-Capstone, ohne dass Breite je verlangt wird. Auch das liegt
   vermutlich im Balance-Block — solange er zu ist, bleibt die schönste
   Checkpoint-Inszenierung Deko, die im Vorbeigehen abgeräumt wird.

## 6. Neue Funde

- **[BUG] Skill-Karte rundet Mastery-Chancen auf Ganzzahl AUF — inkonsistent zum frischen
  Seiten-Fix.** `SkillPage.tsx` (Mastery-Zeile, Chip + Tooltip) nutzt weiter
  Ganzzahl-Rundung: ★2 zeigt „+1 % ×2" (real 0,5 %), ★10 „+5 %" (real 4,5 %), nach
  5-%-Checkpoint „+8 %" (real 7,5 %); der Tooltip nennt dieselben aufgerundeten Werte. Die
  Mastery-Seite zeigt seit Welle KK korrekt „+0,5 %". Folge: dieselbe Chance steht an zwei
  Orten verschieden — genau die Vertrauensfrage, die der KK-Fix lösen sollte, nur eine Tür
  weiter. Fix = dasselbe `formatPct1`-Muster in `SkillPage.tsx` (~Zeilen 658–668).
- **[POLISH] Pool-Checkpoint-Toast verliert seine Gold-Identität nach dem Puls.** Der
  Gold-Streifen + Glow des „seltensten Moments des Systems" hängt komplett an der
  Puls-Animation (3 × 1,5 s); der Basis-Stil des --pool-Toasts ist blau. Lebt der Toast länger
  (Toast-Queue), steht der Capstone-95-%-Toast mit blassblauem Streifen da, während der kleine
  5-%-Toast Sekunden vorher golden glühte (Vergleich `rt3-mona-03b` vs. `rt3-mona-05b`).
  Basis-Streifen des Pool-Toasts auf Gold setzen (oder `animation-fill-mode: forwards`).
- **[POLISH] Endgame-Fixture weiter mastery-unplausibel** (Wiederholung mit Messwerten aus R3:
  Ring 2 %, Woodcutting 0 % / Fishing 0 % / Cooking 4,9 % Pool bei Skill-Level 97): jeder
  Sweep, der Endgame-Mastery bewerten soll, sieht weiter ein Zerrbild.
- Kein BLOCKER, kein ASSET-Bedarf; 0 Page-Errors in allen drei Sessions.

## 7. Meine Top-3 für Runde 4

1. **Karten-Anker, dritter Anlauf — jetzt inklusive Rundungs-Fix.** EIN Auftrag, EINE Datei
   (`SkillPage.tsx`): (a) Mini-Ziel in die Mastery-Zeile der Aktionskarte („★ 23 → Silber in
   1,2k XP (~18 min)" — die Mastery-Seite berechnet alles davon bereits), (b) kurzer
   Stern-Puls/Glow der Zeile beim Level-Up, (c) `formatPct1` für Chip + Tooltip (behebt den
   neuen BUG gleich mit). Kein Balance-Anteil, keine neue Mechanik — seit zwei Runden nur
   Verkabelung.
2. **Ziel-Brett-UI ohne Balance-GO fertigmachen:** je Skill-Zeile ein erreichbarer Zähler
   („Bronze+: 5/16 · nächster: Blackwood in 726 XP"), „Legendary" durch den verdienten
   Ø-Mastery-Rang ersetzen (Bronze/Silber/Gold — dann ist das Badge ein Ziel), und die
   Smithing-Wand entschärfen (Tier-Gruppierung wie auf der Skill-Seite oder ein
   „nur begonnene Aktionen"-Toggle — bei 261 Zeilen reicht schon das).
3. **Das Balance-Paket als EIN Beschluss aufmachen:** Pool an Breite koppeln (z. B. nur die
   besten N Aktionen zählen zur Kappe) ODER Checkpoints an „X Aktionen auf Bronze+" hängen;
   dazu kleine mechanische Rang-Boni und ein näheres Zwischenziel in der ETA-Zeile, sobald
   sie dreistellig wird (statt „Level 75 in 152 h" lieber zusätzlich „★ 61 in 41 min"). Alle
   drei Punkte zahlen auf dasselbe Konto ein: der Perfektionistin einen GRUND geben, die
   zweite und dritte Aktion anzufassen — das ist seit Runde 1 die einzige offene Kernfrage
   des Systems.
