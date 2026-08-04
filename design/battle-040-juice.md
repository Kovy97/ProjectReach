# Battle-Juice 0.4.0 — Der 2D-Kampfschirm wird spürbar lebendig

**Status:** Design-Brainstorm (kein Code). **Autor:** Balance-Designer, 2026-08-03.
**Umsetzung:** ui-dev (Renderer only). **Harte Gesetze:** Präsentation LIEST nur CombatEvents/State,
null Engine-Eingriff, offline==online bleibt byte-gleich; GPU-only transform/opacity; kein
`will-change` auf großen Ebenen; keine Dauer-Repaints; 60 fps @ 3440×1440; Reduced-Motion respektiert.

**Anspruch:** „Sehenswert, nicht anstrengend." Der Screen läuft im Zweifel 10 Stunden am Stück —
jeder Effekt muss den 10h-Idle-Test bestehen: Momente dürfen knallen, der Grundzustand bleibt ruhig.

---

## 0. Bestandsaufnahme (Stand 0.3.x — WICHTIG: es existiert schon viel)

Die Memory-Notiz „Combat-FX = späterer Meilenstein" ist überholt: Task #296 P0 und die
Kampf-Juice-Welle (Chef-GO 2026-07-12) haben bereits ein solides Fundament gelegt.
0.4.0 **baut darauf auf, ersetzt nichts**. Relevante Dateien:

- `G:\GameDev\apps\client\src\renderer\pages\CombatPage.tsx` (Fighter, FX-Layer, Event-Verarbeitung)
- `G:\GameDev\apps\client\src\renderer\styles\combat.css` (alle FX-Selektoren, Keyframes)
- `G:\GameDev\apps\client\src\renderer\util\particles.ts` (Zonen-Ambient-Canvas)
- `G:\GameDev\apps\client\src\renderer\util\uiPrefs.ts` (`CombatFxLevel` full/reduced/off)

| Bereich | Existiert bereits |
|---|---|
| Treffer-Feedback | Hit-Flash-Overlay am Getroffenen (Gold bei Crit), Recoil 10/16 px (`artRef`), Scale-Punch 1.04 + Brightness-„Weißblitz" mit ~60 ms-Plateau (`punchRef`), Arena-Shake NUR bei Crits (4 px/160 ms) |
| Partikel | Gepoolte Einschlags-Funken (Pool 36, WAAPI), Gold-Funken beim Kill, elementfarbener Einschlag-Flash (Pool 3) |
| Angriffs-Anzeige | Melee-Lunge ±55 px (400 ms), Cast-Keyframes (Brightness/Hue), arkaner Bolt (~200 ms) + Runen-Ring unterm Caster (Pool 2), Bogen-Tracer (~130 ms), Pet-Sprung + Ability-Glow (4 Farb-Buckets) |
| Floater | hit 44 px / crit 60–68 px mit Glow-Pop / magic violett / heal grün mit Quell-Icon / dot orange seriell / lifesteal / miss „0" blau / XP-Drop gold / Status-Proc-Label / Ward-Absorb cyan; Zufalls-X ±30 px; `floatUp` 2.6 s transform-only |
| Momente | Kill-Flourish (Entsättigen + Absacken 650 ms + Dissolve), Kill-Karte mit 400 ms verzögertem Entrance, Dungeon-Wellen-Banner (3.4 s), Boss-Intro mit 8 s-Atempause + Truhe, Champion-Defeat-Zeremonie, Low-HP-Vignette < 25 % (1.6 s-Puls) |
| Bühne | Ken-Burns-Kulissen-Drift 55 s (nur Hochformat-Kulissen; Querformat = statisch), Zonen-Ambient-Canvas mit 5 Themes (ember/frost/spore/dust/void, 16–24 Partikel, rAF, DPR-Cap 2, Tab-Pause), Holzrahmen-Arena, VS-Mitte |
| Audio | Waffen-Sound-Sets (attack + impact/blocked mit 140 ms Delay), Cast/CastWeak, Synth-Fallback, Death, Heal |
| Infrastruktur | `fxLevel` full/reduced/off (+ `prefers-reduced-motion` ⇒ off), FX-Layer nur bei „full" im DOM, `data-*`-Zähler (`bumpFx`) als juice-check-Assertion-Anker, `fxRect()` = Layout-Read NUR am Trigger |

**Korrektur zum Briefing:** Der Kulissen-Drift ist NICHT weg — er läuft (Ken-Burns, 55 s), ist aber
für die Querformat-Kulissen (Turm-Etagen 2–5) bewusst deaktiviert. Die echte Lücke ist dort (→ §5.1).

