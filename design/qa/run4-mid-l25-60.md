# QA-Run 4 — Mid-Game Playtest (Level 25–60), nach Melee-/Mana-Fixes

**Tester:** Playtester-Analyst (READ-ONLY, kein Spiel-Code geändert) · **Datum:** 2026-06-27
**Scope:** Mid-Game L25–60. Kern-Auftrag: **3-Stil-Parität nach der Korrektur** (Melee `meleeDamage` ×1.8/×1.5 angehoben, Magie `manaCost` ×1.5). Zielband effektive DPS 0.9–1.1× — Melee darf nicht mehr Schlusslicht, aber auch nicht dominant. Plus: Gear-Progression, Combo-Food, Jewelcrafting, neue ember robe L30, Thieving-Toggle.
**Methode:** Temporäres Sim-Harness in der Engine (`_run4tmp.test.ts`, **nach der Analyse wieder entfernt**). Es wählt pro Stil & Level **automatisch das best-craftbare Gear** (Mainhand nach gemessener effDPS, Rüstung stilgerecht Platte/Leder/Robe, Jewelcrafting-Ringe/Amulett, passender Köcher/Munition), setzt für **alle drei Stile identische Skill-/Attributbasis** (alle Kampf-Skills + benötigte Crafting-Skills auf L → einziger Unterschied ist Gear + Stil-Formel) und misst (a) analytische **effDPS** aus `computeStats` inkl. Krit/Tempo/Munition/Mana-Nachhaltigkeit und (b) einen realen **1h-Kampf-Sim** (gleicher Mob je Level, Combo-Food + Heil-Sustain). Alle Zahlen sind gemessen. Abgeglichen mit `design/qa/run3-mid-game.md`.

---

## Fun-Score: **6 / 10** (run3: 8)

Die in Run 3 gemeldete Parität **reproduziert nicht**. Mit best-craftbarem Gear ist **Magie im gesamten Mid-Game klar dominant** (≈1.8–1.95× effDPS, im realen Kampf ≈2× kills/h), **Melee ist eindeutig Schlusslicht**, Fernkampf liegt dazwischen (≈1.2–1.4× Melee). Das Zielband 0.9–1.1× ist in **keiner** Stufe getroffen. Der angekündigte Melee-Buff (×1.8/×1.5) ist im Content vorhanden (Scimitar `meleeDamage` blacksteel 43 / mithril 48 / adamantium 62), **reicht aber nicht**, weil die strukturelle Ursache woanders liegt: Nur **Roben skalieren Offensive über die Rüstung** (per-Teil `magicDamage` **plus** `int`-Modifier, der via `int·2` doppelt in den Magieschaden geht), während Platte und Leder **null** Offensiv-Wert geben — Platte verlangsamt den Angriff sogar (`attackIntervalMs`-Penalty). Der `manaCost`-×1.5-Nerf verpufft im Mid-Game, weil die Mana-Regeneration die Kosten voll deckt (der Magier zaubert durchgehend, fällt nie in den Weak-Cast). Positiv: keine Abstürze, keine Walls (0 Tode aller Stile mit zeitgemäßem Food), und mehrere Run-3-Punkte sind sauber erledigt (tide_siren-XP-Trichter gefixt, ember robe L30 schließt die Magie-Kadenz, Combo-Food/Jewelcrafting decken alle Stile). Aber: In einem Idle-Spiel legt man sich auf einen Stil fest — eine ~2× DPS-Spreizung macht die Wahl zur Falle (Magie = no-brainer, Melee = Strafe). Das ist ein gravierender Mid-Game-Befund, kein Politur-Thema.

---

## Gemessene 3-Stil-Parität (Kern-Auftrag)

### effDPS aus best-craftbarem Gear (kein Food)
| Level | Melee | Ranged | Magie | Ranged/Melee | **Magie/Melee** | im Band 0.9–1.1? |
|---|---|---|---|---|---|---|
| **L30** | 43.7 | 56.5 | 79.4 | 1.29× | **1.82×** | ✗ (alle drüber) |
| **L40** | 63.0 | 77.3 | 113.7 | 1.23× | **1.81×** | ✗ |
| **L55** | 89.1 | 126.9 | 173.9 | 1.42× | **1.95×** | ✗ |

(Gewählte Waffen je Stufe: Melee Scimitar — NICHT Maul, der effDPS-Optimierer meidet ihn korrekt; Ranged Shortbow + bestes Pfeil-Tier; Magie Wand — schneller → höhere effDPS als Staff.)

