# Itemization 2.0 — PFLICHT-GATE (§8) — Messbericht

**Rolle:** Kontrolleur (QA) · **Datum:** 2026-07-02 · **Modus:** headless, read-only (Temp-Messskripte via SimPlayer/Engine, danach gelöscht; `packages/**` unverändert)
**Gegenstand:** alle 3 Apply-Schritte gelandet (Rüstung=Attribute, Schmuck=Skill-Boosts, §6.2-Revert, SAVE_VERSION 48). Spec: `design/itemization-2-spec.md` §8.

## VERDIKT: ❌ **FAIL** — Gate-Kriterium 1 (3-Stile-Parität ±10 %) ist klar gerissen (Magie bis **+33 % über Mittel** bei L90, **+40 %** am BiS; Melee bis **−27 %/−38 %**). Kriterien 2–5 sind bestanden. Kein §8.2-Hebel adressiert die Ursache (DEX/LCK-Rider auf Stoff/Leder + doppelt zählende Stab-Tempo-Patches) → Paritäts-Re-Spec durch balance-designer nötig, NICHT shippen.

---

## Headless-Gates

| Gate | Ergebnis |
|---|---|
| `pnpm typecheck` | ✅ 5/5 Tasks, exit 0 |
| `pnpm exec turbo run test --force` | ✅ engine **85 Files / 555 Tests** + persistence 2 Files, alle grün (Cache umgangen) |
| `pnpm --filter @hearthforge/client build` | ✅ exit 0 (`✓ built in 7.78s`) |
| Balance-Sim: ECHTE WALLS (geared) | ✅ **(0)** |
| Balance-Sim: AUFFÄLLIGKEITEN Bronze-Baseline | ⚠ **(21)** — vor dem Apply akzeptierter Snapshot war **(12)** (sweep3 2026-07-01). +9 neue kills=0-Mobs (bull_boss L15, dust_vulture L34, mire_crawler L38, pitch_beetle L42, ash_tyrant L45, thorn_wolf L54, spectral_stag L58, bramble_witch L60, forge_demon L54 …). Alles Undergeared-Walls (per Chef-Prinzip akzeptiert) — die Zunahme passt zum spec-dokumentierten „früh weicher" (L10-Mitigation 0.39→0.33). Kein Blocker, aber akzeptierten Snapshot neu pinnen. |
| Skilling-Aktionen 0 XP/h | ✅ keine (nur die 2 bekannten Gold-only-Thieving-Aktionen ohne Output-Items) |
| UI-Crash-Gate | ✅ App-Root rendert nur `Root` + `ItemTooltipOverlay` (safe `useGameStateMaybe`); `GameStats`/`Toasts`/`PetCelebration`/`DeathPopup`/`OnboardingGuide` hängen alle in `MainLayout` (`apps/client/src/renderer/App.tsx:301,308-311`) |
| Verdrahtung §4/§6/§7 | ✅ `skillBoost` aggregiert aus Item+Set+Suffix (`character.ts:169-236`), lvlEff nur in Kampftermen; Guards 1+2 aktiv (`itemization-guards.test.ts`), Monotonie via `coreStatScore` inkl. modifiers/skillBoost (`sim-consistency.ts:108`); Sets tragen `bonus: {}` (leer) + modifiers/skillBoost; UI liest `skillBoosts`/`set.skillBoost` (Sidebar/CombatPage/CharacterPage/Tooltips) |
| Save-Migration v48 | ✅ `persistence/src/index.ts:981` = exakt Spec-Formel `3 + max(0, round(alt − 2.5))` inkl. v<47-Kette; persistence-Tests grün |

---

## Kriterium 1 — 3-Stile-Parität ±10 % (geared, on-tier craftbar): ❌ **FAIL**

