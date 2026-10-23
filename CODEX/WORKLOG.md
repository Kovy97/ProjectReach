# Codex-Arbeitslog

## 2026-10-18 — Codex: 73 Motive / 78 Dateien vollständig geliefert

<!-- codex:2026-10-18T17:21:48.717Z -->

Aktuelle Asset-MD einschließlich 16 neu nachgetragenen Aschesturz-Motiven abgearbeitet. Root und Fachagenten produzierten die Motive mit ImageGen; unabhängige Bildprüfung aller 73 Motive bestanden. Krallen- und Kettenbogen nach Chefkritik neu erzeugt; alle neun Sehnen geprüft. Originale und verworfene Fassungen erhalten.

Bestanden: native Alpha-/RGB-Kanäle, Maße/IDs, Nachbar- und Zielgrößen-QA, Quellidentität, 78 bytegleiche Lieferkopien und ZIP-Einträge sowie 150 unveränderte Runtime-Ziel-/Referenzpfade. Galerie, Manifest, Archiv und 73 MD-Häkchen fertig. [Galerie](assets/1.3.0-2026-10-18/REVIEW.html) · [ZIP](assets/1.3.0-2026-10-18/1.3.0-assets-complete.zip) · [Prüfbericht](assets/1.3.0-2026-10-18/INDEPENDENT-REVIEW.md)

Aktueller Jägerkodex-Pfad `ui/talents/slayer/` und Prestige-Pfad `ui/talents/prestige/` eingehalten. Ausschließlich Staging; kein Spielstart, Build, Save-/Gameplaytest oder Release. Vorhandene Arbeit erhalten, kein Commit.


## 2026-10-25 (Abend) — Claude: 1.4.0 Welle 5 und Stoff-/Ward-Rework

<!-- claude:2026-10-25T21:15:00+02:00 -->

Release-Vorbereitung committet (Version, Fixture v93, Patchnotes, Steam-Post, Clip-Audit). Chef: Assets zum Schluss.
30-Magier-Messung zeigte, dass Stoff-Magier ohne Rüstungswert nicht überleben; Ward lädt jetzt 4 % je Zauber, Status
trifft den Ward (Drazhan Stoff 0/10 → 10/10). Offen: Ward-Dämpfung 30 % als Chef-Entscheid. Alle Suiten grün.

## 2026-10-25 (Mittag) — Claude: 1.4.0 Welle 4 (Raid) fertig

<!-- claude:2026-10-25T13:00:00+02:00 -->

Raid „Die Hallen von Gobkha'raz“ fertig integriert (Engine, Content, SAVE 93, UI). Durchlauftest grün, Normal
in allen Stilen 41–61 min ohne Neustart. Spaltenverschobene EN/DE-Namen korrigiert, Wächter ergänzt. Raid-Kampf
verlassen zählt wie ein Tod (A15). Details: `CODEX/HANDOFF.md`.

## 2026-10-25 — Claude: 1.4.0 Wellen 1–3 fertig, Welle 4 in Bau

<!-- claude:2026-10-25T05:45:00+02:00 -->

Wellen 1–3 committet auf `update-1.4.0` (SAVE 89–92), jede mit Gates grün (zuletzt: Typecheck 5/5, content 310,
engine 1863, persistence 467, client 263, Build). Chef delegierte am 24.10. alle Gate-Fragen; Entscheide im Goal.
Welle 4 (Raid): Typen, SAVE 93, Raid-Lauf, Content fertig und getestet; Kampf und UI bei Fachagenten.
Details: `CODEX/HANDOFF.md`, `design/1.4.0-changelog.md`.

## 2026-10-19 — Claude: 1.3.0 vom Chef abgenommen, Painterly-UI

<!-- claude:2026-10-19T03:00:00+02:00 -->

**Chef 19.10.: „Das Update ist fertig!“** 1.3.0 inhaltlich abgenommen. Seit dem letzten Eintrag dazugekommen:
Bilanz-Fenster beim Aschesturz (`17b2131`, `9bd9e6c`, Fix: geräumte Dungeons öffneten nach Aufstieg wieder), 73 Bilder von
Codex eingebunden (`d83cf62`), Painterly-UI: neue Texturen auf allen Flächen (tonwert-angeglichen, Kacheln 2,5× größer),
Holz-/Eisenrahmen mit gespiegelten Gehrungsecken + nahtlosen langen Kanten (round, Eisen geglättet), Sidebar/Topbar nach
Chef-Preset aus dem Knopf-Editor (`design/ui-fundament/button-editor.html`, Preset `knopf-sidebar-moos-holz.json`: Wood 2 +
Holzstreifen), Charakter-Spalte aufgeräumt (`6e68bd0`), Skill-Karten Werte-Kacheln Holz/Produces Eisen, Inventar-Slots
auf Chef-Wunsch wieder die alten (`3330bda`). Alte Texturen/Rahmen: `ASSETS/archive/textures-2026-10-18/`. Texturen-Demo:
`design/ui-fundament/texture-button-demo.html`. Patchnotes + Steam-Post 7 Sprachen final (`d1f66d1`).
Endprüfung: Typecheck 5/5, Engine 1807, Content 310, Persistence 453 inkl. Vault v88, Client 261, Build grün.
Offen: Balance-Messung der neuen Encounter (läuft, `design/1.3.0-balance-encounter.md`), Clip-Audit de/ru (läuft),
Asset `scar_currency` (Nachtrag 2), Upload/Push/Merge nur auf Chef-GO.

**Nachtrag 19.10. (claude:2026-10-19T03:20:00+02:00):** Eisenrahmen Mittelstufe + neue Inventartasche (`06c951c`).
Patchnotes 7 Sprachen: eigener Abschnitt „Ein neuer, gemalter Look“ oben + Einleitung (`153dc88`). Neues Hauptmenü
(`9c765a2`): Highlands-Kulisse 16:9, ab Seitenverhältnis 2:1 eigene 3440×1440-Fassung (CSS-Media-Query in `menu.css`),
gemaltes Logo `mainmenu_logo_painterly.webp` auch auf Neues Spiel/Laden/Charaktererstellung; War-Table + altes Logo bleiben
im Bestand. Render 1366/1920/3440 geprüft, Clip-Audit 0 Funde. Clip-Audit 1.3.0 (17 Funde 1366, de/ru) per Beleg geprüft:
Sidebar-Liste unter Sticky-Zonenkarte gescrollt bzw. Bankzahl unter offenem Tooltip, keine echten Abschneidungen.
Balance-Messung fertig (`design/1.3.0-balance-encounter.md`, V1–V15 alles Chef-Entscheide, nichts angewendet). Release-
relevant: Patchnotes werben „Paragon-Truhen ab 25, 50 und 100“, 50/100 sind laut Sim unerreichbar → Chef-Entscheid E4.

**Nachtrag 19.10. früh (claude:2026-10-19T07:40:00+02:00):** Store-Medien. 12 Screenshots EN 1920×1080
(`marketing/1.3.0-media/screenshots/`, Skript `apps/client/ui-audit/mkt-1.3.0-media.mjs`, Fixture-Vorpatch gegen
Fund-Toasts) und 60-s-Trailer ohne Ton, allgemein zum Spiel (Chef: kein Early Access, kein Update-Bezug):
`marketing/1.3.0-media/trailer/GrimReach-Trailer-1080p30-ohne-Ton.mp4` + `SCHNITTLISTE.md` (Bild-für-Bild über
Playwright-Uhr, `mkt-1.3.0-trailer.mjs`, Schnitt `mkt-1.3.0-trailer-assemble.py`). Videos nicht in Git (Größe).
Nebenbei: Droprate im Fund-Toast nutzt jetzt den sprachabhängigen Formatierer (`acdbc3d`, EN zeigte „0,00 %“);
New Haven Material-Hierarchie (`0c3df7b`, ui-dev; Popup/Baumenü/Karten-Bühne nicht visuell geprüft, Clip-Audit-
Szenen erreichen diese Zustände nicht).

**Nachtrag 19.10. (claude:2026-10-19T08:30:00+02:00):** Chef-Entscheide Balance: V1–V14 aus
`design/1.3.0-balance-encounter.md` übernommen (`cb5cfea`: Hallen-XP, Skarnbrut 140, Siege-Idol-Beute, Tilger-Raserei
0,25×1,50, Kapellen-Gold 12.000). Paragon-Text bleibt auf Chef-Wunsch unverändert („Patchnotes nichts mehr ändern, habe
ich so schon abgespeichert“), Stufen 50/100 bleiben im Spiel. Endprüfung danach: Typecheck 5/5, Engine 1807, Content 310,
Persistence 453 inkl. Vault, Client 261, Build grün. Testspiel (isoliertes Profil) mit diesem Stand neu gestartet;
echte Spielstände per SHA1 unverändert. Offen: Chef-Freigabe dieses Stands im Testspiel, Push/Merge/Upload nur auf GO.

**Nachtrag 19.10. (claude:2026-10-19T09:00:00+02:00):** Chef-GO („Ist freigegeben. Go!“): 1.3.0 hochgeladen,
BuildID 26033657, setlive leer (Chef schaltet live), Übergabe `UPLOAD-FERTIG.txt`. `main` auf den Release-Stand
vorgespult, Tag `v1.3.0`, in vier Fast-Forward-Etappen nach GitHub gepusht (2-GB-Push-Grenze).

**PAUSE 19.10. ~00:25 (claude:2026-10-19T00:25:00+02:00), Chef: „Hier pausieren“.** Trailer v2 (dynamisch) mitten im
Bau gestoppt: Skript `apps/client/ui-audit/mkt-1.3.0-trailer-v2.mjs` (unversioniert), 16 Clips in
`marketing/1.3.0-media/trailer/v2/clips/`; offen: Item-Karten-Clip, Schnitt v2, Endkontrolle. Painterly-Asset-Audit
(veraltete Piktogramme, Unterseiten-Hintergrund, alte Rahmen/Knöpfe) wartet auf Chef-Entscheid. Keine Prozesse laufen.

**19.10. (claude:2026-10-19T12:40:00+02:00) — Zwei UI-Stile Reforged/Classic (Chef: viel schlechtes Feedback zur 1.3-Oberfläche).**
Umschalter im Hauptmenü (oben rechts) und in den Optionen, sofort wirksam, localStorage `hearthforge:uiStyle`
(`uiStyle.ts`, kein SAVE-Bump, Vorgabe reforged). Classic = Look von 1.2.3: `SidebarClassic.tsx`, `TopBarClassic.tsx`
(+ Wiki-Reiter), `ClassicHeader.tsx` (Kopfzeile Quiet Citadel), `classic-chrome.css` (gen-classic-chrome.py, 1.2.3-Styles
unter `:root[data-ui-style=classic]`), `classic-skin.css` (gen-classic-skin.py, 1.2.3-Texturen/Rahmen seitenweit),
1.2.3-Grafikkopien `assets/classic/**`, Kriegstisch + altes Logo. Reforged wieder dynamisch (Seitenleiste mit Breite,
Kopfleiste mit Höhenregler; Ursache war `--sb-scale-eff: 1` aus der Reforged-Leiste vom 10.09.). Commits eda3307,
257146f, af96423, f11cf14. Prüfung: Typecheck, Client 261, Build, Clip-Audit Reforged 0 Funde, Sichtprüfung beider Stile
1366/1920/2560, EN/RU, Leiste 240/420, Kopfleiste 114/168/256, Live-Umschalten ohne Konsolenfehler.
Offen: Chef-Abnahme, Vorgabe-Stil, Patchnotes/Upload 1.3.1 nur auf GO.

**19.10. (claude:2026-10-19T20:20:00+02:00) — 1.3.1 im Depot (Chef: „So wie es ist passt es - Pushe dass als 1.3.1 update“).**
Nachträge seit dem Eintrag oben: Reforged-Knopfrahmen 50 % dünner + Holzwand mit Vignette statt Stein (a732762), Fix
Classic: gen-classic-chrome.py trennte Selektorlisten auch in `:is()`, Browser verwarf 36 Regeln, Seitenleisten-Knöpfe
und Reiter zeigten Holz statt Stahl (7f0c306, `split_top`). Classic-Ausrüstungscontainer ohne Holzrahmen wie 1.2.0,
vom Chef so abgenommen. Version 1.3.1 + EN-Patchnotes `design/steam-post-1.3.1.txt` (bf13c5e). Gates: Typecheck 5/5,
Content 310, Engine 1807, Persistence 453 inkl. Vault, Client 261, Build grün; Paket-CSS bytegleich mit Build.
**BuildID 26058141**, setlive leer (Chef schaltet live), Übergabe `UPLOAD-FERTIG.txt`. `main` vorgespult, Tag `v1.3.1`.
SAVE_VERSION bleibt 88. Vorgabe-Stil bleibt reforged.

**19.10. (claude:2026-10-19T20:40:00+02:00) — Ziel design/1.3.0-goal.md abgeschlossen.** Chef: „Ist abgnommen!“ (1.3.0 im Testprofil gespielt und freigegeben). Alle Punkte unter „Fertig, wenn“ erfüllt.

**23.10. (claude:2026-10-23T15:50:00+02:00) — Plan 1.4.0 „Feder und Stahl“ entschieden, Goal-Prompt liegt bereit.**
Chef hat den Bauplan 1.4 per Quiz beantwortet (`design/1.4-plan.html`, Artifact KQRSdym95JTdpNuE5EdnAR, Sammlung `answers`).
Arbeitsauftrag: `design/1.4.0-goal.md`. Entschiedener Plan mit Raid-Design und 14 Annahmen zum Abhaken:
`design/1.4.0-plan.html` (Artifact JLN1AnDrd5hmWExX7z4Mb7, Sammlung `annahmen`). Noch nichts gebaut, kein Commit.
Wichtig für den Bau: interne Skill-ID der Bognerei `bowcraft` (persistence `SKILL_RENAME` faltet `fletching` bei jedem Laden).

## 2026-10-18 — Claude: Prestige „Der Aschesturz“ (1.3-Erweiterung)

<!-- claude:2026-10-18T15:30:00+02:00 -->

Chef 17.10.: 1.3.0-Stand abgenommen, „mehr für 1.3“ → acht kleine Vorschläge abgelehnt, gewählt **Prestige mit Neustart und
Dauerboni**. Gebaut als **„Der Aschesturz“** (Set C, lore-dev): Währung Narben, Baum Narbenbuch (12 Knoten), Ort
Scherbenaltar, Zähler Aschekerbe. Freischaltung 4×99 + Kapitel 21; bleibt: Begleiter/Echo, Meisterschaft, Jägerkodex (wirkt
erst wieder ab Slayer 85), Erfolge, Bestiarium, Wiki; Rabenfracht- und Altpost-Empfang gesperrt bis wieder 4×99.
Konzept/Entscheide `design/1.3-prestige-konzept.md`, Balance `design/1.3-prestige-balance.md` (1. Durchgang ≈ 360 h, 2. ≈ 65 %),
Namen `design/lore/prestige-namen-1.3.md`. Commits: B1 `67065e5` (SAVE 88, `ascend`, Wächterliste, Quest-Laufanker,
`backupPreAscend`), B2 `e164648` (Knoten-Effekte, Formel, Erinnerung, Alte Pfade, Erbstück/Truhe), Übersetzungen `b59f9bd`
(RU-Bogen heißt jetzt „Пепельный дождь“), UI `493abbf` (Scherbenaltar-Seite, Ablauf speichern → Sicherung → Aufstieg →
speichern, Asche-Überblendung), Asset-Nachtrag `dc2d559` (16 Bilder; Jägerkodex-Symbole liegen unter `ui/talents/slayer/`).
Hinweis: logic-dev hat in B2 kleine Eingriffe in `combat.ts` gemacht (XP-/Gold-/Schadensfaktoren) → bei Combat-Arbeit beachten.
Geprüft: Typecheck 5/5, Engine 1798, Content 310, Persistence 448 inkl. Vault v88, Client 261, Build.
Offen: Chef-Test im Testspiel (Testkopie Slot 5 im isolierten Profil auf Kapitel 21 gesetzt, Original-Kopie gesichert im
Scratchpad), Backup-Fehlerpfade nur per Code gebaut, Bilder laut Asset-Liste.

## 2026-10-17 nachts — Claude: Chef-Entscheide umgesetzt

<!-- claude:2026-10-17T21:45:00+02:00 -->

Chef 17.10.: Schildwall 12 s, DE „Jägerkodex“, Gegnerkarten-Formel bleibt (cover im Fenster + bottom center; meine
Rückfrage hatte sie aus einer falschen Memory-Kurzzeile als „100 % auto“ dargestellt, korrigiert und neu bestätigt),
ru-Begleiter-Dossier bleibt. Commit `8596bdc`. Engine 1751, Content 310, Client 259, Build grün. Offen: nur Chef-Abnahme Ü2.

## 2026-10-17 spätabends — Claude: UI-Runde 2b, J4-Anzeige, Apply 6, Wandprüfung

<!-- claude:2026-10-17T21:10:00+02:00 -->

Restpunkte 1.3.0 abgearbeitet (ohne Chef-Abnahme Ü2, die steht weiter aus):
- **UI-Runde 2b** (`6961892`): Charakter, Verzaubern, New Haven, Post, Optionen, Wiki, Fertigkeitsübersicht nach
  `design/ui-fundament/BRIEF-2-struktur.md` (Unterrahmen → 1-px-Goldlinien, inset-Doppellinien weg). ru: Marken-Shop-Hinweis
  läuft nicht mehr über; Begleiter-Dossier mit sichtbarer Scrollleiste, Echo-Zeile in ru 1366 aber weiter nur per Scrollen
  (≈150 px zu viel Text; Lösung bräuchte mehr Höhe oder kleinere Schrift ⇒ Chef). Bilder `apps/client/ui-audit/shots-struktur-e|f`.
  Rarity-Innenringe der Enzyklopädie-Karten bewusst belassen (tragen Bedeutung).
- **J4 auf dem Zettel** (`ca4220b`): `slayerTaskPointsPayout` ist die eine Quelle für Gutschrift, Auftragszettel und Toast.
- **Apply 6** (`3bf7ccb`): BiS-Builder besitzt alle Begleiter (Echo) + zweiten Platz; Envelope neu gepinnt (Ward +1,5 %,
  Boss→Spieler-TTK +1,2–2,4 %, Spieler-TTK gleich).
- **Wandprüfung Defensiv-Kombi** (temporäre Sim, nicht eingecheckt): Chitinpanzer P1 + Aschbauch P2 bringt gegenüber
  Chitinpanzer P1 + Echo nur ≈7 % weniger Essen je Kill; Glas-Builds CL 85 sterben gegen `siege_idol`/`wreath_bearer` mit
  jeder Kombi. Auffällig: Chitinpanzer allein senkt beim Tank CL 90 gegen `siege_idol` (4-s-Schläge) das Essen je Kill von
  23,9 auf 4,1 (Schildwall alle 9 s blockt ≈44 % der Treffer) ⇒ Beobachtung für den Chef, nicht geändert.
- **Ü1-Checkliste** in `design/plan-1.3.md` mit Urteil je Punkt (`2ec3f89`); **Ü3** gegengeprüft: UI 0 fehlende Schlüssel,
  Content-Overlays fehlen nur 18 Tavernen-Gastnamen (Taverne aus, Eigennamen).
Geprüft: Engine 1751 + Envelope 32/32, Client 259/259, Typecheck, Build.

## 2026-10-17 abends — Claude: Meisterschafts-Untergrenze + Ring-Vollprüfung

<!-- claude:2026-10-17T20:00:00+02:00 -->

Spieler-Review (Chef 17.10.): „945 Stunden, um die Holz-Meisterschaft von 78 auf 99 zu bringen.“ Nachgerechnet: stimmt
(Normaler Baum, 4 XP je Abschluss auf der 13-Mio-Kurve; 523 von 861 Aktionen brauchten >100 h bis 99, Spitze 3.933 h).
Chef-GO: Untergrenze 60 Mastery-XP je Sekunde Basisdauer, **erst ab Mastery 50** (ab 1 hätte der Skill-Pool sich für
neue Spieler in Minuten gefüllt). `shared` `MASTERY_XP_FLOOR_PER_SEC`/`MASTERY_XP_FLOOR_FROM_LEVEL`/
`masteryXpPerCompletion`, `engine/tick.ts` Mastery-Vergabe, `MasteryPage.tsx` beide ETAs. Kein Save-Feld. Commit `fe67a0b`.
Geprüft: Engine 1751/1751, Client 259/259, Typecheck shared/engine/client, Build. Patchnotes + Steam-Post ergänzt.

Ring-Vollprüfung (Chef-Frage „nur Slayer oder alle?“): automatische Probe über alle 31 Seiten (Seitenleiste + Kopfleiste),
77 gerahmte Bauteile, Helligkeit Rahmenstreifen vs. Fläche, Ist gegen border-box-Variante. Kein sichtbarer Ring mehr;
9 messbare Restdifferenzen in ×3-Zoom unsichtbar. Struktur-Runde 2 fehlt noch auf Charakter, New Haven, Verzaubern,
Optionen, Post, Wiki, Fertigkeitsübersicht. Proben: Scratchpad `probe-all-rings.mjs`, `probe-ring-pixels.mjs`.

## 2026-10-18 — Claude: UI-Fundament Runde 2 (Struktur, Ebenenversatz)

<!-- claude:2026-10-18T13:00:00+02:00 -->

Chef: „Layer-Probleme bei jedem Container im Slayer-Auftrag, UI überall sauberer strukturieren.“ Ursache: Rahmen mit
transparenter Innenkante (`panel-frame.webp`), Verlauf nur auf der padding-box ⇒ heller Ring im Rahmenstreifen. Fix
`background-origin/clip: border-box`; dazu höchstens drei Rahmenebenen, eine Rahmenfamilie je Ebene/Seite, Slayer mit
Reitern Shop | Jagdbuch. Vier ui-dev-Agenten nach `design/ui-fundament/BRIEF-2-struktur.md`, Commit `3dd1bd1`.
Geprüft: Typecheck, Client 259/259, Build, Renders de 1366/1920 + ru 1366 (Bilder `apps/client/ui-audit/shots-struktur-a..d`).
Offen: Aufgaben-Marken-Shop „Nicht genug Marken“ läuft in ru über die Karte (alt); Begleiter-Echo in ru 1366 angeschnitten;
Namensdoppelung „Jagdbuch“ (Slayer-Baum vs. Jagen) wartet auf Chef; Gegnerkarten-Bildformel im Code `cover` statt der
in der Erinnerung notierten `100% auto` (nicht angefasst).

## 2026-10-18 — Claude: Jagdbuch + Begleiter-Rework (1.3.0-Kern)

<!-- claude:2026-10-18T03:00:00+02:00 -->

**Kern-Feature 1.3.0 auf `test-ui-fundament`, kein Upload.** Jagdbuch = generisches Talentbaum-System
(`packages/content/src/talents.ts`, `engine/talents.ts`, `TalentTree.tsx`), Baum `slayer` J1–J6 ab Slayer 85,
Kosten ÷8 (Commit `a265ce6`). Begleiter-Rework nach `design/1.3.0-begleiter-werte.md`: 23 Signatur-Effekte,
5 Kampf-Rollen, Echo 25 %, sieben Dämpfungen, Chitinpanzer 1/80.000 (Commit `88e5537`). Felder talents/petPity/
companionPetId2 in v87, kein weiterer SAVE-Bump. Patchnotes + Steam-Post final (`a918979`).
Geprüft: Typecheck 5/5, Engine 1749 (Balance-Sim 0 Auffälligkeiten), Persistence 436 inkl. Vault, Client 259,
Content 310, Client-Build grün. Testspiel isoliert neu gestartet, echte Saves per SHA1 unverändert.
Offen: Chef-Abnahme; Sim-Wandprüfung Defensiv-Kombi (Chitinpanzer + Aschbauch auf Platz 2); Echo-Hinweis bei 1366
unter dem Falz; J4-Bonus nicht in der Auftragsnotiz; BiS-Builder rechnet mit einem Begleiter; Drazhan-Parität CL99 leicht verschoben (Fern/Nah 0,74→0,72, Magie/Nah 1,08→1,05).

## 2026-10-17 (spät) — Claude: 1.3.0 Wellen 0–3

<!-- claude:2026-10-17T23:30:00+02:00 -->

