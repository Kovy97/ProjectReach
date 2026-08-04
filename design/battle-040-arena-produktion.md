# 0.4.0 Arena-Produktion — Technik-Spec & Arbeitsteilung (2026-08-03)

*Chef-Entscheid 03.08.: Die 2.5D-Arena wird produktiv ausgebaut. **Claude baut die komplette
Logik, Codex/Mira liefert ALLE Assets** (Bodentexturen je Zone, Hintergrundbild je Zone,
2D-Detail-Props wie Bäume/Büsche, künstliche Sonne/Licht, Stimmungs-Filter je Zone).*
*Basis: pausierter Prototyp `apps/client/src/renderer/components/arena25d/` (Octopath-Kamera 30°,
gecurvte Kulissen-Wand, gestretchter Boden, warme Sonne, Alpha-Baseline-Fußmessung, HP-Overlays) +
`design/battle-040-25d-assessment.md` (three.js tree-shaked bis zum Ship; Dungeons = sequentielle
1v1, kein Multi-Monster-Problem) + Auto-Battler-Motion-Beweis (in Arbeit) als Choreografie-Sprache.*

## 1. Arbeitsteilung
| Claude (Logik) | Mira (Assets) |
|---|---|
| Prototyp reaktivieren + produktisieren (Flag → Options-Toggle) | Bodentextur je Zone |
| **Zonen-Manifest-System** (JSON je Zone: Assets + Licht + Filter + Prop-Platzierung) | Kulissen-/Hintergrundbild je Zone |
| Prop-Billboard-Layer (2D-Props stehen in Tiefenebenen hinter/neben den Kämpfern) | 3-6 Detail-Props je Zone (Bäume, Büsche, Felsen, Zäune, Ruinenstücke …) |
| Licht-/Filter-Engine: Sonne (DirectionalLight), Ambient, Fog, Farb-Grade aus Manifest-Werten | Sonnen-/Glow-Sprite + **Licht-/Stimmungs-Manifestwerte je Zone als Designvorschlag** |
| Auto-Battler-Choreografie (Windup→Dash→Clash→Return) + FX-Parität zur 2D-Ansicht | — |
| Dungeon-/Wellen-/Elite-Support (Phase 2, sequentiell 1v1) | später: Dungeon-Schauplätze |
| Perf-Gates (60fps@3440×1440), Rückbaubarkeit, Reduced-Motion | — |

## 2. Asset-Vertrag (bindend für die Lieferung — Auto-Discovery-fähig)
Zielpfad nach Freigabe: `apps/client/src/renderer/assets/arena/` (Staging wie immer CODEX/**).
Namensschema (Zonen-IDs exakt aus dem Katalog):
- `arena_<zoneId>_ground.webp` — **1536×1024**, wird EINMAL über die Bodenfläche gestreckt (nicht
  gekachelt); Draufsicht-nah gemalt, zonentypisch, MITTE relativ ruhig (dort stehen die Kämpfer),
  Ränder dürfen Charakter tragen. Qualität q85+, keine Schrift/Logos.
- `arena_<zoneId>_backdrop.webp` — **≥1717×916 quer**, wird als gecurvte Wand hinter dem Boden
  montiert; KOMPOSITIONS-REGEL (Juli-Lektion): unterer Bildrand ≈ Horizont/Bodenanschluss, oberes
  Drittel Himmel — der gemalte Boden im Backdrop maximal flach halten, unsere 3D-Bodenfläche
  übernimmt den Vordergrund.
- `arena_<zoneId>_prop_<nn>.webp` — transparente Freisteller (echtes Alpha, kein Schachbrett!),
  ~600-1200px hoch, Fußkante sauber (die Alpha-Baseline-Messung setzt sie auf den Boden). 3-6 je
  Zone; Mischung aus Rand-Props (Bäume/Felsen, groß) und Mittelgrund-Props (Büsche/Zäune, klein).
- `arena_sun_glow.webp` — EIN wiederverwendbares weiches Sonnen-/Glow-Sprite (additiv einsetzbar).
- **Stimmungs-Manifest je Zone** (Mira schlägt vor, Claude verdrahtet): Sonnenfarbe+Winkel,
  Ambientfarbe, Fog-Farbe+Dichte, Farb-Grade (z.B. „Slagpit: Glut-Orange-Sonne tief, aschgrauer
  Fog dicht, entsättigt-warm" / „Pastures: Nachmittagsgold, leichter Dunst"). Formatvorlage liefert
  Claude als JSON-Skelett; Mira füllt Werte + je 1 Referenz-Stimmungsbild.

## 3. Zonen (11 Welt-Zonen, Phase 1; Dungeons später)
pastures (Boden+Backdrop EXISTIEREN aus Juli — nur Props+Manifest nötig, ggf. Veredelung) ·
borderlands · ashfields · blackthorn · crypt · wildwood · coast · slagpit · highlands ·
idolhall · slayer_tower

## 4. Staffelung (Miras eigenes Gate-Muster)
1. **Pilot-Dreier:** Pastures (vervollständigen) + Crypt + Slagpit — maximale Stimmungs-Spreizung
   (sonnig / düster-gruftig / glühend-industriell). Chef-Abnahme am lebenden Prototyp.
2. Nach Abnahme: restliche 8 Zonen als Serie (kohärenter Kamera-/Licht-Vertrag wie bei den
   New-Haven-Gebäuden — Near-Copies verboten, jede Zone erkennbar SIE selbst).
3. Dungeon-Schauplätze als eigene Runde nach 0.4.0-Kern.

## 5. Claude-Phasen (parallel zur Asset-Produktion, Platzhalter bis Lieferung)
1. Prototyp-Reaktivierung + Manifest-Loader + Prop-Layer + Licht/Filter aus Manifest (Pastures-Bestand als Testzone).
2. **Choreografie IN der Arena = Bewegung im RAUM** (Chef-Klarstellung 03.08.): Die Kämpfer sind
   aufgestellte Billboard-Sprites AUF der 3D-Plane und bewegen sich in WELT-Koordinaten — Einlauf
   des Gegners über die Fläche, Idle-Leben am Standplatz, Melee-Angriff als echter **Anlauf über
   den Boden** (Windup → Sprint zum Gegner → Clash mit Recoil/Knockback ENTLANG der Fläche →
   Rückzug zur Position), Ranged/Magie halten Distanz und schießen räumlich, Kontaktschatten
   wandern mit, Tiefensortierung gegen Props bleibt korrekt, Kamera darf auf Impact minimal
   reagieren. Die Timing-/Kausalitäts-Sprache kommt 1:1 aus dem Motion-Beweis
   (`design/mockups/battle-autobattler-2026-08-03/`) — die UMSETZUNG ist three.js-Positions-
   Animation in der Arena, KEIN CSS-Nachbau. FX-/Floater-Parität zur 2D-Ansicht gehört dazu;
   der 2D-Klassik-Modus bleibt Fallback, die Arena ist der Ziel-Look.
3. Zonen-Rollout im Takt der Asset-Lieferungen; Options-Toggle statt Dev-Flag; Perf-/QA-Gates.
