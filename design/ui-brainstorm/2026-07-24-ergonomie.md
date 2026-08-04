# UI-Brainstorm 24.07.2026 — Perspektive: Ergonomie & Navigation

**Methodik:** Reiner Code-Audit von `apps/client/src/renderer` (Pages, Sidebar, TopBar, Modals,
`navigation.ts`, `onboarding-steps.ts`, `areaTourSteps.ts`, `translations.ts`). Kein `pnpm dev`/Electron
gestartet (Hard Rule „headless only" für UI-Dev) — jeder Befund ist stattdessen mit Datei/Zeile belegt,
keine Screenshots. Alle Vorschläge beziehen sich ausschließlich auf bereits existierende Features;
nichts Neues erfunden. Sidebar-Citadel-Look ist gesetzt und wird nicht angetastet. Der große
Onboarding-Umbau ist bewusst ein späterer Meilenstein — wo das unten berührt wird, sind die Vorschläge
bewusst klein (Registry-Einträge, keine neue Infrastruktur).

18 Befunde, gruppiert nach den sechs angefragten Blickwinkeln. Format je Eintrag: **Befund → Vorschlag
→ Aufwand (S/M/L) → Priorität (1–3)**.

---

## 1. Navigationswege & Klicktiefe

### 1.1 Hauptguide führt nie zu Combat, Shop, Bank, Mail oder Enchanting
**Befund:** `onboarding-steps.ts` (`ONBOARDING_STEPS`) klickt Schritt für Schritt jeden TopBar-Eintrag
(Bestiary, Mastery, Character, Companions, Achievements) und jeden Sidebar-Eintrag (Skills-Overview +
alle 12 Sammel-/Handwerks-Skills + Stats + Options) — und endet auf `topbar.quests`. Es gibt **keinen**
Schritt mit `guideId: "sidebar.combat"`, `"topbar.shop"`, `"topbar.bank"`, `"sidebar.enchanting"` oder
`"sidebar.mail"`. Die drei Bereichs-Touren, die genau diese Lücke eigentlich schließen sollen
(`areaTourSteps.ts`: `COMBAT_TOUR_STEPS`, `SHOP_TOUR_STEPS`, `BANK_TOUR_STEPS`) feuern nur beim
*eigenständigen* ersten Besuch dieser Seiten — der Hauptguide navigiert aber nie dorthin, ein Spieler,
der brav dem Guide bis zum Ende folgt, wird also nie durch sie hindurchgeführt. Er muss Combat/Shop/Bank
komplett selbst finden. Mail und Enchanting haben zusätzlich gar keine Tour (weder Haupt- noch
Bereichs-Guide) — für Enchanting gilt das umso mehr in Kombination mit Befund 3.3. Laut Memory ist
Kampf bewusst unvermeidbar/fundamental — genau der eine Bereich, den der geführte Rundgang nie anfasst.
**Vorschlag:** In `ONBOARDING_STEPS` vier bis fünf zusätzliche Einträge ergänzen: `sidebar.combat`
(direkt nach `sidebar.skills-overview`, vor den Sammel-Skills), `topbar.shop`, `topbar.bank` (analog zu
den bestehenden TopBar-Schritten), `sidebar.mail`. Reine Registry-Erweiterung nach exakt demselben
Muster wie die 20 bestehenden Zeilen — keine neue Guide-Logik.
**Aufwand:** S · **Priorität:** 1

### 1.2 Enchanting hat keinen Kontext-Einstieg vom Item aus
**Befund:** `EnchantingPage.tsx` startet immer mit `selectedRef = null` (Zeile 339) — die Item-Wahl
lebt komplett lokal auf der Seite, es gibt kein Deep-Link-Ziel wie `util/skillJump.ts` oder
`util/monsterJump.ts` (die genau für „von woanders zu einer vorausgewählten Karte springen" gebaut
wurden, z.B. Item-Wiki → Rezept/Kampfgebiet). Die Item-Tooltip-Aktionen in `CharacterPage.tsx`
(`invActions`, `pouchVariantActions`, Zeilen 151–199) bieten nur `equip`/`use`/`sell` — kein
„Verzaubern"-Eintrag, obwohl `ItemAction` genau für so einen Button gebaut ist. Ein Spieler, der gerade
ein verzauberbares Item in der Hand hat, hat keinen kontextuellen Weg zum Altar — er muss wissen, dass
„Enchanting" existiert, es in der Sidebar unter Slayer finden (leicht zu übersehen, s. 2.1) und das Item
dort ein zweites Mal aus einer eigenen Liste heraussuchen.
**Vorschlag:** Einen `enchant`-Eintrag in `invActions`/`pouchVariantActions` ergänzen, der (analog
`skillJump`) ein `enchantJump`-Modul mit der Ziel-`instanceId`/`itemId` befüllt; `EnchantingPage`
konsumiert das beim Mount und preselektiert `selectedRef`. Gleiches Muster, nur ein drittes Ziel.
**Aufwand:** M · **Priorität:** 2

### 1.3 Quests: Tab merkt sich nichts, Claim-Punkt ist unspezifisch
**Befund:** `QuestsPage.tsx` Zeile 1128 wählt den Start-Tab nur einmalig lazy (`activeChronicleChapter
(...) ? "chronicle" : "daily"`) — der zuletzt betrachtete Tab (z.B. „Contracts", wo die meisten
Alltags-Quests hängen) wird nie persistiert, jeder erneute Seitenbesuch fällt zurück auf Chronik/Daily.
Andere Seiten persistieren genau solche UI-Vorlieben längst über `util/uiPrefs.ts`
(`getQueuePanelCollapsed`, `getBankSort`, `getBankFilterCat` …). Zusätzlich zeigt der Claim-Punkt in der
TopBar (`hasClaimableQuest`, Zeile 72–74) nur ein einziges Bit über *alle* Quests hinweg — ob eine
Chronik-, Contract- oder Daily-Quest wartet, muss der Spieler durch Aufklappen aller drei (vier mit
Shop) Tabs selbst herausfinden.
**Vorschlag:** (a) Letzten Tab in `uiPrefs.ts` persistieren (S). (b) Je Tab-Button in `.quests-tabs`
einen eigenen kleinen Claim-Punkt zeigen statt nur den einen globalen TopBar-Punkt — die Zähler-Badges
(`{claimedCount}/{total}`) sind an derselben Stelle bereits vorhanden, ein `claimable`-Bit pro Tab lässt
sich aus denselben `canClaimQuest`-Aufrufen ableiten (M).
**Aufwand:** S/M · **Priorität:** 2

---

## 2. Informationsarchitektur der Sidebar

### 2.1 Section-Labels existieren im Datenmodell, werden aber nie gerendert
**Befund:** `navigation.ts` modelliert die Sidebar weiterhin als `NavSection[]` mit eigenen Labels
(`nav.section.hero`, `nav.section.combat`, `nav.section.skills`, `nav.section.city`, `nav.section.other`)
— aber `getSidebarPages()` (Zeile 164–174) faltet das zu einer einzigen flachen Liste, und
`Sidebar.tsx` (`pages.map(...)`, Zeile 138) rendert diese Labels nirgends. Ergebnis: 15
gleichrangige Buttons in einer Spalte (Skills-Overview, Combat, 12 Skills, Enchanting) ohne jeden
visuellen Hinweis, dass Enchanting mechanisch etwas anderes ist als die zwölf XP-Skills darüber, oder
dass Combat/Skills-Overview eine eigene Kategorie bilden. Ein neuer Spieler sieht nur „eine lange
Buttonliste", keine Struktur.
**Vorschlag:** Einen dezenten Trenner/Sub-Header vor „Enchanting" (und optional vor Combat/
Skills-Overview) einziehen — visuell im bestehenden Ornament-Stil (z.B. die `◆`-Linie aus
`ShopPage.tsx SectionHead`, die exakt für sowas schon existiert), keine neue Sidebar-Optik nötig.
Nutzt die längst vorhandenen `section.label`-Strings, statt sie weiter tot im Code liegen zu lassen.
**Aufwand:** M · **Priorität:** 2

