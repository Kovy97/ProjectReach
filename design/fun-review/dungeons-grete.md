# Fun-Review F6 — Dungeons als Wiederhol-Loop („Grete Beutezug", Dungeon-Farmerin)

**Datum:** 2026-07-16 · **Sweep:** FUN-SWEEP CEO-Loop 2026-07-14, Tester F6 · **Methode:** read-only;
Engine-Sim (SimPlayer/`runDungeon`, Wegwerf-vitest, gelöscht) + Playwright-Sim-Harness (Port 5295,
Endgame-Fixture, `__hfDebug`-Patches, Wegwerf-Skripte gelöscht). Screenshots im Session-Scratchpad
(`shots/f6-*.png`, `f6c-*.png`).

## Steckbrief & Test-Setup

**Persona:** Grete Beutezug — wiederholt Dungeons für Chase-Drops und Clear-Effizienz. Bewertet
Loot-Tabellen nach Jagd-Qualität, Lauf-Länge vs. Belohnung, Wellen-Rhythmus. Die Spielerin mit
300 Warband-Clears für das 0,3-%-Spaltbeil — wenn die Jagd fair kommuniziert ist.

| Persona | Build | Einsatz |
|---|---|---|
| Früh-Band | CL 60, Melee, bestes Nicht-Chase-Gear ≤ Anforderungen (Runit-Platte, Cinderfang-Dolch), Auto-Eat T3, Godbloom-Food | goblin_warband, 30 Sim-Runs |
| Endgame | BiS-Magier-Tank 99 (`buildBisCharacter`, Idol-Set + idol_aegis, alle Buffs), cooked_voidray | idol_sanctum 4 Runs, behind_the_throne 6 Runs |
| Erst-Versuch | 99er-Melee, volles Godiron-/Epic-Gear, aber OHNE Runen/Tonika/wardBreak | Sanctum/Thron: 0/10 Clears, 10 Tode (s. Befund 4) |
| UI-Läufe | Endgame-Fixture „Korveth" (CL 96–99), Chronik per Patch frei | 3 komplette Warband-Läufe live, Sanctum/Thron-Momente |

## Messwerte (echte Engine, seeded)

| Dungeon | ø Lauf | Clears/Tode | Gold/Clear | Runs pro 10 min |
|---|---|---|---|---|
| goblin_warband (L60-Band) | **80 s** (70–90) | 30/30, 0 Tode | 620 g + 350 Vit-XP | ~7 (inkl. 2-Klick-Restart ~6,5) |
| idol_sanctum (BiS-Tank) | **~31 min** | 4/4, 0 Tode | 12 000 g + 15 000 Vit-XP | 0,3 |
| behind_the_throne (BiS-Tank) | **~29 min** | 4/6, **2 Tode** | 8 000–10 000 g + 24 000 Vit-XP | 0,3 |

Drazhan-Audit-Kontext: mit realistischem Voll-Loadout (Runen+Tonika+Trank) ~7 min TTK bei 88–95 %
Sieg — der Tank ist die sichere, aber langsamste Farm-Variante. Kill-Cooldown 2 s zwischen Wellen,
8 s Boss-Atempause: guter Rhythmus, keine tote Zeit zwischen Läufen (Restart sofort möglich).

**Chase-Mathematik (erwartete Investition bis zum ersten Treffer):**

| Chase | Chance | erwartete Runs | erwartete Zeit |
|---|---|---|---|
| warbanner_cape / warlock_felstaff | je 0,8 %/Clear | ~62 (irgendeins) | **~1,6 h** — gesund |
| warchief_cleaver (Boss-Kill) | 0,3 % | ~333 | **~9 h aktiv** — harter, aber fairer Chase |
| Sanctum-Rüstungs-Chases (5 × 2 %) | ~9,6 %/Run irgendeins | ~10 | ~3–5 h/Teil — sehr gut |
| idol_aegis / last_idol_mantle | je 0,2 % | ~250 | ~40–125 h |
| crownless_blade | 0,15 % | ~667 | ~80–320 h |
| **sevenfold_crown_chain** | **0,1 %** | **~1000** | **~120–480 h** — keine Jagd mehr, eine Wand |

