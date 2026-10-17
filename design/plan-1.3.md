# 1.3 — Sammelliste

> **17.10.2026: Plan steht.** 1.3.0 „Die Götzenhalle erwacht“. Chef-Entscheide: Endgame UND Story,
> die Chronik geht in der Götzenhalle weiter; alle 5 Endgame-Punkte, am Ende eine Asset-Liste;
> so schnell wie möglich; keine Auto-Flucht. Arbeitsauftrag: **`design/1.3.0-goal.md`**.
> Diese Datei bleibt die Sammelliste mit Belegen.

<!-- claude:2026-10-17T11:30:00+02:00 -->

**Stand 17.10.2026.** Der Chef macht sich gerade Gedanken über 1.3. Diese Datei sammelt, was
dafür notiert werden soll. Sie ist **keine Freigabe**: Umfang, Schlagzeile und Reihenfolge
entscheidet der Chef.

## Chef-Entscheide vom 17.10.

- „1.3.0 Alive“ war nur ein Konzept, die Taverne nur ein Test. Kein gesetzter Kern für 1.3.
  (`TAVERN_ENABLED` bleibt aus.)
- **Dual Wield liegt auf Eis.** Begründung Chef: würde massive Nerfs für Einhandwaffen und einen
  Balancing-Albtraum bedeuten. Konzept bleibt in `design/dual-wield-konzept.md`.

## Notiert (Chef: „Setze das mit auf den 1.3-Plan“)

### Ward Leech / Schleiertrinker verständlich machen

Anlass: Spielerfrage 17.10. („How does Ward Leech work?“). Mechanik geprüft, sie arbeitet korrekt,
ist aber für Spieler nicht nachvollziehbar.

| # | Punkt | Beleg |
|---|---|---|
| 1 | **Im Kampfprotokoll sichtbar machen**, genauso wie der Lichtsegen (Annotation `wardRestored` am Treffer-Ereignis, tatsächlich aufgefüllter Betrag, kein Eintrag bei vollem Ward). Nur Log, keine Werteänderung. | `packages/engine/src/combat.ts:2104` („Still, kein pushLog“), Vorbild Lichtsegen `:2119–2125`, `:2156` |
| 2 | **Tooltip: „Stapelt nicht, die stärkste Quelle zählt.“** Gilt für alle Spezialeffekte außer den Kill-Boni (`healOnKill`, `wardOnKill`, `cooldownOnKill` summieren sich). In allen 7 Sprachen. | MAX-Regel `combat.ts:577`, `:618`; Ausnahmen `:590` |
| 3 | **Warnung beim Verzaubern**, wenn derselbe Effekt schon von einem anderen ausgerüsteten Teil kommt. Sonst verschwenden Spieler Runen (der Spieler hatte 5× Schleiertrinker = weiterhin 10 %). | `pages/EnchantingPage.tsx`; Affix `affix_veil_drinker` in `packages/content/src/index.ts:20504` |
| 4 | **Platzhalter `{pct}` → `{magnitude}`** in der Effektbeschreibung (alle 7 Sprachen). Bereits gefixt (Chef-Fund 31.08.), aber nur im unveröffentlichten 1.2.4-Stand; Wächtertest `util/weaponEffectProse.test.ts`. Kommt mit 1.3.0 (kein Hotfix, Chef 17.10.). | `apps/client/src/renderer/i18n/translations.ts:256` |

Fakten für spätere Texte: Schleiertrinker 10 %, Hohlschleier-Medaillon und einige Waffen 8 %,
Tidewrack Chain 12 %. Nicht abgerundet (15 Schaden → 1,5 Ward), auf Max-Ward gedeckelt, ohne
Ward-Pool wirkungslos. Zählt nur Schaden, der beim Gegner an den HP ankommt; was der Gegner-Ward
schluckt, füllt nichts nach (`combat.ts:2048`).

## In Arbeit (Test-Branch, noch nicht abgenommen)

- **UI-Fundament** auf `test-ui-fundament`: kompakter Kopfbereich, Layouts nach Panelbreite,
  keine Wortbrüche in 7 Sprachen, einheitliche Schriftskala. Texturen und Rahmen bleiben
  (Chef 17.10.). Auftrag: `design/ui-fundament/BRIEF.md`. Abnahme durch den Chef per Vorher/Nachher.

## Kandidaten aus dem Brainstorm 17.10. (nicht entschieden)

