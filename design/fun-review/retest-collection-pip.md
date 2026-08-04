# Fun-RETEST R7 — Achievements + Bestiarium + Sammel-Meta („Pip Hakenliste", der Komplettist)

**RETEST des Fun-Sweeps F7 · 2026-07-16 · sim-harness Port 5307 (Registry-reserviert), Fixtures
midgame/endgame + `__hfDebug`-Patches, read-only. Screenshots: `ui-audit/shots/rt-pip-*.png`
(30 Stück, alle gesichtet). Wegwerf-Skripte `rt-pip-01…06` nach dem Lauf gelöscht, Harness gestoppt.**

Pip war vor zwei Tagen hier und hat drei Wünsche dagelassen. Heute kam er zurück, hat denselben
Bogen noch einmal durchgespielt — früh/mid (Mira, 56/537), Endgame (Korveth, 214/537), eine
konstruierte Fast-100%- und eine echte 100%-Vollendung — und er sagt es gleich vorweg: **zwei der
drei Wünsche wurden nicht nur erfüllt, sie wurden besser erfüllt, als er sie formuliert hatte.**

---

## 1. Steckbrief: Was das Meta-Spiel JETZT enthält

| System | Umfang | Neu seit F7 |
|---|---|---|
| Achievements | **537** Stück (war 530), 5 Raritäten, **10.725 AP** gesamt | Meilenstein-Leiste alle 5 % mit **Quest-Token-Belohnung** (eskalierend: +2 früh, +4 bei 35 %, **+25 bei 100 %**), „Almost there"-Kompasszeile, Sammel-Toast bei Massen-Unlocks, 100%-Zeremonie |
| Bestiarium | 105 Monster in 11 Zonen | **„Undefeated Only"-Filter** (Zonen-Zähler rechnen auf Rest-Jagd um), **Kill-Leiter ✓10/○100/○1.000 direkt auf der Karte** mit Hover-Tooltip („3 / 10 kills"), Drop-Slots zeigen Chance in % (z. B. ✓25 %) |
| Item-Entdeckung | 1.061 Items, Zähler im Bestiariums-Kopf | unverändert: Zähler ohne Checkliste dahinter — und neu entdeckt: er widerspricht dem Achievement-Zähler (s. Neue Funde) |
| Token-Kreislauf | AP-Quote → Quest-Tokens → **Rewards Shop** (Quests-Seite) | 9 Waren: Bulk-Food (50× Cooked Trout für 4 Tokens …), Tränke, 100× Magic Binder; Preise 4–16 Tokens |
| Raritäten | 132 common · 159 uncommon · **181 rare** · 51 epic · 14 legendary | Pyramide weiter invertiert (unverändert) |
| Kategorien | combat **301** (56 %) · skilling 199 · collection 12 · wealth 9 · quests 8 · gathering 4 · crafting 4 | strukturell unverändert |

Kein einziger Console-/Page-Error über alle sechs Läufe.

---

## 2. Session-Protokoll (Momente)

1. **Erstkontakt, midgame (rt-pip-01/02).** Die Seite ist jetzt ein Cockpit: Hero-Bar 56/537 +
   350 AP + 3%-Ring, darunter NEU eine goldene Meilenstein-Leiste **„Next milestone: 5 % —
   +2 Quest Tokens"** und die Zeile **„ALMOST THERE"** mit fünf 80%-Chips (Woodcutting/Mining/
   Fishing/Smithing/Cooking Journeyman). Pip weiß in unter drei Sekunden, was als Nächstes dran
   ist UND was es ihm bringt. Das war seine Kernfrage — sie wird jetzt vom Spiel selbst
   beantwortet, bevor er sie stellt.
2. **Einzel-Unlock (rt-pip-03/04).** Gold auf 10.000 → Fanfaren-Toast „Achievement unlocked!
   Coffer (+10 AP)", Zähler tickt live 56→57, AP 350→360. Unverändert sauber.
3. **Klick auf einen „Almost there"-Chip (rt-pip-29).** Scrollt direkt zur Karte in der Wand
   (Mining Journeyman mit 24/30-Balken im Blick). Die Kompasszeile ist keine Deko, sie navigiert.
4. **Der Heimkehr-Jackpot (rt-pip-10/11).** 22 Unlocks in einem Tick (Kills/Gathering/Crafting/
   Gold auf einmal gepatcht — das Rückkehr-aus-Offline-Szenario aus dem Altbericht):
   **„ACHIEVEMENTS UNLOCKED! 22 achievements unlocked — +310 AP"** als Sammel-Toast, direkt
   darüber **„ACHIEVEMENT MILESTONE! 5 % reached — +2 Quest Tokens"**, Hero tickt 58→80, Ring
   3 %→6 %, Meilenstein-Leiste setzt auf „10 %" neu an. Vor zwei Tagen verpufften hier 17 von 21
   Momenten lautlos. Jetzt ist genau dieser Stapel der beste Moment der Seite.
