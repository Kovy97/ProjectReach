# Fun-Review: Pets/Companions — „Fenn Flauschhand, der Begleiter-Sammler"

**FUN-SWEEP des CEO-Loops 2026-07-14 · Tester F2 · 2026-07-16**

## Persona-Steckbrief

Fenn spielt Spiele für die Pets. 200 Stunden für das letzte Vieh in der Galerie sind für ihn
kein Grind, sondern ein Versprechen — wenn die Jagd sich gut anfühlt. Er bewertet: das
Herzrasen beim 1/80.000-Drop, ob jedes Pet sich ANDERS anfühlt, ob der Sammel-Sog trägt und
ob Pets im Kampf sichtbar etwas TUN. Seine Kernfrage an Grim Reach: **Feiert das Spiel den
seltensten Moment, den es hat, groß genug?**

## Session-Stats

- 2 Sim-Sessions (Playwright headless, Port 5291), Fixture `midgame`, dazu `__hfDebug`-
  Zeitraffer (Galerie 0 → 4 → 21 Pets) und ein echter Drop-Moment über den Kill-Pfad
  (Drop-Chance in-memory auf 1 gesetzt, kein Content angefasst).
- 10 Screenshots; erlebt: leere Galerie, Teilbestand, Companion-Picker (4 und 21 Pets),
  Pet-Sprite in der Kampf-Arena, Boulder-Toss-Ability live, Combat-Pet-Drop mit Feier-Overlay,
  Skilling-Pet-Drop (Woodcutting), Voll-Galerie mit Beastmaster-Achievement. Keine Page-Errors.
- Systemumfang: 21 Pets (14 Skilling-Quellen, 7 Combat), jedes mit eigenem Passiv (im
  Herkunfts-Skill bzw. global) UND eigener benannter Kampf-Aktion aus 16 Ability-Arten
  (Stun/Burn/Bleed/Heal/Schild/Mana/Crit/Multi-Hit/Armor-Rend/Loot-Klau …). Drop-Raten:
  Skilling 1/60.000 je Aktions-Abschluss (Farming 1/15.000 je Ernte, Runecrafting 2×1/80.000),
  Combat 1/75.000 bis 1/105.000 je Kill. Reines RNG, kein Pity — als Chase-Design gewollt.

## Erlebte Momente

