# Neuguss 2026-08-23 — magenta-verseuchte Kreaturen-Art

Alles zu diesem Auftrag liegt in diesem Ordner: Anleitung, Prompts, Referenzen und der
Ablageplatz für die fertigen Bilder. Es muss nichts aus `Downloads` geholt werden.

```
ASSETS/neuguss-2026-08-23/
  LIESMICH.md          <- diese Datei
  prompts/             <- die Prompts, ein Block je Motiv
  fertig/              <- HIER die fertigen PNGs ablegen
```

---

## Worum es geht

17 Kreaturen tragen Magenta-Reste im Bild. Sie wurden seinerzeit **nicht** mit echtem Alpha
geliefert, sondern nachträglich per Magenta-Chroma-Key freigestellt. Die Keyfarbe steckt bis
heute im Motiv: als magentafarbene Streifen auf Fell, Federn, Stoffkanten, Geweih und
Flügelhäuten, bei `mire_wisp` sogar mitten in der Fläche.

Nicht betroffen und ausdrücklich **nicht** neu zu erzeugen: die Motive 1 bis 10 des
Elite-Champions-Batches. Die kamen mit echtem Alpha und sind sauber.

---

## Die wichtigste Regel dieses Auftrags: Familienähnlichkeit

Ein Neuguss, der sauber ist, aber neben seinen Geschwistern fremd wirkt, ist kein Fortschritt.
**Jedes Motiv hier hat ein Vorbild, das bereits im Spiel ist und bleibt.**

Bei den Elite-Champions ist das die Basis-Kreatur, aus der die Variante hervorgeht.
`elite_wild_wolf` ist derselbe Wolf wie `gray_wolf` — größer, vernarbter, gefährlicher, aber
unverkennbar dasselbe Tier, dieselbe Fellfarbe, dieselbe Anatomie. Ein Spieler muss beim
Anblick sofort sehen: das ist der Anführer *dieses* Rudels.

**Jeder Prompt nennt die Referenzdateien mit vollem Pfad.** Diese Bilder vor der Erzeugung
ansehen und den Stil daraus übernehmen: Palette, Pinselführung, Detailgrad, Beleuchtung,
Materialanmutung. Der Prompttext beschreibt, *was* zu sehen ist — die Referenz bestimmt, *wie*
es aussieht.

Bei den drei eigenständigen Kreaturen (`mire_wisp`, `iron_sentinel`, `barrow_chanter`) gibt es
keine Basis-Kreatur. Dort dient die aktuelle, fehlerhafte Datei als Vorlage für Silhouette,
Haltung und Farbklang — **mit einer Ausnahme: das Magenta darin ist der Defekt, nicht das
Design.** Es darf nicht mitübernommen werden.

---

## Transparenz

Verbindlich ist `design/asset-anforderungen.md`. Das Wesentliche:

- **Am Ende muss echtes Alpha da sein und kein Saum.** Wie es entsteht, ist zweitrangig:
  natives Alpha aus der Erzeugung ist der sichere Weg, ein sauber entfernter GRÜNER Key mit
  Despill ist auch in Ordnung. **Magenta ist verboten** — daran sind diese 17 Dateien
  gescheitert. Kein gemaltes Schachbrett.
- Bei Fell, Federn, Nebel und Geisterlicht wird ein Key selten sauber. `mire_wisp` leuchtet
  blaugrün, dort ist auch ein grüner Key aussichtslos. Wo es nicht sauber wird, sag es lieber
  vorher, als es zu liefern.
- **Weiche Teiltransparenz** für Fell- und Federränder, Nebel, Rauch, Glut und Geisterlicht.
  Eine harte Ein-Bit-Kante sieht im Spiel ausgefranst aus.
- **Kein Pixel** darf einen magenta, pinken oder violetten Saum tragen, der nicht ausdrücklich
  zum Design gehört.

---

## Format und Benennung

- PNG mit Alphakanal, lange Seite mindestens 1024 px.
- Ganzkörper, zentriert, großzügiger Rand, nichts angeschnitten.
- Blick nach **links**, kampfbereit, als stünde der Gegner links außerhalb des Bildes.
- Kein Rahmen, kein Text, kein Boden und kein Schlagschatten im Bild.
- **Dateiname exakt die Id**, kleingeschrieben, keine Zusätze wie `_final` oder `_v2`.
  Ein falscher Name heißt: Das Bild taucht im Spiel kommentarlos nicht auf.

Ein Motiv = eine Datei. **Keine Collagen, keine Kontaktbögen, keine Sammelbilder.**

---

## Ablieferung

Die fertigen PNGs nach `ASSETS/neuguss-2026-08-23/fertig/` legen. Wenn der Erzeugungsweg nur
ZIPs herausgibt: entpacken, sodass die einzelnen PNGs dort liegen.

Die Bilder in `fertig/` gehen bewusst nicht in die Versionsverwaltung — sie sind eine
Zwischenstation. Nach der Abnahme wandern sie nach
`apps/client/src/renderer/assets/monsters/` und ersetzen dort die alten Dateien.

---

## Abnahme

Geprüft wird gegen `design/asset-anforderungen.md` Abschnitt 5, plus zwei Punkte, die diesem
Auftrag eigen sind:

1. Alphakanal vorhanden und benutzt.
2. **Kein Farbsaum an der Silhouette.** Prüfen lässt sich das in einer Minute: Bild auf eine
   grellrosa Fläche legen. Sieht man einen Saum, der dort nicht hingehört, ist es nicht sauber.
3. Auflösung mindestens 1024 px an der langen Seite.
4. Dateiname exakt die Id.
5. Blickrichtung links.
6. **Familienähnlichkeit:** Motiv neben seine Referenz legen. Erkennt man dieselbe Kreatur?
7. **Kein Magenta übernommen** bei den drei eigenständigen Motiven.

Fällt eines durch, geht die Datei zurück. Wir messen das nach, nicht per Augenmaß allein.
