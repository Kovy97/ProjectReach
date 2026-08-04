# QA Run 6 — Gathering: Mining · Woodcutting · Fishing

> Playtester-Persona: Gathering-Sammler (Mining + Woodcutting + Fishing). Fokus run6: Sind die in run5 benannten
> **zwei 9,5-Hebel** umgesetzt? — (1) **XP-Dips an Tiefstufen-Lückenfüllern geglättet** und (2) **Zwischenerz ~L62**,
> das die **Mining-Erzpause L55→L70** füllt. Plus: bleiben sonstige Pausen (Fishing/Woodcutting/Gem) und Senken sauber?
> Methode: READ-ONLY Daten-Audit von `packages/content/src/index.ts` (actions/recipes) + `packages/engine/src/leveling.ts`
> (XP-Kurve). Temporäres Sim-Harness für xp/h, Leiterlücken, Dip-Erkennung & Grind-Zeiten (`scratchpad/sim6.mjs`, nach Lauf entfernt).
> Vergleich: `run5-gather-mine-wood-fish.md` (war 9,0). Stand 2026-06-28.

## Fun-Score: **9,3 / 10**   (Δ vs run5: **+0,3**, war 9,0)

Beide 9,5-Hebel wurden **angefasst** — aber nur **einer voll** geliefert:

- ✅ **Hebel 2 (Zwischenerz L62) komplett gelandet.** `mine_murkvein`@L62 (xp 33 / 7000 ms) sitzt sauber zwischen
  runite L55 und bloodiron L70. Die in run3–run5 als „längste Single-Ladder-Lücke" gebrandmarkte 15-Level-Erzpause
  ist **weg** (jetzt 7 + 8 Level). xp/h steigt monoton: runite 14.954 → murkvein 16.971 → bloodiron 31.886. Kein Dip.
- 🟡 **Hebel 1 (Dip-Glättung) nur teilweise.** Mining-Erz ist jetzt **dip-frei** (coal gefixt: 3.429 > iron 3.000).
  Fishing-`murk_perch` ist gefixt (3.086 > shrimp 2.400) — **aber der Dip ist nur verschoben**, nicht beseitigt
  (jetzt trout). Und die **zwei namentlich in run5-P3-A genannten Woodcutting-Beispiele (birchwood, willowbark)
  dippen weiterhin**, weil der XP-Bump zu klein war, um die längere Aktionsdauer zu schlagen.

Das hebt den Score über 9, hält ihn aber unter 9,5: Der Sammler trifft **genau an den in run5 zitierten Stellen**
weiterhin die bewusste Anti-Entscheidung „neues Tier ignorieren". **Kein P0.** Ein neuer **P2** (halb verdrahtete
murkvein-Senke). Rest P3.

---

## Verifikation der zwei 9,5-Hebel (frisch simuliert)

### Hebel 2 — Zwischenerz L62 → **ERLEDIGT**
| | Run5 | Run6 |
|---|---|---|
| Erz-Tiers | 12 | **13** (`mine_murkvein`@L62 neu) |
| Längste **Erz**-Lücke | **15** (runite L55→bloodiron L70) | **13** (gravesteel L22→mithril L35) |
| L55→L70-Abschnitt | 1 Pause à 15 Lvl | runite→**murkvein (7)**→bloodiron (8) |

Die konkret beklagte Pause ist gefüllt. **Nebenbefund:** Damit ist die *neue* längste Erzlücke
**gravesteel L22 → mithril L35 (13 Level)** — die Pause ist nicht eliminiert, sondern an den früheren Spielverlauf
**gewandert** (siehe P3-B unten).

### Hebel 1 — Dip-Glättung → **TEILWEISE** (Code-Kommentar zeigt die Absicht: `target_xph(L)=90·√Δxp; xp=round(xph·ms/3.6e6), min 1`)
| Skill | Run5-Dip | Run6-Status |
|---|---|---|
| Mining: iron→coal | coal 2.571 < iron 3.000 | **gefixt** (coal xp 4 → 3.429 > 3.000) |
| Fishing: shrimp→murk_perch | murk_perch 2.057 < shrimp 2.400 | **gefixt** (murk_perch xp 3 → 3.086) … **aber Dip verschoben → trout** (s. P2/P3-A) |
| Woodcutting: ashbark→grimwood | grimwood 3.032 < ashbark 3.200 | **gefixt** (grimwood xp 5 → 3.789) |
| Woodcutting: normal→birchwood | birchwood 1.125 < normal 2.571 | **NUR GEMILDERT** — birchwood xp 1→2 ⇒ 2.250, **immer noch < 2.571** |
| Woodcutting: oak→willowbark | willowbark 1.778 < oak 3.000 | **NUR GEMILDERT** — willowbark xp →3 ⇒ 2.667, **immer noch < 3.000** |