### Realer 1h-Kampf-Sim (gleicher Mob, Combo-Food ab Req-Level + Heil-Sustain)
| Level (Rep-Mob) | Melee kills (s/Kill) | Ranged kills (s/Kill) | Magie kills (s/Kill) | Tode |
|---|---|---|---|---|
| L30 (skeleton_icemage Lv30) | 475 (7.6s) | 678 (5.3s) | **787 (4.6s)** | 0/0/0 |
| L40 (pit_spider Lv42) | 692 (5.2s) | 929 (3.9s) | **1506 (2.4s)** | 0/0/0 |
| L55 (ember_elemental Lv52) | 779 (4.6s) | 1314 (2.7s) | **1942 (1.9s)** | 0/0/0 |

Der reale Sim **bestätigt und verschärft** das effDPS-Bild (bei L40/L55 tötet Magie ~2.2–2.5× schneller als Melee — zusätzlich, weil Magie auch höhere `accuracy` hat und gegen ausweichende Mobs weniger verfehlt). **Melee ist in jeder Stufe und in beiden Metriken Letzter.**

**Δ vs run3:** Run 3 meldete Parität „innerhalb ~5 %" mit Melee leicht vorn (L40 Melee 39 / Ranged 24 / Magie 24 effDPS). Run 4 misst das **Gegenteil**: Magie +80–95 %, Melee Schlusslicht. Die wahrscheinlichste Erklärung ist, dass Run 3 die Magie mit **un-vollständigem Roben-Gear** gemessen hat (die `int`-Modifier der Roben kompoundieren stark, sobald das volle Set sitzt). Die seitdem aufgespielten Fixes (Melee-Buff + Mana-Nerf) sollten Melee helfen / Magie bremsen — netto bleibt Magie trotzdem dominant, **die Parität ist regrediert.**

---

## Priorisierte Findings

### [P1 Balance] Stil-Parität gebrochen — Magie dominant, Melee Schlusslicht
**Befund (gemessen, s. Tabellen):** Magie 1.8–1.95× Melee-effDPS, Ranged 1.2–1.4×, über alle L30/40/55; realer Kampf bestätigt ~2× kills/h für Magie. Zielband 0.9–1.1× in keiner Stufe erreicht. Der Melee-Buff ist drin (`packages/content/src/index.ts:1372/1505/1638`), bringt die Parität aber nicht.
**Fix-Richtung (balance/content-dev):** Magieschaden relativ senken **und/oder** Melee+Ranged eine Rüstungs-skalierende Offensive geben (s. nächster Befund). Faustregel zum Re-Tuning: Magie-effDPS auf ~Melee×0.95–1.05 ziehen.

### [P1 Balance] Strukturursache: nur Roben skalieren Offensive über die Rüstung
**Befund (gemessen):** Die Asymmetrie sitzt in den Rüstungs-Boni, nicht in den Waffen.
- **Roben** (`index.ts:3445` frost / `3491` ember / `3537` aether …): pro Teil `magicDamage` **+** `modifiers.int` (z. B. ember_robe_body `magicDamage:12, modifiers:{int:7,wis:2}`). `int` geht über `magicDamage = int·2 + …` (`character.ts:223`) **doppelt** ein. Volles 5-Teile-Set → ~+30 `int` → allein daraus ~+60 magicDamage, dazu die flachen `magicDamage` + Set-Bonus (`magicDamage` 10/14/18, `index.ts:9598/9606/9614`).
- **Platte** (`index.ts:1571` mithril_platebody `defense:42, maxHp:105, attackIntervalMs:200`): **0** Offensive, **+** Tempo-Strafe.
- **Leder** (`index.ts:2613` scaled / `2660` studded): **0** Offensive (nur `defense/evasion/maxHp`).
- Set-Boni mildern es nur teils: Platten-Set gibt `meleeDamage` (mithril +9 / adam +12, `index.ts:9549/9557`), Robe-Set `magicDamage` (+14/+18, leichter triggerbar bei minPieces 2 statt 3) — Leder-Set gibt **gar keinen** `rangedDamage`.
→ Ergebnis: Magie zieht aus Helm+Body+Beine+Hände+Füße massiv Offensive, Melee/Ranged praktisch nichts. Das ist der eigentliche Hebel, nicht die Waffenzahlen.
**Fix-Richtung:** Entweder Platte/Leder echte Offensiv-Beiträge geben (`meleeDamage`/`str`-Mods auf Platte, `rangedDamage`/`dex`-Mods auf Leder, analog zu den Roben-`int`-Mods) **oder** die Roben-`int`-Modifier deutlich kappen (sie doppel-dippen über `int·2`).

