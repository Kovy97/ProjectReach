# Balance-Analyse: Kampf, Stats & XP (Pass 2)

> Erstellt: 2026-06-23 · Datengetriebene Analyse durch Simulation (`sim.test.ts`) + Handrechnungen.
>
> **✅ ANGEWANDT (2026-06-23):** Alle Empfehlungen P1–P3 umgesetzt und verifiziert.
> - P1 Prozent-Mitigation `def/(def+100)` (`DEFENSE_MITIGATION_K=100` in shared, `resolveAttack`).
> - P1 evasion `dex·1 + sDefence·0.4`, defense `con·0.6 + wis·0.3 + sDefence·0.4 + sMagicDef·0.2`.
> - P2 `MELEE_XP_PER_DAMAGE` 0.085→0.13; Defence-XP beim Einstecken reaktiviert; Goblin-Kill-XP `≈level·0.6`.
> - P3 pitch_beetle dmg 13→18, mud_crab def 22→12, forest_hare eva 34→22.
> - **Verifiziert:** 159 Engine-Tests grün; Sim zeigt jetzt Tode gegen Über-Level-Bosse
>   (`last_idol` Lv120 deaths=4, `roc_storm` Lv75 deaths=2 — vorher 0); „unbesiegbar"-Warnungen 4→1.

---

## Zusammenfassung

Der gemeldete „Warlock macht kaum Schaden"-Bug ist **kein Warlock-Problem, sondern ein systemischer
Mitigation-Defekt**: Die Schadensminderung `Math.max(1, raw − defense·0.5)` in `resolveAttack`
(`combat.ts:132`) ist **flach** und subtrahiert direkt vom Rohschaden. Schon ein **unbewaffneter**
Spieler hat durch CON-/Defence-Skill-Wachstum eine `defense` von 40–45, was die 24 Schaden des
Warlocks auf den **Bodenwert 1** drückt. Zusätzlich liegt die Spieler-`evasion` (60+) so hoch, dass
Monster nur ~55 % treffen. Folge: Der Sim-Baseline-Held stirbt gegen **kein einziges** Monster von
Lv1 bis Lv120 (0 Tode in der gesamten Tabelle).

**Top-3-Empfehlungen:**
1. **P1 — Mitigation auf Prozent-Modell umstellen** (`defense/(defense+K)`, K≈100) statt flacher
   Subtraktion. Behebt den Warlock-Bug *und* die globale „unsterblich"-Schwäche in einem Schritt.
2. **P1 — Spieler-`evasion`- und `defense`-Skalierung aus Attributen/Skills senken** (dex-Faktor in
   evasion von ×2 → ×1, defence-Faktor in defense von ×0.6 → ×0.4), damit Monster wieder treffen.
3. **P2 — Kampf-XP & Mob-XP anheben**, weil das Stil-Routing die Kampfprogression auf ~⅓ gedrosselt
   hat (`MELEE_XP_PER_DAMAGE` 0.085 → 0.13; Mob-`xp` der frühen Mobs 1→2…). Skilling-XP ist dagegen
   gesund.

---

## Warlock-Bug — Root Cause

**Datei:** `packages/engine/src/combat.ts`, Funktion `resolveAttack`, **Zeile 126–133**:

```ts
function resolveAttack(rng, atk, def) {
  const hitChance = atk.accuracy / (atk.accuracy + def.evasion);   // Z.127
  if (nextFloat(rng) > hitChance) return { hit: false, ... };
  const crit = ...;
  const raw = atk.damage * (crit ? atk.critDamage : 1);
  const damage = Math.max(1, Math.round(raw - def.defense * 0.5)); // Z.132  ← flache Mitigation
  return { hit: true, crit, damage };
}
```

**Warlock-Werte** (`content/src/index.ts:2534`): `damage: 24, accuracy: 78, evasion: 14, defense: 7`.

**Spielerwerte** kommen aus `computeStats` (`character.ts:181, 198`):
- `evasion = 10 + dex·2 + sDefence·0.8 + eq.evasion`
- `defense = (con + wis·0.5 + sDefence·0.6 + sMagicDef·0.3 + eq.defense) · defMult`

