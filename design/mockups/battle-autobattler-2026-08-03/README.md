# Auto-Battler-Choreografie — interaktiver Motion-Beweis (2026-08-03)

**Rolle:** UI-Dev (Renderer) · **Typ:** reines Wegwerf-Mockup, **kein Produktivcode**, keine App-Datei berührt.
**Auftrag:** fühlbar machen, wie sich Auto-Battler-Bewegung (Idle-Leben + echter Windup/Dash/Clash/Return-
Angriffszyklus) mit unseren **echten, unbewegten** Sprites anfühlt — vor der 0.4.0-Phase "Kampfgefühl".

Start: [`index.html`](index.html) (direkt per Doppelklick öffenbar, keine Server nötig). Assets sind die
echten Repo-Dateien per relativem Pfad (`../../../apps/client/src/renderer/assets/…`) — Held
`portraits/char_1.webp`, Monster `monsters/{chicken,goblin,bull_boss}.webp`, Kulisse
`battlescreens/pastures.webp`.

## Was jeder Modus zeigt

- **A · Heute** — **kein erfundener Referenzzustand**, sondern 1:1 aus `CombatPage.tsx` portiert:
  `LUNGE_RIGHT`/`LUNGE_LEFT` (Z. 779–790, translateX 55px + rotate + scale, 400ms) für den Angreifer,
  `hitPunchKeyframes` (Z. 822–830) + der Recoil-`useEffect` (Z. 1190–1225) für den Getroffenen,
  `CAST_KEYFRAMES` (Z. 770–776) für Magie. Wichtiger, beim Nachbauen erst sichtbar gewordener Fund:
  **"Heute" ist nicht bewegungslos** — es gibt schon eine Lunge + einen Recoil/Punch-Scale/Flash. Was
  wirklich fehlt, ist unten unter "Kernbefund" beschrieben.
- **B · Auto-Battler** — Windup (350ms, Ausholen/Anspannen) → Dash (120ms, live gegen die tatsächliche
  Lücke zum Gegner gemessen) → Clash (Recoil+Knockback+Funken+Floater am Gegner, **erst jetzt** ausgelöst)
  → Return (260ms, leicht federnd). Beide Seiten laufen auf eigenen, unabhängigen Timern (wie
  `playerTimerRemainingSec`/`enemyTimerRemainingSec`). Ranged/Magie: Angreifer bleibt stehen (Lehne+Glow),
  ein Projektil fliegt, Einschlag löst dieselbe Getroffen-Reaktion aus. Crit: größerer Dash, härterer
  Clash, goldener Flash/Floater. Kill: Verlierer entsättigt/sackt/verblasst (an `kill-dying-sink`,
  combat.css Z. 2358–2362, angelehnt), Sieger macht einen kurzen Hop.
- **C · Auto-Battler + Tiefe** — Modus B + Kontaktschatten (wandert automatisch mit dem Dash mit, weil er
  strukturell ein Kind der Dash-Ebene ist) + Gegner minimal höher/kleiner gestaffelt. **Bewusst KEIN**
  gekippter Boden (`rotateX`) — der 2.5D-light-Beweis vom selben Tag
  (`design/mockups/battle-25d-light-2026-08-03/`) zeigte dafür sichtbare Doppelperspektive auf gemalten
  Kulissen ohne dediziertes Bodenbild; Modus C bleibt bewusst bei reiner Ebenen-Staffelung, die mit
  jeder vorhandenen Kulisse funktioniert, ohne neue Kunst zu brauchen.

Regler: Modus, Monster (Huhn/Goblin/Bulle), Spieler-Stil (Nahkampf/Fernkampf/Magie, gilt symmetrisch für
beide Seiten — im echten Spiel wäre nur die Spieler-Seite stilabhängig), Speed 0.5×/1×/2×, Reduced-Motion
(fällt auf reinen Flash+Floater zurück, keine Bewegung — deckt sich mit `fxLevel!=="full"` im echten Spiel).
Freeze-Leiste unter der Bühne: benannte Phasen (Windup/Clash/Return bzw. Peak/Settle in Modus A) pro Seite
einzeln einfrierbar, plus zwei Kill-Freeze-Buttons — exakt das, was für die Screenshots unten benutzt wurde.

## Kernbefund: Kausalität ist der eigentliche Wucht-Hebel, nicht nur mehr Bewegung