In 30 Warband-Runs gedroppt: 3× warchief_fist (12 % ✓), 0× Chase — fühlt sich korrekt an, WENN man
die Chance kennt (s. Befund 1).

## Momente

1. **Boss-Intro mit Schatz-Flash (f6c-05):** Bildschirm dimmt, „🗝 Schatz gefunden!", „BOSS-BEGEGNUNG —
   Der Kriegshäuptling der Bande", 8 s Atempause, dahinter noch die Kill-Summary der letzten Welle.
   Das beste Stück Dramaturgie im Spiel — genau der Puls-Moment, den ein Farm-Loop braucht.
2. **Clear-Zeremonie + Toast-Jackpot-Stapel (f6c-06):** Zeremonie-Karte mit Dungeon-Art, „Erstbezwingung!
   Gold ×2"-Badge, Beute-Showcase — und rechts stapeln sich parallel „Seltener Fund!" und
   „Verzaubertes Item! … des Tigers". Wenn es klingelt, klingelt es richtig.
3. **Wellen-Lesbarkeit (f6c-03):** „Welle 1/5 — Die Vorhut" + Totenkopf-Leiste (trash/elite/boss
   unterscheidbar) + „Beute 0/3"-Badge am Monster. Ich weiß immer, wo im Lauf ich bin.
4. **2-Klick-Wiederholung (f6c-07):** Nach „Weiter" lande ich exakt vor dem Betreten-Button, Scroll-
   Position erhalten. Warband-Farmen flutscht: ~6,5 Läufe pro 10-Minuten-Block, jeder mit garantiertem
   Siegel + Chest + Wellen-Loot. Der 10-Minuten-Block ist klar befriedigend.
5. **Anti-Klimax am Thron (f6-14/15):** „Welle 1/1 — Drazhan der Kronlose" — kein Chest, kein
   Boss-Intro (bei 1 Welle existiert der Übergang nicht). Ausgerechnet der finale Chase-Dungeon mit dem
   seltensten Item des Spiels fühlt sich an wie ein nackter Monsterkampf mit Abspann.

