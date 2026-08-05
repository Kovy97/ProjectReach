# Posen-Pilot „Chicken" — Animations-Gefühl für die 2.5D-Arena
**Von:** Claude · **Datum:** 2026-08-05 · **Priorität:** hoch

## Auftrag
Wir testen mit EINER Kreatur, ob Posen-Sets als „Animation" für die Arena funktionieren. Pilot: **Chicken** (Master: `apps/client/src/renderer/assets/monsters/chicken.webp` — der dient unverändert als Idle-Pose).

Bitte generiere **3 neue Posen desselben Chickens** (Master als Bild-Edit-Referenz mitgeben — deine Kontrolltafel-Methode; es muss zweifelsfrei DASSELBE Tier sein: identische Proportionen, Farben, Stil, Detailgrad — nur die Körperhaltung ändert sich):

1. **`chicken_pose_windup.webp`** — Ausholen: Gewicht nach hinten, Kopf zurückgezogen, Flügel leicht gespannt. Angriffs-Ankündigung.
2. **`chicken_pose_strike.webp`** — Zuschlagen: Vorstoß mit Schnabel nach vorn, Körper gestreckt, aggressiv.
3. **`chicken_pose_hit.webp`** — Getroffen: Zurückweichen, Federn gesträubt, Kopf abgewandt.

### Technische Anforderungen (bindend)
- **Echtes Alpha** (kein Schachbrett, keine Hintergrundfarbe) — Standing Rule.
- **Gleiches Canvas-Format wie der Master** und die Kreatur in **identischer Körpergröße/Skala**. Die Fußlinie darf zwischen Posen leicht variieren (wir messen die Alpha-Baseline pro Pose automatisch), aber die Körpergröße muss stabil bleiben — sonst „pumpt" das Tier beim Posenwechsel.
- **Blickrichtung identisch zum Master** (die Arena spiegelt selbst per Code).
- **Kein Boden, kein Schatten im Bild** (Schatten erzeugt die Engine am gemessenen Fußpixel).
- Kein Glow/Schimmer (Kreaturen-Regel wie gehabt).

### Abnahme-Weg
Erst eine **4er-Kontrolltafel** (Master + 3 Posen nebeneinander) für die Chef-Abnahme, DANN Feinschliff/Finalisierung. Staging wie üblich in deinem Asset-Bereich; die produktive Einbindung nach `assets/monsters/` übernehme ich.

## Kontext
0.4.0 „Kampfgefühl": Die Arena-Choreographie kennt die Momente Windup → Clash → Getroffen bereits als Events — ich baue parallel das Posen-Wechsel-System, das an diesen Punkten den Sprite tauscht (harter Swap, Sprite-Ästhetik wie Octopath). Der Pilot entscheidet, ob wir das **Zone für Zone** ausrollen (Pastures zuerst); danach bündeln wir pro Zone Szenen-Assets + Posen-Sets in einem Auftrag. Video-/Frame-Zyklus-Generierung machen wir bewusst NICHT (Konsistenz-Falle) — genau deshalb Posen-Sets.

## Sperrzonen
`components/arena25d/**` (Posen-System + parallel laufender EXE-Umbau des Scene Builders), Build-Infrastruktur (`electron.vite.config.ts`, `electron-builder*.json`, `src/main/**`). Dazu die Dauer-Tabus aus CODEX/RULES.md.

## Rückgabe
HANDOFF-Eintrag mit Dateiliste + Kontrolltafel-Verweis. Keine Tests nötig (reine Assets); Einbindung + Verifikation übernehme ich.
