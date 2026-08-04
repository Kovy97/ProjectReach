# Fun-Sweep RUNDE 3: Slayer-System — „Vesna Schwurklinge" (Kopfgeldjägerin), 3. Besuch

**RUNDE 3, 2026-07-16 · sim-harness Port 5312 · Vorberichte: `slayer-vesna.md` (R1, Port 5293), `retest-slayer-vesna.md` (R2, Port 5304)**

## 1. Steckbrief — die Reise R1 → R2 → jetzt

| | |
|---|---|
| Persona | Vesna Schwurklinge — lebt für Auftrags-Loops: Task holen → jagen → kassieren → nächster |
| R1 (F4) | Solides Fundament, aber: Zettel ohne Kopfgeld, toter Gratis-Skip-Button, Endgame = Hirsch-Pendeln (60 % der Welt-Tasks), keine Kette. Gesamt 7/10 |
| R2 (Retest) | Kopfgeld auf dem Zettel, Streak 5/10 live, Gnaden-Skip repariert, Welt-Pool geheilt — Restleiden: 25 % der Ziehungen Trivial-Etagen (L3–38 bei CL 96), Serien-Takt unsichtbar. Gesamt 8/10 |
| R3 (jetzt) | Turm-Unterkante ist da (0 % Trivial-Etagen in 200 Ziehungen), Serien-Countdown auf dem Chip, Nekro hat ein Fahndungsfoto. Neue Sorgen: Bone Colossus = 26 % aller Tasks, der Streak-Toast kann im Toast-Stapel ersticken |
| Stand 1 (mid) | Mira Ashfall, CL 30, Slayer 24 → 30 — 4 echte Kampf-Abschlüsse (1 ungenerft), Serie bis 25, bezahlter Skip, SL1-Gratis-Probe |
| Stand 2 (end) | Korveth Grimhollow, CL 96, Slayer 97, Magie 97, Slayer-Helm — 200 Ziehungen (Verteilung in %), 1 echter Abschluss (Dissonanz-Check), Art-Checks, Shop |

Beide Läufe ohne Page-Errors. Wegwerf-Skripte (rt3-vesna-a/b.mjs) gelöscht, Port 5312 wieder frei, alle 29 Screenshots gesichtet.

## 2. Session-Protokoll

