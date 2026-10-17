<!-- codex:2026-08-26T20:44:00+02:00 -->
# Human Character Roster — 30 Archetypen / 60 Assets

## A. Chefentscheid

- Rasse: Human
- Grundwirkung: erwachsene, generell sehr attraktive und glaubwürdige Menschen
- Umfang: 15 Kampfklassen plus 15 Berufe
- je Archetyp eine männliche und eine weibliche Figur
- insgesamt 60 eigenständige Personen, keine Gender-Swaps und keine wiederverwendeten Gesichter
- Stil: Grim Reach, Ashen Iron, vollständige Ganzfigur für Character Creation

## B. Produktionsvertrag

- ID: `human_<archetyp>_m` beziehungsweise `human_<archetyp>_f`
- Staging-Final: exakt nach ID benannt, PNG RGBA, 1086 × 1448 px
- Ganzfigur vollständig sichtbar, inklusive Kopf, Hände, Werkzeug/Waffe und Stiefel
- neutrale Dreiviertel-Auswahlpose; Körper, Gesicht und Blick eindeutig nach Bildschirm-rechts
- beide Geschlechtsvarianten eines Archetyps tragen denselben sichtbaren Waffen- beziehungsweise Werkzeug-Loadout
- Rüstung und Kleidung dürfen zwischen den Geschlechtern konstruktiv variieren; weibliche Varianten dürfen moderat offener sein, bleiben aber funktional und nicht übersexualisiert
- Figur nutzt 84–92 % der Canvas-Höhe; sichere Außenluft für Grid und große Held-Pane
- echtes natives Alpha aus der Erzeugung; kein Keying, kein gemaltes Schachbrett
- kein Boden, keine Bühne, kein Rahmen, keine Beschriftung, keine Aura
- vorhandene `knight_*`, `archer_*` und `mage_*` definieren Malgrad, Perspektive, Licht und Material
- neue Figuren dürfen nicht als Kopien dieser Bestandsidentitäten erscheinen

## C. Einzigartigkeitsvertrag

Jede ID besitzt vor Generierung eine feste Kombination aus Alter, Gesichtsform, Hautton,
Körperbau, Haar, Merkmal und Haltung. Klassenpaare teilen nur Funktionssilhouette, Materialfamilie
und Farbcode. Mann und Frau einer Klasse sind zwei unterschiedliche Personen.

Serienweite Kontrolle:

1. keine wiederholte Kombination aus Gesicht, Haar und Körperbau
2. keine zwei direkt benachbarten Figuren mit gleicher Primärsilhouette
3. mindestens sechs klar unterscheidbare Hautwertgruppen im Gesamtroster
4. Altersschwerpunkt 24–48, attraktiv nicht gleichbedeutend mit jugendlich oder makellos
5. berufliche Figuren bleiben glaubwürdig arbeitend, nicht heimlich zu Kampfklassen umgestaltet
6. Paarabgleich: gleiche Waffen-/Werkzeugfamilie, gleiche Anzahl sichtbarer Hauptgeräte und gleiche Funktionssilhouette
7. Rechtsabgleich: Nase, Brustachse und Blick lesen im Auswahlraster eindeutig nach rechts

## D. Ablauf

<!-- codex:2026-08-26T23:03:00+02:00 -->
1. Vollständige 60-ID-/Identitätsmatrix gesperrt — erledigt.
2. Pilot Warrior, Fire Mage und Rogue, jeweils männlich/weiblich — erledigt und abgenommen.
3. Alpha, UI-Größe, Klassenlesbarkeit und Gesichtsabstand — erledigt.
4. Verbleibende 54 Figuren gruppenweise erzeugt — erledigt.
5. Finale Gegenprüfung: 60/60 RGBA, 1086 × 1448, transparenter Außenrand,
   84,12–87,98 % Motivhöhe, 30/30 Paar-Loadouts und 60/60 Rechtsorientierung — bestanden.
6. WebP-Konvertierung und Renderer-Integration bleiben ausdrücklich bei Claude.
