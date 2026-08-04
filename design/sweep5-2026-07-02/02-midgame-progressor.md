# Sweep 5 — 02: Ehrlicher Midgame-Progressor (Toolkit v2, `RealisticPlayer.pursue`)

Datum: 2026-07-02 · Tester: Kontrolleur · Modus: **honest** (kein `give`, kein `setSkillLevel`) · Budget: **120 Sim-h Spielzeit** je Seed · Alle Zeitangaben = **SPIELZEIT**.

**Setup:** 2 Seeds — Ragnar (Seed 11, melee) + Robin (Seed 22, ranged). Ziele pro Lauf:
`combatLevel(45)`, `skillLevel(fletching, 40)`, `obtainItem(steel_platebody, 1)`, `gold(50000)`, `killMonster(goblin_warlock, 40)` (Warband-Key-Dropper, 5% `warband_key`) — plus Meilenstein-Duplikate `combatLevel(30)`, `fletching(20)`, `gold(10000)` (nur für Zeitstempel; erzeugen identische Task-Arten, verzerren den Scheduler nicht). Temp-Skript nach dem Lauf gelöscht, kein Spiel-Code geändert. Wallclock: 20 s bzw. 58 s für je 120 Sim-h — Toolkit-Performance ist exzellent, Läufe deterministisch.

---

## 1. Multi-Goal-Ergebnisse

### Ragnar (Seed 11, melee) — 3/8 Ziele, 15 Frictions

| Ziel | Status | Stand @120h | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 30 | erreicht | CL 30 | **76 h 31 min** |
| Kampf-Niveau 45 | offen (71 %) | CL 32 | — |
| fletching 20 | offen (0 %) | Lv 1 | — |
| fletching 40 | offen (0 %) | Lv 1 | — |
| 1× steel_platebody | offen (0 %) | 0/1 | — |
| 10 000 Gold | erreicht | — | **2 h 49 min** |
| 50 000 Gold | erreicht | — | **17 h 42 min** |
| 40× goblin_warlock | offen (8 %) | 3/40, Monster geblacklistet | — |

Endstand: CL 32 · Gesamtlevel 145 · **Gold 780 979** · **67 457 Kills** · **30 Tode** · Skills > 1: attack 38, power 29, vitality 60 (sonst NICHTS) · Gear: bronze_sword, wooden_shield, cowhide_cap, apprentice_robe_body, muckboots · 5× warband_key im Besitz (ungenutzt).

### Robin (Seed 22, ranged) — 2/8 Ziele, 2 215 Frictions

