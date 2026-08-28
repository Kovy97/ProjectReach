# Kampfeffekte: Konzept (Welle 1)

> Stand 27.08.2026, Claude für den Chef. Ziel: sichtbare Treffer im Auto-Kampf, gebaut auf dem vorhandenen FX-Layer,
> mit Sprites von Mira. Kein Balance-Eingriff, keine Engine-Änderung; alles läuft im Renderer aus dem Kampflog.
> Entscheidungen des Chefs am Ende (D1–D5).

## 1 Was heute da ist

Der Kampfscreen hat bereits einen Effekt-Layer (`arena-fx-layer`, WAAPI, gepoolte Elemente, drei Stufen
„voll / reduziert / aus" in den Optionen): Ausfallschritt der Figur beim Angriff, Funken am Einschlagpunkt,
Treffer-Blitz in der Statusfarbe, ein Zauber-Bolzen und ein Pfeil-Tracer als Linien, Arena-Shake bei Crits,
Sterbe-Animation, Status-Ring, Low-HP-Vignette, plus Treffer-/Block-Sounds je Waffenfamilie. Alles ist Form und
Farbe, keine Bilder. Genau da setzen die Sprites an: dieselben Auslöser, dieselben Anker, nur mit Mira-Bildern
statt Strichen. Fehlt ein Sprite, bleibt der heutige Effekt als Rückfall, das Ganze ist also stückweise lieferbar.

## 2 Vier Familien

| Familie | Auslöser (Kampflog) | Varianten Welle 1 | Anker / Ablauf |
|---|---|---|---|
| **A Magie-Geschosse** | Spieler oder Gegner greift im Magie-Stil an | Thema aus dem Waffeneffekt des Stabs/Zauberstabs/Fokus: **arkan** (Standard), **Feuer** (burn), **Frost** (frost/frostbite), **Blitz** (shock), **Gift/Natur** (poison/plaguebearer), **Leere/Schatten** (bane/execute, Leeren-Waffen), **Aether/Licht** (Aether-Kugel, Götzenfunken) | Geschoss startet an der Hand des Angreifers, fliegt ~200 ms zur Brust des Ziels, dann Einschlag-Sprite (~300 ms) im selben Thema; Crit = Einschlag 1,4× und Shake (wie heute) |
| **B Waffen-Slashes** | Nahkampf-/Fernkampf-Treffer | **Schnitt** (Schwert, Krummsäbel, Dolch), **schwerer Hieb** (Zweihänder, Große Axt, Streitaxt, Axt), **Wucht** (Streitkolben, Hammer), **Stoß** (Speer), **Pfeil** (Kurz-/Langbogen: Geschoss + Einschlag) | Slash-Sprite über der Trefferzone des Ziels (~250 ms, leicht rotiert je Angriff, gespiegelt für den Gegner); Pfeil wie Geschoss A |
| **C Treffer-/Blut-Effekte** | jeder gelandete Treffer, Block, Fehlschlag | **Blut rot** (Tiere, Menschen, Orks, Goblins), **Ichor dunkel** (Untote, Leere, Dämonen), **Knochenstaub** (Skelette, Gerüste), dazu **Block-Funken** und **Fehlschlag-Wischer** | Blut/Ichor/Staub als Spritzer am Einschlagpunkt (~350 ms, fällt leicht nach unten); Variante nach Monster-Familie (`creatureType`, sonst rot); Block-Funken auf dem Schild-Anker; Wischer als schwacher Luftzug hinter dem Ziel |
| **D Begleiter-Angriffe** | Begleiter-Fähigkeit feuert (16 Arten) | sechs Bildfamilien: **Biss/Kralle** (multiHit, burstDamage, armorRend), **Bolzen** (delayedDot, onHitStatus), **Schutz/Heilung** (shield, heal, blockNextEnemyHit, manaRestore, lifestealBurst), **Mal/Fluch** (accuracyDownEnemy, enemyAttackDelay, stun), **Diebesgriff** (stealDrop), **Crit-Stern** (guaranteedCrit, armorPierceHit) | Effekt am Ziel (Gegner) bzw. am Spieler bei Schutz/Heilung; kleine Begleiter-Silhouette blitzt am Rand auf (bestehendes Pet-Portrait), ~300 ms |

**Status-Ticks** (Brennen, Bluten, Gift, Frost, Schock) bekommen in Welle 2 eigene kleine Loops am Ziel; heute bleibt der Status-Ring.

## 3 Asset-Format (an Miras Werkzeug angepasst)

Mira erzeugt Einzelbilder mit echtem Alpha. Animierte Sprite-Sheets mit acht Frames sind für ihren Generator unzuverlässig
(Frames driften). Deshalb:

- **Drei Schlüsselbilder je Effekt** in EINEM Streifen: Beginn, Höhepunkt, Ausklang. Datei `fx_<familie>_<variante>.png`,
  768 × 256 (drei Felder à 256 × 256), Alpha, ohne Hintergrund, Motiv mittig je Feld. Der Renderer blendet die drei
  Bilder über und ergänzt Bewegung (Skalierung, Rotation, Verschiebung, Nachleuchten). Bei 250–350 ms Laufzeit
  reicht das vollständig.
- **Geschosse** sind ein Einzelbild (256 × 128, Flugrichtung nach rechts); Schweif und Flug macht der Renderer.
- Stil: Ashen-Iron-Palette, Malerei, keine Comic-Sterne, ein warmer Akzent je Thema; Blut gedeckt, kein Gore
  (Steam-Altersfreigabe bleibt, s. D3).
- Einbindung: `apps/client/src/renderer/assets/fx/fx_<familie>_<variante>.webp` (q90), Auto-Discovery per
  `import.meta.glob` wie bei den Kampf-Sounds. Fehlt eine Datei, spielt der heutige Form-Effekt.

Welle 1 komplett sind **etwa 40 Dateien**: 7 Geschosse + 7 Einschläge (A), 5 Slashes + Pfeil (B), 3 Spritzer +
Block + Wischer (C), 6 Begleiter (D), dazu je ein Crit-Overlay für A und B. Der **Testlauf** davor sind sechs
Dateien (s. Mira-Auftrag), um Format, Größe und Lesbarkeit auf dem Battlescreen zu prüfen, bevor die Serie läuft.

## 4 Technik im Renderer

- Ein neues Modul `combatFx.ts` (Auslöser → Sprite + Anker + Keyframes), gespeist aus denselben Log-Ereignissen,
  die heute `triggerHitFx`/`spawnBeam`/`spawnSparks` rufen. Der FX-Layer bleibt, bekommt aber `<img>`-Pool-Elemente
  neben den Spans.
- Themen-Auflösung: Waffe der angreifenden Seite → `weaponEffect.type` → Thema; Monster ohne Waffe → Thema aus
  Monster-Familie (Feuerschamane → Feuer). Blutfarbe → `creatureType`.
- Zeitbudget je Treffer ≤ 350 ms, maximal drei gleichzeitige Sprites je Seite, danach Recycling (Pool wie heute).
  „Reduziert" spielt nur Einschläge ohne Geschoss; „aus" bleibt aus; `prefers-reduced-motion` = reduziert.
- Sounds bleiben, Geschoss-Einschlag löst den vorhandenen `<set>_impact`-Sound am Ankunftszeitpunkt aus statt sofort.
- Testbarkeit: Harness-Assertion über die `data-*`-Zähler des FX-Layers (bestehendes Muster `bumpFx`), Screenshot
  mit eingefrorener Animation (WAAPI `pause()` bei 50 %).

## 5 Reihenfolge

1. Mira: Testlauf sechs Dateien (arkanes Geschoss + Einschlag, Feuer-Einschlag, Schwert-Schnitt, Blut rot, Begleiter-Biss).
2. Claude: `combatFx.ts` + Einbindung der sechs, Screenshots 1920/1366, Chef-Abnahme am laufenden Kampf.
3. Mira: Serie Welle 1 (~40) im gleichen Guss; Claude bindet stückweise ein (jede Datei ersetzt ihren Rückfall).
4. Welle 2: Status-Loops, Champion-Sondereffekte, Dungeon-Boss-Einleitungen mit Sprite.

## 6 Entscheidungen des Chefs (entschieden 27.08.2026)

- **D1 Themen:** alle sieben Magie-Themen (arkan, Feuer, Frost, Blitz, Gift, Leere, Aether).
- **D2 Format:** drei Schlüsselbilder je Effekt in einem Streifen; Geschosse als Einzelbild.
- **D3 Blut:** gedeckte Spritzer, kein Gore, keine Verstümmelung.
- **D4 Umfang:** alle vier Familien in Welle 1, keine Aufteilung.
- **D5 Gegner:** dieselben Sprites gespiegelt; eigene Varianten erst für Champions in Welle 2.

## 7 Sequenzen, Varianten, Crit (28.08.2026)

Chef-Feedback zu Welle 1: „mehr Frames pro Effekt, Projektile zu schnell, wir sehen die Assets nicht" —
plus Wunsch nach zufälligen Varianten und einem Crit-Special. Reiner Renderer-Umbau (`combatFx.ts` +
CombatPage.tsx Battle), kein neues Asset-FORMAT — §3 gilt weiter für Einzelbild-Geschosse und Ein-Feld-
Rückfälle, das Folgende ist die Erweiterung für Mehrfeld-Sequenzen.

**Namenskonvention** je Effekt-Schlüssel `<familie>_<thema/variante>` (z.B. `missile_fire`,
`impact_fire`, `slash_cut`, `blood_red`, `pet_bite`):

- `fx_<key>.webp` — Basisdatei (Pflicht, wie bisher; bleibt der garantierte Rückfall).
- `fx_<key>_v1.webp` … `fx_<key>_v9.webp` — optionale Varianten. Existieren welche, spielt der
  Renderer beim Abspielen zufällig eine aus dem Pool (Basisdatei + alle vorhandenen `_v*`), NIE
  zweimal hintereinander dieselbe (bei nur zwei Varianten erzwingt das strikte Alternation).
  Fehlen sie, ändert sich nichts — die Basisdatei spielt wie bisher.
- `fx_<key>_crit.webp` — optionale Crit-Sonderdatei. Existiert sie, ersetzt sie bei kritischen
  Treffern die normale Zufallsauswahl komplett (kein Pool-Eintrag, kein "nicht zweimal
  hintereinander" nötig). Fehlt sie, wählt ein Crit ganz normal aus dem Varianten-Pool. Getrennt
  vom bestehenden Crit-OVERLAY (`fx_crit_magic`/`fx_crit_weapon`), das unverändert zusätzlich
  obendrauf gelegt wird.
- Gilt generisch für JEDEN Effekt-Schlüssel (Geschosse, Einschläge, Slashes, Blut, Begleiter,
  Miss/Block) — keine Codeänderung nötig, wenn ein weiteres Thema in diesem Schema nachgeliefert
  wird.

**Feldzahl statt fix drei/eins:** die Feldanzahl eines Streifens wird aus der Bildbreite abgeleitet
(Breite ÷ Feldbreite; Feldbreite = Bildhöhe bei den quadratischen Familien B–D/Crit-Overlay, das
Doppelte der Bildhöhe bei Geschossen, deren Felder 256×128 statt quadratisch sind). Ein Streifen
kann also 1, 3, 5 oder beliebig viele gleich breite Felder haben; sie spielen gleichmäßig über die
volle Effektdauer als Crossfade ab. Drei Felder verhalten sich dabei bit-identisch zum bisherigen
Verhalten (eigene Kurve `STRIP_CELL_KEYFRAMES`), andere Feldzahlen bekommen ein generisches
gleichmäßiges Crossfade-Raster (`buildStripKeyframes` in CombatPage.tsx).

**Tempo (Konstanten in CombatPage.tsx Battle):**

| Konstante | vorher | nachher | Effekt |
|---|---|---|---|
| `MISSILE_FLIGHT_MS` (Projektil-Flugzeit) | 200ms | 560ms | Geschoss bleibt ~500–600ms sichtbar unterwegs (Chef-Ziel) statt fast unsichtbar |
| `IMPACT_FX_MS` (Einschlag-Dauer, Familie A/B-Landung) | 300ms | 390ms (+30%) | Einschlag-Sprite bleibt länger lesbar |

Slash/Blut/Pet/Miss/Block-Dauern sind unverändert (nicht Teil des Feedbacks). Die Frame-Sequenz
eines Geschosses läuft über dieselbe Dauer wie der Flug, damit eine Mehr-Felder-Sequenz sichtbar
„lebt". Die Effektstufe aus den Optionen (voll/reduziert/aus) greift unverändert: „reduziert"
spielt weiterhin nur Einschläge ohne Geschoss und ohne Blut.

Erste Serie in diesem Schema: `CODEX/work/2026-08-28-kampfeffekte-feuer/` (Feuer-Geschosse v1–v3 +
Crit, Feuer-Einschläge v1–v3, je 5 bzw. 3 Felder) — die übrigen sechs Magie-Themen folgen nach
Chef-Abnahme im selben Format.

Serie Welle 1 (33 Dateien, davon 6 aus dem Testlauf): `CODEX/work/2026-08-27-kampfeffekte-welle-1/PROMPTS.md`.
