# Asset-Brief — Schmuck-Rework: 41 Ringe und Amulette

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 29.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Hintergrund:** Das Schmuck-System bekommt ein Rework (Analyse und Plan: `design/schmuck-audit-2026-08-29.md`).
> Fernkampf hatte bisher **kein einziges** unterstützendes Schmuckstück, Magie nichts oberhalb Juwelierskunst 65.
> Es entstehen drei parallele Leitern über die ganze Fertigkeit plus acht neue Fundstücke.

# Teil A – Auftraggeber-Briefing

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Schmuck-Rework, 41 Stücke |
| Auftraggeber | Chef (GO 29.08.2026) |
| Projekt | Grim Reach |
| Zielversion | 1.2.1 (Welle 1+2) und 1.3.0 (Welle 3+4) |
| Priorität | P1 für die 14 Fernkampf-Stücke, P2 für den Rest |
| Termin | kein fester Termin, Reihenfolge nach Wellen unten |
| Status | zur Produktion freigegeben |

## A2. Produktziel

41 neue Item-Bilder für Ringe und Amulette. Sie reihen sich in einen **bestehenden, sehr einheitlichen Bestand von
95 Schmuckbildern** ein und müssen daneben bestehen können, ohne aufzufallen.

**Bestandsreferenz (Pflicht, vor der Produktion ansehen):**
`apps/client/src/renderer/assets/items/` — insbesondere
- `diamond_ring.webp` (Silberring, gefasster Brillant, Rankenwerk an den Schultern)
- `onyx_amulet.webp` (schwarzes Metall, Dornenfassung, ovaler Stein, Kette oben angeschnitten)
- `stormcaller_amulet.webp`, `abyssal_signet.webp`, `bloodstone_ring.webp`, `voidstone_ring.webp`

**Bindende Bildeigenschaften, aus dem Bestand gemessen:**

| Eigenschaft | Wert |
|---|---|
| Format | WebP, **640 × 640**, RGBA |
| Hintergrund | **Echtes Alpha, vollständig transparent** (Alpha-Minimum 0). Kein weißer Grund, kein Schachbrettmuster ins Bild malen |
| Ansicht | Ring: leicht schräg von oben, Band unten sichtbar. Amulett: frontal, Kette oben angeschnitten |
| Beleuchtung | Weiches Oberlicht, weiche Schatten am Objekt selbst, kein Schlagschatten auf den Grund |
| Stil | Gemalter Fotorealismus, feine Metallarbeit, Dark Fantasy. Keine Comic-Umrisse, kein Cel-Shading |
| Objektgröße | Füllt etwa 80 bis 90 Prozent der Bildhöhe |
| **Kein Glühen** | Ausrüstung trägt **niemals** Schimmer, Leuchten oder Partikel (Projektregel; nur Runen und Tränke dürfen glühen) |

## A3. Die eine Gestaltungsregel des Reworks

**Der Edelstein bestimmt die Stufe, die Fassung bestimmt den Kampfstil.** Das ist die Regel, die ein Spieler am Bild
ablesen können soll:

| Fassung | Kampfstil | Wie es aussieht |
|---|---|---|
| **Metallband** | Nahkampf | Geschmiedetes Metall, Kupfer bis Götzeneisen, kantig, wuchtig |
| **Lederschnur, Sehne, Federn** | Fernkampf | Geflochtenes Leder, Sehnenwicklung, Federkiele, Knochen. Metall nur als Beschlag |
| **Runen- und Essenz-Einfassung** | Magie | Eingeritzte Runen, gefasste Essenzkristalle, gewebte Stoffbänder |

Ein Spieler soll einen Fernkampf-Ring auf 60 Pixel Kantenlänge von einem Nahkampf-Ring unterscheiden können,
**ohne den Namen zu lesen**. Die Silhouette und das Material tragen das, nicht die Farbe allein.

## A4. Nicht anfassen

