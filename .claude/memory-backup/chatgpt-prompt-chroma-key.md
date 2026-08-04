---
name: chatgpt-prompt-chroma-key
description: ChatGPT-Asset-Prompts — Hintergrund-Wahl: Kreaturen mit Halbtransparenz = ECHTES Alpha verlangen, solide Items = Magenta-Chroma-Key; nie Fake-Schachbrett
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-23T11:08:03.416Z
---

**ENDSTAND (Chef, 2026-07-23, nach Praxis-Test):** Bewährtester Weg = **Motive vollständig OPAK designen + Magenta-Key**: In die Beschreibung explizit „KOMPLETT DECKEND — keine Schleier/Rauch/Nebel/Auren/weiche Kanten; Glühen nur als feste, klar umrissene Flächen" (Geister → blickdichter Kapuzenmantel, Flammenwesen → feste Lava-Adern). Dann kann Chroma-Key prinzipbedingt keine pinken Säume erzeugen. Vorlage: `newGPTAssets\elite-nachschlag-chroma.txt`. GPTs „echte Transparenz" bleibt zweite Option (funktionierte + Intake-Nachputz vorhanden), war dem Chef aber zu unzuverlässig. Historie der Zwischen-Revision: ALLE Freisteller-Assets (Kreaturen UND Items) verlangen **ECHTE Transparenz** — Klausel: „PNG mit echtem Alpha-Kanal, Hintergrund wirklich leer, KEIN aufgemaltes grau-weißes Schachbrett-/Karomuster, KEINE Hintergrundfarbe, KEIN Magenta. Halbtransparente Partien (Schleier/Rauch/Glut bzw. dünner Stoff/ausgefranste Kanten) bekommen echte weiche Teiltransparenz im Alpha-Kanal." Magenta-Chroma-Key ist ABGELÖST (Chef: „enorme Probleme — zu viele transparente Elemente, wo die Keyfarbe durchscheint", auch bei Items).

**Why:** Die alte Regel „GPT kann keine echte Transparenz" (2026-07-17) ist überholt — GPT liefert echtes Alpha, nur gelegentlich stattdessen ein aufgemaltes Schachbrett (deshalb die explizite Verbots-Klausel). Chroma-Key kann nur hart ausstanzen; jede Halbtransparenz (Geisterschleier, Rauch, Glut-Schimmer, Stoffkanten) behält sonst Magenta-Säume.

**Lieferweg (Chef, 23.07.):** Transparente PNGs IMMER explizit als ZIP-Download anfordern („Packe die fertigen transparenten PNGs in EINE ZIP-Datei … NICHT nur als Bildvorschau im Chat") — die Inline-Vorschau kann den Alpha-Kanal plätten, das ZIP erhält die Original-PNGs; so liefen historisch die 1000+ Assets am zuverlässigsten.

**Absicherung:** `elite-intake.py` (Downloads\ASSETS) hat seit 23.07. die Auto-Weiche: echtes Alpha → 1:1 übernehmen; kein Alpha + Schachbrett-Ring am Rand erkannt → abweisen mit Warnung (neu generieren); einfarbiger BG → Chroma-Key als Legacy-Fallback (bleibt für Alt-Bestände funktionsfähig). Hinweis für den Chef: Karomuster in der ChatGPT-VORSCHAU kann auch echte Transparenz sein — trotzdem abliefern, die Pipeline unterscheidet zuverlässig.

**How to apply:** Beim Erzeugen/Erneuern jeder Prompt-Liste (10er-Batches, Anti-Collage-Vorspann bleibt) die Chroma-Key-Klausel statt der alten Transparenz-Zeile einsetzen. Hintergrundfarbe je Batch/Motiv so wählen, dass sie in keinem Motiv vorkommt. Ausnahme wie gehabt: Kulissen/Szenen (z. B. Dungeon-Hintergründe) bleiben Vollbild ohne Freisteller. Prompts außerdem so detailliert schreiben, dass KEINE Referenz-Icons angehängt werden müssen. Siehe auch [[archive-integrated-assets]], [[asset-bind-all-references]], [[skill-99-ring-statt-cape]].

**VERBINDLICHES FORMAT (Chef-Rüge 2026-07-22, elite-champions.txt v1 hatte Einzel-Prompts statt Batches):**
1. **Immer 10er-Batches**: Die Datei besteht aus Batch-Blöcken à max. 10 Motiven. JEDER Batch ist EIN
   in sich vollständiger Copy-Paste-Block: alle Regeln (Stil, Hintergrund-/Transparenz-Regel, kein Text, Blickrichtung,
   Anti-Collage: „jedes Motiv als EIGENES separates Bild") stehen IM Batch selbst, dann die 10
   nummerierten Unterpunkte mit je Zieldateiname + vollständiger Beschreibung. Kein Verweis auf
   Regeln außerhalb des Blocks — der Chef pastet genau einen Block pro ChatGPT-Session.
2. **Kreaturen/Monster: IMMER Blickrichtung von rechts nach links** (nach LINKS gewandt) und in
   **Kampfhaltung** — im Battle-Screen steht der Gegner rechts und schaut zum Spieler links. Ohne
   diese Klausel kommen Poses in Zufallsrichtung. Items brauchen keine Blickrichtung.
3. Filter-sichere Formulierungen (kein Blut/Gore/implizite Nacktheit) gelten zusätzlich, s. Regelblock
   in elite-champions.txt bzw. [[natuerliche-spieltexte]]-analoge Lehre vom 2026-07-22.
4. **Wiederholungs-Falle (Lehre 2026-07-23):** Bei ähnlichen Motiven im Batch (4 Turm-Etagen, 10 Waffen)
   generiert ChatGPT gern N× DASSELBE Motiv. Auslöser sind Ähnlichkeits-/Kontinuitäts-Klauseln
   („gleiche Bauart", „konsistent als Reihe") — die STREICHEN. Gegenmittel, alle vier kombinieren:
   (a) Verschiedenheits-Merktabelle im Vorspann (Motiv-Nr. → Typ + Farbwelt/Material in 2-3 Worten),
   (b) jeder Eintrag beginnt mit MOTIVTYP IN GROSSBUCHSTABEN, (c) Negativ-Anker pro Eintrag („KEINE
   Spiegel", „kein Stab"), (d) explizit: „Wenn zwei Bilder sich ähneln, ist der Auftrag verfehlt."
   Fallback-Zeile ans Batch-Ende: Einträge einzeln senden, je mit Regelblock. Vorspann besser als
   Bullet-Block statt Fließtext (übersichtlicher für ChatGPT).
