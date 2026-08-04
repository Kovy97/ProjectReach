# Sweep 2 — 04 Frühgame-Progression L1–20 (Kontrolleur/QA)

**Fokus:** Neuer Spieler, erste Stunde — Skilling×Kampf-Verzahnung, Tempo/Fairness, Gold-Fluss,
erste Ausrüstung/Rezepte, Runenkunst-Start, Walls/Frust im Frühgame.
**Methode:** Headless `SimPlayer`-Treiber (echte Engine, seeded RNG). Temporäre Vitest-Skripte
angelegt, ausgeführt, wieder gelöscht. Alle Zahlen aus `advance()`/`startCombat()`/`fightFor()`.

---

## Tally
- **P0:** 0 · **P1:** 0 · **P2:** 3 · **P3:** 1 · **Positiv verifiziert:** 3 · **Info:** 1

## Top-3
1. **[P2/feel] Ranged-Frühgame stoppt nach ~10 min am leeren Köcher** — der einzige Stil, dessen
   Idle-Loop in der ersten Stunde aktives Munitions-Management erzwingt.
2. **[P2/bug/tooling] `SimPlayer.fightFor().deaths` zählt Kampf-Abbrüche, nicht Spielertode** — jede
   Persona-/Sweep-„Tode"-Zahl ist falsch (Ranged „633 Tode" = 0 echte Tode).
3. **[P2/balance] Default-„attack"-Stance lässt neuen Melee unterskalieren** → 36 Tode/Std + Hard-Wall
   an `boar` (L10). Downstream der bereits akzeptierten Stance-Entscheidung — quantifiziert als Entscheidungshilfe.

---

## P2 — mittel