Renderer, Content, alle bestehenden Bilder. Die 95 vorhandenen Schmuckbilder bleiben unverändert im Spiel
(Projektregel „alte Assets nie entfernen").

## A5. Lieferung

- `CODEX/assets/schmuck-rework-2026-08-29/fertig/<item_id>.webp` — Dateiname **exakt** die Item-ID aus den Listen unten
- `raw/` mit den unveränderten Ausgaben, `qa/` mit Kontaktbogen je Welle **neben den Bestandsreferenzen**
- Danach HANDOFF und WORKLOG wie üblich

---

# Teil B – Die Stücke

Reihenfolge nach Priorität. **Welle 2 zuerst** — das ist die Lücke, die einen ganzen Kampfstil betrifft.

## Welle 2 — Fernkampf (14 Stück, P1)

> **IDs final.** Diese 14 Stücke sind seit dem 29.08. im Katalog angelegt; die Dateinamen unten stimmen
> exakt mit den Item-IDs im Spiel überein.

Leder, Sehne, Feder, Knochen. Gedeckte Grüntöne, Braun, mattes Eisen. Die Steine sind dieselben wie bei den
Nahkampf-Ringen derselben Stufe, aber in Leder gefasst statt in Metall.

### Ringe

| Item-ID | Name | Stufe | Motiv |
|---|---|---|---|
| `kestrel_loop` | Turmfalken-Reif | 15 | Schmaler Lederring, ein kleiner Saphir in einer Sehnenwicklung, zwei winzige Federkiele seitlich |
| `hawkeye_gyre` | Falkenaugen-Band | 34 | Geflochtenes Leder, ovaler Rubin wie ein Auge gefasst, Eisenbeschlag |
| `sinewbound_coil` | Sehnenbund-Ring | 44 | Dicht gewickelte Sehne über Eisenkern, Blutstein tief eingelassen |
| `windwidow_snare` | Windwitwen-Siegel | 55 | Breiter Lederring mit Siegelplatte, eingeprägte Feder, Diamantsplitter im Zentrum |
| `blackfletch_nock` | Schwarzfeder-Ring | 70 | Schwarzes Leder, drei geschwärzte Federkiele als Fassung, Onyx |
| `ghostquiver_notch` | Geisterköcher-Band | 85 | Drachenhaut, Köcher-Motiv umlaufend, Leerenstein blass schimmernd (Farbe, kein Leuchten) |
| `worldpiercer_barb` | Weltendurchbohrer-Ring | 95 | Schattenhaut über Aetherium, Pfeilspitze als Fassung, Göttergemme |

### Amulette

| Item-ID | Name | Stufe | Motiv |
|---|---|---|---|
| `longsight_cord` | Weitblick-Band | 18 | Einfache Lederschnur, Saphir in Sehnenschlinge, eine Feder |
| `windwhisper_torc` | Windflüster-Reif | 38 | Halsreif aus geflochtenem Leder, Rubin, drei Federn im Halbkreis |
| `harriers_clasp` | Kette des Würgfalken | 48 | Lederband mit Eisengliedern, Blutstein in Krallenfassung |
| `kitehunter_collar` | Anhänger des Weihenjägers | 60 | Diamant in Lederfassung, stilisierte Greifvogel-Schwinge |
| `gloomfletch_choker` | Düsterfeder-Amulett | 75 | Kriegshaut, Onyx, Fächer aus schwarzen Federn hinter dem Stein |
| `nightquarry_wreath` | Nachtbeute-Kette | 88 | Drachenhaut geflochten, Leerenstein, Knochensplitter als Zierrat |
| `deadeye_reliquary` | Reliquiar des Todesauges | 99 | Schattenhaut und Aetherium, Göttergemme als Auge gefasst, Federkranz |

## Welle 3 — Magie (10 Stück, P2)

> **Achtung, Dateinamen:** Die Item-IDs der Wellen 3, 4a und 4b sind hier **vorläufig**. Sie stehen erst
> fest, wenn die Stücke im Katalog angelegt sind — ich schicke dir die endgültige Liste nach, bevor du mit diesen
> Wellen anfängst. Die IDs der Welle 2 unten sind dagegen **final und im Spiel angelegt**.

Runen, Essenzkristalle, gewebte Stoffbänder. Kühle Blau-, Violett- und Aschetöne. **Trotzdem kein Glühen** — die
Wirkung kommt aus dem Material und der geritzten Rune, nicht aus Licht.

| Item-ID | Name | Slot | Stufe | Motiv |
|---|---|---|---|---|
| `emberglass_ring` | Glutglas-Ring | Ring | 34 | Rubin wie geschmolzenes Glas, Feuerrune ins Band geritzt |
| `hollowlight_signet` | Hohllicht-Siegel | Ring | 55 | Diamant in hohler Fassung, Aetherrune, das Zentrum bleibt leer |
| `nightwell_ring` | Nachtquell-Ring | Ring | 70 | Onyx wie ein Brunnenschacht, Leerenrune umlaufend |
| `voidscribe_band` | Leerenschreiber-Band | Ring | 85 | Leerenstein, dicht beschriebenes Band, Runen überlagern sich |
| `godsight_ring` | Gottblick-Ring | Ring | 95 | Göttergemme in göttlicher Essenz gefasst, Auge-Motiv |
| `ashcant_pendant` | Aschgesang-Anhänger | Amulett | 38 | Rubin, Dornleinen-Band, Runenkette am Rand |
| `gravecall_amulet` | Grabruf-Amulett | Amulett | 48 | Blutstein, Grabstahl-Fassung, Grabessenz als Einschluss |
| `duskveil_chain` | Dämmerschleier-Kette | Amulett | 75 | Onyx hinter Geistertuch, der Stein wirkt verschleiert |
| `voidsong_amulet` | Leerengesang-Amulett | Amulett | 88 | Leerenstein, Leerenessenz, Runen wie Notenzeilen |
| `godgem_reliquary` | Gottstein-Reliquiar | Amulett | 99 | Göttergemme in Sternweb, Reliquiar-Form mit Türchen |

## Welle 4a — Nahkampf-Amulette (5 Stück, P2)

Geschmiedetes Metall, Leder als Riemen. Warme Rot-, Kupfer- und Eisentöne. Wuchtiger als die anderen Reihen.

| Item-ID | Name | Stufe | Motiv |
|---|---|---|---|
| `gorecrown_pendant` | Blutkron-Anhänger | 48 | Blutstein in gezackter Krone aus Grabstahl, Kriegshaut-Riemen |
| `ironvow_chain` | Eisenschwur-Kette | 60 | Diamant zwischen zwei Mithril-Fäusten, schwere Kette |
| `reavers_torc` | Räuber-Reif | 75 | Offener Halsreif aus Runit, Onyx als Verschluss, Kerben wie Kill-Striche |
| `bloodiron_locket` | Bluteisen-Medaillon | 88 | Bluteisen-Medaillon, aufklappbar angedeutet, Leerenstein im Deckel |
| `warcrown_reliquary` | Kriegskron-Reliquiar | 99 | Götzeneisen, Kronenform, Göttergemme im Zentrum, angeschlagen und geflickt |

## Welle 4b — Fundstücke (8 Stück, P2)

Diese sind **Einzelstücke mit Charakter**, keine Reihe. Jedes darf auffälliger sein als die Craft-Leitern, weil es
selten fällt. Trotzdem kein Glühen.

| Item-ID | Name | Slot | Motiv |
|---|---|---|---|
| `cutthroat_loop` | Kehlschnitt-Reif | Ring | Ring aus einer gebogenen Klinge geschmiedet, die Schneide zeigt nach außen |
| `firstlight_signet` | Erstlicht-Siegel | Ring | Siegelring, halb poliert, halb angelaufen, Sonnenaufgangs-Motiv in der Platte |
| `tidewrack_chain` | Flutbruch-Kette | Amulett | Treibholz und Muschelkalk, ein Aetherium-Splitter wie Strandgut eingefasst |
| `hollowmarch_band` | Hohlmarsch-Band | Ring | Breites Band aus vielen dünnen Ringen, wie zusammengewachsene Schritte |
| `ashen_vow_pendant` | Aschenschwur-Anhänger | Amulett | Verkohltes Holzstück mit Eisenklammern, ein Blutstropfen-Rubin |
| `rimeheart_locket` | Reifherz-Medaillon | Amulett | Medaillon aus Frostmetall, im Inneren ein Eiskristall, Reif an den Rändern |
| `thornwarden_signet` | Dornwächter-Siegel | Ring | Ring aus verschlungenen Eisendornen, die nach außen stehen |
| `sunder_crown` | Splitterkrone | Amulett | Bruchstück einer Krone an einer Kette, Bruchkante scharf, fünf verschiedene Steine |

---

# Teil C – Prüfliste vor der Lieferung

- [ ] Dateiname exakt die Item-ID, `.webp`, 640 × 640, RGBA
- [ ] Alpha wirklich transparent (Alpha-Minimum 0), kein weißer und kein karierter Grund
- [ ] Kein Glühen, kein Schimmer, keine Partikel
- [ ] Fassung passt zum Kampfstil der Reihe (Metall, Leder, Runen)
- [ ] Auf 60 Pixel Kantenlänge noch als Ring beziehungsweise Amulett erkennbar
- [ ] Kontaktbogen je Welle **neben** `diamond_ring.webp` und `onyx_amulet.webp` gelegt
- [ ] Maße, Modus, Dateigröße und Hash im QA-Bericht protokolliert
