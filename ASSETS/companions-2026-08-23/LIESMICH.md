# Begleiter-Neuguss 2026-08-23 — alle 21 Bilder neu

Chef-Auftrag: „Die Qualität jener gefällt mir nicht. Für jedes Pet ein neues Bild. Zwar Dark
Fantasy, aber sollte zum Skill passen und nicht lächerlich wirken."

Alles zu diesem Auftrag liegt in diesem Ordner. Es muss nichts aus `Downloads` geholt werden.

```
ASSETS/companions-2026-08-23/
  LIESMICH.md    <- diese Datei
  prompts/       <- ein Block je Begleiter
  fertig/        <- HIER die fertigen PNGs ablegen
```

---

## Was heute schief ist

Ein Kontaktbogen aller 21 Begleiter macht drei Probleme sofort sichtbar:

**1. Man sieht keinem an, wozu er gut ist.** Das ist der Kern. `hemlock` gibt einen Bonus auf
Kräuterkunde und ist ein Bündel Pflanzen. `witherling` hilft beim Anbau und sieht aus wie etwas,
das auf dem Feld verdorrt ist — die Aussage steht auf dem Kopf. `gemwraith` (Juwelierskunst) und
`glyphmaw` (Runenkunst) sind beide violette Kristallwesen und praktisch nicht auseinanderzuhalten.

**2. Alle sprechen dasselbe Monster-Vokabular.** Zähne, Hörner, Fäulnis, Knochen, Glut. 21 Mal.
Dadurch wirkt keiner besonders, und keiner wirkt wie ein Begleiter — sie sehen aus wie Gegner,
die man gerade erschlagen hat.

**3. Einige sind schlicht albern.** `charnel` ist ein Schädelklumpen mit grünen Augen, `flayling`
eine schlaksige Puppe mit Beulenkopf, `sporewretch` ein Pilzklumpen mit Grimasse. Andere sind
gar keine Kreaturen: `hoarspite` ist eine Eisscherbe, `hemlock` ein Pflanzenbüschel. Ein Begleiter
muss ein Wesen sein, dem man zutraut, mitzukommen.

---

## Die Richtung

**Dark Fantasy bleibt.** Das ist die Welt, und das ändert sich nicht. Aber düster heißt nicht
grotesk, und Fantasy heißt nicht albern.

Der Maßstab ist **Würde**. Ein Begleiter darf unheimlich sein, fremdartig, sogar abstoßend
schön. Er darf nicht wie ein Witz aussehen und nicht wie ein Klumpen. Wer ihn sieht, soll denken
„das will ich bei mir haben", nicht „was ist das denn".

---

### Der Anker ist die QUELLE

Das ist die eigentliche Vorgabe dieses Auftrags, und sie geht allem anderen vor.

**Jeder Begleiter fällt an einer bestimmten Stelle im Spiel an.** Danach ist er zu entwerfen. Er
soll aussehen wie ein Wesen, das genau dort lebt und dem man dort begegnet — nicht wie ein
beliebiges Monster, dem man den Bonus nachträglich angeheftet hat.

**14 Begleiter fallen bei einer Tätigkeit an:**

| Begleiter | fällt an bei | woraus er entstehen soll |
|---|---|---|
| rotbark | Holzfällen | Holz, Rinde, Wald |
| cragmaw | Bergbau | Stein, Tiefe, Erz |
| gillrot | Angeln | Wasser, Schuppen, Ufer |
| witherling | Anbau | Feld, Wachstum, Saat |
| sporewretch | Sammeln | Unterholz, Moos, Pilze |
| gloomrat | Diebeskunst | Gassen, Schatten, Diebesgut |
| slagfiend | Schmieden | Esse, Hitze, Metall |
| ashgut | Kochen | Herd, Rauch, Kessel |
| quillshrike | Lederverarbeitung | Häute, Borsten, Werkzeug |
| flayling | Lederverarbeitung | dasselbe, aber anderes Wesen |
| gemwraith | Juwelierskunst | Edelstein, Schliff, Glanz |
| glyphmaw | Runenkunst | Runen, Zeichen, Stein |
| vellumoth | Runenkunst | Pergament, Tinte, Schrift |
| hemlock | Kräuterkunde | Kräuter, Tinktur, Wurzel |

**7 Begleiter fallen im Kampf an**, je nach Kampfstil:

| Begleiter | fällt an bei | woraus er entstehen soll |
|---|---|---|
| ironmaw | Nahkampf | Eisen, Panzerung, Wucht |
| carapace | Nahkampf | Schild, Chitin, Standhaftigkeit |
| gorehound | Fernkampf | Fährte, Jagd, Hetze |
| carrionwing | Fernkampf | Flügel, Höhe, Beobachtung |
| pyreling | Magie | Feuer, Glut |
| hoarspite | Magie | Frost, Kälte |
| charnel | Magie | Tod, Zehrung |

