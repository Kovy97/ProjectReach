# Phase C — Combat-Tester · MELEE · Band L90 (Endgame) · Rüstungs-Trinität

Stand 2026-07-03 · Kontrolleur (Combat-Tester) · **HEADLESS** (SimPlayer/computeStats/combatStep, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_cM90_*` gelaufen & gelöscht.
Loadout: **BiS Godiron** (defence/attack 99 = Max-Level, alle Kampf-Skills 99). Gegner: die 4 Idol-Hall-Endbosse (L245–295). Fenster: 60 min/Seed, Seeds {1,7,13,29,42,101} = **6 h Spielzeit je Zelle**.

## VERDIKT: **SHIP (mit einem Balance-Vorbehalt)**
Kein P1-Blocker. Rüstung wirkt, 1H+Schild vs 2H ist EHP-fair (2H −5,6 %, durch DPS ausgeglichen), alle 4 Endbosse mit Food 0-Tode über 6 h, kein Mitigation-Cap-/Block-Stacking-Exploit. **Ein echter Befund (P2):** Melee-Lifesteal macht Food im Endgame für 3 der 4 Bosse faktisch überflüssig — die Spec-Constraint-2 („Food bleibt nötig") ignoriert Lifesteal und gilt für Melee-Endgame NICHT.

---

## Die 4 Gate-Fragen (mit Zahlen)

### (1) Rüstung bedeutsam? Mitigation nahe Cap? — JA bedeutsam / NEIN nicht nahe Cap
computeStats, echte Godiron-Werte (5 Platten-AR = 12,43; Kiteschild AR 4,14 / Block 0,43; 2H-Waffen-AR-Bonus 19,2):

| Loadout | Stance | maxHp | armorRating | Mitigation | Block | Ward* | Steh-EHP | Cap (0,80) erreicht? |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1H+Schild (Kite) | power | 292 | 16,57 | **57,0 %** | 43 % | 15 | 1004 | nein |
| 1H+Schild (Kite) | defensive | 292 | 19,06 | **60,4 %** | 43 % | 15 | 1090 | nein |
| 2H (Greatsword) | power | 268 | 31,63 | **71,7 %** | 0 % | 15 | 948 | nein |
| 2H (Greatsword) | defensive | 268 | 36,37 | **74,4 %** | 0 % | 15 | 1049 | nein |

- Rüstung ist die Grenze Tod/Überleben (ungepanzert ≈ 9 s Tod lt. Spec §7.1 / GATE-B); gepanzert überlebt der BiS-Held 6 h bei ~90–100 % HP.
- **Mitigation ist NICHT nahe Cap:** BiS liegt bei 57 % (1H) / 72 % (2H). Der 0,80-Deckel ist ein nicht-bindendes Anti-Invuln-Rail — gut (keine Unverwundbarkeit). Cap-Punkt = armorRating·defMult ≥ 50; 2H-defensive (36,37) ist mit Abstand am nächsten, aber ~13,6 roh entfernt.

*Ward 15 auf einem REINEN Melee-Held = der dokumentierte `WARD_CORE_PER_INT`-Leak (s. P3).

### (2) Food nötig oder trivial? — **TRIVIAL für 3/4 Bossen** (nur last_idol erzwingt Food)
6 Seeds × 60 min je Zelle. „NONE" = ganz ohne Food (nur Melee-Lifesteal + Mitigation):

| Boss (Lvl) | 1H mit Food | 1H OHNE Food | 2H mit Food | 2H OHNE Food |
|---|---|---|---|---|
| idol_warden (245) | 0 Tode, 98 % HP | **0 Tode, 98 % HP** | 0 Tode, 100 % | **0 Tode, 100 %** |
| aether_wraith (260) | 0 Tode, 90 % HP | **0 Tode, 90 % HP** | 0 Tode, 100 % | **0 Tode, 100 %** |
| scale_skarn (275) | 0 Tode, 95 % HP | **0 Tode, 95 % HP** | 0 Tode, 98 % | **0 Tode, 98 %** |
| last_idol (295, enrage ×1,75) | 0 Tode, 54 % HP | **8 Tode, 10 % HP** | 0 Tode, 54 % HP | **8 Tode, 25 % HP** |

- HP-Netto-Drift ohne Food gegen last_idol (5-min-Sonde, Lifesteal inkl.): **−0,079 HP/s (1H) / −0,025 HP/s (2H)** → Lifesteal deckt den DPS-in fast vollständig; nur die Enrage-Spikes reißen über Stunden vereinzelt Löcher (8 Tode / 6 h = ~1,3 Tode/h).
- Für idol_warden/aether_wraith/scale_skarn ist Food **überflüssig** — der Held steht 6 h foodless bei 90–100 % HP. Nur der Enrage-Boss (last_idol) macht Food wirklich nötig, und dort tut Food echte Arbeit (54 % min-HP selbst MIT Food).

### (3) 1H+Schild vs 2H EHP-fair? — **JA** (Gate-Richtung getroffen)
- Steh-EHP (power, Default-Offensivstance): 1H+Schild **1004** vs 2H **948** → **2H = −5,6 %**. Gate-Erwartung (1H +8 % / 2H +1 % ⇒ 2H ≈ −6,5 % relativ zu 1H): getroffen, richtige Richtung, in Toleranz.
- Gegenrechnung DPS: 2H holt den EHP-Verlust über Kills zurück (60-min-Kills, mit Food): idol_warden 1917 vs 1H 1877, aether_wraith 1695 vs 1626, scale_skarn 1538 vs 1478 (2H +2–4 %); nur last_idol ≈ gleich. Klassische Sword-and-Board-vs-2H-Wahl, EHP-fair. ✅
- 2H holt Schild-AR sauber über den Waffen-`armorRating`-Bonus (19,2) zurück; 71,7 % Mitigation statt 57 %+Block — Mechanik greift wie Spec §5.

### (4) Alle 4 Endbosse killbar, 0 Tode? — **JA, mit Food** (6 h/Boss, beide Loadouts)
Mit `cooked_soulfish` (27 Heal): idol_warden 0, aether_wraith 0, scale_skarn 0, last_idol 0 — **0 Tode über je 6 h**, beide Loadouts. Kill-Volumen 1188–1917 (last_idol am zähsten). Ohne Food fallen nur die 3 Nicht-Enrage-Bosse ebenfalls 0-Tod; last_idol braucht Food.

---

## Befunde (Priorität + Owner)

**P1 — keiner.** Kein Blocker im Melee-Endgame-Pfad.

**P2 (Balance) — Food für Melee-Endgame nahezu vestigial · Owner: balance-designer + combat-dev.**
Melee-Lifesteal (netto −0,03…−0,08 HP/s gegen den härtesten Boss) trägt den DPS-in bei 57–72 % Mitigation praktisch allein. 3 der 4 Endbosse sind 6 h foodless 0-Tod bei 90–100 % HP. Die Rüstungs-Trinität hat den Effekt verstärkt (höhere Mitigation → Lifesteal deckt leichter). Spec §7.2 („Food strukturell PFLICHT") rechnet Lifesteal NICHT ein und ist für Melee-Endgame widerlegt. Kein Bug, aber eine Chef-/Balance-Entscheidung: entweder als gewollte Melee-Sustain-Identität akzeptieren oder Lifesteal-Deckel / Enrage-Verbreitung nachziehen, damit Food seine Rolle behält. **Betrifft nur Melee** (Ranged/Magic haben keinen Lifesteal — separate Tester prüfen).

**P3 (bekannt, offen) — Ward-Sockel auf reinem Melee-Held (`WARD_CORE_PER_INT=1,0`) · Owner: logic-dev.**
BiS-Melee zeigt `maxWard = 15` (aus INT), d. h. ~15 HP Gratis-Absorb VOR HP + eine sichtbare Ward-Leiste, obwohl Ward eine Magier-Mechanik sein soll. Deckt sich 1:1 mit GATE-B Punkt 7 / TRIAGE (Empfehlung `WARD_CORE_PER_INT = 0`). Noch nicht angewandt — in Phase C weiterhin präsent. Kein Blocker (EHP-Ratio 1H/2H unberührt, da beide gleiches INT).

**P4 (Watch) — 2H-Mitigation näher am Cap · Owner: balance-designer.**
2H-defensive liegt bei 74,4 % (armorRating·defMult = 36,37; Cap-Punkt 50). Heute kein Exploit, aber zusätzliche `armorRating`-Quellen (Defensiv-Suffixe / Set-Boni / Buffs) könnten 2H schneller Richtung 0,80-Cap treiben als 1H (19,06) — dann würde weiteres armorRating verpuffen UND 2H über die intendierten −5,6 % hinaus stark. Beim nächsten Suffix-/Set-Pass mitprüfen.

**Kein Exploit bestätigt:** Block ist single-Offhand + `MAX`-Aggregation (kein Stacking); Mitigation-Cap 0,80 wird von keinem BiS-Melee-Build erreicht (kein Invuln); One-Shot-Cap bindet im Endgame nie (Low-Level-Rail).

---

## Methodik / Reproduzierbarkeit
- Held: `createGame({baseAttributes:{str:30,con:30}})`, alle `COMBAT_SKILL_IDS` = 99, Godiron 5-Platte + (Kiteschild | Greatsword), Stance power/defensive.
- `computeStats` → maxHp/defense/blockChance/dodgeChance/maxWard; Steh-EHP = `maxHp / ((1−red)(1−block·0,75))`, red = `min(0,80, def/(def+12,5))`.
- Überleben: `startCombat(boss)` + `fightFor(60min, restartOnDeath:true)`, Tode = `stats.deaths`-Delta, 6 Seeds summiert.
- Ergebnisse seed-stabil (Nicht-Enrage-Bosse 0 Tode in allen 6 Seeds; last_idol foodless deterministisch tödlich).
