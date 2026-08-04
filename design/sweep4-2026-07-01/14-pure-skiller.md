# Sweep 4 — 14: Reiner Skiller ohne Kampf

**Blickwinkel:** Bewusst OHNE Kämpfen spielen (via `SimPlayer`). Kommt man voran? Gibt es harte
Combat-Gates (Mats/Gold/Freischaltungen/Quests)? Befriedigend als Idle-Skiller? **Note A–F.**

**Methode:** headless, deterministisch. Statische Erreichbarkeits-Analyse (Fixpunkt „was kann ein
Spieler OHNE jede Kampf-Aktion je besitzen?" = Shop ∪ Sammel-Loot ∪ Crops ∪ Verarbeitungsketten mit
erreichbaren Inputs) + echte `SimPlayer`-Läufe (0 Kills, 0 Tode). Analyse-Skript in
`packages/engine/src/pure-skiller-analysis.test.ts` gefahren und danach **gelöscht** (Repo clean).

---

## TL;DR — Note: **B−**

Der Skiller-Kern ist **gut**: **12 der 13** Nicht-Kampf-Skills sind vollständig ohne einen einzigen
Kill auf 99 spielbar, mit selbsttragender Ökonomie (Thieving-Gold + Verkauf), passivem Farming ab L1
und einer sauberen Werkzeug-Leiter im Shop. Man kommt echt voran und es fühlt sich nach Idle-Skiller an.

Aber der „reine Skiller"-Anspruch bekommt **drei echte Kratzer**:
1. **Leatherworking ist für einen reinen Skiller unmöglich** — Dead-Start, **0 XP je erreichbar** (P1).
2. Die **„Skiller"-Questreihe** (q_skiller_2–5) und sogar eine **Mining-Quest** hängen hinter
   **Kampf-Quests** (P2) — thematisch verkehrt herum.
3. Große Teil-Bäume der Verarbeitung (Bögen, Elementar-Runen/Stäbe/Wands, Fleischgerichte) sind
   kampf-verriegelt: levelbar, aber **ohne Tier-/Gear-Belohnung** für den Skiller (P3).

---

## Was FUNKTIONIERT (kein Combat nötig) — Beleg aus `SimPlayer` (0 Kills, 0 Tode)

`SIMPROOF: 1h auf der niedrigsten erreichbaren Aktion je Skill, frischer Held, ZERO combat`:

| Skill | L1-Aktion | XP/h | nach 1h |
|---|---|---|---|
| woodcutting | cut_normal_tree | 2604 | Lv15 |
| mining | mine_copper | 2428 | Lv15 |
| fishing | catch_shrimp | 2428 | Lv15 |
| foraging | forage_ashfields | 2276 | Lv14 |
| thieving | pickpocket_beggar | 1448 | Lv11 |
| smithing | smelt_copper | 1858 | Lv13 |
| cooking | cook_shrimp | 913 | Lv8 |
| fletching | fletch_shafts | 913 | Lv8 |
| runecrafting | craft_force_rune | 920 | Lv8 |
| jewelcrafting | cut_garnet | 1858 | Lv13 |
| herblore | brew_minor_healing | 912 | Lv8 |

- **Farming (13.)** läuft passiv: 3 Plots bereits ab Farming L1 (`PLOT_UNLOCK[0]=[1,3]`), alle 30 Crop-
  Samen sind Shop-/Skiller-erreichbar → pflanzen → ernten → XP, ohne Aktion, ohne Kampf.
- **Progressions-Decke je Skill (erreichbare Aktionen):** woodcutting/thieving Top-Unlock L99;
  mining L95, fishing/foraging/cooking L97 (Top-Aktion wird 95/97→99 weitergegrindet, kein Cap →
  `setActiveAction` prüft nur `level ≥ required`); smithing/jewelcrafting/herblore L99. Alle 12 also
  bis 99 grindbar.
