# Sim-Economy-Snapshot (2026-06-24)

Erzeugt nach Erweiterung von `sim.ts`/`sim.test.ts` um **Gold/h** je Aktion + Pro-Skill-Aggregat
(Studien-Blindstelle aus `melvor-study.md` geschlossen). Gold/h = direktes Gold (Thieving) +
Verkaufswert der Netto-Erträge − Verkaufswert verbrauchter Inputs.

> ⚠️ Lesehinweis: Die Ø-Werte mitteln über ALLE Tiers eines Skills (frühe + späte), sind also
> KEINE Frühgame-Zahlen. Processing-Gold/h ist „Brutto-Output-Wert" (Sim-Inputs sind gratis), nicht
> realer Profit — bei Gathering ist Gold/h dagegen echter Verkaufswert.

## Pro-Skill (Ø über alle Aktionen, 1h-Sim)
| Skill | Aktionen | Ø XP/h | Ø Gold/h |
|---|---|---|---|
| woodcutting | 9 | 55.828 | 130.924 |
| mining | 16 | 47.786 | 74.150 |
| foraging | 8 | 38.996 | 30.804 |
| smithing | 92 | 36.378 | 380.365 |
| farming | 9 | 24.361 | 65.663 |
| thieving | 14 | 23.628 | 45.077 |
| jewelcrafting | 17 | 21.610 | 321.487 |
| inscription | 10 | 19.414 | 19.257 |
| runecrafting | 13 | 19.390 | 206.579 |
| fletching | 16 | 18.879 | 13.022 |
| herblore | 6 | 17.312 | **−13.756** |
| leatherworking | 19 | 16.748 | 107.902 |
| **fishing** | 5 | **8.585** | **0** |
| **cooking** | 7 | **7.823** | 2.037 |

## Befunde (datengetrieben)
1. **Fishing ist der klare Nachzügler:** niedrigste XP/h (8.585, ~½ des Felds) UND **0 Gold/h** —
   roher Fisch hat `value: 0` und wird nur von Cooking verbraucht. Fischen lohnt sich kaum.
2. **Cooking** ebenfalls schwach (7.823 XP/h); gekochtes Essen hat niedrigen Verkaufswert.
3. **Herblore ist gold-negativ** (−13.756) — Tränke verkaufen sich unter Zutatenwert. Das ist OK
   (Tränke sind Gebrauchswert/Heilung, nicht zum Verkauf), aber bewusst zu wissen.
4. **Gathering-Gold/h ist hoch** (woodcutting 130k durch teure High-Tier-Logs) — Verkaufswerte der
   oberen Tiers evtl. zu großzügig; bei einer Gold-Senken-Justierung mitbeachten.
5. Processing-Gold/h (smithing 380k, jewelcrafting 321k) = Brutto-Output-Wert, nicht aussagekräftig
   ohne Input-Kosten — für realen Profit müsste die Sim Inputs zu Marktpreisen bewerten (späterer
   Ausbau).

## Empfohlene nächste Schritte (datengetrieben)
- ✅ **P1 — Fishing/Cooking aufgewertet (2026-06-24):** rohe + gekochte Fische haben jetzt `value`,
  frühe Fishing/Cooking-XP angehoben + Dauern gekürzt, je 2 höhere Tiers ergänzt (anglerfish L70,
  voidray L85). Ergebnis: Fishing 8.585→**33.468 XP/h**, **0→18.812 g/h**; Cooking 7.823→**33.765 XP/h**,
  2.037→**16.856 g/h** — beide jetzt solides Mittelfeld.
- ✅ **Frühgame-XP/h behoben (2026-06-24):** L1-Einstiegs-Gathering war gemessen 4–6k XP/h (zu langsam).
  Zielgenau Basis-XP angehoben + früheste Dauern gekürzt für mining (copper/tin/iron/coal),
  woodcutting (normal/oak), farming (ashroot/grimwheat/graywort), foraging (ashfields/deepwood) —
  earlyXpMult & Kampf bewusst UNBERÜHRT. Ergebnis: alle ~10–11k XP/h (Studien-Ziel), Kampf-XP exakt
  unverändert (goblin 611 Kills vorher=nachher).
- ✅ **Gold-Senke: Auto-Eat-Upgrade-Linie (2026-06-24):** 3 kaufbare Stufen (2k/8k/25k Gold = 35k gesamt)
  heben Auto-Eat-Schwelle (50→60→70→80 % HP) + Heil-Effizienz (×1.0→1.5). Neuer State
  `character.autoEatTier` (SAVE_VERSION 20 + Migration). Tier 0 = altes Verhalten (kein Regress).
  Survivability-Progression + wiederkehrende Senke. Shop-UI + Test.
