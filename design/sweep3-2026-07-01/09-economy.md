# Sweep 3 — 09: Ökonomie (Gold/h maximieren + Exploit-Jagd), 2026-07-01

**Auftrag:** Max Gold/h + Exploits (SimPlayer). Verifizieren: (1) keine NEUEN shop-gefütterten
Gold-Loops nach dem `dim_essence`/`dim_focus`-Fix; (2) haben die Parität-/2H-Waffen-Werte die
Verkaufswerte/Craft-Margen kaputt gemacht? Shop→Craft→Verkauf systematisch durchrechnen.

**Methode:** Programmatischer Gold-Reachability-Detektor über die echte `ContentDB` — für JEDES
Item die billigste Gold-Beschaffung (Shop + mehrstufiges Crafting per Fixpunkt), dann jede
Craft-Aktion auf `sell(output) > Input-Gold-Kosten` geprüft (Basis + Mastery-Ampl). End-to-end mit
`SimPlayer` gegengecheckt (echte `startAction`/`advance`/`sell`, seed 3). Regel:
`sellPrice = max(1, round(value·0.5))` (`SELL_FRACTION=0.5`, `shop.ts:35`). Temp-Testskript angelegt,
gelaufen, gelöscht. **KEIN Spiel-Code geändert.**

---

## Ergebnis in einem Satz
Der `dim_essence`/`dim_focus`-Fix wirkt vollständig — **null shop-gefütterte Gold-Loops, null
Direkt-Arbitrage**. ABER die Parität hat die **Craft-Verkauf-Margen schief gemacht**: bei
gleichem Tier verkaufen craftbare Magie-/Fernkampf-Waffen für das **2,5- bis 4,6-fache** der
(jetzt schadensgleichen) Nahkampf-Waffe — Craft-Vendoring von Stäben/Bögen ist der dominante
Skilling-Gold-Pfad.

---

## VERIFIZIERT SAUBER — keine Exploits (confirmed)

### ✅ `dim_essence`/`dim_focus`-Fix wirkt — alte Rune-Loop-Familie tot
- `dim_essence` ist **komplett aus dem Shop** (`index.ts:11059` Kommentar; SimPlayer
  `buy("dim_essence",100)` → **0 gekauft**, `content.shop.some(dim_essence)===false`).
- Damit ist die GESAMTE `dim_essence`→`force_rune`→Stab/Fokus-Familie **nicht mehr
  gold-erreichbar** (Input-Gold-Kosten = ∞) → die 4 Sweep2-Loops (`iron_staff` +52 usw.) sind
  **alle tot**. Der Detektor findet sie NICHT mehr in der Loop-Liste. `dim_essence` value 6,
  `dim_focus` value 30 (`:448`,`:3462`) — konsistent.

### ✅ Direkt-Shop-Arbitrage (buy < sell): KEINE
Detektor über alle 68 Shop-Einträge: für jeden gilt `sellPrice ≤ cost`. **0 Treffer.**

### ✅ Shop→Craft→Verkauf-Loops (Basis-Mastery): KEINE
Einziger gold-erreichbarer Craft-Zweig ist `item_scrap` (Shop @5) →`recycle_scrap` (4 scrap → 1
`copper_bar` = 20 G/Barren, `:5639`) → Kupfer-Gear. **Alle 16 Kupfer-Crafts sind netto-NEGATIV**
(z.B. `forge_copper_sword`: In 20 G → sell 15 G = **−5**; `forge_copper_greataxe` In 60 → sell 28 =
**−32**). Kein Basis-Loop. Alle höheren Metall-/Rune-/Bogen-Ketten haben mind. einen
nicht-gold-kaufbaren Input (Erz/Log/Elementar-Essenz) → ∞ → per Definition kein reiner Gold-Loop.

### ✅ 2H-Wert-Aufschlag hat Nahkampf-Margen NICHT kaputt gemacht
Steel-2H (greatsword/greataxe/maul) value 230 = **3 steel_bar**; steel_sword value 150 = **2
steel_bar**. Marge/Barren: Schwert 37,5 vs 2H 38,3 — praktisch identisch, proportional zum
Barren-Verbrauch. Kein Craft-Vendor-Skew durch 2H. (steel_spear 2H aber value 150 / 2 Barren = wie
1H.) Und keine 2H-Waffe ist shop-erreichbar → kein Loop.

