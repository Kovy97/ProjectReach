# Retest: Der Nahkampf-Haudegen

**Bezug:** Folge-Playtest zu `melee-bruiser.md` (vorher **5/10**). Gleiche Persona (prügeln, Gear looten,
Dungeons legen, minimal skillen, `power`-Stil + Auto-Eat). Validiert wurden gezielt meine 3 Hauptkritik-
punkte. Alles deterministisch in der Engine gemessen (Seed 7/11), Wegwerf-Test wieder gelöscht.

---

## FIX 1 — combatLevel-Formel: **GREIFT.** Mein größter Frust ist weg. ✅

Neue Formel (`engine/dungeon.ts`):
`round(0.25*(defence+vitality) + 0.5*max((attack+power)/2, ranged, (magic_off+magic_def)/2))`.

**Kernfrage beantwortet — ein reiner Nahkämpfer erreicht jetzt combatLevel 99 und alle 5 Dungeons:**

| Build | combatLevel | Gates |
|---|---|---|
| Reiner Melee: attack/power/defence/vitality = 99, ranged/magic = **L1** | **99** | **ALLE 5 offen** |

Dungeon-Gate-Check (reiner Melee L99, ranged/magic L1):
```
goblin_warband  reqLv 12 -> ZUTRITT
crypt_depths    reqLv 30 -> ZUTRITT
wildwood_hunt   reqLv 34 -> ZUTRITT
highland_aerie  reqLv 65 -> ZUTRITT   (vorher mathematisch unerreichbar)
idol_sanctum    reqLv 99 -> ZUTRITT   (Gate von 100 -> 99 gesenkt; reiner Melee schafft exakt 99)
```

combatLevel skaliert jetzt 1:1 mit dem gleichmäßigen Melee-Level (L20→20, L50→50, L90→90, L99→99).
Das ist genau das OSRS-artige Verhalten, das ich in P0 vorgeschlagen hatte. **Mein „versteckter
Mathe-Trick gegen mich" existiert nicht mehr** — ich kann durch reines Nahkampf-Leveln das ganze
Endgame öffnen. Das ist der eine Fix, der für meine Persona alles ändert.

### ⚠️ Eine neue, subtile Falle (ehrlich): `attack` darf man nicht vergessen
Die Melee-Offense ist `(attack+power)/2` — beide Nahkampf-Skills zählen. In meinem *alten* Spielstil
habe ich nur `power` getrunken und `attack` auf L1 gelassen. Damit:

| Build | combatLevel | aerie 65 | idol 99 |
|---|---|---|---|
| attack **1**, power 99, def 99, vit 99 | **75** | OK | **NEIN** |
| attack 50, power 99, def 99, vit 99 | 87 | OK | NEIN |
| attack 99, power 99, def 99, vit 99 | **99** | OK | OK |
| (mein realer Alt-Endstand) power 83, def 56, vit 71, attack 1 | **53** | NEIN | NEIN |

Das ist *kein* Bug — es ist designsinnvoll, dass ein „kompletter" Nahkämpfer beide Melee-Skills
trainiert (genau dafür gibt es ja attack-vs-power-Stile). Aber: Ein Spieler, der nur `power` farmt,
landet bei combatLevel 75 und steht **kurz vor** idol_sanctum, ohne im Spiel zu sehen warum.
**Bitte ein UI-Hinweis am Dungeon-Tor** („benötigt combatLevel 99 — trainiere auch attack").
Mit Stil-Cycling (attack/power abwechselnd) löst sich das von selbst. Frust-Risiko: niedrig, aber
real, weil man so nah dran ist.

---

## FIX 2 — Combat-Gold gespreizt: **greift teilweise.** Farm-Spot-Meta existiert, ist aber flach. ⚠️➕

`mob.gold`-Basis ist jetzt klar geometrisch gestaffelt (Faktor **8,0×** über die gemessenen Mobs),
**aber** gold/h ist nur **2,1× gespreizt**, weil höherwertige Mobs deutlich zäher sind (mehr HP/Def →
weniger kills/h). Gemessen (geared Held, godiron-Set, power, voll schnell):

```
mob                  lv  mob.gold  kills/h   gold/h
goblin                1       7      1471    12.477
pitch_beetle         14       9      1450    15.884
goblin_butcher       10      10      1484    17.732
thorn_wolf           20      14      1406    23.855
spectral_stag        28      20       721    17.316
moss_golem           24      21       776    19.718
ash_tyrant           20      23       751    21.033
rootling_treemonster 32      56       391    26.389
```

**Was gut ist:** Der Top-Mob (rootling_treemonster, 26,4k g/h) schlägt den Einstieg (goblin, 12,5k)
klar — Farmen lohnt sich jetzt *mehr* oben als unten, anders als früher, wo alles um ~6–16k schwankte
ohne klare Richtung. Ein „bester Farm-Spot" existiert.

**Was noch hakt:**
- Die Spreizung ist mit **2,1×** flach. Das angepeilte „~19k→90k g/h, ~4,6×" sehe ich in meiner
  Stichprobe **nicht** — der HP-Anstieg frisst den gold-Anstieg fast wieder auf.
- gold/h ist **nicht monoton** zum mob.gold: thorn_wolf (mob.gold 14) liefert 23,9k g/h und schlägt
  ash_tyrant (mob.gold 23, 21,0k) und moss_golem, weil thorn_wolf schnell stirbt (1406 vs 751 kills/h).
  Der „Farm-Spot" ist also eher ein gold-pro-kill-vs-kill-tempo-Optimierungsspiel als eine saubere
  „höheres Level = mehr g/h"-Treppe. Für mich als Optimierer ok, aber die Intention (Top ≈ 4,6×
  Einstieg) ist nicht erreicht.
