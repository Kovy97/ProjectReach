# Playtest-Feedback: „Der Gelegenheits-Idler"

## Persona & Spielstil
Spielt in kurzen Sessions, geht ständig offline/AFK, will **nicht** mikromanagen. Wählt intuitiv
**eine** Aktivität, lässt sie laufen und freut sich beim Zurückkommen über Fortschritt. Wird genervt
von zu langsamem Fortschritt, von Überforderung (zu viele Entscheidungen) und davon, beim Zurückkommen
festzustellen, dass „nichts passiert ist".

## Was ich gespielt habe (Sim-Verlauf)
Deterministische Engine-Sim (Seeds 1234/4242/7777/999/321), reines Idle mit minimalen Eingriffen:
1. **Session 1** – 8h Holzfällen am Stück (`cut_normal_tree`).
2. **Session 2** – 2h Holz → verkaufen → Bronze-Gear + Essen kaufen → 6h Auto-Battle vs `goblin`.
3. **Session 3** – **1 Woche** durchgehend `mine_copper` (Offline-Gefühl).
4. **Session 4** – Wie weit ist der erste Dungeon (combatL30-Gate)? 200h Goblin-Grind + Gegencheck vs `goblin_butcher`.
5. **Session 5** – Erreichbarkeit von Auto-Eat & Slot-Upgrades.

## Pacing-Messungen (konkrete Zahlen)

### Sammeln (Holz/Erz) — sehr schnell, sehr idle-freundlich
| Aktivität | XP/h | Meilenstein |
|---|---|---|
| `cut_normal_tree` | **~6.700 XP/h** | WC **L10 nach <1h**, L27 nach 1h, **L43 nach 8h** |
| `mine_copper` (1 Woche) | — | L27 @1h · L52 @24h · L59 @48h · **L71 @168h** |
| XP-Schwellen | — | L10 = 1.154 · L30 = 13.363 · L50 = 101.333 |

> 1h `cut_normal_tree` (xp 4) bringt schon **L27** — Skill-Level explodieren am Anfang.

### Kampf — viel Gold, aber Combat-Level kriecht
| Metrik (vs `goblin`, Bronze-Gear) | Wert |
|---|---|
| Kills/h | **~1.282** |
| Gold/h | **~8.100** |
| Deaths in 6h | **0** |
| combatLevel nach 6h | **12** |
| combatLevel nach **200h** | **nur 23** (Ziel ist 30) |

### Erster Dungeon (`crypt_depths`, Gate: combatL30 + `crypt_key`)
- **Goblin-Grind (xp 1/Kill): combatL30 nach >200h NICHT erreicht** (nach 200h/8,3 Tagen erst L23).
- Gegencheck `goblin_butcher` (xp 6): **>300h immer noch nicht L30**, dabei **254 Deaths** (zu stark für Bronze).
- `crypt_key` droppt nur vom **Necromancer Lord (Lvl 45)** — der steckt **im Crypt-Zone hinter dem L30-Gate**. → **Henne-Ei-Problem**, für den Casual praktisch unsichtbar.

### Upgrades
- Auto-Eat Tier 1 = **2.000 g** → bei 8.100 g/h **nach ~15 min Combat** locker drin. ✅
- Inventar-Start: **10 Slots**.

## Was sich gut anfühlt ✅
- **Sammeln belohnt Idle hervorragend.** Genau das, was die Persona will: Aktion setzen, weggehen, beim
  Zurückkommen sind +20 Skill-Level + tausende Items da. 6.700 XP/h fühlt sich saftig an.
- **Auto-Battle ist robust & sicher.** 0 Deaths über 6–200h gegen passende Gegner, riesiger Gold-Strom
  (8k/h). Man kann blind weglaufen — kein Babysitting nötig. Perfekt für die Persona.
- **Niedrige Einstiegshürde beim Gear:** Bronze-Schwert (80g) + Leder ist nach 2h Sammeln + Verkauf
  problemlos finanziert (Startkapital ~2.800 g).
- **Determinismus/Offline-Modell** (`advance` treibt Live UND Offline) ist sauber — Offline-Fortschritt
  ist 1:1 derselbe Code, also kein „Offline schummelt"-Misstrauen.

## Was sich zu langsam/zäh anfühlt ⚠️ (mit Zahlen)
1. **Combat-Level ist ein Sumpf.** `combatLevel` mittelt **7** Kampf-Skills, aber ein Nahkampf-Kill
   füttert nur **4** davon (attack/power/defence/vitality). magic_off/ranged/magic_def bleiben **ewig L1**
   und ziehen den Schnitt nach unten. Folge: **200h reines Idle → nur combatL23.** Für „nicht
   mikromanagen" ist das tödlich — der einzige Weg zu L30 wäre, **bewusst den Stil zu wechseln** und
   alle drei Stile getrennt hochzuspielen. Genau die Mikro-Entscheidung, die die Persona hasst.
