# Slayer-Turm-Rework — Schwierigkeits- & Unique-Ökonomie-Spec (Teil 1)

**balance-designer, 2026-07-17 · Chef-Auftrag: „Prinzip behalten — Unlock je Slayer-Level — aber die Schwierigkeit besser machen" + Erweiterung 17.07. (Etagen-Anzahl flexibel, Slayer = Hauptquelle für Uniques, neue Gegner sparsam erlaubt).**
**Reine Spec — KEINE Umsetzung. Zahlen werden nach Chef-Freigabe von content-dev/logic-dev/combat-dev übernommen.**

Datenbasis: `pnpm test` 2026-07-17 (938/938 grün, Sim-Block: Turm-TTK 4,3 s Etage 1 → 12,9 s Etage 5,
0 Tode, Bronze-Baseline unverändert 5 bekannte Flags, 0 echte Walls) · Vesna-Fun-Sweeps R1–R3
(`design/fun-review/slayer-vesna.md`, `retest-…`, `r3-…`) · Engine-Sichtung `packages/engine/src/slayer.ts`,
`combat.ts`, `shared` (Konstanten) · Content ~Z. 11942–12340 (Monster), ~Z. 16090–16174 (Master/Turm/Shop).

---

## 0. Kurzfassung

1. **7 Etagen statt 5** — Gates **1 / 20 / 40 / 60 / 80 / 90 / 99** (Slayer-Cap = 99, `MAX_LEVEL`,
   leveling.ts). Die 5 bestehenden Etagen-Bänder sind nach balance-pass2 gesund und bleiben fast
   unangetastet (3 Mikro-Umlevel); die neuen Etagen 6/7 lösen den Endgame-Pool-Kollaps
   (R3: Bone Colossus = 26 % aller Ziehungen) strukturell.
2. **Konter-Items werden echte Konter statt Schlüssel:** Der heutige Hard-Block
   (`canFightMonster`, slayer.ts Z. 111–130) wird für `slayerRequirement` durch ein
   Soft-Konter-Modell ersetzt: ohne Item kämpfbar, aber volle Signatur-Bedrohung (DoT/Slow/Stun);
   mit Item (Besitz genügt, wie heute) wird die Signatur des Monsters neutralisiert.
   Je Etage EINE Signatur aus dem vorhandenen Baukasten (poison/frost/shock/burn — alles existiert).
   **Keine neuen Konter-Items nötig** — Etage 6/7 re-verwenden die 5 bestehenden.
3. **Etagen-Wächter (Elites):** je Etage 1 Elite (×3 HP, ×1,3 DMG), als Prestige-Task
   (~9–10 % der Turm-Tasks, Gewicht 0,5), kleinere Task-Größe (8–15), doppelte Punkte.
   Nur mit aktivem Wächter-Task bekämpfbar (empfohlen; sonst Drop-Chancen ÷20).
4. **Unique-Ökonomie:** 9 Elite-Unique-Slots (Chancen 0,8–3,0 % pro Kill, Erwartung 6–36 h
   aktives Slaying) nach Rare-Drop-Philosophie (Next-Tier-Stats bei Ist-Tier-Req + Effekt) +
   **Shop-Chase-Etage** (3 Punkte-Uniques: 1.500/2.500/4.000 Pkt ≈ 40/67/110 h Sparziel).
5. **Task-Ökonomie:** Turm-Fenster-Unterkante CL−20 → **CL−12** (killt die „too weak = 31 %
   der Ziehungen ohne Kampf-XP"-Dissonanz), Turm-Oberkante CL+8 → **CL+10** (Etage 7 bleibt
   ziehbar), **Gefahrenzulage** ×0,85 / ×1,0 / ×1,15 nach Ziel-Level — Ø-neutral (±5 %,
   sim-verifiziert), Preis-Rekalibrierung aus sweep6-batchE bleibt gültig.
6. **Save-kompatibel: keine State-Änderung, kein SAVE_VERSION-Bump.** Alles ist Content +
   reine Engine-Logik (Assign-Gewichtung, Fenster-Konstanten, Inflict-Hook).

---

## 1. Ist-Aufnahme & Etagen-Architektur

### 1.1 Ist-Tabelle — alle 28 Turm-Monster

TTK aus dem Sim-Block vom 17.07. (relativer Vergleichswert des Harness-Charakters; 0 Tode überall).

