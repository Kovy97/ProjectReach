# Sweep 3 — 01 Melee (reiner Krieger, Default „attack"-Stance → CL30)

**Rolle:** Kontrolleur (QA) · **Ziel:** Ein reiner Melee-Krieger in der Default-`attack`-Stance erreicht Kampf-Level 30.
**Datum:** 2026-07-01 · **Methode:** eigenes SimPlayer-Treiber-Testskript (`packages/engine/src/melee-sweep.test.ts`, angelegt → ausgeführt → **gelöscht**). Kein Spiel-Code geändert.

## Ziel erreicht? — JA (CL30 mit klarem Puffer, alle Verifikationsziele confirmed)

| Ziel | Ergebnis | Evidence |
|---|---|---|
| CL30 als reiner Melee, Stance bleibt `attack` | ✅ confirmed | CL30 erreicht im goblin_spearman-Tier (26→30), Endstand **CL36**; `combatStyle` blieb durchgehend `"attack"` |
| **Keine boar-L10-Wall mehr** | ✅ confirmed | Geared: **290 Kills/h @ boar, 0 Tode**. Nackte Baseline: Durchsatz **verdoppelt** sich (60→126 Kills/h), maxHit 18→47 — Schaden NICHT statisch = keine DPS-Wall |
| **power trainiert mit (55/45)** | ✅ confirmed (mit 1 P3-Nuance) | Nackt (nur rusty_sword): power **1→18**, maxHit **18→47** allein aus dem Split. Geared: power→32 |
| Melee-DPS als Parität-Referenz | ✅ gemessen | eff. DPS 5→22; Midgame (CL20–30) **~20–22 eff. DPS, maxHit ~115–125, Intervall ~2850 ms** |

## Verlauf — geared Krieger, Default `attack`, Food (grilled_boar_loin) + Auto-Eat T2

Effektiver DPS = zerstörte Gegner-HP / Sekunde (Durchsatz-Referenz für ranged/magic). Je 1 h Spielzeit/Tier.

| Tier | CL vor→nach | Kills/h | Tode | eff. DPS | maxHit | Int(ms) | maxHp | def | skills (nach) |
|---|---|---|---|---|---|---|---|---|---|
| chicken (L1)          | 1→11  | 640 | 0 | 5.0  | 33  | 2820 | 218 | 17 | atk15 pow10 def2 vit16 |
| cow (L5)              | 11→17 | 438 | 0 | 14.6 | 77  | 2800 | 288 | 23 | atk20 pow14 def9 vit26 |
| **boar (L10)**        | 17→22 | **290** | **0** | 18.5 | 104 | 2930 | 362 | 41 | atk25 pow18 def15 vit31 |
| goblin (L15)          | 22→26 | 426 | 0 | 17.8 | 106 | 2910 | 403 | 53 | atk29 pow22 def18 vit34 |
| goblin_spearman (L20) | **26→30** | 280 | 0 | 20.1 | 116 | 2870 | 407 | 46 | atk34 pow25 def23 vit36 |
| goblin_crossbower (L24)| 30→32 | 251 | 0 | 20.5 | 118 | 2870 | 445 | 58 | atk37 pow28 def26 vit38 |
| goblin_butcher (L26)  | 32→34 | 211 | 0 | 22.6 | 124 | 2850 | 436 | 49 | atk39 pow30 def29 vit39 |
| goblin_warlock (L30)  | 34→36 | 153 | 0 | 22.3 | 125 | 2850 | 471 | 62 | atk41 pow32 def29 vit40 |

- **CL30 erreicht nach ~5 h** (Spearman-Tier), keine Push-Zusatzrunden nötig (`extraPushHours=0`).
- **Tode/Tier = 0** mit realistischem Food (heal 42) + Auto-Eat T2 (isst @70 % HP). Melee ist mit Nahrung sehr überlebensfähig.
- `defence` wächst rein aus dem Getroffenwerden (`combat.ts:1050 grantDefenseXp`) → ein reiner Attack-Stance-Krieger levelt trotzdem def (bis 29) und kann Leder/Platte tragen; alle vier CL-Komponenten (attack/power/defence/vitality) steigen.

