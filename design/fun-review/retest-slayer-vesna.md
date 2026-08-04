# Fun-RETEST: Slayer-System — „Vesna Schwurklinge" (Kopfgeldjägerin), 2. Besuch

**RETEST R4, 2026-07-16 · sim-harness Port 5304 · Erstbericht: `slayer-vesna.md` (F4, Port 5293)**

## 1. Steckbrief & Test-Stände

| | |
|---|---|
| Persona | Vesna Schwurklinge — lebt für Auftrags-Loops: Task holen → jagen → kassieren → nächster |
| Auftrag | Slayer-System KOMPLETT neu erleben: Task-Kette (5./10. Abschluss), Zettel lesen, Skip unter SL 10 UND mit Kosten, Endgame-Vielfalt |
| Stand 1 (mid) | Mira Ashfall, CL 30, Slayer 24 — 3 echte Task-Abschlüsse per Kampf-Kill, Serie bis 10, bezahlter Skip |
| Stand 2 (früh) | Mira mit Slayer auf 1 gepatcht, 0 Punkte, Serie 3 — Gnaden-Skip-Probe (mein alter Blocker) |
| Stand 3 (end) | Korveth Grimhollow, CL 96, Slayer 97 — 120 Task-Ziehungen (Verteilung in %), 1 echter Abschluss, Shop |
| Zusatz | 80 Midgame-Ziehungen (Welt-Pool-Vielfalt, alter Befund 4) |

Alle Läufe ohne Page-Errors. Wegwerf-Skripte (rt-vesna-a…d.mjs) nach dem Lauf gelöscht, Port 5304 wieder frei.

## 2. Session-Protokoll

