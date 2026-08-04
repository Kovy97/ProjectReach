# QA Run 5 — Endgame L75–99 (echte Geared-Wall-Daten nach Sim-Fix)

**Playtester:** Endgame-Analyst, persona L75–99. Methode: **echte Engine-Simulation** (Temp-Harness, danach entfernt) — voll gemaxter L99-Held (ALLE Skills 99), drei BiS-Loadouts, je 1 h Auto-Battle gegen das Endgame-Band L84–120.
**Datum:** 2026-06-28
**Fokus:** 3-Stil-Parität @L99 nach Parität-R3 (godspark/voidweave getrimmt), die 5 Open-World-Mobs L87–110 + Capstone, Top-Gear, Suffix-Endgame-Loot (Drop 8%), **echte Walls mit gearedem Held**.
**Vergleich:** `design/qa/run4-endgame-l75-99.md` (Fun 8.5/10, reiner Daten-Audit ohne Sim).

## Fun-Score: 7.5 / 10 (Δ vs run4: **−1.0**)

Run4 war ein Papier-Audit und meldete „Stilparität behoben" (8.5). Der **Geared-Sim** erlaubt jetzt erstmals echte Messung — und korrigiert das nach unten: Die *Gear-Verfügbarkeit* ist paritätisch (alle drei Stile haben L99-Waffe + -Rüstung), der *Durchsatz* aber **nicht**. Im echten Kampf liegt **Magie bei ~0,5× Melee** (Mana-Ökonomie + Trim-Überkorrektur), und **es gibt im gesamten Band L84–120 keine einzige Wall** — der Capstone `last_idol` (L120) fällt einem BiS-Helden in **2,4 s/Kill** wie Trash-Mob. Heißt: melee/ranged-Spieler haben ein sauberes, abwechslungsreiches, voll clearbares Endgame; Magier rennen gegen eine Frust-Wand (halber Output); und *niemand* trifft auf eine echte Herausforderung. Das ist gutes, reiches Endgame mit zwei konkreten Balance-Löchern — kein 8.5 mehr, sobald man wirklich simuliert.

