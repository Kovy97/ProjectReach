# Sound-Wunschliste — Grim Reach (Audio-Vervollständigung, 2026-07-09)

**Bestandsaufnahme:** Echte Audio-Dateien existieren nur 3 (`click.mp3`, `achievement.mp3`,
`crown_of_ashes.mp3` = Musik). Die Kampf-Sounds (hit/crit/death/heal/levelup/cast) sind aktuell
**synthetisierte Oszillator-Töne** — funktional, aber hörbar „Beep-Platzhalter". Diese Liste ersetzt
die Platzhalter durch echte Sounds UND ergänzt die fehlenden Belohnungs-/Ambient-Ebenen.

**Format-Vorgaben (für alle):** MP3 oder OGG, 44,1 kHz · One-Shots kurz und knackig (≤ 1,5 s,
Ausnahme Fanfaren ≤ 3 s) · Ambient-Loops 30–60 s, **nahtlos loopbar** (Anfang=Ende) · alle auf
ähnliche Lautheit normalisiert (Referenz: das vorhandene achievement.mp3) · kein Sprach-/Musikanteil
in SFX. Quellen: AI-Audio (ElevenLabs SFX, Stable Audio) oder freie Bibliotheken (freesound.org,
CC0 — Lizenz notieren!). Dateinamen exakt wie angegeben → Ablage `apps/client/src/renderer/assets/audio/`,
Einbau macht Claude (Minuten pro Sound).

## A. Kampf-Ersatz für die Synth-Töne (7 — höchste Priorität)
| Datei | Beschreibung |
|---|---|
| `hit_1.mp3` / `hit_2.mp3` / `hit_3.mp3` | Fleischiger Nahkampf-Treffer, 3 Varianten gegen Monotonie — dumpfer Impact mit etwas Stahl, je ~0,3 s |
| `crit.mp3` | Schwerer, satter Wucht-Treffer mit kurzem metallischem Nachklang — deutlich dicker als hit, ~0,6 s |
| `death_enemy.mp3` | Kreatur sackt zusammen: dumpfer Fall + kurzes Röcheln/Knochenknacken, unheilvoll aber nicht comic-haft, ~1 s |
| `heal.mp3` | Warmer, weicher Heil-Schimmer — Kräuter/Licht statt Kirchenglocke, ~0,7 s |
| `cast.mp3` | Arkaner Zauber-Wusch mit dunklem Unterton (Dark Fantasy, kein Disney-Glitzer), ~0,6 s |

## B. Belohnungs-Momente (3)
| Datei | Beschreibung |
|---|---|
| `levelup.mp3` | Kurze, erdige Fanfare — Amboss-Schlag + tiefes Horn, triumphierend aber düster (unser Ton!), ~2 s |
| `rare_drop.mp3` | „Jackpot"-Jingle: aufsteigender Gold-Schimmer mit tiefem Gong-Fundament, edel statt Casino, ~1,5 s |
| `quest_complete.mp3` | Pergament-Rascheln + zufriedener Bestätigungs-Akkord, ~1 s |

## C. Tätigkeits-Ambient-Loops (6 — je 30–60 s, nahtlos)
| Datei | Beschreibung |
|---|---|
| `amb_mining.mp3` | Höhlenhall: ferne Pickel-Schläge, Tropfen, tiefes Fels-Grollen |
| `amb_fishing.mp3` | Ufer: Wasser-Plätschern, gelegentliches Blubbern, ferner Wind |
| `amb_smithing.mp3` | Schmiede: Feuer-Knistern, Blasebalg, gedämpfte Hammer-Schläge |
| `amb_woodcutting.mp3` | Wald: Wind in Kronen, Knarren, ferne Axt-Schläge, Vogel vereinzelt (düster, kein Sommerwald) |
| `amb_cooking.mp3` | Küche: Kessel-Brodeln, Feuer, gelegentliches Zischen |
| `amb_farming.mp3` | Feld: Wind über Gras, Insekten spärlich, Erde/Harke — karg statt idyllisch |

## D. Kür (falls Lust — 3)
| Datei | Beschreibung |
|---|---|
| `amb_combat_ember.mp3` | Glutfelder-Zone: Glut-Knistern, Asche-Wind, fernes Grollen |
| `amb_combat_frost.mp3` | Frostkavernen: Eis-Knacken, hohler Wind, ferne Echos |
| `pet_unlock.mp3` | Kreaturen-Laut + warmer Begleiter-Akkord für den Pet-Erhalt-Moment, ~1,5 s |

**Prioritäts-Empfehlung:** A zuerst (ersetzt hörbare Platzhalter in JEDEM Kampf), dann B (die neuen
Juice-Momente verdienen ihre Sounds), C/D danach. Lieferung wie bei den Icons: Dateien in einen
Done-Ordner, Claude bindet ein + archiviert die Originale.
