# New Haven — Dorfkarte (Spezifikation, Ziel 0.4)

*Chef-Plan 28.07.2026. Arbeitsteilung ausdrücklich: **Chef macht alle Assets, Claude macht die
Logik.** Voraussetzung: 0.3.0 (Karten-Grid) ist ausgeliefert.*

## 1. Vorbild und Technik-Basis

Vorbild ist die Dorfansicht von **„Die Stämme"**: eine gezeichnete 2D-Lagerfläche, auf der die
Gebäude an festen Plätzen stehen und sichtbar wachsen.

**Technik-Basis ist Chefs eigenes System aus YuGiOh-Journey**, das hier bereits einmal
integriert wurde (die alte Pastures-Map): 2D-Karte mit frei positionierbaren „Action Points".
Damals waren die Punkte Tiere, jetzt werden es **einrastbare Bauslots**. Der bestehende
Hotspot-/Map-Editor-Ansatz wird also nicht neu erfunden, sondern übernommen.
Siehe Gedächtnis-Notiz `ygojourney-map-editor-reference`.

## 2. Kernmechanik

1. **FREIE PLATZIERUNG (Chef-Entscheid 28.07., ersetzt die frühere Slot-Idee).** Es gibt keine
   vorgezeichneten Bauplätze. Der Spieler setzt jedes Gebäude frei auf der Lichtung ab, wo es
   ihm gefällt. Konsequenzen für die Logik:
   - **Bebaubare Fläche** wird im Code als Maske/Polygon über der Karte definiert (Verfahren
     wie Chefs YGO-Journey-Hotspot-Editor) — Wasser, Fels, Wald und Ränder sind gesperrt.
   - **Kollision:** Zwei Gebäude dürfen sich nicht überlappen (rechteckige/rhombische Grundfläche
     je Gebäude, einfacher Abstands-Test).
   - **Die `buildSlots`-Ökonomie bleibt, wird aber zur reinen ZAHL:** Das Zentralhaus gibt
     +6/+4/+4 = maximal 14 gleichzeitig platzierte Gebäude. Wo sie stehen, ist frei; wie viele,
     ist die Progression. Die bestehende Engine-Logik trägt damit unverändert weiter.
   - **Speicherung:** `buildingId → {x, y}` statt `slotId`.
2. **Bau-Menü.** Der Spieler öffnet ein Menü mit den verfügbaren Gebäuden, wählt eines aus und
   **platziert es frei auf einem der freien Slots**. Von dort aus startet der Bau.
3. **Mehr Gebäude als Slots** (15 Gebäude, 14 Plätze — bewusst knapp): Der Spieler muss wählen
   und darf sich später umentscheiden.
4. **Bauzustand sichtbar.** Während gebaut wird, steht auf dem Slot eine **Baustelle**; beim
   Aufwerten eines bestehenden Gebäudes ein **eingerüsteter Bauzustand**.
5. **Klick auf ein fertiges Gebäude** öffnet die Gebäude-Ansicht: aktiver Effekt, ggf. die dort
   möglichen Aktionen (z.B. Veredelungs-Rezeptwahl bei Schmelzofen/Räucherhaus), plus die
   Knöpfe **Ausbauen** und **Abreißen**.
6. **Abreißen** gibt **50 % der Ressourcen zurück, abgerundet**.
7. **Tag/Nacht-Zyklus** leuchtet die gesamte Karte um (deshalb entstehen alle Gebäude-Assets
   von Anfang an in Tag- und Nachtfassung).

## 3. Asset-Bedarf (Chef)

| Asset | Fassungen | Anmerkung |
|---|---|---|
| 15 Gebäude × 3 Stufen | Tag + Nacht (= 90) | läuft bereits, isometrisch, Magenta-Key |
| Karten-Untergrund | Tag + Nacht | Lagerfläche mit erkennbaren Slot-Positionen |
| Leerer Bauslot | Tag + Nacht | Pflock/Aushub/Fundament-Markierung |
| `baustelle_tag` / `baustelle_nacht` | 2 | Neubau im Gang (gebäudeunabhängig) |
| `upgrade_tag` / `upgrade_nacht` | 2 | Aufwertung im Gang (eingerüstet, gebäudeunabhängig) |

*Offen: ob Baustelle/Upgrade wirklich gebäudeunabhängig sind (1 Satz für alle) oder je Gebäude.
Empfehlung: **gebäudeunabhängig** — 4 Assets statt 60, und ein Gerüst sieht überall gleich aus.*

## 4. Logik-Umfang (Claude)

**Neuer Save-State (SAVE-Bump):**
- Zuordnung Slot → Gebäude (`slotId → buildingId`), plus welche Slots freigeschaltet sind.
- Migration: Wer aus 0.3.0 kommt, hat Gebäude **ohne** Slot-Zuordnung → automatische Verteilung
  auf die ersten freien Slots in Katalog-Reihenfolge (deterministisch, kein Spielerverlust).

**Engine-Verben (neu):**
- `placeCampBuilding(state, content, buildingId, slotId)` — Platzierung + Baustart in einem
  Schritt; Gates: Slot frei/freigeschaltet, Gebäude noch nicht gebaut, EIN Bautrupp, Kosten.
