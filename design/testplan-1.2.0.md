# Testplan 1.2.0 „Threads, Traps & Spellfire" (Chef-Abnahme, Stand 29.08.2026, Commit d792ee2)

Reihenfolge nach Risiko. Erst mit einem ALTEN Save (1.1.x) testen, dann mit einem frischen Charakter. Sprache zwischendurch auf EN und RU umschalten (längste Texte).

## A. Save-Migration (SAVE 86), das Wichtigste

- [ ] 1.1.x-Save laden: kein Fehler, alle Skills da, Handwerk-XP aufgeteilt: Handwerk behält Leder/Bogen/Schild-XP, **Schneidern** bekommt XP aus Roben, Umhängen, Stoff (Meisterschaft-Seite zeigt beide Skills mit plausiblen Stufen).
- [ ] Angelegte Roben/Umhänge bleiben angezogen, auch wenn die Schneidern-Stufe unter der Anforderung liegt.
- [ ] Mana-Boni alter Items sind zu Zauberreserve umgerechnet (+1 Mana-Regen = +10 Reserve), kein Item zeigt mehr „Manakosten" oder „Mana-Regen".
- [ ] Besessene Pets sind noch da (Begleiter-Seite), Erfolge-Zähler unverändert (311 Erfolge, „Trophäenhalle" jetzt 29 Champions).
- [ ] Update-Hinweis beim ersten Start zeigt „Update 1.2.0: Threads, Traps & Spellfire" (DE: „Fäden, Fallen, Feuer") mit 5 Punkten, danach nie wieder.
- [ ] Spiel speichern, neu starten, weiterspielen: nichts verloren (Autosave läuft jetzt alle 5 s).

## B. Jagen (neuer Skill)

- [ ] Sidebar zeigt „Jagen" mit Icon; Seite mit Kopfzeile (Köder, Fallen, nächster Platz, Fänge) und 6 Fallenkacheln, gesperrte Kacheln nennen Stufe 5/15/30/50/75.
- [ ] Falle stellen: Gebiet-Modal (groß, zweispaltig) zeigt nur im Kampf freigeschaltete Gebiete, fangbare Kreaturen und Beute; Wut-/Dungeon-Bosse fehlen.
- [ ] Ohne passenden Köder: Stellen gesperrt, Hinweis nennt den Köder und die Angel-Aktion (Wurm 1, Maden 20, Krebs 40, Tintenfisch 60, Glühköder 80).
- [ ] Köder angeln (Angeln-Seite, eigene Aktion je Stufe), dann Falle stellen: Köder wird abgezogen, Restzeit läuft (5 bis 60 min je Gebiet).
- [ ] Fang: Popup/Protokoll nennt Kreatur, 5 Beute-Würfe, Gold, XP = 5× Kampf-XP der Kreatur, Erstfang doppelt; Jagdbuch (Sammelalbum unten) trägt die Kreatur ein.
- [ ] Auto-Nachködern: mit Köder im Inventar ODER Lager stellt die Falle sich neu; **ohne Köder** bleibt sie mit Badge „Wartet auf Köder: <Sorte>" stehen (leerer Balken), und startet von selbst, sobald Köder wieder da ist. Auto-Aus auf einer wartenden Falle leert sie.
- [ ] Offline: Spiel 20 min schließen, Fänge beim Start werden nachgeholt (Offline-Bericht).
- [ ] Fallen-Knöpfe (Stellen, Abbrechen, Leeren, Auto) sind Stahlrahmen.
- [ ] Meisterring Jagen (Stufe 99, nur mit Dev-Save prüfen): Beute-Mengen ×2.

## C. Fasern, Stoff, Schneidern