**Die eigentliche 0.4.0-Diagnose:** Alles Vorhandene feuert **simultan im Event-Moment** — Lunge,
Flash, Zahl, Funken, alles im selben Frame. Was fehlt, ist **Choreografie in der Zeit**: Anlauf →
Einschlag → Nachklang. Das ist der rote Faden dieses Docs.

---

## 1. Treffer-Physik

### 1.1 Echte Impact-Frames (S)
- **Idee:** Beim Crit 1–2 Frames harter Kontrast statt des weichen Brightness-Punchs: Frame 1
  Voll-Weiß (`filter: brightness(3) saturate(0)`), Frame 2 Schwarz-Silhouette (`brightness(0)`),
  dann normal. Bei normalen Treffern nur der 1-Frame-Weißblitz.
- **Wirkung:** Der klassische „Anime-Impact" — Wucht entsteht durch harte Diskontinuität, nicht
  durch Amplitude. Sekundenbruchteil, daher 10h-tauglich.
- **Skizze:** Bestehende `hitPunchKeyframes()` um eine `steps(1)`-Variante ergänzen (WAAPI-easing
  `steps()` auf dem vorhandenen `punchRef`-Wrapper). Kein neues Element, kein neuer Layer.
- **Perf:** `filter` nur auf Sprite-großem Wrapper (Bestand macht das schon), ~100 ms Laufzeit.
  Unkritisch.

### 1.2 Crit-Squash & Stretch (S)
- **Idee:** Crit-Getroffener: `scale(1.08, 0.92)` → `scale(0.97, 1.05)` → `scale(1)` (~200 ms).
  Der Sprite wird kurz „gestaucht" wie von einem physischen Schlag.
- **Wirkung:** Statische PNGs wirken plötzlich wie Körper mit Masse. Zusammen mit 1.1 der größte
  Treffer-Physik-Gewinn pro Zeile Code.
- **Skizze:** Erweiterte Keyframes auf `punchRef` (der Wrapper ist transform-frei gegenüber Recoil/
  Lunge — die Kollisions-Trennung existiert schon, s. Kommentare an `figureRef`/`artRef`/`punchRef`).
- **Perf:** transform-only, unkritisch.

### 1.3 Hit-Stop per Keyframe-Plateau ausbauen (S)
- **Idee:** Der vorhandene Punch hat schon ein ~60 ms-Plateau. Bei Crits auf 90–110 ms verlängern
  und Recoil + Squash **dasselbe Plateau** geben, sodass alle drei Transformationen synchron
  „einfrieren" und synchron lösen.
- **Wirkung:** Fühlt sich wie Hit-Stop an, OHNE irgendetwas zu pausieren. Für 90 % der Fälle reicht das.
- **Skizze:** Nur Keyframe-Offsets angleichen. Kein neuer Mechanismus.
- **Perf:** Null Zusatzkosten.

### 1.4 Globaler Mikro-Hit-Stop (Kür, M)
- **Idee:** Bei Kill (und optional Crit ≥ X % Max-HP): alle laufenden WAAPI-Animationen im
  Stage-Subtree für 60–80 ms einfrieren (`el.getAnimations({subtree:true})` →
  `updatePlaybackRate(0)`, per Timeout zurück auf 1).
- **Kaschierung der weiterlaufenden Engine:** Der Kampf rendert mit ~10 Hz (100 ms-Takt, s.
  Timer-Kommentar in CombatPage). Ein Freeze ≤ 80 ms liegt UNTER einem Render-Tick — HP-Balken,
  Timer und Log springen also gar nicht sichtbar, weil zwischen zwei State-Renders ohnehin nichts
  passiert. Die Engine tickt unberührt weiter; nur die Präsentations-Uhr hält kurz an.
- **Leitplanken:** Throttle max. 1×/500 ms; niemals bei normalen Treffern; Timeout-sicher aufräumen
  (Unmount/Seitenwechsel). Genau deshalb Kür: der Mechanismus braucht saubere Lifecycle-Pflege.
- **Perf:** Pausieren ist gratis; Risiko ist nur Komplexität, nicht Framerate.

### 1.5 Treffer-Partikel: Richtung + Material (M)
- **Idee:** Funken fliegen heute radial. Neu: Streurichtung vom Angreifer weg (±40° Kegel) und
  Material-Färbung nach `defenseType` des Getroffenen: armor = orange Funken (Bestand),
  evasion = brauner Staub-Puff, ward = cyan „Glassplitter" (matcht die Ward-Raute).
- **Wirkung:** Treffer erzählen Physik UND lesen die Rüstungs-Trinität — der Spieler sieht am
  Partikel, gegen welchen Verteidigungstyp er schlägt. Doppelnutzen Juice + Information.