5. **Alt-Save-Catch-up (rt-pip-15/16).** Fast-100%-Patch auf dem Endgame-Save: **„321
   achievements unlocked — +6860 AP"** + **„95 % reached — +121 Quest Tokens"** in EINEM
   gebündelten Toast-Paar, questTokens 19→140. Die Nachhol-Mechanik zahlt die komplette
   verdiente Staffel auf einmal aus und sagt es einem auch.
6. **Der Gipfel MIT Fahne (rt-pip-17/18/19).** Die letzten Erfolge live freigeschaltet → über dem
   goldenen 100%-Hero öffnet sich eine Zeremonie: Trophäe, **„ACHIEVEMENT MASTERY — EVERY TRIAL
   CONQUERED"**, „The Warden honors your complete mastery of the Reach's trials", Legacy-Tafel
   „10.725 / 10.725 AP · 537 / 537", Continue-Button; dahinter „100 % reached — +25 Quest
   Tokens". Danach (rt-pip-20/21): Ring zeigt **„100 % — ALL MILESTONES REACHED"**. Der Everest
   hat jetzt Gipfelfahne, Zeremonie und Denkmal-Inschrift.
7. **Bestiarium als Jagd-Werkzeug (rt-pip-05/24/31).** „Undefeated Only" reduziert die Borderlands
   von „9/15 discovered" auf eine reine Restliste („0/6", Levelbereich passt sich an). Auf jeder
   entdeckten Karte klebt die Kill-Leiter (✓10 ○100 ○1.000, Tooltip „3 / 10 kills") — die 258
   Kill-Achievements sind endlich DORT sichtbar, wo gejagt wird. **„⚔ Fight" springt mit einem
   Klick in den laufenden Kampf** (verifiziert: combat.monsterId = goblin, rt-pip-27).
8. **Die verbliebene Wunde (rt-pip-25 + Collection-Tab rt-pip-28).** Klick auf „Discovered:
   28/1061 Items": nichts. Keine Checkliste. Und schlimmer: die Collection-Karte „Collector"
   zeigt gleichzeitig **14**/50 entdeckte Items — zwei verschiedene Wahrheiten für denselben
   Begriff auf zwei Seiten (s. Neue Funde, BUG).
9. **Zielgerade ohne Kompass (rt-pip-16).** Bei 535/537 ist die „Almost there"-Zeile LEER (die
   zwei fehlenden Gold-Erfolge standen bei 48 % bzw. 5 % Fortschritt). Ausgerechnet auf den
   letzten Metern schweigt der Kompass; nur der Locked-Filter hilft weiter.

---

## 3. Bewertungsbogen — alt → neu → Delta