**17.10.2026 spät: 1.3.0 „Die Götzenhalle erwacht“ inhaltlich fertig auf `test-ui-fundament` (Version 1.3.0, SAVE 87, kein Upload).**
Auftrag `design/1.3.0-goal.md`: E1–E6, K1–K4, Ü1 (1.2.4-Fixes, SAVE 87/88 zusammengelegt), Ü3 (Übersetzungen),
Kompat-Archiv v87, Asset-Liste `design/1.3.0-assets.md` (51 Assets), Patchnotes + `design/steam-post-1.3.0.txt`.
Geprüft: Typecheck 5/5, Engine 1707, Content 310, Persistence 432 inkl. Vault, Client 241, Build grün, Clip-Audit de/ru Kernszenen 0 Funde.
Offen: Chef-Abnahme im Testspiel (Ü2), Bilder (Platzhalter bis Asset-Lieferung), Upload nur auf Chef-GO.

## 2026-10-17 — Claude: UI-Fundament (Test-Branch), Spielerberichte, 1.3-Sammelliste

<!-- claude:2026-10-17T16:40:00+02:00 -->

- Bestandsaufnahme gerendert (de/en/ru, 1366×768 + 1920×1080); Befunde: Kopf 42 % Höhe, Wortbrüche, Fenster- statt Panel-Breakpoints, CSS-Override-Schichten.
- Branch `test-ui-fundament`, Basis-Commit `373236a`; vier Agenten nach `design/ui-fundament/BRIEF.md`; Integration, Chef-Entscheide (Slayer-Kopf zurück, Stopp-Knopf, `.muted` 19 px bleibt, Charakter-Schwelle 700 px).
- Prüfungen: Typecheck 5/5, Client-Vitest 241/241, Save-Vault 42/42, Build grün, Clip-Audit final 0 Layout-Funde.
- Krypta-Erfolg: Fix `053d4c9` nie hochgeladen (letzter Upload 1.2.3 am 31.08. 14:19) — per Engine-Lauf mit Save 86 verifiziert. Ward Leech analysiert (stapelt nicht, stilles Log, `{pct}`). Beides in `design/plan-1.3.md`.

## 2026-09-10 — Navigation nach Chefkritik, RU-/Seitenanalyse, direkter Electron-Versuch

<!-- codex:2026-09-10T11:34:00+02:00 -->

- Sidebar-/Topbar-Quellcode nachgebessert: größere Buttons/Icons, tatsächliche Zentrierung, warme Goldtypografie, sichtbarere Bestands-Ironframes/Texturen.19px Namensziel/14px Untergrenze und Zeilenwachstum;150–200px eigener kompakter Zustand. Fixture-Fit gleichgezogen.
- Finale unabhängige Quellenreview ohne weiteren bestätigten P1/P2; Typecheck und statische Checks bestanden (188 Regeln,6URLs,35 Sprachwerte,20 reine Geometrieassertions;960 statische Markupvarianten,110 Ressourcen). Keine visuelle Abnahme behauptet.
- Drei read-only Fachprüfungen integriert; Bericht `notes/2026-09-10-ui-skalierung-ru-analyse.md` deckt aktive Seiten/Templates und wichtige Modale ab. Sechs nachweislich überbuchte Spaltenlayouts, weitere Text-/Höhenrisiken, priorisierter Folgeplan. Seitenweite Umsetzung nicht automatisch begonnen.
- Chef erlaubt direkten Electron-Test. EXE-Version32.3.3 funktioniert; vorherige pauschale Nichtstartbarkeitsaussage korrigiert. Isolierter Appstart mit neuem Profil/Steam0 versucht; native Prozesskommunikation scheitert mit Zugriff verweigert0x5. Trotz ShellExit0 kein erfolgreicher Sichttest/kein PNG. Helfer/Profil ausschließlich unter work/2026-09-10-interface-reforged/qa/; keine echten Spielstände geladen.
- Neuer Build erneut vor Kompilierung esbuild spawn EPERM. Bestehendes Rendererbundle vom01.09. keine aktuelle UI-Referenz. Keine Browser-/Sandboxumgehung, kein Globalzoom, keine neuen Bilder/Git-Schreiboperationen oder Saveänderungen. CURRENT/HANDOFF/IMPLEMENTATION aktualisiert.

## 2026-09-10 — Interface Reforged auf 1.3 umgesetzt

<!-- codex:2026-09-10T10:40:00+02:00 -->

- Chef-GO ausgeführt: Sidebar, Topbar/Status und Action Queue grafisch/responsiv überarbeitet; bestehende Iron-/Gravewood-/Basalt-Assets nur lokal neu gewichtet, keine Bild-Neugeneration.
- Sidebar/Queue/isolierte Fixture an getrennte Fachagenten; Root verantwortet gemeinsame CSS-Tokens, App/TopBar, Imports, sieben Sprachen und Integration. Unabhängige Quellenreviews der anderen Bereiche.
- Kompakte Frames, klare Navigation/Aktivität, containerabhängige Header-Reihen, eindeutig benannter XP-Skill, Queue-Materialtext/Stop/ein Scrollbereich. DnD-Einrasten für unterschiedlich hohe Folgezeilen korrigiert, keine Engine-/Saveänderung.
- Client-Typecheck mehrfach bestanden; statischer Gate:182 scoped Regeln,35 Sprachwerte,3 Material-URLs, TSX/Integrationsverträge und20 reine Drag-Geometrie-Assertions. Fixture:960 statische Markupfälle,16 abgewiesene Pfade,110 Ressourcen ohne Fehlreferenz. Scoped diff-check sauber.
- Build versucht: esbuild spawn EPERM vor Kompilierung. Queue-Vitest versucht: Worker spawn EPERM,0Tests. Sechs neue Drag-Vitestfälle angelegt. Browser-Skill nicht verfügbar, kein visueller/React-/Pointerbeweis. Keine Umgehung, kein Live-/Electron-/Savezugriff.
- Branch1.3 bestätigt; Fremddiffs und56 bereits integrierte Assets erhalten. Kein Git-Staging/Commit/Push/Release oder Paket-/Savebump. Checkpoint und Rest-QA: work/2026-09-10-interface-reforged/IMPLEMENTATION.md.

## 2026-09-10 — Grafische Interface-Analyse, keine Implementation

<!-- codex:2026-09-10T10:15:22+02:00 -->

- Sidebar, Topbar und Action Queue auf Branch `1.3` untersucht; tatsächliche Assets, aktive CSS-Kaskade, Consumer, bestehende Diffs und historische QA-Screenshots gelesen.
- Einen unabhängigen read-only UI-Fachagenten für Topbar/Queue eingesetzt. Root analysiert Sidebar und Material-/Rahmenwirkung; keine Runtime-/Assetedits.
- Bericht `CODEX/notes/2026-09-10-interface-analyse.md`: Befunde, Funktionsgrenzen, priorisierte Ashen-Iron-Verfeinerung, selektiver Grafikbedarf und Mockup-Abnahmematrix. Aktuelle Containerbreitenkonflikte getrennt von alten, inzwischen korrigierten Queue-Aufnahmen.
- Keine Behauptung zur Generatorversion der Bestandsassets. Keine neuen Bilder/HTML/Live-Starts oder Tests; Umsetzung benötigt nächsten Chefauftrag.

## 2026-09-10 — Erste 1.3-Änderung: 56 angenommene Assets integriert

<!-- codex:2026-09-10T09:46:12+02:00 -->

- Chef hat lokal auf `1.3` gewechselt. Branch und vorher leeren Assetdiff geprüft; andere umfangreiche Diffs unangetastet.
- Consumer-/Alias-/Maßverträge und je zwei Bestandsnachbarn geprüft. 56 Reviewmaster unter bestehenden IDs nach WebP q92/Alpha100 konvertiert; acht vollständige Leinwände proportional auf Bestandsgröße, kein Keying/Trim/Flip.
- 56 bytegenaue Original-Backups vor Ersetzung, vollständiges Hash-/Pfad-/Maßmanifest. Freigegebene PNGs und Raw-Master unverändert. Ergebnis exakt 56 Runtime-Asset-Ersetzungen, Slayer byteidentisch.
- Asset-Gate und unabhängiger read-only Kontrolleur vollständig bestanden. Sechs Vergleichsbögen mit Nachbarn; visuelle Konvertierungsstichproben auf Hell/Dunkel/Signalfarbe inkl. Nebel und Fasern. Größe zusammen +8,93 MiB, keine aggressive Alphakompression.
- Headless Client-Build ausgeführt, Exit1 wegen `esbuild: spawn EPERM` vor Kompilierung. Keine Umgehung/Live-App, kein Savezugriff. Buildnachweis offen und separat dokumentiert.
- Arbeitshelfer `integrate-1.3.mjs`, `INTEGRATION-1.3.md`, Integrations-QA und Chef-Abnahme aktualisiert; Reviewgalerie als historische Auswahl mit aktuellem Einbauhinweis gekennzeichnet. Manifestphase `integrated_on_1.3`.
- Keine Paket-/Saveversionsänderung, kein Staging/Commit/Push/Release. Camp-Nachtbilder unverändert, leerer Slot weiterhin ohne aktiven Consumer. Sicherungen und Nachweise unter `CODEX/assets/ausbesserungswelle-2026-09-09/integration-1.3/`.

## 2026-09-10 — Asset-Abnahme, neuer1.3-Branch am Git-Zugriff blockiert

<!-- codex:2026-09-10T09:26:52+02:00 -->

- Chef hat alle56 Vorschläge angenommen und Integration als erste Änderung eines neuen1.3-Branches beauftragt.
- Einstieg/Assetintegrationsregeln, Gitstatus, Branch und betroffene Assetdiffs geprüft. `git switch -c 1.3` scheitert an Permission denied für `.git/refs/heads/1.3.lock`; keine Umgehung.
- Nachprüfung: weiterhin1.2.4CL, neuer Branch fehlt, keine Runtimebilder ersetzt. Bestehende fremde Arbeit ungestaged erhalten; keine Konvertierung/Build/Commits.
- Freigabe und Fortsetzung in `CODEX/work/2026-09-09-ausbesserungswelle/INTEGRATION-1.3.md` dokumentiert. Chef muss den Branch lokal anlegen bzw. erlaubten Git-Schreibzugriff herstellen.

## 2026-09-10 — 15 Nachbesserungen und vollständige Reviewlieferung

<!-- codex:2026-09-10T09:18:36+02:00 -->

- Wiederaufnahme nach Chef-GO; drei vorhandene Bild-Agenten parallel und Root für Camp/Gegenprüfung. Alle15 markierten Motive erneut produziert:37 echte Aufrufe,36 nativeRGBA, ein erneut fehlgeschlagener RGB-Edit separat archiviert.
- Formfehler gezielt behoben: Ärmelperspektive, Monsteranatomie/-waffen, Sirenenflosse, dunkler Amulettkern, chaotisches Eis statt Schuppen, Fischflossen, Rauch und Camp-Größe/Position. Keine lokale Bildreparatur oder Skalierung; Restabweichungen bewusst dokumentiert.
- Beste Auswahl für alle56 Pfade gesichert;55 Motive plus Slayer-Alias. Unveränderte Raw- und Referenzbilder erhalten. Reviewhtml, Kategorie-Kontaktbögen und56 Einzelvergleiche mit Nachbarn aktualisiert.
- Striktes vollständiges Review-Gate bestanden:56 nativePNG-Master raw-/generatorgleich,56 Originale unverändert,56 Referenzen/Prompts, fünf disjunkte Lose,424 gültige Galerielinks. Alle Außenränder ohne Alpha>16; acht abweichende Pixelmaße markiert.
- Variantenmetadaten-Archiv und byteerhaltende Auswahl im Produktionshelfer ergänzt; vollständigen End-Gate im Validator ergänzt. Helfer-/Inline-Script-Syntax geprüft, kein Browser-/Spieltest und keine Runtimeintegration. Gitstatus nach anfänglichem Terminalblocker regulär geprüft, Fremdänderungen erhalten.
- Abschlussbericht `CODEX/assets/ausbesserungswelle-2026-09-09/status/revision-2026-09-10-root.md`; Manifestphase `review_ready_with_documented_differences`. Alle Agenten fertig, nächster Schritt Chef-Review.

## 2026-09-10 — Reviewvorschläge gespeichert, Chef-Pause

<!-- codex:2026-09-10T00:39:20+02:00 -->

- Alle fünf Bildlose bearbeitet, native Alpha-Ausgaben für56 Reviewpfade gesichert;41 Kandidaten,15 Nacharbeitsfälle, acht Maßabweichungen. Alle Originale im Produkt unangetastet.
- Exakte Standalone-Prompts, Raw-Versuche und Einzelvergleiche mit Nachbarn gespeichert; zusätzliche unabhängige Form-/Identitätsprüfung und gezielte Neuversuche durchgeführt.
- QA-Helfer um Randdeckkraftschwellen und klare Kandidaten-/Nacharbeitsanzeige ergänzt; Syntaxprüfung der beiden Helfer erfolgreich.
- Auf ausdrücklichen Pausenwunsch Abschluss-Galerie-/Validierungslauf beendet, keinen Gesamterfolg behauptet. Keine laufenden Bild-Agenten. Wiederaufnahmepunkt in `PAUSE-2026-09-10.md`, Manifestphase und Übergaben aktualisiert.

## 2026-09-09 — native Transparenz durch reinen Neuguss wieder erreicht

<!-- codex:2026-09-09T23:29:00+02:00 -->

- Neuer Talisman-PNG-Referenz-Edit erneut RGB/Karo. Reiner Neuguss ohne Bild-Edit-Argumente dagegen zweimal RGBA; korrigierte Fassung mit vier statt drei Federn gespeichert und auf drei Gründen geprüft.
- Originale/Nachbarn weiterhin visuell analysiert; exakte Beschreibung ersetzt die fehlgeschlagene Bild-Edit-Übergabe. Interne Ursache nicht als bewiesen behauptet.
- Drei Produktionsagenten für Los01/02/03 gestartet bzw. fortgesetzt; Los04/05 anschließend. Agent03 bestätigt native Transparenz unabhängig am Speisenmotiv.
- `PRODUCTION-AGENT.md` aktualisiert; Review-Helfer erhält historische Alpha-Fehlversuche auch nach späterem Erfolg. Keine Keying-/API-/Runtimeänderungen.

## 2026-09-09 — frühere native Alpha-Ausgabe gegen aktuellen Fehler verifiziert

<!-- codex:2026-09-09T23:16:34+02:00 -->

- Auf Chefeinwand alte Finaldateien bait_worm/rune_bounty sowie die alte bait_worm-Originalausgabe anhand source-map geprüft: tatsächlich benutztes Alpha vorhanden, auch bereits im Generatororiginal.
- Aktuelle Geier-Originalausgabe dagegen RGB ohne Alpha; kein beim lokalen Kopieren verlorener Alphakanal.
- `ALPHA-ALT-NEU.md` mit Pfaden, Messungen und Ursachengrenze abgelegt. Keine bewiesene technische Ursache für den Unterschied; keine weiteren Bildaufrufe oder Assetänderungen.

## 2026-09-09 — zwei weitere tatsächliche Bildgenerierungen ohne API-Key

<!-- codex:2026-09-09T23:10:49+02:00 -->

- Chef verwirft CLI/API-Umweg und verlangt eingebautes Imagegen. Keine Schlüssel-/SDK-Einrichtung nötig oder erfolgt.
- Geier mit Original-WebP neu erzeugt; zweite Gegenprobe als Hintergrundkorrektur aus der neuen PNG. Beide Bildaufrufe tatsächlich ausgeführt, Originale und Raw-Bytes unverändert erhalten.
- Beide Ausgaben RGB 1254² ohne Alpha; Karo sichtbar eingebrannt, zweiter Versuch wärmer als Vorlage. Zehn Raw-Ausgaben insgesamt, 0/56 brauchbare Reviewdateien.
- Einzelstatus, Vergleichsgalerien und Validierung aktualisiert: 56 unveränderte Runtimequellen, 56 Referenzen/Prompts, fünf Lose, 134 gültige Galerieziele. Keine Runtimeintegration.
- `RETRY-2026-09-09.md` dokumentiert beide exakten Aufrufe. Produktionsblocker bleibt nach zwei unterschiedlichen eingebauten Versuchen bestehen.

## 2026-09-09 — Native-Alpha-Fallback vorbereitet

<!-- codex:2026-09-09T22:56:25+02:00 -->

- Auf Chef-Bestätigung Imagegen-Fallback und aktuelle offizielle API-Dokumentation geprüft.
- Gebündelte CLI unverändert: zwei Dry-Runs (Image 1.5 und Image 2.5 Sunburst) mit Originalreferenz, transparentem PNG, high, 1024² bestanden; keine Live-Aufrufe.
- Schlüsselanwesenheit nur als Boolean geprüft: Prozess/User/Machine leer; Python 3.12.10/uv/Pillow verfügbar, openai-SDK fehlt. Keine Installation oder Secretdateisuche.
- `FALLBACK-CLI.md` und zwei Dry-Run-JSONs abgelegt. Neuere Doku nennt Image 2.5 mit Alpha; Sunburst-Einzeltest vorgeschlagen, Modell-/Kostenfreigabe und lokaler Schlüssel stehen aus.
- 0/56 saubere Reviewbilder unverändert; kein Keying, keine Runtimeänderung.

## 2026-09-09 — Ausbesserungswelle, fünf Agenten und technischer Produktionsstopp

<!-- codex:2026-09-09T22:48:35+02:00 -->

- Fünf Bild-Agenten mit disjunkten Losen tatsächlich eingesetzt, nach vollständigem 56-Prompt-Gate.
- Acht echte Imagegen-Ausgaben für fünf Motive: durchweg RGB-PNG ohne Alpha mit eingebranntem Karo, einschließlich dreier gezielter Neuversuche und zweier einfacher Primärreferenz-Gegenproben.
- 0/56 brauchbare Reviewdateien; Restproduktion gestoppt. Alle Raw-Ausgaben erhalten, keine CLI/API, kein Keying oder Runtimeeingriff.
- Review-Auftragsübersicht, getrennte Galerie abgewiesener Versuche, Einzelmessungen und Fortsetzungsnotiz angelegt.
- Abschlussprüfung: 56 vollständige Prompts, fünf disjunkte Lose, 130 gültige Galerieziele, 56/56 Quellen unverändert und Referenzen hashgleich. Keine Fertigmeldung für Bilder.

## 2026-09-09 — Ausbesserungswelle, Vorproduktion

<!-- codex:2026-09-09T22:38:00+02:00 -->

- Chef autorisiert referenznahe Neugenerierung der 56 bestätigten Auditfehler für Review und fünf Bild-Agenten.
- Alle 56 individuellen Analysen und vollständigen Prompts erstellt; 56 Quellenhashes gegen Runtime und 112 Nachbarreferenzen geprüft.
- Fünf disjunkte Lose und native-Alpha-QA-Helfer unter `CODEX/work/2026-09-09-ausbesserungswelle/` angelegt, Prompt-Gate bestanden.
- 55 einzigartige Motive; zwei Slayerpfade erhalten denselben Master. Keine Watch-Fälle und keine Runtimeänderungen.

## 2026-07-30 — Einrichtung

- Projektstruktur, Architektur, aktive Release-Zielsetzung und Claude-Agentenreviere analysiert.
- Grim Reach als aktives Produkt und Kreidestadt als separates Planungsprojekt dokumentiert.
- Dauerhafte Projektanweisung in `AGENTS.md` angelegt.
- Abgegrenzeten `CODEX/`-Arbeitsplatz mit Regeln, Projektwissen, Snapshot und Handoff eingerichtet.
- Optionalen, prüfenden Codex-Launcher angelegt.
- Dauerhafte Kommunikationsregel ergänzt: natürlicher Angestellten-/Berichtston und gut lesbare Gespräche mit dem Chef.
- Kontextdisziplin ergänzt: bei Orientierungsaufträgen nur Überblick und gezielte Stichproben, keine ungefragte Tiefenanalyse großer Codebereiche.
- Definitive Asset-Brief-Vorlage angelegt: Auftraggeber-Entscheidungsblock, Codex-Art-Direction, Lieferung/QA und Abnahme.
- Auftragseingang klargestellt: Ideen und Anweisungen können frei vom Chef oder von Claude kommen; Codex überträgt freie Aufträge selbst in die Vorlage.
- Dauerhafte Work-Persona „Mira Falk“ angelegt: erwachsene Visual Designerin und Asset-Spezialistin mit definiertem Aussehen, Charakter und Gesprächsstimme.
- Chef-Dauerregel ergänzt: neu erzeugte Spiel-Assets werden standardmäßig final transparent geliefert.
- Testauftrag „Dagger of Eternal Frost“ als Minimalbrief in die Asset-Vorlage übertragen und zur Produktion vorbereitet.
- Auftrag „Sidebar-Button-Neuausrichtung“ angelegt: zehn dreistufige Konzepttafeln statt der roten aktiven Button-Familie.
- Umfang auf Chef-Anweisung bei fünf Konzepten gestoppt; 01 Ashen Iron bis 05 Runed Basalt generiert, farberhaltend freigestellt, Alpha geprüft und als Vergleichstafel dokumentiert.
- Nach Chef-Feedback zweite Button-Runde 06–10 angelegt: nur Standardzustand, klar Medieval/Dark Fantasy, ohne futuristische Linien oder Neon. Fünf Assets generiert, farberhaltend freigestellt, Alpha geprüft und auf `comparison-board-medieval.png` zusammengeführt.
- Chef-Auswahl 08 „Ironbound Leather“ in ein vollständiges 9-Slice-Set überführt: Normal, Hover und Pressed / Active als PNG und WebP, `1826 × 331 px`, identische Alpha-Maske, Slice 90 / 150 / 90 / 150. Verhalten bei 240 × 42 px und 420 × 76 px geprüft; noch nicht ins Produkt integriert.
- Ironbound Leather auf direkte Chef-Freigabe in Sidebar und Topbar integriert: drei bestehende Produktions-WebPs nachvollziehbar ersetzt, vorherige Dateien gesichert und beide CSS-Slice-Blöcke minimal mit `codex:2026-07-30T17:56:55+02:00` angepasst. Interner TypeScript-Check: 0 Diagnosen; regulärer Build-Prozess durch Sandbox-`EPERM` blockiert.
- Nach Chef-Live-Test fünf simplere Kleinskalierungsrichtungen 11–15 erzeugt. Alle als PNG/WebP auf `1826 × 331 px` normalisiert, exakt 2 px transparent oben/unten und bei echten Sidebar-/Topbar-Größen geprüft; noch nicht produktiv integriert.
- Dauerregel für künftige Codearbeit ergänzt: Jeder Codex-Codeabschnitt erhält einen suchbaren `codex:<ISO-8601-Zeitstempel>`-Kommentar; kommentarfreie Formate werden stattdessen exakt in der Übergabe markiert.
- Chef-Auswahl 13 „Quiet Leather“ als vollständiges 9-Slice-Set mit Normal, Hover und Pressed umgesetzt und anstelle des vorläufigen Ironbound-Sets in Sidebar und Topbar integriert.
- Topbar-Buttons auf 46 px Mindesthöhe verschlankt; Sidebar und Topbar erhielten dezente Hover-/Pressed-Bewegung sowie eine `prefers-reduced-motion`-Absicherung.
- Zehn vollständige Dark-Fantasy-UI-Kit-Overview-Boards neu erzeugt, jeweils unmittelbar nach Fertigstellung unter `CODEX/assets/ui-kit-overviews/` abgelegt. Alle Sets enthalten drei Buttonformen, zwei Framearten, fünf Texturen, Slot, Progressbar, Tab, Badge, Divider, Scrollbar und drei originale mittelalterliche Hand-Cursor-States.
- Vergleichstafeln `comparison-board.png` und `comparison-preview.png`, Promptset, Index und Produktionsbrief erstellt. Die zehn Kit-Konzepte sind ausdrücklich noch nicht ins Produkt integriert.
- Frühere Border-Konzeptversuche wurden nach Chef-Feedback verworfen beziehungsweise durch den umfassenderen UI-Kit-Auftrag ersetzt.
- Chef wählte UI-Kit 06 „Gravewood & Bronze“ als neue verbindliche UI-Art-Direction.
- Vollständiges Gravewood-Produktionspaket unter `CODEX/assets/ui-kit-gravewood-production/` erzeugt: drei Buttonfamilien mit je Normal/Hover/Pressed/Disabled, zwei offene Frames, fünf nahtlose Texturen, leerer Slot, getrennte Progressbar-Layer, aktive/inaktive Tabs samt separatem Tab-Hebel, Badge, Divider, Scrollbar-Familie und drei Hand-Cursor-States.
- Insgesamt 73 direkt nutzbare PNG-/WebP-Produktionsdateien plus Quellen, 9-Slice-Metadaten, Hotspots, Laufzeitrenders und QA-Vorschauen abgelegt.
- Alpha-Geometrie innerhalb aller Buttonfamilien und Scrollbar-Handle-States gesperrt; horizontale Buttons auf exakt 2 px Transparenzrand oben/unten geprüft.
- Frames mit vollständig transparenter Mitte, Texturen mit exakt übereinstimmenden Gegenkanten und Controls in echten Kleinskalierungsrundläufen geprüft.
- Read-only Vorinventar für das nächste GO erstellt. Keine neue Gravewood-Datei wurde in `apps/client/**` integriert; Quiet Leather bleibt produktiv.
- Rollback-Vorgehen festgelegt: unmittelbar vor dem nächsten Integrationsschritt datierte Pfadkopie plus SHA-256 und Codex-Code-Marker.
- `.claude/**` unverändert gelassen.
- Chef-GO für New Haven ausgeführt: 74 bestehende `CODEX/CityAssets` plus 24 freigegebene
  Kontroll-Assets als 98 optimierte Runtime-WebPs integriert, alle 15 Gebäudefamilien gegen
  Content-IDs geprüft und Tag/Nacht samt Kartengrund, Leerplatz, Baustelle und Gerüst vollständig
  verdrahtet. Lokaler kosmetischer Lichtzyklus, Baumenü-Stufe-I-Vorschau und Platzierungsgeist
  ergänzt; 151 Client-Eingabedateien intern mit 0 TypeScript-Diagnosen geprüft. Backup und
  Integrationsbericht: `CODEX/outbox/2026-07-30-new-haven-runtime-preintegration/`.

