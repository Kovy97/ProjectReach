# Fun-Review: Mastery-System — „Mona Feilgrund, die Perfektionistin"

**FUN-SWEEP des CEO-Loops 2026-07-14 · Tester F1 · 2026-07-16**

## Persona-Steckbrief

Mona liebt Systeme, die Wiederholung veredeln: Mastery-Bars, Checkpoints, Prozent-Boni.
Sie ist die Spielerin, die in Melvor jede Mastery-Bar auf 99 zieht, wenn es sich lohnt.
Ihre Kernfrage an Grim Reach: **Fühlt sich das zweite Mal Grinden anders an als das erste?**

## Session-Stats

- 2 Sim-Sessions (Playwright headless, Port 5290): Fixture `midgame` + `endgame`, dazu
  `__hfDebug`-Zeitraffer (Mastery 1 → 20 → 50 → 99, Pool-Checkpoint-Sprünge live).
- 14 Screenshots; erlebt: Skill-Karten beim Holzfällen, Live-Mastery-Level-Up im Spielfluss,
  Mastery-Seite (Default, aufgeklappt, Completed-Tab), Pool-Checkpoint-Überschreitung,
  Endgame-Zustand. Keine Page-Errors in beiden Sessions.
- Systemumfang: 760 Aktionen mit eigener Mastery über 11 Skills (Smithing allein 261,
  Leatherworking 162, Runecrafting 102). Boni: +0,5 %/Lvl Doppelertrag (Kappe 49 %),
  −0,15 %/Lvl Tempo (Kappe ~15 %), +0,4 %/Lvl Preservation (Kappe ~39 %); Pool-Checkpoints
  bei 5/25/50/95 % je Skill.

## Erlebte Momente

**1. Mein erster Mastery-Level-Up war unsichtbar.** Ich habe Normal Tree gehackt, die XP knapp
unter die Schwelle gelegt und den Moment live abgepasst: Der Schlag kommt, „★ Mastery 1" wird
„★ Mastery 2" — und sonst passiert NICHTS. Kein Toast, kein Aufblitzen, kein Ton, kein
Stern-Burst. Ich habe danach die Toast-Liste und alle Overlays programmatisch geprüft: leer.
Das Spiel feiert Skill-Level-Ups mit Toasts und Level 99 mit einer ganzen Meisterweihe-Zeremonie,
aber der namensgebende Mastery-Stern hat keinen einzigen Moment. Als Melvor-Spielerin, die für
genau diese kleinen Sterne spielt, war das der ernüchterndste Fund der Session.

**2. Der Pool-Checkpoint kam ebenso stumm.** Ich habe den Woodcutting-Pool von 4,7 % auf 5,2 %
geschoben: Auf der Mastery-Seite erscheint kommentarlos ein kleiner „+3 % ×2"-Chip neben der
Pool-Leiste. Das ist ein DAUERHAFTER skillweiter Bonus, den ich mir ergrindet habe, und das Spiel
sagt es mir nicht einmal. Wer die Mastery-Seite nicht zufällig offen hat, erfährt nie, dass
gerade ein Checkpoint gefallen ist. „Eine Runde noch bis zum Checkpoint" kann als Anker nicht
funktionieren, wenn weder der Fortschritt dorthin noch die Ankunft irgendwo gemeldet wird.

**3. Mastery 99 fühlt man wirklich — aber nur dort.** Zeitraffer auf Normal Tree: Bei Mastery 1
zeigt die Karte 2,8 s und ~1,4k Ertrag/h, bei Mastery 99 sind es 2,2 s und ~2,7k/h mit
„+67 % ×2"-Badge (Mastery + voller Pool + Pet). Fast doppelter Ertrag, sichtbar schnellere
Schläge: Das zweite Mal Grinden fühlt sich HIER tatsächlich anders an, das Kompound-Versprechen
wird eingelöst. Aber der Weg dorthin sind ~13M Mastery-XP pro Aktion, und zwischen Level 2 und
~30 ist der Zuwachs pro Level unfühlbar klein (−0,15 % Tempo pro Level ändert die 2,8 s-Anzeige
über Dutzende Level gar nicht). Die Kurve belohnt nur die eine AFK-Aktion, die man ohnehin
laufen lässt.

