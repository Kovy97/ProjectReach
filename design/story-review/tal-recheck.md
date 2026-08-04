# Tal-Re-Check — Verifikation der Story-Review-Fixes (Wellen S/T/U)

**Rolle:** Phase-2-Fable-Sweep des CEO-Loops 2026-07-13, Tester „Tal-Re-Check" (nüchterner Prüfer, keine Persona)
**Datum:** 2026-07-16
**Methode:**
- Content-Lesung `packages/content/src/index.ts` + alle 5 Overlay-Locales (`es/fr/ru/ptBR/zh`) — „×7" heißt: en+de im Katalog, 5 Overlays geprüft.
- Headless-Sichtprüfung des ausgelieferten Story-Tabs via `ui-audit/sim-harness.mjs`, Port 5285 (Registry eingetragen), Fixture endgame, Kapitel per `__hfDebug`-State-Patch durchgeschaltet; 10 Screenshots, 0 Page-Errors. Wegwerf-Skript `review-recheck-tal.mjs` nach dem Lauf gelöscht.
- Engine-Sim-Spotchecks über das vitest-Wegwerf-Muster (`simulateCombat`, 180-s-Fenster, band-gerechtes Gear); Scratch-Test gelöscht.

---

## 1 · Prüf-Matrix (9 Zeilen)