- **Endgame ausbauen:**
  - Götzenhalle als offene Zone (Chef-Entscheid 29.08., macht 2 Champions und 2 Erfolge erreichbar).
  - Dungeons für Gezeitenuntiefen und Schlackengrube.
  - Späte Zonen füllen (Wildwald 4, Gezeitenuntiefen 5, Hochland 6 Monster).
  - Slayer-Turm in Endgame-Stärke (Etage 5 hat heute 78–120 HP).
  - Paragon-Belohnungen über Etage 20.
  - Fernkampf-/Magiewaffen ab Stufe 95 (je 5 gegen 14 im Nahkampf).
  - Holzfällen/Angeln über Stufe 80 (3 bzw. 4 Aktionen).
- **Story Band 2 „Götterkriege“:** wartet auf den Rahmen des Chefs (`design/lore/aschechronik-spec.md:278`).
- **Auto-Flucht:** Chef-Auftrag vom 29.08., nie gebaut. Spezifikation in `design/offen-1.2.1.md` §1.
- **Kleinkram aus `design/offen-1.2.1.md` §2:**
  - Zähler für übersprungene Warteschlangen-Einträge im Offline-Bericht.
  - Toter Pause-Block in der Warteschlange.
  - Steam-Statistiken bündeln.
  - `NEW_HAVEN_RISES` sitzt auf der Decke.

## Vor 1.3 zu klären (eigener Strang)

- **Krypta-Erfolge** (Spielerberichte 31.08. und 17.10.): Der Fix `053d4c9` ist fertig, wurde aber
  nie hochgeladen. Der letzte Upload ist Build 25036037 (1.2.3) vom 31.08. um 14:19. Chef 17.10.:
  kein Hotfix, kommt mit 1.3.0.
## 1.2.4 fließt in 1.3.0 (Chef 17.10.)

1.2.4 wird nicht einzeln veröffentlicht. Inhalt laut Code (Commits `075afd5..053d4c9` plus der bis
10.09. uncommittete Teil, jetzt im Basis-Commit `373236a` auf `test-ui-fundament`):

- Bank als echtes Fächer-Raster mit Drag-Anzeige, neue Beute hängt hinten an (SAVE 87)
- Inventar mit festen Fächern, Sortieren als Knopf; Alt-Saves werden einmal geradegezogen
- Vierter Werkzeug-Slot; Werkzeuge gehören keinem Kit mehr (Migration rettet sie aus inaktiven Kits)
- Kit-Wechsel in der Kampf-Vorbereitung
- Enzyklopädie („?“ in der Topbar, alle Items, Suche, Teil der Einführungstour)
- Neues Kampf-HUD (Mira)
- Neuer Rückkehr-Bildschirm „Der Beutetisch“ (Mira). Der Steam-Text dafür heißt „1.2.3 – The Return
  Screen, Rebuilt“, der hochgeladene 1.2.3-Build enthielt ihn aber nicht.
- Rabenfracht: Items zwischen lokalen Spielständen verschicken (SAVE 88). Fehlt im Steam-Text 1.2.4.
- Seltener-Fund-Popup nicht mehr bei selbst hergestellten Items
- Fixes:
  - Krypta-Erfolge
  - „Das ganze Bestiarium“ (110 → 105)
  - Kapitel 11 erledigte sich selbst
  - Schock ignorierte Immunitäten (Abgrundverschlinger)
  - `{pct}` im Ward-Leech-Text

Patchnotes-Grundlage: `design/steam-post-1.2.4.txt` (Rabenfracht und Beutetisch ergänzen).
**Entschieden (Chef 17.10.): kein Hotfix.** Die Spieler warten mit allen Fixes auf 1.3.0.

## TODO: 1.2.4-Inhalte überarbeiten (Chef 17.10.)

<!-- claude:2026-10-17T20:15:00+02:00 — Ü1-Ergebnis je Punkt nachgetragen (Review + Fixes 17.10., Belege = Commits). -->

Chef: „Die ganzen Punkte müssen alle überarbeitet werden, weil das noch mit alten Modellen gemacht
wurde.“ Nichts davon gilt als fertig, nur weil es gebaut und getestet ist. Jeder Punkt wird vor
1.3.0 neu durchgesehen und bei Bedarf umgebaut.

**Abnahme je Punkt:**
- Code-Review gegen den aktuellen Engine-/UI-Stand: Logik, Randfälle, unnötige Komplexität,
  Kommentar-Wust.
- Gerendert angesehen in de + ru bei 1360×720 und 1920×1080; Texturen und Rahmen bleiben (Chef 17.10.).
- Passende Tests grün; bei Save-Themen zusätzlich das Kompat-Archiv.
- Ergebnis: behalten, nachbessern oder neu bauen, mit Begründung.

**Vorteil:** SAVE 87 und 88 waren nie live. Ihr Format darf sich bei der Überarbeitung noch ändern,
ohne Migrationslast. Das Kompat-Archiv reicht nur bis v86, dem echten Live-Stand. Ab dem
1.3.0-Release ist das Format eingefroren.