- **Skizze:** `spawnSparks()` bekommt Richtungs- und Farbparameter; Farben als CSS-Klassen analog
  `fx-spark.gold`. Pool 36 bleibt.
- **Perf:** identisch zum Bestand (gepoolte Spans, transform/opacity).

---

## 2. Floater 2.0

### 2.1 Gewichts-Hierarchie (S)
- **Idee:** Zahlen bekommen „Masse": normale Hits kleiner + schneller weg (36 px, 1.8 s statt
  44 px/2.6 s), Crit bleibt groß + langsam (Bestand 68 px/2.6 s mit Pop), DoT-Ticks klein (24 px)
  und kurz (1.4 s), Heilung eigener seitlicher Bogen (translate-Kurve nach außen-oben statt
  senkrechtem `floatUp`), XP-Drop bleibt wie er ist (OSRS-Erbe, funktioniert).
- **Wirkung:** Das Auge sortiert ohne Lesen: groß + langsam = wichtig. Aktuell konkurriert jeder
  Nebenkriegsschauplatz mit der Hauptzahl.
- **Skizze:** Reines CSS (Größen/Dauern je vorhandener Modifier-Klasse) + eine zweite
  Keyframe-Bahn `heal-arc` (2-Achsen-translate, transform-only).
- **Perf:** unverändert.

### 2.2 Lane-System statt Zufalls-Stapel (S)
- **Idee:** Statt `x = random(±30 px)`: 5 feste Lanes pro Seite (−60/−30/0/+30/+60 px),
  Round-Robin-Vergabe. Gleichzeitige Zahlen können sich nie mehr überdecken.
- **Wirkung:** Bei schnellen Waffen + DoT + Pet stapeln sich heute Zahlen unleserlich übereinander.
  Lanes lösen das mit 3 Zeilen Logik.
- **Skizze:** Lane-Zähler als Ref neben `idRef`, Vergabe im Spawn-Pfad. Zufalls-Jitter ±6 px darf
  bleiben (organisches Gefühl).
- **Perf:** null.