## Bewertungsbogen — Dungeons als Wiederhol-Loop (Grete Beutezug, Dungeon-Farmerin)
- Spaß sofort (erste 5 Minuten): 8/10
- Spaß über Zeit (Stunden/Tage, simuliert): 6/10
- Sucht-Faktor („eine Runde noch"): 7/10
- Belohnungs-Dichte & Dopamin-Momente: 8/10
- Ziel-Klarheit (warum mache ich weiter?): 4/10
- Tiefe & Entscheidungen (denken statt klicken?): 6/10
- Frustfreiheit (10 = kein Frust): 6/10
- Verzahnung mit dem Rest des Spiels: 8/10
- GESAMT-SUCHT-URTEIL: 7/10
- Komme ich morgen wieder? Ja — der Warband-/Sanctum-Rhythmus zieht; für die 0,1-%-Kette käme ich nur
  wieder, wenn das Spiel mir je verraten würde, dass es sie gibt.

**Begründung der Ausreißer:** Ziel-Klarheit 4/10 ist der Kern: Die Dungeon-Karte zeigt NUR
„Name · Lv · Wellen" — null Beute-Info. Die Clear-Loot-Tabelle (inkl. aller Grale) ist vor dem
Erstfund NIRGENDS sichtbar: nicht auf der Karte, nicht im Bestiarium (das zeigt nur Monster-Kill-Loot,
Unentdecktes als Silhouette ohne %), nicht im Item-Wiki (nur per Item erreichbar, das man kennen muss).
Die sevenfold_crown_chain existiert für die Spielerin schlicht nicht. Grete farmt 300 Runs für ein
Spaltbeil, dessen Chance sie erst NACH dem ersten Drop erfährt. Frustfreiheit 6/10: Tod = kompletter
Run-Abbruch ist bei 80-s-Läufen fein und bei 29-min-Läufen hart (fair abgefedert: Wellen-Loot und
Chest sind schon gebankt); die Melee-Ward-Wand (s. Bugs #4) kostet unerklärt Läufe.

## Top-3 Sucht-Verbesserungen

1. **Beute-Vorschau auf der Dungeon-Karte** (größter Einzelhebel): Clear-Loot-Zeile im Bestiarium-Stil —
   entdeckte Items mit %, unentdeckte als Silhouette mit „?". Grete muss WISSEN, was sie jagen kann und
   wie wahrscheinlich. Macht aus „nette Läufe" eine Jagd; Infrastruktur (Silhouetten, %-Formatierung,
   isItemDiscovered) existiert bereits komplett im Bestiarium.
2. **Chase-Fortschritt sichtbar machen oder deckeln:** „✓ 47" Clears steht schon auf der Karte — daneben
   gehört der Chase-Kontext („Seit letztem seltenen Fund: 47"), besser noch ein sanftes Pity
   (z. B. je 50 Clears +50 % Chase-Chance, Reset bei Treffer). 0,1 % auf einem 29-min-Lauf sind
   ~1000 erwartete Läufe — das ist keine „eine Runde noch"-Schleife, sondern eine unsichtbare Wand,
   die exakt Gretes Spielertyp verbrennt.
3. **Thron braucht den größten Auftritt, hat den kleinsten:** Boss-Intro-Fenster auch für 1-Wellen-
   Dungeons (Intro VOR Welle 1 statt am Wellen-Übergang) — Drazhan ist das Story-Finale UND der
   End-Chase; aktuell ist er dramaturgisch der ärmste Dungeon des Spiels. Optional dazu: ab Clear ~10
   eine „Zeremonie nur bei Rare/Erstclear"-Option für Vielfahrer (spart den Pflicht-Klick pro Lauf).

## Bugs & Beobachtungen

1. **goblin_reaver ohne Monster-Art** (lila Platzhalter-Silhouette) — Welle 1 des meist-wiederholten
   Einstiegs-Dungeons (Shot f6c-03). Asset-Lücke an prominentester Farm-Stelle.
2. **Endgame-Fixture: Meisterweihe-Queue photobombt den Kampf.** Beim Fixture-Load poppen 7+
   rückwirkende Weihe-Zeremonien nacheinander MITTEN in laufende Dungeon-Wellen/Boss-Intros
   (Shots f6-02/03/06). Betrifft evtl. auch echte Alt-Saves nach der v59-Migration (rückwirkende
   Weihen bewusst ohne `seen`) — prüfenswert, ob die Queue Kampf-Momente respektieren sollte.
3. **Ultra-Chases sind unsichtbarer Content:** sevenfold_crown_chain (0,1 %, Clear-Tabelle) taucht vor
   dem Erstfund in keiner UI auf (Bestiarium listet nur `monster.loot`; Karte zeigt nichts). Faktisch
   nicht existenter Content für 99,9 % der Spielerschaft.
4. **Melee-Ward-Wand unerklärt:** reiner Melee ohne wardBreak stirbt an aether_wraith (Ward 1654 >
   eigene maxHp) deterministisch — by design (Trinität), aber in-game erklärt das nichts; mein
   99er-Voll-Godiron-Melee verlor 10/10 Läufe (Tod nach 2–6 min in Welle 2). Mindestens: Ward-Kapazität
   der Wellen-Monster im Bestiarium/auf der Karte ausweisen.
5. Kleinigkeiten: Paragonturm-Karte nutzt noch die Legacy-„Schlüssel gesucht"-Optik (inkonsistent zu
   den Quest-Gates der Story-Dungeons, aber by design); Fixture-RNG ist deterministisch → Run 1 droppt
   im Endgame-Fixture immer felstaff+fist (reines Test-Artefakt); „zu schwach — kein Kampf-XP"-Regel
   greift beim Overgeared-Farmen korrekt und lässt Beute unangetastet (gut für Farmer, sauber
   kommuniziert im Log).

## Positiv-Anker (nicht anfassen)

- Belohnungs-Schichtung pro Lauf (Wellen-Loot → Chest → Boss-Kill → Clear-Loot → Suffix-Roll →
  Erstclear ×2) ist dicht und liest sich großartig.
- 2-s-Wellen-Cooldown / 8-s-Boss-Atempause: exakt richtiger Puls.
- Ökonomie-Leiter der Dungeons monoton und spürbar (620 g → 12 000 g/Clear).
- Tod verliert nie bereits gebankten Wellen-/Chest-Loot — faires Risiko-Design.
