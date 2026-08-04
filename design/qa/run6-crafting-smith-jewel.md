# QA Run 6 — Crafting: Smithing + Jewelcrafting (item_scrap-Senke, cut_gemstone-Senke, str-in-Platte, Slayer-Gear-Crafts)

Playtester-Fokus (Chef-Kernfragen für diesen Lauf): (1) hat **`item_scrap` jetzt eine Senke**? (2) ist die **Runite-Upgrade-Kadenz** besser (claimed „runite-md-Bump")? (3) wird **`cut_gemstone` verwertet**? (4) sind **Suffix-Crafts + Slayer-Gear-Rezepte** rund? (5) was hält es unter 9,5?

Methode: READ-ONLY am Code (keine Edits an Content/Engine). Gezielte grep/read-Querprüfung statt Node-Harness — `packages/content/src/index.ts` (Items/Actions/Shop), Engine-Auflösung (`enchant.ts` `salvageInstance`/`salvagePayout`, `shared/SCRAP_ITEM_ID`). Werte 1:1 gegen `design/qa/run5-crafting-smith-jewel.md` (war 9,25) verglichen. Kein Temp-File erzeugt → nichts zu entfernen.

## Fun-Score: 9,4 / 10

## Δ vs run5 (war 9,25): **+0,15**

- **[NEU — Headline] `item_scrap` hat endlich eine Senke.** `recycle_scrap` (Smithing, category `copper`, L5, 3500 ms): **4× `item_scrap` → 1 `copper_bar`**. Die run5-P2 (Salvage-Loop produziert Schrott ohne jede Verwendung) ist geschlossen — thematisch genau richtig (Schrott einschmelzen) und im Smithing verortet. Zusätzlich ist `item_scrap` jetzt im Shop gelistet (cost 5), d. h. auch sauber verkäuflich. **Größter Einzel-Hebel aus run5 gezogen.**
- **[NEU] `cut_gemstone` wird verwertet.** `craft_gemstone_ring` (Jewelcrafting, L20): **1× `cut_gemstone` + 1× `iron_bar` → `gemstone_ring`** (acc 6 / critChance 2 %, rare, value 350). Der run5-Carry-over (Thieving-Token ohne Senke) ist geschlossen; Kommentar im Content (`// Edelstein-Schmuck (cut_gemstone-Senke)`) dokumentiert die Absicht. (Qualitäts-Vorbehalt: Quelle/Senke-Level passen nicht ganz — siehe P3.)
- **[NEU] `str`-in-Platte vertieft die Schmied=Bruiser-Identität.** Jede Platebody trägt jetzt zusätzlich `modifiers: { str: N }` mit **N exakt = ihrem `meleeDamage`** (copper 1/1 · mithril 4/4 · adamantium 5/5 · runite 7/7 · bloodiron 9/9 · titanium 12/12 · godiron 18/18). Das stapelt mit dem run5-`smithing.trains = "str"`: Schmieden baut Roh-str (Skill-XP) **und** trägt sie nochmal über die Platte. Monoton, inversionsfrei, kohärent.
- **[NEU] Slayer-Gear-Crafts (Phase 2) sind sauber verdrahtet.** 4 neue Epic-Teile über **drei** Craft-Säulen: `craft_slayer_helm` (Smithing L80), `craft_slayer_greaves` (Smithing L75), `craft_slayer_vambraces` (Leatherworking L75), `craft_slayer_amulet` (JC L80). Alle Input-Items existieren und sind beschaffbar (Slayer-Turm-Loot / Shop / Smelt). Der Helm konsumiert thematisch stark **alle fünf Slayer-Anforderungs-Items** (plague_mask/mirror_ward/ear_plugs/soul_veil/void_anchor) → `slayerHelm: true` macht sie danach überflüssig: Token in permanente Ausrüstung investiert. Schöner Endgame-Crafting-Sink.
- **[KEINE Regression]** 0 baumelnde Referenzen bei den neuen Items/Crafts; Suffix-/Platten-md-/Waffen-md-Backbones unverändert intakt (run5-Verifikation gilt weiter).

Was den Sprung **unter 9,5** hält: **der angekündigte „runite-md-Bump" ist nicht angekommen** (Waffen- UND Platten-md byte-identisch zu run5 — siehe P2), die **drei Smelt-Gates** (bloodiron/titanium/aetherium, Gap −5) sind unverändert (Carry-over P3), und zwei kleine Senken-Qualitäts-Vorbehalte (recycle nur Kupfer; cut_gemstone-Level-Mismatch).

---

## Verifikation: `item_scrap`-Senke (Kernfrage 1) — BESTANDEN

- **Quelle:** `salvagePayout` (`enchant.ts`) schreibt `SCRAP_ITEM_ID = "item_scrap"` (defensiv: nur wenn Item existiert) bei jedem Salvage gut — greift jetzt live über Auto-Salvage (`intakeInstance` → `shouldAutoSalvage`) und Hand-Salvage.
- **Senke (NEU):** `recycle_scrap` konsumiert 4× `item_scrap` → 1× `copper_bar`. **Monoton konsumiert** (Input-Qty > 0), kein toter Token mehr.
- **Ökonomie-Realität:** Scrap value 3, copper_bar value 8 ⇒ 4×3 = 12 g Schrott → 8 g Barren, +1 Smithing-XP/3,5 s. Das ist **Trash-Disposal mit thematischem Anstrich**, kein lohnender Loop (man verkauft Scrap eher direkt). Closing-the-orphan: ja. Begehrenswert: nein → P3-Vorbehalt.

## Verifikation: `cut_gemstone`-Senke (Kernfrage 3) — BESTANDEN (mit Vorbehalt)

- `craft_gemstone_ring` (JC L20) konsumiert `cut_gemstone` → `gemstone_ring`. Orphan geschlossen.
- **Vorbehalt (P3):** `cut_gemstone` droppt aus Thieving **L55 / L65 / L97** (crack_strongbox, pickpocket_noble, plunder_ashen_treasury). Verbaut wird es in einen **L20-Ring mit acc 6 / crit 2 %** — zu dem Zeitpunkt, an dem man den Token überhaupt bekommt, ist das Resultat trivial. Senke vorhanden, aber **Token-Level ≫ Output-Level** ⇒ wirtschaftlich schwach. Besser: höher-tieriger Ring oder Multi-Gem-Sammelrezept.

## Verifikation: Runite-Kadenz / „runite-md-Bump" (Kernfrage 2) — **NICHT ANGEKOMMEN**

Sword-`meleeDamage`-Leiter (alle 12 Tiers):

| cop | bro | iro | ste | bla | mit | ada | **run** | blo | tit | aet | god |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 16 | 28 | 36 | 50 | 57 | 72 | **78** | 96 | 117 | 140 | 172 |

- adamantium→**runite** = +6 (**×1,083**), runite→bloodiron = +18 (**×1,23**). Der Runite-Schritt bleibt der **kleinste relative Sprung** der Leiter — exakt die run5-„U-Senke". Auch axe (75→**82**→101) und maul (155→**168**→207) sind unverändert.
- Platten-md ebenfalls 1:1 wie run5 (runite platebody 7). **Kein Wert wurde angehoben.**
- **Befund:** Der für diesen Lauf angekündigte „runite-md-Bump" ist im Content **nicht vorhanden** — weder Waffe noch Platte. Monoton (kein Bug), aber das „tote" Runite-Upgrade-Tier besteht weiter und die in-scope-Hausaufgabe ist offen. → **P2** (in-scope, claimed, nicht geliefert).

## Verifikation: Slayer-Gear-Rezepte (Kernfrage 4) — BESTANDEN

| Craft | Skill/Lvl | Item (equip) | Inputs (alle existent & beschaffbar) |
|---|---|---|---|
| craft_slayer_helm | smithing 80 | slayer_helm (slayer 80, epic, def48/hp140/all-styles+12, `slayerHelm`) | 5× Anforderungs-Items + blighted_bone×20, forge_ember×10, abyssal_core×5, titanium_bar×10 |
| craft_slayer_greaves | smithing 75 | slayer_greaves (slayer 65) | dread_fang_shard×8, bloodiron_bar×6, slag_carapace×4 |
| craft_slayer_vambraces | leatherworking 75 | slayer_vambraces (slayer 50) | soul_flayer_fang×3, cured_leather×8, basilisk_scale×5 |
| craft_slayer_amulet | jewelcrafting 80 | slayer_amulet (slayer 70) | void_herald_shard×3, soulopal×3, titanium_bar×5 |

- **Cross-Skill-Spread sehr gut** (Smithing + LW + JC + indirekt RC/Slayer-Loot) — der Slayer treibt mehrere Craft-Säulen.
- **Stat-Kohärenz:** alle Teile style-agnostisch (melee/ranged/magic gleich gebufft), nach Slayer-Req monoton stärker (vambraces 50 < greaves 65 < amulet 70 < helm 80). Keine Inversion, kein Overpower-Ausreißer.
- **Doppel-Gate-Hinweis (P3):** Die Craft-Skill-Schwelle liegt durchweg **über** der Equip-Slayer-Req (greaves: smithing 75 vs slayer 65; amulet: JC 80 vs slayer 70). Damit ist die Slayer-Equip-Req nie der bindende Constraint — leichte Design-Redundanz, kein Bug.

---

## Findings

### [P2] (NEU/in-scope) „runite-md-Bump" wurde nicht angewandt — U-Senke besteht weiter
Die für diesen Lauf angekündigte Runite-md-Anhebung ist im Content nicht vorhanden: sword 78 / axe 82 / maul 168 und platebody-md 7 sind **identisch zu run5**. Der Runite-Upgrade-Schritt bleibt mit ×1,08 die schwächste Stufe der Leiter vor bloodiron (×1,23); das Upgrade „fühlt sich tot an". Reiner Balance-Glättungspunkt, monoton (kein Crash/Bug), aber explizit in-scope und nicht geliefert.
**Fix:** Runite-`meleeDamage` über die Schwert/Axt/Maul-Familie auf ~85–88 (sword) anheben, plate-md analog leicht (run→8). Der run4/run5-Vorschlag, der dreimal nicht umgesetzt wurde.

### [P3] (CARRY-OVER, unverändert) Drei Smelt-Gates 5 Level vor dem eigenen Erz
`smelt_bloodiron` L65 (mine_bloodiron L70), `smelt_titanium` L75 (mine_titanium L80), `smelt_aetherium` L85 (mine_aetherite L90) — Gap **−5**. Reiner Schmied muss das Erz 5 Level über eigener Mining-Reichweite beziehen (Drops/Shop). Unverändert seit run3.
**Fix:** Smelt-Level angleichen oder als bewusste Cross-Skill-Abhängigkeit dokumentieren.

### [P3] (NEU) `recycle_scrap` ist eine Token-Senke — nur Kupfer, wirtschaftlich marginal
Closing-the-orphan funktioniert, aber: Salvage von beliebig hochtierigem Gear → `item_scrap` → **immer nur `copper_bar`** (value 8), bei +1 XP/3,5 s. Raw-Value leicht negativ (12 g Scrap → 8 g Barren), XP/Std. trivial. Niemand „craftet" das aktiv; es ist Müllentsorgung mit Forge-Anstrich.
**Fix (optional):** entweder scrap→Barren am Tier des zerlegten Items skalieren, oder Scrap in einen **Re-Roll-/Reforge-Token** umwandeln (Suffix neu würfeln) — das gäbe der Salvage-Loop einen echten Pull statt nur einer Abfluss.

### [P3] (NEU) `cut_gemstone`: Token-Level (Thieving 55–97) ≫ Output-Level (gemstone_ring, JC L20 / acc6)
Senke existiert, aber das Resultat ist zu schwach für den Zeitpunkt, an dem der Token anfällt. Fehlleitungspotenzial ist behoben (es gibt jetzt ein JC-Rezept), der Reiz nicht.
**Fix:** höher-tierigen Ring/Amulett aus `cut_gemstone` (z. B. JC L55+), oder Sammelrezept N× `cut_gemstone` → hochwertiges Schmuckstück.

### [P3] (NEU/Hinweis) Slayer-Gear: Craft-Skill-Req > Equip-Slayer-Req
Die Equip-Slayer-Anforderung (50/65/70) ist nie bindend, weil die Craft-Schwelle (LW/Smithing/JC 75–80) höher liegt. Harmlos, aber die zwei Gates sind effektiv eins.
**Fix:** belassen (klar lesbar) oder Equip-Req an Craft-Niveau anheben für Konsistenz.

### [P3] (CARRY-OVER, unverändert) Platten-`attackIntervalMs`-Malus flach über alle Tiers
Wie run5: body +100 / legs +50 / fullhelm +25 skaliert nicht mit, dämpft früh am stärksten genau den md-Backbone. Bruiser-Tradeoff, Chef-Designentscheidung.

---

## Was fehlt für 9,5?

Zwei der vier run5-„fehlt für 9,5"-Punkte sind diesen Lauf **geschlossen** (item_scrap-Senke ✓, cut_gemstone-Senke ✓). Offen für die 9,5:

1. **Runite-md tatsächlich anheben (P2).** Der einzige in-scope-Punkt dieses Laufs, der nicht landete. ~85–88 (sword) + Familie glättet das letzte „tote" Upgrade-Tier. **Größter verbliebener Einzel-Hebel.**
2. **`recycle_scrap` von Token auf echten Pull heben.** Tier-skalierter Barren **oder** Reforge/Re-Roll-Token — dann hat die jetzt-aktive Salvage-Loop ein Ziel, nicht nur einen Abfluss.
3. **`cut_gemstone`-Output ans Token-Level anpassen** (höher-tieriger JC-Craft), damit die neue Senke auch belohnt.
4. **Drei Smelt-Gates an Mining angleichen** oder bewusst dokumentieren (Carry-over seit run3).

Optional fürs i-Tüpfelchen: Platten-`attackIntervalMs`-Malus leicht mit Tier abschmelzen.

---

## Fazit
Run 6 schließt die zwei wichtigsten offenen Crafting-Risse aus run5: **`item_scrap` hat jetzt eine Smithing-Senke** (`recycle_scrap`) und **`cut_gemstone` wird im JC verbaut** (`craft_gemstone_ring`) — beides die Top-Hebel der run5-„fehlt für 9,5"-Liste. Dazu zwei kohärente Erweiterungen: **`str`-in-Platte** vertieft die Schmied=Bruiser-Identität (str = md, monoton, inversionsfrei), und die **Slayer-Gear-Crafts** verteilen sauber über drei Craft-Säulen, sind referenz-vollständig und konsumieren thematisch stark die Slayer-Anforderungs-Items. Keine Regression, kein P0/P1.

Den Sprung auf 9,5 verhindert vor allem ein **nicht geliefertes In-Scope-Versprechen**: der „runite-md-Bump" ist im Content nicht vorhanden (Werte byte-identisch zu run5), die U-Senke besteht weiter (P2). Dazu zwei Senken-Qualitäts-Vorbehalte (recycle nur Kupfer; cut_gemstone-Level-Mismatch) und der unveränderte Smelt-Gate-Carry-over. Eine P2, fünf P3 — netto ein solider, kleiner Schritt nach oben (**+0,15 → 9,4**).
