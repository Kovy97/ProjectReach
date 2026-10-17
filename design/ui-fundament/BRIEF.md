# UI-Fundament — Auftrag für die Design-Agenten

<!-- claude:2026-10-17T10:45:00+02:00 -->

**Branch:** `test-ui-fundament` (Basis-Commit `373236a` = Stand 1.3 vom 10.09.). Nur Test-Branch.
**Auftraggeber:** Chef, 17.10.2026: „Arbeite mit bis zu 4 Agents an dem Design Fix.“
**Integration, Commits, Build:** macht ausschließlich der Hauptagent. Agenten führen **keine
git-Befehle** aus, die etwas verändern (kein add/commit/stash/checkout/reset).

## Befund (Hauptagent, gerendert am 17.10. in de/en/ru, 1366×768 und 1920×1080)

1. **Platzbudget:** Bei 1366×768 fressen Topbar (2 Reiterreihen) + Statusfeld ≈ 320 px = 42 % der
   Höhe. Danach setzen Seiten noch NPC-Sprechblase + eigene Reiter drauf; auf der Aufgaben-Seite
   beginnt der Inhalt bei ≈ 620/768 px. Statusfeld im Leerlauf: „Untätig / Untätig / Keine aktive
   Fertigkeit“.
2. **Rahmen-Inflation:** Panel-in-Panel-in-Panel mit Eisenrahmen; Hierarchie geht verloren und
   kostet Pixel. Dopplungen (Slayer: Brenna 4×; Kampf: Info an 3 Stellen, 2× „Details“).
3. **Wortbrüche mitten im Wort:** „MEISTERSCHA/FT“ (Topbar, 1920×1080 DE, Ursache
   `overflow-wrap: anywhere` in `chrome.css`), RU-Sidebar „Собирательст/во“, RU-Werkzeugslots
   „ИН/СТ/РУ/МЕ“. 67 Stellen im CSS erlauben Umbruch an beliebiger Stelle.
   **Electron hat kein greifendes russisches Silbentrenn-Wörterbuch** (`character.css:1898`
   gemessen) — `hyphens: auto` rettet Russisch NICHT. Lösung ist Platz bzw. Umbruch an Wortgrenzen.
4. **Spaltenlayouts nach Fensterbreite statt Panelbreite** (Codex-Analyse
   `CODEX/notes/2026-09-10-ui-skalierung-ru-analyse.md`, P1/P2-Tabellen — dort stehen die
   konkreten Datei:Zeile-Belege je Seite). Sidebar + Queue belegen bis zu 540 px.
5. **Schrift:** 52 verschiedene px-Größen, viele 10–12 px.

## Ziele

- Inhalt bekommt Platz: Kopf kompakt, Seitenköpfe flach, keine doppelten Infos.
- Layouts richten sich nach dem **Panel**, nicht nach dem Fenster (Container Queries).
- Kein Wort bricht mitten im Wort, in keiner der 7 Sprachen.
- Lesbare Schrift: neue/überarbeitete Regeln nur mit der Skala aus `styles/base.css`
  (`--fs-2xs … --fs-3xl`, `--sp-1 … --sp-6`). Wörter nie unter `--fs-xs` (12 px).
- **Chef 17.10. (verbindlich, ersetzt die frühere Rahmen-Reduktion):** „Es ist mir wichtig, dass das
  Design nicht komplett zerstört wird. Es soll nicht steril wirken, wir haben viel Zeit in Texturen,
  Ränder etc. gesteckt.“ Texturen, Iron-Frames, Ränder, Materialflächen, Goldtypografie und
  Ornamente bleiben. Platz kommt aus dem Layout (Reflow, Container Queries, kompaktere Abstände,
  Dopplungen weg), nicht aus dem Entfernen von Material. Rahmen nur entfernen, wenn wirklich derselbe
  Rahmen doppelt ineinander steckt; im Zweifel behalten. Keine flachen Ersatzflächen. Jede
  Rahmen-/Texturentfernung im Bericht einzeln mit Vorher/Nachher-Bild.

## Feste Chef-Vorgaben (nicht verhandelbar)

- Knöpfe: Standard `.btn-iron` (Eisenrahmen), Sekundär `.shop-citadel-btn`. Keine neuen Knopf-Stile.
- **Sidebar (Chef-Kritik 10.09.):** kräftig, zentriert, gut lesbar — 58 px Knöpfe, 32 px Icons,
  ≈19 px Namen. Nicht kleiner machen. Sie darf scrollen.
- Kampf-Gegnerkarten: Kunst `background-size: 100% auto` + `bottom center`, **nie `cover`**.
- Skill-Aktionskarten „Layout 01 Fixed Dock“ (720-px-Zonenvertrag) sind Chef-abgenommen:
  Raster/Zonen nicht umbauen, nur Text-/Überlauffehler darin beheben.
- CSS `url()` immer gequotet: `url("…")`.
- Keine neuen Bilder, keine Asset-Änderungen, kein Glühen auf Ausrüstung.
- Alle 7 Sprachen, keine hart codierten Texte. **Nur Agent A darf i18n-Dateien ändern**; wer einen
  neuen/kürzeren Text braucht, meldet ihn an den Hauptagenten.
- Keine Engine-/Content-/Save-Änderungen (`packages/**` tabu). Keine Feature-Entfernung.

## Technische Regeln

- **Kein neues `!important`.** Vorhandene entfernen, wo du per Screenshot belegst, dass es ohne geht.
- **Kein `overflow-wrap: anywhere` / `word-break: break-all`** für Wörter/Labels/Namen. Erlaubt nur
  für IDs, Pfade, Zahlenketten.