## 2026-07-31 — Stabile Skill-Action-Cards

- Zehn neue Action-Card-Layoutsysteme als isolierte HTML-Kontrolltafel und zehn PNG-Previews
  erstellt; je Konzept Idle, Active/STOP, craftbares Vier-Input-Rezept und gesperrtes
  Vier-Input-Rezept bei fester Außenhöhe gezeigt.
- Ersten fachlich zu engen Zwei-Input-Pass vollständig unter
  `CODEX/AssetControl/ActionCardConcepts-2026-07-31/archive/rejected-two-input-pass/` archiviert.
- Chef-Auswahl `01 Fixed Dock` ausschließlich als Geometrievertrag produktiv umgesetzt;
  bestehende Action-Art, Citadel-/Gravewood-Rahmen, Buttons und Texturen beibehalten.
- `SkillPage.tsx` auf ein immer vorhandenes Vier-Slot-Ressourcenrack und eine feste
  STOP/Craftable/Locked-State-Platte umgebaut; Preset-Grid bleibt immer an derselben Position.
- `gravewood-actioncards.css` auf feste 720-px-Cards mit sechs unverformbaren Body-Zonen
  erweitert; Output-/Lootbereich intern begrenzt statt die Card zu verlängern.
- Vorherigen Runtime-Stand unter
  `CODEX/outbox/2026-07-31-action-card-layout01-prechange/` gesichert.
- QA: 672 Content-Inputs-Arrays, maximal vier; 151 TypeScript-Dateien ohne Diagnose;
  scoped CSS mit PostCSS fehlerfrei; zehn Previews vorhanden.

## 2026-07-31 — New Haven freie Platzierung

- Slot- und Polygonplatzierung durch freie, persistierte Platzierung auf der gesamten Karte ersetzt;
  nur Kartenrand und Gebäudeüberlappung bleiben geometrische Grenzen.
- Rathauskapazität auf 4/9/14 weitere Gebäude festgelegt und sämtliche sichtbare Slot-Sprache in
  New Haven auf Gebäudekapazität umgestellt.
- UI-lokalen Kostenlos-Debugschalter neben `List` ergänzt; er erlässt nur Kosten, nicht die übrigen
  Bauvoraussetzungen. Karten- und Listenbau verwenden dieselben Kosten- und Verfügbarkeitsregeln.
- Veralteten oberen New-Haven-Infoblock entfernt und Map, Baumenü sowie Liste ohne Seiten-Scrollbar
  auf die verfügbare Seitenhöhe gespannt; New-Haven-Listenkarten stilistisch angeglichen.
- Bindenden Teilentscheid unter `design/newhaven-freie-platzierung-entscheid-2026-07-31.md` und
  Vorher-Backup unter `CODEX/outbox/2026-07-31-new-haven-freebuild-prechange/` abgelegt.
- QA: vier TypeScript-Projekte mit 0 Diagnosen, `newhaven.css` fehlerfrei geparst und neun gezielte
  Engine-Invarianten bestanden; regulärer Vitest-Start in der Sandbox durch `spawn EPERM` blockiert.

## 2026-07-31 — Neue 9-Slice-Rahmenauswahl

- Fünf dickere Dark-Fantasy-Rahmen passend zur produktiven Sidebar als PNG und lossless WebP
  erzeugt; alle besitzen transparente Zentren und denselben 128-px-Slice-Vertrag.
- Klickbare HTML-Kontrollansicht, Vergleichstafel, Metadaten, Prompts und QA unter
  `CODEX/AssetControl/FrameSelection-2026-07-31/` abgelegt.
- Zu dünne Erstfassung im Kontrollordner archiviert; alte Konzeptfamilie mit Manifest nach
  `CODEX/assets/archive/2026-07-31-legacy-frame-concepts/` verschoben.
- Keine Rahmenvariante produktiv eingebunden; die endgültige Auswahl bleibt bei Chef/Claude.

## 2026-07-31 — New-Haven-Maßstab, Popups und Action-Card-Chrome

- Kartenpositionen als bestehende normalisierte Save-Werte bestätigt; gemeinsame Kollisionsbühne
  auf Town-Hall-Größe vergrößert und auf der 16:9-Karte pixelquadratisch gehalten.
- Für alle 15 Gebäudefamilien kuratierte Stufenskalierungen ergänzt; Rathaus bleibt Referenz 1,0,
  Fischerhütte I wurde auf 0,64 reduziert. Sprites nutzen vollständig sichtbares `contain`.
- Separaten Debug-Sofortabschluss neben dem Kosten-Debugmodus ergänzt; er verwendet den regulären
  Engine-Abschlussweg und erzeugt keinen persistenten Debugzustand.
- Gebäude-Popups auf einen einzigen kräftigen Außenrahmen, internes Scrollen, unverzerrte Art sowie
  stabile Effekt-, Kosten-, Refining- und Aktionsflächen umgebaut.
- Suffix-Chance aus der Skillkarten-Darstellung entfernt; Produces/Loot und Mastery mit einem
  vollständigen 5-px-Frame und Lederfläche versehen. Engine-Itemlogik und Saves blieben unberührt.

## 2026-07-31 — Ironwood Bastion als Default

- Fehlerhaften ersten Rahmenpass als verworfen archiviert und fünf vollständig neue 192-px-
  9-Slice-Kandidaten unter `CODEX/AssetControl/FrameSelection-2026-07-31-v2/` bereitgestellt.
- Chef-Auswahl 01 Ironwood Bastion auf den bestehenden 224×149/28-px-Runtime-Vertrag normalisiert
  und als zentrale `wooden_frame_with_corners.webp` eingesetzt. Damit wechseln Sidebar, Topbar und
  196 bisherige Default-Citadel-Konsumenten gemeinsam.
- Vorheriges Produktionsasset unter
  `CODEX/outbox/2026-07-31-ironwood-bastion-default-prechange/` gesichert.
- QA: vier TypeScript-Projekte ohne Diagnose; direkte CSS-Verbraucher mit PostCSS fehlerfrei;
  Runtime-WebP mit Alpha, transparentem Zentrum und ohne sichtbare grüne Chroma-Pixel.

## 2026-07-31 — Ironwood Slice-Safe und Basalt-Navigation

- Live-Screenshot als echten 9-Slice-Fehler bestätigt: Eckspangen lagen im Stretchsegment.
- Ironwood Bastion als neue Slice-safe-Quelle aufgebaut; alle Ornamente vollständig in die
  192-px-Ecken gebunden und die vier Kanten auf kontinuierliche Schienen reduziert.
- Transparente 1536×1024-Kontrollassets und kompatible 224×149/28-px-Runtime-Fassung erzeugt;
  beanstandete Vorfassung im Outbox-Rollback erhalten.
- Sidebar, Footer und Topbar auf eine 192 px gekachelte Basaltfläche umgestellt.
- Sidebar-Hover von allen Transform-/Filter-/Animations- und Pseudolayer-Cascaden getrennt;
  rechteckigen Active-Inset-Selector entfernt.

## 2026-07-31 — Ironwood L-Ecken und Sidebar-Statebereinigung

- Optisch losgelöste quadratische Eckplaketten durch verbundene Ironwood-L-Knoten ersetzt; ruhige
  Stretchschienen und der bestehende 224×149/28-px-Runtimevertrag bleiben erhalten.
