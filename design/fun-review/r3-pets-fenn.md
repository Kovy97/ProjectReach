# Fun-Sweep RUNDE 3: Pets/Companions — „Fenn Flauschhand, der Begleiter-Sammler"

**Fun-Sweep R3 · 2026-07-16 · Dritter Besuch · Vorgänger: `pets-fenn.md` (R1), `retest-pets-fenn.md` (R2)**

## 1. Steckbrief — die Reise R1 → R2 → jetzt

Fenn spielt Spiele für die Pets. 200 Stunden für das letzte Vieh in der Galerie sind für ihn kein
Grind, sondern ein Versprechen — wenn die Jagd sich gut anfühlt.

- **R1 (7/10):** Exzellentes Fundament (ehrliche Odds, echte Pet-Identität), aber das System
  verschluckte seine besten Momente: Zweit-Drop stumm, Offline-Drop komplett stumm,
  Skilling-Pets unsichtbar.
- **R2 (8,5/10):** Die Sammler-Todsünden waren repariert — jeder Drop feiert, offline inklusive,
  Erste-Pet-Achievement, Effekt-Zeilen + Equip im Overlay, gruppierter Picker, sichtbares
  Skill-Sprite. Restpunkte: „Lifesteal heals you for 0."-Spam, 2-Dash-Logzeile, lautlose
  Offline-Achievements, keine Jagd-Zähler, keine Proc-Momente.
- **R3-Frage:** Sind die drei R2-Funde weg, und hat die Jagd ZWISCHEN den Treffern endlich
  einen Puls?

## 2. Session-Protokoll

Setup: 2 Sim-Sessions (Playwright headless, Port 5310, `sim-harness.mjs`), Fixture `midgame`
(frischer Charakter, 0/21 Pets), Drop-Chancen ausschließlich in-memory auf 100 % gepatcht (kein
Content angefasst). 20 Screenshots (`ui-audit/shots/rt3-fenn-*.png`), alle angesehen. **0
Page-Errors in beiden Sessions.** Harness via `withHarness` immer gestoppt, Skripte nach dem Lauf
gelöscht.

**Session A — Drei-Drop-Session, Kampf-Log, Skilling-Proc-Test** (`rt3-fenn-01…13`):

- *Want-Board unverändert stark* (`01`, `02`): 21 dunkle „???"-Karten, jede mit Quelle + ehrlicher
  Chance („Skilling: Woodcutting · Drop chance: 1 / 60,000"). Kein Jagd-Zähler, nirgends.
- *Drop 1, Combat (Gorehound)* (`03`): Chicken-Kill in den Pastures → volle Bühne: ULTRA RARE,
  Strahlenkranz, Artwork, Lore, PASSIVE/ACTIVE-Chips, „EQUIPPED" (Erst-Pet auto-ausgerüstet,
  Button korrekt disabled), „WONDERFUL!" — und zeitgleich der Achievement-Toast „A Friend in the
  Ash (+5 AP)". Der Moment trägt, dreifach, wie in R2.
- *Kampf-Log, 22 s beobachtet* (`04`, `05`): Gorehound-Sprite in der Arena, und die Ability-Zeile
  heißt jetzt **„Maul: Gorehound mauls the enemy — deep bleed inflicted!"** — Label mit
  Doppelpunkt, EIN Gedankenstrich. Aber im selben Log-Ausschnitt steht DREIMAL
  **„Lifesteal heals you for 0."** — die Zeile liest sich exakt wie in R2 (Details in §4).
- *Drop 2 + 3 in DERSELBEN Session* (`06`–`10`): Cragmaw (Mining) und Rotbark (Woodcutting)
  nacheinander erzwungen — beide feiern in voller Größe, „Equip Now" → „Equipped" live,
  `companionPetId` wechselt, `petDropSeq` zählt monoton 1 → 2 → 3. Der R1-Kernbug bleibt tot;
  die Chance, dass mir das Spiel einen Jackpot unterschlägt, liegt erlebbar bei **0 %**.
