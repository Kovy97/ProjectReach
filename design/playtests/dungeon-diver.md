# Playtest-Feedback: „Der Dungeon-Diver"

**Persona & Spielstil:** Endgame-Junkie, der nur für Dungeons lebt — Schlüssel farmen, Wellen-Runs
clearen, Boss-Loot abgreifen. Misst alles am Loop „Key → Run → Loot" und wird genervt, wenn ein
Glied davon zäh oder belohnungsarm ist.

## Was ich gespielt habe
Ich habe mich für jeden der 5 Dungeons auf Niveau gespielt (combatLevel über dem Gate, voll
ausgerüstet mit dem passenden Gear-Tier + Top-Food `cooked_voidray`) und gemessen:
1. **Key-Farm** im offenen Zonenkampf gegen den Boss, der den Schlüssel droppt (Ø über 5 Seeds).
2. **Run-Dauer** des Dungeons (alle Wellen) und **Clear-Loot pro Run** (Ø über 5 Seeds).
3. **Drop-Rate-Probe**: 500 echte Boss-Kills pro Boss, um die tatsächliche Key-Rate zu verifizieren.

Engine direkt angesteuert (`startCombat`, `startDungeon`, `advance`), kein UI. Sim-Zeit insgesamt
nur wenige Minuten Spielinhalt — was direkt mein größtes Problem ist (s.u.).

## Pacing-Messungen (Zahlen)

### Key-Drop-Rate (500-Kill-Probe → exakt wie definiert)
| Dungeon | Boss | def. Chance | gemessen (500 Kills) | Ø Kills bis 1. Key |
|---|---|---|---|---|
| goblin_warband | goblin_warlock L14 | 0.10 | 0.090 | ~5–10 |
| crypt_depths | skeleton_nekro L45 | 0.08 | 0.086 | ~12 |
| wildwood_hunt | forest_bear L45 | 0.08 | 0.074 | ~12 |
| highland_aerie | roc_storm L75 | 0.07 | 0.070 | ~14 |
| idol_sanctum | last_idol L120 | 0.06 | 0.056 | ~17 |

Die Drop-Rate **stimmt exakt** mit der Definition überein — kein RNG-Bug, kein gefühlter Betrug.
10–17 Boss-Kills für einen Schlüssel = ein paar Minuten Farm. Das ist **fair und nicht zu grindig**.

### Run-Dauer & Loot pro Run (passendes Gear)
| Dungeon | Wellen | Run-Dauer | Gold/Run (inkl. Clear-Bonus) | Clear-Loot Ø/Run |
|---|---|---|---|---|
| goblin_warband | 5 | **33 s** | 421 (Bonus 320) | warband_seal 0.40 |
| crypt_depths | 5 | **56 s** | 1460 (Bonus 1200) | sigil 0.40, ruby 0.40, runite_bar 0.40 |
| wildwood_hunt | 4 | **56 s** | 1106 (Bonus 900) | alpha_fang 0.00–0.6, hide 3.4, fang 1.4 |
| highland_aerie | 4 | **59 s** | 3563 (Bonus 3000) | storm_core 0.6, aether 1.4, feather 59 |
| idol_sanctum | 4 | **24 s** | 9645 (Bonus 8000) | idol_heart 0.6, onyx 0.4, godiron_bar 1.0 |

(0 Tode in 25 Runs mit jeweils passendem Gear — kein Run-Abbruch.)

## Was sich gut anfühlt ✅
- **Key-Drop-Rate ist genau richtig.** ~5–17 Boss-Kills pro Schlüssel = 1–5 Min Farm, und die
  Rate ist deterministisch korrekt (0.056–0.090 gemessen). Kein „gefühlter Beschiss".
- **Loop ist mechanisch sauber:** Boss farmen → Key → `startDungeon` verbraucht ihn → Wellen →
  Clear-Loot + dicker Gold/XP-Bonus. Tod = Run-Abbruch, Key futsch (echtes Risiko/Einsatz).
- **Boss-Skalierung der Keys ist clever:** Der Boss, der den Key droppt, ist zugleich die letzte
  Welle des Dungeons → man farmt den Key beim Reingehen gleich für den nächsten Run mit. Schöner,
  sich selbst tragender Endlos-Loop.
- **Reward-Schmuck ist craftbar & sinnvoll gestaffelt** (warband_signet J15 → heartforged_pendant
  J82, legendary). Das gibt dem Clear-Loot einen klaren Zweck.
- **Gold-Ausbeute steigt schön mit dem Tier:** 421 → 9645 Gold/Run. Idol-Sanctum-Runs fühlen sich
  fett an.

## Was sich zu schnell/zäh anfühlt ⚠️
- **RUNS SIND VIEL ZU KURZ.** 24–59 Sekunden für einen kompletten Dungeon-Clear. Für einen
  Endgame-Dungeon mit „Schlüssel-Einsatz" erwarte ich ein Erlebnis, kein 30-Sekunden-Wisch. Der
  Aufwand (Key farmen = Minuten) steht in keinem Verhältnis zur Belohnungsdauer (Sekunden). Das
  ist mein **Hauptkritikpunkt**.
