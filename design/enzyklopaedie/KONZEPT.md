# Enzyklopädie — Konzept

Auftrag (Chef, wörtlich): "Ein Konzept und Mockup HTML für eine Enzyklopädie. Ich möchte oben in
der Top bar ganz oben rechts ein großes Fragezeichen-Symbol haben, rechts neben Achievements. Dann
soll ein Modal aufgehen, das fast so groß ist wie der aktuelle Screen, dynamisch skaliert, und da
hat man dann Kategorien, wo alle Items einsortiert sind, und oben eine Suche, um direkt Items zu
suchen — damit man so sofort zu Items und ihrem Wiki-Eintrag kommt."

Dieses Dokument + `mockup.html` sind reine Planung. Es wird nichts ins Spiel eingebaut, kein
Code in `apps/client` oder `packages/**` verändert.

---

## 1. Bestandsaufnahme — was schon da ist und wörtlich übernommen wird

Bevor irgendetwas entworfen wurde, wurde der bestehende Code gelesen. Die Enzyklopädie ist **kein**
neues Subsystem, sondern eine dünne Index-Schicht über drei Dingen, die es alle schon gibt:

| Baustein | Datei | Was er beiträgt |
|---|---|---|
| Item-Wiki-Modal | `apps/client/src/renderer/components/ItemWikiModal.tsx` | Die volle Detailansicht eines Items (Quellen, Verwendungen, Kernwerte, Beschreibung). Wird über `openItemWikiModal(itemId)` geöffnet — ein modulweiter Mini-Store (Zeilen 552–599), kein Context. |
| Item-Kategorisierung + Suche | `apps/client/src/renderer/items.ts` | `FILTER_CATEGORIES` (Zeile ~121: weapons/armor/tools/food/potions/materials), `filterCategoryOf(itemId)`, `itemMatchesSearch(itemId, query, tr)`, `rarityClass(rarity)`, `getItemImage(itemId)`. Exakt die Kategorien, die Bank und Charakter-Inventar heute schon zeigen. |
| Wiederverwendbare Filterleiste | `apps/client/src/renderer/components/ItemFilterBar.tsx` | `ItemFilterSearch` + `ItemFilterChips` — Suchfeld und Kategorie-Chips als fertige Komponenten, inkl. Treffer-Zähler pro Kategorie (`counts`-Prop). Schon heute von Bank/Charakter-Inventar genutzt. |
| Entdeckt-Logik | `packages/shared/src/inventory.ts:236` `isItemDiscovered(state, itemId)` | Monotoner Bool (`state.discoveredItems`), wird nie wieder zurückgesetzt. Genau die Wahrheit, die Bestiarium/Item-Wiki heute für "???"-Silhouetten nutzen. |
| Layout-Vorbild "fast bildschirmgroßes, dynamisch skalierendes Modal" | `apps/client/src/renderer/styles/item-wiki.css:14` `.modal.iwk-modal` | `width: min(1440px, calc(100vw - 32px))`, `max-height: calc(100vh - 32px)`. Laut Code-Kommentar dort **bindend vom Chef abgenommen**: "passt bei 1366×768/1600×900/1920×1080 immer ohne Überlauf". Exakt der Vertrag, den die Enzyklopädie ebenfalls braucht — wird 1:1 übernommen, nicht neu erfunden. |
| Layout-Vorbild "Kategorie-Register + Liste" | `apps/client/src/renderer/styles/warden-ledger-achievements.css:86` `.achv-ledger-shell` | Der Warden Ledger (Erfolge-Seite) hat bereits genau die Struktur, die die Enzyklopädie braucht: linkes Kategorien-Register (`.achv-ledger-rail`, `.achv-ledger-cat`) + mittlere scrollende Liste, als 3-Spalten-Grid `clamp(196px,14vw,244px) minmax(390px,1fr) clamp(300px,22vw,382px)`. Wird als Vorbild für Register + Raster übernommen (dort ohne die dritte Detail-Spalte, s. §4). |
| Item-Karten-Optik | `apps/client/src/renderer/styles/shop.css:340` `.shopv2-card` | Holz-9-Slice-Rahmen (`wooden_frame_with_corners_seamless.webp`) + `bg_black.webp`-Textur, Bild zentriert oben, Name darunter, Raster `repeat(auto-fill, minmax(180px, 1fr))`, Rarity als dünner Innen-Ring (`box-shadow: inset 0 0 0 2px var(--rar-*)`) — **kein Glow auf Ausrüstung** (Studio-Regel). Wird 1:1 als Kartenformat der Enzyklopädie übernommen. |
| Standard-Buttons | `apps/client/src/renderer/styles/design-system.css:520` `.btn-iron`, Zeile 564 `.btn-iron--sm` | Primärknopf (Eisenrahmen). Sekundär: `.shop-citadel-btn` (Tabs/Filter, z.B. Bestiarium-Reiter). |
| ESC-Priorität | `apps/client/src/renderer/util/escStack.ts` | Zentrale Registry, mehrere `"modal"`-Overlays dürfen gleichzeitig offen sein; Escape schließt das zuletzt registrierte zuerst (LIFO). Wichtig für §3. |

