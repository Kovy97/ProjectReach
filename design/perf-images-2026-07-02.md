# Perf-Audit: Bild-Ladezeiten (2026-07-02)

Chef-Report: Seitenwechsel dauern oft >1 s, Ursache Bilder. Auftrag: Diagnose + verlustfreie
Optimierung (keine Qualitätsreduktion), Code-Empfehlungen für ui-dev (nicht umgesetzt).

---

## 1. Diagnose (gemessen)

### Asset-Zensus (vor Optimierung)

- **2078 PNGs, 690,12 MB** in `apps/client/src/renderer/assets/` (Gesamt-Assets 696 MB inkl. 5,5 MB MP3).
- Größenverteilung: das Problem sind **366 Dateien à 1–3 MB = 630,5 MB (91 % des Volumens)**.
  1537 Dateien <50 KB (Items/UI-Kleinkram) machen zusammen nur 29,9 MB aus.

| Bucket | Dateien | MB |
|---|---|---|
| <50 KB | 1537 | 29,9 |
| 50–200 KB | 139 | 9,5 |
| 200 KB–1 MB | 36 | 20,3 |
| **1–3 MB** | **365** | **627,4** |
| 3–5 MB | 1 | 3,1 |

- Dickste Ordner (vorher): monsters 130,6 MB (84 Dateien) · icons 103,0 MB (71) · portraits 67,9 MB (50)
  · actions 64,8 MB (35) · battlescreens 51,7 MB (21) · sidebar 37,6 MB (30) · zones 37,6 MB (17)
  · skill-backgrounds 33,0 MB (14) · pets 33,6 MB (21) · items 32,5 MB (1022, klein).
- Top-Einzeldateien (vorher): `ui/citymap.png` 3,10 MB, `bg_copper.png` 2,92 MB, `bg_grey2.png` 2,91 MB,
  `skill-backgrounds/leatherworking.png` 2,89 MB, `zones/wildwood.png` 2,83 MB, `bg_green.png` 2,83 MB, …

### Pixel-Dimensionen — der eigentliche Befund

| Ordner | typische Größe | Anzeigegröße in der UI |
|---|---|---|
| monsters/ | **1254×1254** (83 von 84) | Karten-Porträt ~100–200 px |
| icons/ | **1254×1254** (alle 71) | UI-Icons ~16–48 px |
| sidebar/ | **1254×1254** (alle 30) | Sidebar-Icons ~24–32 px |
| actions/ | ~1254² (Ø 1,85 MB/Datei) | Skillkarten-Art |
| portraits/ | 1122×1402 / 1086×1448 | Charakterbild |
| items/ | 320×320 / 384×384 | Zellen 32–64 px (unkritisch) |

Ein 1254×1254-RGBA-PNG dekodiert zu **~6,3 MB Roh-Raster**. Das ist der Kern des >1s-Problems:

- **Combat-Zonenansicht** (`CombatPage.tsx`, monster-grid Z. 1377 ff.): pro Monster eine `<img>` mit
  1254²-Art (Ø 1,55 MB Datei / 6,3 MB Raster) **plus** pro Karte `backgroundImage` mit dem 2,2–2,8 MB
  Battlescreen. Zone mit 10 Monstern ⇒ ~15 MB Dateilesen + **>60 MB Raster-Decode** beim Mount.
- **SkillPage** (Z. 352–370): jede Aktionskarte rendert `getActionSrc()` (Ø 1,85 MB Action-Art) und
  zusätzlich eine **pro Karte geblurte** `skillcard-banner-bg`-Ebene mit dem 2,7 MB Skill-Background
  (eine Fetch-Quelle, aber N Blur-Rasterisierungen).
- **Sidebar** (App-Start, `Sidebar.tsx`): ~30 Icons à 1254² für 24–32 px Anzeige ⇒ ~30 MB Datei /
  ~190 MB Raster allein fürs Grundgerüst.
- Seitenwechsel ist `switch`-basiert (`App.tsx:303`): alte Seite unmountet, neue mountet ⇒ alle
  `<img>` werden neu instanziert; Chromiums Decoded-Image-Cache hält bei diesen Rastergrößen wenig.

### Lade-Muster (Code)

- Alle Asset-Kataloge (`items.ts`, `uiIcons.ts`, `monsters.ts`, `actionIcons.ts`, `sidebarIcons.ts`,
  `battleScreens.ts`, …) nutzen `import.meta.glob(..., { eager: true, query: "?url" })`.
  **Das ist OK**: eager + `?url` bündelt nur URL-Strings, keine Bildbytes ins JS. Kein Bundle-Bloat.
- `<img>`-Tags: **kein einziges `loading="lazy"`** im Renderer (130 `<img>`-Vorkommen, 34 Dateien).
  `decoding="async"` existiert nur in `ItemCell.tsx:94`.
- Große Hintergründe teils als CSS `background-image` (nicht lazy-fähig): Monster-Karten,
  Skillkarten-Banner, `bg_grey/bg_copper`-Texturen (base.css/components.css/character.css).