### 1. [P2/feel] Ranged: Startmunition reicht ~7–10 min, danach bricht der Idle-Loop (manuelles Nachladen nötig) — **confirmed**
- **Erwartet:** Ein neuer Ranged-Main kann die erste Stunde ähnlich „idle" grinden wie Melee/Magie.
- **Tatsächlich:** Der Startköcher (150) ist nach **~7 min** reinem Huhn-Kampf leer; die 50 Reserve-Pfeile
  im Inventar werden **nicht** automatisch nachgeladen. Der Kampf endet sauber mit
  `stopReason="outOfAmmo"` (UI zeigt „Munition leer"). Ohne manuelles Re-Equip/Kauf/Fletchen läuft der
  Ranged-Char danach ins Leere (im Sim: 50 min lang nur outOfAmmo-Abbrüche, **0 echte Tode**, eingefrorene Kills).
- **Repro:** neuer Ranged-Char (`startingStyle:"ranged", starterKit:true`) → `startCombat("chicken")` →
  `advanceTime` in 5-s-Schritten. Nach ~7 min `combat.stopReason==="outOfAmmo"`, `inventoryCount("crude_arrow")===50`
  (ungenutzt). `equip("crude_arrow")` → Köcher füllt auf 50.
- **Evidence:** Start 150 Köcher + 50 Inv = 200 Pfeile ≈ 10 min Kampf (~20 Pfeile/min aktiv). Selbstversorgung
  existiert und ist L1-erreichbar: `fletch_shafts` (normal_log→15 shaft, L1) + `fletch_crude_arrows`
  (5 shaft + 1 feather → 15 crude_arrow, L1); Federn droppen von Hühnern; `crude_arrow` kostet 1 g im Shop.
  Aber: erfordert aktives Wissen + Berufs-Umweg (Woodcutting/Fletching) oder Shop-Trip → **deutlich höhere
  Management-Last als Melee/Magie**, und das genau im ersten 10-min-Fenster.
- **Owner:** Combat-Dev/Content-Dev (Startmenge) + Chef-Balance. `createGame`-Kommentar zeigt bereits einen
  Bump 60→150; für einen echten Idle-Start weiter knapp. Komfort-Option: **Auto-Reload aus dem Inventar bei
  leerem Köcher** (combat.ts `stopIfOutOfAmmo`) würde die Feel-Lücke schließen, ohne die Balance zu verschieben.
- **Kontext:** Gut versorgt (Food+Munition) ist Ranged früh der **stärkste** Stil — erreicht CL20 in 35 min
  ohne einen Tod. Das Problem ist rein die Munitions-Runway/-Verwaltung, nicht die Kampfkraft.

### 2. [P2/bug] Tooling: `SimPlayer.fightFor().deaths` zählt Kampf-Abbrüche, nicht Spielertode — **confirmed**
- **Root cause:** `onPlayerDefeated` (combat.ts) startet bei normalem Kampf automatisch neu und lässt
  `combat.monsterId` **gesetzt** (voll geheilt, „milde Idle-Strafe"). `fightFor` erkennt „Tode" aber an
  `combat.monsterId === null` — das passiert nur bei **outOfAmmo / stalemate / Dungeon-Abbruch**.
- **Erwartet:** `fightFor().deaths` == echte Spielertode.
- **Tatsächlich:** `fightFor().deaths` == Kampf-**Abbrüche**; echte Tode sind für `fightFor` **unsichtbar**.
  Gemessen realistische 1. Stunde (starterKit): echte `state.stats.deaths` = **melee 36, magic 30, ranged 0** —
  während `fightFor`/Persona für Ranged **633 „Tode"** meldete (= 633 outOfAmmo-Abbrüche, kein einziger Tod).
- **Impact:** Die Personas `progression_combat`/`speedrunner` (`grindCombat`) und jeder Sweep-Report, der
  `res.deaths`/`out.totalDeaths` als „Tode" ausgibt, ist **falsch**. Betrifft die Death-Zahlen im **gesamten** Sweep.
- **Owner:** Logic-Dev (`sim-player.ts`). Fix-Skizze: Tode aus dem `state.stats.deaths`-Delta lesen;
  monsterId-null-Enden separat als „aborts" inkl. `stopReason` führen.
- **⚠ Hinweis an CEO:** Death-/Tode-Zahlen in ALLEN Persona-Ausgaben dieses Sweeps mit Vorsicht lesen.

### 3. [P2/balance] Default-„attack"-Stance → neuer Melee unterskaliert (36 Tode/Std, Hard-Wall an `boar` L10) — **confirmed, downstream eines AKZEPTIERTEN Punkts**
- Das Briefing führt „Standard-Stance trainiert nur `attack`" als **KNOWN & ACCEPTED** (Chef-Entscheidung offen).
  Ich melde das **nicht** als neuen Bug, sondern **quantifiziere die Frühgame-Kosten** als Entscheidungshilfe.
- **Mechanik:** `attack`-Stance trainiert nur `attack` → `power` (und damit `str`) bleibt L1 → `meleeDamage`
  bleibt nahe Basis. Zusätzlich drückt die CL-Formel `(attack+power)/2` das Kampf-Niveau.
- **Evidence:** Well-fed Melee-Ladder **WALL an `boar` (L10)** bei CL10 — 0 Kills in einem vollen 60-s-Fenster,
  skills `{attack:17, power:0, defence:9, vitality:11}`. Realistische 1. Stunde Melee: **36 echte Tode**.
  Gegenprobe: Melee mit `power=10` + `bronze_sword` tötet `boar` mühelos (2,7 Kills/min). Spieler-Fix:
  Stance auf **„power"** umstellen (`activeStanceMods` → `xpSkill:"power"`).
- **Owner:** Chef (Design-Entscheidung) + UI-Dev (Stance-Wahl früh sichtbar/erklärt machen — genau am
  ersten „großen" Weiden-Mob `boar` scheitert der Default-Spieler sonst).

---

## P3 — klein

### 4. [P3/balance] CL-Tempo-Disparität: Ranged levelt Kampf-Niveau ~2× schneller als Melee/Magie (Default-Stances) — **confirmed (Beobachtung)**
- **Ursache:** `combatLevel` = `0.25·(defence+vitality) + 0.5·max(meleeOff, rangedOff, magicOff)` mit
  `rangedOff = ranged` (direkt), `meleeOff = (attack+power)/2`, `magicOff = (magic_off+magic_def)/2`. Da im
  Default `power` (Melee) und `magic_def` (Magie „offensive") kaum wachsen, wird nur bei Ranged der volle
  Offensiv-Skill gewertet.
- **Evidence (well-fed, Ziel CL20):** ranged CL20 @35 min · magic CL18 @90 min · melee bleibt CL10 (Wall).
- **Owner:** Chef-Balance (Formel × Default-Stance-Interaktion). Reine Beobachtung, kein Bug.

---

## Positiv verifiziert (gerade gefixte Punkte — wirken, NICHT als Bug melden)

### 5. Runenkunst-Start-Blocker behoben — **confirmed fixed**
- `dim_essence` jetzt L1 erreichbar: `forage_dim_essence` (L1 → **349 Stück in 30 min**, hebt foraging auf L10)
  **und** Shop **8 g**. `craft_force_rune` @RC L1 (2 dim_essence) craftbar; `enchant_dim_focus` → `dim_focus`
  (offhand, `req magic_off:8`, `value 30`). Der frühere „dim_essence ohne Quelle < L20" ist zu. Kein Handlungsbedarf.

### 6. Tier-gerechte Pfeil-Drops — **confirmed fixed**
- `chicken` (L1) dropt `copper_arrow` (3–8), **kein** `iron_arrow`. `iron_arrow` erst ab `goblin_archer` (L22). Passt.

### 7. `dim_focus.value=30` — **confirmed fixed** (invertierter Wert korrigiert; Shop-dim_essence-Gold-Loop zu).

---

## Info / gesund (kein Handlungsbedarf)

### 8. [Info] Gold-Fluss früh gesund — **confirmed**
- Neuer Melee (starterKit) verdient **~2036 g in 1 h** (Kill-Gold). Reale Drop-Verkäufe nur **~582 g/h**
  (nicht inflationär). Erste Shop-Ausrüstung locker in der 1. Stunde leistbar: `bronze_sword` 130,
  `leather_body` 110, `wooden_shield` 90, `leather_helm` 55.
  *(Hinweis: ein früher gesehener „28 782 g aus Drops"-Wert war ein Test-Artefakt — verkauftes injiziertes
  Test-Food; nach Korrektur unauffällig.)*
- **Starter-Food dünn:** 20 `cooked_shrimp` (≈160 HP Heilung) sind für alle Stile in <10 min aufgebraucht;
  danach tragen Out-of-Combat-Regen + „voll heilen bei Tod" die Progression. Kein Blocker, aber trägt zu den
  36/30 Melee/Magie-Toden in der 1. Stunde bei (siehe #3). Kandidat für leichten Bump oder frühen Koch-Hinweis.

---

## Frühgame-Referenzdaten (aus der Sim)

**L1-Sammel-XP/h (Design-Werte):** woodcutting 2571 · fishing/mining/foraging/thieving 2400 · foraging(ashfields)
2250 — konsistent, keine Ausreißer. Gemessene 1-h-Läufe heben alle Starter-Gather-Skills auf **~L15** (mit
Mastery-Ramp) — gutes, greifbares Frühtempo.

**XP-Kurve L1–20:** L5 = 388 · L10 = 1154 · L15 = 2411 · L20 = 4470 (RS/Melvor-Stil). Δ pro Level flach früh
(83→497), passt zu den Monster-XP.

**Per-Monster-Effizienz (level-matched Melee, bronze_sword, well-fed):**
| Monster | Lv | HP | Kills/min | xp/h | g/h |
|---|---|---|---|---|---|
| chicken | 1 | 28 | 6,7 | 800 | 1600 |
| cow | 5 | 120 | 4,0 | 1440 | 2880 |
| plague_grub | 7 | 50 | 9,3 | 3360 | 5600 |
| boar | 10 | 230 | 2,7 | 3200 | 4480 |
| goblin | 15 | 150 | 4,3 | 6240 | 9360 |
| goblin_shaman | 18 | 242 | 3,0 | 6480 | 10080 |
| goblin_spearman | 20 | 258 | 3,0 | 7200 | 12240 |

Monoton steigend, keine toten Mobs (kein `kills=0` bei passendem Level) — die frühe Kill-Ladder ist gesund,
sofern der Spieler adäquat skaliert (siehe #3 Stance).

---

## Verdikt (Frühgame L1–20)
**fix-then-ship.** Keine P0/P1-Blocker im Frühgame; die Runenkunst-/Pfeil-/dim_focus-Fixes wirken. Vor EA
klären: (a) Ranged-Munitions-Runway/Auto-Reload (#1, Feel), (b) Melee-Default-Stance-Wall an `boar` als
UI-/Design-Entscheidung (#3). Tooling-Fix (#2) ist QA-intern, blockiert kein Ship, aber verfälscht sonst alle
Sweep-Death-Zahlen.
