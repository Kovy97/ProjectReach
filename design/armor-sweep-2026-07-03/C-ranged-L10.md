# Phase-C Combat-Tester C — RANGED / Band L10

Stand 2026-07-03 · Headless (SimPlayer/computeStats, seeded RNG, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_cR10_sweep.test.ts` gelaufen & gelöscht.
Loadout: on-tier **iron_shortbow + iron_arrow** (ranged 10) + **cured-leather-Set** (Kappe/Wams/Beine/Armschützer/Stiefel, leatherworking 2–5) + cooked_chicken (Heal 3). Build: ranged 10 / vitality 10 / defence 10 → **combatLevel 10**. Auto-Eat Tier 0 (isst < 50 % HP, 3 s CD).

## VERDIKT: **fix-then-ship** (Kampf-Mechanik sauber; die zwei Ranged-Blocker sind KNOWN/Content, nicht Engine)
Dodge, One-Shot-Cap, Food-Loop und Über-Level-Gefälle funktionieren zahlengenau wie spezifiziert. Die zwei Ranged-Auffälligkeiten (Leder unter-spec + Leder auf `leatherworking` statt `ranged` gegated) sind **Content-/Spec-Owned** und decken sich mit GATE-B Lever 1 bzw. Spec §0 — kein Engine-/combat.ts-Fix nötig.

---

## Kern-Zahlen (combatLevel 10, on-tier Sets, alle mit voll HP gestartet)

| Stil | maxHp | Layer | EHP (Spec §7.3-Modell) | vs Ø |
|---|---:|---|---:|---:|
| **Leder/Ranged (mein Slice)** | 31.7 | dodge **34.4 %**, 0 Mitigation, 0 Block | **48.3** | **−14.8 %** |
| Platte/Melee 1H+Schild | 49.7 | 35 % Mitig + 15 % Block | 86.2 | +52 % |
| Stoff/Magier | 27.7 | maxWard 7.9 | 35.6 | −37.2 % |

Spread max/min = **142 %** (Spec-Ziel ±10 %). Leder-Bogen: attackDmg 3.86 [3.56–4.16], interval 2421 ms, crit 9.4 %, One-Shot-Cap = 15.9 (= 0.5·maxHp). Unarmored-Baseline: maxHp **17.7**, dodge 0 %.

---

## Die 5 Fragen — mit Zahlen

### (1) Fühlt sich Dodge bedeutsam an? Varianz/Pechsträhnen? — **JA, sauber (P4)**
Saubere Isolation (identische 31.7 HP, nur Dodge variiert), mean-TTD vs goblin L15, no-food, 20 Seeds:
| Build | maxHp | dodge | mean TTD | ×HP | ×Dodge |
|---|---:|---:|---:|---:|---:|
| unarmored | 17.7 | 0 % | 18.5 s | — | — |
| Leder ohne Dodge (evasionRating=0) | 31.7 | 0 % | 33.2 s | ×1.79 (HP allein) | — |
| **Leder mit Dodge** | 31.7 | 34.4 % | **53.6 s** | | **×1.61** |
- Dodge-Beitrag ×1.61 ≈ erwartetes `1/(1−0.344)=1.52` (Rest = One-Shot-Cap + RNG-Streuung). **Dodge wirkt exakt als flache Voll-Vermeidung**: gleiche Zahl gelandeter Treffer (~5.1 vs 5.5), nur über mehr Gegner-Angriffe gestreckt.
- Gesamt Leder-Set vs unarmored = **×2.9 Überleben** (HP ×1.79 · Dodge ×1.61).
- **Varianz** (Leder no-food vs goblin, 40 Seeds): TTD min **12 s** / median 58 / max 111 s, mean 58. Die min=12 s = reale Pechsträhne (zwei frühe Treffer trotz Dodge), aber der One-Shot-Cap verhindert die „2-aus-dem-Nichts = tot unter 2 Treffer"-Spirale. Swingy, aber fair — genau die gewollte Leder-Identität (Spec §1.3/§4.5).

### (2) Unarmored = Suizid? — **JA, für Idle non-viabel (P4, mit Nuance)**
No-food, on-level: unarmored stirbt vs goblin in ~9–21 s (mean 19 s, 0–1 Kills), vs boar 23 s/1 Kill. Break-even gegen EINEN Gegner, danach Tod — **kein Idle-Sustain, keine Farm**. Nuance: nicht die „9 s/3 Treffer" der Spec §7.1 (die galt für einen frischen L3-Held); ein auf CL10 geskillter, aber ungepanzerter Schütze hat con 5 → 17.7 HP und hält ~2× länger. Idle-untauglich bleibt es.

### (3) Food nötig & nicht trivial? — **JA, exakt spec-konform (P4)**
| Szenario vs goblin L15 (600 s) | Ergebnis |
|---|---|
| Leder **no-food** | Tod nach **69 s**, 3 Kills (kein Sustain) |
| Leder **+ cooked_chicken** (Heal 3) | **41 Kills / 0 Tode**, finalHP ~20/34.6 (~58 %) |
- Food **PFLICHT**: no-food-TTD 69 s ⇒ ohne Essen kein Dauerbetrieb. **Sufficient** on-level (0 Tode). **Nicht trivial**: cooked_chicken heilt nur 3 < ein einzelner Goblin-Treffer (5–9), 3 s-CD; der Held pendelt bei ~55–58 % HP (Netto ≈ 0 HP/s) — deckt sich 1:1 mit Spec §7.2 (Band 10 Netto −0.04 HP/s). Kein natürlicher Regen ⇒ struktureller Druck bleibt.

### (4) Stil-Parität EHP (GATE-WARNUNG) — **verifiziert, unter-spec (P2, KNOWN)**
- **Leder-Dodge-Wert verifiziert:** cured-Set evasionRating 7.07+10.6+7.77+4.57+4.39 = **34.4 → dodge 34.4 %**. Spec §4.1 Band-10-Ziel = **42 %**. Unter-spec um **−7.6 pp (−18 % rel.)**.
- **Leder-EHP 48.3** liegt **−15 %** unter dem 3-Stil-Ø und **≈ −33 %** unter der Spec-EHP-Ref 72 (Ziel Leder +5 % ⇒ ~76). Leder liefert nur ~63 % des intendierten EHP.
- **Stoff L10 −37 %** (GATE-WARNUNG) **bestätigt**: EHP 35.6 vs Platte 86.2; maxWard nur 7.9 (Spec-Ziel 31).
- Platte am unteren Band **über** (+52 %): iron-Platte trägt schwere con-Mods (con 21 vs Leder 12 vs Stoff 10) → höhere Basis-HP ZUSÄTZLICH zu Mitig+Block.
- **Root-Cause = Content-Leiter-Dichte am unteren Band, NICHT Formel/Wiring** (die computeStats-Schichten rechnen korrekt). Deckt sich exakt mit **GATE-B Lever 1** + Spec §11.4. → **KNOWN**, nicht neu. Owner: **content-dev**.

### (5) L10 + 2 drüber (Über-Level-Gefälle) — **playbar bis lethal, sauber gestaffelt**
Leder + food, 600 s:
| Ziel | Kills | Tode | no-food-TTD |
|---|---:|---:|---:|
| boar L10 dmg5 (on-level) | 31 | **0** | 86 s |
| goblin L15 dmg7 (on-tier) | 41 | **0** | 69 s |
| goblin_shaman L18 dmg9 (+3) | 28 | 2 | 35 s |
| goblin_rogue L19 dmg8 (+4, schnell 2600 ms) | 34 | 3 | 52 s |
On-level = 0 Tode (solides Idle-Farmen). +3/+4 drüber = spielbar, aber Food+Dodge decken nicht mehr voll (2–3 Tode/600 s; der schnellere rogue tötet öfter als der härtere shaman) → gewollter Progressions-Druck, kein Cliff.

---

## Bug-Checks (die zwei vom Auftrag geflaggten Interaktionen)
- **Dodge-Roll (combat.ts:1583):** `dodgeChance>0 && nextFloat<dodgeChance` ⇒ 0 Schaden, kein Contest. Empirisch bestätigt (×1.61, s. Q1). RNG wird nur bei dodge>0 gezogen (Alt-Content sequenz-identisch). **Kein Bug.**
- **One-Shot-Cap × Evasion (combat.ts:1626):** Cap greift NACH Dodge/Block, VOR Ward. Max. Einzeltreffer je Ziel ≤ 15.9 (=0.5·maxHp) durchgängig; **void_titan L242 dmg31** (extremes Über-Level, roh ~44 = One-Shot auf 31.7 HP) wird korrekt auf **15.85** gedeckelt (→ round 16 Anzeige). Garantiert ≥ 2 Treffer aus vollem Leben — schützt gerade den HP-armen Leder-Build vor Burst. Kein Dodge/Cap-Interaktions-Bug (Dodge nullt den Treffer VOR dem Cap; ein gelandeter Treffer wird unabhängig gecappt). **Kein Bug.**

---

## Findings (Severity · Owner)

**P2 — Leder-Layer nur über `leatherworking` (Crafting) erreichbar, nicht `ranged` — Ranged-spezifische Progressions-Falle + Spec-§0-Mismatch.** `content-dev`/CEO.
ALLE Leder-/Leichtrüstung ist `leatherworking`-gegated (cured-Set req 2–5), **null** Teile `ranged`-gegated. Spec §0 fordert explizit „`ranged` für Leder" (analog `defence`→Platte, `magic_off`→Stoff — beide KAMPF-Skills). Ein reiner Kampf-Schütze levelt `ranged` (Bogen), gewinnt aber **kein** leatherworking ⇒ kann die getestete 34 %-Dodge-Schicht **nicht** anlegen, ohne einen Crafting-Skill zu grinden. Asymmetrie: Melee/Magier schalten ihre Rüstung übers Kämpfen frei, Ranged nicht. Entscheidung nötig: Leder auf `ranged` re-gaten (spec-konform) ODER Crafting-Gate bestätigen + sicherstellen, dass leatherworking trivial früh erreichbar ist.

**P2 — Leder Band-10 unter-spec (EHP-Parität) — KNOWN (GATE-B Lever 1 / Spec §11.4).** `content-dev`.
Dodge 34.4 % (Ziel 42 %); Leder-EHP 48 vs Ref ~76 (−33 %) vs Platte 86 (−44 %); 3-Stil-Spread 142 % statt ±10 %. Verifiziert & quantifiziert, **nicht neu**. Sollwert: cured-Set-evasionRating auf dodge 42 % heben; Stoff maxWard 9→31 (Stoff-Tester-Slice).

**P3 — Starter-/Loot-Leder ohne Dodge-Schicht.** `content-dev`.
`leather_helm`/`leather_body` (Goblin-Drops, 4–5 %) tragen NUR `modifiers:{con:1}`, **kein** evasionRating ⇒ gelootetes Leder = 0 Dodge = auf der Vermeidungs-Achse effektiv unarmored. Nur die leatherworking-gecraftete `cured_leather_*`-Leiter trägt Dodge. Überschneidet sich mit dem GATE-B-Fixture-Befund (dead leather_body).

---

### Einordnung
Die Kampf-Engine für den Ranged/Leder-Stil ist **sound** — Dodge (bedeutsam, ×1.6), One-Shot-Cap (bindet korrekt), Food-Loop (nötig & knapp) und Über-Level-Gefälle stimmen zahlengenau mit der Spec. Beide P2 sind Content/Spec-Owned und berühren combat.ts/character.ts NICHT. On-level (boar/goblin) spielt sich als Idle-Farm einwandfrei (41 Kills/0 Tode). Empfehlung: **fix-then-ship** — P2-Leatherworking-Gate vom Chef entscheiden lassen, Leder/Stoff-low-band mit GATE-B Lever 1 bündeln.