Mathematisch hätten die beiden offenen Holz-Dips xp **3** (birchwood ⇒ 3.375) bzw. xp **4** (willowbark ⇒ 3.556)
gebraucht, um den jeweiligen Vorgänger zu überholen. Der Bump blieb eine Stufe zu niedrig.

---

## Senken-/Regressions-Check (frisch verifiziert)

| Prüfpunkt | Run6-Befund | Status |
|---|---|---|
| murkvein_ore → Senke | `smelt_murkvein` (2 ore + 3 coal → murkvein_bar)@L62 vorhanden | Erz-Senke OK |
| **murkvein_bar → Gear** | **kein einziges Rezept konsumiert murkvein_bar** (nur Item-Def + smelt-Output) | **HALB-SACKGASSE → P2** |
| Fisch→Cooking | 17 Rohfische, alle mit `cook_*` | intakt |
| Gem→Jewelcrafting | 8 `cut_*` = 1:1 zu 8 Adern | intakt |
| Erz→Smithing | smelt-Kette für alle Erze inkl. murkvein | intakt (außer bar-Sink oben) |
| Tote Hölzer (willowbark/grimwood/ashfen/voidwood) | `fletch_*`-Schildsenken | intakt (run4-Fix hält) |
| XP-Kurve | `leveling.ts` unverändert; Total-XP 1→99 = **13.034.431** | identisch run5 |
| Grind 1→99 | Wood **268,7 h** · Fishing **224,1 h** · Mining Erz+Gem **210,1 h** (nur Erz 224,9 h) | ~run5 (murkvein ändert Grind nicht, da „beste Aktion") |

**Keine tote Leiterstufe im Gather-Scope** (jede Mine/Wood/Fish-Aktion hat eine Abnahme). Die **einzige neue
Senken-Lücke** ist der murkvein_**bar** (Smithing-Seite, nicht Gathering) — für den reinen Sammler unkritisch, aber
ein echter Verdrahtungsfehler beim Einbau des neuen Erzes.

---

## Findings — gereiht nach Hebelwirkung Richtung 9,5

### [P2-A] `murkvein_bar` ist eine Sackgasse — neue Senke nicht zu Ende verdrahtet
Das neue Zwischenerz wird korrekt zu `murkvein_bar` verschmolzen, **aber kein Forge-Rezept verbraucht den Barren**
(Code-Suche: murkvein_bar erscheint nur als Item-Def @659 und als smelt-Output @5291). Smithing-Spieler, die das
neue Erz hochziehen, produzieren einen Barren ohne jede Gear-Verwendung. Für den Gathering-Loop nicht kritisch (das
**Erz** hat mit smelt eine Senke), aber es ist ein **frisch eingeführter** halb-toter Pfad — genau die „defined but
never applied"-Klasse, die ein Audit fangen soll.
**Fix (klein):** entweder murkvein als reines Smelt-Flux/Legierungs-Material deklarieren **oder** 1–2 runite-Tier-Gear
auf murkvein_bar umstellen/ergänzen. (Smithing-Modul, nicht Gathering-Daten.)

### [P3-A] Woodcutting-Tiefstufen-Dips bleiben — der run5-Hauptdämpfer ist nur halb entschärft
`birchwood`(L5, 2.250) < `normal`(2.571) und `willowbark`(L15, 2.667) < `oak`(3.000). Beides exakt die in run5-P3-A
zitierten Beispiele. Der XP-Bump (1→2 bzw. →3) griff zu kurz. **Zusätzlich neu:** Durch den murk_perch-Buff dippt
jetzt **`trout`(L10, 2.700) < `murk_perch`(L5, 3.086)** in Fishing — der Dip wurde nur **eine Stufe nach oben
geschoben**. Folge unverändert: Der xp-optimierende Sammler überspringt das gerade freigeschaltete Tier.
**Fix (klein, hohe Wirkung):** birchwood xp→3, willowbark xp→4, trout xp→4 (Achtung: bei trout dann cod L15 prüfen —
Floor-Rounding macht low-tier-Monotonie zäh) **oder** die run5-Alternative ziehen: diese Tiers im UI als
**„Material-Tier"** labeln, dann stimmt die Erwartung ohne XP-Frickelei. Das ist der **letzte echte 0,2-Hebel**.

### [P3-B] Mining: längste Erzpause ist jetzt gravesteel L22 → mithril L35 (13 Level)
Mit murkvein ist die alte L55→L70-Pause gefüllt — die längste Single-Erzpause **wanderte** an den früheren Verlauf
(13 Level zwischen gravesteel@L22 und mithril@L35). In der **kombinierten** Mining-Leiter durch bloodstone@L25 +
garnet@L15 überbrückt, daher kein echter Leerlauf; nur wer **reines Erz** schürft, hat 13 Level „nichts Neues".
Kleiner als die alte 15er-Pause, also Fortschritt — aber der „nächste Kandidat" für ein analoges Zwischenerz @~L28.

### [P3-C] Fishing: 10-Level-Pause L35→L45 (salmon → duskfin_carp) — UNVERÄNDERT
Größte Fishing-Lücke; xp/h steigt sauber drüber, aber spürbar in der sonst dichten Leiter. **Fix (optional):** L40-Fisch.

### [P3-D] Woodcutting: 10-Level-Gap L45→L55 (ironbark → bloodoak) — UNVERÄNDERT
Größte Holzlücke, durch keine andere Wood-Aktion überbrückt. **Fix (optional):** L50-Holz.

### [P3-E] Gem-Adern: 20-Level-Lücke L35→L55 (sapphire → ruby) — UNVERÄNDERT
In der kombinierten Mining-Leiter durch adamantite@L45 + murkvein@L62 überbrückt; nur relevant, falls Gem als eigener
Pfad gespielt wird. Randnotiz: In der **kombinierten** Sicht entstehen winzige Interleave-Dips (garnet 3.200 < coal
3.429; onyx 85.909 < aetherite 86.824; godgem 108.000 < godiron 180.000) — kosmetisch, da Erz/Gem getrennte Pfade.

---

## Δ vs run5
- **Inhaltlich:** +1 Gather-Node (`mine_murkvein`@L62) + Erz-/Holz-/Fisch-Lückenfüller-XP **angehoben** (coal/grimwood/murk_perch gefixt; birchwood/willowbark gemildert).
- **Hebel 2 (L55→70-Erzpause):** **ERLEDIGT** — Pause gefüllt, Dip-frei.
- **Hebel 1 (Dip-Glättung):** **teilweise** — 3 von 5 Dips weg, 2 Holz-Dips bleiben, 1 neuer Fishing-Dip (trout) als Seiteneffekt.
- **Neu:** **P2** murkvein_bar ohne Gear-Senke (frisch eingeführter halb-toter Pfad).
- **Senken sonst:** weiterhin 100 % verdrahtet (cook/fletch/cut/smelt), keine Regression.
- **XP-Kurve & Grind-Zeiten:** unverändert (Total-XP identisch; Grind ~Wood 269 h / Fish 224 h / Mining 210 h).
- **Fun-Score 9,0 → 9,3.**

## Was fehlt für 9,5? (konkret)
Genau **zwei** kleine Eingriffe — beide reines Tuning:
1. **Die 2 Holz-Dips zu Ende glätten** (P3-A): birchwood xp→3, willowbark xp→4 (+ trout xp→4, cod gegenprüfen)
   **oder** Tiefstufen-Lückenfüller im UI als „Material-Tier" labeln. Das ist der **letzte spürbare 9,5-Blocker**,
   weil der Sammler hier weiter bewusst das neue Tier überspringt — exakt die run5-Beschwerde.
2. **murkvein_bar verdrahten** (P2-A): dem neuen Barren eine Gear-/Flux-Senke geben, damit der frisch eingebaute
   Erzpfad nicht halb tot endet.

Optional Richtung 10/10: je ein Zwischen-Tier für die drei verbliebenen 10–13-Level-Pausen (Erz L22→35, Fish L35→45,
Wood L45→55).

## Verdict
Run6 liefert den **größeren** der beiden run5-Hebel sauber (murkvein füllt die L55→70-Erzpause, dip-frei) und glättet
3 von 5 XP-Dips — daher **9,0 → 9,3**. Unter 9,5 bleibt es aus zwei klaren, risikoarmen Gründen: die **zwei
namentlich beklagten Holz-Dips** (birchwood/willowbark) dippen weiter (XP-Bump eine Stufe zu niedrig, Dip in Fishing
nur verschoben), und der **neue murkvein_bar** hat keine Gear-Senke. Beides ist reines Finish-Tuning ohne neues System.