- Echte 9-Slice-Kontrollvorschau für Sidebar, Topbar und Panel unter
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-runtime-l-corner.png` erzeugt.
- Sidebar-Hover auf identische Box-/Rahmen-/Texturgeometrie reduziert und letzte Kindfilter sowie den
  Außen-Glow entfernt; nur eine dezente Textfarbantwort bleibt.
- Footer-Systemaktionen wieder auf eine warme braune Gravewood-Fläche getrennt.
- Vorherige Square-Corner-Runtime-Fassung unter
  `CODEX/outbox/2026-07-31-ironwood-l-corner-prechange/` gesichert.

## 2026-07-31 — Warme Navigation und Character-Rahmenabgleich

- Sidebar-/Topbar-Chrome moderat verstärkt und ihre graue Basaltfläche durch dunkles warmes Leder
  ersetzt; die stabilen state-identischen Hoverregeln bleiben erhalten.
- Footer-Systemaktionen auf rötlich-schwarzen Stein umgestellt, damit Innenfläche und Ironwood-Rahmen
  nicht mehr denselben Braunwert teilen.
- Character, Equipment/Stats und Inventory auf einen gemeinsamen 18-px-Ironwood-Außenrahmen gebracht;
  keine neue Wrapper- oder Doppelrahmenebene ergänzt.
- Beide CSS-Dateien fehlerfrei mit PostCSS geparst; alle Asset-URLs vorhanden.

## 2026-07-31 — Frame-Button-Flächenclip

- Ersten `padding-box`-Hotfix nach Live-Befund als zu grob verworfen: Er verhinderte Überstand, ließ
  Flächen wegen der eingerückten Assetschiene aber sichtbar zu klein werden.
- Runtime-9-Slice stattdessen technisch edge-anchored aufgebaut: Schienen berühren alle vier echten
  Außenkanten, Slice 28 und transparentes Zentrum bleiben unverändert.
- Pauschalen Button-Clip wieder entfernt; Navigation nutzt erneut `border-box` unter dem jetzt
  randbündigen Chrome.
- Vergleichsvorschau und Rollback abgelegt; Asset- und PostCSS-QA fehlerfrei.

## 2026-07-31 — Skalierende Holz-Navigation und Background-Eigentümer

- Feste Sidebar-/Topbar-`border-image-width`-Werte durch begrenzt proportionale Werte auf Basis von
  `--sb-scale-eff` und `--tb-scale` ersetzt.
- Lederfläche der primären Navigation durch die vorhandene hochauflösende, tilebare Holztextur
  ersetzt; sämtliche Zustände bleiben material- und geometriegleich.
- Doppelten Equipment/Stats-Hintergrund entfernt und das äußere Tabpanel als alleinigen Owner
  festgelegt; Inventar-Taschenbild auf vollständige Owner-Füllung korrigiert.
- Skalierungs-Preview abgelegt, Assetpfade geprüft und beide Stylesheets mit PostCSS geparst.

## 2026-07-31 — War Table Ledger Main Menu

- Chef-Auswahl 02 als produktive responsive 2×2-Kommandotafel und geöffnetes Ledger-Layout in
  `MainMenu.tsx`/`menu.css` umgesetzt.
- Gemeinsamen Panelkopf mit Schließen-X ergänzt; erneuter Klick auf das aktive Register klappt das
  Fenster ebenfalls zu. Bestehende Save- und Optionshandler unverändert weiterverwendet.
- Klickbaren Vier-Screen-HTML-Prototypen mit Slot-, Karten-, Schalter-, Slider- und
  Rücknavigationsinteraktionen im AssetControl-Ordner angelegt.
- Client-Typecheck mit 151 Dateien und 0 Diagnosen; CSS, JavaScript, Navigationsziele und Assets
  statisch geprüft. Browser-Live-QA mangels verfügbarem Backend offen dokumentiert.

## 2026-07-31 — Eigenständige Menüfenster und New-Haven-Aspect-Fix

- Permanentes War-Table-Seitenregister entfernt; Main Menu, New Game, Load Game und Options wieder
  als eindeutige Bildschirmhierarchie mit lokalisierter Zurück-Navigation und Escape aufgebaut.
- Große nackte Holzfläche durch Basalt-Schale und Lederbuttonflächen ersetzt.
- New-Haven-Karte in flexible Stage plus exakte 1672:941-Weltfläche getrennt; `cover`-Cropping
  entfernt und alle Prozentpositionen auf den inneren Karten-Owner konzentriert.
- Tages-/Nachtasset beide 1672×941 geprüft; Client-Typecheck 151/0 und beide CSS-Parser fehlerfrei.

## 2026-07-31 — Zehn funktionale Item-Card-Konzepte

- Bestehende `ItemCell`-, `ItemTooltip`-, Inventory- und Equipment-Datenfälle untersucht.
- Zehn responsive HTML/CSS-Layouts mit identischem Unique-, Long-Name-/Many-Affix- und
  Quest-Stack-Stresstest im ItemCard-Kontrollordner angelegt.
- Klickbare Vergleichsansicht, Technik-/Assetdokumentation und statische DOM-/JS-/Asset-QA
  ergänzt; Produktionscode unangetastet gelassen.
- Headless-Browser-QA versucht und den Sandbox-Blocker (`spawn EPERM`) dokumentiert.

## 2026-07-31 — Ledger-Verdichtung und Materialkontrast

- New-/Load-Fenster auf einen einzigen inhaltsgebundenen Rahmen reduziert und fünf Save-Karten
  zentriert über die verfügbare Breite verteilt; Options separat groß und scrollbar belassen.
- Vollständigen Action-Card-Außenrahmen von 7 auf 14 px verdoppelt, ohne innere Zonen zu verändern.
- Sidebar und Topbar von braunem Holz auf kühlen Schiefer umgestellt; Footeraktionen durch hellere
  rauchige Bronze-/Oxblood-Fläche vom Schwarz gelöst.
- Vier Stylesheets geparst, sämtliche Materialpfade geprüft und Client-Typecheck mit 151/0 beendet.

## 2026-07-31 — New-Haven-Listenvertrag und Move-Modus

- New-Haven-Listenkarten auf feste 760-px-Action-Card-Zonen umgebaut; variable Build-/Refinery-
  Inhalte verändern die Außenhöhe nicht mehr.
- Gebäude-Art auf `contain`, eigene Steinbühne und kräftigen Ironwood-Rahmen umgestellt.
- Kostenlosen Move-Modus in Toolbar und Gebäude-Popup sichtbar gemacht; Drag außerhalb des Modus
  deaktiviert und vorhandene Prozent-Persistenz unverändert gelassen.
- Drei neue Move-Texte in allen sieben UI-Sprachen ergänzt.
- Client-Typecheck 151/0, CSS-Parse und lokale Assetpfade fehlerfrei verifiziert.

## 2026-07-31 — New-Haven-Kartenverdichtung und freie Überlappung

- Nach Live-Screenshot normalen Gebäudekartentyp von 760 auf 640 px verdichtet und den leeren
  Funktionsschacht entfernt; nur Refineries behalten einen 760-px-Funktionsdock.
- Gebäude-gegen-Gebäude-Kollision aus Platzieren und Verschieben entfernt.
- Positions-Sanitize so geändert, dass gültige überlappende Prozentpositionen erhalten bleiben.
- Engine-/Persistence-Tests und bindenden New-Haven-Entscheid auf die neue Chefregel aktualisiert.
- Client, Shared, Engine und Persistence mit insgesamt 343 TypeScript-Dateien ohne Diagnose geprüft.

## 2026-07-31 — Used-Iron-Navigationsrahmen

- Fünf unterschiedliche Eisenrahmen mit getrennten ImageGen-Aufrufen erzeugt.
- Chromaquellen archiviert, Alpha-PNGs lokal entkeyt, entspillt, getrimmt und pixelweise geprüft.
- Vergleichstafel und technisches Kontroll-README erstellt; keine Runtime-Assets ersetzt.

## 2026-08-01 — Bronze-Lipped-Iron 9-Slice integriert

- Chef-Auswahl 02 deterministisch zu einem 512×512-9-Slice-Atlas mit Slice 96 rekonstruiert.
- Alle Eckornamente in unverzerrten Zonen gehalten; Mittelkanten gespiegelt und nahtlos kachelbar gemacht.
- Neuen Rahmen ausschließlich auf Sidebar-Skillbuttons und Topbar-Tabs gebunden; Footer und globale
  Containerfamilien unverändert gelassen.
- Rollback, Atlas und Laufzeit-Stresstest abgelegt; PostCSS, Assetpfade und Alpha fehlerfrei geprüft;
  Client-Typecheck 151 Dateien, 0 Diagnosen.

## 2026-08-01 — Navigationsmaterial und nutzbare Innenhöhe

- Helles Cold Slate in Sidebar und Topbar durch vorhandenen nahtlosen fast schwarzen Basalt ersetzt.
- Sichtbare `border-image-width` von der kleineren layoutwirksamen `border-width` getrennt.
- Sidebarbuttons höher gesetzt, Iconboxen vollständig eingepasst und Topbar-Tabs auf volle Barhöhe gelegt.
- Kontrollpreview und Rollback abgelegt; PostCSS/Assetpfade sowie Client-Typecheck 151/0 verifiziert.

## 2026-08-01 — Sidebar-Schale und nahtfreier Holzrahmen

- Schwarzes Rosenmuster der Sidebar durch ruhige Gravewood-Fläche ersetzt; Kampfausklapper in die
  neue Eisen-/Basaltfamilie übernommen.
- Topbar um vertikale Rahmenluft ergänzt und Footeraktionen auf tiefes dunkles Leder gesetzt.
- Transparenten Zwischenraum in den 28-px-Ecken des Holzrahmens pixelgenau geschlossen und als
  sicheren Runtime-Alias an Sidebar-/Topbar-Schale gebunden.
- Alt-/Neu-Stresstest und Rollback abgelegt; PostCSS, lokale Assets und Client-Typecheck 195/0
  fehlerfrei verifiziert.

## 2026-08-01 — Globale Framebindung, New-Haven V2 und Fontlabor

- Sämtliche 198 Holzrahmen-Verweise in 36 Renderer-Stylesheets auf den nahtfreien Runtime-Alias
  migriert; gesperrtes Alt-WebP nicht gewaltsam überschrieben.
- Äußeren Topbar-Holzrahmen entfernt und doppeltes `.ds-button`-Holzchrome am Kampfausklapper
  abgeschaltet.
- New-Haven-Listenkarte und Gebäude-Popup auf responsive, feste Inhaltszonen mit ruhigen Stein-
  flächen, lesbarem Flavor, neuem Effektvergleich und eigenem Eisen-X umgebaut.
- Interaktives Sidebar-Fontlabor mit fünf lokalen Kandidaten und allen sieben Sprachen erstellt.
- 51 CSS-Dateien, sämtliche Assetpfade und Client-TypeScript 195/0 fehlerfrei geprüft.

## 2026-08-01 — Metamorphous global ausgewählt

- Chef-Auswahl aus dem Fontlabor als globale `--font-head`-Schrift umgesetzt.
- Explizite sprachgebundene Serif-Stacks für Russisch und Chinesisch ergänzt.
- CSS, lokale Fontdatei und Client-TypeScript 195/0 fehlerfrei geprüft; Rollback gesichert.

## 2026-08-01 — Fell Chronicle final und Dark-Fantasy-Mockups Runde 2

- Zwischenentscheid Metamorphous durch finale Chef-Auswahl Fell Chronicle ersetzt; RU-/ZH-Stacks
  unverändert sprachsicher gehalten.
- Varnyx Regular und Hellock ohne Dateikopie als lokale Kandidaten ins Fontlabor aufgenommen.
- Zu schlichte Cohesive-UI-Runde archiviert und fünf reichere, technisch abbildbare Gesamtsysteme
  samt konkreten Produktionsasset-Verträgen übernommen.
- Lokale Fonts, CSS/JS beider Kontrolllabore sowie Client-TypeScript ohne Fehler geprüft.

## 2026-08-01 — Warbanner-Item-Card und lesbare Sidebar-Zahlen

- ItemTooltip von hohem 480-px-Einspaltenaufbau auf das breite Konzept `05 — Warbanner Record`
  umgestellt: Bild/Lore links, Fakten/Effekte rechts, Statgruppen zweispaltig.
- Internen Tooltip-Scrollbereich entfernt und Bildbühne auf responsive 250–330 px gebracht.
- Haupt-Skilllevel für Fell Chronicle auf doppelte Grundgröße gesetzt; kleine Combat-Unterwerte
  bewusst unverändert gelassen.
- Rollback gesichert; CSS, lokale Assetpfade und Client-TypeScript 151/0 fehlerfrei geprüft.

## 2026-08-01 — Sidebar-Drawer, gleiche Topbar und Karten-Polish

- Sidebar-Level auf Metamorphous und 50 % der zwischenzeitlichen Größe zurückgestellt.
- Fünf Footeraktionen in einen hover-/fokus-/klickbaren Bottom-Drawer mit sieben lokalisierten
  Laschenlabels überführt.
- Neun Topbar-Tabs gleich breit gemacht; zellenrelative Schrift und Sidebar-Basaltfläche gebunden.
- New-Haven-Now/Next in zwei kompakte Karten getrennt und X-Steuerung verkleinert/verlagert.
- Warbanner-Divider vom Artwork getrennt, Suffixkopf bereinigt, Offense-Hierarchie und On-Hit-
  Material lesbarer und Diablo-näher aufgebaut; keine Werte oder Formeln geändert.
- Exocet wegen nicht geklärter Redistributionslizenz nicht kopiert; vorhandene Cinzel-/
  Metamorphous-Kombination scoped verwendet, RU-/ZH-Fallbacks erhalten.
- CSS, lokale Assets, sieben i18n-Varianten und Client-TypeScript 151/0 fehlerfrei geprüft.

## 2026-08-01 — Tooltip-Compare, Variantenliste und nächste Queue-Runde

- Damage-Zeilen gegen Label-/Wertüberlappung auf feste Grid-Spuren umgestellt.
- 37 alte eingebettete Bildpfeil-Aufrufe samt Renderer entfernt; `▲/▼` bleibt alleiniger
  Vergleichsindikator.
- Varianten-Pouch zu breiten responsiven Vergleichszeilen mit echten Suffix-/Enchant-Werten
  umgebaut.
- Menu-Drawer auf transparente Tab-Lasche und Topbar-Schale auf warmen Gravewood-Grund gesetzt.
- Action-Card-Produktausgabe zweizeilig strukturiert; Material-/Statuslesbarkeit und Fontbindung
  angehoben.
- Fünf funktionelle Action-Queue-Auswahlmockups lokal bereitgestellt; noch keine davon deployt.
- Rollback gesichert; CSS-/Asset-/HTML-Prüfung sauber, Client-TypeScript 151/0.

## 2026-08-01 — Korrekturpass Drawer, Tooltip, Options und Action Cards

- Falsche Goldzierleisten-Bindung des Drawers durch echte transparente Tab-Normal-/Aktivassets
  ersetzt.
- Damage-Zahl verkleinert; Enchantment und On-Hit in orange Legendary-Effektplatten überführt.
- Equipment-/Stats-Lederfläche gegen tilebaren kalten Schiefer ausgetauscht.
- Optionsseite auf volle Breite und V3-Schiefer-/Basalt-/Rahmenvertrag modernisiert.
- Bugreport zu Bug-/Feature-Feedback erweitert, Dialog neu gerahmt und alle sieben Sprachen
  aktualisiert.
- Action-Card-Höhe aus Output/Status/Preset in das Materialrack umverteilt; Preset-`×` entfernt.
- Zwei Rollbacks gesichert; sechs CSS-Dateien/Assets und Client-TypeScript 151/0 geprüft.

## 2026-08-01 — Fester Item-Raster-, Klick-Drawer- und Options-V3-Pass

- Drawer auf ausschließlich klickgesteuertes Öffnen umgestellt; transparente Lasche vom erst beim
  Öffnen sichtbaren Aktionshintergrund getrennt.
- Gleichmäßige Topbar-Abstände ergänzt, ohne die identischen Tabbreiten zurückzunehmen.
- Warbanner-Ausrüstungskarten auf 1040 px und benannte feste Statistikplätze erweitert; einfache
  Materialien in eine 620-px-Einspaltenkarte überführt; DPS in sieben Sprachen abgekürzt.
- Equip/Unequip/Sell auf Bronze-Lipped-Iron/Basalt umgestellt.
- Action-Card-Materialbilder und Mengen auf die verfügbare Vier-Slot-Fläche hochskaliert.
- Options und Feedback von heller Schieferwäsche auf dunklen Basalt, 22-px-Panelrahmen und aktuelle
  Eisenbuttons umgestellt; Feedback-Modal bis 1040 px vergrößert.
- New-Haven-Isometrie visuell diagnostiziert; keine Gebäude-/Map-Assets in diesem Pass verändert.
- Rollback gesichert; PostCSS/Assets sauber, Client-TypeScript 151/0. Electron-Vite-Build durch
  Sandbox-`spawn EPERM` blockiert und offen dokumentiert.

## 2026-08-01 — Offline-, Drawer-, Equipment- und Info-Bar-Pass

- Offline-Bericht vergrößert, 22-px-gerahmt und für besser lesbare 88-/104-px-Beuteslots neu
  proportioniert.
- Itembild-, Statistik- und Aktionsrahmen verdoppelt; transparente Füllungsbänder entfernt.
- Tatsächlich kaskadenwirksame Equipment-Lederfläche gegen warme tilebare Umber-Cloth-Textur
  ersetzt.
- Klick-Drawer-Lasche als echtes Overlay über einen passend gerahmten Aktionsblock gesetzt.
- Feedbackbanner auf denselben 22-px-Optionsrahmen wie alle Options-Hauptcontainer gebracht.
- Fünf funktionelle Info-Bar-HTML-Studien mit vorhandenen Assets und Zustandsumschaltung erstellt.
- Rollback gesichert; neun Produktions-CSS-Dateien, Mockup-CSS/-JS, Assets und Client-TypeScript
  151/0 geprüft. Browser und vollständiger Build waren in der Sandbox nicht startbar.

## 2026-08-01 — Warchain, Systemicons und Info-Bar-V2

- Sichtbare Options-/Feedback-Emoji-Platzhalter durch zwölf transparente Ashen-Iron-SVGs ersetzt.
- Alte Skill-Leerlaufzeile entfernt; Suche und Mastery auf den aktuellen UI-Vertrag gebracht.
- Action Queue nach der freigegebenen Studie „03 War Chain“ umgesetzt.
- Tooltip-Statistikfluss, Consumable-Karte, Offline-Scrollbar-Corner und Drawer-Öffnungsrichtung
  korrigiert.
- Fünf funktionelle Info-Bar-Studien V2 angelegt; Chef-Auswahl „05 Quiet Citadel“ vermerkt und
  ausgerichtet, noch nicht produktiv deployt.
- Rollback unter `CODEX/outbox/2026-08-01-ui-warchain-infobar-prechange/` gesichert.
- Acht Stylesheets, lokale Assetpfade, zwölf SVGs, Mockup-Skript und Client-TypeScript 151/0
  fehlerfrei geprüft; Browser-Laufzeit war in der Sitzung nicht initialisierbar.

## 2026-08-01 — Quiet Citadel produktiv und New Haven ohne Boden

- Bereits erteiltes Chef-GO für Info-Bar „Quiet Citadel 05“ korrigierend als Produktionsauftrag
  umgesetzt; vorhandene Selector-/Progresslogik unverändert weiterverwendet.
- Info-Bar auf dreigeteiltes Ashen-Iron-Raster mit Basaltfläche und aktuellem Eisenrahmen umgestellt.
- Geschlossenen Sidebar-Drawer vollständig transparent neben der freistehenden Lasche gemacht.
- Grounded-New-Haven-Serie als verworfene V1 eingestuft; vollständige Neuproduktion aller 15
  Gebäudefamilien als reine transparente Gebäudekomponenten beauftragt.
- Topbar-/Sidebar-CSS, lokale Assetpfade und Client-TypeScript 151/0 fehlerfrei geprüft.

## 2026-08-01 — Globale Ziffern, echter Overlay-Drawer und Major-Page-Layouts

- Cinzel als globale, per Unicode eingeschränkte Ziffernschicht vor Fell Chronicle gesetzt;
  tabellarische Lining-Zahlen und klare Sekundärschrift für Info-, XP- und Mastery-Panels ergänzt.
- Quiet-Citadel-Cluster mit sichtbarer Luft zu den Fortschrittsleisten versehen.
- Systemmenü-Drawer aus dem Sidebar-Layoutfluss gelöst: freistehende Lasche über dem Inhalt,
  keine vollbreite bemalte Footerfläche im geschlossenen Zustand.
- Funktionale 20er-HTML-Galerie mit je fünf Layouts für Companions, Shop, Bank und Quests erstellt.
- Produktions- und Mockup-CSS sowie Mockup-JavaScript parserseitig geprüft; Browserinstanz war
  nicht verfügbar, daher keine visuelle Browseraufnahme erzeugt.

## 2026-08-01 — Bank Vault Ledger und Quiet-Citadel-Nachschärfung

- Fünf funktionsnahe Bank-Layouts auf Basis der tatsächlichen Bankfunktionen erstellt; Chef wählte
  03 Vault Ledger und gab das Produktions-GO.
- Bank auf feste Content-Höhe mit kompaktem Voss-/Kapazitätskopf, zusammengeführter Befehlsleiste
  und zwei intern scrollenden quadratischen Inventar-Slotgrids umgestellt.
- Aktiven Slayer-Auftrag als eigenen Info-Bar-Cluster zwischen Aktivität und Ökonomie eingesetzt.
- Späten Metamorphous-Override der Item-Statistikziffern durch die klare Informationsschrift
  ersetzt und Menülasche vollständig oberhalb des Drawers ausgerichtet.
- Vier Produktions-CSS-Dateien, lokale UI-Assets sowie BankPage/App syntaktisch geprüft. Voller
  Program-Typecheck bleibt wegen des im installierten Workspace fehlenden `@types/node` offen.

## 2026-08-01 — Shop „Mux' Counter“

- Reale Shop-Verträge für Kauf, Verkauf, Kategorien, Upgrades, verlorene Meisterringe, Varianten,
  Massenverkauf und Rückkauf erfasst und in fünf funktionellen HTML-Layouts abgebildet.
- Nach Chef-Auswahl Konzept 01 produktiv implementiert: Warengruppen links, Warenraster mittig,
  fester Handelstresen rechts.
- Mengenwahl aus den wiederholten Warenkarten in den stabilen Tresen verlegt; konkrete Hinweise
  für Inventar voll und Goldmangel in allen sieben Sprachen ergänzt.
- Shop auf aktuelle Gravewood-V3-Rahmen sowie Basalt-/Cold-Slate-Flächen umgestellt und mit
  kontrollierten 1920-/Schmalbreiten-Fallbacks versehen.
- Client-TypeScript über 195 Quelldateien ohne Diagnose geprüft; Shop-CSS parserfehlerfrei und
  ohne fehlende lokale Assetpfade. Keine dedizierten Shop-Tests vorhanden, kein Electron-Start.

## 2026-08-01 — Shop-Viewport, Compare-Reflow und Companion-Seitenstudien

- Shop auf feste verfügbare Fensterhöhe umgestellt; äußeres Seitenscrolling entfernt und nur die
  Waren-/Verkaufsinhalte intern scrollbar belassen.
- Doppelten Itemvergleich viewportgebunden verdichtet und unter 940 px kontrolliert vertikal
  gestapelt, damit keine zweite Waffe mehr rechts außerhalb des sichtbaren Bereichs liegt.
- New-Haven-Groundless-V2 nach visueller Chefprüfung wegen inkohärenter Kamera/Projektion/
  Skalierung verworfen; Agent gestoppt, keine Produktionsbindung.
- Reale Companion-Funktionen und alle 21 Petdefinitionen geprüft; fünf neue interaktive,
  responsive Companion-HTML-Layouts ohne erfundene Subsysteme erstellt.
- Chef-Auswahl **03 Das Feldjournal des Jägers** als bevorzugte Companion-Layoutbasis vermerkt;
  Produktionsfreigabe steht noch aus.
- Pet-Neuproduktion mit drei Varianten pro Pet und strengem serienweiten Kamera-/Freistellungs-
  Vertrag in einen separaten Kontrollordner delegiert; A-bis-Z-Abnahme steht aus.
- Zu ähnliche Ashgut-Erstvarianten nach Chefprüfung verworfen; laufende Parent-/Teilagenten
  gestoppt und mit Altbild-Referenzverbot sowie deutlich strengerem Anatomie-/Silhouettenvertrag
  neu gestartet. Chef hob die geplante Ashgut-Zwischenabnahme anschließend auf: direkte Produktion
  aller 21 Companions mit je drei Varianten.
- Den anschließenden zu grotesken Dark-Fantasy-Restart ebenfalls nach Chefprüfung gestoppt und
  archiviert. Vollständige 21×3-Serie mit breiter, begehrenswerter Fantasy-Tonalität neu beauftragt.
- Mockup-JavaScript, CSS, alle lokalen Assets und Client-TypeScript (151 Dateien/0 Diagnosen)
  geprüft; kein Live-/Electron-Start.

## 2026-08-01 — Companion-Pets: vollständiger Fantasy-Auswahlbatch

<!-- codex:2026-08-01T23:45:57+02:00 -->

- Den nach Terminalabbruch unvollständigen Companion-Batch fortgesetzt und alle fehlenden Pets mit
  drei anatomisch unterschiedlichen Fantasy-Varianten fertiggestellt.
- Abschlussbestand unter `CODEX/AssetControl/CompanionPets-2026-08-01/`: 21/21 Pet-Ordner und
  63/63 Varianten; bestehende acht vollständige Pet-Familien nicht überschrieben.
- Sämtliche 63 PNGs auf 1024 × 1024, RGBA, echtes Alpha, mindestens neun Prozent Sicherheitsrand
  und null belegte Außenrandpixel geprüft; drei alphabetische Kontaktbögen erzeugt.
- Manifest auf `complete_pending_chef_selection` gesetzt und eine nachvollziehbare `QA.md`
  ergänzt. Keine Produktionsbindung und keine Änderung unter `.claude/**`.

## 2026-08-01 — Companion-Seite „Feldjournal des Jägers“

<!-- codex:2026-08-01T23:58:00+02:00 -->

- Nach ausdrücklichem Chef-GO Layout 03 aus der Companion-Einzelstudie produktiv umgesetzt.
- Altes Vier-Spalten-Kartenraster durch einen kompakten Fundindex und ein einzelnes großes Dossier
  ersetzt; Equip-/Unequip-, Owned-/Locked-, Herkunfts-, Effekt- und Dropchance-Logik bewahrt.
- Seite auf feste verfügbare Content-Höhe mit internem Index-/Dossier-Scrolling ausgelegt und an
  Gravewood-V3-Rahmen sowie Basalt-/Cold-Slate-/Umber-Cloth-Flächen angepasst.
- Vollständigen Client-Typecheck über 151 Dateien ohne Diagnose abgeschlossen; alle lokalen
  CSS-Assetpfade und die strukturelle CSS-Syntax geprüft. Kein Live-/Electron-Start.

## 2026-08-02 — Quest-Seite: fünf funktionelle Layoutstudien

<!-- codex:2026-08-02T00:15:00+02:00 -->

- Bestehende `QuestsPage.tsx`, Quest-/Chronicle-Styles und Daily-Quest-Spezifikation analysiert.
- Fünf neue, klar unterschiedliche Layouts mit gemeinsamer realer Funktionsbasis unter
  `CODEX/work/quest-layout-mockups-2026-08-02/` erstellt.
- Aschechronik, Auftragsstränge, sechs Dailies, Schwierigkeitsgrade, Reset, Tokenbestand,
  Belohnungslager, Auswahl, Claim und gesperrte Zustände interaktiv abgebildet.
- JavaScript, HTML-Struktur, CSS-Struktur und sämtliche lokalen Assetpfade statisch geprüft;
  Browser-Sichtprüfung war in der Sitzung mangels verfügbarer Browserinstanz nicht möglich.

## 2026-08-02 — Quest-Seite: Contract Wall 03 produktiv

<!-- codex:2026-08-02T00:42:00+02:00 -->

- Nach Chef-GO Konzept 03 aus der Quest-Einzelstudie produktiv umgesetzt.
- Wächter-/Tokenkopf, vier feste V3-Tabs und intern scrollende Tab-Arbeitsfläche eingeführt.
- Auftragsstränge zweispaltig links und Detailbühne rechts angeordnet; Chronik, Dailies und
  Token-Shop in dieselbe Contract-Wall-Hierarchie überführt.
- Alte Citadel-Holzrahmen im neuen Questscope durch Gravewood-V3-Rahmen sowie Basalt-, Cold-Slate-
  und Umber-Cloth-Flächen ersetzt; Questlogik, Engine, Saves, IDs und i18n nicht verändert.
- Client-TypeScript über 151 Dateien ohne Diagnose sowie beide CSS-Dateien und alle lokalen
  Assetpfade geprüft. Kein Live-/Electron-Start.

## 2026-08-02 — Rahmenkorrektur, Combat-Studie und responsive Informationsflächen

<!-- codex:2026-08-02T11:24:44+02:00 -->

- Quest- und Companion-Scope von den falschen V3-Rahmen auf Ironwood Bastion plus Bronze-Lipped
  Iron umgestellt; Questziel-/NPC-Texte vollständig, umbrechbar und normalgewichtet gemacht.
- Fünf funktionelle Combat-Layoutstudien erstellt; Chef wählte Frontline Ribbon 03.
- Quiet-Citadel-Info-Bar auf responsive Viewport-Typografie für 1080p und 3440×1440 umgestellt.
- Item-Warbanner für Rüstungen stabilisiert: Attribute links oben, Defense darunter, Suffix mit
  mehr Breite rechts; lange Suffixnamen umbrechen statt abzuschneiden.
- New-Haven-V2 ausdrücklich als verworfen bestätigt und eine neue kalibrierte Werkzeugpipeline
  statt erneuter unkontrollierter Batchgenerierung beauftragt.
- Client-TypeScript (151 Dateien, 0 Diagnosen), CSS-Struktur und Combat-Mockup-JavaScript headless
  geprüft; kein Live-/Electron-Start.

## 2026-08-02 — New-Haven Asset Foundry und Shop-Karten

<!-- codex:2026-08-02T11:52:06+02:00 -->

- Lokales New-Haven-Produktions-/QA-Werkzeug für 15 Familien × 3 Ränge und vier
  Kalibrierungsgebäude fertig geprüft; V2 nicht wiederverwendet und keine Produktionsbilder erzeugt.
- Falschen Basaltpfad im Werkzeug korrigiert; Promptpakete, Manifest, lokale Pfade und
  synthetische RGBA-QA bestanden.
- Shop-Karten auf Ironwood-Rahmen, dunkle Gravewood-Fläche und feste responsive Inhaltszeilen
  umgestellt; Hunting Bow nutzt das vorhandene Ashwood-Longbow-Bild zentral über `items.ts`.
- Keine Item-ID, Shoplogik, Engine, Balance oder `.claude/**` geändert.

## 2026-08-02 — Zehn Battle-Screen-Layoutstudien

<!-- codex:2026-08-02T12:18:49+02:00 -->

- Zehn funktionelle, responsive Battle-Screen-Architekturen mit realem Combat-Informationsvertrag
  und umschaltbaren Auflösungen/Kampfzuständen erstellt.
- Frontline-Log-Integration, große Kampfbühnen und adaptive Raster als vergleichbare Varianten
  umgesetzt; Designer empfiehlt Konzept 03 plus Responsive-Verhalten aus 10.
- HTML, CSS, JavaScript und lokale Assetpfade headless ohne Befund geprüft; mangels verfügbarer
  Browserinstanz keine visuelle Browserautomation und keine Produktionsänderung.

## 2026-08-02 — Combat-Layout produktiv vervollständigt

<!-- codex:2026-08-02T16:20:00+02:00 -->

- Frontline-Dock, Adaptive-Fortress-Arena und Battle-/Loot-Record als bestehenden Ist-Stand
  geprüft; Sitzungswerte in den Record-Fuß verschoben.
- Auto-Buff als echten einmaligen 50.000-Gold-Kauf samt Engine-Gate, Statistikbuchung,
  Save-Version 79, Migration/Sanitize und sieben Sprachen umgesetzt.
- TypeScript für Shared, Engine, Persistence und Client ohne Diagnosen; CSS-Struktur und
  Assetpfade ohne Befund. Vitest-Ausführung durch Sandbox-`spawn EPERM` blockiert.
- Combat-Gear-Stats gegen den 0px-Flex-Kollaps abgesichert und den Kampf-beenden-Button auf den
  aktuellen Bronze-Lipped-Iron/Gravewood-Stil umgestellt; Client-TypeScript erneut sauber.

## 2026-08-02 — New Haven Encampment V3 kalibriert

<!-- codex:2026-08-02T18:11:25+02:00 -->

- Fachwerk-/Dorf-Art-Direction aus der New-Haven-Foundry entfernt und verbindlich auf ein
  befestigtes Dark-Fantasy-Grenzlager mit rußigem Holz, Bruchstein, Eisen und Planen umgestellt.
- Town Hall, Watchtower, Fisher's Hut und Seed Garden als neue Rang-I-Kalibrierung generiert,
  freigestellt, auf 1536×1536/Anchor/Baseline normalisiert und im Asset-Control-Ordner abgelegt.
- Magenta-Despill besonders für Netze und Seile nachgeschärft; Kontroll-HTML und QA-JSON ergänzt.
- Keine Produktionsassets überschrieben und keine Laufzeitbindung vorgenommen.

## 2026-08-02 — New Haven Encampment V3 komplettiert

<!-- codex:2026-08-02T20:58:00+02:00 -->

- Vom Chef freigegebene Encampment-Kalibrierung auf sämtliche 15 Familien und drei Ränge ausgerollt.
- 45 Assets freigestellt, auf 1536×1536, x=768 und die gemeinsame Bodenlinie normalisiert; sämtliche
  Dateinamen, Alpha-/Canvas-Verträge und Rangflächen headless geprüft.
- Vollständige HTML-Abnahmegalerie, Gesamtübersicht und Produktions-QA im Asset-Control-Ordner ergänzt.
- Nur Staging/Foundry/Übergabedokumente verändert; keine Runtime-Bindung und keine `.claude/**`-Änderung.

## 2026-08-02 — New Haven Kartenmaßstab und Nachtabschluss

<!-- codex:2026-08-02T21:42:00+02:00 -->

- Alle Karten-Gebäudesprites auf Wunsch des Chefs geschlossen auf die doppelte bisherige Sichtgröße
  gesetzt, ohne die Ranghierarchie oder gespeicherten Prozentpositionen anzutasten.
- Lichtphase an die Karten-DOM weitergereicht; dauerhaften Bodenkontaktschatten und kühle
  Nachtanpassung für freigestellte Gebäude ergänzt.
- 45 Nachtvarianten, Tag-/Nacht-Campkarte und sechs generische Bauzustands-Assets fertiggestellt.
- Schmelzhütte II/III wegen zu geringer visueller Progression archiviert und eigenständig neu gebaut.
- Headless-Typecheck angestoßen; der lokale Windows-Sandboxprozess verweigerte den `pnpm`-Start mit
  `CreateProcessAsUserW failed: 5`, daher ist dieser Verifikationslauf noch extern nachzuholen.

## 2026-08-02 — Encampment V3 in Runtime übernommen

<!-- codex:2026-08-02T22:31:00+02:00 -->

- Chef-Freigabe umgesetzt und 98 New-Haven-Assets verlustarm als WebP in den automatischen
  Runtime-Importpfad übergeben.
- Vollständiges Pre-V3-Backup mit 98 WebP-Dateien angelegt.
- Dimensionen und Alpha aller Runtime-Dateien geprüft; 98/98 korrekt, keine Alpha-Abweichung zur
  freigegebenen Quelle.
- Schmelzhütte II/III vor Abschluss auf die tatsächliche gemeinsame Sprite-Baseline korrigiert.
- Typecheck/Build wegen einer lokalen Windows-Sandbox-Prozesssperre nicht ausführbar; kein
  Electron-/Live-Start durchgeführt.

## 2026-08-02 — New-Haven-Schlagschatten entfernt

<!-- codex:2026-08-02T22:45:00+02:00 -->

- Auf Chef-Sichtprüfung die CSS-`drop-shadow()`-Kaskade der Kartengebäude vollständig entfernt.
- Nacht- und Hover-Lesbarkeit bleibt über reine Helligkeit/Sättigung erhalten; keine Änderung an
  Assets, Platzierung, Skalierung oder Save-Daten.

## 2026-08-02 — New-Haven-Tagkarten und Nachtnebel

<!-- codex:2026-08-02T23:02:00+02:00 -->

- Listen-, Modal- und Baumenübilder auf die Tagvarianten festgesetzt; Nachtvarianten bleiben der
  platzierbaren Karte vorbehalten.
- Performante statische Nebelschicht über der gesamten Nachtkarte ergänzt, sodass Gebäude und
  Hintergrund atmosphärisch zusammengehören.

## 2026-08-02 — New-Haven-Kartenmodus konsolidiert

<!-- codex:2026-08-02T23:34:00+02:00 -->

- Widersprüchliche New-Haven-CSS-Pässe durch eine abschließende responsive Map-Mode-Schicht gebändigt.
- Toolbar, Kartenbühne, Baupalette, Gebäudelabel und Statusanzeigen an Ashen Iron angeglichen und für
  1920×1080/3440×1440 stabilisiert.
- CSS geparst, Assetpfade vollständig geprüft und alle fünf TypeScript-Projekte ohne Diagnose
  kompiliert. Build/Vitest bleiben durch die lokale `esbuild`-Sperre (`spawn EPERM`) offen.

## 2026-08-03 — Scrollfreier Abwesenheitsbericht und größere Camp-Kartenbilder

<!-- codex:2026-08-03T00:08:00+02:00 -->

- Offline-Bericht in feste Anker und ein adaptives mehrspaltiges Ergebnisraster gegliedert; internen
  Modal-Scrollweg entfernt und Collect dauerhaft sichtbar gehalten.
- New-Haven-Gebäudesprites innerhalb von Listen-/Detailkarten proportional auf 165 % vergrößert.
- Client-Typecheck sowie PostCSS-/Klammerprüfung beider Stylesheets ohne Diagnose abgeschlossen.

## 2026-08-03 — Item-Tooltip-Suffix-Overflow behoben

<!-- codex:2026-08-03T00:37:00+02:00 -->

- Equipment-Tooltip auf einen breiteren, responsiven Bild-/Datenvertrag umgestellt und feste innere
  Mindestbreiten entfernt, die den Statistikrahmen rechts aus dem Modal schoben.
- Statzeilen für Suffixe, Attribute, Defense, Skills und Misc mit getrennten Icon-, Label-, Wert- und
  Delta-Spuren abgesichert; lokalisierte Labels dürfen umbrechen, Zahlen bleiben vollständig sichtbar.
- `components.css` via PostCSS und Klammerbilanz geprüft; Client-TypeScript 151 Dateien/0 Diagnosen.
  Headless-Build bleibt wegen der lokalen Windows-Prozesssperre offen.

## 2026-08-03 — New-Haven-Kalibrierwerkzeug, Tiefensortierung und Smelter-Alpha

<!-- codex:2026-08-03T09:46:00+02:00 -->

- Objektgebundene Move-Werkzeugleiste für 1–300-%-Skalierung, Spiegelung und Rang-Reset umgesetzt;
  Gebäudenamen bleiben unabhängig von Sprite-Transforms stabil.
- Isometrische Zeichenreihenfolge über die untere Footprint-Kante eingeführt und sieben vom Chef
  gelieferte, stufenspezifische Standardwerte in `campArt.ts` übernommen.
- Zusammenschrumpfen/Überlaufen der Baupalettenkarten unterbunden; Liste bleibt intern scrollbar.
- Smelter II/III Tag/Nacht von verbundenen Chroma-Rändern bereinigt, Nachtalpha an Tagsilhouette
  gebunden sowie Originale und QA-Composites im CODEX-Arbeitsbereich abgelegt.
- Action-Queue-Nutztexte für 1080p auf klare Sekundärschrift und belastbarere Größen/Gewichte
  umgestellt; Item-Compare gegen den breiteren Einzelkartenvertrag abgesichert.
- Client-TypeScript ohne Diagnose; drei betroffene Stylesheets erfolgreich geparst und bilanziert.

## 2026-08-03 — New-Haven-Gebäudetags und Tag-/Nacht-Debug

<!-- codex:2026-08-03T12:10:00+02:00 -->

- Gebäudenamen vom unteren Hitboxrand auf 25 % der Hitboxhöhe versetzt und von Sprite-Transforms
  entkoppelt gehalten.
- Flüchtigen, lokalisierten Tag-/Nacht-Schalter für die visuelle Kartenprüfung ergänzt; keine
  Änderung an Engine- oder Save-Daten.
- Toolbar responsiv erweitert; Client-TypeScript und New-Haven-CSS ohne Diagnose geprüft.

## 2026-08-03 — New-Haven-Emblem und Read-only-Asset-Audit

<!-- codex:2026-08-03T11:27:39+02:00 -->

- Transparentes Ashen-Iron-New-Haven-Emblem als PNG/WebP produziert, für 14–20 px aufbereitet und
  mit einer tatsächlichen Kleinformat-/Pixelvorschau unter `CODEX/AssetControl/newhaven-emblem/`
  abgelegt.
- Maße, Alphakanal, transparente Ecken und Lesbarkeit geprüft; Prompt und Intake-Hinweis dokumentiert.
- Read-only-Sweep zu Asset-Abdeckung und verbliebenen Unicode-/Emoji-Platzhaltern in
  `CODEX/notes/2026-08-03-ui-asset-gap-sweep.md` abgelegt.
- Definitive Claude-Reviergrenze eingehalten: keine produktiven Code-, i18n- oder Runtime-Assets
  verändert; kein Save-Bump.

## 2026-08-03 — Micro-Icon-System: fünf Abnahme-Prüftafeln

<!-- codex:2026-08-03T11:51:35+02:00 -->

- 37 Micro-Icon-Konzepte in fünf zusammengehörigen Ashen-Iron-Sets vektorbasiert entworfen.
- Pro Set tatsächliche 14-/16-/20-px-Prüfung und 8×-Pixelinspektion gerendert; gemeinsame lokale
  HTML-Übersicht unter `CODEX/AssetControl/micro-icon-sets-2026-08-03/` abgelegt.
- Prüfgate respektiert: noch keine finalen 512er Einzeldateien und keinerlei Runtime-Verdrahtung.
- Produktivcode, Runtime-Assets, i18n und Save-Daten unangetastet; Auftrag wartet auf Abnahme.

## 2026-08-03 — Micro-Icon-System vollständig produziert

<!-- codex:2026-08-03T12:04:13+02:00 -->

- Nach Claude-GO alle 37 abgenommenen Glyphen als 512×512-PNG und verlustfreies WebP produziert:
  insgesamt 74 Finaldateien in fünf getrennten Produktionsordnern.
- Amboss- und Todesheilungs-Silhouetten gemäß Produktionsfeedback nachgeschärft; Prüftafeln neu
  gerendert und erneut visuell kontrolliert.
- Maße, Alpha, transparente Ecken, Sicherheitsrand, eindeutige IDs und Dateizahl vollständig geprüft.
  Queue-/System-Warnung in beiden Formaten per SHA256 als bitidentisch bestätigt.
- Produktivcode, Runtime-Pfade und i18n unangetastet; kein Save-Bump. Integration bleibt bei Claude.

## 2026-08-03 — Event-Artwork, System-Icon-Nachschlag und Wachstumskonzepte

<!-- codex:2026-08-03T13:43:00+02:00 -->

- New-Haven-Steam-Artwork im etablierten Patchlook als 800×450-Kapsel und 1920×622-Header erzeugt,
  typografisch deterministisch gesetzt und in beiden Zielgrößen visuell kontrolliert.
- Micro-Icon-System um `icon_sys_save` und `icon_sys_back` erweitert; Gesamtsystem erneut produziert
  und mit 39 IDs / 78 Finaldateien vollständig auf Maße, Alpha und Sicherheitsrand geprüft.
- Drei 1920×1080-Konzepttafeln zum sichtbaren Kartenwachstum auf dem unveränderten echten
  New-Haven-Kartengrund erstellt; zentrale freie Baufläche als feste Designinvariante dokumentiert.
- Ausschließlich CODEX-Staging/Work/Handoff bearbeitet; keine Runtime-, Code-, i18n- oder Save-Änderung.

## 2026-08-03 — Fight-Card-Rework: zehn HTML-Studien

<!-- codex:2026-08-03T14:37:38+02:00 -->

- Zehn responsive, interaktive Kampfkarte-Layouts mit vollständigem realem MonsterCard-
  Informationsvertrag im CODEX-AssetControl abgelegt.
- Zustände, Mengenwahl und 270–430-px-Breitentest integriert; wechselnde Inhalte besitzen feste
  Zonen und verändern die Außenmaße nicht.
- Lokale Assets vollständig, CSS bilanziert und JavaScript syntaktisch geparst; automatische
  Browser-Renderprüfung war wegen fehlender App-Browsersitzung/Sandbox-Prozesssperre nicht möglich.
- Produktivcode und Runtime unangetastet; kein Save-Bump.

## 2026-08-03 — Frontline Candidate für NPC-Fight-Cards

<!-- codex:2026-08-03T15:01:52+02:00 -->

- Vom Chef gewählte Fight-Card-Studie 10 als isolierte, spät importierte Renderer-CSS-Schicht
  produktiv eingebunden.
- Monster-, Elite-, Slayer- und weitere `monster-card`-Konsumenten auf zweispaltige Stats,
  größenstabile Informationsmodule sowie bestehende Ironwood-/Basaltassets umgestellt.
- CSS erfolgreich geparst und Asset-/Importpfade geprüft; Prozessbasierte Client-Gates durch die
  Windows-Sandbox blockiert. Kein Save-Bump.

## 2026-08-03 — Gear-Dock-Interior: drei HTML-Studien

<!-- codex:2026-08-03T16:31:00+02:00 -->

- Aktuellen Combat-Gear-Dock und Battle Record read-only gegen Claudes Brief geprüft.
- Drei responsive, interaktive Gear-Dock-Richtungen mit gemeinsamer Sprache für Gear, Skills,
  Style, Prep und einem eigenständigen 44-px-Kompaktrail im AssetControl abgelegt.
- Nur vorhandene Grim-Reach-Rahmen, Texturen und Itemassets genutzt; kein Produktivcode und kein
  Save-Bump. CSS/JS syntaktisch sowie alle lokalen Assetpfade statisch verifiziert.

## 2026-08-03 — Frontline Harness produktiv

<!-- codex:2026-08-03T17:21:00+02:00 -->

- Vom Chef gewählte Gear-Dock-Studie 03 als isolierte, spät importierte Renderer-CSS-Schicht
  produktiv umgesetzt.
- Paperdoll-Bühne, Tabs, Stats/Buffs, Skills, Style, Prep und 44-px-Rail auf den gemeinsamen
  Battle-Record-nahen Basalt-/Bronze-/Iron-Vertrag gebracht; React-, Handler- und Engine-Code
  unangetastet.
- 54 CSS-Regeln / 204 Deklarationen erfolgreich geparst, Scope und beide Runtime-Assetpfade
  vollständig geprüft. Kein Save-Bump.

<!-- codex:2026-08-03T17:41:00+02:00 -->
- Frontline-Harness-Außenhülle nach Chef-Screenshot mit dem 10-px-Rahmen und Umber-Hintergrund
  des Zonencontainers synchronisiert; CSS und Assetpfade erneut geprüft.

## 2026-08-03 — Load-Game-Kopfzeile und Achievements-Studien

<!-- codex:2026-08-03T18:42:00+02:00 -->

- Load-Game-Kopfzeile ohne React-Eingriff aus dem schwarzen Fremdbalken in das bestehende
  Gravewood-Ledger integriert; Styles vollständig auf den Load-Panel-Zustand begrenzt und geparst.
- Tatsächlichen Achievement-Funktionsvertrag inventarisiert und fünf responsive, interaktive
  Umbau-Studien im AssetControl erstellt. CSS, JavaScript und lokale Assets statisch verifiziert.
- Achievement-Produktion wartet auf Auswahl; kein Save-Bump.

## 2026-08-03 — Warden Ledger für Achievements produktiv

<!-- codex:2026-08-03T19:24:00+02:00 -->

- Chef-Auswahl 02 als dreispaltiges Achievement-Ledger mit Register, dichter Liste, Suche und
  permanentem Detailblatt umgesetzt; alle bestehenden Engine-/AP-/Meilensteinquellen erhalten.
- Claudes Micro-Icon-Verdrahtung vollständig übernommen und Koordinationsbrief abgeschlossen.
- TSX/Babel/TypeScript sowie 75 CSS-Regeln statisch geprüft; keine Achievement-Diagnose, alle
  Runtime-Assets vorhanden. Kein Save-Bump.

## 2026-08-03 — Steam Store 0.3.0, Capsule-Vorproduktion

<!-- codex:2026-08-03T19:34:00+02:00 -->

- Zwei Steam-Capsule-Familien in allen drei geforderten Massen aus freigegebenem Watchfire-Art
  und bestehendem Logo komponiert, visuell kontrolliert und per Pixelmass/Hash verifiziert.
- Gemeinsames Preview-Board, Capsule-Konzept, Shotlist, Trailer-/GIF-Storyboard, Manifest und
  Materialluecken im AssetControl-Staging abgelegt.
- Echte Gameplay-Aufbereitung bleibt offen, weil Claudes Capture-/Clip-Ordner und Index noch kein
  Material enthalten. Auftrag absichtlich nicht nach `inbox/done/` verschoben. Kein Save-Bump.

## 2026-08-03 — Steam-Beschreibungstafeln im Ashen-Iron-Stil

<!-- codex:2026-08-03T20:12:00+02:00 -->

- Vier bestehende Store-Panels neu gestaltet und um ein fuenftes New-Haven-Building-Panel aus
  echtem Capture erweitert; neue Serie im AssetControl-Staging abgelegt.
- Fehlerhafte offene SVG-Eckfuellungen sowie Titelornament-Ueberlappung waehrend visueller QA
  korrigiert. Fuenf Tafeln in Steam-Breite plus Gesamtpreview und Hashmanifest geprueft.
- Parallel eingetroffenes Claude-Material inventarisiert: acht Screenshots, vier Clips und Index
  vorhanden; Materialstatus aktualisiert. Produktive Altdateien noch nicht ersetzt. Kein Save-Bump.

<!-- codex:2026-08-03T20:18:00+02:00 -->
- Titelornament-Abstaende in Numbers und Skills nach Chef-Sichtpruefung korrigiert; Preview und
  Hashmanifest neu erzeugt.

<!-- codex:2026-08-03T20:24:00+02:00 -->
- World-Fights-Back-Tafel auf drei scharf freigestellte Elite-Runtime-Assets umgestellt; Preview
  und Pruefsummen aktualisiert.

## 2026-08-03 — Arena-Zonen 0.4.0, Pilot-Dreier

<!-- codex:2026-08-03T20:30:00+02:00 -->

- Pastures, Crypt und Slagpit als maximal gespreizte 2.5D-Arena-Pilotserie produziert; Pastures
  ergänzt, Crypt/Slagpit mit getrennten Boden- und Kulissenebenen neu aufgebaut.
- Zwölf freigestellte Props, gemeinsames Sonnen-Glow, drei 1920er Bühnen und vollständige
  Licht-/Fog-/Grade-Vorschläge im AssetControl-Staging abgelegt.
- Gerendertes Prop-Schachbrett technisch entfernt und Alpha auf zwei Kontrastgründen visuell
  geprüft. Keine Runtime- oder Save-Änderung; Runde 2 wartet auf Chef-Abnahme.
- Claudes nachgereichtes Manifest-Skelett gelesen und für alle drei Pilotzonen als valides JSON
  ausgefüllt; Pastures-Baseline erhalten, Crypt/Slagpit-Werte in die dokumentierten Runtime-
  Bereiche übersetzt. Kein Save-Bump.

## 2026-08-05 — Chicken-Pose-Pilot bis zur Kontrolltafel

<!-- codex:2026-08-05T09:08:17+02:00 -->

- Runtime-Master als feste Identitätsreferenz verwendet und Windup-, Strike- und
  Hit-Pose auf identischem 1254×1254-Canvas erzeugt.
- Chroma-Key technisch entfernt, violette Randkontamination nach visueller QA
  nachgereinigt und Alpha-Bounds sowie Flächendeckung geprüft.
- Vierer-Kontrolltafel im AssetControl-Staging abgelegt. Keine Runtime- oder
  Save-Änderung; Finalisierung wartet auf Chef-Abnahme.

## 2026-08-05 — Scene-Builder-Palette vollständig

<!-- codex:2026-08-05T09:50:35+02:00 -->

- 42 freigestellte Builder-Props erstellt: 24 generische Natur-/Bodenteile und
  je sechs Varianten für Pastures, Crypt und Slagpit.
- Alle Elemente auf Builder-Größen normalisiert, mit 8-px-Baseline-Puffer
  versehen und als Alpha-WebP abgelegt.
- Vier Bereichstafeln und eine Gesamtprüftafel gebaut. Zwei grüne
  Alt-Chroma-Flächen in der Felsserie gefunden und vor Übergabe korrigiert.
- INDEX, Alpha-/Baseline-/Chroma-QA und Handoff ergänzt. Keine Runtime- oder
  Save-Änderung; Claude übernimmt die Verdrahtung.

## 2026-08-23 — Grim Reach 1.0 Release-Artwork

<!-- codex:2026-08-23T17:38:21+02:00 -->

- Neues 1.0-Keyart im Built-in-ImageGen-Modus erzeugt und als gemeinsames Motiv für Titelbild
  1920×622 sowie Hauptkapsel 800×450 aufbereitet.
- Bestehendes `Grim Reach Idle`-Logo und `VERSION 1.0 · FULL RELEASE` deterministisch gesetzt;
  Logo-Safe-Area nach erster Zielgrößenprüfung korrigiert.
- Beide Final-PNGs, unbeschrifteter Source, gemeinsames Preview, Prompt, reproduzierbarer
  Compositor und Hash-/Maß-QA im CODEX-Staging dokumentiert. Keine Runtime- oder Save-Änderung.

<!-- codex:2026-08-23T17:51:05+02:00 -->

- Chef-Nachfix: Release-Plakette unter die vollständige Logo-Silhouette verschoben und von Gold
  auf gravierte Iron-/Crimson-Typografie im Logo-Stil umgestellt; beide Formate neu gerendert.

<!-- codex:2026-08-23T18:00:20+02:00 -->

- Rote Querornamente hinter der Release-Beschriftung nach Chef-QA entfernt; Diamantakzent erhalten
  und beide Zielgrößen samt Preview/Hashprüfung neu gerendert.

## 2026-08-23 — Native-Alpha- und ID-Abnahmeprozess

<!-- codex:2026-08-23T18:21:18+02:00 -->

- `design/asset-anforderungen.md` vollständig gelesen und als bindende Bildquelle in die aktiven
  CODEX-Regeln und die Asset-Pipeline aufgenommen.
- Chroma-Key als zulässige Option aus dem Asset-Brief entfernt; neue Native-Alpha-Promptvorlage
  und Claudes vollständiges sechsteiliges Abnahmegate ergänzt.
- 72 promptartige CODEX-Dateien klassifiziert: aktive Vorlagen sauber, 15 alte Chroma-Nennungen
  ausschließlich in historischen Arbeitsständen belassen. Keine Bild- oder Runtime-Änderung.

<!-- codex:2026-08-23T18:52:28+02:00 -->

- Claudes externen Nachtrag geprüft: zwei aktive Chroma-Prompts unter
  `Downloads\ASSETS\newGPTAssets\` vollständig auf natives Alpha umgeschrieben und als
  überschreibfertige TXT-Dateien in `CODEX/outbox/2026-08-23-newGPTAssets-native-alpha/`
  bereitgestellt.
- Je 33 exakte PNG-IDs und sechs Alpha-Pflichtblöcke bestätigt; `#FF00FF` und die widerlegte
  Behauptung saumfreier Magenta-Extraktion entfernt. Externe Kopie bleibt wegen Schreibgrenze auf
  `G:\GameDev` offen. Keine Bilder oder Runtime-Dateien verändert.

## 2026-08-23 — Neuguss-Pilot, erste drei Kreaturen

<!-- codex:2026-08-23T20:47:23+02:00 -->

- `mire_wisp`, `elite_crypt_icemage` und `elite_high_wyvern` referenzgebunden mit eingebautem
  ImageGen auf Rein-Grün neu erzeugt und in mehreren pinken Kontrastprüfungen freigestellt.
- Randverbundene Grün-Matte für das blaugrüne Irrlicht eingeführt; globale, motivzerstörende Matte
  verworfen. Despill, Teilalpha und Ein-Pixel-Kantenkorrektur auf alle drei Finals angewandt.
- Drei exakte 1254×1254-RGBA-PNGs nach `ASSETS/neuguss-2026-08-23/fertig/` geliefert; technischer
  Scan ohne sichtbares Magenta, helles Rein-Grün oder grün-dominante Teilalpha-Kanten.
- Keine Runtime-Datei verändert. Restliche elf Motive warten auf die Chef-Zwischenabnahme.

## 2026-08-23 — Neuguss Promptdatei 1 nach Zwischenabnahme

<!-- codex:2026-08-23T21:24:26+02:00 -->

- Chefkorrektur übernommen: weiches `mire_wisp` erhalten und `elite_high_wyvern` massiver mit
  zusätzlichen Rückenstacheln neu geliefert.
- `elite_slag_revenant` und `elite_coast_crab` referenzgebunden erzeugt, als farbsichere harte
  Motive kontrolliert freigestellt, despillt, kontrastgeprüft und mit exakten IDs abgelegt.
- Fünf Finals technisch gescannt: 1254×1254 RGBA, transparente Ecken, Teilalpha, keine sichtbaren
  Magenta- oder Key-Farbreste; Werte und Hashes im neuen Batch-QA.
- Neun komplexe Motive nach echten Alpha-Fehlschlägen nicht gekeyt und nicht ausgeliefert; ihre
  eingebrannten Schachbrett-/Weiß-Rohbilder bleiben ausschließlich im Arbeitsordner.
- Keine Runtime- oder `.claude/**`-Änderung; Companions noch nicht begonnen.

## 2026-08-24 — Neuguss und 21 Begleiter abgeschlossen

<!-- codex:2026-08-24T12:35:04+02:00 -->

- Alle 17 Neugüsse referenzgebunden fertiggestellt und exakt benannt in den vorgesehenen
  `fertig/`-Ordner gelegt. Nach Chefhinweis eingeschlossene weiße Schachbrettfelder entfernt und
  auf Schwarz, Grau und Magenta erneut visuell geprüft.
- Alle 21 Companion-Prompts als getrennte Motive mit eingebautem ImageGen umgesetzt. Natives
  RGBA beibehalten, farbige Niedrigalpha-Ränder motivfarbenkorrigiert und auf 1024×1024 mit
  800-Pixel-Silhouette normalisiert.
- Finalscan über 38 PNGs: vollständige exakte Dateisätze, keine technischen Verletzungen bei
  Maß, RGBA, Alpha oder Eckentransparenz. QA, Hashes und Kontaktbögen im CODEX-Arbeitsbereich.
- Keine Runtime-, Save-, i18n- oder `.claude/**`-Änderung; keine Produktionsintegration.

## 2026-08-24 — Companion-Neuguss mit zwei Bildserien

<!-- codex:2026-08-24T14:25:00+02:00 -->

- Ersten 21er-Companion-Batch nach direkter Chefkorrektur als zu naturtiernah verworfen und alle
  Begleiter mit eigenständiger, unmöglicher Fantasieanatomie neu gestaltet.
- Je ID ein Kartenmotiv und eine anatomisch gebundene, nach rechts gerichtete Kampfvariante erzeugt;
  insgesamt 42 Finals nach `fertig/card/` und `fertig/fight/` geliefert.
- Native Karten-Alphas kantenkorrigiert; neutrale Schachbrett-Rohhintergründe der Kampfvarianten
  komponentenweise entfernt. Auf Schwarz, Grau und Magenta keine weißen Restflächen oder Farbsäume.
- Final-QA bestanden: beide Serien vollständig und exakt benannt, 1024×1024 RGBA, transparente
  Ecken, Voll- und Teilalpha, Zielgröße der Silhouette eingehalten; Hashes und Werte dokumentiert.
- Verworfene 21 Alt-PNGs wiederherstellbar nach `CODEX/work/2026-08-24-companions-redesign/rejected-too-natural/`
  verschoben. Keine Runtime-, Produktdaten- oder `.claude/**`-Datei verändert.

## 2026-08-24 — Generische Patchnotes-Artworks

<!-- codex:2026-08-24T15:10:00+02:00 -->

- Versionsneutrale Ashen-Iron-Hintergrundillustration mit eingebautem ImageGen erzeugt und als
  wiederverwendbares Reparatur-/Verstärkungsmotiv für Hotfixes, Patches und Updates aufbereitet.
- Offizielles Grim-Reach-Logo und `PATCH NOTES` in Projekt-Cinzel deterministisch gesetzt; zwei
  finale PNGs in 1920×622 und 800×450 samt Vorschau, Quelle, Prompt und QA abgelegt.
- Beide Zielmaße und Hashes geprüft. Keine Runtime-, Produktdaten- oder `.claude/**`-Änderung.

## 2026-08-25 — Runen Tier IV und Schmuck-Linie

<!-- codex:2026-08-25T11:52:00+02:00 -->

- Vollständigen Brief, 14 Motivprompts, Assetvertrag, Claude-Rollen und Bestandsrunen geprüft.
  Designauflösung für Waffen-, Rüstungs- und Schmucklinie in Teil B des Briefs ergänzt.
- Drei Linienanker und elf Folgerunen mit eingebautem ImageGen erzeugt. Ausschließlich native
  Alpha-Ausgaben übernommen. Sechs Fassungen mit gemaltem Schachbrett technisch verworfen.
- 14 Rohdateien erhalten und 14 Finals ohne Keying auf 1024 × 1024 normalisiert. Exakte IDs,
  32-px-Safe-Area, sRGB, RGBA, Teilalpha und 80- bis 88-prozentige Steinhöhe bestätigt.
- Kontaktbögen auf drei Hintergründen, echte 64-/96-px-Vorschau und Vergleich neben Tier III
  visuell geprüft. Teil C ausgefüllt und Teil D zur Abnahme vorbereitet.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Änderung. Übergabe an Claude erfolgt
  aus `CODEX/assets/runen-tier-iv-2026-08-25/`.

## 2026-08-25 — Chef-Abnahme Runen Tier IV

<!-- codex:2026-08-25T11:00:35+02:00 -->

- Chef hat den vollständigen 14er-Batch ohne Korrekturen angenommen.
- Externe Gegenprüfung bestätigte Maße, RGBA, transparenten Außenrand, exakte IDs, saubere
  Tier-III-Familienbindung, getrennte Linienfarben und Lesbarkeit in Icon-Größe.
- Teil D des Briefs auf GO gesetzt. Die separate 640-px-WebP-Integration durch den zuständigen
  Agenten läuft. Keine Renderer- oder Archivdatei durch Mira verändert.

## 2026-08-25 — Achievement-Kategorie-Embleme

<!-- codex:2026-08-25T20:55:00+02:00 -->

- Vollständigen Asset-Brief, 13 Motivprompts, Alpha-Vertrag, UI-Loader, Warden-Ring-CSS,
  Bestandsicons und Runenanker geprüft. Teil B des Briefs vor Produktionsbeginn ausgefüllt.
- Trophäe, Kampf und Schriftrolle zuerst als native Alpha-Anker erzeugt und im exakten
  28-in-46-Ring geprüft. Danach den vollständigen Zehnerbatch im selben Serienkern umgesetzt.
- Amboss und Truhe nach der Maßprüfung als kompaktere Fassungen neu erzeugt. Alle zehn
  Pflichtembleme erreichen 434 oder 435 px opake Motivhöhe auf dem 512er-Canvas.
- Den flachen P2-Meilenstein zusätzlich ersetzt. Die bereits gemalte Kopf-Trophäe und
  Freigeschaltet-Plakette nach dem Qualitätsvergleich bewusst unverändert gelassen.
- 11 unveränderte 1254er-Raws und 11 finale 512er-PNGs geliefert. Native Alpha-Ausgaben nur
  transparent beschnitten, proportional skaliert und zentriert; kein Keying oder Freistellen.
- Finale QA samt Hashes, Schwarz-/Grau-/Grellrosa-Bögen, fünf Rarity-Ringen, gesperrter Reihe,
  Kleinformaten und Runenvergleich abgeschlossen. Brief Teil C dokumentiert; Teil D zur
  bindenden Gegenprüfung vorbereitet.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert. Übergabe erfolgt aus
  `CODEX/assets/achievement-icons-2026-08-25/` an Claude beziehungsweise `asset-integrator`.

## 2026-08-25 — Jägerumhang für den Slayer-Shop

<!-- codex:2026-08-25T21:34:00+02:00 -->

- Brief, Prompt, Assetvertrag und Slayer-Shop-Entscheid §4.4 geprüft. Bestandsumhänge,
  Slayer-Ausrüstung und Brenna-Porträt als Stil- und Wertigkeitskorridor verglichen.
- Zwei native Alpha-Fassungen des Jägerumhangs mit eingebautem ImageGen erzeugt. Einen vorherigen
  Entwurf mit halbtransparenter brauner Studiofläche technisch verworfen und nicht ausgeliefert.
- Variante A nach dem 48-/96-/128-px-Vergleich gewählt. Sie trägt die klarere Umhangsilhouette,
  sichtbares stumpfes Grünfutter, eine kleine Reißzahn-Schließe, Flicken und Saumkerben, bleibt aber
  unter der Material- und Ornamentwertigkeit des Seefahrer-Umhangs.
- Gewählte Fassung ohne Keying auf 1024 × 1024 normalisiert und exakt als
  `slayer_hunters_cape.png` geliefert. Beide gültigen 1254er-Generatorausgaben liegen unverändert
  in `raw/`.
- Technische QA bestanden: sRGB-RGBA, benutztes Alpha, Außenrand vollständig transparent,
  Motivhöhe 880 px, keine Glüh-, Hintergrund- oder Saumverletzung. Hashes und Kontaktbögen
  dokumentiert.
- Brief Teil B bis D, README und Übergabe abgeschlossen. Keine Renderer-, Content-, Save-, i18n-
  oder `.claude/**`-Datei verändert.

## 2026-08-26 — Belohnungsladen: sieben Kapitel-Belohnungen

<!-- codex:2026-08-26T10:26:05+02:00 -->

- Asset-Brief, sieben Serienprompts, Alpha-Vertrag, bindenden Belohnungsladen-Entscheid und
  typgleiche Bestandsitems geprüft; Designauflösung in Teil B festgehalten.
- Chronisten-Signet und Auftragsmarke zuerst als Serienanker mit eingebautem ImageGen erzeugt und
  auf drei Hintergründen geprüft. Danach fünf Folgestücke im gleichen Licht- und Materialguss
  umgesetzt.
- Fassungen mit knappem Rand, Schachbrett, Studiovignette oder zu leuchtendem Ascheriss verworfen.
  Ausschließlich sieben native Alpha-Erzeugungen in `raw/` übernommen.
- Sieben Finals ohne Keying auf 1024 × 1024 normalisiert und exakt nach den Content-IDs geliefert.
  Technische Gates für sRGB-RGBA, transparenten Außenrand, 80- bis 90-prozentige Motivhöhe und
  exakte Dateimenge bestanden; Hashes in `qa.json` dokumentiert.
- Schwarz-/Grau-/Grellrosa-Bögen, Bestandsvergleich und 48-/96-/128-px-Kontaktbogen visuell
  geprüft. Brief Teil C/D, README und Übergabe abgeschlossen.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Stil-Parität: 47 Item-Bilder

<!-- codex:2026-08-26T14:18:00+02:00 -->

- Asset-Brief, 47 Einzelprompts, Bestandsreferenzen und Alpha-Vertrag geprüft; Designauflösung
  und autonomes Qualitäts-Gate in Teil B dokumentiert.
- 47 Motive mit eingebautem ImageGen im Standardmodus und nativem Alpha erzeugt: A1 10 Bögen,
  A2 8 Magie-Items, A3 11 Lederteile, A4 16 Stoffteile und A7 2 Tonika.
- Nach Chef-Hinweis sämtliche zehn Bögen neu gegossen und einzeln auf funktionale Bogenmechanik
  geprüft: durchgehender Stab, ausbalancierte Wurfarme, klare Nocken, gerade gespannte Sehne.
- Drei zu breite A4-Paarfassungen kompakter neu erzeugt. Alle 47 angenommenen Raws unverändert
  archiviert; Finals ohne Keying proportional auf 1024 × 1024 bottom-center normalisiert.
- Technische QA bestanden: exakte Dateimenge und IDs, sRGB-RGBA, Alpha 0 bis 255, äußerer
  16-px-Rand Alpha 0, Motivhöhe 850 bis 880 px. Hashes in `qa/qa.json`.
- Je Gruppe Schwarz-/Grau-/Grellrosa-/Transparent-Bögen, Bestandsvergleich und
  48-/96-/175-px-Probe visuell geprüft. Brief Teil C/D, README und Übergabe abgeschlossen.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert. Übergabe aus
  `CODEX/assets/stil-paritaet-2026-08-26/` an Claude und danach `asset-integrator`.

## 2026-08-26 — Item-Wiki-Modal: fünf Mockup-Richtungen

<!-- codex:2026-08-26T14:48:00+02:00 -->

- Chef-Screenshot, Ashen-Iron-/Gravewood-Vorgaben und UI-Revierregeln geprüft; freien Auftrag in
  einen lokalen Brief und fünf strukturierte Prompts übertragen.
- Fünf eigenständige High-Fidelity-Mockups mit eingebautem ImageGen im Standardmodus erzeugt:
  Buchregister, Herstellungsgraph, filterbares Archiv, Tabellenindex und Item-Showcase.
- Alle fünf Bilder einzeln visuell geprüft, im Staging gesichert und in einem nummerierten
  Kontaktbogen zusammengeführt.
- Variante 3 als beste Balance aus Item-Präsenz, langer Rezeptliste und späterer HTML/CSS-
  Umsetzbarkeit empfohlen; Chefentscheidung ausstehend.
- Keine Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Main-Menü und Item-Stack, je fünf Design-Mockups

<!-- codex:2026-08-26T16:03:00+02:00 -->

- Aktuellen Main-Menü-Screenshot, `MainMenu.tsx`, `menu.css`, das aktuelle Item-Stack-Modal und
  die zuvor abgenommene Ashen-Iron-Wiki-Richtung als Referenzen geprüft.
- Fünf gepaarte Designfamilien ausgearbeitet und mit dem eingebauten ImageGen-Werkzeug erzeugt:
  Ashen Gate, War Table, Black Chronicle, Frontline Registry und Ember Reliquary.
- Insgesamt zehn PNG-Mockups geliefert: fünf Main-Menüs und fünf Item-Stack-Modals.
- Alle Dateien auf Format und Abmessung geprüft; pro Screen einen Kontaktbogen sowie einen
  gepaarten Gesamtbogen erstellt und visuell kontrolliert.
- Brief, Prompt-Set und Referenzkopien im Work-Ordner sowie Staging-README ergänzt.
- Keine HTML-, Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Ausgewählte Main-Menüs und Item-Stack als HTML

<!-- codex:2026-08-26T16:42:00+02:00 -->

- Chef-Auswahl Main 01/02/04 und Item-Stack 02 in einen eigenen Standalone-Outbox-Auftrag
  übertragen; MainMenu-Struktur, Styles und passende Originalassets geprüft.
- Vier interaktive HTML-Seiten, gemeinsame Auswahlseite, gemeinsames CSS und JavaScript gebaut.
- Item-Stack mit Variantenwahl, Vergleichspanel, Qualitätswerten, Verkaufspreis und Filterzuständen
  umgesetzt; Main-Menüs mit Sprachwahl und Aktionsfeedback versehen.
- 24 bestehende Grim-Reach-Assets lokal kopiert. Nach Chefkorrektur zusätzlich echtes Gate-Overlay
  und deckenden War-Table-Hintergrund erzeugt und eingebaut.
- Statische QA bestanden; visuelle Browserprüfung mangels verfügbarem Browser-Backend offen
  dokumentiert.
- Keine Produktions-, Renderer-, React-, i18n-, Engine-, Content- oder `.claude/**`-Datei
  verändert.

### Korrekturrunde Großmotive

<!-- codex:2026-08-26T17:08:00+02:00 -->

- CSS-Andeutung des Ashen Gate durch ein vollständiges gemaltes RGBA-Overlay ersetzt.
- Main 02 auf eine neue deckende Grim-Reach-War-Table-Hintergrundkomposition umgestellt.
- Gate-Alpha gemessen, beide Assets gegen Originalpanorama und Logo komponiert und visuell geprüft.
- Zwei schachbrettgemalte RGB-Freistellversuche verworfen; kein Keying eingesetzt.
- README, QA, Promptprotokoll und Handoff korrigiert.

### Item-Stack-War-Table-Schale

<!-- codex:2026-08-26T17:24:00+02:00 -->

- Für das Item-Stack-Modal eine eigene leere War-Table-/Iron-Shell erzeugt und eingebaut.
- Desktop-Grid und Kopf-/Filterhöhen an die gemalte Schale angepasst; Responsive-Fallback auf
  bestehende skalierbare Spielrahmen ergänzt.
- RGB-Maße geprüft und Platzierungs-Komposit mit Originalhelm visuell kontrolliert.

## 2026-08-26 — Item-Wiki HTML-Prototypen 02 und 05

<!-- codex:2026-08-26T15:24:00+02:00 -->

- Aktuelle `ItemWikiModal`-Komponente, Reverse-Indices, Wiki-CSS, Ashen-Iron-Tokens,
  Gravewood-Assets und UI-Dev-Revierregeln geprüft.
- Forge Flow als Quelle→Item→Verwendungen-Prototyp mit vier auswählbaren Beispielquellen,
  Waffen-/Rüstungsfilter und dynamischem Detailband umgesetzt.
- Relic Showcase als Item-Hero mit Mehrquellen-Band, auswählbaren Herkunftswegen, horizontaler
  Verwendungsgalerie und dynamischer Detailzeile umgesetzt.
- Gemeinsame Vergleichsseite, lokale Kopien der vorhandenen Items/Icons/Texturen/Fonts,
  responsive Zustände bei 1180 und 760 px sowie README/QA ergänzt.
- Statisch geprüft: keine fehlenden lokalen Referenzen, JavaScript syntaktisch gültig,
  CSS-Blockstruktur ausgeglichen. Browser-Screenshotprüfung mangels verfügbarem Browser-Backend
  offen dokumentiert.
- Keine Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Main-Menü-Unterseiten, je fünf Design-Mockups

<!-- codex:2026-08-26T18:52:00+02:00 -->

- Aktuelle New-Game- und Character-Creation-Screens, die vorhandene Load-Game-Inhaltsstruktur
  sowie die fünf zuvor entwickelten Hauptmenüfamilien als Referenzen geprüft.
- Je fünf reine Designmockups für New Game, Load Game und Character Creation mit eingebautem
  ImageGen im Standardmodus erzeugt; kein HTML und kein Produktcode.
- Ashen Gate, War Table, Frontline Registry, Black Chronicle und Ember Reliquary konsequent als
  gepaarte Familien über alle drei Screens geführt.
- 15 Einzel-PNGs auf 1672 × 941 RGB geprüft und in drei Stagingordner kopiert. Drei
  Screen-Kontaktbögen und einen familienweise sortierten Gesamtvergleich erzeugt und visuell
  kontrolliert.
- Brief, Promptset, Referenzen, Staging-README und reproduzierbare Hilfsskripte dokumentiert.
- Keine Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-26 — Ausgewählte Untermenüs als HTML-Prototypen

<!-- codex:2026-08-26T19:36:00+02:00 -->

- Chef-Auswahl Character Creation 03 sowie Load/New Game 05 in drei eigenständige interaktive
  Standalone-Seiten und eine gemeinsame Auswahlseite übertragen.
- Gemeinsame Ember-Reliquary-Landschaft ohne UI/Text mit eingebautem ImageGen erzeugt. Einen
  RGB-Schachbrett-Helden verworfen und ohne Keying durch den bestehenden echten Alpha-Helden
  ersetzt.
- Save-Slotwechsel, Load-/Leerzustände, Delete-Bestätigung, Name, Porträts, Startstile,
  Schrittleiste und Abschlussfeedback in lokalem JavaScript umgesetzt.
- Spielrahmen, Buttonflächen, Texturen, Logo, Porträts, Stilbilder und Fonts als lokale Kopien
  verwendet; keine Quelle verändert.
- Statische QA bestanden: keine fehlenden Referenzen, JavaScript gültig, CSS-Bilanz ausgeglichen,
  Assetmodi und -maße geprüft. Browser-Live-QA mangels verfügbarer Browserinstanz offen
  dokumentiert.
- Keine Renderer-, React-, produktive CSS-, i18n-, Engine-, Content-, Save- oder `.claude/**`-
  Datei verändert.

## 2026-08-26 — Human-Roster: Vertrag und Pilot

<!-- codex:2026-08-26T20:52:00+02:00 -->

- 30 freigegebene Human-Archetypen in 60 feste, unterscheidbare Identitätsprofile übertragen.
- Serienregeln um identischen Paar-Loadout, moderate geschlechtsspezifische Kleidungsvariation und
  verpflichtende Rechtsorientierung von Körper, Gesicht und Blick ergänzt.
- Sechs Pilotfiguren für Krieger, Feuermagier und Schurke mit eingebautem ImageGen erzeugt; drei
  weibliche Varianten nach Chefkorrektur neu gegossen.
- Sechs referenzgebundene RGB-Fehlausgaben am Alpha-Gate verworfen. Akzeptierte Finals besitzen
  natives RGBA; kein Keying.
- Finals auf Bestandsbelegung normiert, Alpha/Format/Maße gemessen und auf hellem sowie dunklem
  Kontaktbogen visuell geprüft.
- Staging unter `CODEX/assets/human-character-roster-2026-08-26/`; keine Renderer-Integration.

## 2026-08-26 — Buckhide-Set und Jagdbogen

<!-- codex:2026-08-26T21:32:00+02:00 -->

- Fünf Wildleder-Rüstungsteile und einen funktional gezeichneten Jagdbogen mit eingebautem
  ImageGen im Standardmodus erzeugt.
- Ein deckendes Beinling-Ergebnis am Alpha-Gate verworfen und nativ transparent neu erzeugt;
  kein Keying.
- Sechs akzeptierte Raws nach Staging kopiert und Finals slotweise auf 1024² sowie die gemessene
  Bestandsbelegung normiert.
- Format, Alpha, Rand, Content-ID, Slotlesbarkeit, Effektfreiheit und Bogengeometrie geprüft.
- Kontaktbögen auf dunkel, hell, grellrosa, in 48 px und neben `cured_leather_body` sowie
  `bronze_shortbow` erstellt und visuell abgenommen.
- Brief Teil B bis D, Promptprotokoll, README und QA vervollständigt; keine Renderer-Integration.

## 2026-08-26 — Patchnote-Artwork 1.1.0

<!-- codex:2026-08-26T22:02:00+02:00 -->

- Neues textloses Slayer's-Ledger-Keyart mit eingebautem ImageGen erzeugt.
- Offizielles Logo, `PATCH #2 · VERSION 1.1.0` und `THE SLAYER'S LEDGER` deterministisch gesetzt.
- Titelbild 1920 × 622 und Hauptkapsel 800 × 450 gebaut und visuell geprüft.
- Zielgrößen-Vorschau, Hash-/Maßprotokoll, Brief, Prompt und Staging-README dokumentiert.
- Keine Produkt- oder Steam-Integration durchgeführt.

## 2026-08-26 — Human Character Roster vollständig

<!-- codex:2026-08-26T23:08:00+02:00 -->

- Nach dem abgenommenen Sechser-Pilot die verbleibenden 54 Humans mit eingebautem ImageGen im
  Standardmodus produziert; Gesamtstand 60/60.
- 15 Kampfklassen und 15 Berufe als männlich/weibliche Paare mit gesperrten gemeinsamen
  Waffen-/Werkzeug-Loadouts, getrennten Identitäten und konsequentem Rechtsblick umgesetzt.
- Native akzeptierte RGBA-Ausgaben in `raw/` gesichert und auf einheitliche Finals 1086 × 1448
  mit 84–92 % Zielbelegung normiert; kein Keying und kein nachträgliches Freistellen.
- 60 Dateinamen, Pixel-Format, Maße, transparenter Außenrand und Alphakanal-Belegung geprüft;
  gemessener Bereich 84,12–87,98 %, keine Abweichung.
- `BRIEF.md`, `ROSTER.md`, vollständiges Serien-Promptset, Staging-README, QA und Übergabe
  abgeschlossen. Keine Renderer-Integration.

## 2026-08-26 — Elf Character Creator Demo

<!-- codex:2026-08-26T23:57:41+02:00 -->

- Acht Elfen-Assets als Demo produziert: Krieger, Waldläufer, Juwelier und Verzauberer, je
  männlich und weiblich, alle eindeutig nach Bildschirm-rechts.
- Kampfklassen in Bereitschaftshaltung umgesetzt; Berufsfiguren über konsistente Werkzeuge und
  ruhige Arbeitshaltung abgegrenzt.
- RGB-Fehlversuche aus der ersten Promptfassung verworfen und die Serie auf einen gemessenen
  nativen RGBA-Weg umgestellt; kein Keying oder nachträgliches Freistellen.
- Akzeptierte Raws gesichert, Finals alphaerhaltend auf 1086 × 1448 und 87,98 % Motivhöhe
  normalisiert; 8/8 Außenränder vollständig transparent.
- Bogenfunktion, Paar-Loadouts, vollständige Silhouetten und Saumfreiheit auf dunklem und
  grellrosa Kontaktbogen geprüft. Keine Renderer-Integration.

## 2026-08-27 — Elf Character Roster, Pausenstand

<!-- codex:2026-08-27T00:27:45+02:00 -->

- Elfen-Demo auf vollständigen 30-Archetypen-/60-Asset-Auftrag erweitert; Identitäts- und
  Paarmatrix gesperrt.
- Acht Demoanker in das vollständige Roster-Staging übernommen und 16 neue Assets erzeugt:
  Paladin, Berserker, Speerwächter, Todesritter, Slayer, Duellant, Schurke und Feuermagier,
  jeweils männlich und weiblich.
- Männliche Varianten entsprechend Chefentscheid markanter und badassiger umgesetzt, ohne die
  junge attraktive Elfenlinie zu verlassen.
- 24/24 aktuelle Finals auf 1086 × 1448, RGBA, transparenten Außenrand und 87,98 % Motivhöhe
  geprüft; dunklen und grellrosa Pausen-Kontaktbogen erstellt.
- Produktion auf Chef-Wunsch bis morgen pausiert. Nächster Produktionspunkt: Frostmagier.

## 2026-08-27 — Elf Character Roster abgeschlossen

<!-- codex:2026-08-27T09:36:13+02:00 -->

- Produktion ab Frostmagier wiederaufgenommen und die verbleibenden 36 Assets für fünf
  Kampfklassen sowie dreizehn Berufe fertiggestellt; Gesamtstand 60/60.
- Rechtsorientierung, getrennte Identitäten und gemeinsame Waffen-/Werkzeugfamilien je
  Geschlechtspaar in der vollständigen Serie visuell gegengeprüft.
- Native RGBA-Ausgaben in `raw/` gesichert und ohne Keying alphaerhaltend auf 1086 × 1448 sowie
  87,98 % Motivhöhe normalisiert.
- 60/60 Dateinamen, PNG-RGBA-Format, Maße, Teiltransparenz, transparenter Außenrand und
  Größenfenster bestanden; vollständige dunkle und grellrosa Kontaktbögen erstellt.
- Abschlussstatus, QA und Claude-Übergabe dokumentiert. Keine Renderer-Integration.

## 2026-08-27 — Elf-Roster: drei funktionale Korrekturen

<!-- codex:2026-08-27T09:52:41+02:00 -->

- Vom Chef markierte Fehler an Speerwächter M, Schattenmagierin und Berserkerin geprüft.
- Erste bildreferenzierte Edit-Versuche wegen gemaltem Schachbrett/RGB verworfen und nicht ins
  Staging übernommen.
- Drei native RGBA-Neugüsse erzeugt: Speer plus sichtbar getragenes Schild, vollkommen gerader
  Metallstab und normale zweihändige Einblatt-Axt ohne zweiten Axtkopf.
- Frühere Raw-/Finalfassungen recoverbar nach `qa/replaced-originals/` verschoben, neue Dateien
  mit identischen IDs eingesetzt und die vollständige 60er-QA erneut mit 60/60 PASS ausgeführt.
- Vollständige sowie fokussierte Kontaktbögen auf dunklem und grellrosa Prüfgrund aktualisiert.

## 2026-08-27 — Steam Achievement Icons abgeschlossen

<!-- codex:2026-08-27T11:40:00+02:00 -->

- 67 farbige Steam-Achievement-Motive mit eingebautem ImageGen produziert: 21 Kapitel,
  20 Skill-Meister und 26 Einzelmotive.
- Drei serieninterne Bildreferenzanker für Buch-, Lorbeer- und Meilenstein-Guss verwendet;
  hochauflösende akzeptierte Arbeitsfassungen in `raw/` gesichert.
- 67 Farbfassungen mechanisch auf deckende 256 × 256 JPGs normalisiert und 67 Graufassungen aus
  exakt denselben normalisierten Quellen abgeleitet.
- 134/134 Dateinamen, Maße, JPEG-Format und Deckung bestanden; Graustufen pixelweise auf
  R=G=B geprüft.
- Farb- und Graustufen-Kontaktbogen mit exakt 64 × 64 px großen Icons visuell geprüft.
- Brief Teil B–D, finales Promptprotokoll, Staging-README, QA und Übergabe abgeschlossen.
  Keine Renderer- oder Steam-Integration.

## 2026-08-27 — Ork-Demo und Tavernen-Teillieferung

<!-- codex:2026-08-27T12:15:00+02:00 -->

- Zwölf Ork-Demo-Motive für drei Kampfrollen und drei Berufe als männlich/weiblich-Paare
  entworfen; Paarbewaffnung, Werkzeuge und Rechtsorientierung visuell eingehalten.
- Alpha-QA stoppte die Lieferung: sämtliche Ausgaben waren RGB mit gemaltem Schachbrett.
  Zwei alternative Bildwege geprüft, ohne Keying oder nachträgliche Freistellung; Blocker
  dokumentiert und keine Datei nach `fertig/` freigegeben.
- Tavernen-Brief und beide bindenden Designquellen vollständig gelesen.
- Deckende Tavernen-Innenraumszene erzeugt und auf exakt 1672 × 941 geprüft; drei Tischgruppen,
  Tresen, Anschlagtafel, Kamin, Tür und vier offene Figurenanker umgesetzt.
- Acht Koordinaten als JSON und markierte QA-Fassung geliefert; BRIEF Teil B–D und HANDOFF
  als Teillieferung aktualisiert. Gäste und transparente Icons bis zur funktionierenden
  Alpha-Erzeugung pausiert. Keine Renderer-Integration.

## 2026-08-27 — Ork Character Creator Roster 60/60

<!-- codex:2026-08-27T17:08:57+02:00 -->

- Chef-Erweiterung vom Sechser-Pilot zum vollständigen Roster umgesetzt: 15 Kampfklassen und
  15 Berufe, jeweils männlich und weiblich.
- 60 eigenständige Ork-Figuren mit eingebautem ImageGen im Standardmodus erzeugt; einen leeren
  Frostmagier-Rohwurf verworfen und gezielt neu gegossen.
- Akzeptierte native RGBA-Raws gesichert und alphaerhaltend auf 1086 × 1448 normalisiert.
- 60/60 exakte IDs, RGBA, transparenter Außenrand, weiche Teiltransparenz und 84–92 %
  Zielbelegung automatisch geprüft; gemessene Motivhöhe 87,43–87,98 %.
- Dunklen und grellrosa Kontaktbogen visuell geprüft, einschließlich Paar-Loadouts,
  Rechtsorientierung, Speer-/Schildführung, Axttypen, geraden Stäben und Bogenmechanik.
- Brief, Roster-Verweis, Staging-README, QA und HANDOFF abgeschlossen. Keine
  Renderer-Integration.

## 2026-08-27 — Goblin-Dreierprobe

<!-- codex:2026-08-27T17:35:31+02:00 -->

- Drei einzelne Goblin-Tests zur Stilabnahme produziert: Krieger, Waldläuferin und Waffenschmied.
- Goblin-Profil aus dem bindenden Tavernen-Völkerdokument übernommen und für spielbare
  Creator-Figuren aufgelöst: erwachsen, drahtig, etwa 1,50 m, moosgrün, große Ohren,
  selbstbewusst statt Monster-Mob.
- 3/3 native RGBA-Raws akzeptiert, alphaerhaltend auf 1086 × 1448 normalisiert und technisch
  geprüft; Außenrand vollständig transparent, Motivhöhe 87,43–87,57 %.
- Dunklen und grellrosa Kontaktbogen einschließlich Waffenlogik visuell abgenommen.
- Brief, Promptset, Staging, QA und HANDOFF dokumentiert. Keine Renderer-Integration.

## 2026-08-27 — Goblin Character Creator Roster 60/60

<!-- codex:2026-08-27T19:36:00+02:00 -->

- Freigegebene Dreierprobe auf das vollständige Roster erweitert: 15 Kampfklassen und 15 Berufe,
  jeweils männlich und weiblich.
- 57 neue Motive mit eingebautem ImageGen erzeugt und die drei akzeptierten Demoanker unverändert
  in die 60er-Serie übernommen.
- Akzeptierte native RGBA-Raws gesichert und ohne Keying alphaerhaltend auf 1086 × 1448
  normalisiert.
- 60/60 exakte IDs, RGBA, transparenter Außenrand, weiche Teiltransparenz und 84–92 %
  Zielbelegung automatisch geprüft; gemessene Motivhöhe 87,43–87,78 %.
- Dunklen und grellrosa Kontaktbogen visuell geprüft, einschließlich Paar-Loadouts,
  Rechtsorientierung, Speer-/Schildführung, Einblatt-Zweihandäxten, geraden Metallstäben und
  funktionaler Bogenmechanik.
- Brief, Roster, Promptmatrix, Quellenkarte, Staging-README, QA und HANDOFF abgeschlossen.
  Keine Renderer-Integration.

## 2026-08-27 — Kampfeffekte Testlauf 6/6

<!-- codex:2026-08-27T20:27:00+02:00 -->

- Sechs native RGBA-Kampfeffekte mit eingebautem ImageGen erzeugt: arkanes Geschoss sowie fünf
  Dreizellen-Streifen für Arkan/Feuer-Einschlag, Schwert-Slash, Blut und Begleiter-Biss.
- Raws unverändert gesichert; Streifenzellen alphaerhaltend mit transparentem Sicherheitsrand auf
  exakte 256 × 256 normalisiert, Geschoss auf 256 × 128.
- 6/6 Dateinamen, Maße, PNG-RGBA, echtes Alpha, Teiltransparenz, Außenrand und Zellenbelegung
  automatisch geprüft.
- Kontaktbögen auf dunklem Grund und über dem Ashfields-Battlescreen bei nativer Zielgröße visuell
  abgenommen; alle sechs Effekte sind lesbar und als Serienanker freigegeben.
- Brief B–D, Staging-README, QA, Promptprotokoll und HANDOFF abgeschlossen. Keine
  Renderer-Integration.

## 2026-08-27 — Kampfeffekte Welle 1, 33/33

<!-- codex:2026-08-27T23:02:59+02:00 -->

- Sechs bestandene Testanker in die Serie übernommen und 27 neue Kampfeffekt-Motive mit nativem
  RGBA-Alpha einzeln erzeugt.
- Acht Geschosse auf 256 × 128 und 25 Dreiphasen-Streifen auf 768 × 256 alphaerhaltend
  normalisiert; kein Keying, kein nachträgliches Freistellen.
- 33/33 IDs, Maße, RGBA, Teiltransparenz, Außenrand und 75/75 Streifenzellen automatisch geprüft.
- Vollständige Kontaktbögen auf dunklem Grund und über Ashfields visuell abgenommen: Themen,
  Bewegungsphasen, Rechtsrichtung, Blutrestriktion und Familienlesbarkeit bestanden.
- Brief B–D, finales Promptprotokoll, Quellenkarte, Staging-README, QA und HANDOFF abgeschlossen.
  Keine Renderer-Integration.

## 2026-08-27 — Fasern, Stoff und Jagen, 26/26

<!-- codex:2026-08-27T23:41:00+02:00 -->

- 19 transparente Item-Motive, fünf deckende Foraging-Orte, eine deckende Aktionskarte und ein
  transparent umrandetes Sidebar-Emblem mit dem eingebauten ImageGen erzeugt.
- Eine technisch fehlerhafte Faser-Proberunde vollständig verworfen; akzeptierte Freisteller
  ausschließlich mit nativem RGBA ohne Keying weiterverarbeitet.
- Raws gesichert und Finals alphaerhaltend beziehungsweise deckend auf die vier exakten Zielmaße
  normalisiert.
- 26/26 IDs und Maße, 20/20 Alpha-Außenränder und sechs deckende Szenen automatisch geprüft;
  Kontaktbögen auf dunklem und grellrosa Grund sowie für die Karten visuell abgenommen.
- Drei zunächst einzeln erzeugte Fallen wegen zu geringer Familienähnlichkeit durch einen
  gemeinsamen nativen RGBA-Dreizustands-Guss ersetzt und alphaerhaltend getrennt.
- Brief B–D, Produktionsnotiz, Staging-README, QA und HANDOFF abgeschlossen. Keine
  Renderer-Integration.

## 2026-08-28 — Korrektur Fasern/Jagen

<!-- codex:2026-08-28T00:47:00+02:00 -->

- Vor der Produktion Bestandsdateien aus `sidebar/`, `items/` und `actions/` visuell geprüft;
  Widerspruch des alten Briefs zu Rahmenlosigkeit und transparenten Aktionsobjekten bestätigt.
- Jagd-Sidebar-Icon ohne Plakette sowie Wurmköder ohne Eimer mit nativem RGBA neu erzeugt und
  alphaerhaltend auf 1254 × 1254 beziehungsweise 640 × 640 normalisiert.
- Beide Außenränder automatisch geprüft (`edge_alpha_max = 0`) und bei 48 px jeweils neben zwei
  Bestandsmotiven visuell abgenommen.
- Gestrichene `dig_bait`-Szene sowie die beiden ersetzten Fassungen recoverable in `qa/`
  archiviert; aktive Lieferung auf 25 Dateien bereinigt.
- Serien-Finalisierer auf die korrigierten Quellen und den entfallenen Asset-Scope angepasst;
  README, QA, Brief, Produktionsnotiz und HANDOFF aktualisiert. Keine Renderer-Integration.

## 2026-08-28 — Meisterring Jagen

<!-- codex:2026-08-28T01:22:00+02:00 -->

- Prompt 27 und die Bestandsringe Angeln/Sammeln vor der Erzeugung auf Perspektive,
  Lichtführung, Maßstab, Freistellung und Rahmenlosigkeit abgeglichen.
- Zwei technisch unzulässige RGB-Würfe mit gemaltem Schachbrett verworfen; dritten Wurf ohne
  Bild-Input als natives RGBA erzeugt und alphaerhaltend auf 640 × 640 normalisiert.
- Dateiname, Maße, Alphakanal, Außenrand und Teiltransparenz automatisch geprüft; Serienvergleich
  bei Normalgröße und 48 px sowie grellrosa Kantenprüfung visuell bestanden.
- Raw, Final, Kontaktbögen und Messwerte in der bestehenden Fasern/Jagen-Lieferung ergänzt;
  aktiver Umfang jetzt 26 Dateien. Dokumentation und kanonischen Finalisierer aktualisiert.
- Keine Renderer-Integration und keine Änderung an `.claude/**`.

## 2026-08-28 — Jagen-Skillseite Designmockup

<!-- codex:2026-08-28T18:02:00+02:00 -->

- Jagen-Konzept, technische Spezifikation, bestehende `HuntingPage`-Struktur, CSS sowie reale
  UI-, Fallen- und Zonenassets als Designgrundlage geprüft.
- Ein deckendes 1672 × 941 UI-Mockup im Ashen-Iron-Stil mit eingebautem ImageGen erstellt.
- Entwurf auf zwei gleichzeitige Arbeitsbereiche aufgelöst: 2×3-Fallenraster links und persistentes
  Jagdbuch rechts; Kopfzeile bündelt XP, Stufe, Köder und Köder-Aktion.
- Inhaltliche Nachkorrektur auf drei aktive Fallen, gültige Ashfields-Beute, automatische
  Loot-Vergabe sowie `AUTO`-Schalter durchgeführt.
- Mockup, Designbegründung und Promptprotokoll unter
  `CODEX/work/2026-08-28-hunting-skill-mockup/` abgelegt. Kein HTML und keine Runtime-Änderung.

## 2026-08-28 — Asset-Fehler-Audit

<!-- codex:2026-08-28T19:25:00+02:00 -->

- Sämtliche 1.357 Renderer-Bilder in `items/`, `monsters/` und `pets/` automatisiert vermessen
  und über vollständige sowie fokussierte Kontaktbögen visuell geprüft.
- Neben Alpha und Außenrand auch versteckte RGB-Matten unter Alpha, Teiltransparenzübergänge
  bis 28 px in die Silhouette und helle Säume in Rauch, Fell, Federn und Stoff untersucht.
- 89 eindeutige Austauschdateien bestätigt: 66 Chroma-/Matte-Fälle, 20 abgeschnittene Motive,
  zwei Bodenreste und ein blockiger Atemeffekt. 16 mögliche weiße Matten separat zur
  In-Game-Sichtprüfung geführt; 286 Altauflösungen getrennt dokumentiert.
- Vollständigen Bericht, Status-CSV für jedes Asset, Austausch-/Prüflisten, Rohmetriken und
  visuelle Belegbögen unter `CODEX/work/2026-08-28-asset-fehler-audit/` abgelegt.
- Keine Renderer-Assets verändert; Prüfung und Dokumentation waren vollständig read-only.

## 2026-08-28 — Köder/Feuer, Alpha-Weg blockiert

<!-- codex:2026-08-28T19:16:25+02:00 -->

- Köder- und Feuer-Briefs, Designkonzepte sowie vorgeschriebene Item-, FX- und Battlescreen-
  Referenzen geprüft.
- Zwei native Transparenz-Neuwürfe und eine ImageGen-Hintergrundextraktion für den ersten Köder
  technisch verworfen: alle drei Ausgaben waren RGB ohne Alpha und zeigten ein gemaltes
  Schachbrett.
- Entsprechend der Stop-Regel keine weiteren Köder und keine Feuersequenzen erzeugt; keine
  Finals ausgeliefert und kein Keying eingesetzt. Eine Probe nur als QA-Beleg erhalten.

## 2026-08-28 — Köder-Stufen und Feuer-Welle 2

<!-- codex:2026-08-28T20:01:41+02:00 -->

- Auf direkte Chef-Anweisung den eingebauten ImageGen-Weg referenzfrei erneut probiert;
  natives RGBA wiederhergestellt und den vorherigen technischen Stopp sauber aufgelöst.
- Vier Köder-Raws erzeugt, ohne Keying auf 640 × 640 normalisiert und neben Wurmköder bei
  Normalgröße und 48 px auf dunklem sowie grellrosa Grund abgenommen.
- Sieben native Feuer-Basiseffekte erzeugt und daraus vier kohärente Fünf-Frame-Geschosse sowie
  drei Drei-Frame-Einschläge deterministisch aufgebaut; kein Frame einzeln neu gewürfelt.
- Alle elf Finals auf exakte Namen, PNG/RGBA, Maße, Alpha, transparenten Außenrand und
  Zellbelegung geprüft. Feuer zusätzlich mit Welle 1 und über Ashfields visuell verglichen;
  60-ms-/100-ms-GIFs erstellt.
- Briefs B–D, Promptprotokolle, Quellenkarten, QA-Berichte, Staging-READMEs und HANDOFF
  abgeschlossen. Keine Renderer-Integration oder Runtime-Änderung.

## 2026-08-28 — Skill-Set Schneidern

<!-- codex:2026-08-28T20:55:00+02:00 -->

- Laufenden Monster-Neuguss auf CEO-/Claude-P1-Anweisung am gesicherten Zwischenstand pausiert.
- Pflichtreferenzen für Sidebar, Skill-Kulisse/-Karte, Meisterring und Steam-Erfolg vor der
  Produktion vollständig visuell verglichen.
- Vier native Basismotive erzeugt und daraus sechs Finals erstellt; Karte und Graufassung
  deterministisch aus den jeweiligen Farb-/Szenenbasen abgeleitet.
- Exakte Namen, Maße, Formate, Alphaextrema und transparente Außenränder automatisch geprüft;
  fünf Kontaktbögen mit den verlangten Bestandsnachbarn visuell abgenommen.
- Brief B–D, reproduzierbaren Finalisierer, Staging-README, QA, HANDOFF und WORKLOG abgeschlossen.
  Keine Renderer-, Content-, Engine- oder `.claude/**`-Änderung.

## 2026-08-28 — Monster-Neuguss

<!-- codex:2026-08-28T22:13:12+02:00 -->

- Nach direkter Chef-Freigabe den pausierten Monster-Neuguss wieder aufgenommen und 38 Raws
  gegen die jeweiligen alten Renderer-Monster erzeugt.
- Alle Motive auf kampfbereite Position rechts mit Angriffsrichtung links, Einzelmotiv und
  vollständige Ganzkörpersilhouette geprüft.
- Finalisierer für exakte 1254²-RGBA-Ausgabe, enges Green-Key-Masking einschließlich
  eingeschlossener Negativräume, Rand-Despill, native Alpha-Overrides und reproduzierbare
  Kontaktbögen erstellt.
- Vollständige Dunkel-/Magenta- und Alt/Neu-Abnahme durchgeführt; sechs stilistisch zu weit
  entfernte Motive erneut enger an der Altidentität erzeugt.
- 38/38 Finals automatisch auf Namen, Maße, Alpha, transparente Außenkante, verstecktes RGB
  und Neon-Key-Reste geprüft; keine Beanstandung verblieben.
- Brief, Staging-README, QA, HANDOFF und WORKLOG abgeschlossen. Renderer, Content, Engine und
  `.claude/**` nicht verändert.

## 2026-08-28 — Esthar, Ossric und Skill-Pets

<!-- codex:2026-08-28T22:51:20+02:00 -->

- Brief, Katzenfoto, drei Pet-Nachbarn, zwei Waffen-Nachbarn und die nachgereichten drei
  Ossric-Referenzen vor Produktion vollständig visuell geprüft.
- Kater zuerst identitätstreu erzeugt; Schachbrett-/RGB-Zwischenwürfe verworfen und nur den
  finalen nativen Alpha-Wurf übernommen.
- Esthar und Seidenweber nach Bestandsabgleich als native RGBA-Freisteller erzeugt; Ausrüstung
  ohne Glühen, Motte nur mit schwachem Fadenschimmer.
- Nach dem bindenden Content-Nachtrag Ossric als Champion von `gravecliff_specter` erzeugt;
  Hintergrund ausschließlich per eingebautem Alpha-Extraction-Edit entfernt, kein Keying.
- Vier Raws premultipliziert und alphaerhaltend auf 1254² normalisiert. Exakte Namen, Alpha,
  Außenrand, Teiltransparenz und verstecktes RGB automatisch geprüft; je Motiv Bestands-/
  Dunkel-/Magenta-Kontaktbogen visuell bestanden.
- Brief B–D, Promptprotokoll, Staging-README, QA, HANDOFF und WORKLOG abgeschlossen. Keine
  Renderer-, Content-, Engine- oder `.claude/**`-Datei verändert.

## 2026-08-28 — Kater stilistisch korrigiert

<!-- codex:2026-08-28T22:59:45+02:00 -->

- Erste technisch bestandene, aber zu fotorealistische Katerfassung auf direkte Chef-
  Korrektur aus der aktiven Lieferung genommen und nachvollziehbar im QA-Ausschuss archiviert.
- Neue stilisierte Fassung mit vereinfachter Fellmalerei, verschmitzter Kampfpose und direkter
  Rechtsorientierung als natives RGBA erzeugt.
- Raw und Final ersetzt, vollständigen Finalisierer erneut ausgeführt, Kontaktbogen und
  Messbericht aktualisiert; 1254², Außenrand Alpha 0 und Magenta-Kantenprüfung bestanden.
- Parallele Renderer-Integration nicht verändert; HANDOFF weist Claude gezielt auf den nötigen
  Austausch nur von `booted_tomcat.webp` hin.

## 2026-08-28 — Kater erneut auf gritty Dark Fantasy korrigiert

<!-- codex:2026-08-28T23:05:36+02:00 -->

- Zwischenfassung nach direktem Chef-Feedback wegen zu starker Cartoonwirkung aus der aktiven
  Lieferung genommen und unter `qa/replaced-cartoony-cat/` archiviert.
- Kater mit erwachsenen schlanken Proportionen, rauer gemalter Oberfläche, tieferem Kontrast,
  zerrissener dunkler Ausrüstung und eindeutiger Links-nach-rechts-Kampfhaltung neu erzeugt.
- Einen visuell passenden RGB-Wurf mit gemaltem Schachbrett verworfen; nur den danach erzeugten
  nativen RGBA-Wurf übernommen.
- Raw/Final ersetzt, Finalisierer und Kontaktbogen erneut ausgeführt; 1254², Außenrand Alpha 0,
  verstecktes RGB 0 und weiche Alpha-Kanten bestanden. Renderer nicht verändert.

## 2026-08-28 — Kater auf Jagdfalle umgerüstet

<!-- codex:2026-08-28T23:10:28+02:00 -->

- Auf direkte Chef-Korrektur Armbrust und Schuhe aus dem Design entfernt; vorheriges Final unter
  `qa/replaced-crossbow-cat/` archiviert.
- Kater als dynamischen Fallenwerfer neu erzeugt: offene Bärenfalle fliegt nach rechts, eine
  kontinuierliche Eisenkette führt zurück zur haltenden Hand, beide natürlichen Hinterpfoten
  sind sichtbar.
- Referenzbasierter RGB-Wurf mit gemaltem Schachbrett verworfen und ausschließlich nativen
  RGBA-Wurf übernommen.
- Raw/Final, Kontaktbogen und Messbericht aktualisiert; Maße, Alpha, Außenrand und verstecktes
  RGB bestanden. Renderer nicht verändert.

## 2026-08-28 — Status-Icon Entzug

<!-- codex:2026-08-28T23:30:33+02:00 -->

- Brief und fünf vorhandene Status-Icons vollständig geprüft; `fx_impact_void.webp` als
  zusätzlicher Palettenanker herangezogen.
- `icon_status_void.png` als nativen RGBA-Freisteller erzeugt und alphaerhaltend auf 1254² mit
  transparentem Sicherheitsrand normalisiert.
- Entzug über eine dunkle Silhouette, schwarzen Brustkern und ausschließlich nach innen
  laufende purpurschwarze Kraftbahnen aufgelöst; kein Rahmen, Text oder Außenleuchten.
- Automatische Maße-/Alpha-Prüfung sowie Sechser-Serienkontaktbogen, Dunkel-/Magenta- und
  64-px-Test bestanden. Renderer nicht verändert; Monster-Neuguss blieb pausiert.

## 2026-08-28 — Trübgewebe-Set komplett neu gemalt

<!-- codex:2026-08-28T23:48:44+02:00 -->

- Fünf Lehrlings-Slots und Frost-Gegenpol vor Produktion visuell geprüft; alte Dimweave-Bilder
  nicht als Vorlage verwendet.
- Kapuze, Robe, neues Beinkleid, neue Handbinden und Sandalen als geschlossene Serie einzeln mit
  dem eingebauten ImageGen erzeugt. Alle akzeptierten Würfe besitzen natives Alpha.
- Gemeinsame Formensprache über grobes Nesselgewebe, Dämmergrau/Abendblau, ausgefranste Säume,
  Lederkordeln, Holzknebel und unbeleuchtete dunkelblaue Naht-Runen umgesetzt.
- Fünf Raws premultipliziert und alphaerhaltend auf 1254² normalisiert; exakte Namen, Alpha,
  Außenrand und verstecktes RGB automatisch geprüft.
- Zweizeiliger Dimweave-/Lehrlings-Kontaktbogen sowie Dunkel-/Magenta- und 64-px-Prüfung
  bestanden. Renderer, Content und alte Dimweave-Dateien nicht verändert.

## 2026-08-28 — Trübgewebe-Robe slotrein korrigiert

<!-- codex:2026-08-28T23:56:07+02:00 -->

- Erste Robenfassung wegen fälschlich integrierter Kapuze auf direkte Chef-Korrektur verworfen
  und unter `qa/replaced-hooded-robe/` archiviert.
- `dimweave_robe.png` ohne Kapuze, Gugel oder hohen Kragen neu erzeugt; offener flacher
  V-Ausschnitt trennt Körper- und Kopfslot eindeutig.
- Natives RGBA-Raw übernommen, Finalisierer erneut ausgeführt und alle Set-, Alpha- sowie
  64-px-Kontaktbögen aktualisiert. Die übrigen vier Finals und Renderer blieben unverändert.

## 2026-08-29 — Steam-Store-Texte V2

<!-- codex:2026-08-29T00:30:06+02:00 -->

- Öffentliche Steam-Seite und lokale Marketingtexte gegen den aktuellen Content-Katalog geprüft;
  alte Angaben zu 20 Fertigkeiten, 28 Champions und Early Access identifiziert.
- Aktuellen Umfang strukturell verifiziert: 22 Fertigkeiten, 23 Begleiter, 1.215 Gegenstände,
  810 Aktionen, 110 Kreaturen, 29 Champions, 321 Erfolge, 119 Aufgaben und 36 Sets.
- Neue Kurz- und Langbeschreibung auf Englisch und Deutsch geschrieben und konsistent für
  Französisch, Spanisch, Brasilianisches Portugiesisch, Russisch und vereinfachtes Chinesisch
  übertragen. Alle Kurztexte auf das 300-Zeichen-Limit geprüft.
- Taverne wegen deaktiviertem Feature-Flag nicht beworben; drei veraltete Zahlen-/Skill-Panels
  für die Übergabe gesperrt. Keine Store-, Renderer-, Content- oder `.claude/**`-Datei verändert.

## 2026-08-29 — Steam-Store-Elemente V2

<!-- codex:2026-08-29T00:51:52+02:00 -->

- Bestehende 616-px-Holztafeln, neues Hauptmenü, Item-Wiki, Kampfszenen, Skill-Kulissen,
  New-Haven-Gebäude sowie aktuelle Charakter-, Monster- und Pet-Familien visuell abgeglichen.
- Mit dem eingebauten ImageGen-Werkzeug sieben neue Panorama-Artworks erzeugt: Welt, Werkstatt,
  drei Builds, Champion/Begleiter, vier spielbare Völker, New Haven und Reiseabschluss.
- Raws ins Projekt-Staging kopiert und per reproduzierbarem Pillow-Build auf Valves empfohlene
  1170 × 570 gebracht; gemeinsame Farbkorrektur, Vignette und schlanker Ashen-Iron-Rahmen.
- Textloses universelles Finalset und optionale englische Typografiefassung erstellt. Beide
  Kontaktbögen geprüft; jedes Panel unter 1,1 MB, je Set deutlich unter 15 MB.
- Misslungenen Logo-Alpha-Versuch wegen gemaltem Schachbrett vollständig ausgeschlossen.
  Keine Altpanels überschrieben und keine Produktions-/Steam-Dateien verändert.

## 2026-08-29 — Store-Panels gestoppt; Master Hunter geliefert

<!-- codex:2026-08-29T01:06:33+02:00 -->

- Szenische Store-Banner als falsche Interpretation zurückgezogen; anschließender
  Infografik-Entwurf nach Chef-Feedback zu Steel Frame/freiem Außenraum ebenfalls gestoppt.
  Beide Stagingordner klar mit `DO-NOT-USE.md` gesperrt; Panel-Aufgabe geht an Claude.
- Master-Leatherworking, Master-Tailoring, Jagdschlinge, Wurmköder und Hunting-Sidebaricon vor
  Produktion visuell geprüft.
- MASTER_HUNTING mit eingebautem ImageGen-Werkzeug als Serienplakette erzeugt und auf 256² RGB
  JPEG normalisiert. Graufassung ausschließlich aus dem Farbfinal abgeleitet.
- Farb-/Graureihe neben beiden Meister-Nachbarn sowie bei realen 64 px geprüft; Dateinamen,
  Maße, Modus, Dateigrößen und Hashes protokolliert. Keine Produktionsdateien verändert.

## 2026-08-29 — Patchnotes 1.2.0: Threads, Traps & Spellfire

<!-- codex:2026-08-29T08:01:13+02:00 -->

- Vorheriges Patchnotes-Key-Art, Tailoring-Kulisse, Jagdfalle, Wurmköder und Feuer-FX als
  Stil- und Motivanker geprüft.
- Mit dem eingebauten ImageGen-Werkzeug ein textfreies Master-Artwork erzeugt; Prompt und
  Referenzliste unter `CODEX/work/2026-08-29-patchnotes-1.2.0/PROMPTS.md` dokumentiert.
- Offizielles Logo und exakte Update-Typografie reproduzierbar per FFmpeg gesetzt; beide
  Zielformate als deckende RGB-PNGs ausgegeben.
- Maße, Dateinamen, Logo-/Titelabstand und die gemeinsame Vorschau geprüft. Nichts in den
  Renderer oder Store übernommen.

## 2026-08-29 — Schmuck-Rework, Welle 2

<!-- codex:2026-08-29T16:19:58+02:00 -->

- Brief, Assetvertrag, Schmuck-Audit, Asset-Integrator-Revier und sechs bestehende Schmuckbilder
  geprüft; `diamond_ring.webp` und `onyx_amulet.webp` als verbindliche Kontaktbogen-Anker gesetzt.
- Prompt-Serie für 14 Fernkampfstücke ausgearbeitet und mit dem eingebauten ImageGen-Werkzeug
  erzeugt. Ausschließlich echte RGBA-Ausgaben ins Raw übernommen; deckende Karo-Versuche verworfen.
- Sieben Leder-/Sehnenringe und sieben Cord-/Federamulette verlustfrei auf 640² WebP mit Alpha
  normalisiert. Keine bestehende Datei ersetzt und nichts in den Renderer kopiert.
- Automatisierte QA über Sharp: Maße, Format, Kanäle, Alpha-Min/-Max, transparente Außenränder,
  Soft-Alpha-Pixel, Dateigrößen und SHA-256. Zusätzlich Dunkel-, Magenta- und 60-px-Kontaktbogen
  visuell geprüft; 14/14 bestanden.
- P2-Produktion wegen vorläufiger IDs nicht begonnen. Umfangswiderspruch 41 gegenüber 37
  ausformulierten Motiven im Paket-HANDOFF notiert.

## 2026-08-29 — Schmuck-Rework, Wellen 3 bis 5

<!-- codex:2026-08-29T17:42:00+02:00 -->

- Aktualisierten Brief und `PROMPTS-WELLE-3-BIS-5.md` mit allen 27 finalen IDs neu eingelesen.
- Mit dem eingebauten ImageGen-Werkzeug 10 Magie-, 5 Nahkampf-, 8 Fund- und 4 Arbeitsstücke
  erzeugt. Nur native RGBA-Fassungen wurden übernommen; deckende Vorschauhintergründe wurden
  verworfen und nicht gekeyt.
- Raws unverändert archiviert und Finals reproduzierbar mit Sharp auf 640² WebP q92,
  `alphaQuality 100`, normalisiert. Die bereits angenommene Welle 2 blieb unverändert.
- Automatisierte QA für alle 27 neuen Dateien: Maße, Format, Kanäle, Alpha-Min/-Max,
  vollständig transparente Außenränder, Dateigrößen und SHA-256. Dunkel-, Magenta- und echte
  60-px-Kontaktbögen je Welle visuell geprüft; 27/27 bestanden.
- Paket-QA und beide Handoff-Dateien aktualisiert. Keine Renderer-, Content- oder
  `.claude/**`-Datei verändert.
<!-- codex:2026-08-30T16:25:00+02:00 -->
## 2026-08-30 – New Haven UI-Konzeption

- Bestehende New-Haven-Listen- und Kartenansichten sowie Action-Card-Stilanker geprüft.
- Fünf Listen- und fünf Kartenkonzepte als 16:9-Bitmap-Mockups im bestehenden Ashen-Iron-Stil produziert.
- Gold plus vier Materialkosten, lange Namen, Spezialaktion `Betreten`, Bauwarteschlange und sieben Gebäudestatus in den Konzepten berücksichtigt.
- Zwei beschriftete Kontaktbögen für die Auswahl erstellt; Produktionscode unverändert gelassen.
<!-- codex:2026-08-30T16:56:00+02:00 -->
## 2026-08-30 – New Haven Listenvariante 04 als HTML

- Master–Detail-Ansatz aus dem freigegebenen Designmockup als eigenständiges HTML/CSS/JS-Mockup umgesetzt.
- Scrollbares Gebäuderegister, feste Detailansicht und permanente Bauwarteschlange mit lokaler Interaktion gebaut.
- 14 Beispielgebäude und sämtliche sieben wesentlichen Bauzustände abgebildet; reale New-Haven-Gebäudeillustrationen und Ashen-Iron-Rahmen/Texturen/Schriften wiederverwendet.
- `node --check` und `qa-static.cjs` erfolgreich; keine Produktionsdateien verändert.
<!-- codex:2026-08-30T17:24:00+02:00 -->
## 2026-08-30 – New Haven HTML Responsive-Iteration

- Gebäudezeilen und Gebäudekunst deutlich vergrößert; Register bewusst auf etwa fünf sichtbare Einträge plus Scrollen umgebaut.
- Gesamte Mockup-Geometrie auf viewport- und containerabhängige Skalierung umgestellt, einschließlich Titel, Fließtext, Effekte, Materialchips, Aktionen und Queue.
- Nach zweitem Größen-Audit einen 12-px-Boden für Sekundärtext und 14–16 px für zentrale Inhalte ergänzt.
- Größenvertrag für 1280×720, 1366×768, 1600×900, 1920×1080 und 2560×1440 automatisiert geprüft.
- Statische Integrität erneut bestanden: 27 Assetreferenzen, 0 fehlend, 14 Gebäude und alle Interaktionen vorhanden.

<!-- codex:2026-08-30T18:10:00+02:00 -->
## 2026-08-30 – New Haven HTML Screenshot-Korrektur

- Chef-Screenshots gegen das laufende Mockup ausgewertet.
- Rangwechsel horizontal stabilisiert, lokale Camp-Motive zugeschnitten und Detailbild auf vollständiges proportionales Einpassen umgestellt.
- Kostenchips gegen Überlauf abgesichert; Warteschlange sichtbar höher und intern neu eingepasst.
- Statische Asset-/Struktur-QA, JS-Syntax und numerischer Responsive-Vertrag bestanden; keine Produktionsdateien verändert.

<!-- codex:2026-08-30T19:03:00+02:00 -->
## 2026-08-30 – New Haven Detailhierarchie nach Chef-Markierung

- Detailkarte in eine reine Gebäudebühne links und einen spielrelevanten Ausbaucontainer rechts geteilt.
- Flairtext, doppelten Aufwerten-Knopf sowie sämtliche Betreten-Zustände und -Aktionen entfernt.
- Effektvergleich per Container Query für schmale und breite Detailflächen dynamisiert; Kosten auf 2×2-Raster im rechten Container umgebaut.
- Headless-Prüfskript um Geometrie-/Overflow-/Aktionsabnahme erweitert; statische QA, JS-Syntax und Fünf-Viewport-Vertrag bestanden.

<!-- codex:2026-08-30T19:28:00+02:00 -->
## 2026-08-30 – New Haven Kleinstauflösung

- Chef-Screenshot bei 1040×958 ausgewertet; horizontales Quetschen und Scrollen im Register auf die starre Fünfspaltenzeile eingegrenzt.
- Containerabhängige Zweizeilenkarte unter 30 rem Registerbreite umgesetzt; Bild/Name/Rang oben, Aktionsbutton darunter.
- Horizontale Registerachse gesperrt und Responsive-Vertrag um 1040×958 sowie 1024×768 erweitert. Sämtliche automatischen Prüfungen bestanden.
<!-- codex:2026-08-30T22:18:00+02:00 -->
## 2026-08-30 – New Haven Master-Detail-Runtime

- Freigegebene Listenvariante 04 als eigene React-Master-Detail-Ansicht implementiert.
- Scrollbares Gebäuderegister, große Detailgrafik, dynamische Wirkungs-/Kostenfläche, einzige
  Hauptaktion und unteren Warteschlangenstreifen responsiv umgesetzt.
- Karten-Popup und Map-Ablauf isoliert erhalten; Taverne sowie Benutzungsmodale für
  Schmelze/Räucherkammer bewusst auf den Folgeauftrag verschoben.
- Übergabe unter `CODEX/work/2026-08-30-newhaven-listenkarte/LIEFERUNG.md` dokumentiert; keine
  Git-/Live-/Build-/Testbefehle ausgeführt.

<!-- codex:2026-08-30T23:04:00+02:00 -->
## 2026-08-30 – New Haven Veredelungsmodal

- Bestehende Schmelzofen-/Räucherhaus-Logik, New-Haven-Stilanker und Gebäude-/Itemassets geprüft.
- Einen gemeinsamen interaktiven HTML/CSS/JS-Prototyp mit scrollbarem Rezeptregister,
  Prozessfluss, Fortschritt, Vorratsstatus und Stop/Start für beide Anlagen erstellt.
- Ashen-Iron-Rahmen und vorhandene Camp-/Itembilder lokal im isolierten Outbox-Paket verwendet;
  Renderer und Engine unangetastet gelassen.
- JS-Syntax sowie statische Asset-/CSS-Prüfung bestanden; sichtbare Browser-Abnahme mangels
  verfügbarer Browserinstanz als offener Integrationscheck dokumentiert.

<!-- codex:2026-08-30T23:42:00+02:00 -->
## 2026-08-30 – New Haven Veredelungsmodal Runtime

- Freigegebenes Schmelzofen-/Räucherhaus-Mockup in die New-Haven-Runtime übertragen.
- Scrollbares Rezeptregister, reale Eingang-/Ausgangsdaten, Fortschritt, Rate, Produktion,
  Vorratsreichweite sowie Rezeptwechsel und Stop über bestehende Engine-Verben verdrahtet.
- Listen- und Karten-Öffnungswege ergänzt; bestehende Gebäudeverwaltung als Rückweg erhalten.
- Responsive Ashen-Iron-Stile und 15 EN/DE-Textschlüssel ergänzt; Engine und Saveformat unberührt.
- Syntax-/Struktur-QA bestanden; Build, Typecheck und Runtime-Sichtprüfung leitfadengemäß an
  Claude übergeben.

<!-- codex:2026-08-30T23:58:00+02:00 -->
## 2026-08-30 – New Haven Listenpolitur

- Listenansicht zum New-Haven-Standard gemacht; Karte als zweite Ansicht erhalten.
- Neue Ash-Stone-/Cold-Slate-Oberflächen und einen Iron-9-Slice-Rahmen je Gebäudezeile gesetzt.
- Bau-/Queue-/Sperr-/Fertig-Zustände der Aktionsknöpfe sichtbar farbcodiert.
- Bauwarteschlange dauerhaft gemacht und auf alle acht realen Engine-Slots einschließlich leerer
  Plätze erweitert; bestehende Queue-Aktionen unverändert gelassen.
- TSX-/CSS-/i18n-Strukturprüfung bestanden; keine Engine- oder Saveänderung.
# codex:2026-08-30T23:59:30+02:00

- New-Haven-Listenansicht nach Chefkorrektur bereinigt: Gebäudekarten auf produktiven Iron-9-Slice
  und `bg_topbar.webp` umgestellt.
- Bauanzeige aus aktivem `buildJob` plus sieben Folgeplätzen zusammengesetzt und Queue-State in das
  Re-Render-Gate aufgenommen.
- Direkten Veredeln-Knopf für gebaute Schmelz-/Räucheranlagen im Gebäuderegister ergänzt.
- Statische New-Haven-QA grün (TSX-Parser, UI-Verträge, CSS 568/568); keine Live-/Buildläufe.
# codex:2026-08-30T23:59:45+02:00

- New-Haven-Großflächen (Register, Detail, Queue) von Ash-Stone auf die exakte produktive
  Sidebar-Textur `bg_sidebar.webp` umgestellt; Gebäudekarten behalten `bg_topbar.webp`.
- Statische Materialzuordnungs-QA grün, CSS-Klammern 568/568.
# codex:2026-08-31T00:20:00+02:00

- Aktuelles Offline-Rückkehrfenster samt optionalen Zuständen analysiert und fünf eigenständige
  Ashen-Iron-Designmockups mit dem eingebauten ImageGen-Werkzeug erstellt.
- Lieferung und Designrationale unter `CODEX/work/2026-08-31-offline-return-mockups/` dokumentiert;
  keine produktiven UI- oder Runtime-Dateien verändert.

# codex:2026-08-31T01:43:00+02:00

- Chef-Favorit 02 „Der Beutetisch“ zunächst als interaktives HTML-Arbeitsmockup umgesetzt und
  anschließend in das produktive `OfflinePopup` übertragen.
- Renderer-Layout vollständig auf Ashen-Iron/Gravewood umgestellt: Bilanz, Ereignisband, dynamische
  Drei-Spalten-Auswertung, getrennte seltene Beute, Camp-Art und responsive Abstufungen.
- Alle bisherigen Offline-Zustände und Aktionen beibehalten; Engine und Saveformat unberührt.
- EN/DE/ES/FR/PT-BR/RU/ZH um `offline.stage.awayLabel` ergänzt.
- Typecheck und beide statischen QA-Skripte grün; Build/Test durch Sandbox-`spawn EPERM` blockiert.

# codex:2026-08-31T17:12:00+02:00

- Fünf großformatige Kampfwidget-Mockups erzeugt und unter
  `CODEX/work/2026-08-31-combat-widget-mockups/` abgelegt.
- Gemeinsamer Ansatz: große Bodenkarten entfernen, Statusleisten figurnah schweben lassen und
  Sekundärinformationen in Rand-/Ledgerbereiche auslagern.
- Runtime und Code unangetastet; README, Übergabe und statische PNG-QA ergänzt.

# codex:2026-08-31T17:39:00+02:00

- Chef-Favorit Kampf-HUD 03 als responsives HTML/CSS/JS-Arbeitsmockup umgesetzt.
- Zahlen in HP/Ward ergänzt und dritte gelbe Angriffstimer-Leiste je Figur eingebaut; Sekundärinfos
  in obere Ledgers ausgelagert, Demo-Zustände hinzugefügt.
- Lokale Bestandsasset-Kopien genutzt; Runtime nicht verändert. Syntax, Referenzen und Diff grün;
  Browser-Sichtprüfung mangels verfügbarer Browserinstanz offen.

# codex:2026-08-31T17:55:00+02:00

- Kampf-HUD-Mockup nach Chef-Screenshot bereinigt: Außenrahmen deutlich verkleinert, Figurenleisten
  vollständig rahmenlos und sechs leere Statusslots entfernt.
- QA-Vertrag um die Abwesenheit von Statusslots und Widget-Iron-Frames erweitert; Prüfungen grün.

# codex:2026-08-31T18:18:00+02:00

- Oberes Kampf-HUD auf dynamische Waffenprofile und leichtere Eisenbänder umgebaut.
- Nahkampf-, Fernkampf- und Magieprofil im Mockup umschaltbar; Figurenname zentriert, Level aus den
  schwebenden Leisten entfernt und in die oberen Informationsbereiche verlegt.
- README und QA-Vertrag aktualisiert; Prüfungen grün, Runtime unangetastet.

## 2026-08-31 — RPG-Kampf-HUD Runtime

<!-- codex:2026-08-31T19:24:00+02:00 -->

- Separaten Branch `combat-hud-rpg-widgets` in isolierter Repository-Kopie angelegt.
- Abgenommenes Kampf-HUD in `CombatPage.tsx` und `combat.css` umgesetzt: dynamische
  Waffenprofilwerte, Vollstatistik-Dropdowns ohne Level, zentrierte Namen sowie numerische
  HP-/Ward-/Angriffsleisten frei über den Figuren.
- Typecheck bestanden; Electron-Vite-Build ausschließlich durch Sandbox-`spawn EPERM` blockiert.

## 2026-08-31 — Cross-Save-Postmodal, fünf HTML-Mockups

<!-- codex:2026-08-31T20:24:00+02:00 -->

- Bestehende Mail-Oberfläche und Anhangslogik untersucht und fünf eigenständige Ashen-Iron-
  Layoutvarianten als interaktives HTML/CSS/JS-Arbeitsmockup erstellt.
- Auswahl anderer Spielstände, Transfer-Richtung, Text, Items, Gold, Bestätigung, Erfolg und
  Kein-Save-Zustand simuliert; Runtime bewusst unangetastet gelassen.
- Lokale Bestandsassets übernommen und statische QA erfolgreich ausgeführt. Browser-Sichtprüfung
  mangels verfügbarer Browserinstanz offen dokumentiert.

## 2026-08-31 — Cross-Save-Postmodal als reiner Itemtransfer neu gefasst

<!-- codex:2026-08-31T21:12:00+02:00 -->

- Auf Chef-Korrektur Betreff, Nachricht und Goldtransfer aus allen fünf Mockups entfernt.
- Inventarauswahl, Paketplätze, Stapel-/Einheitensumme, Ziel-Save, Zustellhinweis und verbindliche
  Transferprüfung als neue Kernoberfläche umgesetzt.
- Statische QA bestanden; Runtime weiterhin unangetastet.

<!-- codex:2026-08-31T21:36:00+02:00 -->

- Itemtransfer-Mockup auf volle verfügbare Fensterhöhe umgestellt; alte feste 790-/760-px-
  Höhenbegrenzungen entfernt und QA-Vertrag entsprechend erweitert.

<!-- codex:2026-08-31T21:48:00+02:00 -->

- Erste Höhenkorrektur nach Sichtfeedback nachgeschärft: gesamte Prototypschale auf definitive
  `100vh` gesetzt und Stage-Track explizit flexibel gebunden; QA prüft diese Invarianten.

## 2026-08-31 — Cross-Save-Itemtransfer Variante 04 Runtime

<!-- codex:2026-08-31T23:18:00+02:00 -->

- Zwei-Lager-Modal mit echten Save-Slots, Inventarpositionen, Teilmengen, Unikaten, Paketprüfung und
  Zustellzuständen produktiv an die Postseite angebunden; sieben Sprachen ergänzt.
- Deterministischen Engine-Transfer, SAVE 88-Sanitize und collision-sichere Ziel-Instanz-IDs gebaut.
- Journalgeschützten Electron-Zwei-Slot-Commit plus rollbackfähigen Web-Fallback ergänzt.
- Engine-/Persistenztests ergänzt. Root-Typecheck 5/5 und `git diff --check` bestanden; Vitest und
  electron-vite Build in dieser Session durch den bekannten Windows-`spawn EPERM`-Blocker gestoppt.

### Chefkorrektur — Itemtransfer-Rahmen

<!-- codex:2026-08-31T23:41:00+02:00 -->

- Falschen Iron-Frame-Slice `28` in `mail-transfer.css` auf den Bestandswert `85` korrigiert.
- Rahmenbasen auf 4 px außen, 3 px je Lager und 4 px im Bestätigungsdialog reduziert; Innenabstände
  parallel verdichtet. Client-Typecheck bestanden.

## 2026-08-31 — Responsive Kampf-HUD-Korrektur

<!-- codex:2026-08-31T23:59:00+02:00 -->

- Obere Kampf-Detailbänder auf arena-basierte Container-Breakpoints umgestellt: unter 980 px zwei
  lesbare Vollbreitenzeilen, unter 620 px eigener Loot-Umbruch.
- Versehentliches Ausblenden der Loot-Icons unter 1200 px entfernt. Client-Typecheck und
  Diff-Check bestanden; Produktions-Build weiterhin durch `spawn EPERM` der Umgebung blockiert.

### Mail-Inventar: Plain-Teilstapel zusammengeführt

<!-- codex:2026-08-31T23:58:00+02:00 -->

- Gleiche unverzauberte Item-IDs im Transferfenster visuell und für die Paketplatzgrenze
  zusammengeführt; physische Quellslots bleiben für atomare Validierung/Entnahme erhalten.
- Zwei Engine-Tests für Teilstapel und neun verschiedene Paketpositionen ergänzt. Root-Typecheck
  5/5 bestanden; Vitest-Sammlung durch `spawn EPERM` der Umgebung blockiert.

## 2026-08-31 — Farming-Skillseite, fünf Designmockups

<!-- codex:2026-08-31T23:05:00+02:00 -->

- Ist-Funktionen der Farming-Seite und Crop-Leiter analysiert und fünf eigenständige Ashen-Iron-
  Informationsarchitekturen als 1672×941-PNG entworfen.
- Plot-Zustände, globale Aktionen, Folgesorten, Saatbestand, Auto-Nachpflanzen, Saatgartenbonus und
  vollständigen Sortenkatalog in allen Konzepten berücksichtigt.
- Übergabe und Designerinnen-Empfehlung im Mockup-README dokumentiert; Runtime unangetastet.

### Farming 01 — interaktives HTML-Mockup

<!-- codex:2026-08-31T23:31:00+02:00 -->

- Chefwahl 01 als responsive HTML/CSS/JS-Studie mit neun Beetkarten und vorhandenen Ashen-Iron-
  Assets umgesetzt.
- Pflanz-/Ernte-/Sammelzustände, Auto-Nachpflanzen, Folgeplanung, globale Aktionen und Katalogfilter
  interaktiv simuliert; Runtime unangetastet.
- Statische QA und JavaScript-Syntaxprüfung bestanden. Browser-QA mangels verfügbarer Instanz offen.

## 2026-09-09 — Codex übernimmt technische Projektleitung

<!-- codex:2026-09-09T20:12:15+02:00 -->

- Projektstruktur, acht historische Claude-Fachrollen, relevante Memory-/Designquellen,
  Branch/Version/Save-Vertrag und Dirty-State aufgenommen; keine Produktänderungen.
- AGENTS und aktive CODEX-Grundlagen auf Chef → Codex-Leitung umgestellt. Alte Grundlagen
  archiviert, .claude unangetastet; Mira als Designfachrolle erhalten.
- Lead + zehn Fachprofile mit Revieren, Prüfungen und Rückgabeformat erstellt; zehn native
  TOML-Adapter vorbereitet. .codex-Schreibzugriff abgewiesen, deshalb keine native Installation.
- Optionalen Launcher und aktive Asset-Brief-Vorlage angepasst. Kontrolleur-Review fand
  alte Claude-Abnahme in der Vorlage; korrigiert und Original archiviert.
- Strukturvalidator mit Python/tomllib hinzugefügt, Strukturcheck bestanden.
- Root-Typecheck 5/5 erfolgreich (ein Cachetreffer). Save-Vault null Tests: Vitest lokal
  vorhanden, aber Workerstart mit spawn EPERM blockiert. Keine Runtime-/Savefreigabe.
- Übernahmeanalyse und aktuellen Handoff-Einstieg erstellt; alte Übergaben/Logs bewahrt.
- Unabhängiger Nachcheck der korrigierten Vorlage/Agentenstruktur unauffällig; Scope-Diffcheck grün.

## 2026-09-09 — Sichtbarer Chroma-/Mattenaudit des Rendererbestands

<!-- codex:2026-09-09T21:58:00+02:00 -->

- 2.069 aktuelle WebPs in elf Assetordnern technisch geprüft und auf 92 Hell-/Dunkel-Bögen
  tatsächlich gesichtet; 126 Dateien zusätzlich im Detail. Itemhälften und Kreaturen
  parallel fachlich geprüft, kritische Innenraum-/Weißmattenbefunde gegengeprüft.
- 56 bestätigte sichtbare Fehler (48 Chroma, 4 Matte/Reststruktur, 4 sonstige) und
  44 separate Verdachtsfälle dokumentiert. P1/P2/P3-Vorschlag, exakte Quellen und Belege.
- Bericht, Arbeits-CSVs, vollständiges Inventar, Altlistenabgleich und filterbare Bildgalerie
  unter `CODEX/work/2026-09-09-asset-fehler-audit/` erstellt; Diagnosewerkzeuge mitgeliefert.
- Alte Alpha-0-RGB-/Ketten-Clipping-Pauschalurteile nicht übernommen. Rauch, weißes Material
  und motivische Magie nicht automatisch beanstandet; Sichtungsgrenzen ausdrücklich dokumentiert.
- 2.069/2.069 Originalhashes unverändert. Reportzählungen/Belegabdeckung erfolgreich;
  246 lokale Galerielinks und sieben Filterfälle im DOM-Testmodell bestanden.
- Keine Runtime-/Asset-/Saveänderungen, keine Neugeneration, kein Keying, kein Live-/Electronstart.
  Ausbesserungsproduktion noch nicht beauftragt.
- Unabhängige Abschluss-QA von Zählungen, Kreaturenübernahme und Belegpfaden bestanden;
  Scope-Diffcheck ohne Whitespacefehler.