- **Ökonomie sinnvoll & exploit-arm:** Direkt-Gold aus Thieving + Verkauf von Sammelgut; die kurzen
  Sim-Läufe erwirtschafteten schon ~2.9k Gold. Echte Gold-Sinks vorhanden (Spitzhacken 110→4500,
  Angelruten 100→3800, Sicheln 100→3800, Samen). **Alle Werkzeuge sind Shop-kaufbar** (Pickaxe/Rod/
  Sickle je 5 Tiers, `combatDrop=false`) — keine Werkzeug-Freischaltung braucht Kampf.
- **Tools sind Komfort, nicht Pflicht:** Sammeln läuft auch ohne Werkzeug (cut_normal_tree @2604 xp/h
  ganz ohne Axt), also kein „kein-Tool = Wall".

---

## Findings (schwerste zuerst)

### [P1][balance/design] Leatherworking ist für einen reinen Skiller ein Dead-Start (0 XP je) — confirmed
- **Repro:** Frischer Held (Leatherworking L1), alle Skiller-erreichbaren Materialien ins Inventar,
  ALLE 105 Leatherworking-Aktionen der Reihe nach 10 Sim-Min gestartet.
- **Erwartet:** Wie jede andere Verarbeitung ab L1 anspielbar (erste XP).
- **Tatsächlich:** `leatherworking xp nach ALLEN Aktionen = 0 (Lv 1)`. Die **einzigen** L1–L13-Aktionen
  (`tan_leather`, `craft_leather_cap/body`, `craft_cured_*`, `craft_apprentice_*`) verlangen alle
  `raw_hide`/`cured_leather`, und **`raw_hide`/`scarred_hide` sind ausschließlich Monster-Loot**
  (content/index.ts: raw_hide nur in Monster-`loot`, z.B. Z. 9624/9646/9662/10306; kein Sammel-/Farm-/
  Forage-Node erzeugt Leder). Die **erste** kampf-freie Leatherworking-Aktion ist
  `craft_scaled_body` auf **L14** — die man ohne die ersten 13 Level nie erreicht → **harter Wall.**
- **Downstream für den Skiller unerreichbar:** Leatherworking 99, dessen Mastery, das
  **Leatherworking-Skill-Pet** (`source: {kind:"skill", skill:"leatherworking"}`, content Z. 13504)
  und jedes Achievement/Gesamtlevel, das Leder-XP voraussetzt.
- **Owner:** Content-Dev (neue kampf-freie Leder-Quelle) — Balance ist Chef-freigegeben.

### [P2][ux/feel] „Skiller"-Questreihe + eine Mining-Quest hängen hinter Kampf-Quests — confirmed
- **Belege (Prerequisite-Ketten):**
  - `q_skiller_2` (reach_total_level 50) `requires: ["q_skiller_1", "q_fighter_2"]` — und
    `q_fighter_2` = `kill_total 200`. → Ein reiner Skiller erreicht Gesamtlevel 50 mühelos, kann die
    **nach ihm benannte** Quest aber nie abschließen.
  - `q_skiller_3/4/5` erben die Sperre (Kette über q_skiller_2) und ziehen zusätzlich
    `q_slagpit_1` (kill pit_spider), `q_roc_fledgling` (kill roc) rein.
  - `q_miner_3` (reach_skill_level mining 50) `requires: ["q_miner_2", "q_slagpit_1"]` — eine reine
    **Mining**-Quest, verriegelt hinter einer Kampf-Quest.
  - Gesamt: 6 Nicht-Kampf-Quests durch eine Kampf-Vorbedingung in ihrer Kette blockiert.
- **Erwartet:** Ein Skiller kann die Skilling-Questlinie ohne Kämpfen durchspielen.
- **Owner:** Content-Dev (Quest-`requires` neu verdrahten).

### [P3][feel] Große Teil-Bäume der Verarbeitung sind kampf-verriegelt (levelbar, aber ohne Payoff)
- **Fletching:** Bögen & Fletch-Schilde brauchen `bowstring` ← `scarred_hide` (Combat). Skiller kann
  nur **Schäfte + Pfeile** (L1→95) machen → Fletching 99 ok, aber **kein einziger Bogen** baubar.