- *Skilling-Proc-Test* (`08`, `09`): Cragmaw-Sprite auf der Mining-Seite (Tooltip „Cragmaw is
  helping here"), pulsiert im Ertrags-Takt. Dann das Double-Drop-Passiv in-memory auf **100 %**
  gestellt und 16 s zugesehen: Das Erz verdoppelt sich nachweislich (Copper 2× → 9×), aber auf
  dem Bildschirm passiert **exakt nichts** — kein Floating-Text, keine Logzeile, kein
  Sprite-Hüpfer, der Puls bleibt der generische Jeder-Tick-Herzschlag. Bei 100 % Proc-Rate
  null sichtbare Proc-Momente → das Feature existiert nicht.
- *Galerie & Picker mit Besitz* (`11`, `13`): Zähler „3 / 21 companions"; Besitz-Karten zeigen
  Artwork, Lore, Effekt-Chips — und **neu für mich: direkte EQUIP/UNEQUIP-Buttons auf den
  Galerie-Karten**. Picker gruppiert (Combat zuerst, dann je Skill) mit Effekt-Summary je Zeile.
  Aktive Aktion war Woodcutting — die Woodcutting-Gruppe bleibt trotzdem hinter „Combat drops":
  kein „passt zu deiner Aktivität"-Anker.

**Session B — Offline-Drop über echten Lade-Flow + Massen-Besitz** (`rt3-fenn-14…21`):

- *Echter Flow*: Fixture-Spiel → Sidebar „Main Menu" → Load Game → Slot mit 3 h altem Save
  (laufende Mining-Aktion) → LOAD (`14`, `15`).
- *Offline-Popup* (`16`, `17`): „While You Were Away · Away for 3h 0m" mit der Sektion
  **„COMPANIONS FOUND" ganz oben** — goldumrandetes Cragmaw-Porträt + Name, VOR Total-XP und
  Items. Daneben **neu: ein „Achievements"-Medaillon mit Zähler** (hier „57", Fixture-Artefakt —
  der frische Testcharakter holt beim Catch-up seinen ganzen Achievement-Rückstand nach; die
  Mechanik zählt korrekt). Der Drop selbst: owned, als Erst-Pet auto-equipped, `petDropSeq` 1,
  „A Friend in the Ash" vergeben.
- *Nach „Collect"* (`18`): bewusst keine Doppel-Celebration, kein Toast. Die offline verdienten
  Achievements haben jetzt eine ZAHL im Popup, aber weiterhin keinen NAMEN — wer nicht auf die
  Achievements-Seite geht, erfährt nie, DASS es „A Friend in the Ash" war.
- *Massen-Besitz (15/21)* (`19`–`21`): Witherling-Karte zeigt ehrlich **„Gather yield +4.5%
  (Farming)"** (R2-Fix stabil). Beim Massen-Grant feuern die Staffel-Toasts live („Animal
  Companion +10 AP", „Beast Friend +25 AP"). Picker mit 15 Pets: sauber gruppiert über alle
  Skills — aktive Aktion Mining, Mining-Gruppe trotzdem an Position 3. Kein Aktivitäts-Anker.

## 3. Bewertungsbogen — R1 | R2 | R3 | Δ(R2→R3)

