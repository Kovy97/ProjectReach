# Sweep 2 — 07: Ökonomie-Exploits Runde 2 (Shop-gefütterte Gold-Loops)

**Fokus:** Nach dem `dim_focus`-Fix (value 30) systematisch prüfen, ob WEITERE shop-gefütterte
Kauf→Craft→Verkauf-Margen > Input existieren. Zusätzlich Bank-Sinks, Auto-Eat-Kosten, Overflow.
**Methode:** Programmatischer Loop-Detektor über die echte `ContentDB` + `sellPrice()` (engine),
verifiziert end-to-end mit `SimPlayer`. Temp-Test-Skripte angelegt, gelaufen, wieder gelöscht.
**Regel-Basis:** `sellPrice = max(1, round(value · 0.5))` (`SELL_FRACTION=0.5`). Ein Item ist ein
Infinite-Gold-Loop, wenn `sell(x) > billigste-Gold-Beschaffung(x)` (Shop-Kauf ODER Craft aus
gold-kaufbaren Inputs, mehrstufig aufgelöst per Fixpunkt).

---

## Ergebnis in einem Satz
Der `dim_focus`-Fix hat **einen** Trübessenz-Sink geschlossen, aber **vier weitere, größere**
Loops offengelassen: der Shop verkauft `dim_essence` für **8 Gold**, und daraus gecraftete
Magie-Waffen/-Foki (via `force_rune`) verkaufen für weit mehr als die Essenz kostet.
**iron_staff = +52 Gold pro Craft (~15.000 Gold/Std, risikofrei).**

---

## CONFIRMED — Findings (schwerste zuerst)

### [P1][balance] Shop-`dim_essence` speist profitable Runecrafting-Loop: iron_staff +52 G/Craft
**Repro (per SimPlayer verifiziert, seed 7):**
1. Runecrafting 10 erreichen (einziges Gate auf `craft_iron_staff`; bootstrappt sich selbst, s.u.).
2. `dim_essence` im Shop kaufen (8 G/Stück). 6 Stück = 48 G.
3. `craft_force_rune` (2 essence → 3 force_rune, 3000 ms).
4. `craft_iron_staff` (4 dim_essence + 3 force_rune → 1 iron_staff, 9500 ms).
5. `iron_staff` verkaufen → 100 G.

**Erwartet:** Craft-Output ≤ Input-Kosten (kein risikofreies Netto-Gold aus dem Shop).
**Tatsächlich:** Input 48 G → Output-Verkauf 100 G = **+52 G/Zyklus**. SimPlayer-Dump:
`goldStart=500 → afterBuy6essence=452 → runesMade=3 stavesMade=1 → sellStaff=100 → goldEnd=552 NET=+52`.
**Rate:** Zyklus ≈ 12,5 s → ~288 Zyklen/Std → **~14.976 Gold/Std, null Risiko**, ZUSÄTZLICH
Runecrafting-XP + kostenlose Magie-Waffen als Nebenprodukt.
**Self-Bootstrapping:** Das Gate (RC 10) wird durch die niedrigeren Loops derselben Familie
erreicht — jeder Craft gibt RC-XP. Man braucht KEIN Kampf/Skilling außerhalb des Shops.
**Evidence:**
- `packages/content/src/index.ts:8427` `craft_iron_staff` — inputs `4× dim_essence + 3× force_rune`.
- `packages/content/src/index.ts:8318` `craft_force_rune` — `2× dim_essence → 3× force_rune`.
- `packages/content/src/index.ts:11037` Shop `{ itemId: "dim_essence", cost: 8 }`.
- `packages/content/src/index.ts:3179` `iron_staff … value: 200` → sell 100.
**Owner:** Content-Dev (Balance-Zahlen: `dim_essence`-Shop-Preis und/oder Magie-Gear-`value`) —
Chef-Balance-Domäne, daher nur BERICHT.

### [P2][balance] Gleiche Familie: bronze_staff +13,3 · iron_focus +12,3 · bronze_focus +0,3
Drei weitere reine Gold-Loops derselben Wurzel (`dim_essence`+`force_rune`, alle gold-kaufbar):

| Rezept | Input (G) | Output-Verkauf (G) | Netto/Craft |
|---|---|---|---|
| `craft_iron_staff`   (`:8427`) | 48,0 | 100 (`iron_staff` val 200)   | **+52,0** |
| `craft_bronze_staff` (`:8426`) | 34,7 | 48  (`bronze_staff` val 95)  | **+13,3** |
| `craft_iron_focus`   (`:8455`) | 42,7 | 55  (`iron_focus` val 110)   | **+12,3** |
| `craft_bronze_focus` (`:8454`) | 34,7 | 35  (`bronze_focus` val 70)  | **+0,3**  (praktisch break-even) |

`force_rune`-Kosten = 16 G / 3 Stück = 5,33 G/Stück (`craft_force_rune`, aus `dim_essence`).
**Owner:** Content-Dev / Chef-Balance.