Nichts davon wird neu gebaut. Die Enzyklopädie fügt **eine Indexschicht** hinzu: Kategorie-Register
+ Suche + Kartenraster, deren Klick-Ziel die bereits vorhandene `openItemWikiModal(itemId)` ist.

---

## 2. Verhältnis zu bestehenden Ansichten (die Abgrenzung, die der Chef beim letzten Mal vermisst hat)

**Die Enzyklopädie ist ein Index, kein zweites Wiki.** Sie rendert selbst keine Item-Detailinhalte
(keine Quellen-Liste, keine Verwendungen, keine Kernwerte-Kacheln — das bleibt exklusiv
`ItemWikiModal.tsx`). Ein Klick auf eine entdeckte Item-Karte ruft direkt `openItemWikiModal(itemId)`
auf, dieselbe Funktion, die heute schon vom "?"-Knopf im Item-Tooltip und von Bestiarium-Beute-Zeilen
aufgerufen wird (`BestiaryPage.tsx:606` `onClick={() => openItemWikiModal(roll.itemId)}`).

**Stacking statt Ersetzen.** `escStack.ts` erlaubt ausdrücklich mehrere gleichzeitig offene
`"modal"`-Overlays (LIFO-Schließreihenfolge). Die Enzyklopädie nutzt das: Sie bleibt beim Öffnen
eines Items **gemountet**, das Item-Wiki-Modal legt sich als eigenes, ebenfalls fast bildschirmgroßes
Overlay darüber. Ein Escape (oder Klick auf das Wiki-eigene Schließkreuz) schließt **nur das Wiki**
und die Enzyklopädie erscheint exakt so wieder, wie sie verlassen wurde — Suchtext, gewählte
Kategorie und Scrollposition bleiben erhalten, ohne dass dafür eigens State gerettet werden müsste.
Das ist derselbe Mechanismus, den das Item-Wiki intern schon für Sprünge zwischen Items nutzt
(`ItemWikiModal.tsx:575` `history`-Stack), nur eine Ebene höher — kein neues Interaktionsmuster,
sondern dieselbe Regel ein zweites Mal angewendet.

**Bestiarium bleibt eigenständig.** Der Auftrag ist wörtlich Item-bezogen ("alle Items einsortiert",
"zu Items und ihrem Wiki-Eintrag") — Monster haben mit dem Bestiarium (`BestiaryPage.tsx`) bereits
eine vollwertige, sehr aufwendige eigene Seite (Zonen-Bänder, Kulissen, Kill-Leitern, Champion-Kodex)
mit eigenem Top-Bar-Knopf. Die Enzyklopädie dupliziert das nicht. MVP-Scope ist **ausschließlich
Items**. Ob später eine zweite oberste Registerkarte "Bestiarium" ergänzt wird, die letztlich nur
zum bestehenden Bestiarium verlinkt, ist offene Frage §8.4 — die Registerkarten-Architektur unten
(§4) ist bewusst so gebaut, dass eine solche Erweiterung später ohne Redesign möglich wäre, ohne sie
jetzt schon zu bauen.

**Achievements bleiben eigenständig.** Der Fragezeichen-Knopf sitzt *neben* dem
Achievements-Knopf, nicht anstelle. Zwei getrennte Ziele, zwei getrennte Modals.

**Verhältnis zur alten `ItemBrowserPage.tsx`:** Diese Seite ist ausdrücklich ein **Dev-Tool**
("Dev Tool — N / M items"-Badge, rohes JSON, englischsprachig, kein `t()`/`tr()`) und war laut
`navigation.ts:151`-Kommentar ohnehin schon aus der Sidebar entfernt. Sie ist kein Vorbild für
Spieler-Text oder -Optik, wohl aber strukturell ein Beleg dafür, dass ein Suchfeld + Kategorie-Filter
+ Liste über den **gesamten** Item-Katalog in dieser App längst ungefiltert (ohne Virtualisierung)
gerendert wird, ohne Performance-Probleme (s. §7).

