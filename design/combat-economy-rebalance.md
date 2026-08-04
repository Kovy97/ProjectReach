# Combat-Economy-Audit & Rebalance-Spec (Gold + XP)

**Autor:** Balance-Designer · **Datum:** 2026-06-25
**Anlass:** Chef-Messung — ½ Tag reines `chicken`-Farmen → **Attack 53, Vitality 36, 272.000 Gold.**
**Verankert auf:**
- `packages/content/src/index.ts` → `monsters[*].gold` / `monsters[*].xp` (Mob-Leiter, 58 Mobs)
- `packages/engine/src/combat.ts` → `onEnemyDefeated` (Gold + Kill-XP-Routing), `addXp`, `grantOffenseXp`, `grantKillXp`
- `packages/shared/src/index.ts` → `MELEE_XP_PER_DAMAGE = 0.13`, `VITALITY_XP_PER_DAMAGE = 0.05`, `earlyXpMult`
- `packages/engine/src/leveling.ts` → RuneScape-XP-Tabelle (`xpForLevel`/`levelFromXp`)
- Konsistenz-Anker: `design/daily-quests-spec.md` (Daily-Gold), `design/combat-gold-and-thieving-audit.md` (Endgame-g/h-Leiter)

> **Reine Spec.** Es wurde KEINE Content-/Engine-Datei verändert (ein paralleler Agent editiert `content/index.ts`).
> Teil A (Gold-/XP-Werte je Mob) = **CONTENT** (content-dev). Teil B (Über-Level-Diminishing) = **ENGINE** (combat-dev).

---

## 1. Kern-Diagnose

Drei Faktoren multiplizieren sich zur Über-Belohnung von Trivial-Farming:

1. **Gold skaliert nicht mit Mob-Bedrohung.** `chicken` (Lv1, hp12, def0) trägt `gold: 9` — fast identisch zu `goblin` (`9`) und nur ~5× unter einem Lv40-Mob. Die Gold-Kurve ist im Low-Tier viel zu flach: das schwächste Vieh im Spiel zahlt fast so viel wie ein echter Progressions-Mob.
2. **XP skaliert NICHT relativ zur Mob-Schwierigkeit herunter.** Es gibt **keinerlei** Über-Level-Mechanik im Code. `addXp` (`combat.ts:56`) multipliziert nur mit `earlyXpMult` (level-basiert, NICHT mob-basiert). Ein Lv50-Held bekommt auf einem Lv1-Huhn **dieselbe** Per-Damage- und Kill-Bonus-XP wie ein Lv1-Anfänger. Das ist der Powerlevel-Kern.
3. **Der Kill-Bonus `monster.xp` wurde früher angehoben** (Chef: „×2–7") UND wird seit einem Fix tatsächlich vergeben (`combat.ts:262`, Kommentar: „bisher nur in der UI angezeigt, aber nie vergeben"). Für `chicken` ist `xp: 4` — bei ~2,6 s/Kill ein massiver XP-Strom, der ungebremst direkt in den aktiven Stil-Skill fließt.

### Reproduktion (analytisches Modell, deckt sich mit der Chef-Messung)

Per-Kill am Huhn: Schaden zum Töten = 12 hp → Stil-XP `12 · 0.13 = 1,56` + Kill-Bonus `4` = **5,56 Roh-XP**, je `× earlyXpMult(level)` (Lv1 ×2,0 … Lv40 ×1,0). Vitality `12 · 0.05 = 0,6`. Gold `9 · ~1,2` (Streuung +0..40 %) ≈ **10,8/Kill**.

| Kill-Zeit | Kills/½Tag | → **Attack** | → **Vitality** | → **Gold** |
|---|---:|---:|---:|---:|
| 2,6 s (Chef-Angabe) | 16.615 | **50** | **32** | **179.000** |
| 2,0 s (leicht gegeart) | 21.600 | **52** | — | **233.000** |
| 1,5 s (voll gegeart) | 28.800 | **55** | — | **311.000** |

→ Das Modell trifft die Chef-Messung (Attack 53 / Vit 36 / 272k) praktisch exakt; die 272k liegen zwischen 2,0 und 1,5 s/Kill, d. h. der Chef tötete gegen Ende des Halbtages spürbar schneller als 2,6 s. **Diagnose bestätigt.**