Der auffälligste Unterschied zwischen A und B ist **nicht** "B bewegt sich mehr" — es ist, **wann** die
Verteidiger-Reaktion ausgelöst wird. Modus A feuert Angreifer-Lunge und Verteidiger-Recoil/Flash/Floater
**zeitgleich** (das Spiel kennt heute keinen simulierten "Ankunfts"-Zeitpunkt — `attackNonce` und `hitNonce`
wechseln im selben Tick). Modus B verzögert die Verteidiger-Reaktion bis zum Dash-Ende (Clash-Frame).
Dieselbe Distanz und dieselben Sprites lesen sich dadurch spürbar härter — reine Kausalität, kein einziges
zusätzliches Pixel Bewegung nötig. Das ist der billigste, am wenigsten riskante Teil-Gewinn, falls der volle
Umbau zu teuer wird (s. Empfehlung).

## Verdikt je Modus (ehrlich, mit statischen Sprites getestet)

**Modus A — Heute:** Trägt solide für ein Idle-Spiel mit Dutzenden gleichzeitig lesbaren Zahlen — schnell,
unaufdringlich, lenkt nicht vom Nummern-Lesen ab. Fühlt sich aber wie zwei Standbilder an, die kurz zucken,
nicht wie ein Kampf zwischen zwei Wesen, die sich wahrnehmen.

**Modus B — Auto-Battler:** Trägt überraschend gut, **auch mit den unveränderten, unbeseelten Sprites** —
Idle-Atmen allein macht aus toten Standbildern etwas Lebendiges, und die verzögerte Clash-Reaktion gibt
selbst dem Bullen-Sprite (kein einziges neues Pixel Kunst) echtes Gewicht. Grenze klar sichtbar beim Huhn
(s. u.) — dort trägt dieselbe Choreografie spürbar schlechter.

**Modus C — Auto-Battler + Tiefe:** Der Zusatz-Gewinn gegenüber B ist real, aber klein — Kontaktschatten
und Gegner-Staffelung lesen sich als angenehmes Detail, nicht als Bühnenwechsel (anders als beim vollen
three.js-Arena-Assessment vom selben Tag, das mit dedizierter 3D-Kulisse einen deutlich größeren Sprung
zeigt). Für den Aufwand (praktisch kostenlos on top von B) lohnt es sich trotzdem.

## Chef-Frage direkt getestet: Huhn vs. Ritter

Screenshots `B10`/`B11` (Huhn, Crit-Clash/Windup) vs. `B2`/`B4` (Bulle) zeigen es klar: **derselbe**
Windup/Dash/Knockback-Zyklus liest sich beim Huhn eher possierlich als wuchtig — dem Sprite fehlt jede
Anatomie, die die Bewegung stützt (kein sichtbarer Beinabstoß, kein Gewichtsverlagerungs-Gefühl beim
Ausholen). Der implementierte Gewichtsfaktor (Huhn ×1.6 Rückstoß-Amplitude, Bulle ×0.5) hilft spürbar —
das Huhn taumelt glaubwürdiger zurück, der Bulle wirkt behäbiger — **ersetzt aber keine Pose**. Fazit: die
Technik trägt am besten bei Silhouetten mit erkennbarer Kampfhaltung (Bulle, Goblin); bei kleinen/runden
Non-Combat-Formen (Huhn, vermutlich auch Hase/Ratte) bleibt ein Rest-Slapstick, den keine Keyframe-Feinarbeit
ganz wegbekommt, ohne die Distanz/Rotation so stark zu kappen, dass der Effekt insgesamt verpufft.

## Portierungs-Skizze — was 1:1 übertragbar ist

Die Architektur ist **absichtlich** eine Kopie des echten `Fighter`-Ref-Musters, damit dieser Abschnitt kein
Blindflug ist:

| Mockup-Ebene | Reales Äquivalent | Übertragbarkeit |
|---|---|---|
| `.actor-lunge` (Windup/Dash/Return) | `figureRef` / `.fighter-figure`, `attackNonce`-`useEffect` (Z. 1175–1184) | Direkt — Keyframes ersetzen, Trigger-Mechanismus (Nonce-Wechsel → `el.animate()`) bleibt exakt gleich |
| `.actor-art` (Recoil) + `.actor-punch` (Scale) | `artRef`/`.fighter-figure-art` + `punchRef`/`.fighter-figure-punch`, `hitNonce`-`useEffect` (Z. 1190–1225) | Direkt — dieselbe Zwei-Ebenen-Trennung existiert schon genau wegen desselben Transform-Kollisions-Problems |
| `.hit-flash` | `hit-flash-overlay`/`flashRef` | Direkt, unverändert |
| Idle-Atmen (`.actor-idle`) | **existiert nicht** | Neu: eine CSS-`@keyframes`-Schleife auf einer zusätzlichen Wrapper-Ebene um `.fighter-figure`, mit `fxLevel==="off"` (bzw. `prefers-reduced-motion`) deaktiviert wie alle anderen Bewegungs-Layer |
| Kausale Verzögerung (Clash-Gating) | **existiert nicht** — `attackNonce`/`hitNonce` wechseln heute im selben Tick | Größte Änderung: der Hit-Reveal (Recoil/Flash/Floater/HP-Bar-Update) müsste um die Dash-Dauer (~470ms) verzögert werden — **Entkopplung von Event-Ankunft und visueller Offenbarung**, s. Risiken |
| Live gemessene Kontakt-Lücke (`measureGapPx`) | **existiert nicht**, LUNGE ist heute ein fixer 55px-Wert | Ein `getBoundingClientRect()`-Diff zwischen den zwei `.fighter-figure`-Elementen bei Trigger, exakt wie hier |
| `footPad`-Fußausgleich | `measureSpriteBaseline` in `Arena25DStage.tsx` (bereits gebaut, nur für 2,5D) | Portierbar — dieselbe Canvas-Alpha-Messung, gecacht pro Bild-URL, müsste nur zusätzlich am 2D-Pfad angebunden werden |
| Kontaktschatten (Modus C) | **existiert nicht** | Neu, aber trivial — ein `<div>` als Kind von `.fighter-figure`, folgt der Dash-Transform automatisch |
| Ranged/Magie-Projektil | **existiert nicht** — Ranged sieht heute identisch zu Melee aus | Neu, eigener kleiner Choreografie-Zweig — größter *Netto-Neu*-Wert dieses Mockups, weil er ein heute unsichtbares Problem löst (die drei Kampfstile sehen optisch gleich aus) |

## Aufwandsschätzung (grobe Tageszahlen, Engineering only — keine neue Kunst nötig)

- Idle-Atmen (beide Seiten, FX-Gate respektiert): **0.25 Tag**
- Windup/Dash/Return als benannte Phasen statt Einzel-Lunge + live gemessene Kontakt-Distanz: **0.5–1 Tag**
- Kausale Verzögerung (Hit-Reveal von Event-Ankunft entkoppeln, inkl. Kampf-Log-Synchronisation prüfen):
  **1–1.5 Tage** — der riskanteste Posten, weil er in den Event-Fluss zwischen Kampf-Tick und UI-State
  eingreift, nicht nur in CSS
- Ranged/Magie-Projektil-Choreografie: **1 Tag**
- `footPad`-Fußausgleich an den 2D-Pfad anbinden: **0.5 Tag** (Mechanismus existiert schon, nur nicht hier verdrahtet)
- Modus C (Kontaktschatten + Tiefen-Staffelung): **0.5 Tag**, on top von B
- **Summe Modus B komplett (Melee+Ranged+Magie): ~3.5–4.5 Tage. Zusätzlich Modus C: +0.5 Tag.**

## Risiken

- **Klick-Ziele während Bewegung:** strukturell unproblematisch — `transform` bewegt die tatsächliche
  `getBoundingClientRect()`-Box mit, Hit-Testing folgt dem Sprite automatisch (hier verifiziert, kein
  Canvas/Raycasting nötig). Das eigentliche Risiko ist NICHT technisch, sondern zeitlich: ein Gegner ist
  während ~120–350ms pro Angriffszyklus (~15–20% der Zeit, unabhängig von der Speed-Stufe, da Intervall UND
  Animationsdauer gleich skalieren) an einer anderen Position als seiner Ruheposition — ein Klick genau in
  diesem Fenster trifft daneben oder trifft die falsche Stelle.
