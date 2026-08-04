# Neuling-Review 2.0 — Jorin Erstlicht (Erste Spielstunde, Verifikations-Lauf)

*Phase-2-Fable-Sweep des CEO-Loops 2026-07-14, gefahren am 2026-07-16. Verifiziert, ob die erste
Spielstunde nach den Wellen S/X + Onboarding-/Menü-Umbauten noch das ist, was T1 am 13.07. als
„bemerkenswert rund" bewertet hat. Headless-Playwright über `ui-audit/sim-harness.mjs`,
Port 5284 (Registry-Eintrag in SIM-AGENT-GUIDE.md).*

---

## Persona-Steckbrief

- **Name:** Jorin Erstlicht, die Neu-Spielerin
- **Archetyp:** kennt das Spiel nicht, kauft am 24.07. auf Steam, gibt ihm eine Stunde
- **Bewertet:** Hauptmenü → Charaktererstellung → Onboarding komplett → Aschechronik Kapitel 1–4,
  Quest-Interface (NEU, Welle X), Orientierung, Weiterspiel-Sog
- **Session-Stats:**
  - **4 Läufe auf Port 5284** (Wegwerf-Skripte `review-jorin-a/b/c/d-*.mjs`, nach dem Lauf gelöscht):
    (A) Menü/Erstellung/Guide/Quest-Tabs, (B) echtes Durchspielen Kap. 1–3 + Kap.-4-Vorspulen,
    (C) ehrliche Nach-Verifikation der Bosskämpfe/Zonen-Unlocks, (D) Import-Feedback.
  - **Echt gespielt:** Kapitel 1 in **40 s Sammelzeit** real erfüllt (25 Items Holzfällen);
    Kapitel-2-Union (15 Weidentiere) in **129 s** real erlegt (17 Hühner); Bulle, Imp und
    Grenzland-Goblin real angegangen (Ergebnis: 3 Tode, s. unten); Kapitel 4 per `__hfDebug`
    vorgespult; Kapitel-1/2-Claims, Aufträge-Claim, Erst-Tour-Escape, Import alle durch die echte UI.
  - **~35 Screenshots** (1920×1080 + 1366×768) an allen Schlüsselmomenten angesehen.
  - **0 Page-Errors, 0 Crashes, 0 Blocker** über alle 4 Läufe.

---

## Bewertungen (1–10)

### Hauptmenü-Ersteindruck — **9/10**
Das neue Menü ist ein echter Steam-Screenshot-Moment: Welt-Panorama, goldenes Logo, Citadel-
Nav-Buttons mit Emblemen, Trenn-Ornament vor „Spiel verlassen", Version im Footer. Die
Sprach-Buttons oben rechts (7 Sprachen, Citadel-Rahmen) wirken sofort: EN-Klick übersetzt das
Menü live, DE zurück genauso. Das Options-Panel (Anzeige/Audio, geteilte Komponente mit In-Game)
öffnet sauber und liest sich verständlich. Kleinigkeiten: das Panel überdeckt das Logo halb
(Ebenen-Optik, verschmerzbar), und **Ambient-Musik steht per Default auf 0 % Lautstärke** bei
aktivem „Musik an" — eine Neu-Spielerin mit Ton hört keine Musik und weiß nicht, dass es welche gäbe.

### Onboarding-Führung — **7/10**
22 Schritte, alle sauber: Sprecher durchgehend „Der Wächter", Medaillon lädt, keine Blase
geclippt, kein Spotlight offscreen, kein Hänger, Klick-aufs-echte-Ziel-Mechanik funktioniert.
Escape = Überspringen greift jetzt auch bei den Bereichs-Erst-Touren und **wird gemerkt**
(Combat-Tour nach Escape-Skip nie wieder aufgetaucht — verifiziert). Zwei Schwächen aus
Neulingssicht: (1) Der Rundgang zeigt jede Skill-Schaltfläche, aber **nie den Aufgaben-Hub** —
ausgerechnet den Ort, der „was soll ich tun?" beantwortet. (2) Der letzte Schritt zielt auf die
Optionen-Schaltfläche, also **endet die Tour auf der Optionen-Seite** — ein Anti-Klimax; der
Abschlusstext sagt „starte jetzt einen Skill", lässt mich aber vor Reglern stehen.