| Ziel | Status | Stand @120h | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 30 | **blockiert (Wall)** | CL 13 | aufgegeben @ ~13 h 38 min |
| Kampf-Niveau 45 | **blockiert (Wall)** | CL 13 | aufgegeben @ ~20 h 18 min |
| fletching 20 | erreicht | — | **38 h 30 min** |
| fletching 40 | erreicht | — | **84 h 23 min** |
| 1× steel_platebody | **blockiert** („kein gangbarer Weg") | 0/1 | @ Lauf-Beginn |
| 10 000 Gold | **blockiert (Wall)** | 496 Gold | aufgegeben @ ~25 h 34 min |
| 50 000 Gold | **blockiert (Wall)** | 496 Gold | aufgegeben @ ~29 h 23 min |
| 40× goblin_warlock | **blockiert (Wall)** | 0/40 | — |

Endstand: CL 13 · Gesamtlevel 199 · Gold 496 · **230 Kills** · 3 Tode · woodcutting 46, fletching 40, foraging 34, fishing 24, ranged 18 · Gear: copper_shortbow, **Köcher: iron_arrow mit Bestand 0** — daneben **2 608 crude_arrows im Inventar, nie ausgerüstet**.

### Meilenstein-Timing (Spielzeit)

| Meilenstein | Melee (Seed 11) | Ranged (Seed 22) |
| --- | --- | --- |
| Erstes Gear-Set komplett (Shop) | ~3 h 36 min (bronze_sword @ 1 h 55 min) | ~4 h 26 min (copper_shortbow) |
| Gold 10 000 | 2 h 49 min | nie (Maximum 496) |
| Gold 50 000 | 17 h 42 min | nie |
| CL 30 | 76 h 31 min | nie (CL 13 @ 120 h) |
| CL 45 | nie (CL 32 @ 120 h) | nie |
| Steel-Gear (irgendein Teil) | **nie** | **nie** |
| fletching 20 / 40 | nie (Lv 1!) | 38 h 30 min / 84 h 23 min |
| Dungeon-Key (warband_key) | 5 Stück gesammelt | 0 |
| Dungeon-Clear (Goblin Warband) | **nicht treibbar** (kein Sim-Verb, s. Finding T7) | — |

---

## 2. Was in den Läufen wirklich passierte

**Seed 11 (melee):** Erste 2 h vorbildlich — Hühner, Shop-Upgrades (leather_helm @4 min, bronze_sword @115 min, Schild/Boots @216 min), Gold 10k nach <3 h. Danach **kein einziges Gear-Upgrade mehr in 118 h**, trotz 780k Gold. Ab ~5 h beginnt die Todes-Kaskade: an JEDEM Aufstiegs-Gegner von Lv10 bis Lv30 stirbt er genau 2× (meist in langen Idle-Strecken, wenn die 40 Trout aufgegessen sind) und **blacklistet ihn permanent** — 15 Monster, 30 Tode, u. a. boar (Lv10) bei CL 21. Der Zielpool kollabiert auf plague_grub (Lv7) und rot_rat (Lv3): **50 682 Grub-Kills**, davon die letzten ~44 h bei CL 30-32 mit praktisch 0 Kampf-XP (Über-Level-Dämpfung) — ein toter Grind, den kein Mensch spielen würde. Fletching-, Steel- und Warlock-Ziel bekamen **in 120 h kein einziges Fokus-Fenster** (0× „Ziel-Skilling fletching" im Log).

**Seed 22 (ranged):** Tod #1 nach **9 Sim-Minuten** (Frischling vs. plague_grub Lv7). Ab Min 120 die Munitions-Todesspirale: Er kauft 3, 4, 16 iron_arrows (mehr gibt das Gold nicht her — Greedy-Kauf der TEUERSTEN Sorte statt 200 billiger crude_arrows), schießt sie leer, und weil der Köcher-Slot auf `iron_arrow` steht, rüstet er die **2 608 selbst gefletchten crude_arrows nie aus**. 2 098× Friction „Kampf stoppte: Munition leer" (quiver 0, reserve 0). Ohne Kills kein Gold, ohne Gold keine Pfeile → alle Kampf- und Gold-Ziele werden nacheinander als „Wall" aufgegeben (CL30 @ 818 min, Gold10k @ 1 534 min …). Übrig bleibt das Fletching-Ziel, das er sauber über die Material-Kette (cut_normal_tree → fletch_shafts → fletch_crude_arrows) bis Lv 40 zieht — der einzige Teil des Laufs, der wie ein Mensch aussieht.

---

## 3. Antworten auf die Prüffragen (Realitäts-Qualität Toolkit v2)

- **Rüstet er sinnvoll auf?** Nur in Stunde 0-4 (Shop-Käufe, saubere Score-Sprünge im Log). Danach Stillstand: Kein proaktives Skilling für Craft-Gear (smithing blieb in BEIDEN Läufen Lv 1), keine Drop-Upgrades (gibt es unter Monster-Lv45 für melee auch nicht, s. G1). 120 h Melee-Midgame in Bronze + Magier-Robe ist kein menschliches Bild.
- **Verhungert er an Food/Ammo?** Food: nein — kochen/kaufen/Zutaten-Kette griff zuverlässig (nur 1 Sackgassen-Friction: cook_ashroot_broth, Zutat nur via Farming beschaffbar, das der Sim nicht kann). Ammo: **ja, katastrophal** — trotz 2 608 nutzbarer Pfeile im Inventar (T1).
- **Reagiert er auf den Tod vernünftig?** Halb. Kein Suizid-Loop am selben Gegner (Vorsicht + Blacklist nach 2 Toden greifen), ABER die „Vorbereitung" besteht nie aus besserem Gear/mehr Food, sondern nur aus Ausweichen nach unten — und die Blacklist ist **permanent**, also wird aus „zu früh" für immer „nie wieder" (T2). Zusätzlich provoziert die Idle-Vorbereitung Tode: Er startet einen grenzwertigen Kampf und geht dann 3 h AFK mit max. 40 Food (T5).
- **Wo bleibt er in Sackgassen hängen (Friction ×N)?** Seed 22: „Munition leer" ×2098 + „Volle 2 Min gegen boar ohne Kill" ×61 — er kämpft auch nach dem Wall-Aufgeben in freien Fenstern weiter ohne Munition (Friction-Flut statt Verhaltensänderung). Seed 11: „Inventar entlastet" ×215 (Inventar dauerhaft 20/20, weil Instanz-/nicht-anlegbares Gear weder gebankt noch verkauft wird).

---

## 4. Findings

### [toolkit] — Owner: logic-dev (alle in `packages/engine/src/sim-realistic.ts` / `sim-player.ts`)

- **T1 (P1) Ammo-Lock auf den ausgerüsteten Pfeil-Typ.** `manageAmmo` (sim-realistic.ts:1127-1174) füllt nur `equipment.ammo ?? weapon.ammoType` nach; `tryEquipUpgrade` vergleicht Item-Scores ohne Bestand — der LEERE iron_arrow-Köcher (Score > crude) blockiert das Anlegen von 2 608 vorhandenen crude_arrows für immer. Dazu Greedy-Kauf: `bestBuyableAmmo` wählt die beste Sorte statt der bezahlbaren Menge (16 iron statt ~200 crude). Folge: Der komplette Ranged-Lauf degeneriert; **jeder künftige Ranged-Sweep ist damit unbrauchbar.** Fix: besten VERFÜGBAREN Pfeil (Bestand > 0) ausrüsten, Kaufmenge vor Tier priorisieren.
- **T2 (P1) Permanente Monster-Blacklist ⇒ Zielpool-Kollaps + XP-loser Ewig-Grind.** `handleDefeat` (Z. 857-878) blacklistet nach 2 Toden für immer, kein Re-Check bei CL-/Gear-Aufstieg. Seed 11 blacklistet Lv10-30 komplett und farmt dann 44 h lang Lv7-Grubs bei CL 32 — die Über-Level-Dämpfung (combat.ts, `offenseXpMult`) macht das zu ~0 XP, was der Sim nicht bemerkt. Fix: Blacklist mit Ablauf/Neubewertung (z. B. wieder versuchen bei +5 CL oder Gear-Score-Sprung) UND Zielwahl, die 0-XP-Farmen erkennt.
- **T3 (P2) Fokus-Starvation in `pickFocusGoal`** (Z. 420-436): Score = 0.2 + 0.6·Fortschritt + 0.3 Flow-Bonus (Kampf) + 0.25 Varianz. Ein Kampf-Ziel bei 70 % (≈1.0+) ist für ein 0 %-Skilling-Ziel (max. 0.45) **unerreichbar** — fletching/steel/warlock bekamen in Seed 11 in 120 h null Fokus-Fenster. Nebenwirkung: Nie fokussierte Ziele durchlaufen auch nie die Blockade-Erkennung → der Bericht zeigt „0 %" ohne jede Begründung. Fix: Anti-Starvation-Term (z. B. Fenster-seit-letztem-Fokus) o. Round-Robin-Anteil.
- **T4 (P2) `SimSnapshot.kills/deaths` sind fightFor-only-Zähler** (sim-player.ts:80-81, 319-320): `pursue`/`playFor` kämpfen über `startCombat`+`advanceTime`, daher meldet JEDER Multi-Goal-Snapshot **0 Kills / 0 Tode** — bei real 67 457 Kills und 30 Toden. Verfälscht jeden Sweep-Bericht, der den Snapshot zitiert. Fix: aus `state.stats.kills/deaths` lesen (RealisticRunResult.result() macht es bereits richtig vor).
- **T5 (P2) Idle-Vorbereitung ignoriert Risiko + Food-Reichweite.** `prepareForGoalIdle` startet den (grenzwertigen) Ziel-Kampf und idlet dann bis 3 h mit `FOOD_TARGET = 40` — die meisten der 30 Tode in Seed 11 fallen ans Ende von Idle-Strecken. Menschlich wäre: harte Gegner nur aktiv antesten, für lange Idles sichere Ziele + Food proportional zur Idle-Länge bunkern.
- **T6 (P2) `obtainItem` blockiert bei Level-Gate statt die Route zu trainieren.** `obtainItemTask` (Z. 518-547) kennt nur Shop/freigeschaltete Aktion/Drop; `forge_steel_platebody` (smithing 22) gilt mit smithing 1 als „kein gangbarer Weg" — dauerhaft, obwohl smithing trainierbar ist und Quest `q_blackthorn_1` das Teil sogar als Belohnung vergibt (content/src/index.ts:12335). Ein Steel-Ziel ist damit für den ehrlichen Sim strukturell unerreichbar → Midgame-Gear-Progression kann gar nicht getestet werden.
- **T7 (P3) Dungeons sind nicht treibbar.** SimPlayer hat kein Dungeon-Verb; Seed 11 saß am Ende auf 5 warband_keys (CL 32 ≥ Gate 20) und konnte den Clear nie versuchen. Für Midgame-Sweeps fehlt damit ein Kernsystem. Fix: `runDungeon(id)`-Verb + optionales `clearDungeon`-Goal.
- **T8 (P3) Friction-Flut statt Verhaltensänderung:** 2 098 identische „Munition leer"-Events, weiterkämpfen ohne Pfeile auch nach Wall-Aufgabe; plus Inventar-Pin (215× „Inventar entlastet", weil Instanz-Items und „besser-aber-nicht-anlegbar"-Gear von `manageInventory` Z. 1056-1084 nie geräumt werden). Kosmetisch, aber es verrauscht die Berichte.

### [game] — echte Spiel-Signale (durch das Toolkit-Rauschen hindurch)

- **G1 (P2, content-dev + balance-designer) Ehrliche Melee-Waffenleiter hat ein Loch:** Shop endet bei bronze_sword; iron/steel NUR via smithing 10/20; erster Waffen-DROP für melee erst bei Lv45-/Lv65-Monstern (index.ts:9813, 10119). Ein ehrlicher Nicht-Schmied kämpft das komplette Borderlands-Band (Lv10-30) in Bronze — die 30 Sim-Tode bei CL 21-30 gegen Lv10-18-Gegner sind auch für echte Spieler plausibel, wenn sie smithing links liegen lassen. Ranged/Magic haben es besser (Shop-Bögen/Stäbe + Warlock-Drops). Empfehlung: 1-2 frühe Melee-Waffen-Drops (z. B. iron_sword low-chance auf goblin_spearman/butcher) ODER iron-Tier in den Shop.
- **G2 (P2, balance-designer) Gold-Hahn ohne Abfluss:** 10k nach 2 h 49, 50k nach 17 h 42, **781k nach 120 h** — und ab Stunde 4 gibt es für einen Melee NICHTS mehr zu kaufen. Der Gold-Meilenstein ist als Ziel trivial, die Ökonomie im Midgame reine Anzeige. (Deckt sich mit dem geplanten Enchant-/Runen-System als Sink — bis dahin bleibt Gold bedeutungslos.)
- **G3 (P3, balance-designer) Früh-Ranged ist messerscharf:** Tod nach 9 Sim-Minuten an plague_grub (Lv7) mit Starter-Kit; iron_arrows im Shop sind früh unbezahlbar (3-16 Stück pro Einkauf). Der Ausweg (crude_arrows selbst fletchen/kaufen) EXISTIERT — das Spiel ist hier okay, aber die Kante ist schmal; ein neuer Spieler, der 2 h auf einer Kuh idlet, stirbt wie der Sim.
- **G4 (P3, balance-designer) Fletching-Pacing ehrlich gemessen:** Lv1→20 in 38 h 30, Lv20→40 in weiteren ~46 h Spielzeit (gemischt aktiv/idle), weil ohne smithing/Hides nur shafts (1 XP) + crude arrows (2 XP) offenstehen. Für ein Midgame-Ziel sehr zäh; die besseren Rezepte hängen alle an Zweit-Skills.

---

## 5. Fühlt sich die Midgame-Progression als EHRLICHER Spieler rund an?

**Nein — aber das Urteil ist nur zur Hälfte ein Spiel-Urteil.** Die ersten ~4 h fühlen sich richtig gut an (klare Shop-Upgrades, Gold fließt, CL steigt zügig). Danach zeigt der ehrliche Pfad zwei echte Spiel-Kanten: die smithing-gegatete Melee-Waffenleiter (G1) und die funktionslose Gold-Schwemme (G2). Alles andere — Bronze-Gear bei CL 32, 50k Grub-Kills, der Ranged-Total-Kollaps, das unerreichbare Steel-Ziel, der nie versuchte Dungeon — sind **Toolkit-Artefakte (T1-T7), nicht Spielzustand**. Das Toolkit v2 ist schnell, deterministisch und im Skilling-/Food-/Quest-Teil schon glaubwürdig; im Kampf-/Gear-/Ammo-Teil agiert es noch so unmenschlich, dass Midgame-Kampf-Pacing (CL45-Timing, Steel-Timing, Dungeon-Loop) derzeit **nicht belastbar messbar** ist. Erst T1-T3 fixen (logic-dev), dann diesen Sweep wiederholen — die Ziel-Liste hier ist als Regressions-Benchmark wiederverwendbar (Seeds 11/22, Budget 120 h).

*Rohdaten (Multi-Goal-Tabellen, Friction-Logs, Entscheidungs-Logs) lagen im Session-Scratchpad; Kernzahlen sind vollständig in diesem Bericht. Temp-Skript `packages/engine/src/zz-sweep5-midgame.tmp.test.ts` wurde nach dem Lauf gelöscht.*
