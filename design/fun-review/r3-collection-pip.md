# Fun-Sweep RUNDE 3 — Achievements + Bestiarium + Sammel-Meta („Pip Hakenliste", der Komplettist)

**Dritter Besuch · 2026-07-16 · sim-harness Port 5315 (Registry-reserviert), Fixtures
midgame/endgame + präparierte Alt-/Offline-Saves über den ECHTEN Menü-Lade-Pfad, read-only.
Screenshots: `ui-audit/shots/rt3-pip-*.png` (26 Stück, alle gesichtet). 6 Wegwerf-Skripte
(`rt3-pip-01…04` + b-Varianten) nach dem Lauf gelöscht, Port verifiziert frei.
0 Console-/Page-Errors über alle Läufe.**

Pip zum dritten Mal. Beim ersten Besuch fand er eine schöne Vitrine ohne Auszahlung (6/10).
Beim zweiten eine Fortschritts-Maschine mit Meilenstein-Kasse (8/10) — und drei Restwunden:
zwei Wahrheiten für „entdeckte Items", ein verstummender Endspurt-Kompass, ein Proviant-Shop
ohne Traum. Heute kam er mit der Checkliste seiner eigenen Beschwerden zurück und hat jede
einzeln nachgespielt — plus zwei neue Härtetests, die es vorher nicht gab: eine echte
Offline-Heimkehr und ein echtes Alt-Save über das Hauptmenü.

---

## 1. Steckbrief: die Reise R1 → R2 → R3