2. **Erster Dungeon ist faktisch unerreichbar für einen Single-Style-Idler.** Gate combatL30 wird im
   getesteten Zeitraum nie erreicht; und der Key (`crypt_key`) liegt **hinter** dem Gate. Der Casual
   sieht „Dungeon" als totes Feature — eine **Durststrecke ohne sichtbares Ziel**.
3. **Monster-Kill-XP ist winzig (1–7) vs. Sammel-XP (4–480/Aktion).** Combat fühlt sich
   levelmäßig wie Stillstand an, obwohl Gold sprudelt. Die beiden Progressions-Spuren sind massiv
   entkoppelt: Sammeln = schnelle Level, Combat = schnelles Gold, langsame Level.
4. **Inventar läuft nie voll — im Wortsinn.** 1 Woche Mining = **288.287 Erz auf 10 Slots**, Aktion nie
   gestoppt (unendliche Stacks). Gut fürs „nichts geht verloren", aber: es gibt **keinerlei
   Soft-Cap/Reibung**, die Idle interessant macht (kein Grund zurückzukommen außer „mehr von allem").

## Reibungspunkte & Frust (konkret)
- **Kein klares „nächstes Ziel"**: Nach „Bronze gekauft, Aktion läuft" gibt es für die Persona kein
  geführtes nächstes Etappenziel. Der Dungeon wäre eins — ist aber unsichtbar/unerreichbar (s.o.).
- **Stärkeren Gegner wählen = Tod**: `goblin_butcher` mit Bronze = 254 Deaths. Der Casual hat kein
  Feedback „dafür brauchst du besseres Gear/Level X" — er pickt ein Monster und stirbt im Loop.
- **Stil-System ist eine versteckte Pflicht-Entscheidung**: Um combatLevel zu bewegen, MUSS man
  magic+ranged mitziehen. Das ist für die Persona Overhead ohne erkennbaren Anreiz.

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht) + Vorschläge (priorisiert)
1. **[HOCH] combatLevel-Definition entkoppeln vom Idle-Killer.** Optionen: (a) combatLevel = Schnitt der
   **genutzten** Stil-Skills statt aller 7, oder (b) Dungeon-Gate gegen eine **einzelne** Stil-Spur (z.B.
   „attack L30") statt den 7er-Schnitt. So erreicht ein Single-Style-Idler das Gate durch reines Idle.
2. **[HOCH] Dungeon-Key vor das Gate ziehen.** `crypt_key` (oder ein Tutorial-Key) sollte von einem
   **vor** dem Gate erreichbaren Monster droppen, damit der Dungeon ein sichtbares, erreichbares Ziel
   ist, sobald man combatL30 hat — nicht erst danach.
3. **[HOCH] Combat-Kill-XP anheben (Faktor ~3–5x)** oder pro Kill auf eine Stil-Spur **bündeln**, damit
   Combat-Idle sich beim Zurückkommen nach Level anfühlt, nicht nur nach Gold.
4. **[MITTEL] „Empfohlenes Level"/Gefahr-Marker pro Monster**, damit der Casual nicht in 254-Death-Loops
   rennt. Eine simple Zahl reicht, kein Mikromanagement.
5. **[MITTEL] Offline-Rückkehr-Belohnung sichtbar machen**: „Während du weg warst: +X Level, +Y Gold,
   Z Items". Für die Persona ist das **das** Kern-Gefühl — aktuell muss man es selbst zusammenrechnen.
6. **[NIEDRIG] Sammel-Soft-Cap / Bank-Anreiz**: Ein Grund, periodisch zurückzukommen (z.B. Bank-Upgrade,
   Verarbeitungs-Ketten), statt nur unendlich zu stapeln. Gibt dem Wiederkommen Substanz.
7. **[NIEDRIG] Early-XP-Kurve glätten**: L1→L27 in 1h ist fast schon zu schnell — der erste „Fortschritt"
   verpufft, weil Level keine spürbaren Freischaltungen bringen (nächster Baum erst L10/20/30).

## Spaß-Bewertung: **6 / 10**
Das Idle-Sammeln + Auto-Battle-Gold ist genau mein Ding (entspannt, belohnend, kein Babysitting),
aber das Combat-Level kriecht und der erste Dungeon ist als Single-Style-Idler praktisch unerreichbar —
mir fehlt ein klares, erreichbares „nächstes Ziel" beim Zurückkommen.
