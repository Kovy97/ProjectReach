# Arena-Abnahme Runde 1 — Pastures / Crypt / Slagpit (2026-08-04)

Live aus dem Arena25D-Prototyp gerendert (echter Vite-Dev-Server + Playwright-Chromium mit echtem
GPU-Pfad, `--use-gl=angle --use-angle=d3d11` — kein SwiftShader-Software-Rendering, keine
gemockten Bilder). Zonen direkt über `state.combat.monsterId` angesteuert (Bypass der Zonen-
Auswahl-UI, `Battle()` rendert bei gesetztem `monsterId` sofort den Kampf), Charakter = Fixture
`midgame` (Mira Ashfall, Kampfstil Nahkampf/Stahlkriegsaxt). Skript:
`apps/client/ui-audit/arena-abnahme-runde1-shots.mjs` (wiederverwendbar für Runde 2).

Pro Zone: Monster der Zone (Pastures→Wildziege, Crypt→Skelettkrieger, Slagpit→Glutelementar),
1920×1080 + 3440×1440, je ein weiter Stimmungs-Shot + ein bis zwei Nahkampf-Clash-Momente
(zeitgesteuert über `combat.playerTimerMs/enemyTimerMs` abgepasst, nicht blind gesampelt — trifft
den Windup→Sprint→Clash-Moment zuverlässig). Zusätzlich ein ~21s Duell-Video aus der Krypta
(stimmungsvollste Zone: kühles Mondlicht durch ein Rosettenfenster, stärkster Kontrast zur warmen
Pastures-Basis).

## Dateien

| Datei | Beschreibung |
|---|---|
| `pastures-01-weite-zonenstimmung-{1920x1080,3440x1440}.png` | Weiden-Übersicht: Ritter vs. Wildziege, warmes Nachmittagslicht, Gehöft + Zaun im Hintergrund, Miras Props (toter Strauch, Zaunpfosten, Steppenläufer) im Bild. |
| `pastures-02-idle-duell-1920x1080.png` | Lauer-Moment nach dem ersten Schlagabtausch, beide Kämpfer zurück auf Position, Schadenszahlen/Log sichtbar. |
| `pastures-03-sturz-clash-funken-{1920x1080,3440x1440}.png` | Voller Melee-Clash: Ritter läuft in die Ziege hinein, Funken-/Impact-Glow an den Füßen. |
| `crypt-01-weite-zonenstimmung-{1920x1080,3440x1440}.png` | Krypta-Übersicht: gotische Arkaden, kühler Mondlicht-Strahl von oben, Grabstein + brennende Fackel als Props. |
| `crypt-02-idle-duell-1920x1080.png` | Rückzug-Moment nach einem Treffer, beide Kämpfer sichtbar, Fackel-Flamme + Grabstein im Bild. |
| `crypt-03-sturz-clash-funken-{1920x1080,3440x1440}.png` | Voller Clash, Skelett fast verdeckt vom Ritter, warmer Funken-Blitz gegen das kühle Blau. |
| `slagpit-01-weite-zonenstimmung-{1920x1080,3440x1440}.png` | Schlackengrube-Übersicht: Glut-Industrieanlage links, vereiste Seilbahn-Gerüste rechts, Ritter vs. Glutelementar (mit Ward-Balken). |
| `slagpit-02-idle-duell-1920x1080.png` | Zweiter Clash-Frame, zeigt HP/Ward-Kontext (260/342, Ward 95/102) mitten im Schlagabtausch. |
| `slagpit-03-sturz-clash-funken-{1920x1080,3440x1440}.png` | Voller Clash, Elementar umschlingt den Ritter, "-43"/Ward-Absorb-Zahlen sichtbar. |
| `crypt-duell-20s.webm` | ~21s echtes Duell in der Krypta (Setup-Zeit rausgeschnitten), Idle→Schlagabtausch→HP-Verfall, kein Skript-Fake. |

## Urteile je Zone

**Pastures** — Trägt Miras Nachmittags-Stimmung sauber (warmes Gold, `#e8c98a`-Fog-Tint spürbar,
keine Übersättigung). Alle 4 Props sitzen im Raum verteilt (2 Rand-Bäume/Büsche links/rechts, 2
Mittelgrund-Requisiten vor dem Zaun) — nichts schwebt, nichts clippt durch die Kämpfer, die
Boden↔Kulisse-Naht ist durch den gemalten Feldweg/Zaun im Backdrop kaschiert. **Verdikt: GO.**

**Crypt** — Stärkster Stimmungswechsel der drei Zonen: kühles Mondlicht (`sunColor #b8d6ed`) fällt
durch ein Rosettenfenster, Fog dunkel-navy, Sättigung spürbar runtergezogen — exakt "gruftig-
düster" statt nur "dunkler Pastures-Klon". Grabstein-Prop sitzt sauber auf dem Boden links, Fackel
rechts brennt sichtbar (eigene Partikel/Glow), Tiefensortierung gegen die Kämpfer korrekt. Einzige
Randnotiz: die Szene ist SEHR dunkel (bewusst laut Manifest, `ambientIntensity 0.82`) — auf einem
schlecht kalibrierten Monitor könnte der hintere Arkadenraum absaufen; kein Blocker, aber der
CEO sollte das am eigenen Bildschirm gegenchecken. **Verdikt: GO.**

**Slagpit** — Dritte klar eigenständige Identität: Glut-Industrie links (Fördertürme, Feuerschein),
vereiste Seilbahn-Konstruktion rechts — "Schlackengrube & Frostkavernen" ist beides gleichzeitig
lesbar, nicht nur Glut. Zwei Gerüst-Props im Ultrawide-Bild rahmen die Kämpfer gut, Ember-Rock-Props
am Boden sitzen sauber. Der Glutelementar selbst (Miras Content, nicht diese Runde) trägt die Szene
zusätzlich mit eigenem Feuer-Partikel-Look. **Verdikt: GO.**

## Auffälligkeiten (Skript-Artefakte, KEINE Manifest-/Asset-Befunde)

- **Pastures-HP-Balken zeigt "129/41" bzw. "140/41".** Bewusst überhöhter `enemyHp`-Testwert im
  Render-Skript (Wildziege stirbt gegen das midgame-Loadout sonst in 1-2 Treffern, zu kurz für
  Idle+Clash-Aufnahmen) — reines Aufnahme-Artefakt, keine Content-/Balance-Änderung nötig oder
  vorgenommen. Für Runde 2 könnte ein zäheres Pastures-Monster (z.B. `bull_boss`) das vermeiden.
- **Slagpit: Charakter ist während der allgemeinen Burst-Aufnahme gestorben** ("Du bist gefallen"-
  Overlay in den rohen Zwischenständen, nicht in den finalen Bildern). Der Glutelementar (Stufe 168,
  75 Schaden/Hit) ist für das midgame-Fixture (85 HP) schlicht zu stark — erwartetes Verhalten,
  kein Bug. Die finalen Screenshots sind alle VOR dem Tod eingefangen.
- Keine schwebenden/clippenden Props in den geprüften Bildern gefunden; keine sichtbare harte
  Boden↔Kulisse-Naht in einer der drei Zonen.

## Gesamtempfehlung

**Runde-2-GO: JA.** Alle drei Pilot-Zonen tragen ihre jeweilige Stimmung klar erkennbar, Props
sitzen korrekt im Raum, die Melee-Choreografie (Windup→Sprint→Clash mit Funken→Rückzug) funktioniert
sichtbar in allen drei Zonen und im Video. Keine Asset-/Manifest-Korrektur nötig — Mira kann mit der
verbleibenden 8er-Zonen-Serie weitermachen.
