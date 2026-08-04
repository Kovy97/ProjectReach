# Sweep 4 — Foraging (Sammeln) Deep-Dive & Note

**Agent:** Skill-Deep-Dive #07 · **Datum:** 2026-07-01 · **Methode:** echter Engine-Treiber (headless),
`SimPlayer` (`createGame` + `setActiveAction` + `advance`) über die reale Aktions-Engine (`tick.ts
completeAction`). Gemessen: base-xph-Tabelle + Best-Line-Monotonie (33 Aktionen), **realer** XP/h je
Aktion @reqLevel mit best-verfügbarer Sichel (1 h Spielzeit je Aktion), Werkzeug-Delta, **voller
L1→99-Durchlauf als reiner Skiller** (Mats verkaufen → Sicheln kaufen, 121,8 h simuliert), sporewretch-
Pet über den echten Aktions-Pfad, Reagenz-Zulieferung + Mastery-Endstand. Temp-Skript
`foraging-sweep.test.ts` (6 Tests, grün) nach dem Lauf **gelöscht**. Kein Spiel-Code geändert.

**NOTE: A−** — mechanisch sehr sauberer, aktiver Sammel-Skill. XP/h **streng monoton** auf der Best-Line
L1→99, **keine toten/regressiven Tiers**, **enger Freischalt-Takt** (33 Aktionen, größte Lücke 6 Level),
echte 5-stufige Sichel-Werkzeug-Leiter (alle im Shop, +7,7 %…+73 % Tempo), **felt Mastery** (Endgame-
Aktion erreicht MasteryL87 ≈ 43 % Doppelertrag + 13 % Tempo), **pet über den realen Pfad dropbar** und
mit ~0,96 Erwartung/Grind **realistisch** (P≈62 %, weit gesünder als Farmings Witherling), **starke
Zulieferung** an Herblore/Runecrafting + Farming-Saaten, **kein Combat-Gate** (reiner Skiller erreicht
99 mit 0 Kämpfen, dim_essence-Frühquelle bestätigt). Abzüge nur klein/systemisch: die **Preserve-
Mastery-Achse ist für Sammel-Skills tot** (Foraging hat keine `inputs`), die Sichel-Leiter **endet bei
L65** (34 Level ohne neues Werkzeug; Parität mit Fishing), und die XP/h liegt früh ~2,7–3,0× über der
alten Zielkurve (front-loaded, skillübergreifend). **Keine P0/P1/P2.**

---

## 1) XP/h-Kurve L1→99 — streng monoton, keine toten/regressiven Tiers (confirmed)

Zwei bewusst getrennte Spuren: **Region-Track** (ashfields→deepwood→…→gravewood, XP-optimal, ~1,28×
Zielkurve) und **Vertrags-/Reagenz-Tracks** (marshroot/sootcaps/essence/pigment/fungus, auf der
Zielkurve ~1,0×). Die **Best-Line** (höchstes verfügbares base-xph je Freischalt-Level) ist über alle
31 Freischalt-Punkte **streng monoton** (Assertion grün). Real gemessen (mit best-verfügbarer Sichel,
Mastery 0, 1 h/Aktion):

| Lvl | beste Aktion | base xph | **real xph (Sichel)** | r=base/Ziel |
|----:|--------------|---------:|----------------------:|:-----------:|
| 1 | forage_marshroot | 2.400 | **2.614** (crude) | 2,93 |
| 6 | forage_sootcaps | 3.176 | 3.468 | 3,00 |
| 12 | forage_ash_essence | 3.789 | 4.536 (iron) | 2,67 |
| 15 | forage_deepwood | 4.320 | 5.178 | 2,62 |
| 25 | forage_blightmarsh | 5.250 | 6.972 (steel) | 1,95 |
| 40 | forage_cinderwood | 7.333 | 9.779 | 1,30 |
| 50 | forage_witchlights | 9.290 | 14.096 (runite) | 1,00 |
| 55 | forage_frostmire | 15.097 | 23.036 | 1,27 |
| 70 | forage_gloomfen | 31.886 | 58.714 (void) | 1,28 |
| 85 | forage_voidheath | 66.923 | 126.440 | 1,28 |
| 95 | forage_gravewood | 110.455 | 214.380 | 1,28 |

