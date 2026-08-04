# Combat-Balance-Sweep 3 — RANGED, Band L45 (Mid)

**Tester:** Combat-Balance-Tester (Sweep 3, read-only) · **Datum:** 2026-07-04 · **Spiel:** Grim Reach (G:\GameDev)
**Auftrag:** Neuer Stand (Leder = Evasion, precision-Konter, Gegner-Trinität). STIL = Ranged, Shortbow + Longbow,
100 % Kampf, SPIELZEIT. Chef-Ziel: **„schwer aber fair — Vorbereitung nötig."**
**Methode:** Wegwerf-Vitest-Harness `_tmp_s3_r45_*` (packages/engine/src, nach dem Lauf gelöscht) — baut
on-level L45-Charaktere über echte Skill-Level + `computeStats`, farmt via `combatStep` gegen die
L45-Band-Monster (Auto-Restart nach Tod wie ein realer Idle-Spieler), 3 Seeds × 60 Sim-min je Zelle.
precision isoliert über einen 0-Schaden-Dummy mit gesetzter evasion (~580 Schuss/Zelle). **Kein Engine-/
Content-Eingriff, kein Fix.** Alle Zahlen unten sind gemessen, nicht geschätzt.

> **Harness-Falle (behoben, wichtig für Nachbauer):** 1 Mio Pfeile ins 20-Slot-Inventar zu kippen belegt
> ALLE Slots → Food/Trank passen nicht mehr rein (`addItem` gibt still 0 zurück). Erste Messreihe zeigte
> dadurch „NO-FOOD == FULL". Fix: Köcher über `ammoCount` (nicht Inventar) füttern, Food/Trank je 1 Slot,
> im Loop nachfüllen. Die endgültigen Zahlen unten sind mit tatsächlich wirksamem Food/Trank.

---

## TL;DR für den Chef

**Ranged @ L45 ist FAIR und stil-paritätisch — mit einer Einschränkung beim „schwer".** Kein unfairer
One-Shot (max. Einzeltreffer 10–21 % der HP, One-Shot-Cap bei 50 % greift nie). Alle drei Gegner-
defenseTypes (armor/evasion/ward) sind tötbar, precision funktioniert messbar gegen evasion-Gegner,
Longbow ist am mithril-Tier durchgängig ~7–11 % vor Shortbow. In der Stil-Parität liegt Ranged bei
Kill-Tempo **gleichauf bis leicht vorn** (Melee/Magie), stirbt mit Voll-Prep **nie**.

**Die „Vorbereitung nötig"-Frage ist zweischneidig:**
- **NÖTIG: ja, hart.** Komplett unvorbereitet (nackt, keine Heilung) = **134–167 Tode/h** = unspielbar.
- **ABER on-level mit Voll-Prep ist trivial sicher (0 Tode).** „Schwer" ist am on-level-Band **mild** —
  die Schwierigkeit ist ein **Ressourcen-/Uptime-Preis** (Food/Trank-Verbrauch), kein Todesdruck. Echter
  Todesdruck entsteht erst über-level (thorn_wolf L54) — und da hält Ranged sogar am besten durch,
  Magie kippt zuerst (19 Tode/h). → Design-Urteil für den Chef, **kein Bug**.

**Keine Engine-Bugs gefunden.** precision, Leder-Dodge, Leder-Floor, One-Shot-Cap, Gegner-Ward sind korrekt
verdrahtet. Zwei Content/Balance-Beobachtungen (F1 Ward-Lücke, F2 Shortbow dominiert) → siehe Findings.

---

## Build (on-level L45, Slayer 45 = Tower-fähig)