- ✅ **Gathering-Gold/h analysiert (2026-06-24): kein Nerf nötig.** Top-Gold/h-Aktionen sind fast alle
  **Crafting-Inputs** (godwood_log→Bogen, rough_onyx/Gems→Schmuck, Erze→Barren — Wert per Vorgabe OK),
  Thieving (Gold = Zweck) oder verkaufbare Farming-Feldfrüchte (= deren Gold-Relevanz). Das hohe g/h ist
  v. a. ein **Sim-Artefakt**: die Sim nimmt an, dass ALLES verkauft wird (+ gratis Inputs bei Processing,
  daher Smithing-Gear bis 2,2 Mio g/h) — real werden Inputs verarbeitet, nicht verkauft. Economy ist rund;
  nur die reinen Sell-only-Endgame-Crops (godbloom 280, nightshade, emberroot) im Auge behalten.
- ✅ **Mastery-Speed-Cap 11,8 % → 14,7 % (Melvor-P3, 2026-06-24):** `MASTERY_SPEED_PER_LEVEL` 0.0012→0.0015,
  `MASTERY_SPEED_CAP` 0.12→0.15. Stärkerer Mastery-Langzeitanreiz, näher an Melvor.

## Sim-`findIssues` geschärft (2026-06-24)
Die „unbesiegbar"-Heuristik ist jetzt **relativ statt level-fix**: ein Mob mit kills=0 gilt als Ausreißer,
wenn HÖHERSTUFIGE Mobs besiegbar sind (= zu tanky für sein Level). Mobs über dem höchsten besiegbaren
Level → separate „erwartbar"-Liste (`findExpectedUnbeatable`), nicht als Bug gezählt.
✅ **Ausreißer aufgelöst (2026-06-24):** Root-Cause war `regen`, nicht „zu tanky". Der Baseline-Held
mahlt Nicht-Regen-Mobs über 1 h tot (auch Lv120), scheitert aber an Regen-DPS-Checks — daher sahen die
Regen-Mobs „anomal" aus. Zwei Fixes: (a) **Content:** `last_idol` (Lv120-Endboss) hatte KEIN regen →
war Bronze-grindbar; jetzt `regen: 14` = echter Endboss-DPS-Check (Sim: kills 5→0). (b) **Heuristik:**
Regen-Mobs sind bewusste DPS-Checks → werden als „erwartbar" statt als Stat-Wall-Bug klassifiziert
(`findIssues` ignoriert Regen-Mobs; `findExpectedUnbeatable` listet sie als DPS-Check). **Ergebnis:
AUFFÄLLIGKEITEN = 0**; skeleton_nekro/roc_elder = „DPS-Check (regen) erwartbar", scale_skarn/last_idol =
„über Baseline-Reichweite erwartbar". Echte Stat-Wall-Bugs (unbesiegbar OHNE regen, obwohl höherstufige
fallen) würden weiterhin geflaggt.

## Zweiter Sim-Held: geared Endgame-Validierung (2026-06-24)
`runReport` testet jetzt ZWEI Helden gegen alle Monster: (1) Bronze-Baseline (Frühgame-Zugänglichkeit),
(2) **geared Endgame-Held** (Kampf-Skills L90 + Götzeneisen-Set + Götzen-Voidray-Food, via neuem
`simulateCombat`-Opt `combatLevel`). Neue `findGearedWalls`: ein Mob, den selbst der geared Held nicht
besiegt, ist ein P1-Wall (überzogen, unschaffbar für JEDEN). **Ergebnis: 0 Walls** — der geared Held
besiegt alle Ex-Regen-Ausreißer (skeleton_nekro 10,5s/Kill, roc_elder 12,7s, scale_skarn 17s) und den
Endboss `last_idol` in ~52,9s/Kill (echter Boss-Kampf, nicht trivial). Damit ist die Balance über das
ganze Level-Spektrum validiert: Regen-Mobs gaten Untergerüstete korrekt, sind aber für Gerüstete machbar.

## Bronze-Baseline-Auffälligkeiten neu gepinnt (2026-07-02, Itemization-2.0-Re-Gate-TRIM)
Stand: **15** Auffälligkeiten (alter akzeptierter Snapshot 12 → Waffen-2.0/Itemization-Gate-Regression
21 → nach dem Fix-Apply + TRIM-Pass 15; s. `design/itemization-regate-2026-07-02.md` Finding 4 + der
neue Doku-Kommentar in `packages/engine/src/sim.test.ts`). Alle 15 sind akzeptiert (Chef-Prinzip
undergeared-only): 2 Gold-only-Thieving-Aktionen (kein Item-Output per Design) + 13 kills=0-Mobs der
Bronze-Baseline (bull_boss, goblin_butcher/felmagician/stormcaller/warlock, dust_vulture, mire_crawler,
pitch_beetle, ash_tyrant, rootling_grunt/gimp, ashfield_wraith, tower_skeleton_archer) — alle on-tier
mit passendem Gear klar killbar, reine Frühgame-Härte der strikten Attribut-Leiter (§4/§8.2 der
Fix-Spec), keine Stat-Wall-Bugs. `ECHTE WALLS — auch geared unbesiegbar` bleibt bei **0**. Die
dagger-/scimitar-Tempo- und affix_hunter-Trims dieses Passes berühren nur BiS-/Endgame-Gear und lassen
die Bronze-Baseline-Zahl unverändert (re-gemessen).
