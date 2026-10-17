# Asset-Brief — Esthar (legendäre Axt), Champion Ossric, Skill-Begleiter Jagen und Schneidern (4 Dateien)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 28.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Hintergrund:** Zwei Community-Stücke eines Spielers (seine Katze wird das Jagd-Pet, seine Wunschaxt „Esthar“ ein Endgame-Drop) plus der fehlende Begleiter für den neuen Skill Schneidern und der Champion, der Esthar fallen lässt.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Esthar, Ossric, Gestiefelter Kater, Seidenweber |
| Zielversion | 1.2.0, Priorität P1 (Content ist im Bau, bis zur Lieferung Emoji-Rückfall) |
| Umfang | 4 Freisteller, alle **1254 × 1254, echtes Alpha** (kein Schachbrett, kein Key, kein Boden, kein Schatten) |
| **Bestandsreferenz (Pflicht)** | Axt: `apps/client/src/renderer/assets/items/colossus_marrowaxe.webp` (Knochen-Look, dieselbe Serie) und eine Götzeneisen-Großaxt aus demselben Ordner. Champion: zwei `assets/monsters/elite_*.webp` (z. B. `elite_ash_vulture.webp`) und das Hochland-Basismonster, das der Content nennt. Pets: `assets/pets/flayling.webp`, `quillshrike.webp`, `gloomrat.webp` (Größe im Bild, Perspektive, Licht). |
| Stil | Ashen-Iron-Palette, gemalt, Veteranen-Präsenz, kein Comic; **kein Rarity-Glühen** auf der Axt (Legendär wird über Form und Material erzählt, nicht über Leuchten) |
| Lieferung | `CODEX/assets/esthar-und-pets-2026-08-28/fertig/` (+ raw/, qa/ mit Kontaktbogen je Datei neben den Bestandsnachbarn), danach HANDOFF/WORKLOG; gern in Teilen (erst Kater, dann Axt, dann Champion und Motte) |
| Nicht anfassen | Renderer, Content; Einbau macht Claude (WebP q92) |

## Die vier Dateien (Namen exakt)

| Datei | Motiv |
|---|---|
| `esthar.png` | **Esthar, Sturm der Gebeine**: zweihändige Großaxt, Kopf aus versteinertem Knochen wie die Marrowaxe, aber legendär: Doppelklinge aus gebogenen Rippenbögen, die wie ein eingefrorener Wirbelsturm um den Schaft laufen, Schädelfragmente und Zahnreihen an den Schneiden, Schaft aus dunklem Eisen mit Knochenwicklung, ausgeblichenes Elfenbein mit rostrotem Mark in den Rissen; Diagonale von unten links nach oben rechts wie die Bestandswaffen; kein Glühen, kein Nebel |
| `elite_ossric.png` | **Ossric der Markgebundene**, Champion im Hochland: Basisform ist der **Grabklippen-Schemen** (`gravecliff_specter`, Bestand `assets/monsters/gravecliff_specter.webp`, Untoter des Hochlands; Nachtrag 28.08. 22:40), aber uralt und knochig, Rücken und Schultern von einem Knochenpanzer überwachsen, Mark tritt rostrot aus den Fugen, Augen bleich; Pose und Größe wie die anderen `elite_*`-Dateien (Freisteller, leicht von vorn-seitlich) |
| `booted_tomcat.png` | **Gestiefelter Kater**, Jagd-Begleiter, nach der echten Katze eines Spielers: Referenzfoto `G:\GameDev\GADZE\8gCR7bSzcX0.jpg` (grau-silbernes Tigerfell mit dunklen Streifen, helle Brust, gelbgrüne Augen, rosa Nase, ernster Blick). Aufrecht auf zwei Beinen, katzenhaft-schlank wie ein Khajiit: gegerbter Lederharnisch mit Bronzeschnallen, hohe Stiefel, Umhang mit Kapuze im Nacken, an der Hüfte eine Schlinge und Fallenteile, in der Pfote eine kleine Armbrust; Gesicht klar als DIESE Katze erkennbar (Streifenmuster und Augen), Pose und Bildgröße wie die Pet-Nachbarn |
| `silkweaver.png` | **Seidenweber**, Schneider-Begleiter: eine bleiche Nachtmotte mit spindeldürren, gelenkigen Beinen, die einen silbernen Faden zwischen den Vorderbeinen spannt, Flügel mit feinem Stichmuster wie Stoffbahnen, Fühler wie Nadeln; gedeckte Elfenbein-, Grau- und Nachtblautöne, schwacher Schimmer auf dem Faden erlaubt |

## Regeln (Kurzfassung, s. `CODEX/RULES.md`)

- Stilabgleich mit dem Zielordner: Bestandsdateien ansehen, Größe im Bild, Perspektive und Licht übernehmen; Pets sind freistehende Kreaturen ohne Szene.
- Echtes Alpha, QA wie gewohnt (Maße, Alpha-Kanal, Kontaktbögen mit Nachbarn).
- Kein Text, keine Plakette, kein Rahmen.

# Teil B – Produktionsplan (Mira)

<!-- codex:2026-08-28T22:17:31+02:00 -->