### ✅ Farming (Saat→Ernte→Verkauf): gated, kein schneller Loop
Saat (Shop, z.B. `ashroot_seed` @6) → 1 Pflanze liefert 6–9 Ernte (`ashroot` value 6 → sell 3) ≈
+16 G netto — **aber 600 s Wachszeit + begrenzte Beete** deckeln das auf ~triviale g/h. Ernten sind
zudem Koch-/Kräuter-Inputs (Senke). Wie in Sweep1/2 bestätigt: sauber.

---

## FINDINGS (schwerste zuerst)

### [P2][balance] CONFIRMED — Magie/Fernkampf-Waffen verkaufen 2,5–4,6× der (schadensgleichen) Nahkampf-Waffe → Craft-Vendoring-Skew
**Kern:** Der Parität-Pass hat Magie/Fernkampf-**Schaden** an Nahkampf angeglichen, aber die
**Verkaufswerte** blieben/liegen weit höher. Bei gleichem Craft-Tier verkauft sich das Magie-/
Fernkampf-Stück für ein Vielfaches — Craft-Vendoring von Stäben/Bögen ist damit die beste
Skilling-Gold-Quelle, obwohl die Waffen im Kampf gleichwertig sind.

**Evidence — Verkaufswert Ø je req-Band & Stil (value; sell = value·0,5):**

| req-Band | Nahkampf Ø | Fernkampf Ø | Magie Ø | Magie/Nahkampf |
|---|---|---|---|---|
| req20 | 214 | 480 | 494 | **2,3×** |
| req50 | 885 | 1293 | 1583 | 1,8× |
| req60 | 1162 | 2433 | 3250 | **2,8×** |
| req70 | 1273 | 3450 | 5150 | **4,0×** |
| req80 | 1430 | 5300 | 6533 | **4,6×** |
| req90 | 6713 | 19288 | 23450 | 3,5× |

**Repro (SimPlayer, seed 3, req20-Tier, in-engine bestätigt):** Skill 25, Inputs geben, craften,
verkaufen → Gold-Delta:
- `craft_steel_staff` (3 ember_essence + 3 fire_rune, 15 s) → **steel_staff sell 280**
- `fletch_steel_longbow` (4 ashbark_log + 1 bowstring, 8 s) → **steel_longbow sell 190**
- `forge_steel_sword` (2 steel_bar, 11 s) → **steel_sword sell 75**

Gleiches Tier, gleicher Kampfnutzen (Parität) → Magie **3,7×**, Fernkampf **2,5×** Gold pro Craft.
Input-Materialwert rechtfertigt das nicht: `ember_essence` value 18 (`:452`), `steel_bar` value 30
(`:674`). Marge Stab ≈ +223 G/Craft vs Schwert +45 G/Craft (gegen Input-Verkaufswert).

**Einordnung (ehrlich):** KEIN Infinite-Loop — Elementar-Essenzen (ember/frost/storm/aether) sind
**nur Kampf-Drops**, nicht shop-/forage-kaufbar. Die realistische g/h ist durch die Essenz-Drop-Rate
gedeckelt (~4 ember_essence/Stab ≈ 22–33 Kills), liegt also unter Dungeon/Thieving. Es ist ein
**Craft-Vendor-Ungleichgewicht** (Runenkunst/Bogenbau > Schmieden um 3–4× Gold/Craft), kein
Gelddrucker. Aber es untergräbt die Idee der „Parität": drei schadensgleiche Stile, aber Magie/
Fernkampf sind fürs Gold klar überlegen.

**Evidence-Zeilen:** `steel_staff` value 560 (`index.ts:3201`), `steel_longbow` value 380 (`:2784`),
`steel_sword` value 150 (`:1310`); Rezepte `craft_steel_staff` (`:8446`), `fletch_steel_longbow`
(`:7723`), `forge_steel_sword` (`:6440`).