| Etage (Gate) | Monster | Lv | HP | DMG | DEF (Typ) | XP/Kill | TTK Sim | Konter-Item |
|---|---|---|---|---|---|---|---|---|
| 1 (SL 1) | rot_rat | 3 | 3 | 3 | 2 eva | 2 | 4,4 s | — |
| | plague_grub | 7 | 5 | 4 | 4 eva | 6 | 4,6 s | — |
| | shambling_carcass | 12 | 9 | 6 | 10 armor | 11 | 4,3 s | plague_mask |
| | tower_goblin | 15 | 15 | 7 | 10 armor | 24 | 4,3 s | — |
| | hollow_marrow | 16 | 11 | 7 | 10 armor | 14 | 4,3 s | plague_mask |
| | tower_goblin_rogue | 19 | 18 | 8 | 10 eva | 38 | 4,4 s | — |
| 2 (SL 20) | gaze_basilisk | 22 | 15 | 9 | 11 eva | 22 | 4,6 s | mirror_ward |
| | wailing_shade | 28 | 18 | 12 | 14 ward(5) | 35 | 4,4 s | ear_plugs |
| | bone_stalker | 34 | 24 | 13 | 20 armor | 58 | 4,3 s | — |
| | tower_skeleton_warrior | 36 | 28 | 14 | 20 armor | 68 | 4,4 s | — |
| | ashfield_wraith | 38 | 29 | 16 | 20 ward(9) | 78 | 4,4 s | — |
| | tower_skeleton_archer | 38 | 26 | 16 | 20 eva | 78 | 4,9 s | — |
| 3 (SL 40) | slag_abomination | 44 | 24 | 25 | 22 armor | 88 | 4,3 s | — |
| | cinder_wretch | 48 | 25 | 24 | 24 armor | 110 | 4,4 s | — |
| | tower_ember_elemental | 50 | 28 | 26 | 30 ward(8) | 130 | 4,4 s | — |
| | forge_demon | 54 | 32 | 29 | 30 ward(10) | 165 | 5,1 s | soul_veil |
| | tower_iron_revenant | 56 | 36 | 34 | 30 armor | 180 | 4,4 s | — |
| 4 (SL 60) | dreadfang | 62 | 32 | 29 | 31 eva | 258 | 5,1 s | — |
| | void_stalker | 66 | 35 | 34 | 33 eva | 315 | 4,7 s | void_anchor |
| | sorrow_wraith | 72 | 50 | 36 | 40 ward(15) | 680 | 6,9 s | soul_veil |
| | tower_frost_hound | 74 | 56 | 37 | 40 eva | 820 | 8,2 s | — |
| | bone_colossus | 76 | 62 | 45 | 66 armor | 920 | 6,9 s | — |
| 5 (SL 80) | dread_knight | 82 | 78 | 43 | 70 armor | 1.080 | 9,0 s | — |
| | soul_flayer | 86 | 88 | 41 | 43 ward(26) | 1.320 | 9,5 s | soul_veil |
| | void_herald | 90 | 98 | 43 | 50 ward(29) | 1.650 | 12,0 s | void_anchor |
| | tower_roc_void | 94 | 112 | 40 | 50 eva | 2.150 | 12,9 s | — |
| | abyssal_devourer | 96 | 120 | 49 | 78 armor | 2.300 | 12,0 s | void_anchor |

**Befund:** Die Bänder je Etage sind nach balance-pass2 (2026-07-01) und Combat-Feel-v2 sauber
gestaffelt (kein Cliff, keine Flat-Strecke innerhalb einer Etage). Der alte F4-Finding
„tower_goblin_rogue L19 auf Etage 1 = +16-Sackgasse" ist seit dem Fenster-Filter
(`assignTask`: nur Ziele ≤ CL+8) gelöst — kein Umlevel-Grund mehr. Das ECHTE strukturelle
Problem sitzt oben: Etage 5 endet bei L96, das Task-Fenster eines 96–99ers frisst die
Etagen 1–4 fast komplett weg → 4–5 Kandidaten, Monokultur (R3).

### 1.2 SL ↔ CL-Kopplung (Herleitung für die Gates)

Slayer-XP pro Task-Kill = `monster.xp × 0,5` sofort + `× 0,5 × N` als Abschluss-Bonus
(SLAYER_XP_KILL_FACTOR = 0.5) ≈ **monster.xp pro Kill** bei Task-Abschluss. Der Stil-Skill
bekommt pro Kill ebenfalls ~`monster.xp` (Kill-Bonus) + Schadens-XP; beide laufen über
dieselbe XP-Kurve UND denselben Frühgame-Verstärker (`earlyXpMult`, ×3 bei L1 → ×1 ab L40).
Konsequenz: **bei hoher Task-Uptime wächst SL ≈ im Gleichschritt mit dem Stil-Skill/CL,
bei gemischtem Spiel hinkt SL ~5–8 Level hinterher.** Empirische Anker: Mid-Fixture
CL 30/SL 24 · End-Fixture CL 96/SL 97 · Vesna R1: SL 1→26 in 8 Tasks bei CL 30.

Daraus die Gate-Erwartung (typisches CL beim Erreichen des Gates):

| Gate | SL | typ. CL bei Ankunft | Etagen-Band (Soll) | Regel |
|---|---|---|---|---|
| Etage 1 | 1 | 1–5 | L 3–19 | Band-Min ≈ Gate+2 |
| Etage 2 | 20 | 24–32 | L 22–38 | Band-Min in [CL+0 .. CL+6] des frischen Gate-Spielers |
| Etage 3 | 40 | 42–50 | L 44–56 | " |
| Etage 4 | 60 | 60–68 | L 62–76 | " |
| Etage 5 | 80 | 80–88 | L 82–96 | " |
| **Etage 6 (NEU)** | **90** | 89–95 | **L 97–103** | " |
| **Etage 7 (NEU)** | **99** | 96–99 | **L 104–108** | Endcap; Oberkante ≤ CL-Cap+10 (§6.1) |