## Boar-Wall-Baseline (nackt: rusty_sword, KEIN Food/Gear — historischer Worst-Case)

```
start:   atk=1  pow=1  maxHit=18
@30min:  atk=17 pow=12 maxHit=38   kills=30  deaths=29
@120min: atk=24 pow=18 maxHit=47   kills(90min)=189 deaths=42
Kills/h: früh 60 → spät 126  (Durchsatz verdoppelt)
```
- Kernbeweis: **power steigt (1→18) und der maxHit mit ihm (18→47)** — genau der Effekt, den der 55/45-Split liefern soll. Vor dem Split blieb power bei 1 → statischer Schaden → Boar-Wall. **Wall ist weg.**
- Die vielen Tode hier sind die **akzeptierte Bronze-/Nackt-Baseline** (kein Food, keine Rüstung, HP regeneriert nicht im Kampf) — KEIN neuer Bug. Mit minimalem Food fällt sie sofort auf 0 (siehe geared-Tabelle).

## Findings

### [P3][balance] „55/45"-Label greift nur auf Per-Hit-XP — der Kill-Bonus (`monster.xp`) geht 100 % an attack — confirmed
- **Repro:** `grantOffenseXp` (`combat.ts:421-423`) splittet die Per-Treffer-Offensiv-XP korrekt 55/45 attack/power. Der Kill-Abschluss-Bonus in `onEnemyDefeated` (`combat.ts:448-449`) routet `monster.xp * xpMult` aber über `activeOffenseSkill` = `"attack"` — also **ungeteilt zu 100 % an attack**.
- **Erwartet (aus dem Kommentar „splittet die Offensiv-XP 55/45"):** power ~45 % der gesamten Offensiv-XP. **Tatsächlich:** globaler power-Anteil **28,9 %** (`attackXp=43152` vs `powerXp=17536`) → power hängt dauerhaft ~9 Level hinter attack (Endstand atk41 vs pow32).
- **Impact:** NICHT blockierend — power wächst klar mit, maxHit steigt monoton, kein Wall. Es ist ein Genauigkeits-/Erwartungs-Nit: `meleeDamage` (skaliert mit power+str) wächst etwas langsamer als das Label suggeriert; melee-Accuracy (attack→dex) eilt voraus.
- **Empfehlung (falls „echte" 55/45 gewünscht):** den Kill-Bonus im `attack`-Stance ebenfalls splitten — in `onEnemyDefeated` denselben `style==="melee" && combatStyle==="attack"`-Zweig wie in `grantOffenseXp` anwenden (`monster.xp*xpMult` → 55 % attack / 45 % power). **Owner:** Combat-Dev. Alternativ: Kommentar/Doku auf „Per-Hit-Schaden-XP 55/45, Kill-Bonus an attack" präzisieren (kein Code-Change).

## Parität-Referenz (für ranged/magic-Sweeps)
Reiner Melee, Default-Stance, on-level, mit Tier-Gear:
- **Midgame (CL20–30, Mobs L20–26): ~20–22 eff. DPS, maxHit ~115–125, Angriffsintervall ~2850 ms, 0 Tode mit Food.**
- Boar-Tier (L10, over-leveled): 290 Kills/h. Warlock (L30, on-level): 153 Kills/h @ 22 eff. DPS.

## Top-3
1. **Ziel erreicht:** reiner Melee, Default `attack`-Stance, erreicht CL30 in ~5 h (Endstand CL36), **0 Tode/Tier** mit Basis-Food. Ship-tauglich.
2. **Boar-L10-Wall bestätigt weg:** 290 Kills/h @ boar geared; nackte Baseline verdoppelt den Durchsatz, weil power (→18) den maxHit (→47) mitzieht — genau der 55/45-Effekt.
3. **1 P3-Nit:** Der 55/45-Split gilt nur für Per-Hit-XP; der Kill-Bonus geht ganz an attack → globaler power-Anteil 29 % statt 45 % (power hängt ~9 Level zurück). Nicht blockierend; optional Combat-Dev.

## Empfehlung: **ship** (P3-Split-Nit optional als fix-then-ship, nicht blockierend)
