# Slayer-Aufträge 1.1.0: Ist-Analyse, Chef-Fall, Vorschlag „Brennas Stufen"

Stand 2026-08-25, balance-designer. Reines Design-Dokument: keine Content- oder Engine-Änderung.
Zahlen aus `assignTask` (1000 seeded Vergaben je Konfiguration) und `simulateCombat`
(1 h Spielzeit je Monster, stufengerechtes Nahkampf-Kit: Platte + Schild + Mittelklasse-Essen,
keine Runen/Suffixe/Tränke, also die konservative Untergrenze eines echten Spielers).

Chef-Meldung: „Combat 40, Slayer 28, kriege Tasks für Level-19-Goblins, die ich 1-hitte."

---

## 1. Ist-Analyse: So entsteht heute ein Auftrag

1. Es gibt genau EINEN Meister (`brenna_ashwick`, Content `slayerMasters`), sofort verfügbar
   (Unlock CL 1 / SL 1); sein `taskPool` ist leer, weil die Monsterwahl in der Engine
   (`packages/engine/src/slayer.ts`, `assignTask` + `worldTaskMonsters`) dynamisch läuft.
2. Erster Würfel: mit `towerTaskChance` 0,5 wird ein Turm-Auftrag, sonst ein Welt-Auftrag
   gezogen; beide Pfade hängen ausschließlich am **Combat-Level** (`combatLevel(state)`,
   Formel in `dungeon.ts`), das **Slayer-Level** bestimmt nur, welche Turm-Etagen offen sind
   (SL 1/20/40/60/80) und ob der Skip gratis ist (unter SL 10).
3. Welt-Pfad: alle Welt-Monster (keine Turm-, Dungeon- oder `dg_`-Zwillinge, Zone per Quest
   offen, Slayer-Anforderung erfüllt) mit Level in **[CL+1 .. CL+8]**; liegen weniger als 4
   Kandidaten im Fenster, wird es per `stretchLevelWindow` **erst nach UNTEN**, dann nach oben
   gestreckt, bis 4 drin sind (`SLAYER_MIN_TASK_POOL`).
4. Turm-Pfad: Monster der freigeschalteten Etagen mit Level in **[CL−20 .. CL+8]**
   (`TOWER_TASK_LEVEL_MAX_UNDER` = 20), gleiche 4er-Streckung, Etagen-Los gewichtet nach
   Kandidatenzahl; ohne Turm-Kandidaten Fallback auf Welt.
5. Menge N = `nextInt(15, 50)` (flach, unabhängig vom Monster), Punkte =
   `scaledTaskPoints` = 5 · (0,5 + 0,5 · N/32,5), also 4 bis 6 Punkte, Slayer-XP je Kill =
   round(monster.xp · 0,5) plus derselbe Betrag · N als Abschlussbonus; Skip kostet 20 Punkte
   (gratis unter SL 10 oder mit Trophäenwand III einmal täglich), Streak-Boni alle 5/10 Tasks.

Kernproblem in einem Satz: Die Untergrenze ist am Turm 20 Level unter dem Spieler, an der
Welt streckt der Pool nach unten, und Belohnung wie Menge kennen die Schwierigkeit nicht.

---

## 2. Chef-Fall nachgerechnet (1000 Vergaben, `state.rng` seeded)

Annahme: Grenzland + Aschefelder offen (chronicle_03/04), keine Slayer-Gate-Items in Besitz.
Ergebnisse mit Gate-Items und/oder Dornwald stehen darunter.

| Konfiguration | Anteil L15/L19-Goblins | Anteil unter CL | Anteil in [CL, CL+8] | Pool |
|---|---|---|---|---|
| CL 40 / SL 28 (exakt) | **0 %** | **75,9 %** | 24,1 % | dust_vulture 34, bone_stalker 34, tsk_warrior 36, mire_crawler 38, ashfield_wraith 38, tsk_archer 38, pitch_beetle 42, ash_tyrant 45 |
| CL 39 / SL 28 | **10,0 %** (tower_goblin_rogue L19) | 65,9 % | 24,1 % | wie oben + tower_goblin_rogue |
| CL 35 / SL 28 | **17,3 %** (tower_goblin L15 + rogue L19) | 32,0 % | 50,7 % | |
| CL 30 / SL 20 | **17,3 %** | 0 % | 82,7 % | |
| CL 20 / SL 10 | 26,7 % unter CL−10 (rot_rat L3, plague_grub L7) | 52,6 % | 47,4 % | |
| CL 40 / SL 28 + Gate-Items | 0 % (aber 16,3 % L22/L28: gaze_basilisk, wailing_shade) | 59,6 % | 24,1 % | |
| CL 40 / SL 28 + Dornwald | 0 % | 52,6 % | 47,4 % | |