### 2.2 TopBar-vs-Sidebar-Grenze folgt keinem für den Spieler erkennbaren Prinzip
**Befund:** Die Kommentare in `navigation.ts` dokumentieren selbst mindestens zwei historische
Verschiebungen ohne stabile Regel: „Task #224: Shop/Bank hoch in die Top Bar, Statistics/Options
runter in die Sidebar" und „Task #274: Quests tauscht mit Skills-Overview". Das Ergebnis aus
Spielersicht: Companions (Pet-Galerie) sitzt in der TopBar direkt neben Character, aber Enchanting (ein
vergleichbares Ausrüstungs-System) sitzt in der Sidebar-Mitte; Mastery ist TopBar, Stats ist Sidebar;
Mail ist Sidebar-Footer. Es gibt keine erkennbare Faustregel wie „TopBar = Fortschritts-/Meta-Ansicht,
Sidebar = aktive Tätigkeit", an der sich ein Spieler orientieren könnte, wenn er ein Feature zum ersten
Mal sucht — die Aufteilung liest sich wie das Produkt einzelner Ad-hoc-Wünsche, nicht eines Plans.
**Vorschlag:** Eine explizite, dokumentierte Regel festlegen (Vorschlag: TopBar = „Ich checke das
gelegentlich" (Character/Companions/Mastery/Achievements/Bestiary), Sidebar = „Ich gehe dorthin, um
etwas zu TUN" (alle Skills inkl. Combat/Enchanting, plus Shop/Bank/Quests als tägliche Anlaufstellen))
und Shop/Bank/Quests probeweise in die Sidebar zurückziehen — das ist überwiegend eine
`placement`-Feld-Änderung in `navigation.ts`, kein Layout-Umbau. Braucht aber Chef-Entscheidung, da es
eingespieltes Vorwissen bei Bestandsspielern bricht.
**Aufwand:** M (Code) / Entscheidung nötig · **Priorität:** 2

### 2.3 Mail ist optisch App-Chrome, nicht Gameplay
**Befund:** `Sidebar.tsx SidebarFooter` rendert Save · Main Menu · **Mail** · Options · Quit als fünf
optisch identische kleine Icon-Buttons in einer Reihe (Zeilen 335–422). Vier der fünf sind reine
Programm-Aktionen (Speichern, Menü, Optionen, Beenden) — Mail ist die einzige mit echtem
Gameplay-Inhalt (Belohnungen, numerischer `mailCount`-Badge). Zwischen „Spiel beenden" und „Optionen"
eingeklemmt, sieht ein neuer Spieler eher App-Chrome als eine Feature-Seite mit Loot.
**Vorschlag:** Mail optisch von den vier reinen Chrome-Buttons absetzen (z.B. eigener Gold-Akzentrahmen
wie der TopBar-Claim-Punkt bei Quests) oder — konsequenter — als regulären Sidebar-Nav-Eintrag statt
Footer-Button führen. Kleinster Wurf: nur der visuelle Akzent.
**Aufwand:** S · **Priorität:** 3

---

## 3. Konsistenz von Interaktionsmustern

### 3.1 Drei verschiedene Mengen-Presets für dieselbe „Wie viele?"-Frage
**Befund:** Drei nahezu identische „wähle eine Stückzahl"-UIs im Spiel benutzen drei verschiedene
Zahlenreihen:
- Shop-Kauf: `BUY_QTYS = [1, 5, 25, 100]` (`ShopPage.tsx` Zeile 50)
- Shop-Verkauf (Detail-Panel): `sell1 / sell10 / sell100` (`ShopPage.tsx` Zeilen 496–499)
- Skill-Queue: `CRAFT_TARGET_PRESETS = [1, 25, 50]` + ∞ (`packages/shared/src/index.ts` Zeile 450,
  gerendert in `SkillPage.tsx` Zeile 1075)

Ein Spieler, der sich „10 und 100" beim Verkaufen einprägt, bekommt beim Kaufen „5 und 100" und beim
Queuen „25 und 50" — dieselbe Handbewegung („die zweitgrößte Zahl klicken") liefert je nach Seite eine
andere Größenordnung.
**Vorschlag:** Mindestens die beiden UI-seitigen Reihen (Kauf/Verkauf, beide in meinem Revier)
angleichen, z.B. einheitlich `[1, 10, 25, 100]`. `CRAFT_TARGET_PRESETS` liegt in `packages/shared` —
das müsste ich der CEO für eine engine-seitige Anpassung melden, falls eine volle Vereinheitlichung
gewünscht ist.
**Aufwand:** S (Shop-Teil) · **Priorität:** 2