| Build | CL | maxHp | Schaden (min–max, Ø) | Intervall | Krit | acc | dodge | defense | precision | Sonstiges |
|---|---|---|---|---|---|---|---|---|---|---|
| **Ranged Shortbow** (mithril_shortbow) | 45 | 94 | 11.7–13.1 (12.4) | 2061 ms | 14 % | 33 | **57.9 %** | 0 | 0.15 | duskhide-Leder, mithril_arrow |
| **Ranged Longbow** (mithril_longbow) | 45 | 94 | 11.8–13.8 (12.8) | 2196 ms | 14 % | 33 | 57.9 % | 0 | **0.25** | + eagleEye (1. Treffer Krit) |
| Melee (mithril_sword+kite+plate) | 45 | 104 | 16.9–20.1 | 2580 ms | — | — | 0 | **84.7** (~40 % Mit.) | — | Block 33 %, innate Lifesteal |
| Magie (mithril_staff+aether) | 45 | 84 | 18.4–20.0 | 2880 ms | — | — | 0 | 0 | — | maxWard **138**, wardBreak 0.3 |

Skills je Stil: Offense 45 + vitality 45 + defence 45 + slayer 45 (Slayer nötig, um das Tower-Ward-Monster zu
öffnen; trainiert nebenbei con → +5 con/+12 HP). **Sensitivität geprüft:** ein „nackter" Ranged ohne Slayer
(82 HP statt 94) liefert im Stress-Test **identische Ergebnisse** (0 Tode, gleiches Tempo/Food) — die
Schlussfolgerungen hängen nicht an den +12 HP, weil der Dodge (58 %) die Überlebensarbeit trägt, nicht der HP-Pool.

**L45-Band-Monster (nach defenseType):**
- **armor:** `rootling_grunt` L45 (def23, hp47), `ash_tyrant` L45-Elite (def40, hp136)
- **evasion:** `pitch_beetle` L42 (eva11, hp67), `thorn_wolf` L54 (eva14, hp67 — over-level-Stress)
- **ward:** `tower_ember_elemental` L50 (ward8, hp28) — **nur im Slayer-Tower, Etage 3, Slayer-Level 40 gated** (F1)

---

## P1 — Ist Vorbereitung lohnend UND nötig? (Shortbow, rootling_grunt L45, 3 Seeds × 60 min)

| Szenario | Kills/h | Tode/h | Food/h | Trank/h |
|---|---|---|---|---|
| **FULL** (Leder + Food t1 + Trank) | 250 | **0.0** | 247 | 3 |
| MAXPREP (großes Food heal27 t3 + Trank) | 250 | 0.0 | 84 | 0 |
| **ARMOR-ONLY** (Leder, keine Heilung) | 242 | **21.7** | 0 | 0 |
| FOOD-ONLY (Leder + Food t1) | 250 | 0.0 | 252 | 0 |
| **NO-ARMOR** (nur Heilung) | 215 | 0.0 | **762** | **178** |
| NO-FOOD (Leder + Trank) | 250 | 0.0 | 0 | 181 |
| NO-POTION (Leder + Food) | 250 | 0.0 | 252 | 0 |
| **NO-PREP** (nichts) | 162 | **134.3** | 0 | 0 |

pitch_beetle (evasion) gleiches Muster: FULL 167/0.0 · NO-ARMOR 135/0.0 · NO-FOOD 167/0.33 · NO-POTION 167/0.0 · **NO-PREP 53/167.0**.

**Auslegung:**
- **Heilquelle = Überlebens-Hebel Nr. 1.** Leder ALLEIN ohne Heilung stirbt weiter (21.7 Tode/h — Dodge-Varianz-
  Bursts, die der 3-s-Auto-Eat-Takt nicht auffängt). **Irgendeine** Heilquelle (Food *oder* Trank) → 0 Tode.
- **Leder = Effizienz-Hebel Nr. 1.** NO-ARMOR überlebt zwar (0 Tode), verbrennt aber **762 Food + 178 Tränke/h**
  gegen 247 Food + 3 Tränke/h mit Voll-Prep — Leder **verdreifacht** die Sustain-Effizienz und macht Tränke fast
  überflüssig. Genau hier zahlt sich „Vorbereitung" spürbar in Gold/Uptime aus, ohne dass ein Tod nötig ist.
- **Zusammen Pflicht:** nackt + keine Heilung = 134–167 Tode/h = unspielbar. Man MUSS vorbereiten.
- **Aber:** jede EINZELNE Prep-Zutat reicht für 0 Tode on-level → die „schwer"-Komponente ist am on-level mild
  (s. TL;DR / F3).