---

## 3. Einstiegspunkt in der Top Bar — exakte Stelle

Datei: `apps/client/src/renderer/components/TopBar.tsx`, Zeilen 23–58 (der zurückgegebene
`<nav className="topbar">`). `navigation.ts` hat Achievements als **letzten** Eintrag in
`topBarPages` (Zeile 170) — der neue Knopf muss visuell rechts danach sitzen und darf dabei
**nicht** Teil der horizontal scrollenden `topBarPages.map(...)`-Reihe werden: die Top Bar hat
`overflow-x: auto` (topbar.css Zeile 74) für schmale Fenster — ein reiner `topBarPages`-Eintrag
könnte bei 1366×768 unter Umständen aus dem sichtbaren Bereich scrollen. Das widerspräche der
Kern-Anforderung "dynamisch skaliert, funktioniert bei kleinen Auflösungen".

Empfohlene Umsetzung (nicht gebaut, nur beschrieben): `TopBar.tsx`s `<nav>` wird in einen neuen
Flex-Wrapper gefasst, der Fragezeichen-Knopf als **nicht scrollendes Geschwister** direkt danach:

```tsx
return (
  <div className="topbar-row">
    <nav className="topbar" aria-label={t("common.topNav")}>
      {/* …unverändert: topBarPages.map(...) … */}
    </nav>
    <button
      type="button"
      className="topbar-help-btn"
      onClick={() => openEncyclopediaModal()}
      aria-label={t("encyclopedia.openAria")}
      title={t("encyclopedia.openAria")}
    >
      <span aria-hidden="true">?</span>
    </button>
  </div>
);
```

Neues CSS (eigene Datei, s. §9): `.topbar-row { display:flex; align-items:stretch; }`,
`.topbar { flex:1 1 auto; min-width:0; }` (die Nav-Zeile bekommt keine feste Breite mehr
vorgegeben, verhält sich sonst unverändert), `.topbar-help-btn { flex:0 0 auto; }`. Damit bleibt der
Fragezeichen-Knopf **immer** am echten rechten Rand sichtbar, auch wenn die Nav-Reihe selbst
scrollen muss — und sitzt bei normaler Fensterbreite optisch direkt rechts neben Achievements,
exakt wie beauftragt. `App.tsx` muss dafür nicht angefasst werden (Zeile 975 `<TopBar .../>`
bleibt unverändert, die Höhen-Ziehlogik der `.topbar-area` — App.tsx Zeilen 908–967 — bezieht sich
auf den Gesamt-Wrapper und bricht durch eine interne Umstrukturierung von `TopBar.tsx` nicht).

Mount-Stelle für das neue Overlay: `App.tsx`, direkt neben den bestehenden Overlay-Mounts
(Zeilen 1164–1165 `<ItemTooltipOverlay />` / `<ItemWikiModalOverlay />`) — eine dritte Zeile
`<EncyclopediaModalOverlay />`, exakt demselben Muster folgend (modulglobaler Store,
`registerEscCloser("modal", closeEncyclopediaModal)` in einem `useEffect`, wie
`ItemWikiModal.tsx:618`).

**Icon-Frage (offen, s. §8.1):** Für das große "?"-Symbol selbst gibt es noch **kein** über
`getUiIcon()` auffindbares Asset — `getUiIcon` liest ausschließlich aus
`apps/client/src/renderer/assets/icons/*.{png,webp}` (Auto-Discovery, `uiIcons.ts`). Ein
brauchbares "?"-Icon liegt zwar bereits im Rohmaterial-Ordner
`apps/client/src/renderer/assets/ui/citadel/box-quest-commune/icon_question.webp` (Teil des
Citadel-UI-Packs, aktuell nirgends im Code referenziert), müsste für `getUiIcon("icon_question")`
aber zusätzlich (oder per Kopie) unter `assets/icons/` liegen. Bis dahin trägt der Mockup einen
reinen Text-"?" in Cinzel/Gold (dieselbe Optik wie der `.itip-wiki-btn` im Item-Tooltip,
`components.css:804`, der ebenfalls nur ein Zeichen ist, kein Icon-Bild) — funktioniert ohne
Asset-Lieferung, ein echtes gemaltes Symbol wäre aber stimmiger. Siehe Steam-Studio-Notiz zum
"?"-Knopf im Item-Tooltip: laut `components.css:835` Kommentar wurde genau dieser kleine "?"-Knopf
von Spielern laut Reddit-Feedback kaum gefunden — ein GROSSES, prominentes Top-Bar-Symbol ist die
plausible Antwort darauf, sollte also bewusst nicht wieder klein/unauffällig werden.