Attribute wachsen **ohne jede Ausrüstung** via Hybrid (`character.ts:99–107`):
`attr += floor(Σ trainierter Skill-Level / ATTRIBUTE_SKILL_DIVISOR=4)`. CON wird von
mining + defence + vitality + farming gespeist, dex von fishing + attack + ranged + thieving.

### Rechenbeispiel — **unbewaffneter** Idler, der bis zum Warlock gespielt hat (Scenario C)

Plausible Skill-Levels eines Spielers, der hier ankommt: attack 18, power 15, defence 18,
vitality 18, mining 25, woodcutting 20, fishing 20, farming 15, thieving 15, foraging 15.

| Wert | Ergebnis |
|------|----------|
| Attribute | str 13, dex 18, con 24, lck 8 |
| `defense` (defensiv-Stil) | **45.2** |
| `evasion` | **60.4** |
| `maxHp` | 341 |

**Warlock → Spieler:**
- Trefferchance = `78 / (78 + 60.4)` = **56 %**
- Schaden/Treffer = `max(1, round(24 − 45.2·0.5))` = `max(1, round(1.4))` = **1**
- effektive Gegner-DPS = `0.56 · 1 / 3.2 s` = **0.18 HP/s**
- Pro Kill (~11 s) verliert der Spieler **~2 HP = 1 % seiner 341 HP**.

→ Genau das gemeldete „nimmt kaum Schaden". Der Warlock-Schaden 24 wird durch `defense·0.5 = 22.6`
fast vollständig aufgefressen; der Rest fällt auf den `max(1, …)`-Boden.

**Wichtig:** Der Warlock ist sogar einer der *besseren* Mobs — seine hohe Basis-`damage` 24 ist der
einzige Grund, dass überhaupt mehr als 1 durchkäme. Bei einem moderat trainierten, *gerüsteten*
Helden (Scenario B, def 25) macht er 12/Hit — spielbar. Der Bug eskaliert also gerade beim
**unbewaffneten** Spieler, weil dessen `defense` rein aus Skills/CON identisch hoch bleibt, während
die Mob-Damage konstant ist.

---

## Befunde

### 1) Mitigation-Kurve ist gebrochen (flach statt prozentual) — **Kernproblem**

Symmetrie-Tabelle für je einen *level-angemessenen* Spieler (Kampf-Skills ≈ Mob-Level, mittleres
Gathering), unbewaffnet, Stil „attack":

| Monster | Lv | Mob-dmg | Spieler-def | wDmg/Hit | wHit% | Mob-DPS |
|---------|----|---------|-------------|----------|-------|---------|
| goblin | 1 | 4 | 10 | **1** | 63 % | 0.21 |
| goblin_shaman | 4 | 9 | 15 | **2** | 66 % | 0.44 |
| goblin_butcher | 10 | 18 | 25 | **5** | 60 % | 0.99 |
| goblin_warlock | 14 | 24 | 32 | **8** | 58 % | 1.55 |
| pitch_beetle | 14 | 13 | 32 | **1** | 52 % | 0.17 |
| skeleton_warrior | 16 | 18 | 35 | **1** | 54 % | 0.18 |
| ash_tyrant | 20 | 20 | 41 | **1** | 50 % | 0.17 |
| thorn_wolf | 20 | 18 | 41 | **1** | 51 % | 0.17 |

Bei **fast allen** Mobs bis Lv20 fällt der Schaden auf **1** (Boden), weil `defense·0.5` ≥ Mob-Damage.
Mobs mit hoher Damage-Spitze (Warlock 24, gray_wolf 30) sind die einzigen Ausreißer, die überhaupt
spürbar treffen. **Das ist genau verkehrt**: hohe Verteidigung soll Schaden *dämpfen*, nicht
*nullen*. Flache Subtraktion skaliert nicht — sobald `defense` die Mob-Damage erreicht, ist der
Spieler praktisch unverwundbar.

**Sim-Beweis** (`sim.test.ts`, Baseline-Held mit bronze_sword/leather_body/wooden_shield):
**0 Tode gegen jedes der 59 Monster**, inkl. `last_idol` (Lv120, damage 110) — der Held nimmt nirgends
genug Schaden, um zu sterben. Die „Auffälligkeiten" listen nur 4 *unbesiegbare* Mobs (zu tanky für den
Spieler-Output), aber **kein** „zu gefährlich".

