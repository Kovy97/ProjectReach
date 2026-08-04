# Fun-RETEST: Pets/Companions — „Fenn Flauschhand, der Begleiter-Sammler"

**Fun-RETEST R2 · 2026-07-16 · Vorgänger-Bericht: `pets-fenn.md` (Fun-Sweep F2)**

## 1. Steckbrief

Fenn spielt Spiele für die Pets. 200 Stunden für das letzte Vieh in der Galerie sind für ihn kein
Grind, sondern ein Versprechen — wenn die Jagd sich gut anfühlt. Beim ersten Besuch fand er ein
System mit exzellentem Fundament, das seine besten Momente verschluckte: Der zweite Drop einer
Session wurde nie gefeiert, Offline-Drops waren komplett stumm, Skilling-Pets unsichtbar.
Seine Retest-Frage: **Feiert das Spiel jetzt JEDEN seiner seltensten Momente — und fühlt sich die
Jagd dazwischen lebendiger an?**

Setup: 3 Sim-Sessions (Playwright headless, Port 5302), Fixture `midgame` (frischer Charakter,
0/21 Pets) plus ein echter Menü-Lade-Flow für den Offline-Fall. Drop-Chancen in-memory auf 100 %
gepatcht (kein Content angefasst), um vier echte Drop-Momente zu erleben: 1 Combat-Kill-Drop,
2 Skilling-Drops in DERSELBEN Session (der Alt-Kernbug!), 1 Offline-Catch-up-Drop über
„Load Game". 20 Screenshots (`ui-audit/shots/rt-fenn-*.png`), alle angesehen. Keine Page-Errors
in allen drei Sessions.

Referenz-Chancen (unverändert, ehrlich in der Galerie ausgewiesen): Skilling 1/60.000 pro
Aktions-Abschluss (= 0,0017 % pro Wurf), Farming 1/15.000 (0,0067 %), Runecrafting bis 1/80.000
(0,00125 %), Combat 1/75.000–1/105.000 pro Kill (0,0013–0,00095 %). Reines RNG, kein Pity.

## 2. Session-Protokoll

**Moment 1 — Die leere Galerie ist immer noch ein perfektes Want-Board** (`rt-fenn-01-gallery-fresh.png`,
`rt-fenn-02-locked-card.png`, `rt-fenn-03-picker-empty.png`). 21 dunkle „???"-Karten, jede nennt
Quelle und ehrliche Chance („Skilling: Woodcutting · Drop chance: 1 / 60,000"). Der Companion-Slot
oben zeigt „No Companion" mit leerem Picker („— None"). In zehn Sekunden weiß ich, was es zu holen
gibt. Das war schon beim ersten Besuch die Stärke des Systems — unverändert stark.

**Moment 2 — Der Combat-Drop ist jetzt ein KOMPLETTER Moment** (`rt-fenn-06-celebration-1-combat.png`,
`rt-fenn-07-celebration-1-equipped.png`). Chicken-Kill in den Pastures, und die Bühne zündet:
dunkler Backdrop, Strahlenkranz, „ULTRA RARE", Gorehound-Art groß, Lore-Text — und NEU: die beiden
Effekt-Zeilen direkt auf der Karte („Passive: Lifesteal +1.5%" / „Active: Maul · every 4.5s
(Bleed)") plus ein Equip-Button. Weil es mein erstes Pet ist, wird es automatisch ausgerüstet und
der Button zeigt korrekt ausgegraut „Equipped". Gleichzeitig rechts unten: „Achievement unlocked!
A Friend in the Ash (+5 AP)" — das Erste-Pet-Achievement, das ich beim letzten Mal schmerzlich
vermisst habe, existiert und feuert live in den Drop-Moment hinein. Im Kampf-Log steht „Companion
obtained!". Ich habe den seltensten Drop des Spiels bekommen und kann sofort etwas damit TUN und
weiß, was er kann. Genau so.

**Moment 3 — DER ALT-KERNBUG: Zweiter und dritter Drop derselben Session** (`rt-fenn-08-celebration-2-mining.png`,
`rt-fenn-08b-celebration-2-after-equip.png`, `rt-fenn-10-celebration-3-woodcutting.png`). Ich
erzwinge in einer einzigen, ununterbrochenen Session nacheinander Cragmaw (Mining) und Rotbark
(Woodcutting). Beim ersten Besuch landete Drop 2 kommentarlos im Besitz — der Super-GAU für einen
Sammler. Jetzt: **Beide feiern in voller Größe.** Cragmaws Overlay bietet „Equip Now" an (nicht
auto-ausgerüstet, korrekt — ich habe schon einen Begleiter), ein Klick und der Button springt auf
„Equipped", `companionPetId` wechselt live. State danach: `petDropSeq` zählt sauber monoton
1 → 2 → 3. Drei Drops, drei Feiern, null verschluckt. Der Kernbug ist tot.