- Gold bleibt **nie ein Engpass** (Shop-Gear in Minuten bezahlt) — die Spreizung ändert *was* ich
  farme, nicht *ob* mir Gold fehlt. Das war aber auch nicht das Versprechen.

**Verdict:** Richtung stimmt, Effektgröße zu klein. Wenn ihr die 4,6×-Treppe wirklich wollt, müsst ihr
mob.gold an den HP-Anstieg koppeln (gold/kill ↑ schneller, damit gold/h trotz weniger kills/h steigt).

---

## FIX 3 — Thematische Melee-Drops: **GREIFT voll.** Endlich rüste ich durchs Kämpfen auf. ✅

Reine Kämpfer können jetzt durch Grind aufrüsten, ohne Schmieden/Shop. Geprüfte Melee-Drops:

| Item | Quelle @ Chance | Slot | Bonus | Effekt | Req |
|---|---|---|---|---|---|
| **boar_tusk_mace** | boar @ 3,0% | mainhand | dmg6 acc8 def3 hp8 | — | atk 4 |
| **mire_fang_dagger** | mire_crawler @ 2,5% | mainhand | dmg8 acc18 crit8% iv−400 | bleed 22% m4 | atk 6 |
| **chitin_bulwark** | pitch_beetle @ 2,5% | offhand | def10 hp22 ev6 | — | def 12 |
| **thornfang_blade** | thorn_wolf @ 2,0% | mainhand | dmg16 acc22 crit5% | **bleed 28% m7** | atk 18 |
| **moss_plate_body** | moss_golem @ 2,5% | body | def22 hp58 ev6 (+2 con) | — | def 22 |
| **ashen_reaper** | ash_tyrant @ 2,0% | mainhand | **dmg30 acc38** crit4% | **burn 30% m8** | atk 18 |

**Tatsächlicher Grind (mid-game Melee L25, iron-Set, 4 h Sim):**
```
thorn_wolf   4h ->  2396 kills  thornfang_blade x46  (2,0% -> erwartet ~48)
ash_tyrant   4h ->  1692 kills  ashen_reaper    x34  (2,0% -> erwartet ~34)
moss_golem   4h ->  1766 kills  moss_plate_body x45  (2,5% -> erwartet ~44)
pitch_beetle 4h ->  2851 kills  chitin_bulwark  x72  (2,5% -> erwartet ~71)
```
Drop-Raten verhalten sich exakt wie deklariert. Erster Drop fällt im Schnitt nach **~1,4–1,7 min**
Grind (1/chance ÷ kills-pro-min) — also fast sofort. Das fühlt sich richtig an: Ich schlage einen
thematischen Boss-Mob und seine Klinge fällt. **ashen_reaper (dmg30, acc38, burn 30%)** ist als
Drop ein echtes Schwert-Upgrade gegenüber dem iron_sword und genau das „freu mich auf jede Klinge"-
Gefühl, das mir fehlte. Mire-Dagger (schnell, crit, bleed) und Boar-Mace (früh, tanky) geben sogar
Build-Varianz. **Top-Fix für meine Persona.**

Kleiner offener Punkt: Es bleibt bei Iron-/Blacksteel-Tier-Niveau. Die wirklich fetten Tiers
(runite/godiron) sind weiter Dungeon-Loot — aber das ist jetzt ok, **weil ich die Dungeons dank Fix 1
endlich betreten kann**. Die „doppelte Mauer" aus dem Original ist damit eingerissen.

---

## Was sich jetzt gut anfühlt
- **Reiner Melee öffnet das komplette Endgame** (combatLevel 99, alle 5 Dungeons). Das war der Killer
  — er ist tot. Allein dafür gehe ich deutlich hoch.
- **Aufrüsten durchs Kämpfen** funktioniert: thematische Drops mit Bleed/Burn, sofort spürbar.
- **Farm-Spot-Entscheidung existiert** (Top-Mob ~2× Einstieg) statt „überall gleich".
- Kampf-Loop, Auto-Eat, Effekte, Tier-Staffelung: weiterhin sauber und deterministisch, 0 Crashes.

## Was noch offen ist
1. **Gold-Spreizung zu flach (2,1× statt ~4,6×)** und nicht monoton — HP-Anstieg frisst den
   gold-Anstieg. Intention nur halb erreicht.
2. **attack-Falle:** Wer nur `power` grindet, klemmt bei combatLevel 75 und versteht nicht, warum
   idol_sanctum (99) zu bleibt. Braucht ein sichtbares Gate-Feedback („benötigt combatLevel 99").
3. **Schwierigkeit/Gefahr** habe ich diesmal nicht neu vermessen, war aber im Original mein P1: 0 Tode
   bei 99k Kills. Wenn das unverändert ist, bleibt Combat spannungsarm — bitte separat angehen.

## Spaß-Bewertung: **8/10** (vorher 5/10)
Der eine Fix, der zählte, sitzt: Als reiner Nahkampf-Haudegen werde ich nicht mehr vom halben Endgame
ausgesperrt, und ich rüste jetzt **durchs Kämpfen** auf statt nur im Shop/Dungeon. Das hebt mich von
5 auf 8. Die fehlenden 2 Punkte: die Gold-Spreizung greift nur halb, das Combat ist (vermutlich noch)
zu gefahrlos, und die attack-Falle braucht ein Hinweis-Feedback, damit niemand bei combatLevel 75 ratlos
vor dem letzten Dungeon-Tor steht.
