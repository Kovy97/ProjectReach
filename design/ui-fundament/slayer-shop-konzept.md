# Slayer, Belohnungs-Shops, Laden — Kurzkonzept

<!-- claude:2026-10-17T19:30:00+02:00 -->

Chef 17.10.: „Aufgliederung und Layout gefallen mir nicht. Mach's besser." Gerendert de/ru,
1366×768 + 1920×1080, Warteschlange zu/offen (Vorher-Bilder: Scratchpad `redesign-before`).
Gemeinsames Muster aller drei Seiten danach: **Kopfzeile = NPC + Währung + Reiter**, darunter
**eine** Arbeitsfläche; Angebote als kompakte Zeilen/Kacheln statt Riesenkarten. Material
(Basalt/Leder/Schiefer, Holz- und Eisenrahmen) bleibt überall.

## 1. Slayer-Seite

**Stört:** Brenna 4× (Begrüßung, Reiter, 300-px-Porträt + Namensschild, zweite Sprechbox mit fast
gleichem Inhalt). Punkte belegen eine eigene Vollbreiten-Zeile. Leerer Zustand = 400 px hohe Box
mit drei Zeilen Text. Das Zielmonster (das Wichtigste) ist ein 80-px-Daumennagel. Der Shop
(13 Bildkarten à ~360 px) beginnt bei 1366×768 unter dem Seitenrand.

**Neu:** (1) Kopfzeile: Begrüßung | Punkte | Meister-Reiter (wie Laden: NPC | Gold | Reiter).
(2) **Auftragszettel** als eine Karte mit drei Zonen: großes Monsterbild | Name, Ort, Fortschritt,
Belohnung + Serie | Aktionen (Sofort kämpfen, Einreihen, Überspringen/Marke, Gratis-Skip).
Leer: Totenkopf-Platzhalter | „Kein aktiver Auftrag" | „Neuen Auftrag holen" — gleiche Höhe wie
ein Auftrag, kein Leerraum. (3) Belohnungs-Shop als kompakte Angebotszeilen (Bild | Name, Stufe |
Preis-Knopf), 2–5 Spalten nach Panelbreite.
**Spielersicht:** „Was jage ich, wie weit bin ich, los geht's" steht in einer Zeile; einkaufen ist
die seltene Nebenhandlung darunter und passt jetzt auf eine Bildschirmhöhe.

## 2. Belohnungs-Shops

**Slayer:** siehe oben (schlechter gerendert: Shop unsichtbar ohne Scrollen, Karten riesig).
**Aufgaben → Belohnungs-Shop stört:** Markenbestand doppelt (Kopf + Panel), Titel wiederholt den
Reiter, Regale als Akkordeon mit dem *aktuellen* Regal ganz unten — bei 1366×768 sieht man nur
drei zugeklappte Balken und keine einzige Ware; Angebotskarten 250 px hoch für ein 64-px-Bild.
**Neu:** Regale als Reiterleiste (aktuelles Regal vorgewählt), darunter die Waren desselben
Regals als kompakte Zeilen (Bild + Bündel | Name, Preis | Kaufen), gleiches Muster wie im
Slayer-Shop. Doppelter Bestand und Doppeltitel entfallen; der Kopf-Bestand bleibt.

## 3. Laden (Kaufen/Verkaufen)

**Stört:** Eigene Spalte „Warengruppen" für 7 Knöpfe (bei 16 Waren insgesamt), Warenkarten
230 px für Ein-Gold-Anfängerware, bei 1366 + offener Warteschlange ist keine einzige Ware
sichtbar. Verkaufen nutzt flache Kästen und andere Breiten als Kaufen; Hinweis „wähle *oben*"
stimmt nicht, wenn der Tresen rechts steht.
**Neu, Kaufen:** „Ich will kaufen → Warengruppe (Leiste oben) → Ware (Raster links) → Preis und
Menge (Tresen rechts) → kaufen". Warengruppen als Leiste über der Arbeitsfläche, Aufwertungen
bleiben oben im Warenraster (Chef), danach Meisterringe (nur bei Verlust), dann die Waren in
kompakten Kacheln. **Verkaufen:** spiegelt Kaufen: Inventar links, Handelstresen rechts (gleiche
Breite, gleiche Rahmen) mit Auswahl + Menge, darunter Rückkauf. Massenverkauf bleibt über dem
Inventar.

**Bewusst nicht geändert:** Begrüßungen, Meister-Reiter, Kauf-/Verkaufslogik, Mengenwahl,
Massenverkauf-Popups, Shift-Klick, Rückkauf, Hotkeys, Tour-Anker.