---

## P2 — Fair? (kein unfairer One-Shot, Dodge-Varianz ok)

Max. **einzelner** eingehender Treffer vs. maxHp (ohne Heilung gemessen):

| Monster | max Treffer | % der maxHp (94) | % bei „nacktem" 82-HP-Ranged |
|---|---|---|---|
| rootling_grunt (L45) | 14 | 15 % | 17 % |
| ash_tyrant (L45-Elite) | 14 | 15 % | 17 % |
| pitch_beetle (L42) | 9 | 10 % | 11 % |
| thorn_wolf (L54, +9 lvl) | 20 | 21 % | 24 % |
| tower_ember_elemental (L50) | 19 | 20 % | 23 % |

- **Kein unfairer One-Shot:** der härteste Einzeltreffer im ganzen Band ist 21–24 % der HP. Der One-Shot-Cap
  (50 % maxHp) greift nie — er ist hier ein reiner Sicherheitsnetz-Puffer, kein aktiver Balance-Faktor.
- **Dodge-Varianz kontrolliert:** der Leder-Floor (−12 % auf gelandete Treffer) + 58 % Voll-Vermeidung ergeben
  eine mittlere Schadensdurchlässigkeit von ~37 % — niedriger als Melees ~60 %. Die Tode in ARMOR-ONLY (21/h)
  kommen aus seltenen Nicht-Dodge-Serien, die schneller sind als der 3-s-Auto-Eat-Takt — **mit Heilung
  vollständig aufgefangen** (0 Tode). Das ist die gewollte Glass-Cannon-Signatur, nicht ein unfairer Spike.
- **Mit Prep machbar:** jeder Kampf im on-level-Band ist mit Voll-Prep überlebbar (minHP nie unter ~74/94 im
  Einzelkampf); über-level (thorn_wolf L54) bleibt Ranged mit Food-only **0 Tode** (s. Stress-Tabelle).

**Verdikt P2: FAIR.** ✅

---

## P3 — Shortbow vs Longbow + precision gegen evasion-Gegner

**Einzelkampf-TTK (Sek., 8 Seeds gemittelt, ohne Heilung):**

| Monster | Shortbow | Longbow |
|---|---|---|
| rootling_grunt (armor) | 9.3 | **8.5** |
| ash_tyrant (armor-Elite, def40) | **29.4** | 30.3 |
| pitch_beetle (evasion) | 15.8 | 15.7 |
| thorn_wolf (evasion, hi) | 17.1 | **15.9** |
| tower_ember_elemental (ward) | 7.3 | 7.2 |

**Farm-Durchsatz (Kills/h, 60 min, Voll-Prep):** grunt 250 → **270** · beetle 167 → **178** · ward 283 → **313**
(Longbow durchgängig **+7…11 %**).

**precision-Konter — sauber isoliert (0-Schaden-Dummy, ~580 Schuss/Zelle):**

| Gegner-evasion | Shortbow (prec 0.15) | Longbow (prec 0.25) | Δ |
|---|---|---|---|
| 1 (armor-Typ) | 96.9 % | 97.4 % | +0.5 pp |
| 11 (pitch_beetle) | 80.2 % | 82.6 % | **+2.4 pp** |
| 14 (thorn_wolf) | 75.7 % | 77.2 % | +1.5 pp |
| 30 (hypothetisch hoch) | 51.9 % | 56.5 % | **+4.6 pp** |
| 60 (extrem) | 35.2 % | 35.0 % | ~0 (evasion dominiert) |

**Auslegung:** precision ist als weicher evasion-Konter **korrekt verdrahtet und messbar** — der Effekt
wächst mit der Gegner-evasion (im relevanten L45-Bereich eva 11–14: +1.5…2.4 pp), verschwindet gegen
armor-Gegner (eva ~1, Hit-Rate schon ~97 %). Longbow (mehr precision + mehr Max-Schaden + eagleEye) ist am
mithril-Tier die durchgängig **stärkere Farm-Waffe**; Shortbow feuert zwar schneller (2061 vs 2196 ms), aber
ohne Status-Proc bringt das Tempo hier **keinen** Vorteil → Shortbow ist an diesem Tier faktisch der schwächere
Longbow (Detail F2). **Feel:** Longbow = wuchtiger Sniper (bessere Treffer gegen wendige Ziele), Shortbow =
schnellere Kadenz ohne Auszahlung. Beide spielbar, Gap klein.

