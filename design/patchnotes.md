# Grim Reach — Änderungsprotokoll (Quelle für Steam-Patchnotes)

**Ab 2026-07-20 (Chef-Regel): JEDER Fix / jede Änderung wird hier eingetragen** — dies ist die
Quelle, aus der die Steam-Update-Posts geschnitten werden. Wenn ein Build live geht: die Sektion
„Unveröffentlicht" in eine Versions-Überschrift umbenennen (z. B. `## 0.1.1 — 2026-07-2x`) und
oben eine neue leere „Unveröffentlicht"-Sektion anlegen.

Je Eintrag: eine kurze **spieler­taugliche** Zeile (fürs Steam-Post) + optionale _Dev-Notiz_
(kursiv, wird NICHT ins Steam-Post übernommen).

---

## Unveröffentlicht — Sammelnotizen für den nächsten Patch (Stand 25.08.2026)

_Chef-Regel vom 25.08.: alles, was seit dem 1.0.2-Upload geändert wurde, landet hier, auch
Halbfertiges (mit „in Arbeit" markiert). Beim nächsten Upload: Versions-Nummer festlegen, die
„in Arbeit"-Marker auflösen, Steam-Post daraus schneiden._

**Runen lassen sich stapeln:** DE: Drei Plätze, drei gleiche Runen, dreifacher Bonus. Ein Spieler
hatte es als Fehler gemeldet („armor have 3 slots, but you can only put in 1 enchantment rune") und
recht: eine Sperre aus dem Juli ließ dieselbe Rune nur einmal zu. Aktiv-Effekt-Runen (Flamme,
Frost, Schock) bleiben einmalig pro Item: ihr Effekt stapelt nicht, eine zweite brächte nichts. /
EN: Three slots, three identical runes, triple the bonus. Effect runes (Flame, Frost, Shock) stay
one per item since their proc does not stack.

*Dev-Notiz: `duplicate_affix` entfernt, neuer Code `duplicate_effect` nur für Affixe mit
`weaponEffectByTier` (`affixHasActiveEffect`). Balance-Hülle neu gepinnt: der theoretische BiS-Build
erreicht jetzt den Ausweich-Deckel ab CL 60 und den Mitigations-Deckel bei CL 90 (beides Clamps);
Ward-Pool CL 90 steigt 780 → 1180, als Beobachtungspunkt im Suitenkopf notiert. Enchant 30 Tests,
Hülle 31 grün.*

**Monster-Ausrüstung ist jetzt immer besser als das Handwerk (Rezension #8):** DE: Von 215
Kampf-Uniques waren 108 schlechter als das, was man in derselben Zone schmieden konnte, 103 hatten
keinen Effekt. Jetzt gilt: ein Drop trägt mindestens die Werte des nächsten Handwerks-Tiers, ein
Requirement des aktuellen, und einen Effekt. Dafür fallen die Drops seltener (Erwartungswert
bleibt), Chase-Items bleiben unter 0,1 %. 33 Drops, die nur Kopien von Craft-Teilen waren, geben
stattdessen Material. / EN: Dropped gear now always beats crafted gear of its tier and carries an
effect; drop rates are lower to compensate.

*Dev-Notiz: 149 Drop-Uniques + 11 Elite-Uniques + 20 vom Wächter gefundene; 258 Loot-Zeilen.
Effekte aus der bestehenden Palette (vengeance, cooldownOnKill, desperation, healOnKill,
giantSlayer, antiRegen, firstBlood, eagleEye, momentum), Legendäres mit hpRegenPerSec. Hülle:
harte Deckel halten, Mess-Pins neu (Krit CL30 ranged am Deckel, Tank CL60 +40 AR, TTK ranged
−10 %). Wächter drop-gear-beats-craft.test.ts. Kein Save-Bump; Alt-Saves ziehen die Werte über
den Base-Item-Lookup.*

**Belohnungs-Shop in sechs Regalen (Rezension #13):** DE: Der Token-Shop hatte neun Angebote,
die später nichts mehr wert waren. Jetzt sechs Regale, die mit der Chronik aufgehen (offen, dann
Kapitel 4, 9, 14, 18, 20), 47 Angebote aus Speisen, Tränken, Tonika und Saat, gesperrte Regale
bleiben sichtbar mit „Erfordert Chronik-Kapitel“. Keine Runen (die gibt es nur über Runenkunst),
keine Ausrüstung, nichts aus dem Endgame. Dazu zehn Tagesaufgaben für Hochland, Götzenhalle und
Endgame-Handwerk. / EN: The token shop now has six chapter-gated shelves with 47 offers, plus ten
late-zone daily tasks.

*Dev-Notiz: Kapitel-Gate in `buyTokenShopOffer` (Reason `shelf_locked`), kein Save-Bump. Chef-
Entscheide: Variante A für 1.1.0, Quest-Hub und mehr Dailies kommen mit 1.2.0 „Alive“. Offen: obere
Gesamtlevel-Schranke für very_easy/easy-Dailies (logic-dev).*

**Kochen: Portionen statt Bissen (Rezension #11):** DE: Viele Gerichte brauchten 10 bis 24 Sekunden
und bis zu sechs Zutaten für einen Bissen, der kaum mehr heilte als ein einfacher Fisch. Sechzehn
Gerichte liefern jetzt 2 bis 4 Portionen je Kochvorgang, zehn Grundspeisen heilen einen Punkt mehr,
und je Kampfstil gibt es Gerichte mit spürbarer Zutat: Rüstung für Nahkampf, Ausweichen für
Fernkampf, Schild für Magie, Lebensregeneration für Tanks. / EN: Sixteen dishes now yield two to
four portions per cook, and each combat style has dishes with a matching bonus.

*Dev-Notiz: Dauer und XP je Rezept unverändert (Sim-XP identisch), Wert je Portion geteilt.
Balance-Hülle: harte Deckel halten, sechs Mess-Pins neu (Tank +12 armorRating, Ward +30). Wächter
food-portions.test.ts (94). Offen: zwei Gerichte für die Fernkampf/Magie-Lücke L20 bis L47,
cook_beef-XP-Kuriosität (7 statt 6).*

**Anbau: Folgesorte je Beet (Rezension #12):** DE: Auf einem wachsenden Beet lässt sich wählen,
was danach gesät wird („Danach säen …“, Chip „→ Grimmkorn“). Der Plan gilt einmal, danach läuft das
Beet mit der neuen Sorte weiter. Fehlt die Saat, bleibt das Beet leer und der Plan wartet mit
Warnung; „Jetzt wechseln“ rodet und sät sofort; „Für alle Beete danach säen“ rechnet vor. / EN: Pick
what a plot sows next; the plan waits with a warning if you lack the seed.

*Dev-Notiz: `FarmPlot.nextCropId`, SAVE_VERSION 81 → 82 (Migration null, Sanitize strippt
unbekannte Sorten), Reife-Schleife in farming.ts auf „solange elapsed ≥ growMs(aktuelle Sorte)“
umgebaut, offline == online per Test. Chef-Entscheid: kein Rückfall auf die alte Sorte.*

**Suffixe und Attribute passen zur Rüstungsklasse (Rezension #14):** DE: „Nahkampf-Teil mit +2
Intelligenz?“ Ursache war das gemeinsame Pool-Tag aller Rüstung: Platte rollte zu 55 % Eule, Weiser,
Orakel. Jetzt eigene Pools je Klasse (Platte stärke/konstitution, Leder geschick/glück, Stoff
intelligenz/weisheit, Schmuck frei), zehn Items mit festen klassenfremden Werten getauscht, vier
„wendige“ Plattenteile sind jetzt Leder. Bereits gerollte Suffixe bleiben gültig. / EN: Suffixes and
fixed attributes now match the armour class.

*Dev-Notiz: Tags armor_plate/leather/cloth in `itemTypeTags` zusätzlich zu `armor` (Runen-Gate
unberührt), neun Pools umgehängt, Adler ohne Magiewaffen. Balance-Hülle neu gepinnt (Krit-Cap
CL 30 nicht mehr gebunden, ranged TTK +5 %). Kein Save-Bump.*

**Kohleflöze ab 50, 75 und 90 (Rezension #15):** DE: Ein Spieler: „Schmieden braucht im Lategame
überall zwei Kohle, Kohle gibt kaum XP.“ Jetzt gibt es das Tiefe Kohleflöz ab 50 (2 Kohle je
Abbau), das Reiche ab 75 (3) und das Uralte ab 90 (4), im selben Tempo wie das alte Flöz, mit XP
auf der Bergbau-Kurve. / EN: Three new coal seams at 50, 75 and 90 yield 2, 3 and 4 coal per swing.

**Erfolge: gemalte Kategorie-Embleme:** DE: Die zehn Kategorie-Symbole im Rarity-Ring waren
Strichzeichnungen; jetzt gemalte Embleme (Pokal, Amboss, Klingen, Ähre, Zahnrad, Siegelrolle,
Münzsack, Truhe, Kompass, Stern) plus Meilenstein. / EN: Achievement category emblems are now
painted icons.

**14 neue Runen für das Endgame (Tier IV und Schmuck):** DE: Ab Runenkunst 85 bis 95 gibt es
neun Waffen- und Rüstungsrunen der Stufe IV und erstmals fünf Schmuckrunen für Ringe, Amulett und
Umhang: Kriegspfad, Zweiter Pfeil, Dünner Schleier, Auszehrung, Gericht, Eiserne Antwort,
Hinterhalt, Schleiertrinker, Ungebrochene Mauer, Kopfgeld, Zähler, Rastlose, Chronik, Nachlese. Alle
mit eigener Wirkung statt mehr Zahl, jede einmal pro Item. / EN: Fourteen new runes from
Runecrafting 85 to 95, including the first jewellery runes.

*Dev-Notiz: design/runen-tier-iv.html. Drei neue Effekt-Arten (blockRestore, combatXp,
lootChance), `requiresTrinity`-Gate, kein Save-Bump. Bilder von Mira, 640 px WebP. Offen: TTK-Sim-
Pin für Zweitschlag + Auszehrung vor einer Entscheidung über den Rückfall auf 0,35.*

**Der Tooltip zeigt die Verzauberungs-Plätze:** DE: Jedes Ausrüstungsteil zeigt „Verzauberung 1/3",
belegte Plätze mit Effekt, freie als leere Steine und einen Satz, wofür sie da sind. Runen nennen
ihr Ziel („Passt auf: Plattenrüstung") und den Grund, wenn sie nicht passen. / EN: Every piece of
gear shows its enchantment slots, filled and empty, and runes say what they fit.

*Dev-Notiz: `runeTargets.ts` liefert das ECHTE Ziel inkl. Trinity-Klasse (Platte/Leder/Stoff statt
pauschal „Rüstung"). Der Verzauberungstisch blendet Runen jetzt nach derselben Kette ab wie
`applyEnchant` (Tag + Trinity-Gate), Grund im Hover statt Banner nach dem Fehlversuch.*

**Runen aus dem Lager:** DE: Der Verzauberungstisch nimmt Runen aus Inventar und Lager, das Grimoire
zeigt beide Bestände. / EN: The enchanting table draws runes from storage as well.

*Dev-Notiz: an der Wurzel in `applyEnchant` (Inventar zuerst, dann Lager), nicht per UI-Umweg, der
bei vollem Rucksack scheitern würde.*

**Varianten-Tasche: die Suche schließt die Box nicht mehr:** DE: Beim Tippen schrumpfte die Liste,
der Mauszeiger lag plötzlich außerhalb, das Fenster ging zu. Jetzt bleibt es offen, solange die
Suche benutzt wird. / EN: Searching in a gear stack no longer closes the box.

**Slayer: kämpfen direkt vom Auftragszettel:** DE: „Sofort kämpfen (48)" und „Einreihen (48)" mit der
Restmenge als Ziel. / EN: Fight now or queue up straight from the slayer task, with the remaining
count preset.

**Kampf: Zonen-Knopf während des Kampfes:** DE: Oben links „Zonen", gleicher Knopf wie „Kampf
beenden": zeigt die Gegnerliste zum Nachlegen, der Kampf läuft weiter. / EN: A Zones button during
combat opens the enemy list without ending the fight, so more battles can be queued.

**New Haven: Bauwarteschlange:** DE: Was nach dem laufenden Bau drankommt, lässt sich planen:
Reihenfolge, Verschieben, Entfernen. Bezahlt wird beim Start, nicht beim Einreihen; reicht das
Material dann nicht, wartet der Eintrag und sagt warum. / EN: Queue up what builds next in New
Haven. Costs are paid when a build starts, not when it is planned.

*Dev-Notiz: SAVE_VERSION 80 → 81, `camp.buildQueue` (Deckel 8). Migration: leere Liste. Kette läuft
offline bit-identisch (Determinismus-Test). Vault-Pin v80 ist damit ein Migrations-Pin; das
v81-Fixture kommt beim Release ins Vault.*

**Stahlrahmen: die Eckbeschläge sind jetzt ganz zu sehen:** DE: Der Eisenrahmen (Quest-Menü,
Warteschlange, New Haven, Kopfleiste und mehr) wurde mitten durch die Eckklammer geschnitten und
die halbe Klammer als Kante gestreckt. / EN: The iron frames no longer stretch half a corner
bracket along the edge.

*Dev-Notiz: `nav-bronze-lipped-iron-9slice.webp`: Band 39 px, Eckklammer 80 px, Schnitt war 40.
Jetzt 85, Breite × 2.125, damit die sichtbare Banddicke exakt gleich bleibt (Lehre aus dem
Holzrahmen-Fix). 50 Stellen, 14 Dateien.*

**Anbau: Samen-Auswahl überholt, „Alle bepflanzen" rechnet vor:** DE: Das Fenster war 480 statt
880 px breit (eine spätere CSS-Regel schlug die eigene), die Karten quetschten sich auf vier
Zeilen. Jetzt breit, drei Spalten, Name und Stufe in der Kopfzeile, Fakten einzeilig. „Alle
bepflanzen" zeigt freie Beete und „Besät 3 von 9 Beeten", warnend, wenn die Saat nicht reicht. /
EN: The seed picker is wide and readable, and Plant All shows how many plots it will sow before
you click.

**„Voraussetzung nicht erfüllt" kam bei jedem Start zurück:** DE: Ein aus der Warteschlange
entfernter Kampf wurde per × nur im Fenster weggeklickt, nicht im Spielstand; beim nächsten Start
stand die Meldung wieder da, auch wenn die Voraussetzung längst erfüllt war. / EN: The removed
from queue notice no longer returns on every load.

*Dev-Notiz (Spieler-Report 1.0.2): `lastQueueSkip` wird vom Panel im State quittiert; die
Persistenz prüft den Grund beim Laden gegen das echte Gate neu (`canFightMonster`). Neuer Test
`queue-skip-load.test.ts`.*

**Ein erzwungener Kampf verschluckte den laufenden Auftrag:** DE: Wer aus dem Bestiarium einen
Kampf startete, während eine Aktion mit Mengen-Ziel lief, verlor diese Aktion. Sie wandert jetzt
an die Queue-Front. / EN: Starting a fight from the bestiary no longer drops the running order.

*Dev-Notiz (Chef-Report): `startCombat` stellt endliche Aufträge selbst zurück, damit jeder
Aufrufer sicher ist. Nur endliche Ziele (Sims starten Kämpfe direkt, ihre Queue würde sonst
wachsen). `queue-forced-fight.test.ts`.*

**Warteschlange lesbar (Spieler-Report Aldric, 67 h):** DE: Der Aktionsname brach buchstabenweise
um; die Menge steht jetzt unter dem Namen neben der Dauer. / EN: Queue names no longer wrap one
letter per line.

**Stehlen: Beute-Box ohne die vier leeren Kästen:** DE: Bei Aktionen ohne Zutaten fällt das leere
Zutaten-Rack weg, die Beute bekommt den Platz und scrollt nicht mehr. / EN: The thieving loot box
no longer scrolls next to four empty crates.

**Schmieden: Dauer hängt an den Barren:** DE: Ein Plattenpanzer aus fünf Barren gab
99 XP, ein Streitkolben aus drei 120. Jetzt dauert jedes Stück Barren × Tier-Sekunden, XP pro Barren
sind gleich, XP pro Stunde bleiben auf Kurve. Nur Schmieden. / EN: Smithing time now scales with
bars used, so XP per bar is consistent. Smithing only.

*Dev-Notiz: Option B aus `design/smithing-xp-barren.md`. content-dev wendet Anhang A3 an, Wächter
`smithing-xp-per-bar.test.ts`.*

**Kopfleiste: Fortschritts- und XP-Balken im „Doing"-Kasten:** DE: Der Kasten ist breiter und
zentriert, beide Balken sitzen jetzt darin; der doppelte Mini-Balken ist weg. Bei 1600 und 1366 px
Breite nutzt er den freien Platz (402 → 661 px bei 1366). / EN: The activity panel now holds both
progress bars and uses the free space at smaller widths.

**Warteschlange: Level-Projektion je Eintrag:** DE: Unter der Menge steht, welches Level der Skill
nach diesem Eintrag hat (⛏ 24 → 34), kumulativ durch die Warteschlange. Nur bei endlichem Ziel
und nur, wenn sich das Level ändert. / EN: Each queued action shows the skill level you will have
when it finishes.

**Warteschlange: keine Trennstriche mehr im Namen:** DE: „Kupfera-der" war gestern. Passt ein Wort
nicht neben die Knöpfe, rutschen die Knöpfe darunter. / EN: Queue names no longer hyphenate.

**Item-Wiki neu gebaut:** DE: Das Fenster hinter dem „?" im Tooltip war 460 px schmal. Jetzt groß
(bis 1280 px), großes Bild, Kernwerte als Chips, „Quelle" und „Verwendet für" als zwei Kartenraster
mit Monsterbild und Chance bzw. Rezept und Ergebnis. / EN: The item wiki is large and readable, with
Source and Used-for as card grids.

*Dev-Notiz: Monster, die aus Zone, Dungeon-Welle und Turm droppen, standen doppelt; jetzt eine
Karte je Kreatur, plus Legende für das Zonen-Gate (ausgegraut = Zone noch gesperrt).*

**Schmieden: Items als Leiter ab Barren-Level:** DE: Mithril-Barren ab 35, aber der
erste Mithril-Dolch erst ab 40, und so in sechs Tiers. Jetzt liegt der Dolch auf dem Barren-Level,
danach Schwert und so weiter bis zum Plattenpanzer am Ende des Tiers. / EN: The first item of each
smithing tier now unlocks with its bar; items spread across the tier.

*Dev-Notiz: Chef-Entscheid „Erstmal nur Smithing". Lederverarbeitung hat dieselbe Lücke zweimal
(Drachenhaut 78 → erstes Item 82, Schattenhaut 90 → 95) und bleibt bewusst unangetastet.*

**Bank und Sidebar im Fenstermodus (Steam-Rezension):** DE: Bei 1600×900 zeigte das Lager drei volle
Zeilen, jetzt sechs; Sprechblase und Filterleiste werden unter 1040 px Höhe kompakt. Die Sidebar
zeigt bei 1600×900 alle Einträge, und wo sie doch scrollt, verrät ein weicher Verlauf, dass es
weitergeht. / EN: In windowed mode the bank shows six full rows instead of three, and the sidebar
fits or signals that it scrolls.

**Warteschlange: eigene Tooltips statt Browser-Titel:** DE: Die Hinweise verschwanden
unter dem Cursor; jetzt dieselben Tooltips wie bei den Charakter-Werten. / EN: Queue tooltips no
longer vanish under the cursor.

---

## 1.0.2 — RELEASED (Build 24906831, 2026-08-25, `setlive` leer)

**Der Rundgang erklärt jetzt auch Warteschlange und New Haven:** DE: Beide standen bisher nur in
den Feature-Touren, und die feuern laut Code einmalig für Alt-Saves. Wer neu kauft, bekam weder
das Lager noch die Warteschlange je erklärt. Der Pflichtklick klappt die Warteschlange zugleich
auf. / EN: Both were only explained in the update tours, which fire once for existing saves. New
players were never shown either. The tour now covers both, and opens the queue panel for you.

*Dev-Notiz: Zwei Schritte in `onboarding-steps.ts` (23 → 25). New Haven an seiner echten
Sidebar-Position nach der Fertigkeitsübersicht, die Warteschlange nach dem Skill-Block, wo der
Spieler die zwölf Quellen gerade gesehen hat. Ziel ist der Rand-Tab von `ActionQueuePanel.tsx`
(`feature.queueExpand`, unbedingt gerendert); das Panel startet eingeklappt
(`getQueuePanelCollapsed` liefert ohne gespeicherten Wert `true`), der Klick klappt es auf UND
persistiert das. Dabei aufgefallen: das Update-Popup erschien auch für brandneue Charaktere und
legte sein `modal-overlay` über den Rundgang, dessen erster Pflichtklick ging ins Leere — jetzt
unterdrückt, solange `onboarding.done` false ist, ausser der Spielstand war wirklich betroffen
(Schild-Brief im Postfach). Verifiziert mit `ui-audit/onboarding-tour-285.mjs`: vorher Abbruch bei
Schritt 1, jetzt laufen alle 25 durch.*

**Die Klinge des Kronenlosen fällt öfter:** DE: Von 0,15 % auf 0,25 %. Ein Spieler hat 300 Kills
ohne Drop gemeldet und das bessere Argument gebracht: Dungeons lassen sich nicht in die
Warteschlange legen und starten nicht von selbst neu, jeder Versuch ist Handarbeit. / EN: From
0.15% to 0.25%. A player reported 300 kills without it and made the better argument: dungeons
cannot be queued and do not restart on their own.

*Dev-Notiz: `design/balance-drazhan-audit.md` §10. Der Wert lag dort seit dem 13.07. als offene
Chef-Frage („bei ~5-6 Kills/h = 1 pro ~120 h; falls ~60 h Chase-Ziel gewollt: 0,003“). Gewählt
ist die Zahl des Spielers, ~72 h. `sevenfold_crown_chain` @0,001 bewusst NICHT mitgeändert.
KOPPLUNG: sobald Dungeons queue-fähig sind (Chef-Ansage 24.08.), fällt die Begründung weg und
der Wert gehört neu verhandelt.*

**Melde-Weg sichtbar, mit freiwilligem Discord-Namen:** DE: Die Melde-Zeile sah nicht aus wie ein
Knopf und wurde übersehen. Dazu ein optionales Feld für den Discord-Namen, damit auf einen
Bericht geantwortet werden kann. / EN: The report entry did not look like a button. There is now
also an optional field for your Discord name, so a report can be answered.

**Politur:** DE: Das Schloss-Abzeichen an gesperrten Zonen ist wieder sichtbar, der Bank-Zähler
zeigt die vollständige Summe, und mehrere Begleiter-Beschreibungen versprachen Effekte, die es
nicht gab. / EN: The locked zone badge is visible again, the bank counter shows the full total,
and several companion descriptions promised effects that did not exist.

**Bögen brauchen beide Hände:** DE: Ein Spieler hat gefragt, ob Bogen und Kiteschild gleichzeitig
so gemeint sind. Waren sie nicht. Von 47 Fernkampfwaffen trugen 12 die Zweihand-Regel und 35
nicht, je nachdem ob sie gefunden oder geschmiedet wurden. Ab jetzt gilt für alle dasselbe: eine
Fernkampfwaffe belegt beide Hände. / EN: A player asked whether using a bow and a kite shield at
once was intended. It was not. Of 47 ranged weapons, 12 carried the two handed rule and 35 did
not, depending on whether they were found or crafted. The same rule now applies to all of them: a
ranged weapon takes both hands.

**Wenn dich das betrifft:** DE: Trugst du Bogen und Schild zusammen, wandert das Schild beim
nächsten Laden zurück in dein Gepäck. Verloren geht nichts, und im Postfach liegt ein Brief, der
es erklärt. Beim Start erscheint einmalig ein Hinweis. / EN: If you were carrying a bow and a
shield together, the shield goes back into your pack on your next load. Nothing is lost, and
there is a letter in your mailbox explaining it. A one time notice appears at startup.

*Dev-Notiz: `twoHanded: true` für alle 47 Fernkampfwaffen (auch die Knechts-Schleuder — sie ist
mechanisch ein `weaponType: "shortbow"` und wäre als einzige Ausnahme genau die Inkonsistenz, die
wir gerade abstellen; CHEF-ENTSCHEID falls anders gewollt). Die Load-Invariante war bereits da und
verlustfrei (Instanz mit Verzauberung reist mit, Inventar → Bank → Postfach), sie hat nur nie
ausgelöst, weil die Daten falsch waren. Der Detektor in `balance-envelope.test.ts` §6 hatte die
Inkonsistenz seit 2026-07-09 als OFFENE Content-Frage festgehalten — der Spieler hat sie
beantwortet, bevor wir es getan haben. Balance-Folge neu gemessen: ranged verliert die Offhand,
Spieler-TTK vs. idol_warden 91,59 → 95,57 s (+4,3 %), vs. last_idol 302,85 → 316,15 s (+4,4 %);
melee und magic unverändert. Kein SAVE_VERSION-Bump.*

**Neu: ein kurzer Hinweis nach jedem Update:** DE: Wenn ein Patch etwas an deinem Spielstand
ändert, sagt das Spiel es dir beim Start, einmal je Version. / EN: When a patch changes something
about your save, the game now tells you at startup, once per version.

*Dev-Notiz: `components/UpdateNotice.tsx`, gemerkt in `localStorage` je `__APP_VERSION__`, kein
Save-Feld und keine Migration. Die Punkte kommen aus nummerierten i18n-Schlüsseln
(`updateNotice.point1..n`) — ein künftiger Patch braucht nur neue Texte, keinen Code. Der
Schild-Absatz erscheint NUR, wenn der Spielstand wirklich betroffen war (erkennbar am Brief im
Postfach), damit der Text niemandem etwas erzählt, das ihn nicht betrifft. Anlass waren zwei
Berichte an einem Tag, die beide keine Defekte waren, sondern stille Änderungen: der
New-Haven-Umzug und der Zweihand-Fix.*

---

## 1.0.1 — unveröffentlicht

*Erste Polier-Runde nach dem 1.0-Release, gebaut aus den Spielerberichten der ersten Tage.*

**Klarstellung – New Haven ist umgezogen, nicht verschwunden:** DE: Seit 1.0 steht New Haven in der Seitenleiste an dritter Stelle, direkt unter Kampf. Vorher stand es ganz unten hinter allen 14 Fertigkeiten und lag auf den meisten Auflösungen unterhalb der sichtbaren Kante — wer nicht scrollte, kam gar nicht hin. Der Umzug hätte in den 1.0-Notizen stehen müssen; das holen wir hiermit nach. / EN: Since 1.0, New Haven sits third in the sidebar, right below Combat. It used to be at the very bottom behind all 14 skills, below the visible edge on most resolutions unless you scrolled. That move should have been in the 1.0 notes; this is us catching up.

*Dev-Notiz: Spieler-Report 23.08. „The New Haven disappeared in the lower left“ — kein Defekt, der Eintrag war im Screenshot des Spielers sichtbar. Lehre: ein verschobener Menüeintrag braucht IMMER eine Patchnote-Zeile, auch wenn die Verschiebung eine Reparatur ist.*

**Massenverkauf: alles auf einen Klick:** DE: Im Verkaufen-Reiter gibt es jetzt „Alle auswählen",
und mit gedrückter Umschalttaste lässt sich ein ganzer Bereich auf einmal markieren. Wer nach einem
langen Zug 30 verzauberte Fundstücke über sechs Grundtypen loswerden wollte, brauchte dafür bisher
dreizehn Klicks, jetzt einen. Vor der Buchung fragt das Spiel mit Anzahl und Gesamterlös nach. /
EN: The Sell tab now has a "select all" control, and holding Shift selects a whole range at once.
Clearing out 30 enchanted finds spread over six base types used to take thirteen clicks; now it
takes one. The game asks for confirmation with the item count and total gold before selling.

**Die Warteschlange sagt, wie lange sie braucht:** DE: Über der Liste stehen jetzt Gesamtdauer und
die voraussichtliche Uhrzeit, und jeder Eintrag zeigt seine eigene Restdauer. Kampfeinträge sind
als Schätzung gekennzeichnet, unendliche Einträge werden nicht hochgerechnet, und wo das Material
nicht bis zum Ziel reicht, steht das ausdrücklich dabei. / EN: The queue now shows its total
duration and the expected finish time above the list, and every entry shows its own remaining time.
Combat entries are marked as estimates, endless entries are not extrapolated, and where materials
run out before the target, the queue says so instead of inventing a number.

**Die Tutorial-Blase verdeckt nicht mehr den Knopf, den sie erklärt:** DE: Bei Zielen weit unten am
Bildschirmrand legte sich die Erklärblase über genau die Schaltfläche, auf die sie zeigte. Sie
weicht jetzt nach allen vier Seiten aus und ist breiter statt höher. / EN: For targets low on the
screen, the tutorial bubble could cover the very button it was pointing at. It now dodges to all
four sides and is wider rather than taller.

**Item-Tooltips liegen nicht mehr unter dem Mauszeiger:** DE: Die Infokarte erschien so dicht am
Zeiger, dass die Zeigergrafik ihre obere Ecke verdeckte. Sie steht jetzt über der Zeigerspitze. /
EN: Item tooltips appeared so close to the cursor that the cursor graphic covered their top corner.
They now sit above the pointer tip.

**Spiel verlassen, Charakter überschreiben, Varianten-Beutel:** DE: Drei Schaltflächen wirkten wie
kaputt: „Spiel verlassen" nahm keinen Klick an, das Überschreiben eines Spielstands tat scheinbar
nichts, und das Varianten-Popup verschwand hinter dem Bankfenster. Alle drei sind behoben. / EN:
Three buttons looked broken: "Quit Game" would not accept a click, overwriting a save appeared to do
nothing, and the variant popup vanished behind the bank window. All three are fixed.

*Dev-Notiz: Eine gemeinsame Ursache — Dialoge, die im DOM ihres Panels hingen und dessen
`pointer-events: none` bzw. `isolation: isolate` erbten, plus `window.confirm()`, das über einem
exklusiv-fullscreen Electron-Fenster nicht durchkommt. Alle Spiel-Bestätigungen laufen jetzt über
ein gemeinsames `ConfirmModal` per Portal am Body; `native-dialogs.test.ts` hält den Rückfall auf.*

**Sechs Ausrüstungsteile lassen sich wieder für ihren Wert verkaufen:** DE: Lederhelm, Lederwams,
rostiges Schwert, Holzschild, knorriger Stab und Jagdbogen hatten keinen hinterlegten Wert und
brachten deshalb nur 1 Gold. / EN: Leather helm, leather body, rusty sword, wooden shield, gnarled
staff and hunting bow had no sell value on record and therefore fetched only 1 gold.

**Attributwerte und Beschriftungen im Charakterblatt bleiben lesbar:** DE: Auf 1600×900 und
1366×768 wurden die Attributnamen und teils sogar die Zahlen von ihrer eigenen Karte verschluckt,
und „Loadouts" schrumpfte auf „UTS". Die Karten haben jetzt eine echte Mindesthöhe, und die
Ausrüstungsleiste bricht um, statt zu kappen. / EN: At 1600×900 and 1366×768 the attribute names
and sometimes even the numbers were swallowed by their own card, and "Loadouts" shrank to "UTS".
The cards now have a real minimum height, and the loadout bar wraps instead of clipping.

**Essen und Tränke halten sich jetzt überall an ihre Abklingzeit:** DE: Über das Charakterblatt liessen sich mitten im Kampf beliebig viele Tränke und Speisen hintereinander verbrauchen, weil die Abklingzeit dort nicht galt. Sie gilt jetzt an jeder Stelle, und der Klick sagt dir, dass du kurz warten musst. / EN: Through the character sheet you could down any number of potions and meals back to back mid-fight, because the cooldown did not apply there. It now applies everywhere, and the click tells you that you have to wait a moment.

*Dev-Notiz: Die Abklingzeit lag ausschliesslich in den Auto-Pfaden des Kampf-Ticks; `useConsumable` — der einzige manuelle Weg — kannte die Felder gar nicht. Hand und Automatik teilen sich jetzt einen Takt je Kategorie (`consume-gate.ts`), Essen und Trank bleiben getrennt, reine Buff-Tonika bleiben frei. Kein Save-Feld, kein SAVE_VERSION-Bump. CHEF-ENTSCHEID OFFEN: die Kill-Verschnaufpause sperrt jetzt auch das Essen von Hand — konsequent zur Engine-Regel „kein Gratis-Refill zwischen den Mobs“, aber falls du das anders willst, ist es eine Zeile.*

**Beschriftungen brechen um, statt abgeschnitten zu werden:** DE: Der Menüreiter zeigte „Meisterschaf“ statt „Meisterschaft“, Item-Namen in der Verzauberung endeten mitten im Wort, und der Hinweis im Rückkauf-Feld ragte aus seinem Rahmen. Alle drei brechen jetzt sauber um. / EN: The menu tab showed "Master" instead of "Mastery", item names in enchanting ended mid-word, and the buyback hint spilled out of its frame. All three now wrap properly.

**Die Seitenleiste trennt nach Silben statt mitten im Wort:** DE: Ab etwa 1440 Bildpunkten Höhe wurde fast jeder Eintrag zweizeilig und mitten im Wort umgebrochen — „HOLZFÄLL / EN“, „KAM / PF“. Jetzt trennt das Spiel nach Silben, in allen sieben Sprachen. / EN: Above roughly 1440 pixels of height nearly every entry wrapped to two lines and broke mid-word. The game now hyphenates at syllable boundaries, in all seven languages.

**Gebäudetexte in New Haven sind wieder vollständig:** DE: Die Beschreibungen auf den Gebäudekarten waren auf zwei Zeilen festgenagelt; längere Texte brachen mitten im Satz ab. Sie stehen jetzt vollständig, die Karten bleiben gleich hoch. / EN: Building descriptions on the cards were pinned to two lines and longer ones cut off mid-sentence. They are now shown in full, and the cards keep their height.

**Fertigkeitsbeschreibungen in der Übersicht reden aus:** DE: Auf großen Bildschirmen brach der Text nach drei Zeilen ab. / EN: On large displays the text was cut off after three lines.

**Abgeschnittene Texte in den anderen Sprachen:** DE: Buff-Namen, Runen-Beschreibungen, Queststränge, die Zeitangabe im Hauptmenü, der Heldenname in der Charaktererstellung und die Werte in den Kampfleisten wurden je nach Sprache gekürzt, teils um die Hälfte. Alle sechs stehen jetzt vollständig. / EN: Buff names, rune descriptions, quest strands, the timestamp in the main menu, the hero name in character creation and the numbers on the combat bars were truncated depending on language, in places by half. All six are now shown in full.

*Dev-Notiz: Die erste Messrunde lief nur auf Deutsch — und Deutsch ist NICHT der schlimmste Fall. Die Gegenprüfung über en/de/fr/ru hat Stellen gefunden, die auf Deutsch gar nicht auffallen (Runen-Effekt ru 48 % weg, Buff-Namen ru 27-38 %). Künftige Sweeps mindestens mit ru + de fahren. Zweite Lehre: Die Messung kannte den Fall „Text verlässt seine Box und der Nachbar legt sich drüber“ nicht — dabei klippt nichts, also meldete sie 0 Funde, während der Screenshot fehlenden Text zeigte. Neues Kriterium „ueberdeckt“ in `clip-audit.mjs` (elementFromPoint als Beleg). Ausgangslage 333 Funde mit 85 kritischen, Endstand über alle 49 Szenen: 0 kritisch, 0 deutlich.*

**Ein Champion wird nicht mehr dort angekündigt, wo niemand hinkommt:** DE: In der Götzenhalle
wurde ein Champion gemeldet, obwohl die Halle über den normalen Kampfweg gar nicht betretbar ist.
Die Meldung erscheint dort nicht mehr. / EN: A champion was announced in the Idol Hall even though
the hall cannot be entered through normal combat. That announcement is gone.

*Dev-Notiz: Alle fünf Monster der Zone sind `dungeonOnly`, die Zone bekommt darum keine Zonenkarte
— der Champion war seit jeher unerreichbar. Spawn-Zyklus, Kampfstart, Toast und Mini-Fenster lesen
jetzt `isEliteZoneHuntable`; die Persistenz räumt Alt-Einträge beim Laden ab. Kein
SAVE_VERSION-Bump (Invariante auf bestehenden Daten, kein neues Feld), `eliteRng`-Strom
nachweislich unverändert. Damit liegen 2 der 28 Varianten still — sie waren faktisch nie
erreichbar. OFFEN FÜR DEN CHEF: entweder beide Varianten auf offene Hochland-Basen umhängen oder
der Götzenhalle ein Weltmonster geben; außerdem erfüllt ein Paragonturm-Kill von `roc_void`
stillschweigend Kapitel 18, ohne dass der Spieler die Quest je gesehen hat.*

---

## 1.0.0 „Vollrelease" — 2026-08-18

**Grim Reach verlässt Early Access.** DE: Mit 1.0 ist das Spiel inhaltlich fertig. Enthalten sind
20 Fertigkeiten (13 zum Sammeln und Verarbeiten, 7 im Kampf), 10 Kampfzonen plus Slayer-Turm,
8 Dungeons einschließlich Paragonturm, 110 Monster, 28 namentliche Champions, die Aschechronik
als durchgehende Questreihe, New Haven als eigene ausbaubare Siedlung sowie die vollständige
Oberfläche in 7 Sprachen. Bestehende Spielstände laufen unverändert weiter, es geht kein
Fortschritt verloren. / EN: Grim Reach leaves Early Access. Version 1.0 is the content-complete
game: 20 skills (13 gathering and crafting, 7 combat), 10 combat zones plus the Slayer Tower,
8 dungeons including the Paragon Tower, 110 monsters, 28 named champions, the Ash Chronicle as a
continuous questline, New Haven as your own upgradable settlement, and the full interface in
7 languages. Existing saves carry over untouched, so no progress is lost.

**Warum jetzt 1.0:** DE: Der Early Access hatte ein klares Ziel, und dieses Ziel ist erreicht.
Alles, was zum vollen Spiel gehören sollte, ist eingebaut und spielbar. Wie es weitergeht: Die
nächsten Patches drehen sich um Politur, also Feinschliff an Oberfläche, Lesbarkeit und Komfort.
Danach nehmen wir die großen Content-Updates in Angriff. / EN: Early Access had a clear goal, and
that goal is met. Everything meant to be in the full game is in and playable. What comes next: the
upcoming patches focus on polish, meaning refinements to the interface, readability and comfort.
After that we turn to the big content updates.

*Dev-Notiz: 1.0 friert den Inhalt ein und übernimmt den nie ausgelieferten 0.3.1-Hotfix-Kandidaten
(Tooltip-Boden, Material-Chips, E+-Kampflog) vollständig. `apps/client/package.json` 0.3.0 → 1.0.0
(speist `__APP_VERSION__` in Hauptmenü, Optionen und Bug-Report); Depot-Beschreibung in
`steam/app_build_4915450.vdf` auf „Grim Reach 1.0 (Full Release)". SAVE_VERSION bleibt 80, kein
Bump und keine Migration, `packages/**` ist gegenüber dem 0.3.0-Live-Stand unverändert. Das
Vault-Ritual greift damit ohne neuen Pin: die bestehenden v80-Fixtures (`v80-release-0.3.0.json`
+ `v80-filled-0.3.0.json`) sind exakt der Save-Stand, der mit 1.0 ausgeliefert wird; Guard grün
(354 Persistenz-Tests, 15 Vault-Fixtures).*

**Item-Tooltips zeigen wieder alle Werte:** DE: Item-Tooltips für Ausrüstung mit nur einer
Stat-Gruppe (bestimmte Zauberstäbe und Stäbe) konnten Bezeichnungen ohne Werte anzeigen, weil der
schrumpfende Rahmen die Zahlen aus dem sichtbaren Bereich drückte. Jetzt greifen Mindestgröße und
Umbruch statt Abschneiden. / EN: Item tooltips for gear with only one stat group (certain wands
and staves) could show stat labels with blank values, because the shrinking frame pushed the
numbers out of view. There is now a size floor and wrapping instead of clipping.

**Materialbestände auf Aktionskarten bleiben lesbar:** DE: Große Materialbestände auf den
Skill-Aktionskarten (etwa „978") wurden am Chip-Rand abgeschnitten. Sie erscheinen jetzt im selben
Kompaktformat wie die Nachbarwerte, und enge Karten stapeln ihr Layout, statt den Wert zu kappen.
/ EN: Large material stockpiles on skill action cards (for example "978") could get cut off at the
chip edge. They now use the same compact format as neighbouring values, and narrow cards stack
their layout instead of clipping the number.

**Das Kampfprotokoll erzählt den ganzen Kampf:** DE: Blutungs- und Gift-Ticks werden jetzt
geloggt (vorher tickte nur Brennen hörbar), Schock-Lähmungen und Ausweichen sind im Protokoll vom
echten Verfehlen unterscheidbar, und der Nahkampf-Lebensraub zeigt seine Heilung. / EN: The combat
log now tells the full story: bleed and poison ticks are logged, shock stuns and dodges are called
out instead of a generic "miss", and melee lifesteal shows its healing.
*Dev-Notiz: rein additive Events/Felder (missReason, source meleeLifesteal), kein SAVE-Bump,
Sanitize verbatim-sicher verifiziert; Grundlagen-Docs battle-040-\*.md.*

## 0.4.0 „Kampfgefühl" — NICHT VERÖFFENTLICHT / GESTRICHEN (Chef-Entscheid 16.08.2026)

> **Historie, kein Patch-Inhalt. NICHT ins Steam-Post übernehmen.** Diese Stufe wurde nie
> ausgeliefert und wird es nicht mehr: Die 2,5D-Arena samt Scene Builder bleibt DEV-only (Flag
> `ARENA25D_PAUSED` bzw. das separate Scene-Builder-Build-Ziel) und ist im Spieler-Bundle tot,
> ohne Post-Launch-Versprechen (s. `design/plan-1.0-vollrelease.md`, Strang A, Revision 16.08.).
> Der einzige spielersichtbare Teil dieser Stufe, das E+-Kampflog-Paket, ist oben nach 1.0.0
> gewandert und steht hier nur noch als Protokoll.

**Kampflog erzählt alles (E+-Paket, 03.08. abends):** DE: Blutungs- und Gift-Ticks werden jetzt
geloggt (vorher tickte nur Brennen hörbar), Schock-Lähmungen und Ausweichen sind im Log vom
echten Verfehlen unterscheidbar, und der Nahkampf-Lebensraub zeigt seine Heilung. / EN: The
combat log now tells the full story: bleed and poison ticks are logged, shock stuns and dodges
are called out instead of a generic "miss", and melee lifesteal shows its healing.
*Dev-Notiz: rein additive Events/Felder (missReason, source meleeLifesteal), kein SAVE-Bump,
Sanitize verbatim-sicher verifiziert; Engine 1346 grün; Grundlagen-Docs battle-040-\*.md.*

## 0.3.0 „New Haven" — RELEASED (Build 24539796, live geschaltet 04.08.2026)

**New-Haven-Prüfrunde 03.08. (3 Test-Agenten + Fix-Wellen, Task #334/#335):** DE: New Havens
Gebäude-Boni zeigen jetzt überall, wo sie wirken, eine „Aus New Haven"-Aufschlüsselung mit dem
neuen Wachfeuer-Emblem — Skill-Karten-Zeit, Bank-Kapazität, Offline-Cap, Slayer-Punkte,
Verkaufspreise, Beet-Reifezeit und der Tages-Segen; die Segens-Anzeige berücksichtigt dabei
jetzt korrekt die Verstärkung durch den Schrein der Stillen (zeigte vorher den unverstärkten
Wert). New Haven hat ein eigenes Sidebar-Icon. Gebäude-Popups scheinen nicht mehr durch
Kartenkacheln durch, die Kartenprojektion ist auf 1080p nicht mehr leicht verzerrt, und
Benachrichtigungs-Toasts verdecken das Baumenü nicht mehr. Der Kartenmodus ist jetzt in allen
7 Sprachen vollständig übersetzt (36 nachgezogene Texte in ES/FR/PT-BR/RU/ZH, inkl. russischer
Grammatik-Korrektur im Abriss-Dialog). Die Lager-Veredelung verrechnet offline jetzt exakt wie
online. / EN: New Haven building bonuses now show a "From New Haven" breakdown with the new
watchfire emblem wherever they apply — skill card timers, bank capacity, offline cap, Slayer
points, sell prices, crop growth, and the day's blessing; the Blessings panel now correctly
reflects the Shrine of the Silent's amplification. New Haven has its own sidebar icon. Building
popups no longer show through map tiles, the map projection is no longer slightly stretched at
1080p, and notification toasts no longer cover the build menu. The map mode is now fully
translated in all 7 languages. Camp refining now processes offline exactly as it does online.
*Dev-Notiz: Determinismus-Fix tickCampRefine pro Tick (tick.ts) + Byte-Gleichheits-Guard
(camp-audit-334x.test.ts); 27 neue Sanitize-Fuzz-Tests (camp-sanitize-fuzz-334x.test.ts); neues
Vault-Fixture v80-filled-0.3.0.json (befülltes Lager: 6 Gebäude, Überlappung, mapVisuals-Override,
laufender Bau + Veredelung); .nh-map isolation:isolate + content-box-Projektion; Doku-Nachträge
Balance/Bauteile/Backlog; Emblem + Sidebar-Icon von Codex/Mira. Engine 1326 / Persistenz 354 grün.*

**Schrein der Stillen verstärkt jetzt auch die Kampf-Beute (Chef-Entscheid 03.08., Task #336):**
DE: Der Schrein der Stillen in New Haven verstärkt den Tages-Segen jetzt auch im Kampf — an
Segenstagen steigen Kampf- und Dungeon-Erfahrung, Gold aus Kills und Dungeon-Abschlüssen sowie
die Chance auf seltene Beute mit jeder Schrein-Stufe (bis +30 % auf den Segens-Bonus, z. B.
+20 % Gold → +26 %). Der Freitags-Segen „Wilde Jagd" (Angriffstempo) bleibt bewusst unverändert.
/ EN: The Shrine of the Silent in New Haven now amplifies the daily blessing in combat too — on
blessing days, combat and dungeon experience, gold from kills and dungeon clears, and rare loot
chances scale with each shrine tier (up to +30% on the blessing bonus, e.g. +20% gold becomes
+26%). Friday's Wild Hunt blessing (attack speed) intentionally stays untouched.
*Dev-Notiz: combat-dev; die fünf Beute-Callsites in combat.ts (addXp, Kill-Gold, Kill-Rare-Drop,
Dungeon-Rare-Drop, Clear-Gold) laufen jetzt über shrineAmplifiedMult + campShrineBonus (Muster
tick.ts/elites.ts, kein zweiter Rechenweg); wildhunt roh (Eiserne Regel 3); keine neuen RNG-Züge,
kein Save-Feld; Sperrzonen-Kommentar in blessing.ts aktualisiert. Neuer Guard
shrine-combat-loot.test.ts (8 Tests); Engine gesamt 1334 grün.*

**Zentralhaus I wieder „zeremoniell billig" (Chef-Entscheid 03.08.):** DE: Der allererste Bau in
New Haven kostet wieder nur 500 Gold + 20 Eichenholz — die 2 Balken (Holzfällen 15 + Kampf-Drops)
machten den Einstiegs-Moment zum Stundengrind; alle anderen 44 Stücklisten behalten ihre Bauteile.
/ EN: The very first New Haven build is back to 500 gold + 20 oak logs — the beam requirement
turned the opening moment into an hour-long grind; all other 44 build recipes keep their
construction parts.

**Letzte Kleinfix-Runde vor Depot (03.08., aus finalem QA-Sweep):** DE: Achievements-Bildschirm
ragte auf 1080p unter die Kopfzeile (Höhenvertrag jetzt wie Bank/Kampf statt vh-Schätzung),
Filter-/Tab-Beschriftungen überlappten bzw. clippten auf Deutsch und Russisch, der leere
Posteingang war kaum lesbar, die Kampf-Dock-Tabs sind jetzt in allen 7 Sprachen übersetzt, und
ein Bild-Priorisierungs-Attribut im Bestiarium griff nie (React-Attributname). / EN: The
Achievements screen no longer cuts off below the fold on 1080p, German/Russian filter and tab
labels no longer overlap or clip, the empty mailbox message is readable, the combat dock tabs
are now translated in all 7 languages, and a Bestiary image priority attribute that never
applied now does.

**Bestiarium: „Reise durch den Reach" (03.08., Chef-Wahl aus 5 Studien):** DE: Das Bestiarium
ist jetzt eine Reise durch den Reach — die Zonen als vollformatige Kulissen-Bänder mit den echten
Kampf-Hintergründen, Monster als Wegpunkte entlang des Pfads; Discovery-Logik, Champion-Kodex,
Filter und Quest-Sperren unverändert erhalten. / EN: The Bestiary is now a journey through the
Reach — zones as full-width scenery bands using the real combat backdrops, monsters as waypoints
along the trail; discovery logic, the champion codex, filters, and quest locks all preserved.

**Zonen-Karten-Nachfix (03.08., Chef-Screenshot):** DE: Zonen-Übersicht scrollt wieder
vollständig (bis zu Dungeons und Paragonturm); Zonen-/Dungeon-Karten optisch überarbeitet —
höher, Info-Leiste unten links verankert, kein abgeschnittener Text mehr, Badges sitzen wieder
in den Ecken, Dungeon-Karten wachsen mit ihrem Inhalt. / EN: The zone overview scrolls fully
again (down to dungeons and the Paragon tower); zone and dungeon cards were reworked — taller,
info bar anchored bottom-left, no more clipped text, badges back in their corners, dungeon cards
size to their content.

**Kampf-Übersicht-Politur (03.08., Chef-Live-Regie):** DE: Ausrüstungs-Dock (links) und
Kampfprotokoll (rechts) lassen sich jetzt unabhängig einklappen — in Zonen-Übersicht und Kampf;
der Zustand wird gemerkt. Die Zonen-Auswahl hat eine echte Panel-Fläche (Umber/Bronze-Rahmen statt
transparent) und zeigt fest 3 Karten pro Reihe mit mehr Platz für Bild und Info; Zonen und
Dungeons sind nach Level sortiert (war bereits so, verifiziert). / EN: The equipment dock and the
battle record can now be collapsed independently, both in the zone overview and during combat,
and the state is remembered. The zone picker sits on a real panel surface (no more transparency)
and always shows 3 cards per row with more room for art and info; zones and dungeons are sorted
by level.

**Release-Checkpoint-Fixwelle (03.08., aus 5-Bot-Sweep):** DE: Die Debug-Kurzbefehle im Lager
sind aus der Verkaufsversion verschwunden; der Tag/Nacht-Schalter bleibt für alle Spieler, und
Baumaterial-Tooltips erklären jetzt, woher die Zutaten kommen („Erst das Zentralhaus errichten"
und Kapazität {belegt}/{gesamt} als klare Gründe). Der Update-Rundgang lag beim Laden über dem
Willkommen-zurück-Bericht — behoben; wiederkehrende Spieler bekommen nach dem Einsammeln jetzt
einen kurzen New-Haven-Rundgang. Das Dungeon-Abschluss-Log zeigt die tatsächlich vergebene XP
(inkl. Segen-/Schrein-Bonus), automatisch platzierte Lager-Gebäude stehen auf der Lichtung statt
im Waldhang, Gebäude-Namensschilder erscheinen nur noch bei Hover/Verschieben, englisches
Zahlenformat korrigiert („5.1k" statt „5,1k") und der Ertrags-Präfix liest sich nicht mehr wie
ein Minus. / EN: New Haven's debug shortcuts are gone from the shipped build; the day/night
switch stays for everyone, and material tooltips now teach where ingredients come from (with
clear "Build the Town Hall first" and capacity reasons). Fixed the update tour covering the
welcome-back report on load; returning players now get a short New Haven tour after collecting
their loot. The dungeon clear log shows the XP actually granted (blessing/shrine included),
auto-placed camp buildings line up on the clearing instead of the forest slope, building
nameplates show only on hover/move, English number formatting fixed, and the yield prefix no
longer reads like a minus sign.

**UI-Chrome: Emoji-Ablösung (03.08., 37 Micro-Icons von Codex/Mira):** DE: Verbliebene
Emoji-/Unicode-Platzhalter in der UI-Chrome durch dedizierte gezeichnete Icons im Ashen-Iron-Stil
ersetzt — Aktions-Warteschlange (Kopf, Warnung, Blockiert, Priorität, Verschieben), Aufgaben-Wand
(Ticket, Ort, Dialog, Kalender, Journal, Münze), alle Erfolgs-Kategorien, Kampf-Status
(Heilquellen, Kill-/Boss-Marker, Immunität, Regeneration), Options-Checkboxen und Ordner, Post
(inkl. Sidebar-Footer) sowie der Offline-Bericht. / EN: Replaced the remaining emoji/Unicode
placeholders across the UI chrome with dedicated hand-drawn Ashen Iron icons — action queue,
quest wall, all achievement categories, combat status markers, options checkboxes and folder,
mail (including the sidebar footer), and the offline summary.

**Sprach-Default Englisch (Chef-Entscheid 26.07.):** DE: Erststart erkennt jetzt die
Systemsprache (alle 7 unterstützten), sonst Englisch — vorher fiel jeder Erststart hart auf
Deutsch zurück, auch für internationale Käufer. Gespeicherte Sprachwahl bleibt unberührt. /
EN: First launch now detects your system language (all 7 supported) and defaults to English
otherwise — previously every fresh install started in German. Saved language choices are kept.

**Sweep-Fix-Welle B — Kampf-/Dungeon-UI (Task #355, aus 6-Bot-Sweep #353):** DE: Ein
festgefahrener Kampf (Patt) endet nicht mehr stumm — ein Popup erklärt, was passiert ist
(kein Verlust). Dungeon-Karten ohne doppelte Stufenempfehlung; 1-Wellen-Dungeons zeigen die
Kreaturenstufe ohne Spanne; unentdeckte Beute als erkennbare Silhouette statt schwarz;
echtes Truhen-Symbol in der Sieg-Zeremonie; Hochland-Horst-Text lesbar; Boss-Intro spielt
beim Laden nicht mehr erneut; Paragon-Beschriftungen brechen nicht mehr im Wort. / EN: A
stalled fight (stalemate) no longer ends silently — a popup explains what happened (no
loss). Dungeon cards lose the duplicate level recommendation; single-wave dungeons show the
creature level without a range; undiscovered loot shows as a visible silhouette; real chest
icon in the clear ceremony; Highland Aerie card text readable; boss intro no longer replays
on load; paragon stat labels no longer break mid-word.

**Sweep-Fix-Welle A — Balance & Beute (Task #354, aus 6-Bot-Sweep #353):** DE: Frühband (Stufe
30–38) knackiger statt zäh-harmlos: der Goblin-Hexenmeister trifft jetzt spürbar und trägt weniger
aufgeblähte Lebenspunkte, Aschfeld-Schakal/Staubgeier/Morastkriecher/Pechkäfer treffen härter bzw.
haben weniger HP. Die Leder-Frühleiter bekommt eine neue Rüstungsstufe „Wildleder" (Stufe ~10,
5 Teile: Haube/Wams/Beinlinge/Armschützer/Stiefel) und schließt die tödliche Lücke zwischen
Gegerbtem Leder (Stufe 5) und Gehärtetem Leder (Stufe 20). Der Schalenvater-Schild ist noch
stärker geworden. Mehrere Elite- und Dungeon-Abschluss-Beutezeilen können jetzt auch verzaubert
droppen (Paritätsangleichung mit ihren Nachbar-Zeilen). Acht Hochlevel-Weltmonster (u. a.
Tiefenkrake, Altbär, Klippengeist, Roc-Ältester, Nekromantenfürst) zahlen jetzt zusätzliche
zeitgemäße Materialien statt fast leer auszugehen. Kapitel 3 der Aschechronik spricht jetzt korrekt
von mehreren Imps (0/5 statt „dem Imp"); Kapitel 6 zahlt 1650 statt 1200 Gold (glättet den einzigen
Einbruch in der Gold-Leiter). Bogen-Kategorien im Lederhandwerk heißen jetzt „<Holzart>-Bögen"
statt nackt nach der Holzart. / EN: Early band (level 30–38) hits harder instead of feeling
tough-but-harmless: the Goblin Warlock now lands real damage and carries less bloated HP, Ashfield
Jackal/Dust Vulture/Mire Crawler/Pitch Beetle hit harder resp. have less HP. The early leather
ladder gets a new armor tier "Buckhide" (level ~10, 5 pieces: coif/jerkin/leggings/vambraces/
boots), closing the lethal gap between Cured Leather (level 5) and Hardened Leather (level 20).
The Shellfather Aegis got even stronger. Several elite and dungeon-clear loot rows can now roll
enchantments too (parity fix with their neighboring rows). Eight high-level world monsters
(including Deep Kraken, Elder Bear, Gravecliff Specter, Roc Elder, Necromancer Lord) now pay extra
period-appropriate materials instead of coming back nearly empty-handed. Ashen Chronicle Chapter 3
now correctly speaks of multiple imps (0/5 instead of "the Imp"); Chapter 6 pays 1650 gold instead
of 1200 (smoothing the one dip in the gold ladder). Fletching bow categories are now named
"<Wood> Bows" instead of the bare wood name.
*Bronze-Baseline-Analyse (design/bronze-baseline-analyse.md, Task #352): 5 Monster-Stat-Änderungen
nach dokumentierter Alt→Neu-Tabelle (goblin_warlock maxHp 52→36/ward 16→12/dmg 13→16, pitch_beetle
maxHp 67→50, ashfield_jackal/dust_vulture/mire_crawler dmg +2..+3); Elite-Varianten erben
automatisch über statMults. Sim-„Auffälligkeiten"-Liste bleibt bei 9 (heuristik-bedingtes
Anker-Artefakt gegen den Bronze-CL12-Helden, Fix erst in Welle C — Heuristik bewusst nicht
angefasst, s. design/bronze-baseline-analyse.md §7/§9). Item-Drop-Audit-Nachzügler
(design/item-drop-audit.md): 15 suffixChance-Paritäts-Zeilen (5 P4-Dungeon-Clear-Rows + 10
Elite-extraLoot-Rows, u. a. elite_ash_beetle→chitin_bulwark + die 3 P2-Waffen), shellfather_aegis
AR 19.6→21.5/Block 45%→47%, 10 neue on-band-Beikost-Rows (deep_kraken/forest_bear/roc_elder/
roc_storm/highland_wyvern/roc_void/gravecliff_specter/skeleton_nekro+dg_/forest_hare) — roc_void
neu in tower-monsters.test.ts LOOT_PARITY_EXCEPTIONS (Turm-Zwilling tower_roc_void bleibt
unverändert). Leder-Lücke: Chef-Erweiterung mittendrin — statt reinem Retiering ein neues
5-Teile-Set "buckhide" (Stufe 10 ranged, Materialien cured_leather+scarred_hide, kein neues
Material, EVR linear zwischen cured/hardened interpoliert); hardened/scaled zurück auf
Originalwerte, scaled-Craft-Level-Inkonsistenz (14/30 Ausreißer) auf einheitlich 28 bereinigt.
Re-Pins (jeder ausgewiesen): sim-consistency LADDER (+1: buckhide_boots->quietstep_boots),
DROP_GAP (+7, monsterTier-Anhebung durch die neuen Beikost-Rows), balance-envelope Dodge-CL30
(0.3593→0.3583) und Tank-AR-CL90 (298.23→298.53), content-integrity KNOWN_FIVE_PIECE_FAMILIES
(+buckhide), achievements ach_sets_all (34→35 Sets, Text+i18n ×7 mitgezogen). KEIN
SAVE_VERSION-Bump (bleibt 75). Engine 127/127 Testdateien grün (1166 Tests), Persistenz 13/13
grün (273 Tests), Typecheck 5/5. Auch die "Beute- & Leiter-Politur"-Notiz weiter oben (0.2.2)
wurde präzisiert: der Ökonomie-Effekt ist absolut winzig (2–10 Gold/Kill), aber relativ real
(+55–109 % Loot-EV an den betroffenen Hochlevel-Monstern).*

**Ausrüstungs-Loadouts 1/2/3 (Task #349, Headline-Feature, Spieler-Wunsch 93h-Spieler):** DE:
Drei Loadout-Slots zum schnellen Umschalten zwischen deinen Kampf-Sets (Nahkampf/Fernkampf/Magie):
Aktuelles Equipment per Disketten-Knopf speichern, per Klick auf 1/2/3 komplett anlegen — fehlende
Teile werden übersprungen und der Rest zieht an („X von Y angelegt"), verzauberte Teile reisen
exakt mit, und was in Bank oder Ausrüstungs-Tresor liegt, wird automatisch geholt. \ EN: Three
loadout slots for quick swapping between your combat sets (melee/ranged/magic): save your current
gear with the disk button, equip a full set with one click on 1/2/3 — missing pieces are skipped
while the rest goes on ("X of Y equipped"), enchanted pieces travel exactly as saved, and anything
sitting in your bank or gear vault is fetched automatically. 7 Sprachen.
*SAVE 74→75 (`equipLoadouts`, Migration + v75-Vault-Pin `v75-release-0.2.3.json`). Anlegen läuft
Item für Item über den NORMALEN Equip-Pfad (equipItem/equipInstance — Requirements gelten beim
Anlegen, Kapazitäts-/Datenverlust-Schutz unverändert); Werkzeug-Slots bewusst ausgenommen
(Skill-Ausrüstung). Kein Kampf-Gate (Konsistenz: manuelles Umziehen ist im Kampf erlaubt).
RNG-frei. 13 Engine- + 9 Persistenz-Guard-Tests. Leiste oben im Equipment-Tab (EquipLoadoutBar).*

**Slayer-Aufträge zielen nur noch auf erreichbare Monster (Task #347, P0, Spieler-Report 93h-
Spieler):** DE: Slayer-Aufträge konnten auf eine „Geister-Version" eines Monsters lauten (z. B.
Skelettkrieger), bei der kein einziger Kill zählte und keine Zone auf der Karte aufleuchtete —
diese Aufträge werden nicht mehr vergeben, und ein bereits betroffener aktiver Auftrag wird beim
Laden automatisch repariert (Fortschritt, Punkte und Serie bleiben erhalten). / EN: Slayer tasks
could roll a "ghost version" of a monster (e.g. Skeleton Warrior) where no kill ever counted and
no zone lit up on the map — such tasks are no longer assigned, and an affected active task is
repaired automatically on load (progress, points and streak are kept).
*Wurzelursache: die dg_-Dungeon-Zwillinge der Krypta (dg_skeleton_warrior & Co.) tragen zone
"crypt" ohne dungeonOnly-Flag und rutschten in den dynamischen Welt-Task-Pool; jeder Kill
kreditiert aber via killCreditMonsterId auf die Basis-ID → Task mathematisch unerfüllbar.
Fix: dg_-Präfix-Filter in worldTaskMonsters (slayer.ts) + idempotente Load-Normalisierung im
sanitize-Pass (persistence): dg_-Task → Basis-ID (Fortschritt bleibt), dg_ ohne Basis →
kostenlose Annullierung. KEIN SAVE-Bump. 7 Guard-Tests (3 Engine + 4 Persistenz).*

**Sofort-kämpfen-Button zurück (Task #348, Spieler-Feedback 93h-Spieler):** DE: Über dem Mengen-
Grid jeder Monster-Karte sitzt wieder ein auffälliger ⚔ „Kämpfen"-Button — ein Klick startet den
Kampf sofort, eine laufende Aktivität rückt mit ihrem Rest-Ziel automatisch an die Warteschlangen-
Front zurück, nichts geht verloren. / EN: A prominent ⚔ "Fight" button is back above the quantity
grid on every monster card — one click starts the fight immediately, and whatever was running
returns to the front of the queue with its remaining target, nothing is lost. 7 Sprachen.
*Nutzt dieselbe `enqueueFightAtFront`-Priorität aus Task #327 (bisher nur per Shift-Klick auf die
Mengen-Buttons erreichbar) — jetzt als sichtbarer Primär-CTA. Mengen-Grid (1×/25×/50×/∞ + freie
Eingabe) und Shift-Klick-Priorität bleiben unverändert nutzbar fürs Vorausplanen. Kein SAVE-Bump,
keine Engine-Änderung.*

**Wiki-Link-Sprung respektiert jetzt das Zonen-Gate (Task #350, Chef-Fund):** DE: Ein Klick auf
eine Monster-Quelle im Item-Wiki konnte bisher direkt in eine Kampfzone springen, die laut
Story-Fortschritt noch gesperrt war — die Zeile ist für gesperrte Zonen jetzt gedimmt mit
Schloss-Symbol und zeigt „Erfordert: {Kapitel}" statt zu springen; freigeschaltete Zonen springen
weiter normal. / EN: Clicking a monster source in the item wiki could jump straight into a combat
zone still locked by story progress — that row is now dimmed with a lock icon and shows
"Requires: {Chapter}" instead of jumping; unlocked zones still jump normally.
*Root cause: `jumpToMonster` (util/monsterJump.ts) setzte in CombatPage.tsx den zoneId direkt,
ohne die `isZoneUnlocked`-Prüfung der normalen Zonen-Karte — Fix an der Quelle (ItemWikiModal.tsx
SourceRow, kind "monster") + zweite Verteidigungslinie im Jump-Konsumenten selbst (CombatPage.tsx).
Engine-Guard bestätigt bereits korrekt: `canFightMonster`/`startCombat`/`advanceActionQueue`
blockten einen tatsächlichen Kampfstart in der gesperrten Zone schon vorher zuverlässig (slayer.ts
Z.128) — nur die UI-Ansicht war erreichbar, kein Engine-Loch. Kein SAVE-Bump, keine Engine-Änderung,
keine neuen i18n-Keys (bestehender `combat.zoneGate.requires` wiederverwendet).*

## 0.2.2 — „Quality of Reach" (Unveröffentlicht, in Arbeit — Stand 24.07. abends)

*Riesiges QoL-/Konsistenz-Update, gebaut in 20+ Agent-Wellen an einem Tag. Offen vor dem Upload:
Chef-Assets (2 Achievement-Icons, elite_victory.mp3, Quest-Token-Icon) + finale Voll-Verifikation
+ Paket. (2,5D-Arena-Prototyp läuft dev-only hinter Flag und ist NICHT Teil dieses Patches.)*

**Kampf-Queue (Chef-Feature):** Kämpfe sind Queue-Einträge — Monster-Karten mit 1×/25×/50×/∞ +
freier Menge (SAVE 73, offline deterministisch, Tod pausiert mit „Fortsetzen"-Button, Elites/
Dungeons bewusst ausgenommen); Queue-Panel zeigt Kämpfe mit Icon + Live-Kill-Zähler.
**Bank & Shop:** Bank-DnD grundsaniert (Geist-Bild, Drop-Zonen, Esc); Varianten-Container wandern
als GANZER Stapel atomar (neue Engine-Bulk-Ops, 6 Tests); freie Mengeneingabe in der Bank; roter
Alert bei vollen Taschen; **Mass-Sell-Modus** (Anhaken → ein Klick verkauft: Slider default Max
für Stapel, „Stack oder Single" mit Varianten-Häkchen-Liste für Ausrüstung, eine Gold-Summe);
einheitlicher Mengen-Baustein (1/10/25/100 + frei) für Shop-Kauf/-Verkauf/Bank.
**Elite-Momente:** Champion-Sieg-Zeremonie (Art + Beute-Übersicht + Unique mit Suffix-Funkeln +
Kopfgeld, 6s/Klick/Esc; lastEliteKill-Breadcrumb SAVE 74); Vhazrak-Doppelgesicht gefixt (Kampf-
Bühne nutzt Elite-Art); Elite-Anzeige als schwebendes, einklappbares Mini-Fenster (Drag-Kleben-
Bug gefixt: Window-Listener + Alt-Tab/Unmount-Absicherung); Fanfaren-Slot elite_victory.mp3.
**Konsistenz-Wellen (A+B aus 3-Perspektiven-Brainstorm, 49 Befunde):** Rarity-Farben getrennt;
Citadel-Schließen-Button in allen Modals; Modal-Eingangs-Animation; Auto-Stopp-Toast mit Grund +
Grund im Queue-Panel; Zonen-Karten im Holzrahmen; F1-Bug entschärft; Zonen-Suche im Kampf;
Icon-Maps zentralisiert (5→1); Sidebar-Glutpunkt für laufende Aktivität; Queue-DnD; Char-Screen-
Überlappung gefixt; 11 Tastatur-Lücken geschlossen; Typo-/Spacing-Skala vereinheitlicht (eine
Wahrheit, unsichtbar); kaputte Cormorant-Fonts entfernt.
**Look-Feinschliff (Chef-Live-Regie):** Kategorie-Header auf Leder („Taschen-Look", 320px-Kachel)
mit 24px-Überschriften; Queue-Panel im Sidebar-Look, Einträge als Holzbretter; Offline-Report
komplett Holz (280px-Kachel); **ButtonNew app-weit ausgerollt** (3-State-9-Slice auf Sidebar,
TopBar, Optionen, Modals, Item-Tooltips, Bestiarium — weiße Schrift statt Gold, Icons volle
Deckkraft; dabei Rahmen-Bug am „Spiel verlassen"-Button gefunden: toter Alt-Block überschrieb
das border-image); Ambient final: NUR Vignette (Wetter + Bloom nach Test komplett entfernt,
tote i18n-Keys ×7 abgeräumt); Options-Container-Holz feiner (280px); Monster-/Elite-Karten:
Artwork unten bündig, füllt die Karte (cover+bottom statt Breiten-Fit mit Restband); Kampf-
Kulisse reißt auf niedrigen Auflösungen nicht mehr ab (cover statt reinem Breiten-Fit).
**Balance:** Heiltrank-Leiter neu gestuft (12→25%, jede Stufe spürbar; Lesser mit eigenem Rezept
+ Ascheessenz); Drachenleder on-level gerbbar (Basilisken-Schuppen-Rezept); Leeren-Fokus Req 65;
Guard-Allowlist auf echte Chase-Fälle geschrumpft.
**Performance:** Ultrawide-Kampf-Bremse gefunden (will-change-Layer) — 36→51+ FPS; Kampf-Log 6×
billiger; MonsterSelect-Leerlauf auf 0 Renders; Selector-Migration komplett (Echo weg); Kulissen
randlos breitenfüllend mit Boden-Bias.
**Spieler-Feedback-Runde 2 (24.07. nachmittags, beide am Eingangstag umgesetzt):**
Queue-Priorität — ⚡-Button auf wartenden Einträgen + Shift-Klick auf Mengen-Buttons startet
sofort; Laufendes rückt MIT Rest-Ziel an die Queue-Front zurück, nichts geht verloren (neue
Engine-Primitive, 17 Tests, kein SAVE-Bump). Speisen-Identität — Chef-Hypothese bestätigt:
Einheits-healPct (0,11/0,12) nivellierte per max(flach, pct·maxHp) ALLE 46 Speisen ab ~110 HP
(inkl. Inversion Shrimp>Hummer); neue pct-Leiter 0,03→0,155, Linien-Charakter (Fisch-Basis/
Fleisch herzhaft/Crops billig/Feasts Krone), Krypta-Aal kuriert Gift, 2 value-Fixes; Flach-Anker
byte-identisch (Sim-Beweis), dokumentierter Alt-Food-Verblass-Hinweis für Bestands-Saves.
**Kampf-Ergonomie (Abend-Welle):** Kampf-Log per Eck-Griff in Breite UND Höhe resizebar,
Loadout-Panel (Auto-Eat) in der Breite — Doppelklick = Reset, Größen persistiert; **Log-Filter
wie in WoW**: Zahnrad am Log öffnet 8 Kategorie-Checkboxen (eigener/erlittener Schaden, Heilung,
Status, Beute, XP, Begleiter, Tod & Sieg), reiner Anzeigefilter, wirkt rückwirkend.
**Diebeskunst ehrlich:** Karten zeigen die ECHTE Erfolgschance (bit-identische Engine-Formel —
dabei Anzeige-Bug gefixt: Meisterring-Boni fehlten in der UI-Kopie) mit Hover-Aufschlüsselung;
Beute heißt jetzt „bei Erfolg" mit effektiver Chance pro Versuch im Tooltip. 7 Sprachen.
**Blutmond umgebaut (Samstags-Segen, Chef-Design):** DE: statt „+15 % Bestien-Beute" jetzt
15 % Chance pro Kill auf doppelten GESAMT-Loot — trifft der Wurf, gibt es ALLES aus dem Kill
doppelt (jeder Stack in gleicher Menge, Suffix-/Equipment-Drops als wertgleiches Duplikat ohne
Re-Roll; XP/Gold unverändert, carrionwing-Zweitroll zählt mit). / EN: The Saturday blessing now
rolls a 15% chance per kill to double that kill's ENTIRE loot (every stack, suffix drops
duplicate with identical rolls) instead of +15% loot quantity. 7 Sprachen, kein SAVE-Bump.
**Monster-Karten-Fix:** DE: Monster-Karten: abgeschnittener Name und Drops-Überlappung behoben;
XP-Abzeichen nach oben links, Kreatur steht unten bündig. / EN: Fixed monster cards clipping
their name and overlapping drop icons with the quantity buttons; the XP badge moved to the top
left so the creature stands flush at the bottom.
**Monster-Karten-Artwork (3. Korrektur, endgültig):** DE: Karten-Artwork zoomt nicht mehr rein —
volle Bildbreite immer sichtbar, Kreatur unten bündig, Resthöhe dunkel gefüllt. / EN: Monster card
artwork no longer zooms in; the full image width is always visible with the creature flush at the
bottom edge.
**Charakter-Panel als Reiter (Chef-Design):** DE: Ausrüstung und Stats sind jetzt Reiter statt
zwei gestapelter Panels — beide bekommen die volle Panelhöhe; Stats gruppiert in Offensive /
Defensive / Tempo & Krit / Set-Bonus, Tastatur-bedienbar. / EN: Character screen: Equipment and
Stats are now tabs instead of two stacked panels — both get the full panel height, with stats
grouped into Offensive / Defensive / Tempo & Crit / Set Bonus. 7 Sprachen.
**Charakter-Kampfwerte-Skalierung:** DE: Überlappung der Set-Bonus-Anzeige mit den Kampfwerten
bei 1080p behoben, abgeschnittene Bezeichnungen korrigiert; 3440×1440 bleibt groß. / EN: Fixed
the character screen's combat stats overlapping the set bonus section at 1080p and tightened
stat labels so they no longer get cut off; ultrawide sizing unchanged.
**Dungeon-Karten eindeutig beschriftet (Task #342, Leiter-Analyse #338):** DE: Dungeon-Karten
zeigen jetzt „Kampfstufe {n}" statt nur „Lv {n}" (kollidierte mit der Monsterspanne auf den
Zonenkarten), nennen ihre Trägerzone („Zone: Wildwald-Jagdgründe") und das Kreaturen-Level der
eigenen Wellen („Kreaturen Lv 50–60") — die Wildwald-Jagd sieht nicht mehr wie ein Dungeon des
Schwarzdornwaldes aus. / EN: Dungeon cards now say "Combat Lv {n}" instead of just "Lv {n}"
(was colliding with the monster-level range on zone cards), name their home zone ("Zone: Wildwood
Hunting Grounds") and the creature level of their own waves ("Creatures Lv 50–60") — the Wildwood
Hunt no longer reads like a Blackthorn dungeon. 7 Sprachen, kein SAVE-Bump.
**Beute- & Leiter-Politur (Balance-Audits #338/#339, Chef-GO):** DE: Krypta-Tiefen-Stufe von
Kampfstufe 70 auf 75 angehoben (Boss-minus-15-Muster wie bei der Kriegsbande; seit dem
Dungeon-Tore-Umbau in diesem Update ist die Stufe eine Empfehlung, niemand verliert den Zutritt);
die Wildwald-Jagd zahlt jetzt 1300 statt 1100 Gold (Gold-Leiter durchgängig monoton). Fünf Elite-Uniques (u.a.
Glutpanzer-Bollwerk, Morvanes Kriegsplatte, Schalenvater-Schild) waren schwächer als der
gewöhnliche Zonen-Loot ihrer eigenen Elite-Gegner — Anforderungen UND Werte auf Zonen-Niveau
angehoben, Elite-Drops fühlen sich wieder wie Belohnungen an. Vier weitere Zonen-Drops mit
Requirement-Ära-Bruch korrigiert (u.a. ein Leder-Helm ganz ohne Rüstungswert). Neue seltene
Material-Drops (Runit-/Kriegshemd-/Titan-/Aetherium-Ausrüstung) in Krypta, Wildwald, Küste,
Schlackengrube und Hochland sowie fünf neue Dungeon-Abschluss-Belohnungen. Auch die fünf Krypta-
Skelette und Schlackengrube-Elementare mit einem Slayer-Turm-Zwilling zahlen jetzt endlich
zeitgemäße Materialien statt der alten Turm-Beute — nur ihre Turm-Zwillinge bleiben unverändert.
Bereits angelegte Ausrüstung bleibt tragbar, auch wenn sie die neuen Anforderungen nicht mehr
erfüllt — erst beim erneuten Ablegen greift die neue Prüfung. Wirtschaftlich bleiben die neuen
Beikost-Drops fast unsichtbar (2–10 Gold pro Kill, reine Verkaufsware) — spürbar ist aber die
relative Erwartungswert-Steigerung an den betroffenen Hochlevel-Monstern (+55–109 % gegenüber
vorher, weil dort bislang kaum etwas Verkaufbares fiel). / EN: The Crypt Depths level rose from combat level 70
to 75 (boss-minus-15 pattern, matching the Goblin Warband; with this update's dungeon gate rework
that value is a recommendation, nobody loses entry); the Wildwood Hunt now pays 1300 gold instead
of 1100 (the gold ladder is fully monotonic now). Five Elite Uniques (including the Cinderhusk Bulwark,
Morvane's Warplate, and the Shellfather Aegis) were weaker than the ordinary zone loot dropped by
their own elite enemies — requirements AND stats raised to zone level, so elite drops feel like
rewards again. Four more zone drops with a requirement-era mismatch were corrected (including a
leather helm with no armor rating at all). New rare material drops (runite/warhide/titanium/
aetherium gear) across the Crypt, Wildwood, Coast, Slagpit, and Highlands zones, plus five new
dungeon-clear rewards. The five Crypt skeletons and Slagpit elementals with a Slayer Tower twin now
finally pay period-appropriate materials too, instead of the old tower loot — their tower twins are
unchanged. Already-equipped gear stays wearable even if it no longer meets the new
requirements — the check only applies again once you unequip it. Economically the new drops
stay almost invisible (2–10 gold per kill, pure sell fodder) — what does show up is the relative
loot-EV increase on the affected high-level monsters (+55–109% versus before, since they
previously dropped almost nothing sellable). Kein SAVE-Bump (reine
Content-Zahlen).
_Tests Stand jetzt: Engine 1149 grün, Persistenz 258 grün (Vault v56–v74), Typecheck 5/5._

**Charakter-Stats-Tab geordnet (Task #343):** DE: Die Kampfwerte-Zeilen im „Stats"-Reiter fluchten
jetzt sauber untereinander (Nahkampf/Fernkampf/Magie/Schaden/Genauigkeit usw. als ein durchgehendes
Zeilenraster statt zweier versetzter Spalten); Attribut-Kacheln brechen lange Namen
(„Konstitution"/„Intelligenz" u. a. in allen 7 Sprachen) nicht mehr hässlich mitten im Wort um;
Stat-Tooltips laufen jetzt über das Citadel-Tooltip-System statt dem klebrigen Browser-Tooltip.
/ EN: Combat stat rows on the Character screen's "Stats" tab now line up cleanly in a single
column instead of two staggered ones; attribute tiles no longer break long names ("Constitution"/
"Intelligence" etc., all 7 languages) mid-word; stat tooltips now use the Citadel tooltip system
instead of the browser's mouse-hugging native tooltip. 7 Sprachen, kein SAVE-Bump.
_Dev: `EquipmentOverview.tsx` `StatGroup`/`StatLine` (1-spaltiges Zeilenraster ersetzt die alte
naive `cols=2`-Halbierung, die den Versatz verursachte — Screenshot-A/B-Vergleich gegen ein echtes
gepaartes 2-Spalten-Grid dokumentiert im Quellkommentar); `StatLine` migriert von `title=` auf
`HoverTip` (CitadelTip.tsx); `.cs-attr-card-name` font-size von `cqmin`+11px-Floor auf `cqi`+9px-
Floor (character.css), empirisch gegen alle 7 Attributnamen × 1920×1080/3440×1440 verifiziert._

**Dungeon-Tore: Quests statt Kampfstufe (Task #345, Chef-Entscheid):** DE: Dungeons sperren nicht
mehr nach Kampfstufe, nur noch nach Story-Fortschritt. Die Stufe auf der Dungeon-Karte ist ab
jetzt eine Empfehlung: Wer früher hineinwill, darf das und bekommt statt eines gesperrten Buttons
eine deutliche Warnung mit der eigenen Stufe daneben. Die Kreaturen bleiben so gefährlich wie
zuvor — wer stirbt, fliegt aus dem Run, verliert nichts und weiß, was noch zu trainieren ist.
/ EN: Dungeons no longer lock you out by combat level, only by story progress. The level on the
dungeon card is now a recommendation: you may enter early and get a clear warning with your own
level next to it instead of a disabled button. The creatures are as dangerous as ever — if you
die the run simply ends, you lose nothing, and you know what to train. 7 Sprachen, kein SAVE-Bump.
_Dev: `canEnterDungeon`/`startDungeon` (engine/dungeon.ts) prüfen nur noch isDungeonUnlocked
(Quest-Gate + Trägerzonen-Kohärenz + Legacy-Bestandsschutz); Slayer-Turm (Slayer-Level-Gate) und
Paragonturm (Einmal-Unlock) unverändert. Neuer rot→grün-Guard in dungeon.test.ts (Unterlevel-
Eintritt bei offenem Quest-Gate); Leiter-Monotonie-Guard (progression-band.test.ts) bleibt als
Empfehlungs-Kohärenz bestehen. requiredLevel-WERTE im Content unangetastet._

## 0.2.1 — Progressions-Hotfix (RELEASED, Build 24362383, Silent-Push 23./24.07.)

*Antwort auf das erste ausführliche Steam-Review (23.07.): beide Kern-Claims per Audit bestätigt
und gefixt, jeweils mit Rot/Grün-bewiesenen Guard-Tests gegen die Fehlerklasse.*

- **Quest-Progression entwirrt (Review-Fall):** Aschfelder öffnen jetzt nach Kapitel 4 („Die leere
  Mark", ~L30) statt nach der L45/L60-Kriegsbande — die einzige Band-Inversion der Hauptkette ist
  raus, die Kriegsbanden-Wand bleibt gewollt. 18 Nebenquests erscheinen nicht mehr im Log, bevor
  ihre Jagdgründe freischaltbar sind (7 direkte Gate-Ergänzungen, Rest transitiv); Dornwolf-Rudel
  zurück in den Schwarzdorn-Strang, Eberjagd raus aus der Warteschleife. Guards: Band-Monotonie +
  Nebenquest-Erreichbarkeit (`progression-band.test.ts`). Kein SAVE-Bump.
- **Magier-/Ranged-Parität (Review-Fall 2, härter als behauptet):** Sim-Beweis vorher: Melee CL27
  vs. Magier CL9 in 240h (Stoff hatte zwischen L1 und L22 keine Sprosse und null Drops; L1-Wand-
  Rezepte brauchten Material von L50+). Fixes: Wand-Rezepte auf Kraftsplitter, Frostessenz auf
  Band-Monster (L27/28), Glut-Teile auf Glutessenz/Feuersplitter, Dämmergewebe von Leerenrunen auf
  Schattenrunen befreit, Leerenessenz-Weltquellen (L80/L90), Rohlederschnur→Sehnenfaden + Jagdbogen
  im Shop (Ranged-Frühweg). **Neu: Trübgewebe-Set** (dimweave_hood/robe/sandals, Lederhandwerk 8–12,
  Magie 10, Set-Bonus {int/con+magic-Boost}) schließt die Stofflücke — Art integriert (echtes Alpha).
  Guards: combatGate-Materialparität + Sprossen-Check + Magie/Ranged-Sim-Baseline. 7 Sprachen.
  Achievement „Master of All Sets" auf 34 Sets nachgezogen.
  _Nachweis: Revert → 31 Verstöße rot (0 davon Melee — exakt der Review-Befund), Fixes → 0._
- **Kampf-Performance + Darstellung (gemessen, nicht gefühlt):** Kampf-Log-Rendering per
  eventCount-Memo ~6× billiger (0,168→0,027 ms/Commit); „doppelte Commit-Quelle" gepinnt
  (React-18-Echo bei gemischten Context/Selector-Konsumenten, ~1 ms/Tick — voller Fix =
  Selector-Migration, Backlog); Ken-Burns-Drift stillgelegt. **Alle 24 Kampf-Kulissen jetzt
  Querformat 1536×1024** mit aspekt-basiertem Contain-Fit (kein Zoom-Beschnitt mehr, greift
  automatisch für künftige Assets). Heil-Effekte zeigen das Vitalitäts-Icon statt ✨.
- **Bildqualität-Offensive (Chef-Regel: Qualität > Dateigröße):** 57 Portraits aus Originalen
  in q92 neu kodiert, alle 61 Karten-Hintergrund-Varianten von 480px→880px q85 regeneriert.
- _Offen/Backlog: 2 vorbestehende Ausreißer aus dem neuen Guard (dragonhide_*, void_focus),
  Sim-KI-Heuristik seed7 (Magier wechselt Gear zu zögerlich), MonsterSelect ~2,8 ms/Commit im
  Leerlauf (gezielter Pass), Selector-Migration Battle/Fighter/Log (React-18-Echo-Vollfix)._

## 0.2.0 — „Patch #1: Champions of the Reach" (RELEASED 2026-07-23, Build 24353016, Branch default)

### Behoben
- **Fehlende Hintergrundbilder** bei vielen Installationen. Zonen-, Monsterkarten-, Skillkarten-
  und Hauptmenü-Hintergründe fehlten, wenn das Spiel in einem Ordner mit Klammern im Pfad lag —
  darunter der Steam-Standardpfad `C:\Program Files (x86)\Steam`.
  _Dev: inline `background-image: url(${x})` war ungequotet → die Klammern brachen den
  CSS-`url()`-Parser, der Browser verwarf die Regel. 12 Stellen (CombatPage, MainMenu, SkillPage,
  BestiaryPage, DungeonClearCeremony, ZoneMapEditor) auf `url("${x}")` umgestellt. `<img>` war nie
  betroffen (kein CSS). Betraf potenziell die Mehrheit der Steam-Spieler (Default-Pfad). Verifiziert
  im gepackten app.asar (11× gequotet, 0× alt). Save-kompatibel, kein SAVE_VERSION-Bump. Siehe
  Memory `css-url-must-be-quoted`._
- **Zweiter Ring-Slot** ließ sich nicht per Drag & Drop bestücken — Ringe konnten nur in den ersten
  Ring-Platz gelegt werden.
  _Dev: Drop-Gültigkeitsprüfung verglich den exakten Slot-Namen; Ringe deklarieren kanonisch „ring1",
  die Engine (`equipItem`) leitet intern auf ring2 um. `EquipmentOverview.tsx` Drop-Check auf
  ring1/ring2 gelockert. Engine-Logik war korrekt, Bug war rein UI._
- **Item-Tooltip vom Mauszeiger verdeckt.** Am rechten/unteren Bildschirmrand (Inventar, Ausrüstung)
  rutschte das Tooltip unter den Cursor. Es kippt jetzt auf die andere Seite des Zeigers.
  _Dev: `ItemTooltipOverlay` positionierte per Clamp `innerWidth - w`; jetzt Achsen-Flip statt Klemmen
  (`ItemTooltip.tsx`)._
- **Bögen im Crafting standen unter Metall-Stufen** („Iron", „Bloodiron" …) statt unter ihrem
  Holz-Tier. Jetzt gruppieren sich die geschnitzten Bögen nach Holz (Eiche, Aschenrinde … Götzenholz).
  _Dev: 24 `fletch_*_shortbow/longbow` (skill leatherworking) trugen Metall-Kategorie-IDs; 12 neue
  Holz-Tier-Kategorien (`bow_*`) angelegt + umgehängt. Reine Anzeige, kein Save-Impact._
- **Elementar-Runen umbenannt** — Schluss mit der Verwechslung zwischen Bau-Material und Verzauber-Rune.
  Die Waffen-Baumaterialien heißen jetzt „…splitter" (Kraftsplitter, Frostsplitter, Feuersplitter,
  Sturmsplitter, Aethersplitter, Leerensplitter) statt „…rune". „Rune" ist damit eindeutig den
  Verzauber-Runen vorbehalten.
  _Dev: 6 Item-Namen + 6 `craft_*`-Aktionen (en/de + 5 Locale-Overlays), Affix-Runen unberührt, IDs
  unverändert, kein Save-Impact. Behebt den Spieler-Report „gecraftete Rune erscheint nicht im Verzaubern"._
- **Warteschlange startete nicht aus dem Stillstand.** Seit die Aktions-Buttons nur noch in die Queue
  legen, blieb die erste eingereihte Aktion liegen, wenn gerade nichts lief. Der Tick startet sie jetzt
  selbst.
  _Dev: `skillingStep` zieht im Leerlauf (`activeActionId===null`) den nächsten Queue-Eintrag via
  `advanceActionQueue`; Test ergänzt. Kein Save-Impact._
- **Stab + Fokus gleichzeitig (Exploit, Spieler-Report via Discord).** Fünf Stäbe — u. a. beide
  Start-Stäbe — waren nicht als zweihändig markiert, dadurch ließ sich zusätzlich ein Fokus in die
  Zweithand legen (doppelter Bonus). Jetzt sind alle Stäbe konsistent zweihändig; bestehende Spielstände
  werden beim Laden bereinigt (der Fokus wandert zurück ins Inventar).
  _Dev: `twoHanded: true` an 6 Stäben (aether_runestaff im Sweep gefunden) + Integritäts-Test; Lade-Wächter
  in `sanitizeState` (2H-Mainhand + belegte Offhand → `grantLoot` zurück, Inventar→Bank→Postfach, plain wie
  Instanz). Kein Save-Bump, Vault v56–v71 grün._
- **Auto-Eat wechselt jetzt selbst das Essen (Spieler-Report via Discord).** Lief das ausgewählte
  Essen im Kampf leer, hörte Auto-Eat einfach auf zu heilen — der Charakter konnte sterben, und das
  Essens-Icon oben blieb auf dem aufgebrauchten Futter stehen. Jetzt schaltet Auto-Eat automatisch auf
  das nächste verfügbare Essen im Inventar um; ist keins mehr da, wird die Auswahl geleert (das obere
  Icon aktualisiert sich bzw. verschwindet dann von selbst).
  _Dev: `tryAutoEat` (combat.ts) prüft beim Leerlaufen des gewählten Foods `itemCount<1` und setzt
  `character.food` via neuem `findNextFood` auf das nächste Heil-Consumable (kein Heiltrank — die laufen
  über den Auto-Trank) bzw. `null`. Die Combat-UI liest die Auswahl reaktiv aus `character.food` →
  Icon zieht ohne UI-Change nach. 2 Regressions-Tests. Kein Save-Impact._

### Geändert / Hinzugefügt
- **Dritter Werkzeug-Slot (Spieler-Wunsch).** „Its weird to have 2 equipped then have 1 in the
  inventory" — stimmt. Es gibt jetzt drei Werkzeug-Plätze in der Ausrüstung, damit Spitzhacke, Axt
  und Angel/Sichel gleichzeitig angelegt sein können (Dual-Use-Waffen wie Äxte inklusive). Reine
  Ordnung: Werkzeuge wirken wie bisher auch aus dem Inventar, der Slot ändert keine Geschwindigkeit.
  _Dev: `tool3` nach tool1/tool2-Muster (EQUIP_SLOTS/TOOL_SLOTS/equipTool generisch), Puppen-Layout
  nutzt eine freie Rasterzelle (kein Grid-Umbau), Tooltip-Vergleich erweitert. Additiv im v72-Bump
  (generische Slot-Befüllung deckt Alt-Saves, Pin regeneriert). Speed-Neutralitäts-Test. DABEI
  GEFUNDEN + GEFIXT: sanitize „rettete" Dual-Use-Waffen aus Tool-Slots bei jedem Laden in die Bank
  (Whitelist prüfte `type==="tool"` statt `!!item.tool`) — vorbestehender Bug des gestrigen
  Dual-Use-Features, per Regressionstest festgenagelt, bevor er je live ging._

- **Launch-Morgen-Block (23.07.): Overflow-Bug + UI-Offensive.**
  **Behoben:** Volle Taschen konnten durch besondere Beute (Suffix-/Unique-Exemplare) real überlaufen
  (22/20), der Zähler zeigte trotzdem 20/20, und Ausrüstungs-Tausch scheiterte dann stumm. Jetzt:
  Besondere Beute geht bei vollen Taschen automatisch in den Bank-Tresor, der Tausch funktioniert
  atomar auch bei übervollen Taschen, der Zähler zeigt ehrlich „22 / 20" in Rot mit Erklär-Tooltip,
  und scheiternde Aktionen melden sich mit einer roten Einblendung im WoW-Stil („Kein Platz in
  deinen Taschen"). Außerdem: Der „Neu"-Marker auf Items feuert nur noch bei wirklich neu
  erworbenen Items (nicht mehr beim Ablegen oder nach jedem Neustart).
  **Nachschliff (Live-Test):** Kapazität zählt jetzt sichtbare Zellen statt Einzel-Exemplare —
  mehrere Exemplare eines Basis-Items teilen sich eine Zelle und kosten zusammen eine Einheit
  (Chef-Fund: „21/20" bei 19 belegten Zellen); ein weiteres Exemplar eines Items mit bestehender
  Zelle passt immer, nur ganz neue Basis-Items brauchen bei vollen Taschen Platz (sonst Bank).
  **Waffen-Offensive (Chef-Auftrag Mittag):** 14 neue Drop-Waffen quer durch alle Level-Bänder —
  Audit zeigte: Magie hatte EINEN soliden Waffen-Drop im ganzen Spiel, Melee nichts zwischen L10
  und L90. Jetzt: Dolch/Speer/Hammer/Streitaxt/Großaxt/Großschwert, 2 Stäbe/Zepter/Zauberstab/
  Fokus, 3 charakterlich verschiedene Bögen; 10 solide (1/50–1/111) + 4 Chase (1/667–1/909, u.a.
  giantSlayer-Großaxt, Bleed-Großschwert). Alle 7 Sprachen, kein SAVE_VERSION-Bump (additiv).
  **Elite-/Unique-Art KOMPLETT:** 28/28 Champions + 42/42 Items (Uniques + neue Waffen) in zwei
  Wellen integriert — Welle 1: 10 Champions echtes Alpha + Nachputz, 27 Uniques Chroma-Key;
  Welle 2: 18 Champions + 15 Items, alle Motive nach Chef-Beschluss OPAK umdesignt (Geister →
  blickdichte Mäntel, Flammen → feste Lava-Adern), dadurch Chroma-Key ohne Pink-Säume (Restmagenta
  0,0%). Intake-Pipeline ausgebaut: natives Alpha 1:1, Fake-Schachbrett-Erkennung, Halo-Saum-Putz,
  Tippfehler-Aliases, Duplikat-Hashing. Prompt-Lehre: Anti-Wiederholungs-Format (Merktabelle +
  Motivtyp-Caps + Negativ-Anker) nach 4×-Spiegelhallen- und 10×-Golem-Vorfällen.
  **Store-Offensive (parallel):** 4 About-Panels im Citadel-Look (design/marketing/store-panels/)
  + komplette About-Sektion & Kurzbeschreibung in 7 Sprachen (store-about-alle-sprachen.txt).
  **UI-Offensive:** Vollbild-Start als Standard mit Startmodus-Wahl; TopBar in der Höhe ziehbar wie
  die Sidebar; Kampf-Figuren verkleinert, damit die Kulissen sichtbar werden; Monster-Übersicht auf
  4 Spalten; Monster-Namen nach Schwierigkeit gefärbt (Grau=keine XP, Grün/Gelb/Orange/Rot) mit
  Erklär-Legende beim Hovern; Citadel-Tooltips app-weit (nie mehr vom Mauszeiger verdeckt); Holz
  statt Stein in Options-, Companions- und Offline-Containern; Companion-Karten mit thematischen
  Zonen-Kulissen; Inventar-Kopf neu (Suche volle Breite, Kategorie-Chips skalierend, „Sell" raus);
  Content-Bereich mit aufgelegtem Holzrahmen (Scrollendes verschwindet hinterm Rahmen); Queue-Texte
  gestrafft („Aktiv:"/„Warteschlange:"); Character-Kampfwerte skalieren mit der Auflösung; Elite-
  Karte kompakt mit Silhouetten-Drops.
  _Dev: ~20 Agent-Aufträge; Kern-Engine-Fixes: intakeInstance kapazitätsgeprüft → bankInstances-
  Kette, atomare Swaps mit Rollback (equipItem/-Tool/-Instance), usedCapacityUnits-Export; GameAlert-
  Primitive (useSyncExternalStore); CitadelTip-Primitive (Glow nur Attribute); --tb-scale-Resize;
  Fenstermodus via window-mode.json vor Fenster-Erstellung; diffname-Stufen aus combatPrognosis
  (Selbstmord-Schwelle ratio<0,35, dokumentiert); Details in den Agent-Berichten. Alle Einzel-Gates
  grün; Gesamt-Verifikation vor dem Paket._

- **Launch-Politur (Ship-Abnahme-Nachzügler):** Der Kampf-Knopf auf der Elite-Karte ist während eines
  laufenden Kampfs sichtbar deaktiviert (mit Hinweis) statt still wirkungslos; der Verzauberungs-Altar
  erklärt im Leerzustand jetzt, woher Verzauber-Runen kommen (Runenkunst ab Stufe 15) — zweiter
  Spieler-Report der Splitter/Runen-Verwechslung; und ein früher Elite-Unique mit Suffix erfüllt die
  Erst-Suffix-Garantie gleich mit (kein doppelter „erster" Suffix mehr).
  _Dev: EliteMonsterCard busy-Prop + `combat.elite.fightBusy`; `enchant.noRunes` lehrend ×7 Sprachen;
  `firstSuffixGranted` im Elite-Unique-Pfad mitgesetzt (elites.ts), 46 gezielte Tests grün._

- **Gegner-Schilde sind jetzt lesbar — und Status-Effekte ihr Konter (Spieler-Report „Hollow Choir: I miss 9/10").**
  Ward-Gegner (magische Schilde vor den HP, z. B. der Hohle Chor) zeigten voll absorbierte Treffer als
  nackte „0" — es sah aus wie Dauerverfehlen. Jetzt: sichtbarer **Schild-Balken** am Gegner, absorbierte
  Treffer erscheinen als „**Absorbiert**" (Schild-Symbol) statt als 0, Teil-Absorption wird beziffert,
  und der Verteidigungs-Badge erklärt den Konter: **Ward-Monster nehmen +20 % Status-Effekt-Schaden**
  (Gift, Blutung, Feuer) — Status-Schaden umging den Schild schon immer, jetzt lohnt er sich dort extra.
  _Dev: `CombatEvent.absorbed?` (Engine befüllt am Hit-/Crit-Log, UI rendert Floater/Log-Zeile/Suffix;
  alter Pool-Delta-Floater deaktiviert sich selbst, kein Doppel-Feuern). `STATUS_VS_WARD_MULT = 1.2`
  trait-basiert (wardCapacity > 0, gilt auch bei gebrochenem Schild) auf poison/burn/bleed-Ticks in
  tickEnemyEffects; DoT-umgeht-Ward per Regressionstest festgeschrieben. Tooltip-Zeile am geteilten
  DefenseTypeBadge (wirkt auf MonsterCard/Elite-Karte/Bestiarium/Dungeon). 7 neue Engine-Tests + 5
  i18n-Keys ×7 Sprachen. AUSSTEHEND nächste Session: volle Engine-Suite + Root-Balance-Guards (der
  ×1,2 könnte Envelope-Pins der Caster-Elites berühren). Kein Save-Impact._

- **Wächter-Onboarding deutlich größer.** Die geführten Erklär-Boxen (Haupt-Tutorial, Bereichs- und
  Versions-Touren) sind spürbar präsenter: größerer Kasten, größere Schrift, mehr Platz fürs
  Wächter-Porträt — in dem Moment gehört die Bühne ohnehin dem Guide.
  _Dev: reine Styling-Änderung (SpotlightGuide + geteilte Guide-Styles), responsive abgesichert.
  Typecheck + Build grün. Kein Save-Impact._

- **Der große Performance-Block: kleiner, schneller, flüssiger.** Diese Version ist ein anderes Spiel
  unter der Haube: **Download ~684 → ~130 MB** (alle Grafiken auf modernes WebP, freigestellte Items
  inklusive — dabei 7 Bronze-Rüstungen repariert, die seit jeher fälschlich weiße Kästen zeigten),
  **Spielstand-Laden nach Abwesenheit 14,5 → 1,5 s**, Erfolge-Seite öffnet in 0,2 statt 0,9 s, die
  Sammel-/Brau-Seiten (Kochen, Kräuterkunde, Sammeln) sind jetzt kategorisiert und öffnen sofort,
  **Kampf-Animationen laufen auf der GPU** (keine Mikro-Ruckler mehr durch Lebensbalken und
  Schadenszahlen), das Hauptmenü idlet praktisch kostenlos, und das Fenster erscheint erst mit
  fertigem ersten Bild statt leer.
  _Dev: PNG→WebP-Vollbatch (928→181 MB Quelle, Alpha-Audit 2.212 Dateien 100 %, Originale
  archiviert), 13 Loader + 32 CSS-urls; 480-px-Card-Thumbnails (Decode ist pixelgebunden) + Kampf-
  Backdrop-Prewarm; Balken width→scaleX bzw. clip-path bei Texturen (51 Layouts/s → 0,3 ms/s),
  Schadenszahlen top→translateY, Menü-Funken ohne var()-Keyframes (58 Recalcs/s → ~0), Quest-
  Countdown rAF→1-s-Interval; AchievementCard/ActionCard/Bestiarium-Zeilen memoisiert (Kern-Fix:
  per-Karte-useGameState entfernt), Sidebar-computeStats gated, TopBar-Quest-Dot 1 Hz; Offline-
  Catch-up: blessingForTime-Tages-Cache + computeStats-Memo + masteryPool-Index + levelFromXp-
  Binärsuche (Byte-Identitäts-Beweis); Electron ready-to-show + Dev-only-Log-Spiegel; ui-audit-
  Fixtures um Tour-Flags repariert (Abnahme-Gate wieder scharf). Kein Save-Impact._

- **Vollbild-Start + Startmodus-Wahl + Optionen im einheitlichen Look.** Das Spiel startet jetzt
  standardmäßig im Vollbild (die neue Eröffnung wirkt so, wie sie soll). In den Optionen wählbar:
  Vollbild, randloses Fenster oder Fenstermodus — Vollbild/Fenster wechseln sofort, randlos greift
  ab dem nächsten Start. Die Options-Seite wurde visuell vereinheitlicht: alle Knöpfe im
  Citadel-Holz-Look, destruktive Aktionen in Rot.
  _Dev: window-mode.json in userData, synchron VOR der Fenster-Erstellung gelesen (frame ist nicht
  nachträglich änderbar); Dev-Default bleibt windowed; F11-Sync an die Persistenz. OptionsPage/
  DisplayAudioPrefs auf combat-btn/flee normalisiert (Fund: .lang-btn &amp; Co. waren nie gestylt).
  3 neue i18n-Keys ×7. — Außerdem heute früh: Selector-Store fürs UI-Chrome (Grund-Renderlast je
  Seite halbiert, 7 Komponenten migriert, Sweep ohne Staleness), Dungeon-Karten-Thumbnails,
  Raben-Post-Brieftexte final in allen 7 Sprachen (inkl. Brennas Spuren-Zeile als NPC-Bedingung)._

- **Neue Eröffnung: Studio-Trailer, Glutfunken, Musik.** Das Spiel beginnt jetzt mit einem
  inszenierten Auftakt: Studio-Trailer auf Schwarz, danach steigen die Glutfunken des Hauptmenüs
  auf, die neue Titelmusik („The Knight Quiet Forest", ersetzt „Crown of Ashes") setzt ein, und das
  Menü faded gemächlich herein. Klick oder Taste überspringt den Trailer jederzeit. Dazu ein
  genereller UI-Gefühl-Pass: sanfter Übergang beim Seitenwechsel, einheitliches Hover-/Druck-
  Feedback auf allen Knöpfen, weiche Tooltip-Einblendungen.
  _Dev: IntroSequence.tsx (Phasen trailer→black→embers→revealed, einmal pro App-Start, Video via
  import.meta.glob — fehlt es, Verhalten wie zuvor; StrictMode-Doppel-Init-Falle gefixt: Flag-Konsum
  aus dem useState-Initialisierer in den Mount-Effekt verlegt). Fade 2,6 s (Chef-Regie). Musik als
  10-Min-Loop-Schnitt 128 kbit (9,2 MB statt 56-MB-Longplay). interaction.css mit brightness/
  transform-Feedback (kollidiert nicht mit Komponenten-Hovers), globaler :focus-visible-Ring,
  ui-fade-in für Tooltips; alles unter prefers-reduced-motion neutralisiert. Kein Save-Impact._

- **Champions des Reach — benannte Elite-Gegner durchstreifen jetzt die Welt.** Jedes freigeschaltete
  Kampfgebiet hat seinen eigenen Spawn-Rhythmus (bewusst versetzt, die Aktivität wandert durch die
  Zonen). Taucht ein Champion auf, meldet es ein Hinweis unten rechts („Ein mächtiger Gegner wurde in
  … gesichtet", Klick springt direkt hin), die Zone trägt ein pulsierendes ⚔-Banner, und im Gebiet
  steht seine Karte mit Live-Countdown ganz oben: Er bleibt maximal 15 Minuten. Champions tragen
  Titel („Grauzahn der Ausgehungerte"), sind deutlich stärker als ihre Artgenossen, aber mit
  Zonen-Ausrüstung solo machbar. Beute: dickes Materialpaket, stark erhöhte Chancen auf die
  Chase-Items der Zone, und mit 20 % Chance ihr persönlicher **Unique** — 28 neue benannte
  Gegenstände mit eigenen Effekten (von Hungerfang, das bei Kills heilt, bis zum Hollowveil Locket,
  das Schaden in eigenen Ward wandelt), jeder Fund als Instanz mit frischem Suffix-Wurf. Neue
  Spielstände treffen ihren ersten Champion schon in den ersten ~20 Minuten. Champions erscheinen
  nur bei aktivem Spiel: Wer offline ist, verpasst nichts.
  _Dev: SAVE_VERSION 71→72 (+Migration, +v72-Vault-Pin, alte Fixtures grün). Eigener eliteRng-Strom
  (aus dem Weltseed abgeleitet, konsumiert NIE state.rng → Grind-Sequenz bit-identisch, offline==
  online-Tests in Engine+Persistenz). Per-Zone-Zustandsmaschine (Ruhe/aktiv) mit gestaffelten
  CD-Bändern (55–120 Min, Früh-Haken nur createGame), Synthese nach paragonScaledMonster-Muster inkl.
  Evasion-/Ward-/Regen-/Inflict-Achsen + Enrage-Dämpfung; Fenster friert bei laufendem Elite-Kampf
  bei 0 ein (Kampf darf enden). 28 Varianten + 28 Uniques (27 Procs aus Bestands-Familien, 1 neuer
  Kind `wardSiphon` 8 %), alles ×7 Sprachen (apply.ts um elites-Namen erweitert). UI: klickbarer
  Elite-Toast (Breadcrumb-Muster), Zonen-Badge, EliteMonsterCard mit Countdown; Art-Konvention
  `assets/monsters/<variantId>.png` mit Basis-Art-Fallback. Root-Suite 1.254+ Tests grün, Balance-
  Guards ohne Aufweichung._

- **Das Jagd-Paket: die Champions bekommen ein Geflecht.** Fünf Aufbauten auf dem Champions-System:
  **Brennas Kopfgeld-Brett** auf der Slayer-Seite zeigt live, wo Champions aktiv sind (mit Restzeit
  und Sprung-Knopf), wo frische Spuren sind und wo Ruhe herrscht — und jeder Champion-Kill zahlt
  1 Quest-Marke Kopfgeld. **Spuren &amp; Vorzeichen:** kurz vor einem Spawn zeigt die Zonen-Karte ein
  dezentes Fährten-Zeichen. **Segen-Synergie:** am Blutmond steigt die Unique-Chance der Champions
  (20→25 %), bei der Wilden Jagd tauchen sie schneller wieder auf. **Champion-Kodex** im Bestiarium:
  Sichtungen, Kills, Uniques und schnellster Kill je Champion, Ungesichtete als „???". **Raben-Post:**
  der erste Champion-Kill und der erste Unique-Fund bringen je einen Brief ins Postfach (Brenna legt
  etwas bei). Dazu eine **Spawn-Fanfare** (tönt, sobald das Audio-Asset liegt).
  _Dev: alles im v72-Bump (Pin regeneriert, Fixtures grün). eliteCodex-State + sanitize; Mail-Union
  `kind:"letter"` (textKey sprachneutral im Save); Brief-Trigger aus Codex-Summen abgeleitet (keine
  Extra-Flags); Segen-Synergie über optionales nowMs (neutral ohne), inkl. Nachfix der Aufrufstelle
  (Blutmond-Bonus wäre sonst live inert gewesen); Fanfare via import.meta.glob (fehlende Datei =
  stiller No-op). 27 neue Tests; Turbo-Root-Lauf 3/3. Brief-TEXTE: EN/DE-Platzhalter bis zur
  Ton-Abnahme, dann ×7. OFFEN (Backlog): eigene Kopfgeld-Zeile im Kampf-Log._

- **Dein erster besonderer Fund kommt jetzt früh.** Der erste Ausrüstungs-Drop eines neuen
  Spielstands rollt garantiert ein Suffix — das Instanz-System (jeder besondere Gegenstand ist ein
  eigenes Exemplar mit eigenem Wurf) zeigt sich damit in den ersten Minuten statt irgendwann.
  Bestehende Spielstände sind unberührt.
  _Dev: Garantie im tryCraftSuffix-Choke-Point (Chance→1 beim ersten Mal, identische RNG-Zugzahl),
  neues Flag `firstSuffixGranted` im v72-Bump (Alt-Saves → true), sanitize konservativ (korrupt →
  true, kein Wiederhol-Exploit). 11 neue Tests inkl. offline==online._

- **Die Bewohner reagieren auf die Welt.** Verwalterin, Händler, Brenna und der Wächter kommentieren
  jetzt, was draußen passiert: den heutigen Segen („Blutmond. Die Bestien werden dreist, und ihre
  Bälge sind fett."), einen aktiven Champion, deine Todesserie oder deine Slayer-Serie.
  _Dev: 16 bedingte NPC-Zeilen (Priorität Elite > Spielerzustand > Segen) über neues npcVoice-Util +
  priorityLine-Prop an NpcGreeting; Texte aus dem Wächter-Stimmen-Pack v2 (gesprochenes Register),
  ×7 Sprachen. 2 Kapitel-Zeilen bewusst zurückgestellt (fehlender Breadcrumb, s. update-backlog)._

- **Blessings of the Reach — die Welt hat jetzt eine Tageslaune.** Oben in der Sidebar (wo früher das
  Logo saß) zeigt eine Kartengrafik den heute aktiven Welt-Segen. Jeder Wochentag hat seinen eigenen,
  milden Bonus: Blutmond (+15 % Bestien-Beute, Sa) · Aschesturm (+15 % Sammel-Tempo, Di) · Totenstille
  (+10 % Handwerks-Tempo, Mi) · Moderluft (+10 % seltene Drops, So) · Nebelwacht (+10 % EP, Mo) · Gier
  des Reach (+20 % Gold, Do) · Wilde Jagd (+10 % Angriffstempo, Fr). Bewusst sanft (kein FOMO), wechselt
  zur lokalen Mitternacht; Hover/Klick zeigt Flavor-Text, exakten Effekt und einen Countdown bis zum Wechsel.
  _Dev: rein aus dem lokalen Wochentag abgeleitet (`blessingForTime`, `new Date(nowMs).getDay()`) → KEIN
  Save-State, KEIN SAVE_VERSION-Bump, keine Migration. Die 7 Effekte hängen an einem optionalen `nowMs`,
  das per Tick durchgereicht wird (fehlt es → Multiplikator 1, alle Alt-Aufrufer/Sim bit-identisch);
  offline==online an lokalen Tagesgrenzen segmentiert (Test beweist echte Per-Tick-Segmentierung, keine
  Start-/End-Tag-Pauschale). Sidebar-Panel mit 3:2-Karte (gequotetes `url()`), Portal-Tooltip, Icon-Rail-
  Kollaps auf Quadrat-Kachel; 7 Sprachen, 15 neue Engine-Tests. Chef liefert die 7 Kartengrafiken._

- **Spielstand-Laden nach Abwesenheit massiv beschleunigt (Chef-Report: „lädt ewig, Spiel laggt").**
  Wer nach Stunden zurückkam, wartete beim Laden bis zu ~15 Sekunden im Freeze, während die
  Offline-Aufholung rechnete. Jetzt: unter 2 Sekunden selbst beim vollen 8-Stunden-Fenster.
  _Dev: gemessen am echten Save (14,5 s → 1,5 s). Drei ergebnis-identische Optimierungen: Tages-Cache
  in blessingForTime (Date-Konstruktion mit lokaler TZ lief mehrfach PRO Tick); transienter
  computeStats-Memo (WeakMap + vollständiger Eingaben-Fingerprint, In-place-Enchant-Falle über
  Inhalts-Vergleich abgedeckt + Guard-Test); masteryPoolBonus über Skill-Index statt 2×760-Aktionen-
  Scan; levelFromXp als Binärsuche (Äquivalenz mit 200k+ Proben bewiesen). offline==online per
  A/B-Byte-Diff über den kompletten Sim-Report belegt; SAVE unberührt. Alle Suiten + Turbo 3/3 grün._

- **Auto-Trank verbrannte bei vollen HP endlos Heiltränke (Spieler-Report aus China, via Bug-Tool).**
  Wer als Auto-Trank einen Heil-über-Zeit-Trank (z. B. Blutheil-Trank) nutzte UND „Tonika automatisch
  nachtrinken" aktiv hatte, trank nach dem ersten Schluck ununterbrochen weiter — auch bei 100 % HP,
  beim schwächsten Draught alle 2 Sekunden ein Trank. Jetzt gilt der Auto-Rebuff nur noch für echte
  Dauer-Tonika (Kampf-/Regenerations-Buffs); Heil-Nachschub steuert allein die Auto-Trank-Schwelle.
  _Dev: `tickBuffs`-Rebuff-Pfad trank JEDEN abgelaufenen Buff-Träger nach, ohne HP-Prüfung — auch die
  bewusst kategorielosen HoT-Draughts (Heil-Mechanik, keine Dauer-Buffs). Fix: `if (!def.category)
  continue;` im Rebuff-Loop (consumable.ts) — kategorielos = Heil-HoT = Sache von tryAutoPotion
  (Schwelle + Cooldown + HoT-Guard). Regressions-Test in buffs.test.ts; bestehende Rebuff-Tests für
  kategorisierte Tonika unverändert grün. Kein Save-Impact._

- **Kampf-Begleiter sind jetzt an den Kampfstil gebunden.** Die 7 Kampf-Pets droppen nur noch, wenn
  du mit ihrem Stil kämpfst: Eisenschlund und Chitinpanzer für Nahkämpfer, Blutbracke und Aasschwinge
  für Fernkämpfer, Scheiterling, Frostgroll und Beinhaus für Magier. Vorher würfelten alle 7 bei jedem
  Kill mit — dadurch fiel das erste Pet rund siebenmal zu häufig (Spieler-Report: 4 Pets in 30 Stunden).
  Bereits erhaltene Begleiter bleiben selbstverständlich erhalten.
  _Dev: `PetDef.source`-Combat-Variante mit Pflichtfeld `style` (WeaponStyle); `tryPetDrop` filtert vor
  dem RNG-Zug (Sequenz-Disziplin: nur passende unbesessene Pets ziehen nextFloat), Kill-Stelle reicht
  `stats.style` durch (dieselbe Quelle wie das Offense-XP-Routing). Effektive Erst-Pet-Chance sinkt von
  ~1/12.100 auf ~1/28.000–1/44.000 je Kill. Integritäts- + Verhaltens- + RNG-Zähl-Tests. Kein Save-Impact._

- **Der Wächter meldet sich zu Wort.** Zwei der meistgesehenen Momente sprechen jetzt mit der Stimme
  des Chronisten statt in Systemtext: Der **Offline-Bericht** beginnt mit einer Wächter-Zeile darüber,
  was in der Abwesenheit wirklich geschah („Du warst 6h weg. Das hier ist in der Zeit passiert."),
  gewählt nach dem, was passiert ist (Tod vor Pet-Fund vor Beute vor Ruhe). Und das **Todes-Popup**
  trägt den Tod als Chronik-Eintrag nach Gegner-Familie ein, mit Steigerung nach deiner Gesamt-Bilanz
  (erster Tod: „Passiert hier draußen jedem. Steh wieder auf." · später: „Wieder einer. Ich sage ja
  nichts. Ich schreibe es nur auf.").
  _Dev: Teil des Identitäts-Pakets „Das Reach führt Buch" (identity-strategy.md). OfflinePopup: reiner
  Selektor über OfflineSummary (Prioritäten + dokumentierte Schwellwerte, deterministische Varianten-
  Wahl), kein neuer Save-State. DeathPopup: family-gekeyte Zeilen (6 Familien + Fallback) über den
  vorhandenen deadMonsterId-Snapshot, Eskalation über state.stats.deaths (1 / 2–9 / 10+). 22 neue
  i18n-Keys in allen 7 Sprachen, Texte im gesprochenen Register (v2 nach Chef-Abnahme; Laut-Lese-Regel
  in natuerliche-spieltexte.md erweitert). Kein Save-Impact._

- **Attribute erklären sich jetzt selbst.** Auf dem Charakterbogen zeigt jede Attribut-Karte beim
  Überfahren (oder per Tastatur-Fokus) ein Tooltip, das erklärt, worauf das Attribut wirkt.
  _Dev: Portal-Tooltip an document.body (entkommt dem overflow:hidden der Character-Spalten),
  über/unter der Karte je nach Platz, 7 Sprachen, `cursor: help` + `:focus-visible`-Ring, aria-label.
  Ersetzt das unauffällige native `title`. `EquipmentOverview.tsx` + `character.css`._

- **Action-Queue: plane deine Aktivitäten voraus.** Rechts gibt es jetzt eine Warteschlange — reihe
  mehrere Tätigkeiten mit Zielmengen aneinander (z. B. „100× Kupfer abbauen, dann 100× Eisen"), und
  dein Charakter arbeitet sie automatisch nacheinander ab, auch offline. Läuft eine Aktion aus
  Material leer oder erreicht ihre Menge, startet die Engine die nächste von selbst.
  _Dev: neuer persistenter State `actionQueue`, SAVE_VERSION 69→70 (+Migration, +v70-Vault-Pin, alte
  Fixtures grün). Engine schaltet an den 3 Endpunkten weiter, hält bei vollem Inventar an; Offline==
  Online bit-identisch. Jede Aktions-Karte (Abbau wie Crafting) hat ein **4er-Grid [1×][25×][50×][∞]**,
  das die Aktion **stapelnd** in die Queue legt (5×50 → ein Eintrag ×250); laufende Aktion + gleiche
  Queue-Einträge werden als „×N" zusammengefasst. Ersetzt „Start" und das frühere Shift+Klick. Material-
  lose Queue-Aktionen werden zur Laufzeit übersprungen. Presets 1/25/50._
- **Crafting-Menüs starten eingeklappt** + **Rezept-Suche.** Beim Öffnen einer Skill-Seite sind alle
  Kategorien zugeklappt (die höheren gesperrten Stufen bleiben als Header sichtbar). Eine Suchleiste
  oben findet in der langen Liste sofort ein Rezept und klappt passende Kategorien auf.
  _Dev: `SkillPage` collapse-Initializer + `.invf-search`-Filter (ItemFilterBar-Muster)._
- **Vom Wiki direkt zur Quelle springen.** Im Item-Wiki sind die Quellen jetzt klickbar: eine
  **Rezept-/Zutaten-Aktion** → springt zur Skill-Seite, klappt sie auf und hebt die Karte hervor; ein
  **Gegner** → springt ins Kampfgebiet, öffnet die Zone des Monsters und lässt dessen Karte kurz golden
  aufglühen.
  _Dev: `util/skillJump.ts` + `util/monsterJump.ts` (Pub/Sub, gespiegelt) + `ItemWikiModal` klickbare
  Zeilen (Monster + Aktion; Dungeon bewusst Text). CombatPage `MonsterSelect` findet die Zone + pulst die
  `monstercard-<id>`. Beide nonce-getrieben (greifen auch auf der Zielseite). Ersetzt die alte „pinned
  recipe list" vollständig._
- **Elementar-Kategorie „Runes" → „Shards".** Passend zur Splitter-Umbenennung heißt die Runecrafting-
  Kategorie der Elementar-Materialien jetzt „Shards"/„Splitter"; die Verzauber-Runen-Kategorie bleibt „Runes".
  _Dev: `rune_runes`-Kategoriename (+5 Locale-Overlays), `rune_affixes` unberührt. Hinweis: `shade_rune`
  (Schattenrune, Kampf-Drop) liegt in derselben Kategorie und zeigt nun auch unter „Shards"._
- **Enchanting-Fenster aufgeräumt.** Die Item- und Runen-Auswahl scrollen jetzt intern (statt die Seite zu
  strecken), und der Hintergrund nutzt eine arkane Textur statt des grauen Gerölls.
  _Dev: `.ench-select-list`/`.ench-rune-groups` max-height + overflow; `bg_purple.png` gekachelt._
- **Tooltips im Citadel-Rahmen.** Die Hover-Tooltips nutzen jetzt den 9-Slice-Holzrahmen wie die Panels.
  _Dev: `.attr-tip` border-image; das große Item-Tooltip hatte ihn bereits._
- **Postfach-System — volle Taschen verlieren nichts mehr.** Läuft dein Inventar (und Lager) beim
  Sammeln, Crafting oder Kämpfen voll, stoppt die Aktivität nicht mehr und nichts geht verloren: der
  Überschuss landet gestaffelt in einem **Postfach** (neuer 4. Menüpunkt unten links, mit Zähler-Badge).
  Dort holst du per „Alles abholen" alles zurück, sobald du Platz gemacht hast — WoW-artiges Fenster
  mit Item-Grid.
  _Dev: `mailbox`-State + `grantLoot`-Überlauf (Skilling/Crafting in `tick.ts`, alle 3 Kampf-Loot-Stellen
  in `combat.ts`; Slayer-/Cape-Rollback-Pfade bewusst unberührt), ein stehendes Überlauf-Mail (gestapelt,
  kein Mail-pro-Item), `inventory_full`-Loot-Stopp entfernt. `SAVE_VERSION 70→71` (+Migration, +v71-Vault-
  Pin, alte Fixtures grün). Determinismus offline==online bewiesen._

- **Äxte lassen sich jetzt im Werkzeug-Slot tragen (Spieler-Report via Discord).** Eine Axt ist Waffe UND
  Holzfäll-Werkzeug — jetzt kannst du sie in den Werkzeug-Slot legen (Kampfwaffe in der Hand + Axt als
  Werkzeug + freier Inventar-Platz), nicht nur in die Mainhand. (Der Holzfäll-Bonus wirkte ohnehin schon
  passiv, sobald die Axt irgendwo im Inventar/getragen liegt.)
  _Dev: `equipTool` akzeptiert jetzt jedes Item mit `tool`-Feld (nicht nur `type:"tool"`) + exportiert;
  Drop-Check + Routing in `EquipmentOverview` (Werkzeug-Slot → equipTool, sonst equipItem → Mainhand).
  Kein Save-Impact; Test ergänzt._

- **„Was ist neu"-Tour beim Update** + **Queue-Panel startet eingeklappt.** Wer einen Spielstand von der
  Vorversion lädt, bekommt eine kurze interaktive Tour: sie deutet auf die (jetzt standardmäßig
  eingeklappte) Action-Queue und ihren Aufklappen-Knopf (antippen zum Öffnen) und auf den Sidebar-Rand
  (ziehen zum Breite-Ändern). Neue Spieler sehen sie nicht.
  _Dev: `FeatureTourGuide` (SpotlightGuide `requireAction`, interaktives Vorrücken), gegated auf
  `onboarding.toursSeen.featureTourV1` (neue Spieler in `newGameOnboarding` vorab `true`);
  `data-guide-id`-Ziele auf Queue-Toggle + Sidebar-Resize-Handle; 7 Sprachen. Queue-Panel-Default auf
  eingeklappt (`uiPrefs`, localStorage). Kein Save-Bump._

- **Rechtsklick wirft aus der Warteschlange.** Rechtsklick auf die **laufende** Aktion stoppt sie (auch
  eine ∞-Aktion, die sonst schwer zu beenden war); Rechtsklick auf einen **wartenden** Eintrag entfernt
  ihn — beides in der vollen Liste wie in der eingeklappten Icon-Rail.
  _Dev: `ActionQueuePanel` `onContextMenu` → laufend = `setActiveAction(…, null)` (Engine schaltet dann
  zur nächsten Queue-Aktion), wartend = `dequeueAction`. Hinweis `queue.rightClickEject` in 7 Sprachen.
  Kein Save-Impact._

### Balance / Text-Korrektur
- **Attribut-Beschreibungen an die tatsächliche Mechanik angeglichen** (die alten Texte nannten
  Effekte, die es im Spiel nicht (mehr) gibt): STR = Nahkampfschaden (vorher „…& Tragekraft");
  CON = Max-Leben (vorher „…& Verteidigung"); WIS = Mana-Regen & Max-Mana (vorher
  „…& Magieverteidigung"); LCK = Krit-Chance & Krit-Schaden (vorher „Loot-Chance & …").
  DEX zusätzlich um „Fernkampfschaden" ergänzt. Alle 7 Sprachen.
  _Dev: aus `computeStats` verifiziert. OFFEN als Design-Frage an Chef: sollen einige dieser alten
  Versprechen stattdessen IMPLEMENTIERT werden (z. B. LCK → Loot)? Dann Post-Launch-Balance-Task._