- `demolishCampBuilding(state, content, slotId)` — entfernt das Gebäude, gibt **50 % abgerundet**
  zurück, Slot wird frei.
- `moveCampBuilding(state, content, buildingId, x, y)` — **Chef-Entscheid 28.07.: Gebäude sind
  per Drag & Drop frei verschiebbar.** Kostenlos, keine Bauzeit, jederzeit möglich — reine
  Anordnung, keine Progression. Gates: Zielposition liegt auf bebaubarer Fläche und überlappt
  kein anderes Gebäude. Das gerade im Bau befindliche Gebäude ist nicht ziehbar (der Bautrupp
  zieht nicht mit um).
  **UI-Basis:** das in 0.2.2 grundsanierte Bank-Drag-&-Drop ist das Vorbild (Geist-Bild,
  Drop-Zonen, Esc-Abbruch, Window-Listener statt Element-Capture) — nicht neu erfinden.
  Beim Ziehen zeigt die Karte die bebaubare Fläche und markiert ungültige Positionen (Wasser,
  Fels, Überlappung) sofort sichtbar.

**Erstattungs-Regeln (konsistent halten):**
| Fall | Erstattung | Status |
|---|---|---|
| Laufenden Bau abbrechen | 100 % (Bauzeit verfällt) | existiert bereits (0.3.0) |
| Fertiges Gebäude abreißen | **50 %, abgerundet** | neu |

Beim Abreißen wird über **alle bereits gebauten Stufen** summiert und dann halbiert (wer Stufe III
abreißt, bekommt 50 % von Stufe I + II + III) — sonst wäre Abreißen auf hoher Stufe eine Falle.
Bauteile (`timber_*`) zählen dabei wie jedes andere Material mit.

**UI:**
- Karten-Ansicht ersetzt das Karten-Grid als Standard (Grid bleibt evtl. als Listen-Alternative).
- Bau-Menü (Gebäudeauswahl) + Platzierungs-Modus mit Slot-Highlighting.
- Gebäude-Popup: Effekt, Aktionen, Ausbauen, Abreißen (mit Bestätigung + Erstattungs-Vorschau).
- Tag/Nacht-Umschaltung der gesamten Karte inkl. aller Gebäude-Assets.

## 5. Verhältnis zu 0.3.0

Das Karten-Grid aus 0.3.0 bleibt funktional gültig und wird nicht weggeworfen: Die Karte ist eine
neue **Ansicht** auf denselben Zustand. Alle Engine-Verben (`startCampBuild`, `campBoost`,
`refine`, Toast, Offline-Report) tragen unverändert weiter.

## 6. Offene Entscheidungen (Chef)

1. ~~Umsetzen statt Abreißen?~~ **ENTSCHIEDEN (Chef 28.07.): Drag & Drop zum Tauschen,
   kostenlos.** Details in §4 (`swapCampBuildings`). Abreißen bleibt für den Fall, dass man ein
   Gebäude ganz aufgeben will (→ 50 % zurück).
2. **Slot-Typen — Chef-Vorgabe 28.07.: Das Gelände muss zu den Gebäuden passen.** Die Karte
   bekommt sechs Geländezonen (Mitte, Bach, Felswand, Anhöhe, Waldrand, Eingang + stille Ecke),
   sodass jedes Gebäude mindestens einen thematisch stimmigen Platz hat — Fischerhütte am Steg,
   Stollenmund an der Felswand, Wachturm auf der Anhöhe, Schrein unter den alten Bäumen.
   Zuordnungstabelle in `newGPTAssets/camp-karte-und-bauzustaende-prompts.txt`.

   **Offen bleibt, wie HART das gilt** — meine Empfehlung ist die weiche Variante:
   - *Weich (empfohlen):* Jeder Slot trägt eine Gelände-Marke, jedes Gebäude eine
     Wunsch-Marke. Passt es, zeigt die UI den Platz als „passend" (Hervorhebung beim
     Platzieren, evtl. kleiner Flavor-Text). Bauen darf man trotzdem überall — Drag & Drop
     zum Tauschen bleibt uneingeschränkt möglich.
   - *Hart:* Fischerhütte NUR am Wasser, Stollenmund NUR am Fels usw. Thematisch strenger,
     kostet aber Freiheit und macht das Tauschen kompliziert (halbe Karte wird untauschbar).
   - *Zwischenweg:* Nur die zwei offensichtlichen Fälle hart (Fischerhütte braucht Wasser,
     Stollenmund braucht Fels), alles andere weich.
   Zentralhaus steht in jedem Fall fest in der Mitte (Feuerstellen-Platz) und ist nicht ziehbar.
3. **Tag/Nacht-Quelle:** Echtzeit-Uhr des Spielers (schön, aber nicht deterministisch) oder
   Spielzeit? *Empfehlung: Echtzeit, rein kosmetisch* — die Engine darf davon nichts wissen,
   damit offline==online bit-identisch bleibt.
4. **Baustelle/Upgrade-Assets gebäudeunabhängig?** (siehe §3)
