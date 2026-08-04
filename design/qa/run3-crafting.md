# QA Run 3 — Crafting & Gear-Progression

Playtester-Fokus: Smithing, Crafting (Leatherworking), Fletching, Runecrafting, Jewelcrafting.
Methode: READ-ONLY Datenanalyse von `packages/content/src/index.ts` (678 Actions geparst), Item-Stats, Material-Flow (produziert vs. konsumiert), Versorgungsketten (Mining/Drops/Foraging).

## Fun-Score: 8 / 10

Die Crafting-Säule ist tief, vollständig und sauber versorgt. Alle fünf Skills haben durchgehende 12er- bzw. 8er-Tier-Leitern bis zum Cap (Godiron/Godgem @99), die Materialketten sind lückenlos abgesichert, und Upgrades zahlen sich klar aus (Stats skalieren monoton). Punktabzug nur für eine Handvoll toter Outputs (verwaiste Holz-Tiers & vestigiale Tinten) und ein paar kleine Ordnungs-/Gating-Inkonsistenzen.

---

## Stärken

- **Smithing — lückenlose 12-Tier-Leiter.** Copper(L1) → Bronze(5) → Iron(10) → Steel(20) → Blacksteel(30) → Mithril(40) → Adamantium(50) → Runite(60) → Bloodiron(70) → Titanium(80) → Aetherium(90) → Godiron(95–99). Jede Kategorie = vollständige Smelt-Action + 20 Forge-Rezepte (Waffen + Rüstung). Höhere Tiers korrekt Coal-gated (bis 5x Coal @ Godiron).
- **Upgrades lohnen sich.** Stats skalieren sauber und monoton: `copper_sword` meleeDamage 5/acc 8 → `godiron_sword` 132/198; `copper_platebody` def 8/maxHp 20 → `godiron_platebody` def 136/maxHp 340; `apprentice_robe_body` def 3/int+3 → `godspark_vestment` def 34/magicDamage 30/int+14/wis+5. Jeder Tier-Sprung ist spürbar.
- **Crafting (Leatherworking) — Doppelleiter Melee + Magie.** 7 Melee-Leder-Tiers (cured → hardened → scaled → studded → warhide → dragonhide → shadowhide) UND 6 Magie-Roben-Sets, **jedes exakt 5-teilig** (Kopf/Body/Beine/Hände/Füße): apprentice(L1), frost(20), aether(45), arcane(57), runewoven(71), godspark(88). 5-Teiler-Anspruch erfüllt.
- **Gerb-Ketten raw→tanned komplett & versorgt.** `raw_hide`→cured, `scarred_hide`→hardened, `wyvern_scale`→warhide, `raw_dragonhide`→dragonhide, `raw_shadowhide`→shadowhide. Alle Roh-Häute droppen aus Monstern (Dragonhide 10–50 %, Shadowhide 10–15 %, Wyvernschuppe 20–70 %).
- **Fletching — 12-Tier Bögen + Pfeile.** Shortbow + Longbow + Arrow je Metall-Tier copper→godiron, tier-passende Hölzer (normal→…→godwood), Bowstring aus `scarred_hide`. Pfeile als Ammo-Senke im Kampf.
- **Runecrafting — Essenz→Rune-Kette + 12-Tier Magiewaffen.** 6 Essenzen → 8 Runen; Staff/Wand/Focus je Tier copper→godiron; dazu Waffen-Enchants. Essenzen extern (Drops) versorgt.
- **Jewelcrafting — 8 Gem-Tiers bis L99.** Garnet(L1) → Sapphire(15) → Ruby(34) → Bloodstone(44) → Diamond(55) → Onyx(70) → Voidstone(85) → Godgem(95), jeweils Cut + Ring + Amulett mit tier-passenden Barren. **L100→99-Retune sauber angewandt** — keine unerreichbaren `>L99`-Requirements gefunden.
- **Versorgung intakt.** Alle 12 Erze + 8 Roh-Edelsteine sind abbaubar; `scaled_leather` reichlich aus Monstern (0,3–0,5). Integritätscheck: 0 von >200 Craft-Rezept-Referenzen zeigen auf nicht-existente Items.

---

## Findings