**Empfehlung (Zahlen, Chef-Balance):** Verkaufswerte zur Stil-Parität ziehen — bei gleichem
req-Tier alle drei Stile auf ~gleiches `value`, mit höchstens moderatem Craft-only-Aufschlag
(~1,2–1,3×), da Magie/Fernkampf keine Loot-Quelle haben. Konkret req20-Tier:
- `steel_staff` 560 → **~190** (sell 95), `steel_longbow` 380 → **~190** (sell 95),
  `steel_sword` bleibt 150 (sell 75). Aufschlag ~1,25× statt 3,7×.
- Analog die Bänder req30–90 skalieren (Magie/Fernkampf-`value` auf ~1,25× des Nahkampf-Ø-Werts
  des Bands kappen). Das schließt das Vendor-Ungleichgewicht, ohne den Gebrauchswert der Waffen
  (Schaden) anzutasten.
**Owner:** Content-Dev (Waffen-`value`-Pass), Freigabe Chef.

### [P3][balance] SUSPECTED — Mastery-Ampl kippt Kupfer-Shop-Crafts minimal ins Plus (unverändert seit Sweep2)
Bei Mastery-Kappe (`preserve 0.4`/`double 0.5`) werden die Kupfer-Shop-Crafts leicht profitabel
(`forge_copper_sword` Basis −5 → **masteryNet +10,5**/Craft; andere +1,5…+9). Wurzel: `item_scrap`
@5 (Shop) → `copper_bar` @20. **Nicht neu** (identisch zu Sweep2-07 P3), **nicht** durch den
Parität-/2H-Pass verursacht, und absolut trivial (~+10 G/Craft, verlangt ~99 Kupfer-Smithing-
Mastery). Nur zur Vollständigkeit gelistet. **Empfehlung:** akzeptieren ODER `item_scrap`-Shop-
Preis von 5 → 7 anheben (4·7=28 > jeder Kupfer-Output-Verkauf → auch mastery-safe). Owner:
Content-Dev.

---

## Max Gold/h — Einordnung
Beste legitime Gold-Pfade bleiben (aus Sweep1/2 validiert): **Dungeon ~266k g/h > Thieving ~132k
g/h > Combat/Full-Craft-Chain ~64–88k g/h**. Craft-Vendoring von Magie/Fernkampf-Waffen ist zwar
pro Craft top, aber Essenz-Drop-gedeckelt → landet unter Dungeon/Thieving. **Kein einzelner Pfad
ist gebrochen**; die einzige echte Verzerrung ist der Stil-interne Craft-Vendor-Skew (P2 oben).

## Kurz-Zusammenfassung
- **Verifiziert sauber:** dim_essence-Fix (Loop-Familie tot), 0 Direkt-Arbitrage, 0 Basis-Craft-
  Loops, 2H-Wert-Aufschlag proportional (kein Skew), Farming gated.
- **P2 (1, confirmed):** Magie/Fernkampf-Verkaufswerte 2,5–4,6× Nahkampf bei Schadens-Parität →
  Craft-Vendor-Ungleichgewicht. Zahlen-Empfehlung: `value` auf ~1,25× Nahkampf kappen.
- **P3 (1, suspected, alt):** Kupfer-Shop-Craft nur mit Max-Mastery marginal positiv — unverändert,
  nicht neu.

**Ziel erreicht?** Ja — Shop→Craft→Verkauf systematisch durchgerechnet, beide Verifikations-Fragen
beantwortet (keine neuen Loops; Parität-Werte HABEN die Craft-Verkauf-Margen verzerrt).

**Top-3:**
1. [P2] Magie/Fernkampf-Waffen-`value` zur Stil-Parität kappen (~1,25× Nahkampf) — schließt den
   Craft-Vendor-Skew, den die Schadens-Parität offengelegt hat.
2. [Info] dim_essence/dim_focus-Fix ist wasserdicht — als Regression-Guard optional den generischen
   „kein Item mit `sell(x) > cheapestGoldCost(x)`"-Test aus Sweep2-07 einbauen.
3. [P3] Optional `item_scrap` 5→7, um den mastery-Kupfer-Restloop endgültig zu schließen.
