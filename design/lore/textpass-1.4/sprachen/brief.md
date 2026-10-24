# Textpass 1.4: Sprachwelle (es, fr, pt-BR, ru, zh)

Repo G:\GameDev, Branch update-1.4.0. Je Sprache EIN Agent, der GENAU zwei Dateien besitzt:
- `packages/content/src/locales/<lang>.ts` (Content-Overlay, Schlüssel `"<collection>:<id>:<field>"`)
- `apps/client/src/renderer/i18n/locales/<lang>.ts` (UI-Texte, Schlüssel wie in `translations.ts`)
Dateinamen: es → `es.ts`, fr → `fr.ts`, pt-BR → `ptBR.ts`, ru → `ru.ts`, zh → `zh.ts`.
Nichts sonst anfassen: keine anderen Sprachen, kein EN/DE, kein Code. Vier Kollegen arbeiten parallel an den anderen Sprachen.

## Was zu tun ist
Der Textpass hat EN/DE überarbeitet: Glossar, Faktenfehler, neue Formulierungen. Außerdem haben 974 Items erstmals eine
Beschreibung bekommen. Deine Sprache muss nachziehen. Die Arbeitslisten sind maschinell erzeugt:
- `design/lore/textpass-1.4/sprachen/content-todo.json`: 1.291 Content-Schlüssel. `enAlt: null` heißt neu (974 Item-
  Beschreibungen), sonst hat sich der englische Text geändert. Neben `en` steht `de` als zweite Quelle.
- `design/lore/textpass-1.4/sprachen/ui-todo.json`: 338 UI-Schlüssel, deren englischer Text sich geändert hat.
Für jeden Schlüssel schreibst du die Übersetzung in deine Datei. Vorhandene Einträge werden ersetzt, fehlende neu angelegt,
in einem eigenen Block mit Marker-Kommentar.

Zusätzlich gilt das Glossar (`design/lore/textpass-1.4/glossar.md`, Abschnitt „Chef-Entscheide 24.10.2026“ samt Nachtrag):
- **Slayer** ist ein Eigenname in allen 7 Sprachen: Skill, Turm, Sets, Aufträge, Slayer-Punkte. Prüfe in DEINEN beiden Dateien
  ALLE Einträge, deren englische Quelle „Slayer“ enthält, und ersetze Wörter, die mit dem Skill Jagen kollidieren
  (es „cazador“, fr „chasseur“, pt-BR „caçador“, ru „охотник“ usw.), durch „Slayer“ (zh: das bisherige zh-Wort prüfen;
  kollidiert es mit 狩猎/Jagen, auf ein eindeutiges Wort vereinheitlichen und in der Rückmeldung nennen).
- **Ward** und **Raid** bleiben die etablierten Wörter deiner Datei (zh: 结界, 团队副本). Bank ≠ Lager (Materialseite).
- **Anrede:** ru durchgehend „ты“, fr durchgehend „tu“ (es, pt-BR und zh sind schon einheitlich). Prüfe in deinen Dateien
  Texte mit Sie-/vous-/вы-Form und stell sie um. Ausnahme: Figurenrede, in der eine Figur bewusst siezt; im Zweifel du.
- **Ton:** knapp, trocken, dark fantasy, keine KI-Floskeln, höchstens ein Gedankenstrich pro Text. Die Stimme des
  Wächters ist trocken und wortkarg.

## Regeln
- **Platzhalter** wie `{n}`, `{name}` oder `{count}` exakt übernehmen, gleiche Menge wie in `en`. Der Guard `qa2-ui-i18n` prüft das.
- **Namen** von Items, Monstern, Zonen und Figuren so schreiben, wie deine Datei sie schon führt (Schlüssel `...:name`), damit Text
  und Name zusammenpassen. Neue Beschreibungen nennen Namen in der Form deiner Datei.
- **Längen:** UI-Labels nicht länger als nötig, bei 1366×768 ist es eng. Beschreibungen etwa so lang wie EN.
- **zh:** vereinfachtes Chinesisch, chinesische Satzzeichen in voller Breite (，。：！？), Zahlen arabisch.
- **ru:** korrekte Pluralformen bei Zahlen-Platzhaltern. Wenn der Text nur eine Form erlaubt, eine neutrale Konstruktion wählen
  (z. B. „Предметов: {n}“).
- **Kein git add, kein Commit.**
- **Zeitmarker:** Je Datei EIN Kommentar `// claude:<Zeitstempel> Textpass 1.4 Sprachwelle (<lang>)` am neuen Block. Den
  Zeitstempel per `date "+%Y-%m-%dT%H:%M:00+02:00"` holen, NIE schätzen.
- **Am Ende:**
  - `npx vitest run` in `packages/content` (direkt im Paket, nicht über turbo). Der Test „jedes lokalisierbare Content-Feld trägt
    …“ bleibt rot, bis ALLE fünf Sprachen fertig sind. Prüfe, dass in seiner Liste KEIN Eintrag mehr für deine Sprache steht.
  - `npx vitest run` und `npx tsc --noEmit` in `apps/client`. `qa2-ui-i18n` muss für deine Sprache grün sein.
- **Wenn eine Sitzung nicht reicht:** Reihenfolge UI-Liste → geänderte Content-Texte → neue Item-Beschreibungen. Sauber an einer
  Grenze aufhören und den Rest nennen (Anzahl offener Schlüssel).

## Rückmeldung
- Anzahl übersetzter Schlüssel (UI, Content geändert, Content neu)
- Slayer- und Anrede-Umstellungen (Anzahl und Beispiele)
- Unsicherheiten und offene Fragen