- [x] Bank-Fächer-Raster inkl. Drag-Anzeige und „neue Beute hinten“ (`engine/bank.ts`, `pages/BankPage.tsx`, SAVE 87)
      **Nachgebessert:** rein verzauberte Lagerstücke bekamen kein Fach (`syncBankOrder`), neue Items hängen jetzt
      hinten an (`40ee308`); Bank scrollt wieder, Drag auf leere Fächer auch aus dem Inventar (`518a83b`, `5bfbb81`).
- [x] Inventar mit festen Fächern, Sortieren als Knopf, einmaliges Geradeziehen alter Saves (`engine/inventory.ts`)
      **Nachgebessert:** Leerfächer und Reihenfolge korrigiert (`40ee308`). Grundkonzept behalten.
- [x] Vierter Werkzeug-Slot + Werkzeuge außerhalb der Kits inkl. Migration (`engine/loadouts.ts`, `equipment.ts`, `persistence`)
      **Nachgebessert:** `equipTool` ersetzt das Werkzeug desselben Berufs und respektiert den Zielslot, Test ergänzt (`40ee308`).
- [x] Kit-Wechsel in der Kampf-Vorbereitung (`pages/CombatPage.tsx`, `EquipKitBar.tsx`)
      **Behalten, aufgeräumt:** toter Kit-Scan und ungenutzte Fighter-Props entfernt (`40ee308`).
- [x] Enzyklopädie (`components/EncyclopediaModal.tsx`, `styles/encyclopedia.css`, Einführungstour)
      **Nachgebessert:** filtert Schlüssel und Altlasten (`40ee308`); Kopfleisten-Knopf heißt „Wiki“ (`518a83b`).
- [x] Kampf-HUD (Mira-Umsetzung, `combat.css`)
      **Nachgebessert:** HUD-Kurztexte als eigene Schlüssel in 7 Sprachen (`40ee308`); Rahmen/Struktur in UI-Runde 2 (`3dd1bd1`).
- [x] Rückkehr-Bildschirm „Der Beutetisch“ (Mira-Umsetzung, `pages/OfflinePopup.tsx`, `offline-stage.css`)
      **Behalten, ergänzt:** Zähler für übersprungene Warteschlangen-Einträge statt nur des letzten (K4, `bc5d5f0`).
- [x] Rabenfracht zwischen Spielständen (`engine/mail.ts`, `CrossSaveTransferModal.tsx`, `main/saves.ts`, SAVE 88)
      **Nachgebessert:** ein defektes Fracht-Journal sperrte alle Saves, jetzt wird es als `.broken-<zeit>` beiseitegelegt;
      Sperrliste + `mintInstanceId` gegen doppelte Instanzen; SAVE 87/88 zu v87 zusammengelegt, v88-Testsaves laden (`40ee308`).
- [x] Seltener-Fund-Popup ohne Eigenherstellung (`components/Toasts.tsx`)
      **Nachgebessert:** unterdrückte echte Beute, sobald dasselbe Item einmal hergestellt war (`40ee308`).
- [x] Fixes (Krypta, Ganzes Bestiarium, Kapitel 11, Schock-Immunität, `{pct}`). Auch hier prüfen, ob
      der Fix die Ursache trifft oder nur das Symptom.
      **Behalten, Ursache getroffen:** Krypta/Bestiarium zählten Dungeon-Varianten mit (`053d4c9`, Helfer
      `isDungeonVariantId` in `40ee308`); Kapitel 11 zählt über `dungeons_cleared` statt über den auch offen
      laufenden Nekromanten; Schock prüft `monsterResists`; `sim-realistic` kennt `dungeons_cleared`.
- [x] Steam-Text 1.2.4 neu schreiben, sobald feststeht, was davon bleibt
      **Erledigt:** in `design/steam-post-1.3.0.txt` aufgegangen (Abschnitte BANK, BAGS AND TOOLS / INTERFACE / FIXES).

Hinweis: Codex' Interface Reforged und die 56 ersetzten Bilder (beide 09./10.09.) gehören nicht zu
1.2.4. Das Interface wird ohnehin im UI-Fundament überarbeitet; die Bilder hat der Chef am 10.09.
einzeln abgenommen.

## Chef-Entscheide 17.10. (Ü2, Rest)

- Slayer-Seite bleibt ohne große Brenna-Porträtspalte.
- Gold im Laden bleibt doppelt (Statusleiste + Laden-Kopf).
- Abnahme 1.3.0 im Testspiel: steht aus (Chef testet noch).