**Kein einziges Tier ist regressiv oder tot.** Jede der 33 Aktionen ist entweder auf der Best-Line ODER
eindeutige Quelle eines spezifischen Reagenz (z.B. `forage_ashfields`=graywort, `forage_gravemoss`=
herb_gravemoss, `forage_verdant_blooms`=pigment_verdant) — keine strikt dominierte Aktion. Die
Reagenz-Track-Aktionen liegen bewusst ~20 % unter der Region-Track-xph (Spezialisierungs-Trade-off,
sinnvoll). Voller Durchlauf: **L99 in 121,8 h** (Region-Track + Sichel-Upgrades), Zeit/Level steigt
glatt monoton 2,6 min (L1–10) → 274 min (L95–99). Keine Reibungsspitzen, keine Dead-Bands.

> Hinweis (systemisch, kein Foraging-Bug): frühe xph ~2,7–3,0× der alten Zielkurve `90·√Δxp`. Fishing
> zeigt dasselbe (L5 ~3,08×). Die 2026-07-Balance-Fixes haben die Gather-xph über die Juni-Zielformel
> gehoben; die Formel ist als *absolute* Referenz veraltet, die *interne* Foraging-Kurve ist sauber.

---

## 2) Freischalt-Takt — dicht, keine Leerläufe (Stärke)

**33 Aktionen**, Unlocks bei L1/1/1/5/6/9/12/15/18/22/25/27/33/38/40/42/47/50/53/55/58/62/67/70/73/78/
82/85/87/90/93/95/97. Größte Lücke **6 Level** (L27→33), sonst durchgängig alle 2–5 Level etwas Neues
(neue Region **oder** neuer Reagenz-Kontrakt). Das ist deutlich dichter als Farming (10-Level-Löcher).
Dazu **Werkzeug-Freischaltungen** bei L10/25/45/65 → auf jedem Abschnitt bleibt der Spieler beschäftigt.

---

## 3) Werkzeug-Progression — echte 5-stufige Sichel-Leiter, spürbar

| Sichel | speedMult | req | Shop-Kosten | Δ xph vs. keine |
|--------|:---------:|:---:|:-----------:|:---------------:|
| crude_sickle | 0,93 | L0 | 100 g | +7,7 % (gemessen) |
| iron_sickle | 0,85 | L10 | 280 g | +17,6 % |
| steel_sickle | 0,77 | L25 | 720 g | +29,9 % |
| runite_sickle | 0,68 | L45 | 1.700 g | +47,1 % |
| void_sickle | 0,58 | L65 | 3.800 g | **+73,4 %** (gemessen) |

Sauber gestaffelte, spürbare Sprünge (~+8…+15 % je Tier), **alle im Shop** (Gesamt 6.600 g — trivial aus
Verkaufserlös finanzierbar). Byte-identisch zur Fishing-Rutenleiter (Parität). **Einzige Schwäche:**
die Leiter **endet bei void L65** — die letzten 34 Level (L65–99) bringen kein neues Werkzeug (Mastery-
Tempo füllt das teilweise). Parität mit Fishing, aber beide vermissen ein Endgame-Tier.

---

## 4) Pet + Bonus-Drops — sporewretch dropbar & realistisch (confirmed)

`tryPetDrop({kind:"skill", skill:"foraging"})` läuft in `completeAction` **pro abgeschlossener Aktion**
— Pfad **bestätigt aktiv**: im vollen L1→99-Lauf (seed 11) fiel **sporewretch** (`ownedPets=true`).
`dropChance = 1/120.000` pro Aktion; ein voller Grind erzeugt **~115.147 Aktionen** ⇒ Erwartung ≈
**0,96**, P(≥1) ≈ **62 %**. Weil Foraging **aktiv** ist (eine Aktion alle paar Sekunden, ~950 Würfe/h
im Endgame), bekommt der Skill Größenordnungen mehr Würfe als das passive Farming — der Sammel-Pet ist
damit **weit gesünder** als der Witherling (dort ~1,5 %). Bonus-Drops sinnvoll: feather (Fletching),
birds_nest, wildhive_honey (Cooking), rough_garnet/sapphire/ruby/diamond (Jewelcrafting, ~1 %).

*Stichprobe (3 seeds × ~45k Aktionen = ~135k, Erwartung 1,12): 0/3 Drops — innerhalb der Varianz
(P(0)=e^−0,37≈69 %/seed); der reale Grind-seed droppte ihn. Mechanik bestätigt.*

---

## 5) Gold/Ökonomie — stark & exploit-frei