**Moment 1 — Der Zettel hat jetzt ein aufgedrucktes Kopfgeld (rt-vesna-02-task-zettel.png).**
„Get New Task" → Goblin Rogue ×48, Turm Etage 1 — und darunter, wo beim letzten Mal NICHTS
stand: **„REWARDS ✦ +912 XP · +6 PTS"**. Ich weiß VOR dem Ausrücken, was die Jagd wert ist.
Und die Prämie skaliert: der 48er zahlt 6 Punkte, ein 21er zahlt 4, ein 26er 5 (gemessen;
Formel greift sauber: ×0,73 beim kleinsten, ×1,27 beim größten Mark). Das ist exakt mein
alter Punkt 1 — ein Kopfgeld mit Summe drauf. Der Topbar-Chip („Slayer: 0/48 Goblin Rogue")
verfolgt mich weiter durchs Spiel, „Go to Combat"-Link und Zielzonen-/Karten-Ribbons
(rt-vesna-03-zielzone.png, rt-vesna-05-zielzone.png) führen mich ohne Suchen zur Beute.

**Moment 2 — Die Kette zieht: 5. und 10. Abschluss knallen (rt-vesna-05-abschluss-toast.png,
rt-vesna-06-abschluss-toast.png, rt-vesna-07-serie10-chip.png).**
Der 5. Abschluss in Serie stapelt „STREAK 5! +2 TOKENS" auf den „SLAYER TASK COMPLETE!
+1.638 XP · +6 PTS"-Toast (plus Level-Up obendrauf — drei Feiern übereinander). Der 10.
legt nach: **„Streak 10! +2 Tokens · +5 Pkt"** — der Punkte-Bonus ist ~1 Task-Äquivalent,
gemessen Δ +10 Punkte statt +5 auf dem 10. Task. Zurück am Brett trägt der Zettel einen
🔥-Chip „Streak: 10". Das ist DER „eine Runde noch"-Mechanismus, den ich gefordert habe,
und er fühlt sich genau richtig an: Bei Serie 7 hole ich freiwillig noch drei Tasks.

**Moment 3 — Skippen ist jetzt eine Entscheidung, keine Steuer (rt-vesna-08-skip-confirm.png,
rt-vesna-09-nach-skip.png).**
Ein Knopf statt zwei (Skip/Cancel-Doppel ist weg), mit Rückfrage: „Cancel this task for 20
Slayer Points? No new task will be assigned." und — neu — kursiv darunter: **„A paid skip
will break your streak."** Ich habe bestätigt: 22 → 2 Punkte, Serie 10 → 0. Es tat richtig
weh, aber ich wusste vorher exakt, was ich opfere. Aus der alten Fehlklick-Falle (Skip
sofort, ohne Rückfrage) ist eine informierte Abwägung geworden.

**Moment 4 — Die Früh-Slayer-Gnade erreicht endlich den Spieler (rt-vesna-10-sl1-task.png,
rt-vesna-11-sl1-skip-confirm.png, rt-vesna-12-sl1-nach-skip.png).**
Slayer 1, 0 Punkte — mein alter Blocker-Fall. Der Button heißt jetzt **„Skip Task (Free)"**,
ist KLICKBAR, die Rückfrage sagt „Cancel this task for free?", und nach dem Bestätigen:
Task weg, 0 Punkte unverändert, **Serie 3 bleibt stehen** (Gratis-Skip bricht die Kette
bewusst nicht — sauber). Neuer Task sofort holbar. Der tote Button ist Geschichte.

**Moment 5 — Endgame: aus dem Hirsch-Pendeln ist eine echte Fahndungsliste geworden — mit
einem Restleiden (rt-vesna-20…24).**
120 Ziehungen bei CL 96/SL 97: **31 unique Monster** (alt: gefühlt eine Handvoll, Welt-Pool
1–2). Turm 55 % / Welt 45 %. Der Welt-Pool hat jetzt **6 Monster (L90–104)**; der Hirsch
(wild_stag) ist von ~60 % der Welt-Tasks auf **15 % der Welt-Tasks (7 % gesamt)** gefallen,
Spitzenreiter gray_wolf liegt bei 12 % gesamt. Die Fenster-Streckung wirkt.
ABER: Der Turm hat weiterhin keine untere Kante. **Etage 1 (Monster L3–19) stellt 30 % der
Turm-Tasks, Etage 2 (L22–38) weitere 15 %** — d. h. ~25 % ALLER Endgame-Tasks schicken eine
97erin zu Monstern 60–90 Level unter ihr. Der Zettel verrät es immerhin ehrlich: Shambling
Carcass ×29 zahlt **+160 XP** (0,014 % des Levels bei 1,11 Mio XP-Bedarf), der Welt-Task
Iron Sentinel ×34 daneben **+11.900 XP** — Faktor 74. Beim Basilisk-Abschluss
(rt-vesna-23-endgame-abschluss.png) sagt das Kampflog sogar wörtlich „Gaze Basilisk is too
weak — NO COMBAT XP", während Brenna den Auftrag vergeben hat. Kill-Zeit gemessen: 2,5 s.
Das ist kein Jagen, das ist Pendeln — nur dass ich es jetzt VORHER auf dem Zettel sehe und
(teuer) skippen kann.

**Moment 6 — Midgame-Welt-Pool geheilt (80 Ziehungen, Stand Mira).** 6 unique Welt-Monster
(ashfield_jackal 16 %, goblin_warlock 11 %, mire_crawler/mire_wisp je 9 %, …) — der alte
„60 % bull_boss"-Würgegriff ist weg. 14 unique Monster gesamt in 80 Ziehungen.

**Eckdaten neu vermessen:** Kills 15–50 pro Task · Punkte 4–6 (skalierend, Ø ~5) · Skip 20
Pkt (= ~4 Task-Abschlüsse) · Serie: alle 5 Tasks +2 Quest-Marken, alle 10 zusätzlich
+~1 Task-Äquivalent Punkte (≈ +10 % Punkte-Einkommen bei ununterbrochener Kette) ·
Shop-Katalog unverändert (12 → 650, gesamt 2.368; Helm 650 ≈ ~120 Tasks).

## 3. Bewertungsbogen — alt → neu → Delta

| Aspekt | alt | neu | Δ | Begründung |
|---|---|---|---|---|
| Spaß sofort (erste 5 min) | 8 | 9 | +1 | Zettel mit aufgedrucktem Kopfgeld + klickbarer Gratis-Skip: der Erstkontakt hat jetzt null tote Stellen. |
| Spaß über Zeit | 6 | 7 | +1 | Serie gibt den Stunden einen Takt, Endgame-Pool ist echte Vielfalt (31 unique) — aber ~25 % Trivial-Tasks und unverändert ~703 Tasks für 80→99 deckeln. |
| Sucht-Faktor („eine Runde noch") | 7 | 9 | +2 | Der 5er/10er-Streak-Takt ist exakt der fehlende Kettenzug; bei Serie 7 holt man freiwillig drei weitere Tasks. Abzug: der Rhythmus ist unsichtbar, bis der erste Bonus überrascht. |
| Belohnungs-Dichte & Dopamin | 6 | 8 | +2 | Toast-Stack (Task + Streak + Level-Up), Prämie vorab lesbar, Punkte skalieren. Abzug: 4–6-Punkte-Spanne ist zahm (ein 50er zahlt nur ×1,5 eines 15ers bei ×3,3 Arbeit). |
| Ziel-Klarheit | 9 | 9 | ±0 | War schon die Stärke des Systems (Etagen-Gates, Shop-Leiter, Cape); Serie fügt ein Mikro-Ziel hinzu, zeigt aber nicht an, WANN der nächste Bonus kommt. |
| Tiefe & Entscheidungen | 4 | 6 | +2 | Skip ist jetzt eine echte Abwägung (20 Pkt + Kette opfern?), mit voller Information. Bleibt: ein Master, kein Task-Wahlrecht, Turm/Welt ist Würfel. |
| Frustfreiheit | 6 | 8 | +2 | Blocker-Bug weg, ein konsolidierter Skip-Pfad mit Rückfrage, Serien-Warnung verhindert Fehlklick-Tragödien. Rest-Frust: die Trivial-Etagen-Lotterie im Endgame. |
| Verzahnung | 8 | 8 | ±0 | Weiter stark (Gear-Gates lehren den Shop, Quest-Marken koppeln an den Token-Shop); Brenna schweigt aber immer noch über Story-Gates, und zwei Pool-Monster haben kein Fahndungsfoto. |
| **GESAMT-SUCHT-URTEIL** | **7** | **8** | **+1** | Der Loop hat jetzt Zug UND Information — was fehlt, ist Endgame-Würde für die Tasks selbst. |

**Komme ich morgen wieder?** — **„Ja — und diesmal auch übermorgen: Die Serie will nicht
abreißen, der Zettel sagt mir vorher, was die Jagd wert ist, und der Helm ist nur noch ~120
Tasks weit weg. Nur wenn Brenna mich als 97erin zum dritten Mal in Folge in die
Pestkammern zu L7-Maden schickt, lege ich den Zettel wieder hin — jetzt allerdings wissend,
dass er nur 160 XP wert gewesen wäre."**

## 4. Top-3-Verifikation (meine alten Empfehlungen)

1. **Kopfgeld auf den Zettel + skalierende Prämie → GUT umgesetzt.** REWARDS-Zeile mit
   XP-Chip + Punkte-Chip auf jedem Task (in allen drei Ständen verifiziert), Punkte skalieren
   linear um das Spannen-Mittel (gemessen 4/21er, 5/26er, 6/48er — ×0,73…×1,27). Abstrich:
   Die Skalierung ist weicher als von mir empfohlen (ich wollte ~5–8); große Marks fühlen
   sich besser an als vorher, aber noch nicht fett.
2. **Task-Streak (OSRS-Kette) → GUT umgesetzt, über die Forderung hinaus.** Jeder 5. Task
   +2 Quest-Marken, jeder 10. zusätzlich +1 Task-Äquivalent Punkte; bezahlter Skip bricht,
   Gratis-Gnade bricht NICHT (im Spiel bestätigt: Serie 3 überlebt den Free-Skip); Toast,
   Zettel-Chip und Confirm-Warnung machen die Kette erlebbar. Einziges Manko: kein
   „nächster Bonus bei X"-Hinweis — der Takt muss erraten werden.
3. **Endgame-Pool retten → HALBHERZIG (bewusst halb).** (b) Welt-Fenster-Streckung ist da
   und wirkt: 6 statt 1–2 Welt-Monster, Hirsch von ~60 % auf 15 % der Welt-Tasks. (a) Die
   Turm-Unterkante wurde ausdrücklich NICHT gebaut (Engine-Kommentar: „keine UNTERE Kante —
   freigeschaltete Etagen unter dem eigenen Niveau bleiben Tasks") — Ergebnis: 30 % der
   Turm-Tasks (17 % aller Tasks) sind Etage 1, L3–19, für eine CL-96-Jägerin. Die
   Reward-Anzeige macht das Elend transparent, aber nicht sinnvoll.

## 5. Bug-Verifikation (alte Befunde)

1. **[UI-Bug] Früh-Slayer-Gnade unbenutzbar → BEHOBEN, im Spiel verifiziert.** SL 1 / 0
   Punkte: Button „Skip Task (Free)", enabled, Rückfrage „for free?", Skip klappt, Punkte
   und Serie unangetastet (rt-vesna-10…12). UI liest jetzt `effectiveSkipCost`.
2. **[UX] Skip vs. Cancel doppelt → BEHOBEN.** Nur noch EIN Pfad („Skip Task") mit
   Confirm-Schritt; der Sonderfall „Anforderung nicht erfüllt = sofort & gratis fallen
   lassen" bleibt sinnvoll erhalten. `executeCancelTask`s Engine-Vorbeigriff ist weg
   (UI ruft `skipTask`).
3. **[Kosmetik] Fallback `?? 30` → NOCH DA.** SlayerPage.tsx:107 fällt ohne Task-Master
   weiter auf `: 30` zurück (echter skipCost 20) — toter Divergenz-Fallback, unverändert.
4. **[Design] Story-Gate würgt Welt-Pool, Brenna schweigt → SYMPTOM ENTSCHÄRFT, URSACHE
   UNKOMMENTIERT.** Die Mindest-Pool-Streckung (≥4 Kandidaten) verhindert den 1-Monster-Pool
   auch bei gesperrten Zonen (midgame 6 Welt-Monster, Top-Anteil 16 % statt 60 %). Eine
   Brenna-Zeile à la „Die Chronik öffnet neue Jagdgründe" gibt es weiterhin nicht.
5. **[OK] Kein Soft-Lock → WEITER BESTÄTIGT.** 200 Ziehungen über zwei Stände: kein
   unerfüllbarer Task, gesperrte Zonen/Etagen sauber gefiltert, keine Page-Errors.

## 6. Neue Funde

- **[ASSET] Fahndung ohne Fahndungsfoto:** `iron_sentinel` und `dg_skeleton_nekro`
  (Necromancer Lord) haben keine Monster-Grafik — zusammen **16 % der Endgame-Ziehungen**
  (10× + 9× von 120). Der Task-Zettel zeigt den Fallback-Schädel
  (rt-vesna-22-endgame-task-welt.png); ausgerechnet zwei der Monster, die den geretteten
  Welt-Pool tragen, sehen nach Platzhalter aus.
- **[POLISH] Serien-Takt unsichtbar:** Chip zeigt nur „Streak: 7" — nirgends steht, dass
  bei 10 ein Bonus wartet. Der erste Bonus ist eine schöne Überraschung, danach ist das
  fehlende „Bonus bei 10" verschenkter Zug (genau im Moment „skippe ich bei Serie 8?").
- **[POLISH] Streak-Warnung unkonkret:** „A paid skip will break your streak" nennt weder
  den Serienstand noch den entgangenen Bonus („Serie 8 geht verloren — Bonus wäre in 2
  Tasks"). Bei Serie 10 → 0 wäre die Zahl der halbe Schmerz und die ganze Information.
- **[POLISH/DESIGN] Dissonanz Trivial-Task:** Das Kampflog erklärt das Ziel für „too weak —
  NO COMBAT XP", Brenna vergibt den Auftrag trotzdem zum Normalpreis (Etage-1-Task 160
  Slayer-XP, +5 Pkt). Wenn das System selbst weiß, dass das Ziel wertlos ist, sollte der
  Auftrag es auch wissen (weniger zahlen, seltener kommen — oder gar nicht).
- **[Beobachtung] Ein-Tab-Leiste bleibt:** weiterhin genau ein Slayer-Master (Brenna) in
  einer Tab-Leiste, die nach mehr aussieht — das alte „leere Versprechen" steht unverändert.

## 7. Meine NEUEN Top-3 für mehr Sucht-Faktor

1. **Serien-Countdown + lange Meilensteine.** Chip und Toast um den nächsten Bonus ergänzen
   („Serie: 7 · Bonus bei 10"), Confirm-Warnung mit konkretem Verlust. Dazu Meilensteine
   jenseits von 10 (25/50/100: Bonus-Multiplikator, Titel-Zeile von Brenna, Statistik-Eintrag)
   — die Kette trägt aktuell exakt 10 Tasks weit, dann ist ihr psychologischer Zug verbraucht.
   Kleinster Aufwand, direkt auf dem existierenden Streak-State.
2. **Gefahrenzulage statt Einheitslohn (Endgame-Würde).** Punkte zusätzlich nach
   Ziel-Nähe skalieren: volles Kopfgeld nur im Fenster um den eigenen Kampf-Level, ×0,5
   (oder ×0) für Ziele ≥40 Level darunter — und im Gegenzug Turm-Etagen unter CL−25 aus dem
   Los nehmen oder stark untergewichten. Heute zahlt die L7-Made dasselbe wie der L104-Hirsch
   (5 vs 5–6 Pkt bei 74× XP-Unterschied): das entwertet die echte Jagd. 25 % der
   Endgame-Tasks sind derzeit Vollpreis-Pendeln.
3. **Zwei Zettel am Brett.** Die eine echte Entscheidung, die dem Loop noch fehlt: beim
   Master ZWEI Angebote ziehen und eines wählen (das andere verfällt) — oder ein zweiter
   Master mit anderem Profil (nur Turm, größere Marks, mehr Punkte, höheres Risiko). Füllt
   die Ein-Tab-Leiste, hebt Tiefe & Entscheidungen von 6 Richtung 8 und macht jede Vergabe
   zu einem Mini-Urteil statt einem Würfelwurf.

*Screenshots: `ui-audit/shots/rt-vesna-01…24.png` (alle gesichtet). Wegwerf-Skripte
gelöscht, Harness gestoppt, Port 5304 frei. Kein Spielcode angefasst.*
