# QA-Run 5 — Aggregat (21 Tester) · 2026-06-28

**Gesamtschnitt: 8,25/10** (run4: 7,7). 1 Persona ≥9,5, keine unter 6,5. Ziel ≥9,5 überall → Round-4-Fixes nötig.

## Scorecard
| Linse | Run5 | Δ run4 |
|------|:----:|:----:|
| Gathering Farm/Forage/Herb | **9,5** ✅ | +0,5 |
| Crafting Smith/Jewel | 9,25 | +0,25 |
| Meta-Goals | 9 | +1 |
| Gathering Mine/Wood/Fish | 9 | ±0 |
| Crafting Fletch/Rune/Leather | 9 | +0,5 |
| UX/UI | 8,5 | ±0 |
| Enchantment | 8,5 | +1 |
| Slayer | 8,5 | +0,5 |
| Combat-Status | 8,5 | +0,5 |
| Cooking/Food | 8,5 | (neu) |
| Idle/AFK | 8,5 | +1,5 |
| Early-Mid L15–30 | 8,5 | +1,5 |
| Combat-Melee | 8 | +0,5 |
| Combat-Magic | 8 | +2 |
| Early L1–15 | 8 | +0,5 |
| Save/Offline | 8 | −1 |
| Endgame L75–99 | 7,5 | −1 |
| Economy (City-Deckel ~8) | 7,5 | +0,5 |
| Late-Mid L50–75 | 7,5 | +1,5 |
| Combat-Ranged | 7 | +0,5 |
| Mid L25–60 | 6,5 | +0,5 |

**P0: keine.** 0 Walls, 0 Tode.

## Verifizierte Run-4-Fixes (gelandet)
3-Stil-Strukturursache (nur Roben tragen Offense) gelöst; Reed-Gates, Crop-Ökonomie, affix_shock+rune_storm, Auto-Salvage verdrahtet, Overnight-Auto-Restart, Mana-Schild-Fix, Turm+Pet-Achievements (84/84 Mobs, 531 Achievements), ironhide-L60-Tier (Ranged-Wall zu), curesPoison-Auto-Eat. Suffix-System live (Craft 20% + Drop 8%).

## P1-Cluster (Round 4)
### A) 3-Stil-Parität — konvergiert, aber noch nicht im Band überall
Spread run4 ~1,7–2× → run5 ~1,1–1,3×. Reststand (reconciled über alle Combat-Reports):
- **MAGIE = Hauptproblem, 3 distinkte Hebel:**
  1. **manaCost-Progression kaputt** — Top-Stäbe durchsatz-NEGATIV (godiron_staff cost 24 → 0,69×, godspark cost 6 → 0,95×); manaCost steigt schneller als Pool/Regen → Inversion (mid: adamantium_wand < mithril_wand). godspark nur gut, weil manaCost-Feld fehlt (Glücksfall-Bug). → **manaCost flach/fallend über Tiers.**
  2. **Endgame-Mana-Sustain** — sustained Fights L84+ → 75% Schwach-Schläge → Magie 0,49× + stirbt 4–7×/h. → Pool/Regen high-tier anheben.
  3. **mid/late Output leicht zu tief** (Roben-Trim R3 ×0,6 mid/late etwas zu hart → L55 0,84× / L75 0,78×) + **`runecrafting` trainiert KEIN Attribut** (smithing→str, leatherworking→dex, runecrafting→nichts). → `runecrafting trains:"int"` + Roben mid/late teil-rückbuffen (~×0,70), KEIN Voll-Revert (sonst Decke zurück) + bloodiron-1H-Wand-Tier fehlt + Magie-Accuracy/Crit vs evasive Mobs.
- **RANGED = Endgame leicht über Band** (combat-melee L98 1,14× / combat-ranged 1,39× / endgame 0,83× — harness-divergent → mit fixem GEARED_HERO messen) + Evasion-Tank (ranged eva ~3× Platte, aber bei 0 Toden folgenlos) + `voidhide_boots` rangedDamage 1 (Typo, soll ~12). → voidhide-eva trimmen / ammoDamage-Top prüfen.
- **MELEE = weitgehend OK** (mid 1,00, late 0,96–1,00); str hängt an smithing-Level → str-Anteil direkt in Platte; **2H-Waffen (Maul/Großschwert) trailen** trotz Top-dmg (langsamer aIMs) → 2H buffen.

### B) Save/Instanz-Overflow (P1, Datenverlust)
Instanz-Drops (Suffix/Affix) bei vollem Inventar offline **stumm vernichtet** (kein Vault/Bank-Overflow in `addInstance`) + als Loot geloggt → echter Verlust + Phantom-Loot (19/20). → Overflow→Vault, kein Phantom-Count.

### C) Auto-Salvage-Footgun (P1/P2)
`shouldAutoSalvage` = Stub (zerlegt JEDE eingehende Instanz bei „An", kein Schwellen-/Overflow-Check) → Top-Rolls weg + irreführendes Label. → Qualitäts-/Overflow-Filter.

### D) Suffix-Sichtbarkeit (P1, UX)
Suffixe live, aber Tooltip zeigt nur Namensphrase (keine `inst.suffix`-Stat-Zeilen), Grid-Badge feuert nicht bei Suffix-only, Drop im Kampf ohne Toast/Signal. → Tooltip-Stats + Badge + Drop-Toast.

### E) Slayer Phase 2 (P1, fehlendes Feature)
Kein `slayerHelm`-Item (Engine-Hook lebt), keine Slayer-Gear/Sets, superRare-Turm-Boss-Drops sind Sackgassen (kein Rezept), Punkte-Shop endet bei 975. → Phase 2 bauen.

## P2/P3-Sammelliste (Content/Polish)
item_scrap ohne Senke · ironhide_helm rngDmg-Inversion + ironhide_boots ohne rngDmg · combo-food Stil-Parität L52–90 (R/M) · Fleisch-Shop-Fallback · Gather-XP-Dips an Lückenfüllern + Erzpause L55→70 · total_level-Capstone (Max ~2079) + pets_5 · ember_robe-Craft-XP-Typo · runite-md-Bump · cut_gemstone-Senke · Starter-Kit (Köcher/Saat/Food-Puffer) · Onboarding-Light-Hilfen · „Alle Plots bepflanzen"-Button · Offline-Catch-up-Freeze ~26s · Auto-Eat-Tier-Differenzierung · Economy = City-Deckel ~8 (deferred, ehrlich dokumentiert).

## Fix-Wellen (Round 4)
1. **balance-designer**: autoritative Round-4-Spec mit FIXEM GEARED_HERO (manaCost-Kurve, runecrafting→int, Roben-Teil-Rebuff, bloodiron-Wand, Magie-Accuracy, Ranged-Trim, 2H-Buff, str-in-Platte) → alle Bänder L10/30/55/75/99 ins Band.
2. **logic-dev**: Instanz-Overflow→Vault (B) + Auto-Salvage-Filter (C) + Starter-Kit + rng-default.
3. **ui-dev**: Suffix-Sichtbarkeit (D) + Onboarding-Hilfen + Bulk-Replant + About-Links + Emoji-Fronten.
4. **content-dev** (nach balance-Spec, seriell): Round-4-Combat-Zahlen → Slayer Phase 2 (E) → P2/P3-Content-Sammelliste.