### Quest-Interface-Verständlichkeit (NEU, Welle X) — **8/10**
Das Master-Detail ist auf den ersten Blick verständlich und dem alten Karten-Stapel klar
überlegen: links „Auftragsstränge" mit Gruppierung, Fortschritt x/y, Punkt = aktiv,
Schloss = gesperrt; rechts die NPC-Bühne mit Kopf-Medaillon, Sprechblase (Ziel in einem Satz),
großen Ziel-Zeilen mit 📍-Ort-Chip und Belohnungen. Gesperrte Quests erklären sich selbst
(„Benötigt: Goblin-Blut"). Der **Claim-Flow ist butterweich**: Badge „Einlösbar", ein Button
„Belohnung einlösen", Marken-Zähler oben springt live mit, Bühne wählt automatisch die nächste
einlösbare Quest. Bei 1366×768 stapelt das Layout sauber. Zwei Abzüge: **ein Gesicht, zwei
Namen** — dasselbe Brenna-Porträt spricht als „Der Wächter" (Begrüßung, Erste Schritte) UND als
„Brenna Aschenweide" (Goblin-Blut-Strang); als Neuling hielt ich das für einen Fehler. Und das
Begriffs-Trio **„Aufgaben" (Topbar) / „Aufträge" (Tab) / „Aufgabenmarken" (Währung)** ist eine
Vokabel mehr, als die Seite braucht. Der Unterschied Story vs. Aufträge trägt dagegen gut:
Story = nummerierte Kapitel-Bühne mit „Kapitel 4 von 21", Aufträge = Strang-Brett; das
verwechselt man nach einem Blick nicht mehr.

### Story-Einstieg Kapitel 1–4 — **7/10**
Der Wächter-als-Chronist trägt sofort, und die Taktung stimmt jetzt bis Kapitel 3: Kap. 1 in
40 s real erledigt (Live-Zähler tickt beim Sammeln sichtbar mit, 7/25 → 10/25 am offenen Tab),
Kap. 2-Grind in ~2 min, Claim-Punkt in der Topbar meldet Abholbares. Die **Kap.-4-Entschärfung
(30/8) ist live** und fühlt sich als Ziel-Zeile nicht mehr wie eine Wand an (vorher 40/10, von
Band-1-Review Mira exakt so empfohlen). Der Dämpfer ist die Kampf-Realität: **Bulle (Kap.-2-Boss),
Imp (Kap. 3) und der erste Grenzland-Goblin (Kap. 4) töten einen kapitel-frischen Charakter
zuverlässig** — Bulle in 17 s (17→0 HP, Start-Shrimp-Auto-Eat mit +2 wirkungslos), Imp und Goblin
ähnlich. Das ist laut Design gewollter Progressionsdruck (erst leveln/kochen/schmieden, dann
Boss), aber das Spiel **sagt es einem nirgends**: kein Stufen-/Prognose-Hinweis an der
Kapitel-Ziel-Zeile, und das Todes-Popup („Du bist gefallen") erklärt weder Verlust noch nächsten
Schritt. Eine Steam-Neulingin baut sich die Kausalkette „stirb → koche Essen → rüste um → komm
wieder" nicht von allein — sie liest „die Story schickt mich in den Tod".

### Orientierung („weiß ich immer, was zu tun ist?") — **8/10**
Ja, fast immer: Der Quest-Besuch öffnet automatisch den Story-Tab, die aktive Kapitel-Bühne sagt
WAS + WO (📍-Chips; Welle-S-Fix verifiziert: Kap.-5-Boss zeigt den **Dungeon** „Die
Goblin-Kriegsbande" statt einer falschen Zone; Kap. 4 zeigt „Die Grenzlande"), gesperrte
Zonen-Karten nennen das freischaltende Kapitel im Klartext („Erfordert Chronik-Kapitel: Der Funke
im Korn"), der Grenzlande-Unlock nach Kap.-3-Claim greift real (Schloss weg, Zone betretbar), und
der goldene Claim-Punkt an „Aufgaben" zieht das Auge. Abzüge: der Guide stellt den Aufgaben-Hub
nie vor (s. o.), und das Prognose-Label auf Monster-Karten („Stark" in Grün direkt unter „Stufe 1"
beim Huhn) liest sich als Eigenschaft des Monsters statt als meine Siegchance — „ein starkes
Huhn?" war mein erster Gedanke.

### Weiterspiel-Sog nach 1 Stunde — **8/10**
Nach einer Stunde stehe ich in Kapitel 3–4, habe 3–4 Aufgabenmarken, sehe im Belohnungs-Shop
konkrete Preise (Essen ab 4 Marken, Tonika, Magiebinder), habe zwei Meilenstein-Fanfaren erlebt
(„Auftragsanfänger", „Huhn-Jäger") und drei klare nächste Ziele: Bullen besiegbar machen,
Grenzlande säubern, ersten Dungeon öffnen. Der Sog-Mechanismus (Kapitel gaten Zonen, Zonen gaten
Kapitel) funktioniert spürbar. Das Risiko für den Abbruch in Stunde 1 ist einzig der
unkommentierte Bossen-Tod.

---

## Bug-/Blocker-Liste (mit Repro)

**Blocker: keiner.** Kein Hänger, kein Softlock, 0 Page-Errors in 4 Läufen.

1. **Doppelter Import-Toast.** Repro: Spielstand laden → Optionen → Save-JSON ins Import-Feld →
   „Importieren (überschreibt aktuellen Spielstand)". Ergebnis: Import klappt, Session lädt neu,
   aber **zwei identische Toasts** „Spielstand importiert" stapeln sich. (Dev-Server; Verdacht
   StrictMode-Doppel-Effekt — bitte im gepackten Build gegenprüfen, Screenshot f01 im Sweep-Ordner.)
2. **Import-Toast-Text abgeschnitten:** „Dein importierter Spielstand ist jet…" — kein Umbruch,
   Clamp mitten im Wort. Gleiche Repro wie 1.
3. **Tag-1-Dailies unerfüllbar für Frisch-Charaktere.** Repro: neues Spiel → Aufgaben → Täglich.
   Angeboten wurden „Goblin-Hatz" (20 Goblins, Grenzlande = noch story-gesperrt) und
   „Glutlöscher" (Schwierigkeit „Meister"). Der Daily-Pool filtert nicht nach Progression;
   2 von 6 Karten sind für die Zielgruppe des ersten Tages toter Text.
4. **Kosmetik Charakterblatt:** Ausrüstungs-Slot-Beschriftungen brechen mitten im Wort
   („WERKZ EUG", „UMHA NG"). Repro: Charakter öffnen, leere Slots ansehen.
5. **Kosmetik/Terminologie Kampf:** Prognose-Label ohne Kontext (s. Orientierung); im
   Tränke-Panel der Kampf-Seitenleiste erschien der Platzhalter-Text „Unten Trank" (abgeschnitten
   sichtbar im Bullen-Screenshot e01) — Wortlaut prüfen.