**Etagen-Anzahl-Urteil:** 7 Etagen mit Gates 1/20/40/60/80/90/99 (Chef-Vorschlag) — **JA**.
Begründung: (a) SL 80→99 sind ~703 von ~888 Tasks der Gesamtreise (Vesna R1) — 79 % der
Slayer-Lebenszeit hat heute NULL neue Freischaltungen; zwei späte Gates geben genau dieser
Strecke Ziele. (b) Der Endgame-Task-Pool wächst von 4–5 auf ~12 Turm-Kandidaten — die
Bone-Colossus-/Quasi-Hirsch-Monokultur ist damit strukturell weg (zusätzlich zur
Welle-NN-Gewichtung). (c) SL 99 als Gate ist erreichbar und gibt dem 99er-Cape einen Ort.
Mehr als 7 Etagen lehne ich ab: unter Gate-Abstand 9–10 SL wird ein Gate zur Formalie.

### 1.3 Umlevel-Tabelle (Bestand — nur 3 Mikro-Korrekturen)

HP/DMG/XP nach Nachbar-Interpolation (bestehende Level-Konvention der Etage; DMG-Feinschliff
nach Combat-Feel-v2-Konvention „naked Zufluss ≈ 5 %/s" durch content-dev gegenprüfen).

| Monster | Ist-Lv | Soll-Lv | Anpassung | Begründung |
|---|---|---|---|---|
| plague_grub | 7 | **9** | HP 5→7, DMG 4→5, DEF 4→6, XP 6→8 | F1-Lücke 7→12 glätten (Leiter-Gefühl im Erstkontakt) |
| hollow_marrow | 16 | **18** | HP 11→13, DMG 7→8, DEF 10→11, XP 14→18 | 15/16-Doppel auflösen; 3/9/12/15/18/19-Leiter |
| bone_stalker | 34 | **31** | HP 24→21, DMG 13→12, DEF 20→18, XP 58→45 | F2-Lücke 28→34 glätten; 22/28/31/36/38-Leiter |
| alle übrigen 25 | — | **unverändert** | — | Bänder sind nach balance-pass2 gesund; kein Zahlen-Churn |

### 1.4 Neue Etagen 6 & 7 — Roster & Stat-Ziele

**Kein neues Chef-Art nötig außer für den Etage-7-Wächter** (bewusst 1 Prestige-Art).
Etage 6 = hochgelevelte `tower_`-Klone (Art existiert; Klon-Guard `tower-monsters.test.ts`
erlaubt Stat-Abweichung, Loot bleibt 1:1 mit der Basis — **nur HOCH-leveln, nie runter**,
sonst würde Basis-Loot zu billig farm-bar). Etage 7 = „aufgestiegene" Varianten der
Etage-5-Monster mit **neuen IDs und eigenen Loot-Tabellen** (Art-Wiederverwendung per
Asset-Duplikat/Alias — asset-integrator; Namen liefert lore-dev, IDs hier provisorisch).

Stat-Kurve extrapoliert aus Etage 5 (XP ≈ +6 %/Level; DEF-Fortschreibung armor ~80→88,
ward ~56→64 bei Cap 32→40):

| Etage | id (prov.) | Basis (Art) | Lv | HP | DMG | ACC | DEF (Typ) | Intervall | XP | Signatur-Inflict | Konter |
|---|---|---|---|---|---|---|---|---|---|---|
| 6 (SL 90) | tower_hollow_choir | hollow_choir | 97 | 126 | 51 | 13 | 56 ward(32) | 2800 | 2.550 | shock 30 %, m 0,35, 5 s | ear_plugs |
| 6 | tower_skeleton_icemage | skeleton_icemage | 99 | 133 | 53 | 13 | 58 ward(34) | 3000 | 2.850 | frost 35 %, 5 s | mirror_ward |
| 6 | tower_skeleton_pyroclasp | skeleton_pyroclasp | 101 | 140 | 54 | 13 | 84 armor | 3000 | 3.200 | burn 35 %, m 6, 6 s | soul_veil |
| 6 | tower_skeleton_nekro | skeleton_nekro | 103 | 148 | 56 | 14 | 86 armor | 3200 | 3.600 | — (regen 0,5) | — |
| 7 (SL 99) | asc_dread_knight | dread_knight | 104 | 152 | 57 | 14 | 88 armor | 3000 | 3.800 | bleed 35 %, m 8, 6 s | — |
| 7 | asc_soul_flayer | soul_flayer | 106 | 160 | 59 | 14 | 62 ward(38) | 2800 | 4.300 | burn 35 %, m 8, 6 s | soul_veil |
| 7 | asc_void_herald | void_herald | 107 | 165 | 60 | 14 | 64 ward(40) | 2800 | 4.550 | shock 40 %, m 0,40, 5 s | void_anchor |

Trinity-Hinweis (Rüstungs-Trinität/armorPen-Sichtbarkeit): Etage 6/7 sind ward-/armor-lastig;
content-dev soll bei der Umsetzung prüfen, ob je Etage mindestens 1 Evasion-Ziel im Fenster
liegt (Etage 5 liefert tower_roc_void L94 als Evasion-Nachbar — akzeptabel; wenn nicht:
tower_skeleton_nekro alternativ als Evasion-Variante ausprägen).

---

## 2. Konter-Mechanik — vom Schlüssel zum Konter

### 2.1 Ist-Sichtung

- `slayerRequirement` ist heute ein **reiner Hard-Block**: `canFightMonster` (slayer.ts
  Z. 111–130, explizit als Chef-Entscheidung kommentiert) verweigert den Kampf komplett,
  wenn das Item nicht in Besitz ist (ausgerüstet ODER Inventar ODER Bank; `slayerHelm: true`
  ersetzt alle). **Es existiert KEIN Mechanismus „ohne Item härter"** — das Item ist ein
  Schlüssel, kein Konter. Die Items selbst (plague_mask etc.) sind `type: "material"` ohne
  jeden Kampfwert.
- Vorhandener Monster-Baukasten (combat.ts, alles live): `inflict` (poison/burn/bleed als
  DoT-Magnitude/s, frost als Slow −FROST_SLOW, shock als Aussetz-Chance je Schlag),
  `resist`, `regen`, `enrage`, `defenseType` armor/evasion/ward + `wardCapacity`.
  **Keine neuen Engine-Systeme nötig.**

### 2.2 Soll-Modell: Soft-Konter (Chef-Entscheidung O-1 nötig — kehrt den Hard-Block um)

- `canFightMonster` verliert die `slayerRequirementMet`-Klausel (Etagen-Gate + Story-Zonen-Gate
  bleiben Hard-Blocks). Jedes Turm-Monster ist ab Etagen-Freischaltung kämpfbar → **„nie unmöglich"**.
- NEUER Hook im Inflict-Pfad (combat.ts `monsterInflict`-Stelle, ~Z. 1345): hat das Monster
  eine `slayerRequirement` und der Spieler das Item im Besitz (`slayerRequirementMet`,
  unverändert idle-fair inkl. Bank), wird der **Inflict des Monsters komplett unterdrückt**
  (Chance = 0) → **„mit Konter-Item spürbar leichter"**. Ohne Item wirkt der Inflict voll →
  **„ohne spürbar zäher"** (nur Status-Druck, KEINE Stat-Änderung — die Basis-Stats bleiben
  wie definiert, kein versteckter Damage-Buff).
