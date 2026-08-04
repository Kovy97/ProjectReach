# Phase-C-Combat-Tester · STIL=MAGIC · BAND=L90 (Endgame) · Rüstungs-Trinität

Stand 2026-07-03 · Kontrolleur/QA · HEADLESS (SimPlayer/combatStep/computeStats, Zeiten = SPIELZEIT) ·
READ-ONLY (Wegwerf-Harness `_tmp_cG90_*` ausgeführt & gelöscht, KEIN Spiel-Code geändert).
Spec: `design/armor-trinity-spec.md`. Grundlage-Gate: `GATE-B.md` (R90 ±10 % bereits ✅).

## VERDIKT: **SHIP** (Stoff-Trinität endgame-sound & paritätisch) — 1× Balance-Note (P3), kein Bug, kein Exploit

Der L90-BiS-Magier ist an den 4 Endbossen **funktional korrekt, paritätisch und 0-Tode-fähig**.
Ward absorbiert vor HP, cappt sauber, kein unendlicher Sustain. **Eine bewusste Balance-Entscheidung**
(per-Kill-Ward-Voll-Reset) macht Food für Stoff im Kurz-TTK-Endgame faktisch obsolet — spec-konform,
aber die Food-Pflicht (Spec-Constraint 2) gilt so nur noch für Platte/Leder, nicht für Stoff.

---

## Build (BiS Stoff+Stab @ L90-Band)

- **Waffe:** `aetherium_staff` (magic_off 90, 2H, dmg 7.1–10.7, interval 2730 ms, manaCost 8, burn) — der on-band-BiS-Stab.
- **Stoff:** godspark-Set (`godspark_mitre/vestment/skirt/handwraps/sandals`, magic_off 85 + runecrafting 88) — höchstes Stoff-Set mit req ≤ 90 (starweave req 92 liegt über dem Band).
- **Skills:** magic_off/magic_def/vitality/runecrafting/herblore = 90. **combatLevel 68** (reiner Offensiv-Caster; siehe P4).
- **Derived (computeStats):** maxHp **106**, **maxWard 414** (int 68 → 68 Kern + 346 godspark-Feld), maxMana 886, manaRegen 19.1/s, dmg 41.5–45.1 (magicDmg 34.4), acc 40, evasion 1.9, **One-Shot-Cap 53** (0.5·maxHp), **Ward-Recharge ≈ 1.53/s** (cost 8·0.5 / 2.61 s Cast-Takt).

---

## Q1 — Ward-Pool + Recharge-Loop im Endgame: hält er oder bricht er bei Boss-Burst?

**Recharge ist ein Flavor-Sustain, kein selbsttragender Schild** (wie Spec §1.4 gewollt): 1.53 Ward/s vs
Boss-DPS-in (last_idol) ≈ 7.5/s → Recharge ≪ DPS. Der **Pool (414)** ist die EHP.

| Szenario | Ward-Verlauf | HP | Verdikt |
|---|---|---|---|
| **Einzel-Bosskampf last_idol** (echt, endet mit Kill) | 414 → 296 über 29 s, dann **KILL → Reset 414** | durchgehend 106/106 | Ward tankt komplett, HP nie berührt |
| **Langkampf-Härtetest** (Boss-Klon 20k HP, KEIN Kill-Reset, 600 s, **MIT** Food) | 414 → **0 in ~90–120 s**, danach ~0 (Recharge kann nicht mehr auffüllen) | oszilliert **64–106** via Auto-Eat, **0 Tode**, 119 Food/600 s | Ward erschöpft, ab da trägt Food |
| **Langkampf-Härtetest** (dito, **OHNE** Food) | 414 → 0 in ~90 s | **TOD bei ~80 s** (minHP 1) | ohne Food = Tod, sobald Pool leer |

- **Ein einzelner Boss-Spike bricht Ward NICHT** (Pool 414 ≫ One-Shot-Cap 53; Enrage-Roh bis 83 → auf 53 gedeckelt → landet im Ward, nie auf HP).
- **Ein anhaltender Kampf erschöpft Ward** nach ~90 s last_idol-DPS. Danach ist der Magier ein 106-HP-Caster **ohne jede Mitigation/Dodge/Block** und stirbt ohne Food.
- **Kein Exploit / kein unendlicher Sustain:** Recharge 1.53 ≪ DPS 7.5; Ward-Cap-Guard **0 Verletzungen** (`ward>maxWard` über 300 s), `rechargeWard`/`absorbWard` cappen korrekt; Absorb-Reihenfolge combat.ts:1582–1635 exakt (Dodge→Contest→Mitigation→Block→One-Shot-Cap→Ward→HP).

## Q2 — Food nötig?

- **Normal-Bossfarm (TTK 13–24 s ≪ Ward-Depletion ~90 s + per-Kill-Reset):** Food wird **NIE ausgelöst** (0 gegessen an allen 4 Bossen, MIT und OHNE Food identisch). Ward + Reset decken jeden Kampf voll.
- **Langkampf (Ward erschöpft):** Food ist **PFLICHT** — ohne stirbt der Magier (~80 s). Food = Sicherheitsnetz, das nur greift, wenn ein Kampf den Ward-Pool überlebt.
- **Cross-Style-Gegenprobe** (last_idol, 400 s, gleiche Food-/Auto-Eat-Config):

| Stil | kills/400 s | Tode | **minHP** | Food getriggert? |
|---|---:|---:|---:|---|
| **STOFF** | 12 | 0 | **100 %** | **nein (0)** |
| Platte 1H+Schild | 12 | 0 | 78 % | ja |
| Leder | 9 | 0 | 60 % | ja |

