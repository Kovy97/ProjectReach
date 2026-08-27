# Asset-Brief — Fasern, Stoff und Jagen (27 Dateien)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 27.08.2026 (Chef-Entscheide J1–J7). Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Prompts:** `PROMPTS.md`. **Konzept:** `design/handwerk-fasern-jagen/konzept.md`, Technik `spec-technik.md`.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Fasern, Stoff und Jagen |
| Zielversion | 1.2.0 „Fasern und Fallen" (Kern des Updates), Priorität P1 |
| Umfang | 20 Item-Icons 640 × 640 Alpha (5 Fasern, 5 Saaten, 5 Stoffe, Köder, Falle in 3 Zuständen als UI-Bilder, Meisterring Jagen), 5 Sammel-Karten 1672 × 941 deckend, 1 Aktions-Karte 1254 × 1254 deckend (Köder graben), 1 Sidebar-Icon 1254 × 1254 (Plakette, außen Alpha) |
| Stil | Ashen-Iron-Palette, gemalt; Materialien OHNE Glühen (Regel), Ausnahme: Sternflachs/Sternweb dürfen schwach leuchten (Stufe 5); Sammel-Karten wie die vorhandenen `assets/foraging-cards/`, Aktions-Karte wie `assets/actions/`, Sidebar-Icon wie `assets/sidebar/` |
| Fasern in fünf Stufen | Nessel (grau-grün, grob), Flachs (strohgold), Dornhanf (dunkeloliv, Dornen), Geisterseide (silberweiß, halbtransparent), Sternflachs (blassgold, Sternflecken); die Stoffe nehmen dieselbe Farbfamilie auf, damit die Stufe auf einen Blick lesbar ist |
| Falle | dieselbe Eisenschlinge in drei Zuständen (leer, gestellt mit Ködertopf, zugeschnappt mit Sack); kein Blut |
| Lieferung | `CODEX/assets/fasern-jagen-2026-08-27/fertig/` (+ raw/, qa/ mit Kontaktbogen), danach HANDOFF/WORKLOG; gern in Teilen (Items zuerst, dann Karten) |
| Nicht anfassen | Renderer; Einbau macht Claude (Items WebP q92, Karten q85) |

**Woran Claude Erfolg erkennt:** 27 Dateien mit exakten Namen und Maßen, Alpha-Prüfung der 21 Freisteller bestanden, Kontaktbogen zeigt die fünf Stufen als klare Farbleiter, die drei Fallen-Zustände sind dieselbe Falle.

# Teil B – Produktionsplan (Mira)

<!-- codex:2026-08-27T23:41:00+02:00 -->

1. Bestandsreferenzen der Item-, Foraging-, Action- und Sidebar-Familien visuell prüfen.
2. 19 Item-Motive als fünf klar gestufte Materialfamilien plus Köder und drei Zustände derselben
   Eisenschlinge einzeln mit nativem Alpha erzeugen.
3. Fünf deckende Foraging-Orte, die deckende Aktionskarte und die außen transparente
   Jagen-Plakette erzeugen.
4. Akzeptierte Raws unverändert sichern; Freisteller ausschließlich alphaerhaltend zuschneiden,
   proportional skalieren und zentrieren. Szenen deckend auf das Zielmaß bringen.
5. Dateinamen, Maße, Modus, Außenrand und Teiltransparenz automatisch messen; Farbleiter,
   Fallen-Zustände und Szenen auf Kontaktbögen visuell abnehmen.

# Teil C – QA-Protokoll (Mira)

<!-- codex:2026-08-27T23:41:00+02:00 -->

- PASS: 26/26 exakte Content-IDs und PNG-Dateinamen.
- PASS: 19/19 Item-Icons sind 640 × 640 RGBA; `sidebaricon_hunting.png` ist 1254 × 1254 RGBA.
- PASS: Alle 20 Freisteller besitzen echtes natives Alpha, weiche Teiltransparenz und einen
  vollständig transparenten Außenrand. Kein Keying und kein nachträgliches Freistellen.
- PASS: Fünf Foraging-Karten sind 1672 × 941 RGB und `dig_bait.png` ist 1254 × 1254 RGB;
  alle sechs sind vollständig deckend.
- PASS: Die fünf Stufen bilden in Fasern, Saaten und Stoffen dieselbe Farbleiter. Sternflachs
  und Sternweb tragen nur schwache punktuelle Sternakzente.
- PASS: `trap_empty`, `trap_set` und `trap_caught` sind als leere, gestellte und zugeschnappte
  Fassung derselben geschmiedeten Fallenfamilie lesbar; kein Blut oder Tierkörper.
- PASS: Kontaktbögen auf dunklem und grellrosa Grund zeigen saubere Silhouetten ohne
  Hintergrundreste. Karten und Sidebar-Plakette wurden ebenfalls visuell gegengeprüft.
- Messwerte und Quellenpfade: `CODEX/assets/fasern-jagen-2026-08-27/qa/`.

# Teil D – Übergabe (Mira)

<!-- codex:2026-08-27T23:41:00+02:00 -->

- Produktionsfertige PNGs: `CODEX/assets/fasern-jagen-2026-08-27/fertig/`
- Akzeptierte native Ausgaben: `CODEX/assets/fasern-jagen-2026-08-27/raw/`
- Kontaktbögen, Messwerte und Quellenkarte: `CODEX/assets/fasern-jagen-2026-08-27/qa/`
- Produktionsnotiz: `CODEX/work/2026-08-27-fasern-jagen-assets/PRODUCTION.md`
- Renderer, Content, Engine, Saves und `.claude/**` blieben unangetastet. WebP-Konvertierung,
  Einbau und Runtime-Abnahme übernimmt Claude.