- Task-Vergabe (`assignTask`) filtert weiterhin auf erfüllte Anforderung — ein vergebener
  Task impliziert Item-Besitz, `recordKillForSlayer` bleibt unverändert (kein Trap-Fall).
- Damit jede Etage EINE lesbare Signatur hat, bekommen 3 Monster einen bislang fehlenden
  Signatur-Inflict (heute: Anforderungs-Item ohne spürbare Bedrohung dahinter):

| Etage | Signatur | Träger (Anforderungs-Monster) | Neu/Änderung | Konter-Item (Kosten) |
|---|---|---|---|---|
| 1 Pestkammern | **poison** | shambling_carcass, hollow_marrow | NEU: poison 35 %/40 %, m 1, 5 s | plague_mask (12 Pkt) |
| 2 Spiegelhallen | **frost** (+shock sekundär) | gaze_basilisk (frost 30 %) · wailing_shade (shock 25 %) | unverändert | mirror_ward (25) · ear_plugs (18) |
| 3 Schmiedeabgründe | **burn** | forge_demon (burn 35 %, m 1) | m 1 → **m 3** (bei L54 sonst unfühlbar) | soul_veil (55) |
| 4 Flüsternde Leere | **shock** (+burn) | void_stalker (shock 30 %) · sorrow_wraith (burn 25 %, m 1 → **m 4**) | Magnitude-Anhebung | void_anchor (100) · soul_veil |
| 5 Abyssaler Thron | **burn + shock** | soul_flayer (burn 30 %, m 1 → **m 5**) · void_herald (shock 35 %) · abyssal_devourer NEU: shock 25 %, m 0,30, 5 s | Devourer hatte Anforderung ohne Bedrohung | soul_veil · void_anchor |
| 6 (NEU) | Reprise frost/burn/shock | s. §1.4 | — | mirror_ward · soul_veil · ear_plugs |
| 7 (NEU) | burn/shock (Leere) | s. §1.4 | — | soul_veil · void_anchor |

Etage 6 als „Reprise-Etage" ist Absicht: Alle drei Alt-Konter kehren auf hohem Niveau zurück
→ der Slayer-Helm (ersetzt alle Einzel-Items) bekommt genau dort seinen Wert-Moment, wo er
gekauft/gecraftet wird (SL 80). **Keine neuen Konter-Items** → kein neuer Content-/Craft-/
Lokalisierungs-Aufwand, Shop-Leiter bleibt unverändert lesbar.

### 2.3 Kosten-Check Konter-Items vs. Punkte-Einkommen

Einkommen: Ø ~5 Pkt/Task (skalierend 4–6) · mid ~8–10 Tasks/h → 40–50 Pkt/h · end ~6 Tasks/h
→ ~35 Pkt/h (gemessene END-Rate, sweep6-batchE-Kommentar im Shop-Block).

| Item | Kosten | SL-Gate | ≈ Tasks | ≈ Zeit beim Tier | Urteil |
|---|---|---|---|---|---|
| plague_mask | 12 | 1 | 2–3 | < 30 min | ok (Erstkauf-Lehrmoment) |
| ear_plugs | 18 | 15 | 4 | ~30 min | ok |
| mirror_ward | 25 | 15 | 5 | ~40 min | ok |
| soul_veil | 55 | 40 | 11 | ~1,2 h | ok |
| void_anchor | 100 | 60 | 20 | ~2,2 h | ok — spürbar, nicht gierig |