### [P2] Tote Holz-Tiers — 4 Logs ohne jede Senke
`willowbark_log` (Woodcutting L15, Wert 12), `grimwood_log` (L25, 25), `ashfen_log` (L63, 200), `voidwood_log` (L92, 720) werden produziert, aber von **keinem** Rezept konsumiert. Sie liegen als Füll-Tiers zwischen den von Fletching genutzten Hölzern (normal/birchwood/oak/ashbark/blackwood/blightwood/ironbark/bloodoak/shadowpine/wraithwood/bonewood/godwood). Ein Fletcher, der Woodcutting hochzieht, fällt diese Bäume und kann das Holz nur verkaufen — es füttert nie einen Bogen.
**Fix:** Entweder (a) die Fletching-Holzleiter so umstellen, dass diese 4 Hölzer Bögen/Armbrüste speisen, (b) neue Rezepte (Schilde/Stäbe/Armbrust) darauf legen, oder (c) bewusst als reine Gold/XP-„Edelholz"-Nodes dokumentieren (voidwood 720 g ist als Gold-Node plausibel).

### [P2] Vestigiale Inscription-Tinten — `soot_ink` & `ether_ink`
Beide werden von `grind_soot_ink` / `grind_ether_ink` produziert, aber von **keinem** Rezept konsumiert. Inscription nutzt tatsächlich eine andere Tinten-Kette (pigment → `ink_radiant`/`ink_umber`/`ink_verdant`/`ink_violet`). `soot_ink` (Wert 7) und `ether_ink` (60) sind Überreste einer alten Tintenlogik.
**Fix:** Grind-Actions + Items entfernen, oder in echte Inscription-Rezepte einbinden.

### [P3] Smelt schaltet vor Selbstversorgung des Erzes frei
`smelt_bloodiron` L65 (Erz erst Mining L70), `smelt_titanium` L75 (Mining L80), `smelt_aetherium` L85 (Mining L90). Ein reiner Schmied kann das Erz 5 Level lang nicht selbst abbauen und ist auf Drops/Shop angewiesen. Geringe Auswirkung (Soft-Gate), aber inkonsistent zu den unteren Tiers (die deckungsgleich sind).
**Fix:** Smelt-Level an Mining angleichen oder als bewusste Cross-Skill-Abhängigkeit belassen.

### [P3] Scaled-Leder-Set: Body 14 Level vor dem Rest seines Sets
`craft_scaled_body` L14, aber `craft_scaled_helm`/`vambraces`/`boots` L28 und `legs` L30. Man kann die Brust 14 Level vor jedem anderen Teil desselben Sets fertigen — wirkt wie ein vergessenes Level-Tuning.
**Fix:** scaled_body auf ~L26–28 anheben (zum Rest des Sets) oder Set bewusst gestaffelt erklären.

### [P3] `gravesteel_bar` ist Nur-Jewelcrafting-Material (kein Gear-Tier)
Wird @L22 geschmolzen, speist aber ausschließlich Bloodstone-Ring/-Amulett (Jewelcrafting). Kein einziges Smithing-Gear nutzt ihn — ungewöhnlich für einen „Stahl"-Barren, aber **nicht tot** (konsumiert). Nur Hinweis; ggf. 1–2 thematische Gravesteel-Gear-Rezepte ergänzen, um die L22–30-Schmiedelücke zu füllen.

### [P3] `scaled_leather` aus Thieving = nutzloser Tropfen
`pickpocket_*` gibt scaled_leather nur mit 5 % — irrelevant neben den Monster-Drops (0,3–0,5). Kein Schaden, aber der Thieving-Drop suggeriert eine Quelle, die praktisch keine ist.

---

## Fazit
Tier-Leitern: **lückenlos** (12 Metall-/Holz-/Magiewaffen-Tiers, 8 Gem-Tiers, 7+6 Leder-Tiers), **versorgt** (alle Erze/Gems abbaubar, alle Roh-Häute droppen), **Upgrades lohnend** (klare Stat-Sprünge). Einzige echte Aufräumarbeit: 4 verwaiste Hölzer + 2 vestigiale Tinten ohne Senke, plus zwei kleine Level-Ordnungs-Schönheitsfehler.
