# Rassenfähigkeiten — Konzeptplan (CEO-Entwurf, 19.07.2026)

Status: KONZEPT auf Chef-Anfrage („falls wir ihnen eine passive und aktive Rassenfähigkeit
geben"). Nichts davon ist implementiert oder beschlossen. Zahlen sind Richtwerte für die
spätere balance-designer-Passung, keine finalen Werte.

## Design-Leitplanken

1. **Idle-tauglich:** Aktive Fähigkeiten sind Knöpfe mit langem Cooldown (15–60 min
   Echtzeit) — Momente für den Check-in, kein APM-Zwang. Technisch = Einträge im
   bestehenden Buff-System mit Cooldown-Feld.
2. **Identität, nicht Pflicht:** Passive kaufen ~3–5 % Vorteil in der Volks-Nische.
   JEDE Rasse bleibt in jedem Kampfstil und jedem Berufsweg voll spielbar
   (combat-is-fundamental und „kein Hard-Lock" gelten). Ziel-Guard: ±2 % Gesamt-Power-
   Delta zwischen den Rassen in der Sim.
3. **An echte Systeme andocken:** Jede Fähigkeit greift in Mechaniken, die existieren
   (Enrage, Inflicts, Ward, Drop-Rolls, Offline-Cap, Mastery) — nichts erfordert ein
   neues Subsystem außer dem Rassen-Feld selbst.
4. **Lore-treu:** Jede Fähigkeit erzählt das Volks-Profil aus dem Charakter-Codex v2.0.

## Die 8 Völker

### 1. Menschen — „Weltenkinder"
- **Passiv — Anpasser:** +3 % XP auf alle Skills. Die Generalisten des Reachs: nirgends
  Spitze, überall vorn dabei — über 20 Skills der klassische Allrounder-Sog.
- **Aktiv — Zweiter Atem (30 min CD):** 10 min lang +15 % Aktionstempo und +15 %
  Kampfschaden. Der Mensch beißt sich durch, wenn es zählt.

### 2. Orks — „Kriegsblut"
- **Passiv — Narbenstolz:** +4 % Nahkampfschaden; unter 30 % Leben zusätzlich +10 %
  Schaden. Spielt mit der Auto-Eat-Schwelle: Wer tiefer isst, kämpft wütender.
- **Aktiv — Schlachtruf (20 min CD):** 60 s +20 % Angriffstempo, und gegnerischer
  Enrage wird für die Dauer ignoriert. Der direkte Konter auf unsere Enrage-Mechanik.

### 3. Rakhari — „Jägerinstinkt" (Tiger-Menschen)
- **Passiv — Raubtiergrazie:** +3 % kritische Trefferchance, +3 % Ausweichen.
- **Aktiv — Jagdmal (15 min CD):** Markiert den aktuellen Gegner: 45 s +25 % Schaden
  gegen ihn; fällt er während der Markierung, wird der halbe Cooldown erstattet —
  die Jagd kettet sich.

### 4. Goblins — „Freibeuterlist" (die Freien)
- **Passiv — Lange Finger:** +5 % Gold aus allen Quellen, +5 % Thieving-XP.
- **Aktiv — Beutezug (30 min CD):** Die nächsten 10 Kills würfeln ihre Beute doppelt
  (zwei Drop-Rolls, bessere zählt... ODER beide fallen — Balance-Entscheid).
  Loot-Goblin als Spielergefühl, dockt direkt am Drop-System an.

### 5. Duvra — „Steinerbe" (Tiefenvolk)
- **Passiv — Steinhaut:** +4 % Schadensminderung (Mitigation), +5 % Mastery-XP auf
  Mining und Smithing. Das Volk, das der Berg selbst geformt hat.
- **Aktiv — Unverrückbar (20 min CD):** 30 s halber erlittener Schaden und Immunität
  gegen Status-Inflicts (Gift/Frost/Schock/Brand) — der Fels in der Brandung, stark
  gegen die Signatur-Bedrohungen des Turm-Reworks.

### 6. Sesskar — „Gezeitengedächtnis" (Salzvolk)
- **Passiv — Kiemenatem:** +5 % Fishing-Tempo, +10 % Lebens- und Ward-Regeneration.
  Alles fließt; nichts bleibt leer.
- **Aktiv — Gezeitenwende (25 min CD):** 60 s Heilung über Zeit (2 %/s) und doppelte
  Mana-Regeneration. Das Sustain-Fenster für lange Bosskämpfe.

### 7. Aschgänger — „Grenzgänger" (Kärrner der Toten)
- **Passiv — Aschegang:** Offline-Fortschritts-Deckel +1 Stunde (die Asche geht
  freundlich mit ihnen um — DIE idle-native Rassenfähigkeit schlechthin) und −15 %
  erlittener Schaden über Zeit (Brand/Blutung/Gift).
  ⚠ Kühnster Vorschlag des Plans: hebt den bewussten 8h-Cap für ein Volk auf 9h —
  braucht expliziten Chef-Segen.
- **Aktiv — Totenruhe (60 min CD):** Entfernt alle Schwächungen und verhindert für
  10 s den Tod (Leben fällt nicht unter 1). Wer die Grenze kennt, überschreitet sie
  nicht versehentlich.

### 8. Faryn — „Windzeichen" (Klippenvolk)
- **Passiv — Höhenblick:** +8 % Ward-Kapazität, +4 % Runecrafting-Tempo. Das älteste
  Verhältnis zur Essenz-Kunst, gebaut auf der Rüstungs-Trinität (Stoff = Ward).
- **Aktiv — Sturmatem (20 min CD):** Lädt den Ward sofort voll und gibt 45 s +15 %
  Zaubertempo. Der Caster-Panik-Knopf mit Höhenluft.

## Implementierungs-Skizze (wenn GO — NICHT jetzt)

- `state.race` neu → SAVE-Bump + Migration. Bestands-Saves: einmaliger Wahl-Dialog
  beim ersten Laden (besser als Zwangs-Default „Mensch").
- Passive = computeStats-Hook (ein Switch über die Rasse); Aktive = Buff-System-
  Einträge mit Cooldown + ein Knopf im Charakter-/Kampf-UI.
- Charakter-Erstellung: dockt an den geplanten Rassen-Galerie-Creator an (Rasse
  wählen → Galerie → Fähigkeiten-Vorschau auf der Rassen-Karte).
- Pflicht vor Ship: balance-designer-Pass (Zahlen), Sim-Messung (±2 %-Guard),
  Fähigkeiten-Texte ×7.

## Offene Chef-Entscheidungen

1. GO fürs Feature überhaupt (Umfang: ~1 logic-Welle + 1 ui-Welle + Balance-Pass)?
2. Aschgänger-Offline-Stunde: erlaubt oder zu heiß (Alternative: +10 % Offline-XP)?
3. Goblin-Beutezug: „bessere von zwei Rolls" (sanft) oder „beide fallen" (spürbar)?
4. Timing: vor EA-Launch (24.07.) ist es ENG — Empfehlung: als erstes Post-Launch-
   Content-Update („Die Völker des Reachs erwachen") statt Launch-Risiko.