- [ ] Sammeln: Nessel-, Flachs-, Dornhanf-, Geisterseide-, Sternflachs-Knoten mit Saat als Nebenfund.
- [ ] Anbau: die 5 Fasern als Saat pflanzbar, Ernte gibt Fasern.
- [ ] Schneidern-Seite: Weben (5 Stoffe), alle Roben und Umhänge dort, NICHT mehr unter Handwerk; Handwerk hat nur noch Leder, Bogen, Sehnen, Schilde.
- [ ] Rezepte: jede Robe/jeder Stoff-Umhang braucht Stoff der Stufe, kein Leder mehr (Stichprobe: Lehrling, Frost, Trübgewebe, Leerenweb). Leder nur bei Lederumhang, Waldläufer, Kriegsumhang und Fernkampf.
- [ ] Nessel-Sehne: Bogen ab Stufe 1 ohne Kampf herstellbar.
- [ ] Trübgewebe-Set: 5 Teile (Robe, Kapuze, Handschuhe, Schuhe, Beinkleid) mit neuen Bildern, Set-Bonus zählt 5.
- [ ] XP beim Weben/Roben geht auf Schneidern, beim Leder auf Handwerk; Meisterring/-weihe Schneidern bei 99 (Dev-Save).
- [ ] Erfolge „Meisterschneider" und „Meisterjäger" existieren (Erfolge-Seite, Kategorie Meisterschaft).

## D. Magie: Zauberreserve, Zauberfokus, Elemente