> Pacing-Befund: 2,6 s/Kill bei *vollen* Rewards ist generell zu schnell-reich — aber das ist nur ein Symptom. Die saubere Lösung ist nicht „langsamer töten", sondern Rewards an die **Bedrohungsdifferenz** koppeln (Teil B). On-Level bleibt 2,6 s völlig okay.

---

## 2. Die zwei Stellschrauben (Ist → Soll, Überblick)

| Hebel | Ist | Soll | Wirkung |
|---|---|---|---|
| **Low-Tier-`gold`** | chicken/goblin `9`, flach | bedrohungsbasierte Kurve `≈ 2 + 0.45·level^1.5` | chicken 9 → **2** |
| **Über-Level-XP-Mult** | existiert NICHT | `overLevelMult(skillLvl, mobLevel)` mit Grace 4, Slope 0,09, Floor 0,02 | ½-Tag-Huhn: Attack 50 → **~21** |
| **Über-Level-Gold-Mult** | existiert NICHT | *dieselbe* Funktion auch auf Gold-Drop | L40-Held auf Huhn: 10,8 → **0,1 g/Kill** |
| **Low-Tier-`monster.xp`** (Kill-Bonus) | chicken `4` | auf Kurve `≈ round(0.5·level^1.4)` zurück (chicken → **1**) | reduziert Trivial-Powerlevel zusätzlich, hält On-Level-XP-Curve |

Die **Über-Level-Mechanik (Engine)** ist der entscheidende Hebel — sie wirkt automatisch für ALLE Mobs und schließt das Schlupfloch dauerhaft, statt nur das Huhn zu nerfen. Die Content-Werte (Gold-/XP-Kurve) sorgen für eine saubere Leiter im *On-Level*-Fall.

---

## TEIL A — CONTENT (content-dev): Gold- & Kill-XP-Werte je Mob

### A1. Gold-Kurve

**Ziel-Formel (Referenz):** `gold(level) = max(2, round(2 + 0.45 · level^1.5))`. Glatt, low-tief, endgame-stark.

| level | 1 | 3 | 5 | 10 | 14 | 20 | 26 | 32 | 40 | 52 | 65 | 75 | 92 | 120 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ziel-Gold | 2 | 4 | 7 | 16 | 26 | 42 | 62 | 83 | 116 | 171 | 238 | 294 | 399 | 594 |

**Anwendungsregel (damit die in `combat-gold-and-thieving-audit.md` getunte Endgame-g/h-Leiter erhalten bleibt):**
- **Lv ≤ 24** (die Farm-Exploit-Zone): `gold` = Kurvenwert (CRUSH).
- **Lv > 24, kein Boss:** nur ändern, wenn aktueller Wert Ausreißer ist (`< 0,7×` Kurve → auf Kurve anheben; `> 1,8×` Kurve → auf `1,4×` trimmen). Sonst **behalten**.
- **Bosse behalten ihren Premium** (bewusst tanky, langsame Kill-Zeit → hohes Gold/Kill ist korrekt für g/h): `bull_boss, skeleton_nekro, forest_bear, deep_kraken, roc_storm, roc_elder, idol_warden, aether_wraith, scale_skarn, last_idol`.

### A2. Vollständige Vorher→Nachher-Tabelle (`gold`)

