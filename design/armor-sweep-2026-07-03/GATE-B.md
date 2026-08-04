# GATE B — Rüstungs-Trinität (Itemization 2.5) · Kontrolleur-Verdikt

Stand 2026-07-03 · Headless (SimPlayer/simulateCombat/computeStats, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert.
Grundlage: `design/armor-trinity-spec.md` (§7 Nachweise) + `TRIAGE.md`. Temp-Gate-Skript ausgeführt & gelöscht.

## VERDIKT: **TRIM** (System sound & endgame-paritätisch; 3 kleine Hebel vor/parallel zu Phase C)
Phase C (12 Combat-Tester) **kann starten** — die Trinität ist funktional korrekt verdrahtet, geared-Walls = 0,
Endgame (R90) trifft ±10 % exakt. Die offenen Trims sind Content-Leiter-Dichte (bekannt, Spec §11.4) + ein
Config-Flag + ein Harness-Fix; alle berühren die Kampf-Engine NICHT. Testern die früh-Mage/Ranger-Squishiness
als **bekannten offenen Trim** vorab nennen (nicht als Neu-Befund re-melden).

## Voller Verify (headless)
- ✅ `pnpm typecheck` — 5/5 grün (exit 0)
- ✅ Engine-Tests — **657 passed / 92 Files** (inkl. `ward`, `armor-trinity-combat`, `mitigation`, `no-natural-regen`, `wiring-audit`)
- ✅ Persistence-Tests — grün (exit 0)
- ✅ `pnpm --filter @hearthforge/client build` — grün (exit 0)
- ✅ Sim-Report: **AUFFÄLLIGKEITEN (5)** = 2 Gold-only-Thieving + 3 Bronze-Walls (goblin/bull_boss/tower_goblin L15) · **ECHTE WALLS geared = 0**

---

## Gate-Kriterien (je Zahlen)

### 1. EHP-Parität ±10 % — **PARTIAL** (Endgame ✅, unter R60 aus wegen Content-Leiter-Lücken)
Modell-EHP (Spec-Methodik §7.3, echte Content-Werte, on-tier-Set + Waffe + Schild je Stil, combatLevel = R):

| Band | 1H+Schild | 2H-Melee | Leder | Stoff | Ø | Spanne | Verdikt |
|---:|---:|---:|---:|---:|---:|---:|---|
| R10 | 90 (+38 %) | 74 (+15 %) | 54 (−16 %) | 41 (−37 %) | 65 | 121 % | ❌ |
| R30 | 161 (+2 %) | 136 (−14 %) | 186 (+18 %) | 149 (−6 %) | 158 | 37 % | ❌ |
| R60 | 344 (+8 %) | 306 (−4 %) | 348 (+9 %) | 277 (−13 %) | 319 | 26 % | ⚠ marginal |
| R90 | 634 (+8 %) | 592 (+1 %) | 569 (−3 %) | 546 (−7 %) | 585 | 16 % | ✅ alle ≤ ±10 % |

Root-Cause (NICHT Formel/Wiring — Platte trifft ihre Spec-Werte exakt: R10 red 35 %/block 15 %, R90 red 55 %/block 40 %):
- **Platte-Leiter ist dicht & on-spec** (Iron @ defence 10, Blacksteel @ 30 …), **Leder/Stoff-Leitern sind dünn & unter-spec am unteren Ende.** Auto-Selektor greift on-tier je Gating-Skill:
  - R10 Leder = leatherworking-req 2–5 → dodge **34 %** (Spec-Ziel band-10 = 42 %). Nächste Leder-Sprosse erst leatherworking 22 → **Lücke 5→22**.
  - R10 Stoff = magic_off-req 1 (dim-essence) → maxWard **9** (Spec-Ziel band-10 = 31). Nächster Stoff erst magic_off ~30 → **Lücke 1→30**.
- Deckt sich 1:1 mit Spec §11.4 (offene Leder-/Stoff-Zwischen-Tier-Lücken).
- R60-Stoff −13 % ist statisch; die Ward-Recharge (+5–8 % effektiv, Spec §4.5) + der beobachtete Stoff-Sustain schließen das in der Praxis → real ~−6 %, in Toleranz.
- 2H −10…−14 % ist BEWUSST (Spec §4.5 Offense-Tradeoff), kein Fehler.

### 2. Unarmored = Suizid, Armor = überlebbar — **✅**
Frischer Held (combat lvl 3, keine Rüstungsschicht) vs on-level-Gegner:
| Band | FRISCH-unarmored TTK | armored (1H+Schild) |
|---:|---:|---|
| R30 (goblin_warlock dmg13) | **stirbt 10 s / 0 Kills** | überlebt 180 s / 10 Kills |
| R45 (ash_tyrant dmg17) | **11 s / 0** | 180 s / 7 |
| R65 (forest_warden dmg21) | **10 s / 0** | 180 s / 6 |
| R90 (skeleton_nekro dmg35) | **10 s / 0** | 180 s / 11 |

~10 s = 2–3 Treffer (deckt Spec §7.1). L15-goblin (dmg7) ist weicher (36 s), stirbt aber ebenfalls. Rüstung = die Grenze zwischen Tod und Dauer-Überleben.

### 3. Food nötig, nicht trivial — **✅ (strukturell), directional in-Sim**
- **Kein natürlicher HP-Regen** (Chef-Entscheid v49, `no-natural-regen.test.ts` grün) → jeder ungeheilte Chip akkumuliert über Kills ⇒ Food strukturell PFLICHT.
- Sim-Beleg: armored-KEIN-Food über 180 s driftet ab (R45 → **60 % HP**, R30 → 86 %). Kein Selbst-Sustain außer Magier-Ward. Bei den weichsten on-tier-Mobs reicht das 3-min-Fenster nicht für den Tod (Farm-Zone-Puffer, Spec §7.2) — der Druck kommt über Stunden/Enrage. Nicht trivial.

### 4. Ward-Mechanik — **✅** (`armor-trinity-combat.test.ts` + `ward.test.ts`, alle grün)
Absorbiert VOR HP (als `shield` geloggt) · Recharge = `cost·WARD_PER_MANA` beim Cast · Init = maxWard bei Kampfstart UND Respawn (combat.ts:244/785) · leeres Mana (Weak-Melee) ⇒ **kein** Recharge (gewollter Druck). Reihenfolge §1.5 exakt: Dodge→Contest→Mitigation→Block→One-Shot-Cap→Ward→HP (combat.ts:1582–1635). `applyManaShield` sauber durch Ward ersetzt. Sustain-Loop endlich (Recharge 1.3/s ≪ DPS-in).

### 5. Dodge/Block funktional & 1H-vs-2H fair — **✅**
- Leder-Dodge (Voll-Vermeidung): dodge 34 %/59 %/66 %/73 % je Band; hoher Dodge ⇒ HP-Verlust < ¼ (A2-Test).
- Schild-Block −75 % (reduziert, nullt nicht): block 15 %/24 %/35 %/40 %; RNG nur bei blockChance > 0 (Alt-Content sequenz-identisch).
- 1H+Schild vs 2H: EHP-fair (R90: +8 % vs +1 %; 2H holt Schild-AR über den Waffen-`armorRating`-Bonus zurück, R90 armorR 29.1).

### 6. 0 FALSCHE geared-Walls + Fixture-Artefakt — **✅ (bestätigt) + Harness-Fix empfohlen**
- `findGearedWalls` = **leer**. GEARED_HERO (godiron, jetzt mit armorRating 13.09 → 51 % Mitigation + 43 % Block) besiegt ALLE Monster.
- Die 3 Bronze-Baseline-„Walls" sind FIXTURE-Artefakte: die Sim-Fixture rüstet `["bronze_sword", leather_body, wooden_shield]` — `leather_body`/`wooden_shield` tragen NUR `modifiers:{con:1}`, **NULL** armorRating/dodge/block ⇒ effektiv **unarmored** (maxBeatable der Fixture nur L16). Gegenprobe mit echter Bronze-Platte + on-tier combatLevel:

| Mob | IST-Fixture (0-Armor) | FIX-Fixture (bronze plate) |
|---|---|---|
| goblin L15 | 0 Kills / 4 Tode | **13 Kills / 0 Tode** |
| tower_goblin L15 | 0 Kills / 4 Tode | **13 Kills / 0 Tode** |
| bull_boss L15 (Boss) | 0 Kills / 3 Tode | **3 Kills / 2 Tode** (killbar, DPS-Check) |

→ Alle drei sind reine Fixture-Härte, KEINE echten Walls.

### 7. Ward-INT-Flag (TRIAGE) — **LEAK bestätigt** → Empfehlung WARD_CORE_PER_INT = 0
`WARD_CORE_PER_INT = 1.0` gibt JEDEM Held Ward aus INT — Melee-Held zeigt maxWard **5 / 10 / 18 / 25** (Band 10/30/60/90); UI gatet auf `maxWard>0` ⇒ **kleine Ward-Leiste auf Melee/Ranged sichtbar** (Chef wollte Ward als MAGIER-Mechanik). Zusätzlich gibt der INT-Kern Nicht-Magiern einen kleinen Gratis-Absorb-Puffer (~+12 % Erst-Treffer bei R90) — nicht rein kosmetisch.

---

## Hebel (Sollwerte) — Owner

1. **content-dev** — Leder/Stoff-Leiter am unteren/mittleren Ende auf Spec §4.1 heben + Zwischen-Tiers füllen (leatherworking-Lücke 5→22, magic_off-Lücke 1→30). Sollwert: band-10 Leder dodge **42 %** (ist 34 %), band-10 Stoff maxWard **31** (ist 9); R30-Leder von +18 % auf ≤ +10 % zurücknehmen. Ziel: Spanne < ±10 % ab R10.
2. **logic-dev + content-dev** — `WARD_CORE_PER_INT` 1.0 → **0** (Ward NUR aus `wardCapacity`-Stoffgear ⇒ UI-Leiste verschwindet für Nicht-Stoff automatisch). Den entfallenen INT-Kern in die Stoff-`wardCapacity` einfalten (Spec §4.3 rechnet den Kern ohnehin heraus) — **doppelt nützlich**: schließt zugleich die low-band-Stoff-Parität aus Hebel 1.
3. **kontrolleur/Harness (`packages/engine/src/sim.ts`)** — Bronze-Baseline-Fixture-Equip von `leather_body`+`wooden_shield` auf echte Bronze-Platte (`bronze_fullhelm/platebody/platelegs/gauntlets/sabatons/kiteshield`) + on-tier `combatLevel` umstellen (analog Turm-Gate-Slayer-Fix), damit der Report einen ARMORED Frühgame-Helden abbildet. Erwartung: die 3 „Walls" fallen (verifiziert oben). `sim.test.ts`-Kommentar (Auffälligkeiten-Zahl) danach neu pinnen.

Hebel 1+2 = Content/Config, Hebel 3 = Harness — **kein** Eingriff in combat.ts/character.ts nötig. Phase C parallel möglich.