- **Container Queries:** Seiten-Wurzel bekommt `container: <name> / inline-size`.
  ⚠ Containment macht das Element zum Containing Block für `position: fixed`-Nachfahren. Nur auf
  Elemente setzen, in denen kein nicht-portaliertes Modal/Tooltip/Overlay mit `position: fixed`
  steckt (deshalb kapselt `chrome.css:25` nur den Header). Im Zweifel ein inneres Layout-Element nehmen.
- Viewport-`@media` für Seitenlayout durch `@container` ersetzen, wo du die Datei besitzt.
- Fixed-Höhen/`max-height` in px vermeiden, wo sie Text abschneiden.
- Jede geänderte Regelgruppe/Logikstelle bekommt einen kurzen Marker
  `/* claude:2026-10-17T<hh:mm>:00+02:00 — <warum> */` (Workspace-Regel, analog `codex:`).
  Knapp halten, keine Romane.
- Kleinster sinnvoller Eingriff je Befund; alte Regeln, die dein neuer Code überflüssig macht, löschen
  statt überschreiben (keine weitere Override-Schicht!).

## Dateireviere (keine parallelen Schreiber!)

| Agent | Bereich | Darf schreiben |
|---|---|---|
| **A Shell** | Topbar, Statusfeld, Sidebar, Warteschlangen-Chrome, globale Tokens | `App.tsx`, `components/TopBar.tsx`, `components/Sidebar.tsx`, `components/ActionQueuePanel.tsx`, `navigation.ts`, `styles/{chrome,chrome-sidebar,chrome-queue,topbar,sidebar,gravewood-navigation,action-queue,base,design-system,index,interaction,gravewood-controls}.css`, `i18n/**` |
| **B Kampf & Charakter** | Kampfseite, Charakterbogen, Ausrüstung/Kits, Inventar-Filter, Item-Zellen/Tooltip | `pages/CombatPage.tsx`, `pages/CharacterPage.tsx`, `components/{EquipmentOverview,EquipKitBar,ItemTooltip,ItemFilterBar,EliteMiniWindow}.tsx` + Kampf-Unterkomponenten, `styles/{combat,character,gravewood-character-fixes,gravewood-fighter-cards,frontline-harness-dock,inv-filter,components,elite-mini-window}.css` |
| **C Lager & Meta** | Bank, Shop, Postfach/Rabenfracht, Statistik, Begleiter, Erfolge, Bestiarium, Optionen, Enzyklopädie, Item-Wiki | `pages/{BankPage,ShopPage,MailPage,StatsPage,PetGallery*,AchievementsPage,BestiaryPage,OptionsPage}.tsx`, `components/{EncyclopediaModal,CrossSaveTransferModal,OptionControls}.tsx`, `styles/{pages,shop,mail,mail-transfer,stats,achievements,warden-ledger-achievements,bestiary,bestiary-flip,options,encyclopedia,item-wiki}.css` |
| **D Skills & Welt** | Skill-Seiten, Anbau, Jagen, Slayer, Verzauberung, Aufgaben/Chronik, New Haven, Meisterschaft, Skills-Übersicht, NPC-Sprechblase | `pages/{SkillPage,FarmPage,HuntingPage,SlayerPage,EnchantingPage,QuestsPage,NewHavenPage,MasteryPage,SkillsOverview*}.tsx`, `components/NpcGreeting.tsx`, `styles/{skills,gravewood-actioncards,hunting,slayer,enchanting,quests,chronicle,newhaven,mastery-anticipation,npc-greeting,quantity-picker}.css` |

Dateinamen bitte vor dem Schreiben verifizieren (Glob). Brauchst du eine Änderung in einer
fremden Datei: **nicht anfassen**, sondern in deinem Bericht als „Bedarf an Agent X/Hauptagent“
melden. Fremde halbfertige Änderungen in Screenshots ignorieren — andere Agenten arbeiten parallel.

## Prüfen (Pflicht, ehrlich berichten)

- Werkzeug: `apps/client/ui-audit/clip-audit.mjs` (aus `apps/client/`), **eigener Port und eigener
  `--out`-Ordner im Scratchpad**, z. B.
  `node ui-audit/clip-audit.mjs --locales de,ru --res 1360x720,1366x768,1920x1080 --scenes <deine> --port <P> --out <scratch>/after-<agent>`
  Szenenliste: `node ui-audit/clip-audit.mjs --list-scenes`. Für Seiten ohne Szene `ui-audit/bot.mjs`
  (Anleitung `ui-audit/BOT-GUIDE.md`; vorher `click:.guide-bubble-skip`).
- **Vorher-Bilder** liegen unter
  `C:\Users\MSchu\AppData\Local\Temp\claude\G--GameDev\2517adfc-8f91-4392-9549-26a2e275e62e\scratchpad\clip-{en,de,ru}\shots\<sprache>-<auflösung>\<szene>.jpg`.
- **Screenshots selbst ansehen** (vorher/nachher). Das Clip-Werkzeug erkennt Wortbrüche und
  Platzmangel NICHT — es misst nur Pixel, die aus Boxen ragen. Dein Auge ist die Abnahme.
- `pnpm --filter @hearthforge/client typecheck` muss grün sein.
- Kein Electron, kein `pnpm dev`, keine echten Spielstände, kein Produktions-Build (macht der Hauptagent).

## Rückmeldung (max. ~400 Wörter)

1. Geänderte Dateien. 2. Was je Befund gemacht wurde (1 Zeile). 3. Vorher/Nachher-Bildpfade der
wichtigsten 4–6 Szenen. 4. Prüfergebnisse (Typecheck, Clip-Audit-Zahlen). 5. Offen/Bedarf an
andere Reviere/Chef-Entscheidungen. 6. Ehrlich: was du NICHT geschafft oder nicht geprüft hast.