| id | level | current | recommended | note |
|---|---:|---:|---:|---|
| chicken | 1 | 9 | **2** | low-tier→Kurve (Kern-Fix) |
| goblin | 1 | 9 | **2** | low-tier→Kurve |
| ash_rat | 2 | 10 | **3** | low-tier→Kurve |
| cow | 3 | 11 | **4** | low-tier→Kurve |
| goblin_shaman | 4 | 12 | **6** | low-tier→Kurve |
| dust_vulture | 5 | 13 | **7** | low-tier→Kurve |
| goblin_rogue | 5 | 14 | **7** | low-tier→Kurve |
| boar | 6 | 15 | **9** | low-tier→Kurve |
| goblin_spearman | 6 | 15 | **9** | low-tier→Kurve |
| goblin_archer | 7 | 16 | **10** | low-tier→Kurve |
| mire_crawler | 8 | 17 | **12** | low-tier→Kurve |
| rootling_grunt | 8 | 18 | **12** | low-tier→Kurve |
| mud_crab | 8 | 22 | **12** | low-tier→Kurve |
| goblin_crossbower | 9 | 19 | **14** | low-tier→Kurve |
| goblin_butcher | 10 | 24 | **16** | low-tier→Kurve |
| bull_boss | 10 | 52 | 52 | Boss-Premium (behalten) |
| goblin_felmagician | 11 | 21 | **18** | low-tier→Kurve |
| goblin_stormcaller | 12 | 24 | **21** | low-tier→Kurve |
| rootling_gimp | 12 | 29 | **21** | low-tier→Kurve |
| forest_hare | 12 | 22 | **21** | low-tier→Kurve |
| goblin_warlock | 14 | 33 | **26** | low-tier→Kurve |
| pitch_beetle | 14 | 26 | **26** | (≈Kurve, no-op) |
| skeleton_warrior | 16 | 36 | **31** | low-tier→Kurve |
| rootling_gimp2 | 16 | 39 | **31** | low-tier→Kurve |
| skeleton_archer | 18 | 33 | **36** | low-tier→Kurve (anheben) |
| gray_wolf | 18 | 45 | **36** | low-tier→Kurve |
| ash_tyrant | 20 | 54 | **42** | low-tier→Kurve |
| thorn_wolf | 20 | 37 | **42** | low-tier→Kurve (anheben) |
| skeleton_spearman | 20 | 42 | **42** | (≈Kurve, no-op) |
| reef_drowned | 20 | 54 | **42** | low-tier→Kurve |
| moss_golem | 24 | 50 | **55** | low-tier→Kurve (anheben) |
| skeleton_butcher | 24 | 60 | **55** | low-tier→Kurve |
| wild_stag | 26 | 71 | 71 | keep (Band) |
| spectral_stag | 28 | 47 | **69** | nudge ↑ (unter-belohnt) |
| skeleton_icemage | 30 | 68 | 68 | keep |
| rootling_treemonster | 32 | 111 | 111 | keep |
| bramble_witch | 32 | 51 | **83** | nudge ↑ (unter-belohnt) |
| dire_wolf | 34 | 99 | 99 | keep |
| roc | 35 | 93 | 93 | keep |
| skeleton_pyroclasp | 36 | 89 | 89 | keep |
| tide_siren | 38 | 101 | 101 | keep |
| forest_warden | 40 | 125 | 125 | keep |
| pit_spider | 42 | 70 | **124** | nudge ↑ (deutlich unter-belohnt) |
| skeleton_nekro | 45 | 174 | 174 | Boss-Premium |
| forest_bear | 45 | 188 | 188 | Boss-Premium |
| slag_kobold | 46 | 78 | **142** | nudge ↑ (deutlich unter-belohnt) |
| roc_hunter | 50 | 139 | 139 | keep |
| ember_elemental | 52 | 87 | **171** | nudge ↑ (deutlich unter-belohnt) |
| iron_revenant | 58 | 130 | **201** | nudge ↑ |
| deep_kraken | 60 | 250 | 250 | Boss-Premium |
| frost_hound | 62 | 110 | **222** | nudge ↑ |
| roc_elder | 65 | 195 | 195 | Boss-Premium |
| frost_hexer | 68 | 126 | **254** | nudge ↑ |
| roc_storm | 75 | 253 | 253 | Boss-Premium |
| idol_warden | 92 | 189 | 189 | Boss-Premium |
| aether_wraith | 98 | 196 | 196 | Boss-Premium |
| scale_skarn | 104 | 285 | 285 | Boss-Premium |
| last_idol | 120 | 794 | 794 | Boss-Premium |

> Die „nudge ↑"-Zeilen (pit_spider, slag_kobold, ember_elemental, frost_*) sind ein **zweiter Befund**: das Mid-Game (Lv42–68 Nicht-Bosse) ist gegenüber der glatten Kurve aktuell *unter*-belohnt → eine Stufe (kein Cliff). Diese Anhebungen sind optional/sekundär; der Anti-Exploit hängt allein an der Low-Tier-Senkung + Teil B.

