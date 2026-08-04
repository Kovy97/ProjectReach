# QA Run 5 — Crafting: Smithing + Jewelcrafting (Suffix aktiv, smithing→str, Platten-meleeDamage-Backbone)

Playtester-Fokus: (1) der **neue Platten-`meleeDamage`-Backbone** (monoton/inversionsfrei? exklusiv?), (2) **Suffix-Rolls auf Equipment-Crafts** (jetzt live — fühlbar/spaßig?), (3) **smithing→str**-Kohärenz, (4) 12-Tier-Metall- & 8-Tier-Gem-Versorgung, (5) tote Referenzen, (6) U-Kadenz-Reste (Runite).

Methode: READ-ONLY. Temporäres Node-Parse-Harness (Objektliteral aus `packages/content/src/index.ts` extrahiert: **813 Items, 688 Actions, 23 Suffixe, 8 Affix-Runen**) plus Quer-Lesen der Engine-Auflösung (`suffix.ts`, `shared/instanceBonusDelta`, `character.ts`, `enchant.ts`). Harness nach Lauf entfernt. Vergleich gegen `design/qa/run4-crafting-smith-jewel.md` (war 9).

## Fun-Score: 9,25 / 10

## Δ vs run4 (war 9): **+0,25**

- **[NEU — Headline] Suffix-System ist auf Crafts scharfgeschaltet.** Jede Equipment-Craft-Aktion würfelt mit **`DEFAULT_CRAFT_SUFFIX_CHANCE = 0.2`** (~1 von 5 Crafts wird „etwas Besonderes"), +lck-Bonus (+0,0015·lck, Cap +0,15), Gesamt-Cap 0,95. 23 Suffixe, typ-/ilvl-gefilterter, deterministisch sortierter Pool. Das ist ein echter Idle-Dopamin-Loop, der run4 noch fehlte → klarer Fun-Plus. Determinismus sauber (kein RNG-Zug, wenn kein Suffix möglich).
- **[NEU] Platten-`meleeDamage`-Backbone ist sauber.** `meleeDamage` liegt **exklusiv auf Smithing-Platte** (+ offensiven JC-Ringen/-Amuletten) — **0** Leder-/Stoff-/Schmuck-Fremdträger außerhalb der Craft-Säulen. Über alle Plattenteile **monoton, 0 Inversionen** (Tabelle unten).
- **[NEU] smithing→str ist kohärent verdrahtet.** `skills.smithing.trains = "str"`. Da `meleeDamage = (1 + str·1.5 + power·0.8 + eq.meleeDamage)·mult`, baut Schmieden jetzt zugleich Roh-`str` UND liefert die `meleeDamage`-Platte/Schmuck → Schmied = Nahkampf-Bruiser-Profession. Sehr stimmiges Design.
- **[KEINE Regression]** 0 baumelnde Referenzen (alle Inputs/Loot zeigen auf existierende Items), 12/12 Metall-Sets vollständig & uniform, 8/8 Gem-Tiers bis L99-Cap, gesamte Roh→Cut→Schmuck-Gem-Kette versorgt, Coal-Gating unverändert sauber.

Was den Sprung **unter 9,5** hält: **alle drei run4-P3-Carry-overs sind unverändert** (Smelt-Gates, Runite-U-Kadenz, `cut_gemstone`-Token), **plus eine neue P2** (das jetzt-aktive Salvage produziert `item_scrap` ohne jede Senke) und eine Design-Spannung beim Platten-`attackIntervalMs`.

---

## Verifikation: Platten-`meleeDamage`-Backbone (Kernauftrag)

`meleeDamage` je Plattenteil über die 12 Tiers (cop→god). **Lückenlos monoton, 0 Inversionen, exklusiv Smithing-Platte:**

| Teil | cop | bro | iro | ste | bla | mit | ada | run | blo | tit | aet | god | Inv |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| platebody | 1 | 1 | 2 | 3 | 3 | 4 | 5 | 7 | 9 | 12 | 15 | 18 | 0 |
| platelegs | 1 | 1 | 2 | 2 | 2 | 3 | 4 | 5 | 7 | 8 | 10 | 12 | 0 |
| medhelm/fullhelm | – | 1 | 1 | 1 | 1 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 0 |
| gauntlets | – | – | 1 | 1 | 1 | 1 | 2 | 2 | 3 | 4 | 5 | 6 | 0 |
| sabatons | – | – | – | – | 1 | 1 | 1 | 1 | 2 | 3 | 3 | 4 | 0 |

- **Exklusivität bestätigt:** Nur Platten-Body (kein `chainbody`), Plattenbeine, Platthelme, Gauntlets, Sabatons tragen `meleeDamage`. `chainbody`, `kiteshield`, `towershield` bewusst ohne md. Saubere „schwere Rüstung = Bruiser"-Identität.
- **Ramp am unteren Ende intentional:** Gauntlets ab iron, Sabatons ab blacksteel — kleine Teile steigen später ein; monoton, keine Lücke im Sinne einer Inversion.
- **`attackIntervalMs` als zweiter Platten-Backbone:** `platebody +100`, `platelegs +50`, `fullhelm +25`, `towershield +100` — **positiv** ⇒ in `attackIntervalMs = clamp(3000 − dex·20 + eq.attackIntervalMs, 800, 5000)` **verlangsamt** das die Angriffe. Voller Platten+Tower-Satz = +275 ms (~9 % langsamer ab Basis 3000). Das ist ein **Bruiser-Tradeoff** (mehr Schaden/Hit, langsamer) — coherent, aber siehe P3 unten (flach, skaliert nicht; arbeitet teils gegen die „melee-freundliche Platte").

**Ergebnis: Backbone-Verifikation bestanden.** Monoton, inversionsfrei, exklusiv, thematisch kohärent mit smithing→str.

---

## Verifikation: Suffix-Roll auf Equipment-Crafts (Kernauftrag)

- **Reichweite:** Pool-Größe pro Craft-Output (ilvl = Craft-Skill-Level): copper-Platte **5** (bear/tiger/owl/boar/tortoise) → godiron-Platte/-Schild/-Amulett **12**, godiron_sword **9**, godiron_staff/-longbow **8**. Jeder Equipment-Output (inkl. **JC-Ringe/-Amulette**, die als `armor` getaggt sind) hat einen nicht-leeren Pool. Kein Craft mit `suffixChance`-Override → alle nutzen 20 %.
- **Stärke skaliert spürbar:** `instanceBonusDelta` = k · `suffixScaleIndex(ilvl)` (1,0 @L1 … **20,0 @L100**) · Varianz (0,85–1,0). Beispiel godiron_sword (S≈18,5) „of Carnage": `meleeDamage` ≈ 0,8·18,5·0,9 ≈ **+13** (auf Basis 172 = +7–8 %) **plus** critChance-Soft ~5 %. Endgame-Rolls sind klar fühlbar.
- **Früh-Token, Endgame-Belohnung:** copper-Craft (S=1) „of the Bull" = +1 md / +1 str (min-1-Rundung). Token, aber als seltener Proc trotzdem ein Erfolgserlebnis — gute Kurve (Aufregung früh, Substanz spät).
- **Soft-Speed-Vorzeichen korrekt:** Suffix-`attackIntervalMs` (z. B. „of the Wolf/Viper") ist **negativ** (−15 … −150 ms, schneller) — gegenläufig zum positiven Platten-Wert. Konsistente Engine-Konvention, kein Bug.

**Ergebnis: Suffix-auf-Craft ist fühlbar und spaßig.** Der wichtigste Fun-Treiber dieses Laufs.

---

## Bestätigte Stärken (gegen run4 erneut geprüft)

- **Waffen-`meleeDamage`-Leiter identisch zu run4** — über alle 10 Waffentypen × 12 Tiers monoton, 0 Inversionen, dagger<scimitar<sword=mace<axe<spear≤battleaxe<greataxe<greatsword<maul auf jedem Tier (godiron: maul 369 … dagger 107).
- **Smelt-Kette vollständig & versorgt.** 13 Smelt-Rezepte; Alloy-Tiers korrekt (bronze=copper+tin, steel=iron+coal, blacksteel=steel_bar+coal). Ore-Aliasse `adamantite_ore`/`aetherite_ore`/`tin_ore`/`gravesteel_ore` existieren und sind abbaubar. Alle 12 Barren stark nachgefragt (C=20–25 Senken je Barren). Coal aus `mine_coal`@L15.
- **Gem-Kette lückenlos.** `mine_*_seam`@L15–95 → `rough_*` → `cut_*` (JC) → `garnet…godgem` → Ring/Amulett. Alle 8 Roh-Gems abbaubar, alle 8 geschnittenen Gems konsumiert.
- **Cross-Skill-Barrenbedarf intakt.** steel/runite/godiron-Barren speisen smithing **+** leatherworking/jewelcrafting/runecrafting.
- **jewelcrafting ohne `trains` ist konsistent** mit den übrigen Craft-Skills (cooking/fletching/runecrafting/herblore trainieren ebenfalls nichts). Smithing ist die bewusste Ausnahme dieses Laufs — kein Fehler.

---

## Findings

### [P2] (NEU) `item_scrap` — Salvage-Output ohne jede Senke (jetzt economy-relevant)
Das **jetzt aktive** Suffix-/Instanz-System speist über `salvageInstance` (`enchant.ts`, `SCRAP_ITEM_ID`) das Item **`item_scrap`** (Wert 3). **0 Aktionen konsumieren es**, kein Gate referenziert es. Solange Suffix nur ein Katalog war, war das egal; mit Auto-/Hand-Salvage der ~20 %-Suffix-Crafts entsteht jetzt laufend Schrott ohne Verwendung — reiner Vendor-Trash am Ende der frischen Headline-Loop. Thematisch die naheliegendste Smithing-Senke (Schrott → Einschmelzen).
**Fix:** kleines Smithing-Rezept `smelt`/`reforge` (z. B. N×`item_scrap` → 1 Tier-Barren oder → Gold-effizienter Re-Roll-Token), oder bewusst als Vendor-Token dokumentieren.

### [P3] (CARRY-OVER, unverändert) Smelt schaltet 5 Level vor dem eigenen Erz frei
`smelt_bloodiron` L65 (`bloodiron_ore` Mining L70), `smelt_titanium` L75 (Mining L80), `smelt_aetherium` L85 (`aetherite_ore` Mining L90) — gap **+5**. Übrige Tiers gap=0 (steel sogar −10, also unkritisch). Genau die drei run3/run4-Gaps bestehen weiter; reiner Schmied muss das Erz 5 Level über Drops/Shop beziehen.
**Fix:** Smelt-Level dieser drei an Mining angleichen oder als bewusste Cross-Skill-Abhängigkeit dokumentieren.

### [P3] (CARRY-OVER, unverändert) U-förmige Upgrade-Kadenz — Runite bleibt schwächstes Lohn-Tier
sword-`meleeDamage`/Pflichtlevel sinkt bis **runite ×1,08** (md 72→78 für +10 Level, Adamantium→Runite) und steigt danach wieder bis godiron ×1,23. Der run4-Vorschlag (Runite md ~85–88) wurde **nicht** angewandt — Werte 1:1 wie run4. Monoton, also kein Bug, aber das Runite-Upgrade „fühlt sich tot an".
**Fix:** Runite-`meleeDamage` über die Schwert/Axt/Maul-Familie leicht anheben (~85–88) zum Glätten.

### [P3] (CARRY-OVER, unverändert / cross-system) `cut_gemstone` — Thieving-Token ohne Senke
„Cut Gemstone" (Wert 180) aus 3 Thieving-Actions, von keinem Rezept konsumiert; **kein** JC-Input (JC nutzt `garnet`…`godgem`). Namensnähe kann Richtung Jewelcrafting fehlleiten.
**Fix:** als Gold-Token belassen (ok) oder in ein JC-Sammelrezept einbinden/umbenennen.

### [P3] (NEU) Platten-`attackIntervalMs` arbeitet teils gegen den `meleeDamage`-Backbone
Der positive (verlangsamende) Speed-Malus ist **flach** über alle 12 Tiers (body +100, legs +50, fullhelm +25, tower +100) — er skaliert nicht mit, während `meleeDamage` wächst. Voller Satz ≈ +275 ms. Als Bruiser-Tradeoff legitim, aber er dämpft genau die „melee-freundliche Platte", die smithing→str + md-Backbone aufbauen, und die Flachheit ist früh am stärksten spürbar.
**Fix (optional):** Malus mit Tier leicht abschmelzen oder per md-Überhang gezielt überkompensieren — Chef-Designentscheidung.

### [P3] (NEU/Hinweis) JC-Schmuck folgt Gem-Themen, nicht strikter Tier-Leiter
Ringe = offensiv (md/crit), Amulette = Tank (def/maxHp); Gems sind horizontal gethement statt vertikal getiered. Dadurch keine monotone Stat-Leiter über Tiers — z. B. `bloodstone_amulet` (L48) def9/hp30 **>** `diamond_amulet` (L60) def8/hp25 (diamond zahlt mit acc+crit). Bewusste Build-Vielfalt, kann aber als „Downgrade beim höheren Gem" missverstanden werden.
**Fix:** belassen (gut für Vielfalt) oder Tier-Mindest-Monotonie für die jeweils gemeinsame Backbone-Stat (def/maxHp) sicherstellen.

### [P3] (CARRY-OVER, abgeschwächt) `gravesteel_bar` bleibt Nur-Jewelcrafting-Material
Geschmolzen @L22 (`gravesteel_ore`+coal), speist ausschließlich Bloodstone-Ring/-Amulett. Konsumiert (nicht tot), aber weiterhin der einzige „Stahl"-Barren ohne Schmiede-Gear. Reiner Hinweis.

---

## Was fehlt für 9,5?

Vier konkrete, kleine Schritte — alle aus „Carry-over endlich schließen" + eine neue Senke:

1. **`item_scrap`-Senke anlegen (P2).** Das ist der einzige *neue* Riss, den die jetzt-aktive Suffix-Loop reißt. Ein Schrott→Barren-Einschmelz- oder Re-Roll-Rezept schließt die Salvage-Schleife thematisch im Smithing. **Größter Einzel-Hebel.**
2. **Runite-`meleeDamage` glätten (~85–88)** über Schwert/Axt/Maul — der run4-Vorschlag, der nicht umgesetzt wurde; entfernt das einzige „tote" Upgrade-Tier.
3. **Drei Smelt-Gates (bloodiron/titanium/aetherium) auf Mining angleichen** oder als bewusste Cross-Skill-Abhängigkeit dokumentieren.
4. **`cut_gemstone` entscheiden** — sinnvoll in ein JC-Rezept einbinden oder umbenennen, damit der Token nicht in Richtung Jewelcrafting fehlleitet.

Optional fürs i-Tüpfelchen: Platten-`attackIntervalMs`-Malus leicht mit Tier abschmelzen, damit der neue md-Backbone die „melee-freundliche Platte" voll trägt.

---

## Fazit
Run 5 liefert den überfälligen Fun-Treiber: **Suffix-Rolls sind auf Crafts live** (20 %, 23 Suffixe, bis ×20 skaliert, fühlbar im Endgame), der **Platten-`meleeDamage`-Backbone** ist exklusiv, monoton und inversionsfrei, und **smithing→str** macht das Schmieden thematisch zur Nahkampf-Profession — drei kohärente, sauber verdrahtete Ergänzungen ohne Regression (0 tote Refs, alle Leitern versorgt). Gegenüber run4 (9) ein klarer, wenn auch kleiner Schritt nach oben (**+0,25 → 9,25**). Den Sprung auf 9,5 verhindern fast ausschließlich **liegen gebliebene Hausaufgaben**: drei unveränderte run4-P3-Carry-overs (Smelt-Gates, Runite-U-Kadenz, `cut_gemstone`) plus die eine neue, durch die aktive Salvage-Loop entstandene P2 (`item_scrap` ohne Senke). Inhaltlich keine P0/P1; eine P2, sechs P3.