- **Nur 4–5 Wellen pro Dungeon, alles bekannte Trash-Mobs.** Kein Zwischenboss, kein Mechanik-Twist,
  kein Pausen-/Entscheidungsmoment. Es ist „Auto-Battle bis es vorbei ist". Für einen Dungeon-Diver
  zu dünn — das ist Wellenkampf, kein Dungeon.
- **Drop-getriebene Clear-Belohnung verpufft oft.** Das namensgebende Reward-Material (warband_seal,
  alpha_fang …) hat nur 0.6 Chance — in ~40 % der teuren Runs geht man **ohne** das Schlüssel-Item
  raus, das man eigentlich wollte. alpha_fang kam in meinen 5 Wildwood-Runs sogar 0×. Das frustriert,
  wenn der Run ohnehin schon nichts kostet außer dem Key.
- **idol_sanctum (L100-Endgame) ist mit nur 4 Wellen kürzer als crypt_depths (5 Wellen).** Der
  Pinnacle-Dungeon sollte sich am längsten/episch anfühlen, nicht am kürzesten (24 s!).
- **Boss-Regen im Normal-Farm macht die Key-Farm-Zeit unberechenbar.** `skeleton_nekro` (regen 5 +
  enrage) respawnt im offenen Farm auf voller HP; bei schlechter RNG zieht sich ein einzelner Kill
  stark, einzelne Seeds brauchten massiv länger als der Schnitt. Im Dungeon (27 s für den Boss) ist
  das kein Thema, im Farm schon.

## Reibungspunkte & Frust (konkret)
1. **Aufwand/Belohnungs-Asymmetrie:** Minuten farmen für einen 24–59-s-Run. Der „Payoff-Moment"
   ist vorbei, bevor er anfängt.
2. **Kein Skalieren / kein Tiefgang:** keine Run-Modifier, keine wiederholbare „Tiefe N", kein
   höheres Risiko für mehr Loot. Als Endgame-Spieler habe ich nach 3 Runs alles gesehen.
3. **Nur 5 Dungeons, statische Wellenlisten.** Für eine endgame-orientierte Persona zu wenig
   Abwechslung — nach einer Stunde ist die Luft raus.
4. **Reward-Schmuck-Crafting verlangt hohe Jewelcrafting-Level (bis J82)**, die ein reiner
   Dungeon-Diver erst mal nebenbei hochziehen muss → die Dungeon-Belohnung ist an einen Off-Loop
   gekoppelt, der nicht „Dungeon" ist.

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht) + Vorschläge (priorisiert)

**P1 — Runs länger & gestuft machen.** Mehr Wellen (8–12) und/oder mehrere Boss-Phasen, plus eine
skalierbare **„Tiefe"/Stufen-Mechanik** (Tiefe 1, 2, 3 … mit steigender Mob-Power und steigendem
Loot/Key-Yield). Das macht aus dem 30-s-Wisch ein echtes Endgame-Pacing und gibt eine Progressions-
Achse („wie tief schaffst du es?"). Idol-Sanctum als längsten Run designen, nicht kürzesten.

**P2 — Garantierter Reward-Pity.** Das namensgebende Schlüssel-Reward-Material (sigil/seal/fang/
core/heart) sollte bei 0.6 Chance einen **Pity-Zähler** haben oder als garantierter Boss-Drop
beim Clear vergeben werden. Niemand soll einen teuren Run ohne das Kern-Reward verlassen.

**P3 — Run-Modifier / Mutatoren.** Optionale Affixe pro Run (mehr Gegner-Schaden → mehr Loot,
„kein Auto-Eat" → Bonus-Gold). Wiederspielwert pro Dungeon ohne neue Assets.

**P4 — Mehr Dungeons / Rotation.** 5 ist für Endgame dünn. Eine wöchentlich rotierende „Heroic"-
Variante eines bestehenden Dungeons (höheres Level-Gate, besserer Loot) wäre günstig zu bauen und
hält die Persona bei der Stange.

**P5 — Boss-HP/Regen im Normal-Farm glätten.** Damit die Key-Farm-Zeit nicht von einzelnen
Regen-Bossen ausreißt — entweder Regen im Open-World-Respawn deckeln oder Boss-Key auch von der
schwächeren Trash-Welle mit kleiner Chance droppen lassen.

## Spaß-Bewertung: **5 / 10**
Der Key→Run→Loot-Loop ist mechanisch sauber, fair gedroppt und ökonomisch belohnend — aber die
Runs sind mit 24–59 Sekunden viel zu kurz und zu seicht (4–5 Trash-Wellen, kein Tiefgang, kein
Skalieren), sodass für eine endgame-hungrige Persona nach einer Stunde alles gesehen ist.