### 2) Trefferchancen-Asymmetrie — Spieler trifft fast immer, Mobs nur ~55 %

`hitChance = acc / (acc + eva)`. Beide Seiten nutzen dieselbe Formel, aber die Werte sind asymmetrisch:

- **Spieler → Mob:** acc 100–140 vs. Mob-evasion 6–22 → **85–95 % Trefferchance** durchgehend.
- **Mob → Spieler:** Mob-acc 40–96 vs. Spieler-evasion 24–69 → **50–66 %**.

Der Spieler-`accuracy`-Grundwert ist 50 (+ dex·3 + attack·2 + 12 % Stilbonus) und liegt damit weit
über den niedrigen Mob-evasion-Werten. Gleichzeitig wächst Spieler-`evasion` (10 + dex·2 + def·0.8)
schneller als die Mob-`accuracy`. **Beide Effekte verstärken die Unsterblichkeit**: Mobs treffen
selten *und* machen dann nur 1 Schaden.

### 3) Combat-Style-Folgen — Progression real ~⅓ langsamer, Defence besonders zäh

Das neue Routing (`combat.ts:146–174`) gibt Nahkampf-XP nur noch an **einen** Skill (attack ODER
power ODER defence) statt früher an alle gleichzeitig. Effekte:

- **Offensiv-Progression ~⅓ langsamer**, weil attack+power nicht mehr parallel steigen. Da
  Attribute aus Skills kommen (Hybrid, `/4`), wächst auch str/dex langsamer → Schaden/Treffer
  steigen träger. `MELEE_XP_PER_DAMAGE = 0.085` (`shared:96`) ist auf das *alte* Multi-Skill-Modell
  geeicht (Kommentar nennt ×0.06-Skalierung „damit Kampf nicht 113× schneller levelt als Gathering")
  — diese Annahme gilt nicht mehr.
- **Defence levelt nur im Defensiv-Stil** und **nur beim Angreifen** (`combat.ts:428–429`):
  Schaden-Einstecken gibt **gar keine** Defence-XP mehr. `DEFENCE_XP_PER_DAMAGE = 0.11`
  (`shared:98`) ist **toter Code** — die Konstante wird nirgends mehr aufgerufen (verifiziert per
  Grep: nur Definition, keine Nutzung). Wer „attack" oder „power" spielt, trainiert **nie** Defence
  → CON/HP/defense bleiben niedrig, was paradoxerweise den Mitigation-Bug *abmildert*, aber die
  Progression unrund macht (Defence hinkt 2 Skills hinterher).
- Vitality bekommt weiterhin XP aus jedem ausgeteilten Schaden (`combat.ts:158`), wächst also
  unabhängig vom Stil — gut.

### 4) Monster-Progression — grundsätzlich sauber, einzelne Ausreißer

hp/damage/accuracy steigen monoton und plausibel mit dem Level. Auffälligkeiten:

- **`pitch_beetle` (Lv14, dmg 13)** vs. **`goblin_warlock` (Lv14, dmg 24)**: gleiches Level, fast
  doppelte Damage-Spanne. Beetle ist als „Tank" (def 8) gedacht, aber 13 Damage ist für Lv14 zu
  niedrig (vgl. goblin_butcher Lv10 = 18).
- **`forest_hare` (Lv12, evasion 34)** — extrem hohe Evasion für Lv12; im Sim-Report
  17.5 s/Kill, deutlich zäher als gleichstufige Mobs (rootling_gimp Lv12 = 28 s/Kill ist tank-gewollt).
- **`mud_crab` (Lv8, defense 22)** — defense 22 auf Lv8 ist extrem (mehr als skeleton_warrior Lv16 mit
  12). Im Report 45 s/Kill — als Lv8-Mob viel zu zäh (Panzer-Gimmick übertrieben).
- **Coast/Wildwood-Mobs** haben durchweg höhere `xp`-Werte als die Borderlands-Goblins gleichen
  Levels (z.B. mud_crab Lv8 xp 9 vs. mire_crawler Lv8 xp 1). Die **Borderlands-Goblins (Lv1–14)
  geben nur xp 1–4** — viel zu wenig (s. Befund 5/Empfehlung).
- Generell: Mob-`accuracy` ist gegen die hohe Spieler-`evasion` *zu niedrig* (s. Befund 2).

### 5) Skilling-XP — gesund, keine „1-XP-Durststrecken" mehr

Die früheren Fixes (K=150 in der XP-Kurve, `earlyXpMult` bis L40, min-Erträge) wirken. Effektive
XP/Aktion (Beispiel mine_copper, Basis-xp 2, 3.5 s):

| Level | earlyXpMult | XP/Aktion | kumuliert |
|-------|-------------|-----------|-----------|
| L1 | 3.00 | 6.0 | — |
| L10 | 2.54 | 5.1 | ~12 min auf L10 |
| L20 | 2.03 | 4.1 | ~55 min auf L20 |
| L40 | 1.00 | 2.0 | (Multiplikator ausgelaufen) |

Sim bestätigt: 4000–8000 XP/h für frühe Gathering-Aktionen, 5000–7000 XP/h für Smithing.
**Keine Aktion mit ≤1 XP/Aktion.** Skilling-XP ist **nicht** das Problem und braucht keinen Eingriff.
Einzig die `birds_nest`/`rough_garnet`-Bonusdrops (chance 0.01–0.02) sind sehr selten, aber das ist
gewollte Loot-Spannung, kein XP-Problem.

### 6) Krit-Floor & Lifesteal verschärfen die Unsterblichkeit

`critDamage = 1.5 + lck·0.02` und `MELEE_LIFESTEAL = 0.12` (12 % des ausgeteilten Schadens als
Heilung, `combat.ts:345–347`) bedeuten: Der Spieler heilt sich im Nahkampf bei jedem Treffer, während
er ohnehin kaum Schaden nimmt. Bei pDPS 10 und wDPS 0.18 (Warlock) ist Tod mathematisch unmöglich.
Lifesteal ist als Mechanik okay, aber bei korrigierter Mitigation neu zu bewerten.

---

## Empfohlene Änderungen

| Prio | Datei | Konstante / Formel | Ist | Soll | Begründung |
|------|-------|--------------------|-----|------|------------|
| **P1** | `engine/combat.ts:132` | Mitigation in `resolveAttack` | `damage = max(1, round(raw − def.defense·0.5))` | `const red = def.defense/(def.defense+100); damage = max(1, round(raw·(1−red)))` | Prozent-Mitigation skaliert: hohe defense dämpft, nullt aber nie. Warlock vs. unbew. Idler (def 45) → 43 % Reduktion → **17 statt 1** Schaden. Behebt Bug + globale Unsterblichkeit. |
| **P1** | `engine/character.ts:181` | `evasion` | `10 + dex·2 + sDefence·0.8 + eq.evasion` | `10 + dex·1 + sDefence·0.4 + eq.evasion` | Spieler-Evasion wächst zu schnell → Mobs treffen nur ~55 %. Halbieren bringt Mob-Trefferchance auf ~70–75 %. |
| **P1** | `engine/character.ts:198` | `defense` Skill-/Attr-Faktoren | `con + wis·0.5 + sDefence·0.6 + sMagicDef·0.3` | `con·0.6 + wis·0.3 + sDefence·0.4 + sMagicDef·0.2` | Senkt die rohe defense-Basis, damit auch nach P1-Prozentmodell die Mitigation eines *unbewaffneten* Spielers nicht trivial 40+ erreicht. Ausrüstung soll der Haupttreiber von defense bleiben. |
| **P2** | `shared/src/index.ts:96` | `MELEE_XP_PER_DAMAGE` | `0.085` | `0.13` | Stil-Routing gibt XP nur noch an 1 statt ~2 Skills → effektiv ⅓ langsamer. ×1.5 gleicht das aus, ohne das alte „113×"-Problem zurückzubringen. |
| **P2** | `engine/combat.ts:426–431` | Defence-XP beim Einstecken | (keine) | `addXp(state, "defence", result.damage · DEFENCE_XP_PER_DAMAGE)` im Gegner-Treffer-Zweig | Reaktiviert die tote Konstante `DEFENCE_XP_PER_DAMAGE`. Defence soll *auch* durch Schaden-Einstecken steigen (zusätzlich zum Defensiv-Stil), sonst hinkt es bei attack/power-Spielern dauerhaft. Siehe Struktur-Empfehlung. |
| **P2** | `content/src/index.ts` | Borderlands-Goblin-`xp` (Lv1–14) | goblin 1, shaman 1, rogue 1, …, warlock 4 | Faustregel `xp ≈ level·0.6` → goblin 1, shaman 3, butcher 6, warlock 9 | Frühe Mobs geben absurd wenig Kill-XP (1) ggü. gleichstufigen Coast/Wildwood-Mobs (mud_crab Lv8 = 9). Vereinheitlicht die Kill-XP-Kurve. |
| **P3** | `content/src/index.ts:2674` | `pitch_beetle.damage` | `13` | `18` | Zu schwach für Lv14 (Warlock gleicher Lv = 24). |
| **P3** | `content/src/index.ts:3043` | `mud_crab.defense` | `22` | `12` | def 22 auf Lv8 macht ihn zäher als Lv16-Mobs; 45 s/Kill im Sim. |
| **P3** | `content/src/index.ts:3079` | `forest_hare.evasion` | `34` | `22` | Lv12-Hase mit Evasion 34 ist ein unbeabsichtigter Mini-Tank. |
| **P3** | `content/*` Mob-`accuracy` (Lv1–20) | siehe Befund 2 | acc 40–78 | nach P1-Evasion-Fix neu vermessen; ggf. frühe Mob-acc +10 % | Erst nach evasion-Fix entscheiden — evtl. nicht mehr nötig. |

### Konkreter Code-Vorschlag P1 (Mitigation), zum Copy-Paste-Review:

```ts
// combat.ts, resolveAttack
const raw = atk.damage * (crit ? atk.critDamage : 1);
const reduction = def.defense / (def.defense + 100); // K = 100
const damage = Math.max(1, Math.round(raw * (1 - reduction)));
```

Wirkung der Mitigation bei verschiedenen K (Warlock dmg 24, Spieler def 45):

| Modell | Reduktion | Schaden/Hit |
|--------|-----------|-------------|
| **Ist** (flat ·0.5) | — | **1** |
| Prozent K=60 | 43 % | 14 |
| **Prozent K=100** (empfohlen) | 31 % | **17** |
| Prozent K=120 | 27 % | 17 |
| flat ·0.25 (Notlösung) | — | 13 |

K=100 gibt eine spürbare, aber nicht erdrückende Reduktion und skaliert sauber bis ins Endgame
(bei def 200 = 67 % Reduktion).

---

## Struktur-Empfehlung (Punkt 6): **JA — strukturell ändern, nicht nur Konstanten drehen**

**Empfehlung: Mitigation auf Prozent-Modell umstellen (P1) ist eine Struktur-, keine Konstanten-Änderung
— und sie ist zwingend.** Begründung:

- **Flache Subtraktion ist mathematisch nicht reparierbar durch Tuning.** Egal welchen Faktor man
  wählt (·0.5, ·0.25), es bleibt ein Schwellwert, ab dem `defense ≥ mobDamage` → Schaden = 1. Da
  defense über die Level unbegrenzt wächst, *jeder* Mob fällt irgendwann unter diese Schwelle. Nur
  ein **relatives** Modell (`def/(def+K)`) bleibt über alle Level monoton sinnvoll. Das ist der
  Standard in Melvor/OSRS-artigen Spielen und der Grund, warum dort defense nie „immun" macht.

- **Trade-off:** Das Prozent-Modell macht defense weniger „mächtig" bei niedrigen Werten (10 def =
  nur 9 % Reduktion bei K=100). Das ist *gewollt* — frühe Rüstung soll sich graduell anfühlen, nicht
  binär „unverwundbar". Risiko: Endgame-Tank-Builds könnten zu stark werden (def 300 = 75 %). Gegen­
  mittel: K leicht erhöhen oder Reduktions-Cap bei ~80 %.