### A3. Kill-Bonus-`monster.xp` Low-Tier (sekundär, empfohlen)

Der angehobene Kill-Bonus verschärft das Powerleveling. **Ziel-Kurve:** `xp(level) ≈ max(1, round(0.5 · level^1.4))`. Konkret Low-Tier:

| id | level | current `xp` | recommended `xp` |
|---|---:|---:|---:|
| chicken | 1 | 4 | **1** |
| goblin | 1 | 5 | **1** |
| ash_rat | 2 | 4 | **1** |
| cow | 3 | 5 | **2** |
| goblin_shaman | 4 | 10 | **4** |
| dust_vulture | 5 | 5 | **5** |
| boar | 6 | 6 | **6** |

> Diese Senkung allein bringt das ½-Tag-Huhn (ohne Engine-Mechanik) nur von Attack 50 → ~46 — **unzureichend**. Sie ist Feintuning der On-Level-Curve, NICHT der Haupt-Hebel. Der Haupt-Hebel ist Teil B.

---

## TEIL B — ENGINE (combat-dev / logic-dev): Über-Level-Diminishing

**Das ist der eigentliche Fix.** Eine Mechanik, kein Datenwert. Genau ein Helper, an drei Stellen angewendet.

### B1. Die Funktion (Vorschlag, gehört nach `shared` neben `earlyXpMult`)

```
// Bedrohungs-Diminishing: XP/Gold fallen, wenn der aktive Skill den Mob-Level
// deutlich übersteigt. diff = aktiverSkillLevel - monster.level.
//   diff <= GRACE         -> 1.0  (On-Level + leicht drüber: voll)
//   darüber linear ab      -> 1 - (diff - GRACE) * SLOPE, geclamped auf [FLOOR, 1]
export function overLevelMult(skillLevel: number, monsterLevel: number): number {
  const GRACE = 4, SLOPE = 0.09, FLOOR = 0.02;
  const diff = skillLevel - monsterLevel;
  if (diff <= GRACE) return 1;
  return Math.max(FLOOR, 1 - (diff - GRACE) * SLOPE);
}
```

**Multiplikator-Kurve (über `diff = skillLvl − mobLevel`):**

| diff | 0 | 4 | 6 | 8 | 10 | 12 | 15 | 20+ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| mult | 1,00 | 1,00 | 0,82 | 0,64 | 0,46 | 0,28 | 0,02 | 0,02 |

### B2. Anwendungsstellen in `combat.ts`

Der „aktive Skill-Level" ist der Level des Skills, der die XP empfängt (Stil-Routing existiert bereits in `grantOffenseXp`/`grantKillXp`). Konkret:

1. **Offense-Per-Damage-XP** (`grantOffenseXp` → `addXp`, ~`combat.ts:223`): XP-Betrag `× overLevelMult(levelFromXp(skill.xp), monster.level)`.
2. **Kill-Bonus-XP** (`grantKillXp`, `combat.ts:262`): derselbe Faktor auf `monster.xp`.
3. **Gold-Drop** (`onEnemyDefeated`, `combat.ts:283`): `gold = round((monster.gold + Streuung) · overLevelMult(activeStyleLevel, monster.level))`.

> `monster.level` existiert bereits im Schema (`MonsterDef.level`, `shared:491`) → keine neuen Content-Felder nötig.
> Vitality-XP (`VITALITY_XP_PER_DAMAGE`) und Defence-XP **bewusst NICHT** diminishen — diese sind eingesteckter Schaden/Überleben und am Huhn ohnehin minimal; sie zu skalieren bringt Komplexität ohne Nutzen.
> Loot-Drop-Chancen bleiben unangetastet (Material-Farming für Crafting soll möglich bleiben; nur Gold + XP werden bedrohungsgekoppelt).

### B3. Wirkung auf das Exploit-Szenario (½ Tag Huhn, mit Teil A + B)

| Metrik | Ist (Bug) | mit Teil A | mit Teil A **+ B** |
|---|---:|---:|---:|
| Attack-Level | 50–55 | ~46 | **~21** |
| Gold (½ Tag) | ~272.000 | ~40.000 | **~3.000** (Floor 0,02 × 2 g/Kill) |
| effektives Attack-Ceiling (∞ Kills) | 99 | ~70 | **~35** |

