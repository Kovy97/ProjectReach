# Sweep 3 — Konsolidierte Triage (20 ziel-gerichtete Spieler), 2026-07-01

## GESAMT-URTEIL: Der Balance-Pass war ein großer Erfolg — mit klarer Nacharbeit am Endgame.
- **Midgame-Parität: von +40–60 % Melee-Dominanz → ~8–10 % Spread** (Midgame-Agent, Feel: ~5 %).
- **Frühgame: exzellent** (8–11 %), **boar-L10-Wall weg** (power trainiert via 55/45).
- **Endgame BiS-godly-Drops: 0 Walls, Parität eng** (alle 4 Endbosse in allen Stilen, 0 Tode).
- **2H viabel** (+14–27 %), **voidweave > godspark** (jede Achse), **Tower-Retiering gut**, alle Sweep-2-Fixes halten.
- **ABER** die tieferen Agenten (Min-Maxer bis L90) zeigen: **craftbares Endgame-Gear (L60–90) NICHT paritätisch** + eine **strukturelle Wurzel**. → zweite Balance-Runde.

## ZWEITE BALANCE-RUNDE (balance-designer Spec → content/combat/logic)
1. **[P2 strukturell] Leder-/Hide-Rüstung gibt keinen Attribut-Modifier** (Min-Maxer, Root-Cause). Metall→str, Stoff→int, **Leder→0 dex** → Ranged bekommt keinen Attribut-Skalierungsbonus. Kompoundet mit Level (L90 ranged raw 264 vs melee 387). **Fix:** Hide-Rüstung dex-Mods geben (analog Metall-str/Stoff-int). Owner: balance-designer→content-dev.
2. **[P2] Endgame-craftbare Tier-Parität (L60–90) gebrochen** — aetherium ranged/magic ~−24 %; obere Waffen-Flats zu stark getapert (pass2-Annahme „Endgame ok" galt nur für godly-Drops). **Fix:** obere Longbow/Staff/Wand-Flats un-tapern. Owner: balance-designer→content-dev.
3. **[P2] Magie Endgame = Intervall/Uptime, nicht Flat** (Min-Maxer) — Magie hat L90 höchsten Roh-Schaden (410>387), aber langsames Intervall (2600-2900 vs 2025) + Mana-Downtime fressen es. **Fix:** staff/wand `attackIntervalMs` senken und/oder `manaCost` runter am Endgame. Owner: combat-dev/balance.
4. **[P2] Ranged Endgame-DoT fehlt** (Endgame-Agent) — Melee(bleed)/Magie(burn) haben armor+regen-bypassende DoTs, godly-Bögen keinen → ranged lag gegen tanky/regen. **Fix:** Top-Bögen Bleed geben (z.B. last_vengeance) oder rDmg 130→150. Owner: content-dev.
5. **[P2] Magie/Ranged-Waffen-Verkaufswert 2,5–4,6× Melee-Peer** (Ökonom) — steel_staff 280 vs steel_sword 75 bei gleichem Schaden → Craft-Vendoring dominanter Gold-Pfad. **Fix:** `value` auf ~1,25× Melee-Peer je Tier cappen. Owner: content-dev.
6. **[P2] 9 un-feuerbare Bögen** (Slayer) — `ammoType` verlangt höheres Ranged-Level als der Bogen (Nebenwirkung der Pfeil-Ranged-Regel) → 0 DPS. spectral_hunter_bow r28→mithril r40, stagstride r24→mithril r40, skytalon r50→runite r60, abyssal_tide r90→godiron r99 +5 klein. **Fix:** je Bogen `ammoType` auf eigene Tier-Stufe senken + Guard „ammoReq ≤ bowReq". Owner: content-dev.
7. **[P3] Ranged-Default-Stance `precise` = DPS-Falle** (Midgame) — 12 % langsamer, −20–29 % Kills/h → Default liest 71–80 % vom Besten. **Fix:** Default auf `fast` ODER `precise` speedMult 1.12→~1.0. Owner: combat-dev.
8. **[P2] voidhide Ranged-Endgame-Cap = Survivability-Downgrade** vs shadowhide (Gear) — −43 def/−79 eva/−70 HP, nur Offense. **Fix:** voidhide zum echten BiS machen (oder bewusst Glass-Cannon). Owner: content-dev.

## ENGINE/LOGIC
9. **[P2] combatLevel: `magicOffense = magic_off` allein** (bestätigt von 3 Agenten: Magier/Midgame/Frühgame) — `magic_def` bleibt früh 1 → Magie CL ~2× langsam trotz Top-Schaden. Symmetrisch zu Ranged. Owner: logic-dev (dungeon.ts). **Zugleich** RANGED_XP_FACTOR 1.2→1.1 (Ranged CL-Lean) + Melee-Kill-Bonus-Split prüfen → alle 3 Stile CL-kohärent. Owner: combat-dev + balance-designer.
10. **[P2] Ranged Idle/Offline-Auto-Reload** (Idle) — Reserve-Pfeile aus Inventar/Bank nicht nachgeladen → Ranged-AFK stoppt nach ~7,5h < 8h-Cap. **Fix:** Köcher vor `endCombatOutOfAmmo` aus Inventar→Bank nachfüllen. Owner: combat-dev+logic-dev.
11. **[P3]** Starter-Köcher 150→~300 (Frühgame/Feel, state.ts); ach_sets_all count 29→30 (Completionist, achievements.ts); lck→critDamage cap ≤3,5× ODER lck·0.02→0.01 (Endgame, optional); SimPlayer kills-kumulativ-Footgun (Toolkit).

## UI (P3 Politur)
Sidebar-Logo alt „Hearthforge Idle"→„Grim Reach"; combat.regen „Regen"→„Reg."; EN-aria-labels (TopBar/FarmPage); Onboarding „3 Skills"→Melee trainiert 4; Equip-Auffindbarkeit; Enchant-Vorschau-Proc 1-zeilig; dungeon.test/idol-sanctum-clear.test nutzen nicht-existente godiron-Gear-IDs (clearen nackt).

## CONTENT (P3 klein)
gemstone_amulet xp 3→4 (oder als Gear lassen); craft_rune_arcane_i Mat-Gating (L30-Rezept braucht L44-45-Mats); smelt-bar XP-Regression (kosmetisch).