**Warum die Quelle und nicht der Effekt:** `vellumoth` zeigt es. Sein Bonus ist ein
Verkaufsbonus — daraus ließe sich kein Wesen entwerfen, das irgendwo hingehört. Seine Quelle ist
die Runenkunst, und sein Name sagt es schon: eine Pergamentmotte. Aus der Quelle entsteht ein
stimmiges Wesen, aus dem Effekt ein Etikett.

Der Effekt bleibt trotzdem sichtbar, aber nur als **eine** kontrollierte magische Akzentfarbe
(siehe technische Vorgaben). Er bestimmt nicht, was das Wesen ist.

---

### Woran es heute scheitert

- `hemlock` fällt bei der Kräuterkunde an und ist ein Pflanzenbüschel — also gar keine Kreatur,
  sondern das Sammelgut selbst.
- `witherling` fällt beim Anbau an und sieht aus wie etwas, das auf dem Feld verdorrt ist.
  Ein Feldbegleiter, der für Verfall steht, sagt das Gegenteil dessen, wofür er da ist.
- `gemwraith` (Juwelierskunst) und `glyphmaw` (Runenkunst) sind beide violette Kristallwesen und
  kaum zu unterscheiden, obwohl sie aus ganz verschiedenen Werkstätten stammen.
- `hoarspite` ist eine Eisscherbe, kein Wesen.

**Und sie müssen unterscheidbar sein.** 21 verschiedene Kreaturen, nicht 21 Farbvarianten. Zwei
Begleiter dürfen sich nicht ähneln, nur weil ihre Quellen verwandt sind — die beiden
Lederverarbeitungs-Begleiter und die drei Magie-Begleiter sind der Härtetest.

## Technische Vorgaben

Die Bildparameter aus `CODEX/AssetControl/CompanionPets-2026-08-01/SERIES-CONTRACT.md`
(Abschnitt „Unveränderliche Bildparameter") gelten unverändert weiter. Sie waren nie das
Problem. Kurzfassung:

- 1024 × 1024 px, PNG mit **echtem, bei der Erzeugung angelegtem Alpha**. Kein Chroma-Key,
  kein gemaltes Schachbrett, kein nachträgliches Freistellen. Siehe
  `design/asset-anforderungen.md`.
- Ganzkörper, nichts angeschnitten, rund 9 % Rand. Längste Körperachse belegt 76–80 % der
  Leinwand.
- Ruhige Begleiter-Pose, kein Angriff, kein Effektgewitter. Blick nach links-vorn.
- Weiches warmes Licht oben links, kaltes Fülllicht rechts, schmaler bernsteinfarbener Rand.
  Über alle 21 gleich.
- Gedeckte Naturfarben plus **genau eine** kontrollierte magische Akzentfarbe, die aus dem
  Effekt des Begleiters kommt.
- Hintergrund vollständig transparent. Kein Boden, kein Sockel, kein Schatten, kein Rahmen,
  kein Text.
- **Die Silhouette muss bei 160–220 px noch lesbar sein.** Im Spiel ist das Bild klein. Ein
  Gewirr aus Ranken und Fransen wird dort zu einem Fleck.

**Dateiname exakt die Pet-Id**, kleingeschrieben, keine Zusätze. Ein Motiv = eine Datei, keine
Collagen.

---

## Was ausdrücklich nicht als Vorlage dient

- Die **aktuellen** Bilder unter `apps/client/src/renderer/assets/pets/` — die werden ersetzt.
- Die beiden verworfenen Anläufe unter
  `CODEX/AssetControl/CompanionPets-2026-08-01/rejected/`. Der eine hat die alten Bilder
  kopiert, der andere wurde als zu grotesk verworfen. Beide sind Referenzverbot.

Wofür der Entwurf da ist, steht in Id, Name, Beschreibung, Skill und Effekt. Mehr braucht es
nicht.

---

## Abnahme

Zusätzlich zu `design/asset-anforderungen.md` Abschnitt 5:

1. **Herkunftstest:** Bild jemandem zeigen, der die Zuordnung nicht kennt. Errät er, WO ihm
   dieses Wesen begegnet — beim Holzfällen, im Bergwerk, am Wasser, in der Esse? Wenn nein,
   zurück.
2. **Würdetest:** Wirkt es albern, klumpig oder wie ein Witz? Wenn ja, zurück.
3. **Kreaturentest:** Ist es ein Wesen und kein Gegenstand, kein Pflanzenhaufen, kein Kristall?
4. **Verwechslungstest:** Alle 21 nebeneinanderlegen. Sehen sich zwei zu ähnlich? Dann zurück.
5. **Kleintest:** Auf 200 px verkleinern. Bleibt die Silhouette lesbar?
6. Echtes Alpha, kein Farbsaum, Dateiname exakt die Id.
