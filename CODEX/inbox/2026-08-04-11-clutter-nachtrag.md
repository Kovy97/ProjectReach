# Nachtrag zu Runde 1: Ground-Clutter für die drei Pilot-Zonen
**Von:** Claude · **Datum:** 2026-08-04 · **Priorität:** hoch (Chef-Feedback aus der Runde-1-Abnahme)

Mira — Runde 1 ist beim Chef gut angekommen („ganz gut", alle drei Zonen-Urteile GO). Sein Feedback bringt eine NEUE Asset-Klasse in den Vertrag: **Ground-Clutter**. Chef-Zitat: „Die Ground-Clutter-Effekte sind noch nicht so geil. Wir wollen nur so Grasbüschel, Steine und Büsche. Einfach dass der Boden nicht so leer aussieht."

## Auftrag: je Pilot-Zone 4-6 KLEINE Streu-Freisteller
- **Format:** transparente WebP (echtes Alpha), Quelle ~150-400px, bewusst KLEIN und unauffällig — das ist Boden-Würze, keine Set-Pieces wie deine Runde-1-Props (die bleiben unverändert gut).
- **Benennung:** `arena_<zoneId>_clutter_<nn>.webp`
- **Motive:**
  - `pastures`: 2× Grasbüschel (Varianten), Feldsteine, kleiner Busch, ggf. Blümchen-Tuff
  - `crypt`: Steinschutt, Knochensplitter, umgefallener Kerzenstumpf, Bodenriss-Platte
  - `slagpit`: Schlacke-Brocken, Glut-Nest (dezent glimmend ok), Aschehäufchen, verbogenes Metallstück
- **Stil:** flach-bodennah gedacht (werden leicht geneigt auf die Fläche gestreut), Fußkante sauber, gedeckte Palette der jeweiligen Zone; bei 30-60px Darstellungsgröße noch als Form lesbar.
- **Technik meinerseits:** Ich baue ein deterministisch geseedetes Streu-System (Dichte-Regler, Ausschluss-Zone um die Kampf-Mitte, ein Draw-Call) — deine Manifeste bekommen dafür eine neue `clutter`-Sektion; Formatbeispiel liefere ich mit dem System, für die Lieferung reichen erstmal die Bilddateien + je Zone ein 1-Satz-Vorschlag zur Dichte (spärlich/mittel/dicht).
- **Ab Runde 2 ist Clutter fester Vertragsbestandteil** jeder Zone (Spec wird ergänzt) — die 8 restlichen Zonen starten NACH diesem Nachtrag und dem finalen Chef-GO.

## Staging & Rückgabe
Wie gewohnt: `CODEX/AssetControl/arena-zones-0.4.0/round-01-clutter/` mit kurzer Vorschau-Tafel (Streu-Beispiel auf dem jeweiligen Boden wäre ideal) + QA (Alpha/Maße) + HANDOFF-Notiz; danach diese Datei nach `inbox/done/`.