**Moment 1 — Der Zettel ist komplett (rt3-vesna-02, -04).** „Get New Task" → Goblin Rogue ×48,
Turm Etage 1, und darunter die volle Zeile: **„REWARDS ✦ +912 XP · +6 PTS"** — und sobald die
Serie läuft, daneben der neue Chip: **„🔥 Streak: 1 — bonus at 5"**. Das ist exakt mein
Runde-2-Wunsch Nr. 1: Ich muss den Takt nicht mehr erraten, der Zettel sagt mir, wann der
nächste Bonus fällt. Topbar-Chip, „Go to Combat", Zonen-Band („CONTAINS TASK TARGET") und
Karten-Ribbon („TASK TARGET") führen weiter ohne Suchen zur Beute.

**Moment 2 — Die Kette hat jetzt ein Ziffernblatt, aber die 5er-Feier kann ersticken
(rt3-vesna-05, -06, -07, -08, -09).** Serie 5 (echter Kampf-Abschluss): Tokens +2 kamen an —
aber der „Streak 5!"-Toast war NICHT zu sehen. Der Toast-Stapel zeigt maximal 4 Einträge
(FIFO), und mein Abschluss feuerte gleichzeitig Achievement + Level-Up + Total-Level +
Task-Complete: der Streak-Toast wurde verdrängt (deterministisch, zweimal reproduziert;
Chip und Tokens stimmen, nur die Feier fehlt). Serie 10 dagegen knallte sauber: **„Streak
10! +2 tokens · +5 pts"**, gemessen +10 statt +5 Punkte auf dem 10. Task. Serie 25 (mein
Meilenstein-Test): nur der reguläre 5er-Bonus („Streak 25! +2 tokens") — lange Meilensteine
mit Eskalation gibt es nicht, die Kette zieht psychologisch weiter exakt 5 Tasks weit.

**Moment 3 — Skip bleibt eine informierte Entscheidung (rt3-vesna-10, -11).** Confirm:
„Cancel this task for 20 Slayer Points?" + kursiv „A paid skip will break your streak."
Ich habe bei Serie 25 bestätigt: 28 → 8 Punkte, Serie 25 → 0. Die Warnung nennt weiterhin
weder Serienstand noch Verlust — aber der Chip mit „Streak: 25 — bonus at 30" steht
inzwischen zwei Zentimeter darüber; der halbe Schmerz meiner alten Beschwerde ist damit
durch Nachbarschaft geheilt, formal unkonkret bleibt sie.

**Moment 4 — SL1-Gnade weiter intakt (rt3-vesna-12, -13, -14).** Slayer 1, 0 Punkte:
Button „Skip Task (Free)", klickbar, Confirm „for free?", KEINE Streak-Warnung (korrekt —
Gratis bricht nicht), nach dem Skip: 0 Punkte, Serie 3 lebt. Der Runde-1-Blocker bleibt tot.

**Moment 5 — Endgame: die Trivial-Lotterie ist abgeschafft (rt3-vesna-20…22, 200 Ziehungen).**
CL 96/SL 97: **0,0 % der 200 Ziehungen unter Etage 4** (R2: Etage 1+2 = ~25 % aller Tasks).
Level-Spanne der Ziele: 76–104 (R2: 3–104). Kein Zettel unter **1.920 Slayer-XP** (R2-Minimum:
160 XP — Faktor-74-Spanne auf 28 gedrückt, Median jetzt 15.390). Der schwächste Zettel des
neuen Pools ist ein Level-90-Waldhase (96 XP/Kill, für 4–6 Punkte) — komisch auf einem
Fahndungszettel, aber legitimer Content der Endzone. Turm 52,5 % / Welt 47,5 %.

**Moment 6 — Die neue Monotonie heißt Bone Colossus (rt3-vesna-21, -25, -26).** Etage 4 hat im
Fenster [CL−20 .. CL+8] genau EIN Monster — und weil das Etagen-Los gleichverteilt über
brauchbare Etagen fällt, ist **Bone Colossus 26,0 % ALLER Endgame-Tasks** (49,5 % der
Turm-Tasks; Etage 5 verteilt ihre 50,5 % immerhin auf 6 Köpfe). Der Hirsch ist besiegt
(wild_stag: 6,0 % gesamt, R1: ~30 %+), es lebe der Knochenkoloss. Unique Monster gesamt:
**12 in 200 Ziehungen** (R2: 31 in 120 — die Vielfalt hat sich halbiert, aber das Rauschen
von 31 war zur Hälfte Trivial-Müll; die 12 sind alle jagdwürdig).

**Moment 7 — „Too weak" lebt noch, nur höflicher (rt3-vesna-25…27).** Bone Colossus ×36 real
gejagt: Kill in 5,0 s, Kampflog wörtlich **„🚫 Bone Colossus is too weak — no combat XP (loot
unchanged)"** — während Brenna +16.560 Slayer-XP · +5 Punkte zahlt. **31,0 % der 200
Ziehungen** (bone_colossus 26 % + dread_knight 5 %) liegen ≥ 15 Level unter dem Stil-Skill
(Magie 97) und geben null Kampf-XP. Der Unterschied zu R2: Diese Tasks sind keine
160-XP-Witze mehr, sondern zahlen 8.000–25.000 Slayer-XP — das Elend ist weg, die Dissonanz
(System nennt das Ziel wertlos, Auftrag zahlt Vollpreis) bleibt in mildem Zustand. Dasselbe
im Midgame: tower_goblin L15 bei Attack 31 → „too weak", 372-XP-Zettel.

**Moment 8 — Fahndungsfotos: 1 von 2 nachgeliefert (rt3-vesna-23, -24).** Necromancer Lord
(dg_skeleton_nekro) hat jetzt sein Bild (Alias auf skeleton_nekro.png — beide zusammen 13 %
der Ziehungen, sauber). **Iron Sentinel bleibt der Fallback-Schädel — 10,0 % aller
Endgame-Ziehungen** sehen weiter nach Platzhalter aus. Neu entdeckt: **mire_wisp**
(Midgame-Welt-Pool) hat ebenfalls kein Bild (rt3-vesna-10).

**Eckdaten neu vermessen:** Kills 15–50 · Punkte 4–6 (req 15–25→4, 26–38→5, 39–50→6; Formel
unverändert ×0,73–×1,27) · Skip 20 Pkt · Serie: alle 5 +2 Marken, alle 10 zusätzlich
+1 Task-Äquivalent Punkte, KEINE Extras bei 25+ · XP/Kill im Endgame-Pool 96–1.150
(Faktor 12 bei gleichem Punkte-Lohn) · Shop-Katalog unverändert (12→650, Helm 650 ≈ ~120–130
Tasks) · echter Kill des letzten Task-Monsters: 4,7 s (mid), 5,0 s (end).

## 3. Bewertungsbogen — R1 | R2 | R3 | Δ(R2→R3)

| Aspekt | R1 | R2 | R3 | Δ | Begründung |
|---|---|---|---|---|---|
| Spaß sofort (erste 5 min) | 8 | 9 | 9 | ±0 | Erstkontakt bleibt makellos: Kopfgeld-Zettel, Gratis-Skip, Countdown-Chip. Nichts Neues nötig, nichts kaputt. |
| Spaß über Zeit | 6 | 7 | 8 | +1 | Trivial-Lotterie abgeschafft — JEDER Zettel hat jetzt Substanz (min. 1.920 statt 160 XP). Deckel: Bone-Colossus-Monokultur (26 %) und die ~703 Tasks für 80→99 stehen unverändert. |
| Sucht-Faktor („eine Runde noch") | 7 | 9 | 9 | ±0 | Der Countdown („Streak: 12 — bonus at 15") macht den Kettenzug endlich sichtbar — aber die Kette trägt weiter nur 5 Tasks weit (kein 25/50/100), und die 5er-Feier kann im Toast-Stapel ersticken. |
| Belohnungs-Dichte & Dopamin | 6 | 8 | 8 | ±0 | Zettel-Werte deutlich fetter (Median 15.390 XP), Toast-Stack (Task+Streak+LevelUp) bleibt stark — Abzug NEU: der Streak-Toast wird bei großen Momenten vom 4er-FIFO verdrängt; genau dann, wenn am meisten los ist. |
| Ziel-Klarheit | 9 | 9 | 9 | ±0 | Unverändert die Stärke des Systems: Etagen-Gates, Shop-Leiter, Cape, jetzt plus Serien-Countdown. |
| Tiefe & Entscheidungen | 4 | 6 | 6 | ±0 | Keine neue Entscheidung: ein Master, ein Zettel, Turm/Welt bleibt Würfel. Die Skip-Abwägung ist informierter, aber es ist dieselbe eine Abwägung. |
| Frustfreiheit | 6 | 8 | 9 | +1 | Das Vollpreis-Pendeln zu L3-Ratten ist tot (0 % unter Etage 4). Rest-Reibung: 31 % Kampf-XP-lose Ziele mit „too weak"-Zeile, Iron-Sentinel-Platzhalter, Turm-Marker erst nach Scrollen. |
| Verzahnung | 8 | 8 | 8 | ±0 | Gear-Gates lehren den Shop, Marken koppeln an den Token-Shop, Nekro-Art schließt eine Lücke. Brenna schweigt weiterhin über Story-Gates; Ein-Tab-Leiste bleibt ein leeres Versprechen. |
| **GESAMT-SUCHT-URTEIL** | **7** | **8** | **8,5** | **+0,5** | Der Loop ist mechanisch rund: Information, Takt, Würde — was zwischen 8,5 und 9+ liegt, ist keine Reparatur mehr, sondern Tiefe (Wahl) und lange Kette. |

**Komme ich morgen wieder?** — **„Ja, und ich bleibe länger als geplant: Der Zettel sagt mir,
was die Jagd wert ist UND wann der nächste Bonus fällt — bei ‚Streak: 12 — bonus at 15' hole
ich die drei Tasks noch, jedes Mal. Brenna schickt mich auch nicht mehr in die Pestkammern zu
Maden. Aber wenn sie mir zum vierten Mal in Folge den Knochenkoloss verkauft und meine
25er-Serie exakt dieselben zwei Marken zahlt wie die 5er, merke ich: Die Liste ist kürzer,
als sie aussieht."**

## 4. Runde-2-Funde-Verifikation

1. **Trivial-Etagen-Lotterie im Endgame (25 % der Ziehungen) → BEHOBEN.** Turm-Fenster hat
   jetzt eine Unterkante (im Spiel gemessen: 200 Ziehungen, 0,0 % Etage 1–3, Ziel-Level
   76–104, kein Ziel ≥ 40 Level unter CL 96; R2: 25 % der Tasks 60–90 Level darunter).
   Schwächster Zettel 1.920 statt 160 XP; XP-Spanne Faktor 74 → 28.
2. **Serien-Takt unsichtbar → BEHOBEN.** Chip heißt jetzt „Streak: {n} — bonus at {next}"
   (in allen drei Ständen + Endgame verifiziert, EN/DE sauber). Der Takt ist lesbar, genau
   im Skip-Moment sichtbar.
3. **iron_sentinel/dg_skeleton_nekro ohne Art → HALB BEHOBEN.** Necromancer Lord hat sein
   Fahndungsfoto (13 % der Ziehungen gedeckt). Iron Sentinel bleibt Fallback-Schädel —
   **10,0 % aller Endgame-Ziehungen**. Neu gefunden: mire_wisp (Midgame-Welt-Pool) ebenfalls
   ohne Bild.
4. **„too weak"-Dissonanz → TEILS BEHOBEN (Symptom entschärft, Widerspruch bleibt).**
   In-game reproduziert: Bone Colossus ×36, Kill 5,0 s, Log „too weak — no combat XP",
   Brenna zahlt +16.560 XP · +5 Pkt. 31,0 % der Ziehungen sind solche Kampf-XP-losen Ziele
   (L ≤ Stil-Skill − 15). Der Auftrag ist dank Slayer-XP nicht mehr wertlos — aber das
   System widerspricht sich weiter selbst, jetzt nur ohne Elend.

**Ältere Bestände:** Kein Soft-Lock (200 Ziehungen, keine unerfüllbare Anforderung, keine
gesperrte Zone; Page-Errors 0) — weiter bestätigt. Kosmetik-Fallback `?? 30` in
SlayerPage.tsx:108 — **dritte Runde unverändert** (echter skipCost 20). Brenna-Zeile zu
Story-Gates — weiterhin nicht vorhanden (drei statische Grüße).

## 5. Runde-2-Top-3-Check — erlebbar passiert?

1. **Serien-Countdown + Meilensteine 25/50/100 → HALB.** Countdown: JA, gebaut und gut
   (Chip mit „bonus at {next}", live erlebt bei 1/5/10/12/25). Meilensteine jenseits 10:
   NEIN — Serie 25 zahlt exakt den Standard-5er (+2 Marken, kein Punkte-Extra, kein Titel,
   keine Brenna-Zeile; in-game verifiziert). Die Confirm-Warnung nennt weiter keine Zahl,
   steht aber jetzt direkt neben dem bezifferten Chip.
2. **Gefahrenzulage → NICHT GEBAUT, Problem anders halbiert.** Punkte skalieren
   ausschließlich mit der Task-Größe (req 15–25→4 / 26–38→5 / 39–50→6; L76-Koloss zahlt wie
   L104-Hirsch). ABER: Die Turm-Unterkante hat den schlimmsten Auswuchs (Vollpreis für
   L3-Ratten) an der Wurzel entfernt — ehrlich anerkannt: der Kern meiner Beschwerde ist zu
   zwei Dritteln über einen anderen Hebel erledigt. Was bleibt: Faktor 12 XP/Kill-Spanne im
   Pool bei Einheitslohn (Punkte-Farmer wählt den Hasen, nie den Verschlinger).
3. **Zwei Zettel am Brett → NICHT GEBAUT.** Ein Master, ein Angebot, Ein-Tab-Leiste
   unverändert. Tiefe & Entscheidungen stehen deshalb seit R2 bei 6 fest. (Vermutlich bewusst
   im Balance-/Feature-Block — aus dem Spiel heraus: die eine fehlende Entscheidung.)

## 6. Neue Funde

- **[UI-Bug, echt] Streak-Toast erstickt im 4er-FIFO.** Toasts.tsx: MAX_TOASTS = 4,
  `slice(-4)`. Fällt der Serien-Bonus mit Achievement + Level-Up + Total-Level + Task-Complete
  zusammen (Frühphase: praktisch jeder 5er-Meilenstein), wird ausgerechnet der
  Streak-Toast verdrängt — Tokens kommen an, die Feier fällt aus. Zweimal deterministisch
  reproduziert (rt3-vesna-05/06: Chip sagt Serie 5, Stack zeigt 4 andere Toasts). Fix-Idee:
  Streak-Bonus in den Task-Complete-Toast mergen oder priorisieren. → ui-dev, klein.
- **[BALANCE/MONOTONIE] Bone Colossus = 26,0 % aller Endgame-Tasks.** Etage 4 hat im Fenster
  [CL−20 .. CL+8] genau 1 Monster, das Etagen-Los verteilt aber gleich auf Etagen (nicht auf
  Kandidaten): 49,5 % der Turm-Tasks landen auf einem einzigen Kopf. Der alte Hirsch (60 %
  der Welt-Tasks) ist durch einen neuen Quasi-Hirsch im Turm ersetzt — höflicher, aber
  monoton.
- **[BALANCE] Einheitslohn bei Faktor-12-Zielen.** Endgame-Pool: forest_hare 96 XP/Kill vs.
  abyssal_devourer 1.150 XP/Kill — identische Punkteformel. Wer Punkte farmt (Helm!), nimmt
  systematisch das schwächste Ziel; die „echte Jagd" bleibt ökonomisch unbelohnt.
- **[POLISH] Turm-Task-Wegweiser endet auf der Zonenübersicht.** „Go to Combat" bei einem
  Turm-Task zeigt „CHOOSE A ZONE" ohne sichtbaren Marker im ersten Viewport — das
  „CONTAINS TASK TARGET"-Band sitzt im Turm-Abschnitt UNTER Zonen und Dungeons (Scrollen
  nötig). Welt-Tasks markieren dagegen sofort sichtbar (rt3-vesna-09 vs. -05).
- **[ASSET] mire_wisp ohne Fahndungsfoto** (Midgame-Welt-Pool, rt3-vesna-10) — zusätzlich zum
  bekannten iron_sentinel (10 % der Endgame-Ziehungen).
- **[FLAVOR/Beobachtung] Level-90-Waldhase als Kopfgeld.** Echter Content (Wildwood-Endzone),
  aber auf Brennas Zettel wirkt „Forest Hare, +2.016 XP" wie ein Witz zwischen Void Heralds —
  und ist als schnellstes Punkte-Ziel auch noch die rational beste Wahl (s. Einheitslohn).
- **[Beobachtung] Ein-Tab-Leiste, dritter Besuch:** genau ein Master in einer Leiste, die
  nach mehr aussieht — unverändert seit R1.

## 7. Meine Top-3 für Runde 4

1. **Die Feier FIFO-fest machen + die Kette verlängern.** (a) Streak-Bonus nie verdrängen:
   in den Task-Complete-Toast mergen („SLAYER TASK COMPLETE! +1.512 XP · +6 pts · 🔥 Serie 5:
   +2 Marken") oder priorisieren. (b) Lange Meilensteine 25/50/100 mit Eskalation
   (Punkte-Multiplikator, Brenna-Zeile, Statistik) — heute ist Serie 25 wörtlich dasselbe wie
   Serie 5, die Kette verliert nach dem 10er ihren Zug. Kleinster Aufwand, direkt auf
   existierendem State — mein alter Punkt, jetzt mit dem Toast-Bug als zweitem Grund.
2. **Etagen-Los nach Kandidaten gewichten + Lohn nach Jagdwert staffeln.** Das Etagen-Los
   auf die ANZAHL der Fenster-Kandidaten je Etage gewichten (Etage 4: 1 Kopf, Etage 5: 6
   Köpfe → heute je 50 %) — halbiert die Bone-Colossus-Quote sofort auf ~7 % ohne neue
   Inhalte. Dazu Punkte leicht nach XP/Kill des Ziels staffeln (±1–2 Punkte), damit
   Verschlinger-Marks sich fetter anfühlen als Hasen-Marks und die Dissonanz „too weak zum
   Vollpreis" auch ökonomisch schrumpft.
3. **Zwei Zettel am Brett (unverändert).** Beim Master zwei Angebote ziehen, eines wählen,
   das andere verfällt — oder ein zweiter Master mit anderem Profil in der leeren Tab-Leiste.
   Tiefe & Entscheidungen klemmt seit zwei Runden bei 6/10; das ist der einzige Hebel, der
   aus dem exzellenten Abarbeitungs-Loop einen Urteils-Loop macht.

*Screenshots: `ui-audit/shots/rt3-vesna-01…29.png` (alle gesichtet). Wegwerf-Skripte
gelöscht, Harness gestoppt (withHarness), Port 5312 frei, keine Page-Errors in beiden
Läufen. Kein Spielcode angefasst.*