**Zweite Struktur-Empfehlung: Separater Defence-XP-Pfad beim Einstecken (P2, `combat.ts:426`).**
Aktuell ist `DEFENCE_XP_PER_DAMAGE` toter Code und Defence levelt *nur* im Defensiv-Stil. Das ist
inkonsistent mit Vitality (das aus jedem Treffer XP zieht). Empfehlung: **Beides** — Defensiv-Stil
gibt den vollen Offensiv-XP-Anteil an Defence (wie jetzt), *und zusätzlich* gibt **jeder eingesteckte
Treffer** Defence-XP (reaktivierte Konstante). So levelt Defence auch bei attack/power-Spielern mit,
ohne dass man den Stil wechseln muss. Trade-off: minimal mehr Defence-Wachstum → nach P1-Fixes
unkritisch.

**Was NICHT ändern:** Die XP-Kurve (`leveling.ts`), `earlyXpMult` und die Skilling-XP-Werte sind
gesund (Befund 5). Hier nur Konstanten-Feintuning bei Kampf-XP (P2), keine Struktur.

---

## Verifikations-Plan

Nach Anwenden der Änderungen müssen folgende Sim-Kennzahlen plausibel/grün sein
(`cd packages/engine && pnpm exec vitest run src/sim.test.ts`):