Foraging-Aktionen geben **kein** direktes Gold; Einkommen = Verkauf der Mats. Voller Lauf: **9,79 M Gold
brutto** aus Verkauf, **~80.451 Gold/h** (wenn man ALLES vendored), Werkzeugkosten nur 6.600 g. Damit
finanziert der Skill seine gesamte Werkzeug-Leiter trivial und ist ein **starker Gold-Lieferant**. Kein
Exploit: keine `gold`-Aktion, keine Input-losen Loops mit >Verkaufswert-Output; Mat-Werte skalieren
sauber mit Tier (graywort 5 g … starcap_truffle 420 g, essence_divine 220 g, fungus_god 240 g). Der
2026-07-Fix der invertierten `dim_essence→copper_staff`-Verkaufsschleife ist bestätigt (staff value 30,
nicht mehr 120) — **nicht** neu gemeldet.

---

## 6) Zulieferung Herblore/Runecrafting + Farming — sinnig verdrahtet (Stärke)

**Fast jeder** Foraging-Output ist ein echter Rezept-Input (grep `itemId:"<x>", qty`): herb_* (7),
essence_* (dim_essence in **17** Rezepten!), pigment_* (4), fungus_* (5), rimecap/gloomspore/voidbloom/
grave_lily/emberleaf/frostvine/deathmoss/ashen_dust/gravensap/starcap_truffle — **alle haben einen Sink**
(Herblore-Tränke / Runecrafting-Runen+Stäbe / Scribing). Zusätzlich fallen **Farming-Saaten** als
Byproduct (wraithcap_seed, emberroot_seed, godbloom_seed …) → speist Farming. Über den vollen Lauf
gemessen: herb_* 21.405, essence_* 16.918, pigment_* 15.304, fungus_* 16.500 Stück — **fette Bulk-
Zulieferung.** Einziger Output ohne Verarbeitungs-Sink: **`birds_nest`** (Vendor-Gut, value 14) — aber
**shared** mit Woodcutting (16 Tiers, Haupt-Quelle) und sellbar, daher kein Foraging-eigenes Loch.

> Nebenbefund (kein Bug): auf dem **XP-optimalen** Region-Track werden die **Tier-1-Reagenzien**
> (graywort, dim_essence, essence_ash) faktisch **nicht** produziert (0 im Lauf), weil ihre Aktionen nie
> „beste" sind. Wer sie braucht, wählt gezielt `forage_ashfields`/`forage_dim_essence` (die es sauber
> liefern: 779 graywort/h bzw. 836 dim_essence/h gemessen). Spezialisierung, kein Defekt.

---

## 7) Mastery — spürbar & lohnend (mit einem toten Ast)

Mastery ist auf `action.id` gekeyt und läuft pro Abschluss. Endstand nach L1→99: die Haupt-Grind-Aktion
`forage_gravewood` erreicht **MasteryL87** ⇒ **≈43 % Doppelertrag** (`0,005·86`) + **≈13 % Tempo**; auch
gloomfen L71, voidheath L80, nightbloom L57. Der **Mastery-Pool** (Cap ≈ 33·xpForLevel(20) ≈ 147 k
aggregierte Mastery-XP) ist bei 13 M Skill-XP **früh voll (100 %)** → alle Checkpoints früh aktiv:
+8 % Doppelertrag, +8 % Tempo skillweit. Mastery ist damit ein **echter, gefühlter** Ertragshebel.

**Toter Ast (Finding F1):** die **Preserve-Achse ist für Foraging komplett inert.** In `tick.ts`
`completeAction` liegt die gesamte Preserve-Logik in `if (action.inputs)` (Z. 86–98) — Foraging-Aktionen
haben **keine** `inputs` (reines Sammeln). Damit tun (a) die **per-Aktion-Mastery-Preserve** (bis 40 %)
UND (b) der **50 %-Pool-Checkpoint** (`{preserve:0.05}`) **nichts**. Der Spieler „verdient" bei 50 %
Pool eine Belohnung, die für diesen (und jeden reinen Sammel-)Skill wirkungslos ist. Genau das „definiert,
aber nie angewandt"-Muster — betrifft systemisch alle 4 reinen Gather-Skills (WC/Mining/Fishing/Foraging).

---

## 8) Reiner Skiller ohne Kampf — voll spielbar (confirmed)