- **Nameplate/HP-Leiste bleibt bewusst an der Ruheposition verankert** (nicht Kind der Dash-Ebene) — sonst
  müsste Text/Balken beim Dash mitwandern UND aufrecht/lesbar bleiben (Gegen-Rotation nötig). Bei großen
  Dash-Distanzen (Bulle) trennt sich die Nameplate dadurch sichtbar optisch von der Figur, während diese
  weit vorne im Clash steht — ein Kompromiss, keine perfekte Lösung; im echten Spiel wäre das dieselbe
  Entscheidung mit denselben zwei Nachteilen.
- **Kausale Verzögerung bricht die Sofort-Feedback-Erwartung:** wenn Floater/Recoil erst ~470ms nach dem
  Kampf-Tick erscheinen, das Kampf-Log (Textzeile) aber wie heute sofort schreibt, laufen Text und Bild
  auseinander — das Log müsste entweder ebenfalls verzögert werden oder bewusst "vorauseilen" (Chef-
  Entscheidung, kein technisches Detail).
- **Idle-Atmen läuft dauerhaft, nicht nur bei Aktion** — anders als heute (wo `el.animate()` nur bei
  Nonce-Wechsel feuert) liefe eine Endlos-CSS-Animation während des GESAMTEN Kampfes auf beiden Figuren.
  Compositor-only (translateY/rotate) ist erfahrungsgemäß billig, aber das 0.4.0-Assessment vom selben Tag
  warnt explizit, dass "läuft flüssig beim Chef" kein Beweis für schwächere Spieler-Hardware ist — vor
  Rollout auf echter Low-End-Hardware gegenprüfen, nicht nur behaupten.
- **Sprite-Grenze bleibt real** (s. Huhn-Verdikt oben) — dieser Ansatz ist ein Multiplikator auf vorhandene
  Kunst, kein Ersatz für fehlende Posen. Bei kleinen/runden Kreaturen sollte die Amplitude eher gedämpft
  als bei Bulle/Goblin, sonst kippt "lebendig" in "albern".

## Verifikation

Headless in Chromium (Playwright, `playwright-core` aus dem Repo-`node_modules/.pnpm`, kein Electron, kein
`pnpm dev`), 21 Screenshots über alle drei Modi × mehrere Phasen/Monster/Stile in `screenshots/`, davon
Windup/Clash/Return (bzw. Peak/Settle in A) je Modus eingefroren über die eingebaute Freeze-API
(`window.__mockup.freeze(side, phase)`, pausiert die WAAPI-Animationsgruppe exakt bei `currentTime=Xms`).
0 Konsolenfehler über den gesamten Lauf, inkl. 6s/4s Live-Auto-Battle bei 1×/2× Speed und dem
Reduced-Motion-Fallback. Zwei echte Bugs beim Nachbauen gefunden und gefixt (dokumentiert im Code):
fehlendes `transform-origin` auf der Dash-Ebene hat die Dash-Distanz um ~40% verfälscht, und ein doppelter
Positions-Offset hat Floater-Zahlen weit neben die Figur geschoben — beide Fixes sind inline kommentiert,
falls beim echten Portieren dieselbe Klasse Fehler droht.

## Empfehlung

**Modus B (ohne Modus C) gehört in 0.4.0 Phase 1**, aber gestuft: zuerst NUR die kausale Verzögerung +
Windup/Dash/Return für Melee (der teuerste UND wertvollste Teil, ~2–2.5 Tage), Ranged/Magie-Projektil als
direkt folgender Nachschlag (~1 Tag, schließt die "sieht heute alle gleich aus"-Lücke der drei Kampfstile).
**Modus C erst in Phase 2 oder später** — der Zusatzgewinn ist real, aber klein genug, dass er hinter
wichtigeren Phase-1-Punkten (z. B. der kausalen Verzögerung selbst) zurückstehen sollte; er ist zudem der
einzige Teil mit einer echten Perf-Unbekannten (Dauer-Idle-Animation), die vor Rollout noch auf schwächerer
Hardware geprüft gehört. Die three.js-Arena (separates Assessment vom selben Tag) bleibt der größere,
teurere Sprung mit Kunstbedarf pro Zone — dieser DOM/CSS-Auto-Battler-Weg ist der genau richtige
Zwischenschritt: kein neuer Kunstauftrag, spürbarer Gewinn, klar begrenzter Engineering-Aufwand.