| Aspekt | R1 | R2 | R3 | Δ | Begründung |
|---|---|---|---|---|---|
| Spaß sofort (erste 5 Minuten) | 6 | 8 | 8 | ±0 | Want-Board + dreifach zündender Erst-Drop unverändert stark; die neuen Galerie-Equip-Buttons sind ein kleines Plus, ändern die ersten 5 Minuten aber nicht. |
| Spaß über Zeit (Stunden/Tage) | 7 | 8 | 8 | ±0 | Sammlung bleibt präsent (Sprite, Picker, Leiter 1/5/10/21) — aber zwischen den Treffern ist die Jagd weiter ereignislos: kein Zähler, keine Procs. |
| Sucht-Faktor („eine Runde noch") | 7 | 8 | 8 | ±0 | Das Vertrauen hält: 3 Drops = 3 Feiern, Offline-Fund prominent. Was fehlt, ist der Zwischen-Puls, der aus 46 Durchschnittsstunden Stille messbaren Einsatz macht. |
| Belohnungs-Dichte & Dopamin | 5 | 7 | 7 | ±0 | Kein Moment geht verloren — und kein neuer Moment ist dazugekommen. Der ~1 Mini-Jackpot pro Minute (5 %-Proc) liegt weiter brach, live mit 100 %-Proc verifiziert: null sichtbares Feedback. |
| Ziel-Klarheit | 9 | 9 | 9 | ±0 | Vorbildlich seit R1: Quelle + ehrliche Chance auf jeder Karte, jetzt auch 4,5 % präzise. |
| Tiefe & Entscheidungen | 6 | 7 | 7 | ±0 | Trade-offs liegen im Picker nebeneinander; Galerie-Equip verkürzt den Weg. Der „für JETZT passt X"-Hinweis fehlt weiter (Mining aktiv, Mining-Gruppe an Position 3). |
| Frustfreiheit | 5 | 8 | 8 | ±0 | Die 2-Dash-Zeile ist weg (echter Fix). Dafür liest sich „Lifesteal heals you for 0." UNVERÄNDERT — 3× pro Log-Screen, bei jedem Treffer mit fehlender HP. Netto null. |
| Verzahnung mit dem Rest | 9 | 9 | 9 | ±0 | Weiter exzellent; Offline-Popup, Kampf-Arena, Skill-Seite, Galerie, Achievements — überall angebunden. |

**GESAMT-SUCHT-URTEIL: R1 7/10 → R2 8,5/10 → R3 8,5/10.** Der Drei-Runden-Trend sagt: Der große
Sprung kam in R2 (Momente-Verluste repariert — und die Reparatur ist STABIL, das ist die gute
Nachricht dieser Runde: nichts davon ist zurückgefallen). R3 hat am erlebbaren Pet-Gefühl fast
nichts verändert — die eine echte Verbesserung ist die saubere Ability-Zeile plus das
Achievement-Medaillon im Offline-Popup. Meine drei R2-Wünsche (Zähler, Procs, Null-Zeilen) sind
alle drei offen; womöglich bewusst zurückgestellt, aber vom Spiel aus gesehen: offen.

**Komme ich morgen wieder?** „Ja — zu 90 %. Das Spiel hat mein Vertrauen nicht wieder verspielt:
drei Jackpots, drei Feiern, und der Offline-Fund leuchtet ganz oben im Willkommens-Popup. Aber
ich sage es zum dritten Mal, und diesmal wörtlich: Gebt mir einen Zähler, der mir sagt, wie viele
Lose ich seit dem letzten Fund gezogen habe. Solange der fehlt, ist jede Nacht in der Mine
Glaube statt Fortschritt — und Glaube trägt keine 46 Stunden."

## 4. Runde-2-Funde-Verifikation

1. **„Lifesteal heals you for 0."-Spam** — **NICHT erlebbar behoben.** Live (22-s-Fenster, HP
   angesenkt): dieselbe Zeile, 3× im sichtbaren Log-Ausschnitt (`rt3-fenn-05-combat-log.png`),
   bei kleinen Treffern faktisch 100 % der Treffer mit fehlender HP. Unter der Haube hat sich
   etwas getan: Die Engine heilt jetzt mindestens 0,1 HP und loggt nur bei Heilung > 0
   (`combat.ts` ~1554: `Math.max(0.1, …)`, `if (heal > 0)`) — aber die Anzeige formatiert mit
   `formatStat` (`maximumFractionDigits: 0`, format.ts:32), und 0,1 wird zu **„0"** gerundet.
   Ergebnis: Die Zeile lügt jetzt in die GEGENRICHTUNG (sie heilt real, sagt aber „0"). Für den
   Spieler ist R2-Stand und R3-Stand identisch. Halbfix, der die letzte Meile nicht geht.
2. **Pet-Logzeile mit 2 Gedankenstrichen** — **BEHOBEN, live erlebt.** „Maul: Gorehound mauls
   the enemy — deep bleed inflicted!" — Ability-Label jetzt mit Doppelpunkt davor
   (`combat.petLog.abilityLabel` „{label}: {text}"), ein Dash im Text, konform zur
   ≤1-Dash-Regel. Alle beobachteten Pet-Zeilen: genau 1 Gedankenstrich.
3. **Lautlose Offline-Achievements** — **TEIL-BEHOBEN.** Das While-You-Were-Away-Popup hat jetzt
   ein eigenes Achievements-Medaillon mit Anzahl (live gesehen, neben Total-XP). Was fehlt:
   Namen. Das offline verdiente „A Friend in the Ash (+5 AP)" bleibt anonym — kein Toast nach
   dem Collect, keine Namensliste im Popup. Eine Zahl ist besser als Schweigen, aber ein
   Sammler will wissen, WAS er geschafft hat.

## 5. Runde-2-Top-3-Check (erlebbar passiert?)

1. **„Lose seit letztem Fund"-Zähler** — **NICHT passiert.** Galerie in beiden Sessions geprüft
   (frisch, 3/21, 15/21): kein Zähler, keine Statistik, kein „Aktionen seit …" — zwischen den
   Treffern existiert weiterhin NICHTS. Aus meiner Sicht der größte offene Hebel, und als reines
   Anzeige-Feature auch ohne Balance-Risiko.
2. **Echte Proc-Momente für Skilling-Pets** — **NICHT passiert, hart verifiziert.** Double-Drop
   in-memory auf 100 % → 16 s Mining → Erz verdoppelt sich messbar, Bildschirm bleibt stumm
   (kein Text, kein Log, kein Sprite-Event; Puls weiter generisch pro Tick). Ehrliche
   Einordnung: Das ist Feature-Arbeit, kein Bugfix — gut möglich, dass es bewusst im
   Balance-/Feature-Block liegt. Erlebbar ist es nicht.
3. **Log-Hygiene (Null-Zeilen weg, ein Dash statt zwei)** — **HALB passiert.** Dash-Hälfte:
   sauber umgesetzt (s. §4.2). Null-Zeilen-Hälfte: der Engine-Unterbau wurde angefasst, aber die
   sichtbare Zeile ist unverändert „for 0." (s. §4.1).

## 6. Neue Funde (R3)

- **POLISH/ANZEIGE-BUG (nervt real): Der 0,1-Heil wird als „0" angezeigt.** Engine-Minimum 0,1
  HP trifft auf `formatStat` mit 0 Nachkommastellen → „Lifesteal heals you for 0." bei jedem
  kleinen Treffer. Fix ist eine Zeile: `formatDamage` (1 Nachkommastelle, existiert bereits)
  statt `formatStat` in CombatPage.tsx:339 — oder Zeilen < 1 kumulieren/unterdrücken.
- **PLUS: Galerie-Karten haben direkte EQUIP/UNEQUIP-Buttons** (mir neu in R3; R2 hatte den
  Equip-Weg nur in Overlay + Picker). Der Weg vom Ansehen zum Ausrüsten ist jetzt ein Klick —
  gute Sammler-Ergonomie.
- **PLUS: Achievements-Medaillon im Offline-Popup** (s. §4.3) — zählt auch die Pet-Achievements.
- **Beobachtung (alt, unverändert):** Außerhalb der Galerie wirbt weiter nichts für die Jagd —
  Skill-Seiten, Zonen- und Monsterkarten erwähnen die dort erhältlichen Pets mit keinem Wort.
- **Beobachtung (alt, unverändert):** Picker ohne Aktivitäts-Anker; Offline-Pet-Bühne bleibt die
  leisere (Porträt + Name, kein ULTRA RARE, keine Effekt-Zeilen, kein Equip-Angebot) — als
  bewusste Design-Entscheidung akzeptiert, notiert der Vollständigkeit halber.
- **Kein ASSET-/Stabilitäts-Fund:** alle gesehenen Pets (Gorehound, Cragmaw, Rotbark, Gillrot,
  Witherling + 15er-Galerie) mit eigenem Artwork in Celebration, Galerie, Picker, Offline-Popup
  und Arena; 0 Page-Errors in beiden Sessions.

## 7. Meine Top-3 für Runde 4

1. **Die Null-Zeile ENDGÜLTIG erledigen (kleinster Fix, größter Ärger-Abbau).** Eine Zeile
   Anzeige-Code: Lifesteal-Betrag mit einer Nachkommastelle rendern („heals you for 0.1") ODER
   Beträge < 1 pro Kampf kumulieren und gesammelt loggen. Das ist die Bühne, auf der mein
   Combat-Pet in JEDEM Kampf steht — seit zwei Runden steht dort „0".
2. **„Lose seit letztem Fund"-Zähler in der Galerie** (Wiederholung R2-Top-1, unverändert
   dringend). „12.480 Aktionen seit deinem letzten Begleiter" verwandelt bei 0,0017 % pro Wurf
   Stille in messbaren Einsatz. Reine Anzeige, null Balance-Risiko — und der Unterschied
   zwischen „ich glaube, ich komme voran" und „ich SEHE meinen Einsatz".
3. **Proc-Momente für die 14 Skilling-Pets** (Wiederholung R2-Top-2). Wenn Double-Drop/Instant/
   Refund wirklich zuschlägt: Sprite-Hüpfer + Floating-Text im Flavor-Ton der Kampf-Seite. Bei
   ~5 % Proc ≈ 1 Mini-Jackpot pro Minute — die perfekte Dopamin-Frequenz zwischen den
   Ultra-Rares. Als Kür obendrauf: der „passt zu deiner Aktivität"-Anker im Picker.
