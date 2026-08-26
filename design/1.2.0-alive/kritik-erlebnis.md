# 1.2.0 „Alive" — Kreuzkritik UI/Erlebnis (Runde 2, 26.08.2026)

Gelesen: `brainstorm-lore.md`, `brainstorm-aufgaben.md`, `brainstorm-weltsysteme.md` (+ eigener
`brainstorm-erlebnis.md`). Perspektive: was das auf dem Bildschirm zusammen ergibt.

## 1) UI-Prüfung: Flächen-Inventar und Bündelung

**Bestand, das schon „lebt":** Wächter-Bericht (Offline-Popup), 4 NPC-Begrüßungen (`npcVoice.ts`),
Mailbox mit 2 Brief-Anlässen, 4 Badge-Slots je Zonenkarte (Elite/Spuren/Fertig/Story-Lock),
TopBar-Claim-Punkt, Sidebar-Running-Glow.

**Neu vorgeschlagen, zusammengezählt:** mindestens 3 neue Seiten-/Tab-Kandidaten für die
Quests-Seite (Auftragsbuch mit Geber-Reitern, Chronik-Tab, Kalenderleiste), 1 neues New-Haven-Panel
(„Am Feuer"), 1 neues Slayer-Panel (Kopfgeldtafel), bis zu 4 weitere Zonenkarten-Badges/Meter
(Lage, Kopfgeld, Karawane, Präsenz — macht potenziell 8 Slots auf einer Karte), 5 neue Mail-Absender
mit je eigenem Anlass, eine TopBar-Weltzeile, ein Sidebar-Unread-Badge für die Chronik, ein rotes
Kohlenbecken-Statuslicht am Wachturm, Gunst-Leisten je Geber, ein Ember-Streak-Icon. Drei
Perspektiven (ich, Lore, Weltsysteme) haben **unabhängig voneinander dieselbe Idee** erfunden: ein
rückblickendes Sitzungs-/Tagesprotokoll (mein Chronik-Feed, Lores „Tageseintrag", W3 „Chronik des
Tages"). Das ist ein starkes Signal, aber auch der klarste Beleg für das Rauschrisiko.

**Wo die zweite Ungelesen-Welt droht:** Jedes „Neuling"-System bringt sein eigenes
Aufmerksamkeits-Signal mit (Sidebar-Badge, Kohlenbecken-Licht, Mail-Punkt je Absender, Zonenkarten-
Badge-Inflation). Der Spieler lernt dann, fünf verschiedene Stellen abzuklappern, ob „was Neues" da
ist, statt zwei — genau das Muster, das die Bounty-Board-Rückbaulehre (0.2.2) schon einmal bestraft
hat. Mail mit 5 zusätzlichen Absendern ohne gemeinsamen Deckel ist der größte Einzelrisikoposten.

**Bündelung auf zwei Eingänge:**
1. **Wächter-Bericht beim Wiederkommen** (Ausbau des bestehenden Offline-Popups) — alles, was
   „während du fort warst" passiert ist: Weltlage/Nacht (W1/W2), Post-Hinweis, Lager-Fertigstellung,
   Kopfgeld/Karawanen-Status. Kein Lesezwang während der Sitzung, ein Blick beim Start.
2. **Ein Sitzungs-Fach** (die drei Chronik-Vorschläge zusammengelegt zu EINER Komponente, z. B. als
   Reiter auf der Quests-Seite statt als drittes Extra-Fach) — für „was war eben", freiwillig,
   ohne Unread-Zähler (kein Pflichtgefühl, s. Leitgedanke „lebendig ≠ aufmerksamkeitsbedürftig").

Alles andere bekommt **kein eigenes Aufmerksamkeits-Signal**, sondern hängt sich an bestehende
Flächen: Absender-Porträts auf den Daily-Karten (keine neue Seite), EIN Lage-Badge auf der
Zonenkarte, der Elite/Spuren/Kopfgeld/Karawane per Priorität ROTIEREN statt STAPELN lässt (nie mehr
als 2 Slots gleichzeitig sichtbar), Mail-Absender teilen sich EINEN Tages-/Wochen-Deckel statt
eigener Regeln je Idee, und das New-Haven-Panel „Am Feuer" ersetzt Bedarfstafel-Vorschläge statt sie
zu addieren. Der Auftragsbuch-Vorschlag und der Chronik-Tab-Vorschlag wollen beide dieselbe Seite
umbauen — das muss VOR jeder Umsetzung eine Person entscheiden, sonst baut jemand zweimal.

## 2) Drei Ideen der anderen, die auf dem Bildschirm am stärksten sind

**Zonenlagen (Weltsysteme W1).** *Ort:* CombatPage, Zonenraster. *Rahmen:* bestehende `.zone-card`,
ein Badge-Slot im selben Stil wie der Elite-Badge, plus ein leichter CSS-Tint auf dem vorhandenen
Kartenbild. *Bestand:* alle Zonenbilder, bestehende Badge-CSS-Mechanik — kein neues Bild nötig,
höchstens 6 winzige Lage-Embleme. Größter „die Welt bewegt sich"-Effekt für den geringsten Eingriff
in eine Seite, die jeder Idle-Spieler täglich ansieht, um die Warteschlange zu füllen.

**Tafel bekommt Absender (Lore Idee 1 / Aufgaben Idee 2, unabhängig konvergiert).** *Ort:*
QuestsPage, Dailies-Tab. *Rahmen:* bestehende Karten-Optik (Basalt/Pergament), ein kleines
Kopf-Medaillon wie bei `NpcGreeting` oben links auf der Karte plus eine Zeile Bitte-Text darunter.
*Bestand:* sechs vorhandene Porträts (Brenna hat schon eins, für die anderen fünf notfalls
Gebäude-/Emblem-Platzhalter statt Kopf). Verwandelt die meistgesehene Seite des Spiels, ohne sie
umzubauen — reiner Zusatz auf der bestehenden Kartenform.

**New Haven bekommt Besucher, Stufe A (Lore Idee 5 / Weltsysteme W7, ebenfalls konvergiert).** *Ort:*
NewHavenPage, an den jeweiligen Gebäuden (Händlerposten, Schmelzofen, Saatgarten, Trophäenwand).
*Rahmen:* kleine Porträt-Chips an bestehenden Gebäude-Positionen, kein neues Panel nötig für die
Einstiegsstufe. *Bestand:* dieselben sechs Porträts, keine neue Kunst. Die heute komplett menschenleere
Lagerkarte bekommt damit für null neue Assets den größten optischen Sprung im ganzen Brainstorm-Satz.

## 3) Drei Ideen, die ich streichen oder verschieben würde

**Das Auftragsbuch als neue Seite (Aufgaben Idee 1, Phase 1+2).** Kollidiert direkt mit den
Chronik-/Kalender-Tab-Vorschlägen um dieselbe Quests-Seite (s. oben) und legt eine vierte
Informationsarchitektur über eine Seite, die schon Kapitel + Stränge + Dailies + Token-Shop trägt.
Bei 1366×768 heißt „ein Buch mit sieben Reitern plus Kartenraster darunter" entweder Scrollen in
zwei Richtungen oder ein Reiter, der nur noch Icons zeigt. Lieber: Absender direkt auf die
bestehenden Karten (Idee 2 dort), keine neue Seite — Phase 2 (Engine-Fusion) ohnehin vom Autor
selbst auf „nach 1.2.0" verschoben.

**Das Gerücht der Woche (Weltsysteme W9).** Vom Autor selbst als textlastig (7 Sprachen, „wenige,
aber gut geschriebene" Vorlagen) und als „eigentliche Antwort auf besseres Aufgabensystem, aber
teuer" eingeordnet — genau der Fall, wo Aufwand (L, neue Objective-Typen für Nachtbedingung/Abgabe)
und Idle-Nutzen (eine Kette pro Woche, die man leicht verpasst zu lesen) nicht im ersten Wurf
zusammenpassen. Verschieben auf 1.2.x, nachdem der Kern (Abschnitt 4) sitzt.

**Zonen-Gedächtnis / Präsenz (Weltsysteme W11).** Wäre der siebte oder achte gleichzeitig mögliche
Badge/Meter auf derselben Zonenkarte (nach Fertig/Story-Lock/Elite/Spuren/Lage/Kopfgeld/Karawane) —
das Signal-Rausch-Verhältnis kippt hier zuerst. Der Rückkopplungseffekt („Präsenz macht die Zone
morgen freundlicher") ist zudem schwer auf einen Blick lesbar, verglichen mit der sofort
verständlichen Zonenlage aus W1. Erst bauen, wenn W1 sich bewährt hat und noch Bedarf besteht.

## 4) Alive-Kern (höchstens fünf Systeme, in Reihenfolge)

1. **Wächter-Bericht, ausgebaut** — der eine Eingang für „was geschah, während ich fort war"
   (Weltlage, Post, Lagerbau, Kopfgeld/Karawane in einem Bericht statt fünf Signalen).
2. **Tafel bekommt Absender + drei-von-sechs** — Identität und Tagesrhythmus auf der bestehenden
   Dailies-Karte, keine neue Seite.
3. **Zonenlagen (Weltuhr)** — die Karte, die täglich die Warteschlange entscheidet, sieht täglich
   anders aus.
4. **Ein Sitzungs-Fach** — die drei Chronik-Vorschläge zu einer Komponente gebündelt, freiwilliges
   Nachlesen ohne Unread-Zwang.
5. **Kopfgeldtafel bei Brenna** — der Kampf-ist-fundamental-Hebel, als Kartenreihe im Shop-Stil
   (keine feste Fläche wie das verworfene Kopfgeld-Brett).

**Ein Tag im Leben (nur mit dem Kern).** Morgens sagt der Wächter in zwei Zeilen, was die Nacht war:
Nebel über der Küste, ein Brief von Mux, der Vorratsspeicher steht. Auf der Tafel bittet Shairi um
Sammelgut mit einem Satz in ihrer Stimme, der Spieler löst zwei der drei Kernkarten ein und stellt
die Warteschlange auf die Aschfelder, die heute unter „Belagerung" liegen und mehr Gold geben. Im
Sitzungs-Fach steht mittags kurz nachlesbar, dass ein Gezeichneter im Schwarzdorn aufgetaucht ist,
und der Spieler schiebt die Jagd vor die Warteschlange. Abends ist die dritte Tageskarte erledigt,
der Kopf hängt an Brennas Trophäenwand, und der nächste Wächter-Bericht schreibt sich schon für
morgen früh — fünf Systeme, ein Ein- und ein Ausgang, kein einziger neuer Punkt, der blinkt, weil
er ungelesen ist.