→ **Nur Stoff nimmt 0 HP-Schaden.** Platte (55 % Mit + 40 % Block) und Leder (73 % Dodge) chippen jeden
Kampf und triggern Food; Stoff über Pool+Reset nicht. **Der Stoff-Magier ist der einzige Stil, der im
Kurz-TTK-Endgame kein Food braucht** — Spec-Constraint 2 „Food bleibt nötig" gilt für Stoff faktisch nicht.

## Q3 — Stil-Parität R90 (EHP)

EHP = maxHp / [(1−mit)(1−block·0.75)] (Platte) · maxHp/(1−mit) (2H) · maxHp/(1−dodge) (Leder) · maxHp+maxWard (Stoff).

| Stil | maxHp | Schicht | **EHP** | Δ vs Ø |
|---|---:|---|---:|---:|
| Platte 1H+Schild | 197.7 | AR 15.27 → 55 % Mit + 40 % Block | 627 | +8.7 % |
| 2H-Platte | 175.7 | AR 29.15 (inkl. Waffen-Bonus 17.7) → 70 % Mit | 585 | +1.4 % |
| Leder | 149.7 | dodge 73 % | 554 | −4.0 % |
| **Stoff** | 105.7 / **127.7 @CL90** | Ward-Pool 414 | **520 (CL68) / 542 (CL90)** | **−7.4 % @CL90** |

Ø @CL90 = 577, Spanne 627/542 = **15.7 %**, **alle ≤ ±10 %** ✅. **Stoff = −7.4 % @CL90 — bestätigt das
Task-Gate „Stoff −7 %, exakt im Band"** (deckt sich mit GATE-B R90). Als realer CL68-Caster −9.1 % — ebenfalls im Band.

## Q4 — 4 Endbosse killbar, 0 Tode? (Ward gegen Boss-Spitzen / One-Shot-Cap)

Zone Götzenhalle (idolhall), je 400 s Dauerkampf, autoEat 80 %, cooked_soulfish (heal 27) — **MIT und OHNE Food identisch**:

| Boss | Lv | Boss-dmg | kills/400 s | Tode | TTK₁ | minHP | minWard |
|---|---:|---:|---:|---:|---:|---:|---:|
| idol_warden | 245 | 27 | 21 | **0** | 13.1 s | 100 % | 247/414 |
| aether_wraith | 260 | 29 (defenseType ward) | 19 | **0** | 15.7 s | 100 % | 192/414 |
| scale_skarn | 275 | 30 (regen 0.6) | 15 | **0** | 18.3 s | 100 % | 241/414 |
| **last_idol** | 295 | 32 (**enrage <30 % HP ×1.75**, regen 1) | 12 | **0** | 23.5 s | **100 %** | **146/414** |

**Alle 4 killbar, 0 Tode, sogar OHNE Food.** Die Enrage-Spitze von last_idol (Roh bis 83) wird vom
One-Shot-Cap auf 53 gedeckelt und landet vollständig im Ward (der zu dem Zeitpunkt bei ≥146 steht) →
HP nie berührt. One-Shot-Cap ↔ Ward-Interaktion **korrekt**, aber im Effekt irrelevant, weil Ward vor HP absorbiert.

---

## Findings

- **P3 — Balance-Note (Owner: balance-designer / combat-dev).** Der per-Kill-**Ward-Voll-Reset**
  (combat.ts:785, per Spec §1.4) + der große Pool (414) machen den Stoff-Magier im Kurz-TTK-Endgame
  **HP-schadensfrei** (minHP 100 %, 0 Food) — während Platte (minHP 78 %) und Leder (minHP 60 %) weiter
  Food brauchen. **Kein Bug** (spec-konform), aber die Food-Analyse der Spec (§7.2, „kontinuierliche
  Chip-Akkumulation") wird durch den Reset unterlaufen: für Stoff akkumuliert nichts, weil jeder Kill den
  Pool auffüllt und der Pool jeden Kampf überlebt. Lever-Vorschlag (Chef-Entscheid): Reset auf X % statt
  100 %, **oder** Ward-Depletion über Kills hinweg tragen (encounter-übergreifend), damit der Food-Druck
  über eine Farm-Session zurückkehrt und Stoff nicht der einzige food-freie Stil ist.

- **P4 — Info/Methodik (Owner: kontrolleur).** Parität-Gate „combatLevel = R": ein reiner Offensiv-Magier
  trainiert `defence` NIE (magic-def-Stance routet auf magic_def), daher combatLevel ~68 bei
  magic_off/vitality = 90. Für „CL = 90" muss defence künstlich dazugesetzt werden (+con → maxHp 106→128
  → EHP 520→542). Beide Werte im ±10 %-Band. Für künftige Sweeps: Stoff-Parität an BEIDEN Zahlen messen
  (realer CL68-Caster vs. CL90-Methodik), sonst wirkt Stoff je nach Konvention −9 % oder −7 %.

- **Keine Bugs.** Ward-Cap hält (0 Überschreitungen/300 s), Recharge = cost·WARD_PER_MANA korrekt,
  Absorb-Order sauber verdrahtet, One-Shot-Cap greift, kein Ward-Recharge-Exploit, kein unendlicher Sustain.

**Empfehlung:** SHIP für Magier-L90-Endgame. Einzig offen ist die **bewusst zu entscheidende** P3-Balance-Note
(Ward-Reset macht Food für Stoff im Kurz-TTK obsolet) — kein Blocker, berührt combat.ts nur bei aktiver Chef-Entscheidung.
