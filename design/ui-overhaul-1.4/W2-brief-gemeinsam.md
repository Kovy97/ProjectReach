# UI-Überarbeitung 1.4: Welle 2, gemeinsamer Teil (für alle Seitengruppen)

Repo G:\GameDev, Branch update-1.4.0, Client apps/client. Sprache Deutsch.

## Anlass und Stand
Chef 24.10.2026: Spieler beklagen „Texte zu klein, obwohl Platz da ist“. Der ganze Platz soll genutzt werden.
Welle 1 ist fertig und committet (2483e3c):
- **Skala:** Fließende Schriftskala `--fs-2xs … --fs-3xl` in `styles/base.css`: 13/14/15/17/19/22/26/34 px bei 1366, bis +15 % ab ~2000 px, mal `--text-scale`.
- **Textgröße:** Optionen Normal/Groß/Sehr groß = 1/1,12/1,25.
- **Fließtext-Schrift:** `--font-body` (Alegreya, echte Kleinbuchstaben). Sie gilt für Fließtext: Beschreibungen, Effekte, Hinweise, Quest- und Lore-Texte. Titel, Namen und Knöpfe bleiben in der Hausschrift `--font-head`/`--font-info` (Kapitälchen). `styles/typography.css` sammelt ca. 190 Fließtext-Klassen.
- **Seitenleiste, Kopfzeile, Item-Tooltip-Grundgröße, Toasts, Modals, Optionen:** bereits umgestellt.
- **Vorbild für „Platz nutzen“:** Block am Ende von `styles/gravewood-actioncards.css` (Commit 26d617e). Gerahmte Felder skalieren ihren Inhalt per cqw; ein großes Feld bekommt großen Inhalt (Bild über Name) statt Mini-Icon in leerer Fläche.

## Auftrag je Seite deiner Gruppe
1. **Messen.** Vorher-Screenshots machen und messen:
   - Mit `node ui-audit/_type-audit.mjs <out.json> <BxH> <port> <seiten,kommagetrennt>` aus apps/client. Env: `AUDIT_LOCALE=de|ru`, `AUDIT_SCALE=normal|large|xlarge`.
   - Das Skript legt je Seite ein PNG neben die JSON-Datei. Unterseiten, Reiter und Dialoge erreichst du mit eigenen kleinen Skripten über `ui-audit/sim-harness.mjs` (Vorbild `ui-audit/_actioncard.mjs`).
   - Fixture `endgame` oder `midgame`.
2. **Schriftgrößen auf die Skala bringen.** Alle festen px-Schriftgrößen deiner Dateien unter 15 px auf `var(--fs-…)` umstellen, ebenso alle festen Größen, die eigentlich zur Skala gehören.
   - Nichts Sichtbares unter `--fs-2xs`.
   - Wörter mindestens `--fs-xs`.
   - Fließtext mindestens `--fs-sm`.
   - Zahlen-Badges auf Icons dürfen `--fs-2xs`.
   - cqw-Formeln so wählen, dass bei realer Feldbreite die Mitte des Bereichs greift, nicht das Minimum.
3. **Platz nutzen.** Wo ein gerahmtes Feld viel Leerfläche um kleinen Inhalt hat, Inhalt größer machen: Icon, Bild, Text, Abstände. Bei Bedarf Layout umstellen (z. B. gestapelt statt in einer Zeile), aber nie das Bedienkonzept ändern.
   - Das Skript meldet solche Felder unter `sparse`, prüfe aber auch per Auge.
   - Leere Restflächen am Kartenende sind ein Hinweis, dass Inhalt größer sein darf.
4. **Fließtext-Schrift ergänzen.** Fließtext-Klassen deiner Seiten, die noch nicht `--font-body` haben, bekommen sie in DEINEN Gruppen-Dateien, nicht in typography.css.
5. **Nachher prüfen.** Gleiche Screenshots nachher machen.
   - Pflicht: 1366×768 in de und ru jeweils bei „Normal“ und „Sehr groß“, dazu 1920×1080 de „Normal“.
   - Prüfen: kein horizontales Scrollen, keine abgeschnittenen Knöpfe oder Texte, keine neuen Scrollbalken in festen Feldern, Kartenraster nicht gesprengt.
   - Ablage für die Chef-Abnahme: `design/ui-overhaul-1.4/w2-<gruppe>/<seite>-<auflösung>-<sprache>-<skala>-vorher|nachher.png`. Pro Seite reichen 1366-de-normal und 1920-de-normal je vorher/nachher, dazu die Nachher-Prüfbilder.

## Harte Grenzen
- **Nur deine Dateien.** Schreib nur in die Dateien deiner Gruppe (siehe Einzelbrief). Andere Gruppen arbeiten parallel. Brauchst du eine Änderung in einer fremden Datei, notiere sie als Übergabe (Datei, Selektor, gewünschter Wert, Grund). Ich setze sie danach um.
- **Für alle Gruppen TABU:** `styles/base.css`, `typography.css`, `index.css`, `design-system.css`, `gravewood-controls.css`, `topbar.css`, `sidebar.css`, `chrome*.css`, `modals.css`, `options.css`, `classic-skin.css`, `classic-chrome.css`, alle `i18n/**`, `App.tsx`, `GameContext.tsx`, `packages/**`.
- **`pages.css`** hat genau einen Schreiber (Gruppe D). Andere Gruppen melden ihre pages.css-Wünsche als Übergabe.
- **`components.css`** hat genau einen Schreiber (Gruppe B).
- **Keine Texte umschreiben**, keine neuen i18n-Schlüssel. Ein Textpass folgt. Wenn ein Text nur durch Kürzung passt, als Übergabe melden.
- **Keine Engine-, Content- oder Save-Änderungen.** TSX nur in den Seitenkomponenten deiner Gruppe und nur für Layout oder Klassen.
- **Nie steril:** Texturen, Holz- und Eisenrahmen, Ränder und Materialien bleiben. Platz gewinnst du über Größe und Layout, nie über Materialentzug. Standardknopf bleibt `.btn-iron` / `.shop-citadel-btn`.
- **CSS-`url()` immer quoten.**
- **Classic-Generator NICHT laufen lassen.** Ich lasse ihn am Ende einmal laufen, sonst überschreiben sich parallele Läufe.
- **Kein Electron, kein `pnpm dev`, keine echten Spielstände.** Nur Harness/Audit mit DEINEM Port (siehe Einzelbrief). Keine Läufe über 10 Minuten, keine Render-Schleifen.
- **Kein git add, kein Commit.**
- **Zeitmarker:** Neue oder geänderte Codestellen bekommen `claude:<Zeitstempel>`. Den Zeitstempel IMMER per `date "+%Y-%m-%dT%H:%M:00+02:00"` holen, nie schätzen. Kommentardichte wie im Umfeld; bei vielen gleichartigen Token-Umstellungen genügt ein Marker je Regelblock.
- **Am Ende einmal:** `npx tsc --noEmit` und `npx vitest run` in apps/client (darf parallel zu anderen Gruppen laufen). Kein `pnpm build`, das mache ich.

## Rückmeldung (knapp)
1. Geänderte Dateien
2. je Seite Audit vorher/nachher (Anteil unter 13 px, kleinste Schrift, sparse-Felder)
3. die 3–5 sichtbarsten Verbesserungen
4. Übergaben für fremde Dateien
5. Textkürzungs-Wünsche
6. was du nicht prüfen konntest