### 3.2 Shift-Klick-Schnellaktion nur im Shop beworben
**Befund:** `ShopPage.tsx` zeigt sichtbar `<p className="shopv2-hint muted">{t("shop.shiftSellHint")}
</p>` — „Tipp: Shift+Klick auf einen Stapel verkauft ihn sofort komplett." `BankPage.tsx` hat exakt
dasselbe Verhalten (`onShiftClick={... depositBaseWithVariants / withdrawItem ...}`, siehe
`VariantContainerCell`-Aufrufe) — aber keinen einzigen sichtbaren Hinweistext dazu. Ein Spieler, der
zuerst in die Bank statt in den Shop geht, lernt den Shortcut nie.
**Vorschlag:** Denselben Hinweissatz (neuer Key `bank.shiftHint`, gleiche Formulierung wie
`shop.shiftSellHint`, nur „einlagern/entnehmen" statt „verkaufen") über `.bank-columns` einblenden.
**Aufwand:** S · **Priorität:** 2

### 3.3 Disabled-Kaufbutton im Shop erklärt nie WARUM
**Befund:** `ShopPage.tsx BuyCard` (Zeile 161–193): `disabled={gold < cost || noSpace}`, das `title`
zeigt aber nur die Preis-Rechnung (`${q}× ${entry.cost} = ${cost}`), niemals den Blockgrund. Ein
Spieler mit vollem Inventar sieht optisch denselben grauen Button wie einer mit zu wenig Gold — beide
Ursachen sind aber grundverschieden zu lösen (verkaufen vs. sparen). Das Gegenmuster existiert im
selben Code bereits: `QuestsPage.tsx TokenShopOfferCard` (Zeile 360–370) zeigt bei `!affordable` sowohl
einen erklärenden `title` als auch eine sichtbare Hinweiszeile (`quest-shop-offer-hint`).
**Vorschlag:** `BuyCard`-Title bei Disabled um die konkrete Ursache ergänzen (`noSpace` →
`t("inv.full")`/vergleichbar, sonst Preis wie bisher) — dieselbe Idee wie in QuestsPage, nur auf die
bestehende Kachel angewandt.
**Aufwand:** S · **Priorität:** 2

