# Arena-Welle 3 — Plan „Kämpfen verbessern" (Chef-Feedback 04.08. nach Runde-1-Abnahme)

*Chef-Vorgaben: (1) Idle-Breathing raus ✅ SOFORT ERLEDIGT (Lauern/kleine Schritte bleiben),
(2) Kampflogik in der Arena EXAKT wie in der normalen Ansicht — Arena ist reine Visualisierung,
(3) Ground-Clutter: Grasbüschel, Steine, Büsche — der Boden soll nicht leer aussehen.*

## 1. Paritäts-GESETZ: Arena beeinflusst den Kampf um exakt null
**Architektur-Stand:** Die Engine kennt die Arena nicht — sie liest nur CombatEvents/State
(dieselbe Quelle wie die 2D-Ansicht). Damit das GESETZ bleibt und beweisbar ist:
1. **Paritäts-Guard-Test (neu):** identischer Seed-Kampf einmal mit gemounteter 2D-Ansicht,
   einmal mit Arena → Engine-Log/HP-Timeline/RNG-Endstand BYTE-GLEICH (beweist: die Arena
   speist nichts zurück, verändert kein Timing, zieht keinen RNG).
2. **Ereignis-Exaktheit sichtbar:** Schaden/HP/Impact-FX feuern im Event-Tick (in Welle 2b
   bereits asserted); die Windup-VORHERSAGE darf nur die Bewegung davor formen — trifft das
   Event früher (Tempo-Buff), wird die Animation gekürzt, nie das Event verschoben.
3. **Doku-Invariante** im arena25d-README: „Kein Code-Pfad der Arena schreibt in GameState/
   Engine/RNG. Verstöße sind Release-Blocker."

## 2. Ground-Clutter-System (der Boden lebt, ohne voll zu wirken)
**Neue Manifest-Sektion** je Zone:
`clutter: { seed, density, exclusionRadius, items: [{ file, weight, minScale, maxScale }] }`
- **Deterministisch geseedete Streuung** auf der großen Bodenfläche (gleicher Seed = gleiches
  Bild, kein Flimmern zwischen Besuchen), Dichte als ein Regler.
- **Ausschluss-Zone:** Kampf-Mitte + Duell-Achse bleiben frei (Lesbarkeit), Streuung verdichtet
  sich zu den Rändern und an der Kulissen-Naht.
- **Perf:** eine gemergte/instanzierte Geometrie für alle Clutter-Quads (ein Draw-Call), flach
  auf dem Boden bzw. minimal aufgestellt, KEINE Schatten je Clutter, unter den Kämpfern sortiert.
- **Platzhalter** (bis Mira liefert): 2-3 prozedurale Gras-/Stein-Silhouetten, DEV-markiert.
**Mira-Zulieferung** (Auftrag 11, Nachtrag zu Runde 1): je Pilot-Zone 4-6 KLEINE Freisteller
(~150-400px, echtes Alpha): pastures Grasbüschel/Feldsteine/kleiner Busch · crypt Knochensplitter/
Steinschutt/Kerzenstumpf · slagpit Schlacke-Brocken/Glut-Nester/Aschehaufen. Ab Runde 2 ist
Clutter fester Bestandteil des Zonen-Vertrags (battle-040-arena-produktion.md §2 wird ergänzt).

## 3. Rest-Verifikation & Feinschliff (aus Welle 2b offen)
- Dodge-Sidestep + Schock-Stagger live auslösen und verifizieren (gezieltes Fixture/Monster).
- Boss-Gewichtsklasse (hpMax≥800) live testen — trägerer Anlauf muss sich „schwer" anfühlen.
- Dungeon-Mehrwellen: echter Bild-Wechsel zwischen verschiedenen Monstern (neuer Code-Pfad!).
- **Krypta-Helligkeit:** Chef-Monitor-Urteil offen — bei „zu dunkel" hebt Mira nur Manifest-Werte.
- Optional (Chef-Geschmack): hauchdünnes Rim-Light auf Kämpfern für Lesbarkeit in dunklen Zonen.

## 4. Reihenfolge
1. ✅ Breathing raus (erledigt 04.08.).
2. Welle 3a (Claude): Clutter-System + Platzhalter, Paritäts-Guard-Test, Rest-Verifikation — EIN Agent.
3. Parallel Mira: Clutter-Nachtrag für die 3 Pilot-Zonen (Auftrag 11).
4. Nach Chef-Blick auf Clutter+Parität: **Runde-2-GO an Mira** (8 Zonen, Vertrag inkl. Clutter).
