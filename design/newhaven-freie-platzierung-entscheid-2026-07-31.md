# New Haven — freie Platzierung und Gebäudekapazität

**Status:** bindender Chef-Entscheid vom 31.07.2026  
**Gilt für:** Grim Reach / New Haven  
**Vorrang:** Diese Datei überschreibt für die unten genannten Punkte die älteren Slot-, Polygon-
und Header-Fassungen in `design/newhaven-karte-spec.md`, `design/encampment-konzept.md` und
historischen Implementierungskommentaren. Andere Inhalte dieser Dokumente bleiben unverändert.

<!-- codex:2026-07-31T19:00:03+02:00 -->

## 1. Freie Dorfkarte

- Es gibt keine festen Bauslots, Slot-Markierungen oder vordefinierten Bauzonen.
- Ein Gebäude darf frei auf der gesamten Karte platziert und später kostenlos verschoben werden.
- Der einzige räumliche Ablehnungsgrund ist: Die vollständige Gebäudebühne würde den Kartenrand
  überschreiten.
- **Chef-Nachentscheid 31.07.2026:** Gebäude besitzen gegeneinander keine Hitbox mehr und dürfen
  sich beliebig überlappen. Save-Sanitize erhält solche gültigen Überlappungen unverändert.
- Positionen bleiben Bestandteil von `camp.positions` und damit stabil im Save. Dieser Entscheid
  benötigt kein neues State-Feld und keinen Save-Version-Bump.

## 2. Zentralhaus und Kapazität

- Der bisher technisch `buildSlots` genannte Wert ist eine reine **Gebäudekapazität**, keine
  räumliche Slotmenge.
- Zentralhaus I/II/III gewährt additiv **+4 / +5 / +5** Kapazität.
- Daraus folgen insgesamt **4 / 9 / 14** gleichzeitig gebaute Nicht-Zentralhaus-Gebäude.
- Das Zentralhaus selbst zählt nicht gegen die Kapazität. Ein laufender Neubau reserviert sofort
  eine Kapazitätseinheit; ein Ausbau einer bestehenden Stufe nicht.
- Spielertexte sprechen ausschließlich von Gebäudekapazität, nicht von Bauplätzen oder Slots.

## 3. UI und Kosten

- Der bisherige große Intro-/Town-Hall-/Slots-/Crew-Block oberhalb der Karte entfällt vollständig.
- Karte und rechter Bau-/Listenbereich nutzen die maximal verfügbare Seitenhöhe. Die Seite selbst
  scrollt nicht; lange Listen scrollen ausschließlich intern. Die Karte scrollt nie.
- Das Karten-Baumenü zeigt dieselben vollständigen Gold- und Materialkosten, Besitzwerte und
  Verfügbarkeitsregeln wie die Listenansicht. Es gibt keine UI-eigenen Fake-Kosten.
- New-Haven-Listenkarten folgen optisch der bestehenden Action-Card-Materialhierarchie, bleiben aber
  technisch und stilistisch auf New Haven begrenzt.

## 4. Debugmodus

- Direkt neben „Liste" existiert ein klar gekennzeichneter Debug-Knopf.
- Aktiv erlässt er ausschließlich Gold- und Materialkosten von Neubauten und Ausbauten.
- Bautrupp-, Zentralhaus-, Kapazitäts-, Kartenrand- und Kollisionsregeln bleiben aktiv.
- Der Modus ist lokaler React-UI-State, wird nicht persistiert und verändert weder Save-Balance noch
  dauerhaft Ressourcen, Engine-Konstanten oder Contentkosten.

## 5. Responsive Gebäudebühne und Sofortabschluss

<!-- codex:2026-07-31T20:21:01+02:00 -->

- Kartenpositionen werden ausschließlich als normalisierte Prozentkoordinaten in `camp.positions`
  gespeichert. Pixelkoordinaten sind weder Save- noch Engine-Wahrheit.
- Die gemeinsame Kollisionsbühne entspricht der vom Chef freigegebenen Rathausgröße und bleibt auf
  der festen 16:9-Karte in realen Pixeln quadratisch. Alle Sprites verwenden `contain`; ihre
  Seitenverhältnisse bleiben unangetastet und das vollständige Gebäude bleibt sichtbar.
- Das Rathaus ist die visuelle Referenz mit Faktor 1. Kleinere Gebäudefamilien und frühe Stufen
  erhalten kuratierte Faktoren innerhalb derselben Bühne; insbesondere Fischerhütte I ist deutlich
  kleiner als das Rathaus. Die konservative Kollisionsbühne verhindert trotzdem Überschneidungen.
- Neben dem Kosten-Debugmodus existiert ein separater, nicht persistierter Sofortabschluss. Er setzt
  ausschließlich den laufenden Bauauftrag über den regulären Engine-Abschlussweg fertig und ist ohne
  laufenden Auftrag deaktiviert.