| # | Kapitel / Fix | Vorhanden | Löst Befund | Nebenwirkung | Kurzbegründung |
|---|---|---|---|---|---|
| 1 | Kap. 4 — Ziele 40/10 → 30/8, descriptions ×7 | ✓ | 7/10 | keine | Objectives 30/8 im Katalog, Zahlen in allen 7 Sprachen konsistent, Bühne zeigt 30er-/8er-Zähler. Sim: reine Kill-Zeit ~8,3 min (30×11,3 s Goblin + 8×20 s Schamane) statt ~11 min — rund ein Viertel weniger. Die 5→38-Kante bleibt als erster echter Grind spürbar (by design), ist aber entschärft. Abzug: der geschärfte description-Text selbst ist im Story-Tab unsichtbar (s. Rest-Risiko 1) — die Zahlen tragen den Fix, nicht der Text. |
| 2 | Kap. 6/7 — ash_tyrant-Mechanik + Warchief-Loot | ✓ | 8/10 | geprüft, unkritisch | ash_tyrant: maxHp 112, def 30, dmg 24, burn-Inflict 25 %/mag 1/5 s, enrage ×1,4 ab 30 % — exakt wie spezifiziert. Warchief: warchief_fist 12 % + warchief_cleaver 0,3 % (+suffixChance 0,30), Items existieren und folgen der Rare-Drop-Philosophie (Runit-Stats bei Adamant-Req 50, Bleed-Effekt). Sim-Spotcheck: Band-Gear (Mithril CL45) 22,5 s/Kill, 0 Tode; Glass-Cannon (Großschwert ohne Schild) 22,5 s aber 3 Tode/3 min — der Boss hat jetzt Zähne genau gegen die Builds, die Davorin vermisste; weit unter Band (Stahl CL35) 90 s/Kill + 3 Tode = Undergeared-Wall bleibt gewollt stehen. Sanity: goblin_warchief unverändert schlagbar (Adamant CL55, 36 s/Kill). Einschränkung: die Kap.-6-Hälfte des Tals (Davorins 3/2, „Predigt mit Tötungsauftrag") war nie Teil des Fixes und steht unverändert. |
| 3 | Kap. 12 — tokenReward 2→3 | ✓ | 9/10 | +1 Token Gesamtökonomie, vernachlässigbar | Katalog: tokenReward 3 mit Welle-T-Kommentar; Token-Kurve Kap. 09–13 jetzt 2/2/3/3/3, monoton. Bühne zeigt „3" im Reward-Block (Screenshot). Reine Belohnungs-Kosmetik, genau was Onyx' Befund verlangte. |
| 4 | Kap. 13 — Dire-Wolf-Routing, description ×7 | ✓ | 7/10 | Namensnähe bleibt | Description in allen 7 Sprachen geschärft („3 Schreckenswölfe frei im Wildwald, dann … im Dungeon"). Wirksam entschärft wird die Falle aber vor allem durch die Welle-S-WO-Zeilen: Wolf-Ziel zeigt die Zone (Wildwood Hunting Grounds), Bär-Ziel den Dungeon (The Wildwood Hunt) — die optimale Route steht damit direkt an den Zielen. Abzug: der geschärfte Text selbst ist im Story-Tab unsichtbar, und die EN-Namen von Zone und Dungeon („Hunting Grounds" vs. „The Hunt") liegen verwechselbar nah beieinander. |
| 5 | Kap. 14 — reef_drowned 30→20 | ✓ | 8/10 | kein XP-/Gold-Loch | Objective 20, Zahlen ×7 konsistent, Bühne zeigt 0/20. Entlastung real: ~6 min weniger (10 Kills × ~36 s bei Band-Gear Runit CL128, Sim-gemessen). Wegfall: −3.900 Kill-XP (10 × 390) und 0 Gold (Monster droppen kein Gold) — bei L128-Band irrelevant, Quest-Gold unverändert 8.000. Bleibt strukturell ein beat-loser Doppel-Kill-Grind (Bos Kernkritik), nur kürzer. |
| 6 | Kap. 16 — Präzisions-Warnsatz ×7 | ✓ (nur Content) | 3/10 | keine | Der Warnsatz steht in allen 7 Sprachen in der description — aber die description wird für Chronik-Kapitel NIRGENDS gerendert. Headless verifiziert: Kap.-16-Bühne zeigt Titel, loreText-Bubble, Ziel-Zeilen, Rewards — kein „Without precision, nothing lands a hit". Die einzigen description-Flächen im Spiel sind Contracts-Detailbühne und Daily-Karten; Chronik-Quests sind aus beiden ausgeschlossen (questStrands.ts filtert `chronicle_*`). Die Evasion-Wand ist für den Spieler weiterhin stumm — der Fix existiert, erreicht ihn aber nicht. |
| 7 | Kap. 17 — loreText NEU („gestellte Wache") | ✓ | 9/10 | keine | Neuer Text ×7 (Katalog + alle 5 Overlays tragen die Enthüllung, zh in eigener Formulierung geprüft). Sichtprüfung: Bubble zeigt den vollen neuen Text, „They stand watch — and no watch posts itself" landet gut lesbar mitten im Absatz; die offene Akten-Zeile für den Wache-Steller gibt dem Kapitel die eigene kleine Enthüllung, die Lyria vermisste. Moralische Achse (Bedauern/kein Umweg) erhalten. Das Kapitel ist damit kein reines Bindeglied mehr. |
| 8 | Kap. 21 — chronicle_19 +paragon_key garantiert; Getilgte-Satz ×7 | ✓ | 8/10 | Duplikat-Key sauber (Erstattung) | chronicle_19-Rewards enthalten paragon_key ×1 (Bühne zeigt den Key-Chip im Reward-Block, Screenshot); Guard-Test `quest-integrity.test.ts` pinnt „Quellen sind EXAKT last_idol-Loot + chronicle_19-Reward"; der Einmal-Unlock-Intercept ist idempotent, Folge-Fund wird zu Gold erstattet (dungeon.test.ts) — wer den 8-%-Drop schon hatte, bekommt keinen Müll. Kronen-/Getilgte-Satz in allen 7 Sprachen im loreText, auf der Bühne sichtbar. Pox' Einwand 1 (RNG-Gate) damit vollständig gelöst; Einwand 2 (häufiger Sofort-Claim, weil Etage 5 oft längst erledigt) bleibt bewusst offen (§2.4 kumulativ = gewollt). |
| 9 | Kap. 5 (Bug) — WO-Zeile → Dungeon-Name | ✓ | 9/10 | keine | `monsterHomeDungeon` in util/chronicle.ts (dg_-Alias-Stripping, frühestes Gate gewinnt bei Mehrfach-Vorkommen), `objectiveLocation` nutzt ihn für dungeonOnly-Ziele; Bestiary teilt den Helfer. Live verifiziert: Kap.-5-Bühne zeigt „The Goblin Warband" statt „The Borderlands" — Selas Orientierungsfalle ist zu. Kleiner Rest: die WO-Zeile trägt kein „Dungeon"-Label (nur der Unlock-Chip auf Kap. 4 tut das), Selas Zweitpunkt „Wand + Dungeon-Rerun für 20-Minuten-Abende" ist ein Design-, kein Bug-Thema. |

---

## 2 · Neue Scores für die gefixten Kapitel (Heatmap-Update)

Kalibriert an den Original-Reviews (12er-Sweep); Format Spaß / Einfallsreichtum / Machbarkeit.

| Kapitel | Alt (Tal-Werte) | Neu | Begründung |
|---|---|---|---|
| 4 | 7/6/8 (Grok) · 6/8/8 (Mira) | **7 / 6 / 9** | Grind ~25 % kürzer, Kante bleibt konzeptionell; Machbarkeit glatter. |
| 5 | 6/6/5 (Sela) · 8/7/9 (Davorin) | **8 / 7 / 8** | WO-Falle zu, Boss droppt jetzt eigene Beute (Davorins Wermutstropfen 1 erledigt); Dungeon-Rerun-Kosten für Casuals bleiben. |
| 6 | 3/2/10 (Davorin) · 5/8/9 (Sela) | **4 / 5 / 10** | Unverändert — kein Fix beauftragt. Bleibt das ehrlich etikettierte Übergangskapitel; Tal auf dieser Seite NICHT angehoben. |
| 7 | 5/3/9 (Davorin) · 7/7/9 (Sela) | **7 / 6 / 9** | Vom „HP-Fass mit Titel" zum Boss mit Identität: burn-Druck + Enrage-Fenster, bestraft Glass-Builds real (Sim: 3 Tode/3 min ohne Schild), Band-Gear siegt klar. Kein neuer Wall. |
| 12 | 6/6/10 (Wren) · 6/6/9 (Onyx) | **6 / 6 / 10** | Token-Senke weg (Kurve monoton); das Kapitel selbst (Monokultur-Zone) unverändert — der Befund war die Kurve, nicht das Gameplay. |
| 13 | 7/7/8 (Bo/Lyria/Thane) | **7 / 7 / 9** | Routing an den Zielen ablesbar (Zone vs. Dungeon-Pin); Machbarkeit steigt durch klare Führung. |
| 14 | 5/6/8 (Bo) · 6/7/8 (Thane) · 8/8/9 (Lyria) | **6 / 7 / 9** | ~6 min kürzer, längster beat-loser Abschnitt entschärft; strukturell weiter flacher Doppel-Grind. |
| 16 | 5/6/8 (Bo) · 8/8/6 (Thane) | **5 / 6 / 7** | Faktisch unverändert für den Spieler: Warnsatz unsichtbar, Kill-Zahlen unverändert (25+8). Nur minimaler Machbarkeits-Bonus, weil die Warnung wenigstens in Contracts-fremden Flächen (Wiki/Zukunft) im Content steht. Tal NICHT angehoben. |
| 17 | 7/6/8 (Lyria) · 7/7/8 (Bo) · 8/7/7 (Thane) | **7 / 8 / 8** | Eigene Enthüllung statt Bindeglied — Einfallsreichtum springt; sichtbar verifiziert. |
| 21 | 6/8/8 (Isolde) · 5/7/7 (Pox) | **6 / 9 / 9** | Getilgte-Haken on-page (Isoldes „ordentlich → unwiderstehlich"-Satz fast wörtlich umgesetzt), Schluss-Gate deterministisch + guard-getestet. Spaß bleibt 6: der Sofort-Claim-No-Op (Pox 2) besteht fort. |

---

## 3 · Rest-Risiken

1. **Systemisch (wichtigster Punkt): Chronik-descriptions sind toter Text.** Die Story-Bühne rendert Titel + loreText + Ziel-Zeilen; `quest.description` erscheint nur auf Contracts-Detailbühne und Daily-Karten, und beide schließen `chronicle_*` aus. Damit verpuffen ALLE description-basierten Fixes dieser Welle teilweise (Kap. 4/13 tragen sich über Zahlen/WO-Zeilen selbst, Kap. 16 verpufft ganz) — und auch die ältere Runen-Warnung in Kap. 19 („Geh nicht ohne Runen auf der Rüstung hinein") erreicht den Spieler nicht. Empfehlung: EIN kleiner ui-dev-Task — description als knappe Ziel-Unterzeile auf der Chronik-Bühne rendern (z. B. zwischen Bubble und Objectives). Hebt Kap. 13, 16 und 19/20 gleichzeitig und macht künftige „Warnsatz in die description"-Fixes überhaupt erst wirksam.
2. **Kap. 6 bleibt Tal.** Der 6/7-Fix hat nur die Kap.-7-Seite (ash_tyrant) angehoben; Davorins 3/2 für Kap. 6 gilt fort. Bewusste Entscheidung dokumentieren oder als kleinen Beat nachrüsten (z. B. Mini-Elite am Ende der Irrlicht-Reihe).
3. **Namensnähe Wildwood:** Zone „Wildwood Hunting Grounds" vs. Dungeon „The Wildwood Hunt" (EN) sind an den beiden WO-Pins von Kap. 13 schwer zu unterscheiden; ein „Dungeon"-Präfix im WO-Pin (analog zum Unlock-Chip) würde die letzte Restverwirrung nehmen.
4. **Kap.-21-No-Op:** Sofort-Claim bei `best >= 5` bleibt; laut §2.4 vertretbar, aber der Epilog verpufft mechanisch weiterhin für Gear-Farmer (Pox' Einwand 2, bewusst nicht Teil der Welle).
5. **ash_tyrant-Tuning beobachten:** Band-Kill-Zeit sank von ~30 s auf ~22,5 s — mit Über-Band-Gear (Adamant+) könnte er sich schnell trivial anfühlen. Kein Handlungsbedarf jetzt; bei der nächsten Balance-Runde gegenprüfen.

---

## 4 · Gesamtverdikt

**Täler angehoben: teilweise — 8 von 9 Zeilen real und wirksam, 1 Zeile (Kap. 16) nur auf Content-Ebene.**

Alle neun Fixes sind im ausgelieferten Content/UI nachweisbar vorhanden (Matrix-Spalte 1 durchgängig grün, ×7-Abdeckung stichprobenfest, 0 Page-Errors, Guard-Tests am kritischen paragon_key-Pfad). Acht davon lösen ihren Befund tatsächlich; die Sim bestätigt, dass keine der Balance-Änderungen ein neues Loch reißt (ash_tyrant band-gerecht fordernd statt zäh, Warchief unverändert, Kap.-14-Kürzung ohne XP-/Gold-Loch, Undergeared-Wall intakt). Die eine echte Lücke ist kein Content-Fehler, sondern ein Sichtbarkeits-Bug der Bühne: Solange die Chronik-description nirgends gerendert wird, bleibt die Kap.-16-Evasion-Wand (und die Kap.-19-Runen-Warnung) für den Spieler stumm — ein einzelner kleiner ui-dev-Task macht aus dem „teilweise" ein „ja".