Lesart: Bei exakt CL 40 kann der heutige Code keinen L19-Goblin vergeben; auf dem Weg dorthin
(CL 35 bis 39) ist jeder sechste bis zehnte Auftrag ein Turm-Goblin (Unterkante CL−20 =
15..19). Der Auftrag, den der Chef gerade sieht, stammt aus dieser Phase oder lag länger im
Save. Wichtiger als der Einzelfall: **auch bei exakt CL 40 liegen drei von vier Aufträgen unter
dem Kampf-Level**, weil die Aschefelder bei L45 enden und die Streckung nach unten läuft.

Kill-Zeit-Referenz (Mithril-Kit, CL 40): tower_goblin_rogue L19 = 8,0 s/Kill, 0 Tode/h
(der „1-Hit"); pitch_beetle L42 = 17 s, 24 Tode/h; rootling_gimp L48 = 17 s, 32 Tode/h;
thorn_wolf L54 = 30 s, 64 Tode/h; rootling_treemonster L62 = 144 s, 89 Tode/h.

Weitere Systembefunde derselben Messreihe:
- CL 99 / SL 99 (alle Zonen): 90 % der Aufträge unter CL (Pool L82..104). Monster L112 bis
  310 (Küste, Schlackengrube, Hochland) sind heute **nie** Slayer-Ziel, weil das Fenster bei
  CL+8 = 107 endet.
- CL 70 / SL 60: 60 % unter CL; Etage-3-Turmmonster L50..56 (6,9 s/Kill) sind noch im Pool.
- Punkte/h heute (Kit-Untergrenze, ohne Tod-Pausen): CL 20 = 49,5; CL 40 = 39..41; CL 70 =
  39,4; CL 90 = 40,9; CL 99 = 35,5. Das deckt sich mit der Shop-Kalibrierung (35..50 Pkt/h).

---

## 3. Vorschlag: „Brennas Stufen" (Jagd / Kopfgeld / Blutjagd)

**Entscheidung:** Ein Ziel-Fenster relativ zum Combat-Level mit harter Untergrenze, drei vom
Spieler wählbare Auftragsstufen mit eigenen Fenstern, Mengen und Punkten, freigeschaltet über
das Slayer-Level; Turm-Chance und Streak bleiben, wie sie sind.

Begründung in acht Sätzen:
1. Das Combat-Level ist die einzige Größe, die tatsächlich beschreibt, was der Spieler
   besiegen kann; das Slayer-Level hinkt ihm typischerweise hinterher (Chef: 28 zu 40) und
   taugt darum nicht als Fensterbasis, sehr wohl aber als Freischaltung für härtere Stufen.
2. Eine harte Untergrenze (Normal nie unter CL−3, Turm-Pfad ohne eigene Streckung) beseitigt
   den Chef-Fall strukturell, nicht nur den einen Konstantenwert; das Turm-Fenster CL−20 war
   die konkrete Ursache der L19-Goblins.
3. Spielerwahl statt Auto-Eskalation, weil die Sim zeigt, dass schon CL+8 mit stufengerechtem
   Kit 25 bis 35 Tode/h kostet: Wer idle laufen lässt, braucht die „Jagd", wer Herausforderung
   will, nimmt „Kopfgeld" oder „Blutjagd" bewusst und mit Proviant.
4. Die Streckrichtung wird zur Stufeneigenschaft: Jagd streckt zuerst nach unten (idle-sicher),
   Kopfgeld und Blutjagd zuerst nach oben (Herausforderung), und genau dadurch erreichen die
   harten Stufen am Level-Cap ohne Sonderregel das Gear-Band (L104..138), das heute
   unerreichbar ist.
5. Gewichtung nach oben innerhalb des Fensters (Faktor 1 bis 2) macht aus „irgendwo im
   Fenster" ein „meist am oberen Rand", ohne den Pool zu verkleinern.
6. Mengen sinken mit der Stufe (20–40 / 15–30 / 12–24), weil ein Kill dort 1,3- bis 3,7-mal
   länger dauert; Punkte steigen (5 / 7 / 10), sodass der Punkte-pro-Kill-Wert um 1,9× bzw.
   4× steigt und die Stufe sich auch mit der Kit-Untergrenze meist lohnt.
7. Alles nutzt vorhandene Elemente (Monster-Level, Zonen-Gates, Etagen-Gates, Slayer-Punkte,
   Streak, Skip, `enqueueFightAtFront` für „Zum Monster"); es kommen keine neuen Systeme, keine
   Level-Locks und keine neuen Währungen hinzu.
8. Ein SL-getriebener „Reach" tief ins Gear-Band (bis L190/234) wurde geprüft und verworfen:
   mit Kit-Untergrenze ergab er 3- bis 6-Stunden-Aufträge mit 40 bis 180 Toden (deep_kraken
   L150 = 0 Kills/h), die 4er-Streckung nach oben liefert dieselbe Reichweite dosiert.

### 3.1 Stufen-Tabelle (Content: `brenna_ashwick.taskTiers`)

| id | Name DE / EN | Unlock SL | Fenster (Monster-Level) | Streckung (bis Min. 4 Kandidaten) | Harte Untergrenze | N | basePoints | xpMult (Abschlussbonus) |
|---|---|---|---|---|---|---|---|---|
| `normal` | Jagd / Hunt | 1 | [CL−3, CL+6] | erst runter, dann rauf | CL−8 | 20–40 | 5 | 1,00 |
| `hard` | Kopfgeld / Bounty | 15 | [CL+3, CL+12] | erst rauf, dann runter | CL+0 | 15–30 | 7 | 1,25 |
| `deadly` | Blutjagd / Blood Hunt | 40 | [CL+8, CL+18] | erst rauf, dann runter | CL+3 | 12–24 | 10 | 1,50 |

Unverändert: `towerTaskChance` 0,5, `skipCost` 20 (Gratis-Gnade unter SL 10, Tages-Gratis-Skip
Trophäenwand III), Streak-Regeln, Pro-Kill-Slayer-XP = round(monster.xp · 0,5), Punkte-Boni
(Meisterring, Trophäenwand, Klemme ×1,5), Shop-Preise.

Entfällt: `WORLD_TASK_LEVEL_MIN_OVER`, `WORLD_TASK_LEVEL_MAX_OVER`, `TOWER_TASK_LEVEL_MAX_UNDER`,
`master.taskAmount` / `master.basePoints` (werden zu Stufen-Feldern; Engine-Fallback siehe 3.3).

### 3.2 Vergabe-Regeln (Pseudocode, 1:1 umsetzbar)

```
assignTask(state, content, masterId, tierId):
  if state.slayerTask: return null
  master = verfügbarer Master (wie heute)
  tier   = master.taskTiers.find(id == tierId)          // fehlt taskTiers → Default-Stufe (3.3)
  if getSlayerLevel(state) < tier.unlockSlayerLevel: return null   // UI zeigt Button gesperrt

  cl = combatLevel(state)
  lo = cl + tier.levelLo,  hi = cl + tier.levelHi,  floor = cl + tier.levelFloor

  // Kandidaten wie heute filtern: keine dungeonOnly, keine dg_-Zwillinge, Zone offen
  // (isZoneUnlocked), Slayer-Anforderung erfüllt (slayerRequirementMet), Turm nur aus
  // freigeschalteten Etagen (unlockedTowerFloors).
  world = Welt-Kandidaten,  tower = Turm-Kandidaten

  // Welt-Pfad: Fenster strecken, bis ≥ SLAYER_MIN_TASK_POOL (4) Welt-Kandidaten drin sind.
  //   stretchUpFirst=false (Jagd):  lo-- bis floor, dann hi++ bis maxLevel(world)
  //   stretchUpFirst=true  (Kopfgeld/Blutjagd): hi++ bis maxLevel(world), dann lo-- bis floor
  //   (Reihenfolge ist die einzige Änderung an stretchLevelWindow: neuer Parameter upFirst
  //    + neuer Parameter floor; die Funktion bleibt rein und testbar.)
  worldPool = world mit level in [lo, hi]

  // Turm-Pfad: KEINE eigene Streckung. Nur Turm-Kandidaten im (gestreckten) Fenster.
  towerPool = tower mit level in [lo, hi]

  // Fallback nur für die Stufe "normal": beide Pools leer → die 4 höchststufigen
  // bekämpfbaren Monster überhaupt (Welt ∪ Turm), Flag task.fallback = true (UI-Hinweis:
  // „Brennas Beute liegt unter dir. Öffne neue Gebiete."). Härtere Stufen ohne Kandidaten
  // → return null, die UI zeigt die Stufe als „in deinen Landen nicht verfügbar".
  if worldPool leer und towerPool leer:
     if tier.id != "normal": return null
     pool = top4ByLevel(world ∪ tower); fallback = true
  else:
     // 1. Würfel: Typ (immer ziehen, Determinismus)
     isTower = nextFloat(rng) < master.towerTaskChance
     if isTower and towerPool leer: isTower = false
     if !isTower and worldPool leer: isTower = true
     pool = isTower ? towerPool : worldPool

  // 2. Würfel: gewichtetes Los, Gewicht 1..2 linear über das Fenster (nach oben schwerer)
  w(m) = 1 + clamp((m.level − lo) / max(1, hi − lo), 0, 1)
  r = nextFloat(rng) · Σ w ;  monster = erstes m mit (r −= w(m)) < 0

  // 3. Würfel: Menge
  N = nextInt(rng, tier.taskAmount.min, tier.taskAmount.max)

  mid         = (tier.taskAmount.min + tier.taskAmount.max) / 2
  pointReward = max(1, round(tier.basePoints · (0.5 + 0.5 · N / mid)))       // wie scaledTaskPoints
  xpReward    = round(monster.xp · SLAYER_XP_KILL_FACTOR · N · tier.xpMult)  // Abschlussbonus

  state.slayerTask = { masterId, monsterId, isTower, required: N, progress: 0,
                       xpReward, pointReward, tier: tier.id, fallback }
```

Genau 3 RNG-Züge auf jedem Pfad (Typ, Monster, Menge); heute sind es 3 (Welt) bzw. 4 (Turm).
`recordKillForSlayer`, `skipTask`, Streak, Punkte-Boni: unverändert. `enqueueFightAtFront`
(„Zum Monster") funktioniert wie heute; Turm-Ziele sind per Konstruktion freigeschaltet.

Beispiel Chef (CL 40, SL 28, nur Aschefelder, keine Gate-Items):
- Jagd: Fenster [37..46], Welt = mire_crawler 38, pitch_beetle 42, ash_tyrant 45 (3 < 4 →
  lo runter bis 34: + dust_vulture); Turm im gestreckten Fenster [34..46] = bone_stalker 34,
  tsk_warrior 36, ashfield_wraith 38, tsk_archer 38. Niedrigstes mögliches Ziel L34 (CL−6),
  Schwerpunkt L42..45 durch die Gewichtung. Kein Goblin mehr, in keiner Phase.
- Kopfgeld: [43..52] → ash_tyrant 45 (+ hi rauf: nichts über 45 in offenen Zonen; lo runter bis
  40: pitch_beetle 42) → Pool {42, 45}. Verfügbar, aber klein: der Chef ist quest-seitig hinter
  seinem Kampf-Level (Dornwald L45..65 hängt an chronicle_07), siehe Nebenbefund 7.1.
- Blutjagd: gesperrt bis SL 40.

Beispiel CL 39 / SL 28 (die Phase, in der der L19-Goblin entstand): Jagd [36..45] → 0 %
Turm-Goblins (heute 10 %).

### 3.3 Content-Shape und Engine-Fallback

```ts
// shared
export type SlayerTaskTierId = "normal" | "hard" | "deadly";
export interface SlayerTaskTierDef {
  id: SlayerTaskTierId;
  unlockSlayerLevel: number;      // 1 / 15 / 40
  levelLo: number;                // −3 / 3 / 8   (relativ zu CL)
  levelHi: number;                //  6 / 12 / 18
  levelFloor: number;             // −8 / 0 / 3   (harte Untergrenze der Streckung)
  stretchUpFirst: boolean;        // false / true / true
  taskAmount: { min: number; max: number };   // 20–40 / 15–30 / 12–24
  basePoints: number;             // 5 / 7 / 10
  xpMult: number;                 // 1 / 1.25 / 1.5
}
// SlayerMasterDef: + taskTiers?: SlayerTaskTierDef[]  (taskAmount/basePoints bleiben als
// Legacy-Felder erlaubt; fehlt taskTiers, baut die Engine EINE Stufe "normal" daraus:
// levelLo −3, levelHi 6, levelFloor −8, stretchUpFirst false, xpMult 1 → Test-Fixtures laufen weiter)
// SlayerTask: + tier: SlayerTaskTierId; + fallback?: boolean
```

Spielertexte (Vorschlag, je maximal ein Gedankenstrich):
- Buttons: „Jagd" / „Kopfgeld (ab Slayer 15)" / „Blutjagd (ab Slayer 40)"; EN „Hunt" /
  „Bounty (Slayer 15)" / „Blood Hunt (Slayer 40)".
- Tooltip je Stufe: „Ziele Stufe {lo} bis {hi}, {min} bis {max} Kills, {pts} Punkte".
- Brenna, Jagd: „Solide Beute, {name}. Nichts, was dich überrascht." / „Solid prey, {name}.
  Nothing that will surprise you."
- Brenna, Kopfgeld: „Kopfgeld heißt: die Beute wehrt sich. Pack Proviant ein." / „Bounty work
  means the prey fights back. Pack provisions."
- Brenna, Blutjagd: „Blutjagd. Wenn du zurückkommst, reden wir über Ruhm." / „Blood hunt. If you
  come back, we talk about glory."
- Stufe nicht verfügbar: „In deinen Landen gibt es dafür keine Beute. Öffne neue Gebiete." /
  „Your lands hold no such prey. Open new ground."
- Fallback-Hinweis (nur Jagd): „Brennas Beute liegt unter dir. Öffne neue Gebiete." / „Brenna's
  prey is beneath you. Open new ground."

---

## 4. Save-Folgen und Guard-Tests

**SAVE_VERSION 82 → 83 (Pflicht):** `SlayerTask` bekommt das neue Pflichtfeld `tier` (plus
optionales `fallback`). Ein persistiertes Objekt mit neuem Pflichtfeld ist per Save-Gesetz ein
Bump, auch wenn der Lesepfad mit `?? "normal"` überleben würde.

Migration (persistence, idempotent):
- `if (state.slayerTask && state.slayerTask.tier === undefined) state.slayerTask.tier = "normal"`.
- Laufende Alt-Aufträge behalten Monster, N, Fortschritt, xpReward, pointReward (Bestandsschutz:
  ein laufender L19-Goblin-Auftrag ist ein letztes Mal abschließbar oder wie bisher skipbar;
  keine kostenlose Annullierung, weil Spieler mit 40/43 Fortschritt sonst verlieren).
- `sanitizeState`: `tier` nicht in {"normal","hard","deadly"} → "normal"; `fallback` → boolean.
- Kein neues Zählerfeld, keine Änderung an `slayerPoints`, `slayerStreak`, `slayerFreeSkipDay`.
- Kompat-Vault: v82-Fixture mit aktivem Task OHNE `tier` (lädt als "normal", alle Felder
  erhalten) und neues v83-Fixture mit `tier: "deadly"` vor dem Depot-Upload.

Guard-Tests (engine `slayer.test.ts`, persistence, content-integrity, balance-envelope):
1. **Härte-Guard (Chef-Regression):** für CL 5..99 (Schritt 1), SL = CL und SL = max(1, CL−12),
   alle Zonen + Gate-Items: je 200 Vergaben pro Stufe → Monster-Level ≥ CL + levelFloor der
   Stufe, immer; bei CL 30..39 / SL 20..28 mit nur chronicle_03/04 nie `tower_goblin*`.
2. **Turm ohne Streckung:** Turm-Ziel liegt immer im (gestreckten) Stufenfenster, nie darunter.
3. **Nie leer (Jagd):** jede Kombination aus CL, SL, Zonen-Set → `assignTask(.., "normal")`
   liefert einen Task, solange irgendein bekämpfbares Monster existiert; Fallback-Flag genau
   dann gesetzt, wenn beide Pools leer waren.
4. **Stufen-Gate:** Kopfgeld unter SL 15 und Blutjagd unter SL 40 → null, kein RNG-Zug,
   kein State-Effekt.
5. **RNG-Disziplin:** genau 3 `state.rng`-Züge je erfolgreicher Vergabe (beide Pfade), 0 bei
   Ablehnung.
6. **Belohnungsmathematik:** N am Spannen-Mittel → pointReward == basePoints exakt;
   xpReward == round(xp · 0,5 · N · xpMult); Gewichtung: im 4er-Pool [lo, .., hi] ist das
   höchste Monster ~2× so häufig wie das niedrigste (10 000 Züge, Toleranz ±10 %).
7. **Persistenz:** v82-Task ohne tier → "normal" und feldidentisch; korrupter tier-String →
   "normal"; Roundtrip v83.
8. **Content-Integrität:** genau ein Master, `taskTiers` mit ids normal/hard/deadly, Unlocks
   aufsteigend, levelLo < levelHi, levelFloor ≤ levelLo, basePoints und Punkte/Kill
   (basePoints/mid) streng steigend, Punkte/Kill Kopfgeld ≥ 1,8× und Blutjagd ≥ 3× Jagd.
9. **Ökonomie-Hülle (balance-envelope):** Monte-Carlo wie in Abschnitt 5 mit Kit-Untergrenze:
   Jagd 30..50 Pkt/h bei CL 20/40/70/90 (alle Zonen), Katalog gesamt (2368 Pkt) in 45..80 h.
10. **UI-Vertrag:** SlayerPage ruft `assignTask` mit tierId; gesperrte Stufen deaktiviert mit
    Unlock-Hinweis; aktiver Task zeigt Stufen-Abzeichen (ui-dev, Screenshot-Sweep de/ru).

---

## 5. Punkte-Ökonomie: Shop weder explodiert noch verhungert

Messung: 1000 Vergaben je Zelle, Kill-Zeiten aus `simulateCombat` (Kit-Untergrenze, s. o.),
„+Tod" = zusätzlich 20 s Queue-Pause je Tod. Der Monte-Carlo hat Welt und Turm als EINEN
gewichteten Pool gezogen (Turm-Anteil also proportional statt 50 %); da Turm-Monster schneller
sterben, liegen die realen Werte des Vorschlags eher etwas höher als in der Tabelle.

### 5.1 Punkte pro Stunde (rein / +Tod), Tode je Auftrag, Minuten je Auftrag

| CL / SL / Zonen | Heute | Jagd | Kopfgeld | Blutjagd |
|---|---|---|---|---|
| 20 / 15 / Grenzland | 49,5 / 45,5 · 1,6 T · 6,1 min | 47,3 / 45,9 · 0,6 T · 6,4 min | 59,8 / 49,2 · 4,5 T · 7,0 min | gesperrt |
| 40 / 28 / bis Aschefelder (Chef) | 39,2 / 35,1 · 2,7 T · 7,7 min | 30,9 / 26,4 · 5,1 T · 9,8 min | 41,1 / 33,5 · 6,9 T · 10,2 min | gesperrt |
| 40 / 40 / bis Dornwald + Gate-Items | 40,6 / 35,7 · 3,1 T · 7,4 min | 37,0 / 32,0 · 3,9 T · 8,2 min | 71,1 / 59,4 · 3,5 T · 5,9 min | 93 / 71 · 6,0 T · 8,5 min |
| 70 / 60 / bis Wildwald | 39,4 / 37,7 · 1,0 T · 7,6 min | 41,9 / 40,4 · 0,8 T · 7,2 min | 40,0 / 36,0 · 3,5 T · 10,5 min | 38 / 30 · 12,9 T · 20,1 min |
| 90 / 80 / bis Hochland | 40,9 / 40,3 · 0,3 T · 7,4 min | 36,6 / 36,1 · 0,4 T · 8,3 min | 56,2 / 53,5 · 1,1 T · 7,4 min | 43 / 37 · 7,0 T · 16,3 min |
| 99 / 99 / alle | 35,5 / 35,2 · 0,2 T · 8,5 min | 32,2 / 31,6 · 0,6 T · 9,4 min | 29,2 / 26,0 · 5,3 T · 14,3 min | 45 / 39 · 6,2 T · 15,4 min |

(Blutjagd-Zellen aus den gemessenen Kill-Zeiten auf N 12–24 / 10 Punkte umgerechnet; der Lauf
selbst lief mit 10–20 / 9.) Durchschnittliches Ziel-Level je Stufe bei CL 40 (Dornwald):
Heute 40,5 (39 % unter CL), Jagd 42,3 (30 % unter CL, alles ≥ 37), Kopfgeld 47,8, Blutjagd
53,7 (0 % unter CL). Bei CL 90: Heute 87,8 (32 % unter CL), Jagd 92,0, Kopfgeld 98,9,
Blutjagd 117,5 (Gear-Band erreicht: wild_stag 104, dire_wolf 112, mud_crab 120, reef_drowned 128).

Einordnung:
- **Jagd** bleibt in der heutigen Hülle (32..47 Pkt/h gegen 35..50 heute); einziger Ausreißer
  ist der quest-rückständige Chef-Fall (30,9, weil ash_tyrant L45 als einziges Ziel über CL 40
  28 % Gewicht bekommt). Der Shop (kalibriert auf 35 Pkt/h END-Rate) verhungert nicht.
- **Kopfgeld / Blutjagd** zahlen mit Kit-Untergrenze 0,95× bis 1,9× bzw. 0,9× bis 2,5× der
  Jagd; mit echtem Kit (Runen, Suffixe, Tränke) wächst die Prämie, weil Punkte/Kill fix sind
  und die Kill-Zeit fällt. Die Prämie ist am größten bei CL 40, wo der Shop per SL-Gate nur
  Gate-Items und den Draught/Elixier hergibt (Helm SL 80, Amulett SL 70, War Brew SL 70); am
  Level-Cap liegt sie bei 1,2× bis 1,4×. Der Shop explodiert nicht.
- Slayer-XP/h: Jagd 12,5k (CL 20) → 26k (CL 40) → 144k (CL 70) → 314k (CL 90); harte Stufen
  liegen wegen längerer Kills pro Stunde meist darunter (Kopfgeld CL 90: 222k), der xpMult
  gleicht das nur teilweise aus. Das ist gewollt: Punkte sind die Prämie der harten Stufen,
  Slayer-XP kommt aus Masse.

### 5.2 Stunden je Kauf (Shop-Preise unverändert)

| Kauf (Preis, SL-Gate) | Heute CL 20 | Jagd CL 20 | Heute CL 40 | Jagd CL 40 | Kopfgeld CL 40 | Heute CL 70 | Jagd CL 70 | Blutjagd CL 70 | Heute CL 90 | Jagd CL 90 | Kopfgeld CL 90 | Blutjagd CL 90 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ear_plugs (18, SL 15) | 0,4 h | 0,4 h | | | | | | | | | | |
| mirror_ward (25, SL 15) | 0,5 h | 0,5 h | | | | | | | | | | |
| slayer_hunters_elixir (28, SL 40) | | | 0,7 h | 0,8 h | 0,4 h | | | | | | | |
| soul_veil (55, SL 40) | | | 1,4 h | 1,5 h | 0,8 h | | | | | | | |
| void_anchor (100, SL 60) | | | | | | 2,5 h | 2,4 h | 2,6 h | | | | |
| slayer_vambraces (320, SL 50) | | | | | | 8,1 h | 7,6 h | 8,4 h | | | | |
| slayer_war_brew (110, SL 70) | | | | | | | | | 2,7 h | 3,0 h | 2,0 h | 2,6 h |
| slayer_amulet (520, SL 70) | | | | | | | | | 12,7 h | 14,2 h | 9,3 h | 12,1 h |
| slayer_helm (650, SL 80) | | | | | | | | | 15,9 h | 17,8 h | 11,6 h | 15,1 h |
| Katalog gesamt (2368) | 48 h | 50 h | 58 h | 64 h | 33 h | 60 h | 57 h | 62 h | 58 h | 65 h | 42 h | 55 h |

Kalibrierziel aus dem Shop-Kommentar (Helm 15..20 h, Katalog 60..80 h) wird von der Jagd
getroffen (17,8 h / 65 h) und von den harten Stufen am Level-Cap um 10 bis 30 % unterboten,
was genau die gewollte Risiko-Prämie ist. Keine Preisänderung im `slayerShop` nötig.

Querverweis `design/slayer-shop-1.1.0.md` (Shop-Audit vom selben Tag): dessen Planungsrate
30/35/40 Pkt/h deckt sich mit der Jagd-Spalte; die dort vorgeschlagenen Preisänderungen
(Armschienen 320 → 260, Draught-Gate SL 1 → 20, Knochenfragment/Schmiedeglut gestrichen)
verschieben hier nur die Armschienen-Zeile auf 6,6 / 6,2 / 6,8 h (CL 70: Heute / Jagd /
Blutjagd). Beide Vorschläge sind unabhängig anwendbar; die Fenster-Zeile in dessen §1.1
(„Welt CL+1..+8, Turm CL−20..+8") ist nach dieser Welle durch Tabelle 3.1 zu ersetzen.

---

## 6. Drei Alternativen (verworfen)

1. **Ein-Konstanten-Fix:** `TOWER_TASK_LEVEL_MAX_UNDER` 20 → 3 und Welt-Streckung nach oben
   zuerst. Beseitigt die L19-Goblins, lässt aber flache Punkte, flache Mengen, 50 bis 76 %
   Aufträge unter CL bei gesperrten Zonen und das unerreichbare Gear-Band bestehen.
2. **Auto-Eskalation über die Streak:** jeder dritte Auftrag automatisch „hart", ohne Wahl.
   Nimmt dem Idle-Spieler die Kontrolle, erzwingt bei schwachem Kit Skips für 20 Punkte und
   bringt die Früh-Sackgasse aus Sweep 6 zurück.
3. **Slayer-Level als Fensterbasis plus SL-„Reach" ins Gear-Band:** Fenster an SL statt CL,
   obere Kante wächst mit SL bis L190/234. Da SL hinter CL herläuft, würden Aufträge noch
   niedriger, und der Reach erzeugte gemessen 3- bis 6-Stunden-Aufträge mit 40 bis 180 Toden.

(Meister-Ränge nach OSRS-Muster mit mehreren Meistern: verworfen, weil der Chef am 2026-06-29
auf einen Meister konsolidiert hat und die Stufen dieselbe Leiter ohne neue Meister, Porträts
und Texte in sieben Sprachen liefern.)

---

## 7. Nebenbefunde (außerhalb dieses Vorschlags)

1. **Quest-Tempo der Zonen:** Ein CL-40-Spieler, der noch vor chronicle_07 (Dornwald) steht,
   hat oberhalb von L45 kein Ziel; Kopfgeld schrumpft auf 2 Monster. Prüfen, ob chronicle_07
   spätestens um CL 36..38 erreichbar ist (lore-dev / Quest-Pacing).
2. **Turm-Etage 3 zu leicht pro Level:** slag_abomination L44 (24 HP), cinder_wretch L48
   (25 HP), tower_ember_elemental L50 (28 HP) sterben in 7..11 s, Weltmonster gleicher Stufe in
   13..35 s. Der Turm ist damit die schnellste Punktequelle jeder Stufe; gehört in den
   Turm-Balance-Pass (`design/slayer-tower-rework-balance.md`), nicht hierher.
3. **forest_hare L90 mit 36 HP / 192 XP** ist ein Trash-Ausreißer im Wildwald (8,3 s/Kill für
   CL 90) und drückt die Jagd-Rate am Level-Cap nach oben.
4. **Gear-Band nicht monoton:** Für einen CL-90-Helden ist mud_crab L120 (2 Tode/h) leichter
   als dire_wolf L112 (52 Tode/h) und deep_kraken L150 unbesiegbar (0 Kills/h mit
   Aetherium-Kit). Die Stufen-Fenster tragen das über die 4er-Streckung, ein späterer
   Threat-Pass sollte die Bosse im Gear-Band trotzdem ansehen.

---

## 8. Apply-Liste (Reihenfolge)

1. **logic-dev (shared + engine):** `SlayerTaskTierId`, `SlayerTaskTierDef`, `SlayerMasterDef.taskTiers?`,
   `SlayerTask.tier` + `fallback?`; `assignTask(state, content, masterId, tierId)` nach 3.2;
   `stretchLevelWindow(levels, lo, hi, minPool, floor, upFirst)`; Konstanten
   `WORLD_TASK_LEVEL_*` / `TOWER_TASK_LEVEL_MAX_UNDER` entfernen; Default-Stufe bei fehlendem
   `taskTiers`; SAVE_VERSION 83 + Migration + sanitize (Abschnitt 4); Guard-Tests 1..9.
2. **content-dev:** `brenna_ashwick.taskTiers` exakt nach Tabelle 3.1; `taskAmount` /
   `basePoints` am Master entfernen (oder als Legacy belassen, dann Content-Integrity-Guard);
   Brenna-Texte DE/EN aus 3.3 (übrige fünf Sprachen über den Overlay-Prozess).
3. **ui-dev:** SlayerPage: drei Stufen-Buttons mit Unlock-Hinweis und Tooltip, Stufen-Abzeichen
   am aktiven Task, Fallback-Hinweis; i18n-Schlüssel `slayer.tier.*`; Screenshot-Sweep de/ru
   bei 1366x768.
4. **kontrolleur:** volle Suite, Kompat-Vault v82 → v83, Monte-Carlo-Hülle (Test 9).
5. **Später (optional, nicht Teil dieser Welle):** Champion-Kopf: fällt während eines
   Kopfgeld-/Blutjagd-Auftrags der Champion des Zielmonsters, zählt er 5 Kills und +5 Punkte
   (braucht ein `isElite`-Argument an `recordKillForSlayer`, combat-dev).