**Methodik:** SimPlayer, alle 7 Kampf-Skills = Tier-Level, on-tier CRAFTBARES Gear (Melee=Metall+Schwert+Kiteshield · Ranged=Leder+Shortbow+Pfeile · Magie=Stoff+Stab; Craft-Skill nur fürs Equip-Requirement gesetzt: lw/rc — rc trainiert INT, ehrlicher Mage-Pfad), einheitliches Food (`cooked_soulfish`, Auto-Eat T0), Default-Stances, 30 Sim-Min je Zelle, gleiches Referenz-Monster je Bracket (ohne Regen/Slayer/Burn-Resist). **effDPS = MonsterHP / (Ø s/Kill − 3 s Kill-Cooldown)** — der Cooldown drückt alle gleich, Parität = relativ. Alle Zellen `deaths=0` (Auto-Eat maskiert Defense — bekannt, `qa/parity-final-measurement.md`).

| Bracket (Referenz-Mob) | melee | ranged | magic | Ratio vs Ø |
|---|---:|---:|---:|---|
| **L20/22 Steel** (bull_boss) | 3.29 | 3.29 | 3.74 | 0.96 / 0.96 / **1.09** ✓ knapp im Band |
| **L20/22 Steel** (goblin_butcher) | 2.98 | 3.02 | 3.42 | 0.95 / 0.96 / **1.09** ✓ |
| **L40 Mithril** (pitch_beetle) | 4.47 | 4.63 | 6.12 | **0.88** / 0.91 / **1.21** ❌ |
| **L40 Mithril** (dust_vulture) | 4.14 | 4.36 | 5.78 | **0.87** / 0.92 / **1.21** ❌ |
| **L60 Runite** (thorn_wolf) | 7.18 | 9.12 | 10.03 | **0.82** / 1.04 / **1.14** ❌ |
| **L60 Runite** (bramble_witch) | 7.31 | 9.19 | 10.13 | **0.82** / 1.03 / **1.14** ❌ |
| **L90 Aetherium** (wild_stag) | 12.08 | 15.40 | 21.86 | **0.73** / 0.94 / **1.33** ❌ |
| **L90 Aetherium** (reef_drowned) | 11.50 | 14.00 | 19.86 | **0.76** / 0.93 / **1.31** ❌ |
| **BiS L99** (Ø 4 Endbosse, godiron/voidhide/voidweave + godgem-Schmuck) | ~21.4 | ~33.8 | ~48.0 | **0.62** / 0.98 / **1.40** ❌❌ |

