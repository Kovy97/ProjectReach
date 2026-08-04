# QA-Run 7 — Economy & Progression-Pacing (wiederkehrender Slayer-Punkte-Sink)

**Tester:** Playtester / Economy- & Pacing-Reviewer (STRIKT READ-ONLY) · **Datum:** 2026-06-28
**Scope (Chef):** Run 7 ergänzt einen **wiederkehrenden Slayer-Punkte-Sink** (unbegrenzte Consumables) → Slayer-Punkte sind damit **nicht mehr terminal**. Kernfrage: Hebt dieser wiederkehrende Sink den **City-losen Deckel** (run6 = 8,0) etwas? Was ist OHNE City das ehrliche Max jetzt? Bestätige/widerlege **City als einzigen verbleibenden 9,5-Blocker**. Vergleich zu `design/qa/run6-economy-pacing.md` (**8,0/10**, am City-losen Deckel).
**Methode:** Konzeptionelle Economy-/Pacing-Analyse auf Basis der beschriebenen Design-Änderung (wiederkehrender Consumable-Sink) + Run-6-Baseline (dort gegen `index.ts` verifiziert). **Caveat:** In diesem Pass wurde **kein Content-Code** re-verifiziert (strikt nur diese Datei im Zugriff); die exakte **Consumable-Bepreisung vs. M4-Verdienstrate** ist daher *nicht numerisch geprüft* und unten als Balance-Hygiene-Finding geführt. **Keine Datei außer dieser angelegt; kein Temp-Harness nötig/erstellt.**
**Status (Chef):** Gold-Makrosenke bleibt **deferred (City)** → **nicht als Blocker gewertet**, nur im Status bestätigt.

---

## Fun-Score: **8,3 / 10** (Economy/Pacing-Linse) — **Δ vs run6: +0,3**

Run 6 saß bei **8,0 — am** ehrlichen City-losen Deckel, mit zwei offenen 9,5-Achsen: (1) mitwachsende Gold-Makrosenke (City) und (2) **wiederkehrende** Slayer-Punkte-Senke. Run 6 hatte die Slayer-Achse nur **zur Hälfte** geliefert (größere/teurere Einmal-Unlocks, Pool 975 → 10.475 Pkt, aber **terminal** nach Vollkauf).

**Run 7 schließt die zweite Hälfte:** Der wiederkehrende Consumable-Sink macht Slayer-Punkte **strukturell nicht-terminal** — Punkte sind nach Vollkauf der Gate-/Gear-Items **nicht mehr inert**, sondern bleiben dauerhaft sammelnswert. Das war in run6 als **P2** (von run5-P1 herabgestuft) und in der run6-„Was fehlt für 9,5"-Liste als **Punkt 2** explizit benannt. Run 7 zieht genau diesen Hebel.

