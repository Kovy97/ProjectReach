# Todo-Batch-Report — Combat-Depth + RC-Focus + Consumables (2026-07-04)

**Gesamt-Verdikt: SHIP** (Schluss-Gate grün, Suite deterministisch grün über 4 Läufe inkl. `--no-isolate --singleFork`, typecheck 5/5, Engine 687/687, Persistenz 104/104, Client-Build ✓, **0 geared-Walls**).

## Abgeschlossen
- **#218 Rüstungs-Trinität final (It2.1):** Magier-Frühgame-Food (WARD_PER_MANA 0.5→0.20 + Kill-Refill 0.20→0.10), Stoff→`magic`-Gating, R10-Parität, Defensiv-Stance −15%-Tradeoff, Buff-armorRating-Cap 35.
- **#221/#222/#223 Combat-Depth:** 2H-Melee gibt KEINE Armor (Glass-Cannon, 58 Waffen gestrippt); Waffen-Archetyp-Matrix (Tempo Spear2900/GS3150/GA3450/Maul3700 + 1H; Signaturen); Armor-Pen/Precision/Ward-Break-Konter (Melee/Ranged/Magie); Gegner-Verteidigungs-Trinität (defenseType: 40 evasion-Mobs, 21 ward-Caster). Balance-Re-Gate: kein Gegner-Typ für einen Stil unbesiegbar (9/9 Kombis kills>0/deaths=0).
- **#230 Ranged/Magie-Konter:** precision auf Bögen, wardBreak auf Stäben/Wands/Zeptern; WEAPON_TYPE_SPECIALTY-Texte.
- **#219 Consumables + Enchantments:** Heal-Leiter monoton (Draught-Premium, keine Kollision), Food-Tempo-Floor (kein „−0s"), 4 Trinity-Rune-Familien (12 Runen) + Enchant-Preview-Panel + Rune-Effekt-Tooltips, **Glyphs (7) + Scrolls (3) entfernt** (+ Quest-Refs + sanitize-Migration), `tonic_bulwark`.
- **#227 Runecrafting-2-Stufen-Focus:** kampf-freie Trainings-Grundlage (Barren+`magic_binder`→Precursor, RC-XP 1:1), Essenz nur für den tragbaren Fokus; Low-Tier-Barren (copper–steel) im Shop kaufbar; sim-realistic + sim-goals re-gefixt.
- **#220 Combat-Log:** Heal-Quell-Icon (Trank/Food/Effekt) + Schadens-Mitigation-Aufschlüsselung „18 (26 − 8 / Gegner-Rüstung)".
- **#224 Nav-Umbau** (Shop/Bank↑, Stats/Options↓) · **#225 The Imp** (Pastures, dim_essence) · **#226 RC-Waffen-Barren** · **#229 Test-Isolation** (kein aktiver Mutator, Suite auch `--no-isolate` grün).
- **Assets:** round4 + round5 Icon-Prompt-Listen (round5: 63 Lücken, TEIL A = 15 neue).

## Offen (für später)
- **#231 (MEDIUM):** 2H-DPS-Prämie kommt real nicht an (+3% statt +22% netto; 2H killt im Sim minimal WENIGER) → schwere-2H-Damage/Tempo im Waffen-Pass nachschärfen.
- **#228:** RC/Magiewaffen-XP-Kurven-Retune (High-Tier ~2-3× über Zielkurve).
- **Watches (nicht-blockierend):** Magier-Food non-DoT-Mid-Band Rest-Puffer; Bulwark-Rune blockChance MAX-gefaltet (evtl. additiv gewünscht?); affix_aegis-Copy „Ägiden-"; bloodmend_draught stale Kommentar (index.ts:428); canonical `apps/client/ui-audit/fixtures/midgame.json` stale glyph-Key; 10 Glyph/Scroll-Orphan-PNGs aufräumbar.

## Playtester-ZIP
`steam/grimreach_depot_4915451.zip` ist von gestern (vor diesem Batch) → braucht Rebuild:
`pnpm --filter @hearthforge/client build` + `electron-builder --win --dir` + `win-unpacked` zippen (steam/LIESMICH-steampipe.md). Auf Chef-GO.
