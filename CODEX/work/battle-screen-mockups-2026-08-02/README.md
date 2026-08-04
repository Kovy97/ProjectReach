<!-- codex:2026-08-02T11:58:30+02:00 -->
# Battle Screen — zehn funktionelle Layoutstudien

`index.html` ist eine isolierte, interaktive HTML-Studie. Sie verändert keine Produktionsdateien,
keine Engine, keine Saves und keine Übersetzungen. Die Daten sind plausible Mockupwerte; die
Funktionsmenge stammt aus dem echten `CombatPage.tsx`.

## Gemeinsamer Funktionsvertrag

- Spieler und Gegner mit HP, Ward, Stagger und Status
- Attack-Timeline, aktuelles Trefferfeedback und Combat Controls
- vier Frontline-Tabs: Gear, Skills, Style und Prep
- Combat Stats, Bufftimer, Auto-Eat, Auto-Potion und Auto-Buff
- Target Dossier, Zone/Monsterkontext, Session, bekannte Drops und Battle Log
- Umschalter für 1920 × 1080 und 3440 × 1440 sowie drei Kampfmomente

## Konzepte

1. **Duel Ledger** — sehr verständlich; das Log bleibt kompakt unter der rechten Zielakte.
2. **Split Chronicle** — beste Log-Lesbarkeit; kostet vertikale Kampfhöhe.
3. **Frontline Record** — Log im linken Dock; starke Arena und nah an Frontline Ribbon 03.
4. **Hunter Stage** — beste Gegneranalyse; linke Spalte kann auf 1080p dicht werden.
5. **Assault Ribbon** — größte obere Bühne; Prep zeigt bewusst nur den aktiven Kern.
6. **Bastion Mirror** — starke Duellinszenierung; mittlere Leere muss im echten Kampf belebt sein.
7. **Killroom Compact** — maximal kompakt; für neue Spieler weniger selbsterklärend.
8. **Ultrawide Command** — sehr gut auf 3440 × 1440, auf 16:9 stärker verdichtet.
9. **Warden's Afteraction** — Session/Drops sehr stabil, Battle Log breit und ruhig.
10. **Adaptive Fortress** — robustester gemeinsamer Vertrag für 16:9 und Ultrawide.

## Chef-Entscheid und Produktionsrichtung

<!-- codex:2026-08-02T12:38:33+02:00 -->

Der Chef hat **10 Adaptive Fortress** gewählt. Für die produktive Umsetzung gilt folgende präzisierte
Hybridfassung:

- Das Frontline-Dock bleibt links mit **Gear, Skills, Style und Prep** und erhält die volle Höhe.
- Die proportionale Kampfbühne von Adaptive Fortress bleibt in der Mitte.
- Die rechte **Target-Dossier**-Spalte wird durch den echten **Battle Record / Loot Log** ersetzt.
  Damit entfällt das doppelte Log im unteren linken Rasterbereich; dieser Raum geht zurück an das
  Frontline-Dock beziehungsweise die Arena.
- Die erfundenen Buttons **Pause** und **Speed ×1** entfallen. Produktiv bleiben nur tatsächlich
  vorhandene Aktionen wie Flucht sowie die konfigurierbaren Prep-Automatiken.
- Der bisherige Equipment-Tab im alten Battle-Log ist nach Einführung des Gear-Tabs redundant. Für
  die rechte Spalte ist stattdessen **Combat / Loot** sinnvoll; Loot kann aus der bereits vorhandenen
  `loot`-/`gold`-Ereigniskategorie gefiltert werden.

## Unabhängiger Funktionsaudit

<!-- codex:2026-08-02T12:38:33+02:00 -->

Der gemeinsame Mockup-DOM wurde gegen `CombatPage.tsx`, `combat.css`, die Combat-Rollenbeschreibung
und die aktuellen Combat-Spezifikationen geprüft. Die zehn Konzepte unterscheiden sich nur durch
CSS-Raster; dieselben funktionellen Lücken gelten daher grundsätzlich für alle Varianten.

### Reale Zustände, die bei der Umsetzung erhalten bleiben müssen

- Spieler: HP, bedingtes Mana, bedingter Ward, Attack-Timer, Buffs, Debuffs, Trefferchance,
  Ausrüstung, Begleiter und Treffer-/Heil-/Statusfeedback.
- Gegner: HP, bedingter Ward, Attack-Timer, Debuffs, Enrage, Regeneration, Defense-Type,
  Trefferchance, bekannte/unbekannte Drops und Killzahl.
