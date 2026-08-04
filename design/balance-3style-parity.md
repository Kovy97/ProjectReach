# Balance: 3-Stil-Parität (melee / ranged / magic) — Korrektur-Spec

**Autor:** combat-dev · **Datum:** 2026-06-27 · **Auslöser:** QA-Run 3 (`design/qa/run3-combat.md`), P1 "Nahkampf ist an jedem Checkpoint der langsamste Stil" + P1 "Fernkampf-Evasion zu hoch" + P2 "Magie überschießt mid-game / Mana inert".
**Chef-Entscheidung:** voll korrigieren.

Diese Datei dokumentiert (a) die ENGINE-Änderung (combat-dev, bereits umgesetzt), (b) die Melee-Waffenschaden-Buff-Faktoren für content-dev, (c) die manaCost-×1.5-Anweisung für content-dev, (d) die Nachher-Sim-Zahlen als Beleg.

---

## (a) Engine-Änderung (umgesetzt, combat-dev)

**Datei:** `packages/engine/src/character.ts`, `computeStats`.

Der flache Fernkampf-Stil-Evasion-Bonus `evasion += 5` im `if (style === "ranged")`-Block wurde **gestrichen**. Evasion kommt jetzt ausschließlich aus Attributen (`dex`), dem Defence-Skill (`sDefence`) und Gear (`eq.evasion`) — kein stil-intrinsischer Evasion-Aufschlag mehr.

Vorher:
```ts
let evasion = 10 + attr.dex * 1 + sDefence * 0.4 + eq.evasion;
if (style === "ranged") {
  critChance = Math.min(0.85, critChance + 0.1);
  attackIntervalMs = Math.max(1000, attackIntervalMs * 0.85);
  evasion += 5; // wendiger   ← ENTFERNT
}
```
Nachher: `const evasion = 10 + attr.dex * 1 + sDefence * 0.4 + eq.evasion;` und der ranged-Block behält nur noch Krit (+0.1) und Tempo (×0.85).

**Wirkung (Sim, gleiche dex):** ranged-Evasion ist jetzt **gleich** der Melee-Evasion (vorher höher). Fernkampf behält seine Identität "höchster Krit + schnellste Schläge", verliert aber den falschen Tank-Vorteil. Nahkampf bleibt über höheres def/hp (Platte = Gear, Content) der Tank. Magie hat (mangels dex/defence-Investment) wie gewollt die niedrigste Evasion.

> **Hinweis:** Es gab nur EINEN engine-seitigen Stil-Evasion-Bonus (`evasion += 5`), nicht zwei. Die im Auftrag erwähnte "zusätzliche Bogen/Ranged-Evasion" stammt aus Leder-Rüstung (Content) — siehe Punkt (c)/Content-Aufgaben.

**Guard-Test angepasst:** `packages/engine/src/styles.test.ts`
- Alter Test "Fernkampf … mehr Ausweichen als Nahkampf" → Assertion `ranged.evasion > melee.evasion` **entfernt** (war exakt die jetzt verworfene Balance), Titel auf "höhere Krit-Chance und schnellere Angriffe" gekürzt.
- Neuer Guard "Fernkampf-STIL gewährt KEINEN Evasion-Bonus mehr": assertet bei gleicher dex `ranged.evasion <= melee.evasion`.

---

## (b) Melee-Waffenschaden-Buff (Content-Aufgabe content-dev)

**Lever:** `bonus.meleeDamage` der Nahkampfwaffen-Linien (alle Tiers).

### Empfohlene Multiplikatoren auf `meleeDamage` pro Tier-Band

| Tier-Band (Waffen-Anforderung attack) | Faktor auf `bonus.meleeDamage` | Ziel |
|---|---:|---|
| L1–20  | **×2.0** | Früh-Game-Boden anheben |
| L20–40 | **×1.8** | Mid-Game |
| L40–60 | **×1.5** | Mid/Spät |
| L60–99 | **×1.3** | Spätgame (bereits nah am Band) |