### [P3][balance] Mastery-Verstärkung kippt weitere shop-gefütterte Crafts ins Plus
Bei Mastery-Kappe (`MASTERY_PRESERVE_CAP=0.4` spart Inputs, `MASTERY_DOUBLE_CAP=0.5` verdoppelt
Output) werden auch aktuell break-even/leicht-negative Shop-Crafts profitabel:
- `craft_copper_staff` (`:8425`): Basis −9,7 → mit Mastery **+16,7**/Craft.
- `craft_copper_focus` (`:8453`): Basis −16,7 → mit Mastery **+6,2**.
- `iron_staff` skaliert von +52 (Basis) auf **+121** bei Max-Mastery.
- Copper-Smithing via Shop-`item_scrap` (`recycle_scrap`: 4× item_scrap @5 → 1 copper_bar @20 G):
  alle copper-Forge-Rezepte Basis-negativ, aber Mastery-Ampl bis ~+10,5 (z.B. `forge_copper_sword`).
**Hinweis:** „suspected" für die Praxis — erfordert Mastery ≈ 99 (legitimer Grind), aber der Loop
existiert und ist reiner Shop→Gold. Wurzel identisch: `dim_essence` (8 G) bzw. `item_scrap` (5 G)
zu billig relativ zu den Craft-Outputs.

---

## GEPRÜFT & SAUBER (kein Loop / bewusst)
- **`dim_focus`-Fix wirkt:** `enchant_dim_focus` = 4× dim_essence (32 G) → dim_focus sell 15 = **−17 G**
  (Verlust). Der zuvor gemeldete Loop ist zu. (`:8353`, item `:3443`, value jetzt 30.)
- **Direkte Shop-Arbitrage (buy→sell):** KEINE. Für jeden Shop-Eintrag gilt `sellPrice ≤ cost`
  (Werkzeuge/Gear/Saat/Food alle ≥ 2× Verkaufsspanne). Universal-Detektor findet **exakt die 4**
  Runecrafting-Items oben und sonst nichts.
- **Höhere Magie-Tiers NICHT betroffen:** steel/mithril/… Stäbe+Foki+Wände brauchen
  `frost/ember/storm/aether_essence` bzw. `frost/shock/aether_rune` — **keine davon shop-kaufbar**
  → gc = ∞ → kein reiner Gold-Loop. Nur der `force_rune`-Zweig (aus `dim_essence`) ist shop-gefüttert.
- **Wände (`craft_*_wand`):** brauchen `frost_rune` (aus nicht-kaufbarer `frost_essence`) → NICHT
  shop-gefüttert, korrekt draußen.
- **`copper_bar`-Direktverkauf:** value 8 → sell 4 < 20 G Beschaffung (recycle_scrap). Kein Loop.
- **Food/Auto-Eat:** `cooked_shrimp` buy 12 / sell 3, `cooked_trout` buy 28 / sell 6 — kein
  Arbitrage; Auto-Eat verbraucht Food = sauberer Gold-Sink. Auto-Eat-Upgrades 2.000/8.000/25.000 G
  (`AUTO_EAT_TIERS`) = gesunder Sink.
- **Bank-Sinks vorhanden:** Bank-Slot-Pakete `BANK_SLOT_BASE_COST=5000 · 1.6^n`
  (`shared/src/index.ts:2417`), Inventar-Slot-Upgrade 60 · 1.5^n (`shop.ts:40`). Gesunde Senken.
- **Overflow-Dupe:** keiner. `canHoldOutputs`/`canHoldAnywhere` (`tick.ts:60,76`) stoppen sauber mit
  `inventory_full`, BEVOR Inputs verbraucht werden; Auto-Bank leitet nur um, dupliziert nicht.

---

## Kurz-Zusammenfassung
- **P1 (1):** `craft_iron_staff` shop-gefütterter Gold-Loop, +52 G/Craft ≈ 15k G/Std, risikofrei.
- **P2 (1, 3 Rezepte):** bronze_staff / iron_focus / bronze_focus — gleiche `dim_essence`-Wurzel.
- **P3 (1):** Mastery-Ampl kippt copper-Staff/Focus + copper-Smithing (via `item_scrap`) ins Plus.

**Top-3 / Empfehlung (Chef-Balance-Entscheid):**
1. `dim_essence`-Shop-Preis anheben ODER Magie-Gear-`value` (copper/bronze/iron Staff+Focus) senken,
   bis `sell(output) ≤ Input-Kosten`. Faustregel: iron_staff müsste ≤ 48 G kosten (value ≤ 96) —
   oder dim_essence ≥ ~17 G, um alle vier zu schließen.
2. Konsistent mit dem `dim_focus`-Ansatz: gleiche Neubewertung auf ALLE `dim_essence`/`force_rune`-
   Outputs anwenden, nicht nur auf das eine Fokus-Item (der Fix war zu punktuell).
3. Optional generischer Guard-Test (`wiring-audit`-Stil): „kein Item mit
   `sell(x) > cheapestGoldCost(x)`" als Regression-Sperre — fängt künftige Shop-Loops automatisch.

**Owner aller Fixes:** Content-Dev (Balance-Zahlen), Freigabe Chef. Kein Engine-Bug — die
Craft/Sell-Mechanik ist korrekt; die Zahlen sind das Problem.