Zusätzlich: Das **im Repo verankerte `GEARED_HERO`-Harness ist fehlkalibriert** (combatLevel 90, Gear req 99 → der „geared" Held rüstet NICHTS aus, kämpft mit `rusty_sword`). Die „echten Wall-Daten" aus `sim.ts` sind damit weiterhin teils Schein-Daten, bis das behoben ist (P1, Details unten).

---

## Echte Walls mit gearedem Held — die Kernfrage

**Ergebnis: 0 Walls. Im gesamten Endgame-Band besiegt jeder der drei Stile jeden Mob inkl. Capstone.**

Kampf-Matrix (voll gemaxter L99-Held, BiS je Stil, 1 h Auto-Battle, `cooked_voidray` + Auto-Eat T0). Zelle = Kills/h · s/Kill:

| Mob | Lv | Melee (1H Schwert/Schild) | Melee-DPS (2H Großschwert) | Ranged (Langbogen+Voidhide) | Magie (Stab+Voidweave) |
|---|---|---|---|---|---|
| roc_void | 84 | 2477 · 1,5s | 1345 · 2,7s | 2112 · 1,7s | 1318 · 2,7s |
| gravecliff_specter | 87 | 2446 · 1,5s | 1288 · 2,8s | 2079 · 1,7s | 1262 · 2,9s |
| voidhusk_crusher | 90 | 2519 · 1,4s | 1361 · 2,6s | 2165 · 1,7s | 1196 · 3,0s |
| idol_warden | 92 | 2504 · 1,4s | 1364 · 2,6s | 2114 · 1,7s | 1281 · 2,8s |
| abyssal_tide_serpent | 96 | 2503 · 1,4s | 1261 · 2,9s | 2086 · 1,7s | 1115 · 3,2s |
| aether_wraith | 98 | 2510 · 1,4s | 1358 · 2,7s | 2096 · 1,7s | 1259 · 2,9s |
| charred_doomknight | 101 | 1972 · 1,8s | 1158 · 3,1s | 1525 · 2,4s | 1038 · 3,5s |
| scale_skarn | 104 | 1860 · 1,9s | 1175 · 3,1s | 1552 · 2,3s | 1006 · 3,6s |
| void_titan | 110 | 1848 · 1,9s | 1115 · 3,2s | 1529 · 2,4s | 848 · 4,2s |
| **last_idol (Capstone)** | **120** | **1503 · 2,4s** | 869 · 4,1s | 1247 · 2,9s | **729 · 4,9s** |

**BiS-Helden-Stats (computeStats, voll gemaxt):**
- Melee 1H: dmg 500 / HP 3006 / def 658 / acc 961 / eva 187 / crit 51% / aIMs **800**
- Melee 2H: dmg 645 / HP 2881 / def 590 / aIMs **1715**
- Ranged: dmg 440 / HP 2164 / def 324 / acc 976 / eva 285 / crit 56% / aIMs 1000
- Magie: dmg 362 / HP 2212 / def 330 / acc 1079 / eva 306 / crit 63% / aIMs 800 / **Mana 270 / Regen 10/s**

**Befund:** Die `regen`-Werte der Endgame-Mobs (3–14/s, seit run4 NEU auf den 5 Open-World-Mobs ergänzt) sind als DPS-Check gedacht — bei 300–600 Spieler-DPS aber **bedeutungslos**. Selbst `last_idol` (regen 14, enrage ×1,75, def 60) ist ein 2,4-s-Farmziel. Endgame-Gear dominiert den Content vollständig; eine echte Wand existiert nicht.

---

## 3-Stil-Parität @L99 — „Magie jetzt im Band statt Decke?"

**Magie ist von der Decke auf den BODEN gerutscht — im Band, aber am unteren Rand bei ~0,5× Melee.** Die Parität-R3-Trims (godspark/voidweave) haben überkorrigiert.

Durchsatz-Verhältnis vs Melee-1H (Referenz = 1,00×), gemittelt über das Band:

| Stil | Ø Verhältnis | @Capstone last_idol |
|---|---|---|
| **Melee 1H (Schwert/Schild)** | 1,00× | 1,00× (1503 k/h) |
| **Ranged (Langbogen+Voidhide)** | ~0,83× | 0,83× (1247 k/h) |
| **Melee 2H (Großschwert)** | ~0,58× | 0,58× (869 k/h) |
| **Magie (Stab+Voidweave)** | **~0,49×** | **0,49× (729 k/h)** |

**Ursache Magie (belegt, nicht geschätzt):** Bei voll gemaxtem dex floored `attackIntervalMs` auf **800 ms**. Ein Cast kostet 24 Mana (`godiron_staff`) → benötigter Durchsatz 30 Mana/s, Regeneration nur **10/s**. Der nachhaltige Cast-Takt = Regen/Kosten = **0,42 Casts/s** (1 echter Cast je 2,4 s); die übrigen ~75 % der Schwünge degradieren zum Schwach-Schlag (`MAGIC_WEAK_FACTOR = 0,35`). Effektiver Magie-Schaden ≈ 0,25·362 + 0,75·(0,35·362) ≈ **185** gegen Melee 500. Das ist die ~0,5×-Lücke. **Magie ist mana-gedrosselt, nicht schadens-arm** — die Stat-Decke ist da, die Mana-Ökonomie trägt sie am Endgame-Tempo nicht.

**Nebenbefund Waffen-Diversität:** Bei gemaxtem dex floored das Angriffsintervall für alle 1H auf 800 ms — schnelle 1H-Waffen schlagen 2H total (Großschwert 0,58× von Schwert/Schild, trotz +29 % Roh-Schaden). 2H-Melee (Großschwert/Großaxt/Hammer) sind am Endgame **Durchsatz-Fallen**.

---

## Suffix-Endgame-Loot (Drop 8%) — fast tot im Kampf-Loop

`DEFAULT_DROP_SUFFIX_CHANCE = 0,08` ist verdrahtet (combat.ts L416) und greift auf **Equipment-Drops**. Problem: **die Endgame-Mobs droppen praktisch kein Equipment.**

- Alle 5 Open-World-Mobs (L87–110) + idolhall-Mobs droppen ausschließlich **Materialien** (Essenzen, Erz, Leder, Federn, idol_shard) → speist Crafting, löst aber NIE einen Drop-Suffix aus.
- Das **einzige Equipment-Drop im gesamten Endgame** ist `aether_runestaff` von `last_idol` (5 %) — und das ist ein **L40-Stab** (magicDmg 27, req magic_off 40). Der schwerste Boss des Spiels droppt Vendor-Trash; selbst mit Suffix bleibt die Basis untertiert.
- **Suffix-Pool hat kein Endgame-Tier:** höchstes `minIlvl = 50` (von 23 Suffixen). Ein L84-Drop und ein L120-Drop ziehen aus demselben Pool, nur skaliert. Es gibt keine capstone-exklusive Identität („des Götzen"/„der Leere" @ minIlvl 80/100).

→ Suffix-Endgame ist faktisch ein **Crafting**-Feature (`DEFAULT_CRAFT_SUFFIX_CHANCE = 0,2` auf godiron/voidhide/voidweave), kein Loot-Feature. Der 8-%-Drop-Pfad hat im Endgame keine Oberfläche.

---

## Findings

### [P1] Stil-Durchsatz-Parität gebrochen: Magie ~0,5× Melee (Mana-Drossel)
Magie ist nach dem godspark/voidweave-Trim im Band, aber am Boden. Im echten Kampf halber Output ggü. Melee-1H — Ursache ist die Mana-Ökonomie (270 Pool / 10 Regen vs 24/Cast @ 800 ms → 75 % Schwach-Schläge), nicht der Roh-Schaden.
**Fix-Optionen:** (a) Mana-Regen-Skalierung am Endgame anheben (wis-Beitrag oder Set/Focus-`manaRegen`), (b) `manaCost` der Top-Stäbe senken, (c) Magie-Cast-Intervall vom dex-Floor entkoppeln (eigener `castIntervalMs`). Ziel: Magie ≥ 0,85× Melee.

### [P1] QA-Harness: `GEARED_HERO` rüstet sein Gear nicht aus (combatLevel 90 < req 99)
`sim.ts` GEARED_HERO setzt combatLevel **90**, equipped aber Godiron (req **99**) → `equipItem` schlägt für ALLE Teile fehl (verifiziert: equipped = nur `rusty_sword`). Die „echten Endgame-Wall-Daten" aus `runReport().combatGeared` laufen damit auf einem **nackten L90-Helden** — die Sim-Fix-Zusage ist erst halb eingelöst.
**Fix:** combatLevel auf 99 heben (und Nicht-Kampf-Skills fletching/leatherworking/runecrafting/jewelcrafting für voidhide/voidweave/godgem mitsetzen), ODER `equipItem`-Ergebnis im Sim prüfen und bei Fehlschlag laut werden. (Mein Temp-Harness mit allen Skills 99 lieferte die obigen belastbaren Zahlen.)

### [P2] Endgame hat für BiS keinerlei Wall — Capstone ist Trash-Farm
`last_idol` (L120, regen 14, enrage ×1,75) stirbt in 2,4 s (Melee). Die regen-DPS-Checks (3–14/s) sind gegen 300–600 Spieler-DPS wirkungslos. Es gibt keinen Schwierigkeits-Gate für einen gerüsteten Helden.
**Fix:** Ein echter Wall-Mechanismus für ≥1 Capstone-Encounter — z. B. % -basierter regen/Schild (skaliert mit max-HP statt flach), DPS-Soft-Enrage-Timer, oder Resist gegen den dominanten Stil. (Combat-FX/Mechanik ist lt. Memory ein späterer Meilenstein — hier nur als Balance-Lücke vermerkt.)

### [P2] Suffix-Endgame-Loot via Kampf nahezu nicht existent
Endgame-Mobs droppen nur Materialien; einziger Equip-Drop ist ein L40-Stab vom Capstone. 8 %-Drop-Suffix hat keine Oberfläche; kein Suffix mit `minIlvl > 50`.
**Fix:** (a) 1–2 endgame-tier Equipment-Drops (low-chance) in die L96–120-Tabellen, (b) 3–4 capstone-Suffixe mit `minIlvl 80/100` für eigene Endgame-Identität, (c) `aether_runestaff`-Drop durch ein endgame-würdiges Item ersetzen.

### [P2] Kein Endgame-Quest-Bogen (run4-P2 — weiterhin offen)
0 von 88 Quests zielen auf last_idol / Godiron-Forge / Idol-Sanctum. Endgrind hat narrativ keinen Pull.
**Fix:** kurzer L70/85/99-Bogen.

### [P3] 2H-Melee-Waffen sind am Endgame Durchsatz-Fallen
Bei gemaxtem dex floored aIMs auf 800 ms; schnelle 1H schlagen 2H um ~40 % Durchsatz trotz höherem Roh-Schaden (Großschwert 0,58× Schwert/Schild). Build-Diversität bricht weg.
**Fix:** 2H-Schadens-Premium erhöhen ODER 1H/2H verschiedene aIMs-Floors geben.

### [P3] Slayer-Shop stoppt bei Slayer 60 (run4-P3 — weiterhin offen)
Letztes Item `void_anchor` (Slayer 60). Slayer 60–99 ohne neuen Punkte-Sink.

---

## Δ vs run4 — Zusammenfassung

| run4-Aussage | Status run5 (echte Sim) |
|---|---|
| „Killbar geared? Ja" (Daten-Reasoning) | **BESTÄTIGT** — 0 Walls, jeder Stil clear das ganze Band inkl. Capstone |
| „Stilparität behoben" (Gear-Verfügbarkeit) | **TEILS WIDERLEGT** — Gear paritätisch, *Durchsatz* nicht: Magie ~0,5×, Ranged ~0,83× Melee-1H |
| Capstone „bewusst zäh" | **WIDERLEGT** — last_idol = 2,4 s/Kill Trash-Farm; keine Wall |
| Suffix aktiv (8 % Drop) | **aktiv, aber im Endgame ohne Oberfläche** (Mobs droppen nur Mats) |
| Geared-Sim liefert echte Wall-Daten | **HARNESS NOCH FEHLKALIBRIERT** (GEARED_HERO kämpft nackt; req 99 vs combatLevel 90) |
| Open-World-Mobs (run4-Tabelle ohne regen) | **NEU regen 3–6/s ergänzt** + last_idol xp 16000 |
| Kein Endgame-Quest-Bogen / Slayer-Shop-Stopp | **unverändert offen** |

**Fun: 8.5 → 7.5 (−1.0).** Die Sim entlarvt zwei reale Endgame-Löcher, die der Papier-Audit nicht sehen konnte: Magie-Halbkraft und Null-Wall-Faceroll. Inhaltlich ist das Endgame reich und sauber clearbar — die Punkte fehlen an *Balance-Tiefe*, nicht an Content-Menge.

---

## Was fehlt für 9,5?

1. **Magie auf ≥0,85× Melee heben** (P1) — Mana-Ökonomie am Endgame-Tempo tragfähig machen (Regen-Skalierung / manaCost-Senkung / Cast-Intervall vom dex-Floor lösen). Das ist der größte Einzelhebel: 1/3 der Spieler spielt sonst einen Halbkraft-Stil.
2. **Eine echte Endgame-Wall bauen** (P2) — mindestens der Capstone muss einen gerüsteten Helden fordern (%-basierter Schild/regen, DPS-Timer, Stil-Resist). „Endgame" ohne jeden Gate ist ein gelöstes Spiel.
3. **Geared-Harness reparieren** (P1) — damit Balance-Aussagen künftig stimmen (combatLevel 99 + Nicht-Kampf-Skills, oder equip-Ergebnis prüfen). Sonst bleibt jede „Wall-Analyse" Schein.
4. **Suffix-Endgame mit Identität** (P2) — capstone-Suffixe (minIlvl 80/100) + echte Equip-Drops in L96–120, damit der 8-%-Drop-Pfad und der Suffix-Chase am Endgame ankommen.
5. **Endgame-Quest-Bogen + Slayer-Sink** (P2/P3) — narrativer Pull L70/85/99 und Punkte-Sink Slayer 75/90 für den Endgrind.

Punkte 1–2 heben von 7,5 auf ~9; 3–5 schließen auf 9,5.
