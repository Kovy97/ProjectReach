# 1.2.0 „Alive" — Brainstorm UI/Erlebnis (26.08.2026)

Perspektive: UI-Dev. Ich habe vor dem Schreiben den Renderer durchsucht, um nicht etwas
vorzuschlagen, das schon existiert oder schon einmal verworfen wurde. Kurz der Befund, weil er
die ganze Denkrichtung dieses Dokuments prägt: **„Alive" ist in Grim Reach kein leeres Feld.**
Es gibt bereits einen Wächter-Bericht im Offline-Popup (`pages/OfflinePopup.tsx`, Prioritäts-
Zeilen aus `design/lore/waechter-stimme-pack.md`), Weltzustand-Zeilen für vier NPC-Begrüßungen
(`util/npcVoice.ts`: Elite > Spielerzustand > Segen), einen Briefkasten mit gelegentlichen
Geschenk-Briefen von Brenna/dem Wächter (`pages/MailPage.tsx`), Spuren-/Elite-Badges auf den
Zonenkarten (`util/eliteBoard.ts`), sieben Wochentags-Segen (`packages/engine/src/blessing.ts`)
und eine ganze Zeremonien-Familie für große Momente (`DungeonClearCeremony`, `MasteryCeremony`,
`ChampionDefeatCeremony`, `ApMilestoneCeremony`, `PetCelebration`). Ein Kopfgeld-Brett
(„BountyBoard.tsx") wurde sogar schon gebaut und wieder verworfen — Chef-Feedback 0.2.2 Punkt 3
war „das frisst zu viel festen Platz im Hauptinterface", ersetzt durch das schwebende
`EliteMiniWindow`. Meine Ideen bauen deshalb bewusst **auf** diesem Fundament weiter, statt es zu
duplizieren, und ich markiere bei jeder Idee, ob sie eine bestehende Ader vertieft oder wirklich
neu ist.

## Drei Leitgedanken

1. **„Lebendig" heißt: die Welt hat schon gehandelt, bevor ich hinschaue.** Der stärkste Ort für
   Leben in einem Idle-Spiel ist nicht die laufende Sekunde, sondern der Moment des Wieder-
   Hinschauens — Rückkehr vom Alt-Tab, Rückkehr vom Schlafen. Der Wächter-Bericht macht das schon
   für Kampf/Loot; die Lücke ist alles, was NICHT Kampf ist (Post, Lager, Kalender).
2. **„Lebendig" darf nicht „aufmerksamkeitsbedürftig" heißen.** Jede neue Fläche konkurriert mit
   dem Grundversprechen „läuft nebenbei". Alles, was pro Tick oder pro Sekunde neu zeichnet, kostet
   Performance-Budget, das die Perf-Welle A (Sidebar/TopBar/GameStats-Selector-Gates) mühsam
   erkämpft hat — und alles, was Pflichtlektüre erzeugt (ungelesene Zähler, „musst du erst
   wegklicken"), untergräbt genau den Idle-Charme, den der Chef schützen will.
3. **„Lebendig" ist eine Frage der Textstimme, nicht nur der Grafik.** Die teuersten „Leben"-
   Momente hier sind schon reiner Text (Wächter-Zeilen, NPC-Grüße) — sie brauchen keine neue
   Kunst, nur Schreibarbeit + Bedingungen. Bevor ich neue Bilder anfrage, lohnt sich immer zuerst
   die Frage: kann eine bestehende Stimme das einfach mit-erzählen?

## Ideen

### 1. Weltpuls-Zeile am Doing-Kasten (Ausbau)
**Erlebnis:** Unter/neben „Doing: Eisenerz abbauen" blinkt kein Fortschrittsbalken mehr allein —
eine einzelne, ruhige Zeile rotiert alle paar Sekunden durch, was gerade sonst in der Welt
passiert: „Ein Bote wartet in deinem Postfach", „Blutmond heute Nacht", „In den Highlands liegen
frische Spuren". Man muss nichts anklicken, um zu wissen: die Welt hat etwas zu erzählen, bevor
man überhaupt eine Unterseite öffnet. Die Zeile verschwindet wieder, wenn nichts zu sagen ist —
kein Platzhaltertext, kein leeres „Alles ruhig" als Dauerzustand.
**Engine/Idle-Weg:** Reine Ableitung aus bereits vorhandenem State (Mailbox-Länge, `eliteZones`
via `eliteBoardStatusForZone`, `blessingForTime`) — exakt dieselben Signale, die `npcVoice.ts`
schon für die vier NPC-Begrüßungen bündelt, hier nur zentral im Header statt pro Unterseite.
Rotation ist ein `setInterval`/Random-Pick auf Mount, kein Tick-Zwang.
**Art-Bedarf:** Bestand — Text + vorhandene Icon-Fallbacks (`icon_sys_mail`, `icon_sys_idle`).
**Aufwand:** S.
**Risiko:** Kann als „Werbebanner" nerven, wenn zu viele Kandidaten gleichzeitig feuern oder die
Rotation zu schnell taktet; muss strikt auf max. 1 Zeile, seltene Wechsel (>20s) gedeckelt sein und
darf den Doing-Kasten (Chef-Auftrag 25.08., gerade erst verbreitert) nicht wieder aufblähen.
**Abhängigkeiten:** keine neuen Engine-Felder — reine UI-Zusammenführung bestehender Selektoren.

### 2. Chronik-Feed als aufklappbares Sidebar-Fach (neu, renderer-lokal)
**Erlebnis:** Ein einklappbares Fach unten in der Sidebar (Standard: zu) öffnet eine kurze,
rückwärts-chronologische Liste der letzten Ereignisse dieser Sitzung — Dungeon bezwungen,
Levelaufstieg, seltener Fund, Brief erhalten, Elite erschienen. Wer nach einer langen Kampf-Serie
kurz zurückblättern will „was war da eben", muss keinen Toast verpassen — er steht noch im Fach.
Es ist ein Gedächtnis für die Sitzung, kein neues Pflichtprogramm.
**Engine/Idle-Weg:** Bewusst **renderer-lokal und nicht gespeichert** — dieselbe Diff-Erkennung,
die `components/Toasts.tsx` schon pro Tick fährt (Snapshot-Vergleich auf `state.totalTicks`),
schreibt zusätzlich in einen In-Memory-Ringpuffer (z.B. 40 Einträge) statt nur einen Toast zu
feuern. Kein neuer Save-State, keine Migration. Eine spätere, „richtige" Variante, die auch über
Offline-Phasen hinweg Buch führt, bräuchte echten Engine-Event-Log-State — das wäre ein Antrag an
Logic-Dev, kein Muss für die erste Fassung.
**Art-Bedarf:** Bestand — je Ereignistyp ein vorhandenes Icon (Dungeon-Emblem, XP-Icon, Waxseal
für Post, Elite-Badge-Icon).
**Aufwand:** M (Ringpuffer + Fach-UI + Icon-Mapping je Ereignistyp; Erweiterung bestehender
Diff-Logik, kein neues Subsystem).
**Risiko:** Größtes Risiko ist Redundanz mit Toasts — muss klar als „das Nachschlagewerk", nicht
als zweiter Toast-Strom positioniert sein (kein eigenes „ungelesen"-Badge, das Pflicht erzeugt,
s. Leitgedanke 2). Bounty-Board-Lehre gilt sinngemäß: als Fach, nicht als fest sichtbares Panel.
**Abhängigkeiten:** keine (MVP); Vollversion über Offline-Grenzen hinweg = Engine-Ask.

### 3. Wächter-Bericht: neue Bedingungen (Ausbau, kein neues System)
**Erlebnis:** Der Rückkehr-Bericht kommentiert heute nur Kampf/Loot/Tod. Neue Zeilen: „Während
du fort warst, ist [Gebäude] fertig geworden", „Ein Brief wartet auf dich", „Der Segen hat
gewechselt, seit du gegangen bist — heute ist [Blutmond]". Der Bericht wird dadurch zum echten
„was geschah, während du fort warst" über ALLE Systeme, nicht nur Kampf.
**Engine/Idle-Weg:** Nutzt exakt das bestehende Prioritäts-Gerüst (`pickWardenLines` in
`OfflinePopup.tsx`, §D.4 Tod > Pet > Beute/Gold/Kills > Dauer). Braucht aber echte Engine-Signale,
die heute fehlen: „wurde WÄHREND dieser Offline-Spanne ein Lagerbau fertig" (Camp-Queue kennt nur
den aktuellen Zustand, kein Abschluss-Breadcrumb) und „kam WÄHREND dieser Spanne ein Brief an"
(Mailbox kennt nur den aktuellen Bestand). Das ist ein Antrag an Logic-Dev nach dem Muster, das
`npcVoice.ts` selbst schon als offenen Punkt notiert („`lastParagonChest`/`lastEliteSpawn`-artiger
Breadcrumb").
**Art-Bedarf:** Bestand (reiner Text im bestehenden Wächter-Layout).
**Aufwand:** S auf UI-Seite, sobald die Breadcrumbs existieren — bis dahin blockiert.
**Risiko:** Der Bericht zeigt schon jetzt höchstens 2 Zeilen (bewusst knapp, „ein Blick, kein
zweiter Report") — neue Kandidaten müssen sich in die bestehende Rangfolge einsortieren, nicht
einfach angehängt werden, sonst wird aus der Kurzmeldung ein Wandtext.
**Abhängigkeiten:** Logic-Dev (Camp-Build-Abschluss-Breadcrumb, Mail-Ankunfts-Breadcrumb während
Offline-Fenster).

### 4. Wochenrad für Segen (neu, reine Anzeige)
**Erlebnis:** Ein kleiner Streifen am bestehenden Segen-Panel (Sidebar) zeigt alle sieben
Wochentage als Reihe kleiner Symbole, heute hervorgehoben — ein Blick sagt „morgen ist Blutmond,
heute lohnt sich Lagern statt Kämpfen". Aus einem reinen Buff-des-Tages wird ein planbarer
Wochenrhythmus, ohne dass sich an der Mechanik selbst etwas ändert.
**Engine/Idle-Weg:** `BLESSINGS`/`WEEKDAY_BLESSING` in `packages/engine/src/blessing.ts` sind
feste, exportierbare Tabellen — der Renderer kann alle 7 Einträge einfach aufzählen, ganz ohne
neuen State (identisch zur heutigen Einzeltages-Anzeige in `BlessingPanel.tsx`, nur einmal
zusätzlich über die Woche gespiegelt).
**Art-Bedarf:** Bestand — dieselben Segen-Bilder (`getBlessingImage`), die das Panel heute schon
für den aktiven Segen zeigt.
**Aufwand:** S.
**Risiko:** Minimal — reine Zusatzinfo, kein Interaktionsrisiko. Einzige Falle: Platz in der
Sidebar ist knapp (Chef-Auftrag zur Sidebar-Breite existiert schon als eigenes Spannungsfeld) —
sollte eher in den Tooltip/CitadelTip wandern als fest in die Karte.
**Abhängigkeiten:** keine.

### 5. Marktplatz-Belebung in New Haven (neu, rein dekorativ)
**Erlebnis:** Auf der Lagerkarte stehen an belebten Stellen ein paar kleine Bewohner-Figuren
herum — mehr, je mehr/höherstufige Gebäude gebaut sind. Kein NPC zum Anklicken, keine Queststelle,
einfach das Gefühl „hier lebt jetzt jemand" statt einer Ansammlung leerer Gebäude-Icons auf einer
Karte.
**Engine/Idle-Weg:** Die „Bevölkerungsdichte" ist reine UI-Ableitung aus bereits vorhandenen
Werten (`campBuildingLevel`/Anzahl gebauter Gebäude über `campOccupiedPositions`) — kein neuer
State, nur eine Renderer-Formel „wie viele Deko-Figuren zeige ich, an welchen der schon belegten
Positionen".
**Art-Bedarf:** Bestand für den Prototyp — die vorhandenen generischen Portrait-/Charakterbilder
(`assets/portraits/char_*.webp`, ~30 Stück, bereits variantenreich) als kleine statische Sprites.
Eine spätere, hübschere Fassung (eigene kleine Rückenansichts-Sprites statt Portraitausschnitte)
wäre ein Mira-Auftrag, aber kein Blocker für eine erste Fassung.
**Aufwand:** M — die Lagerkarte ist ein bestehendes Drag/Zoom/Platzierungs-System
(`moveCampBuilding`, `campPlacementReason` etc.), zusätzliche Deko-Layer müssen sich sauber in
Zoom/Pan einfügen, ohne mit Bau-Interaktion zu kollidieren.
**Risiko:** Perf auf einer ohnehin schon komplexen Karte (viele Gebäude, Drag-Handling); reine
Dekoration ohne jede Interaktion nutzt sich nach ein paar Sitzungen optisch ab, wenn sie nicht
gelegentlich variiert (Tageszeit, Wetter s. Idee 6, besondere Tage). Muss hinter denselben
Ambient-Schalter wie `AmbientEffects` (An/Aus) hängen, nicht separat.
**Abhängigkeiten:** keine Engine-Änderung; ggf. Mira für Folgeiteration.

### 6. Zeit-Tönung auf Zonenkarten (neu — bewusst vorsichtig formuliert)
**Erlebnis:** Zonenkarten und der Kampfhintergrund bekommen eine sehr dezente Tages-/Nacht-
Tönung passend zur lokalen Uhrzeit des Spielers (warmes Licht mittags, kühles Blau nachts) — ein
Hauch Realwelt-Rhythmus, ohne dass sich am Kampf selbst etwas ändert.
**Wichtiger Kontext, den ich hier ausdrücklich einordne statt zu verschweigen:** Am 24.07.2026
hat der Chef Wetter/Nebel-Drift/Fackel-Ecklicht bewusst aus `AmbientEffects` entfernt und auf
„nur das Vignette" reduziert (Task #317). Diese Idee ist NICHT dasselbe (reine Farbtemperatur-
Tönung per CSS-Gradient, keine Partikel, kein Wetter-Overlay, kein neuer Canvas-Layer) — aber sie
liegt nah genug am selben Thema, dass ich sie nicht ohne ausdrückliches Chef-GO umsetzen würde.
**Engine/Idle-Weg:** Reine Wanduhr-Ableitung (`new Date().getHours()`), exakt wie
`AmbientEffects`/`BlessingPanel` es heute schon für ihre eigenen Zwecke tun — kein GameState,
kein Determinismus-Problem (rein kosmetisch, nie simulationsrelevant).
**Art-Bedarf:** Bestand (CSS-Overlay auf vorhandenen Zonenbildern, kein neues Bildmaterial).
**Aufwand:** S–M je nach Anzahl der Einbindungsstellen (Zonenkarten + Kampfhintergrund).
**Risiko:** Konflikt mit einer schon getroffenen Chef-Entscheidung; Gefahr, dass es wie ein
Wieder-Reinschmuggeln des verworfenen Wetter-Themas wirkt, wenn es nicht klar als „nur Uhrzeit,
kein Wetter" kommuniziert wird.
**Abhängigkeiten:** explizites Chef-GO, sonst nicht bauen.

### 7. Elite-Ankunft als kurzer Bühnenmoment auf der Zonenkarte (Ausbau)
**Erlebnis:** Statt dass ein Elite einfach als stiller Badge auf der Zonenkarte auftaucht (heute:
`.zone-card-elite-badge`), blitzt beim ERSTEN Erscheinen (nicht bei jedem Tick-Refresh) ein
kurzer, dezenter Banner-Impuls über genau dieser Karte auf — eine halbe Sekunde, kein Modal, kein
Sound-Zwang. Man sieht auf einen Blick über die Zonenübersicht hinweg, WO gerade etwas Besonderes
passiert ist, ohne dass man die Seite aktiv beobachten musste.
**Engine/Idle-Weg:** Reine Übergangserkennung im Renderer (vorher „tracks"/„quiet", jetzt
„active") auf demselben `eliteBoardStatusForZone`-Signal, das die Badges schon liefern — kein
neuer State, nur ein zusätzlicher `useEffect`, der auf den Kind-Wechsel reagiert (Muster wie
`DungeonClearCeremony`s (dungeonId, clearNo)-Erkennung, nur viel kleiner).
**Art-Bedarf:** Bestand (CSS-Puls auf vorhandenem Kartenbild, kein neues Bild nötig).
**Aufwand:** S.
**Risiko:** Gering, aber Zonenkarten rendern auf einer Seite, die potenziell viele Karten
gleichzeitig zeigt — der Impuls darf nicht pro Tick neu antriggern (Perf + Flacker-Risiko).
**Abhängigkeiten:** keine.

### 8. Begleiter-Meldungen auf der Companion-Seite (Ausbau des NpcGreeting-Musters)
**Erlebnis:** Auf der Begleiter-Seite (`PetGalleryPage`) bekommt der aktuell aktive/liebste
Begleiter eine kleine Sprechblase mit einer kurzen, launigen Zeile — normalerweise eine von
mehreren Zier-Sprüchen, gelegentlich (analog zu `npcVoice.ts`) eine Zeile, die auf den jüngsten
Erfolg reagiert („Schon wieder ein Elite erlegt? Ich bin beeindruckt."). Begleiter fühlen sich
dadurch wie Mitreisende an, nicht wie eine Sammelliste.
**Engine/Idle-Weg:** Technisch eine reine Wiederverwendung von `NpcGreeting`/`NpcSpeechBubble` +
derselben Bedingungslogik wie `npcVoice.ts` (Elite/Todeszahl/Segen), nur mit begleiter-eigenen
Textzeilen statt NPC-Zeilen. Kein neuer Engine-State nötig, solange man bei denselben Signalen
bleibt, die die vier bestehenden NPCs schon nutzen.
**Art-Bedarf:** Bestand — Begleiterbilder existieren bereits (`assets/pets/`).
**Aufwand:** S (Bausteine existieren, nur neue Content-Texte + eine fünfte Verdrahtungsstelle).
**Risiko:** Gering; muss inhaltlich zur Begleiter-Persönlichkeit passen, nicht wie eine Kopie der
NPC-Stimme wirken — reine Textarbeit, aber Textarbeit mit eigenem Ton.
**Abhängigkeiten:** Content-/Lore-seitige Sprüche je Begleiter (oder generisch je Begleiter-Typ).

### 9. Post als Quest-Eingang, nicht nur Geschenk-Eingang (Ausbau, Engine-Ask)
**Erlebnis:** Heute kommen Briefe von Brenna/dem Wächter gelegentlich mit einem kleinen Geschenk
an. Idee: manche Briefe kündigen stattdessen eine neue Quest oder ein neu erreichtes
Chronik-Kapitel an — „Ein Bote hat einen Auftrag hinterlassen" statt dass die Quest kommentarlos
in der Liste auftaucht. Das Postfach wird zum fühlbaren Kontaktpunkt der Welt zum Spieler, nicht
nur zur Bonus-Kiste.
**Engine/Idle-Weg:** `MailMessage`/`mailbox`-System existiert (`packages/engine/src/mail.ts`) und
kennt bereits einen `letter`-Kind mit Absender. Eine neue Verwendung „Brief zeigt auf Quest X"
bräuchte entweder ein neues optionales Feld am Brief (Quest-Referenz) oder eine reine
UI-Koinzidenz-Regel („zeige den Brief gleichzeitig mit Quest-Freischaltung"). Das ist ein Antrag
an Logic-Dev/Content-Dev, kein reiner UI-Umbau.
**Art-Bedarf:** Bestand (bestehendes Brief-Layout + Portraits).
**Aufwand:** M, aber überwiegend außerhalb meines Reviers.
**Risiko:** Zwei Systeme (Mailbox + Quest-Freischaltung) laufen heute unabhängig — sie
künstlich zu koppeln, ohne dass es sich erzwungen anfühlt, ist eine Design-, nicht nur eine
Umsetzungsfrage (Reihenfolge: kommt der Brief vor oder nach der sichtbaren Quest?).
**Abhängigkeiten:** Logic-Dev (Feld/Signal am Brief), Content-Dev (welche Quests bekommen einen
Brief), Lore-Dev (Brieftext).

### 10. Baufertigstellung als kleine Zeremonie (Ausbau der bestehenden Zeremonien-Familie)
**Erlebnis:** Ein fertiggestelltes Lagergebäude verschwindet heute kommentarlos aus der
Bauwarteschlange. Ein kurzer, ruhiger Moment im Stil der bestehenden Zeremonien (kleiner:
Gebäude-Emblem, Name, „fertiggestellt", evtl. der neue Bonus in einer Zeile) gäbe dem Lagerausbau
denselben Respekt, den ein Dungeon-Clear oder ein Meisterschafts-Aufstieg schon hat.
**Engine/Idle-Weg:** Gleiches Muster wie `DungeonClearCeremony`/`MasteryCeremony` — Snapshot-
Vergleich auf `campBuildingLevel`/Bauqueue-Länge pro Tick, kein Engine-Eingriff, keine
Save-Änderung (rein clientseitige Erkennung eines Zustandsübergangs, exakt wie die bestehenden
Ceremonies es schon vormachen).
**Art-Bedarf:** Bestand (Gebäude-Icons existieren bereits im Lager-System).
**Aufwand:** M (neue Komponente nach bestehendem Bauplan, plus Übergangserkennung für ALLE
Gebäudetypen, nicht nur einen).
**Risiko:** Bauten sind häufiger als Dungeon-Clears in der Frühphase (viele kleine Ausbaustufen) —
eine volle Zeremonie bei JEDER Stufe würde schnell nerven. Muss deutlich leiser/kürzer sein als
die großen Vorbilder, evtl. nur ab bestimmten Meilenstein-Stufen (z. B. neues Gebäude zum ersten
Mal, nicht jede Stufe 2→3).
**Abhängigkeiten:** keine neuen Engine-Felder (Bauqueue-Zustand ist schon vorhanden).

### 11. Aufgabentafel als physisches Brett (visuelle Neuinterpretation, Content-Abhängigkeit)
**Erlebnis:** Statt einer Liste liegen die aktiven/wählbaren Tagesaufträge als angepinnte Zettel
auf einer Holz-/Basalt-Tafel (bestehendes `parchment.svg` + Wachssiegel-Emblem als Pin), mit
Ablehnen/Tauschen als physischer Geste („Zettel abreißen"). Das ist die naheliegende visuelle
Antwort auf den Chef-Wunsch „besser als 60 Zufallszettel" — aber ich will nicht vorschlagen, ich
könnte die Auswahlregel selbst erfinden.
**Engine/Idle-Weg:** Die REIN VISUELLE Fassung (heutige Dailies als Zettel-Optik statt Kartenraster)
ist ein reiner UI-Umbau, keine Systemänderung. Die im Kontext-Dokument genannte Mechanik „3 aus 6
wählen, ablehnen/tauschen" ist dagegen eine Content-/Logic-Entscheidung (Pool-Ziehung, Ablehn-
Cooldown, Tausch-Kosten) — das gehört in die Perspektive von Content-Dev/Balance-Dev, ich würde
hier nur die fertige Regel zeichnen.
**Art-Bedarf:** Bestand (parchment.svg, Wachssiegel-Emblem, bestehende Basalt-/Leder-Texturen).
**Aufwand:** M (rein visuell) bzw. L (falls „3 aus 6" mit-warten muss, weil die Regel noch nicht
existiert).
**Risiko:** Größtes Risiko ist Reihenfolge — eine hübsche Tafel für eine Auswahlregel bauen, die
sich in der Content-Perspektive noch ändert, ist verlorene Arbeit. Sollte NACH der Mechanik-
Entscheidung kommen, nicht davor.
**Abhängigkeiten:** Content-Dev/Balance-Dev (Auswahlregel), erst danach UI.

## Ein Tag im Leben

Morgens öffnet sie das Spiel, und der Wächter-Bericht sagt in zwei Zeilen, was in der Nacht
geschah — dieses Mal kein Tod, aber ein Elite in den Highlands und ein Brief im Postfach; sie
öffnet ihn kurz, sieht ein kleines Geschenk und eine neue Zeile in der Chronik. Sie stellt eine
neue Aktion in die Warteschlange, wirft einen Blick auf das Wochenrad im Segen-Panel und sieht:
morgen ist Blutmond, also plant sie den großen Dungeon-Lauf lieber auf morgen. Auf dem Weg zur
Slayer-Seite fällt ihr die Weltpuls-Zeile im Doing-Kasten auf — „frische Spuren in den Highlands" —
und sie schiebt kurz einen Kampf-Eintrag vor die Warteschlange. Mittags, kurzer Blick vom Handy
aus der Mittagspause (nur der Gedanke daran reicht schon): die Zonenkarte zeigt einen kurzen
Banner-Impuls, der Elite ist tatsächlich erschienen und mittlerweile wieder verschwunden — sie
sieht es im Chronik-Feed nach, ohne die Sitzung neu starten zu müssen. Nachmittags baut die
Lagerwarteschlange fertig, eine kleine Zeremonie zeigt das neue Gebäude, und auf der Marktplatz-
Karte steht jetzt eine Figur mehr herum. Abends, beim „Ernten" nach einem langen Arbeitstag, liest
sie den vollen Wächter-Bericht — dieses Mal mit der neuen Zeile „Der Lagerbau wurde fertig,
während du fort warst" — und öffnet den Begleiter-Tab, wo ihr Wolf mit einer kleinen Zeile auf die
gute Kill-Serie reagiert. Sie klickt sich einmal quer durch Postfach, Quests und Chronik-Feed,
bevor sie die nächste Warteschlange füllt und das Fenster wieder schließt. Nichts davon hat sie
aufgehalten — jede Fläche war ein Blick, keine Aufgabe.

## Drei Fragen an den Chef

1. **Wie viel „Nachlesen" ist morgens noch Vergnügen und ab wann Pflicht?** Wächter-Bericht +
   Chronik-Feed + Weltpuls-Zeile decken zusammen viel Boden ab — soll ich auf den knappen,
   bestehenden Wächter-Bericht-Stil zuspitzen (Ausbau, kein neues Fach) oder ist ein zusätzliches,
   freiwilliges „Nachschlagewerk" (Chronik-Feed) erwünscht, auch wenn es nie alle Spieler öffnen?
2. **Ist die Zeit-Tönung auf Zonenkarten (Idee 6) trotz der Ambient-Entscheidung vom 24.07.
   („nur Vignette") überhaupt noch ein Thema, oder gilt „kein Wetter/keine Tageszeit-Effekte" als
   endgültig erledigt?** Ich will hier keine bereits gefällte Entscheidung wieder aufrollen, ohne
   ausdrücklich zu fragen.
3. **Wie weit dürfen Begleiter/NPCs an Persönlichkeit wachsen — bleibt es bei Zier-Sprüchen
   (aktueller Umfang von NpcGreeting/npcVoice), oder ist ein echtes „Erinnerung/Gunst"-System
   (aus dem Kontext-Dokument genannt) für 1.2.0 wirklich gewollt?** Das ist ein Aufwand-Sprung von
   S auf L (neuer persistenter State, neue Save-Version) — lohnt sich früh zu klären, bevor
   Logic-Dev danach gefragt wird.

## Prüfliste für die anderen Perspektiven

- **Bounty-Board-Lehre beachten:** jedes neu vorgeschlagene, fest verankerte Panel im
  Hauptinterface sollte sich fragen lassen, ob es nicht besser ein schwebendes/kollabierbares
  Element wird (Vorbild `EliteMiniWindow`) — das Hauptinterface hat schon einmal ein Feature aus
  genau diesem Grund zurückgebaut bekommen.
- **Perf-Gate-Pflicht:** jede Idee, die im Header/in der Sidebar/auf einer Seite mit hoher
  Verweildauer läuft, braucht ein eigenes Selector-Gate (Primitiv-Tupel + `tupleEquals`, Muster
  aus der Perf-Welle A) — „einfach `useGameState()` reinziehen" reißt die bestehende
  Tick-Performance wieder auf.
- **Ambient-Entscheidung 24.07. respektieren:** alle Wetter-/Tageszeit-/Partikel-Ideen anderer
  Perspektiven brauchen ein explizites, neues Chef-GO — die Entscheidung „nur Vignette" ist
  bewusst getroffen worden, nicht vergessen worden.
- **i18n-Vollständigkeit:** jede neue Textquelle (Feed-Einträge, neue NPC-/Begleiter-Zeilen,
  Briefe) braucht komplette en/de-Paare plus Einhaltung der Ein-Gedankenstrich-Regel — bei vielen
  neuen Kurztexten (z. B. „Tagesbrett" mit vielen Zetteltexten) ist das ein nicht-trivialer
  Übersetzungsumfang, den ich in Aufwandsschätzungen anderer sehen möchte.
- **Save-Kompatibilität bei „Erinnerung"/„Gunst"-artigen Ideen:** alles, was NPC-Beziehungen,
  Feed-Historie über Offline-Grenzen hinweg oder Brett-Auswahlzustand dauerhaft speichert, braucht
  SAVE_VERSION + Migration von Anfang an mitgedacht, nicht als Nachtrag.
- **Klare Trennung Mechanik vs. Optik:** Vorschläge wie „Aufgabentafel 3 aus 6" oder neue
  Belohnungsstrukturen sind Content-/Balance-Entscheidungen — ich möchte prüfen, dass UI-nahe
  Brainstorms diese nicht selbst festlegen, sondern als Abhängigkeit an Content-Dev/Balance-Dev
  auslagern (wie ich es bei Idee 11 gemacht habe).
- **Reuse vor Neuerfindung:** wo eine andere Perspektive einen neuen NPC/ein neues Dialogsystem
  vorschlägt, prüfe ich, ob `NpcGreeting`/`NpcSpeechBubble` + `npcVoice.ts`-Bedingungslogik nicht
  schon 80 % davon abdeckt — Wildwuchs an Paralleldialogsystemen wäre teurer als nötig.