**Moment 4 — Mein Mining-Pet ARBEITET jetzt sichtbar in der Mine** (`rt-fenn-09-mining-pet-sprite.png`).
Mit Cragmaw ausgerüstet erscheint oben links auf der Mining-Seite ein kleines gerahmtes
Cragmaw-Sprite, Tooltip „Cragmaw is helping here", und es pulsiert im Takt der Ertrags-Ticks (im
Sim-Lauf live eingefangen). Das Pet ist kein Tabelleneintrag mehr — es ist DA. Aber: Der Puls
feuert bei JEDEM abgeschlossenen Tick, nicht wenn das Passiv (Double drop +5 %) wirklich
prockt, und es gibt weiterhin keinen Text-Moment („Cragmaw spaltet die Ader — doppeltes Erz!").
Präsenz ja, Proc-Feedback nein.

**Moment 5 — Die Kampf-Bühne trägt** (`rt-fenn-17-combat-arena-pet.png`, `rt-fenn-18-combat-log-crop.png`).
Gorehound steht klein neben der Heldin (eigenes Sprite, Tooltip „Gorehound — ⚔ Maul · 4.5s"),
alle 4,5 s zündet Maul mit Ability-Glow, der Gegner bekommt ein „BLEED!"-Floating und das Log
schreibt die violette Zeile „Maul — Gorehound mauls the enemy — deep bleed inflicted!" gefolgt
von „Goblin Warlock is afflicted with Bleed!". Das Pet ist ein echter Darsteller. Zwei Flecken
auf der Bühne: die Pet-Zeile trägt weiterhin ZWEI Gedankenstriche (Alt-Befund, unverändert), und
mein Lifesteal-Passiv spammt nach fast jedem Treffer „Lifesteal heals you for 0." (1,5 % von
9 Schaden = 0) — dreimal allein im Log-Ausschnitt. Ein Passiv, das pausenlos verkündet, dass es
nichts tut, ist schlechter als eines, das schweigt.

**Moment 6 — Offline-Rückkehr: Der Drop ist nicht mehr stumm** (`rt-fenn-24-menu.png`,
`rt-fenn-25-load-panel.png`, `rt-fenn-26-offline-popup.png`, `rt-fenn-27-offline-pets-crop.png`,
`rt-fenn-28-after-popup.png`). Echter Flow: Hauptmenü → Load Game → Slot mit 3 h altem Save und
laufender Mining-Aktion. Das „While You Were Away"-Popup öffnet mit einer eigenen Sektion
**„COMPANIONS FOUND"** — GANZ OBEN, über XP und Items — mit goldumrandetem Cragmaw-Porträt und
Namen. Der Drop wurde im Catch-up gewürfelt (State: owned, auto-equipped als erstes Pet,
`petDropSeq` = 1, Erste-Pet-Achievement vergeben). Nach „Collect" feuert bewusst KEINE doppelte
Live-Celebration nach. Der alte Total-Ausfall ist repariert; die Offline-Bühne ist allerdings
die leisere der beiden — kein „ULTRA RARE", keine Effekt-Zeilen, kein Equip-Angebot, und das
offline verdiente Achievement (+5 AP) kommt komplett lautlos an.

**Moment 7 — Der Picker ist eine echte Entscheidungshilfe geworden** (`rt-fenn-21-picker-grouped.png`,
`rt-fenn-22-picker-scrolled.png`, `rt-fenn-20-gallery-many.png`, `rt-fenn-19-achievement-toasts.png`).
Mit 15 Pets: Der alte 280px-Kramladen (~5 sichtbare, unsortierte Einträge) ist ersetzt durch ein
volles Inline-Panel mit Gruppenköpfen — „Combat drops" zuerst, dann „Skilling: Woodcutting/Mining/
Fishing/…" in Skill-Reihenfolge — und JEDER Eintrag zeigt die komplette Effekt-Zusammenfassung
(„Passive: Double drop +5% · Active: Boulder Toss"). Beim Massen-Grant feuern die gestaffelten
Sammel-Achievements sichtbar („Animal Companion +10 AP", „Beast Friend +25 AP"). Die Leiter ist
jetzt 1/5/10/21 (+5/+10/+25/+100 AP) — der Einstieg beim ersten Pet fehlt nicht mehr. Was dem
Picker weiter fehlt: ein „passt zu deiner aktuellen Aktivität"-Anker.

**Moment 8 — Die Ehrlichkeits-Lücke ist zu** (`rt-fenn-23-witherling-card.png`). Witherling zeigt
„Gather yield +4.5% (Farming)", Glyphmaw „Bonus runes +4.5%" — die alte Aufrundung auf „+5%"
ist repariert. Bei einem System, das seine 1/60.000 offen ausweist, gehört genau diese Präzision
zum Charakter.

## 3. Bewertungsbogen — alt → neu → Delta

| Aspekt | Alt | Neu | Δ | Begründung |
|---|---|---|---|---|
| Spaß sofort (erste 5 Minuten) | 6 | 8 | +2 | Want-Board unverändert stark, und das erste Pet zündet jetzt dreifach: volle Celebration mit Effekt-Zeilen, Auto-Equip, „A Friend in the Ash"-Achievement. |
| Spaß über Zeit (Stunden/Tage) | 7 | 8 | +1 | Sichtbares Pet auf der Skill-Seite, gruppierter Picker und die 1/5/10/21-Leiter halten die Sammlung präsent; zwischen den Treffern bleibt die Jagd aber weiter ereignislos. |
| Sucht-Faktor („eine Runde noch") | 7 | 8 | +1 | Jeder Timer ist weiter ein Losbündel, und jetzt VERTRAUE ich dem Spiel, dass es jeden Treffer auch zeigt — Vertrauen ist bei 0,0017 %-Würfen die halbe Sucht. |
| Belohnungs-Dichte & Dopamin | 5 | 7 | +2 | Kein Moment geht mehr verloren (2./3. Drop, offline), Overlay ist komplett — aber zwischen den Ultra-Rares gibt es weiterhin keinerlei kleine Pet-Momente (Procs unsichtbar, kein Zähler). |
| Ziel-Klarheit | 9 | 9 | ±0 | War schon vorbildlich: jede Karte nennt Quelle + ehrliche Chance; die Gruppierung im Picker macht die Sammlung noch lesbarer. |
| Tiefe & Entscheidungen | 6 | 7 | +1 | Die Ein-Slot-Entscheidung ist dieselbe, aber der Picker legt jetzt alle Trade-offs nebeneinander; was fehlt, ist der „für JETZT passt X"-Hinweis. |
| Frustfreiheit | 5 | 8 | +3 | Die beiden Sammler-Todsünden (verschluckter Jackpot, stummer Offline-Drop) sind weg; Restfrust: „heals you for 0."-Spam und stumme Offline-Achievements. |
| Verzahnung mit dem Rest | 9 | 9 | ±0 | Weiter exzellent: jede Aktivität füttert die Jagd, jedes Pet wirkt in Skill UND Kampf zurück — jetzt auch sichtbar auf beiden Bühnen. |

**GESAMT-SUCHT-URTEIL: 7/10 → 8,5/10.** Das System hat seine Momente-Verluste repariert — und
Momente SIND dieses System. Was zwischen 8,5 und 10 liegt, ist die stille Zeit zwischen den
Treffern: kein Fortschrittsgefühl, keine kleinen Proc-Feiern, offline die leisere Bühne.

**Komme ich morgen wieder?** „Ja — und diesmal ohne Angst, dass mir das Spiel einen Jackpot
unterschlägt. Ich lasse über Nacht die Mine laufen, und wenn morgen früh ganz oben im
Willkommens-Popup ein goldener Ring mit einem neuen Vieh drin leuchtet, ist das genau der
Morgen, für den ich Idle-Games spiele. Jetzt gebt mir noch einen Zähler, der mir sagt, wie
viele Lose ich seit dem letzten Fund gezogen habe, und ihr werdet mich nie wieder los."

## 4. Top-3-Verifikation (meine alten Empfehlungen)

1. **„Kein Drop darf je stumm sein" (Seq-Bugfix + Offline-Bühne)** — **GUT umgesetzt, erlebbar.**
   (a) Seq-Fix: live verifiziert mit 3 Drops in einer Session, alle gefeiert; der State führt
   jetzt einen monotonen Lebenszeit-Zähler (`petDropSeq` 1→2→3 beobachtet), genau die von mir
   vorgeschlagene Lösung. (b) Offline: „Companions Found"-Sektion GANZ OBEN im
   While-You-Were-Away-Popup, mit Porträt. Mein Unterwunsch „Celebration nach dem Popup
   nachfeuern" wurde bewusst NICHT gebaut (Popup-Sektion statt Doppel-Feier) — vertretbar,
   aber die Offline-Bühne bleibt dadurch eine Stufe leiser als der Live-Moment.
2. **„Skilling-Pets sichtbar machen"** — **HALBHERZIG.** Das Sprite auf der Skill-Seite existiert
   (nur wenn das Passiv zu DIESER Aktivität gehört — richtige Logik), mit Tooltip und Puls.
   Aber der Puls ist ein generischer „ich bin da"-Herzschlag bei jedem Ertrags-Tick, kein
   Proc-Moment: Wenn Double-Drop wirklich zuschlägt, passiert exakt nichts Besonderes — kein
   Log, kein Floating-Text, kein Sprite-Hüpfer. Die Kampf-Seite hat für jedes Pet liebevolle
   Flavor-Zeilen; die 14 Skilling-Pets verdienen dieselbe Liebe für ihren Kernjob.
3. **„Drop-Moment zu Ende bauen + Picker zur Entscheidung machen"** — **GUT umgesetzt.**
   Celebration: Effekt-Zeilen + Equip-Button (Button-Zustand live verifiziert: „Equip Now" →
   „Equipped"; beim Erst-Pet korrekt „Equipped" disabled). „Erstes Pet"-Achievement existiert
   („A Friend in the Ash", +5 AP) und feuert in den Moment hinein. Picker: nach Quelle
   gruppiert (Combat zuerst, dann je Skill), Effekt-Summary pro Eintrag, 4,5 %-Anzeige ehrlich.
   Offen blieben nur die Kür-Teile: „passt zu deiner Aktivität"-Gruppe zuoberst und der
   „Aktionen seit letztem Pet"-Zähler (→ neue Top-3).

## 5. Bug-Verifikation (meine alten Befunde)

- **Verschluckter Zweit-Drop einer Session** — **WEG, live widerlegt.** Drei erzwungene Drops
  in einer ununterbrochenen Session (Combat → Mining → Woodcutting): jede Feier kam,
  `petDropSeq` monoton, kein unkonsumierter Breadcrumb. Der alte Repro (Drop 2 landet stumm im
  Besitz) ist nicht mehr reproduzierbar.
- **Offline-Drop komplett stumm** — **WEG, im echten Menü-Lade-Flow verifiziert.** 3 h-Save mit
  laufender Mining-Aktion geladen: Catch-up würfelt den Drop, `OfflineSummary` führt ihn, das
  Popup zeigt „Companions Found" prominent, Pet ist besessen + (als Erst-Pet) ausgerüstet,
  Achievement vergeben. Keine doppelte Live-Feier danach (by design).
- **„+5%"-Aufrundung bei 4,5 %-Passiven** — **WEG.** Witherling und Glyphmaw zeigen „+4.5%"
  (Galerie-Karte live geprüft).
- **Picker-Panel 280px / ~5 Einträge / unsortiert** — **WEG.** Neues gruppiertes Inline-Panel,
  alle Einträge mit Effekt-Summary; bei 15 Pets scrollt die Seite statt einer Briefmarken-Liste.
- **Achievement-Leiter startet erst bei 5** — **WEG.** `ach_pets_1` „A Friend in the Ash"
  (+5 AP) existiert, Rarity sauber unter der 5er-Stufe einsortiert, feuert live und offline.
- **Pet-Ability-Logzeile mit zwei Gedankenstrichen** — **NOCH DA.** „Maul — Gorehound mauls the
  enemy — deep bleed inflicted!" (Screenshot `rt-fenn-18-combat-log-crop.png`). Die Flavor-Texte
  selbst tragen je einen Dash; der Kombinierer (`combat.petLog.noAmount`: „{pet} — {ability}!")
  setzt den zweiten davor. Verstößt weiter gegen die ≤1-Dash-Regel für spielersichtbare Texte.
- **„1 impact damage"-Komik bei Low-HP-Gegnern** — nicht erneut beobachtet (Bleed-Pfad zeigt
  saubere Zahlen); dafür ist eine neue Null-Komik aufgetaucht, siehe unten.

## 6. Neue Funde

- **POLISH (nervt real): „Lifesteal heals you for 0."-Spam im Kampf-Log.** Mit Gorehound
  (Lifesteal +1,5 %) erzeugt fast jeder eigene Treffer unter ~34 Schaden eine Null-Heil-Zeile —
  im 15-s-Testfenster drei Stück sichtbar (`rt-fenn-18-combat-log-crop.png`). Ein Passiv, das
  permanent „ich tue nichts" ins Log ruft, entwertet den Begleiter-Auftritt. Null-Beträge
  unterdrücken oder kumulieren.
- **POLISH: Pet-Ability-Zeile trägt 2 Gedankenstriche** (Alt-Befund, unverändert — s. o.).
  Vorschlag unverändert: „Maul: Gorehound mauls the enemy — deep bleed inflicted!"
- **POLISH: Offline verdiente Achievements sind lautlos.** Der Offline-Drop vergibt „A Friend in
  the Ash" (+5 AP) während des Catch-ups — kein Toast nach dem Load, keine Zeile im
  While-You-Were-Away-Popup. Wer die Achievements-Seite nicht öffnet, erfährt nie davon.
- **POLISH: Skill-Sprite pulsiert generisch statt bei echten Procs** (s. Top-2-Verdict) — die
  Chance, aus einem 5-%-Proc (~alle 20 Aktionen ≈ 1×/Minute) einen kleinen Dopamin-Takt zu
  machen, liegt brach.
- **Beobachtung (Alt-Punkt, unverändert):** Außerhalb der Galerie wirbt weiterhin nichts für
  die Jagd — Skill-Seiten, Zonen- und Monsterkarten erwähnen die dort erhältlichen Pets nicht.
- **Kein ASSET-Loch:** alle im Test gesehenen Pets (Rotbark, Cragmaw, Gillrot, Witherling,
  Gorehound + Galerie-Vollansicht mit 15 Besessenen) haben eigenes Artwork; Celebration,
  Galerie, Picker, Offline-Popup und Arena binden es überall ein. Keine Page-Errors in drei
  Sessions.

## 7. Meine NEUEN Top-3 für mehr Sucht-Faktor

1. **Jagd-Fortschritt sichtbar machen („Lose seit letztem Fund").** Ein Zähler in der Galerie
   (global oder je Quelle): „12.480 Aktionen seit deinem letzten Begleiter". Bei 0,0017 % pro
   Wurf ist das psychologische Gold: Es verwandelt 46 Durchschnittsstunden Stille in messbaren
   Einsatz — und kostet keinerlei Balance, weil es reines Anzeigen ist. Genau das hält die
   Jagd zwischen den Treffern warm; heute existiert dort NICHTS.
2. **Echte Proc-Momente für die 14 Skilling-Pets.** Wenn das Passiv wirklich zuschlägt
   (Double drop, Instant action, Refund …): kurzer Sprite-Hüpfer + Floating-Text/Logzeile im
   Flavor-Ton der Kampf-Seite („Cragmaw spaltet die Ader — doppeltes Erz!"). Bei ~5 % Proc-Chance
   ist das etwa ein Mini-Jackpot pro Minute — die perfekte Dopamin-Frequenz zwischen den
   Ultra-Rares, und die Flavor-Schreibe existiert für jedes Pet bereits.
3. **Den Pet-Auftritt im Log adeln: Null-Zeilen weg, ein Dash statt zwei.** „Lifesteal heals
   you for 0." unterdrücken (erst ab ≥1 anzeigen oder pro Kampf kumulieren) und die
   Ability-Zeile auf einen Gedankenstrich kürzen. Klingt klein, ist aber das, was man in JEDEM
   Kampf liest — die Bühne, auf der 7 der 21 Pets täglich auftreten, verdient saubere Dialoge.