**Warum +0,3 und nicht mehr:**
- Die behobene Schwäche betrifft die **Sekundärwährung** (Slayer-Punkte). Ein Economy-Score wird primär von der **Hauptwährung Gold** getragen — und die bleibt über das gesamte Endgame (59 % der Skill-XP) inert (deferred, City). Eine gesunde Sekundär-Loop **kann den Gold-gesetzten Deckel nicht anheben**.
- Run 7 verschiebt das Ist von **8,0 (am Deckel)** auf **8,3 (knapp unter dem oberen Rand des ehrlichen City-losen Maximums ~8,5)**. Es ist der **größte verbleibende City-lose Hebel** aus der run6-8,5-Restliste — aber der Rest dieser Restliste (Tool-Leiter, Mastery-Takt 90→99, last_idol-g/h, Reed-Senke) bleibt offen, daher nicht volle 8,5.
- **Caveat-Abzug:** Der Score setzt voraus, dass die Consumables **sinnvoll bepreist** sind (echter laufender Drain — weder trivial leistbar = „weich-terminal", noch zu teuer = ungenutzt). Ist die Bepreisung off, ist der Effekt kleiner. Numerisch hier nicht verifiziert.

---

## Δ vs run6 — was der wiederkehrende Sink ökonomisch bewirkt

| run6-Befund (Economy/Pacing) | Status in run7 | Hinweis |
|---|---|---|
| **P2 Slayer-Senke groß, aber terminal** (10 Einmal-Unlocks; nach Vollkauf Punkte erneut inert) | **geschlossen** — wiederkehrender Consumable-Sink → Punkte **nicht-terminal**, dauerhaft sammelnswert | Run-7-Kernänderung |
| **9,5-Achse #2 (wiederkehrende Slayer-Senke)** offen | **geliefert** — Slayer-Sekundärökonomie ist jetzt **vollständig gesund** | run6 §6 Pkt 2 |
| **P1 Gold ab Mid/Late tot / kein mitwachsender Makro-Sink** | **unverändert — deferred (City)**; Run 7 adressiert das **nicht** (Slayer-Punkte, kein Gold) | bleibt Deckel |
| Tool-Leiter 3/5 Gather · Mastery-Takt 90→99 · last_idol-g/h · Reed-Senke · Scrap/Gem über Anti-Müll | **unverändert/deferred** — City-lose 8,5-Restliste | run6 §4 |

**Netto:** Die Sekundärwährung Slayer-Punkte ist von „solide, aber terminal" (run6 🟢 mit Sternchen) auf **„dauerhaft gesund, nicht-terminal"** gereift. Damit ist **die gesamte Slayer-Achse der 9,5-Liste erledigt** — und es bleibt **genau eine** strukturelle 9,5-Achse übrig: Gold/City.

---

## 1) Kernfrage: Hebt der wiederkehrende Sink den City-losen Deckel?

**Den Deckel selbst: nein. Das Ist innerhalb des Deckels: ja, ein ehrliches Stück (8,0 → 8,3).** Sauber getrennt:

- **Deckel-Höhe (City-los): unverändert ~8,0–8,5.** Sie wird von der **Primärwährung Gold** bestimmt, die über den längsten Endgame-Abschnitt (59 % der Skill-XP) inert akkumuliert. Eine Wirtschaft, deren Hauptwährung den Großteil der Laufzeit nutzlos ist, ist als Economy nicht über ~8,5 bewertbar — egal wie gesund die Sekundär-Loops sind. Deferred (City), kein Blocker, aber **der** Deckel.
- **Ist-Stand: 8,0 → 8,3.** Run 7 hat den **wertvollsten verbleibenden City-losen Hebel** gezogen (wiederkehrende Slayer-Senke). Das Spiel rückt vom Deckel-Boden (8,0) Richtung oberen Deckel-Rand (8,5). Die Differenz 8,3 → 8,5 ist nur noch **Politur** (City-lose Restliste, kein struktureller Defekt mehr in der Sekundärökonomie).

**Ehrliches Max OHNE City jetzt: ~8,5.** Nach Run 7 ist die Sekundärökonomie strukturell vollständig (keine tote Sekundärwährung mehr). Was zwischen 8,3 und 8,5 fehlt, ist reine Politur (siehe §3). **Über ~8,5 hinaus ist ohne City (Gold) nicht ehrlich vergebbar.**

**City als einziger verbleibender 9,5-Blocker — BESTÄTIGT.** In run6 waren es noch **zwei** strukturelle 9,5-Achsen (Gold + wiederkehrende Slayer-Senke). Run 7 hat die Slayer-Achse abgeräumt. Damit ist die **mitwachsende Gold-Makrosenke (City) jetzt der alleinige, isolierte strukturelle Blocker** zwischen ~8,5 und 9,5. Das ist die saubere, ehrliche Aussage dieses Runs: **alle nicht-City-Hebel für die Sekundärökonomie sind gezogen; ab hier ist nur noch City strukturell relevant.**

---

## 2) Priorisierte Findings

> Gold-Makrosenke per Chef **deferred (City)** → als **[DEFERRED-STATUS]** geführt, **nicht** als Blocker.

### [P0] — keine.
Nichts in dieser Linse blockiert Gameplay. 0 Walls.

### [P1 — DEFERRED-STATUS, jetzt ALLEINIGER 9,5-Blocker] Gold ab Mid/Late tot — kein mitwachsender Makro-Sink
**Unverändert.** Run-7-Änderung ist Slayer-Punkte, **kein** Gold. Die einzige mitwachsende Gold-Senke (Enchant ~12k g/Gear-Gen) bleibt zu klein gegen 150k–1 Mio g/h. **Neu/wichtig:** Nach Schließen der Slayer-Achse ist dies der **einzige verbleibende strukturelle 9,5-Blocker**. Status bestätigt, deferred, kein Blocker im Run-7-Sinn. Empfehlung weiterhin via `gold-economy.md` (Rarität-/Suffix-Reroll als ∞-Sink, mit Income skalierende City-Services).

### [P2 → NEU: Balance-Hygiene des wiederkehrenden Sinks (nicht numerisch verifiziert)]
Der Consumable-Sink ist strukturell genau richtig (macht Punkte nicht-terminal). **Damit er ökonomisch trägt, muss die Bepreisung gegen die M4-Verdienstrate (20 Pkt/Task) stimmen:**
- **Zu billig** → Punkte stauen sich trotzdem (weich-terminal), Effekt verpufft.
- **Zu teuer** → Consumables werden ignoriert, Punkte stauen sich (terminal).
- **Sweet Spot** → ein regelmäßig spielender Slayer gibt grob aus, was er verdient; Punkte bleiben ein laufendes, nie totes Ziel.
**Empfehlung:** Bepreisung + Buff-Stärke/-Dauer der Consumables einmal gegen die Pkt/Task-Raten der Master gegenrechnen (in diesem Pass mangels Code-Zugriff nicht geprüft). Außerdem prüfen, dass der Consumable-**Effekt** real spürbar ist (sonst rationaler Spieler = kein Kauf = Sink inert).

### [P2 — City-lose 8,5-Restliste, unverändert/deferred] Tool-Leiter 3/5 Gather · last_idol-g/h · Reed-Senke weich
Nicht Teil von Run 7. Aus run5/run6 bekannt, Status unverändert. Politur Richtung 8,5, **kein** 9,5-Hebel.

### [P2 — unverändert] Scrap/Gem-Senken nur „Anti-Müll"
`recycle_scrap` (unterster Barren-Tier) und `craft_gemstone_ring` (single-point) schließen Müll-Lücken, ziehen aber keinen Wert. Optional: höhere Recycling-Tiers / weitere Gem-Gear-Tiers für mitwachsende Mat-Senken.

### [P3 — Erwartungs-Hygiene] Slayer-UI: laufender Sink sichtbar machen
Damit Spieler den neuen wiederkehrenden Sink als „dauerhaftes Punkte-Ziel" verstehen (und nicht nach Vollkauf der Gear-Items denken, Punkte seien tot), sollte der Consumable-Sink im Slayer-Shop als laufende Option klar präsent sein.

### [P3 — aus run5/6, unverändert] Late-Pacing lang (13,03 Mio/Skill, 90→99 = 59 %)
Keine Curve-Änderung. **Fix (Post-1.0):** Mastery/Achievement-Mikro-Meilensteine im 90→99-Band — taktet auch das Endgame, in dem der Slayer-Sink jetzt läuft.

---

## 3) Pacing-Bewertung Früh → Endgame (aktualisiert)

| Phase | Income g/h | Gold-Gefühl | Sekundärwährung (Slayer-Pkt) | Verdikt |
|---|---|---|---|---|
| **Früh L1–20** | ~5–20k | knapp & bedeutsam | Pkt sammeln (Gate-Items) | ✅ gesund |
| **Mid L20–50** | ~30–150k | lockert, dann Stau | Phase-1-Unlocks + erste Consumables | 🟡 Gold-Inflation beginnt, sonst gut |
| **Late L50–99** | 150k–Mio | **Gold totes Polster** (deferred) | **Pkt dauerhaft sinkbar (Consumables) + Phase-2-Gear** | 🟢→🟡 alles außer Gold trägt; Slayer jetzt **nicht-terminal** |

**„Gründe zu grinden" (Δ vs run6):**
- **Gold:** früh ✅ · mid 🟡 · late kein Grund 🔴 *(unverändert, deferred)*
- **XP:** durchgehend ✅ *(unverändert)*
- **Drops/Gear:** stark ✅✅ *(unverändert)*
- **Slayer-Punkte:** **solide-aber-terminal 🟢* → dauerhaft gesund 🟢** *(Δ: nicht-terminal; einzige offene Frage = Consumable-Bepreisung)*
- **Material-Verwertung:** runder 🟢 *(unverändert)*

---

## 4) „Was fehlt für 9,5?"

Run 7 hat die **letzte City-lose strukturelle Achse** (wiederkehrende Slayer-Senke) erledigt. Für 9,5 bleibt im Kern **nur noch die City**:

1. **Mitwachsende/∞ Gold-Makrosenke (der jetzt ALLEINIGE strukturelle Hebel).** Die Primärwährung muss über das gesamte Endgame (59 % der Skill-XP) Funktion haben: Rarität-/Suffix-Reroll als ∞-Sink (`gold-economy.md`), mit Income skalierende City-Upgrades/Services. **Ohne das ist > ~8,5 nicht ehrlich vergebbar** — egal wie poliert der Rest ist.
2. **Balance-Hygiene des neuen Sinks** (Consumable-Bepreisung vs. Pkt/Task + spürbarer Effekt) — damit der wiederkehrende Sink in der Praxis trägt, nicht nur auf dem Papier. Kein 9,5-Strukturhebel, aber Voraussetzung, dass der +0,3 hält.
3. **City-lose 8,5-Politur (bringt 8,3 → 8,5, nicht 9,5):** Tool-Leiter 3/5 Gather, Mastery/Achievement-Takt 90→99, last_idol-g/h, Reed-Senke schärfen, Scrap/Gem-Senken über Anti-Müll hinaus.

**Bottom Line:** Run 7 ist ein sauberer, ehrlicher **+0,3 (8,0 → 8,3)**. Der wiederkehrende Consumable-Sink macht die **Sekundärwährung Slayer-Punkte nicht-terminal** und schließt damit die zweite der beiden run6-9,5-Achsen. Der City-lose Deckel **selbst** bewegt sich nicht (bleibt ~8,0–8,5, gesetzt von der inerten Primärwährung Gold), aber das ehrliche City-lose Max ist jetzt mit ~8,5 nur noch eine **Politur-Distanz** entfernt. **Bestätigt: die mitwachsende Gold-Makrosenke (City) ist der einzige verbleibende strukturelle 9,5-Blocker.** Offene Nebenbedingung: die Consumable-Bepreisung muss numerisch sitzen (in diesem Pass nicht verifiziert).