Gilt für ALLE Nahkampf-Waffentypen (dagger/sword/scimitar/…), damit kein Typ relativ abfällt. Die Schwertlinie (P3-Trap, run3) sollte zusätzlich ihre eigene Nische bekommen (mehr `meleeDamage` als der Dolch als Ausgleich fürs langsamere Intervall) — siehe run3 P3.

### Wichtiger Vorbehalt zur Faktor-Höhe (bitte lesen)

Die Faktoren sind aus einem **waffen+attribut-Harness** abgeleitet (keine Rüstung), d.h. sie sind eine **Obergrenze**: Im echten, gegearten Spiel trägt Nahkampf Platte, die SELBST `meleeDamage` mitbringt (run3: melee dmg 257 @ L99 vs. Harness 207). Dadurch ist Melee real schon näher an ranged/magic als im Harness, und der nötige Waffen-Multiplikator ist eher **kleiner**. Konkret heißt das:
- Diese Faktoren als **Startpunkt** anwenden.
- Danach **gegearten Re-Sweep** (Tester-Sweep wie run3, mit Platte/Leder/Robe + Set-Boni) fahren und feinjustieren, Zielband **0.9–1.1×** über alle Checkpoints. Falls Melee dabei überschießt, Faktoren um eine Stufe senken.

### Struktureller Restbefund (Content, separat)
Bei **niedrigem Tier** kommt Fernkampfs Vorsprung kaum aus `ammoDamage` (copper_arrow nur +1), sondern aus dem **strukturellen +0.1 Krit** auf einem Niedrig-HP-Mob: ranged killt den 90-HP-Goblin oft in 3 statt 4 Treffern. Das lässt sich allein über Melee-Schaden nur via großem Multiplikator (Harness: ×4) schließen — das würde Magie überschießen. Saubere Ergänzung (Content, optional): den **ammoDamage der Low-Tier-Pfeile NICHT weiter anheben** und/oder den ranged-Krit-Vorteil im Frühtier nicht zusätzlich über Gear stapeln. Nicht zwingend für diese Runde — der Melee-Buff + Magie-Mana-Nerf bringen das Band bereits deutlich zusammen.

---

## (c) Magie-Throttle: `manaCost ×1.5` (Content-Aufgabe content-dev)

**Engine-Befund:** Es gibt **keinen** engine-seitigen Mana-Multiplikator. `castManaCost` (combat.ts) liest `item.manaCost` **pro Waffe** aus dem Content; Fallback ist nur der globale `MANA_PER_CAST` (=6, shared), wenn das Feld fehlt. → **Reiner Content-Lever, Engine bleibt unangetastet.**

**Anweisung an content-dev:** `manaCost` aller Magie-Waffen (Stäbe/Wands/Foki, alle Tiers) **×1.5** anheben (aufrunden). Aktuell z.B. Stab 5→16 über die Tiers → Ziel ~8→24. Damit läuft Mana im Dauerkampf real knapp, der `MAGIC_WEAK_FACTOR (0.35)`-Fallback und der Mana-Schild bekommen echte Opportunitätskosten (run3 P2/B4: Mana war inert, weil `manaRegen/Intervall > manaCost`).

Das adressiert beide Magie-Findings (P2-Überschuss + P2-Mana-inert) auf einmal. Falls der gegeared­te Re-Sweep zeigt, dass Magie mid-game weiter überschießt: zusätzlich `int·2 → int·1.7` (Logic-Dev, `magicDamage`-Formel in character.ts) ODER Aether-Set-`magicDamage` trimmen (Content) — **erst nach** Re-Sweep entscheiden, nicht überkorrigieren (L99 ist Magie bereits im Band).

---

## (d) Nachher-Sim-Zahlen (Beleg, NACH Engine-Evasion-Fix)

Temporäres Harness (`createGame`→`combatStep`, deterministischer Seed 12345, 1 h = 36000 Ticks, on-level Mob, Auto-Eat T3 + Essen satt, voller Köcher; **waffen+attribut-Build pro Stil, keine Rüstung** — isoliert die Stil-intrinsische Parität). Harness nach dem Lauf wieder entfernt.