| Aspekt | alt | neu | Δ | Begründung |
|---|---|---|---|---|
| Spaß sofort (erste 5 Min) | 7 | **8** | +1 | Meilenstein-Leiste + „Almost there" machen die Seite ab Sekunde eins zur To-do-Liste; darunter bleibt es eine Wand aus 537 Karten. |
| Spaß über Zeit | 5 | **7** | +2 | Eskalierende Token-Staffel + nachrückende 80–98%-Chips tragen über Tage; die 301 Ein-Muster-Kill-Leitern (56 %) bleiben strukturell monoton. |
| Sucht-Faktor („eine Runde noch") | 6 | **8** | +2 | Irgendwo ist die Meilenstein-Leiste IMMER fast voll — das ist der klassische Idle-Haken; Abzug, weil die Token-Waren kein Traumziel enthalten. |
| Belohnungs-Dichte & Dopamin | 5 | **8** | +3 | Jeder Unlock zahlt jetzt doppelt (AP + Meilenstein-Fortschritt), Massen-Unlocks sind ein Jackpot-Toast statt verschluckt, Catch-up zahlt 121 Tokens auf einen Schlag. |
| Ziel-Klarheit | 7 | **8** | +1 | Kompasszeile navigiert per Klick, Belohnung steht an der Leiste; Abzug: auf der Zielgeraden (535/537) wird die Zeile leer. |
| Tiefe & Entscheidungen | 3 | **4** | +1 | Das Meta selbst bleibt entscheidungsfrei; die einzige neue Entscheidung ist, wofür man Tokens ausgibt — und die Waren sind Proviant, keine Dilemmata. |
| Frustfreiheit | 7 | **8** | +1 | Beide Alt-Frustquellen weg, 0 Errors; Abzug für den widersprüchlichen Discovery-Zähler (28 vs. 14) und die aktionslosen ???-Karten. |
| Verzahnung | 6 | **8** | +2 | AP → Tokens → Rewards Shop → Skilling/Combat-Proviant; Bestiarium → Fight → laufender Kampf; Chip → Scroll zur Karte. Der Kreis ist zu. |
| **GESAMT-SUCHT-URTEIL** | **6** | **8** | **+2** | Aus einer schönen Vitrine wurde eine Fortschritts-Maschine mit Auszahlung. |

**Komme ich morgen wieder?** „Ja — und zwar nicht mehr nur wegen der 24/30-Balken, sondern weil
die Meilenstein-Leiste bei 6 % steht, der 10%-Schritt schon bezahlt aussieht und ich im Bestiarium
noch sechs Borderlands-Silhouetten offen habe. Ich komme wieder, um KASSIEREN zu gehen — das
konnte diese Seite vor zwei Tagen nicht."

---

## 4. Top-3-Verifikation (Pips alte Empfehlungen)

1. **„AP muss etwas kaufen — häng Belohnungen an die Meilenstein-Ringe."** → **GUT umgesetzt,
   erlebbar.** Alle 5 % gibt es Quest-Tokens (eskalierend +2 → +4 → … → +25 bei 100 %), die
   Leiste sagt die Belohnung VORHER an („Next milestone: 5 % — +2 Quest Tokens"), Alt-Saves holen
   verdiente Schritte gebündelt nach, und bei 100 % gibt es die geforderte echte Zeremonie im
   MasteryCeremony-Stil („Every Trial Conquered"). Die 10.335 toten Punkte von damals sind heute
   10.725 lebendige. Einziger Abstrich: die Tokens landen in einem Shop voller Verbrauchsgüter —
   funktional, aber ohne Gänsehaut-Ware (s. neue Top-3 #2).
2. **„Nächste-Häkchen-Leiste + Sammel-Toast."** → **GUT umgesetzt, erlebbar.** „ALMOST THERE"
   pinnt die fünf fortgeschrittensten gesperrten Erfolge mit %-Badge an und scrollt beim Klick
   zur Karte; Massen-Unlocks werden zu „22 achievements unlocked — +310 AP" gebündelt (bei 2–3
   Unlocks bleiben Einzel-Toasts — richtige Dosierung). Zwei kleine Löcher: kein
   Kürzlich-freigeschaltet-Log zum Nachlesen, und die Leiste verstummt auf der Zielgeraden.
3. **„Bestiarium zur echten Jagdliste ausbauen (a/b/c)."** → **ZWEI DRITTEL gut, ein Drittel gar
   nicht.** (a) „Undefeated Only"-Filter: da, und besser als bestellt (Zonen-Zähler rechnen um).
   (b) Kill-Leiter auf der Monsterkarte: da, mit ✓/○-Chips und Tooltip. (c) Checkliste hinter
   „Discovered: x/1061": **fehlt weiterhin** — der Zähler ist tot und widerspricht jetzt sogar
   dem Collection-Achievement (s. BUG unten). Für einen Komplettisten bleibt das die offene Wunde.

---

## 5. Bug-Verifikation (alte Befunde)

1. **„Next milestone: 100 %" bei 100 % Vollendung** → **WEG.** Bei 537/537 steht „100 % — ALL
   MILESTONES REACHED" im Ring (rt-pip-21), obendrein Zeremonie statt Zahlenstumpf. Verifiziert
   auf konstruierter Voll-Vollendung.
2. **Massen-Unlock verschluckt Toasts ohne Hinweis (MAX_TOASTS-FIFO)** → **WEG.** 22 Unlocks →
   Sammel-Toast mit Stückzahl UND AP-Summe; 321 Unlocks (Catch-up) → dito mit +6860 AP;
   Meilenstein-Nachholung wird als ein gebündelter Toast gezeigt („95 % reached — +121 Quest
   Tokens"). Nichts verpufft mehr lautlos.
3. **ach2-name-Spillover** → war schon in F7 behoben, weiterhin nicht reproduzierbar.
4. Hinweis aus F7 (Endgame-Fixture combat-Artefakt): Das Endgame-Fixture zeigt jetzt organische
   214/537 mit natürlich verdienten Meilensteinen 5–30 % und 19 Tokens — als Testbett deutlich
   glaubwürdiger.

---

## 6. Neue Funde

- **BUG (P2, Sammler-relevant): Zwei Wahrheiten für „entdeckte Items".** Bestiariums-Kopf und
  Item-Wiki zählen über `state.discoveredItems` (monoton, „Discovered: 28/1061"), die
  `items_discovered`-Achievements (Curious/Collector/Archivist/Encyclopedist) zählen über
  `discoveredItemCount()` = `seenDrops` ∪ Inventar-Slots ∪ Bank-Keys — im selben Spielstand
  **28 vs. 14** (rt-pip-06 vs. rt-pip-28). Der Achievement-Zähler ignoriert Equipment,
  Instanzen-Tasche und Gear-Vault und kann beim Verbrauchen/Verkaufen sogar SINKEN. Wer
  „Encyclopedist 200" jagt und die Bestiariums-Zahl als Referenz nimmt, jagt eine Phantomzahl.
  Fix-Richtung: Achievement-Progress auf dieselbe `discoveredItems`-Quelle stellen.
  (Fundstellen: `packages/engine/src/achievements.ts` `discoveredItemCount` vs.
  `packages/engine/src/inventory.ts` `isItemDiscovered`/`discoverPossessedItems`.)
- **POLISH: „Almost there" verstummt auf der Zielgeraden.** Bei 535/537 (Rest-Fortschritte 48 %
  und 5 %) ist die Zeile leer statt die letzten zwei Jagdziele zu zeigen — ausgerechnet im
  Endspurt, wo der Kompass am meisten wert ist. Fallback: immer die N gesperrten mit höchstem
  Fortschritt zeigen, egal wie niedrig.
- **POLISH: Rewards-Shop-Copy verschweigt die Meilenstein-Quelle.** „Spend Quest Tokens earned
  from completed quests …" — dass Achievements-Meilensteine dieselbe Währung zahlen, steht
  nirgends im Shop. Wer den Toast wegklickt, verliert die Verbindung.
- **POLISH: ???-Karten sind Sackgassen.** Unentdeckte Monster zeigen Level + Zone, aber keinerlei
  Aktion (keine Buttons, rt-pip-31); der Spieler muss den Weg zum Kampf selbst suchen. Ein
  „Track"/„Zur Zone"-Sprung analog zum Fight-Button würde die Jagd auf Unentdeckte schließen.
- **POLISH (Alt-Punkt, unverändert): Raritäts-Pyramide invertiert.** 181× „rare" > 159 uncommon >
  132 common — „rare" bleibt die häufigste Stufe und das Badge damit entwertet. Ebenso
  unverändert: gathering/crafting mit je 4 Stück wirken als Platzhalter neben 301 combat.
- **BLOCKER: keiner.** **ASSET: keine Lücken gesehen** — Monster-Art, Zonen-Hintergründe,
  Zeremonie-Trophäe, Token-Icons alle vorhanden. Audio (Fanfare) im Headless-Lauf nicht prüfbar.

---

## 7. Pips NEUE Top-3 für noch mehr Sucht-Faktor

1. **Die Discovery-Wunde schließen: eine Quelle, eine Checkliste.** `items_discovered`-Achievements
   auf `state.discoveredItems` umstellen (BUG oben) und hinter den „Discovered: x/1061"-Zähler
   endlich die Galerie legen (entdeckt farbig / fehlend als Silhouette, filterbar nach Quelle —
   das Bestiarium zeigt mit seinen ???-Drop-Slots längst, wie gut das aussieht). Das ist der
   letzte fehlende Baustein aus dem Altbericht und der größte verbleibende Sammler-Hebel.
2. **Dem Token eine Trophäen-Etage geben.** Der Rewards Shop ist Proviant (Fisch, Tränke, Binder)
   — nützlich, aber niemand träumt davon. Ein bis zwei exklusive Chase-Angebote (Kosmetik, ein
   Titel „Every Trial Conquered", ein Prestige-Pet für 150–200 Tokens) verwandeln die Währung von
   Haushaltsgeld in ein Sparziel; dazu die Shop-Copy um die Meilenstein-Quelle ergänzen.
3. **Den Endspurt inszenieren.** (a) „Almost there" nie leer (Fallback höchster Fortschritt),
   (b) ab ~95 % AP-Quote eine „Die letzten Prüfungen"-Ansicht, die die verbleibenden Erfolge
   prominent listet (das Material liegt mit dem Locked-Filter schon da), (c) ein kleines
   Kürzlich-freigeschaltet-Log (letzte 10) für den Rückblick nach dem Heimkehr-Jackpot. Der Weg
   zum Gipfel ist jetzt großartig bezahlt — die letzten 100 Meter verdienen dieselbe Regie wie
   die Fahne oben.

---

*Methodik: 6 Wegwerf-Skripte (`rt-pip-01…06.mjs`, gelöscht) gegen sim-harness Port 5307;
Zustände: midgame nativ, midgame + Einzel-/Flut-Patches, endgame nativ, endgame → 534/537 →
537/537. Alle 30 Screenshots (`ui-audit/shots/rt-pip-*.png`) einzeln gesichtet. Kein Spielcode
verändert; Port nach Lauf-Ende verifiziert frei.*