Referenz vor dem Apply: ±10 %-Band weitestgehend gehalten (parity-final 13/15 Zellen im 0.90–1.10-Band; die Stab-Tempo-Patches aus balance-pass3 waren explizit „self-checked ±10 % vs sword+scimitar"). **Der Apply hat die Parität gebrochen; der Bruch wächst mit dem Tier.**

**Ursachen-Dekomposition (L90, wild_stag):** Magie/Melee gemessen ×1.81. Treiber:
1. **Angriffs-Intervall ×1.50** (Melee 2000 ms vs Magie 1335 ms): Stoff trägt jetzt echte **DEX-Punkte** (godspark +5 Teile + Set +1 → −240 ms) **oben auf** den Stab-Tempo-Patch (aetherium_staff `attackIntervalMs −425`, `content/index.ts:3215` — ein VOR-Itemization-Paritätsfix, gegen die alte Item-Welt geeicht). Zusätzlich verlor Melee den alten Netto-Set-Tempo-Bonus des getragenen Subsets (§0.5 rechnete −25 ms fürs 9-Teile-Full-Set; das reale Worn-Subset Fullhelm/Body/Legs+Kite hatte netto **−115 ms** → Melee ist ~6 % langsamer als von der Spec angenommen).
2. **Krit-Faktor ×1.19**: Stoff trägt **LCK** (godspark Σ8 + Set 5 → Magie lck 16 vs Melee 9) → 27 %-Krit × 2.29 vs 15.4 % × 1.86.
3. maxHit ist fast paritätisch (61 vs 56) — die §5.2-Konversion der reinen Schadenszeilen stimmt. **Das Leck sind die Rider:** acc-Flats wurden ÷4 in DEX konvertiert („acc-Anteil ≈ ¼ des dex-Werts") und cc/cd wertbasiert in LCK — die restlichen ¾ des DEX-Punkts (Tempo/Krit/Eva) bzw. die Doppel-Wirkung von LCK (cc UND cd) kamen als **Gratis-Upside** dazu. Genau der Fehler, den §5.2 bei rangedDamage (÷0.85 Rider-Discount) bewusst vermied.
4. Ranged L60/L90 (+26/27 % über Melee) = derselbe Effekt in kleiner (ironhide/dragonhide-DEX + Set-DEX), plus Melee-Tempo-Verlust.

**Empfohlene Hebel (Soll: jede Zelle 0.90–1.10 vs Ø; Owner balance-designer → Spec-Nachtrag, content-dev wendet an):**
- **H1 — Stoff-DEX eliminieren:** alle `dex`-Punkte auf Stoff-Teilen und Stoff-Sets 1:1 → `int` umwidmen (Schaden statt Tempo/Krit-Rider). Wirkung L90: Magie-Intervall 1335→1575 ms ≈ −15 % DPS.
- **H2 — Stab-Tempo-Patches re-eichen** (sie waren Paritäts-Patches gegen die ALTE Welt, kein „Waffen-Design"): runite −195→−100, aetherium −425→−200, godiron −465→−230. Wirkung mit H1: Magie L90 ≈ 21.9 → ~13 (Band um Melee 12.1). (Bewusst als Ausnahme von „nicht an Waffen drehen" markiert — Alternative wäre, den gleichen Betrag über Stoff-INT-Abzug zu holen, was das Früh-/Mid-Game verzerrt.)
- **H3 — Stoff-LCK halbieren oder → wis** (godspark/voidweave): −3–5 pp Krit für den Caster.
- **H4 — Hide-DEX ab ironhide um ~⅓ trimmen** (bzw. in CON umwidmen): Ranged L60/L90 −6–10 %.
- **H5 — Melee-Tempo-Kompensation:** kleiner Set-Tempo-Kranz auf Metall-Sets T6+ (`attackIntervalMs −100`) ODER den Verlust in H2 einpreisen.
- Danach Re-Messung mit demselben Harness-Rezept (dieser Bericht, Methodik oben).

---

## Kriterium 2 — 0 geared-Walls: ✅ **confirmed**

- **boar L10, frischer Melee** (Skills 1, rusty_sword + leather_body + wooden_shield, cooked_trout): **26 Kills / 20 Sim-Min (78/h), 0 Tode** (46 s/Kill). ✓
- **4 Endbosse × 3 Stile, BiS-artig** (Kampf-Skills 99; godiron-Waffe; Metall/voidhide/voidweave; godgem_ring+amulet; je 30 Sim-Min, frischer Held pro Zelle): **alle 12 Zellen killbar, 0 Tode.**

| Boss | melee kills (s/Kill) | ranged | magic |
|---|---|---|---|
| idol_warden | 223 (8.1) | 290 (6.2) | 343 (5.3) |
| aether_wraith | 207 (8.7) | 277 (6.5) | 314 (5.7) |
| scale_skarn | 181 (9.9) | 238 (7.6) | 296 (6.1) |
| last_idol | 136 (13.2) | 191 (9.4) | 248 (7.3) |

Randnotiz (kein Gate-Kriterium): Endbosse sterben in 5–13 s inkl. Cooldown — das vor-dokumentierte „Faceroll-Endgame" (parity-final §Strukturell) besteht unverändert. Die Boss-Tabelle ist zugleich der stärkste Paritäts-Beleg (Magie ×2.2 Melee am BiS).

## Kriterium 3 — EHP-Stichproben: ✅ **confirmed** (im ±20 %-Fenster, kein Trim nötig)

Messung: Überlebenszeit ohne Food (Kampf bis zum 1. Tod, Cap 2 h) + analytisches EHP = HP/((1−Mitigation)·Trefferchance des Mobs); ALT-Seite aus den §6-ALT-Flats des getragenen Subsets + alten Formeln/Attributskala nachgerechnet.

| Referenzpunkt | NEU (hp/def/eva → EHP) | ALT analytisch | **EHP-Ratio** | Überlebenszeit o. Food |
|---|---|---|---:|---|
| früh: L10 Iron-Melee vs goblin | 36 / 5.6 / 3.0 → 74 | 32 / 7.1 / 2.8 → 71 | **1.04** | >2 h (kein Tod)¹ |
| mittel: L40 Mithril-Melee vs pitch_beetle | 85 / 15.0 / 6.9 → 303 | 75 / 17.6 / 5.6 → 274 | **1.11** | 1 030 s |
| endgame: L90 Aetherium-Melee vs wild_stag | 198 / 35.3 / 13.0 → 1575 | 178 / 46.9 / 10.4 → 1580 | **1.00** | >2 h (kein Tod)¹ |

¹ Melee-Sustain via intrinsischem `MELEE_LIFESTEAL` (Stil-Identität, `combat.ts:892-895`) übersteigt on-tier Mob-DPS — by design; das analytische Ratio trägt das Urteil.

Spec-Erwartung bestätigt: HP je Leiter +11–13 % (unter der prognostizierten +15–25 %-Obergrenze), def-Spitzen sinken (früh weicher: L10 def 5.6 vs 7.1), eva flacher (L90-Ranged eva 16 mit dragonhide vs alt ~24 analytisch), EHP ≈ neutral. **Kein §8.2-Trim-Hebel nötig.** Kehrseite: der UNDERGEARED-Frühbereich ist real härter (Bronze-Baseline 12→21, GATE-5-Todesmuster) — akzeptiert per Chef-Prinzip, deckt sich mit sweep5-P2 „Food-Ökonomie L8–25".

## Kriterium 4 — Skill-Boost end-to-end: ✅ **confirmed** (mit 1 P3-Befund)

Echter Content-Schmuck, L40-Mithril-Melee bzw. L90:
- `garnet_ring` (power+1, KEINE mods): attackDamage 14.860 → **14.940** (exakt +0.08 = Spec §4.3), `skillBoosts` korrekt aggregiert (mit mithril_set-Krönung → {power:3}).
- L90 + onyx/godgem-Stack (power+7 gesamt, defence+5): **maxHit 56 → 60**, def 35.3 → 36.7 — messbar sichtbar.
- **Anti-Exploit hart bestätigt:** attack 97 + Boost +3 (effektiv 100) → `canEquip(godiron_sword, req 99)` = **false** („attack Lvl 99 (aktuell 97)"); combatLevel vor/nach Anlegen identisch (40→40, 90→90); XP-Pfade lesen Basis-Level (Guard `itemization-guards.test.ts:175-204` grün).
- ⚠ **P3-Befund (Rundungs-Schlucker):** attack+3 (gemstone+diamond) änderte die GERUNDETE Accuracy **nicht** (30 → 30; +3·0.2·1.12 = +0.67 < Rundungsschritt) → Trefferquote vs pitch_beetle 93.8 % → 93.8 %. Auch garnet power+1 ließ maxHit bei 22 (Δroh +0.12). Kleine Boosts können also spürbar NICHTS tun — laut §4.3 „Flavor", aber ein Ring, der beweisbar keinen einzigen Anzeigewert ändert, ist ein Eyesore. Empfehlung: Accuracy in `DerivedStats` unrundet führen (nur Anzeige runden) ODER Attack-Boost-Wirkung 0.2→0.5 acc/Level. Owner: balance-designer (Entscheid) + logic-dev.

## Kriterium 5 — Ehrliche Läufe (RealisticPlayer pursue, 60 Sim-h): ✅ **confirmed** (mit 2 Toolkit-Notizen)

| Lauf | Ziele (CL30 · Skill30 · 25k Gold) | Endstand | Frictions |
|---|---|---|---|
| Seed 11 melee (smithing) | ◐ 93 % (CL 28) · ✅ 58 h 54 m · ✅ 18 h 40 m | CL28, total 187, 265 899 Gold, 6 215 Kills, 20 Tode; Gear: bronze_sword, leather_helm, apprentice_robe_body, copper_platelegs | 11 (5 Muster: „Wiederholt gestorben an goblin_* L18–24 @CL24–28") |
| Seed 22 ranged (fletching) | ✅ 53 h 47 m · ◐ 78 % (fletch 27) · ◐ 83 % (20 611) | CL30, total 181, 1 488 Kills, 14 Tode; Gear: copper_shortbow+copper_arrow, cowhide_cap, apprentice_robe_body | 30 (davon **25× „Munition leer"**) |

- **Durchkommen:** beide Läufe laufen 60 h ohne Deadlock/Wall; Ziele erreicht oder >78 %. Upgrades werden erkannt und getragen (rusty_sword→bronze_sword, cracked_bow→copper_shortbow; Gear-Score liest `modifiers`, `sim-realistic.ts:1560`).
- **Keine NEUEN Friction-Muster ×N:** beide Muster sind vor-dokumentiert und itemization-unabhängig — (a) wiederholte Tode an Mobs unter CL = sweep5-P2 „Food-Ökonomie L8–25" (inkl. Gear-Stagnation bronze/copper trotz 265k Gold — Quest-Reward-/Econ-Verhalten, sweep5 #4); (b) Munition-leer = bekanntes Ranged-Muster. Die Todesrate liegt im sweep5-Korridor (dort 13 Tode/30 h Worst-Seed).
- ⚠ **P3 (Sim-Toolkit, Owner logic-dev):** `RealisticPlayer.gearScore` ignoriert `item.skillBoost` (`sim-realistic.ts:1544-1562`) → Boost-only-Schmuck (z. B. garnet_ring: mods NULL, power+1) scored 0 und wird vom ehrlichen Spieler NIE angelegt. §8.4.4 „jeder Schmuck bringt einen lesbaren Boost" ist damit im Honest-Lauf nicht beobachtbar. Fix: Boost mit §4.3-Attribut-Gegenwert scoren (analog `coreStatScore`, `sim-consistency.ts:128-133`).
- ⚠ P4 (kosmetisch): gearScore gewichtet alle Attribute gleich (INT zählt für den Melee wie STR) — daher trägt der Melee ein apprentice_robe_body. Stil-Gewichtung wäre menschlicher.

---

## Findings-Liste (Severity · Fundstelle · Owner)

1. **P1 — 3-Stile-Parität gerissen** (L40 +21 %, L60 +14/−18 %, L90 +33/−27 %, BiS +40/−38 %): Ursache §5.2-Rider-Leck (acc→DEX ÷4, cc/cd→LCK ohne Rider-Discount) + doppelt zählende Stab-Tempo-Patches (`content/index.ts:3191,3215`) + Melee-Worn-Subset-Tempo-Verlust (§0.5-Modellfehler). Owner: **balance-designer** (Hebel H1–H5 oben, Spec-Nachtrag) → **content-dev** (Apply) → Kontrolleur (Re-Messung).
2. **P3 — kleine Boosts verschwinden in der Rundung** (attack+3 → ±0 Accuracy-Int; power+1 → ±0 maxHit @L40). Owner: **balance-designer/logic-dev**.
3. **P3 — Sim-Toolkit: gearScore blind für skillBoost** → Boost-Schmuck im Honest-Lauf unsichtbar. Owner: **logic-dev** (Toolkit).
4. **P3 — Bronze-Baseline-Snapshot 12→21** Auffälligkeiten (undergeared, akzeptiert, aber Drift dokumentieren/neu pinnen; zusammen mit sweep5-P2 beobachten). Owner: **balance-designer**.
5. **P4 — gearScore ohne Stil-Gewichtung der Attribute** (Melee trägt INT-Robe). Owner: **logic-dev** (Toolkit).
6. Verifiziert OK (keine Findings): Guards 1–3, Boost-Isolation/Anti-Exploit, Migration v48 (Formel exakt), Set-`bonus` leer, UI liest skillBoosts, UI-Crash-Gate, 0 geared-Walls, EHP ±20 %.

## Empfehlung (eine Zeile)

**BLOCK / FAIL:** Itemization 2.0 nicht als „fertig" melden — Kriterien 2–5 stehen, aber die Kern-Zusage „3-Stile-Parität ±10 %" ist mit wachsendem Tier massiv verletzt (Magie-Decke bis +40 % am BiS); balance-designer muss die DEX/LCK-Rider auf Stoff/Leder + die Stab-Tempo-Patches nach-eichen (H1–H5), danach Re-Gate mit identischer Methodik.