→ Mit B wird Chicken-Farmen als Powerlevel- UND Gold-Quelle **strukturell unattraktiv**, ohne On-Level-Kämpfe anzutasten (diff ≤ 4 → mult 1,0).

> **Save-Logik:** Die Mechanik ist rein berechnend (kein neuer State) → **kein** `SAVE_VERSION`-Bump nötig. Falls combat-dev `GRACE/SLOPE/FLOOR` als tunebare Konstanten in `shared` ablegt, ebenfalls kein State.

---

## 3. Konsistenz-Check (Daily-Quests & Gesamt-Ökonomie)

- **Daily-Gold-Anker** (`daily-quests-spec.md`): very_easy Ø35, easy Ø76, medium Ø139, hard Ø287. Die neue Combat-Gold-Kurve bleibt darunter pro Kill, aber über die Stunde konkurrenzfähig — Dailies bleiben ein sinnvoller, planbarer Bonus statt von Trivial-Farming überholt zu werden. `daily_ve_kill_chickens` (5 Hühner → 30 g) ist mit chicken=2 weiterhin stimmig (Quest-Belohnung >> Kill-Gold, wie gewollt).
- **Endgame-g/h-Leiter** (`combat-gold-and-thieving-audit.md`): durch „Lv>24 nur Ausreißer ändern + Boss-Premium behalten" bleibt die dort getunte flache→gestufte g/h-Kurve intakt; die nudge-↑-Zeilen verbessern sie sogar (glattere Stufung).
- **Balance-Sim `AUFFÄLLIGKEITEN`:** Die Senkungen betreffen nur `gold`/`xp` (keine `kills=0`-Walls, keine 0-XP/h-Aktionen). `findIssues` prüft auf `kills===0` und `xpPerHour<=0` — beides bleibt grün. **Sim-Re-Run nach Anwendung empfohlen** (`pnpm test` → Sim-Block) zur Bestätigung, dass kein Mob durch die XP-Diminishing in der *geared*-Spalte auf 0 XP fällt (tut er nicht: der geared-Held bekämpft On-Level-Endgame, diff klein).

---

## 4. Apply-Liste (geordnet, für CEO → Agenten)

**ENGINE (combat-dev) — Priorität 1 (der Fix):**
1. `overLevelMult(skillLevel, monsterLevel)` in `shared` ergänzen (GRACE 4 / SLOPE 0,09 / FLOOR 0,02).
2. In `combat.ts` an 3 Stellen anwenden: Offense-Per-Damage-XP, Kill-Bonus-XP, Gold-Drop (B2). `monster.level` als Bedrohungsanker nutzen.

**CONTENT (content-dev) — Priorität 2 (Kurven-Hygiene):**
3. Low-Tier-`gold` (Lv ≤ 24) auf Kurvenwerte aus Tabelle A2 setzen (chicken 9→2 voran).
4. Low-Tier-`monster.xp` aus A3 senken (chicken 4→1 …).
5. *Optional/sekundär:* Mid-Game-„nudge ↑"-`gold` (pit_spider, slag_kobold, ember_elemental, frost_hound, frost_hexer, spectral_stag, bramble_witch, iron_revenant) auf Kurve anheben (glattere Leiter).
6. Bosse unangetastet lassen (Premium).

**QA — Priorität 3:**
7. `pnpm test` Sim-Block re-runnen → `AUFFÄLLIGKEITEN` grün, geared-Spalte ohne neue 0-XP/0-Kill-Mobs.

---

### Anhang — Methodik

Mob-Leiter maschinell aus `content/src/index.ts` geparst (58 Mobs). XP-Projektion gegen die echte `leveling.ts`-Tabelle (`acc += floor(n + 300·2^(n/7)); table[n+1] = floor(acc/4)`), inkl. `earlyXpMult`. Kill-Zeiten aus Chef-Messung (2,6 s) plus Sensitivitätsband. Analytisches Modell reproduziert die gemessenen In-Game-Werte (Attack 53 / Vit 36 / 272k) → Diagnose validiert. Geared-Sim-Bestätigung (`simulateCombat`, L90 + Götzeneisen) läuft separat und ist für die Spec nicht load-bearing.