---

## P4 — Gegen alle 3 defenseTypes tötbar? + Stil-Parität

**Killability (Shortbow, Voll-Prep, 60 min) — alles tötbar, 0 Tode:**

| Monster (defenseType) | Kills/h | Tode/h |
|---|---|---|
| rootling_grunt (armor) | 250 | 0.0 |
| ash_tyrant (armor-Elite def40) | 105 | 0.0 |
| pitch_beetle (evasion) | 167 | 0.0 |
| thorn_wolf (evasion, L54 +9) | 159 | 0.0 |
| tower_ember_elemental (ward) | 283 | 0.0 |

Der Bogen trägt **keinen** wardBreak → gegen den Ward-Gegner absorbiert der Pool (8) den ersten ~½ Treffer,
danach voller Durchschlag. Bei Ward-Kapazität 8 vs. ~12-Schaden/Schuss ist das ein Nicht-Faktor (ward wird der
schnellste Kill überhaupt, weil das Monster nur 28 HP hat). Ranged braucht keinen Ward-Konter am L45-Band.

**Stil-Parität (60 min, Voll-Prep, gleiche Food/Trank je Stil):**

| Gegner | Ranged-short | Ranged-long | Melee | Magie |
|---|---|---|---|---|
| armor (grunt) | 251 · 0T · 253F | **271** · 0T · 301F | 257 · 0T · 267F | 260 · 0T · **7F** |
| evasion (beetle) | 168 · 0T · 379F | **176** · 0T · 355F | 166 · 0T · 364F | 154 · 0T · 412F |
| ward (elem) | 285 · 0T · 333F | **311** · 0T · 329F | 280 · 0T · 323F | 257 · 0T · 24F |

(Kills/h · Tode/h · Food/h)

**Stress-Parität — Food-only, Auto-Eat t1, KEIN Trank (echter Todesdruck, over-level/Elite):**

| Gegner | Ranged-short | Ranged-long | Ranged nackt (82HP) | Melee | Magie |
|---|---|---|---|---|---|
| thorn_wolf L54 (+9, evasion) | 165 · **0T** · 512F | 174 · **0T** · 529F | 165 · **0T** · 513F | 159 · **0T** · 626F | 139 · **19T** · 643F |
| ash_tyrant L45-Elite (def40) | 107 · 0T · 461F | 108 · 0T · 411F | 107 · 0T · 462F | 114 · 0T · **395F** | 103 · 0T · 636F |

**Auslegung Parität:**
- **Kill-Tempo:** Ranged liegt gegen alle drei defenseTypes **gleichauf bis leicht vorn** (Longbow oft am
  schnellsten). Kein Ranged-DPS-Defizit am L45-Band. Magie ist gegen evasion/ward am unteren Rand.
- **Überleben:** mit Voll-Prep sterben ALLE drei Stile nie (0 Tode) — on-level ist für jeden sicher.
  Im **Stress** (Food-only vs. over-level) ist **Ranged der sicherste Stil** (0 Tode, auch die 82-HP-Variante,
  weil Dodge die Gegner-Accuracy hart kontert), **Magie kippt zuerst** (19 Tode/h — Ward-Pool erodiert schneller
  als er nachlädt). Das ist eine **Magie**-Beobachtung, kein Ranged-Problem — nur der Vollständigkeit halber notiert.
- **Ressourcen-„Tax":** Ranged verbraucht on-level ~gleich viel Food wie Melee (253–379/h), **nicht** mehr;
  Magie ist der Ausreißer nach unten (7–24 Food/h — der Ward-Pool ersetzt Food fast ganz). Die oft vermutete
  „Ranged zahlt mehr Sustain als Melee"-Steuer ist am L45-on-level **nicht** vorhanden (erst ohne Leder, s. P1).