*(Nicht als Bug gewertet, weil Design-Entscheid: Bulle/Imp/Goblin tödlich für kapitel-frische
Charaktere — s. Bewertung Story-Einstieg und Empfehlung 1/2.)*

---

## Vergleich zu T1 („bemerkenswert rund", 13.07.)

**Gehalten und in Summe besser.** Was sich seit T1 sichtbar verbessert hat:

- **Quest-Interface:** Der Aufträge-Tab ist vom flachen Karten-Stapel zum Master-Detail mit
  NPC-Bühne geworden — der größte Einzelgewinn; die Seite erzählt jetzt, statt zu listen.
- **T1s offene Frage „wo findet der Neuling den Bullen?" ist beantwortet:** Rasender Bulle UND
  Imp stehen jetzt regulär in der Weiden-Monsterliste (verifiziert, Screenshot d08).
- **Ort-Zeilen** (Welle S) stimmen inkl. Dungeon-Fall (Kap. 5 → „Die Goblin-Kriegsbande").
- **Kap. 4 entschärft** (30/8 statt 40/10) — die von Band 1 monierte Grind-Kante ist gesoftet.
- **Escape** schließt Guide und Erst-Touren und wird persistent gemerkt.
- Hauptmenü, Options-Panel, Sprach-Buttons, Import-Feedback: alles neu und trägt.

Wo es **schlechter bzw. erstmals sichtbar** ist: T1 hat Bullen-/Imp-Kills injiziert und konnte
die Todes-Realität der frühen Bosse nie erleben — dieser Lauf hat sie real gemessen (3 Tode).
Das ist kein Regressions-Befund, aber der eine Punkt, an dem „bemerkenswert rund" für eine echte
Steam-Neulingin heute noch nicht gilt. Dazu zwei neue Klein-Bugs (Import-Doppel-Toast, Trunkierung),
die es am 13.07. noch nicht gab.

---

## Empfehlungen (max. 5, priorisiert)

1. **Schwierigkeits-Signal an Story-Ziele:** In der Kapitel-Ziel-Zeile (und/oder Monster-Karte im
   Kontext des Kapitels) die vorhandene Kampf-Prognose wiederverwenden — z. B. Chip „Riskant" neben
   dem 📍-Ort beim Bullen/Imp. Eine Zeile Wächter-Hinweis täte es auch („Koche, was du erlegst,
   bevor du dem Bullen widersprichst").
2. **Todes-Popup aufwerten:** ein Satz Konsequenz („Du verlierst nichts") + ein konkreter nächster
   Schritt (besseres Essen ausrüsten, Auto-Eat-Upgrade, erst Stufe X). Das verwandelt den
   Frust-Moment in die gewollte Progressions-Lektion. Bonus: Kap.-2-Belohnungs-Essen (Barsche)
   landet im Inventar, aber Auto-Eat isst weiter die ausgerüsteten Shrimps — ein Hinweis
   „neues Essen ausrüsten?" schließt die Lücke.
3. **Guide-Finale umbauen:** einen Schritt für die Aufgaben-Schaltfläche ergänzen und den Rundgang
   auf dem Story-Tab enden lassen („Hier steht immer, was als Nächstes zu tun ist") statt in den
   Optionen.
4. **Ein Gesicht, ein Name:** solange nur das Brenna-Porträt existiert, überall denselben
   Sprechernamen zeigen (oder das Wächter-Porträt priorisiert liefern lassen); dabei das
   Begriffspaar „Aufgaben"/„Aufträge" auf einen Begriff ziehen.
5. **Daily-Pool progressions-filtern** (keine Ziele in story-gesperrten Zonen, kein „Meister" für
   Tag-1-Charaktere) und die zwei Import-Toast-Bugs fixen.

---

## Fazit (Jorin)

Ich habe in einer Stunde kein einziges Mal nicht gewusst, wo ich hinsoll — das ist für ein Spiel
mit 14 Skills und 22 Kampfgebieten die eigentliche Leistung. Das Menü verkauft das Spiel, die
Chronik-Bühne zieht, das neue Auftrags-Brett fühlt sich nach Questbuch an, nicht nach Tabelle.
Kaufen würde ich es. Weiterspielen auch — wenn mir beim ersten Bullen-Tod jemand sagt, dass das
Teil des Spiels ist und nicht mein Scheitern.