**4. Die Mastery-Seite ist eine Tabelle, kein Ziel-Brett.** Schöner Kopf (Ring, Gesamtzahl),
aber darunter: elf eingeklappte Zeilen, JEDE mit demselben orangenen „Legendary"-Badge (das
Badge hängt an der Aktions-Anzahl, und fast jeder Skill hat 11+ Aktionen — ein Rang, den alle
tragen, ist keiner). Klappe ich Woodcutting auf, sehe ich 16 Zeilen „★ 1" mit leeren Balken und
bei Mastery 2 sogar einen „−0 % ⏱"-Chip. Nirgends steht, was der nächste Checkpoint gibt, wie
weit er weg ist, oder wie lange der nächste Stern dauert. Die Kopfzeile „0 / 760 maximiert"
ist als Fernziel ehrlich, aber mathematisch hoffnungslos (760 × 13M XP) — sie demotiviert eher,
als dass sie ruft.

**5. Endgame-Schock: Total-Level 1915, Mastery-Ring 2 %.** Der Endgame-Charakter (alle Skills
97/99) hat auf der Mastery-Seite fast nichts: alle Bäume ★1, fast alle Pools leer, nur Smithing
gegrindet (Pool 100 %, elf Aktionen hoch, eine auf 99). Das ist primär ein Fixture-Artefakt
(Skill-XP direkt gesetzt, Mastery nicht mitgezogen) — in echtem Spiel wäre jeder Pool eines
97er-Skills längst voll, denn der Pool füllt sich 1:1 aus verdienter Skill-XP. Genau das ist
aber auch der Design-Befund: Der Pool ist KEIN eigenes Ziel, er passiert einfach nebenbei
(Woodcutting-Pool voll nach ~71,5k Lebenszeit-XP ≈ Skill-Level 44; alle vier Checkpoints fallen
im Vorbeigehen). Danach ist die Pool-Mechanik für diesen Skill für immer erledigt.