- [ ] Kein Mana-Balken mehr im Kampf, stattdessen Zeile „Zauberreserve" auf dem Charakterbogen; Zauber kosten nichts, kein Stabhieb-Rückfall mehr.
- [ ] Magie-Haltungen heißen Fokus und Abwehr (nicht Offensiv/Defensiv). Fokus: +1 % Zauberschaden je 30 Reserve (Deckel 15 %), Abwehr: +1 % Ward-Regen je 20 Reserve (Deckel 30 %); Reserve = 30 + 10·Weisheit + Item-Boni (INT ändert sie NICHT); Tooltips zeigen die echten Werte.
- [ ] Weisheit: Tooltip nennt Status-Widerstand (1 %/Punkt, Deckel 40 %); mit hoher WIS sind Gegner-Brand/Gift sichtbar kürzer.
- [ ] Ward regeneriert außerhalb des Kampfes 5 %/s, Kampf startet mit vollem Ward.
- [ ] Zauberfokus: Karte eines Stabs zeigt „Zauberfokus" und die echte Spanne mit deiner INT; INT erhöhen (Rüstung wechseln) ändert die Spanne.
- [ ] Elementleiter: Kupfer-Stab Feuer / Kupfer-Zauberstab Frost, Bronze Blitz/Gift, Eisen Feuer/Frost, Stahl Arkan/Blitz … Titan/Aetherium Aether (Kartentext + Element-Partikel passen zusammen).
- [ ] Elementar-Effekte je einmal sehen: Brand (+10 % Schaden, Körper-Flammen), Frost (3. Kälte = Einfrieren, dann 6 s Immunität), Schock (Gegner-Angriff verzögert 0,4 s, Crit-Bogen mit Protokollzeile „Überspringen"), Gift (bis 5 Stapel), Leere (Status „Entzug", eigenes Icon), Arkan (Resonanz-Stapel), Aether (Protokoll „Lichtsegen: +X Ward").
- [ ] Schock-Kartentext zeigt die Anwendungschance, nicht die Stärke.
- [ ] Gegner-Elemente wirken genauso auf dich (Aschfelder-Brand, Frost-Gegner in der Krypta).

## E. Kampfeffekte (Partikel)

- [ ] Optionen: Kampfeffekte „Voll / Reduziert / Aus" wirken sofort.
- [ ] Nahkampf (Hiebe, Blut/Ichor/Knochenstaub je Gegnerfamilie), Fernkampf (Pfeilflug), Magie in allen 7 Themen (Geschoss + Einschlag + Magie-Blut), Block-Funken, Fehlschlag, Crit-Ring.
- [ ] Status-Körpereffekt: Brand-Flammen auf Gegner UND auf dir, Größe passt (nicht riesig), bleibt beim **Panel-Resize** am Körper, endet beim Tod des Gegners.
- [ ] Alle 6 Begleiter-Fähigkeiten zeigen einen Effekt.
- [ ] Performance: 10 min Dauerkampf im Fenster + Vollbild, kein Ruckeln, kein Effekt bleibt hängen.

## F. Ausrüstungs-Kits

- [ ] Charakterbogen: 3 Kits mit eigenen Items inkl. Werkzeugen; Wechsel nur außerhalb des Kampfes; Wechsel füllt HP/Ward/Reserve.
- [ ] Wechsel Kit 1 → leeres Kit 2 → Kit 1: **kein „Seltener Fund"/„Verzaubert"-Popup** für die Items des anderen Kits (auch verzauberte Teile).
- [ ] Tooltip eines inaktiven Kits listet Items und Werkzeuge; Werkzeug-Tempo aus inaktiven Kits zählt beim Sammeln.
- [ ] Bank/Item-Wiki „Entdeckt" kennt Items in inaktiven Kits.

## G. Esthar, Ossric, Begleiter

- [ ] Hochland: Champion „Ossric der Markgebundene" (Kampfliste), Unikat „Esthar, Sturm der Gebeine" mit Blutung + jeder 4. Hieb doppelt; Karte zeigt Effekt, Wiki nennt Ossric als Quelle (Dev-Save: Drop erzwingen oder 2 %-Chance).
- [ ] Champion-Unikate zeigen ihren Effekt auf der Karte (Lebensraub etc.).
- [ ] Begleiter-Seite: Leon, der Gefürchtete (Jagen) und Seidenweber (Schneidern) mit Bild; Passiv/Aktiv nur sichtbar, wenn besessen, sonst Hinweis; kein Overflow bei 1366×768 und 1920×1080.
- [ ] Leon im Kampf: Bärenfalle = Blutung; beim Jagen gelegentlich „zehn Beute-Würfe".
- [ ] Kill-Heilung/-Ward/-Abklingzeit mehrerer Items summieren (Protokoll/Tooltip).
- [ ] Warteschlange und Tod: 20× Eber einreihen, danach eine Sammel-Aktion; beim Tod (ohne Essen gegen einen zu starken Gegner) verfällt der Rest des Eber-Eintrags, die Sammel-Aktion läuft von selbst an, das Warteschlangen-Fenster nennt „Übersprungen: Eber“. Gleiches offline (Spiel schließen, Tod fällt ins Offline-Fenster).
- [ ] Ward bei Folgekämpfen: Respawn füllt nur 10 % nach, kein voller Reset; nach dem Stoppen lädt er im Leerlauf in ~20 s voll.

## H. UI, Karten, Kleinkram

- [ ] Item-Karten passen sich horizontal an (lange Stat-Zeilen nicht gequetscht), Verbrauchsgüter-Karten (Eintopf, Tonikum) bleiben im Rahmen.
- [ ] Warteschlangen-Raster 1 / 25 / X / ∞ mit Eisenrahmen, X-Eingabe funktioniert.
- [ ] Bank: Shift-Klick markiert keinen Text; Discord-Knopf in den Optionen weg; Fehlerdialog löscht den Entwurf nach dem Senden.
- [ ] Prompt-Extractor / Charakter-Export: im gepackten Build OHNE `GR_DEVTOOLS=1` NICHT sichtbar; mit Dev-Modus Export transparent, ohne Werkzeuge.
- [ ] 7 Sprachen Stichprobe (DE, EN, RU): Jagen-Seite, Schneidern-Seite, Begleiter-Karte, Kampfprotokoll, Optionen-Hinweis Kampfeffekte, Update-Hinweis; keine rohen Schlüssel wie `pet.effect.…`.
- [ ] Auflösungen 1366×768 und 1600×900: Jagen-Seite, Gebiet-Modal, Begleiter-Karte, Kampf mit allen Panels, nichts abgeschnitten.

## I. Gepackter Build (vor dem Upload)

- [ ] `pnpm build` + Packaging, Installation nach `C:\Program Files (x86)\…` (Klammer im Pfad), alle Bilder laden (Köder, Trübgewebe, Leon, Seidenweber, Esthar, Ossric, Entzug-Icon, Schneidern-Icons).
- [ ] Steam: Erfolge MASTER_TAILORING und MASTER_HUNTING in Steamworks angelegt, Bilder hochgeladen, Dev-Save-Test löst sie aus.
- [ ] Altes Save aus dem Steam-Ordner kopieren und im gepackten Build laden (Migration nochmal echt).