- **Runecrafting:** Alle Elementar-Runen/Glyphen + Steel..Godiron-Stäbe/-Wands brauchen
  `frost/ember/storm/void_essence` (Combat). Skiller hat force_rune, Copper/Bronze/Iron-Staff+Focus
  und die keen/precise/swift/hunter/arcane-Runen I–III (→ L75, dann grind auf 99) — aber **kein
  Elementar-Zweig**.
- **Leatherworking (zusätzlich zum Dead-Start):** selbst ab L14 sind Hardened/Dragonhide/Void/Frost/
  Arcane komplett hide-/essence-verriegelt.
- **Cooking:** alle Fleischgerichte (`raw_beef/venison/...` Combat); Skiller kocht nur **Fisch**
  (deckt 99 voll, aber halbe Speisekarte fehlt).
- **Wirkung:** Die Skills leveln, aber der Skiller sieht über weite Strecken **keine Tier-/Gear-
  Progression** — er craftet Pfeile/Basis-Runen/Fisch „ins Leere". Engagement-Delle.
- **Owner:** Content-Dev/Balance-Designer.

### [P3][feel/consistency] Woodcutting hat keine Shop-Werkzeugleiter — suspected (minor)
- Mining/Fishing/Foraging haben je 5 Tool-Tiers im Shop; **Äxte** tauchen in `type:"tool"` gar nicht
  auf (copper_axe/bronze_axe nur als Quest-Belohnung der teils kampf-gegateten Questreihe). Kein
  Skiller-Block (Sammeln geht ohne Axt), aber eine Progressions-Asymmetrie.
- **Owner:** Content-Dev.

---

## Top-3-Findings
1. **P1 — Leatherworking-Dead-Start:** eine der 13 Nicht-Kampf-Fertigkeiten ist ohne Kampf **null**
   spielbar (0 XP je), inkl. Pet/Mastery/99.
2. **P2 — Skiller-Quests hinter Kampf-Quests** (q_skiller_2–5, q_miner_3): thematisch verkehrt.
3. **P3 — kampf-verriegelte Verarbeitungs-Bäume** (Bögen, Elementar-Runen/Stäbe/Wands, Fleisch):
   Skill levelt, aber Gear-Payoff fehlt.

## Top-3-Verbesserungen (mit Soll-Zahlen, Balance Chef-freigegeben)
1. **Kampf-freie Lederquelle** — Leatherworking ab L1 anspielbar machen: neuer Foraging-Node
   `forage_raw_hide` (foraging L1, ~2200 xp/h-Band, loot `raw_hide` 2–4) **oder** Farming-Crop
   `hidevine` → `raw_hide`, **oder** `tan_leather` alternativ eine Pflanzenfaser (`reed_pale`)
   akzeptieren lassen. Ziel: gleicher L1-Einstieg wie bei den anderen 12 Verarbeitungen.
2. **Questreihe entkoppeln:** `q_skiller_2.requires = ["q_skiller_1"]` (q_fighter_2 raus);
   `q_miner_3.requires = ["q_miner_2"]` (q_slagpit_1 raus); `q_skiller_5` ohne `q_roc_fledgling`.
   Kampf-Quests bleiben eigener optionaler Zweig.
3. **Je gegatetem Craft-Baum einen kampf-freien Basis-Feeder** geben: (a) `bowstring` per Fletching
   aus Pflanzenfaser/Reed spinnbar (statt scarred_hide) → wenigstens niedrige Bogen-Tiers baubar;
   (b) eine forge-/mine-basierte Low-Elementar-Rune (`rune_essence` + Shop-Reagenz → frost/fire-Rune
   T1), damit Runecrafting-Stäbe nicht 100 % kampf-verriegelt sind.

---

## Bestätigt (Sweep-3-Fixes, nicht neu gemeldet)
`dim_essence`-Loop: `dim_essence` ist als L1-Foraging-Startquelle für `craft_force_rune` weiterhin
Skiller-erreichbar (Magier-/Runen-Start ohne Kampf entblockt), aber **nicht** im Shop → Gold-Loop tot.
Werkzeug-Leitern (Pickaxe/Rod/Sickle) vollständig Shop-erreichbar. Farming-Plots ab L1 nutzbar.