### Prod vs. Dev

- `electron.vite.config.ts:33`: `assetsInlineLimit: 0` ⇒ **keine base64-Inlines** (bewusst, CSP
  `default-src 'self'` unter file://). Korrekt — nicht ändern.
- Gebautes Bundle `out/renderer`: **1410 PNGs als einzelne gehashte Dateien** (vorher 627,2 MB).
  Unter file:// sind Einzel-Requests billig (Disk-Read); der Engpass ist **PNG→RGBA-Decode**, nicht
  Request-Anzahl. Im Dev-Server kommt HTTP-Overhead pro Asset dazu (Erstladen einer Seite = Dutzende
  1–3-MB-Responses).
- Nebenbefund: **668 PNGs im src-Baum werden nie referenziert/gebündelt** (2078 src vs. 1410 out;
  großteils `ui/`, u.a. `ui/citadel/_library.html`-Sammlung). Kein Runtime-Effekt, aber Repo-Bloat —
  Kandidat für `ASSETS\archive\` (Chef-Regel „Eingebundene Assets archivieren").

**Hauptursache in einem Satz:** Quadratmeter-große Quell-PNGs (1254², 1–3 MB) werden beim Seiten-Mount
zu Dutzenden synchron instanziert (ohne lazy/async), jede dekodiert zu ~6 MB Raster — Datei-I/O ist
sekundär, Decode + Paint dominieren.

---

## 2. Durchgeführte verlustfreie Optimierung ✅

Werkzeug: **oxipng Level 4** (via pyoxipng), `strip=safe` (farbrelevante Chunks wie sRGB/gAMA/iCCP
bleiben erhalten), **kein** `optimize_alpha`, kein Downscaling, keine verlustbehaftete Stufe.
Level 6 und Zopfli wurden getestet: identisches Ergebnis wie Level 4 bei 1×/15× Laufzeit ⇒ Level 4.

**Verifikation strenger als gefordert:** nicht nur Stichprobe — **jede einzelne Datei** wurde vor dem
Ersetzen dekodiert und per `np.array_equal` (RGBA inkl. Alpha-Kanal) gegen das Original geprüft.
Ergebnis: 2078/2078 pixel-identisch, 0 Mismatches, 0 Fehler, 0 Skips (keine Datei wäre gewachsen).
Zusätzlich: 40 zufällige Dateien nachträglich dekodiert (0 Fehler), Dimensionen unverändert.
Hinweis: oxipng reduziert bei vielen Items verlustfrei den Farbtyp (RGBA→Palette) — dekodierte
Pixel identisch, Dateien deutlich kleiner.

### Ersparnis

**Gesamt: 690,12 MB → 607,34 MB = −82,78 MB (−12,0 %)** · Prod-Bundle: 627,2 → **552,9 MB** (−74,3 MB)

| Ordner | vorher MB | nachher MB | Ersparnis |
|---|---|---|---|
| monsters | 130,57 | 113,55 | −17,02 |
| icons | 103,01 | 87,79 | −15,22 |
| actions | 64,76 | 54,95 | −9,80 |
| portraits | 67,85 | 58,29 | −9,56 |
| sidebar | 37,64 | 30,90 | −6,74 |
| pets | 33,55 | 29,00 | −4,55 |
| (root bg_*) | 35,01 | 31,38 | −3,63 |
| ui | 24,29 | 20,94 | −3,35 |
| battlescreens | 51,74 | 48,79 | −2,95 |
| items | 32,54 | 30,08 | −2,46 |
| zones | 37,60 | 35,54 | −2,06 |
| skills | 9,94 | 8,07 | −1,87 |
| skill-backgrounds | 33,00 | 31,40 | −1,59 |
| foraging-cards | 17,94 | 16,74 | −1,20 |
| dungeons | 10,69 | 9,93 | −0,76 |

Grenze des Verlustfreien: die AI-Art ist fotografisch-rauschig — mehr als ~8–16 % pro Großdatei geht
ohne Qualitätsverlust nicht. Der Rest des Problems ist ein **Decode-/Render-Problem** → Abschnitt 3.

**Build-Verifikation:** `pnpm --filter @hearthforge/client build` grün (✓ built in 5.43s).

---

## 3. Code-Empfehlungen für ui-dev (priorisiert, NICHT umgesetzt)

> Qualität bleibt bei allen Punkten unangetastet — es geht nur um *wann/ob* dekodiert und gemalt wird.

### P1 — `loading="lazy"` + `decoding="async"` auf alle Inhalts-`<img>` (Effekt: hoch, Aufwand: klein)
Betroffene Stellen (Auswahl, alle ohne lazy):
- `pages/CombatPage.tsx:1022` (MonsterCard-Porträt — wichtigster Einzelfall), `:259` (Drop-Icons), `:1595`, `:1658`
- `pages/SkillPage.tsx:370` (skillcard-img), `:380`, `:387`
- `components/ItemCell.tsx:94` (hat `decoding="async"`, fehlt `loading="lazy"`)
- restliche Seiten: BestiaryPage, PetGalleryPage, ShopPage, SlayerPage, AchievementsPage, FarmPage …
Offscreen-Karten (Grid unter dem Fold) werden dann gar nicht erst dekodiert.
Erwartung: Mount-Zeit langer Grid-Seiten −50–70 %, da nur der sichtbare Viewport dekodiert.

### P2 — `content-visibility: auto` + `contain-intrinsic-size` auf Grid-Karten (Effekt: hoch, Aufwand: klein)
CSS-only: `.monster-card`, `.skillcard`, `.item-cell`-Grids (Bank/ItemBrowser/Bestiary/PetGallery).
Überspringt Layout+Paint (und damit auch CSS-`background-image`-Raster!) für Offscreen-Karten —
deckt das ab, was `loading="lazy"` bei `backgroundImage` (MonsterCard `:1018`) nicht kann.
Erwartung: zusammen mit P1 fällt der Decode-Burst beim Mount auf die ~6–12 sichtbaren Karten.

### P3 — Skillcard-Blur hoissen (Effekt: mittel-hoch, Aufwand: mittel)
`pages/SkillPage.tsx:362–367`: pro Karte eine eigene geblurte 2,7-MB-Hintergrund-Ebene
(`.skillcard-banner-bg` + CSS-Blur). Bei N Karten rastert die GPU N-mal. Besser: **eine** geblurte
Ebene pro Seite/Sektion (das Bild ist eh pro Skill identisch), Karten darüber mit transparentem
Banner; oder Blur durch vorberechneten CSS-Gradient-Overlay ersetzen. Foraging (`getForagingCard`)
hat Karten-individuelle Bilder → dort Blur-Radius klein halten oder P2 genügen lassen.

### P4 — Bestands-Deckel für die 1254²-Anzeige-Fälle (Effekt: sehr hoch, **braucht Chef-Entscheid**)
`icons/` (71×1254² für 16–48 px), `sidebar/` (30×1254² für 24–32 px), Monster-Karten (1254² für
~150 px) sind der strukturelle Kern des Problems: Die GPU skaliert JEDES Frame 1254²→28 px herunter —
die Original-Pixel sieht der Spieler nie. Ein Build-Step (z.B. sharp/vite-Plugin), der **zusätzliche**
Anzeige-Varianten erzeugt (z.B. 256 px für Icons/Sidebar, 512 px für Karten-Porträts) und die
Originale unangetastet als Quelle behält, wäre **visuell identisch** (korrekt gefiltertes Downscale
statt GPU-Downscale zur Laufzeit), spart aber >90 % Decode dieser Ordner.
Da die Direktive „kein Downscaling" lautet, hier bewusst NICHT umgesetzt — als Option dokumentiert.
Alternative in gleicher Richtung: Sprite-Atlas für die Icon-Fälle (ein Decode statt 70).
Erwartung: App-Start (Sidebar) −~190 MB Raster; Combat-Grid pro Zone −~50 MB Raster.

### P5 — Idle-Preload der wahrscheinlich nächsten Assets (Effekt: niedrig-mittel, Aufwand: klein)
Nach App-Mount in `requestIdleCallback` die Assets der aktiven Skill-Seite / aktuellen Kampfzone
via `new Image().src = url` vorwärmen (Decoded-Cache), damit der erste Seitenwechsel warm ist.
Nicht pauschal alles preloaden (552 MB!) — nur aktive Zone + zuletzt besuchte Seite.

### P6 — Virtualisierung nur bei Bedarf (Effekt: mittel, Aufwand: höher)
`pages/BankPage.tsx:134/188`, ItemBrowserPage: erst relevant, wenn P1+P2 nicht reichen (>500 Zellen).
Item-PNGs sind klein (320²/384², Ø ~30 KB) — vermutlich unnötig nach P1/P2.

### P7 — Nicht ändern / Housekeeping
- `assetsInlineLimit: 0` beibehalten (CSP-Grund dokumentiert in `electron.vite.config.ts:30–33`).
- 668 unreferenzierte src-PNGs (v.a. `ui/`) nach `ASSETS\archive\` verschieben — kein Perf-, aber
  Repo-Gewinn (separater asset-integrator-Task, nicht ui-dev).

---

## 4. Reproduktion / Werkzeuge

- Skript (Scratchpad, Session): oxipng L4 + Voll-Verifikation, 150 s Laufzeit bei 8 Workern.
  Neu-Lauf jederzeit möglich: `pip install pyoxipng`, `oxipng.optimize_from_memory(data, level=4, strip=StripChunks.safe())`, vor Replace `np.array_equal(decode_rgba(alt), decode_rgba(neu))`.
- Empfehlung: denselben Lauf als Repo-Skript/CI-Hook aufnehmen, damit neue Chef-Assets (AI-Art kommt
  unoptimiert) automatisch verlustfrei geschrumpft werden, bevor sie einchecken.