Alle 5 unverändert lassen (Craft-Alternativen existieren, `craft_*`-Rezepte Z. 10270 ff.).
Im Soft-Modell sinkt der Zwang („ohne Item geht nichts") — die Preise dürfen deshalb NICHT
steigen; das Item verkauft sich über Komfort (kein Status-Druck), nicht über Erpressung.

---

## 3. Etagen-Wächter (Elites)

### 3.1 Statik-Regel & Roster

Regel: **Elite = ×3,0 HP, ×1,3 DMG, +1–2 ACC, +~15 % DEF des Etagen-Top-Monsters**, Level im
oberen Band-Drittel (NICHT über Band-Max +2 — die Härte kommt aus Stats, nicht aus Level-
Inflation, sonst fallen Elites aus dem Task-Fenster). Alle Elites: Signatur-Inflict ihrer
Etage in verschärfter Form (+10 pp Chance) + `enrage { belowHpPct: 0.30, damageMult: 1.5 }`.
Art: Duplikat/Alias des Basis-Monsters (asset-integrator) — **nur E7 bekommt neues Chef-Art**.

| Etage | Elite-id (prov.) | Basis (Art) | Lv | HP | DMG | ACC | DEF (Typ) | XP | Konter |
|---|---|---|---|---|---|---|---|---|---|
| 1 | warden_f1 | shambling_carcass | 18 | 55 | 11 | 9 | 14 armor | 90 | plague_mask |
| 2 | warden_f2 | gaze_basilisk | 36 | 88 | 21 | 10 | 24 eva | 195 | mirror_ward |
| 3 | warden_f3 | forge_demon | 55 | 105 | 42 | 11 | 36 ward(14) | 450 | soul_veil |
| 4 | warden_f4 | bone_colossus | 75 | 190 | 56 | 12 | 74 armor | 2.300 | void_anchor |
| 5 | warden_f5 | abyssal_devourer | 95 | 360 | 62 | 14 | 86 armor | 5.800 | void_anchor |
| 6 | warden_f6 | skeleton_nekro | 102 | 430 | 70 | 15 | 90 armor | 9.500 | soul_veil |
| 7 | warden_f7 | **NEU (Chef-Art)** | 108 | 520 | 78 | 16 | 100 armor | 13.000 | void_anchor |

TTK-Ziel (Gate-Level-Loadout): Elite ≈ ×2,5–3,5 der Etagen-Ø-TTK → 25–60 s pro Kill.
Ein Wächter-Task (8–15 Kills) dauert damit ~5–12 min — Prestige, kein Abarbeiten.

### 3.2 Task-Mechanik (Engine: 1 optionaler MonsterDef-Block, kein State)

Neuer optionaler Block `slayerElite` an der MonsterDef, NUR von `assignTask` gelesen:

- `taskWeight: 0.5` — das Kandidaten-Los (seit Welle NN gewichtet nach Kandidatenzahl) wird
  gewichts-proportional statt stück-proportional. Etage mit 5 Regulären + 1 Elite:
  Elite-Anteil = 0,5/5,5 ≈ **9,1 % der Etagen-Tasks** (Ziel ~10 %).
- `taskAmount: { min: 8, max: 15 }` — Override der Master-Spanne (15–50 wäre bei ×3-HP-Zielen
  ein 30-Minuten-Task).
- `pointsMult: 2.0` — auf den beim Assign fixierten `pointReward` (nach Größen-Skalierung und
  Gefahrenzulage, §6.2). Elite-Task ≈ 8–12 Pkt statt 4–6.
- **Empfehlung (Chef-Entscheidung O-2):** Elites sind NUR mit aktivem Task auf genau diesen
  Wächter bekämpfbar (eine Klausel in `canFightMonster`; OSRS-„Superior"-Gefühl: „der Wächter
  zeigt sich nur, wenn Brenna ihn markiert"). Das macht die Unique-Chancen (§4) task-getaktet
  kalkulierbar. Alternative: frei farmbar → alle Elite-Drop-Chancen ÷ 20 (s. §4.3).

Slayer-XP-Balance: Elite-XP ≈ 2,5× Etagen-Top × kleinere Task-Größe → Slayer-XP pro
Elite-Task ≈ 0,8–1,1× eines Normal-Tasks. Kein XP-Exploit, kein XP-Loch.

---

## 4. Unique-Item-Ökonomie („Slayer = Hauptquelle für Uniques")

### 4.1 Unterversorgte Nischen (Endgame-Sichtung)

Gesichtet: Slot-Verteilung (247 mainhand vs. 27 amulet / 41 cape / ~20 ring), Craft-Spitzen
aetherium (L90) / godiron (L99), Boss-Chases (spectral_longbow, last_judgement/_condemnation,
voidwing_greatbow 1/6250), Turm-Bestands-Uniques (rotfang_dagger … abyssal_devourer_fang).
Lücken: **(a) Ringe/Amulette über dem Top-Craft-Ring** (nur aetherband_ring 1/4762),
**(b) Capes** (unterhalb der 99er-Meisterumhänge fast nichts Gutes — deckt sich mit
Item-Builder-Memory „gute Capes kommen als Drops"), **(c) Caster-Waffe magic 85–95**
(zwischen sorrow_staff 72 und last_condemnation 99 klafft es), **(d) Ranged-Endgame im Turm**
(nichts über mirrorglass_bow 28), **(e) Trinity-Teile mit Identität** (Ward-Stoff-Body,
Evasion-Leder) — Rüstungs-Chase ist fast nur Craft-Leiter.

### 4.2 Elite-Unique-Slots (Drops der Etagen-Wächter)

Rare-Drop-Philosophie: **Stats des NÄCHSTEN Tiers bei Requirements des aktuellen** + Effekt
(die Zeit-Seltenheit dieser task-getakteten Drops entspricht 1/1000+-Welt-Drops → Effekt
gerechtfertigt). Effekte NUR aus implementierten Kinds (`SPECIAL_EFFECT_TYPES`, shared
Z. 497 ff.) bzw. Status-weaponEffects. Namen/Lore: lore-dev (Slots hier generisch).

| Slot | Quelle | Typ/Slot | Req (Ist-Tier) | Stat-Budget (Next-Tier) | Effekt-Vorschlag | Rarität |
|---|---|---|---|---|---|---|
| U1 | warden_f1 | Amulett | — | wie L30-Schmuck: con 3, str 2, lck 3, attack +1 | — (früher Lehr-Drop) | rare |
| U2 | warden_f2 | Leder-Stiefel | ranged 35 | evasionRating des L50-Leder-Tiers, dex 3, lck 2 | — | rare |
| U3 | warden_f3 | 2H-Nahkampf | attack 50 | dmg 8,0–13,5 @3000 ms (≈ dreadfang_glaive-Klasse) | armorPen 25 % + burn 25 %, m 3, 5 s | epic |
| U4 | warden_f4 | Stoff-Body (Ward) | magic 65 | wardCapacity des L80-Stoff-Tiers, int 5, wis 3 | thorns (klein) | epic |
| U5 | warden_f5 | Ring | slayer 80 | str 5, dex 3, int 6, lck 8, power +5 (Top-Craft-Ring +1 Tier) | bonus hpRegenPerSec 0,2 | epic |
| U6a | warden_f6 | Caster-Mainhand | magic 90 | dmg 8–12 @3000, manaCost 10 (≈ 99er-Klasse) | burn 40 %, m 8, 6 s + manaOnKill 5 | epic |
| U6b | warden_f6 | Leder-Body | ranged 90 | evasionRating godiron-Leder-Äquiv. +1 Tier, dex-lastig | — | epic |
| U7a | warden_f7 | Ranged-2H | ranged 92 | dmg 7,9–13,2 @3000 (≈ spectral_longbow-Klasse, UNTER voidwing_greatbow) | **bounty** +20 % vs. Slayer-Ziel (DIE Slayer-Waffe) | epic |
| U7b | warden_f7 | Melee-1H | attack 95 | dmg 14–26 @2900 (godiron_sword-Klasse) | healOnKill 8 (Kriegshunger) | epic |

Alle Uniques mit `suffixChance: 30 %` (bestehende Konvention der Turm-Drops).
Elites droppen zusätzlich 2–3× Etagen-Material + (E5–E7) abyssal_core mit 8–12 %.

### 4.3 Drop-Chancen & Zeitkosten (task-getaktete Variante, O-2 = JA)

Annahmen (dokumentiert für die Verifikation): Turm-Anteil 50 % der Tasks · Elite ≈ 9–10 %
der Turm-Tasks → ~5 % aller Tasks · Tasks/h aktiv: früh 10, mid 8, end 6 · Ø 11,5 Kills
pro Elite-Task → **Elite-Kills/h ≈ 5,8 (früh) / 4,6 (mid) / 3,5 (end)**.

| Slot | Chance/Kill | erwartete Kills | ≈ Stunden aktives Slaying |
|---|---|---|---|
| U1 | 3,0 % | 33 | ~6 h |
| U2 | 2,5 % | 40 | ~8 h |
| U3 | 2,0 % | 50 | ~11 h |
| U4 | 1,5 % | 67 | ~15 h |
| U5 | 1,2 % | 83 | ~24 h |
| U6a / U6b | je 1,0 % | 100 | ~29 h je Item (~14 h bis „irgendein" F6-Unique) |
| U7a / U7b | je 0,8 % | 125 | ~36 h je Item |

Frühe Slots absichtlich gnädig (6–11 h): Das System soll SCHNELL beweisen, dass Wächter-Tasks
Jackpots tragen. **Falls O-2 = NEIN (frei farmbar):** Farm-Rate ~70–90 Kills/h → alle Chancen
÷ 20 (U1 0,15 % … U7 0,04 %), sonst kollabiert die Chase-Dauer auf < 2 h.

### 4.4 Shop-Chase-Etage (Punkte-Uniques — Langzeit-Sparziel)

Neuer Katalog-Block ÜBER dem Helm (Preis-Rekalibrierung sweep6-batchE bleibt unangetastet;
dies ist eine ZUSÄTZLICHE Etage, kein Re-Pricing). Einkommen ~35–40 Pkt/h end (inkl. §6-Zulage).

| Slot | Kosten | SL-Gate | Budget | ≈ Sparzeit |
|---|---|---|---|---|
| C1: Platten-Stiefel | 1.500 Pkt | 85 | armorRating godiron-Sabatons +1 Tier, str/con | ~40 h |
| C2: Cape | 2.500 Pkt | 92 | bestes Nicht-Meister-Cape: str 3, dex 3, con 4, int 3, lck 4, attack +3 | ~67 h |
| C3: Amulett (godly) | 4.000 Pkt | 99 | sevenfold-Klasse: str 5, dex 3, con 6, int 5, lck 8, hpRegen 0,3, attack +4 | ~105–115 h |

Das löst Vesnas „Punkte-Farmer wählt den Hasen" mit einem Zieh-Sog nach oben UND Pips
„Punkte ohne Traumziel"-Befund für die Slayer-Währung (die Quest-Token-Chase-Etage bleibt
separates Chef-Thema). Bekannte Engine-Grenze: `maxPurchases` wird nicht durchgesetzt
(bräuchte Kauf-Zähler + SAVE-Bump) — Mehrfachkauf ist sinnlos, aber möglich; wie beim Helm
heute akzeptiert, KEIN State dafür einführen.

---

## 5. Ökonomie-Gesamtwirkung

- Elite-Tasks: +5 % der Tasks mit ×2 Punkten → **+~5 % Punkte-Einkommen**.
- Gefahrenzulage (§6.2): Ø-neutral konstruiert (±5 %-Gate in der Verifikation).
- Neue Senken: +8.000 Pkt Chase-Katalog (vorher 2.368 gesamt) → Senken wachsen ~4× stärker
  als das Einkommen; Netto-Inflation negativ. Bestehende Preise (Helm 650 ≈ 17–19 h)
  bleiben exakt gültig.

---

## 6. Task-Ökonomie-Feinschliff im Turm

### 6.1 Fenster-Kanten (löst „too weak zum Vollpreis")

Wurzel des 31-%-Befunds (R3): Turm-Unterkante `TOWER_TASK_LEVEL_MAX_UNDER = 20` vs.
Kampf-XP-Null-Schwelle `XP_ZERO_GAP = 15` (gegen den STIL-Skill, der typisch CL+0..+3 liegt).
Fenster [CL−20 .. CL−15] vergibt systematisch XP-lose Ziele.

- **`TOWER_TASK_LEVEL_MAX_UNDER: 20 → 12.`** Bei Stil-Skill ≤ CL+3 liegt damit JEDES
  Turm-Ziel über der Null-Schwelle → 0 % „too weak"-Ziehungen (Korveth-Fall: Fenster-lo 84 >
  Cutoff 82). Pool-Sicherheit: `stretchLevelWindow` (Mindest-Pool 4) darf die Kante wie
  bisher notfalls wieder senken — Härte ist Default, nie Sackgasse.
- **NEU `TOWER_TASK_LEVEL_MAX_OVER = 10`** (Turm-Oberkante CL+10 statt Welt-+8): nötig, damit
  Etage 7 (L104–108) am Cap (CL 99 → hi 109) voll ziehbar ist; +10 im SL-gegateten,
  konter-gestützten Turm ist vertretbar (Welt bleibt bei +8).
- Die XP-Schwellen-Kopplung („Fenster zusätzlich an XP-Schwelle koppeln") ist damit
  IMPLIZIT über die Kanten-Arithmetik gelöst — kein zweiter Mechanismus nötig (KISS).

### 6.2 Gefahrenzulage (konservativ, Ø-neutral)

Dritter Faktor in `scaledTaskPoints` (nach basePoints × Größen-Skalierung ±27 %):

| Ziel-Level vs. CL | Multiplikator |
|---|---|
| ≥ CL+4 | ×1,15 |
| CL−7 .. CL+3 | ×1,00 |
| ≤ CL−8 | ×0,85 |

Kaufmännisch gerundet, min 1. Wirkung: Welt-Tasks (immer CL+1..+8) pendeln um ×1,0–1,15;
Turm-Alt-Etagen zahlen leicht weniger; Etage-7-/Elite-Ziele fühlbar mehr. Erwartung
Ø ≈ 1,00 ± 0,05 über die reale Ziehungsverteilung — hartes Gate in der Verifikation (§7.4),
damit die sweep6-batchE-Preiskalibrierung nicht entwertet wird. Bewusst KEINE ×0- oder
×0,5-Stufe (Vesnas Originalvorschlag) — der 0,85er-Fall wird durch die neue Unterkante
ohnehin selten; die Zulage ist Würze, keine zweite Ökonomie.

---

## 7. Sim-Verifikationsplan (für die Umsetzungs-Welle)

1. **Ziehungsverteilung** (Muster: Vesna-Wegwerf-Harness): je 500 Ziehungen auf 4 Ständen
   (CL 30/SL 24 · CL 55/SL 50 · CL 82/SL 81 · CL 96–99/SL 97–99). Gates:
   Elite-Anteil 8–12 % der Turm-Tasks · kein Einzel-Monster > 15 % aller Ziehungen ·
   0 % Ziele unter der Kampf-XP-Null-Schwelle des Stil-Skills · Turm/Welt 45–55 % ·
   Etage 6+7 zusammen ≥ 40 % der Turm-Ziehungen am Cap.
2. **TTK-Korridore je Etage** (simulateCombat, Gate-Level-Loadout = Craft-Gear des typischen
   CL bei Gate-Ankunft, §1.2, mit Food): Reguläre 5–15 s, Etage 6/7 10–25 s,
   Elites 25–60 s; Todesrate < 5 %. Und: `pnpm test`-Sim-Block weiterhin 0 echte Walls,
   **Bronze-Baseline exakt die 5 bekannten Flags** (F1-Poison-Neuzugänge dürfen die
   Baseline nicht kippen — falls doch: Chance −10 pp statt Magnitude-Senkung).
3. **Konter-Item-Delta**: jeder Signatur-Träger mit/ohne Item: ohne Item eff. HP-Zufluss
   +15–35 % ggü. mit Item, Todesrate ohne Item ≤ 15 % am Gate-Loadout, 0 unbesiegbare Fälle.
4. **Punkte-Ökonomie**: 2.000-Task-Monte-Carlo je Stand: Ø-Pkt/Task 4,8–5,3 (heute ≈ 5,0);
   Pkt/h end 33–42. Erwartungs-Stunden der Unique-Tabelle (§4.3) aus den GEMESSENEN
   Elite-Kills/h neu ausrechnen und die Tabelle im Doc nachziehen.
5. **Guards**: tower-monsters.test.ts (Klon-Loot-Parität — gilt für die neuen F6-Klone!),
   status-coverage (neue Inflicts), wiring-audit (neue Items in Loot/Shop referenziert),
   Determinismus-Tests der Assign-RNG (gewichtetes Los ändert Draw-Folge → Fixtures anpassen).

---

## 8. Apply-Liste (geordnet; NICHTS davon durch mich — Freigabe Chef → CEO → Teams)

1. **logic-dev (engine/slayer.ts + shared, kein State):** `TOWER_TASK_LEVEL_MAX_UNDER 20→12`,
   neue Konstante `TOWER_TASK_LEVEL_MAX_OVER = 10`, gewichtetes Kandidaten-Los
   (`slayerElite.taskWeight`), `taskAmount`-Override + `pointsMult` beim Assign,
   Gefahrenzulage in `scaledTaskPoints`, `SLAYER_TOWER_FLOOR_THRESHOLDS` → `[1,20,40,60,80,90,99]`.
2. **combat-dev (engine/combat.ts):** Soft-Konter-Hook im `monsterInflict`-Pfad
   (Requirement-Besitz ⇒ Inflict unterdrückt); `canFightMonster`-Klausel-Umbau
   (Requirement raus, optional Elite-Task-Gate rein) — nach O-1/O-2-Entscheid.
3. **content-dev (Welle 1 — Bestand):** 3 Mikro-Umlevel (§1.3), Signatur-Inflicts
   (§2.2-Tabelle: shambling/hollow_marrow poison, forge_demon/sorrow_wraith/soul_flayer
   Magnituden, abyssal_devourer shock).
4. **content-dev (Welle 2 — Neu):** Etage 6/7 (Floors + 7 Monster, §1.4), 7 Elites (§3.1),
   9 Elite-Uniques + 3 Shop-Chase-Items (§4.2/§4.4, Chancen als Dezimal aus den %-Angaben),
   Shop-Einträge. Item-Namen/Beschreibungen aus der lore-dev-Lieferung.
5. **asset-integrator:** Art-Duplikate/Aliase für Elites + asc_*-Varianten; Chef-Art-Gap-Report
   (erwartet: nur warden_f7 + bekannt iron_sentinel/mire_wisp).
6. **ui-dev (klein):** Elite-Task-Kennzeichnung auf dem Zettel („WÄCHTER"-Ribbon + ×2-Pkt
   sichtbar); Konter-Item-Hinweis auf der Monsterkarte („Signatur wird durch X neutralisiert").
7. **kontrolleur:** Verifikationsplan §7 komplett fahren, danach Fun-Retest Vesna R4.

## 9. Offene Chef-Entscheidungen

- **O-1 — Hard-Block → Soft-Konter (§2.2):** kehrt die dokumentierte Hard-Block-Entscheidung
  um. Ohne GO bleibt alles Schlüssel-Modell; Signatur-Retunes (§2.2-Tabelle) lohnen trotzdem.
- **O-2 — Elite nur mit aktivem Task bekämpfbar?** Empfehlung JA (Prestige + kalkulierbare
  Chase-Zeiten). Bei NEIN: Drop-Chancen ÷ 20 (§4.3).
- **O-3 — 7-Etagen-Layout 1/20/40/60/80/90/99** inkl. SL-99-Gate als Endcap: bestätigen.
- **O-4 — 1 neues Monster-Art** (warden_f7, Etage-7-Wächter als einziges neues Art-Asset) —
  liefern oder E7 vorerst per Alias (asc-Art) starten?
- **O-5 — Shop-Chase-Slots** Stiefel/Cape/Amulett und godly-Rarität am 4.000er: bestätigen
  (Alternativen: Offhand statt Stiefel; Preisband 1.500–4.000 verhandelbar).
- **O-6 — Gefahrenzulage** ×0,85/×1,0/×1,15: bestätigen (bewusst konservativer als Vesnas
  ×0,5-Vorschlag).