### 2.3 Zahlen-Batching bei Serien (M)
- **Idee:** 250 ms-Sammelfenster je (Seite × Typ): DoT-Ticks und Hit-Serien > 3/s werden zu EINER
  Zahl mit Zähler zusammengelegt („87 ×3" bzw. laufend hochzählende Zahl). Crits werden NIE
  gebatcht (jeder Crit ist ein Moment). Zusätzlich harter Cap: max. 10 aktive Floater je Seite,
  ältester fliegt (heute ist das Array unbegrenzt — mit schneller Waffe + 2 DoTs + Pet real ~15+).
- **Wirkung:** Späte Builds (schnelle Waffe, Multi-DoT) bleiben lesbar statt Zahlenregen; nebenbei
  ein Perf-Deckel.
- **Skizze:** Sammel-Puffer im Event-Effect (der Loop über `cs.log` existiert), Flush per Timeout.
  Der Batch-Text ist ein normaler Floater, kein neuer Rendertyp.
- **Perf:** REDUZIERT Last (weniger DOM-Knoten, weniger parallele Animationen).

### 2.4 Kill-Zahl verweilt (Kür, S)
- **Idee:** Die Zahl des tödlichen Schlags steigt nicht auf, sondern bleibt ~400 ms an Ort und
  Stelle stehen, färbt gold und zerfällt dann mit dem Sprite.
- **Wirkung:** „DER Schlag hat ihn erlegt" wird als Einzelmoment lesbar.
- **Skizze:** Beim `kill`-Event den zuletzt gespawnten Schadens-Floater der Gegnerseite umklassen.
- **Perf:** null.

---

## 3. Angriff sichtbar machen (Anlauf → Einschlag)

### 3.1 Windup aus dem Angriffs-Timer — der 0.4.0-Herzschlag (M)
- **Idee:** Die UI KENNT den nächsten Angriff im Voraus (`timerRemainingSec` beider Seiten wird
  schon für den Countdown gerendert). Bei Restzeit < ~0.35 s spielt die angreifende Figur ein
  Vorspann-Tell: Melee lehnt sich 2–3 px zurück und duckt minimal (Anlauf), Magie lädt Glow +
  Runen-Ring schon VOR dem Event auf, Ranged spannt (leichtes `scaleX`-Ziehen). Der Event-Moment
  selbst wird dann zum ENTLADEN: Lunge/Bolt/Tracer wie bisher.
- **Wirkung:** Der größte Einzelgewinn des Pakets. Aus „beide zucken gleichzeitig, wenn die Engine
  würfelt" wird eine lesbare Kampf-Choreografie mit Antizipation — das Prinzip, das jede gute
  Action-Animation trägt. Der Kampf bekommt Rhythmus, ohne dass sich eine Zahl ändert.
- **Determinismus:** Rein lesend (Timer sind State). Kein Vorgriff auf das ERGEBNIS (ob Hit/Miss/
  Crit weiß nur die Engine) — das Tell zeigt nur „gleich schlägt er", nie „gleich trifft er".
  Timer-Änderungen (Stun o. ä.) brechen das Tell einfach ab; bei 10 Hz fällt das nicht auf.
- **Skizze:** Abgeleiteter Boolean je Seite im 10 Hz-Render (`remaining < 0.35`), CSS-Klasse
  `windup` auf `figureRef`-Ebene, Transform-Keyframes. Cast-Aufladung: `spawnRuneRing()` beim
  Windup-Beginn statt beim Event feuern, Bolt bleibt am Event.
- **Perf:** eine Klasse, eine kleine transform-Animation je Angriff. Unkritisch.

### 3.2 Melee-Kontakt-Lunge (Kür, M)
- **Idee:** Lunge-Distanz nicht fix ±55 px, sondern ~65 % der realen Distanz zum Ziel (`fxRect()`
  beider Figuren, Read nur am Trigger — Muster existiert in `spawnBeam`). Einschlags-FX (Flash/
  Funken/Zahl) erst am Lunge-Apex (~180 ms nach Event) statt sofort.
- **Wirkung:** Schlag und Einschlag hängen kausal zusammen; Melee liest sich als Kontakt.
- **Risiko:** 180 ms Feedback-Verzögerung auf JEDEM Treffer will erspielt sein — als Kür testen,
  nicht blind ins Kernpaket. Bei schnellen Waffen (< 2 s Intervall) Verzögerung halbieren.
- **Perf:** unverändert (dieselben Effekte, nur später).

### 3.3 Ranged-Projektil-Upgrade (S)
- **Idee:** Der 2 px-Tracer bekommt eine Pfeilform (schmales CSS-Dreieck am Streif-Kopf) und einen
  minimalen Bogen (2-Segment-translate mit Zwischen-Keyframe +6 px Y). Am Ziel ein kleiner
  Einschlags-Puff (2–3 Funken aus dem Pool).
- **Wirkung:** Ranged fühlt sich wie ein Geschoss an, nicht wie ein Laserpointer.
- **Skizze:** Erweiterung von `spawnBeam("tracer")`; Pool 4 bleibt.
- **Perf:** unkritisch.

### 3.4 Cast-Nachglühen (S)
- **Idee:** Nach dem Einschlags-Flash bleibt 300 ms ein schwaches elementfarbenes Glimmen am Ziel
  (Opacity-Ausklang des vorhandenen `fx-flash`, zweite Keyframe-Phase).
- **Wirkung:** Magie bekommt „Nachklang" — Aufladung (3.1) → Bolt → Einschlag → Verglimmen ist
  eine komplette Zauber-Erzählung.
- **Perf:** dieselben gepoolten Elemente, nur längere Opacity-Kurve.

---

## 4. Momente

### 4.1 Kill-Upgrade: Blitz + Zerfall in Partikel + Mikro-Zeitlupe (M)
- **Idee:** Kill-Sequenz neu getaktet: (1) 2-Frame-Weißblitz auf dem Sprite, (2) 12–16 dunkle
  „Asche-Motes" aus der Sprite-Silhouette (Spark-Pool, nach oben driftend), (3) das vorhandene
  Absacken/Dissolve läuft mit `playbackRate 0.4` für die ersten 150 ms (Mikro-Zeitlupe nur auf der
  Gegner-Figur, nicht global), (4) Gold-Funken + Kill-Karte wie Bestand (Karte hat schon 400 ms
  Entrance-Delay — die Taktung passt).
- **Wirkung:** Der häufigste „Moment" des Spiels (jeder Kill!) bekommt einen klaren Dreiklang:
  Blitz → Zerfall → Beute. Muss trotzdem in ~1 s abgeschlossen sein, sonst nervt er beim Farmen.
- **Skizze:** Alles auf vorhandener Infrastruktur (punchRef-Keyframes, spawnSparks mit neuer
  Farbe, WAAPI-playbackRate auf der Dying-Animation).
- **Perf:** +16 gepoolte Spans für ~800 ms. Unkritisch.

### 4.2 Wellen-Wechsel + Gegner-Einzug (S)
- **Idee:** Dungeon-Wellen-Banner existiert. Neu: beim Wellenwechsel dunkelt die Stage 250 ms
  leicht ab (Opacity-Overlay), der neue Gegner tritt ein: 200 ms Fade + 8 px-Step von rechts +
  kleiner Staubpuff am Boden. **Wichtig:** beim normalen Respawn (alle paar Sekunden!) nur die
  Mini-Variante (Fade + Step, KEIN Abdunkeln, kein Puff bei fxLevel reduced) — die große Variante
  nur bei Wellenwechsel, Boss und Elite. Einzug darf sich nach 500 Kills nicht abgenutzt haben.
- **Wirkung:** Gegner „poppen" heute lautlos ins Bild — der billigste Bruch der Illusion.
- **Skizze:** CSS-Klasse beim Monster-ID/Wellen-Wechsel (React-Key-Wechsel triggert ohnehin
  Remount der Gegner-Art), Staubpuff aus dem Spark-Pool.
- **Perf:** unkritisch.

### 4.3 Boss-Auftritt: Kamera-Punch (S)
- **Idee:** Ergänzend zum vorhandenen Boss-Intro-Banner (8 s-Atempause): beim Intro-Beginn ein
  Kamera-Punch auf der Stage (`scale 1.0 → 1.035 → 1.0`, 350 ms, ease-out) + einmaliger Shake
  (vorhandene `ARENA_SHAKE_KEYFRAMES`, etwas kräftigere Amplitude 6 px) + Abdunkeln hinter dem
  Banner. Das Arena25D-Modul hat für „Crit-Kick" bereits Kamera-Semantik — hier die 2D-Übersetzung.
- **Wirkung:** Der Thron-Moment („Thron braucht den größten Auftritt", Fun-Sweep FF) bekommt Gewicht.
- **Skizze:** WAAPI auf `stageRef` (Muster `triggerArenaShake` existiert), Overlay im Banner-Block.
- **Perf:** transform auf der Stage ist Kompositor-only; einmalig pro Boss. Unkritisch.

### 4.4 Elite-Erscheinen (S)
- **Idee:** Spawnt ein Champion/Elite, feuert ein einmaliger Spawn-Blitz in der Elite-Farbe
  (vorhandener `fx-flash` mit Elite-Klasse) + ein kurzer Namens-Streifen (Mini-Variante des
  Wellen-Banners). Die Defeat-Zeremonie existiert schon — der AUFTRITT ist heute stumm.
- **Perf:** unkritisch, seltenes Ereignis.

### 4.5 Low-HP-Spannung: Herzschlag-Rhythmus (S)
- **Idee:** Die vorhandene Vignette pulst sinusförmig 1.6 s. Neu: Doppel-Puls-Timing (ba-dumm …
  Pause), zusätzlich pulsiert der Spieler-HP-Balken im selben Rhythmus minimal (`scaleY 1.06`).
  KEIN Audio-Herzschlag (im 10h-Idle unerträglich → Nicht-tun-Liste).
- **Wirkung:** Aus „roter Rand ist an" wird körperliche Anspannung, praktisch gratis.
- **Skizze:** Nur Keyframe-Timing der vorhandenen `low-hp-vignette`-Animation + eine kleine
  Balken-Animation. Opacity/transform-only.
- **Perf:** null (dieselbe Animationsanzahl).

---

## 5. Bühnen-Leben

### 5.1 Kulissen-Drift für Querformat-Kulissen (S)
- **Idee:** Der Ken-Burns-Drift läuft nur auf Hochformat-Kulissen; die Querformat-Kulissen
  (Turm-Etagen 2–5) sind per `.static` ausgenommen (Zoom-Zuschnitt-Problem). Neu: eigene
  translate-basierte Micro-Drift-Variante (±8 px horizontal, 60 s, alternate) mit 16 px Überrand
  (`inset: -16px`), damit nie Rand einblitzt — kein Scale, also kein Zoom-Problem.
- **Wirkung:** Gerade die Endgame-Kulissen (Turm!) stehen heute tot da.
- **Perf:** eine zusätzliche Kompositor-Ebene bewegt sich langsamer als 1 px/s. Unkritisch —
  dieselbe Klasse Layer wie der bestehende Drift.

### 5.2 Bodenschatten unter den Sprites (S)
- **Idee:** Statische radial-gradient-Ellipse (schwarz, ~35 % Opacity, blur-frei) unter jeder
  Figur, als eigenes Element UNTER `fighter-figure` (nicht im Lunge-Wrapper). Bei der Lunge bleibt
  der Schatten am Boden stehen → die Figur „löst sich ab", Sprünge bekommen Höhe gratis.
- **Wirkung:** Der billigste Groundedness-Gewinn überhaupt; Figuren schweben heute vor der Kulisse.
- **Skizze:** 1 Div + CSS je Seite; Pet bekommt eine kleine Ellipse.
- **Perf:** statisch, keine Animation. Null.

### 5.3 Ambient-Tiefenschicht (Kür, S)
- **Idee:** In `particles.ts` ~30 % der Partikel je Theme als „Vordergrund-Schicht": 1.5× größer,
  transparenter (Alpha ×0.6), 1.4× schneller. KEIN Blur (Fill-Rate!), nur Größe/Tempo/Alpha als
  Tiefensignal. Budget bleibt beim bestehenden Count (die Schicht wird abgezweigt, nicht addiert).
- **Wirkung:** Parallax-Tiefe im Ambient für 0 zusätzliche Partikel.
- **Perf:** identisch (gleiche Partikelzahl, gleiche Draw-Calls).
- **Leitplanke:** Unthemed Zonen (pastures, borderlands, wildwood, coast, highlands,
  goblin_warband) bleiben partikel-frei — Chef-Vorgabe steht.

### 5.4 Kein Kulissen-Licht (bewusst gestrichen)
Crit-Aufhellen der Kulisse / Wetter-Layer / Fullscreen-Glow wurden geprüft und verworfen:
jede animierte Aufhellung der großen Backdrop-Ebene ist ein Repaint-/Fill-Rate-Risiko bei
3440×1440 und die Ambient-Ära (Film-Korn/Nebel-Drift) wurde bereits einmal bewusst ENTFERNT
(s. `AmbientEffects.tsx`-Kommentar). Steht auf der Nicht-tun-Liste.

---

## 6. Benchmarks — ehrlich eingeordnet

| Spiel | Was sie machen | Was wir davon nehmen |
|---|---|---|
| **Melvor Idle** | Nichts. Kampf = Listen, Balken, Zahlen. | Die Lektion ist indirekt: Lesbarkeit und Ermüdungsfreiheit sind der Grund, warum Melvor 1000 h trägt. Jeder unserer Effekte muss diesen Test bestehen. Wir sind visuell längst darüber hinaus. |
| **AFK Arena / AFK Journey** | Voll-Skelett-Animation, Ultimate-Cutscenes, Kamerafahrten. | Falsche Pipeline für uns (statische PNGs, kein Rigging-Budget) und als Dauerschleife anstrengend. Übernehmen: die **Dramaturgie der Momente** (Boss-Auftritt, Ult = unser Kill-/Boss-Moment) — nicht die Technik. |
| **Vampire Survivors** | Maximal-Feedback aus Minimal-Assets: harte Weißblitze, Zahlenregen, Gold-Bursts, Screen-Shake. | Die Impact-Frame-Technik (1.1) und der Kill-Gold-Burst (existiert!) sind genau diese Schule. ABER: VS ist aktives Spiel — wir drosseln alles auf Momente (Shake nur Crit, Batching statt Zahlenregen). |
| **Nomad Idle** | Unser nächster Verwandter: statische Sprites mit Nudges, Staub-Puffs, Floater, dezente Einzüge. | Bestätigung des Gesamtkurses: kleines, konsistentes Effekt-Set schlägt Feuerwerk. Staubpuff/Einzug (4.2) und Bodenschatten (5.2) sind Nomad-Klasse. |
| **Legends of Idleon** | Dauerhaft hohe Screen-Unruhe, alles blinkt immer. | **Negativ-Benchmark.** Genau das Gefühl „anstrengend", das wir vermeiden. Deshalb: ruhiger Grundzustand, Ausschläge nur an Ereignissen. |

**Positionierung:** Nomad-Idle-Grundruhe + Vampire-Survivors-Impact in den Momenten +
AFK-Arena-Dramaturgie NUR bei Boss/Elite/Kill. Nicht mehr.

---

## 7. Priorisierung — das 20 %-Paket mit 80 %-Wirkung

### Kernpaket 0.4.0 (empfohlene Umsetzungs-Reihenfolge für ui-dev)

| # | Feature | § | Aufwand | Warum zuerst |
|---|---|---|---|---|
| 1 | Windup aus dem Angriffs-Timer | 3.1 | M | Verwandelt Simultan-Zucken in Choreografie — wirkt auf JEDEN Angriff, beide Seiten, alle drei Stile |
| 2 | Impact-Frames + Crit-Squash + Plateau-Sync | 1.1–1.3 | S | Wucht pro Treffer, 3 Keyframe-Änderungen auf vorhandenen Wrappern |
| 3 | Floater-Lanes + Hierarchie | 2.1–2.2 | S | Lesbarkeit sofort besser, Fundament fürs Batching |
| 4 | Zahlen-Batching + Floater-Cap | 2.3 | M | Lesbarkeit UND Perf-Deckel für Endgame-Builds |
| 5 | Kill-Upgrade (Blitz/Zerfall/Mikro-Zeitlupe) | 4.1 | M | Der häufigste Moment des Spiels |
| 6 | Bodenschatten | 5.2 | S | Größter Groundedness-Gewinn pro Aufwand im ganzen Doc |
| 7 | Gegner-Einzug + Wellen-Abdunkeln | 4.2 | S | Beseitigt das lautlose Gegner-Poppen |
| 8 | Boss-Kamera-Punch + Elite-Spawn-Blitz | 4.3–4.4 | S | Momente-Dramaturgie, seltene Ereignisse, kein Ermüdungsrisiko |
| 9 | Querformat-Kulissen-Drift | 5.1 | S | Schließt die echte Drift-Lücke (Turm-Etagen) |
| 10 | Treffer-Partikel Richtung/Material | 1.5 | S/M | Juice + Trinität-Lesbarkeit in einem |

Summe: 6×S + 4×M — realistisch als eine fokussierte ui-dev-Welle.

### Kür (nach 0.4.0, jeweils einzeln abwägen)
Globaler Mikro-Hit-Stop (1.4) · Melee-Kontakt-Lunge mit verzögertem Einschlag (3.2) ·
Pfeil-Projektil mit Bogen (3.3) · Cast-Nachglühen (3.4) · Kill-Zahl verweilt (2.4) ·
Herzschlag-Vignette (4.5) · Ambient-Tiefenschicht (5.3) · Low-HP-Puls auf dem HP-Balken (4.5).

---

## 8. Perf-Budget: Was läuft im Worst Case gleichzeitig?

Worst-Case-Szenario: Endgame-Build, schnelle Waffe beidseitig (~2 Angriffe/s gesamt), 2 aktive
DoTs (2 Ticks/s), Pet-Ability, Crit + Kill im selben 100 ms-Fenster, Dungeon-Wellen-Banner,
Turm-Kulisse mit Ambient-Theme, 3440×1440.

| Ebene | Elemente | Kosten |
|---|---|---|
| Kulissen-Drift | 1 große Kompositor-Ebene (existiert) | transform-only, konstant |
| Ambient-Canvas | 1 Canvas, ≤ 24 Partikel à 2–5 px | rAF, triviale Fill-Rate, Tab-Pause vorhanden |
| Floater | ≤ 10/Seite nach Cap (2.3) = ≤ 20 | transform/opacity-WAAPI, kleine Text-Elemente |
| FX-Pool | 36 Sparks + 4 Beams + 2 Ringe + 3 Flashes (fixe Pools) | transform/opacity, Round-Robin-Recycling, kein DOM-Wachstum |
| Figur-Wrapper | 2× (Lunge + Recoil + Punch + Windup) + Pet | transform/filter auf Sprite-Größe |
| Overlays | Hit-Flash ×2, Low-HP-Vignette, Wellen-Overlay | opacity-only |

Ergebnis: ~60–70 gleichzeitig animierte KLEINE Elemente, alle transform/opacity, ein Canvas,
null Layout-Reads pro Frame (`fxRect` nur am Trigger — Muster beibehalten!). Das liegt in der
Klasse dessen, was heute schon läuft; das Batching (2.3) und der Floater-Cap machen den Worst
Case sogar BILLIGER als der Status quo.

**Budget-Regeln für alles Neue (bindend für ui-dev):**
1. Jeder Spawn-Effekt läuft über die bestehenden Pools oder bekommt einen eigenen fixen Pool.
2. Nur transform/opacity animieren; `filter` ausschließlich auf sprite-großen Wrappern.
3. Kein Layout-Read (getBoundingClientRect) außerhalb des Event-Triggers.
4. Kein `will-change`, kein zweites Canvas, keine animierten box-shadows auf großen Flächen.
5. Jeder neue Effekt zählt einen `data-*`-Zähler auf dem FX-Layer hoch (`bumpFx`-Muster) —
   der juice-check-Test bleibt der Vertrag.
6. Nach der Umsetzung: 10-Minuten-Idle-Messung im DevTools-Performance-Panel auf 3440×1440,
   Ziel unverändert 60 fps ohne Recalc-Style/Layout-Spitzen.

---

## 9. Reduced-Motion-Fallback je Effekt

Systematik wie im Bestand: `fxLevel` full/reduced/off; `prefers-reduced-motion` erzwingt "off".
Kernfeedback (Zahlen, Balken, Log) läuft in JEDER Stufe.

| Effekt | full | reduced | off |
|---|---|---|---|
| Impact-Frames / Squash (1.1–1.3) | voll | nur 1-Frame-Helligkeits-Flash, kein Transform | aus |
| Globaler Hit-Stop (1.4, Kür) | voll | aus | aus |
| Richtungs-Partikel (1.5) | voll | aus (Pool wie heute nur bei full) | aus |
| Floater-Hierarchie/Lanes (2.1–2.2) | voll | voll (Lesbarkeits-Feature, keine Bewegungs-Zunahme) | voll (Floater sind Kernfeedback) |
| Batching + Cap (2.3) | voll | voll | voll (reine Aufräum-Logik) |
| Windup (3.1) | voll | nur Glow-Aufladung (opacity), keine Pose-Bewegung | aus |
| Projektil/Nachglühen (3.3–3.4) | voll | aus | aus |
| Kill-Upgrade (4.1) | voll | nur Weißblitz + Entsättigen (Bestands-Muster `fx-no-motion`) | nur Bestands-Dissolve |
| Gegner-Einzug (4.2) | voll | nur Fade, kein Step/Puff | harter Wechsel wie heute |
| Boss-Punch / Elite-Blitz (4.3–4.4) | voll | nur Abdunkeln/Farb-Flash, kein Scale/Shake | Banner ohne Effekte |
| Herzschlag-Vignette (4.5) | voll | langsamer Einfach-Puls (Bestand) | aus |
| Querformat-Drift (5.1) | voll | statisch | statisch |
| Bodenschatten (5.2) | an | an | an (statisch, keine Animation — kein Motion-Thema) |
| Ambient-Tiefenschicht (5.3) | voll | halbes Budget, langsamer (Bestands-Regel) | kein Canvas im DOM |

---

## 10. Nicht-tun-Liste

1. **Kein Engine-Eingriff, nie:** kein echter Hit-Stop im Tick, keine „Anim-Events" aus der
   Engine, kein Vorziehen/Verzögern von State-Änderungen für die Show. Offline==online bleibt byte-gleich.
2. **Keine Fullscreen-Post-FX:** kein animiertes Aufhellen/Einfärben/Blurren der Kulissen-Ebene,
   kein Chromatic-Aberration-/Motion-Blur-Imitat, kein Film-Korn-Comeback (wurde bewusst entfernt).
3. **Kein Screen-Shake bei normalen Treffern.** Shake bleibt Crit/Boss-exklusiv (10h-Regel).
4. **Kein Audio-Herzschlag / Dauer-Drone bei Low-HP.**
5. **Keine Partikel in unthemed Zonen** ohne expliziten Chef-GO (bestehende Vorgabe).
6. **Kein ungepooltes DOM-Spawning** (jedes „mal eben ein Div anhängen" ist verboten).
7. **Kein `will-change`, kein zweites Canvas, keine Layout-animierenden Properties** (top/left/
   width in Keyframes — die Perf-Welle hat genau das bereits einmal ausgebaut).
8. **Keine externen Libs** (keine Partikel-/Physik-/Tween-Library — WAAPI + Canvas reichen nachweislich).
9. **Keine Skelett-/Frame-Animation der Sprites nachrüsten** — das wäre Arena25D-Territorium und
   das Modul bleibt bewusst pausiert (ein Flag, eigener Meilenstein).
10. **Kein Rarity-Glow auf Equipment-Darstellungen** im Kill-/Loot-Moment (bestehende Chef-Regel:
    nur Runen/Tränke glühen).
11. **Keine Dauer-Animation neuer großer Flächen** — der Grundzustand des Screens bleibt: Drift +
    Ambient + Timer-Balken, sonst Ruhe.

---

## 11. Determinismus-Kontrakt (Zusammenfassung für den Review)

- Alle Effekte hängen an: (a) `CombatEvent`-Einträgen (seq-getrieben, Bestand), (b) State-Deltas
  zwischen Renders (Ward-Pulse-Muster), (c) den Angriffs-Timern (nur LESEND, §3.1).
- `Math.random()` für Streuung/Partikel lebt ausschließlich im Renderer — der Engine-RNG
  (`RngState`) wird von der Präsentation nie berührt.
- Hit-Stop/Zeitlupe manipulieren ausschließlich WAAPI-`playbackRate` von Präsentations-Animationen,
  niemals die Tick-Uhr.
- Der `fxLevel`-Gate + `data-*`-Zähler-Vertrag (juice-check) gilt für jeden neuen Effekt.