---

## 4. Aufbau des Modals

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Zurück-Slot, leer]      ENZYKLOPÄDIE (Kicker)         [Schließen ✕]   │  .encp-titlebar (wie .iwk-titlebar)
├─────────────────────────────────────────────────────────────────────────┤
│  🔍 [Suchfeld: Item suchen…]                    „34 von 261 Items"      │  .encp-search-row
├───────────────┬───────────────────────────────────────────────────────┤
│  KATEGORIEN   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  ▪ Alle  (261)│  │ Karte  │ │ Karte  │ │ Karte  │ │ Karte  │  …        │  .encp-rail | .encp-grid
│  ▪ Waffen (78)│  └────────┘ └────────┘ └────────┘ └────────┘          │  (Grid scrollt intern)
│  ▪ Rüstung(64)│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  ▪ Werkzeug(9)│  │ Karte  │ │ Karte  │ │ Karte  │ │ Karte  │  …        │
│  ▪ Nahrung(22)│  └────────┘ └────────┘ └────────┘ └────────┘          │
│  ▪ Tränke (14)│                          …                             │
│  ▪ Material(74)│                                                       │
└───────────────┴───────────────────────────────────────────────────────┘
```

Zwei Spalten, nicht drei wie beim Item-Wiki — die Enzyklopädie braucht keine dritte
Detail-Spalte, weil ein Klick auf eine Karte direkt das (bereits existierende) Item-Wiki-Modal
öffnet (§2). Das hält das Modal bei 768px Höhe deutlich atmungsaktiver als ein drittes Panel es
erlauben würde.

- **Titelleiste** (`~56px`): 1:1 das `.iwk-titlebar`-Muster (drei Flex-Spalten, Kicker mittig,
  `.modal-close.ds-close-button` rechts). Der linke Slot bleibt hier leer (kein "Zurück" nötig,
  es gibt keine interne Navigationshistorie).
- **Suchzeile** (`~52px`): Suchfeld im `.invf-search`-Look (`ItemFilterBar.tsx`), links ein
  Lupen-Icon (`getUiIcon("icon_ach_search")`, existiert bereits — dieselbe Lupe, die die
  Achievements-Seite schon für ihr Suchfeld nutzt), rechts ein Live-Treffer-Zähler
  ("34 von 261 Items"). Kein Sortier-Dropdown, keine weiteren Werkzeuge — der Auftrag ist
  "eine Suche", keine Werkzeugkiste.
- **Kategorie-Register** (`clamp(180px, 13vw, 226px)`, wie `.achv-ledger-rail`): "Alle" + die
  sechs bestehenden `FILTER_CATEGORIES` (Waffen/Rüstung/Werkzeuge/Nahrung/Tränke/Materialien —
  aus `items.ts`, identisch zu Bank/Inventar, keine neue Taxonomie). Jeder Eintrag trägt eine
  Trefferzahl rechts (`.achv-ledger-cat strong`-Muster), die sich **live mit der Suche mitändert**
  (tippt man "schwert", zeigt "Waffen (6)" sofort die gefilterte Zahl, nicht die Gesamtzahl der
  Kategorie — dieselbe `counts`-Prop, die `ItemFilterChips` schon unterstützt).
- **Kartenraster** (Rest der Breite): `.shopv2-card`-Format, Raster
  `repeat(auto-fill, minmax(148px, 1fr))` (etwas enger als Shop-Karten, damit bei 1366px
  Modalbreite mehr Spalten passen). Jede Karte: Bild (`getItemImage`, Emoji-Fallback über
  `item.icon`), Name (2-Zeilen-Umbruch, nie clippen — s. §6.3), dünner Rarity-Innen-Ring.

---

## 5. Kategorienbaum

Übernommen 1:1 aus `items.ts` `FILTER_CATEGORIES` — **keine neue Taxonomie erfunden**, dieselben
sechs Kategorien, die Bank und Charakter-Inventar dem Spieler bereits zeigen (Wiedererkennungswert):

```
Alle
├─ Waffen     (item.type === "equipment" mit weaponStyle)
├─ Rüstung    (item.type === "equipment" ohne weaponStyle)
├─ Werkzeuge  (item.type === "tool")
├─ Nahrung    (item.type === "consumable", kein Herblore-Rezept-Output)
├─ Tränke     (item.type === "consumable", Herblore-Rezept-Output)
└─ Materialien (item.type === "material" + unbekannter Fallback)
```

`filterCategoryOf(itemId)` (items.ts) liefert das bereits fertig — keine Zweitimplementierung nötig.

Eine **zweite Filterebene** (z. B. nach Waffenart/Ausrüstungs-Slot innerhalb "Waffen") wäre denkbar,
sobald eine Kategorie sehr groß wird (Waffen allein dürften über 70 Einträge haben, über alle
Tier-Stufen hinweg) — bewusst **nicht** Teil dieses Entwurfs (offene Frage §8.2). Die Suche deckt
den unmittelbaren Bedarf ("ich weiß, wie das Item heißt") ohnehin ab; die zweite Filterebene wäre
nur für reines Stöbern relevant.

**Sortierung innerhalb einer Kategorie:** Empfehlung ist eine Tier-Reihenfolge (Seltenheit
aufsteigend, bei Gleichstand nach `item.value` aufsteigend), nicht alphabetisch — ein
alphabetisches Sortieren nach Anzeigename würde bei **unentdeckten** Items ihre Position im
Alphabet verraten (kleiner Spoiler: "es beginnt mit A–C"), obwohl der Name selbst maskiert bleibt.
Eine Sortierung nach Seltenheit/Wert ist spoilerfrei UND liest sich wie ein echtes Nachschlagewerk
("schwaches Zeug zuerst, das große Ding zum Schluss") — passt zur bestehenden Itemization-Logik des
Spiels (Tier-Stufen). Bleibt aber offene Chef-Entscheidung (§8.3).

---

## 6. Suchverhalten

- **Live-Filter**, kein Enter nötig — jede Eingabe filtert sofort (dieselbe `itemMatchesSearch`-
  Funktion wie in `items.ts`, die schon Bank/Inventar nutzen: matcht Item-ID **oder** lokalisierten
  Namen der aktuellen Sprache, case-insensitive).
- **Suche überschreibt die Kategorie nicht, sie kombiniert sich mit ihr**: Suchtext filtert
  innerhalb der gerade gewählten Kategorie (Standard "Alle"). Das Register zeigt dabei live die
  gefilterte Trefferzahl je Kategorie (s. §4) — wechselt der Spieler während der Suche die
  Kategorie, bleibt der Suchtext stehen, nur das Kartenraster wechselt die Teilmenge. Das
  vermeidet die verwirrende Alternative "Suche springt aus der Kategorie heraus".
- **Unentdeckte Items matchen weiterhin, verraten aber nichts**: Ein Treffer auf ein noch nie
  besessenes Item taucht ganz normal in der gefilterten Liste auf, seine Karte bleibt aber maskiert
  (Silhouette + "???", s. §6.3) — es wird nie Name oder Bild bei einem Suchtreffer aufgedeckt, nur
  die Tatsache "es gibt hier etwas, das zu deiner Eingabe passt" (wie ein Karteikasten mit
  verdeckten Karten). Kein Sonderfall nötig: das Rendering einer Karte ist ohnehin discovery-gated,
  unabhängig davon, ob sie über Kategorie oder Suche in die sichtbare Liste kam.
- **Kein Treffer:** Freundlicher Leertext statt einer stummen leeren Fläche (Vorbild:
  `t("itemwiki.noSource")`/`t("itemwiki.noUsedFor")`-Textbausteine im Item-Wiki) — z. B.
  "Kein Eintrag gefunden. Versuch einen anderen Suchbegriff." Ein Knopf "Suche leeren" daneben
  (`.btn-iron--sm`).

---

## 7. Zustände

1. **Normalzustand** (Modal frisch geöffnet): Kategorie "Alle" aktiv, kein Suchtext, Raster zeigt
   den gesamten Katalog (entdeckt normal, unentdeckt maskiert) in Tier-Reihenfolge.
2. **Kein Treffer** (Suche ohne Ergebnis): s. §6, eigener Leertext statt leerem Raster.
3. **Unentdecktes Item** (Karte im Raster): Silhouette-Bild (dasselbe Muster wie
   `BestiaryPage.tsx` `LootRow`s `mysteryFace` — echtes Item-Bild, aber `bjw-loot-silhouette`
   gefiltert/abgedunkelt + großes "?"-Abzeichen darüber) statt Klarbild, Name "???" statt
   Klarname, **kein** Rarity-Ring (der würde die Seltenheitsstufe verraten). Klick öffnet **nicht**
   das Item-Wiki (dort gäbe es ohnehin nichts Sinnvolles zu zeigen — keine Quellen-Liste für ein
   Item, das der Spieler noch nie besessen hat, macht erst recht keinen Sinn) — stattdessen ein
   kurzer, nicht-modaler Hinweis direkt auf der Karte (dieselbe Rolle wie
   `t("bestiary.undiscovered")` im Bestiarium), z. B. "Noch nicht entdeckt." Das ist bewusst
   symmetrisch zur Bestiarium-Philosophie: unentdeckte Einträge werden **gezeigt** (Vollständigkeits-
   Reiz, "wie viele fehlen mir noch"), aber nie mit tatsächlichem Inhalt.
4. **Leerer Suchtext, aber Kategorie mit 0 Einträgen** kommt bei den sechs bestehenden Kategorien
   real nicht vor (jede hat heute Dutzende Einträge) — kein eigener Zustand nötig, nur erwähnt für
   Vollständigkeit.

---

## 8. Performance bei großem Katalog

Der Katalog ist groß (110 Monster — hier irrelevant, reines Item-Scope — mehrere hundert Items).
Das Spiel tickt mit 10 Hz; ein Modal darf das nicht ausbremsen. Drei konkrete Vorkehrungen, alle
bereits als Muster **anderswo in dieser Codebase** bewiesen, keine neue Bibliothek nötig:

1. **Keine 10-Hz-Kopplung der Liste.** `ItemWikiModal.tsx` isoliert seinen einzigen
   `useGameState()`-Verbrauch bewusst in einer eigenen `SourceList`-Komponente (Kommentar dort,
   Zeile 302 ff.: "sonst bliebe die Overlay-Komponente selbst dauerhaft im 10-Hz-Takt"). Die
   Enzyklopädie übernimmt dasselbe Prinzip: Suchfeld, Kategorie-Register und Raster-Layout
   abonnieren gar keinen Live-State. Nur eine winzige `<DiscoveryBadge itemId>`-Unterkomponente
   pro sichtbarer Karte fragt `isItemDiscovered` ab — per `useGameSelector` (schon in
   `TopBar.tsx:21` fürs Quest-Claim-Pünktchen bewiesen: rendert nur bei echter Änderung des
   booleschen Ergebnisses neu, nicht bei jedem Tick). `discoveredItems` ändert sich in der Praxis
   extrem selten während das Modal offen ist — die Kopplung ist also fast immer inaktiv.
2. **Kategorie zuerst, dann Suche, dann rendern.** Genau wie `ItemBrowserPage.tsx`/`BankPage`/
   `CharacterPage` es heute schon tun: erst `filterCategoryOf` einschränken, dann `itemMatchesSearch`
   anwenden, erst danach die (deutlich kleinere) Trefferliste rendern. Ein String-`includes()`
   über ein paar hundert Einträge pro Tastendruck ist in dieser App bereits mehrfach im
   Produktivbetrieb erprobt (Bank-/Inventar-Suchfeld).
3. **Kein Virtualisierungs-Paket nötig.** Im Projekt ist aktuell keine Virtualisierungs-
   Bibliothek installiert (`react-window`/`react-virtual` — geprüft, nicht vorhanden), und sie wird
   für diesen Umfang auch nicht gebraucht: `ItemBrowserPage.tsx` rendert schon heute den **kompletten**
   Item-Katalog ungefiltert als flache `filtered.map(...)`-Liste, ohne Performance-Beschwerde. Für
   zusätzliche Sicherheit `content-visibility: auto` auf die Karten (etabliertes Muster u. a. in
   `bestiary.css`, `achievements.css`, `character.css`, `skills.css`, `combat.css`, `pages.css` —
   spart Layout/Paint für Karten außerhalb des sichtbaren Bereichs, ohne JS-Overhead). Bilder
   durchgehend `loading="lazy" decoding="async"` (App-weite Konvention). Sollte sich in der Praxis
   doch ein messbares Ruckeln zeigen, ist eine Virtualisierung ein reiner Nachrüst-Schritt — kein
   Grund, sie vorab einzubauen.

---

## 9. Dynamische Skalierung — 1366×768 und 1600×900 im Detail

Modal-Geometrie ist die **exakt gleiche Formel** wie das bereits Chef-abgenommene
`.modal.iwk-modal` (§1): `width: min(1440px, calc(100vw - 32px))`,
`max-height: calc(100vh - 32px)`, der äußere Rahmen selbst scrollt nicht — nur die inneren
Bereiche (`overflow-y: auto` auf Register und Raster separat, wie `.iwk-source-list`/`.iwk-stage`).

| Auflösung | Modalbreite | Modalhöhe | Sichtbare Kartenspalten (Raster ≈ 148px/Karte) |
|---|---|---|---|
| 1366×768 | 1334px | 736px | Register ≈ 210px ab → ≈ 1080px Rasterbreite → 6–7 Spalten |
| 1600×900 | 1440px (gedeckelt) | 868px | Register ≈ 210px ab → ≈ 1186px Rasterbreite → 7 Spalten |
| 1920×1080 | 1440px (gedeckelt) | 1048px | identisch zu 1600×900, nur mehr Zeilen sichtbar |

Bei 768px Höhe bleiben nach Titelleiste (~56px) und Suchzeile (~52px) rund 628px für Register +
Raster — genug für alle 7 Register-Einträge ohne eigenes Scrollen (7 × ~42px ≈ 294px) und für
gut zwei Kartenreihen im Raster, bevor dessen eigener Scrollbalken greift. Nichts an der
Titelleiste/Suchzeile wird durch fehlenden Platz beschnitten — beide sind Ein-Zeilen-Leisten mit
fester Höhe, kein Umbruchrisiko.

Unterhalb von ~1024px **Modalbreite** (nicht Fensterbreite — durch die 1440px-Deckelung tritt das
in der Praxis nur bei sehr schmalen In-Game-Fenstern auf, nicht bei den zwei Zielauflösungen)
klappt das Register zu einer horizontalen Icon-only-Leiste über dem Raster um — dasselbe Muster,
das die Top Bar selbst unter 800px schon nutzt (`topbar.css:335` `@media (max-width: 800px)`,
Labels verschwinden, nur Icons + `title`-Tooltip bleiben). Das ist reine Vorwärts-Absicherung, bei
1366×768/1600×900 nie sichtbar — wird im Mockup nicht extra vorgeführt, um den Fokus nicht zu
verwässern.

---

## 10. Sieben Sprachen — Umbruch statt Kappung

RU und DE sind die langen Sprachen. Der Konzept-Vertrag ist derselbe, den `header-charinfo-name`
und `iwk-source-name` bereits durchsetzen (Kommentare dort ausdrücklich: *"Mindestgröße + Umbruch,
nie clippen"*): Register-Labels und Kartennamen dürfen **umbrechen**, niemals mit Ellipsis oder
hartem Schnitt gekürzt werden. Konkret:

- Register-Zeile: Grid `icon(26px) minmax(0,1fr) counter(auto)` wie `.achv-ledger-cat` — das
  Label darf zweizeilig werden, die Zeilenhöhe wächst mit statt Text zu verlieren.
  `overflow-wrap: anywhere` + `hyphens: auto` (mit gesetztem `<html lang>`) für Sprachen ohne
  natürliche Wortgrenzen im Kompositum (exakt wie `iwk-source-name`, Kommentar dort:
  *"ungebrochene deutsche Monster-Komposita"* — dasselbe Problem träte bei RU-Itemnamen auf).
  Im Mockup sichtbar an einer echten Beispielübersetzung: `adamantium_platebody` heißt auf
  Russisch **"Латный нагрудник из адамантия"** (spürbar länger als "Adamantium Platebody") — die
  Karte im RU-Sprachzustand zeigt genau diesen Namen zweizeilig, ohne Überlauf.
- Kartenname im Raster: `min-height: 2.4em` (Platz für zwei Zeilen reserviert, wie
  `.shopv2-card-name`s `min-height: 2.5em`) statt harter `white-space: nowrap`.
- Titelleisten-Kicker "ENZYKLOPÄDIE": kurz genug in allen sieben Sprachen (Vergleichswert:
  "Достижения" für Achievements ist die längste bekannte kyrillische Nav-Beschriftung dieser
  Größenordnung) — kein Sonderfall nötig.

---

## 11. Vorgeschlagene i18n-Schlüssel (nicht implementiert — nur Vorschlag für die Umsetzung)

Neue Schlüssel unter dem Präfix `encyclopedia.*`, müssten bei Umsetzung in **beiden**
`translations.ts`-Objekten (`const en = {…}` / `const de = {…}`) UND in allen fünf
`i18n/locales/*.ts`-Dateien (zh/ru/es/ptBR/fr) ergänzt werden — `tsc` erzwingt die EN/DE-Parität
über `Record<keyof typeof en, string>`, die übrigen fünf Sprachen fehlen sonst nur lokal, nicht als
Compile-Fehler (Vorsicht: nicht vergessen, wie im Projektgedächtnis vermerkt).

```
encyclopedia.openAria       "Enzyklopädie öffnen"
encyclopedia.kicker         "ENZYKLOPÄDIE"
encyclopedia.searchPlaceholder  "Item suchen…"
encyclopedia.resultCount    "{n} von {total} Items"
encyclopedia.noResults      "Kein Eintrag gefunden. Versuch einen anderen Suchbegriff."
encyclopedia.clearSearch    "Suche leeren"
encyclopedia.undiscovered   "Noch nicht entdeckt."
```

Kategorie-Labels brauchen **keine** neuen Schlüssel — `inv.filter.all/weapons/armor/tools/food/
potions/materials` existieren bereits in allen sieben Sprachen (`ItemFilterChips`).

---

## 12. Offene Chef-Entscheidungen

1. **"?"-Icon-Asset.** Reicht ein reines Text-"?" (Cinzel/Gold, wie der kleine `.itip-wiki-btn`
   im Tooltip) für den großen Top-Bar-Knopf, oder soll ein gemaltes Symbol geliefert werden
   (Rohmaterial `icon_question.webp` liegt bereits im Citadel-Pack, müsste nur nach
   `assets/icons/` kopiert/dupliziert werden, damit `getUiIcon()` es findet)?
2. **Zweite Filterebene je Kategorie** (z. B. Waffenart/Ausrüstungs-Slot innerhalb "Waffen", bei
   ~70+ Einträgen). MVP-Vorschlag: weglassen, Suche deckt das ab. Chef-Entscheidung, falls
   "Waffen (78)" in der Praxis als zu unübersichtlich empfunden wird.
3. **Sortierung innerhalb einer Kategorie:** Tier-Reihenfolge (Rarity → Wert, spoilerfrei,
   empfohlen) vs. alphabetisch (vertrauter, aber verrät die Alphabet-Nachbarschaft unentdeckter
   Items).
4. **Soll es später eine zweite Registerkarte "Bestiarium" geben**, die im selben Modal sitzt,
   aber inhaltlich nur ins bestehende `BestiaryPage` verlinkt/springt (kein Duplikat)? Aktuell:
   nein, MVP ist reiner Item-Scope, wie wörtlich beauftragt. Architektur unten so gehalten, dass
   das später ohne Redesign nachrüstbar wäre.
5. **Trefferzahl-Anzeige** ("34 von 261 Items") — gewünscht, oder zu "dev-tool-artig"
   (`ItemBrowserPage.tsx` hat genau diesen Text als "Dev Tool"-Badge, s. §2)? Vorschlag: als
   dezente Randnotiz behalten, nicht als auffälliges Badge — im Mockup entsprechend klein gehalten.
6. **Reihenfolge unentdeckter Items:** bleiben sie an ihrer natürlichen Tier-Position (maskiert,
   wie hier vorgeschlagen) oder wandern sie ans Ende der jeweiligen Kategorie? Vorschlag: natürliche
   Position (konsistent mit der Bestiarium-Philosophie, wo unentdeckte Monster ebenfalls an ihrer
   Level-Position im Zonen-Band bleiben, nicht ans Ende rutschen).

---

## Dateien

- `design/enzyklopaedie/KONZEPT.md` — dieses Dokument.
- `design/enzyklopaedie/mockup.html` — interaktives HTML-Mockup, referenziert echte Assets/Klassen
  aus `apps/client/src/renderer/` per relativem Pfad (`../../apps/client/src/renderer/...`). Direkt
  im Browser öffnen, kein Build nötig. Zustände über die Werkzeugleiste oben umschaltbar (Auflösung,
  Sprache, Leer-/Kein-Treffer-/Unentdeckt-Zustand).
