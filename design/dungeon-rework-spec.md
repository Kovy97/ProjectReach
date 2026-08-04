# Dungeon-Rework-Spec — Logik, Content, UI, Paragonturm (2026-07-09)

**Auftrag (CHEF-GO, wörtlich):** „Dungeons generell bitte überarbeiten — UI, Logik, alles!"
**Bindende Chef-Leitplanken (nachgereicht, eingearbeitet):**
1. **Dramaturgie führt** — „Bisher kommen nur kontextlos alle 5 Wellen hintereinander, können wir dramatischer machen": inszenierter Spannungsbogen (Auftakt → benannte Wellen → Eskalation Trash→Elite→Verschnaufpause/Schatztruhe→Boss-Finale → Clear-Zeremonie). Encounter-Leiste (Totenkopf-Reihe) + Clear-Zeremonie mit Beute-Showcase sind bereits GO'd (§5.6).
2. **Positionierung** — „Dungeons sollten am Ende die Quelle des härtesten Contents und besten Lootes sein" (§5.2, §5.5).
3. **Der Gipfel ist der Endboss** — „nicht ein einzelner Gegner sondern der Endboss eines Dungeons": Top-Drops hinter den ganzen Lauf; Idol-Halle wird Endgame-Dungeon-Finale (§5.3).
4./5. **Paragonturm** — endlos skalierender „Paragon Dungeon", Etagen-Pausen zum Aufstocken, Tod = Reset auf Etage 1 (§7; eigene Ausbaustufe NACH dem Kern-Rework).