Der komplette L1→99-Lauf war ein **reiner Skiller**: Start 0 Gold, keine Kämpfe, Mats verkauft → alle 5
Sicheln gekauft, **L99 erreicht**. Alle Foraging-Aktionen sind Input-los (kein Craft-Gate), alle Sicheln
im Shop, alle Level-Reqs durch Foraging selbst gedeckt. Die `forage_dim_essence`-Frühquelle (L1) hält
zudem den Runecrafting-Start combat-frei. **Kein einziges Combat-Gate.**

---

## Findings (schwerste zuerst — alle P3, keine P0/P1/P2)

- **[P3][balance/feel] Mastery-Preserve-Achse für Sammel-Skills tot** — *confirmed.*
  `tick.ts` `completeAction` Z. 86–98: Preserve nur bei `action.inputs`. Foraging (und WC/Mining/Fishing)
  haben keine `inputs` ⇒ per-Aktion-Mastery-Preserve (≤40 %) **und** der 50 %-Pool-Checkpoint
  (`shared/src/index.ts:2651` `{double:0,speed:0,preserve:0.05}`) sind wirkungslos. Der 50 %-Meilenstein
  ist für Gather-Skills eine Leerbelohnung. Soll-Vorschlag: für Gather-Skills den 50 %-Checkpoint auf
  einen wirksamen Bonus mappen (z.B. `{double:0.03}` oder `{speed:0.03}`), **oder** dokumentieren, dass
  Preserve gather-neutral ist. **Owner: logic-dev / balance.**

- **[P3][balance] Sichel-Leiter endet bei L65 (void)** — *confirmed.*
  `content/src/index.ts:869–873`: letzte Sichel void_sickle req L65 / 0,58×. L65–99 (34 Level) ohne neues
  Werkzeug. Parität mit Fishing (identische Rutenleiter), aber beide ohne Endgame-Tier. Soll-Vorschlag:
  ein L80-Tier (~0,50×, ~9.000 g) für Foraging **und** Fishing (Konsistenz wahren). **Owner: content-dev.**

- **[P3][feel/balance] sporewretch-Erwartung ~0,96/Grind (P≈62 %)** — *confirmed, niedrige Priorität.*
  `content/src/index.ts:13431` `dropChance 1/120.000`; ~115 k Aktionen/Grind. Gesund (viel besser als
  Witherling 1,5 %), aber ~38 % der Spieler erreichen 99 **ohne** Pet. Optional auf **1/100.000** heben →
  P≈68 %. **Owner: content-dev / balance.** (Nur falls ein weicheres Pet-Ziel gewünscht ist.)

## Verbesserungen (mit Zahlen)

1. **50 %-Pool-Checkpoint gather-wirksam machen:** für reine Sammel-Skills `preserve:0.05` → `double:0.03`
   (oder `speed:0.03`). Macht die halbe-Pool-Belohnung für 4 Skills sichtbar statt tot — 1-Zeilen-Change
   in der Checkpoint-Map bzw. eine gather-Verzweigung.
2. **L80-Sichel + L80-Rute** (`abyssal_sickle`/`abyssal_rod`, 0,50×, ~9.000 g, req L80): schließt das
   34-Level-Werkzeugloch am Skill-Ende, konsistent für beide Skills, +16 % xph vs. void.
3. **sporewretch optional 1/100.000** (P(1→99) 62 %→68 %) — nur falls der Pet als „über den normalen
   Grind erreichbar" gedacht ist; sonst so lassen (Rate ist bereits gesund).

---

### Zusammenfassung
Foraging ist ein **rundum polierter, aktiver Sammel-Skill**: XP/h streng monoton, keine toten/regressiven
Tiers, **dichter** Freischalt-Takt (33 Aktionen), echte 5-stufige Sichel-Leiter, **spürbare** Mastery
(Endgame ~43 % Doppelertrag), ein **realistisch erreichbares** Pet, **starke** Herblore/Runecrafting/
Farming-Zulieferung, kräftige exploit-freie Ökonomie und **voll combat-frei** spielbar. Alle Sweep-3-
Fixes im Zuständigkeitsbereich bestätigt (dim_essence-Frühquelle L1, dim_essence-Gold-Loop tot). Abzüge
nur für die **systemisch tote Preserve-Mastery** und das **bei L65 endende Werkzeug** — beide klein und
teils Parität mit Fishing. **NOTE: A−. Empfehlung: ship** (die Preserve-Checkpoint-Politur ist ein
optionaler, skillübergreifender 1-Zeilen-Feinschliff, kein Blocker).