### [P2 Balance] `manaCost`-×1.5-Nerf ist im Mid-Game wirkungslos
**Befund (gemessen):** Die Mana-Regeneration deckt die Kosten voll → der Magier zaubert **jeden** Schlag, fällt nie in den `MAGIC_WEAK_FACTOR`-Notschlag (`combat.ts:606-611`). Beispiel L40: `manaRegen` ~6.9/s × Intervall 2.0s = ~13.8 Mana/Schlag verfügbar gegen `manaCost` 8 → Nachhaltigkeits-Faktor f=1.0. Selbst L30: 5.1/s × 2.14s ≈ 10.9 ≥ 8. `manaRegen` skaliert über `1 + wis·0.3 + eq.manaRegen` (`character.ts:252`) und die `int/wis`-Modifier der Roben (mehr `maxMana` über `int·5`) schneller als die Kosten. Der Nerf wäre erst relevant, wenn `manaCost` ≫ Mana/Intervall — im Mid-Game nicht der Fall.
**Fix-Richtung:** Wenn Magie über Mana gebremst werden soll, an `manaRegen`-Skalierung (oder einem Cast-Mana-zu-Schaden-Verhältnis) ansetzen, nicht an `manaCost` allein.

### [P2 Balance] Ranged bekommt keinerlei Offensive aus der Rüstung + Leder-Lücke L28→L50 unverändert
**Befund:** Leder-Bodies geben nur `defense/evasion/maxHp`, **kein** `rangedDamage` (`index.ts:2613/2660`); Ranged-Offensive kommt allein aus Bogen+Pfeil+Jewelcrafting. Zusätzlich besteht die in Run 3 (P3) gemeldete **22-Level-Lücke** weiter: craftbares Leder-Body springt von **scaled (L28)** direkt auf **studded (L50)** — mein Optimierer trägt bei L40 noch scaled_leather. Unverändert seit Run 3.
**Fix-Richtung:** Leder ein Offensiv-Element geben (`rangedDamage`/`dex`-Mods, analog Roben) und ein Zwischen-Leder-Tier ~L38–40 einschieben.

### [P3 Balance] Platten-`attackIntervalMs`-Penalty als eigenständiger Melee-Bremser
**Befund (gemessen):** Platte addiert pro Teil Tempo (mithril Body +200 / Legs +100, plus Helm/Hände/Füße), wodurch Melee bei L40 mit 2450 ms schlägt, während Wand (1780 ms) und Bogen (1828 ms, inkl. ×0.85) deutlich schneller sind. Das ist ein bewusstes „Platte = langsam"-Design, verschärft aber den DPS-Rückstand zusätzlich zur fehlenden Rüstungs-Offensive. Eigenständiger Hebel: Penalty senken oder durch Melee-Offensive auf Platte kompensieren.

---

## Erledigte Run-3-Punkte / positives Δ

1. **`tide_siren`-XP-Trichter gefixt** (run3 P2): `xp` 340 → **90** (`index.ts:8267`) — auf der Linie gleichstufiger L38-Mobs. Korrekt umgesetzt.
2. **Magie-Rüstungs-Kadenz gefixt** (run3 P2): die **ember robe L30–32** (`index.ts:3491` ff., Rezepte `7212` ff., Set `9603`) schließt die Lücke frost(22)→aether(40). Funktioniert wie geplant — **erhöht aber zugleich die Magie-Dominanz** (s. P1).
3. **Combo-Food vollständig & alle Stile** (`index.ts:153/161/169/177`): bloodgrain L38 (melee), duskfin L48 (ranged), spellwarden L52 (magic), soulgourd L58 (neutral). Heilt + bufft, greift im Auto-Eat-Pfad. Die Buffs sind allerdings klein (+4 Stil-Schaden) gegenüber der DPS-Lücke und ändern die Parität nicht.
4. **Jewelcrafting deckt alle Stile** inkl. `spellbinder_ring` L46 (magic, `index.ts:726`), warband_signet (melee), garnet/bloodstone (ranged). Monoton.
5. **Thieving-Toggle**: aus Run 3 verdrahtet (`tick.ts` + `THIEVING_RISK_MODS`); in Run 4 nicht erneut simuliert (Fokus Parität) — keine Regression beobachtet, Run-3-Befund (Wahl wirkt subtil) gilt unverändert weiter.

## Walls / Stabilität
Kein Wall, keine Trivialität, keine Abstürze: realer 1h-Sim über L30/40/55 → **0 Tode** in allen drei Stilen mit zeitgemäßem Food, monotone Mob-Skalierung. Das einzige Kern-Problem ist die Stil-Parität (P1).

---

### Methoden-Hinweis (Fairness)
Alle drei Stile teilen im Harness **dieselbe Skill-/Attributbasis** (alle Kampf-Skills + Crafting-Skills auf L) — der einzige Unterschied ist das Gear und die Stil-Formel. Set-Boni sind für **beide** Seiten aktiv (Platten-Set `meleeDamage` UND Robe-Set `magicDamage` in den Zahlen enthalten). Die hohe `dex`-Basis (von attack+ranged+leatherworking) kommt allen Stilen gleich zugute und hilft Melee sogar (Tempo/Krit) — die gemessene Magie-Dominanz ist damit eher **konservativ** (ein reiner Melee-Main mit niedrigerem `dex` stünde noch schlechter da). Das temporäre Harness wurde nach der Messung gelöscht.