> **CHEF-ENTSCHEID 2026-07-09 (nach Spec-Abgabe, ÜBERSCHREIBT die Schlüssel-Ökonomie in E4/§5.5):**
> „Vllt ja Schlüssel einmalig finden zum Dungeon entsperren. Dann kann man immer rein, also dann
> key als rare loot." → **Schlüssel = EINMALIGES Unlock-Item** (Zelda-Prinzip):
> 1. Schlüsselfund entsperrt den Dungeon PERMANENT (`state.dungeonsUnlocked`, neu persistiert →
>    SAVE_VERSION-Bump + Migration in der betreffenden Welle); danach freier Eintritt, unbegrenzt
>    wiederholbar — KEIN Verbrauchs-Schlüssel, KEIN Gold-Eintritt.
> 2. **Doppelter Drop-Pfad** (RNG-Gnade): Schlüssel droppt selten in der thematisch passenden
>    Zone (~1/50) UND erhöht vom Endboss des VORHERIGEN Dungeons (~1/8) — die Progressions-Kette
>    aus Leitplanke 2 bleibt damit erhalten, nur als Jagd statt als Gate-Farm.
> 3. **Paragonturm-Schlüssel** droppt vom Letzten Götzen (Sanktum-Endboss) — der finale Chase.
> 4. **Alt-Saves:** vorhandene Schlüssel im Besitz ODER bereits geclearte Dungeons (`dungeonsCleared`)
>    → entsprechende Dungeons entsperrt; überzählige Alt-Schlüssel zum Verkaufswert erstattet
>    (Köcher-Präzedenz #286). Alte Loot-/Shop-Einträge der Verbrauchs-Schlüssel bereinigen.
> 5. E4-Belohnungs-Leiter auf FREIE Wiederholbarkeit dimensionieren (Kosten = Zeit + Verbrauch +
>    Todesrisiko; Ziel-g/h-Leiter aus §5.5 bleibt der Anker).

**Verifikation:** Alle Zahlen sind mit einem Scratchpad-Harness gegen die ECHTEN Engine-Pfade gemessen (`startDungeon`/`advance`/`combatStep`, Envelope-Referenz-Builds aus `balance-envelope-helpers.ts`, 10 Seeds je Zelle, Food = bestes Auto-Eat-Item). Read-only-Spec: content-dev/combat-dev/logic-dev/ui-dev applizieren §6 verbatim. Meisterumhänge (`design/master-capes-konzept.md`) werden hier nur referenziert, nicht angefasst.

---

## 1) Bestandsaufnahme — Logik heute (engine)

Quellen: `packages/engine/src/dungeon.ts`, `combat.ts` (Zeilen ~893–1023), `tick.ts`, `packages/shared/src/index.ts` (`DungeonDef`).

- **Datenmodell:** `DungeonDef { id, name, zone?, requiredLevel, keyItem, keysPerRun, encounters: MonsterId[], loot, xp, gold }`. **Es gibt KEIN `waveName`/`waveKind`-Feld** (Chef-Frage geprüft: `encounters` ist ein nacktes `MonsterId[]`) — die Wellen laufen kontextlos ab, exakt wie vom Chef moniert.
- **Gate:** `canEnterDungeon` = Kampf-Niveau (`combatLevel`, fokus-belohnende Formel) ≥ `requiredLevel` UND `keysPerRun` Schlüssel im Inventar. `startDungeon` verbraucht die Schlüssel sofort und bricht eine laufende Skilling-Aktion ab.
- **Wellen-Fortschritt:** `onEnemyDefeated` → `encounterIndex++`, nächste Welle spawnt sofort (voller Gegner-Ward, Spieler-Ward nur 20 %-Refill), dazwischen der normale **Kill-Cooldown 2 s** (`KILL_COOLDOWN_MS`). **Wellen-Kills vergeben die VOLLEN Normal-Kill-Belohnungen** (Monster-XP mit Level-Dämpfung, Gold, komplette Loot-Tabelle inkl. Suffix-/Pet-Würfe). Letzte Welle → `grantDungeonRewards` (Clear-Gold, Clear-XP → **vitality**, Clear-Loot-Rolls, `dungeonsCleared[id]++`) → `endDungeon` (cooldown-frei, Chef-Vorgabe „Abschluss unverändert").
- **Tod:** `onPlayerDefeated` = harter Stopp, voll geheilt, `dungeonId = null` → **Run weg, Schlüssel weg** (Einsatz/Risiko, gewollt). Wellen-Loot bis dahin bleibt (fair).
- **Stalemate:** `trackStalemate` bricht den Kampf ab, wenn die **Gegner-HP** 60 s lang nicht um ≥ 1 % maxHp sinken — im Dungeon inkl. `dungeonId = null` → **Schlüssel weg**.
- **🐞 BUG (P0): Stalemate ist Ward-blind.** `strikeEnemy` leitet Schaden zuerst in `enemyWard` (combat.ts ~1394); `trackStalemate` misst aber NUR `enemyHp`. Ein Build mit < ~28 DPS, der `aether_wraith` (Ward **1654**) völlig legal runterarbeitet, wird nach 60 s als „Patt" abgebrochen und verliert den Schlüssel. Gemessen: **BiS-99-Melee-Tank scheitert 10/10 Runs in `idol_sanctum` genau daran** (§3). Der Guard `idol-sanctum-clear.test.ts` ist nur grün, weil sein Fixture-Held ein **Magier** mit eingebautem wardBreak ist.
- **Manueller Stopp** (`stopCombat`) während des Runs = Abbruch, Schlüssel weg — die UI fragt **nicht** nach.
- **Offline:** Kampf tickt im Offline-Catch-up voll weiter (`tick.ts step()` ruft `combatStep`) → ein laufender Run wird offline **fertig gekämpft** (Clear ODER Tod), danach Leerlauf — Dungeons ketten nicht (kein Auto-Restart). Sinnvoll; bleibt so (§5.8).
- **Persistenz:** `combat.dungeonId`/`encounterIndex` und `dungeonsCleared` sind persistiert (Migration vorhanden). Das Kern-Rework braucht **keinen** SAVE-Bump; nur der Paragonturm (§7) braucht einen.
- **Slayer-Turm-Abgrenzung:** eigenes System (5 feste Etagen, `slayerFloor`-Gate, eigene `tower_*`-Monsterkopien, Task-Farming, keine Schlüssel/Wellen). Präzedenzfälle, die wir nutzen: dedizierte Monster-Varianten + Art-Alias (`monsters.ts` mappt `tower_<x>` auf die Basis-Art).

## 2) Bestandsaufnahme — Content heute

6 Dungeons (`content.dungeons`), alle Encounters sind **1:1 die Openworld-Monster** der Zone:

| Dungeon | Gate CL | Wellen (Level) | Schlüssel | Clear-Belohnung (EV) | Wellen-XP Σ |
|---|---|---|---|---|---|
| goblin_warband | 20 | 5 (L19–30) | warband_key ×1 | 320 g + 145 g Loot-EV | 256 |
| crypt_depths | 70 | 5 (L65–90) | crypt_key ×1 | 1200 g + 856 g | 2 544 |
| wildwood_hunt | 90 | 4 (L97–120) | wildwood_key ×1 | 900 g + 462 g | 2 662 |
| highland_aerie | 92 | 4 (**L200–222**) | highland_key ×1 | 3000 g + 1073 g | 12 430 |
| wyvern_lair | 96 | 4 (**L208–233**) | highland_key **×2** | 5000 g + 594 g | 19 470 |
| idol_sanctum | 99 | 4 (**L245–295**) | idolhall_key ×1 | 8000 g + 4060 g | 86 500 |

Befunde:
- **B1 — Gate ≠ Inhalt:** +2 Gate-CL (90→92) springen von L97–120- auf L200–222-Wellen. Die CL-Gates signalisieren Bereitschaft, die es nicht gibt (L≥100 = Gear-Band, monster-threat-spec §2).
- **B2 — EV-Inversion:** wyvern_lair kostet **2 Schlüssel**, sein Clear-Loot-EV (594 g) liegt UNTER highland_aerie (1073 g, 1 Schlüssel).
- **B3 — Signatur-Items sind Vendor-Trash:** `warband_seal`/`grave_warden_sigil`/`storm_core`/`idol_heart` sind reine Verkaufs-Materialien ohne Verwendung (einzig `alpha_fang` hat ein Craft-Rezept). **Kein einziges Chase-Equipment im Clear-Loot** — die echten Chase-Items (godly-Waffen des last_idol, Warden-Legendaries, nekro_reaperblade …) hängen an frei anwählbaren Openworld-Kills. Genau das Gegenteil von Leitplanke 3.
- **B4 — Schlüssel-Quellen:** Trash 0,5–1 %, Zonen-Boss 5–10 % (nekro 7 %, forest_bear 6 %, void_titan 9 %, last_idol 10 %). `idolhall_key` droppt NUR von den Idol-Monstern selbst.
- **B5 — Threat-Retune hat die Wellen L≥100 massiv verschärft** (idol_warden 1946 hp/154 dmg usw.), die Dungeon-Belohnungen/Gates wurden nie nachgezogen.

## 3) Messungen (Harness, echte Engine-Pfade)

Referenz-Builds: `buildBisCharacter` (maximal legaler Voll-Stack) am **Gate-Level** („Gate-BiS" = Obergrenze dessen, was am Gate möglich ist) und bei **CL 99**; Food = bestes Heil-Item, 10 Seeds. Ein realer Gate-Spieler ist SCHWÄCHER als Gate-BiS.

| Dungeon | Gate-BiS dmg | Gate-BiS tank | BiS-99 tank | Openworld-Baseline (Gate-BiS/tank, 60 min) |
|---|---|---|---|---|
| goblin_warband | 10/10 Clear, Ø 0,5 min | 10/10, Ø 0,9 min | 10/10, 0,5 min | warlock 201 Kills → **10,1 keys/h** |
| crypt_depths | 10/10, Ø 0,8 min | 10/10, Ø 2,1 min | 10/10, 2,2 min | nekro 66 Kills → **4,6 keys/h** |
| wildwood_hunt | 10/10, Ø 1,0 min | 10/10, Ø 2,5 min | 10/10, 4,4 min | forest_bear 55 Kills → **3,3 keys/h** |
| highland_aerie | **0/10 (10 Tode)** | 10/10, Ø **24,3 min** | 4/5 (1 Patt), Ø 43,9 min | roc_storm 5 Kills → **0,04 keys/h ≈ 22 h/Key** |
| wyvern_lair | **0/10 (10 Tode, W1 nach ~6 s)** | 10/10, Ø **29,1 min** | 4/5 (1 Patt), Ø 58,3 min | roc_void 5 Kills → 0,05 keys/h (×2 Keys ⇒ **~40 h/Run**) |
| idol_sanctum | **0/10 — Tod am last_idol (W4)** | **0/10 — Ward-Patt an aether_wraith (W2)** | — | last_idol 2 Kills/h → 0,2 keys/h |

Ergänzende Messungen:
- **idol_sanctum ist für Melee/Ranged aktuell UNCLEARBAR** (alle legalen Voll-Stacks: Damage-Builds sterben am last_idol, Tank-Builds fressen den Ward-Stalemate-Bug an aether_wraith — auch der Hybrid Tank-Kit + beste 1H-DPS-Waffe, das V4b-Analogon der Threat-Spec, scheitert 3/3). Nur der Magier-Tank (wardBreak) des Guards kommt durch.
- **Stil-Parität bricht ab dem Gear-Band:** crypt_depths clearen alle 3 Stile (1,2–2,1 min). highland_aerie cleart NUR melee/tank; ranged (dodge, auch mit DPS-Waffe) und magic (ward+DPS) sterben 2/2. → L200+-Dungeons sind heute Melee-Tank-Content (Magier nur mit spezieller wardBreak-Tank-Konfiguration). Querschnitts-Befund, Fix gehört in eine eigene Parity-Spec (§5.9), nicht in Dungeon-Zahlen.
- **Schlüssel-Realität bei CL 99:** BiS-99-Damage farmt `roc` mit 61 Kills/h → 0,006-Chance = **0,37 keys/h (~2,7 h/Key)** für einen 25–45-min-Run mit 4,3k EV; nekro 306 Kills/h → 21 keys/h (Überversorgung). Die Schlüssel-Ökonomie ist am unteren Ende überversorgt, am oberen kollabiert.
- **EV/min invertiert:** warband ~500–1000 g/min, crypt ~1000 g/min, aerie ~180 g/min, wyvern ~200 g/min — die schwersten Runs zahlen pro Minute am schlechtesten (vor dem Hintergrund der g/h-Leiter 20k→90k aus `combat-gold-and-thieving-audit.md`).
- Sim-Block `pnpm test` (103 Files/781 Tests grün): ungegearter Sim-Char stirbt an allen L≥100 per Design (threat-spec V6) — Dungeon-Zeilen tauchen dort nicht auf.

## 4) Befund-Verdichtung

F1 (P0) Ward-blinder Stalemate frisst legale Runs + Schlüssel; macht idol_sanctum für Tank-Builds unclearbar.
F2 idol_sanctum ist insgesamt kein clearbarer Content (Damage stirbt, Tank pattet) — der Endgame-„Gipfel" existiert praktisch nicht.
F3 Schlüssel-Ökonomie: oben kollabiert (2,7–40 h pro Run-Einsatz), unten überversorgt (10 keys/h).
F4 Belohnungs-Leiter invertiert (EV/min sinkt mit Schwierigkeit; wyvern 2-Key-Inversion; Signatur-Loot ohne Chase-Wert).
F5 Top-Chase-Items hängen an Einzelgegnern statt am Endboss-Lauf (Leitplanke 3 verletzt); Idol-Monster sind frei farmbar.
F6 Kein Dungeon-Aufschlag < L100: warband/crypt-Wellen sind identische Zonen-Mobs → Dungeons sind dort NICHT der härteste Content (Leitplanke 2 verletzt). (L≥100-Wellen tragen die Elite/Boss-Mults der Threat-Spec bereits.)
F7 Null Dramaturgie: kontextlose Wellen, kein Auftakt, keine Namen, kein Boss-Moment, kein Clear-Moment (Leitplanke 1).
F8 Gates signalisieren falsch (92 → L222-Boss); Reihenfolge Gate ↔ Schwierigkeit inkonsistent.
F9 UX-Fallen: manueller Stopp/Aufgeben ohne Rückfrage = Schlüssel weg; Karten zeigen weder Gegner noch Loot noch Risiko.

---

## 5) Rework — der Event-Loop (Vorbereitung → Lauf → Abschluss)

Ziel-Loop: **Schlüssel erspielen (Vorbereitung, ~20–40 min on-level) → Lauf mit Spannungsbogen (3–15 min low/mid, 25–45 min Finale) → Clear-Zeremonie mit garantierter Signatur + Chase-Chance.** Dungeons sind pro Stunde Spielzeit die beste Loot-Quelle ihres Bandes und exklusiver Träger der Top-Chase-Items.

### 5.1 Engine-Fixes & neue Bausteine (combat-dev / logic-dev)

1. **Stalemate-Ward-Fix (P0, eigenständig sofort applizierbar):** `trackStalemate` misst Fortschritt auf `enemyHp + enemyWard` gegen 1 % von `(maxHp + wardCapacity)`. Kein RNG, keine Persistenz. Erwartung danach (Harness verifizierbar): BiS-99-Melee-Tank cleart idol_sanctum in ~35–50 min statt 10/10-Patt.
2. **Neue Content-Shapes (nur Typen, KEIN Save-Feld):**
   - `DungeonDef.waveMeta?: Array<{ name?: LocalizedString; kind?: "trash" | "elite" | "boss" }>` (Index-parallel zu `encounters`; fehlend ⇒ heutiges Verhalten).
   - `DungeonDef.chest?: { loot: LootRoll[] }` — **Schatztruhe/Verschnaufpause vor dem Boss**: beim Übergang in die LETZTE Welle werden die Chest-Rows gerollt (addItemOrBank + Log) und der Wellen-Cooldown beträgt einmalig `PRE_BOSS_BREATHER_MS = 8_000` statt 2 000 (Atempause + Boss-Intro-Fenster fürs UI). RNG-Disziplin: Rows werden nur gewürfelt, wenn `chest` definiert ist → Alt-Content bit-identisch.
   - `MonsterDef.dungeonOnly?: boolean` — `startCombat` verweigert Direktstart, Slayer-Welt-Task-Pool (`slayer.ts` ~Z.156) und die Monster-/Zonen-Auswahl der UI filtern es aus. Dungeon-Wellen (`startDungeon`/Wellen-Spawn) bleiben unberührt.
3. **Erst-Clear-Bonus:** in `grantDungeonRewards`: wenn `state.dungeonsCleared[d.id] === 1` (dieser Clear war der erste) ⇒ **Clear-Gold ×2** (ein zweiter `pushLog`-Gold-Eintrag). Nutzt den existierenden persistierten Zähler — **kein SAVE-Bump**.
4. **Kill-Credit-Alias für Dungeon-Varianten:** Kills von `dg_<baseId>`-Monstern (§5.4) schreiben `monsterKills[baseId]`, Slayer-Task-Credit und Collection-Log auf die **Basis-ID** (Präfix-Strip, deterministisch, Muster `tower_`-Art-Alias). Achievements/Tasks bleiben so von der Varianten-Einführung unberührt.
5. **Boss-Intro:** kein eigener Engine-Zustand — das 8-s-Breather-Fenster (oben) IST das Intro-Fenster; UI rendert darin Truhen-Loot + Boss-Ansage (§5.6).

### 5.2 Positionierung (Leitplanke 2): Dungeon > Openworld desselben Bandes

- **L≥100-Wellen** tragen den Aufschlag bereits (Threat-Spec-Familien-Mults: Dungeon-Welle = Elite ×1,15 dmg/×1,5 hp; finaler Encounter = Boss ×1,2/×2,2) — dort ändern wir KEINE Monster-Stats (kein Doppel-Nerf).
- **L<100-Dungeons** (warband, crypt) bekommen den Aufschlag über **dedizierte Varianten-Monster `dg_*`** (Präzedenz `tower_*`), Werte §5.4. wildwood_hunt braucht keine Varianten (W2–W4 sind bereits threat-getunte L≥100-Elites/Bosse).
- **Loot-Positionierung:** beste Chase-Raten wandern in den Clear-Loot (§5.5); die Openworld-Zwillings-Rows der betroffenen Chase-Items werden **halbiert** (Lotterie bleibt, Quelle Nr. 1 ist der Dungeon). Kein Farm-Leck: Clear-Loot ist durch Schlüssel + Laufzeit gedrosselt; Guard-Suite-Erwartungen §6.

### 5.3 Der Gipfel ist der Endboss (Leitplanke 3): Idol-Halle wird Dungeon-Finale

- `idol_warden`, `aether_wraith`, `scale_skarn`, `last_idol` ⇒ **`dungeonOnly: true`**. Die Zone „idolhall" verschwindet aus der freien Monster-Auswahl; die vier existieren nur noch als idol_sanctum-Wellen. Damit sind **alle godly-Drops des last_idol automatisch hinter den kompletten Lauf gelegt** (sie bleiben auf seiner Kill-Loot-Tabelle; der Kill IST jetzt der Endboss-Kill nach 3 Wellen).
- **Loot-Umzugs-Tabelle (Idol-Halle):**
  | Item | heute (frei farmbar) | neu |
  |---|---|---|
  | last_judgement / last_vengeance / last_condemnation / eye_of_the_idol | last_idol-Kill 0,008–0,01 | unverändert auf last_idol — aber nur noch als W4-Endboss erreichbar (run-gated) |
  | idol_aegis / last_idol_mantle (0,000031 — de facto ausgestorben) | last_idol-Kill | zusätzlich **idol_sanctum-Clear-Loot @0,002** (Grals-Rate ~1/500 Clears; Kill-Rows bleiben) |
  | idol_crown / voidtouched_gauntlets / idolbound_signet / aetherweave_leggings / idolstep_sabatons (0,00007–0,00008) | Warden-Kills | zusätzlich **Clear-Loot @0,02** je Row (~1/50 Clears ≈ 35 h — echte Chase-Pipeline); Kill-Rows bleiben als In-Run-Lotterie |
  | voidwarden_blade / idol_shroud / spectral_longbow / skarn_idol_staff (0,012–0,015) | Warden-Kills | unverändert (In-Run-Drop; 1 Roll pro Lauf) |
- **Schlüssel-Umleitung** (idolhall_key darf nicht nur von dungeonOnly-Mobs droppen): **wyvern_lair-Clear-Loot += idolhall_key @0,40 x1** (T2 füttert das Finale — Progressions-Kette!), **void_titan += @0,04**, **gravecliff_specter += @0,01**. Die Key-Rows AUF den Idol-Monstern bleiben (In-Run-Teilerstattung, lauf-intern).
- **Progressions-Kette (ausgewiesen, Leitplanke 2):** Openworld-Zone → goblin_warband (T0, CL 20) → crypt_depths (T1, CL 70) → wildwood_hunt (T1.5, CL 90) → highland_aerie (T2a, CL 95) → wyvern_lair (T2b, CL 97, droppt Finale-Schlüssel) → **idol_sanctum (Finale, CL 99)** → Paragonturm (§7, Freischaltung durch ersten Finale-Clear).
- Achievements bleiben erreichbar (`ach_godly_drop` = 5 last_idol-Kills ⇒ 5 Clears; `dungeons_cleared`-Reihe profitiert). Slayer-Welt-Tasks dürfen keine dungeonOnly-Monster mehr ziehen (§5.1.2).

### 5.4 Dramaturgie & Wellen-Komposition (Leitplanke 1) — exakte Werte

Kompositions-Regel: **Trash (Ansage) → Trash → Elite (Trait sichtbar) → Elite → [Schatztruhe + Atempause 8 s + Boss-Intro] → Boss-Finale mit Mechanik (enrage/regen/inflict).** 4-Wellen-Dungeons: Trash → Elite → Elite → [Truhe] → Boss.

**Neue Varianten-Monster (content-dev; Art via `dg_`-Alias auf Basis-Art, Namen = Basis-Namen; Loot/gold = Basis inkl. Key-Row; XP skaliert mit dem HP-Mult, damit XP/HP konstant bleibt):**

| id (neu) | Basis | Welle | maxHp | ward | damage | xp | Sonstiges |
|---|---|---|---|---|---|---|---|
| dg_goblin_rogue | goblin_rogue (18/8) | trash | 18 | — | 8 | 38 | identisch (Auftakt) |
| dg_goblin_spearman | goblin_spearman (26/9) | trash | 26 | — | 9 | 40 | identisch |
| dg_goblin_crossbower | goblin_crossbower (29/11) | elite | **44** | — | **13** | **75** | ×1,5 hp / ×1,15 dmg |
| dg_goblin_butcher | goblin_butcher (39/11) | elite | **59** | — | **13** | **84** | ×1,5 / ×1,15 |
| dg_goblin_warlock | goblin_warlock (52/16w/13) | boss | **115** | **35** | **16** | **158** | ×2,2 (hp+ward), ×1,2 dmg; **+ enrage { belowHpPct: 0.35, damageMult: 1.4 }** |
| dg_skeleton_warrior | skeleton_warrior (89/34) | trash | 89 | — | 34 | 230 | identisch |
| dg_skeleton_archer | skeleton_archer (78/31) | trash | 78 | — | 31 | 250 | identisch |
| dg_skeleton_butcher | skeleton_butcher (142/43) | elite | **213** | — | **49** | **546** | ×1,5 / ×1,15 |
| dg_skeleton_icemage | skeleton_icemage (161/48w/38) | elite | **242** | **72** | **44** | **750** | ×1,5 (hp+ward proportional) / ×1,15 |
| dg_skeleton_nekro | skeleton_nekro (281/84w/48) | boss | **379** | **113** | **53** | **1620** | Basis ist schon Boss-klassig (enrage/regen) ⇒ nur ×1,35 / ×1,10 |

`encounters` der beiden Dungeons zeigen danach auf die `dg_*`-Ids. Alle übrigen Felder (accuracy, evasion, defense, interval, inflict, resist, regen, enrage außer warlock) = Basis. Openworld-Basen bleiben unangetastet (Sim-Bit-Identität < L100).

**waveMeta (alle 6 Dungeons; EN/DE inline, restliche 5 Sprachen via content/locales-Overlay):**

| Dungeon | W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|---|
| goblin_warband | Die Vorhut / The Vanguard (trash) | Die Speerwand / The Spearwall (trash) | Die Bolzenreihe / The Boltline (elite) | Die Schlachterbande / The Butcher's Row (elite) | **Der Hexenmeister der Bande / The Warband Warlock (boss)** |
| crypt_depths | Die Grabwache / The Grave Watch (trash) | Die Knochenschützen / The Bone Archers (trash) | **Die Knochenwache / The Bone Guard** (elite) | Der Frostritus / The Frost Rite (elite) | **Der Nekromantenfürst / The Necromancer Lord (boss)** |
| wildwood_hunt | Das Heulen / The Howling (trash) | Der Große Hirsch / The Great Stag (elite) | Der Schreckenswolf / The Dire Wolf (elite) | **Der Alte vom Wildwald / The Old One of the Wildwood (boss)** | — |
| highland_aerie | Der Horstwächter / The Aerie Warden (elite) | Die Jagdschwinge / The Hunting Wing (elite) | Der Älteste / The Elder Roc (elite) | **Der Sturmbringer / The Stormbringer (boss)** | — |
| wyvern_lair | Die Schwinge / The Wing (elite) | Der Sturm / The Storm (elite) | Die Wyvern / The Wyvern (elite) | **Der Leerenroc / The Void Roc (boss)** | — |
| idol_sanctum | Der Wächter / The Warden (elite) | Der Schleier / The Veil (elite) | Die Schuppenwand / The Scaled Wall (elite) | **Der Letzte Götze / The Last Idol (boss)** | — |

**Schatztruhen (`chest.loot`, gerollt beim Übergang in die letzte Welle):**

| Dungeon | Chest-Rows |
|---|---|
| goblin_warband | dim_essence @1,0 x2–4; shaman_totem @0,5 x1; warband_key @0,10 x1 |
| crypt_depths | runite_bar @1,0 x1–2; ruby @0,5 x1; crypt_key @0,10 x1 |
| wildwood_hunt | scarred_hide @1,0 x2–3; alpha_fang @0,15 x1 |
| highland_aerie | feather @1,0 x8–15; storm_essence @0,8 x1–2; highland_key @0,10 x1 |
| wyvern_lair | wyvern_scale @1,0 x1–2; void_essence @0,5 x1 |
| idol_sanctum | idol_shard @1,0 x2–4; godiron_bar @0,8 x1–2; onyx @0,3 x1 |

### 5.5 Schlüssel-Ökonomie & Belohnungs-Leiter — exakte Werte

**Schlüssel (Ziel: ~1 Key je 20–40 min on-level-Farm; unten unverändert, oben repariert):**

| Monster | Row | heute | **neu** |
|---|---|---|---|
| roc | highland_key | 0,006 | **0,02** |
| roc_hunter | highland_key | 0,007 | **0,025** |
| roc_elder | highland_key | 0,008 | **0,03** |
| roc_storm | highland_key | 0,009 | **0,035** |
| highland_wyvern | highland_key | 0,01 | **0,04** |
| roc_void | highland_key | 0,01 | **0,04** |
| gravecliff_specter | highland_key | 0,01 | **0,03** |
| void_titan | highland_key | 0,09 | 0,09 (bleibt) |
| void_titan | **idolhall_key (NEU)** | — | **0,04** |
| gravecliff_specter | **idolhall_key (NEU)** | — | **0,01** |
| wyvern_lair (Clear-Loot) | **idolhall_key (NEU)** | — | **0,40 x1** |
| warband_/crypt_/wildwood_key-Rows | alle | — | unverändert |

Rechnet sich: BiS-99-Damage auf `roc` (61 Kills/h) → **1,2 highland_keys/h**; wyvern-Clears + void_titan speisen das Finale mit ~0,4–0,6 idolhall_keys/h aktiver Vorbereitung.

**Dungeon-Defs (Gates, Kosten, Clear-Belohnung):**

| Dungeon | requiredLevel | keysPerRun | gold | xp (vitality) | Clear-Loot (komplett, ersetzt bisherige `loot`) |
|---|---|---|---|---|---|
| goblin_warband | 20 | 1 | 320→**400** | 180 | warband_seal **@1,0** x1; dim_essence @0,5 x1–2; shaman_totem @0,4 x1; **warbanner_cape @0,008 x1 (suffixChance 0.30)**; **warlock_felstaff @0,008 x1 (suffixChance 0.30)** |
| crypt_depths | 70 | 1 | 1200 | 600→**700** | grave_warden_sigil **@1,0** x1; ruby @0,4 x1–2; runite_bar @0,5 x1–3; **necrosignet_ring @0,03 x1 (0.30)**; **nekro_reaperblade @0,01 x1 (0.30)** |
| wildwood_hunt | 90 | 1 | 900→**1100** | 950 | alpha_fang **@1,0** x1; scarred_hide @0,6 x2–4; fang @0,5 x2–4; **direfang_maul @0,01 x1 (0.30)**; **bearhide_cuirass @0,008 x1 (0.30)**; **alphas_heart_ring @0,008 x1 (0.30)** |
| highland_aerie | 92→**95** | 1 | 3000→**3600** | 3200 | storm_core **@1,0** x1; aether_essence @0,5 x2–4; feather @1,0 x10–20; **storm_mantle @0,02 x1 (0.30)**; **stormcore_pendant @0,01 x1 (0.30)**; **stormcrest_staff @0,01 x1 (0.30)** |
| wyvern_lair | 96→**97** | **2→1** | 5000 | 4500 | wyvern_scale **@1,0 x3–5**; raw_dragonhide **@0,8** x2–3; aether_essence @0,6 x2–4; void_essence **@0,6** x1–2; **idolhall_key @0,40 x1**; **wyvernscale_greaves @0,012 x1 (0.30)**; **wyvernscale_aegis @0,012 x1 (0.30)**; **aetherscale_cuirass @0,01 x1 (0.30)**; **aetherband_ring @0,01 x1 (0.30)** |
| idol_sanctum | 99 | 1 | 8000→**12000** | 9000→**15000** | idol_heart **@1,0** x1; onyx @0,4 x1–2; godiron_bar @0,5 x2–4; **idol_crown @0,02**; **voidtouched_gauntlets @0,02**; **idolbound_signet @0,02**; **aetherweave_leggings @0,02**; **idolstep_sabatons @0,02**; **idol_aegis @0,002**; **last_idol_mantle @0,002** (alle x1, suffixChance 0.30) |

**Openworld-Halbierung der umgezogenen Chase-Rows** (Quelle Nr. 1 = Dungeon, Lotterie bleibt): goblin_warlock warbanner_cape/warlock_felstaff 0,0019→**0,001**; skeleton_nekro necrosignet_ring 0,0013→**0,0007**, nekro_reaperblade 0,00045→**0,00022**; dire_wolf direfang_maul 0,00074→**0,00037**; forest_bear bearhide_cuirass/alphas_heart_ring 0,00045→**0,00022**; roc_storm storm_mantle 0,0011→**0,00055**, stormcore_pendant/stormcrest_staff 0,00039→**0,0002**; highland_wyvern wyvernscale_greaves/wyvernscale_aegis 0,00042→**0,00021**; roc_void aetherscale_cuirass/aetherband_ring 0,00042→**0,00021**. (Warden-/last_idol-Rows unverändert — run-gated durch §5.3.)

**Ergebnis-Leiter (EV pro Clear inkl. Gold, ohne Wellen-Kills):** 400+~700 → 1200+~1400 → 1100+~1200 → 3600+~2400 → 5000+~1900+Key → 12000+~7800. Monoton steigend, EV/min ~aufsteigend statt invertiert; idol_sanctum-Loop (~40-min-Clear + Vorbereitung) ≈ **25–30k g/h + ~86k Wellen-XP/Run** — Spitze der g/h-Leiter, wie von Leitplanke 2 gefordert.

### 5.6 UI (ui-dev) — GO'd + Ergänzungen

1. **Encounter-Leiste** (GO'd): Totenkopf-Reihe über dem Kampf — bezwungene Wellen erleuchtet, aktuelle pulsiert, Boss-Totenkopf markiert (waveMeta.kind „boss"); Tooltip je Kopf = waveMeta.name + Monster (?? bis entdeckt, Collection-Log-Regel).
2. **Wellen-Ansage:** Banner beim Wellen-Start „Welle 3/5 — Die Knochenwache" (waveMeta.name; Fallback Monster-Name). Auftakt-Moment beim Betreten: Dungeon-Name + „Welle 1/5"-Ansage als großes Einblend-Banner (bestehender Backdrop/Partikel-Stack bleibt).
3. **Boss-Intro:** im 8-s-Breather (§5.1.2): Truhen-Loot-Einblendung, danach Boss-Namensplakette (waveMeta.name, Skull-Icon, kurzer Puls) — kein neues Engine-Feld, UI liest `cooldownRemainingMs` + kommende Welle.
4. **Clear-Zeremonie** (GO'd): Vollbild-Moment nach `grantDungeonRewards` — Dungeon-Name, „BEZWUNGEN", Beute-Showcase (Clear-Loot-Items als Karten, Chase-Drop hervorgehoben), Erst-Clear-Badge bei `dungeonsCleared === 1`, Gold-/XP-Zeile. Log-Events liefern alle Daten bereits.
5. **Dungeon-Karten v2:** Gegner-Vorschau (Totenkopf-Leiste als Miniatur mit Leveln), Clear-Loot-Vorschau (???-Stil bis entdeckt), Schlüssel-Stand (bestehend), NEU: Risiko-Hinweis „Tod oder Abbruch verbraucht den Schlüssel".
6. **Abbruch-Rückfrage:** Stopp/Flucht während eines Runs → Confirm-Dialog („Run abbrechen? Der Schlüssel verfällt."). Tod-Overlay im Dungeon ergänzt dieselbe Zeile.
7. `dg_`-Art-Alias in `monsters.ts` (eine Zeile, Muster `tower_`); i18n en+de inline, 5 weitere Sprachen via locales-Overlay (7-Sprachen-Gesetz).

### 5.7 Tod, Patt, Abbruch — Entscheid

**Schlüssel bleibt bei Tod/Abbruch verbraucht** (souls-like Einsatz; Wellen-Loot bis dahin bleibt — fair). Kein Pity, kein Refund. Fairness entsteht durch: Stalemate-Ward-Fix (F1), klare Risiko-Kommunikation (§5.6.5/6), Schatztruhe VOR dem Boss (ein Teil des Laufs ist schon „gebankt") und die reparierte Schlüssel-Ökonomie (ein verlorener Key ist ~20–40 min, nicht 22 h).

### 5.8 Offline — Entscheid

Heutiges Verhalten bleibt: ein laufender Run wird offline zu Ende gekämpft (Clear oder Tod), danach Leerlauf; **kein Offline-Chaining** (Schlüsselverbrauch ohne Spieler-Entscheid wäre unfair, und der Event-Charakter lebt vom aktiven Start). UI-Hinweis im Offline-Report, wenn ein Clear/Tod offline passierte. Kein Engine-Change.

### 5.9 Querschnitts-Flag (NICHT Teil dieses Applys)

Ranged ist ab dem Gear-Band (L200+) in Dungeons UND Openworld nicht lebensfähig (§3); Magie nur über die wardBreak-Tank-Schiene. Verstößt gegen das 3-Stile-Gesetz, ist aber ein Armor-Trinity-/Threat-Folgeproblem — **eigene Parity-Spec empfohlen** (Sustain-/Mitigations-Optionen für Leder/Stoff im Gear-Band). Dungeon-Zahlen hier sind so gewählt, dass sie einer späteren Parity-Korrektur nicht im Weg stehen.

---

## 6) APPLY-PLAN (nach Revieren, in Wellen; Sim-Impact-Schranke am Ende)

**Welle 0 — combat-dev (P0-Bugfix, sofort, unabhängig):**
- Stalemate-Ward-Fix (§5.1.1) + Testfall (Ward-Gegner, langsamer Build, kein Patt-Abbruch solange Ward sinkt).
- Erwartung: `idol-sanctum-clear.test.ts` bleibt grün; NEU muss auch ein Melee-Tank-Fixture clearen (Testerweiterung empfohlen). Sim-Block unverändert (< L100 bit-identisch; Stalemate-Pfad greift dort nicht).

**Welle 1 — logic-dev (Typen + Filter, klein):**
- `DungeonDef.waveMeta?`/`chest?`, `MonsterDef.dungeonOnly?` (reine Content-Shapes, **kein SAVE-Bump** — nichts davon wird persistiert).
- Slayer-Welt-Task-Pool: `dungeonOnly`-Monster ausschließen (slayer.ts). Guard: bestehende slayer.test grün; neuer Assert „kein dungeonOnly im Welt-Pool".

**Welle 2 — combat-dev (Dungeon-Logik):**
- Chest+Breather (PRE_BOSS_BREATHER_MS 8 000) beim Übergang in die letzte Welle; Erst-Clear-Gold ×2; `startCombat`-Guard für dungeonOnly; `dg_`-Kill-Credit-Alias (monsterKills/Slayer/Collection auf Basis-ID).
- Tests: dungeon.test-Erweiterungen (Chest rollt genau 1× und nur bei definiertem chest; Erst-Clear nur beim ersten; dungeonOnly-Direktstart verweigert; Alias schreibt Basis-ID).

**Welle 3 — content-dev (Zahlen aus §5.4/§5.5 verbatim):**
1. 10 `dg_*`-Varianten-Monster (Tabelle §5.4) + `encounters`-Umstellung warband/crypt.
2. `waveMeta` + `chest` für alle 6 Dungeons (Tabellen §5.4).
3. Dungeon-Defs: Gates (aerie 95, wyvern 97), wyvern keysPerRun 1, gold/xp/Clear-Loot-Tabellen (§5.5).
4. Key-Rows (§5.5-Tabelle) inkl. neuer idolhall_key-Quellen.
5. Openworld-Chase-Halbierung (§5.5 letzter Block).
6. `dungeonOnly: true` auf idol_warden/aether_wraith/scale_skarn/last_idol.
7. `dg_goblin_warlock`-enrage NUR auf der Variante (Openworld-warlock unverändert).
8. Locales-Overlay-Einträge (waveMeta-Namen, 5 Sprachen) nachziehen.
- Guards: content-refs (dg_-Ids, Chest-/Loot-Refs existieren), wiring-audit (alle neuen Clear-Loot-Items sind erhältlich — sie existieren bereits als Drops), balance-envelope §1-Pins (idol-Level unverändert ✓).

**Welle 4 — ui-dev (§5.6 komplett):** Encounter-Leiste, Wellen-Ansage, Boss-Intro im Breather, Clear-Zeremonie + Beute-Showcase, Karten v2, Abbruch-Confirm, Tod-Overlay-Zeile, `dg_`-Art-Alias, Offline-Report-Zeile, i18n. Danach `pnpm build` (stale-build-Gesetz).

**Welle P — Paragonturm (§7; eigene Ausbaustufe NACH Wellen 0–4, eigener SAVE-Bump).**

**Sim-Impact-Schranke (für kontrolleur):**
1. Sim-Block `pnpm test` muss für alle Zeilen < L100 **bit-identisch** bleiben (nur Chance-WERTE geändert → RNG-Zugzahl identisch; dg_-Monster sind neue Ids ohne Sim-Zeile; Openworld-Basen unangetastet).
2. Persona-/runDungeon-Pfade dürfen sich ändern (härtere warband/crypt-Wellen, dungeonOnly-Idole) — Abnahme: kein NEUES `kills=0`-/`0 XP/h`-Rotlicht im gedruckten Block; `sim-consistency`-Zeilen der Idol-Monster (heute 0 Kills/x Tode) werden nach dungeonOnly sinnlos → Zeilen entfernen/auf Clear-Messung umstellen (kontrolleur pinnt neu).
3. `idol-sanctum-clear.test.ts`: bleibt grün (Monster-Stats unverändert, Ward-Fix macht es LEICHTER; Gold-Assert liest `dungeon.gold` aus dem Content). Erwartung nach Welle 0+3: auch Melee-Tank-Fixture cleart.
4. Harness-Nachmessung (Scratchpad-Skripte reproduzierbar): Gate-BiS-Tank-Clear-Zeiten warband ≤ 2,5 min, crypt ≤ 5 min (Aufschlag-Effekt ≤ ~+100 % auf heute); idol_sanctum BiS-99-Tank Clear in 25–50 min, 0 Tode; Gate-BiS-Damage darf an aerie/wyvern/idol weiter sterben (gewollte Mitigations-Pflicht).
5. Ökonomie-Check: idol-Loop ≤ ~35k g/h, kein Loop schlägt die g/h-Leiter seines Bandes um mehr als ~×1,5 (Stichproben warband/crypt mit Gate-BiS).

---

## 7) Paragonturm — „Paragon Dungeon" (eigene Ausbaustufe, Chef-Leitplanken 4+5)

**Identität:** endloser, dynamisch skalierender Prestige-Turm für die Zeit NACH dem ersten idol_sanctum-Clear. Abgrenzung zum Slayer-Turm: der hat 5 feste Etagen, Task-Farming, keine Skalierung, keinen Checkpoint — der Paragonturm ist die unendliche Achse mit Einsatz.

- **Freischaltung:** `dungeonsCleared["idol_sanctum"] ≥ 1`. Kein Schlüssel (der Lauf selbst ist der Einsatz).
- **Struktur:** 1 Etage = 1 Encounter aus einem Content-Pool (`content.paragonPool: MonsterId[]`, Vorschlag: iron_revenant, frost_hexer, charred_doomknight, roc_void, void_titan — deterministisch rotierend via seeded RNG); **jede 5. Etage = Boss-Etage** (Boss-Pool: charred_doomknight, void_titan, roc_void). Gegner-Art/Identität (inflict/enrage/resist) = Basis-Monster; Stats werden per Formel ÜBERSCHRIEBEN.
- **Skalierungs-Formel (Engine, am Spawn):**
  `hp(f) = 900 · 1,12^(f−1)` · (Boss-Etage ×2) — verdoppelt sich alle ~6,1 Etagen
  `dmg(f) = 70 · 1,055^(f−1)` · (Boss ×1,15) — verdoppelt sich alle ~13 Etagen
  `acc(f) = 20 + 0,6·(f−1)`; evasion/defense/interval = Basis-Monster.
  Ward-Gegner: hp-Budget proportional auf hp+ward verteilt (Threat-Spec-Regel §3.2). **Kein Loot der Basis-Monster** (nur Etagen-Ertrag, sonst Chase-Leck).
- **Ertrag (wächst LANGSAMER als Schwierigkeit — kein Printer):**
  Etagen-Gold `g(f) = 300 · 1,035^(f−1)` (verdoppelt alle ~20 Etagen vs. Schwierigkeit ~6 → Verhältnis fällt monoton).
  **Meilenstein-Truhe je 5. Etage (nach dem Boss):** godiron_bar @1,0 x1–3; onyx @0,5 x1–2; void_essence @0,8 x1–2; ab f≥10 zusätzlich soulopal @0,5 x1–2; ab f≥20 zusätzlich je **@0,015**: idol_crown, voidtouched_gauntlets, idolbound_signet, aetherweave_leggings, idolstep_sabatons (Chase-Zweitquelle, gedrosselt durch Laufzeit).
  Keine neuen Items, keine neue Währung (Chef-Leitplanke: kein neues Währungssystem ohne Not).
- **Pause & Checkpoint (Leitplanke 4):** nach JEDER Etage stoppt der Lauf automatisch (Kampf endet, Checkpoint = erreichte Etage persistiert). Spieler kann raus, banken, aufstocken, weiterspielen — „Weiter ab Etage N" startet die nächste Etage. Offline dadurch trivially safe: offline wird höchstens die LAUFENDE Etage fertig gekämpft, nie automatisch die nächste betreten.
- **Tod = kompletter Reset auf Etage 1** (Checkpoint → 0). Launch-Schnitt ohne Safespots; **Safespots/Zwischen-Checkpoints (z.B. alle 25 Etagen) als spätere Ausbaustufe vermerkt** (Chef: „vllt mit Safespots dann später"). Freiwillige Pause bleibt vom Tod-Reset unberührt.
- **Prestige:** „Höchste Etage"-Rekord (`best`) auf der Stats-Seite; KEINE Leaderboards (kein MMO). Achievements (paragon 5/15/30) erst in einer Folgephase (braucht neuen Condition-Type — nicht Teil des Launch-Schnitts).
- **Ziel-Envelope (kontrolleur verifiziert nach Implementierung mit dem Harness):** BiS-99-Referenz-Tank bricht bei Etage **~28–38** (Sustain-Bruch: einkommender Schaden überholt Food-Heilrate; zusätzlich TTK-Bruch via 1,12^f gegen den — ward-gefixten — Stalemate-Guard). Frisch-99 (≤ rare, keine Instanzen): Etage ~8–14. Spieler-Caps (Envelope §2) werden nicht berührt — es skaliert nur Monster-Content.
- **Persistenz (Save-Kompat-Gesetz, EINZIGER SAVE-Bump des Reworks):** `state.paragon = { checkpoint: number; best: number }` + `combat.paragonFloor?: number` (aktive Etage). **SAVE_VERSION +1**, `migrateState`-Defaults `{ checkpoint: 0, best: 0 }`/undefined, Kompat-Vault-Fixtures aktualisieren + Guard VOR Depot-Upload.
- **Apply (Welle P, nach Kern-Rework):** logic-dev (State/SAVE/Migration) → combat-dev (Etagen-Loop/Skalierung/Checkpoint/Tod-Reset) → content-dev (paragonPool + Truhen-Tabellen) → ui-dev (Turm-Karte, Etagen-Anzeige, „Weiter/Pause", Rekord, Tod-Reset-Kommunikation). Sim-Schranke: bestehender Sim-Block unberührt (neuer, isolierter Pfad); kontrolleur pinnt die Bruch-Etagen der Referenz-Builds als neuen Envelope-Test.

---

## Anhang: Harness-Reproduktion

Scratchpad-Skripte (Session 553d2095): `dungeon-audit.ts` (Content-EV/Key-Quellen), `dungeon-sim.ts` (Clear-Raten 10 Seeds × Build × Dungeon + Openworld-Baselines), `dungeon-sim2.ts` (Per-Wellen-Diagnose, Stil-Parität, BiS-99-Key-Raten), `dungeon-sim3.ts` (Hybrid-Builds, Boss-Loot-Dump). Ausführung: `node_modules/.pnpm/node_modules/.bin/tsx <script>` aus `G:\GameDev` (Imports gegen die echten Engine-/Content-Quellen).