---

## 4. Discoverability

### 4.1 F1 ist produktiv an ein unsichtbares Trailer-Tool gebunden
**Befund:** `App.tsx MainLayout` registriert einen `keydown`-Listener auf `"F1"`, der die gesamte
Content-Fläche sanft automatisch scrollt („Trailer-Autoscroll", Kommentar Zeilen 762–812) — **ohne**
`import.meta.env.DEV`-Gate, anders als der bewusst dev-only gehaltene `?levelTest=1`-Hook in
`LevelXpBar` (Zeile 399–413) im selben File. F1 ist in praktisch jeder Anwendung die Standard-„Hilfe"-
Taste. Drückt ein neugieriger Spieler sie, beginnt die Seite lautlos zu scrollen — ohne jede visuelle
Kennzeichnung, dass gerade ein Modus aktiv ist (kein Icon, kein Toast, kein Cursor-Wechsel). Die
Options-Seite hat sogar eine gepflegte Hotkey-Referenz (`OptionsPage.tsx` Zeilen 135–159: Esc, 1–9,
Shop-Tabs, F11) — F1 taucht dort naheliegenderweise nicht auf, weil es nie für Spieler gedacht war.
**Vorschlag:** Den Listener hinter `if (!import.meta.env.DEV) return;` gaten (identisches Muster wie der
`levelTest`-Hook direkt daneben) — Marketing/Trailer-Aufnahmen laufen ohnehin aus einer Dev-Umgebung.
**Aufwand:** S · **Priorität:** 1

### 4.2 Kampf-Gegnerauswahl hat keine Suche/Filter trotz durchgängigem Muster überall sonst
**Befund:** `SkillPage.tsx` (Zeile 493–503, `invf-search`), `BankPage.tsx`/`ShopPage.tsx` (jeweils via
`ItemFilterBar`) haben alle eine Sucheingabe. `CombatPage.tsx MonsterSelect` (Zeile 3487 ff.) — die
Zonen-/Dungeon-/Turm-Karten-Übersicht mit aktuell ~10 Zonen + ~8 Dungeons + 5 Turm-Etagen + Paragon in
einer einzigen scrollenden Liste — hat gar kein Sucheingabefeld, obwohl das identische UI-Idiom
(`invf-search`-Input + Live-Filter) im selben Projekt bereits dreifach existiert und die Liste laut
laufender Content-Erweiterung (Aschechronik wächst kontinuierlich) nur größer wird.
**Vorschlag:** Denselben `invf-search`-Input über `.zone-grid` legen, Filter auf `tr(zone.name)`/
`tr(dungeon.name)` — reines Copy-Paste des in `SkillPage.tsx` bereits gelösten Musters.
**Aufwand:** S · **Priorität:** 2

### 4.3 Combat/Shop/Bank-Bereichstouren feuern evtl. nie (siehe 1.1)
**Befund:** Bereits unter 1.1 dokumentiert — hier nur der Discoverability-Aspekt: die einzigen
Bereichstouren, die es überhaupt gibt (`COMBAT_TOUR_STEPS`, `SHOP_TOUR_STEPS`, `BANK_TOUR_STEPS`), sind
gute, kurze 3–4-Schritte-Einführungen — aber ihre Auslösebedingung („erster Besuch dieser Seite") wird
nie vom Hauptguide erfüllt. Sie sind im Code vorhanden und gut gemacht, aber für einen Spieler, der dem
Guide bis zum Ende folgt und dann selbst weiterspielt, wirkungslos, solange er nicht zufällig selbst auf
Combat/Shop/Bank klickt.
**Vorschlag:** Deckt sich mit 1.1 — sobald der Hauptguide durch diese Seiten navigiert, lösen die
Bereichstouren automatisch beim Betreten aus (bestehende Logik, kein Zusatzaufwand).
**Aufwand:** — (identisch mit 1.1) · **Priorität:** 1

---

## 5. Power-User-Flows (der 20+-Queue-Spieler)

### 5.1 Keine freie Mengeneingabe beim Queuen
**Befund:** `SkillPage.tsx` (Zeile 1072–1090) bietet ausschließlich `CRAFT_TARGET_PRESETS` (1/25/50)
plus ∞ — keine Zahleneingabe. Ein Spieler, der z.B. genau 137 weitere Eisenbarren für ein bestimmtes
Item-Set braucht, kann nur über-/unterqueuen (25er/50er-Vielfache) oder ∞ wählen und die Aktion später
manuell stoppen (verliert dabei die Präzision und muss den Fortschritt selbst überwachen). Die Engine
(`enqueueAction(state, content, action.id, n)`) nimmt bereits jede beliebige Zahl entgegen — die
Beschränkung ist rein UI-seitig.
**Vorschlag:** Einen fünften, kleinen Eingabe-Slot („Custom") neben den vier Presets ergänzen: Zahlenfeld
+ Enter/Bestätigen-Button, ruft denselben `enqueueAction`-Call mit dem eingegebenen Wert auf. Kein
Engine-Eingriff nötig.
**Aufwand:** M · **Priorität:** 2

### 5.2 Queue-Reordering nur Einzelschritt, kein Drag&Drop, kein Sprung an den Anfang
**Befund:** `ActionQueuePanel.tsx` (Zeilen 226–255) bietet nur ▲/▼-Buttons, die `moveQueueItem(state,
i, i∓1)` aufrufen — ein Eintrag von Position 15 an den Anfang zu holen braucht 14 Klicks. Natives
Drag&Drop existiert im selben Projekt bereits als etabliertes Muster (`ItemCell.tsx` `draggable`/
`onDragStart`, genutzt in Bank/Charakter-Inventar) — wurde für die Queue aber nicht wiederverwendet.
**Vorschlag:** Kurzfristig (S): einen zusätzlichen „an den Anfang"-Button (⏫) neben ▲/▼ ergänzen —
`moveQueueItem(state, i, foldedCount)`, eine Zeile Zusatzlogik. Mittelfristig (M): HTML5-Drag&Drop auf
die Queue-Zeilen übertragen, analog dem bestehenden `ItemCell`-Muster.
**Aufwand:** S (Sofortmaßnahme) / M (volles DnD) · **Priorität:** 2

### 5.3 Kein „Wiederholen"-Shortcut nach einem abgeschlossenen Batch
**Befund:** Ist eine große Warteschlange (z.B. 250× Zinn) durchgelaufen, bleibt nur der Weg zurück zur
Skill-Seite und erneutes Klicken der Presets — es gibt keinen „nochmal die letzte Menge/Aktion
queuen"-Button weder in `ActionQueuePanel.tsx` noch auf der Skill-Karte selbst. Für den in der Aufgabe
benannten 20+-Queue-Spieler ist genau dieser Nachschub-Zyklus der häufigste wiederkehrende Klick-Ärger.
**Vorschlag:** Im leeren Queue-Panel-Zustand (`queue.emptyHint`, Zeile 200) einen „Zuletzt: <Aktion> ×N
– erneut queuen"-Chip anzeigen, der sich die letzte abgeschlossene Kombination merkt (ein Ref reicht,
kein Save-State nötig) und per Klick erneut `enqueueAction` aufruft.
**Aufwand:** S · **Priorität:** 3

---

## 6. Zustands-Sichtbarkeit

### 6.1 Action-Queue-Panel verschweigt den Blockgrund einer gestoppten Aktion
**Befund:** Das docked `ActionQueuePanel.tsx` ist explizit dafür gebaut, den Skill-Fortschritt zu
verfolgen, *ohne* auf der Skill-Seite bleiben zu müssen (JSDoc Zeile 38–48). Stoppt die aktive Aktion
aber wegen vollem Inventar oder fehlendem Material (`state.lastStop`), zeigt das Panel nur
„`queue.nothingRunning`" — ohne jeden Hinweis, dass dahinter noch N wartende Einträge hängen oder
warum nichts läuft. Die einzige Erklärung dafür lebt als kleines ⚠-Icon mit **Hover-only**-Tooltip in
der TopBar (`App.tsx GameStats`, Zeile 588–599) — einem komplett anderen UI-Bereich als dem Panel, das
der Spieler eigentlich beobachtet. Wer nur auf das rechts angedockte Panel schaut (das genau dafür da
ist), sieht kein „warum", nur „nichts läuft".
**Vorschlag:** `state.lastStop`-Grund direkt im Panel als kleine Inline-Zeile über der leeren
„läuft"-Sektion anzeigen (`skill.stoppedInventoryFull` / `skill.stoppedNoMaterials`, exakt dieselben
Strings, die `SkillPage.tsx` schon nutzt) — keine neue Logik, nur ein zweiter Konsument derselben
State-Werte.
**Aufwand:** S · **Priorität:** 1

### 6.2 Zwei unterschiedliche „gesperrt"-Zustände auf Skill-Karten ohne Legende
**Befund:** `SkillPage.tsx` (Zeile 734–740) unterscheidet CSS-seitig sauber zwischen `locked`
(Level nicht erreicht) und `blocked` (Level ok, aber Material fehlt) — visuell umgesetzt, aber nirgends
erklärt. Das ist im Kern gut gelöst (zwei echte Zustände statt einem pauschalen „grau"), aber ohne
Legende muss ein neuer Spieler den Unterschied durch Ausprobieren lernen. Vergleichsweise vorbildlich
gelöst ist das bei den Monster-Namensfarben in `CombatPage.tsx` (`DiffNameLabel`, Zeile 294–328): dort
gibt es einen Hover-Tooltip mit einer kompletten 5-Zeilen-Farblegende.
**Vorschlag:** Denselben `CitadelTip`-Legenden-Baustein, der für die Kampf-Namensfarben bereits gebaut
ist, für die Skill-Karten-Zustände (`locked`/`blocked`/normal) wiederverwenden — ein Tooltip auf dem
Level-Badge/Schloss-Icon der Karte reicht.
**Aufwand:** S · **Priorität:** 3

### 6.3 Bank-„voll"-Warnung nur textuell, Shop-Analogon nur farblich
**Befund:** `BankPage.tsx` zeigt bei voller Bank einen Fließtext-Hinweis (`bank.full`, Zeile 245) UND
eine `.full`-Klasse auf dem Zähler — der Inventar-/Bank-Slotzähler in der TopBar (`App.tsx GameStats`,
Zeile 604–611) unterscheidet zusätzlich noch einen dritten Zustand `over` (Ist > Kapazität, rot) vom
normalen `full` (Amber). Diese Drei-Stufen-Unterscheidung (ok/voll/übervoll) existiert nur in der
TopBar, nicht in Bank/Shop/Charakter-Inventar-Zählern selbst — dort ist alles binär „voll oder nicht".
Ein Spieler, der eine überfüllte Tasche hat, sieht das im Detail nur, wenn er zufällig auf die TopBar
statt auf die Seite selbst schaut, auf der er gerade arbeitet.
**Vorschlag:** Die bereits vorhandene `invOverCapacity`-Logik aus `GameStats` auch auf die lokalen
Zähler in `BankPage.tsx`/`CharacterPage.tsx` übertragen (dieselbe Berechnung, `usedCapacityUnits` vs.
`effectiveCapacity`, ist bereits ausgelagert nutzbar).
**Aufwand:** S · **Priorität:** 3

---

## Zusammenfassung nach Priorität

**Priorität 1 (4):** 1.1 Hauptguide überspringt Combat/Shop/Bank/Mail/Enchanting · 4.1 F1-Trailer-Tool
ungated · 4.3 Bereichstouren feuern dadurch nie · 6.1 Queue-Panel verschweigt Stop-Grund

**Priorität 2 (10):** 1.2 Enchanting ohne Kontext-Einstieg · 1.3 Quest-Tab/Claim-Granularität ·
2.1 Tote Section-Labels · 2.2 TopBar/Sidebar-Grenze unklar · 3.1 Drei Mengen-Presets · 3.2 Shift-Hinweis
nur im Shop · 3.3 Disabled-Buy ohne Grund · 4.2 Keine Zonen-Suche · 5.1 Keine freie Mengeneingabe ·
5.2 Queue-Reordering ohne Sprungfunktion

**Priorität 3 (4):** 2.3 Mail wirkt wie App-Chrome · 5.3 Kein Wiederholen-Shortcut · 6.2 Locked/Blocked
ohne Legende · 6.3 Kein dreistufiger Voll-Zustand außerhalb der TopBar

Die schnellsten, wirkungsvollsten Einzelmaßnahmen (alle S-Aufwand, alle P1/P2): **4.1** (eine Zeile
Code, verhindert einen realen Verwirrungsfall in der Live-Version), **6.1** (Queue-Panel um den
bereits vorhandenen Stop-Grund ergänzen) und **1.1** (Registry-Erweiterung, kein neuer Code-Pfad).