1. Pflichtreferenzen je Zielfamilie vor der Erzeugung visuell prüfen: Motivmaßstab,
   Perspektive, Licht von oben links, Freistellung und Materialgrad.
2. Reihenfolge: `booted_tomcat`, `esthar`, `silkweaver`, anschließend `elite_ossric` erst
   nach Eingang der vom Auftraggeber angekündigten Hochland-Basisform.
3. Jedes Motiv als separaten Built-in-ImageGen-Wurf mit ausdrücklich echtem Alpha erzeugen.
   Keine gemalten Schachbretter und keine technische Key-Farbe als Finalweg übernehmen.
4. Akzeptiertes Raw alphaerhaltend auf 1254 × 1254 normalisieren; Motiv mittig mit
   Sicherheitsrand und unverändertem Seitenverhältnis platzieren.
5. Automatisch prüfen: exakter Dateiname, PNG/RGBA, 1254², Alpha benutzt, Außenrand Alpha 0,
   RGB unter Alpha 0 bereinigt. Danach Sichtprüfung auf dunklem und grellrosa Grund.
6. Je Datei Kontaktbogen mit mindestens zwei Bestandsnachbarn erstellen. Renderer bleibt
   unangetastet; Lieferung ausschließlich im vereinbarten Staging.

# Teil C – Quellen und Promptauflösung (Mira)

<!-- codex:2026-08-28T22:17:31+02:00 -->

- Kater-Identität: `GADZE/8gCR7bSzcX0.jpg`; Serienmaßstab und Malgrad:
  `pets/flayling.webp`, `pets/quillshrike.webp`, `pets/gloomrat.webp`.
- Esthar-Material und Formstufung: `items/colossus_marrowaxe.webp` sowie
  `items/godiron_greataxe.webp`. Die Magenta-Altmatte der Marrowaxe ist ausdrücklich kein
  Teil des Designs und wird nicht übernommen.
- Seidenweber: dieselben drei Pet-Nachbarn; Motte bleibt biologisch lesbar und erhält nur am
  gespannten Silberfaden einen schwachen Schimmer.
- <!-- codex:2026-08-28T22:45:21+02:00 --> Ossric: Der um 22:40 ergänzte bindende
  Content-Nachtrag legt `gravecliff_specter.webp` als Basisform fest. Zusätzlich dienen
  `elite_ash_vulture.webp` und `elite_high_roc.webp` nur für Champion-Maßstab und
  Elite-Detailgrad; Anatomie, Kapuze, Klauen und geisterhafte Schleppenform kommen vom
  Grabklippen-Schemen.

# Teil D – Abnahme und Übergabe (Mira)

<!-- codex:2026-08-28T22:17:31+02:00 -->

- Vier exakt benannte Finals unter `CODEX/assets/esthar-und-pets-2026-08-28/fertig/`.
- Alle vier 1254 × 1254 PNG RGBA mit echtem Alpha und vollständig transparentem Außenrand.
- Katergesicht gegen Foto geprüft; Esthar ohne Glühen, Nebel oder Boden; Seidenweber mit
  sauberer Teiltransparenz an Fühlern/Faden/Flügelkanten; Ossric mit eindeutiger Bindung an
  die nachgereichte Basisform.
- QA-Kontaktbögen auf dunklem und grellrosa Grund sowie je Motiv neben zwei bis drei
  Bestandsnachbarn; maschinenlesbarer Messbericht und Quellenkarte.
- Abschließend HANDOFF und WORKLOG; keine Renderer- oder Content-Integration.

## Chef-Korrektur — Gestiefelter Kater

<!-- codex:2026-08-28T22:59:45+02:00 -->

Die erste technisch bestandene Fassung war zu fotorealistisch und ist verworfen. Verbindlich
ist nach der zweiten direkten Chef-Korrektur eine düstere, raue und malerische Dark-Fantasy-
Fassung mit erwachsenen, schlanken Khajiit-Proportionen. Die zwischenzeitliche cartoonige
Fassung mit übergroßem Kopf und Pfoten ist ebenfalls verworfen. Direkte Richtungsüberschreibung:
Der Kater steht links und zielt/greift von links nach rechts an. Fotoidentität bleibt über
Stirnstreifen, gelbgrüne Augen, rosa Nase und silbergraues Tigerfell erhalten.

<!-- codex:2026-08-28T23:05:36+02:00 -->

Stilziel der verbindlichen Fassung: tiefe Schatten, entsättigte Palette, abgetragenes fast
schwarzes Leder, zerrissene Stoffkanten, rauer Pinselgrad und eine scharfkantige Silhouette;
weder fotorealistisch noch niedlich/cartoonhaft.

### Chef-Korrektur — Jagdwaffe und Pfoten

<!-- codex:2026-08-28T23:10:28+02:00 -->

Die Armbrust entfällt vollständig. Der Kater wirft als eindeutig lesbarer Jagd-Begleiter eine
geöffnete funktionale Bärenfalle an einer durchgehend befestigten Eisenkette nach rechts. Eine
Hand führt die Kette, die andere hat die Falle gerade freigegeben. Keine Schuhe oder Stiefel;
beide natürlichen Katzenpfoten mit Fell, Zehen und Krallen bleiben sichtbar.