1. **Tode > 0 bei Over-Level-Mobs.** Der Baseline-Held (bronze_sword/leather_body) soll gegen Mobs
   **deutlich über seinem Level** (z.B. `iron_revenant` Lv58, `roc_elder` Lv65, `last_idol` Lv120)
   **sterben** (`deaths > 0`). Heute: 0 Tode überall — das muss sich ändern.
2. **Warlock-Gegenprobe (Handrechnung):** Unbewaffneter Idler (def ~45) nimmt vom Warlock
   **15–18 Schaden/Hit** statt 1. Per `simulateCombat("goblin_warlock", …)` ohne equip prüfen:
   `secPerKill` darf steigen, aber `deaths` sollte bei Unterausrüstung > 0 werden.
3. **Mob-Trefferchance ~70 %.** Nach Evasion-Fix sollte ein level-angemessener Mob den Spieler in
   ~2 von 3 Schlägen treffen (heute ~55 %). Optional als Assertion in `combat.test.ts` verankern.
4. **Kampf-XP/h ≈ Gathering-XP/h Größenordnung.** Nach `MELEE_XP_PER_DAMAGE`-Anhebung soll Kampf-XP
   nicht > ~2× der besten Gathering-Aktion gleichen Levels liegen (vgl. `balance-combat-vs-gathering.md`).