**Verdikt P4: alle defenseTypes tötbar, Stil-Parität erfüllt.** ✅

---

## Findings (priorisiert)

| # | Sev | Finding | Beleg | Owner |
|---|---|---|---|---|
| **F1** | **P3** | **Kein frei zugänglicher ward-Gegner im L45-Band.** Der einzige ward-Typ nahe L45 ist `tower_ember_elemental` (L50), und der steckt im **Slayer-Tower Etage 3 (Slayer-Level 40)**. Frei erreichbare ward-Mobs: `goblin_warlock` (L30) → dann Lücke → `bramble_witch` (L60). Ein L45-Spieler ohne Slayer-40 kämpft im Normalspiel **nie** gegen einen ward-Gegner — die Trinität ist im offenen L45-Band unvollständig, und der „precision/wardBreak lernt man am Gegner"-Loop fehlt hier. | Monster-Dump: alle ward-Mobs L38–54 zone=slayer_tower; `canFightMonster`→`towerFloorUnlocked` blockte startCombat (0 Kills, bis Slayer 45 gesetzt). | **Content-Dev / Balance-Designer:** einen offenen (Nicht-Tower) ward-Gegner ins L40–55-Band legen. |
| **F2** | **P4** | **mithril_shortbow wird von mithril_longbow dominiert.** Longbow hat mehr Schaden (13.8 vs 13.1 max), mehr precision (0.25 vs 0.15) UND eagleEye; Shortbows einziger Vorteil (schnelleres Intervall) zahlt sich ohne Status-Proc an diesem Tier nicht aus → +7…11 % Durchsatz für Longbow überall, kein Shortbow-Fenster. Gilt der ganzen shortbow/longbow-Linie (dmg-Range + prec 0.15/0.25 + eagleEye systematisch zugunsten Longbow). | P3-Tabellen; Waffen-Dump req40-Tier. | **Balance-Designer:** Shortbow eine echte Nische geben (z.B. deutlich höheres Tempo/mehr Krit oder Proc-Affinität), sonst ist Shortbow „der schlechtere Longbow". Niedrige Priorität (by-design-nah). |
| **F3** | **P4** | **„Schwer" ist am on-level mild.** Mit Voll-Prep 0 Tode gegen jedes L45-Monster; die einzige Bestrafung ist Ressourcen-/Uptime-Kosten, nicht Tod. Echter Todesdruck erst über-level. Falls der Chef on-level „gefährlicher" will, ist der Hebel die **Auto-Eat-Reaktion** (3-s-Cooldown) oder Monster-Burst — NICHT der One-Shot-Cap (greift nie). Design-Urteil, kein Defekt. | P1/P4-Tabellen (0 Tode Voll-Prep); Stress zeigt Tode erst L54. | **Chef / Balance-Designer** (Urteil, kein Fix). |

**Keine Engine-Bugs.** precision (`monster.evasion·(1−precision)`), Leder-Dodge (`evasionRating/(evasionRating+K)`),
Leder-Floor (−12 %), One-Shot-Cap (50 % maxHp), Gegner-Ward-Absorb — alle korrekt verdrahtet und im Kampf
messbar aktiv. „Definiert aber nie gelesen" trifft auf keines der geprüften Felder zu.

## Gesamt-Empfehlung

**Ranged @ L45: SHIP.** Fair (kein unfairer One-Shot), stil-paritätisch (Kill-Tempo gleichauf/leicht vorn,
0 Tode mit Prep), precision-Konter funktioniert, alle defenseTypes tötbar, Prep ist echt nötig (nackt = Tod)
und lohnend (Leder ×3 Sustain-Effizienz). Zwei Nachfass-Punkte fürs Content-/Balance-Team (F1 Ward-Lücke =
klarster Handlungsbedarf, F2 Shortbow-Nische), plus ein Chef-Urteil zu „wie schwer soll on-level sein" (F3).
Kein Combat-Code-Eingriff empfohlen.