- Encounter: normale Zone, Elite, Dungeon-Wellen samt Boss-Intro/Truhe und Paragon-Etage.
- Nach einem Kill: Engine-Cooldown, Gegner-Blur und `LastKillSummary`; kein spielbarer Pause- oder
  Geschwindigkeitszustand.
- Battle Record: acht echte Filterkategorien, bis zu 40 Events und ein verstellbares Panel.
- Session: Gold, Gesamt-XP, Kills und seltene Beute sind bereits als Renderer-Snapshot vorhanden.

### Mockupannahmen, die nicht produktiv übernommen werden dürfen

- **Stagger** besitzt keinen Combat-State und ist derzeit reine Mockup-Fiktion. Die Leiste muss
  entfallen oder durch den echten Attack-Timer ersetzt werden.
- **Pause** und **Speed ×1** existieren nicht als Kampfsteuerung. `queuePaused` bezeichnet nur die
  Action Queue nach Tod/Patt und ist kein Battle-Pause-Button.
- Mana fehlt im Mockup, obwohl Magie und mana-tragende Ausrüstung eine dynamische Mana-Leiste
  benötigen. HP/Ward/Mana dürfen nur erscheinen, wenn der jeweilige reale Wert existiert.
- Die Umschaltung „3440 × 1440“ verändert im Prototyp nur die maximale Breite, nicht die Höhe des
  Viewports. Sie ist deshalb kein vollständiger 1440p-Nachweis.
- Combat-/Loot-Tabs, Retreat, Monster List und Zone Map sind in der Studie visuell, aber nicht
  verdrahtet. Nur Konzept-, Größen-, Moment-, Dock- und Style-Schalter besitzen Demo-Logik.
- Das feste Ziel „Bramble Witch“ deckt Elitebilder, Dungeon-Wellen, Boss-Intro, Paragon und Gegner
  ohne Ward/Status nicht ab. Diese Zustände brauchen in der Produktion eigene Layout-Gates.

### Ranking nach Produktionsnähe

1. **10 Adaptive Fortress** — bestes skalierendes Grundraster; nach Chef-Korrektur mit vollem
   Frontline-Dock links, Arena mittig und Battle Record/Loot rechts die belastbarste Lösung.
2. **03 Frontline Record** — klare Informationshierarchie und dem freigegebenen Dock sehr nah;
   das nur 330 px breite linke Live-Log wäre für lange lokalisierte Zeilen jedoch zu schmal.
3. **08 Ultrawide Command** — stärkste Arenawirkung auf 3440 px, aber die zwei festen 320-/300-px-
   Informationsspalten skalieren auf Ultrawide kaum mit und der Frontline-Dock sitzt konzeptionell
   an der falschen Stelle.

Am schwächsten ist **05 Assault Ribbon**: zwölf Ausrüstungsslots in einer 360-px-Zeile werden zu
klein, weitere Gear-Informationen sind absichtlich ausgeblendet und die 210-px-Dockhöhe trägt weder
Gear noch Prep. **07 Killroom Compact** ist bei 260-/230-px-Seitenspalten und 145-px-Log ebenfalls
nicht belastbar für sieben Sprachen.

### Präzise Hybridlösung für Konzept 10

Produktionsraster ab 1401 px: `Frontline minmax(330px, 22%) | Arena minmax(0, 1fr) | Record
minmax(320px, 20%)`. Das rechte Record-Panel bekommt `Combat / Loot`, Logfilter und interne
Scrollfläche; eine kompakte Session-Zeile sitzt in seinem festen Fuß. Die Arena zeigt ausschließlich
reale Ressourcen und behält Dungeon-/Paragon-Overlays. Unter 1401 px wird nicht alles in schmale
Spalten gequetscht: Frontline, Arena und Record stapeln kontrolliert wie im bestehenden
`combat.css`, jeweils mit interner Scrollfläche und definierter Höhe.

Die Studie verwendet ausschließlich vorhandene lokale Rahmen, Texturen, Charakter-, Gegner-,
Item- und Battle-Screen-Assets. Es werden keine neuen Animationen oder nicht vorhandenen
Fantasygrafiken vorausgesetzt.

Die strukturelle Headless-QA ist vollständig. Eine zusätzliche visuelle Browserprüfung war in
dieser Sitzung nicht möglich, weil die verbundene Laufzeit keine Browserinstanz bereitstellte.