| | R1 (F7) | R2 (Retest) | R3 (heute) |
|---|---|---|---|
| Achievements / AP | 530 / 10.335 AP | 537 / 10.725 AP | 537 / 10.725 AP (unverändert) |
| AP-Gegenwert | keiner („tote Punkte") | Meilenstein-Staffel alle 5 % → Quest-Tokens, 100%-Zeremonie | unverändert da; Nachhol-Staffel zahlt korrekt (verifiziert +121 Tokens Katch-up, +25 bei 100 %) |
| Discovery-Zähler | Zähler ohne Liste | **28 vs. 14 — zwei Wahrheiten (BUG P2)** | **EINE Wahrheit: 28 überall** (Bestiarium, Collector/Archivist/Encyclopedist-Karten, Stats) — monoton, Verkauf senkt nichts mehr |
| Endspurt-Kompass | — (gab es nicht) | „Almost there" **leer** bei 535/537 | **gefüllt**: zeigt die letzten zwei (48 % / 5 %), Klick springt zur Karte |
| Offline-Heimkehr | Toast-FIFO verschluckt 17 von 21 | Sammel-Toast im Live-Spiel | **„While You Were Away"-Bühne mit eigener Achievements-Medaille** („4 Achievements") |
| Alt-Save-Nachholung | — | live-gepatcht: gebündelte Toasts | über echten Lade-Pfad: Schub kommt & zahlt (**aber lautlos**, s. Neue Funde) |
| Token-Shop | — | 9 Proviant-Waren, kein Traumziel | unverändert (bewusst Chef-Thema), Copy verschweigt Meilenstein-Quelle weiterhin |
| ???-Karten | — | aktionslos | unverändert aktionslos („Defeat this enemy to record it.") |

---

## 2. Session-Protokoll (Momente)

1. **Wiedersehen, midgame (rt3-pip-01/02).** Alles an seinem Platz: 56/537, 350 AP, 3%-Ring,
   Meilenstein-Leiste „Next milestone: 5 % — +2 Quest Tokens", fünf 80%-Chips. Die Seite hat
   zwischen R2 und R3 nichts verlernt.
2. **Die eine Wahrheit (rt3-pip-02/03).** Collection-Tab: Collector **28**/50, Archivist
   **28**/100, Encyclopedist **28**/200 — und der Bestiariums-Kopf sagt „Discovered:
   **28**/1061 Items". In R2 standen hier 14 gegen 28. Pip hat es nicht geglaubt und
   nachgerechnet: die alte Besitz-Union hätte heute 14 ergeben, angezeigt wird überall die
   monotone 28. Der Widerspruch ist tot.
3. **Der Verkaufstest (rt3-pip-09b/10/11/12).** Pip verkauft im Shop per Sell-Tab sein Rusty
   Sword und einen Forge-Ember-Stapel (Gold 5.650 → 5.931, Buy-Back zeigt das Schwert brav an) —
   und geht zurück: Collector **28/50 unverändert**, Bestiarium **28/1061 unverändert**.
   Härtetest obendrauf: kompletten Besitz eines entdeckten Items aus Inventar+Bank+seenDrops
   getilgt — Zähler bleibt 28. Sammel-Fortschritt kann nicht mehr sinken. Genau das hatte R2
   verlangt.
4. **Klick auf den Zähler (rt3-pip-04).** „Discovered: 28/1061 Items" — Klick: nichts. Kein
   Modal, keine Galerie. Die Checkliste hinter dem Zähler fehlt weiterhin; der Zähler ist jetzt
   ehrlich, aber immer noch stumm.
5. **???-Karten (rt3-pip-05).** Unentdeckte Monster: Level-Badge, Zonen-Art, „DEFEAT THIS ENEMY
   TO RECORD IT." — keine Buttons, kein „Track", kein Zonen-Sprung. Unverändert seit R2.
6. **Endspurt, konstruiert auf 535/537 (rt3-pip-16/17/18).** Der Moment, für den Pip
   wiedergekommen ist: In R2 war die „Almost there"-Zeile hier LEER. Heute stehen dort
   **Merchant Prince 48 %** und **The Golden Throne 5 %** — exakt die zwei fehlenden
   Gold-Erfolge, obwohl beide unter der alten 50%-Schwelle liegen. Klick auf den Chip wechselt
   auf den Wealth-Tab, scrollt zur Karte und flasht sie (482.000 / 1.000.000 im Blick). Der
   Locked-Filter bestätigt: genau diese zwei fehlen. Der Kompass schweigt auf der Zielgeraden
   nicht mehr.
7. **Gipfel-Regression? Nein (rt3-pip-19/20).** Gold auf 10 Mio → die letzten zwei Erfolge als
   Einzel-Toasts (richtige Dosierung bei nur 2), daneben „ACHIEVEMENT MILESTONE! 100 % reached —
   +25 Quest Tokens", darüber die volle Zeremonie „EVERY TRIAL CONQUERED", Legacy-Tafel
   10.725/10.725 · 537/537. Danach: Ring „100 % — All milestones reached", Leiste ausgeblendet,
   Kompass leer (korrekt: es gibt nichts mehr zu jagen). Stabil wie in R2.
8. **Offline-Heimkehr, echter Lade-Pfad (rt3-pip-22/23/24/25).** Präparierter Save (Mining kurz
   vor Level 30, 97/100 gesammelt, 4 h weg), über das Hauptmenü geladen: Die Beute-Bühne „WHILE
   YOU WERE AWAY" zeigt neben +77.843 XP eine **eigene Lorbeer-Medaille „4 ACHIEVEMENTS"** —
   offline verdiente Erfolge (Mining 30, Mining 40, Gatherer, Hoarder) sind nicht mehr lautlos.
   Danach beantwortet die Achievements-Seite sofort die nächste Frage: Kompass zeigt jetzt
   **Mining Veteran 96 %** — er sortiert sich nach den Offline-Gewinnen live um. Einziger
   Haken: Die Medaille nennt nur die ZAHL, nirgends steht, WELCHE vier es waren.
9. **Alt-Save-Heimkehr, echter Lade-Pfad (rt3-pip-26/27/28).** Veteranen-Save im alten
   v57-Format (volle Bank mit 130 Items, 1.000er-Kills, Achievement-Liste von anno dazumal)
   über das Menü geladen: Der Schub kommt — 4 → **83/537**, 785 AP, discoveredItems 154,
   **Collector und Archivist rückwirkend freigeschaltet** (Encyclopedist ehrlich bei 154/200),
   Meilenstein 5 % geclaimt, **+2 Quest-Tokens gutgeschrieben**. Die Nachholung rechnet
   perfekt. Aber: **kein einziger Toast** — bei 0,6 s, 2 s und 4 s nach dem Laden ist die
   Toast-Leiste leer, der Meilenstein-Breadcrumb liegt unkonsumiert im State. 79 Erfolge und
   eine Token-Zahlung passieren in völliger Stille (Details unten).
10. **Der Flut-Nebenbefund (rt3-pip-14).** Beim konstruierten 321er-Katch-up im laufenden Spiel
    waren in den Toast-Slots nur „Rare find!"-Toasts + Paragon-Rekord zu sehen — der
    Sammel-Toast und der „95 %"-Meilenstein-Toast waren von später gepushten Level-up-/Rare-
    Toasts aus dem 4er-FIFO verdrängt. Teils Artefakt meines Patches (Bank-Befüllung löste die
    Rare-finds aus), aber der Mechanismus ist echt: der Jackpot-Toast hat keine Priorität.
11. **Token-Shop (rt3-pip-21).** Mit 165 Tokens im Beutel: dieselben 9 Proviant-Waren wie in R2
    (50× Cooked Trout für 4, 100× Magic Binder für 5 …), Preise 4–16. Pip könnte alles
    mehrfach leerkaufen. Kein Chase-Angebot (bewusst Chef-Thema), und die Copy sagt weiterhin
    nur „earned from completed quests" — die Meilenstein-Quelle bleibt unerwähnt.

---

## 3. Bewertungsbogen — R1 | R2 | R3 | Δ(R2→R3)

| Aspekt | R1 | R2 | R3 | Δ | Begründung |
|---|---|---|---|---|---|
| Spaß sofort (erste 5 Min) | 7 | 8 | **8** | ±0 | Cockpit unverändert stark (Leiste + Kompass ab Sekunde eins); nichts Neues im Erstkontakt, nichts kaputt. |
| Spaß über Zeit | 5 | 7 | **8** | +1 | Die Sammler-Langstrecke ist jetzt EHRLICH: eine Zahl, monoton, Encyclopedist-Jagd (154/200) real verfolgbar statt Phantomzahl; Kompass sortiert sich nach jeder Session um. Abzug bleibt für die 301 Ein-Muster-Kill-Leitern. |
| Sucht-Faktor („eine Runde noch") | 6 | 8 | **8** | ±0 | Die Meilenstein-Leiste ist weiter der Idle-Haken; die Token-Waren bleiben Haushaltsgeld ohne Sparziel. |
| Belohnungs-Dichte & Dopamin | 5 | 8 | **8** | ±0 | Neu und stark: die Offline-Medaille („4 Achievements") als eigener Heimkehr-Moment. Dagegen verrechnet: der lautlose Lade-Schub verschenkt den größten Jackpot des Genres. |
| Ziel-Klarheit | 7 | 8 | **9** | +1 | Beide R2-Abzüge sind weg: Kompass nie mehr leer (verifiziert bei 535/537), Chip-Klick springt zur Karte, eine Wahrheit für Discovery. Rest-Abzug: „4 Achievements — welche?" und Zähler ohne Liste. |
| Tiefe & Entscheidungen | 3 | 4 | **4** | ±0 | Unverändert: einzige Meta-Entscheidung ist die Token-Verwendung, und die Waren sind Proviant. |
| Frustfreiheit | 7 | 8 | **9** | +1 | Beide R2-Frustquellen nachweislich tot (Widerspruch, sinkender Fortschritt — per echtem Verkauf getestet); 0 Errors über drei Runden. Rest: stille Nachholung ist verpasste Freude, kein Frust. |
| Verzahnung | 6 | 8 | **8** | ±0 | Kreis AP→Tokens→Shop→Proviant + Bestiarium→Fight steht; neu verzahnt: Offline-Bühne ↔ Achievements. Shop-Copy versteckt die Meilenstein-Quelle weiterhin. |
| **GESAMT-SUCHT-URTEIL** | **6** | **8** | **8** | ±0 | Der R2-Sprung hält dem Nachtest stand — das ist die eigentliche Nachricht. Die letzte Meile (Lade-Stille, fehlende Galerie) verhindert die 9. |

**Komme ich morgen wieder?** „Ja. Und zum ersten Mal traue ich dabei jeder Zahl auf dieser
Seite: Wenn da 154/200 steht, sind es 154, egal was ich verkaufe. Ich komme morgen wieder, weil
Annihilator bei 90 % steht und der 10%-Schritt fast bezahlt ist — aber wenn ihr wollt, dass ich
nach der nächsten Fix-Welle JUBELND wiederkomme, dann sagt mir beim Einloggen auch, dass ich
gerade 79 Erfolge geschenkt bekommen habe. Ich musste es heute selbst ausrechnen."

---

## 4. Runde-2-Funde-Verifikation

1. **BUG P2 „Zwei Wahrheiten für entdeckte Items" (28 vs. 14)** → **BEHOBEN, gründlich.**
   Verifiziert auf drei Ebenen: (a) UI-Quervergleich Bestiarium 28/1061 ↔ Collection-Karten
   28/50 · 28/100 · 28/200 (rt3-pip-02/03); (b) echter UI-Verkauf zweier Stapel → beide Anzeigen
   unverändert (rt3-pip-11/12); (c) Totaltilgung eines Besitzes → Zähler monoton. Bonus: die
   Umstellung zahlt rückwirkend — das Alt-Save bekam Collector+Archivist beim Laden nachgereicht
   (rt3-pip-28). Fortschritt kann nie wieder fallen.
2. **POLISH „Almost there verstummt auf der Zielgeraden" (leer bei 535/537)** → **BEHOBEN,
   exakt am alten Reproduktionsfall.** Bei 535/537 zeigt die Zeile die letzten zwei offenen
   Erfolge mit 48 % und 5 % — beide unter der alten 50%-Schwelle, die den R2-Fall leer machte.
   Chip-Klick springt, flasht, Tab/Filter schalten korrekt um (rt3-pip-16/17).
3. **POLISH „Token-Shop ohne Traumziel + Copy verschweigt Meilenstein-Quelle"** →
   **UNVERÄNDERT.** Gleiche 9 Proviant-Waren, gleiche Copy („earned from completed quests").
   Die Chase-Etage ist als Chef-/Balance-Entscheidung geparkt — in Ordnung; die Copy-Zeile wäre
   aber ein Fünf-Minuten-Fix und liegt noch immer herum (rt3-pip-21).
4. **POLISH „???-Karten sind Sackgassen"** → **UNVERÄNDERT.** Keine Aktion, kein Track-/
   Zonen-Sprung auf unentdeckten Karten (rt3-pip-05).

---

## 5. Runde-2-Top-3-Check

1. **„Discovery-Wunde schließen: eine Quelle, eine Checkliste."** → **ZUR HÄLFTE, die richtige
   Hälfte zuerst.** Die eine Quelle ist da und hält jedem Härtetest stand (s.o. — inkl.
   rückwirkender Nachzahlung für Alt-Saves, besser als bestellt). Die Checklisten-Galerie
   hinter „Discovered: x/1061" fehlt weiterhin: der Klick auf den Zähler tut nichts. Für einen
   Komplettisten bleibt ein ehrlicher Zähler ohne Liste eine halboffene Wunde.
2. **„Dem Token eine Trophäen-Etage geben."** → **NICHT PASSIERT** — bewusst beim Chef/Balance
   geparkt, daher kein Vorwurf an die Fix-Runde. Pip hält fest: mit 165 Tokens nach einem
   Katch-up ist die Währung ohne Sparziel bereits im Überfluss-Modus; das Thema wird mit jeder
   Meilenstein-Zahlung dringlicher.
3. **„Den Endspurt inszenieren (a/b/c)."** → **EIN DRITTEL, das wichtigste.** (a) Kompass nie
   leer: **umgesetzt und verifiziert.** (b) „Die letzten Prüfungen"-Ansicht ab ~95 %: nicht
   gebaut — der gefüllte Kompass + Locked-Filter decken den Bedarf aber inzwischen ordentlich.
   (c) Kürzlich-freigeschaltet-Log: nicht gebaut — und fehlt jetzt an ZWEI Stellen spürbar
   (Offline-Medaille nennt nur die Zahl; Alt-Save-Schub hinterlässt gar keine Spur).

---

## 6. Neue Funde

- **BUG (P2, der wichtigste dieser Runde): Der Alt-Save-Schub beim LADEN ist komplett lautlos.**
  Echter Menü-Load eines alten Saves: 79 Erfolge nachgeschaltet, Meilenstein 5 % geclaimt,
  +2 Quest-Tokens gezahlt — und keinerlei Feier: kein Sammel-Toast, kein Meilenstein-Toast,
  nichts (rt3-pip-26, Toast-Leiste bei 0,6/2/4 s leer). Ursache im Verhalten sichtbar: Der
  Toast-Layer diff't nur Änderungen NACH dem ersten Snapshot, und der
  `lastApMilestone`-Breadcrumb wird beim Mount als „schon gesehen" initialisiert
  (`seenApMilestoneSeq` startet auf dem aktuellen `seq`) — er lag nach dem Laden unkonsumiert
  im State. In R2 hatte ich denselben Katch-up nur LIVE gepatcht erlebt (da toastet er) — der
  Lade-Fall ist aber der reale: genau so erlebt jeder Bestandsspieler eine Fix-Welle. Der
  „Heimkehr-Jackpot", R2s bester neuer Moment, existiert im häufigsten Auslösepfad nicht.
  (Fundstellen: `apps/client/src/renderer/components/Toasts.tsx` `seenApMilestoneSeq`/
  `settledRef`-Gate; Engine-Seite korrekt: `packages/engine/src/achievements.ts`
  `checkApMilestones` setzt den Breadcrumb.)
- **BUG (P3, Design-Lücke): Jackpot-Toasts haben keine FIFO-Priorität.** Der Sammel-Toast
  (≥3 Unlocks) und der Meilenstein-Toast teilen sich den 4-Slot-FIFO mit Level-up-, Rare-find-
  und Rekord-Toasts und werden von später gepushten verdrängt (Push-Reihenfolge: Achievements →
  Level-ups → Rare finds; beobachtet in rt3-pip-14: nur 3× „Rare find!" + „New Record!"
  sichtbar, Sammel- und 95%-Toast weg). Mein Auslöser war teils Patch-Artefakt, aber das
  Szenario „Massen-Unlock + gleichzeitige Level-ups/Funde" ist genau der Heimkehr-Tick. R1
  ließ grüßen: derselbe FIFO, eine Etage höher.
- **POLISH: Offline-Medaille nennt nur die Anzahl.** „4 ACHIEVEMENTS" auf der Beute-Bühne ist
  der richtige Moment (rt3-pip-23) — aber nirgends steht, welche vier; nach „Collect" gibt es
  keine Spur mehr (rt3-pip-24, keine Nach-Toasts). Zusammen mit dem fehlenden
  Kürzlich-freigeschaltet-Log bleibt die Frage „was habe ich da eigentlich gefeiert?"
  unbeantwortbar.
- **POLISH (unverändert aus R2, erneut bestätigt):** Rewards-Shop-Copy ohne Meilenstein-Quelle;
  ???-Karten ohne Aktion; Raritäts-Pyramide/Kategorie-Schieflage strukturell unverändert
  (537 Defs, 10.725 AP — identisch zu R2, keine neuen Achievements diese Runde).
- **BLOCKER: keiner. ASSET: keine Lücken** — Zeremonie, Medaillen-Icon, Token-Icons,
  Monster-/Zonen-Art alle vorhanden. **0 Page-/Console-Errors in sämtlichen sechs Läufen.**
- **Positiv-Funde (gehören auch protokolliert):** (a) Der Kompass sortiert sich nach jeder
  Zustandsänderung sinnvoll um — nach 4 h Offline führt Mining Veteran mit 96 %, nach dem
  Alt-Save Annihilator mit 90 %; die Zeile ist ein echtes Navigationsinstrument geworden.
  (b) Die 100%-Strecke (Einzel-Toasts → Meilenstein-Toast → Zeremonie → „All milestones
  reached") ist auch nach den Umbauten regressionsfrei. (c) Die Nachhol-Buchhaltung
  (Tokens, Meilensteine, rückwirkende Collection-Unlocks) rechnet in jedem getesteten Pfad
  korrekt — es fehlt nur die Stimme dazu.

---

## 7. Pips Top-3 für Runde 4

1. **Dem Lade-Schub eine Stimme geben (schließt den P2-BUG).** Wenn beim Laden/Migrieren
   Erfolge oder Meilensteine nachgeschaltet wurden, das NACH dem ersten Mount einmalig
   ausspielen: als Sammel-Banner („79 Erfolge nachgetragen — +2 Quest Tokens") oder als Zeile
   auf der Welcome-Back-Bühne, wenn sie ohnehin offen ist. Technisch liegt alles bereit — der
   Breadcrumb darf beim Mount nur nicht mehr als „gesehen" verschluckt werden. Das ist der
   größte einzelne Dopamin-Hebel, den das System aktuell verschenkt, und er trifft jeden
   Bestandsspieler nach jeder Content-Welle.
2. **Die Checklisten-Galerie hinter dem Discovery-Zähler (Rest von R2-#1).** Der Zähler ist
   jetzt ehrlich — macht ihn klickbar: Galerie aller 1.061 Items, entdeckt farbig, fehlend als
   Silhouette, filterbar nach Quelle. Das Bestiarium zeigt mit seinen ???-Drop-Slots samt
   ✓/%-Chips längst die fertige Formensprache dafür. Nebenbei heilt dieselbe Galerie die
   ???-Karten-Sackgasse, wenn fehlende Items auf ihre Quelle verlinken.
3. **Jackpot-Momente pinnen + ein Kürzlich-freigeschaltet-Log (letzte 10).** Sammel- und
   Meilenstein-Toasts nicht mehr aus dem FIFO verdrängen lassen (eigener Slot oder Priorität),
   und ein kleines Log auf der Achievements-Seite, das die letzten Unlocks zeitlich listet —
   beantwortet zugleich „welche 4 waren offline?" und macht den Heimkehr-Stapel nachlesbar.
   (Die Token-Chase-Etage bleibt notiert beim Chef — Pip spart weiter auf nichts.)

---

*Methodik: 6 Wegwerf-Skripte (`rt3-pip-01/01b/02/02b/03/04.mjs`, gelöscht) gegen sim-harness
Port 5315; Zustände: midgame nativ (Quervergleich + echter UI-Verkauf), endgame → 535/537 →
537/537 (Fast-100%-Patch), präpariertes Offline-Save (4 h, Mining 163 XP vor Level 30,
97/100 gesammelt) und Veteranen-Alt-Save v57 (130 Bank-Items, 1.000er-Kills) — beide über den
echten Hauptmenü-Lade-Pfad mit `slotSaves`. Alle 26 Screenshots (`ui-audit/shots/rt3-pip-*.png`)
einzeln gesichtet. Kein Spielcode verändert; Port nach Lauf-Ende verifiziert frei.*