## Bewertungsbogen — Mastery-System (Mona Feilgrund, die Perfektionistin)
- Spaß sofort (erste 5 Minuten): 3/10
- Spaß über Zeit (Stunden/Tage, simuliert): 6/10
- Sucht-Faktor („eine Runde noch"): 3/10
- Belohnungs-Dichte & Dopamin-Momente: 2/10
- Ziel-Klarheit (warum mache ich weiter?): 4/10
- Tiefe & Entscheidungen (denken statt klicken?): 5/10
- Frustfreiheit (10 = kein Frust): 7/10
- Verzahnung mit dem Rest des Spiels: 6/10
- GESAMT-SUCHT-URTEIL: 4/10
- Komme ich morgen wieder? Ja — aber wegen der Skills, nicht wegen Mastery; die Seite gibt mir
  keinen Termin, keinen nächsten Stern, kein „noch 20 Minuten bis zum Checkpoint".

Begründung der Streuung: Die Substanz stimmt (echte, spürbare Boni am oberen Ende, saubere
Verzahnung in Karten und Ratenformel, Preservation-zu-Doppelertrag-Umwidmung bei Sammel-Aktionen
ist elegant). Was fehlt, ist ausgerechnet das, wofür Mastery-Systeme existieren: Momente.
Jeder Stern und jeder Checkpoint fällt lautlos.

## Top-3-Verbesserungen für mehr Sucht-Faktor

1. **Mastery-Momente einbauen (größter Hebel, kleinster Aufwand).** Das Toast-System existiert
   und feiert bereits Skill-Level-Ups, Drops und Pets. Ergänzen: (a) Toast bei jedem
   Mastery-Level-Up („★ Normal Tree Mastery 12"), bei 10/25/50/75/99 mit stärkerem Look + Sound;
   (b) eigener, deutlicher Toast bei Pool-Checkpoints („Woodcutting-Pool 25 % — dauerhaft +4 %
   Tempo auf alle Aktionen!"), denn das sind die seltensten und wertvollsten Ereignisse des
   Systems; (c) kurzer Stern-Puls auf der Mastery-Bar der Skill-Karte beim Level-Up.

2. **Ziele sichtbar machen: nächster Stern, nächster Checkpoint.** Auf der Mastery-Seite an
   jeden Checkpoint-Marker seinen Bonus schreiben (Hover reicht) und je Skill eine Zeile „nächster
   Checkpoint: +4 % Tempo in 2,1k XP (~25 min)". Auf der Skill-Karte im Mastery-Tooltip eine
   ETA zum nächsten Mastery-Level (die Ratenformel liefert alles Nötige bereits). Mona-Regel:
   Eine Perfektionistin bleibt für ein Ziel mit Countdown, nicht für einen stillen Balken.

3. **Meilenstein-Sprünge statt reinem 0,5-%-Tropf.** Zwischen Level 2 und 30 ist Mastery
   unfühlbar. Fühlbare Stufen einziehen, z. B. bei Mastery 10/25/50 je ein sofort sichtbarer
   Sprung (einmalig +3 % Doppelertrag extra, ein Material-Refund-Paket, kosmetisch ein silberner/
   goldener Stern an der Aktionskarte ab 25/50, animiert bei 99). Dazu das „Maxed Actions
   0/760"-Fernziel durch erreichbare Zwischenziele ergänzen („Aktionen auf ★25+: 3/16 in
   Woodcutting"). Das „Legendary"-Badge ersetzen: Rang aus dem eigenen Fortschritt im Skill
   (Bronze/Silber/Gold nach Ø-Mastery) statt aus der Aktions-Anzahl — dann ist es ein Ziel.

## Bugs & Auffälligkeiten

- **„−0 % ⏱"-Chip** auf Mastery-Seiten-Zeilen bei Mastery 2–4: Tempo-Bonus rundet auf 0, Chip
  wird trotzdem gerendert (`MasteryActionRow`: Bedingung `speed < 1` statt gerundetem Wert > 0).
  Datei: `apps/client/src/renderer/pages/MasteryPage.tsx` (Zeile ~120).
- **Alle Skills „Legendary"**: Das kosmetische Rarity-Badge hängt an der Aktions-Anzahl (11+ =
  legendary) — alle 11 Skills mit Aktionen tragen dasselbe Badge, Information = null.
- **Endgame-Fixture ohne Mastery-Daten**: `ui-audit/fixtures/endgame.json` hat Total-Level 1915,
  aber ~alle Aktionen ★1 / Pools leer — unrealistisch (Pool füllt sich 1:1 aus Skill-XP). Verzerrt
  jeden Sweep, der Endgame-Mastery beurteilen soll; Fixture sollte Mastery plausibel backfillen.
- **Design-Flag Pool-Mathe**: Pool-Kapazität = Aktions-Anzahl × XP(L20). Folge 1: EINE Aktion
  auf ~Mastery 47 füllt den GANZEN Woodcutting-Pool (16 Aktionen) — Breite wird nicht verlangt.
  Folge 2: Checkpoint-Pacing schwankt extrem zwischen Skills (Woodcutting-Pool voll nach ~71,5k
  XP, Smithing erst nach ~1,17M). Folge 3: Pool = Lebenszeit-Skill-XP, also kein ansteuerbares
  Ziel, sondern Beifang — bewusst prüfen, ob das so gewollt ist.
- **Klein**: Das „+X % ×2"-Badge in der Mastery-Zeile der Skill-Karte summiert Mastery + Pool +
  Pet + Buff (ehrlich, aber unter der Überschrift „Mastery" schreibt der Spieler Pet-Boni der
  Mastery zu). Kein Fehler, nur Lesbarkeit.