### Baseline kills/h (nach Engine-Fix, vor Content-Buff)

| Checkpoint | melee | ranged | magic | eva melee / ranged / magic |
|---|---:|---:|---:|---|
| L10 vs goblin_butcher | 407 (1.00×) | 706 (1.73×) | 581 (1.43×) | 22 / **22** / 16 |
| L50 vs skeleton_nekro | 245 (1.00×) | 302 (1.23×) | 203 (0.83×) | 48 / **48** / 16 |
| L99 vs aether_wraith  | 334 (1.00×) | 380 (1.14×) | 331 (0.99×) | 80 / **80** / 16 |

**Evasion-Fix belegt:** ranged-Evasion ist jetzt **gleich** melee (22/48/80 statt vorher höher) — der falsche "Leder tankiger als Platte"-Effekt aus dem Stil-Bonus ist weg; verbleibende Gear-Evasion (Leder) ist Content. Magie hat wie gewollt die niedrigste Evasion (16).
*(Hinweis: ohne Rüstung steht Magie mid-game schlechter da als in run3, weil der Aether-Robe-Set-`magicDamage`-Bonus fehlt → Magies L50-Überschuss in run3 ist überwiegend GEAR/SET-getrieben, was der manaCost-Nerf + ggf. Set-Trim adressiert.)*

### Melee-Buff-Sweep: `meleeDamage ×factor` → kills/h relativ zum schnellsten Konkurrenten (pace)

| factor | L10 (pace=ranged 706) | L50 (pace=ranged 302) | L99 (pace=ranged 380) |
|---:|---|---|---|
| ×1.0 | 407 — 0.58× pace / 0.70× magic | 245 — 0.81× / 1.21× | 334 — 0.88× / 1.01× |
| ×1.5 | 513 — 0.73× / 0.88× | 290 — 0.96× / 1.43× | 393 — 1.03× / 1.19× |
| ×2.0 | 548 — 0.78× / 0.94× | 321 — 1.06× / 1.58× | 451 — 1.19× / 1.36× |
| ×2.5 | 548 — 0.78× / 0.94× | 352 — 1.17× / 1.73× | 498 — 1.31× / 1.50× |
| ×3.0 | 548 — 0.78× / 0.94× | 407 — 1.35× / 2.00× | 499 — 1.31× / 1.51× |
| ×4.0 | 768 — 1.09× / 1.32× | 435 — 1.44× / 2.14× | 663 — 1.74× / 2.00× |

Werte sind **quantisiert** (kills/h springt, wenn die Hits-to-Kill um eins fallen). Lesart:
- **L40–60:** ×1.5 bringt Melee auf 0.96–1.03× des pace → **×1.5 reicht** (überschießt Magie, die aber via manaCost-Nerf runterkommt).
- **L20–40 / L1–20:** ×2.0 ist der robuste Mittelwert (Melee an Magie heran, weiterhin unter ranged). Den ranged-Rest schließt der gegearte Re-Sweep (Platte-meleeDamage hebt Melee zusätzlich) + der strukturelle Frühtier-Krit-Hinweis (c).

→ Empfehlung (b) = ×2.0 (L1–20) / ×1.8 (L20–40) / ×1.5 (L40–60) / ×1.3 (L60–99), danach gegearter Re-Sweep auf Zielband 0.9–1.1×.

---

## Zusammenfassung Aufgabenverteilung
- **combat-dev (engine, ERLEDIGT):** Stil-Evasion-Bonus entfernt; Guard-Test angepasst; Sim gefahren.
- **content-dev:** Nahkampfwaffen `meleeDamage` ×Faktor pro Tier-Band (b); Magie-Waffen `manaCost` ×1.5 (c); danach gegearten Re-Sweep anstoßen.
- **logic-dev (nur falls Re-Sweep es verlangt):** `magicDamage`-Koeffizient `int·2 → int·1.7`.
