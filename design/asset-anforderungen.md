# Asset-Anforderungen — Grim Reach

Verbindlich für **alle** neu gelieferten Bilder: Kreaturen, Items, Icons, Kulissen. Wer nach
diesen Regeln liefert, dessen Bilder gehen ohne Nacharbeit ins Spiel.

Diese Datei ist die Quelle. Wenn etwas hier nicht steht, ist es nicht vereinbart.

---

## 1. Transparenz — die wichtigste Regel

**Freisteller brauchen einen echten Alphakanal. Ohne Ausnahme.**

- **Kein Schachbrettmuster.** Ein gemaltes Karo ist keine Transparenz, sondern ein Bild von
  Transparenz. Es sieht im Spiel aus wie ein Bild von Transparenz.
- **Gemessen wird das Ergebnis, nicht der Weg.** Natives Alpha direkt aus der Erzeugung ist der
  sicherste Weg und immer erlaubt. Ein sauber entfernter Chroma-Key ist ebenfalls in Ordnung,
  **wenn am Ende kein Saum übrig ist** — das prüfen wir nach, nicht nach Zusage.
- **Magenta als Keyfarbe ist verboten.** Genau daran sind 55 Dateien gescheitert: Die Motive
  tragen selbst Violett, das Despill-Skript hat Magenta ausdrücklich übersprungen, und die
  Keyfarbe steckt bis heute im Fell. Wer keyen muss, nimmt Grün und lässt ein Despill mit
  Kantenkorrektur laufen.
- **Bei Fell, Federn, Nebel, Glut und Geisterlicht** ist Keying erfahrungsgemäß nicht sauber zu
  bekommen. Dort führt praktisch kein Weg an nativem Alpha vorbei. Kommt so ein Motiv trotzdem
  mit Saum zurück, geht es zurück — das ist kein Vorwurf, sondern der Grund, warum wir messen.
- **Weiche Kanten sind erwünscht.** Fell, Rauch, Nebel und Glut dürfen halbtransparent
  auslaufen. Eine harte Ein-Bit-Kante sieht im Spiel ausgefranst aus.
- **Prüfen lässt sich das in einer Minute:** Bild auf eine grellrosa Fläche legen. Sieht man
  irgendwo einen farbigen Saum oder eine Kante, die es nicht geben dürfte, ist es nicht sauber.

**Format:** PNG mit Alpha. WebP mit Alpha geht auch. Kein JPG für Freisteller.

---

## 2. Auflösung und Dateigröße

Sichtbare Qualität geht vor Dateigröße. Wir sparen an der Grafikkarte, nicht am Bild.

| Art | Kantenlänge (lange Seite) | Anmerkung |
|---|---|---|
| Kreaturen / Monster | mindestens 1024 px | werden im Kampf bis ~460 px hoch dargestellt |
| Items / Ausrüstung | mindestens 512 px | Icons erscheinen bis 96 px, Tooltip-Bilder größer |
| Kulissen / Hintergründe | mindestens 1920 px breit | werden gekachelt oder formatfüllend gezeigt |
| Porträts | mindestens 880 px | |

Lieber zu groß liefern als zu klein. Verkleinern können wir, Details erfinden nicht.

---

## 3. Ästhetik

Der Stil heißt **„Ashen Iron"**: dunkle Dark-Fantasy, gedeckte Farben, warmes Gold als Akzent,
gemalt statt gerendert, keine Comic-Anmutung.

**Kreaturen und Charaktere**
- Generische, coole Fantasy-Archetypen mit der Präsenz von Veteranen.
- **Keine** Folklore-Anleihen, keine Bettler-/Armuts-Optik, keine Comedy.
- Blickrichtung nach links, sofern nichts anderes dabeisteht. Der Spieler steht rechts.
- Ganzkörper, freigestellt, keine angedeutete Bodenfläche und kein Schlagschatten im Bild.

**Ausrüstung**
- **Kein Schimmern, Glühen oder Leuchten auf Ausrüstung.** Nur Runen und Tränke dürfen leuchten.
  Ein Schwert der höchsten Stufe ist durch Form und Material eindrucksvoll, nicht durch einen
  Neon-Rand.
- Einzelnes Objekt, freigestellt, leicht schräg von vorn, kein Bodenkontakt.

**Farben**
- Zurückhaltend. Die Oberfläche des Spiels ist dunkel; grelle Sättigung sticht heraus wie ein
  Fremdkörper.

---

## 4. Benennung und Ablage

**Der Dateiname ist die Zuordnung.** Es gibt keine Zuordnungstabelle, die man pflegen müsste:
Das Spiel sucht sich das Bild anhand der Item- oder Monster-Id.

```
assets/items/<item_id>.webp        z. B.  bloodiron_sword.webp
assets/monsters/<monster_id>.webp  z. B.  elite_wild_wolf.webp
```

- Kleinbuchstaben, Unterstriche, keine Leerzeichen, keine Umlaute.
- Ein Bild pro Id. Kein `final`, kein `v2`, keine Nummern im Namen.
- Passt der Name nicht, taucht das Bild im Spiel schlicht nicht auf. Es gibt keine Fehlermeldung.

**Lieferweg:** ZIP mit den fertigen Dateien, flach oder in `items/` und `monsters/` sortiert.

---

## 5. Abnahme — was wir prüfen, bevor etwas ins Spiel geht

1. Alphakanal vorhanden und benutzt (kein Karo, kein Vollflächen-Hintergrund).
2. Kein Farbsaum an der Silhouette (Test auf grellrosa Grund).
3. Auflösung erreicht die Untergrenze aus Abschnitt 2.
4. Dateiname entspricht exakt der Id.
5. Kein Leuchten auf Ausrüstung.
6. Blickrichtung stimmt.

Fällt eines davon durch, geht die Datei zurück. Das ist keine Strenge um ihrer selbst willen:
Nacharbeit an 55 Dateien kostet mehr als eine saubere Lieferung.

---

## 6. Bekannte Altlasten

Der Elite-Champions-Batch (Motive 11 bis 28) stammt aus einer Zeit **vor** der heutigen
Werkzeugkette: Die Bilder wurden im Web-Chat erzeugt und anschließend von Hand mit einem
Magenta-Key freigestellt. Das ist die Quelle der Altlast — **nicht** die Codex-Pipeline, die
diese Dateien nie angefasst hat.

Warum ausgerechnet dort: Die Champions tragen violette Roben, violettes Geisterlicht und
violette Flossen. Die Keyfarbe war Teil des Motivs und konnte deshalb gar nicht sauber
verschwinden. Zum Vergleich: Bei ProjectTower lief derselbe Ablauf mit einem **grünen** Key
über 605 transparente Dateien, gemessen ohne einen einzigen Rest — dort war Grün nie Teil des
Motivs.

14 Monster zeigen sichtbare Magenta-Streifen, am deutlichsten `elite_wild_wolf`,
`elite_crypt_icemage`, `elite_slag_hexer` und `mire_wisp`. Sie werden neu erzeugt.

**Die Lehre ist nicht „kein Key", sondern: die Keyfarbe darf im Motiv nicht vorkommen.**
Wer keyt, prüft vorher, welche Farbe im Bild fehlt.