5. **`findIssues` < heute.** Die 4 „unbesiegbar"-Warnungen (rootling_treemonster, moss_golem,
   skeleton_nekro, forest_bear) sollten **nicht zunehmen**; idealerweise bleiben sie als gewollte
   Über-Level-Gegner bestehen, aber es darf **keine neuen** „zu leicht"-Warnungen
   (`secPerKill < 1.5` bei Lv≥25) geben.
6. **Bestehende Tests grün.** `combat.test.ts`, `vitality.test.ts`, `styles.test.ts`, `stats.test.ts`,
   `regen.test.ts`, `enrage.test.ts` müssen weiter passen (ggf. erwartete Schadenswerte anpassen, da
   Mitigation-Formel sich ändert — das ist erwartet und Teil des Reviews).

---

## Anhang: Vollständige Sim-Kampftabelle (Auszug, Baseline-Held 1h, 0 Tode überall)

```
goblin            Lv  1  611 kills   5.9s/kill  deaths=0
goblin_warlock    Lv 14  131 kills  27.5s/kill  deaths=0   ← Bug-Mob, harmlos
ash_tyrant        Lv 20   72 kills  50.0s/kill  deaths=0
forest_warden     Lv 40   19 kills 189.5s/kill  deaths=0
iron_revenant     Lv 58    8 kills 450.0s/kill  deaths=0   ← Lv58, Held nimmt 0 Schaden
roc_storm         Lv 75    0 kills      --       deaths=6   ← einzige Tode der ganzen Tabelle
last_idol         Lv120    0 kills      --       deaths=0   ← Lv120-Boss tötet Held NICHT
```

Der Held überlebt den Lv120-Endboss ohne zu sterben (zu wenig Spieler-Output, aber auch null Gefahr):
der deutlichste Beleg für die gebrochene Mitigation/Evasion.
