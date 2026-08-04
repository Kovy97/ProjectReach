---
name: lore-dev-und-aschechronik
description: "Neuer Agent lore-dev (.claude/agents/lore-dev.md, fable) + Hauptquest-Plan „Die Aschechronik\""
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-GO 2026-07-12: **Story-Strang „Die Aschechronik"** — durchgehende Hauptquest (~20 Kapitel,
L1→Endgame), erzählt vom Wächter des Reachs (bestehender Onboarding-Erzähler = einzige sprechende
Figur), gebaut auf dem EXISTIERENDEN Quest-System; aktives Kapitel als „Kompass"-Pin auf den
Spiel-Seiten (ersetzt/verschmilzt mit dem „Nächste Freischaltung"-Banner-Vorschlag).

**Neuer Agent `lore-dev`** (.claude/agents/lore-dev.md, model fable): Revier NUR design/lore/**,
schreibt nie Code/Content; ausgeliefertes Spiel = Kanon; Ton „sterbende Welt, knapp-würdevoll";
Doku deutsch mit EN-Namen; Glossar DE/EN pflegen. Erstauftrag läuft: design/lore/weltlore-grim-reach.md
(Kosmologie/Götzen bis „Letzter Götze" + Paragon-Epilog, Wächter-Figur, ALLE Zonen+Dungeons,
Fraktionen, Kapitel-Anker-Liste, offene Chef-Fragen).

**Reihenfolge**: Lore-Bibel → Chef-Abnahme → Aschechronik-Spec (Kapitel+Texte EN/DE) →
content/logic/ui-Wellen (evtl. neue Quest-Zieltypen „Dungeon clearen"/„Zone freischalten" →
SAVE-Bump). [[roadmap-sequencing]] [[save-compat-law]]

**KANON v2 (Chef-Direktiven 2026-07-13, ersetzen Teile der v1):**
- ANTAGONIST statt Wächter-Schuld-Twist: ein DEMI-GOTT, der gegen die Götter-Gesetze
  (Nichteinmischung) verstieß und die Götzen erweckte; Enthüllung + story-freigeschalteter
  Endkampf NACH dem Sanktum; er wird NICHT getötet — zurückgeschlagen, kündigt Rückkehr an
  → Übergang zum Post-EA-Groß-Kapitel „die Götterkriege"; Loot = „zurückgelassene Schätze"
  (mechanisch normaler Boss-Sieg, als Rückzug erzählt).
- HEARTHFORGE raus → BASTION: Rückzugs-Lager der Völker (Apokalypse-Feeling, Welt überrannt
  von Dienern des Demi-Gotts); EA = kleines Lager, Stadt-Update macht daraus eine kleine Stadt
  (mehr NPCs/Leben/Story) — die stillgelegte Stadt hat damit ihre Post-EA-Bestimmung.
- HIGH FANTASY: viele Völker (Orks, Semi-Humans wie Halbtiger-Menschen …) — „alles ist möglich".
- GÖTTER HABEN NAMEN, haben sich aber in der Geschichte NIE gezeigt (Glaube ohne Beweis);
  Spiel-Twist: es gibt sie wirklich, auch böse (der Antagonist).
- FIGUREN: Wächter bleibt einziger Sprecher/Erzähler; Brenna = Slayer-Meisterin (entlohnt);
  + stumme Bastion-NPCs. NEUES UI-ELEMENT gebaut: NpcGreeting (Kopf + Sprechblase) auf
  Bank/Shop/Slayer/Quests, Brenna-Porträt als Platzhalter — echte NPC-Porträts liefert der Chef.

**KANON FINAL (Chef-Wahl 2026-07-13, bindend):**
- ANTAGONIST = **Drazhan der Kronlose** (Kriegs-Halbgott, Götzeneisen-Harnisch mit Haut
  verschmolzen, Kette mit sieben zerbrochenen Kronen; Rückzugszeile „…sagt ihnen: Ich habe
  angefangen."). Morvane der Bildner + Ophar der Bleiche Hirte = verworfene Entwürfe, als
  Reserve für die Götterkriege im Anhang der Bibel behalten, NICHT löschen.
- BASTION = **Glutfeste (EN: Emberhold)**; Hearthforge = die GEFALLENE Feste, deren gerettete
  Glut in der Glutfeste weiterbrennt (erklärt den alten Working Title in-world).
- Wächter = ZEUGE (sah den Fremden in der Schlackengrube), NICHT Schuldiger — GO.
- „Der Getilgte" (siebter, aus allen Aufzeichnungen entfernter Gott) = Kanon, Götterkriege-Haken — GO.
- Pantheon: Ambrast, Maera, Nereth, Skorai, Vhel, Kaenor + der Getilgte; Dreifaches Gebot
  (Ferne/Gabe/Bild); Paragonturm = „Exerzierwerk" für die Götterkriege.
- Aschechronik = 21 Kapitel (Kap. 20 „Der wahre Verursacher" = Drazhan-Enthüllung, Kap. 21
  Endkampf + Rückzugs-Cliffhanger).

**IMPLEMENTIERT (CEO-Run 2026-07-13, SAVE 64):** Alle 21 chronicle_-Quests ×7 Sprachen live;
Story-Tab (erster Tab QuestsPage, alter Quest-Tab heißt jetzt „Aufträge"); Progressions-GESETZ
„Gebiet für Gebiet, Dungeon um Dungeon": Zonen UND Dungeons quest-locked (isZoneUnlocked/
isDungeonUnlocked, EIN Choke-Point), **KEINE Dungeon-Keys mehr** (nur paragon_key lebt;
Key-Defs @deprecated, Migration v64 erstattet Bestände in Gold + Unlock), Kap. 18 heißt
„Das letzte Tor" (war „Der Schlüssel im Lager"); Alt-Saves: legacyZoneGrants (v63) +
dungeonsUnlocked-Bestandsschutz. Endboss drazhan sim-balanciert (81–94 % Sieg realistisch).
NOCH OFFEN: Spec/Bibel-Sync an key-freie Kette (design/lore) + stale Content-Kommentare
(Key-Drop-Reste) — kleiner lore-dev/content-Aufräum-Pass.
