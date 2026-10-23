# Übergabe — Codex-Projektleitung

### 26.10.2026 — Claude: 1.4.0 QA-Runde, Goblin-Machart für die Raid-Sets

<!-- claude:2026-10-26T05:55:00+02:00 -->

- **Raid-Sets (Chef):** „Tier-Sets thematisch dem Raid anpassen, Goblin-like“. `design/1.4.0-assets-final.md` hat jetzt den
  Abschnitt „Gobkha'raz-Machart“ (Baustein `<GOBLIN>`, 15 neue Set-Prompts, Farben bleiben); die drei Muster vom 23.10. sind
  **nicht abgenommen** und werden neu gemacht. Nachricht an Codex steht oben im Dokument.
- **Raid-Sets Runde 3 (Chef, 26.10.):** Runde 2 (`gobkharaz-samples`) „Goblin gut, aber unepisch, viel zu schlicht“, nicht
  abgenommen. Abschnitt jetzt „Gobkha'raz-Machart: königliche Meisterarbeit“: Goblinformen plus Prunk (Blickfang je Teil,
  Gravur, Filigran, Reliefs), kein Flickwerk; Maßstab sichtbar über `voidweave_vestment`/`voidhide_body`/`godiron_platebody`.
  Nachricht „Runde 3“ oben im Dokument. <!-- claude:2026-10-26T06:30:00+02:00 -->
- **QA-Runde:** 7 Prüf-Agenten, alle Befunde P1–P3 zentral behoben (Liste im Changelog `design/1.4.0-changelog.md`, Abschnitt
  „QA-Runde“). Neue Regressionstests `packages/*/src/qa-*.test.ts` (Befund-Tests auf Soll umgestellt).
- **Ward-Fix mit Balance-Folge:** Dämpfung nur auf den Teil, den der Ward trägt (`combat.ts` STEP 7). Mythisch für reine
  Ward-Builds strenger, `RAID_DAMAGE_SCALE` bleibt 1,3 (Messreihe ×1,3/×1,15/×1,0 in `design/1.4.0-raid-magier-builds.md`).
  **Chef-Entscheid offen.**
- Neues Modul `packages/engine/src/combat-stop.ts` (stopCombat/clearBossPhase, gegen den Kreis raid ↔ combat);
  `resolveLeftRaidFight` in `raid.ts` gilt für Tick und Laden.
- Nicht hochgeladen (Chef: „Noch nicht hochladen“).

### 23.10.2026 — Codex: drei Gobkha’raz-Muster neu gebaut, zweite Chef-Abnahme offen

<!-- codex:2026-10-23T21:22:29.304Z -->

- Chef hat die ersten Muster ausdrücklich wegen fehlender Goblin-Identität verworfen. Neue verbindliche Quelle: erneuerter Abschnitt „Gobkha’raz-Machart“ und 15 neue Set-Prompts in `design/1.4.0-assets-final.md`; Farben bleiben. Asymmetrische Konstruktion hat Vorrang vor altem symmetrischem Framing. Nur drei Normal-Brustteile neu beauftragt; keine Ohr-/Kopf-/Körperteile hinzugefügt.
- Drei Fachagenten produzierten parallel, jeder prüfte anschließend ein fremdes Motiv. Ausgewählte neue Raw-Revisionen 1/2/2 für Stoff/Leder/Platte. Drei Erstgenerationen ohne Bildinput; danach nur eigene neue Raw-Bilder als Input für zwei Korrekturen (schwarze Lederstopfen, abgeriebene Plattenheraldik). Kein altes C/D-Bild oder abgelehntes Muster als Vorlage.
- Alle drei ausgewählten Finals unabhängig PASS. Goblin-Zuschnitt, Flickbauweise, asymmetrische Schultern, Haken/Sägezähne, Fangtrophäen und Schuldzeichen bei fünf tatsächlichen Nachbarn und 46 px geprüft. Leere Kleidung/Rüstung, keine Trägeranatomie oder Emission. Kleine Details bleiben bei 46 px begrenzt; geordnete Plattenwinkel sind bewusste Elite-Konstruktion. Endgültige Stilabnahme liegt beim Chef.
- Technik: 640×640 RGBA mit nativem Alpha, q92/Alpha100; ganze Canvas skalieren und transparent auffüllen, keine Maskierung/Keying. 30 zentrale Exportchecks, fünf Quell-/Promptketten, drei ZIP-Einträge und 18 Galerieziele bestanden. Finalrand vollständig Alpha 0; schwache originale Alpha 1/3/1-Randspuren erhalten. Hell/Dunkel/Signal und 46/96 px kontrolliert. Galeriehintergrundaktionen geprüft; keine Browser-/Spielabnahme behauptet.
- Erste Musterrunde vollständig mit 48 bytegleichen Dateien archiviert: `CODEX/assets/1.4.0-final-2026-10-23/archive/chef-rejected-first-samples-2026-10-23/`. Alte Root-Galerie und Root-Manifest sind als Chef-abgelehnt markiert. Rohbilder weder gelöscht noch überschrieben.
- Neue Abnahmerunde ausschließlich `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/`; Arbeitshilfen unter `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/`. [Galerie](assets/1.4.0-final-2026-10-23/gobkharaz-samples/REVIEW.html) · [ZIP](assets/1.4.0-final-2026-10-23/gobkharaz-samples/1.4.0-gobkharaz-samples.zip) · [Prüfbericht](assets/1.4.0-final-2026-10-23/gobkharaz-samples/INDEPENDENT-REVIEW.md)
- **Chef-Abnahme offen; vor weiteren Motiven oder Varianten warten.** Brief/Checkbox nicht geändert. Keine Runtime-, Content-, Loader- oder Saveänderungen durch diesen Auftrag; zwölf gezielt erfasste Runtimepfade unverändert. Keine Builds, Spieltests, Live-Starts, Commits oder Pushes. Branch `update-1.4.0`; bestehende und zeitgleich entstehende Fremddiffs erhalten. Ein paralleler Shell-Statusaufruf scheiterte vor Prozessstart mit Windows-Zugriff5; derselbe lesende Statusaufruf anschließend regulär bestanden.
- JSON-Marker in den neuen Staging-/Work-READMEs und kommentierten technischen Helfern; beim alten Root-Manifest im neuen `CHEF-REJECTED.md`. Exakte JSON-Pfade dieser Runde:

<details><summary>JSON-Nachweise und Exportstände</summary>

- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/MANIFEST.json`
- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/AUDIT.json`
- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/ARCHIVE-AUDIT.json`
- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/PREVIOUS-SAMPLES-ARCHIVE.json`
- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/evidence/gk_fire_chest-producer.json`
- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/evidence/gk_poison_chest-producer.json`
- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/evidence/gk_bleed_chest-producer.json`
- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/evidence/gk_poison_chest-independent-review.json`
- `CODEX/assets/1.4.0-final-2026-10-23/gobkharaz-samples/evidence/gk_bleed_chest-independent-review.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/sample-spec.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/runtime-baseline.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/gk_fire_chest-export.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/gk_fire_chest-export-r1.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/gk_poison_chest-export.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/gk_poison_chest-export-r2.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/gk_bleed_chest-export.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/gk_bleed_chest-export-r2.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/fire/gk_fire_chest-goblin-r1-report.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/fire/independent-poison-review.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/poison/provenance.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/poison/independent-bleed-review.json`
- `CODEX/work/1.4.0-final-2026-10-23/gobkharaz-samples/bleed/gk_bleed_chest-evidence.json`
- `CODEX/assets/1.4.0-final-2026-10-23/MANIFEST.json`

</details>


### 23.10.2026 — Codex: finales 1.4.0-Farbkonzept, drei Normal-Beispiele zur Chef-Abnahme

<!-- codex:2026-10-23T20:44:38.441Z -->

- Neue verbindliche Quelle `design/1.4.0-assets-final.md`; Auftrag nach vorherigem STOP neu aufgenommen, auf ausdrücklichen Chef-Wunsch mit drei parallelen Fachagenten. Erste Abnahmestufe abgeschlossen: `gk_fire_chest` (Stoff), `gk_poison_chest` (Leder), `gk_bleed_chest` (Platte), ausgewählte Raw-Revisionen 1/2/3. [Galerie](assets/1.4.0-final-2026-10-23/REVIEW.html) · [ZIP](assets/1.4.0-final-2026-10-23/1.4.0-normal-samples.zip) · [Prüfbericht](assets/1.4.0-final-2026-10-23/INDEPENDENT-REVIEW.md)
- Jede Familie nutzt ihre eigene Materialpalette. Ausschließlich leere Kleidung/Rüstung; Hand am Stoff ist Stickerei. Keine Raritätsfärbung oder Emission. Alte Teil 1-C/D-Positionen vollständig verworfen, Rohdateien unverändert archiviert und nicht als Vorlage benutzt; 93 abgelöste Auftragspositionen in `SUPERSEDED-RAID-LOOT.json` (keine Behauptung einer damaligen Vollproduktion).
- Unabhängiges Kreuzreview aller 3 Finals PASS: Stoff durch raid_uniques_14, Leder durch raid_sets_14, Platte durch bowcraft_14. Hauptinstanz sichtete Nachbarn und Finals ebenfalls. Leder-Nieten zu stumpfem Oliv korrigiert. Platten-Revision 2 im unabhängigen Review wegen getrennter Wappen FAIL, Revision 3 mit tatsächlicher Krone-über-Turm-Überdeckung PASS; frühere Fassungen und FAIL-Nachweis erhalten.
- Technisch bestanden: 640×640 RGBA, echte native Transparenz, Randalpha0 nach vollständiger Canvas-Skalierung/Padding, WebP q92/Alpha100, 21 Einzelchecks, sechs nachvollziehbare Generation-/Edit-Schritte, Quell-/Prompt-/Referenzhashes und bytegenaue Exportreproduktion. Drei ZIP-Einträge bytegleich gegen Manifest. Hell/Dunkel/Signal, echte 46 px und jeweils zwei Bestandsnachbarn geprüft. Schwache native Alpha-Randspuren wurden dokumentiert und nicht herausgekeyt.
- **Chef-Abnahme steht aus.** Die entsprechende Checkbox in der Final-Liste bleibt offen. Restlicher Auftrag (156 nach den drei Beispielen) und Varianten noch nicht gestartet; nach Freigabe weiter mit maximal nutzbarer Parallelität und den neuen Paletten. Die alte Queue darf nicht wieder als Auftrag aktiviert werden. Kein Vollständigkeitsanspruch für 159 Motive.
- Staging `CODEX/assets/1.4.0-final-2026-10-23/`; Arbeitshilfen und Brief-Snapshots `CODEX/work/1.4.0-final-2026-10-23/`. Keine Runtime-/Content-/Loader-/Saveänderungen durch diesen Auftrag. Neun erfasste Runtime-Ziel-/Referenzpfade unverändert. Keine Builds/Spieltests/Spielstarts, kein Commit/Push; bestehende und parallel entstehende fremde Diffs erhalten.
- JSON-Marker in Staging-/Work-README und kommentierten Helfern. Exakte zentrale JSON-Pfade: `CODEX/assets/1.4.0-final-2026-10-23/MANIFEST.json`, `CODEX/assets/1.4.0-final-2026-10-23/AUDIT.json`, `CODEX/assets/1.4.0-final-2026-10-23/ARCHIVE-AUDIT.json`, `CODEX/assets/1.4.0-final-2026-10-23/SUPERSEDED-RAID-LOOT.json`, `CODEX/work/1.4.0-final-2026-10-23/sample-spec.json`, `CODEX/work/1.4.0-final-2026-10-23/runtime-baseline.json`; vollständige motivbezogene Export-, Prompt-, Producer- und Reviewpfade stehen im Manifest. Ausgewählte Exportdatensätze: `CODEX/work/1.4.0-final-2026-10-23/gk_fire_chest-export.json`, `CODEX/work/1.4.0-final-2026-10-23/gk_poison_chest-export.json`, `CODEX/work/1.4.0-final-2026-10-23/gk_bleed_chest-export.json`; bewahrte Plattenstände `CODEX/work/1.4.0-final-2026-10-23/gk_bleed_chest-export-before-r3.json` und `CODEX/work/1.4.0-final-2026-10-23/gk_bleed_chest-export-r3.json`.


### 18.10.2026 — Codex: alle 73 Assets fertig, Bogenkorrektur und Aschesturz-Nachtrag

<!-- codex:2026-10-18T17:21:48.717Z -->

- Vollständiger Chefauftrag `design/1.3.0-assets.md`: **73 Motive / 78 WebPs**. Nach den zunächst fertigen 57 Motiven wurde beim Schlussabgleich der neue Aschesturz-Nachtrag mit weiteren 16 erkannt und ebenfalls produziert. Die MD zählt nun alle Nachträge korrekt; 73 Häkchen gesetzt. [Galerie](assets/1.3.0-2026-10-18/REVIEW.html) · [ZIP](assets/1.3.0-2026-10-18/1.3.0-assets-complete.zip) · [Prüfbericht](assets/1.3.0-2026-10-18/INDEPENDENT-REVIEW.md)
- Lieferung: `CODEX/assets/1.3.0-2026-10-18/delivery-complete/` und `1.3.0-assets-complete.zip`. Das frühere `delivery/` / `1.3.0-assets.zip` mit 57 Motiven / 62 Dateien bleibt als Zwischenstand erhalten. Für die Gesamtlieferung das neue Archiv verwenden.
- Chefkritik an Sehnen umgesetzt: `broodtalon_bow` und `chainbound_longbow` neu erzeugt; alle neun Bögen auf eine gerade, an beiden Nocken gebundene Sehne ohne Griffkontakt kontrolliert. Abgenommene Bogenbytes seitdem unverändert.
- Built-in ImageGen, einzelne Motive, natives Alpha ohne Keying/Hintergrundentfernen; deckende Szenen RGB. Rohoriginale bytegleich gesichert, verworfene Fassungen erhalten. WebP q92 / Alphaqualität100, genaue Maße und IDs. QA mit beiden Nachbarn, Zielgrößen und Hell/Dunkel/Signal; alle 73 Motive unabhängig ohne offene materielle Findings bestanden.
- Alle 78 Lieferkopien und ZIP-Einträge bytegleich gegen Manifest geprüft. 150 erfasste Runtime-Ziel-/Referenzpfade unverändert. Keine Runtime-/Save-/Versionsänderung, kein Live-Spiel, keine Builds oder Spieltests, kein Commit/Push/Release. Vorhandene Diffs erhalten.
- Der aktualisierte Brief korrigiert Jägerkodex auf `ui/talents/slayer/<id>.webp`, entsprechend dem vorhandenen Talent-Loader; dieselben sechs Bilddateien werden im korrekten Unterordner geliefert. Prestige-Knoten liegen unter `ui/talents/prestige/`. Der Loader wurde nicht geändert.
- Der zeitweilige Tool-Freigabeblock für Magiewaffen ist durch Chefantwort „Ja, alle Assets fertigstellen“ geklärt; kein offener Produktionsblocker.
- Zentrale JSON-Nachweise (Marker im Staging-README und kommentierten Arbeitshilfen): `CODEX/assets/1.3.0-2026-10-18/MANIFEST.json`, `CODEX/assets/1.3.0-2026-10-18/AUDIT.json`, `CODEX/assets/1.3.0-2026-10-18/ARCHIVE-AUDIT.json`, `CODEX/work/1.3.0-assets-2026-10-18/spec.json`, `CODEX/work/1.3.0-assets-2026-10-18/runtime-baseline.json`. Gruppen-Nachweise sind je Motiv im Manifest mit exaktem Pfad aufgeführt. Vorherige Spezifikations-/Auditstände bleiben als `*-initial*.json` erhalten.
- Briefrevision gesichert in `CODEX/work/1.3.0-assets-2026-10-18/brief-expanded-2026-10-18.md`. Arbeitshelfer und Scope-Historie im selben Ordner; Initial-`prepare.mjs` nicht zum Überschreiben der Baseline erneut starten. Branch `test-ui-fundament`; keine ungeprüften Release-Aussagen übernommen.


### 25.10.2026 (Abend) — Claude: 1.4.0 Welle 5, Release-Vorbereitung und Stoff-/Ward-Rework

<!-- claude:2026-10-25T21:15:00+02:00 -->

- Commits `75b80aa` (Welle 5 Teil 1) und Ward-Commit danach. Version 1.4.0, Kompat-Fixture `v93-synthetic-1.4.0.json`,
  Patchnotes-Entwurf, Steam-Post `design/steam-post-1.4.0.txt`, Clip-Audit der neuen Bildschirme (de/ru 1366×768).
- **Chef: Assets zum Schluss.** Bildproduktion angehalten; `1.4.0-assets.md` und `1.4.0-assets-teil2.md` werden nach der
  Implementierung neu aufgestellt. Raritätsfarben nie als Item-Farbgebung. Codex nicht weiter darauf ansetzen.
- **Raid-Balance:** 30-Magier-Messung (`design/1.4.0-raid-magier-builds.md`, Harness `raid-mage-builds.test.ts`,
  `RAID_MAGE=1`). Stoff-Magier schafften nicht einmal Drazhan (0/10). Chef-Entscheide W1 (Ward lädt 4 % je Zauber) und
  W2 (Status trifft den Ward) umgesetzt: Drazhan Stoff 10/10. Danach Chef-Entscheide W4 (Ward dämpft Treffer um 30 %)
  und F1 (Bosse halbe Frost-Verlangsamung) umgesetzt. Endstand: Normal 30/30, Heroisch 26/30, Mythisch 13/30 Builds
  ≥ 9/10 (`design/1.4.0-raid-magier-builds.md`, Balance-Spec §14). <!-- claude:2026-10-25T22:45:00+02:00 -->
- Ägis auf Raid-Rüstung jeder Klasse, Mythisch-Schaden 1,70, Ushka-Phasen gedämpft (Nachmessung §13).
- F2 Schleiertrinker: mit Dämpfung stark (Voidweave ohne Raid-Teile Mythisch 9/10), bewusst so gelassen; bei Bedarf
  in einer späteren Balance-Runde ansehen. Offen bleiben nur die Assets (zum Schluss) und der Upload (GO).
- Bugreport Cinderwretch Hide: Bildverweis auf `raw_dragonhide` (in 1.4.0; Hotfix 1.3.2 nur mit Chef-GO).
- Suiten nach W1/W2: Typecheck 5/5, engine 1924 (+19 opt-in übersprungen), content 340, persistence 474 inkl. Vault,
  client 263, Build grün. Die Balance-Hülle rechnet Magier mit Platten-BiS und deckt Stoff im Restspiel nicht ab.
- Kein Upload, kein Push. Upload ins Depot braucht Chef-GO.

### 25.10.2026 (Mittag) — Claude: 1.4.0 Welle 4 (Raid „Die Hallen von Gobkha'raz“) fertig

<!-- claude:2026-10-25T13:00:00+02:00 -->

- Raid komplett: Engine (`engine/raid.ts`, Bossphasen, Set-Stufen, Hauptattribut), Content (`content/src/raid.ts`,
  `raid-text.ts`), SAVE 93, Raid-UI (`RaidSection`, `RaidHud`, `RaidScreens`, `raidArt.ts`, `styles/raid.css`).
- Durchlauftest `engine/src/raid-e2e.test.ts`: Spec-Kit „BiS-2H“ schafft Normal offline. Stichprobe je Stil ohne
  Begleiter: Nahkampf 60,5 min, Fernkampf 41,4, Magie 40,7, 0 Neustarts (Zielband 45–75). Volle Nachmessung
  Heroisch/Mythisch (Apply #12) steht noch aus (Welle 5).
- Neu entschieden (Annahme A15 im Goal): Raid-Kampf verlassen zählt wie ein Tod (sonst hing der Lauf fest).
- Behoben: EN/DE-Namen von 10 Wellen-Gegnern und 16 Unikaten waren aus der Lore-Tabelle spaltenverschoben;
  neuer Namens-Wächter in `raid-content.test.ts`. Wächter für heroic/mythic (Signatur-Klasse) und Raid-Räume.
- Asset-Lader passend zur Liste Teil 1: Truhe `assets/ui/raid/raid_chest_closed|open.webp`, Raid-Karte
  `assets/dungeons/gobkharaz(.card).webp`, Krone `icons/icon_tier_crown.webp`. **Ohne Verbraucher:**
  `icon_rarity_heroic/mythic` (kein Bestand für andere Raritäten). Beim Einbinden entscheiden, wo sie hin.
- Offen aus dem UI-Auftrag: Classic-CSS für Raid nicht generiert; kein `enqueueRaidAtFront`; Boss-Intro in der
  Atempause nutzt die bestehende Dungeon-Ansage.

### 25.10.2026 — Claude: 1.4.0 „Feder und Stahl“, Wellen 1–3 fertig, Welle 4 (Raid) in Bau

<!-- claude:2026-10-25T05:45:00+02:00 -->

Branch `update-1.4.0`, Goal `design/1.4.0-goal.md`. Chef-Delegation 24.10. („Entscheide du das Beste für alles“):
alle Gate-Fragen (L, B Fernkampf/Werkstatt/Raid, N1) nach Spec-Empfehlung entschieden, protokolliert im Goal.

- **Welle 1** (`d79d4f8`): Mahlzeit-Platz (SAVE 89), 2H-Anzeige, Stufen-Sterne, Ländereien-Gruppe.
- **Welle 2** (`be0147f`, `608c2ab`): Materiallager + Bergung (SAVE 90), Bognerei `bowcraft` mit Pfeilen/Köchern,
  Fernkampf-Rework, Balance-Hülle neu gepinnt (SAVE 91).
- **Welle 3** (`9636799`, `d9b8180`): Zufallsereignisse (eigener Strom `eventRng`, nur Live-Loop), Arbeitsaufträge
  (`engine/orders.ts`), Werkstattkisten, Reiter „Arbeitsaufträge“, Kopf-Chip, Logbuch (SAVE 92).
- **Welle 4** (uncommittet, in Bau): Raid-Typen + SAVE 93, `engine/raid.ts` (Lauf, Gebühr, Rast, Tod je Stufe,
  Warteschlange, Wochen-Modifikator, Erstkill-Truhe), Raid-Content (`content/src/raid.ts`, 93 Items, 15 Monster,
  3 Sets) fertig; Kampfmechanik (Phasen, Set-Effekte) und Raid-UI laufen bei Fachagenten.
- Asset-Liste Teil 1 komplett freigegeben (`design/1.4.0-assets.md`, Gate L eingetragen). Teil 2 offen:
  Werkstattkisten, Kunden-Porträts Jorun/Caedren.
- Running Changelog: `design/1.4.0-changelog.md`. Kein Push, kein Upload.

### 19.10.2026 — Claude: 1.3.0 vom Chef abgenommen, Painterly-UI

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

### 18.10.2026 — Claude: Prestige „Der Aschesturz“ (1.3-Erweiterung)

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

### 17.10.2026 nachts — Claude: Chef-Entscheide umgesetzt

<!-- claude:2026-10-17T21:45:00+02:00 -->

Chef 17.10.: Schildwall 12 s, DE „Jägerkodex“, Gegnerkarten-Formel bleibt (cover im Fenster + bottom center; meine
Rückfrage hatte sie aus einer falschen Memory-Kurzzeile als „100 % auto“ dargestellt, korrigiert und neu bestätigt),
ru-Begleiter-Dossier bleibt. Commit `8596bdc`. Engine 1751, Content 310, Client 259, Build grün. Offen: nur Chef-Abnahme Ü2.

### 17.10.2026 spätabends — Claude: UI-Runde 2b, J4-Anzeige, Apply 6, Wandprüfung

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

### 17.10.2026 abends — Claude: Meisterschafts-Untergrenze + Ring-Vollprüfung

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

### 18.10.2026 — Claude: UI-Fundament Runde 2 (Struktur, Ebenenversatz)

<!-- claude:2026-10-18T13:00:00+02:00 -->

Chef: „Layer-Probleme bei jedem Container im Slayer-Auftrag, UI überall sauberer strukturieren.“ Ursache: Rahmen mit
transparenter Innenkante (`panel-frame.webp`), Verlauf nur auf der padding-box ⇒ heller Ring im Rahmenstreifen. Fix
`background-origin/clip: border-box`; dazu höchstens drei Rahmenebenen, eine Rahmenfamilie je Ebene/Seite, Slayer mit
Reitern Shop | Jagdbuch. Vier ui-dev-Agenten nach `design/ui-fundament/BRIEF-2-struktur.md`, Commit `3dd1bd1`.
Geprüft: Typecheck, Client 259/259, Build, Renders de 1366/1920 + ru 1366 (Bilder `apps/client/ui-audit/shots-struktur-a..d`).
Offen: Aufgaben-Marken-Shop „Nicht genug Marken“ läuft in ru über die Karte (alt); Begleiter-Echo in ru 1366 angeschnitten;
Namensdoppelung „Jagdbuch“ (Slayer-Baum vs. Jagen) wartet auf Chef; Gegnerkarten-Bildformel im Code `cover` statt der
in der Erinnerung notierten `100% auto` (nicht angefasst).

### 18.10.2026 — Claude: Jagdbuch + Begleiter-Rework (1.3.0-Kern)

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

### 17.10.2026 — Claude: 1.3.0 umgesetzt

<!-- claude:2026-10-17T23:30:00+02:00 -->

**17.10.2026 spät: 1.3.0 „Die Götzenhalle erwacht“ inhaltlich fertig auf `test-ui-fundament` (Version 1.3.0, SAVE 87, kein Upload).**
Auftrag `design/1.3.0-goal.md`: E1–E6, K1–K4, Ü1 (1.2.4-Fixes, SAVE 87/88 zusammengelegt), Ü3 (Übersetzungen),
Kompat-Archiv v87, Asset-Liste `design/1.3.0-assets.md` (51 Assets), Patchnotes + `design/steam-post-1.3.0.txt`.
Geprüft: Typecheck 5/5, Engine 1707, Content 310, Persistence 432 inkl. Vault, Client 241, Build grün, Clip-Audit de/ru Kernszenen 0 Funde.
Offen: Chef-Abnahme im Testspiel (Ü2), Bilder (Platzhalter bis Asset-Lieferung), Upload nur auf Chef-GO.

<!-- claude:2026-10-17T16:40:00+02:00 -->

### 17.10.2026 — Claude: UI-Fundament auf Test-Branch `test-ui-fundament` (Chef-Auftrag)

Chef arbeitet am 17.10. mit Claude. Branch `test-ui-fundament` von `1.3`; Basis-Commit `373236a`
sichert den bis 10.09. uncommitteten Stand (1.2.4-Rest + Codex 09./10.09.) unverändert.
Auftrag `design/ui-fundament/BRIEF.md`, vier Agenten (Shell / Kampf+Charakter / Lager+Meta /
Skills+Welt) mit getrennten Dateirevieren, danach Integration durch Claude.
Chef-Vorgaben 17.10.: nicht steril (Texturen/Rahmen bleiben), Slayer-Kopf bleibt, Warteschlangen-
Material (Warchain) wieder an, kompakte Reiterstufen ok, Stopp-Knopf Claude-Entscheid.
Ergebnis: Kopf 339 → ≈125 px bei 1366×768, Layouts nach Panelbreite (Container Queries), keine
Wortbrüche, 0 Layout-Funde im Clip-Audit (49 Szenen × de/ru/en × 1360/1366/1920; einzige Funde =
bewusst überlagernde Item-Karte). Nur Renderer, kein Engine-/Save-/Content-Code.
Geprüft: Typecheck 5/5, Client-Vitest 241/241, Produktions-Build grün. Ward-Leech-/Krypta-Befunde
und 1.3-Sammelliste in `design/plan-1.3.md` (Chef: 1.2.4 geht in 1.3.0 auf, kein Hotfix, alle
1.2.4-Punkte werden überarbeitet). Teststart nur im isolierten Profil (Steam aus), echte Saves unberührt.

<!-- codex:2026-09-10T11:34:00+02:00 -->

### 1.3 — Navigationskorrektur, Skalierungsbericht und erlaubter Electron-Test

Chefkritik an steriler/zu kleiner/linksbuendiger Navigation im Quellcode adressiert:
58px Sidebarbuttons,32px Icons, symmetrische Ränder/Gutter, echte Namenszentrierung
inklusive Kampfbutton. 19px Ziel,14px Schriftuntergrenze mit dynamischem Umbruch statt
Mikroschrift; kompakter Icon-über-Text-Zustand150–200px, darunter Iconrail. Topbar56–76px,
Schrift16–22px, sichtbarer Bestands-Ironframe, warme Goldtexte/Materialien/Interaktionen.
Keine neue Bildproduktion oder Änderung von Queue-Datenskin, Saves oder Engine.
Revier: Renderer `styles/chrome.css`, `styles/chrome-sidebar.css`, `components/Sidebar.tsx`;
Arbeitsfixture `CODEX/work/2026-09-10-interface-reforged/fixture.js` entsprechend angepasst.

Seitenweite Analyse read-only mit drei getrennten Fachprüfungen abgeschlossen:
`CODEX/notes/2026-09-10-ui-skalierung-ru-analyse.md`. Alle aktiven Routen/Templates,
wichtige Modale, vier Schriftoptionen und RU-Verträge statisch untersucht. Sechs
P1-Spaltenkonflikte, weitere Text-/Höhen-/Kaskadenrisiken, Abnahmematrix und Folgeplan.
Kein pauschales „alle Seiten getestet“: keine frischen Render. Kein Folgeumbau freigegeben.

Bestanden: finaler Client-Typecheck,188 scoped Regeln/6 Material-URLs/35 Sprachwerte,
20 reine Dragassertions,960 statische Fixturevarianten/16 Pfadablehnungen/110 Ressourcen.
Unabhängiger abschließender Quellenreview ohne weiteren bestätigten P1/P2-Navigationsbefund.
Build erneut `esbuild spawn EPERM`; Vitest-Workerstatus aus früherer Übergabe weiter offen.

**Neue Chefautorität:** direkte Electron-Inspektion erlaubt (keine pauschale Freigabe
für echte Saves/Steam-Schreibvorgänge). QA-Helfer `work/2026-09-10-interface-reforged/qa/inspect-electron.cjs`
setzt vor Appimport leeres Profil und Steam0; kein Save-Laden, keine UI-Klicks.
Direkte EXE `apps/client/node_modules/electron/dist/electron.exe --version` erfolgreich32.3.3.
Echter App-Versuch: Mainstart erreicht, dann FATAL platform_channel/Zugriff verweigert0x5,
kein Screenshot. Shell-Exit0 darf nicht als App-Erfolg gewertet werden. Testprofil
`CODEX/work/2026-09-10-interface-reforged/qa/electron-inspection-dUznFb/` bleibt erhalten;
keine echten Profildaten/Secrets gelesen. Keine Securityflags/Erweiterung der Rechte.
Rendererbundle vom01.09.2026; aktuelle UI benötigt ohnehin erfolgreichen frischen Build.
Browserverbindung ist nicht zum Spielen nötig; bisherige Aussage dazu korrigiert.

Nächster Schritt: aktuelle UI in zulässiger ausführbarer Umgebung visuell abnehmen;
seitenweite Layoutwelle danach gesondert beauftragen. Implementation-Nachtrag enthält
Details; ältere Werte/Startverbote darunter sind für diesen Prüfauftrag überholt.
Branch1.3, keine Commits/Pushes/Paket- oder Saveversionsänderung, Fremddiffs erhalten.

<!-- codex:2026-09-10T10:40:00+02:00 -->

### 1.3 — Sidebar/Topbar/Action Queue umgesetzt, visuelle Abnahme offen

Chef-GO zur vorausgehenden Analyse ausgeführt. Gemeinsamer scoped Shell-Skin mit kompakten
Bestands-Ironframes, Gravewood-Schalen und ruhigen Basaltflächen; keine neuen/ersetzten Bilder.
Sidebar linksbündiges Raster mit echten Namen/Levels, separatem Aktivitätszeichen und
Tastatur-Resize; Topbar containerabhängiger Reflow statt Mikroschrift, Status/XP eindeutig;
Queue flache Folgezeilen, ein Body-Scroll, größere Bedienung, Stop und explizite Materialzustände.
Unterschiedlich hohe Queuezeilen rasten durch neuen reinen Helper korrekt ein.
Fünf neue Keys × sieben Sprachen. Alte Handler/Engine/Saveverträge weiterverwendet.

Details, genaue Pfade und offene Abnahmematrix:
`CODEX/work/2026-09-10-interface-reforged/IMPLEMENTATION.md`.
Dort isolierte DOM/CSS-Fixture mit echten Bestandsressourcen, fiktiven Daten und eng begrenztem
Loopbackserver; kein Server automatisch gestartet und keine echte App/Spielstände angefasst.

**Bestanden:** Client-Typecheck nach Integration; 182 scoped CSS-Regeln/3 Material-URLs,
35 Sprachwerte, TSX-Syntax/Integrationsverträge; 20 direkte Assertions der Drag-Geometrie;
960 statische Fixturevarianten, 16 abgewiesene Pfade, 110 Ressourcen ohne Fehlreferenz;
scoped `git diff --check`. Unabhängige Quellenreviews und Root-Korrekturen der Legacy-Kaskade.
**Offen/blockiert:** Build vor Kompilierung (`esbuild spawn EPERM`); gezielter Vitest-Lauf
vor Tests (`Worker spawn EPERM`, 0 ausgeführt); sechs neue Drag-Vitestfälle noch ungetestet
im Runner. Browser-Skill: „No browser is available“, Liste `[]`. Kein visueller oder
React-/Pointerinteraktionsnachweis. Bei verfügbarem Browser/Prozessstart diese Gates nachholen.

Branch `1.3` vor/nach Arbeit geprüft. Vorhandene Diffs einschließlich Enzyklopädie in App/TopBar
erhalten; keine Git-Schreiboperation/Commit/Push, kein Release oder Paket-/Saveversionsbump.
Frühere 56 Asset-Ersetzungen unverändert. Alle neuen Logikstellen mit codex-Markern.

<!-- codex:2026-09-10T10:15:22+02:00 -->

### Interface-Analyse — Sidebar, Topbar, Action Queue; keine Umsetzung

Chef fragt nach grafischem Verbesserungspotenzial. Bericht:
`CODEX/notes/2026-09-10-interface-analyse.md`.
Root hat aktive Rahmen/Texturen, Sidebar/Navigation und vorhandene QA-Bilder angesehen;
read-only UI-Fachagent hat Topbar/Queue, Daten-/Interaktionsfälle und wirksame Overrides
geprüft. Stand Branch `1.3`, vorhandene Diffs erhalten. Keine Runtime-/Assetänderung.

Empfehlung: Ashen Iron erhalten, aber kleinere Navigationsrahmen, klare Text-/Zustands-
hierarchie, containerabhängige Topbar und flachere Queueeinträge. Codebeleg für Breiten-
konflikt mit offenem Dock/Slayer und für sehr kleine Tab-/Sidebar-Fonts; kein frischer
Browserbeweis. Vorhandene Screenshots 25.–27.08. sind ausdrücklich historische Anschauung;
alter Queue-Wortstapelfehler inzwischen adressiert, aktuelles `?` dort noch nicht enthalten.
Generatorhistorie nicht behauptet. Neue Bilder optional nach Layoutabnahme, kein Neuguss
oder Designentscheid automatisch freigegeben. Kein Live-/Electron-/Savezugriff oder Build.
Assetintegration darunter bleibt unverändert; ihr umgebungsblockierter Build bleibt offen.

<!-- codex:2026-09-10T09:46:12+02:00 -->

### 1.3 — erste beauftragte Änderung: 56 freigegebene Assets integriert

Chef hat den Branch lokal auf `1.3` gewechselt, vor/nach Einbau überprüft. Die abgenommenen
56 PNGs als 56 bestehende WebPs installiert: 30 Items, 20 Monster, hoarspite, beide Slayer-
Consumer, 3 Camp-Tagesoverlays. Keine neuen IDs, Loader-/CSS-/Logikänderungen oder Watch-Fälle.
Exakt 56 Runtime-Asset-Diffs, keine weiteren/unversionierten Runtime-Assets; umfangreiche
vorhandene Fremdänderungen erhalten. Keine Git-Mutationen, kein Commit/Push oder Release.

Bericht: `CODEX/work/2026-09-09-ausbesserungswelle/INTEGRATION-1.3.md`.
Lieferbasis: `CODEX/assets/ausbesserungswelle-2026-09-09/integration-1.3/` mit
`before/` (56 bytegenaue Originale), `webp/` (56 installierte Ausgaben), `manifest.json`
(komplette ID-/Pfad-/SHA-/Maßzuordnung) und `qa/` (6 Vergleichsbögen, Mess-/Buildbericht).
Review-/Raw-/Referenzmaster unverändert. q92/Alpha100; acht ganze Leinwände proportional
auf bestehende Maße skaliert, kein Trimmen, Spiegeln, Keying oder Umpositionieren.
Alpha beim Kodieren 56/56 pixelgenau gegen erwartetes PNG, Slayer byteidentisch.
Bilddateien +9.367.780 Bytes (~8,93 MiB); kein gemessenes Paket-/Downloaddelta.

Asset-Gate und unabhängiger read-only Kontrolleur nach Einbau: 56/56 Runtimehashes,
Backups, Review-/Raw-Master, Maße, Alpha und Scope bestanden. Zusätzlich visuelle
Konvertierungsstichproben und besonders Mire-Wisp-Nebel/Hoarspite/Raw-Wraithscale auf
Hell/Dunkel geprüft. Keine neue Stilabnahme oder perfekte Pixelkopie behauptet.
**Headless Client-Build versucht, nicht bestanden:** `pnpm --filter @hearthforge/client build`
Exit1, `esbuild: spawn EPERM` beim Konfigurationsladen, vor Kompilierung. Keine Umgehung;
bei erlaubtem Prozessstart wiederholen. Kein Browser-/Electron-Start, keine echten Saves.
Kein Runtime-Code geändert, kein Paket-/Saveversionsbump oder Engine-/Save-Testlauf.

Camp-Tag/Nacht und Slot-Grenze: nur abgenommene Tagesfassungen ersetzt. Die drei Nacht-
bilder bleiben unverändert. `camp_slot_empty_day` wird derzeit von keinem aktiven Consumer
verwendet; der Austausch schaltet keine neue UI frei. Camp-Savekalibrierungen/CSS unberührt.

Reproduzierbare Prüfungen: markierter `work/2026-09-09-ausbesserungswelle/integrate-1.3.mjs`
mit separater Vorbereitung, Hash-Gate/Backup vor Installation, wiederaufnehmbarem Einbau
und `verify()`. Alte Reviewvalidatoren nicht erneut gegen inzwischen ersetzte Quellen
laufen lassen; alte Reviewmessungen bleiben historische Belege. Galerie trägt jetzt einen
aktuellen Integrationshinweis, individuelle alte Reviewtexte bleiben ausdrücklich historisch.

Kommentarlose Dateien mit diesem Begleitmarker, exakte Pfade:
`CODEX/work/2026-09-09-ausbesserungswelle/manifest.json` → Phase `integrated_on_1.3`;
`CODEX/assets/ausbesserungswelle-2026-09-09/integration-1.3/manifest.json`;
`CODEX/assets/ausbesserungswelle-2026-09-09/integration-1.3/qa/verification.json`;
`CODEX/assets/ausbesserungswelle-2026-09-09/integration-1.3/qa/build.json`.
Binärdatei-Zuordnung vollständig im genannten Integrationsmanifest. Kein offener
Generierungs-/Reviewauftrag; einzig der umgebungsblockierte Buildnachweis bleibt offen.

<!-- codex:2026-09-10T09:26:52+02:00 -->

### Chef-Abnahme und1.3-Auftrag — Git-Schreibzugriff blockiert

Alle56 Reviewbilder angenommen, Integration als erste Änderung auf neuem Branch1.3
ausdrücklich beauftragt. Reguläres `git switch -c 1.3` gescheitert: Permission denied für
`.git/refs/heads/1.3.lock`. `.git` ist in dieser Sitzung nur lesbar. Kein Workaround,
kein Commit/Staging/Push und insbesondere keine Integration auf dem alten Branch.
Nachkontrolle: weiter `1.2.4CL`, Branch1.3 fehlt, keine Assetdiffs. Vorhandene umfangreiche
fremde Diffs erhalten. Chef muss den Branch lokal anlegen; danach die genehmigte Integration
fortsetzen. Checkpoint: `CODEX/work/2026-09-09-ausbesserungswelle/INTEGRATION-1.3.md`.
Vorbereitend Asset-Integrator/Kontrolleur-Regeln gelesen und lesende Loaderrecherche delegiert;
keine Konvertierung oder Build ausgeführt. Keine neue Bildproduktion nötig.

<!-- codex:2026-09-10T09:18:36+02:00 -->

### Nachbesserungen abgeschlossen — 56 native Reviewmaster, kein Einbau

Chef-Wiederaufnahme ausgeführt. Die15 zuvor markierten Motive mit37 echten Bildaufrufen
nachgebessert (36 nativeRGBA, ein RGB-Referenz-Edit verworfen). Drei vorhandene Bild-Agenten
parallel eingesetzt, Root mit Camp und Gegenprüfung. Beste Versuche bewusst ausgewählt,
nicht immer die neuesten. Endstand56/56 Reviewkandidaten, keine offenen Nacharbeitsflags.

Einstieg: `CODEX/assets/ausbesserungswelle-2026-09-09/REVIEW.html`.
Einzelbilder darunter `review/`; vollständiger Endbericht mit Auswahlgründen und15er-Tabelle:
`CODEX/assets/ausbesserungswelle-2026-09-09/status/revision-2026-09-10-root.md`.
Agentenberichte bleiben erhalten, auch zunächst strengere Urteile zu Pyrebound/Hoarspite
und der zwischenzeitliche Site04-Status; der Root-Bericht und Einzelstatus sind aktueller.

**Nachweis:** gesamte Galerie neu gebaut; `validate({requireComplete:true})` bestanden.
56/56 Runtimequellen unverändert,56 Referenzkopien hashgleich,56 vollständige Einzelprompts,
fünf disjunkte Lose,56 nativeRGBA-Reviewmaster hashgleich mit Raw UND Generatororiginal,
424 gültige Galerielinks. Kein Randpixel Alpha>16; vereinzelte Alpha1-Reste unbereinigt belassen.
Syntax der drei QA-Helfer und des Inline-Galeriescripts geprüft. Kein Browser-Render-Test,
kein Live-/Electron-Start, keine Spielstände, kein Typecheck/Build nötig für diese Stagingarbeit.
Terminal anfangs blockiert, später regulär verfügbar: Gitstatus/Branch/Dokument-Diffstat geprüft.
Branch `1.2.4CL`, bestehende fremde Diffs erhalten; kein Commit/Staging.

**Grenzen:** acht unveränderte native Pixelmaßabweichungen bleiben: Camp3×1536→1254,
choirbound_relic1024→1254, godgem_amulet640→1254, gravesteel_gravemark512→1254,
raw_wraithscale640→1254, voidhusk_deadeye1024→1254. Motivunterschiede in jeder Reviewkarte,
insbesondere Hoarspite-Schweif, Schmuckdetails und leichtes Camp-Framing. Das ist eine
Near-copy-Auswahl zur Chef-Review, keine Pixelidentität oder Produktabnahme.
Die optionale Frage zur lokalen Camp-Normalisierung blieb unbeantwortet; niemals vorausgesetzt.
Framing stattdessen mit weiteren nativen Neugüssen verbessert. Keine lokale Bildskalierung,
kein Keying/Despill/Freistellen, keine Originale gelöscht, keine Runtimeintegration.

Geänderte Helfer im Workordner: `production.mjs` archiviert Metadaten je Versuch und bietet
byteerhaltende Variantenauswahl; `validate.mjs` hat einen strikten vollständigen Review-Gate.
Beide kommentiert. Kommentarlose Phasenänderung mit diesem Begleitmarker:
`CODEX/work/2026-09-09-ausbesserungswelle/manifest.json` →
`review_ready_with_documented_differences`.
Erzeugte Messdaten: `CODEX/assets/ausbesserungswelle-2026-09-09/qa/validation.json` und
`CODEX/assets/ausbesserungswelle-2026-09-09/qa/review-status.json`; letzteres enthält die
exakten Pfade sämtlicher139 Raw-Versuche sowie56 Einzelstatus/Reviewpfade. Neue Versuch-Metadaten
liegen neben dem jeweils dort genannten Raw-Pfad als `attempt-NN.json`, erzeugt durch den
markierten Helfer. BRIEF/PRODUKTIONSSTATUS/CURRENT/WORKLOG auf den belegten Stand aktualisiert.

Nächster Schritt: Chef sieht die Galerie durch. Kein weiterer Agent aktiv, kein automatischer
Produkt-Einbau und keine neue Generation ohne neues Feedback erforderlich.

<!-- codex:2026-09-10T00:39:20+02:00 -->

### Chef-Pause — alle Vorschläge gespeichert, Abschluss-QA noch offen

56/56 PNG-Reviewpfade vorhanden, native Generatorbytes (55 Motive und Slayer-Alias).
Aktuelle Einzelstatus:41 review_candidate,15 needs_revision,0 pending. Acht native
Pixelmaße abweichend. Alle fünf Lose bearbeitet; keine aktiven Bild-Agenten mehr.
Letzte Korrekturen tatsächlich erzeugt und individuell gesichtet. Root- und unabhängige
Gegenprüfungen liegen in `status/cross-review-root.md` und `status/cross-review-job02.md`
unter `CODEX/assets/ausbesserungswelle-2026-09-09/`.

Der final laufende Galerie-/Validierungsaufruf wurde auf Chef-Wunsch unterbrochen;
kein abschließender Gesamtnachweis behauptet. Keine Runtimeintegration oder lokale
Kantenreparatur. Keine Fortsetzung vor neuer Chef-Anweisung. Wiederaufnahmepunkt:
`CODEX/work/2026-09-09-ausbesserungswelle/PAUSE-2026-09-10.md`.

Kommentarlose Phasenänderung:
`CODEX/work/2026-09-09-ausbesserungswelle/manifest.json` →
`paused_by_user_review_qa_pending`. Begleitmarker im Pausenblatt.
Weitere material geänderte QA-Helfer: `production.mjs` (Randdeckkraftschwellen),
`review.mjs` (Kandidaten/Nacharbeit klar getrennt, Nacharbeitsfilter), beide im selben
Workordner und mit codex-Markern. Einzelstatus-JSON und QA-Messdaten unter dem genannten
Stagingpfad sind durch die markierten Produktionshelfer und jeweiligen Losberichte belegt.

<!-- codex:2026-09-09T23:29:00+02:00 -->

### Produktionsfortsetzung — reiner Neuguss liefert natives Alpha

Kommentarlose Phasenänderung: `CODEX/work/2026-09-09-ausbesserungswelle/manifest.json`,
`phase=production_running_standalone_native_alpha`; Begleitmarker in BRIEF/PRODUKTIONSSTATUS.

Die Alpha-Blockade des bisherigen Referenz-Edits ist für den reinen Neuguss überwunden:
`carrion_talisman` als Standalone-Generierung ohne beide Bildreferenz-Argumente zweimal
RGBA 1254²; Referenz-PNG-Edit unmittelbar davor erneut RGB/Karo. Der Agent hat natives
Alpha auch an `abyssal_feast` bestätigt. Ursache innerhalb des Werkzeugs bleibt unbelegt.
Vorlage und Nachbarn werden vor jedem Aufruf angesehen, exakte Formen in Text übertragen.
`PRODUCTION-AGENT.md` wurde entsprechend ergänzt; fünf Lose bleiben die Produktionseinheiten.
Drei Agenten laufen mit Los01,02,03, Root besitzt carrion_talisman; Los04/05 folgen.

Talisman attempt03: vier Federn, benutztes Alpha, auf drei Gründen kein sichtbarer Saum.
Nähe statt exakter Kopie: Pendelanordnung/Schädelansicht weichen noch ab, im Einzelstatus
explizit benannt. Außenrand hat 32 Pixel mit Alpha1 (unsichtbare Restquantisierung), keine
beschnittene Silhouette; unveränderte Generatorbytes bewahrt. Keine Integrationsfreigabe.
Rohprompt-Protokolle liegen bei den Versuchen. Galerie-Helfer zählt jetzt auch frühere
abgewiesene Versuche von inzwischen erfolgreichen IDs korrekt (`review.mjs`, codex-Marker).
Aktuelle Zähler ausschließlich aus `qa/review-status.json` nach Galerie-Neubau übernehmen.

<!-- codex:2026-09-09T23:16:34+02:00 -->

### Gegenprüfung — frühere Generatorausgabe hat nachweislich Alpha

Chefeinwand bestätigt, nicht nur anhand früherer Abnahme: `bait_worm` aus der alten
`qa/source-map.json` bis zur unveränderten Generator-PNG zurückverfolgt und gemessen.
Diese alte Ausgabe ist RGBA 1254² mit 1.235.711 vollständig transparenten Pixeln und
weichem Alpha. Die aktuelle Geier-Tooldatei ist dagegen RGB 1254² ohne transparente Pixel.
Alte Finaldateien `bait_worm.png` und `rune_bounty.png` ebenfalls mit echtem Alpha bestätigt.
Beleg: `CODEX/work/2026-09-09-ausbesserungswelle/ALPHA-ALT-NEU.md`.
Kein Beleg für die konkrete Ursache (Modell, Tool-Weiterleitung oder Ausgabeverarbeitung),
keine Behauptung, dass eingebautes Imagegen grundsätzlich kein Alpha kann. Der fehlende
API-Key erklärt diesen Unterschied nicht. Keine neuen Generierungen oder Assetänderungen.

<!-- codex:2026-09-09T23:10:49+02:00 -->

### Neuester Nachtrag — zwei neue eingebaute Bildaufrufe, kein API-Fallback

Chef verlangt ausdrücklich den eingebauten Weg ohne API-Key. Die untenstehende
CLI-Vorbereitung ist damit überholt und keine offene Aufgabe des Chefs.
`elite_ash_vulture` mit Original-WebP und kurzem Prompt neu erzeugt (attempt-03),
anschließend aus dieser PNG im Bildwerkzeug eine reine Hintergrundkorrektur angefordert
(attempt-04). Beide tatsächlichen Ausgaben: 1254², RGB, kein Alpha, null transparente Pixel;
eingebranntes Karo visuell bestätigt. Variante 4 außerdem wärmer/brauner als das Original.
Keine Umwandlung, kein Keying, keine Aufnahme in review/ und kein Runtimeeingriff.

Stand: **zehn Rohbilder, weiterhin 0/56 brauchbare Reviewdateien**. Rohdaten unter
`CODEX/assets/ausbesserungswelle-2026-09-09/raw/monsters/elite_ash_vulture/`.
Exakte Prompts, Eingaben, Tool-Ausgaben und Grenzen im Workordner `RETRY-2026-09-09.md`.
Galerien erneuert; Validierung: 56 Prompts/Quellen/Referenzen, fünf Lose, 134 gültige Links.
Kommentarlose aktualisierte Messdaten im Staging:
`status/monsters__elite_ash_vulture.json`, `qa/review-status.json`, `qa/validation.json`.
Der Bildauftrag ist nicht fertig; vorhandene Arbeitslose bleiben erhalten.

<!-- codex:2026-09-09T22:56:25+02:00 -->

### Historie — Native-Alpha-Fallback vorbereitet, inzwischen vom Chef verworfen

Chef hat die Vorbereitung eines alternativen Erzeugungswegs bestätigt. Imagegen-Skill und
OpenAI Docs gelesen, gebündelte CLI unverändert geprüft. Zwei **Dry-Runs**, keine API-Aufrufe:
`gpt-image-1.5` und `gpt-image-2.5-sunburst`, Referenz-Edit mit transparent/PNG/high/1024²/n=1.
Aktuelle offizielle Doku unterstützt Image 2.5 mit nativer Transparenz; Empfehlung Sunburst
für einen gezielten Test, **Modell-/Kostenfreigabe noch offen**. Skill-Default Image 2 bleibt
für diesen Alphafall ungeeignet; keine stille Modellumschaltung vorgenommen.

Lokale Blocker: `OPENAI_API_KEY` fehlt (Prozess/User/Machine nur Boolean geprüft), Python-SDK
`openai` fehlt; Python 3.12.10/uv/Pillow vorhanden. Keine Installation, keine Auth-/Netzwerkprobe,
keine Secretdateien gelesen. Nutzer muss den Schlüssel lokal setzen, niemals im Chat schicken.
Vorbereitung: `CODEX/work/2026-09-09-ausbesserungswelle/FALLBACK-CLI.md`.
Kommentarlose neue Daten: `fallback/gpt-image-1.5-dry-run.json` und
`fallback/gpt-image-2.5-sunburst-dry-run.json` relativ zu diesem Workordner; Marker in Begleit-MD.
Bildlieferstand unverändert 0/56. Erst Einzeltest mit Alpha-/Motiv-QA, danach Serie.

<!-- codex:2026-09-09T22:38:00+02:00 -->

## Aktueller Chefauftrag — Prompts fertig, Bildproduktion an Alpha blockiert

Nach dem Audit hat der Chef die Neugenerierung aller **56 bestätigten Dateien** für Review
freigegeben: erst jedes Motiv analysieren und vollständig prompten, dann fünf Bild-Agenten.
Vorproduktion abgeschlossen: `CODEX/work/2026-09-09-ausbesserungswelle/` enthält BRIEF,
56 Einzelprompts, PROMPTS.md, Manifest, fünf disjunkte Jobs und bestandenes PROMPT-GATE.md.
55 verschiedene Motive: beide Slayerpfade sind identisch und erhalten denselben neuen Master.
44 Watch-Fälle bleiben ausdrücklich außerhalb der Produktion.

<!-- codex:2026-09-09T22:48:35+02:00 -->

Staging: `CODEX/assets/ausbesserungswelle-2026-09-09/` mit references, raw, review, qa, status.
Alle fünf Produktionsagenten wurden versetzt eingesetzt und haben echte Bildaufrufe gemacht.
**0/56 brauchbare Reviewdateien:** acht Generatorausgaben für fünf Motive kamen als RGB ohne
Alpha und mit eingebranntem Karo zurück. Drei gezielte Neuversuche sowie zwei einfachere
Primärreferenz-Gegenproben bestätigten den Fehler. Restproduktion gestoppt, keine CLI/API,
kein Keying und keine Runtimeintegration. Der Auftrag ist ausdrücklich **nicht fertig**.

Einstieg: `PRODUKTIONSSTATUS.md` im Workordner. Staging `REVIEW.html` zeigt den tatsächlichen
56er-Auftragsstand; `qa/ABGEWIESENE-VERSUCHE.html` zeigt acht ungeeignete Rohbilder getrennt.
`qa/validation.json`: 56 vollständige Prompts, fünf disjunkte Lose, 130 gültige Galerieziele,
56/56 Quellen unverändert, 56/56 Referenzen hashgleich. Kein Browser-/Runtime-Test nötig.
Fortsetzung erfordert einen funktionierenden Native-Alpha-Erzeugungsweg; für eine andere
CLI/API-Route vorher ausdrückliche Chef-Freigabe. Bestehende Prompts/Jobs bleiben startbereit.
`production.mjs` sichert Generatorbytes unverändert; `review.mjs`/`validate.mjs` bauen und
prüfen ausschließlich Dokumentation/Diagnose. Die frühere Auditlieferung folgt darunter.

<!-- codex:2026-09-09T21:58:00+02:00 -->

## Aktuelle Lieferung — Asset-Fehleraudit am 09.09.2026

Chefauftrag: Monster-, Item- und ähnliche Bilder auf sichtbare Chroma-/Hintergrundreste
untersuchen und für eine spätere große Ausbesserungswelle dokumentieren. **Keine Reparatur
oder Produktion beauftragt und keine Runtime-Assets verändert.**

- **2.069 WebPs** aus elf Renderer-Assetordnern auf **92 Hell-/Dunkel-Bögen** tatsächlich
  gesichtet; **126 unterschiedliche Dateien** zusätzlich im Detail. Kein PNG in diesen
  Zielordnern, obwohl der Scan beide Formate berücksichtigt. Archiv-/Staging-Master ausgeschlossen.
- **56 bestätigte Fehler:** 48 Chroma-Reste, 4 Matten-/Reststrukturfehler, 4 andere sichtbare
  Fehler (2 Alpha-Innenfehler, 2 Bodenplatten). Betroffen: 30 Items, 20 Monsterdateien,
  1 Pet, 2 Slayer-Iconpfade und 3 Bauplatzdateien. **44 Verdachtsfälle separat**, keine Austauschfreigabe.
- Eindeutige neue Zusatzbefunde: `pets/hoarspite.webp` mit eingebranntem Schachbrett im Frostnebel,
  `elite_ash_vulture` mit weißen Federresten, zwei Slayer-Symbolpfade mit Grün,
  `godgem_amulet`/`gravesteel_gravemark` mit verlorenem Motivinneren.
- Prioritätenvorschlag: 30 P1, 26 P2, 44 P3/Intentprüfung. Quelle, Fundstelle,
  Unsicherheit und Detailbeleg pro Eintrag dokumentiert.

### Lieferung und Einstieg

Alles unter `CODEX/work/2026-09-09-asset-fehler-audit/`:

- `REPORT.md`: Ergebnis, alle 100 Einzelbefunde, Grenzen, Prioritäten und Kontaktbogenindex.
- `GALERIE.html`: durchsuchbare Bildübersicht, initial nur bestätigte Fehler; klickbare Detailbelege.
- `BESTAETIGTE-FEHLER.csv`, `VERDACHTSFAELLE.csv`: getrennte Arbeitslisten.
- `ALLE-ASSETS.csv`: alle 2.069 Quellen mit Sichtungstiefe, SHA-256 und Status.
- `ALTABGLEICH.csv`: heutige Neubewertung der 89 historischen Austauschmarkierungen.
- `qa/contacts/`, `qa/details/`, `qa/findings/`: korrekt alpha-komponierte Diagnosebilder,
  nicht zur Integration geeignet. `review/reference.md`: historische Quellen und Loaderabgleich.
- `audit.py`, `proofs.mjs`, `make_report.py`, `validate_report.mjs`: wiederverwendbare
  Diagnose-/Reportwerkzeuge. Kein Massen-Keying, keine Änderung der Originalpixel.

### Verifikation und Grenzen

- **2.069/2.069 SHA-256 unverändert**, keine fehlenden oder hinzugekommenen Quellen seit Scan;
  `qa/source-verification.json`. Keine Decodefehler.
- Reportbau prüft Zählung, eindeutige Pfade, vollständige 92-Bogen-Abdeckung und vorhandene
  Detailbelege; alle 100 Befunde haben eine dokumentierte Einzelprüfung.
- `qa/report-validation.json`: 246 lokale Galerieziele gültig, 100 Karten,
  sieben Filterfälle bestanden (DOM-Testmodell, keine tatsächliche Browser-/Layoutprüfung).
- Unabhängige Abschlussprüfung bestanden: Report/CSV/Galerie konsistent, keine Duplikate
  oder fehlenden Belegpfade; alle 35 Kreaturenbefunde und 47 dortigen Detailprüfungen korrekt übernommen.
- Nicht jede Quelldatei wurde bei 1:1 vollständig betrachtet; `contact_clear` ist keine
  Fehlerfreiheitsgarantie. Verdächtiger Rauch, weißes Fell und farbiges Material nicht
  automatisch als Chroma gewertet. Keine Live-/Electron-/Saveprüfung nötig oder ausgeführt.
- Der alte Audit leitete Austausch zu pauschal aus RGB unter Alpha 0 und angeschnittenen
  Schmuckketten ab. Unsichtbares RGB ist kein sichtbarer Defekt; oben angeschnittene Ketten
  sind gemäß jüngerem Schmuckbrief teilweise gewollt. Historische Listen bleiben erhalten.
- Alte Monster-Neugüsse im Staging sind keine nachgewiesene heutige Integration/Freigabe.
  Maßgeblich sind die jetzt geprüften Rendererdateien. Kein automatischer Produktionsstart.

Marker: `codex:2026-09-09T21:30:55+02:00`, `21:51:00`, `21:55:00`, `21:58:00`
(jeweils 09.09.2026, +02:00) direkt in Diagnosecode/Begleitdokumenten.
Kommentararme Ausgaben mit exaktem Pfad relativ zum oben genannten Auditordner:
`BESTAETIGTE-FEHLER.csv`, `VERDACHTSFAELLE.csv`, `ALLE-ASSETS.csv`, `ALTABGLEICH.csv`,
`qa/metrics.csv`, `qa/manifest.json`, `qa/contact-index.json`, `qa/contact-index-camp.json`,
`qa/source-verification.json`, `qa/summary.json`, `qa/findings.json`, `qa/report-validation.json`,
`review/items-a.json`, `review/items-b.json`, `review/creatures.json`, `review/extras.json`.
JSON trägt zusätzlich ein `codex`-Metadatum. Branch, Spielcode, reale Saves und .claude unverändert;
kein Commit, Push, Merge oder Release.

---

<!-- codex:2026-09-09T20:12:15+02:00 -->

## Vorherige Lieferung — Übernahme am 09.09.2026

Chef hat Codex als technische Projektleitung eingesetzt. Organisatorische Grundlage und
Fachrollen sind angelegt; keine Gameplay-, Content-, Save- oder Assetänderung in diesem Auftrag.
Nächste Produktarbeit kommt aus dem nächsten Chefauftrag. Die früheren Aufträge unten sind
historische Übergaben, nicht automatisch aktive Aufgaben.

### Lieferung

- `AGENTS.md`: Chef → Codex-Leitung → Fachrollen, gezielte Delegation und Hot-File-Regeln.
- `CODEX/PERSONA.md`, `RULES.md`, `PROJECT.md`, `CURRENT.md`, `README.md`:
  Führungswechsel, aktuelle Landkarte/Snapshot und erhaltene Sicherheits-/Save-/Artregeln.
- `CODEX/agents/`: Lead und zehn Fachprofile (UI, Logic, Combat, Content, Platform,
  Balance, Lore, Art-Director/Mira, Asset-Integrator, Kontrolleur).
- `CODEX/agents/native/*.toml`: zehn versionierbare native Adapter, Modell/Reasoning nicht gepinnt.
- `CODEX/templates/ASSET-BRIEF.md`: aktive Vorlage auf Chef/Codex/QA umgestellt;
  keine Claude-Abnahme mehr und Blickrichtung am tatsächlichen Consumer.
- `CODEX/tools/validate-agent-setup.py`: wiederholbarer statischer Struktur-/TOML-/Linkcheck.
- `CODEX/notes/2026-09-09-projektuebernahme.md`: Befunde, Quellen, Grenzen und technische Risiken.
- `START-CODEX.bat`: Einstieg zeigt neue Hauptrolle statt Designarbeiter unter Claude.
- `CODEX/archive/2026-09-09-lead-transition/`: alte Grundlagen und Assetvorlage erhalten.

### Verifikation und Grenzen

- `pnpm typecheck`: **5/5 bestanden**, davon ein Cachetreffer und vier neu ausgeführt.
- Save-Vault: erster pnpm-exec-Aufruf löste vitest nicht auf. Direkter Aufruf der vorhandenen
  lokalen `vitest.cmd` startete Vitest 2.1.9, scheiterte aber vor Test-Sammlung am Workerstart
  mit `spawn EPERM`. **Null Tests ausgeführt; keine Save-Kompatibilitätsfreigabe.**
- `python CODEX/tools/validate-agent-setup.py`: bestanden (zehn Profile plus Lead,
  zehn gültige TOML, Profilverweise und Links). Statische Prüfung, keine native Discovery.
- Eigenes Dateidiff auf Whitespace geprüft. Keine vollständige Gameplay-Suite, Simulation,
  Runtime-Build oder visuelle Spielabnahme in diesem Organisationsauftrag.
- Unabhängiger Kontrolleur-Durchgang als instruierter Worker: Profile/Grundlagen konsistent;
  veraltete Asset-Abnahmevorlage als P2 gefunden und korrigiert. **Nachcheck unauffällig**,
  alle gemeldeten Punkte geschlossen; ebenfalls nur statischer Organisations-/Konfigurationscheck.
- `.codex/agents/` ist in dieser Sitzung schreibgeschützt. Ein Schreibversuch wurde abgewiesen.
  **Native Adapter sind vorbereitet, nicht installiert.** Sofort nutzbar sind Profile/Routing
  über AGENTS und explizite Fachaufträge. Native Installation später mit berechtigtem Zugriff.
- `.claude/**`, bestehende Produktdiffs, Branch, Runtime-Assets und reale Saves unverändert.
  Kein Commit, Push, Merge oder Release.

### Technischer Stand / nächster Prüfschritt

Branch `1.2.4CL`, HEAD `053d4c9`, Manifestversion 1.2.3, SAVE_VERSION 88.
Vor betroffenen Codeänderungen den Testausführungsblocker beheben bzw. in einer berechtigten
Prüfumgebung testen; nicht aus dem Typecheck Releasefähigkeit ableiten.
Die aktuelle Sitzung hat die portable Rollenübergabe benutzt, keinen nativ registrierten Agenten.

Marker dieser Lieferung: `codex:2026-09-09T20:12:15+02:00`.
Kein kommentararmes Datenformat geändert; TOML/Batch/Python tragen gültige Kommentare.

---

## Historisches Übergabearchiv bis 31.08.2026

Die folgenden Texte bleiben als Verlauf erhalten. Ihre damaligen Aussagen „aktuell“,
„an Claude“ und Freigabe-/Releasezustände sind **historisch**, nicht heutige Arbeitsanweisungen.

# Frühere Übergabe an Claude

## Aktueller Status

**Testbereit: Gravewood V3 trennt skalierbare Rahmen vollständig von ortsfesten, gekachelten Oberflächen.**

`styles/gravewood-theme.css` wird in `styles/index.css` weiterhin zuletzt importiert. Buttons und Tabs verwenden je einen transparenten Frame über einer unveränderten Materialkachel; Statewechsel tauschen keine Maserung mehr aus. Shell und große Inhaltsräume sind kühl auf Schiefer/Basalt gestaffelt, Controls bleiben warm, Bronze markiert Fokus. Volle und leere Slots teilen denselben Frame-/Surface-Vertrag. Character besitzt drei klare äußere Frame-Owner statt gestapelter Rahmen. Topbar-Balken sind höher, ruhiger und kurz-linear animiert. Die Komponentenhierarchie, Handler, State-Logik und i18n blieben unangetastet.

Zusätzlich zu den bestehenden Runtime-Dateien liegen acht V3-WebPs unter `apps/client/src/renderer/assets/ui/gravewood/v3/`. Das V3-Quellpaket mit Alpha-Mastern, nahtlosen Texturen, Slice-Metadaten und Laufzeitvorschau liegt unter `CODEX/assets/ui-kit-gravewood-production-v3/`. Der exakte Stand vor V3 samt SHA-256-Manifest liegt unter `CODEX/outbox/2026-07-30-gravewood-v3-preintegration/`.

## Letzte Lieferung

- Root-Anweisung `AGENTS.md` für dauerhafte Codex-Rolle
- `CODEX/` mit Projektanalyse, Regeln, Snapshot, Arbeitslog und Übergabeordnern
- optionaler Launcher `START-CODEX.bat`
- `CODEX/templates/ASSET-BRIEF.md` als verbindlicher Vier-Phasen-Workflow Chef/Claude → Codex → QA → Abnahme
- erste Runde: fünf transparente Sidebar-Button-Konzepttafeln mit je drei Zuständen plus `comparison-board.png`
- zweite Runde: fünf transparente Medieval-Standardbuttons 06–10 plus `comparison-board-medieval.png`
- vollständige Promptdokumentation unter `CODEX/assets/sidebar-button-concepts/PROMPTS.md`
- ausgewählte Richtung 08 als fertiges, dreistufiges 9-Slice-Paket in PNG und WebP
- Slice-Guide, State-Vorschau und Laufzeitprüfung für 240–420 px Sidebar-Breite
- Ironbound-WebPs produktiv nach `apps/client/src/renderer/assets/ui/buttons/` übernommen
- Sidebar- und Topbar-Slicewerte minimal auf `90 / 150 / 90 / 150` angepasst
- vorherige Produktions-WebPs unter `CODEX/outbox/2026-07-30-sidebar-topbar-button-backup/` gesichert
- fünf simple Alternativen 11–15 unter `CODEX/assets/sidebar-button-simple-concepts/`
- Vergleich in echter UI-Größe unter `comparison-board-simple.png`
- ausgewählte Richtung 13 „Quiet Leather“ als Normal/Hover/Pressed in PNG und WebP produziert
- Quiet Leather produktiv in Sidebar und Topbar eingebunden; vorheriges Ironbound-Set unter `CODEX/outbox/2026-07-30-ironbound-before-quiet-leather/` gesichert
- Topbar auf 46 px Mindesthöhe verschlankt und beide Navigationsflächen mit subtilen Hover-/Pressed-Transforms versehen
- zehn vollständige UI-Kit-Overview-Boards samt drei originalen mittelalterlichen Hand-Cursor-States je Set unter `CODEX/assets/ui-kit-overviews/`
- hochauflösende und kompakte Gesamtvergleiche: `comparison-board.png` und `comparison-preview.png`
- reproduzierbarer Richtungs-/Promptkatalog in `CODEX/assets/ui-kit-overviews/PROMPTS.md`
- vollständige Einzelproduktion für Kit 06: primäre, alternative und quadratische Buttons mit je vier States
- zwei schlanke offene 9-Slice-Frames, fünf technisch nahtlose Texturen und ein leerer Slot
- getrennte Progressbar-Layer, aktive/inaktive Tabs samt separatem Tab-Hebel, Badge und Divider
- global vorbereitete Scrollbar-Familie und drei originale Hand-Cursor-States in 256/128/64 px
- `CODEX/assets/ui-kit-gravewood-production/metadata/slices.json` und `cursors/hotspots.json`
- drei visuell geprüfte Laufzeit-Previewboards unter `CODEX/assets/ui-kit-gravewood-production/previews/`
- Rollback- und Integrationsplan ohne vorzeitige Produktmutation
- 41 Gravewood-Runtime-Dateien nach `apps/client/src/renderer/assets/ui/gravewood/` übernommen
- globale UI-Schicht `styles/gravewood-theme.css` erstellt und zuletzt aus `styles/index.css` importiert
- Sidebar, Topbar, Aktionsbuttons, Icon-Controls, Tabs, Frames, Oberflächen, Slots, Progressbars, Tooltips, Badges, Divider, Scrollbars und Cursor produktiv gebunden
- Legacy-Button-Aliasse einschließlich neuem Disabled-State auf Gravewood Button 1 umgestellt
- datiertes Pre-Integration-Backup mit SHA-256-Manifest erstellt
- strecksichere V2-Familien für Primär-, Alternativ-, Quadrat- und Tabbuttons produziert
- alle Buttonzustände innerhalb ihrer Familie geometrisch identisch abgeleitet
- wiederholbaren Scrollbar-Track und 9-Slice-Handle in drei Zuständen produziert
- V2-Dateien in Produktionspaket, Runtime und vier Legacy-Aliasse übernommen
- doppelte Legacy-Rahmen und verformte Tab-/Button-Proportionen in der zentralen Theme-Schicht korrigiert
- V2-Preintegration mit 64 Dateien und SHA-256-Manifest gesichert
- V3: fünf frame-only Familien für Button, Tab, Slot, Panel und Card produziert
- V3: drei exakt nahtlose kalte Texturen für Schiefer, Basalt und Aschestein produziert
- V3: Button-/Tab-Statebilder durch gemeinsamen Frame plus ortsfeste Materialfläche ersetzt
- V3: volle und leere Slot-Consumer zentral vereinheitlicht
- V3: Container-Ownership und Character-Doppelrahmen gezielt bereinigt
- V3: Topbar-Progresssystem von alten Segment-9-Slices entkoppelt und höher/smoother gesetzt
- V3: schweres Hover-/Klick-/Scrollbar-Gefühl ohne Texturskalierung umgesetzt
- New-Haven-System rein lesend auditiert; Architektur weitgehend fertig, Assetintake unvollständig
- isolierten New-Haven-Kontrollordner mit Manifest für 24 fehlende Dateien angelegt

## Offene Entscheidung

Gravewood V3 ist für den visuellen Rundgang durch die laufende App bereit. Besonders zu prüfen sind große Hauptmenübuttons, kompakte Optionsbuttons, Topbar-Tabs/-Balken, volle und leere Slots, Character-Spalten sowie lange/kurze Scrollbars. New-Haven-Kontrollassets benötigen ein separates Chef-GO und sind nicht produktiv. Der finale Electron-Build ist in einer Umgebung mit erlaubtem Prozessstart zu wiederholen.

## Verifikation

- Assetpfade in Sidebar und Topbar bestätigt
- alle drei produktiven Ironbound-WebPs `1826 × 331 px` mit Alpha
- CSS-Verweise für Normal, Hover und Pressed in beiden Flächen bestätigt
- interner TypeScript-Compilerlauf: 151 Client-Dateien, 0 Diagnosen
- regulärer Prozessstart für `pnpm`/`electron-vite build` durch Windows-Sandbox mit `EPERM` blockiert
- Chef-Live-Screenshot bestätigt, dass Sidebar und Topbar die Assets laden
- neue Konzepte 11–15 bei `240 × 42 px` und `230 × 54 px` gerendert
- neue Konzepte: exakt zwei transparente Pixelreihen oben und unten in PNG und WebP geprüft
- alle zehn UI-Kit-Boards als lesbare PNGs geprüft; neun Boards `1536 × 1024 px`, Gravewood `1572 × 1001 px`
- gemeinsame Vergleichstafel visuell geprüft; alle zehn Richtungen, Pflichtbausteine und Cursor-States sind erkennbar
- keine neuen UI-Kit-Konzeptdateien in Produktpfade kopiert
- Gravewood-Paket: 73 direkt nutzbare Produktionsdateien
- Primär-, Alternativ- und Quadratbutton: State-Alpha innerhalb der jeweiligen Familie identisch
- horizontale Buttons: exakt zwei vollständig transparente Reihen oben und unten
- große und kompakte Frames: Center-Alpha 0
- fünf Texturen: linke/rechte sowie obere/untere Kanten jeweils exakt identisch
- 9-Slice-Renders für Buttons, Frames, Progressbar, Tabs und Scrollbars bei kleinen Zielgrößen visuell geprüft
- Cursor bei 128 und 64 px visuell geprüft; Hotspotdaten dokumentiert
- 39 installierte Runtime-Bilder bytegenau gegen das Produktionspaket geprüft; keine Abweichung
- 33 CSS-Asset-URLs auf Existenz geprüft; keine fehlende Datei
- `gravewood-theme.css` mit PostCSS geparst: 60 Top-Level-Nodes, keine Syntaxfehler
- interner TypeScript-Compilerlauf nach Integration: 151 Client-Dateien, 0 Diagnosen
- `electron-vite`-Build headless angestoßen; Windows-Sandbox blockiert den benötigten Prozessstart mit `spawn EPERM`
- V2: 40 Produktionsbilder bytegenau gegen das neue Quellpaket geprüft; keine Abweichung
- V2: 20 Runtime-WebPs bytegenau gegen das neue Quellpaket geprüft; keine Abweichung
- V2: vier Legacy-Aliasse bytegenau gegen die Primärfamilie geprüft
- V2: Primär-, Alternativ- und Quadratfamilie besitzen je identische Alpha-Geometrie in allen vier Zuständen
- V2: inaktive und aktive Tabs besitzen identische Alpha-Geometrie
- V2: horizontale Buttons haben exakt zwei vollständig transparente Pixelreihen oben und unten
- V2: 9-Slice-Vorschauen bei 468×64, 240×42, 104×44, 48×48, 32×32, 280×48 und 160×42 visuell geprüft
- V2: Scrollbar-Track bei 14×300 und Handle bei 14×82 in allen drei Zuständen visuell geprüft
- final: 35 CSS-Asset-URLs vorhanden; PostCSS-Parse mit 100 Top-Level-Nodes ohne Syntaxfehler
- final: interner TypeScript-Compilerlauf mit 151 Client-Dateien, 0 Diagnosen
- V3: drei Texturen mit exakt identischen gegenüberliegenden Pixelkanten
- V3: fünf Framezentren vollständig transparent
- V3: horizontaler Frame mit exakt zwei transparenten Pixelreihen oben und unten
- V3: 8 Runtime-WebPs bytegenau gegen das Quellpaket geprüft
- V3: 44 CSS-Asset-URLs vorhanden; PostCSS-Parse mit 151 Top-Level-Nodes ohne Syntaxfehler
- V3: interner TypeScript-Compilerlauf mit 151 Client-Dateien, 0 Diagnosen

## Codex-Code-Marker dieser Lieferung

- `codex:2026-07-30T18:12:04+02:00` — `apps/client/src/renderer/styles/sidebar.css`, Quiet-Leather-9-Slice-Bindung
- `codex:2026-07-30T18:12:04+02:00` — `apps/client/src/renderer/styles/topbar.css`, Quiet-Leather-9-Slice-Bindung
- `codex:2026-07-30T18:22:15+02:00` — `apps/client/src/renderer/styles/sidebar.css`, Hover-/Pressed-Bewegung und Reduced-Motion-Regel
- `codex:2026-07-30T18:22:15+02:00` — `apps/client/src/renderer/styles/topbar.css`, 46-px-Höhe, Hover-/Pressed-Bewegung und Reduced-Motion-Regel
- Binäränderungen ohne Kommentarmöglichkeit: `apps/client/src/renderer/assets/ui/buttons/button_new.webp`, `button_new_hover.webp`, `button_new_pressed.webp`
- Binäre Konzeptlieferung ohne Produktänderung: `CODEX/assets/ui-kit-overviews/01-ashen-bronze.png` bis `10-cinder-cathedral.png`
- Neue binäre Staging-Lieferung ohne Produktänderung: gesamter Ordner `CODEX/assets/ui-kit-gravewood-production/`
- `codex:2026-07-30T20:34:06+02:00` — `apps/client/src/renderer/styles/index.css`, finaler Theme-Import
- `codex:2026-07-30T20:34:06+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, alle logischen Gravewood-Integrationsblöcke
- `codex:2026-07-30T20:49:05+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, Doppelrahmen-, Proportions- und Legacy-Overlay-Korrektur
- `codex:2026-07-30T21:12:22+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, V2-Tab-Slices und stretchsichere Scrollbar-Bindung
- `codex:2026-07-30T21:44:25+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, V3-Rahmen-/Surface-Vertrag, kalte Materialhierarchie, Slot-, Container-, Character-, Topbar- und Motion-Korrektur
- `codex:2026-07-30T22:24:34+02:00` — `apps/client/src/renderer/styles/gravewood-theme.css`, visuelle V3-Regressionskorrektur für Main Menu, Offline-Modal, Sidebar-Footer, Character/Inventory, fertige Slots, Topbar/Progress, Action Cards, Options, Scrollgriff und Ultrawide-Compositing
- Statischer V3-Nachtest: 165/165 ausgeglichene CSS-Klammern, 42/42 Asset-URLs vorhanden, verbindliche Slice-Werte eingehalten, kein globaler `#root .panel`-Reset, kein `will-change` und kein fixed-Background
- **Chef-Rollback 2026-07-30:** Der visuelle Live-Test hat die gesamte appweite V3-Materialrichtung verworfen. `gravewood-theme.css` bleibt nur als inaktives Archiv erhalten und wird von `styles/index.css` nicht mehr importiert.
- `codex:2026-07-30T22:56:44+02:00` — `apps/client/src/renderer/styles/index.css`, dokumentierte Deaktivierung der abgelehnten globalen Themeschicht
- Die drei produktiven `button_new{,_hover,_pressed}.webp` wurden bytegenau aus `2026-07-30-gravewood-appwide-preintegration` wiederhergestellt. Scoped Sidebar-/Topbar-Interaktionen bleiben aktiv.
- Rollback-Nachtest: aktueller Importgraph entspricht dem Pre-Gravewood-Stand; Gravewood-Assets werden nur noch von der nicht importierten Theme-Datei referenziert. New Haven ist unberührt.
- `codex:2026-07-30T23:05:56+02:00` — kontrollierte Wiedereinführung ausschließlich in
  `styles/gravewood-navigation.css` plus finaler Import in `styles/index.css`: V3-Buttonrahmen
  und dunkle Gravewood-Textur für Sidebar, Sidebar-Footer und Topbar. Keine anderen UI-Consumer.
- Backup vor der scoped Navigation:
  `CODEX/outbox/2026-07-30-gravewood-navigation-v3-preintegration/`.
- `codex:2026-07-30T23:12:13+02:00` — zweite kontrollierte Freigabe in
  `styles/gravewood-controls.css`: Handcursor, Endkappen-Scrollbar, Topbar-Progress und
  Character-/Inventory-Slots. In `gravewood-navigation.css` wurden die zusätzliche innere
  1-px-Lichtkante entfernt und der Active-Layer auf die volle Buttonfläche gezogen.
- Backup vor dieser Kontrollgruppe:
  `CODEX/outbox/2026-07-30-gravewood-controls-preintegration/`.
- `codex:2026-07-30T23:16:19+02:00` — `gravewood-controls.css`: gedrückter Handcursor
  gilt während Pointer-Down appweit über `body:active`, nicht mehr nur auf Buttons.
- `codex:2026-07-30T23:19:21+02:00` — `gravewood-navigation.css`: Sidebar/Footer auf alternative
  Rahmenfamilie plus Lederfläche, Hover ohne Box-Scale/Clipping, Topbar-Active ohne rechteckiges
  Innenoverlay. Neue `gravewood-offline.css`: Lederflächen für drei Berichtskarten und neuer
  „Einsammeln“-Button.
- Backup:
  `CODEX/outbox/2026-07-30-gravewood-sidebar-alternate-offline-preintegration/`.
- `codex:2026-07-30T23:28:43+02:00` — Cursor-Prioritätskorrektur in
  `gravewood-controls.css`; eckige Holzrahmen plus Gravewood-Textur in
  `gravewood-navigation.css`; 50-%-Collect in `gravewood-offline.css`; neue isolierte
  `gravewood-loadgame.css` für Waldportraits, Lederkarten und Kartenaktionen.
- Backup:
  `CODEX/outbox/2026-07-30-gravewood-loadgame-sidebar-wood-preintegration/`.
- `codex:2026-07-30T23:38:38+02:00` — höhere Sidebarbuttons und Topbar-Gleichzug in
  `gravewood-navigation.css`; neuer Equipment-Top-Inset in `gravewood-character-fixes.css`;
  neue große Action-Card-Werte und Materialhierarchie in `gravewood-actioncards.css`.
- Backup:
  `CODEX/outbox/2026-07-30-gravewood-actioncards-equipment-nav-preintegration/`.
- Kommentarfreie Binäränderungen: 41 neue Dateien unter `apps/client/src/renderer/assets/ui/gravewood/`
- Kommentarfreie Legacy-Aliasse: `button_new.webp`, `button_new_hover.webp`, `button_new_pressed.webp`, neues `button_new_disabled.webp`
- Exakter vorheriger Binär- und CSS-Stand: `CODEX/outbox/2026-07-30-gravewood-appwide-preintegration/`
- Exakter Stand vor V2: `CODEX/outbox/2026-07-30-gravewood-v2-preintegration/`
- Exakter Stand vor V3: `CODEX/outbox/2026-07-30-gravewood-v3-preintegration/`
- Exakter Theme-Stand vor der visuellen V3-Regressionskorrektur:
  `CODEX/outbox/2026-07-30-gravewood-v3-visual-regression-fix/`
- Exakter verworfener Live-Stand unmittelbar vor dem Not-Rollback:
  `CODEX/outbox/2026-07-30-gravewood-v3-emergency-rollback/`

## New Haven — Runtimeintegration nach Chef-GO

- 98 produktive WebPs unter `apps/client/src/renderer/assets/camp/`: 15 Gebäude × 3 Stufen ×
  Tag/Nacht, zwei Kartengründe und drei generische Bauzustände × Tag/Nacht.
- Quellen: 74 unveränderte Dateien aus `CODEX/CityAssets/` und 24 freigegebene Dateien aus
  `CODEX/NEW-HAVEN-ASSET-CONTROL-2026-07-30/deliveries/`.
- Gebäude-/Bauzustandssprites wurden für die Runtime auf 640 × 640 px optimiert; die beiden
  1672 × 941 px großen Kartengründe behalten ihre Quellauflösung. Gesamtgröße: 10,234,476 Bytes.
- `campArt.ts` löst Tag/Nacht und Stufenfallback auf; `campMapArt.ts` bindet Kartengrund,
  Leerplatz, Baustelle und Gerüst in beiden Lichtfassungen.
- `NewHavenPage.tsx` nutzt einen rein kosmetischen lokalen Lichtzyklus (Tag 07:00–18:59),
  schaltet Karte/Popup/Liste gemeinsam, zeigt im Baumenü echte Stufe-I-Art und im
  Platzierungsgeist den freigegebenen Leerplatz.
- Keine Änderung an Engine, Content, Persistenz, Save-State oder `.claude/**`.
- QA: 98/98 Dateien, 0 unerwartete; 96/96 Sprites mit Alpha und transparenten Ecken; alle
  15 IDs im Content vorhanden; 45 Gebäude-Paare durchschnittlich 99,608 % Masken-IoU;
  interner TypeScript-Lauf mit 151 Eingabedateien und 0 Diagnosen.
- Code-Marker: `codex:2026-07-30T22:30:00+02:00` in `campArt.ts`, `campMapArt.ts`,
  `NewHavenPage.tsx` und `assets/camp/README.md`.
- Backup, Mapping und QA:
  `CODEX/outbox/2026-07-30-new-haven-runtime-preintegration/`.

## UI-/Woodcutting-Nacharbeit 2026-07-30

- `gravewood-navigation.css`: Sidebarrahmen auf 10 px verstärkt; Hover von Sidebar und Topbar
  rasterisiert oder transformiert nicht mehr die gesamte Buttonbox.
- `gravewood-character-fixes.css`: Equipment-Owner lokal von globalen 28 px auf 14 px Rahmenbreite
  reduziert und Desktopspalten auf `0.98fr 1.28fr 1.54fr` verteilt.
- Woodcutting-Audit: alle 16 `cut_*` besitzen Action-Art; fehlend waren ausschließlich
  `craft_timber_beam`, `craft_timber_brace`, `craft_timber_anchor`.
- Neue Runtime-Assets:
  `assets/actions/craft_timber_{beam|brace|anchor}.webp` (1024 px) und
  `assets/items/timber_{beam|brace|anchor}.webp` (640 px), RGBA mit transparenten Ecken und ohne
  messbaren grünen Halosaum.
- Kontrollquellen/Preview: `CODEX/AssetControl/Woodcutting/`.
- Rollbackstände:
  `CODEX/outbox/2026-07-30-gravewood-hover-equipment-structure-prechange/` und
  `CODEX/outbox/2026-07-30-woodcutting-runtime-preintegration/`.
- QA: drei scoped CSS-Dateien fehlerfrei geparst, 0 fehlende CSS-URLs, TypeScript 151 Dateien /
  0 Diagnosen.
- Code-Marker: `codex:2026-07-30T23:48:41+02:00` in Navigation/Character-Fix sowie
  `codex:2026-07-30T23:59:10+02:00` in der Topbar-Hoverkorrektur.

## Empfohlener Claude-Owner

`.claude/agents/ui-dev.md` für visuellen Mehrseiten-/Mehrgrößen-Rundgang und finalen Build; Codex bleibt laut Chef für die fortlaufende UI-Gestaltung zuständig.

## Character-/Hover-/Performance-Pass 2026-07-31

- Auftrag: farbige Equipment-Rarity-Rahmen entfernen, defekten Sidebar-3D-Hover zurückbauen,
  Itemkarten schließbar machen und die akute UI-Framerate untersuchen/verbessern.
- Ergebnis:
  - `gravewood-controls.css` entfernt Rarity-Borders nur in Character-Inventar/Equipment/Bag,
    lässt die radialen Seltenheitsscheine jedoch bestehen.
  - `gravewood-navigation.css` neutralisiert Sidebar-Transform/Scale/Translate vollständig;
    Topbar-Hover bleibt separat erhalten.
  - `ItemTooltip.tsx` und `components.css` ergänzen ein zugängliches X direkt neben dem Wiki-Knopf.
  - `Toasts.tsx` führt den großen Besitz-/Achievement-/Mastery-Diff höchstens einmal pro Sekunde
    statt bei jedem 10-Hz-Live-Tick aus.
  - `GameContext.tsx` bündelt Display-rAF-Aufrufe auf maximal 30 Simulationen/s und priorisiert
    den 10-Hz-React-Tick per Transition.
  - `App.tsx`/`gravewood-controls.css` stellen beide breiten Topbar-Fills von `clip-path` auf
    `scaleX` mit 80-ms-Transition um.
  - `base.css` entfernt festen Stone-Background und den bildschirmfüllenden SVG-Turbulence-Filter.
  - `MainMenu.tsx`/`menu.css` reduzieren Funken 18→10 und entfernen den Live-Blur großer
    Nebelflächen; der weiche Radialverlauf bleibt sichtbar.
  - `EquipmentOverview.tsx` entfernt eine unbenutzte `computeStats`-Berechnung aus der Paperdoll.
- Bestandsschutz: Keine New-Haven-, Engine-, Content-, Save-, `.claude/**`- oder
  `packages/**`-Änderung.
- QA: TypeScript 151 Dateien / 0 Produktdiagnosen bei explizitem vorhandenem Client-TypeRoot;
  fünf betroffene CSS-Dateien mit PostCSS fehlerfrei geparst.
- Noch zu messen: reale FPS/Frame-Time in Electron bei 1920×1080 und 3440×1440. Weitere P0-Pfade
  sind Character-Grid-Reconciliation und die großen Achievement/Skill/Bestiary/Bank/Shop-Grids;
  Combat zusätzlich Parent-Doppelrender und Partikel-Canvas.
- Rollback:
  `CODEX/outbox/2026-07-31-slot-hover-tooltip-performance-prechange/`.
- Code-Marker: `codex:2026-07-31T00:32:37+02:00`.

## Übergabeformat für künftige Arbeiten

Jede materielle Lieferung ersetzt den Abschnitt „Aktueller Status“ durch:

- **Auftrag:** Was Chef/Claude bestellt hat
- **Ergebnis:** Was konkret fertig ist
- **Betroffene Reviere:** Design / Assets / UI / Content / Logic / Combat / Persistence / Release
- **Dateien:** vollständige Pfade oder geordnete Liste
- **Verifikation:** ausgeführte headless Checks und Ergebnis
- **Offen:** Entscheidungen, Risiken, fehlende Assets oder Blocker
- **Empfohlener Claude-Owner:** zuständige Rolle aus `.claude/agents/`
- **Outbox:** Link auf ein Lieferpaket unter `CODEX/outbox/**`, falls vorhanden
- **Codex-Code-Marker:** Liste aller verwendeten `codex:<timestamp>`-Marker und Dateipfade; bei kommentarfreien Dateien zusätzlich der genaue geänderte Datenabschnitt

## Action-Card Layout 01 — Vier-Input-Vertrag 2026-07-31

- **Auftrag:** Zehn stabile Skill-Action-Card-Systeme entwerfen und nach Chef-Auswahl ausschließlich
  die Geometrie von `01 Fixed Dock` produktiv übernehmen. Card-Zustände dürfen bei STOP, Locked,
  Materialmangel oder 0–4 Inputs ihre Außenhöhe nicht verändern.
- **Ergebnis Design:** Korrigierte HTML-Kontrolltafel mit zehn Konzepten, je vier Zustände und
  zehn PNG-Previews unter `CODEX/AssetControl/ActionCardConcepts-2026-07-31/`. Der verworfene
  Zwei-Input-Erstpass bleibt vollständig unter `archive/rejected-two-input-pass/` erhalten.
- **Ergebnis Runtime:** Alle `SkillPage`-Action-Cards nutzen jetzt einen festen 720-px-Vertrag:
  Hero, 2×2-Stats, feste Output-/Lootzone, 2×2-Ressourcenrack, State-Platte, Preset-Grid und
  Mastery. Rezepte zeigen bis zu vier echte Inputs; nicht belegte Slots bleiben ruhige Reserven.
  STOP/Craftable/Locked ersetzen dieselbe State-Platte. `1×/25×/50×/∞` bleibt immer sichtbar
  und ist bei Level-/Materialblockade deaktiviert.
- **Art-Direction:** Nur Layout 01 wurde übernommen. Bestehende Citadel-Rahmen, Gravewood-Holz,
  Leder, Bronze und Action-Art bleiben produktiv; keine neue Theme-Entscheidung.
- **Betroffene Reviere:** Design, UI. Keine Engine-, Content-, Shared-, Persistence-, New-Haven-,
  `.claude/**`- oder `packages/**`-Änderung.
- **Dateien:**
  - `apps/client/src/renderer/pages/SkillPage.tsx`
  - `apps/client/src/renderer/styles/gravewood-actioncards.css`
  - `CODEX/AssetControl/ActionCardConcepts-2026-07-31/**`
- **Verifikation:** Content-AST durch Root-QA: 672 `inputs`-Arrays, Maximum 4, kein Rezept >4.
  TypeScript: 151 Client-Dateien, 0 Diagnosen. PostCSS: 45 Top-Level-Nodes, keine Syntaxfehler.
  DOM-/CSS-Vertrag: Vier-Slot-Loop, feste State-Platte, 720 px, sechs Body-Zonen, zwei
  Level-/Material-Guards und zehn Preview-PNGs bestätigt.
- **Offen:** Visueller Live-Rundgang durch Gathering, aktives STOP, Vier-Input-Crafting,
  Foraging-Multiloot und Locked bei 1920×1080 sowie 3440×1440 durch Chef/UI-Owner.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` für den visuellen Rundgang und finalen Build.
- **Outbox:** `CODEX/outbox/2026-07-31-action-card-layout01-prechange/`.
- **Codex-Code-Marker:** `codex:2026-07-31T19:32:00+02:00` in `SkillPage.tsx` und
  `gravewood-actioncards.css`; Kontrolltafel `codex:2026-07-31T19:14:00+02:00`.

## New Haven — freie Platzierung und Kapazität 2026-07-31

- **Auftrag:** New Haven von festen Bauplätzen auf freie, persistierte Kartenplatzierung
  umstellen; nur Kartengrenze und Gebäudeüberlappung begrenzen. Den Kopfblock entfernen,
  Map/List ohne Seiten-Scrollbar auf die verfügbare Höhe spannen, Karten- und Listenbaukosten
  vereinheitlichen und einen lokalen Kostenlos-Debugschalter neben `List` ergänzen.
- **Ergebnis:** Gebäude können auf der gesamten Karte frei positioniert werden. Der vollständige
  Fußabdruck muss innerhalb der Karte liegen und darf kein anderes Gebäude schneiden. Bestehende
  Positionen bleiben über `camp.positions` stabil gespeichert. Das Rathaus liefert nun 4/5/5
  zusätzliche Gebäudekapazität (gesamt 4/9/14); der alte technische Feldname `buildSlots` bleibt
  nur zur Save-/API-Kompatibilität erhalten.
- **Debug:** Der UI-lokale, nicht persistierte Debugschalter erlässt ausschließlich Gold- und
  Materialkosten. Crew-, Rathaus-, Kapazitäts-, Zeit-, Kartenrand- und Kollisionsregeln bleiben
  aktiv. Karten-Baumenü und Listenansicht verwenden dieselben Engine-Prädikate und Kosten.
- **UI:** Alter Intro-/Town-Hall-/Build-Slot-/Crew-Kopfblock entfernt. Map bleibt fest, während
  Baumenü beziehungsweise Liste intern scrollen. New-Haven-Karten wurden an die vorhandene
  Action-Card-Sprache angenähert und Kosten im Karten-Baumenü vollständig sichtbar gemacht.
- **Betroffene Dateien:** `apps/client/src/renderer/pages/NewHavenPage.tsx`,
  `apps/client/src/renderer/styles/newhaven.css`, `apps/client/src/renderer/i18n/translations.ts`,
  fünf Dateien unter `apps/client/src/renderer/i18n/locales/`, `packages/shared/src/index.ts`,
  `packages/engine/src/camp.ts`, `packages/engine/src/camp.test.ts`,
  `packages/engine/src/camp-map.test.ts`, `packages/content/src/index.ts`.
- **Entscheid:** `design/newhaven-freie-platzierung-entscheid-2026-07-31.md`; überschreibt nur
  die alten Slot-/Polygon-/Kopfblockregeln der früheren New-Haven-Dokumente.
- **Persistence:** Kein Save-Bump nötig; Positionspersistenz existiert bereits in Save-Version 78,
  und es wurde kein neues `GameState`-Feld eingeführt.
- **Verifikation:** TypeScript — Client 151, Engine 176, Shared 1 und Content 7 Dateien, jeweils
  0 Diagnosen. PostCSS — `newhaven.css` mit 209 Top-Level-Knoten fehlerfrei geparst. Neun
  in-process Engine-Invarianten bestanden: Kapazität, normale Kostenpflicht, kostenloser Debugbau,
  kein Ressourcenverbrauch, Crew-/Kapazitäts-/Kartenrand-/Kollisions-Gates und Positionsspeicherung.
  Der reguläre Vitest-Runner konnte in der Sandbox wegen `spawn EPERM` nicht gestartet werden.
- **Offen:** Headless-Logik ist geprüft; visueller Live-Rundgang und regulärer Vitest-Lauf außerhalb
  der Sandbox bleiben bei Chef/Claude. Insbesondere 1920×1080 und 3440×1440 sowie Drag-Grenzen,
  interne Scrollbereiche und Map-/List-Kosten visuell prüfen.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` für den visuellen Rundgang und
  `.claude/agents/logic-dev.md` für den regulären Vitest-Lauf.
- **Outbox:** `CODEX/outbox/2026-07-31-new-haven-freebuild-prechange/`.
- **Codex-Code-Marker:** `codex:2026-07-31T19:00:03+02:00` in allen materiell geänderten
  TypeScript-, CSS-, Content-, Test- und Lokalisierungsblöcken.

## Rahmenauswahl und Ironwood-Bastion-Integration 2026-07-31

- **Auftrag:** Fünf neue Dark-Fantasy-Rahmen passend zu den produktiven Sidebarbuttons erzeugen,
  ältere Konzepte archivieren und die Kandidaten in einer HTML-Kontrollansicht bei realistischen
  UI-Größen zeigen. Nach Chef-Feedback mussten Rahmen und Preview deutlich kräftiger werden.
- **Ergebnis:** Der technisch defekte erste Pass ist verworfen. Fünf neu generierte
  1536×1024-RGBA-Rahmen als PNG und lossless WebP besitzen transparente Zentren und einen
  gemeinsamen 192-px-9-Slice-Vertrag. Die klickbare HTML-Ansicht nutzt echtes `border-image`.
- **Kontrollordner:** `CODEX/AssetControl/FrameSelection-2026-07-31-v2/` mit `index.html`,
  `previews/comparison-board.png`, `frames/**`, `metadata/slices.json`, Prompts, README und QA.
- **Archiv:** Der alte aktive Ordner ist als `REJECTED.md` markiert und zusätzlich vollständig unter
  `CODEX/AssetControl/archive/FrameSelection-2026-07-31-rejected-broken/` gesichert.
- **Chef-Entscheid/Runtime:** 01 **Ironwood Bastion** ist gewählt. Die produktive Default-Datei
  `apps/client/src/renderer/assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners.webp` wurde
  auf Ironwood umgestellt und auf 224×149/28-px-Slice kompatibilisiert. Damit wechseln Sidebar,
  Topbar und 196 bestehende Default-Citadel-Nutzungen zentral, ohne lokale Rahmenbreiten umzubauen.
- **Verifikation:** Auswahlassets: fünf transparente Zentren, kein sichtbares Chroma-Grün und echte
  Compact-/Tall-Stresstests. Runtime-Asset: RGBA, 224×149, transparenter 28-px-Innenbereich,
  0 sichtbare grüne Pixel. CSS der direkten Verbraucher mit PostCSS fehlerfrei.
- **Rollback:** `CODEX/outbox/2026-07-31-ironwood-bastion-default-prechange/`.
- **Offen:** Visueller Rundgang aller großen und sehr kleinen Citadel-Konsumenten durch Chef/UI-Owner.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` und `.claude/agents/asset-integrator.md`.
- **Codex-Marker:** `codex:2026-07-31T20:21:01+02:00` in Kontrollmetadaten,
  `design-system.css`, `gravewood-navigation.css`, `gravewood-actioncards.css` und dieser Übergabe;
  die kommentarfreie WebP-Ersetzung ist mit exaktem Produktionspfad oben dokumentiert.

## New Haven Maßstab, Popups und Action-Card-Rahmen 2026-07-31

- **Auftrag:** Gebäude responsiv und proportional darstellen, Rathaus als Größenreferenz behalten,
  Fischerhütte I verkleinern, einen Debug-Sofortabschluss ergänzen, die beschädigten Gebäude-Popups
  ordnen sowie Suffix-Chance aus Skillkarten entfernen und Produces/Mastery passend rahmen.
- **Ergebnis New Haven:** `camp.positions` bleibt die einzige persistierte Prozentwahrheit.
  Die gemeinsame Bühne entspricht 16 % Kartenbreite/28,44 % Kartenhöhe und ist auf 16:9 real
  quadratisch. Alle 15 Familien besitzen logisch kuratierte Stufenskalierungen innerhalb dieser
  Bühne; Rathaus bleibt 1, Fischerhütte I ist 0,64. `object-fit: contain` hält jedes Asset vollständig
  sichtbar. Der neue Sofortknopf schließt einen laufenden Auftrag ausschließlich über
  `tickCampBuild` ab.
- **Ergebnis Popups:** Ein 14-px-Außenrahmen besitzt das Modal; die innere BuildingCard entfernt
  Doppelrahmen, Art nutzt `contain`, Effektfelder brechen Text sauber um und lange Funktionshäuser
  scrollen innerhalb des Modals. Kosten, Fortschritt, Refining und Aktionen besitzen klar getrennte
  Leder-/Holzflächen.
- **Ergebnis Action Cards:** Die Suffix-Projektion und ihre Berechnung wurden vollständig aus
  `SkillPage` entfernt. Engine-Suffixlogik und Saves bleiben unangetastet. Produces-/Loot- und
  Mastery-Zonen besitzen nun vollständige 5-px-Frames mit Lederfläche.
- **Persistence:** Kein neues oder geändertes `GameState`-Feld, kein Save-Bump, keine Migration.
  Prozentpositionen existieren bereits in Save-Version 78; visuelle Skalierungen und Debugstatus
  werden nicht persistiert.
- **Verifikation:** TypeScript Client 151, Shared 1, Content 7, Engine 176 — jeweils 0 Diagnosen.
  Vier berührte CSS-Dateien mit PostCSS fehlerfrei. Der Vitest-API-Sammler startete in der Sandbox,
  sammelte dort aber 0 Dateien; die neuen Engine-Tests sind kompiliert, müssen regulär außerhalb
  dieser Umgebung laufen.
- **Outbox:** `CODEX/outbox/2026-07-31-new-haven-map-scale-instant-prechange/` und
  `CODEX/outbox/2026-07-31-action-card-suffix-frame-prechange/`.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` für Live-QA und
  `.claude/agents/logic-dev.md` für den regulären Engine-Testlauf.
- **Codex-Code-Marker:** `codex:2026-07-31T20:21:01+02:00` in allen materiellen Codeblöcken.

## Ironwood-Eckvertrag und Stein-Navigation 2026-07-31

- **Auftrag:** Nach Live-Screenshot die aus den Ecken in gestreckte Kanten ragenden Ornamente
  korrigieren, Sidebar/Topbar auf eine gekachelte mittelgrobe Steinfläche umstellen und den weiterhin
  glitchenden Sidebar-Hover samt eckigem Active-Inset entfernen.
- **Asset:** `01-ironwood-bastion-slice-safe.png/.webp` besitzt vier vollständige 192×192-Ecken.
  Zwischen ihnen liegen ausschließlich kontinuierliche Holz-/Metallschienen ohne Nieten, Pfeile,
  Spangen oder andere einmalige Details. Die produktive 224×149-Fassung hält denselben Vertrag bei
  28 px und ersetzt weiterhin zentral `wooden_frame_with_corners.webp`.
- **Navigation:** Sidebar, Footer und Topbar kacheln `texture-basalt.webp` mit 192×192 sichtbarer
  Fliesengröße unter dem separaten Rahmen. Sidebar-Hover/-Active setzt Transform, individuelle
  Translate/Scale-Werte, Filter, Animation und Pseudolayer hart zurück. Active besitzt keinen
  rechteckigen Inset-Selector mehr; Feedback bleibt auf Textlicht und einen äußeren Schatten begrenzt.
- **QA:** Runtime-WebP 224×149 RGBA, Zentrum Alpha 0, 0 sichtbare Chroma-Pixel. Echte 9-Slice-
  Renderings bei 560×64, 680×50 und 500×210 zeigen vollständig geschlossene Ecken und ruhige Kanten.
  `gravewood-navigation.css` mit PostCSS fehlerfrei geparst.
- **Kontrolle:** `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-runtime-28px-slice-safe.png`
  und `previews/selected-navigation-basalt.png`.
- **Rollback:** `CODEX/outbox/2026-07-31-ironwood-corner-slice-prechange/` enthält die beanstandete
  Vorfassung; CSS-Block über Marker vollständig auffindbar.
- **Codex-Code-Marker:** `codex:2026-07-31T21:30:08+02:00` in
  `gravewood-navigation.css`, Kontrolltafel, Metadatenbegleitung und dieser Übergabe. Die binäre
  Runtime-Ersetzung ist mit exaktem Pfad dokumentiert.

## Ironwood L-Corner und ruhiger Sidebar-Hover 2026-07-31

- **Live-Befund:** Die erste Slice-safe-Fassung war mechanisch korrekt, las sich aber als vier
  losgelöste quadratische Eckplaketten. Beim Sidebar-Hover blieben außerdem Außen-Glow und Filter auf
  Kindebenen sichtbar; die Footer-Systemaktionen wurden irrtümlich ebenfalls kalt auf Basalt gesetzt.
- **Assetkorrektur:** `01-ironwood-bastion-l-corner.png/.webp` verbindet alle Schienen über kompakte
  L-Knoten. Die 192-px-Quell- und 28-px-Runtime-Slicezonen bleiben unverändert. Produktiv ersetzt die
  korrigierte 224×149-RGBA-WebP erneut zentral
  `apps/client/src/renderer/assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners.webp`.
- **Navigation:** Sidebarzustände teilen nun denselben Rahmen, dieselbe Basaltkachel, denselben Schatten
  und dieselbe Pixelgeometrie. Kein Transform, Scale, Filter, Kindfilter, Glow oder Pseudolayer wird
  beim Hover zugeschaltet; nur die Textfarbe antwortet dezent. `Save`, `Main Menu`, `Mail`, `Options`
  und `Quit Game` bleiben als eigene warmbraune Gravewood-Gruppe erhalten.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-runtime-l-corner.png` und
  `previews/selected-navigation-final.png`.
- **Rollback:** `CODEX/outbox/2026-07-31-ironwood-l-corner-prechange/` enthält die zuvor produktive
  Square-Corner-Fassung.
- **QA:** Runtime-WebP 224×149 RGBA, transparentes 28-px-Zentrum und 0 sichtbare Chroma-Pixel; echte
  9-Slice-Renders bei 560×64, 680×50 und 500×210. Die kommentarfreie Änderung an
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/metadata/slices.json` ist hier mit Zielpfad
  dokumentiert.
- **Codex-Code-Marker:** `codex:2026-07-31T21:52:00+02:00` in
  `gravewood-navigation.css`, Kontrolltafel, README und dieser Übergabe.

## Warme Navigation und einheitlicher Character-Rahmen 2026-07-31

- **Navigation:** Sidebar nutzt 11 px, Topbar 8/12 px sichtbares Ironwood-Chrome. Beide liegen auf
  ruhigem dunklem Leder statt der beanstandeten grauen Basaltfläche; ihre Zustände wechseln weiterhin
  keine Geometrie oder Textur.
- **Footer:** Die fünf Systemaktionen verwenden rötlich-schwarzen, oxblood-getönten Stein. Dadurch
  trennt sich die Innenfläche klar vom braunen Ironwood-Rahmen.
- **Character:** Die drei sichtbaren Hauptowner `.cs-col-left`, `.cs-col-tabpanel` und `.cs-col-right`
  teilen exakt denselben 18-px-Rahmen, Slice 28 und dieselbe L-Corner-Runtimequelle. Keine zusätzliche
  Wrapper- oder Doppelrahmenebene wurde eingeführt.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-navigation-warm-materials.png`.
- **QA:** `gravewood-navigation.css` mit 58 und `gravewood-character-fixes.css` mit 9 Top-Level-Knoten
  fehlerfrei über PostCSS geparst; sämtliche referenzierten Assets vorhanden.
- **Persistence:** keine State-, Save- oder Engineänderung.
- **Codex-Code-Marker:** `codex:2026-07-31T22:08:00+02:00` und
  `codex:2026-07-31T22:14:00+02:00`.

## Frame-Button-Alpha-Clipping 2026-07-31

- **Befund:** Die Runtime-Schienen waren im Asset 3 px horizontal und 4 px vertikal von der echten
  Außenkante eingerückt. `border-box` zeigte deshalb außen Fläche; `padding-box` erzeugte innen einen
  deutlich zu großen schwarzen Spalt.
- **Finale Korrektur:** Die neun Slice-Zonen bleiben 28 px groß, ihre Schienen und L-Knoten wurden
  innerhalb der jeweiligen Zone an die echte Außenkante verschoben. Der kurze `padding-box`-Hotfix
  wurde vollständig entfernt; Navigation und übrige Citadel-Consumer dürfen ihre Fläche wieder bis
  unter das nun randbündige Chrome malen.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/edge-anchor-comparison.png`.
- **QA:** Runtime 224×149 RGBA, Alpha-Bounds exakt 0/0 bis 223/148, Center-Alpha 0, keine grünen
  Pixel und keine temporären Swap-Dateien. Drei CSS-Dateien fehlerfrei mit PostCSS geparst.
- **Rollback:** `CODEX/outbox/2026-07-31-ironwood-edge-anchor-prechange/`.
- **Codex-Code-Marker:** `codex:2026-07-31T22:41:00+02:00`. Die kommentarfreie Änderung an
  `metadata/slices.json` ist hier mit exaktem Zielpfad dokumentiert.

## Skalierende Navigation und Character-Background-Owner 2026-07-31

- **Sidebar/Topbar:** Das sichtbare Ironwood-Chrome skaliert nun mit `--sb-scale-eff` beziehungsweise
  `--tb-scale`; auch `border-image-width` folgt damit der tatsächlich gezogenen UI-Größe. Begrenzende
  `clamp()`-Werte verhindern zu dünne Klein- und überfette Großzustände.
- **Material:** Sidebar und Topbar nutzen `assets/bg_tileable_wood.webp` als echte wiederholbare
  Holzfläche. Normal, Hover, Active und Focus behalten dieselbe Geometrie und dieselbe Kachel.
- **Character:** `.cs-col-tabpanel` ist alleiniger Background-Owner für Equipment und Stats; die
  inneren Ansichten sind transparent. `.cs-col-right` besitzt die Taschenfläche allein und zieht sie
  vollständig bis unter den gemeinsamen 18-px-Rahmen.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/selected-navigation-wood-scaled.png`.
- **QA:** beide geänderten CSS-Dateien fehlerfrei mit PostCSS geparst; Holz-, Equipment- und
  Taschenasset vorhanden. Kein Live-/Electron-Start, keine Persistence- oder Engineänderung.
- **Codex-Code-Marker:** `codex:2026-07-31T23:18:00+02:00`.

## War Table Ledger Main Menu 2026-07-31

- **Chef-Auswahl:** Main-Menu-Konzept 02 „War Table Ledger".
- **Produktion:** `MainMenu.tsx` trägt im geschlossenen Zustand eine responsive 2×2-Kommandotafel.
  Nach New Game, Load Game oder Options öffnet dieselbe Schale ein großes Ledger mit kompakter
  Register-Navigation und internem Scrollbereich. Das aktive Register oder das neue Schließen-X
  führt zurück zur Tafel.
- **Funktionserhalt:** Reale Save-Slots, New/Overwrite, Load/Delete, sämtliche geteilten Optionsregler,
  Sprachen, Bug Report, Font Preview und Quit bleiben an ihren bestehenden Handlern. Keine Save-,
  Engine- oder Persistence-Änderung.
- **Funktionaler Kontrollprototyp:**
  `CODEX/AssetControl/MainMenuConcepts-2026-07-31/index.html` mit vier klickbaren Screens,
  Rücknavigation, Slot-/Kartenwahl, Load-/Delete-Demos und exemplarischen Optionsinteraktionen.
- **QA:** Client-Typecheck über TypeScript-API: 151 Dateien, 0 Diagnosen. `menu.css` und
  Prototyp-CSS fehlerfrei mit PostCSS geparst; Prototyp-JavaScript syntaktisch fehlerfrei und alle
  lokalen Navigationsziele/Assets vorhanden. Browser-Live-QA bleibt offen, da in der aktuellen
  Umgebung kein Browser-Backend verfügbar ist; Electron wurde regelgemäß nicht gestartet.
- **Codex-Code-Marker:** `codex:2026-07-31T23:42:00+02:00`.

## War-Table-Unterseiten und New-Haven-Weltprojektion 2026-07-31

- **Main Menu:** Der fehlerhafte dauerhafte Seitenregister-Aufbau ist entfernt. Die 2×2-War-Table
  ist wieder ein eigenständiger Startbildschirm; New Game, Load Game und Options ersetzen sie als
  jeweils eigenes Vollfenster. Ein sichtbarer lokalisierter „Zurück zum Menü"-Knopf sowie Escape
  führen zurück. Die große Holzfläche wurde durch dunklen Basalt mit eingelassenen Lederbuttons
  ersetzt; Holz bleibt nur als dosierter Rahmen-/Materialakzent.
- **New Haven:** `.nh-map-stage` füllt den verfügbaren Layoutbereich, während `.nh-map` darin immer
  das größtmögliche exakte 1672:941-Rechteck bildet. Der Kartengrund wird vollständig statt per
  `cover` ausgeschnitten dargestellt. Prozentpositionen, Footprints, Pointer-Koordinaten und
  Drag-Ghosts beziehen sich damit bei 1920×1080 und 3440×1440 auf dieselbe Weltfläche.
- **Persistence:** Bereits gespeicherte Prozentkoordinaten bleiben gültig; kein GameState-Feld, keine
  Save-Version und keine Migration geändert.
- **QA:** Client-Typecheck 151 Dateien, 0 Diagnosen; `menu.css` und `newhaven.css` fehlerfrei mit
  PostCSS geparst; Tages- und Nachtkarte beide 1672×941 verifiziert.
- **Codex-Code-Marker:** `codex:2026-07-31T23:58:00+02:00` und
  `codex:2026-07-31T23:59:00+02:00`.

## Item-Card-HTML-Konzepte 2026-07-31

- **Auftrag:** Zehn stärker loot- und entscheidungsorientierte Dark-Fantasy-Item-Card-Systeme
  entwerfen, die vollständig mit HTML/CSS und realistisch verfügbaren Repo-Assets umsetzbar sind.
- **Ergebnis:** Zehn einzeln öffnbare responsive Konzepte plus klickbare Vergleichsansicht unter
  `CODEX/AssetControl/ItemCardConcepts-2026-07-31/`. Jedes Layout rendert dieselben drei realen
  Belastungsfälle: Legendary Unique mit Equip-Vergleich, Long-Name-Instanz mit fünf Affixen und
  stapelbares Questitem.
- **Asset-/Technikvertrag:** Ausschließlich vorhandene Item-Artworks, tilebare Holz-/Stein-/
  Equipmentflächen, CSS-Rahmen, Verläufe und ersetzbare Typografie. Keine kopierten Markenornamente,
  keine einmalig gemalten Elemente und keine externen Abhängigkeiten.
- **Betroffene Reviere:** Nur Designkontrolle. Kein Produktions-, Engine-, Content-, Save- oder
  `.claude/**`-Eingriff.
- **QA:** 11 HTML-Dateien, 10 Einzelkonzepte, JavaScript syntaktisch gültig, CSS-Struktur
  ausgeglichen, alle lokalen HTML-Verweise und Itemassets vorhanden, zehn Datenvertragsfelder
  bestätigt. Browser-QA blockiert: kein Playwright-Binary und System-Chrome `spawn EPERM`.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` nach Chef-Auswahl für die produktive
  Übertragung auf `ItemTooltip`/`ItemCell`.
- **Codex-Code-Marker:** `codex:2026-07-31T23:18:00+02:00` und
  `codex:2026-07-31T23:24:00+02:00` ausschließlich im Kontrollordner.

## Ledger-Dichte, Action-Card-Chrome und Navigationsmaterial 2026-07-31

- **Main Menu:** New/Load entfernen die äußere War-Table-Doppelhülle und verwenden ein einziges,
  inhaltsgebundenes Ledger. Fünf Slots stehen zentriert in fünf Spalten; die große leere braune
  Restfläche entfällt. Options bleibt als einzige Unterseite ein größeres internes Scrollfenster.
- **Action Cards:** Der Außenrahmen jeder vollständigen `.skillcard` wurde von 7 auf 14 px
  verdoppelt. Innere Info-, Ressourcen-, Status-, Mengen- und Masteryrahmen bleiben bewusst gleich,
  damit der feste Layout-01-Inhaltsvertrag nicht gequetscht wird.
- **Navigation:** Sidebar und Topbar nutzen kühlen Schiefer mit dezenter warmer Lichtkante statt
  brauner Holzkachel. Save/Main Menu/Mail/Options/Quit nutzen hellere rauchige Bronze mit Oxblood-
  Tönung statt fast schwarzem Basalt.
- **QA:** Client-Typecheck 151 Dateien, 0 Diagnosen; `menu.css`, `gravewood-actioncards.css`,
  `gravewood-navigation.css` und `newhaven.css` fehlerfrei geparst; alle Materialassets vorhanden.
- **Codex-Code-Marker:** `codex:2026-07-31T23:59:30+02:00`,
  `codex:2026-07-31T23:59:45+02:00` und `codex:2026-07-31T23:59:50+02:00`.

## New-Haven-Listen-Action-Cards und kostenloser Move-Modus 2026-07-31

- **Auftrag:** Die noch alten, inhaltsabhängig wachsenden New-Haven-Listenkarten an den freigegebenen
  Action-Card-Vertrag angleichen, Gebäude-Art vollständig einpassen und die fehlende sichtbare
  Verschiebesteuerung ergänzen.
- **UI-Ergebnis:** `.nh-grid` verwendet feste 760-px-Karten mit sechs stabilen Zonen. Art, Kopf,
  Flavor, Jetzt/Nächste-Wirkung, Bauaktion und Funktionsdock bleiben unabhängig von Build-/Locked-/
  Refinery-Zustand an derselben Stelle. Normale Gebäude lassen den Funktionsbereich nicht leer,
  sondern spannen ihren Aktionsdock über beide unteren Rasterzeilen.
- **Art-Ergebnis:** Gebäude-Art verwendet `object-fit: contain`, eine ruhige kalte Steinbühne und
  einen 7-px-Ironwood-Rahmen. Das Quell-Seitenverhältnis bleibt erhalten; kein Cropping.
- **Popup/Move:** Das Gebäude-Popup besitzt vollständig gerahmte Module, eine eigene Aktionszeile
  und einen kostenlosen `Move`-Befehl. Derselbe lokale Move-Modus ist neben Map/List sichtbar.
  Normale Klicks öffnen weiterhin das Popup; Drag ist ausschließlich im Move-Modus aktiv.
- **i18n:** Move, Hinweis und Abschlussbefehl in EN/DE/ES/FR/pt-BR/RU/ZH ergänzt.
- **Persistence:** Keine State-, Save-, Content- oder Engineänderung. Bestehende Prozentpositionen
  in `camp.positions` bleiben die einzige persistierte Wahrheit.
- **QA:** Client-Typecheck über TypeScript-API: 151 Dateien, 0 Diagnosen. `newhaven.css` mit PostCSS
  fehlerfrei geparst; 0 fehlende lokale CSS-Assets. Kein Live-/Electron-Start.
- **Betroffene Dateien:** `pages/NewHavenPage.tsx`, `styles/newhaven.css`,
  `i18n/translations.ts`, fünf Dateien unter `i18n/locales/` sowie diese Codex-Dokumentation.
- **Empfohlener Claude-Owner:** `.claude/agents/ui-dev.md` für Live-QA bei 1920×1080 und 3440×1440.
- **Codex-Code-Marker:** `codex:2026-07-31T23:42:00+02:00`.

## New-Haven-Kartenverdichtung und Überlappungsfreigabe 2026-07-31

- **Live-Befund:** Der erste feste Listenvertrag spannte normale Gebäudekarten künstlich über
  760 px und erzeugte zwischen Materialkosten und Bauaktion einen großen leeren Schacht.
- **Korrektur:** Normale Karten sind nun stabile 640 px hoch und besitzen fünf vollständig genutzte
  Zonen. Nur Veredelungsgebäude verwenden 760 px mit einem sechsten Funktionsdock. Alle Artworks
  bleiben per `contain` vollständig sichtbar.
- **Chef-Nachentscheid:** Gebäude dürfen sich beliebig überlappen. `campPositionReason` prüft nur
  noch den Kartenrand; `campRepairPositions` bewahrt gültige überlappende Prozentpositionen beim
  Laden, statt sie auf Rasterplätze zu verschieben. Automatische Erstverteilung bleibt weiterhin
  ordentlich verteilt.
- **Save:** Kein Feld und kein Format geändert, deshalb kein Save-Bump und keine Migration. Die
  bestehende v78-Prozentstruktur bleibt unverändert.
- **Tests/QA:** Betroffene Engine- und Persistence-Tests wurden auf erlaubte Überlappung umgestellt.
  TypeScript Client 151, Shared 1, Engine 176, Persistence 15 — jeweils 0 Diagnosen. Der Vitest-API-
  Runner sammelte in dieser Sandbox erneut 0 Dateien; regulärer Testlauf bleibt bei Claude offen.
- **Betroffene Reviere:** Renderer UI, Engine Camp-Prädikat, Shared Positions-Sanitize,
  Persistence-Test und bindender New-Haven-Entscheid. `.claude/**` blieb unverändert.
- **Codex-Code-Marker:** `codex:2026-07-31T23:56:00+02:00`.

## Fünf Used-Iron-Navigationsrahmen 2026-07-31

- **Auftrag:** Mehr Frame-Variation für die grauen Sidebar-/Topbar-Buttons; fünf Vorschläge aus
  gebrauchtem Eisen, kompatibel mit dem Dark-Fantasy-Look.
- **Ergebnis:** Fünf getrennt generierte Alpha-PNGs samt unveränderten Chromaquellen und gemeinsamer
  Vergleichstafel unter `CODEX/AssetControl/IronFrameConcepts-2026-07-31/`.
- **Varianten:** Blackened Forge, Bronze-Lipped Iron, Ashen Steel Bevel, Grave-Iron Battlement und
  Shield-Corner Steel.
- **Technikvertrag:** Leeres Zentrum, kompakte Ecken, ruhige Kanten ohne Nieten/Einzelmotive in den
  Stretchzonen. Dies sind Auswahlkonzepte; finale Slice-Maße und Stresstests folgen erst nach Wahl.
- **Pipeline:** Built-in ImageGen. Python-Chroma-Helfer durch Windows-Prozesssandbox blockiert;
  äquivalente lokale Alpha-Matte mit Border-Sampling, Soft-Matte, Despill und Trimming ausgeführt.
  QA: RGBA, transparente Ecken, 0 grün-dominante sichtbare Randpixel.
- **Produktion:** Keine Runtime-Datei ersetzt und kein CSS umverdrahtet.
- **Codex-Marker:** `codex:2026-07-31T23:56:00+02:00` im Kontroll-README und dieser Übergabe.

## Bronze-Lipped-Iron-Navigation 2026-08-01

- **Chef-Auswahl:** Konzept 02 `Bronze-Lipped Iron` wurde als produktiver Navigationsrahmen umgesetzt.
- **Asset:** 512 × 512 px, RGBA, transparentes Zentrum, Slice 96. Alle einmaligen Eckdetails wohnen
  vollständig in den vier Corner-Slices; die 320-px-Mittelkanten sind gespiegelt und nahtlos kachelbar.
- **Runtime:** ausschließlich `.sb-skill-btn` und `.topbar-item` verwenden den neuen Rahmen. Footer-
  Systemaktionen behalten ihre warme Ironwood-Familie; globale Citadel-/Containerrahmen wurden nicht ersetzt.
- **Produktionsdateien:**
  `apps/client/src/renderer/assets/ui/gravewood/frames/nav-bronze-lipped-iron-9slice.png` und `.webp`.
- **Kontrolle:** `CODEX/AssetControl/IronFrameConcepts-2026-07-31/selected-02-9slice-atlas.png`
  sowie `selected-02-runtime-preview.png`.
- **Rollback:** `CODEX/outbox/2026-08-01-nav-iron-frame-prechange/` enthält das vorherige
  `gravewood-navigation.css` und die freigegebene Konzeptquelle.
- **QA:** PostCSS fehlerfrei; 0 fehlende lokale CSS-Assets; PNG/WebP 512 × 512 mit Alpha;
  Mittelpunkt-Alpha 0; Client-Typecheck 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T08:25:32+02:00`. Die binären PNG-/WebP-Dateien
  können keinen Kommentar tragen und sind deshalb hier mit exaktem Pfad dokumentiert.

## Navigationsmaterial und Content-Höhe 2026-08-01

- **Live-Befund:** Der neue Rahmen gefiel, aber das helle Cold-Slate-Material wirkte unpassend und
  die identischen Werte für Layout-Rand und gemalte Rahmenbreite nahmen Text/Icon unnötig Innenhöhe.
- **Korrektur:** Sidebar und Topbar verwenden nun den vorhandenen nahtlosen dunklen Basalt mit
  sehr schwacher warmer Reflexion. Das Material bleibt in allen Zuständen geometrisch identisch.
- **Geometrie:** `border-width` reserviert nur die nötige Layoutzone; `border-image-width` malt den
  kräftigen Bronze-Lipped-Iron-Rahmen weiterhin in seiner freigegebenen Stärke. Sidebarbuttons sind
  höher, Icons besitzen eine vollständige skalierende Contentbox und Topbar-Tabs füllen ihre Barhöhe.
- **Kontrolle:**
  `CODEX/AssetControl/IronFrameConcepts-2026-07-31/selected-02-basalt-content-preview.png`.
- **Rollback:** `CODEX/outbox/2026-08-01-nav-surface-content-fix-prechange/`.
- **QA:** `gravewood-navigation.css` fehlerfrei mit PostCSS geparst, 0 fehlende lokale Assets;
  Client-Typecheck 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T08:48:51+02:00`.

## Navigationsschale, Topbar-Luft und Holzrahmen-Naht 2026-08-01

- **Sidebar-Schale:** Das schwarze Rosenmuster wurde durch die vorhandene ruhige, dunkel-warme
  `texture-gravewood.webp` ersetzt. Die Fläche bleibt absichtlich wärmer als die Basaltbuttons,
  damit Rahmen und Bedienelemente klar lesbar bleiben.
- **Vergessener Bedienfall:** `.sb-combat-toggle` verwendet nun ebenfalls Bronze-Lipped Iron und
  Basalt; der schmale Pfeilknopf fällt nicht mehr in die alte Holzfamilie zurück.
- **Topbar:** Skalierende vertikale Innenluft ergänzt, damit die 9-Slice-Ecken weder Fensterkante
  noch Statusbereich berühren. Die Tab-Höhenlogik selbst blieb unverändert.
- **Footer:** Save/Main Menu/Mail/Options/Quit verwenden jetzt tiefes, verkohltes Leder statt der
  zu hellen Bronze-Braunfläche.
- **Holzframe:** Das neue Runtime-Derivat
  `apps/client/src/renderer/assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp`
  schließt die transparenten 3-/4-px-Zwischenräume innerhalb der 28-px-Ecksegmente. Die laufende
  App hielt den bisherigen zentralen Pfad gesperrt; deshalb wurden nur Sidebar-/Topbar-Schalen auf
  den sicheren Alias gebunden und kein erzwungenes Überschreiben vorgenommen.
- **Kontrolle:**
  `CODEX/AssetControl/FrameSelection-2026-07-31-v2/previews/runtime-seam-fix-comparison.png`.
- **Rollback:** `CODEX/outbox/2026-08-01-nav-shell-frame-seam-fix-prechange/` enthält CSS und das
  unveränderte vorherige Holz-WebP.
- **QA:** PostCSS fehlerfrei; sämtliche lokalen CSS-Assets vorhanden; die alten Nahtspalten hatten
  0 Alpha-Pixel, das Derivat an denselben Schienenpositionen durchgehend 13/15; Client-Typecheck
  195 Quelldateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T09:08:19+02:00`. Das kommentarlose JSON und die binären
  Assets sind hier mit exakten Pfaden dokumentiert.

## Globale Holzrahmenmigration und New-Haven Action-Card V2 2026-08-01

- **Ursache der Restlücke:** Der nahtbereinigte Alias war zunächst nur an Sidebar-/Topbar-Schale
  gebunden. 198 weitere direkte Holzframe-URLs verwendeten weiterhin das gesperrte Alt-WebP.
- **Globale Korrektur:** 198 Bindungen in 36 Renderer-Stylesheets zeigen jetzt auf
  `apps/client/src/renderer/assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp`.
  Der gesperrte zentrale Altpfad wurde nicht erzwungen überschrieben und bleibt binär unverändert.
- **Navigation:** `.topbar::before` wurde vollständig deaktiviert; der vom Chef markierte äußere
  Holzrahmen entfällt. `.sb-combat-toggle::before` wurde ebenfalls deaktiviert, weil die geerbte
  `.ds-button`-Fassung den neuen Eisenrahmen mit altem Holz doppelte.
- **New Haven Liste:** Fließende Cardbreiten/-höhen über `clamp()` und Container-Einheiten; stabiler
  Zonenvertrag für 1920×1080 bis 3440×1440. Flavor ist nicht mehr kursiv, die Current-/Next-Zone
  ist ein zusammenhängender Cold-Slate-Vergleichsstreifen, Kosten liegen auf ruhiger Basaltfläche.
- **New Haven Popup:** Adaptive 500–680-px-Breite, vollständiger Beschreibungstext, größere
  Artworkzone, keine verschachtelte Leder-Kostenbox und konsistente Bronze-Lipped-Iron-Aktionen.
  Der rote Citadel-X-Button wurde durch `.nh-popup-close` mit Eisenframe, Basaltfläche und reinem
  CSS-Kreuz ersetzt.
- **Fontlabor:** `CODEX/AssetControl/SidebarFontLab-2026-08-01/index.html` vergleicht fünf bereits
  eingebettete Displayfonts mit realer Sidebar-Geometrie und allen sieben Spielsprachen. RU/ZH
  verwenden bewusst sprachspezifische Fallbacks; fachliche Vorauswahl ist Marcellus SC.
- **Materialvorschlag Character:** Character = warmes Umber-Gewebe, Equipment = dunkler Basalt/
  geschwärztes Eisen, Inventar = bestehende Tasche. Leder damit nur dort, wo es semantisch passt.
- **Rollback:** `CODEX/outbox/2026-08-01-newhaven-nav-cohesion-prechange/` enthält Navigation,
  New-Haven-CSS, zentrales Alt-WebP und alle 36 vor der Pfadmigration gesicherten Stylesheets.
- **QA:** 51 Stylesheets ohne PostCSS-Fehler, 0 fehlende CSS-Assets, 0 verbleibende Altpfade,
  205 Bindungen auf den nahtfreien Alias; Client-TypeScript 195 Quelldateien, 0 Diagnosen.
  Fontlabor-JavaScript ohne Parserdiagnose und ohne fehlende statische/dynamische Assets.
- **Codex-Code-Marker:** `codex:2026-08-01T09:30:10+02:00`.

## Globale Metamorphous-Typografie — verworfener Zwischenentscheid 2026-08-01

- **Historie:** Fontlabor-Variante `03 Metamorphous Relic` war kurzzeitig globale Hausschrift,
  wurde anschließend durch die aktuelle Chef-Auswahl Fell Chronicle ersetzt.
- **Runtime:** `--font-head` zeigt auf das bereits gebündelte
  `apps/client/src/renderer/fonts/Metamorphous-Regular.ttf`. Body, Buttons, Eingaben und sämtliche
  bestehenden `var(--font-head)`-Verbraucher übernehmen die Schrift ohne Komponenten-Sonderpfade.
- **Lokalisierung:** `html:lang(ru-RU)` verwendet Georgia/Times/Noto Serif; `html:lang(zh-CN)` nutzt
  Microsoft YaHei/Noto Serif CJK SC/STSong/SimSun. Dadurch entsteht keine zufällige Mischschrift
  innerhalb eines russischen oder chinesischen Wortes.
- **Rollback:** `CODEX/outbox/2026-08-01-metamorphous-global-prechange/base.css`.
- **QA:** `base.css` fehlerfrei geparst, lokale Metamorphous-Datei vorhanden, Client-TypeScript
  195 Quelldateien und 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T09:49:24+02:00`.

## Globale Fell-Chronicle-Typografie und Dark-Fantasy-Runde 2 2026-08-01

- **Aktuelle Chef-Auswahl:** `Fell Chronicle`, technisch die bereits gebündelte Familie
  `IM Fell English SC`, ist appweit über `--font-head` aktiv.
- **Lokalisierung:** Russisch bleibt durchgehend Georgia/Times/Noto Serif; Chinesisch nutzt
  Microsoft YaHei/Noto Serif CJK SC/STSong/SimSun.
- **Zusätzliche Fontkandidaten:** Das Sidebar-Fontlabor enthält nun auch die lokal installierten
  Familien `Varnyx Regular` und `Hellock` als Varianten 06/07. Beide werden ausschließlich über
  CSS `local(...)` eingebunden; keine möglicherweise lizenzpflichtige Datei wurde kopiert.
- **Cohesive UI Runde 2:** Fünf reichere Gesamtsysteme unter
  `CODEX/AssetControl/CohesiveUI-2026-08-01/round-2-dark-fantasy/index.html`: Iron Reliquary,
  Ashen Cathedral, Gravewood Arsenal, Bloodglass Sanctum und Warden's Ossuary. Die verworfene
  schlichte Runde liegt unter `archive-round-1-simple/`.
- **Produktionsvertrag:** Jede Variante zeigt Sidebar, Topbar, Statusband, Character, Equipment
  und Inventory gemeinsam. Das README benennt pro System drei konkrete optionale Produktionsassets
  mit Maßen und Slice-Vertrag; keine Runtime-Datei wurde durch die Designrunde verändert.
- **Rollback:** `CODEX/outbox/2026-08-01-fell-chronicle-global-prechange/`.
- **QA:** Base-CSS, Fontlabor-CSS/JS und Runde-2-CSS/JS fehlerfrei; keine externe Font-/CDN-URL;
  Fell-, Varnyx- und Hellock-Dateien lokal gefunden; Client-TypeScript 0 Diagnosen.
- **Codex-Code-Marker:** `codex:2026-08-01T10:04:43+02:00` sowie
  `codex:2026-08-01T10:01:57+02:00` für die beiden lokalen Fontkandidaten.

## Warbanner-Item-Card und Sidebar-Zahlen 2026-08-01

- **Chef-Auswahl:** Item-Card-Konzept `05 — Warbanner Record` ist produktiv in
  `apps/client/src/renderer/components/ItemTooltip.tsx` und `styles/components.css` umgesetzt.
- **Layout:** Die Karte nutzt bis zu 860 px Breite. Itembild und Lore stehen links; vorhandene
  Werte, Effekte, Setinformationen und Anforderungen liegen rechts. Statgruppen verteilen sich
  zweispaltig. Kopf und Aktionsbereich bleiben über die volle Kartenbreite erhalten.
- **Kein interner Scrollbereich:** Das frühere `max-height: 97vh; overflow-y: auto` wird für die
  produktive Item-Card aufgehoben. Die reale Höhe entsteht aus dem Inhalt; der große 444-px-
  Hochformat-Bildblock wurde durch eine responsive Bühne von 250–330 px ersetzt.
- **Vergleich:** Zwei Shift-Vergleichskarten passen bei Desktopbreiten nebeneinander; unterhalb
  der Desktopzone werden Karten enger, auf sehr schmalen Viewports untereinander angeordnet.
- **Sidebar:** Nur die sichtbaren Skilllevel auf den Hauptbuttons wurden für Fell Chronicle von
  11 auf 22 Skalierungspixel verdoppelt und erhielten eine reservierte rechte Textspalte. Die
  kleinen Kampf-Unterwerte bleiben unverändert, damit keine Unterzeilen aufbrechen.
- **Unverändert:** Canvas-/Basaltfläche, Rahmen, Hoverlogik, Itemdaten, Aktionen, Vergleichslogik,
  Savegame und i18n wurden nicht funktional verändert.
- **Rollback:** `CODEX/outbox/2026-08-01-warbanner-itemcard-sidebar-numbers-prechange/`.
- **QA:** `components.css` und `gravewood-navigation.css` fehlerfrei geparst, 0 fehlende lokale
  Assetpfade; Client-TypeScript 151 Dateien und 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T10:20:00+02:00`.

## Sidebar-Drawer, gleichmäßige Topbar und Detailkarten-Polish 2026-08-01

- **Sidebar-Level:** Levelwerte verwenden wieder ausschließlich `Metamorphous`; Fell Chronicle
  bleibt global und für Skillnamen aktiv. Die zuvor verdoppelte Größe wurde auf 50 % zurückgesetzt
  (`11px × --sb-scale-eff`, Clamp 9–19 px).
- **Bottom-Drawer:** Die fünf Systemaktionen Save/Main Menu/Mail/Options/Quit liegen in einem
  flüssig nach oben öffnenden Footer-Drawer. Im Ruhezustand belegt nur die lokalisierte `Menu`-
  Lasche Höhe. Hover, `:focus-within` und angehefteter Klick öffnen; Reduced Motion wird beachtet.
- **i18n:** `sidebar.drawerMenu` wurde für EN/DE/ES/FR/PT-BR/RU/ZH ergänzt. Bestehende Guide-IDs,
  Aktionen, Save-/Quitlogik und Mailzähler blieben erhalten.
- **Topbar:** Alle neun Tabs teilen den vorhandenen Raum strikt gleich (`flex: 1 1 0`,
  `min-width: 0`). Schriftgröße basiert mit `cqw` auf der eigenen Zellenbreite. Alle Tabs nutzen
  explizit dieselbe tilebare Basalt-/Canvasfläche wie die Sidebar-Skillbuttons.
- **New Haven Popup:** Now/Next sind zwei kompakte, separat gerahmte Karten mit Abstand statt
  einer hohen geteilten Tafel. Der X-Knopf ist 27–33 px groß und sitzt direkt im rechten Chrome.
- **Warbanner Item-Card:** Trennlinie liegt nun ausschließlich als linke Kante am Datenbereich und
  kann nicht mehr ins Artwork ragen. Der Suffixkopf zeigt nur `… <Suffixname>`; Roll-Prozent und
  Kategorie entfallen, die Boni bleiben unverändert darunter. Offense-Werte erhielten eine größere,
  klarere Zahlenhierarchie. Der On-Hit-Bereich ist eine dunkle gravierte Fläche mit schmalem
  Rarity-Akzent statt einer grünen Vollfläche.
- **Typografie:** Exocet ist die ikonische Diablo-Schrift, aber als kommerzielle Adobe-Font nicht
  ungeprüft redistribuierbar. Die Card nutzt daher die bereits gebündelte Kombination Cinzel für
  Datentext und Metamorphous für dramatische Titel/Werte; RU und ZH behalten eigene sichere Stacks.
- **Rollbacks:** `CODEX/outbox/2026-08-01-sidebar-level-metamorphous-prechange/`,
  `CODEX/outbox/2026-08-01-sidebar-drawer-equal-topbar-prechange/` und
  `CODEX/outbox/2026-08-01-newhaven-itemcard-polish-prechange/`.
- **QA:** Vier geänderte CSS-Dateien fehlerfrei geparst, 0 fehlende lokale Assetpfade, alle sieben
  Drawer-Übersetzungen vorhanden; Client-TypeScript 151 Dateien und 0 Diagnosen.
- **Codex-Code-Marker:** `codex:2026-08-01T10:34:00+02:00`,
  `codex:2026-08-01T10:42:00+02:00`, `codex:2026-08-01T10:55:00+02:00` und der finale
  New-Haven-Kaskadenanker `codex:2026-08-01T11:03:00+02:00`.

## Tooltip-Compare, Varianten-Pouch, Drawer-Lasche und Action-Card-Lesbarkeit 2026-08-01

- **Damage-Fehler:** Offense-Zeilen verwenden feste Grid-Spuren für Icon, Label, Wert und Delta.
  `2.9–5.4` kann nicht mehr in die Damage-Beschriftung laufen; lange Übersetzungen umbrechen nur
  in der Labelspur.
- **Compare:** Das alte System der eingebetteten Up-/Down-Bildpfeile wurde aus allen 37
  StatRow-Aufrufen und aus der Rendererlogik entfernt. Vergleichskommunikation erfolgt nur noch
  über die vorhandenen kompakten textbasierten `▲/▼`-Deltas.
- **Varianten-Pouch:** Varianten sind breite Vergleichszeilen: Itemidentität links, tatsächliche
  von `suffixEffectParts`/`affixEffectParts` gelieferte Boni rechts, Rollgüte sekundär darunter.
  Unter 700 px fällt jede Zeile auf eine Spalte zurück; Basisversionen bleiben kompakt.
- **Drawer:** Die Menu-Steuerung verwendet das vorhandene transparente `tab-lever.webp` statt
  eines umlaufenden Buttoncontainers.
- **Topbar-Schale:** Der bisher sichtbare Rosen-/Sidebargrund hinter den Tabs ist vollständig durch
  dieselbe warme Gravewood-Kachel wie die linke Sidebar ersetzt. Die Tabs selbst bleiben in der
  kühlen Eisen-/Basaltfamilie.
- **Action Cards:** Produces ist eine feste Zweizeilenplatte (Label oben, Ergebnis darunter).
  Itembilder, Materialbilder, Mengen, Craftable-/Stop-/Locked-Texte skalieren relativ zur eigenen
  Kartenbreite und verwenden explizit die globale UI-Schrift.
- **Action-Queue-Studien:** Fünf funktionelle lokale HTML-Varianten mit Designumschaltung,
  Ein-/Ausklappen, Pause, Hinzufügen, Entfernen und Umsortieren liegen unter
  `CODEX/work/action-queue-mockups-2026-08-01/index.html`. Noch keine Queue-Variante wurde
  produktiv eingebunden.
- **Rollback:** `CODEX/outbox/2026-08-01-tooltip-pouch-drawer-queue-prechange/`.
- **QA:** Fünf Stylesheets ausgeglichene CSS-Struktur und 0 fehlende lokale Assets; Mockup enthält
  fünf Varianten und 0 fehlende Assetpfade; Client-TypeScript 151 Dateien, 0 Diagnosen. Kein
  Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T12:18:00+02:00`.

## Drawer-/Tooltip-Korrektur, Character-Schiefer und Options V2 2026-08-01

- **Drawer-Lasche:** Falsch verwendetes `tab-lever.webp` (reine aktive Goldzierleiste) entfernt.
  Der Griff nutzt jetzt die echten transparenten Gravewood-Tabs `tab-inactive.webp` und
  `tab-active.webp` im passenden 4,4:1-Seitenverhältnis.
- **ItemTooltip:** Prominenter Damage-Wert von 21 auf 17 px reduziert. Enchantment wurde aus dem
  normalen Stat-Grid herausgezogen; Enchantment und On-Hit stehen nun als getrennte orange
  Legendary-Effektplatten unter den Fakten.
- **Character:** Der gemeinsame Equipment-/Stats-Owner nutzt eine tilebare dunkelkalte
  Schieferfläche mit sehr schwachem warmem Lichtsaum statt des großflächigen Lederbildes.
- **Options V2:** Keine 1360-px-Deckelung mehr; Seite nutzt die vollständige Inhaltsbreite. Header,
  Sektionen und Bug-/Feature-Banner verwenden kräftige V3-Panel-/Card-Rahmen sowie tilebaren
  Schiefer/Basalt statt durchgehender Holzflächen. Schrift- und Zeilenhierarchie wurde angehoben.
- **Feedback-Dialog:** Auf 720 px verbreitert, mit V3-Panelrahmen, Schiefergrund, gerahmtem
  Textfeld/Uploadbereich und den regulären Gravewood-Buttons modernisiert.
- **i18n:** `about.bugReport`, `bugReport.title` und `bugReport.entryHint` umfassen jetzt Bugs und
  Feature-Vorschläge in EN/DE/ES/FR/PT-BR/RU/ZH.
- **Action Cards:** Presetbeschriftungen sind `1`, `25`, `50`, `∞` (Engineziele unverändert).
  Output 82→52 px, Status/Craftable 52→34 px und Presets 62→44 px; Materialrack 112→175 px.
  Materialbilder, Symbole und Mengen nutzen den gewonnenen Raum deutlich größer.
- **Rollbacks:** `CODEX/outbox/2026-08-01-drawer-tooltip-equipment-texture-prechange/` und
  `CODEX/outbox/2026-08-01-options-actioncards-prechange/`.
- **QA:** Sechs Stylesheets strukturell sauber, 0 fehlende Assetpfade; sieben Sprachen vorhanden;
  Client-TypeScript 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T12:47:00+02:00` und
  `codex:2026-08-01T13:02:00+02:00`.

## Fester Tooltip-/Drawer-/Options-Vertrag 2026-08-01

- **Drawer:** Öffnet und schließt nur noch per Klick. Hover und `focus-within` ändern höchstens
  die Lesbarkeit der Lasche, aber niemals den Öffnungszustand. Die äußere Footerfläche ist
  transparent; nur die ausgefahrenen fünf Aktionen besitzen einen Hintergrund.
- **Topbar:** Gleiche Flexbreiten bleiben erhalten; skalierendes 3–8-px-Gap und 2–5-px-Randluft
  verhindern zusammenklebende Eisenrahmen.
- **Item-Card:** Ausrüstung bis 1040 px mit festen Rasterflächen für jede Statistikgruppe.
  Offense-Labels besitzen eine Mindestspur, `DPS` ist in allen sieben Sprachen kompakt und Werte
  können nicht mehr Wörter wie Damage zerlegen. Reine Materialien/Wertgegenstände erhalten eine
  eigene vertikale 620-px-Einspaltenkarte ohne leere rechte Hälfte.
- **Tooltip-Aktionen:** Equip, Unequip und Sell verwenden den aktuellen Bronze-Lipped-Iron-
  9-Slice-Rahmen mit Basaltfüllung; die alten `button_new*`-Bilder werden in diesem Kontext
  vollständig übersteuert.
- **Action Cards:** Materialbilder bis 72 px, Fallbacksymbole bis 62 px und Mengen bis 29 px;
  das vorhandene feste Vier-Slot-Raster bleibt geometrisch unverändert.
- **Options/Feedback:** Schieferwäsche durch dunklen Basalt mit warmer Reflexion ersetzt.
  Hauptpanels und Feedback-Modal besitzen 22-px-Rahmen; Optionsaktionen und Dialogaktionen nutzen
  einheitliche aktuelle Eisenbuttons. Feedback-Modal bis 1040 px mit größeren Text-/Uploadflächen.
- **New-Haven-Art-Befund:** Kein Asset geändert. Out-of-place-Wirkung stammt trotz 45°-Basis aus
  unterschiedlichen Kamerahöhen/Footprint-Skalen, fehlendem gemeinsamen Kontaktschatten sowie
  abweichendem Color-Grading und Bodenkontakt. Empfohlener nächster Assetpass: gemeinsame
  Footprint-Skala, Licht-/Schattenvektor, warme Grade-LUT und feine Erdsaum-Matte.
- **Rollback:** `CODEX/outbox/2026-08-01-fixed-tooltip-drawer-options-prechange/`.
- **QA:** Sechs Stylesheets per PostCSS fehlerfrei, 0 fehlende lokale CSS-Assets; alle sieben
  `itip.dps`-Einträge vorhanden; Client-TypeScript 151 Dateien, 0 Diagnosen. Der vollständige
  Electron-Vite-Build konnte in der verwalteten Windows-Sandbox nicht starten (`spawn EPERM` beim
  internen Buildprozess); kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T13:28:00+02:00` und
  `codex:2026-08-01T13:36:00+02:00`.

## Offline-Bühne, Drawer-Overlay, Umber-Equipment und Info-Bar-Studien 2026-08-01

- **Offline-Bericht:** Bühne auf maximal 920 × 980 px erweitert, Außenrahmen auf 22 px verstärkt
  und Hintergrund bis unter den Rahmen gezogen. Typografie, Dauer- und Ereigniszeilen wurden
  vergrößert; normale Beute belegt 88 px, seltene Beute 104 px. Der Collect-Rahmen ist 18 px.
- **ItemTooltip:** Bildbühne und Statistikfläche verwenden 14-px-Rahmen, Equip/Unequip/Sell
  16-px-Rahmen. `background-clip` und `background-origin` verhindern die transparenten Bänder
  zwischen Füllung und Rahmen.
- **Equipment/Stats:** Die im Kaskadenende wirksame `bg_equipment.webp`-Regel wurde auf tilebares
  `texture-umber-cloth.webp` mit warmer dunkler Lasur umgestellt. Damit ist die zuvor weiterhin
  sichtbare Lederfläche tatsächlich ersetzt.
- **Sidebar-Drawer:** Die Lasche sitzt absolut über dem Aktionsblock; der Block besitzt einen
  8-px-Bronze-Lipped-Iron-Rahmen. Neben der Lasche existiert keine deckende Footerfläche, und der
  Drawer bleibt ausschließlich klickgesteuert.
- **Options:** Auch `Report Bug / Suggest Feature` verwendet den 22-px-Panelrahmen des
  Optionskopfs; alle Options-Hauptcontainer folgen damit demselben deutlich sichtbaren Vertrag.
- **Info-Bar-Studien:** Fünf funktionelle, datenumschaltbare HTML-Konzepte liegen unter
  `CODEX/work/infobar-mockups-2026-08-01/index.html`: Reliquary Band, Warden Ledger, Ashen Command
  Rail, Hunter Chronicle und Citadel Crucible. Sie verwenden ausschließlich vorhandene Assets
  und die lokale Fell-Schrift; noch kein Konzept ist produktiv ausgewählt oder eingebunden.
- **Rollback:** `CODEX/outbox/2026-08-01-offline-drawer-infobar-prechange/`.
- **QA:** Neun Produktionsstylesheets und die Mockup-CSS per PostCSS fehlerfrei; 0 fehlende lokale
  Assetpfade; Mockup-Skript parserfehlerfrei; Client-TypeScript 151 Dateien, 0 Diagnosen. Die
  Browser-Laufzeit stellte in dieser Sitzung keinen Browser bereit; der vollständige Electron-
  Vite-Build bleibt durch Sandbox-`spawn EPERM` blockiert. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T13:52:00+02:00`.

## Warchain, Systemicons und Info-Bar-V2 2026-08-01

- **Systemicons:** Zwölf kleine transparente SVGs unter
  `apps/client/src/renderer/assets/ui/system-icons/` ersetzen sichtbare Emoji-Platzhalter in
  Options, Hauptmenü und Feedback. Die Symbole sind für 16–28 px und den Ashen-Iron-Kontrast
  konstruiert.
- **Skills/Action Cards:** Die alte globale Zeile „Idle — Pick an Action Below“ wird im echten
  Leerlauf nicht mehr ausgegeben; echte Stop-/Stun-Hinweise bleiben erhalten. Suche und Mastery
  verwenden den aktuellen Canvas-/Eisenvertrag. Die Mastery-Füllung belegt mit Innenabstand den
  gesamten Container, Text liegt lesbar in der Leiste.
- **Action Queue:** Auswahl „03 War Chain“ produktiv als ruhige vertikale Befehlskette umgesetzt:
  deutlicher Eisenrahmen, Kettenachse, nummerierte Knoten, warme aktive Karte und kompakte
  Control-Zeile.
- **Tooltip/Offline/Drawer:** Statistikgruppen packen ohne künstliche Leerzeile; Defense rückt bei
  fehlender Offense hoch, Consumables erhalten eine kompakte Einspaltenkarte und die rechte
  Statistikkante ist bündig. Der WebKit-Scrollbar-Corner der Offline-Bühne ist verborgen. Der
  Sidebar-Drawer wächst wieder im normalen Flexfluss nach oben und bleibt klickgesteuert.
- **Info-Bar-V2:** Fünf funktionelle Studien unter
  `CODEX/work/infobar-mockups-2026-08-01-v2/index.html`. Chef-Auswahl am 2026-08-01:
  **05 Quiet Citadel**. Das Mockup startet mit dieser Richtung und ist nachjustiert; keine
  produktive Einbindung ohne weiteres GO.
- **Rollback:** `CODEX/outbox/2026-08-01-ui-warchain-infobar-prechange/`.
- **QA:** Acht Stylesheets per PostCSS fehlerfrei; 0 fehlende lokale Assetpfade; zwölf SVGs mit
  vollständigem Root/Endtag und Codex-Marker; Mockup-Skript parserfehlerfrei; Client-TypeScript
  151 Dateien, 0 Diagnosen. Die verbundene Browser-Laufzeit konnte in dieser Sitzung nicht
  initialisiert werden; kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T13:30:36+02:00`.

## Quiet-Citadel-Produktion und New-Haven-Groundless-Korrektur 2026-08-01

- **Info-Bar:** Chef stellte klar, dass „Quiet Citadel 05“ bereits produktiv freigegeben war. Die
  bestehende `content-header`-Struktur verwendet nun das dreigeteilte Quiet-Citadel-Raster:
  Charakter links, aktuelle Aktivität dominant in der Mitte, Inventar/Gold rechts; darunter bleiben
  die vorhandenen Action-/Skill-XP-Segmentleisten. Umsetzung verwendet den aktuellen Bronze-Lipped-
  Iron-9-Slice-Rahmen und tilebaren Basalt. Der Seitenname bleibt für Assistenztechnik im DOM, ist
  visuell eingeklappt; der sekundäre Slayer-Chip ist in diesem Konzept verborgen.
- **Performance/Logik:** Keine neue Tick- oder Engine-Logik. `HeaderCharacterInfo`, `GameStats`,
  `ActionProgressBar` und `LevelXpBar` behalten ihre vorhandenen Selector-Gates und Berechnungen.
- **Drawer:** Im geschlossenen Zustand besitzt `.sb-footer-actions` weder Border noch Hintergrund;
  damit bleiben links/rechts der freistehenden Menülasche keine Holz-/Eisenecken sichtbar.
- **New Haven:** Der Grounded-V1-Kontrollsatz wurde nach Chefprüfung verworfen. Der Designer erzeugt
  alle 15 Familien erneut als Building-only-RGBA ohne Bodenraute, Erde, Rasen, Kies oder Terrainpatch.
  Der alte Satz wird nur im Kontrollordner archiviert; Produktionspfade bleiben unangetastet.
- **QA:** `topbar.css` und `sidebar.css` per PostCSS fehlerfrei, 0 fehlende lokale Assetpfade;
  Client-TypeScript 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T16:06:12+02:00`.

## Numeral-System, Drawer-Struktur und Major-Page-Studien 2026-08-01

- **Globale Zahlen:** `base.css` definiert aus der bereits gebündelten Cinzel-Datei eine per
  `unicode-range` begrenzte Familie `Grim Reach Numerals`. Sie steht vor Fell Chronicle und greift
  dadurch global nur für `0–9`, Prozent-, Zeit-, Dezimal-, Verhältnis- und Rechenzeichen. Lining-
  und tabellarische Ziffern sind am Body aktiviert. RU/ZH behalten ihre bisherigen Buchstabenstacks.
- **Kleine Informationsschrift:** `--font-info` verwendet Cinzel für kompakte Statuszeilen.
  Quiet-Citadel-Metadaten, XP-/Action-Bar-Texte und Mastery-Labels verwenden diesen Stack; Titel
  und große Navigation bleiben Fell Chronicle.
- **Info-Bar:** Die Clusterzeile erhielt sieben skalierte Pixel Bottom-Padding und steht nicht
  mehr bündig auf den Fortschrittsleisten.
- **Sidebar-Drawer:** `.sb-footer` ist nun ein absolut am Sidebar-Boden verankertes Overlay und
  belegt keine vollbreite Layoutzeile. Die Lasche ist das einzige sichtbare Element im geschlossenen
  Zustand; der Action-Block besitzt dann Höhe, Border und Hintergrund null. Beim Öffnen wächst der
  rechteckige Drawer vom Boden nach oben.
- **Layoutstudien:** `CODEX/work/major-page-layouts-2026-08-01/index.html` bietet vier Seitentypen
  und je fünf per Klick wechselbare responsive Informationsarchitekturen: insgesamt 20 Kombinationen
  für Companions, Shop, Bank und Quests. Reine HTML-/CSS-Strukturen, keine Produktionsbindung.
- **QA:** `base.css`, `topbar.css`, `sidebar.css`, `gravewood-actioncards.css` und Mockup-CSS per
  PostCSS parserfehlerfrei; Mockup-JavaScript syntaktisch gültig, vier Surface- und fünf Concept-
  Schalter vorhanden. Die Browser-Laufzeit meldete keine verfügbare Browserinstanz; visuelle
  Browser-QA bleibt deshalb für den nächsten Lauf offen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T17:42:00+02:00`.

## Bank Vault Ledger, Slayer-Cluster und Zahlen-/Drawer-Korrektur 2026-08-01

- **Bank-Auswahl:** Die separate Bankgalerie unter
  `CODEX/work/bank-layout-mockups-2026-08-01/index.html` bildet die reale Funktionsmenge von
  `BankPage.tsx` ab. Chef wählte **03 Vault Ledger** und gab die Produktionsfreigabe.
- **Produktionslayout:** `BankPage.tsx` gruppiert Voss/Kapazität und Suche/Filter/Sortierung/
  Ausbau in zwei kompakte Kopfbereiche. `pages.css` bindet die Bank an die verfügbare Content-Höhe;
  Inventar und Bank bleiben zweispaltig und scrollen ausschließlich intern. Nach Chef-Korrektur
  bleiben beide Inhalte ausdrücklich quadratische Inventar-Slotgrids mit sichtbaren Leerplätzen —
  keine Itemliste.
- **Info-Bar:** Ein aktiver Slayer-Auftrag besitzt wieder einen eigenen Cluster zwischen Aktivität
  und Inventar/Gold. Ohne Auftrag spannt der Meta-/Ökonomieblock die beiden rechten Spalten.
- **Ziffern:** Der spät kaskadierende `.itip-offense-group .itip-stat-value`-Override verwendet
  jetzt `var(--font-info)` statt Metamorphous. Weitere Tooltip-Zahlen/Delta-Werte erhalten explizit
  tabellarische Lining-Ziffern.
- **Drawer:** Die Menülasche hat keinen negativen Halbüberlappungs-Margin mehr; sie sitzt komplett
  über dem rechteckigen Drawer und berührt dessen Oberkante bündig.
- **QA:** `pages.css`, `topbar.css`, `sidebar.css` und `components.css` per PostCSS fehlerfrei;
  `BankPage.tsx` und `App.tsx` per TypeScript-Transpile ohne Syntaxdiagnosen; alle neuen lokalen
  Frame-/Texturpfade vorhanden. Der vollständige Program-Typecheck trifft im installierten
  Workspace auf das bereits fehlende Typepaket `@types/node`; kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T18:48:00+02:00`.

## Shop „Mux' Counter“ 2026-08-01

- **Chef-Auswahl:** Fünf funktionelle Shop-Studien wurden unter
  `CODEX/work/shop-layout-mockups-2026-08-01/index.html` bereitgestellt. Chef wählte Konzept
  **01 Mux' Counter** und erteilte ausdrücklich das Produktions-GO.
- **Produktionslayout:** `ShopPage.tsx` trennt den Kaufen-Tab in feste Warengruppen, ein intern
  scrollendes Warenraster und einen stabilen rechten Handelstresen. Die Produktkarten sind jetzt
  reine Auswahlkarten; Preis, Beschreibung, Bestand, Mengenwahl und Kaufaktion bleiben dadurch
  unabhängig von Produktnamen und Presetanzahl an derselben Stelle.
- **Logikschutz:** Alle Käufe laufen weiter über `buyItem`, `canHold` und den gemeinsamen
  `QuantityPicker`. Slot-/Auto-Eat-Upgrades, verlorene Meisterringe, Buy/Sell-Hotkeys und die
  vollständige Verkaufslogik mit Varianten, Shift-Verkauf, Massenverkauf und Rückkauf wurden
  nicht ersetzt oder dupliziert.
- **Fehlerkommunikation:** Der rechte Tresen benennt volles Inventar und unzureichendes Gold
  ausdrücklich. Acht neue Shoptexte sind in Englisch, Deutsch, Spanisch, Französisch,
  Portugiesisch (BR), Russisch und Chinesisch vorhanden.
- **Design:** `shop.css` nutzt Gravewood-V3-Panel-/Card-/Buttonrahmen, kalten Basalt und Cold Slate.
  Das dreispaltige Layout bleibt bis 1180 px bestehen; danach wird die Kategorienavigation
  horizontal, ohne den Handelstresen zu verlieren. Unter 820 px stapelt die Seite kontrolliert.
- **QA:** Vollständiger TypeScript-Programcheck des Clients: 195 Quelldateien, 0 Diagnosen.
  `shop.css` per PostCSS fehlerfrei, sämtliche referenzierten lokalen CSS-Assets vorhanden. Es
  existieren keine dedizierten Shop-Testdateien; kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T19:42:00+02:00`.

## Shop-Viewport, Compare-Reflow und Companion-Einzelstudien 2026-08-01

- **Shop-Höhenvertrag:** `shop.css` bindet `ShopPage` und seinen Transition-Wrapper an die
  verfügbare Inhaltsfläche (`height: 100%`, `min-height: 0`, äußerer Overflow verborgen). Der
  mittlere Warenbereich und das Verkaufsinventar behalten ihre eigenen Scrollflächen; die ganze
  Seite wandert nicht mehr.
- **Itemvergleich:** `components.css` begrenzt den Compare-Wrapper auf den Viewport. Zwei
  Itemkarten teilen sich den Raum bis 940 px; bei mittleren Breiten verdichten sich Bild- und
  Statistikflächen, unter 940 px werden die Karten vertikal in demselben Wrapper gestapelt. Damit
  bleibt auch ein Waffenvergleich bei 1920 × 1080 vollständig erreichbar.
- **New Haven:** Die Groundless-V2-Produktion wurde trotz vollständiger Dateimenge visuell
  verworfen. Der Composite zeigte unvereinbare Projektionen, Objektmaßstäbe und Kamerahöhen.
  Agent gestoppt, Kontrollmaterial bleibt ausdrücklich nicht freigegeben und wird nicht gebunden.
- **Companion-Mockups:** `CODEX/work/companion-layout-mockups-2026-08-01/index.html` enthält fünf
  interaktive, responsive Seitenarchitekturen. Grundlage ist `PetGalleryPage.tsx` und der reale
  Katalog mit 21 Pets: genau ein aktiver Pet-Slot, Owned/Locked, Passiv, aktive Kampffähigkeit,
  Quelle, Dropchance sowie Ausrüsten/Ablegen. Keine erfundenen Pet-Level-, Zucht- oder Gear-Systeme.
  Chef favorisierte **03 Das Feldjournal des Jägers** und gab anschließend das Produktions-GO.
  Das Layout ist jetzt in `apps/client/src/renderer/pages/PetGalleryPage.tsx` sowie dem zugehörigen
  Block in `apps/client/src/renderer/styles/pages.css` produktiv umgesetzt.
- **Pet-Assetauftrag:** Kontrollausgabe geplant/laufend unter
  `CODEX/AssetControl/CompanionPets-2026-08-01/<pet-id>/variant-1..3.png`. Verbindlich sind
  transparenter Hintergrund, kein Boden/Sockel/Schattenfeld, identische Kamera, Lichtführung,
  Objektgröße und Padding über die ganze Serie. Keine Produktionsbindung vor A-bis-Z-Abnahme.
- **Chef-Korrektur zur Variantenbreite:** Der erste Ashgut-Batch ist verworfen und wird nur als
  `rejected` archiviert. Bestehende Petbilder dürfen nicht mehr als visuelle Referenz dienen.
  Variante 1–3 müssen je Pet verschiedene Grundanatomien/Kreaturenfamilien, Silhouetten,
  Proportionen und Kopf-/Gliedmaßenkonzepte darstellen; reine Farb-, Material-, Horn- oder
  Detailvarianten sind unzulässig. Neueste Chef-Anweisung ersetzt den Ashgut-Zwischenstopp:
  vollständige direkte Produktion aller 21 Companions × drei Varianten; fertige Pets werden
  alphabetisch sofort zur Kontrolle bereitgestellt.
- **Chef-Korrektur zur Tonalität:** Der nachgeschärfte „Dark-Fantasy“-Restart war weiterhin zu
  aggressiv/grotesk und ist ebenfalls verworfen. Neuer Serienvertrag: begehrenswerte Fantasy-
  Begleiter mit vielfältigen Temperamenten; düster/unheimlich nur, wo Name und Lore es wirklich
  tragen. Visuelle Weltkohärenz entsteht über einheitliches Rendering, Licht, Maßstab, gedeckte
  Farben und mittelalterliche Materialien. Kein pauschales Dämonen-/Fäulnis-/Knochenmotiv.
- **QA:** Mockup-JavaScript syntaktisch gültig; fünf Layoutfunktionen vorhanden; Mockup-, Shop-
  und Components-CSS per PostCSS fehlerfrei; alle 21 referenzierten Petbilder und lokalen
  Frame-/Font-/Texturpfade vorhanden. Client-TypeScript mit der bestehenden vollständigen
  Programkonfiguration: 151 Dateien, 0 Diagnosen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T20:18:00+02:00` und
  `codex:2026-08-01T20:42:00+02:00`.

## Companion-Pets — vollständiger Auswahlbatch 2026-08-01

<!-- codex:2026-08-01T23:45:57+02:00 -->

- **Ergebnis:** `CODEX/AssetControl/CompanionPets-2026-08-01/` enthält jetzt alle 21 realen
  Companion-IDs mit jeweils `variant-1.png`, `variant-2.png` und `variant-3.png` — insgesamt
  63/63 Auswahl-Assets. Die bereits vollständigen acht Pet-Familien wurden bewahrt.
- **Variantenvertrag:** Die neu ergänzten Familien verwenden pro Pet drei deutlich verschiedene
  Grundanatomien und Silhouetten. Tonalität ist breite, begehrenswerte Fantasy statt pauschaler
  Groteske; alle Motive bleiben freigestellte Einzelwesen ohne Boden, Szene, Sockel, Text oder UI.
- **Technische QA:** 63/63 Dateien sind 1024 × 1024 große RGBA-PNGs mit echtem Alpha,
  mindestens neun Prozent Sicherheitsabstand und null belegten Außenrandpixeln. Details stehen in
  `CODEX/AssetControl/CompanionPets-2026-08-01/QA.md`; drei alphabetische Kontaktbögen liegen in
  dessen `_qa-previews/`-Ordner.
- **Manifest:** Das kommentarlose
  `CODEX/AssetControl/CompanionPets-2026-08-01/manifest.json` wurde auf
  `complete_pending_chef_selection` gesetzt und dokumentiert Vollständigkeit, QA, Kontaktbögen
  sowie Konzeptfamilien. Der zugehörige Pflichtmarker steht hier und in der benachbarten
  `README.md`: `codex:2026-08-01T23:45:57+02:00`.
- **Integration:** `productionIntegrated` bleibt `false`. Keine Produktionspfade, Save-Daten,
  sichtbaren Namen oder internen IDs wurden verändert. Nächster Schritt ist ausschließlich die
  A-bis-Z-Auswahl des Chefs; Gewinner werden danach separat vom Asset-Integrator übernommen.

## Companion-Seite — Feldjournal 03 produktiv 2026-08-01

<!-- codex:2026-08-01T23:58:00+02:00 -->

- **Ergebnis:** Die bisherige vier Spalten breite Wiederholung vollständiger Pet-Karten wurde durch
  ein festes Feldjournal ersetzt: links ein intern scrollender Index aller 21 Pets, rechts genau
  ein großes Portrait mit Herkunft, Dropchance, Beschreibung, Passiv-/Aktiveffekt und Equip-Status.
- **Theme:** Außencontainer verwenden Gravewood-V3-Panelrahmen; Einträge, Bühne, Effekte und Button
  verwenden aktuelle V3-Card-/Buttonrahmen. Oberflächen sind Basalt, Cold Slate und Umber Cloth;
  alte Citadel-Holzrahmen sind in diesem neuen Renderpfad nicht mehr sichtbar.
- **Verträge:** `content.pets`, Owned/Locked, `companionPetId`, `equipPet`, Quellenmapping,
  Dropchance und sämtliche bestehenden i18n-Schlüssel blieben erhalten. Keine Engine-, Save-,
  ID-, Balancing- oder Produktionsasset-Änderung.
- **Viewport/Performance:** Die Seite belegt die verfügbare Content-Höhe. Nur Fundindex und bei
  Bedarf das Dossier scrollen intern; statt 21 großen Zonenbildern und Detailkarten wird nur die
  aktuell ausgewählte Beobachtung vollständig gerendert.
- **QA:** TSX-Transpile ohne Diagnose; vollständiger Client-Typecheck über 151 Dateien mit
  0 Diagnosen; alle 14 lokalen CSS-Assetreferenzen vorhanden; CSS-Klammern, Strings und Kommentare
  strukturell geschlossen. Kein Live-/Electron-Start.
- **Codex-Code-Marker:** `codex:2026-08-01T22:18:00+02:00`.

## Quest-Seite — fünf Einzelstudien 2026-08-02

<!-- codex:2026-08-02T00:15:00+02:00 -->

- **Artefakt:** `CODEX/work/quest-layout-mockups-2026-08-02/index.html` mit fünf umschaltbaren,
  responsiven und funktionellen Seitenarchitekturen: Warden's Dispatch, Ashen Procession,
  Contract Wall, Hunter's Ledger und Twin-Leaf Codex.
- **Reale Verträge:** Grundlage ist die bestehende `QuestsPage.tsx`: Aschechronik mit 21 Kapiteln,
  Auftragsstränge, genau sechs tägliche Quests aus fünf Schwierigkeitsgraden, lokaler Reset,
  Quest-Tokens, Belohnungslager, Active/Claimable/Locked/Claimed und explizites Claiming.
- **Theme:** Nur vorhandene, produktiv erreichbare Bausteine verwendet: Fell Chronicle und
  Marcellus SC, Gravewood-V3-Panel-/Card-/Tab-/Buttonrahmen, Basalt, Cold Slate, Ash Stone und
  Umber Cloth sowie reale Wächter-, Token-, Gold- und Itemassets.
- **Abgrenzung:** Keine Produktionsdatei, Questlogik, Engine, Save-Struktur, i18n oder `.claude/**`
  verändert. Die fünf Konzepte teilen dieselben Beispieldaten, damit ausschließlich Layout und
  Informationshierarchie verglichen werden.
- **QA:** HTML-Tags strukturell geschlossen; JavaScript mit TypeScript-Parser ohne Diagnose;
  CSS-Klammern, Strings und Kommentare geschlossen; 14 statische sowie acht dynamische lokale
  Assetreferenzen vorhanden. Ein visueller Browserlauf war mangels verfügbarer Browserinstanz in
  dieser Sitzung nicht möglich.
- **Codex-Code-Marker:** `codex:2026-08-02T00:15:00+02:00`.

## Quest-Seite — Contract Wall 03 produktiv 2026-08-02

<!-- codex:2026-08-02T00:42:00+02:00 -->

- **Ergebnis:** Nach Chef-Auswahl wurde Konzept 03 produktiv in `QuestsPage.tsx`, `quests.css`
  und `chronicle.css` umgesetzt. Wächter und Tokenbestand teilen einen festen Kopf, die vier Tabs
  bleiben sichtbar und nur der aktive Arbeitsbereich scrollt intern.
- **Aufträge:** Der vorhandene Master-/Detailvertrag bleibt erhalten, erscheint nun aber als
  breite zweispaltige Strangwand links und stabile Detailbühne rechts. Auswahl, Collapse,
  Active/Completed/Locked/Claimed, NPC-Sprecher, Objectives, Rewards und Claim bleiben unverändert.
- **Weitere Tabs:** Aschechronik nutzt Bühne plus separates Archiv; sechs Dailies erscheinen als
  breite zwei- bzw. auf Ultrawide dreispaltige Vertragswand; das Belohnungslager besitzt einen
  festen Kopf und ausschließlich intern scrollende Angebote.
- **Theme:** Quest-spezifische alte Citadel-Holzrahmen wurden im neuen Scope durch Gravewood-V3-
  Panel-, Card-, Tab- und Buttonrahmen ersetzt. Verwendete Oberflächen: Basalt, Cold Slate und
  Umber Cloth. Auch Wächtermedaillons und Sprechblasen sind im Questscope auf V3 umgestellt.
- **Verträge:** Keine Änderung an Engine, Content, Queststatus, Daily-Refresh, Token-Käufen,
  Item-Tooltip, Save-State, IDs oder i18n. Nur Rendererstruktur und Styles wurden angepasst.
- **QA:** Vollständiger Client-Typecheck über 151 Dateien mit 0 Diagnosen; Quest- und Chronicle-
  CSS strukturell geschlossen; alle neun lokalen CSS-Assetpfade vorhanden. Kein Live-/Electron-
  Start und mangels Browserinstanz kein visueller Automationslauf.
- **Codex-Code-Marker:** `codex:2026-08-02T00:42:00+02:00`.

## UI-Nachschärfung und Combat-Vorlage 2026-08-02

<!-- codex:2026-08-02T11:24:44+02:00 -->

- **Quest/Companions:** Hauptflächen auf Ironwood Bastion und Innenflächen auf Bronze-Lipped
  Iron korrigiert. Vollständige Questzielnamen umbrechen; Warden-/Objective-Prosa nutzt normales
  Gewicht. Relevante Dateien: `QuestsPage.tsx`, `quests.css`, `chronicle.css`, `pages.css`.
- **Combat-Entscheidung:** `CODEX/work/combat-layout-mockups-2026-08-02/index.html` enthält fünf
  funktionsnahe Layouts. Chef-GO gilt für 03 Frontline Ribbon und die vier Tabs Gear, Skills,
  Style und Prep; die produktive Implementierung wird separat übergeben.
- **Info-Bar:** `topbar.css` nutzt im Quiet-Citadel-Scope viewport- und höhengebundene
  `clamp()`-Typografie. Betroffen sind Name/Level, Aktivität, Slayer, Slots/Gold und beide
  Fortschrittslabels. Marker: `codex:2026-08-02T10:41:06+02:00`.
- **Item-Tooltip:** `components.css` führt einen stabilen Warbanner-Rastervertrag ein. Ohne
  Offense stehen Attribute oben links, Defense darunter und Suffix oben rechts; lange Suffixnamen
  dürfen umbrechen. Marker: `codex:2026-08-02T10:41:06+02:00`.
- **New Haven:** `CODEX/assets/new-haven-control-2026-08-01/v2-groundless/` bleibt ausschließlich
  abgelehntes Referenz-/Fehlversuchsmaterial. Es wartet dort kein Produktions-GO.
- **QA:** Client-TypeScript über 151 Dateien ohne Diagnose (expliziter lokaler `typeRoots`-Pfad),
  `topbar.css` und `components.css` strukturell geschlossen. Combat-Mockup-JavaScript ohne
  Parserdiagnose. Ein Browser-QA-Lauf war nicht möglich, weil die Browser-Runtime keine Instanz
  bereitstellte; kein Live-/Electron-Start.

## New-Haven Asset Foundry und Shop-Karten 2026-08-02

<!-- codex:2026-08-02T11:52:06+02:00 -->

- **Asset Foundry:** `CODEX/work/new-haven-consistent-asset-tool/index.html` ist das lokale
  Kontrollcockpit; `manifest.json` führt 15 eindeutige Familien/45 Ränge und vier Kalibrierer.
  `production-spec.md`, Promptgenerator und CLI-QA bilden den verbindlichen Sechs-Schritte-Vertrag.
- **Foundry-QA:** App-JavaScript syntaktisch gültig, CSS geschlossen, null fehlende lokale Pfade,
  45 Produktions- bzw. vier Kalibrierungspakete reproduzierbar; synthetisches 1536²-RGBA bestand
  Alpha-, BBox-, Baseline-, Anchor- und Bodenheuristik. Kein Browser verfügbar. V2 bleibt verworfen.
- **Shop:** `items.ts`, `ShopPage.tsx` und `shop.css` verwenden ein responsives Ironwood-/
  Gravewood-Kartenraster. `hunting_bow` ist zentral auf `ashwood_longbow.webp` abgebildet, ohne
  ID-, Kauf-, Engine- oder Balancingänderung. Marker: `codex:2026-08-02T11:24:00+02:00`.
- **Shop-QA:** PostCSS ohne Fehler; acht von acht CSS-Assets vorhanden; geänderte TS/TSX-Dateien
  ohne Transpile-Diagnosen.

## Battle-Screen — zehn Layoutstudien 2026-08-02

<!-- codex:2026-08-02T12:18:49+02:00 -->

- **Artefakte:** `CODEX/work/battle-screen-mockups-2026-08-02/index.html` und `README.md`.
- **Umfang:** Zehn CSS-Architekturen mit Concept-, 1920-/3440-, Combat-State- und Dock-Schaltern;
  Player/Gegner, HP, Ward, Stagger, Status, Timeline, Controls, Drops, Session, Zone und Log sind
  als echter Battle-Vertrag berücksichtigt. Konzept 03 integriert den Log links.
- **Empfehlung des Designers:** Frontline Record 03 kombiniert mit dem proportionalen Raster von
  Adaptive Fortress 10. Eine zweite unabhängige Funktionsprüfung gegen `CombatPage.tsx` läuft.
- **QA:** zehn Buttons/zehn Konzepte, null fehlende Assets, HTML-/CSS-Balance null und JavaScript
  ohne Diagnose. Browserinstanz war nicht verfügbar; keine Produktionsdatei verändert.

## Combat-Layout — Adaptive Fortress fertiggestellt 2026-08-02

<!-- codex:2026-08-02T16:20:00+02:00 -->

- **Produktionslayout:** `CombatPage.tsx` nutzt den freigegebenen vierteiligen Frontline-Dock
  (Gear/Skills/Style/Prep), die zentrale Kampfarena und rechts den echten Battle-/Loot-Record.
  Die Sitzungsbilanz wurde aus Gear in den Fuß des Battle Records verschoben.
- **Auto-Buff:** Prep bietet nun den vom Chef festgelegten einmaligen Kauf für 50.000 Gold. Der
  Kauf ist Engine-seitig idempotent, zählt in `stats.goldSpent`, aktiviert den Toggle nicht
  ungefragt und kann weder über Setter noch Laufzeitpfad umgangen werden.
- **Save-Vertrag:** `SAVE_VERSION` 78 → 79; neues Feld
  `character.autoPotion.autoRebuffUnlocked`. Alt-Saves mit bereits aktivem Auto-Rebuff behalten
  ihn, alle anderen beginnen gesperrt. Migration, Sanitize und Kompatibilitätstests ergänzt.
- **UI/i18n:** Kaufzustand im Ashen-Iron/Gravewood-Stil und Texte in EN/DE/ES/FR/PT-BR/RU/ZH.
- **QA:** Shared, Engine, Persistence und Client vollständig per TypeScript-Compiler geprüft:
  jeweils 0 Diagnosen. Alle 13 CSS-Assetpfade vorhanden, CSS-Klammern ausgeglichen. Vitest konnte
  in dieser Sandbox nicht transformieren (`esbuild spawn EPERM`); Tests wurden ergänzt, aber der
  eigentliche Runner muss außerhalb dieser Prozesssperre nachgezogen werden. Kein Electron-Start.

### Nachfix: leere Gear-Stats und Kampf-beenden-CTA

<!-- codex:2026-08-02T17:30:00+02:00 -->

- Im Combat-Dock kollabierten die geerbten Character-Stats-Grids durch `flex-basis: 0` ohne feste
  Elternhöhe auf 0 px. Combat-spezifische Overrides machen Gruppen/Grids/Zeilen wieder
  inhalts-hoch; die Character-Seite bleibt unverändert.
- Der obere Kampf-beenden-Button nutzt nun den Bronze-Lipped-Iron-Rahmen mit Gravewood-Füllung
  statt der alten ButtonNew/Flee-Bildfamilie.
- Client-TypeScript: 0 Diagnosen; `combat.css`: 843 öffnende/843 schließende Klammern.

## New Haven — Encampment-V3-Kalibrierung 2026-08-02

<!-- codex:2026-08-02T18:11:25+02:00 -->

- Der widersprüchliche Fachwerk-/Dorfanker der Foundry wurde durch ein befestigtes
  Dark-Fantasy-Grenzlager ersetzt (`production-spec.md`, `real-world-archetypes.md`,
  `scripts/generate-packets.mjs`). `.claude/**` blieb unverändert.
- Vier neue Rang-I-Kalibratoren liegen unter
  `CODEX/AssetControl/NewHaven-Encampment-V3-2026-08-02/calibration/`; Magentaquellen,
  QA-Bericht, README und eine lokale `index.html` liegen daneben.
- Technischer Stand: 1536×1536 RGBA, transparente Ecken, gemeinsame Baseline y=1352,
  Mittelpunkt x=767,5 und familienabhängige Zielbounds. Kein Asset ist im Runtime-Pfad gebunden.
- Der Python-Chroma-Helfer war durch `spawn EPERM` blockiert. Die Freistellung erfolgte deshalb
  direkt mit `sharp`: Soft-Matte nach Farbdistanz plus Nachbarfarben-Despill für Netze/Seile.
- Produktionsgate bleibt aktiv: Die übrigen 41 Ränge erst nach visueller Abnahme des vollständigen
  Vierersets erzeugen; Rangwechsel müssen neue Masse/Funktion zeigen und dürfen keine Near-Copies sein.

## New Haven — Encampment V3 vollständig produziert 2026-08-02

<!-- codex:2026-08-02T20:58:00+02:00 -->

- Nach der Chef-Abnahme des Kalibrierungssets wurden alle 15 Gebäudefamilien in jeweils drei
  eigenständigen Rängen produziert: insgesamt 45 transparente 1536×1536-RGBA-PNGs unter
  `CODEX/AssetControl/NewHaven-Encampment-V3-2026-08-02/production/`.
- Die Rangverträge liegen in `CODEX/work/new-haven-consistent-asset-tool/rank-archetypes.json` und
  erzwingen pro Ausbau eine erkennbare neue Baumasse/Funktion statt bloßer Detailvarianten.
- `index.html` zeigt jede Familie als Rang-I/II/III-Reihe; `overview.png` ist die kompakte Gesamtansicht.
  `production-qa.json` bestätigt 45/45 Dateien, keine fehlenden oder unerwarteten Namen, identische
  RGBA-Canvasgröße, transparente Außenbereiche, gemeinsamen Horizontalanker und gemeinsame Baseline.
- Die sichtbare Assetfläche wächst bei allen 15 Familien von Rang I → II → III. Damit gibt es keine
  technischen Near-Copies im reinen Größen-/Massenvertrag; die visuelle Chefprüfung bleibt maßgeblich.
- Die Bilder sind weiterhin reine Kontrollassets. Keine Datei wurde in den Runtime-Pfad kopiert und
  keine New-Haven-Komponente auf diese Serie umgebunden. `.claude/**` blieb unverändert.

## New Haven — Kartenmaßstab und Nacht-Kohärenz 2026-08-02

<!-- codex:2026-08-02T21:42:00+02:00 -->

- Auf direkte Chef-Anweisung rendert `getCampMapVisualScale()` in
  `apps/client/src/renderer/campArt.ts` sämtliche platzierten Gebäude mit exakt dem Doppelten ihres
  bisherigen familien- und rangabhängigen Kartenmaßstabs. Die relative Größenhierarchie bleibt dabei
  unverändert; der generische Fallback steigt entsprechend von `0.85` auf `1.7`.
- `NewHavenPage.tsx` reicht die aktuelle Lichtphase nun als `data-light-phase` an die Kartenfläche
  weiter. `newhaven.css` gibt allen Gebäuden einen dauerhaften weichen Bodenkontaktschatten und stimmt
  Helligkeit/Sättigung nachts auf die kühle Karte ab, damit die freigestellten Sprites nicht schweben
  oder aufgeklebt wirken.
- Sämtliche 45 Gebäuderänge besitzen nun zusätzlich deterministische Nachtfassungen mit identischer
  Alpha-Silhouette. Die Camp-Karte liegt als Tag-/Nachtpaar in 3344×1882 vor; Bauplatz,
  Baustelle und Gerüst liegen ebenfalls als transparente Tag-/Nachtpaare im Kontrollordner.
- Der alte, zu ähnliche Schmelzhütten-Rang II/III wurde nach Sichtprüfung nach `rejected/` verschoben
  und durch klar gestufte Zwei-Ofen- bzw. befestigte Gießerei-Silhouetten ersetzt.
- Die neue Assetserie bleibt bis zur separaten Produktionsfreigabe im Asset-Control-Staging; geändert
  wurde im Spielcode ausschließlich die bereits beauftragte Kartenpräsentation.

## New Haven — Encampment V3 produktiv integriert 2026-08-02

<!-- codex:2026-08-02T22:31:00+02:00 -->

- Nach dem ausdrücklichen Chef-GO wurden alle 98 freigegebenen Dateien nach
  `apps/client/src/renderer/assets/camp/` übergeben: 45 Gebäuderänge × Tag/Nacht, zwei Karten sowie
  drei generische Bauzustände × Tag/Nacht.
- Runtime-Ausgabe: Gebäude/Bauzustände als 1536×1536 WebP mit vollständigem Alpha; Karten als
  3344×1882 WebP. Geprüft wurden 98/98 erwartete Dateien, Dimensionen, Alpha-Kanäle und für sämtliche
  transparenten Dateien die exakte Alpha-Übereinstimmung zur freigegebenen PNG-Quelle.
- Vor dem ersten Encoderlauf wurde der vollständige vorherige Runtime-Satz mit 98 WebP-Dateien unter
  `CODEX/backups/new-haven-runtime-before-encampment-v3-2026-08-02/` gesichert.
- Bei der Abschluss-QA wurden Schmelzhütte II/III um 76 bzw. 57 Pixel auf die echte gemeinsame
  Bodenlinie gesetzt; Tag und Nacht bleiben deckungsgleich. Dadurch existieren keine unsichtbaren
  Kalibrieranker mehr, die auf der Karte ein Schweben erzeugen könnten.
- Der reproduzierbare Deploy liegt in
  `CODEX/work/new-haven-consistent-asset-tool/scripts/deploy-v3-runtime.mjs`.
- Typecheck/Build konnten in dieser Sitzung nicht gestartet werden: Sowohl PowerShell als auch ein
  direkter Child-Process wurden von der Windows-Sandbox mit `CreateProcessAsUserW failed: 5` bzw.
  `spawn EPERM` abgewiesen. Die Änderungen an TSX/CSS sind eng begrenzt; der Verifikationslauf bleibt
  dennoch als offene technische Kontrolle dokumentiert.

## New Haven — CSS-Geisterschatten entfernt 2026-08-02

<!-- codex:2026-08-02T22:45:00+02:00 -->

- Nach Sichtprüfung des produktiven Nachtbilds sämtliche `drop-shadow()`-Effekte von
  New-Haven-Gebäudesprites entfernt: Normalzustand, Hover, Nacht-Hover und Move-Modus.
- Die leichte Helligkeits-/Sättigungsanpassung für Nacht und Hover bleibt erhalten; betroffen ist nur
  der breite dunkle Doppelabdruck um die bereits im Asset ausgeleuchteten Silhouetten.

## New Haven — Tagvorschauen und gemeinsamer Nachtnebel 2026-08-02

<!-- codex:2026-08-02T23:02:00+02:00 -->

- Gebäudevorschaubilder in Listen, Detailmodale und Baumenü fest auf die klare Tagfassung gestellt.
  Die Tag-/Nachtumschaltung gilt nur noch für Gebäude innerhalb der eigentlichen Kartenwelt.
- Über der kompletten Nachtkarte liegt nun ein leichter statischer Nebel aus drei CSS-Gradienten.
  Damit erhalten Kartengrund und freigestellte Gebäude dieselbe atmosphärische Schicht.
- Der Nebel ist `pointer-events: none`, ohne Animation und ohne `backdrop-filter`; Klickverhalten und
  Idle-Performance bleiben deshalb unverändert.

## New Haven — Map-Mode-UI konsolidiert 2026-08-02

<!-- codex:2026-08-02T23:34:00+02:00 -->

- In `apps/client/src/renderer/styles/newhaven.css` eine einzige verbindliche Abschluss-Schicht für
  den Kartenmodus ergänzt. Sie überschreibt die widersprüchlichen historischen Teilpässe, ohne
  bestehende Regeln zu löschen oder Claudes Komponentenstruktur anzutasten.
- Toolbar, Map/List/Move/Debug-Bedienung und Kapazitätsanzeige bilden nun eine responsive
  Ashen-Iron-Leiste. Die Karte und die Baupalette besitzen eine stabile Grid-Aufteilung mit
  internen Scrollbereichen; 1920×1080 und 3440×1440 behalten dadurch denselben Weltmaßstab und
  dieselbe Kartenprojektion.
- Gebäudelabel, Baufortschritt, Vorschaubilder, Kostenchips sowie Platzierungs-/Move-Hinweise wurden
  lesbarer und skalierbar gefasst. Die Baupalette verwendet vorhandene Umber-Canvas-/Basalt-Texturen
  und den produktiven Bronze-Lipped-Iron-Rahmen; keine neuen Runtime-Assets wurden eingeführt.
- Statische QA: PostCSS-Parse erfolgreich (357 Root-Nodes), CSS-Klammern 331/331, sämtliche
  referenzierten CSS-Assets vorhanden. TypeScript-Compiler-API über Shared, Content, Engine,
  Persistence und Client: 350 Quelldateien, 0 Diagnosen.
- Testbestand: Engine 132 Dateien/1.297 Testdeklarationen, Persistence 14/296, Client 1/22.
  Produktionsbuild und Vitest-Transformation bleiben in dieser Windows-Sandbox blockiert, weil
  `esbuild` keinen Hilfsprozess starten darf (`spawn EPERM`). Diese Runner-Prüfung ist ausdrücklich
  offen; kein Electron-/Live-Start wurde durchgeführt.

## Abwesenheitsbericht ohne Scrollweg + größere New-Haven-Kartenbilder 2026-08-03

<!-- codex:2026-08-03T00:08:00+02:00 -->

- `OfflinePopup.tsx` trennt feste Kopf-/Wächter-/Collect-Anker vom variablen Berichtskern. Skills,
  Camp-Bauten, Veredelung und Beute liegen darin in einem automatisch mehrspaltigen Ergebnisraster.
- `offline-stage.css` passt Breite, Höhe, Abstände, Schrift und Lootzellen über `dvh`/`clamp()` an
  den verfügbaren Viewport an. Der Modal-Scrollweg ist vollständig entfernt (`overflow: hidden`),
  der Collect-Button bleibt außerhalb des komprimierbaren Berichtskerns immer erreichbar.
- `newhaven.css` vergrößert die sichtbare Gebäudemasse in Listen- und Detailkarten auf 165 %, um
  die transparente Sicherheitsfläche der 1536er Sprites auszugleichen. Container und Bilder werden
  weiterhin proportional dargestellt und sauber geclippt.
- QA: Client-TypeScript 151 Dateien/0 Diagnosen; `offline-stage.css` und `newhaven.css` erfolgreich
  via PostCSS geparst; Klammerbilanzen 139/139 bzw. 333/333. Build/Vitest bleiben wegen der bereits
  dokumentierten lokalen `esbuild spawn EPERM`-Sperre offen.

## Item-Tooltip — rechter Suffix-Overflow strukturell behoben 2026-08-03

<!-- codex:2026-08-03T00:37:00+02:00 -->

- `apps/client/src/renderer/styles/components.css` besitzt nun am Ende der Kaskade einen einzigen
  verbindlichen Warbanner-Rastervertrag. Ausrüstungsmodale dürfen auf großen Viewports bis 1220 px
  wachsen; die Bildspalte bleibt begrenzt und der zusätzliche Raum geht gezielt an den Datenbereich.
- Die widersprüchlichen festen 250-px-Mindestbreiten der beiden inneren Statistikspalten werden dort
  durch schrumpffähige `minmax(0, …)`-Spuren ersetzt. Dadurch kann der innere Grid nicht mehr rechts
  über seinen eigenen Rahmen hinauswachsen.
- Suffix-, Attribut-, Defense-, Skill- und Misc-Zeilen besitzen feste Spuren für Icon, umbrechbares
  Label, nicht umbrechenden Wert und optionales Compare-Delta. Lange deutsche Namen wie
  `Konstitution` verdrängen damit weder den `+1`-Wert noch Vergleichszahlen aus dem Modal.
- Unter 1040 px ordnen sich die Datengruppen einspaltig, unter 760 px zusätzlich Bild und Daten.
  Simple- und Consumable-Einspaltenkarten behalten ihre bewusst kompakteren Breiten.
- QA: `components.css` erfolgreich mit PostCSS geparst (428 Root-Nodes), Klammerbilanz 399/399;
  vollständiger Client-Typecheck über 151 Dateien mit 0 Diagnosen. Der Produktionsbuild konnte nicht
  gestartet werden, weil die Windows-Sandbox bereits den PowerShell-Prozess mit
  `CreateProcessAsUserW failed: 5 (Zugriff verweigert)` blockiert. Kein Electron-/Live-Start.

## New Haven — objektgebundene Kartenkalibrierung und Tiefensortierung 2026-08-03

<!-- codex:2026-08-03T09:46:00+02:00 -->

- Der Move-Modus in `apps/client/src/renderer/pages/NewHavenPage.tsx` wählt Gebäude nun per Klick
  aus und blendet Skalierung (1–300 %), horizontale Spiegelung und Reset als kompakte Werkzeugleiste
  direkt am Gebäude ein. Sprite, Namensschild und Werkzeugleiste sind getrennte Ebenen; die beiden
  UI-Elemente skalieren oder wandern nicht mit dem Sprite.
- Gebäude werden anhand der unteren Kante ihres prozentualen Footprints tiefensortiert. Ein näher am
  unteren Kartenrand stehendes Gebäude wird damit vor einem weiter hinten stehenden Gebäude
  gezeichnet. Auswahl erhält nur während der Bearbeitung einen temporären Bedienvorrang.
- Die Kalibrierung bleibt bis zur vollständigen Chef-Abnahme renderer-lokal und erzeugt keine neuen
  Save-Felder. Abgenommene Standardprozente liegen stufenspezifisch in `campArt.ts`: Fischerhütte I
  165 %, Saatgarten I 155 %, Schmelzofen I 140 % / II 180 %, Händlerposten I 137 % / III 120 % und
  Hehlerzelt I 185 %. Reset springt auf den jeweiligen Rangstandard.
- Die Baupalette lässt ihre Karten nicht mehr durch den flexiblen Seitenhöhenvertrag
  zusammenschrumpfen; ausschließlich die Kartenliste scrollt intern.
- Smelter II/III, jeweils Tag und Nacht, wurden mechanisch von den verbundenen Magenta-Chroma-Rändern
  bereinigt. Nachtfassungen verwenden exakt die bereinigte Tag-Silhouette als Alphagrenze. Originale
  liegen unter `CODEX/work/backups/newhaven-smelter-chroma-2026-08-03/`, neutrale QA-Composites unter
  `CODEX/work/qa/newhaven-smelter-cleanup/`.
- `action-queue.css` verwendet für operative Informationen nun die klarere Sekundärschrift mit
  600/700 Gewicht und größeren Mindestgrößen. Fell Chronicle bleibt den kurzen Fantasy-Überschriften
  vorbehalten; die Queue ist dadurch bei 1920×1080 belastbarer lesbar.
- Der breitere Item-Tooltip besitzt zusätzlich einen Compare-Schutz: zwei Karten teilen sich den
  Viewport, klappen ihre Datenspalten bei Bedarf um und stapeln sich unter 1100 px.
- QA: Client-TypeScript 151 Dateien/0 Diagnosen. `newhaven.css`, `action-queue.css` und
  `components.css` via PostCSS erfolgreich geparst; Klammerbilanzen 355/355, 84/84 und 406/406.
  Smelter-Sprites 1536×1536 mit Alpha-Bounds ausschließlich um die Gebäudesilhouette. Kein
  Electron-/Live-Start; der bekannte Windows-Prozessfehler verhindert weiterhin den CLI-Build.

## New Haven — Gebäudetags und Licht-Debug 2026-08-03

<!-- codex:2026-08-03T12:10:00+02:00 -->

- Gebäudenamen liegen nun bei 25 % der logischen Hitboxhöhe, also mittig zwischen Oberkante und
  Zentrum. Sie bleiben unabhängig von Sprite-Skalierung, Spiegelung und der darunterliegenden
  Tiefensortierung an dieser Position.
- Die Kartenleiste besitzt einen lokalisierten `Debug: Tag`/`Debug: Nacht`-Schalter. Er überschreibt
  ausschließlich die gerenderte Lichtphase bis zum Seiten-Remount; Engine, Spielzeit und Savegame
  bleiben unverändert.
- Die Toolbar-Raster für Desktop und kleinere Breiten wurden um den zusätzlichen Schalter erweitert.
- QA: vollständiger Client-Typecheck über 195 Nicht-Deklarationsdateien mit 0 Diagnosen;
  `newhaven.css` via PostCSS erfolgreich geparst. Kein Electron-/Live-Start.

## Design-Lieferung — New-Haven-Emblem und Asset-Gap-Sweep 2026-08-03

<!-- codex:2026-08-03T11:27:39+02:00 -->

- Definitiver Auftrag: `CODEX/inbox/2026-08-03-02-definitiv-arbeitsteilung-heute.md`.
- Neues New-Haven-Emblem als kompaktes Wachfeuer zwischen zwei Palisadenspitzen im bestehenden
  Ashen-Iron-Farbraum erstellt. Produktionskandidaten und Kontrollmaterial liegen ausschließlich im
  Staging unter `CODEX/AssetControl/newhaven-emblem/`.
- Lieferdateien: `icon_newhaven.webp` und `icon_newhaven.png` (je 512×512, RGBA/Alpha),
  `preview_14-20px.png`, `source_chromakey.png` und die lokale `README.md` mit Prompt und QA-Notizen.
- Visuelle QA: tatsächliche 14-/16-/20-px-Darstellung sowie 8×-Pixelansicht geprüft. Das Wachfeuer
  bleibt auf 14 px erkennbar; Palisaden und Bronzeakzente werden ab 16–20 px klar lesbar.
  Technische QA: beide Finalformate exakt 512×512 mit Alpha; alle vier PNG-Ecken Alpha 0.
- Intake-Hinweis: Claudes Wunschname lautet `icon_newhaven.webp`; die vorhandene Sidebar-Konvention
  kann `sidebaricon_newhaven.webp` erwarten. Den produktiven Zielnamen beim Einbinden gegen den
  tatsächlichen Konsumenten festlegen, statt die Staging-Datei automatisch zu verdrahten.
- Read-only-Bestandsaufnahme unter `CODEX/notes/2026-08-03-ui-asset-gap-sweep.md`: Items 355/355,
  Monster 109/109, Pets 21/21 und 53/53 statische `getUiIcon`-Referenzen sind auflösbar. Priorisierte
  UI-Lücken sind direkte Unicode-/Emoji-Platzhalter in Action Queue, Quests, Achievements, Combat,
  Farming, Options, Mail/Offline und Footer-Lokalisierungen.
- Gemäß der definitiven Arbeitsteilung wurden keine produktiven Renderer-, Engine-, Content-,
  Persistenz-, i18n- oder Runtime-Asset-Dateien geändert. Daher kein Save-Bump und keine Code-Tests
  erforderlich; Claude übernimmt ausschließlich Sichtprüfung, Namensentscheidung und späteres Intake.

## Micro-Icon-System — fünf Prüftafeln, Abnahmegate 2026-08-03

<!-- codex:2026-08-03T11:51:35+02:00 -->

- Auftrag: `CODEX/inbox/2026-08-03-03-micro-icon-sets.md`. Gemäß dem vereinbarten Gate wurden nur
  Prüftafeln erzeugt; transparente 512er PNG/WebP-Einzeldateien folgen erst nach Chef-/Claude-GO.
- Gemeinsame Art Direction: flache geschmiedete Glyphen, 44–48 px Master-Strich in einer 512er
  ViewBox, Altgold als Primärsignal und Kupfer als Sekundärzustand. Keine Schatten, Partikel oder
  Materialdetails, die bei 14 px verschwimmen.
- Action Queue — 6 Konzepte: Queue, Warnung, Blockiert, Priorität, Hoch, Runter.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/01-action-queue/review-board.png`.
- Quest Semantik — 6 Konzepte: Ticket, Pin, Dialog, Kalender, Journal, Münze.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/02-quest-semantics/review-board.png`.
- Achievements — 12 Konzepte: zehn Kategorien plus Milestone-Trophäe und Lupe.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/03-achievements/review-board.png`.
- Combat Status — 7 Konzepte: drei Heilquellen, Kill, Immunität, Boss/Dungeon, Regeneration.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/04-combat-status/review-board.png`.
- System/Empty State — 6 Konzepte: Warnung, Idle, Mail, Ordner, Checkbox an/aus.
  Prüftafel: `CODEX/AssetControl/micro-icon-sets-2026-08-03/05-system-empty/review-board.png`.
- Gesamtübersicht: `CODEX/AssetControl/micro-icon-sets-2026-08-03/index.html`. Reproduzierbare
  Designquelle: `CODEX/work/2026-08-03-micro-icon-sets/generate-previews.mjs`; übertragener Brief:
  `CODEX/work/2026-08-03-micro-icon-sets/BRIEF.md`.
- QA: 37/37 eindeutige Konzept-IDs; alle fünf PNG-Tafeln 1804 px breit; tatsächliche 14-/16-/20-px-
  Raster sowie 8×-Pixelinspektion pro Glyph geprüft. Keine finalen Einzelassets im Staging vorhanden.
- Namensempfehlung für die Vollproduktion: `icon_queue_*`, `icon_quest_*`, `icon_ach_*`,
  `icon_combat_status_*`, `icon_sys_*`; eindeutiger als die Kurzformen `icon_q_*`/`icon_cs_*`.
- Sperrzonen eingehalten: kein Produktivcode, keine Runtime-Assets und keine i18n-Dateien geändert.
  Kein Save-Bump. Nachricht 03 bleibt bis zur Abnahme und anschließenden Vollproduktion offen.

### Rückfrage an Claude / Chef

Bitte entweder das Gesamtsystem freigeben oder Korrekturen pro Set/ID nennen. Nach GO produziert Mira
die 37 transparenten 512er PNG/WebP-Dateien und verschiebt den Auftrag anschließend nach `inbox/done/`.

## Micro-Icon-System — Vollproduktion nach GO 2026-08-03

<!-- codex:2026-08-03T12:04:13+02:00 -->

- Freigabe: `CODEX/inbox/2026-08-03-04-go-micro-icon-vollproduktion.md`; das vollständige System aus
  37 Glyphen wurde als transparentes 512×512-PNG und verlustfreies WebP produziert.
- Action Queue: 6 Icons / 12 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/01-action-queue/production/`.
- Quest Semantik: 6 Icons / 12 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/02-quest-semantics/production/`.
- Achievements: 12 Icons / 24 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/03-achievements/production/`.
- Combat Status: 7 Icons / 14 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/04-combat-status/production/`.
- System/Empty State: 6 Icons / 12 Dateien unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/05-system-empty/production/`.
- Claudes Produktionshinweise umgesetzt: `icon_ach_forge` besitzt nun eine kantige Ambossform mit
  getrenntem Horn und Fuß; `icon_combat_status_heal_death` hat größere, kontrastierende
  Schädelmerkmale. Beide korrigierten Formen wurden erneut bei 14/16/20 px geprüft.
- Warnungs-Dedupe: `icon_queue_warning` und `icon_sys_warning` stammen aus demselben Glyphenbuffer.
  PNG-SHA256 jeweils `f844aeb1b808d092a68377caab867b5e50814690e03973a54ea63932fa20255b`,
  WebP-SHA256 jeweils `c539781d493e50a43db6d089e18b26b0c6a8853d78cf652a648c0d075c62d6ee`.
- Gesamt-QA: `CODEX/AssetControl/micro-icon-sets-2026-08-03/production-qa.json`. Ergebnis:
  37/37 eindeutige IDs, 74/74 Finaldateien, Maße 512×512, Alpha vorhanden, vier Ecken transparent,
  24-px-Außenrandprüfung bestanden und Warnungsdateien in beiden Formaten bitidentisch.
- Jeder Produktionsordner enthält zusätzlich ein `manifest.json` mit Dateigröße, SHA256,
  Alpha-Bounds und Formatprüfung. Diese kommentarlosen JSON-Dateien gehören ausschließlich zum
  CODEX-Staging; der zugehörige `codex:`-Nachweis ist dieser HANDOFF-Block.
- Sperrzonen eingehalten: kein Produktivcode, keine Runtime-Assets und keine i18n-Dateien geändert.
  Kein Save-Bump. Claude ist nächster Owner für set-weises Intake und Emoji-Ablösung.

## 0.3.0-Event-Artwork, System-Icon-Nachschlag und New-Haven-Wachstum 2026-08-03

<!-- codex:2026-08-03T13:43:00+02:00 -->

### Steam-Event-Artwork

- Auftrag: `CODEX/inbox/2026-08-03-05-event-artwork-und-konzepte.md`; bestehende Patchvorlage und
  0.2.0-Eventgrafiken wurden als verbindliche Layoutreferenz verwendet.
- Finale Staging-Dateien:
  `CODEX/AssetControl/event-0.3.0/event_new_haven_capsule_800x450.png` und
  `CODEX/AssetControl/event-0.3.0/event_new_haven_header_1920x622.png`.
- Zielgrößenprüfung: exakt 800×450 und 1920×622; kombinierte Sichtprüfung unter
  `CODEX/AssetControl/event-0.3.0/preview-target-sizes.png`.
- Motiv: düsteres Lager an Furt und alter Straße, einzelnes Wachfeuer, Palisaden-/Zelt-Silhouetten
  und ruinierte Wegstation mit Glockenrahmen; keine Figuren, Kreaturen, Logos oder KI-Typografie.
- Der unbeschriftete 1672×941-Source liegt als `source_new_haven_watchfire.png` bei. Der exakte finale
  ImageGen-Prompt ist in `CODEX/AssetControl/event-0.3.0/PROMPT.md` dokumentiert. Titel und übrige
  Typografie wurden deterministisch mit dem Renderer-Cinzel gesetzt.
- Der statusneutrale Badge `NEW FRONTIER` vermeidet eine nicht freigegebene Datums- oder
  Verfügbarkeitsaussage. Claude/Chef kann ihn vor Steam-Upload bei Bedarf durch `OUT NOW` ersetzen.

### System-Icon-Nachschlag

- `icon_sys_save` und `icon_sys_back` wurden im bereits abgenommenen Vektorstil unter
  `CODEX/AssetControl/micro-icon-sets-2026-08-03/05-system-empty/production/` ergänzt, jeweils als
  transparentes 512×512-PNG und verlustfreies WebP.
- Systemset nun 8 Icons; Gesamtsystem nun 39 eindeutige IDs / 78 Finaldateien. Review-Board,
  HTML-Übersicht, Set-Manifest und `production-qa.json` wurden neu erzeugt.
- QA vollständig grün: Maße, Alpha, transparente Ecken und 24-px-Außenrand. Beide neuen Glyphen
  wurden zusätzlich im echten 14-/16-/20-px-Prüfstreifen visuell kontrolliert.

### Konzepttafeln: sichtbares New-Haven-Wachstum

- Drei kumulative 1920×1080-Tafeln unter `CODEX/work/newhaven-growth-concepts/`:
  `01-watchfire.png`, `02-tent-ring.png` und `03-waystation.png`; Übersicht: `overview.png`.
- Empfehlung: sichtbares Wachstum ausschließlich über Wachfeuer, Bodenabdrücke, Straßenkante,
  randständige Palisade sowie alte Fundamente/Glocken-Landmarke erzählen. Die zentrale freie
  Spielerbaufläche bleibt ruhig und unverstellt.
- Der echte Kartengrund wurde nur gelesen und nicht verändert. Sein geprüfter SHA256 lautet
  `91395050afcdb819ce06946df8879e0210b6438cdcf98f8ecec6143118ef6481`.
- Die Tafeln sind ausdrücklich eine Entscheidungsgrundlage, keine bindende Art- oder Runtime-
  Freigabe. Nächster Owner ist Claude für Produktentscheidung und gegebenenfalls Scope-/Roadmap-
  Einordnung.

### Sperrzonen und Verifikation

- Kein Produktivcode, keine Runtime-Assets, keine Engine-/Persistenz-/Content-/i18n-Dateien geändert;
  kein Save-Bump und keine Produkt-Tests erforderlich.
- Alle erzeugten Rasterdateien wurden headless auf Maße geprüft und visuell in Zielgröße kontrolliert.
  Nachricht 05 kann nach dieser vollständigen Dreifachlieferung nach `CODEX/inbox/done/` verschoben
  werden.

## Fight-Card-Rework — zehn interaktive HTML-Studien 2026-08-03

<!-- codex:2026-08-03T14:37:38+02:00 -->

- Direkter Chef-Auftrag; keine Inbox-Nachricht. Prüfarbeitsplatz:
  `CODEX/AssetControl/FightCardConcepts-2026-08-03/index.html`.
- Zehn eigenständige Layoutvarianten auf Basis des tatsächlichen `MonsterCard`-Datenvertrags:
  XP, Level/Prognose, Slayer-/Trait-Zustände, sechs Kampfwerte, beide Trefferchancen, Drops,
  Slayer-Anforderung, Sofortkampf, 1/25/50/∞ und Queue-Fortschritt.
- Zustandsumschaltung für Bereit/Kampf läuft/Slayer-Ziel/gesperrt/Elite, interaktive Mengenwahl und
  Breitentest von 270 bis 430 px sind direkt in der HTML enthalten.
- Empfehlung aus Design-Sicht ist Studie 10 `Frontline Candidate`; Studie 03 ist die lesbarste
  Ledger-Variante, Studie 08 die platzsparende breite Desktopalternative.
- QA: 10 Konzeptdefinitionen und CSS-Varianten vorhanden, alle zehn lokalen Medien-/Fontpfade
  existent, CSS-Klammerbilanz 158/158 und eingebettetes JavaScript mit Babel-Parser syntaktisch
  erfolgreich geprüft. Die In-App-Browser-Sitzung war auf diesem Launch nicht verfügbar und der
  lokale Chrome-Prozess wurde von der Sandbox blockiert; daher keine automatisierte Screenshot-
  Renderprüfung in dieser Lieferung.
- Nur CODEX-Staging und Dokumentation geändert. Kein Produktivcode, keine Runtime-Assets, i18n-,
  Engine-, Persistenz- oder Save-Änderung. Umsetzung nach Chef-Auswahl bleibt bei Claude.

## Fight Cards — Chef-Auswahl 10 „Frontline Candidate“ produktiv 2026-08-03

<!-- codex:2026-08-03T15:01:52+02:00 -->

- Direkte Chef-Freigabe für Studie 10; produktive, isolierte Styleschicht:
  `apps/client/src/renderer/styles/gravewood-fighter-cards.css`.
- Import ausschließlich über den letzten Block von
  `apps/client/src/renderer/styles/index.css`; Rollback besteht aus dem Entfernen dieses Imports
  und der neuen Stylesheet-Datei. Bestehende `CombatPage.tsx`-Struktur, Handler, Queue-Logik und
  i18n blieben unangetastet.
- Alle `monster-card`-Konsumenten erhalten den Frontline-Vertrag: echtes Zonen-/Monsterartwork,
  Ironwood-Bastion-12-px-Rahmen, gekacheltes Basalt, zweispaltiges Stat-Register, feste Prognose-,
  Loot- und Aktionsmodule sowie stabile responsive Kartenbreiten. Elite- und Slayer-Karten behalten
  ihre Statusakzente.
- Verwendet ausschließlich bestehende Runtime-Assets:
  `assets/ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp` und
  `assets/ui/gravewood/v3/textures/texture-basalt.webp`.
- QA: neue CSS-Datei mit PostCSS erfolgreich geparst (46 Top-Level-Nodes), beide Asset-URLs
  vorhanden, Importbindung bestätigt. Interner Client-TypeScript-Lauf las 153 Dateien und meldete
  ausschließlich die umgebungsbedingte Auflösung von `@types/node`; keine TS-/TSX-Datei wurde
  geändert. Regulärer pnpm-/Build-Prozess bleibt durch Windows `CreateProcessAsUserW: Zugriff
  verweigert` blockiert.
- Kein Save-Bump; keine Engine-, Content-, Persistenz-, i18n- oder Binärasset-Änderung. Claude ist
  nächster Owner für regulären Client-Typecheck/Build und visuellen Live-Sign-off.

## Gear Dock — drei interaktive Interior-Studien 2026-08-03

<!-- codex:2026-08-03T16:31:00+02:00 -->

- Auftrag `2026-08-03-06-gear-dock-design.md`; Design-Staging:
  `CODEX/AssetControl/gear-dock-2026-08-03/index.html` mit Kurzbrief in der dortigen `README.md`.
- Drei produktionsnahe Richtungen auf Basis des echten Combat-Dock-Vertrags und des aktuellen
  Referenzscreens: `Quartermaster’s Mannequin`, `Iron Reliquary` und `Frontline Harness`.
- Jede Richtung demonstriert klickbar alle vier Tabs `Gear`, `Skills`, `Style`, `Prep`; der
  Pfeil unten rechts schaltet zusätzlich einen echten 44-px-Rail-Zustand. Damit ist nachgewiesen,
  dass die vorgeschlagene Material-/Rahmensprache nicht nur auf dem Paperdoll funktioniert.
- Bestehende Slot-Geometrie, reale Grim-Reach-Itemassets, Bronze-Lipped-Iron-Rahmen sowie
  Basalt-/Umber-Texturen wurden wiederverwendet. Keine neuen Produktionsassets erzeugt oder
  in Runtime-Pfade eingebunden.
- Designempfehlung: `Frontline Harness` für die stärkste Battle-Record-Kohärenz;
  `Iron Reliquary` als lesbarste und risikoärmste Produktionsoption bei kleinen Dockbreiten.
- QA: eingebettetes JavaScript mit Babel-Parser und CSS mit PostCSS erfolgreich geparst;
  14 eindeutige lokale Assetreferenzen vorhanden, keine fehlenden Pfade. Die Browser-/Chrome-
  Renderprüfung war in dieser Sandbox nicht verfügbar; deshalb visuelle Endabnahme direkt über
  die lokale HTML.
- Ausschließlich `CODEX/AssetControl`, Übergabeprotokoll und Inbox-Status geändert. Kein
  Produktivcode, keine Runtime-Assets, Engine-, Persistenz-, Content-, i18n- oder Save-Änderung.
  Umsetzung wartet ausdrücklich auf Chef-/Claude-Auswahl.

## Gear Dock — Chef-Auswahl 03 „Frontline Harness“ produktiv 2026-08-03

<!-- codex:2026-08-03T17:21:00+02:00 -->

- Direkte Chef-Freigabe für Studie 03; produktive, isolierte Styleschicht:
  `apps/client/src/renderer/styles/frontline-harness-dock.css`.
- Einbindung ausschließlich als letzter Import in
  `apps/client/src/renderer/styles/index.css`. Rollback: diesen Import entfernen und die neue
  Stylesheet-Datei löschen; bestehende `CombatPage.tsx`-/`EquipmentOverview.tsx`-Struktur wurde
  nicht verändert.
- Gear erhält die Frontline-Harness-Bühne mit zentraler Ausrüstungsachse, zurückhaltender
  Körpersilhouette und zwei bronzenen Gurtrahmen hinter den unveränderten echten Slots. Stats und
  Buffs folgen der Dichte des Battle Record.
- Skills, Style und Prep verwenden denselben Basalt-/Bronze-/Iron-Ledger-Vertrag. Das bestehende
  Auto-Eat-/Auto-Potion-/Auto-Buff-UI wurde nur visuell gefasst; alle Handler und Engine-Werte
  bleiben unverändert. Der 44-px-Kollapsrail ist als eigenständige Metallleiste ausgearbeitet.
- Ausschließlich vorhandene Runtime-Assets:
  `assets/ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp` und
  `assets/ui/gravewood/v3/textures/texture-basalt.webp`; keine neuen Binärassets.
- QA: neue CSS-Datei mit PostCSS erfolgreich geparst (54 Regeln / 204 Deklarationen), alle Regeln
  auf `.combat-frontline-dock` begrenzt, beide Assetpfade existent, Import exakt einmal und als
  letzter Renderer-Import vorhanden. Keine TS-/TSX-Datei geändert; daher keine Engine-/Content-
  oder Save-Verifikation erforderlich. Claude bleibt Owner des visuellen Live-Sign-offs und des
  regulären Client-Builds, der in Miras Windows-Sandbox nicht gestartet werden kann.
- Kein Save-Bump; keine Engine-, Persistenz-, Content-, i18n- oder Datenänderung.

## Main Menu — integrierte Load-Game-Kopfzeile 2026-08-03

<!-- codex:2026-08-03T18:42:00+02:00 -->

- Chef-Screenshot-Nachfix ausschließlich in
  `apps/client/src/renderer/styles/gravewood-loadgame.css`.
- Der fast schwarze, aufgesetzte `Load Game`-Balken ist jetzt eine in das Save-Ledger integrierte
  Materialkopfzeile: Leder-/Gravewood-Vertrag, feine Bronze-Trennlinie, skalierbarer Titel und ein
  kompakter, holzgerahmter Rückweg. Alle Selektoren sind auf `.menu--panel-load` begrenzt; New Game
  und Options bleiben unangetastet.
- QA: Stylesheet mit PostCSS erfolgreich geparst; acht neue/angepasste Kopfzeilen-Selektoren sind
  vollständig gescoped, alle drei verwendeten Runtime-Assets vorhanden. Kein TS-/TSX-Eingriff,
  kein Save-Bump.

## Achievements — fünf funktionale Umbau-Studien 2026-08-03

<!-- codex:2026-08-03T18:42:00+02:00 -->

- Bestehende `AchievementsPage.tsx` read-only gegen ihren tatsächlichen Funktionsvertrag geprüft:
  537 Karten, neun Kategorien, Statusfilter, AP, AP-Meilensteine, „Kurz davor“, Seltenheiten und
  kategorieweise Trophy-Room-Gruppierung.
- Fünf klickbare Studien unter
  `CODEX/AssetControl/AchievementsConcepts-2026-08-03/index.html`:
  `Trophy Hall`, `Warden Ledger`, `Milestone Forge`, `Archive Table`, `Hall of Banners`.
- Jede Studie behält die echten Kernfälle; die produktiv sinnvolle Suche wurde als Ergänzung für
  537 Einträge demonstriert. Kategorien, Alle/Erhalten/Offen, Suche, Detailauswahl und bei Studie 05
  die Hallenflügel sind interaktiv.
- QA: HTML 26 KB, eingebettetes JavaScript mit Babel und CSS mit PostCSS erfolgreich geparst;
  fünf Studien erkannt, alle statisch referenzierten lokalen Assets vorhanden. Keine produktive
  Achievement-, Engine-, Content-, Persistenz-, i18n- oder Save-Änderung. Umsetzung wartet auf
  Chef-/Claude-Auswahl.

### Gear Dock — Außenhüllen-Nachfix 2026-08-03

<!-- codex:2026-08-03T17:41:00+02:00 -->

- Chef-Screenshot-Nachfix in `frontline-harness-dock.css`: der ausgeklappte Dock besitzt jetzt
  exakt den 10-px-Bronze-Lipped-Iron-Außenrahmen und die Umber-Cloth-Hintergrundschichtung des
  rechten `.combat-select`-Zonencontainers. Die kontrastierende Basalt-Harness-Bühne bleibt nur
  innerhalb dieser gemeinsamen Außenhülle.
- PostCSS-Parse erfolgreich; Rahmenwerte gegen die bestehende Zonenregel abgeglichen, alle drei
  verwendeten Runtime-Assetpfade vorhanden. Kein Save-Bump.

## Achievements — Warden Ledger produktiv 2026-08-03

<!-- codex:2026-08-03T19:24:00+02:00 -->

- Direkte Chef-Freigabe für Studie 02; `AchievementsPage.tsx` in ein dreispaltiges Warden Ledger
  umgebaut: links Filter/Kategorien mit Live-Zählern, mittig Suche/„Kurz davor“/scrollbare Liste,
  rechts ein permanentes Detailblatt für die ausgewählte Errungenschaft.
- Neue, spät importierte Styleschicht:
  `apps/client/src/renderer/styles/warden-ledger-achievements.css`. Rollback: Import entfernen,
  Stylesheet löschen und `AchievementsPage.tsx` auf den Trophy-Room-Renderer zurückführen.
- Die von Claude am selben Tag verdrahteten `CATEGORY_UI`-, Meilenstein- und Such-Icons wurden
  ausdrücklich erhalten und im neuen Layout eingesetzt. Keine Emoji-Rückstufung.
- Suche und Auswahl sind rein lokal. AP, Seltenheit, Freischaltung, Kategorien, Meilensteine sowie
  Fortschritt lesen weiterhin ausschließlich die vorhandenen Shared-/Engine-Quellen. Keine neue
  i18n-Zeichenkette: die Suche verwendet den bestehenden `inv.filter.searchPlaceholder`-Vertrag.
- QA: TSX mit Babel und TypeScript-Transpile geparst; Client-Semantiklauf über 153 Dateien meldet
  keine Diagnose in `AchievementsPage.tsx`. Einzige Gesamtdiagnose bleibt die bekannte
  umgebungsbedingte fehlende `@types/node`-Definition. Neue CSS-Schicht: 75 Regeln / 292
  Deklarationen, PostCSS erfolgreich, alle drei Runtime-Assets vorhanden.
- Claudes Koordinationsbrief `2026-08-03-07-koordination-achievements.md` nach Abgleich nach
  `CODEX/inbox/done/` verschoben. Kein Save-Bump; keine Engine-, Content-, Persistenz- oder
  Datenänderung. Claude ist nächster Owner für regulären Build und Screenshot-Abnahme.

## Steam Store 0.3.0 — Capsule-Schiene und Produktionsplan 2026-08-03

<!-- codex:2026-08-03T19:34:00+02:00 -->

- Claudes Auftrag `2026-08-03-08-steam-store-elemente.md` aufgenommen. Unter
  `CODEX/AssetControl/store-elements-0.3.0/` liegen zwei vollstaendige, dimensionsgetreue
  Capsule-Familien fuer Header (920 x 430), Small (462 x 174) und Main (1232 x 706):
  permanente logo-only Watchfire-Familie sowie ein englisches New-Haven-0.3.0-Override.
- Quelle sind ausschliesslich das freigegebene Watchfire-Keyart und das vorhandene transparente
  Grim-Reach-Logo. Komposition, Crops, Gradierung und Schrift wurden deterministisch erzeugt;
  keine Bild-KI-Typografie und kein Fake-Gameplay. Visuelle Abnahme ueber
  `PREVIEW-capsule-families.png`; Pixelmasse und Kurz-Hashes stehen in `MANIFEST.md`.
- Shotlist fuer sieben echte Store-Screenshots, Trailer-/GIF-Storyboard, Capsule-Konzept und
  Materialluecken sind dokumentiert. Claudes angekuendigte Ordner
  `marketing/0.3.0-media/screenshots/**`, `clips/**` sowie `INDEX.md` sind derzeit leer bzw. fehlen.
  Deshalb wurden Screenshot-Auswahl und Videoschnitt bewusst nicht simuliert.
- Brief bleibt bis zum Eingang und zur Verarbeitung der echten Capture-Dateien offen in
  `CODEX/inbox/`. Keine Runtime-, Engine-, Persistenz-, i18n- oder Save-Aenderung; kein Save-Bump.

## Steam Store — Ashen-Iron-Beschreibungstafeln 2026-08-03

<!-- codex:2026-08-03T20:12:00+02:00 -->

- Auf Chef-Nachtrag die vier alten Citadel-Holztafeln als zusammenhaengende Ashen-Iron-Serie neu
  gesetzt und um `panel_newhaven.png` erweitert. Abnahmeordner:
  `CODEX/AssetControl/store-elements-0.3.0/description-panels/`.
- Gemeinsamer visueller Vertrag: korrekter Bronze-Lipped-Iron-9-Slice, Basalt bzw. Umber-Cloth,
  kalte Informationstexte und sparsame warme Bronzehierarchie. Exakte gebuendelte Fonts statt
  generierter Bildschrift; reale Runtime-Skill-/Elite-Assets und echte New-Haven-Aufnahme.
- Chef-Screenshot-Nachfix direkt waehrend Produktion: schwarze SVG-Eckkeile aus offenen Pfaden
  entfernt und Titelornamente auf sicheren Abstand gesetzt. Alle fuenf Einzeltafeln visuell
  kontrolliert und auf exakt 616 px Breite verifiziert; Masse/Hashes im lokalen README.
- Die alten Dateien in `design/marketing/store-panels/` bleiben bis zur Freigabe unangetastet.
  Keine Runtime-, Engine-, Persistenz-, i18n- oder Save-Aenderung; kein Save-Bump.
- Claudes Capture-Lieferung ist inzwischen vollstaendig vorhanden (Index, acht PNGs, vier WebMs),
  daher ist die uebrige Screenshot-/Trailer-Schiene wieder ungebremst offen.

<!-- codex:2026-08-03T20:18:00+02:00 -->

- Chef-QA-Nachfix: `panel_numbers.png` und `panel_skills.png` verwendeten noch die erste
  Titelornament-Funktion. Beide auf denselben breitenabhaengigen Sicherheitsabstand wie World und
  New Haven umgestellt; Linien enden nun klar vor Diamanten und Schrift. Gesamtpreview sowie
  Pruefsummen aktualisiert.

<!-- codex:2026-08-03T20:24:00+02:00 -->

- `panel_worldfightsback.png` auf Chef-Wunsch mit drei neuen, klar freigestellten Runtime-Elites
  bestueckt: Coast Crab, Border Butcher und Black Golem. Fell-, Feder- und Rauchsilhouetten der
  ersten Fassung entfernt; Gesamtpreview und Hashmanifest aktualisiert.

## Arena-Zonen 0.4.0 — Pilot-Dreier zur Abnahme 2026-08-03

<!-- codex:2026-08-03T20:30:00+02:00 -->

- Claudes Auftrag `2026-08-03-09-arena-zonen-assets.md` vollständig als kontrollierte Runde 1
  umgesetzt. Staging: `CODEX/AssetControl/arena-zones-0.4.0/round-01-pilot/`.
- Pastures um vier echte Alpha-Props ergänzt. Crypt und Slagpit erhielten jeweils neuen
  1536×1024-Boden, neue 1717×916-Kulisse und vier zoneneigene Alpha-Props. Zusätzlich liegt ein
  gemeinsames 512×512-Sonnen-Glow-Sprite vor.
- Chefkontrolle über `CONTROL-BOARD-round-01.webp`; jede Zone besitzt außerdem eine
  1920×1080-Einzelbühne und eine Stimmungsreferenz. Licht-, Ambient-, Fog- und Grade-Vorschläge
  stehen in `MOOD-VALUES.md` und warten nur noch auf Claudes JSON-Skelett.
- Alpha-QA: zwölf Props auf dunklem und warmem Kontrastgrund geprüft. Das von ImageGen
  gerenderte Schachbrett wurde entfernt; finale WebPs besitzen echte Alpha-Kanäle und saubere
  Fußkanten. Maß-QA für alle Boden-/Kulissendateien bestanden.
- Keine Runtime-, Prototyp-, Engine-, Persistenz-, i18n- oder Save-Änderung; kein Save-Bump.
  Claude bleibt Owner der Manifest-Verdrahtung. Runde 2 startet erst nach Chef-Abnahme dieses
  Piloten.
- Nach Eingang von `2026-08-03-10-manifest-skelett.md` drei valide Staging-Manifeste ergänzt:
  `round-01-pilot/pastures.manifest.json`, `crypt.manifest.json` und `slagpit.manifest.json`.
  JSON erlaubt keine `codex:`-Kommentare; dieser HANDOFF-Eintrag dokumentiert deshalb die drei
  exakten kommentarfreien Zielpfade. Pastures übernimmt Claudes abgenommene Juli-Lichtwerte
  unverändert; Crypt und Slagpit folgen den Grenzen des neuen Skeletons.

## Chicken-Pose-Pilot — Kontrolltafel zur Chef-Abnahme 2026-08-05

<!-- codex:2026-08-05T09:08:17+02:00 -->

- Claudes Auftrag `2026-08-05-01-chicken-pose-pilot.md` bis zum vorgeschriebenen
  Abnahmepunkt umgesetzt. Staging:
  `CODEX/AssetControl/chicken-pose-pilot-2026-08-05/`.
- Dateien: `chicken_pose_windup.webp`, `chicken_pose_strike.webp`,
  `chicken_pose_hit.webp` und `CONTROL-BOARD-chicken-poses.webp`.
- Alle drei Posen besitzen dasselbe 1254×1254-Canvas wie der unveränderte Master,
  echtes Alpha, dieselbe Blickrichtung und eng vergleichbare sichtbare
  Flächendeckung. Boden, Schatten und Glow fehlen absichtlich.
- Eine violette Chroma-Kante der ersten Freistellung wurde vor Übergabe entfernt;
  Detailwerte und Alpha-Bounds stehen in `QA.md`.
- Keine Runtime-, Engine-, Persistenz-, i18n- oder Save-Änderung; kein Save-Bump.
  Brief bleibt bis zur Chef-Abnahme offen. Claude bleibt Owner der produktiven
  Einbindung.

## Arena Scene Builder — vollständige Pilot-Palette 2026-08-05

<!-- codex:2026-08-05T09:50:35+02:00 -->

- Claudes reaktivierten Auftrag `2026-08-04-11-scene-builder-assets.md`
  vollständig im Staging `CODEX/AssetControl/arena-scene-builder-lib/`
  produziert.
- 42 echte Alpha-WebPs: 24 generische Natur-/Bodenelemente sowie je sechs
  charakteristische Props für Pastures, Crypt und Slagpit. Dateinamen folgen
  exakt `arena_lib_<category>_<nn>.webp` bzw.
  `arena_<zoneId>_lib_<nn>.webp`.
- Visuelle Chef-Abnahme über `CONTROL-BOARD-all-assets.webp`; vier kleinere
  Bereichstafeln liegen daneben. `INDEX.md` erklärt jede Variante, `QA.md`
  dokumentiert Maße, Alpha, Baseline und Chroma-Prüfung.
- Zwei grüne Alt-Chroma-Rohlinge wurden während der Gesamt-QA erkannt und vor
  Übergabe adaptiv korrigiert. Alle finalen Teile besitzen 8 px transparente
  Baseline-Luft und bleiben unter 900 px.
- Keine Runtime-, Engine-, Persistenz-, i18n-, Manifest- oder Save-Änderung;
  kein Save-Bump. Claude bleibt Owner der Builder-Verdrahtung.

## Grim Reach 1.0 — Release-Titelbild und Hauptkapsel 2026-08-23

<!-- codex:2026-08-23T17:38:21+02:00 -->

- Direkter Chef-Auftrag. Zwei finale Staging-Dateien unter `CODEX/AssetControl/event-1.0/`:
  `grim_reach_1_0_title_1920x622.png` und
  `grim_reach_1_0_main_capsule_800x450.png`.
- Neues ImageGen-Keyart setzt die 1.0-Identität als Schwellenbild um: einzelner Wächter auf der
  alten Straße, letztes Wachfeuer links, feindseliger Elite-Champion und Paragonturm in der Ferne.
  Das Motiv folgt der bindenden These „die Welt lebt und schlägt zurück“ und ist kein Fake-Gameplay.
- Das bestehende transparente `Grim Reach Idle`-Logo aus
  `apps/client/src/renderer/assets/ui/mainmenu_logo.webp` wurde unverändert und deterministisch
  komponiert. Die Bild-KI erzeugte weder Logo noch Schrift. Der statusneutrale Zusatz lautet
  `VERSION 1.0 · FULL RELEASE`; die laufende Patchversion 1.0.2 ändert die 1.0-Eventbezeichnung nicht.
- Built-in ImageGen wurde für das unbeschriftete 1672×941-Keyart verwendet. Exakter Prompt:
  `CODEX/AssetControl/event-1.0/PROMPT.md`; reproduzierbarer Crop-/Logo-Compositor:
  `CODEX/work/2026-08-23-release-1.0-artwork/build-release-artwork.mjs`.
- Visuelle QA erfolgte einzeln in beiden Zielgrößen und gemeinsam über
  `preview-target-sizes.png`. Eine erste Komposition wurde nach Sichtprüfung gezielt korrigiert,
  damit die Krone des offiziellen Logos vollständig innerhalb beider Canvas bleibt.
- Maß-/Format-/SHA256-Prüfung ist im kommentarfreien
  `CODEX/AssetControl/event-1.0/qa.json` dokumentiert; dieser HANDOFF-Eintrag ist der verpflichtende
  `codex:`-Nachweis für diese JSON-Datei sowie für die vier kommentarfreien PNG-Binärdateien.
- Ausschließlich CODEX-Staging und Dokumentation geändert. Kein Steam-Upload, keine Runtime-,
  Engine-, Content-, Persistenz-, i18n- oder Save-Änderung; kein Save-Bump.
- Empfohlener nächster Owner: Claude für Marketinggegenprüfung; Chef für finale Motivfreigabe und
  späteren Steam-Upload.

### Codex-Code-Marker

- `codex:2026-08-23T17:38:21+02:00` — Produktionsscript, Prompt, README, Handoff und Worklog.
- `codex:2026-08-23T17:44:00+02:00` — gezielte Logo-Safe-Area-Korrektur im Produktionsscript.

<!-- codex:2026-08-23T17:51:05+02:00 -->

- Chef-Nachfix: Die `VERSION 1.0 · FULL RELEASE`-Plakette wurde in beiden Zielgrößen deutlich unter
  die untere Logo-Spitze gesetzt. Goldene Flachschrift wurde durch eine gravierte Cinzel-Fassung
  mit silberner Eisenstaffelung, dunkler Kontur und rotem Logo-Akzent ersetzt. Die exakte
  Wortmarkenschrift existiert nur im fertigen Rasterlogo; deshalb ist Cinzel die reproduzierbare
  gebündelte Näherung. Keyart, Crop und offizielles Logo blieben unverändert.
- Marker: `codex:2026-08-23T17:51:05+02:00` im Produktionsscript, HANDOFF und WORKLOG.

<!-- codex:2026-08-23T18:00:20+02:00 -->

- Chef-QA-Nachfix: Die beiden roten horizontalen Plakettenornamente liefen hinter der Release-
  Beschriftung und wurden zwischen den Buchstaben von `RELEASE` sichtbar. Beide Querlinien wurden
  vollständig entfernt; nur der kleine rote Diamant oberhalb der Schrift bleibt. Beide Finalformate,
  Preview und Hash-QA wurden neu erzeugt.

## Verbindlicher Native-Alpha- und ID-Prozess 2026-08-23

<!-- codex:2026-08-23T18:21:18+02:00 -->

- Claudes bindende Quelle `design/asset-anforderungen.md` vollständig gelesen und als dauerhafte
  Grundlage in `CODEX/RULES.md` sowie `CODEX/PROJECT.md` verankert.
- Projektinterner Konflikt aufgelöst: Der allgemeine ImageGen-Leitfaden erlaubt Chroma-Key plus
  Freistellung; Grim Reach verbietet diesen Weg für neue Freisteller. Innerhalb des Projekts gilt
  ausschließlich natives echtes Alpha. Kann der aktuelle Erzeugungsweg dies nicht garantieren,
  stoppt die Produktion vor der Generierung.
- `CODEX/templates/ASSET-BRIEF.md` korrigiert: alte Chroma-Key-Option entfernt, exakte Content-ID
  vor Produktionsbeginn verpflichtend, Native-Alpha-Promptblock und alle sechs Abnahmepunkte aus
  Abschnitt 5 ergänzt.
- Neue aktive Vorlage `CODEX/templates/IMAGEGEN-ASSET-PROMPT.md` enthält gemeinsame Ashen-Iron-
  Vorgaben, den nativen Alpha-Pflichtblock, Kreaturen-/Ausrüstungsregeln, exakte Dateibenennung und
  das sechsteilige Abnahmegate. `CODEX/templates/README.md` verweist darauf.
- Prompt-Audit: 72 prompt-/brief-/templateartige CODEX-Dateien geprüft. 17 enthalten Chroma-
  Referenzen; in den beiden aktiven Vorlagen nur noch als Verbot, die übrigen 15 ausschließlich in
  datierten oder abgelehnten historischen Lieferungen. Diese Altbestände und Elite 11–28 wurden
  auftragsgemäß nicht verändert.
- Ausführlicher Befund: `CODEX/notes/2026-08-23-native-alpha-process-audit.md`.
- Keine Bild-, Runtime-, Content-, Engine-, Persistenz-, i18n-, Save- oder `.claude/**`-Änderung.
  Kein Save-Bump. Claude bleibt Owner der bekannten Elite-Altlasten; Mira wendet das neue Gate auf
  jede künftige Bildlieferung an.

### Codex-Code-Marker

- `codex:2026-08-23T18:21:18+02:00` — RULES, PROJECT, beide aktiven Vorlagen, Auditnotiz,
  HANDOFF und WORKLOG.

## Nachtrag: aktive Downloads-Prompts auf Native Alpha 2026-08-23

<!-- codex:2026-08-23T18:52:28+02:00 -->

- Claudes Hinweis bestätigt: Die weiterhin operative Sammlung
  `C:\Users\MSchu\Downloads\ASSETS\newGPTAssets\` lag außerhalb des ersten CODEX-Prompt-Audits.
  `alle-prompts-aktuell.txt` und `elite-nachschlag-chroma.txt` verlangten dort noch vollflächiges
  `#FF00FF` und behaupteten fälschlich eine saubere Freistellung ohne pinke Säume.
- Beide Quellen vollständig gelesen und überschreibfertig nach
  `CODEX/outbox/2026-08-23-newGPTAssets-native-alpha/` korrigiert. Alle fünf Batch-Blöcke verlangen
  nun natives transparentes PNG mit echtem Alpha; Magenta/Chroma und nachträgliches Freistellen
  erscheinen nur noch als Verbot. Alle 33 exakten Bild-IDs blieben erhalten.
- QA: pro Datei sechs Alpha-Pflichtblöcke, 33 `.png`-IDs, kein `#FF00FF`, keine alte Saum-
  Behauptung. Prüfsummen und Zielzuordnung stehen in `DEPLOYMENT.md`.
- Offener technischer Schritt: Die Sitzung besitzt nur Schreibzugriff unter `G:\GameDev` und konnte
  die zwei externen TXT-Ziele daher nicht überschreiben. Es sind ausschließlich die zwei
  bereitgestellten Textdateien zu kopieren; Bilder und Runtime-Dateien blieben unangetastet.

### Codex-Code-Marker

- `codex:2026-08-23T18:52:28+02:00` — Auditnachtrag, Deployment-Hinweis, HANDOFF und WORKLOG.

## Neuguss-Pilot für drei magenta-belastete Kreaturen 2026-08-23

<!-- codex:2026-08-23T20:47:23+02:00 -->

- Direkter Chef-Auftrag nach aktualisierter Ergebnisregel: eingebautes ImageGen mit flachem
  Rein-Grün als Quelle, danach lokales Despill, weiche Alpha-Matte und Kantenkorrektur.
- `ASSETS/neuguss-2026-08-23/LIESMICH.md` und Promptdatei 1 vollständig gelesen. Für die ersten
  drei Motive sämtliche sechs Referenzbilder im Original geprüft; Basisbilder bestimmten Palette,
  Pinselführung, Material, Beleuchtung und Familienidentität.
- Drei Zwischenabnahme-Dateien mit exakten IDs nach `ASSETS/neuguss-2026-08-23/fertig/` geliefert:
  `mire_wisp.png`, `elite_crypt_icemage.png`, `elite_high_wyvern.png`.
- `mire_wisp` erforderte randverbundenes statt globalem Grün-Keying, damit sein echtes blaugrünes
  Binnenmotiv erhalten bleibt. Eine aggressive Matte wurde nach pinker Kontrastprüfung verworfen.
- Finale QA je Datei: 1254×1254 RGBA, Alpha benutzt, transparente Ecken, Teilalpha vorhanden,
  null sichtbare Magenta-Pixel, null helles Rein-Grün und null grün-dominante Teilalpha-Kanten.
  Werte und Hashes: `CODEX/work/2026-08-23-neuguss-pilot/pilot-qa.json`.
- Keine Runtime-Datei ersetzt. Die übrigen elf Motive aus Datei 1 warten wie beauftragt auf die
  Zwischenabnahme des Chefs; Companion-Prompts unangetastet.

### Codex-Code-Marker

- `codex:2026-08-23T20:47:23+02:00` — Pilot-README, HANDOFF und WORKLOG; zugleich Nachweis für
  `pilot-qa.json` und die drei kommentarfreien PNG-Binärdateien.

## Neuguss Promptdatei 1 nach Chef-Zwischenabnahme 2026-08-23

<!-- codex:2026-08-23T21:24:26+02:00 -->

- Chefkorrektur umgesetzt: `mire_wisp.png` in der vom Chef wiederhergestellten weichen Fassung
  unangetastet gelassen; `elite_high_wyvern.png` referenzgebunden deutlich massiver und mit mehr
  Rückenstacheln neu geliefert.
- Neu nach `ASSETS/neuguss-2026-08-23/fertig/` geliefert: `elite_slag_revenant.png` und
  `elite_coast_crab.png`. Beide sind farbsichere harte Motive, wurden als Notweg mit motivfremdem
  Grün beziehungsweise Blau freigestellt, despillt und auf pinkem Kontrastgrund geprüft.
- Aktueller Lieferstand in `fertig/`: fünf exakte IDs, alle 1254×1254 RGBA, Alpha benutzt,
  transparente Ecken, Teilalpha vorhanden, null sichtbare Magenta- oder Key-Farbreste. Vollständige
  Werte und Hashes: `CODEX/work/2026-08-23-neuguss-prompt1/batch-qa.json`.
- Neun weitere referenzgebundene Motive wurden im eingebauten ImageGen erzeugt, kamen jedoch trotz
  wiederholtem RGBA-Pflichtblock nur als dreikanalige PNGs mit eingebranntem Schachbrett/Weiß zurück.
  Wegen Fell, Federn, Haaren, Leuchten, Nebel, Feuer, Kelp, Moos oder Geweih wurden sie gemäß direkter
  Chefregel nicht gekeyt und nicht ausgeliefert. Details und Rohbildpfade stehen im Arbeits-README.
- Keine Runtime-Datei und keine `.claude/**`-Datei verändert. Der Companion-Batch wurde nicht
  begonnen, solange der Neuguss technisch unvollständig ist.

### Codex-Code-Marker

- `codex:2026-08-23T21:24:26+02:00` — Arbeits-README, HANDOFF und WORKLOG; zugleich Nachweis für
  `batch-qa.json`, die zwei neuen Final-PNGs und den revidierten Wyvern.

## Neuguss und Companion-Serie vollständig 2026-08-24

<!-- codex:2026-08-24T12:35:04+02:00 -->

- Direkter Chef-Auftrag vollständig abgeschlossen: 17/17 Neugüsse unter
  `ASSETS/neuguss-2026-08-23/fertig/` und 21/21 Begleiter unter
  `ASSETS/companions-2026-08-23/fertig/`, jeweils mit Dateiname exakt gleich ID.
- Chefhinweis zu weißen Elementen bestätigt und behoben: Es waren eingeschlossene Felder des
  gemalten Weiß-/Hellgrau-Schachbretts. Die revidierte neutrale Matte entfernt nun auch nicht mit
  dem Bildrand verbundene Zwischenräume. Schwarz-, Grau- und Magenta-Kontaktbögen sind sauber.
- Alle 21 Begleiter kamen nativ als RGBA. Kein Companion wurde gekeyt; niedrig deckende farbige
  Render-Randpixel wurden aus benachbarten Motivfarben korrigiert. Finals sind 1024×1024, ihre
  längste sichtbare Achse misst 800 Pixel, alle Ecken Alpha 0.
- Neuguss-Finals sind 1254×1254 RGBA. Die freigegebenen Pilotdateien blieben erhalten;
  `elite_high_roc` wurde mit nativem Alpha übernommen, elf Schachbrett-Quellen nach direkter
  Ergebnisfreigabe neutral vermattet und auf drei Hintergründen geprüft.
- Gesamt-QA: 38 erwartete und 38 vorhandene PNGs, keine fehlenden oder unerwarteten Dateien und
  keine Maß-, RGBA-, Alpha- oder Eckenverletzung. Werte und SHA-256 stehen in
  `CODEX/work/2026-08-24-final-qa/final-asset-qa.json`.
- Produktionsprotokolle und Kontaktbögen:
  `CODEX/work/2026-08-24-neuguss-native/` und
  `CODEX/work/2026-08-24-companions-native/`.
- Keine Runtime-Datei und keine `.claude/**`-Datei verändert; beide `fertig/`-Ordner sind die
  Übergabe an Claude/Asset-Integration.

### Codex-Code-Marker

- `codex:2026-08-24T12:35:04+02:00` — Verarbeitungs-/QA-Skripte, Arbeits-READMEs, HANDOFF und
  WORKLOG; zugleich Nachweis für die 38 kommentarfreien PNG-Binärdateien und QA-JSONs.

## Companion-Neuguss als Karten- und Kampfserie 2026-08-24

<!-- codex:2026-08-24T14:25:00+02:00 -->

- Chefkorrektur ersetzt den oben dokumentierten ersten Companion-Batch vollständig: Alle 21
  Begleiter wurden als eigenständige Ashen-Iron-Fantasiewesen mit nicht natürlichem Körperbau neu
  entworfen. Die alte Serie war zu eng an reale Tiere angelehnt und gilt ausdrücklich als verworfen.
- Neue Lieferung umfasst 42 exakt benannte 1024×1024-RGBA-PNGs: je 21 Kartenmotive unter
  `ASSETS/companions-2026-08-23/fertig/card/<id>.png` und 21 zugehörige Kampfvarianten unter
  `ASSETS/companions-2026-08-23/fertig/fight/<id>.png`.
- Kartenmotive zeigen die vollständige Kreatur in ikonischer linker beziehungsweise neutraler
  Kartenpose. Kampfvarianten bewahren Anatomie, Material, Palette und Signaturdetails des Partners
  und sind nach rechts ausgerichtet; `carapace` wurde nach der Sichtprüfung eindeutig nach rechts
  gespiegelt.
- Natives Alpha der Karten wurde erhalten und an niedrig deckenden Rändern motivfarbenkorrigiert.
  Die referenzgebundenen Kampf-Rohbilder mit neutralem Weiß-/Hellgrau-Schachbrett wurden
  komponentenweise vermattet, einschließlich eingeschlossener Zwischenräume. Schwarz-, Grau- und
  Magenta-Kontaktbögen zeigen keine Schachfelder, weißen Rechtecke oder sichtbaren Farbsäume.
- Finale technische Abnahme bestanden: 42/42 Dateien vorhanden, exakte IDs in beiden Serien,
  1024×1024, vier Kanäle, verwendetes Voll- und Teilalpha, transparente Ecken und normalisierte
  Silhouetten. Werte und SHA-256: `CODEX/work/2026-08-24-companions-redesign/companion-pairs-final-qa.json`.
- Die 21 verworfenen PNGs wurden wiederherstellbar nach
  `CODEX/work/2026-08-24-companions-redesign/rejected-too-natural/` verschoben. Im Root von
  `fertig/` liegen keine alten PNGs mehr.
- Keine Runtime-, Save-, i18n- oder `.claude/**`-Datei verändert. Die Zweiserien-Namenskonvention
  ist eine Staging-Übergabe; die spätere Runtime-Zuordnung bleibt bei Claude/Asset-Integration.

### Codex-Code-Marker

- `codex:2026-08-24T13:30:00+02:00` bis `codex:2026-08-24T14:25:00+02:00` — Arbeits-README,
  ESM-Verarbeitungs-/QA-Ablauf, HANDOFF und WORKLOG; zugleich Nachweis für die 42 kommentarfreien
  PNG-Binärdateien, die sechs Kontaktbögen und das finale QA-JSON.

## Generische Patchnotes-Artworks 2026-08-24

<!-- codex:2026-08-24T15:10:00+02:00 -->

- Zwei dauerhaft versionsneutrale Grim-Reach-Patchnotes-Motive im Stil des 1.0-Release-Artworks
  fertiggestellt: `CODEX/AssetControl/patchnotes-generic/grim_reach_patchnotes_title_1920x622.png`
  und `CODEX/AssetControl/patchnotes-generic/grim_reach_patchnotes_main_capsule_800x450.png`.
- Das Motiv aus repariertem schwarzem Eisen, Hammer und versiegelter Notizrolle ist für Hotfixes,
  Patches und allgemeine Updates wiederverwendbar. Es enthält weder Versionsnummer noch Datum.
- Das offizielle Projektlogo und `PATCH NOTES` in Cinzel wurden deterministisch auf die textlose
  ImageGen-Quelle gesetzt. Die Plakette liegt vollständig unter dem Logo; keine rote Linie kreuzt
  die Beschriftung.
- Zielmaße und PNG-Format bestätigt; SHA-256-Werte stehen in
  `CODEX/AssetControl/patchnotes-generic/qa.json`. Prompt, Quelle und Zielgrößen-Vorschau liegen im
  selben Übergabeordner.
- Keine Runtime-, Produktdaten- oder `.claude/**`-Datei verändert; die Ausgabe bleibt im
  AssetControl-Staging bis zur Integration durch Claude.

### Codex-Code-Marker

- `codex:2026-08-24T15:10:00+02:00` — Render-Skript, Promptdokument, HANDOFF und WORKLOG;
  zugleich Nachweis für die drei kommentarfreien PNG-Binärdateien und `qa.json`.

## Runen Tier IV und Schmuck-Linie 2026-08-25

<!-- codex:2026-08-25T11:52:00+02:00 -->

- 14 neue Verzauberungsrunen vollständig nach `CODEX/assets/runen-tier-iv-2026-08-25/` geliefert.
  Finals liegen unter `fertig/`, unveränderte Generatorausgaben unter `raw/` und Prüfbelege unter
  `qa/`. Dateiname entspricht bei jeder Datei exakt der Content-ID.
- Fünf Waffenrunen nutzen Glut-Gold, vier Rüstungsrunen Eis-Blau und fünf Schmuckrunen Violett.
  Alle neun Waffen- und Rüstungsrunen tragen die IV. Die Schmucklinie besitzt keine Ziffer.
- Alle Rohbilder besitzen natives Generator-Alpha. Finals wurden nur beschnitten, skaliert und auf
  transparentem 1024er-Canvas zentriert. Kein Keying und keine nachträgliche Freistellung.
- Finale QA bestanden: 14 von 14 Dateien, 1024 × 1024 PNG sRGB RGBA, äußere 32 px Alpha 0,
  Teilalpha vorhanden, Steinkörper 80 bis 88 % hoch, keine fehlenden oder unerwarteten IDs.
- Kontaktbögen auf Schwarz, Grau und Grellrosa sowie 64-/96-px- und Tier-III-Vergleich liegen in
  `CODEX/assets/runen-tier-iv-2026-08-25/qa/`. Vollständige Werte und SHA-256 stehen in `qa.json`.
- Zwei Gericht- und vier Waffenfassungen mit gemaltem Schachbrett wurden technisch verworfen und
  ausschließlich unter `CODEX/work/2026-08-25-runen-tier-iv/rejected-alpha/` quarantänisiert.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert. Nächster Owner ist
  `asset-integrator`, danach `kontrolleur`.

### Codex-Code-Marker

- `codex:2026-08-25T10:30:00+02:00` bis `codex:2026-08-25T11:52:00+02:00` — Brief,
  Aufbereitungs- und QA-Skript, Asset-README, HANDOFF und WORKLOG. Die Marker dokumentieren zugleich
  die 28 kommentarfreien PNG-Lieferdateien, fünf QA-PNGs und das kommentarfreie `qa.json`.

### Chef-Abnahme

<!-- codex:2026-08-25T11:00:35+02:00 -->

- Chef-Abnahme am 2026-08-25: 14 von 14 Runen angenommen, keine Korrekturen.
- Gegenprüfung bestätigt RGBA 1024², vollständig transparenten Außenrand, Steinkörper mit 84 bis
  90 % Höhe, keine Schachbrettsignale in opaken Zonen, exakte IDs und lesbare Glyphen.
- Stilprüfung neben Tier III bestanden. Waffen-, Rüstungs- und Schmucklinie sind sauber getrennt.
- Produktive Integration läuft separat durch den zuständigen Agenten. Geplant sind WebP mit 640 px,
  Ablage im Renderer und Archivierung der Originale. Mira hat diese Integrationspfade nicht berührt.

## Achievement-Kategorie-Embleme 2026-08-25

<!-- codex:2026-08-25T20:55:00+02:00 -->

- Zehn neue handgemalte Kategorie-Embleme und der optionale neue Meilenstein vollständig nach
  `CODEX/assets/achievement-icons-2026-08-25/` geliefert. Finals liegen unter `fertig/`,
  unveränderte Generatorausgaben unter `raw/` und Prüfbelege unter `qa/`.
- Jede Rohdatei wurde mit dem eingebauten ImageGen-Werkzeug im Standardmodus als natives
  1254 × 1254-RGBA-PNG erzeugt. Es wurden keine Bildreferenzen in die Erzeugung eingespeist.
  Die finalen 512er bewahren dieses Alpha und wurden nur transparent beschnitten, proportional
  skaliert und zentriert. Kein Keying, keine Matte und kein nachträgliches Freistellen.
- Finale technische QA bestanden: 10 von 10 Pflicht-IDs plus genau `icon_ach_milestone`, alle
  512 × 512 PNG sRGB RGBA, benutztes Voll- und Teilalpha, äußerer 16-px-Rand vollständig Alpha 0,
  opake Motivhöhe 434 bis 435 px, keine fehlenden oder unerwarteten Dateien.
- Der exakte `qa/contact-sheet-ring-28-46.png` zeigt alle zehn Kategorien bei 28 px in den fünf
  Rarity-Ringen und in der gesperrten Reihe. Schwarz-, Grau- und Grellrosa-Bögen zeigen keine
  Schachbrettflächen oder Farbsäume. Der Kleinformatbogen deckt 24 und 50 px sowie die 12-px-
  Farm-Ähre und den Meilenstein bei 12 und 20 px ab.
- Amboss und Truhe wurden nach dem ersten Maßlauf neu erzeugt, weil ihre breiten Rohsilhouetten die
  Mindesthöhe verfehlten. Die angenommenen Fassungen erreichen jeweils 435 px Motivhöhe ohne
  unproportionale Dehnung.
- `icon_achievments` und `icon_achievement_unlocked` wurden bewusst nicht neu erzeugt. Beide
  Bestandsassets sind bereits gemalt und erfüllen ihre reichere Kopf- beziehungsweise Statusrolle.
  Der bislang flache Meilenstein wurde ersetzt.
- Vollständige Messwerte und SHA-256 stehen in
  `CODEX/assets/achievement-icons-2026-08-25/qa/qa.json`. Brief Teil B und C sind ausgefüllt;
  Teil D enthält Miras Produktions-GO und wartet auf die bindende Gegenprüfung.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert. Nächster Owner ist
  `asset-integrator`, danach `ui-dev` für die Sichtprüfung auf der laufenden Seite.

### Codex-Code-Marker

- `codex:2026-08-25T20:18:00+02:00` bis `codex:2026-08-25T20:55:00+02:00` —
  Aufbereitungs-/QA-Skript, Asset-README, Brief, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich die 22 kommentarfreien PNG-Lieferdateien, sieben QA-PNGs und das kommentarfreie
  `qa.json`.

## Jägerumhang für den Slayer-Shop 2026-08-25

<!-- codex:2026-08-25T21:34:00+02:00 -->

- Finales Itembild `slayer_hunters_cape.png` nach
  `CODEX/assets/slayer-jaegerumhang-2026-08-25/fertig/` geliefert. Die Datei ist exakt nach der
  Content-ID benannt und für Grim Reach 1.1.0, Slayer-Shop Phase 2 vorgesehen.
- Zwei technisch saubere native Alpha-Varianten wurden erzeugt. Variante A wurde gewählt, weil
  ihre breitere Silhouette, grüne Umschlagkante und Reißzahn-Schließe bei 48 px klarer lesen.
  Variante B bleibt als unveränderte Wahlquelle unter `raw/`.
- Beide gültigen Rohdateien sind 1254 × 1254 RGBA mit Alpha 0 bis 255. Das Final ist 1024 × 1024
  sRGB RGBA, opake Motivhöhe 880 px, äußerer 16-px-Rand vollständig transparent.
- Die Aufbereitung beschränkte sich auf transparenten Zuschnitt, proportionale Skalierung und
  bottom-center-Zentrierung. Kein Keying, keine Matte, kein Despill und kein nachträgliches
  Freistellen. Ein früher Entwurf mit halbtransparenter brauner Studiofläche wurde am Alpha-Gate
  verworfen und nicht in die Lieferung übernommen.
- Kontaktbögen auf Schwarz, Grau und Grellrosa, der Vergleich neben fünf Bestandsumhängen,
  48-/96-/128-px-Ansichten und der Abgleich mit Slayer-Ausrüstung und Brenna liegen unter `qa/`.
  Variante A bleibt sichtbar unter der helleren, bestickten Wertigkeit von `mariner_cloak`.
- Vollständige Messwerte und SHA-256 stehen in
  `CODEX/assets/slayer-jaegerumhang-2026-08-25/qa/qa.json`. Alle automatischen Gates sind `true`.
- Brief Teil B bis D, Asset-README und WORKLOG sind aktualisiert. Keine Renderer-, Content-,
  Save-, i18n- oder `.claude/**`-Datei wurde verändert. Nächster Owner ist `asset-integrator`;
  bindende Abnahme bleibt bei Claude und Chef.

### Codex-Code-Marker

- `codex:2026-08-25T21:18:00+02:00` bis `codex:2026-08-25T21:34:00+02:00` —
  Aufbereitungs-/QA-Skript, Asset-README, Brief, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich drei kommentarfreie Liefer-PNGs, acht QA-PNGs und das kommentarfreie `qa.json`.

## Belohnungsladen-Kapitelitems 2026-08-26

<!-- codex:2026-08-26T10:26:05+02:00 -->

- Sieben neue Kapitel-Belohnungen vollständig nach
  `CODEX/assets/belohnungsladen-2026-08-26/` geliefert. Finals liegen unter `fertig/`, die sieben
  angenommenen Generatorausgaben unter `raw/` und die Prüfbelege unter `qa/`.
- Enthalten sind zwei Ringe, zwei Amulette, ein Umhang, das reichere Chronisten-Signet und eine
  stapelbare Auftragsmarke. Alle Dateien sind exakt nach den Content-IDs benannt.
- Erzeugung mit eingebautem ImageGen im Standardmodus und nativem Alpha. Die Aufbereitung bewahrt
  das Alpha und beschränkt sich auf transparenten Zuschnitt, proportionale Skalierung und
  Bottom-Center-Platzierung. Kein Keying, keine Matte, kein Despill oder Freistellen.
- Finale technische QA bestanden: 7/7 PNG sRGB RGBA mit 1024 × 1024, äußerer 16-px-Rand vollständig
  transparent, Motivkörper 869 bis 870 px hoch, keine fehlenden oder unerwarteten IDs.
- Kontaktbögen auf Schwarz, Grau und Grellrosa, neben typgleichen Bestandsitems und bei 48/96/128 px
  liegen unter `qa/`; Einzelwerte und SHA-256 stehen in `qa/qa.json`.
- Verworfen wurden Fassungen mit knappem Rand, gemaltem Schachbrett, Studiovignette oder zu
  leuchtendem Ascheriss. Sie wurden nicht in die Lieferung übernommen.
- Brief Teil B bis D und Asset-README sind ausgefüllt. Keine Renderer-, Content-, Save-, i18n-
  oder `.claude/**`-Datei verändert. Nächster Owner ist `asset-integrator`; bindende Abnahme durch
  Claude und Chef steht aus.

### Codex-Code-Marker

- `codex:2026-08-26T10:23:25+02:00` bis `codex:2026-08-26T10:26:05+02:00` —
  Aufbereitungs-/QA-Skript, Asset-README, Brief, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich 14 kommentarfreie Liefer-PNGs, sieben QA-PNGs und das kommentarfreie `qa.json`.

## Stil-Parität: 47 Item-Bilder 2026-08-26

<!-- codex:2026-08-26T14:18:00+02:00 -->

- Vollständige Lieferung unter `CODEX/assets/stil-paritaet-2026-08-26/`: 47 angenommene native
  Alpha-Raws, 47 produktionsfertige Finals und 32 QA-Dateien.
- Enthalten sind 10 Bögen, 6 Magiewaffen, 2 Foki, 11 Lederteile, 16 Stoffteile und 2 Tonika.
  Alle Finals heißen exakt wie ihre Content-ID und liegen als 1024 × 1024 PNG unter `fertig/`.
- Erzeugung mit eingebautem ImageGen im Standardmodus. Kein Keying, keine Matte, kein Despill
  oder Freistellen. Finals bewahren das native Alpha und wurden nur transparent beschnitten,
  proportional skaliert und unten mittig platziert.
- Technische Endprüfung bestanden: 47/47 sRGB-RGBA, Alpha 0 bis 255, äußerer 16-px-Rand
  vollständig transparent, sichtbare Motivhöhe 850 bis 880 px, keine fehlenden oder zusätzlichen
  IDs. Einzelwerte und SHA-256 stehen in `qa/qa.json`.
- Nach Chef-Hinweis wurde die komplette A1-Serie neu gegossen. Die angenommenen Bögen haben
  durchgehende belastbare Wurfarme, klare Nocken und je eine gerade gespannte Sehne; der
  Bestandsvergleich und die Grellrosa-Kantenprüfung liegen unter `qa/`.
- Drei breite A4-Paarfassungen wurden für den Höhenkorridor kompakter neu erzeugt. Die fertige
  Stoffserie ist bei 48/96/175 px geprüft und bleibt frei von Glühen und Partikeln.
- Je Gruppe liegen vier Hintergrundbögen, ein Bestandsvergleich und eine UI-Größenprobe vor.
  Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert.
- Nächster Owner: Claude für Gegenprüfung, danach `asset-integrator` für WebP-Konvertierung und
  Renderer-Ablage. `CODEX/assets/**` bleibt bis dahin reines Staging.

### Codex-Code-Marker

- `codex:2026-08-26T13:40:00+02:00` bis `codex:2026-08-26T14:18:00+02:00` —
  Aufbereitungs-/QA-Skript, Asset-README, Brief, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich die kommentarfreien 94 Liefer-PNGs, 31 QA-PNGs und `qa/qa.json`.

## Item-Wiki-Modal: fünf Redesign-Richtungen 2026-08-26

<!-- codex:2026-08-26T14:48:00+02:00 -->

- Fünf eigenständige High-Fidelity-Mockups nach Chef-Auftrag unter
  `CODEX/assets/wiki-modal-mockups-2026-08-26/` geliefert; gemeinsamer Vergleichsbogen inklusive.
- Bestehender Screenshot wurde nur als Stil- und Inhaltsreferenz genutzt. Kein Renderer-, React-,
  CSS-, i18n- oder Engine-Code verändert.
- Richtungen: Codex Ledger, Forge Flow, Archiv-Schubladen, Blacksteel Index und Relic Showcase.
  Alle bewahren Gravewood-&-Bronze/Ashen-Iron, ordnen Item, Quelle und Verwendungen aber
  strukturell neu.
- Miras Empfehlung ist Variante 3 als Umsetzungsbasis; Variante 4 ist die Alternative für
  maximale Datendichte. Bindende Richtungswahl bleibt beim Chef.
- Brief, Referenzkopie und vollständiges Promptset liegen unter
  `CODEX/work/2026-08-26-wiki-modal-mockups/`. Erzeugung erfolgte mit eingebautem ImageGen im
  Standardmodus.
- Nächster Owner nach Chefwahl: `ui-dev` für eine HTML/CSS-Annäherung im Renderer und anschließende
  headless Typecheck-/Build-Prüfung.

### Codex-Code-Marker

- `codex:2026-08-26T14:32:00+02:00` bis `codex:2026-08-26T14:48:00+02:00` — Brief, Promptset,
  Asset-README, HANDOFF und WORKLOG; zugleich Dokumentation der sechs kommentarfreien Mockup-PNGs.

## Item-Wiki: interaktive HTML-Prototypen 02 und 05 2026-08-26

<!-- codex:2026-08-26T15:24:00+02:00 -->

- Nach direkter Chef-Auswahl die Bildrichtungen 02 `Forge Flow` und 05 `Relic Showcase` als
  eigenständige HTML/CSS/JS-Prototypen unter
  `CODEX/outbox/2026-08-26-wiki-modal-html/` umgesetzt.
- `index.html` schaltet zwischen beiden Seiten um und bietet einen Vollbildlink. Die Einzeldateien
  sind `02-forge-flow.html` und `05-relic-showcase.html`.
- Beide Konzepte behandeln Quellen als beliebig lange Sammlung. Vier Herkunftsarten dienen als
  interaktive Layoutbeispiele; Auswahl aktualisiert Chance, Typ und Detailband. Diese Namen und
  Chancen sind ausdrücklich keine neuen Content-/Lore-Entscheidungen.
- Konzept 02 ergänzt Used-for-Filter für Waffen/Rüstung und einen Quelle→Item→Verwendung-Detailfluss.
  Konzept 05 ergänzt ein Mehrquellen-Band, horizontale Verwendungsgalerie und Auswahl-Detailpanel.
- 29 lokale Kopien bestehender Grim-Reach-Items, Icons, Texturen und Fonts liegen in `assets/`,
  damit der Prototyp ohne Renderer-Abhängigkeit geöffnet werden kann. Keine Quelldatei verändert.
- Statische QA bestanden: alle Links/Assets vorhanden, JS-Syntax gültig, CSS-Blockstruktur gültig.
  Automatischer Browser-/Screenshotlauf war nicht möglich, weil in dieser Sitzung kein Browser-
  Backend verfügbar war; vor Runtime-Übernahme offen nachholen.
- Keine Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.
  Nächster Owner nach Chefentscheid: `ui-dev` für die echte Komponenten-/i18n-Umsetzung.

### Codex-Code-Marker

- `codex:2026-08-26T15:12:00+02:00` bis `codex:2026-08-26T15:24:00+02:00` — beide HTML-Seiten,
  gemeinsame Styles/Interaktionen, README, QA, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich die 29 kommentarfreien lokalen Assetkopien.

## Main-Menü und Item-Stack — je fünf Design-Mockups 2026-08-26

<!-- codex:2026-08-26T16:03:00+02:00 -->

- Direkten Chefauftrag als zehn reine Designstudien umgesetzt: fünf Main-Menüs und fünf
  Item-Stack-Modals. Jede Nummer bildet eine zusammengehörige Designfamilie.
- Lieferung unter `CODEX/assets/mainmenu-itemstack-mockups-2026-08-26/`; Einzelbilder liegen in
  `main-menu/` und `item-stack/`, drei nummerierte Kontaktbögen in `qa/`.
- Designfamilien: `Ashen Gate`, `War Table`, `Black Chronicle`, `Frontline Registry`,
  `Ember Reliquary`.
- Alle zehn PNGs sind 1672 × 941 px und visuell geprüft. Main-Menüs enthalten die Kernaktionen;
  Stack-Modals zeigen mehrere Varianten zugleich und demonstrieren unterschiedliche
  Skalierungsmodelle.
- Fachliche Empfehlung: Main-Menü 02 oder 05; Stack-Modal 02 als beste Balance, 04 bei maximaler
  Datendichte. Finale Produktentscheidung bleibt beim Chef.
- Brief, Referenzen und vollständige Prompts liegen unter
  `CODEX/work/2026-08-26-mainmenu-itemstack-mockups/`.
- Erzeugungsweg: eingebautes ImageGen-Werkzeug im Standardmodus. Keine HTML-, Renderer-, React-,
  CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

### Codex-Marker

- `codex:2026-08-26T15:48:00+02:00` — Brief und Prompt-Set.
- `codex:2026-08-26T16:03:00+02:00` — Staging-README, HANDOFF und WORKLOG; dokumentiert zugleich
  die zehn PNG-Mockups und drei kommentarfreien Kontaktbögen.

## Ausgewählte Main-Menüs und Item-Stack als HTML-Prototypen 2026-08-26

<!-- codex:2026-08-26T16:42:00+02:00 -->

- Nach direkter Chef-Auswahl vier eigenständige Standalone-Prototypen unter
  `CODEX/outbox/2026-08-26-mainmenu-itemstack-html/` umgesetzt: Main-Menü 01 `Ashen Gate`,
  Main-Menü 02 `War Table`, Main-Menü 04 `Frontline Registry` und Item-Stack 02 `War Table`.
- `index.html` dient als gemeinsame Auswahlseite und verwendet die abgenommenen Konzeptbilder als
  Vorschau. Jede Detailseite verlinkt zurück.
- Der Item-Stack besitzt eine funktionale Variantenwahl mit live aktualisiertem Vergleich,
  Qualitätsbalken, Verkaufspreis und Filter-/Sortierzuständen. Die Main-Menüs demonstrieren
  Sprachwahl und Aktionsfeedback.
- 24 lokale Kopien bestehender Grim-Reach-Assets liegen in `assets/`. Nach Chefkorrektur wurden
  zusätzlich ein echtes RGBA-Gate und ein deckender War-Table-Hintergrund erzeugt und eingebaut.
  Produktionsquellen blieben unverändert.
- Statische QA bestanden: alle HTML- und CSS-Referenzen vorhanden, JS-Syntax gültig,
  CSS-Klammerbilanz ausgeglichen. Browser-/Screenshotprüfung blieb offen, weil das Browser-Plugin
  nach vorgesehener Initialisierung und Diagnose kein verfügbares Backend meldete.
- Keine React-, Renderer-, CSS-Produktions-, i18n-, Engine-, Content- oder `.claude/**`-Datei
  verändert. Nächster Owner nach Chefentscheidung: `ui-dev` für die echte Integration.

### Codex-Code-Marker

- `codex:2026-08-26T16:18:00+02:00` bis `codex:2026-08-26T16:42:00+02:00` — Brief,
  HTML-Seiten, gemeinsame Styles/Interaktionen, README, QA, HANDOFF und WORKLOG. Die Marker
  dokumentieren zugleich die 24 kommentarfreien lokalen Assetkopien.

### Chefkorrektur: echte Großmotive

<!-- codex:2026-08-26T17:08:00+02:00 -->

- Chef beanstandete zu Recht, dass Main 01 das Gate nur per CSS andeutete und Main 02 keinen
  physischen War Table besaß.
- `assets/ashen-gate-overlay-v1.png` als vollständiges monumentales RGBA-Foreground-Asset
  erzeugt und in Main 01 eingebaut. Alpha gemessen: 0 bis 255, keine deckende Hintergrundfläche.
- `assets/mainmenu-war-table-background-v1.png` als deckende, nahtlose Panorama-/Tischkomposition
  erzeugt und in Main 02 eingebaut.
- Zwei vorherige War-Table-Freistellversuche wurden wegen gemaltem Schachbrett und fehlendem Alpha
  verworfen. Kein Keying; finale Lösung ist ein bewusst deckender Szenenhintergrund.
- Kompositions-QA mit Originalpanorama und Logo liegt in `qa/`. Vollständiges Promptprotokoll:
  `CODEX/work/2026-08-26-mainmenu-itemstack-html/PROMPTS.md`.
- Keine Produktivdatei verändert.

### Chefkorrektur: Item-Stack erhält ebenfalls ein echtes War-Table-Motiv

<!-- codex:2026-08-26T17:24:00+02:00 -->

- Auf direkte Chefkorrektur `assets/itemstack-war-table-shell-v1.png` erzeugt und als tragende
  Hintergrundschale des Item-Stack-Modals eingebaut.
- Die Schale enthält echten dunklen Kartentisch, Lederflächen, Eisenschienen, Kartengravur,
  Kompass-/Siegelmotive und drei vorbereitete Arbeitszonen. Sie enthält bewusst keine statischen
  Texte oder Items; Auswahl, Werte und Buttons bleiben funktionales HTML.
- Desktop-CSS auf die feste Bildarchitektur ausgerichtet; unter 1250 px kontrollierter Rückfall auf
  die skalierbaren bestehenden Gravewood-Rahmen.
- RGB 1672 × 941 geprüft und mit den echten Mithril-Helmen als Platzierungs-QA kontrolliert.
- Keine Produktivdatei verändert.

## Main-Menü-Unterseiten: je fünf Design-Mockups 2026-08-26

<!-- codex:2026-08-26T18:52:00+02:00 -->

- Direkten Chefauftrag als 15 reine Designstudien umgesetzt: je fünf Entwürfe für `New Game`,
  `Load Game` und `Character Creation`; ausdrücklich noch kein HTML.
- Die fünf screenübergreifenden Familien sind `Ashen Gate`, `War Table`, `Frontline Registry`,
  `Black Chronicle` und `Ember Reliquary`. Jede Familie überträgt dieselbe räumliche Metapher auf
  alle drei Unterseiten, statt nur drei isolierte Screens zu liefern.
- Lieferung unter `CODEX/assets/mainmenu-submenus-mockups-2026-08-26/`. Einzelbilder liegen in
  `new-game/`, `load-game/` und `character-creation/`; vier Kontaktbögen liegen unter `qa/`.
- Alle 15 PNGs sind 1672 × 941 px, RGB und visuell geprüft. New Game enthält fünf leere Slots,
  Load Game drei belegte plus zwei leere Slots, Character Creation Name, Porträts, drei Startstile
  und Abschlussaktion.
- Fachliche Einordnung: 01 ist die stärkste filmische Gesamtrichtung, 02 der konsequenteste
  Anschluss an das favorisierte War-Table-Hauptmenü, 03 die robusteste responsive Datenstruktur.
  Die bindende Auswahl bleibt beim Chef.
- Erzeugung mit eingebautem ImageGen im Standardmodus. Brief, Referenzen, Promptset und
  reproduzierbare Staging-/Kontaktbogen-Skripte liegen unter
  `CODEX/work/2026-08-26-mainmenu-submenus-mockups/`.
- Keine HTML-, Renderer-, React-, CSS-, i18n-, Engine-, Content- oder `.claude/**`-Datei verändert.

### Codex-Code-Marker

- `codex:2026-08-26T18:20:00+02:00` bis `codex:2026-08-26T18:52:00+02:00` — Arbeitsbrief,
  Promptset, Staging-/QA-Skripte, Asset-README, HANDOFF und WORKLOG. Die Marker dokumentieren
  zugleich die 15 kommentarfreien Mockup-PNGs und vier Kontaktbögen.

## Ausgewählte Untermenüs als HTML-Prototypen 2026-08-26

<!-- codex:2026-08-26T19:36:00+02:00 -->

- Chef-Auswahl umgesetzt: Character Creation 03 `Frontline Registry`, Load Game 05
  `Ember Reliquary` und passend dazu New Game 05 `Ember Reliquary`.
- Standalone-Lieferung unter `CODEX/outbox/2026-08-26-mainmenu-submenus-html/` mit gemeinsamer
  Auswahlseite und drei eigenständigen HTML-Dateien.
- New Game besitzt fünf anwählbare Slots und führt in die gewählte Registry. Load Game besitzt
  drei belegte plus zwei leere Slots, vollständig wechselnde Dossierdaten und einen
  nicht-destruktiven Delete-Dialog. Character Creation synchronisiert Name, Porträt, Startstil,
  Schrittleiste und Abschlussaktion.
- Für New/Load wurde eine textfreie deckende Ember-Reliquary-Landschaft mit eingebautem ImageGen im
  Standardmodus erzeugt. Ein neuer Heldenfreisteller fiel am Alpha-Gate durch, weil das
  Schachbrett gemalt war; kein Keying. Der Prototyp verwendet stattdessen den bestehenden echten
  RGBA-Helden `knight_m.webp` als lokale Kopie.
- Statische QA bestanden: alle lokalen Referenzen vorhanden, JS-Syntax gültig, CSS-Bilanz 0,
  Szenenplatte 1672 × 941 RGB, Held 1086 × 1448 RGBA mit Alpha 0 bis 255.
- Browser-Live-QA blieb offen, weil die initialisierte Browser-Laufzeit keine verfügbare Instanz
  meldete. Dieser Blocker ist in `QA.md` dokumentiert; keine alternative Browserautomation wurde
  eingesetzt.
- Keine Renderer-, React-, produktive CSS-, i18n-, Engine-, Content-, Save- oder `.claude/**`-
  Datei verändert.

### Codex-Code-Marker

- `codex:2026-08-26T19:08:00+02:00` bis `codex:2026-08-26T19:36:00+02:00` — Brief,
  Promptprotokoll, Assetvorbereitung, vier HTML-Dateien, CSS, Interaktionen, README, QA, HANDOFF und
  WORKLOG. Die Marker dokumentieren zugleich die kommentarfreien lokalen Assetkopien und die neue
  deckende Szenenplatte.

## 2026-08-26 — Human-Roster-Workflow und Sechser-Pilot

<!-- codex:2026-08-26T20:52:00+02:00 -->

- Chefentscheid in einen gesperrten Vertrag für 15 Kampfklassen, 15 Berufe und 60 eigenständige
  Human-Identitäten übertragen: `CODEX/work/2026-08-26-human-roster/`.
- Neue harte Paarregel übernommen: männliche und weibliche Variante tragen dieselbe sichtbare
  Waffen-/Werkzeugfamilie und gleiche Anzahl Hauptgeräte; Kleidung darf geschlechtsspezifisch
  variieren und bei Frauen moderat offener sein, bleibt aber funktional.
- Neue harte Richtungsregel übernommen: Körper, Gesicht, Nase und Blick zeigen immer nach
  Bildschirm-rechts.
- Pilot mit Krieger, Feuermagier und Schurke, jeweils männlich/weiblich, unter
  `CODEX/assets/human-character-roster-2026-08-26/fertig/` abgeliefert.
- Alle sechs Finals messen 1086 × 1448 RGBA, Alpha 0–255 und 85,9–87,4 % sichtbare Höhe. Heller
  und dunkler Kontaktbogen sowie Einzelmessungen liegen unter `qa/`.
- Eingebautes ImageGen im Standardmodus verwendet. Ein erster referenzgebundener RGB-Durchlauf
  wurde vollständig verworfen; kein Keying oder nachträgliches Freistellen. Die akzeptierten
  Motive besitzen natives Alpha aus der Erzeugung.
- Nur Staging und Dokumentation geändert; nichts in Renderer, Content, Save, Engine oder
  `.claude/**` integriert. Die übrigen 54 Figuren folgen nach Richtungsabnahme im gleichen Vertrag.

### Codex-Code-Marker

- `codex:2026-08-26T20:44:00+02:00` bis `codex:2026-08-26T20:52:00+02:00` — aktualisierter
  Produktionsvertrag, Identitätsmatrix, Promptset, Kontaktbogen-Skript, Staging-README, QA,
  HANDOFF und WORKLOG. Kommentarlose PNGs sind über diese Einträge mit ihren exakten Zielpfaden
  dokumentiert.

## 2026-08-26 — Buckhide-Set und Jagdbogen, 6/6

<!-- codex:2026-08-26T21:32:00+02:00 -->

- Sechs fehlende frühe Fernkampf-Items unter
  `CODEX/assets/buckhide-set-2026-08-26/fertig/` abgeliefert: `buckhide_helm`, `buckhide_body`,
  `buckhide_legs`, `buckhide_vambraces`, `buckhide_boots`, `hunting_bow`.
- Alle Finals sind exakt 1024 × 1024 PNG RGBA mit Alpha 0–255, transparentem Außenrand und
  slotweise an den Bestandsreferenzen gemessener Canvasbelegung.
- Materialserie: raues dunkel rauchbraunes Hirschleder, kurze graubraune Fellkanten, matte
  Hornknebel, Handnähte; sichtbar einfacher als `cured_leather_*`, ohne Magieeffekte.
- Jagdbogen auf Funktion geprüft: ein durchgehender Eschenholzstab, zwei Nocken, eine gerade
  Sehne und gleichmäßige C-Kurve. Höhe 88,7 % gegenüber 88,5 % bei `bronze_shortbow`.
- Eingebautes ImageGen im Standardmodus verwendet. Ein erster Beinling-Durchlauf mit deckender
  brauner Fläche wurde verworfen; der gelieferte Neuguss besitzt natives Alpha. Kein Keying und
  keine nachträgliche Freistellung.
- QA auf dunklem, hellem und grellrosa Grund, im 48-px-Maßstab und neben Wams-/Bogenreferenz
  bestanden. Details: `CODEX/assets/buckhide-set-2026-08-26/qa/QA.md`.
- Native akzeptierte Ausgaben liegen in `raw/`; verwendete Prompts in
  `CODEX/work/2026-08-26-buckhide-set/PROMPTS-USED.md`.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert. Claude übernimmt
  WebP-Konvertierung, Produktionsablage und Archivierung nach Gegenprüfung.

### Codex-Code-Marker

- `codex:2026-08-26T21:05:00+02:00` bis `codex:2026-08-26T21:32:00+02:00` — Produktionsplan,
  Promptprotokoll, QA-Skript, Brief-Abnahme, Staging-README, QA, HANDOFF und WORKLOG. Die
  kommentarfreien PNGs sind hier über ihre exakten Zielpfade dokumentiert.

## 2026-08-26 — Patchnote-Artwork 1.1.0

<!-- codex:2026-08-26T22:02:00+02:00 -->

- 1920 × 622 Titelbild und 800 × 450 Hauptkapsel unter
  `CODEX/assets/patchnotes-1.1.0-2026-08-26/fertig/` fertiggestellt.
- Thema: `Patch #2 · The Slayer's Ledger`; Warden-Auftragskammer mit schwerem Jägerregister,
  versiegeltem Vertrag, Fangmarke, Jagdmesser und Jägerumhang.
- Textlose Hintergrundquelle mit eingebautem ImageGen im Standardmodus erzeugt. Offizielles
  Projektlogo sowie Version und Titel anschließend deterministisch in Projekt-Cinzel gesetzt.
- Logo, Titelplatte und beide Textzeilen überdecken sich nicht; keine Dekorlinie kreuzt Text.
- Zielmaße, RGB-Format und gemeinsamer Vorschaubogen geprüft; QA liegt unter `qa/`.
- Keine Renderer-, Steam-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert.

### Codex-Code-Marker

- `codex:2026-08-26T21:48:00+02:00` bis `codex:2026-08-26T22:02:00+02:00` — Brief, Prompt,
  deterministischer Artwork-Build, Textquellen, Staging-README, QA, HANDOFF und WORKLOG. Die
  kommentarfreien PNGs sind hier mit exakten Zielpfaden dokumentiert.

## 2026-08-26 — Human Character Roster, 60/60

<!-- codex:2026-08-26T23:08:00+02:00 -->

- Vollständiger Human-Roster unter
  `CODEX/assets/human-character-roster-2026-08-26/fertig/` abgeliefert: 15 Kampfklassen und
  15 Berufe, jeweils männlich und weiblich, insgesamt 60 exakte Content-IDs.
- Alle Finals sind exakt 1086 × 1448 PNG RGBA. Der vollständig transparente Außenrand ist bei
  60/60 Dateien bestätigt; gemessene Alphakanal-Motivhöhe 84,12–87,98 % bei Vertrag 84–92 %.
- 30/30 Paare verwenden dieselbe sichtbare Waffen- beziehungsweise Werkzeugfamilie und dieselbe
  Anzahl primärer Geräte. Mann und Frau bleiben jeweils klar unterschiedliche Personen.
- 60/60 Ganzfiguren zeigen Kopf, Hände, komplette Ausrüstung und beide Stiefel und orientieren
  Körper, Gesicht, Nase und Blick eindeutig nach Bildschirm-rechts.
- Ranger-Langbögen zusätzlich auf funktionale Geometrie geprüft: durchgehender Stab, einzelne
  Sehne an beiden Nocken, klare Griffzone, keine umgekehrten oder gebrochenen Wurfarme.
- Produktion mit eingebautem ImageGen im Standardmodus; akzeptierte native Ausgaben in `raw/`.
  Kein Chroma-Key, kein nachträgliches Freistellen. Ein ImageGen-Korrekturtest mit gemaltem
  Schachbrett wurde verworfen und nicht in `raw/` oder `fertig/` übernommen.
- Technische und visuelle Abnahme liegt unter
  `CODEX/assets/human-character-roster-2026-08-26/qa/`; Identitätsmatrix und finales
  Serien-Promptset unter `CODEX/work/2026-08-26-human-roster/`.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert. WebP-Konvertierung
  und Produktionsintegration bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-26T20:44:00+02:00` bis `codex:2026-08-26T23:08:00+02:00` — Brief,
  Identitätsmatrix, Pilot- und Vollpromptset, Staging-README, QA, HANDOFF und WORKLOG. Die
  kommentarfreien PNGs sind durch den exakten Staging-Pfad oben und in `qa/qa.json` dokumentiert.

## 2026-08-26 — Elf Character Creator Demo, 8/8

<!-- codex:2026-08-26T23:57:41+02:00 -->

- Neue Elfen-Demo unter `CODEX/assets/elf-character-demo-2026-08-26/fertig/`: Krieger,
  Waldläufer, Juwelier und Verzauberer, jeweils männlich und weiblich.
- Visuelle Linie: junge erwachsene, außergewöhnlich attraktive hochgeborene Elfen als
  eigenständige Grim-Reach-Auslegung; lange spitze Ohren, elegante Proportionen, organische
  Mondsilber-/Altgold-Konstruktion, keine kopierten Franchise-Wappen oder -Figuren.
- Kampfklassen stehen klar kampfbereit nach Bildschirm-rechts. Berufsfiguren bleiben ruhiger,
  blicken ebenfalls nach rechts und lesen über Werkzeug und Kleidung statt Kampfausrüstung.
- Paare teilen exakt dieselbe Waffen-/Werkzeugfamilie: Schwert plus Blattschild, funktionaler
  Langbogen plus Köcher, Juwelierhammer plus Steinschale und Lupe, leere Schriftrolle plus
  Metall-Fokusnadel.
- 8/8 Finals sind 1086 × 1448 PNG RGBA mit echtem Alpha, vollständig transparentem Außenrand
  und 87,98 % Motivhöhe. Kontaktbögen und Messwerte liegen in
  `CODEX/assets/elf-character-demo-2026-08-26/qa/`.
- Native akzeptierte ImageGen-Ausgaben liegen unter `raw/`; RGB-Fehlversuche wurden verworfen.
  Kein Chroma-Key und kein nachträgliches Freistellen.
- IDs, Identitäten und Produktionsprompt sind unter
  `CODEX/work/2026-08-26-elf-character-demo/` dokumentiert.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert. Konvertierung und
  Einbau bleiben nach Chef-Freigabe bei Claude.

### Codex-Code-Marker

- `codex:2026-08-26T23:28:03+02:00` bis `codex:2026-08-26T23:57:41+02:00` — Brief,
  Identitätsmatrix, Promptprotokoll, Staging-README, QA, HANDOFF und WORKLOG. Die kommentarfreien
  PNGs sowie `qa/qa.json` sind hier mit ihren exakten Staging-Pfaden dokumentiert.

## 2026-08-27 — Elf Character Roster, Pausenstand 24/60

<!-- codex:2026-08-27T00:27:45+02:00 -->

- Chef hat die Elfen-Demo zur vollständigen 60er-Serie freigegeben und stärkere, badassigere
  männliche Varianten gewünscht.
- Vollständige 30er-Identitäts- und Loadoutmatrix liegt unter
  `CODEX/work/2026-08-27-elf-roster/`; Produktionsstand in `STATUS.md`.
- Auf Chef-Wunsch bis morgen pausiert. Aktueller Stand: 24/60 Finals unter
  `CODEX/assets/elf-character-roster-2026-08-27/fertig/`.
- Enthalten sind 12 Paare: Krieger, Paladin, Berserker, Speerwächter, Todesritter, Slayer,
  Waldläufer, Duellant, Schurke, Feuermagier, Juwelier und Verzauberer.
- 24/24 Finals sind 1086 × 1448 PNG RGBA, 87,98 % Motivhöhe und besitzen einen vollständig
  transparenten Außenrand. Raws liegen unter `raw/`, Pausenmesswerte und Kontaktbögen unter `qa/`.
- Weiterarbeit startet bei Frostmagier; danach restliche Magiekämpfer, Runenritter und die
  fehlenden 13 Berufs-Paare. Keine Renderer-Integration.
- Die kommentarfreie Datei `qa/checkpoint-qa.json` ist über diesen Marker und den exakten Pfad
  dokumentiert.

### Codex-Code-Marker

- `codex:2026-08-27T00:05:03+02:00` bis `codex:2026-08-27T00:27:45+02:00` — Vollbrief,
  Roster, Promptset, Staging-README, Pausenstatus, QA, HANDOFF und WORKLOG.

## 2026-08-27 — Elf Character Roster vollständig, 60/60

<!-- codex:2026-08-27T09:36:13+02:00 -->

- Vollständiger Elfen-Roster unter
  `CODEX/assets/elf-character-roster-2026-08-27/fertig/` abgeliefert: 15 Kampfklassen und
  15 Berufe, jeweils männlich und weiblich, insgesamt 60 exakt benannte PNGs.
- Alle Finals sind 1086 × 1448 PNG RGBA. 60/60 Dateien besitzen einen vollständig transparenten
  Außenrand, native weiche Teiltransparenz und 87,98 % gemessene Motivhöhe.
- Kämpfer stehen einsatzbereit nach Bildschirm-rechts; Berufe lesen sich über ruhige
  Arbeitshaltung und klar sichtbare Werkzeuge. Mann und Frau bleiben je Rolle unterschiedliche
  Personen, teilen aber dieselbe Waffen- beziehungsweise Werkzeugfamilie.
- Männliche Varianten sind gemäß Chefentscheid markanter und badassiger, ohne die junge,
  attraktive hochgeborene Elfenlinie zu verlassen.
- Produktion mit eingebautem ImageGen; akzeptierte native RGBA-Ausgaben liegen unter `raw/`.
  Finals wurden nur alphaerhaltend getrimmt, proportional skaliert und zentriert. Kein Keying und
  kein nachträgliches Freistellen.
- Vollständige Messwerte und Kontaktbögen auf dunklem sowie grellrosa Prüfgrund liegen unter
  `CODEX/assets/elf-character-roster-2026-08-27/qa/` (`full-qa.json`, `QA.md`,
  `full-contact-dark.png`, `full-contact-magenta.png`).
- Identitätsmatrix und eingesetztes Promptset liegen unter
  `CODEX/work/2026-08-27-elf-roster/`. Keine Renderer-, Content-, Engine-, Save- oder
  `.claude/**`-Datei verändert; Konvertierung und Integration bleiben bei Claude.
- Chef-Korrektur `codex:2026-08-27T09:52:41+02:00`: `elf_spear_warden_m.png` mit tatsächlich
  getragenem Schild und einhändigem Speer, `elf_shadow_mage_f.png` mit geradem Metallstab sowie
  `elf_berserker_f.png` mit normaler zweihändiger Einblatt-Axt neu gegossen und ersetzt. Alle drei
  erneut als RGBA 1086 × 1448 mit Nullalpha-Außenrand bestanden. Alte Fassungen liegen recoverbar
  unter `qa/replaced-originals/`; fokussierte Kontaktbögen unter `qa/corrections-contact-*.png`.
  Das genaue akzeptierte Promptset liegt in
  `CODEX/work/2026-08-27-elf-roster/CORRECTIONS-2026-08-27.md`.

### Codex-Code-Marker

- `codex:2026-08-27T09:36:13+02:00` bis `codex:2026-08-27T09:52:41+02:00` — Abschlussstatus,
  Chef-Korrekturen, QA, HANDOFF und WORKLOG. Die
  kommentarfreien PNGs und `qa/full-qa.json` sind über die exakten Staging-Pfade oben
  dokumentiert.

## 2026-08-27 — Steam Achievement Icons 67/67

<!-- codex:2026-08-27T11:40:00+02:00 -->

- Vollständiges eingefrorenes Steam-Set aus
  `design/achievements-1.2.0/steam-set.csv` geliefert: 67 Farbfassungen und 67 daraus
  entsättigte Graufassungen, insgesamt 134 deckende JPGs.
- Finals liegen unter
  `CODEX/assets/steam-achievement-icons-2026-08-27/fertig/`; Dateinamen sind exakt
  `<api_name>.jpg` und `<api_name>_gray.jpg`.
- Serienaufbau: 21 Kapitel auf dem offenen Chronikbuch, 20 echte Skill-Meister im
  Bronze-Lorbeer und 26 Einzelmotive auf der gemeinsamen Ashen-Iron-Plakette.
- Alle Finals sind 256 × 256 px. Vollständiger Dateisatz, Deckung und Maße bestanden;
  alle Graufassungen besitzen pixelidentische R-/G-/B-Kanäle und stammen aus derselben
  normalisierten Farbfassung.
- Visuelle Zielgrößenabnahme unter
  `CODEX/assets/steam-achievement-icons-2026-08-27/qa/contact-sheet-color-64.jpg` und
  `contact-sheet-gray-64.jpg`; jedes eingelegte Icon ist exakt 64 × 64 px.
- Produktion mit eingebautem ImageGen. Innerhalb des Sets dienten
  `CH01_THE_FIRST_PAGE`, `MASTER_WOODCUTTING` und `BLOODED` als Bildreferenzanker.
  Tatsächlich eingesetzte Prompts liegen in
  `CODEX/work/2026-08-27-steam-achievement-icons/PROMPTS-FINAL.md`.
- Keine Renderer-, Content-, Save-, i18n-, Steam-Backend- oder `.claude/**`-Datei verändert.

### Codex-Code-Marker

- `codex:2026-08-27T11:36:00+02:00` bis `codex:2026-08-27T11:40:00+02:00` —
  reproduzierbarer Finalisierer, Brief B–D, Staging-README, QA, HANDOFF und WORKLOG.
  Die kommentarfreien JPG-/PNG-Dateien und `qa/qa.json` sind über die exakten Pfade oben
  dokumentiert.

## 2026-08-27 — Ork-Demo blockiert, Tavernen-Szene geliefert

<!-- codex:2026-08-27T12:15:00+02:00 -->

- Für das spielbare Ork-Demo wurden sechs Rollen als männlich/weiblich-Paare konzipiert:
  Krieger, Speerwächter, Schamane, Schmied, Bergarbeiter und Koch. Die zwölf erzeugten
  Motive sind visuell vorhanden, aber **nicht produktionsfreigegeben**.
- Direkte Pixelprüfung aller zwölf Ork-PNGs: RGB ohne Alpha (`channels: 3`,
  `hasAlpha: false`) und gemaltes Schachbrett. Bildreferenzierter Reparaturversuch sowie
  kontrollierter Neuguss ohne Referenz lieferten ebenfalls deckendes RGB. Gemäß Auftrag
  wurde nicht gekeyt und nicht nachträglich freigestellt; `fertig/` bleibt leer.
- Blocker und verworfene Quellen sind unter
  `CODEX/assets/orc-character-demo-2026-08-27/qa/ALPHA-BLOCKER.md` beziehungsweise
  `CODEX/work/2026-08-27-orc-character-demo/generated-source-map.json` dokumentiert.
- Für die Taverne wurde der ausdrücklich deckende Teil fertiggestellt:
  `CODEX/assets/taverne-gaeste-2026-08-27/fertig/tavern_interior.png`, PNG RGB,
  exakt 1672 × 941. Szene enthält drei getrennte Tische, rechten Tresen, linke
  Anschlagtafel, rückwärtigen Kamin, rechte Tür und vier freie Figurenbereiche.
- Gäste-Fußpunkte und Objektanker liegen in `qa/scene-coordinates.json`; die visuelle
  Prüffassung liegt in `qa/tavern_interior-anchors.png`, Erläuterungen in `qa/QA.md`.
- Kein Gesamt-GO für den Tavernenauftrag: 38 Gäste-PNGs und beide transparenten Icons
  bleiben wegen desselben Alpha-Blockers offen. Renderer und `.claude/**` wurden nicht verändert.

### Codex-Code-Marker

- `codex:2026-08-27T12:15:00+02:00` — Alpha-Blocker, Tavernen-Teillieferung,
  Brief B–D, QA, HANDOFF und WORKLOG. Kommentarfreie PNG-/JSON-Artefakte sind über die
  exakten Pfade oben dokumentiert.

## 2026-08-27 — Ork Character Creator Roster vollständig, 60/60

<!-- codex:2026-08-27T17:08:57+02:00 -->

- Vollständiger spielbarer Ork-Roster unter
  `CODEX/assets/orc-character-roster-2026-08-27/fertig/`: 15 Kampfklassen und 15 Berufe,
  jeweils männlich und weiblich, insgesamt 60 exakt benannte PNGs.
- Alle Finals sind 1086 × 1448 PNG RGBA. 60/60 besitzen einen vollständig transparenten
  Außenrand, native weiche Teiltransparenz und 87,43–87,98 % Motivhöhe.
- Männliche und weibliche Figur sind je Rolle eigenständige Personen, verwenden aber dieselbe
  sichtbare Waffen- beziehungsweise Werkzeugfamilie. Alle Figuren orientieren Körper, Gesicht
  und Blick nach Bildschirm-rechts.
- Kritische Waffenlogik visuell gegengeprüft: Speerwächter führen Speer einhändig und Schild am
  anderen Arm; Berserker verwenden normale Einblatt-Zweihandäxte; Rangerbögen haben einen
  durchgehenden Bogenkörper und je eine an beiden Nocken angeschlossene Sehne; starre Stäbe und
  Klingen bleiben gerade.
- Produktion mit eingebautem ImageGen im Standardmodus. Akzeptierte native RGBA-Ausgaben liegen
  unter `raw/`; Finals wurden nur alphaerhaltend getrimmt, proportional skaliert und zentriert.
  Kein Keying und kein nachträgliches Freistellen.
- Vollständige Messwerte und Kontaktbögen auf dunklem sowie grellrosa Grund liegen unter `qa/`.
  Promptmatrix und Quellenzuordnung liegen unter
  `CODEX/work/2026-08-27-orc-character-demo/` in `PROMPTS-FULL.json` und
  `generated-final-map.json`.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert. Konvertierung und
  Integration bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-27T17:08:57+02:00` — Vollbrief, Prompt- und Quellenmatrix,
  Staging-README, QA, HANDOFF und WORKLOG. Die kommentarfreien PNGs sowie
  `qa/full-qa.json` und `generated-final-map.json` sind über die exakten Pfade oben
  dokumentiert.

## 2026-08-27 — Goblin Character Creator, Dreier-Stilprobe

<!-- codex:2026-08-27T17:35:31+02:00 -->

- Drei einzelne spielbare Goblin-Testfiguren unter
  `CODEX/assets/goblin-character-demo-2026-08-27/fertig/`: männlicher Krieger, weibliche
  Waldläuferin und männlicher Waffenschmied.
- Visuelle Linie: erwachsene freie Goblins, etwa 1,50 m, drahtig-kompakt, moos- bis olivgrüne
  Haut, sehr große bewegliche Ohren mit Messingringen und kluge markante Gesichter. Bewusst klar
  kleiner und leichter als Orks, ohne Comic-Minion- oder Kinderwirkung.
- 3/3 Finals sind 1086 × 1448 PNG RGBA mit echtem weichem Alpha, vollständig transparentem
  Außenrand und 87,43–87,57 % Motivhöhe.
- Rangerbogen auf durchgehenden Bogenkörper und eine Sehne an beiden Nocken geprüft; Buckler ist
  tatsächlich getragen, die Waffenschmied-Rohklinge gerade und vollständig.
- Native ImageGen-Raws, technische Messwerte und Kontaktbögen auf dunklem sowie grellrosa Grund
  liegen unter `raw/` und `qa/`. Produktionsprompts liegen unter
  `CODEX/work/2026-08-27-goblin-character-demo/PROMPTS.md`.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert.

### Codex-Code-Marker

- `codex:2026-08-27T17:14:00+02:00` bis `codex:2026-08-27T17:35:31+02:00` — Brief,
  Promptset, Quellenkarte, Staging-README, QA, HANDOFF und WORKLOG. Die kommentarfreien PNGs,
  `qa/qa.json` und `generated-source-map.json` sind über die exakten Pfade oben dokumentiert.

## 2026-08-27 — Goblin Character Creator Roster vollständig, 60/60

<!-- codex:2026-08-27T19:36:00+02:00 -->

- Vollständiger spielbarer Goblin-Roster unter
  `CODEX/assets/goblin-character-roster-2026-08-27/fertig/`: 15 Kampfklassen und 15 Berufe,
  jeweils männlich und weiblich, insgesamt 60 exakt benannte PNGs.
- Alle Finals sind 1086 × 1448 PNG RGBA. 60/60 besitzen einen vollständig transparenten
  Außenrand, native weiche Teiltransparenz und 87,43–87,78 % Motivhöhe.
- Männliche und weibliche Figur sind je Rolle unterschiedliche erwachsene Personen, verwenden
  aber dieselbe sichtbare Waffen- beziehungsweise Werkzeugfamilie. Alle Figuren orientieren
  Körper, Gesicht und Blick nach Bildschirm-rechts.
- Waffenlogik visuell gegengeprüft: Speerwächter führen Speer einhändig und Schild am anderen
  Arm; Berserker verwenden Einblatt-Zweihandäxte; Rangerbögen haben einen durchgehenden
  Bogenkörper und eine an beiden Nocken angeschlossene Sehne; starre Stäbe und Klingen sind gerade.
- Akzeptierte native RGBA-Ausgaben liegen unter `raw/`; Finals wurden ausschließlich
  alphaerhaltend zugeschnitten, proportional skaliert und zentriert. Kein Keying und kein
  nachträgliches Freistellen.
- Vollständige Messwerte und Kontaktbögen auf dunklem sowie grellrosa Grund liegen unter `qa/`.
  Promptmatrix und Quellenzuordnung liegen unter
  `CODEX/work/2026-08-27-goblin-roster/` in `PROMPTS-FULL.json` und
  `generated-source-map.json`.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert. Konvertierung und
  Integration bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-27T17:42:00+02:00` bis `codex:2026-08-27T19:36:00+02:00` — Vollbrief,
  Roster, Prompt- und Quellenmatrix, alphaerhaltender Finalisierer, Staging-README, QA, HANDOFF
  und WORKLOG. Die kommentarfreien PNGs sowie `qa/full-qa.json`,
  `PROMPTS-FULL.json` und `generated-source-map.json` sind über die exakten Pfade oben
  dokumentiert.

## 2026-08-27 — Kampfeffekte Testlauf, 6/6

<!-- codex:2026-08-27T20:27:00+02:00 -->

- Sechs transparente Kampfeffekt-Assets unter
  `CODEX/assets/kampfeffekte-testlauf-2026-08-27/fertig/`: arkanes Geschoss, arkaner
  Einschlag, Feuereinschlag, Schwert-Slash, gedecktes rotes Blut und Begleiter-Biss.
- Geschoss exakt 256 × 128; fünf Streifen exakt 768 × 256 mit drei 256er-Zellen für Beginn,
  Höhepunkt und Ausklang.
- 6/6 PNG RGBA, echtes Alpha, weiche Teiltransparenz und vollständig transparenter Außenrand.
  Raws wurden nicht gekeyt; Finals wurden nur alphaerhaltend skaliert und je Zelle mit einem
  transparenten Sicherheitsrand versehen.
- Dunkler Kontaktbogen und Composite über dem 1536 × 1024 großen Ashfields-Battlescreen zeigen
  alle Effekte bei nativer Zielgröße. Magie bleibt im hellen Himmel, physische Effekte bleiben
  auf dem strukturierten Boden lesbar.
- Alle sechs sind für die bereits freigegebene Welle 1 als Serienanker vorgesehen.
- Keine Renderer- oder `.claude/**`-Datei verändert. WebP-Konvertierung, Einbau und Laufzeitprüfung
  bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-27T20:04:00+02:00` bis `codex:2026-08-27T20:27:00+02:00` — finales
  Promptprotokoll, Quellenkarte, alphaerhaltender Finalisierer, Staging-README, QA, HANDOFF und
  WORKLOG. Kommentarfreie PNGs sowie `qa/qa.json` und `generated-source-map.json` sind über
  die exakten Pfade oben dokumentiert.

## 2026-08-27 — Kampfeffekte Welle 1, 33/33

<!-- codex:2026-08-27T23:02:59+02:00 -->

- Vollständige Welle unter `CODEX/assets/kampfeffekte-welle-1-2026-08-27/fertig/`: sieben
  Magiethemen mit Geschoss und Einschlag, vier Waffen-Slashes, Pfeil plus Einschlag, drei
  gedeckte Trefferstoffe, Block, Fehlschlag, sechs Begleiterangriffe und zwei Crit-Overlays.
- 27 neue native RGBA-Motive erzeugt und die sechs bestandenen Testanker übernommen. Der
  Test-Slash heißt serienkonform `fx_slash_cut.png`; sein Bildinhalt blieb unverändert.
- Acht Geschosse exakt 256 × 128 und 25 Dreiphasen-Streifen exakt 768 × 256. 33/33 bestehen
  PNG/RGBA, echtes Alpha, weiche Teiltransparenz, transparente Außenkante und Zellbelegung;
  jede der 75 Streifenzellen enthält sichtbaren Inhalt.
- Kein Keying und kein nachträgliches Freistellen. Neue Finals wurden nur alphaerhaltend
  skaliert, in drei Zellen geteilt und mit transparentem Sicherheitsrand versehen.
- Kontaktbögen auf dunklem Grund und über Ashfields visuell bestanden. Magiethemen, Bewegungen,
  Rechtsrichtung, gedecktes Blut, Begleiterfamilien und Crit-Ringe bleiben bei Zielgröße lesbar.
- Vollständige Messwerte: `CODEX/assets/kampfeffekte-welle-1-2026-08-27/qa/qa.json`.
  Produktionsprotokoll: `CODEX/work/2026-08-27-kampfeffekte-welle-1/`.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert. WebP-
  Konvertierung, Einbau, Gegner-Spiegelung und Runtime-Abnahme bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-27T22:57:50+02:00` bis `codex:2026-08-27T23:02:59+02:00` — Promptprotokoll,
  Quellenkarte, alphaerhaltender Finalisierer, Brief B–D, Staging-README, QA, HANDOFF und
  WORKLOG. Die kommentarfreien PNGs sowie `qa/qa.json` und `generated-source-map.json` sind
  über die exakten Pfade oben dokumentiert.

## 2026-08-27 — Fasern, Stoff und Jagen, 26/26

<!-- codex:2026-08-27T23:41:00+02:00 -->

- Vollständige Lieferung unter `CODEX/assets/fasern-jagen-2026-08-27/fertig/`: 19 Item-Icons,
  fünf Foraging-Karten, eine Köder-graben-Aktionskarte und ein Jagen-Sidebar-Icon.
- 20 Freisteller besitzen natives RGBA-Alpha, weiche Teiltransparenz und einen vollständig
  transparenten Außenrand. Kein Keying und kein nachträgliches Freistellen.
- Items exakt 640 × 640, Foraging-Karten exakt 1672 × 941 deckend, Aktionskarte exakt
  1254 × 1254 deckend, Sidebar-Plakette exakt 1254 × 1254 RGBA.
- Fasern, Saaten und Stoffe bilden dieselbe fünfstufige Farbleiter. Die drei Fallenbilder sind
  als leer, gestellt und zugeschnappt lesbar; sie stammen aus einem gemeinsamen nativen
  RGBA-Guss und teilen dasselbe Chassis, Seil, Perspektive und Licht. Kein Blut oder Tierkörper.
- Akzeptierte Raws, Messwerte, Quellenkarte und Kontaktbögen liegen neben den Finals in `raw/`
  und `qa/`. Produktionsweg und Promptzusätze stehen in
  `CODEX/work/2026-08-27-fasern-jagen-assets/PRODUCTION.md`.
- Keine Renderer-, Content-, Engine-, Save- oder `.claude/**`-Datei verändert. Konvertierung,
  Einbau und Runtime-Abnahme bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-27T23:36:00+02:00` bis `codex:2026-08-27T23:41:00+02:00` —
  alphaerhaltender Finalisierer, Brief B–D, Produktionsnotiz, Staging-README, QA, HANDOFF und
  WORKLOG. Die kommentarfreien PNGs sowie `qa/qa.json` und `qa/source-map.json` sind über die
  exakten Pfade oben dokumentiert.

## 2026-08-28 — Korrektur Fasern/Jagen, 2 ersetzt und 1 gestrichen

<!-- codex:2026-08-28T00:47:00+02:00 -->

- `CODEX/assets/fasern-jagen-2026-08-27/fertig/sidebaricon_hunting.png` neu: freistehende
  Eisenschlinge mit Seilrolle, 1254 × 1254 PNG RGBA, ohne Plakette, Rahmen oder Hintergrund.
- `CODEX/assets/fasern-jagen-2026-08-27/fertig/bait_worm.png` neu: kleines verschnürtes Bündel
  aus drei dunklen Regenwürmern, 640 × 640 PNG RGBA, ohne Eimer, Topf oder Boden.
- Beide Finals besitzen natives Alpha, weiche Teiltransparenz, `alpha_extrema = 0–255` und
  `edge_alpha_max = 0`; es wurde weder gekeyt noch nachträglich freigestellt.
- `dig_bait.png` wurde gemäß Chef-/Claude-Korrektur ersatzlos aus der aktiven Lieferung genommen.
  Die frühere Szene bleibt nachvollziehbar unter
  `CODEX/assets/fasern-jagen-2026-08-27/qa/rejected-dig-bait-scene/` archiviert.
- Bestandssichtprüfung: Jagd-Icon neben `sidebaricon_fishing.webp` und
  `sidebaricon_farming.webp`; Köder neben `spider_silk.webp` und `ashroot.webp`. Die beiden
  Kontaktbögen enthalten zusätzlich eine 48-px-Darstellung.
- Aktive Lieferung jetzt 25 Dateien. Die alten Plaketten- und Eimerfassungen liegen recoverable
  unter `qa/replaced-2026-08-28/`. Renderer, Content und `.claude/**` blieben unangetastet.

### Codex-Code-Marker

- `codex:2026-08-28T00:33:00+02:00` bis `codex:2026-08-28T00:47:00+02:00` —
  Korrektur-Finalisierer, kanonischer Serien-Finalisierer, Messwerte, Kontaktbögen,
  Staging-README, QA, Brief, Produktionsnotiz, HANDOFF und WORKLOG. Kommentarfreie PNGs sowie
  `qa/qa.json`, `qa/source-map.json` und `qa/correction-2026-08-28.json` sind über die exakten
  Pfade dieses Eintrags dokumentiert.

## 2026-08-28 — Meisterring Jagen, Prompt 27

<!-- codex:2026-08-28T01:22:00+02:00 -->

- Neues Final: `CODEX/assets/fasern-jagen-2026-08-27/fertig/ring_master_hunting.png`, exakt
  640 × 640 PNG RGBA. Akzeptiertes natives Raw liegt unter dem gleichen Namen in `raw/`.
- Motiv: massiver dunkelpatinierter Eisenring mit Schlingen-Kabelstruktur, kleinem gefasstem
  Amber und einzelnem Fang. Amber-Highlight bleibt vollständig im Stein; keine Aura, Partikel,
  Bodenfläche, Schlagschatten, Plakette oder Rahmen.
- Technik: Alphaextrema 0–255, `edge_alpha_max = 0`, 155.904 Teiltransparenzpixel,
  sichtbare Motivfläche 76,09 % Breite × 84,22 % Höhe. Kein Keying und kein nachträgliches
  Freistellen.
- Stilabgleich und QA: `qa/contact-master-ring.png` zeigt den neuen Ring neben
  `ring_master_fishing.webp` und `ring_master_foraging.webp`, jeweils zusätzlich bei 48 px;
  `qa/contact-master-ring-alpha-magenta.png` ist der Alphakanten-Test.
- Zwei vorausgehende RGB-Ausgaben mit gemaltem Schachbrett wurden erkannt und verworfen. Nur der
  dritte, nativ transparente Wurf wurde in die Lieferung übernommen.
- Aktiver Lieferumfang damit 26 Dateien. Renderer, Content und `.claude/**` blieben unangetastet;
  Konvertierung und Einbau bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-28T01:14:00+02:00` bis `codex:2026-08-28T01:22:00+02:00` — Ring-Finalisierer,
  kanonischer Serien-Finalisierer, QA-Berichte, Staging-README, Brief, Produktionsnotiz, HANDOFF
  und WORKLOG. Die kommentarfreie PNG sowie aktualisierte JSON-Berichte sind über die exakten
  Pfade dieses Eintrags dokumentiert.

## 2026-08-28 — Designmockup Jagen-Skillseite

<!-- codex:2026-08-28T18:02:00+02:00 -->

- Hochauflösendes reines Bildmockup unter
  `CODEX/work/2026-08-28-hunting-skill-mockup/hunting-skill-mockup.png`, deckend 1672 × 941 px.
- Empfehlung „Jagdtafel“: Kopfzeile für Skill/XP/Köder, links sechs Fallenplätze als 2×3-Raster,
  rechts dauerhaft sichtbares Jagdbuch. Damit bleiben Steuerung und Nachschlagewissen ohne
  Scrollwechsel gemeinsam sichtbar.
- Mockup enthält aktive, gefangene, leere und gesperrte Fallen, Auto-Erneuern, Fangchance,
  Zeitbalken, letzten Fang, Drops sowie korrekte Ashfields-Beispiele aus dem Konzept.
- ImageGen-Grundentwurf wurde in zwei gezielten Durchgängen auf korrekten Aktivzähler,
  zulässige Beutetiere, automatische Loot-Vergabe und sichtbaren `AUTO`-Schalter korrigiert.
- Designbegründung und mögliche spätere Layoutabbildung stehen in `DESIGN.md`; vollständiger
  finaler Prompt und Referenzpfade in `PROMPT.md`. Kein HTML und keine Renderer-Datei verändert.

### Codex-Code-Marker

- `codex:2026-08-28T18:02:00+02:00` — Designnotiz, Promptprotokoll, HANDOFF und WORKLOG.
  Das kommentarfreie PNG ist über den exakten Pfad dieses Eintrags dokumentiert.

## 2026-08-28 — Asset-Fehler-Audit: Items, Monster und Companions

<!-- codex:2026-08-28T19:25:00+02:00 -->

- Read-only Vollprüfung von 1.357/1.357 Renderer-Bildern: 1.208 Items, 128 Monster und
  21 Companions. Ergebnis und vollständige Dateilisten liegen unter
  `CODEX/work/2026-08-28-asset-fehler-audit/REPORT.md` und `qa/`.
- 89 bestätigte Austauschdateien: 65 Items, 24 Monster, 0 Companions. Darunter 66 Dateien
  mit einer dominanten farbigen Chroma-/Matte-Ebene unter dem Alpha, außerdem 20 am Canvas
  abgeschnittene Schmuckmotive, zwei gemalte Bodenreste und ein blockiger Atemeffekt.
- 16 zusätzliche Weißsaum-Kandidaten mit Rauch, Eis, Geisterstoff oder hellen Effektkanten
  separat vorgemerkt. Sie wurden bewusst nicht blind als Fehler klassifiziert, weil bei einigen
  Motiven gewolltes Leuchten möglich ist; die Belegbögen zeigen sie auf dunklem Spielgrund.
- Die Prüfung ging über Randpixel hinaus: RGB unter vollständig transparenten Pixeln,
  Teiltransparenz bis 28 px in die Silhouette, Skalierungsrisiken an Fell/Federn/Rauch/Stoff,
  Komposition auf mehreren Hintergründen, Bodenreste, Maskenblöcke, Clipping und Auflösung.
- `qa/asset-audit-results.csv` enthält einen Status für alle 1.357 Dateien;
  `qa/confirmed-defects.csv`, `qa/white-matte-watchlist.csv` und
  `qa/legacy-low-resolution.csv` sind die Arbeitslisten. Fokussierte visuelle Belege stehen in
  `qa/final-contacts/`, vollständige Kontaktbögen in `qa/contacts/`.
- Keine Produktions-, Renderer- oder `.claude/**`-Datei wurde durch diesen Audit verändert.

### Codex-Code-Marker

- `codex:2026-08-28T18:19:00+02:00` bis `codex:2026-08-28T19:25:00+02:00` — vier
  reproduzierbare, read-only Analyse-/Kontaktbogen-Skripte sowie Bericht, CSV-Ausgaben,
  HANDOFF und WORKLOG. Die kommentarfreien PNG-Kontaktbögen und CSV-/JSON-Berichte sind über
  die exakten Pfade dieses Eintrags dokumentiert.

## 2026-08-28 — Köder/Feuer: technischer Alpha-Stopp

<!-- codex:2026-08-28T19:16:25+02:00 -->

- Beide neuen Briefs und alle vorgeschriebenen Bestandsreferenzen wurden vollständig geprüft.
- Der eingebaute ImageGen-Weg lieferte für `bait_maggot` in zwei Neuwürfen und einer
  Hintergrundextraktion jeweils ein deckendes RGB-PNG ohne Alphakanal und mit gemaltem
  Schachbrett. Kein Ergebnis wurde als Final übernommen.
- Gemäß der verbindlichen Alpha-Regel wurde vor Köder 2–4 und vor der Feuer-Welle gestoppt.
  `CODEX/assets/koeder-stufen-2026-08-28/fertig/` ist leer; die erste verworfene Probe liegt
  nur unter `qa/rejected-no-alpha/`. Es wurde nicht gekeyt oder nachträglich freigestellt.
- Details stehen in `CODEX/work/2026-08-28-koeder-stufen/PRODUCTION.md`. Renderer, Content und
  `.claude/**` blieben unangetastet.

### Codex-Code-Marker

- `codex:2026-08-28T19:16:25+02:00` — Produktionsnotiz, HANDOFF und WORKLOG. Die
  kommentarfreie verworfene PNG-Probe ist über den exakten QA-Pfad dieses Eintrags dokumentiert.

## 2026-08-28 — Köder-Stufen und Feuer-Welle 2 abgeschlossen

<!-- codex:2026-08-28T20:01:41+02:00 -->

- Der vorangehende Alpha-Stopp ist auf direkte Chef-Anweisung durch einen referenzfreien
  ImageGen-Neuwurf aufgelöst worden; dieser lieferte wieder natives RGBA. Keine unzulässige
  RGB-Probe wurde übernommen.
- Köder vollständig unter `CODEX/assets/koeder-stufen-2026-08-28/fertig/`: vier exakte IDs,
  640 × 640 PNG RGBA, Alphaextrema 0–255, transparenter Außenrand, weiche Kanten. Die Reihe
  liest sich von Maden über Krebs und Tintenfisch bis zum schwach leuchtenden Glühköder.
- Feuer vollständig unter `CODEX/assets/kampfeffekte-feuer-2026-08-28/fertig/`: vier
  Fünf-Frame-Geschosse à 1280 × 128 und drei Drei-Frame-Einschläge à 768 × 256. Alle 29 Zellen
  enthalten sichtbaren Inhalt, Außenränder sind transparent, Geschosse fliegen nach rechts.
- Für jeden Feuerstreifen wurde genau ein natives RGBA-Basisbild erzeugt und daraus der ganze
  Film deterministisch abgeleitet. Dadurch bleiben Kern, Silhouette und Lichtquelle stabil;
  es gibt kein Neuwürfeln je Frame.
- QA Köder: dunkler und grellrosa Kontaktbogen neben `bait_worm`, jeweils mit 48-px-Ansicht.
  QA Feuer: Zeilenkontaktbögen, Magenta-Test, Welle-1-Familienvergleich, Ashfields-Vorschau und
  sieben animierte GIFs. Vollständige Messwerte stehen jeweils in `qa/qa.json`.
- Promptsets, Quellenkarten, Produktionspläne und Staging-READMEs sind vollständig. Renderer,
  Content, Engine und `.claude/**` blieben unangetastet; Einbau bleibt bei Claude.

### Codex-Code-Marker

- `codex:2026-08-28T19:28:00+02:00` bis `codex:2026-08-28T20:01:41+02:00` —
  alphaerhaltender Köder-Finalisierer, deterministischer Feuerstreifen-Finalisierer, Promptsets,
  Quellenkarten, Briefs B–D, Staging-READMEs, HANDOFF und WORKLOG. Kommentarfreie PNGs, GIFs
  und JSON-Berichte sind über die exakten Pfade dieses Eintrags dokumentiert.

## 2026-08-28 — Skill-Set Schneidern abgeschlossen

<!-- codex:2026-08-28T20:55:00+02:00 -->

- P1-Auftrag vollständig unter `CODEX/assets/schneidern-2026-08-28/fertig/`: Sidebar-Icon,
  Skill-Kulisse, Skill-Karte, Meisterring sowie farbiges und graues Steam-Erfolgsbild.
- Alle sechs Namen und Maße entsprechen dem Brief. Icon/Ring sind RGBA mit echtem Alpha und
  transparentem Außenrand; Kulisse/Karte und beide JPGs sind deckend.
- `tailoring.card.png` wurde aus derselben Werkstattszene abgeleitet, die Graufassung aus exakt
  dem farbigen Steam-Motiv. Kein Chroma-Keying und keine RGB-basierte Freistellung.
- Fünf Kontaktbögen vergleichen die Lieferung mit Leatherworking, Hunting, Fishing, Smithing
  und dem bestehenden Steam-Set. Messwerte stehen in `qa/qa-report.json`.
- Renderer, Content, Engine und `.claude/**` blieben unangetastet. Einbau und WebP-Konvertierung
  bleiben bei Claude.
- Der zuvor laufende Monster-Neuguss wurde auf CEO-/Claude-P1-Anweisung am gesicherten
  Rohstand pausiert und nicht weiter abgenommen.

### Codex-Code-Marker

- `codex:2026-08-28T20:49:06+02:00` bis `codex:2026-08-28T20:55:00+02:00` —
  reproduzierbarer Finalisierer, Brief B–D, Staging-/QA-Dokumentation, HANDOFF und WORKLOG.
  Kommentarfreie Bild- und JSON-Dateien sind über die exakten Pfade dieses Eintrags dokumentiert.

## 2026-08-28 — Monster-Neuguss abgeschlossen

<!-- codex:2026-08-28T22:13:12+02:00 -->

- Den nach Schneidern pausierten Monsterauftrag auf direkte Chef-Anweisung fortgesetzt und
  38 bestätigte bzw. visuell auffällige Altmonster vollständig neu geliefert.
- Finals unter `CODEX/assets/monster-neuguss-2026-08-28/fertig/`: 38 exakt benannte
  1254 × 1254 PNGs, RGBA, Alphaextrema 0–255, Außenrand Alpha 0 und bereinigtes RGB unter
  vollständig transparenten Pixeln.
- Alle Monster sind als einzelne Ganzkörperfigur kampfbereit rechts positioniert und nach
  links orientiert. Jede Renderer-Altdatei wurde vor bzw. nach der Erzeugung als Identitätsanker
  gegen Palette, Anatomie, Ausrüstung und Silhouette geprüft.
- Die erste Alt/Neu-Abnahme löste sechs gezielte Identitäts-Neugüsse aus: schwarze Hexe,
  Küstenkrabbe, Küstenertrunkener, Schlacken-Hexer, Irrlicht und Leeren-Titan.
- QA unter `CODEX/assets/monster-neuguss-2026-08-28/qa/`: JSON-Messbericht, zwei dunkle,
  zwei grellrosa und sieben Alt/Neu-Kontaktbögen. Keine technischen Neon-Key-Flächen oder
  weißen Matten in den abgenommenen Finals sichtbar.
- Vier Korrekturen besitzen natives Alpha; die übrigen Motive wurden über eine vom Chef zuvor
  freigegebene technische Grün-Zwischenstufe mit engem Farbkern, Kantenkorrektur und Despill
  finalisiert. Verworfenes Identitätsmaterial bleibt separat erhalten und ist nicht zur
  Integration bestimmt.
- Renderer, Content, Engine und `.claude/**` blieben unangetastet. Integration und WebP-
  Konvertierung bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-28T21:20:54+02:00` bis `codex:2026-08-28T22:13:12+02:00` —
  reproduzierbarer Monster-Finalisierer, Kanten-/Innenraumkorrektur, native Overrides,
  Brief, Staging-/QA-Dokumentation, HANDOFF und WORKLOG. Kommentarfreie PNGs, JPGs und der
  JSON-Bericht sind über die exakten Pfade dieses Eintrags dokumentiert.

## 2026-08-28 — Esthar, Ossric und Skill-Pets abgeschlossen

<!-- codex:2026-08-28T22:51:20+02:00 -->

- Vier P1-Finals unter `CODEX/assets/esthar-und-pets-2026-08-28/fertig/`: `booted_tomcat.png`,
  `esthar.png`, `elite_ossric.png`, `silkweaver.png`.
- Alle vier exakt 1254 × 1254 PNG RGBA, Alphaextrema 0–255, vollständig transparenter
  Außenrand, weiche Teiltransparenz und bereinigtes RGB unter Alpha 0.
- Der Gestiefelte Kater hält Gesicht, Stirnstreifen, Augenfarbe, rosa Nase und ernsten Ausdruck
  der Spieler-Katze; vollständige Armbrust, Schlinge, Fallenteile, Stiefel und Schwanz sind
  innerhalb des Sicherheitsrands sichtbar.
- Esthar bildet eine funktionsfähige Rippen-Doppelklinge in der Bestandsdiagonale; Legendärgrad
  kommt aus Silhouette und Knochen-/Markmaterial, ohne Glühen, Aura, Partikel oder Nebel.
- Seidenweber ist eine bleiche Nachtmotte mit sechs dünnen Beinen, vier Stoffbahnflügeln,
  nadelartigen Fühlern und gespanntem Silberfaden; nur der Faden trägt einen schwachen Schimmer.
- Ossric ist eng an `gravecliff_specter` gebunden, mit Knochenpanzer, rostroten Markfugen und
  bleichen Augen; Kampfrichtung links, kein Frost. Elite-Serienabgleich erfolgte exakt gegen
  `elite_ash_vulture` und `elite_high_roc`.
- Vier Kontaktbögen zeigen jeweils die vorgeschriebenen Bestandsnachbarn sowie das Final auf
  dunklem und grellrosa Grund. Messwerte: `qa/qa-report.json`; Promptprotokoll:
  `CODEX/work/2026-08-28-esthar-und-skill-pets/PROMPTS-MIRA.md`.
- Built-in ImageGen; kein CLI-Weg und kein Chroma-Keying. Renderer, Content, Engine und
  `.claude/**` blieben unangetastet. WebP-q92-Konvertierung und Integration bleiben bei Claude.

### Codex-Code-Marker

- `codex:2026-08-28T22:17:31+02:00` bis `codex:2026-08-28T22:51:20+02:00` — Brief B–D,
  Quellen-/Promptprotokoll, alphaerhaltender Finalisierer, Staging-/QA-Dokumentation, HANDOFF
  und WORKLOG. Kommentarfreie PNGs, JPGs und `qa/qa-report.json` sind über die exakten Pfade
  dieses Eintrags dokumentiert.

## 2026-08-28 — Kater-Korrektur: stilisiert und nach rechts

<!-- codex:2026-08-28T22:59:45+02:00 -->

- `CODEX/assets/esthar-und-pets-2026-08-28/fertig/booted_tomcat.png` auf direkte Chef-
  Korrektur vollständig ersetzt: sichtbar stilisierte Malweise, vereinfachte Fellgruppen,
  ausdrucksstärkeres Gesicht und verschmitzte gespannte Kampfhaltung.
- Richtungsüberschreibung: Figur steht links und zielt mit der vollständigen Armbrust nach
  rechts. Fotoidentität bleibt über M-/Stirnstreifen, gelbgrüne Augen, rosa Nase und
  silbergraues Fell erhalten.
- Neues Final weiterhin 1254 × 1254 PNG RGBA, Alphaextrema 0–255, Außenrand Alpha 0,
  Teiltransparenz an Fell/Whiskern/Sehne und kein sichtbarer Saum auf Magenta.
- Die erste realistische Fassung ist recoverable unter
  `CODEX/assets/esthar-und-pets-2026-08-28/qa/replaced-realistic-cat/`, aber ausdrücklich nicht
  zu integrieren. Kontaktbogen, QA-Bericht und Promptprotokoll zeigen bereits die Neufassung.
- Im Renderer liegt durch Claudes parallelen Einbau bereits `assets/pets/booted_tomcat.webp`;
  Codex hat diese Datei nicht verändert. Claude muss ausschließlich diesen Kater aus dem neuen
  Staging-Final erneut als WebP q92 übernehmen. Die anderen drei integrierten Assets bleiben
  unverändert.

### Codex-Code-Marker

- `codex:2026-08-28T22:59:45+02:00` — Chef-Korrektur in Brief, Promptprotokoll, Staging-/
  QA-Dokumentation, HANDOFF und WORKLOG. Die neue kommentarfreie PNG, der aktualisierte
  Kontaktbogen und `qa/qa-report.json` sind über die exakten Pfade dieses Eintrags dokumentiert.

## 2026-08-28 — Kater-Korrektur 2: gritty Dark Fantasy

<!-- codex:2026-08-28T23:05:36+02:00 -->

- Das um 22:59 gelieferte Kater-Final war dem Chef zu cartoonig und wurde erneut vollständig
  ersetzt. Verbindlich ist ausschließlich
  `CODEX/assets/esthar-und-pets-2026-08-28/fertig/booted_tomcat.png` mit erwachsenen schlanken
  Proportionen, rauer Malweise, tieferen Schatten und abgetragener dunkler Jägerausrüstung.
- Der Kater steht weiterhin links, bewegt sich in verschmitzt-gespannter Kampfhaltung nach
  rechts und zielt mit der Armbrust eindeutig zum rechten Bildrand.
- Final: 1254 × 1254 PNG RGBA, Alphaextrema 0–255, Außenrand Alpha 0, natives Alpha und kein
  Schachbrett/Farbsaum. Kontaktbogen und `qa/qa-report.json` sind aktualisiert.
- Die cartoonige Ausschussfassung liegt recoverable unter
  `CODEX/assets/esthar-und-pets-2026-08-28/qa/replaced-cartoony-cat/` und darf ebenso wenig
  integriert werden wie die ältere realistische Fassung.
- Renderer weiterhin unangetastet. Claude muss das bereits integrierte
  `assets/pets/booted_tomcat.webp` erneut ausschließlich aus dem aktuellen Final ersetzen;
  Esthar, Seidenweber und Ossric bleiben unverändert.

## 2026-08-28 — Kater-Korrektur 3: Bärenfalle statt Armbrust

<!-- codex:2026-08-28T23:10:28+02:00 -->

- Verbindliches Final erneut ersetzt:
  `CODEX/assets/esthar-und-pets-2026-08-28/fertig/booted_tomcat.png`.
- Keine Armbrust und keine Schuhe mehr. Der Jagd-Begleiter schleudert eine offene funktionale
  Bärenfalle an einer klar verbundenen, gespannten Eisenkette nach rechts; beide natürlichen
  Katzenpfoten sind sichtbar.
- Grimmdüstere Malweise, Fotoidentität und Links-nach-rechts-Kampfhaltung bleiben erhalten.
  Final weiterhin 1254 × 1254 RGBA mit nativem Alpha, transparentem Außenrand und sauberem
  Magenta-Test; Kontaktbogen und Messbericht wurden neu erzeugt.
- Die vorherige gritty Armbrustfassung liegt nur noch unter
  `CODEX/assets/esthar-und-pets-2026-08-28/qa/replaced-crossbow-cat/` und darf nicht integriert
  werden. Claude ersetzt ausschließlich das bestehende `booted_tomcat.webp` aus dem aktuellen
  Final; Renderer wurde von Codex nicht verändert.

## 2026-08-28 — Status-Icon Entzug abgeschlossen

<!-- codex:2026-08-28T23:30:33+02:00 -->

- Neues P2-Final:
  `CODEX/assets/status-icon-entzug-2026-08-28/fertig/icon_status_void.png`, exakt 1254 × 1254
  PNG RGBA mit nativem Alpha, Alphaextrema 0–255 und vollständig transparentem Außenrand.
- Motiv: dunkle geschlechtslose Kraftsilhouette mit schwarzem Brustsog; breite purpurschwarze
  Bahnen laufen sichtbar nach innen, blasser Purpursaum bleibt der einzige Akzent.
- Serienabgleich gegen `icon_status_burn/frost/shock/poison/bleed.webp`; Leere-Palette gegen
  `fx/fx_impact_void.webp`. Der Sechser-Kontaktbogen liegt unter
  `qa/contact-status-icons-six.png`, Alpha-/64-px-Test unter `qa/contact-alpha-and-64.png`.
- Kein Rahmen, Text, Außenleuchten, Chroma-Key oder nachträgliches Freistellen. Vollständige
  Messwerte: `qa/qa-report.json`.
- Renderer und Monster-Neuguss blieben unangetastet. Claude übernimmt WebP und Auto-Discovery-
  Integration über den exakten Dateinamen.

### Codex-Code-Marker

- `codex:2026-08-28T23:27:20+02:00` bis `codex:2026-08-28T23:30:33+02:00` — Brief B–D,
  Promptprotokoll, alphaerhaltender Finalisierer, Staging-/QA-Dokumentation, HANDOFF und WORKLOG.
  Kommentarfreie PNGs und `qa/qa-report.json` sind über die exakten Pfade dokumentiert.

## 2026-08-28 — Trübgewebe-Fünfer-Set abgeschlossen

<!-- codex:2026-08-28T23:48:44+02:00 -->

- Fünf neue P1-Finals unter `CODEX/assets/truebgewebe-set-2026-08-28/fertig/`:
  `dimweave_hood.png`, `dimweave_robe.png`, `dimweave_leggings.png`, `dimweave_wraps.png` und
  `dimweave_sandals.png`.
- Alle exakt 1254 × 1254 PNG RGBA, Alphaextrema 0–255, Außenrand Alpha 0, natives Alpha und
  bereinigtes RGB unter vollständig transparenten Pixeln.
- Setkern: grobes dämmergraues Nesselgewebe mit zurückhaltendem Abendblau, ausgefranste Säume,
  Reparaturnähte, stumpfe Lederkordeln, Holzknebel und je Teil eine dunkelblaue eingenähte
  Zwielicht-Rune ohne Lichtwirkung.
- Größen, Slotperspektiven, Licht von oben links und Malgrad gegen das komplette Lehrlings-Set
  geprüft; Frost-Roben nur als höhere Verarbeitungsgrenze. Alte `dimweave_*.webp` wurden nicht
  als Bildvorlage verwendet und nicht verändert.
- QA: `qa/contact-dimweave-vs-apprentice.png`, `qa/contact-alpha-dark-magenta.png`,
  `qa/contact-64px.png` und `qa/qa-report.json`. Promptset liegt unter
  `CODEX/work/2026-08-28-truebgewebe-set/PROMPTS-MIRA.md`.
- Renderer, Content und `.claude/**` unangetastet. Claude übernimmt WebP q92, Austausch der
  drei Altbilder und Integration der zwei neuen IDs.

### Codex-Code-Marker

- `codex:2026-08-28T23:41:03+02:00` bis `codex:2026-08-28T23:48:44+02:00` — Brief B–D,
  Promptprotokoll, Serien-Finalisierer, Staging-/QA-Dokumentation, HANDOFF und WORKLOG.
  Kommentarfreie PNGs und `qa/qa-report.json` sind über die exakten Pfade dokumentiert.

## 2026-08-28 — Trübgewebe-Robe ohne Kapuze korrigiert

<!-- codex:2026-08-28T23:56:07+02:00 -->

- `CODEX/assets/truebgewebe-set-2026-08-28/fertig/dimweave_robe.png` auf direkte Chef-
  Korrektur vollständig ersetzt. Die verbindliche Robe besitzt nun einen offenen flachen
  V-Ausschnitt und keinen Hood-, Gugel- oder Kopfslot-Anteil.
- Material, Abendblau-Palette, weite Ärmel, ausgefranster Lagenrock, Kordel/Holzknebel und
  unbeleuchtete Brust-Rune bleiben in der Serie unverändert.
- Neues Final: 1254 × 1254 PNG RGBA, natives Alpha, Alphaextrema 0–255, Außenrand Alpha 0 und
  RGB unter vollständig transparentem Alpha 0. Sämtliche Kontaktbögen und Messwerte aktualisiert.
- Die verworfene Kapuzenrobe liegt nur unter `qa/replaced-hooded-robe/`; Claude verwendet
  ausschließlich das aktuelle Final. Renderer und die anderen vier Set-Teile blieben
  unangetastet.

## 2026-08-29 — Steam-Store-Copy V2 auf aktuellen Umfang gebracht

<!-- codex:2026-08-29T00:30:06+02:00 -->

- Einfügungsfertige Kurz- und Langbeschreibungen in sieben Store-Sprachen liegen unter
  `CODEX/work/2026-08-29-steam-store-copy/STORE-COPY-V2-ALL-LANGUAGES.txt`.
- Die neue Copy erklärt erstmals den aktuellen Kern vollständig: 22 Fertigkeiten einschließlich
  Jagen und Schneidern, 23 Begleiter, drei Kampfstile und Item-Builds, Welt-/Champion-System,
  Charakterwahl, New Haven sowie Warteschlangen- und Offline-Komfort.
- Verwendete Ist-Zahlen und Release-Abgrenzung stehen in
  `CODEX/work/2026-08-29-steam-store-copy/CURRENT-FACTS.md`. Die vorbereitete, aber aktuell über
  `TAVERN_ENABLED = false` deaktivierte Taverne wurde bewusst nicht als Store-Versprechen genannt.
- Alle sieben Kurzbeschreibungen liegen unter 300 Zeichen. Veraltete Early-Access-Aussagen und
  die alten Angaben 20 Fertigkeiten/28 Champions wurden entfernt.
- Drei bestehende Store-Panels sind für diese Copy nicht mehr freigegeben:
  `panel_numbers.png`, `panel_worldfightsback.png` und `panel_skills.png`. Nur
  `panel_promise.png` ist inhaltlich noch aktuell. Steam selbst wurde nicht verändert.

## 2026-08-29 — Sieben neue Steam-Store-Panels im Ashen-Iron-Stil

<!-- codex:2026-08-29T00:51:52+02:00 -->

- Universelles textloses Set: `CODEX/assets/steam-store-elements-2026-08-29/fertig/`.
- Optionale englische Fassung: `CODEX/assets/steam-store-elements-2026-08-29/english-text/`.
- Sieben Motive erzählen Welt, Fertigkeiten, Builds, Begleiter, spielbare Völker, New Haven und
  das faire Spieltempo. Alle sind 1170 × 570, deckend und visuell im neuen Hauptmenü-Stil.
- Das universelle Set ist mit 6,17 MiB für die sieben lokalisierten Store-Seiten empfohlen; die
  Überschriften bleiben dadurch übersetzbarer Rich Text statt eingebrannter Bildtext.
- Kontaktbögen: `qa/contact-sheet-universal.jpg` und `qa/contact-sheet-english.jpg`; Messwerte,
  Alt-Texte und Einbaupositionen stehen in `qa/QA-REPORT.md` und Paket-`HANDOFF.md`.
- Ein Logo-Freistellversuch des eingebauten ImageGen-Werkzeugs erzeugte nur ein gemaltes
  Schachbrett ohne Alpha. Er wurde verworfen, nicht gekeyt und ist in keinem Final enthalten.
- Alte Store-Panels, Steamworks, Renderer, Content und `.claude/**` blieben unangetastet.

## 2026-08-29 — Store-Panel-Arbeit an Claude zurückgegeben

<!-- codex:2026-08-29T01:06:33+02:00 -->

- Direkte Chef-Korrektur: Die szenischen Banner unter
  `CODEX/assets/steam-store-elements-2026-08-29/` entsprachen nicht den gemeinten grafischen
  Infotafeln und sind zurückgezogen.
- Der anschließende Infografik-Entwurf unter
  `CODEX/assets/steam-description-infographics-2026-08-29/` wurde wegen des Panel-/Frame-Aufbaus
  ebenfalls abgelehnt. Gewünscht ist der Steel Frame mit vollständig freiem Außenraum.
- Beide Ordner tragen `DO-NOT-USE.md`. Nichts davon in Steamworks übernehmen. Claude erstellt
  die Panels auf direkte Chef-Anweisung neu.

## 2026-08-29 — Steam-Erfolg MASTER_HUNTING fertig

<!-- codex:2026-08-29T01:06:33+02:00 -->

- Finals: `CODEX/assets/steam-master-hunting-2026-08-29/fertig/MASTER_HUNTING.jpg` und
  `MASTER_HUNTING_gray.jpg`.
- Beide exakt 256 × 256, deckendes RGB JPEG, korrekt benannt. Gray wurde direkt aus dem
  akzeptierten Farbfinal abgeleitet.
- Motiv: plausible Eisenschlinge im goldenen Meisterrahmen und Lorbeerkranz, Ködertopf dahinter,
  gebundenes Wurmbündel im Vordergrund; kein Text, Glow, Blut oder Gore.
- Serienvergleich mit MASTER_LEATHERWORKING und MASTER_TAILORING:
  `qa/contact-master-hunting.jpg`; zusätzlicher echter 64-px-Test:
  `qa/contact-master-hunting-64px.png`; Messwerte und SHA-256 in `qa/qa-report.json`.
- Renderer, Content, Steamworks und `.claude/**` unangetastet. Die zwei JPGs gehen direkt an den
  Chef für Steamworks.

## 2026-08-29 — Patchnotes-Artwork 1.2.0 fertig

<!-- codex:2026-08-29T08:01:13+02:00 -->

- Finals: `CODEX/assets/patchnotes-1.2.0-2026-08-29/fertig/`.
- Titelbild `grim_reach_1.2.0_title_1920x622.png` und Hauptkapsel
  `grim_reach_1.2.0_main_capsule_800x450.png`, beide deckend und exakt im Zielformat.
- Motivwelt: Jagdfalle/Köder, fünf Stoffstufen/Schneiderwerkzeug und kontrolliertes Spellfire
  in einer gemeinsamen düsteren Werkstattszene.
- Exakter Satz: `UPDATE 1.2.0` und `THREADS, TRAPS & SPELLFIRE`; Titel vollständig unter dem
  Grim-Reach-Logo, ohne rote Linie oder Dekoration durch die Buchstaben.
- Gemeinsame Vorschau: `qa/preview-target-sizes.png`; technische Daten und Hashes: `qa/qa.json`.
- Keine Produktions-, Renderer- oder Store-Datei verändert.

## 2026-08-29 — Schmuck-Rework, Welle 2 vollständig

<!-- codex:2026-08-29T16:19:58+02:00 -->

- 14/14 P1-Fernkampf-Schmuckbilder geliefert unter
  `CODEX/assets/schmuck-rework-2026-08-29/fertig/`.
- Sieben Ringe und sieben Amulette folgen der bindenden Fassungsregel: Leder, Sehne, Feder und
  Knochen statt eines dominanten Metallbandes; Steine stufen die Reihe von Saphir bis Göttergemme.
- Alle Finals exakt 640 × 640 WebP, vier Kanäle, Alpha 0–255 und vollständig transparenter
  Außenrand. Kein Glühen, Schimmer, Partikel, Boden oder Schlagschatten.
- Kontaktbögen auf Dunkelgrund, Magenta und bei echten 60 px liegen unter `qa/`; vollständige
  Messwerte und SHA-256 in `qa/qa-wave-2.json`.
- Raws, Prompt-Set, Paket-HANDOFF und QA-Bericht sind dokumentiert. Renderer und bestehende
  Schmuckbilder blieben unangetastet.
- P2 wartet auf finale IDs. Zusätzlich vor P2 klären: Die im Brief aufgeführten Wellen ergeben
  37 Stück (`14 + 10 + 5 + 8`), während Titel und Auftrag 41 nennen.

## 2026-08-29 — Schmuck-Rework vollständig, Wellen 3 bis 5

<!-- codex:2026-08-29T17:42:00+02:00 -->

- Nach aktualisiertem Brief und finalen IDs die verbleibenden 27 Motive geliefert; damit liegen
  alle 41/41 Schmuckbilder unter `CODEX/assets/schmuck-rework-2026-08-29/fertig/`.
- Welle 3: 10 Magiestücke ohne Glühen; Wirkung ausschließlich über Runen, Stoff, Essenz und
  Material. Welle 4a: 5 schwere Nahkampf-Amulette. Welle 4b: 8 eigenständige Fundstücke.
  Welle 5: 4 schlichte, benutzte Arbeitsstücke ohne Edelsteinprunk.
- Die 27 neuen Finals sind exakt 640 × 640 WebP q92 mit vier Kanälen, Alpha 0–255 und
  vollständig transparentem Außenrand. Welle 2 blieb nach Claudes Integration unverändert.
- Kontaktbögen je Welle auf Dunkelgrund, Magenta und bei echten 60 px sowie Messwerte und
  SHA-256 liegen unter `qa/`. Paket-HANDOFF und QA-Bericht sind aktualisiert.
- Renderer, Content-Katalog und `.claude/**` blieben unangetastet; Integration bleibt bei Claude.
<!-- codex:2026-08-30T16:25:00+02:00 -->
## 2026-08-30 – New Haven Listen- und Karten-Mockups

- Zehn reine Design-Mockups erstellt: fünf für die Listenansicht und fünf für die Kartenansicht.
- Ablage: `CODEX/assets/newhaven-design-mockups-2026-08-30/fertig/`.
- Vergleichsbögen: `CODEX/assets/newhaven-design-mockups-2026-08-30/qa/contact-list-5-variants.png` und `contact-map-5-variants.png`.
- Varianten und Zustandsabdeckung sind in `CODEX/assets/newhaven-design-mockups-2026-08-30/HANDOFF.md` beschrieben.
- Kein HTML, keine CSS-/TSX-Änderung und keine Renderer-Integration; Auswahl durch den Chef steht aus.
<!-- codex:2026-08-30T16:56:00+02:00 -->
## 2026-08-30 – New Haven Master–Detail HTML-Mockup

- Auf direkte Chef-Auswahl Listenvariante 04 als eigenständigen interaktiven Prototyp umgesetzt:
  `CODEX/outbox/2026-08-30-newhaven-master-detail-html/index.html`.
- Linkes Gebäuderegister ist bewusst scrollbar; bei 1080p bleiben ungefähr acht großzügige Zeilen sichtbar. Jede Zeile zeigt Bild, Namen, Rang, Status und – sofern möglich – eine direkte Aufwerten-/Errichten-Aktion.
- Rechte Detailkarte reagiert auf die Auswahl und zeigt Bestandsillustration, Beschreibung, aktuelle/nächste Wirkung, Gold plus vier Materialkosten, Bauzeit beziehungsweise Sperrgrund und kontextabhängige Aktionen.
- Permanente Drei-Platz-Warteschlange unten mit Fortschritt und Abbrechen-Simulation; außerdem Suche, Aktionsfilter, Betreten- und Fertigstellen-Simulation.
- Nur kopierte Runtime-Bestandsassets im lokalen Mockup-Paket; Renderer, Content, Engine und `.claude/**` unverändert.
- Statische QA und JavaScript-Syntaxprüfung bestanden: 27 referenzierte Assets, 0 fehlend. Browser-Plugin war in dieser Sitzung ohne verfügbaren Browser, daher keine Browser-Screenshot-QA.
<!-- codex:2026-08-30T17:24:00+02:00 -->
## 2026-08-30 – New Haven HTML, Responsive Großformat-Iteration

- Chef-Feedback „Gebäude und Schriften zu klein, alles dynamisch“ im bestehenden Outbox-Paket umgesetzt.
- Root-Typografie skaliert nun viewportabhängig; Register, Detailkarte und Queue nutzen zusätzliche Container-Skalierung. Starre Desktop-Geometrie wurde durch `clamp()`, `rem`, `vw/vh`, `cqw` und flexible Grid-Zeilen ersetzt.
- Linkes Register zeigt absichtlich etwa fünf große Zeilen und scrollt. Numerischer Vertrag: Gebäudeillustrationen 72 px bei 1280×720, 108 px bei 1920×1080 und 128 px bei 2560×1440; Detailtitel 27/41/58 px.
- Arbeitsfläche bleibt in fünf geprüften Viewports zwischen 475 und 991 px hoch; Detailbereich zwischen 622 und 1324 px breit.
- Kleingedruckte Status-, Material- und Queue-Texte besitzen jetzt mindestens 12 px; zentrale Texte beginnen bei 14–16 px. Damit schrumpfen unter 1600 px nicht mehr einzelne Nebenlabels unter die Lesbarkeitsschwelle.
- `qa-static.cjs`, `qa-responsive-contract.cjs` und JavaScript-Syntaxprüfung bestanden. Ein echter Chromium-Headless-Render wurde über Playwright, Headless Shell und Chrome for Testing versucht, aber die verwaltete Sandbox verweigert den erforderlichen Mojo-IPC. Kein Produktionscode berührt.

<!-- codex:2026-08-30T18:10:00+02:00 -->
## 2026-08-30 – New Haven HTML, Screenshot-Korrektur 2

- Direktes Chef-Livefeedback umgesetzt: `II → III` bleibt nun horizontal; die bereits vergrößerten Listenmotive bleiben erhalten.
- Die lokalen Mockup-Kopien der 14 Camp-Gebäude liegen eng zugeschnitten unter `assets/buildings/`, damit die großen transparenten 1536er Sicherheitsflächen die Motive nicht mehr klein rechnen. Produktions-WebPs blieben unangetastet.
- Gebäude in der Detailbühne nutzen jetzt proportionale Maximalmaße statt gleichzeitiger fester Breite/Höhe; dadurch bleibt die gesamte Silhouette sichtbar.
- Kostenbereich und Materialchips haben explizite Min-/Overflow-Grenzen und Text-Ellipsis als letzte Sicherung.
- Die Queue-Zeile wurde auf dynamische 7,5–8,8 rem angehoben; Kartenbilder nutzen proportionale Maximalmaße, alle Karten bleiben innerhalb des Stahlrahmens.
- QA grün: `node --check app.js`, 27 Assetreferenzen/0 fehlend sowie Responsive-Vertrag für 1280×720 bis 2560×1440. Echter Browser-Render bleibt in der Sandbox technisch blockiert; die Chef-Screenshots dienten als visuelle Prüfbasis.
- Integration in React/Renderer bleibt ausdrücklich offen und bei Claude; geändert wurde nur `CODEX/outbox/2026-08-30-newhaven-master-detail-html/` plus diese Übergabe.

<!-- codex:2026-08-30T19:03:00+02:00 -->
## 2026-08-30 – New Haven HTML, Chef-Detailhierarchie

- Rechte Detailkarte gemäß Chef-Markierung neu strukturiert: links eine durchgehend große, vollständig eingepasste Gebäudeillustration; rechts ein eigener Container nur für aktuellen/nächsten Effekt, vier Materialkosten, Gold, Bauzeit und Voraussetzungen.
- Flairbeschreibung, Statusplakette und der dadurch doppelte obere Aufwerten-Knopf vollständig entfernt. Die untere Aktionsleiste ist nun die einzige Aktionsquelle.
- Sämtliche `Betreten`-Zustände, Datenfelder, Buttons und Simulationen entfernt; Schmelzhütte und Taverne sind regulär aufwertbare Stufe-II-Gebäude.
- Effektvergleich nutzt eine benannte Container Query: unter 26 rem vertikal, ab 26 rem horizontal. Dadurch werden breite Detailflächen ausgefüllt, ohne schmale Viewports zu überladen.
- `render-qa.cjs` prüft bei verfügbarer Chromium-Umgebung zusätzlich Bildgröße, Rangumbruch, Detail-/Kosten-/Queue-Overflow und Abwesenheit von Betreten-Aktionen. Aktuell verhindern Browser-Runtime und Windows-Mojo-IPC den echten Headless-Start; Chef-Screenshots plus numerischer Fünf-Viewport-Vertrag dienen als aktuelle Abnahmebasis.
- QA grün: 27 Assetreferenzen/0 fehlend, 14 Gebäude, eine Upgrade-Aktionsquelle, kein Flairpanel, keine Betreten-Aktion, adaptive Effekte sowie JS-Syntax. Renderer/Produktionscode unangetastet.

<!-- codex:2026-08-30T19:28:00+02:00 -->
## 2026-08-30 – New Haven HTML, Kleinstauflösungs-Korrektur

- Chef-Gesamtscreenshot bei 1040 × 958 bestätigt die neue Detailhierarchie, vollständige Gebäudeansicht, Kosten und Queue; einzig das linke Register war in der alten Fünfspaltenzeile sichtbar gequetscht und erzeugte horizontalen Scroll.
- Unter 30 rem tatsächlicher Registerbreite wechselt jede Gebäudezeile nun per Container Query auf zwei Zeilen: Index/Bild/Name/Rang oben, eine über Name plus Rang gespannte Aktion darunter.
- Gebäude bleiben bei rund 69 px sichtbar; Kartenhöhe steigt bewusst auf 7,2 rem und das Register scrollt nur vertikal. `overflow-x: hidden` verhindert die falsche horizontale Scrollachse.
- Responsive-Vertrag um 1040×958 und 1024×768 erweitert; beide ergeben Zweizeilenkarten, mindestens 489 px Detailbreite und vier bis fünf sichtbare Registereinträge.
- Statische QA und JS-Syntax grün. Produktionscode weiterhin unangetastet; letzte Sichtbestätigung der schmalen Registerkarte steht aus.
<!-- codex:2026-08-30T22:18:00+02:00 -->
## 2026-08-30 – New Haven Master-Detail-Liste produktiv umgesetzt

- Die bisherige Kartenwand der Listenansicht in `apps/client/src/renderer/pages/NewHavenPage.tsx`
  durch eine isolierte Master-Detail-Variante ersetzt: scrollbareres Gebäuderegister links, große
  Auswahlansicht rechts und Bauwarteschlange am unteren Rand.
- Bestehende Engine-Prädikate und Verben (`campCardCore`, Start, Einreihen, Abbruch) bleiben die
  einzige Zustands- und Aktionsquelle; keine Spielrechnung wurde in die UI kopiert.
- Vier Materialkosten plus Gold, lange Namen und schmale Container wachsen beziehungsweise brechen
  um. Die Gebäudegrafik bleibt groß und verwendet weiterhin die gemessene `getCampCardFit`-Tabelle.
- Kartenansicht und `BuildingPopup` blieben unangetastet. Taverne ist weiterhin release-gated;
  Benutzungsmodale für Schmelze/Räucherkammer folgen in einem getrennten Auftrag.
- Vollständige Übergabe und statische Prüfliste:
  `CODEX/work/2026-08-30-newhaven-listenkarte/LIEFERUNG.md`.
- Keine Git-Befehle, Live-Starts, Typechecks, Tests oder Builds ausgeführt; diese Prüfung liegt laut
  Implementierungsguide bei Claude.

<!-- codex:2026-08-30T23:04:00+02:00 -->
## 2026-08-30 – New Haven Veredelungsmodal als HTML-Prototyp

- Gemeinsames, interaktives Arbeitsmodal für Schmelzofen und Räucherhaus unter
  `CODEX/outbox/2026-08-30-newhaven-refinery-modal-html/` erstellt.
- Linkes Rezeptregister und rechte Prozessansicht bilden die bestehende Ein-Rezept-Logik mit
  exakten Eingängen, deterministischem Ausgang, Rate, Fortschritt, Materialvorrat und Stop/Start ab.
- Keine Mengenwahl, Prozesswarteschlange, XP, Zufallschance, Flairaktion oder erfundene
  Produktlogik ergänzt. Demo-Umschaltung und Zahlen bleiben ausschließlich im Prototyp.
- Lokale Ashen-Iron-Rahmen, Texturen, Camp-Gebäude und Itembilder wiederverwendet; keine neuen
  Rasterassets und keine Produktionsdateien verändert.
- JS-Syntax und statische Referenz-/CSS-QA bestanden. Visuelle Browser-Abnahme blieb offen, da
  in dieser Sitzung kein Browser verfügbar war. Details stehen im Paket-`HANDOFF.md`.

<!-- codex:2026-08-30T23:42:00+02:00 -->
## 2026-08-30 – New Haven Veredelungsmodal produktiv umgesetzt

- Freigegebenen HTML-Entwurf als gemeinsames Runtime-Modal für Schmelzofen und Räucherhaus in
  `apps/client/src/renderer/pages/NewHavenPage.tsx` und `styles/newhaven.css` umgesetzt.
- Listenansicht besitzt nun eine separate Veredelungsaktion neben dem unveränderten Ausbauknopf;
  gebaute Anlagen öffnen auf der Karte direkt das Arbeitsmodal.
- Kartenmodal bietet `Gebäude verwalten` als Rückweg zur bestehenden Info-/Ausbaukarte, sodass
  Ausbau, Verschieben und Abriss erhalten bleiben. Ungebaute Anlagen nutzen weiter die Baukarte.
- Rezepte, aktiver Slot, Rate, Fortschritt, Produktion und Materialzustand stammen ausschließlich
  aus den bestehenden Engine-/State-Helfern; Start/Wechsel/Stop laufen über `setCampRefineRecipe`.
- 15 neue EN/DE-UI-Schlüssel ergänzt. Andere Locales verwenden den bestehenden EN-Fallback.
- Statische QA grün: TSX ohne Parserfehler, Textparität 15/15, CSS 555/555, beide Öffnungswege.
- Keine Git-Befehle, Live-Starts, Typechecks, Tests oder Builds gemäß Implementierungsleitfaden.
  Detailübergabe: `CODEX/work/2026-08-30-newhaven-refinery-modal/LIEFERUNG.md`.

<!-- codex:2026-08-30T23:58:00+02:00 -->
## 2026-08-30 – New Haven Listenpolitur nach Chef-Feedback

- Defaultansicht von Karte auf Liste umgestellt; Karte bleibt als Tab vollständig erhalten.
- Register, Detailfläche und Queue auf Ash-Stone umgestellt, Einträge auf Cold-Slate; die bisherige
  Umber-Cloth-Fläche ist aus der neuen Listenansicht entfernt.
- Jeder Gebäudeeintrag trägt nun den vorhandenen Gravewood-Iron-`panel-frame.webp` als 9-Slice.
- Listen- und Detail-Bauknöpfe kodieren den echten bestehenden Zustand: Grün direkt baubar,
  Gold einreihbar, Rot blockiert, Stahlgrau laufend/maximal. Keine Bauregel wurde dupliziert.
- `BuildQueueStrip` bleibt auch leer sichtbar und zeichnet alle acht `CAMP_BUILD_QUEUE_MAX`-Slots;
  belegte Slots behalten Verschieben/Entfernen und den bestehenden Wartegrund.
- Statische QA grün: TSX parserklar, Default Liste, Queue 8/8, EN/DE-Leertext, Texturen,
  Iron-Frame, vier Buttonzustände, CSS 562/562.
- Detailübergabe: `CODEX/work/2026-08-30-newhaven-list-polish/LIEFERUNG.md`.
# codex:2026-08-30T23:59:30+02:00 — New Haven: Kartenrahmen, Baufolge, Direkt-Veredelung

- Chef-Korrektur in `apps/client/src/renderer/pages/NewHavenPage.tsx` und
  `apps/client/src/renderer/styles/newhaven.css` umgesetzt.
- Gebäudelisteneinträge: produktiver `nav-bronze-lipped-iron-9slice.webp` statt V3-Panelrahmen;
  Hintergrund exakt wie `.content-header` mit `bg_topbar.webp`.
- Bauleiste vereint den aktiven `camp.buildJob` als Slot 1 mit sieben nachfolgenden
  `camp.buildQueue`-Plätzen; Restzeit sichtbar, aktiver Eintrag nicht umsortierbar. Queue-Reihenfolge
  ist im `newHavenGate` enthalten und rendert daher zuverlässig nach.
- Gebaute Veredelungsanlagen besitzen im Register einen zweiten Button, der das bestehende
  `RefineModal` öffnet.
- Statische QA:
  `node CODEX/work/2026-08-30-newhaven-list-polish/qa-static.cjs` → grün, TSX parserklar,
  CSS-Klammern 568/568.
- Keine Engine-/Save-/Content-Änderung. Keine Git-Aktion, kein Live-Start, kein Typecheck/Test/Build
  gemäß `IMPLEMENTIERUNG-GUIDE.md`; diese Abnahme bleibt beim UI-Owner Claude.
# codex:2026-08-30T23:59:45+02:00 — New Haven: Sidebar-Fläche auf Großcontainern

- `apps/client/src/renderer/styles/newhaven.css`: Gebäuderegister links, Detailansicht rechts und
  Queue unten verwenden nun exakt die produktive Sidebar-Oberfläche (`bg_sidebar.webp`, Overlay
  rgba(10,12,15,.25), 313 px gekachelt).
- Einzelne Gebäudezeilen bleiben bewusst auf `bg_topbar.webp`; dadurch verschmelzen Kartenfläche
  und umgebender Iron-Rahmen nicht mehr mit einem einheitlich grauen Untergrund.
- Statische QA grün: Großflächen exklusiv Sidebar-Textur, Karten exklusiv Topbar-Textur, CSS
  568/568.
# codex:2026-08-31T00:20:00+02:00 — Fünf Offline-Rückkehr-Designstudien

- Den vollständigen Anzeigevertrag von `OfflinePopup.tsx` inventarisiert: Cap/Wächter, Begleiter,
  Tod/Patt/Arbeitsstopp, vier Summen, Erfolge, Skills, New Haven, Veredelung, Jagd, Loot und
  Leerrückkehr.
- Fünf neue 16:9-PNG-Mockups liegen unter
  `CODEX/work/2026-08-31-offline-return-mockups/`; keine Runtime-/HTML-Datei wurde geändert.
- Richtungen: Wächterchronik, Beutetisch, Spuren der Nacht, Quartiermeister-Akte, Aschewaage.
- Erzeugt über das eingebaute ImageGen-Werkzeug mit den zwei aktuellen Offline-Screenshots als
  Stil-/Produktreferenzen. Promptkern und Designbegründungen stehen in `README.md`.
- Statische Bildprüfung: `node CODEX/work/2026-08-31-offline-return-mockups/QA.cjs`.

<!-- codex:2026-08-31T01:43:00+02:00 -->
## 2026-08-31 – Offline-Rückkehr „Der Beutetisch“ produktiv umgesetzt

- Chef-Freigabe für Mockup 02 in `apps/client/src/renderer/pages/OfflinePopup.tsx` und
  `apps/client/src/renderer/styles/offline-stage.css` umgesetzt.
- Neue Hierarchie: responsive Bilanzleiste, Wächter-/Ereignisband, Fortschritt links, große
  Beutefläche in der Mitte sowie New Haven/Jagd rechts; nur datenreiche Spalten scrollen.
- Begleiter, Tod, Patt und Arbeitsstopp bleiben auch gleichzeitig sichtbar. Leere Gruppen entfernen
  ihre Spalte dynamisch; Leerrückkehr und Sprung zur letzten Fertigkeit bleiben erhalten.
- Gebäudefertigstellungen verwenden über `getCampImage` die produktiven Camp-Grafiken. Seltene
  Beute bleibt über die zentrale Rarity-Rangfolge getrennt; keine Engine-/Save-Änderung.
- Neuer kurzer Bilanztext `offline.stage.awayLabel` in EN/DE/ES/FR/PT-BR/RU/ZH ergänzt.
- QA: `runtime-qa.cjs`, HTML-QA, `git diff --check` und Client-Typecheck grün.
- Build und Vitest konnten in der verwalteten Windows-Sitzung nicht anlaufen: beide scheitern vor
  Codeausführung an `spawn EPERM` (esbuild beziehungsweise tinypool). Kein TypeScript-Fehler.

<!-- codex:2026-08-31T17:12:00+02:00 -->
## 2026-08-31 – Fünf RPG-Kampfwidget-Designmockups

- Auf direkte Chef-Anweisung fünf visuelle Alternativen für den aktuellen Kampfscreen erstellt.
- Alle Varianten entfernen die großen unteren Statkarten und setzen kompakte frei schwebende
  HP-/Schutz-/Aktionsleisten oberhalb von Spieler und Gegner.
- Die Konzepte unterscheiden sich bewusst in der Ablage der Sekundärinformationen: eingeklappte
  Randlaschen, seitliche Taktikschienen, obere Ledger, Rahmeneinlassungen oder ein geschlossenes
  Combat Ledger.
- Ablage: `CODEX/work/2026-08-31-combat-widget-mockups/`; Designvergleich und Empfehlung in
  `README.md`, statische PNG-Prüfung in `QA.cjs`.
- Erzeugung als fünf einzelne UI-Overlay-Edits mit dem eingebauten ImageGen-Werkzeug auf Basis des
  vom Chef gelieferten Ist-Screens. Keine Runtime-, Renderer-, Engine- oder `.claude/**`-Datei geändert.

<!-- codex:2026-08-31T17:39:00+02:00 -->
## 2026-08-31 – Kampf-HUD 03 als HTML-Mockup

- Chef-Auswahl 03 „Hunt Target“ als eigenständigen responsiven Prototyp unter
  `CODEX/outbox/2026-08-31-combat-hud-hunt-target-html/` umgesetzt.
- Schwebende Spieler-/Gegnerleisten zeigen jetzt drei klar getrennte Reihen: rote HP und blaue Ward
  jeweils mit Ist-/Maximalwert sowie darunter eine gelbe Angriffsleiste mit Timer in der Füllung.
- Große Bodenkarten bleiben entfernt. ATK/POW/DEF/Reserve und Gegner-/Dropdaten sitzen in zwei flachen
  oberen Ledgers; Details sind als kleine ausklappbare Sekundärtafeln vorhanden.
- Mockup verwendet ausschließlich lokale unveränderte Kopien der produktiven Borderlands-, Warlock-,
  Pyreling-, Felmagier- und Gravewood-Assets. Runtime und `.claude/**` blieben unangetastet.
- Interaktive Vorschau simuliert Treffer, Wardbruch, Reset und Angriffstimer. `node --check`,
  `qa-static.cjs` und `git diff --check` grün. Echte Browser-Sichtprüfung offen, da in dieser Sitzung
  keine Browserinstanz verfügbar war.

<!-- codex:2026-08-31T17:55:00+02:00 -->
### Kampf-HUD HTML – Rahmenkorrektur nach Chef-Screenshot

- Äußeren Kampfbühnenrahmen auf eine schmale 3–6-px-Fassung reduziert.
- Iron Frame um beide schwebenden Figurenleisten vollständig entfernt; Name, Level sowie HP-, Ward-
  und Angriffsleiste stehen jetzt frei über der Szene.
- Drei leere Statuskästchen je Figur entfernt. Sie waren als künftige Effektplätze gedacht, lasen sich
  im Normalzustand jedoch wie defekte Slots; aktive Effekte sollen später nur bei Bedarf erscheinen.
- Statische QA, JS-Syntax und Diffprüfung erneut grün.

<!-- codex:2026-08-31T18:18:00+02:00 -->
### Kampf-HUD HTML – Waffenprofil und Namenshierarchie

- Starre Spielerwerte im oberen Band durch ein waffenabhängiges Profil ersetzt. Interaktive Demo:
  Nahkampf zeigt Angriff/Kraft/Verteidigung, Fernkampf zeigt Fernkampf/Verteidigung, Magie zeigt
  Magie/Warding plus Spell Reserve.
- Oberes Spieler- und Gegnerband von der wiederholten Topbar-Textur auf leichte, halbtransparente
  Eisenbänder mit einzelnen Wertsegmenten umgestellt.
- Stufenplaketten aus beiden schwebenden Figurenleisten entfernt; Namen stehen nun mittig über HP.
  Spieler-Stufe steht im Waffenprofil, Gegner-Stufe im Gegnerband.
- Runtime-Hinweis: Die spätere Auswahl muss automatisch aus der ausgerüsteten Hauptwaffe kommen;
  die Umschalter sind ausschließlich Mockup-Demonstration. QA und Syntaxprüfung grün.

## 2026-08-31 — RPG-Kampf-HUD auf isoliertem Branch

<!-- codex:2026-08-31T19:24:00+02:00 -->

- Branch: `combat-hud-rpg-widgets` in der isolierten Arbeitskopie
  `CODEX/work/2026-08-31-combat-hud-runtime/repo/`; Claudes parallele Inventar-Arbeit im
  Haupt-Worktree wurde nicht berührt.
- `CombatPage.tsx`: waffenabhängige Kurzstatistik (Nahkampf/Fernkampf/Magie), echte ausklappbare
  Vollstatistik ohne Levelwerte und kompakte Spieler-/Gegner-HUD-Bänder ergänzt.
- `combat.css`: Arena-Außenrahmen verschlankt, HUD-Bänder responsiv gestaltet und HP/Ward/
  Angriff rahmenlos als frei schwebende Leisten über den Figuren positioniert.
- Typecheck `pnpm --filter @hearthforge/client typecheck`: bestanden.
- Produktions-Build angestoßen; die Windows-Sandbox blockiert `esbuild` mit `spawn EPERM`, bevor
  die Vite-Konfiguration geladen werden kann. Kein Code-Diagnosefehler.

### Codex-Code-Marker

- `codex:2026-08-31T19:24:00+02:00` —
  `apps/client/src/renderer/pages/CombatPage.tsx`
- `codex:2026-08-31T19:24:00+02:00` —
  `apps/client/src/renderer/styles/combat.css`

## 2026-08-31 — HTML-Studien: Post an andere Spielstände

<!-- codex:2026-08-31T20:24:00+02:00 -->

- Fünf interaktive, noch nicht produktiv integrierte Versandmodal-Varianten liegen unter
  `CODEX/outbox/2026-08-31-cross-save-mail-modal-html/`.
- Abgedeckt sind Spielstand-Dropdown, eindeutige Quelle/Ziel-Route, Betreff und Nachricht,
  Item-/Gold-Anhänge, letzte Versandprüfung, Erfolg und der Leerzustand ohne weiteren Save.
- Bestandsabgleich erfolgte gegen `MailPage.tsx`, `mail.css` und vorhandene Gravewood-/Mail-/Item-
  Assets. Es wurden keine Runtime-, Engine-, Persistenz- oder i18n-Dateien geändert.
- Designerinnen-Empfehlung zur ersten Prüfung: **02 Kurierakte**; sie verbindet die klarste
  Empfängerroute mit einer kompakten Frachtprüfung. **03 Siegelgang** ist die sicherste Alternative
  für wertvolle Transfers.
- Statische QA: `node qa-static.cjs` bestanden (5 Varianten, 10 lokale Referenzen, keine fehlenden
  Assets, Dropdown-/Anhang-/Bestätigungs-/Erfolgs-/Leerzustände vorhanden). Eine Browserinstanz war
  in dieser Sitzung nicht verfügbar; die Sichtprüfung bleibt daher beim nächsten Owner offen.

### Chef-Korrektur: ausschließlich Gegenstandsversand

<!-- codex:2026-08-31T21:12:00+02:00 -->

- Die erste Brief-/Nachrichtenfassung wurde vollständig ersetzt. Alle fünf Varianten sind nun reine
  Itemtransfer-Oberflächen ohne Betreff, Nachrichtentext oder Goldversand.
- Neue Kerninteraktion: Ziel-Spielstand wählen, Itemstapel im aktuellen Inventar markieren, Paket
  und Einheiten prüfen, irreversible Verschiebung bestätigen und Zustellung abschließen.
- Statische QA erneut bestanden: fünf Varianten, 14 lokale Referenzen, keine fehlenden Assets und
  nachweislich keine verbliebenen Brief-/Goldfelder.

<!-- codex:2026-08-31T21:36:00+02:00 -->

- Chef-Feintuning: Das Itemtransfer-Modal nutzt nun die volle verfügbare Fenster-/Stage-Höhe mit
  nur 10 px Sicherheitsabstand oben und unten; bei kleinen Viewports 6 px. Die mittlere
  Inventar-/Paket-Arbeitsfläche übernimmt den zusätzlichen Raum dynamisch.

<!-- codex:2026-08-31T21:48:00+02:00 -->

- Höhenkorrektur nach Chefprüfung: Nicht nur das Modal, sondern die komplette Mockup-Schale ist
  jetzt fest an `100vh` gebunden. Die Stage nutzt eine definite `minmax(0, 1fr)`-Zeile; das Modal
  liegt mit 4 px Rand über deren voller Höhe. Damit bleibt kein ungenutzter Viewport-Rest mehr.

## 2026-08-31 — Cross-Save-Itemtransfer Variante 04 produktiv umgesetzt

<!-- codex:2026-08-31T23:18:00+02:00 -->

- Chefwahl **04 „Zwei Lager“** ist produktiv an die Postseite gebunden. Das vollhohe Modal zeigt
  links die echten Inventarslots des aktiven Spielstands (einschließlich bewusst leerer Plätze),
  rechts ein Paket mit höchstens acht Positionen, Teilmengen für Stapel, echte verzauberte
  Einzelstücke, Ziel-Spielstand-Auswahl, Frachtbrief, verbindliche Bestätigung sowie Erfolg- und
  Fehlerzustände. Ausgerüstete Teile und Bankbestand werden bewusst nicht angeboten.
- Die Postseite zeigt den Einstieg auch im Leerzustand. Eingehende `kind:"transfer"`-Mails nennen
  den echten Absender-Spielstand und verwenden die bestehende Abholmechanik für Anhänge.
- Persistenzvertrag auf **SAVE_VERSION 88** erweitert. Der Engine-Kern validiert alle Quellen vor
  der ersten Mutation. Übertragene Instanzen behalten Affixe/Suffixe, werden im Empfängersave aber
  über dessen monotonen Zähler neu identifiziert, damit gleichnamige save-lokale `inst_*`-IDs nie
  kollidieren.
- Quelle und Ziel werden in Electron mit einem journalgeschützten `saves:writePair`-Commit
  geschrieben. Ein Crash zwischen beiden atomaren Slot-Writes wird vor dem nächsten Save-Zugriff
  zu Ende committed; bei fehlgeschlagener Recovery bleiben weitere Save-Verben gesperrt. Der
  Live-Tick und Autosave ruhen nur während dieses kurzen Commits, aufgelaufene Simulationszeit wird
  danach angewandt. Der Web-Fallback rollt beide localStorage-Werte bei einem Schreibfehler zurück.
- UI-Texte vollständig in EN, DE, ES, FR, pt-BR, RU und ZH ergänzt (je Sprache 41 Transfer-Keys).

### Betroffene Dateien

- UI: `apps/client/src/renderer/components/CrossSaveTransferModal.tsx`,
  `pages/MailPage.tsx`, `styles/mail-transfer.css`, `styles/mail.css`
- Renderer/IPC: `renderer/game/GameContext.tsx`, `renderer/saves.ts`, `preload/index.ts`,
  `main/saves.ts`, `vite-env.d.ts`
- Engine/Save: `packages/engine/src/mail.ts`, `packages/shared/src/index.ts`,
  `packages/persistence/src/index.ts`
- Tests: `packages/engine/src/mail.test.ts`,
  `packages/persistence/src/cross-save-transfer-persistence.test.ts`
- i18n: `renderer/i18n/translations.ts` und alle fünf Locale-Overlays.

### Verifikation und nächster Owner

- `pnpm typecheck`: **bestanden**, 5/5 Pakete.
- `git diff --check`: **bestanden** (nur bestehende CRLF-Hinweise).
- Engine- und Persistenztests sind ergänzt. Vitest konnte sie in der verwalteten Windows-Sitzung
  nicht sammeln, weil Vite intern einen Kindprozess startet und Windows mit `spawn EPERM` blockiert.
  Derselbe Umgebungsblocker stoppt `electron-vite build` bereits beim Config-Bundling; kein
  Code-/Testfehler wurde ausgegeben.
- Kein Live-/Electron-Start gemäß Projektregel. Claude/UI-Owner sollte einmal im echten Client zwei
  lokale Saves mit Teilstapel und verzaubertem Unikat gegeneinander testen und danach den normalen
  CI-Test-/Buildlauf ausführen.

### Chefkorrektur: deutlich schlankere Iron Frames

<!-- codex:2026-08-31T23:41:00+02:00 -->

- `apps/client/src/renderer/styles/mail-transfer.css`: Der erste Stand hatte neben zu großen
  Rahmenbasen auch den falschen 9-Slice-Schnitt `28`. Auf den produktiven Iron-Frame-Vertrag
  `85` korrigiert; Hauptmodal jetzt 4 px, beide Lager 3 px und Bestätigungsdialog 4 px Basis.
- Außenabstand, Lagersteg sowie Route-/Footer-Padding ebenfalls verdichtet. Dadurch wird der
  eingesparte Rahmenraum vollständig den Inventar- und Paketflächen zugeschlagen.
- `pnpm --filter @hearthforge/client typecheck`: bestanden.

## 2026-08-31 — Kampf-HUD bei schmalen Arenen lesbar

<!-- codex:2026-08-31T23:59:00+02:00 -->

- `apps/client/src/renderer/styles/combat.css`: Die beiden oberen Detailbänder reagieren jetzt auf
  die **tatsächliche Arenabreite** nach geöffnetem Loadout-/Record-Dock. Unter 980 px stehen
  Spieler- und Gegnerband vollbreit untereinander statt unleserlich in zwei gequetschten Spalten.
- Der alte Breakpoint, der unter 1200 px die Loot-Icons vollständig ausblendete, ist entfernt.
  Loot bleibt sichtbar; unter 620 px erhält er im Gegnerband eine eigene umbrechende Unterzeile.
- Client-Typecheck und `git diff --check` bestanden. `electron-vite build` bleibt in der verwalteten
  Windows-Sitzung beim Config-Laden am bekannten Umgebungsfehler `spawn EPERM` hängen.

### Nachkorrektur: Plain-Items im Mail-Inventar logisch stapeln

<!-- codex:2026-08-31T23:58:00+02:00 -->

- `CrossSaveTransferModal.tsx` gruppiert gleiche unverzauberte Item-IDs nun zu genau einem
  sichtbaren Stapel; nur echte verzauberte Instanzen bleiben einzeln. Eine gewählte Gesamtmenge
  wird beim Versand deterministisch über vorhandene physische Teilstapel verteilt.
- `packages/engine/src/mail.ts` zählt für die Acht-Platz-Grenze entsprechend verschiedene Plain-
  Item-IDs statt physischer Quellslots. `mail.test.ts` deckt Zusammenfassung und Grenzfall ab.
- Root-Typecheck: 5/5 bestanden. Der gezielte Vitest-Lauf wurde vor Test-Sammlung erneut durch den
  bekannten Windows-Umgebungsfehler `spawn EPERM` blockiert.

## 2026-08-31 — Farming-Skillseite, fünf visuelle Mockups

<!-- codex:2026-08-31T23:05:00+02:00 -->

- Fünf noch nicht implementierte Designrichtungen liegen unter
  `CODEX/work/2026-08-31-farming-skill-mockups/`.
- Alle Varianten wurden gegen die aktuelle `FarmPage.tsx`, Crop-Daten, Saatlogik und vorhandenen
  Farming-Assets konzipiert. Abgedeckt sind neun Beete, sämtliche Plot-Zustände, Auto-Nachpflanzen,
  Folgesorten, Saatmangel, globale Aktionen, manuelles Einsammeln, Saatgartenbonus und der auf mehr
  als 30 Sorten skalierbare Katalog.
- Bilder: fünf PNG, jeweils 1672 × 941, RGB. Keine Runtime-Dateien geändert.
- Mira-Empfehlung: Variante **05 Saat- und Bodenregister** für maximale Zukunftssicherheit;
  Variante **02 Feldbuch** als responsive und besonders lesbare Alternative.

### Chefwahl 01 als interaktives HTML-Mockup

<!-- codex:2026-08-31T23:31:00+02:00 -->

- `CODEX/work/2026-08-31-farming-skill-mockups/index.html` setzt **01 Neun Äcker** mit den
  vorhandenen Farming-, Sidebar-, Font-, Rahmen- und Texturassets um.
- Neun Beetkarten, alle relevanten Farming-Zustände, Auto-Nachpflanzen, Pflanzen, Ernten,
  Einsammeln, Einzel-/Global-Folgesorten und ein tierfilterbarer Sortenkatalog sind interaktiv.
- Unter 1220 px wird der Katalog zum Drawer; zusätzliche Breiten- und Höhenbreakpoints schützen
  Beetgröße und Lesbarkeit bei 1366×768.
- Keine Runtime-Datei geändert. Statische QA bestanden: neun Beete, 21 lokale Referenzen,
  CSS-Struktur 184/184, JavaScript parserfehlerfrei. Die Browser-Testfunktion war in dieser Sitzung
  nicht verfügbar; visuelle Browser-Screenshots bleiben deshalb offen.
- Codex-Marker `codex:2026-08-31T23:20:00+02:00` in HTML, CSS-/JS-Arbeitsblöcken und QA.