**1. Die leere Galerie ist ein perfektes Want-Board.** Als frischer Charakter öffne ich
„Companions" und sehe 21 dunkle Karten mit „???" — aber JEDE nennt schon ihre Quelle
(„Skilling: Woodcutting", „Combat") und ihre ehrliche Drop-Chance („1 / 60.000"). Als Sammler
weiß ich in zehn Sekunden, was es zu holen gibt, wo, und wie selten. Diese Transparenz ist
besser als Melvor (das seine Pet-Odds versteckt) und macht aus jedem laufenden Skill-Timer
ein Losbündel. Die Jagd ist kommuniziert — aber nur HIER: Skill-Seiten, Zonen- und
Monsterkarten erwähnen mit keinem Wort, dass dort ein Pet wartet.

**2. Der Drop-Moment ist die beste Bühne des Spiels.** Chicken-Kill, und plötzlich: dunkler
Backdrop, goldener Strahlenkranz, Partikel, „ULTRA RARE", das Artwork des Gorehound in groß,
Lore-Text, „An exceptionally rare companion has chosen you.", dazu Achievement-Toast und eine
Zeile im Kampf-Log. Ich hatte echtes Jackpot-Gefühl — die Feier trägt den Seltenheitsgrad.
Zwei Dinge fehlen dem Moment trotzdem: Die Karte sagt mir NICHT, was das Pet kann (Passiv +
Ability stehen nur in der Galerie), und es gibt keinen „Jetzt ausrüsten"-Knopf. Ich habe den
seltensten Drop des Spiels bekommen und das Overlay lässt mich damit … nichts tun.

**3. BUG, live bestätigt: Der zweite Drop einer Session wird verschluckt.** Ich habe in einer
Session nacheinander zwei garantierte Drops erzeugt: Rotbark (Woodcutting) wurde groß gefeiert.
Cragmaw (Mining, Minuten später) landete kommentarlos im Besitz — kein Overlay, kein Toast,
nichts. Ursache (Code): `PetCelebration.tsx` nullt `state.lastPetDrop` nach der Anzeige,
`tryPetDrop` (engine/pets.ts:328) zählt `seq` dann wieder ab 1 hoch, während die
`seenSeq`-Hochwassermarke der Komponente stehen bleibt — der neue Drop gilt als „schon
gesehen". Für einen Sammler ist das der Super-GAU: Das Spiel HAT meinen 1/60.000-Moment und
schweigt. Gleiche Wurzel: Ein Pet, das im Offline-Catch-up droppt, wird NIE gefeiert
(`seenSeq` initialisiert sich beim Mount auf den bereits gesetzten Seq-Wert), und die
Offline-Zusammenfassung hat kein Pet-Feld — der Drop ist komplett stumm.

**4. Im Kampf sind Pets echte Darsteller — beim Skilling Geister.** In der Arena steht mein
Cragmaw klein neben der Heldenfigur (eigenes Artwork, Bodenschatten, Tooltip „Boulder Toss ·
4.0s"), springt alle 4 Sekunden zum Gegner (Lunge-Animation), pulst farbig nach
Ability-Familie (rot/grün/blau/violett) und schreibt eine eigene Flavor-Zeile ins Log
(„Cragmaw hurls a boulder — 1 impact damage!"). Jedes der 21 Pets hat eine EIGENE benannte
Aktion mit eigenem Log-Text — das ist Identität, kein Stat-Sticker. Aber: Beim Skilling, wo
14 der 21 Pets herkommen und wirken, existiert das Pet visuell NICHT. Kein Sprite auf der
Skill-Seite, kein Proc-Feedback („Cragmaw spaltet die Ader — doppeltes Erz!") — das
Doppelertrag-Passiv verschwindet unsichtbar in der Loot-Mathematik. Mein Mining-Pet ist
in der Mine ein Tabelleneintrag.

**5. Die Wechsel-Entscheidung ist echt, der Picker hilft ihr nicht.** Vor dem Mining Cragmaw
(Doppelerz), vor dem Boss Carapace (Schadensreduktion + Block) oder Carrionwing (doppelter
Loot)? Das ist eine echte Entscheidung mit Trade-offs, genau richtig für ein Ein-Slot-System.
Aber der Picker ist eine ungeordnete 22-Zeilen-Liste in einem 280px-Fenster (~5 sichtbar),
Reihenfolge = Content-Reihenfolge, keine Gruppierung nach Skill/Combat, keine Sortierung,
kein Hinweis, welches Pet zur aktuellen Aktivität passt. Bei 21 Pets scrolle ich jedes Mal
suchend durch Namen, die ich als Neuling noch keinem Nutzen zuordnen kann.

**6. Zeitraffer-Realität: Zwischen den Momenten ist die Jagd stumm.** 1/60.000 bei ~2,8s
je Baum sind im Schnitt ~46h Holzfällen pro Skilling-Pet; Combat-Pets liegen bei ~170–440h
Kampfzeit. Für ein Idle-Game mit Offline-Progression ist das als Chase okay (die Balance-
Kommentare zielen bewusst auf „die meisten kriegen es bis 99"). Aber zwischen 0 und dem
Treffer gibt es NICHTS: keinen „Kills seit letztem Pet"-Zähler, keine Statistik, kein
Näherkommen. Die Achievement-Leiter (5/10/21 Pets: +10/+25/+100 AP) ist gut, startet aber
erst bei 5 — ausgerechnet das erste Pet, der wichtigste Hook, hat kein Achievement.

## Bewertungsbogen — Pets/Companions (Fenn Flauschhand, der Begleiter-Sammler)
- Spaß sofort (erste 5 Minuten): 6/10
- Spaß über Zeit (Stunden/Tage, simuliert): 7/10
- Sucht-Faktor („eine Runde noch"): 7/10
- Belohnungs-Dichte & Dopamin-Momente: 5/10
- Ziel-Klarheit (warum mache ich weiter?): 9/10
- Tiefe & Entscheidungen (denken statt klicken?): 6/10
- Frustfreiheit (10 = kein Frust): 5/10
- Verzahnung mit dem Rest des Spiels: 9/10
- GESAMT-SUCHT-URTEIL: 7/10
- Komme ich morgen wieder? Ja — jeder Timer, den ich über Nacht laufen lasse, ist zehntausend
  Lose für die nächste dunkle Karte in meiner Galerie.

Begründung der Streuung: Fundament und Verzahnung sind exzellent (jede Aktivität füttert die
Jagd, jedes Pet wirkt zurück in Skill UND Kampf, ehrliche Odds, starke Identität über Art +
benannte Abilities + eigene Log-Texte). Die Abzüge sind fast alle EIN Thema: Momente gehen
verloren — der zweite Drop wird verschluckt, Offline-Drops sind stumm, Skilling-Procs
unsichtbar, und zwischen den ultra-seltenen Treffern gibt es keinerlei Fortschrittsgefühl.

## Top-3-Verbesserungen für mehr Sucht-Faktor

1. **Kein Drop darf je stumm sein (Bugfix + Offline-Bühne, größter Hebel).** (a) Seq-Bug
   fixen: `lastPetDrop.seq` monoton machen (eigener Zähler im State statt „letzter Wert + 1"
   nach Null-Reset) oder `seenSeq` beim Konsumieren zurücksetzen — dann feiert auch der zweite
   Drop einer Session. (b) Pet-Drops in die Offline-/Welcome-Back-Karte aufnehmen („Während du
   weg warst: BEGLEITER GEFUNDEN!") und die Celebration nach dem Offline-Popup nachfeuern.
   Ein Sammler verzeiht 200h Jagd, aber nie einen verschluckten Jackpot.

2. **Skilling-Pets sichtbar machen.** Das ausgerüstete Pet als kleines Sprite auf der
   Skill-Seite (neben der aktiven Aktion) und ein dezenter Proc-Moment, wenn sein Passiv
   greift: kurzer Sprite-Hüpfer + Log-/Floating-Text „Cragmaw spaltet die Ader — doppeltes
   Erz!". Die Flavor-Texte existieren bereits für den Kampf; dieselbe Liebe für die 14
   Skilling-Pets verwandelt ein unsichtbares +5 % in einen Begleiter, der ARBEITET.

3. **Den Drop-Moment zu Ende bauen + Picker zur Entscheidung machen.** Celebration-Karte um
   die zwei Effekt-Zeilen (Passiv/Aktiv) und einen „Jetzt ausrüsten"-Button ergänzen; dazu
   „Erstes Pet"-Achievement. Im Picker: Gruppierung „Passt zu deiner Aktivität" zuoberst
   (aktueller Skill/Kampf), dann nach Skill sortiert; Besitz-Zeitpunkt/Quelle als Untertitel.
   Optional der Sammler-Traum: ein „Kills/Aktionen seit letztem Pet"-Zähler in der Galerie —
   Fortschrittsgefühl kostet nichts und hält die Jagd warm.

## Bugs & Auffälligkeiten

- **BESTÄTIGT (Sim-Repro): Zweiter Pet-Drop einer Session ohne Feier.** Repro: zwei Drops in
  einer Session erzwingen → Drop 1 feiert, Drop 2 landet stumm im Besitz
  (`state.lastPetDrop = {petId:"cragmaw", seq:1}` bleibt unkonsumiert liegen). Ursache:
  `packages/engine/src/pets.ts:328` (`seq = (state.lastPetDrop?.seq ?? 0) + 1` startet nach
  UI-Reset wieder bei 1) vs. `apps/client/src/renderer/components/PetCelebration.tsx:40+57`
  (`seenSeq`-Ref behält Hochwassermarke, nullt aber den Breadcrumb). Je mehr Pets man in einer
  Session findet, desto mehr Drops werden geschluckt.
- **Code-Befund: Offline-Drop komplett stumm.** `lastPetDrop` wird mitserialisiert; droppt ein
  Pet im Offline-Catch-up (deserialize läuft vor React-Mount), initialisiert sich `seenSeq`
  auf den gesetzten Wert → keine Feier. `OfflineSummary` (shared/index.ts:1172) hat kein
  Pet-Feld → auch die Welcome-Back-Karte schweigt.
- **Anzeige rundet Passiv-Werte auf:** Witherling/Glyphmaw haben 4,5 %-Passive, die Galerie
  und der Picker zeigen „+5%" (`(value*100).toFixed(0)` in PetGalleryPage.tsx). Kleine
  Ehrlichkeitslücke bei einem sonst vorbildlich transparenten System.
- **Log-Zeilen-Stil:** Die kombinierte Pet-Ability-Zeile („Boulder Toss — Cragmaw hurls a
  boulder — 1 impact damage!") trägt zwei Gedankenstriche in einem spielersichtbaren Text
  (verstößt gegen die „max. 1 Dash"-Regel aus dem Lore-/Textleitfaden).
- **Klein/kosmetisch:** Gegen Low-HP-Gegner produzieren die %-basierten Abilities Zeilen wie
  „hurls a boulder — 1 impact damage!" (mathematisch korrekt, wirkt aber unfreiwillig komisch).
  Achievement-Leiter beginnt erst bei 5 Pets; das erste Pet, der stärkste Hook des Systems,
  löst nichts aus. Picker-Panel zeigt bei 21 Pets nur ~5 Einträge (max-height 280px,
  pages.css:2500) ohne Sortierung/Gruppierung.
